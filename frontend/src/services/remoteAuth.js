/**
 * 远端账号：注册 / 登录 / JWT / 当前用户
 * 仅在 VITE_DATA_MODE=remote 时使用。
 */
import { API_BASE } from '../config.js'

const TOKEN_KEY = 'tongban_token_v1'
const USER_KEY = 'tongban_remote_user_v1'
const REQUEST_TIMEOUT = 20000

export function getToken() {
  try {
    return uni.getStorageSync(TOKEN_KEY) || ''
  } catch (error) {
    return ''
  }
}

export function getStoredUser() {
  try {
    const raw = uni.getStorageSync(USER_KEY)
    if (!raw) return null
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch (error) {
    return null
  }
}

function saveAuth(token, user) {
  try {
    uni.setStorageSync(TOKEN_KEY, token || '')
    uni.setStorageSync(USER_KEY, JSON.stringify(user || null))
  } catch (error) {
    // 存储不可用时只保留内存态
  }
}

export function clearAuth() {
  try {
    uni.removeStorageSync(TOKEN_KEY)
    uni.removeStorageSync(USER_KEY)
  } catch (error) {
    // ignore
  }
}

export function isAuthenticated() {
  return Boolean(getToken() && getStoredUser())
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT) : null
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller ? controller.signal : undefined
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('网络超时，请稍后再试')
    throw new Error('网络连接失败，请检查网络')
  } finally {
    if (timer) clearTimeout(timer)
  }

  let data = null
  try {
    data = await response.json()
  } catch (error) {
    data = null
  }

  if (!response.ok) {
    let message = data?.detail
    if (message && typeof message === 'object') message = message.message
    if (!message) message = `请求失败（${response.status}）`
    const failure = new Error(message)
    failure.status = response.status
    failure.detail = data?.detail
    if (response.status === 401) clearAuth()
    throw failure
  }
  return data
}

export async function register({ username, password, nickname }) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: { username, password, nickname },
    auth: false
  })
  saveAuth(data.token, data.user)
  return data
}

export async function login({ username, password }) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: { username, password },
    auth: false
  })
  saveAuth(data.token, data.user)
  return data
}

export async function fetchMe() {
  const data = await request('/api/auth/me')
  if (data?.user) saveAuth(getToken(), data.user)
  return data?.user || null
}

export function logout() {
  clearAuth()
}
