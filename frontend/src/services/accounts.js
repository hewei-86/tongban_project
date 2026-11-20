/**
 * 本机账号列表。
 *
 * 只保存在当前浏览器的存储里，结构示例：
 * [{ id, account, nickname, salt, hash, algo, iterations, createdAt, lastLoginAt }]
 * 学习数据按账号分开存储（见 storage.js 的 createAccountStorage）。
 */

const ACCOUNTS_KEY = 'tongban_accounts_v1'

function isValidAccount(item) {
  return Boolean(
    item &&
      typeof item.id === 'string' &&
      item.id &&
      typeof item.account === 'string' &&
      item.account &&
      typeof item.hash === 'string' &&
      typeof item.salt === 'string'
  )
}

export function readAccounts() {
  try {
    const raw = uni.getStorageSync(ACCOUNTS_KEY)
    if (!raw) return []
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(list) ? list.filter(isValidAccount) : []
  } catch (error) {
    return []
  }
}

function saveAccounts(list) {
  uni.setStorageSync(ACCOUNTS_KEY, JSON.stringify(list))
}

export function findAccountByLogin(account) {
  const key = String(account ?? '').trim().toLowerCase()
  if (!key) return null
  return readAccounts().find((item) => item.account.toLowerCase() === key) || null
}

export function findAccountById(id) {
  if (!id) return null
  return readAccounts().find((item) => item.id === id) || null
}

export function insertAccount(record) {
  const list = readAccounts()
  list.push(record)
  saveAccounts(list)
  return record
}

export function updateAccountRecord(id, patch) {
  const list = readAccounts()
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return null
  list[index] = { ...list[index], ...patch, updatedAt: new Date().toISOString() }
  saveAccounts(list)
  return list[index]
}

export function removeAccountRecord(id) {
  const list = readAccounts().filter((item) => item.id !== id)
  saveAccounts(list)
}

function randomHex(byteLength = 4) {
  const bytes = new Uint8Array(byteLength)
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : null
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes)
  } else {
    for (let i = 0; i < byteLength; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function newAccountId() {
  return `acct_${Date.now().toString(36)}_${randomHex(4)}`
}

export function createAccountRecord({ account, nickname, salt, hash, algo, iterations }) {
  const now = new Date().toISOString()
  return {
    id: newAccountId(),
    account,
    nickname,
    salt,
    hash,
    algo,
    iterations,
    createdAt: now,
    lastLoginAt: null,
    failedCount: 0,
    failedAt: null,
    lockUntil: null
  }
}

/** 对外的安全视图：绝不返回 salt / hash */
export function toPublicAccount(record) {
  if (!record) return null
  return {
    id: record.id,
    account: record.account,
    nickname: record.nickname,
    createdAt: record.createdAt,
    lastLoginAt: record.lastLoginAt || null
  }
}

export function listPublicAccounts() {
  return readAccounts()
    .map(toPublicAccount)
    .sort((a, b) => String(b.lastLoginAt || b.createdAt).localeCompare(String(a.lastLoginAt || a.createdAt)))
}
