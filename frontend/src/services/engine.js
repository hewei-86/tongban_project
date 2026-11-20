import { createEngine } from './engineCore.js'
import { createUniStorage } from './storage.js'

/** 全局单例：所有页面共享同一份本地数据 */
export const engine = createEngine(createUniStorage())
