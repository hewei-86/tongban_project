/**
 * 构建期配置
 *
 * - local：GitHub Pages / 本机演示，数据保存在浏览器
 * - remote：自有服务器产品版，账号与数据走 MySQL
 */
const rawMode = import.meta.env.VITE_DATA_MODE

export const DATA_MODE = rawMode === 'remote' ? 'remote' : 'local'
export const IS_REMOTE = DATA_MODE === 'remote'

// 同源部署时留空即可；本地联调可设置为 http://127.0.0.1:8000
export const API_BASE = String(import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')
