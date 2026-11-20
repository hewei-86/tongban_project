<template>
  <view class="page">
    <view class="page-head">
      <view>
        <text class="page-head-sub">看趋势，不看排名；多鼓励，少比较</text>
      </view>
      <text class="tag">{{ isParent ? '家长视角' : '孩子视角' }}</text>
    </view>

    <!-- 视角提示 -->
    <view v-if="!isParent" class="role-banner">
      <text class="role-emoji">👨‍👩‍👧</text>
      <view class="role-main">
        <text class="role-title">这里是家长专区</text>
        <text class="role-desc">切换到家长视角后，可以查看报告、设置目标和学习时长。</text>
      </view>
      <view class="btn btn-primary btn-sm" @click="becomeParent">切换</view>
    </view>

    <view v-if="!isParent" class="card">
      <view class="card-head tight">
        <view>
          <text class="card-title">家长中心能做什么</text>
          <text class="card-sub">全部数据都在本机，家长可以放心查看</text>
        </view>
      </view>
      <view class="link-row" @click="becomeParent">
        <view class="link-icon">📊</view>
        <view class="link-main">
          <text class="link-title">学习报告</text>
          <text class="link-desc">周报 / 月报、学科正确率、每日学习曲线</text>
        </view>
        <text class="link-arrow">›</text>
      </view>
      <view class="link-row" @click="becomeParent">
        <view class="link-icon">🎯</view>
        <view class="link-main">
          <text class="link-title">学习目标</text>
          <text class="link-desc">和孩子一起定一个小目标，完成就打勾</text>
        </view>
        <text class="link-arrow">›</text>
      </view>
      <view class="link-row" @click="becomeParent">
        <view class="link-icon">⏰</view>
        <view class="link-main">
          <text class="link-title">时长管理</text>
          <text class="link-desc">设置每日学习时长和休息提醒，保护视力</text>
        </view>
        <text class="link-arrow">›</text>
      </view>
    </view>

    <template v-if="isParent">
      <!-- 孩子概况 -->
      <view v-for="child in children" :key="child.user_id" class="child-card">
        <view class="child-head">
          <view class="child-avatar">🧒</view>
          <view class="child-main">
            <text class="child-name">{{ child.username }} · {{ child.grade }} 年级</text>
            <text class="child-sub">Lv.{{ child.level }} · 积分 {{ child.points }} · 连续 {{ child.streak_days }} 天</text>
          </view>
          <text class="tag green">本周 {{ child.week_minutes }} 分钟</text>
        </view>

        <view class="child-stats">
          <view class="c-stat">
            <text class="c-num">{{ child.today_minutes }}</text>
            <text class="c-label">今日分钟</text>
          </view>
          <view class="c-stat">
            <text class="c-num">{{ child.today_correct }}/{{ child.today_total }}</text>
            <text class="c-label">今日练习</text>
          </view>
          <view class="c-stat">
            <text class="c-num">{{ child.accuracy_week }}%</text>
            <text class="c-label">本周正确率</text>
          </view>
          <view class="c-stat">
            <text class="c-num">{{ child.wrong_count }}</text>
            <text class="c-label">待掌握错题</text>
          </view>
        </view>

        <view class="child-week">
          <text class="muted small">本周目标进度（以 {{ timeLimit.daily_limit_minutes }} 分钟/天 估算）</text>
          <view class="bar">
            <view
              class="bar-fill"
              :style="{ width: Math.min(100, (child.week_minutes / Math.max(1, timeLimit.daily_limit_minutes * 7)) * 100) + '%' }"
            ></view>
          </view>
        </view>
      </view>

      <view v-if="!children.length" class="card">
        <view class="empty">
          <text class="empty-emoji">🧸</text>
          <text>还没有孩子档案</text>
        </view>
      </view>

      <!-- 报告 -->
      <view class="card">
        <view class="card-head">
          <view>
            <text class="card-title">学习报告</text>
            <text class="card-sub">{{ report.range_label }} · 只看变化</text>
          </view>
          <view class="seg report-seg">
            <view class="seg-item" :class="{ active: period === 'week' }" @click="changePeriod('week')">周报</view>
            <view class="seg-item" :class="{ active: period === 'month' }" @click="changePeriod('month')">月报</view>
          </view>
        </view>

        <view class="report-grid">
          <view class="r-cell">
            <text class="r-num">{{ report.total_records || 0 }}</text>
            <text class="r-label">练习题目</text>
          </view>
          <view class="r-cell">
            <text class="r-num">{{ report.total_minutes || 0 }}</text>
            <text class="r-label">学习分钟</text>
          </view>
          <view class="r-cell">
            <text class="r-num">{{ report.accuracy || 0 }}%</text>
            <text class="r-label">正确率</text>
          </view>
          <view class="r-cell">
            <text class="r-num">{{ report.study_days || 0 }}</text>
            <text class="r-label">学习天数</text>
          </view>
        </view>

        <view class="subject-list">
          <view v-for="item in report.by_subject" :key="item.subject" class="subject-row">
            <text class="subject-name">{{ subjectIcon(item.subject) }} {{ item.label }}</text>
            <view class="bar">
              <view class="bar-fill" :class="item.subject === 'chinese' ? 'green' : item.subject === 'english' ? 'blue' : ''" :style="{ width: item.accuracy + '%' }"></view>
            </view>
            <text class="subject-value">{{ item.count ? item.accuracy + '%' : '—' }}</text>
          </view>
        </view>

        <view class="daily-bars">
          <view v-for="day in report.daily" :key="day.date" class="daily-col">
            <view class="daily-bar-wrap">
              <view class="daily-bar" :style="{ height: dailyHeight(day.minutes) + '%' }"></view>
            </view>
            <text class="daily-label">{{ day.label }}</text>
          </view>
        </view>

        <view class="suggest-box">
          <text class="suggest-title">给家长的小建议</text>
          <view v-for="(tip, i) in report.suggestions" :key="i" class="suggest-row">
            <text class="suggest-dot">·</text>
            <text class="suggest-text">{{ tip }}</text>
          </view>
        </view>
      </view>

      <!-- 学习目标 -->
      <view class="card">
        <view class="card-head">
          <view>
            <text class="card-title">学习目标</text>
            <text class="card-sub">一次只定一个小目标</text>
          </view>
          <text class="tag">{{ activeGoals.length }} 个进行中</text>
        </view>

        <view v-if="!goals.length" class="empty">
          <text class="empty-emoji">🎯</text>
          <text>还没有目标，在下面添加一个</text>
        </view>
        <view v-for="goal in goals" :key="goal.id" class="goal-row" :class="{ done: goal.is_completed }">
          <view class="goal-icon">{{ goal.is_completed ? '✅' : '🎯' }}</view>
          <view class="goal-main">
            <text class="goal-title">{{ goal.title }}</text>
            <text class="goal-sub">每天 {{ goal.target_minutes }} 分钟 · 截止 {{ goal.target_date }}</text>
          </view>
          <text v-if="!goal.is_completed" class="goal-link" @click="finishGoal(goal)">完成</text>
          <text class="goal-link danger" @click="removeGoal(goal)">删除</text>
        </view>

        <view class="divider"></view>
        <text class="field-label">新增目标</text>
        <input v-model="goalForm.title" class="input" maxlength="30" placeholder="例如：每天坚持 10 分钟口算" />
        <view class="form-row">
          <view class="form-item">
            <text class="muted small">每日分钟</text>
            <input v-model.number="goalForm.minutes" class="input small-input" type="number" />
          </view>
          <view class="form-item">
            <text class="muted small">截止日期</text>
            <picker mode="date" :value="goalForm.date" @change="goalForm.date = $event.detail.value">
              <view class="picker-field small-picker">
                <text>{{ goalForm.date || '选择日期' }}</text>
                <text class="picker-arrow">▾</text>
              </view>
            </picker>
          </view>
        </view>
        <view class="btn btn-primary btn-block" @click="addGoal">添加目标</view>
      </view>

      <!-- 时长管理 -->
      <view class="card">
        <view class="card-head">
          <view>
            <text class="card-title">学习时长管理</text>
            <text class="card-sub">保护视力，也保护学习兴趣</text>
          </view>
          <text class="tag" :class="{ pink: overLimit }">{{ overLimit ? '今日已超时' : '正常' }}</text>
        </view>

        <view class="limit-box">
          <view class="limit-main">
            <text class="limit-num">{{ timeLimit.daily_limit_minutes }}</text>
            <text class="limit-unit">分钟 / 天</text>
          </view>
          <text class="limit-hint">学习到 {{ timeLimit.warning_minutes }} 分钟时提醒休息</text>
        </view>

        <view class="limit-actions">
          <view class="btn btn-ghost" @click="adjustLimit(-10)">− 10 分钟</view>
          <view class="btn btn-primary" @click="adjustLimit(10)">+ 10 分钟</view>
        </view>

        <view class="today-row">
          <text class="muted small">今天已学习</text>
          <text class="today-value">{{ todayMinutes }} 分钟</text>
        </view>
        <view class="bar">
          <view
            class="bar-fill"
            :class="{ green: !overLimit }"
            :style="{ width: Math.min(100, (todayMinutes / Math.max(1, timeLimit.daily_limit_minutes)) * 100) + '%' }"
          ></view>
        </view>
        <text v-if="overLimit" class="over-tip">今天已经超过约定时长，记得让孩子休息一下眼睛。</text>
      </view>

      <!-- 快捷入口 -->
      <view class="card">
        <view class="card-head tight">
          <text class="card-title">更多家长功能</text>
        </view>
        <view class="link-row" @click="goPage('/pages/family/family')">
          <view class="link-icon">💗</view>
          <view class="link-main">
            <text class="link-title">亲子成长互评</text>
            <text class="link-desc">给孩子写一句具体的鼓励</text>
          </view>
          <text class="link-arrow">›</text>
        </view>
        <view class="link-row" @click="goPage('/pages/growth/growth')">
          <view class="link-icon">🏆</view>
          <view class="link-main">
            <text class="link-title">成长档案</text>
            <text class="link-desc">等级、徽章和学习曲线</text>
          </view>
          <text class="link-arrow">›</text>
        </view>
        <view class="link-row" @click="goPage('/pages/wrongbook/wrongbook')">
          <view class="link-icon">📕</view>
          <view class="link-main">
            <text class="link-title">错题本</text>
            <text class="link-desc">看看孩子最近卡在哪里</text>
          </view>
          <text class="link-arrow">›</text>
        </view>
      </view>

      <text class="safety-note">
        报告只用于观察成长趋势，不建议拿来和其他孩子比较，也不建议用减少玩耍时间作为惩罚。
      </text>
    </template>

    <TabBar :active="isParent ? 'parent' : 'home'" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabBar from '../../components/TabBar.vue'
import { api, toast } from '../../services/api.js'
import { session, switchRole } from '../../services/session.js'
import { CHILD_ID } from '../../services/engineCore.js'
import { dateOffset } from '../../utils/format.js'

const isParent = computed(() => session.role === 'parent')
const children = ref([])
const goals = ref([])
const report = ref({})
const period = ref('week')
const timeLimit = ref({ daily_limit_minutes: 60, warning_minutes: 45 })
const goalForm = ref({ title: '', minutes: 30, date: dateOffset(7) })

const activeGoals = computed(() => goals.value.filter((item) => !item.is_completed))
const todayMinutes = computed(() => children.value.reduce((sum, item) => sum + item.today_minutes, 0))
const overLimit = computed(() => todayMinutes.value > (timeLimit.value.daily_limit_minutes || 60))

function load() {
  if (!isParent.value) return
  try {
    const data = api.getParentDashboard()
    children.value = data.children || []
    if (data.time_limits?.length) timeLimit.value = data.time_limits[0]
    goals.value = api.listGoals({ child_id: CHILD_ID })
    report.value = period.value === 'week' ? api.getWeeklyReport(CHILD_ID) : api.getMonthlyReport(CHILD_ID)
  } catch (error) {
    toast(error?.message || '数据加载失败')
  }
}

onShow(load)

function becomeParent() {
  switchRole('parent')
  load()
}

function changePeriod(value) {
  period.value = value
  report.value = value === 'week' ? api.getWeeklyReport(CHILD_ID) : api.getMonthlyReport(CHILD_ID)
}

function dailyHeight(minutes) {
  const max = Math.max(10, ...(report.value.daily || []).map((item) => item.minutes))
  return Math.max(3, Math.round((minutes / max) * 100))
}

function subjectIcon(subject) {
  return { math: '➗', chinese: '📖', english: '🔤' }[subject] || '📘'
}

function addGoal() {
  try {
    api.createGoal({
      title: goalForm.value.title,
      target_minutes: goalForm.value.minutes,
      target_date: goalForm.value.date
    })
    toast('目标已添加')
    goalForm.value = { title: '', minutes: 30, date: dateOffset(7) }
    load()
  } catch (error) {
    toast(error?.message || '添加失败')
  }
}

function finishGoal(goal) {
  api.completeGoal(goal.id)
  toast('目标完成，记得表扬一下孩子')
  load()
}

async function removeGoal(goal) {
  const confirmed = await new Promise((resolve) => {
    uni.showModal({
      title: '删除目标',
      content: `确定删除「${goal.title}」吗？`,
      success: (res) => resolve(Boolean(res.confirm)),
      fail: () => resolve(false)
    })
  })
  if (!confirmed) return
  api.deleteGoal(goal.id)
  load()
}

function adjustLimit(delta) {
  try {
    const next = Math.max(10, Math.min(240, (timeLimit.value.daily_limit_minutes || 60) + delta))
    api.setTimeLimit({
      child_user_id: CHILD_ID,
      daily_limit_minutes: next,
      warning_minutes: Math.max(5, next - 15)
    })
    timeLimit.value = { daily_limit_minutes: next, warning_minutes: Math.max(5, next - 15) }
    toast(`每日时长已设为 ${next} 分钟`)
  } catch (error) {
    toast(error?.message || '设置失败')
  }
}

function goPage(url) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.role-banner {
  margin-top: 22rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 24rpx;
  box-shadow: 0 10rpx 26rpx rgba(120, 70, 30, 0.06);
}

.role-emoji {
  font-size: 44rpx;
}

.role-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.role-title {
  font-size: 27rpx;
  font-weight: 700;
}

.role-desc {
  font-size: 21rpx;
  color: #a2917f;
  line-height: 1.4;
}

.child-card {
  margin-top: 22rpx;
  background: #fff;
  border-radius: 32rpx;
  padding: 26rpx 24rpx;
  box-shadow: 0 14rpx 32rpx rgba(120, 70, 30, 0.08);
}

.child-head {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.child-avatar {
  width: 76rpx;
  height: 76rpx;
  border-radius: 24rpx;
  background: #fff2e4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38rpx;
  flex-shrink: 0;
}

.child-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.child-name {
  font-size: 29rpx;
  font-weight: 700;
}

.child-sub {
  font-size: 21rpx;
  color: #a2917f;
}

.child-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10rpx;
  margin-top: 20rpx;
}

.c-stat {
  background: #fff8f1;
  border-radius: 18rpx;
  padding: 16rpx 4rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
}

.c-num {
  font-size: 30rpx;
  font-weight: 800;
  color: #ff6a45;
}

.c-label {
  font-size: 18rpx;
  color: #a2917f;
}

.child-week {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.report-seg {
  width: 220rpx;
  padding: 4rpx;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10rpx;
}

.r-cell {
  background: #fff8f1;
  border-radius: 18rpx;
  padding: 18rpx 4rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
}

.r-num {
  font-size: 32rpx;
  font-weight: 800;
  color: #2c241c;
}

.r-label {
  font-size: 18rpx;
  color: #a2917f;
}

.subject-list {
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.subject-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.subject-name {
  width: 110rpx;
  font-size: 23rpx;
  color: #5a4a3c;
  flex-shrink: 0;
}

.subject-value {
  width: 70rpx;
  text-align: right;
  font-size: 22rpx;
  font-weight: 700;
  color: #6a5a4c;
}

.daily-bars {
  display: flex;
  align-items: flex-end;
  gap: 6rpx;
  height: 160rpx;
  margin-top: 22rpx;
  padding: 0 2rpx;
}

.daily-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  height: 100%;
}

.daily-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.daily-bar {
  width: 70%;
  max-width: 24rpx;
  border-radius: 6rpx 6rpx 0 0;
  background: linear-gradient(180deg, #ffc49e, #ff8a5c);
  min-height: 4rpx;
}

.daily-label {
  font-size: 16rpx;
  color: #b3a394;
  height: 20rpx;
}

.suggest-box {
  margin-top: 20rpx;
  background: #fffaf4;
  border-radius: 20rpx;
  padding: 18rpx 20rpx;
}

.suggest-title {
  font-size: 23rpx;
  font-weight: 700;
  color: #c47a4a;
}

.suggest-row {
  display: flex;
  gap: 8rpx;
  margin-top: 8rpx;
}

.suggest-dot {
  color: #ff9a5a;
}

.suggest-text {
  flex: 1;
  font-size: 22rpx;
  color: #6a5a4c;
  line-height: 1.55;
}

.goal-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f7eee6;
}

.goal-row.done {
  opacity: 0.62;
}

.goal-icon {
  font-size: 30rpx;
}

.goal-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.goal-title {
  font-size: 26rpx;
  font-weight: 700;
}

.goal-sub {
  font-size: 20rpx;
  color: #a2917f;
}

.goal-link {
  font-size: 21rpx;
  color: #1f9d68;
  padding: 8rpx;
}

.goal-link.danger {
  color: #d98a7d;
}

.form-row {
  display: flex;
  gap: 14rpx;
  margin-top: 14rpx;
}

.form-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.small-input {
  min-height: 80rpx;
  text-align: center;
}

.small-picker {
  min-height: 80rpx;
  font-size: 24rpx;
}

.limit-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  background: linear-gradient(135deg, #fff8f1, #ffefe4);
  border-radius: 22rpx;
  padding: 22rpx 24rpx;
}

.limit-main {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.limit-num {
  font-size: 56rpx;
  font-weight: 800;
  color: #ff6a45;
  line-height: 1;
}

.limit-unit {
  font-size: 21rpx;
  color: #a2917f;
}

.limit-hint {
  font-size: 20rpx;
  color: #a2917f;
  max-width: 260rpx;
  text-align: right;
  line-height: 1.4;
}

.limit-actions {
  display: flex;
  gap: 14rpx;
  margin: 18rpx 0;
}

.limit-actions .btn {
  flex: 1;
}

.today-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.today-value {
  font-size: 24rpx;
  font-weight: 700;
  color: #ff6a45;
}

.over-tip {
  display: block;
  margin-top: 12rpx;
  font-size: 21rpx;
  color: #e25b4a;
  background: #fff1ed;
  border-radius: 14rpx;
  padding: 12rpx 16rpx;
}

/* ===== v2 视觉打磨 ===== */
.child-card { border-radius: 36rpx; border: 1rpx solid #fff1e7; }
.c-stat { background: linear-gradient(160deg, #fffaf4, #fff0e3); border-radius: 20rpx; }
.r-cell { background: linear-gradient(160deg, #fffdf9, #fff5ea); border-radius: 20rpx; }
.limit-box { background: linear-gradient(140deg, #fff8f1, #ffe9d8); border: 1rpx solid #ffe0c8; border-radius: 26rpx; }
.suggest-box { background: linear-gradient(160deg, #fffdf9, #fff3e6); border: 1rpx solid #ffead8; border-radius: 24rpx; }
.role-banner { border: 1rpx solid #fff1e7; }
</style>
