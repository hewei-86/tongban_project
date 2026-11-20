/**
 * 本机账号的密码处理。
 *
 * - 优先使用 WebCrypto 的 PBKDF2-SHA256（12 万次迭代 + 随机盐）；
 * - 在没有 crypto.subtle 的环境（旧浏览器 / 部分小程序环境）退化为
 *   纯 JS 的加盐 SHA-256 多轮哈希；
 * - 只保存盐和哈希，永远不保存明文密码。
 */

const PBKDF2_ITERATIONS = 120000
const FALLBACK_ITERATIONS = 4000

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
])

function rotr(value, bits) {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0
}

function toHex(bytes) {
  let result = ''
  for (const byte of bytes) result += byte.toString(16).padStart(2, '0')
  return result
}

/** 纯 JS SHA-256（同步，供不支持 crypto.subtle 的环境与单元测试使用） */
export function sha256Hex(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  const bitLength = bytes.length * 8
  const totalLength = Math.ceil((bytes.length + 9) / 64) * 64
  const buffer = new Uint8Array(totalLength)
  buffer.set(bytes)
  buffer[bytes.length] = 0x80

  const view = new DataView(buffer.buffer)
  view.setUint32(totalLength - 8, Math.floor(bitLength / 0x100000000))
  view.setUint32(totalLength - 4, bitLength >>> 0)

  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ])
  const words = new Uint32Array(64)

  for (let offset = 0; offset < totalLength; offset += 64) {
    for (let i = 0; i < 16; i++) words[i] = view.getUint32(offset + i * 4)

    for (let i = 16; i < 64; i++) {
      const s0 = rotr(words[i - 15], 7) ^ rotr(words[i - 15], 18) ^ (words[i - 15] >>> 3)
      const s1 = rotr(words[i - 2], 17) ^ rotr(words[i - 2], 19) ^ (words[i - 2] >>> 10)
      words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0
    }

    let [a, b, c, d, e, f, g, h] = hash
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const choice = (e & f) ^ (~e & g)
      const temp1 = (h + s1 + choice + SHA256_K[i] + words[i]) >>> 0
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const majority = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (s0 + majority) >>> 0

      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    hash[0] = (hash[0] + a) >>> 0
    hash[1] = (hash[1] + b) >>> 0
    hash[2] = (hash[2] + c) >>> 0
    hash[3] = (hash[3] + d) >>> 0
    hash[4] = (hash[4] + e) >>> 0
    hash[5] = (hash[5] + f) >>> 0
    hash[6] = (hash[6] + g) >>> 0
    hash[7] = (hash[7] + h) >>> 0
  }

  return Array.from(hash, (value) => value.toString(16).padStart(8, '0')).join('')
}

export function randomSalt(byteLength = 16) {
  const bytes = new Uint8Array(byteLength)
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : null
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes)
  } else {
    for (let i = 0; i < byteLength; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return toHex(bytes)
}

export function hasSecureCrypto() {
  return Boolean(
    typeof globalThis !== 'undefined' &&
      globalThis.crypto &&
      globalThis.crypto.subtle &&
      typeof globalThis.crypto.subtle.deriveBits === 'function'
  )
}

/** 按指定算法派生哈希（导出便于测试） */
export async function derivePassword(password, salt, algorithm, iterations) {
  const text = String(password ?? '')
  const saltText = String(salt ?? '')
  const algo = algorithm === 'pbkdf2' ? 'pbkdf2' : 'sha256'
  const rounds = Math.max(1, Number(iterations) || (algo === 'pbkdf2' ? PBKDF2_ITERATIONS : FALLBACK_ITERATIONS))

  if (algo === 'pbkdf2') {
    if (!hasSecureCrypto()) {
      throw new Error('当前环境不支持安全登录，请用 HTTPS 重新打开本页面')
    }
    const encoder = new TextEncoder()
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      encoder.encode(text),
      'PBKDF2',
      false,
      ['deriveBits']
    )
    const bits = await globalThis.crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: encoder.encode(saltText), iterations: rounds, hash: 'SHA-256' },
      key,
      256
    )
    return toHex(new Uint8Array(bits))
  }

  let digest = sha256Hex(`${saltText}:${text}`)
  for (let i = 0; i < rounds; i++) digest = sha256Hex(`${digest}:${saltText}:${i}`)
  return digest
}

/** 生成可以直接存进账号记录的密码字段 */
export async function hashPassword(password) {
  const salt = randomSalt()
  const algorithm = hasSecureCrypto() ? 'pbkdf2' : 'sha256'
  const iterations = algorithm === 'pbkdf2' ? PBKDF2_ITERATIONS : FALLBACK_ITERATIONS
  const hash = await derivePassword(password, salt, algorithm, iterations)
  return { salt, hash, algo: algorithm, iterations }
}

function safeEqual(left, right) {
  const a = String(left || '')
  const b = String(right || '')
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** 校验密码是否与账号记录匹配 */
export async function verifyPassword(password, record) {
  if (!record || !record.salt || !record.hash) return false
  const algorithm = record.algo === 'pbkdf2' ? 'pbkdf2' : 'sha256'
  const iterations = Number(record.iterations) || (algorithm === 'pbkdf2' ? PBKDF2_ITERATIONS : FALLBACK_ITERATIONS)
  const derived = await derivePassword(password, record.salt, algorithm, iterations)
  return safeEqual(derived, record.hash)
}
