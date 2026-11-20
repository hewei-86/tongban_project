<template>
  <view class="tabbar">
    <view
      v-for="item in items"
      :key="item.key"
      class="tab-item"
      :class="{ active: item.key === active }"
      @click="go(item)"
    >
      <text class="tab-icon">{{ item.icon }}</text>
      <text class="tab-label">{{ item.label }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { session } from '../services/session.js'

const props = defineProps({
  active: { type: String, default: 'home' }
})

const childTabs = [
  { key: 'home', label: '首页', icon: '🏠', path: '/pages/index/index' },
  { key: 'practice', label: '练习', icon: '✏️', path: '/pages/practice/practice' },
  { key: 'ai', label: 'AI老师', icon: '🤖', path: '/pages/ai/ai' },
  { key: 'growth', label: '成长', icon: '🏆', path: '/pages/growth/growth' },
  { key: 'mine', label: '我的', icon: '🙋', path: '/pages/settings/settings' }
]

const parentTabs = [
  { key: 'home', label: '首页', icon: '🏠', path: '/pages/index/index' },
  { key: 'parent', label: '家长中心', icon: '👨‍👩‍👧', path: '/pages/parent/parent' },
  { key: 'family', label: '亲子互评', icon: '💗', path: '/pages/family/family' },
  { key: 'growth', label: '成长', icon: '🏆', path: '/pages/growth/growth' },
  { key: 'mine', label: '我的', icon: '🙋', path: '/pages/settings/settings' }
]

const items = computed(() => (session.role === 'parent' ? parentTabs : childTabs))

function go(item) {
  if (item.key === props.active) return
  uni.reLaunch({ url: item.path })
}
</script>

<style scoped>
.tabbar {
  position: fixed;
  left: 22rpx;
  right: 22rpx;
  bottom: calc(20rpx + env(safe-area-inset-bottom));
  z-index: 90;
  display: flex;
  max-width: 560px;
  margin: 0 auto;
  padding: 10rpx;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(26rpx);
  border-radius: 40rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 24rpx 50rpx -20rpx rgba(124, 76, 42, 0.42), 0 2rpx 6rpx rgba(124, 76, 42, 0.06);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  padding: 12rpx 0 10rpx;
  border-radius: 30rpx;
  color: #a2917f;
  transition: background 0.2s ease, color 0.2s ease;
}

.tab-item.active {
  color: #f2552f;
  background: linear-gradient(165deg, #fff0e6, #ffe2d3);
  box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.9);
}

.tab-icon {
  font-size: 36rpx;
  line-height: 1.2;
  transition: transform 0.2s ease;
}

.tab-item.active .tab-icon {
  transform: translateY(-2rpx) scale(1.08);
}

.tab-label {
  font-size: 19rpx;
  font-weight: 600;
}
</style>
