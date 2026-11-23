/**
 * 服务器端「AI 出题」客户端。
 *
 * - 云端模式：调用同源 FastAPI，由后端用通义千问生成题目（需要登录 token）；
 * - 本地/Pages 模式：GitHub Pages 没有后端，自动跳过并回退本地题库；
 * - 请求失败（没配 Key、超时、断网）时由调用方回退，不影响正常练习。
 */
import { API_BASE, IS_REMOTE } from '../config.js'
import { getToken } from './remoteAuth.js'

const REQUEST_TIMEOUT = 30000
const CHILD_USER_ID = 2

/** 当前环境是否值得尝试请求后端 */
export function isRemoteAiEnabled() {
  if (IS_REMOTE) return true
  if (typeof window === 'undefined' || !window.location) return false
  const host = String(window.location.hostname || '').toLowerCase()
  if (!host) return false
  if (host === 'github.io' || host.endsWith('.github.io')) return false
  return true
}

/**
 * 请求后端生成练习题。
 * @returns {Promise<{questions: Array, aiGenerated: boolean, aiEnabled: boolean, demo: boolean}>}
 */
export async function generatePracticeRemote({ subject = 'math', grade = 1, count = 5 } = {}) {
  if (!isRemoteAiEnabled()) {
    throw new Error('当前静态站点未连接后端')
  }

  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (IS_REMOTE) {
    if (!token) throw new Error('请先登录')
    headers.Authorization = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    const response = await fetch(`${API_BASE}/api/practice/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: CHILD_USER_ID,
        subject,
        grade,
        count,
        // 本地数据模式需要答案在本地判题
        include_answer: true
      }),
      signal: controller.signal
    })
    if (response.status === 401) throw new Error('登录已过期，请重新登录')
    let payload = null
    try {
      payload = await response.json()
    } catch (error) {
      payload = null
    }
    if (!response.ok) {
      const detail = payload?.detail
      const message = typeof detail === 'string' ? detail : detail?.message || `AI 出题接口返回 ${response.status}`
      throw new Error(message)
    }
    return {
      questions: Array.isArray(payload?.questions) ? payload.questions : [],
      aiGenerated: Boolean(payload?.ai_generated),
      aiEnabled: Boolean(payload?.ai_enabled),
      demo: payload?.demo !== false
    }
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('AI 出题超时')
    throw error
  } finally {
    clearTimeout(timer)
  }
}
