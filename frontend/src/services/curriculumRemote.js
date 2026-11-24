import { API_BASE, IS_REMOTE } from '../config.js'
import { getToken } from './remoteAuth.js'

async function request(path, { method = 'GET', body } = {}) {
  if (!IS_REMOTE) throw new Error('当前为本地模式')
  const token = getToken()
  if (!token) {
    const error = new Error('请先登录')
    error.status = 401
    throw error
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
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
      typeof detail === 'string' ? detail : detail?.message || `请求失败（${response.status}）`
    )
    failure.status = response.status
    failure.detail = detail
    throw failure
  }
  return payload || {}
}

export function fetchCurriculumBooks() {
  return request('/api/curriculum/books')
}

export function activateCurriculumBook(bookId) {
  return request(`/api/curriculum/books/${encodeURIComponent(bookId)}/activate`, { method: 'POST' })
}

export function generateUnitQuestions(bookId, unitId, count = 5) {
  return request(
    `/api/curriculum/books/${encodeURIComponent(bookId)}/units/${encodeURIComponent(unitId)}/generate`,
    { method: 'POST', body: { count } }
  )
}
