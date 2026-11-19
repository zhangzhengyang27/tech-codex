---
title: "应用性能监控：通过 SkyWalking 实施链路追踪"
description: "APM 与 SkyWalking 的定位，SkyWalking 服务端（ElasticSearch 存储）与 Java Agent 无侵入探针的部署接入过程，以及全局监控、拓扑图、链路追踪、数据库与 JVM 等常用视图。"
keywords: [应用性能监控, 通过, SkyWalking, 实施链路追踪]
category: "Java"
tags: [Java, SpringCloudAlibaba实战]
---
# 应用性能监控：通过 SkyWalking 实施链路追踪

基于 Sleuth+Zipkin 的链路追踪方案通过 Sleuth 在微服务应用中附加链路数据，再由 Zipkin 完成链路数据的收集与可视化，帮助开发与运维人员在生产环境了解微服务的执行过程与具体细节。本篇围绕链路追踪话题，介绍另一款链路追踪产品 SkyWalking，内容分为三部分：

- APM 与 SkyWalking 的定位与特点；

- SkyWalking 服务端与 Java Agent 的部署接入过程；

- SkyWalking 常用监控视图。

## APM 与 SkyWalking

### 概念：APM

随着微服务体系的不断完善，链路追踪已不是新兴概念，众多厂商提供了各自的链路追踪产品，例如 Spring Cloud Sleuth、Zipkin、阿里鹰眼、大众点评 Cat、SkyWalking 等。这些产品有一个共同的名字：APM（Application Performance Management），即应用性能管理系统。APM 的根本目的是对应用程序单点性能与整个分布式应用进行监控，记录每一个环节的程序执行状况，通过图表与报表的形式让运维人员随时掌握系统的运行状况。在上述产品中，SkyWalking 值得重点掌握：它在简单易用的前提下实现了比 Zipkin 功能更强大的链路追踪，拥有更友好、更详细的监控项，并能自动生成可视化图表。相比 Sleuth+Zipkin 这种不同厂商间混搭组合的模式，SkyWalking 更符合"一站式解决方案"的设计理念。

### 概念：SkyWalking

SkyWalking 是中国人吴晟（华为）开源的应用性能管理系统（APM）工具，使用 Java 语言开发，后来吴晟将其贡献给 Apache。在 Apache 的背书下 SkyWalking 发展迅速，已成为 Apache 旗下顶级开源项目，官网：[http://skywalking.apache.org/](http://skywalking.apache.org/)。

SkyWalking 提供了分布式追踪、服务网格遥测分析、度量聚合和可视化一体化解决方案。截至写作时，SkyWalking 在 GitHub 上拥有 15.9K Star，最新版本为 8.3.0。

::: tip 选型参考
将 Sleuth+Zipkin 与 SkyWalking 做对比可以发现：在易用性和使用体验上，SkyWalking 明显好于 Zipkin，功能更丰富的同时也更符合国内使用习惯；但因为迭代速度较快，社区文档相对陈旧，不少技术问题需要开发人员自行研究解决，问题定位需要更多时间。
:::

## SkyWalking 架构与服务端部署

### 架构组成

SkyWalking 采用客户端与服务端架构模式：服务端用于接收来自 Java Agent 客户端发来的链路跟踪与指标数据，汇总统计后由 SkyWalking UI 负责展现。SkyWalking 服务端同时支持 gRPC 与 HTTP 两种上报方式：gRPC 默认监听服务器 11800 端口，HTTP 默认监听 12800 端口，SkyWalking UI 应用默认监听 8080 端口，这三个端口在生产环境下要在防火墙做放行配置。在存储层面，SkyWalking 底层支持 ElasticSearch、MySQL、H2 等多种数据源，官方优先推荐使用 ElasticSearch。

### 第一步：安装 ElasticSearch 全文检索引擎

ElasticSearch 简称 ES，是业内最著名的全文检索引擎，常用于构建站内搜索引擎，SkyWalking 官方推荐使用 ES 作为数据存储组件。访问 ES 官网下载页：

[https://www.elastic.co/cn/downloads/elasticsearch](https://www.elastic.co/cn/downloads/elasticsearch)

下载对应平台的 ES 服务器程序。

下载后会得到 elasticsearch-7.10.2-windows-x86_64.zip 文件，解压缩后无须任何修改直接运行 bin/elasticsearch.bat 文件，如果是 Linux 系统则运行 elasticsearch.sh 文件。

默认 ES 监听 9200 与 9300 端口，其中 9200 是 ES 对外提供服务的端口；9300 是 ES 进行集群间通信与数据传输的端口，需确保这两个端口没有被占用。

### 第二步：下载 SkyWalking

访问 [https://skywalking.apache.org/downloads/](https://skywalking.apache.org/downloads/)，下载 SkyWalking 8.3.0，注意版本选择 v8.3.0 for ES7。

下载完毕，解压缩文件得到 apache-skywalking-apm-bin-es7 目录。这里有一个重要细节：SkyWalking 的安装路径不要包含任何中文、特殊字符甚至空格，否则启动时会报"找不到模板文件"的异常。

### 第三步：配置 SkyWalking 数据源

SkyWalking 收集到的数据要被存储在 ElasticSearch 中，因此需要指定数据源。在 config 目录下找到 application.yml，这是 SkyWalking 的核心配置文件。

在配置文件 103 行附近可以看到 storage 配置片段。

```yaml
storage:
  selector: ${SW_STORAGE:h2} #默认使用内置 H2 存储
  elasticsearch: #ES6 配置
    # 其余配置项保持默认即可
  elasticsearch7: #ES7 配置
    nameSpace: ${SW_NAMESPACE:""}
    clusterNodes: ${SW_STORAGE_ES_CLUSTER_NODES:localhost:9200}
    protocol: ${SW_STORAGE_ES_HTTP_PROTOCOL:"http"}
    # 其余配置项保持默认即可
```

默认 SkyWalking 采用内置 H2 数据库存储监控数据，改为 elasticsearch7 即完成数据源存储的切换，启动时 SkyWalking 会自动初始化 ES 的索引。

修改前：

```properties
selector: ${SW_STORAGE:h2}
```

修改后：

```properties
selector: ${SW_STORAGE:elasticsearch7}
```

### 第四步：启动 SkyWalking 应用

在 bin 目录下找到 startup.bat 运行，如果是 Linux 系统运行 startup.sh。

启动后会产生两个 Java 进程：

- Skywalking-Collector 是数据收集服务，默认监听 11800（gRPC）与 12800（HTTP）端口。

- Skywalking-Webapp 是 SkyWalking UI，用于展示数据，默认监听 8080 端口。

启动成功后，访问 [http://192.168.31.10:8080/](http://192.168.31.10:8080/)，如果看到 SkyWalking UI 首页，则说明服务端配置成功。

## Java Agent 探针原理与接入

### 原理：Java Agent 探针技术

SkyWalking 可以在不修改应用源码的前提下，无侵入地实现链路追踪与 JVM 指标监控，其底层依托 Java 1.5 新增的 Java Agent 探针技术。

Java Agent 是 Java 提供的一种"外挂"技术，允许在应用启动时通过增加 javaagent 参数外挂额外的程序。

Java Agent 的扩展类有严格的规范：必须创建名为 premain 的方法，该方法将在目标应用 main 方法前执行。以下是最简单的 Java Agent 扩展类：

```java
public class SimpleAgent {
    public static void premain(String agentArgs, Instrumentation inst) {
        System.out.println("=========开始执行premain============");
    }
}
```

要完成 Java Agent，还需要提供正确的 MANIFEST.MF，以便 JVM 能够选择正确的类。在 META-INF 目录下的 MANIFEST.MF 文件中声明 Premain-Class：

```properties
Manifest-Version: 1.0
Premain-Class: com.lagou.agent.SimpleAgent
```

之后将这个类打包为 agent.jar。假设原始应用为 oa.jar，在 oa.jar 启动时额外附加 javaagent 参数：

```shell
java -javaagent:agent.jar -jar oa.jar
```

应用启动时 Java 控制台会输出如下日志。

```text
=========开始执行 premain============
正在启动 OA 办公自动化系统...
....
```

从输出结果可见：java agent 在目标应用 main 方法执行前先执行了 premain，实现了不修改 OA 源码的前提下增加新的功能。

SkyWalking 正是利用 Java Agent 的特性，在 premain 中通过字节码增强技术对目标方法进行扩展，当目标方法执行时自动收集链路追踪及监控数据并发往 SkyWalking 服务端。

### 接入示例：三服务调用链

以一个典型的调用链示例说明接入过程：用户访问 a 服务的 a 接口，a 服务通过 OpenFeign 远程调用 b 服务的 b 接口，b 服务通过 OpenFeign 调用 c 服务的 c 接口，最后 c 接口通过 JDBC 将业务数据存储到 MySQL 数据库。

SkyWalking 的 agent 目录下存在 skywalking-agent.jar，这就是 SkyWalking 提供的 Java Agent 扩展类。

生产环境下在启动应用时附加 javaagent 参数即可。

a 服务启动命令：

```shell
java -javaagent:D:\apache-skywalking-apm-bin-es7\agent\skywalking-agent.jar -Dskywalking.agent.service_name=a-service -Dskywalking.collector.backend_service=192.168.31.10:11800 -Dskywalking.logging.file_name=a-service-api.log -jar a-service.jar
```

b 服务启动命令：

```shell
java -javaagent:D:\apache-skywalking-apm-bin-es7\agent\skywalking-agent.jar -Dskywalking.agent.service_name=b-service -Dskywalking.collector.backend_service=192.168.31.10:11800 -Dskywalking.logging.file_name=b-service-api.log -jar b-service.jar
```

c 服务启动命令：

```shell
java -javaagent:D:\apache-skywalking-apm-bin-es7\agent\skywalking-agent.jar -Dskywalking.agent.service_name=c-service -Dskywalking.collector.backend_service=192.168.31.10:11800 -Dskywalking.logging.file_name=c-service-api.log -jar c-service.jar
```

如果是在 IDEA 开发环境运行，需要在 VM options 附加 javaagent 参数。

除了 javaagent 指定具体 agent 文件外，agent 本身也支持一系列配置参数，上述启动命令涉及 3 个：

- **skywalking.agent.service_name**：指定在 SkyWalking 上报数据时的服务名。

- **skywalking.collector.backend_service**：指定 SkyWalking 服务端的通信 IP 与端口。

- **skywalking.logging.file_name**：指定 agent 生成的上报日志文件名，日志文件保存在 agent 的 logs 目录中。

## SkyWalking 常用视图

服务启动后，可利用 PostMan 对 a 接口模拟 10000 次访问，观察 SkyWalking UI 中产生的变化。

访问 [http://192.168.31.10:8080/](http://192.168.31.10:8080/) 打开 SkyWalking UI，默认显示全局的应用性能视图。其中比较重要的是**服务状态指数**与**高延迟端点列表**两项：服务状态指数越接近 1 代表该服务运行状况越好；高延迟端点列表将处理延迟高的 API 端点列出，可作为重点排查与优化的对象。

除全局监控外，SkyWalking 的链路追踪展示也非常友好，点击"拓扑"按钮可以查看访问拓扑图，服务间依赖关系一目了然。

链路追踪的展示同样强大：服务间的 API 调用关系与执行时间、调用状态清晰列出，而且因为 SkyWalking 是方法层面上的扩展，会提供更加详细的方法间的调用过程。

SkyWalking 基于 Java Agent 对数据库的运行指标也进行收集，点击"database"即可进入数据库指标监控。

SkyWalking 提供多达几十种不同维度、不同方式的数据展示方案，例如基于服务实例的 JVM 检测仪表盘能够展示该服务 JVM 的资源分配过程，便于分析其中潜在的问题。

::: warning 生产化注意事项
SkyWalking 并非全能，在生产环境下还需要逐步完善集群管理、访问权限控制、自监控、风险预警等问题，因此很多互联网公司基于 SkyWalking 做二次开发以满足自身需求。
:::

## 小结

本文覆盖三方面内容：首先介绍了 APM 与 SkyWalking 的定位与特点；其次讲解了 SkyWalking 服务端的部署过程与 Java Agent 探针技术的接入过程；最后对 SkyWalking UI 提供的全局监控、拓扑、链路追踪、数据库与 JVM 等各类监控图表进行了说明。

## 版本差异（Spring Cloud Alibaba 旧版 → 2025.x）

| 组件 | 旧版（本文编写时） | 当前（Spring Cloud Alibaba 2025.x / Boot 3.5.x） |
|------|-------------------|--------------------------------------------------|
| 注册配置中心 | Nacos 1.x/2.0 | Nacos 2.x+（gRPC 通信、鉴权） |
| 限流熔断 | Sentinel 1.8 | Sentinel 1.8+（规则可持久化到 Nacos） |
| 分布式事务 | Seata 1.x | Seata 1.6+/2.x（AT 模式稳定） |
| RPC | Dubbo 2.x | Dubbo 3.x（应用级服务发现） |
| 负载均衡 | Ribbon（已停止维护） | Spring Cloud LoadBalancer |
| 链路追踪 | Sleuth + Zipkin（Sleuth 已停止维护） | Micrometer Tracing + Zipkin/OTel |
| 版本对应 | Boot 2.x + JDK 8 | Boot 3.5.x + JDK 17+（2022.0.0.0+ 起） |

> 本文为 Spring Cloud Alibaba 旧版课程。升级到 Spring Cloud Alibaba 2025.x + Spring Boot 3.5.x 时，注意 Nacos 2.x 鉴权、Seata 2.x 配置与 Dubbo 3.x 应用级注册的迁移。
