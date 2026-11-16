---
title: "16 决策记录 ADR"
description: "项目：webCommand ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析"
category: 项目文档

---
# 16 决策记录 ADR

> 项目：webCommand ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析

## 1. 本篇的定位与方法

本篇是 webCommand 的"决策考古"：把散落在源码注释、README「已知限制」、部署脚本与既有 16 篇文档里的关键架构决策，按 ADR（Architecture Decision Record）格式逐条重演——每条回答五个问题：**当时面对什么问题（背景）、考虑过哪些走法（备选）、最终怎么走（决策）、凭什么这么断言（源码证据）、走完之后代价与收益各是什么（后果）**。与前 16 篇的分工是：《01-系统架构》回答"系统现在长什么样"，本篇回答"它为什么长这样、为什么不长成别的样"；《13-技术债务与演进建议》登记的是"决策之后暴露的欠账"，本篇只登记"决策本身"——但每条 ADR 的"后果"一节会显式链接到对应的 ⚠️ 编号，让"当初的合理"与"今天的代价"在同一段文字里对得上账。

证据口径与《13》一致：所有决策都必须能在源码里找到**可直接 grep 的字符串**（注释原文、常量名、代码结构），找到的引原文，找不到的标 `⚠️ 待确认`。12 条 ADR 的编号按"影响面从大到小"排列：001-004 是工程形态级（整个仓库因此长成这个样子），005-008 是数据与协议级（前后端契约因此定型），009-012 是运行与质量级（单实例、迁移、测试、探活）。这 12 条不是并列关系，而是层层支撑：002（SPA）依赖 001（合并单体）才成立，005（blob 写前合并）依赖 008（极简 schema）才有意义，010（自研迁移器）是 008 的直接后果。读懂一条之前，先看它站在哪些决策之上。

````mermaid
graph TD
    subgraph 工程形态级
        A1["ADR-001<br/>前后端合并单体"] --> A2["ADR-002<br/>SPA 而非 SSR"]
        A1 --> A4["ADR-004<br/>运行期配置注入"]
        A2 -- "Nitro 后端依然完整可用" --> A1
    end
    subgraph 数据与协议级
        A8["ADR-008<br/>三表极简 schema"] --> A5["ADR-005<br/>blob 写前合并"]
        A5 --> A6["ADR-006<br/>墓碑删除协议"]
        A7["ADR-007<br/>localStorage 八键"] --> A5
        A3["ADR-003<br/>无状态 cookie 会话"] --> A5
    end
    subgraph 运行与质量级
        A9["ADR-009<br/>单实例假设"]
        A8 --> A10["ADR-010<br/>自研迁移器"]
        A10 --> A12["ADR-012<br/>探活查真表"]
        A11["ADR-011<br/>双轨测试"] -. "钉住 005/006/008 的契约" .-> A5
    end
````

## 2. ADR-001：前后端合并单体——Nuxt 4 一个工程同时装下 SPA 与 Nitro API

**背景**。项目的上一代形态是"两个工程"：旧前端（Vue 3 独立工程，其残留目录 `web/` 直至今日还在仓库里，见《13》⚠️-9）加一个独立的后端服务（登录态"对齐原 express-session 的 cookie maxAge"这条注释留在了 `nuxt.config.ts` 第 168 行，说明旧后端是 Express 系）。两个工程意味着两份依赖清单、两次构建、两套部署、两份类型定义，以及最麻烦的——跨工程的接口契约没有任何编译期或测试期手段可以钉住。移植自 YuIndex 的命令层代码全是浏览器端实现，而后端只需要承担账号、云数据与代理三类职责，体量根本撑不起一个独立工程。

**备选**。其一，维持前后端分离，前端继续 Vue 工程或迁 Vite SPA，后端独立 Express/Nest；代价是契约靠人肉同步，且《03》《04》里的三类共享契约（响应包络、白名单、口令下限）将无锚点。其二，pnpm workspace 式 monorepo（packages/client + packages/server），工程边界清晰但仍要两次构建产物编排。其三，Nuxt 4 单工程：`app/` 与 `server/` 同仓，`nuxt build` 一次产出 `.output`，Nitro 同时服务静态资源与 `/api`。

**决策**。采用其三。`package.json` 的 `name` 改为 `webcommand-nuxt`、`description` 写明"前后端合并工程（Nuxt 4 SPA + Nitro API）"；`nuxt.config.ts` 的 `modules` 只挂 `@pinia/nuxt`、`nuxt-auth-utils`、`@nuxt/eslint` 三个模块，`server/` 目录按 Nitro 约定自动成为 API 层。仓库里虽有 `pnpm-workspace.yaml`，但内容只有 `allowBuilds` 依赖构建白名单，并不是 workspace 定义——单工程立场是彻底的。

**源码证据**。`nuxt.config.ts` 第 16 行注释原文："SPA 模式下 Nitro 后端（server/api）依然完整可用"；`package.json` scripts 里 `build` 只有 `nuxt build` 一步，`preview` 直接 `node .output/server/index.mjs`；`Dockerfile` 只 COPY 一份 `.output`。契约共享的三个锚点全部在同一个仓库内：`app/utils/myAxios.ts` 的 `ApiResult` 注释"对齐 server/utils/response.ts 的 ok/fail"；`app/composables/cloudSyncRegistry.ts` 与 `server/utils/dataAccess.ts` 各有一份 `CLOUD_DATA_TYPES` 且由 `test/cloudDataType.spec.ts` 静态比对；`app/core/commands/user/userConstant.ts` 与 `server/utils/accountPolicy.ts` 各有一份 `MIN_PASSWORD_LENGTH = 8` 且由 `test/accountPolicy.spec.ts` 比对。

**后果**。收益：一次构建一个进程，部署面缩到"一个容器 + 一个共享 MySQL"（《06》§5）；三类跨端契约获得同仓测试锚点；`runtimeConfig` 一份配置同时服务两端（《14》§1 的"两条总线"）。代价：前端类型与后端类型共享一个 tsconfig，`verbatimModuleSyntax` 必须为全局关掉（`nuxt.config.ts` 第 200-208 行注释解释了这是为兼容全局 namespace 写法而覆盖的）；`app/` 与 `server/` 的隔离只剩目录约定，没有任何机制阻止有人从 `server/` import `app/` 里的代码——这条纪律目前只靠 code review 守着（⚠️ 属于结构性风险，暂未列入《13》债务表，`⚠️ 待确认` 未来是否加 lint 规则）。

## 3. ADR-002：SPA 渲染（ssr:false）而非 SSR

**背景**。Nuxt 的默认价值主张是 SSR/SSG 带来的首屏与 SEO。但 webCommand 的页面是全屏终端，数据来源是 localStorage 与登录态会话，唯一页面 `app/pages/index.vue` 没有任何"公开可抓取的动态内容"。

**备选**。SSR：得到服务端渲染的首帧与更完整的 SEO，但要为 `localStorage` 不存在于服务端付出两块真实成本——水合不一致（服务端渲染的初始 HTML 与客户端首次挂载结果必然不同）与 ant-design-vue 4 的 css-in-js 样式在服务端/客户端的注入时序对齐；SSG（`nuxt generate`）：对单页应用生成静态外壳，但同样绕不开水合问题且对本项目无增量价值。

**决策**。`ssr: false`。SEO 需求用"静态化一切能静态化的"来满足：`app/spa-loading-template.html` 静态外壳里用 `<noscript>` 承载对爬虫与无 JS 环境的兜底文案；`app.head` 里写死 meta、Open Graph、Twitter Card 与三段 JSON-LD（WebSite / SoftwareApplication / FAQPage）。README「已知限制」实测确认这些静态标签确实出现在产物 HTML 外壳里——即"可被搜索到的部分"已完全静态化，SSR 没有增量收益。

**源码证据**。`nuxt.config.ts` 第 14-17 行注释原文："本项目为终端型个人应用：数据来自 localStorage / 登录态，无公开内容可收录，采用 SPA 渲染（ssr:false）规避 localStorage / antd css-in-js 的水合成本"；同文件 `app.head` 的 meta 数组与 script 数组里的三段 `application/ld+json`；`app/spa-loading-template.html` 文件本身。

**后果**。收益：前端首屏从纯静态外壳起步（还配了 `app.vue` 级的 loading 模板），无水合告警，antd 样式只在客户端注入；`onMounted` 里直接读 localStorage、发请求，代码无需 `import.meta.client` 分支（`app/pages/index.vue` 全文无一处环境判断）。代价：所有 SEO 压在静态外壳与 head 标签上，页面本体对无 JS 环境不可见；`nuxt generate` 脚本保留但对单页意义存疑（《13》⚠️-22）。这条决策与 ADR-001 互为前提——正因为合并单体，`ssr:false` 关掉的只是"服务端渲染 Vue 组件"，Nitro 的 HTTP 能力原封不动。

## 4. ADR-003：会话采用 nuxt-auth-utils 的无状态加密 cookie

**背景**。账号体系需要服务端会话。旧形态用 express-session（内存式服务端会话）；单机部署下还有 JWT、自研 session 表、Redis session 等走法。

**备选**。JWT（无状态但需要自管签发/刷新/注销黑名单，且默认放 header 会引入跨域 token 存储问题）；session 表（服务端有状态，每次请求多一条查询，且把"会话"耦合进 MySQL）；Redis session（引入有状态依赖，违反 ADR-009 的极简取向）；nuxt-auth-utils 加密 cookie（会话数据 AES 加密进 cookie，服务端零存储）。

**决策**。nuxt-auth-utils。`nuxt.config.ts` modules 注册后，`setUserSession/getUserSession/clearUserSession` 成为 Nitro 全局函数，路由层零 import 直接用（见 `server/api/user/login.post.ts`、`logout.post.ts`、`current.post.ts` 全文无 auth 相关 import）；`runtimeConfig.session.maxAge` 覆盖为 30 天（注释写明"对齐原 express-session 的 cookie maxAge"）；`NUXT_SESSION_PASSWORD` 是唯一新增的密钥配置，由 `server/plugins/check-env.ts` 在生产启动时硬校验长度 ≥32。

**源码证据**。`auth.d.ts` 的 `declare module '#auth-utils'` 扩展（`User: { id, username, email? }`，注释写明 session.user 保存的是脱敏后的 SafeUser、以类型扩展"替代既有的 as any"）；`server/api/user/login.post.ts` 的 `setUserSession(event, { user: safeUser }, rememberFlag ? { maxAge: SESSION_30D } : {})`；`check-env.ts` 注释原文："会话密钥若短于 32 位，nuxt-auth-utils 会在每个用到 session 的请求里抛 500……所以必须在启动时就拦下"。

**后果**。收益：服务端完全无会话状态——这是《13》§3 阶段 1（多副本扩容）里唯一"天然多实例友好"的部分，"密钥一致任意副本可验"是当初选型的回报；会话即脱敏用户对象，`current` 接口直接从会话兜底（《03》§3）。代价：会话无法服务端主动吊销——改密/注销后旧 cookie 在 30 天内仍可解出用户（`verifyCredentials` 只在登录时校验状态，`current` 只查库确认存在）；cookie 容量上限约束了会话内容只能存 id/username/email 三个字段。安全细节展开见《08-安全与权限设计》§2，此处不重复。

## 5. ADR-004：私有配置只在运行期注入，自建 setting() 解析层

**背景**。合并单体的一个隐蔽陷阱：Nuxt 的 `runtimeConfig` 若在**构建期**读 `process.env.X` 填默认值，`nuxt build` 会把值烘进 `.output`——产物本身就是带内网地址与明文口令的对象。此外 Nitro 只把 `NUXT_*` 前缀的环境变量映射进 runtimeConfig，而容器习惯写的是裸名 `DB_HOST`，裸名在运行期根本不生效，服务实际用的是构建期内联的那份。

**备选**。其一，全部用 `NUXT_*` 前缀并接受 Nitro 原生映射——要求所有部署环境改写法，改 compose 的顺序仍可能把线上改崩；其二，构建期注入 + 部署时扫描产物（治标）；其三，自建运行期解析层：`setting(configured, ...envKeys)` 依次尝试 `NUXT_*` 前缀、裸名、构建期默认值。

**决策**。其三，外加"产物零凭证"纪律。`nuxt.config.ts` 的 runtimeConfig 只保留非敏感开发默认值（`dbHost: 'localhost'`、`dbPassword: ''` 等），注释明令"不要在构建期读 process.env"；`server/utils/appConfig.ts` 实现两级解析（`NUXT_DB_*` > 裸名 `DB_*` > 构建期默认值）并刻意不 import 其它模块以便零依赖单测；`scripts/deploy.sh` 的 `scan_artifact` 每次构建后 grep `.output` 是否含 `.env` 里的口令与会话密钥，命中即拒绝部署。

**源码证据**。`appConfig.ts` 头注释原文记录了两次实测后果："改 compose 里的口令再重启也不会生效（产物里那份才是生效的）"与"`TRUST_PROXY` 失效 → 所有限流都按 frp/nginx 的内层 IP 计数，所有访客共用同一个桶"；`rateLimit.ts` 的 `getClientIp` 注释"走 boolSetting 而非直接读 cfg.trustProxy：容器里的 TRUST_PROXY 不会映射进 runtimeConfig"；`docker-compose.example.yml` 环境变量全部为 `NUXT_*` 写法。

**后果**。收益：改口令只需重启容器；产物可安全传递给 NAS/镜像仓库；配置解析层可单测（`test/serverConfig.spec.ts`）。代价：每个配置项都要在六个登记点登记（《14》§3.3 的清单）；`docker-compose.example.yml` 注释仍写着"`server/utils/setting.ts` 兼容读取"而该文件已并入 appConfig.ts——注释漂移已被《13》⚠️-18 登记。这条决策是"用真实事故换来的纪律"的典型样本。

## 6. ADR-005：云同步采用"整包 blob + 客户端写前合并"，服务端不理解数据结构

**背景**。多设备同步六类数据（todo/space/note/custom/terminalConfig/theme）。常规走法是服务端按条目建表（todo 表、note 表……），服务端理解结构、可做服务端合并；但那意味着每新增一类数据都要动库、动模型、动接口。

**备选**。服务端结构化存储 + 服务端合并（正确性强，代价是 schema 与业务耦合，违背 ADR-008 的极简取向）；CRDT 库（如 Yjs，最终一致且无冲突，但引入重依赖且对"单用户多设备"这种低冲突场景是杀鸡用牛刀）；整包 blob + 客户端合并（服务端只见 `(userId, type, content)` 三元组）。

**决策**。其三。服务端 `user_data` 表以 `(userId, type)` 唯一，`content` 为 MEDIUMTEXT JSON blob；接口只有读（`/api/data?type=`）与写（`/api/data/sync` upsert）两条 SQL 路径；服务端仅校验白名单与字节数（`server/utils/dataAccess.ts`），不理解内部结构。冲突解决全部在浏览器：`app/composables/useCloudSync.ts` 工厂规定**每次上传前先拉云端、合并、再上传合并结果**（写前合并），并用 `applyingRemote` 标志切断"合并 → $subscribe → 再上传"的回环。

**源码证据**。`useCloudSync.ts` 的 `flush()` 原文：先 `fetchCloudRaw()`、命中则 `applyCloud()`，然后 `if (content === cloudRaw) return`（注释："云端已是最新：跳过上传，同时切断「合并 -> 订阅 -> 再同步」的回环"）；`cloudSyncRegistry.ts` 头注释点名不注册的后果："新增一个 store 忘了在某处 init——那会导致云端数据从不拉取，且下一次本地改动把云端整包覆盖掉"；`test/cloudMerge.spec.ts` 与 `test/cloudDataType.spec.ts` 两个契约测试。

**后果**。收益：服务端新增一类同步数据零改动（SOP-3 只需前端三步，见《11》）；两条 SQL 路径让 dataAccess 纯函数可以脱离数据库测试（《08》§7）。代价：合并算法的正确性责任全部压到前端——这正是 ADR-006（墓碑协议）与 ADR-011（双轨测试）存在的理由；blob 无版本号，跨版本结构兼容靠各 store 的 `parseCloud` 兜底（`todoStore.ts` 的 `parseCloud` 显式兼容旧版裸数组格式）。合并算法逐行走读见《18-代码走读实录》第三节，blob 内部结构见《04-数据模型》§6。

## 7. ADR-006：删除采用墓碑协议，30 天保留窗口

**背景**。写前合并有一个致命边角：设备 A 删除一条待办后，设备 B 的云端整包里那条还在；若 A 上传自己的"删除后列表"做整包覆盖没问题，但写前合并是取"云端 ∪ 本地"——**不做特殊标记时，被删条目会从 B 端被合并回来**，删除操作等于失效。反过来，没有保留窗口的墓碑又会无限增长。

**备选**。软删字段（条目加 `deleted: boolean`，数据永远不物理删，列表查询过滤——存储随时间单调膨胀）；服务端删除日志表（又把合并逻辑拉回服务端，违背 ADR-005）；墓碑 + 保留窗口（删除记录存 `id -> 删除时刻`，合并时抑制复活，超窗清理）。

**决策**。墓碑 + 30 天窗口。`app/composables/cloudMerge.ts` 定义 `TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000`；删除动作在 store 层记墓碑（`todoStore.deleteTaskById` 里 `this.deleted[id] = Date.now()`），合并原语 `mergeKeyed` 先合并双方墓碑（同 key 取更晚删除时间）、再剪枝超窗墓碑、最后"删除时间不早于条目修改时间"的条目不进入结果；配套 `clearDeleted` 处理"删掉后又重建/从备份恢复"的复活场景（`importBackup` 里逐条 `clearDeleted`）。

**源码证据**。`cloudMerge.ts` 头注释原文："不做逐条比较时，后上传的那一端会把另一端的新增条目和已删除条目的墓碑一起冲掉"；`mergeKeyed` 的关键判断 `if (deletedAt !== undefined && (item.updateTime ?? 0) <= deletedAt) continue` 及其行注释"条目改得更晚则视为「删掉后又重建」"；`todoStore.ts` 注释"导入即恢复：改到最新时间并清掉墓碑，避免被历史删除记录再次消掉"。

**后果**。收益：删除语义跨设备成立且可测试；墓碑表就是一份 30 天的"软删缓冲"，误删在窗口内理论上可从墓碑反查（当前未提供该能力，`⚠️ 待确认` 是否值得做）。代价：**墓碑是承诺不是保证**——超过 30 天窗口后，另一端若还留着旧副本，同名条目仍可被合并回来（`TOMBSTONE_RETENTION_MS` 行注释承认了这一点）；`updateTime` 依赖客户端时钟，钟差会造成 LWW 误判，这是 blob 模型接受的已知边界（《04》§6.3）。合并判定矩阵的完整推演见《05-核心流程》§4。

## 8. ADR-007：本地持久化收敛为 localStorage 八键结构

**背景**。终端的可用性建立在"刷新不丢"上：命令历史、输出快照、六类业务数据、登录态展示值都要活过页面刷新。备选有 IndexedDB（容量大但异步、API 繁琐）、Opfs/SQLite WASM（过重）、localStorage（同步、5MB 上限、字符串存取）。

**决策**。localStorage，且键名收敛为固定的八个：六个 Pinia store 的持久化键 `todo-store`、`space-store`、`note-store`、`custom-command-store`、`terminal-config-store`、`terminal-theme`（各 store 的 `persist.key` 配置，统一走 `app/plugins/pinia-persistedstate.client.ts` 注册的插件），加两个 Terminal.vue 手工维护的键 `terminal-command-history`（上限 100 条，`MAX_HISTORY_SIZE`）与 `terminal-output-snapshot`。登录态不在其中——`userStore` 不配置 persist，会话的真相在加密 cookie，store 里的 `loginUser` 只是展示态（`getAndSetLoginUser` 启动时向 `/api/user/current` 对账）。

**源码证据**。六个 store 的 `persist: { key: ..., storage: window.localStorage }`；`Terminal.vue` 第 127-129 行两个 key 常量与第 131 行 `MAX_HISTORY_SIZE = 100`；持久化插件的防重复注册注释（通过 `_isPersistedstate` 标记避免 HMR 下重复 `pinia.use`）；`todoStore` 注释解释为什么任务列表初始为空："原先内置的两条演示任务会随同步写进云端，每台新设备都留两条垃圾"。

**后果**。收益：刷新恢复链路（历史 + 快照）完全客户端自治，零网络依赖；八键清单让"换设备丢什么/不丢什么"可被精确回答（《04》§7 的对照表）；`outputSnapshot.ts` 的清洗逻辑（组件输出换占位文本、密码脱敏）抽成纯函数后可单测。代价：localStorage 的 5MB 配额成为输出快照的隐形上限（`persistSnapshot` 用 try/catch 兜底但只打日志）；八键与 `CLOUD_DATA_TYPES` 六类之间存在"本地多于云端"的不对称（历史与快照永不上云），新人容易误以为对称——本篇与《04》§7 都显式登记了这份不对称。八键的逐键字段结构见《04》，此处只登记决策。

## 9. ADR-008：MySQL 只建三张表，云数据一列 MEDIUMTEXT

**背景**。存储选型的约束条件：数据形态是"每用户每类型一份 JSON"、写入模式是"整包 upsert"、读模式是"登录时拉取 + 每类每分钟至多一次"、用户量个位数。这个画像下任何"按条目建表 + 索引 + 关联查询"的设计都是负资产。

**决策**。三张表封顶：`user`（账号 + 软删标记 + status 预留封禁位）、`user_data`（`(userId, type)` 唯一键 + MEDIUMTEXT content）、`schema_migrations`（迁移水位）。DDL 由 `server/utils/migrations.ts` 的 `0001_init_user_and_user_data` 显式给出，与 Sequelize 模型定义逐列对齐（`User.ts`/`UserData.ts` 均 `timestamps: false`，时间列交给显式管理而非 ORM 钩子）。

**源码证据**。`UserData.ts` 模型注释原文："用户数据云端同步表（待办 / 空间等），以 (userId,type) 为唯一键"；`dataAccess.ts` 头注释算过容量账："user_data.content 列是 MEDIUMTEXT（约 16MB），数据库本身拦不住越界写入，应用层这道检查就是唯一闸门"，以及"按用户的总容量配额仍未实现（当前是每个类型各限一次，一个人最多约 3.2MB）"；`migrations.ts` 头注释承认历史上只建了 user_data 表的教训："原先只有 user_data 走 sequelize.sync()，user 表的结构完全不在代码里……换库或灾备恢复时表建不出来，注册/登录直接失败，且没人能从仓库重建"。

**后果**。收益：数据层小到可以整表理解（《04》§3 的两页表格就是全部）；blob 模型天然封顶存储复杂度（《13》§3 阶段 2 的判断："到此为止都不需要消息队列/对象存储"）；按类型分级限额（数据类 1MB、配置类 64KB）在应用层补上了数据库管不住的口子。代价与已知债：软删行占用唯一索引导致注销后用户名永久不可重注册（《13》⚠️-3，本 ADR 的直接后果）；`timestamps: false` 使 createTime/updateTime 恒为 NULL（《13》⚠️-17）；无按用户总配额（《13》§4 取舍表登记在案）。表结构明细见《04》§3。

## 10. ADR-009：明确单实例假设，限流与验证码存进程内存

**背景**。限流（防爆破）与邮箱验证码（找回密码）都需要有状态存储。对个人自建单容器服务，引入 Redis 意味着运维面、备份面、故障面全面扩大，而收益在个位数用户量下为零。

**决策**。进程内存 `Map` + 定时清扫，**并把假设写成明文**。`server/utils/rateLimit.ts` 的 `createRateLimiter` 工厂产出三个实例：`authLimiter`（每 IP 每分钟 10 次）、`proxyLimiter`（30 次/分）、`dataLimiter`（120 次/分，按"每次同步=拉取+上传两个请求"翻倍配额）；键数上限 10000，超限先清扫、清扫后仍满则驱逐最旧键。`server/services/passwordReset.ts` 用同样的内存 Map 存验证码：sha256 哈希存储（不落明文）、10 分钟 TTL、5 次尝试上限、60 秒重发间隔。README「已知限制」与两个文件的注释都明文承认"重启即失效，水平扩容前需改 Redis"。

**源码证据**。`passwordReset.ts` 头注释原文："内存存储，进程重启失效，单实例足够；多实例应改 Redis"；`rateLimit.ts` 的 `recordHit` 里 `if (!map.has(key) && map.size >= MAX_KEYS)` 的两段式防御；`docker-compose.example.yml` 的 `NUXT_TRUST_PROXY: 'true'` 注释——"否则限流会按 frp/nginx 的内层 IP 计数，所有访客共用同一个桶（登录限流 10/min 会误伤正常用户）"，说明单实例假设还依赖"限流键是真实客户端 IP"这个配套事实。

**后果**。收益：两个有状态组件的实现加起来不到两百行，零外部依赖，注释密度足以让任何接手者看懂边界；`createRateLimiter` 的接口形态天然适配未来的 Redis 实现（《13》§3 阶段 1 的改造清单第一条就是"路由层零改动"）。代价：重启丢限流计数与验证码（验证码失效只是让用户重发一次，危害有限）；A 副本签发 B 副本无法验证——这在单实例下不是 bug，是扩容时才会兑现的预埋债（《13》§3 已给出完整三阶段路线，此处不重复）。这条决策与 ADR-001 的部署形态、ADR-003 的无状态会话构成三角：会话无状态、业务状态进 MySQL、瞬时状态进内存——三层的"状态放置"各有归属。

## 11. ADR-010：自研极简 SQL 迁移器（显式 DDL + 水位表），不用 ORM sync 也不引外部工具

**背景**。ADR-008 记录的事故是直接动因：旧库的 `user` 表结构只存在于旧库里，代码里没有；`user_data` 表走 `sequelize.sync()` 隐式建表。换库或灾备恢复时，"从仓库重建整库"这件事在旧形态下根本做不到。外部迁移工具（knex migrations、Flyway、golang-migrate）能解决但为一个两百行的场景引入一个新依赖与新运行环节。

**备选**。继续 `sequelize.sync()`（隐式推导，结构不在代码里，且 sync 对已有表从不修改——等于没有演进能力）；引入迁移工具（重依赖，且 Docker 链路要多装一个二进制）；自研：显式 SQL 语句数组 + `schema_migrations` 水位表 + 按 id 升序补跑。

**决策**。自研。`server/utils/migrations.ts` 全文约 115 行、零依赖（头注释第一条就是"不引外部依赖，避免动 node_modules"）；迁移以 `Migration { id, statements[] }` 声明，`runMigrations` 先建水位表、读已应用 id、按 `id.localeCompare` 升序补跑，每条语句执行后写水位；全部语句强制幂等（`CREATE TABLE IF NOT EXISTS`），因为线上库可能已存在同名表。执行入口 `server/plugins/migrate.ts` 刻意**不阻断启动**：失败只 `setSchemaStatus(false, message)` 记入 `appStatus`，由 `/api/health` 暴露。

**源码证据**。`migrations.ts` 头注释的约定原文："每条迁移用唯一 id 标识，按 id 升序执行；已执行过的记录在 schema_migrations 表里，不会重复跑""全部语句必须幂等……因为线上库里表可能已经存在"；`MigrationRunner` 接口注释"只要能被迁移器调用到的最小连接面，便于单测替换"（`test/migrations.spec.ts` 因此不需要真库）；`migrate.ts` 注释原文："不阻断启动：数据库瞬时不可用时若直接抛错，容器会进入重启风暴"。

**后果**。收益：整库可从仓库重建（灾备恢复的直接能力）；迁移器与 SQL 语句都可零依赖单测；启动路径对数据库瞬时不可用有韧性。代价：无并发互斥——两个进程同时指向同一库会并发补跑同一迁移，当前语句全幂等所以通常无害，但这是未来任何非幂等迁移的雷（《13》⚠️-16，建议 advisory lock）；水位只增不改，没有回滚概念（对本项目"只能向前"的演进足够）；`escapeSql` 只处理字面量且注释明说"不接受外部输入"。迁移器的逐行走读见《18-代码走读实录》第二节。

## 12. ADR-011：双轨测试——node:test 跑纯函数契约，vitest 跑路由层

**背景**。ADR-005/006/008 把大量"正确性责任"压到了客户端纯函数与前后端常量一致性上，测试必须钉住它们。但这些被测对象分两类：一类（cloudMerge、accountPolicy、dataAccess、migrations、appConfig、outputSnapshot）刻意零依赖、纯 ESM 函数；另一类（Nitro 路由）依赖 Nitro 注入的全局函数（`defineEventHandler/readBody/getQuery/getUserSession`），原生 node:test 跑不了。

**决策**。双轨各管一段。第一轨 `pnpm test`（`node --test "test/*.spec.ts"`）只收 `test/*.spec.ts`，依赖 Node ≥22.18 的原生类型剥离直接跑 TS，零第三方测试框架；第二轨 `pnpm test:routes`（vitest，`vitest.config.ts` 的 include 刻意只收 `test/routes/**/*.test.ts` 与 `test/unit/**/*.test.ts`，并装 `test/routes/nitroGlobals.ts` 作为 Nitro 全局替身）。两轨由 `test:all` 串行聚合，再由 `scripts/check-all.sh` 与格式化、lint、类型检查并列成五步门禁（《09》§5）。

**源码证据**。`vitest.config.ts` 注释原文："vitest 会去抢 test/*.spec.ts——那些用的是 node:test 的 test()，被 vitest 收集会出现「收集到 0 条却全绿」的假通过"（include 收窄就是为防这个假通过）；`accountPolicy.ts` 头注释"自包含：不 import 本目录其它模块，原生 ESM 才能直接跑单测"；`appConfig.ts` 头注释"本文件刻意不依赖其它模块（原生 ESM 不解析无扩展名的相对导入，单测要能直接跑）"；`test/routes/dataRoutes.test.ts` 有专门用例钉住"伪造 userId 无效"（《01》§3.3 引用）。

**后果**。收益：安全边界（准入、策略、合并）全部是"不连数据库就能测到"的纯函数，测试即文档；契约漂移（白名单、口令长度）有静态比对测试自动拦截；门禁一条命令跑完。代价与缺口：`happy-dom` 在 devDependencies 里但 `environment: 'node'` 决定了它不被加载，属于声明与现实的落差（《13》⚠️-8）；备份结构、status 修改通道、CSS 注入面三处无测试覆盖（《13》§2 图中标记的"防线空白"）；门禁只存在于本机习惯，无 CI 托管（《13》⚠️-10）。四层金字塔与逐文件解析见《09-测试与质量保障》，本篇只登记"为什么是双轨"。

## 13. ADR-012：健康探活直接查 information_schema 真表，不读内存标志

**背景**。容器 healthcheck 与 `deploy.sh verify` 需要一个能回答"真的能服务吗"的探针。最直觉的实现是读迁移插件写入的内存标志 `appStatus.schemaReady`——省一次查询。但 Nitro 在 dev 模式下会重复实例化模块，标志可能永远停在 false，探活误判会让容器反复重启。

**备选**。读内存标志（快但会误报，已在 dev 实测）；只 `SELECT 1` 测连接（回答不了"表建好没有"——进程活着但注册登录全废的假健康恰恰是两表缺失）；每次查 `information_schema` 确认 `user`/`user_data` 两表存在（一条额外 SQL，换来"报告的就是事实"）。

**决策**。其三，不健康返回 503。`server/api/health.get.ts` 的 `inspectDb` 先 `SELECT 1` 确认可达，再用写死在常量里的 SQL（注释："表名写死在常量里（不接收任何外部输入），避免拼接 SQL"）查两张必需表，缺失表名进 `missingTables` 返回；同时保留 `appStatus.schemaError` 暴露迁移失败的具体原因供排障。`docker-compose.example.yml` 的 healthcheck 用 `node -e fetch(...)` 消费这个语义，`start_period: 20s` 给首次迁移留窗口。

**源码证据**。`health.get.ts` 注释原文："就绪状态按需查 information_schema，不读迁移插件写的内存标志：Nitro 在 dev 下会重复实例化模块，那个标志可能停在 false（实测就是这样误报的）；而探活一旦误判就会让容器反复重启。查库多一条 SQL，换来的是「报告的就是事实」"；`REQUIRED_TABLES = ['user', 'user_data']` 常量；`appStatus.ts` 头注释"避免『启动成功但 schema 没建起来』这种静默半死状态"。

**后果**。收益：探活语义与业务可用性严格对齐——`deploy.sh verify` 因此能把"迁移失败"拦在发布环节而不是让用户在注册时发现；503 + `missingTables` 的组合让告警信息直接可执行。代价：每次探活两条 SQL（对单实例每 30 秒一次的频率完全无感）；`schemaError` 原文暴露在无鉴权端点上，《13》⚠️-20 评估为信息量小、可接受，介意者反代层限来源。这条决策收束了前 11 条：ADR-010 让迁移可以静默失败，ADR-012 就必须让失败可见——两个决策互为闭环，缺一即产生静默半死状态。

## 14. 决策总账与使用方式

把 12 条 ADR 的"后果"一节里出现过的代价归拢，可以看到一个模式：**本项目的每条决策几乎都不付"当下的钱"，付的是"未来某个条件触发时的钱"，而触发条件全部被显式登记**——《13》§4 的取舍登记表就是这些"未来账单"的总索引（限流外置的触发是阶段 1、按用户配额的触发是滥用迹象、blob 兼容责任的触发是跨版本故障）。阅读与使用本篇的三种姿势：其一，**评审变更时**——任何修改若触碰某条 ADR 的"决策"描述（例如想把合并逻辑挪到服务端、想把 localStorage 换成 IndexedDB），必须先回到对应 ADR 复核"备选"一节，确认新走法不是已经被考虑并否决过的；其二，**新人上手时**——按 001→002→004→008→005→006 的顺序读，前四条讲"工程为什么是一个进程"，后两条讲"数据为什么这样流"，其余四条是支撑件；其三，**复盘事故时**——每次事故都应能落到某条 ADR 的"后果"一节（例如限流误伤可追溯到 ADR-009 + TRUST_PROXY），落不进去的事故说明决策清单有盲区，应新增 ADR 而不是修完就散。新增 ADR 的最小模板就是本篇各节五要素：背景、备选、决策、源码证据、后果——五要素齐了，决策才算立了案。
