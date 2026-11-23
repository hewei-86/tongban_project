# 童伴成长 · 自动部署流程

本文档说明本项目**从提交代码到自动上线**的完整流程。项目同时维护两条部署流水线：

| 流水线 | 工作流文件 | 目标 | 触发方式 | 当前地址 |
| --- | --- | --- | --- | --- |
| GitHub Pages | `.github/workflows/deploy.yml` | 纯静态 H5（local 演示模式，无后端） | push `main` / 手动 | <https://hewei-86.github.io/tongban_project/> |
| 自有云服务器 | `.github/workflows/deploy-server.yml` | H5 + FastAPI + MySQL 8 + Nginx（Docker，remote 模式） | push `main` / 手动 | <http://120.26.177.245/> |

> 一次 `git push` 会**同时触发两条**流水线：Pages 用于公开展示（本地数据），服务器用于完整产品环境（真实账号 / MySQL / AI 出题）。

---

## 目录

- [一、整体流程](#一整体流程)
- [二、GitHub Pages 流水线](#二github-pages-流水线)
- [三、云服务器流水线](#三云服务器流水线)
- [四、首次配置（只做一次）](#四首次配置只做一次)
- [五、日常发布](#五日常发布)
- [六、回滚](#六回滚)
- [七、服务器目录与数据](#七服务器目录与数据)
- [八、环境变量与密钥](#八环境变量与密钥)
- [九、验证部署结果](#九验证部署结果)
- [十、常见问题排查](#十常见问题排查)
- [十一、安全建议](#十一安全建议)
- [十二、按需调整流水线](#十二按需调整流水线)
- [十三、相关文件](#十三相关文件)

---

## 一、整体流程

```mermaid
flowchart LR
  A["git push main"] --> B{"GitHub Actions 自动触发"}
  B --> C["Deploy to GitHub Pages"]
  B --> D["Deploy to Own Server"]

  C --> C1["npm ci + 单测"]
  C1 --> C2["构建 H5<br/>UNI_H5_BASE=/仓库名/"]
  C2 --> C3["上传 Pages Artifact"]
  C3 --> C4["发布到 GitHub Pages"]

  D --> D1["npm ci + 单测"]
  D1 --> D2["构建 H5<br/>VITE_DATA_MODE=remote"]
  D2 --> D3["打包 后端 / H5 / Nginx"]
  D3 --> D4["SCP 上传到服务器"]
  D4 --> D5["同步 DASHSCOPE_API_KEY 到 .env"]
  D5 --> D6["启动 MySQL 并等待健康"]
  D6 --> D7["滚动替换后端 + Nginx"]
  D7 --> D8["健康检查 /api/health"]
```

两条流水线都会在**发布前跑前端单元测试**：测试不通过，构建和部署直接终止，线上保持旧版本。

服务器版构建时注入 `VITE_DATA_MODE=remote`，前端强制登录并连接 MySQL；Pages 构建保持 `local`，继续作为本地演示。

| 阶段 | 大约耗时 |
| --- | --- |
| Pages | 40—70 秒 |
| 服务器 | 90—150 秒（首次含 MySQL 初始化；之后使用缓存） |

---

## 二、GitHub Pages 流水线

文件：`.github/workflows/deploy.yml`

### 触发条件

- push 到 `main`
- 手动 `workflow_dispatch`

### 权限与并发

```yaml
permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: github-pages
  cancel-in-progress: true
```

同一时间只保留最新一次部署；新提交会取消正在排队的旧任务。

### 执行步骤

| 步骤 | 做什么 |
| --- | --- |
| Checkout | 拉取代码 |
| Setup Node.js | Node 20 + npm 缓存（`frontend/package-lock.json`） |
| Install dependencies | `npm ci` |
| Run unit tests | `npm test`（27 项） |
| Configure Pages | `actions/configure-pages@v5` |
| Resolve H5 base path | 自动计算资源前缀：项目站点为 `/仓库名/`；仓库名为 `<owner>.github.io` 时为 `/` |
| Build H5 | `UNI_H5_BASE=<base> npm run build:h5` |
| Prepare static files | 校验 `index.html`，写入 `.nojekyll` 和 `404.html` |
| Upload artifact | 上传 `frontend/dist/build/h5` |
| Deploy | `actions/deploy-pages@v4` 发布 |

### 子路径是怎么处理的

GitHub Pages 的「项目站点」地址是：

```text
https://<owner>.github.io/<repo>/
```

如果构建产物仍使用 `/assets/...` 绝对路径，打开就会白屏。工作流会自动计算并注入：

```text
UNI_H5_BASE=/<repo>/
```

部署后资源路径应为：

```text
/tongban_project/assets/xxx.js
```

> 绑定**自定义域名**后，站点会部署在根路径，需要把 `Resolve H5 base path` 步骤改为输出 `/`。

---

## 三、云服务器流水线

文件：`.github/workflows/deploy-server.yml`

### 触发条件

- push 到 `main`
- 手动 `workflow_dispatch`

### 权限与并发

```yaml
permissions:
  contents: read

concurrency:
  group: server-deploy
  cancel-in-progress: false
```

服务器部署是**串行**的：新提交排队等待上一次部署结束，避免两个部署同时操作 Docker 容器。

### 执行步骤

| 步骤 | 做什么 |
| --- | --- |
| Checkout / Node / npm ci | 与 Pages 一致 |
| Run unit tests | 发布前跑 27 项单测 |
| Build H5 | `UNI_H5_BASE=/` + `VITE_DATA_MODE=remote`（强制登录、连接 MySQL） |
| Build admin | `admin/` 独立 Vite 构建，产物合并到 H5 的 `/admin/` |
| Verify H5 build | 检查 `index.html` 与 `admin/index.html` 是否存在 |
| Setup SSH | 写入私钥、`ssh-keyscan` 记录主机指纹 |
| Package artifacts | 打三个包：`backend.tar.gz`、`h5.tar.gz`、`infra.tar.gz`（`docker-compose.yml` + `nginx/`） |
| Upload to server | `scp` 到服务器 `/tmp` |
| Sync AI key | 如果配置了 `DASHSCOPE_API_KEY`，只替换 `.env` 中对应行（先备份 `.env.bak`） |
| Deploy on server | SSH 执行：校验账号密码 → 拉镜像 / 构建 → 起 MySQL → 滚动替换后端 / Nginx → 健康检查 |

### 服务器端实际执行内容

```text
1. 解压基础设施（docker-compose.yml、nginx/nginx.conf）
2. 读取/生成 .env，已有 MySQL/JWT/管理员配置绝不覆盖
   - 已有数据卷但 .env 缺少 MYSQL_* → 中止，避免密码漂移
   - 已有 MySQL 容器密码与 .env 不一致 → 中止
   - 首次生成 ADMIN_PASSWORD，后端启动时创建管理员
3. 解压后端代码到 backend/（不覆盖 .env）
4. 拉取 MySQL 镜像、构建后端镜像（旧站保持运行）
5. docker compose up -d --no-recreate mysql，等待 healthy
6. 用 .env 的应用账号执行 SELECT 1，验证密码与数据卷一致
7. 清空并解压新 H5（含 `/admin/` 后台）到 frontend/site/
8. docker compose up -d --no-deps backend（滚动替换）
9. docker compose restart nginx（重新解析后端地址 + 新静态文件）
10. 轮询 http://127.0.0.1/api/health 与 http://127.0.0.1/
11. 清理 /tmp 临时包
```

### 部署后的容器结构

```text
                公网 :80
                   │
            ┌──────▼──────┐
            │  tongban-nginx  │  托管 H5 + 反向代理 /api/
            └──────┬──────┘
                   │ 容器内网 :8000
            ┌──────▼──────┐
            │ tongban-backend │  FastAPI，不对外暴露 8000
            └──────┬──────┘
                   │ 容器内网 :3306
            ┌──────▼──────┐
            │  tongban-mysql  │  MySQL 8.0，数据卷 tongban-mysql
            └─────────────┘
```

- 后端 8000、MySQL 3306 **都不对公网开放**
- 静态资源由 Nginx 直接返回
- 账号与学习数据在 MySQL Docker 卷 `tongban-mysql` 中，重新部署不丢数据

---

## 四、首次配置（只做一次）

### 4.1 GitHub 仓库 Secrets

打开仓库：**Settings → Secrets and variables → Actions → New repository secret**

| Secret | 必填 | 说明 |
| --- | --- | --- |
| `SERVER_HOST` | 是 | 服务器 IP 或域名，例如 `120.26.177.245` |
| `SERVER_USER` | 是 | SSH 用户名，例如 `root` / `ubuntu` |
| `SERVER_SSH_KEY` | 是 | 部署用**私钥全文**（`-----BEGIN ... KEY-----`） |
| `DEPLOY_PATH` | 否 | 服务器部署目录，默认 `/data/myproject` |
| `DASHSCOPE_API_KEY` | 否 | 通义千问 Key；配置后 AI 出题才会真正调用大模型 |

### 4.2 生成部署专用 SSH 密钥（本地）

```bash
ssh-keygen -t ed25519 -C "github-actions-tongban" -f ~/.ssh/github_actions_tongban -N ""
```

- **私钥**（`~/.ssh/github_actions_tongban`）内容 → 填到 `SERVER_SSH_KEY`
- **公钥**（`.pub`）追加到服务器的 `~/.ssh/authorized_keys`

Windows PowerShell 读取私钥内容：

```powershell
Get-Content ~/.ssh/github_actions_tongban -Raw | Set-Clipboard
```

### 4.3 服务器准备

要求：Linux（推荐 Ubuntu 22.04+）、Docker + Compose 插件、开放 80 端口。

```bash
# 安装 Docker（如未安装）
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# 放行 80（有防火墙时）
ufw allow 80/tcp

# 建部署目录
mkdir -p /data/myproject

# 配置登录公钥
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAA... github-actions-tongban" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

验证：

```bash
ssh -i ~/.ssh/github_actions_tongban <SERVER_USER>@<SERVER_HOST> "docker compose version"
```

> **MySQL 不需要手动安装**：`docker-compose.yml` 会启动 MySQL 8.0。首次部署时工作流自动生成 `MYSQL_DATABASE`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_ROOT_PASSWORD`、`JWT_SECRET` 并写入 `/data/myproject/.env`，之后**不会覆盖**。
>
> 请妥善备份 `.env` 和 `tongban-mysql` 数据卷；不要为了“重置密码”删除数据卷，会导致账号数据丢失。

### 4.4 启用 GitHub Pages

1. 仓库 **Settings → Pages**
2. **Build and deployment → Source** 选择 **GitHub Actions**
3. 保存即可（工作流令牌没有创建 Pages 站点的权限，必须由仓库管理员开启）

### 4.5 配置 AI 出题（可选）

1. 在 [阿里云百炼](https://bailian.console.aliyun.com/) 创建 API Key
2. 把 Key 加入 GitHub Secret：`DASHSCOPE_API_KEY`
3. 触发一次部署，工作流会把它写入服务器 `.env` 并重启后端
4. 打开「练习 → AI 出题」，提示“AI 已生成新题（通义千问）”即生效

> Pages 站点没有后端，会自动回退本地题库；AI 出题只在服务器站点生效。

### 4.6 管理后台

- 地址：`http://<服务器>/admin/`
- 首次部署自动生成 `ADMIN_USERNAME` / `ADMIN_PASSWORD`，写入服务器 `.env`
- 查看账号（不要把密码发到公开群）：

```bash
cd /data/myproject
grep '^ADMIN_USERNAME=' .env
grep '^ADMIN_PASSWORD=' .env
```

- 后台可以：看概览、搜索/停用用户、手动开通会员、生成兑换码、管理题库、查看 PK 对局
- Nginx 已配置 `/ws/` 的 WebSocket 升级，用于真人 PK

> 修改 `ADMIN_PASSWORD` 后重启 backend 会同步更新管理员密码；请先备份 `.env`。

---

## 五、日常发布

### 5.1 标准流程

```bash
git add -A
git commit -m "feat: 你的改动"
git push origin main
```

推送后：

1. 打开仓库 **Actions** 页面
2. 会看到两条工作流在跑：
   - `Deploy to GitHub Pages`
   - `Deploy to Own Server`
3. 等两条都变绿即可（约 1—2 分钟）

### 5.2 只部署其中一个

- **Actions → Deploy to GitHub Pages → Run workflow**
- **Actions → Deploy to Own Server → Run workflow**

手动触发同样会跑测试，可指定分支（默认 `main`）。

### 5.3 发布前本地自检（推荐）

```bash
cd frontend
npm test          # 27 项单测
npm run build:h5  # 产物在 dist/build/h5
```

```bash
cd backend
.venv\Scripts\python.exe test_api.py   # 40 项鉴权 / 会员 / PK / 同步自测（Windows）
```

---

## 六、回滚

### 6.1 代码回滚

```bash
# 找到问题提交
git log --oneline -5

# 回退（保留历史）
git revert <bad-commit> --no-edit
git push origin main
```

推送后两条流水线会自动重新部署到上一个正确版本。

### 6.2 只重跑某次部署

GitHub Actions 的 **Re-run jobs** 只会重跑同一提交，不会回退代码；要回滚请用上面的 `git revert`。

### 6.3 数据说明

- 回滚代码**不会**删除 MySQL 数据卷 `tongban-mysql`，账号与学习数据仍在
- 服务器版的学习数据在 MySQL；浏览器只保留缓存，回滚不影响数据库
- 如需备份数据库：

```bash
cd /data/myproject
set -a
. ./.env
set +a
mkdir -p /backup
docker compose exec -T -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql \
  mysqldump -uroot --single-transaction --default-character-set=utf8mb4 "$MYSQL_DATABASE" \
  | gzip > "/backup/tongban-$(date +%F).sql.gz"
ls -lh /backup
```

> 恢复前先停后端，再用 `gunzip -c ... | docker compose exec -T mysql mysql -uroot ...` 导入；操作前务必另存一份当前备份。

---

## 七、服务器目录与数据

部署后的目录（默认 `/data/myproject`）：

```text
/data/myproject/
├─ docker-compose.yml
├─ nginx/
│  └─ nginx.conf
├─ backend/               # FastAPI 代码（每次部署覆盖）
├─ frontend/
│  └─ site/               # H5 静态文件（每次部署清空后覆盖）
└─ .env                   # 密钥与配置（保留，不随部署覆盖）
```

持久化数据：

| 数据 | 位置 |
| --- | --- |
| MySQL 数据库 | Docker 卷 `tongban-mysql`（实际卷名带项目前缀，如 `myproject_tongban-mysql`）→ 容器 `/var/lib/mysql` |
| 环境变量 / Key | `/data/myproject/.env`（MySQL 密码、JWT_SECRET、AI Key） |
| 前端静态文件 | `/data/myproject/frontend/site`（可随时重建） |

查看状态：

```bash
cd /data/myproject
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=50 nginx
```

---

## 八、环境变量与密钥

### 8.1 工作流使用的 Secrets

见 [4.1](#41-github-仓库-secrets)。

### 8.2 服务器 `.env`

首次部署会自动生成并写入（之后不会覆盖）：

```env
MYSQL_DATABASE=tongban
MYSQL_USER=tongban
MYSQL_PASSWORD=<首次部署自动生成的 32 位随机值>
MYSQL_ROOT_PASSWORD=<首次部署自动生成的 32 位随机值>
JWT_SECRET=<首次部署自动生成的 64 位随机值>
PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/

DASHSCOPE_API_KEY=
QWEN_MODEL=qwen-turbo
```

修改模型（例如换成 `qwen-plus`）：

```bash
cd /data/myproject
sed -i 's/^QWEN_MODEL=.*/QWEN_MODEL=qwen-plus/' .env
docker compose restart backend
```

> `DASHSCOPE_API_KEY` 在配置了 GitHub Secret 时由工作流自动同步，手工修改会被下次部署覆盖。
>
> **不要手动修改 MySQL 密码**：MySQL 数据卷只在首次初始化时读取密码；改了 `.env` 但没改数据卷会导致应用无法登录，工作流会检测到并中止部署。确实需要改密码时，先备份数据，再按 MySQL 的 `ALTER USER` 流程同步修改容器与 `.env`。
>
> `JWT_SECRET` 修改后所有已登录用户会被要求重新登录，这是正常现象。

### 8.3 密钥安全

- `.env`、数据库、私钥**都不在仓库里**（见 `.gitignore`）
- Actions 日志会自动打码 Secret，但仍不建议在脚本里 `echo` 密钥
- 部署私钥建议**只用于这台服务器**，不要复用个人主密钥

---

## 九、验证部署结果

### 9.1 Pages

```bash
curl -I https://hewei-86.github.io/tongban_project/
```

- 200 且资源路径为 `/tongban_project/assets/...`
- 浏览器打开是本地演示模式（游客首页，不强制登录）

### 9.2 服务器

```bash
# 前端
curl -I http://120.26.177.245/

# 后端（经 Nginx 代理）
curl -s http://120.26.177.245/api/health
# 期望：{"ok":true,"service":"tongban-api","database":"mysql","ai_enabled":...}

# 未登录访问数据接口应返回 401
curl -s -o /dev/null -w '%{http_code}\n' http://120.26.177.245/api/state

# 确认后端 / MySQL 端口没有对公网暴露（应当超时/拒绝）
curl -m 5 http://120.26.177.245:8000/api/health
```

浏览器验证：

1. 打开 <http://120.26.177.245/> 应自动跳到「登录」页，且没有「先随便看看」；
2. 注册一个账号 → 完成练习 / 签到 → 刷新页面，数据仍在；
3. 用同一账号在另一台设备 / 无痕窗口登录，能看到同一份学习数据；
4. 打开「我的 → 账号数据」，确认显示“已同步到云端”。

> 不要用真实儿童信息或你在其它网站的真实密码做验证。

### 9.3 版本确认

页面「我的 → 关于童伴」显示当前版本号；或查看线上 JS 中的 `appVersion`。

---

## 十、常见问题排查

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| Pages 打开白屏、控制台 404 `/assets/...` | 构建 base 不对 | 确认仓库是项目站点；重新跑工作流；自定义域名需把 base 改为 `/` |
| Actions 报 `Get Pages site failed` | Pages 未开启或 Source 不是 GitHub Actions | Settings → Pages → Source 选 **GitHub Actions**，再重跑 |
| Pages 部署 404 | 分支不是 `main` 或 Pages 未发布 | 检查分支名与 Pages 设置 |
| 服务器步骤 `Permission denied (publickey)` | 私钥/用户不匹配 | 本地用同一私钥 `ssh -i` 登录验证；检查 `SERVER_USER` |
| `Host key verification failed` | 服务器指纹变化 | 工作流已 `ssh-keyscan`；若服务器重装需更新已知主机 |
| `docker: command not found` / `docker compose` 报错 | 服务器未装 Docker/Compose | 按 [4.3](#43-服务器准备) 安装 |
| `port is already allocated` | 80 端口被占用 | `ss -ltnp \| grep :80` 找到占用服务并停止，或改用其它端口 |
| 健康检查失败 `backend API FAILED` | 后端启动异常 | 工作流日志会输出 `docker compose logs --tail=30 backend`；本地 `docker compose logs` 排查 |
| 网站能开但接口 502 | 后端容器未起来 | `docker compose ps` / `docker compose logs backend` |
| 部署日志：`.env 中 MYSQL_* 为空` | `.env` 被误删/改写 | 从 `/data/myproject/.env.bak` 恢复；不要让它自动重新生成，否则会与数据卷密码不一致 |
| 部署日志：`应用数据库账号无法登录` | `.env` 与数据卷密码不一致 | **不要删除数据卷**；先备份，再用 MySQL `ALTER USER` 统一密码；工作流会中止而不会破坏数据 |
| `Access denied for user 'tongban'` | 同上，密码漂移 | 查看 `docker inspect tongban-mysql` 的 `MYSQL_PASSWORD` 与 `.env` 是否一致；恢复一致后重启后端 |
| 后端构建卡在 pip | 服务器访问 PyPI 慢 | 确认 `.env` 有 `PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/`；工作流会自动生成 |
| AI 出题没有调用大模型 | 未配置 `DASHSCOPE_API_KEY`，或 Key 无效 | 查 `/api/health` 的 `ai_enabled`；检查 Secret 与 `Sync AI key` 日志 |
| 配置 Key 后仍提示未配置 | 工作流未同步（Secret 为空/部署未跑） | 重跑 `Deploy to Own Server`，查看 `Sync AI key` 步骤日志 |
| 每次改 README 也会重新部署 | 工作流未设置路径过滤 | 见 [12.2](#122-只在前端或后端变更时部署) |
| `npm ci` 失败 | `package-lock.json` 与 `package.json` 不一致 | 本地执行 `npm install` 生成新 lockfile 后提交 |

查看完整日志：

```text
GitHub → Actions → 选择运行记录 → Jobs → 展开失败步骤
```

服务器端手动复现：

```bash
cd /data/myproject
docker compose up -d mysql
docker compose build backend
docker compose up -d --no-deps backend
docker compose restart nginx
docker compose ps
curl -s http://127.0.0.1/api/health
```

---

## 十一、安全建议

1. **使用独立部署密钥**，只授权这台服务器；不要复用个人 SSH 主密钥。
2. **不要提交** `.env`、数据库、部署私钥（`.gitignore` 已处理，仍建议提交前 `git status` 检查）。
3. **后端端口不对公网开放**：当前只通过 Nginx 代理 `/api/`，不要加回 `8000:8000` 端口映射。
4. **尽快启用 HTTPS**：当前服务器站点是 `http://`，登录密码和 JWT 会以明文经过网络；建议域名解析到服务器后配置 Certbot / Caddy。
5. **最小权限**：能用非 root 用户部署就不要用 root；给部署目录单独授权。
6. **定期备份** `tongban-mysql` 卷与 `.env`。
7. **Secret 轮换**：Key 泄露时立即在百炼控制台删除旧 Key，并更新 GitHub Secret。

---

## 十二、按需调整流水线

### 12.1 修改部署分支

两个工作流都在这里配置：

```yaml
on:
  push:
    branches:
      - main   # 改成你的分支名
```

### 12.2 只在前端或后端变更时部署

如果不想改文档也触发服务器部署，可在 `deploy-server.yml` 的 `push` 下加路径过滤：

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - 'backend/**'
      - 'nginx/**'
      - 'docker-compose.yml'
      - '.github/workflows/deploy-server.yml'
  workflow_dispatch:
```

> 注意：加了过滤后，只有 `.env` 或 Secret 变化不会触发部署；需要手动 Run workflow。

### 12.3 新增一个环境变量

1. 在 GitHub 添加 Secret（如 `QWEN_MODEL`）
2. 在 `deploy-server.yml` 增加同步逻辑（参考 `Sync AI key to server`）
3. 或直接在服务器 `.env` 里维护，重启后端生效

### 12.4 绑定域名 + HTTPS

1. 域名 A 记录解析到服务器 IP
2. 服务器安装反向代理 / 证书（Caddy 最省事，或 Nginx + Certbot）
3. Nginx 增加 443 server 块并挂载证书
4. `docker-compose.yml` 增加 443 端口映射与证书卷
5. Pages 如果也用自定义域名，记得把 base 改成 `/`

---

## 十三、相关文件

| 文件 | 作用 |
| --- | --- |
| `.github/workflows/deploy.yml` | GitHub Pages 自动部署 |
| `.github/workflows/deploy-server.yml` | 云服务器自动部署 |
| `frontend/package.json` | 前端构建与测试脚本 |
| `frontend/vite.config.js` | H5 base、开发代理 |
| `backend/test_api.py` | 后端鉴权 / 会员 / PK 自测 |
| `admin/` | 独立管理后台（Vue 3 + Vite） |
| `docker-compose.yml` | 服务器容器编排（MySQL + FastAPI + Nginx） |
| `nginx/nginx.conf` | 静态托管与 `/api/` 反向代理 |
| `.env.example` | 环境变量示例 |
| `README.md` | 项目说明与本地运行 |

---

## 附：最短上手清单

```text
□ 仓库 Settings → Pages → Source = GitHub Actions
□ 添加 Secrets：SERVER_HOST / SERVER_USER / SERVER_SSH_KEY
□ 服务器装 Docker，开放 80，部署公钥加入 authorized_keys
□ git push origin main（自动生成 MySQL 密码与 JWT_SECRET）
□ Actions 两条流水线变绿
□ 打开服务器地址注册账号，验证刷新 / 换设备后数据仍在
```
