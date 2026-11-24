/**
 * 浏览器语音合成（单词朗读 / AI 回答朗读可复用）。
 * 不依赖后端；不支持的环境返回 false，由页面提示。
 */

let currentUtterance = null
let currentText = ''

export function speechSupported() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.speechSynthesis) &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  )
}

export function stopSpeech() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  currentUtterance = null
  currentText = ''
}

/**
 * 朗读一段文字。
 * @returns {boolean} 是否成功启动（不代表播放完成）
 */
export function speak(text, { lang = 'zh-CN', rate = 0.9, pitch = 1, onEnd, onError } = {}) {
  if (!speechSupported()) {
    onError?.('unsupported')
    return false
  }
  const value = String(text || '').trim()
  if (!value) return false

  try {
    // 重复点同一个内容时先停掉，避免叠音
    window.speechSynthesis.cancel()
    const utterance = new window.SpeechSynthesisUtterance(value)
    utterance.lang = lang
    utterance.rate = rate
    utterance.pitch = pitch

    const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : []
    const prefix = lang.toLowerCase().startsWith('en') ? /^en/i : /^zh/i
    const voice = voices.find((item) => prefix.test(item.lang)) ||
      voices.find((item) => (lang.startsWith('en') ? /english|英语/i : /chinese|中文|普通话/i).test(item.name))
    if (voice) utterance.voice = voice

    utterance.onend = () => {
      currentUtterance = null
      currentText = ''
      onEnd?.()
    }
    utterance.onerror = (event) => {
      currentUtterance = null
      currentText = ''
      // canceled / interrupted 是主动停止，不弹错误
      if (event?.error === 'canceled' || event?.error === 'interrupted') return
      onError?.(event?.error || 'speech-failed')
    }
    currentUtterance = utterance
    currentText = value
    window.speechSynthesis.speak(utterance)
    return true
  } catch (error) {
    currentUtterance = null
    currentText = ''
    onError?.(error)
    return false
  }
}

export function speakingText() {
  return currentText
}

export function isSpeaking() {
  return Boolean(
    typeof window !== 'undefined' &&
      window.speechSynthesis &&
      window.speechSynthesis.speaking &&
      currentUtterance
  )
}
