---
title: CI/CD 持续集成与持续部署
description: Node.js 项目 CI/CD 速查：GitHub Actions/Jenkins/GitLab CI/CircleCI 工具对比、workflow 触发器与矩阵构建、Jenkinsfile 声明式与脚本式语法、密钥管理、通知集成、蓝绿/金丝雀部署与故障排查。
keywords: [Node.js, CI/CD, GitHub Actions, Jenkins, GitLab CI]
category: 部署与运维实践
tags: [Node.js, 部署运维]
---

# CI/CD 持续集成与持续部署

## 什么是 CI/CD？

### CI（Continuous Integration）持续集成

开发人员频繁地将代码集成到主干分支，每次集成都通过自动化构建和测试来验证，从而尽早发现集成错误。

**核心目标：**
- 快速发现集成错误
- 自动化构建和测试流程
- 提高代码质量和团队协作效率

### CD（Continuous Delivery/Deployment）持续交付/部署

- **持续交付（Continuous Delivery）**：代码通过自动化测试后，自动部署到预生产环境，需要手动触发生产部署
- **持续部署（Continuous Deployment）**：代码通过所有测试后，自动部署到生产环境，无需人工干预

### CI/CD 流水线架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CI/CD 流水线架构                              │
└─────────────────────────────────────────────────────────────────────┘

  开发阶段          测试阶段          构建阶段          部署阶段
  ─────────        ─────────        ─────────        ─────────
  
  代码提交    →    自动测试    →    构建打包    →    环境部署
     │                  │                  │                  │
     ├─ Git Push        ├─ 单元测试        ├─ 编译代码        ├─ 开发环境
     ├─ 代码检查        ├─ 集成测试        ├─ 打包资源        ├─ 测试环境
     ├─ 分支管理        ├─ E2E测试         ├─ 镜像构建        ├─ 预发布环境
     └─ PR审核          └─ 代码覆盖率      └─ 产物存储        └─ 生产环境

        ↓                  ↓                  ↓                  ↓
   [Source Code]     [Test Report]     [Artifacts]      [Deployment]
```

### CI/CD 流水线完整流程

```
代码提交 → 代码检查 → 构建 → 单元测试 → 集成测试 → 构建镜像 → 部署到开发环境 
    → 部署到测试环境 → 手动审批 → 部署到生产环境 → 监控反馈
```

## CI/CD 工具对比

| 工具 | 适用场景 | 优势 | 不足 |
|------|---------|------|------|
| **GitHub Actions** | GitHub 托管项目 | 与 GitHub 深度集成、配置简单、免费额度充足 | 仅限 GitHub 平台 |
| **GitLab CI/CD** | GitLab 托管项目 | 内置完整 DevOps 功能、自托管支持好 | 配置相对复杂 |
| **Jenkins** | 企业级项目 | 插件生态丰富、高度可定制 | 维护成本高、需要专门服务器 |
| **Travis CI** | 开源项目 | 配置简单、对开源项目免费 | 商业版价格较高 |
| **CircleCI** | 中小型团队 | 构建速度快、Docker 支持好 | 免费额度有限 |

## GitHub Actions

GitHub 提供的自动化平台，可以构建、测试和部署代码。

### 核心概念

- **Workflow（工作流）**：一个自动化流程，定义在 YAML 文件中
- **Job（任务）**：工作流中的一个执行单元，由多个步骤组成
- **Step（步骤）**：任务中的一个操作，可以执行命令或使用 Action
- **Action（动作）**：可重用的操作单元，可以是脚本或 Docker 容器
- **Event（事件）**：触发工作流的事件，如 push、pull_request、schedule

### 目录结构

```
.github/
└── workflows/
    ├── ci.yml           # 持续集成工作流
    ├── cd.yml           # 持续部署工作流
    ├── release.yml      # 发布工作流
    └── schedule.yml     # 定时任务工作流
```

### 基础配置文件

在项目根目录创建 `.github/workflows/ci.yml`：

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [20.x, 22.x]
    
    steps:
    - name: 检出代码
      uses: actions/checkout@v4
    
    - name: 设置 Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: 安装依赖
      run: npm ci
    
    - name: 运行代码检查
      run: npm run lint
    
    - name: 运行测试
      run: npm test
    
    - name: 构建项目
      run: npm run build
    
    - name: 上传构建产物
      uses: actions/upload-artifact@v4
      with:
        name: dist
        path: dist/
```

### 配置参数详解

#### 触发器配置（on）

```yaml
on:
  # 推送到特定分支时触发
  push:
    branches: [ main, develop ]
    # 只在特定文件变更时触发
    paths:
      - 'src/**'
      - 'package.json'
  
  # Pull Request 事件
  pull_request:
    branches: [ main ]
    types: [ opened, synchronize, reopened ]
  
  # 定时任务（Cron 表达式：分 时 日 月 周）
  schedule:
    - cron: '0 2 * * *'  # 每天凌晨 2 点执行
  
  # 手动触发
  workflow_dispatch:
    inputs:
      environment:
        description: '部署环境'
        required: true
        default: 'dev'
        type: choice
        options:
        - dev
        - staging
        - prod
  
  # 其他工作流完成后触发
  workflow_call:
    inputs:
      config-path:
        required: true
        type: string
```

#### 环境变量配置（env）

```yaml
env:
  # 全局环境变量
  NODE_VERSION: '22.x'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      # Job 级别环境变量
      BUILD_ENV: production
    steps:
      - name: 构建步骤
        env:
          # 步骤级别环境变量
          API_KEY: ${{ secrets.API_KEY }}
        run: echo $BUILD_ENV
```

#### 条件执行（if）

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    # 仅在 main 分支执行
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: 仅在成功时执行
        if: success()
        run: echo "构建成功"
      
      - name: 仅在失败时执行
        if: failure()
        run: echo "构建失败"
      
      - name: 总是执行（无论成功或失败）
        if: always()
        run: echo "清理工作"
```

#### 矩阵构建（matrix）

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      # 是否在某个任务失败时取消其他任务
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [20.x, 22.x]
        # 排除特定组合
        exclude:
          - os: macos-latest
            node-version: 16.x
        # 包含特定组合
        include:
          - os: ubuntu-latest
            node-version: 20.x
            experimental: true
    
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
```

#### 缓存配置

```yaml
steps:
  # 缓存 npm 依赖
  - name: 缓存 Node 模块
    uses: actions/cache@v4
    id: cache-npm
    with:
      path: ~/.npm
      key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
      restore-keys: |
        ${{ runner.os }}-node-
  
  # 使用 setup-node 内置缓存
  - name: 设置 Node.js
    uses: actions/setup-node@v4
    with:
      node-version: '22.x'
      cache: 'npm'  # 或 'yarn'、'pnpm'
  
  # 缓存多个路径
  - name: 缓存多个路径
    uses: actions/cache@v4
    with:
      path: |
        ~/cache
        !~/cache/exclude
        **/node_modules
      key: ${{ runner.os }}-multi-cache-${{ hashFiles('**/package-lock.json') }}
```

#### 产物管理

```yaml
jobs:
  build:
    steps:
      # 上传构建产物
      - name: 上传构建产物
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: |
            dist/
            build/
          retention-days: 5  # 保留天数，默认 90 天
      
      # 下载其他 Job 的产物
      - name: 下载产物
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: ./downloaded
```

### 完整的 CI/CD 配置

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  release:
    types: [ created ]

env:
  NODE_VERSION: '22.x'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # 测试任务
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: 安装依赖
        run: npm ci
      
      - name: 代码检查
        run: npm run lint
      
      - name: 运行测试
        run: npm test -- --coverage
      
      - name: 上传覆盖率报告
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # 构建任务
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: 安装依赖
        run: npm ci
      
      - name: 构建
        run: npm run build
      
      - name: 上传构建产物
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/

  # 构建并推送 Docker 镜像
  docker:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      
      - name: 登录 GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: 提取 Docker 元数据
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}
      
      - name: 构建并推送 Docker 镜像
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  # 部署到开发环境
  deploy-dev:
    needs: docker
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment:
      name: development
      url: https://dev.example.com
    steps:
      - name: 部署到开发服务器
        run: |
          echo "部署到开发环境"
          # ssh user@dev-server "cd /app && docker-compose pull && docker-compose up -d"

  # 部署到生产环境
  deploy-prod:
    needs: docker
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://example.com
    steps:
      - name: 部署到生产服务器
        run: |
          echo "部署到生产环境"
          # ssh user@prod-server "cd /app && docker-compose pull && docker-compose up -d"
```

## Jenkins

Jenkins 是一个开源的自动化服务器，提供 2000+ 插件支持构建、部署和自动化任何项目。

### 核心概念

- **Pipeline（流水线）**：定义整个构建过程的脚本，使用 Groovy DSL
- **Stage（阶段）**：流水线中的逻辑分组，可视化展示进度
- **Step（步骤）**：具体的操作单元，如执行命令、发送通知
- **Agent（代理）**：执行流水线的节点（Jenkins 官方现称 Controller/Agent，旧称 Master/Slave）
- **Node（节点）**：Jenkins 执行环境，包含执行器和文件系统

### Pipeline 语法类型

- **Declarative Pipeline（声明式）**：结构清晰，适合简单场景
- **Scripted Pipeline（脚本式）**：灵活性高，适合复杂逻辑

### Jenkinsfile 示例

#### 声明式 Pipeline

```groovy
pipeline {
  agent any
  
  environment {
    NODE_VERSION = '22'
    REGISTRY = 'registry.example.com'
    IMAGE_NAME = 'myapp'
  }
  
  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }
    
    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }
    
    stage('Lint') {
      steps {
        sh 'npm run lint'
      }
    }
    
    stage('Test') {
      steps {
        sh 'npm test -- --coverage'
      }
      post {
        always {
          junit 'coverage/junit.xml'
          publishHTML([
            allowMissing: false,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: 'coverage',
            reportFiles: 'index.html',
            reportName: 'Coverage Report'
          ])
        }
      }
    }
    
    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }
    
    stage('Docker Build') {
      steps {
        sh "docker build -t ${REGISTRY}/${IMAGE_NAME}:${BUILD_NUMBER} ."
      }
    }
    
    stage('Docker Push') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'docker-registry',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh "docker login -u ${DOCKER_USER} -p ${DOCKER_PASS} ${REGISTRY}"
          sh "docker push ${REGISTRY}/${IMAGE_NAME}:${BUILD_NUMBER}"
        }
      }
    }
    
    stage('Deploy to Dev') {
      when {
        branch 'develop'
      }
      steps {
        sh "ssh user@dev-server 'cd /app && docker-compose pull && docker-compose up -d'"
      }
    }
    
    stage('Deploy to Prod') {
      when {
        branch 'main'
      }
      steps {
        input message: '确认部署到生产环境?', ok: '部署'
        sh "ssh user@prod-server 'cd /app && docker-compose pull && docker-compose up -d'"
      }
    }
  }
  
  post {
    always {
      cleanWs()
    }
    success {
      echo '构建成功!'
      // slackSend color: 'good', message: "构建成功: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
    }
    failure {
      echo '构建失败!'
      // slackSend color: 'danger', message: "构建失败: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
    }
  }
}
```

#### 脚本式 Pipeline

```groovy
node {
  try {
    stage('Checkout') {
      checkout scm
    }
    
    stage('Build') {
      sh 'npm ci'
      sh 'npm run build'
    }
    
    stage('Test') {
      parallel(
        unitTests: {
          sh 'npm run test:unit'
        },
        integrationTests: {
          sh 'npm run test:integration'
        }
      )
    }
    
    stage('Deploy') {
      if (env.BRANCH_NAME == 'main') {
        input message: '确认部署到生产环境?', ok: '部署'
        sh './scripts/deploy.sh production'
      } else {
        sh './scripts/deploy.sh staging'
      }
    }
    
  } catch (Exception e) {
    currentBuild.result = 'FAILURE'
    throw e
  } finally {
    // 清理工作空间
    cleanWs()
    // 发送通知
    notifyBuild(currentBuild.result)
  }
}

def notifyBuild(String buildStatus) {
  if (buildStatus == null) {
    buildStatus = 'SUCCESS'
  }
  // 发送通知逻辑
  echo "构建状态: ${buildStatus}"
}
```

### Jenkins 配置参数详解

#### Agent 配置

```groovy
pipeline {
  // 在任何可用代理上执行
  agent any
  
  // 使用特定标签的代理
  agent { label 'linux && docker' }
  
  // 使用 Docker 容器
  agent {
    docker {
      image 'node:22'
      args '-p 3000:3000'
    }
  }
  
  // 使用 Kubernetes Pod
  agent {
    kubernetes {
      yaml '''
        apiVersion: v1
        kind: Pod
        spec:
          containers:
          - name: node
            image: node:22
            command:
            - cat
            tty: true
      '''
    }
  }
}
```

#### 环境变量

```groovy
pipeline {
  agent any
  
  environment {
    // 静态变量
    NODE_VERSION = '22'
    REGISTRY = 'registry.example.com'
    
    // 使用 credentials
    DOCKER_CREDS = credentials('docker-registry')
    
    // 动态变量
    BUILD_TAG = "${env.JOB_NAME}-${env.BUILD_NUMBER}"
  }
  
  stages {
    stage('Example') {
      steps {
        script {
          // 访问环境变量
          echo "Node Version: ${env.NODE_VERSION}"
          echo "Build Tag: ${env.BUILD_TAG}"
          
          // 设置环境变量
          env.DEPLOY_ENV = 'production'
        }
      }
    }
  }
}
```

#### 参数化构建

```groovy
pipeline {
  agent any
  
  parameters {
    string(name: 'BRANCH', defaultValue: 'main', description: '构建分支')
    booleanParam(name: 'DEPLOY', defaultValue: false, description: '是否部署')
    choice(name: 'ENVIRONMENT', choices: ['dev', 'staging', 'prod'], description: '部署环境')
    password(name: 'API_KEY', defaultValue: '', description: 'API 密钥')
  }
  
  stages {
    stage('Build') {
      steps {
        echo "构建分支: ${params.BRANCH}"
        echo "部署环境: ${params.ENVIRONMENT}"
      }
    }
  }
}
```

#### 并行执行

```groovy
pipeline {
  agent any
  stages {
    stage('Parallel Tests') {
      parallel {
        stage('Unit Tests') {
          steps {
            sh 'npm run test:unit'
          }
        }
        stage('Integration Tests') {
          steps {
            sh 'npm run test:integration'
          }
        }
        stage('E2E Tests') {
          steps {
            sh 'npm run test:e2e'
          }
        }
      }
    }
  }
}
```

#### 条件判断

```groovy
pipeline {
  agent any
  stages {
    stage('Deploy') {
      when {
        branch 'main'  // 仅在 main 分支执行
      }
      steps {
        sh './deploy.sh'
      }
    }
    
    stage('Deploy by Tag') {
      when {
        tag pattern: 'v\\d+\\.\\d+\\.\\d+', comparator: 'REGEXP'
      }
      steps {
        sh './deploy.sh'
      }
    }
    
    stage('Deploy by Expression') {
      when {
        expression {
          return env.BRANCH_NAME == 'main' && params.DEPLOY
        }
      }
      steps {
        sh './deploy.sh'
      }
    }
  }
}
```

### 常用 Jenkins 插件

| 插件名称 | 功能说明 |
|---------|---------|
| **Pipeline** | 支持 Pipeline 语法 |
| **Git** | Git 仓库集成 |
| **Docker Pipeline** | Docker 操作支持 |
| **Blue Ocean** | 现代化 UI 界面 |
| **Credentials Binding** | 凭据管理 |
| **Email Extension** | 邮件通知增强 |
| **Slack Notification** | Slack 通知 |
| **JUnit** | 测试报告展示 |
| **Cobertura** | 代码覆盖率报告 |

## 其他 CI/CD 工具

### Travis CI

适合开源项目的 CI/CD 平台，配置简单。

#### 配置文件 `.travis.yml`

```yaml
language: node_js
node_js:
  - 20
  - 22

# 构建缓存
cache:
  directories:
    - node_modules

# 构建阶段
stages:
  - test
  - name: deploy
    if: branch = main AND type = push

# 环境变量
env:
  global:
    - NODE_ENV=test
  matrix:
    - TEST_SUITE=unit
    - TEST_SUITE=integration

# 构建前执行
before_install:
  - npm install -g npm@latest

# 安装依赖
install:
  - npm ci

# 执行脚本
script:
  - npm run lint
  - npm test

# 部署配置
jobs:
  include:
    - stage: deploy
      node_js: 22
      script: skip
      deploy:
        provider: heroku
        app: myapp
        api_key: $HEROKU_API_KEY
        on:
          branch: main

# 通知
notifications:
  email:
    recipients:
      - team@example.com
    on_success: change
    on_failure: always
```

### CircleCI

专注于速度和可靠性的 CI/CD 平台。

#### 配置文件 `.circleci/config.yml`

```yaml
version: 2.1

# 定义命令
commands:
  setup-node:
    steps:
      - checkout
      - restore_cache:
          keys:
            - v1-deps-{{ .Branch }}-{{ checksum "package-lock.json" }}
            - v1-deps-{{ .Branch }}-
            - v1-deps-
      - run: npm ci
      - save_cache:
          key: v1-deps-{{ .Branch }}-{{ checksum "package-lock.json" }}
          paths:
            - node_modules

# 定义执行器
executors:
  node:
    docker:
      - image: cimg/node:22.0

# 定义任务
jobs:
  build:
    executor: node
    steps:
      - setup-node
      - run: npm run build
      - persist_to_workspace:
          root: .
          paths:
            - dist
  
  test:
    executor: node
    steps:
      - setup-node
      - run: npm test
      - store_test_results:
          path: coverage
      - store_artifacts:
          path: coverage
  
  deploy:
    executor: node
    steps:
      - attach_workspace:
          at: .
      - run:
          name: 部署到生产环境
          command: |
            ssh user@server "cd /app && docker-compose pull && docker-compose up -d"

# 工作流
workflows:
  version: 2
  build-test-deploy:
    jobs:
      - build
      - test:
          requires:
            - build
      - deploy:
          requires:
            - test
          filters:
            branches:
              only: main
```

## 自动化测试集成

### 测试类型和策略

```
┌─────────────────────────────────────────────────────────┐
│                    测试金字塔                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                     E2E 测试                             │
│                   (端到端测试)                           │
│                    执行慢/数量少                         │
│                                                         │
│               ────────────────────                      │
│                                                         │
│                 集成测试                                 │
│              (API/组件集成测试)                          │
│                执行中等/数量中等                          │
│                                                         │
│           ──────────────────────────────                │
│                                                         │
│              单元测试                                    │
│           (函数/组件单元测试)                            │
│            执行快/数量多                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 测试配置示例

#### Jest 配置

```javascript
// jest.config.js
module.exports = {
  // 测试环境
  testEnvironment: 'node',
  
  // 覆盖率配置
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/index.js'
  ],
  coverageReporters: ['text', 'lcov', 'cobertura', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // 测试匹配模式
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  
  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // 超时时间
  testTimeout: 10000,
  
  // 并行执行
  maxWorkers: '50%'
};
```

#### 测试脚本配置

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e --runInBand"
  }
}
```

### GitHub Actions 测试配置

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      fail-fast: false
      matrix:
        node-version: [20.x, 22.x]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: 设置 Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: 安装依赖
        run: npm ci
      
      - name: 运行测试
        run: npm run test:ci
      
      - name: 上传覆盖率报告
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/cobertura-coverage.xml
          flags: unittests
          name: codecov-umbrella
      
      - name: 上传测试结果
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-${{ matrix.node-version }}
          path: |
            coverage/
            test-results/
```

### 测试报告集成

```yaml
# GitHub Actions 测试报告
- name: 发布测试报告
  uses: dorny/test-reporter@v1
  if: success() || failure()
  with:
    name: Jest Tests
    path: test-results/junit.xml
    reporter: jest-junit
```

```yaml
# GitLab CI/CD 测试报告
test:
  stage: test
  variables:
    JEST_JUNIT_OUTPUT_DIR: ./test-results
    JEST_JUNIT_OUTPUT_NAME: junit.xml
  script:
    - npm test -- --ci --reporters=default --reporters=jest-junit
  artifacts:
    when: always
    reports:
      junit: test-results/junit.xml
    paths:
      - coverage/
```

## 环境变量与密钥管理

### 环境变量管理策略

```
┌─────────────────────────────────────────────────────────┐
│                环境变量管理层次                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CI/CD 平台 Secrets (最敏感)                             │
│  └─ 数据库密码、API 密钥等                               │
│                                                         │
│  环境配置文件 (.env.{environment})                      │
│  └─ 环境特定的配置                                       │
│                                                         │
│  项目配置文件 (config/*.{environment}.js)               │
│  └─ 应用配置                                            │
│                                                         │
│  代码中的默认值                                          │
│  └─ 开发环境的默认配置                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### GitHub Secrets 管理

在仓库 `Settings → Secrets and variables → Actions` 中配置：

#### Repository Secrets（仓库级别）

```yaml
# 敏感信息
DATABASE_URL: postgresql://user:pass@host:5432/db
API_KEY: sk-xxxxxxxxxxxx
DOCKER_PASSWORD: your-docker-password
```

#### Environment Secrets（环境级别）

```yaml
# 开发环境
DEV_API_URL: https://dev.api.example.com
DEV_DATABASE_URL: postgresql://dev:pass@dev-host:5432/db

# 生产环境
PROD_API_URL: https://api.example.com
PROD_DATABASE_URL: postgresql://prod:pass@prod-host:5432/db
```

#### 在 Workflow 中使用

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    steps:
      - name: 使用密钥
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}
        run: |
          # 密钥会被自动脱敏显示
          echo "Database URL: ${DATABASE_URL:0:10}***"
          
          # 创建 .env 文件
          cat > .env << EOF
          DATABASE_URL=${{ secrets.DATABASE_URL }}
          API_KEY=${{ secrets.API_KEY }}
          NODE_ENV=production
          EOF
```

### GitLab CI/CD 变量管理

在项目 `Settings → CI/CD → Variables` 中配置：

#### 变量类型

- **Variable**：普通环境变量
- **File**：文件类型变量（如 SSH 私钥）
- **Masked**：脱敏显示
- **Protected**：仅在受保护分支可用

```yaml
# .gitlab-ci.yml
variables:
  # 普通变量
  NODE_VERSION: '22'
  
  # 覆盖变量
  REGISTRY: registry.example.com

deploy:
  script:
    # 使用预定义变量
    - echo "Project: $CI_PROJECT_NAME"
    - echo "Branch: $CI_COMMIT_REF_NAME"
    - echo "Commit: $CI_COMMIT_SHA"
    
    # 使用自定义变量
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $REGISTRY
```

### Jenkins 凭据管理

在 `Manage Jenkins → Credentials` 中配置：

#### 凭据类型

- **Username with password**：用户名密码
- **SSH Username with private key**：SSH 私钥
- **Secret file**：机密文件
- **Secret text**：机密文本
- **Certificate**：证书

```groovy
pipeline {
  agent any
  stages {
    stage('Deploy') {
      steps {
        // 使用用户名密码
        withCredentials([usernamePassword(
          credentialsId: 'docker-registry',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh 'docker login -u $DOCKER_USER -p $DOCKER_PASS'
        }
        
        // 使用 SSH 私钥
        withCredentials([sshUserPrivateKey(
          credentialsId: 'deploy-key',
          keyFileVariable: 'SSH_KEY'
        )]) {
          sh 'ssh -i $SSH_KEY user@server'
        }
        
        // 使用机密文本
        withCredentials([string(
          credentialsId: 'api-key',
          variable: 'API_KEY'
        )]) {
          sh 'curl -H "Authorization: Bearer $API_KEY" https://api.example.com'
        }
        
        // 使用机密文件
        withCredentials([file(
          credentialsId: 'google-service-account',
          variable: 'GOOGLE_CREDENTIALS'
        )]) {
          sh 'gcloud auth activate-service-account --key-file=$GOOGLE_CREDENTIALS'
        }
      }
    }
  }
}
```

### 环境变量文件模板

```bash
# .env.example - 模板文件（提交到 Git）
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/mydb
REDIS_URL=redis://localhost:6379
API_KEY=your-api-key-here
```

```bash
# .env - 实际配置文件（不提交到 Git）
NODE_ENV=production
PORT=80
DATABASE_URL=postgresql://prod:password@prod-db:5432/mydb
REDIS_URL=redis://prod-redis:6379
API_KEY=sk-real-api-key-1234567890
```

```yaml
# CI/CD 中使用模板
- name: 创建环境配置
  run: |
    cp .env.example .env
    # 替换敏感信息
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=${{ secrets.DATABASE_URL }}|" .env
    sed -i "s|API_KEY=.*|API_KEY=${{ secrets.API_KEY }}|" .env
```

## 通知集成

### 通知策略

```
┌─────────────────────────────────────────────────────────┐
│                    通知触发时机                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ 构建成功      → 开发团队                             │
│  ❌ 构建失败      → 开发团队 + 技术负责人                 │
│  🚀 部署到测试    → 开发团队 + 测试团队                   │
│  🚀 部署到生产    → 全体相关方                           │
│  ⚠️ 回滚操作      → 技术负责人 + 运维团队                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Slack 通知

```yaml
- name: Slack 通知
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    fields: repo,message,commit,author,action
    channel: '#deployments'
    text: |
      构建状态: ${{ job.status }}
      分支: ${{ github.ref }}
      提交: ${{ github.sha }}
      作者: ${{ github.actor }}
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 钉钉通知

```yaml
- name: 钉钉通知
  if: always()
  run: |
    curl -X POST "${{ secrets.DINGTALK_WEBHOOK }}" \
      -H 'Content-Type: application/json' \
      -d '{
        "msgtype": "markdown",
        "markdown": {
          "title": "构建通知",
          "text": "### 构建通知\n- 状态: ${{ job.status }}\n- 分支: ${{ github.ref }}\n- 提交人: ${{ github.actor }}"
        }
      }'
```

### 邮件通知

```yaml
- name: 发送邮件
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: 构建失败通知 - ${{ github.repository }}
    to: team@example.com
    from: CI/CD Bot
    body: |
      构建失败！
      
      仓库: ${{ github.repository }}
      分支: ${{ github.ref }}
      提交: ${{ github.sha }}
      作者: ${{ github.actor }}
      
      请检查构建日志: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

### 企业微信通知

```yaml
- name: 企业微信通知
  if: always()
  run: |
    curl -X POST "${{ secrets.WECOM_WEBHOOK }}" \
      -H 'Content-Type: application/json' \
      -d '{
        "msgtype": "markdown",
        "markdown": {
          "content": "### 构建通知\n> 状态: <font color=\"'${{ job.status == 'success' && 'info' || 'warning' }}'\">${{ job.status }}</font>\n> 分支: ${{ github.ref }}\n> 作者: ${{ github.actor }}"
        }
      }'
```

### Jenkins 通知配置

```groovy
pipeline {
  agent any
  
  post {
    success {
      slackSend(
        color: 'good',
        message: "构建成功: ${env.JOB_NAME} #${env.BUILD_NUMBER}\n分支: ${env.GIT_BRANCH}"
      )
    }
    
    failure {
      slackSend(
        color: 'danger',
        message: "构建失败: ${env.JOB_NAME} #${env.BUILD_NUMBER}\n分支: ${env.GIT_BRANCH}"
      )
      mail(
        to: 'team@example.com',
        subject: "构建失败: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
        body: "构建失败，请检查日志：${env.BUILD_URL}"
      )
    }
  }
}
```

## 部署策略

### 部署策略对比

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **滚动更新** | 零停机、资源利用率高 | 回滚较慢、新旧版本共存 | 大多数应用 |
| **蓝绿部署** | 快速回滚、版本隔离 | 需要双倍资源 | 关键业务应用 |
| **金丝雀发布** | 风险可控、渐进发布 | 发布较慢、需要监控 | 大规模应用 |
| **A/B 测试** | 数据驱动决策 | 实现复杂 | 需要验证新功能 |

### 蓝绿部署

```
┌─────────────────────────────────────────────────────────┐
│                    蓝绿部署架构                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    [负载均衡器]                          │
│                         │                               │
│                    ┌────┴────┐                          │
│                    │         │                          │
│                [蓝色环境]  [绿色环境]                     │
│               (当前生产)   (新版本)                      │
│                    │         │                          │
│                ┌───┴───┐ ┌───┴───┐                      │
│                │       │ │       │                      │
│              [Pod1] [Pod2] [Pod1] [Pod2]                │
│                                                         │
│  1. 新版本部署到绿色环境                                  │
│  2. 验证绿色环境                                         │
│  3. 切换流量到绿色环境                                   │
│  4. 蓝色环境成为下一次部署的绿色环境                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### GitHub Actions 蓝绿部署

```yaml
deploy-blue-green:
  runs-on: ubuntu-latest
  steps:
    - name: 确定当前活跃环境
      id: active
      run: |
        CURRENT=$(curl -s http://load-balancer/current)
        if [ "$CURRENT" == "blue" ]; then
          echo "target=green" >> $GITHUB_OUTPUT
        else
          echo "target=blue" >> $GITHUB_OUTPUT
        fi
    
    - name: 部署到 ${{ steps.active.outputs.target }} 环境
      run: |
        kubectl apply -f k8s/${{ steps.active.outputs.target }}.yaml
    
    - name: 等待部署就绪
      run: |
        kubectl rollout status deployment/app-${{ steps.active.outputs.target }}
        kubectl wait --for=condition=ready pod -l app=myapp,version=${{ steps.active.outputs.target }}
    
    - name: 运行冒烟测试
      run: |
        npm run test:smoke -- --env=${{ steps.active.outputs.target }}
    
    - name: 切换流量
      run: |
        kubectl patch service app -p '{"spec":{"selector":{"version":"${{ steps.active.outputs.target }}"}}}'
    
    - name: 验证切换成功
      run: |
        sleep 10
        curl -f http://app-service/health || exit 1
```

### 滚动更新

```
┌─────────────────────────────────────────────────────────┐
│                    滚动更新过程                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  初始状态:  [V1] [V1] [V1] [V1]                          │
│                                                         │
│  第一步:   [V2] [V1] [V1] [V1]  ← 逐步替换              │
│                                                         │
│  第二步:   [V2] [V2] [V1] [V1]                          │
│                                                         │
│  第三步:   [V2] [V2] [V2] [V1]                          │
│                                                         │
│  最终状态: [V2] [V2] [V2] [V2]                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Kubernetes 滚动更新配置

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # 最多可以超出期望副本数的数量
      maxUnavailable: 1    # 最多不可用的副本数
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
```

```yaml
# GitHub Actions 滚动更新
deploy:
  runs-on: ubuntu-latest
  steps:
    - name: 滚动更新
      run: |
        # 更新镜像
        kubectl set image deployment/myapp app=myapp:${{ github.sha }}
        
        # 等待滚动更新完成
        kubectl rollout status deployment/myapp --timeout=300s
    
    - name: 验证部署
      run: |
        kubectl get pods -l app=myapp
        kubectl rollout history deployment/myapp
    
    - name: 如果失败则回滚
      if: failure()
      run: |
        kubectl rollout undo deployment/myapp
        kubectl rollout status deployment/myapp
```

### 金丝雀发布

```yaml
# 金丝雀发布：先部署到部分用户
deploy-canary:
  runs-on: ubuntu-latest
  steps:
    - name: 部署金丝雀版本
      run: |
        # 部署新版本（10% 流量）
        kubectl apply -f k8s/canary.yaml
        
    - name: 监控金丝雀版本
      run: |
        # 等待 5 分钟观察指标
        sleep 300
        
        # 检查错误率
        ERROR_RATE=$(curl -s http://metrics/api/error-rate?version=canary)
        if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
          echo "错误率过高，回滚"
          kubectl delete -f k8s/canary.yaml
          exit 1
        fi
    
    - name: 逐步增加流量
      run: |
        for percent in 25 50 75 100; do
          # 更新流量比例
          kubectl patch virtualservice myapp --type=merge -p "{\"spec\":{\"http\":[{\"route\":[{\"destination\":{\"host\":\"myapp\",\"subset\":\"stable\"},\"weight\":$((100-percent))},{\"destination\":{\"host\":\"myapp\",\"subset\":\"canary\"},\"weight\":$percent}]}]}}"
          
          # 等待观察
          sleep 300
        done
    
    - name: 完成部署
      run: |
        # 金丝雀版本成为稳定版本
        kubectl apply -f k8s/stable.yaml
        kubectl delete -f k8s/canary.yaml
```

### A/B 测试

```yaml
# A/B 测试：基于用户特征分流
deploy-ab:
  runs-on: ubuntu-latest
  steps:
    - name: 部署 A/B 版本
      run: |
        # 部署版本 A（对照组）
        kubectl apply -f k8s/version-a.yaml
        
        # 部署版本 B（实验组）
        kubectl apply -f k8s/version-b.yaml
        
    - name: 配置流量分流
      run: |
        # 基于 HTTP Header 分流
        kubectl apply -f - <<EOF
        apiVersion: networking.istio.io/v1alpha3
        kind: VirtualService
        metadata:
          name: myapp
        spec:
          http:
          - match:
            - headers:
                x-user-group:
                  exact: "experiment"
            route:
            - destination:
                host: myapp
                subset: version-b
          - route:
            - destination:
                host: myapp
                subset: version-a
        EOF
```

## 性能优化

### 构建速度优化

```
┌─────────────────────────────────────────────────────────┐
│                  构建时间优化策略                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 依赖缓存           - 减少依赖安装时间                │
│  2. 并行执行           - 同时运行独立任务                │
│  3. 增量构建           - 只构建变更部分                  │
│  4. Docker 分层缓存    - 利用 Docker 缓存机制            │
│  5. 矩阵优化           - 减少不必要的测试组合            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 1. 依赖缓存优化

#### GitHub Actions 缓存

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # npm 缓存
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'
      
      # 或手动配置缓存
      - name: 缓存依赖
        uses: actions/cache@v4
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-
```

#### Yarn 缓存

```yaml
- name: 缓存 Yarn 依赖
  uses: actions/cache@v4
  with:
    path: |
      ~/.cache/yarn
      node_modules
    key: ${{ runner.os }}-yarn-${{ hashFiles('**/yarn.lock') }}
```

#### pnpm 缓存

```yaml
- name: 安装 pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 10

- name: 设置 Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22.x'
    cache: 'pnpm'

- name: 安装依赖
  run: pnpm install --frozen-lockfile
```

### 2. 并行执行优化

```yaml
jobs:
  # 并行执行独立任务
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
  
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run type-check
  
  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:unit
  
  test-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration
  
  # 等待所有测试完成后构建
  build:
    needs: [lint, type-check, test-unit, test-integration]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
```

### 3. Docker 构建优化

```yaml
# 使用 BuildKit 和层缓存
- name: 设置 Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: 缓存 Docker 层
  uses: actions/cache@v4
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-buildx-

- name: 构建镜像
  uses: docker/build-push-action@v5
  with:
    context: .
    push: false
    cache-from: type=local,src=/tmp/.buildx-cache
    cache-to: type=local,dest=/tmp/.buildx-cache-new

- name: 移动缓存
  run: |
    rm -rf /tmp/.buildx-cache
    mv /tmp/.buildx-cache-new /tmp/.buildx-cache
```

#### Dockerfile 优化

```dockerfile
# 优化前
FROM node:22
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "start"]

# 优化后：利用缓存层
FROM node:22 AS builder
WORKDIR /app

# 先复制依赖文件（缓存层）
COPY package*.json ./
RUN npm ci --omit=dev

# 复制源代码（频繁变化，放在后面）
COPY . .
RUN npm run build

# 生产镜像（更小）
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/main.js"]
```

### 4. 测试优化

```javascript
// Jest 配置优化
module.exports = {
  // 测试并行
  maxWorkers: '50%',
  
  // 测试随机顺序
  randomize: true,
  
  // 只运行变更的测试
  onlyChanged: true,
  
  // 快照更新
  updateSnapshot: false,
  
  // 测试超时
  testTimeout: 5000,
}
```

### 5. 矩阵构建优化

```yaml
jobs:
  test:
    strategy:
      # 快速失败：发现问题立即停止
      fail-fast: true
      
      matrix:
        # 只测试主要版本
        node-version: [20, 22]
        os: [ubuntu-latest]
        # 排除不必要的组合
        exclude:
          - node-version: 20
            os: windows-latest
    
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

### 6. 条件执行优化

```yaml
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      src: ${{ steps.filter.outputs.src }}
      docs: ${{ steps.filter.outputs.docs }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            src:
              - 'src/**'
              - 'package.json'
            docs:
              - 'docs/**'
              - 'README.md'
  
  test:
    needs: changes
    if: needs.changes.outputs.src == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: npm test
  
  docs:
    needs: changes
    if: needs.changes.outputs.docs == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: npm run build:docs
```

## 安全最佳实践

### 密钥安全

#### 1. 使用平台密钥管理

```yaml
# ✅ 正确：使用 Secrets
- name: 部署
  env:
    API_KEY: ${{ secrets.API_KEY }}
  run: ./deploy.sh

# ❌ 错误：硬编码密钥
- name: 部署
  env:
    API_KEY: "sk-hardcoded-key-12345"  # 危险！
  run: ./deploy.sh
```

#### 2. 最小权限原则

```yaml
# 为不同环境设置不同的密钥
jobs:
  deploy-dev:
    environment: development
    env:
      DATABASE_URL: ${{ secrets.DEV_DATABASE_URL }}
  
  deploy-prod:
    environment: production
    env:
      DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
```

#### 3. 密钥脱敏

```yaml
- name: 使用密钥时脱敏
  run: |
    # 在日志中显示脱敏后的密钥
    echo "API Key: ${API_KEY:0:8}***"
  env:
    API_KEY: ${{ secrets.API_KEY }}
```

### 代码安全扫描

```yaml
# 依赖漏洞扫描
- name: 运行安全审计
  run: npm audit --audit-level=high

# 代码安全扫描
- name: CodeQL 分析
  uses: github/codeql-action/analyze@v3
  with:
    languages: javascript

# SAST 扫描
- name: Semgrep 扫描
  uses: semgrep/semgrep-action@v1
  with:
    config: >-
      p/security-audit
      p/secrets
      p/owasp-top-ten
```

### 环境隔离

```yaml
# 使用环境保护规则
jobs:
  deploy:
    environment:
      name: production
      url: https://example.com
    # 在 GitHub 中配置环境保护规则：
    # - Required reviewers（需要审批人）
    # - Wait timer（等待时间）
    # - Deployment branches（允许的分支）
```

### 权限控制

```yaml
# 限制 Workflow 权限
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read        # 只读仓库内容
      packages: write       # 写入包注册表
      deployments: write    # 写入部署记录
```

## 故障排查

### 常见问题诊断流程

```
┌─────────────────────────────────────────────────────────┐
│                  故障排查流程                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 查看日志         - 详细错误信息                      │
│  2. 检查环境         - 变量、密钥、配置                   │
│  3. 验证依赖         - 版本冲突、安装失败                │
│  4. 检查资源         - 磁盘空间、内存、网络               │
│  5. 本地复现         - 在相同环境中测试                   │
│  6. 逐步调试         - 分步骤执行定位问题                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 常见问题及解决方案

#### 1. 依赖安装失败

```yaml
# 问题：依赖安装超时或失败
# 解决方案：
- name: 安装依赖
  run: |
    npm config set registry https://registry.npmmirror.com
    npm ci --prefer-offline --no-audit
  timeout-minutes: 10
```

#### 2. 缓存失效

```yaml
# 问题：缓存未命中
# 解决方案：检查缓存 key
- name: 检查缓存
  run: |
    echo "Cache key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}"
    ls -la ~/.npm || echo "缓存不存在"

- name: 清理缓存
  if: failure()
  run: |
    rm -rf node_modules
    rm -rf ~/.npm
```

#### 3. 内存不足

```yaml
# 问题：Node.js 内存不足
# 解决方案：增加内存限制
- name: 运行测试
  env:
    NODE_OPTIONS: "--max-old-space-size=4096"
  run: npm test
```

#### 4. 超时问题

```yaml
# 问题：任务执行超时
# 解决方案：增加超时时间
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # 设置任务超时
    steps:
      - name: 长时间运行的任务
        timeout-minutes: 20  # 设置步骤超时
        run: npm run build
```

#### 5. 权限问题

```yaml
# 问题：文件权限错误
# 解决方案：
- name: 修复权限
  run: |
    chmod +x ./scripts/*.sh
    sudo chown -R $(whoami) ~/.npm
```

#### 6. Docker 构建失败

```yaml
# 问题：Docker 构建失败
# 解决方案：启用 BuildKit 和详细日志
- name: 构建 Docker 镜像
  env:
    DOCKER_BUILDKIT: 1
  run: |
    docker build --progress=plain --no-cache -t myapp:latest .
```

### 调试技巧

```yaml
# 启用调试日志
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true

# 使用 tmate 进行远程调试
- name: Debug with tmate
  if: failure()
  uses: mxschmitt/action-tmate@v3
  timeout-minutes: 15

# 保存调试产物
- name: 上传调试日志
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: debug-logs
    path: |
      npm-debug.log
      yarn-error.log
      *.log
```

## 常见问题解答（FAQ）

### Q1: 如何加快构建速度？

**A:** 采取以下措施：
1. **使用缓存**：缓存依赖和构建产物
2. **并行执行**：独立任务并行运行
3. **减少矩阵**：只测试必要的版本组合
4. **增量构建**：只构建变更部分
5. **使用更快的镜像源**：如 npm 淘宝镜像

```yaml
# 示例：综合优化
jobs:
  build:
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'
      - run: npm config set registry https://registry.npmmirror.com
      - run: npm ci
      - run: npm run build
```

### Q2: 如何处理敏感信息？

**A:** 
1. 使用平台提供的 Secrets 管理功能
2. 不要在代码或日志中暴露密钥
3. 为不同环境设置不同的密钥
4. 定期轮换密钥

```yaml
# 使用 GitHub Secrets
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  
# 使用环境变量
deploy:
  environment: production
  env:
    API_KEY: ${{ secrets.PROD_API_KEY }}
```

### Q3: 如何实现多环境部署？

**A:** 
1. 使用环境变量区分环境
2. 为每个环境配置不同的 Secrets
3. 使用分支策略管理部署
4. 配置环境保护规则

```yaml
jobs:
  deploy-dev:
    if: github.ref == 'refs/heads/develop'
    environment: development
    steps:
      - run: ./deploy.sh dev
  
  deploy-prod:
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - run: ./deploy.sh prod
```

### Q4: 如何回滚失败的部署？

**A:** 
1. **手动回滚**：重新部署上一个版本
2. **自动回滚**：监控失败自动触发回滚
3. **使用 Git 回滚**：`git revert` 后重新部署

```yaml
deploy:
  steps:
    - name: 部署新版本
      run: kubectl set image deployment/app app=myapp:${{ github.sha }}
    
    - name: 健康检查
      run: |
        kubectl rollout status deployment/app --timeout=300s || \
        kubectl rollout undo deployment/app
```

### Q5: 如何优化 Docker 镜像大小？

**A:** 
1. **使用 alpine 基础镜像**
2. **多阶段构建**
3. **清理不必要的文件**
4. **优化层缓存**

```dockerfile
# 多阶段构建示例
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/main.js"]
```

### Q6: 如何处理依赖版本冲突？

**A:** 
1. **锁定依赖版本**：使用 `package-lock.json` 或 `yarn.lock`
2. **使用 `npm ci`**：确保安装锁定的版本
3. **定期更新依赖**：修复安全漏洞
4. **使用 Renovate/Dependabot**：自动更新依赖

```yaml
# Dependabot 配置
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### Q7: 如何实现零停机部署？

**A:** 
1. **使用滚动更新**：逐步替换旧版本
2. **配置健康检查**：确保新版本就绪后再切换
3. **蓝绿部署**：快速切换流量
4. **金丝雀发布**：渐进式发布

### Q8: 如何监控 CI/CD 流水线？

**A:** 
1. **集成监控工具**：如 Prometheus、Grafana
2. **设置告警**：构建失败、部署失败通知
3. **收集指标**：构建时间、成功率、部署频率
4. **日志聚合**：集中管理构建日志

```yaml
# Prometheus 指标示例
- name: 收集指标
  run: |
    echo "build_duration_seconds ${{ steps.build.outputs.duration }}" >> metrics.prom
    echo "build_status ${{ job.status }}" >> metrics.prom
```

### Q9: 如何优化测试执行速度？

**A:** 
1. **并行测试**：使用 Jest 等工具的并行功能
2. **测试分片**：将测试分散到多个 Job 执行
3. **只运行相关测试**：基于代码变更智能选择
4. **Mock 外部依赖**：减少网络请求和数据库操作

```yaml
# Jest 并行测试
- name: 运行测试
  run: npm test -- --maxWorkers=50%

# 测试分片
test:
  parallel: 4
  script:
    - npm test -- --shard=$((${CI_NODE_INDEX}))/$((${CI_NODE_TOTAL}))
```

### Q10: 如何处理跨平台构建？

**A:** 
1. **使用矩阵构建**：在多个操作系统和版本上测试
2. **条件执行**：跳过不适用的平台
3. **平台特定配置**：针对不同平台使用不同配置

```yaml
jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [20, 22]
        exclude:
          - os: macos-latest
            node: 20
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm test
```

## 总结

CI/CD 是现代软件开发的重要组成部分，通过自动化构建、测试和部署流程：

1. **提高开发效率**：减少手动操作，加快发布周期
2. **降低错误率**：自动化测试确保代码质量
3. **快速反馈**：及时发现和修复问题
4. **可追溯性**：每次部署都有完整记录

> 📖 **相关理论延伸**：本文为 CI/CD 的工程速查。概念与流水线设计的权威体系见 [CI/CD](../01-持续交付与CI-CD/00-CI-CD.md)；GitHub Actions 深入实操见 43：[GitHub Actions](43-GitHub%20Actions.md)；Jenkins 权威教程见本系列 [Jenkins 简介与安装准备](13-Jenkins%20简介与安装准备.md) 及 [Jenkins 2.5+ LTS 与 Pipeline](../01-持续交付与CI-CD/02-Jenkins%202.5+%20LTS%20与%20Pipeline.md)；部署与回滚理论见《持续交付36讲》[回滚策略与故障恢复](../02-持续交付36讲/19-回滚策略与故障恢复.md)。
