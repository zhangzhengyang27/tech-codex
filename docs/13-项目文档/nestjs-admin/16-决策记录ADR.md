---
title: "16 决策记录（ADR）"
description: "项目：nestjs-admin ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析"
category: 项目文档

---
# 16 决策记录（ADR）

> 项目：nestjs-admin ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析

本文是架构决策记录（Architecture Decision Record）集：把代码里"为什么长这样"的关键选择逐条考古，每条按背景、备选方案、决策、源码证据、后果五段组织。与前 16 篇的分工是：各专题篇回答"是什么、怎么用"，本篇回答"当年为什么这么选、不这么选会怎样"。所有条目均从源码与 `nestjs-microservice-app/HANDOFF.md` 的一手记录反推，其中 HANDOFF 的 32 条陷阱清单与里程碑记录是判断"决策动机"的最重要佐证——因为这个项目没有正式的 ADR 流程，这些决策都沉淀在代码注释、陷阱清单和修复记录里，本文是把它们重新整理成可检索的决策档案。阅读时建议先扫一遍标题建立决策地图，再对感兴趣的条目回源码验证；每条的"后果"段同时收录了正面收益与已经付出的代价，与《13-技术债务与演进建议》的债务台账互为镜像——债务是决策后果中"尚待处理"的那部分。

## ADR-001 按领域限界上下文拆分微服务，user 与 system 双库隔离

**背景**：项目前身是 NestJS 单体教学工程，用户与权限数据同库。随着功能从"课程权限模型"扩展到完整后台（菜单、字典、日志、通知），单库单体的模块边界开始名存实亡——任何一张表都能被任何模块 import。

**备选方案**：① 维持单体按模块目录划分（改动最小，但边界靠纪律维持）；② 按资源细拆（用户/角色/菜单/日志各一个服务，边界最清晰但 gRPC 调用链爆炸）；③ 按领域粗拆为少量服务，每服务独占一个数据库。

**决策**：选③。拆为 user（人是谁、能做什么的数据策略）与 system（系统长什么样、发生过什么）两个 gRPC 微服务，各自持有 `user_db` 与 `system_db`，禁止跨库 join；跨域聚合（仪表盘、鉴权链）全部上收到网关。划分的隐形准则是**数据所有权**——需要事务一致性的数据（用户与角色分配、菜单与权限码）必须同服务同库，只读引用（日志记用户名字符串、授权页拉角色列表）接受弱引用。

**源码证据**：`nestjs-microservice-app/pnpm-workspace.yaml` 声明 gateway/user/system/health/proto-pkg/template 六包；`user/prisma/schema.prisma` 与 `system/prisma/schema.prisma` 各自独立迁移目录；`system/src/database/database.service.ts` 连接串取 `SYSTEM_DATABASE_URL || DATABASE_URL`（HANDOFF 陷阱 19：曾因只写 `DATABASE_URL` 连到 user_db，全部 system 表查询报 relation does not exist）；`gateway/src/system/dashboard.controller.ts` 跨两服务聚合七项统计。

**后果**：正面是依赖图成为以网关为根的树（user 与 system 之间零直连，`grep` 可验证）、故障域隔离、每库迁移独立推进；代价是 `role_menus.roleId` 无法设外键（角色在另一个库）、删除角色的清理链跨库无法事务化（于是有了 ADR-011 的软删除）、跨域查询只能两次 gRPC 拼接。多份文档专门澄清"permissions 三表不参与鉴权"（见《04-数据模型》§2.4），本身就是拆分后认知负担增加的证明。

## ADR-002 服务间通信选 gRPC，契约集中在 proto

**背景**：拆分后网关与业务服务需要强类型、低开销、可演进的内网通信。前端到网关是 HTTP 已定，网关到服务这一跳需要另选协议。

**备选方案**：① HTTP+JSON 内部 API（调试直观，但接口形状靠文档约定，漂移风险高）；② 消息队列（NestJS 支持 Kafka/RMQ，但管理后台以同步请求-响应为主，异步化反而增加认知负担）；③ gRPC + proto 契约。

**决策**：选③。gRPC 是 `@nestjs/microservices` 的一等公民传输层，`@GrpcMethod` 装饰器让业务服务代码形态与 HTTP 控制器几乎一致；proto 文件天然就是接口文档，配合 proto-pkg 共享包（ADR-008）从机制上杜绝"文档与实现不一致"。

**源码证据**：`user/src/main.ts` 用 `NestFactory.createMicroservice(AppModule, { transport: Transport.GRPC, options: { package: 'user', packageDefinition: loadProto('user') } })` 起服务端；`proto-pkg/proto/user.proto` 声明 26 个业务 rpc、`system.proto` 31 个；`gateway/src/system/system-client.service.ts` 的 `SystemServiceApi` 接口与 proto 消息一一对应；`user/src/app.controller.ts` 的 `@GrpcMethod('UserService', 'CreateUser')` 装饰器注册处理器。

**后果**：正面是类型贯通全链路（proto→ts-proto 生成→网关接口→控制器）、性能开销低于 JSON 文本协议；代价有三：调试不如 HTTP 直观（必须借助 health 服务做存活代理，见 ADR-010）、proto3 的零值缺省语义曾把 `status=0` 误判为"未传"（HANDOFF 陷阱历史，《15-接口全量参考》§7 第三条提示）、以及 proto 消息不可重名的约束（陷阱 22：system.proto 曾重复定义 `IdRequest` 导致 loadProto 直接报错）。运行时键名保持 proto 原名的 keepCase 行为是另一处隐性成本（陷阱 4），`authorization.service.ts:148-150` 为此留有专门注释。

## ADR-003 Consul 注册发现 + 双实例容灾竞速 + 失败自愈

**背景**：微服务实例会随部署漂移，网关需要一个动态的"服务名→地址"解析层，且不能因单个注册中心故障而全站不可发现。

**备选方案**：① DNS/环境变量静态配置（简单但无法摘除死亡实例）；② Kubernetes 原生服务发现（引入 K8s 依赖，NAS 部署场景不适用）；③ 注册中心 + 客户端发现（Consul/etcd/Nacos）。

**决策**：选③，落地为三件套：服务启动时自注册（含 HTTP 健康检查与 60 秒自动注销）、网关发现时对**多个 Consul 实例并行竞速**（任一先返回即采用）、gRPC 调用失败即触发重新发现与客户端重建并广播给所有订阅者。

**源码证据**：注册侧 `user/src/consul/consul-client.service.ts` 在 `onModuleInit` 调 `register`（check.interval '10s'、deregisterCriticalServiceAfter '60s'），`onModuleDestroy` 调 `deregister`；发现侧 `gateway/src/app.module.ts` 用两次 `ConsulModule.forRoot` 声明 consul1/consul2 双实例；`gateway/src/consul/consul.service.ts` 的 `retryGetServiceInfo` 用 `from(this.grpcClients).pipe(mergeMap(...), take(1))` 并行竞速（注释明确 `concatMap` 才是串行），`updateGrpcClient` 对注册表中所有同服务条目广播重建（注释：订阅方可能挂在任意一条条目上，只更新单条会出现落选条目上的消费者永远收不到新 client）。

**后果**：正面是多实例扩容零代码（根 `package.json` 的 `dev:user1/dev:user2` 脚本即证）、单注册中心故障不放大、实例宕机秒级摘除；代价是这套机制有不容出错的配置对称性——consul1 的 services 必须数组且含全部服务（陷阱 18，漏配会让授权链路拿不到 system 客户端从而全站 403），本机起第二个 agent 必须全套端口偏移（陷阱 12）。发现失败不抛出而是 5 秒间隔重试链，是为规避"Node 对未处理拒绝直接崩进程"（`initGrpcClient` 内注释），这个"永不崩进程"取向贯穿了网关的所有横切设计。

## ADR-004 自研 ConsulHttpClient 薄封装，替代被弃用的官方包

**背景**：官方 `consul` npm 包在项目演进期间被宣布弃用（proto-pkg 源码头注释为证），继续依赖意味着安全修复与兼容性无保障。

**备选方案**：① 换社区维护的替代包（引入新的依赖风险，能力面远大于所需）；② 钉死弃用包版本不升级；③ 只封装本项目实际用到的三个 API，基于 Node 内置 fetch 自研。

**决策**：选③。`ConsulHttpClient` 只实现 `health.service`（发现）、`agent.service.register`（注册）、`agent.service.deregister`（注销）三个能力，调用形状刻意与旧包保持一致，迁移成本趋近于零。

**源码证据**：`proto-pkg/src/utils/consul-http.ts` 头注释逐行交代动机与能力清单；实现基于内置 `fetch` 加 `AbortSignal.timeout(10_000)`，支持 `X-Consul-Token` 头以备 ACL；全文件无任何第三方依赖。

**后果**：正面是依赖面最小化、行为完全可控（错误消息格式、超时、空 body 处理都自定义）、随 proto-pkg 一次分发所有服务共用；代价是 Consul 更强的能力（ACL 引导、watch、事务 API）需要时得自己补——`gateway/src/consul/consul.service.ts` 的 `initConsul` 里 defaults 兜底 token 是字面量 `'your-master-token'`，接入 ACL 后会成为隐性 403 源（《08-安全与权限设计》§6 隐患 7），这是"薄封装"决策留下的已知税。生产是否启用 ACL 尚未定论，标记 ⚠️ 待确认（见《13-技术债务与演进建议》§2）。

## ADR-005 双 token + 内存会话表：给无状态 JWT 加一个有状态开关

**背景**：管理后台有两个刚需彼此拉扯：API 验签必须快（不想每请求查库），但登出/强退必须即时生效（纯 JWT 做不到）。此外"7 天免登录"体验与"管理员可踢人"的安全能力要同时成立。

**备选方案**：① 纯 JWT 无状态（快但无法主动失效）；② 每请求查库的集中式会话（可控但每请求多一跳）；③ 短 access + 长 refresh 双 token，配进程内会话表做存在性校验；④ ③ + Redis 共享会话（多实例就绪）。

**决策**：先选③。access 2 小时、refresh 7 天，两枚 token 都带 `jwtid: randomUUID()` 防同秒撞签；网关内存三张 Map（access_token→记录、sessionId→token、refresh_token→sessionId）承载在线列表、强退与 refresh 换发；`JwtStrategy.validate` 验签后必须 `sessionService.has(token)`，会话不存在即 401。Redis 版本被明确推迟：`session.service.ts` 头注释写明"本项目为单例部署（已确认）：内存会话即最终方案……若未来改为多实例，需换 Redis 共享会话（接口不变，替换实现即可）"。

**源码证据**：`gateway/src/auth/auth.service.ts` 的 `signin`（signAsync 双签、jwtid）、`gateway/src/common/session/session.service.ts`（三 Map、staleMs 8 天注释"必须略长于 refresh 的 7 天，否则清扫会抢先失效 7 天免登录——曾为 24h 导致名不副实"、sweep 定时器 `unref()`）、`gateway/src/auth/strategies/jwt.strategy.ts`（JWT_SECRET 缺失时构造期抛错快速失败）、`gateway/src/auth/auth.controller.ts` 的 `refresh`（rotate 失败抛 401）。

**后果**：正面是验签零查库、登出/强退/换发语义全部即时、实现 170 行内完全可审计；代价是网关被钉死在单实例（重启即全员下线），且"换发即旧 access 失效"的单活跃会话语义曾被当 bug 报告（陷阱 28 确认为特性）。 HANDOFF 陷阱 27 记录的真实教训（不带 jwtid 时同秒同 payload 产生完全相同的 token，refresh 等于没换）说明这个看似简单的决策背后有一次实打实的返工。

## ADR-006 CASL 双源能力模型与 fail-closed 降级

**背景**：授权数据天然分两路：user 库的 Policy 表（早期 course 模型遗留，支持 fields/conditions 字段级与条件级规则）与 system 库的菜单权限码（M1 引入，表达力弱但运维直观）。守卫需要一个统一的判定引擎把两路合流。

**备选方案**：① 收敛到单一来源（要么重写 Policy 管理界面，要么放弃字段级规则——两者成本都高）；② 手写 if-else 权限判断（规则分散代码，无法数据驱动）；③ CASL Ability 作为统一判定引擎，双源规则在构建期合并。

**决策**：选③。`buildAbility(username)` 并行拉两路 gRPC 规则合成一个 `Ability<[string,string]>`，按用户名缓存 60 秒。降级语义定为 fail-closed：任一路 gRPC 失败时捕获后**返回空数组**——能力为空即全部拒绝，服务降级时表现是"全站 403"而不是"全站放行"。

**源码证据**：`gateway/src/auth/authorization.service.ts` 的 `CACHE_TTL_MS = 60_000`、`fetchRules`/`fetchMenuPermissionRules` 的 catch 分支 `return []` 并留注释"发现链路尚不可用时按'无规则'处理，由 CheckPolicies 做出拒绝决策"、无角色用户短路返回不调 system 服务；`gateway/src/auth/policies/policies.guard.ts` 的 `@CheckPolicies` 元数据机制与"缺少用户身份/无权限执行该操作"两级 403。

**后果**：正面是判定引擎单一、规则可数据驱动（权限变更不改代码）、降级行为安全可预期（《12-FAQ与故障排查》§6 的案例复盘明确"能力为空时全拒恰是防线在工作"）；代价有三：60 秒缓存窗口内撤权不生效（08 篇隐患 8，演进路径是主动失效）、双源并存的认知成本（多份文档要反复澄清 policy 与权限码的分工）、以及 fetch 失败静默吞错只在日志留 warn——排障时看到"全站 403"必须先想到数据链而非守卫代码。

## ADR-007 权限码即菜单记录：授权体系彻底数据驱动

**背景**：按钮级权限的传统做法是在代码里登记一张权限清单（前端配置数组 + 后端枚举），加一个按钮要两端同时发版。

**备选方案**：① 代码内声明式权限清单；② 独立的权限表与管理界面；③ 复用菜单表的 type=2"按钮"记录，`permission` 字段存权限码，经角色-菜单授权表生效。

**决策**：选③。"加一个按钮权限"从此是纯数据操作：插一条 type=2 菜单记录 + role_menus 授权，前端按钮显隐与网关守卫读**同一个字符串**，形成同源双保险。命名统一为 `<域>:<资源>:<动作>`（如 `system:user:reset-pwd`），`*:*:*` 为超管通配码。

**源码证据**：`system/prisma/seed.sql` 33 条菜单种子中 21 个按钮权限码（id 4-6/8-10/12/16-21/23-25/28-32），每段末尾 `setval` 推序列的注释（"否则后续 CREATE 撞主键"）；`system/src/app.controller.ts` 的 `getPermissionCodes`（只统计 `menu.status === 1 && permission` 非空，Set 去重）；`gateway/src/system/user.controller.ts` 的 `@CheckPolicies((ability) => ability.can('system:user:create', 'perm'))` 与 `vue-admin/src/utils/auth.ts` 的 `hasPerms`（通配码直通）读同一批字符串。

**后果**：正面是新权限零发版、前后端永远同源（不存在"前端有按钮后端没校验"的错位）、授权页的树形勾选交互天然复用菜单树；代价是权限数据的完整性成了系统命门——seed 漏放直接 403（陷阱 20 与陷阱 31 各有一次真实事故），`role_menus` 缺行会让前端按钮与后端守卫同时失明，且"权限码不存在"与"权限码未授权"在网关侧不可区分（都表现为 403），排障只能回数据链逐层核对（《12-FAQ与故障排查》§4 决策树就是为此而生）。

## ADR-008 proto-pkg 独立共享包 + HealthModule 统一健康应答

**背景**：proto 文件、生成产物、加载工具、Consul 客户端、TLS 证书如果散落在各服务里，双侧手写不一致只是时间问题；gRPC 标准健康检查的实现如果每个服务各写一份，同样会漂移。

**备选方案**：① 每服务自持 proto 与生成物（复制粘贴地狱）；② git submodule/私有 npm 包分发（引入外部发布流程）；③ workspace 内共享包，契约唯一来源，构建产物随包分发。

**决策**：选③，且把"健康检查应答"也收编进包。`@toimc/proto-pkg` 以 `workspace:*` 协议被五个服务引用，导出 `loadProto`、`promisifyServiceMethods`、`ConsulHttpClient`、`loadGrpcTls` 四件工具与 `HealthModule`——user/system 只需 import 这个模块，就自动获得 gRPC `Health.Check` 的标准应答处理器，恒定返回 SERVING。

**源码证据**：`proto-pkg/package.json` 的 `exports` 字段（`.` 与 `./dist/health` 双入口）与 `files` 字段（dist/proto/certs 三目录随包发布，publishConfig 指向 npmjs）；`proto-pkg/src/nestjs-health/health.controller.ts` 的 `@HealthControllerMethods()` 装饰器注册 Check 处理器；`user/src/app.module.ts` imports HealthModule；`proto-pkg/src/utils/proto-utils.ts` 的 `loadSync` 配置 `keepCase: true, longs: String`（longs 转字符串在源头规避 bigint 序列化问题）。

**后果**：正面是契约变更只动一处、`pnpm --filter @toimc/proto-pkg build` 一键重生成、健康应答零漂移（这解释了《07-模块详解》§2.3 提到的"proto 里声明了 Health 服务但 app.controller 里 grep 不到 Check"现象）；代价是包内联引入的耦合——证书私钥随包分发（08 篇隐患 5：内层 TLS 只防窃听不防持有仓库者，生产需卷挂重签）、`loadProto` 的 `__dirname` 相对路径在构建产物里必须保持 proto 目录同位（Dockerfile 单独 COPY proto-pkg 的 dist/proto 就是为此），以及重生成时必须把 import 链上所有 proto 一起传（陷阱 6）。

## ADR-009 gRPC TLS 可选项与三端一致性约定

**背景**：内网明文 gRPC 在教学与本地开发时是负担（证书管理复杂），但生产链路（VPS→frp→NAS 容器）需要加密。TLS 又不能硬编码为永远开启——本地无证书环境会直接起不来。

**备选方案**：① 永久明文（生产不可接受）；② 永久 TLS（本地开发门槛陡增）；③ mTLS 双向认证（最安全但证书分发与轮换成本最高）；④ 环境变量开关的单向 TLS。

**决策**：选④。`GRPC_TLS=on` 时：业务服务端用 `ServerCredentials.createSsl` 挂证书、网关客户端与 health 探测客户端用 `ChannelCredentials.createSsl(rootCerts)` 信任自签根证书；off 时三处全部回落明文。证书由 proto-pkg/certs 随包分发，生产以卷挂含服务名 SAN 的证书覆盖。

**源码证据**：`user/src/main.ts` 的 tlsEnabled 分支（注释"mTLS-ready 的服务端证书"，第三参数 false 表示不强制校验客户端证书）；`gateway/src/consul/consul.service.ts` 的 initGrpcClient TLS 分支；`health/src/consul/consul.controller.ts` 的探测端 TLS 分支；`proto-pkg/src/utils/grpc-utils.ts` 的 `loadGrpcTls`（rootCerts/privateKey/certChain 三件套）。

**后果**：正面是开发零门槛、生产有加密、三个消费点共用同一份开关与证书加载器；代价是**三端一致性成为配置红线**——探测端漏开会在 60 秒后导致实例被 Consul 注销（HANDOFF §4.5 部署坑①的"注册成功又消失"事故），容器间服务名互连撞 SAN 不匹配报 `ERR_TLS_CERT_ALTNAME_INVALID`（《12-FAQ与故障排查》§2）。注释里自称 mTLS-ready 但当前实为单向 TLS，双向认证在《13-技术债务与演进建议》路线图 P3。

## ADR-010 health 服务单列：Consul 只会说 HTTP，于是给它一个翻译官

**背景**：Consul 的健康检查在本项目形态下只做 HTTP 探测，而 user/system 是纯 gRPC 服务（没有 HTTP 端口），gRPC 服务需要一种"存活信号"能被 Consul 理解。

**备选方案**：① 给每个 gRPC 服务附带 HTTP 健康端点（端口翻倍，且掩盖了"纯 gRPC 服务"的架构事实）；② 让 Consul 直接做 gRPC 探测（dev agent 的 gRPC 检查配置繁琐且不受控）；③ 独立的 health 服务做协议翻译：Consul→HTTP→health→gRPC Check→业务服务。

**决策**：选③。health 是全栈唯一"无业务、无库"的纯基础设施服务，运行时解析 `SERVICE_HEALTHCHECK_ENDPOINTS` 环境变量（格式 `service_key,grpc_url,packageName,protoName,rpc名`，竖线分隔多段），为每个 key 动态构造 terminus 的 `GRPCHealthIndicator.checkService` 探测器（2 秒超时），把 gRPC 存活翻译为 HTTP 200/500。dev-start.sh 的启动顺序（health 第二个起、gateway 最后起）正是利用它充当全栈就绪信号。

**源码证据**：`health/src/consul/consul.controller.ts` 全文（动态 endpointsObj 构造、`?service=` 命中 200/未命中 404/异常 500 的三分支）；`user/src/consul/consul-client.service.ts` 的 CHECK 缺省值指向 `http://127.0.0.1:3030/api/v1/health?service=user_grpc`；`health/src/main.ts` 的版本控制怪癖（VERSION 缺省取 '1'，路径因此是 `/api/v1/health` 带版本段——写 CHECK 时必须带 `/v1`，《07-模块详解》§4 有专述）。

**后果**：正面是 gRPC 服务保持端口纯净、探测逻辑集中一处、新增服务只需在环境变量里登记一段；代价是把 health 的可用性抬升为**全系统可发现性的单点**——health 挂掉则所有 gRPC 服务在 60 秒后被 Consul 摘除（《01-系统架构》§7 第 6 条），运维上必须把 health 当作与 Consul 同级的基础设施对待；另外网关内还残留一份几乎逐行相同的 ConsulController（`gateway/src/consul/consul.controller.ts`），双份能力是单体模板演进期的痕迹（《13-技术债务与演进建议》§1.5 关联项）。

## ADR-011 薄网关（BFF）取向：业务规则下沉，HTTP 语义相关兜底上网关

**背景**：网关最容易膨胀成"什么都管的胖中间层"，也可能退化成纯反代（浪费了会话与鉴权的收口位置）。需要一条清晰的职责分界线。

**备选方案**：① 胖网关（业务校验、聚合、甚至数据组装都在网关做，微服务退化成数据库代理）；② 纯反代网关（连"不能删自己"这类与会话强相关的校验都下沉）；③ 薄网关：守卫、限流、日志、异常映射、协议转换五类横切能力收口，业务规则全部下沉到服务，仅保留与 HTTP 语义/会话上下文强相关的极少量兜底。

**决策**：选③。网关控制器被压缩到"守卫 + 透传 + 形状微调"三层；仅有的业务兜底是"不能停用/删除当前登录账号"与"重置密码 ≥6 位"两处——它们放在网关是因为与 ParseIntPipe 路径参数和 req.user 会话上下文强相关。跨域编排（仪表盘聚合、鉴权链拼接）是网关唯一允许的"业务逻辑"，因为它本来就是协议边界的工作。

**源码证据**：`gateway/src/system/user.controller.ts` 的 update/remove 两个方法内联校验（分别抛 403"不能停用当前登录账号"/400"不能删除当前登录账号"）与 resetPassword 的长度预校验；`gateway/src/system/system-client.service.ts` 的 `withTimeout` 给 delete/clear 类写操作加 10-15 秒超时、`requireClient()` 未就绪同步抛错、`writeOperLog` 整体 try/catch 降级（注释"日志丢失不应影响业务请求"）；对照 `user/src/app.controller.ts` 里真正的业务规则（argon2 验证、事务、外键预校验、P2002 转换）。

**后果**：正面是业务服务可以独立测试（不依赖网关）、网关认知负荷恒定、新控制器是复制粘贴流水线；代价是同一规则可能网关与服务各写一遍（如 p1user 改密保护在网关 `resetPassword` 前置校验之外、服务端 `updatePassword` 与 `adminResetPassword` 双写——三处防线冗余但语义一致），且"哪些兜底算 HTTP 语义相关"没有形式化判据，边界靠评审维持。删除角色的软删除实现（`RoleController.remove` 实为停用改名）是跨库约束与薄网关两个决策共同挤压出的妥协（《13-技术债务与演进建议》§1.7 已建议文档化语义）。

## ADR-012 三级日志旁路采集：业务代码零日志语句

**背景**：操作审计与故障取证需要日志，但"业务代码里到处写 logger"会侵入所有控制器，且日志通道故障不能反过来影响业务请求。

**备选方案**：① 控制器手动埋点（侵入性最强）；② AOP 拦截器统一采集（对 NestJS 的响应生命周期有干扰）；③ Express 中间件在响应 finish 事件后统一采集，写日志整体 try/catch 且 fire-and-forget。

**决策**：选③，并扩展为三级：操作日志（中间件对所有 POST/PUT/DELETE/PATCH 请求在 finish 后异步落库）、登录日志（中间件按 `/api/auth/signin|signup` 路径规则采集，success = statusCode<400）、系统日志（全局异常过滤器对 ≥500 错误落库，detail 截断 2000 字符）。traceId 由中间件生成并回写 `X-Request-Id` 响应头，成为跨日志取证的关联键。

**源码证据**：`gateway/src/common/middleware/request-logging.middleware.ts` 全文（traceId 分配、sessionService.touch、finish 回调内 LOGIN_PATHS 分流与 module 取 URL 前两段的拼接规则）；`gateway/src/common/filters/all-exceptions.filter.ts` 的 `recordSystemError`（`.catch?.()` 链式兜底 + try/catch 双层防护，注释"系统日志通道不可用（如 system 服务下线）时静默降级"）；HANDOFF 陷阱 16 记录了反面教材——requireClient 同步抛错发生在 finish 回调里会打崩进程，这是"整体 try/catch"纪律的直接由来。

**后果**：正面是业务控制器零日志代码、审计无遗漏（含失败尝试与限流 429）、日志系统整体宕机不影响任何业务响应；代价是排障心智要翻转——"删除日志后数量多了一条"是采集器记录了删除动作本身（《12-FAQ与故障排查》§5 Q3）、"日志写不进去"在业务侧完全无感只能靠网关 warn 日志发现，以及 oper_logs 与写流量线性增长的运维债务（《04-数据模型》§5 建议十万行级前建立清空节奏）。这套"尽力而为的旁路写入"与"永不崩进程"（ADR-003）共同构成网关的可用性哲学：**请求永远能被响应，且响应可追溯**。

## 结语：决策之间的相互咬合

把 12 条决策摆在一起看，会发现它们不是孤立的点，而是一张相互咬合的网：ADR-001 的库拆分决定了 ADR-002 需要 gRPC 跨进程通信，gRPC 不可直接健康检查催生了 ADR-010 的翻译官服务，翻译官只说 HTTP 又反向锁定了 ADR-003 里 Consul 的检查类型；ADR-005 的内存会话是 ADR-011 薄网关里唯一"重"的有状态件，而它被 ADR-006 的 60 秒缓存与 ADR-007 的 60 秒权限生效窗口共同塑造了"延迟生效但即时踢人"的混合语义；ADR-004 的薄封装与 ADR-008 的共享包让"自研可控"与"契约唯一"两个取向互相成全。理解这些咬合关系比记住任何单条决策都重要——这也是为什么《13-技术债务与演进建议》反复强调"改动前先归类"：在这张网里，几乎没有一条边可以单独剪断而不牵动邻边。若要推翻其中任何一条（比如把会话换 Redis、把权限模型归一），应先沿本文把邻接决策重读一遍，评估涟漪范围后再动手。
