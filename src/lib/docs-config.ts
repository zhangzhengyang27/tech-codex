export interface DocCategory {
  slug: string;
  title: string;
  description: string;
  icon: string;
  dir: string;
  /** 为 true 时不在首页展示卡片，仅用于导航和路由 */
  hidden?: boolean;
}

export interface DocGroup {
  id: string;
  title: string;
  description: string;
  categories: DocCategory[];
}

export const docGroups: DocGroup[] = [
  {
    id: 'frontend-basics',
    title: '前端基础',
    description: 'HTML、CSS、JavaScript 核心知识体系',
    categories: [
      {
        slug: 'html5',
        title: 'HTML5',
        description: '语义化标签、表单、多媒体、Web API、网络请求与实时推送',
        icon: '📄',
        dir: '04-前端/02-HTML5',
      },
      {
        slug: 'css',
        title: 'CSS',
        description: '布局、动画、架构方法论、现代工具',
        icon: '🎨',
        dir: '04-前端/01-CSS',
      },
      {
        slug: 'javascript',
        title: 'JavaScript',
        description: '语法、异步编程、设计模式、性能优化',
        icon: '⚡',
        dir: '04-前端/03-JavaScript',
      },
      {
        slug: 'frontend-toolchain',
        title: '前端工程化',
        description: '前端工程化工具发展历程、工具深度对比、TypeScript 运行时、构建提速、脚手架、部署与容器化',
        icon: '🏗️',
        dir: '04-前端/08-前端工程化',
      },
      {
        slug: 'frontend-visualization',
        title: '数据可视化',
        description: '前端数据可视化技术：D3.js、ECharts、Canvas、SVG、WebGL、Three.js',
        icon: '📊',
        dir: '04-前端/09-数据可视化',
      },
    ],
  },
  {
    id: 'frameworks',
    title: '框架与语言',
    description: 'TypeScript 类型系统与 Vue/React 生态',
    categories: [
      {
        slug: 'typescript',
        title: 'TypeScript',
        description: '类型系统、类型编程、工程化实践',
        icon: '🔷',
        dir: '04-前端/04-TypeScript',
      },
      {
        slug: 'vue2',
        title: 'Vue2',
        description: 'Vue2 完整知识体系、项目构建与旧版生态（vue-router3 / vue-cli）。Vue 2 已于 2023 年底停止维护，本分类适用于存量项目维护参考，新项目请使用 Vue 3',
        icon: '💚',
        dir: '04-前端/05-vue2',
      },
      {
        slug: 'vue3',
        title: 'Vue3',
        description: 'Vue3 完整知识体系、源码内参与自研组件库',
        icon: '💚',
        dir: '04-前端/06-vue3',
      },
      {
        slug: 'react',
        title: 'React',
        description: 'JSX、Hooks、Fiber、并发模式、生态实践',
        icon: '⚛️',
        dir: '04-前端/07-React',
      },
      {
        slug: 'nextjs',
        title: 'Next.js',
        description: 'App Router、RSC、Server Actions、SSR/SSG/ISR、部署实战',
        icon: '▲',
        dir: '04-前端/12-Next.js',
      },
      {
        slug: 'taro',
        title: 'Taro',
        description: '跨端开发、小程序运行时、多端适配、React Native',
        icon: '🔷',
        dir: '04-前端/13-Taro',
      },
    ],
  },
  {
    id: 'engineering',
    title: '工程化与后端',
    description: 'Node.js / NestJS 服务端开发、数据库、全栈工程与前端调试',
    categories: [
      {
        slug: 'node',
        title: 'Node.js',
        description: '模块系统、Web 框架、数据库、部署运维',
        icon: '🟢',
        dir: '02-Node',
      },
      {
        slug: 'nestjs',
        title: 'NestJS',
        description: 'NestJS 核心概念、数据库与 ORM、配置缓存认证、日志监控、部署运维、微服务与 GraphQL、WebSocket 与项目实战',
        icon: '🐈',
        dir: '02-Node/06-Web框架/05-NestJS',
      },
      {
        slug: 'sql',
        title: '数据库基础',
        description: 'SQL 语法、查询优化、DBMS 与数据库建模',
        icon: '🗃️',
        dir: '05-后端/04-数据库基础',
      },
      {
        slug: 'fullstack',
        title: '全栈工程',
        description: 'MVC 架构、数据持久化、网络协议与全栈实践',
        icon: '🧱',
        dir: '05-后端/05-全栈工程',
      },
      {
        slug: 'electron',
        title: 'Electron',
        description: '桌面应用开发、原生能力、打包分发',
        icon: '🖥️',
        dir: '04-前端/10-Electron',
      },
      {
        slug: 'electron-practice',
        title: 'Electron 实战案例',
        description: 'Electron 实战案例课程 43 讲：快速检索、超级面板、系统插件、屏幕截图、右键菜单注入、原生模块与 Rust 扩展、本地数据库与多端同步、Vite 3 插件化构建与打包更新、应用性能优化与自动化测试',
        icon: '📦',
        dir: '04-前端/14-Electron实战案例',
        hidden: true,
      },
      {
        slug: 'debugging',
        title: '前端调试',
        description: '调试基础原理、VSCode Debugger、SourceMap 与线上监控、框架与源码调试、浏览器自动化、Chrome DevTools、DevTools 原理与实现、网络调试与移动端、Mock 与接口测试',
        icon: '🔍',
        dir: '04-前端/11-调试',
      },
      {
        slug: 'mysql',
        title: 'MySQL',
        description: 'InnoDB 存储引擎、B+ 树索引、事务与日志、查询优化、锁机制',
        icon: '🐬',
        dir: '05-后端/01-MySQL',
      },
      {
        slug: 'redis',
        title: 'Redis',
        description: '数据结构、分布式锁、集群、持久化、源码 internals',
        icon: '🟥',
        dir: '05-后端/02-Redis',
      },
    ],
  },
  {
    id: 'python',
    title: 'Python',
    description: 'Python 全栈开发知识体系',
    categories: [
        {
          slug: 'python',
          title: 'Python',
          description: 'Python 全栈开发知识体系：基础语法、进阶特性、Web 开发、数据分析、爬虫、自动化办公、并发异步与工程化',
          icon: '🐍',
          dir: '03-Python',
        },
        // 以下为 Python 分组下的数据分析子分类（hidden，在 Python 侧边栏内导航，不单独在首页展示卡片）
        {
          slug: 'data-analysis-law',
          title: '万能的数据分析法则',
          description: '拉勾《万能的数据分析法则》：目标导向、指标思维、逻辑推理、系统结构、分析流程与报告撰写的通用方法论',
          icon: '📐',
          dir: '03-Python/04-数据分析/01-万能的数据分析法则',
          hidden: true,
        },
        {
          slug: 'data-practice',
          title: '数据分析思维与实战',
          description: '拉勾《数据分析思维与实战 23 讲》：从定义问题、拆解指标到用户研究、行业分析与职场提升的完整实战',
          icon: '📊',
          dir: '03-Python/04-数据分析/02-数据分析思维与实战23讲',
          hidden: true,
        },
      ],
    },
  {
    id: 'java',
    title: 'Java',
    description: 'Java 全栈开发知识体系',
    categories: [
      {
        slug: 'java',
        title: 'Java 基础',
        description: 'Java 语言基础：语法、面向对象、集合、IO、泛型、反射、注解、异常',
        icon: '☕',
        dir: '01-Java/01-语言基础',
      },
      // 以下为 Java 分组下的导航子分类（hidden，不在首页显示卡片，统一通过 /docs/java 侧边栏访问）
      {
        slug: 'java-jvm',
        title: 'JVM 与并发',
        description: 'JVM 内存模型、垃圾回收、类加载、字节码，以及 Java 并发编程与并发实战',
        icon: '⚙️',
        dir: '01-Java/02-JVM与并发',
        hidden: true,
      },
      {
        slug: 'java-framework',
        title: '核心框架',
        description: 'Spring / SpringBoot / MyBatis / JDBC / SSM / 数据库 / 微服务 / 分布式 / 消息队列 / ZooKeeper / Web 与网络编程',
        icon: '🧩',
        dir: '01-Java/03-核心框架',
        hidden: true,
      },
      {
        slug: 'java-arch',
        title: '工程与架构',
        description: '工程实践、架构与运维、最佳实践',
        icon: '🏗️',
        dir: '01-Java/04-工程与架构',
        hidden: true,
      },
      {
        slug: 'java-project',
        title: '实战项目',
        description: 'Java 项目实战与实战项目集',
        icon: '🚀',
        dir: '01-Java/05-实战项目',
        hidden: true,
      },
      {
        slug: 'java-perf',
        title: '性能与调优',
        description: '性能优化实战与源码剖析',
        icon: '📈',
        dir: '01-Java/06-性能与调优',
        hidden: true,
      },
      {
        slug: 'java-interview',
        title: '面试与进阶',
        description: 'Java 面试专题与进阶专题',
        icon: '💡',
        dir: '01-Java/07-面试与进阶',
        hidden: true,
      },
    ],
  },
  {
    id: 'design-patterns',
    title: '设计模式',
    description: 'GoF 23 种设计模式的概念、分类与 TypeScript/Java/Python 多语言实现',
    categories: [
      {
        slug: 'design-patterns',
        title: '设计模式',
        description: 'GoF 23 种设计模式：概念（语言中立）与 TypeScript/Java/Python 多语言实现',
        icon: '🧩',
        dir: '11-设计模式',
      },
    ],
  },
  {
    id: 'distributed',
    title: '分布式',
    description: '分布式理论、一致性、事务、服务治理、缓存、消息队列、高可用与分布式数据库',
    categories: [
      {
        slug: 'distributed',
        title: '分布式',
        description: '拉勾《分布式技术原理与实战45讲》：CAP、Paxos、ZooKeeper、事务、RPC、微服务、消息队列、缓存、限流，并融入分布式数据库内核（NewSQL/HTAP）',
        icon: '🌐',
        dir: '05-后端/03-分布式',
      },
    ],
  },
  {
    id: 'visualization',
    title: '数据可视化',
    description: '2D/3D 图形渲染与数据展示',
    categories: [
      // 拉勾专栏（hidden，在可视化分组内导航，不单独在首页展示卡片）
      {
        slug: 'viz-course',
        title: '数据分析与可视化精讲',
        description: '拉勾《数据分析与可视化精讲》：可视化概念、建设方法、ECharts/PyEcharts、6 个实战案例与 Flask 集成',
        icon: '📈',
        dir: '03-Python/05-数据科学/08-数据分析与可视化精讲',
        hidden: true,
      },
    ],
  },
  {
    id: 'architecture',
    title: '架构与工程',
    description: '软件架构、工程实践与技术素养',
    categories: [
      {
        slug: 'architecture',
        title: '架构与工程',
        description: '架构设计、微服务、浏览器原理、网络编程、测试、持续交付、软件设计',
        icon: '🏗️',
        dir: '07-架构与工程',
      },
      {
        slug: 'backend-architecture',
        title: '后台架构实战',
        description: '拉勾《23讲搞定后台架构实战》：拆分、缓存、分库分表、扣减、微服务与重构',
        icon: '🖥️',
        dir: '07-架构与工程/04-后台架构实战',
      },
      {
        slug: 'serverless',
        title: 'Serverless架构',
        description: '拉勾《玩转 Serverless 架构》：概念原理、开发框架、安全成本、系统迁移与身份认证、API、SSR 实战',
        icon: '☁️',
        dir: '07-架构与工程/05-Serverless架构',
      },
      {
        slug: 'arch-course',
        title: '软件架构场景实战 22 讲',
        description: '拉勾《软件架构场景实战 22 讲》：冷热分离、查询分离、分库分表、读写缓存、注册发现、熔断限流、微服务与数据一致性等场景化架构方案',
        icon: '🧩',
        dir: '07-架构与工程/02-架构设计/06-软件架构场景实战22讲',
        hidden: true,
      },
      {
        slug: 'cloud-native',
        title: '云原生微服务架构实战精讲',
        description: '拉勾《云原生微服务架构实战精讲》：从微服务与云原生概念、容器化与 Kubernetes，到服务划分、事件驱动、Saga、API 组合、服务网格、可观测性与安全部署的完整实战',
        icon: '☁️',
        dir: '07-架构与工程/06-云原生微服务架构实战精讲',
        hidden: true,
      },
      { slug: 'devops-notes', title: 'DevOps 落地笔记', description: '拉勾《DevOps 落地笔记》：从 DevOps 发展历程、影响地图、用户故事、看板、代码预检查、技术债务、配置与环境管理、持续集成、API 管理、自动化测试、部署流水线、混沌工程到团队能力与度量指标的端到端落地', icon: '🚀', dir: '07-架构与工程/07-DevOps落地笔记', hidden: true },
      { slug: 'tracing', title: '分布式链路追踪实战', description: '拉勾《分布式链路追踪实战》：从数据观测、日志与指标编写、链路监控与性能剖析、黑白盒监控、告警质量与处理，到 ELK 日志收集、Prometheus 指标体系、Zipkin/SkyWalking 分布式追踪、ARMS 云观测与运维集成', icon: '🔭', dir: '07-架构与工程/08-分布式链路追踪实战', hidden: true },
      { slug: 'arch-interview', title: '架构设计面试精讲', description: '拉勾《架构设计面试精讲》：从架构认知、CAP 与分布式理论、事务一致性、锁与存储分片、RPC/序列化/NIO、MySQL 索引与事务锁、缓存与高可用、容错降级、高性能与千万级流量，到双十一预约抢购案例串联的面试答题思路', icon: '💡', dir: '07-架构与工程/10-架构设计面试精讲', hidden: true },
    ],
  },
  {
    id: 'tech-management',
    title: '技术管理',
    description: '技术领导力、团队管理与商业思维',
    categories: [
      {
        slug: 'tech-management',
        title: '技术管理',
        description: '技术领导力、运维管理、商业案例、职业规划',
        icon: '👔',
        dir: '09-管理/02-技术管理',
      },
      {
        slug: 'agile-pm',
        title: '腾讯敏捷项目管理实战',
        description: '拉勾《腾讯敏捷项目管理实战》：敏捷演化、自组织、迭代计划、度量与落地',
        icon: '🏃',
        dir: '09-管理/02-技术管理/10-研发流程与效率/02-腾讯敏捷项目管理实战',
        hidden: true,
      },
      {
        slug: 'okr-course',
        title: 'OKR组织敏捷目标',
        description: '拉勾《OKR：组织敏捷目标和绩效管理》：从目标管理发展、OKR 价值与战略、O/KR 编写公式、流程管理到激励、文化、变革的完整实战',
        icon: '🎯',
        dir: '09-管理/02-技术管理/12-绩效管理/01-OKR组织敏捷目标和绩效管理',
        hidden: true,
      },
      {
        slug: 'okr-mini',
        title: '极简 OKR 实战',
        description: '拉勾《极简 OKR 实战》：从 OKR 与 KPI 差异、不同规模/行业公司落地重点，到目标 O 与关键结果 KR 的制定、对齐、追踪可视化与反馈优化',
        icon: '🎯',
        dir: '09-管理/02-技术管理/12-绩效管理/02-极简OKR实战',
        hidden: true,
      },
    ],
  },
  {
    id: 'testing',
    title: '测试与质量',
    description: '基于 docs/测试/ 的现代化测试知识体系（2026 版）',
    categories: [
      { slug: 'test-fundamentals', title: '测试基础', description: '测试工程师核心竞争力与职业路径、测试用例设计方法、测试覆盖率与质量门禁、软件缺陷报告与生命周期、测试计划与测试策略、测试工程师的非测试知识', icon: '🧪', dir: '08-测试/01-测试基础' },
      { slug: 'test-models', title: '测试模型与流程', description: '测试金字塔与测试奖杯、测试左移与右移、敏捷测试 Sprint 流程、ATDD/BDD 与实例化需求、探索式测试 SBTM、精准测试与变更影响分析、基于模型的测试 MBT', icon: '🏛️', dir: '08-测试/02-测试模型与流程' },
      { slug: 'unit-testing', title: '单元测试与代码级测试', description: '单元测试基础与测试替身、JUnit 5 Jupiter 实战、pytest 9 fixtures 与参数化、TDD 红-绿-重构、静态/动态/变异测试、JaCoCo 与 coverage.py 与 SonarQube 覆盖率工具', icon: '🔬', dir: '08-测试/03-单元测试与代码级测试' },
      { slug: 'api-testing', title: 'API 测试', description: 'API 测试基础与多协议（REST/GraphQL/gRPC/WebSocket）、Postman v11 与 Newman 自动化、REST Assured 与 pytest+requests、API 测试框架五阶段演进、微服务契约测试 Pact、服务虚拟化与 Mock Server（Mountebank/WireMock）', icon: '🔌', dir: '08-测试/04-API测试' },
      { slug: 'gui-testing', title: 'GUI 自动化测试', description: 'GUI 自动化测试策略与 ROI、Selenium 4 WebDriver、Playwright 1.61、Cypress 15、Page Object 与 Screenplay 模式、数据驱动测试、测试稳定性与 Flaky 治理、Allure 测试报告、Selenium Grid 4 分布式执行', icon: '🖱️', dir: '08-测试/05-GUI自动化测试' },
      { slug: 'mobile-testing', title: '移动端测试', description: '移动应用测试方法（Web/Native/Hybrid/跨平台）、Appium 3 架构与实战、Android 自动化（UiAutomator2/Espresso）、iOS 自动化（XCUITest）、WebView 与混合应用测试、移动测试云真机平台（BrowserStack/Sauce Labs）', icon: '📱', dir: '08-测试/06-移动端测试' },
      { slug: 'performance-testing', title: '性能测试', description: '性能测试指标与方法论、JMeter 5.6.3 核心概念与脚本构建、参数化与分布式压测、JMeter 二次开发、k6 云原生压测、Locust Python 压测、Lighthouse 与 Core Web Vitals 前端性能、Prometheus/Grafana/SkyWalking 10 后端监控、JFR/Arthas 4.3 JVM 分析、MySQL/Redis 8 性能调优、Docker/K8s 应用、Nginx 调优、全链路压测与影子库表', icon: '📊', dir: '08-测试/07-性能测试' },
      { slug: 'test-dev', title: '测试开发与平台工程', description: '测试开发技术栈选型、测试平台开发（Django/FastAPI/Vue）、自动化测试框架设计 13 原则、数据驱动与参数化框架、测试数据持久化与统一数据平台、测试框架动态切换环境与用例、Mock Server 必杀技、测试报告与团队影响力、Linux/Shell 测试开发必备', icon: '🛠️', dir: '08-测试/08-测试开发与平台工程' },
      { slug: 'testing-frontier', title: '测试前沿与质量管理', description: 'AI 辅助测试（LLM 生成用例/Copilot for Tests）、渗透测试与 DevSecOps、混沌工程与故障注入、质量管理体系（Google/BAT 对比）、测试成熟度模型与演进、网站架构与测试设计（高性能/高可用/可伸缩）', icon: '🚀', dir: '08-测试/09-测试前沿与质量管理' },
      { slug: 'testing-appendix', title: '测试附录', description: '测试经典书目与学习资料、测试工程师面试题库、术语表', icon: '📚', dir: '08-测试/10-附录' },
    ],
  },
  {
    id: 'product',
    title: '产品',
    description: '产品思维与实战方法论',
    categories: [
      {
        slug: 'product',
        title: '产品',
        description: '产品创意验证、增长策略、数据驱动、商业化',
        icon: '📱',
        dir: '09-管理/01-产品',
      },
      {
        slug: 'product-case',
        title: '腾讯产品启示录',
        description: '拉勾《腾讯产品启示录》：突破困境、进化式创新、做减法、增长黑客与产品价值观',
        icon: '💡',
        dir: '09-管理/01-产品/01-产品管理/05-腾讯产品启示录',
        hidden: true,
      },
      {
        slug: 'copywriting',
        title: '文案高手的 18 项修炼',
        description: '拉勾《文案高手的 18 项修炼》：用户画像、痛点挖掘、卖点提炼、信任建立到文案变现与影响力打造',
        icon: '✍️',
        dir: '09-管理/01-产品/03-文案高手',
        hidden: true,
      },
      {
        slug: 'competitive-analysis',
        title: '竞品分析实操手册',
        description: '拉勾《竞品分析实操手册》：从明确目标、选定对手、收集信息到 SWOT/AARRR 分析、报告输出与差异化竞争策略',
        icon: '🔍',
        dir: '09-管理/01-产品/04-竞品分析实操手册',
        hidden: true,
      },
      ],
  },
  {
    id: 'tools',
    title: '工具',
    description: '开发工具、编辑器、构建工具',
    categories: [
      {
        slug: 'vim',
        title: 'Vim',
        description: 'Vim 编辑器使用与配置笔记',
        icon: '📝',
        dir: '12-运维/10-Vim',
        hidden: true,
      },
    ],
  },
  
  {
    id: 'misc',
    title: '杂谈博客',
    description: '产品与技术管理杂谈、个人博客与行业观察',
    categories: [
      {
        slug: 'product-manager',
        title: '产品经理',
        description: '产品经理相关知识笔记',
        icon: '📋',
        dir: '09-管理/01-产品/02-产品经理',
        hidden: true,
      },
      {
        slug: 'misc-tech-management',
        title: '技术管理',
        description: '技术管理相关知识笔记',
        icon: '👔',
        dir: '09-管理/02-技术管理/02-其他技术管理',
        hidden: true,
      },
    ],
  },
  {
    id: 'computing-foundations',
    title: '计算机基础',
    description: '计算机组成原理、操作系统与计算机网络三大核心基础课',
    categories: [
      {
        slug: 'cs-basics',
        title: '计算机基础',
        description: '计算机组成原理、操作系统、计算机网络三大核心基础课',
        icon: '💻',
        dir: '10-计算机基础',
      },
    ],
  },
  {
    id: 'security',
    title: '安全',
    description: 'Web 安全、渗透测试与安全加固',
    categories: [
      {
        slug: 'security',
        title: '安全',
        description: '浏览器安全、XSS、SQL 注入、CSRF/SSRF、文件上传、内网渗透与安全加固',
        icon: '🛡️',
        dir: '06-安全/01-Web安全',
      },
    ],
  },
  {
    id: 'devops-ops',
    title: '运维',
    description: 'Docker 容器化、Git 版本控制、CI/CD、Kubernetes、Linux、Nginx 与服务器运维',
    categories: [
      {
        slug: 'ops',
        title: '运维',
        description: 'Docker 容器化、Git 版本控制、CI/CD、持续交付、Kubernetes、Linux、Nginx、监控告警、部署与运维自动化',
        icon: '⚙️',
        dir: '12-运维',
      },
      {
        slug: 'nginx',
        title: 'Nginx',
        description: 'Nginx 配置与运维笔记',
        icon: '🌐',
        dir: '12-运维/04-Nginx',
        hidden: true,
      },
    ],
  },
];

export const allCategories: DocCategory[] = docGroups.flatMap((g) => g.categories);

export function getCategoryBySlug(slug: string): DocCategory | undefined {
  return allCategories.find((c) => c.slug === slug);
}
