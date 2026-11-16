# 16 决策记录（ADR：关键决策考古）
> 项目：react-ui ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析

## 0. 本篇的定位与证据标准

前面 16 篇文档回答的是「这个系统是什么、怎么运转」；本篇回答的是另一个问题——**「它为什么长成现在这个样子，而不是别的样子」**。架构决策记录（Architecture Decision Record，ADR）的价值不在于替后人做决定，而在于把「当时看到了什么、比较过什么、放弃了什么」固化下来，让半年后（或接手者、AI 协作者）不需要重新考古就能理解一个看似奇怪的选择背后有多少实测数据与教训支撑。这个仓库的作者显然深谙此道：`packages/ui/vite.config.ts` 里存着「12 KB 涨到 327 KB」的事故数据，`packages/hooks/src/use-uncontrolled/use-uncontrolled.ts` 的 JSDoc 里挂着历史修复 commit（9347c9fd），`ADMIN-ROADMAP.md` 第「五、已拍板的决策」一节逐条记录了 2026-09-09 的五项裁决——这些都是现成的「轻量 ADR」，只是散落在源码注释与路线图里。本篇把它们集中收拢、补齐背景与备选方案，形成 12 条结构化决策记录。

每条记录按五要素组织：**背景**（当时面对的问题）、**备选**（考虑过或客观存在的其他路线）、**决策**（最终选择）、**证据**（源码/配置/文档中的可核对出处）、**后果**（正面收益与已付出的代价）。与前 16 篇的分工是：机制细节（useStyles 如何缓存、UICssVariables 如何注入）一律以「见《0X-xxx》」引用，本篇只谈「为什么」。所有结论都经本轮回源码复核；无法从仓库内材料确认的，显式标注「⚠️ 待确认」。

## ADR-001：三层包架构与固定发布顺序 hooks → ui → pro

**背景**：组件库的 React hooks（状态原语、DOM 交互、观测器）与组件本体高度相关但生命周期完全不同——hooks 零运行时依赖、兼容 React 18/19、可以被任何项目单独使用；组件则带着 20+ 第三方依赖与 React 19 门槛。把两者塞进一个包，hooks 用户被迫背上组件依赖；管理端「页面模式」（ProTable 等）的迭代节奏又明显快于基础组件，混在主包里会让主包版本号被高频功能迭代拖着走。

**备选**：单包发布（全部内容进 `@xiaoye-react/ui`，hooks 作为子路径导出）——实现最简单，但两套 peer 门槛（React 18/19 对 React 19）在同一包内无法表达，peerDependencies 只能整体取宽，组件侧的 React 19 类型特性会对 18 用户静默失效；双层拆分（hooks 并入 ui，只拆 pro）——省一个包，但「只想要 hooks 的项目」仍需安装整个 ui 的依赖树。

**决策**：三层独立发布——`@xiaoye-react/hooks`（1.4.x）、`@xiaoye-react/ui`（3.0.x）、`@xiaoye-react/pro`（0.2.x），依赖方向严格单向：pro → ui → hooks，hooks 对 ui 零反向依赖（`packages/hooks/src/` 全目录检索不到对 `@xiaoye-react/ui` 的引用）。发布顺序固定为 hooks → ui → pro，版本号各自独立演进。`ADMIN-ROADMAP.md` 决策 1（2026-09-09 拍板）进一步明确了层内归属原则：「基础数据组件进主包 ui；页面模式层进新包 pro」，并在 P2 一节给出理由：「允许依赖 ui + hooks，独立发版，避免主包膨胀」。

**证据**：三个 `package.json` 的 `peerDependencies` 字段——`packages/hooks/package.json` 仅 `react`/`react-dom`（`^18.0.0 || ^19.0.0`）；`packages/ui/package.json` 为 `react ^19.0.0`、`react-dom ^19.0.0`、`@xiaoye-react/hooks ^1.4.0`；`packages/@xiaoye-react/pro/package.json` 以 `workspace:^` 协议指向 ui 与 hooks。发布顺序的论证在根 `README.md` 发布流程节：「被依赖的先发，顺序固定 hooks → ui → pro：反过来就会短暂出现『peer 指向注册表上还不存在的版本』」。

**后果**：正面——hooks 包 `sideEffects: false` 可独立摇树、独立安装；pro 以 0.x 版本号明确传达「模式层仍在快速演进」的信号，与 ui 3.x 的稳定承诺解耦。负面——发布必须串行三包（`scripts/release.mjs` 为此实现了 `--from` 断点续跑），且 ui 的 peer 下限与 hooks 的导出面产生硬耦合（见 ADR-011 的 peer 下限案例）；三个包的 CHANGELOG、类型检查、发布预检各一套，工程复杂度确实变高了——这是「分层清晰」换来的税，作者显然认为值得。

## ADR-002：ui 包 React 19 独占，hooks 双兼容

**背景**：仓库大量使用了 React 19 的类型与行为约定。`packages/ui/src/core/factory/factory.tsx` 的 `factory()` 与 `polymorphic-factory.tsx` 都在 forwardRef 包装处留有注释：「确保 React 19 forwardRef 始终接收 (props, ref) 双参数，避免部分组件只声明 _props 单参数时触发运行时警告/SSR 组件类型错误」；`core/utils/Activity/` 是 React 19 `<Activity>` 实验性 API 的 fallback 实现，源码注释明确「待 React 正式导出 Activity 后可替换为原生实现」。

**备选**：全库兼容 React 18——要求放弃 Activity 语义（keepMounted 隐藏态）或自造双实现，且 forwardRef 的 19 行为差异要逐点适配；全库要求 React 19——hooks 库失去大量潜在用户，83 个原语里绝大多数根本不依赖 19 特性。

**决策**：按包切分兼容承诺。`packages/hooks/package.json` 的 peer 是 `react ^18.0.0 || ^19.0.0`；`packages/ui/package.json` 与 pro 的 peer 是 `^19.0.0`（pro 为 `^19.1.1`）。根 `package.json` 的 `pnpm.overrides` 把 workspace 内 react/react-dom 统一钉在 19.2.7、`@types/react` 钉在 19.2.3，保证仓库内所有包在开发与测试时面对同一份 React。

**证据**：上述三个 `package.json` 原文；`packages/ui/src/core/utils/Activity/` 目录实现与注释；《01-系统架构》第 7 节对 React 19 门槛的记录。

**后果**：正面——ui/pro 可以放心使用 19 的类型系统与运行时行为，不用为旧版做防御性分支；hooks 保留最大兼容面。负面——React 19 是安装 `@xiaoye-react/ui` 的硬门槛，从 React 18 项目迁移的用户必须先升级 React（文档站为此提供了 `apps/docs/MIGRATION-ANTD-TO-REACTUI.md` 等迁移材料，但 React 18 → 19 本身不在库的兜底范围内）；此外 overrides 钉住 19.2.7 而包内 devDependencies 写 19.1.1，两处版本并存需要维护者留意同步（当前由 overrides 兜底，不影响发布面）。

## ADR-003：CSS Modules + CSS 变量为主，Emotion 降级为可选通道

**背景**：组件库的样式引擎选型决定了三件事——运行时开销、产物形态、消费者的定制深度。CSS-in-JS（styled-components、Emotion）提供最强的运行时动态能力，代价是每个消费应用都要背上运行时与序列化开销；纯静态 CSS 最快，但主题定制能力弱。

**备选**：全量 CSS-in-JS（Mantine 早期路线，也是本库 Button.tsx 注释里提到的历史——「不再使用 styled-components」）；Utility-first（Tailwind）——与「按选择器定制」的 StylesApi 语义不匹配；纯静态 CSS 无变量——主题切换必须重算样式。

**决策**：默认路径为 CSS Modules + PostCSS（`postcss.config.cjs` 的 postcss-nested）+ `--ui-*` CSS 变量两级体系：主题层把 `UITheme` 翻译成 `:root` 上的 `--ui-*` 全局变量，组件层 varsResolver 产出 `--button-*` 局部变量，CSS Modules 只消费变量、状态用 data 属性选择器表达。Emotion 以 `packages/ui/src/emotion/` 的 stylesTransform 形式作为**可选平行通道**存在，默认关闭。这条路线被写成铁律：`CONTRIBUTING.md`「新增一个组件」一节原文「CSS Modules + `--ui-*` 变量，**不引入 CSS-in-JS**」。

**证据**：`CONTRIBUTING.md`；`packages/ui/package.json` 的 `sideEffects: ["*.css"]`（样式文件不被摇树）与 `exports["./style.css"]`（静态样式产物）；Button.tsx 第 140 行注释「样式引擎：CSS module（与 Loader/ActionIcon 一致，不再使用 styled-components）」；主题链路机制见《01-系统架构》第 4 节与《10-性能设计与优化》第 4 节。

**后果**：正面——主题切换零 JS 重渲染（`data-ui-color-scheme` 切换变量组，纯 CSS 级联）；`style.css` 可被消费方打包器直接缓存；深色模式与 RTL 对新组件「免费获得」（ADMIN-ROADMAP P3 原话）。负面——CSS Modules 的哈希类名无法被消费者直接覆盖，深度定制只能走 StylesApi 三通道或 fork varsResolver（边界记录见《01-系统架构》第 7 节）；Emotion 平行通道长期处于「维护但不主推」状态，两套样式心智并存本身是认知成本。

## ADR-004：preserveModules 摇树优先的产物架构

**背景**：库模式构建最省事的做法是把上千个源模块打成一个 bundle——产物文件少、入口简单。但组件库的消费方是打包器用户，他们只 import 一两个组件；单文件产物会杀死摇树。

**备选**：单文件 bundle（Vite lib 默认倾向）——配置最少；多入口手动声明——维护成本高且易漏；preserveModules——保留源码模块边界，交给下游打包器摇树。

**决策**：三个包全部采用 `preserveModules: true` + `preserveModulesRoot: 'src'` 的双格式产物（ESM `.js` + CJS `.cjs`），运行时依赖与 peer 一律外部化。`packages/ui/vite.config.ts` 的注释保留了这次决策的完整实测记录：「不再把 1400 个模块压成单个 index.js。模块边界一旦消失，下游打包器就摇不动树——实测 import { Button } 从 12 KB gzip 涨到 327 KB gzip，且会把 rrule / react-dropzone 这些用不到的实现一起带进消费方产物」。hooks 包的配置注释同构：「只 import 一个 use-hotkeys 也要背上全部 87 个 hook」（87 为注释口径，实测 hook 目录 83 个，见《13-技术债务与演进建议》D4）。外部化的理由同样写在注释里：「打进产物等于下游既按 dependencies 再装一遍、运行时又拿到第二份实例（dayjs 的 extend/locale、@emotion/cache 的插入点都是全局状态）」。甚至 minify 的去留也做了实测：「实测它不影响摇树（Button 12,425 B gzip vs 关掉压缩的 12,423 B），但关掉会让 Vite 的 CSS 压缩链停摆」——最后保留 minify。

**证据**：`packages/ui/vite.config.ts` 与 `packages/hooks/vite.config.ts` 注释原文；产物链路全貌见《10-性能设计与优化》第 1 节。

**后果**：正面——消费方按需打包成为默认行为，无需文档教用户「从哪个深路径导入」；外部化避免双实例类 bug（dayjs 插件注册、Emotion 插入点）。负面——产物文件数膨胀（`files: ["es"]` 一个目录几千个小文件），安装包体积与 npm 解压时间上升；`pnpm publish` 前必须重新构建（prepublishOnly 强制 build），CI 时长增加。

## ADR-005：polymorphicFactory 多态工厂与「静态件四件套」

**背景**：129 个组件里大量场景需要「按钮渲染成链接」「列表项渲染成自定义组件」。若每个组件各自实现 `component` prop 的类型分发，类型层会重复劳动且质量参差；而二次封装（品牌按钮、固定 variant 的变体）如果没有一等支持，消费者只能写层层包裹的高阶组件。

**备选**：原生 React `forwardRef` + 手写 props 泛型——每个组件重复实现多态类型；第三方库（如 Radix 的 Slot 模式）——引入依赖且与 StylesApi/主题体系不接轨；只在类型层做多态（`createPolymorphicComponent` 纯类型转换）——早期方案，运行时缺 withProps 等静态能力。

**决策**：`packages/ui/src/core/factory/` 四件套构成完整体系。类型层 `create-polymorphic-component.ts`（61 行）定义 `PolymorphicComponentProps<C, Props>`：当 `component` prop 指向某元素或组件时，其原生属性被并入 props 且用户 props 可覆盖（`ExtendedProps = OverrideProps & Omit<Props, keyof OverrideProps>`）；运行时层 `polymorphic-factory.tsx`（117 行）的 `polymorphicFactory<Payload>(ui)` 在 `forwardRef` 之上附加静态件四件套：`withProps`（高阶固定 props）、`extend`（恒等函数，类型级扩展口）、`classes`（StylesApi 探测用）、`varsResolver`（主题层变量覆盖用），外加 `staticComponents` 把 `Button.Group` 这类子件并入组件类型。运行时还做了兼容处理：外层再包一次 forwardRef 并显式传递 `(props, ref)` 双参（见 ADR-002 的证据）。

**证据**：`polymorphic-factory.tsx` 第 80-84 行注释：「与非 polymorphic 版 factory 的 withProps 对齐：classes/varsResolver 是组件的静态属性（如 Paper.classes），依赖它做样式探测的消费者在 withProps 产物上不应失效」——这说明 withProps 透传静态件不是随手写的，而是一次针对消费者兼容性的显式修正。机制走读见《18-代码走读实录》第 1 节。

**后果**：正面——「多态 + 可封装」成为全库组件的统一出生流程，pro 包的 PageContainer 等模式组件用同构的 `factory` 创建，心智一致。负面——工厂类型（`FactoryPayload`、`PolymorphicComponentProps`）是全库最陡的类型学习曲线，第三方作者理解 `extend` 恒等函数「为什么存在」需要读《03-接口设计》的类型体系说明；`compound: true` 的复合组件不允许在 UIProvider 主题上配置 classNames/styles/vars（`factory.tsx` 注释原文），这条约束偶尔让想主题化子件的消费者意外。

## ADR-006：StylesApi 选择器化样式定制

**背景**：组件库最深的痛点是「样式定制」：用户永远想改那个你没暴露 prop 的内部节点（表格的 td、按钮的 label、选项的 icon）。逐节点暴露 prop 会爆炸，全局 CSS 覆盖又依赖内部类名实现细节。

**备选**：CSS 类名约定暴露（如 `.ui-button-label` 让用户直接写 CSS）——把内部实现变成公共契约，重构即破坏用户；每个组件自带 `labelProps`/`tdProps` 式透传——prop 面爆炸且无样式优先级语义；Styled System 式全局 style props——表达力受限于白名单。

**决策**：`packages/ui/src/core/styles-api/` 实现「选择器化」三通道：每个组件声明 `StylesNames`（Button 5 个、DataTable 12 个），消费者按选择器注入 `classNames`/`styles`/`vars`/`attributes`；中枢 `use-styles/use-styles.ts` 组合 8 个类名辅助函数与 `getStyle`，把主题类名、变体类名、静态类名、用户覆盖层层合成。配套两个性能与体积设计：按选择器缓存（见 ADR 与《10-性能设计与优化》第 2 节）与 `withStaticClasses` 关断静态类名。

**证据**：`use-styles.ts` 的入参接口 `UseStylesInput<Payload>` 与返回的 `GetStylesApi`；`styles-api.types.ts` 的 `StylesApiProps` 六件套（classNames/styles/vars/varsResolver/unstyled/attributes）；使用方式示例见《19-数据契约与示例集》各组件的样式定制段。

**后果**：正面——定制面有类型约束（`XxxCssVariables` 白名单外的变量名编译期报错），重构内部 DOM 结构时 StylesNames 即契约，文档站 `docs:lint` 还会核对 API 表。负面——每个组件作者必须维护 StylesNames 清单、CSS 变量白名单、varsResolver 三件一致性，漏声明一个选择器用户就定制不到（这是贡献成本，也是纪律）；类名合成链有 8 层辅助函数，排查「样式为什么不生效」需要按《12-FAQ与故障排查》的决策树走。

## ADR-007：useUncontrolled 受控/非受控双模纪律

**背景**：受控/非受控双模是 React 组件库的经典难题：setter 何时落内部 state、何时只转发 onChange，每个组件自己判断就会各自犯错；更隐蔽的是「双 onChange」——组件把 onChange 交给状态 hook 又在事件里显式调一次。

**备选**：只支持受控——把状态管理负担全部推给用户，快速起步体验差；只支持非受控——服务端联动场景无法实现；各组件手写双模——正是历史事故的来源。

**决策**：全库状态一律走 `packages/hooks/src/use-uncontrolled/use-uncontrolled.ts`：`useUncontrolled<T>({ value, defaultValue, finalValue, onChange })` 返回 `[值, setter, 是否受控]`。三条纪律：受控判定是渲染期短路（`value !== undefined` 即受控，内部 useState 不生效）；setter 是 useCallback 稳定引用（onChange 经 ref 转发最新值）；**setter 是 onChange 的唯一出口**。

**证据**：该文件 JSDoc 用「⚠️ 双 onChange 陷阱（重要）」标注了正反两个代码示例，并记载历史：「react-ui 组件层审计（9347c9fd）发现 5 处组件因同时向 useUncontrolled 传 onChange 又在 setter 调用点附近显式调 onChange 而触发双次 onChange」。注释还写明了修复的两种路线与前提：「修复方式统一为：不向 useUncontrolled 传 onChange，由组件显式调用 onChange 作为唯一出口；前提是所有 setter 调用点都受 value === undefined 守卫」。setter 稳定性的理由也有注释：「若每次渲染重建，下游以其为依赖的 useCallback/useMemo 会每帧失效（Combobox contextValue、use-splitter 的 ref 回调缓存等大面积击穿）」。语义模型详见《04-数据模型》第 2 节。

**后果**：正面——「先用 defaultValue 起步、需要时改 value」永远平滑，回调签名不变；DataTable 五组状态、Tabs、Select 全部复用同一模板，行为可预期。负面——陷阱依赖纪律而非类型系统拦截（把 onChange 再显式调用的错误 TS 抓不到），新贡献者必须读 JSDoc 或《11-扩展开发指南》SOP 一；D9（技术债台账）指出该 hook 自身无同目录单测，契约目前靠 ui 侧测试间接固化。

## ADR-008：外部 store（useSyncExternalStore）承载命令式状态

**背景**：通知队列、模态栈这类状态的共性是：跨组件树、命令式触发（请求拦截器里 `notifications.show()`）、生命周期不与单个组件绑定。放进 React Context 意味着必须先有组件树、再层层传递调度函数。

**备选**：Context + Provider 方法——调用方必须在组件内拿 hook；单例 EventEmitter + 每组件自订阅——订阅/清理样板重复且易漏；Redux/Zustand 等第三方——为一个队列引入状态管理依赖不成比例。

**决策**：`packages/ui/src/core/store/store.ts`（62 行）提供 `createStore` + `useStore`：闭包实现的 `getState/setState/updateState/initialize/subscribe`，订阅端用 React 19 的 `useSyncExternalStore`，且第三个参数（SSR 快照）与客户端快照同取 `getState()`。Notifications（`components/Notifications/notifications.store.ts`）与 Modals 命令式调用（`components/Modal/modal-stack.ts`）都构建其上。

**证据**：store.ts 第 23 行注释：「闭包实现而非方法 + this：解构使用（const { setState } = store）时不会丢失上下文」；notifications 的分桶与队列语义见《04-数据模型》第 6 节的命令流图。

**后果**：正面——`notifications.show()` 在任何模块可调（包括非组件代码），订阅粒度是 store 而非组件树深度，宿主 `<Notifications />` 只渲染一次；`initialize` 单次初始化语义支持宿主延迟设置默认值。负面——模块级 store 是单例：同页多实例、测试间状态泄漏都需要显式 `clean()`（Notifications 的测试与《09-测试与质量保障》都处理过这一点）；store 状态变化绕过 React DevTools 的 state 面板，调试要靠订阅日志。

## ADR-009：ESM 产物 banner 补 'use client'，CJS 不补

**背景**：库源码入口 `src/index.ts` 第 1 行写有 `'use client'` 指令（RSC 环境下的客户端边界声明，文档站的 Next.js 指南向用户承诺入口自带）。但 rollup 打包默认不保留入口模块的 directive 序言——产物里这条指令会静默消失。

**备选**：要求用户在 Next.js 里自己包一层 'use client'——违背「开箱即用」承诺且文档要改；用插件改写 rollup 输出——多一个构建依赖；`output.banner` 补回——零依赖，但需要分格式控制。

**决策**：`packages/ui/vite.config.ts` 与 `packages/hooks/vite.config.ts` 的 ESM 输出配置 `banner: "'use client';"`；CJS 输出**不加**。ui 配置注释给出了完整论证：「rollup 默认不保留入口模块的指令序言……banner 把它还给 ESM 产物。只给 ESM 输出加：CJS 输出以 'use strict' 开头，再插一条指令序言会静默削弱严格模式」。README「发布相关的坑」也收录了此条，并注明「preserveModules 下每个模块都带」。

**证据**：两个 vite.config.ts 的 output 段注释；根 README 发布相关坑清单第 4 条。

**后果**：正面——Next.js 等 RSC 消费方直接 import 即可，指令逐模块存在不依赖用户配置。负面——这是典型的「构建工具行为补丁」，若未来 rollup/vite 改变 directive 保留行为，这段 banner 可能变成重复指令（无害但需清理）；CJS 侧的「不加」是个必须记住的反直觉细节，新人容易「顺手统一」反而弄坏严格模式——这类知识现在只存在于注释与 README，属于口头传统，好在已经成文。

## ADR-010：纯 CSR 定位，不支持 SSR

**背景**：组件库做 SSR 支持意味着：样式注入要服务端抽取、浏览器 API 要守卫、hydration 不匹配要排查——每一项都是持续成本。而该库的主战场是管理端中后台，典型部署形态是 CSR 单页应用。

**备选**：全量 SSR 支持（Mantine/Chakra 路线）——工程成本高且管理端场景收益低；「支持但不承诺」——最差的选择，用户会在生产事故中才发现边界。

**决策**：`ADMIN-ROADMAP.md` 决策 4（2026-09-09 拍板）原文：「**不支持 SSR，纯 CSR 组件库**。无需做 Next.js兼容性摸底；实现可放开使用浏览器 API，但在文档首页与 README 明确声明 CSR 定位，避免用户误用」。P3 一节要求「README 与文档首页明确声明 CSR」。

**证据**：ADMIN-ROADMAP 决策清单；源码中大量直接使用浏览器 API 而无 SSR 守卫的事实（如观测器域 hooks）与这一决策互为印证。需要说明的是：'use client' 指令（ADR-009）与 `ColorSchemeScript` 防 FOUC 脚本的存在表明库对「被 RSC 应用以客户端组件方式消费」是友好的——CSR 定位不等于拒绝现代元框架，只是不承诺服务端渲染组件树。

**后果**：正面——实现自由度大（直接用 window/matchMedia/MutationObserver），省下整套 SSR 兼容层。负面——需要 SSR 的消费者（内容站、电商首页）被明确排除在目标用户外；未来若要反悔，补 SSR 的成本会随组件数量线性增长——所以这个决策越早拍板越便宜，2026-09-09 的时点算是止损点。（2026-10-06 回刷核实：文档首页 `apps/docs/docs/react/introduce.zh-CN.md` 已声明「纯 CSR 组件库，不支持服务端渲染（SSR）」，P3 的文档首页要求已落；根 README 未见 CSR/SSR 表述，README 侧声明仍缺，建议随 D4 一并补齐。）

## ADR-011：peer 下限对齐真实消费面（attachMediaListener 案例）

**背景**：ui 包的产物会 `import { attachMediaListener } from '@xiaoye-react/hooks'`——该导出是 hooks 1.4.0 才加入的。peer 范围如果写成宽泛的 `^1.0.0`，npm 会 happily 解析到 1.0.x，运行时直接炸。

**备选**：宽 peer + 文档提醒「请装新版」——把验证责任推给用户；锁死精确版本（`1.4.1`）——消费者被迫频繁升 hooks，与 hooks 独立演进矛盾；下限对齐真实消费面（`^1.4.0`）。

**决策**：`packages/ui/package.json` 的 peerDependencies 写 `@xiaoye-react/hooks: ^1.4.0`。根 README 不仅记载了这条坑，还把验证做成了流程：发布预检（`scripts/release.mjs --preflight`）会核对「ui 的 peer 下限对得上本次要发的 hooks 版本」，消费者侧复验脚本也显式 import `attachMediaListener`。

**证据**：README「发布相关的坑」第 2 条原文：「留 `^1.0.0` 会让 npm 解析到旧版并在 ESM 下报错」；`packages/hooks/src/use-media-query/` 的 `attachMediaListener` 模块级导出；《03-接口设计》第 7 节的版本兼容约定。

**后果**：正面——peer 范围从「礼节性声明」变成「可验证的契约」，预检+复验双闸兜底。负面——每加一个跨包导出都要求维护者同步评估 peer 下限，这是流程负担；且该案例揭示的泛化规则（peer 下限 = 产物实际 import 的最老导出）没有任何工具自动计算，目前靠 release.mjs 的静态核对与人肉判断（2026-10-06 回刷核实：preflight 的跨包验证是固定样本——`satisfiesCaret` 核对 ui 的 peer 下限与待发 hooks 版本，link 冒烟仅显式 import UIProvider/Button/useMatches、attachMediaListener 与 pro 三件合计 7 个具名导出，并不覆盖全部跨包导出）。

## ADR-012：质量棘轮——lint 警告只许调低

**背景**：存量代码总有历史告警，一次性清零不现实；但「先跑起来再说」的容忍会让告警数单调上涨。同样的两难出现在 exhaustive-deps、组件单测覆盖等所有质量指标上。

**备选**：一次性大扫除（清完再合入）——单人仓没有这个工时；不管——告警疲劳，真问题被淹没；棘轮——存量封顶、增量递减。

**决策**：根 `package.json` 的 `lint:es` 带 `--max-warnings=57`，CI 同款；`CONTRIBUTING.md`「债务政策」成文：「lint 棘轮与 exhaustive-deps 台账只许调低；『故意不修』的理由必须留在 `eslint.config.mjs` 的注释里，不留注释的豁免会被清掉」。配套裁决原则同样成文：「测试显式编码的行为 > 审查者直觉；争议项写『待裁决』」。

**证据**：eslint.config.mjs 的注释里保留了三轮治理的轨迹（145 → 78 → 57，见《13-技术债务与演进建议》D5/D6 与《09-测试与质量保障》第 6 节）；每个豁免注释都是一个微决策记录。

**后果**：正面——质量指标从「愿望」变成「硬约束」，豁免必须写理由等于强制留下 ADR 式注释，长期看 `eslint.config.mjs` 本身成了一部决策史。负面——57 这个数字没有内在含义，纯粹是治理时点的快照，新人容易误读成「目标值」；棘轮对「合理的临时上涨」零容忍（比如引入新规则的首日），按债务政策只能先豁免再逐步消化。

## 尾注：ADR 的维护机制

本篇 12 条记录中有 6 条的证据直接来自源码注释、4 条来自 CONTRIBUTING/README/ADMIN-ROADMAP 的成文章节、2 条来自配置文件本身——这个分布说明该仓库的决策记录习惯是「就地归档」：决策发生在哪里，记录就留在哪里。这套习惯的好处是证据永不失联（改代码的人顺手就能改注释），坏处是没有单一入口，接手者不知道去哪找全。《13-技术债务与演进建议》第 4 节建议的「每项债务一个锚点」机制可以平移到这里：后续新增的结构性决策，建议在对应源码位置留注释的同时，在本篇追加编号条目（格式沿用五要素），让「决策考古」逐渐变成「决策值班」——记录的成本发生在决策当天，是最低的。
