---
title: "16-决策记录ADR"
description: "项目：my-ts-axios ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析"
category: 项目文档

---
# 16-决策记录ADR

> 项目：my-ts-axios ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析

## 1. 本篇定位与体例说明

前 16 篇文档回答的是"系统是什么、怎么运行、怎么扩展"；本篇回答一个更古老的问题——**"为什么是这样，而不是别的样子"**。一个学习版库的价值有一半在于它的决策过程：每一个看似理所当然的写法背后，都有一组被放弃的备选方案和一段被规避的坑。本篇以架构决策记录（Architecture Decision Record，ADR）的体例，对全库 12 条关键决策做逐条考古。每条决策固定五个字段：**背景**（当时面对的问题与约束）、**备选方案**（被考虑过的其他做法及为何放弃）、**决策**（最终采纳的方案）、**源码证据**（决策落在哪个文件的哪些行，含设计注释与历史修复注释）、**后果**（这个决策带来的收益、代价与遗留约束）。

选择这 12 条的标准是"可从源码闭环验证"：每条都能给出文件与行号、设计注释或测试用例作为证据，不做任何无出处的推测。个别注释未明说意图、但行为可以从代码推断的，在正文中说明推断依据；确实无法闭环的，以 `⚠️ 待确认` 标注。阅读顺序建议：先通读第 3 节的决策总览表建立地图，再按兴趣跳读单条 ADR。与既有篇目的分工是——《01-系统架构》讲"决策形成的结构结果"，《02-模块设计》讲"决策在模块边界上的表达"，本篇讲"决策本身的来龙去脉"，三者互为表里，重复内容一律以「见《0X-xxx》」引用。

## 2. 决策记录

### ADR-001 函数即实例：混合对象设计，extend 沿原型链拷贝兼容 esbuild

**背景**。axios 的公开 API 是双形态的：它既要能像函数一样被直接调用（`axios(config)`、`axios(url, config)`），又要作为命名空间暴露大量成员（`axios.get`、`axios.interceptors`、`axios.defaults`、`axios.create` 等十余项）。TypeScript 的类型系统可以用接口交叉（`AxiosInstance extends Axios` 再加调用签名，见 `src/types/index.ts` 第 207~211 行）轻松描述这种形态，但运行时如何造出"一个既是函数又带全套属性的东西"，是所有 axios 复刻者遇到的第一道坎。

**备选方案**。其一，"类实例 + 调用转发"：让 `axios` 是一个普通对象，调用语法改为 `axios.request(config)`——放弃了 `axios(config)` 直接调用，与官方行为不兼容，学习价值大打折扣。其二，Proxy 动态转发：用 `new Proxy(fn, { get })` 把属性访问转发到内部实例——运行时每个属性访问都过一层 trap，调试时调用栈出现 Proxy 深帧，且在老 target 或某些打包器的语义保留场景下行为微妙，对一个教学库是不必要的复杂度。其三，Object.assign 拷贝到箭头函数：箭头函数没有 prototype 之外的问题，但 `Axios` 类的实例属性只有 `defaults` 与 `interceptors` 两个数据属性，方法全在原型上且不可枚举，`Object.assign(instance, context)` 一个方法都拷不到。

**决策**。`src/axios.ts` 第 18~23 行的 `createInstance` 三步走：`new Axios(config)` 得到完整实例 `context`；`Axios.prototype.request.bind(context)` 得到绑定 this 的裸函数——这就是"函数本体"；再由 `extend(instance, context)`（`src/helpers/util.ts` 第 21~38 行）把实例属性与原型方法拷贝到函数上。extend 的关键不是 `for...in`，而是其后的原型链遍历：`while (proto && proto !== Object.prototype)` 循环中用 `Object.getOwnPropertyNames(proto)` 拷贝每一个原型层级上的自有属性（跳过 `constructor` 与已存在键）。源码注释（第 25~27 行）明确记录了动因："ES6 class 方法是 non-enumerable，for...in 无法遍历到，需要额外沿原型链拷贝（兼容 Vite/esbuild 保留原生 class 语义的场景）"——即当示例工程用 Vite（esbuild 转译）直接 import 库源码时，class 方法不再被降级为可枚举属性，只靠 for...in 会漏拷全部方法，`axios.get` 直接 undefined。

**后果**。收益是双形态 API 零代理成本、零运行时开销，且 `createInstance` 成为 `axios.create` 的唯一复用点（第 28~30 行总是以全局 defaults 为底再叠加配置）。代价有三：其一，"拷贝的完整性"成为隐式契约——拷贝上去的方法内部 `this` 指向 `axios` 函数对象本身，依赖函数对象上存在拷来的 `defaults` 与 `interceptors`，若 extend 未来漏拷 `defaults`，所有方法族静默失效（见《07-模块详解》2.2 节）；其二，16 项静态 API（第 31~53 行）必须逐项手工挂载，新增静态成员容易遗漏，目前由 `scripts/smoke-dist.cjs` 的导出断言兜底（见 ADR-008）；其三，混合对象结构是 tree-shaking 的天然上限——所有方法都从同一个默认导出可达，见《10-性能设计与优化》5.2 节。

### ADR-002 拦截器编排：动态拼装的 Promise 链，请求拦截器 unshift 到链头

**背景**。拦截器机制要同时满足四个语义：请求拦截器先于请求执行、响应拦截器后于响应执行、请求拦截器对 config 的加工结果要依次传递、响应拦截器的 rejected 钩子要能捕获适配器与上游抛出的一切错误。需要一种能把"任意数量的拦截器"与"固定的分发环节"统一编排的模型。

**备选方案**。其一，显式洋葱中间件框架（koa 式 `next()`）：要求所有拦截器写成 `(ctx, next) => {}` 形态，与 axios 官方 `(config) => config` / `(response) => response` 的签名不兼容，也引入框架自身的学习成本。其二，事件发射器（emit 'beforeRequest'/'afterResponse'）：事件处理器的返回值无法自然地串联成数据管道，且异步处理器的完成时机难以约束。其三，两段独立遍历：请求前正向调用请求拦截器数组、响应后正向调用响应拦截器数组——逻辑直白，但"rejected 钩子捕获上游错误"与"错误跳过后续 resolved 钩子"这两个 Promise 原生语义需要手写状态机重新发明。

**决策**。把整个请求生命周期折叠为一条动态拼装的 Promise 链。`src/core/Axios.ts` 第 82~97 行：`chain` 数组以 `dispatchRequest` 居中，请求拦截器按注册序逐个 `unshift` 进链头（注释第 88 行明示"请求拦截器后添加的先执行"），然后 `while (chain.length)` 依次 `promise.then(resolved, rejected)`；响应拦截器按注册序追加到链尾（第 100~102 行）。请求链环的 `rejected` 位是 `undefined`（第 85 行），于是请求阶段任何一环抛错都会跳过 `dispatchRequest` 与后续请求拦截器，直达响应拦截器的 rejected 钩子——这是官方 axios 语义的精确复刻，且完全借用 Promise 原生行为，全库找不到任何 `next()` 样板（见《01-系统架构》第 4 节对责任链变体的辨析）。另一条常被忽略的证据是第 37~39 行被注释掉的第一版 `request`（直接 `return dispatchRequest(config)`）——它是刻意保留的演进线索，说明链式编排是在"最朴素的直调"基础上长出来的，而非过度设计。

**后果**。收益：拦截器与链路完全解耦（`InterceptorManager` 只是有序容器，`request` 每次请求现读现拼），eject 通过槽位置 null 实现且不影响进行中的请求；错误传播语义由 Promise 免费提供。代价：每个拦截器引入至少一个 microtask，链路延迟随拦截器数量线性增长——这正是 ADR-003 的直接动因（量化见《10-性能设计与优化》2.1 节）；此外链是每次请求现拼的，理论上无法在链级别做缓存优化，只能靠减少链环数量。

### ADR-003 synchronous 同步快路径：把 k 个 microtask 折叠为一次 then

**背景**。ADR-002 的常规路径中，n 个请求拦截器意味着 n+1 次 `then`，即至少 n+1 个 microtask 才能走到 `dispatchRequest`。对于"添加请求头、注入 token、打时间戳"这类纯同步加工，这些 microtask 是纯粹的调度开销；官方 axios v1.x 也因此引入了 `synchronous` 选项，本项目跟进对齐。

**备选方案**。其一，全局开关（`axios.defaults.syncInterceptors = true` 时所有拦截器同步执行）：粒度太粗，无法按拦截器逐个声明，也与官方 API 形态不符。其二，不分情况全部同步执行、拦截器返回 Promise 则警告：破坏了"拦截器可以返回 Promise 做异步预处理"的既有能力，且静默降级策略难以向使用者表达。其三，维持现状不做优化：对学习库而言省事，但错过官方 v1 新特性对齐（README Features 第 3 条明示支持）。

**决策**。`src/core/Axios.ts` 第 71 行 `const syncRequest = requestInterceptors.every(i => i.options?.synchronous === true)`——**全真才快**。快路径（第 74~80 行）在当前调用栈内倒序逐个调用 `conf = requestInterceptors[i].resolved(conf)`（注释明示"后添加的拦截器先执行（与原 unshift 顺序一致）"），最后只保留一次 `Promise.resolve(conf).then(dispatchRequest)`。只要有一个拦截器未声明 synchronous，整体回退 ADR-002 的常规链路径。测试落点在 `test/core/interceptorRunWhen.spec.ts`（时序行为断言，见《09-测试与质量保障》5.3 节）。

**后果**。收益：k 个同步拦截器的调度成本从 k+1 个 microtask 折叠为 1 个（《10-性能设计与优化》2.2 节的量化），且加工发生在调用栈内，配置快照的时序更可预测。代价与边界有二：其一，all-or-nothing——混合声明时快路径整体失效，这是保守而正确的选择；其二，一个容易忽视的语义差异：同步路径中拦截器的加工发生在 `Promise.resolve(conf)` **之前**的同一调用栈里，若某个同步拦截器抛出异常，该异常会从 `request()` **同步抛出**给调用方（常规路径下则表现为返回 rejected promise），调用方若只写 `.catch` 而不 `try/catch` 会漏接。源码对此未加 try/catch 保护，行为与官方 axios 一致，但使用者须知——见《12-FAQ与故障排查》2.5 节的关联条目。

### ADR-004 runWhen 条件执行：在收集阶段过滤，被过滤者连链都不进

**背景**。真实业务里大量拦截器是条件性的——"只在 `/api/renew` 路由时刷新 token"、"只在上传请求时加进度头"。若每次请求都执行全部拦截器再在内部自行短路，无谓的执行与 microtask 依然发生。

**备选方案**。其一，在链上为每个条件拦截器包一层 `if (runWhen(config)) return interceptor.resolved(config)` 的 wrapper：语义等价，但每个条件拦截器都多占一个链环，且 wrapper 的 rejected 位语义需要额外设计。其二，要求使用者在拦截器函数体内自行判断 config：把条件逻辑下放给每个使用者，重复且易漏。

**决策**。把过滤放在**收集阶段**：`src/core/Axios.ts` 第 54~68 行，`this.interceptors.request.forEach` 时先判 `typeof interceptor.options?.runWhen === 'function' && interceptor.options.runWhen(config) === false`，为真直接 `return`（不 push 进 `requestInterceptors` 数组），注释明示"应用 runWhen 过滤，与拦截器添加顺序一致"。被过滤掉的拦截器不进链、不产生 microtask、不参与 `every(synchronous)` 判定。选项接口 `InterceptorOptions<T>` 定义在 `src/core/InterceptorManager.ts` 第 3~6 行。

**后果**。收益是零成本的短路语义与官方 v1 行为对齐；过滤决策基于 mergeConfig 之后的 config 快照（第 51 行已完成合并），因此 `runWhen` 里可以读到最终生效的 method/url/headers。代价：`InterceptorOptions` 未进入 `src/types/index.ts` 的公共类型面，TS 使用者传第三参会有类型报错（运行时完全支持）——已在《13-技术债务与演进建议》2.6 节登记为低成本修复项。另需注意 runWhen 的执行时机是"每次请求的收集阶段"，若其中包含副作用（计数、日志），被过滤的请求不会执行这些副作用——这是特性也是约束。

### ADR-005 三适配器注册表与回退数组：构建期稳定、运行时表达环境差异

**背景**。同构库要回答"这段代码跑在浏览器/Node/Workers 里各用哪个传输实现"。方案选择影响包体积（是否把不适配环境的代码带进去）、失败模式（环境不符时构建失败还是运行时报错）与可配置性（用户能否强制指定）。

**备选方案**。其一，构建时环境探测二选一（打包器 `process.env.NODE_ENV` 替换或入口分文件）：每个环境只带自己的适配器，但要求打包器正确替换环境变量，且浏览器产物里 fetch 适配器与 Node 产物里 xhr 适配器成为死代码路径，适配器数组回退无从谈起。其二，运行时单选（有 XHR 用 XHR，否则看有没有 http 模块，再看 fetch）：逻辑集中但用户不可控，无法表达"优先 fetch，失败再 xhr"这类策略。其三，动态 import 适配器：适配器签名被迫异步化，`getAdapter` 返回 Promise，全链路类型与测试都要翻新。

**决策**。`src/core/getAdapter.ts` 第 10~14 行维护模块加载时求值的注册表：`xhr` 仅在 `typeof XMLHttpRequest !== 'undefined'` 时注册适配器函数、否则注册 `null`；`http` 与 `fetch` 无条件注册。解析函数（第 16~53 行）把 `config.adapter` 归一为数组——null 缺省为 `['xhr', 'http', 'fetch']`（第 22 行注释："与官方 v1.7+ 对齐：浏览器优先 xhr，Node 回退 http，最后兜底 fetch"），字符串/函数/其他非数组包成单元素数组——随后线性扫描：函数直接返回，字符串查表，查不到或表值为 null 静默尝试下一个，全部失败才抛出列出当前环境可用适配器的 Error（第 45~52 行）。fetch 适配器在运行时无全局 `fetch` 时以 `ERR_NOT_SUPPORT` 拒绝（`src/core/adapters/fetch.ts` 第 46~55 行），注册表本身保持稳定。

**后果**。收益：一张注册表同时服务三种环境，回退数组给了使用者细粒度控制（`adapter: ['fetch', 'xhr']`），环境差异全部推迟到运行时以统一错误形态表达。代价：所有适配器代码都进入每种产物（浏览器 UMD 里也带着 http 适配器——由 ADR-007 的 shim 机制兜住），体积见《10》5.1 节；此外 `adapter` 非法时的失败抛的是普通 `Error` 而非 `AxiosError`，错误码体系未覆盖该路径（《13》条目 4 的占位码讨论即源于此）。

### ADR-006 取消双轨并存：CancelToken 与 AbortSignal 各自完整实现，isCancel 统一判定收口

**背景**。取消机制存在新旧两代：旧版 `CancelToken`（executor 注入 cancel 函数）与新版 `AbortController/AbortSignal`（Web 标准）。官方 axios v1 双轨并存；对学习库而言，两代的实现差异本身就是教学内容。

**备选方案**。其一，只保留新轨：实现最省，但丢弃旧 API 兼容与教学对照价值，README Features 第 5 条明示"CancelToken 与 AbortController/AbortSignal 并存"是卖点。其二，以新轨为唯一实现、把 CancelToken 包装成 AbortSignal 的语法糖：两代语义并不完全同构（CancelToken 的 reason 是任意 `Cancel` 实例、可被多次订阅，AbortSignal 的 reason 是标准 reason 形态），包装层要处理大量边界，反而更复杂。其三，只保留旧轨：无视 Web 标准，方向性错误。

**决策**。两轨各自独立、完整实现。旧轨：`src/cancel/CancelToken.ts`（第 11~24 行把取消建模为手工 resolve 的 `Promise<Cancel>`，第 17~23 行的 cancel 闭包先判 `this.reason` 幂等）+ `src/cancel/Cancel.ts`。新轨：`src/cancel/CanceledError.ts`（继承 AxiosError、固定 `ERR_CANCELED`，第 18 行显式 setPrototypeOf 保证 instanceof 正确）+ 三适配器各自的 signal 处理（xhr 的 `processSignal`、http 的 abortCleanups 数组、fetch 的内部 AbortController 收敛三中断源，见《07-模块详解》第 4 节）。两轨在两处交汇：`dispatchRequest.ts` 第 50~58 行的预检双查（cancelToken.throwIfRequested 与 signal.aborted 各查一次），与 `Cancel.ts` 第 12~14 行的 `isCancel`（`value instanceof Cancel || value instanceof CanceledError`，注释明示"旧版 Cancel 与新版 CanceledError 都视为已取消"）。

**后果**。收益：调用方无论用哪轨取消，`axios.isCancel(e)` 的判定体验一致，错误都带 `ERR_CANCELED` 码（signal 轨与"取消发生在 dispatch 之前"的时序）；Promise 的多订阅语义天然实现"一个 token 取消多个并发请求"，无需自建监听器数组（见《01-系统架构》第 4 节）。代价：`Cancel` 与 `CanceledError` 是两个独立类（官方 v1 中 Cancel 是 CanceledError 别名），`instanceof` 行为与官方不同——已在《13》2.6 节登记为"保留并维持文档"的 D 级取舍；xhr 适配器为防泄漏引入 `removeAbortListener` 幂等清理（`xhr.ts` 第 34~39 行），http 适配器为此引入 abortCleanups 数组与包装后的 resolve/reject——双轨并存的复杂度税集中在适配器层。

### ADR-007 双端构建的 shim 抉择：抛错占位换零 external 浏览器产物

**背景**。http 适配器静态 import 了 `http/https/zlib/stream` 四个 Node 内置模块并可选 require `form-data`。浏览器构建若保留这些 import，产物在浏览器里无法解析模块名；若剔除 http 适配器，注册表与类型面断裂。

**备选方案**。其一，条件编译（注释指令或构建宏）：引入非标准语法，源码可读性受损，TypeScript 生态无一等公民支持。其二，拆分入口（`src/browser.ts` 只引 xhr/fetch，`src/node.ts` 引全部）：看似干净，但 `getAdapter.ts` 静态 import 三个适配器，拆分必须连注册表一起复制成两份，类型与实现开始漂移。其三，把 http 适配器改为动态 import：适配器解析被异步化，ADR-005 的同步线性扫描设计报废。

**决策**。Rollup 别名方案：`rollup.config.mjs` 第 14~15 行声明 `NODE_BUILTINS = ['http', 'https', 'zlib', 'stream']` 与 `EXTERNAL = ['form-data', ...NODE_BUILTINS]`——Node 构建全部 external（产物保持对真实内置模块的引用，不把 Node 源码打进去）；浏览器构建（第 20~23 行）把这五者全部 alias 到 `src/shims/node-builtins.ts`——一个 15 行的占位文件，`unavailable(module)` 工厂产出"调用即抛中文错误"的函数，具名导出 `request/createGunzip/createInflate/createBrotliDecompress/Readable/Transform`，default 导出对应 form-data。浏览器 UMD 产物因此零 external、自包含，`<script>` 标签可直接引入；http 适配器代码随包携带，仅在真正被调用时才触发占位实现抛错。可选依赖 form-data 另有第二层防御：`src/core/adapters/http.ts` 顶部的 try/catch require（约第 24~29 行），未安装时置 null 并在 `toNodeFormData` 走降级分支（字符串发送）。

**后果**。收益：一份源码、双端产物、浏览器包零依赖，且不需要任何条件编译语法（见《01-系统架构》3.7 节、《14-配置与环境详解》2.2 节）。代价是一个必须长期维持的**同步契约**：shims 的导出面必须与 http 适配器实际用到的内置 API 完全一致——目前覆盖六项导出，若 http 适配器未来引入新的内置 API（如 `http2`），shim 需同步补齐，否则浏览器构建要到**运行时**才暴露缺符号（构建期不报错，因为 alias 让解析总能成功）。Jest 覆盖率统计显式排除本目录（`package.json` `coveragePathIgnorePatterns` 第 83~87 行含 `/src/shims/`），因为占位代码无可测分支。

### ADR-008 CJS 输出 exports:'default'：一次坏包事故换来的产物契约

**背景**。库的源码只有 `export default axios` 一个导出（`src/index.ts`），Rollup 的 CJS 输出在默认导出场景下有两种翻译方式：`module.exports = axios`（default 模式）或 `exports.default = axios` 配 `__esModule` 标记（named 模式）。前者让 `require()` 直接得到 axios 函数，后者让 `require()` 得到 `{ default: axios }` 包装——所有 CJS 消费方的 `axios.get` 变成 undefined。

**备选方案**。其一，named 模式 + 让 CJS 使用者写 `require('x').default`：把互操作成本转嫁给全部 CommonJS 消费方，违背 Node 生态"默认导出直出"的惯例。其二，源码改成同时具名导出：类型面与 smoke 断言全部翻新，且 ESM 侧 `import axios from` 的主形态没有变化收益。其三，不做处理，文档里写清楚：不可靠，事故证明使用者不会读文档。

**决策**。`rollup.config.mjs` 第 42 行 CJS 输出显式声明 `exports: 'default'`，UMD 输出（第 56 行）同样；第 36~38 行的注释完整记录了理由："ESM 源只有 default 导出，CJS 用 exports:'default' 直接 module.exports = axios，保证普通 require() 拿到 axios 函数本身（而非 { default } 包装，那会破坏所有 CJS 消费方）"。并且把"导出形态正确"固化为发布闸门：`scripts/smoke-dist.cjs` 头部注释（第 1~3 行）记录了事故本身——"此前曾因 CJS 输出 named 导出发出过 require() 拿到 { default } 包装的坏包"，其第 9~33 行以消费者身份 require 三种产物并逐项断言（`typeof axios === 'function'`、get/post 存在、16 项静态成员齐全、VERSION 与 package.json 同步——第 52~57 行注释说明 VERSION 曾与发布版本脱节）。

**后果**。收益：CJS/UMD 两类消费方的体验与直觉一致，坏包事故被测试闸门永久锁死（这正是《13》第 4 节总结的"每次修复留一行注释 + 一个回归用例"传统的源头案例）。代价：`exports: 'default'` 意味着将来若源码新增具名导出，CJS 侧的翻译策略需要重新评估；TS 的 CJS 消费方在 `import axios = require(...)` 或 `esModuleInterop: false` 场景下对 default 直出的解析依赖各自配置，边界形态由《12-FAQ与故障排查》2.2 节专门解释。

### ADR-009 jasmine-ajax 兼容引导：为 xhr mock 生态自建引导层

**背景**。xhr 适配器是浏览器的第一适配器，测试它最成熟的方式是 jasmine-ajax——它接管真实 XMLHttpRequest，可断言请求头、请求体并回放伪造响应。但 Jest 27 起移除了内置 jasmine 运行器（jest-circus 取代），jasmine-ajax 仍依赖 jasmine 全局，两者在 Jest 29 下原生不兼容。

**备选方案**。其一，迁移 Vitest：现代、快，但 jasmine-ajax 的兼容问题原样存在，且整仓测试基建翻新对学习库是无关变量的大规模扰动。其二，放弃 jasmine-ajax，用 Jest 手写全套 XHR mock：xhr 适配器有 open/send/setRequestHeader/onreadystatechange 等十余个交互面，手写 mock 工作量大且保真度低于成熟实现。其三，降级测试目标——xhr 适配器只在浏览器手工验证，Jest 覆盖不到：与 90% 覆盖率门槛（ADR-010）直接冲突。

**决策**。自建兼容引导层：`test/boot.ts`（39 行）挂在 package.json jest 段的 `setupFilesAfterEach` 位置（源码键名为 `setupFilesAfterEnv`，见 package.json 第 100~102 行），手动引导独立 jasmine-core 环境：以 `JasmineCore.core(JasmineCore)` 构造实例、调用 `getEnv()`、把 `getJasmineRequireObj` 与 `jasmine` 挂到 globalThis（第 7~17 行），随后在 jsdom 环境加载 jasmine-ajax（第 20~22 行）。两个关键的"不要做"也以注释固化：不要把 `jasmineRequire.interface` 挂到 global——会用 jasmine 的 expect/test 覆盖 jest-circus 同名全局导致全部用例失效（第 5~6 行）；局部变量不能叫 `jasmine`——与 @types 声明的全局命名空间冲突（第 10 行）。boot.ts 还顺带剥离七组代理环境变量（第 24~38 行），防止开发机代理劫持 http 适配器的集成测试。

**后果**。收益：以 39 行代码接入成熟 XHR mock 生态，`test/xhr.spec.ts`、`test/xsrf.spec.ts`、`test/core/AxiosForm.spec.ts` 等用例得以断言真实的请求头与请求体（见《09-测试与质量保障》第 3 节）。代价：jasmine-core 被锚定在 3.x 大版本（`package.json` 第 140 行 `"jasmine-core": "^3.4.0"`，注释明示 jasmine-core@3 的模块导出形态是兼容前提），升级 jasmine-core 4/5 或 jasmine-ajax 大版本时引导层需要重新验证；这是全仓测试栈中最"脆"的一环，也是《13》未列入债务但值得知晓的隐性版本锚点。

### ADR-010 90% 覆盖率硬门槛：测试即门禁

**背景**。学习项目最常见的退化路径是"测试先全绿、后荒芜"：没有强制力的覆盖率数字会随每次功能冲刺悄然滑坡，最终报告变成装饰。

**备选方案**。其一，不设门槛只在 CI 输出报告：数字可见但无约束力，滑坡不可逆。其二，设更低门槛（如 70%）：起步容易，但对这个体量（src 共 29 个文件、约 3000 行）的纯函数为主的库偏宽。其三，设 100%：需要大量为环境探测、浏览器分支编写的测试，jsdom 里部分分支（如 `typeof document === 'undefined'`）结构上不可达，强行凑数会产生无意义的测试。

**决策**。`package.json` 第 88~95 行设置四项全局阈值：branches 80 / functions 85 / lines 90 / statements 90——分支最低、行数次之，这个梯度精确匹配库的形态（环境探测分支多且部分不可达，纯函数的行覆盖则可以拉满）。`npm test` 固定带 `--coverage`（第 51 行），覆盖率不达标即测试失败，CI 的 Test 步骤（`.github/workflows/ci.yml` 第 28~29 行 "Test (with coverage thresholds)"）因此成为硬门禁。豁免面受控收敛：`coveragePathIgnorePatterns` 只排除 node_modules、test 与 shims 三类；源码内的 `istanbul ignore` 注释全库仅 3 处且各有"结构上不可达"的理由（《13》2.6 节登记防滥用扩散）。

**后果**。收益：29 个源文件全部处于测试压力之下，settle/mergeConfig/transform 等纯函数的测试密度反过来倒逼了无状态设计（依赖注入与环境探测内聚）；`test/core/settle.spec.ts` 等文件中的历史回归注释证明门槛确实拦住了行为漂移。代价：贡献新代码必须配对测试，贡献成本抬高（这是有意的）；覆盖率指标本身可能诱发"为数字而测试"——目前源码注释与测试注释的健康程度说明尚未发生；CI 无覆盖率产物化（报告不进 PR 页），《13》条目 8 缺口三已登记改进方向。

### ADR-011 settle 收敛成败判定：修一处即修三端

**背景**。三个适配器都要回答同一个问题："拿到响应后，resolve 还是 reject？4xx 与 5xx 的错误码如何区分？"若各适配器自行实现，行为漂移几乎必然发生。

**备选方案**。其一，各适配器内置判定：逻辑重复三份，历史上确实出过问题——`test/core/settle.spec.ts` 的注释记录了"http 适配器此前反转"过 4xx/5xx 错误码的回归。其二，把 settle 的职责并入 dispatchRequest：判定需要发生在"适配器拿到原始响应"的时刻，http 适配器的流式路径在 data 事件累积阶段就可能要放弃请求，判定时机必须留在适配器内部、判定标准收敛到外部。

**决策**。`src/core/settle.ts`（33 行）作为三适配器共享的最终裁判：`validateStatus` 放行即 resolve；否则按 `status >= 500 ? ERR_BAD_RESPONSE : ERR_BAD_REQUEST` 生成错误（第 20~21 行），并通过 `createError` 第 6 参把数值状态写入 `error.status`（第 29 行）。三个放行条件的精确语义——`!response.status`（状态码 0 的边缘形态）、`!validateStatus`（未配置则全放行）、`validateStatus(response.status)`——见《07-模块详解》3.7 节。三个适配器（xhr 第 79 行一带、http 第 233 行一带、fetch 第 220 行一带的组装点）都以同一签名调用它。

**后果**。收益：判定逻辑只有一份，三端行为天然一致；那次错误码反转回归修复时"修一处即修三端"，回归用例同时锁死三端。代价：settle 的签名（resolve/reject/response/config 四参）把它的使用场景锚定在 Promise executor 内部，若有第四种适配器形态（回调式）接入，需要先行包装成 Promise——与 `AxiosAdapter = (config) => AxiosPromise` 的签名约束一致，属于可接受的收敛。

### ADR-012 mergeConfig 策略表与无原型对象：合并行为可枚举、合并结果不可注入

**背景**。配置合并要处理三类语义不同的字段：url/params/data 只认本次请求、headers/auth 需要深合并、其余"本次优先缺省回退"。同时，合并结果对象会流经整条请求链并被适配器消费，其原型形态有安全含义。

**备选方案**。其一，if/else 平铺在 mergeConfig 函数体内：字段数量增长时函数膨胀，新增配置项要改核心函数。其二，字面量策略表 `const strats = { url: ..., headers: ... }`：表会继承 `Object.prototype` 的全部键，`mergeField` 里 `strats[key] || defaultStrat` 在 key 为 `constructor`/`toString` 时误命中原型方法——若 key 来自外部输入即构成原型链注入面。其三，合并结果用普通对象字面量：调用方可经由合并产物的原型链（`config.constructor` 等）做意外的属性解析。

**决策**。策略模式 + 双重无原型。`src/core/mergeConfig.ts` 第 4 行 `const strats = Object.create(null)` 建策略表（三类策略：`fromVal2Strat` 覆盖 url/params/data，`deepMergeStrat` 覆盖 headers/auth，其余走 `defaultStrat`）；第 53 行 `const config = Object.create(null)` 建结果对象；`mergeField`（第 66~70 行）查表命中策略函数、未命中回落 defaultStrat。深合并策略还有一个容易忽略的细节（第 30~33 行）：config2 未给出该字段而 config1 是普通对象时，`deepMerge(val1)` **深拷贝默认值返回副本**，避免实例默认配置被单次请求的就地修改污染。第二轮遍历（第 60~64 行）只合并 config2 中值为 undefined 的键，注释强调"已显式给出（含 falsy 值）的字段不再重复合并"——`timeout: 0` 是有效配置而非缺省。

**后果**。收益：新增配置项默认获得"本次优先、缺省回退"的合理行为，零成本接入（扩展流程见《11-扩展开发指南》SOP 三）；无原型结果对象切断了经由配置对象的原型链把戏（安全分析见《08-安全与权限设计》2.3 节）；深拷贝语义保证了多实例、多请求之间 defaults 的隔离。代价：`deepMergeStrat` 对 headers/auth 的深合并在每次请求都产生新对象（《10》3.1 节计入"每次请求的固定税"）；`fromVal2Strat` 对 `data: null` 的语义是"以 null 为准而非继承默认"，与 defaultStrat 的 falsy 直觉不同，使用者须知（《07》3.3 节）。

## 3. 决策总览

| 编号 | 决策 | 一句话理由 | 关键源码锚点 |
| --- | --- | --- | --- |
| ADR-001 | 混合对象 + extend 沿原型链拷贝 | 双形态 API 零代理成本；esbuild 场景 for...in 漏拷是真实事故 | `src/axios.ts` 第 18~23 行、`src/helpers/util.ts` 第 21~38 行 |
| ADR-002 | 拦截器编排为动态 Promise 链 | 借 Promise 原生语义免写责任链样板 | `src/core/Axios.ts` 第 82~97 行 |
| ADR-003 | synchronous 同步快路径 | 折叠 microtask；全真才快，all-or-nothing | `src/core/Axios.ts` 第 71~80 行 |
| ADR-004 | runWhen 在收集阶段过滤 | 被过滤者连链都不进，零 microtask | `src/core/Axios.ts` 第 54~68 行 |
| ADR-005 | 适配器注册表 + 回退数组 | 构建期稳定，环境差异推迟到运行时 | `src/core/getAdapter.ts` 第 10~53 行 |
| ADR-006 | 取消双轨并存，isCancel 收口 | 新旧 API 兼容与教学对照兼得 | `src/cancel/Cancel.ts` 第 12~14 行 |
| ADR-007 | shims 抛错占位换零 external | 浏览器产物自包含，无需条件编译 | `src/shims/node-builtins.ts`、`rollup.config.mjs` 第 19~23 行 |
| ADR-008 | CJS exports:'default' | require 直得函数；坏包事故固化为冒烟闸门 | `rollup.config.mjs` 第 42 行、`scripts/smoke-dist.cjs` |
| ADR-009 | jasmine-ajax 自建兼容引导 | 39 行接入成熟 XHR mock 生态 | `test/boot.ts` 全文 |
| ADR-010 | 90% 覆盖率硬门槛 | 测试即门禁，防覆盖率滑坡 | `package.json` 第 88~95 行 |
| ADR-011 | settle 收敛三端判定 | 判定逻辑一份，修一处即修三端 | `src/core/settle.ts` 全文 |
| ADR-012 | 策略表与无原型合并对象 | 新配置项零成本接入 + 原型链注入面封死 | `src/core/mergeConfig.ts` 第 4/53 行 |

## 4. 小结

把 12 条决策并置观察，可以提炼出三条一以贯之的决策价值观。**第一，用语言原语替代框架样板**：Promise 链替代责任链样板（ADR-002）、Promise 多订阅替代监听器数组（ADR-006）、绑定函数替代 Proxy 转发（ADR-001）——模式的行为保真了，实现复杂度压到最低。**第二，把环境差异从构建期推迟到运行时**：注册表构建期稳定而 fetch 以 ERR_NOT_SUPPORT 运行时拒绝（ADR-005）、浏览器构建以占位 shim 换取零 external（ADR-007），两者共同支撑"一份源码、双端产物"的同构承诺。**第三，事故要留下化石**：extend 的 esbuild 漏拷注释、smoke-dist 的坏包记录、settle.spec 的错误码反转注释——每次踩坑都在源码里留一行注释、在测试里留一个回归用例（ADR-001/008/011 均有对应化石）。这第三条其实是前两条能长期维持的前提：决策的理由如果只存在于维护者的记忆里，下一个改动就会不知不觉把它推翻。本篇与《13-技术债务与演进建议》互为镜像——ADR 记录"为什么当初这样做"，技术债务记录"现在这样做付出了什么"；两份清单合读，才是这个库的完整决策史。
