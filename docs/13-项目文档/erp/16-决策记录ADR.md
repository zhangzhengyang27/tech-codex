---
title: "16-决策记录ADR"
description: "项目：ERP-CRM ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析"
category: 项目文档

---
# 16-决策记录ADR

> 项目：ERP-CRM ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析

本篇是**关键决策的考古记录**（Architecture Decision Record 风格）：把散落在源码注释、AGENTS.md、`笔记/`、`db-backup/` 与两个 git 仓库提交历史中的重大取舍，按"背景 → 备选方案 → 决策与理由 → 源码证据 → 后果与遗留"五段式逐条还原。与前 16 篇的分工：架构结论的完整展开见《01-系统架构》第 4 节，风险与债务的量化台账见《13-技术债务与演进建议》，本篇只回答一个此前没有任何一篇正面回答的问题——**"当初为什么这么写，而不是那样写"**。每条 ADR 的证据均标注真实路径或 git 提交哈希，无法从仓库确证的细节一律标 ⚠️ 待确认。

关于证据口径需要先交代几句。后端仓库 `erp-crm/`（main 分支）共 39 个提交，首个提交 `53af337`（"初始提交：SpringBoot 3 单模块 ERP+CRM"）就已经是合并后的单模块形态，因此"七模块合并"这个动作本身发生在 git 初始化之前，没有提交记录可考，只能依据 AGENTS.md 的自述与课程原码的外部对照——这是本篇唯一一处"无一手物证"的决策，其余各条都能给出提交哈希级别的证据。前端仓库 `erpcrm-ui/` 保留了三个分支（main、vite-vue3、pure-admin），恰好构成前端两轮改造的完整地层剖面：main 分支是 Vue2 旧实现，vite-vue3 分支是第一轮 Vue3 改造的固化现场，pure-admin 分支（当前 checkout）是第二轮换底座后的现状，两轮之间"换了什么、留下了什么"可以直接 diff 对照，这在一般项目里很难得。开发笔记 `笔记/`（1-.md、2.md、3.md、未命名.md）多数是学习摘录（@ConfigurationProperties、XSS 原理、字符编码、树形结构设计），只有 `笔记/未命名.md` 是与决策直接相关的调研笔记——它记录了多租户三种数据隔离策略与四种部署模式的对比矩阵，是 ADR-001 的直接思想来源。

## ADR-001：多租户采用"独立数据库"物理隔离（每租户一个 MySQL 库）

**背景**。项目定位是面向多企业订阅的 SaaS（套餐/配额/到期三件套），租户数据隔离是第一卖点；客户/合同/回款属于高敏感业务数据，隔离强度直接决定产品可信度。

**备选方案**。`笔记/未命名.md` 完整记录了当时的调研：① 共享库共享表（TenantID 行隔离）——隔离最弱、校验负担最重；② 共享库独立表——隔离中等、表数量随租户膨胀、跨租户查询困难；③ 独立数据库——隔离最强、备份/迁移以租户为单位、但连接数与运维成本最高。该笔记的对比表结论是"隔离性：DB 隔离 优，表隔离 良，行隔离 差"。

**决策**。选方案③，每个租户一个独立 MySQL 库；租户连接信息（URL/账号/口令）登记在主库 `erp-crm-master` 的 `master_tenant` 表，运行时按请求头 `tenant` 动态路由。

**源码证据**。登记表结构见 `erp-crm/sql/erp-crm-master.sql`（第 21-35 行，`tenant` 列唯一键 `uk_tenant`）；请求期路由见 `erp-crm/src/main/java/com/ec/auth/interceptor/TenantInterceptor.java` 与 `erp-crm/src/main/java/com/ec/auth/datasource/DynamicRoutingDataSource.java`；注册即真实建库见 `erp-crm/src/main/java/com/ec/auth/web/service/TenantRegisterService.java`（`CREATE DATABASE` + 最小授权 `GRANT` + 模板 SQL + 失败回滚 `DROP DATABASE`）。库名前缀可配置：`erp-crm/src/main/resources/application-druid.yml` 第 88 行 `prefix: ${EC_TENANT_DB_PREFIX:ec_}`，由 `TenantRegisterService` 第 66 行读取；现存历史租户库 `ryt_nelub7xr`（tenant1）为早期 `ryt_` 前缀的产物，`db-backup/ryt_nelub7xr_20260907.sql` 头部注释可证。

**后果**。正面：租户数据物理隔离、按租户备份恢复（`erp-crm/ops/backup.sh` 逐库 dump 加密）、单租户数据可整体搬迁。负面代价同样成体系出现：连接数预算问题催生了租户池小规格（`spring.datasource.druid.tenant.*`，initialSize=1/minIdle=1/maxActive=10）与闲置整池淘汰（`IdleDataSourceEvictor`，git 提交 `6ce3145`"租户数据源闲置整池淘汰 + 小规格租户池 + 注册竞态与主库双池修复"）；schema 演进需要对每个租户库重复执行（催生 ADR-008）；跨库一致性成为审批流的头号难题（催生 ADR-003）。这是一组"一个决策派生一串后续决策"的典型案例。

## ADR-002：七个 Maven 模块合并为 Spring Boot 3 单模块

**背景**。课程原码按 center/auth/system/common/saas/crm/erp 拆分七模块（Spring Boot 2.5.8），同时升级到 Spring Boot 3.5.16（jakarta 命名空间迁移）。

**备选方案**。① 保留七模块随升级改造——依赖管理树完整但构建发布负担不变；② 合并单模块、用包结构保留边界；③ 微服务化拆分——对单机部署的课程规模明显过度设计。

**决策**。选②：单 Maven 模块 + `com.ec.{auth,common,saas,sys,web,crm,erp}` 包边界。AGENTS.md 目录结构节明确记载："后端原为 7 个 Maven 模块（center/auth/system/common/saas/crm/erp），已于 2026-09 合并为单模块"。

**源码证据**。`erp-crm/pom.xml`（artifactId `ec`，parent spring-boot-starter-parent 3.5.16，`<finalName>erpcrm</finalName>`，mainClass `com.ec.ErpCrmApplication`）——全文件仅一个 `<dependencies>` 段、无 `<modules>` 段；git 首个提交 `53af337` 的提交信息即"SpringBoot 3 单模块"，说明合并先于仓库初始化完成。

**后果**。构建、依赖、发布全面简化（一个 pom、一个 jar、一条 CI）；代价是原模块间的依赖边界失去 Maven 的强制力，只能靠包边界 + 纪律维持——好在项目实际形成了"业务域不横向 import"的约定（见《07-模块详解》第 7 节），唯一例外的跨域 service 依赖是 `CrmStatisticServiceImpl`。另有一个可观察的副作用：原"system 模块"的包名在合并中写成 `com.ec.sys`（Controller 在 `com.ec.web`），而 AGENTS.md 后端约定节仍写 `com.ec.system`，构成 D13 记录的文档漂移之一。

## ADR-003：Flowable 引擎表固定落主库，审批跨库走补偿式一致性

**背景**。合同审批需要流程引擎；而系统是"1 主库 + N 租户库"架构，引擎表落在哪里成为一个必须显式回答的问题。

**备选方案**。① 每租户库复制一套 ACT_* 表——租户完全隔离，但注册租户即复制几十张引擎表、引擎配置需按租户多实例化；② 引擎表统一落主库、按 businessKey 编码租户——租户注册零成本、引擎单实例，代价是审批数据与业务数据分属两库；③ 自研轻量审批单（状态位 + 留痕表）——无引擎依赖但流程编排能力弱。

**决策**。选②（并在早期短暂走过③：git 提交 `b0f2684`"新增合同审批流（轻量审批单模式）"，随后 `9f51b23`"合同审批流深度集成 Flowable 引擎"完成替换，`ab1fcfe`"审批模块租户过滤与跨库一致性改造"定型跨库方案）。

**源码证据**。`erp-crm/src/main/resources/application.yml` 第 147-151 行：flowable 段注释明写"引擎表统一落在默认数据源 master 库，按 tenantId 区分租户"，`database-schema-update: true` 启动自动建表、`async-executor-activate: false` 全同步执行；`erp-crm/src/main/java/com/ec/crm/service/impl/CrmApprovalServiceImpl.java` 类注释完整记录了三要素：businessKey 编码 `tenant:contractId`、"待办/已办按 businessKey 前缀过滤租户（引擎表单列谓词），避免按租户变量过滤的变量表 join"、跨库一致性"租户库回写先行，引擎操作最后执行；引擎失败则补偿回退租户库，避免'引擎已推进、业务数据卡在待审'且无法重试的死锁"。主库侧留了结构对齐的 `crm_approval` 表（`sql/erp-crm-master.sql`，脚本注释"业务表落主库；与 db-backup/upgrade_approval.sql 保持一致"），为将来"审批中心整体迁主库"预埋了退路。

**后果**。租户隔离在审批域弱于业务域（所有租户流程实例共处主库 ACT_* 表，隔离靠应用层前缀过滤，见《08-安全与权限设计》第 2 节）；`useMaster()/useTenant()` 成对切换成为该文件的心智负担（`selectApprovalList` 循环体切换 6 次）；一致性语义降级为最终一致（崩溃窗口靠"回写幂等 + 重试自愈"兜底）。演进建议（引擎多租户配置化或审批整体迁主库）已在《13-技术债务与演进建议》路线图长期段，触发条件是"出现第二个流程定义需求"。

## ADR-004：代码生成器路线——gen_business_modules.py"生成后即固化"

**背景**。商机/合同/回款三个模块是纯 CRUD 形态，逐个手写六件套（domain/mapper/XML/service/controller）重复劳动明显；RuoYi 原带的 `/tool/gen` 在线生成器依赖其后台服务，未随单模块迁移（死页面，D19）。

**备选方案**。① 恢复 RuoYi gen 模块——功能全但要跟随升级维护一整套生成后台；② 引入 MyBatis-Generator 等通用工具——产物风格与项目 RuoYi 惯例（@Excel、BaseEntity、left join 注入）对不上；③ 自写一个一次性 Python 脚本，按声明式元数据产出六件套。

**决策**。选③：`erp-crm/gen_business_modules.py`（451 行），`MODULES` 数组声明实体/表/列元数据/join 关系，六个模板函数各产一个文件，产物直接入库固化，生成器本身不参与运行时。

**源码证据**。git 提交 `de7b3d0`"新增商机/合同/回款三个 CRM 模块"即生成产物落库的时点；产物现存 `erp-crm/src/main/java/com/ec/crm/{domain,mapper,service,controller}/` 的 `CrmOpportunity*/CrmContract*/CrmReceivable*` 系列文件。生成器与产物的"代际差"在 `CrmContract.java` 上清晰可见：第 36 行 `reviewStatus` 字段是审批升级（`db-backup/upgrade_approval.sql` 加列）时手工补的，生成器的 `MODULES` 定义里没有该列——重跑生成器会整文件覆盖丢失这个字段。

**后果**。正面：三模块代码风格与手写模块完全一致、生成逻辑透明可读（本套《18-代码走读实录》逐函数拆解）、零运行时依赖。负面：`BASE/PKG/RES` 写死作者本机绝对路径（D17）、不支持非等值查询/复合主键/前端页面、生成产物与生成器定义必然随手工演进脱节。由此形成的红线是"生成后不再重跑"（见《11-扩展开发指南》SOP-2），后续模块演进一律走手工 + 增量迁移。该决策本质是承认"生成器的价值在第一次产出，而不在持续维护"。

## ADR-005：前端两轮改造——换底座不重写业务，TS 基座 + JS 业务层双轨

**背景**。课程原前端是 Vue2 + 自研 webpack 工程；团队希望升级到 Vue3 生态并获得工程化底座（路由/布局/多标签/主题），但 86 个业务页面重写成本不可接受。

**备选方案**。① 保持 Vue2 只做修补；② Vue3 重写全部业务页；③ 两轮渐进：先 Vue3 化（保留原 JS 代码），再整体替换 pure-admin 模板底座（业务代码仍保持 JS）。

**决策**。选③，且明确"基座归 TS、业务归 JS"的分层契约：`src/{layout,router,store,config,style,plugins/*.ts}` 为基座（TS，吃模板的类型收益），`views/ api/ components/ composables/ directive/` 保持 JS（存量代码零迁移成本）。

**源码证据**。`erpcrm-ui/` 三分支地层：main（Vue2 旧实现）→ vite-vue3（第一轮 Vue3 改造）→ pure-admin（当前）。AGENTS.md 技术栈节与项目简介节对两轮改造与"业务代码保持 JS"均有明文。当前 `erpcrm-ui/package.json` 的 `"description": "ErpCrm 前端（pure-admin 模板底座 + erpcrm 业务层）"` 与 `"version": "4.0.0"` 即第二轮改造的自述；`erpcrm-ui/tsconfig.json` `exclude **/*.js` 是双轨契约在构建层的落点（业务 JS 不进 typecheck，D16）。

**后果**。正面：两轮改造都以"底座替换、业务照搬"完成，`useTable/useDict` 等 composables 让 86 页维持统一形态；旧实现随时可对照（分支可 checkout）。负面：业务层零类型检查，重构安全网只剩 lint + 两个 vitest 文件；TS/JS 边界处需要适配层（`src/api/user.ts`、`src/api/routes.ts` 两个"翻译官"文件）；渐进 TS 化成为长期待决题（D16，见《13-技术债务与演进建议》路线图"前端治理"段）。

## ADR-006：图形验证码"先恢复、后移除"的产品决策

**背景**。课程原码带 RuoYi 标准验证码链路（`/captchaImage` + Redis `captcha_codes:{uuid}`）；工程化加固初期一度恢复并配套了 IP 限流与账号锁定。

**备选方案**。① 保留完整验证码——防机器撞库最直接，但登录链路多一次往返与前端图形交互；② 移除验证码、保留 IP 限流 + 密码错误锁定两件套——登录简化为租户/账号/密码三输入框。

**决策**。按产品决策移除。git 历史完整记录了这次反复：提交 `8339bee`"feat(security): 登录验证码恢复+IP限流+密码失败锁定"先恢复，随后 `b036eec`"feat(security): 按产品决策移除注册/登录图形验证码——登录防护保留 IP 限流（30次/分）与密码错误锁定（5次/10分钟）"正式移除；前端同步提交 `e3f64b4`"feat(login): 移除登录页与注册页图形验证码（后端已同步删除 /captchaImage）"。

**源码证据**。`erp-crm/src/main/java/com/ec/common/core/domain/model/LoginBody.java` 仅 username/password 两字段；`erp-crm/src/main/java/com/ec/common/utils/VerifyCodeUtils.java` 成为无引用孤儿工具类（全库 grep 仅此一处命中 captcha 语义）；测试 `erp-crm/src/test/java/com/ec/auth/LoginAuthChainIntegrationTest.java` 类注释明写"图形验证码已按产品决策移除，登录防护依赖 IP 限流与密码错误锁定"。

**后果**。安全面收窄（分布式慢速撞库理论上可行，绕过单 IP 限流），已列 D01 为最高优先级债；更大的实际成本是**文档口径三方打架**——AGENTS.md 认证流程节仍描述完整验证码链路（含 code/uuid 字段与 60 次/分限流），与源码、测试注释相互矛盾，每个新人都要重新考古一遍。处置动作二选一（重新实现或正式改文档）已在《13-技术债务与演进建议》路线图短期段置顶，无论选哪个，先让这件事"有结论"是共识。

## ADR-007：租户库口令 AES-256-GCM 静态加密 + 启动迁移器收敛存量明文

**背景**。`master_tenant.password` 存放各租户库的连接口令，课程期为明文；2026-09-11 曾发生全量口令轮换（`db-backup/README.md` 记载），需要防止"明文口令再次进库"的问题重演。

**备选方案**。① 应用层加密 + 启动迁移存量；② 依赖 MySQL 磁盘加密/文件系统加密——部署环境不可控，且 dump 备份仍是明文；③ KMS/凭据管理服务——单机部署形态下过重。

**决策**。选①：AES-256-GCM 静态加密，密文格式 `enc:v1:<iv>:<密文>`，密钥经 SHA-256 派生自 `EC_TENANT_PASSWORD_KEY`；加解密封装在 `MasterTenantServiceImpl` 读写路径，`MasterTenantPasswordMigrator` 在应用启动时把存量明文行批量改写为密文，形成"新写入即密文 + 存量启动迁移"的收敛闭环。

**源码证据**。`erp-crm/src/main/java/com/ec/saas/security/TenantDbPasswordCipher.java`、`erp-crm/src/main/java/com/ec/saas/security/MasterTenantPasswordMigrator.java`；git 提交 `57bc158`"feat(security): master_tenant 租户库口令静态加密——AES-256-GCM 服务层透明加解密 + 启动迁移收口明文 + prod 强制密钥校验（28 例单测，TDD）"，以及审查修复 `6dd6cc0`（迁移逐行容错、prod 密钥强制 ≥32 字节、未配钥解密密文时告警）。种子数据层面的配套：`sql/erp-crm-master.sql` 中 tenant1 口令列为 `ROTATED` 占位符，真实凭据只走 `.env`。

**后果**。正面：静态泄露面收敛、轮换有规程（`erp-crm/config/README.md`，注意硬约束——AES-GCM 密钥轮换后旧密文不可解，需同步重写主库口令）。负面：新增一条"禁手"——直连 `MasterTenantMapper` 的代码会绕过加解密层（AGENTS.md 明示）；未配钥的直通模式是唯一"宽松但不报错"的安全配置，密文值直通会产生费解的 JDBC Access denied（decrypt 内已有显式 warn 日志把静默故障变为可排查信号，见《08-安全与权限设计》7.1）。

## ADR-008：schema 演进不用迁移框架，靠幂等 upgrade 脚本 + 人肉纪律

**背景**。"1 主库 + N 租户库"意味着一次结构变更要对多个库重复执行；是否引入 Flyway/Liquibase 是一个显式选择题。

**备选方案**。① 引入 Flyway（社区版对多库编排支持一般 ⚠️ 待确认届时版本能力）；② 引入 Liquibase；③ 自建轻量机制：幂等 SQL 脚本 + 命名时间戳定序 + "模板即最新结构"约定（新租户直接拿最新模板，只有存量库需要跑 upgrade）。

**决策**。选③。五批脚本沉淀在 `db-backup/upgrade_{business_modules,approval,supply_finance,warehouse_transfer,stock_adjust}.sql`（2026-09-08 凌晨到早上的文件时间戳即执行顺序），幂等风格为 `CREATE TABLE IF NOT EXISTS`、插入前 `WHERE NOT EXISTS` 探重、菜单先 DELETE 再插。

**源码证据**。`db-backup/` 五个 upgrade 脚本本体；git 提交 `4a582ed`"补充演示数据与数据库升级脚本（乱码修复/真实级演示数据/三模块升级）"、`06a9fa9`（CI 首跑暴露本地库与种子脚本长期未同步——正是没有账本的代价显形）。租户模板 `erp-crm/src/main/resources/init-sql-script/erp-crm-tenant-sample.sql` 已合入全部五批变更，CI（`erp-crm/.github/workflows/backend.yml`）每次从零执行模板建租户库，等于持续验证"新租户路径"。

**后果**。这套机制**隐含三条未经工具保证的纪律**："已执行到哪"没有账本、幂等性靠风格自律（裸 `ALTER TABLE ADD COLUMN` 无法幂等，D07）、"模板/upgrade/实体四处同步"靠人肉检查（SOP-5 的最大翻车点）。偿还路径已规划为三步渐进（`schema_history` 账本表 → 30 行批量执行器 → CI upgrade 重放），见《13-技术债务与演进建议》第 2 节——先自建轻量账本逼近 Flyway 的可信度，租户规模真涨上来再评估正式引入框架。

## ADR-009：库存以 erp_storage_flow 为唯一事实源，写入必经 CAS 认领

**背景**。采购入库、调拨、零售、盘点四个入口都改库存，多入口并发写如何防重复、防超调是 ERP 侧的核心正确性问题；早期版本曾出现重复入库与超调（git 提交 `64d2fcb`"代码审查修复——采购单删除级联校验、调拨执行权限、单号并发生成"是前置修复，`7f95dbe`"调拨执行并发防护——CAS 认领 + 负库存兜底"定型方案）。

**备选方案**。① 库存余额表 + 行锁/乐观锁——查询直观但要维护余额与流水的双写一致；② 流水表唯一事实源（现存 = 聚合推算）+ 单据状态位 CAS 认领——写路径多一次聚合但永不双写漂移。

**决策**。选②：一切库存变动落 `erp_storage_flow`（order_type 0 出库/1 入库/2 期初），"某仓某品现存量 = Σ(1,2) − Σ(0)"；有状态推进语义的写操作（入库、调拨执行）先用条件 UPDATE 认领单据（`UPDATE ... SET status='1' WHERE id=? AND status='0'`，抢不到即拒绝），调拨在出库后再做负库存复检、失败整事务回滚。

**源码证据**。`erp-crm/src/main/java/com/ec/erp/service/impl/ErpStockOrderServiceImpl.java`（`claimForStockIn` 认领，注释强调流水必须落采购单指定仓库）、`erp-crm/src/main/java/com/ec/erp/service/impl/ErpTransferOrderServiceImpl.java`（`claimForExecute` + 复检回滚）、聚合口径 SQL 在 `erp-crm/src/main/resources/mapper/erp/ErpTransferOrderMapper.xml` 的 `selectStockQtyInWarehouse`。测试锚定：`ErpStockInIntegrationTest`（重复入库拒绝）、`ErpTransferExecuteIntegrationTest`（库存不足回滚后单据状态仍为 0）。

**后果**。正面：库存口径单一、审计可追溯（流水即账本）、并发正确性有测试兜底；单据保护（已入库采购单/已执行调拨单禁删）保证"单据-流水"链完整。负面：聚合推算让热点表 `erp_storage_flow` 成为查询瓶颈点（D10：仅主键索引，万级数据后必慢，见《10-性能设计与优化》2.2）；零售/盘点两个入口未达到同强度防护（盘点调整未做"调整后数量复检" ⚠️ 待确认是否产品预期，《07-模块详解》3.1 已记录该不一致），新增库存入口必须复刻 CAS 模板而非直接 insert（纪律见《07-模块详解》第 7 节第 3 条）。

## ADR-010：可观测性内建——独立指标端口 + 业务埋点纪律

**背景**。多租户系统的故障定位（"哪个租户把池打爆了""审批补偿发生频率"）无法靠通用 JVM 指标回答，项目在 2026-09 加固期把可观测性列为"计划二"专项。

**备选方案**。① 只开 Actuator 默认指标；② Actuator + Micrometer 自定义业务指标 + Prometheus/Grafana 部署栈；③ 接入 APM 商业组件——部署形态与成本不符。

**决策**。选②：指标暴露在独立端口 9091（与业务端口 9090 隔离），业务埋点收敛在 `ErpMetrics` 一个类。

**源码证据**。`erp-crm/pom.xml` 的 `spring-boot-starter-actuator` + `micrometer-registry-prometheus`（注释"可观测性：指标端点 + Prometheus 格式输出（计划二）"）；`erp-crm/src/main/java/com/ec/common/metrics/ErpMetrics.java` 五个 Counter（`erp.login.total{tenant,result}`、`erp.approval.total{tenant,action,result}`、`erp.transfer.executed.total`、`erp.tenant.register.total`、`erp.tenant.expired.disabled.total`）与两个 Gauge（活跃租户池数、临期租户数），标签值经正则 `[a-zA-Z0-9_-]{1,32}` 归一化防"随机值制造无上限时间序列"；git 提交 `2d76f26`（最小集）与 `2da0ae2`（部署栈）；监控栈配置在 `erp-crm/ops/prometheus/`、`erp-crm/ops/grafana/`。

**后果**。正面：登录/审批/调拨/租户生命周期四个域的行为可从指标直接回答，测试连指标接线一起断言（`TenantExpirationJobIntegrationTest`）。负面：埋点依赖调用方自律（漏打点不会报错）；慢 SQL 与 p99 告警规则尚缺（中期项，见《13-技术债务与演进建议》路线图）；Grafana 面板的租户维度下钻待补。

## ADR-011：密钥全部外置 .env，prod 启动期 fail-fast 校验

**背景**。课程期密钥散落在 yml 与 SQL 种子中（历史上甚至有明文口令入库），2026-09 加固期做了系统性出库（git 提交 `cc06e1c`"配置外置——真实密钥出库 + Druid 控制台加固 + prod fail-fast"、`a31246c`"清除种子 SQL 中的历史明文口令"）。

**备选方案**。① 环境变量/`.env` + 启动校验器；② 配置中心（Nacos/Apollo）——单机部署过重；③ 只靠部署纪律——已被事故证明不可靠（AGENTS.md 环境注意事项记载 2026-09-28 本机 root 密码变更后 `.env` 未同步导致连不上库）。

**决策**。选①：`application.yml` 以 `spring.config.import: optional:file:./.env[.properties]` 引入密钥源，全部敏感项走 `EC_*` 占位符；prod profile 下 `EcProdConfigVerifier` 逐项校验必需密钥（JWT ≥64 字节、租户加密密钥必配等），缺失即拒绝启动。

**源码证据**。`erp-crm/src/main/resources/application.yml` 第 58-61 行（import 段）、`erp-crm/src/main/java/com/ec/common/config/EcProdConfigVerifier.java`、`erp-crm/config/application-prod.yml.example`（prod 关闭 springdoc 与 Druid 控制台的模板）、`.env.example` 模板；测试 `EcProdConfigVerifierTest`（137 行，覆盖各缺失分支）。

**后果**。正面：配置错误在启动期暴露而非运行期半死不活；同一 jar 可在本地/CI/生产三形态间仅凭环境差异切换。负面：`.env` 成为全项目唯一事实密钥清单（`erpcrm.sh`、`erpcrm.bat`、`ops/backup.sh` 三方消费），换环境部署必须同步搬运；prod 校验器只覆盖列出的项，新增必需密钥时要记得补进校验清单，否则 fail-fast 名存实亡。

## ADR-012：会话结构"JWT 钥匙 + Redis 会话"，有效期 30→120 分钟

**背景**。无状态 JWT 与"可强制下线"的产品诉求天然矛盾，需要选择会话结构；同时初始 30 分钟有效期被用户反馈为"正常用用着就掉线"。

**备选方案**。① 纯 JWT（自包含、不可吊销）；② 纯服务端 Session（可吊销但有状态、水平扩展难）；③ JWT 只当钥匙（payload 仅放 `login_user_key=uuid` 与租户名），完整 LoginUser 会话存 Redis `login_tokens:{uuid}`——吊销粒度 = Redis 键删除。

**决策**。选③；有效期经 git 提交 `2ab0e41`"feat(auth): 会话有效期 30→120 分钟——滑动续期语义不变(剩余≤20分钟时任一请求刷新),闲置容忍提升到 2 小时"调整为 120 分钟，前端配套修复 `549ce0e`"fix(auth): 修复登录满 30 分钟必被强制登出的问题——前端 cookie 硬过期与会话滑动语义矛盾"。

**源码证据**。`erp-crm/src/main/java/com/ec/auth/web/service/TokenService.java`（`createToken` 双层写入、`verifyToken` 滑动续期、`MILLIS_MINUTE_TEN` 常量）；`application.yml` token 段（`expireTime: 120`，注释记录变更史）；`erpcrm-ui/src/utils/auth.ts`（token 存 localStorage）。

**后果**。正面：强踢/登出即时生效（删 Redis 键即可，`/monitor/online` 强踢即此原理），JWT 泄露的影响被限制在"必须同时有 Redis 会话"之内。负面：会话查询每次请求打一次 Redis（单机无感，Redis 故障即全员 401）；JWT 本体在 Redis 键存在期间无法单独作废（语义上吊销粒度是键而非令牌）；`token.secret` 轮换等于全量登出（轮换规程在 `erp-crm/config/README.md`）。这次"30 分钟太短"的迭代也留下一条经验：**改会话有效期时前后端语义必须同步改**，后端滑动续期、前端硬过期两个时钟一旦不一致就会产生"按时登出"的诡异 bug——`549ce0e` 的修复说明即是教训本体。

## 结语：决策考古的方法论备注

把 12 条 ADR 摆在一起能看到三条规律。第一，**最重要的决策都是"代价可见后才补齐配套"的**：ADR-001 选了独立库，才逼出小规格池、闲置淘汰、ADR-008 迁移机制与 ADR-003 跨库一致性这一整条决策链；ADR-009 选了流水事实源，才需要 CAS 认领与负库存复检。读 ADR 不能只看"选了什么"，要看它派生了什么。第二，**产品决策与工程决策要分开记录**：ADR-006（验证码）与 ADR-012（会话时长）本质是产品取舍，用工程文档"修正"它们只会造成 D13 式的口径漂移——正确动作是记录决策本身并同步全部文档。第三，**git 提交信息是这个项目最可靠的决策档案**：39 个后端提交与前端分支地层几乎完整覆盖了 2026-09 加固期的每个动作，保持"提交信息写清楚为什么"的习惯，比事后补文档可靠得多。新增重大决策时，建议在两仓库各落一条提交 + 在本篇追加 ADR 条目（编号顺延 ADR-013 起），并同步受影响的既有篇目。
