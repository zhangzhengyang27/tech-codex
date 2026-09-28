---
title: Git 协作与分支策略
description: 轻量主干协作模型（main/feature/release/hotfix）、提交规范与原子化提交、merge 与 rebase 选择、冲突处理与代码审查的团队协作实践
keywords: [Git, 分支策略, 主干开发, rebase, 代码审查]
category: 部署与运维实践
tags: [DevOps, Git, 团队协作]
---

# Git 协作与分支策略

## 0. 引言

Git 是事实上的版本控制标准，但**真正影响团队效率的不是"会不会 `git add`"，而是分支策略、提交规范、发布节奏与冲突处理方式**。经典 Git Flow 分支繁多、流程沉重，对交付频率高、需求迭代快的团队并不友好。本章介绍更适合中小型后端团队的轻量主干协作模型，并给出提交规范与冲突处理的最佳实践。

---

## 1. 分支模型：轻量主干协作

| 分支 | 用途 | 生命周期 |
|------|------|----------|
| `main` | 随时可发布的主干 | 常驻 |
| `feature/*` | 短周期功能开发 | 数天 |
| `release/*` | 有明确发布窗口时创建 | 发布即删 |
| `hotfix/*` | 线上紧急修复 | 小时级 |

相比经典 Git Flow（master/develop/feature/release/hotfix 五分支常驻），轻量主干模型：

- **分支更少**：没有长期并行的 develop 与 master，减少合并成本；
- **发布更频繁**：main 随时可发布，契合持续交付；
- **职责更清晰**：只有"功能、发布、热修"三类临时分支。

---

## 2. 核心协作原则

- **小步提交**：提交原子化（一个提交只做一件事），降低冲突面，便于回滚与审查；
- **尽早合并**：功能分支短生命周期，减少长分支漂移（分支拖得越久，合并成本指数上升）；
- **PR 做审查**：用 Pull Request 触发代码审查，而不是把主分支当个人备份区；
- **不在线上分支开发**：main 只接收合并，不直接写代码。

---

## 3. 常用命令流

```bash
git checkout -b feature/user-profile   # 从 main 拉功能分支
git add .
git commit -m "feat: add user profile query api"
git fetch origin
git rebase origin/main                 # 合并前先变基到最新主干
git push origin feature/user-profile   # 推送后发起 PR
```

**merge 与 rebase 的选择**：

| 方式 | 历史形态 | 适用 |
|------|----------|------|
| `merge` | 保留合并提交，历史有分叉 | 团队协作、需要保留发布节点 |
| `rebase` | 线性历史，无分叉 | 个人分支整理、保持主干干净 |

实践建议：**个人功能分支用 rebase 保持线性，合并回主干用 merge 保留发布节点**；需要精确回溯"何时合入"用 merge commit，追求整洁历史用 rebase。

---

## 4. 提交信息规范

| 前缀 | 含义 | 示例 |
|------|------|------|
| `feat:` | 新功能 | `feat: add user profile query api` |
| `fix:` | 缺陷修复 | `fix: resolve NPE in order callback` |
| `refactor:` | 重构 | `refactor: extract payment strategy` |
| `docs:` | 文档更新 | `docs: update deployment guide` |
| `chore:` | 构建或工具调整 | `chore: bump docker base image` |

规范化的提交信息让 `git log`、`git bisect` 与自动生成 changelog 成为可能。

---

## 5. 常见误区

- **功能分支挂几周不合并**：漂移越大冲突越重，合并成本随周期指数增长；
- **混提交**：格式化、重构、功能改动混在一个提交里，无法单独回滚；
- **冲突直接覆盖**：不理解冲突双方语义就强制覆盖，是线上事故的常见源头（先看 `git log` 双方意图，必要时当面沟通）；
- **在线上分支直接开发**：绕过审查与发布流程，破坏可追溯性。

---

## 6. 小结

- **模型**：main 可随时发布 + feature/release/hotfix 临时分支，轻量主干优于经典 Git Flow；
- **节奏**：小步提交、尽早合并、PR 审查三原则，把冲突消灭在萌芽；
- **历史**：个人分支 rebase 线性化，主干合并保留节点，二者按需取用；
- **规范**：feat/fix/refactor/docs/chore 前缀 + 原子化提交，是团队协作的通用语言。

下一章讲解前端私有化 NPM 仓库管理——依赖私有化、版本锁定与构建提速的工程实践。