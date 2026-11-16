---
title: "16 - 决策记录（ADR）"
description: "项目：运营搭建平台（vue3-course） ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析"
category: 项目文档

---
# 16 - 决策记录（ADR）

> 项目：运营搭建平台（vue3-course） ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析

本篇是仓库关键决策的"考古现场"：把散落在 `tiny-engine-borrow-plan.md`、`docs/plans/`（16 份设计文档）、源码注释与 README 里的决策证据收拢为 12 条 ADR。每条按「背景 → 备选方案 → 决策 → 源码证据 → 后果」组织——背景讲当时面对什么问题，备选讲放弃过什么，决策讲选了什么，证据给出可复核的文件与行号，后果讲这条决策今天让接手者付出或得到了什么。与既有篇目的分工：01 篇讲"架构现在是什么形状"，本篇讲"为什么是这个形状"；机制细节（如密钥如何轮换、白名单如何校验）见《08-安全与权限设计》《05-核心流程》，本篇只记录决策本身。ADR 编号按决策发生的大致时序排列，标注状态：**已采纳**（现行行为）、**已采纳·有边界**（采纳但明确了适用边界）、**已决策·暂不执行**（分析已付、实施挂起）。

## ADR-001 两条搭建线「协议先统一，渲染方式暂不合并」

- **状态**：已采纳（2026-09，`tiny-engine-borrow-plan.md`「架构决策点」节原文记录）。
- **背景**：仓库并存两条搭建线——页面线（`packages/work-front/src/pages/manage/modules/page-editor.tsx`，物料是独立 npm 包，经构建发布到 mock CDN，编辑器内 requirejs 以 AMD 运行时加载直渲染）与看板线（`dashboard-editor`，物料是本地 `@my/charts` 元表，编辑器内同应用直渲染）。借鉴 TinyEngine 时必须回答：两条线要不要收敛成一套编辑器？
- **备选方案**：① 两线各自独立演进，协议也各写各的——放弃，配置面板等平台件会重复实现且行为漂移；② 一步到位合并渲染层，画布统一为 iframe——放弃，渲染层合并牵动产物构建、物料加载、iframe 协议三条战线，风险一次付清；③ 协议先统一、渲染暂不合并——采纳。
- **决策**：两线共用同一套**物料属性协议**（`PropSchemaItem` 的 widget 化 schema 与属性分组）与**配置器注册表**（`packages/work-front/src/ui/prop-configurator/registry.ts`），让"配置面板"成为两边可复用的同一模块；画布层是否统一到 iframe 留到协议统一后再评估。用 borrow-plan 的原话说，这是把「协议层统一」与「渲染层隔离」拆成两个独立话题。
- **源码证据**：`tiny-engine-borrow-plan.md` 架构决策点节（结论原文）；`packages/shared/src/schema/index.ts` 的 `PropSchemaItem`/`WidgetConfig`/`getPropGroups()`（协议落点，注释多处标注"对齐官方 xxx"）；`packages/work-front/src/ui/prop-configurator/registry.ts`（注册表）；`packages/work-front/src/ui/dynamic-form.vue`（页面线管理端表单复用同一注册表模式）。
- **后果**：正面——配置面板 schema 驱动后，新增物料"声明即配置"，面板零改动；页面线的 `props.schema.json`（`scripts/build-materials.ts` 用 `typescript-json-schema` 生成）与看板线的 propSchema 是同一协议思想在两种物料形态上的投影。负面——两条渲染链路（AMD 远程物料 vs 本地元表）长期并存，文档、测试、心智都要双份；13 篇记录的"图表物料面板移除、运行时保留"双口径就是这种并存成本的实例。

## ADR-002 前端构建从 Webpack 迁移到 Vite

- **状态**：已采纳（borrow-plan 〇节"当前进度基线"标注 ✅ 已完成）。
- **背景**：项目早期用 Webpack 构建前端。borrow-plan 2026-09 重排时记载："前端构建已从 Webpack 迁移到 Vite"。迁移的直接诱因是构建工程化改造（任务 7"抽公共 vite 构建配置"明确说"Webpack → Vite 迁移后正是收口时机"）。
- **备选方案**：① 维持 Webpack——放弃，构建配置重复、启动慢、与生态（Vite 插件、vitest）脱节；② 迁 Vite 且顺手抽公共配置——采纳；③ 迁 Vite 但各脚本各写各的——放弃，会形成新的重复。
- **决策**：全仓前端构建统一 Vite，并把公共逻辑（vue 插件、less、external 策略、运行时拷贝）收口到 `packages/build/vite-config`（`buildFrontLibEntry` + `copyVueRuntimeLib`），`scripts/build-work-front.ts` 与 `build-portal-front.ts` 消费同一份配置。
- **源码证据**：`tiny-engine-borrow-plan.md` 〇节与任务 7（验收记录："已用 shasum 逐字节比对通过，work-front + portal-front 共 19 个产物文件"）；`packages/build/vite-config/index.ts`（package.json 注明 main 指向 `./index.ts`，构建脚本以相对路径引用——borrow-plan 注释解释了原因：pnpm workspace 显式列举 + 当时环境 store 不匹配，待注册 workspace 后可改包名引用）；根 `package.json` 的 devDependencies 中 `vite ^7.3.6`、`@vitejs/plugin-vue`、`@vitejs/plugin-vue-jsx`；`vitest.config.js` 复用同一 vite 插件链。
- **后果**：正面——构建脚本与测试配置同源（`PluginVue()/PluginJsx()` 一份）；页面线发布能在服务端进程内直接调 `vite.build`（`packages/work-server/src/service/page-static.ts`），这在 Webpack 时代要难得多的多。负面/遗留——`packages/build/vite-config` 以相对路径引用是显式妥协（borrow-plan 注释自认）；vite 7 的 lib 模式必须显式声明 `cssFileName`（06 篇构建链提到的坑）；SSR 配置形状不同仍留在原脚本，构成 13 篇记录的"SSR 半成品"债务的一部分。

## ADR-003 三阶段发布采用「表级快照复制」而非状态字段

- **状态**：已采纳（2026-09，`docs/plans/dashboard-publish-2026-09.md` 设计决策 1）。
- **背景**：看板线要补齐与页面线对等的发布闭环。发布语义有两种常见建模：同一张表加 stage/status 字段，或每个环境一张独立表复制内容。
- **备选方案**：① 单表 + 状态列（test/pre/prod 三列或一行多态）——放弃：阶段间内容会被覆盖，"pre 永远是 test 的快照"不可证；prod 的历史版本与草稿混在一行，回滚语义复杂。② 表级快照（test/pre/prod 三张同构表）——采纳。③ 页面线的"prod 回写主表"模式——明确不继承，plan 文档原话："页面 prod 回写主表是历史包袱"。
- **决策**：新建 `dashboard_info_test` / `dashboard_info_pre` / `dashboard_info_prod` 三张同构表；推进顺序强制 test → pre → prod（pre 需 test 存在，prod 需 pre 存在）；prod 允许重复发布（事务内行锁自增版本号 + 自动打 `source='publish'` 快照）；portal 只读 prod 表，不碰草稿主表。与页面线的三点差异（prod 不锁版本、不回写主表、版本服务端自增）都写在 plan 文档里。
- **源码证据**：`docs/plans/dashboard-publish-2026-09.md` 设计决策 1-3；`packages/work-server/src/service/dashboard-stage.ts` 72-205 行 `pushDashboardStage`（test 注入白名单、pre 复制 test、prod 事务复制 pre）；`packages/work-server/src/model/dashboard-stage.ts`（`nextProdVersion` 行锁自增）；`packages/init-database/src/sql/dashboard_info_test.sql`（三表 DDL）。
- **后果**：正面——阶段内容不可变、可对比、可回退；下线（`unpublishStage` 置 status=0）即门户 404，无需缓存清理；版本号只在 prod 递增，test/pre 只是"晋级中的副本"，语义干净。负面——三张表 × 两条线 = 六张发布表，DDL 与软删级联都要覆盖（`packages/work-server/src/service/dashboard.ts` 删除事务级联置零三阶段表）；"跳阶段发布被拒"对只想试发布的用户多一步操作（12 篇 FAQ 高频条目之一）。

## ADR-004 四把密钥体系与启动自检（fail-fast）

- **状态**：已采纳。
- **背景**：平台对外暴露两类凭据场景——登录态签名（可泄露可重发）与数据源口令（泄露即裸奔、丢失即作废）；此外还有服务间通道与历史口令哈希两个特殊密钥需求。四者生命周期与应急响应完全不同，混用一把钥匙会让"换密钥"操作无法定义。
- **备选方案**：① 单一主密钥 + 用途派生——放弃：JWT_SECRET 需要可随时轮换（泄露可换），SECRET_BOX_KEY 轮换是重活（全库重加密），耦合后轮换成本互相放大；② 不设 INTERNAL_TOKEN，portal 直连数据库——放弃：凭据与查询引擎必须只在 work-server 进程内（ADR-005）；③ 四把密钥各司其职——采纳。
- **决策**：`JWT_SECRET`（HS256 登录 cookie，生产缺失拒绝启动）、`SECRET_BOX_KEY`（AES-256-GCM 主密钥，库中有密文而密钥缺失则启动即退）、`INTERNAL_TOKEN`（portal→work-server 通道共享密钥，未配置即取数通道整体禁用，fail-closed）、`PASSWORD_SALT`（旧 HMAC 口令哈希迁移期保留，🔴 已废弃）。三道启动自检集中在 `packages/work-server/src/index.ts`，报错文案自带处理动作。
- **源码证据**：`packages/work-server/src/config.ts` 5/6/11 行（三个配置读取点，11 行注释明写"fail-closed"）；`packages/work-server/src/util/secret-box.ts` 30-46 行 `masterKey()`（延迟读取——注释解释是为测试注入保留的余地）；`packages/work-server/src/index.ts` 38-47 行（JWT_SECRET 自检）与 101-118 行（SECRET_BOX_KEY 异步预检）；`packages/portal-server/src/util/access-gate.ts` 25 行注释（"不 fail-open"）；`.env.example` 18-20 行（PASSWORD_SALT 废弃标注）。
- **后果**：正面——每把钥匙的轮换剧本独立且可演练（deploy-ops 第三节；轮换走 `scripts/migrate-secrets.ts`）；"密钥错误在启动期爆炸而非第一个请求爆炸"把最难排查的 GCM 认证失败挡在生产流量之前。负面——SECRET_BOX_KEY 托管完全依赖运维纪律（无 KMS，13 篇第 1 节 #2 入账）；四把密钥 + 一堆限流/开关变量让 `.env` 成为事实上的配置契约（14 篇全清单就是为了治这个）。

## ADR-005 SQL/API 数据源服务端代理与唯一解密出口

- **状态**：已采纳（2026-09，`docs/plans/dashboard-publish-2026-09.md` 设计决策 4"安全设计核心"）。
- **背景**：看板组件要绑数据源，而访客是匿名的。若把数据源配置下发给浏览器，等于把数据库口令、内网地址交给公网；若 portal 自己连库，凭据就要复制进第二个进程。
- **备选方案**：① config 随发布产物下发、前端直连——安全上不可接受，直接排除；② portal-server 内置查询引擎连库——凭据扩散到访客面进程，且两处实现必然漂移；③ 查询引擎只在 work-server，portal 转发 + 双层白名单——采纳。
- **决策**：数据查询引擎（连接池、SQL/API/CSV 执行）只在 work-server。访客取数路径：portal 校验 prod 白名单 → 携 `x-internal-token` 转发 work-server 的 `/api/post/dashboard/portal-data` → work-server **不信 portal 的判断**再校验一次白名单 → `queryPublishedDataSource` 以 `queryParams` 固定空对象执行。解密（`openConfigSecrets`）只发生在 `executeDataSourceQuery` 一处——它是全仓唯一取数出口，编辑器路径与访客路径在此汇聚。
- **源码证据**：`docs/plans/dashboard-publish-2026-09.md` 决策 4（含攻击面分析："公网只能触发已发布看板白名单内、配置已固化的数据源查询"；queryParams 写死 `{}` "杜绝参数注入面"）；`packages/work-server/src/service/data-query.ts` 27-72 行（唯一出口注释原文："解密放在这里可以保证没有任何一条下游拿不到明文，也不会把明文带出本函数"）；`packages/work-server/src/service/dashboard-stage.ts` 282-310 行 `queryPortalDashboardData`（双层校验终点 + queryParams 固定空）；`packages/portal-server/src/service/dashboard.ts`（转发与 15 秒超时）。
- **后果**：正面——数据库口令永不离开 work-server 进程；访客面攻击被收窄到"已冻结白名单 + 无参数注入"的极小面；加新数据源类型只需在唯一出口的 switch 加 case（11 篇 SOP 三）。负面——portal 对 work-server 产生运行时强依赖（通道配置 INTERNAL_TOKEN/WORK_SERVER_ORIGIN 是部署必配项，12 篇 FAQ 两类 403 皆源于此）；访客取数多一跳内网转发（15 秒超时先于查询引擎的重试上限掐断，10 篇第 3 节记录了这个不一致）。

## ADR-006 页面方法用 AsyncFunction 运行时求值规避转译

- **状态**：已采纳·有边界（边界 = 公开闸门收窄暴露面，根治待沙箱）。
- **背景**：页面方法是作者随看板保存的函数体源码（`Record<方法名, 函数体字符串>`），运行时要在浏览器里编译执行，方法体内可 `await`。难点：构建器会把源码里的 `async function` 字面量按构建 target 降级转译（es2015 下取 `Object.getPrototypeOf(async function(){}).constructor` 拿到的是普通 `Function`），方法体里的 `await` 直接报错。
- **备选方案**：① 直接写 `Object.getPrototypeOf(async function(){}).constructor`——被转译击穿，否决；② 限定构建 target ≥ es2017 保留 async 字面量——全局约束太脆，任何一个共享包降级就坏；③ 经运行时 `new Function` 求值拿到原生 AsyncFunction——采纳；④ 沙箱（iframe/Worker/独立 origin）——长期方向，当期未做。
- **决策**：`const AsyncFunction = new Function('return (async function(){}).constructor')()`，编译签名固定 `(state, methods)`（对齐 TinyEngine 官方 script 插件的约定），单方法编译失败不阻断其余方法、错误归集 `errors` 数组。
- **源码证据**：`packages/shared/src/runtime.ts` 35-39 行（注释原文："打包器会把 async function 字面量按 target 降级转译（es2015 下取 prototype 会拿到 Function，导致方法体 await 报错）"）与 45-63 行 `compilePageMethods`；`packages/work-front/src/pages/dashboard-editor/services/` 的语法校验（`js-syntax.test.ts` 保证保存时与运行时同一语义）。
- **后果**：正面——方法体语义与编辑器校验一致，await 可用，转译器行为变化不再影响运行时。负面——这是**无沙箱执行作者 JS**：`packages/work-server/src/util/page-methods-guard.ts` 的公开闸门（prod 发布 + 切 public 两处拦截）就是这条决策的边界条款（08 篇第 6 节）；CSP 刻意不下发 script-src 也是同一让步（`packages/server-kit/src/security-headers.ts` 注释）；13 篇路线图把"独立 origin 沙箱"列为第二阶段最长周期项，落地后本 ADR 的边界条款可整体放松。

## ADR-007 EP 物料体系：元表协议 + 配置器注册表（借鉴 TinyEngine）

- **状态**：已采纳（2026-09，borrow-plan 任务 1/2）。
- **背景**：看板线的组件库需要回答"物料是什么"：如果物料是组件实例，配置面板就得为每个组件写死表单；TinyEngine 的答案是物料 = 组件元数据（meta），属性面板按 meta 声明驱动渲染。
- **备选方案**：① 手写面板（每个组件一段 v-if 分支）——borrow-plan 记载改造前正是这个状态（"app.vue 中手写的 v-for + input/select 分支，约 64–96 行"），否决；② 引入 TinyEngine 整个物料市场体系——过重，否决；③ 吸收 widget 化 meta 协议 + 配置器注册表，EP 组件批量出 meta——采纳。
- **决策**：`ComponentMeta`（type/label/category/defaultSize/defaultProps/propSchema/propGroups/container/dataBinding/events）为物料元表；53 个 Element Plus 组件在 `elementPlusMetas.ts` 按 meta 构造器批量声明；属性面板按 `propSchema` 每项的 `widget: { component, props }` 查注册表渲染，未声明 widget 按 type 内置兜底；容器语义 `container.acceptChildren` 对齐官方 `configure.isContainer`。
- **源码证据**：`packages/charts/src/meta/elementPlusMetas.ts` 头注释（2026-09 审查后的两条硬约束：type 必须对应真实存在的 el-* 组件；propSchema 每项 name 必须与 defaultProps 键一致——"缺 name 会导致所有属性写入 model[''] 空键（已修）"）；`tiny-engine-study/designer-demo/public/mock/bundle.json`（协议参考源）；`packages/work-front/src/ui/prop-configurator/registry.ts` + `builtin.ts`（5 个内置配置器）；`packages/work-front/src/ui/prop-configurator` 的注册表测试。
- **后果**：正面——新增 EP 物料是纯前端注册表操作（11 篇 SOP 一），零面板改动；面板与物料解耦后可独立演进。负面——两条硬约束没有编译期强制（name 错位只能靠审查/测试拦截，历史上真踩过）；meta 必须可 JSON 序列化（defaultProps 放函数即坏）成为隐性契约。

## ADR-008 画布 iframe 化：SPA 裸路由而非独立构建入口

- **状态**：已采纳（2026-09，borrow-plan 任务 3）。
- **背景**：编辑态画布要与编辑器壳隔离（样式/全局变量互不拖累、画布可独立缩放）。TinyEngine 官方的做法是 canvas 独立构建入口（base64 内嵌、canvas-dev-external 插件等构建黑科技，borrow-plan 任务 9 调研过）。
- **备选方案**：① 独立 canvas 构建入口（对齐官方双包结构）——能力最强（可跨版本渲染物料）但动构建与 Koa 模板，改动面大；② 画布做成普通子组件——零成本但零隔离，样式互相污染；③ SPA 内裸路由 iframe（`/page/dashboard-canvas` + postMessage 协议）——采纳。
- **决策**：画布是一个同源 iframe 路由页；编辑器与画布经 `canvas:*` 消息协议双向通信；**位置字段以画布为唯一上传方**，编辑器下发的 schema 签名不含位置字段，杜绝"下发→渲染→上报→再下发"的双向同步回环。borrow-plan 记录的取舍理由："开发/生产行为一致、无需动 Koa 模板与多入口构建、改动面小；代价是画布与编辑器共享同一 Vue 版本。"
- **源码证据**：`tiny-engine-borrow-plan.md` 任务 3（实现方式与理由原文）；`packages/work-front/src/pages/dashboard-canvas/protocol.ts` 头注释（"位置字段以画布为唯一上传方，编辑器下发的 schema 签名不含位置，避免双向同步回环"）；`packages/work-front/src/pages/dashboard-editor/services/canvas-service.ts`（iframe 挂载与协议接线）；borrow-plan 任务 9 对官方 canvas 构建黑科技的"不实施"结论。
- **后果**：正面——一次拖动只有一轮消息（10 篇第 1 节）；画布内物料样式与编辑器完全隔离；编辑器壳 app.vue 降为组装层。负面——画布与编辑器绑死同一 Vue 版本（跨版本物料渲染需要重启任务 3 的演进预案——独立 canvas 入口）；每次属性变更都要一轮 postMessage，`canvas:rects` 高频上报需依赖协议的批量 `items[]` 设计（rAF 节流是 10 篇预留的优化）。

## ADR-009 服务合并（单进程双端口）已决策暂不执行

- **状态**：已决策·暂不执行（2026-09-26，`docs/plans/merge-servers-2026-09.md` 开头原文："已决策——暂不执行"）。
- **背景**：作者希望"合并为一个服务"，动机被 plan 文档如实记录为"仅直觉上的正规感，无具体运维痛点"。
- **备选方案**：① 真合并单端口——否决：需要全站放弃 X-Frame-Options（XFO 无法按路径下发），静态桶改路径分层，匿名面与管理面同源，"收益只有少暴露一个端口"；② 不合并仅 compose 打包——否决，"原地踏步"；③ 单进程双端口（一个进程挂两个 Koa app，各监听各端口）——作为未来预案保留完整设计；④ 维持两进程——采纳。
- **决策**：暂不合并。plan 文档把两服务的分离定性为"刻意的安全设计，不是历史包袱"（帧策略相反、产物分桶、匿名面隔离三条），并声明"本文档保留为决策记录 + 未来预案"，触发条件是出现真实痛点（单端口暴露需求、INTERNAL_TOKEN 配置成为负担）。
- **源码证据**：`docs/plans/merge-servers-2026-09.md` 全文（含"已否决的方案"节与目标架构目录树）；`packages/server-kit/src/security-headers.ts`（frame 策略二选一的实现，两服务各传不同参数）；`scripts/build-work-server.ts` / `build-portal-server.ts`（桶隔离的拷贝执行点）。
- **后果**：正面——省下一次纯迁移风险，且方案分析成本已付（"按本方案直接进入实现计划即可"）；两服务可独立部署/重启/观测。负面——双进程拓扑是长期的：INTERNAL_TOKEN/WORK_SERVER_ORIGIN 成为部署必配项，跨进程问题（访客取数）的排查要先分进程（12 篇决策树第一层就为此设计）。

## ADR-010 页面线归档：冻结而非删除

- **状态**：已采纳（2026-09-25，`docs/plans/page-line-freeze-2026-09.md`）。
- **背景**：产品主线收敛到看板线，旧页面线（`page.vue` + `page-editor.tsx` + `@my/business` 拖拽体系 + 两个 materials 物料）何去何从需要显式决策——此前 `.workbuddy` 有过 D-4"长期并存"的注记，本次覆盖。
- **备选方案**：① 删除页面线代码——否决：已发布页面（`/p/:uuid`）与物料运行时必须永久兼容；② 长期并存、两线同步演进——否决：投入产出不成立；③ 归档冻结——采纳。
- **决策**："归档 = 冻结，不是删除"：页面线停止新功能投入，只修阻断性缺陷；产品叙事、模板中心、发布/统计等公共能力以看板线为主演进；页面线共用的实现（发布页、访问统计、可见范围判定）继续两线共享；若重启重写，方向是并入看板编辑器的画布体系（schema 渲染统一）。plan 文档还专门列出"仍在运行的看着像残留的部件"清单（`work-front/src/ssr/`、`pages/preview-amd/`、`pages/home/app.vue`、`page-flow.vue`、materials 两物料）——清理时勿动。
- **源码证据**：`docs/plans/page-line-freeze-2026-09.md` 全文（含"本批已清理的教学残留"清单：零引用 bootstrap、portal 侧死键、未接线的 controller 等）；`packages/charts/src/index.ts` 23-26 行注释（同月的配套决策："面板移除图表物料、运行时保留兼容"是同一收敛期的姊妹决策）；`packages/business/src/`（冻结包，仍被页面线消费）。
- **后果**：正面——冻结边界明确，13 篇的债务清单不用再为页面线扩容；"勿动清单"防止后来者把活代码当残留清理（13 篇第 3 节 #3 的"清理运动"风险有部分就源于此）。负面——两套编辑器、两套模板中心、两套快照表长期共存是既定事实；`@my/business` 的 TODO（structuredClone）等小修也随冻结降级为低优先级。

## ADR-011 看板 schema 保留网格模型，不迁移 TinyEngine 组件树

- **状态**：已采纳（2026-09，borrow-plan 任务 8 调研结论）。
- **背景**：TinyEngine 页面 schema 是组件树模型（props/children/styles/events/lifeCycles），本工程看板 schema 是 `layout[] + components[]` 的网格模型（grid-layout-plus 的 24 列栅格）。借鉴时是否换范式？
- **备选方案**：① 迁移到组件树模型——评估后否决；② 保留网格模型——采纳；③ 双模型互转——未做（plan 文档只要求"明确适用边界与互转可能"）。
- **决策**：保留 grid-layout-plus 网格布局。borrow-plan 任务 8 结论原文："本项目保留 grid-layout-plus 网格布局，不迁移到 TinyEngine 的组件树模型——场景不同（看板 vs 通用页面搭建）。"
- **源码证据**：`tiny-engine-borrow-plan.md` 任务 8（结论原文）；`packages/work-front/src/pages/dashboard-canvas/app.vue`（grid-layout-plus 消费点，grep 证据）；`packages/dashboard-codegen/index.ts`（出码用 CSS Grid 复刻"24 列 / 行高 30px / 间距 10px"网格语义——模型一致性延伸到了出码）；`packages/shared/src/schema/index.ts` 的 `ComponentInstance`（x/y/w/h 栅格字段注释："绝对布局模式下的坐标；文档流模式不使用"——后续 layoutMode 双模式是网格模型的内聚扩展而非范式切换）。
- **后果**：正面——看板场景（对齐、吸附、等宽栅格）天然适配网格模型，拖拽体验开箱即用；出码复刻规则简单确定。负面——文档流容器语义（children 纵排不进栅格）是在网格模型上后加的，`applyFlowMigration` 等迁移函数存在说明模型经历过一次 flow/absolute 双模式扩展，新场景若再偏离网格需要重新评估本 ADR 而不是继续打补丁。

## ADR-012 出码作为「平台锁定」逃生阀，依赖钉死工作区版本

- **状态**：已采纳（2026-09，borrow-plan 任务 6）。
- **背景**：低代码平台的经典风险是锁定——内容只能在本平台渲染。出码（schema → 独立 Vue3+Vite 工程 zip）是对冲手段，但出码工程自身的依赖管理有坑：borrow-plan 记载"浮动 ^4.7.0 会解析到 vxe-table 4.21.x 导致 peer 结构变化，构建失败——已验证"。
- **备选方案**：① 出码工程依赖用语义化范围（^x.y.z）——实测会因上游 peer 结构漂移而构建失败，否决；② 依赖钉死为工作区实际安装版本——采纳；③ 不做出码，平台内解决一切——否决，逃生阀是平台可信度的一部分。
- **决策**：三条生成策略（`packages/dashboard-codegen/index.ts` 文件头注释）：图表渲染层整体 vendor `@my/charts` 源码（与画布同源、视觉天然一致）；数据源只带出码当下的快照（`toSafeDataSources` 字段白名单，连接配置一律不落导出包）；生成工程的 `package.json` 依赖钉死为工作区实际安装版本（`controller/codegen.ts` 传入 versions 表）。
- **源码证据**：`tiny-engine-borrow-plan.md` 任务 6（含"已真机验证：样例 schema 生成 20 个文件，独立 pnpm install + vite build 成功"的验收记录）；`packages/dashboard-codegen/index.ts` 77-97 行（本地样式白名单副本及其"改动两处需同步"的自认——13 篇第 3 节已入账为债务）；`packages/work-server/src/controller/codegen.ts`（jszip 打包与 versions 传参）。
- **后果**：正面——导出包可独立构建运行，用户保留退路；依赖钉死让"导出即能跑"不受上游发版影响。负面——vendor 源码意味着 charts 组件成为出码契约的一部分（SOP 四新增图表必须同步 `CHART_IMPORTS`，漏了出码即坏）；样式白名单双份在依赖 shared 之前是持续利息（13 篇第一阶段止血项）。

## 决策间的因果网络

把 12 条 ADR 连起来看，能读出这个仓库决策风格的三个特征。其一，**安全决策先于功能决策成型**（ADR-003/004/005 都在 2026-09 的发布闭环设计里同批敲定，白名单、双层校验、唯一解密出口是同一份 plan 文档的四个小节），安全不是补丁而是发布语义的一部分。其二，**借鉴有账本、不抄有理由**：ADR-001/007/008/011 四条都源于同一份 borrow-plan，每条都同时记录"借了什么"与"刻意不抄什么"（渲染方式、独立构建入口、组件树模型），这是它能保持"课程仓外壳、产品内核"而不失控的原因。其三，**否决方案留档**：ADR-009 的"已否决的方案"节、ADR-010 覆盖 D-4 注记、borrow-plan 的进度基线表，都在为"将来有人再提同样的问题"省一次重新分析——这也是本篇存在的理由：接手者想推翻任何一条决策前，先在这里找到它当初为什么被采纳。

逐条与既有篇目的映射：ADR-001/007/008/011 的机制细节见《01-系统架构》《07-模块详解》；ADR-003/005 的执行链路见《05-核心流程》；ADR-004/006 的安全边界见《08-安全与权限设计》；ADR-002 的构建链路见《06-部署运行》与《14-配置与环境详解》；ADR-010/012 与债务的关联见《13-技术债务与演进建议》。本篇与它们互为索引：读机制去篇目，读动机回本篇。
