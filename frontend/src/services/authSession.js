/**
 * 登录会话：只记录「当前登录的是哪个本机账号」。
 * 真正的账号列表在 accounts.js，学习数据在各自独立的存储键里。
 */
const AUTH_KEY = 'tongban_auth_v1'

export function readAuthSession() {
  try {
    const value = uni.getStorageSync(AUTH_KEY)
    if (!value) return null
    const session = typeof value === 'string' ? JSON.parse(value) : value
    if (!session || typeof session.accountId !== 'string' || !session.accountId) return null
    return session
  } catch (error) {
    return null
  }
}

export function writeAuthSession(session) {
  try {
    uni.setStorageSync(AUTH_KEY, JSON.stringify(session))
  } catch (error) {
    // 隐私模式下静默失败，登录态仅在本次会话内有效
  }
}

export function clearAuthSession() {
  try {
    uni.removeStorageSync(AUTH_KEY)
  } catch (error) {
    // ignore
  }
}
