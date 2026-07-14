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

## 📋 项目简介

**Shopro-电商AIGC带货视频** 是一款面向电商商家（如抖音、TikTok、快手、小红书、Amazon 等）的 SaaS 平台。该系统通过深度融合先进的多模态大模型与全链路智能工作流，解决商家在短视频营销中面临的"文案撰写难、数字人外籍演员贵、剪辑成本高、多语言本地化差、跨平台发布繁琐"等痛点。

系统支持从「商品信息输入/URL 卖点提取 ➔ AI 智能脚本生成 ➔ 数字人选择与克隆 ➔ 多语言智能翻译 ➔ 分镜编辑 ➔ 素材混剪 ➔ 视频异步合成 ➔ 多平台一键发布」的完整闭环，将传统的五人工作流压缩为"一人 + 浏览器"，帮助商家以极低成本高速量产高转化的爆款短视频。

### ✨ 核心价值

| 价值维度 | 具体体现 |
|---|---|
| **极致降本** | 无需聘请外籍主播与剪辑师，单条视频生成成本降至不足 1 元 |
| **极致增效** | 从商品 URL 到生成多语种情感数字人口播视频仅需 3-5 分钟 |
| **转化导向** | 引入营销学"说服框架"，对文案进行 CoT 分层打标签，自动映射数字人情绪 |
| **数据驱动** | 集成 ROI 预测、A/B 分镜测试及投放数据回流闭环，越用越聪明 |
| **全自适应体验** | 高精度的暗色/浅色玻璃态 UI，支持移动端和桌面端无缝响应 |

---

## 🛠️ 技术栈

### 🌐 前端技术栈

| 分类 | 技术/依赖 | 版本 | 用途 |
|---|---|---:|---|
| 核心框架 | React | 18.3.1 | 组件化 UI 与状态驱动渲染 |
| 开发语言 | TypeScript | 5.5.3 | 强类型约束，提升工程可维护性 |
| 构建工具 | Vite | 5.4.1 | 极速热更新，生产资源打包优化 |
| 路由管理 | react-router-dom | 6.26.2 | 单页路由及受保护路由 |
| 状态/异步 | @tanstack/react-query | 5.56.2 | 异步数据缓存、乐观更新与生命周期管理 |
| UI 组件 | Radix UI + shadcn/ui | 基础组件 | Dialog、Select、Tabs、Tooltip、Sheet 等 |
| 样式系统 | Tailwind CSS | 3.4.11 | 原子化布局、过渡及高精度动效 |
| 动画驱动 | framer-motion | 12.4.10 | 页面进入、列表卡片拖拽与过渡动画 |
| 数据可视化 | recharts | 2.12.7 | 流量数据看板、雷达图、转化漏斗图 |
| 文件导出 | xlsx / jspdf / qrcode | 最新版 | 支持分镜 Excel 导出、脚本 PDF 以及微信支付二维码 |
| 代码质量 | Biome / tsgo | 2.4.5 | 极速 Lint、格式化及预构建类型检查 |

### ⚙️ 后端与数据服务

| 分类 | 技术/服务 | 说明 | 项目中的作用 |
|---|---|---|---|
| 云服务 BaaS | Supabase | Auth、DB、Storage、Edge Functions | 全栈后端云服务托管 |
| 数据库 | PostgreSQL | 由 Supabase 托管 | RLS 物理数据隔离，pgvector 向量模糊搜索 |
| 账户认证 | Supabase Auth | 邮箱/手机登录与会话管理 | JWT 登录态维护、权限路由钩子 |
| 边缘计算 | Supabase Edge Functions | Deno 运行时 | AI 编排、支付闭环、竞品抓取、团队协作接口 |
| 实时流式 | SSE + eventsource-parser | 前端 `src/lib/sse.ts` 封装 | 实现打字机流式文本响应解析 |
| 并发安全 | SQL 悲观锁 (`SELECT ... FOR UPDATE`) | 积分扣减存储过程 | 杜绝并发薅算力漏洞，确保计费安全 |

### 🤖 AI 服务与多模态模型

| 模块/能力 | 对接模型 | 调用入口 / SDK | 用途与优势 |
|---|---|---|---|
| **文本大模型** | **DeepSeek-V4-Pro** | `/functions/v1/deepseek-v4-pro` | 营销文案、多语种翻译、商品特征解析、NLP情感极值标注 |
| **语音大模型** | **StepAudio 2.5** | `/functions/v1/stepaudio` (asr/tts) | 情感化语音合成，录音ITN规范转录 |
| **视频生成** | **Seedance 2.0** | `/functions/v1/seedance` (submit/query) | 物理级高画质多模态短视频生成与图生视频 |
| **图像/封面** | **Flux 1.1 Pro** | `ai-assistant` (generate_cover) | 竖版高分辨率带货短视频封面设计及图生图参考 |
| **备份视频** | Kling / Sora | `/functions/v1/kling-video-create` / `sora` | 备用高端概念短片生成与转场渲染 |
| **备份对话** | MiniMax-M3 | `/functions/v1/minimax-chat` | 备用聊天模型与目标受众痛点推导 |
| **向量搜索** | OpenAI Text-Embedding-Ada-002 | RAG 向量知识库 / RPC | 将高分脚本与话术进行 Few-shot 匹配增强 |

---

## 📁 目录结构

```text
Shopro AI/
├── src/                                    # 前端源代码
│   ├── App.tsx                             # 应用根组件，挂载 React-Query、AuthProvider、Toaster
│   ├── routes.tsx                          # 页面路由配置 (受保护路由与公开路由)
│   ├── main.tsx                            # React 项目打包入口
│   ├── index.css                           # 全局样式，包含 Tailwind 与玻璃态主题变量
│   ├── components/                         # 业务公共组件
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx              # 核心主布局，全局搜索、通知、侧边栏及主题切换
│   │   ├── ui/                             # shadcn 风格原子级组件
│   │   ├── CoverCandidates.tsx             # AI 封面多候选展示与下载
│   │   ├── HeroSection.tsx                 # 首页英雄区
│   │   ├── Navbar.tsx                      # 导航栏
│   │   └── ...
│   ├── contexts/
│   │   └── AuthContext.tsx                 # Supabase Session 及积分变化广播
│   ├── db/
│   │   └── supabase.ts                     # Client 单例初始化
│   ├── hooks/
│   │   ├── use-mobile.tsx                  # 移动端断点检测
│   │   ├── use-toast.ts                    # Toast 通知
│   │   ├── useCredits.ts                   # 积分查询与实时更新控制
│   │   └── useDraft.ts                     # 页面内容本地缓存恢复
│   ├── lib/
│   │   ├── audioRecorder.ts                # 麦克风录音控制
│   │   ├── sse.ts                          # SSE 流式解析及 API 轮询
│   │   └── utils.ts                        # CSS 样式合并等辅助函数
│   ├── pages/                              # 业务页面 (42个核心页面)
│   │   ├── LandingPage.tsx                 # 品牌官网首页
│   │   ├── LoginPage.tsx                   # 登录注册页面
│   │   ├── DashboardPage.tsx               # 工作台主页
│   │   ├── HomePage.tsx                    # 视频生成工作流
│   │   ├── VideoCreatePage.tsx             # 视频生成配置中心
│   │   ├── VideoEditPage.tsx               # 可视化多轨道分镜编辑器
│   │   ├── WorksPage.tsx                   # 作品管理
│   │   ├── ProductsPage.tsx                # 商品库
│   │   ├── AvatarsPage.tsx                 # 数字人库
│   │   ├── TemplatesPage.tsx               # 视频模板库
│   │   ├── AnalyticsPage.tsx               # 流量分析
│   │   ├── CompetitorPage.tsx              # 竞品爆款监控
│   │   ├── LiveHighlightPage.tsx           # 直播高光切片提取
│   │   ├── TeamSpacePage.tsx               # 团队协作空间
│   │   ├── OpenAPIPage.tsx                 # 开放开发平台
│   │   └── ...
│   └── types/
│       ├── types.ts                        # 数据模型定义
│       └── route.ts                        # 路由类型定义
├── supabase/                               # Supabase 后端配置
│   ├── functions/                          # Deno 边缘函数微服务 (16+ 个)
│   │   ├── ai-assistant/                   # 统一 AI 网关
│   │   ├── deepseek-v4-pro/                # DeepSeek V4 文本生成代理
│   │   ├── stepaudio/                      # StepAudio ASR 和 TTS
│   │   ├── seedance/                       # Seedance 视频生成
│   │   ├── create-payment-order/           # 微信支付订单创建
│   │   ├── wechat-payment-webhook/         # 微信支付回调
│   │   └── ...
│   └── migrations/                         # 21 个数据库迁移文件
├── docs/                                   # 项目文档
├── public/                                 # 静态资源
└── package.json                            # 项目依赖配置
```

---

## ⚡ 核心功能模块和工作流程

### 1. 🧠 AI 脚本生成工作台

**入口**: 用户在工作台点击"生成视频"或进入"AI智能脚本"

**工作流程**:
```
商品 URL 输入 → 后端 extract_url_selling_points 抓取 → DeepSeek-V4-Pro 提炼卖点
    ↓
基于 CoT 四层营销架构（钩子→痛点→产品→CTA）→ 流式（SSE）生成分镜脚本
    ↓
用户在时间轴中调整或微调文本 → 自动通过 Embedding 写入向量缓存 → Few-shot 参考进化
```

**涉及文件**:
- [HomePage.tsx](src/pages/HomePage.tsx)
- [ScriptPage.tsx](src/pages/ScriptPage.tsx)
- [ai-assistant/index.ts](supabase/functions/ai-assistant/index.ts)

### 2. 👥 数字人情感合成与多轨剪辑

**情绪对齐**: 系统利用 NLP 分析台词的情感极值，在分镜时间轴上自动映射数字人的面部表情与语气

**多模态配音**: 利用 `stepaudio-2.5-tts` 根据情感标记生成自然拟真的小语种配音

**多轨道编辑器**: 在网页端提供多轨道可视化 Canvas 剪辑面板，直观拖拽分镜卡片、配音音轨、字幕

**涉及文件**:
- [AvatarsPage.tsx](src/pages/AvatarsPage.tsx)
- [VideoEditPage.tsx](src/pages/VideoEditPage.tsx)

### 3. 💡 流量追踪、A/B测试与广告回流

**漏斗分析**: 展示不同视频版本的转化漏斗图（播放量-完播率-点击率-成交金额），直接计算 ROI

**A/B测试**: 同一商品配置多组脚本/封面，在线追踪测试，智能淘汰低效版本

**自适应优化**: 将真实投放转化差的文案数据回流，自动反馈给 AI 训练，对低分脚本进行"一键调优"重写

**涉及文件**:
- [ABTestPage.tsx](src/pages/ABTestPage.tsx)
- [AnalyticsPage.tsx](src/pages/AnalyticsPage.tsx)
- [DataFeedbackPage.tsx](src/pages/DataFeedbackPage.tsx)

### 4. 🔗 团队协作与 OpenAPI 开放平台

**团队协作**: 支持主账号创建团队空间，通过邮箱发送邀请凭证，配置管理员或协作者角色，共享素材库与作品集

**OpenAPI 调试**: 面向大商户或 ERP 系统，提供自定义 API 密钥生成、Revoke 控制，并附带在线交互式 API 沙箱调试器

**涉及文件**:
- [TeamSpacePage.tsx](src/pages/TeamSpacePage.tsx)
- [OpenAPIPage.tsx](src/pages/OpenAPIPage.tsx)

### 5. 🎯 爆款风格复刻

**风格分析**: 输入竞品链接，自动抽取节奏、转场、字幕样式、BGM 类型、色调等风格要素

**深度解读**: 基于提取的风格数据，AI 生成专业分析报告和复刻建议

**涉及文件**:
- [StyleCopyPage.tsx](src/pages/StyleCopyPage.tsx)

---

## ⚙️ 部署指南

### 环境要求

| 依赖 | 版本要求 |
|---|---|
| Node.js | 18.0 或更高版本 |
| 包管理器 | npm / pnpm |
| Supabase CLI | 最新稳定版 |

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
VITE_DEEPSEEK_API_KEY="<your-deepseek-key>"
VITE_STEP_API_KEY="<your-step-key>"
VITE_SEEDANCE_API_KEY="<your-seedance-key>"
```

### 3. 部署数据库迁移

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 4. 配置服务端 Secret

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
supabase functions deploy send-sms-code
supabase functions deploy verify-sms-code
supabase functions deploy setup-demo
```

### 6. 代码质检与构建

```bash
npm run lint    # 执行类型检查、Biome 格式化、Tailwind 语法校验
npm run build   # 生成生产包
npm run dev     # 启动开发服务器
```

---

## 📦 API 接口

### 前端 API 接口（通过 Supabase Edge Functions）

| API 路径 | 方法 | Edge Function | 功能描述 |
|---|---|---|---|
| `/functions/v1/ai-assistant` | POST | ai-assistant | 统一 AI 网关，支持多种 AI 操作 |
| `/functions/v1/deepseek-v4-pro` | POST | deepseek-v4-pro | DeepSeek V4 Pro 文本生成（SSE 流式） |
| `/functions/v1/stepaudio` | POST | stepaudio | StepAudio 2.5 ASR/TTS 语音服务 |
| `/functions/v1/seedance` | POST | seedance | Seedance 2.0 视频生成与查询 |
| `/functions/v1/kling-video-create` | POST | kling-video-create | Kling 视频任务创建 |
| `/functions/v1/kling-video-query` | POST | kling-video-query | Kling 视频任务查询 |
| `/functions/v1/sora-video-create` | POST | sora-video-create | Sora 视频任务创建 |
| `/functions/v1/sora-video-query` | POST | sora-video-query | Sora 视频任务查询 |
| `/functions/v1/minimax-chat` | POST | minimax-chat | MiniMax M3 聊天模型 |
| `/functions/v1/create-payment-order` | POST | create-payment-order | 创建微信支付订单 |
| `/functions/v1/wechat-payment-webhook` | POST | wechat-payment-webhook | 微信支付回调处理 |
| `/functions/v1/send-sms-code` | POST | send-sms-code | 发送短信验证码 |
| `/functions/v1/verify-sms-code` | POST | verify-sms-code | 验证短信验证码 |
| `/functions/v1/phase3-assistant` | POST | phase3-assistant | 竞品抓取、直播分析、团队管理 |
| `/functions/v1/wenxin-text-generation` | POST | wenxin-text-generation | 文心一言文本生成 |

### ai-assistant 支持的操作（action 参数）

| Action | 功能描述 |
|---|---|
| `generate_selling_points` | 生成商品核心卖点 |
| `extract_url_selling_points` | 从商品 URL 提取卖点 |
| `optimize_prompt` | 优化 AI 视频生成 Prompt |
| `generate_storyboard` | 生成分镜脚本 |
| `generate_video` | 视频生成（带 DB 进度更新） |
| `generate_script_four_layer` | 四层脚本生成（钩子/痛点/产品/CTA） |
| `analyze_traffic` | 流量分析预测 |
| `analyze_style` | 视频风格分析 |
| `generate_ab_variants` | 生成 A/B 测试变体 |
| `extract_highlights` | 直播高光切片提取 |
| `knowledge_rag_search` | 知识库 RAG 检索 |
| `content_moderation` | 内容安全审核 |
| `emotion_analysis` | 情绪 NLP 分析 |
| `translate_script` | 多语言脚本翻译 |
| `generate_cover` | 智能封面生成 |

---

## 🔐 安全性与并发设计

1. **RLS 行级安全**: 所有 PostgreSQL 数据表默认开启 `ROW LEVEL SECURITY`。商户的商品、视频任务、充值订单、团队资源等均绑定到 `auth.uid()`，通过外键约束在物理数据库层隔离。

2. **防薅积分锁**: 对于调用外部 API 需计费的动作，系统在下发 API 动作前，会执行高并发安全的存储过程，通过 `SELECT ... FOR UPDATE` 加上排他锁，余额校验无误后才执行扣减。

3. **敏感密钥零泄漏**: 前端仅暴露 Supabase 公钥 `VITE_SUPABASE_ANON_KEY`。所有 API 密钥均安全隔离在 Supabase 服务端 Vault Secrets 中。

4. **持久化限流**: 采用 DB-backed 限流方案（`upsert_rate_limit` RPC），支持多实例部署场景下的安全限流。

5. **LLM 响应缓存**: 对可缓存的 AI 操作（如卖点生成、风格分析）实现 24h TTL 缓存，减少重复计算成本。

---

## 🧪 常见问题解答 (FAQ)

### 1. 为什么 `npm run dev` 报错？

为保证大促演示期间的系统稳定性，默认 package.json 禁用了 dev 本地暴露。若需启动本地预览，请修改 `vite.config.dev.ts` 并通过控制台接入。

### 2. 视频异步合成显示"等待中"卡住如何排查？

- 确认 Supabase Service Role Key 部署正确，确保 Edge Function 能够安全回写 `video_jobs` 的 `status` 状态
- 检查 Seedance 任务日志，确定是否因为账户欠费或首尾帧图的分辨率比例不符（推荐使用 9:16 标准比例）

### 3. 如何配置多用户共享团队额度？

进入 `团队协作空间` 创建团队后，添加成员邮箱。成员确认后，其扣费存储过程会自动向上追溯团队所有者的积分余额包。

---

## 💡 总结与展望

### 项目总结

Shopro AI 是一套面向 **带货短视频量产** 领域的一站式 SaaS 系统，具有以下特点：

- **技术栈先进**: 融合 React 18 + TypeScript + Vite 5 + Supabase + 多模态大模型
- **工程化程度高**: 42+ 个核心页面，完善的路由懒加载、Error Boundary、全局状态管理
- **商业闭环完整**: 从商品输入到视频生成、数据分析、团队协作、支付充值全链路打通
- **安全性设计到位**: RLS 行级安全、防薅积分锁、敏感密钥隔离、持久化限流

### 未来展望

1. **模型能力增强**: 接入更多视频生成模型（如 Pika、Runway），提供差异化选择
2. **智能推荐系统**: 基于用户历史数据和竞品分析，自动推荐最优脚本结构和视频风格
3. **自动化发布**: 集成抖音、TikTok、小红书等平台的开放 API，实现一键多平台发布
4. **私有化部署**: 提供企业版私有化部署方案，满足大型电商企业的数据安全需求
5. **AI Agent 协作**: 引入多智能体协作机制，让 AI 自动完成从选品到视频生成的全流程

---

## 📞 联系方式

项目维护团队：Shopro AI 研发组

如有问题或建议，欢迎通过以下方式联系：

- 技术文档：[docs/](docs/)
- 产品 PRD：[docs/prd/prd.md](docs/prd/prd.md)