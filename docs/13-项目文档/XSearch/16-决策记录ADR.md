---
title: "XSearch 决策记录（ADR）"
description: "项目：XSearch ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析"
category: 项目文档

---
# XSearch 决策记录（ADR）

> 项目：XSearch ｜ 版本：v1.2 ｜ 生成日期：2026-10-06 ｜ 依据：源码分析

## 导读：这是一份"决策考古"

已有十六篇文档回答的大多是"是什么"与"怎么用"：《01-系统架构》讲系统怎么分层、《03-接口设计》讲契约长什么样、《05-核心流程》讲链路怎么走、《07-模块详解》讲每个模块内部怎么实现。本篇回答的是另一个维度的问题——**"当年为什么这么选、备选方案是什么、选完之后欠下了什么账"**。这类内容在 XSearch 里有一部分被作者写进了源码注释（这个仓库注释密度极高，几乎每个非常规写法旁都站着一段"为什么"），另一部分散落在 `README.md` 与 `AI升级说明.md` 的叙述里；本篇把它们收拢成十二份结构化的决策记录（ADR），每份按"背景 → 备选方案 → 决策 → 源码证据 → 后果"五段展开。

读法建议有三条。其一，每条决策都不是孤立的：单 worker（ADR-04）是进程内状态（ADR-03、ADR-11）的必然推论，ES 选型（ADR-01）又决定了 IK 镜像（ADR-02）与 `_id` 幂等（ADR-05）这两个下游决策，通读一遍才能看到决策网而非决策点。其二，"后果"一节里诚实记录了每条决策的代价——这些代价多数已登记在《13-技术债务与演进建议》的 21 条清单里，本篇给出的是"代价从哪条决策来"的因果链。其三，如果你是接手维护者，改动任何一个决策覆盖的区域之前，先回到对应 ADR 确认"当初为什么没选另一条路"仍然成立——决策不会过期，但决策的前提会。

## ADR-01 检索层用 Elasticsearch 而非数据库 LIKE

**背景**。项目的核心卖点是中文全文检索：关键词搜索、搜索框补全、错字纠错、来源/时间分面、命中高亮，这些能力直接构成首页与搜索页的全部体验。数据量预计在数十万文档量级（三个新闻源每天增量 + 180 天回填），且以中文内容为主。

**备选方案**。第一是 MySQL/SQLite 的 `LIKE '%关键词%'` 加自建倒排表：实现直觉、运维简单，但 LIKE 前缀通配无法走索引、相关性打分要从零自研、分面聚合要手写 SQL、中文分词要自己接库，补全与纠错更是完全无解。第二是专用的轻量搜索引擎（MeiliSearch、Typesense）：部署比 ES 轻、开箱即用，但中文分词深度、DSL 的表达力（bool 查询 + post_filter + phrase suggester + completion 的组合）都不及 ES，且课程源起（慕课网《新版 Scrapy 打造搜索引擎》）决定了项目从一开始就按 ES 生态构建。第三是 Django 自带的 PostgreSQL 全文检索：中文支持弱，同样缺 completion 与 phrase suggester。

**决策**。引入 Elasticsearch 8 作为业务数据的唯一权威存储——注意这不只是"检索引擎"，`search/models.py` 全文只有一段迁移说明，业务文档不落任何关系库，ES 就是主库。

**源码证据**。mapping 声明在 `XSearch/crawler/pipelines.py` 的 `QuoteDocument`（约 60-89 行）：`title/content/tags` 三字段建索用 `ik_max_word`、检索用 `ik_smart` + 自定义停用词分析器 `ik_search_analyzer`；搜索接口 `XSearch/search/api_views.py` 的 `api_search`/`_run_search` 构造 `multi_match`（字段权重 `title^3, tags^2, author, content`）+ `must_not` 排除榜单来源 + `post_filter` 分面 + `_HIGHLIGHT` 高亮 + `_FACET_AGGS` 聚合——这一整段 DSL 在 LIKE 语义下每一项都要自研。纠错链用的 phrase suggester 与补全用的 completion 字段更是 ES 独有能力。

**后果**。正后果是检索体验一步到位，且"所有页面只是同一份 ES 文档的不同视图"（《00-项目总览》语）成为可能。负后果有三：必须自建带 IK 插件的镜像（ADR-02）；mapping 变更需要重建索引（《11-扩展开发指南》SOP-2 专门处理这个坑）；ES/Redis 无认证、网络隔离成了唯一防线（《08-安全与权限设计》第九节第 1 条）。另外索引名 `quotes` 是课程遗留命名，作者已决定不为观感重命名（改名等于换库）。

## ADR-02 IK 中文分词 + 自建 ES 镜像

**背景**。中文文本若用 ES 默认的 standard 分词器，会被切成单字流："人工智能"变成"人/工/智/能"，单字命中噪音淹没精确匹配；而倒排索引一旦建好就绑定了分析器，事后更换等于全库重建。

**备选方案**。一是用官方镜像 + 启动后手工装插件：省一个 Dockerfile，但"换台机器部署忘了装插件"会成为必然事故——且问题不在容器启动时暴露，而在第一次采集建索引时才炸。二是改用 ES 内置的 smartcn 或 ICU 分析器：无需插件，但分词质量与社区生态（词典定制、停用词实践）都不如 IK，且国内资料几乎全部围绕 IK。三是放弃服务端分词、写入侧自切词：把分词逻辑搬进爬虫，维护成本转嫁给业务代码。

**决策**。用 IK 插件（`analysis-ik`），且把插件固化进定制镜像 `deploy/es-ik.Dockerfile`：官方 `elasticsearch:8.15.3` 之上加一行 `bin/elasticsearch-plugin install --batch https://get.infini.cloud/elasticsearch/analysis-ik/8.15.3`。同时确立"双分析器"策略：建索侧 `ik_max_word` 细粒度切分保召回，检索侧 `ik_smart` 粗分加约 50 个高频虚词停用词表（`CN_STOPWORDS`）保精确。

**源码证据**。`deploy/es-ik.Dockerfile`（14 行，注释解释插件版本必须与基础镜像严格一致、走 infini.cloud 国内源的原因）；`XSearch/crawler/pipelines.py` 47-56 行的 `CN_STOPWORDS` 与 `ik_search_analyzer`，注释原话点破动机："IK 会把'的/了/是'切成独立词元，OR 语义下命中几乎所有中文文档，造成'搜肖申克的救赎、出来沉默的羔羊'的噪音"；`docker-compose.yml` 里 ES 服务 `image: xsearch-es-ik:8.15.3` 配 `build.dockerfile: deploy/es-ik.Dockerfile`，compose 现场构建，不依赖镜像仓库。

**后果**。正后果是部署不再依赖"人记得装插件"，分词质量成为建库时刻固化的确定性行为。负后果：版本锁死——ES 服务端升级必须与 IK 插件版本同步换，镜像需要重新构建；检索侧停用词表影响所有存量查询行为，改词表虽不需要重建索引（只影响查询侧），但效果需要人工验证。开发环境忘走 compose 而直接 `docker run elasticsearch:8.x` 时，故障会延迟到第一次 `QuoteDocument.init()` 才出现——《06-部署运行》第一节把它列为三条硬约束的第二条。

## ADR-03 采集侧保留独立 Scrapy 进程，经 CrawlManager 子进程化

**背景**。爬虫是长耗时（分钟级）、可中断、需要断点恢复的工作负载；Django API 是毫秒级响应的服务。两个负载的资源画像完全不同，但合并项目后共处一个仓库，需要决定运行时关系。

**备选方案**。一是塞进 Django 进程内跑（线程或 async）：省一次进程拉起，但爬虫崩溃会波及 API 进程、长任务占住 worker 的 IO、GIL 争用拖慢响应，且 Scrapy 自身的 reactor 与 Django 不共享事件循环。二是上 Celery + 消息队列：标准的任务队列方案，但对单机个人项目是重装备——多一个 broker（Redis/RabbitMQ）要运维，任务状态、重试语义都要按 Celery 的模型重构。三是 Scrapyd：Scrapy 官方调度服务，但要独立部署一个服务，且它的调度模型与"Web 界面一键启动 + cron 定时"的产品形态需要适配。

**决策**。爬虫保持独立 Scrapy 进程形态（`scrapy crawl <name>`），Web 侧由 `XSearch/search/crawl_manager.py` 的 `CrawlManager` 用 `subprocess.Popen` 拉起子进程，全系统同时最多一个采集任务（进程内 RLock + `poll()` 互斥）。爬虫与后端唯一的耦合点是 Elasticsearch：爬虫写入、API 读取，此外互不感知。

**源码证据**。`crawl_manager.py` 模块头注释的四条设计约定（互斥/白名单/日志落盘/盯梢线程回写）；`start()` 方法 320 行附近的命令构造 `[sys.executable, "-m", "scrapy", "crawl", spec["scrapy_name"], "-s", "JOBDIR=..."]`——注意是列表形式且无 `shell=True`，Web 输入的 spider 名必须先过 `SPIDERS` 白名单字典；`SPIDERS` 字典（121-127 行）只有 5 个键，未知爬虫直接拒绝。

**后果**。正后果：爬虫崩溃不影响 API、日志天然按子进程 stdout 隔离到 `logs/crawl_<时间戳>.log`、JOBDIR 断点恢复机制免费获得、命令行 `scrapy crawl` 与 Web 触发走完全相同的管道（殊途同归，排障时无两套行为）。负后果：单任务互斥意味着 180 天回填任务运行期间其他爬虫只能排队（409 冲突是正常业务态）；进程内互斥锁再次坐实了单 worker 约束（ADR-04）；模块头注释自己写明"要并行/排队/分布式需先升级 Scrapyd 并把状态外置"——这是留给未来的升级路径而非当前欠账。

## ADR-04 gunicorn 强制 `--workers 1`

**背景**。Django 生产部署的标准姿势是多 worker 横向吃 CPU。但这个项目把三类状态放在了进程内：管理员 token 表（`api_views._admin_tokens`）、登录限速计数（`_login_failures`）、爬虫互斥锁与调度器（`CrawlManager`/`ScheduleManager` 的模块级单例，`crawl_manager.py` 432 与 787 行）。

**备选方案**。一是多 worker + 把全部状态外置到 Redis：架构上"正确"，但对单机个人项目是提前支付分布式协调的全部复杂度——token、限速、互斥、调度四个模块都要改造并各自加测试。二是多 worker + 容忍状态分裂：绝对不可行，登录者在 worker A 拿到的 token 有一半概率打到 worker B 上吃 401，定时任务会在 N 个 worker 里重复触发 N 次。三是换异步服务器（uvicorn/daphne）：解决 IO 并发但解决不了"状态在进程内"的本质问题。

**决策**。在 `XSearch/Dockerfile` 的 CMD 里写死 `gunicorn xsearch.wsgi:application --bind 0.0.0.0:8000 --workers 1 --timeout 120`，用部署约束锁死"单进程"这个前提；请求并发由 gunicorn 的线程/IO 复用承接。

**源码证据**。`Dockerfile` 67-72 行 CMD 段注释原话："CrawlManager/ScheduleManager 是进程内单例（任务互斥、定时调度都依赖它），必须 --workers 1；多 worker 会导致状态互不可见、定时任务重复触发。需要横向扩容时先把任务状态外置到 Redis/DB，再增加 worker。"`api_views.py` 123-125 行限速注释同样写明"当前部署为 gunicorn --workers 1（见 Dockerfile 注释），成立；扩容多 worker 前必须把计数外置到 Redis"。`notify.py` 模块注释则从另一个角度补刀："SMTP 抖动会拖死唯一的工作线程（gunicorn --workers 1，且该线程同时是爬虫互斥锁的持有者）"——这是单 worker 决策传导出的第二条纪律：请求路径上禁止同步外部调用。

**后果**。正后果：实现极度简单，所有"单例语义"天然成立，不用写一行分布式代码。负后果：吞吐天花板封顶（好在公开读接口全是"等 ES/Redis IO"型，GIL 空窗足以服务并发，见《10-性能设计与优化》4.1）；后端重启即 token 全失效（管理员需重登，README 已明示）；这条约束是所有横向扩容讨论的总闸门，《13-技术债务与演进建议》第四节把它列为结构性约束第 1 条，并给出量化触发信号（P95 超 1 秒或需要第二个管理员）。

## ADR-05 ES `_id` 幂等 upsert：全系统去重压在一个键上

**背景**。定时任务每天重复跑、手动触发与 cron 可能撞车、news_backfill 与 news_rss 会先后采到同一篇中新网文章——写入侧必须回答"同一条内容重复采集怎么办"。

**备选方案**。一是每次采集前清空索引：实现最傻但会瞬间丢光"正在被搜索的内容"，且榜单外的内容有长存价值。二是写入后按 URL 查重（先查再插）：两次 ES 往返、有竞态窗口，还得处理"内容更新了要不要覆盖"。三是靠 Redis set 做指纹去重：Redis 与 ES 两处真相，挂一个就漂移。

**决策**。让每条 item 自带**稳定唯一 id**（`url_object_id` 字段），管道直接把它当 ES `_id`：`doc.meta.id = item.get("url_object_id") or _md5(url + content[:200])`。ES 对相同 `_id` 的写入天然是覆盖（upsert），重复采集 = 原地更新，零额外机制。各爬虫的 id 策略：news_rss/news_backfill 用 `md5(url)`；aihot_news 用 `aihot_{id}` 与 `aihot_daily_{date}`；aihot_hot 用 `aihot_{publicId}`；douyin_hot 用 `douyin_hot_{rank}`。

**源码证据**。`crawler/pipelines.py` 186 行 `_id` 赋值；`crawler/spiders/news_rss.py` 154 行 `hashlib.md5(url.encode("utf-8")).hexdigest()`；`aihot_hot.py` 76 行 `item_id = "aihot_{}"...` 与 125-147 行 `_prune_stale()`——后者把"榜单是当前状态"的语义做实：收尾时 `delete_by_query` 删除本轮未出现的旧热点，配合稳定 `_id` 让榜单覆盖式更新且不无限累积。《04-数据模型》2.3 节有完整的各爬虫 `_id` 对照表。

**后果**。正后果：定时任务可以放心每天跑，backfill 的纯标题条目会被后续 news_rss 的全文版本自然补全（《04-数据模型》2.3）；全系统幂等性零成本获得。负后果：`_id` 生成规则成了不可变更的全局契约——`source` 与 `_id` 的既有取值一旦改变等于换库，《11-扩展开发指南》第八节红线三明令不许动；`md5(url + content[:200])` 的兜底意味着 URL 缺失时同一篇内容改一个字就可能产生新 `_id`（当前各源都保证有 URL，风险未触发）。

## ADR-06 Redis 定位为"纯加速层" + 清理时的缓存联动失效

**背景**。热搜词统计、要闻缓存、新闻列表缓存、sitemap 缓存都需要一个低延迟的键值存储；同时"删了数据但页面 60 秒内还在展示"的幽灵数据问题需要回答。

**备选方案**。一是不用缓存，全查 ES：可行但首页/新闻页轮询会给 ES 添持续压力，热搜词 zset 也无处安放。二是把 Redis 当第二数据源（写穿、读强依赖）：Redis 挂了站点就挂，可用性反而下降。三是只加缓存不做失效联动，等 TTL 自然过期：实现最省，但"清空该来源"后 60 秒内用户仍看到已删数据，与操作承诺矛盾。

**决策**。双条：其一，Redis 是**纯加速层**——所有读写包 try-except，挂了只损失缓存与热搜词，绝不阻塞主流程；其二，危险清理操作完成后**主动联动失效**相关缓存，而不是等 TTL。热搜词 zset 每次搜索 `zincrby` 并裁剪前 100；headlines 缓存 120s、新闻列表缓存 60s、sitemap 缓存 3600s。

**源码证据**。`api_views.py` 977-991 行 `_purge_rankings_cache()`：`scan_iter` 精确匹配 `rankings_news:{source}:p*`（注释强调"Redis db0 与其他项目共享，只允许 scan_iter 精确匹配 XSearch 自己的键"），且当被清来源属新闻源时**连聚合键 `rankings_news:news:p*` 一起删**——因为"全部新闻"列表里也含该来源；`api_db_purge` 末尾仅在有实际删除时才调它（`deleted` 为 0 不清缓存，避免无效扫描）。各读接口的缓存读写模式见 `api_headlines`（481-522 行）与 `api_rankings` 新闻分支（630-663 行）。

**后果**。正后果：Redis 故障降级成为系统最稳的一道底（`/api/stats` 在 ES 与 Redis 双挂时仍返回结构化 `es_ok:false`，有测试固化）；缓存联动让"清理"操作的用户体感即时生效。负后果：热搜词与缓存状态进程外驻留但**无认证**（compose 未设 requirepass，见《08》第九节第 1 条），共享 db0 的假设要求维护者永远记得"只 scan 不 keys"；四类缓存的键名模式成了隐性契约，新增缓存时必须同步考虑 purge 是否要联动（《10-性能设计与优化》2.4 的失效策略表是登记处）。

## ADR-07 榜单来源永久排除出全文搜索

**背景**。库里同时存着"有发布时间语义的内容"（新闻、AI 资讯、日报）与"当前状态快照"（抖音热点榜、AI 热点榜）。后者没有 `create_date` 的真实语义（榜单条目的时间是抓取时刻），若混进搜索结果，按时间排序时它们会永远霸占"最新"，按相关性排序时高热度值又会污染结果。

**备选方案**。一是给榜单文档写假日期：数据造假，时间分面全乱。二是搜索结果里给榜单条目降权：治标，`sort=time` 下仍然霸榜。三是前端过滤：浪费带宽且分面计数错。四是允许用户手动选择"包含榜单"：多一个开关多一份理解成本，而榜单本就有专属页面（`/rankings`、AI 热点 Tab），搜索里再出现是重复而非补充。

**决策**。在服务端把两个榜单来源（`douyin_hot`、`aihot_hot`）定义为常量 `RANKING_SOURCES`，搜索接口与要闻接口一律 `must_not` 排除，且**不提供任何开关**。

**源码证据**。`api_views.py` 53-56 行 `RANKING_SOURCES = ("douyin_hot", "aihot_hot")` 与 `SEARCH_EXCLUDED_SOURCES` 别名；`api_search._run_search` 的 `must_not` 子句；`api_headlines` 的查询同样带 `must_not`（492-495 行）且 docstring 写明理由（"榜单条目没有发布时间语义，混进来会长期占住'最新'的位置"）；补全接口 `api_suggest` 也在结果过滤里排除了榜单来源。`search/tests.py` 的 HeadlinesTests 把 `must_not` 断言写进回归。

**后果**。正后果：搜索与要闻的结果语义稳定，榜单数据在专属页面按 rank 排序呈现，两套视图各得其所。负后果：用户搜"某个正在热搜榜上的词"搜不到对应榜单条目——这是一个有意的取舍而非遗漏，《12-FAQ与故障排查》S3 明确把这一点写进了排障决策树（"若搜的是榜单内容，请去榜单页看"）；新增榜单源时必须记得加入 `RANKING_SOURCES`，否则新来源会漏进搜索结果（《11-扩展开发指南》SOP-1 步骤 4）。

## ADR-08 爬虫合规：四条默认纪律 + 伪装收敛白名单 + 越线工具移除

**背景**。项目源自爬虫课程，老代码里存在 Selenium/undetected-chromedriver、验证码视觉识别（`vlm_captcha`）、知乎模拟登录（`zhihu_login_vlm`）等模块。`AI升级说明.md` 第七节把边界定性为"比技术更硬的边界"：《数据安全法》《个人信息保护法》之后，司法实践中绕过技术措施本身就是加重情节。升级必须回答：哪些能力保留、哪些移除、移除后怎么防止回流。

**备选方案**。一是保留全部能力"以备不时之需"：与合规立场直接冲突，且公开仓库携带这类代码本身就是观感与法律风险。二是保留但加开关默认关闭：开关的下一站就是被打开，且"默认关"挡不住"代码在场"的事实。三是全部移除并用测试防回流：损失灵活性，换取立场的可证明性。

**决策**。三条腿：**默认纪律四件套**——`ROBOTSTXT_OBEY=True`（2026-09-27 逐源核对并留下核对记录）、自报身份 `USER_AGENT='XSearchBot/1.0 (+github 链接)'`、限速礼貌（`DOWNLOAD_DELAY=1` + AutoThrottle，AIHOT 源另设 2 秒）、不碰红线（不采登录后数据、无验证码识别、无登录模拟，三者已删且 git 历史可回溯）。**伪装收敛白名单**——唯一例外抖音源（诚实 UA 返回 444）的浏览器指纹伪装被限制在 `FINGERPRINT_HOSTS` 白名单内（当前仅 douyin 两域名），注释要求"新增条目 = 扩大风险面，动手前先确认该站真的拒绝常规 UA"。**测试防回流**——把合规约束写成自动化断言。

**源码证据**。`crawler/settings.py` 15-34 行（robots 核对注释、UA、白名单）；`crawler/middlewares.py` 22-56 行 `BrowserFingerprintHeadersMiddleware` 的白名单按点边界匹配（`_matches` 的 docstring 点名 `evil-douyin.com` 假阳性问题）；`search/tests.py` 的 `CrawlerComplianceTests`（8 个方法）覆盖"robots 开、身份报了、伪装仅限白名单、验证码/LLM 模块不得回流（`find_spec` 断言）、已停用源前后端一致移除"；`AI升级说明.md` 第二节（LLM 能力现状是"没有"）与第七节（已知例外与张力的诚实记录）。

**后果**。正后果：合规约束不再依赖人的记忆，回归即红灯；仓库可以公开而不携带"绕过技术措施"的能力。负后果（作者自己记录的）：抖音源的张力仍在——伪装代码在场且针对特定站点，`AI升级说明.md` 给出的长期出路是"下掉该源，或改用不依赖伪装的公开接口"，目前未执行（`⚠️ 待确认` 后续处置）；白名单机制本身需要纪律维持，《11-扩展开发指南》SOP-1 把合规预检设为第 1 步红线。

## ADR-09 管理员鉴权单层化 + 登录接口的四道防线

**背景**。管理面（采集管理、数据管理）需要鉴权；历史上曾有第二层 `X-API-Token` 共享密钥用于前端调用 API。升级时必须决定鉴权层数与登录接口的防爆破形态。

**备选方案**。关于层数：保留双层 API token 就必须把它打进前端构建产物，"公开仓库里的 dist 等于把钥匙挂出去"（`api_views.py` 文件头注释原话），且所有受保护接口本就要求管理员登录，双层是半死的重复。关于登录防爆破：可以只做失败延迟（简单但可被并发绕过）、可以上验证码（引入新依赖且对单人管理面过重）、可以外置 Redis 计数（又与单 worker 决策冲突——当前形态下进程内计数已成立）。

**决策**。2026-09 整体移除 `X-API-Token`，鉴权只保留一层管理员 token（`secrets.token_hex(32)` 签发、进程内字典存储、12 小时滑动续期、登出即吊销）；登录接口叠加四道防线：① 锁定前置检查（先于密码比较，锁定期间连"密码对不对"都不回答，返回 429 而非 401）；② 账号与密码都用 `hmac.compare_digest` 常数时间比较；③ 按 IP 计数（300 秒窗口 5 次失败锁 900 秒，`Retry-After` 告知剩余，成功清零）；④ IP 取值策略可配（`DJANGO_TRUST_PROXY_HEADER` 控制是否采信 XFF 首段）。

**源码证据**。`api_views.py` 21-23 行（移除 X-API-Token 的注释与理由）、95-226 行（token 表、require_admin、限速常量与登录视图）；`_client_ip` 的注释解释"只看 REMOTE_ADDR 限不到真实攻击者（真实链路是 frp → VPS nginx 反代）"；测试侧 `CrawlEndpointAuthTests.test_crawl_start_requires_admin` 断言"只带已废弃的 X-API-Token 也必须 401"（防回流），`LoginRateLimitTests` 三个方法覆盖窗口/清零/IP 隔离。完整安全分析见《08-安全与权限设计》第二节。

**后果**。正后果：鉴权模型一句话说得清（"只有一层管理员 token"），前端 `api.ts` 的 `request()` 统一处理 401 即可；四道防线覆盖了时序侧信道、并发爆破、误锁正常用户三类问题。负后果：token 进程内存储是单 worker 决策的又一次"人质"（重启即全员重登，多 worker 不可用）；XFF 可伪造的残余风险与部署形态绑定（《08》第九节第 2 条：公网若绕过可信反代直连 backend，限速可被轮换 XFF 绕过）；无 token 列表视图，token 丢失只能等 12 小时或重启（单管理员场景可接受）。

## ADR-10 配置 fail-closed：缺失即拒绝启动

**背景**。Django 的默认行为对配置缺失相当宽容——`SECRET_KEY` 会自动生成随机值、`ALLOWED_HOSTS` 空列表在 DEBUG 下无所谓。但"宽容"在生产形态下意味着：忘记配密钥的站点用一把每次重启都换的随机密钥跑着（会话全体验）、忘了配 Host 列表的站点对所有请求返回 400 而无人察觉原因。

**备选方案**。一是保持框架默认宽容 + 文档提醒：文档提醒是所有机制里最不可靠的一种。二是启动时打印强警告但继续跑：警告会被淹没在容器日志里，"能跑"本身就会消解修复动机。三是只在 compose 里写死关键值：compose 只管容器形态，手工部署绕过它。

**决策**。生产形态（`DEBUG=False`）下三项 fail-closed：`DJANGO_SECRET_KEY` 缺失直接抛 `ImproperlyConfigured`（错误信息里附带密钥生成命令与落点提示）；`DJANGO_ALLOWED_HOSTS` 为空先打三行提示再 `sys.exit(1)`；开发态专用密钥 `_DEV_ONLY_KEY` 硬编码在仓库里但仅限 DEBUG 态可用，且使用时向 stderr 打警告（"任何'忘记配 DJANGO_SECRET_KEY'的部署都等于在用一把已泄露的密钥"）。运行时侧的对应形态是：管理员账号未配置时登录接口返回 503 而非 500（配置缺失是服务侧问题，不该被监控当崩溃）。

**源码证据**。`XSearch/xsearch/settings.py` 24-77 行（DEBUG 读取、`_DEV_ONLY_KEY`、fail-closed 两段、生产安全块）；`docker-compose.prod.yml` 注释称 fail-closed "是有意的，避免用已知密钥/调试页面上线"；`api_admin_login` 的 503 分支与测试 `test_login_without_config_rejected`；`apps.py` 的 `_warn_insecure_config()` 补足"不能强行拦的"（DEBUG 开启、弱口令）的可见性。

**后果**。正后果："带着已知弱配置默默上线"这个类别的事故被结构性消灭；配置错误在启动日志里直指修法（《12-FAQ》D2 的"backend 反复重启"排查因此只有三个候选）。负后果：误配的症状是"容器反复重启"，对不熟悉 fail-closed 语义的部署者像程序崩溃而非配置提示（FAQ 靠日志文案弥合）；`DEBUG` 默认 True 的便利与生产误用一线之隔（生产 compose 写死 False 兜底，手工部署可能漏，《08》第九节第 8 条）。

## ADR-11 运行时状态用 JSON 文件而非数据库 + 原子写补丁

**背景**。采集历史与定时任务配置需要持久化，且要求"单机部署、人类可直接查看与备份、容器重建不丢"。生产 compose 用单文件 bind mount 挂载状态文件，这又带来了一个隐蔽的文件系统陷阱。

**备选方案**。一是 SQLite 表：事务完备，但"人类可查看"变差、要多一层迁移管理，且单文件 bind mount 场景 SQLite 自己就是特例（靠同 inode 写活的）。二是 Redis 持久化（AOF）：把运维状态与加速层混在一个生命周期里，备份策略纠缠。三是 `os.replace` 原子替换（标准做法）：在生产形态的**单文件 bind mount** 上必然 EBUSY——2026-09-28 线上实测，采集历史一次都没写成过。

**决策**。两个 JSON 文件（`crawl_history.json` 上限 200 条、`schedules.json` history 裁剪 20 条）+ 一套带恢复能力的读写：`_write_json_atomic` 用"`.tmp` 完整写 + fsync + **原地覆盖**主文件"绕开 EBUSY；`_load_json_with_recovery` 主文件损坏回退 `.tmp`，再坏则备份 `.corrupt-<时间戳>` 现场后抛出（"直接降级会让下一次保存覆盖掉唯一能判断'什么时候坏的'的证据"）；`_pid_alive` 对 pid 缺失按"活着"处理（宁可晚收尾不可误判）。

**源码证据**。`search/crawl_manager.py` 24-88 行三个工具函数，`_write_json_atomic` 的 docstring 完整记录了两条路各自的坑（直接 open 写一半被 kill 留截断 JSON；os.replace 撞 bind mount EBUSY）与 db.sqlite3 的反例佐证；`search/tests.py` 的 `SchedulePersistenceAlertsTests`（14 个方法）与 `CrawlStateTransitionTests`（7 个）守护这套机制；《13-技术债务与演进建议》第四节第 2 条指出长期解法是把状态文件挪进目录挂载、恢复 `os.replace` 常规语义。

**后果**。正后果：零迁移、可 `cat` 查看、backup.sh 直接拷文件即备份；损坏有现场、恢复有路径。负后果：普通文件操作变成了需要 21 个测试守护的定制逻辑（复杂度没有消失，只是从数据库搬到了文件层）；`.tmp` 后缀曾漏出 `.gitignore`（债务 #16，一行修复）；文件与数据库的分界需要维护者记住——业务数据在 ES、运行时状态在 JSON、框架数据在 SQLite，三处真相各管一摊（`《04-数据模型》`第一节有全景表）。

## ADR-12 lint 只开 ruff E9+F：门禁哲学是"只挡真错误"

**背景**。一个约 6.5k 行的既有代码库（课程项目演化而来）接入 lint，天然面对一个问题：风格规则集（E/W/I/UP…）一开就是成百上千条告警，批量修复会淹没真实 diff、可能踩碎隐式契约。

**备选方案**。一是全量启用主流规则集 + 一次性大改：diff 巨大，代码审查与 git blame 全部污染，而且风格本身不产生错误。二是全量启用 + 自动格式化（`ruff format`/black）：格式化同样制造全库 diff，且与"存量代码渐进改善"的诉求相悖。三是不上 lint：未定义名、无用导入这类"运行时才炸"的问题失去机器防线。

**决策**。`ruff.toml` 只启用 `select = ["E9", "F"]`：E9 是语法/致命错误，F 是 pyflakes（未定义名 F821、无用导入 F401、未使用变量 F841），`line-length = 120`，`per-file-ignores` 给 Django 脚手架文件豁免 F401。注释原话："对一个 6.5k 行的既有代码库做批量风格改造，风险（踩碎隐式契约、淹没真实 diff）远大于收益。要收紧再逐条加。"

**源码证据**。仓库根 `XSearch/ruff.toml`（14 行）；`.github/workflows/ci.yml` backend job 的 `ruff check .` 步骤；《09-测试与质量保障》第三节对本取舍的完整分析——关键补充是：ruff 抓不住逻辑错误，逻辑防线完全压在 110 个测试方法上，两者必须同时存在。

**后果**。正后果：CI 时间几乎为零、告警信噪比极高（命中即真问题）、风格争议留给开发者自觉；"要收紧再逐条加"让每次收紧可以独立成 PR。负后果：风格不一致会随时间累积（事实上已发生，全库无格式化纪律）；这条欠条的性质是"纪律而非技术"——《13-技术债务与演进建议》第五节把它列为结构性约束第 5 条，并告诫"每次收紧应单独成 PR，不与功能改动混合"。它还与前端形成一组镜像对照：前端把质量门禁押给 `vue-tsc` 全量类型检查（contract 层面最强的机器防线），后端押给 110 个测试——两侧都没有把宝押在风格 lint 上，这是同一个哲学的两个投影。

## 收束：十二份决策的同一套价值观

把十二份 ADR 摆在一起，能读出四条反复出现的元原则。**第一，约束前置**：单 worker、白名单、fail-closed、E9+F 都是在"把犯错的可能性从结构上堵死"，而不是靠提示与自觉。**第二，代价显式化**：每条决策的注释都诚实记录了它坏过什么（EBUSY 有日期、412 有成因、misfire 有解释），债务清单因此没有未知项。**第三，简单性按需购买**：不上 Celery、不上 Pinia、不上 DRF、不搞多 worker——升级路径都写好了，但触发条件没到就不动手。**第四，边界要有测试**：合规、鉴权、路径穿越、时区这些"坏了会静默出错或出事故"的边界全部固化成回归断言。这四条元原则也是《00-项目总览》说的"个人可运维"定位在工程层的完整投影：维护者是一个人，所以结构必须替他记住一切。

（本篇十二份决策与《13-技术债务与演进建议》构成一对：那篇登记"现在欠什么"，本篇解释"为什么欠、欠得值不值"。若两篇出现口径冲突，以源码注释为准并回改文档。）
