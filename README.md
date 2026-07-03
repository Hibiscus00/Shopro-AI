# 🛒 Shopro AI - 抖音/TikTok 电商 AIGC 带货视频系统

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.5.3-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5.4.1-646CFF?logo=vite&logoColor=white" />
  <img alt="TailwindCSS" src="https://img.shields.io/badge/TailwindCSS-3.4.11-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-2.103.1-3FCF8E?logo=supabase&logoColor=white" />
  <img alt="Deno" src="https://img.shields.io/badge/Edge_Functions-Deno-000000?logo=deno&logoColor=white" />
  <img alt="AI" src="https://img.shields.io/badge/AI-DeepSeek_v4_Pro-blue" />
  <img alt="Audio" src="https://img.shields.io/badge/Audio-StepAudio_2.5-orange" />
  <img alt="Video" src="https://img.shields.io/badge/Video-Seedance_2.0-violet" />
</p>

---

## 💎 项目简介

**Shopro-电商AIGC带货视频** 是一款面向跨境与本土兴趣电商商家（如抖音、TikTok、快手、小红书、Amazon 等）的 SaaS 平台。该系统通过深度融合先进的多模态大模型与全链路智能工作流，解决商家在短视频营销中面临的“文案撰写难、数字人外籍演员贵、剪辑成本高、多语言本地化差、跨平台发布繁琐”等痛点。

系统支持从「商品信息输入/URL 卖点提取 ➔ AI 智能脚本生成 ➔ 数字人选择与克隆 ➔ 多语言智能翻译 ➔ 分镜编辑 ➔ 素材混剪 ➔ 视频异步合成 ➔ 多平台一键发布」的完整闭环，将传统的五人工作流压缩为“一人 + 浏览器”，帮助商家以极低成本高速量产高转化的爆款短视频。
<img width="1884" height="1212" alt="image" src="https://github.com/user-attachments/assets/e8b5767a-6113-4193-af0e-954e29b68f32" />
<img width="2350" height="1153" alt="image" src="https://github.com/user-attachments/assets/73f7d470-a504-49c1-9057-92cef8135aad" />
<img width="2507" height="1330" alt="image" src="https://github.com/user-attachments/assets/5c08e561-71b1-4ee0-8913-5d8ee86650ee" />

### ⚡ 核心价值
*   **极致降本**：无需聘请外籍主播与剪辑师，单条视频生成成本降至不足 1 元。
*   **极致增效**：从商品 URL 到生成多语种情感数字人口播视频仅需 3-5 分钟。
*   **转化导向**：引入营销学“说服框架”，对文案进行 CoT 分层打标签，自动映射数字人情绪。
*   **数据驱动**：集成 ROI 预测、A/B 分镜测试及投放数据回流闭环，越用越聪明。
*   **全自适应体验**：高精度的暗色/浅色玻璃态 UI，支持移动端和桌面端无缝响应。

---

## 🛠️ 技术栈

### 🌐 前端技术栈

| 分类 | 技术/依赖 | 版本/说明 | 用途 |
|---|---|---:|---|
| 核心框架 | React | 18.3.1 | 组件化 UI 与状态驱动渲染 |
| 开发语言 | TypeScript | 5.5.3 | 强类型约束，提升工程可维护性 |
| 构建工具 | Vite | 5.4.1 | 极速热更新，生产资源打包优化 |
| 路由管理 | react-router-dom | 6.26.2 | 单页路由及受保护路由 |
| 状态/异步 | @tanstack/react-query | 5.56.2 | 异步数据缓存、乐观更新与生命周期管理 |
| UI 组件 | Radix UI + shadcn/ui | 基础组件 | Dialog、Select、Tabs、Tooltip、Sheet 等 |
| 样式系统 | Tailwind CSS / tailwindcss-animate | 3.4.11 | 原子化布局、过渡及高精度动效 |
| 动画驱动 | framer-motion | 12.4.10 | 页面进入、列表卡片拖拽与过渡动画 |
| 数据可视化 | recharts | 2.12.7 | 流量数据看板、雷达图、转化漏斗图 |
| 文件导出 | xlsx / jspdf / qrcode | 最新版 | 支持分镜 Excel 导出、脚本 PDF 以及微信支付二维码 |
| 代码质量 | Biome / tsgo | 2.4.5 / 0.0.1 | 极速 Lint、格式化及预构建类型检查 |

### ⚙ 后端与数据服务

| 分类 | 技术/服务 | 说明 | 项目中的作用 |
|---|---|---|---|
| 云服务 BaaS | Supabase | Auth、DB、Storage、Edge Functions | 全栈后端云服务托管 |
| 数据库 | PostgreSQL | 由 Supabase 托管 | RLS 物理数据隔离，pgvector 向量模糊搜索 |
| 账户认证 | Supabase Auth | 邮箱/手机登录与会话管理 | JWT 登录态维护、权限路由钩子 |
| 边缘计算 | Supabase Edge Functions | Deno 运行时 | AI 编排、支付闭环、竞品抓取、团队协作接口 |
| 实时流式 | SSE + eventsource-parser | 前端 `src/lib/sse.ts` 封装 | 实现打字机流式（SSE）文本响应解析 |
| 并发安全 | SQL 悲观锁 (`SELECT ... FOR UPDATE`) | 积分扣减存储过程 | 杜绝并发薅算力漏洞，确保计费安全 |

### 🤖 AI 服务与多模态模型

| 模块/能力 | 对接模型 | 调用入口 / SDK | 用途与优势 |
|---|---|---|---|
| **文本大模型** | **DeepSeek-V4-Pro** | `/functions/v1/deepseek-v4-pro` | 营销文案、多语种翻译、商品特征解析、NLP情感极值标注 |
| **语音大模型** | **StepAudio 2.5** | `/functions/v1/stepaudio` (asr/tts) | `stepaudio-2.5-tts` 情感化语音合成，`stepaudio-2.5-asr` 录音ITN规范转录 |
| **视频生成** | **Seedance 2.0** | `/functions/v1/seedance` (submit/query) | `seedance-2-0-fast-260128` 物理级高画质多模态短视频生成与图生视频 |
| **图像/封面** | **Flux 1.1 Pro** | `ai-assistant` (generate_cover) | 竖版高分辨率带货短视频封面设计及图生图参考 |
| **备份视频** | Kling / Sora | `/functions/v1/kling-video-create` / `sora` | 备用高端概念短片生成与转场渲染 |
| **备份对话** | MiniMax-M3 | `/functions/v1/minimax-chat` | 备用聊天模型与目标受众痛点推导 |
| **向量搜索** | OpenAI Text-Embedding-Ada-002 | RAG 向量知识库 / RPC | 将高分脚本与话术进行 Few-shot 匹配增强 |

---

## 📁 目录结构与 42 个核心页面

```text
Shopro AI/
├── src/
│   ├── App.tsx                    # 应用根组件，挂载 React-Query、AuthProvider、Toaster
│   ├── routes.tsx                 # 页面路由配置 (受保护路由与公开路由)
│   ├── main.tsx                   # React 项目打包入口
│   ├── index.css                  # 全局样式，包含 Tailwind 与玻璃态主题变量
│   ├── components/                # 业务公共组件
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx     # 核心主布局，实现全局搜索、通知 Bell、侧边栏及主题切换
│   │   ├── ui/                    # shadcn 风格原子级组件 (Button, Dialog, Badge, Input...)
│   │   ├── CoverCandidates.tsx    # AI 封面多候选展示与下载
│   │   └── ...
│   ├── contexts/
│   │   └── AuthContext.tsx        # Supabase Session 及积分变化广播
│   ├── db/
│   │   └── supabase.ts            # Client 单例初始化
│   ├── hooks/
│   │   ├── use-mobile.tsx         # 移动端断点检测
│   │   ├── use-toast.ts           # Toast 通知
│   │   ├── useCredits.ts          # 积分查询与实时更新控制
│   │   └── useDraft.ts            # 页面内容本地缓存恢复
│   ├── lib/
│   │   ├── audioRecorder.ts       # 麦克风录音控制 (配合 StepAudio ASR)
│   │   ├── sse.ts                 # SSE 流式解析及 StepAudio / Seedance API 轮询
│   │   └── utils.ts               # CSS 样式合并等辅助函数
│   ├── pages/                     # 业务页面 (42个核心页面及子页面)
│   │   ├── LandingPage.tsx        # 品牌官网首页，展示核心卖点、价格与数字人 Demo
│   │   ├── LoginPage.tsx          # 登录注册页面 (支持验证码与密码双重认证)
│   │   ├── DashboardPage.tsx      # 工作台主页，展示快捷入口、生成历史和关键指标
│   │   ├── HomePage.tsx           # 视频生成工作流 (包含四步脚本向导及生成配置)
│   │   ├── VideoCreatePage.tsx    # 视频生成配置中心
│   │   ├── VideoEditPage.tsx      # 可视化多轨道分镜编辑器 (字幕轨、人像轨、声轨)
│   │   ├── WorksPage.tsx          # 作品管理，包含合成进度及视频回放
│   │   ├── MaterialsPage.tsx      # 素材库管理 (支持分类上传及删除)
│   │   ├── ProductsPage.tsx       # 商品库，商品新增、URL 自动提取卖点
│   │   ├── ProductSelectionPage.tsx# 智能选品工坊，分析热门爆款商品
│   │   ├── AvatarsPage.tsx        # 数字人库，支持上传头像图片及 StepAudio TTS 试听
│   │   ├── TemplatesPage.tsx      # 视频模板库，一键套用带货模板
│   │   ├── ScriptPage.tsx         # 脚本管理，可在此独立撰写、导出
│   │   ├── StyleCopyPage.tsx      # 爆款风格复刻页，输入竞品链接自动抽取节奏
│   │   ├── KnowledgePage.tsx      # 品牌/商品知识库 (用于 RAG 检索 Few-shot)
│   │   ├── CompetitorPage.tsx     # 竞品爆款监控分析
│   │   ├── LiveHighlightPage.tsx  # 直播高光切片提取器
│   │   ├── AnalyticsPage.tsx      # 流量漏斗、完播率及 ROI 分析图表
│   │   ├── ProfilePage.tsx        # 个人中心及账号安全设置
│   │   ├── CreditsPage.tsx        # 积分商城与充值收银台
│   │   ├── OrderDetailPage.tsx    # 微信支付订单状态页
│   │   ├── PromptTemplatesPage.tsx# 系统 Prompt 策略管理页
│   │   ├── ActivitiesPage.tsx     # 操作日志与审计足迹
│   │   ├── InvitePage.tsx         # 邀请有礼推广页面
│   │   ├── ABTestPage.tsx         # A/B 测试管理中心 (脚本/封面版本对比)
│   │   ├── EmotionAnalysisPage.tsx# NLP 情绪分析与时间轴对齐工作区
│   │   ├── MultiLangPage.tsx      # 多语言翻译控制台
│   │   ├── TaskQueuePage.tsx      # 视频生成异步任务队列监控
│   │   ├── ExportFormatsPage.tsx  # 跨平台多格式导出 (Excel/PDF/视频)
│   │   ├── LLMCachePage.tsx       # AI 缓存命中率监控与管理
│   │   ├── TeamSpacePage.tsx      # 团队协作空间 (角色权限、协作管理)
│   │   ├── OpenAPIPage.tsx        # 开放开发平台 (API Key 生成与 API 调试)
│   │   ├── DataFeedbackPage.tsx   # 广告回流与自学习面板
│   │   ├── TrendingPatternsPage.tsx# 千万级热门爆款视频模式分析
│   │   ├── PersonalizePage.tsx    # 账号私有风格模型定制微调
│   │   ├── BatchCreatePage.tsx    # 批量生成管理器
│   │   ├── AiToolboxPage.tsx      # 营销 AI 工具箱 (关键词提取、字幕打点等)
│   │   ├── NotificationsPage.tsx  # 系统通知中心
│   │   └── NotFound.tsx           # 404 兜底页
│   └── types/
│       ├── types.ts               # 数据模型 (Product, Material, Team, Job...)
│       └── route.ts               # 路由定义
├── supabase/
│   ├── functions/                 # Deno 边缘函数微服务
│   │   ├── ai-assistant/          # 统一 AI 网关，内置 llm 动作控制
│   │   ├── deepseek-v4-pro/       # DeepSeek V4 文本生成代理 (带 API Fallback)
│   │   ├── stepaudio/             # StepAudio 2.5 ASR 和 TTS 物理代理
│   │   ├── seedance/              # Seedance 2.0 异步视频生成/状态查询
│   │   ├── phase3-assistant/      # 竞品抓取、直播分析、团队、APIKey、发布管理
│   │   ├── create-payment-order/  # 创建微信支付订单及二维码生成
│   │   ├── wechat-payment-webhook/# 微信支付成功回调验签及充值入账
│   │   ├── query-payment-status/  # 支付轮询查询接口
│   │   ├── kling-video-create/    # 可灵视频任务创建
│   │   ├── kling-video-query/     # 可灵视频任务查询
│   │   ├── minimax-chat/          # MiniMax 接口代理
│   │   ├── sora-video-create/     # Sora 视频任务创建
│   │   ├── sora-video-query/      # Sora 视频任务查询
│   │   ├── send-sms-code/         # 验证码发送 (短信服务集成)
│   │   ├── verify-sms-code/       # 验证码登录验证
│   │   └── setup-demo/            # 演示数据初始化种子数据
│   └── migrations/                # 19 个 PostgreSQL 数据库迁移文件 (含 RLS 及防薅 RPC 锁)
```

---

## ⚡ 核心功能模块与工作流

### 1. 🧠 AI 脚本生成工作台 (`HomePage.tsx`, `ScriptPage.tsx`)
*   **入口**：用户在工作台点击“生成视频”或进入“AI智能脚本”。
*   **动作**：
    1. 输入商品详情 URL，后端通过 `extract_url_selling_points` 抓取并利用 **DeepSeek-V4-Pro** 提炼卖点。
    2. 基于 CoT（思维链）四层营销架构，流式（SSE）生成分镜脚本：钩子（Hook）➔ 痛点（Pain Point）➔ 产品介绍（Product）➔ 行动召唤（CTA）。
    3. 用户可在时间轴中调整或微调文本，并自动通过 Embedding 写入向量缓存，供下一次 Few-shot 参考进化。

### 2. 👥 数字人情感合成与多轨剪辑 (`AvatarsPage.tsx`, `VideoEditPage.tsx`)
*   **情绪对齐**：系统利用 NLP 分析台词的情感极值，在分镜时间轴上自动映射数字人的面部表情（平和、喜悦、担忧、激动、说服）与语气。
*   **多模态配音**：利用 `stepaudio-2.5-tts` 根据情感标记生成自然拟真的小语种配音。
*   **多轨道编辑器**：在网页端提供多轨道可视化 Canvas 剪辑面板，直观拖拽分镜卡片、配音音轨、字幕，实现免学习拼积木式合成。

### 3. 💡 流量追踪、A/B测试与广告回流 (`ABTestPage.tsx`, `AnalyticsPage.tsx`, `DataFeedbackPage.tsx`)
*   **漏斗分析**：展示不同视频版本的转化漏斗图（播放量-完播率-点击率-成交金额），直接计算 ROI。
*   **A/B测试**：同一商品配置多组脚本/封面，在线追踪测试，智能淘汰低效版本。
*   **自适应优化**：将真实投放转化差的文案数据回流，自动反馈给 AI 训练，对低分脚本进行“一键调优”重写。

### 4. 🔗 团队协作与 OpenAPI 开放平台 (`TeamSpacePage.tsx`, `OpenAPIPage.tsx`)
*   **团队协作**：支持主账号创建团队空间，通过邮箱发送邀请凭证，配置管理员或协作者角色，共享素材库与作品集。
*   **OpenAPI 调试**：面向大商户或 ERP 系统，提供 `ak_...` 自定义 API 密钥生成、Revoke 控制，并附带在线交互式 API 沙箱调试器。

---

## ⚙️ 部署指南

### 环境要求
*   **Node.js**: 18.0 或更高版本
*   **包管理器**: npm / pnpm
*   **Supabase CLI**: 最新稳定版 (本地 Deno 测试及数据库迁移推送)

### 1. 克隆与安装依赖
```bash
cd "Shopro AI"
npm install
```

### 2. 配置前端环境变量
在项目根目录创建 `.env` 文件：
```env
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<your-supabase-anon-key>"
VITE_DEEPSEEK_API_KEY="<your-deepseek-key>" # 备用本地 Fallback 调用
VITE_STEP_API_KEY="<your-step-key>" # 备用本地 Fallback 调用
VITE_SEEDANCE_API_KEY="<your-seedance-key>" # 备用本地 Fallback 调用
```

### 3. 部署数据库迁移
连接你的 Supabase 项目并应用迁移：
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 4. 配置服务端 Secret
在 Supabase 控制台或使用 CLI 设置 Secrets：
```bash
supabase secrets set \
  INTEGRATIONS_API_KEY="<default-ai-gateway-key>" \
  DEEPSEEK_API_KEY="<deepseek-api-key>" \
  STEP_API_KEY="<step-api-key>" \
  SEEDANCE_API_KEY="<seedance-api-key>" \
  WECHAT_PAY_APPID="<wechat-app-id>" \
  WECHAT_PAY_MCHID="<wechat-merchant-id>" \
  WECHAT_PAY_PRIVATE_KEY="<wechat-private-key>" \
  WECHAT_PAY_CERT_SERIAL_NO="<wechat-cert-serial-no>" \
  KLING_API_KEY="<kling-key>" \
  KLING_API_SECRET="<kling-secret>" \
  MINIMAX_API_KEY="<minimax-key>" \
  SORA_API_KEY="<sora-key>"
```

### 5. 部署边缘函数
```bash
supabase functions deploy ai-assistant
supabase functions deploy deepseek-v4-pro
supabase functions deploy stepaudio
supabase functions deploy seedance
supabase functions deploy phase3-assistant
supabase functions deploy create-payment-order
supabase functions deploy wechat-payment-webhook
supabase functions deploy query-payment-status
supabase functions deploy kling-video-create
supabase functions deploy kling-video-query
supabase functions deploy minimax-chat
supabase functions deploy sora-video-create
supabase functions deploy sora-video-query
supabase functions deploy send-sms-code
supabase functions deploy verify-sms-code
supabase functions deploy setup-demo
```

### 6. 代码质检与预构建
```bash
# 执行类型检查、Biome 格式化、Tailwind 语法校验及测试构建
npm run lint

# 生成生产包
npm run build
```

---

## 🔐 安全性与并发设计

1.  **RLS 行级安全**：所有 PostgreSQL 数据表默认开启 `ROW LEVEL SECURITY`。商户的商品、视频任务、充值订单、团队资源等均绑定到 `auth.uid()`，通过外键约束在物理数据库层隔离。
2.  **防薅积分锁 (Optimistic Lock & DB Transaction)**：对于调用外部 API 需计费的动作（如 Seedance 视频合成），系统在下发 API 动作前，会执行一个高并发安全的存储过程。通过 `SELECT ... FOR UPDATE` 加上排他锁，余额校验无误后才执行扣减，防止并发溢出薅免费算力。
3.  **敏感密钥零泄漏**：前端仅暴露 Supabase 公钥 `VITE_SUPABASE_ANON_KEY`。所有的 API 密钥如 `STEP_API_KEY`、`SEEDANCE_API_KEY` 等均安全隔离在 Supabase 服务端 Vault Secrets 中。

---

## 🧪 常见问题解答 (FAQ)

### 1. 为什么 `npm run dev` 报错/无法启动本地服务？
为保证大促演示期间的系统稳定性，默认 package.json 禁用了 dev 本地暴露，开发测试时请确保先跑通 `npm run lint` 校验。若需启动本地预览，可与团队开发确认后修改为 `"dev": "vite --host 0.0.0.0"`，并通过控制台接入。

### 2. 视频异步合成显示“等待中”卡住如何排查？
*   确认 Supabase Service Role Key 部署正确，以确保 Edge Function 能够安全回写 `video_jobs` 的 `status` 状态。
*   检查 Seedance 任务日志，确定是否因为账户欠费或首尾帧图的分辨率比例不符（推荐使用 9:16 标准比例）导致接口拦截。

### 3. 如何配置多用户共享团队额度？
进入 `团队协作空间 (TeamSpacePage)` 创设团队后，添加成员邮箱。成员确认后，其扣费存储过程会自动向上追溯团队所有者 (Owner) 的积分余额包。

---

## 📌 总结

Shopro AI 是一套面向 **带货短视频量产** 领域的一站式 SaaS 系统。项目融合了 DeepSeek-V4-Pro、StepAudio 2.5、Seedance 2.0 等前沿多模态大模型，以极高的工程化完成度打通了“文案-配音-画面-数据回流-团队协作-支付”的商业化完整闭环。具有极高的商业化落地价值和出海想象空间。
