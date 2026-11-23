<template>
  <view class="page member-page">
    <view class="member-hero">
      <view class="hero-row">
        <view class="hero-icon">🌟</view>
        <view class="hero-main">
          <text class="hero-title">{{ status.is_member ? '家庭会员' : '免费版' }}</text>
          <text class="hero-sub">
            {{ status.is_member ? `有效期至 ${formatDate(status.expires_at)} · 剩余 ${status.days_left} 天` : '开通会员，解锁更多 AI 出题与复习权益' }}
          </text>
        </view>
        <text class="hero-badge">{{ status.is_member ? '已开通' : '未开通' }}</text>
      </view>
      <view class="quota-row">
        <view class="quota-cell">
          <text class="quota-num">{{ status.ai_left_today ?? 0 }}</text>
          <text class="quota-label">今日 AI 剩余</text>
        </view>
        <view class="quota-cell">
          <text class="quota-num">{{ status.ai_used_today ?? 0 }}</text>
          <text class="quota-label">今日已用</text>
        </view>
        <view class="quota-cell">
          <text class="quota-num">{{ status.ai_quota ?? 5 }}</text>
          <text class="quota-label">每日额度</text>
        </view>
      </view>
    </view>

    <view v-if="!isRemote" class="card notice-card">
      <text class="notice-title">当前是本地演示版</text>
      <text class="notice-text">会员功能需要登录服务器版账号后使用。打开 http://120.26.177.245/ 注册登录即可。</text>
    </view>

    <template v-else>
      <view class="card plan-card">
        <view class="plan-head">
          <view>
            <text class="plan-name">家庭会员</text>
            <text class="plan-sub">AI 解析、出题、讲解共用每日次数</text>
          </view>
          <view class="plan-price">
            <text class="price-num">99</text>
            <text class="price-unit">元/年</text>
          </view>
        </view>
        <view class="feature-list">
          <view v-for="item in proFeatures" :key="item" class="feature-row">
            <text class="feature-dot">✓</text>
            <text class="feature-text">{{ item }}</text>
          </view>
        </view>
        <view class="buy-note">
          <text class="buy-note-title">内测期间：兑换码开通</text>
          <text class="buy-note-text">联系管理员购买会员兑换码，在下方输入后立即生效；暂未接入在线支付。</text>
        </view>
      </view>

      <view class="card redeem-card">
        <text class="section-title">兑换会员</text>
        <text class="section-sub">输入管理员提供的兑换码，例如 TB-XXXX-XXXX</text>
        <view class="redeem-row">
          <input v-model="code" class="redeem-input" placeholder="输入兑换码" maxlength="32" />
          <view class="btn btn-primary" :class="{ disabled: redeeming }" @click="redeem">
            {{ redeeming ? '兑换中…' : '立即兑换' }}
          </view>
        </view>
      </view>

      <view class="card">
        <text class="section-title">免费版包含</text>
        <view class="feature-list">
          <view v-for="item in freeFeatures" :key="item" class="feature-row">
            <text class="feature-dot mint">✓</text>
            <text class="feature-text">{{ item }}</text>
          </view>
        </view>
      </view>

      <view class="member-foot">
        <text>会员为虚拟服务，开通后不支持退款；如有问题请联系管理员。</text>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { API_BASE, IS_REMOTE } from '../../config.js'
import { getToken } from '../../services/remoteAuth.js'

const isRemote = IS_REMOTE
const status = ref({ plan: 'free', is_member: false, ai_left_today: 5, ai_used_today: 0, ai_quota: 5 })
const plans = ref([])
const code = ref('')
const redeeming = ref(false)

const freeFeatures = ['每日练习与成长记录', '每天 5 次 AI 解析 / 出题 / 讲解', '错题本与基础统计']
const proFeatures = ['每天 100 次 AI 解析 / 出题 / 讲解', 'AI 次数是免费版的 20 倍', '新功能优先体验', '支持童伴持续开发']

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  let data = null
  try {
    data = await response.json()
  } catch (error) {
    data = null
  }
  if (!response.ok) {
    const message = typeof data?.detail === 'string' ? data.detail : data?.detail?.message || '请求失败'
    throw new Error(message)
  }
  return data
}

async function load() {
  if (!isRemote) return
  try {
    const [statusData, plansData] = await Promise.all([
      request('/api/membership/status'),
      request('/api/membership/plans')
    ])
    status.value = statusData
    plans.value = plansData.items || []
  } catch (error) {
    uni.showToast({ title: error.message || '加载失败', icon: 'none' })
  }
}

async function redeem() {
  if (!code.value.trim() || redeeming.value) return
  redeeming.value = true
  try {
    const data = await request('/api/membership/redeem', {
      method: 'POST',
      body: { code: code.value.trim() }
    })
    status.value = data.membership
    code.value = ''
    uni.showToast({ title: '兑换成功，会员已开通', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error.message || '兑换失败', icon: 'none' })
  } finally {
    redeeming.value = false
  }
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : '-'
}

onShow(load)
</script>

<style scoped>
.member-page { padding-bottom: 60rpx; }
.member-hero {
  border-radius: 36rpx;
  padding: 30rpx;
  background: linear-gradient(140deg, #fff1d9 0%, #ffe4d0 55%, #ffe9f1 100%);
  border: 1rpx solid #fff;
  box-shadow: 0 18rpx 40rpx -24rpx rgba(180, 110, 50, 0.45);
}
.hero-row { display: flex; align-items: center; gap: 18rpx; }
.hero-icon { width: 82rpx; height: 82rpx; border-radius: 26rpx; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 38rpx; }
.hero-main { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.hero-title { font-size: 36rpx; font-weight: 800; color: #6b3f1f; }
.hero-sub { font-size: 22rpx; color: #a06f4b; line-height: 1.4; }
.hero-badge { font-size: 20rpx; color: #b3542a; background: rgba(255, 255, 255, 0.8); padding: 8rpx 14rpx; border-radius: 999rpx; }
.quota-row { display: flex; margin-top: 26rpx; background: rgba(255, 255, 255, 0.66); border-radius: 22rpx; padding: 16rpx 0; }
.quota-cell { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.quota-num { font-size: 34rpx; font-weight: 800; color: #7a4526; }
.quota-label { font-size: 20rpx; color: #a5775a; }
.plan-card { margin-top: 22rpx; }
.plan-head { display: flex; justify-content: space-between; align-items: flex-start; }
.plan-name { font-size: 30rpx; font-weight: 800; }
.plan-sub { display: block; font-size: 21rpx; color: #a2917f; margin-top: 6rpx; }
.plan-price { display: flex; align-items: baseline; gap: 4rpx; color: #e85d35; }
.price-num { font-size: 52rpx; font-weight: 800; }
.price-unit { font-size: 20rpx; }
.feature-list { margin-top: 18rpx; display: flex; flex-direction: column; gap: 12rpx; }
.feature-row { display: flex; align-items: center; gap: 10rpx; }
.feature-dot { width: 32rpx; height: 32rpx; border-radius: 50%; background: #fff0e4; color: #e86437; display: flex; align-items: center; justify-content: center; font-size: 20rpx; font-weight: 800; flex-shrink: 0; }
.feature-dot.mint { background: #e8f8f0; color: #1fa97a; }
.feature-text { font-size: 24rpx; color: #5d4a3b; }
.buy-note { margin-top: 22rpx; background: #fff8f0; border: 1rpx dashed #ffd9bf; border-radius: 18rpx; padding: 16rpx 18rpx; display: flex; flex-direction: column; gap: 6rpx; }
.buy-note-title { font-size: 23rpx; font-weight: 700; color: #b3542a; }
.buy-note-text { font-size: 21rpx; color: #a07a60; line-height: 1.5; }
.redeem-card { margin-top: 22rpx; }
.section-title { font-size: 27rpx; font-weight: 800; }
.section-sub { display: block; font-size: 21rpx; color: #a2917f; margin-top: 6rpx; margin-bottom: 16rpx; }
.redeem-row { display: flex; gap: 12rpx; align-items: center; }
.redeem-input { flex: 1; min-width: 0; background: #fbf6f0; border: 1rpx solid #f0e0d2; border-radius: 18rpx; padding: 16rpx 18rpx; font-size: 26rpx; }
.redeem-row .btn { flex-shrink: 0; padding: 16rpx 24rpx; font-size: 24rpx; }
.notice-card { margin-top: 22rpx; }
.notice-title { font-size: 26rpx; font-weight: 800; }
.notice-text { display: block; font-size: 22rpx; color: #8a7a6a; margin-top: 8rpx; line-height: 1.5; }
.member-foot { text-align: center; color: #b3a394; font-size: 20rpx; margin-top: 24rpx; line-height: 1.5; }
</style>
