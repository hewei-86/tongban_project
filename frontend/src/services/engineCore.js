/**
 * 本地数据引擎 —— 让「童伴成长」在纯静态托管（GitHub Pages）上也能完整使用。
 *
 * 设计原则：
 * 1. 所有读写都落在一个状态对象里，持久化到浏览器 localStorage；
 * 2. 接口形状尽量贴近 FastAPI 后端（见 backend/main.py），方便以后切换成真实接口；
 * 3. 引擎不依赖 uni / window，通过 storage 适配器注入，可在 Node 里直接跑单元测试。
 */

import { generateMathQuestion, QUESTION_BANK } from '../data/questions.js'
import { getDailyTip, IDIOMS, POEMS, WORDS } from '../data/cards.js'
import { aiAnswer } from './aiTutor.js'
import {
  clamp,
  dateKey,
  dateOffset,
  formatTime,
  isAnswerCorrect,
  levelInfo,
  percent,
  weekdayLabel
} from '../utils/format.js'

export const STATE_VERSION = 1
export const STATE_KEY = 'tongban_state_v1'

export const CHILD_ID = 2
export const PARENT_ID = 1
export const FAMILY_ID = 1

export const ACHIEVEMENTS = [
  { id: 1, name: '初次练习', description: '完成第一次学习练习', icon: '🌱', type: 'first_practice', value: 1, reward: 20 },
  { id: 2, name: '坚持三天', description: '连续签到 3 天', icon: '📅', type: 'streak_checkin', value: 3, reward: 30 },
  { id: 3, name: '坚持不懈', description: '连续签到 7 天', icon: '🔥', type: 'streak_checkin', value: 7, reward: 50 },
  { id: 4, name: '学霸养成', description: '累计答对 50 道题', icon: '🏆', type: 'correct_count', value: 50, reward: 80 },
  { id: 5, name: '错题克星', description: '掌握 10 道错题', icon: '🎯', type: 'master_wrong', value: 10, reward: 50 },
  { id: 6, name: '学习小达人', description: '累计学习 120 分钟', icon: '⏰', type: 'total_minutes', value: 120, reward: 60 },
  { id: 7, name: '亲子互动', description: '完成 5 次亲子互评', icon: '💗', type: 'evaluations', value: 5, reward: 40 },
  { id: 8, name: '等级晋升', description: '升到 3 级', icon: '🚀', type: 'reach_level', value: 3, reward: 100 },
  { id: 9, name: '速算小能手', description: '速算挑战得分达到 10', icon: '⚡', type: 'challenge_best', value: 10, reward: 30 },
  { id: 10, name: '速算达人', description: '速算挑战得分达到 20', icon: '🥇', type: 'challenge_best', value: 20, reward: 60 },
  { id: 11, name: '好问少年', description: '向 AI 小老师提问 10 次', icon: '🙋', type: 'ai_chats', value: 10, reward: 40 },
  { id: 12, name: '收藏家', description: '收藏 5 张知识卡片', icon: '⭐', type: 'favorites', value: 5, reward: 30 },
  { id: 13, name: '全能选手', description: '三个学科都练过', icon: '🎒', type: 'subjects_learned', value: 3, reward: 60 },
  { id: 14, name: '满勤小达人', description: '累计签到 30 次', icon: '🗓', type: 'checkin_count', value: 30, reward: 80 }
]

export const TASK_TEMPLATES = {
  1: [
    { subject: 'math', title: '数学小能手', description: '完成 5 道数学练习', target: 5, reward: 10 },
    { subject: 'chinese', title: '语文小达人', description: '完成 3 道语文练习', target: 3, reward: 8 },
    { subject: 'english', title: '英语小新星', description: '完成 3 道英语练习', target: 3, reward: 8 }
  ],
  2: [
    { subject: 'math', title: '数学进阶', description: '完成 6 道数学练习', target: 6, reward: 12 },
    { subject: 'chinese', title: '语文阅读', description: '完成 4 道语文练习', target: 4, reward: 10 },
    { subject: 'english', title: '英语提升', description: '完成 4 道英语练习', target: 4, reward: 10 }
  ],
  3: [
    { subject: 'math', title: '数学挑战', description: '完成 8 道数学练习', target: 8, reward: 15 },
    { subject: 'chinese', title: '语文积累', description: '完成 5 道语文练习', target: 5, reward: 12 },
    { subject: 'english', title: '英语冲刺', description: '完成 5 道英语练习', target: 5, reward: 12 }
  ]
}

export const EVALUATION_ITEMS = {
  parentToChild: ['学习主动性', '作业完成情况', '生活自理', '礼貌与习惯', '情绪表达'],
  childToParent: ['陪伴时间', '耐心倾听', '鼓励表扬', '共同活动', '遵守约定']
}

function isoAt(daysAgo, hour = 18, minute = 0, now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAgo, hour, minute, 0, 0)
  return date.toISOString()
}

function createState(now = new Date(), options = {}) {
  const seedDemo = options.seedDemo !== false
  const questions = QUESTION_BANK.map((item, index) => ({
    id: index + 1,
    subject: item.subject,
    grade: item.grade,
    content: item.content,
    answer: item.answer,
    explanation: item.explanation,
    options: [...item.options],
    accept: [...(item.accept || [])],
    source: 'bank',
    created_at: isoAt(-30, 9, 0, now)
  }))

  const state = {
    version: STATE_VERSION,
    createdAt: now.toISOString(),
    users: [
      { id: PARENT_ID, username: '童伴家长', role: 'parent' },
      { id: CHILD_ID, username: '小童', role: 'child' }
    ],
    family: { id: FAMILY_ID, name: '童伴示范家庭' },
    profiles: [
      seedDemo
        ? {
            user_id: CHILD_ID,
            grade: 1,
            points: 30,
            exp: 35,
            level: 1,
            study_minutes_total: 22,
            streak_days: 2,
            last_checkin_date: dateOffset(-1, now)
          }
        : {
            user_id: CHILD_ID,
            grade: 1,
            points: 0,
            exp: 0,
            level: 1,
            study_minutes_total: 0,
            streak_days: 0,
            last_checkin_date: null
          }
    ],
    questions,
    records: [],
    wrong: [],
    checkins: [],
    rewardedTasks: [],
    userAchievements: [],
    growth: [],
    goals: [],
    timeLimits: [{ child_user_id: CHILD_ID, daily_limit_minutes: 60, warning_minutes: 45 }],
    evaluations: [],
    aiChats: [],
    challenge: { best: 0, plays: [] },
    favorites: [],
    settings: { role: 'child', grade: 1 },
    nextId: {
      record: 1,
      wrong: 1,
      chat: 1,
      goal: 1,
      evaluation: 1,
      question: questions.length + 1
    }
  }

  if (seedDemo) seedDemoHistory(state, now)
  return state
}

/** 预置少量「前几天」的示例数据，让成长曲线、周报一进来就有内容 */
function seedDemoHistory(state, now) {
  const find = (subject, grade, index = 0) =>
    state.questions.filter((item) => item.subject === subject && item.grade === grade)[index]

  const plan = [
    { daysAgo: -1, minutes: 9, items: [[find('math', 1, 0), true, '15'], [find('math', 1, 1), false, '6'], [find('chinese', 1, 1), true, '处处闻啼鸟']] },
    { daysAgo: -2, minutes: 5, items: [[find('english', 1, 0), true, 'apple'], [find('math', 1, 3), true, '8']] },
    { daysAgo: -4, minutes: 8, items: [[find('chinese', 1, 0), false, '白'], [find('math', 1, 5), true, '15']] }
  ]

  plan.forEach((day) => {
    const growth = { user_id: CHILD_ID, record_date: dateOffset(day.daysAgo, now), exp: 0, points: 0, minutes: day.minutes, correct: 0, total: 0 }
    day.items.forEach(([question, correct, answer], index) => {
      if (!question) return
      const id = state.nextId.record++
      state.records.push({
        id,
        user_id: CHILD_ID,
        question_id: question.id,
        subject: question.subject,
        grade: question.grade,
        answer,
        is_correct: correct,
        minutes: 1,
        created_at: isoAt(day.daysAgo, 17, 10 + index * 5, now)
      })
      growth.total += 1
      if (correct) {
        growth.correct += 1
        growth.exp += 5
        growth.points += 2
      } else {
        state.wrong.push({
          id: state.nextId.wrong++,
          user_id: CHILD_ID,
          question_id: question.id,
          wrong_answer: answer,
          wrong_count: 1,
          is_mastered: false,
          last_reviewed_at: null,
          created_at: isoAt(day.daysAgo, 17, 10 + index * 5, now)
        })
      }
    })
    state.growth.push(growth)
  })

  state.checkins.push(
    { user_id: CHILD_ID, date: dateOffset(-1, now), points: 6 },
    { user_id: CHILD_ID, date: dateOffset(-2, now), points: 5 }
  )
}

function round1(value) {
  return Math.round(value * 10) / 10
}

/**
 * 创建引擎。
 * @param {{read: () => string|null, write: (value: string) => void, remove?: () => void}} storage
 * @param {{now?: () => Date}} options
 */
export function createEngine(storage, options = {}) {
  const now = options.now || (() => new Date())
  // 游客模式带示例数据；真实账号从空白开始
  const seedDemo = options.seedDemo !== false
  let state = loadState()
  commit() // 首次访问就把初始数据写入本地，避免「0 KB」和刷新丢失
  // 示例数据本身已满足部分成就条件，初始化时先静默结算，避免第一次操作时弹窗打断
  unlockAchievements(CHILD_ID)
  commit()

  function loadState() {
    try {
      const raw = storage.read()
      if (!raw) return createState(now(), { seedDemo })
      const parsed = JSON.parse(raw)
      if (!parsed || parsed.version !== STATE_VERSION) return createState(now(), { seedDemo })
      return parsed
    } catch (error) {
      return createState(now(), { seedDemo })
    }
  }

  function commit() {
    let serialized = ''
    try {
      serialized = JSON.stringify(state)
      storage.write(serialized)
    } catch (error) {
      // 隐私模式 / 存储满时静默降级为内存态，不影响使用
    }
    if (serialized && typeof options.onCommit === 'function') {
      try {
        options.onCommit(serialized)
      } catch (error) {
        // 同步失败不阻断本地使用
      }
    }
  }

  function today() {
    return dateKey(now())
  }

  function dayOf(iso) {
    return dateKey(new Date(iso))
  }

  function getProfile(userId = CHILD_ID) {
    return state.profiles.find((item) => item.user_id === userId) || null
  }

  function ensureProfile(userId = CHILD_ID) {
    let profile = getProfile(userId)
    if (!profile) {
      profile = {
        user_id: userId,
        grade: state.settings.grade,
        points: 0,
        exp: 0,
        level: 1,
        study_minutes_total: 0,
        streak_days: 0,
        last_checkin_date: null
      }
      state.profiles.push(profile)
    }
    return profile
  }

  function findQuestion(questionId) {
    return state.questions.find((item) => item.id === Number(questionId)) || null
  }

  function addGrowth(userId, { exp = 0, points = 0, minutes = 0, correct = 0, total = 0 }) {
    const key = today()
    let record = state.growth.find((item) => item.user_id === userId && item.record_date === key)
    if (!record) {
      record = { user_id: userId, record_date: key, exp: 0, points: 0, minutes: 0, correct: 0, total: 0 }
      state.growth.push(record)
    }
    record.exp += exp
    record.points += points
    record.minutes += minutes
    record.correct += correct
    record.total += total
  }

  /** 某天累计学习时长（分钟），与成长曲线、报告口径保持一致 */
  function minutesOn(userId, dateString) {
    const record = state.growth.find((item) => item.user_id === userId && item.record_date === dateString)
    return record?.minutes || 0
  }

  function achievementStats(userId = CHILD_ID) {
    const profile = getProfile(userId)
    const records = state.records.filter((item) => item.user_id === userId)
    const wrong = state.wrong.filter((item) => item.user_id === userId)
    const evaluations = state.evaluations.filter(
      (item) => item.evaluator_id === userId || item.target_id === userId
    )
    return {
      first_practice: records.length,
      streak_checkin: profile?.streak_days || 0,
      correct_count: records.filter((item) => item.is_correct).length,
      master_wrong: wrong.filter((item) => item.is_mastered).length,
      total_minutes: profile?.study_minutes_total || 0,
      evaluations: evaluations.length,
      reach_level: levelInfo(profile?.exp || 0).level,
      checkin_count: state.checkins.filter((item) => item.user_id === userId).length,
      challenge_best: state.challenge.best || 0,
      ai_chats: state.aiChats.filter((item) => item.user_id === userId && item.role === 'assistant').length,
      favorites: state.favorites.length,
      subjects_learned: new Set(records.map((item) => item.subject)).size
    }
  }

  function unlockAchievements(userId = CHILD_ID) {
    const profile = ensureProfile(userId)
    const stats = achievementStats(userId)
    const unlocked = new Set(
      state.userAchievements.filter((item) => item.user_id === userId).map((item) => item.achievement_id)
    )
    const newly = []
    for (const achievement of ACHIEVEMENTS) {
      if (unlocked.has(achievement.id)) continue
      if ((stats[achievement.type] || 0) >= achievement.value) {
        state.userAchievements.push({
          user_id: userId,
          achievement_id: achievement.id,
          unlocked_at: now().toISOString()
        })
        profile.points += achievement.reward
        newly.push({
          id: achievement.id,
          name: achievement.name,
          icon: achievement.icon,
          description: achievement.description,
          points_reward: achievement.reward
        })
      }
    }
    if (newly.length) commit()
    return newly
  }

  function dailyTaskList(userId = CHILD_ID) {
    const profile = ensureProfile(userId)
    const grade = clamp(profile.grade || state.settings.grade, 1, 3)
    const templates = TASK_TEMPLATES[grade] || TASK_TEMPLATES[1]
    return templates.map((template, index) => {
      const target = template.target
      const done = state.records.filter(
        (item) => item.user_id === userId && item.subject === template.subject && dayOf(item.created_at) === today()
      ).length
      const taskId = grade * 100 + index + 1
      return {
        id: taskId,
        subject: template.subject,
        subject_label: { math: '数学', chinese: '语文', english: '英语' }[template.subject],
        title: template.title,
        description: template.description,
        target_count: target,
        points_reward: template.reward,
        completed_count: Math.min(done, target),
        is_completed: done >= target
      }
    })
  }

  /** 答题后把今日任务的进度结算掉，同一任务每天只发一次奖励 */
  function settleTasks(userId, subject) {
    const finished = []
    for (const task of dailyTaskList(userId)) {
      const key = `${task.id}:${today()}`
      if (task.subject !== subject || !task.is_completed) continue
      if (state.rewardedTasks.includes(key)) continue
      state.rewardedTasks.push(key)
      const profile = ensureProfile(userId)
      profile.points += task.points_reward
      profile.exp += 10
      addGrowth(userId, { points: task.points_reward, exp: 10 })
      finished.push({
        id: task.id,
        title: task.title,
        points_reward: task.points_reward,
        completed_count: task.completed_count,
        target_count: task.target_count
      })
    }
    return finished
  }

  function refreshLevel(profile) {
    const info = levelInfo(profile.exp)
    const levelUp = info.level > profile.level
    profile.level = info.level
    return { info, levelUp }
  }

  function serializeQuestion(question) {
    return {
      id: question.id,
      subject: question.subject,
      subject_label: { math: '数学', chinese: '语文', english: '英语' }[question.subject],
      grade: question.grade,
      content: question.content,
      options: question.options || [],
      ai_generated: question.source === 'ai'
    }
  }

  // ==================== 会话 ====================

  function getSession() {
    const user = state.users.find((item) => item.role === state.settings.role) || state.users[1]
    return {
      role: state.settings.role,
      grade: state.settings.grade,
      userId: user.id,
      username: state.settings.role === 'parent' ? '家长' : user.username,
      familyId: FAMILY_ID,
      demoSeeded: true
    }
  }

  function setRole(role) {
    state.settings.role = role === 'parent' ? 'parent' : 'child'
    commit()
    return getSession()
  }

  function setGrade(grade) {
    const value = clamp(grade, 1, 3)
    state.settings.grade = value
    const profile = ensureProfile(CHILD_ID)
    profile.grade = value
    commit()
    return getSession()
  }

  /** 把账号昵称同步成孩子的显示名（登录 / 注册后调用） */
  function setChildName(name) {
    const value = String(name ?? '').trim()
    if (!value) return { ok: false, username: '' }
    const child = state.users.find((item) => item.role === 'child')
    if (!child) return { ok: false, username: '' }
    child.username = value.slice(0, 20)
    commit()
    return { ok: true, username: child.username }
  }

  // ==================== 首页 / 学习 ====================

  function getDashboard(userId = CHILD_ID) {
    unlockAchievements(userId)
    const profile = ensureProfile(userId)
    const user = state.users.find((item) => item.id === userId)
    const records = state.records.filter((item) => item.user_id === userId && dayOf(item.created_at) === today())
    const correct = records.filter((item) => item.is_correct).length
    const tasks = dailyTaskList(userId)
    const info = levelInfo(profile.exp)
    const checkedIn = state.checkins.some((item) => item.user_id === userId && item.date === today())
    return {
      user_id: userId,
      role: user?.role || 'child',
      username: user?.username || '小童',
      grade: profile.grade,
      points: profile.points,
      exp: profile.exp,
      exp_in_level: info.inLevel,
      exp_next: info.need,
      exp_percent: info.percent,
      level: info.level,
      streak_days: profile.streak_days,
      total_study_minutes: profile.study_minutes_total,
      study_minutes: minutesOn(userId, today()),
      today_correct: correct,
      today_total: records.length,
      accuracy: percent(correct, records.length),
      wrong_unmastered: state.wrong.filter((item) => item.user_id === userId && !item.is_mastered).length,
      checkin_today: checkedIn,
      tasks_done: tasks.filter((item) => item.is_completed).length,
      tasks_total: tasks.length,
      daily_tip: getDailyTip(now()),
      greeting_name: user?.username || '小童'
    }
  }

  function getQuestions({ subject = 'math', grade = 1, limit = 5 } = {}) {
    const level = clamp(grade, 1, 3)
    const exact = state.questions.filter((item) => item.subject === subject && item.grade === level && item.source === 'bank')
    const lower = state.questions.filter((item) => item.subject === subject && item.grade < level && item.source === 'bank')
    const shuffle = (list) => [...list].sort(() => Math.random() - 0.5)
    let pool = shuffle(exact)
    if (pool.length < limit) pool = pool.concat(shuffle(lower))
    return pool.slice(0, limit).map(serializeQuestion)
  }

  function submitLearning({ user_id = CHILD_ID, question_id, answer, seconds = 40 } = {}) {
    const question = findQuestion(question_id)
    if (!question) throw new Error('题目不存在，请换一组练习试试')
    const profile = ensureProfile(user_id)
    const correct = isAnswerCorrect(answer, question)
    const minutes = Math.max(1, Math.round((Number(seconds) || 40) / 60))

    state.records.push({
      id: state.nextId.record++,
      user_id,
      question_id: question.id,
      subject: question.subject,
      grade: question.grade,
      answer: String(answer ?? ''),
      is_correct: correct,
      minutes,
      created_at: now().toISOString()
    })
    profile.study_minutes_total += minutes

    let pointsAdded = 0
    let expAdded = 0
    if (correct) {
      pointsAdded = 2
      expAdded = 5
      profile.points += pointsAdded
      profile.exp += expAdded
      const wrong = state.wrong.find((item) => item.user_id === user_id && item.question_id === question.id)
      if (wrong) {
        wrong.is_mastered = true
        wrong.last_reviewed_at = now().toISOString()
      }
    } else {
      const wrong = state.wrong.find((item) => item.user_id === user_id && item.question_id === question.id)
      if (wrong) {
        wrong.wrong_count += 1
        wrong.is_mastered = false
        wrong.wrong_answer = String(answer ?? '')
        wrong.last_reviewed_at = now().toISOString()
      } else {
        state.wrong.push({
          id: state.nextId.wrong++,
          user_id,
          question_id: question.id,
          wrong_answer: String(answer ?? ''),
          wrong_count: 1,
          is_mastered: false,
          last_reviewed_at: now().toISOString(),
          created_at: now().toISOString()
        })
      }
    }

    addGrowth(user_id, { exp: expAdded, points: pointsAdded, minutes, correct: correct ? 1 : 0, total: 1 })
    const completedTasks = settleTasks(user_id, question.subject)
    const { levelUp } = refreshLevel(profile)
    const newly = unlockAchievements(user_id)
    commit()

    return {
      is_correct: correct,
      answer: question.answer,
      explanation: question.explanation,
      points_added: pointsAdded,
      exp_added: expAdded,
      level: profile.level,
      level_up: levelUp,
      completed_tasks: completedTasks,
      new_achievements: newly,
      task_updates: dailyTaskList(user_id)
    }
  }

  function getDailyTasks(userId = CHILD_ID) {
    return dailyTaskList(userId)
  }

  function getCheckin(userId = CHILD_ID) {
    const profile = ensureProfile(userId)
    const checked = state.checkins.some((item) => item.user_id === userId && item.date === today())
    const calendar = []
    for (let i = 27; i >= 0; i--) {
      const key = dateOffset(-i, now())
      calendar.push({
        date: key,
        checked: state.checkins.some((item) => item.user_id === userId && item.date === key)
      })
    }
    return {
      streak_days: profile.streak_days,
      last_checkin_date: profile.last_checkin_date,
      checkin_today: checked,
      calendar
    }
  }

  function doCheckin(userId = CHILD_ID) {
    const profile = ensureProfile(userId)
    if (state.checkins.some((item) => item.user_id === userId && item.date === today())) {
      return {
        ok: true,
        already: true,
        message: '今天已经签过到啦，明天见！',
        streak_days: profile.streak_days,
        points_earned: 0,
        new_achievements: []
      }
    }
    const yesterday = dateOffset(-1, now())
    const continued = state.checkins.some((item) => item.user_id === userId && item.date === yesterday)
    profile.streak_days = continued ? profile.streak_days + 1 : 1
    const points = 5 + Math.min(profile.streak_days, 7)
    profile.points += points
    profile.last_checkin_date = today()
    state.checkins.push({ user_id: userId, date: today(), points })
    addGrowth(userId, { points })
    const newly = unlockAchievements(userId)
    commit()
    return {
      ok: true,
      already: false,
      message: `签到成功！连续 ${profile.streak_days} 天，积分 +${points}`,
      streak_days: profile.streak_days,
      points_earned: points,
      new_achievements: newly
    }
  }

  function getWrongBook(userId = CHILD_ID) {
    return state.wrong
      .filter((item) => item.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((item) => {
        const question = findQuestion(item.question_id)
        const subject = question?.subject || 'math'
        return {
          id: item.id,
          question_id: item.question_id,
          content: question?.content || '题目已删除',
          subject,
          subject_label: { math: '数学', chinese: '语文', english: '英语' }[subject],
          grade: question?.grade || 0,
          options: question?.options || [],
          wrong_answer: item.wrong_answer,
          answer: question?.answer || '',
          explanation: question?.explanation || '',
          wrong_count: item.wrong_count,
          is_mastered: item.is_mastered,
          created_at: formatTime(item.created_at)
        }
      })
  }

  function retryWrong({ wrong_id, answer } = {}) {
    const wrong = state.wrong.find((item) => item.id === Number(wrong_id))
    if (!wrong) throw new Error('这道错题已经不在错题本里了')
    const question = findQuestion(wrong.question_id)
    if (!question) throw new Error('题目已删除')
    const profile = ensureProfile(wrong.user_id)
    const correct = isAnswerCorrect(answer, question)
    if (correct) {
      wrong.is_mastered = true
      wrong.last_reviewed_at = now().toISOString()
      profile.points += 3
      profile.exp += 6
    } else {
      wrong.wrong_count += 1
      wrong.is_mastered = false
    }
    state.records.push({
      id: state.nextId.record++,
      user_id: wrong.user_id,
      question_id: question.id,
      subject: question.subject,
      grade: question.grade,
      answer: String(answer ?? ''),
      is_correct: correct,
      minutes: 1,
      created_at: now().toISOString()
    })
    profile.study_minutes_total += 1
    addGrowth(wrong.user_id, { exp: correct ? 6 : 0, points: correct ? 3 : 0, minutes: 1, correct: correct ? 1 : 0, total: 1 })
    refreshLevel(profile)
    const newly = unlockAchievements(wrong.user_id)
    commit()
    return {
      is_correct: correct,
      answer: question.answer,
      explanation: question.explanation,
      is_mastered: wrong.is_mastered,
      new_achievements: newly
    }
  }

  function markWrongMastered(wrongId) {
    const wrong = state.wrong.find((item) => item.id === Number(wrongId))
    if (!wrong) throw new Error('错题不存在')
    wrong.is_mastered = true
    wrong.last_reviewed_at = now().toISOString()
    const newly = unlockAchievements(wrong.user_id)
    commit()
    return { ok: true, new_achievements: newly }
  }

  function removeWrong(wrongId) {
    const index = state.wrong.findIndex((item) => item.id === Number(wrongId))
    if (index >= 0) state.wrong.splice(index, 1)
    commit()
    return { ok: true }
  }

  function generatePractice({ subject = 'math', grade = 1, count = 5 } = {}) {
    const level = clamp(grade, 1, 3)
    const total = clamp(count, 1, 10)
    if (subject === 'math') {
      const created = []
      for (let i = 0; i < total; i++) {
        const generated = generateMathQuestion(level)
        const question = {
          id: state.nextId.question++,
          subject: 'math',
          grade: level,
          content: generated.content,
          answer: generated.answer,
          explanation: generated.explanation,
          options: generated.options,
          accept: [],
          source: 'ai',
          created_at: now().toISOString()
        }
        state.questions.push(question)
        created.push(serializeQuestion(question))
      }
      pruneAiQuestions()
      commit()
      return { questions: created, demo: true, note: '已按年级难度生成口算题' }
    }

    const pool = state.questions.filter(
      (item) => item.subject === subject && item.source === 'bank' && item.grade <= level
    )
    const picks = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(total, Math.max(pool.length, 1)))
    return { questions: picks.map(serializeQuestion), demo: true, note: '已按年级抽取题库练习' }
  }

  /** 把服务端 / AI 生成的题目导入本地，分配本地 id，之后按本地流程判题 */
  function importQuestions(items = []) {
    const created = []
    for (const item of Array.isArray(items) ? items : []) {
      if (!item || !item.content || !item.answer) continue
      const subject = ['math', 'chinese', 'english'].includes(item.subject) ? item.subject : 'math'
      const question = {
        id: state.nextId.question++,
        subject,
        grade: clamp(item.grade || 1, 1, 6),
        content: String(item.content).slice(0, 500),
        answer: String(item.answer).slice(0, 100),
        explanation: String(item.explanation || '').slice(0, 1000),
        options: Array.isArray(item.options) ? item.options.map((option) => String(option)).slice(0, 6) : [],
        accept: [],
        source: 'ai',
        created_at: now().toISOString()
      }
      state.questions.push(question)
      created.push(serializeQuestion(question))
    }
    if (created.length) {
      pruneAiQuestions()
      commit()
    }
    return created
  }

  function pruneAiQuestions() {
    const aiQuestions = state.questions.filter((item) => item.source === 'ai')
    if (aiQuestions.length <= 120) return
    const keep = new Set(aiQuestions.slice(-100).map((item) => item.id))
    state.questions = state.questions.filter((item) => item.source !== 'ai' || keep.has(item.id))
  }

  // ==================== AI 小老师 ====================

  function chatWithAi({ user_id = CHILD_ID, grade = 1, message = '' } = {}) {
    const text = String(message || '').trim()
    if (!text) throw new Error('先写一句想问的话吧')
    const profile = ensureProfile(user_id)
    const level = clamp(grade || profile.grade, 1, 6)
    const answer = aiAnswer(text, { grade: level })
    state.aiChats.push({
      id: state.nextId.chat++,
      user_id,
      role: 'user',
      content: text,
      created_at: now().toISOString()
    })
    state.aiChats.push({
      id: state.nextId.chat++,
      user_id,
      role: 'assistant',
      content: answer,
      created_at: now().toISOString()
    })
    const newly = unlockAchievements(user_id)
    commit()
    return {
      answer,
      demo: true,
      ai_enabled: false,
      new_achievements: newly
    }
  }

  function getChatHistory(userId = CHILD_ID, limit = 30) {
    return state.aiChats
      .filter((item) => item.user_id === userId)
      .slice(-limit)
      .map((item) => ({ id: item.id, role: item.role, content: item.content, created_at: formatTime(item.created_at) }))
  }

  function clearChatHistory(userId = CHILD_ID) {
    state.aiChats = state.aiChats.filter((item) => item.user_id !== userId)
    commit()
    return { ok: true }
  }

  // ==================== 家长中心 ====================

  function childSnapshot(child, days = 7) {
    const profile = getProfile(child.id)
    const start = dateOffset(-(days - 1), now())
    const weekRecords = state.records.filter(
      (item) => item.user_id === child.id && dayOf(item.created_at) >= start
    )
    const todayRecords = weekRecords.filter((item) => dayOf(item.created_at) === today())
    const weekCorrect = weekRecords.filter((item) => item.is_correct).length
    const growthRows = state.growth.filter(
      (item) => item.user_id === child.id && item.record_date >= start
    )
    const weekMinutes = growthRows.reduce((sum, item) => sum + item.minutes, 0)
    const info = levelInfo(profile?.exp || 0)
    return {
      user_id: child.id,
      username: child.username,
      grade: profile?.grade || state.settings.grade,
      level: info.level,
      points: profile?.points || 0,
      streak_days: profile?.streak_days || 0,
      today_minutes: minutesOn(child.id, today()),
      today_correct: todayRecords.filter((item) => item.is_correct).length,
      today_total: todayRecords.length,
      week_minutes: weekMinutes,
      week_count: weekRecords.length,
      week_correct: weekCorrect,
      accuracy_week: percent(weekCorrect, weekRecords.length),
      wrong_count: state.wrong.filter((item) => item.user_id === child.id && !item.is_mastered).length,
      total_minutes: profile?.study_minutes_total || 0
    }
  }

  function getParentDashboard() {
    const children = state.users.filter((item) => item.role === 'child').map((child) => childSnapshot(child, 7))
    const goals = state.goals.filter((item) => !item.is_completed)
    const timeLimit = state.timeLimits[0] || { child_user_id: CHILD_ID, daily_limit_minutes: 60, warning_minutes: 45 }
    return {
      children,
      today_study_minutes: children.reduce((sum, item) => sum + item.today_minutes, 0),
      today_count: children.reduce((sum, item) => sum + item.today_total, 0),
      today_correct: children.reduce((sum, item) => sum + item.today_correct, 0),
      week_minutes: children.reduce((sum, item) => sum + item.week_minutes, 0),
      week_count: children.reduce((sum, item) => sum + item.week_count, 0),
      total_study_minutes: children.reduce((sum, item) => sum + item.total_minutes, 0),
      active_goals: goals.map((goal) => ({ ...goal })),
      time_limits: [timeLimit],
      recent_checkins: state.checkins
        .filter((item) => item.user_id === CHILD_ID)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 7)
        .map((item) => item.date)
    }
  }

  function setTimeLimit({ child_user_id = CHILD_ID, daily_limit_minutes = 60, warning_minutes = 45 } = {}) {
    const daily = clamp(daily_limit_minutes, 10, 240)
    const warning = clamp(warning_minutes, 5, daily - 5)
    let limit = state.timeLimits.find((item) => item.child_user_id === child_user_id)
    if (!limit) {
      limit = { child_user_id, daily_limit_minutes: daily, warning_minutes: warning }
      state.timeLimits.push(limit)
    } else {
      limit.daily_limit_minutes = daily
      limit.warning_minutes = warning
    }
    commit()
    return { ok: true, ...limit }
  }

  function createGoal({ title, target_minutes = 30, target_date = '', child_user_id = CHILD_ID, parent_user_id = PARENT_ID } = {}) {
    const text = String(title || '').trim()
    if (!text) throw new Error('给目标起个名字吧')
    const goal = {
      id: state.nextId.goal++,
      family_id: FAMILY_ID,
      child_user_id,
      parent_user_id,
      title: text,
      description: '',
      target_minutes: clamp(target_minutes, 5, 180),
      target_date: target_date || dateOffset(7, now()),
      is_completed: false,
      created_at: now().toISOString()
    }
    state.goals.push(goal)
    commit()
    return { ok: true, id: goal.id, message: '目标已设置，一起加油！' }
  }

  function listGoals({ child_id = CHILD_ID } = {}) {
    return state.goals
      .filter((item) => item.child_user_id === child_id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        target_minutes: item.target_minutes,
        target_date: item.target_date,
        is_completed: item.is_completed,
        created_at: formatTime(item.created_at)
      }))
  }

  function completeGoal(goalId) {
    const goal = state.goals.find((item) => item.id === Number(goalId))
    if (!goal) throw new Error('目标不存在')
    goal.is_completed = true
    commit()
    return { ok: true }
  }

  function deleteGoal(goalId) {
    const index = state.goals.findIndex((item) => item.id === Number(goalId))
    if (index >= 0) state.goals.splice(index, 1)
    commit()
    return { ok: true }
  }

  function reportFor(childId = CHILD_ID, days = 7) {
    const start = dateOffset(-(days - 1), now())
    const records = state.records.filter(
      (item) => item.user_id === childId && dayOf(item.created_at) >= start
    )
    const growth = state.growth.filter(
      (item) => item.user_id === childId && item.record_date >= start
    )
    const correct = records.filter((item) => item.is_correct).length
    const subjects = ['math', 'chinese', 'english']
    const bySubject = subjects.map((subject) => {
      const list = records.filter((item) => item.subject === subject)
      const subjectCorrect = list.filter((item) => item.is_correct).length
      return {
        subject,
        label: { math: '数学', chinese: '语文', english: '英语' }[subject],
        count: list.length,
        correct: subjectCorrect,
        accuracy: percent(subjectCorrect, list.length)
      }
    })
    const daily = []
    for (let i = days - 1; i >= 0; i--) {
      const key = dateOffset(-i, now())
      const dayGrowth = growth.find((item) => item.record_date === key)
      const dayRecords = records.filter((item) => dayOf(item.created_at) === key)
      const dayCorrect = dayRecords.filter((item) => item.is_correct).length
      daily.push({
        date: key,
        label: days <= 7 ? `周${weekdayLabel(key)}` : key.slice(5),
        count: dayRecords.length,
        minutes: dayGrowth?.minutes || 0,
        correct: dayCorrect,
        accuracy: percent(dayCorrect, dayRecords.length)
      })
    }
    const studyDays = new Set(records.map((item) => dayOf(item.created_at))).size
    const checkins = state.checkins.filter(
      (item) => item.user_id === childId && item.date >= start
    ).length
    const evaluations = state.evaluations.filter(
      (item) =>
        (item.evaluator_id === childId || item.target_id === childId) &&
        dayOf(item.created_at) >= start
    ).length
    const profile = getProfile(childId)
    const wrongCount = state.wrong.filter((item) => item.user_id === childId && !item.is_mastered).length

    return {
      period: days <= 7 ? 'week' : 'month',
      range_label: days <= 7 ? '最近 7 天' : '最近 30 天',
      total_records: records.length,
      total_minutes: growth.reduce((sum, item) => sum + item.minutes, 0),
      correct_count: correct,
      accuracy: percent(correct, records.length),
      exp_gain: growth.reduce((sum, item) => sum + item.exp, 0),
      points_gain: growth.reduce((sum, item) => sum + item.points, 0),
      study_days: studyDays,
      checkin_count: checkins,
      evaluation_count: evaluations,
      streak_days: profile?.streak_days || 0,
      wrong_unmastered: wrongCount,
      by_subject: bySubject,
      daily,
      suggestions: buildSuggestions({ records: records.length, accuracy: percent(correct, records.length), studyDays, wrongCount, bySubject, checkins })
    }
  }

  function buildSuggestions({ records, accuracy, studyDays, wrongCount, bySubject, checkins }) {
    const tips = []
    if (!records) tips.push('这几天还没有练习记录，可以先从 5 道口算开始，找找手感。')
    if (records && accuracy < 60) tips.push(`正确率 ${accuracy}%，建议放慢速度，先把题读懂再作答。`)
    if (accuracy >= 85) tips.push(`正确率 ${accuracy}%，非常稳！可以适当提高一点难度。`)
    if (studyDays < 3) tips.push('近一周学习天数偏少，比起一次学很久，每天 10 分钟更容易坚持。')
    if (wrongCount > 3) tips.push(`还有 ${wrongCount} 道错题没掌握，去错题本重做一遍效果最好。`)
    const weak = bySubject.filter((item) => item.count >= 2 && item.accuracy < 60)
    if (weak.length) tips.push(`${weak.map((item) => item.label).join('、')}正确率偏低，可以回到课本把这部分再看一遍。`)
    if (checkins >= 3) tips.push(`已经连续签到 ${checkins} 天，坚持得很棒，记得给孩子一点具体表扬。`)
    if (!tips.length) tips.push('整体状态不错，保持现在的节奏就好。')
    return tips
  }

  function getWeeklyReport(childId = CHILD_ID) {
    return reportFor(childId, 7)
  }

  function getMonthlyReport(childId = CHILD_ID) {
    return reportFor(childId, 30)
  }

  // ==================== 亲子互评 ====================

  function createEvaluation({ direction = 'parent_to_child', item = '', score = 5, comment = '' } = {}) {
    const value = clamp(score, 1, 5)
    const text = String(item || '').trim()
    if (!text) throw new Error('请选择评价项目')
    const isParentToChild = direction !== 'child_to_parent'
    const evaluatorId = isParentToChild ? PARENT_ID : CHILD_ID
    const targetId = isParentToChild ? CHILD_ID : PARENT_ID
    const evaluation = {
      id: state.nextId.evaluation++,
      family_id: FAMILY_ID,
      evaluator_id: evaluatorId,
      target_id: targetId,
      direction: isParentToChild ? 'parent_to_child' : 'child_to_parent',
      item: text,
      score: value,
      comment: String(comment || '').slice(0, 200),
      created_at: now().toISOString()
    }
    state.evaluations.push(evaluation)
    const newly = unlockAchievements(CHILD_ID)
    commit()
    return { ok: true, id: evaluation.id, new_achievements: newly }
  }

  function listEvaluations(limit = 50) {
    return state.evaluations
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
      .map((item) => {
        const evaluator = state.users.find((user) => user.id === item.evaluator_id)
        const target = state.users.find((user) => user.id === item.target_id)
        return {
          id: item.id,
          direction: item.direction,
          direction_label: item.direction === 'parent_to_child' ? '家长 → 孩子' : '孩子 → 家长',
          evaluator_name: evaluator?.username || '未知',
          target_name: target?.username || '未知',
          item: item.item,
          score: item.score,
          comment: item.comment,
          created_at: formatTime(item.created_at)
        }
      })
  }

  function getHarmony() {
    const rows = state.evaluations
    if (!rows.length) {
      return { harmony_score: 0, avg_scores: { parent_to_child: 0, child_to_parent: 0 }, count: 0 }
    }
    const p2c = rows.filter((item) => item.direction === 'parent_to_child').map((item) => item.score)
    const c2p = rows.filter((item) => item.direction === 'child_to_parent').map((item) => item.score)
    const avgP = p2c.length ? p2c.reduce((a, b) => a + b, 0) / p2c.length : 0
    const avgC = c2p.length ? c2p.reduce((a, b) => a + b, 0) / c2p.length : 0
    const average = [avgP, avgC].filter((value) => value > 0)
    const harmony = average.length ? round1((average.reduce((a, b) => a + b, 0) / average.length) * 20) : 0
    return {
      harmony_score: harmony,
      avg_scores: { parent_to_child: round1(avgP), child_to_parent: round1(avgC) },
      count: rows.length
    }
  }

  // ==================== 成长体系 ====================

  function getAchievements(userId = CHILD_ID) {
    unlockAchievements(userId)
    const stats = achievementStats(userId)
    const unlockedMap = new Map(
      state.userAchievements
        .filter((item) => item.user_id === userId)
        .map((item) => [item.achievement_id, item.unlocked_at])
    )
    return ACHIEVEMENTS.map((achievement) => {
      const current = Math.min(stats[achievement.type] || 0, achievement.value)
      return {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        condition_type: achievement.type,
        condition_value: achievement.value,
        points_reward: achievement.reward,
        unlocked: unlockedMap.has(achievement.id),
        unlocked_at: unlockedMap.has(achievement.id) ? formatTime(unlockedMap.get(achievement.id)) : null,
        progress: { current, target: achievement.value, percent: Math.round((current / achievement.value) * 100) }
      }
    })
  }

  function getGrowth(userId = CHILD_ID) {
    unlockAchievements(userId)
    const profile = ensureProfile(userId)
    const info = levelInfo(profile.exp)
    return {
      level: info.level,
      exp: profile.exp,
      exp_next: info.need,
      exp_in_level: info.inLevel,
      progress_pct: info.percent,
      points: profile.points,
      streak_days: profile.streak_days,
      total_minutes: profile.study_minutes_total,
      grade: profile.grade,
      challenge_best: state.challenge.best,
      achievements_unlocked: state.userAchievements.filter((item) => item.user_id === userId).length,
      achievements_total: ACHIEVEMENTS.length
    }
  }

  function getGrowthCurve(userId = CHILD_ID, days = 14) {
    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const key = dateOffset(-i, now())
      const growth = state.growth.find((item) => item.user_id === userId && item.record_date === key)
      result.push({
        date: key,
        minutes: growth?.minutes || 0,
        correct_count: growth?.correct || 0,
        total_count: growth?.total || 0,
        accuracy: growth ? percent(growth.correct, growth.total) : 0
      })
    }
    return result
  }

  function getHeatmap(userId = CHILD_ID, days = 28) {
    const cells = []
    for (let i = days - 1; i >= 0; i--) {
      const key = dateOffset(-i, now())
      const growth = state.growth.find((item) => item.user_id === userId && item.record_date === key)
      const minutes = growth?.minutes || 0
      let level = 0
      if (minutes > 0) level = 1
      if (minutes >= 10) level = 2
      if (minutes >= 20) level = 3
      if (minutes >= 30) level = 4
      cells.push({ date: key, minutes, level, day: Number(key.slice(-2)), isToday: key === today() })
    }
    return cells
  }

  function getLeaderboard() {
    return state.users
      .filter((user) => user.role === 'child')
      .map((user) => {
        const profile = getProfile(user.id)
        const info = levelInfo(profile?.exp || 0)
        return {
          user_id: user.id,
          username: user.username,
          role: user.role,
          level: info.level,
          exp: profile?.exp || 0,
          points: profile?.points || 0,
          total_minutes: profile?.study_minutes_total || 0
        }
      })
      .sort((a, b) => b.level - a.level || b.exp - a.exp || b.points - a.points)
      .map((item, index) => ({ ...item, rank: index + 1 }))
  }

  // ==================== 速算挑战 ====================

  function getChallengeStats() {
    return {
      best: state.challenge.best,
      plays: state.challenge.plays.slice(-8).reverse(),
      total_plays: state.challenge.plays.length
    }
  }

  function submitChallenge({ score = 0, correct = 0, total = 0, seconds = 60, user_id = CHILD_ID } = {}) {
    const profile = ensureProfile(user_id)
    const safeScore = Math.max(0, Math.round(Number(score) || 0))
    const isNewBest = safeScore > state.challenge.best
    state.challenge.best = Math.max(state.challenge.best, safeScore)
    state.challenge.plays.push({
      date: today(),
      score: safeScore,
      correct: Math.max(0, Number(correct) || 0),
      total: Math.max(0, Number(total) || 0),
      seconds: Math.max(0, Number(seconds) || 0)
    })
    if (state.challenge.plays.length > 30) state.challenge.plays = state.challenge.plays.slice(-30)
    const points = Math.max(0, Number(correct) || 0) * 2 + (isNewBest ? 5 : 0)
    const exp = Math.max(0, Number(correct) || 0) * 3
    profile.points += points
    profile.exp += exp
    addGrowth(user_id, {
      points,
      exp,
      minutes: Math.max(1, Math.round((Number(seconds) || 60) / 60)),
      correct: Math.max(0, Number(correct) || 0),
      total: Math.max(0, Number(total) || 0)
    })
    refreshLevel(profile)
    const newly = unlockAchievements(user_id)
    commit()
    return {
      best: state.challenge.best,
      is_new_best: isNewBest,
      points_earned: points,
      exp_earned: exp,
      new_achievements: newly
    }
  }

  // ==================== 知识卡片 ====================

  function listFavorites() {
    return state.favorites.map((item) => {
      const source =
        item.kind === 'word'
          ? WORDS.find((word) => word.id === item.id)
          : item.kind === 'poem'
            ? POEMS.find((poem) => poem.id === item.id)
            : IDIOMS.find((idiom) => idiom.id === item.id)
      return { ...item, data: source || null }
    })
  }

  function isFavorite(kind, id) {
    return state.favorites.some((item) => item.kind === kind && item.id === id)
  }

  function toggleFavorite(kind, id) {
    const index = state.favorites.findIndex((item) => item.kind === kind && item.id === id)
    let favorited
    if (index >= 0) {
      state.favorites.splice(index, 1)
      favorited = false
    } else {
      state.favorites.push({ kind, id, created_at: now().toISOString() })
      favorited = true
    }
    const newly = unlockAchievements(CHILD_ID)
    commit()
    return { favorited, total: state.favorites.length, new_achievements: newly }
  }

  // ==================== 数据管理 ====================

  function getStorageInfo() {
    const raw = storage.read() || ''
    return {
      bytes: raw.length,
      kb: Math.round((raw.length / 1024) * 10) / 10,
      records: state.records.length,
      wrong: state.wrong.length,
      chats: state.aiChats.length,
      createdAt: state.createdAt
    }
  }

  function exportData() {
    return JSON.stringify({ app: 'tongban', version: STATE_VERSION, exportedAt: now().toISOString(), state }, null, 2)
  }

  function importData(text) {
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (error) {
      throw new Error('文件内容不是有效的 JSON')
    }
    const incoming = parsed?.state || parsed
    if (!incoming || incoming.version !== STATE_VERSION || !Array.isArray(incoming.questions)) {
      throw new Error('数据版本不匹配，无法导入')
    }
    state = incoming
    commit()
    return { ok: true, records: state.records.length }
  }

  function resetAll() {
    state = createState(now(), { seedDemo })
    commit()
    return { ok: true }
  }

  return {
    // 会话
    getSession,
    setRole,
    setGrade,
    setChildName,
    // 学习
    getDashboard,
    getQuestions,
    submitLearning,
    getDailyTasks,
    getCheckin,
    doCheckin,
    getWrongBook,
    retryWrong,
    markWrongMastered,
    removeWrong,
    generatePractice,
    importQuestions,
    // AI
    chatWithAi,
    getChatHistory,
    clearChatHistory,
    // 家长
    getParentDashboard,
    setTimeLimit,
    createGoal,
    listGoals,
    completeGoal,
    deleteGoal,
    getWeeklyReport,
    getMonthlyReport,
    // 亲子
    createEvaluation,
    listEvaluations,
    getHarmony,
    // 成长
    getAchievements,
    getGrowth,
    getGrowthCurve,
    getHeatmap,
    getLeaderboard,
    // 挑战
    getChallengeStats,
    submitChallenge,
    // 卡片
    listFavorites,
    isFavorite,
    toggleFavorite,
    // 数据
    getStorageInfo,
    exportData,
    importData,
    resetAll
  }
}
