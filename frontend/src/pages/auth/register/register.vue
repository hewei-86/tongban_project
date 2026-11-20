<template>
  <view class="auth-page">
    <view class="auth-brand">
      <view class="auth-mark">童</view>
      <text class="auth-name">创建本机账号</text>
      <text class="auth-slogan">每个账号有独立的学习记录、积分和错题本</text>
    </view>

    <view class="auth-card">
      <text class="auth-title">注册</text>
      <text class="auth-sub">注册后会自动登录；账号信息只保存在当前浏览器</text>

      <text class="auth-field">昵称</text>
      <input
        v-model="form.nickname"
        class="auth-input"
        maxlength="12"
        placeholder="孩子的小名，例如：小童"
        confirm-type="next"
      />

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
          placeholder="至少 6 位"
          confirm-type="next"
        />
        <text class="eye-btn" @click="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</text>
      </view>

      <text class="auth-field">确认密码</text>
      <input
        v-model="form.confirmPassword"
        class="auth-input"
        :password="!showPassword"
        maxlength="64"
        placeholder="再输入一次密码"
        confirm-type="done"
        @confirm="submit"
      />

      <view class="agree-row" @click="agreed = !agreed">
        <view class="agree-box" :class="{ checked: agreed }">{{ agreed ? '✓' : '' }}</view>
        <text class="agree-text">
          我知道这是本机账号：换设备或清理浏览器数据后需要重新注册，游客模式的数据不会自动迁移过来。
        </text>
      </view>

      <view v-if="error" class="auth-error">{{ error }}</view>

      <view class="auth-actions">
        <view class="btn btn-primary btn-block" :class="{ disabled: loading }" @click="submit">
          {{ loading ? '正在创建…' : '注册并登录' }}
        </view>
      </view>

      <view class="auth-links">
        <text class="auth-link" @click="goLogin">已有账号，去登录</text>
        <text class="auth-link muted-link" @click="goGuest">先随便看看</text>
      </view>
    </view>

    <text class="auth-note">
      密码使用随机盐 + PBKDF2-SHA256 处理后保存在本机，不会明文上传。
      本项目用于学习演示，请不要使用你在其它网站的真实密码。
    </text>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { register } from '../../../services/auth.js'
import {
  validateAccount,
  validateNickname,
  validatePassword,
  validatePasswordConfirm
} from '../../../services/authRules.js'
import { syncSession } from '../../../services/session.js'

const form = ref({
  nickname: '',
  account: '',
  password: '',
  confirmPassword: ''
})
const agreed = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

function firstError() {
  const nicknameCheck = validateNickname(form.value.nickname)
  if (!nicknameCheck.ok) return nicknameCheck.message

  const accountCheck = validateAccount(form.value.account)
  if (!accountCheck.ok) return accountCheck.message

  const passwordCheck = validatePassword(form.value.password)
  if (!passwordCheck.ok) return passwordCheck.message

  const confirmCheck = validatePasswordConfirm(form.value.password, form.value.confirmPassword)
  if (!confirmCheck.ok) return confirmCheck.message

  if (!agreed.value) return '请先确认本机账号的说明'
  return ''
}

async function submit() {
  if (loading.value) return
  error.value = firstError()
  if (error.value) return

  loading.value = true
  try {
    const result = await register({
      nickname: form.value.nickname,
      account: form.value.account,
      password: form.value.password,
      confirmPassword: form.value.confirmPassword
    })
    syncSession()
    uni.showToast({ title: `注册成功，${result.account.nickname}`, icon: 'none', duration: 1500 })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index/index' })
    }, 600)
  } catch (err) {
    error.value = err?.message || '注册失败，请重试'
  } finally {
    loading.value = false
  }
}

function goLogin() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.redirectTo({ url: '/pages/auth/login/login' })
  }
}

function goGuest() {
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>
