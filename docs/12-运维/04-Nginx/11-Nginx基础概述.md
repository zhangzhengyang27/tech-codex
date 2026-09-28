---
title: "11-Nginx基础概述"
description: "Nginx 核心特性与典型配置：事件驱动/异步非阻塞模型、静态文件服务、反向代理、upstream 负载均衡（权重/最少连接/IP 哈希/backup）、SSL/TLS 终端与 HTTP/2，以及典型应用场景与版本演进（HTTP/3、动态模块、官方源与容器部署）。"
keywords: [Nginx, 反向代理, 负载均衡, upstream, TLS]
category: Nginx
tags: [Java, 架构与运维]
---

# 11-Nginx基础概述

## Nginx

Nginx 是一款**开源、高性能、事件驱动的异步非阻塞架构**的 Web 服务器。它不仅是 Web 服务器，更是功能强大的**反向代理服务器、负载均衡器、HTTP 缓存服务器**，以及邮件代理服务器

| 特性                | 说明                                         | 优势                       |
| ------------------- | -------------------------------------------- | -------------------------- |
| **事件驱动模型**    | 基于 epoll（Linux）、kqueue（BSD）等系统调用 | 单个进程可处理上万并发连接 |
| **异步非阻塞I/O**   | 处理请求时不等待I/O完成                      | 高并发下CPU利用率高        |
| **主-工作进程模型** | 1个主进程 + N个工作进程                      | 热升级、高可用             |
| **内存池管理**      | 预分配内存，减少系统调用                     | 性能稳定，内存碎片少       |

### 核心功能

#### HTTP/HTTPS 服务器

```
# 静态文件服务示例
location /static/ {
    root /var/www;
    expires 30d;  # 缓存30天
    access_log off;  # 关闭日志提升性能
}
```

#### 反向代理

```
# 代理到后端应用
location /api/ {
    proxy_pass http://backend_server;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

#### 负载均衡

```
upstream backend {
    # 多种负载均衡算法
    least_conn;  # 最少连接数
    # ip_hash;   # IP哈希
    # hash $request_uri;  # 一致性哈希
    
    server 192.168.1.100:8000 weight=3;  # 权重3
    server 192.168.1.101:8001;
    server 192.168.1.102:8002 backup;   # 备份服务器
}
```

#### SSL/TLS 终端

```
server {
    listen 443 ssl http2;  # 支持HTTP/2
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
}
```

### 性能数据对比

- **静态文件**：单机可支持 5万+ QPS

- **反向代理**：单机可支持 2-3万 QPS

- **内存占用**：1万个空闲连接 ≈ 2.5MB

- **CPU使用**：同等并发下通常比Apache低50%

> 以上为经验量级示意（其中"1万空闲连接 ≈ 2.5MB"来自官方基准场景），实际数值因硬件、内核参数与业务特征而异。

### 典型应用场景

```
1. 静态内容加速
2. API网关/微服务入口
3. 前后端分离架构
4. 流媒体服务器（RTMP/HLS）
5. WebSocket代理
6. 安全防护（限流、WAF前置）
```

## 版本差异(Nginx → 1.28 稳定版)

| 特性 | 旧版（1.1x） | 当前（稳定版 1.28.x，主线 1.29.x） |
|------|--------------|------------------------------------------|
| 性能 | HTTP/2 支持 | 新增 HTTP/3（QUIC）支持（1.25+） |
| TLS | 1.2/1.3 基础 | TLS 1.3 默认优化，主线引入 ACME 自动证书（1.29+，实验特性） |
| 模块 | 静态编译 | 动态模块加载（load_module）成为主流 |
| 运维 | 手动编译安装 | 官方 yum/apt 源 + docker 镜像（11-Nginx基础概述:alpine） |

> 反向代理、负载均衡（upstream）、静态资源、gzip、rewrite 等核心配置语法在 1.2x 中完全兼容，本文示例可直接复用。
