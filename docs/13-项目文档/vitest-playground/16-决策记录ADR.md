# 16 决策记录（ADR）

> 项目：vitest-playground ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析

本篇以架构决策记录（Architecture Decision Record）的格式，对项目演进过程中十余个关键取舍做一次"考古"。每条决策按统一的五段式组织：背景（当时面对的问题）、备选（考虑过或客观存在的其它路线）、决策（最终怎么做）、源码证据（决策物化在哪个文件哪一行）、后果（带来的好处与代价）。与既有篇目的分工是：《01-系统架构》回答"系统现在是什么样"，《05-核心流程》回答"一次请求怎么走"，《13-技术债务与演进建议》回答"现在还有哪些欠账"——本篇回答的是"**为什么是这样而不是那样**"。部分决策的时间线取自 `docs/superpowers/plans/` 的两份实施方案与 `README.md` 的演进记载，无法从源码直接确认的细节以 ⚠️ 待确认 标注。

决策的总体脉络可以先用一句话串起来：这是一个"**做窄做深**"的项目——每一条决策几乎都是在"更通用的方案"与"更简单的方案"之间选了后者，然后用测试与文档把这条窄路的边界钉死。理解了这个基调，下面十二条决策看起来就是同一种性格的不同侧面。

## ADR-001：测试能力绑定 Vite 中间件，而非独立后端服务

**背景**：产品需要一个 HTTP 端点接收浏览器提交的代码并在服务端执行。团队当时只有前端技术栈（Vite + React），若引入独立后端（Express/Koa/Fastify）意味着多一个进程、多一份部署物、多一套跨域与端口管理。

**备选**：其一是独立 Node 服务（如 Express 挂 `/api/run-vitest`），能力等价但部署面翻倍，且 SPA 静态资源与 API 分离后本地开发要同时起两个进程（或引入代理配置）；其二是 Serverless 函数（Vercel Functions 等），但"spawn 子进程跑 vitest"与多数 Serverless 沙箱的生命周期/文件系统模型冲突；其三是不做服务端，全部在浏览器内执行（见 ADR-002 的 WebContainer 路线）。

**决策**：把 HTTP 处理器写成一个 Vite 插件 `vitestRunnerMiddleware()`，通过 `configureServer` 与 `configurePreviewServer` 两个钩子把 `handleRunVitest` 挂载到 `/api/run-vitest` 路径上。dev 与 preview 服务器行为完全同构，不引入任何后端框架依赖。

**源码证据**：`vite.config.ts` 第 6-21 行定义了该插件，两个钩子内都是同一句 `server.middlewares.use('/api/run-vitest', (req, res, next) => { handleRunVitest(req, res).catch(next); })`；第 4 行 `import { handleRunVitest } from './vitestServerRunner'` 是构建配置对产品逻辑的唯一依赖点。`package.json` 的 dependencies 中没有任何 HTTP 框架，佐证了"复用 Vite 服务器"的决策。

**后果**：正面是部署面保持单一（`pnpm dev` 与 `pnpm preview` 都自带 API，`docs/deploy/runbook.md` 的生产形态就是 `pnpm preview` + nginx 反代），本地开发与生产行为零漂移；`.catch(next)` 让未捕获异常走 connect 错误链而非静默吞掉。代价是：纯静态托管（GitHub Pages、Vercel 静态）从此不可用——API 能力与 Vite 进程共存亡，这一点在《00-项目总览》§5 已作为硬约束写明；另外中间件代码无法独立做集成测试的"真起服务器"验证，只能用 `PassThrough` 流伪造请求对象（见《08-安全与权限设计》§4）。接口全量行为见《03-接口设计》。

## ADR-002：本地真实 Vitest 子进程，替代 WebContainer 浏览器运行时

**背景**：项目早期（`README.md` 第 114 行有明确记载）用 `@webcontainer/api` 在浏览器内启动 Node 运行时来跑测试，"浏览器内运行"名副其实。但 WebContainer 依赖 StackBlitz CDN 加载运行时镜像，要求页面处于跨域隔离状态（COEP/COOP），且离线不可用。

**备选**：继续投入 WebContainer（保持"代码不出浏览器"的安全优势）；或迁移到同样走浏览器内路线的其它方案（如 Pyodide 类 WASM 运行时，但 Node 生态无等价物）。

**决策**：彻底移除 WebContainer，改为"浏览器把代码 POST 给同源 Vite 中间件，中间件在服务端沙箱目录 spawn 项目自装的 `node_modules/vitest/vitest.mjs`"。`vitestServerRunner.ts` 文件头注释第一行就写着"服务端 Vitest 运行器（替代 WebContainer）"，这是决策最直接的物证。

**源码证据**：`vitestServerRunner.ts` 第 1-10 行文件头注释；`README.md` 第 114 行"早期版本曾用 @webcontainer/api……现已改为由本地 Vite 服务器中间件 /api/run-vitest 调用本机真实 Vitest"；`vite.config.ts` 第 45-49 行 COEP/COOP 头的注释还残留着"WebContainer 需要页面处于跨域隔离状态"的历史说明。`package.json` 中 `@webcontainer/api` 已不在任何依赖清单里。

**后果**：正面是离线可跑（依赖在本机 `node_modules`）、行为与本地 Vitest 完全一致（多文件、`vi.mock`、快照、覆盖率全部真实可用，这是 WebContainer 很难保证的）、CDN 依赖归零。代价是安全模型从"浏览器沙箱"退化为"服务端受限执行"（见 ADR-003），`AGENTS.md` 铁律 2 因此必须警告"不要暴露到不可信网络"；`src/pages/vitest-learn/runner.ts` 的 `isReady` 恒真垫片与 `CodeEditor.tsx` 的"首次运行需联网安装依赖"文案是这次迁移留下的两处历史残迹（均已列入《13-技术债务与演进建议》问题 6/7）。运行时目录也从浏览器内存变成了服务端磁盘（见 ADR-005）。

## ADR-003：进程级沙箱（目录 + 受限进程），容器化仅立项未落地

**背景**：移除 WebContainer 后，用户代码在宿主机以完整 Node 进程执行，隔离问题立刻成为主要矛盾。团队在 `docs/superpowers/plans/2026-09-28-container-isolation.md` 中认真评估过容器方案。

**备选**：其一是一次性 Docker 容器执行（`--network none --memory 512m --cpus 1 --pids-limit 128 --read-only`、非 root、镜像内烘焙 node_modules 符号链接）——方案文档写到 Task 级细节；其二是 gVisor/Firecracker 微 VM（方案文档"Spec 之外不做"清单明确排除）；其三是 chroot/seccomp 等系统级手段（工程复杂度高、跨平台差）。

**决策**：当前生产形态选择"进程级受限执行"——独立临时目录 + 最小环境变量白名单 + `detached` 进程组 + 60s SIGKILL + 输出/文件数/请求体多重上限，把每次执行的破坏半径压小，但不做文件系统级隔离；容器化作为安全演进主线保留方案（`VITEST_RUNNER_BACKEND=local|docker` 双后端设计），待落地。

**源码证据**：`vitestServerRunner.ts` 第 287-314 行（`runInSandbox` 的入口校验与 finally 清理）、第 96-108 行（`buildChildEnv` 白名单）、第 355-360 行（spawn 选项 `detached: true`）、第 372-379 行（`process.kill(-child.pid, 'SIGKILL')` 整组击杀）；方案文档 `2026-09-28-container-isolation.md` 全文，对照当前源码与 `tests/` 目录——**没有任何 `resolveBackend`/`spawnVitestDocker` 符号，该方案未实现**（⚠️ 待落地，已在《13》问题 4 立项）。

**后果**：正面是本地开发零 Docker 依赖（默认 local 后端本来就不需要容器）、行为可预测、测试可以在毫秒级纯函数与真跑集成之间自由分层。代价是两个威胁面无解：测试代码可读宿主文件系统（其运行身份可读的一切）、可无限制出网（《08-安全与权限设计》§2 威胁表把这两行标为 ⚠️）；公网部署只能靠 nginx 限流 + 并发闸门做"流量整形"，安全水位定性为"受限的受控执行"而非"隔离的沙箱"。

## ADR-004：结果经 `--outputFile.json` 文件回传，而非解析 stdout

**背景**：用户测试代码里任何 `console.log` 都会混入 vitest 的 stdout。加固前的旧实现依赖 `extractJson`（取 stdout 首个 `{` 到最后一个 `}`）解析结果——用户打印 `console.log('{"fake": "json"}')` 就能污染解析。`2026-09-27-runner-hardening.md` 的 Review Focus 第 3 条把这个失败模式明确钉为必须修复项。

**备选**：其一，继续解析 stdout 但加启发式过滤（识别 vitest 报告特征）——脆弱，用户总有办法构造更逼真的假 JSON；其二，用 vitest 的编程式 API（`createVitest`）在进程内跑——架构改动大，且与"子进程隔离"目标冲突；其三，自定义 reporter 输出到独立通道——受限于 vitest 版本的 reporter 加载机制。

**决策**：普通运行命令追加 `--reporter=json --outputFile.json=result.json`，让 vitest 把 jest 兼容 JSON 报告**写到沙箱目录的文件**里；解析主路径读文件，stdout 降级为回退路径（result.json 不存在时才 `extractJson`），且 stdout 累计上限 1MB 只服务排障。

**源码证据**：`vitestServerRunner.ts` 第 353 行 `['run', '--root', runDir, '--reporter=json', '--outputFile.json=result.json']`；第 400-420 行 `finishRun` 的三级分派（bench 表格 / result.json / stdout 回退）；第 363 行注释"解析主路径是 result.json，消费方只读尾部 slice(-2000)"；测试 `tests/runner-security.test.ts` 的「用户 stdout 打印 JSON 不污染结果解析」用例（打印假 JSON 后仍解析出 noisy 用例）。

**后果**：结果是"正确性设计"与"安全设计"合一：伪造输出欺骗判题的思路在协议层被封死，用户输出再嘈杂也不影响 `success/tests/markers` 的正确性。代价有两条：一是 bench 模式享受不到这条防线——Vitest 4.1.8 的 bench 内置 reporter 只有 default/verbose，`--reporter=json` 会报 "Failed to load custom Reporter"（源码第 219-222 行注释原话），只能解析表格文本（ADR-007 与《07-模块详解》§1.5 有展开）；二是 stdout 1MB 截断导致极端场景下真正报错的尾部可能丢失（《08》§6 问题 7）。

## ADR-005：每请求自足临时目录 + finally 删除，而非共享沙箱或进程池

**背景**：加固前采用共享固定沙箱目录（历史遗留 `.vitest-sandbox/` 可见其形态），并发请求会互踩文件、失败运行留下残骸。同时存在一个更宏观的选择：要不要用常驻进程池来摊薄 vitest 冷启动开销。

**备选**：其一，共享固定目录 + 文件名按请求前缀隔离——仍然有清理时机、部分失败残留、并发可见性三类问题；其二，常驻 worker 进程池（预热 vitest、复用进程）——吞吐最优，但跨请求共享状态，与"单次调用自足"的模型根本冲突；其三，内存盘（tmpfs）挂沙箱——部署环境（NAS Docker）不保证可用。

**决策**：每次运行在 `.vitest-runs/run-<mkdtemp 随机>/` 创建独立目录，写入配置与课时文件，spawn 以该目录为 cwd 的子进程，结束后 `finally fs.promises.rm(runDir, { recursive: true, force: true })` 整目录删除。目录必须位于项目根之下，使 vitest 能向上解析到项目的 `node_modules`。

**源码证据**：`vitestServerRunner.ts` 第 20-21 行注释"必须在项目根之下，vitest 才能向上解析到 node_modules"与 `RUNS_ROOT` 定义；第 90-93 行 `makeRunDir`（mkdir + mkdtemp）；第 304-313 行 try/finally 结构；`tests/runner-security.test.ts` 死循环用例断言 `readdirSync(RUNS_ROOT)` 为空（零残留不变量）；`docs/deploy/runbook.md` 把 `du -sh .vitest-runs` 接近 0 列为巡检项。旧目录 `.vitest-sandbox/` 的存在本身就是被放弃路线的化石（《00-项目总览》§8、《13》问题 3）。

**后果**：正面是并发请求互不可见（无竞态、无文件互踩）、生命周期归属严格（任何路径退出——包括超时 SIGKILL 之后——目录都被回收）、集成测试可以拿"RUNS_ROOT 为空"当断言。代价是每次请求都付冷启动成本（目录创建 + vitest 启动，数百毫秒到数秒），并且放弃了进程池的吞吐红利；《01-系统架构》§3.4 对此有明确的价值判断：在 60s 超时、2 并发的教学负载下，用可预测性换吞吐是划算的。若未来做"跨请求复用"类优化，必须重新推导《05-核心流程》跨流程不变量第 1 条。

## ADR-006：判题器服务端装配（防篡改契约：请求只许三字段）

**背景**：TDD 课时的"自动批改"意味着服务端要持有标准答案的测试（grader/hiddenGrader）。若这些内容经客户端之手提交（如旧契约上传完整文件表），隐藏测试会被窃取、批改会被绕过——`2026-09-27-runner-hardening.md` 全局约束节记载的加固前契约正是 `{ files, jsdom, coverage, benchmark }`。

**备选**：其一，保持客户端上传文件表，隐藏测试加密下发（对称密钥在前端 = 没有秘密）；其二，请求三字段寻址 + 服务端装配（最终方案）；其三，引入用户体系 + 服务端会话，按用户下发题目——超出了"无认证个人学习工具"的定位。

**决策**：请求契约收窄为 `{ chapterKey, lessonKey, code }` 三个字符串字段；`grader`、`hiddenGrader`、`extraFiles`、运行环境（node/jsdom）、coverage/benchmark 开关全部由服务端按 `data.ts` 的课时数据推导。旧 `files` 形态的请求被 400 拒绝而非静默转换。

**源码证据**：`vitestServerRunner.ts` 第 49-53 行 `RunBody` 接口（三个 unknown 字段）、第 72-88 行 `buildLessonFiles`（文件头注释第一行即"服务端装配沙箱文件（防篡改）"）、第 437-485 行 `handleRunVitest` 的字段校验；`src/pages/vitest-learn/data.ts` 第 13-16 行 `grader`/`hiddenGrader` 字段注释（"M4：额外隐藏校验（不展示给用户，用于防作弊 / 强化验证）"）；`tests/runner-security.test.ts` 的「旧 files 形态请求被 400 拒绝」用例；`src/pages/vitest-learn/runner.ts` 第 4-8 行注释（"grader / hiddenGrader / extraFiles / 运行环境 / coverage / benchmark 均由服务端决定，客户端只提交课时 key 与当前代码（防篡改）"）。

**后果**：这是全项目"最具架构性的一层防线"（《08-安全与权限设计》§3-L2 的定性）：攻击者无法指定"把我的代码写到哪个文件""以什么环境跑""要不要关掉隐藏测试"。代价是契约一旦收窄就难以再放宽（旧契约只能 400），且服务端与前端必须共享同一份课程数据（催生了 ADR-010）；隐藏测试的失败事实仍会出现在 output/tests 中（设计上可接受，见《05》不变量 4）。判题器体系的三角色协作详见《07-模块详解》§4。

## ADR-007：四种课时形态由 Lesson 字段组合推导，无显式模式字段

**背景**：课程需要四种可感知形态——普通 playground、TDD 批改、jsdom（React 组件）、bench（性能基准）。若给每个课时加一个 `mode: 'normal' | 'tdd' | 'jsdom' | 'bench'` 枚举字段，形态间会互斥，无法表达"jsdom 叠加在 TDD 之上"这类组合。

**备选**：显式 mode 枚举（组合爆炸：四种形态两两组合就要处理"哪几个可叠加"的规则）；或为每种形态建独立的数据类型/文件（破坏"新增课时只编辑 data.ts"的单文件惯例）。

**决策**：不加模式字段，形态完全由可选字段的存在性推导：有 `grader` 即 TDD；`environment === 'jsdom'` 即切换环境与扩展名；`benchmark: true` 即 bench 运行。三者可正交叠加（jsdom 课时全部同时是 TDD 课时）。运行选项同样一行推导：`resolveRunOptions` 返回 `{ coverage: !lesson.benchmark, benchmark: !!lesson.benchmark }`。

**源码证据**：`src/pages/vitest-learn/data.ts` 第 6-25 行 `Lesson` 接口——`grader`（M4 注释"设置后该课时进入 TDD 模式"）、`environment`（M6）、`benchmark`（"以基准模式运行（vitest bench）"）都是普通可选字段，没有 mode 字段；`vitestServerRunner.ts` 第 61-63 行 `resolveRunOptions`、第 72-88 行 `buildLessonFiles`（`isJsdom`/`grader?.trim()` 分支）；前端镜像推导 `src/pages/vitest-learn/chapter.tsx` 第 63-69 行（`isTDD = !!currentLesson?.grader`、`isJsdom`、`editorFileName` 的三元推导）；《04-数据模型》§1.2 的模式矩阵表。

**后果**：正面是新增形态只需"加一个可选字段 + 两处分派"（服务端装配与前端徽章），56 个存量课时零迁移（可选字段保证向后兼容），M4/M5/M6 注释前缀记录了历史上三轮这样扩展的痕迹。代价是形态语义分散在推导逻辑里而非数据声明里——接手者必须读 `buildLessonFiles` 才能知道字段组合意味着什么，且"纯空白 grader 视为不存在"这类推导细节需要测试锁定（`tests/runner-security.test.ts` 有专门用例）。四种形态的完整定义见《00-项目总览》§2.1。

## ADR-008：Monaco 本地打包 + 语言裁剪，而非 CDN loader

**背景**：`@monaco-editor/react` 默认经 CDN loader 加载 monaco-editor，页面对第三方 CDN 有运行时依赖；且 monaco 全量打包体积巨大，而本项目只需要 TypeScript/JavaScript 编辑能力。

**备选**：保持 CDN loader（零配置但离线不可用、CDN 可用性成为单点）；全量打包 monaco（体积失控）；换成 CodeMirror 6（更轻，但失去 VS Code 同源的补全/诊断质量，markers 波浪线交互也要重新实现）。

**决策**：monaco-editor 本地打包进产物，且只引入"编辑器内核 + TypeScript 语言贡献"两个模块；`MonacoEnvironment.getWorker` 手工路由 tsWorker/editorWorker；通过 `loader.config({ monaco })` 让 `@monaco-editor/react` 使用本地实例；编译期把手写的 vitest 全局类型声明 `addExtraLib` 进 TS 与 JS 两个语言服务；构建侧用 `manualChunks` 把 monaco 拆成独立 chunk。

**源码证据**：`src/pages/vitest-learn/monacoSetup.ts` 全文（第 2-5 行注释"仅 TS/JS，按需裁剪其余语言以大幅减小产物体积"、第 14-19 行 worker 路由、第 38 行 `loader.config({ monaco })`、第 55-63 行 addExtraLib）；`vite.config.ts` 第 29-33 行 `manualChunks: { monaco: ['monaco-editor', '@monaco-editor/react'], ... }`；`src/pages/vitest-learn/vitestGlobalsDts.ts` 文件头注释（类型"只用于编辑器诊断……真正的运行结果以服务端 vitest 为准"）。

**后果**：正面是完全离线可用（与 ADR-002 的本地化方向一致）、编辑器诊断不依赖网络、`chunkSizeWarningLimit: 2500` 配合 manualChunks 控制了首屏加载（《10-性能设计与优化》§5 有体积分析）。代价是 monaco 升级时 worker 路由与 ESM 深路径导入（`monaco-editor/esm/vs/...`）可能随版本变动而破坏——这是 monaco 未钉精确版本（^0.52.2）下的一个升级风险点（详见《17-依赖全景》）；`unhandledrejection` 监听吞 TS worker 已知 race condition 属于跟随此决策的务实补丁（monacoSetup.ts 第 21-36 行）。

## ADR-009：无后端状态——进度/主题全部 localStorage，不建账号与数据库

**背景**：学习闭环需要记住"学到哪、哪些通过、代码写到哪"，以及明暗主题偏好。最省事的方案是接一个数据库 + 用户登录；最激进的方案是什么都不存。

**备选**：SQLite/JSON 文件 + 服务端会话（引入持久化与认证两个新问题）；IndexedDB（浏览器侧但 API 复杂，对几 KB 的 JSON 是杀鸡用牛刀）；云端同步（明显超出定位）。

**决策**：全部状态存浏览器 localStorage：进度在 `vitest-playground-progress-v1`（整张 ProgressMap 一个 key，每次击键全量写回），主题在 `vitest-playground-theme`。服务端零持久化——唯一的"服务端记忆"是沙箱目录在单次请求内的瞬时存在。

**源码证据**：`src/pages/vitest-learn/progress.ts` 第 6 行 `const KEY = 'vitest-playground-progress-v1'` 与第 26-28 行 `saveProgress`（无 try/catch 的全量写，隐患见《08》§6）；`src/pages/vitest-learn/theme.tsx`（主题 key 与 `document.documentElement.dataset.theme` 同步）；《04-数据模型》§3/§11 的存储清单与容量分析。反证：全仓没有任何数据库依赖，`handleRunVitest` 不写任何运行期持久状态。

**后果**：正面是无认证、无迁移、无隐私数据出浏览器（教学场景合规压力小）、部署面保持纯净；刷新不丢代码的体验靠"每次击键写 code 进度"实现。代价是进度绑定浏览器（换设备/清存储即丢，`clearProgress` 与导出功能是仅有的管理手段）、多人/跨设备学习场景不可用、localStorage 配额溢出无兜底（《13》问题 11）；写入粒度到击键也是性能上被讨论过的全量写策略（《10-性能设计与优化》§6）。

## ADR-010：课程数据单文件 data.ts，前后端共享同一对象

**背景**：课程内容（16 章 56 课时，约 4900 行）需要一个家。服务端装配（ADR-006）要求服务端能按课时 key 查到 grader/hiddenGrader；前端渲染要求同样的数据。两处数据若分开维护，防篡改契约就建立在"两份数据一致"这个脆弱假设上。

**备选**：课程数据放独立 JSON 由两端读取（构建期同步，但失去类型检查与注释能力）；每课时一个文件/目录（README 的章节链接暗示曾经按目录组织过课程，后被证明维护成本高，见《00》§8 的 README 漂移问题与《13》问题 1）；数据库（与 ADR-009 冲突）。

**决策**：全部课程内容集中在 `src/pages/vitest-learn/data.ts` 一个 TS 文件，导出 `chapters: Chapter[]`；服务端运行器直接 `import { chapters } from './src/pages/vitest-learn/data'`，前端页面 import 同一对象。类型 `Lesson/Chapter` 也定义在该文件顶部（Quiz 等基础类型在 types.ts）。

**源码证据**：`vitestServerRunner.ts` 第 16 行 `import { chapters, type Lesson } from './src/pages/vitest-learn/data'`；`data.ts` 第 38 行 `export const chapters: Chapter[]`；`tests/lessons.test.ts`（key 唯一性等数据完整性约束）；`scripts/check-lessons.ts` 以同一份数据做逐课时质检——三处消费同一事实来源。

**后果**：正面是"课程数据即代码"：类型检查覆盖课程内容、`pnpm check:lessons` 能在 CI 里逐课时实测 solution 必须通过、新增课时不需要触碰任何协议（《04-数据模型》§10 的扩展示例证明了这一点）；防篡改装配因此有了单一可信源。代价是单文件 4900 行的编辑体验（git 冲突概率高、代码评审粒度粗）、模板字符串嵌套转义对工具链的要求（`check-lessons.ts` 为此要先 bundle 成 mjs 再 import，见《05-核心流程》流程六）；README 按目录组织课程的旧写法成为持续漂移源（已立项）。

## ADR-011：并发控制 = 模块级信号量 2/8 + 反代限流的双层防线

**背景**：公网部署（NAS Docker → frpc → VPS nginx）后，`/api/run-vitest` 是任何人可调的 CPU 消耗端点。需要决定并发模型：每用户限流？全局限流？还是不限制？

**备选**：每 IP/每用户配额（应用无会话、无认证，识别用户本身就是难题）；只靠 nginx 限流（应用层裸奔，局域网直连场景无保护）；无限制（一台机器 60s × N 并发即可被拖垮）。

**决策**：应用内建模块级计数信号量：全局同时跑 2 个、排队 8 个，队满抛 `RUNNER_BUSY` 由 HTTP 层转 429；反代层 nginx 按 IP 限流 10r/m + burst 3。两层各自独立生效、各自 429。信号量实现采用"所有权转移"语义：release 时若队列有等待者，槽位直接移交、active 不减，消除微任务间隙的超订窗口。

**源码证据**：`vitestServerRunner.ts` 第 316-318 行注释"并发上限与排队上限：公网止血核心参数，宁可拒绝不可拖垮宿主机"；第 320-342 行 `createRunLimiter`（第 331 行注释"唤醒即已持有槽位（release 所有权转移），此处不得再 active++"）；第 344 行 `const limiter = createRunLimiter(MAX_CONCURRENT_RUNS, MAX_QUEUE)`（模块级单例）；`docs/deploy/runbook.md` 的 nginx `limit_req_zone ... rate=10r/m` 配置；《03-接口设计》§8 的超时预算推导（proxy_read_timeout 600s > 排队 worst case）。

**后果**：正面是资源总量有硬上界（最坏 2 核 × 60s 的 CPU 消耗窗口），"廉价检查在前、昂贵执行在后"的快速失败链保证槽位不被无效请求占用；所有权转移语义有专门时序测试锁定。代价是全局闸门意味着公网多用户共享 2 个槽位——一个用户连发即可占满（《08》§6 问题 3），可用性与公平性都没有按用户切分；参数三处联动（常量/nginx/测试）的维护成本在《03》§8 被明确警示。

## ADR-012：COEP/COOP 响应头在 WebContainer 移除后保留

**背景**：WebContainer 时代页面必须处于跨域隔离状态（需要 SharedArrayBuffer），因此 dev/preview 服务器都配置了 `Cross-Origin-Embedder-Policy: require-corp` 与 `Cross-Origin-Opener-Policy: same-origin`。迁移到服务端执行后，这两个头不再是运行测试的必要条件。

**备选**：删除（减少一层可能干扰第三方资源加载的头）；保留（维持既有行为，等待确认无副作用后再议）。

**决策**：保留两个头。`README.md` 说明保留用于 Monaco Worker 的同源加载与行为一致性，并非运行 Vitest 所必需。

**源码证据**：`vite.config.ts` 第 43-57 行 server 与 preview 两处 `headers` 配置（第 45 行注释仍写着"WebContainer 需要页面处于跨域隔离状态（SharedArrayBuffer）"的历史动机）；`docs/deploy/runbook.md` nginx 配置注释"COEP/COOP 由 vite preview 响应头携带，透传即可，勿在此重复 add_header"；《01-系统架构》§4 决策表对此的条目。

**后果**：正面是 Monaco Worker 保持同源加载路径、浏览器侧行为与迁移前一致，也顺带把页面置于跨域隔离态（若未来引入 SharedArrayBuffer 类能力是免费红利）。代价是任何第三方跨域子资源（广告脚本、外链图片等）在 require-corp 下会被阻止加载——对本项目无实际影响（资源全部同源），但接手者要知道这个头不是摆设，nginx 层"只透传不重复 add_header"的约定必须遵守（《03-接口设计》§8 第 3 条）。

## 决策间的相互关系与复盘

十二条决策不是孤立的，梳理三条主线有助于把它们串成一张网。**第一条是"本地化"主线**：ADR-002（弃 WebContainer）→ ADR-008（Monaco 本地打包）→ ADR-001（绑定 Vite 中间件）共同指向"离线可跑、无第三方运行时依赖"的目标，COEP/COOP 的保留（ADR-012）是这条线上的历史锚点。**第二条是"受限执行"主线**：ADR-002 把执行点从浏览器搬回服务器后，ADR-003/004/005/011 四条防线（沙箱、结果文件、独立目录、并发闸门）+ ADR-006（装配权收归服务端）构成了纵深防御，它们的边界与残余风险在《08-安全与权限设计》被系统盘点，容器化（有方案无实现）是这条线唯一悬而未决的大项。**第三条是"数据即代码"主线**：ADR-010（单文件课程数据）支撑了 ADR-006（服务端装配）与 ADR-007（字段推导形态），并让 `pnpm check:lessons` 这类"课程级端到端门禁"成为可能。

复盘视角下有两条经验值得记取。其一，**迁移决策的残迹要有意识清理**：`isReady` 恒真垫片、WebContainer 时代文案、`.vitest-sandbox/` 遗留目录、README 死链，都是 ADR-002 迁移没有清扫干净的尾巴，最后都进了技术债务清单（《13》问题 1/2/3/6/7）——大决策落地时同步列"清理子任务"是本项目管理上应吸取的教训。其二，**每个"暂不做"都要留档**：容器化与防刷通关在 runner-hardening 方案的"Spec 之外明确不做（后续 backlog）"清单里有明确记载，使后来的文档考古能准确区分"没想过"与"想过但没做"——这是 `docs/superpowers/plans/` 存档方式的最大价值。任何未来决策的记录，建议沿用本篇的五段式与本套文档的引用约定，避免考古成本随时间累积。
