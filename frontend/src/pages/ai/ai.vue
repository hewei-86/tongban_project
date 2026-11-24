<template>
  <view class="page" :class="{ 'keyboard-open': keyboardOpen }">
    <view class="ai-hero">
      <view class="ai-avatar">🤖</view>
      <view class="ai-intro">
        <text class="ai-name">AI 小老师</text>
        <text class="ai-desc">会算数、会背古诗、能查单词；点回答下方 🔊 可以朗读</text>
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
          <view v-if="message.role === 'assistant' || message.created_at" class="bubble-meta">
            <text v-if="message.created_at" class="bubble-time">{{ message.created_at }}</text>
            <text
              v-if="message.role === 'assistant'"
              class="speak-link"
              :class="{ active: speakingIndex === i }"
              @click.stop="speakMessage(message, i)"
            >
              {{ speakingIndex === i ? '⏹ 停止' : '🔊 朗读' }}
            </text>
          </view>
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
      <view class="composer-voice" :class="{ listening }" @click="toggleVoice">
        <text class="voice-icon">{{ listening ? '◉' : '🎤' }}</text>
      </view>
      <input
        v-model="draft"
        class="composer-input"
        placeholder="打字或点麦克风说话"
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
        {{ isRemote ? '我是 AI 程序（解析和讲解会调用通义千问），不是真人老师，答案可能有错。重要的知识请再和家长、老师确认；也不要发送真实姓名、住址、电话等隐私信息。' : '我是本地运行的 AI 程序，不是真人老师，答案可能有错。重要的知识请再和家长、老师确认；也不要发送真实姓名、住址、电话等隐私信息。' }}
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
import { IS_REMOTE } from '../../config.js'
import { chatWithAiRemote } from '../../services/aiRemote.js'

const isRemote = IS_REMOTE
const listening = ref(false)
const speakingIndex = ref(-1)
let recognition = null

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
  if (recognition) {
    try {
      recognition.stop()
    } catch (error) {
      // ignore
    }
    recognition = null
  }
  stopSpeech()
  if (typeof window === 'undefined' || !window.visualViewport || !viewportListener) return
  window.visualViewport.removeEventListener('resize', viewportListener)
  window.visualViewport.removeEventListener('scroll', viewportListener)
  viewportListener = null
})

function cleanSpeechText(text) {
  return String(text || '')
    .replace(/https?:\/\/\S+/g, '链接')
    .replace(/[*#`_>]/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function stopSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  speakingIndex.value = -1
}

function speakMessage(message, index) {
  if (typeof window === 'undefined' || !window.speechSynthesis || typeof window.SpeechSynthesisUtterance === 'undefined') {
    toast('当前浏览器不支持语音朗读，请用 Chrome / Edge')
    return
  }
  if (speakingIndex.value === index) {
    stopSpeech()
    return
  }
  const text = cleanSpeechText(message.content)
  if (!text) {
    toast('这条回答没有可朗读的内容')
    return
  }
  stopSpeech()
  try {
    const utterance = new window.SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.95
    utterance.pitch = 1
    const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : []
    const chinese = voices.find((voice) => /^zh/i.test(voice.lang) || /chinese|中文|普通话/i.test(voice.name))
    if (chinese) utterance.voice = chinese
    utterance.onend = () => {
      if (speakingIndex.value === index) speakingIndex.value = -1
    }
    utterance.onerror = () => {
      speakingIndex.value = -1
      toast('语音朗读失败，请重试')
    }
    speakingIndex.value = index
    window.speechSynthesis.speak(utterance)
  } catch (error) {
    speakingIndex.value = -1
    toast('语音朗读启动失败，请重试')
  }
}

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function showQuotaModal() {
  uni.showModal({
    title: '今日 AI 次数已用完',
    content: '免费版每天 5 次 AI 解析 / 出题 / 讲解。开通家庭会员，每天可用 100 次。',
    confirmText: '去会员',
    cancelText: '明天再来',
    success: (res) => {
      if (res.confirm) uni.navigateTo({ url: '/pages/member/member' })
    }
  })
}

function toggleVoice() {
  if (typeof window === 'undefined') {
    toast('当前端暂不支持语音输入')
    return
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    toast('当前浏览器不支持语音输入，请用 Chrome / Edge')
    return
  }
  if (!window.isSecureContext) {
    toast('语音输入需要 HTTPS 域名，当前 HTTP 站点无法使用麦克风')
    return
  }
  if (listening.value) {
    try {
      recognition && recognition.stop()
    } catch (error) {
      // ignore
    }
    return
  }
  try {
    recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onstart = () => {
      listening.value = true
    }
    recognition.onresult = (event) => {
      let text = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript
      }
      if (text.trim()) draft.value = text.trim()
    }
    recognition.onerror = (event) => {
      listening.value = false
      const messages = {
        'not-allowed': '请允许麦克风权限后再试',
        'no-speech': '没有听清，再说一遍吧',
        'audio-capture': '没有找到麦克风',
        network: '语音识别需要网络'
      }
      toast(messages[event.error] || '语音识别失败，请重试')
    }
    recognition.onend = () => {
      listening.value = false
      recognition = null
    }
    recognition.start()
  } catch (error) {
    listening.value = false
    toast('语音输入启动失败，请重试')
  }
}

async function send(text) {
  const content = String(text ?? draft.value ?? '').trim()
  if (!content || sending.value) return
  messages.value.push({ role: 'user', content, created_at: '' })
  draft.value = ''
  sending.value = true
  scrollToBottom()

  try {
    // 模拟一点点「思考」的时间，避免回复瞬间弹出显得生硬
    await sleep(420)
    let answer = ''
    let newly = []

    if (isRemote) {
      try {
        const remote = await chatWithAiRemote({
          message: content,
          grade: session.grade || 1,
          mode: 'chat'
        })
        if (remote.ai_generated && remote.answer) {
          answer = remote.answer
          newly = api.recordAiChat({ user_id: CHILD_ID, message: content, answer }) || []
        } else {
          const local = api.chatWithAi({ user_id: CHILD_ID, grade: session.grade || 1, message: content })
          answer = local.answer
          newly = local.new_achievements || []
        }
      } catch (error) {
        if (error.status === 429) {
          answer = '今天的 AI 次数已经用完了。明天再来，或者去会员中心开通家庭会员，每天可以用 100 次。'
          showQuotaModal()
        } else if (error.status === 401) {
          throw error
        } else {
          const local = api.chatWithAi({ user_id: CHILD_ID, grade: session.grade || 1, message: content })
          answer = local.answer
          newly = local.new_achievements || []
          toast('AI 老师暂时连不上，先用本地小老师回答')
        }
      }
    } else {
      const local = api.chatWithAi({ user_id: CHILD_ID, grade: session.grade || 1, message: content })
      answer = local.answer
      newly = local.new_achievements || []
    }

    messages.value.push({ role: 'assistant', content: answer, created_at: '' })
    if (newly?.length) {
      const list = newly.map((item) => `${item.icon} ${item.name}`).join('\n')
      setTimeout(() => uni.showModal({ title: '🏅 解锁新成就', content: list, showCancel: false }), 300)
    }
  } catch (error) {
    toast(error?.message || '老师暂时走开了，请稍后再试')
  } finally {
    sending.value = false
    scrollToBottom()
  }
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
  stopSpeech()
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

.bubble-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 6rpx;
}

.speak-link {
  font-size: 19rpx;
  color: #8b6fd6;
  background: #f6f1ff;
  border-radius: 999rpx;
  padding: 4rpx 12rpx;
  line-height: 1.4;
}

.speak-link.active {
  color: #fff;
  background: linear-gradient(135deg, #7c6cff, #ff5f86);
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

/* ===== 语音输入 ===== */
.composer-voice {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #fff3e8;
  border: 1rpx solid #ffe2cc;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.voice-icon { font-size: 30rpx; line-height: 1; }
.composer-voice.listening {
  background: linear-gradient(135deg, #ff7a4d, #ff5f86);
  border-color: transparent;
  animation: voice-pulse 1s infinite ease-in-out;
}
.composer-voice.listening .voice-icon { color: #fff; }
@keyframes voice-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 95, 134, 0.35); }
  50% { transform: scale(1.06); box-shadow: 0 0 0 12rpx rgba(255, 95, 134, 0); }
}
</style>
