<template>
  <view class="page" :class="{ 'keyboard-open': keyboardOpen }">
    <view class="ai-hero">
      <view class="ai-avatar">🤖</view>
      <view class="ai-intro">
        <text class="ai-name">AI 小老师</text>
        <text class="ai-desc">会算数、会背古诗、能查单词，还会听你说说今天的事</text>
      </view>
      <text class="ai-status">{{ sending ? '思考中…' : '在线' }}</text>
    </view>

    <view class="quick-wrap">
      <view v-for="prompt in quickPrompts" :key="prompt" class="quick-chip" @click="send(prompt)">
        {{ prompt }}
      </view>
    </view>

    <view class="chat-card">
      <view v-for="(message, i) in messages" :key="i" class="chat-row" :class="message.role">
        <view class="chat-avatar">{{ message.role === 'user' ? '我' : '师' }}</view>
        <view class="bubble-wrap">
          <view class="bubble" :class="message.role">
            <text class="bubble-text">{{ message.content }}</text>
          </view>
          <text v-if="message.created_at" class="bubble-time">{{ message.created_at }}</text>
        </view>
      </view>

      <view v-if="sending" class="chat-row assistant">
        <view class="chat-avatar">师</view>
        <view class="bubble assistant typing">
          <view class="typing-dots">
            <text></text>
            <text></text>
            <text></text>
          </view>
        </view>
      </view>
    </view>

    <view class="composer" :style="composerStyle">
      <input
        v-model="draft"
        class="composer-input"
        placeholder="把不会的题目告诉我吧"
        confirm-type="send"
        :adjust-position="true"
        :hold-keyboard="true"
        :cursor-spacing="24"
        @focus="handleComposerFocus"
        @blur="handleComposerBlur"
        @confirm="send()"
      />
      <view
        class="composer-btn"
        :class="{ disabled: sending || !draft.trim() }"
        @mousedown.prevent
        @click="send()"
      >
        发送
      </view>
    </view>

    <view class="ai-foot">
      <text class="safety-note">
        我是本地运行的 AI 程序，不是真人老师，答案可能有错。重要的知识请再和家长、老师确认；
        也不要发送真实姓名、住址、电话等隐私信息。
      </text>
      <text class="clear-link" @click="clearChat">清空对话</text>
    </view>

    <TabBar v-if="!keyboardOpen" active="ai" />
  </view>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import TabBar from '../../components/TabBar.vue'
import { api, toast } from '../../services/api.js'
import { session } from '../../services/session.js'
import { aiGreeting } from '../../services/aiTutor.js'
import { CHILD_ID } from '../../services/engineCore.js'

const quickPrompts = ['8 + 7 等于几？', '“春晓”怎么背？', '苹果的英文是什么？', '“守株待兔”是什么意思？', '我考得不好，有点难过']

const messages = ref([])
const draft = ref('')
const sending = ref(false)
const keyboardOpen = ref(false)
const keyboardOffset = ref(0)
let greeted = false

/**
 * 输入框悬浮在底部：
 * - 平时停在底部导航上方；
 * - 键盘弹起时隐藏底部导航，并按键盘高度上移（H5 用 visualViewport，兼容 iOS Safari）。
 */
const composerStyle = computed(() => {
  if (keyboardOpen.value) {
    return {
      bottom: `calc(20rpx + env(safe-area-inset-bottom) + ${keyboardOffset.value}px)`
    }
  }
  return { bottom: 'calc(142rpx + env(safe-area-inset-bottom))' }
})

function updateKeyboardOffset() {
  if (typeof window === 'undefined' || !window.visualViewport) return
  const viewport = window.visualViewport
  const offset = Math.max(0, window.innerHeight - (viewport.height + viewport.offsetTop))
  keyboardOffset.value = Math.round(offset)
}

let viewportListener = null

function handleComposerFocus() {
  keyboardOpen.value = true
  // 键盘动画结束后再量一次高度，兼容 iOS Safari
  setTimeout(updateKeyboardOffset, 120)
}

function handleComposerBlur() {
  keyboardOpen.value = false
  keyboardOffset.value = 0
}

onMounted(() => {
  if (typeof window === 'undefined' || !window.visualViewport) return
  viewportListener = () => updateKeyboardOffset()
  window.visualViewport.addEventListener('resize', viewportListener)
  window.visualViewport.addEventListener('scroll', viewportListener)
})

onUnload(() => {
  if (typeof window === 'undefined' || !window.visualViewport || !viewportListener) return
  window.visualViewport.removeEventListener('resize', viewportListener)
  window.visualViewport.removeEventListener('scroll', viewportListener)
  viewportListener = null
})

function greetingMessage() {
  return { role: 'assistant', content: aiGreeting(session.grade || 1), created_at: '' }
}

function loadHistory() {
  const history = api.getChatHistory(CHILD_ID, 40)
  messages.value = history.length ? history : [greetingMessage()]
  greeted = true
}

onShow(() => {
  if (!greeted) loadHistory()
})

onLoad((options = {}) => {
  if (options.q) {
    setTimeout(() => send(decodeURIComponent(options.q)), 300)
  }
})

function scrollToBottom() {
  nextTick(() => {
    uni.pageScrollTo({ scrollTop: 999999, duration: 200 })
  })
}

function send(text) {
  const content = String(text ?? draft.value ?? '').trim()
  if (!content || sending.value) return
  messages.value.push({ role: 'user', content, created_at: '' })
  draft.value = ''
  sending.value = true
  scrollToBottom()

  // 模拟一点点「思考」的时间，避免回复瞬间弹出显得生硬
  setTimeout(() => {
    try {
      const response = api.chatWithAi({
        user_id: CHILD_ID,
        grade: session.grade || 1,
        message: content
      })
      messages.value.push({ role: 'assistant', content: response.answer, created_at: '' })
      if (response.new_achievements?.length) {
        const list = response.new_achievements.map((item) => `${item.icon} ${item.name}`).join('\n')
        setTimeout(() => uni.showModal({ title: '🏅 解锁新成就', content: list, showCancel: false }), 300)
      }
    } catch (error) {
      toast(error?.message || '老师暂时走开了，请稍后再试')
    } finally {
      sending.value = false
      scrollToBottom()
    }
  }, 420)
}

async function clearChat() {
  const confirmed = await new Promise((resolve) => {
    uni.showModal({
      title: '清空对话',
      content: '确定要清空和 AI 小老师的对话记录吗？',
      success: (res) => resolve(Boolean(res.confirm)),
      fail: () => resolve(false)
    })
  })
  if (!confirmed) return
  api.clearChatHistory(CHILD_ID)
  messages.value = [greetingMessage()]
  toast('已清空')
}
</script>

<style scoped>
.ai-hero {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 24rpx 24rpx;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #f3eaff, #e8f0ff);
  box-shadow: 0 12rpx 30rpx rgba(120, 100, 200, 0.12);
}

.ai-avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 28rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42rpx;
  flex-shrink: 0;
}

.ai-intro {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.ai-name {
  font-size: 32rpx;
  font-weight: 800;
  color: #4b3a6b;
}

.ai-desc {
  font-size: 21rpx;
  color: #7b6a95;
  line-height: 1.4;
}

.ai-status {
  font-size: 20rpx;
  color: #6b4bd6;
  background: rgba(255, 255, 255, 0.8);
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}

.quick-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin: 20rpx 2rpx;
}

.quick-chip {
  font-size: 22rpx;
  color: #6b4bd6;
  background: #f6f0ff;
  border: 2rpx solid #ece0ff;
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
}

.chat-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 24rpx 22rpx;
  box-shadow: 0 12rpx 32rpx rgba(120, 70, 30, 0.07);
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  min-height: 400rpx;
}

.chat-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.chat-row.user {
  flex-direction: row-reverse;
}

.chat-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 18rpx;
  background: #ede4ff;
  color: #6b4bd6;
  text-align: center;
  line-height: 56rpx;
  font-size: 23rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.chat-row.user .chat-avatar {
  background: #ffe3d4;
  color: #e0663a;
}

.bubble-wrap {
  max-width: 78%;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.chat-row.user .bubble-wrap {
  align-items: flex-end;
}

.bubble {
  padding: 18rpx 22rpx;
  border-radius: 24rpx;
  background: #faf6f2;
}

.bubble.assistant {
  border-top-left-radius: 8rpx;
}

.bubble.user {
  background: linear-gradient(135deg, #ff9a5a, #ff6a45);
  border-top-right-radius: 8rpx;
}

.bubble-text {
  font-size: 26rpx;
  line-height: 1.65;
  color: #3d342c;
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble.user .bubble-text {
  color: #fff;
}

.bubble-time {
  font-size: 18rpx;
  color: #c0b1a2;
  padding: 0 6rpx;
}

.bubble.typing .bubble-text {
  color: #a2917f;
}

.composer {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 20rpx;
  padding: 8rpx 8rpx 8rpx 24rpx;
  background: #fff;
  border-radius: 999rpx;
  box-shadow: 0 10rpx 26rpx rgba(120, 70, 30, 0.08);
}

.composer-input {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  padding: 14rpx 0;
}

.composer-btn {
  padding: 18rpx 30rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff9a5a, #ff6a45);
  color: #fff;
  font-size: 25rpx;
  font-weight: 700;
}

.composer-btn.disabled {
  opacity: 0.5;
}

.ai-foot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  margin-top: 10rpx;
}

.clear-link {
  font-size: 22rpx;
  color: #b3a394;
  padding: 8rpx 20rpx;
}

/* ===== v2 视觉打磨 ===== */
.ai-hero { border-radius: 36rpx; background: linear-gradient(140deg, #f4ecff 0%, #e8f1ff 58%, #ffeef4 100%); border: 1rpx solid #fff; box-shadow: 0 18rpx 42rpx -22rpx rgba(120, 100, 220, 0.38); }
.ai-avatar { box-shadow: 0 10rpx 22rpx -12rpx rgba(120, 90, 220, 0.5); }
.chat-card { border-radius: 36rpx; border: 1rpx solid #fff1e7; }
.bubble { border-radius: 26rpx; box-shadow: 0 8rpx 18rpx -16rpx rgba(80, 50, 30, 0.35); }
.bubble.assistant { background: linear-gradient(160deg, #fbf7f2, #fffdfa); }
.composer { border: 1rpx solid #ffe7d6; box-shadow: 0 16rpx 34rpx -20rpx rgba(124, 76, 42, 0.38); }
.quick-chip { background: #fff; border: 1rpx solid #efe0ff; box-shadow: 0 6rpx 14rpx -10rpx rgba(120, 90, 220, 0.35); }
.typing-dots { display: flex; align-items: center; gap: 8rpx; padding: 8rpx 4rpx; }
.typing-dots text { width: 12rpx; height: 12rpx; border-radius: 50%; background: #b9a7d9; animation: typing-blink 1.2s infinite ease-in-out; }
.typing-dots text:nth-child(2) { animation-delay: 0.15s; }
.typing-dots text:nth-child(3) { animation-delay: 0.3s; }
@keyframes typing-blink { 0%, 100% { opacity: 0.3; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-4rpx); } }

/* ===== v2.1 聊天区 ===== */
.chat-card { background: linear-gradient(180deg, #fffdfa 0%, #ffffff 52%, #fffaf4 100%); min-height: 320rpx; }
.bubble.user { box-shadow: 0 12rpx 24rpx -14rpx rgba(255, 95, 62, 0.5); }

/* ===== 移动端输入体验 ===== */
.page.keyboard-open { padding-bottom: 40rpx; }
.composer { position: relative; z-index: 5; }
.composer-input { font-size: 32rpx; padding: 16rpx 0; min-height: 76rpx; }
.composer-btn { flex-shrink: 0; }

/* ===== 输入框悬浮固定 ===== */
.composer {
  position: fixed;
  left: 28rpx;
  right: 28rpx;
  bottom: calc(142rpx + env(safe-area-inset-bottom));
  margin-top: 0;
  margin-left: auto;
  margin-right: auto;
  max-width: 544px;
  z-index: 85;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(22rpx);
}

.page,
.page.keyboard-open {
  padding-bottom: 380rpx;
}
</style>
