---
title: "SpringBoot 整合 mybatis-pagehelper"
description: "MyBatis 分页插件 PageHelper 的 Spring Boot 整合步骤：引入 pagehelper-spring-boot-starter 依赖、yml 配置方言、通过 PageHelper.startPage() 在查询前开启分页（原理是统一拦截 SQL 追加分页语句），以及分页结果封装为 PagedGridResult 返回前端的写法。"
keywords: [SpringBoot, PageHelper, mybatis, 分页]
category: "Java"
tags: [Java, 架构与运维]
---


# SpringBoot 整合 mybatis-pagehelper

> **版本提示**：`pagehelper-spring-boot-starter` 1.x 版本线（最新 1.4.7）仅支持 Spring Boot 1.x/2.x（javax）；**Spring Boot 3.x（jakarta）需使用 2.x 版本线**（2.0.0 起适配，当前最新 2.1.1）。

1.引入分页插件依赖

```xml
<!--pagehelper -->
<dependency>
    <groupId>com.github.pagehelper</groupId>
    <artifactId>pagehelper-spring-boot-starter</artifactId>
    <version>2.1.1</version>
</dependency>
```

2.配置 yml

```yml
# 分页插件配置
pagehelper:
  helperDialect: mysql
  supportMethodsArguments: true
```

3.使用分页插件，在查询前使用分页插件，原理：统一拦截sql，为其提供分页功能

```java
/**
 * page: 第几页
 * pageSize: 每页显示条数
 */
PageHelper.startPage(page, pageSize);
```

4.分页数据封装到`PagedGridResult.java`传给前端

```java
PageInfo<?> pageList = new PageInfo<>(list);
PagedGridResult grid = new PagedGridResult();
grid.setPage(page);
grid.setRows(list);
grid.setTotal(pageList.getPages());
grid.setRecords(pageList.getTotal());
```

## 版本差异(pagehelper → 2.x)

| 特性 | 旧版（1.2.x） | 当前（2.x，如 2.1.1） |
|------|----------------|-------------|
| Spring Boot 兼容 | 仅 Boot 1.x/2.x（javax） | Boot 3.x（jakarta）；Boot 1.x/2.x 项目请继续用 1.x 版本线 |
| JDK 支持 | JDK 8 | JDK 17+（Boot 3 基线） |
| 配置项 | helperDialect/supportMethodsArguments | 配置项保持兼容，新增 autoRuntimeDialect 等增强 |
| 与 MyBatis 版本 | mybatis 3.4.x 时代 | 支持 mybatis 3.5.x |

> 配置项在 yml 中仍使用 `pagehelper` 前缀（kebab-case：`helper-dialect`、`auto-dialect` 亦可）；`PageHelper.startPage(page, pageSize)` 的用法完全不变，注意分页线程安全：`startPage` 后必须紧跟查询语句。