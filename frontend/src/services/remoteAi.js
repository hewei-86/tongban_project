/**
 * 服务器端「AI 出题」客户端。
 *
 * - 在自建服务器 / 本地开发环境：调用同源（或 VITE_API_BASE）的 FastAPI 接口，
 *   由后端用通义千问生成题目；
 * - 在 GitHub Pages 等没有后端的静态站点：禁用远程请求，回退本地题库；
 * - 请求失败（没配 Key、超时、断网）时由调用方回退，不影响正常练习。
 */

const REQUEST_TIMEOUT = 30000
const CHILD_USER_ID = 2

function apiBase() {
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}
  return String(env.VITE_API_BASE || '').replace(/\/+$/, '')
}

/** 当前环境是否值得尝试请求后端（GitHub Pages 上直接跳过，避免无谓的 404） */
export function isRemoteAiEnabled() {
  if (typeof window === 'undefined' || !window.location) return false
  const host = String(window.location.hostname || '').toLowerCase()
  if (!host) return false
  if (host === 'github.io' || host.endsWith('.github.io')) return false
  return true
}

/**
 * 请求后端生成练习题。
 * @returns {Promise<{questions: Array, aiGenerated: boolean, demo: boolean}>}
 */
export async function generatePracticeRemote({ subject = 'math', grade = 1, count = 5 } = {}) {
  if (!isRemoteAiEnabled()) {
    throw new Error('当前静态站点未连接后端')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    const response = await fetch(`${apiBase()}/api/practice/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: CHILD_USER_ID,
        subject,
        grade,
        count,
        // 本机数据模式需要答案在本地判题
        include_answer: true
      }),
      signal: controller.signal
    })
    if (!response.ok) throw new Error(`AI 出题接口返回 ${response.status}`)
    const payload = await response.json()
    return {
      questions: Array.isArray(payload.questions) ? payload.questions : [],
      aiGenerated: Boolean(payload.ai_generated),
      aiEnabled: Boolean(payload.ai_enabled),
      demo: payload.demo !== false
    }
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('AI 出题超时')
    throw error
  } finally {
    clearTimeout(timer)
  }
}
