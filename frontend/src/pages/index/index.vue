<template>
  <view class="page">
    <view class="blob blob-a"></view>
    <view class="blob blob-b"></view>

    <view class="hero">
      <view class="hero-glow"></view>
      <view class="hero-top">
        <view class="brand-mark">{{ isParent ? '家' : '童' }}</view>
        <view class="hero-copy">
          <text class="eyebrow">童伴成长</text>
          <text class="hello">{{ isParent ? '家长您好' : '今天也要加油呀' }}</text>
          <text class="sub-hello">{{ isParent ? '一起陪伴孩子，慢慢长大' : '欢迎来到今天的学习乐园' }}</text>
        </view>
      </view>
      <view class="hero-actions">
        <picker :range="grades" @change="changeGrade">
          <view class="grade-pill">
            <text class="grade-kicker">当前年级</text>
            <text class="grade-value">{{ grade }}年级</text>
          </view>
        </picker>
        <view class="role-switch" @click="toggleRole">
          <text class="role-kicker">切换视角</text>
          <text class="role-value">{{ isParent ? '家长' : '孩子' }}</text>
        </view>
      </view>
      <view class="stats">
        <view class="stat">
          <text class="stat-icon">⏱</text>
          <text class="stat-num">{{ dashboard.study_minutes || 0 }}</text>
          <text class="stat-label">今日分钟</text>
        </view>
        <view class="stat">
          <text class="stat-icon">★</text>
          <text class="stat-num">{{ dashboard.points || 0 }}</text>
          <text class="stat-label">成长积分</text>
        </view>
        <view class="stat">
          <text class="stat-icon">🔥</text>
          <text class="stat-num">{{ dashboard.streak || 0 }}</text>
          <text class="stat-label">连续天数</text>
        </view>
      </view>
    </view>

    <view class="section-head">
      <view>
        <text class="section-kicker">今日推荐</text>
        <text class="section-title">{{ isParent ? '孩子的学习中心' : '今天学点什么' }}</text>
      </view>
      <view class="refresh-btn" @click="loadDashboard">刷新</view>
    </view>

    <view class="subject-grid">
      <view class="subject-card math" @click="openStudy('math')">
        <view class="icon-bubble">➗</view>
        <text class="subject-name">数学乐园</text>
        <text class="subject-desc">口算 · 思维训练</text>
      </view>
      <view class="subject-card chinese" @click="openStudy('chinese')">
        <view class="icon-bubble">📖</view>
        <text class="subject-name">语文天地</text>
        <text class="subject-desc">识字 · 拼音 · 古诗</text>
      </view>
      <view class="subject-card english" @click="openStudy('english')">
        <view class="icon-bubble">🔤</view>
        <text class="subject-name">英语乐园</text>
        <text class="subject-desc">字母 · 单词 · 句子</text>
      </view>
      <view class="subject-card ai" @click="activeTab='ai'">
        <view class="icon-bubble">🤖</view>
        <text class="subject-name">AI 智能老师</text>
        <text class="subject-desc">不会的问题问老师</text>
      </view>
    </view>

    <view v-if="activeTab === 'home'" class="panel">
      <view class="panel-head">
        <text class="panel-title">今日学习任务</text>
        <text class="panel-tag">每天一点点</text>
      </view>
      <view class="task-row" @click="openStudy('math')">
        <view class="task-dot">✓</view>
        <view class="task-info">
          <text class="task-name">完成 5 道基础练习</text>
          <text class="task-desc">从数学乐园开始，轻松热身</text>
        </view>
        <text class="task-chip">去练习</text>
      </view>
      <view class="task-row" @click="switchTab('family')">
        <view class="task-dot pale">☆</view>
        <view class="task-info">
          <text class="task-name">和家人完成一次交流</text>
          <text class="task-desc">说说今天开心的事情</text>
        </view>
        <text class="task-chip warm">去聊聊</text>
      </view>
    </view>

    <view v-if="activeTab === 'study'" class="panel">
      <view class="panel-head">
        <text class="panel-title">{{ subjectTitle }} · 今日练习</text>
        <text class="panel-tag">{{ grade }}年级</text>
      </view>
      <view v-if="loadingQuestions" class="empty">
        <text class="empty-emoji">✏️</text>
        <text>题目加载中…</text>
      </view>
      <view v-else-if="questions.length === 0" class="empty">
        <text class="empty-emoji">📭</text>
        <text>暂无题目，请检查后端服务。</text>
      </view>
      <view v-for="(q, idx) in questions" :key="q.id" class="question-card">
        <view class="q-badge">第 {{ idx + 1 }} 题</view>
        <text class="question-text">{{ q.content }}</text>
        <view v-if="q.options && q.options.length" class="options">
          <view
            v-for="option in q.options"
            :key="option"
            class="option"
            :class="{ selected: answers[q.id] === option }"
            @click="answers[q.id] = option"
          >
            <view class="option-dot"></view>
            <text class="option-text">{{ option }}</text>
          </view>
        </view>
        <input v-else class="answer-input" v-model="answers[q.id]" placeholder="在这里写下答案" />
        <button class="small-primary" @click="submitAnswer(q)">提交这道题</button>
      </view>
    </view>

    <view v-if="activeTab === 'ai'" class="panel">
      <view class="panel-head">
        <text class="panel-title">AI 智能老师</text>
        <text class="panel-tag">耐心讲解</text>
      </view>
      <view class="ai-tip">可以问数学、语文、英语。我会用适合小学低年级的方式慢慢讲清楚。</view>
      <view class="chat-list">
        <view v-for="(msg, i) in chatMessages" :key="i" class="chat-row" :class="msg.role">
          <view class="chat-avatar">{{ msg.role === 'user' ? '我' : '师' }}</view>
          <view class="chat-bubble">{{ msg.content }}</view>
        </view>
      </view>
      <view class="chat-input-row">
        <input
          class="chat-input"
          v-model="question"
          placeholder="例如：8+7 应该怎么算？"
          confirm-type="send"
          @confirm="sendQuestion"
        />
        <button class="send-btn" :disabled="sending" @click="sendQuestion">{{ sending ? '…' : '发送' }}</button>
      </view>
      <text class="safety-note">AI 可能出错，重要知识请和家长或老师核对。请不要输入真实姓名、住址等隐私信息。</text>
    </view>

    <view v-if="activeTab === 'family'" class="panel">
      <view class="panel-head">
        <text class="panel-title">亲子成长互评</text>
        <text class="panel-tag">互相理解</text>
      </view>
      <view class="ai-tip">家长和孩子分别说说感受。这里不排名，也不用来惩罚。</view>

      <view class="form-label">评价对象</view>
      <picker :range="targetOptions" @change="targetIndex = Number($event.detail.value)">
        <view class="picker-box">
          <text>{{ targetOptions[targetIndex] }}</text>
          <text class="picker-arrow">选择</text>
        </view>
      </picker>

      <view class="form-label">评价项目</view>
      <picker :range="evaluationItems" @change="itemIndex = Number($event.detail.value)">
        <view class="picker-box">
          <text>{{ evaluationItems[itemIndex] }}</text>
          <text class="picker-arrow">选择</text>
        </view>
      </picker>

      <view class="form-label">给几颗星</view>
      <view class="star-card">
        <view class="stars">
          <text v-for="n in 5" :key="n" @click="score = n" :class="{ active: n <= score }">★</text>
        </view>
        <text class="star-caption">{{ scoreLabel }}</text>
      </view>

      <view class="form-label">想说的话（选填）</view>
      <textarea class="comment-box" v-model="comment" placeholder="写一句鼓励，或者一个小小的建议…" maxlength="200" />
      <button class="primary-btn" @click="submitEvaluation">提交评价</button>
      <view v-if="evaluationMessage" class="result-note">{{ evaluationMessage }}</view>
    </view>

    <view v-if="activeTab === 'report'" class="panel">
      <view class="panel-head">
        <text class="panel-title">本周成长报告</text>
        <text class="panel-tag">只看变化</text>
      </view>
      <view class="report-hero">
        <text class="report-number">{{ report.total_records || 0 }}</text>
        <text class="report-label">本周学习记录</text>
      </view>
      <view class="metric">
        <view class="metric-row">
          <text>学习时长</text>
          <text class="metric-value">{{ report.total_minutes || 0 }} 分钟</text>
        </view>
      </view>
      <view class="metric">
        <view class="metric-row">
          <text>完成练习</text>
          <text class="metric-value">{{ report.completed_count || 0 }} 题</text>
        </view>
      </view>
      <view class="metric">
        <view class="metric-row">
          <text>正确率</text>
          <text class="metric-value">{{ report.accuracy || 0 }}%</text>
        </view>
        <view class="bar">
          <view class="bar-fill" :style="{ width: accuracyWidth }"></view>
        </view>
      </view>
      <view class="metric">
        <view class="metric-row">
          <text>亲子评价</text>
          <text class="metric-value">{{ report.evaluation_count || 0 }} 条</text>
        </view>
      </view>
      <text class="safety-note">报告用来观察成长变化，不给孩子贴标签，也不和其他孩子比较。</text>
    </view>

    <view class="tabbar">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <text class="tab-icon">{{ tab.icon }}</text>
        <text class="tab-name">{{ tab.name }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { request } from '../../../api/index.js'

const activeTab = ref('home')
const isParent = ref(false)
const userId = ref(2)
const familyId = 1
const grade = ref(1)
const grades = ['一年级', '二年级', '三年级']
const tabs = [
  { key: 'home', name: '首页', icon: '🏠' },
  { key: 'study', name: '练习', icon: '✏️' },
  { key: 'ai', name: '老师', icon: '🤖' },
  { key: 'family', name: '互评', icon: '💗' },
  { key: 'report', name: '报告', icon: '📊' }
]
const dashboard = ref({})
const report = ref({})
const questions = ref([])
const answers = ref({})
const loadingQuestions = ref(false)
const subject = ref('math')
const subjectTitle = computed(() => ({ math: '数学', chinese: '语文', english: '英语' }[subject.value]))
const accuracyWidth = computed(() => `${Math.min(100, Number(report.value.accuracy) || 0)}%`)
const question = ref('')
const sending = ref(false)
const chatMessages = ref([{ role: 'assistant', content: '你好呀！我是童伴成长的 AI 学习助手。今天想学点什么？' }])
const targetOptions = computed(() => isParent.value ? ['孩子'] : ['家长'])
const targetIndex = ref(0)
const evaluationItems = computed(() => isParent.value
  ? ['学习主动性', '作业完成情况', '生活自理', '礼貌与习惯', '情绪表达']
  : ['陪伴时间', '耐心倾听', '鼓励表扬', '共同活动', '遵守约定'])
const itemIndex = ref(0)
const score = ref(5)
const scoreLabels = ['', '再接再厉', '有进步', '做得很好', '非常棒', '超级赞']
const scoreLabel = computed(() => scoreLabels[score.value] || '')
const comment = ref('')
const evaluationMessage = ref('')

function switchTab(key) {
  activeTab.value = key
  if (key === 'report') loadReport()
}
function toggleRole() {
  isParent.value = !isParent.value
  userId.value = isParent.value ? 1 : 2
  loadDashboard()
}
function changeGrade(e) {
  grade.value = Number(e.detail.value) + 1
  if (activeTab.value === 'study') loadQuestions()
}
async function loadDashboard() {
  try { dashboard.value = await request(`/api/dashboard?user_id=${userId.value}`) }
  catch (e) { uni.showToast({ title: '连接后端失败，请先启动 FastAPI', icon: 'none' }) }
}
async function openStudy(name) {
  subject.value = name
  activeTab.value = 'study'
  await loadQuestions()
}
async function loadQuestions() {
  loadingQuestions.value = true
  try {
    questions.value = await request(`/api/questions?subject=${subject.value}&grade=${grade.value}`)
    answers.value = {}
  } catch (e) {
    uni.showToast({ title: '题目加载失败，请检查后端', icon: 'none' })
  } finally { loadingQuestions.value = false }
}
async function submitAnswer(q) {
  const answer = String(answers.value[q.id] ?? '').trim()
  if (!answer) {
    uni.showToast({ title: '请先填写答案', icon: 'none' })
    return
  }
  try {
    const result = await request('/api/learning/submit', 'POST', {
      user_id: userId.value, question_id: q.id, answer
    })
    uni.showModal({
      title: result.is_correct ? '答对啦！' : '再想一想',
      content: result.explanation,
      showCancel: false
    })
    await loadDashboard()
  } catch (e) { uni.showToast({ title: e.message || '提交失败', icon: 'none' }) }
}
async function sendQuestion() {
  const text = question.value.trim()
  if (!text || sending.value) return
  chatMessages.value.push({ role: 'user', content: text })
  question.value = ''
  sending.value = true
  try {
    const result = await request('/api/ai/chat', 'POST', {
      user_id: userId.value, grade: grade.value, question: text
    })
    chatMessages.value.push({ role: 'assistant', content: result.answer + (result.demo ? '\n（当前为演示回复，配置 Qwen Key 后启用真实 AI）' : '') })
  } catch (e) {
    chatMessages.value.push({ role: 'assistant', content: '暂时无法连接老师，请检查后端服务是否启动。' })
  } finally { sending.value = false }
}
async function submitEvaluation() {
  try {
    await request('/api/evaluations', 'POST', {
      family_id: familyId, evaluator_id: userId.value,
      target_id: isParent.value ? 2 : 1,
      direction: isParent.value ? 'parent_to_child' : 'child_to_parent',
      item: evaluationItems.value[itemIndex.value],
      score: score.value, comment: comment.value
    })
    evaluationMessage.value = '评价提交成功！谢谢你认真表达自己的感受。'
    comment.value = ''
  } catch (e) { evaluationMessage.value = e.message || '提交失败，请检查后端。' }
}
async function loadReport() {
  try { report.value = await request(`/api/reports/weekly?family_id=${familyId}`) }
  catch (e) { uni.showToast({ title: '报告加载失败', icon: 'none' }) }
}
onMounted(() => loadDashboard())
</script>

<style scoped>
.page {
  position: relative;
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  padding: 20rpx 28rpx 220rpx;
  overflow: hidden;
  box-sizing: border-box;
}
.blob {
  position: absolute;
  border-radius: 50%;
  z-index: 0;
  pointer-events: none;
}
.blob-a {
  width: 280rpx;
  height: 280rpx;
  right: -90rpx;
  top: 520rpx;
  background: rgba(255, 186, 140, 0.35);
}
.blob-b {
  width: 220rpx;
  height: 220rpx;
  left: -80rpx;
  top: 980rpx;
  background: rgba(255, 214, 168, 0.45);
}
.hero,
.section-head,
.subject-grid,
.panel,
.tabbar {
  position: relative;
  z-index: 1;
}

.hero {
  overflow: hidden;
  border-radius: 40rpx;
  padding: 28rpx 28rpx 22rpx;
  color: #fff;
  background: linear-gradient(155deg, #ffb067 0%, #ff7a4d 46%, #ff5f86 100%);
  box-shadow: 0 22rpx 48rpx rgba(255, 112, 78, 0.28);
}
.hero-glow {
  position: absolute;
  width: 260rpx;
  height: 260rpx;
  right: -70rpx;
  top: -90rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
}
.hero-top {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.brand-mark {
  width: 88rpx;
  height: 88rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.22);
  border: 2rpx solid rgba(255, 255, 255, 0.35);
  text-align: center;
  line-height: 88rpx;
  font-size: 36rpx;
  font-weight: 700;
  flex-shrink: 0;
}
.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.eyebrow {
  font-size: 20rpx;
  letter-spacing: 4rpx;
  opacity: 0.85;
}
.hello {
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.25;
}
.sub-hello {
  font-size: 24rpx;
  opacity: 0.92;
  line-height: 1.4;
}
.hero-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 28rpx;
}
.grade-pill,
.role-switch {
  background: rgba(255, 255, 255, 0.18);
  border: 2rpx solid rgba(255, 255, 255, 0.32);
  border-radius: 24rpx;
  padding: 14rpx 22rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.grade-kicker,
.role-kicker {
  font-size: 20rpx;
  opacity: 0.85;
}
.grade-value,
.role-value {
  font-size: 28rpx;
  font-weight: 700;
}
.stats {
  display: flex;
  gap: 14rpx;
  margin-top: 20rpx;
}
.stat {
  flex: 1;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 24rpx;
  padding: 12rpx 8rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.stat-icon {
  font-size: 26rpx;
  line-height: 1.2;
}
.stat-num {
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.2;
}
.stat-label {
  font-size: 20rpx;
  opacity: 0.9;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin: 26rpx 6rpx 16rpx;
}
.section-kicker {
  display: block;
  color: #c47a4a;
  font-size: 22rpx;
  font-weight: 600;
  margin-bottom: 6rpx;
}
.section-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #2c241c;
}
.refresh-btn {
  background: #fff;
  color: #e06a3a;
  font-size: 24rpx;
  font-weight: 600;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  box-shadow: 0 8rpx 20rpx rgba(120, 70, 30, 0.06);
}

.subject-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18rpx;
}
.subject-card {
  background: #fff;
  border-radius: 30rpx;
  padding: 26rpx 24rpx 24rpx;
  min-height: 176rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  box-shadow: 0 12rpx 28rpx rgba(90, 50, 20, 0.06);
}
.subject-card:active {
  transform: scale(0.98);
}
.icon-bubble {
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  margin-bottom: 6rpx;
}
.math .icon-bubble { background: #fff1df; }
.chinese .icon-bubble { background: #e7f7ef; }
.english .icon-bubble { background: #e8f1ff; }
.ai .icon-bubble { background: #f3eaff; }
.subject-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #2c241c;
}
.subject-desc {
  font-size: 22rpx;
  color: #8d8074;
}

.panel {
  background: #fff;
  border-radius: 32rpx;
  padding: 28rpx 26rpx 18rpx;
  margin-top: 22rpx;
  box-shadow: 0 14rpx 36rpx rgba(90, 50, 20, 0.06);
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.panel-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2c241c;
}
.panel-tag {
  font-size: 22rpx;
  color: #c47a4a;
  background: #fff4ea;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
}

.task-row {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f4ece4;
}
.task-row:last-child {
  border: 0;
}
.task-dot {
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  background: #e7f7ef;
  color: #1f9d68;
  border-radius: 18rpx;
  margin-right: 18rpx;
  font-size: 26rpx;
  flex-shrink: 0;
}
.task-dot.pale {
  background: #fff4df;
  color: #e09a2b;
}
.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.task-name {
  font-size: 28rpx;
  font-weight: 650;
  color: #2c241c;
}
.task-desc {
  font-size: 22rpx;
  color: #9a8d82;
}
.task-chip {
  font-size: 22rpx;
  color: #fff;
  background: #ff7a4d;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  margin-left: 12rpx;
  flex-shrink: 0;
}
.task-chip.warm {
  background: #ffb15a;
}

.question-card {
  padding: 26rpx 0 22rpx;
  border-bottom: 1rpx solid #f4ece4;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}
.question-card:last-child {
  border: 0;
}
.q-badge {
  align-self: flex-start;
  background: #fff4ea;
  color: #d26532;
  font-size: 22rpx;
  font-weight: 600;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
}
.question-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #2c241c;
  line-height: 1.45;
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
.option-dot {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  border: 3rpx solid #d8cdc3;
  flex-shrink: 0;
  box-sizing: border-box;
}
.option-text {
  font-size: 28rpx;
  color: #3d342c;
}
.option.selected {
  background: #fff1e8;
  border-color: #ffb089;
}
.option.selected .option-dot {
  border-color: #ff7a4d;
  background: #ff7a4d;
  box-shadow: inset 0 0 0 5rpx #fff;
}
.answer-input,
.chat-input,
.picker-box,
.comment-box {
  background: #faf6f2;
  border-radius: 20rpx;
  padding: 20rpx 22rpx;
  font-size: 28rpx;
  color: #2c241c;
}
.small-primary,
.primary-btn,
.send-btn {
  background: linear-gradient(135deg, #ff9460, #ff6a45);
  color: #fff;
  border-radius: 999rpx;
  font-weight: 650;
  border: 0;
  line-height: 1;
}
.small-primary {
  align-self: flex-end;
  width: 240rpx;
  margin: 0;
  font-size: 26rpx;
  padding: 20rpx 0;
}
.small-primary::after,
.primary-btn::after,
.send-btn::after {
  border: none;
}

.ai-tip {
  background: #fff6ee;
  color: #8a6248;
  padding: 20rpx 22rpx;
  border-radius: 20rpx;
  margin: 18rpx 0 8rpx;
  line-height: 1.6;
  font-size: 24rpx;
}
.chat-list {
  max-height: 560rpx;
  overflow-y: auto;
  padding: 8rpx 0 4rpx;
}
.chat-row {
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
  margin: 16rpx 0;
}
.chat-row.user {
  flex-direction: row-reverse;
}
.chat-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 18rpx;
  background: #ffe8d4;
  color: #e06a3a;
  text-align: center;
  line-height: 56rpx;
  font-size: 24rpx;
  font-weight: 700;
  flex-shrink: 0;
}
.chat-row.user .chat-avatar {
  background: #ffe1ea;
  color: #e25b7a;
}
.chat-bubble {
  max-width: 78%;
  padding: 18rpx 22rpx;
  border-radius: 24rpx;
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 26rpx;
}
.chat-row.assistant .chat-bubble {
  background: #faf6f2;
  color: #3d342c;
  border-bottom-left-radius: 8rpx;
}
.chat-row.user .chat-bubble {
  background: #ff7a4d;
  color: #fff;
  border-bottom-right-radius: 8rpx;
}
.chat-input-row {
  display: flex;
  gap: 12rpx;
  align-items: center;
  margin-top: 16rpx;
  background: #faf6f2;
  border-radius: 999rpx;
  padding: 8rpx 8rpx 8rpx 22rpx;
}
.chat-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  padding: 12rpx 0;
}
.send-btn {
  width: 128rpx;
  margin: 0;
  font-size: 26rpx;
  padding: 18rpx 0;
}
.send-btn[disabled] {
  opacity: 0.6;
}
.safety-note {
  display: block;
  color: #a8988c;
  font-size: 22rpx;
  line-height: 1.55;
  margin: 18rpx 4rpx 10rpx;
}

.form-label {
  margin: 24rpx 4rpx 12rpx;
  font-weight: 650;
  font-size: 26rpx;
  color: #3d342c;
}
.picker-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.picker-arrow {
  color: #c47a4a;
  font-size: 22rpx;
}
.star-card {
  background: #fff8f1;
  border-radius: 24rpx;
  padding: 18rpx 20rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.stars {
  display: flex;
  gap: 18rpx;
  font-size: 56rpx;
  color: #eadfd4;
  line-height: 1;
}
.stars .active {
  color: #ffb020;
}
.star-caption {
  font-size: 24rpx;
  color: #c47a4a;
  font-weight: 600;
}
.comment-box {
  width: auto;
  min-height: 140rpx;
}
.primary-btn {
  margin: 24rpx 0 8rpx;
  padding: 24rpx 0;
  font-size: 30rpx;
}
.result-note {
  color: #1f9d68;
  background: #eefaf4;
  border-radius: 18rpx;
  padding: 18rpx 20rpx;
  margin: 8rpx 0 12rpx;
  font-size: 26rpx;
  line-height: 1.5;
}

.report-hero {
  margin: 20rpx 0 8rpx;
  border-radius: 28rpx;
  padding: 32rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(160deg, #fff4ea, #ffe7f0);
}
.report-number {
  color: #e25b3a;
  font-size: 72rpx;
  font-weight: 700;
  line-height: 1.1;
}
.report-label {
  color: #a07a68;
  font-size: 24rpx;
  margin-top: 6rpx;
}
.metric {
  padding: 20rpx 4rpx;
  border-bottom: 1rpx solid #f4ece4;
}
.metric:last-of-type {
  border: 0;
}
.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
  color: #3d342c;
}
.metric-value {
  font-weight: 700;
  color: #e06a3a;
}
.bar {
  margin-top: 14rpx;
  height: 14rpx;
  background: #f4ece4;
  border-radius: 999rpx;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #ffb067, #ff6a45);
}
.empty {
  color: #a8988c;
  padding: 36rpx 0 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  font-size: 26rpx;
}
.empty-emoji {
  font-size: 44rpx;
}

.tabbar {
  position: fixed;
  left: 50%;
  right: auto;
  width: calc(min(480px, 100vw) - 48rpx);
  transform: translateX(-50%);
  bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 252, 249, 0.96);
  display: flex;
  justify-content: space-between;
  padding: 10rpx;
  border-radius: 36rpx;
  box-shadow: 0 16rpx 40rpx rgba(90, 50, 20, 0.12);
  z-index: 20;
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  color: #b3a69c;
  font-size: 20rpx;
  padding: 10rpx 0 8rpx;
  border-radius: 28rpx;
}
.tab.active {
  color: #e25b2a;
  background: #fff1e8;
  font-weight: 700;
}
.tab-icon {
  font-size: 32rpx;
  line-height: 1.2;
}
.tab-name {
  font-size: 20rpx;
}
</style>
