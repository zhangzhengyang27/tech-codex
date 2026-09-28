---
title: GitHub Actions
description: GitHub Actions 完全指南：核心概念与触发器、矩阵构建与缓存优化、Artifacts 与密钥管理、可复用工作流与复合 Action、部署示例（Vercel/Docker/AWS）与安全最佳实践。
keywords: [GitHub Actions, Workflow, Matrix, OIDC, Composite Action]
category: 部署与运维实践
tags: [Node.js, 部署运维]
---

# GitHub Actions

## 介绍

GitHub Actions 是 GitHub 提供的持续集成和持续部署（CI/CD）服务，可以自动化构建、测试和部署流程。它原生集成于 GitHub 生态系统，无需额外配置服务器，支持所有主流编程语言和平台。

### 核心优势

- **原生集成**：与 GitHub 仓库无缝对接，无需第三方服务
- **免费额度**：公开仓库无限制，私有仓库每月 2000 分钟免费
- **跨平台支持**：支持 Linux、Windows、macOS 三大平台
- **丰富的生态**：数千个社区贡献的可复用 Action
- **安全可靠**：支持密钥管理、权限控制、审计日志

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Platform                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Trigger   │───▶│  Workflow   │───▶│      Runner         │  │
│  │  (push/pr)  │    │   (.yml)    │    │   (执行环境)         │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│                                               │                  │
│                                               ▼                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Job 执行流程                              ││
│  │  ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐ ││
│  │  │Step 1 │──▶│Step 2 │──▶│Step 3 │──▶│Step N │──▶│Output │ ││
│  │  │checkout│  │setup │   │build │   │deploy│   │result │ ││
│  │  └───────┘   └───────┘   └───────┘   └───────┘   └───────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 基础概念

| 概念 | 说明 | 示例 |
|------|------|------|
| **Workflow（工作流）** | 一个自动化流程，定义在 `.github/workflows/` 目录下的 YAML 文件中 | `ci.yml`、`deploy.yml` |
| **Event（事件）** | 触发工作流运行的活动 | `push`、`pull_request`、`schedule` |
| **Job（作业）** | 工作流中的一组步骤，在同一个运行器上执行，可并行或串行 | `build`、`test`、`deploy` |
| **Step（步骤）** | 作业中的单个任务，可以是 Action 或 Shell 命令 | `checkout`、`npm install` |
| **Action（动作）** | 可重用的代码单元，可从 Marketplace 获取或自行创建 | `actions/checkout@v4` |
| **Runner（运行器）** | 执行工作流的服务器 | `ubuntu-latest`、`self-hosted` |

## 运行器（Runner）

### GitHub 托管运行器

| 运行器 | 公共仓库规格 | 私有仓库规格 | 适用场景 |
|--------|--------------|--------------|----------|
| `ubuntu-latest` | 4核 CPU, 16GB RAM, 14GB SSD | 2核 CPU, 8GB RAM, 14GB SSD | Linux 构建、测试 |
| `windows-latest` | 4核 CPU, 16GB RAM, 14GB SSD | 2核 CPU, 8GB RAM, 14GB SSD | Windows 专用应用 |
| `macos-latest` | 3核 (M1) CPU, 7GB RAM, 14GB SSD | 同公共仓库 | iOS/macOS 构建 |

> 以上为标准运行器规格（截至 2026-09，以 [GitHub 官方文档](https://docs.github.com/en/actions/reference/runners/github-hosted-runners) 为准）。需要更强算力时，Team/Enterprise 计划可使用 `ubuntu-latest-4-cores` 等更大规格的付费运行器。

### 自托管运行器

适用于需要特殊硬件、内网访问或降低成本的场景：

```yaml
jobs:
  build:
    runs-on: self-hosted  # 使用自托管运行器
    # 或指定标签
    # runs-on: [self-hosted, linux, x64, gpu]
```

**配置步骤**：

1. 进入仓库 Settings → Actions → Runners
2. 点击 "New self-hosted runner"
3. 按照指引在目标服务器上安装并注册

## 工作流配置详解

### 完整结构

```yaml
# 工作流名称（可选，默认为文件名）
name: CI/CD Pipeline

# 触发条件
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

# 环境变量（全局）
env:
  NODE_ENV: test
  CI: true

# 并发控制
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

# 权限设置
permissions:
  contents: read
  pull-requests: write

# 作业定义
jobs:
  build:
    runs-on: ubuntu-latest
    # ... 作业配置
```

### 基础工作流示例

创建 `.github/workflows/ci.yml`：

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      # 步骤1：检出代码
      - name: Checkout code
        uses: actions/checkout@v4

      # 步骤2：配置 Node.js 环境
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'  # 启用 pnpm 缓存

      # 步骤3：安装 pnpm
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      # 步骤4：安装依赖
      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # 步骤5：代码检查
      - name: Run linter
        run: pnpm lint

      # 步骤6：运行测试
      - name: Run tests
        run: pnpm test:coverage

      # 步骤7：构建
      - name: Build
        run: pnpm build
```

## 触发器（Events）

### 推送触发

```yaml
on:
  push:
    branches:
      - main
      - 'release/**'  # 支持 glob 模式
    paths:
      - 'src/**'      # 仅当 src 目录变更时触发
      - 'package.json'
      - 'pnpm-lock.yaml'
    paths-ignore:
      - '**.md'       # 忽略文档变更
    tags:
      - 'v*'          # 推送标签时触发
```

### PR 触发

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches: [main]
```

### 定时触发

```yaml
on:
  schedule:
    # cron 语法：分 时 日 月 周
    - cron: '0 0 * * *'      # 每天 UTC 0 点
    - cron: '0 6 * * 1'      # 每周一 UTC 6 点
    - cron: '0 0 1 * *'      # 每月 1 号
```

> **注意**：定时任务的最小间隔为 5 分钟，实际执行可能有延迟。

### 手动触发

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: '部署环境'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
      version:
        description: '版本号'
        required: false
        type: string
      dry_run:
        description: '试运行模式'
        required: false
        type: boolean
        default: false
```

在代码中访问输入参数：

```yaml
steps:
  - name: Deploy
    run: |
      echo "Deploying to ${{ inputs.environment }}"
      echo "Version: ${{ inputs.version }}"
```

### 仓库事件触发

```yaml
on:
  issues:
    types: [opened, edited]
  release:
    types: [created, published]
  discussion:
    types: [created]
```

### 工作流调用触发

```yaml
# 可被其他工作流调用
on:
  workflow_call:
    inputs:
      config-path:
        required: true
        type: string
    secrets:
      token:
        required: true
```

## 上下文与表达式

### 可用上下文

| 上下文 | 说明 | 示例 |
|--------|------|------|
| `github` | 工作流运行信息 | `github.event_name`, `github.sha` |
| `env` | 环境变量 | `env.NODE_ENV` |
| `job` | 当前作业信息 | `job.status` |
| `steps` | 步骤输出 | `steps.build.outputs.version` |
| `runner` | 运行器信息 | `runner.os`, `runner.arch` |
| `secrets` | 加密密钥 | `secrets.NPM_TOKEN` |
| `vars` | 仓库变量 | `vars.DEPLOY_ENV` |
| `inputs` | 工作流输入 | `inputs.environment` |
| `matrix` | 矩阵变量 | `matrix.node-version` |

### 表达式语法

```yaml
# 条件判断
if: ${{ github.event_name == 'push' }}
if: ${{ success() }}              # 前面步骤成功
if: ${{ failure() }}              # 前面步骤失败
if: ${{ always() }}               # 始终执行

# 函数调用
if: ${{ startsWith(github.ref, 'refs/tags/') }}
if: ${{ contains(github.event.head_commit.message, '[skip ci]') }}

# 类型转换
env:
  VERSION: ${{ toJSON(github.event) }}
  ENABLED: ${{ fromJSON(env.CONFIG).enabled }}
```

### 内置函数

```yaml
# 文件哈希
key: ${{ hashFiles('**/package-lock.json', '**/yarn.lock') }}

# 环境变量格式化（注意：表达式不支持字符串截断，需在 Shell 中处理）
env:
  FULL_SHA: ${{ github.sha }}
# 在步骤中使用：run: echo "SHORT_SHA=${GITHUB_SHA::0,7}" >> "$GITHUB_ENV"

# 条件表达式
env:
  DEPLOY_ENV: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
```

## 多作业工作流

### 依赖关系

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm lint

  test:
    runs-on: ubuntu-latest
    needs: lint  # 依赖 lint 作业完成后执行
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]  # 多依赖，都成功后才执行
    steps:
      - uses: actions/checkout@v4
      - run: pnpm build

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'  # 仅 main 分支部署
    steps:
      - uses: actions/checkout@v4
      - run: pnpm deploy
```

### 作业执行图

```
┌──────┐
│ lint │
└──┬───┘
   │
   ▼
┌──────┐
│ test │
└──┬───┘
   │
   ▼
┌───────┐
│ build │
└──┬────┘
   │
   ▼
┌────────┐
│ deploy │ (main 分支)
└────────┘
```

### 作业输出传递

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}
      artifact-path: ${{ steps.build.outputs.path }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Get version
        id: version
        run: echo "version=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT
      
      - name: Build
        id: build
        run: |
          pnpm build
          echo "path=./dist" >> $GITHUB_OUTPUT

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: |
          echo "Deploying version ${{ needs.build.outputs.version }}"
          echo "From path ${{ needs.build.outputs.artifact-path }}"
```

## 矩阵构建

### 基础矩阵

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [20, 22, 24]
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: pnpm test
```

### 矩阵过滤

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node: [20, 22, 24]
    # 排除特定组合
    exclude:
      - os: windows-latest
        node: 20
      - os: macos-latest
        node: 20
    # 包含特定组合
    include:
      - os: ubuntu-latest
        node: 24
        experimental: true
```

### 矩阵执行图

```
           ┌──────────────────────────────────────────┐
           │             Matrix Combinations          │
           └──────────────────────────────────────────┘
                            │
    ┌───────────────────────┼───────────────────────┐
    │                       │                       │
    ▼                       ▼                       ▼
┌─────────┐           ┌─────────┐           ┌─────────┐
│ Ubuntu  │           │ Windows │           │  macOS  │
│ Node 20 │           │ Node 20 │           │ Node 20 │
└─────────┘           └─────────┘           └─────────┘
    │                       │                       │
    ▼                       ▼                       ▼
  Pass/Fail              Pass/Fail              Pass/Fail
```

### 失败策略

```yaml
strategy:
  fail-fast: false  # 一个失败不取消其他作业
  max-parallel: 4   # 最大并行数
```

## 缓存与性能优化

### 依赖缓存

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Cache pnpm store
    uses: actions/cache@v4
    with:
      path: |
        ~/.pnpm-store
        node_modules
      key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
      restore-keys: |
        ${{ runner.os }}-pnpm-

  - run: pnpm install
```

### 包管理器缓存配置

```yaml
# npm
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'

# yarn
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'yarn'

# pnpm
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'pnpm'
```

### 缓存策略建议

| 包管理器 | 缓存路径 | 哈希文件 |
|----------|----------|----------|
| npm | `~/.npm` | `package-lock.json` |
| yarn | `~/.cache/yarn` | `yarn.lock` |
| pnpm | `~/.pnpm-store` | `pnpm-lock.yaml` |

## 工件（Artifacts）

### 上传工件

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: |
            dist/
            build/
          retention-days: 5  # 保留天数，默认 90 天
          compression-level: 6  # 压缩级别 0-9
```

### 下载工件

```yaml
jobs:
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: ./dist  # 解压路径

      - name: Deploy
        run: pnpm deploy
```

### 跨工作流共享工件

```yaml
# 工作流 1：构建并上传
jobs:
  build:
    steps:
      - uses: actions/upload-artifact@v4
        with:
          name: build-${{ github.sha }}
          path: dist/

# 工作流 2：下载并部署（需要 workflow_run 触发）
on:
  workflow_run:
    workflows: ["Build"]
    types: [completed]

jobs:
  deploy:
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-${{ github.event.workflow_run.head_sha }}
```

## 环境变量与密钥

### 变量作用域

```yaml
# 工作流级别
env:
  GLOBAL_VAR: 'workflow-level'

jobs:
  build:
    # 作业级别
    env:
      JOB_VAR: 'job-level'
    
    steps:
      # 步骤级别
      - name: Example
        env:
          STEP_VAR: 'step-level'
        run: |
          echo "Global: $GLOBAL_VAR"
          echo "Job: $JOB_VAR"
          echo "Step: $STEP_VAR"
```

### 密钥配置

**配置路径**：仓库 Settings → Secrets and variables → Actions

| 类型 | 作用域 | 用途 |
|------|--------|------|
| Repository secrets | 单个仓库 | 项目特定密钥 |
| Environment secrets | 环境级别 | 需要审批的密钥 |
| Organization secrets | 整个组织 | 共享密钥 |

### 使用示例

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # 指定环境
    steps:
      - name: Deploy to AWS
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          aws s3 sync ./dist s3://my-bucket --region us-east-1
```

### 变量（Variables）

```yaml
# 在 Settings → Secrets and variables → Actions → Variables 中配置

jobs:
  deploy:
    steps:
      - name: Deploy
        run: |
          echo "API URL: ${{ vars.API_URL }}"
          echo "Max retries: ${{ vars.MAX_RETRIES }}"
```

## 服务容器

### 数据库服务

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Run tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
        run: pnpm test
```

### 服务网络

```yaml
services:
  app:
    image: my-app:latest
    ports:
      - 3000:3000

  11-Nginx基础概述:
    image: 11-Nginx基础概述:latest
    ports:
      - 80:80
    volumes:
      - ./11-Nginx基础概述.conf:/etc/11-Nginx基础概述/11-Nginx基础概述.conf:ro
```

## 条件执行

### if 条件

```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying to production"

  notify:
    if: failure()  # 前面作业失败时执行
    runs-on: ubuntu-latest
    steps:
      - name: Send notification
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text": "Build failed!"}'
```

### 状态检查函数

| 函数 | 说明 |
|------|------|
| `success()` | 前面所有步骤都成功 |
| `failure()` | 至少一个步骤失败 |
| `cancelled()` | 工作流被取消 |
| `always()` | 始终执行（清理操作） |

```yaml
steps:
  - name: Build
    run: pnpm build
    
  - name: Test
    run: pnpm test
    
  - name: Upload logs on failure
    if: failure()
    uses: actions/upload-artifact@v4
    with:
      name: logs
      path: logs/
      
  - name: Cleanup
    if: always()
    run: rm -rf temp/
```

## 超时与重试

### 超时设置

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # 作业级别超时
    
    steps:
      - name: Long running task
        timeout-minutes: 10  # 步骤级别超时
        run: pnpm build
```

### 重试机制

```yaml
steps:
  - name: Deploy with retry
    uses: nick-fields/retry@v2
    with:
      timeout_minutes: 10
      max_attempts: 3
      retry_wait_seconds: 30
      command: pnpm deploy
```

## 并发控制

```yaml
# 同一分支只保留最新运行，取消之前的运行
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm build
```

### 不同场景配置

```yaml
# PR 场景：取消同一 PR 的旧运行
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number }}
  cancel-in-progress: true

# main 分支：不取消，允许排队
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false
```

## 部署示例

### 部署到 Vercel

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: ${{ github.event_name == 'push' && '--prod' || '' }}
```

### 部署到 Docker Hub

```yaml
name: Docker Build and Push

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ secrets.DOCKER_USERNAME }}/myapp
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### 部署到 AWS

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push to ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: myapp
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:${{ github.sha }} .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:${{ github.sha }}

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: task-definition.json
          service: my-service
          cluster: my-cluster
```

## npm 发布

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # 用于 OIDC
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      
      # 方式 1：使用传统 Token
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      # 方式 2：使用 OIDC（推荐，无需 Token）
      - run: npm publish --provenance
```

## 可复用工作流

### 定义可复用工作流

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      version:
        required: false
        type: string
        default: 'latest'
    secrets:
      DEPLOY_TOKEN:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: |
          echo "Deploying to ${{ inputs.environment }}"
          echo "Version: ${{ inputs.version }}"
```

### 调用可复用工作流

```yaml
# .github/workflows/main.yml
name: Main CI

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm build

  deploy-staging:
    needs: build
    uses: ./.github/workflows/deploy.yml
    with:
      environment: staging
    secrets:
      DEPLOY_TOKEN: ${{ secrets.STAGING_TOKEN }}

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    uses: ./.github/workflows/deploy.yml
    with:
      environment: production
      version: ${{ github.sha }}
    secrets:
      DEPLOY_TOKEN: ${{ secrets.PRODUCTION_TOKEN }}
```

## 复合 Action

### 创建复合 Action

```yaml
# .github/actions/setup-node/action.yml
name: 'Setup Node.js Environment'
description: '配置 Node.js 环境并安装依赖'
author: 'Your Name'

inputs:
  node-version:
    description: 'Node.js 版本'
    required: false
    default: '20'
  package-manager:
    description: '包管理器'
    required: false
    default: 'pnpm'

runs:
  using: 'composite'
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: ${{ inputs.package-manager }}

    - name: Setup pnpm
      if: ${{ inputs.package-manager == 'pnpm' }}
      uses: pnpm/action-setup@v4
      with:
        version: 10

    - name: Install dependencies
      shell: bash
      run: |
        if [ "${{ inputs.package-manager }}" = "pnpm" ]; then
          pnpm install --frozen-lockfile
        elif [ "${{ inputs.package-manager }}" = "yarn" ]; then
          yarn install --frozen-lockfile
        else
          npm ci
        fi
```

### 使用复合 Action

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: ./.github/actions/setup-node
        with:
          node-version: '20'
          package-manager: 'pnpm'
      
      - run: pnpm build
```

## 常用 Actions 列表

### 官方 Actions

| Action | 用途 | 示例版本 |
|--------|------|----------|
| `actions/checkout` | 检出代码仓库 | `@v4` |
| `actions/setup-node` | 配置 Node.js | `@v4` |
| `actions/setup-python` | 配置 Python | `@v5` |
| `actions/setup-java` | 配置 Java | `@v4` |
| `actions/cache` | 缓存依赖 | `@v4` |
| `actions/upload-artifact` | 上传构建产物 | `@v4` |
| `actions/download-artifact` | 下载构建产物 | `@v4` |
| `actions/github-script` | 执行 GitHub API 脚本 | `@v7` |
| `actions/labeler` | 自动标签 PR | `@v5` |
| `actions/stale` | 关闭过期 Issue | `@v9` |

### 常用第三方 Actions

| Action | 用途 | 示例 |
|--------|------|------|
| `codecov/codecov-action` | 上传测试覆盖率 | `@v4` |
| `docker/build-push-action` | Docker 构建推送 | `@v5` |
| `docker/login-action` | Docker 登录 | `@v3` |
| `aws-actions/configure-aws-credentials` | AWS 凭证配置 | `@v4` |
| `google-github-actions/auth` | GCP 认证 | `@v2` |
| `nick-fields/retry` | 命令重试 | `@v2` |
| `snyk/actions` | 安全扫描 | `@master` |
| `peaceiris/actions-gh-pages` | 部署到 GitHub Pages | `@v4` |

## 环境与保护规则

### 环境配置

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://myapp.example.com
    steps:
      - run: pnpm deploy
```

### 环境保护规则

在仓库 Settings → Environments 中配置：

- **Required reviewers**：必须审批才能部署
- **Wait timer**：部署前等待时间
- **Deployment branches**：限制可部署的分支
- **Environment secrets**：环境级别的密钥

## 安全最佳实践

### 权限最小化

```yaml
# 工作流级别
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write  # 仅在需要的作业中提升权限
    steps:
      - uses: softprops/action-gh-release@v2
```

### 防止脚本注入

```yaml
# ❌ 危险：直接使用用户输入
- run: echo "${{ github.event.issue.title }}"

# ✅ 安全：使用环境变量
- env:
    TITLE: ${{ github.event.issue.title }}
  run: echo "$TITLE"

# ✅ 安全：转义特殊字符
- uses: actions/github-script@v7
  with:
    script: |
      const title = `${{ github.event.issue.title }}`.replace(/"/g, '\\"');
      console.log(title);
```

### 使用 OIDC 替代长期凭证

```yaml
# AWS OIDC 认证
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/my-github-role
    aws-region: us-east-1
```

## 调试技巧

### 启用调试日志

在仓库 Secrets 中添加：

- `ACTIONS_RUNNER_DEBUG`：设置为 `true`
- `ACTIONS_STEP_DEBUG`：设置为 `true`

### 常用调试步骤

```yaml
steps:
  - name: Debug context
    run: |
      echo "Event: ${{ github.event_name }}"
      echo "Ref: ${{ github.ref }}"
      echo "SHA: ${{ github.sha }}"
      echo "Actor: ${{ github.actor }}"
      
  - name: Debug environment
    run: env | sort
    
  - name: Debug file system
    run: find . -type f -name "*.json" | head -20
```

### 使用 tmate 进行交互式调试

```yaml
- name: Setup tmate session
  uses: mxschmitt/action-tmate@v3
  if: ${{ failure() }}  # 失败时启用
```

## 常见问题解答

### Q1: 如何跳过 CI 运行？

在 commit message 中添加 `[skip ci]` 或 `[ci skip]`：

```bash
git commit -m "docs: update README [skip ci]"
```

### Q2: 如何在 PR 中运行工作流？

来自 Fork 的 PR 默认需要维护者批准才能运行工作流。可在 Settings → Actions → General 中配置 "Required approval for fork pull requests"。

### Q3: 如何处理大文件？

```yaml
- name: Free disk space
  run: |
    sudo rm -rf /usr/share/dotnet
    sudo rm -rf /opt/ghc
    sudo rm -rf /usr/local/share/boost
    df -h
```

### Q4: 如何解决缓存未命中？

```yaml
# 检查缓存 key 是否正确
- name: Check cache
  run: |
    echo "Lock file hash: ${{ hashFiles('**/pnpm-lock.yaml') }}"
    echo "OS: ${{ runner.os }}"
```

### Q5: 如何处理权限不足错误？

```yaml
# 给工作流添加必要权限
permissions:
  contents: write      # 用于推送代码/创建 release
  packages: write      # 用于发布到 GitHub Packages
  pull-requests: write # 用于创建 PR 评论
  issues: write        # 用于创建 Issue
```

### Q6: 如何复用步骤配置？

GitHub Actions 的工作流解析器**不支持 YAML 锚点（Anchor/Alias）**。复用步骤配置应使用复合 Action（见前文「复合 Action」）或可复用工作流（`workflow_call`）：

```yaml
# .github/actions/setup/action.yml
runs:
  using: 'composite'
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '22'
        cache: 'pnpm'
```

```yaml
jobs:
  build:
    steps:
      - uses: ./.github/actions/setup
      - run: pnpm build
```

## 最佳实践总结

1. **性能优化**
   - 使用缓存加速构建
   - 合理设置矩阵并行度
   - 使用 `pnpm` 替代 `npm` 提升依赖安装速度

2. **安全规范**
   - 所有密钥存储在 GitHub Secrets
   - 遵循最小权限原则
   - 使用 OIDC 替代长期凭证
   - 定期轮换密钥

3. **代码质量**
   - 使用矩阵测试多版本兼容性
   - 集成代码检查（ESLint、Prettier）
   - 上传测试覆盖率报告

4. **可维护性**
   - 使用可复用工作流减少重复
   - 使用复合 Action 封装常用步骤
   - 添加清晰的注释和命名

5. **可靠性**
   - 设置合理的超时时间
   - 为不稳定的步骤添加重试机制
   - 使用 `fail-fast: false` 完整测试矩阵

```yaml
# 完整示例：生产级工作流
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_ENV: test

permissions:
  contents: read

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-node
      - run: pnpm lint

  test:
    runs-on: ${{ matrix.os }}
    needs: lint
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [20, 22, 24]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v4
        if: matrix.os == 'ubuntu-latest' && matrix.node == '24'

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-node
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      - name: Deploy
        run: pnpm deploy
```

> 📖 **相关理论延伸**：GitHub Actions 与 GitLab CI 在架构、语法、执行模型与选型上的对比见 [GitHub Actions 与 GitLab CI 对比](../01-持续交付与CI-CD/03-GitHub%20Actions%20与%20GitLab%20CI%20对比.md)；CI/CD 概念全景见 [CI/CD](../01-持续交付与CI-CD/00-CI-CD.md)。
