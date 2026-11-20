<template>
  <view class="page">
    <view class="page-head">
      <view>
        <text class="page-head-sub">{{ gradeLabel }} · 60 秒，看看能答对几道</text>
      </view>
      <text class="tag green">最高 {{ best }} 分</text>
    </view>

    <!-- ============ 准备开始 ============ -->
    <template v-if="phase === 'idle'">
      <view class="challenge-hero">
        <text class="ch-hero-emoji">⚡</text>
        <text class="ch-hero-title">60 秒口算冲刺</text>
        <text class="ch-hero-sub">答对 +10 分，连对还有加成；答错不扣分，但连击会中断。</text>
        <view class="ch-hero-stats">
          <view class="ch-hero-cell">
            <text class="ch-hero-num">{{ stats.best }}</text>
            <text class="ch-hero-label">历史最高</text>
          </view>
          <view class="ch-hero-cell">
            <text class="ch-hero-num">{{ stats.total_plays }}</text>
            <text class="ch-hero-label">挑战次数</text>
          </view>
          <view class="ch-hero-cell">
            <text class="ch-hero-num">{{ bestSingle }}</text>
            <text class="ch-hero-label">单次最多答对</text>
          </view>
        </view>
        <view class="btn btn-light btn-block" @click="start">开始挑战</view>
      </view>

      <view class="card">
        <view class="card-head tight">
          <text class="card-title">玩法说明</text>
        </view>
        <view class="rule-row">
          <text class="rule-index">1</text>
          <text class="rule-text">看题目，在 4 个选项里点出正确答案。</text>
        </view>
        <view class="rule-row">
          <text class="rule-index">2</text>
          <text class="rule-text">连续答对会累积连击，每道最多 +20 分。</text>
        </view>
        <view class="rule-row">
          <text class="rule-index">3</text>
          <text class="rule-text">时间结束自动结算，成绩计入积分和成长记录。</text>
        </view>
      </view>

      <view class="card">
        <view class="card-head tight">
          <text class="card-title">最近的挑战</text>
          <text class="card-sub">共 {{ stats.total_plays }} 次</text>
        </view>
        <view v-if="!stats.plays.length" class="empty">
          <text class="empty-emoji">🏁</text>
          <text>还没有挑战记录，来试一次吧</text>
        </view>
        <view v-for="(play, i) in stats.plays" :key="i" class="play-row">
          <text class="play-date">{{ play.date }}</text>
          <text class="play-score">{{ play.score }} 分</text>
          <text class="play-detail">答对 {{ play.correct }}/{{ play.total }}</text>
        </view>
      </view>
    </template>

    <!-- ============ 挑战中 ============ -->
    <template v-else-if="phase === 'playing'">
      <view class="timer-card">
        <view class="timer-top">
          <text class="timer-num">{{ remaining }}s</text>
          <view class="timer-side">
            <text class="timer-score">{{ score }} 分</text>
            <text class="timer-combo">连击 ×{{ combo }}</text>
          </view>
        </view>
        <view class="bar timer-bar">
          <view
            class="bar-fill"
            :class="{ green: remaining > 20, blue: remaining <= 20 }"
            :style="{ width: (remaining / 60) * 100 + '%' }"
          ></view>
        </view>
      </view>

      <view class="quiz-card" :class="flash">
        <text class="quiz-counter">第 {{ correct + wrong + 1 }} 题</text>
        <text class="quiz-content">{{ question ? question.content : '' }}</text>
        <view class="quiz-options">
          <view
            v-for="(option, i) in question ? question.options : []"
            :key="option"
            class="quiz-option"
            @click="choose(option)"
          >
            <text class="quiz-mark">{{ 'ABCD'[i] || i + 1 }}</text>
            <text class="quiz-text">{{ option }}</text>
          </view>
        </view>
      </view>

      <view class="quit-row">
        <text class="quit-link" @click="finish">提前结束</text>
      </view>
    </template>

    <!-- ============ 结算 ============ -->
    <template v-else>
      <view class="result-card">
        <text class="result-emoji">{{ score >= 100 ? '🏆' : score >= 60 ? '🎉' : '💪' }}</text>
        <text class="result-score">{{ score }}</text>
        <text class="result-unit">分</text>
        <text v-if="result?.is_new_best" class="new-best">🎊 新纪录！</text>
        <text class="result-praise">{{ praise }}</text>

        <view class="result-grid">
          <view class="res-cell">
            <text class="res-num">{{ correct }}</text>
            <text class="res-label">答对</text>
          </view>
          <view class="res-cell">
            <text class="res-num">{{ wrong }}</text>
            <text class="res-label">答错</text>
          </view>
          <view class="res-cell">
            <text class="res-num">{{ maxCombo }}</text>
            <text class="res-label">最高连击</text>
          </view>
          <view class="res-cell">
            <text class="res-num">+{{ result?.points_earned || 0 }}</text>
            <text class="res-label">积分</text>
          </view>
        </view>

        <view v-if="result?.new_achievements?.length" class="achieve-box">
          <text class="achieve-title">🏅 解锁新成就</text>
          <view v-for="item in result.new_achievements" :key="item.id" class="achieve-row">
            <text>{{ item.icon }}</text>
            <text class="achieve-name">{{ item.name }}</text>
          </view>
        </view>

        <view class="btn btn-primary btn-block" @click="start">再来一次</view>
        <view class="btn btn-ghost btn-block result-btn" @click="goHome">回首页</view>
      </view>

      <view class="card">
        <view class="card-head tight">
          <text class="card-title">挑战小提示</text>
        </view>
        <text class="muted small tip-line">· 先算整十，再算个位，速度会更快。</text>
        <text class="muted small tip-line">· 不确定的题不要停太久，先跳过答下一题。</text>
        <text class="muted small tip-line">· 每天练 3 分钟，口算会越来越稳。</text>
      </view>
    </template>

    <text class="safety-note">速算挑战的成绩会保存在本机浏览器里，不会上传。</text>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { api } from '../../services/api.js'
import { session } from '../../services/session.js'
import { generateMathQuestion } from '../../data/questions.js'
import { normalizeAnswer } from '../../utils/format.js'

const grades = ['一年级', '二年级', '三年级']
const phase = ref('idle')
const remaining = ref(60)
const question = ref(null)
const score = ref(0)
const combo = ref(0)
const maxCombo = ref(0)
const correct = ref(0)
const wrong = ref(0)
const flash = ref('')
const result = ref(null)
const stats = ref(api.getChallengeStats())

let timer = null
let nextQuestionTimer = null
let locked = false

const gradeLabel = computed(() => grades[(session.grade || 1) - 1] || '一年级')
const best = computed(() => stats.value.best || 0)
const bestSingle = computed(() =>
  (stats.value.plays || []).reduce((max, play) => Math.max(max, play.correct || 0), 0)
)
const praise = computed(() => {
  if (score.value >= 120) return '口算飞起来了，太厉害了！'
  if (score.value >= 80) return '反应很快，稳稳的高手！'
  if (score.value >= 40) return '不错哦，再练一次会更快。'
  return '没关系，慢一点也算得对，明天再来！'
})

function newQuestion() {
  question.value = generateMathQuestion(session.grade || 1)
}

function start() {
  clearTimers()
  phase.value = 'playing'
  remaining.value = 60
  score.value = 0
  combo.value = 0
  maxCombo.value = 0
  correct.value = 0
  wrong.value = 0
  flash.value = ''
  result.value = null
  locked = false
  newQuestion()
  timer = setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) {
      remaining.value = 0
      finish()
    }
  }, 1000)
}

function choose(option) {
  if (phase.value !== 'playing' || locked || !question.value) return
  locked = true
  const isCorrect = normalizeAnswer(option) === normalizeAnswer(question.value.answer)
  if (isCorrect) {
    combo.value += 1
    maxCombo.value = Math.max(maxCombo.value, combo.value)
    score.value += 10 + Math.min(combo.value, 5) * 2
    correct.value += 1
    flash.value = 'ok'
  } else {
    combo.value = 0
    wrong.value += 1
    flash.value = 'no'
  }
  nextQuestionTimer = setTimeout(() => {
    flash.value = ''
    locked = false
    if (phase.value === 'playing') newQuestion()
  }, 320)
}

function finish() {
  if (phase.value !== 'playing') return
  clearTimers()
  phase.value = 'done'
  try {
    result.value = api.submitChallenge({
      score: score.value,
      correct: correct.value,
      total: correct.value + wrong.value,
      seconds: Math.max(1, 60 - remaining.value)
    })
    stats.value = api.getChallengeStats()
  } catch (error) {
    result.value = { points_earned: 0 }
  }
}

function clearTimers() {
  if (timer) clearInterval(timer)
  if (nextQuestionTimer) clearTimeout(nextQuestionTimer)
  timer = null
  nextQuestionTimer = null
}

onUnload(clearTimers)

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style scoped>
.challenge-hero {
  margin-top: 22rpx;
  border-radius: 36rpx;
  padding: 34rpx 30rpx;
  color: #fff;
  background: linear-gradient(150deg, #7c6cff 0%, #a15cff 45%, #ff5f9e 100%);
  box-shadow: 0 20rpx 40rpx rgba(124, 108, 255, 0.28);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.ch-hero-emoji {
  font-size: 76rpx;
}

.ch-hero-title {
  font-size: 38rpx;
  font-weight: 800;
}

.ch-hero-sub {
  font-size: 22rpx;
  opacity: 0.9;
  text-align: center;
  line-height: 1.5;
  padding: 0 20rpx;
}

.ch-hero-stats {
  display: flex;
  width: 100%;
  gap: 10rpx;
  margin: 22rpx 0 26rpx;
}

.ch-hero-cell {
  flex: 1;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 20rpx;
  padding: 14rpx 4rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
}

.ch-hero-num {
  font-size: 30rpx;
  font-weight: 800;
}

.ch-hero-label {
  font-size: 18rpx;
  opacity: 0.9;
}

.btn-light {
  background: #fff;
  color: #7c5cff;
  width: 100%;
  box-shadow: 0 12rpx 24rpx rgba(0, 0, 0, 0.12);
}

.rule-row {
  display: flex;
  gap: 14rpx;
  padding: 12rpx 0;
  align-items: flex-start;
}

.rule-index {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #fff2e8;
  color: #d26532;
  font-size: 20rpx;
  font-weight: 700;
  text-align: center;
  line-height: 36rpx;
  flex-shrink: 0;
}

.rule-text {
  font-size: 24rpx;
  color: #6a5a4c;
  line-height: 1.5;
}

.play-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f7eee6;
  font-size: 23rpx;
}

.play-row:last-child {
  border-bottom: none;
}

.play-date {
  color: #a2917f;
  width: 180rpx;
}

.play-score {
  font-weight: 700;
  color: #ff6a45;
  flex: 1;
}

.play-detail {
  color: #a2917f;
}

.timer-card {
  margin-top: 22rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 24rpx 26rpx;
  box-shadow: 0 12rpx 30rpx rgba(120, 70, 30, 0.07);
}

.timer-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.timer-num {
  font-size: 64rpx;
  font-weight: 800;
  color: #7c5cff;
  line-height: 1;
}

.timer-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2rpx;
}

.timer-score {
  font-size: 32rpx;
  font-weight: 800;
  color: #2c241c;
}

.timer-combo {
  font-size: 21rpx;
  color: #e0663a;
}

.timer-bar {
  margin-top: 18rpx;
  height: 14rpx;
}

.quiz-card {
  margin-top: 22rpx;
  background: #fff;
  border-radius: 32rpx;
  padding: 34rpx 26rpx;
  box-shadow: 0 14rpx 34rpx rgba(120, 70, 30, 0.08);
  transition: background 0.2s ease;
}

.quiz-card.ok {
  background: #effcf4;
}

.quiz-card.no {
  background: #fff1f1;
}

.quiz-counter {
  font-size: 21rpx;
  color: #a2917f;
}

.quiz-content {
  display: block;
  font-size: 56rpx;
  font-weight: 800;
  text-align: center;
  margin: 24rpx 0 34rpx;
  letter-spacing: 2rpx;
}

.quiz-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.quiz-option {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 26rpx 20rpx;
  background: #faf6f2;
  border-radius: 22rpx;
  border: 2rpx solid transparent;
}

.quiz-option:active {
  background: #fff0e6;
  border-color: #ffb089;
}

.quiz-mark {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #fff;
  color: #b99a80;
  font-size: 20rpx;
  font-weight: 700;
  text-align: center;
  line-height: 40rpx;
  flex-shrink: 0;
}

.quiz-text {
  font-size: 34rpx;
  font-weight: 700;
  color: #2c241c;
}

.quit-row {
  text-align: center;
  margin-top: 20rpx;
}

.quit-link {
  font-size: 22rpx;
  color: #b3a394;
}

.result-card {
  margin-top: 22rpx;
  background: #fff;
  border-radius: 36rpx;
  padding: 34rpx 26rpx;
  box-shadow: 0 16rpx 38rpx rgba(120, 70, 30, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.result-emoji {
  font-size: 72rpx;
}

.result-score {
  font-size: 96rpx;
  font-weight: 800;
  color: #ff6a45;
  line-height: 1.1;
}

.result-unit {
  font-size: 24rpx;
  color: #a2917f;
}

.new-best {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #7c5cff;
  font-weight: 700;
}

.result-praise {
  font-size: 24rpx;
  color: #6a5a4c;
  margin: 10rpx 0 22rpx;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10rpx;
  width: 100%;
}

.res-cell {
  background: #fff8f1;
  border-radius: 18rpx;
  padding: 16rpx 4rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
}

.res-num {
  font-size: 30rpx;
  font-weight: 700;
  color: #ff6a45;
}

.res-label {
  font-size: 18rpx;
  color: #a2917f;
}

.achieve-box {
  width: 100%;
  margin-top: 18rpx;
  background: #fff7ea;
  border-radius: 20rpx;
  padding: 18rpx 20rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.achieve-title {
  font-size: 23rpx;
  font-weight: 700;
  color: #c47a4a;
}

.achieve-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 23rpx;
}

.achieve-name {
  color: #5a4a3c;
}

.result-btn {
  margin-top: 14rpx;
}

.tip-line {
  display: block;
  line-height: 1.8;
}

/* ===== v2 视觉打磨 ===== */
.challenge-hero { border-radius: 42rpx; box-shadow: 0 28rpx 58rpx -24rpx rgba(124, 92, 255, 0.68); }
.timer-card { border-radius: 30rpx; border: 1rpx solid #fff1e7; }
.quiz-card { border-radius: 36rpx; border: 1rpx solid #fff1e7; }
.quiz-option { border-radius: 24rpx; border: 1rpx solid #f3e7db; background: #fbf7f2; }
.result-card { border-radius: 42rpx; border: 1rpx solid #fff1e7; }
.res-cell { background: linear-gradient(160deg, #fffaf4, #fff0e3); border-radius: 20rpx; }
.play-row { border-color: #f8efe7; }

/* ===== v2.1 计时条配色 ===== */
.timer-bar .bar-fill { background: linear-gradient(90deg, #a78bfa, #8b5cf6 55%, #ff5f9e); }
.timer-bar .bar-fill.blue { background: linear-gradient(90deg, #ffb020, #ff5f3c); }
</style>
