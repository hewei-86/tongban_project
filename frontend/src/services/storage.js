import { STATE_KEY } from './engineCore.js'

/** uni-app 存储适配器（H5 落到 localStorage，小程序落到本地缓存） */
export function createUniStorage() {
  return {
    read() {
      try {
        const value = uni.getStorageSync(STATE_KEY)
        if (!value) return null
        return typeof value === 'string' ? value : JSON.stringify(value)
      } catch (error) {
        return null
      }
    },
    write(value) {
      uni.setStorageSync(STATE_KEY, value)
    },
    remove() {
      uni.removeStorageSync(STATE_KEY)
    }
  }
}

/** 内存存储（单元测试 / 隐私模式兜底） */
export function createMemoryStorage(initial = null) {
  let value = initial
  return {
    read: () => value,
    write: (next) => {
      value = next
    },
    remove: () => {
      value = null
    }
  }
}
