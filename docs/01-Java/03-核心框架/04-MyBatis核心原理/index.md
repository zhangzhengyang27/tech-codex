---
title: "MyBatis 核心原理"
description: "MyBatis 核心原理专题：从基础支撑模块、初始化与配置解析，到动态 SQL、执行链路、缓存插件与 Spring 集成的源码级剖析。"
keywords: ["MyBatis", "源码", "原理", "持久层", "执行链路"]
category: "Java"
tags: [Java, MyBatis]
---

# MyBatis 核心原理

本专题深入 MyBatis 源码，按"基础支撑 → 初始化 → SQL 解析 → 执行 → 缓存插件 → 集成"的顺序逐层拆解，目标是读懂 MyBatis 的设计思想与运行机理，而非停留在 API 调用层面。

## 学习路径

```text
00 概述与选型
   └─ 01 快速上手与整体架构
         ├─ 02 反射工具箱
         ├─ 03 类型体系与 TypeHandler
         ├─ 04 日志适配、数据源与事务
         ├─ 05 Mapper 代理映射
         ├─ 06 初始化与配置解析
         ├─ 07 动态 SQL 解析
         ├─ 08 结果集映射
         ├─ 09 StatementHandler
         ├─ 10 Executor 与 SqlSession 接口层
         ├─ 11 缓存与插件体系
         ├─ 12 MyBatis 与 Spring 集成及生态
         ├─ 13 架构与执行流程分析
         ├─ 14 MyBatis 源码分析
         └─ 15 缓存机制
```

## 目录

| 篇 | 主题 |
|----|------|
| [00-MyBatis 概述与选型](00-MyBatis概述与选型) | 定位、特性、与 JPA 对比、为何学原理 |
| [01-快速上手与整体架构](01-快速上手与整体架构) | 订单示例、源码环境、三层架构 |
| [02-反射工具箱](02-反射工具箱) | Reflector、MetaObject、ObjectWrapper |
| [03-类型体系与 TypeHandler](03-类型体系与TypeHandler) | 类型转换、别名、JdbcType/JavaType |
| [04-日志适配、数据源与事务](04-日志适配与数据源事务) | 适配器、DataSource、事务 |
| [05-Mapper 代理映射](05-Mapper代理映射) | MapperProxy、MapperMethod |
| [06-初始化与配置解析](06-初始化与配置解析) | 配置/映射文件解析、启动流程 |
| [07-动态 SQL 解析](07-动态SQL解析) | OGNL、SqlNode、SqlSource |
| [08-结果集映射](08-结果集映射) | ResultMap、嵌套映射、延迟加载 |
| [09-StatementHandler](09-StatementHandler) | 参数绑定、SQL 执行、路由 |
| [10-Executor 与 SqlSession 接口层](10-Executor与SqlSession接口层) | Executor 体系、一级缓存、接口层 |
| [11-缓存与插件体系](11-缓存与插件体系) | 一级/二级缓存、Interceptor 责任链 |
| [12-MyBatis 与 Spring 集成及生态](12-MyBatis与Spring集成及生态) | 集成原理、MyBatis-Plus、Generator |
| [13-架构与执行流程分析](13-架构与执行流程分析) | 接口层/数据处理层/框架支撑层/引导层的分层剖析与核心执行流程 |
| [14-MyBatis 源码分析](14-MyBatis源码分析) | 源码级执行链路：从 SqlSession 到 StatementHandler 的完整走读 |
| [15-缓存机制](15-缓存机制) | 一级/二级缓存的使用与命中失效规则、源码实现 |

## 版本差异(MyBatis 源码专题 → 3.5.x)

| 特性 | 旧版（3.4.x/3.5 早期） | 当前（3.5.x 最新） |
|------|------------------------|--------------------|
| JDK 支持 | 8/11 | 17/21（阻塞式 JDBC 可直接运行于虚拟线程） |
| 构造器映射 | 手写 | 3.5.13+ record 自动映射 |
| 模块结构 | 核心模块固定 | 本文剖析的基础支撑/初始化/解析/执行/缓存/插件模块不变 |
| 生态 | MyBatis-Plus 3.4.x | MyBatis-Plus 3.5.12（boot3 starter） |

> 本专题的源码分层（基础支撑 → 初始化 → SQL 解析 → 执行 → 缓存插件 → 集成）不随版本变化，源码分析思路可直接用于 3.5.x。
