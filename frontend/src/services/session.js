import { reactive } from 'vue'
import { engine } from './engine.js'

/**
 * 会话状态：孩子 / 家长视角、当前年级。
 * 存在本地数据引擎里，刷新页面也不会丢。
 */
export const session = reactive(engine.getSession())

export function syncSession() {
  Object.assign(session, engine.getSession())
  return session
}

export function switchRole(role) {
  engine.setRole(role)
  return syncSession()
}

export function switchGrade(grade) {
  engine.setGrade(grade)
  return syncSession()
}

export function toggleRole() {
  return switchRole(session.role === 'parent' ? 'child' : 'parent')
}
