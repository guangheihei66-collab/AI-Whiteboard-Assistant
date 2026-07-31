# AI Whiteboard Assistant 使用手册

这份手册按“第一次使用、每天使用、遇到错误、停止项目、换电脑”顺序编写。所有本地启动方式都只使用项目目录中的脚本，不会安装全局 npm 包、不修改系统 PATH，也不会把服务注册成 Windows 永久后台服务。

## 1. 第一次准备

### 1.1 需要的软件

- Windows 10 或 Windows 11
- Node.js 24 LTS（仓库根目录的 `.nvmrc` 记录了推荐主版本）
- npm（随 Node.js 安装）
- 一个现代浏览器

在 PowerShell 中检查：

```powershell
node --version
npm.cmd --version
```

如果 `node` 或 `npm.cmd` 不存在，请先安装 Node.js LTS。不要使用 `npm install -g`。

### 1.2 获取项目

把 GitHub 仓库克隆或下载到一个你有权限的目录，然后进入项目根目录：

```powershell
cd D:\Codex Word\AI-Whiteboard-Assistant
```

下面所有命令都假设当前目录是这个根目录。

### 1.3 安装项目依赖

第一次使用时分别安装前后端依赖：

```powershell
cd backend
npm.cmd install
cd ..\frontend
npm.cmd install
cd ..
```

依赖只写入各自的 `node_modules`。`node_modules`、构建产物和日志已经被 `.gitignore` 忽略。

## 2. 推荐方式：一键启动

### 2.1 启动

在项目根目录双击 `start-project.cmd`，或在 PowerShell 执行：

```powershell
.\start-project.cmd
```

脚本会检查配置，在缺少依赖时明确询问，然后在隐藏的后台进程中启动 Mock 后端和 Vite 前端，等待健康地址可访问，最后自动打开 `http://localhost:5173`。

启动成功后不需要一直开着终端窗口。关闭 Codex、PowerShell 或浏览器不会立即停止服务；服务会继续运行，直到使用停止脚本或重启电脑。

不想自动打开浏览器时：

```powershell
.\start-project.cmd -NoBrowser
```

### 2.2 查看状态

```powershell
.\status-project.cmd
```

状态含义：`READY` 表示健康地址可访问；`STARTING` 表示仍在启动；`STOPPED` 表示没有运行中的受控服务；`STALE` 表示记录过期；`UNTRACKED` 表示端口可能被其他程序使用但不属于本项目。

状态命令会显示日志文件位置。不要根据端口直接结束进程；先看状态并使用项目停止脚本。

### 2.3 停止

```powershell
.\stop-project.cmd
```

停止脚本只会结束由本项目记录、且 PID 与启动时间同时匹配的进程树，不会按端口误杀其他程序。停止后再次执行 `status-project.cmd`，应看到 `STOPPED`。

### 2.4 只验证配置

这一步不会安装、启动或停止任何服务：

```powershell
.\start-project.cmd -ValidateOnly
```

## 3. 手动启动方式

需要观察实时开发日志时，可开两个 PowerShell 窗口。

窗口一：

```powershell
cd backend
npm.cmd run dev
```

窗口二：

```powershell
cd frontend
npm.cmd run dev -- --strictPort
```

浏览器访问 `http://localhost:5173`，后端健康检查是 `http://localhost:3001/api/health`。手动启动的进程不写入项目运行状态；需要停止时在对应窗口按 `Ctrl+C`。

## 4. Mock AI（推荐）

Mock 是默认模式，不需要任何 AI 凭据，适合学习、演示和 CI：

```powershell
cd backend
Copy-Item .env.example .env
```

确认 `.env` 中 `AI_MOCK_MODE=true`，然后启动项目。Analyze 会返回确定性的分析，Generate 会返回固定的用户登录流程预览。

## 5. Live AI（可选）

Live 只在后端读取环境变量。不要把密钥写入前端、截图、浏览器存储或 Git。

1. 复制 `backend/.env.example` 为 `backend/.env`。
2. 设置 `AI_MOCK_MODE=false`。
3. 在 `OPENAI_API_KEY` 位置填写你自己的服务端密钥。
4. 按账户可用模型设置 `OPENAI_MODEL`。
5. 重启后端。

Live 请求会经过后端验证、超时和安全错误映射。前端不会自动重试 Live 请求，避免重复产生计费请求；Mock 网络故障最多自动重试一次。

部署时请在 Render/Vercel 控制台填写环境变量，不要创建或提交生产 `.env` 文件。

## 6. 白板日常操作

- `V` Select：选择、移动、缩放、旋转元素。
- `P` Pen：按住鼠标自由绘制；`R` Rectangle、`C` Circle、`T` Text、`E` Eraser。
- `Delete` / `Backspace`：删除选中元素；输入框获得焦点时不会删除白板元素。
- `Ctrl/Cmd+Z`：Undo；`Ctrl/Cmd+Shift+Z` 或 `Ctrl/Cmd+Y`：Redo；`Escape`：取消选择。
- `Ctrl/Cmd+S`、`Save` / `Load`、`Clear`、`Export PNG`：保存、恢复、清空和导出。
- `Bring Forward` / `Send Backward`：调整选中元素图层。

AI Generate 必须经过“输入 → 生成 → 校验 → 预览 → Apply”。`Cancel` 只清除预览；`Apply to Canvas` 会作为一次批量历史操作加入画布。

## 7. AI 出错时怎么处理

1. 访问 `http://localhost:3001/api/health`，确认返回 `status: ok`。
2. 等待几秒后重试；前端会显示 Connecting、Requesting 或 Retry 状态。
3. 如果看到 `Reference: <request-id>`，把编号和发生时间提供给开发者，不要提供环境文件内容。
4. `429` 表示请求过于频繁；`503` 通常表示后端未启动、冷启动或 Live 未配置；`504` 表示超时。
5. 页面显示应用错误时刷新页面即可恢复；损坏的 localStorage 会被安全忽略，不会执行未知内容。

## 8. 日志和排错

一键启动日志写入项目根目录 `logs/runtime/`：`backend-时间.out.log`、`backend-时间.err.log`、`frontend-时间.out.log`、`frontend-时间.err.log` 和 `state.json`。日志不记录请求体、白板内容、环境变量或 API 密钥，`logs/` 不会被 Git 跟踪。

```powershell
.\status-project.cmd
```

端口占用时先看状态，不要删除日志或杀掉所有 `node.exe`。CORS 错误通常是生产 `FRONTEND_ORIGIN` 与浏览器地址不完全一致。

## 9. 公司项目验收

依赖安装完成后，在根目录运行：

```powershell
.\check-project.cmd
```

它会运行前端 lint、单元测试、生产构建，以及后端测试、typecheck、生产构建。需要 Playwright 端到端测试时：

```powershell
.\check-project.cmd -IncludeE2E
```

端到端测试会由 Playwright 启动临时服务，不会复用或停止你正在使用的一键服务。

## 10. 换电脑或复用到其他项目

复制 `start-project.cmd`、`status-project.cmd`、`stop-project.cmd`、`project-start.json` 和 `scripts/` 中对应的 PowerShell 文件，在新项目中只修改 JSON 的服务目录、启动命令和健康地址。详细字段说明见 [可复用项目启动器](reusable-project-launcher.md)。

## 11. 安全底线

- 永远不要提交 `.env`、真实密钥、Cookie、密码或完整个人白板。
- 不要在终端截图中展示密钥。
- 不要使用强制推送或删除历史来“修复”提交。
- 发现疑似密钥泄露时，先停止发布并轮换密钥，再通知维护者。

