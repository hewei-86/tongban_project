import { engine } from './engine.js'

/**
 * 数据接口门面。
 *
 * 当前站点是「纯静态 + 本地数据」模式，数据保存在浏览器本地；
 * 若以后接入 FastAPI 后端，只需要在这里替换成 HTTP 实现，页面代码不用改。
 */
export const apiMode = 'local'

export const api = engine

export function toast(title, icon = 'none') {
  uni.showToast({ title: String(title || '').slice(0, 40), icon, duration: 1800 })
}

export function confirm(content, title = '提示') {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: (res) => resolve(Boolean(res.confirm)),
      fail: () => resolve(false)
    })
  })
}

export function successToast(title) {
  uni.showToast({ title, icon: 'success', duration: 1600 })
}

/** 统一错误提示，避免每个页面都写 try/catch 的 toast */
export function runSafely(action, fallbackMessage = '操作失败，请重试') {
  try {
    return action()
  } catch (error) {
    toast(error?.message || fallbackMessage)
    return null
  }
}
