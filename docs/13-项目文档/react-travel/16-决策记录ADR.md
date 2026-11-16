---
title: "16-决策记录 ADR"
description: "项目：react-travel ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析"
category: 项目文档

---
# 16-决策记录 ADR

> 项目：react-travel ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析

## 1. 本篇定位与考古方法

架构决策记录（Architecture Decision Record，ADR）回答的不是"系统是什么"——《01-系统架构》已经完成了这件事——而是"为什么当时是这样而不是别样，代价是什么，什么条件下应该推翻"。react-travel 的特殊性在于它是一次**有完整书面计划可考的迁移**：仓库根的 `NEXT_MIGRATION_PLAN.md` 写于动工前，逐条记录了当时看到的现状、拟定的方案与验证标准；而最终落地的源码（`app/`、`lib/`、`client/`、`prisma/`）是决策的"判决书"。把这两份证据放在一起对照，就能得到比一般项目可靠得多的决策考古：计划文档提供"当时的备选与理由"，源码提供"最终选择与实际后果"，两者的偏差本身就是最有信息量的记录——偏差处一定发生了某种"计划时没料到的事"。

本篇收录 12 条决策，编号 ADR-01 到 ADR-12，每条按五段组织：**背景**（当时面对的问题与约束）、**备选**（考虑过或本可考虑的其他方案）、**决策**（实际怎么做）、**证据**（源码位置与关键注释，均可逐行核对）、**后果**（正反两面的代价，以及与既有篇目债务条目的关联）。阅读顺序无依赖，但建议先读《01-系统架构》§2 与《13-技术债务与演进建议》§1，否则部分"后果"段的引用没有上下文。需要声明口径：本篇只记录"源码与计划文档可以证明"的决策，作者头脑中未落盘的考量一律不写，凡证据不足处标注 ⚠️ 待确认。

## 2. ADR-01 迁移总策略：不重写前端，src/ 整体平移 + 垫片兼容

**背景**：迁移前的前端是标准 CRA SPA（`react-scripts 5.0.1` + `react-router-dom@6` + Redux Toolkit + antd v5），16 个视图组件与 14 个通用组件全部依赖 react-router 的 Hook API 与 CRA 的静态图片 import 语义。重写意味着：业务逻辑零复用、迁移期间新旧两套 UI 并行维护、以及每一处"顺手优化"引入的新 bug。**备选**有三条路：全量重写为 RSC 架构（成本最高，SEO 收益最大）；逐页重写、新旧路由并存（管理两套路由与两套构建的复杂度不低）；整仓平移 + 兼容层（一次性写好三根支柱，旧组件零改动）。**决策**：选择第三条——`client/`（原 `src/` 平移）继续作为可渲染的 UI 组件库，`app/` 层的 page.tsx 只做数据获取与外壳，通过 `lib/router.tsx`（react-router-dom 同名 API 垫片）、`next.config.js` 的 `images.disableStaticImages: true` + webpack `asset/resource` 规则、以及 `/auth/:path*` rewrite 三处基础设施实现"零改动运行"。`NEXT_MIGRATION_PLAN.md` K 节"关键决策 1"原文即为"不重写 src/：用 webpack.alias 把 react-router-dom 指向 lib/router-shim.tsx，src 组件零改动"。**证据**：`lib/router.tsx` 导出与 react-router 同签名的 `useNavigate/useParams/useLocation/Link/Navigate`；`next.config.js` 底部注释记录了 redirects 方案不可用的原因；`types/assets.d.ts` 为图片 import 提供类型声明。**后果**：迁移窗口内功能零回退、构建门禁（tsc + build）始终可验收，这是迁移能单人完成的先决条件；代价是《13-技术债务与演进建议》D4 记录的长期腐蚀——双数据源约定让每个视图多一个 `initialXxx?` 分支，垫片与原生 API 并存持续收心智税，退役需要四轮计划（见《13》§3）。

## 3. ADR-02 数据库：MySQL/Sequelize 切换 PostgreSQL + Prisma

**背景**：原 Egg 后端用 MySQL（`egg_house` 库）+ `egg-sequelize`，ORM 的模型定义散落在 server 仓库的 `app/model/*.js`，与前端类型完全脱节；迁移要同时重建数据访问层，是更换 ORM 时机成本最低的点。**备选**：保留 MySQL 只换 ORM 到 Prisma（可少一次数据库迁移，但放弃 PG 的 advisory lock、更严谨的事务隔离与 JSON 能力）；或用 TypeORM/Kysely 等替代 Prisma。**决策**：`NEXT_MIGRATION_PLAN.md` §0 明确"已决定切换为 PostgreSQL，数据访问层统一用 Prisma"，并采用 Prisma 7 的 `prisma-client` 生成器（产物输出 `generated/prisma/`）+ `@prisma/adapter-pg` 驱动适配器（`lib/prisma.ts`），schema 单一来源收口到 `prisma/schema.prisma`。**证据**：`lib/prisma.ts` 全文 20 行——`PrismaPg({ connectionString })` 注入适配器、`globalThis` 单例防 dev 热重载反复建连、按 `NODE_ENV` 分级日志；`prisma/schema.prisma` 的 `generator client` 块与 `datasource db` 块（url 外置到 `prisma.config.ts`，Prisma 7 新约定）。**后果**：正面的收益在后续决策里反复兑现——ADR-09 的 `pg_advisory_xact_lock` 依赖 PG 特有能力；Prisma 的 P2002/P2025 错误码让幂等语义可以精确映射；生成的 TypeScript 类型是全仓类型链的底座（《09-测试与质量保障》§2.1）。代价：`generated/prisma` 生成物必须与 schema 严格同步（切分支后要先 `pnpm prisma:generate`）；建表只走 `prisma db push` 无迁移历史（《06-部署运行》§5.5 的三条操作纪律即为此而来）；旧 MySQL 数据要靠一次性脚本 `scripts/migrate-mysql-to-pg.ts` 搬运（已完成使命留存仓库）。

## 4. ADR-03 密码方案：从"保留 md5"到 bcrypt/md5 双轨的决策演进

**背景**：存量用户密码以 `md5(password + salt)`（salt=`xiaoye`）存储。`NEXT_MIGRATION_PLAN.md` §0 的原话是"密码方案保留 md5(password + salt)，不引入 bcrypt——否则存量用户密码全部失效"，这是计划时点的决策。**备选**：一刀切 bcrypt（存量用户全员重置密码，体验事故）；引入 passwordVersion 列区分新旧（多一列、多一处分支，但语义显式）；按哈希形态自识别双轨（无 schema 变更）。**决策**：落地时在"保留 md5 兼容存量"的前提下**追加了 bcrypt 作为新账户标准**——`lib/password.ts#hashPassword`（bcrypt 12 轮，`SALT_ROUNDS = 12`）用于注册与种子，`verifyPassword` 以"存储哈希是否以 `$2` 开头"分流：`isBcryptHash` 命中走 `bcrypt.compare`，否则走 `md5Password(password) === stored` 比对。注意这是**计划与落地的已知偏差**：计划说不引入 bcrypt，源码引入了双轨——以源码为准（差异清单另见《13-技术债务与演进建议》D11）。**证据**：`lib/password.ts` 全文 38 行，注释写明"兼容 bcrypt 与老 md5 账户，实现渐进迁移""不强制改密，避免破坏现有测试账号"；`prisma/seed.ts` 第 51-53 行注释确认种子账号也走 `hashPassword`（并记录了早期"seed 直接写死 md5 导致 demo 账号全部无法登录"的历史教训）。**后果**：新账户获得 12 轮 bcrypt 强度，存量账户无需任何操作即可继续登录；代价是 md5 分支没有升级回写（登录成功也不换哈希），弱哈希存量长期存在——《13》D5 给出的一行式修复（md5 命中后 fire-and-forget 回写 bcrypt）至今未实施；另外双轨判定不依赖额外字段意味着 password 列是"两种格式共存"的混合态，排查登录问题时要先看哈希形态（《12-FAQ》坑 6）。

## 5. ADR-04 客户端状态：计划保留 Redux Toolkit，落地 Zustand

**背景**：CRA 时代的 Redux Toolkit + redux-persist 承担 7 个业务域的状态（user/cart/order/productDetail/productSearch/recommend/favorite），`NEXT_MIGRATION_PLAN.md` §1.1 的迁移动作写的是"保留 RTK 客户端状态；修复 SSR 持久化"。**备选**：按计划保留 RTK（样板多，PersistGate 的 SSR 防崩要额外处理）；换 Jotai/Recoil 等原子化方案（与旧代码的 slice 结构差异更大）；Zustand（create 一行建店、selector 订阅、无 Provider 包裹、可手工控制持久化）。**决策**：实际代码中 RTK 完全消失，7 个 store 以 `client/stores/useXxxStore.ts` 的 Zustand 形态重写，`redux-persist` 的 PersistGate 被替换为"store 内 `_hydrate()` + `hydrated` 位 + `app/providers.tsx` 的 `useIsomorphicLayoutEffect` 统一水合"的手工协议。**证据**：`client/stores/index.ts` 桶导出 7 个 zustand store；`app/providers.tsx` 中水合序列的调用点；全仓 grep 无 `@reduxjs/toolkit`、`react-redux`、`redux-persist` 引用（`package.json` 的 24 个依赖中亦无）。**后果**：正向——去掉 action/reducer 样板后每个 store 的代码量大幅缩减，`useIsFavorited` 这类派生 hook 与 selector 订阅让重渲染粒度可控（《10-性能设计与优化》§6）；水合协议显式化后，"首帧 localStorage 未恢复"从隐式竞态变成显式状态机（《09-测试与质量保障》§3 第 2 条）。代价——这是一次计划外的重写，7 个 store 的行为等价性只能靠人工冒烟保证（当时零测试）；且手工水合协议成为新 store 的强制契约，漏写 `hydrated` 位会复现水合竞态（《11-扩展开发指南》§4 把它列为验收项）。

## 6. ADR-05 会话凭证：Bearer header 优先，middleware 只做粗过滤

**背景**：原 Egg 用 `egg-jwt` 读 `header.token`，但前端 slice 实际发送的是 `Authorization: bearer <jwt>`——计划文档 §0 判定这是"线上已不兼容的遗留"，token 通道需要重新定。同时鉴权还有一个结构问题：Edge Runtime 的 middleware 无法运行依赖 Node crypto 的 `jsonwebtoken`。**备选**：httpOnly Cookie 方案（计划 §4.3 的"方案 B"，支持受保护页 SSR、更安全，但要改登录流并补 CSRF 防御）；维持 localStorage + Bearer（计划"方案 A"，改动最小）；server-side session（引入服务端会话存储，与 JWT 的无状态优势冲突）。**决策**：按方案 A 落地——token 由 `lib/auth.ts#signToken` 签发后存 localStorage（`client/stores/useUserStore.ts` 的 `travel_user` 键），axios 拦截器（`client/lib/http.ts#installAuthInterceptor`）自动附 Bearer 头；`middleware.ts` 明确不做签名校验，只检查"是否有 Bearer 头或 token Cookie"（PROTECTED_API 前缀粗过滤），真正的 `requireAuth`（验签 + 可选 Redis 存在性比对）在每个 Route Handler 内。计划 §E 记载的"方案 A 最小化：登录写 Redis，detail 校验；后续可平滑切方案 B"即为该决策的原始表述。**证据**：`middleware.ts` 第 3-4 行注释"真正的 JWT 校验在各 Route Handler 的 requireAuth 中完成，这里只做……粗过滤，避免在 Edge Runtime 跑 jsonwebtoken"；`lib/auth.ts#getTokenFromCookie` 只读不写（Cookie 通道为方案 B 预留，现状无写入方，《08-安全与权限设计》§2.4）。**后果**：受保护页面无法 SSR 守卫（HTML 层无服务端会话），页面级安全交给客户端 `AuthGuard` + API 层鉴权兜底，这是可接受的设计而非漏洞（《08》§3.1）；Cookie 通道的预留代码长期处于"有读无写"状态，若未来启用必须补 CSRF 防御；middleware 前缀列表成为新增接口时的维护纪律点（《08》§3.1 局限三）。

## 7. ADR-06 缓存分级：首页 ISR 60s、内容页 3600s、详情/搜索刻意动态

**背景**：迁移目标是"首屏由 SSR/RSC 渲染，提升 SEO 与首屏速度"，但不同页面的数据时效诉求差异巨大：首页推荐按 `showCount` 排序（分钟级变化即可接受）、目的地/专题/游记是低频运营内容、详情页要实时自增浏览量、搜索词空间无限。**备选**：全站 SSG（SEO 最好但数据死）；全站动态渲染（数据最新但每次请求都查库）；按页面分级。**决策**：分级——`app/page.tsx` 声明 `export const revalidate = 60`；`app/destinations|topics|reviews/page.tsx` 声明 3600；详情页与搜索页**刻意不设 revalidate**，保持动态渲染。**证据**：`app/page.tsx` 第 9 行的 revalidate 声明；`app/detail/[touristRouteId]/page.tsx` 内注释"不设 revalidate——浏览量自增需实时"；`app/search/[keywords]/page.tsx` 注释"搜索词多变，不设 revalidate"；`app/sitemap.ts` 的 `revalidate = 3600` 与内容页对齐。**后果**：首页获得"60 秒缓存窗口内零 DB 查询"的突发流量免疫力（stale-while-revalidate 语义，先回旧 HTML 再后台重建）；代价有三——ISR 缓存重启清空、发布后要预热（《06-部署运行》§4.3）；构建期库不可用会产出空态 ISR 页（《12-FAQ》坑 5）；详情页因动态渲染放弃了缓存命中，成为《10-性能设计与优化》§7 优化建议 2（selective revalidate 拆分读取与计数）的由来。

## 8. ADR-07 双链路：RSC 直取失败降级为客户端回退，两链路共用服务层

**背景**：RSC 直取让页面首屏直出，但引入新风险——DB 不可用时内容页整体 500。对个人维护的单实例站点，"页面挂着"比"页面空着但能交互"严重得多。**备选**：直取失败返回错误页（把故障暴露给用户）；直取失败重试（治标，DB 真挂时只是延迟 500）；直取失败静默降级、由客户端 store 走 `/api/*` 兜底（多一条链路的维护成本，换可用性）。**决策**：第三条，并配套一条铁律——**RSC 与 API Handler 必须调用同一个 `lib/services` 函数**，保证两链路数据形状逐字节一致。页面侧全部 try/catch：catch 里 `console.warn("[page:/xxx] ...")` 后返回**不带 props** 的视图组件；视图组件以 `initialXxx?` 可选 props 区分数据源，缺失时走 store 拉取。**证据**：`app/page.tsx` 的 try/catch 降级与 `client/views/home/HomePage.tsx` 的 `recommendedFetched` ref 守卫；`app/detail/[touristRouteId]/page.tsx` 用 React `cache` 包装 `getDetailVM` 使 Page 与 `generateMetadata` 共享单次查询；`lib/services/productCollections.ts#getHomeCollections` 同时被 `app/page.tsx` 与 `app/api/productCollections/route.ts` 调用。**后果**：DB 故障从"页面 500"降格为"慢一拍的正常页面"，这是全项目最重要的可靠性设计（《01-系统架构》§3）；代价是每个视图组件都要实现双数据源合并（搜索页的 `injectedActive` 判定最复杂，见《07-模块详解》§3.2），并且降级是静默的——只在服务端日志留 `[page:...]` 前缀警告，观测不足时用户可能长期处在"降级空态"而不自知（《09-测试与质量保障》§4 项 3 的 View Source 检查即为此设计）。

## 9. ADR-08 数据建模：购物车 = Orders(isPayed=0)，不建独立购物车表

**背景**：imooc 原型系统里"购物车"与"订单"是同一个 Orders 概念的两态；迁移时要决定是忠实复刻还是规范化拆表。**备选**：拆 Cart 与 Order 两表（模型清晰，但结算/支付要多一次跨表数据搬迁，且旧前端的数据形状按"购物车行即订单行"设计）；维持一体两面（表少、支付就是状态翻转、旧形状零适配）。**决策**：维持一体——`lib/services/cart.ts` 第 4 行注释即"购物车 = Orders 表中 isPayed=0 的行（与原 imooc shoppingCart 语义对齐）"，支付是把行置 `isPayed=1` 并生成共享订单号，无独立购物车表。**证据**：`prisma/schema.prisma` 的 Orders 模型（`isPayed Int @default(0)`、`@@index([userId, isPayed])` 索引同时服务购物车与订单 Tab 两个高频查询）；`lib/services/cart.ts` 与 `lib/services/orders.ts` 按 `isPayed` 分治；`lib/vm.ts#orderToCartItem/ordersToCheckoutOrder` 把行翻译成前端期望的形状。**后果**：加购/结算/支付的数据流极简（结算甚至是纯视图转换不落库，见 `app/api/shoppingCart/checkout/route.ts` 注释"不落新表，复用购物车行"），代价是《04-数据模型》§1 点名的"名实错位"——`House` 实为旅游线路、`Orders` 一体两面，schema 阅读必须以文档校准；且若未来接真实支付网关，必须新增支付单表终止一体两面（《13-技术债务与演进建议》§4 候选项一）。

## 10. ADR-09 加购并发：pg advisory lock 而非唯一约束

**背景**：快速双击"放入购物车"会发出两个并发 POST，两个请求都在"查重"步骤读到"不存在"，然后各自插入——重复加购。常规解法是数据库唯一约束。**备选**：`(userId, houseId, isPayed)` 唯一约束（最简，但会阻断同一房源的"再次购买"——买过一次、支付后想再买是合法业务）；应用层锁（单实例可用，多实例失效，且 Node 侧锁不可靠）；PG 事务级 advisory lock（把"查重→插入"串行化，粒度可控）。**决策**：`addCartItem` 在事务内第一步执行 `$executeRaw` 形式的 `SELECT pg_advisory_xact_lock(userId)`，以 userId 为粒度串行化同一用户的加购操作，锁随事务提交/回滚自动释放。**证据**：`lib/services/cart.ts` 第 38-53 行的两段注释是全仓最有教学价值的注释之一——"Orders 表无法用 (userId, houseId, isPayed) 唯一约束：会阻断同一房源的再次购买"与"注意用 $executeRaw 而非 $queryRaw：pg_advisory_xact_lock 返回 void，$queryRaw 会尝试反序列化 void 列而抛错（Prisma 7 实测）"。**后果**：并发正确性交给数据库而非前端时序（防连点的 `adding` state 只是体验优化不是正确性保证）；代价是这条 raw SQL 成为 Prisma 升级时的复查点，且锁粒度是"整个用户"而非"用户+房源"——同一用户并发加购两种不同房源也会串行等待（对单用户低频操作无感知，属可接受的过度串行化）。

## 11. ADR-10 接口形状：imooc 兼容层与"3-5-7"复合 id 结算

**背景**：旧前端 slice 按 imooc 教程的接口契约编写——`touristRoute/shoppingCartItem/checkout order` 视图模型、`DELETE /api/shoppingCart/items/(1,2,3)` 括号路径、结账单 id 为各行 id 用 `-` 连接的复合串、POST `/api/orders/3-5-7/placeOrder` 支付。重写前端还是适配后端？**备选**：改前端（7 个 slice + 多个视图组件的形状全动，破坏 ADR-01 的零改动前提）；后端加 VM 适配层（一次性写好 `lib/vm.ts`，前端零感知）。**决策**：适配层——`lib/vm.ts` 承担 PG 库行到 imooc 形状的翻译（`name→title`、`info→description`、折扣计算、图库兜底 `/logo192.png`），结算单 `id` 字段用 `"-"` 连接行 id，支付端点按 `[-,]` 拆回数组。**证据**：`lib/vm.ts` 头注释"imooc 前端视图模型适配层：把 PG 的 House/Orders 映射成前端(src)期望的形状"；`ordersToCheckoutOrder` 的 `id: rows.map((r) => r.id).join("-")` 与 `discountPresent: 1`（注释"CheckOutCard 直接相乘，不能为 null"）；`app/api/orders/[id]/placeOrder/route.ts` 第 17 行 `id.split(/[-,]/).map(Number).filter(Boolean)`。**后果**：前端迁移成本趋近于零，但也把 imooc 的形状缺陷固化——复合 id 在语义上是"多个订单行的拼接"而非实体 id，REST 语义受损；`discountPresent` 恒为 1 是给未来营销留的槽位而非真实折扣（《07-模块详解》§5.2）；`x-pagination` 头、括号路径、DELETE 带 body 等 imooc 遗风都成了《15-接口全量参考》§11 需要专门"判读"的契约特性。

## 12. ADR-11 限流：单实例内存固定窗口，明确标注多实例边界

**背景**：登录爆破、评论刷量、收藏刷接口是写接口的现实威胁；项目部署形态是单实例 NAS/服务器容器。**备选**：Redis 滑动窗口（准确且可分布式，但 Redis 在本项目是可选项不能成为硬依赖）；反向代理层限流（nginx limit_req 可行，但用户自部署环境不可控）；进程内存固定窗口（零依赖、单实例完全够用）。**决策**：`lib/rate-limit.ts` 用进程内 `Map` 实现固定窗口，两条策略常量——`WRITE_LIMIT`（20 次/分钟，评论/点赞/收藏按 userId 维度）与 `AUTH_LIMIT`（8 次/分钟，登录按用户名+IP 双维度、注册按 IP），内存治理三层（`MAX_KEYS = 10_000` 上限 → 先清过期桶 → 按插入序淘汰最旧桶，注释明确拒绝 `clear()` 以防攻击者伪造 key 一次性清空所有人的计数）。**证据**：模块头注释"内存实现，单实例够用；多实例部署需换 Redis"——决策的边界条件在写下它的同一天就被声明；`authRateLimit` 的注释"IP 维度防密码喷洒，用户名维度防单账号爆破"。**后果**：零依赖即可用，命中返回 429 + Retry-After 的契约清晰；代价是《13》D6 的三项已知边界——多实例下阈值变相放大 N 倍、进程重启计数归零、key 中用户名可被海量随机值撑桶（MAX_KEYS + 淘汰机制即为该场景准备，代价是可能误淘汰正常用户的桶）。该决策与 ADR-02 的 Redis 可选、ADR-05 的 fail-open 一脉相承：**基础设施全部设计为"有则增强、无则降级"**，单实例部署形态是所有这些取舍的共同前提。

## 13. ADR-12 布局与 UI：antd v5 + AntdRegistry，手工布局组件不引入路由组

**背景**：antd v5 是 CSS-in-JS 方案，SSR 下若不在服务端抽取样式，首屏会出现无样式闪烁（FOUC）；计划文档 §2.2 拟用路由组 `(main)/(auth)` 承载 MainLayout/UserLayout。**备选**：路由组布局（计划方案，符合 App Router 惯例）；维持"手工布局组件由页面自行包裹"（旧代码结构，MainLayout/UserLayout 本就是普通组件）；引入第三方案（如 next-themes 类库，无必要）。**决策**：antd SSR 用官方 `@ant-design/nextjs-registry`——`app/layout.tsx` 以 `<AntdRegistry><Providers>` 包裹全站，`ConfigProvider` 注入 zhCN locale 与品牌主题（colorPrimary `#0e7490`，与 `client/styles/tokens.css` 设计令牌同源）；布局却**没有**按计划引入路由组，沿用手工布局组件（交易页套 `client/layouts/mainLayout`，首页与内容页自行组装 Header/Footer，登录注册套 UserLayout）。**证据**：`app/layout.tsx` 的 AntdRegistry 包裹与 `app/providers.tsx` 的主题 token；`NEXT_MIGRATION_PLAN.md` §K 的落地结构与 §2.2 计划结构的差异（《13》D11 记录的偏差之二）。**后果**：样式抽取彻底解决 FOUC，历史教训也在此域——`react-payment-inputs` 在 Next 生产构建下 CSS 加载失败（`fieldWrapper` undefined），最终用 antd Form 重写等价替身（`client/components/paymentForm/PaymentForm.tsx`，计划 §L 记载）；代价是布局没有随路由自动生效、每个页面自行选择包裹方式（16 个视图的惯例已稳定），且 `client/App.module.css` 等被根布局引用的文件成为不可删项（《01-系统架构》§5 第 5 条）。

## 14. 决策间的结构关系与复盘

把 12 条决策放在一起看，有三条隐性的元决策贯穿始终。**其一，"兼容优先于优雅"**：ADR-01/08/10/12 都选择了"让旧的东西继续工作"而非"把新的做对"——这是迁移项目的正确元策略，代价被系统地记入《13》的债务台账而非散落遗忘。**其二，"基础设施全部可降级"**：ADR-02/05/11 共同构成"有 Redis 则增强、无 Redis 则降级、多实例前必须改造"的弹性谱系，源码注释在每处都标注了边界条件，使"什么时候必须还债"成为可判断的问题而非未知风险。**其三，"以源码注释固化决策记忆"**：从 `next.config.js` 底部的 redirects 无限重定向坑，到 `lib/services/cart.ts` 的 `$executeRaw` 实测教训，再到 `prisma/seed-data/users.ts` 里"seed 写死 md5 导致 demo 账号无法登录"的历史——作者把踩过的每一个坑都写成了注释，这套注释群是本仓库决策考古能够成立的基础设施。复盘层面的一个提醒：ADR 不是墓碑而是活文档，其中 ADR-03（md5 退役）、ADR-10（imooc 形状退役）、ADR-11（多实例改造）都有明确的触发条件与清偿路径（《13》§5 路线图），当条件满足时应回头修订对应条目，而不是让文档与现实的偏差持续扩大。
