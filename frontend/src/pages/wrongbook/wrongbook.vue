<template>
  <view class="page">
    <view class="page-head">
      <view>
        <text class="page-head-sub">把错题弄懂，比刷十道新题更有用</text>
      </view>
      <text class="tag">{{ pendingCount }} 道待掌握</text>
    </view>

    <view class="card flush">
      <view class="seg">
        <view
          v-for="item in filters"
          :key="item.key"
          class="seg-item"
          :class="{ active: filter === item.key }"
          @click="filter = item.key"
        >
          {{ item.label }} {{ item.count }}
        </view>
      </view>
      <view class="hint-row">
        <text class="muted small">答对重练题会自动标记为已掌握</text>
        <text class="card-link" @click="goPractice">去练习</text>
      </view>
    </view>

    <view v-if="!visibleList.length" class="card">
      <view class="empty">
        <text class="empty-emoji">{{ list.length ? '🔍' : '🎉' }}</text>
        <text>{{ list.length ? '这个分类下暂时没有错题' : '太棒了，错题本是空的！' }}</text>
      </view>
    </view>

    <view v-for="item in visibleList" :key="item.id" class="wrong-card">
      <view class="wrong-top">
        <view class="row">
          <text class="tag" :class="item.subject === 'math' ? '' : item.subject === 'chinese' ? 'green' : 'blue'">
            {{ item.subject_label }}
          </text>
          <text class="muted small">{{ item.grade }} 年级</text>
        </view>
        <text class="tag" :class="item.is_mastered ? 'green' : 'pink'">
          {{ item.is_mastered ? '✓ 已掌握' : `错 ${item.wrong_count} 次` }}
        </text>
      </view>

      <text class="wrong-content">{{ item.content }}</text>

      <view class="answer-row">
        <text class="answer-label">我的答案</text>
        <text class="answer-wrong">{{ item.wrong_answer || '（空）' }}</text>
      </view>
      <view class="answer-row">
        <text class="answer-label">正确答案</text>
        <text class="answer-right">{{ item.answer }}</text>
      </view>
      <text v-if="item.explanation" class="explain">💡 {{ item.explanation }}</text>

      <view class="wrong-actions">
        <input
          v-model="retryAnswers[item.id]"
          class="input retry-input"
          placeholder="再写一次答案"
          :disabled="item.is_mastered"
          confirm-type="done"
          @confirm="retry(item)"
        />
        <view class="btn btn-primary btn-sm" @click="retry(item)">重做</view>
      </view>
      <view class="wrong-foot">
        <text class="foot-time">{{ item.created_at }}</text>
        <view class="row">
          <text v-if="!item.is_mastered" class="foot-link green" @click="markMastered(item)">标记已掌握</text>
          <text class="foot-link danger" @click="removeItem(item)">删除</text>
        </view>
      </view>
    </view>

    <text class="safety-note">
      错题不是「笨」的证明，而是刚好找到可以进步的地方。
    </text>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { api, toast } from '../../services/api.js'
import { CHILD_ID } from '../../services/engineCore.js'

const list = ref([])
const filter = ref('pending')
const retryAnswers = ref({})

const pendingCount = computed(() => list.value.filter((item) => !item.is_mastered).length)

const filters = computed(() => [
  { key: 'pending', label: '待掌握', count: pendingCount.value },
  { key: 'mastered', label: '已掌握', count: list.value.filter((item) => item.is_mastered).length },
  { key: 'all', label: '全部', count: list.value.length }
])

const visibleList = computed(() => {
  if (filter.value === 'pending') return list.value.filter((item) => !item.is_mastered)
  if (filter.value === 'mastered') return list.value.filter((item) => item.is_mastered)
  return list.value
})

function load() {
  list.value = api.getWrongBook(CHILD_ID)
}

onShow(load)

function retry(item) {
  const answer = String(retryAnswers.value[item.id] ?? '').trim()
  if (!answer) {
    toast('先写一个答案再重做吧')
    return
  }
  try {
    const result = api.retryWrong({ wrong_id: item.id, answer })
    uni.showModal({
      title: result.is_correct ? '答对啦！🎉' : '再想想～',
      content: `${result.is_correct ? '已标记为掌握。' : `正确答案：${result.answer}`}\n${result.explanation || ''}`,
      showCancel: false
    })
    retryAnswers.value[item.id] = ''
    load()
  } catch (error) {
    toast(error?.message || '重做失败')
  }
}

function markMastered(item) {
  try {
    api.markWrongMastered(item.id)
    toast('已标记掌握，真棒！')
    load()
  } catch (error) {
    toast(error?.message || '操作失败')
  }
}

async function removeItem(item) {
  const confirmed = await new Promise((resolve) => {
    uni.showModal({
      title: '删除这道错题',
      content: '确定删除吗？删除后不会再出现在错题本里。',
      success: (res) => resolve(Boolean(res.confirm)),
      fail: () => resolve(false)
    })
  })
  if (!confirmed) return
  api.removeWrong(item.id)
  toast('已删除')
  load()
}

function goPractice() {
  uni.navigateTo({ url: '/pages/practice/practice' })
}
</script>

<style scoped>
.hint-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}

.wrong-card {
  background: #fff;
  border-radius: 30rpx;
  padding: 26rpx 24rpx;
  margin-top: 20rpx;
  box-shadow: 0 10rpx 28rpx rgba(120, 70, 30, 0.06);
}

.wrong-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.wrong-content {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.5;
  margin: 16rpx 0;
}

.answer-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-top: 6rpx;
}

.answer-label {
  font-size: 22rpx;
  color: #a2917f;
  width: 120rpx;
  flex-shrink: 0;
}

.answer-wrong {
  font-size: 26rpx;
  color: #e25b4a;
  font-weight: 600;
}

.answer-right {
  font-size: 26rpx;
  color: #1f9d68;
  font-weight: 600;
}

.explain {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #8d7f72;
  line-height: 1.6;
  background: #fffaf5;
  border-radius: 14rpx;
  padding: 14rpx 16rpx;
}

.wrong-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 18rpx;
}

.retry-input {
  flex: 1;
  min-height: 72rpx;
  padding: 12rpx 20rpx;
  font-size: 25rpx;
}

.wrong-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}

.foot-time {
  font-size: 20rpx;
  color: #c0b1a2;
}

.foot-link {
  font-size: 22rpx;
  padding: 6rpx 10rpx;
}

.foot-link.green {
  color: #1f9d68;
}

.foot-link.danger {
  color: #d98a7d;
}
</style>
