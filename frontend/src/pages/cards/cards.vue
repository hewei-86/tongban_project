<template>
  <view class="page">
    <view class="page-head">
      <view>
        <text class="page-head-sub">{{ gradeLabel }} · 每天记一点点</text>
      </view>
      <text class="tag">{{ favorites.length }} 张收藏</text>
    </view>

    <view class="tip-card">
      <text class="tip-label">今日一句</text>
      <text class="tip-text">{{ dailyTip }}</text>
    </view>

    <view class="seg card-seg">
      <view
        v-for="item in tabs"
        :key="item.key"
        class="seg-item"
        :class="{ active: tab === item.key }"
        @click="tab = item.key"
      >
        {{ item.label }}
      </view>
    </view>

    <!-- ============ 单词闪卡 ============ -->
    <template v-if="tab === 'word'">
      <view class="flash-card" @click="revealed = !revealed">
        <text class="flash-progress">{{ wordIndex + 1 }} / {{ words.length }}</text>
        <text class="flash-emoji">{{ currentWord.emoji }}</text>
        <text class="flash-word">{{ currentWord.word }}</text>
        <text class="flash-phonetic">{{ currentWord.phonetic }}</text>
        <view v-if="revealed" class="flash-reveal pop-in">
          <text class="flash-meaning">{{ currentWord.meaning }}</text>
          <text class="flash-example">{{ currentWord.example }}</text>
        </view>
        <text v-else class="flash-hint">点一下卡片，看看它的意思 ›</text>
        <view class="flash-badge" @click.stop="toggleFavorite('word', currentWord.id)">
          <text>{{ isFav('word', currentWord.id) ? '★ 已收藏' : '☆ 收藏' }}</text>
        </view>
      </view>

      <view class="flash-actions">
        <view class="btn btn-ghost" @click="prevWord">‹ 上一个</view>
        <view class="btn btn-primary" @click="nextWord">下一个 ›</view>
      </view>
      <text class="safety-note">先自己读一遍，再点开看意思，记得更牢。</text>
    </template>

    <!-- ============ 古诗 ============ -->
    <template v-else-if="tab === 'poem'">
      <view v-for="poem in poems" :key="poem.id" class="poem-card">
        <view class="poem-head">
          <view>
            <text class="poem-title">《{{ poem.title }}》</text>
            <text class="poem-author">{{ poem.author }} · {{ poem.grade }} 年级</text>
          </view>
          <view class="fav-btn" @click="toggleFavorite('poem', poem.id)">
            {{ isFav('poem', poem.id) ? '★' : '☆' }}
          </view>
        </view>
        <view class="poem-lines">
          <text v-for="line in poem.lines" :key="line" class="poem-line">{{ line }}</text>
        </view>
        <text class="poem-note">{{ poem.note }}</text>
      </view>
      <text class="safety-note">背古诗的小方法：读三遍 → 想画面 → 背一句遮一句。</text>
    </template>

    <!-- ============ 成语 ============ -->
    <template v-else-if="tab === 'idiom'">
      <view v-for="idiom in idioms" :key="idiom.id" class="idiom-card">
        <view class="idiom-head">
          <view>
            <text class="idiom-word">{{ idiom.word }}</text>
            <text class="idiom-pinyin">{{ idiom.pinyin }}</text>
          </view>
          <view class="fav-btn" @click="toggleFavorite('idiom', idiom.id)">
            {{ isFav('idiom', idiom.id) ? '★' : '☆' }}
          </view>
        </view>
        <text class="idiom-meaning">{{ idiom.meaning }}</text>
        <text class="idiom-example">例句：{{ idiom.example }}</text>
      </view>
    </template>

    <!-- ============ 收藏 ============ -->
    <template v-else>
      <view v-if="!favorites.length" class="card">
        <view class="empty">
          <text class="empty-emoji">⭐</text>
          <text>还没有收藏，点卡片上的星星试试</text>
        </view>
      </view>
      <view v-for="item in favorites" :key="item.kind + item.id" class="fav-card">
        <view class="fav-main">
          <text class="fav-kind">{{ kindLabel(item.kind) }}</text>
          <text class="fav-title">{{ favoriteTitle(item) }}</text>
          <text class="fav-sub">{{ favoriteSub(item) }}</text>
        </view>
        <text class="fav-remove" @click="toggleFavorite(item.kind, item.id)">取消</text>
      </view>
    </template>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { api, toast } from '../../services/api.js'
import { session } from '../../services/session.js'
import { getDailyTip, IDIOMS, POEMS, WORDS, wordsForGrade, poemsForGrade } from '../../data/cards.js'

const tabs = [
  { key: 'word', label: '单词' },
  { key: 'poem', label: '古诗' },
  { key: 'idiom', label: '成语' },
  { key: 'fav', label: '收藏' }
]
const grades = ['一年级', '二年级', '三年级']
const gradeLabel = computed(() => grades[(session.grade || 1) - 1] || '一年级')

const tab = ref('word')
const wordIndex = ref(0)
const revealed = ref(false)
const dailyTip = ref(getDailyTip())

const words = computed(() => {
  const list = wordsForGrade(session.grade || 1)
  return list.length ? list : WORDS
})
const poems = computed(() => {
  const list = poemsForGrade(session.grade || 1)
  return list.length ? list : POEMS
})
const idioms = IDIOMS
const currentWord = computed(() => words.value[wordIndex.value % words.value.length] || WORDS[0])
const favorites = ref(api.listFavorites())

function isFav(kind, id) {
  return favorites.value.some((item) => item.kind === kind && item.id === id)
}

function toggleFavorite(kind, id) {
  try {
    const result = api.toggleFavorite(kind, id)
    favorites.value = api.listFavorites()
    toast(result.favorited ? '已收藏 ⭐' : '已取消收藏')
    if (result.new_achievements?.length) {
      const text = result.new_achievements.map((item) => `${item.icon} ${item.name}`).join('\n')
      setTimeout(() => uni.showModal({ title: '🏅 解锁新成就', content: text, showCancel: false }), 300)
    }
  } catch (error) {
    toast(error?.message || '操作失败')
  }
}

function nextWord() {
  if (!words.value.length) return
  wordIndex.value = (wordIndex.value + 1) % words.value.length
  revealed.value = false
}

function prevWord() {
  if (!words.value.length) return
  wordIndex.value = (wordIndex.value - 1 + words.value.length) % words.value.length
  revealed.value = false
}

function kindLabel(kind) {
  return { word: '英语单词', poem: '古诗', idiom: '成语' }[kind] || '卡片'
}

function favoriteTitle(item) {
  if (!item.data) return '内容已删除'
  return item.kind === 'word' ? item.data.word : item.data.title || item.data.word
}

function favoriteSub(item) {
  if (!item.data) return ''
  if (item.kind === 'word') return `${item.data.phonetic} · ${item.data.meaning}`
  if (item.kind === 'poem') return item.data.author
  return item.data.meaning
}
</script>

<style scoped>
.tip-card {
  margin-top: 20rpx;
  background: linear-gradient(135deg, #fff2e4, #ffe8f0);
  border-radius: 26rpx;
  padding: 22rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.tip-label {
  font-size: 20rpx;
  color: #c47a4a;
  letter-spacing: 2rpx;
}

.tip-text {
  font-size: 26rpx;
  color: #5a4433;
  line-height: 1.55;
  font-weight: 600;
}

.card-seg {
  margin-top: 20rpx;
}

.flash-card {
  position: relative;
  margin-top: 20rpx;
  background: #fff;
  border-radius: 36rpx;
  padding: 30rpx 26rpx 34rpx;
  min-height: 460rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  box-shadow: 0 16rpx 38rpx rgba(120, 70, 30, 0.09);
  overflow: hidden;
}

.flash-card::after {
  content: '';
  position: absolute;
  width: 320rpx;
  height: 320rpx;
  border-radius: 50%;
  background: #fff7ef;
  top: -140rpx;
  right: -120rpx;
  z-index: 0;
}

.flash-progress {
  position: absolute;
  top: 24rpx;
  left: 28rpx;
  font-size: 20rpx;
  color: #b99a80;
  z-index: 1;
}

.flash-badge {
  position: absolute;
  top: 20rpx;
  right: 22rpx;
  font-size: 21rpx;
  color: #c47a4a;
  background: #fff4ea;
  border-radius: 999rpx;
  padding: 8rpx 18rpx;
  z-index: 2;
}

.flash-emoji {
  font-size: 96rpx;
  line-height: 1.2;
  position: relative;
  z-index: 1;
}

.flash-word {
  font-size: 60rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
  color: #2c241c;
  position: relative;
  z-index: 1;
}

.flash-phonetic {
  font-size: 24rpx;
  color: #a2917f;
  position: relative;
  z-index: 1;
}

.flash-reveal {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  position: relative;
  z-index: 1;
}

.flash-meaning {
  font-size: 34rpx;
  font-weight: 700;
  color: #ff6a45;
}

.flash-example {
  font-size: 24rpx;
  color: #6a5a4c;
}

.flash-hint {
  margin-top: 22rpx;
  font-size: 22rpx;
  color: #c0b1a2;
  position: relative;
  z-index: 1;
}

.flash-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.flash-actions .btn {
  flex: 1;
}

.poem-card,
.idiom-card,
.fav-card {
  background: #fff;
  border-radius: 30rpx;
  padding: 26rpx 24rpx;
  margin-top: 20rpx;
  box-shadow: 0 10rpx 26rpx rgba(120, 70, 30, 0.06);
}

.poem-head,
.idiom-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12rpx;
}

.poem-title {
  font-size: 32rpx;
  font-weight: 800;
  display: block;
}

.poem-author {
  font-size: 21rpx;
  color: #a2917f;
}

.fav-btn {
  font-size: 36rpx;
  color: #ffb020;
  padding: 0 6rpx;
  line-height: 1;
}

.poem-lines {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  margin: 18rpx 0 14rpx;
  padding: 16rpx 20rpx;
  background: #fffaf4;
  border-radius: 18rpx;
}

.poem-line {
  font-size: 30rpx;
  color: #3d342c;
  letter-spacing: 2rpx;
  line-height: 1.8;
}

.poem-note {
  font-size: 22rpx;
  color: #8d7f72;
  line-height: 1.6;
}

.idiom-word {
  font-size: 34rpx;
  font-weight: 800;
  display: block;
  letter-spacing: 2rpx;
}

.idiom-pinyin {
  font-size: 21rpx;
  color: #a2917f;
}

.idiom-meaning {
  display: block;
  margin-top: 14rpx;
  font-size: 25rpx;
  color: #4a3f35;
  line-height: 1.6;
}

.idiom-example {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #a2917f;
  line-height: 1.5;
}

.fav-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.fav-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.fav-kind {
  font-size: 19rpx;
  color: #c47a4a;
}

.fav-title {
  font-size: 28rpx;
  font-weight: 700;
}

.fav-sub {
  font-size: 21rpx;
  color: #a2917f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fav-remove {
  font-size: 22rpx;
  color: #d98a7d;
  padding: 10rpx;
}
</style>
