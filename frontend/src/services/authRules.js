/** 账号 / 昵称 / 密码的校验规则（纯函数，方便复用和测试） */

export const ACCOUNT_PATTERN = /^[A-Za-z0-9_]{4,20}$/
export const NICKNAME_MIN = 1
export const NICKNAME_MAX = 12
export const PASSWORD_MIN = 6
export const PASSWORD_MAX = 64

export function normalizeAccount(value) {
  return String(value ?? '').trim()
}

export function validateAccount(value) {
  const account = normalizeAccount(value)
  if (!account) return { ok: false, message: '请填写账号' }
  if (!ACCOUNT_PATTERN.test(account)) {
    return { ok: false, message: '账号需为 4—20 位字母、数字或下划线' }
  }
  return { ok: true, value: account }
}

export function validateNickname(value) {
  const nickname = String(value ?? '').trim()
  if (!nickname) return { ok: false, message: '请填写昵称' }
  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return { ok: false, message: `昵称长度需在 ${NICKNAME_MIN}—${NICKNAME_MAX} 个字符之间` }
  }
  if (/[\u0000-\u001f]/.test(nickname)) {
    return { ok: false, message: '昵称里不能有特殊控制字符' }
  }
  return { ok: true, value: nickname }
}

export function validatePassword(value) {
  const password = String(value ?? '')
  if (!password) return { ok: false, message: '请填写密码' }
  if (password.length < PASSWORD_MIN) {
    return { ok: false, message: `密码至少需要 ${PASSWORD_MIN} 位` }
  }
  if (password.length > PASSWORD_MAX) {
    return { ok: false, message: `密码不能超过 ${PASSWORD_MAX} 位` }
  }
  return { ok: true, value: password }
}

export function validatePasswordConfirm(password, confirm) {
  if (!confirm) return { ok: false, message: '请再输入一次密码' }
  if (password !== confirm) return { ok: false, message: '两次输入的密码不一样' }
  return { ok: true }
}

/** 登录页展示用的脱敏账号，例如 to****86 */
export function maskAccount(account) {
  const value = normalizeAccount(account)
  if (!value) return ''
  if (value.length <= 4) return `${value.slice(0, 1)}***`
  return `${value.slice(0, 2)}****${value.slice(-2)}`
}
