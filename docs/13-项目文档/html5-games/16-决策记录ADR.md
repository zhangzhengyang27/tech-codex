# 16 决策记录 ADR — H5 游戏厅（html5-games）
> 项目：html5-games ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析

本篇是对项目十二条关键架构决策的「考古记录」，采用轻量 ADR（Architecture Decision Record）格式：每条按「背景 → 备选方案 → 决策 → 源码证据 → 后果」五段展开。与既有篇章的分工是：宏观架构图与数据流见《01-系统架构》，模块的机制细节见《07-模块详解》，本篇回答的是另一类问题——**「当初为什么是这样做，而不是那样做」**。这些决策没有任何一条留有正式的 ADR 文档（项目是单人维护的纯前端站，没有走重流程），所以本篇是从源码、注释、测试断言与历史痕迹（如 `docs/plans/`、`docs/research/` 的批次记录）反推重建的；凡无法从源码确证撰写动机的，标注「⚠️ 待确认」。条目按「对项目形态影响的大小」排序，前六条决定了项目的骨架，后六条决定了项目的质感。

## ADR-001 采用构建期 import.meta.glob 注册表，而不是运行时游戏清单

**背景**。项目要承载几十款自包含的游戏组件，最先要回答的问题是「框架怎么知道有哪些游戏」。三种典型形态：构建期静态扫描、运行时清单文件（JSON 或 API 返回）、手工维护的 import 列表。游戏的数量级（最终 79 款）与「单人维护、增量添加」的工作模式，让任何需要「加一款游戏改两处以上」的方案都会成为持续税负。

**备选方案**。其一，`games.json` 清单 + 运行时 `import()`：清单与磁盘文件是两份数据，一致性只能靠运行时校验或人肉纪律，清单落后于文件时出现「列表有但打开 404」。其二，手工维护 `import snake from './snake.vue'` 的中央索引文件：每加一款游戏必改索引，79 次 merge 冲突的温床。其三，单一巨型 bundle：把 79 款全量打进首屏，与「打开就玩」的产品定位直接冲突。其四，运行时 SFC 编译（源码当文本加载、浏览器内编译）：被安全（CSP 注入面）与体积（编译器数百 KB）双重否决。

**决策**。在 `src/games/registry.ts` 用一句 `import.meta.glob('@/games/*.vue')` 建立映射：Vite 在构建期扫描该 glob，为每个 `.vue` 生成独立懒加载 chunk，并把「文件路径 → 动态 import 函数」的映射表内联进产物。文件落盘即注册，运行时零扫描、零清单、零编译器。配套 `prefetchGame(id)` 提供悬停预取入口，`vite.config.ts` 的 `manualChunks` 承担重依赖隔离。

**源码证据**。`src/games/registry.ts` 全文 20 行：`gameModules` 的 key 形如 `/src/games/<id>.vue`；`src/pages/GameDetailPage.vue` 以 `gameModules[/src/games/${gameId}.vue]` 查表（取不到置 `loadError`「游戏模块缺失」）；`src/components/games/GameCard.vue` 第 60-61 行 `@mouseenter` / `@focusin` 调用 `prefetchGame`。一致性由 `src/config/__tests__/games.test.ts` 固化：用第二个 glob（`/src/games/*.vue`）与配置 id 集合做双向比对，配置或文件任何一侧漂移 CI 即红（见《00-项目总览》第 4 节统计口径）。

**后果**。正面：新增游戏的注册成本为零；每款游戏独立 chunk（实测 6-20K），配合预取把「点击到可玩」压进一个 RTT（见《10-性能设计与优化》第 1 节）。负面与代价：glob 路径的 key 格式（`/src` 前缀绝对路径）成了隐式契约，registry 的 `@/games/*.vue` 与详情页的 `/src/games/…` 两处字符串必须严格一致；registry、详情页挂载逻辑、CI 一致性测试三者强耦合，动它属于《05-核心流程》第 6 节定义的「全站级手术」。另外，「发版后旧 hash chunk 404」这一静态站特有故障需要路由级自愈兜底（`src/router/index.ts` 的 `router.onError` 整页刷新），是本决策衍生的第二笔维护成本。

## ADR-002 GameShell 五插槽软契约：79 款游戏共用一个页面骨架

**背景**。79 款游戏在整屏详情页里呈现，若各自实现页面骨架，会出现 79 种顶栏、79 种暂停按钮、79 种返回逻辑——既无法统一视觉，也无法统一「音频解锁」「返回大厅」这类横切行为。需要一个「外壳」吸收所有页面级差异，让游戏只写玩法。

**备选方案**。其一，HOC/mixin 式继承：Vue 3 生态不鼓励继承式复用，且游戏舞台形态差异大，继承容易退化为「配置项爆炸的上帝组件」。其二，每个游戏自带完整页面：重复 79 次，横切行为（BGM 解锁、静音持久化）无处收敛。其三，Headless composable（只提供逻辑不给 UI）：逻辑可复用，但「机台感」的视觉统一就没了，而视觉统一正是「游戏厅」产品定位的一部分。

**决策**。做一个插槽式外壳组件 `src/components/games/GameShell.vue`（729 行含样式），暴露五个插槽——默认（舞台）、`hud`（顶栏数据区）、`actions`（顶栏自定义按钮）、`info`（玩法说明栏）、`overlay`（舞台浮层）——与两个事件 `restart` / `togglePause`；外壳自己承担氛围背景、顶栏控制按钮（BGM/静音/暂停/重开）、按比例最大化舞台、窄屏 info 折叠、首个手势解锁音频并起 BGM。这是一次 Template Method 模式的组件化表达：骨架固定、变化点下沉给插槽。

**源码证据**。`GameShell.vue` 20-44 行 `withDefaults` 定义 8 个 props；46-49 行 `defineEmits` 仅 `restart`/`togglePause` 两个；57-72 行 `onFirstGesture` 手势监听（触发后自我注销，`onBeforeUnmount` 里 `bgm.stop()`）；83-87 行 `accentStyle` 注入 `--gaccent`/`--gratio` 两个 CSS 变量；`src/games/snake.vue` 第 2-13 行是标准的消费侧写法。79/79 款游戏模板根都是 `<GameShell>`（见《03-接口设计》第 2 节契约表）。

**后果**。正面：任何游戏的页面质量下限被外壳托住；「返回大厅」收拢在详情页悬浮按钮（`GameDetailPage.vue` 的 `game-stage__back`），79 款没有一款自建返回——这是插槽契约带来的结构红利（见《03-接口设计》第 2 节）。负面：契约是「软」的——插槽语义与 `gs-chip`/`gs-overlay`/`gs-card` 等工具类靠惯例维系（GameShell.vue 542-729 行的非 scoped 样式），没有类型或运行时强制，新增游戏自创类名会出现视觉漂移（见《03-接口设计》第 7 节风险三）；外壳本身成为危险修改区，改插槽语义等于改 79 款游戏。

## ADR-003 框架层 strict TS、游戏层允许 JS 的双轨制

**背景**。79 款游戏从五个批次陆续集成（见《00-项目总览》第 1 节的批次史），早期批次是 JS SFC；框架层（config/router/composables/components）则从拆分之初就是 TS。到当前版本，79 款中仅 5 款使用 `lang="ts"`（`lianliankan-game` / `huarongdao-game` / `match3-game` / `sokoban-game` / `sudoku-game`，grep 复核），其余 74 款为 JS。

**备选方案**。其一，全量 TS 化：对 74 款存量游戏补类型注解，产出数百行对玩法正确性零增量的 diff，并制造巨大的 review 与回归负担。其二，全量 JS：框架层是全项目唯一被反复修改的部分，失去类型保护会让 config 接口、composable 签名这些「多人共用面」裸奔。其三，用 JSDoc + checkJs 折中：理论可行，但对 74 款存量同样是逐文件工程，收益低于直接 TS。

**决策**。维持双轨：框架层全部 `.ts` 且 `strict: true`（`tsconfig.json` 第 15 行 `strict`，加上 `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`），由 `pnpm typecheck`（`vue-tsc --noEmit`）把关；游戏层允许 JS SFC，`vue-tsc` 对其内部不做检查。约束的落点是：**元数据配置 `src/config/games.ts` 永远是 TS**——它是游戏与框架之间的真正接口。

**源码证据**。`tsconfig.json` 完整 strict 配置；`package.json` scripts 的 `typecheck`；`src/games/` 下仅上述 5 个文件含 `lang="ts"`；`eslint.config.js` 对 `.vue` 文件启用 `pluginVue.parser + tseslint.parser` 但只挂 `flat/essential` 规则集（游戏层的类型规则不生效），并显式关闭 `vue/multi-word-component-names`（因为 `snake.vue` 这类单词名是约定）。

**后果**。正面：存量游戏零迁移成本，新增游戏两种写法均可，务实且稳定。负面：游戏层接口违约没有编译期防线——实证是 `gobang.vue` 播放了 `GameSfx` 联合类型之外的 `'lose'`/`'draw'` 导致静默无声（`src/games/gobang.vue` 250/253/257 行，见《13-技术债务与演进建议》E-06），这类「JS 层逃逸」只能靠 review、运行时兜底（详情页 `onErrorCaptured`）与计划中的扫描式测试拦截（见《09-测试与质量保障》第 4 节 P0）。演进策略已在《01-系统架构》第 5 节裁定：新游戏必须 TS、旧游戏触及即改、不设完成度指标。

## ADR-004 音频全部 WebAudio 合成，不放任何音频文件

**背景**。游戏厅需要音效与背景音，但项目同时立了「零素材依赖」原则（见《00-项目总览》第 1 节）：仓库里不允许出现几十个 mp3——体积、版权、加载策略都是负担。浏览器自动播放策略还要求 AudioContext 必须在用户手势后才能出声。

**备选方案**。其一，音频素材文件：每款游戏 2-5 个音效 × 79 款，数百个文件与数 MB 体积；版权来源难追溯；预加载策略又是一套要设计的机制。其二，一个通用音效包 + 映射：仍需素材，且音色与游戏气质脱节。其三，引入音频引擎（Howler.js 等）：解决的是「管理与播放素材」的问题，而本项目根本没有素材。

**决策**。音效用 WebAudio 振荡器 + 增益包络实时合成（`src/composables/useGameAudio.ts`），16 种 `GameSfx` 对应 `render()` switch 里的 16 份「微型乐谱」；背景音用「种子确定性作曲」——`useGameBgm.ts` 的纯函数 `createBgmPlan(seedKey)` 以游戏标题为种子，经 FNV-1a 哈希 + mulberry32 PRNG 确定性地生成速度/调式/和弦走向/32 步三层编制的曲谱，每款游戏永远同一首专属 BGM，零存储成本。单例 AudioContext 经 `ensureAudioContext()` 在两个模块间共享，`GameShell` 在首个用户手势时 `unlock()` 并 `bgm.start(props.title)`。

**源码证据**。`useGameAudio.ts` 11-27 行 `GameSfx` 联合类型；105-165 行 `render()` switch（如 `gameover` 是 440→330→220→130 的三连下行三角波）；`useGameBgm.ts` 16-35 行 `hashKey`/`mulberry32`、65-123 行 `createBgmPlan`、197-207 行 lookahead 调度器（90ms interval、0.4s 预排窗口）；`GameShell.vue` 57-63 行手势联动。`useGameBgm.test.ts` 固化「同一标题曲目恒定」契约。

**后果**。正面：零素材、零版权、零预加载；「新增音效 = 加一个 case」「换 BGM = 改标题」的极简维护模型；曲谱生成是纯函数可单测。负面与边界：合成音色的表现力天花板低于采样音源，复杂音景无法企及；浏览器手势策略要求严格的解锁时序（刷新后直接程序化播放会被拦，见《00-项目总览》第 5 节的 FAQ 剧透）；`GameSfx` 契约对 JS 游戏无强制（ADR-003 的代价面，gobang 事故即出于此）；确定性作曲的「款款不同」依赖标题唯一——若未来出现同名游戏，两首曲子会相同（当前测试保证 id 唯一但 title 并无唯一性断言；一致性回刷已实测 79 款 title 尚无重复，影响面限于未来新增同名款 ⚠️ 维持关注）。

## ADR-005 封面程序化生成：离屏绘制 + worker 编码，不放图片素材

**背景**。79 张游戏封面是列表页的视觉主体。零素材原则（ADR-004 的姊妹决策）意味着不能放 79 张图片；而封面的绘制成本必须控制——大厅首屏一页 24 张卡片，绘制与编码若都在主线程，会直接卡死页面切换。

**备选方案**。其一，真实图片素材：违反零素材原则，且需要美工产能。其二，SVG 内联组件：每个卡片段式渲染 SVG，几何符号可行但「webp 位图缓存」不可得——SVG 方案每次渲染都要重新执行绘制逻辑（或依赖 Vue 的复用），没有「一次绘制全局缓存」的干净形态。其三，主线程绘制 + 主线程 toDataURL：被实测否决——软件渲染环境下每张编码 45-65ms，一次大厅挂载 28 张即约 1.7s 主线程长任务，是页面切换卡顿元凶（`gameCoverRender.ts` 文件头注释原文记载）。

**决策**。`src/components/games/gameCoverRender.ts` 模块级单例管线：主线程离屏 canvas 绘制（640×400，约 2ms）→ `createImageBitmap` 零拷贝转移 → worker 线程 `OffscreenCanvas.convertToBlob` 编码 webp（`coverEncode.worker.ts`）→ objectURL 回传 → 模块级 `coverCache: Map` 缓存；同 id 并发请求经 `pendingRenders` 去重共享一次渲染；worker 不可用走 `workerBroken` 单向降级同步编码；字体竞态只认 Inter「真实可用性翻转」。封面视觉由 id 的 FNV-1a 哈希决定（符号 `kind % 8`、辉光位置 `rand(seed)`），同一游戏永远同一封面。

**源码证据**。`gameCoverRender.ts` 23-31 行双 Map 缓存与 `coverVersion`；37-59 行 `getEncodeWorker` 的惰性创建与 onerror 兜底；61-83 行字体竞态防护块；110-243 行 `drawGlyph` 八种几何符号库；245-327 行 `drawCover` 八步绘制；341-370 行 `renderCoverAsync` 主入口；`coverEncode.worker.ts` 全文 24 行；消费侧 `GameCover.vue` 的 `load()`。

**后果**。正面：零素材、款款不同且视觉统一（分类色辉光来自 `localGameCategoryMap`）、同 id 全局只画一次、主线程零阻塞（见《10-性能设计与优化》第 2 节）。负面：worker 只是加速手段而非正确性依赖，但 worker 内编码失败该 id 无兜底（主线程 `settleSync` 只覆盖 worker 提交前的失败路径，编码 Promise reject 后该封面缺席 ⚠️ 待确认是否补主线程重编码）；封面的暗色基底写死在绘制代码里，亮色主题化需要给 `drawCover` 加主题参数并重建缓存（见《11-扩展开发指南》场景六坑位二）；封面是位图而非矢量，640×400 在超高分屏有轻微放大模糊（当前卡片尺寸下不可感知）。

## ADR-006 不引入 Pinia/Vuex，无全局状态库

**背景**。Vue 生态的默认答案是「有共享状态就上 Pinia」。本项目需要跨组件共享的状态盘点下来只有：音频静音偏好、BGM 开关、封面缓存——全部可以用「模块级单例」承载；游戏玩法状态则天然属于各游戏内部，互不相干。

**备选方案**。其一，Pinia：为一个 `muted` boolean 引入一整套 store 范式、devtools 与文件结构，收益为零。其二，provide/inject 树状下发：外壳与游戏是父子关系，但音频状态同时被外壳与游戏消费，用 inject 会把游戏组件与「必须被外壳包裹」死死绑住——而实际契约是游戏自己 `useGameAudio()` 即可，不依赖注入链。其三，事件总线：解耦过度，状态不可追溯。

**决策**。需要共享的响应式状态一律定义在 composable 模块顶层：`useGameAudio.ts` 39 行 `const muted = ref<boolean>(readMuted())`、`useGameBgm.ts` 139 行 `const bgmMuted = ref(readBgmMuted())`、`gameCoverRender.ts` 23 行 `coverCache`——全应用 import 到的是同一份实例。组件间通信只用 props/slots/emits（GameShell 契约）与路由参数；`provide` 全项目深度极浅。

**源码证据**。上述三处模块顶层定义；`package.json` dependencies 仅 5 项、无任何状态库（见《17-依赖全景》）；《02-页面设计》第 5 节的状态管理分析（本篇不复述）。

**后果**。正面：概念负担最小，「状态在哪」永远有确定答案（模块顶层或组件内）；无 store 样板代码；游戏组件零依赖环境（自包含契约因此可执行）。负面：单例状态没有 devtools 时间旅行，调试依赖 console；模块级单例在测试里需要小心跨用例污染（现有测试对象是纯函数，未触及此问题 ⚠️ 待确认未来测试单例 composable 时的隔离策略）；若未来出现真正复杂的跨页面共享状态（如全站成就系统），本决策需要重新评审——《01-系统架构》第 5 节已预留「新增独立模块而非改造各游戏」的演进原则。

## ADR-007 localStorage 分层兜底：读写全 try/catch、fire-and-forget 语义

**背景**。localStorage 在 Safari 隐私模式、配额满、被安全软件禁用等场景会抛异常；游戏结算时的存档写入若抛错，会中断游戏流程——「存档失败」绝不能比「存档丢失」更贵。

**备选方案**。其一，不做处理：风险场景真实存在（尤其 iOS 隐私浏览）。其二，写入失败时 UI 提示：为一个非关键数据打扰用户，得不偿失。其三，引入 IndexedDB + 兜底层（如 localForage/idb 库）：异步 API 会把所有读写点复杂化，而本项目数据全是单键标量/小 JSON，存储容量需求极小，杀鸡用牛刀。

**决策**。全项目所有 localStorage 访问点统一「try/catch 静默降级 + 缺省值兜底」：读失败返回约定初值（`readHighScore` 返回 0，偏好开关返回未静音），写失败忽略（游戏逻辑不依赖写入成功）。工具收敛为 `src/utils/highScore.ts` 的两个函数（全文 23 行），复合数据由各游戏内联实现同一模式（如 `gobang.vue` 115-132 行 `readRec`/`saveRec`）。不引入任何存储库。

**源码证据**。`src/utils/highScore.ts` 全文；`useGameAudio.ts` 31-37/184-191 行；`useGameBgm.ts` 131-137/274-282 行；游戏侧范式见《04-数据模型》2.1 的键全景表与《11-扩展开发指南》场景三。

**后果**。正面：隐私模式等功能完整仅无纪录（见《04-数据模型》第 5 节的脏数据自愈场景：`Number('abc') → NaN → || 0` 回落初值）；代码形态统一到「一眼读懂」。负面：静默降级让存档类 bug「无声」——用户报障「纪录没存上」时无法从日志定位（无任何上报通道）；`localStorage` 与内存状态可能短暂不一致（写失败后内存值仍是新值，本局内显示正确、刷新后回落），这是 fire-and-forget 的既定代价。与 ADR-008 合并看，本项目对存储的定位始终是「尽力而为的锦上添花」。

## ADR-008 只存「跨局沉淀」，不做游戏进度存档（单局制产品边界）

**背景**。79 款游戏的生命周期设计必须回答「刷新页面，这一局还在吗」。进度存档（续玩）要求序列化整局快照（棋盘、实体、随机种子、状态机），并处理版本兼容、恢复入口、与高分并存等一系列问题——这是独立的存储子系统。

**备选方案**。其一，全量进度存档：为 79 款逐一设计快照格式与恢复逻辑，工作量与维护面巨大，且多数游戏单局时长仅 1-5 分钟，续玩需求稀薄。其二，部分游戏（长局类）先行：判断标准模糊，且一旦出现先例，「为什么它有我没有」的期望就管理不住。其三，URL 编码局内状态：状态体积与隐私面都不可控。

**决策**。产品边界定为**单局制**：局内状态全部随组件卸载丢弃，localStorage 只保存跨局沉淀（最高分/战绩/统计/偏好）。roguelike 地牢也是 permadeath。若未来出现长局游戏需求，按 `h5g:<id>-save` 新键 + 版本化快照的预留方案扩展（《04-数据模型》第 3 节预告、《13-技术债务与演进建议》第三阶段 (c)）。

**源码证据**。反面证据即正面证据：全仓库 grep 无任何「快照/续玩」逻辑，各游戏状态建模是「挂载创建、卸载销毁」（《04-数据模型》第 3 节的运行时数据表）；`src/games/roguelike-dungeon-game.vue` 的死亡结算同样只写最高分。存档键全景见《04-数据模型》2.1。

**后果**。正面：数据模型极简（79 个 best 键 + 4 个复合键 + 2 个偏好键，见《04-数据模型》2.1）；游戏组件可以随时被卸载重建而无「恢复一致性」问题；重开按钮（GameShell 的 `restart` 事件）语义永远干净。负面：玩家意外刷新丢失长局进度的体验损失是真实的（列表页卡片是真实 `<a>` 链接，中键误点即离开）；该边界约束了未来选型——需要长线养成的玩法（放置类深度成长）与本边界冲突，接入前必须先推翻本决策而非绕过它。

## ADR-009 pixi-vendor 重依赖隔离：manualChunks 的按需分发

**背景**。PixiJS 8（WebGL 渲染引擎）是全项目最重的运行时依赖（压缩后约 488K，见《13-技术债务与演进建议》对 Phaser 1MB+ 的对比引用），但全项目只有 3 款游戏使用它。若按默认分包策略落入共享 vendor，等于让 100% 的玩家为 3.8% 的游戏下载引擎。

**备选方案**。其一，放任默认分包：pixi 会随首次命中它的 chunk 被拉进共享图，污染其他游戏。其二，不用 pixi，3 款游戏改写为原生 Canvas：pixi-fireworks 的粒子规模与 pixi-pong 的渲染管线确有引擎价值，重写是无收益的倒退。其三，动态 import 包裹（不配置 manualChunks）：Vite 仍可能把它与共同依赖合并，分包边界不如显式声明可靠。

**决策**。`vite.config.ts` 的 `manualChunks` 三段式：vue 全家桶（`vue/`、`vue-router/`、`@vue/`）合并为 `vendor`，`@vueuse` 独立 `vueuse-vendor`，pixi 命中 `pixi-vendor`；游戏内 `import 'pixi.js'` 自动落位，游戏作者无需关心。`chunkFileNames` 给 vendor 前缀特殊命名，缓存友好。

**源码证据**。`vite.config.ts` 的 `manualChunks(id)` 函数（`// PixiJS 体积大，独立 chunk（仅 3 款 pixi 游戏按需加载）` 注释）；`src/games/pixi-pong.vue` 第 11 行 `import { Application, Graphics } from 'pixi.js'`；锁定版本 `pixi.js@8.20.1`（pnpm-lock.yaml，见《17-依赖全景》）。

**后果**。正面：普通玩家永不下载 WebGL 引擎；pixi 游戏的加载不影响其他游戏的缓存指纹。负面与衍生约束：manualChunks 按包名子串匹配（`pixi.js`/`/pixi.js/`/`pixi/`），引入名字含相似子串的新依赖会误入 pixi-vendor ⚠️ 待确认（当前依赖清单无冲突）；该决策确立了「重依赖必须独立 chunk」的项目惯例，成为《11-扩展开发指南》场景四（接入 Phaser）的可行性前提；pixi 游戏组件因此多承担一项竞态责任——`Application.init()` 异步期间可能被卸载，`pixi-pong.vue` 用 `destroyed` 标志位防护（第 34/370-395 行），这是「按需加载重依赖」转嫁给游戏层的复杂度。

## ADR-010 历史存档短键不迁移：维持 8 处偏差 + 未来双读

**背景**。存档键惯例是 `h5g:<id>-best`，但 8 款早期游戏（贪吃蛇、数字滑块、泡泡风暴、打地鼠、视频拼图、pixi 打字飞船等，清单见《04-数据模型》2.3）的键名短于 id（如 `h5g:snake-best` 而非 `h5g:snake-game-best`），另有 1 处按模式分键的动态键（`memory-match-game.vue` 第 42 行 `h5g:memory-match-best-${size.value}`）。规范化它们意味着改键。

**备选方案**。其一，批量改名 + 迁移脚本：改键瞬间老玩家纪录感知性清零——而短键对应的恰恰是复用率最高的经典款（贪吃蛇等），社群可感知的破坏换来的只是「键名整齐」这一内部美感。其二，双写过渡（新键 + 旧键同写一版后删旧键）：需要发布节奏配合，且收益同样只是键名整齐。其三，维持现状 + 把「id → 键」的推导需求推迟到真正出现时再解。

**决策**。维持短键不迁移（⚠️ 待确认是否有一次性迁移脚本的计划——截至当前版本源码无任何迁移痕迹，判定为「不做」）。各游戏把键写在自己的常量里，项目不提供「从 id 推导键名」的函数；未来若做全站纪录中心等按 id 枚举键的功能，采用「双读映射」：新增 `bestKeyOf(id)` 内置 8 项豁免表，规范键直出、历史键查表（《11-扩展开发指南》场景五已给 SOP，《13-技术债务与演进建议》E-04 为正式裁定）。同时禁止模仿短键新增键。

**源码证据**。8 处短键的 grep 清单（《04-数据模型》2.3，逐文件复核）；`memory-match-game.vue` 40-43 行 `bestKey()`；反向证据：`src/utils/` 下只有 `highScore.ts`（23 行，收 key 为参数、不知晓 id），确无映射函数。

**后果**。正面：老玩家纪录零感知；当前零迁移成本（偏差对内无消费方）。负面：偏差成为「按 id 枚举键」类功能的硬阻塞，任何此类功能必须先建映射表；「best 不保证方向」叠加「键名不保证 = id」两条历史包袱，使存储层的隐式约定数量多于显式代码，新接手者必须先读《04-数据模型》2.2/2.3 才能安全操作键名；键名契约目前无测试守护，依赖纪律（《09-测试与质量保障》第 4 节 P0 已列入补测计划）。

## ADR-011 不引入 UI 组件库：自研薄封装 + 设计令牌体系

**背景**。站点需要按钮、输入框、图标、分页器、分类 chips 等基础 UI。组件库（Element Plus / Naive UI / Vuetify）能立刻给齐这些，但与本项目的「Linear 风格暗色机台」视觉定位存在先天张力。

**备选方案**。其一，引入组件库 + 深度覆写样式：覆写成本通常高于自研（要对抗库的默认样式层级），且把视觉命运绑定在库的 DOM 结构上。其二，Headless UI（Radix Vue 等）：逻辑可取，但本项目所需的交互极其简单（受控输入、分页、chip 组），引入成本不成比例。其三，Tailwind 工具类直接散写：无封装层，79 处按钮样式漂移不可控。

**决策**。基础组件自研薄封装：`src/components/common/AppButton.vue` / `AppInput.vue` / `AppIcon.vue`、`src/components/layout/Pagination.vue` / `AppHeader.vue` / `SiteFooter.vue`、`src/components/common/CategoryChips.vue`；视觉基座是 `src/assets/main.css` 的设计令牌（Tailwind v4 `@theme inline` 桥接 CSS 变量，Linear 风格暗色）。图标用自托管 npm 包 `material-symbols` 的字体文件（`src/main.ts` 第 5 行引入 `outlined.css`），经 `AppIcon.vue` 统一消费，无在线图标 API。

**源码证据**。`package.json` 依赖清单（无任何 UI 库）；`eslint.config.js` 之外无 UI 库 import；`src/assets/main.css` 头注释「设计令牌 — Linear 主题移植」；《13-技术债务与演进建议》E-08 佐证了「UI 库」话题的注释漂移史（usePagination 注释误引不存在的 xiaoye-ui——恰说明团队对「有没有 UI 库」这个事实很敏感）。

**后果**。正面：视觉 100% 可控、bundle 无库级冗余；令牌体系让「亮色主题化」的改动面压缩到 `:root` 变量层（见《11-扩展开发指南》场景六）。负面：所有基础组件的可用性责任（键盘可达性、焦点样式）自己承担，无库替你踩坑；material-symbols 字体存在个别连字缺失的实测事故（casual 分类的 `ms:catching_pokemon` 以字面文本渲染撑破侧栏，`games.ts` 68-69 行注释原文记载），图标上线前必须实测；自研组件数量会缓慢生长，需要警惕重复造轮的边界——当前的纪律是「第三处重复出现时才抽组件」⚠️ 待确认（该纪律仅从代码形态推断，无文档记载）。

## ADR-012 舞台最大化用容器查询单位，不用 JS 计算

**背景**。GameShell 要把舞台在「保持宽高比的前提下」最大化铺满可用区域。经典解法是 JS：ResizeObserver 监听容器、算出适配尺寸、写回 style——每一款游戏、每一次窗口变化都要走一遍这个循环。

**备选方案**。其一，JS + ResizeObserver 计算：可行且通用，但 JS 布局与 CSS 布局之间存在一帧时差，容器尺寸变化（旋转屏幕、折叠 info 栏）时舞台会短暂错位；且计算逻辑必须有人维护。其二，CSS aspect-ratio 属性：能锁定比例但不能「在容器内最大化」（它保证元素自身的比例，不解决「取 min(容器宽, 容器高×比例)」的对偶约束）。其三，纯 CSS 容器查询单位。

**决策**。`.gshell__stagewrap` 声明 `container-type: size`，`.gshell__stage` 的宽高写成对偶式：`width: min(100cqw, calc(100cqh * var(--gratio, 1)))`、`height: min(100cqh, calc(100cqw / var(--gratio, 1)))`——纯 CSS 完成「按比例最大化」，游戏只需通过 `ratio` prop 提供宽高比（经 `accentStyle` 注入 `--gratio`）。

**源码证据**。`GameShell.vue` 325-346 行（stagewrap 的 `container-type: size` 与 stage 的对偶式宽高）、84-87 行（`accentStyle` computed 注入 `--gaccent` 与 `--gratio`）；注释记载的姊妹决策「overlay 挂在 stagewrap 而非 stage 内」（160-167 行）同样源于舞台缩放布局的实际坑。

**后果**。正面：任何容器尺寸变化浏览器自动重排，无 JS、无时差、无监听器清理责任；`ratio` 成为游戏与外壳之间最轻的布局接口（竖版滑块 0.56、横版射击 16:9，见《11-扩展开发指南》坑位 8）。负面：容器查询是较新的 CSS 能力（现代浏览器全支持，`build.target: esnext` 与之匹配，不做 legacy 降级——若未来需要支持老浏览器，此处是升级阻力点之一）；`container-type: size` 使容器内容不参与自身尺寸计算，stage 之外的 wrap 层必须由外层布局明确给高（当前由 `.gshell__body` 的 flex 布局保证，改动 body 结构时需同步验证）；浮层若放进 stage 会被 `overflow: hidden` 裁切——这是本决策的隐性配套约束（ADR-002 与本条共同落位为「overlay 挂 wrap 层」的既成事实）。

## 结语：十二条决策的共同语法

把这十二条放在一起看，会出现三个反复出现的句式。**句式一：「零素材、程序化生成」**（ADR-004/005/011）——凡是能用代码生成的资源（音效、BGM、封面、图标字体）一律不落素材文件，代价是表现力天花板，换来的是零版权、零体积、零加载策略。**句式二：「构建期能解决的不留给运行时」**（ADR-001/009/012）——注册表内联、依赖预分包、布局交给 CSS，运行时只做「已经确定的事」，所有不确定性（清单与文件的一致性、分包边界、比例计算）消灭在构建期或浏览器布局引擎里。**句式三：「静默降级优于显式失败」**（ADR-007/008/010）——存档失败、worker 不可用、字体不可达、键名偏差，全部以「功能缩窄但不中断」的方式消化，这与纯静态站「没有服务端帮你兜底」的存在前提一致。任何一条新决策若与这三个句式冲突（例如引入需要服务端协调的功能），按《01-系统架构》第 5 节与《13-技术债务与演进建议》第三阶段的裁定，应当先作为产品边界变更评审，而不是当作普通技术选型处理。
