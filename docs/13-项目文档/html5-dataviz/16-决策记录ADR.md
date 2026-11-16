# 16 决策记录（ADR）

> 项目：html5-dataviz ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析

## 0. 本章定位与考古方法

架构决策记录（Architecture Decision Record）的价值在于回答一个 git blame 答不了的问题：**"当时为什么这么选，而不是那样选"**。本项目没有正式的 ADR 流程，但它的源码注释密度极高，且多处注释直接记录了"事故现场 → 修复动作 → 不变式"的完整链条（`vite.config.ts` 的 9.3MB 事故注释、`src/utils/v-chart.ts` 的缺注册事故注释、`scripts/slim-chart-json.mjs` 的"唯一真源"宣言等）。本章把这些散落的证据考古成 12 条正式 ADR，每条按"背景 → 备选方案 → 决策 → 源码证据 → 后果"五段展开。全部决策的完整机制细节分散在既有篇目中，本章只做决策层面的归档与论证，机制走读见《07-模块详解》，安全面见《08-安全与权限设计》，性能复盘见《10-性能设计与优化》。

两点考古口径说明。其一，时间线以注释中标注的日期与 git 提交记录为准，无法精确到日的统一记为"2026-10"（项目处于高频治理期，多数决策集中在该月完成）；其二，00-15 篇定稿后（2026-10-06 午后），源码新增了第四图表库 webgl（325 条，`src/chart-examples/webgl/`、`src/chart-examples/webgl-manifest.ts`、`scripts/gen-webgl-registry.mjs`，均为未提交的工作区变更），本文涉及案例总数处按当前源码口径记录并标注差异，⚠️ 待确认 00-15 篇是否需要回刷数字。

## ADR-001：去后端化，整体收敛为纯静态架构

**背景**。项目此前依赖一个配套后端提供图表示例的分页/筛选/搜索与元数据存储，`src/api/chart-examples.ts` 的函数签名（`getChartExamples` / `getChartExample` / `getChartCategories`）至今保留着 REST 风格的形参形状即是遗痕。后端的存在使部署要求从"任意静态服务器"抬高到"静态服务器 + API 服务"，与"内网/离线交付"的目标场景直接冲突。

**备选方案**。方案一是保留后端、前端加缓存层做离线兜底——检索体验最完整，但交付物多一个进程，内网部署的运维成本不降反升；方案二是把元数据编译进 JS bundle——少一次请求，但数据更新必须重新构建；方案三是静态 JSON + 内存计算模拟原接口。**决策**：方案三，且刻意保持函数签名与语义不变（分页钳制、搜索域、未知库返回空集），使调用方（视图层）无感知切换。**源码证据**：`src/api/chart-examples.ts` 注释三连——"JSON 不再静态 import（曾把 ~20MB 打进 base chunk）"、"与原 filterLibrary 语义一致：未知库返回空集"、"与原后端语义一致：page 最小为 1，limit 上限 200"；`src/api/__tests__/chart-examples.test.ts` 的 10 个用例是这次改造的语义等价性证明（注释："与原后端 ILIKE 语义一致"）。**后果**：正面，部署面收敛为"dist 目录 + SPA fallback"，`scripts/smoke.mjs` 才能把"运行时零外链"立为硬断言；数据一致性从"服务端保证"转移到"守恒测试保证"（见《09-测试与质量保障》第 2 节）。负面，全量列表数据一次拉取（echarts.json 瘦身后仍 1.22MB，见《10-性能设计与优化》第 3 节），筛选/排序全部在内存进行，数据规模再涨一个量级时该模型需重审。

## ADR-002：元数据固化为 JSON + manifest 清单双轨

**背景**。去后端化后，1688 条（当前源码 2013 条，含新增 webgl 库）案例的元数据需要一个"文件系统即数据库"的落点，同时详情页需要一条**不等任何网络请求**就能判断"该 id 有没有本地 SFC"的快速通道。

**备选方案**。只留一份全量 JSON——详情页必须等 JSON chunk 下载完才能做路由判断，首字节延迟不可控；只留 manifest——列表页需要的 19 字段放不下，manifest 会膨胀回 JSON 的体积；编译期生成路由表——引入构建期复杂度，且"新增案例"从改数据变成改构建。**决策**：双轨。JSON（`src/data/charts/*.json`）承载全量 19 字段、服务列表页，经动态 import 按库切成独立 chunk；manifest（`src/chart-examples/manifest.ts` 3808 行 + `three-manifest.ts` 6786 行 + `webgl-manifest.ts`）只做四字段投影（id/title/category/tags + 可选 globals），随入口代码静态打包，换来详情页零延迟命中判断。**源码证据**：`src/chart-examples/manifest.ts` 头注释（"本文件由 server/scripts/gen-charts-local.ts 自动生成，请勿手改"）；`LOCAL_LIBRARY_MANIFESTS` 统一出口把三份（当前四份）清单收拢为一个 `Record<库, { manifest, ids }>`；两侧守恒由 `src/data/charts/__tests__/charts-data.test.ts` 的"SFC↔JSON 互不缺"断言锁定。**后果**：正面，"查表"与"查库"职责分离，详情页的链路分叉成本为一次 Set.has；负面，同一信息存两份，一致性完全押在测试上——这正是《13-技术债务与演进建议》第 1 条（生成器缺失）的风险根源：清单是生成物，生成器却不在仓库内。

## ADR-003：「清单 + 约定」双链路渲染，本地直挂优先

**背景**。案例从"后端存的代码字符串"迁移为"仓库里的真实 SFC 文件"后，渲染入口面临一个分岔：命中本地文件的条目直接挂组件，未命中的条目继续走 JSON 代码求值。两条链路的执行者、安全边界、错误呈现完全不同。

**备选方案**。全部收敛为单一链路——要么把 1688 条全部 SFC 化（迁移工作量巨大且违背"忠实保留官方脚本"的收录初衷），要么全部走 JSON 求值（等于放弃 SFC 化的全部收益：类型检查、源码即真源、构建期检查）。**决策**：双链路并存，本地直挂为优称路径（1617 条，当前源码含 webgl 为 1942 条），JSON 求值为兜底（71 条：54 echarts + 17 antv）。详情页先查 `LOCAL_LIBRARY_MANIFESTS`，命中则 `import.meta.glob` 异步直挂（源码注释称之为"方案 B：直接落 .vue 文件"），未命中才加载 JSON 走 `ChartExampleRenderer` 按 `loaderKind` 分派。**源码证据**：`src/views/ChartExampleDetailPage.vue` 的 `tryLoadLocal`/`findLocalModule`（先精确后缀匹配防 `xx-{id}.vue` 误命中）；`src/chart-examples/EChartDemo.vue` 头注释"曾有的 optionCode/code/gl 字符串执行路径已随迁移退役（零消费方）"——说明双链路的收敛方向是"兜底逐步升格为本地 SFC"。**后果**：正面，新增案例零注册代码（id 即文件名），渲染快（省一次编译/求值）；负面，两条链路要各自维护错误呈现与竞态保护，且"同一示例两条链路行为不一致"成为一类特殊 bug 源（《12-FAQ与故障排查》第 1 节的"链路三问"即为对冲此风险而生）。

## ADR-004：VueSfcRenderer 浏览器端编译，拦截定位为"行为护栏"

**背景**。JSON 里有 8 条 antv `component` 类兜底条目，代码形态是完整 SFC 源码字符串，无法像 optionCode 那样用 `new Function` 简单求值——它们需要模板编译、组件注册、样式注入的完整 Vue 编译管线，而构建期无法预知这些字符串的内容。

**备选方案**。放弃 component 类条目（迁移到本地 SFC）——成本最低但需要改数据面；预编译为构建期产物——需要一套"字符串 SFC → 预编译 chunk"的工具链，违背"JSON 是数据"的定位；浏览器端真编译（@vue/compiler-sfc 进运行时依赖）——运行时成本高但一劳永逸。**决策**：方案三。`src/utils/sfcRuntime.ts`（538 行）在浏览器端完成 parse → compileScript → compileTemplate → compileStyle，经模块重写与安全验证后在 `new Function` 沙箱执行；配套 `src/utils/sfc-modules.ts` 的三层模块白名单与 `__dynamicImport__` 闸门。关键取舍在安全定位：九条危险模式正则（`DANGEROUS_RUNTIME_PATTERNS`）不宣称"沙箱防攻击"，只拦截迁移代码的历史残留。**源码证据**：`src/utils/sfcRuntime.ts` 头部 `RUNTIME_BODY_MAX_LENGTH = 500000` 与九条正则；`executeRuntimeBody` 内联的 `var parent=undefined, top=undefined, opener=undefined`；`src/utils/sfc-modules.ts` 第 60~62 行注释（"主项目注册表中与本站无关的条目……已按游戏拆分 D3 原则裁剪，缺失模块走 MissingModuleStub 兜底"）。**后果**：正面，component 类条目无需任何构建期介入即可渲染，编译产物按 demoId 缓存后二次渲染零编译；负面，@vue/compiler-sfc（约 400KB 级）成为运行时依赖（《17-依赖全景》详述），且当前数据显示 8 条 component 条目均已升格为本地 SFC、不再携带 componentCode——沙箱链路处于"有测试、无数据消费者"的休眠态，⚠️ 待确认是否保留该链路作为未来能力。

## ADR-005：ECharts 四层同心圆封装与三模式执行契约

**背景**。294 个 echarts 本地 SFC 的执行诉求高度一致（挂载时序、上下文注入、清理、错误呈现），但个体差异大（静态图 / 异步取数 / 定时器交互 / GL / 地图）。若每个 SFC 自行处理，同一段"等实例就绪"的代码要复制 294 遍且各自踩一遍竞态坑。

**备选方案**。高阶组件抽象（HOC）——Vue 3 惯用法但 slots 传 ctx 很别扭；每个示例独立完整实现——重复度高；容器组件 + 契约——示例只声明 option/钩子，容器全权调度。**决策**：容器组件方案，并把 ECharts 相关代码组织为四层同心圆：全局注册源（`src/utils/v-chart.ts`，懒加载异步组件）→ 执行契约（`src/chart-examples/EChartDemo.vue`，option/onReady/setup 三模式 + ChartContext 七件套）→ 主题层（`src/utils/echarts-theme.ts`）→ 兜底求值（`ChartExampleRenderer.renderEchartsOption`）。契约的稳定性被显式声明："option/onReady/setup/scripts 的语义被 294 个生成 SFC 依赖，只能收紧不能变更"。**源码证据**：`src/chart-examples/EChartDemo.vue` 头注释（2026-10 重设计记录）；`src/utils/v-chart.ts` 头注释（38 个大屏组件 v-chart 缺注册导致图表静默空白的事故）；契约用例 `src/chart-examples/__tests__/EChartDemo.test.ts` 4 条。**后果**：正面，echarts SFC 的最小形态只有十余行（见《19-数据契约与示例集》），294 个文件风格一致可脚本化生成；负面，契约不可变更意味着任何 EChartDemo 的行为调整都是全量回归（`scripts/sweep-fallback.mjs` 与 smoke 探针即为护航工具），且全量 echarts 静态 import 的体积代价被 294 个 SFC 共同承担（ADR-011 展开）。

## ADR-006：vendor 五桶分包，src 代码永不进 vendor 桶

**背景**。echarts/three/@antv 三个重量级库与 Vue 运行时同属 node_modules，无分包策略时 rollup 会按引用关系把它们与框架代码合并进共享 chunk。项目曾发生真实事故：Vue 运行时被并进 echarts-vendor，入口 chunk 静态依赖并 modulepreload 了 9.3MB 的 echarts——首屏用户无论访问哪个页面都要下载。

**备选方案**。默认单桶 vendor——重量级库互相拖累，用不到 three 的页面也要付出解析成本；按路由分包——路由与依赖的映射关系不稳定；manualChunks 函数式按包名归桶——规则显式可审。**决策**：五桶函数式分包器（echarts-gl-vendor / echarts-vendor / antv-vendor / three-vendor / vendor 框架运行时桶），并立两条不变式：非 node_modules 一律返回 undefined（src 代码、含按库懒加载的 JSON 永不进 vendor 桶）；echarts-gl 判定必须先于 echarts（否则 echarts-gl 因路径含 echarts 落错桶）。同时切断事故的依赖边：`src/utils/v-chart.ts` 改为 defineAsyncComponent 包两级动态 import。**源码证据**：`vite.config.ts` manualChunks 注释原文（"框架运行时独立成 chunk：此前 Vue 运行时被并进 echarts-vendor，导致入口 chunk 静态依赖并 modulepreload 了 9.3MB 的 echarts"）；`vite.config.ts` 第 44 行注释（"仅归组三方依赖；src 代码（含按库懒加载的图表 JSON）不进 vendor 桶"）。**后果**：正面，验证方式机器可查——`dist/index.html` 的 modulepreload 只指向 vendor 桶；负面，桶规则是依赖名的字符串匹配，升级/换包名时可能静默落错桶，故《14-配置与环境详解》第 9 节把"改 manualChunks → smoke + Network 目检"列入检查单。事故链与体积数据完整复盘见《10-性能设计与优化》第 2 节。

## ADR-007：WebGL context 上限防护进 dispose 序列

**背景**。浏览器对同页同时存活的 WebGL 上下文有 8~16 个上限，超限后新建 context 直接失败且不可恢复（黑画布）。本项目的详情页交互天然撞限：刷新预览等于重挂载组件，快速切换示例更是连续创建 context。three 迁移自 curio 时，上游有 ExampleHost 的 loseContext 安全网，本项目没有。

**备选方案**。全局 context 池复用——工程复杂度高，与示例"自包含"语义冲突；依赖浏览器自动回收——GC 时机不可控，撞限后页面级不可恢复；在壳组件 dispose 里主动 forceContextLoss——一处修复覆盖 989 个示例。**决策**：方案三，在 `src/chart-examples/three/stage/useExampleStage.ts` 的 dispose 中追加 `renderer.forceContextLoss()`，且刻意保持"与上游的差异仅两处"的迁移纪律（另一处是相对导入路径），让 diff 最小化。dispose 序列完整覆盖：trackedListeners → trackedRafIds → resizeObserver → renderLoop.stop → controls.dispose → disposeObject3D(scene) 递归释放 → renderer.dispose → forceContextLoss。**源码证据**：`useExampleStage.ts` 头注释（"本项目详情页'刷新=重挂载'且无 curio ExampleHost 的 loseContext 安全网，需在此主动丢弃 WebGL 上下文，防止反复重挂载撞上浏览器 8~16 个 context 数上限"）。**后果**：正面，重挂载不泄漏成为壳层默认能力；负面，防护是"约定生效"——新写 three 示例若绕过 ExampleScene 自建 renderer 即失去安全网（《11-扩展开发指南》SOP-E 把"不要绕过壳自建 renderer"列为显式禁令），webgl 库同款问题由 `@webgl-examples/composables/useGraphicsCleanup` 的引用计数 patch 机制另行解决。详见《10-性能设计与优化》第 4 节。

## ADR-008：四处渲染代次竞态保护——软取消为主、"先清副作用再自弃"

**背景**。快速切换示例/地图/请求时，旧异步链路（echarts init、SFC 编译、GeoJSON fetch）的续体仍会执行，表现为实例泄漏、画面串台、旧错误顶掉新渲染。项目有四处独立的异步链路需要保护：资源请求、渲染分派、SFC 编译、地图加载。

**备选方案**。全部用 AbortController 真取消——fetch 可 abort，但 echarts init、SFC 编译、registerMap 没有可取消句柄，真取消覆盖不全；防抖节流——改变交互语义且治标；代次号比对（last-request-wins）——每处实现一个递增序号，在每个 await 续体处比对。**决策**：代次号方案，四处独立实现（`useResourceFetch` 的 requestId + AbortController、`ChartExampleRenderer` 的 renderSeq、`VueSfcRenderer` 的 compileSeq、`useMapGeoJson` 的 loadId）。两个关键取舍：其一，只有 useResourceFetch 叠加真取消（fetch 层有 abort 句柄），其余三处是"软取消"——任其跑完但丢弃结果；其二，过期分支不是纯 return，而是"先清理自己已产生的副作用再 return"——Renderer 过期时 `chart.dispose()` 自己建的实例，VueSfcRenderer 过期时撤掉本代注入的 style。**源码证据**：`ChartExampleRenderer.vue` 第 215~218 行注释（"过期则自弃（dispose 自己创建的实例、不写 error/loading）……否则快速切换示例会实例泄漏、互相覆盖甚至把成功渲染顶成错误态"）；`VueSfcRenderer.vue` compileSeq 注释同款；竞态用例两条（`ChartExampleRenderer.test.ts` / `VueSfcRenderer.test.ts`）。**后果**：正面，同一模式四处复制换来各链路独立可读，不引入共享抽象的耦合；负面，第五处异步链路出现时容易忘记复制该模式（《07-模块详解》第 7 节的对比表即为审计清单），且"先清副作用"这半句最易漏——测试用注入延迟构造在飞窗口来钉死它。

## ADR-009：CDN alias 外链清零，唯一例外 Google Fonts

**背景**。three 官方源码与部分组件裸写 jsdelivr CDN import（opentype.js、mp4box、lottie-web、polyslice、three-raycaster-helper 五条），rollup 会把它们提升进 ExampleScene 共享 chunk，导致几乎所有示例页面发外链——内网/离线部署下这些页面全部功能受损。

**备选方案**。fork 上游源码删 import——升级即失；运行时拦截 fetch/script 注入——拦不住静态 import；构建期 alias 重映射到 npm 包——零源码改动。**决策**：分层清零。import 级走 `vite.config.ts` alias 五条重映射；运行时字符串级（AmmoPhysics 的 wasm 路径 alias 拦不住）改本地副本源码的 AMMO_PATH 指向 `public/vendor-ammo/`；npm 已移除的依赖（ecsy）用 curio 快照续命；最后以 `scripts/smoke.mjs` 的 `EXTERNAL_HOST` 正则断言为回归防线。唯一例外是 index.html 的 Google Fonts——渐进增强，失败回落系统字体。**源码证据**：`vite.config.ts` 第 21~22 行注释（"three 官方 TTFLoader/demuxer_mp4 裸写 jsdelivr CDN import（会被 rollup 提升进 ExampleScene 共享 chunk，导致几乎所有示例页面发外链）"）；`scripts/smoke.mjs` 第 19 行 `EXTERNAL_HOST` 及其上注释（"内网/离线部署硬前提：不允许任何运行时外链请求"）。**后果**：正面，内网部署成为可承诺的交付形态（前提表见《08-安全与权限设计》第 7 节）；负面，"零外链"的精确语义是零功能性外链而非字面零请求，容易被误读（字体项在纯断网环境有 3 条失败请求噪音，见《13-技术债务与演进建议》第 5 条），且每次升级 three 生态都可能重新引入 CDN import——smoke 断言因此不可拆除。

## ADR-010：批量迁移走"生成器 + 引用裁剪"而非手工搬运

**背景**。three（989 条，2026-10-04 迁入）与 webgl（325 条，2026-10-06 迁入）两次大规模迁移要处理同一个问题：从上游仓库搬运上千个组件，同时保持 JSON、manifest、缩略图、资产四者一致，且约 800MB 的模型纹理资产不可能全量拷贝。

**备选方案**。手工批量搬运——一致性与溯源都无法保证；全量资产拷贝——仓库膨胀到不可维护；生成器脚本 + 资产引用裁剪——一次投入、可重跑、可校验。**决策**：生成器方案。`scripts/gen-three-registry.mjs` 与 `scripts/gen-webgl-registry.mjs` 完成"组件拷贝 → JSON 生成 → 资产裁剪拷贝（只拷真实命中的文件）→ 多项一致性校验（id 跨库唯一/组件存在/缩略图存在/失败退出码 1）"四步流水线，manifest 标注"生成勿手改"；配套 `sweep-three.mjs` / `sweep-webgl.mjs` 做渲染清扫。**源码证据**：`scripts/gen-three-registry.mjs` 头注释（迁移/注册表生成）；`scripts/gen-webgl-registry.mjs` 产物 `src/chart-examples/webgl-manifest.ts` 第 1 行（"由 scripts/gen-webgl-registry.mjs 自动生成（迁移自 curio 示例库），请勿手改"）；`scripts/slim-chart-json.mjs` 头注释把同一判定逻辑（有 SFC 删代码字段）同步应用到 webgl（LIBS 数组含 'webgl'）。**后果**：正面，echarts/antv 的 server 侧生成器缺失（见《13-技术债务与演进建议》第 1 条）后，仓库内两套生成器成为"清单必须有生成器"工程标准的活样板，webgl 迁移直接复用了 three 的全部经验（数据测试、缩略图解码兼容、__source 溯源）；负面，生成器对上游快照有依赖，重跑会覆盖手改（three 侧已通过"组件默认不覆盖已落盘文件"的幂等化修复缓解，git 提交 79f905b）。

## ADR-011：EChartDemo 全量 echarts 静态 import——确定性换体积

**背景**。echarts 6 的模块化形态允许 `echarts/core` + 按需注册，能显著缩小 chunk；但 294 个示例使用的系列/组件组合不可预知，且 vue-echarts 底层 init 依赖 painter 注册时序。

**备选方案**。按需注册——理论上 echarts 核心 chunk 可从 1.19MB 降到 400KB 以下（《10-性能设计与优化》第 8 节估算），但每个示例需要声明依赖清单或做静态分析；全量 import——注册时序确定、ctx.echarts 命名空间全功能可用。**决策**：有意选择全量，且是显式记录的取舍而非疏忽。**源码证据**：`src/chart-examples/EChartDemo.vue` 第 147~148 行注释原文（"全量 echarts 已在模块顶部静态引入（painter 注册时序确定），此处等待 v-chart 完成挂载与 init"）；体积后果实测 echarts 核心 1.19MB + echarts-vendor 1.18MB，任一 echarts 示例详情页必载（《10-性能设计与优化》第 2.3 节）。**后果**：这是 12 条 ADR 中唯一"反优化方向"的决策，登记它的意义在于：未来若做按需注册改造（《13-技术债务与演进建议》第 6 条），必须同时重验 294 个 SFC 的注册时序并用 sweep-fallback 全量清扫护航——当初换来的确定性就是改造要偿还的风险。注意该静态依赖不违反 ADR-006 的首屏约束：EChartDemo 只被 echarts 示例 SFC 引用，不进入口 chunk。

## ADR-012：死库整体删除，未知库返回空集而非报错

**背景**。项目曾注册 apexcharts / chartjs / d3 三个库，但渲染器从未实现、数据残缺——列表页有卡片、详情页必然失败，属于"可见但不可用"的最差状态。

**备选方案**。保留库位等实现——用户持续撞墙；隐藏入口保留数据——死数据长期占守恒测试与包体积；整体删除——导航、JSON、SFC、manifest 四处同步清理。**决策**：整体删除（2026-10），并让数据访问层对"未知库"永久保持温和语义：返回空集而非抛错，`slim-chart-json.mjs` 的 `localSfcIds` 对缺失目录返回空集（注释："apexcharts/chartjs/d3 无本地 SFC 目录（死库/兜底库），返回空集"），双保险由列表页 `isValidLibrary` 前置拦截补齐。**源码证据**：`src/api/chart-examples.ts` 头注释（"库白名单为 echarts / antv / three / webgl；apexcharts、chartjs、d3 已于 2026-10 删除（渲染器从未实现，数据残缺）"）；`README.md` 关键约定；`src/config/chartLibraries.ts` 现存四库定义。**后果**：正面，"库白名单是唯一真源"的原则经受住了一次增删循环（删三库、增 three/webgl 两库均未改动访问层代码）；负面，删除动作要同步守恒测试的 FILES 硬编码，漏改即测试红——这条"繁琐"是刻意的：数字本身就是规模契约（《09-测试与质量保障》第 2 节）。

## 收束：十二条决策的三条主线

把 12 条 ADR 放回一张图上，能读出三条贯穿主线。**主线一是"资产受信 + 行为可见"**：ADR-001/002/003/004 都在把不可控的外部依赖（后端、CDN、动态字符串）收敛为仓库内可 review 的静态资产，然后承认静态资产仍可能出错，于是把功夫花在"失败可见"（错误态、MissingModuleStub、unhandledrejection 桥接）而非"绝对防住"。**主线二是"懒加载一切重资产，但首屏契约神圣"**：ADR-006/011 是同一枚硬币的两面——入口 modulepreload 永远只有轻量 vendor 桶（不惜为此切断 v-chart 的静态依赖边），而热点路径上的确定性（painter 注册时序）可以花钱（1.19MB）买。**主线三是"生成器 + 守恒测试 = 无后端的数据一致性"**：ADR-002/010/012 共同构成这套替代方案——后端消失后，"写时一致"由生成器保证、"读时一致"由守恒测试保证、漂移由 git 留痕兜底。评估任何对这套架构的改造提案时，先对照这三条主线问一句"它加固还是稀释了这条约束"，再谈实现细节；若新决策与某条主线冲突，应像 ADR-011 那样显式登记取舍理由，而不是让代码 silently 偏离。
