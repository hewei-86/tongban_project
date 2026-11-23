<template>
  <view class="page pk-page">
    <view class="pk-hero">
      <view class="pk-hero-top">
        <view class="pk-logo">⚔️</view>
        <view class="pk-hero-main">
          <text class="pk-title">真人 PK</text>
          <text class="pk-sub">1v1 随机匹配 · 5 题定胜负 · 答得又快又准</text>
        </view>
      </view>
      <view class="pk-rules">
        <text>每题 15 秒</text>
        <text>答对 100 分 + 速度奖励</text>
        <text>平局也算平局</text>
      </view>
    </view>

    <view v-if="!isRemote" class="card pk-notice">
      <text class="notice-title">真人 PK 需要登录服务器版</text>
      <text class="notice-text">本地演示版没有后端匹配，请打开服务器地址登录后再来。</text>
    </view>

    <template v-else>
      <view v-if="phase === 'idle'" class="card pk-card">
        <text class="section-title">准备好了吗？</text>
        <text class="section-sub">系统会为你匹配一位同龄对手，双方同时答题。</text>
        <view class="pk-start" @click="start">开始匹配</view>
        <text class="pk-tip">匹配中请保持页面打开；离开页面会取消匹配。</text>
        <text v-if="error" class="pk-error">{{ error }}</text>
      </view>

      <view v-if="phase === 'waiting'" class="card pk-card center">
        <view class="pk-spinner"></view>
        <text class="section-title">正在匹配对手…</text>
        <text class="section-sub">通常几秒内就能匹配到，请稍等</text>
        <view class="pk-cancel" @click="cancel">取消匹配</view>
      </view>

      <view v-if="phase === 'playing'" class="pk-game">
        <view class="pk-score-bar">
          <view class="pk-player me">
            <text class="pk-player-name">我</text>
            <text class="pk-player-score">{{ myScore }}</text>
          </view>
          <view class="pk-vs">
            <text class="pk-progress">{{ index + 1 }}/{{ total }}</text>
            <text class="pk-time" :class="{ urgent: timeLeft <= 5 }">{{ timeLeft }}s</text>
          </view>
          <view class="pk-player">
            <text class="pk-player-name">{{ opponent?.nickname || '对手' }}</text>
            <text class="pk-player-score">{{ opponentScore }}</text>
          </view>
        </view>

        <view class="card pk-question">
          <text class="pk-subject">{{ subjectLabel }} · {{ question?.grade }} 年级</text>
          <text class="pk-content">{{ question?.content }}</text>
          <view class="pk-options">
            <view
              v-for="option in question?.options || []"
              :key="option"
              class="pk-option"
              :class="{
                selected: selected === option,
                correct: roundResult && option === roundResult.answer,
                wrong: roundResult && selected === option && option !== roundResult.answer
              }"
              @click="answer(option)"
            >
              <text class="option-letter">{{ optionLetter(option) }}</text>
              <text class="option-text">{{ option }}</text>
            </view>
          </view>

          <view v-if="roundResult" class="pk-round">
            <text class="round-title">正确答案：{{ roundResult.answer }}</text>
            <text class="round-text">{{ roundResult.explanation }}</text>
            <text class="round-wait">下一题马上开始…</text>
          </view>
          <text v-else-if="selected" class="pk-waiting">已提交，等待对手…</text>
        </view>
      </view>

      <view v-if="phase === 'finished'" class="card pk-card result-card">
        <text class="result-emoji">{{ resultEmoji }}</text>
        <text class="result-title">{{ resultTitle }}</text>
        <view class="result-score">
          <view class="result-side">
            <text class="result-label">我</text>
            <text class="result-num">{{ myScore }}</text>
          </view>
          <text class="result-colon">:</text>
          <view class="result-side">
            <text class="result-label">{{ opponent?.nickname || '对手' }}</text>
            <text class="result-num">{{ opponentScore }}</text>
          </view>
        </view>
        <view class="pk-actions">
          <view class="pk-start" @click="restart">再来一局</view>
          <view class="pk-cancel" @click="goBack">返回首页</view>
        </view>
      </view>

      <text v-if="phase === 'playing'" class="pk-foot">服务端判分，断线判负；请公平比赛。</text>
    </template>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { API_BASE, IS_REMOTE } from '../../config.js'
import { getStoredUser, getToken } from '../../services/remoteAuth.js'

const isRemote = IS_REMOTE
const phase = ref('idle')
const error = ref('')
const question = ref(null)
const index = ref(0)
const total = ref(5)
const timeLeft = ref(15)
const selected = ref('')
const scores = ref({})
const opponent = ref(null)
const roundResult = ref(null)
const final = ref(null)

let ws = null
let timer = null
let deadline = 0
const me = getStoredUser()

const myId = computed(() => String(me?.id || ''))
const myScore = computed(() => scores.value[myId.value] ?? 0)
const opponentScore = computed(() => {
  const other = Object.keys(scores.value).find((key) => key !== myId.value)
  return other ? scores.value[other] : 0
})
const subjectLabel = computed(() => ({ math: '数学', chinese: '语文', english: '英语' }[question.value?.subject] || '练习'))
const resultTitle = computed(() => {
  if (!final.value) return ''
  if (final.value.draw) return '平局！你们不相上下'
  return final.value.winner_id === Number(myId.value) ? '你赢了！' : '差一点点，再试一次'
})
const resultEmoji = computed(() => {
  if (!final.value) return '⚔️'
  if (final.value.draw) return '🤝'
  return final.value.winner_id === Number(myId.value) ? '🏆' : '💪'
})

function wsUrl() {
  const origin = API_BASE || window.location.origin
  const url = new URL(origin)
  url.protocol = origin.startsWith('https') ? 'wss:' : 'ws:'
  url.pathname = '/ws/pk'
  url.search = `?token=${encodeURIComponent(getToken())}`
  return url.toString()
}

function start() {
  if (!isRemote) {
    uni.showToast({ title: '请使用服务器版', icon: 'none' })
    return
  }
  if (!getToken()) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  cancel()
  error.value = ''
  final.value = null
  scores.value = {}
  opponent.value = null
  roundResult.value = null
  selected.value = ''
  phase.value = 'waiting'
  try {
    ws = new WebSocket(wsUrl())
  } catch (e) {
    error.value = '无法连接服务器，请稍后再试'
    phase.value = 'idle'
    return
  }
  ws.onopen = () => ws.send(JSON.stringify({ type: 'join' }))
  ws.onmessage = (event) => {
    let data
    try {
      data = JSON.parse(event.data)
    } catch (e) {
      return
    }
    handle(data)
  }
  ws.onerror = () => {
    error.value = '连接失败，请检查网络'
  }
  ws.onclose = () => {
    stopTimer()
    if (phase.value === 'playing' || phase.value === 'waiting') {
      if (phase.value === 'waiting') error.value = '匹配已断开，请重试'
    }
  }
}

function handle(data) {
  if (data.type === 'waiting') {
    phase.value = 'waiting'
    return
  }
  if (data.type === 'matched') {
    phase.value = 'playing'
    total.value = data.total || 5
    scores.value = { [myId.value]: 0, [String(data.opponent?.id)]: 0 }
    return
  }
  if (data.type === 'opponent') {
    opponent.value = data.opponent
    return
  }
  if (data.type === 'question') {
    phase.value = 'playing'
    question.value = data.question
    index.value = data.index
    total.value = data.total
    selected.value = ''
    roundResult.value = null
    timeLeft.value = data.seconds || 15
    deadline = Date.now() + (data.seconds || 15) * 1000
    startTimer()
    return
  }
  if (data.type === 'round_result') {
    roundResult.value = data
    scores.value = data.scores || scores.value
    stopTimer()
    return
  }
  if (data.type === 'finished') {
    final.value = data
    scores.value = data.scores || scores.value
    phase.value = 'finished'
    stopTimer()
    setTimeout(closeSocket, 300)
    return
  }
  if (data.type === 'error') {
    error.value = data.message || '匹配失败'
    phase.value = 'idle'
  }
}

function answer(option) {
  if (phase.value !== 'playing' || selected.value || roundResult.value) return
  selected.value = option
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'answer', index: index.value, answer: option }))
  }
}

function startTimer() {
  stopTimer()
  timer = setInterval(() => {
    timeLeft.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    if (timeLeft.value <= 0) stopTimer()
  }, 200)
}

function stopTimer() {
  if (timer) clearInterval(timer)
  timer = null
}

function cancel() {
  closeSocket()
  stopTimer()
  phase.value = 'idle'
}

function closeSocket() {
  if (ws) {
    ws.onclose = null
    ws.onerror = null
    ws.onmessage = null
    try {
      ws.close()
    } catch (e) {
      // ignore
    }
    ws = null
  }
}

function restart() {
  closeSocket()
  start()
}

function goBack() {
  closeSocket()
  uni.reLaunch({ url: '/pages/index/index' })
}

function optionLetter(option) {
  const options = question.value?.options || []
  return String.fromCharCode(65 + options.indexOf(option))
}

onUnload(() => {
  closeSocket()
  stopTimer()
})
</script>

<style scoped>
.pk-page { padding-bottom: 40rpx; }
.pk-hero {
  border-radius: 36rpx;
  padding: 28rpx;
  background: linear-gradient(140deg, #eef2ff 0%, #f4eaff 55%, #ffeef3 100%);
  border: 1rpx solid #fff;
  box-shadow: 0 18rpx 40rpx -24rpx rgba(90, 70, 180, 0.35);
}
.pk-hero-top { display: flex; align-items: center; gap: 18rpx; }
.pk-logo { width: 82rpx; height: 82rpx; border-radius: 26rpx; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 38rpx; }
.pk-hero-main { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.pk-title { font-size: 36rpx; font-weight: 800; color: #40356b; }
.pk-sub { font-size: 21rpx; color: #7b6f9d; line-height: 1.4; }
.pk-rules { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 20rpx; }
.pk-rules text { font-size: 20rpx; color: #61558a; background: rgba(255, 255, 255, 0.7); border-radius: 999rpx; padding: 7rpx 13rpx; }
.pk-notice { margin-top: 22rpx; }
.notice-title { font-size: 26rpx; font-weight: 800; }
.notice-text { display: block; font-size: 22rpx; color: #8a7a6a; margin-top: 8rpx; line-height: 1.5; }
.pk-card { margin-top: 22rpx; display: flex; flex-direction: column; gap: 10rpx; }
.pk-card.center { align-items: center; text-align: center; padding: 44rpx 24rpx; }
.section-title { font-size: 28rpx; font-weight: 800; }
.section-sub { font-size: 22rpx; color: #a2917f; line-height: 1.5; }
.pk-start { margin-top: 18rpx; border-radius: 999rpx; padding: 20rpx 30rpx; text-align: center; color: #fff; font-size: 27rpx; font-weight: 800; background: linear-gradient(135deg, #7c6cff, #ff5f86); box-shadow: 0 14rpx 26rpx -16rpx rgba(124, 108, 255, 0.7); }
.pk-tip { font-size: 20rpx; color: #b3a394; line-height: 1.5; margin-top: 8rpx; }
.pk-error { color: #d94b4b; font-size: 22rpx; }
.pk-cancel { margin-top: 16rpx; border-radius: 999rpx; padding: 16rpx 28rpx; text-align: center; color: #7b6a95; border: 1rpx solid #e6ddf2; font-size: 24rpx; }
.pk-spinner { width: 62rpx; height: 62rpx; border-radius: 50%; border: 6rpx solid #ece4ff; border-top-color: #7c6cff; animation: spin 0.9s linear infinite; margin-bottom: 8rpx; }
@keyframes spin { to { transform: rotate(360deg); } }
.pk-game { margin-top: 22rpx; }
.pk-score-bar { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 24rpx; padding: 16rpx 22rpx; border: 1rpx solid #f1e8ff; box-shadow: 0 10rpx 24rpx -20rpx rgba(90, 70, 180, 0.4); }
.pk-player { display: flex; flex-direction: column; gap: 2rpx; }
.pk-player.me { align-items: flex-start; }
.pk-player:last-child { align-items: flex-end; }
.pk-player-name { font-size: 21rpx; color: #8a7a9a; }
.pk-player-score { font-size: 34rpx; font-weight: 800; color: #4b3a6b; }
.pk-vs { display: flex; flex-direction: column; align-items: center; gap: 2rpx; }
.pk-progress { font-size: 20rpx; color: #a291b3; }
.pk-time { font-size: 26rpx; font-weight: 800; color: #7c6cff; }
.pk-time.urgent { color: #ff5f6d; }
.pk-question { margin-top: 16rpx; display: flex; flex-direction: column; gap: 14rpx; }
.pk-subject { font-size: 21rpx; color: #a2917f; }
.pk-content { font-size: 34rpx; font-weight: 800; line-height: 1.4; color: #2d261f; }
.pk-options { display: flex; flex-direction: column; gap: 12rpx; }
.pk-option { display: flex; align-items: center; gap: 14rpx; border-radius: 18rpx; border: 2rpx solid #f0e8dc; background: #fffdfa; padding: 16rpx 18rpx; }
.pk-option.selected { border-color: #7c6cff; background: #f4f1ff; }
.pk-option.correct { border-color: #1fa97a; background: #eafaf3; }
.pk-option.wrong { border-color: #ff5f6d; background: #fff0f2; }
.option-letter { width: 40rpx; height: 40rpx; border-radius: 50%; background: #f5efe7; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 800; color: #8a7a6a; flex-shrink: 0; }
.pk-option.selected .option-letter { background: #7c6cff; color: #fff; }
.pk-option.correct .option-letter { background: #1fa97a; color: #fff; }
.pk-option.wrong .option-letter { background: #ff5f6d; color: #fff; }
.option-text { font-size: 26rpx; color: #3b3027; }
.pk-round { background: #f7fdf9; border: 1rpx solid #d8f2e5; border-radius: 16rpx; padding: 14rpx 16rpx; display: flex; flex-direction: column; gap: 4rpx; }
.round-title { font-size: 23rpx; font-weight: 800; color: #147a57; }
.round-text { font-size: 21rpx; color: #5d7a6c; line-height: 1.4; }
.round-wait { font-size: 19rpx; color: #9bb3a6; }
.pk-waiting { font-size: 21rpx; color: #8a7a9a; }
.pk-foot { display: block; text-align: center; font-size: 19rpx; color: #b3a394; margin-top: 16rpx; }
.result-card { align-items: center; text-align: center; padding: 34rpx 24rpx; }
.result-emoji { font-size: 62rpx; }
.result-title { font-size: 30rpx; font-weight: 800; }
.result-score { display: flex; align-items: center; gap: 26rpx; margin-top: 12rpx; }
.result-side { display: flex; flex-direction: column; align-items: center; gap: 2rpx; }
.result-label { font-size: 21rpx; color: #8a7a9a; }
.result-num { font-size: 44rpx; font-weight: 800; color: #4b3a6b; }
.result-colon { font-size: 32rpx; color: #b3a394; }
.pk-actions { display: flex; gap: 12rpx; width: 100%; margin-top: 16rpx; }
.pk-actions .pk-start { flex: 1; margin-top: 0; }
.pk-actions .pk-cancel { flex: 1; margin-top: 0; display: flex; align-items: center; justify-content: center; }
</style>
