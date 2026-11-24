<template>
  <view class="page curriculum-page">
    <view class="curr-hero">
      <view class="curr-kicker">教材同步 · 人教版</view>
      <text class="curr-title">{{ currentBook?.title || '人教版 三年级上册' }}</text>
      <text class="curr-sub">免费每天 1 本 · 每本第 1 单元免费</text>
      <view class="subject-tabs">
        <view
          v-for="item in subjects"
          :key="item.key"
          class="subject-tab"
          :class="{ active: activeSubject === item.key }"
          @click="activeSubject = item.key"
        >
          <text>{{ item.icon }} {{ item.label }}</text>
        </view>
      </view>
    </view>

    <view class="curr-note">
      {{ member ? '家庭会员：本册单元全部开放。' : '免费版每天可学 1 本教材；第 1 单元免费，第 2 单元起需要开通会员。' }}
      题目为原创同步题或 AI 按单元生成，不复制教材原文。
    </view>

    <view v-if="loading" class="card empty-state">
      <text>教材目录加载中…</text>
    </view>

    <view v-else-if="!currentBook" class="card empty-state">
      <text>这个学科暂时还没有配置教材。</text>
    </view>

    <view v-else-if="currentBook.locked_by_day" class="locked-banner">
      <text>今天已经免费学过另一本教材了</text>
      <text class="locked-sub">明天再来，或开通会员随时切换三科教材</text>
      <view class="locked-action" @click="goMember">开通会员</view>
    </view>

    <view v-else class="unit-list">
      <view v-for="unit in currentBook.units" :key="unit.id" class="unit-card" :class="{ locked: unit.locked }">
        <view class="unit-head">
          <text class="unit-no">第 {{ unit.no }} 单元</text>
          <view class="unit-head-right">
            <text v-if="unit.free" class="free-tag">免费</text>
            <text class="unit-count">{{ progressOf(unit.id).answered }}/{{ progressOf(unit.id).total }} 已练</text>
          </view>
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
          <text class="unit-hint">{{ unit.locked ? '第 2 单元起需会员' : '进入单元后可用 AI 继续出题' }}</text>
          <view class="unit-btn" :class="{ locked: unit.locked }" @click="startUnit(unit)">
            {{ unit.locked ? '🔒 会员解锁' : '去练习' }}
          </view>
        </view>
      </view>
    </view>

    <view class="curr-foot">
      <text>教材版本：人教版 · 三年级上册。其他年级/版本会陆续加入。</text>
      <text class="curr-back" @click="backToPractice">返回普通练习 ›</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { api, toast } from '../../services/api.js'
import { IS_REMOTE } from '../../config.js'
import { CURRICULUM_BOOKS } from '../../data/curriculum.js'
import { activateCurriculumBook, fetchCurriculumBooks } from '../../services/curriculumRemote.js'

const subjects = [
  { key: 'math', label: '数学', icon: '➗' },
  { key: 'chinese', label: '语文', icon: '📖' },
  { key: 'english', label: '英语', icon: '🔤' }
]
const activeSubject = ref('math')
const books = ref(CURRICULUM_BOOKS)
const member = ref(false)
const todayBookId = ref('')
const loading = ref(false)
const progressMap = ref({})

const currentBook = computed(() => books.value.find((book) => book.subject === activeSubject.value) || null)

function loadProgress() {
  const next = {}
  for (const book of books.value) {
    for (const unit of book.units || []) {
      next[unit.id] = api.getUnitProgress(book.id, unit.id)
    }
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

async function loadBooks() {
  if (!IS_REMOTE) {
    books.value = CURRICULUM_BOOKS
    loadProgress()
    return
  }
  loading.value = true
  try {
    const payload = await fetchCurriculumBooks()
    books.value = payload.books?.length ? payload.books : CURRICULUM_BOOKS
    member.value = Boolean(payload.member)
    todayBookId.value = payload.today_book_id || ''
  } catch (error) {
    if (error.status === 401) {
      toast('请先登录')
    } else {
      toast(error.message || '教材目录加载失败')
    }
  } finally {
    loading.value = false
    loadProgress()
  }
}

async function startUnit(unit) {
  if (unit.locked) {
    goMember()
    return
  }
  const book = currentBook.value
  if (!book) return
  if (IS_REMOTE) {
    try {
      await activateCurriculumBook(book.id)
      todayBookId.value = book.id
    } catch (error) {
      const code = error.detail?.code
      if (code === 'curriculum_daily_limit') {
        uni.showModal({
          title: '今天已经学过一本教材',
          content: '免费版每天只能学 1 本，明天再来或开通会员随时切换三科。',
          confirmText: '开通会员',
          success: (res) => {
            if (res.confirm) goMember()
          }
        })
      } else {
        toast(error.message || '教材激活失败')
      }
      return
    }
  }
  const query = [
    `subject=${book.subject}`,
    `grade=${book.grade}`,
    `unit=${encodeURIComponent(unit.id)}`,
    `unit_name=${encodeURIComponent(unit.title)}`,
    `curriculum=${encodeURIComponent(book.id)}`
  ].join('&')
  uni.navigateTo({ url: `/pages/practice/practice?${query}` })
}

function goMember() {
  uni.navigateTo({ url: '/pages/member/member' })
}

function backToPractice() {
  uni.navigateBack({
    fail: () => uni.redirectTo({ url: '/pages/practice/practice' })
  })
}

onShow(loadBooks)
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
  font-size: 34rpx;
  font-weight: 800;
  color: #3f3157;
}

.curr-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 21rpx;
  color: #8a7a9a;
}

.subject-tabs {
  display: flex;
  gap: 10rpx;
  margin-top: 20rpx;
}

.subject-tab {
  flex: 1;
  text-align: center;
  padding: 12rpx 4rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.7);
  color: #7a6a8c;
  font-size: 22rpx;
}

.subject-tab.active {
  background: #fff;
  color: #6b4ee6;
  font-weight: 700;
  box-shadow: 0 8rpx 18rpx -12rpx rgba(90, 70, 180, 0.45);
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

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180rpx;
  color: #9a8aab;
  font-size: 22rpx;
}

.locked-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 20rpx;
  padding: 30rpx 24rpx;
  border-radius: 26rpx;
  background: #fff6e8;
  border: 1rpx solid #ffdfb5;
  color: #8a5b2c;
  text-align: center;
}

.locked-sub {
  font-size: 19rpx;
  color: #a98a68;
}

.locked-action {
  margin-top: 6rpx;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #7c6cff, #ff5f86);
  color: #fff;
  font-size: 21rpx;
  font-weight: 700;
}

.unit-card {
  margin-bottom: 18rpx;
  padding: 24rpx;
  border-radius: 30rpx;
  background: #fff;
  border: 1rpx solid #f2e9fb;
  box-shadow: 0 12rpx 28rpx -22rpx rgba(90, 60, 120, 0.35);
}

.unit-card.locked {
  background: #fbf9f6;
  border-color: #eee6dc;
}

.unit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.unit-head-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
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

.free-tag {
  padding: 3rpx 10rpx;
  border-radius: 999rpx;
  background: #e8f8ef;
  color: #1f9d62;
  font-size: 17rpx;
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

.unit-btn.locked {
  background: #f0e8f8;
  color: #9a8aab;
  box-shadow: none;
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
