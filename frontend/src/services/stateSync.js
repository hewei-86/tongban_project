/**
 * 账号数据同步（MySQL）
 *
 * 本地 localStorage 只作为离线缓存；服务端 /api/state 保存每个账号的完整数据快照。
 * 写入采用防抖 + 版本号（base_version），多端同时修改时返回 409，由页面刷新到最新数据。
 */
import { API_BASE } from '../config.js'
import { clearAuth, getToken } from './remoteAuth.js'
import { createAccountStorage } from './storage.js'

const VERSION_PREFIX = 'tongban_sync_version_'
const PUSH_DELAY = 800

let currentUserId = null
let currentVersion = 0
let pendingRaw = null
let pushTimer = null
let flushing = false
let conflictHandler = null

function versionKey(userId) {
  return `${VERSION_PREFIX}${userId}`
}

function persistVersion() {
  if (!currentUserId) return
  try {
    uni.setStorageSync(versionKey(currentUserId), String(currentVersion))
  } catch (error) {
    // ignore
  }
}

export function storageFor(userId) {
  return createAccountStorage(`remote_${userId}`)
}

export function resume(userId) {
  currentUserId = userId || null
  currentVersion = 0
  if (!userId) return 0
  try {
    currentVersion = Number(uni.getStorageSync(versionKey(userId)) || 0) || 0
  } catch (error) {
    currentVersion = 0
  }
  return currentVersion
}

export function begin(userId, version = 0) {
  currentUserId = userId || null
  currentVersion = Number(version) || 0
  persistVersion()
}

export function clearSession() {
  currentUserId = null
  currentVersion = 0
  pendingRaw = null
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = null
}

export function getUserId() {
  return currentUserId
}

export function getVersion() {
  return currentVersion
}

export function setConflictHandler(handler) {
  conflictHandler = typeof handler === 'function' ? handler : null
}

export function writeCache(userId, data) {
  const raw = typeof data === 'string' ? data : JSON.stringify(data)
  storageFor(userId).write(raw)
}

export function readCache(userId) {
  return storageFor(userId).read()
}

async function authFetch(path, options = {}) {
  const token = getToken()
  if (!token) {
    const error = new Error('请先登录')
    error.status = 401
    throw error
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), 20000) : null
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      },
      signal: controller ? controller.signal : undefined
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('同步超时，请稍后再试')
    throw new Error('网络连接失败，数据暂存在本机')
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
    if (response.status === 401) {
      clearAuth()
      try {
        uni.reLaunch({ url: '/pages/auth/login/login' })
      } catch (error) {
        // ignore
      }
    }
    const failure = new Error(
      (typeof data?.detail === 'string' && data.detail) || `同步失败（${response.status}）`
    )
    failure.status = response.status
    failure.detail = data?.detail
    throw failure
  }
  return data
}

export function fetchState() {
  return authFetch('/api/state')
}

export function schedulePush(raw) {
  if (!currentUserId || !raw) return
  pendingRaw = raw
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    flush()
  }, PUSH_DELAY)
}

export async function flush() {
  if (!currentUserId || !pendingRaw || flushing) return
  const raw = pendingRaw
  pendingRaw = null

  let data
  try {
    data = JSON.parse(raw)
  } catch (error) {
    return
  }

  flushing = true
  try {
    const result = await authFetch('/api/state', {
      method: 'PUT',
      body: JSON.stringify({ base_version: currentVersion, data })
    })
    currentVersion = Number(result?.version) || currentVersion + 1
    persistVersion()
  } catch (error) {
    if (error.status === 409) {
      const detail = error.detail || {}
      if (typeof detail.version === 'number') {
        currentVersion = detail.version
        persistVersion()
      }
      if (detail.data) writeCache(currentUserId, detail.data)
      try {
        uni.showToast({ title: '数据已在其他设备更新，正在同步', icon: 'none' })
      } catch (toastError) {
        // ignore
      }
      if (conflictHandler) conflictHandler(detail)
    } else if (error.status === 401) {
      // 已跳转登录页
    } else {
      console.warn('[sync] 上传失败：', error.message)
    }
  } finally {
    flushing = false
    if (pendingRaw) {
      const latest = pendingRaw
      pendingRaw = null
      schedulePush(latest)
    }
  }
}

export async function pullIfNewer() {
  if (!currentUserId) return { changed: false }
  const state = await fetchState()
  if (!state) return { changed: false }
  if (Number(state.version) > currentVersion) {
    currentVersion = Number(state.version) || 0
    persistVersion()
    if (state.data) writeCache(currentUserId, state.data)
    return { changed: true, data: state.data, version: currentVersion }
  }
  return { changed: false }
}
