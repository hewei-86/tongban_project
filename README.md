# 童伴成长 · AI 学习与亲子陪伴练习站

面向小学 **1—3 年级** 的 AI 学习助手与亲子陪伴练习站：学科练习、速算挑战、知识卡片、错题本、成长成就、亲子互评、家长报告。

前端基于 **uni-app + Vue 3**，内置一套**本地数据引擎**，所以可以**纯静态部署**（GitHub Pages 免费上线），不需要服务器和数据库；仓库里同时保留了可选的 FastAPI 后端与 Docker 部署方案。

<p>
  <a href="https://github.com/hewei-86/tongban_project/actions/workflows/deploy.yml"><img alt="Deploy" src="https://github.com/hewei-86/tongban_project/actions/workflows/deploy.yml/badge.svg"></a>
  <a href="https://hewei-86.github.io/tongban_project/"><img alt="在线演示" src="https://img.shields.io/badge/%E5%9C%A8%E7%BA%BF%E6%BC%94%E7%A4%BA-GitHub%20Pages-ff7a4d"></a>
  <img alt="Vue" src="https://img.shields.io/badge/Vue-3-42b883">
  <img alt="uni-app" src="https://img.shields.io/badge/uni--app-H5%20%7C%20%E5%B0%8F%E7%A8%8B%E5%BA%8F-2b6cf0">
</p>

> **在线体验**：<https://hewei-86.github.io/tongban_project/>
>
> 打开即用，首次进入自带少量示例数据；所有学习数据保存在你自己的浏览器里，不会上传。

<p>
  <img src="docs/preview-home.png" width="250" alt="首页" />
  <img src="docs/preview-practice.png" width="250" alt="学科练习" />
  <img src="docs/preview-growth.png" width="250" alt="成长档案" />
</p>
<p>
  <img src="docs/preview-parent.png" width="250" alt="家长中心" />
  <img src="docs/preview-challenge.png" width="250" alt="速算挑战" />
</p>

---

## 目录

- [功能一览](#功能一览)
- [本地运行](#本地运行)
- [部署到 GitHub Pages（推荐）](#部署到-github-pages推荐)
- [目录结构](#目录结构)
- [数据与隐私](#数据与隐私)
- [可选：FastAPI 后端](#可选fastapi-后端)
- [构建微信小程序](#构建微信小程序)
- [测试](#测试)
- [常见问题](#常见问题)
- [后续计划](#后续计划)

---

## 功能一览

| 页面 | 能力 |
| --- | --- |
| 🏠 首页 | 每日签到、连续天数、今日任务进度、年级切换、孩子 / 家长视角切换、每日一句 |
| ✏️ 学科练习 | 数学 / 语文 / 英语 3 科 × 1—3 年级题库，逐题作答与讲解，答错自动进错题本，完成后有成绩小结 |
| ⚡ 速算挑战 | 60 秒限时口算，连击加分，最高分记录，成绩计入积分与成长曲线 |
| 📚 知识卡片 | 英语单词闪卡（点开看释义）、8 首古诗、10 个成语、收藏夹 |
| 🤖 AI 小老师 | 本地规则引擎：四则运算分步讲解、古诗背诵、成语释义、单词翻译、汉字加笔、情绪安抚；隐私与安全话题会自动拦截并引导找家长 |
| 📕 错题本 | 待掌握 / 已掌握筛选，重做判题，答对自动标记掌握，支持删除 |
| 🏆 我的成长 | 等级与经验、连续签到、28 天学习热力图、14 天学习曲线、14 个成就徽章、家庭成长榜、本周小结 |
| 💗 亲子互评 | 默契度、5 星评价、鼓励留言、互评记录 |
| 👨‍👩‍👧 家长中心 | 孩子概况、周报 / 月报、学科正确率、每日学习曲线、自动生成的小建议、学习目标、每日时长管理 |
| 🙋 我的 | 角色切换、年级切换、数据导出 / 导入 / 重置、隐私与项目说明 |

设计上的几个小坚持：

- **不排名、不贴标签**：报告只描述趋势，并给出可执行的鼓励建议；
- **数据留在本机**：没有账号体系，也就不收集儿童个人信息；
- **AI 坦白身份**：明确告知「我是程序，不是真人老师」，重要知识提示再找家长或老师核对；
- **离线可用**：不依赖任何外部 API，弱网也能练习。

---

## 本地运行

环境要求：**Node.js 20 LTS+**（本项目在 Node 24 上验证）。

```bash
cd frontend
npm install
npm run dev:h5      # 打开终端提示的本地地址（默认 http://localhost:5173）
```

打包静态站点：

```bash
npm run build:h5    # 产物在 frontend/dist/build/h5
```

本地预览打包结果（任选其一）：

```bash
npx serve dist/build/h5
# 或
python -m http.server 8080 --directory dist/build/h5
```

> 项目不需要配置 `.env`、数据库或 API Key，装完依赖即可使用。

---

## 部署到 GitHub Pages（推荐）

推送到 `main` 分支后，`.github/workflows/deploy.yml` 会自动构建并发布。

### 第一次部署（只需要做一次）

1. 把项目推到 GitHub 仓库（默认分支 `main`）。
2. 打开仓库 **Settings → Pages → Build and deployment**，把 **Source** 设为 **GitHub Actions**。
3. 回到 **Actions** 页面，等待 `Deploy to GitHub Pages` 跑完。
4. 访问：

```text
https://<你的用户名>.github.io/<仓库名>/
```

例如本仓库：<https://hewei-86.github.io/tongban_project/>

### 它是怎么处理子路径的

GitHub Pages 的「项目站点」部署在 `/<仓库名>/` 下，如果资源路径仍是 `/assets/...` 就会白屏。工作流会自动计算并注入：

```yaml
UNI_H5_BASE: /<仓库名>/
```

- 仓库名形如 `<用户名>.github.io` 时，自动使用根路径 `/`；
- 工作流还会写入 `.nojekyll` 和 `404.html` 兜底。

### 绑定自定义域名

在 **Settings → Pages → Custom domain** 填写域名后，站点会部署在根路径，此时需要把工作流里的 base 改成 `/`：

```yaml
# .github/workflows/deploy.yml 的 Resolve H5 base path 步骤
echo "value=/" >> "$GITHUB_OUTPUT"
```

### 部署后白屏 / 404 排查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 打开空白、控制台 404 `/assets/...` | base 不对 | 确认上面「Source」为 GitHub Actions；重新运行工作流 |
| 页面 404 | Pages 未启用或分支不是 `main` | 检查 Settings → Pages；确认推送到 `main` |
| Actions 报 `Get Pages site failed` | Pages 还没开启 | 先按上面第 2 步开启，再重跑 |
| 样式正常但数据为空 | 浏览器清理了本地数据 | 正常现象，本地数据模式不做云端同步 |

---

## 目录结构

```text
tongban_project/
├─ frontend/                        # uni-app（Vue 3）前端
│  ├─ src/
│  │  ├─ pages/                     # 10 个页面
│  │  │  ├─ index/                  # 首页
│  │  │  ├─ practice/               # 学科练习
│  │  │  ├─ challenge/              # 速算挑战
│  │  │  ├─ cards/                  # 知识卡片
│  │  │  ├─ ai/                     # AI 小老师
│  │  │  ├─ wrongbook/              # 错题本
│  │  │  ├─ growth/                 # 成长档案
│  │  │  ├─ family/                 # 亲子互评
│  │  │  ├─ parent/                 # 家长中心
│  │  │  └─ settings/               # 我的
│  │  ├─ components/TabBar.vue      # 自定义底部导航（孩子 / 家长两套）
│  │  ├─ services/                  # 本地数据引擎、AI 小老师、会话、接口门面
│  │  ├─ data/                      # 题库、知识卡片数据
│  │  ├─ styles/app.css             # 设计系统（颜色、卡片、按钮、表单）
│  │  ├─ pages.json / manifest.json # 路由与打包配置
│  │  └─ App.vue / main.js
│  ├─ tests/engine.test.mjs         # 16 项数据引擎单测
│  └─ vite.config.js
├─ backend/                         # 可选：FastAPI 后端
│  ├─ main.py / models.py / schemas.py / database.py
│  ├─ test_api.py                   # 36 项接口自测
│  ├─ requirements.txt / Dockerfile
│  └─ .env.example
├─ nginx/nginx.conf                 # 可选：服务器部署用
├─ docker-compose.yml               # 可选：后端 + Nginx 一键启动
├─ docs/                            # README 预览图
└─ .github/workflows/
   ├─ deploy.yml                    # GitHub Pages 自动部署（默认）
   └─ deploy-server.yml             # 可选：部署到自己的服务器（手动触发）
```

---

## 数据与隐私

- 所有学习数据保存在浏览器 **localStorage**（键名 `tongban_state_v1`），刷新、关闭浏览器都不会丢；
- 清理浏览器数据、换设备、无痕模式退出后会重新开始（这是纯静态方案的特点）；
- 「我的 → 本机数据」支持 **导出备份 / 导入数据 / 重置**；
- AI 小老师完全在本地运行，**不会把对话发到任何服务器**；
- 项目不包含微信登录、手机号、真实姓名等个人信息的采集。

> ⚠️ 如果要把它作为**面向真实儿童的产品**上线，还需要补充：监护人授权与同意流程、隐私政策、内容安全审核、ICP 备案、未成年人保护与数据安全评估等。当前项目定位是学习与演示。

---

## 可选：FastAPI 后端

`backend/` 是一套与前端功能对应的 REST 接口（题库、答题、签到、错题、成长、报告、目标、亲子互评、速算挑战、通义千问 AI），默认使用 SQLite，可切换 MySQL。

### 本地启动

```bash
cd backend
uv sync                                   # 或者 python -m venv .venv && pip install -r requirements.txt
cp .env.example .env                      # 需要真实 AI 时再填 DASHSCOPE_API_KEY
uv run uvicorn main:app --reload --port 8000
```

- 健康检查：<http://127.0.0.1:8000/api/health>
- 接口文档：<http://127.0.0.1:8000/docs>

没有 `DASHSCOPE_API_KEY` 时，AI 接口会返回明确标注的演示回复，不影响其它功能。

### 接口自测

```bash
cd backend
.venv\Scripts\python.exe test_api.py      # Windows
python test_api.py                        # macOS / Linux
```

脚本使用临时数据库，不会污染 `tongban.db`；当前覆盖 **36 项**检查。

### 用 Docker 部署到自己的服务器

```bash
docker compose up -d --build
```

需要服务器部署时，在仓库 Secrets 中配置 `SERVER_HOST`、`SERVER_USER`、`SERVER_SSH_KEY`、`DEPLOY_PATH`，然后在 Actions 中手动运行 **Deploy to Own Server (optional)**。

> 说明：当前前端默认使用**本地数据引擎**，开箱即用；后端的定位是「后续做多设备同步 / 真实账号时的服务端」。如果你希望前端直接连后端，可以把 `frontend/src/services/api.js` 里的实现替换成 HTTP 请求，页面代码不需要改。

---

## 构建微信小程序

```bash
cd frontend
npm run build:mp-weixin
```

用微信开发者工具导入 `frontend/dist/build/mp-weixin`，在 `src/manifest.json` 填写自己的 `mp-weixin.appid`。

小程序端同样使用本地数据模式；正式发布还需要配置合法域名、隐私协议与内容审核。

---

## 测试

前端（数据引擎、AI 规则、等级算法、报告统计等）：

```bash
cd frontend
npm test
# 16 项全部通过
```

后端（接口、判题、签到、错题、挑战、报告等）：

```bash
cd backend
.venv\Scripts\python.exe test_api.py
# 36 项全部通过
```

---

## 常见问题

**Q：为什么不需要后端？数据存在哪里？**
A：前端内置 `src/services/engineCore.js`，把题目、记录、错题、积分、成就、报告都算在浏览器本地，并持久化到 localStorage。好处是零成本、零配置、隐私友好；代价是不能多设备同步。

**Q：AI 小老师是真的 AI 吗？**
A：演示站里的 AI 是**本地规则引擎**，能真的算对四则运算并讲步骤、背古诗、讲成语、查单词，但不是大模型。后端配置 `DASHSCOPE_API_KEY` 后，同一套接口会调用通义千问。

**Q：如何添加自己的题目？**
A：编辑 `frontend/src/data/questions.js` 的 `QUESTION_BANK`，按现有结构追加即可（学科、年级、题干、答案、解析、选项）。

**Q：如何调整年级范围？**
A：目前面向 1—3 年级。题库、任务模板、卡片数据分别集中在 `src/data/` 和 `src/services/engineCore.js`，扩展年级时同步补数据即可。

**Q：手机上能用吗？**
A：可以，是响应式 H5；也可以「添加到主屏幕」当作轻量 App 使用。

---

## 后续计划

- [ ] 前端接入真实后端（登录、多设备同步）
- [ ] 多孩子 / 多家庭成员
- [ ] PWA 离线安装与消息提醒
- [ ] 语音朗读（古诗、单词）
- [ ] 家长报告导出 PDF
- [ ] 更丰富的题库与自适应难度

---

## 说明

本项目用于学习、课程设计与演示，不替代学校教学，也不对 AI 生成内容的准确性作保证。欢迎提 Issue 或 PR 一起完善。
