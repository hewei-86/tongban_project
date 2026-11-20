/** 通用格式化工具（纯函数，方便单元测试） */

export const SUBJECT_LABELS = { math: '数学', chinese: '语文', english: '英语' }

export function pad2(value) {
  return String(value).padStart(2, '0')
}

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function dateOffset(days, base = new Date()) {
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

export function formatTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return dateKey(date)
}

export function percent(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 1000) / 10
}

export function weekdayLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00`)
  return ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
}

/**
 * 等级算法：累计经验 exp → 等级 / 当前级进度。
 * 每级所需经验 = 上一级 × 1.3 + 50，成长越来越慢但一直有反馈。
 */
export function levelInfo(exp) {
  const total = Math.max(0, Math.floor(Number(exp) || 0))
  let level = 1
  let need = 100
  let used = 0
  while (total >= used + need && level < 99) {
    used += need
    level += 1
    need = Math.round(need * 1.3) + 50
  }
  const inLevel = total - used
  return {
    level,
    need,
    inLevel,
    remain: Math.max(0, need - inLevel),
    percent: Math.min(100, Math.round((inLevel / need) * 100)),
    total
  }
}

/** 答案归一化：忽略空格、大小写、全角符号和中英文标点 */
export function normalizeAnswer(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，,。.！!？?、；;：:"'“”‘’]/g, '')
    .replace(/[（(]/g, '')
    .replace(/[）)]/g, '')
}

export function isAnswerCorrect(input, question) {
  const answer = normalizeAnswer(question?.answer)
  const value = normalizeAnswer(input)
  if (!value) return false
  if (value === answer) return true
  return (question?.accept || []).some((item) => normalizeAnswer(item) === value)
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min))
}

export function greetingByHour(hour = new Date().getHours()) {
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}
