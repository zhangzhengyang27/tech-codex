# 16-决策记录ADR

> 项目：X-Pan ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析

## 0. 本文定位与读法

ADR（Architecture Decision Record，架构决策记录）记录的是"为什么当时这么选、放弃了什么、代价由谁承担"。本套文档的前 16 篇回答"是什么"与"怎么用"：《01-系统架构》描述分层与数据流的现状，《04-数据模型》描述表结构，《05-核心流程》描述时序——本文不重复这些内容，只做**决策考古**：每一条决策都按"背景 → 备选 → 决策 → 源码证据 → 后果"五段展开，候选方向来自已有篇目中反复出现的设计点，全部结论回到源码验证。被否掉的备选方案源码里不会留下痕迹，凡属从代码反推的合理推断而非仓库内文字记录的，均以"（推断）"标注；仓库内确有文字佐证的（注释、`DEV_GUIDELINES.md`、`CODE_AUDIT_2026-09-06.md`、`CHANGELOG.md`）直接引用。每条末尾的"后果"分为"收益"与"代价/遗留"两部分——一条没有代价的决策通常意味着代价还没有暴露，ADR 的价值就在于把代价写在明处。

十条 ADR 按架构层次自上而下排列：进程形态（ADR-001）、代码组织（ADR-002）、存储抽象（ADR-003/008）、数据模型（ADR-004/005）、会话安全（ADR-006/007）、稳定性（ADR-009）、协议接入（ADR-010）。

## ADR-001 采用模块化单体，把"微服务"留给未来

**背景**：项目以"分布式云存储"为题，最容易被期待的就是注册中心、网关、按服务拆分的部署拓扑。但网盘这类系统的第一性矛盾在大文件吞吐与数据一致性上，而不在服务间通信上；早期就引入 RPC 与注册中心，只会把"上传一个文件"变成一次分布式事务练习。

**备选**：其一，真微服务拆分（Nacos + OpenFeign + 网关），被否——个人网盘的单机吞吐远未触顶，拆分只会引入分布式 ID、链路追踪、服务发现这套与核心价值无关的复杂度；其二，大泥球单体（所有代码一个包），也被否——那会丧失"未来可拆"的期权，模块边界必须从第一天就存在。

**决策**：单 Spring Boot 进程（`x-pan-parent/server`，启动类 `com.xiaoye.pan.server.XPanServerLauncher`，端口 8081），业务按 17 个模块包切分，模块间只允许 Service 接口注入与 Spring 事件两条通道。"分布式"只落在存储层（MinIO 4 节点纠删码）与多端接入上。

**源码证据**：`x-pan-parent/pom.xml` 的 modules 仅 framework/server/distribution 三个；server 内不存在任何 RPC/MQ 客户端（父 POM 声明的 rocketmq 2.3.6 全仓库零使用点）；模块间调用均为进程内接口注入（如 `UserFileServiceImpl` 注入 `IFileChunkService`）。跨模块解耦的第二通道在 `server/src/main/java/com/xiaoye/pan/server/common/event/` 与 `common/listenner/` 成对出现。

**后果**：收益是部署一个容器、调试一个进程、事务一个边界——`@Transactional` 直接覆盖跨模块写。代价有两条：一是水平扩展前必须完成 JVM 锁的分布式化改造（见 ADR-007 与《13-技术债务与演进建议》D12）；二是"逻辑边界"没有编译器强制，靠的是包结构约定——`CommonLoginAspect` 的切点表达式 `execution(* com.xiaoye.pan.server.modules.*.controller..*(..))` 把包路径变成了安全契约，Controller 放错子包等于接口裸奔，这条约束记录在 `DEV_GUIDELINES.md` 后端红线第 1 条，且源自真实事故（OfflineTaskController 曾放错位置）。

## ADR-002 framework 与 server 用 Maven 依赖复用，而非 Spring Boot Starter 自动装配

**背景**：雪花 ID、JWT、缓存装配、存储引擎这些"平台件"需要一个不被业务污染的家，以便未来抽成独立开源件或被其它项目复用。

**备选**：其一，做成 Spring Boot Starter + `spring.factories`/`AutoConfiguration.imports` 自动装配，被否——自动装配把"哪些 Bean 生效"藏进条件注解里，对教学项目而言可读性反而不佳，且各框架模块的配置粒度差异大（swagger2 要读 profile，cache 要按 key 前缀分 TTL），强行统一装配模型得不偿失；其二，全部塞进 server 的 common 包，被否——业务横切（鉴权切面）与平台件（AES 工具）混居，复用无从谈起。

**决策**：framework 七个 Maven 模块（core/web/cache/orm/schedule/swagger2/storage-engine）以普通依赖被 server 引用，装配靠显式 `@Configuration` 与启动类注解（`@MapperScan("modules.**.mapper")`、`@ServletComponentScan`），server 的 `common/` 只放感知业务的横切件。

**源码证据**：`x-pan-parent/server/pom.xml` 依赖清单列出 `x-pan-web`/`x-pan-swagger2`/`x-pan-mybatis-plus`/`x-pan-schedule`/`x-pan-cache-redis`/`x-pan-storage-engine-local`/`x-pan-storage-engine-minio`；`framework/core` 的 `IdUtil`/`JwtUtil` 是零 Spring 依赖的纯静态工具（仅 jackson/guava/hutool 等工具依赖，见 `x-pan-parent/framework/core/pom.xml`）；缓存双实现通过 server 引入 cache-redis 还是 cache-caffeine 来切换（`framework/cache/` 下两个平级模块）。

**后果**：收益是依赖方向永远自上而下（server → framework），IDE 里任何反向引用立即编译报错；框架层可以脱离业务单独测试（framework 侧 17 个 `@Test` 即证明，见《09-测试与质量保障》）。代价是框架模块之间也形成了自己的依赖树（storage-engine-core 依赖 cache-core 与 core），复用到别的项目时无法只拷一个模块——"平台件"的边界是 Maven 模块级而非类级，抽取成本比 starter 略高；且配置项绑定散落在各模块的 `@ConfigurationProperties`（如 `MinIOStorageEngineProperties`）而非统一的 `spring.factories` 元数据，接入新项目时需要手工确认扫描路径。

## ADR-003 存储引擎抽象 + 50MB 阈值双路由

**背景**：网盘的存储介质选择是典型的"既要又要"——本地盘快而容量有限，对象存储容量近乎无限但有小请求开销与内外网地址问题；且介质切换（上云、换供应商）在项目生命周期内几乎必然发生。

**备选**：其一，直接写死 MinIO SDK 调用，被否——介质锁定，切换即全库重写；其二，只做接口抽象、不设路由，业务层自行判断，被否——路由逻辑散落各处后，"调整阈值"这种最常发生的运维动作就要改代码；其三，按文件类型路由（视频进 MinIO、文档进本地），被否——类型与大小相关性弱，规则复杂后无法向用户解释"为什么这个文件在本地"。

**决策**：`StorageEngine` 接口（六操作：store/delete/storeChunk/mergeFile/realFile/getPreviewUrl，见 `x-pan-parent/framework/storage-engine/storage-engine-core/src/main/java/com/xiaoye/pan/storage/engine/core/StorageEngine.java`）+ `AbstractStorageEngine` 模板方法（参数校验骨架，doXxx 下沉子类）+ `@ConditionalOnProperty(pan.storage.minio.enabled)` 装配；下载路径按 `pan.storage.minio.large-file-threshold`（默认 50MB）在"应用流式代理"与"302 预签名直链"之间路由。

**源码证据**：`MinIOStorageEngine.java` 第 49 行条件注解；`FileController.download`（第 216 行附近注释"MinIO 模式下大文件返回 302 预签名 URL"）读取阈值配置；预签名生成在 `MinIOStorageEngine.generatePresignedGetUrl`（第 466 行），`replaceEndpoint`（第 520 行）的注释块详细记录了"直接替换 endpoint 会破坏 X-Amz-Signature"的踩坑——内外网双地址问题最终靠 Nginx 反代解决而非应用层改写 URL。

**后果**：收益有三：业务代码零感知介质（SOP-5 的"接线 OSS 只是解注释"即其回报）；50MB 是可运维参数而非代码常量；模板方法把"先校验后执行"的骨架统一。代价有三：接口的六操作是按"文件网盘"形状设计的，新介质若不支持服务端合并（如某些纯 KV 存储）就得在实现里模拟或降级（`LocalStorageEngine` 无 compose 等价物，合并即本地拼接）；`getPreviewUrl` 对本地引擎语义尴尬（返回本地路径不可直访）；50MB 阈值只治理下载侧，上传侧分片字节仍全部流经应用——预签名 PUT 方法已在引擎中备好（`generatePresignedPutUrl`，第 490 行）但无调用方，直传是《10-性能设计与优化》第 7 节列出的头号优化项。⚠️ 待确认：`common/migration/StorageMigrationRunner.java` 的完成度——引擎抽象保证了"代码可切"，但存量对象迁移是切换的实际前置（见《13-技术债务与演进建议》D11）。

## ADR-004 主键全部应用层雪花生成 + 数据库无物理外键

**背景**：二十张表的引用关系呈网状（逻辑文件、物理文件、分享、版本、标签、保险箱相互引用），删除/还原/转存会同时触碰多张表。

**备选**：其一，数据库自增主键 + 物理外键级联，被否——自增 ID 可被遍历爬取（需再叠一层加密）；外键在"逻辑删除 + 事件驱动物理删除"的模型下会提前拦截或级联删除，与应用层的引用计数判定冲突；分库分表时自增主键还需重造。其二，UUID 字符串主键，被否——36 字符主键让二级索引膨胀，且 uuid v4 无序导致 InnoDB 页分裂。

**决策**：业务主键用 hutool 雪花算法（`IdUtil.get()`）在应用层生成，`db.sql` 开头显式 `SET FOREIGN_KEY_CHECKS = 0`（第 3 行）、结尾恢复（第 425 行），全部关联靠应用层维护 + 唯一索引兜底；对外 ID 经 AES-128 加密（`IdUtil.encrypt`，URL-safe Base64，解密侧强制 8 字节长度校验）。

**源码证据**：`x-pan-parent/framework/core/src/main/java/com/xiaoye/pan/core/utils/IdUtil.java` 第 35-37 行从 `XPAN_SNOWFLAKE_WORKER_ID/XPAN_SNOWFLAKE_DATACENTER_ID` 环境变量读节点号（0-31，缺省 0），注释明确"多节点部署时请分配不同取值，避免生成重复 ID"；`distribution/conf/db.sql` 第 103 行起的 `x_pan_user_file` 无任何 FOREIGN KEY 约束；`real_file_id → x_pan_file.file_id` 的引用完全由应用层与 `index_real_file_id` 类索引表达。

**后果**：收益是删除路径完全由应用掌控（`FilePhysicalDeleteEventListener` 的"引用计数归零才删对象"只有无外键才能实现）、分表友好、ID 不可遍历。代价有三：引用完整性从"数据库兜底"降级为"代码自觉"，任何一条删除路径漏清理从属表就产生脏数据，只能靠 `OrphanFileGc`（每天 3 点，`xpan.gc.orphan-cron`）事后清扫——这是无外键方案最重的一笔隐性税；雪花 ID 强依赖机器时钟，时钟回拨在 hutool 实现内有容忍但极端情况仍会抛错（推断，仓库未记录相关事故）；环境变量缺省 0 的默认值意味着"忘了配 workerId 就起两实例"不会报错，只会静默产生重复 ID 风险，⚠️ 待确认是否需要加多实例时的启动告警。

## ADR-005 把 del_flag 纳入同目录重名唯一键

**背景**："同一目录不能有两个同名文件"是网盘的基本业务规则，但回收站的存在让这条规则复杂化：文件删进回收站后（del_flag=1），用户理应能上传一个同名新文件；之后又想还原旧文件时，冲突如何裁决？

**备选**：其一，唯一键只含 (user_id, parent_id, filename)，还原/上传时由代码检查 del_flag 后放行，被否——并发下"先查后插"存在竞态，两个同名请求可能同时通过检查，约束最终还是要落库；其二，还原时自动改名（"文件(1).pdf"），被否——与 `checkRestoreFilename` 的显式冲突提示策略冲突（推断：个人网盘场景用户更希望自主决定如何处理冲突，而非被系统悄悄改名）；其三，应用层用分布式锁串行化同名检查，被否——单实例下过重。

**决策**：唯一键定义为 `uk_user_parent_folder_name(user_id, parent_id, folder_flag, filename, del_flag)`，把"是否在回收站"作为唯一性维度的一部分：del_flag=0 的同名唯一，del_flag=1 的记录不与正常文件争抢名字空间。

**源码证据**：`distribution/conf/db.sql` 第 123-124 行，且第 123 行注释原文写明动机："del_flag 纳入唯一键：未删除(del_flag=0)的同名唯一，已删除(del_flag=1)的可与新上传共存（还原时已有 checkRestoreFilename 校验）"。还原侧的配套校验在 `RecycleServiceImpl`（经 `UserFileServiceImpl` 的 `checkRestoreFilename`），`RecycleTest` 的 `testFileRestoreFailByWrongFilename1/2` 两个失败用例固化了冲突分支（《09-测试与质量保障》第 2 节）。

**后果**：收益是"防重名"下沉到存储引擎层，并发上传同名文件的第二个请求直接撞唯一键报错，无需任何应用层锁；回收站与新文件的命名空间天然隔离。代价有三：唯一键变长（五列），索引空间与比较成本略增；"同名删除态"自身的唯一性依赖 del_flag 只有 0/1 两值——若未来引入"多级回收站"或"版本化删除"，这个键需要重新设计；`checkRestoreFilename` 与唯一键的语义必须同步演进，改键不改校验（或反之）会留下"能插入却不能还原"或"能还原却插不进"的不对称窗口。

## ADR-006 JWT + Redis 双层会话与中点滑动续期

**背景**：登录态要在三组需求之间找平衡：验签要快（每请求都发生）、登出/改密/远程下线要立即可用（可吊销性）、Web 与移动端并存且互不踢线（多端隔离）。

**备选**：其一，纯无状态 JWT，被否——可吊销性为零，"远程下线设备"这个已上线的功能无法实现；其二，纯 Redis Session，被否——丢失了"不查库验签"的性能语义（虽然 Redis 也快，但 JWT 把"token 是否伪造"与"token 是否被吊销"两件事解耦了），且失去 JWT 内嵌 claims（clientId、续期点）的便利；其三，OAuth2 + refresh token 双令牌，被否——个人网盘引入授权码流程属于过度设计，refresh token 的轮换复杂度高于本方案的中点续期。

**决策**：JWT（HS256，24h）负责身份与过期；Redis 键 `USER_LOGIN_{userId}_{clientId}` 负责吊销与多端槽位；JWT 内写入 `RENEWAL_TIME`（签发时间 + 有效期/2，`JwtUtil.RENEWAL_DIVISOR=2`），请求越过续期点时按缓存 key 加锁签发新 token，旧 token 存 `_PREV` 键兼容在途请求，新 token 经 `New-Access-Token` 响应头下发。TTL 链条刻意设计为缓存 25h > JWT 24h > 续期点 12h。

**源码证据**：`x-pan-parent/server/src/main/java/com/xiaoye/pan/server/common/aspect/CommonLoginAspect.java` 第 104-143 行 `checkAndSaveUserId`（Authorization 头 → Cookie `login_token` 回退 → 验签 → 与 Redis 槽位比对含 `_PREV`）；第 164-203 行 `tryRenewToken`（`RENEW_KEY_LOCKS` 按 key 加锁 + 锁内二次检查复用已续期 token，第 184 行注释明确"避免并发互踢"）；`framework/cache/cache-redis/.../RedisCacheConfig` 按 key 前缀给 `USER_LOGIN_*` 单独 TTL；客户端自动换发逻辑在 `x-pan-fronted/src/utils/http.ts` 与 `x-pan-mobile/lib/core/network/http_client.dart` 两端拦截器。

**后果**：收益是三组需求全部满足且续期对业务代码完全透明（两端拦截器无感换发），_PREV 窗口让"续期瞬间在途的请求不 401"。代价有三：JWT 有效但不在线（Redis 槽位被删）的 token 仍会打到服务端才被拒，无法在网关层提前拦截——但本项目网关就是 Nginx 反代，无独立网关可做预校验，代价实际为零；`RENEW_KEY_LOCKS` 是 JVM 内 `ConcurrentHashMap`，多实例部署即失效（ADR-001 的扩展债之一）；WS 握手虽校验同一 Redis 键，但连接建立后不再复查吊销，已登出 token 的连接可存活到 JWT 自然过期（《08-安全与权限设计》第 8 节风险 3，⚠️ 待确认是否有加固计划）。

## ADR-007 秒传与物理删除共用 identifier 细粒度锁（TOCTOU 修复）

**背景**：秒传的语义是"查物理文件存在 → 新逻辑记录挂到既有 physical file_id"，物理删除的语义是"判定无引用 → 删记录 → 删对象"。两个临界区若不互斥，就存在经典的 check-then-act 竞态：秒传刚查到物理文件、还没插引用，物理删除线程恰好判定"无引用"并删掉对象——新记录挂在一个不存在的对象上。

**备选**：其一，数据库层面给 `x_pan_file` 加"软删除标志 + 延迟物理删除"，让秒传永远能查到记录，被否——延迟删除需要引入新的状态机与清理任务，复杂度高于锁方案（推断）；其二，全局 synchronized，被否——把所有文件的秒传/删除串行化，吞吐不可接受；其三，乐观锁版本号，被否——冲突后的重试路径要把"查 + 插引用"整体重做，事务边界变复杂。

**决策**：两处临界区共用同一张按 identifier 粒度的 JVM 锁表 `FilePhysicalDeleteEventListener.SEC_UPLOAD_IDENTIFIER_LOCKS`——锁粒度是"同一个 MD5 的文件"，不同文件完全并行；`UserFileServiceImpl.secUpload` 在锁内完成"查 + 挂引用"。这是审计 B7 的正式修复。

**源码证据**：`x-pan-parent/server/src/main/java/com/xiaoye/pan/server/modules/file/service/impl/UserFileServiceImpl.java` 第 260-280 行，第 261 行注释原文："B7 修复 TOCTOU：与物理删除监听器共用 identifier 锁表，保证本方法『查 realFileId + 保存引用』与监听器『isUnused 引用判定 + 删记录 + 物理删除』临界区互斥，避免秒传挂到正被删除的实体文件上"；锁表定义在 `common/listenner/file/FilePhysicalDeleteEventListener.java`；`DEV_GUIDELINES.md` 后端红线 8 固化了"任何复用 realFileId 的新路径必须进同一临界区"的约定。

**后果**：收益是以一把内存锁买回数据一致性，且"哪个新路径必须加锁"被红线明确化。代价有三：JVM 锁多实例失效（与 ADR-006 同一笔扩展债）；锁保护的是"查与挂引用"，但秒传命中后的配额扣减、`saveUserFile` 写库仍在锁内执行——同 MD5 大量并发秒传时会在这把锁上排队（个人场景无感，但这是设计上的吞吐上限）；红线靠人工遵守，新开发者绕过锁表自建锁的概率不低，`SOP-5`/`11-扩展开发指南`的"动代码前五问"第 3 问就是针对它。

## ADR-008 分片协议锁定 5MB，composeObject 快慢双路径兜底

**背景**：分片大小是三端协议常量，一旦定死就难以更改（移动端发版后不可召回）。它同时受四个力约束：分片太小则请求数爆炸，太大则单分片失败重传代价高；MinIO `composeObject` 要求除最后一个源对象外每个源 ≥5MB；3GB 上限（`@Max(3221225472)`）下分片数不能超过 compose 的 1000 上限太多。

**备选**：其一，动态分片（按文件大小自适应 5-20MB），被否——三端协议常量失去一致性，断点续传的 `uploadedChunks` 语义要求分片划分稳定；其二，服务端合并一律走"下载拼接"，被否——大文件字节全部回流应用，出口带宽与内存成为瓶颈，恰恰放弃了对象存储的服务端合并红利；其三，走 MinIO 原生 multipartUpload（uploadId 模型），被否——uploadId 需要服务端维护与分片记录的第二套映射，而 X-Pan 的分片定位已经靠 `identifier + chunkNumber` 唯一化（联合唯一键 `uk_identifier_chunk_number_create_user`），再引入 uploadId 是重复建模（推断，`doStoreChunk` 第 143 行注释亦说明"不依赖 uploadId"）。

**决策**：三端统一 5MB 强制分片（Web 端 `useUploader.ts` 的 `forceChunkSize: true`，注释写明"满足 MinIO composeObject 合并限制"；移动端 `app_config.dart` 的 `chunkSize` 同值同注释）；引擎侧合并分快慢双路径——快路径 `mergeByComposeObject`（≤1000 分片一次 compose，超过则 `mergeInBatches` 按批 1000 递归合成 `.tmp.{round}` 中间对象），慢路径 `mergeByDownloadAndUpload`（检测到 <5MB 非末分片或 compose 异常时回退下载拼接）。

**源码证据**：`MinIOStorageEngine.java` 第 57 行 `MIN_COMPOSE_PART_SIZE = 5L * 1024 * 1024`；第 182-209 行的阈值检测与回退分支；第 216-218 行 `ensureContentType` 的注释解释了 composeObject 无法设置元数据、需 copyObject 自覆盖补 Content-Type（否则浏览器预览退化为下载）；`FileChunkServiceImpl.doJudgeMergeFile`（第 113-143 行）只统计未过期分片并校验 `[1..totalChunks]` 连续集合。

**后果**：收益是快路径让合并字节不经过应用（对齐主流网盘的服务端内部合并），慢路径保证旧客户端/异常分片也能正确合并（正确性优先于速度）。代价有三：5MB 成为三端不可单独更改的协议冻结点（改它必须三端同步发版）；`ensureContentType` 的 copyObject 自覆盖是一次额外的服务端内部拷贝，超大文件上有可观测的成本（推断，未量化）；快慢路径的存在意味着同一功能有两条代码路径需要测试，CI 当前关闭 MinIO（`application-ci.yaml` `pan.storage.minio.enabled: false`），快路径没有自动化覆盖（《09-测试与质量保障》第 6 节 P1 缺口）。

## ADR-009 熔断只护两个不可控下游，限流 fail-open

**背景**：服务端有两类"不属于自己的依赖"：对象存储（MinIO 集群，网络/磁盘故障不可控）与离线下载的目标 URL（任意外网地址）。其余依赖（MySQL/Redis）是同机房强管理资产，且有健康检查与部署编排兜底。

**备选**：其一，全依赖熔断（给每个 Mapper、每个 Redis 调用都套 Resilience4j），被否——熔断的语义是"隔离不可控故障域"，对可控依赖滥用熔断只会把明确的连接错误变成模糊的降级行为，掩盖真实故障；其二，限流 fail-closed（Redis 挂了就拒绝所有请求），被否——限流是保护性旁路设施，它的故障不应放大为服务不可用，"限流器拖垮服务"恰是要防的反噬。

**决策**：Resilience4j 只注册 `minioStorage` 与 `offlineDownload` 两个实例（30s 半开 + 重试），`MinIOStorageEngine.doStore` 上叠 `@CircuitBreaker + @Retry`；限流器 `RedisRateLimiter.tryAcquire` 在 Redis 异常时放行（fail-open），阈值未配置时同样跳过。

**源码证据**：`x-pan-parent/framework/storage-engine/storage-engine-minio/src/main/java/com/xiaoye/pan/storage/engine/minio/MinIOStorageEngine.java` 第 112-114 行注解与第 677-681 行 fallback `onCircuitOpen`（抛 IOException"MinIO 暂不可用"）；`x-pan-parent/server/src/main/java/com/xiaoye/pan/server/common/ratelimit/RedisRateLimiter.java` 第 65-69 行注释"Redis 故障时降级：放行（避免限流拖垮服务）"；实例配置在 `application.yaml` resilience4j 段。

**后果**：收益是故障域被精确隔离——MinIO 抖动表现为"存储类操作批量失败 + 熔断面板 OPEN"，用户登录、浏览、分享不受牵连；限流的故障与主链路解耦。代价有三：fail-open 意味着"Redis 故障 + 攻击流量"叠加时限流形同虚设，此时防爆破计数（同样在 Redis）也已失效，系统处于裸奔窗口，需要部署侧告警兜底（`deploy/alerts.yml` 只覆盖 MinIO，⚠️ 待确认是否补 Redis 告警）；`offlineDownload` 熔断实际保护的是外网 HTTP 拉取，把"目标 URL 慢"与"自身线程池耗尽"混在一个熔断器里，语义略粗（线程池 3 线程的隔离才是主要防线）；fallback 只覆盖 `doStore`，`doStoreChunk/doMergeFile/doReadFile` 无 fallback 方法，熔断打开时它们表现为原始异常——错误信息不统一（推断，从注解分布读出）。

## ADR-010 WebDAV 以最小协议子集交付（实际为"只读形态"）

**背景**：第三方客户端（Finder/RaiDrive/Cyberduck）挂载是网盘的"专业用户"能力，但 WebDAV 全协议（LOCK/PROPPATCH/ACL/quota）实现成本高，且上传通道与既有分片协议重复。

**备选**：其一，引入 milton/sardine 等第三方 WebDAV 服务库做全量协议，被否——`WebDavController` 类注释给出了明确理由："sardine 适合纯客户端调用 milton 强大但学习成本高"，且引库后协议行为不再完全可控；其二，放弃 WebDAV，让用户走 HTTP API，被否——挂载为网络磁盘的体验（资源管理器内直接拖拽）没有 API 替代品；其三，实现含 PUT 的完整子集，被搁置——PUT 需要与分片上传、配额、保险箱校验全部打通，优先级让位于核心功能。

**决策**：零第三方依赖手写协议子集，单 Controller 按 method 分发；Basic Auth 与 JWT 体系并行（不复用 login 以防误锁账户，凭证缓存 10 分钟）。**当前源码的实际能力边界比"子集"更窄**：`@RequestMapping` 只注册了 GET/POST/PUT/DELETE/OPTIONS/HEAD 六个方法——PROPFIND/MKCOL/MOVE/COPY 根本到不了处理器（Spring 路由层即 405），处理器内的 `handleMkcol`（第 283 行）与 `handleMoveOrCopy`（第 352 行）也返回 501；`handlePropfind`（第 293 行）是桩实现（只回显请求路径自身的元数据，size 恒 0，不遍历真实文件树）；GET 的路径语义是"加密 fileId"而非层级路径。

**源码证据**：`x-pan-parent/server/src/main/java/com/xiaoye/pan/server/modules/webdav/WebDavController.java` 第 67-73 行（method 注册列表）、第 254-265 行（PUT 501，"PUT 暂未实现，请使用 Web 端上传"）、第 282-290 行（MKCOL 501）、第 351-356 行（MOVE/COPY 501）、第 292-339 行（PROPFIND 桩）、第 234-245 行（GET 按加密 fileId 下载）。

**后果**：收益是依赖面最小（零 WebDAV 库）、行为完全可控、安全要点集中（split(":",2) 保冒号密码、路径拒绝 `..`、鉴权不触发登录失败计数、finally 清理线程上下文）。代价有三：**目录浏览不可用**——客户端挂载后的 PROPFIND 列不出真实文件树，"挂载为网络磁盘"的实际达成度远低于 OPTIONS 头宣称的能力（`Allow` 头列出了 MKCOL/MOVE/COPY/PROPPATCH，与实现不符，属协议声明先行）；这里曾存在文档漂移——《13-技术债务与演进建议》D3 与《15-接口全量参考》第 7 节将 MKCOL/MOVE/COPY 描述为"可用"，与源码不一致（三者可能是"曾经可用后被收敛"或"文档先于实现"，CHANGELOG 未记录裁决）；本文以源码为准，上述两处及《00》《01》《08》《12》的同口径表述已在 2026-10-06 的一致性回刷中修订；路径模型（加密 fileId）与 WebDAV 客户端的层级路径假设不匹配，意味着未来实现 PUT/PROPFIND 时需要先补"路径 → 文件树"的解析层，工作量大于按 501 注释预期的"补一个上传调用"。

## 结语：十条决策的共同取向

把十条 ADR 并排看，能读出这个代码库稳定的价值排序：**第一，正确性优先于性能**（秒传锁、慢路径合并、唯一键兜底都是在"更快"的选项面前选了"更对"）；**第二，简单性优先于完备性**（模块化单体、手写 WebDAV 子集、无外键，都是先用最朴素的方案守住边界，把升级空间留成期权而不是预支复杂度）；**第三，约束文档化**——几乎每条决策的代价侧都对应一条 `DEV_GUIDELINES.md` 红线或一个测试用例（`testFileRestoreFailByWrongFilename` 之于 ADR-005），"决策 → 代价 → 约束 → 测试"这条链没有断。为项目新增重要决策时，建议沿用本文五段结构落一条 ADR 并同步更新红线清单；本文若与源码冲突，以源码为准——ADR 记录的是决策时点的判断，不是永久的事实。
