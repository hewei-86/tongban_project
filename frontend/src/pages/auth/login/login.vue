<template>
  <view class="auth-page">
    <view class="auth-brand">
      <view class="auth-mark">童</view>
      <text class="auth-name">童伴成长</text>
      <text class="auth-slogan">{{ isRemote ? '登录后，学习记录会在不同设备之间同步' : '登录后，学习记录只属于这个账号' }}</text>
    </view>

    <view class="auth-card">
      <text class="auth-title">欢迎回来</text>
      <text class="auth-sub">{{ isRemote ? '账号与学习数据保存在云端，换设备登录即可恢复' : '账号保存在这台设备的浏览器里，不会上传服务器' }}</text>

      <view v-if="accounts.length" class="account-chips">
        <view v-for="item in accounts" :key="item.id" class="account-chip" @click="fillAccount(item)">
          <text class="chip-name">{{ item.nickname }}</text>
          <text class="chip-account">{{ maskAccount(item.account) }}</text>
        </view>
      </view>

      <text class="auth-field">账号</text>
      <input
        v-model="form.account"
        class="auth-input"
        maxlength="20"
        placeholder="4—20 位字母、数字或下划线"
        confirm-type="next"
      />

      <text class="auth-field">密码</text>
      <view class="password-row">
        <input
          v-model="form.password"
          class="auth-input"
          :password="!showPassword"
          maxlength="64"
          placeholder="请输入密码"
          confirm-type="done"
          @confirm="submit"
        />
        <text class="eye-btn" @click="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</text>
      </view>

      <view v-if="error" class="auth-error">{{ error }}</view>

      <view class="auth-actions">
        <view class="btn btn-primary btn-block" :class="{ disabled: loading }" @click="submit">
          {{ loading ? '正在登录…' : '登录' }}
        </view>
      </view>

      <view class="auth-links">
        <text class="auth-link" @click="goRegister">注册新账号</text>
        <text v-if="!isRemote" class="auth-link muted-link" @click="goGuest">先随便看看</text>
      </view>

      <view v-if="current" class="auth-logged">
        <text class="auth-logged-text">当前已登录：{{ current.nickname }}（{{ maskAccount(current.account) }}）</text>
        <view class="auth-logged-actions">
          <text class="auth-link" @click="goHome">进入首页</text>
          <text class="auth-link danger" @click="doLogout">退出登录</text>
        </view>
      </view>
    </view>

    <text class="auth-note">
      {{ isRemote ? '密码经过加盐哈希后保存到服务器，不以明文存储；学习数据会自动同步到云端。' : '密码经过加盐哈希后保存在本机，不以明文存储。换设备或清理浏览器数据后，需要重新注册账号。' }}
      本页面是学习演示项目，请不要使用你在其它网站的真实密码。
    </text>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getCurrentAccount, listAccounts, login, logout } from '../../../services/auth.js'
import { maskAccount, validateAccount } from '../../../services/authRules.js'
import { syncSession } from '../../../services/session.js'
import { IS_REMOTE } from '../../../config.js'

const isRemote = IS_REMOTE

const form = ref({ account: '', password: '' })
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const current = ref(null)
const accounts = ref([])

onShow(() => {
  current.value = getCurrentAccount()
  accounts.value = listAccounts()
  if (!form.value.account && accounts.value.length) {
    form.value.account = accounts.value[0].account
  }
})

function fillAccount(item) {
  form.value.account = item.account
  form.value.password = ''
  error.value = ''
}

async function submit() {
  if (loading.value) return
  error.value = ''
  const accountCheck = validateAccount(form.value.account)
  if (!accountCheck.ok) {
    error.value = accountCheck.message
    return
  }
  if (!form.value.password) {
    error.value = '请输入密码'
    return
  }

  loading.value = true
  try {
    const result = await login({
      account: accountCheck.value,
      password: form.value.password
    })
    syncSession()
    uni.showToast({ title: `欢迎回来，${result.account.nickname}`, icon: 'none', duration: 1400 })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index/index' })
    }, 500)
  } catch (err) {
    error.value = err?.message || '登录失败，请重试'
    form.value.password = ''
  } finally {
    loading.value = false
  }
}

function goRegister() {
  uni.navigateTo({ url: '/pages/auth/register/register' })
}

function goGuest() {
  if (isRemote) return
  uni.reLaunch({ url: '/pages/index/index' })
}

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' })
}

function doLogout() {
  logout()
  syncSession()
  current.value = null
  form.value.password = ''
  error.value = ''
  uni.showToast({ title: isRemote ? '已退出登录' : '已退出，回到游客模式', icon: 'none' })
}
</script>
