# 16 决策记录（ADR）

> 项目：xyMall ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析

## 0. 本篇的定位与读法

ADR（Architecture Decision Record，架构决策记录）记录的是"**当时为什么这样选**"与"**选完付出了什么代价**"。它与《01-系统架构》分工明确：《01》回答"系统是什么、长什么样"（现状描述），本篇回答"为什么是这一个样子而不是另一个样子"（决策考古）。由于仓库没有正式的 ADR 目录，本文的依据是三类一手材料：源码与配置中的注释原文、`xy-mall/AGENTS.md` 的工程约定、以及 `mall/docs/` 目录下的九份过程档案（`HANDOVER.md` 十轮迭代记录、`CODE-AUDIT-20260905.md` 审计报告、`BIG-TECH-READINESS-ASSESSMENT.md` 生产就绪度自评、`MICROSERVICE-SHARDING-PLAN.md` 分库分表评估等）。这些档案恰好构成了一条完整的决策时间线：很多决策并非一次想清楚，而是经历"第一版实现 → 审计或事故暴露问题 → 推翻重来"的循环，本篇会把这种反复也如实记录下来——被否决的方案与幸存的方案同样有信息量。

每条 ADR 固定五段：**背景**（当时面临什么问题）、**备选方案**（当时可能怎么选）、**最终决策**（实际选了什么）、**源码证据**（文件/配置/注释原文线索）、**后果与代价**（这个决策让人至今在付的账）。机制与代码结构的现状描述一律引用已有篇目，不在本篇重复。无法从档案确认的动机标注 `⚠️ 待确认`。

## ADR-1 单体多模块而非微服务

**背景**：项目起点是单人维护、一台服务器、演示级数据量（商品约 800、订单演示级）的商城。电商领域教程普遍以"微服务架构"为卖点，拆分方案唾手可得；但拆分的每一项成本（分布式事务、服务发现、链路追踪、运维倍增）都要由这一个维护者承担。

**备选方案**：一是直接按"网关 + N 个服务"搭微服务骨架（教程主流做法，展示效果好）；二是做"模块化单体"并用 ArchUnit 固化边界（大厂演进路径的第一步）；三是单体加严格分层，微服务只做纸面评估。

**最终决策**：第三条。单体（`xy-mall-server`）内 30 个业务模块按统一骨架分层，微服务化只写了评估文档 `mall/docs/MICROSERVICE-SHARDING-PLAN.md`（M0→M8 绞杀式推进计划），明确"只评估、不实施"。`AGENTS.md` 第 7 行原文："单体架构的全品类演示商城……**刻意保持单实例部署**"。

**源码证据**：`xy-mall/AGENTS.md` 开头定位声明；`MICROSERVICE-SHARDING-PLAN.md` §0 决策前提第 1 条："当前数据量（商品 ~800、订单演示级）下，拆分与分表**没有性能收益**，只有成本"；`BIG-TECH-READINESS-ASSESSMENT.md` 整改记录第 3 条："单实例状态外置"经确认**不整改**（仅一台服务器，进程内策略合理）；`HANDOVER.md` 第七轮："单实例架构保持不变（明确不做的：登录失败计数/配置缓存/限流外置到 Redis、DB 轮询改 MQ）"。

**后果与代价**：收益是下单扣库存、核销券、扣积分、拼团建队在同一本地事务内完成，没有任何分布式事务问题（这是《05-核心流程》流程二正确性的根基）；运维只有一条启动命令。代价是三处进程内状态（`IdempotencyService` 的 `ConcurrentHashMap`、`SysConfigServiceImpl.cache`、`RateLimitFilter.windows`）把系统锁死在单副本上，《13-技术债务与演进建议》D4/D5 已登记为"扩容前必修"；同时"微服务经验"无法从运行系统中直接获得，只能靠评估文档展示思考深度。

## ADR-2 Redis 定位为"可丢的增强层"而非硬依赖

**背景**：教学/演示环境无法保证 Redis 常驻（读者机器上可能只有 MySQL），而商品缓存、秒杀挡量、延迟队列、分布式锁、token 黑名单等机制天然都想用 Redis。若把 Redis 写成硬依赖，"一键跑通"的项目定位即刻破产。

**备选方案**：一是 Redis 必装（实现简单，所有路径只写一遍）；二是引入嵌入式 Redis 或用内存结构模拟（维护成本高、行为不等价）；三是每个 Redis 访问点写降级分支，DB 永远兜底。

**最终决策**：第三条，并上升为全仓库工程约定。`AGENTS.md` 第 59 行原文："Redis 是'可选增强'：所有 Redis 访问点必须 try/catch 降级（参照 GoodsCacheService / SeckillStockRedisService 的写法），不允许因 Redis 挂掉阻断交易"。

**源码证据**：`xy-mall/server/src/main/java/com/xiaoye/mall/server/modules/goods/service/GoodsCacheService.java` 的 `lookup/putDetail/putNegative/evictDetail` 四个方法全部 try/catch，读失败 `log.warn` 后返回 MISS 回源 DB；`modules/order/service/OrderDelayQueue.java` 入队失败仅 warn（注释指明"DB 轮询兜底"）；`modules/seckill/service/impl/SeckillServiceImpl.java` 的 `reserveRedis` 捕获一切异常后 `return false`（注释"降级 DB 路径"）；`framework-cache/.../lock/DistributeLockAspect.java` Redis 异常自动放行。各机制的降级表现清单见《01-系统架构》第 1 节与《12-FAQ与故障排查》条目 34。

**后果与代价**：系统获得了"Redis 挂掉只变慢不坏数据"的弹性，秒杀在有 Redis 时快两个数量级、没 Redis 时退化为纯 DB 条件扣减但仍正确。代价有三：每个 Redis 访问点都要写两套语义（快路径 + 慢路径），代码量约多三分之一；降级路径平时不被流量覆盖，测试盲区天然存在（《09-测试与质量保障》第 6 节建议 1 即针对此）；部分降级会静默改变行为语义（黑名单读失败放行、限流计数分裂），《08-安全与权限设计》2.4 节如实记录了这层边界。

## ADR-3 framework 五模块做成可独立复用的平台件

**背景**：统一响应、异常、JWT、限流、锁这些横切件如果直接写在业务代码里，将来无论拆微服务还是抽公共脚手架都要"从业务里往外抠"。作者在《MICROSERVICE-SHARDING-PLAN.md》M3 阶段计划里明说要"framework-* 改造为 xy-starter-{core,web,cache,orm}"，说明复用是预先想好的目标而非事后巧合。

**备选方案**：一是所有公共代码放 server 内一个 `common` 包（最快，但与业务焊死）；二是独立 Maven 模块但允许依赖 Spring Web 全家桶（省事，core 模块会被 web 依赖拖累）；三是独立模块且逐层最小化依赖。

**最终决策**：第三条。framework 拆为 core/web/orm/cache/swagger2 五个 Maven 模块，且 `framework-core` 刻意做到零 Spring Web 依赖。

**源码证据**：`xy-mall/framework/framework-core/pom.xml` 只有 `spring-boot-starter`（无 web）、jjwt、hutool-core、commons-lang3 与 spring-security-crypto；`framework-core/src/test/.../CsvUtilTest.java` 是全库唯一不在 server 模块的测试，证明该模块可脱离 Web 上下文单测；父 POM `xy-mall/pom.xml` 的 dependencyManagement 统一仲裁五模块版本为 `${xymall.version}=1.0.0`；`MICROSERVICE-SHARDING-PLAN.md` M3 节原文："各服务引依赖即可获得 @LoginUser/@RateLimiter/@DistributeLock/R 全家桶——上一轮的框架层投入在此阶段直接复用"。

**后果与代价**：模块边界迫使作者把"策略接口 + 双实现"这类抽象做在 core（验证码/登录失败/黑名单的 InMemory 与 Redis 实现，见《01-系统架构》2.1 节），业务模块只认接口不认实现。代价是五个模块的 pom 与依赖仲裁维护成本、以及"core 里到底该不该放某个工具"的持续纠结——现实中 `R.java` 与 `CsvUtil` 放 core 无争议，但安全存储抽象跨了 core/cache 两模块，首次阅读需要跨模块跳转（见《07-模块详解》第 2 节的清单）。

## ADR-4 密码哈希 BCrypt 懒迁移而非停机刷库

**背景**：存量账号的口令是"随机盐 + MD5"格式（`user.password_md5/salt` 两列是 V1 建表时定下的）。升级到 BCrypt 时，经典难题是：老密文不可逆，不可能离线批量"加密"成 BCrypt，要么等用户下次登录时逐个迁移，要么强行停机做一次有风险的数据工程。

**备选方案**：一是维持 MD5 不动（演示项目最常见的躺平选择）；二是双哈希并存、新表存 BCrypt（引入第二列与查询分支）；三是登录成功时原位替换为 BCrypt（懒迁移），另提供一个后台批量接口兜底长期不登录的账号。

**最终决策**：第三条。新口令一律 BCrypt（自带盐），校验时按密文前缀分流，旧密文校验通过后立即改写为 BCrypt；管理端额外提供 `/api/admin/managers/migrate-md5` 批量迁移入口。

**源码证据**：`xy-mall/framework/framework-core/src/main/java/com/xiaoye/mall/framework/core/security/PasswordUtil.java` 类注释原文："密码工具：新值使用 BCrypt 哈希；兼容校验旧版'随机盐 + MD5'密文，老账号登录成功后由调用方替换为 BCrypt（懒迁移）"；常量 `BCRYPT_PREFIX = "$2"` 与 `isBcrypt()` 方法即分流实现；`modules/user/service/impl/UserServiceImpl.java` 的 login 在旧密文校验通过后回写（流程见《05-核心流程》1.2 节③）；`spring-security-crypto` 在父 POM 中钉在 6.2.8（注释"本地离线仓库可用版本"）。算法与迁移的双测覆盖见 `PasswordUtilTest`（4 用例，《09》2.4）。

**后果与代价**：迁移零停机、无数据工程风险，且 `mvn test` 里有一条专门锚定 BCrypt 主路径的回归。代价是 `matches` 方法永久背负双算法分支与 MD5 兼容代码（该兼容代码理论上要保留到"最后一个未登录的存量账号"消失，实际无法判定何时可删）；`salt` 列对新账号只是摆设却仍在表结构里，新人容易误解当前哈希方案（《04-数据模型》3.1 已注明"加盐 MD5"为历史由来）。

## ADR-5 秒杀从"只读过滤"进化为"Lua 预扣 + 回补 + 对账"

**背景**：秒杀的矛盾在于：DB 条件更新能保证不超卖，但挡不住"全场流量都来数据库排一次队"；要在 DB 前加一层挡量，就要回答"Redis 扣了、DB 没扣成（回滚/崩溃），这个名额算谁的"。这个项目在这道题上走了三个版本，是最能体现"决策会迭代"的一条。

**备选方案（按时间序）**：版本一，只读过滤——抢购前 GET 一下 Redis 库存，为 0 就拒（实现最简）；版本二，删除预扣、纯 DB（审计发现版本一是死代码后一度回退）；版本三，Lua 单脚本原子"判重 + 判库存 + 记流水 + 扣减"，配失败回补与每分钟对账。

**最终决策**：版本三。且类注释直接写明了推翻版本一的原因与一致性设计。

**源码证据**：`xy-mall/server/src/main/java/com/xiaoye/mall/server/modules/seckill/service/SeckillStockRedisService.java` 类注释原文："一致性设计（修正上一版'Redis 前置'被删除的原因——回滚/漂移误判）：DB 仍为权威……崩溃窗口的幽灵流水由对账 Job 以 DB 为准清理（见 SeckillReconcileJob）；Redis 挂掉自动降级纯 DB 路径"。`HANDOVER.md` 第八轮 B 档记录了版本一的原貌："秒杀 Redis 库存前置过滤(只读 GET 过滤'已抢光'请求，未预热/Redis 挂则直走 DB，**不做预扣——避免回补不一致**)"；`CODE-AUDIT-20260905.md` P1-7 指出"秒杀 Redis 库存前置过滤是死代码……建议实现完整或删除"；`HANDOVER.md` 第十轮记录版本三落地并"借鉴 NFTurbo CollectionInventoryRedisService 的脚本组织"。三脚本的逐行语义见《05-核心流程》流程四。

**后果与代价**：抢完/重复抢的请求不再触达 MySQL，单机秒杀承载提升约两个数量级（《10-性能设计与优化》2.3 的性能账）。代价是系统里从此多了一个"对账"概念：`SeckillReconcileJob` 每分钟跑、失败要 try/catch 隔离；每次抢购失败路径都要同步回补 Redis（`compensateRedis`），回补本身失败还要再靠对账兜底——正确性链条从"一个事务"变成"预扣、建单、回补、对账四个环节的闭环"，理解成本显著上升（《12-FAQ》案例二就是漂移问题的真实排查过程）。

## ADR-6 超时关单三重兜底，拒绝 MQ

**背景**：订单 30 分钟未支付需要自动关闭。单一定时器方案（JVM DelayQueue 或每订单一个调度）在重启时丢失、在订单量大时资源失控；引入 MQ 延迟消息是最"标准"的答案，但与 ADR-1 的单实例定位冲突——为一个关单功能引入 RocketMQ，运维与学习成本都不成比例。

**备选方案**：一是 MQ 延迟消息（生产标配）；二是 DB 轮询（简单可靠但延迟等于轮询周期）；三是 Redis ZSet 延迟队列；四是把关单挂在读路径上（用户来看订单时顺手关）。

**最终决策**：三 + 二 + 四叠加成三重兜底，三条路径互不依赖、全部幂等，明确不用 MQ（留作微服务化的 M7 可选项）。第八轮先落地"延迟队列 + DB 轮询"两重，第十轮补第三重惰性触发。

**源码证据**：`modules/order/service/OrderDelayQueue.java`（ZSet `orders:pay-timeout`，5 秒轮询）、`modules/order/job/OrderTimeoutJob.java`（60 秒 DB 轮询）、`modules/order/service/OrderLazyCloseTrigger.java`（详情读路径异步触发）三个文件并存即决策本身；`HANDOVER.md` 第八轮"延迟队列(Redis ZSet orders:pay-timeout，下单入队+5s 轮询关单，DB 轮询兜底不变)"与第十轮第 7 条"超时关单第三重兜底……注意：用 ObjectProvider 注入执行器避免与 OrderService 循环依赖（本轮踩过已修）"；`BIG-TECH-READINESS-ASSESSMENT.md` 整改记录明确"DB 轮询改 MQ"不做；`MICROSERVICE-SHARDING-PLAN.md` M7 "可选：RocketMQ 延迟消息替换订单 ZSet 队列（保留 DB 轮询 Job 兜底不变）"。

**后果与代价**：任何一层失效（Redis 丢数据、定时任务停摆、无人访问详情之外的组合）订单仍会收敛，`closeIfTimeout` 的幂等 CAS 是全部路径的公共收敛点（《05-核心流程》流程三）。代价是同一个关单逻辑要保证三条触发路径的行为完全一致（超时分钟数三处同源读 `sys_config`），任何一处改语义都是三倍回归面；《10-性能设计与优化》2.4 节指出的"用秒级时延换每订单一个定时器的资源开销"也是这决策明码标价的部分。

## ADR-7 schema 演进强制 Flyway 且 validate 开启

**背景**：项目早期没有迁移工具，`upgrade-*.sql` 靠人肉按序执行，甚至有"报 1060 重复列就跳过"的口头约定。2026-09-05 凌晨发生了真实事故：带 `promo_discount` 新字段的 jar 先上线、V3 迁移后补，窗口期内 `OrderTimeoutJob` 连续失败 68 次，超时订单停止自动关单约一小时（审计报告原话）。

**备选方案**：一是维持手工脚本 + 文档约定（省一次重构）；二是引入 Flyway 但 validate-on-migrate 关闭（迁校验的误报，容忍漂移）；三是 Flyway + validate 开启，漂移即拒绝启动。

**最终决策**：第三条，配 `baseline-on-migrate: true, baseline-version: 1` 兼容存量库，旧脚本全部归档 `sql/archive/` 只作考古。

**源码证据**：`xy-mall/server/src/main/resources/application.yml` Flyway 段注释给出漂移处置（"先执行 flyway repair 或 baseline 对齐后再升级"）；`CODE-AUDIT-20260905.md` 工程节记载事故全程与修复（"Flyway `validate-on-migrate: true`（V6 checksum 已 repair 对齐）"）；`BIG-TECH-READINESS-ASSESSMENT.md` 差距清单第 5 项"无 DB 迁移工具"与整改记录"H2"；迁移脉络本身见《04-数据模型》第 2 节（V1~V8）。

**后果与代价**：schema 漂移从"上线后定时任务报错"这种间接信号，变成"启动即失败"的直接信号——把发现时点从运行期提前到部署期，正是这次事故买来的教训。代价是开发体验变硬：手改库结构、手工修数据后启动直接被拒，必须补一个 V(N+1) 迁移；回滚迁移没有自动机制（Flyway 社区版的固有限制），《06-部署运行》4.2 节提醒回滚 jar 时要自行评估已应用迁移的兼容性。

## ADR-8 订单号格式"userId + 毫秒时间戳 + 4 位随机"

**背景**：订单号要全局唯一、可读性过得去，还要为将来可能的分库分表预留路由能力（按 user_id 分片时，最好只看订单号就能算出落点）。自增 ID 做不了路由，UUID 无业务语义且索引膨胀。

**备选方案**：一是数据库自增 ID 暴露为订单号（简单，但可被遍历、无路由信息）；二是纯时间戳 + 随机（不含用户信息）；三是雪花 ID（分片友好但需要机器位管理，单实例下是过度设计）；四是 userId 前缀 + 时间戳 + 随机位。

**最终决策**：第四条，唯一键冲突时换号重试最多 3 次。分片评估文档把这一格式写成了硬约束。

**源码证据**：`modules/order/service/impl/OrderServiceImpl.java` 的 `generateOrderNo`：`userId + System.currentTimeMillis() + String.format("%04d", random)`，`saveOrderWithRetry` 捕获 `DataIntegrityViolationException` 换号重试（注释"订单号唯一键冲突（同用户同毫秒极小概率碰撞）时换号重试一次"）；秒杀侧 `SeckillServiceImpl.grab` 内联了同构的生成与重试逻辑；`MICROSERVICE-SHARDING-PLAN.md` §3.2 原文："order_no 现有生成规则**已以 userId 开头**，天然支持'按 order_no 提取 user_id 路由'，无需改号段格式"，§8 更进一步："**任何情况下不要改号格式**（写进 AGENTS.md）"。订单号与唯一键的表结构证据见《04-数据模型》3.3。

**后果与代价**：未来按买家分片时零迁移成本即可从订单号反查路由；同时 `uk_order_no` 唯一键 + 冲突换号让"订单号可遍历"问题也顺带缓解（随机位有 1 万种取值）。代价是：号长度随 userId 位数增长（演示环境 userId 个位数，号长约 18 位）；订单号的唯一性依赖"重试"这种概率手段而非确定性算法，极端并发下同一用户同毫秒的碰撞会消耗重试次数并可能抛"下单繁忙，请重试"——这是用简单性换确定性的明码代价。

## ADR-9 金额一律 INT 分，前端试算后端裁决

**背景**：电商金额用浮点是经典事故源（0.1+0.2≠0.3、精度累计误差、序列化抖动）。同时四层优惠（券→满减→积分→PLUS）的计算顺序一旦前端也实现一遍，就存在"两套算法漂移"的风险——改了后端忘了前端，用户看到的应付金额与实际扣款不一致。

**备选方案**：一是 BigDecimal 全链路（精确但序列化、运算样板代码多）；二是 double（最省事，精度债永久）；三是 INT 分 + 后端唯一裁决、前端计算仅作展示。

**最终决策**：第三条。金额字段全库 INT（分），优惠顺序在后端唯一实现，前端结算页同规则重算但值仅供参考。

**源码证据**：`AGENTS.md` 第 51 行工程约定："金额一律分（INT）"；`OrderServiceImpl.createOrder` 全程 int 运算且 `totalPrice` 为 `(int) Math.max(...)`；前端 `xy-mall-web/src/views/CheckoutView.vue` 的注释"运费规则后台可配（sys_config），默认满 99 包邮/运费 10 元，与后端一致"与"与后端 computePointsDeduction 同规则的前端预估"；《02-页面设计》6.2 节结论："前端试算只用于交互反馈，金额的最终裁决在后端"。审计报告 P3 还记录了一次配套整改：折扣券计算曾用 `Math.round(x * (100-p) / 100.0)` 引入 double，后改纯整数四舍五入。

**后果与代价**：浮点事故面归零，且积分抵扣的"取整不变式"可以被纯函数单测钉死（`PointsCalculatorTest.largeAmountNoOverflow` 连 int 溢出上界都验了）。代价是所有展示层都要随身携带"分转元"工具（H5 端 `src/utils/format.ts`、web 端内联 `(x / 100).toFixed(2)`），管理后台表单还要做"元输入 ×100 转分"的换算（《02-页面设计》2.2），新人忘除以 100 是最常见的界面金额放大一百倍事故来源。

## ADR-10 分库分表、MQ、Seata 刻意"只评估不引入"

**背景**：第十轮借鉴 NFTurbo 落地了限流、锁、Lua 预扣等"手法"之后，团队面临一个经典诱惑：既然高并发组件都齐了，要不要顺势把微服务、分库分表、分布式事务也补齐，让架构叙事完整？

**备选方案**：一是全量引入（架构故事最完整）；二是引入其中最简单的分表（ShardingSphere-JDBC 嵌入式，无代理层）；三是全部写成评估文档，代码不动。

**最终决策**：第三条，但评估做到了"可直接施工"的深度：拆分方案、分片键、迁移脚本思路、回滚方案全部落纸。

**源码证据**：`MICROSERVICE-SHARDING-PLAN.md` §0 结论先行："**可行，但这是一次'推翻既有定位'的架构升级，成本主要不在写代码，而在状态外置、事务边界重划与数据迁移**"；§6 "明确不做什么"清单（多机房、K8s、Service Mesh、Seata、分用户/商品库）；§8 "对现状代码的衔接说明"逐条列出哪些现成组件可平移。对照第十轮 `HANDOVER.md`："取其'手法'落进本单体（明确**不引入**其微服务/分库分表/Seata 等与单实例定位冲突的重件）"。

**后果与代价**：仓库保持了两台服务器以内可运行的轻盈，评估文档本身成为面试/评审素材（"最小路径 M1+M3+M4+M6 ≈ 8U 能讲出完整四步故事"）。代价是：这些文档会随代码演进过时（`REMAINING-BACKLOG-V2.md` 已示范过文档漂移，《13》D15 记录在案）；且"评估完备但未实施"容易被误读为架构能力只有纸面——这也是本篇把它单独列为一条 ADR 的原因：决策的价值在"想清楚了而不做"，读者应同时读评估文档与本条才能还原全貌。

## ADR-11 安全开关 fail-closed、便利开关锁进 dev profile

**背景**：模拟支付、验证码旁路这类"演示便利开关"是双刃剑：开发要的是一键通过，生产要的是默认关闭。审计（`CODE-AUDIT-20260905.md` P0-2）曾实锤一个后门：`start.sh` 硬编码 `--mall.captcha.allow-bypass=true`，导致"prod profile 的所有加固被启动脚本架空"。

**备选方案**：一是开关默认 true、生产手工关闭（fail-open，最顺手最危险）；二是开关默认 false、由 profile 显式打开（fail-closed）；三是删除开关本身，联调靠条件断点或测试数据。

**最终决策**：fail-closed + "便利项一律锁进 dev 配置文件"。代码内默认值一律取安全侧，dev 便利参数只在 `application-dev.yml` 声明，prod profile 物理上加载不到；`start.sh` 的后门参数被移除并留下注释。

**源码证据**：`modules/order/controller/OrderController.java` 第 47 行附近 `@Value("${xy-mall.payment.mock-enabled:false}")` ——代码默认 false，注释"默认关闭（fail-closed）"，dev/prod 配置显式置 true（prod 是演示站语义，接入真实支付后应改回，见《13》D6）；`CaptchaCodeService` 的旁路分支 `@Value("${mall.captcha.allow-bypass:false}")`，全仓库唯一声明处是 `application-dev.yml`；`xy-mall/start.sh` 现文注释："验证码旁路仅由 dev profile 提供（application-dev.yml），生产（prod profile）不可绕过"。审计修复记录（`CODE-AUDIT` 第八节）确认"start.sh 移除验证码后门并强制 profile（旁路仅存于 dev profile）"。

**后果与代价**：这类事故从机制上不可复发——即使运维误用 start.sh，旁路也只随 dev profile 生效。代价是 dev 与 prod 的行为差异点变多，联调时"为什么 prod 验证码 0000 不管用"成为新人高频疑问（《12-FAQ》案例一即此）；同时演示站的 prod 仍开着模拟支付，这个有意保留的口子被《08-安全与权限设计》第 7 节列为发布前逐项核对清单的第一行，把风险交给了发布流程而非代码。

## ADR-12 单 JWT + 会话版本，而非双 token 刷新令牌

**背景**：token 有效期与"登出即刻生效、被盗可吊销"是一对矛盾。业界标准解法是双 token（短效 access token + 长效 refresh token，配合轮换），实现复杂度不低；本系统的登录态管理需求是：改密/注销后旧 token 全失效、登出后当前 token 失效、平时少打一次 DB。

**备选方案**：一是双 token + 刷新端点（标准、但多一套签发/轮换/并发刷新逻辑）；二是纯短效 token（7 分钟级，过期重登，体验差）；三是单长效 JWT + 会话版本号（claims 带版本，与 DB 的 `token_version` 比对）+ 登出黑名单。

**最终决策**：第三条。7 天长效单 token，黑名单管"登出"，版本号管"全端失效"。

**源码证据**：`framework-core/.../security/JwtUtil.java` 只有一个 `createToken`（无 refresh 概念）；`LoginUserArgumentResolver` 四重校验的第 4 步比对 claims 的 `ver` 与 `user.token_version`（改密 +1 使旧 token 全失效，《05-核心流程》1.2 节④）；`TokenBlacklistService` 及其 Redis 实现 TTL 与令牌剩余寿命对齐；`BIG-TECH-READINESS-ASSESSMENT.md` B 维度差距栏如实写着"JWT 无刷新令牌机制"——即作者知道且接受了这个取舍。

**后果与代价**：一次验签 + 一次黑名单查 + 一次账号状态查即可完成鉴权，无刷新端点、无 refresh 表；改密场景的安全性（被盗设备立即掉线）反而优于很多只做双 token 不做版本号的实现。代价是 7 天窗口内的 token 泄露无法靠"短有效期"自然止损，只能靠黑名单/版本号主动作废；WebSocket 走 query 传 token 的场景泄露面更大（《08》第 8 节第 3 条建议演进为一次性 WS 票据），这是这条决策至今挂账的尾部风险。

## 14. 决策的公共模式与使用建议

把 12 条 ADR 并排看，可以提炼出这个项目做决策的三个公共模式。**第一，"正确性压倒架构叙事"**：微服务、MQ、分库分表三个最有"讲述价值"的选项全部被压到评估文档里，压秤砣始终是"单实例演示定位下这个组件的运维成本归谁付"（ADR-1/6/10）。**第二，"先实现简单版，让审计与事故推动升级"**：秒杀预扣三个版本（ADR-5）、Flyway 从事后补装到事故驱动开启 validate（ADR-7）、start.sh 后门被审计揪出后反转为 fail-closed 约定（ADR-11）——决策不是一次性完成的，过程档案就是决策的一部分。**第三，"每个决策同时写下代价"**：从 `SeckillStockRedisService` 类注释里的"修正上一版被删除的原因"，到 `AGENTS.md` 坑位清单对单实例假设的坦白，代码里随处可见"我知道这个选择的坏处是什么"的痕迹，这也是本套文档能把"代价"列写实的根本原因。

对读者的使用建议：接手系统做重大改动前，先对照本篇确认你的改动是否推翻了某条 ADR 的前提——例如引入第二个应用实例将同时推翻 ADR-1（单实例）与 ADR-2 的部分降级语义（计数分裂）、触发《13》D4/D5 的状态外置前置项；接入真实支付则触发 ADR-11 的清单核验。若要新增一条 ADR，建议沿用本文五段结构，并优先把"备选方案"与"代价"写实——这两段才是 ADR 区别于功能文档的价值所在。
