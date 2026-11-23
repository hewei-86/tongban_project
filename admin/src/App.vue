<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

const TOKEN_KEY = 'tongban_admin_token'
const USER_KEY = 'tongban_admin_user'

const token = ref(localStorage.getItem(TOKEN_KEY) || '')
const admin = ref(JSON.parse(localStorage.getItem(USER_KEY) || 'null'))
const tab = ref('dashboard')
const loading = ref(false)
const error = ref('')
const notice = ref('')
const loginForm = reactive({ username: 'admin', password: '' })
const usernameInput = ref(null)
const passwordInput = ref(null)

const dashboard = ref(null)
const users = ref({ items: [], total: 0, page: 1 })
const userSearch = ref('')
const codes = ref({ items: [] })
const codeFilter = ref('all')
const codeForm = reactive({ count: 10, days: 365 })
const generatedCodes = ref([])
const questions = ref({ items: [] })
const questionForm = reactive({ subject: 'math', grade: 1, content: '', answer: '', explanation: '', options: '' })
const pkMatches = ref({ items: [] })

const navItems = [
  { key: 'dashboard', label: '数据概览', icon: '📊' },
  { key: 'users', label: '用户管理', icon: '👨‍👩‍👧' },
  { key: 'codes', label: '会员兑换码', icon: '🎟️' },
  { key: 'questions', label: '题库管理', icon: '📚' },
  { key: 'pk', label: 'PK 对局', icon: '⚔️' }
]

const currentTitle = computed(() => navItems.find((item) => item.key === tab.value)?.label || '')

function flash(message, isError = false) {
  if (isError) {
    error.value = message
    notice.value = ''
  } else {
    notice.value = message
    error.value = ''
  }
  setTimeout(() => {
    if (notice.value === message) notice.value = ''
    if (error.value === message) error.value = ''
  }, 3000)
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token.value) headers.Authorization = `Bearer ${token.value}`
  const response = await fetch(`/api/admin${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  let data = null
  try {
    data = await response.json()
  } catch (e) {
    data = null
  }
  if (!response.ok) {
    if (response.status === 401) logout(false)
    const detail = data?.detail
    let message
    if (typeof detail === 'string') message = detail
    else if (Array.isArray(detail)) message = detail.map((item) => item.msg || '参数不正确').join('；')
    else message = detail?.message || `请求失败（${response.status}）`
    throw new Error(message)
  }
  return data
}

async function login() {
  const username = String(loginForm.username || usernameInput.value?.value || '').trim()
  const password = String(loginForm.password || passwordInput.value?.value || '')
  if (!username || !password) {
    error.value = '请输入管理员账号和密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const data = await api('/login', {
      method: 'POST',
      body: { username, password }
    })
    token.value = data.token
    admin.value = data.user
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    await loadDashboard()
    flash('登录成功')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function logout(showMessage = true) {
  token.value = ''
  admin.value = null
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  dashboard.value = null
  if (showMessage) flash('已退出后台')
}

async function loadDashboard() {
  const data = await api('/dashboard')
  dashboard.value = data
}

async function openTab(key) {
  tab.value = key
  error.value = ''
  try {
    if (key === 'dashboard') await loadDashboard()
    if (key === 'users') await loadUsers()
    if (key === 'codes') await loadCodes()
    if (key === 'questions') await loadQuestions()
    if (key === 'pk') await loadPk()
  } catch (e) {
    flash(e.message, true)
  }
}

async function loadUsers(page = 1) {
  const query = new URLSearchParams({ page: String(page), size: '20', search: userSearch.value })
  const data = await api(`/users?${query.toString()}`)
  users.value = data
}

async function grantMembership(user) {
  if (!window.confirm(`给 ${user.nickname || user.username} 开通 365 天家庭会员？`)) return
  try {
    await api(`/users/${user.id}/membership`, { method: 'POST', body: { days: 365, plan: 'pro' } })
    await loadUsers(users.value.page)
    flash(`已为 ${user.username} 开通会员`)
  } catch (e) {
    flash(e.message, true)
  }
}

async function toggleUser(user) {
  const next = !user.active
  if (!window.confirm(`${next ? '启用' : '停用'}账号 ${user.username}？`)) return
  try {
    await api(`/users/${user.id}/status`, { method: 'POST', body: { active: next, reason: next ? '' : '后台停用' } })
    await loadUsers(users.value.page)
    flash(next ? '账号已启用' : '账号已停用')
  } catch (e) {
    flash(e.message, true)
  }
}

async function loadCodes() {
  const data = await api(`/redeem-codes?status=${codeFilter.value}`)
  codes.value = data
}

async function createCodes() {
  try {
    const data = await api('/redeem-codes', {
      method: 'POST',
      body: { count: Number(codeForm.count), days: Number(codeForm.days), plan: 'pro', batch: '' }
    })
    generatedCodes.value = data.items
    await loadCodes()
    flash(`已生成 ${data.items.length} 个兑换码`)
  } catch (e) {
    flash(e.message, true)
  }
}

async function copyCodes() {
  const text = generatedCodes.value.map((item) => item.code).join('\n')
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    flash('兑换码已复制')
  } catch (e) {
    flash('复制失败，请手动选择', true)
  }
}

async function revokeCode(row) {
  if (!window.confirm(`作废兑换码 ${row.code}？`)) return
  try {
    await api(`/redeem-codes/${row.id}/revoke`, { method: 'POST' })
    await loadCodes()
    flash('已作废')
  } catch (e) {
    flash(e.message, true)
  }
}

async function loadQuestions() {
  const data = await api('/questions')
  questions.value = data
}

async function addQuestion() {
  try {
    await api('/questions', {
      method: 'POST',
      body: {
        ...questionForm,
        grade: Number(questionForm.grade),
        options: questionForm.options.split(',').map((item) => item.trim()).filter(Boolean)
      }
    })
    questionForm.content = ''
    questionForm.answer = ''
    questionForm.explanation = ''
    questionForm.options = ''
    await loadQuestions()
    flash('题目已添加')
  } catch (e) {
    flash(e.message, true)
  }
}

async function removeQuestion(row) {
  if (!window.confirm('删除这道题？')) return
  try {
    await api(`/questions/${row.id}`, { method: 'DELETE' })
    await loadQuestions()
    flash('已删除')
  } catch (e) {
    flash(e.message, true)
  }
}

async function loadPk() {
  const data = await api('/pk/matches')
  pkMatches.value = data
}

function formatDate(value) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 16)
}

onMounted(async () => {
  if (!token.value) return
  try {
    await loadDashboard()
  } catch (e) {
    logout(false)
  }
})
</script>

<template>
  <div v-if="!token" class="login-page">
    <div class="login-card">
      <div class="brand">
        <div class="brand-mark">童</div>
        <div>
          <h1>童伴成长</h1>
          <p>管理后台 · 仅限管理员</p>
        </div>
      </div>
      <label class="field">
        <span>管理员账号</span>
        <input ref="usernameInput" v-model.trim="loginForm.username" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="admin" @keyup.enter="login" />
      </label>
      <label class="field">
        <span>密码</span>
        <input ref="passwordInput" v-model="loginForm.password" type="password" autocomplete="current-password" placeholder="请输入密码" @keyup.enter="login" />
      </label>
      <button class="btn primary block" :disabled="loading" @click="login">{{ loading ? '登录中…' : '登录后台' }}</button>
      <p v-if="error" class="msg error">{{ error }}</p>
      <p class="hint">管理员账号由服务器 .env 中的 ADMIN_USERNAME / ADMIN_PASSWORD 初始化。</p>
    </div>
  </div>

  <div v-else class="layout">
    <aside class="sidebar">
      <div class="brand small">
        <div class="brand-mark">童</div>
        <div>
          <strong>童伴成长</strong>
          <p>管理后台</p>
        </div>
      </div>
      <nav>
        <button v-for="item in navItems" :key="item.key" class="nav-item" :class="{ active: tab === item.key }" @click="openTab(item.key)">
          <span>{{ item.icon }}</span>{{ item.label }}
        </button>
      </nav>
      <div class="sidebar-foot">
        <span>{{ admin?.nickname || admin?.username }}</span>
        <button class="link" @click="logout()">退出</button>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <h2>{{ currentTitle }}</h2>
          <p>童伴成长 · MySQL 数据后台</p>
        </div>
        <button class="btn ghost" @click="openTab(tab)">刷新</button>
      </header>

      <p v-if="notice" class="msg success">{{ notice }}</p>
      <p v-if="error" class="msg error">{{ error }}</p>

      <section v-if="tab === 'dashboard'" class="section">
        <div class="stat-grid" v-if="dashboard">
          <div class="stat"><span>注册用户</span><strong>{{ dashboard.total_users }}</strong></div>
          <div class="stat"><span>今日新增</span><strong>{{ dashboard.today_users }}</strong></div>
          <div class="stat"><span>有效会员</span><strong>{{ dashboard.active_members }}</strong></div>
          <div class="stat"><span>未使用兑换码</span><strong>{{ dashboard.unused_codes }}</strong></div>
          <div class="stat"><span>PK 对局</span><strong>{{ dashboard.pk_matches }}</strong></div>
        </div>
        <div class="panel" v-if="dashboard">
          <div class="panel-head"><h3>最近注册</h3></div>
          <table>
            <thead><tr><th>账号</th><th>昵称</th><th>会员</th><th>注册时间</th></tr></thead>
            <tbody>
              <tr v-for="user in dashboard.recent_users" :key="user.id">
                <td>{{ user.username }}</td>
                <td>{{ user.nickname || '-' }}</td>
                <td><span class="pill" :class="{ member: user.membership.is_member }">{{ user.membership.is_member ? '会员' : '免费' }}</span></td>
                <td>{{ formatDate(user.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="tab === 'users'" class="section">
        <div class="toolbar">
          <input v-model="userSearch" placeholder="搜索账号 / 昵称" @keyup.enter="loadUsers(1)" />
          <button class="btn" @click="loadUsers(1)">搜索</button>
        </div>
        <div class="panel">
          <table>
            <thead><tr><th>账号</th><th>昵称</th><th>会员</th><th>状态</th><th>注册时间</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="user in users.items" :key="user.id">
                <td>{{ user.username }}<small>#{{ user.id }}</small></td>
                <td>{{ user.nickname || '-' }}</td>
                <td>{{ user.membership.is_member ? `${user.membership.plan_name} · 剩 ${user.membership.days_left} 天` : '免费' }}</td>
                <td><span class="pill" :class="{ danger: !user.active }">{{ user.active ? '正常' : '已停用' }}</span></td>
                <td>{{ formatDate(user.created_at) }}</td>
                <td class="actions">
                  <button class="link" @click="grantMembership(user)">开通年会员</button>
                  <button class="link danger" @click="toggleUser(user)">{{ user.active ? '停用' : '启用' }}</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="pager">
            <button class="btn ghost" :disabled="users.page <= 1" @click="loadUsers(users.page - 1)">上一页</button>
            <span>第 {{ users.page }} 页 / 共 {{ users.total }} 人</span>
            <button class="btn ghost" :disabled="users.page * 20 >= users.total" @click="loadUsers(users.page + 1)">下一页</button>
          </div>
        </div>
      </section>

      <section v-if="tab === 'codes'" class="section">
        <div class="panel">
          <div class="panel-head"><h3>生成兑换码</h3><span class="hint">家长在「会员中心」输入兑换</span></div>
          <div class="inline-form">
            <label>数量<input v-model.number="codeForm.count" type="number" min="1" max="100" /></label>
            <label>天数<input v-model.number="codeForm.days" type="number" min="1" max="3650" /></label>
            <button class="btn primary" @click="createCodes">生成</button>
          </div>
        </div>
        <div v-if="generatedCodes.length" class="panel">
          <div class="panel-head"><h3>本次生成</h3><button class="btn ghost" @click="copyCodes">复制全部</button></div>
          <div class="code-grid"><code v-for="item in generatedCodes" :key="item.id">{{ item.code }}</code></div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <h3>兑换码列表</h3>
            <select v-model="codeFilter" @change="loadCodes">
              <option value="all">全部</option><option value="unused">未使用</option><option value="used">已使用</option><option value="revoked">已作废</option>
            </select>
          </div>
          <table>
            <thead><tr><th>兑换码</th><th>批次</th><th>使用人</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="row in codes.items" :key="row.id">
                <td><code>{{ row.code }}</code></td>
                <td>{{ row.batch }}</td>
                <td>{{ row.used_by_name || '-' }}</td>
                <td>{{ row.revoked ? '已作废' : row.used_by ? '已使用' : '未使用' }}</td>
                <td>{{ formatDate(row.created_at) }}</td>
                <td><button v-if="!row.used_by && !row.revoked" class="link danger" @click="revokeCode(row)">作废</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="tab === 'questions'" class="section">
        <div class="panel">
          <div class="panel-head"><h3>新增题目</h3><span class="hint">用于 PK 与服务端题库</span></div>
          <div class="form-grid">
            <label>学科<select v-model="questionForm.subject"><option value="math">数学</option><option value="chinese">语文</option><option value="english">英语</option></select></label>
            <label>年级<input v-model.number="questionForm.grade" type="number" min="1" max="6" /></label>
            <label class="wide">题干<input v-model="questionForm.content" placeholder="例如：8 + 7 = ?" /></label>
            <label class="wide">答案<input v-model="questionForm.answer" placeholder="15" /></label>
            <label class="wide">选项<input v-model="questionForm.options" placeholder="逗号分隔，例如 13,14,15,16" /></label>
            <label class="wide">解析<input v-model="questionForm.explanation" placeholder="一句话思路" /></label>
          </div>
          <button class="btn primary" @click="addQuestion">添加题目</button>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>题库（{{ questions.items.length }}）</h3></div>
          <table>
            <thead><tr><th>ID</th><th>学科</th><th>年级</th><th>题干</th><th>答案</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="row in questions.items" :key="row.id">
                <td>{{ row.id }}</td>
                <td>{{ row.subject }}</td>
                <td>{{ row.grade }}</td>
                <td>{{ row.content }}</td>
                <td>{{ row.answer }}</td>
                <td><button class="link danger" @click="removeQuestion(row)">删除</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="tab === 'pk'" class="section">
        <div class="panel">
          <div class="panel-head"><h3>最近对局</h3></div>
          <table>
            <thead><tr><th>#</th><th>玩家 1</th><th>比分</th><th>玩家 2</th><th>题数</th><th>时间</th></tr></thead>
            <tbody>
              <tr v-for="row in pkMatches.items" :key="row.id">
                <td>{{ row.id }}</td>
                <td>{{ row.player1 }}</td>
                <td><strong>{{ row.player1_score }} : {{ row.player2_score }}</strong></td>
                <td>{{ row.player2 }}</td>
                <td>{{ row.question_count }}</td>
                <td>{{ formatDate(row.created_at) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="!pkMatches.items.length" class="empty">还没有 PK 对局，等家长和孩子来一局。</p>
        </div>
      </section>
    </main>
  </div>
</template>
