import test from 'node:test'
import assert from 'node:assert/strict'

import {
  derivePassword,
  hashPassword,
  sha256Hex,
  verifyPassword
} from '../src/services/password.js'
import {
  maskAccount,
  validateAccount,
  validateNickname,
  validatePassword,
  validatePasswordConfirm
} from '../src/services/authRules.js'
import { createEngine } from '../src/services/engineCore.js'
import { createMemoryStorage } from '../src/services/storage.js'

const NOW = new Date(2026, 10, 20, 10, 0, 0)

test('SHA-256 计算符合标准测试向量', () => {
  assert.equal(
    sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  )
  assert.equal(
    sha256Hex(''),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  )
  assert.equal(
    sha256Hex('The quick brown fox jumps over the lazy dog'),
    'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592'
  )
})

test('PBKDF2 密码哈希可以校验，错误密码不通过', async () => {
  const record = await hashPassword('abc12345')
  assert.equal(record.algo, 'pbkdf2')
  assert.ok(record.iterations >= 100000)
  assert.notEqual(record.hash, 'abc12345')
  assert.equal(await verifyPassword('abc12345', record), true)
  assert.equal(await verifyPassword('abc12346', record), false)
  assert.equal(await verifyPassword('', record), false)
})

test('没有 crypto.subtle 时退化为加盐 SHA-256 也能校验', async () => {
  const salt = '0123456789abcdef0123456789abcdef'
  const hash = await derivePassword('password1', salt, 'sha256', 20)
  const record = { salt, hash, algo: 'sha256', iterations: 20 }
  assert.equal(await verifyPassword('password1', record), true)
  assert.equal(await verifyPassword('password2', record), false)
  // 参数缺失或记录损坏时不能通过
  assert.equal(await verifyPassword('password1', { salt, hash: '', algo: 'sha256' }), false)
  assert.equal(await verifyPassword('password1', null), false)
})

test('相同密码每次都会生成不同的盐和哈希', async () => {
  const first = await hashPassword('same-password')
  const second = await hashPassword('same-password')
  assert.notEqual(first.salt, second.salt)
  assert.notEqual(first.hash, second.hash)
})

test('账号规则：4—20 位字母、数字或下划线', () => {
  assert.equal(validateAccount('abc').ok, false)
  assert.equal(validateAccount('abc def').ok, false)
  assert.equal(validateAccount('儿童账号').ok, false)
  assert.equal(validateAccount('a'.repeat(21)).ok, false)
  assert.equal(validateAccount('demo_2026').ok, true)
  assert.equal(validateAccount('  demo_2026  ').value, 'demo_2026')
})

test('昵称与密码规则', () => {
  assert.equal(validateNickname('').ok, false)
  assert.equal(validateNickname('小童').ok, true)
  assert.equal(validateNickname('一二三四五六七八九十一二三').ok, false)
  assert.equal(validatePassword('12345').ok, false)
  assert.equal(validatePassword('123456').ok, true)
  assert.equal(validatePassword('a'.repeat(65)).ok, false)
  assert.equal(validatePasswordConfirm('123456', '123457').ok, false)
  assert.equal(validatePasswordConfirm('123456', '123456').ok, true)
})

test('账号脱敏展示', () => {
  assert.equal(maskAccount('tom'), 't***')
  assert.equal(maskAccount('demo_2026'), 'de****26')
  assert.equal(maskAccount(''), '')
})

test('登录账号使用空白数据，游客使用示例数据', () => {
  const clean = createEngine(createMemoryStorage(null), { now: () => new Date(NOW), seedDemo: false })
  const cleanDashboard = clean.getDashboard()
  assert.equal(cleanDashboard.points, 0)
  assert.equal(cleanDashboard.exp, 0)
  assert.equal(cleanDashboard.streak_days, 0)
  assert.equal(cleanDashboard.today_total, 0)
  assert.equal(clean.getWrongBook().length, 0)
  assert.ok(clean.getGrowthCurve(2, 7).every((day) => day.minutes === 0))

  const demo = createEngine(createMemoryStorage(null), { now: () => new Date(NOW) })
  assert.equal(demo.getWrongBook().length, 2)
  assert.equal(demo.getWeeklyReport().total_records, 7)
})

test('账号昵称会同步为孩子显示名', () => {
  const engine = createEngine(createMemoryStorage(null), { now: () => new Date(NOW), seedDemo: false })
  engine.setChildName('小明')
  assert.equal(engine.getDashboard().username, '小明')
  assert.equal(engine.getSession().username, '小明')

  engine.setChildName('   ')
  assert.equal(engine.getDashboard().username, '小明')
})

test('账号数据重置后仍然是空白，不会混入演示记录', () => {
  const engine = createEngine(createMemoryStorage(null), { now: () => new Date(NOW), seedDemo: false })
  engine.submitLearning({ question_id: 1, answer: '15', seconds: 30 })
  assert.ok(engine.getDashboard().points > 0)

  engine.resetAll()
  const dashboard = engine.getDashboard()
  assert.equal(dashboard.points, 0)
  assert.equal(dashboard.today_total, 0)
  assert.equal(engine.getWrongBook().length, 0)
})
