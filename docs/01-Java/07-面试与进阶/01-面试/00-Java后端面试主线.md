---
title: "Java后端面试主线"
description: "Java后端面试主线的核心概念与实践要点"
keywords: [Java后端面试主线]
category: "Java"
tags: [Java, 面试]
---

# Java 后端面试主线

## 导图概览

1. **Java 核心语法**：面向对象、多线程、集合、IO、异常、反射、泛型、Lambda；
2. **并发与内存**：线程池、锁、CAS、JMM、GC、类加载；
3. **数据库与 ORM**：SQL 调优、事务、锁、JDBC、MyBatis-Plus、连接池、索引；
4. **Spring 一体化**：IoC、AOP、Spring Boot 自动配置、Web、Actuator、测试；
5. **分布式与中间件**：Redis、消息队列、分布式锁、微服务治理、接口设计；
6. **工程与项目**：构建、容器化、CI/CD、日志、监控。

## 复习建议

- 用“核心概念 -> 原理 -> 代码示例 -> 常见误区”的模板梳理每个知识点；
- 把错题写成“触发条件 + 为什么错 + 正确写法”，形成面试口径；
- 每完成一个模块，重新用几条话串成面试回答，保持串联思维。

## 核心能力题型

- 语言：`volatile` vs `synchronized`、`String` 常量池、Lambda 与 Stream；
- 并发：线程池调优、死锁排查、AQS、JMM Happens-Before；
- 数据库：索引设计、慢 SQL 排查、事务隔离、悲观/乐观锁；
- Spring：自动配置启动流程、REST 参数绑定、异常处理、配置属性；
- 架构：分布式锁原理、消息确认机制、Cache Aside、限流与降级策略；
- 工程：构建脚本、Docker 多阶段构建、日志与监控方案。

## 版本差异(面试主线 → 2026)

| 考点 | 旧视角（Java 8/Boot 2.x 时代） | 当前视角（Java 21 + Spring Boot 3.5.x） |
|------|------------------------------|----------------------------------------|
| 语言 | 集合/IO/泛型 | 新增 record、sealed、模式匹配、虚拟线程（JDK 21 必考） |
| 并发 | 线程池/锁 | 新增虚拟线程、StructuredTaskScope、偏向锁移除（JDK 15+） |
| 数据库 | JDBC/MyBatis | MyBatis-Plus 3.5.x、MySQL 8.x（函数索引、EXPLAIN ANALYZE） |
| Spring | Boot 2.x 自动配置 | Boot 3.5.x（jakarta、AutoConfiguration.imports、AOT 原生镜像） |
| 中间件 | Redis 6 / Kafka 依赖 ZK | Redis 7.x、Kafka KRaft（去 ZooKeeper）、RocketMQ 5.x |
| 工程 | Docker 基础 | 容器化 + K8s、可观测性（OpenTelemetry）成为标配 |

> 主线框架（Java → 并发 → 数据库 → Spring → 分布式 → 工程）不变；每类考点需同步刷新到 Java 21 与 Spring Boot 3.5.x 生态的最新口径。
