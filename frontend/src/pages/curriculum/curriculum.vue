<template>
  <view class="page curriculum-page">
    <view class="curr-hero">
      <view class="curr-kicker">教材同步 · 样板</view>
      <text class="curr-title">{{ book.region_name }} · {{ book.edition_name }}{{ book.grade }}年级</text>
      <text class="curr-sub">{{ book.title }} · 按单元练习</text>
      <view class="curr-chips">
        <text>{{ book.region_name }}</text>
        <text>{{ book.edition_name }}</text>
        <text>{{ book.semester_name }}</text>
        <text>数学</text>
      </view>
    </view>

    <view class="curr-note">
      当前是「人教版三年级上册数学」样板，题目为原创同步题。保定各区县/学校教材版本可能不同，
      请以孩子学校实际发放的课本为准；确认版本后可继续扩展冀教版或其他年级。
    </view>

    <view class="unit-list">
      <view v-for="unit in book.units" :key="unit.id" class="unit-card">
        <view class="unit-head">
          <text class="unit-no">第 {{ unit.no }} 单元</text>
          <text class="unit-count">{{ progressOf(unit.id).answered }}/{{ progressOf(unit.id).total }} 已练</text>
        </view>
        <text class="unit-title">{{ unit.title }}</text>
        <view class="unit-knowledge">
          <text v-for="point in unit.knowledge" :key="point" class="knowledge-tag">{{ point }}</text>
        </view>
        <view class="unit-progress">
          <view class="unit-progress-bar">
            <view class="unit-progress-fill" :style="{ width: percentOf(unit.id) + '%' }"></view>
          </view>
          <text class="unit-accuracy">
            {{ progressOf(unit.id).answered ? `正确率 ${progressOf(unit.id).accuracy}%` : '还没有练习' }}
          </text>
        </view>
        <view class="unit-foot">
          <text class="unit-hint">5 道同步题 · 答错自动进错题本</text>
          <view class="unit-btn" @click="startUnit(unit)">去练习</view>
        </view>
      </view>
    </view>

    <view class="curr-foot">
      <text>教材目录会随学期更新；当前先做一个可运行的样板，验证“跟教材”是否值得继续投入。</text>
      <text class="curr-back" @click="backToPractice">返回普通练习 ›</text>
    </view>
  </view>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { api } from '../../services/api.js'
import { CURRICULUM_BOOK } from '../../data/curriculum.js'

const book = CURRICULUM_BOOK
const progressMap = ref({})

function loadProgress() {
  const next = {}
  for (const unit of book.units) {
    next[unit.id] = api.getUnitProgress(book.id, unit.id)
  }
  progressMap.value = next
}

function progressOf(unitId) {
  return progressMap.value[unitId] || { total: 5, answered: 0, correct: 0, accuracy: 0 }
}

function percentOf(unitId) {
  const item = progressOf(unitId)
  return item.total ? Math.round((item.answered / item.total) * 100) : 0
}

function startUnit(unit) {
  const query = [
    `subject=${book.subject}`,
    `grade=${book.grade}`,
    `unit=${encodeURIComponent(unit.id)}`,
    `unit_name=${encodeURIComponent(unit.title)}`,
    `curriculum=${encodeURIComponent(book.id)}`
  ].join('&')
  uni.navigateTo({ url: `/pages/practice/practice?${query}` })
}

function backToPractice() {
  uni.navigateBack({
    fail: () => uni.redirectTo({ url: '/pages/practice/practice' })
  })
}

onShow(loadProgress)
</script>

<style scoped>
.curriculum-page {
  padding-bottom: 80rpx;
}

.curr-hero {
  margin: 16rpx 0 20rpx;
  padding: 32rpx 28rpx;
  border-radius: 36rpx;
  background: linear-gradient(140deg, #eef4ff 0%, #f7ecff 55%, #fff1e7 100%);
  border: 1rpx solid #fff;
  box-shadow: 0 18rpx 40rpx -24rpx rgba(90, 80, 160, 0.4);
}

.curr-kicker {
  font-size: 20rpx;
  color: #7c6cff;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.curr-title {
  display: block;
  margin-top: 10rpx;
  font-size: 36rpx;
  font-weight: 800;
  color: #3f3157;
}

.curr-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8a7a9a;
}

.curr-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 18rpx;
}

.curr-chips text {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.85);
  color: #6b5a86;
  font-size: 19rpx;
}

.curr-note {
  margin-bottom: 20rpx;
  padding: 18rpx 20rpx;
  border-radius: 22rpx;
  background: #fffaf2;
  border: 1rpx solid #ffe9cf;
  color: #9a7a55;
  font-size: 20rpx;
  line-height: 1.65;
}

.unit-card {
  margin-bottom: 18rpx;
  padding: 24rpx;
  border-radius: 30rpx;
  background: #fff;
  border: 1rpx solid #f2e9fb;
  box-shadow: 0 12rpx 28rpx -22rpx rgba(90, 60, 120, 0.35);
}

.unit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.unit-no {
  font-size: 19rpx;
  color: #7c6cff;
  font-weight: 700;
}

.unit-count {
  font-size: 19rpx;
  color: #b3a394;
}

.unit-title {
  display: block;
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 800;
  color: #3f3157;
}

.unit-knowledge {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 12rpx;
}

.knowledge-tag {
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  background: #f6f1ff;
  color: #8b6fd6;
  font-size: 18rpx;
}

.unit-progress {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 16rpx;
}

.unit-progress-bar {
  flex: 1;
  height: 10rpx;
  border-radius: 999rpx;
  background: #f1eaf8;
  overflow: hidden;
}

.unit-progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #7c6cff, #ff7a9a);
  transition: width 0.3s ease;
}

.unit-accuracy {
  font-size: 18rpx;
  color: #9a8aab;
  white-space: nowrap;
}

.unit-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: 18rpx;
}

.unit-hint {
  font-size: 18rpx;
  color: #b3a394;
}

.unit-btn {
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #7c6cff, #ff5f86);
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
  box-shadow: 0 10rpx 22rpx -12rpx rgba(124, 108, 255, 0.7);
}

.curr-foot {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 10rpx 4rpx 0;
  color: #b3a394;
  font-size: 19rpx;
  line-height: 1.6;
}

.curr-back {
  color: #7c6cff;
  font-size: 21rpx;
}
</style>
