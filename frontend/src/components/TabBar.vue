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
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  display: flex;
  max-width: 560px;
  margin: 0 auto;
  padding: 10rpx 8rpx calc(10rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(18rpx);
  border-radius: 30rpx 30rpx 0 0;
  box-shadow: 0 -8rpx 30rpx rgba(120, 70, 30, 0.08);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  padding: 8rpx 0;
  color: #a2917f;
}

.tab-item.active {
  color: #ff6a45;
}

.tab-icon {
  font-size: 36rpx;
  line-height: 1.2;
}

.tab-label {
  font-size: 19rpx;
  font-weight: 600;
}
</style>
