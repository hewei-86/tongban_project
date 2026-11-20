import test from 'node:test'
import assert from 'node:assert/strict'

import { createEngine, CHILD_ID, STATE_VERSION } from '../src/services/engineCore.js'
import { createMemoryStorage } from '../src/services/storage.js'
import { aiAnswer, safeCalculate } from '../src/services/aiTutor.js'
import { dateOffset, isAnswerCorrect, levelInfo, normalizeAnswer } from '../src/utils/format.js'

const NOW = new Date(2026, 10, 20, 10, 0, 0)

function fresh() {
  const storage = createMemoryStorage(null)
  const engine = createEngine(storage, { now: () => new Date(NOW) })
  return { engine, storage }
}

test('初始数据：孩子档案、示例记录和错题都已就绪', () => {
  const { engine } = fresh()
  const dashboard = engine.getDashboard()

  assert.equal(dashboard.user_id, CHILD_ID)
  assert.equal(dashboard.level, 1)
  assert.ok(dashboard.points >= 30, '初始积分应包含预置积分')
  assert.equal(dashboard.streak_days, 2)
  assert.equal(dashboard.grade, 1)
  assert.equal(dashboard.today_total, 0)
  assert.equal(engine.getWrongBook().length, 2)
  assert.ok(engine.getGrowthCurve(CHILD_ID, 14).length === 14)
  assert.ok(engine.getHeatmap(CHILD_ID, 28).length === 28)
})

test('签到：每天只能签一次，连续签到会累加天数', () => {
  const { engine } = fresh()
  const first = engine.doCheckin()
  assert.equal(first.ok, true)
  assert.equal(first.already, false)
  assert.equal(first.streak_days, 3)
  assert.ok(first.points_earned >= 8)

  const second = engine.doCheckin()
  assert.equal(second.already, true)
  assert.equal(second.points_earned, 0)
  assert.equal(engine.getCheckin().checkin_today, true)
})

test('答对加积分和经验，并推进今日任务', () => {
  const { engine } = fresh()
  const before = engine.getDashboard()

  const result = engine.submitLearning({ question_id: 1, answer: '15', seconds: 30 })
  assert.equal(result.is_correct, true)
  assert.equal(result.points_added, 2)
  assert.equal(result.exp_added, 5)
  assert.ok(result.explanation.includes('15'))

  const after = engine.getDashboard()
  assert.equal(after.today_total, 1)
  assert.equal(after.today_correct, 1)
  assert.ok(after.points > before.points)
  assert.deepEqual(
    result.task_updates.map((task) => task.completed_count),
    [1, 0, 0]
  )
})

test('答错进入错题本，重做正确后自动标记掌握', () => {
  const { engine } = fresh()
  const result = engine.submitLearning({ question_id: 2, answer: '6', seconds: 20 })
  assert.equal(result.is_correct, false)
  assert.equal(result.answer, '7')

  const wrongList = engine.getWrongBook()
  const item = wrongList.find((row) => row.question_id === 2)
  assert.ok(item, '错题应出现在错题本里')
  assert.equal(item.wrong_answer, '6')

  const retry = engine.retryWrong({ wrong_id: item.id, answer: '7' })
  assert.equal(retry.is_correct, true)
  assert.equal(retry.is_mastered, true)

  const reloaded = engine.getWrongBook().find((row) => row.id === item.id)
  assert.equal(reloaded.is_mastered, true)

  const removed = engine.removeWrong(item.id)
  assert.equal(removed.ok, true)
  assert.equal(engine.getWrongBook().some((row) => row.id === item.id), false)
})

test('连续答对可以升级', () => {
  const { engine } = fresh()
  for (let i = 0; i < 20; i++) {
    engine.submitLearning({ question_id: 1, answer: '15', seconds: 10 })
  }
  const growth = engine.getGrowth()
  assert.ok(growth.level >= 2, `期望升级，实际 Lv.${growth.level}`)
  assert.ok(growth.exp >= 135)
})

test('AI 出题会生成可提交的新题目', () => {
  const { engine } = fresh()
  const { questions } = engine.generatePractice({ subject: 'math', grade: 2, count: 5 })
  assert.equal(questions.length, 5)
  assert.ok(questions.every((item) => item.id > 54))
  assert.ok(questions.every((item) => item.options.length === 4))

  const first = questions[0]
  const submitted = engine.submitLearning({ question_id: first.id, answer: '0', seconds: 15 })
  assert.equal(typeof submitted.is_correct, 'boolean')
})

test('可以导入 AI 生成的题目并在本地判题', () => {
  const { engine } = fresh()
  const imported = engine.importQuestions([
    {
      subject: 'chinese',
      grade: 1,
      content: '“春眠不觉晓”的下一句是？',
      answer: '处处闻啼鸟',
      explanation: '出自孟浩然的《春晓》',
      options: ['处处闻啼鸟', '花落知多少']
    },
    {
      subject: 'math',
      grade: 2,
      content: '7 + 8 = ？',
      answer: '15',
      explanation: '凑十法',
      options: ['14', '15', '16']
    },
    { subject: 'math', content: '', answer: '' }
  ])

  assert.equal(imported.length, 2)
  assert.deepEqual(imported.map((item) => item.subject), ['chinese', 'math'])
  assert.equal(imported[0].answer, undefined, '不应把答案直接返回给页面')
  assert.deepEqual(imported[1].options, ['14', '15', '16'])

  const result = engine.submitLearning({ question_id: imported[1].id, answer: '15', seconds: 20 })
  assert.equal(result.is_correct, true)
  assert.equal(result.explanation, '凑十法')
})

test('学习报告会统计学科分布和建议', () => {
  const { engine } = fresh()
  const weekly = engine.getWeeklyReport()
  assert.equal(weekly.total_records, 7)
  assert.equal(weekly.study_days, 3)
  assert.equal(weekly.by_subject.length, 3)
  assert.ok(weekly.suggestions.length >= 1)

  const monthly = engine.getMonthlyReport()
  assert.equal(monthly.period, 'month')
  assert.equal(monthly.total_records, 7)
  assert.ok(monthly.daily.length === 30)
})

test('速算挑战：记录最高分并发放积分', () => {
  const { engine } = fresh()
  const result = engine.submitChallenge({ score: 40, correct: 8, total: 10, seconds: 60 })
  assert.equal(result.best, 40)
  assert.equal(result.is_new_best, true)
  assert.equal(result.points_earned, 21)
  assert.equal(result.exp_earned, 24)

  const stats = engine.getChallengeStats()
  assert.equal(stats.best, 40)
  assert.equal(stats.total_plays, 1)
})

test('收藏卡片会解锁对应成就', () => {
  const { engine } = fresh()
  engine.toggleFavorite('word', 'w1')
  engine.toggleFavorite('word', 'w2')
  const result = engine.toggleFavorite('word', 'w3')
  engine.toggleFavorite('poem', 'p1')
  const last = engine.toggleFavorite('idiom', 'i1')

  assert.equal(engine.listFavorites().length, 5)
  assert.ok(result.total >= 3)
  assert.ok(last.new_achievements.some((item) => item.name === '收藏家'))
})

test('导出、导入与重置', () => {
  const { engine } = fresh()
  engine.submitLearning({ question_id: 1, answer: '15', seconds: 30 })
  const backup = engine.exportData()
  const parsed = JSON.parse(backup)
  assert.equal(parsed.app, 'tongban')
  assert.equal(parsed.version, STATE_VERSION)
  assert.equal(parsed.state.records.length, 8)

  const target = fresh().engine
  const imported = target.importData(backup)
  assert.equal(imported.ok, true)
  assert.equal(target.getDashboard().today_total, 1)
  assert.throws(() => target.importData('{"foo": 1}'), /版本不匹配/)

  target.resetAll()
  assert.equal(target.getDashboard().today_total, 0)
  assert.equal(target.getWrongBook().length, 2)
})

test('家长视角数据包含孩子概况与时长设置', () => {
  const { engine } = fresh()
  const data = engine.getParentDashboard()
  assert.equal(data.children.length, 1)
  assert.equal(data.children[0].username, '小童')
  assert.ok(data.time_limits[0].daily_limit_minutes >= 10)

  engine.setTimeLimit({ daily_limit_minutes: 40, warning_minutes: 30 })
  const updated = engine.getParentDashboard()
  assert.equal(updated.time_limits[0].daily_limit_minutes, 40)
  assert.equal(updated.time_limits[0].warning_minutes, 30)
})

test('目标与亲子互评可以创建并统计默契度', () => {
  const { engine } = fresh()
  const created = engine.createGoal({ title: '每天 10 分钟口算', target_minutes: 10 })
  assert.equal(created.ok, true)
  assert.equal(engine.listGoals().length, 1)

  engine.completeGoal(created.id)
  assert.equal(engine.listGoals()[0].is_completed, true)

  engine.createEvaluation({ direction: 'parent_to_child', item: '学习主动性', score: 5, comment: '今天很主动' })
  engine.createEvaluation({ direction: 'child_to_parent', item: '陪伴时间', score: 4, comment: '谢谢陪我' })
  const harmony = engine.getHarmony()
  assert.equal(harmony.count, 2)
  assert.ok(harmony.harmony_score > 0)
  assert.equal(engine.listEvaluations().length, 2)
})

test('AI 小老师：计算、古诗、单词、安全与兜底', () => {
  assert.ok(aiAnswer('8+7等于几').includes('15'))
  assert.ok(aiAnswer('12 加 9 是多少').includes('21'))
  assert.ok(aiAnswer('春晓怎么背').includes('春眠不觉晓'))
  assert.ok(aiAnswer('苹果的英文是什么').includes('apple'))
  assert.ok(aiAnswer('守株待兔是什么意思').includes('侥幸'))
  assert.ok(aiAnswer('日字加一横变成什么字').includes('目'))
  assert.ok(aiAnswer('我家住在幸福路 3 号').includes('隐私'))
  assert.ok(aiAnswer('我不想活了').includes('12355'))
  assert.ok(aiAnswer('量子力学是什么').includes('还没有把握'))

  assert.equal(safeCalculate('8+7').value, 15)
  assert.equal(safeCalculate('2+3*4').value, 14)
  assert.equal(safeCalculate('10/0'), null)
})

test('答案判定容忍空格、大小写与标点', () => {
  assert.equal(normalizeAnswer('  长 × 宽  '), '长×宽')
  assert.equal(isAnswerCorrect('APPLE', { answer: 'apple' }), true)
  assert.equal(isAnswerCorrect('处处闻啼鸟。', { answer: '处处闻啼鸟' }), true)
  assert.equal(isAnswerCorrect('', { answer: 'apple' }), false)
})

test('等级算法稳定：经验增加等级不下降', () => {
  let previous = 1
  for (let exp = 0; exp <= 3000; exp += 25) {
    const info = levelInfo(exp)
    assert.ok(info.level >= previous)
    assert.ok(info.percent >= 0 && info.percent <= 100)
    previous = info.level
  }
  assert.equal(levelInfo(0).level, 1)
  assert.equal(levelInfo(100).level, 2)
})

test('日期工具按本地时区生成', () => {
  assert.equal(dateOffset(0, NOW), '2026-11-20')
  assert.equal(dateOffset(-1, NOW), '2026-11-19')
  assert.equal(dateOffset(1, NOW), '2026-11-21')
})
