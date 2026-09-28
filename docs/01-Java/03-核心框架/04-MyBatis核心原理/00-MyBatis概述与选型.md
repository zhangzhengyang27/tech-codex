---
title: "MyBatis 概述与框架选型"
description: "MyBatis 的定位与核心特性、与 Hibernate/Spring Data JPA 的选型对比，以及深入学习其原理的价值。"
keywords: ["MyBatis", "ORM", "持久层", "Hibernate", "框架选型"]
category: "Java"
tags: [Java, MyBatis]
---

# MyBatis 概述与框架选型

MyBatis 是一款优秀的 Java 持久层框架，它封装了 JDBC 的样板代码，让你以最小的成本操作数据库，同时保留对 SQL 的完全掌控。它不属于全自动 ORM，而是"半自动"——你写 SQL，它负责参数映射、执行与结果集映射。

## 一、核心特性

- **SQL 与代码解耦**：SQL 写在 XML 或注解中，改动 SQL 无需重新编译 Java 代码。
- **原生 SQL 可控**：直接使用 SQL，便于针对业务做索引、分页、复杂联表等优化。
- **自动映射**：ResultSet 自动映射为 Java 对象（基于列名/ResultMap），减少手工转换。
- **轻量易上手**：仅需 `SqlSessionFactory` 与 Mapper 接口即可工作，学习曲线低于 Hibernate。
- **强扩展性**：插件（Interceptor）、TypeHandler、数据源、日志均可通过 SPI 或配置替换。
- **与 Spring 无缝集成**：`mybatis-spring` 提供 `SqlSessionFactoryBean` 与 Mapper 扫描。

## 二、与其他持久层框架对比

| 维度 | MyBatis | Hibernate / Spring Data JPA |
|------|---------|------------------------------|
| SQL 控制 | 完全手写，可深度优化 | 由框架生成（HQL/JPQL/Criteria） |
| 学习成本 | 低（懂 SQL 即可） | 高（需理解会话、脏检查、缓存、状态） |
| 数据库移植 | 弱（SQL 方言耦合） | 强（屏蔽方言） |
| 复杂查询 | 自然、直观 | 容易写出 N+1 或低效语句 |
| 对象状态管理 | 无（每次查询都是新对象） | 有（持久态/游离态、一级/二级缓存） |
| 适用场景 | 报表、复杂 SQL、性能敏感业务 | 领域模型复杂、CRUD 为主的中后台 |

选型原则：**业务 SQL 复杂、对性能敏感、团队 SQL 能力强 → 选 MyBatis**；**领域模型复杂、以 CRUD 为主、追求开发效率与数据库无关性 → 选 JPA**。二者并非互斥，很多项目混用。

## 三、为什么要深入原理

停留在"会调用 API"层面，遇到以下问题会难以定位：

- 同一个 Mapper 方法在别处正常、此处却 `BindingException`；
- 修改了数据库隔离级别，但事务表现未变（不理解 MyBatis 事务与 `autoCommit` 的交互）；
- 压测时 DAO 层响应慢甚至 OOM（不理解一级缓存、`fetchSize`、批量执行）。

理解初始化、动态 SQL、执行链路（Executor → StatementHandler）、缓存与插件机制，才能做到"知其然，也知其所以然"，并在设计与排障时游刃有余。后续各篇按"基础支撑 → 初始化 → SQL 解析 → 执行 → 缓存与插件 → Spring 集成"的顺序逐层展开。

**相关阅读**：快速上手与三层架构见 [快速上手与整体架构](01-快速上手与整体架构.md)。

## 版本差异(旧版 → MyBatis 3.5.x)

| 特性 | 旧版(MyBatis 3.4.x) | MyBatis 3.5.x |
|------|--------------------|---------------|
| JDK 基线 | Java 8 | Java 8+（17/21 兼容） |
| 与 Spring Boot 集成 | mybatis-spring-boot-starter 2.x | 3.x（Boot 3 兼容，jakarta 支持） |
| 动态 SQL | 基本支持 | 3.5.x 完善（XMLScriptBuilder 增强） |
| 新版特性 | 无 | `argNameBasedConstructorAutoMapping`（3.5.10+，更好支持 record/构造器映射） |
