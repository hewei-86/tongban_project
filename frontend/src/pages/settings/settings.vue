<template>
  <view class="page">
    <!-- 个人卡 -->
    <view class="profile-card">
      <view class="profile-top">
        <view class="profile-avatar">{{ isParent ? '家' : '童' }}</view>
        <view class="profile-main">
          <text class="profile-name">{{ isParent ? '家长账号' : growth.username || '小童' }}</text>
          <text class="profile-sub">
            {{ isParent ? '陪孩子一起成长' : `Lv.${growth.level || 1} · ${growth.grade || 1} 年级` }}
          </text>
        </view>
        <view class="profile-points">
          <text class="pp-num">{{ isParent ? familyMinutes : growth.points || 0 }}</text>
          <text class="pp-label">{{ isParent ? '家庭分钟' : '积分' }}</text>
        </view>
      </view>

      <view class="role-switch">
        <view class="role-btn" :class="{ active: !isParent }" @click="changeRole('child')">
          <text class="role-btn-icon">🧒</text>
          <text class="role-btn-label">孩子视角</text>
        </view>
        <view class="role-btn" :class="{ active: isParent }" @click="changeRole('parent')">
          <text class="role-btn-icon">👨‍👩‍👧</text>
          <text class="role-btn-label">家长视角</text>
        </view>
      </view>

      <view v-if="!isParent" class="grade-row">
        <text class="grade-label">当前年级</text>
        <picker :range="grades" :value="session.grade - 1" @change="onGradeChange">
          <view class="grade-value">{{ gradeLabel }} ▾</view>
        </picker>
      </view>
    </view>

    <!-- 功能入口 -->
    <view class="card">
      <view class="card-head tight">
        <text class="card-title">学习工具</text>
      </view>
      <view class="link-row" @click="goPage('/pages/wrongbook/wrongbook')">
        <view class="link-icon">📕</view>
        <view class="link-main">
          <text class="link-title">错题本</text>
          <text class="link-desc">{{ wrongCount }} 道待掌握</text>
        </view>
        <text class="link-arrow">›</text>
      </view>
      <view class="link-row" @click="goPage('/pages/cards/cards')">
        <view class="link-icon">📚</view>
        <view class="link-main">
          <text class="link-title">知识卡片</text>
          <text class="link-desc">单词 · 古诗 · 成语</text>
        </view>
        <text class="link-arrow">›</text>
      </view>
      <view class="link-row" @click="goPage('/pages/challenge/challenge')">
        <view class="link-icon">⚡</view>
        <view class="link-main">
          <text class="link-title">速算挑战</text>
          <text class="link-desc">60 秒，最高 {{ challengeBest }} 分</text>
        </view>
        <text class="link-arrow">›</text>
      </view>
      <view class="link-row" @click="goPage('/pages/family/family')">
        <view class="link-icon">💗</view>
        <view class="link-main">
          <text class="link-title">亲子互评</text>
          <text class="link-desc">互相说说心里话</text>
        </view>
        <text class="link-arrow">›</text>
      </view>
      <view class="link-row" @click="goPage('/pages/parent/parent')">
        <view class="link-icon">👨‍👩‍👧</view>
        <view class="link-main">
          <text class="link-title">家长中心</text>
          <text class="link-desc">报告 · 目标 · 时长管理</text>
        </view>
        <text class="link-arrow">›</text>
      </view>
    </view>

    <!-- 数据管理 -->
    <view class="card">
      <view class="card-head">
        <view>
          <text class="card-title">本机数据</text>
          <text class="card-sub">保存在浏览器，不上传服务器</text>
        </view>
        <text class="tag">{{ stats.kb || 0 }} KB</text>
      </view>

      <view class="data-grid">
        <view class="data-cell">
          <text class="data-num">{{ stats.records || 0 }}</text>
          <text class="data-label">练习记录</text>
        </view>
        <view class="data-cell">
          <text class="data-num">{{ stats.wrong || 0 }}</text>
          <text class="data-label">错题</text>
        </view>
        <view class="data-cell">
          <text class="data-num">{{ stats.chats || 0 }}</text>
          <text class="data-label">AI 对话</text>
        </view>
      </view>

      <view class="data-actions">
        <view class="btn btn-soft btn-sm" @click="exportData">📤 导出备份</view>
        <view class="btn btn-soft btn-sm" @click="showImport = !showImport">📥 导入数据</view>
        <view class="btn btn-ghost btn-sm danger-btn" @click="resetData">🗑 重置</view>
      </view>

      <textarea
        v-if="showImport"
        v-model="importText"
        class="textarea import-box"
        maxlength="-1"
        placeholder="把之前导出的 JSON 粘贴到这里，然后点击确认导入"
      />
      <view v-if="showImport" class="import-actions">
        <view class="btn btn-primary btn-sm" @click="importData">确认导入</view>
        <view class="btn btn-sm" @click="showImport = false; importText = ''">取消</view>
      </view>

      <text class="data-tip">
        刷新或关闭浏览器不会丢数据；清理浏览器数据、换设备后需要重新开始。建议定期导出备份。
      </text>
    </view>

    <!-- 关于 -->
    <view class="card">
      <view class="card-head tight">
        <text class="card-title">关于童伴</text>
        <text class="tag">v{{ version }}</text>
      </view>
      <view class="about-row">
        <text class="about-key">运行模式</text>
        <text class="about-value">纯静态 · 本地数据</text>
      </view>
      <view class="about-row">
        <text class="about-key">技术栈</text>
        <text class="about-value">uni-app + Vue 3 + 本地数据引擎</text>
      </view>
      <view class="about-row">
        <text class="about-key">适用年级</text>
        <text class="about-value">小学 1—3 年级</text>
      </view>

      <text class="about-text">
        童伴成长是一个面向小学低年级的 AI 学习与亲子陪伴练习项目。AI 小老师由本地规则驱动，不会把对话发到任何服务器；
        它的回答可能有误，重要的知识请再和家长、老师确认。
      </text>
      <text class="about-text">
        本项目用于学习和演示，不替代学校教学，也不收集真实的儿童个人信息。正式上线前还需要完成监护人授权、内容审核、隐私政策与备案等合规工作。
      </text>

      <view class="repo-row" @click="copyRepo">
        <text class="repo-label">GitHub 仓库</text>
        <text class="repo-value">hewei-86/tongban_project ›</text>
      </view>
    </view>

    <text class="safety-note">童伴成长 · 陪孩子慢慢长大</text>

    <TabBar active="mine" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabBar from '../../components/TabBar.vue'
import { api, toast } from '../../services/api.js'
import { session, switchGrade, switchRole, syncSession } from '../../services/session.js'
import { CHILD_ID } from '../../services/engineCore.js'

const version = '2.0.0'
const repoUrl = 'https://github.com/hewei-86/tongban_project'
const grades = ['一年级', '二年级', '三年级']

const stats = ref({})
const growth = ref({})
const parentData = ref({ children: [] })
const challengeStats = ref({ best: 0 })
const showImport = ref(false)
const importText = ref('')

const isParent = computed(() => session.role === 'parent')
const gradeLabel = computed(() => grades[(session.grade || 1) - 1] || '一年级')
const wrongCount = computed(() => stats.value.wrong || 0)
const challengeBest = computed(() => challengeStats.value.best || 0)
const familyMinutes = computed(() =>
  (parentData.value.children || []).reduce((sum, item) => sum + (item.total_minutes || 0), 0)
)

function load() {
  stats.value = api.getStorageInfo()
  growth.value = api.getGrowth(CHILD_ID)
  parentData.value = api.getParentDashboard()
  challengeStats.value = api.getChallengeStats()
  const profile = api.getDashboard(CHILD_ID)
  growth.value.username = profile.username
}

onShow(() => {
  syncSession()
  load()
})

function changeRole(role) {
  if (session.role === role) return
  switchRole(role)
  load()
  toast(role === 'parent' ? '已切换到家长视角' : '已切换到孩子视角')
}

function onGradeChange(event) {
  const index = Number(event.detail.value) + 1
  switchGrade(index)
  load()
  toast(`已切换到 ${grades[index - 1]}`)
}

function goPage(url) {
  uni.navigateTo({ url })
}

function exportData() {
  const text = api.exportData()
  uni.setClipboardData({
    data: text,
    success: () => toast(`已复制备份（${Math.round(text.length / 1024)} KB）`),
    fail: () => toast('复制失败，请检查浏览器权限')
  })
}

function importData() {
  const text = importText.value.trim()
  if (!text) {
    toast('先粘贴备份内容')
    return
  }
  try {
    const result = api.importData(text)
    importText.value = ''
    showImport.value = false
    syncSession()
    load()
    toast(`导入成功，共 ${result.records} 条练习记录`)
  } catch (error) {
    toast(error?.message || '导入失败')
  }
}

async function resetData() {
  const first = await new Promise((resolve) => {
    uni.showModal({
      title: '重置所有数据',
      content: '会清空练习记录、错题、成就、积分和对话，且无法恢复。确定继续吗？',
      confirmText: '继续',
      success: (res) => resolve(Boolean(res.confirm)),
      fail: () => resolve(false)
    })
  })
  if (!first) return
  const second = await new Promise((resolve) => {
    uni.showModal({
      title: '再确认一次',
      content: '真的要清空吗？建议先导出备份。',
      confirmText: '清空',
      confirmColor: '#e25b4a',
      success: (res) => resolve(Boolean(res.confirm)),
      fail: () => resolve(false)
    })
  })
  if (!second) return
  api.resetAll()
  syncSession()
  load()
  toast('已重置为初始状态')
}

function copyRepo() {
  uni.setClipboardData({
    data: repoUrl,
    success: () => toast('仓库地址已复制')
  })
}
</script>

<style scoped>
.profile-card {
  margin-top: 20rpx;
  border-radius: 36rpx;
  padding: 28rpx 26rpx;
  background: linear-gradient(150deg, #fff 0%, #fff6ee 100%);
  box-shadow: 0 14rpx 34rpx rgba(120, 70, 30, 0.08);
}

.profile-top {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.profile-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 30rpx;
  background: linear-gradient(135deg, #ffb067, #ff6a45);
  color: #fff;
  font-size: 40rpx;
  font-weight: 700;
  text-align: center;
  line-height: 96rpx;
  flex-shrink: 0;
}

.profile-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.profile-name {
  font-size: 34rpx;
  font-weight: 800;
}

.profile-sub {
  font-size: 21rpx;
  color: #a2917f;
}

.profile-points {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.pp-num {
  font-size: 40rpx;
  font-weight: 800;
  color: #ff6a45;
  line-height: 1.1;
}

.pp-label {
  font-size: 18rpx;
  color: #a2917f;
}

.role-switch {
  display: flex;
  gap: 10rpx;
  margin-top: 22rpx;
  background: #f7efe7;
  border-radius: 22rpx;
  padding: 6rpx;
}

.role-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 14rpx 0;
  border-radius: 18rpx;
  color: #8d8074;
}

.role-btn.active {
  background: #fff;
  color: #e0663a;
  font-weight: 700;
  box-shadow: 0 4rpx 12rpx rgba(120, 70, 30, 0.08);
}

.role-btn-icon {
  font-size: 26rpx;
}

.role-btn-label {
  font-size: 24rpx;
}

.grade-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18rpx;
  padding: 14rpx 18rpx;
  background: #fffaf4;
  border-radius: 18rpx;
}

.grade-label {
  font-size: 23rpx;
  color: #8d7f72;
}

.grade-value {
  font-size: 24rpx;
  font-weight: 700;
  color: #e0663a;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.data-cell {
  background: #fff8f1;
  border-radius: 18rpx;
  padding: 16rpx 4rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
}

.data-num {
  font-size: 30rpx;
  font-weight: 800;
  color: #2c241c;
}

.data-label {
  font-size: 18rpx;
  color: #a2917f;
}

.data-actions {
  display: flex;
  gap: 10rpx;
  margin-top: 18rpx;
  flex-wrap: wrap;
}

.data-actions .btn {
  flex: 1;
  min-width: 180rpx;
}

.danger-btn {
  color: #d98a7d;
  border-color: #f6d9d2;
}

.import-box {
  margin-top: 16rpx;
  font-size: 22rpx;
}

.import-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
}

.import-actions .btn {
  flex: 1;
}

.data-tip {
  display: block;
  margin-top: 16rpx;
  font-size: 20rpx;
  color: #b3a394;
  line-height: 1.6;
}

.about-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 2rpx solid #f7eee6;
}

.about-key {
  font-size: 23rpx;
  color: #8d7f72;
}

.about-value {
  font-size: 23rpx;
  color: #2c241c;
  font-weight: 600;
}

.about-text {
  display: block;
  margin-top: 14rpx;
  font-size: 21rpx;
  color: #8d7f72;
  line-height: 1.7;
}

.repo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18rpx;
  padding: 16rpx 18rpx;
  background: #fffaf4;
  border-radius: 18rpx;
}

.repo-label {
  font-size: 23rpx;
  color: #8d7f72;
}

.repo-value {
  font-size: 22rpx;
  color: #e0663a;
  font-weight: 600;
}
</style>
