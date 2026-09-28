---
title: 08-Scrapy分布式与生产部署
version: 2.0
author: 文档维护组
created: 2026-06-05
updated: 2026-08-12
status: 正式
category: Python

---

# Scrapy 分布式与生产部署

> 本文档面向具备 Scrapy 单机开发经验的 Python 开发者，系统讲解如何将 Scrapy 爬虫扩展为分布式架构，并完成从开发到生产部署的全流程。阅读本文前，建议先掌握 Scrapy 基础用法。

## 概述

当你的 Scrapy 爬虫在单台机器上运行得不错时，迟早会遇到瓶颈：目标网站数据量太大，单机带宽和 CPU 不够用，爬取速度达不到业务要求。这就是分布式爬虫要解决的问题。

本章从三个层面展开：
- **为什么需要分布式**：理解单机瓶颈的本质，以及分布式如何突破这些限制
- **分布式爬虫原理与实现**：基于 Scrapy-Redis 实现 Master-Worker 分布式爬虫，包括 Bloom Filter 内存优化
- **生产部署方案**：从 Scrapyd 命令行部署，到 Docker 容器化，再到 Gerapy 可视化管理平台

## 一、为什么需要分布式爬虫

### 1.1 单机瓶颈分析

单台主机的爬虫存在以下天然限制：

| 瓶颈类型 | 具体表现 | 影响 |
|---------|---------|------|
| **CPU 瓶颈** | 解析大量页面时 CPU 满载 | 解析速度跟不上下载速度，队列堆积 |
| **带宽瓶颈** | 出口带宽被占满（如 100Mbps） | 下载速率成为整个爬虫的天花板 |
| **IP 封禁** | 单 IP 高频请求触发反爬 | 爬虫被封后整个任务中断 |
| **内存瓶颈** | 去重集合和爬取队列占用内存持续增长 | 长时间运行后 OOM 崩溃 |
| **磁盘 I/O** | 大量数据写入时磁盘成为瓶颈 | 存储速度跟不上采集速度 |

### 1.2 分布式如何解决问题

分布式爬虫的核心思路是**将爬取任务拆分到多台主机上协同执行**，通过共享队列和共享去重集合来协调各节点：

- **N 台主机共享一个爬取队列**：每台主机从同一个 Redis 队列中获取 Request，不会重复调度
- **N 台主机共享一个去重集合**：爬过的 URL 指纹存入 Redis Set，所有节点共享去重结果
- **N 台主机使用不同 IP**：每台主机独立出口 IP，绕开单 IP 频率限制
- **理论上 N 倍效率**：实际受 Redis 队列存取延迟、网络瓶颈、目标网站限速影响，通常为单机的 0.7N ~ 0.9N 倍

### 1.3 什么时候需要分布式

不是所有场景都需要分布式。决策依据：

```mermaid
flowchart TD
    A[当前爬虫是否需要分布式?] --> B{数据量级?}
    B -->|百万级以下| C[单机 Scrapy 即可满足]
    B -->|千万级| D{单机爬取速度是否满足业务?}
    B -->|亿级以上| E[必须使用分布式]
    D -->|是| C
    D -->|否| F{能否接受增加运维成本?}
    F -->|否| G[优化单机策略<br/>异步/并发/缓存]
    F -->|是| H[使用 Scrapy-Redis 分布式]
    E --> H
```

## 二、分布式爬虫架构

### 2.1 Master-Worker 模式

Scrapy-Redis 采用的是**对等架构（Peer-to-Peer）**，而非传统的主从（Master-Slave）架构。每个节点地位平等，自行从 Redis 队列中获取任务，没有中心调度节点。

### 2.2 分布式架构图

```mermaid
flowchart TB
    subgraph 共享基础设施层
        Redis[(Redis<br/>共享队列 + 去重集合)]
        MongoDB[(MongoDB<br/>统一数据存储)]
        ProxyPool[代理池<br/>统一 IP 代理]
    end

    subgraph Worker节点集群
        direction LR
        subgraph Worker_A[Worker 1]
            SA[Scheduler] --> DA[Downloader]
            DA --> PA[Parser]
        end
        subgraph Worker_B[Worker 2]
            SB[Scheduler] --> DB[Downloader]
            DB --> PB[Parser]
        end
        subgraph Worker_C[Worker N]
            SC[Scheduler] --> DC[Downloader]
            DC --> PC[Parser]
        end
    end

    SA <-->|存取 Request| Redis
    SB <-->|存取 Request| Redis
    SC <-->|存取 Request| Redis
    PA -->|存储 Item| MongoDB
    PB -->|存储 Item| MongoDB
    PC -->|存储 Item| MongoDB
    DA -->|获取代理| ProxyPool
    DB -->|获取代理| ProxyPool
    DC -->|获取代理| ProxyPool
```

### 2.3 分布式爬虫需要解决的三个核心问题

**问题一：共享爬取队列**

在 Scrapy 单机架构中，爬取队列使用 Python 的 `deque` 实现，存储在本地内存中。分布式架构下，需要将队列外移到所有节点都能访问的存储中。Redis 是最理想的选择——基于内存、存取微秒级延迟，且支持多种队列结构。

**问题二：共享去重集合**

Scrapy 原生去重使用本地 `set` 集合存储 Request 指纹。分布式架构下，需要将去重集合外移。Redis 的 Set 数据结构天然支持去重，`SADD` 命令的返回值可以直接判断指纹是否已存在。

**问题三：中断恢复**

单机 Scrapy 使用 `JOBDIR` 参数将队列持久化到磁盘。分布式架构天然支持中断恢复——Redis 中的队列和去重集合在爬虫进程退出后依然存在，重启爬虫即可从上次中断处继续。

## 三、Scrapy-Redis 原理与配置

Scrapy-Redis 是 Scrapy 分布式最成熟的方案，它通过替换 Scrapy 的三个核心组件来实现分布式。

### 3.1 核心组件替换

| 组件 | 原生 Scrapy | Scrapy-Redis | 存储位置 |
|------|-----------|-------------|---------|
| 调度器 (Scheduler) | `scrapy.core.scheduler.Scheduler` | `scrapy_redis.scheduler.Scheduler` | - |
| 去重过滤器 (DupeFilter) | `scrapy.dupefilters.RFPDupeFilter` | `scrapy_redis.dupefilter.RFPDupeFilter` | - |
| 爬取队列 (Queue) | 本地 `deque` | Redis List / Sorted Set | Redis |
| 去重集合 | 本地 `set` | Redis Set | Redis |

### 3.2 三种队列实现

Scrapy-Redis 提供了三种队列，对应 Redis 不同数据结构：

```python
# Python 3.10+
# 优先级队列（默认）—— 基于 Redis Sorted Set，支持请求优先级调度
SCHEDULER_QUEUE_CLASS = 'scrapy_redis.queue.PriorityQueue'

# 先进先出队列 —— 基于 Redis List（lpush + rpop），广度优先
SCHEDULER_QUEUE_CLASS = 'scrapy_redis.queue.FifoQueue'

# 后进先出队列 —— 基于 Redis List（lpush + lpop），深度优先
SCHEDULER_QUEUE_CLASS = 'scrapy_redis.queue.LifoQueue'
```

优先级队列的工作原理：Request 的 `priority` 属性（数值越大优先级越高）取反后作为 Redis Sorted Set 的 score。因为 Sorted Set 按 score 从小到大排序，取反后高优先级的 score 最小，自然排在队首。

### 3.3 去重过滤器 RFPDupeFilter

核心逻辑极其简洁：

```python
# Python 3.10+
def request_seen(self, request):
    """判断 Request 是否重复"""
    fp = self.request_fingerprint(request)  # 计算 SHA1 指纹
    added = self.server.sadd(self.key, fp)  # 向 Redis Set 添加指纹
    return added == 0  # added=0 表示已存在（重复），added=1 表示新增
```

指纹计算使用 SHA1 哈希，输入包括 Request 的 Method、URL、Body 和 Headers，任意一个字段不同都会产生不同的指纹。

### 3.4 调度器 Scheduler 数据流

```mermaid
sequenceDiagram
    participant Spider
    participant Engine
    participant Scheduler
    participant DupeFilter
    participant Queue
    participant Redis

    Spider->>Engine: 生成新 Request
    Engine->>Scheduler: enqueue_request(request)
    Scheduler->>DupeFilter: request_seen(request)
    DupeFilter->>Redis: SADD dupefilter_key fingerprint
    Redis-->>DupeFilter: added=0(重复) / added=1(不重复)
    DupeFilter-->>Scheduler: True(重复) / False(不重复)
    alt 不重复
        Scheduler->>Queue: push(request)
        Queue->>Redis: ZADD/LPUSH requests_key
    else 重复
        Scheduler-->>Engine: 丢弃重复请求
    end

    Engine->>Scheduler: next_request()
    Scheduler->>Queue: pop()
    Queue->>Redis: ZRANGE+ZREMRANGEBYRANK / RPOP
    Redis-->>Queue: encoded_request
    Queue-->>Scheduler: Request 对象
    Scheduler-->>Engine: Request
```

### 3.5 完整配置示例

```python
# Python 3.10+
# === settings.py ===
# 核心：替换调度器和去重过滤器
SCHEDULER = "scrapy_redis.scheduler.Scheduler"
DUPEFILTER_CLASS = "scrapy_redis.dupefilter.RFPDupeFilter"

# Redis 连接（推荐使用 URL 方式）
REDIS_URL = 'redis://:your_password@your_redis_host:6379'

# 持久化：爬取结束后不清空队列和去重集合
SCHEDULER_PERSIST = True

# 注意：分布式环境下不要设置 SCHEDULER_FLUSH_ON_START = True
# 否则每台 Worker 启动时都会清空队列，导致数据丢失

# 统一存储目标
MONGO_URI = 'mongodb://user:password@your_mongo_host:27017'
```

::: warning 配置注意事项
- 设置了 `REDIS_URL` 后，Scrapy-Redis 会忽略 `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD` 等分项配置
- `SCHEDULER_FLUSH_ON_START = True` 在分布式环境中是危险的，每台 Worker 启动都会清空队列
- 所有 Worker 的 MongoDB 连接必须指向同一台服务器，否则数据会分散存储
:::

### 3.6 运行分布式爬虫

每台 Worker 主机上执行相同的命令：

```bash
# 确保每台主机的 Python 环境和依赖一致
scrapy crawl your_spider_name
```

启动后，在 Redis 中可以看到两个 key：
- `{spider_name}:requests` —— 爬取队列
- `{spider_name}:dupefilter` —— 去重指纹集合

## 四、Bloom Filter 去重优化

### 4.1 为什么需要 Bloom Filter

Scrapy-Redis 默认使用 Redis Set 存储去重指纹。每个指纹是 40 个十六进制字符（SHA1），占用 20 字节。按此计算：

| 指纹数量 | Redis Set 内存占用 |
|---------|-------------------|
| 100 万 | ~20 MB |
| 1,000 万 | ~200 MB |
| 1 亿 | **~2 GB** |
| 10 亿 | **~20 GB** |

> 注：上表按指纹原始长度（SHA1 十六进制 40 字符）估算，实际还需计入 Redis 元数据与存储开销，真实占用通常高于估算值。

当爬取量达到亿级时，仅去重指纹就占用了大量内存，Redis 可能不堪重负。**Bloom Filter** 用位数组（Bitmap）替代 Set 存储，能将内存占用降低一个数量级。

### 4.2 Bloom Filter 原理

Bloom Filter 使用一个长度为 m 的位数组和 k 个独立的哈希函数。操作分为两步：

**插入元素**：对元素分别计算 k 个哈希值，将位数组中对应位置的值设为 1。

**查询元素**：对元素分别计算 k 个哈希值，检查位数组中对应位置是否全为 1。如果全为 1，则元素**可能存在**（有误判）；如果任意一位为 0，则元素**一定不存在**。

```mermaid
flowchart LR
    subgraph 输入元素
        X[Request 指纹]
    end

    subgraph k个哈希函数
        H1[Hash1<br/>seed=0]
        H2[Hash2<br/>seed=1]
        H3[Hash3<br/>seed=2]
        H4[Hash4<br/>seed=3]
        H5[Hash5<br/>seed=4]
        H6[Hash6<br/>seed=5]
    end

    subgraph 位数组_m位
        B[0 1 0 0 1 0 1 0 1 0 1 0 0 0 0 0 ...]
    end

    X --> H1 --> B
    X --> H2 --> B
    X --> H3 --> B
    X --> H4 --> B
    X --> H5 --> B
    X --> H6 --> B
```

**关键特性**：
- **假阳性（False Positive）**：不存在的元素可能被误判为存在，意味着可能漏爬少量 URL
- **无假阴性（No False Negative）**：存在的元素一定不会被误判为不存在，意味着不会重复爬取
- **不支持删除**：标准 Bloom Filter 无法删除已插入的元素

### 4.3 误判率控制

误判率 p 与三个参数相关：位数组大小 m、元素数量 n、哈希函数个数 k。经验公式：

- 最优哈希函数个数：`k = (m/n) * ln(2)`
- 在给定 m/n 和最优 k 下，误判率约为 `p ≈ 0.6185^(m/n)`

常见配置参考（以误判率 ≤1% 为目标，由 `p ≈ 0.6185^(m/n)` 反推每个元素约需 `m/n ≈ 9.6` 位，此时最优 `k = 9.6 × ln(2) ≈ 7`）：

| BLOOMFILTER_BIT | 位数组大小 | 内存占用 | 最优 k | 误判率 ≤1% 可容纳元素 | 适用量级 |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 28 | 2^28 位 | 32 MB | 7 | 约 2800 万 | 千万级 |
| 30 | 2^30 位 | 128 MB | 7 | 约 1.1 亿 | 1 亿级 |
| 32 | 2^32 位 | 512 MB | 7 | 约 4.5 亿 | 亿级以下 |
| 33 | 2^33 位 | 1 GB | 7 | 约 9 亿 | 接近 10 亿级 |

### 4.4 对接 Scrapy-Redis

安装已封装好的库：

```bash
pip3 install scrapy-redis-bloomfilter
```

替换去重过滤器配置：

```python
# Python 3.10+
# 使用 Bloom Filter 版本的去重过滤器
DUPEFILTER_CLASS = "scrapy_redis_bloomfilter.dupefilter.RFPDupeFilter"

# 位数组大小参数，默认 30（128MB，适合 1 亿级去重）
BLOOMFILTER_BIT = 30

# 哈希函数个数，默认 6
BLOOMFILTER_HASH_NUMBER = 6
```

核心实现逻辑（自定义实现参考）：

```python
# Python 3.10+
class BloomFilter:
    """基于 Redis Bitmap 的布隆过滤器（HashMap 为按 seed 派生哈希值的辅助类，实现从略）"""
    def __init__(self, server, key, bit=30, hash_number=6):
        self.m = 1 << bit  # 位数组大小 = 2^bit
        self.server = server
        self.key = key
        # 用不同 seed 生成 k 个哈希函数
        self.hash_funcs = [HashMap(self.m, seed) for seed in range(hash_number)]

    def exists(self, value):
        """判断元素是否可能存在（True = 可能存在，False = 一定不存在）"""
        if not value:
            return False
        # 对所有哈希位置做 getbit，全部为 1 才返回 True
        return all(
            self.server.getbit(self.key, h.hash(value))
            for h in self.hash_funcs
        )

    def insert(self, value):
        """将元素插入过滤器"""
        for h in self.hash_funcs:
            self.server.setbit(self.key, h.hash(value), 1)
```

::: warning Bloom Filter 使用注意事项
- Bloom Filter 不支持删除，如需重新爬取，手动删除 Redis 中对应的 key 即可
- `BLOOMFILTER_BIT` 参数需要根据预估的爬取总量设置，设置过小会导致误判率过高
- 不同爬虫项目应使用不同的 Redis key 前缀，避免 Bloom Filter 互相干扰
:::

## 五、分布式部署方案

分布式爬虫写好之后，还需要解决部署问题。如果只有 2-3 台服务器，手动上传代码还可以接受；但如果有几十台甚至上百台，就需要自动化部署方案。

### 5.1 部署工具全景

| 工具 | 定位 | 适用规模 | 核心能力 |
|------|------|---------|---------|
| **Scrapyd** | 爬虫运行服务 | 1-10 台 | HTTP API 管理爬虫任务 |
| **Scrapyd-Client** | 命令行部署工具 | 3-10 台 | 一键打包部署到 Scrapyd |
| **Docker** | 容器化运行环境 | 5-50 台 | 环境隔离、一次构建到处运行 |
| **Gerapy** | 可视化管理平台 | 10-50+ 台 | Web 界面管理、批量部署、任务监控 |

### 5.2 方案一：Scrapyd + Scrapyd-Client

**Scrapyd** 是一个运行 Scrapy 爬虫的 HTTP 服务，提供 RESTful API 来管理爬虫任务。

安装与启动：

```bash
pip3 install scrapyd
scrapyd  # 默认监听 0.0.0.0:6800
```

核心 API 端点：

| 端点 | 方法 | 功能 |
|------|------|------|
| `/daemonstatus.json` | GET | 查看服务状态 |
| `/addversion.json` | POST | 部署项目（需上传 Egg 文件） |
| `/schedule.json` | POST | 启动爬虫任务 |
| `/cancel.json` | POST | 取消爬虫任务 |
| `/listprojects.json` | GET | 列出所有项目 |
| `/listjobs.json` | GET | 查看任务状态 |

**Scrapyd-Client** 将手动打包 Egg 和调用 API 两步合并为一条命令。

配置 `scrapy.cfg`：

```ini
[deploy:vm1]
url = http://120.27.34.24:6800/
project = weibo

[deploy:vm2]
url = http://139.217.26.30:6800/
project = weibo
```

部署命令：

```bash
# 部署到指定主机
scrapyd-deploy vm1

# 部署到所有已配置主机
scrapyd-deploy -a
```

::: tip 安全建议
不要将 Scrapyd 的 6800 端口直接暴露在公网。建议使用 Nginx 反向代理并添加 HTTP Basic Auth 认证，将 Scrapyd 绑定到 127.0.0.1。
:::

### 5.3 方案二：Docker 容器化部署

Docker 解决了环境一致性问题——每台主机的 Python 版本、依赖库版本可能不同，而 Docker 镜像包含了完整且一致的运行环境。

Dockerfile 示例：

```dockerfile
FROM python:3.10
ADD . /code
WORKDIR /code
COPY ./scrapyd.conf /etc/scrapyd/
EXPOSE 6800
RUN pip install -r requirements.txt
CMD scrapyd
```

关键配置修改（`scrapyd.conf`）：

```ini
[scrapyd]
bind_address = 0.0.0.0   # 允许外部访问（容器内必须这样设置）
max_proc_per_cpu = 10    # 单核最多运行的爬虫任务数
```

构建与分发：

```bash
# 构建镜像
docker build -t myproject/scrapyd:latest .

# 推送到 Docker Hub
docker tag myproject/scrapyd:latest registry.example.com/myproject/scrapyd:latest
docker push registry.example.com/myproject/scrapyd:latest

# 各主机拉取并运行
docker run -d --restart=always -p 6800:6800 registry.example.com/myproject/scrapyd
```

### 5.4 方案三：批量部署（Fabric / Ansible 概述）

当主机数量达到 20 台以上时，需要在每台主机上安装 Docker 并启动 Scrapyd 容器。手动操作费时且容易出错，可以用 Ansible 实现批量部署。

Ansible 的核心优势：
- **无需 Agent**：通过 SSH 连接目标主机，不需要在目标主机上安装额外软件
- **声明式配置**：Playbook（YAML 格式）描述目标状态，Ansible 自动执行到目标状态
- **幂等性**：多次执行 Playbook 结果一致，不会重复操作

Ansible Playbook 示例：

```yaml
# Python 3.10+ 环境
# scrapyd_deploy.yml
---
- name: 批量部署 Scrapyd Docker 环境
  hosts: scrapyd_servers
  become: yes
  tasks:
    - name: 安装 Docker
      apt:
        name: docker.io
        state: present
        update_cache: yes

    - name: 拉取 Scrapyd 镜像
      docker_image:
        name: registry.example.com/myproject/scrapyd
        source: pull

    - name: 运行 Scrapyd 容器
      docker_container:
        name: scrapyd
        image: registry.example.com/myproject/scrapyd
        ports:
          - "6800:6800"
        restart_policy: always
        state: started

    - name: 验证 Scrapyd 服务
      uri:
        url: "http://{{ inventory_hostname }}:6800/daemonstatus.json"
        return_content: yes
```

Inventory 主机清单：

```ini
[scrapyd_servers]
120.27.34.24  ansible_user=root
139.217.26.30 ansible_user=root
120.27.34.26  ansible_user=root
```

执行：

```bash
ansible-playbook -i hosts scrapyd_deploy.yml
```

### 5.5 方案四：Gerapy 可视化管理平台

Gerapy 是基于 Django + Vue.js 的分布式爬虫管理框架，将 Scrapyd 的命令行操作全部转化为 Web 界面操作。

**Gerapy 架构**：

```mermaid
flowchart TB
    subgraph Gerapy管理端
        UI[Vue.js Web界面<br/>:8000]
        Django[Django 后端<br/>REST API]
        SQLite[(SQLite<br/>配置存储)]
        Projects[projects目录<br/>Scrapy项目源码]
    end

    subgraph Scrapyd集群
        S1[主机1 Scrapyd :6800]
        S2[主机2 Scrapyd :6800]
        S3[主机N Scrapyd :6800]
    end

    UI --> Django
    Django --> SQLite
    Django --> Projects
    Django -->|HTTP API 调用| S1
    Django -->|HTTP API 调用| S2
    Django -->|HTTP API 调用| S3
```

快速上手：

```bash
pip3 install gerapy
gerapy init          # 初始化项目目录
gerapy migrate       # 初始化 SQLite 数据库
gerapy runserver     # 启动 Web 服务（默认 :8000）
```

Gerapy 提供以下核心功能：
- **主机管理**：添加多台 Scrapyd 主机，实时监控各主机状态
- **项目管理**：将 Scrapy 项目放入 `gerapy/projects/` 目录，在线编辑代码
- **一键打包部署**：选择目标主机，点击按钮即可批量部署
- **任务调度**：Web 界面启动/停止爬虫任务，实时查看日志
- **定时任务**：配置定时规则，自动调度爬虫运行

## 六、从开发到部署的完整流水线

```mermaid
flowchart TD
    subgraph 开发阶段
        A[编写 Scrapy 爬虫] --> B[单机测试通过]
        B --> C[配置 Scrapy-Redis<br/>settings.py]
        C --> D{去重方案?}
        D -->|千万级以下| E[默认 Redis Set]
        D -->|亿级以上| F[Bloom Filter]
        E --> G[配置统一存储<br/>远程 MongoDB]
        F --> G
    end

    subgraph 构建阶段
        G --> H[编写 Dockerfile]
        H --> I[docker build]
        I --> J[docker push 到 Registry]
    end

    subgraph 部署阶段
        J --> K{部署方式?}
        K -->|少量主机| L[手动 docker run]
        K -->|中等规模| M[Scrapyd-Client<br/>配置文件部署]
        K -->|大规模| N[Ansible 批量部署]
    end

    subgraph 运行阶段
        L --> O[各 Worker 执行<br/>scrapy crawl spider]
        M --> P[scrapyd-deploy +<br/>schedule API]
        N --> Q[Ansible 启动容器]
        O --> R[监控与运维]
        P --> R
        Q --> R
    end

    subgraph 运维阶段
        R --> S[Gerapy 可视化管理]
        S --> T[监控: 队列长度/任务状态/异常告警]
        T --> U{需要更新代码?}
        U -->|是| H
        U -->|否| T
    end
```

## 七、监控与告警

分布式爬虫上线后，不能放任不管。需要建立监控体系来确保爬虫健康运行。

### 7.1 监控指标

| 监控维度 | 具体指标 | 获取方式 | 告警阈值建议 |
|---------|---------|---------|------------|
| **Redis 队列健康** | 队列长度、去重集合大小 | `redis-cli LLEN/ZCARD` | 队列为空且持续超过 5 分钟 |
| **爬虫存活状态** | 各 Worker 心跳 | Scrapyd `/daemonstatus.json` | 某 Worker 超过 2 分钟未响应 |
| **数据产出量** | 每分钟入库 Item 数量 | MongoDB 计数 | 产出量下降超过 50% |
| **错误率** | 下载失败、解析异常 | Scrapy Stats 统计 | 错误率超过 10% |
| **Redis 内存** | Redis 内存使用率 | `redis-cli INFO memory` | 超过 80% |
| **目标网站状态** | 响应状态码分布 | Scrapy Stats | 403/429 比例突然上升 |

### 7.2 健康检查脚本

```python
# Python 3.10+
import redis
import requests
from datetime import datetime, timedelta

def check_workers_health(scrapyd_urls: list[str], redis_url: str) -> dict:
    """
    检查所有 Worker 和 Redis 的健康状态
    :return: 健康报告字典
    """
    report = {"timestamp": datetime.now().isoformat(), "workers": {}, "redis": {}}

    # 检查各 Worker
    for url in scrapyd_urls:
        try:
            resp = requests.get(f"{url}/daemonstatus.json", timeout=5)
            data = resp.json()
            report["workers"][url] = {
                "status": "ok" if data.get("status") == "ok" else "error",
                "running": data.get("running", 0),
                "pending": data.get("pending", 0),
                "finished": data.get("finished", 0),
            }
        except Exception as e:
            report["workers"][url] = {"status": "unreachable", "error": str(e)}

    # 检查 Redis
    r = redis.from_url(redis_url)
    info = r.info("memory")
    report["redis"] = {
        "used_memory_human": info.get("used_memory_human"),
        "connected_clients": info.get("connected_clients"),
        "uptime_in_days": info.get("uptime_in_days"),
    }

    return report
```

### 7.3 告警通知

建议通过以下方式发送告警：
- **企业微信/钉钉 Webhook**：异常时推送消息到工作群
- **邮件通知**：每日汇总报告
- **Prometheus + Grafana**：搭建可视化监控面板（适合大规模集群）

## 八、常见陷阱

| 陷阱 | 表现 | 原因 | 解决方案 |
|------|------|------|---------|
| Redis 连接泄漏 | Worker 运行一段时间后无法连接 Redis | 连接池耗尽，未正确释放 | 配置 `CONCURRENT_REQUESTS` 限制并发，使用 Redis Sentinel 做高可用 |
| 去重丢失 | 重启后爬虫重新爬取已爬过的页面 | `SCHEDULER_PERSIST = False`（默认值） | 设置 `SCHEDULER_PERSIST = True` |
| Worker 负载不均 | 部分 Worker 空闲，部分 Worker 繁忙 | 网络延迟差异、目标网站对不同 IP 的响应速度不同 | 属于正常现象，增加 Worker 数量即可。也可通过监控动态调整 |
| Redis 单点故障 | Redis 宕机导致所有 Worker 停止 | Redis 未配置高可用 | 使用 Redis Sentinel 或 Redis Cluster |
| Redis 内存溢出 | 长时间运行后 Redis 内存用满 | 去重集合无限增长 | 使用 Bloom Filter 替代 Set；估算总数据量，提前规划内存 |
| 数据存储分散 | 各 Worker 数据存在本地 MongoDB | 忘记修改 MongoDB 连接为远程地址 | 所有 Worker 统一指向远程 MongoDB |
| 版本不一致 | 各 Worker 运行不同版本的爬虫代码 | 逐台手动部署导致遗漏 | 使用 Docker 镜像确保版本一致，或使用 Gerapy 批量部署 |
| 目标网站被封 | 所有 Worker 同时返回 403 | 多台 Worker 共用少量 IP 导致封禁 | 每台 Worker 使用独立代理 IP，或配置代理池轮换 |
| Python 版本不兼容 | Worker 启动失败或运行异常 | 各主机 Python 版本不一致，pickle 序列化不兼容 | 统一使用 Docker 镜像，或在 requirements.txt 中锁定 Python 版本 |
| 时钟不同步 | 调度异常、日志时间戳混乱 | 多机系统时间不一致 | 配置 NTP 时间同步服务 |

## 九、最佳实践

1. **渐进式演进**：先单机跑通，再接入 Scrapy-Redis 做分布式，最后引入 Docker 和 Gerapy 做运维管理。不要一步到位。
2. **Redis 高可用**：生产环境务必配置 Redis Sentinel 或 Cluster，避免单点故障。Redis 是整个分布式爬虫的"心脏"。
3. **合理设置并发**：分布式爬虫的多机并发效果叠加，务必控制每台 Worker 的 `CONCURRENT_REQUESTS` 和 `DOWNLOAD_DELAY`，避免对目标网站造成过大压力。
4. **使用 Docker 保证环境一致**：哪怕只有 3 台 Worker，也建议使用 Docker。它能消除"我这台机器能跑，你那台不行"的问题。
5. **监控先行**：上线前就搭建好监控和告警。至少监控 Redis 队列长度和 Worker 存活状态，异常时第一时间收到通知。
6. **数据量预估**：开始爬取前估算总数据量，根据量级选择去重方案（Redis Set vs Bloom Filter），提前规划 Redis 内存。
7. **统一存储目标**：所有 Worker 的数据写入同一个远程数据库（MongoDB/MySQL），方便统一查询和分析。
8. **日志集中管理**：使用 ELK（Elasticsearch + Logstash + Kibana）或 Loki 将各 Worker 的日志集中收集，便于排查问题。

## 术语表

| 术语 | 英文 | 释义 |
|------|------|------|
| 分布式爬虫 | Distributed Crawler | 多台主机协同执行爬取任务的爬虫架构 |
| 共享爬取队列 | Shared Crawl Queue | 多节点共同访问的 Request 队列，通常由 Redis 维护 |
| 去重指纹 | Fingerprint | Request 的 SHA1 散列值，用于判断请求是否重复 |
| Scrapy-Redis | Scrapy-Redis | 基于 Redis 实现的 Scrapy 分布式组件库 |
| 布隆过滤器 | Bloom Filter | 基于位数组的概率型数据结构，用于节省内存的去重 |
| 假阳性 | False Positive | 不存在的元素被误判为存在（Bloom Filter 的固有特性） |
| 误判率 | False Positive Rate | Bloom Filter 假阳性出现的概率，由 m/n 比值和 k 值决定 |
| 调度器 | Scheduler | 负责从队列中存取 Request 的组件 |
| 去重过滤器 | DupeFilter | 负责判断 Request 是否重复的组件 |
| 优先级队列 | Priority Queue | 按 Request 优先级排序的队列，基于 Redis Sorted Set |
| Scrapyd | Scrapyd | Scrapy 爬虫的部署和运行 HTTP 服务 |
| Scrapyd-Client | Scrapyd-Client | Scrapy 项目的一键打包部署命令行工具 |
| Egg | Egg | Python 项目的打包格式，Scrapyd 的部署单元 |
| Docker | Docker | 容器化平台，用于环境隔离和一致性部署 |
| Dockerfile | Dockerfile | Docker 镜像的构建脚本 |
| Gerapy | Gerapy | 基于 Django + Vue.js 的分布式爬虫可视化管理平台 |
| Ansible | Ansible | 基于 SSH 的自动化运维工具，用于批量部署 |
| Sentinel | Redis Sentinel | Redis 官方高可用方案，提供监控、通知和自动故障转移 |
| SCHEDULER_PERSIST | Scheduler Persist | 爬取结束后是否保持队列不清除的配置项 |
| NTP | Network Time Protocol | 网络时间协议，用于同步多台主机的时间 |

## 延伸阅读

### 站内链接

- Scrapy 基础 —— Scrapy 框架入门与进阶
- 数据存储 —— MongoDB、MySQL 等存储方案
- 异步爬虫 —— 异步爬虫方案对比

### 外部链接

- [Scrapy-Redis GitHub](https://github.com/rmax/scrapy-redis)
- [Scrapy-Redis-BloomFilter PyPI](https://pypi.org/project/scrapy-redis-bloomfilter/)
- [Scrapyd 官方文档](https://scrapyd.readthedocs.io/)
- [Scrapyd-Client 文档](https://scrapyd-client.readthedocs.io/)
- [Gerapy GitHub](https://github.com/Gerapy)
- [Docker 官方文档](https://docs.docker.com/)
- [Ansible 官方文档](https://docs.ansible.com/)
- [Redis 持久化文档](https://redis.io/topics/persistence)
- [Bloom Filter 维基百科](https://en.wikipedia.org/wiki/Bloom_filter)

## 版本差异（爬虫技术栈 → 当前版本）

| 库 | 本文编写时 | 当前稳定版 |
|----|-----------|-----------|
| `requests` | 2.28/2.31 | 2.32.x |
| `Scrapy` | 1.x/2.0 | 2.13.x（API 稳定，截至 2026-09） |
| `httpx` | 0.24 | 0.28.x |
| `Playwright` | 1.3x | 1.6x（Python 版） |
| `lxml`/`BeautifulSoup` | 旧版 | 保持稳定 |
| Python | 3.8-3.12 | 3.14（推荐） |

> 本文讲解的爬虫原理（HTTP、解析、反爬、存储）与核心 API 在最新版本中成立；注意 Python 3.9 及以下已 EOL，新项目使用 3.13/3.14。
