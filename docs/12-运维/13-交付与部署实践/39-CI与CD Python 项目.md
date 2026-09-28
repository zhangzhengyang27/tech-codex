---
title: CI/CD Python 项目
description: 从 GitHub Actions 到 GitLab CI，构建 Python 项目的完整持续集成与持续交付流水线，涵盖自动测试、语义化发布、Docker 镜像构建与实战场景。
keywords: [Python, CI/CD, GitHub Actions, GitLab CI, Trusted Publishing, Docker]
category: 部署与运维实践
tags: [DevOps, 部署运维]
---

# CI/CD Python 项目

## 概念说明

CI/CD 是持续集成（Continuous Integration）和持续交付/部署（Continuous Delivery / Continuous Deployment）的缩写。它不是某个工具，而是一套让代码从"开发者提交"到"用户可用"的自动化工程实践。

对于 1-3 年经验的 Python 开发者，CI/CD 最容易在两个阶段出问题：一是项目初期觉得"手动跑一下测试就行了"，从不配置流水线，等团队规模增长后才发现质量保障完全靠人；二是照抄模板配了个流水线但从不维护，半年后 Python 版本升级了、依赖变了，流水线早就红灯一片却没人管。

现代 Python 项目的 CI/CD 至少要解决四件事：**代码质量门禁**（lint、类型检查）、**自动化测试**（单元/集成/E2E）、**自动化发布**（版本号、changelog、PyPI 上传）、**自动部署**（Docker 镜像构建与服务部署）。本文将从这四条线出发，给出可直接落地的配置方案。

## CI/CD 在 Python 项目中的核心环节

```mermaid
flowchart TD
    A[开发者推送代码] --> B{触发事件}
    B -->|push / PR| C[质量门禁]
    B -->|tag / release| D[发布流水线]

    C --> C1[Ruff lint]
    C --> C2[mypy 类型检查]
    C --> C3[单元测试]
    C --> C4[集成测试]
    C1 & C2 & C3 & C4 --> C5{全部通过?}
    C5 -->|否| C6[阻断合并 / 标记失败]
    C5 -->|是| C7[允许合并 / 生成覆盖率报告]

    D --> D1[语义化版本号]
    D1 --> D2[生成 Changelog]
    D2 --> D3[构建 Wheel / Sdist]
    D3 --> D4[发布到 PyPI]
    D3 --> D5[构建 Docker 镜像]
    D5 --> D6[推送镜像仓库]
    D6 --> D7[部署到目标环境]
    D4 --> D8[创建 GitHub Release]

```

### 各环节职责一览

| 阶段 | 核心任务 | 关键工具 | 失败影响 |
|------|----------|----------|----------|
| 质量门禁 | Lint、格式检查、类型检查 | Ruff、mypy、pyright | 阻断合并 |
| 单元测试 | 验证函数/类级别正确性 | pytest、unittest | 阻断合并 |
| 集成测试 | 验证模块间协作、数据库交互 | pytest + fixtures、testcontainers | 阻断发布 |
| 语义化版本 | 自动计算版本号 | setuptools-scm、hatch-vcs | 发布中断 |
| Changelog | 自动生成变更日志 | towncrier、git-cliff | 信息缺失 |
| 构建产物 | 打包 Wheel 和 Sdist | build、hatchling | 发布中断 |
| PyPI 发布 | 上传到 PyPI | twine、Trusted Publishing | 用户无法安装 |
| Docker 构建 | 打包为容器镜像 | Docker、Buildx | 部署中断 |
| 部署 | 推送到目标环境 | kubectl、SSH、Cloud Run | 服务不可用 |

::: tip 关键认知
CI/CD 的价值不在于"能跑起来"，而在于**失败时能快速定位问题**。每一步都应该有清晰的输出和明确的状态，而不是把所有东西塞进一个巨大的脚本里。
:::

## GitHub Actions 完整流水线

GitHub Actions 是目前开源 Python 项目中使用最广泛的 CI/CD 平台。它的核心概念是 **Workflow**（工作流），由 **Event**（触发事件）、**Job**（作业）和 **Step**（步骤）组成。

### 流水线架构

```mermaid
flowchart LR
    subgraph Quality["质量门禁 Job"]
        Q1[Ruff lint]
        Q2[mypy 检查]
    end

    subgraph Test["测试 Job"]
        T1[单元测试 3.10]
        T2[单元测试 3.11]
        T3[单元测试 3.12]
        T4[集成测试]
    end

    subgraph Build["构建 Job"]
        B1[构建 Wheel]
        B2[构建 Docker 镜像]
    end

    subgraph Publish["发布 Job"]
        P1[发布 PyPI]
        P2[创建 GitHub Release]
    end

    subgraph Deploy["部署 Job"]
        D1[推送镜像]
        D2[部署服务]
    end

    Quality --> Test --> Build --> Publish --> Deploy
```

### 质量门禁 + 测试

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: 质量门禁
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: 安装依赖
        run: |
          pip install --quiet ruff mypy
          pip install --quiet -e ".[dev]"

      - name: Ruff lint
        run: ruff check .

      - name: Ruff format 检查
        run: ruff format --check .

      - name: mypy 类型检查
        run: mypy src/ --ignore-missing-imports

  test:
    name: 测试 (Python ${{ matrix.python-version }})
    needs: quality
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.10", "3.11", "3.12"]
      fail-fast: false

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U test"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - name: 缓存 pip 依赖
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: pip-${{ runner.os }}-${{ matrix.python-version }}-${{ hashFiles('pyproject.toml') }}
          restore-keys: |
            pip-${{ runner.os }}-${{ matrix.python-version }}-

      - name: 安装依赖
        run: |
          pip install --quiet -e ".[dev,test]"

      - name: 运行测试
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
        run: |
          pytest tests/ \
            --cov=src \
            --cov-report=xml \
            --cov-report=term-missing \
            -v --tb=short

      - name: 上传覆盖率
        if: matrix.python-version == '3.12'
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage.xml
          token: ${{ secrets.CODECOV_TOKEN }}
```

### 构建与发布

```yaml
  build:
    name: 构建产物
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # setuptools-scm 需要完整 git 历史

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: 安装构建工具
        run: pip install --quiet build

      - name: 构建 Wheel 和 Sdist
        run: python -m build

      - name: 检查产物
        run: |
          pip install --quiet twine
          twine check dist/*

      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  publish-pypi:
    name: 发布到 PyPI
    needs: build
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    environment: pypi
    permissions:
      id-token: write  # Trusted Publishing 必需

    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      - name: 发布到 PyPI（Trusted Publishing）
        uses: pypa/gh-action-pypi-publish@release/v1

  github-release:
    name: 创建 GitHub Release
    needs: publish-pypi
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: 生成 Changelog
        id: changelog
        run: |
          PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
          if [ -n "$PREV_TAG" ]; then
            LOG=$(git log ${PREV_TAG}..HEAD --pretty=format:"- %s (%h)")
          else
            LOG=$(git log --pretty=format:"- %s (%h)")
          fi
          echo "changelog<<EOF" >> $GITHUB_OUTPUT
          echo "$LOG" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      - name: 创建 Release
        uses: softprops/action-gh-release@v2
        with:
          body: ${{ steps.changelog.outputs.changelog }}
          files: dist/*
```

### 关键配置说明

| 配置项 | 说明 | 推荐值 |
|--------|------|--------|
| `concurrency` | 同一分支的多次推送自动取消旧运行 | 启用，`cancel-in-progress: true` |
| `fail-fast` | 矩阵中某个版本失败后是否取消其他版本 | `false`（保留全部结果） |
| `fetch-depth: 0` | 拉取完整 git 历史 | 使用 setuptools-scm 时必需 |
| `id-token: write` | OIDC 令牌权限 | Trusted Publishing 必需 |
| `environment: pypi` | GitHub Environment | 生产发布必须配置审批人 |

::: warning 关于 Secrets
PyPI 的 API Token 应存储在 GitHub Secrets 中，而非硬编码在 workflow 文件里。更推荐使用 **Trusted Publishing**（OIDC），它不需要任何 Token，直接通过 GitHub 的 OIDC 身份认证发布到 PyPI。
:::

## GitLab CI 配置

GitLab CI 是企业内部 Python 项目中常见的 CI/CD 方案。与 GitHub Actions 相比，GitLab CI 使用 `.gitlab-ci.yml` 单文件配置，原生支持 Docker 执行器和多环境部署。

### 完整配置示例

```yaml
# .gitlab-ci.yml
stages:
  - quality
  - test
  - build
  - publish
  - deploy

variables:
  PIP_CACHE_DIR: "$CI_PROJECT_DIR/.cache/pip"
  POSTGRES_USER: test
  POSTGRES_PASSWORD: test
  POSTGRES_DB: testdb

cache:
  key:
    files:
      - pyproject.toml
  paths:
    - .cache/pip
    - .venv/

# ── 质量门禁 ──
ruff-lint:
  stage: quality
  image: python:3.12-slim
  before_script:
    - pip install --quiet ruff
    - pip install --quiet -e ".[dev]"
  script:
    - ruff check .
    - ruff format --check .

mypy-check:
  stage: quality
  image: python:3.12-slim
  before_script:
    - pip install --quiet mypy
    - pip install --quiet -e ".[dev]"
  script:
    - mypy src/ --ignore-missing-imports

# ── 测试 ──
test:
  stage: test
  image: python:3.12-slim
  services:
    - name: postgres:16
      alias: postgres
  variables:
    DATABASE_URL: postgresql://test:test@postgres:5432/testdb
  before_script:
    - pip install --quiet -e ".[dev,test]"
  script:
    - pytest tests/ --cov=src --cov-report=xml --cov-report=term-missing -v
  coverage: '/TOTAL.*\s+(\d+%)$/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml

# ── 构建 ──
build-wheel:
  stage: build
  image: python:3.12-slim
  script:
    - pip install --quiet build
    - python -m build
  artifacts:
    paths:
      - dist/
    expire_in: 7 days

build-docker:
  stage: build
  image: docker:27
  services:
    - docker:27-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin $CI_REGISTRY
  script:
    - |
      docker build \
        --build-arg VERSION=$CI_COMMIT_TAG \
        -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA \
        -t $CI_REGISTRY_IMAGE:latest \
        .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_COMMIT_TAG

# ── 发布 ──
publish-pypi:
  stage: publish
  image: python:3.12-slim
  needs:
    - build-wheel
  script:
    - pip install --quiet twine
    - twine upload dist/* --username __token__ --password $PYPI_TOKEN
  rules:
    - if: $CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+$/

# ── 部署 ──
deploy-staging:
  stage: deploy
  image: alpine:3.19
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
  script:
    - ssh -o StrictHostKeyChecking=no deploy@staging.example.com "cd /app && docker compose pull && docker compose up -d"
  environment:
    name: staging
    url: https://staging.example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy-production:
  stage: deploy
  extends: deploy-staging
  script:
    - ssh -o StrictHostKeyChecking=no deploy@prod.example.com "cd /app && docker compose pull && docker compose up -d"
  environment:
    name: production
    url: https://app.example.com
  when: manual  # 需要手动触发
  rules:
    - if: $CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+$/
```

### GitHub Actions vs GitLab CI 对比

| 维度 | GitHub Actions | GitLab CI |
|------|---------------|-----------|
| 配置文件 | `.github/workflows/*.yml`（可多文件） | `.gitlab-ci.yml`（单文件） |
| 执行器 | GitHub 托管 / Self-hosted Runner | Docker / Shell / Kubernetes 执行器 |
| 服务容器 | `services` 关键字 | `services` 关键字 |
| 缓存 | `actions/cache` | 内置 `cache` 关键字 |
| 制品 | `actions/upload-artifact` | 内置 `artifacts` 关键字 |
| 环境/审批 | GitHub Environments | GitLab Environments + 手动 Gate |
| 密钥管理 | Repository / Environment Secrets | CI/CD Variables（Project/Group） |
| 矩阵策略 | `strategy.matrix` | 并行 Job + `parallel` + `trigger` |
| 容器镜像构建 | 需额外 Action 或脚本 | 原生 Docker DinD 支持 |
| 学习曲线 | 较低，社区模板丰富 | 中等，语法更紧凑 |
| 适用场景 | 开源项目、小型团队 | 企业内部项目、大型团队 |

::: info 选择建议
如果你的项目是开源的或者团队已经全面使用 GitHub，选择 GitHub Actions；如果公司内部使用 GitLab 自建实例，GitLab CI 是更自然的选择。两者在功能上差异不大，核心区别在于与代码托管平台的集成深度。
:::

## 自动化发布策略

### 语义化版本（Semantic Versioning）

语义化版本格式为 `MAJOR.MINOR.PATCH`，规则如下：

| 版本段 | 递增时机 | 含义 |
|--------|----------|------|
| MAJOR | 不兼容的 API 变更 | 破坏性变更 |
| MINOR | 向后兼容的功能新增 | 新功能 |
| PATCH | 向后兼容的 Bug 修复 | 修复 |

### 使用 setuptools-scm 自动版本号

```toml
# pyproject.toml
[project]
name = "mylib"
dynamic = ["version"]

[tool.setuptools_scm]
# 从 git tag 自动推导版本号
# tag v1.2.3 → version 1.2.3
# tag v1.2.3 + 3 commits → version 1.2.4.dev3+gabc1234
fallback_version = "0.0.0"
```

### 使用 python-semantic-release 自动发布

```toml
# pyproject.toml
[tool.semantic_release]
version_toml = ["pyproject.toml:project.version"]
changelog_file = "CHANGELOG.md"
build_command = "pip install build && python -m build"
dist_path = "dist/"
upload_to_pypi = false  # 由 CI 单独处理发布
major_on_zero = false
allow_zero_version = true
commit_parser = "angular"
```

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    concurrency: release
    permissions:
      contents: write
      id-token: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GH_PAT }}

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: 安装 semantic-release
        run: pip install python-semantic-release

      - name: 运行 semantic-release
        run: semantic-release version

      - name: 构建产物
        run: pip install build && python -m build

      - name: 发布到 PyPI
        uses: pypa/gh-action-pypi-publish@release/v1

      - name: 创建 GitHub Release
        run: semantic-release publish
```

### 使用 towncrier 管理 Changelog

```toml
# pyproject.toml
[tool.towncrier]
package = "mylib"
directory = "changelog.d"
filename = "CHANGELOG.md"
issue_format = "[#{issue}](https://github.com/user/mylib/issues/{issue})"
type = [
    { name = "Breaking Changes",   directory = "breaking", showcontent = true },
    { name = "New Features",       directory = "feature",  showcontent = true },
    { name = "Bug Fixes",          directory = "bugfix",   showcontent = true },
    { name = "Documentation",      directory = "doc",      showcontent = true },
    { name = "Internal Changes",   directory = "internal", showcontent = false },
]
```

```
# changelog.d/ 目录结构
# 每个变更一个文件，格式: <issue_number>.<type>.md
changelog.d/
  42.feature.md    # "新增了用户注册功能"
  57.bugfix.md     # "修复了登录超时问题"
  60.breaking.md   # "移除了废弃的旧 API"
```

```bash
# 发布时自动合并 changelog
towncrier build --version 1.3.0 --yes
# 此命令会：
# 1. 读取 changelog.d/ 下的所有 fragment
# 2. 按类型分组，追加到 CHANGELOG.md
# 3. 删除已合并的 fragment 文件
```

### 发布工具对比

| 工具 | 版本号管理 | Changelog | PyPI 发布 | GitHub Release | 学习成本 |
|------|-----------|-----------|-----------|----------------|----------|
| setuptools-scm | Git tag 自动推导 | 无 | 需配合 twine | 需配合 gh/Action | 低 |
| python-semantic-release | Conventional Commits 自动计算 | 自动生成 | 内置 | 内置 | 中 |
| towncrier | 手动指定 | Fragment 合并（最灵活） | 无 | 无 | 低 |
| commitizen | Conventional Commits | 自动生成 | 需配合 | 需配合 | 低 |

::: tip 推荐组合
**setuptools-scm + towncrier** 是灵活度最高的组合：版本号从 git tag 自动推导，changelog 通过 fragment 精细管理。如果你希望全自动（从 commit message 推导一切），选择 **python-semantic-release**。
:::

## Docker 镜像自动构建与推送

### 多阶段 Dockerfile 最佳实践

```dockerfile
# ── 第一阶段：构建依赖 ──
FROM python:3.12-slim AS builder

WORKDIR /build

# 先复制依赖声明，利用 Docker 缓存层
COPY pyproject.toml README.md ./
COPY src/ src/

# 安装依赖到独立目录
RUN pip install --no-cache-dir --prefix=/install .

# ── 第二阶段：运行时镜像 ──
FROM python:3.12-slim AS runtime

# 安全：非 root 用户运行
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# 仅从 builder 复制已安装的依赖和代码
COPY --from=builder /install /usr/local

# 复制应用代码
COPY src/ src/

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.local/bin:${PATH}"

USER appuser

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Buildx 多平台构建

```yaml
# .github/workflows/docker.yml
name: Docker Build & Push

on:
  push:
    branches: [main]
    tags: ["v*"]

jobs:
  docker:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: 设置 QEMU（多平台模拟）
        uses: docker/setup-qemu-action@v3

      - name: 设置 Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: 登录 GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: 登录 Docker Hub（可选）
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: 提取元数据
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: |
            ghcr.io/${{ github.repository }}
            docker.io/myuser/myapp
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=

      - name: 构建并推送
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            VERSION=${{ github.ref_name }}
```

### 镜像构建优化要点

| 优化项 | 方法 | 效果 |
|--------|------|------|
| 缓存层利用 | 先 COPY pyproject.toml 再 COPY 源码 | 依赖不变时跳过 pip install |
| 多阶段构建 | builder 阶段安装，runtime 阶段复制 | 镜像体积减少 50%+ |
| .dockerignore | 排除 `.git`、`__pycache__`、`.venv` | 减少构建上下文大小 |
| 非 root 用户 | `useradd` + `USER` 指令 | 提升容器安全性 |
| Buildx 缓存 | `cache-from`/`cache-to: type=gha` | 增量构建，CI 时间减半 |
| 多平台构建 | Buildx + QEMU | 同时支持 amd64 和 arm64 |

`.dockerignore` 示例：

```
.git
.github
__pycache__
*.pyc
.pytest_cache
.mypy_cache
.ruff_cache
.venv
venv
*.egg-info
dist
build
docs
tests
*.md
!README.md
```

## 实战场景

### 场景一：Python 库的完整发布流水线

目标：一个 Python 库 `mylib`，在打 tag 后自动完成版本号确认、构建、发布 PyPI、创建 GitHub Release，使用 Trusted Publishing 确保 Token 安全。

```mermaid
sequenceDiagram
    participant Dev as 开发者
    participant Git as GitHub
    participant CI as GitHub Actions
    participant PyPI as PyPI

    Dev->>Git: git tag v1.2.0 && git push --tags
    Git->>CI: 触发 release workflow
    CI->>CI: 检出代码（fetch-depth: 0）
    CI->>CI: setuptools-scm 读取 tag → 1.2.0
    CI->>CI: python -m build → dist/mylib-1.2.0-py3-none-any.whl
    CI->>CI: twine check dist/* → 校验通过
    CI->>PyPI: Trusted Publishing（OIDC 认证）
    PyPI-->>CI: 发布成功
    CI->>Git: 创建 GitHub Release + 上传产物
    Git-->>Dev: Release 页面可见
```

**项目结构：**

```
mylib/
├── pyproject.toml
├── README.md
├── CHANGELOG.md
├── changelog.d/
│   ├── 42.feature.md
│   └── 57.bugfix.md
├── src/
│   └── mylib/
│       ├── __init__.py
│       └── core.py
├── tests/
│   ├── conftest.py
│   └── test_core.py
└── .github/
    └── workflows/
        ├── ci.yml
        └── release.yml
```

**pyproject.toml 关键配置：**

```toml
[project]
name = "mylib"
dynamic = ["version"]
description = "A demonstration library"
readme = "README.md"
requires-python = ">=3.10"
license = "MIT"
authors = [{ name = "Your Name", email = "you@example.com" }]
classifiers = [
    "Development Status :: 4 - Beta",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
]

[project.optional-dependencies]
dev = ["ruff", "mypy"]
test = ["pytest", "pytest-cov"]

[tool.setuptools_scm]
fallback_version = "0.0.0"

[tool.towncrier]
package = "mylib"
directory = "changelog.d"
filename = "CHANGELOG.md"
```

**CI 工作流（.github/workflows/ci.yml）：**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install --quiet ruff mypy -e ".[dev]"
      - run: ruff check .
      - run: ruff format --check .
      - run: mypy src/ --ignore-missing-imports

  test:
    needs: quality
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.10", "3.11", "3.12"]
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - run: pip install --quiet -e ".[test]"
      - run: pytest --cov=mylib --cov-report=xml -v
      - if: matrix.python-version == '3.12'
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

**发布工作流（.github/workflows/release.yml）：**

```yaml
name: Release

on:
  push:
    tags: ["v*"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install --quiet build twine
      - run: python -m build
      - run: twine check dist/*
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  publish:
    needs: build
    runs-on: ubuntu-latest
    environment: pypi
    permissions:
      id-token: write
      contents: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      - name: 发布到 PyPI
        uses: pypa/gh-action-pypi-publish@release/v1

      - name: 创建 GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
          files: dist/*
```

**Trusted Publishing 配置步骤：**

1. 在 PyPI 项目设置中，进入 "Publishing" 页面
2. 添加一个新的 Trusted Publisher：
   - Owner: 你的 GitHub 用户名或组织
   - Repository: 仓库名
   - Workflow filename: `release.yml`
   - Environment name: `pypi`
3. 在 GitHub 仓库中创建名为 `pypi` 的 Environment（Settings → Environments）
4. 无需配置任何 Secret，OIDC 自动完成认证

### 场景二：FastAPI 服务的 Docker 自动部署

目标：一个 FastAPI 服务 `myapi`，每次合并到 main 分支自动构建 Docker 镜像、推送到镜像仓库、部署到服务器。

```mermaid
sequenceDiagram
    participant Dev as 开发者
    participant Git as GitHub
    participant CI as GitHub Actions
    participant Registry as GHCR
    participant Server as 生产服务器

    Dev->>Git: PR 合并到 main
    Git->>CI: 触发 deploy workflow
    CI->>CI: 质量门禁 + 测试
    CI->>CI: docker build → myapi:sha-abc1234
    CI->>Registry: docker push myapi:sha-abc1234 + myapi:latest
    CI->>Server: SSH 执行 docker compose pull && up -d
    Server->>Registry: docker pull myapi:latest
    Server-->>CI: 部署完成
    CI-->>Dev: 通知部署结果
```

**项目结构：**

```
myapi/
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── src/
│   └── myapi/
│       ├── __init__.py
│       ├── main.py
│       ├── config.py
│       ├── routers/
│       │   └── users.py
│       └── models.py
├── tests/
│   ├── conftest.py
│   └── test_users.py
├── alembic/
│   └── versions/
├── alembic.ini
└── .github/
    └── workflows/
        ├── ci.yml
        └── deploy.yml
```

**Dockerfile：**

```dockerfile
# ── 构建阶段 ──
FROM python:3.12-slim AS builder

WORKDIR /build

# 安装系统依赖（如 PostgreSQL 客户端库）
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY src/ src/

RUN pip install --no-cache-dir --prefix=/install ".[prod]"

# ── 运行阶段 ──
FROM python:3.12-slim AS runtime

RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

COPY --from=builder /install /usr/local
COPY src/ src/
COPY alembic/ alembic/
COPY alembic.ini .

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "src.myapi.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

**docker-compose.prod.yml：**

```yaml
services:
  api:
    image: ghcr.io/myuser/myapi:latest
    container_name: myapi
    restart: unless-stopped
    ports:
      - "8000:8000"
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
      interval: 30s
      timeout: 5s
      retries: 3

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

**部署工作流（.github/workflows/deploy.yml）：**

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U test"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install --quiet -e ".[test]"
      - run: pytest -v
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

  docker-build-push:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.sha }}
            ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: docker-build-push
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: 部署到生产服务器
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/myapi
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d --remove-orphans
            docker image prune -f

      - name: 健康检查
        run: |
          sleep 10
          curl -f https://app.example.com/health || exit 1

      - name: 通知部署结果
        if: always()
        run: |
          STATUS="${{ job.status }}"
          curl -X POST "${{ secrets.NOTIFICATION_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"部署 ${{ github.repository }} 到生产环境: $STATUS\"}"
```

::: warning 部署安全提示
- SSH 私钥必须存储在 GitHub Secrets 中，永远不要硬编码
- 生产环境应配置 Environment Protection Rules（需要审批人确认才能部署）
- 部署后务必执行健康检查，确认服务可用
- 保留回滚入口：每次部署前记录当前镜像版本，失败时可快速 `docker compose down && docker tag ... && docker compose up -d`
:::

## 常见陷阱

| 陷阱 | 现象 | 原因 | 解决方案 |
|------|------|------|----------|
| 忽略 `fetch-depth` | setuptools-scm 报错找不到版本号 | 默认浅克隆只有 1 层历史 | 设置 `fetch-depth: 0` 获取完整历史 |
| 硬编码 Python 版本 | 升级 Python 后流水线到处改 | 多处写死 `python-version` | 使用矩阵 + 顶层变量集中管理 |
| 不缓存 pip 依赖 | 每次安装依赖耗时 2-5 分钟 | CI 环境每次全新创建 | 使用 `actions/cache` 缓存 `~/.cache/pip` |
| PyPI Token 泄露 | Token 出现在日志或代码中 | 将 Token 写入 workflow 明文 | 使用 Trusted Publishing（OIDC）或 Secrets |
| Docker 镜像过大 | 镜像超过 1GB，拉取缓慢 | 单阶段构建包含编译工具 | 多阶段构建，runtime 仅复制产物 |
| 测试依赖生产环境 | 集成测试连真实数据库 | 测试不稳定，数据被污染 | 使用 `services` 启动临时容器 |
| 不设置 `concurrency` | 同一分支多个运行并行浪费资源 | 每次推送都创建新运行 | 配置 `concurrency` + `cancel-in-progress` |
| 忽略 `.dockerignore` | 构建上下文包含 `.git` 等无用文件 | 构建缓慢，镜像可能包含敏感信息 | 编写完善的 `.dockerignore` |
| 发布前不检查产物 | Wheel 包损坏上传到 PyPI | 构建过程出错但未验证 | 使用 `twine check dist/*` 验证 |
| 部署后无健康检查 | 服务启动失败但流水线显示成功 | 部署命令成功不等于服务可用 | 部署后添加 HTTP 健康检查步骤 |
| 不区分 CI 和 Release 触发 | 每次推送都尝试发布到 PyPI | 缺少 `if: startsWith(github.ref, 'refs/tags/v')` 条件 | Release Job 仅在 tag 推送时触发 |
| 合并前不跑 CI | 主分支频繁红灯 | 未配置分支保护规则 | GitHub 设置中开启 "Require status checks" |

## 最佳实践速查表

### 流水线设计原则

| 原则 | 说明 |
|------|------|
| **快速反馈** | 质量门禁应在 2-3 分钟内完成，测试应在 10 分钟内完成 |
| **失败即停** | 质量检查失败则不运行测试，测试失败则不构建 |
| **幂等性** | 同一 workflow 可以安全重复运行，不会产生副作用 |
| **最小权限** | 每个 Job 仅声明所需权限（`permissions`） |
| **可观测性** | 每个步骤有清晰的名称和输出 |

### 版本发布检查清单

- [ ] 所有 CI 测试通过（绿标）
- [ ] `CHANGELOG.md` 已更新（或 changelog.d fragment 已合并）
- [ ] 版本号已确认（git tag 格式 `vX.Y.Z`）
- [ ] `pyproject.toml` 中的 `requires-python` 与 CI 矩阵一致
- [ ] Trusted Publishing 已在 PyPI 配置完成
- [ ] GitHub Environment 已配置审批人（生产发布需人工确认）

### Docker 镜像检查清单

- [ ] 使用多阶段构建，runtime 不含编译工具
- [ ] 以非 root 用户运行（`USER appuser`）
- [ ] 包含 `HEALTHCHECK` 指令
- [ ] `.dockerignore` 排除了 `.git`、`__pycache__`、`.venv` 等
- [ ] 依赖安装前复制 `pyproject.toml`，利用缓存层
- [ ] 镜像标签包含 git SHA，可追溯版本

### 安全检查清单

- [ ] 所有密钥通过 Secrets/Variables 管理，不硬编码
- [ ] PyPI 发布使用 Trusted Publishing 而非 API Token
- [ ] 生产部署需要 Environment 审批
- [ ] 容器镜像定期扫描漏洞（`docker scout` / Trivy）
- [ ] SSH 部署使用专用密钥，不是个人密钥

## 术语表

| 术语 | 说明 |
|------|------|
| CI | 持续集成（Continuous Integration），自动验证每次代码提交的质量 |
| CD | 持续交付/部署（Continuous Delivery / Continuous Deployment），自动将通过验证的代码发布到目标环境 |
| Pipeline | 流水线，CI/CD 中从代码提交到部署的完整自动化流程 |
| Workflow | GitHub Actions 中的工作流，由事件触发、包含多个 Job 的自动化配置 |
| Job | 流水线中的一个作业，由多个 Step 组成，可并行或串行执行 |
| Step | Job 中的最小执行单元，对应一条命令或一个 Action |
| Action | GitHub Actions 中的可复用组件，封装了常用操作（如检出代码、设置 Python） |
| Runner | 执行 Workflow 的服务器，GitHub 提供托管 Runner 或可自建 |
| Matrix | 矩阵策略，用一组参数（如多个 Python 版本）组合出多个并行 Job |
| Artifact | 构建产物，CI 中生成的文件（如 Wheel、测试报告），可在 Job 间传递 |
| Trusted Publishing | PyPI 的 OIDC 发布机制，无需 API Token，通过 GitHub 身份认证直接发布 |
| semantic versioning | 语义化版本，格式 MAJOR.MINOR.PATCH，明确表达版本间兼容性 |
| setuptools-scm | 从 git tag 自动推导 Python 包版本号的工具 |
| towncrier | 基于 Fragment 的 Changelog 管理工具 |
| Docker Buildx | Docker 的扩展构建工具，支持多平台构建和缓存 |
| GHCR | GitHub Container Registry，GitHub 的容器镜像仓库 |
| OIDC | OpenID Connect，一种身份认证协议，Trusted Publishing 基于此实现 |
| Environment | GitHub 中的部署环境，可配置审批人、密钥和部署保护规则 |
| Conventional Commits | 约定式提交，一种 commit message 规范，用于自动推导版本号和 Changelog |
| Healthcheck | Docker 容器健康检查，定期检测服务是否正常运行 |

## 延伸阅读

- GitHub Actions 官方文档：https://docs.github.com/en/actions
- GitLab CI/CD 官方文档：https://docs.gitlab.com/ee/ci/
- PyPI Trusted Publishing 指南：https://docs.pypi.org/trusted-publishers/
- Python Semantic Release：https://python-semantic-release.readthedocs.io/
- towncrier 官方文档：https://towncrier.readthedocs.io/
- Docker Buildx 文档：https://docs.docker.com/build/buildx/
- Docker 多阶段构建：https://docs.docker.com/build/building/multi-stage/
- setuptools-scm 文档：https://setuptools-scm.readthedocs.io/
- Conventional Commits 规范：https://www.conventionalcommits.org/
- Semantic Versioning 规范：https://semver.org/
- pytest 在 CI 中的最佳实践：https://docs.pytest.org/en/stable/guides/ci.html
