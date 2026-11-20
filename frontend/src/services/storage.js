import { STATE_KEY } from './engineCore.js'

/** 基于 uni 存储的适配器工厂（H5 落到 localStorage，小程序落到本地缓存） */
export function createStorage(key = STATE_KEY) {
  return {
    read() {
      try {
        const value = uni.getStorageSync(key)
        if (!value) return null
        return typeof value === 'string' ? value : JSON.stringify(value)
      } catch (error) {
        return null
      }
    },
    write(value) {
      uni.setStorageSync(key, value)
    },
    remove() {
      uni.removeStorageSync(key)
    }
  }
}

/** 游客模式使用的默认存储（保留历史数据） */
export function createUniStorage() {
  return createStorage(STATE_KEY)
}

/** 登录账号使用独立的存储键，账号之间数据互不影响 */
export function createAccountStorage(accountId) {
  return createStorage(accountId ? `${STATE_KEY}:${accountId}` : STATE_KEY)
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
