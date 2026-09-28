---
title: 代码分支策略：Trunk-Based Development实践
description: "分支策略的选择决定了团队的集成频率与交付节奏。本文对比 GitFlow、GitHub Flow、Release Branches 与 Trunk-Based Development，讲解主干开发的三大约束、GitHub 分支保护配置、Feature Flag 与 Branch by Abstraction 配套实践及大规模团队的 Scaled TBD 方案。"
keywords: [代码分支策略, Trunk-Based Development, 主干开发, GitFlow, GitHub Flow, Feature Flag, Branch by Abstraction]
category: 部署与运维实践
tags: [DevOps, CI/CD]
---


# 代码分支策略：Trunk-Based Development实践

## 背景与问题定义

在持续交付的实践中，代码分支策略是最基础也最具争议的决策之一。分支策略决定了团队如何协作编写代码、如何集成变更、如何发布版本——它直接影响集成频率、冲突概率、发布节奏和团队协作效率。

许多团队在分支策略上陷入两难：分支过多导致集成困难、合并冲突频发、发布周期拉长；分支过少又担心代码质量失控、未完成功能泄露到生产环境。这种困境的根源在于，团队往往将分支策略视为纯粹的代码管理问题，而忽略了它与持续交付能力之间的深层关联。

DORA（DevOps Research and Assessment）团队多年行业研究的结论之一是：**采用 Trunk-Based Development 的团队，成为高绩效交付组织的可能性显著更高**。这不是偶然——Trunk-Based Development 的核心约束（短生命周期分支、频繁集成、小批量变更）与持续交付的底层逻辑高度一致。

然而，从 GitFlow 到 Trunk-Based Development 的转型并非一蹴而就。团队规模、发布模式、合规要求、技术架构都会影响分支策略的选择和实施路径。本文将系统分析主流分支策略的优劣，深入探讨 Trunk-Based Development 的实施方法，并为不同规模的团队提供可落地的实践方案。

## 核心概念

### 主流分支策略概览

当前业界主流的分支策略有四种，每种都有其适用场景和局限性。

**GitFlow** 由 Vincent Driessen 于 2010 年提出，是最早被广泛采用的系统化分支模型。它定义了五种分支类型：`main`（生产代码）、`develop`（开发集成分支）、`feature`（功能分支）、`release`（发布准备分支）和 `hotfix`（紧急修复分支）。GitFlow 的设计初衷是为有明确发布周期的项目提供严格的变更管控，但其多分支模型带来了显著的集成延迟和合并复杂度。

**GitHub Flow** 是 GitFlow 的简化版本，仅保留 `main` 分支和功能分支。所有开发在功能分支上进行，通过 Pull Request 合入 `main`，`main` 分支始终可部署。GitHub Flow 适合持续部署场景，但对发布管控较弱。

**Release Branches** 策略在 `main` 分支基础上增加发布分支，用于维护已发布版本的修复。这种策略常见于需要同时维护多个版本的产品，如操作系统、数据库等。

**Trunk-Based Development** 要求所有开发者在 `main`/`trunk` 分支上频繁提交，或使用极短生命周期的功能分支（通常不超过一天）。它是持续集成和持续交付的基石——没有 Trunk-Based Development，真正的持续集成几乎不可能实现。

### DORA 研究的关键发现

DORA 团队的研究数据表明，分支策略与软件交付绩效之间存在强相关性（倍数出自《Accelerate State of DevOps Report 2019》）：

| 指标 | Elite 级别 | Low 级别 | 差异倍数 |
|------|-----------|---------|---------|
| 部署频率 | 按需（每天多次） | 每月～每半年 | 208x |
| 变更前置时间 | < 1 天 | 1～6 个月 | 106x |
| 变更失败率 | 0-15% | 46-60% | ~7x |
| 服务恢复时间 | < 1 小时 | 1 周～数月 | 2604x |

> **注**：2019 年之后的 DORA 年报未再发布同口径的倍数对比，请勿将该表当作现行官方基准。

采用 Trunk-Based Development 的团队在上述四项指标上全面领先。其核心机制在于：短生命周期分支强制小批量变更，小批量变更降低每次变更的风险，低风险变更允许频繁部署，频繁部署加速反馈循环——这构成了一个正向增强的飞轮。

### 分支策略与集成频率的关系

分支策略的本质是集成频率的决策。Martin Fowler 的"集成频率光谱"清晰地展示了不同策略的位置：

- **持续集成**（Trunk-Based Development）：每人每天至少向主干提交一次
- **频繁集成**（GitHub Flow）：功能分支存活 1-3 天
- **周期集成**（Release Branches）：按发布周期集成，通常 1-4 周
- **低频集成**（GitFlow）：按功能完成集成，可能数周甚至数月

集成频率越低，合并冲突的概率呈指数级增长。这是因为冲突概率不仅取决于变更的代码量，更取决于变更之间的时间差——时间差越大，代码库的"漂移"越严重，合并时的认知负担越重。

## 架构设计

### 分支策略流程对比

```mermaid
flowchart TB
    subgraph GitFlow["GitFlow 模型"]
        direction TB
        gf_main["main (生产)"]
        gf_develop["develop (集成)"]
        gf_feature1["feature/A"]
        gf_feature2["feature/B"]
        gf_release["release/1.0"]
        gf_hotfix["hotfix/1.0.1"]

        gf_feature1 --> gf_develop
        gf_feature2 --> gf_develop
        gf_develop --> gf_release
        gf_release --> gf_main
        gf_release --> gf_develop
        gf_hotfix --> gf_main
        gf_hotfix --> gf_develop
    end

    subgraph TBD["Trunk-Based Development 模型"]
        direction TB
        tbd_main["main/trunk (始终可部署)"]
        tbd_f1["feature/A<br/>(< 1 天)"]
        tbd_f2["feature/B<br/>(< 1 天)"]
        tbd_release1["release/1.0<br/>(可选，仅标记)"]

        tbd_f1 -->|"频繁合入"| tbd_main
        tbd_f2 -->|"频繁合入"| tbd_main
        tbd_main --> tbd_release1
    end

    GitFlow ~~~ TBD

```

### Trunk-Based Development 的核心架构

Trunk-Based Development 的架构设计围绕三个核心约束展开：

**约束一：短生命周期分支**。功能分支的存活时间必须控制在一天以内。这意味着开发者必须在一天内完成一个可合入主干的增量——这要求将大的功能拆解为小的、可独立验证的变更。

**约束二：主干始终可部署**。`main` 分支上的任何提交都应处于可部署状态。这要求通过自动化测试、Feature Flag 和抽象分支（Branch by Abstraction）等技术手段，确保未完成功能不影响主干稳定性。

**约束三：频繁向主干集成**。每个开发者每天至少向主干提交一次。这要求快速构建（< 10 分钟）和快速测试反馈，否则频繁集成在时间上不可行。

```mermaid
flowchart LR
    subgraph 开发循环["Trunk-Based Development 开发循环"]
        direction LR
        A["拆解小任务<br/>(< 1 天可完成)"] --> B["本地开发 + 测试"]
        B --> C["Pre-commit 检查"]
        C --> D["合入 main"]
        D --> E["CI 流水线验证"]
        E -->|通过| F["自动部署到<br/>预发布环境"]
        E -->|失败| G["立即修复或回滚"]
        G --> D
        F --> H["Feature Flag 控制<br/>功能可见性"]
        H --> I["验证通过后<br/>开启 Feature Flag"]
    end

```

### Scaled Trunk-Based Development 架构

对于大规模团队（50+ 开发者），Trunk-Based Development 面临新的挑战：如何在保持主干稳定的同时支持大量并行开发？业界实践形成了两种主要架构模式：

**模式一：Monorepo + 构建系统优化**。Google、Meta 等公司采用单一仓库（Monorepo）管理所有代码，通过 Bazel、Pants 等构建系统实现增量构建和依赖分析，确保只有受影响的模块被构建和测试。这种模式的核心优势在于：所有变更在同一个仓库中可见，跨团队依赖管理简化，重构可以在全局范围内原子性地完成。

**模式二：微服务 + 独立仓库**。每个微服务拥有独立仓库，各服务团队独立采用 Trunk-Based Development。服务间通过 API 契约和 Consumer-Driven Contract Testing 保证兼容性。这种模式降低了单仓库的复杂度，但增加了跨服务协调的成本。

## 实现方案

### 主流分支策略深度对比

| 维度 | Trunk-Based Development | GitHub Flow | GitFlow | Release Branches |
|------|------------------------|-------------|---------|-----------------|
| **分支数量** | 1-2（main + 短命 feature） | 2（main + feature） | 5+（main/develop/feature/release/hotfix） | 2+（main + release/*） |
| **功能分支存活时间** | < 1 天 | 1-3 天 | 数天到数周 | N/A |
| **集成频率** | 每天多次 | 每天-每周 | 每周-每月 | 按发布周期 |
| **发布方式** | 从 main 直接发布 | 从 main 直接发布 | 从 release 分支发布 | 从 release 分支发布 |
| **热修复路径** | main → cherry-pick | main → 自动部署 | hotfix 分支 → main + develop | main → cherry-pick 到 release |
| **冲突概率** | 极低 | 低 | 高 | 中 |
| **回滚复杂度** | 低（revert commit） | 低 | 高（多分支同步） | 中 |
| **适用团队规模** | 1-50（可扩展到 500+） | 5-30 | 5-20 | 10-100+ |
| **适用发布模式** | 持续部署 | 持续部署 | 定期发布 | 多版本并行维护 |
| **CI/CD 要求** | 高（快速构建+测试） | 中 | 低 | 中 |
| **DORA 相关性** | Elite 强相关 | High 相关 | Low 相关 | Medium 相关 |

### Trunk-Based Development 实施步骤

#### 第一步：建立快速反馈的 CI 流水线

Trunk-Based Development 的前提是 CI 流水线能在 10 分钟内完成构建和测试。如果构建时间超过这个阈值，开发者将不愿意频繁集成。

```yaml
# .github/workflows/ci.yml - Trunk-Based Development 的 CI 流水线配置
name: Trunk CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# 关键：并发控制，同一 PR 只保留最新的运行
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # 第一阶段：快速检查（< 3 分钟）
  quick-checks:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Type check
        run: npm run typecheck
      - name: Unit tests
        run: npm run test:unit -- --coverage
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  # 第二阶段：集成测试（< 7 分钟）
  integration-tests:
    needs: quick-checks
    runs-on: ubuntu-latest
    timeout-minutes: 10
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

  # 第三阶段：构建验证（< 5 分钟）
  build-verification:
    needs: quick-checks
    runs-on: ubuntu-latest
    timeout-minutes: 8
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Build production bundle
        run: npm run build
      - name: Smoke test
        run: |
          # 启动应用并验证健康检查
          npm run start &
          sleep 5
          curl -f http://localhost:3000/health || exit 1
          curl -f http://localhost:3000/api/version || exit 1

  # 合并检查门禁
  ci-passed:
    needs: [quick-checks, integration-tests, build-verification]
    runs-on: ubuntu-latest
    steps:
      - run: echo "All CI checks passed - safe to merge"
```

#### 第二步：配置 GitHub 分支保护规则

分支保护规则是 Trunk-Based Development 的制度保障。以下是通过 GitHub API 配置分支保护的脚本：

```bash
#!/bin/bash
# configure-branch-protection.sh
# 为 Trunk-Based Development 配置 GitHub 分支保护规则

REPO_OWNER="your-org"
REPO_NAME="your-repo"
GITHUB_TOKEN="${GITHUB_TOKEN:?请设置 GITHUB_TOKEN 环境变量}"
API_BASE="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}"

echo "=== 配置 Trunk-Based Development 分支保护规则 ==="

# 配置 main 分支保护规则
curl -s -X PUT \
  "${API_BASE}/branches/main/protection" \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": [
        "quick-checks",
        "integration-tests",
        "build-verification"
      ]
    },
    "required_pull_request_reviews": {
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": true,
      "required_approving_review_count": 1,
      "require_last_push_approval": true
    },
    "restrictions": null,
    "enforce_admins": true,
    "required_linear_history": true,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "block_creations": false,
    "required_conversation_resolution": true
  }' | jq '.'

echo ""
echo "=== 配置分支命名规则（GitHub Rulesets）==="

# 创建 Ruleset 限制功能分支命名和生命周期
curl -s -X POST \
  "${API_BASE}/rulesets" \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  -d '{
    "name": "trunk-based-development-rules",
    "target": "branch",
    "enforcement": "active",
    "conditions": {
      "ref_name": {
        "include": ["refs/heads/feature/*", "refs/heads/bugfix/*"],
        "exclude": []
      }
    },
    "rules": [
      {
        "type": "creation"
      },
      {
        "type": "deletion"
      },
      {
        "type": "non_fast_forward"
      },
      {
        "type": "pull_request",
        "parameters": {
          "require_code_owner_review": true,
          "require_last_push_approval": true,
          "required_approving_review_count": 1,
          "dismiss_stale_reviews_on_push": true,
          "required_merge_method": "squash"
        }
      }
    ],
    "bypass_actors": [
      {
        "actor_id": 1,
        "actor_type": "OrganizationAdmin",
        "bypass_mode": "pull_request"
      }
    ]
  }' | jq '.'

echo ""
echo "分支保护规则配置完成！"
echo "- main 分支：要求 PR + CI 通过 + 1 人审批 + 线性历史"
echo "- 功能分支：强制 squash merge + 命名规范"
```

#### 第三步：实施 Feature Flag 机制

Feature Flag 是 Trunk-Based Development 的关键使能技术，它允许未完成功能合入主干而不影响生产环境。

```typescript
// feature-flags.ts - 基于 LaunchDarkly 风格的 Feature Flag 实现
// 适配 Trunk-Based Development 场景

interface FeatureFlagConfig {
  key: string;
  enabled: boolean;
  // 基于规则的评估
  rules?: FlagRule[];
  // 渐进式发布百分比
  rolloutPercentage?: number;
}

interface FlagRule {
  attribute: string;
  operator: 'eq' | 'in' | 'gt' | 'lt' | 'contains';
  values: string[];
}

interface UserContext {
  userId: string;
  attributes: Record<string, string | number | boolean>;
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlagConfig> = new Map();
  private static instance: FeatureFlagService;

  private constructor() {
    this.initializeFlags();
  }

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  private initializeFlags(): void {
    // 从配置中心加载 Flag 定义
    // 生产环境应从远程配置服务（如 LaunchDarkly、Unleash）获取
    const defaultFlags: FeatureFlagConfig[] = [
      {
        key: 'new-checkout-flow',
        enabled: true,
        rolloutPercentage: 10, // 10% 用户可见
        rules: [
          { attribute: 'betaTester', operator: 'eq', values: ['true'] }
        ]
      },
      {
        key: 'payment-redesign',
        enabled: false, // 开发中，主干已合入但未开启
      },
      {
        key: 'search-algorithm-v2',
        enabled: true,
        rolloutPercentage: 50,
      }
    ];

    defaultFlags.forEach(flag => this.flags.set(flag.key, flag));
  }

  /**
   * 评估 Feature Flag
   * Trunk-Based Development 中的核心方法：
   * - 开发中功能：enabled=false，代码已合入主干但不影响用户
   * - 渐进式发布：rolloutPercentage 控制灰度比例
   * - 规则匹配：支持基于用户属性的精准投放
   */
  isEnabled(flagKey: string, context?: UserContext): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      console.warn(`Feature flag "${flagKey}" not found, defaulting to false`);
      return false; // 未知 Flag 默认关闭，保证安全
    }

    if (!flag.enabled) {
      return false;
    }

    // 规则优先：如果用户匹配规则，直接放行
    if (context && flag.rules && flag.rules.length > 0) {
      const matchesRule = flag.rules.some(rule => {
        const attrValue = context.attributes[rule.attribute];
        if (attrValue === undefined) return false;

        switch (rule.operator) {
          case 'eq': return rule.values.includes(String(attrValue));
          case 'in': return rule.values.includes(String(attrValue));
          case 'gt': return Number(attrValue) > Number(rule.values[0]);
          case 'lt': return Number(attrValue) < Number(rule.values[0]);
          case 'contains': return rule.values.some(v => String(attrValue).includes(v));
          default: return false;
        }
      });
      if (matchesRule) return true;
    }

    // 渐进式发布：基于用户 ID 的确定性哈希
    if (flag.rolloutPercentage !== undefined && context) {
      const hash = this.deterministicHash(context.userId, flagKey);
      return (hash % 100) < flag.rolloutPercentage;
    }

    return flag.enabled;
  }

  /**
   * 确定性哈希：同一用户对同一 Flag 的评估结果始终一致
   * 这确保了渐进式发布中用户体验的连续性
   */
  private deterministicHash(userId: string, flagKey: string): number {
    const str = `${userId}:${flagKey}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * 动态更新 Flag（用于运维操作，无需重新部署）
   */
  updateFlag(flagKey: string, config: Partial<FeatureFlagConfig>): void {
    const existing = this.flags.get(flagKey);
    if (existing) {
      this.flags.set(flagKey, { ...existing, ...config });
      console.log(`Flag "${flagKey}" updated:`, config);
    }
  }

  /**
   * 清理已完成的 Feature Flag
   * 重要：Flag 完成使命后必须清理，避免技术债务积累
   */
  removeFlag(flagKey: string): void {
    this.flags.delete(flagKey);
    console.log(`Flag "${flagKey}" removed - feature is now permanent`);
  }
}

// 使用示例：Trunk-Based Development 中的功能开关
const flags = FeatureFlagService.getInstance();

// 场景一：新功能开发中，代码已合入 main 但 Flag 关闭
// 用户不会看到新功能，但代码已经在主干上被持续集成和测试
function getCheckoutPage(user: UserContext) {
  if (flags.isEnabled('new-checkout-flow', user)) {
    return renderNewCheckout(user);
  }
  return renderLegacyCheckout(user);
}

// 场景二：渐进式发布，逐步扩大用户范围
// 从 10% → 25% → 50% → 100%，每步观察指标后再推进
function getSearchResults(query: string, user: UserContext) {
  if (flags.isEnabled('search-algorithm-v2', user)) {
    return searchV2(query, user);
  }
  return searchV1(query, user);
}

// 导出供测试使用
export { FeatureFlagService, UserContext, FeatureFlagConfig };
```

#### 第四步：Branch by Abstraction 模式

当需要替换大型组件时，直接在功能分支上开发会导致长期存活的分支。Branch by Abstraction 提供了一种渐进式替换的方法：

```mermaid
flowchart LR
    subgraph "Branch by Abstraction 步骤"
        S1["1. 创建抽象层<br/>（Facade/Interface）"] --> S2["2. 将现有实现<br/>移至抽象层之后"]
        S2 --> S3["3. 新实现与旧实现<br/>通过抽象层共存"]
        S3 --> S4["4. 逐步迁移调用方<br/>到新实现"]
        S4 --> S5["5. 移除旧实现<br/>和抽象层"]
    end

```

```java
// Branch by Abstraction 示例：替换通知系统
// 步骤 1：定义抽象层
public interface NotificationService {
    void send(String userId, String message);
    boolean isAvailable();
}

// 步骤 2：旧实现适配抽象层
public class LegacyEmailNotificationService implements NotificationService {
    private final SmtpClient smtpClient;

    @Override
    public void send(String userId, String message) {
        String email = userRepository.getEmail(userId);
        smtpClient.send(email, "Notification", message);
    }

    @Override
    public boolean isAvailable() {
        return smtpClient.isHealthy();
    }
}

// 步骤 3：新实现（可独立开发，通过 Feature Flag 控制）
public class PushNotificationService implements NotificationService {
    private final FcmClient fcmClient;

    @Override
    public void send(String userId, String message) {
        String deviceToken = userRepository.getDeviceToken(userId);
        fcmClient.push(deviceToken, message);
    }

    @Override
    public boolean isAvailable() {
        return fcmClient.isHealthy();
    }
}

// 步骤 3-4：路由层（渐进式迁移）
public class RoutingNotificationService implements NotificationService {
    private final NotificationService legacyService;
    private final NotificationService newService;
    private final FeatureFlagService flagService;

    @Override
    public void send(String userId, String message) {
        if (flagService.isEnabled("push-notifications", userId)) {
            try {
                newService.send(userId, message);
            } catch (NotificationException e) {
                // 降级到旧实现
                legacyService.send(userId, message);
            }
        } else {
            legacyService.send(userId, message);
        }
    }

    @Override
    public boolean isAvailable() {
        return legacyService.isAvailable() || newService.isAvailable();
    }
}
```

### Scaled Trunk-Based Development：大规模团队实践

#### Google 式 Monorepo 实践

Google 的代码仓库包含超过 10 亿行代码，数万名工程师在同一个仓库中采用 Trunk-Based Development。其核心支撑技术包括：

**Bazel 构建系统**：通过依赖图分析和增量构建，确保每次提交只构建和测试受影响的模块。Bazel 的内容可寻址缓存（Content-Addressable Cache）使得跨团队的构建结果可以共享，避免重复构建。

**TAP（Test Automation Platform）**：每次提交触发数百万个测试中的相关子集，通过依赖分析确定哪些测试需要运行。测试结果在 15 分钟内反馈给开发者。

**Presubmit 检查**：在代码合入主干前，自动运行受影响的测试，防止破坏性变更进入主干。

```python
# Bazel BUILD 文件示例 - Monorepo 中的模块化构建
# 通过精确的依赖声明实现增量构建
# 注意：rules_nodejs 已于 2025 年停止维护，新项目建议改用 Aspect Build 维护的 rules_js

load("@rules_nodejs//:index.bzl", "nodejs_binary", "npm_package")

# 支付服务模块 - 独立构建和测试
nodejs_binary(
    name = "payment-service",
    entry_point = "src/index.ts",
    deps = [
        "//shared:core-lib",
        "//shared:database-client",
        "@npm//express",
        "@npm//stripe",
    ],
)

# 只有 payment-service 的依赖变更时才会重新构建和测试
npm_package(
    name = "payment-service-package",
    srcs = glob(["src/**"]),
    deps = [":payment-service"],
)

# 测试目标 - 精确声明测试依赖
nodejs_test(
    name = "payment-service-test",
    srcs = glob(["test/**"]),
    deps = [
        ":payment-service",
        "@npm//jest",
        "@npm//supertest",
    ],
)
```

#### 大规模团队的代码审查策略

在 Trunk-Based Development 中，代码审查的效率直接影响分支存活时间。以下是优化审查流程的实践：

| 审查策略 | 适用场景 | 审查时间目标 | 实现方式 |
|---------|---------|------------|---------|
| Pair Programming | 核心模块、高风险变更 | 实时 | 结对开发，一人写代码一人审查 |
| Pre-merge Review | 常规变更 | < 2 小时 | PR + 自动化检查 + 人工审查 |
| Post-merge Review | 低风险变更、文档 | < 24 小时 | 先合入后审查，发现问题 revert |
| Stacked PRs | 大型功能拆解 | 每个 PR < 1 小时 | 将大变更拆为一系列小 PR |

## 最佳实践

### 实施 Trunk-Based Development 的渐进路径

从 GitFlow 或其他策略迁移到 Trunk-Based Development 不应一步到位，建议按以下阶段推进：

**阶段一：缩短分支生命周期**（1-2 个月）。不改变现有分支模型，但要求功能分支在 3 天内合入。这迫使团队开始拆解大任务，体验更频繁的集成。

**阶段二：简化分支模型**（2-3 个月）。移除 `develop` 分支，所有功能分支直接合入 `main`。引入 Feature Flag 处理未完成功能。建立 CI 流水线确保 `main` 始终可部署。

**阶段三：实现真正的 Trunk-Based Development**（3-6 个月）。功能分支存活时间缩短到 1 天以内。部分开发者直接在 `main` 上提交（配合 Pre-commit 检查）。建立完整的自动化测试体系。

**阶段四：持续优化**（持续进行）。优化构建速度、引入增量测试、实施 Progressive Delivery、清理技术债务。

### 常见反模式与应对

| 反模式 | 表现 | 根因 | 应对方案 |
|-------|------|------|---------|
| 长期功能分支 | 分支存活 > 1 周 | 任务拆解不够细 | 强制拆解为 < 1 天的增量 |
| 合并地狱 | 大量冲突，合并耗时 | 集成频率太低 | 提高集成频率，每天至少一次 |
| 红色主干 | main 分支构建经常失败 | 测试覆盖不足 | 强化 CI 门禁，失败立即修复 |
| Feature Flag 膨胀 | Flag 数量持续增长 | 缺乏清理机制 | 每个 Flag 设定过期时间，定期清理 |
| 审查瓶颈 | PR 等待审查时间过长 | 审查者不足或流程低效 | 引入 Pair Programming、Post-merge Review |
| Big Bang 发布 | 一次发布大量变更 | 缺乏渐进式发布能力 | 引入 Feature Flag + Progressive Delivery |

### 不同团队规模的策略选择

| 团队规模 | 推荐策略 | 关键调整 |
|---------|---------|---------|
| 1-5 人 | 纯 Trunk-Based Development | 直接在 main 上提交，Pre-commit 检查 |
| 6-15 人 | Trunk-Based Development + 短命 PR | 功能分支 < 1 天，PR 审查 < 2 小时 |
| 16-50 人 | Trunk-Based Development + Code Owners | CODEOWNERS 文件指定审查者，自动化审查分配 |
| 50+ 人 | Scaled TBD（Monorepo 或微服务） | Bazel/Pants 增量构建，TAP 测试平台 |

## 效果度量

实施 Trunk-Based Development 后，应持续跟踪以下指标以验证效果：

### 核心度量指标

| 指标 | 定义 | 目标值 | 度量方法 |
|------|------|-------|---------|
| 分支存活时间 | 从创建到合入的时间 | < 24 小时 | Git 统计：分支创建时间 vs 合并时间 |
| 集成频率 | 每人每天向主干提交次数 | >= 1 次/天 | Git 统计：每人每日 commit 数 |
| 合并冲突率 | 需要手动解决冲突的合并比例 | < 5% | CI 统计：merge conflict 事件数 / 总合并数 |
| 主干健康度 | main 分支构建成功率 | > 95% | CI 统计：绿色构建 / 总构建数 |
| 变更前置时间 | 从 commit 到部署生产的时间 | < 1 小时 | Pipeline 统计：commit 时间 vs 部署时间 |
| Feature Flag 数量 | 活跃 Flag 数量 | < 20 | 配置中心统计 |
| Flag 清理率 | 已完成 Flag 的清理比例 | > 90% | Flag 生命周期统计 |

### 度量数据采集脚本

```bash
#!/bin/bash
# measure-tbd-metrics.sh
# 采集 Trunk-Based Development 关键度量指标

REPO_PATH="${1:-.}"
DAYS="${2:-30}"

echo "=== Trunk-Based Development 度量报告（最近 ${DAYS} 天）==="
echo ""

# 1. 分支存活时间统计
echo "--- 1. 分支存活时间 ---"
echo "已合并分支的平均存活时间："
git -C "$REPO_PATH" log --merges --since="${DAYS} days ago" \
  --format="%at %s" | \
  awk '{
    # 提取合并时间
    merge_time = $1
    # 提取分支名（假设格式为 "Merge pull request #N from org/branch-name"）
    for (i=3; i<=NF; i++) {
      if ($i ~ /^from/) {
        branch = $(i+1)
        break
      }
    }
  } END {
    print "  总合并数: ", NR
  }'

# 2. 每人每日提交频率
echo ""
echo "--- 2. 每人每日提交频率 ---"
git -C "$REPO_PATH" log --since="${DAYS} days ago" \
  --format="%ae %ad" --date=short | \
  sort | uniq -c | \
  awk '{
    author = $2
    date = $3
    commits = $1
    total[author] += commits
    days[author]++
  } END {
    for (a in total) {
      avg = total[a] / days[a]
      printf "  %-30s 总提交: %3d  天数: %2d  日均: %.1f\n", a, total[a], days[a], avg
    }
  }' | sort -t: -k3 -rn

# 3. 主干健康度
echo ""
echo "--- 3. 主干健康度 ---"
# 假设 CI 状态通过 GitHub API 可获取
if [ -n "$GITHUB_TOKEN" ]; then
  REPO_OWNER=$(git -C "$REPO_PATH" remote get-url origin | sed -E 's|.*[:/]([^/]+)/([^/.]+).*|\1|')
  REPO_NAME=$(git -C "$REPO_PATH" remote get-url origin | sed -E 's|.*[:/]([^/]+)/([^/.]+).*|\2|')

  TOTAL_RUNS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?branch=main&per_page=100" | \
    jq '.total_count')

  SUCCESS_RUNS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?branch=main&status=success&per_page=1" | \
    jq '.total_count')

  if [ -n "$TOTAL_RUNS" ] && [ "$TOTAL_RUNS" -gt 0 ]; then
    HEALTH=$(echo "scale=2; $SUCCESS_RUNS * 100 / $TOTAL_RUNS" | bc)
    echo "  总构建数: $TOTAL_RUNS"
    echo "  成功构建数: $SUCCESS_RUNS"
    echo "  主干健康度: ${HEALTH}%"
  fi
else
  echo "  设置 GITHUB_TOKEN 环境变量以获取 CI 健康度数据"
fi

# 4. 变更规模统计
echo ""
echo "--- 4. 变更规模统计 ---"
git -C "$REPO_PATH" log --since="${DAYS} days ago" --format="" --numstat | \
  awk 'NF==3 {
    added += $1
    deleted += $2
    files++
  } END {
    if (files > 0) {
      printf "  总变更文件数: %d\n", files
      printf "  总新增行数: %d\n", added
      printf "  总删除行数: %d\n", deleted
      printf "  平均每次提交变更行数: %.0f\n", (added + deleted) / files
    }
  }'

echo ""
echo "=== 报告结束 ==="
```

## 总结

Trunk-Based Development 不是一个简单的分支命名规范，而是一套与持续交付深度耦合的工程实践体系。它的核心价值在于通过短生命周期分支和频繁集成，将"集成"从痛苦的周期性事件转变为无感知的日常行为。

本文的关键要点：

1. **DORA 研究证实了 Trunk-Based Development 与 Elite 级别交付绩效的强相关性**。这不是理论推导，而是基于数千个团队实证数据的结论。

2. **Trunk-Based Development 的实施需要配套技术支撑**：快速 CI 流水线（< 10 分钟）、Feature Flag 机制、Branch by Abstraction 模式。没有这些支撑，强行推行只会导致主干不稳定。

3. **大规模团队可以通过 Scaled Trunk-Based Development 实践**：Monorepo + Bazel 增量构建、微服务 + 独立仓库、Pair Programming 实时代替审查，都是经过 Google、Meta 等大规模团队验证的方案。

4. **迁移应渐进推进**：从缩短分支生命周期开始，逐步简化分支模型，引入 Feature Flag，最终实现真正的 Trunk-Based Development。

5. **效果需要持续度量**：分支存活时间、集成频率、主干健康度、Feature Flag 清理率等指标，是验证实施效果和持续改进的基础。

选择分支策略不是一次性的架构决策，而是随着团队成长和技术能力提升不断演进的实践。Trunk-Based Development 为持续交付提供了最优的代码协作模型，但它的成功实施依赖于团队在自动化测试、构建优化、渐进式发布等领域的持续投入。
