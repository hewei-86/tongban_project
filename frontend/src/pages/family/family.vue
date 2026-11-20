<template>
  <view class="page">
    <view class="page-head">
      <view>
        <text class="page-head-sub">互相说说心里话，不评分输赢</text>
      </view>
      <text class="tag pink">{{ harmony.count || 0 }} 条记录</text>
    </view>

    <!-- 默契度 -->
    <view class="harmony-card">
      <view class="harmony-left">
        <view class="harmony-ring">
          <text class="harmony-score">{{ harmony.harmony_score || 0 }}</text>
          <text class="harmony-unit">默契度</text>
        </view>
      </view>
      <view class="harmony-right">
        <text class="harmony-title">{{ harmonyTitle }}</text>
        <view class="harmony-row">
          <text class="harmony-label">家长看孩子</text>
          <view class="mini-stars">
            <text v-for="n in 5" :key="'p' + n" :class="{ on: n <= Math.round(harmony.avg_scores?.parent_to_child || 0) }">★</text>
          </view>
        </view>
        <view class="harmony-row">
          <text class="harmony-label">孩子看家长</text>
          <view class="mini-stars">
            <text v-for="n in 5" :key="'c' + n" :class="{ on: n <= Math.round(harmony.avg_scores?.child_to_parent || 0) }">★</text>
          </view>
        </view>
        <text class="harmony-tip">互评是为了更了解对方，不是打分比赛。</text>
      </view>
    </view>

    <!-- 评价表单 -->
    <view class="card">
      <view class="card-head">
        <view>
          <text class="card-title">{{ isParent ? '给孩子的一句鼓励' : '给爸爸妈妈的一句话' }}</text>
          <text class="card-sub">{{ isParent ? '具体表扬，比“你真棒”更有力量' : '说说你的感受，他们也想听' }}</text>
        </view>
      </view>

      <text class="field-label">评价项目</text>
      <view class="chip-row">
        <view
          v-for="(item, i) in items"
          :key="item"
          class="chip"
          :class="{ active: itemIndex === i }"
          @click="itemIndex = i"
        >
          {{ item }}
        </view>
      </view>

      <text class="field-label">给几颗星</text>
      <view class="star-box">
        <view class="stars">
          <text v-for="n in 5" :key="n" class="star" :class="{ on: n <= score }" @click="score = n">★</text>
        </view>
        <text class="star-caption">{{ scoreLabels[score] }}</text>
      </view>

      <text class="field-label">想说的话（选填）</text>
      <textarea
        v-model="comment"
        class="textarea"
        maxlength="200"
        placeholder="写一句具体的话，比如：今天你自己收拾了书包，我很开心。"
      />
      <text class="word-count">{{ comment.length }}/200</text>

      <view class="btn btn-primary btn-block" @click="submit">提交评价</view>
      <text v-if="submittedMessage" class="submitted">{{ submittedMessage }}</text>
    </view>

    <!-- 记录 -->
    <view class="card">
      <view class="card-head">
        <view>
          <text class="card-title">最近的互评</text>
          <text class="card-sub">都收在家庭回忆里</text>
        </view>
      </view>
      <view v-if="!records.length" class="empty">
        <text class="empty-emoji">💌</text>
        <text>还没有互评记录，写下第一条吧</text>
      </view>
      <view v-for="item in records" :key="item.id" class="eval-card">
        <view class="eval-head">
          <text class="eval-direction" :class="item.direction">
            {{ item.direction === 'parent_to_child' ? '👨‍👩‍👧 家长 → 孩子' : '🧒 孩子 → 家长' }}
          </text>
          <text class="eval-time">{{ item.created_at }}</text>
        </view>
        <view class="eval-body">
          <text class="eval-item">{{ item.item }}</text>
          <view class="mini-stars">
            <text v-for="n in 5" :key="n" :class="{ on: n <= item.score }">★</text>
          </view>
        </view>
        <text v-if="item.comment" class="eval-comment">“{{ item.comment }}”</text>
      </view>
    </view>

    <text class="safety-note">
      家长和孩子都会看到这份记录。多写具体的行为，少用“总是”“从不”这样的词。
    </text>

    <TabBar :active="isParent ? 'family' : 'home'" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabBar from '../../components/TabBar.vue'
import { api, toast } from '../../services/api.js'
import { session } from '../../services/session.js'
import { EVALUATION_ITEMS } from '../../services/engineCore.js'

const scoreLabels = ['', '再接再厉', '有进步', '做得很好', '非常棒', '超级赞']
const isParent = computed(() => session.role === 'parent')
const items = computed(() => (isParent.value ? EVALUATION_ITEMS.parentToChild : EVALUATION_ITEMS.childToParent))

const harmony = ref({ harmony_score: 0, avg_scores: { parent_to_child: 0, child_to_parent: 0 }, count: 0 })
const records = ref([])
const itemIndex = ref(0)
const score = ref(5)
const comment = ref('')
const submittedMessage = ref('')

const harmonyTitle = computed(() => {
  const value = harmony.value.harmony_score || 0
  if (!harmony.value.count) return '还没有互评，先说说心里话吧'
  if (value >= 85) return '默契满满，继续保持这份理解'
  if (value >= 65) return '关系不错，多聊几句会更近'
  return '最近可能有点小摩擦，正好聊一聊'
})

function load() {
  harmony.value = api.getHarmony()
  records.value = api.listEvaluations(20)
  if (itemIndex.value >= items.value.length) itemIndex.value = 0
}

onShow(load)

function submit() {
  try {
    const result = api.createEvaluation({
      direction: isParent.value ? 'parent_to_child' : 'child_to_parent',
      item: items.value[itemIndex.value],
      score: score.value,
      comment: comment.value.trim()
    })
    submittedMessage.value = '已记录，谢谢你的认真表达 💛'
    comment.value = ''
    load()
    if (result.new_achievements?.length) {
      const text = result.new_achievements.map((item) => `${item.icon} ${item.name}`).join('\n')
      setTimeout(() => uni.showModal({ title: '🏅 解锁新成就', content: text, showCancel: false }), 300)
    } else {
      toast('提交成功')
    }
    setTimeout(() => {
      submittedMessage.value = ''
    }, 3000)
  } catch (error) {
    toast(error?.message || '提交失败')
  }
}
</script>

<style scoped>
.harmony-card {
  margin-top: 22rpx;
  display: flex;
  gap: 22rpx;
  padding: 26rpx 24rpx;
  border-radius: 34rpx;
  background: linear-gradient(135deg, #ffe8d4, #ffe1ea);
  box-shadow: 0 16rpx 34rpx rgba(255, 140, 120, 0.16);
}

.harmony-left {
  flex-shrink: 0;
}

.harmony-ring {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 8rpx 20rpx rgba(255, 120, 90, 0.16);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
}

.harmony-score {
  font-size: 52rpx;
  font-weight: 800;
  color: #ff5f86;
  line-height: 1;
}

.harmony-unit {
  font-size: 18rpx;
  color: #c47a4a;
}

.harmony-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.harmony-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #6a4230;
  line-height: 1.4;
}

.harmony-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
}

.harmony-label {
  font-size: 21rpx;
  color: #8a6248;
}

.harmony-tip {
  font-size: 19rpx;
  color: #a3775c;
  margin-top: 4rpx;
}

.mini-stars {
  display: flex;
  gap: 2rpx;
}

.mini-stars text {
  font-size: 22rpx;
  color: #e8d8c4;
}

.mini-stars text.on {
  color: #ffb020;
}

.star-box {
  background: #fffaf4;
  border-radius: 22rpx;
  padding: 18rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.stars {
  display: flex;
  gap: 12rpx;
}

.star {
  font-size: 54rpx;
  color: #e8d8c4;
  line-height: 1.2;
  transition: transform 0.15s ease;
}

.star.on {
  color: #ffb020;
  transform: scale(1.06);
}

.star-caption {
  font-size: 22rpx;
  color: #a2917f;
}

.word-count {
  display: block;
  text-align: right;
  font-size: 19rpx;
  color: #c0b1a2;
  margin: 6rpx 4rpx 0;
}

.submitted {
  display: block;
  margin-top: 16rpx;
  text-align: center;
  font-size: 24rpx;
  color: #1f9d68;
  background: #e9f9f1;
  border-radius: 16rpx;
  padding: 14rpx;
}

.eval-card {
  background: #fffaf4;
  border-radius: 22rpx;
  padding: 20rpx 22rpx;
  margin-top: 14rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.eval-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}

.eval-direction {
  font-size: 21rpx;
  color: #c47a4a;
  font-weight: 600;
}

.eval-direction.child_to_parent {
  color: #d2608a;
}

.eval-time {
  font-size: 19rpx;
  color: #c0b1a2;
}

.eval-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}

.eval-item {
  font-size: 27rpx;
  font-weight: 700;
}

.eval-comment {
  font-size: 23rpx;
  color: #6a5a4c;
  line-height: 1.5;
}
</style>
