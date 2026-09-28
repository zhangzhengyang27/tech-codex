---
title: 基于 Python+Ansible+Django 搭建自动化任务平台
description: 从 Ansible 的 adhoc/playbook/roles 三种模式到 Django 融合封装实现可视化自动化任务平台
keywords: [Ansible, Django, 自动化任务, playbook, roles]
category: 部署与运维实践
tags: [DevOps, 运维]
---

# 基于 Python+Ansible+Django 搭建自动化任务平台

## 0. 引言

上一课讲解了 CMDB 如何收集资产——资产好比仓库里备好的货物，接下来要解决"如何分门别类地管理和维护"。本文讲解 DevOps 工程的剩余部分：自动化任务平台，核心思路是把 Ansible 作为 Python 模块融合进 Django 工程，实现可视化的任务执行。

## 1. Ansible 模块基础

Ansible 是系统自动化工具，既可在 Linux 终端命令化执行，也可作为 Python 模块调用，主要用于系统管理与自动化命令执行。三种使用方式：

| 方式 | 特点 | 适用场景 |
|------|------|---------|
| adhoc（命令模式） | 以模块方式直接运行任务 | 简单、临时任务 |
| playbook（剧本模式） | 按 yml 剧本文件执行任务序列 | 场景丰富、运维管理方便 |
| roles（角色模式） | 基于 playbook 的工程化目录结构 | 大型工程化运维项目 |

### 1.1 adhoc 与两个关键文件

- `ansible.cfg`：全局配置文件，配置全局变量与设置；
- `hosts`：主机资产关系管理文件，配置 IP、SSH 连接信息、主机名、主机组分类等。

### 1.2 playbook

playbook 按 yml 语法写剧本文件，定义主机、执行对象、执行用户与变量。tasks 定义具体任务，例如 `shell: touch /tmp/{{touch_file}}`，命令中的文件可用变量 `touch_file` 引用。执行方式：`ansible-playbook` + 剧本文件 + 选项。

### 1.3 roles

roles 是适用于大型任务场景的工程化结构，典型目录：

- `production` / `staging`：线上/线下环境配置文件（如 Tomcat 的 server.xml）；
- `roles` 目录：定义角色（如 Nginx 代理、JDK、Tomcat 各为一个角色），各自有独立 playbook 任务；
- `templates`：模板与相关配置；
- `webserver.yml`：主文件，通过 `ansible-playbook webserver.yml` 整体执行 roles。

Ansible 三种默认方式虽能提升效率，但仍有局限：hosts/groups 配置如何与已有 CMDB 融合、终端方式管理烦琐、定制场景有局限——因此需要自建可视化自动化任务平台。

## 2. 自动化任务平台设计

![自动化任务平台架构](/ops-course-images/11-基于_Python_Ansible_Django_搭建自动化任务平台__Ciqah155wHCARtpTAAHVwx-gTak127.png)

### 2.1 工程设计理念

用户端通过浏览器发送 POST/GET 请求把任务交给后端执行。数据存储用三个数据库：

- **MySQL**：存放绝大部分关系型数据（主机资产信息等）；
- **Redis**：作任务锁，防止同一任务重复执行或重复调用；
- **Mongo**：记录执行日志，便于溯源，出问题时按日志定位分析。

主体工程分三层：API 接口层接收用户请求并调用核心逻辑；逻辑层用 Django 开发，封装底层 Ansible 模块（Ansible 本身可作为 Python 模块）；执行层从 MySQL 获取主机资产信息，对目标机器执行自动化任务。

### 2.2 技术栈

Python3.6 + Django1.8 + Ansible2.4.1，演示环境 MySQL5.7 + Redis4.1。

## 3. 核心类封装

urls.py 中定义对外 API 接口路径 `/adhocdo`。views.py 中 `adhoc_task()` 函数接收请求并执行逻辑，把任务请求与资产信息关联。ansible_api.py 对 Ansible 模块默认内核方法重新封装，包含四个类：

| 类 | 作用 |
|------|------|
| MyInventory() | 定义主机和主机组的相关关系 |
| ModelResultsCollector(CallbackBase) | 封装回调类，修改任务显示与返回内容，回执 adhoc 任务成功/失败状态 |
| PlayBookResultsCollector(CallbackBase) | 封装 playbook 回调类，返回相关任务执行状态 |
| ANSRunner(object) | 任务执行类，对外暴露执行方法，视图层调用它执行具体任务 |

## 4. 工程执行过程

请求 `/adhocdo` 接口（POST 方法），提交参数：

- `taskid`：任务 ID；
- `mod_type`：模块类型（adhoc 任务以模块方式执行）；
- `exec_args`：具体任务命令，如 `touch /tmp/test22`；
- `sn_key`：主机唯一标识（从资产管理系统提取 sn 号）。

用 PostMan 模拟 POST 提交 JSON 后，服务端返回成功状态与 Ansible 接口返回的执行日志。最后 ssh 登录目标主机进入 /tmp 目录执行 ls，能看到 test22 文件生成，验证自动化任务执行成功。

## 5. 小结

自动化任务平台的关键融合点：用 Django 的 API 层承接任务请求、用 Redis 做任务锁防重、用 Mongo 记录执行日志、用封装后的 ANSRunner 调用 Ansible 执行任务、用 sn_key 关联 CMDB 资产。这套"CMDB 管资产 + Ansible 管执行 + Django 管界面"的三层结构，是 DevOps 平台建设的标准范式；Ansible 的 adhoc/playbook/roles 则分别对应简单任务、标准流程与工程化场景。

下一章讲解云部署实战（见本库《08-部署与容灾/03-云部署实战》），把整套 CI/CD 与容器化能力落到云平台环境。