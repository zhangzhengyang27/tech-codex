---
title: 操作系统的谱系
version: 1.0
author: 文档维护组
created: 2026-08-09
updated: 2026-09-10
status: 正式
category: 计算机基础

---

# 操作系统的谱系

本文从技术源流梳理主流操作系统的关系：IBM 大型机、Unix 及其分支、类 Unix 系统、Linux 发行版、Windows 家族、macOS 与 Android，并以 Debian 漏洞统计为例讨论开源与漏洞数量的关系。

## 一、大型机与分时思想的起源

IBM 在商用计算机市场长期占据主导，1964 年自研 OS/360 并推出 System/360 大型机，目标是以集中式处理海量 I/O 与作业、提供巨大吞吐量。大型机至今仍承担银行交易、航班、税务等核心系统，单台（如 z15）每天可处理万亿级订单。超级计算机则面向科学计算，与大型机定位不同。

分时（Time Sharing）思想的代表是 Multics——由贝尔实验室、MIT、通用电气合作开发，提出分时、环形保护模型（多级权限）等新概念。Multics 商业上不成功，但其设计深刻影响了后来的 Unix。

## 二、Unix 与类 Unix

贝尔实验室的肯·汤普逊与丹尼斯·里奇（C 语言作者）认为 Multics 过于复杂，合作写出 Unix。Unix 开放早期源码，是现代操作系统的奠基之作：支持多任务、多用户、分级安全策略，具备内核、内存管理、文件系统、正则表达式、开发工具等完整能力。

**今天 Unix 已不单指某一系统，而是一套被普遍认可的架构标准**。其版本谱系如下（绿色开源、黄色混合、红色闭源）：

![Unix 版本谱系](/os-images/17-WinMacUnixLinux_的区别和联系：为什么_Debian_漏洞排名第一还这么多人用__CgqCHl-boE-AKrskAAOSZ46MgxM476.png)

- 参考 Unix 设计、遵循 Unix 规范的系统（如 Linux）称为 **Unix-like（类 Unix）**；
- Mac OS、SunOS、Solaris、HP-UX 均有 Unix 血统；Linux 非 Unix，但继承其大量工具与规范。

## 三、个人电脑与 Windows 家族

个人电脑兴起后，IBM 推出 IBM PC（即 PC 一词来源），其操作系统 PC DOS 源自微软购买的 86-DOS。微软随后以 MS-DOS 向各兼容机厂商授权，确立操作系统供应商地位。

- 1985 年微软首个视窗系统问世；
- 1995 年 Windows 95 仍以 MS-DOS 为核心；
- 2001 年 Windows XP 切换至 **Windows NT 内核**（混合内核，见内核与态切换篇）。

康柏等厂商逆向 IBM PC 引发整机价格战，微软在背后持续销售操作系统，最终成长为最大 PC 操作系统厂商。

## 四、Linux 与发行版

Unix 部分商业分支闭源，引发自由软件运动。理查德·斯托曼发起 GNU 项目（GNU = GNU's Not Unix），开发了 gcc、emacs 等工具但长期缺少内核；1991 年林纳斯·托瓦兹发布 Linux 内核，与 GNU 工具结合形成 GNU/Linux。

Linux 衍生大量发行版，2020 年服务器/桌面市场份额分布如下（数据 W3Techs）：

![Linux 发行版份额](/os-images/17-WinMacUnixLinux_的区别和联系：为什么_Debian_漏洞排名第一还这么多人用__Ciqc1F-boM-AWo1kAABSw_eB0VI629.png)

- **Ubuntu**：源自 Debian，桌面体验好，背后有 Canonical 商业与社区双重支持；
- **CentOS**：源自 Red Hat 企业版（RHEL），硬件/软件支持完善，国内运维常用（CentOS Linux 已于 2024 年 6 月停止维护，现多迁移至 Rocky Linux、AlmaLinux 等 RHEL 兼容发行版）；
- **Debian**：Ubuntu 的上游，完全由社区自由软件精神驱动，批评意见集中于发行周期长、漏洞修复慢。

## 五、macOS 与 Android

- **macOS**：源自 Unix 分支（BSD 系），属类 Unix 系统。
- **Android**：Google 收购后基于 Linux 改造，免费、开源、稳定性好（继承 Linux 内核）、应用生态通用，成为移动端主流。

## 六、开源与漏洞数量的关系

以 2020 年 NIST 报告为例：Debian 以 3067 个漏洞居软件漏洞数第一，其次 Android、Linux Kernel。并非因为质量差，而是开源带来更高的**可观测性**：

- 软件设计存在不可计算性，漏洞无法被穷举证明不存在，只能通过反复使用、工具扫描、阅读源码发现；
- 开源使可接触源码的群体庞大，技术讨论频繁，漏洞暴露更快、更多；
- Debian/Ubuntu 共享大量代码且合计占约 60% 份额，开发者遍布全球，故被发现的历史漏洞基数大；
- Windows 闭源，漏洞更难被外部发现，统计数字相对偏低。

因此"漏洞数第一"反映开源的透明度与生态规模，而非可靠性劣势。

## 小结

- 现代操作系统源流可归为：IBM 大型机线、Unix 及类 Unix 线（macOS/Android/Linux）、Windows 线（DOS→NT）。
- Linux 发行版（Debian→Ubuntu、RHEL→CentOS）各有定位；开源与漏洞统计正相关，本质是可观测性差异。
