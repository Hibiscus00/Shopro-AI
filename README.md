# 🛒 Shopro AI - 抖音/TikTok 电商 AIGC 带货视频系统

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.5.3-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5.4.1-646CFF?logo=vite&logoColor=white" />
  <img alt="TailwindCSS" src="https://img.shields.io/badge/TailwindCSS-3.4.11-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-2.103.1-3FCF8E?logo=supabase&logoColor=white" />
  <img alt="Deno" src="https://img.shields.io/badge/Edge_Functions-Deno-000000?logo=deno&logoColor=white" />
  <img alt="AI" src="https://img.shields.io/badge/AI-DeepSeek_v4_Flash-blue" />
  <img alt="Audio" src="https://img.shields.io/badge/Audio-CosyVoice2_TeleSpeech-orange" />
  <img alt="Video" src="https://img.shields.io/badge/Video-Seedance_2.0-violet" />
</p>

---

## 💎 项目简介
<img width="1884" height="1212" alt="image" src="https://github.com/user-attachments/assets/e8b5767a-6113-4193-af0e-954e29b68f32" />
<img width="1280" height="705" alt="image" src="https://github.com/user-attachments/assets/8a2b2a47-b8a1-4b46-9a7a-efb9c1f16564" />
<img width="1280" height="679" alt="image" src="https://github.com/user-attachments/assets/cf2db694-ed54-4606-b7ca-6ff22854d3fb" />

**Shopro-AI 电商 AIGC 带货视频系统** 是一款面向国内外电商商家（如抖音、TikTok、快手、小红书、Amazon、Shopee 等）的商业化 SaaS 平台。系统深度集成了多模态大模型与全流程自动化工作流，彻底解决传统电商短视频制作中“文案撰写难、数字人/模特成本高昂、剪辑繁琐、多语言本地化差、多平台发布低效”等核心痛点。

系统打通了从「商品信息/URL/口令解析 ➔ AI 智能营销脚本生成 ➔ 爆款数字人形象匹配 ➔ 多语种情感语音合成 ➔ 可视化多轨剪辑 ➔ 物理级视频渲染 ➔ 跨平台定时发布与数据回流」的完整商业闭环，助力商家以极低成本高速量产爆款带货视频。

### ⚡ 核心优势与特色
* **最新官方实操演示视频**：品牌官网集成 1080P 超清全流程带货实操演示视频（`public/Shopro.mp4`），支持实时进度拖拽与 HD 播放。
* **真实积分消费与流水账单**：注册即赠送 50 初始积分，生成单条 AI 视频真实扣除 10 积分（10 积分 = 1 元），同步产生极简精准的 `credit_logs` 收支流水明细与实时全站广播。
* **极致降本**：对比传统外包单条 300-500 元制作成本，整体成本降低 98% 以上。
* **爆款真实数字人矩阵**：精选 8 位覆盖美食吃播、知性穿搭、品牌演讲、爆款美妆、科技极客、潮流男装、轻奢珠宝等领域带货风格的主播，支持形象与视频生成画面强一致关联匹配。
* **多模态商品一键解析**：支持淘宝、抖音口令/URL、拼多多、亚马逊、Shopee 等商品页面解析，DeepSeek-V4-Flash 智能提取规范标题、三项核心卖点、价格及高清封面图。
* **全球选品与第三方引擎接入**：内置 16 国爆款商品矩阵及数据引擎介入中心（FastData、EchoTik、GoodsFox、Kalodata、TikMeta、Shoplus）。
* **高颜值扫码收银台与积分结算**：顶栏靓丽粉高亮积分余额指示器，内嵌微信/支付宝扫码充值弹窗与专属客服微信联系通道（`wyx200265`）。
* **作品首帧持久化**：生成的视频自动提取第一帧高清静态图存入数据库，数据库刷新与二次加载永不失真落空。

---

## 🛠️ 技术栈

### 🌐 前端技术栈

| 分类 | 技术/依赖 | 版本/说明 | 用途 |
|---|---|---:|---|
| 核心框架 | React | 18.3.1 | 组件化 UI 与状态驱动渲染 |
| 开发语言 | TypeScript | 5.5.3 | 强类型约束，提升工程可维护性 |
| 构建工具 | Vite | 5.4.1 | 极速热更新与生产打包构建 |
| 路由管理 | react-router-dom | 6.26.2 | 单页路由与权限受保护路由 |
| 状态/异步 | @tanstack/react-query | 5.56.2 | 异步数据缓存与乐观更新 |
| UI 组件 | Radix UI + shadcn/ui | 基础组件 | Dialog、Select、Tabs、Tooltip、Sheet 等 |
| 样式系统 | Tailwind CSS / animate | 3.4.11 | 响应式布局、靓丽粉色彩系统及高质感玻璃态 |
| 动画驱动 | framer-motion | 12.4.10 | 提示词增强动效、页面卡片拖拽与过渡 |
| 数据可视化 | recharts | 2.12.7 | 流量分析、转化漏斗、ROI 雷达看板 |
| 代码质量 | Biome / tsgo | 2.4.5 / 0.0.1 | 极速 Lint、代码格式化及类型检查 |

### ⚙️ 后端与数据服务

| 分类 | 技术/服务 | 说明 | 项目中的作用 |
|---|---|---|---|
| 云服务 BaaS | Supabase | Auth、DB、Storage、Edge Functions | 全栈云服务托管 |
| 数据库 | PostgreSQL | 由 Supabase 托管 | RLS 物理数据隔离，pgvector 向量搜索 |
| 账户认证 | Supabase Auth | 邮箱/手机登录与会话 | 登录态维护与用户积分绑定 |
| 边缘计算 | Supabase Edge Functions | Deno 运行时 | AI 接口代理、微信支付、网络爬虫 |
| 实时流式 | SSE + eventsource-parser | `src/lib/sse.ts` | 营销脚本打字机流式响应解析 |
| 积分流水 | `deductUserCredits` + `credit_logs` | `src/hooks/useCredits.ts` | 真实扣减积分余额并写入消费明细 |

### 🤖 AI 服务与多模态模型

| 模块/能力 | 对接模型 | 调用入口 / Edge Function | 用途与优势 |
|---|---|---|---|
| **文本大模型** | **DeepSeek-V4-Flash** | `/functions/v1/deepseek-v4-flash` | 营销文案、多语种翻译、商品卖点提炼 |
| **语音大模型** | **CosyVoice2 / TeleSpeech** | `/functions/v1/siliconflow-audio` | `CosyVoice2-0.5B` 情感发音，`TeleSpeechASR` 转写 |
| **视频生成** | **Seedance 2.0** | `/functions/v1/seedance` | `seedance-2-0-fast-260128` 物理级多模态带货视频生成 |
| **图像/封面** | **Flux 1.1 Pro** | `ai-assistant` | 竖版高分辨率短视频封面设计及首帧生成 |
| **视频引擎** | Kling / Wan / Luma / Krea | `/functions/v1/kling-video-create` | 7 大尖端 AI 视频模型引擎集成 |

---

## 📁 目录结构与核心页面

```text
Shopro AI/
├── public/
│   └── Shopro.mp4                 # 官网最新 1080P 高清实操演示视频
├── src/
│   ├── App.tsx                    # 应用根组件，挂载 AuthProvider 与 Toaster
│   ├── routes.tsx                 # 页面路由配置 (受保护路由与公开路由)
│   ├── main.tsx                   # 项目打包入口
│   ├── components/                # 业务公共组件
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx     # 核心主布局，靓丽粉积分指示器、侧边栏自动展开
│   │   ├── common/
│   │   │   └── PaymentDialog.tsx  # 扫码支付充值弹窗 (支付宝/微信 + wyx200265 客服)
│   │   └── ui/                    # shadcn 风格原子级组件
│   ├── lib/
│   │   ├── videoFrame.ts          # 视频首帧 Canvas 提取与真实封面持久化映射
│   │   ├── sse.ts                 # SSE 流式解析及 StepAudio / Seedance API 轮询
│   │   └── utils.ts               # 样式合并与通用辅助函数
│   ├── hooks/
│   │   └── useCredits.ts          # 积分余额实时查询、deductUserCredits 扣减与流水生成
│   ├── pages/                     # 42 个核心业务页面
│   │   ├── LandingPage.tsx        # 品牌官网首页 (播放 public/Shopro.mp4 实操演示)
│   │   ├── HomePage.tsx           # 视频生成工作台 (扣除10积分并更新实时明细)
│   │   ├── AvatarsPage.tsx        # 8 位爆款带货数字人库 (修改封面、匹配试听)
│   │   ├── ProductSelectionPage.tsx# 全球选品大厅 (16国选品矩阵 & 第三方数据引擎)
│   │   ├── ProductsPage.tsx       # 商品管理，一键 URL/口令多模态解析与本地封面替换
│   │   ├── WorksPage.tsx          # 作品素材库 (第一帧真实图片持久化保存)
│   │   ├── VideoEditPage.tsx      # 可视化多轨道分镜编辑器 (字幕/人像/音轨)
│   │   ├── CreditsPage.tsx        # 积分明细与充值中心 (同步展现真实消费记录)
│   │   ├── PublishPage.tsx        # 跨平台定时发布控制台 (抖音/TikTok/小红书)
│   │   ├── StyleCopyPage.tsx      # 爆款风格复刻页
│   │   ├── AnalyticsPage.tsx      # ROI 及完播率流量看板
│   │   └── ...
├── supabase/
│   ├── functions/                 # 16 个 Deno 边缘函数微服务
│   └── migrations/                # 21 个 PostgreSQL 数据库迁移脚本
```

---

## ⚡ 核心功能与使用流程

### 🔄 自动化带货视频生成闭环

```text
① 全球选品 / 商品 URL 解析 ➔ DeepSeek-V4-Flash 自动提炼三项爆款卖点与商品图
        │
        ▼
② 工作台配置 ➔ 选择【参考 ➔ 数字人 ➔ 首尾帧】，扣除 10 积分并写入流水明细
        │
        ▼
③ 脚本与情感对齐 ➔ CoT 四层营销分镜（钩子➔痛点➔产品➔行动），自动标注台词情绪
        │
        ▼
④ 数字人与合成 ➔ 匹配萌萌/安娜/张总等 8 位爆款主播，CosyVoice2 合成情感口播
        │
        ▼
⑤ 视频生成与保存 ➔ Seedance 2.0 物理级渲染，视频第一帧图作为封面持久化存入作品素材库
        │
        ▼
⑥ 跨平台发布 ➔ 一键同步定时发布至抖音、TikTok、快手、小红书，流量 ROI 数据回流
```

### 1. 🎬 官网 1080P 核心演示视频 (`/Shopro.mp4`)
* 品牌官网首页 (`LandingPage.tsx`) 内置原生播放器，精准载入最新 `public/Shopro.mp4` 带货视频实操演示。
* 支持全屏播放、进度控制条、音量切换及 1080P 标示，直观展现从选品、脚本到数字人视频生成的全流程。

### 2. 🛍️ 一键 URL / 口令解析 & 全球选品
* **多模态 URL 自动解析**：粘贴淘宝/抖音口令或商品链接，DeepSeek-V4-Flash 自动分析生成商品标题、分类、参考价格与核心卖点。
* **封面防破裂与自定义**：自动匹配高清分类兜底封面，支持在解析预览窗口中一键“上传本地图”或“切换推荐封面”。
* **16 国选品矩阵**：支持美国、印尼、英国、日本等 16 国选品，一键连接 FastData、EchoTik、Kalodata 等数据引擎。

### 3. 🎭 8 位爆款带货数字人阵营
* 包含萌萌（零食吃播）、安娜（知性穿搭）、张总（大疆Pocket4宣发）、小雅（美妆）、阿杰（科技极客）、美玲（韩系流行）、陆沉（男装潮流）、雪儿（珠宝饰品）。
* 支持点击试听音色、上传修改数字人封面卡片及一键删除管理，工作台生成视频自动实现形象与画面的强一致匹配。

### 4. 🎬 作品素材库首帧持久化
* 视频生成完成后自动提取视频第 1 帧静态图片（`getVideoCoverImage`）作为 `thumbnail_url` 写入 Supabase 数据库。
* 彻底解决 `.mp4` 文件作封面导致的防盗链/破裂问题，保证页面刷新与重新载入时封面 100% 清晰呈现。

### 5. 💰 积分扣除闭环与收支明细
* 注册即赠送 **50 积分**，生成单条视频真实扣除 **10 积分**（10 积分 = 1 元）。
* 生成视频时自动校验剩余余额，并在数据库写入一条带有时间戳、扣除额度（`-10`）、剩余积分及事项描述的真实 `credit_logs` 流水记录。
* 点击顶栏靓丽粉积分按钮唤起高颜值收银台，嵌入支付二维码与客服微信 `wyx200265` 复制功能。

---

## ⚙️ 快速启动

### 1. 安装依赖与启动开发服务
```bash
git clone https://github.com/wyxpro/Shopro-AI.git
cd "Shopro AI"
pnpm install
pnpm run dev
```

### 2. 构建与代码质量校验
```bash
# 执行类型检查与构建
pnpm run build

# 执行代码风格校验
pnpm run lint
```

---

<p align="center">
  <sub>Built with ❤️ by Shopro AI 研发团队</sub>
</p>

