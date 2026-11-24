/**
 * AI 小老师（云端解析 / 讲解）。
 * 只在 remote 模式使用；本地 / Pages 继续走规则引擎。
 */
import { API_BASE, IS_REMOTE } from '../config.js'
import { getToken } from './remoteAuth.js'

export async function chatWithAiRemote({ message, grade = 1, mode = 'chat', history = [], memory = '' } = {}) {
  if (!IS_REMOTE) throw new Error('当前为本地模式')
  const token = getToken()
  if (!token) {
    const error = new Error('请先登录')
    error.status = 401
    throw error
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)
  try {
    const response = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ message, grade, mode, history, memory }),
      signal: controller.signal
    })
    let payload = null
    try {
      payload = await response.json()
    } catch (error) {
      payload = null
    }
    if (!response.ok) {
      const detail = payload?.detail
      const failure = new Error(
        typeof detail === 'string' ? detail : detail?.message || `AI 服务返回 ${response.status}`
      )
      failure.status = response.status
      failure.detail = detail
      throw failure
    }
    return payload || {}
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeout = new Error('AI 回答超时')
      timeout.status = 408
      throw timeout
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
