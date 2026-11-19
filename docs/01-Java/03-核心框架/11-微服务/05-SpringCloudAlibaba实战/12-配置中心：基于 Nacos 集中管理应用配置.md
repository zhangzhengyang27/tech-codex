---
title: "配置中心：基于 Nacos 集中管理应用配置"
description: "为什么微服务必须部署配置中心，Nacos 配置中心的部署、微服务通过 bootstrap.yml 接入的过程，以及配置热加载（长轮询+@RefreshScope）、多环境切换与基础配置管理技巧。"
keywords: [配置中心, 基于, Nacos, 集中管理应用配置]
category: "Java"
tags: [Java, SpringCloudAlibaba实战]
---
# 配置中心：基于 Nacos 集中管理应用配置

## 概念说明

本篇是系统保护主线内容的扩展，讲解基于 Nacos 如何集中管理应用配置，实现微服务架构中的"配置中心"组件。该内容与"系统保护"主题并不冲突：构建 Nacos 配置中心正是 Sentinel 实现集群保护的基础所在，在 Dashboard 中配置的一系列规则在生产环境中都要基于 Nacos 配置中心进行持久化存储。

本篇包含三方面内容：

- 为什么微服务架构必须部署配置中心；
- Nacos 配置中心的快速部署与微服务接入；
- Nacos 生产环境中的配置技巧。

## 为什么微服务架构必须部署配置中心

当前微服务开发的主流技术基于 Spring Boot，其默认配置文件为 application.yml 或 application.properties，保存应用的主要配置信息。这些配置文件会随着应用发布被打包放入 Jar 文件，随应用加载并运行。

应用只有几个微服务时，配置文件分散存放在各个 Jar 中问题不大。但如果是大型互联网应用，涉及几十个研发团队、上百台服务器、上千个服务实例时，运维团队就要面对数量级增加带来的挑战，主要体现在三个方面。

第一，纯粹的工作量增加。假设微服务 A 有 400 个实例，application.yml 分散存储在每一个 Jar 中，一旦机房环境变化、数据库服务器 IP 变更，运维人员就不得不在 400 个实例中对每一个数据库连接 URL 进行调整，费时费力还容易出错。

第二，版本管理的需求。生产环境的状况远比开发、测试环境复杂，无法保证新版本服务上线时一定不出问题。一旦出现重大故障，生产环境必须具备应用版本回滚机制，在保证生产可用的前提下再分析故障原因，这个场景中如何对配置文件进行版本管理是必须要考虑的。

第三，多环境之间的切换。成熟的软件研发流程拥有多套不同环境，例如开发环境、测试环境、UAT 环境、仿真环境、生产环境。不同环境中各种组件的 IP、用户名、密码、配置项都会有差异，在不同环境下运行要求应用具备快速切换并加载对应配置文件的能力，将配置写死在 Jar 中显然无法满足这个要求。

为了解决这些问题，微服务架构必须额外引入"**配置中心**"组件，其职责是集中管理微服务架构中每一个服务实例的配置数据。引入配置中心后，微服务应用只需持有应用启动的最小化配置，应用启动时所需的其他配置数据（诸如数据库连接字符串、各种用户名密码、IP 等）均从配置中心远程下载，不再本地保存。开发人员书写应用配置时也不再直接写入 application.yml，而是直接在配置中心提供的 UI 进行设置。

引入配置中心后，微服务的架构产生如下变化：研发运维人员在配置中心提前定义各种环境的配置信息；微服务实例启动时根据服务名、环境等从配置中心查询配置数据并下载到本地；服务实例加载这些来自配置中心的配置信息完成应用启动。

在 Spring Cloud Alibaba 架构下，Nacos 除了能作为注册中心，还提供配置中心的功能。Nacos 作为配置中心，除了基本的配置存储，还提供版本管理、变更推送、监听查询以及友好的中文 UI 界面，研发人员和运维人员都可以快速上手实现应用配置。

## 部署 Nacos 配置中心与服务接入

### 部署 Nacos 配置中心

Nacos 本身同时具备注册中心与配置中心职责，部署方面与部署 Nacos 集群基本一致。唯一不同点是 Nacos 要将应用的配置数据保存在数据库以防丢失，因此要配置 Nacos 的数据库访问地址。

第一步，下载并解压缩 Nacos。

```shell
tar -xvf nacos-server-1.4.0.tar.gz
```

第二步，配置数据库。这一步最重要：在 MySQL 加载执行 /nacos/conf/nacos-mysql.sql，完成建表工作。其中所有 config_ 开头的表都是 Nacos 配置中心保存应用配置的表。

第三步，配置 Nacos 数据源。打开 /usr/local/nacos/conf/application.properties，定位到 36 行 Count of DB "数据源"配置附近，按下方示例配置数据源即可。

```properties
### Count of DB: 数据库总数
db.num=1
## Connect URL of DB: 数据库连接,根据你的实际情况调整
db.url.0=jdbc:mysql://192.168.31.10:3306/nacos_config?characterEncoding=utf8&connectTimeout=1000&socketTimeout=3000&autoReconnect=true&useUnicode=true&useSSL=false&serverTimezone=UTC
db.user=root
db.password=root
```

第四步，复制命令创建 cluster.conf 文件。

```shell
cp cluster.conf.example cluster.conf
```

打开 cluster.conf，添加所有 Nacos 集群节点 IP 及端口。为方便演示，这里只部署一个节点。

```shell
#vim cluster.conf
192.168.31.10:8848
```

第五步，按集群模式启动 Nacos 即可。

```shell
sh /usr/local/nacos/bin/startup.sh
```

最后，访问下面网址可以看到配置列表页面，未来所有的应用配置都可以通过配置列表页面进行展示。

```text
http://192.168.31.10:8848/nacos/#/configurationManagement?dataId=&group=&appName=
```

### 微服务接入 Nacos 配置中心

**第一步，创建工程引入依赖。**

利用 Spring Initializr 向导创建 order-service 订单服务工程，确保 pom.xml 引入以下 3 个依赖。

```xml
<!-- Spring Boot Web模块 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<!-- Nacos注册中心starter -->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
<!-- Nacos配置中心starter -->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
</dependency>
```

**第二步，在工程创建配置文件。**

在接入 Nacos 配置中心之前，要确保 Spring Boot 配置是完整的。application.yml 文件内容如下，注意最后两行，custom 开头的配置项是自定义的，用于后续演示环境切换。

```yaml
server:
  port: 8000
spring:
  application:
    name: order-service
  cloud:
    nacos:
      discovery:
        server-addr: 192.168.31.10:8848 #Nacos通信地址
        username: nacos
        password: nacos
custom: #自定义配置项
  flag: development
  database: 192.168.10.31
```

**第三步，创建演示代码。**

新建 TestController，增加 /test 接口，将配置文件中两个自定义配置输出。

```java
@RestController
public class TestController {
    @Value("${custom.flag}")
    private String flag;
    @Value("${custom.database}")
    private String database;
    @GetMapping("/test")
    public String test(){
        return "flag:" + flag + "<br/> database:" + database;
    }
}
```

**第四步，启动应用查看结果。**

打开浏览器访问下面网址。

```text
http://localhost:8000/test
结果如下：
flag:development
database:192.168.10.31
```

其中 flag:development 说明当前是"开发环境"。一切准备就绪，即可正式接入 Nacos 配置中心。

**接入第一步：在配置中心新建配置。**

打开 Nacos 配置中心页面，点击右上角"+"号新建配置。新建配置页面包含六个选项：Data ID、Group、描述、说明、配置格式与配置内容，各选项作用如下：

- **Data ID**：配置的唯一标识，格式固定为：{微服务id}-{环境名}.yml。这里填写 order-service-dev.yml，其中 dev 就是环境名，代表这个配置文件是 order-service 的开发环境配置文件。
- **Group**：指定配置文件的分组，设置默认分组 DEFAULT_GROUP 即可。
- **描述**：说明 order-service-dev.yml 配置文件的用途。
- **配置格式**：指定"配置内容"的类型，这里选择 YAML 即可。
- **配置内容**：将 order-service 工程的 application.yml 文件内容粘贴过来。

之后点击右下角的"发布"按钮完成设置。与此同时，在 nacos_config 数据库的 config_info 表中也出现了对应配置数据。

**接入第二步：删除本地 application.yml。**

回到 order-service 工程，删除 application.yml，因为这个文件内容已经保存在 Nacos 配置中心中。

**接入第三步：创建 bootstrap.yml 引导文件。**

在 resources 目录下创建 bootstrap.yml 引导文件，对 Nacos 配置中心地址进行设置。注意，bootstrap.yml 文件名是固定的，不要随意改变。

```yaml
spring:
  application:
    name: order-service #微服务id
  profiles:
    active: dev #环境名
  cloud:
    nacos:
      config: #Nacos配置中心配置
        file-extension: yml #文件扩展名
        server-addr: 192.168.31.10:8848
        username: nacos
        password: nacos
logging: #开启debug日志，仅为学习时使用
  level:
    root: debug
```

上面的配置包含两部分内容：第一部分说明 Nacos 配置中心的 IP、端口等信息；第二部分通过文件中的"微服务 id"-"环境名"."文件扩展名"三部分组合为有效的 data id，即 order-service-dev.yml。

**这个 data id 要和 Nacos 的设置大小写保持完全一致**，这样在微服务启动时便会自动从 Nacos 配置中心获取 order-service-dev.yml 配置并下载到本地完成启动过程。

启动应用后的日志输出如下：

```log
...
[main] c.a.c.n.c.NacosPropertySourceBuilder     : Loading nacos data, dataId: 'order-service-dev.yml', group: 'DEFAULT_GROUP', data: server:
server:
  port: 8000
spring:
  application:
    name: order-service
  cloud:
    nacos:
      discovery:
        server-addr: 192.168.31.10:8848
        username: nacos
        password: nacos
custom: #自定义配置项
  flag: development
  database: 192.168.10.31
[main] o.s.b.factory.config.YamlMapFactoryBean  : Loading from YAML: Byte array resource [resource loaded from byte array]
...
[main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port(s): 8000 (http) with context path ''
```

通过 Debug 日志可以发现，启动时微服务向 Nacos 查询 order-service-dev.yml 的内容，并将配置内容打印在 Debug 级别日志中，之后作为应用配置加载完成启动。访问 http://localhost:8000/test 运行结果如下：

```plain
flag:development
database:192.168.10.31
```

至此完成 Nacos 配置中心的接入。小结一下：配置数据放在 Nacos 配置中心中，微服务在启动时自动下载，因此同一个微服务的所有实例得到的配置信息都是一致的；如果需要调整配置，只需在 Nacos 中调整，然后让微服务实例重启即可重新下载生效。

接下来的自然问题是：一旦配置变更就必须手动重启，运维效率仍然太低。如果微服务能自动监听配置变化并自动加载新配置则更理想。答案是肯定的——Nacos 通过主动推送方式允许程序在运行期间重新下载配置。下面介绍几个生产环境中实用的配置技巧。

## Nacos 生产环境中的配置技巧

### 配置热加载技术

Nacos 支持配置热加载，在运行过程中允许直接对新的配置项进行重新加载而不需要手动重启。

#### 热加载背后的长轮询机制

Nacos 采用的是 Pull 拉取模式，但并不是简单的 Pull，而是一种长轮询机制。客户端采用长轮询的方式定时发起 Pull 请求，检查服务端配置信息是否发生变更；如果发生了变更，客户端会根据变更的数据获得最新的配置。所谓长轮询，是客户端发起轮询请求之后，服务端如果有配置发生变更就直接返回。

如果客户端发起 Pull 请求后发现服务端的配置与客户端保持一致，服务端会先"Hold"住这个请求——服务端拿到这个连接之后在指定的时间段内一直不返回结果，直到这段时间内配置发生变化，服务端把原来"Hold"住的请求进行返回。

Nacos 服务端收到请求之后，先检查配置是否发生了变更；如果没有，则设置一个定时任务延期 29.5s 执行，并把当前的客户端长轮询连接加入 allSubs 队列。这时有两种方式触发该连接结果的返回：

- 第一种是在等待 29.5s 后触发自动检查机制，这时不管配置有没有发生变化，都会把结果返回客户端，29.5s 就是这个长连接保持的时间。
- 第二种是在 29.5s 内任意一个时刻，通过 Nacos Dashboard 或者 API 的方式对配置进行了修改，这会触发一个事件机制，监听到该事件的任务会遍历 allSubs 队列，找到发生变更的配置项对应的 ClientLongPolling 任务，将变更的数据通过该任务中的连接进行返回，完成一次"推送"操作。

这样既能够保证客户端实时感知配置的变化，也降低了服务端的压力。长连接的会话超时时间默认为 30s。

#### 热加载的代码改造

为了支持热加载，服务程序需要作出如下变动：

第一，配置数据必须被封装到单独的配置 Bean 中；第二，这个配置 Bean 需要被 @Configuration 与 @RefreshScope 两个注解描述。

以 order-service 为例：将 flag 与 database 两个属性移到单独的配置 Bean，并加入 @Configuration 与 @RefreshScope 注解。

```java
package com.lagou.orderservice.config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.context.annotation.Configuration;
@Configuration
@RefreshScope
public class CustomConfig {
    @Value("${custom.flag}")
    private String flag;
    @Value("${custom.database}")
    private String database;
    public String getFlag() {
        return flag;
    }
    public void setFlag(String flag) {
        this.flag = flag;
    }
    public String getDatabase() {
        return database;
    }
    public void setDatabase(String database) {
        this.database = database;
    }
}
```

其中，@Configuration 说明当前 Bean 是一个配置 Bean，是 Spring Boot 自带的 Java Config 注解；@RefreshScope 则让该 Bean 在收到配置刷新事件时被重建，重新注入最新的属性值。

此外，原有的 TestController 代码变更为引用 CustomConfig 对象。

```java
@RestController
public class TestController {
    @Resource
    private CustomConfig customConfig;
    @GetMapping("/test")
    public String test(){
        return "flag:" + customConfig.getFlag() + "<br/> database:" + customConfig.getDatabase();
    }
}
```

启动应用后，在 Nacos 中手动改变 database 配置项从 31 变为 33。点击发布后出现前后配置对比，左边是新版本，右边是上一个旧版本，差异使用红绿线标出。确认发布后，order-service 服务的日志立即产生重新加载的信息，提示"Refresh Nacos config"。

```log
[192.168.31.10_8848] c.a.c.n.refresh.NacosContextRefresher    : Refresh Nacos config group=DEFAULT_GROUP,dataId=order-service-dev.yml,configInfo=server:
  port: 8000
spring:
  application:
    name: order-service
  cloud:
    nacos:
      discovery:
        server-addr: 192.168.31.10:8848
        username: nacos
        password: nacos
custom: #自定义配置项
  flag: development
  database: 192.168.10.33
[192.168.31.10_8848] c.a.nacos.client.config.impl.CacheData   : [fixed-192.168.31.10_8848] [notify-ok] dataId=order-service-dev.yml, group=DEFAULT_GROUP, md5=aeee8dceea709b3081d3c882ae2464b2, listener=com.alibaba.cloud.nacos.refresh.NacosContextRefresher$1@5bcff640
```

访问 http://localhost:8000/test，运行结果如下，新的配置已即时生效：

```plain
flag:development
database:192.168.10.33
```

### 切换环境配置文件

产品开发完成准备投产时，可以利用 Nacos 提供的环境配置迅速完成从开发到生产环境的切换。

第一步，在 Nacos 中设置生产环境的配置，Data Id 为 order-service-prd.yml，其中 prd 是 production 的缩写，代表生产环境配置。这份配置最大的变化是 Nacos 通信地址与自定义配置均指向生产环境 IP，同时 flag 变为 production 代表生产环境。

```yaml
server:
  port: 80
spring:
  application:
    name: order-service
  cloud:
    nacos:
      discovery:
        server-addr: 10.181.36.10:8848
        username: nacos
        password: nacos
custom: #自定义配置项
  flag: production
  database: 10.181.36.22
```

第二步，调整 order-service 的 bootstrap.yml 引导文件，最重要的地方是修改环境名为 prd，同时更换为生产环境 Nacos 的通信地址，打包后发布。

```yaml
spring:
  application:
    name: order-service #微服务id
  profiles:
    active: prd #环境名
  cloud:
    nacos:
      config: #这里配置的是Nacos配置中心
        file-extension: yml #指定文件扩展名
        server-addr: 10.181.36.10:8848 #生产环境Nacos通信地址
        username: nacos
        password: nacos
```

访问 http://localhost:8000/test，运行结果如下，flag:production 说明已切换到生产环境。

```plain
flag:production
database:10.181.36.22
```

### 管理基础配置数据

对比 order-service-dev.yml 与 order-service-prd.yml 可以发现，不同环境的配置文件中普遍存在固定的配置项。例如 spring.application.name=order-service 配置项就是稳定的，且修改它会影响所有环境配置文件。对于这种基础的全局配置，可以将其存放到单独的 order-service.yml 配置中：order-service 服务启动时，这个不带环境名的配置文件必然会被加载。

其中，order-service.yml 包含应用名称这一其他环境配置都需要包含的内容。

```yaml
spring:
  application:
    name: order-service
```

order-service-dev.yml 只包含与开发环境相关的配置。

```yaml
server:
  port: 8000
spring:
  cloud:
    nacos:
      discovery:
        server-addr: 192.168.31.10:8848
        username: nacos
        password: nacos
custom: #自定义配置项
  flag: development
  database: 192.168.10.33
```

order-service-prd.yml 只包含与生产环境相关的配置。

```yaml
server:
  port: 80
spring:
  cloud:
    nacos:
      discovery:
        server-addr: 10.181.36.10:8848
        username: nacos
        password: nacos
custom: #自定义配置项
  flag: production
  database: 10.181.36.22
```

以上即 Nacos 配置中心的常用设置技巧，可结合项目实际情况加以利用。

## 小结

- 配置中心在微服务架构中承担集中管理各服务实例配置数据的职责，解决多实例批量修改、版本管理与多环境切换三大痛点，让运维人员摆脱烦琐的重复工作。
- Nacos 兼具注册中心与配置中心职责；微服务通过 bootstrap.yml 引导文件加载 Nacos 指定 data id 的配置数据，data id 由"微服务 id-环境名.文件扩展名"组合而成。
- 三种生产环境常用技巧：配置热加载（长轮询 + @RefreshScope 重建配置 Bean）、切换环境配置文件（调整 profiles 与 Nacos 通信地址）、管理基础配置数据（无环境名的全局配置文件优先加载）。

延伸思考：假如没有 Nacos 这种成熟的配置中心产品，Redis 能否作为配置中心的替代品。

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

> 本文基于 Spring Cloud Alibaba 旧版编写。升级到 Spring Cloud Alibaba 2025.x + Spring Boot 3.5.x 时，注意 Nacos 2.x 鉴权、Seata 2.x 配置与 Dubbo 3.x 应用级注册的迁移。
