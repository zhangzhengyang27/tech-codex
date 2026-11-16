# 16 决策记录（ADR）

> 项目：xiaoye-admin-react ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析

## 导读：这份"决策考古"怎么读

架构决策记录（Architecture Decision Record，ADR）的价值不在"记录结论"，而在"还原现场"——当一个设计看起来别扭时，先问它当时在什么约束下做出的、否决了哪些备选、付出了什么代价。本文从源码中考古出十二条关键决策，每条按统一五段组织：**背景**（当时面对的问题）、**备选**（曾有哪些路可走）、**决策**（最终选了什么）、**源码证据**（决策落在哪些文件与注释上，均给出真实路径）、**后果**（正负两面的代价清单）。阅读时请记住本项目的一个特点：大量决策的理由写在源码注释里而非独立文档中，因此"源码证据"一节引用的注释原文本身就是决策记录的一部分，注释消失之日就是决策语境丢失之时——这也是本篇存在的意义：把散落在各文件注释中的"为什么"收拢成一份可检索的台账。

十二条决策按主题可分为四组：权限与路由（ADR-01、07、09）、样式与主题（ADR-02、03）、接口与数据（ADR-04、05、06、11）、运行时与工程化（ADR-08、10、12）。机制层面的完整展开不在本文重复：权限体系见《08-安全与权限设计》，请求层见《03-接口设计》，缓存与标签见《07-模块详解》第 7 节，配置细节见《14-配置与环境详解》。本文只回答"为什么这样设计、为什么不是那样"。

---

## ADR-01：菜单即路由——权限做成结构性隔离而非守卫校验

**状态**：已采纳（含一次安全加固，见后果）。

**背景**：后台框架的页面访问控制有两条经典路线。路线一是"全量注册路由 + 守卫校验"：所有页面路由一次注册完毕，路由守卫按权限表逐条放行或拦截；路线二是"数据驱动注册"：路由表本身由权限数据派生，无权限的页面根本不存在。前者实现直观、支持运行时动态吊销，但守卫逻辑成为唯一防线，任何分支疏漏都是漏洞。

**备选**：全量注册 + 守卫校验（参考多数 vue-element-admin 系模板的做法）；运行时权限位过滤路由表（注册全量、渲染前过滤，介于两者之间）；纯按钮级权限（页面级不做隔离）。

**决策**：采用路线二并推到极致——`useAuthStore` 的 `flatMenuList` 是路由注册的**唯一**依据，`ConvertRouter` 把每个菜单节点翻译成 `RouteObject`；不在菜单中的路径不注册路由，用户手输 URL 直接落 `*` 兜底渲染 404。配套一条安全铁律：生产环境菜单接口失败时清空登录态，**绝不回退静态全量菜单**（源码标注 P0-2 的历史缺陷修复），空菜单也被接受为合法结果。

**源码证据**：`src/routers/helper/ConvertRouter.tsx`（`convertToDynamicRouterFormat` 逐节点翻译，未命中 glob 键时降级为 Page Not Found 占位而非崩溃）；`src/stores/modules/auth.ts`（`setAuthMenuList` 一次性派生 `authMenuList/showMenuList/flatMenuList` 三视图）；`src/hooks/usePermissions.ts` 第 73-83 行注释原文"此处绝不回落到静态全量菜单 —— 那等同于放行全部 81 条动态路由（P0-2）"（引文中"81 条"系源注释遗留口径，实际为 77 条，见《00-项目总览》4 与《13-技术债务与演进建议》D1）与"空菜单是合法结果（该账号确无任何菜单权限），同样不做兜底"；`src/routers/index.tsx` 的 `useMemo` 以菜单数组**引用**为依赖重建 router（大段注释解释"路径指纹"为何永远不变）。

**后果**：正面——未授权页面的 chunk 文件名、组件结构、接口调用方式对无权限用户完全不可见（代码从未被浏览器请求），不存在"可达但被挡"的中间态，守卫分支疏漏这类漏洞面被结构性消除。负面——其一，权限变更不能秒级生效，必须重新拉菜单并重建路由，运行时吊销能力被放弃；其二，`meta.isHide` 的语义被限定为"可访问但不显示"，绝不能当权限开关用（隐藏不等于无权限），这条边界需要持续向使用者澄清；其三，"菜单失败即登出"的从紧语义使联调期接口不通表现为整站登出，屡次被新接手者误判为 Bug（见《12-FAQ与故障排查》3.2）。

---

## ADR-02：无 Less 三件套——Tailwind v4 + antd CSS-in-JS + 层叠定序

**状态**：已采纳，并升级为项目级规约（见《01-系统架构》第 6 节规约五）。

**背景**：项目由使用自研组件库 `@xiaoye-react/ui` + Less 的 Xiaoye-Admin 全量移植而来。改用 antd 后出现经典冲突：Tailwind 的 Preflight（全局 reset）会破坏 antd 组件的基础样式，而 Tailwind 工具类又难以覆盖 antd 的 CSS-in-JS 高优先级样式——两套样式体系在同一个级联上下文里打架，传统解法是给 Tailwind 加 `important` 配置或在覆盖处堆 `!important`。

**备选**：安装 less/sass 保留原样式体系，让 antd 走编译期 Less 主题变量（antd 5+ 已废弃 Less token，此路成本高）；CSS Modules 承担组件样式（无法覆盖 antd 内部样式）；styled-components/emotion（与 Tailwind 职责重叠，增加运行时）；Tailwind `important: true` 全局加感叹号（特异性污染，所有选择器都变高优先级）。

**决策**：机制性禁用预处理器——不安装 `less`，Vite 就无法处理 `.less`，从根上杜绝回归。样式三件套分工：原子样式归 Tailwind v4（官方 Vite 插件接入，CSS-first 的 `@theme` 取代 tailwind.config.js）、组件样式归 antd 6 的 CSS-in-JS 运行时、设计变量归原生 CSS 自定义属性。共存问题用 CSS Cascade Layers 解决：全局样式顶部一行 `@layer theme, base, antd, components, utilities;` 声明层序，`main.tsx` 的 `StyleProvider layer` 把 antd 样式注入 `antd` 层——Preflight（base 层）因此压不过 antd，工具类（utilities 层）因此无需 `!important` 就能覆盖 antd。

**源码证据**：`src/styles/global.css` 第 1-19 行（层序声明及"删除或调整此行顺序会直接破坏 antd 与 Tailwind 的共存关系"的警告注释）；`src/main.tsx` 第 76-89 行 JSX 注释（"StyleProvider 的 layer 属性是 antd 与 Tailwind 共存的关键……官方明确要求启用 layer 时 StyleProvider 必须包裹 ConfigProvider"）；`vite.config.ts` 文件末尾注释（"本项目全程不使用 Less……不安装、不配置 css.preprocessorOptions.less"）；`package.json` 依赖清单中无任何预处理器。

**后果**：正面——零 `!important`、零预处理器配置、零 PostCSS 链，样式心智只剩"原子类 + 令牌 + antd"；项目内有一份机制文档 `docs/tailwind-antd-style-conflict.md` 供追溯。负面——其一，`@layer` 那一行是单点故障，顺序被任何人"整理"一次即全线失守，属于需要写进 review 清单的守护点；其二，`StyleProvider` 必须保持在 `ConfigProvider` 外层的约束容易被重构破坏；其三，从旧项目迁移的 Less 样式必须全部改写为 Tailwind 类或 CSS 变量，迁移成本一次性付清（`README.md` 第四节）。

---

## ADR-03：主题双轨制——antd 算法与 CSS 变量并行、单源驱动

**状态**：已采纳。

**背景**：主题系统要同时满足三类需求：antd 全组件跟随主题色/暗黑/紧凑变化；Tailwind 工具类与自定义样式也要跟随（比如侧栏、卡片投影、登录页背景）；明暗、色弱、灰度等开关要在 antd 与非 antd 区域表现一致。antd 的 token 体系只作用于自己的 CSS-in-JS 运行时，Tailwind 侧无法直接消费。

**备选**：只保留 antd 轨，非 antd 区域写死色值（暗黑模式下出现"主题岛"）；只保留 CSS 变量轨，放弃 antd algorithm 手动派生全部 token（工作量大且难跟随 antd 升级）；编译期生成多套主题文件（切换粒度粗，主题色无法运行时取色）。

**决策**：双轨制。轨道一是 antd 运行时主题：`ThemeProvider` 订阅 global store，向 `ConfigProvider` 传种子 token（`colorPrimary`/`borderRadius`/`colorBgBase`）与 `darkAlgorithm`/`compactAlgorithm`，其余配色全部由算法派生；轨道二是 CSS 变量：`useTheme` 把 `generateThemeTokens` 产出的语义 token 以 `--xiaoye-*` 写入 `:root`，并切换 `html` 的 `dark` class 供 Tailwind `dark:` 变体使用，再按 light/inverted/dark 三态注入侧栏/头部业务 token。两轨不互相通信，但由**同一份** global store 驱动，永远同步。

**源码证据**：`src/components/ThemeProvider/index.tsx`（`useShallow` 订阅 + `themeConfig` 的 `useMemo`，`colorBgBase` 定为纯黑/纯白，注释说明与 themeTokens 明暗底色同源以防页面与组件背景脱节）；`src/hooks/useTheme.ts`（CSS 变量注入、`classList.toggle("dark")`、灰度色弱 filter）；`src/utils/themeTokens.ts` 头注释（原始 Token → 语义 Token → 组件 Token 的三级分层纪律，"禁止直接使用原始色值"）；`src/styles/theme/global.ts`、`header.ts`、`sider.ts` 三态结构。

**后果**：正面——antd 区域获得算法派生的完整配色，非 antd 区域获得可被工具类直接引用的变量，`DEFAULT_PRIMARY`（`src/config/index.ts`）与 Tailwind `brand-500` 取同值 `#3b82f6` 保证两轨起点一致；新增外观开关只需"store 加字段、ThemeDrawer 加控件、订阅方加 effect"三步（见《11-扩展开发指南》场景四）。负面——同一份"主题色"存在两种物理形态（antd token 与 CSS 变量），排查"某处颜色没跟变"时必须先判断该处属于哪一轨（见《12-FAQ与故障排查》3.5）；双轨的存在要求主题相关改动至少理解两个文件的心智。

---

## ADR-04：契约三对齐——手写 API、MSW handler、OpenAPI 契约同步维护

**状态**：已采纳（两套接口写法并存的取舍见《13-技术债务与演进建议》）。

**背景**：脚手架要在无后端条件下完整演示登录、权限、CRUD，同时让"接真实后端"的迁移成本最低。Mock 数据与前端接口类型脱节是这类项目的常见病：mock 返回的结构页面能用但与后端契约不一致，联调时集中爆发。

**备选**：仅手写 API + 手写 mock（无契约文档，后端接入靠口口相传）；仅 OpenAPI 生成（生成器对复杂场景表达力受限，42 个接口全量维护契约文件成本高）；在线 Mock 平台（演示站依赖外部服务，违背自包含目标）。

**决策**：三处对齐、类型单源。手写层 `src/api/modules/` 承载全部 42 个接口；MSW 层 `src/mocks/modules/` 四域 handler 与之一一对应，共享 `src/api/interface/index.ts` 的类型定义（改契约只改一处，mock 与真实接口天然同型）；契约层 `openapi/oneapi.json` 作为 OpenAPI 3.0.1 示例契约，经 `pnpm openapi` 生成 `src/services/api`，通过 `src/api/openapiRequest.ts` 适配器桥接回同一 axios 实例——生成代码与手写代码共享鉴权头、错误分流与 loading 的全部拦截器行为。MSW 的信封包装函数 `ok/fail` 的注释把"对齐"落成硬约束：必须与响应拦截器的 `code===200` 判定一致，否则会被判为业务错误。

**源码证据**：`src/mocks/modules/_shared.ts` 第 3-6 行注释；`openapi/oneapi.json` 的 `info.description` 原文"与 src/mocks（MSW handler）保持一致的后端契约示例"；`scripts/openapi.mjs`（`requestLibPath` 固定注入适配器导入，保证生成代码走统一管线）；`src/api/openapiRequest.ts`（method/params/data 分发，其余键透传）。

**后果**：正面——演示站即契约活文档，接后端时把 handler 的业务规则直接翻译成验收用例（见《15-接口全量参考》第 4 节）；漏 mock 有 `onUnhandledRequest: "warn"` 的运行时告警作为第一信号。负面——三处同步**靠纪律维持、无自动校验**（《09-测试与质量保障》第 5 节缺口五明确指出这一风险）：路径改名漏改 handler 只能靠控制台告警发现，漏改契约则下次重新生成时契约文档开始"说谎"；两套写法并存也让新人困惑该用哪套（当前口径：页面统一用手写模块，生成物是契约示例）。

---

## ADR-05：不做 Token 刷新——401 一律硬登出的刻意简化

**状态**：已采纳（作为脚手架取舍；扩展点已预留，见后果）。

**背景**：企业级项目通常实现"短效 access token + refresh token 无感刷新"，但这涉及请求重放、并发去重（多个请求同时 401 只能触发一次刷新）、刷新失败降级等复杂机制。脚手架的核心诉求是主干清晰、可读可改，无感刷新的复杂度放进模板会干扰使用者理解请求管线。

**备选**：完整 single-flight + 请求重放方案；Cookie 会话 + 服务端续期（与"前端无 Cookie 鉴权"的整体设计冲突）； access token 长效不过期（把问题藏起来，安全面更差）。

**决策**：不实现任何刷新机制。401 的两条触发路径——HTTP 状态 401（`checkStatus` 映射）与业务 401（HTTP 200 且信封 `code==401`）——行为完全一致：清 token + `resetAuth()`（连权限一起清，防账号切换权限串号）+ 带 `redirect` 跳登录页。为将来留了两个钩子：`tokenUpdatedAt` 字段记录写入时间戳（注释明确"仅作记录用，不参与强制登出判断"），`skipErrorHandler` 分支的注释逐句写明 401 的清理不可跳过——这是改造为无感刷新时必须保留的语义。

**源码证据**：`src/api/index.ts` 第 65-73 行（业务 401 分支及注释"无论是否 skip 都必须清登录态并跳登录页，skip 只影响是否弹提示"）；`src/api/helper/checkStatus.ts`（HTTP 401 分支执行同一套清理）；`src/stores/modules/user.ts` 第 32-34 行（`tokenUpdatedAt` 注释）；`src/api/interface/index.ts` 的 `Result` 定义（信封中无 refresh 相关字段）。

**后果**：正面——请求管线的 401 语义一屏可读，是最容易向新人讲解的分支；全仓无隐藏的请求重放逻辑，排障时行为可预期。负面——长会话用户会被硬登出（`docs/bug-audit.md` 后登记为技术债 D5，接生产前优先级最高的演进项）；token 长期驻留 localStorage 无时效兜底，XSS 得手即可长期窃用。改造入口唯一且已标注：`src/api/index.ts` 响应拦截器的 401 分支，按 single-flight 模式改写即可，方案细节与三个已知坑（重放需重建请求、刷新接口自身要跳过该分支、启动期请求的错误提示去重）见《08-安全与权限设计》2.2。

---

## ADR-06：MSW 直连演示模式——演示构建即生产彩排

**状态**：已采纳（msw 精确锁定 2.15.0）。

**背景**：项目需要一个不依赖任何后端的公开演示站（`admin-react.zhangzhengyang.com`，见 `nas-deploy/README.md`），且演示产物要尽可能接近生产产物——演示与生产形态差异越大，"演示没问题、上线就翻车"的风险越高。

**备选**：json-server / 独立 mock 进程（演示站要多跑一个服务，NAS 部署链路复杂化）；只在 dev 环境 mock（演示站无法脱离后端）；拦截器层 mock（axios adapter 换装，无法覆盖非 axios 请求，且 mock 代码进入生产逻辑分支）。

**决策**：Service Worker 级拦截——MSW 在网络层接管 `/api/**` 请求，handler 与真实接口路径完全一致。启动设计为"渲染前 await + 三重有界防护"：5 秒竞速超时（隐私模式/禁 SW 环境不白屏）、`onUnhandledRequest: "warn"`（漏 mock 告警）、SW 首装 `clients.claim()` 时序缺口的自愈刷新（300ms 复查后整页刷新一次，sessionStorage 防死循环）。构建设计为三态：非 PROD 构建恒开；PROD 且 `VITE_ENABLE_MOCK === "true"`（`pnpm build:mock`）打包进产物；常规生产构建经动态 `import("@/mocks/browser")` 被 tree-shake 掉。msw 版本精确锁定，因为 `public/mockServiceWorker.js` 与之绑定。

**源码证据**：`src/main.tsx` 第 37-71 行（`enableMocking` 全函数，注释解释渲染前 await 与接管缺口成因）；`package.json` 第 67 行 `"msw": "2.15.0"`（无前缀符号，精确锁定）；`.env.mock`（相对 production 的唯一差分 `VITE_ENABLE_MOCK = true`）；`src/mocks/handlers.ts`（四域聚合，展开顺序注释）。

**后果**：正面——演示站与生产站产物唯一差异是 MSW 开关（`.env.mock` 是 production 的最小差分），"演示站即生产彩排"成立；MSW 代码不进常规生产产物，体积零负担。负面——SW 注册存在环境边界（无痕模式、禁 SW 环境自动降级为无 mock），首装接管缺口需要自愈机制兜底（这套防护本身有认知成本）；`mockServiceWorker.js` 与版本绑定，升级 msw 必须重跑 `npx msw init public/ --save`，`.prettierignore` 还要豁免该文件（SW 带完整性校验，被格式化会失效）；MSW 启动的 5 秒窗口是刻意的"性能换可用性"，不可当慢项优化掉（见《10-性能设计与优化》4）。

---

## ADR-07：import.meta.glob 路由扫描——视图零注册

**状态**：已采纳（两个硬约束已写进源码注释）。

**背景**：菜单的 `element` 字段是形如 `/home/index` 的字符串，转换时需要把它映射到真实组件。方案要满足：新增页面零注册成本；全部视图懒加载（77 个菜单节点的框架不能把页面代码打进首屏）；键匹配失败时不崩溃。

**备选**：中央路由映射表（`{ "/home/index": Home }` 手动维护，每加页面改一处，违背脚手架低门槛诉求）；`require.context`（webpack 专属，Vite 无此 API）；约定组件名按目录自动 import 的 Babel 插件（构建链复杂化）。

**决策**：模块顶层执行一次 `import.meta.glob("/src/views/**/*.tsx")`，把全部视图声明为懒加载 chunk 的 loader 映射；转换时以 `"/src/views" + element + ".tsx"` 拼出键查找，命中则 `lazy(loader)` 包 Suspense，未命中降级为渲染 "Page Not Found" 的占位组件。glob 的两个硬约束被注释固化：不支持路径别名必须写真实路径；模式必须以 `/` 开头（项目根），否则键是相对路径导致查找全部落空。

**源码证据**：`src/routers/helper/ConvertRouter.tsx` 第 10-16 行注释（原文解释相对模式键形如 `../../views/home/index.tsx` 时"making every lookup miss and fall back to Page Not Found"）；`src/routers/index.tsx`（glob 产物随路由表在 `useMemo` 中消费）。

**后果**：正面——新增页面只需"建文件 + 登记菜单"两步，路由注册、代码分割、懒加载自动生效；`src/views/**` 成为路由与分割的唯一领地，架构规约（视图必须落在这里）有了机制保障。负面——glob 键匹配是纯字符串拼接，目录改名、文件名不是 `index.tsx`、导出不是默认导出，都会静默降级为 Page Not Found 而非构建报错（排障入口见《12-FAQ与故障排查》3.1）；login 页因同时被静态路由导入与 glob 扫描触发 `INEFFECTIVE_DYNAMIC_IMPORT` 构建警告（已知无害，`README.md` 记录）。

---

## ADR-08：KeepAlive 常驻 DOM——不用 React 19 Activity 的实测锁定

**状态**：已采纳（实测后锁定，明确不建议改回）。

**背景**：多标签后台需要页面缓存：切走再切回时表单输入、滚动位置、列表状态不丢。React 官方的 `<Activity>`（19 新 API）语义上是标准答案，但项目的技术栈组合（懒加载 Suspense、rc-tabs 墨条动画、多标签联动）叠加后出现兼容故障。

**备选**：React 19 `<Activity>`；卸载-恢复方案（状态快照存 store，切回重放）；社区方案 react-activation（引入第三方渲染劫持，升级风险不可控）。

**决策**：缓存节点常驻 DOM、以 `display:none` 隐藏。缓存 key 为 `pathname + search`，组件状态与 effects 完整保留；内存回收通过两条线：缓存集合与 `tabsList` 联动（关标签即释放缓存，动态详情路由经 `matchPath` 按 `meta.activeMenu` 归属到父 tab 判定存亡）；`meta.isKeepAlive` 未开启的页面根本不进缓存。"刷新当前页"建模为 `RefreshContext.refresh()`——短暂隐藏 outlet 制造卸载窗口 + 自增 `refreshNonce` 使缓存 id 变化，KeepAlive 丢弃当前缓存重建节点。

**源码证据**：`src/components/KeepAlive/index.tsx`（`cacheRef` 与 `CachePage.id` 携带 refreshNonce 的设计；源码注释记录 Activity 的 hidden 态会卸载 effects 并推迟提交，与懒加载 Suspense、rc-tabs 墨条动画叠加导致切页空白、内容滞留、墨条丢失）；`src/context/Refresh.tsx`（`outletShow` + `refreshNonce` 两状态建模）。

**后果**：正面——切页零重渲染成本，缓存效果是"完整保留"而非"快照恢复"；不依赖任何实验性 API。负面——缓存页驻留内存，`isKeepAlive` 开在超长列表或大图表页时驻留成本需自行评估（《10-性能设计与优化》3.1 明确"不是所有页面都该开缓存"）；常驻 DOM 方案对组件清理纪律要求更高（init/dispose、observe/disconnect 必须成对，Echarts 封装是范本）；Activity 的兼容性问题随 React 版本演进可能消失，届时是否重评估留给维护者（当前结论：实测有回归，不动）。

---

## ADR-09：权限一次性快照——按钮权限配 5 秒重试窗口

**状态**：已采纳。

**背景**：菜单与按钮权限如果每次路由变化都请求，会产生大量冗余调用；但"启动时获取一次"意味着这次请求的成败决定整个会话的权限形态。启动初期还有一个特殊窗口：MSW/代理可能尚未就绪，首请求会穿透或超时。

**备选**：每次路由变化重取权限（请求量翻倍且权限抖动可见）；启动时一次性获取、失败即放弃（按钮权限页整个会话空白，只能刷新恢复）；把重试逻辑交给 axios 层通用重试（所有接口都被重试放大，不符合"只有启动期接口需要"的实际需求）。

**决策**：权限是启动时的一次性快照，之后不再请求——权限变更在下次刷新生效，这是明确的产品语义（见《08-安全与权限设计》第 6 节"权限数据仅启动时获取一次"条目）。唯一例外化的防御是按钮权限的重试窗口：`fetchAuthButtonsWithRetry` 在 5 秒 deadline 内以 600ms 间隔重试、单次请求与 2 秒超时竞速。环境分支用 `!import.meta.env.PROD` 判定（而非 `DEV`），避免 `--mode development/test` 构建的部署产物误判为开发态。

**源码证据**：`src/hooks/usePermissions.ts` 第 13-34 行（`fetchAuthButtonsWithRetry` 实现，注释原文"按钮权限是全站唯一『启动时一次性获取、之后不再请求』的数据，单次失败会让 /auth/button 整个会话空白、只能刷新恢复"）；第 51-65 行开发态分支（菜单短路取静态 JSON 的原因注释：mock 不可达时请求会挂起到 30s 超时）；`src/routers/index.tsx` 的 `hasInit` ref（防重复初始化）。

**后果**：正面——权限请求在会话内只发生一次，侧边栏、标签栏、路由表的行为可预测；重试窗口精准覆盖启动期 mock 未就绪的瞬时失败。负面——会话内权限变更（管理员改了某用户的菜单）对在线用户不生效，需刷新；按钮权限最终失败按空权限处理，"整页按钮消失"成为需要文档解释的设计行为（《12-FAQ与故障排查》3.2）；两条环境分支（开发短路/生产并行）使权限问题排查必须先分清形态（`pnpm dev` 与 build 产物行为不同）。

---

## ADR-10：useMessage 模块级单例——非 React 环境的主题化提示

**状态**：已采纳。

**背景**：axios 拦截器、ErrorBoundary、工具函数都不在 React 组件树内，却需要弹出提示。antd 的静态方法（`message.error` 直接调用）可用，但拿不到 `ConfigProvider` 的 locale 与 theme——英文界面里弹中文提示、暗黑模式下弹白底气泡，主题一致性被打破。

**备选**：全项目强制用静态方法并接受主题脱节（演示观感差）；事件总线把弹错回传组件层（链路复杂，页面需各自挂监听）；给每个需要弹错的模块传参 message 实例（侵入所有调用点）。

**决策**：模块级单例注入。`App.tsx` 在 antd `<App>` 上下文内把 `message/notification/modal` 实例写入模块变量，非 React 场景通过同模块导出的引用取用；未注入时（极端时序）回退 antd 静态方法兜底——功能可用性优先于主题一致性。`modal.confirm` 还在单例上封装了项目级默认值（危险操作红色按钮、`mask.closable` 等 antd 6 新写法）。

**源码证据**：`src/hooks/useMessage.tsx`（模块变量 `appInstances` + 注入/取用函数 + `modal.confirm` 封装）；`src/App.tsx`（在 `<AntdApp>` 内调用注入，`setAppInstances`）；`src/api/helper/errorHandler.ts` 第 3 行（拦截器侧 `import { message, notification } from "@/hooks/useMessage"`，消费方即证据）。

**后果**：正面——全项目提示（包括拦截器弹的业务错误）统一继承主题与语言，"英文模式弹中文提示"这类观感破绽被结构性消除；单例同时成为 modal 语义的收口处（删除确认的红色按钮等约定改一处全局生效）。负面——单例引入一个隐式初始化时序：注入发生在 React 首次渲染后，此前的弹错走静态兜底（可接受但不一致）；模块级可变状态在测试中需要 mock（`errorHandler` 的测试用 `vi.mock` 钉死该模块，见《09-测试与质量保障》3.2）；`useMessage` 的 modal 默认按钮文案仍是中文硬编码（技术债 D2）。

---

## ADR-11：localStorage + 自定义鉴权头——无 Cookie 的会话设计

**状态**：已采纳。

**背景**：token 存储位置的选型决定整个鉴权链路的威胁模型。Cookie 方案可配 HttpOnly 防 XSS 窃取，但引入 CSRF 风险与跨域 Cookie 配置；localStorage 方案相反。同时请求头选标准 `Authorization` 还是自定义头，决定后端网关的鉴权约定。

**备选**：HttpOnly Cookie 会话（需要 CSRF token、SameSite 配置、跨域 credentials 三件套，演示与联调链路复杂化）；`Authorization: Bearer` 标准头（更标准，但参考项目与后端契约已按自定义头实现）；内存 token + 刷新丢失登录态（刷新即登出的体验不可接受）。

**决策**：token 存 localStorage（zustand persist 键 `xiaoye-user`），请求头用自定义的 `x-access-token`，axios 全局 `withCredentials: false`——整个鉴权链路不依赖 Cookie，天然免疫 CSRF；代价是 token 对同源 XSS 完全暴露，因此 XSS 防护责任明确落在渲染层：React 默认转义 + 全项目不使用 `dangerouslySetInnerHTML`，这一对取舍组合在源码层面自洽。

**源码证据**：`src/api/index.ts` 第 20-27 行（`withCredentials: false`）与第 44-46 行（`headers.set("x-access-token", useUserStore.getState().token)`，实时读 store 而非闭包缓存）；`src/stores/modules/user.ts`（persist 配置，`partialize` 只持久化三个数据字段）；`src/api/modules/login.ts`（登录返回 `access_token` 写入 store 的链路）。

**后果**：正面——免 CSRF、免跨域 Cookie 配置，`VITE_PROXY` 代理与 Nginx 反代都不需要 credentials 协调；token 的读写路径收敛在 store 与拦截器两处，审计面小。负面——XSS 防线完全依赖渲染层纪律，token 无时效兜底时被窃即长期可用（技术债 D5 的安全面）；自定义头 `x-access-token` 是前后端强约定，接真实后端时必须核对（《11-扩展开发指南》场景五的三件事之一）；多标签页 token 变更不广播（无 storage 事件监听），跨标签同步缺失已登记为 D10。

---

## ADR-12：开发态捷径与生产一致性——三条主线刻意分化

**状态**：已采纳（并以 `!import.meta.env.PROD` 统一判定口径）。

**背景**：脚手架的开发体验与生产形态天然矛盾：开发时希望跳过登录直进主界面、菜单零等待；但演示与生产必须走真实链路。若开发态与生产态代码路径分叉过多，"开发正常、上线异常"类问题会层出不穷。

**备选**：开发态与生产态完全一致（每次开发都要先登录、等接口，体验差）；用 `import.meta.env.DEV` 判定（`--mode development/test` 构建的部署产物中 DEV 仍为 true，会误判为开发态把 dev-token 写进生产部署——这正是历史缺陷 P1-3）；第三种模式（如独立的 demo mode 概念，增加配置面）。

**决策**：三条主线刻意分化但判定口径统一。登录主线：非 PROD 且 `VITE_DEV_AUTO_LOGIN !== "false"` 时预置 dev-token（且必须**先写 localStorage 再写内存**，防 persist 异步 rehydrate 用旧值覆盖——源码注释完整记录了这一时序缺陷）；权限主线：开发态菜单短路取 `authMenuList.json` 静态数据，按钮权限仍走接口（否则演示页整页无按钮）并带重试窗口；Mock 主线：非 PROD 恒开 MSW。所有"是否开发态"的判断统一用 `!import.meta.env.PROD`，P1-3 修复后全仓无一处使用 `DEV`。

**源码证据**：`src/main.tsx` 第 13-29 行（预置登录与"PROD 取反而非 DEV"注释、localStorage 先行注释）；`src/hooks/usePermissions.ts` 第 51-65 行（菜单短路的原因注释）；`package.json` 的 `build:mock` 脚本与 `.env.development` 的 `VITE_DEV_AUTO_LOGIN = true`。

**后果**：正面——开发效率（免登录、菜单零等待）与形态一致性（PROD 判定让 development/test 构建走真实链路）兼得；预置登录的时序陷阱成为 persist 机制的最佳教学案例（《04-数据模型》5.3）。负面——"dev 正常 build 异常"或反之的现象，排查时必须先过《00-项目总览》第 6 节的三态差异（权限来源、Mock、预置登录），认知成本被显式记录；开发态菜单短路意味着"菜单接口 30 秒挂起"这类问题只在生产形态暴露，联调发现时容易误判为前端新引入的 Bug。

---

## 收束：决策之间的相互支撑

十二条决策不是孤立的，它们围绕一个共同目标互相咬合：**让"约定"可执行、让"失败"从紧**。ADR-01（菜单即路由）之所以成立，依赖 ADR-07（glob 扫描让视图可被字符串寻址）与 ADR-09（权限一次性快照保证路由重建信号单一）；ADR-06（MSW 直连演示）之所以可行，依赖 ADR-04（契约三对齐让 mock 与真实接口同型）与 ADR-02（无 Less 使演示产物无样式环境差异）；ADR-05（无刷新）的简化之所以被容忍，是因为 ADR-11 的无 Cookie 设计让登出语义足够干净。反过来，每条决策的负面清单里都能找到其他决策的补偿机制：glob 键匹配的静默降级由 `onUnhandledRequest` 告警与 FAQ 决策树补偿，无刷新的安全面由"失败从紧"的 P0-2 铁律补偿。

维护这批决策的方法与维护代码相同：改动任何一处被本文引用的注释（尤其 P0-2、层序声明、glob 约束、PROD 判定）前，先回到对应 ADR 确认动机是否仍然成立；新增架构级取舍时，按本文五段格式续编 ADR-13——决策记录的生命力同样来自每一次接手者的续写。评估"要不要推翻某条决策"时可借用《13-技术债务与演进建议》末段给出的判断技巧：凡是让事实源更单一、失败路径更从紧的改动方向大概率正确，反之则需先在 ADR 里登记取舍理由。
