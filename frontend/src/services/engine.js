import { createEngine } from './engineCore.js'
import { createAccountStorage } from './storage.js'
import { readAuthSession } from './authSession.js'
import { IS_REMOTE } from '../config.js'
import { getStoredUser } from './remoteAuth.js'
import { resume, schedulePush } from './stateSync.js'

/**
 * 数据引擎单例，支持在「游客」「本机账号」「云端账号」之间切换。
 *
 * 每个账号的数据存在独立存储键里；通过 Proxy 暴露 engine，
 * 页面里已有的 engine.getDashboard() 等调用不需要改动。
 */

const remoteUser = IS_REMOTE ? getStoredUser() : null
if (IS_REMOTE && remoteUser) resume(remoteUser.id)

let activeAccountId = IS_REMOTE
  ? remoteUser
    ? `remote_${remoteUser.id}`
    : null
  : readAuthSession()?.accountId || null
let activeEngine = buildEngine(activeAccountId)

function buildEngine(accountId) {
  return createEngine(createAccountStorage(accountId), {
    // 游客看示例数据；真实账号（含云端账号）从空白开始
    seedDemo: IS_REMOTE ? false : !accountId,
    onCommit: IS_REMOTE ? (raw) => schedulePush(raw) : undefined
  })
}

export function getActiveAccountId() {
  return activeAccountId
}

export function isRemoteAccount(accountId = activeAccountId) {
  return IS_REMOTE && String(accountId || '').startsWith('remote_')
}

export function activateAccount(accountId) {
  activeAccountId = accountId || null
  activeEngine = buildEngine(activeAccountId)
  return activeEngine
}

export const engine = new Proxy(
  {},
  {
    get(_target, property) {
      const value = activeEngine[property]
      return typeof value === 'function' ? value.bind(activeEngine) : value
    },
    has(_target, property) {
      return property in activeEngine
    },
    set(_target, property, value) {
      activeEngine[property] = value
      return true
    }
  }
)
