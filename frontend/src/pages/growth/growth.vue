<template>
  <view class="page">
    <view class="page-head">
      <view>
        <text class="page-head-sub">每一步都算数，慢慢来也很快</text>
      </view>
      <text class="tag green">已解锁 {{ unlockedCount }}/{{ achievements.length }}</text>
    </view>

    <!-- 等级卡 -->
    <view class="level-card">
      <view class="level-ring" :style="levelRingStyle">
        <view class="level-ring-inner">
          <text class="level-num">{{ growth.level || 1 }}</text>
          <text class="level-label">等级</text>
        </view>
      </view>
      <view class="level-main">
        <view class="level-top">
          <text class="level-title">Lv.{{ growth.level || 1 }} 小小学习者</text>
          <text class="level-exp">{{ growth.exp_in_level || 0 }} / {{ growth.exp_next || 100 }} EXP</text>
        </view>
        <view class="exp-track solid">
          <view class="exp-fill" :style="{ width: (growth.progress_pct || 0) + '%' }"></view>
        </view>
        <text class="level-hint">再获得 {{ Math.max(0, (growth.exp_next || 100) - (growth.exp_in_level || 0)) }} 经验就升级啦</text>
        <view class="level-stats">
          <view class="lv-stat">
            <text class="lv-num">{{ growth.points || 0 }}</text>
            <text class="lv-label">积分</text>
          </view>
          <view class="lv-stat">
            <text class="lv-num">{{ growth.total_minutes || 0 }}</text>
            <text class="lv-label">累计分钟</text>
          </view>
          <view class="lv-stat">
            <text class="lv-num">{{ growth.streak_days || 0 }}</text>
            <text class="lv-label">连续天数</text>
          </view>
          <view class="lv-stat">
            <text class="lv-num">{{ growth.challenge_best || 0 }}</text>
            <text class="lv-label">速算最高</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 热力图 -->
    <view class="card">
      <view class="card-head">
        <view>
          <text class="card-title">学习打卡</text>
          <text class="card-sub">最近 28 天 · 颜色越深学得越久</text>
        </view>
        <text class="tag">学习 {{ studyDays }} 天</text>
      </view>
      <view class="heatmap">
        <view
          v-for="cell in heatmap"
          :key="cell.date"
          class="heat-cell"
          :class="['lv' + cell.level, { today: cell.isToday }]"
        >
          <text class="heat-day">{{ cell.day }}</text>
        </view>
      </view>
      <view class="heat-legend">
        <text class="muted small">少</text>
        <view class="legend-cell lv0"></view>
        <view class="legend-cell lv1"></view>
        <view class="legend-cell lv2"></view>
        <view class="legend-cell lv3"></view>
        <view class="legend-cell lv4"></view>
        <text class="muted small">多</text>
      </view>
      <text class="heat-tip">{{ heatTip }}</text>
    </view>

    <!-- 曲线 -->
    <view class="card">
      <view class="card-head">
        <view>
          <text class="card-title">最近 14 天</text>
          <text class="card-sub">每天学习多少分钟</text>
        </view>
        <text class="tag blue">共 {{ totalCurveMinutes }} 分钟</text>
      </view>
      <view class="curve">
        <view v-for="(day, i) in curve" :key="day.date" class="curve-col">
          <view class="curve-bar-wrap">
            <view
              class="curve-bar"
              :class="{ today: i === curve.length - 1 }"
              :style="{ height: barHeight(day.minutes) + '%' }"
            ></view>
          </view>
          <text class="curve-label">{{ i % 2 === 0 ? day.date.slice(8) : '' }}</text>
        </view>
      </view>
    </view>

    <!-- 成就 -->
    <view class="card">
      <view class="card-head">
        <view>
          <text class="card-title">成就徽章</text>
          <text class="card-sub">做到就点亮，不着急</text>
        </view>
        <text class="tag">{{ unlockedCount }}/{{ achievements.length }}</text>
      </view>
      <view class="ach-grid">
        <view v-for="item in achievements" :key="item.id" class="ach-card" :class="{ locked: !item.unlocked }">
          <view class="ach-top">
            <text class="ach-icon">{{ item.unlocked ? item.icon : '🔒' }}</text>
            <text class="ach-points">+{{ item.points_reward }}</text>
          </view>
          <text class="ach-name">{{ item.name }}</text>
          <text class="ach-desc">{{ item.description }}</text>
          <view class="ach-bar">
            <view class="ach-fill" :style="{ width: (item.progress?.percent || 0) + '%' }"></view>
          </view>
          <text class="ach-progress">
            {{ item.unlocked ? '已获得' : `${item.progress.current}/${item.progress.target}` }}
          </text>
        </view>
      </view>
    </view>

    <!-- 家庭排行 -->
    <view class="card">
      <view class="card-head">
        <view>
          <text class="card-title">家庭成长榜</text>
          <text class="card-sub">和自己比，也和家人一起进步</text>
        </view>
      </view>
      <view v-for="person in leaderboard" :key="person.user_id" class="rank-row">
        <view class="rank-num" :class="'r' + person.rank">{{ person.rank }}</view>
        <view class="rank-main">
          <text class="rank-name">{{ person.username }}</text>
          <text class="rank-sub">Lv.{{ person.level }} · {{ person.points }} 积分</text>
        </view>
        <text class="rank-minutes">{{ person.total_minutes }} 分钟</text>
      </view>
      <text v-if="leaderboard.length <= 1" class="muted small rank-tip">
        现在是单人模式，等家里更多小朋友加入（或切换到家长视角查看）会更有趣。
      </text>
    </view>

    <!-- 本周小结 -->
    <view class="card">
      <view class="card-head">
        <view>
          <text class="card-title">本周小结</text>
          <text class="card-sub">{{ report.range_label }}</text>
        </view>
        <text class="tag">{{ report.study_days || 0 }} 天学习</text>
      </view>
      <view class="week-grid">
        <view class="week-cell">
          <text class="week-num">{{ report.total_records || 0 }}</text>
          <text class="week-label">练习题目</text>
        </view>
        <view class="week-cell">
          <text class="week-num">{{ report.accuracy || 0 }}%</text>
          <text class="week-label">正确率</text>
        </view>
        <view class="week-cell">
          <text class="week-num">+{{ report.points_gain || 0 }}</text>
          <text class="week-label">获得积分</text>
        </view>
      </view>
      <view v-for="(tip, i) in report.suggestions" :key="i" class="suggest-row">
        <text class="suggest-dot">·</text>
        <text class="suggest-text">{{ tip }}</text>
      </view>
      <view class="quick-links">
        <view class="quick-link" @click="goPage('/pages/wrongbook/wrongbook')">📕 错题本</view>
        <view class="quick-link" @click="goPage('/pages/cards/cards')">📚 知识卡片</view>
        <view class="quick-link" @click="goPage('/pages/challenge/challenge')">⚡ 速算挑战</view>
      </view>
    </view>

    <TabBar active="growth" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabBar from '../../components/TabBar.vue'
import { api } from '../../services/api.js'
import { CHILD_ID } from '../../services/engineCore.js'

const growth = ref({})
const curve = ref([])
const heatmap = ref([])
const achievements = ref([])
const leaderboard = ref([])
const report = ref({})

const unlockedCount = computed(() => achievements.value.filter((item) => item.unlocked).length)
const totalCurveMinutes = computed(() => curve.value.reduce((sum, item) => sum + item.minutes, 0))
const levelRingStyle = computed(() => {
  const percent = Math.min(100, Math.max(0, Number(growth.value.progress_pct) || 0))
  return {
    background: `conic-gradient(#ffffff 0 ${percent}%, rgba(255,255,255,0.25) ${percent}% 100%)`
  }
})
const studyDays = computed(() => heatmap.value.filter((item) => item.level > 0).length)
const heatTip = computed(() => {
  if (!studyDays.value) return '还没有学习记录，今天开始点亮第一格吧。'
  if (studyDays.value < 5) return `近 28 天学习了 ${studyDays.value} 天，坚持比时长更重要。`
  return `近 28 天学习了 ${studyDays.value} 天，习惯正在慢慢形成。`
})

function barHeight(minutes) {
  const max = Math.max(10, ...curve.value.map((item) => item.minutes))
  return Math.max(4, Math.round((minutes / max) * 100))
}

function load() {
  growth.value = api.getGrowth(CHILD_ID)
  curve.value = api.getGrowthCurve(CHILD_ID, 14)
  heatmap.value = api.getHeatmap(CHILD_ID, 28)
  achievements.value = api.getAchievements(CHILD_ID)
  leaderboard.value = api.getLeaderboard()
  report.value = api.getWeeklyReport(CHILD_ID)
}

onShow(load)

function goPage(url) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.level-card {
  margin-top: 22rpx;
  display: flex;
  gap: 24rpx;
  padding: 30rpx 26rpx;
  border-radius: 36rpx;
  background: linear-gradient(150deg, #ffb067 0%, #ff7a4d 55%, #ff5f86 100%);
  color: #fff;
  box-shadow: 0 20rpx 42rpx rgba(255, 112, 78, 0.26);
}

.level-ring {
  width: 150rpx;
  height: 150rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 4rpx solid rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.level-num {
  font-size: 54rpx;
  font-weight: 800;
  line-height: 1;
}

.level-label {
  font-size: 20rpx;
  opacity: 0.9;
}

.level-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.level-top {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.level-title {
  font-size: 28rpx;
  font-weight: 700;
}

.level-exp {
  font-size: 20rpx;
  opacity: 0.9;
}

.exp-track.solid {
  background: rgba(255, 255, 255, 0.28);
  margin-top: 2rpx;
}

.level-hint {
  font-size: 19rpx;
  opacity: 0.9;
}

.level-stats {
  display: flex;
  gap: 8rpx;
  margin-top: 6rpx;
}

.lv-stat {
  flex: 1;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 14rpx;
  padding: 8rpx 2rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lv-num {
  font-size: 24rpx;
  font-weight: 700;
}

.lv-label {
  font-size: 16rpx;
  opacity: 0.88;
}

.heatmap {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8rpx;
}

.heat-cell {
  aspect-ratio: 1 / 1;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4ece4;
}

.heat-cell.today {
  box-shadow: 0 0 0 2rpx #ff6a45 inset;
}

.heat-day {
  font-size: 16rpx;
  color: rgba(90, 70, 50, 0.5);
}

.heat-cell.lv2 .heat-day,
.heat-cell.lv3 .heat-day,
.heat-cell.lv4 .heat-day {
  color: rgba(255, 255, 255, 0.9);
}

.lv0 {
  background: #f4ece4;
}

.lv1 {
  background: #ffe3d0;
}

.lv2 {
  background: #ffc49e;
}

.lv3 {
  background: #ff9a6b;
}

.lv4 {
  background: #ff6a45;
}

.heat-legend {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 16rpx;
}

.legend-cell {
  width: 22rpx;
  height: 22rpx;
  border-radius: 6rpx;
}

.heat-tip {
  display: block;
  font-size: 21rpx;
  color: #a2917f;
  margin-top: 12rpx;
}

.curve {
  display: flex;
  align-items: flex-end;
  gap: 6rpx;
  height: 240rpx;
}

.curve-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  height: 100%;
}

.curve-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.curve-bar {
  width: 70%;
  max-width: 26rpx;
  border-radius: 8rpx 8rpx 0 0;
  background: linear-gradient(180deg, #ffb98d, #ff8a5c);
  min-height: 6rpx;
}

.curve-bar.today {
  background: linear-gradient(180deg, #ff8a5c, #ff5f86);
}

.curve-label {
  font-size: 17rpx;
  color: #b3a394;
  height: 24rpx;
}

.ach-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14rpx;
}

.ach-card {
  background: #fffaf4;
  border-radius: 22rpx;
  padding: 18rpx 18rpx 14rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  border: 2rpx solid #ffe9d6;
}

.ach-card.locked {
  background: #fbf7f2;
  border-color: #f2e8de;
  opacity: 0.86;
}

.ach-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ach-icon {
  font-size: 38rpx;
}

.ach-points {
  font-size: 18rpx;
  color: #c47a4a;
}

.ach-name {
  font-size: 25rpx;
  font-weight: 700;
}

.ach-desc {
  font-size: 19rpx;
  color: #a2917f;
  line-height: 1.4;
  min-height: 52rpx;
}

.ach-bar {
  height: 8rpx;
  border-radius: 999rpx;
  background: #f1e6da;
  overflow: hidden;
  margin-top: 4rpx;
}

.ach-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #ffc08f, #ff7a4d);
}

.ach-progress {
  font-size: 17rpx;
  color: #b3a394;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f7eee6;
}

.rank-row:last-child {
  border-bottom: none;
}

.rank-num {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #f4ece4;
  color: #8d8074;
  font-size: 24rpx;
  font-weight: 700;
  text-align: center;
  line-height: 48rpx;
  flex-shrink: 0;
}

.rank-num.r1 {
  background: #ffd45c;
  color: #fff;
}

.rank-num.r2 {
  background: #c9cdd4;
  color: #fff;
}

.rank-num.r3 {
  background: #d9a06c;
  color: #fff;
}

.rank-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.rank-name {
  font-size: 27rpx;
  font-weight: 700;
}

.rank-sub {
  font-size: 20rpx;
  color: #a2917f;
}

.rank-minutes {
  font-size: 23rpx;
  color: #ff6a45;
  font-weight: 700;
}

.rank-tip {
  display: block;
  margin-top: 12rpx;
  line-height: 1.5;
}

.week-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.week-cell {
  background: #fff8f1;
  border-radius: 18rpx;
  padding: 18rpx 6rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
}

.week-num {
  font-size: 32rpx;
  font-weight: 800;
  color: #ff6a45;
}

.week-label {
  font-size: 19rpx;
  color: #a2917f;
}

.suggest-row {
  display: flex;
  gap: 8rpx;
  margin-top: 14rpx;
}

.suggest-dot {
  color: #ff9a5a;
  font-weight: 700;
}

.suggest-text {
  flex: 1;
  font-size: 23rpx;
  color: #6a5a4c;
  line-height: 1.6;
}

.quick-links {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
}

.quick-link {
  flex: 1;
  text-align: center;
  font-size: 22rpx;
  color: #c47a4a;
  background: #fff4ea;
  padding: 16rpx 4rpx;
  border-radius: 16rpx;
}

/* ===== v2 视觉打磨 ===== */
.level-card { border-radius: 42rpx; padding: 34rpx 28rpx; box-shadow: 0 28rpx 58rpx -26rpx rgba(255, 95, 62, 0.7); }
.level-ring { width: 158rpx; height: 158rpx; border-width: 5rpx; box-shadow: inset 0 0 0 10rpx rgba(255, 255, 255, 0.1); }
.heatmap { gap: 10rpx; }
.heat-cell { border-radius: 14rpx; }
.ach-card { border-radius: 24rpx; background: linear-gradient(160deg, #fffdf9, #fff6ec); border: 1rpx solid #ffead8; }
.ach-card.locked { background: #fbf8f4; }
.curve-bar { border-radius: 10rpx 10rpx 4rpx 4rpx; }
.week-cell { background: linear-gradient(160deg, #fffaf4, #fff0e3); border-radius: 20rpx; }
.quick-link { border: 1rpx solid #fff0e3; }

/* ===== v2.1 等级环 ===== */
.level-ring { width: 160rpx; height: 160rpx; padding: 5rpx; border: none; background: rgba(255, 255, 255, 0.2); }
.level-ring-inner { width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(150deg, rgba(255, 150, 100, 0.95), rgba(255, 95, 126, 0.95)); border: 1rpx solid rgba(255, 255, 255, 0.32); box-shadow: inset 0 2rpx 8rpx rgba(255, 255, 255, 0.25); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.level-num { line-height: 1; }
.level-label { line-height: 1.2; }
.curve { background: repeating-linear-gradient(to top, transparent 0, transparent 57rpx, #f9f1e8 57rpx, #f9f1e8 58rpx); border-radius: 12rpx; }
</style>
