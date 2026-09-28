---
title: 基于 Django_crontab、Xadmin 做一套定时任务管理系统
description: 用 Django_crontab 与 Xadmin 搭建可视化定时任务管理系统，覆盖架构设计、动态加载与前后台联动
keywords: [Django, crontab, Xadmin, 定时任务, 运维平台]
category: 部署与运维实践
tags: [DevOps, 运维]
---

# 基于 Django_crontab、Xadmin 做一套定时任务管理系统

## 0. 引言

Linux crontab 是周期性任务服务，但只能命令行管理、无界面交互，且通常是单机任务。本文介绍 Jcrontab 系统：基于 Python3.6 与 Django1.8 开发的前后台界面化定时任务管理系统，可打通企业消息服务接口发送通知，解决 crontab 的运维痛点。

## 1. 系统组成

工程分为三个子系统：

- **前端任务系统**：记录单个任务的执行情况（执行时间、执行结果），可对单个任务启动、停止或修改任务周期；
- **后台管理系统**：基于 Xadmin 框架搭建，用于编辑、添加、删除任务；
- **脚本录入系统**：基于 Python 开发的脚本，方便运维人员在控制台快速录入任务。

## 2. 功能演示

启动工程监听 8000 端口，浏览器访问 IP + 端口进入 Xadmin 后台登录页。任务表记录所有任务，新建任务的关键字段：

- 启动时间、截止时间、工作周期；
- 工作责任人、工作内容；
- 企业微通知 URL（任务执行后调用该接口发送消息）；
- 任务状态、是否开启催单；
- 执行命令（如 echo 命令）；
- 工作模式：仅信息模式、信息 + 命令模式。

保存后从前台界面可看到任务历史记录，点击恢复后任务状态由结单变为运行。任务按周期执行后，消息内容包含通知需求内容、时间与执行命令，执行命令的结果也会以消息形式输出到群消息。

## 3. 工程部署

基础服务依赖 MySQL 5.7。核心安装步骤：

1. 新建 MySQL 用户与数据库；
2. 修改 Django settings 文件中的数据库连接信息（用户名、密码、数据库名）；
3. 按 Django 框架做模型初始化；
4. 创建 Xadmin 后台超级用户。

## 4. 代码目录结构

| 目录 | 作用 |
|------|------|
| extra App | 存放第三方模块，集成 Xadmin |
| Jcron | Django 配置文件（settings 等） |
| Jcrontab | Django 相关应用 |
| logs | 日志输出目录 |
| static | 静态文件（图片、CSS、JS） |
| templates | Django 模板文件（HTML 页面） |
| manage.py | 管理文件，负责模型初始化、super 用户创建与工程启动 |
| requirements.txt | 工程依赖模块列表 |

## 5. 代码框架结构

工程遵循 Django MVT 框架：用户请求经过 URL → Views → models 三个层次。URL 层做请求路径路由，Views 层实现视图逻辑并调用核心方法，models 层负责数据库模型读写。中间加入 Xadmin：请求路径为 /xadmin 时交给 Xadmin 框架模块处理。

![Jcrontab 框架结构](/ops-course-images/07-基于_Django_crontab_Xadmin_做一套定时任务管理系统__Cgq2xl5nIHyAM5EnAAb-zfht2e4708.png)

数据模型主要用两张表：Demandorder 表（任务主表）与 Demandorder_log 表（外键表，记录每次任务执行的结果与时间）。

## 6. 两个特色知识点

### 6.1 Django_crontab 动态加载

框架内部通过 Django_crontab 模块调用操作系统 crontab 服务。标准用法：在 settings.py 的 INSTALLED_APPS 加载 Django_crontab，用 CRONTAB 变量赋值任务列表（元组包含执行周期与函数），通过 manage.py 管理：

- `python manage.py crontab add`：添加 settings 中的定时任务；
- `python manage.py crontab show`：展示当前定时任务；
- `python manage.py crontab remove`：删除定时任务。

标准模式要求任务写死在 settings 中，无法动态变更。Jcrontab 的改造：把 CRONTAB 全局变量改写为调用 `todo()` 方法，每次加载时从数据库模型读取任务属性，按 crontab 模块要求生成任务列表，实现与数据库交互的动态任务配置。

### 6.2 前后台动态联动

前台点击催单或恢复按钮时，需要重新加载定时任务。实现方式：Django 内调用 Shell 脚本，先把现有 crontab 任务 remove，再执行加载把改动后的任务加入，相当于前端按钮触发 reload 任务。

### 6.3 Xadmin 使用注意

Xadmin 是在 Django 默认 admin 插件基础上开发的第三方管理后台，功能更强大。使用时要特别注意版本及关联插件兼容问题，建议按项目指定版本安装。

## 7. 小结

Jcrontab 的价值在于把 crontab 从"命令行 + 单机 + 写死配置"升级为"可视化 + 动态配置 + 消息通知"：通过 Django_crontab 动态从数据库生成任务列表，用 Xadmin 提供管理界面，用 Shell 脚本实现前后台联动重载。这套"任务模型化 + 动态生成 crontab + 界面管理"的思路，是运维平台化建设中定时任务模块的通用范式，后续可扩展接入 CMDB 资产与自动化任务平台。

下一章基于 Python + Ansible + Django 搭建 CMDB 平台，把资产信息从表格管理升级为自动化发现与统一管理。