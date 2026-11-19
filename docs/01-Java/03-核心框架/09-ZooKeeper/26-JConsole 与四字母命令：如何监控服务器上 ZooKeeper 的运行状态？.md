---
title: "监控与日志清理：JConsole、四字母命令与 PurgeTxnLog"
description: "让 ZooKeeper 服务持续稳定地对外提供服务，离不开两件运维工作：监控运行状态（JConsole 远程监控、stat/srvr/cons/ruok 四字母命令、Zabbix 自动化监控）与日志维护（crontab 定时脚本与 PurgeTxnLog 工具清理）。"
keywords: [JConsole, 四字母命令, 监控, crontab, PurgeTxnLog]
category: "Java"
tags: [Java, ZooKeeper]
---

# 监控与日志清理：JConsole、四字母命令与 PurgeTxnLog

## 概述

在生产环境中部署 ZooKeeper 集群后，要保证服务持续稳定地对外提供服务，除了在部署阶段采用分布式、集群等方式提高 ZooKeeper 服务的可靠性外，还需要在服务上线运行后对其运行状态进行监控，例如运行 ZooKeeper 服务的生产服务器的 CPU、内存、磁盘等使用情况。当系统性能达到瓶颈时，可以据此增加服务器资源，以保证服务的稳定性。

除监控之外，几乎所有的生产系统都会产生日志文件，用于记录服务的运行状态，并在服务发生异常时作为分析问题原因的依据。ZooKeeper 作为分布式系统下的重要组件，会处理大量的客户端请求，因此也会产生大量日志文件，对这些日志的维护直接关系到整个 ZooKeeper 服务的运行质量。本文围绕这两项运维工作展开：监控运行状态与日志清理。

## JConsole 远程监控

### 概念与机制

JConsole 是 JDK 自带的工具，用来监控程序运行的状态信息。打开系统的控制终端，输入 jconsole 命令即可弹出监控界面。

![](/zookeeper-images/26-JConole_与四字母命令_如何监控服务器上_ZooKeeper_的运行状态___CgqCHl8kAy2ANt38AADolBOTa2s256.png)

JConsole 之所以能够连接并监控 ZooKeeper 服务，是因为 ZooKeeper 支持 JMX（Java Management Extensions），即 Java 管理扩展——一个为应用程序、设备、系统等植入管理功能的框架。JMX 可以跨越一系列异构操作系统平台、系统体系结构和网络传输协议，灵活地开发无缝集成的系统、网络和服务管理应用。通过 JMX 即可访问和管理 ZooKeeper 服务集群。

### 实践要点：开启 JMX 并建立远程连接

**第一步：开启 ZooKeeper 的 JMX 功能。** 在 ZooKeeper 安装目录下的 bin 文件夹中，通过 vim 命令编辑 zkServer.sh 文件，加入如下配置：指定 JMX 服务的端口号，并禁止 SSL 与身份认证。

```properties
-Dcom.sun.management.jmxremote.port=50000
-Dcom.sun.management.jmxremote.ssl=false
-Dcom.sun.management.jmxremote.authenticate=false

```

**第二步：通过 JConsole 连接 ZooKeeper。** JMX 配置完成后，通过系统终端启动 JConsole，在弹出的对话框中选择远程连接，在远程连接地址中输入要监控的 ZooKeeper 服务器地址，即可通过 JConsole 监控 ZooKeeper 服务器。

![](/zookeeper-images/26-JConole_与四字母命令_如何监控服务器上_ZooKeeper_的运行状态___Ciqc1F8kA0CAF9c9AACQw_N29Fg373.png)

## 四字母命令

### 概念说明

除 JConsole 监控控制台之外，ZooKeeper 还提供了一组更为灵活的命令，用于统计和监控 ZooKeeper 服务的状态信息。这组命令也叫作四字母命令——每一个命令都由四个字母组成。命令在系统控制台中执行，调用格式如下，例如执行 stat 命令即可查看数据节点等信息。

```bash
echo {command} | nc 127.0.0.1 2181

```

### 常用命令详解

#### stat

stat 命令用于监控 ZooKeeper 服务器的状态，可统计 ZooKeeper 版本信息、集群节点数等信息。执行 `echo stat` 命令后，查询到的服务状态信息会输出到控制台。

```bash
$ echo stat | nc localhost 2181
Zookeeper version: 3.4.13- built on 06/29/2018 04:05 GMT
Clients:
 /0:0:0:0:0:0:0:1:40598[0](queued=0,recved=1,sent=0)
Latency min/avg/max: 0/0/0
Received: 17
Sent: 16
Connections: 1
Outstanding: 0
Zxid: 0x0
Mode: follower
Node count: 4

```

#### srvr

srvr 命令与 stat 命令的功能十分相似，唯一的不同是 srvr 命令不会输出与客户端的连接情况，只查询服务器自身信息。

```bash
$ echo srvr | nc localhost 2181
Zookeeper version: 3.4.13- built on 06/29/2018 04:05 GMT
Latency min/avg/max: 0/0/0
Received: 26
Sent: 25
Connections: 1
Outstanding: 0
Zxid: 0x0
Mode: follower
Node count: 4

```

#### cons

cons 命令用于输出当前这台服务器上所有客户端连接的详细信息，包括每个客户端的客户端 IP、会话 ID 和最后一次与服务器交互的操作类型等。

```bash
$ echo cons | nc localhost 2181
 /0:0:0:0:0:0:0:1:31569[0](queued=0,recved=1,sent=0)

```

#### ruok

ruok 命令的主要作用是查询 ZooKeeper 服务器是否正常运行：服务器正常运行时返回 "imok"；服务未正常运行时不会有任何返回值。使用时需要注意：有些时候即使返回了 "imok" 字段，ZooKeeper 服务也可能没有正常运行，唯一能确定的是该台服务器的 2181 端口处于打开状态。

```bash
$ echo ruok | nc localhost 2181
imok

```

## 基于 Zabbix 的集群自动化监控

### 场景与监控项

四字母命令适合单机查询。在实际生产环境中，ZooKeeper 集群的规模可能很大，逐一通过命令的方式监控显然不可行，因此需要自动化的集群监控方案。

构建自动化监控首先需要明确监控的数据类型，主要监控项包括：最小会话超时、最大会话超时、最大连接数、发送的数据包、接收的数据包。具体实现通过 Zabbix 完成。

### Zabbix 简介

Zabbix 是一个性能监控的管理工具，基于 Web 界面提供分布式系统监视以及网络监视功能，属于企业级开源解决方案。

### 安装

可通过 Maven 或 Gradle 项目管理工具下载 Zabbix，以 Maven 工程为例，需要在 pom 文件中引入相关配置。

```xml
<dependency>
    <groupId>io.github.cgi</groupId>
    <artifactId>zabbix-api</artifactId>
    <version>0.0.5</version>
</dependency>

```

### 监控脚本实现

将 Zabbix 引入工程项目后，即可编写脚本自动化获取 ZooKeeper 服务的相关信息。创建 ZooKeeperInfo 脚本，在脚本文件中创建 mntr 数组变量，用于设置需要监控的服务参数，例如 minSessionTimeout 最小超时时间、maxSessionTimeout 最大超时时间等。

```python
ZookeeperServer = '127.0.0.1'
ZookeeperPort = 2181
ZookeeperCommand = 'mntr'
ZookeeperKey = 'zk_version'

CommandKey = {
    'conf': ['clientPort', 'dataDir', 'dataLogDir', 'tickTime', 'maxClientCnxns', 'minSessionTimeout', 'maxSessionTimeout', 'serverId', 'initLimit', 'syncLimit', 'electionAlg', 'electionPort', 'quorumPort', 'peerType'],
    'ruok': ['state'],
    'mntr': ['zk_version', 'zk_avg_latency', 'zk_max_latency', 'zk_min_latency', 'zk_packets_received', 'zk_packets_sent', 'zk_num_alive_connections', 'zk_outstanding_requests', 'zk_server_state', 'zk_znode_count', 'zk_watch_count', 'zk_ephemerals_count', 'zk_approximate_data_size', 'zk_open_file_descriptor_count', 'zk_max_file_descriptor_count', 'zk_followers', 'zk_synced_followers', 'zk_pending_syncs']
}

class ZooKeeperCommands(object):
    def __init__(self, server, port, zkCommand, zkKey):
        self._server = server
        self._port = port
        self._zkCommand = zkCommand
        self._zkKey = zkKey
        self._value_raw = None
        self._value = None

    def zk_exec(self):
        self._exec_command()
        self._parse_value()
        return self._value

    def _exec_command(self):
        tn = Telnet(self._server, self._port, timeout=30)
        tn.write((self._zkCommand + '\n').encode())
        self._value_raw = tn.read_all().decode()
        tn.close()
```

> 说明：mntr 等四字母命令是明文协议，直接通过 Telnet 发送命令即可获得返回值；上面示例中的读取逻辑按实际脚本环境调整即可。

## 日志类型与清理方案

### 日志类型

ZooKeeper 服务运行时一般会产生数据快照和日志文件：数据快照用于集群服务中的数据同步，数据日志则记录 ZooKeeper 服务运行的相关状态信息。生产环境中需要定期维护和管理的文件是数据日志。

### 清理的必要性

面对生产系统中产生的日志，一般的维护操作是备份和清理。备份用于之后对系统运行情况的排查和优化；清理则是因为随着系统日志的增加，日志会逐渐占用系统的存储空间，长期不清理可能耗尽系统的磁盘存储空间，并最终影响服务的运行。由于实际工作中无法 24 小时人工监控系统日志情况，需要借助定时任务自动清理和备份 ZooKeeper 服务运行产生的相关日志。

## 清理工具：crontab 与 PurgeTxnLog

### crontab 定时清理

crontab 是 Linux 系统下的软件，可以按照设定的时间周期性地执行脚本。下面用它实现一个每周定期清理 ZooKeeper 服务日志的定时任务。

#### 创建清理脚本

通过 Linux 系统下的 Vim 文本编辑器，在 usr/bin/ 文件夹下创建名为 "logsCleanWeek" 的定时脚本（shell 格式的可执行文件）。脚本的主要内容是设定 ZooKeeper 快照和数据日志的对应文件夹路径，并通过 shell 脚本、管道和 find 命令查询对应的日志文件，保留最新的 10 条数据日志，其余全部清理。

```bash
#!/bin/bash
count=11   # 保留最新的 10 个文件，从第 11 个开始删除
dataDir=/home/zk/zk_data/version-2
dataLogDir=/home/zk/zk_log/version-2
logDir=/home/zk/logs
ls -t $dataLogDir/log.* | tail -n +$count | xargs rm -f
ls -t $dataDir/snapshot.* | tail -n +$count | xargs rm -f
ls -t $logDir/zookeeper.log.* | tail -n +$count | xargs rm -f
find /home/zk/zk_data/version-2 -name "snap*" -mtime +1 | xargs rm -f
find /home/zk/zk_data/logs/ -name "zookeeper.log.*" -mtime +1 | xargs rm -f

```

#### 创建定时任务

crontab 命令的语法如下：`-u` 表示设定指定的用户——Linux 系统是多用户操作系统，crontab 的本质是根据使用系统的用户来设定程序执行的时间计划表，因此当命令执行者具有管理员 root 账号权限时，可以通过 `-u` 为特定用户设定某个程序的具体执行时间。

```bash
crontab [ -u user ] { -l | -r | -e }

```

在系统控制台输入 `crontab -e` 命令开启定时任务的编辑功能，系统会显示出当前已有的定时任务列表。crontab 界面的操作逻辑和 Vim 相同：将光标移动到文件的最后一行，敲击 i 键进入编辑模式。

![](/zookeeper-images/27-crontab_与_PurgeTxnLog_线上系统日志清理的最佳时间和方式__CgqCHl8qlt2ALC7CAABlifm7LHs902.png)

crontab 定时脚本由两部分组成：第一部分是定时时间，第二部分是要执行的脚本。脚本的执行时间按照 f1 分、f2 小时、f3 日、f4 月、f5 一个星期中的第几天的固定顺序格式编写。

```bash
f1 f2 f3 f4 f5 program

```

当对应的时间位上为 * 时，表示每间隔一段时间都要执行。例如 f1（分）位设定为 * 时，表示每分钟都要执行对应的脚本。如果想在每天的特定时间执行脚本，可以在对应的时间位设定一个时间段。以下配置将脚本清理时间设定为每天早上的 6 点到 8 点。

```bash
0 6-8 * * * /usr/bin/logsCleanWeek.sh>/dev/null 2>&1

```

#### 查看定时任务

设定完定时任务后，在控制台输入 `crontab -l` 命令即可查询系统当前的定时任务。

![](/zookeeper-images/27-crontab_与_PurgeTxnLog_线上系统日志清理的最佳时间和方式__CgqCHl8qlu-AW-xZAAA50ErYH4s391.png)

至此，通过 crontab 定时任务自动清理和维护 ZooKeeper 服务产生的相关日志和数据的流程配置完成。crontab 定时脚本的方式相对灵活，可以按照业务需求设置日志的维护方式。例如希望定期清除 ZooKeeper 服务运行的日志、但不清除数据快照文件时，可以通过脚本设置达到只清理数据日志文件的目的。

### PurgeTxnLog 官方工具清理

除通过 crontab 脚本定时清理 ZooKeeper 服务的相关日志外，ZooKeeper 自身还提供了 PurgeTxnLog 工具类，用来清理 snapshot 数据快照文件和系统日志。

PurgeTxnLog 清理方式与 crontab 方式十分相似，同样通过定时脚本执行任务。唯一的不同在于：编写 logsCleanWeek 脚本时使用原生 shell 手动编写数据日志清理逻辑，而使用 PurgeTxnLog 则在清除脚本中直接调用 ZooKeeper 提供的工具类完成日志清理工作。

在 /usr/bin 目录下创建一个 PurgeLogsClean 脚本（同样是 shell 文件），脚本中只需编写 PurgeTxnLog 类的调用命令，系统就会自动通过 PurgeTxnLog 工具类完成对应日志文件的清理工作。

```bash
#!/bin/sh
java -cp "$CLASSPATH" org.apache.zookeeper.server.PurgeTxnLog /home/zk/zk_data/version-2 /home/zk/zk_log/version-2 -n 10
echo "清理完成"

```

两种方式对比：PurgeTxnLog 使用起来更加容易，而且更加稳定安全；crontab 方式则更加灵活，可以根据不同的业务需求编写自己的清理逻辑。

## 小结

ZooKeeper 集群在生产环境中的日常运维围绕两项工作：

- **监控运行状态**：通过 JMX 方式对 ZooKeeper 集群进行远程监控，配合 JConsole 使用；stat、srvr、cons、ruok 等四字母命令用于单机状态查询；面对大规模 ZooKeeper 集群时，利用 Zabbix 自动化获取监控数据。

- **日志清理**：线上 ZooKeeper 服务日志和数据快照的清理与维护可通过 crontab 和 PurgeTxnLog 两种方式实现。两者的差异在清理脚本的实现方式上：crontab 依赖手动编写的 shell 脚本，执行时需要考虑脚本权限等问题；PurgeTxnLog 是 ZooKeeper 提供的专门处理日志清除的工具类，使用起来更加容易，开发人员无需考虑底层实现细节。可根据生产环境的实际情况选择合适的 ZooKeeper 数据维护方式。

在监控自动化方面，除上述性能监控参数外，Zabbix 还可以监控与业务相关的数据信息。例如在对数据节点的创建数量有严格要求的情况下，可以编写脚本对某一个数据节点下子节点的创建个数进行监控，当该子节点个数大于设定的临界值时，给出报警或禁止该节点再进行创建操作。

## 版本差异(ZooKeeper 3.6 → 3.8/3.9)

| 特性 | 旧版（本文编写时，3.6.x） | 当前（3.8.x/3.9.x） |
|------|---------------------------|---------------------|
| 稳定版本 | 3.6.x | 3.8.x（LTS）/ 3.9.x |
| Java 支持 | JDK 8 | JDK 8/11/17（3.8+） |
| 客户端 | 原生客户端 | 推荐 Curator 5.x（容器节点、持久递归监听） |
| 监控 | JConsole + 四字母命令 | 3.6+ 实验性 Prometheus 指标端点，3.8+ 完善 |
| 核心机制 | ZAB/Watch/ACL/数据模型 | 原理不变，本文内容依然适用 |

> ZooKeeper 的核心协议（ZAB、Watch、ACL、数据模型）自 3.4 以来保持稳定，本文原理性讲解在 3.8/3.9 中依然适用；部署与监控建议按 3.8/3.9 官方文档更新。
