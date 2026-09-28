---
title: MVC 架构发展
description: MVC 架构演进史：JSP 与 Servlet 的协作、从 JSP Model 1 到 Model 2 的解耦、与实现技术无关的一般化 MVC（两种典型交互）以及 MVP/MVVM 变体
keywords: [MVC, JSP, Servlet, 架构演进, MVP, MVVM]
category: 全栈工程
tags: [Java, MVC]
---
# MVC 架构发展

## 0. 引言

MVC 经典架构模式早在 20 世纪 70 年代就被发明出来，直到现在互联网上的大多数网站仍遵从 MVC 实现，生命力之旺盛可见一斑。本文从 JSP 与 Servlet 讲起，梳理 MVC 从 JSP Model 1、Model 2 到一般化 MVC，再到 MVP、MVVM 变体的演进脉络。

## 1. JSP 和 Servlet

使用 Java 作为主要语言开发网站，一定会接触 JSP 和 Servlet 这两个概念：

- **Servlet**：服务端的一种 Java 组件，可以接收和处理来自浏览器的请求，生成 HTML、JSON 等常见格式的结果数据，写入 HTTP 响应返回给用户。
- **JSP**（Java Server Pages）：允许在静态 HTML 页面中插入 `<% %>` 标记，在标记中以表达式或代码片段嵌入 Java 代码。Web 容器响应请求时执行这些代码，并将执行结果替换进页面一并返回。

JSP 的执行分为两个过程：

| 过程 | 说明 |
| --- | --- |
| 编译过程（仅第一次） | JSP 页面 → Java 文件（Servlet）→ class 文件（Servlet） |
| 运行过程 | HTTP 请求 + class 文件（Servlet）→ HTML 文本 |

第一次运行时系统执行编译过程且只执行一次：JSP 生成 Servlet 的 Java 代码，代码被编译成字节码在 JVM 上运行；之后每次请求只需执行运行过程。

## 2. MVC 的演进

MVC 模式包含三层：

- **控制器 Controller**：负责请求的处理、校验和转发；
- **视图 View**：将内容数据以界面方式呈现给用户，也捕获和响应用户操作；
- **模型 Model**：数据和业务逻辑真正的集散地。

不同的 MVC 框架在实现上存在区别，其演进经历了如下阶段。

### 2.1 JSP Model 1

JSP Model 1 是整个演化过程中最古老的一种：请求处理的整个过程——参数验证、数据访问、业务处理、页面渲染——全部放在 JSP 页面里完成。JSP 的静态页面 + 嵌入动态表达式的特性可以容纳声明式代码，scriptlet 又支持多行 Java 代码，因此可以容纳命令式代码。

### 2.2 JSP Model 2

Model 1 虽然可以对 JSP 页面上的内容做模块和职责划分，但所有内容都在一个页面上，物理层面完全耦合，模块化和单一职责无从谈起。Model 2 做了明显改进：

- JSP 只做页面渲染，从"全能先生"转变为单一职责的页面模板；
- 引入 JavaBean 概念，将数据库访问等获取数据对象的行为封装起来，成为业务数据的唯一来源；
- 请求处理和派发交给纯 Servlet，它成为 MVC 的"大脑"：知道创建哪个 JavaBean 准备业务数据，也知道将请求引导到哪个 JSP 页面渲染。

由此，全能的 JSP 被解耦成三层，即 MVC 的 View、Model 和 Controller。今天的 MVC 框架千差万别，原理上却和这个版本基本一致。

这里还涉及两个常被混用的概念：**JavaBean** 是一类特殊的可重用封装对象，特点是可序列化、包含无参构造器、遵循统一的 getter/setter 命名规则；**POJO**（Plain Old Java Object）则是普通简单的 Java 对象，没有特殊限制，也不与其他类关联。通常认为 JavaBean 可以视作 POJO 的一种。

### 2.3 MVC 一般化

JSP Model 2 已具备 MVC 的基本形态，但对技术栈有明确限制——Servlet、JSP 和 JavaBean。今天的 MVC 已经与实现技术无关，在三层大体职责确定的基础上，交互和数据流动有许多不同实现方式。这里介绍两种典型情况：

**第一种典型情况**：用户请求发送给 Controller，Controller 主动调用 Model 层接口取得实际需要的数据对象，再发送给需要渲染的 View，View 渲染后返回页面给用户。

![MVC 第一种典型情况](/fullstack-eng-images/202405061730399.png)

这种情况下 Controller 往往比较大，因为它既要知道调用哪个 Model 的接口获取数据对象，还要知道把数据对象发送给哪个 View 渲染；View 和 Model 都比较简单纯粹，被动地按 Controller 的要求完成各自任务。

**第二种典型情况**：在更新操作中比较常见。Controller 调用 Model 接口发起数据更新操作，接着直接转向最终的 View；View 再调用 Model 取得更新后的最新对象，渲染并返回。

![MVC 第二种典型情况](/fullstack-eng-images/202405061731394.png)

这种情况下 Controller 相对简单，写操作由 Controller 发起、读操作由 View 发起，二者的业务对象模型可以不相同，非常适合 CQRS（命令查询职责分离）场景。

### 2.4 MVC 变体：MVP 与 MVVM

当核心三层和基本职责发生变化，就不再是严格意义上的 MVC，这里介绍两种变体：

**MVP** 的三层为 Model、View 和 Presenter，常用于用户界面设计：

- Model 职责不变，依然是业务数据的唯一来源；
- View 变成纯粹的被动视图，被动响应操作触发事件并转交 Presenter，界面也由 Presenter 发起更新；
- Presenter 成为 View 和 Model 之间的协调者，持有真正的调度逻辑：根据事件更新 Model，在 Model 变化时相应更新 View。

**MVVM** 在 MVP 基础上，将职责最多的 Presenter 替换成 ViewModel——一个数据对象转换器，把从 Model 取出的数据简化为 View 可识别的形式。View 和 ViewModel 实行双向绑定，View 的变化自动反馈到 ViewModel，反之亦然。

| 模式 | 核心角色 | 特点 |
| --- | --- | --- |
| MVC | Model / View / Controller | Controller 调度，View 与 Model 解耦 |
| MVP | Model / View / Presenter | View 被动，Presenter 持有全部调度逻辑 |
| MVVM | Model / View / ViewModel | 双向绑定，ViewModel 是数据转换器 |

## 3. 小结

本文从 JSP 与 Servlet 讲起，梳理了 MVC 从 JSP Model 1（全部逻辑塞进 JSP）到 Model 2（Servlet 控制 + JavaBean 模型 + JSP 视图）的演进，再到与实现技术无关的一般化 MVC，最后介绍了 MVP 和 MVVM 两种变体。理解 MVC 的演进脉络，是掌握各种 Web 开发框架的基础。

下一章我们将讲解面向切面编程（AOP）——横切关注点、代理机制与切面织入的工程实践。