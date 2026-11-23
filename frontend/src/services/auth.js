import {
  createAccountRecord,
  findAccountByLogin,
  findAccountById,
  insertAccount,
  listPublicAccounts,
  toPublicAccount,
  updateAccountRecord
} from './accounts.js'
import { hashPassword, verifyPassword } from './password.js'
import { validateAccount, validateNickname, validatePassword, validatePasswordConfirm } from './authRules.js'
import { clearAuthSession, readAuthSession, writeAuthSession } from './authSession.js'
import { activateAccount, engine } from './engine.js'
import { IS_REMOTE } from '../config.js'
import * as remoteAuth from './remoteAuth.js'
import { begin, clearSession, fetchState, writeCache } from './stateSync.js'

const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MS = 60 * 1000
const FAIL_WINDOW_MS = 10 * 60 * 1000

function toRemoteAccount(user) {
  if (!user) return null
  return {
    id: user.id,
    account: user.username,
    nickname: user.nickname || user.username,
    createdAt: user.created_at || ''
  }
}

/** 云端登录成功后：绑定同步上下文 + 载入服务端数据 */
async function finishRemoteLogin(user) {
  const state = await fetchState()
  begin(user.id, state?.version || 0)
  if (state?.data) writeCache(user.id, state.data)
  activateAccount(`remote_${user.id}`)
  try {
    engine.setChildName(toRemoteAccount(user).nickname)
  } catch (error) {
    // 昵称同步失败不影响登录
  }
  return toRemoteAccount(user)
}

/** 当前登录账号的安全视图；会话失效时自动清理 */
export function getCurrentAccount() {
  if (IS_REMOTE) {
    return toRemoteAccount(remoteAuth.getStoredUser())
  }
  const session = readAuthSession()
  if (!session) return null
  const record = findAccountById(session.accountId)
  if (!record) {
    clearAuthSession()
    return null
  }
  return toPublicAccount(record)
}

export function isLoggedIn() {
  if (IS_REMOTE) return remoteAuth.isAuthenticated()
  return Boolean(getCurrentAccount())
}

export function listAccounts() {
  if (IS_REMOTE) return []
  return listPublicAccounts()
}

function finishLogin(record) {
  writeAuthSession({ accountId: record.id, loginAt: new Date().toISOString() })
  activateAccount(record.id)
  // 账号昵称就是孩子的显示名
  engine.setChildName(record.nickname)
}

/** 注册：云端写 MySQL，并在本地缓存一份快照 */
export async function register({ nickname, account, password, confirmPassword } = {}) {
  const accountCheck = validateAccount(account)
  if (!accountCheck.ok) throw new Error(accountCheck.message)

  const nicknameCheck = validateNickname(nickname)
  if (!nicknameCheck.ok) throw new Error(nicknameCheck.message)

  const passwordCheck = validatePassword(password)
  if (!passwordCheck.ok) throw new Error(passwordCheck.message)

  const confirmCheck = validatePasswordConfirm(password, confirmPassword)
  if (!confirmCheck.ok) throw new Error(confirmCheck.message)

  if (IS_REMOTE) {
    const data = await remoteAuth.register({
      username: accountCheck.value,
      password: passwordCheck.value,
      nickname: nicknameCheck.value
    })
    const publicAccount = await finishRemoteLogin(data.user)
    return { ok: true, account: publicAccount }
  }

  if (findAccountByLogin(accountCheck.value)) {
    throw new Error('这个账号已经注册过了，换一个试试')
  }

  const hashed = await hashPassword(passwordCheck.value)
  const record = createAccountRecord({
    account: accountCheck.value,
    nickname: nicknameCheck.value,
    salt: hashed.salt,
    hash: hashed.hash,
    algo: hashed.algo,
    iterations: hashed.iterations
  })
  insertAccount(record)
  updateAccountRecord(record.id, { lastLoginAt: new Date().toISOString() })
  finishLogin(record)

  return { ok: true, account: toPublicAccount(record) }
}

/** 登录：校验密码，失败次数过多会短暂锁定 */
export async function login({ account, password } = {}) {
  const accountCheck = validateAccount(account)
  if (!accountCheck.ok) throw new Error(accountCheck.message)

  const passwordCheck = validatePassword(password)
  if (!passwordCheck.ok) throw new Error('请输入密码')

  if (IS_REMOTE) {
    const data = await remoteAuth.login({
      username: accountCheck.value,
      password: passwordCheck.value
    })
    const publicAccount = await finishRemoteLogin(data.user)
    return { ok: true, account: publicAccount }
  }

  const record = findAccountByLogin(accountCheck.value)
  if (!record) throw new Error('账号或密码不正确')

  const now = Date.now()
  if (record.lockUntil && now < Number(record.lockUntil)) {
    const seconds = Math.ceil((Number(record.lockUntil) - now) / 1000)
    throw new Error(`尝试次数过多，请 ${seconds} 秒后再试`)
  }

  const matched = await verifyPassword(passwordCheck.value, record)
  if (!matched) {
    const recentWindow = record.failedAt && now - Number(record.failedAt) < FAIL_WINDOW_MS
    const failedCount = (recentWindow ? Number(record.failedCount) || 0 : 0) + 1
    const lockUntil = failedCount >= MAX_FAILED_ATTEMPTS ? now + LOCK_DURATION_MS : null
    updateAccountRecord(record.id, { failedCount, failedAt: now, lockUntil })
    if (lockUntil) throw new Error('密码连续输错太多次，请 1 分钟后再试')
    throw new Error('账号或密码不正确')
  }

  updateAccountRecord(record.id, {
    failedCount: 0,
    failedAt: null,
    lockUntil: null,
    lastLoginAt: new Date().toISOString()
  })
  finishLogin(record)
  return { ok: true, account: toPublicAccount(record) }
}

/** 退出登录：本机模式回到游客；云端模式回到登录页（由页面负责跳转） */
export function logout() {
  if (IS_REMOTE) {
    remoteAuth.logout()
    clearSession()
    activateAccount(null)
    return { ok: true }
  }
  clearAuthSession()
  activateAccount(null)
  return { ok: true }
}

export function updateNickname(nickname) {
  if (IS_REMOTE) throw new Error('云端账号昵称暂不支持在这里修改')
  const current = getCurrentAccount()
  if (!current) throw new Error('请先登录')
  const check = validateNickname(nickname)
  if (!check.ok) throw new Error(check.message)
  updateAccountRecord(current.id, { nickname: check.value })
  engine.setChildName(check.value)
  return { ok: true, account: toPublicAccount(findAccountById(current.id)) }
}

export async function changePassword({ password, newPassword, confirmPassword } = {}) {
  if (IS_REMOTE) throw new Error('云端账号修改密码功能即将开放')
  const session = readAuthSession()
  if (!session) throw new Error('请先登录')
  const record = findAccountById(session.accountId)
  if (!record) throw new Error('账号不存在，请重新登录')

  const matched = await verifyPassword(String(password ?? ''), record)
  if (!matched) throw new Error('当前密码不正确')

  const passwordCheck = validatePassword(newPassword)
  if (!passwordCheck.ok) throw new Error(passwordCheck.message)

  const confirmCheck = validatePasswordConfirm(newPassword, confirmPassword)
  if (!confirmCheck.ok) throw new Error(confirmCheck.message)

  const hashed = await hashPassword(passwordCheck.value)
  updateAccountRecord(record.id, {
    salt: hashed.salt,
    hash: hashed.hash,
    algo: hashed.algo,
    iterations: hashed.iterations
  })
  return { ok: true }
}
