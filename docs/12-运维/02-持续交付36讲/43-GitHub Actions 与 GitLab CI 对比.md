---
title: GitHub Actions 与 GitLab CI 对比
category: CI-CD 与测试基础设施
tags:
  - GitHub Actions
  - GitLab CI
  - CI 对比
  - YAML Pipeline
  - 云原生 CI
---

# GitHub Actions 与 GitLab CI 对比

## 一、模块介绍

**GitHub Actions** 与 **GitLab CI/CD** 是当前最主流的两个"代码托管平台原生"CI/CD 系统。相比传统 Jenkins，它们的核心优势是**与代码仓库深度集成**——无需额外维护 CI 服务器，推送代码即触发流水线。

GitHub Actions 于 2019 年发布，依托 GitHub 的庞大生态与 Marketplace 迅速普及；GitLab CI 是 GitLab 平台的核心内置能力，以一体化的 DevOps 平台定位著称。两者在设计理念、语法模型、执行架构上各有侧重。本文系统对比两者的核心能力、语法差异、执行模型、以及选型建议。

## 二、核心方法论

### 2.1 架构对比

```mermaid
---
title: GitHub Actions vs GitLab CI 架构对比
---
flowchart TB
    subgraph GHA["GitHub Actions"]
        GHA1["GitHub 仓库\n.yml in .github/workflows/"]
        GHA2["GitHub 托管 Runner\nubuntu/windows/macos"]
        GHA3["自托管 Runner\nSelf-hosted Runner"]
        GHA4["Actions Marketplace\n可复用 Action 组件"]
    end

    subgraph GLC["GitLab CI/CD"]
        GLC1["GitLab 仓库\n根目录 .gitlab-ci.yml"]
        GLC2["GitLab SaaS Runner\n或 Shared Runner"]
        GLC3["自建 Runner\nGitLab Runner 注册"]
        GLC4["Auto DevOps\n开箱即用模板"]
    end

    subgraph Code["代码仓库"]
        Code1["Git Push/PR/MR"]
    end

    Code1 --> GHA1
    Code1 --> GLC1
    GHA1 --> GHA2
    GHA1 --> GHA3
    GHA2 --> GHA4
    GLC1 --> GLC2
    GLC1 --> GLC3
    GLC2 --> GLC4
```

### 2.2 核心概念对照表

| 概念 | GitHub Actions | GitLab CI/CD |
| --- | --- | --- |
| 流水线定义文件 | `.github/workflows/*.yml` | `.gitlab-ci.yml` |
| 流水线 | Workflow | Pipeline |
| 阶段 | Job | Stage（包含多个 Job） |
| 步骤 | Step（在 Job 内） | Script（在 Job 的 `script` 中） |
| 执行器 | Runner | Runner |
| 并行矩阵 | `strategy.matrix` | `parallel:` 或 `matrix` |
| 复用单元 | Reusable Workflow / Composite Action | `include:` / `template:` |
| 触发条件 | `on:` | `rules:` / `only/except` |
| 缓存 | `actions/cache` | `cache:` |
| 密钥管理 | Repository Secrets | CI/CD Variables |
| 环境保护 | Environment Protection Rules | Protected Environments |

### 2.3 执行模型差异

```mermaid
---
title: 两者 Job 执行模型差异
---
flowchart LR
    subgraph GHA_Model["GitHub Actions: Job 级隔离"]
        G1["Workflow"]
        G2["Job 1\n(独立 Runner 容器)"]
        G3["Job 2\n(独立 Runner 容器)"]
        G4["Step 1 → Step 2 → Step 3\n(同一容器内)"]
    end

    subgraph GLC_Model["GitLab CI: Stage 串行"]
        L1["Pipeline"]
        L2["Stage: build\n(Job A, B 并行)"]
        L3["Stage: test\n(Job C, D 并行)"]
        L4["Stage: deploy\n(Job E)"]
    end

    G1 --> G2
    G1 --> G3
    G2 --> G4

    L1 --> L2 --> L3 --> L4
```

**关键差异**：GitHub Actions 的 Job 之间默认无依赖可并行，也可通过 `needs` 显式定义依赖；GitLab CI 的 Stage 之间**默认串行**，同一 Stage 内的 Job 并行执行。

## 三、关键流程

### 3.1 GitHub Actions 完整示例

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:  # 手动触发
    inputs:
      environment:
        description: '部署环境'
        type: choice
        options: [test, staging, production]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ===== 第一层：构建与单元测试 =====
  build-test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    outputs:
      version: ${{ steps.meta.outputs.version }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-python@v5
        with:
          python-version: '3.13'
          cache: 'pip'

      - name: 安装依赖
        run: pip install -r requirements.txt

      - name: 静态检查
        run: |
          pip install ruff
          ruff check src/

      - name: 单元测试 + 覆盖率
        run: |
          pytest tests/unit/ --cov=src --cov-fail-under=80 \
            --cov-report=xml --junitxml=test-results.xml

      - name: 上传测试结果
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results.xml

      - name: 上传覆盖率到 Codecov
        uses: codecov/codecov-action@v4
        with:
          file: coverage.xml
          token: ${{ secrets.CODECOV_TOKEN }}

      - name: 生成版本号
        id: meta
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            echo "version=$(date +%Y%m%d)-${GITHUB_SHA::7}" >> $GITHUB_OUTPUT
          else
            echo "version=pr-${{ github.event.pull_request.number }}" >> $GITHUB_OUTPUT
          fi

  # ===== 第二层：集成测试（矩阵并行） =====
  integration-test:
    needs: build-test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.11', '3.12', '3.13']
        database: ['postgres:16', 'mysql:8.4']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - name: 启动数据库容器
        run: docker run -d --name db -e POSTGRES_PASSWORD=test -e MYSQL_ROOT_PASSWORD=test ${{ matrix.database }}

      - name: 集成测试
        run: pytest tests/integration/ -m integration

  # ===== 第三层：构建镜像并推送 =====
  docker-build:
    needs: build-test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=${{ needs.build-test.outputs.version }}
            type=raw,value=latest

      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ===== 第四层：部署（环境保护） =====
  deploy:
    needs: docker-build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: ${{ github.event.inputs.environment || 'staging' }}
      url: https://app.staging.example.com
    steps:
      - name: 部署到 K8s
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" > kubeconfig
          export KUBECONFIG=kubeconfig
          kubectl set image deployment/app \
            app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ needs.build-test.outputs.version }}
          kubectl rollout status deployment/app --timeout=5m
```

### 3.2 GitLab CI 完整示例

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - quality
  - deploy

variables:
  REGISTRY: registry.gitlab.com
  IMAGE_NAME: $CI_REGISTRY_IMAGE
  PYTHON_VERSION: "3.13"

# 默认配置
default:
  image: python:${PYTHON_VERSION}-slim
  cache:
    paths:
      - .pip-cache/
  before_script:
    - pip install --cache-dir .pip-cache -r requirements.txt

# ===== Build Stage =====
build:
  stage: build
  script:
    - python -m build
    - pip install dist/*.whl
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

# ===== Test Stage（并行） =====
unit-test:
  stage: test
  script:
    - pip install pytest pytest-cov ruff
    - ruff check src/
    - pytest tests/unit/ --cov=src --cov-fail-under=80 --junitxml=report.xml
  coverage: '/TOTAL.*\s+(\d+\%)$/'
  artifacts:
    reports:
      junit: report.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml

integration-test:
  stage: test
  services:
    - postgres:16
    - redis:8-alpine
  variables:
    POSTGRES_PASSWORD: test
    DATABASE_URL: postgresql://postgres:test@postgres/test
  script:
    - pytest tests/integration/ -m integration
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

# ===== Quality Stage =====
sonarqube:
  stage: quality
  image: sonarsource/sonar-scanner-cli
  script:
    - sonar-scanner
      -Dsonar.projectKey=$CI_PROJECT_NAME
      -Dsonar.host.url=$SONAR_HOST
      -Dsonar.token=$SONAR_TOKEN
  allow_failure: false  # 质量门禁必须通过

# ===== Deploy Stage =====
deploy:staging:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl set image deployment/app app=$IMAGE_NAME:$CI_COMMIT_SHORT_SHA -n staging
    - kubectl rollout status deployment/app -n staging --timeout=5m
  environment:
    name: staging
    url: https://app.staging.example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  when: manual  # 手动确认部署

deploy:production:
  stage: deploy
  extends: deploy:staging  # 继承配置
  environment:
    name: production
    url: https://app.example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"  # 与 staging 同流水线，由手动确认把关
  when: manual
  needs:
    - deploy:staging  # 生产部署依赖预发布成功
```

### 3.3 复用机制对比

| 复用方式 | GitHub Actions | GitLab CI |
| --- | --- | --- |
| **跨仓库复用** | Reusable Workflow (`workflow_call`) | `include:` 远程模板 |
| **同仓库复用** | Composite Action | `extends:` / `!reference [...]` |
| **社区生态** | Marketplace（数千个 Action） | GitLab CI Templates |
| **参数传递** | `inputs` / `secrets` | `variables` / `include:template` |

## 四、工具与实践

### 4.1 缓存策略对比

```yaml
# GitHub Actions 缓存
- uses: actions/cache@v4
  with:
    path: |
      ~/.cache/pip
      node_modules
    key: ${{ runner.os }}-deps-${{ hashFiles('**/requirements*.txt', '**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-deps-
```

```yaml
# GitLab CI 缓存
cache:
  key:
    files:
      - requirements.txt
      - package-lock.json
  paths:
    - .pip-cache/
    - node_modules/
  policy: pull-push  # 拉取并推送更新
```

### 4.2 矩阵测试对比

```yaml
# GitHub Actions 矩阵
strategy:
  fail-fast: false  # 一个失败不取消其他
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]
    python: ['3.11', '3.12', '3.13']
    exclude:
      - os: windows-latest
        python: '3.11'  # 排除特定组合
    include:
      - os: ubuntu-latest
        python: '3.14'  # 额外增加组合
```

```yaml
# GitLab CI 矩阵（13.x+ 支持）
test:
  parallel:
    matrix:
      - OS: [ubuntu, macos, windows]
        PYTHON: ['3.11', '3.12', '3.13']
  script:
    - pytest tests/ --os=${OS} --python=${PYTHON}
```

### 4.3 安全扫描能力

| 安全能力 | GitHub Actions | GitLab CI |
| --- | --- | --- |
| SAST（静态安全分析） | CodeQL（原生） | GitLab SAST（内置） |
| 依赖扫描 | Dependabot（原生） | Dependency Scanning（内置） |
| 容器扫描 | Trivy Action | Container Scanning（内置） |
| 密钥检测 | Secret Scanning（原生） | Secret Detection（内置） |
| DAST（动态安全分析） | 第三方 Action | GitLab DAST（内置） |

GitLab 的安全扫描能力**开箱即用程度更高**，GitHub 的 CodeQL **代码分析深度更强**。

## 五、常见误区

### 5.1 "GitHub Actions 只能用 GitHub 仓库"

**误区**：认为使用 GitHub Actions 必须将代码托管在 GitHub。

**纠正**：GitHub 支持通过 `repository_dispatch` 和 `workflow_dispatch` 接收外部 Webhook 触发。但最佳实践仍是代码与 CI 同平台。

### 5.2 忽视 Runner 安全

**误区**：在自托管 Runner 上以 root 执行流水线，且多个项目共享 Runner。

**纠正**：自托管 Runner 有安全风险——流水线脚本可访问 Runner 主机。应按项目隔离 Runner，使用容器化执行，限制权限。

### 5.3 YAML 过度膨胀

**误区**：单一 workflow 文件超过 500 行，难以维护。

**纠正**：拆分为多个 workflow（按触发条件或阶段），使用 Composite Action / include template 复用公共逻辑。

### 5.4 忽视执行成本

**误区**：每次 PR 触发完整流水线（含 30 分钟的 E2E），GitHub Actions 免费额度耗尽。

**纠正**：利用 `paths` 过滤器只在相关文件变更时触发；PR 级只跑快速测试，合并到 main 后跑完整测试。

## 六、进阶扩展与参考

### 6.1 选型决策矩阵

| 场景 | 推荐 | 理由 |
| --- | --- | --- |
| 开源项目 | GitHub Actions | 免费额度充足、社区生态强 |
| 私有企业一体化 | GitLab CI | 代码+CI+CD+安全一体化 |
| K8s 原生团队 | GitLab CI + K8s Runner | Runner 与 K8s 集成更成熟 |
| 多仓库企业 | GitLab CI + include | 跨仓库模板复用更灵活 |
| GitHub 生态深度用户 | GitHub Actions | 与 PR/Issue/Dependabot 无缝集成 |

### 6.2 与 ArgoCD/Tekton 的协同

两者都可与 GitOps 工具协同：CI 平台负责构建与测试，测试通过后更新 Git 仓库中的部署清单，ArgoCD 监听变更自动部署。Tekton 则可作为 K8s 原生 CI 引擎替代传统 CI Runner。

### 6.3 推荐参考

- 文档：GitHub Actions（docs.github.com/actions）
- 文档：GitLab CI/CD（docs.gitlab.com/ee/ci）
- 对比：ThoughtWorks Technology Radar 对 CI 平台的评估
- 实践：GitHub Actions Reusable Workflows 最佳实践
