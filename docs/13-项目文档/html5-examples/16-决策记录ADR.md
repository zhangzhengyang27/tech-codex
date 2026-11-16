---
title: "16 决策记录 ADR"
description: "项目：html5-examples ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析"
category: 项目文档

---
# 16 决策记录 ADR
> 项目：html5-examples ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析

---

## 0. 本篇定位与考古方法

架构决策记录（ADR）通常在决策发生时写作，而本项目没有留下正式的 ADR 文件——它的决策记录散落在三处"现场"：**源码注释**（尤其是 `vite.config.ts` 与 `src/utils/sandbox.ts` 里那些记录事故现场的段落）、**文件头说明**（如 `src/api/examples.ts` 头注释对 2026-10-05 数据迁移的完整交代）、以及 **AGENTS.md 第 10 节**的八条半正式 ADR。本篇做的是一次"决策考古"：从这三处现场出发，结合代码结构与历史痕迹，把 12 条影响全局的关键决策还原为"背景 → 备选 → 决策 → 源码证据 → 后果"的五段式记录。其中部分决策的"备选方案"是推测性重构（源码未明说当初考虑过什么），会明确标注；无法核实的时间点与动机一律标注 `⚠️ 待确认`。

为什么值得为一个小项目做 12 条考古？因为这个项目的特殊性恰恰在于：它用极小的团队规模和极轻的依赖，完整回答了"内容型站点如何隔离执行不可信代码""数据应该放数据库还是放仓库""上千个动态 chunk 如何治理"这类普适问题，而且每条决策都有可运行的代码佐证而非纸上谈兵。读别人的决策最大的收益不是照抄结论，而是看清"约束条件如何推出结论"——本篇刻意把每条决策的约束条件写足，就是为了保留这条推理链。

条目按"内容域 → 渲染域 → 扩展机制 → 网络与状态 → 安全与认证"的大致顺序编排，编号不代表时间先后（多数决策无法考证精确时点，`⚠️ 待确认`）；能确证的时点只有两个：数据本地化迁移为 2026-10-05（`src/api/examples.ts` 头注释），MDN 主题并入 CSS 主题为 2026-06（`src/router/index.ts` 74 行注释）。

---

## 1. ADR-01：示例正文从 PostgreSQL 迁回本地 JSON（8 分组懒加载）

- **背景**：内容域存储经历了"静态 JSON → PostgreSQL → 本地 JSON"的完整往返（三阶段史见《04-数据模型》§6）。第二阶段把 1057 个示例放进 PostgreSQL 后，部署形态被绑死——演示一个纯前端示例站必须先装数据库，静态托管、CDN 分发、无服务器部署全部不可用；内容更新依赖运行时写库，git 评审与回滚的工作流优势全部丢失。
- **备选**：其一，维持数据库存储、给演示站配一个常驻后端（代价是部署复杂度与数据库运维）；其二，把 JSON 打进主 bundle 静态打包（8.4MB 全量进首屏缓存，首屏性能不可接受）；其三，迁回本地文件但按分组拆分、运行时动态 `import()`（兼顾两者）。
- **决策**：迁回 `src/content/examples/*.json`，按 `sourceGroup` 切成 8 个分组文件，`src/api/examples.ts` 用 8 个动态 `import()` 组成 `groupLoaders` 加载器表，`Promise.all` 并发拉取、模块级 `cache` 缓存，数据库退守用户行为域。
- **源码证据**：`src/api/examples.ts` 头注释（"示例内容自 2026-10-05 起从 PostgreSQL 迁移至 src/content/examples/*.json……本模块保持与原后端 API 完全一致的导出签名，消费方零改动"）；`groupLoaders` 表（26-53 行）；`loadAll()` 的 `cache`/`loadingPromise` 双变量（55-56、96-117 行）。
- **后果**：正面——纯静态部署成立（`docs` 与《06-部署运行》形态 A）、内容变更走 git 评审回滚、后端职责纯化。负面——内容更新必须发版（失去后台即时运营能力）、`server/src/modules/examples/` 沦为冻结资产（《13-技术债务》第 2 条）、首次无筛选进入示例库仍需全量下载 8 个分组（《10-性能设计》§1 已立项按需分组优化）。

## 2. ADR-02：数据访问层"签名兼容、实现替换"

- **背景**：ADR-01 的迁移涉及 11 个前端消费方（列表页、详情页、收藏回查、最近浏览回查等），若接口签名变化，迁移将扩散成全站改造。
- **备选**：直接改签名并顺手清理调用方（改造面大、回归风险高）；或引入一层适配器但保留旧后端通道做灰度（双数据源并存，复杂度高）。
- **决策**：`getExamples`/`getExampleById`/`updateExample` 三个函数的签名、`PaginatedResponse` 分页结构、404 异常语义全部原样保留，仅替换内部实现；`create/delete` 因无前端消费方直接移除。
- **源码证据**：`src/api/examples.ts` 头注释明示该决策；`getExamples` 返回 `{ data, pagination: { total, page, limit, totalPages } }`（15-23、168 行）；`getExampleById` 未命中抛 `ApiError(404, …, { message: '示例不存在或已被移除' })`（174-183 行）；分页边界计算复刻后端钳制语义（162-166 行）。
- **后果**：11 个消费方零改动通过迁移，验证了"数据在哪"与"数据长什么样"可以被数据访问层彻底隔离（《03-接口设计》§8 策略一）。这条经验已沉淀为项目惯例：任何存储介质更换都应先冻结签名。代价是实现层必须逐条复刻后端的边界行为（页码钳制、totalPages 最小为 1），文档《03-接口设计》§7 专门登记了这些镜像细节。

## 3. ADR-03：iframe srcdoc 沙箱内核

- **背景**：站点的核心业务是把含 HTML/CSS/JS 的示例渲染给用户——这是大规模"执行第三方代码"。示例之间、示例与宿主之间需要硬隔离，且每个示例要能独立运行。
- **备选**：其一，Shadow DOM 组件化渲染（样式隔离尚可，但 JS 共享全局作用域，示例间互相污染，且无法阻止示例访问宿主数据）；其二，运行时框架混跑（同样无进程级隔离）；其三，独立 iframe 用 `src` 指向服务端生成的页面（需要后端参与渲染，违背静态化方向）；其四，`srcdoc` 内联文档（纯前端、零后端、文档级隔离）。
- **决策**：`src/utils/sandbox.ts` 的 `buildSrcDoc()` 把示例三段源码拼装成完整 HTML 文档字符串，塞进 iframe 的 `srcdoc` 属性；宿主统一注入 reset CSS、viewport、`<base>` 与文档标题。
- **源码证据**：`src/utils/sandbox.ts` 67-182 行 `buildSrcDoc` 全函数；ADR-4（AGENTS.md 第 10 节）；消费链 `src/composables/usePreview.ts` 的 `srcDoc` computed → `src/components/examples/PreviewPane.vue` → `src/components/common/DeviceFrame.vue`。
- **后果**：隔离性最佳、示例"复制出去也能跑"（《03-接口设计》§3.2 契约三方受益分析）；代价是每个预览都是完整文档实例，项目用"卡片不放 iframe（代码快照 `ExampleCodeSnapshot.vue`）+ IntersectionObserver 可视区懒渲染 + 详情页才渲染"三层机制消化（《10-性能设计》§2）。另一个隐性代价是编辑态每次输入都重建 iframe 文档，`liveExample` 未做防抖是有意取舍（同上 §2）。

## 4. ADR-04：needsSameOrigin 动态决策 allow-same-origin

- **背景**：部分示例引用 `public/shared-assets/`、`public/static-sites/` 下的同源素材（图片/字体），srcdoc 文档要借 `<base href="{origin}/">` 加载它们，而 srcdoc 的 opaque origin 默认无法读取同源资源——需要 `allow-same-origin`。但把这个 flag 授予所有示例会无谓扩大攻击面。
- **备选**：全量授予 `allow-same-origin`（简单但攻击面最大化）；全部不授予（引用素材的示例集体白屏）；为每示例手工标注布尔位（元数据维护成本高、必然漂移）；运行时按内容正则自动探测（零维护、随内容自洽）。
- **决策**：`needsSameOrigin(example)` 用三组正则扫描示例三段源码，命中 `/shared-assets/`、`/static-sites/`、`../assets/`、`./assets/`、`/images/` 等模式才追加 `allow-same-origin`；探测结果随示例数据走，无任何人工登记位。
- **源码证据**：`src/utils/sandbox.ts` 184-196 行（正则组与注释"这些资源需要 allow-same-origin 才能在 iframe srcdoc 中通过 <base> 加载"）；消费方 `PreviewPane.vue` 以 `needsSameOrigin(example)` 决定传给 `DeviceFrame` 的属性。
- **后果**：绝大多数纯 CSS/Canvas 示例运行在真正隔离的 opaque origin 里，同源授权被压缩到引用共享素材的子集（《08-安全与权限设计》§1.3 缓解第二层）。风险是正则探测天然不完备——新增同源资源目录而未更新正则时，会出现"新示例白屏"型故障，排查入口见《12-FAQ》§3（预览白屏条目）；这是"自动推断换维护成本"交易里必须接受的尾差。

## 5. ADR-05：保留 allow-scripts + allow-same-origin 组合（半可信内容假设）

- **背景**：ADR-04 决定按需授予后，"需要同源资源的示例同时需要脚本"的子集就必然落入 HTML 规范明确警告的组合：同源脚本可访问父窗口存储、甚至移除自身 sandbox 属性。
- **备选**：其一，禁止该组合并牺牲素材加载（功能损失不可接受）；其二，立即上独立子域或 CSP（当时的部署拓扑与内容规模下成本偏高）；其三，保留组合，用威胁模型声明 + 转义加固 + 未来加固路线图对冲。
- **决策**：保留组合，并在 `getSandboxAttributes` 上方写下罕见坦诚的安全注释：声明风险、声明"示例代码半可信 + 入库校验"的缓解前提、列出三条后续加固路线（srcdoc 内 CSP meta、独立子域、postMessage 通信）。
- **源码证据**：`src/utils/sandbox.ts` 198-221 行注释原文（"allow-scripts + allow-same-origin 组合理论上存在沙箱逃逸风险……示例代码来自后端数据库（半可信）……后续如需进一步加固，可考虑 1) CSP meta 2) 独立子域 3) postMessage"）；默认属性集 `['allow-scripts','allow-forms','allow-modals','allow-popups']`（216 行）。
- **后果**：当前威胁模型成立的前提是"内容仅维护者可写"（《08-安全与权限设计》§1.3 三层缓解）；任何"开放用户提交示例"的需求都视为假设被打破，必须先落地 §6 的前置条件。这条决策的价值一半在代码、一半在注释——它把"我们知道风险且知道怎么修"固化了下来，避免后来者把权宜之计误当深思熟虑。注意注释中"由后端在入库时校验"一句描述的是应然而非实然，当前后端并无该校验器（《08-安全与权限设计》§6 第 3 条）。

## 6. ADR-06：四种示例形态注册体系

- **背景**：站点内容天然分四类——上千个可参数化教学的代码片段、73 个需要真实浏览器 API 的小应用、几十个"调参数抄代码"的工具、以及动效/模板/课程等卡片型数据。它们对加载方式、隔离需求、扩展流程的要求完全不同。
- **备选**：统一成一种形态（要么全部 iframe 牺牲交互、要么全部组件化牺牲隔离）；或两形态（iframe 与组件）但让内容团队自行选择（标准不清晰，产出漂移）。
- **决策**：明确四种形态并各自固化"注册处 + 加载机制 + 渲染机制"三位一体的契约：JSON 示例（`src/content/examples/*.json` → `groupLoaders` → srcdoc 沙箱）、SFC 演示（`src/components/examples/demos/` → `defineAsyncComponent` → 页面内组件渲染）、CSS 生成器（`catalog.ts` + `generators/routes.ts` → `gen-:kind` 动态路由 → BaseGenerator 骨架）、配置型数据（`src/config/effects|tailwindTemplates|svgLessons*` → 静态 import → 卡片网格）。
- **源码证据**：对照表见《01-系统架构》§2.1 与《15-接口全量参考》§4；`src/views/PlaygroundPage.vue` 的演示登记；`src/config/css-lab/catalog.ts`。
- **后果**：内容贡献者拿到清晰的分流标准——"能不能参数化？要不要真实浏览器 API？是不是纯展示数据？"三问定形态（AGENTS.md 第 15 节板块准入三问的工程映射）。扩展成本与形态强相关：生成器最低（两行登记）、JSON 示例次之（改一个文件）、SFC 演示最高（写完整组件）。代价是四套加载链路并存，新人必须先建立形态概念再动手（《00-项目总览》§8 的阅读路径即为此设计）。

## 7. ADR-07：CSS 实验室清单驱动 + gen-:kind 动态路由（两行登记）

- **背景**：拆分 devtools 后留下的 60 余个 CSS 生成器，若各自注册路由、各自实现"参数区-预览区-代码区"布局，路由表与代码都会线性膨胀，且 UI 入口（首页/侧栏/搜索）极易与实现失同步。
- **备选**：每生成器一条显式路由 + 独立页面（63 条路由、63 套布局）；或单一巨型生成器页内 switch 分发（单文件膨胀成上帝组件）。
- **决策**：三个单一事实源协作——`src/config/css-lab/routes.ts` 的 `TOOL_ROUTE_PATHS` 派生全部路径（`toolPath()` 供 catalog 引用，缺键即类型错误）；`src/router/routes/css-lab.ts` 只留一条 `css/gen-:kind` 动态段由 `CssGeneratorRouter.vue` 二次分发；`src/config/css-lab/catalog.ts` 的 `ToolItem` 清单派生首页 Bento 卡、侧栏与搜索。新增生成器 = 组件 + `generatorComponents` 一行 + catalog 一条（"两行登记"）。
- **源码证据**：`src/views/css-lab/css/generators/routes.ts`（64 个 kind 键的 `defineAsyncComponent` 映射）；`src/router/routes/css-lab.ts` 65-71 行动态段；`src/config/css-lab/catalog.ts` 头部条目（link 全部经 `toolPath` 派生）；机制详解见《07-模块详解》§2。
- **后果**：工具数量增长与路由表膨胀解耦，UI 派生自同一清单天然不失同步。遗留代价是**注册表已经漂移**：catalog 52 条 / 路由常量 66 键 / 组件映射 64 kind / 目录 64 文件 / index.ts 61 导出五处口径不一（《13-技术债务》第 3 条），证明"清单驱动"仍需一个校验脚本兜底——这正是本决策未竟的收尾。

## 8. ADR-08："内容在前端、行为在后端"的数据域切分

- **背景**：项目形态是前端 SPA + 轻后端，必须回答"哪些数据值得付出后端部署成本"。
- **备选**：全量走后端（回到数据库绑死部署的老路）；全量前端化（登录收藏无服务端无法跨设备）；按数据属性切域。
- **决策**：按"是否需要运行时多端写入"切三域：内容域（示例正文、生成器目录、动效数据）完全前端化进 git；目录域（topics/categories/UI 组件/Canvas/静态站点元数据）走 PostgreSQL——它们需要管理后台运营但不要求发版；行为域（用户、会话、收藏）走运行时 API——只有它们真正是多端写入的活数据。NestJS 后端因此定位为"行为型数据 + 运营型目录"服务，而非内容服务。
- **源码证据**：三分法表格见《04-数据模型》§1；`server/src/app.module.ts` 的 18 模块构成（活跃消费集中在 auth/topics/categories/favorites 与三个内容元数据模块）；前端 api 资源模块中 8 个走 HTTP（auth/topics/categories/favorites/static-sites/ui-elements/canvas-examples/visual-demos），examples 一个走进程内本地数据（《15-接口全量参考》§2.2）。
- **后果**：后端宕机时浏览体验基本完好（《00-项目总览》§1.2），部署形态 A/B 可选（《06-部署运行》§3.3）。负面是切分产生"冻结资产"尾瘤——examples/chart-examples/visual-demos/knowledge 等模块前端零消费但仍在注册（《13-技术债务》第 2 条），且目录域与内容域之间存在"改了 JSON 还要改 categories 表"的双写心智（《11-扩展开发指南》场景六）。

## 9. ADR-09：useResourceFetch 的 last-request-wins 竞态保护

- **背景**：路由参数切换（如 `/example/:id` 快速连点）、防抖搜索触发并发请求时，慢的旧响应可能后到并覆盖新结果——这是取数型 SPA 最经典的缺陷，且每个页面自己处理必然遗漏。
- **备选**：各页面手写竞态守卫（重复造轮子且质量不齐）；引入 RxJS switchMap（为一个模式引入一整套范式，违背项目轻依赖原则）；在 `@vueuse/core` 的 `useAsyncState` 基础上自研一个带竞态保护的 composable。
- **决策**：`src/composables/useResourceFetch.ts`——`requestId` 递增快照 + `AbortController` 取消前序双保险；三个出口（成功/失败/finally）都做序号比对，过期请求的结果、错误与 loading 复位一律丢弃；AbortError 视为竞态取消而非真实错误。
- **源码证据**：`src/composables/useResourceFetch.ts` 41-76 行（头注释明示"设计参考 @vueuse/core useAsyncState，但增加 last-request-wins 竞态保护"）；典型消费 `ExampleDetailPage.vue` 的 `watch: () => route.params.id`。
- **后果**：全站取数行为一致——"界面永远显示最新一次请求的结果"。配套决策还有两个：data 用 `shallowRef` 避免大数组深层代理（《10-性能设计》§5）；错误不弹 toast 而是折叠进 `error` 状态由页面 `EmptyState` 消费（《03-接口设计》§4 错误哲学）。代价是 fetcher 必须接受并尊重 `AbortSignal`，否则取消只是"逻辑丢弃"而非真实中断（`client.ts` 的 `linkSignals` 已把信号合并进请求层兜底）。

## 10. ADR-10：chunk 失效自愈整页 reload

- **背景**：项目有 5000+ 个 hash 化 chunk（《10-性能设计》§0 的规模数字），发版后停留在旧页面的用户一旦触发动态 import 就会 404 白屏——静态站无法靠服务端路由兜底。
- **备选**：Service Worker 预缓存旧版本（引入 SW 生命周期管理，复杂度远超收益）；长缓存 index.html + 版本探测轮询（治标且费电）；import 失败时仅提示用户手动刷新（体验断裂）。
- **决策**：`router.onError` 捕获 message 匹配 `Loading chunk|Failed to fetch dynamically imported module` 的错误后整页 `window.location.reload()`，模块级 `chunkReloadTriggered` 标志位防止多个 chunk 连环失败触发多次刷新。
- **源码证据**：`src/router/index.ts` 202-216 行（注释："检测动态 import 失败（如部署后旧 chunk 失效），自动刷新页面"）。
- **后果**：发版后的用户端事故从"白屏"降级为"一次自动刷新"（《10-性能设计》§4）。已知边界：只覆盖路由级动态 import——组件内 `defineAsyncComponent` 的失败不经过 `router.onError`（《10-性能设计》§4 明示），生成器与演示的 chunk 失效不在自愈范围内；这是当前最值得补的尾巴（可挂全局 `onerror`/`unhandledrejection` 兜底，`⚠️ 待确认` 是否已有计划）。

## 11. ADR-11：JWT 双 token + 提前 5 分钟静默刷新 + 旋转与重用检测

- **背景**：需要登录态（收藏/个人中心），但不希望用户在会话中途被过期踢出，也不希望把长期凭证暴露在前端。
- **备选**：单长时效 JWT（无法服务端吊销，泄露窗口 = TTL 全长）；服务端 session + cookie（传统方案，与 SPA 的 Bearer 习惯不合，且项目要支持双通道过渡）；双 token（短 access + 可吊销 refresh，业界标准答案）。
- **决策**：三层组合拳。其一，access token（JWT，TTL 由 `JWT_ACCESS_EXPIRES_IN` 控制，未配置兜底 604800 秒）+ refresh token（**非 JWT**，`crypto.randomBytes(64)` hex 落 `refresh_tokens` 表，可吊销）；其二，前端 `authStore` 以 `REFRESH_AHEAD_SECONDS = 300` 在过期前 5 分钟用模块级定时器静默换新（`applyAuthResult`/`ensureHydrated` 两处都重挂——localStorage 恢复会话后定时器必丢）；其三，后端 `refreshAccessToken` 实现"旋转 + 重用检测"：旧 token 用后即吊销，**发现已吊销 token 再被使用即判定泄露，全量吊销该用户所有 refresh token**。
- **源码证据**：`server/src/modules/auth/auth.service.ts` 45-46 行 TTL 兜底、186 行 `randomBytes(64)`、336-364 行 `refreshAccessToken`（348 行"已吊销 → revokeAll"分支）；`src/stores/authStore.ts` 11 行 `REFRESH_AHEAD_SECONDS = 300`、140-150 行 `scheduleTokenRefresh`、126 行注释"恢复会话后必须重新调度自动刷新"。
- **后果**：会话既无感续期又可随时服务端掐断（改密/登出全量吊销）。两个代价：token 对仍存 localStorage（XSS/沙箱逃逸场景可被读走，《08-安全与权限设计》§7 隐患 2，独立子域方案落地后自动缓解）；提前刷新量与 TTL 无耦合但依赖 `expiresIn` 字段回传——`server/.env` 若误配 TTL 为极小值，刷新风暴会放大（`JWT_EXPIRES_IN` 历史遗留键的语义澄清见《14-配置与环境详解》§2）。

## 12. ADR-12：localStorage 覆盖层替代 DB update 语义

- **背景**：ADR-01 移除后端 update 通道后，详情页 SourcePane 的"保存"按钮失去落点——但"改代码看效果再存下来"是这个站的核心体验，不能砍。
- **备选**：恢复后端写入（违背内容域前端化的大方向）；只存内存（刷新即丢，体验不完整）；写 localStorage 按示例 id 覆盖内容字段。
- **决策**：`OVERRIDE_KEY = 'examples-overrides-v1'` 覆盖层：`updateExample` 只摘取 `html/css/js` 三个内容字段（title/tags 等元数据不可改），写入 localStorage 并同步内存 cache；`loadAll()` 完成后 `applyOverrides()` 把覆盖合并回内存数组；隐私模式写入失败静默放弃。
- **源码证据**：`src/api/examples.ts` 58-93 行（注释："本地编辑覆盖层：SourcePane 的「保存」写入 localStorage……替代原 DB update 语义"）、199-207 行 `updateExample` 的字段白名单。
- **后果**：编辑能力不依赖登录态、天然隔离"个人试验"与"内容发布"（《05-核心流程》流程二解读：覆盖层是"每个浏览器自己的沙上笔记"）。三个已知尾差：覆盖层无容量管理（单键 5MB 量级，溢出静默失败，《13-技术债务》第 9 条）；覆盖永不回流 JSON，正式修改仍要走 git 工作流（这是特性不是缺陷，但需要文档反复对齐心智）；换设备不迁移（覆盖层无同步，符合"临时"定位）。

---

## 13. 决策全景的共性规律

把 12 条决策并排放，能读出四条反复出现的模式，它们比任何单条决策都更接近这个项目的"设计宪法"。

**模式一：用不可变的机制代替可被绕过的约定。** 防抖封装进 `useListFilter`、竞态保护内建在 `useResourceFetch`、`allow-same-origin` 由正则推断而非人工标注、`TOOL_ROUTE_PATHS` 缺键直接类型报错——凡是有"人可能忘"的环节，项目都把正确做法固化进了机制，让人"想犯错都难"。这也是《01-系统架构》§5 收尾那句"修改基础 composable 改动半径远超表面行数"的原因：机制被所有人依赖。

**模式二：签名冻结、实现自由。** ADR-02（数据层签名兼容）、路由重定向保全深链、`/api/examples` 端点保留——项目对"对外承诺"极其保守，对"内部实现"极其果断。存储介质换了三次，消费方零感知。做同类迁移时，先写清楚哪些东西永不变化，比急着动手更重要。

**模式三：坦诚记录残余风险。** `sandbox.ts` 的逃逸风险注释、`vite.config.ts` 的三条事故注释、`authStore` 的定时器丢失注释——项目从不假装决策没有代价，而是把"知道什么没解决、将来怎么解决"写在离代码最近的地方。这让后来的权衡（比如是否开放用户提交）有据可依，而不是重新争论一遍。

**模式四：每条简化决策都配套一条兜底机制。** 8 分组懒加载配套 loadingPromise 失败重试；整页 reload 配套标志位防连环刷新；覆盖层配套隐私模式静默降级；全量 JSON 迁出配套 `applyOverrides` 保持编辑体验。简化不是砍掉防御，而是把防御移动到新的边界上——判断一个"简化"是否成立，就看它的兜底是否也跟着搬家了。

---

*本篇完。下一篇：[17-依赖全景.md](./17-依赖全景.md)*
