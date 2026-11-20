# 童伴成长：AI 智能小学学习助手（MVP）

这是一个可本地运行的前后端分离项目，面向小学 1—3 年级，包含：
- 学习首页、年级与学科入口
- 数学/语文/英语示例练习题
- AI 学习问答（配置 Qwen Key 后调用真实模型；未配置时使用明确标注的演示回复）
- 家长与孩子双向评价
- 学习记录与成长报告
- FastAPI + SQLAlchemy + SQLite（默认）/ MySQL（可配置）

> 这是可运行的开发版 MVP，不是已经通过微信审核的生产系统。正式上线前必须完成微信登录、监护人授权、儿童隐私保护、内容安全、HTTPS、域名白名单、数据备份和安全测试。

## 一、目录结构

```text
tongban/
├── frontend/       # VS Code 打开
└── backend/        # PyCharm 打开
```

## 二、环境要求

- Node.js 20 LTS 或更高 LTS
- Python 3.11+
- uv
- 微信开发者工具
- VS Code、PyCharm
- MySQL（可选；默认 SQLite，方便先跑通）

## 三、启动后端（PyCharm）

1. 用 PyCharm 打开 `backend` 文件夹。
2. 在 PyCharm Terminal 中执行：

```powershell
uv sync
```

如果你已有 uv 虚拟环境，也可以在当前项目目录执行 `uv sync`，uv 会按 `pyproject.toml` 安装依赖。

3. 复制 `.env.example` 为 `.env`。第一次运行可先不填写 Qwen Key，使用演示 AI 回复。
4. 启动：

```powershell
uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

5. 浏览器打开：
   - API 健康检查：http://127.0.0.1:8000/api/health
   - 接口文档：http://127.0.0.1:8000/docs

默认数据库为 `sqlite:///./tongban.db`，首次启动会自动建表并写入演示数据。

### 配置 MySQL（后续建议使用）

先创建数据库，例如 `tongban`，字符集使用 `utf8mb4`。然后在 `.env` 设置：

```env
DATABASE_URL=mysql+pymysql://用户名:密码@127.0.0.1:3306/tongban?charset=utf8mb4
```

修改数据库连接后重启后端。请不要把真实数据库密码提交到代码仓库。

### 配置通义千问

在 `.env` 中填写：

```env
DASHSCOPE_API_KEY=你的百炼API_KEY
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
```

没有 Key 时，AI 接口会返回演示回复，并在 `demo` 字段标记 `true`。

## 四、启动前端（VS Code）

1. 用 VS Code 打开 `frontend` 文件夹。
2. 在终端执行：

```powershell
npm install
```

3. 开发微信小程序：

```powershell
npm run dev:mp-weixin
```

4. 打开微信开发者工具，导入：

```text
frontend/dist/dev/mp-weixin
```

本地联调时，微信开发者工具中可在「详情 → 本地设置」勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」。该设置仅供本地开发，正式发布必须使用备案域名和 HTTPS。

默认 API 地址为 `http://127.0.0.1:8000`，仅适合在同一台电脑上的开发者工具模拟器。真机预览时，将 `frontend/api/index.js` 的 `BASE_URL` 改成电脑在局域网中的 IP，例如 `http://192.168.1.20:8000`，并确保手机和电脑在同一 Wi-Fi。

## 五、当前演示账号

- 家长：user_id=1
- 孩子：user_id=2
- 默认首页使用孩子账号。前端可切换「孩子视角 / 家长视角」。

当前账号仅用于本地演示，不是正式微信登录。

## 六、主要接口

- `GET /api/health`
- `GET /api/dashboard?user_id=2`
- `GET /api/questions?subject=math&grade=1`
- `POST /api/learning/submit`
- `POST /api/ai/chat`
- `POST /api/evaluations`
- `GET /api/reports/weekly?family_id=1`

接口详情请启动后端后访问 `/docs`。

## 七、下一步上线前必须完成

1. 微信小程序真实登录与服务端会话验证。
2. 家长身份核验、监护人授权和儿童个人信息保护流程。
3. 家庭数据访问权限校验，不能仅相信前端传来的 user_id。
4. AI 输入输出审核、未成年人保护和人工反馈机制。
5. HTTPS、域名白名单、服务器部署、数据库备份与日志监控。
6. 根据微信平台及所在地法规完成备案、隐私政策和审核要求。
