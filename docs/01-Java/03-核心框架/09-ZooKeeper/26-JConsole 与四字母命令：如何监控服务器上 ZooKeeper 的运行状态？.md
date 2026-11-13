---
title: "监控与日志清理：JConsole、四字母命令与 PurgeTxnLog"
description: "让 ZooKeeper 服务持续稳定地对外提供服务，离不开两件运维工作：监控运行状态（JConsole 远程监控、stat/srvr/cons/ruok 四字母命令、Zabbix 自动化监控）与日志维护（crontab 定时脚本与 PurgeTxnLog 工具清理）。"
keywords: [JConsole, 四字母命令, 监控, crontab, PurgeTxnLog]
category: "Java"
tags: [Java, ZooKeeper]
---

# 监控与日志清理：JConsole、四字母命令与 PurgeTxnLog

在前文中我们学习了在生产环境中，如何部署 ZooKeeper 集群服务。为了我们的程序服务能够持续稳定地对外提供服务，除了在部署的时候尽量采用分布式、集群服务等方式提高 ZooKeeper 服务的可靠性外，在服务上线运行的时候，我们还可以通过对 ZooKeeper 服务的运行状态进行监控，如运行 ZooKeeper 服务的生产服务器的 CPU、内存、磁盘等使用情况来达到目的。在系统性能达到瓶颈的时候，可以增加服务器资源，以保证服务的稳定性。

除了监控之外，几乎所有的生产系统都会产生日志文件，用来记录服务的运行状态，在服务发生异常的时候，可以用来作为分析问题原因的依据。ZooKeeper 作为分布式系统下的重要组件，在分布式网络中会处理大量的客户端请求，因此也会产生大量的日志文件，对这些日志的维护关系到整个 ZooKeeper 服务的运行质量。本文就围绕这两件运维工作展开：监控运行状态与日志清理。

## JConsole 介绍

通常使用 Java 语言进行开发的技术人员对 JConsole 并不陌生。JConsole 是 JDK 自带的工具，用来监控程序运行的状态信息。如下图所示，我们打开系统的控制终端，输入 JConsole 就会弹出一个这样的监控界面。

![](/zookeeper-images/26-JConole_与四字母命令_如何监控服务器上_ZooKeeper_的运行状态___CgqCHl8kAy2ANt38AADolBOTa2s256.png)

## JConsole 使用

介绍完 JConsole 的基本信息后，接下来我们来了解如何利用 JConsole 对远程 ZooKeeper 集群服务进行监控。之所以能够通过 JConsole 连接 ZooKeeper 服务进行监控，是因为 ZooKeeper 支持 JMX（Java Management Extensions），即 Java 管理扩展，它是一个为应用程序、设备、系统等植入管理功能的框架。

JMX 可以跨越一系列异构操作系统平台、系统体系结构和网络传输协议，灵活地开发无缝集成的系统、网络和服务管理应用。我们可以通过 JMX 来访问和管理 ZooKeeper 服务集群。接下来我们就来介绍一下监控 ZooKeeper 集群服务的相关配置操作。

在 JConsole 配置信息中，连接我们要进行监控的 ZooKeeper 集群服务器。如下面的流程所示，在配置文件中输入 ZooKeeper 服务器的地址端口等相关信息。

### 开启 JMX

首先，我们先开启 ZooKeeper 的 JMX 功能。在 ZooKeeper 安装目录下找到 bin 文件夹，在 bin 文件夹中，通过 vim 命令来编辑 zkServer.sh 文件。如下代码所示，输入 JMX 服务的端口号并禁止身份认证等配置。

```properties
-Dcom.sun.management.jmxremote.port=50000
-Dcom.sun.management.jmxremote.ssl=false
-Dcom.sun.management.jmxremote.authenticate=false

```

### 连接 ZooKeeper

配置完 JMX 的开启功能后，接下来我们通过系统终端启动 JConsole，再在弹出的对话框中选择远程连接，然后在远程连接的地址中输入要监控的 ZooKeeper 服务器地址，之后就可以通过 JConsole 监控 ZooKeeper 服务器了。

![](/zookeeper-images/26-JConole_与四字母命令_如何监控服务器上_ZooKeeper_的运行状态___Ciqc1F8kA0CAF9c9AACQw_N29Fg373.png)

## 四字母命令

除了上面介绍的 JConsole 监控控制台之外，ZooKeeper 还提供了一些命令，可使我们更加灵活地统计监控 ZooKeeper 服务的状态信息。ZooKeeper 提供的这些命令也叫作四字母命令，如它们的名字一样，每一个命令都是由四个字母组成的。如下代码所示，在操作时，我们会打开系统的控制台，并输入相关的命令来查询 ZooKeeper 服务，比如我们可以输入 stat 命令来查看数据节点等信息。

```bash
echo {command} | nc 127.0.0.1 2181

```

介绍完四字母命令的调用方式和执行格式后，接下来我们介绍几种常见的四字母命令，分别是 stat、srvr，以及 cons 等。

### stat

stat 命令的作用是监控 ZooKeeper 服务器的状态，我们通过 stat 命令统计 ZooKeeper 服务器的 ZooKeeper 版本信息、集群节点数等信息，如下面的代码所示，我们在操作时会输入 echo stat 命令来输出查询到的服务状态信息到控制台。

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

### srvr

srvr 命令与 stat 命令的功能十分相似，唯一不同的地方是 srvr 命令不会将与客户端的连接情况输出，通过 srvr 命令只会查询服务器的自身信息。

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

### cons

cons 命令用于输出当前这台服务器上所有客户端连接的详细信息，包括每个客户端的客户端 IP 、会话 ID 和最后一次与服务器交互的操作类型等。

```bash
$ echo cons | nc localhost 2181
 /0:0:0:0:0:0:0:1:31569[0](queued=0,recved=1,sent=0)

```

### ruok

ruok 命令的主要作用是查询 ZooKeeper 服务器是否正常运行。如果 ZooKeeper 服务器正常运行，执行完 ruok 命令后，会得到 "imok" 返回值。如果 ZooKeeper 服务没有正常运行，则不会有任何返回值。在使用 ruok 命令的时候，在这里我们要注意的一点是，有些时候即使返回了 "imok" 字段，ZooKeeper 服务也可能没有正常运行，唯一能确定的是该台服务器的 2181 端口是打开的，如下代码所示。

```bash
$ echo ruok | nc localhost 2181
imok

```

## 自动化监控集群信息

介绍完系统监控工具 JConsole 以及常用的命令后，接下来我们就从实际的生产角度出发，来看一下在 ZooKeeper 集群生产环境中如何监控系统集群运行情况，以及如何利用我们监控的数据诊断 ZooKeeper 服务的运行问题并解决问题。

虽然 ZooKeeper 服务提供了丰富的四字母命令，让我们可以通过命令来获得 ZooKeeper 服务相关的运行信息，但是在实际的生产环境中，ZooKeeper 集群的规模可能很大，逐一通过命令的方式监控 ZooKeeper 服务显然不可行。因此，这里我们会介绍一种自动的监控 ZooKeeper 集群运行服务的方式。

为了编写自动化监控 ZooKeeper 集群服务，首先我们要明确需要监控哪些数据类型，在这里我们主要对最小会话超时、最大会话超时、最大连接数、发送的数据包、接收的数据包进行监控，而具体的我们则会通过 Zabbix 来实现。

### Zabbix

Zabbix 是一个性能监控的管理工具，它基于 Web 界面提供分布式系统监视，以及网络监视功能的企业级开源解决方案。

### 安装

我们可以通过 Maven 或 Gradle 项目管理工具下载 Zabbix，这里我们主要以 Maven 工程为例，如下代码所示，需要在 pom 文件中引入相关的配置信息。

```xml
<dependency>
    <groupId>io.github.cgi</groupId>
    <artifactId>zabbix-api</artifactId>
    <version>0.0.5</version>
</dependency>

```

### 配置项

将 Zabbix 引入到我们的工程项目后，接下来，就可以编写一个程序来自动化地获取 ZooKeeper 服务的相关信息。这里我们创建一个 ZooKeeperInfo 脚本，如下代码所示，在脚本文件中我们创建了一个 mntr 数组变量用来设置我们想要监控的服务参数，比如 minSessionTimeout 最小超时时间、maxSessionTimeout 最大超时时间等。

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

完成了监控的部分，接下来我们学习对线上 ZooKeeper 服务器日志进行维护的操作，主要维护方式是备份和清理。

首先介绍线上生产环境中的 ZooKeeper 集群在对外提供服务的过程中，都会产生哪些日志类型。在前文中我们介绍过了，在 ZooKeeper 服务运行的时候，一般会产生数据快照和日志文件，数据快照用于集群服务中的数据同步，而数据日志则记录了 ZooKeeper 服务运行的相关状态信息。其中，数据日志是我们在生产环境中需要定期维护和管理的文件。

如上面所介绍的，面对生产系统中产生的日志，一般的维护操作是备份和清理。备份是为了之后对系统的运行情况进行排查和优化，而清理主要因为随着系统日志的增加，日志会逐渐占用系统的存储空间，如果一直不进行清理，可能耗尽系统的磁盘存储空间，并最终影响服务的运行。但在实际工作中，我们不能 24 小时监控系统日志情况，因此这里我们介绍一种定时任务，可以自动清理和备份 ZooKeeper 服务运行产生的相关日志。

## 清理工具

### crontab

首先，我们介绍的是 Linux crontab，它是 Linux 系统下的软件，可以自动地按照我们设定的时间，周期性地执行我们编写的相关脚本。下面我们就用它来写一个定时任务，实现每周定期清理 ZooKeeper 服务日志。

### 创建脚本

我们通过 Linux 系统下的 Vim 文本编辑器，来创建一个叫作 " logsCleanWeek " 的定时脚本，该脚本是一个 shell 格式的可执行文件。如下面的代码所示，我们在 usr/bin/ 文件夹下创建该文件，该脚本的主要内容是设定 ZooKeeper 快照和数据日志的对应文件夹路径，并通过 shell 脚本、管道和 find 命令查询对应的日志下的日志文件，这里我们保留最新的 10 条数据日志，其余的全部清理。

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

### 创建定时任务

创建完定时脚本后，我们接下来就利用 crontab 来设置脚本的启动时间，如下面的代码所示。crontab 命令的语法比较简单，其中 -u 表示设定指定的用户，因为 Linux 系统是一个多用户操作系统，而 crontab 的本质就是根据使用系统的用户来设定程序执行的时间计划表。因此当命令的执行者具有管理员 root 账号的权限时，可以通过 -u 为特定用户设定某一个程序的具体执行时间。

```bash
crontab [ -u user ] { -l | -r | -e }

```

接下来我们打开系统的控制台，并输入 crontab -e 命令，开启定时任务的编辑功能。如下图所示，系统会显示出当前已有的定时任务列表。整个 crontab 界面的操作逻辑和 Vim 相同，为了新建一个定时任务，我们首先将光标移动到文件的最后一行，并敲击 i 键来开启编辑模式。

![](/zookeeper-images/27-crontab_与_PurgeTxnLog_线上系统日志清理的最佳时间和方式__CgqCHl8qlt2ALC7CAABlifm7LHs902.png)

这个 crontab 定时脚本由两部分组成，第一部分是定时时间，第二部分是要执行的脚本。如下代码所示，脚本的执行时间是按照 f1 分、 f2 小时、f3 日、f4 月、f5 一个星期中的第几天这种固定顺序格式编写的。

```bash
f1 f2 f3 f4 f5 program

```

当对应的时间位上为 * 时，表示每间隔一段时间都要执行。例如，当 f1 分上设定的是 * 时，表示每分钟都要执行对应的脚本。而如果我们想在每天的特定时间执行对应的脚本，则可以通过在对应的时间位置设定一个时间段实现，以下代码所演示的就是将脚本清理时间设定为每天早上的 6 点到 8 点。

```bash
0 6-8 * * * /usr/bin/logsCleanWeek.sh>/dev/null 2>&1

```

### 查看定时任务

当我们设定完定时任务后，就可以打开控制台，并输入 crontab -l 命令查询系统当前的定时任务。

![](/zookeeper-images/27-crontab_与_PurgeTxnLog_线上系统日志清理的最佳时间和方式__CgqCHl8qlu-AW-xZAAA50ErYH4s391.png)

到目前为止我们就完成了用 crontab 创建定时任务来自动清理和维护 ZooKeeper 服务产生的相关日志和数据的过程。

crontab 定时脚本的方式相对灵活，可以按照我们的业务需求来设置处理日志的维护方式，比如这里我们希望定期清除 ZooKeeper 服务运行的日志，而不想清除数据快照的文件，则可以通过脚本设置，达到只对数据日志文件进行清理的目的。

### PurgeTxnLog

除了上面所介绍的，通过编写 crontab 脚本定时清理 ZooKeeper 服务的相关日志外，ZooKeeper 自身还提供了 PurgeTxnLog 工具类，用来清理 snapshot 数据快照文件和系统日志。

PurgeTxnLog 清理方式和我们上面介绍的方式十分相似，也是通过定时脚本执行任务，唯一的不同是，上面提到在编写日志清除 logsCleanWeek 的时候，我们使用的是原生 shell 脚本自己手动编写的数据日志清理逻辑，而使用 PurgeTxnLog 则可以在编写清除脚本的时候调用 ZooKeeper 为我们提供的工具类完成日志清理工作。

如下面的代码所示，首先，我们在 /usr/bin 目录下创建一个 PurgeLogsClean 脚本。注意这里的脚本也是一个 shell 文件。在脚本中我们只需要编写 PurgeTxnLog 类的调用程序，系统就会自动通过 PurgeTxnLog 工具类为我们完成对应日志文件的清理工作。

```bash
#!/bin/sh
java -cp "$CLASSPATH" org.apache.zookeeper.server.PurgeTxnLog /home/zk/zk_data/version-2 /home/zk/zk_log/version-2 -n 10
echo "清理完成"

```

PurgeTxnLog 方式与 crontab 相比，使用起来更加容易而且也更加稳定安全，不过 crontab 方式更加灵活，我们可以根据不同的业务需求编写自己的清理逻辑。

## 总结

本文我们主要学习了 ZooKeeper 集群在日常生产环境中的两件运维工作：

- **监控运行状态**：首先介绍了 ZooKeeper 集群通过 JMX 方式进行远程监控的方法，然后学习了 JConsole 以及 stat、srvr、cons、ruok 等四字母命令的使用方式，最后介绍了在实际工作中，面对大规模的 ZooKeeper 集群时，我们如何利用 Zabbix 做到自动化的获取监控数据。

- **日志清理**：线上 ZooKeeper 服务日志和数据快照的清理和维护工作，可以通过 crontab 和 PurgeTxnLog 两种方式实现。这两种方式唯一的不同在清理日志脚本的实现方式上，crontab 是通过我们自己手动编写的 shell 脚本实现的，在执行上需要考虑脚本权限相关的问题，而 PurgeTxnLog 则是 ZooKeeper 提供的专门用来处理日志清除相关的工具类，使用起来更加容易，开发人员不用考虑底层的实现细节。这里希望你结合自身工作中的生产环境来选择一种适合自己的 ZooKeeper 数据维护方式。

在监控自动化方面，除了本文中提到的一些性能监控参数外，我们也可以利用 Zabbix 监控一些和自身业务相关的数据信息，比如在对数据节点的创建数量有严格要求的情况下，我们可以编写相关的脚本对某一个数据节点下子节点的创建个数进行监控，当该子节点个数大于我们设置的某一个临界值时，会给出报警或禁止该节点再进行创建操作。

## 版本差异(ZooKeeper 3.6 → 3.8/3.9)

| 特性 | 旧版（本文编写时，3.6.x） | 当前（3.8.x/3.9.x） |
|------|---------------------------|---------------------|
| 稳定版本 | 3.6.x | 3.8.x（LTS）/ 3.9.x |
| Java 支持 | JDK 8 | JDK 8/11/17（3.8+） |
| 客户端 | 原生客户端 | 推荐 Curator 5.x（容器节点、持久递归监听） |
| 监控 | JConsole + 四字母命令 | 3.6+ 实验性 Prometheus 指标端点，3.8+ 完善 |
| 核心机制 | ZAB/Watch/ACL/数据模型 | 原理不变，本文内容依然适用 |

> ZooKeeper 的核心协议（ZAB、Watch、ACL、数据模型）自 3.4 以来保持稳定，本文原理性讲解在 3.8/3.9 中依然适用；部署与监控建议按 3.8/3.9 官方文档更新。
