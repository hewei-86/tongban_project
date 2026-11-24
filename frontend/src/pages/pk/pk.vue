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

      <view v-if="phase === 'finished'" class="result-stage">
        <view class="confetti" aria-hidden="true">
          <text
            v-for="piece in confetti"
            :key="piece.id"
            class="confetti-piece"
            :style="piece.style"
          ></text>
        </view>

        <view class="card pk-card result-card">
          <text class="result-emoji">{{ resultEmoji }}</text>
          <text class="result-title">{{ resultTitle }}</text>
          <text class="result-subtitle">{{ resultSubtitle }}</text>

          <view class="settle-table">
            <view class="settle-head">
              <text>结果</text>
              <text>玩家</text>
              <text class="align-right">分数</text>
            </view>
            <view
              v-for="row in resultRows"
              :key="row.id"
              class="settle-row"
              :class="row.className"
            >
              <view class="settle-rank">
                <text class="settle-medal">{{ row.medal }}</text>
                <text>{{ row.label }}</text>
              </view>
              <view class="settle-name">
                <text class="name-text">{{ row.name }}</text>
                <text v-if="row.me" class="me-tag">我</text>
              </view>
              <text class="settle-score">{{ row.score }}<text class="score-unit">分</text></text>
            </view>
          </view>

          <text class="result-note">本局 {{ final?.question_count || total }} 题 · 答对 100 分 + 速度奖励</text>

          <view class="pk-actions">
            <view class="pk-start" @click="restart">再来一局</view>
            <view class="pk-cancel" @click="goBack">返回首页</view>
          </view>
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
  if (final.value.draw) return '平局！'
  return final.value.winner_id === Number(myId.value) ? '🎉 你赢了！' : '这局惜败，再试一次'
})
const resultEmoji = computed(() => {
  if (!final.value) return '⚔️'
  if (final.value.draw) return '🤝'
  return final.value.winner_id === Number(myId.value) ? '🏆' : '💪'
})

const myName = computed(() => final.value?.players?.[myId.value] || me?.nickname || '我')
const opponentId = computed(() => {
  const keys = Object.keys(final.value?.scores || scores.value || {})
  return keys.find((key) => key !== myId.value) || String(opponent.value?.id || '')
})
const opponentName = computed(() => {
  return final.value?.players?.[opponentId.value] || opponent.value?.nickname || '对手'
})

const resultRows = computed(() => {
  const payload = final.value
  if (!payload) return []
  const scoreMap = payload.scores || {}
  const players = payload.players || {}
  let rows = Object.keys(scoreMap).map((id) => ({
    id,
    name: players[id] || (id === myId.value ? myName.value : opponentName.value),
    score: Number(scoreMap[id]) || 0,
    me: id === myId.value
  }))
  if (!rows.length) {
    rows = [
      { id: myId.value, name: myName.value, score: myScore.value, me: true },
      { id: opponentId.value, name: opponentName.value, score: opponentScore.value, me: false }
    ]
  }
  if (payload.draw) {
    return rows.map((row) => ({ ...row, label: '平局', medal: '🤝', className: 'draw' }))
  }
  const winnerId = String(payload.winner_id)
  const sorted = [...rows].sort((a, b) => b.score - a.score)
  const winner = rows.find((row) => row.id === winnerId) || sorted[0]
  const loser = rows.find((row) => row.id !== winner.id)
  return [
    { ...winner, label: '胜利者', medal: '🏆', className: 'winner' },
    ...(loser ? [{ ...loser, label: '失败者', medal: '🥈', className: 'loser' }] : [])
  ]
})

const resultSubtitle = computed(() => {
  if (!final.value) return ''
  if (final.value.draw) return '两位小选手不相上下，都是赢家'
  const winner = resultRows.value.find((row) => row.label === '胜利者')
  if (final.value.winner_id === Number(myId.value)) {
    return `你以 ${myScore.value} 分拿下本局`
  }
  return `${winner?.name || opponentName.value} 以 ${winner?.score ?? opponentScore.value} 分获胜`
})

const confettiColors = ['#ffcf5c', '#ff7a4d', '#7c6cff', '#1fa97a', '#ff5f86']
const confetti = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  style: {
    left: `${(i * 37) % 100}%`,
    animationDelay: `${(i % 8) * 0.12}s`,
    animationDuration: `${1.8 + (i % 5) * 0.25}s`,
    background: confettiColors[i % confettiColors.length],
    transform: `rotate(${i * 31}deg)`
  }
}))

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

/* ===== 结算动画与胜败名单 ===== */
.result-stage {
  position: relative;
  margin-top: 22rpx;
  overflow: hidden;
}
.confetti {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
}
.confetti-piece {
  position: absolute;
  top: -24rpx;
  width: 12rpx;
  height: 22rpx;
  border-radius: 4rpx;
  opacity: 0;
  animation-name: confetti-fall;
  animation-timing-function: ease-in;
  animation-iteration-count: infinite;
}
@keyframes confetti-fall {
  0% { opacity: 0; transform: translateY(-24rpx) rotate(0deg); }
  10% { opacity: 1; }
  85% { opacity: 1; }
  100% { opacity: 0; transform: translateY(760rpx) rotate(540deg); }
}
.result-card {
  position: relative;
  z-index: 2;
  align-items: center;
  text-align: center;
  padding: 34rpx 24rpx 28rpx;
  animation: result-pop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}
@keyframes result-pop {
  from { opacity: 0; transform: scale(0.9) translateY(16rpx); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.result-emoji {
  font-size: 66rpx;
  animation: trophy-bounce 0.9s ease-in-out infinite;
}
@keyframes trophy-bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-8rpx) scale(1.06); }
}
.result-title { font-size: 34rpx; font-weight: 800; color: #3f3157; }
.result-subtitle {
  display: block;
  font-size: 21rpx;
  color: #8a7a9a;
  margin-top: 6rpx;
  line-height: 1.5;
}
.settle-table {
  width: 100%;
  margin-top: 20rpx;
  border-radius: 20rpx;
  overflow: hidden;
  border: 1rpx solid #f0e8f7;
}
.settle-head,
.settle-row {
  display: grid;
  grid-template-columns: 150rpx 1fr 140rpx;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 16rpx;
}
.settle-head {
  background: #faf6ff;
  font-size: 19rpx;
  color: #9a8aab;
}
.settle-row {
  font-size: 23rpx;
  color: #4b3a6b;
  background: #fffdfa;
  border-top: 1rpx solid #f6eefa;
}
.settle-row.winner {
  background: linear-gradient(135deg, #fff8e1, #fff0d2);
}
.settle-row.loser {
  background: #faf8f5;
  color: #8a7a6a;
}
.settle-row.draw {
  background: #f7f3ff;
}
.settle-rank {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 20rpx;
  font-weight: 700;
}
.settle-medal { font-size: 26rpx; }
.settle-name {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  min-width: 0;
}
.name-text {
  max-width: 220rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 700;
}
.me-tag {
  font-size: 16rpx;
  color: #fff;
  background: #7c6cff;
  border-radius: 999rpx;
  padding: 2rpx 8rpx;
  flex-shrink: 0;
}
.settle-score {
  text-align: right;
  font-size: 34rpx;
  font-weight: 800;
  color: #4b3a6b;
}
.score-unit {
  font-size: 17rpx;
  font-weight: 400;
  color: #9a8aab;
  margin-left: 3rpx;
}
.align-right { text-align: right; }
.result-note {
  display: block;
  font-size: 19rpx;
  color: #b3a394;
  margin-top: 14rpx;
}
</style>
