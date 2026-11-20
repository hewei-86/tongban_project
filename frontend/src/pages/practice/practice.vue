<template>
  <view class="page">
    <view class="page-head">
      <view>
        <text class="page-head-sub">{{ gradeLabel }} · 答错的题会自动进错题本</text>
      </view>
      <view class="btn btn-soft btn-sm" @click="loadQuestions(true)">🤖 AI 出题</view>
    </view>

    <view class="card flush">
      <view class="seg">
        <view
          v-for="item in subjects"
          :key="item.key"
          class="seg-item"
          :class="{ active: subject === item.key }"
          @click="changeSubject(item.key)"
        >
          {{ item.icon }} {{ item.label }}
        </view>
      </view>
      <view class="practice-meta">
        <picker :range="grades" :value="grade - 1" @change="onGradeChange">
          <view class="chip">{{ gradeLabel }} ▾</view>
        </picker>
        <text class="muted small">共 {{ questions.length || 5 }} 题 · 已答 {{ answeredCount }} 题</text>
        <text class="muted small">⏱ {{ timerText }}</text>
      </view>
    </view>

    <view v-if="loading" class="card">
      <view class="empty">
        <text class="empty-emoji">✏️</text>
        <text>题目准备中…</text>
      </view>
    </view>

    <!-- ============ 答题中 ============ -->
    <view v-else-if="!finished && current" class="card question-card">
      <view class="q-top">
        <text class="q-index">第 {{ index + 1 }} / {{ questions.length }} 题</text>
        <view class="row">
          <text v-if="current.ai_generated" class="tag blue">AI 生成</text>
          <text class="tag">{{ current.grade }}年级</text>
        </view>
      </view>

      <view class="dots">
        <view
          v-for="(item, i) in questions"
          :key="item.id"
          class="dot"
          :class="{ done: i < index, now: i === index, ok: answersLog[i]?.correct, bad: answersLog[i] && !answersLog[i].correct }"
        ></view>
      </view>

      <text class="q-content">{{ current.content }}</text>

      <view v-if="current.options && current.options.length" class="options">
        <view
          v-for="(option, i) in current.options"
          :key="option"
          class="option"
          :class="{
            selected: selected === option,
            correct: result && option === result.answer,
            wrong: result && selected === option && !result.is_correct
          }"
          @click="selectOption(option)"
        >
          <text class="option-mark">{{ 'ABCD'[i] || i + 1 }}</text>
          <text class="option-text">{{ option }}</text>
        </view>
      </view>
      <input
        v-else
        v-model="answerText"
        class="input"
        :disabled="Boolean(result)"
        placeholder="在这里写下你的答案"
        confirm-type="done"
        @confirm="submit"
      />

      <view v-if="result" class="feedback" :class="result.is_correct ? 'ok' : 'no'">
        <text class="fb-title">{{ result.is_correct ? '答对啦！🎉' : '再想一想～' }}</text>
        <text v-if="!result.is_correct" class="fb-line">正确答案：{{ result.answer }}</text>
        <text class="fb-line">{{ result.explanation }}</text>
        <text v-if="result.points_added" class="fb-line">积分 +{{ result.points_added }} · EXP +{{ result.exp_added }}</text>
        <text v-if="result.level_up" class="fb-line">🚀 升级啦，现在是 Lv.{{ result.level }}</text>
        <text v-for="task in result.completed_tasks" :key="task.id" class="fb-line">
          🎯 完成任务「{{ task.title }}」，积分 +{{ task.points_reward }}
        </text>
      </view>

      <view class="q-actions">
        <view v-if="!result" class="btn btn-primary btn-block" @click="submit">提交答案</view>
        <view v-else class="btn btn-primary btn-block" @click="next">
          {{ isLast ? '查看本次成绩' : '下一题' }}
        </view>
      </view>

      <view class="q-helper" @click="askAi">
        <text>这题不会？问问 AI 小老师 ›</text>
      </view>
    </view>

    <!-- ============ 本次成绩 ============ -->
    <view v-else-if="finished" class="card summary">
      <view class="summary-head">
        <text class="summary-emoji">{{ summaryEmoji }}</text>
        <text class="summary-title">{{ summaryTitle }}</text>
        <text class="muted small">{{ subjectLabel }} · {{ gradeLabel }} · 用时 {{ timerText }}</text>
      </view>

      <view class="summary-grid">
        <view class="sum-cell">
          <text class="sum-num">{{ answeredCount }}</text>
          <text class="sum-label">完成题目</text>
        </view>
        <view class="sum-cell">
          <text class="sum-num">{{ correctCount }}</text>
          <text class="sum-label">答对</text>
        </view>
        <view class="sum-cell">
          <text class="sum-num">{{ accuracy }}%</text>
          <text class="sum-label">正确率</text>
        </view>
        <view class="sum-cell">
          <text class="sum-num">+{{ earnedPoints }}</text>
          <text class="sum-label">获得积分</text>
        </view>
      </view>

      <view v-if="wrongList.length" class="review">
        <text class="field-label">需要再看一眼的题</text>
        <view v-for="item in wrongList" :key="item.id" class="review-row">
          <text class="review-q">{{ item.content }}</text>
          <text class="review-a">正确答案：{{ item.answer }}</text>
          <text class="review-e">{{ item.explanation }}</text>
        </view>
      </view>
      <view v-else class="feedback ok">
        <text class="fb-title">全部答对，太厉害了！🌟</text>
        <text class="fb-line">可以试试提高年级，或者去「速算挑战」冲个高分。</text>
      </view>

      <view class="btn btn-primary btn-block" @click="loadQuestions(false)">再来一组</view>
      <view class="btn btn-ghost btn-block summary-btn" @click="goChallenge">⚡ 去速算挑战</view>
      <view class="summary-links">
        <text class="card-link" @click="goHome">回首页</text>
        <text class="card-link" @click="goWrongBook">看错题本</text>
      </view>
    </view>

    <TabBar active="practice" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import TabBar from '../../components/TabBar.vue'
import { api, toast } from '../../services/api.js'
import { session, switchGrade } from '../../services/session.js'
import { CHILD_ID } from '../../services/engineCore.js'

const subjects = [
  { key: 'math', label: '数学', icon: '➗' },
  { key: 'chinese', label: '语文', icon: '📖' },
  { key: 'english', label: '英语', icon: '🔤' }
]
const grades = ['一年级', '二年级', '三年级']
const subjectLabels = { math: '数学', chinese: '语文', english: '英语' }

const subject = ref('math')
const grade = ref(session.grade || 1)
const questions = ref([])
const index = ref(0)
const selected = ref('')
const answerText = ref('')
const result = ref(null)
const loading = ref(false)
const finished = ref(false)
const answersLog = ref([])
const correctCount = ref(0)
const earnedPoints = ref(0)
const seconds = ref(0)
let timer = null

const subjectLabel = computed(() => subjectLabels[subject.value] || '数学')
const gradeLabel = computed(() => grades[grade.value - 1] || '一年级')
const current = computed(() => questions.value[index.value] || null)
const isLast = computed(() => index.value >= questions.value.length - 1)
const answeredCount = computed(() => answersLog.value.length)
const accuracy = computed(() =>
  answeredCount.value ? Math.round((correctCount.value / answeredCount.value) * 100) : 0
)
const timerText = computed(() => {
  const minute = Math.floor(seconds.value / 60)
  const rest = seconds.value % 60
  return `${String(minute).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
})
const summaryEmoji = computed(() => (accuracy.value >= 80 ? '🎉' : accuracy.value >= 60 ? '💪' : '🌱'))
const summaryTitle = computed(() =>
  accuracy.value >= 80 ? '这次完成得很棒！' : accuracy.value >= 60 ? '进步中，继续加油' : '没关系，我们慢慢来'
)
const wrongList = computed(() =>
  answersLog.value
    .filter((item) => !item.correct)
    .map((item) => item.question)
)

function startTimer() {
  stopTimer()
  seconds.value = 0
  timer = setInterval(() => {
    seconds.value += 1
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function resetPerQuestion() {
  selected.value = ''
  answerText.value = ''
  result.value = null
  startTimer()
}

function loadQuestions(generated = false) {
  loading.value = true
  stopTimer()
  try {
    const payload = generated
      ? api.generatePractice({ subject: subject.value, grade: grade.value, count: 5 })
      : { questions: api.getQuestions({ subject: subject.value, grade: grade.value, limit: 5 }) }
    questions.value = payload.questions || []
    if (!questions.value.length) {
      toast('暂时没有这个年级的题目，换个年级试试')
    } else if (generated) {
      toast(payload.note || '已生成新题目')
    }
    index.value = 0
    finished.value = false
    answersLog.value = []
    correctCount.value = 0
    earnedPoints.value = 0
    resetPerQuestion()
  } catch (error) {
    toast(error?.message || '题目加载失败')
  } finally {
    loading.value = false
  }
}

onLoad((options = {}) => {
  if (options.subject && subjectLabels[options.subject]) subject.value = options.subject
  if (options.grade) grade.value = Number(options.grade) || grade.value
  loadQuestions(false)
})

onUnload(stopTimer)

function changeSubject(key) {
  if (key === subject.value) return
  subject.value = key
  loadQuestions(false)
}

function onGradeChange(event) {
  const value = Number(event.detail.value) + 1
  grade.value = value
  switchGrade(value)
  loadQuestions(false)
}

function selectOption(option) {
  if (result.value) return
  selected.value = option
}

function submit() {
  if (result.value || !current.value) return
  const value = current.value.options && current.value.options.length ? selected.value : answerText.value
  if (!String(value || '').trim()) {
    toast('先选一个答案或写下来吧')
    return
  }
  try {
    const response = api.submitLearning({
      user_id: CHILD_ID,
      question_id: current.value.id,
      answer: value,
      seconds: Math.max(5, seconds.value)
    })
    result.value = response
    answersLog.value[index.value] = {
      correct: response.is_correct,
      question: {
        id: current.value.id,
        content: current.value.content,
        answer: response.answer,
        explanation: response.explanation
      }
    }
    if (response.is_correct) {
      correctCount.value += 1
      earnedPoints.value += response.points_added
    }
    if (response.new_achievements?.length) {
      const text = response.new_achievements.map((item) => `${item.icon} ${item.name}`).join('\n')
      setTimeout(() => uni.showModal({ title: '🏅 解锁新成就', content: text, showCancel: false }), 400)
    }
  } catch (error) {
    toast(error?.message || '提交失败')
  }
}

function next() {
  if (isLast.value) {
    finished.value = true
    stopTimer()
    return
  }
  index.value += 1
  resetPerQuestion()
}

function askAi() {
  const content = current.value?.content || '这道题怎么算？'
  uni.navigateTo({ url: `/pages/ai/ai?q=${encodeURIComponent(content)}` })
}

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' })
}

function goChallenge() {
  uni.navigateTo({ url: '/pages/challenge/challenge' })
}

function goWrongBook() {
  uni.navigateTo({ url: '/pages/wrongbook/wrongbook' })
}
</script>

<style scoped>
.practice-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: 16rpx;
}

.question-card {
  padding: 30rpx 26rpx;
}

.q-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.q-index {
  font-size: 22rpx;
  font-weight: 700;
  color: #d26532;
  background: #fff4ea;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
}

.dots {
  display: flex;
  gap: 8rpx;
  margin: 18rpx 0 22rpx;
}

.dot {
  flex: 1;
  height: 8rpx;
  border-radius: 999rpx;
  background: #f4ece4;
}

.dot.done {
  background: #ffc9a8;
}

.dot.now {
  background: #ff8a5c;
}

.dot.ok {
  background: #45c08a;
}

.dot.bad {
  background: #ff8a8a;
}

.q-content {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.5;
  margin-bottom: 24rpx;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.option {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 22rpx;
  border-radius: 20rpx;
  background: #faf6f2;
  border: 2rpx solid transparent;
}

.option:active {
  transform: scale(0.99);
}

.option-mark {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #fff;
  color: #b99a80;
  font-size: 22rpx;
  font-weight: 700;
  text-align: center;
  line-height: 44rpx;
  flex-shrink: 0;
}

.option-text {
  font-size: 29rpx;
  color: #3d342c;
}

.option.selected {
  background: #fff0e6;
  border-color: #ffb089;
}

.option.selected .option-mark {
  background: #ff7a4d;
  color: #fff;
}

.option.correct {
  background: #e9f9f1;
  border-color: #7fd6ac;
}

.option.correct .option-mark {
  background: #1f9d68;
  color: #fff;
}

.option.wrong {
  background: #ffecec;
  border-color: #ffb3b3;
}

.option.wrong .option-mark {
  background: #e25b4a;
  color: #fff;
}

.feedback {
  margin-top: 22rpx;
  padding: 22rpx 24rpx;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.feedback.ok {
  background: #e9f9f1;
}

.feedback.no {
  background: #fff1ed;
}

.fb-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #2c241c;
}

.fb-line {
  font-size: 24rpx;
  color: #6a5a4c;
  line-height: 1.6;
}

.q-actions {
  margin-top: 24rpx;
}

.q-helper {
  margin-top: 18rpx;
  text-align: center;
  font-size: 23rpx;
  color: #a2917f;
}

.summary-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 0 22rpx;
}

.summary-emoji {
  font-size: 72rpx;
}

.summary-title {
  font-size: 34rpx;
  font-weight: 800;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10rpx;
}

.sum-cell {
  background: #fff8f1;
  border-radius: 18rpx;
  padding: 18rpx 6rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.sum-num {
  font-size: 32rpx;
  font-weight: 800;
  color: #ff6a45;
}

.sum-label {
  font-size: 19rpx;
  color: #a2917f;
}

.review {
  margin-top: 10rpx;
}

.review-row {
  background: #fffaf5;
  border-radius: 18rpx;
  padding: 18rpx 20rpx;
  margin-bottom: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.review-q {
  font-size: 26rpx;
  font-weight: 600;
}

.review-a {
  font-size: 23rpx;
  color: #1f9d68;
}

.review-e {
  font-size: 22rpx;
  color: #a2917f;
  line-height: 1.5;
}

.summary-btn {
  margin-top: 16rpx;
}

.summary-links {
  display: flex;
  justify-content: center;
  gap: 24rpx;
  margin-top: 20rpx;
}
</style>
