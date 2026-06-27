# 🛒 Shopro AI - 抖音电商 AIGC 带货视频系统

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.5.3-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5.4.1-646CFF?logo=vite&logoColor=white" />
  <img alt="TailwindCSS" src="https://img.shields.io/badge/TailwindCSS-3.4.11-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-2.103.1-3FCF8E?logo=supabase&logoColor=white" />
  <img alt="Deno" src="https://img.shields.io/badge/Edge_Functions-Deno-000000?logo=deno&logoColor=white" />
  <img alt="AI" src="https://img.shields.io/badge/AI-AIGC%20Workflow-8B5CF6" />
</p>


##  💎 项目简介

**Shopro-电商AIGC带货视频** 是一款专门解决抖音/TikTok/快手/小红书电商商家在短视频营销中“痛点”（文案撰写难、数字人外籍演员贵、剪辑成本高、跨平台发布低效）的 SaaS 平台。通过「商品信息输入/URL 卖点提取 ➔ AI 智能脚本生成 ➔ 数字人选择与克隆 ➔ 多语言智能翻译 ➔ 分镜编辑 ➔ 素材混剪 ➔ 视频异步合成 ➔ 多平台一键发布」的完整端到端闭环，帮助商家以极低成本快速产出高转化潜力的带货视频。

### ⚡ 核心价值
*   **降低制作成本**：无需雇佣专业剪辑师与外籍主播，AI 一键生成数字人带货视频。
*   **提升生成效率**：从商品 URL 到生成多语种短视频仅需几分钟，完美响应平台热点。
*   **高转化潜力**：基于爆款风格分析和雷达对比图，优化分镜与文案，提炼核心卖点。
*   **全端自适应**：Web 端设计完美适配桌面端与移动端，并支持全系统深色/浅色主题的无缝切换。

## 🛠️ 技术栈

### 🌐 前端技术栈

| 分类 | 技术/依赖 | 版本/说明 | 用途 |
|---|---|---:|---|
| 核心框架 | React | 18.3.1 | 组件化 UI 与状态驱动渲染 |
| 开发语言 | TypeScript | 5.5.3 | 类型约束与工程可维护性 |
| 构建工具 | Vite | 5.4.1 | 快速开发构建与资源打包 |
| 路由 | react-router-dom | 6.26.2 | 页面路由与受保护路由 |
| 数据请求 | @tanstack/react-query | 5.56.2 | 异步请求、缓存与服务状态管理 |
| UI 组件 | Radix UI + shadcn/ui 风格组件 | 多组件库 | Dialog、Select、Tabs、Toast 等基础组件 |
| 样式 | Tailwind CSS / tailwindcss-animate | 3.4.11 | 原子化样式与动画效果 |
| 动效 | framer-motion | 12.4.10 | 页面与组件动效 |
| 图表 | recharts | 2.12.7 | 数据看板与趋势图表 |
| 表格/文件 | xlsx / jspdf / qrcode | 0.18.5 / 4.2.1 / 1.5.4 | Excel、PDF、二维码等导出或生成能力 |
| 代码质量 | Biome / tsgo | 2.4.5 / 0.0.1 | Lint、类型检查与构建前校验 |

### ⚙ 后端与数据服务

| 分类 | 技术/服务 | 说明 | 项目中的作用 |
|---|---|---|---|
| BaaS | Supabase | Auth、PostgreSQL、Storage、Edge Functions | 用户认证、数据持久化、函数计算 |
| 数据库 | PostgreSQL | 由 Supabase 托管 | 存储用户、商品、素材、积分、订单、视频任务等数据 |
| 认证 | Supabase Auth | 邮箱登录/注册与会话管理 | 登录态维护、受保护路由、用户 ID 获取 |
| 服务端函数 | Supabase Edge Functions | Deno Runtime | AI 聚合、视频任务、支付订单、支付回调等接口 |
| 实时/流式 | Server-Sent Events + eventsource-parser | 前端 `src/lib/sse.ts` 封装 | 支持 AI 生成过程中的流式响应解析 |
| 支付 | 微信支付相关 Edge Functions | create-order、webhook、status query | 积分购买与订单状态同步 |

### 🤖 AI 服务与能力

| 分类 | 服务/模块 | 入口 | 主要能力 |
|---|---|---|---|
| 统一 AI 入口 | `ai-assistant` Edge Function | `/functions/v1/ai-assistant` | 脚本、卖点、封面提示词、OpenAPI 调试等通用 AI 动作 |
| 通用集成 API | `INTEGRATIONS_API_KEY` | `ai-assistant` | 作为项目默认 AI 请求密钥来源 |
| 视频生成 | Kling | `kling-video-create` / `kling-video-query` | 创建与查询可灵视频生成任务 |
| 视频生成 | Sora | `sora-video-create` | 创建 Sora 风格视频生成任务 |
| 对话模型 | MiniMax | `minimax-chat` | 聊天/文案类 AI 服务调用 |
| 知识增强 | `knowledge_base` 表 | 前端知识库页面 + AI 函数 | 管理品牌/商品知识，用于生成参考 |
| 缓存与限流 | `llm_cache` / `rate_limit_windows` | Edge Function + 数据库 | 降低重复生成成本，控制调用频率 |

## 📁 目录结构

```text
Shopro AI/
├── src/
│   ├── App.tsx                    # 应用根组件，挂载 QueryClient、AuthProvider、Toast 等
│   ├── routes.tsx                 # 页面路由配置
│   ├── main.tsx                   # React 应用入口
│   ├── index.css                  # Tailwind 与全局样式
│   ├── components/                # 通用业务组件与 UI 组件
│   │   ├── ui/                    # shadcn/ui 风格基础组件
│   │   ├── AppLayout.tsx          # 应用主布局
│   │   ├── ProtectedRoute.tsx     # 登录态保护路由
│   │   ├── CoverCandidates.tsx    # AI 封面候选组件
│   │   └── ...
│   ├── contexts/
│   │   └── AuthContext.tsx        # 认证上下文与用户会话管理
│   ├── db/
│   │   └── supabase.ts            # Supabase Client 初始化
│   ├── hooks/
│   │   ├── useCredits.ts          # 用户积分读取与消耗逻辑
│   │   ├── useDraft.ts            # 页面草稿保存/恢复
│   │   └── use-mobile.tsx         # 移动端断点判断
│   ├── lib/
│   │   ├── sse.ts                 # SSE 流式响应解析工具
│   │   └── utils.ts               # 通用工具函数
│   ├── pages/                     # 业务页面
│   │   ├── HomePage.tsx           # 首页/生成入口
│   │   ├── DashboardPage.tsx      # 数据看板
│   │   ├── ScriptPage.tsx         # AI 脚本工作台
│   │   ├── MaterialsPage.tsx      # 素材库
│   │   ├── ProductsPage.tsx       # 商品管理
│   │   ├── VideoLabPage.tsx       # 视频实验室
│   │   ├── ABTestPage.tsx         # A/B 测试
│   │   ├── CreditsPage.tsx        # 积分与充值
│   │   ├── OpenAPIPage.tsx        # 开放 API 调试/文档页
│   │   └── ...
│   └── types/
│       └── route.ts               # 路由类型定义
├── supabase/
│   ├── functions/                 # Supabase Edge Functions
│   │   ├── ai-assistant/
│   │   ├── create-payment-order/
│   │   ├── wechat-payment-webhook/
│   │   ├── query-payment-status/
│   │   ├── kling-video-create/
│   │   ├── kling-video-query/
│   │   ├── minimax-chat/
│   │   ├── sora-video-create/
│   │   └── ...
│   └── migrations/                # 数据库迁移脚本
├── public/                        # 静态资源
├── package.json                   # 项目依赖与脚本
├── vite.config.ts                 # Vite 配置与路径别名
├── tailwind.config.ts             # Tailwind 主题配置
├── tsconfig*.json                 # TypeScript 配置
└── README.md                      # 项目说明文档
```

## ⚡ 核心功能模块和工作流程

### 1. 🧠 AI 脚本生成工作台

**对应页面**：`ScriptPage.tsx`、`HomePage.tsx`  
**核心能力**：根据商品信息、卖点、场景和风格生成带货视频脚本，并支持草稿恢复、分镜编辑与封面候选。

**工作流程**：

1. 用户登录后进入生成入口或脚本工作台。
2. 选择/录入商品信息、目标人群、卖点和视频风格。
3. 前端调用 `ai-assistant` Edge Function，按 action 分发到对应 AI 生成逻辑。
4. Edge Function 进行鉴权、限流、缓存查询与 AI 请求。
5. 前端接收普通响应或 SSE 流式响应，更新脚本草稿、分镜内容和候选结果。
6. 用户可继续编辑、保存素材或进入视频生成流程。

### 2. 🎬 视频实验室

**对应页面**：`VideoLabPage.tsx`  
**核心能力**：管理 AI 视频生成任务，支持 Kling、Sora 等视频服务创建与查询任务。

**工作流程**：

1. 用户选择脚本、商品素材或封面图作为输入。
2. 前端创建视频任务并调用对应 Edge Function。
3. Edge Function 请求第三方视频生成服务，写入 `video_jobs` / `video_projects`。
4. 前端定时或手动查询任务状态，展示生成进度与结果。

### 3. 🧾 商品与素材管理

**对应页面**：`ProductsPage.tsx`、`MaterialsPage.tsx`  
**核心能力**：维护商品、素材、卖点、图片和品牌资料，为 AI 生成提供结构化上下文。

**数据表**：`products`、`materials`、`cover_candidates`、`knowledge_base`

### 4. 🧪 A/B 测试与效果分析

**对应页面**：`ABTestPage.tsx`、`DashboardPage.tsx`  
**核心能力**：管理多版本脚本/封面/素材，跟踪不同版本表现，辅助内容迭代。

**数据表**：`ab_test_variants`、`audit_logs`

### 5. 💳 积分与支付闭环

**对应页面**：`CreditsPage.tsx`  
**核心能力**：展示积分余额、消耗规则、充值套餐和订单状态。

**工作流程**：

1. 前端读取 `profiles` 和 `credit_costs` 展示积分与消耗规则。
2. 用户选择套餐后调用 `create-payment-order`。
3. 支付成功后微信回调进入 `wechat-payment-webhook`。
4. 系统更新 `orders` 与用户积分余额。
5. 前端通过 `query-payment-status` 查询订单状态并刷新积分。

### 6. 🔌 开放 API 与调试

**对应页面**：`OpenAPIPage.tsx`  
**核心能力**：面向外部系统或开发者展示可调用能力，辅助调试 AI 生成接口、视频任务接口和支付接口。

## ⚙️ 部署指南

### 环境要求

| 工具 | 建议版本 | 说明 |
|---|---:|---|
| Node.js | 18+ | 前端构建与依赖安装 |
| npm / pnpm / yarn | npm 9+ 或等价版本 | 包管理器 |
| Supabase CLI | 最新稳定版 | 本地迁移、函数部署、密钥配置 |
| Supabase Project | 云端项目 | Auth、Database、Functions、Storage |

### 1. 安装依赖

```bash
cd "Shopro AI"
npm install
```

### 2. 配置前端环境变量

在项目根目录创建 `.env` 文件：

```bash
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<your-supabase-anon-key>"
```

> 注意：`VITE_` 前缀变量会被注入前端，请勿放置服务端私钥。

### 3. 初始化数据库

将 `supabase/migrations/` 下的迁移应用到 Supabase 项目：

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

核心数据表包括：

| 表名 | 说明 |
|---|---|
| `profiles` | 用户资料、积分余额等扩展信息 |
| `products` | 商品信息与基础卖点 |
| `materials` | 图片、视频、素材等资源数据 |
| `cover_candidates` | AI 封面候选结果 |
| `video_projects` / `video_jobs` | 视频项目与生成任务 |
| `knowledge_base` | 品牌/商品知识库 |
| `credit_costs` | 各类 AI 能力积分消耗规则 |
| `orders` | 支付订单与充值记录 |
| `ab_test_variants` | A/B 测试版本数据 |
| `llm_cache` | AI 生成缓存 |
| `rate_limit_windows` | AI 调用限流窗口 |
| `audit_logs` | 操作审计日志 |

### 4. 配置 Edge Function Secret

根据实际启用能力配置 Supabase Functions Secrets：

```bash
supabase secrets set \
  SUPABASE_URL="https://<your-project-ref>.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
  INTEGRATIONS_API_KEY="<default-ai-api-key>" \
  WECHAT_PAY_APPID="<wechat-app-id>" \
  WECHAT_PAY_MCHID="<wechat-merchant-id>" \
  WECHAT_PAY_PRIVATE_KEY="<wechat-private-key>" \
  WECHAT_PAY_CERT_SERIAL_NO="<wechat-cert-serial-no>" \
  KLING_API_KEY="<kling-api-key>" \
  KLING_API_SECRET="<kling-api-secret>" \
  MINIMAX_API_KEY="<minimax-api-key>" \
  SORA_API_KEY="<sora-api-key>"
```

> 不同函数所需密钥不同，未启用的第三方能力可暂不配置。

### 5. 部署 Edge Functions

```bash
supabase functions deploy ai-assistant
supabase functions deploy create-payment-order
supabase functions deploy wechat-payment-webhook
supabase functions deploy query-payment-status
supabase functions deploy kling-video-create
supabase functions deploy kling-video-query
supabase functions deploy minimax-chat
supabase functions deploy sora-video-create
```

### 6. 本地开发与生产构建

```bash
# 代码质量检查
npm run lint

# 生产构建
npm run build
```

> 当前 `package.json` 中 `dev` 脚本被设置为提示命令：`Do not use this command, only use lint to check`。如需本地预览开发，可按团队规范补充 `vite --host 0.0.0.0` 等开发脚本。

## 📦 API 接口

### Supabase Edge Functions

| 接口/函数 | 方法 | 入参概览 | 返回概览 | 说明 |
|---|---|---|---|---|
| `/functions/v1/ai-assistant` | POST | `action`、业务 payload、用户上下文 | AI 文案、脚本、封面提示词或结构化结果 | 统一 AI 能力入口，内置缓存、限流、鉴权逻辑 |
| `/functions/v1/create-payment-order` | POST | 套餐/金额、用户 ID、订单信息 | 订单号、支付参数、二维码/支付信息 | 创建微信支付订单并写入 `orders` |
| `/functions/v1/wechat-payment-webhook` | POST | 微信支付回调报文 | 回调处理结果 | 验签、更新订单状态、发放积分 |
| `/functions/v1/query-payment-status` | POST/GET | 订单号或订单 ID | 支付状态、订单详情 | 查询订单支付状态，供前端轮询刷新 |
| `/functions/v1/kling-video-create` | POST | prompt、图片/素材、视频参数 | 任务 ID、初始状态 | 创建 Kling 视频生成任务 |
| `/functions/v1/kling-video-query` | POST/GET | Kling 任务 ID | 任务状态、视频结果 | 查询 Kling 视频生成进度 |
| `/functions/v1/minimax-chat` | POST | messages、模型参数 | 对话生成结果 | 调用 MiniMax 对话模型 |
| `/functions/v1/sora-video-create` | POST | prompt、视频参数 | 任务 ID、状态 | 创建 Sora 视频任务 |
| `/functions/v1/test-wenxin` | POST | 测试 prompt/参数 | 测试响应 | 文心相关能力测试函数 |
| `/functions/v1/test-kling` | POST | 测试 prompt/参数 | 测试响应 | Kling 相关能力测试函数 |

### 前端直接访问的数据表

| 数据表 | 主要操作 | 使用场景 |
|---|---|---|
| `profiles` | 查询/更新 | 用户资料、积分余额展示 |
| `products` | 增删改查 | 商品管理、脚本生成输入 |
| `materials` | 增删改查 | 素材库管理 |
| `cover_candidates` | 查询/插入/删除 | AI 封面候选生成与管理 |
| `video_projects` / `video_jobs` | 查询/更新 | 视频实验室任务管理 |
| `knowledge_base` | 查询/维护 | 品牌知识、商品知识补充 |
| `credit_costs` | 查询 | AI 能力积分消耗规则 |
| `orders` | 查询/更新 | 订单状态、充值记录 |
| `ab_test_variants` | 查询/维护 | A/B 测试版本管理 |
| `audit_logs` | 插入/查询 | 关键操作审计 |

## 🔐 权限与安全设计

- **前端仅使用 `VITE_SUPABASE_ANON_KEY`**：敏感密钥必须存放在 Supabase Function Secrets。
- **用户会话统一由 `AuthContext` 管理**：受保护页面通过 `ProtectedRoute` 控制访问。
- **AI 调用集中在 Edge Function**：便于统一限流、缓存、审计和密钥隔离。
- **支付回调服务端处理**：避免前端直接决定充值结果。
- **数据库建议开启 RLS**：根据用户 ID 限制商品、素材、订单等数据访问范围。

## 🧪 质量检查

项目提供统一 lint 脚本：

```bash
npm run lint
```

该脚本包含：

1. TypeScript 类型检查：`tsgo -p tsconfig.check.json`
2. Biome Lint：`npx biome lint`
3. 自定义规则检查：`.rules/check.sh`
4. Tailwind CSS 语法检查
5. 构建校验：`.rules/testBuild.sh`

## 💡 常见问题

### 1. 为什么 `npm run dev` 不能启动本地服务？

当前 `package.json` 中 `dev` 被设置为提示命令，说明团队希望优先运行 lint/构建检查。如需本地开发，可与团队确认后改为：

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0"
  }
}
```

### 2. AI 生成失败通常该检查什么？

优先检查：

- Supabase Edge Function 是否已部署。
- `INTEGRATIONS_API_KEY` 或对应第三方模型密钥是否已配置。
- 当前用户是否登录、积分是否充足。
- `llm_cache`、`rate_limit_windows`、函数日志中是否存在限流或调用异常。

### 3. 支付成功但积分未到账怎么办？

检查 `orders` 表订单状态、`wechat-payment-webhook` 函数日志和微信支付回调配置；如果回调未触发，可通过 `query-payment-status` 主动查询订单状态并补偿刷新。

## 📌 总结

Shopro AI 是一个以 **AIGC 电商视频生产** 为核心的全链路工作台：前端负责交互与生产流程编排，Supabase 提供认证、数据和 Edge Functions，AI/视频/支付等外部服务通过服务端函数统一接入。项目结构清晰，适合继续扩展为多租户电商内容 SaaS、AI 视频批量生产平台或品牌内容增长工具。
