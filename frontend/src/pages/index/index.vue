<template>
  <view class="page">
    <!-- ============ 顶部主卡 ============ -->
    <view class="hero">
      <view class="hero-row">
        <view class="hero-avatar">{{ isParent ? '家' : '童' }}</view>
        <view class="hero-copy">
          <text class="hero-kicker">TONG BAN · 童伴成长</text>
          <text class="hero-title">{{ heroTitle }}</text>
          <text class="hero-sub">{{ subTitle }}</text>
        </view>
      </view>

      <view class="hero-pills">
        <picker v-if="!isParent" :range="grades" :value="session.grade - 1" @change="onGradeChange">
          <view class="pill">
            <text class="pill-label">当前年级</text>
            <text class="pill-value">{{ gradeLabel }} ▾</text>
          </view>
        </picker>
        <view class="pill" @click="onToggleRole">
          <text class="pill-label">切换视角</text>
          <text class="pill-value">{{ isParent ? '家长 → 孩子' : '孩子 → 家长' }}</text>
        </view>
      </view>

      <view class="stat-strip">
        <view class="stat-cell">
          <text class="stat-cell-icon">⏱</text>
          <text class="stat-cell-num">{{ heroStats.minutes }}</text>
          <text class="stat-cell-label">今日分钟</text>
        </view>
        <view class="stat-cell">
          <text class="stat-cell-icon">★</text>
          <text class="stat-cell-num">{{ heroStats.points }}</text>
          <text class="stat-cell-label">{{ isParent ? '孩子积分' : '成长积分' }}</text>
        </view>
        <view class="stat-cell">
          <text class="stat-cell-icon">🔥</text>
          <text class="stat-cell-num">{{ heroStats.streak }}</text>
          <text class="stat-cell-label">连续天数</text>
        </view>
        <view class="stat-cell">
          <text class="stat-cell-icon">Lv</text>
          <text class="stat-cell-num">{{ heroStats.level }}</text>
          <text class="stat-cell-label">{{ isParent ? '孩子等级' : '当前等级' }}</text>
        </view>
      </view>

      <view v-if="!isParent" class="exp-row">
        <text>EXP {{ dashboard.exp_in_level || 0 }} / {{ dashboard.exp_next || 100 }}</text>
        <text>距离升级还差 {{ Math.max(0, (dashboard.exp_next || 100) - (dashboard.exp_in_level || 0)) }}</text>
      </view>
      <view v-if="!isParent" class="exp-track">
        <view class="exp-fill" :style="{ width: (dashboard.exp_percent || 0) + '%' }"></view>
      </view>
    </view>

    <view v-if="!loggedIn" class="guest-banner">
      <view class="guest-main">
        <text class="guest-title">游客体验中</text>
        <text class="guest-sub">注册本机账号，学习记录可以按账号分开保存</text>
      </view>
      <view class="btn btn-soft btn-sm" @click="goAuth">登录 / 注册</view>
    </view>

    <!-- ============ 孩子视角 ============ -->
    <template v-if="!isParent">
      <view class="card">
        <view class="card-head">
          <view>
            <text class="card-title">每日签到</text>
            <text class="card-sub">连续签到，积分越攒越多</text>
          </view>
          <text class="tag" :class="{ green: checkin.checkin_today }">
            {{ checkin.checkin_today ? '今天已签到' : '今天还没签到' }}
          </text>
        </view>

        <view class="checkin-box">
          <view class="streak-block">
            <text class="num-xl">{{ checkin.streak_days || 0 }}</text>
            <text class="muted small">连续签到天数</text>
          </view>
          <view class="week-dots">
            <view v-for="day in weekDays" :key="day.date" class="day-cell" :class="{ checked: day.checked, today: day.isToday }">
              <text class="day-num">{{ day.day }}</text>
              <text class="day-dot">{{ day.checked ? '✓' : '' }}</text>
            </view>
          </view>
        </view>

        <view class="btn btn-primary btn-block" :class="{ disabled: checkin.checkin_today }" @click="onCheckin">
          {{ checkin.checkin_today ? '明天再来' : '立即签到 · 得积分' }}
        </view>
      </view>

      <view class="card">
        <view class="card-head">
          <view>
            <text class="card-title">今日学习任务</text>
            <text class="card-sub">完成 {{ dashboard.tasks_done || 0 }} / {{ dashboard.tasks_total || 3 }} 项</text>
          </view>
          <text class="card-link" @click="goTab('/pages/practice/practice')">去练习</text>
        </view>

        <view v-if="!tasks.length" class="empty">
          <text class="empty-emoji">📭</text>
          <text>暂无任务</text>
        </view>
        <view v-for="task in tasks" :key="task.id" class="task-row">
          <view class="task-dot" :class="{ done: task.is_completed }">
            {{ task.is_completed ? '✓' : subjectIcon(task.subject) }}
          </view>
          <view class="task-main">
            <text class="task-name">{{ task.title }}</text>
            <text class="task-desc">{{ task.description }}</text>
            <view class="task-progress">
              <view class="bar">
                <view
                  class="bar-fill"
                  :style="{ width: Math.min(100, (task.completed_count / task.target_count) * 100) + '%' }"
                ></view>
              </view>
              <text class="muted small">{{ task.completed_count }}/{{ task.target_count }}</text>
            </view>
          </view>
          <view class="task-chip" :class="{ done: task.is_completed }" @click="openSubject(task.subject)">
            {{ task.is_completed ? '已领奖' : '去做题' }}
          </view>
        </view>
      </view>

      <view class="card">
        <view class="card-head">
          <view>
            <text class="card-title">学科练习</text>
            <text class="card-sub">{{ gradeLabel }} · 每次 5 道题</text>
          </view>
        </view>
        <view class="grid-2">
          <view class="entry-card" @click="openSubject('math')">
            <view class="entry-icon math">➗</view>
            <text class="entry-name">数学乐园</text>
            <text class="entry-desc">口算 · 应用题</text>
          </view>
          <view class="entry-card" @click="openSubject('chinese')">
            <view class="entry-icon chinese">📖</view>
            <text class="entry-name">语文天地</text>
            <text class="entry-desc">识字 · 古诗</text>
          </view>
          <view class="entry-card" @click="openSubject('english')">
            <view class="entry-icon english">🔤</view>
            <text class="entry-name">英语乐园</text>
            <text class="entry-desc">单词 · 句子</text>
          </view>
          <view class="entry-card" @click="goTab('/pages/ai/ai')">
            <view class="entry-icon ai">🤖</view>
            <text class="entry-name">AI 小老师</text>
            <text class="entry-desc">不会就问我</text>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="card-head tight">
          <text class="card-title">学习小工具</text>
          <text class="card-sub">换个方式练一练</text>
        </view>
        <view class="grid-3">
          <view class="tool-card" @click="goPage('/pages/challenge/challenge')">
            <text class="tool-icon">⚡</text>
            <text class="tool-name">速算挑战</text>
            <text class="tool-desc">60 秒冲分</text>
          </view>
          <view class="tool-card" @click="goPage('/pages/cards/cards')">
            <text class="tool-icon">📚</text>
            <text class="tool-name">知识卡片</text>
            <text class="tool-desc">单词古诗</text>
          </view>
          <view class="tool-card" @click="goPage('/pages/wrongbook/wrongbook')">
            <text class="tool-icon">📕</text>
            <text class="tool-name">错题本</text>
            <text class="tool-desc">{{ dashboard.wrong_unmastered || 0 }} 道待掌握</text>
          </view>
        </view>
        <view class="link-row" @click="goPage('/pages/family/family')">
          <view class="link-icon">💗</view>
          <view class="link-main">
            <text class="link-title">亲子成长互评</text>
            <text class="link-desc">和爸爸妈妈互相说一说心里话</text>
          </view>
          <text class="link-arrow">›</text>
        </view>
        <view class="link-row" @click="goPage('/pages/parent/parent')">
          <view class="link-icon">👨‍👩‍👧</view>
          <view class="link-main">
            <text class="link-title">家长专区</text>
            <text class="link-desc">学习报告 · 目标 · 时长管理</text>
          </view>
          <text class="link-arrow">›</text>
        </view>
      </view>
    </template>

    <!-- ============ 家长视角 ============ -->
    <template v-else>
      <view class="card">
        <view class="card-head">
          <view>
            <text class="card-title">孩子今日学习</text>
            <text class="card-sub">{{ child ? child.username : '小童' }} · {{ child ? child.grade : 1 }} 年级</text>
          </view>
          <text class="card-link" @click="goPage('/pages/parent/parent')">家长中心</text>
        </view>

        <view v-if="!child" class="empty">
          <text class="empty-emoji">🧸</text>
          <text>还没有孩子的学习数据</text>
        </view>
        <view v-else class="parent-stats">
          <view class="pstat">
            <text class="pstat-num">{{ child.today_minutes }}</text>
            <text class="pstat-label">今日分钟</text>
          </view>
          <view class="pstat">
            <text class="pstat-num">{{ child.today_correct }}/{{ child.today_total }}</text>
            <text class="pstat-label">今日练习</text>
          </view>
          <view class="pstat">
            <text class="pstat-num">{{ child.accuracy_week }}%</text>
            <text class="pstat-label">本周正确率</text>
          </view>
          <view class="pstat">
            <text class="pstat-num">{{ child.wrong_count }}</text>
            <text class="pstat-label">待掌握错题</text>
          </view>
        </view>

        <view v-if="child" class="week-row">
          <text class="muted small">本周累计 {{ child.week_minutes }} 分钟 · {{ child.week_count }} 道题</text>
          <view class="bar">
            <view class="bar-fill" :style="{ width: Math.min(100, (child.week_minutes / 120) * 100) + '%' }"></view>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="card-head">
          <view>
            <text class="card-title">进行中的目标</text>
            <text class="card-sub">温和陪伴，不催促</text>
          </view>
          <text class="tag">{{ parentData.active_goals.length }} 个</text>
        </view>
        <view v-if="!parentData.active_goals.length" class="empty">
          <text class="empty-emoji">🎯</text>
          <text>还没有设置目标，去家长中心加一个吧</text>
        </view>
        <view v-for="goal in parentData.active_goals" :key="goal.id" class="task-row">
          <view class="task-dot">🎯</view>
          <view class="task-main">
            <text class="task-name">{{ goal.title }}</text>
            <text class="task-desc">每天 {{ goal.target_minutes }} 分钟 · 截止 {{ goal.target_date }}</text>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="card-head tight">
          <text class="card-title">家长功能</text>
        </view>
        <view class="link-row" @click="goPage('/pages/parent/parent')">
          <view class="link-icon">👨‍👩‍👧</view>
          <view class="link-main">
            <text class="link-title">家长中心</text>
            <text class="link-desc">孩子概况 · 学习目标 · 时长管理 · 周报月报</text>
          </view>
          <text class="link-arrow">›</text>
        </view>
        <view class="link-row" @click="goPage('/pages/family/family')">
          <view class="link-icon">💗</view>
          <view class="link-main">
            <text class="link-title">亲子成长互评</text>
            <text class="link-desc">看看孩子眼中的你，也写下你的鼓励</text>
          </view>
          <text class="link-arrow">›</text>
        </view>
        <view class="link-row" @click="goPage('/pages/growth/growth')">
          <view class="link-icon">🏆</view>
          <view class="link-main">
            <text class="link-title">成长档案</text>
            <text class="link-desc">等级 · 成就 · 学习曲线</text>
          </view>
          <text class="link-arrow">›</text>
        </view>
      </view>
    </template>

    <text class="safety-note">
      本演示站的数据保存在当前浏览器本地，不会上传服务器；换设备或清理浏览器数据后需要重新开始。
    </text>

    <TabBar active="home" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabBar from '../../components/TabBar.vue'
import { api, toast } from '../../services/api.js'
import { session, switchGrade, toggleRole } from '../../services/session.js'
import { isLoggedIn } from '../../services/auth.js'
import { dateOffset, greetingByHour } from '../../utils/format.js'

const grades = ['一年级', '二年级', '三年级']
const gradeLabel = computed(() => grades[session.grade - 1] || '一年级')
const isParent = computed(() => session.role === 'parent')

const dashboard = ref({})
const tasks = ref([])
const checkin = ref({ calendar: [], streak_days: 0, checkin_today: false })
const parentData = ref({ children: [], active_goals: [] })
const hasLoaded = ref(false)
const loggedIn = ref(isLoggedIn())

const child = computed(() => (parentData.value.children || [])[0] || null)

const heroTitle = computed(() => {
  if (isParent.value) return '一起陪孩子慢慢长大'
  const name = dashboard.value.username || '小童'
  return `${greetingByHour()}，${name}！`
})

const subTitle = computed(() =>
  isParent.value ? '今天的陪伴，是他明天的底气' : dashboard.value.daily_tip || '今天也要加油呀'
)

const heroStats = computed(() => {
  if (isParent.value) {
    return {
      minutes: child.value?.today_minutes || 0,
      points: child.value?.points || 0,
      streak: child.value?.streak_days || 0,
      level: child.value?.level || 1
    }
  }
  return {
    minutes: dashboard.value.study_minutes || 0,
    points: dashboard.value.points || 0,
    streak: dashboard.value.streak_days || 0,
    level: dashboard.value.level || 1
  }
})

const weekDays = computed(() => {
  const calendar = checkin.value.calendar || []
  return calendar.slice(-7).map((item) => ({
    ...item,
    day: Number(String(item.date).slice(-2)),
    isToday: item.date === dateOffset(0)
  }))
})

function subjectIcon(subject) {
  return { math: '➗', chinese: '📖', english: '🔤' }[subject] || '✏️'
}

function loadAll() {
  loggedIn.value = isLoggedIn()
  try {
    if (isParent.value) {
      parentData.value = api.getParentDashboard()
    } else {
      dashboard.value = api.getDashboard()
      tasks.value = api.getDailyTasks()
      checkin.value = api.getCheckin()
    }
  } catch (error) {
    toast(error?.message || '数据加载失败')
  } finally {
    hasLoaded.value = true
  }
}

onShow(loadAll)

function onToggleRole() {
  toggleRole()
  loadAll()
}

function onGradeChange(event) {
  const index = Number(event.detail.value)
  switchGrade(index + 1)
  loadAll()
  toast(`已切换到 ${grades[index]}`)
}

function onCheckin() {
  if (checkin.value.checkin_today) {
    toast('今天已经签过到啦，明天见！')
    return
  }
  const result = api.doCheckin()
  loadAll()
  if (result?.new_achievements?.length) {
    setTimeout(() => {
      uni.showModal({
        title: '🏅 解锁新成就',
        content: result.new_achievements.map((item) => `${item.icon} ${item.name}`).join('\n'),
        showCancel: false
      })
    }, 500)
  } else {
    toast(result?.message || '签到成功')
  }
}

function openSubject(subject) {
  uni.navigateTo({ url: `/pages/practice/practice?subject=${subject}` })
}

function goTab(url) {
  uni.reLaunch({ url })
}

function goPage(url) {
  uni.navigateTo({ url })
}

function goAuth() {
  uni.navigateTo({ url: '/pages/auth/login/login' })
}
</script>

<style scoped>
.checkin-box {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: linear-gradient(135deg, #fff9f3, #ffefe4);
  border-radius: 24rpx;
  padding: 24rpx 22rpx;
  margin-bottom: 20rpx;
}

.streak-block {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  width: 170rpx;
  flex-shrink: 0;
}

.week-dots {
  flex: 1;
  display: flex;
  justify-content: space-between;
  gap: 6rpx;
}

.day-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  width: 44rpx;
  padding: 8rpx 0;
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.7);
}

.day-cell.checked {
  background: #ffe3cf;
}

.day-cell.today {
  box-shadow: 0 0 0 2rpx #ff9d6e inset;
}

.day-num {
  font-size: 18rpx;
  color: #a2917f;
}

.day-dot {
  font-size: 20rpx;
  color: #ff6a45;
  font-weight: 700;
  height: 24rpx;
}

.tool-card {
  background: #fff9f3;
  border-radius: 22rpx;
  padding: 22rpx 14rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.tool-card:active {
  transform: scale(0.97);
}

.tool-icon {
  font-size: 38rpx;
}

.tool-name {
  font-size: 24rpx;
  font-weight: 700;
}

.tool-desc {
  font-size: 19rpx;
  color: #a2917f;
  text-align: center;
}

.parent-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10rpx;
}

.pstat {
  background: #fff8f1;
  border-radius: 18rpx;
  padding: 16rpx 6rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.pstat-num {
  font-size: 30rpx;
  font-weight: 700;
  color: #ff6a45;
}

.pstat-label {
  font-size: 19rpx;
  color: #a2917f;
}

.week-row {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.guest-banner {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 22rpx;
  border-radius: 24rpx;
  background: #fff;
  border: 2rpx dashed #ffd9c4;
}

.guest-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.guest-title {
  font-size: 25rpx;
  font-weight: 700;
  color: #2c241c;
}

.guest-sub {
  font-size: 20rpx;
  color: #a2917f;
  line-height: 1.4;
}
</style>
