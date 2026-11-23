<script>
import { IS_REMOTE } from './config.js'
import { getCurrentAccount, isLoggedIn } from './services/auth.js'
import { activateAccount } from './services/engine.js'
import { getUserId, pullIfNewer, setConflictHandler, writeCache, flush } from './services/stateSync.js'
import { syncSession } from './services/session.js'

function reloadCurrentPage() {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const route = current && current.route
  if (!route || route.startsWith('pages/auth/')) return
  uni.reLaunch({ url: `/${route}` })
}

function applyRemoteState(data) {
  const userId = getUserId()
  if (!userId) return
  if (data) writeCache(userId, data)
  activateAccount(`remote_${userId}`)
  syncSession()
  reloadCurrentPage()
}

let syncTimer = null

function stopSyncLoop() {
  if (syncTimer) clearInterval(syncTimer)
  syncTimer = null
}

function startSyncLoop() {
  stopSyncLoop()
  if (!IS_REMOTE) return
  // 另一台设备修改数据后，最多 30 秒内同步到当前页面
  syncTimer = setInterval(() => {
    pullIfNewer()
      .then((result) => {
        if (result.changed) applyRemoteState(result.data)
      })
      .catch((error) => {
        if (error && error.status !== 401) console.warn('[sync] 拉取失败：', error.message)
      })
  }, 30000)
}

export default {
  onLaunch() {
    if (!IS_REMOTE) {
      console.log('童伴成长已启动 · 本地数据模式')
      return
    }
    console.log('童伴成长已启动 · 云端数据模式')
    // 登录 / 注册后也会复用这个处理器
    setConflictHandler((detail) => {
      if (detail && detail.data) applyRemoteState(detail.data)
    })
    startSyncLoop()
    if (!isLoggedIn()) {
      uni.reLaunch({ url: '/pages/auth/login/login' })
    }
  },
  onShow() {
    if (!IS_REMOTE) return
    if (getCurrentAccount()) {
      pullIfNewer()
        .then((result) => {
          if (result.changed) applyRemoteState(result.data)
        })
        .catch((error) => {
          if (error && error.status !== 401) console.warn('[sync] 拉取失败：', error.message)
        })
    }
    startSyncLoop()
  },
  onHide() {
    stopSyncLoop()
    if (IS_REMOTE) flush()
  }
}
</script>

<style>
/* 全局设计系统：所有页面共用 */
@import './styles/app.css';

page {
  background-color: #fff8f2;
}

button {
  font-size: 28rpx;
}

button::after {
  border: none;
}
</style>
