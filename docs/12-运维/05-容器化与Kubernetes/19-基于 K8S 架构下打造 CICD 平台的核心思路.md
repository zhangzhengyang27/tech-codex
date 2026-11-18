---
title: 基于 K8S 架构下打造 CICD 平台的核心思路
description: 基于 K8s 架构打造 CI/CD 平台的核心思路：Jenkins 主从架构部署高可用、Kubernetes 插件动态 Slave、Deployment/Service YAML 关键配置、Pipeline 多分支工作流与 Jenkins API 集成。
keywords: [Kubernetes, Jenkins 高可用, Pipeline, Jenkins API, 多分支]
category: 部署与运维实践
tags: [DevOps, 运维]
---

::: warning 版本提示
本系列环境基于 Kubernetes 1.23 与 CentOS 7 编写：K8s 1.23 已 EOL，Kubernetes 自 1.24 起移除 dockershim，CentOS 7 已于 2024-06 EOL。本文流程适用于对应年代环境，新环境请参照 K8s 官方文档与容器化方案。
:::

# 基于 K8S 架构下打造 CICD 平台的核心思路

## 一、K8s 架构中的 CI/CD 平台应具备的能力

阅读本文需要具备 Jenkins 基础搭建和基础配置知识，对 K8s 有一定了解（pod、node、service 的概念，K8s 结构组成），并具备 Docker 镜像打包和发布整个流程的技术操作能力。

K8s 和 Docker 部署架构下，CI/CD 平台需要遵循的特性与功能要求：

- 支持容器部署，做到基于镜像方式发布、K8s 进行编排，所以 CI/CD 平台里面务必要遵循容器及 K8s 的发布部署方式。
- 在 K8s 环境下，DevOps 理念更加突出，需要做到通过 Jenkins 的 API 创建和管理 Job。
- Pipeline 灵活性管理 Job：基于流水线的方式，能带来更多的灵活性的 Job 管理和定义。
- 需要支持多环境、多版本的发布场景：大的企业环境下常有多套工程的部署环境，也可能有多套代码分支，CI/CD 平台应更好地兼容这样的环境进行设计。
- 注重 Jenkins（即 CI/CD 平台本身）的高可用：基于单点方式部署的 Jenkins 本身不是高可用的，需要考虑其自身的高可用性。

归纳起来，在 K8s 架构下搭建 Jenkins 的 CI/CD 平台需要三点必要能力：

- Jenkins 部署高可用。
- 通过 Pipeline 创建\管理 Job。
- 通过 API 接口创建\管理 Job。

## 二、思路一：Jenkins 服务高可用

### Jenkins 的三种部署模式

![](/ops-course-images/12-基于_K8S_架构下打造_CICD_平台的核心思路__Cgq2xl58Pj2ARAUEAAECOYYrTH8534.png)

Jenkins 本身的部署模式通常有以下三种：

1. 在操作系统上面直接部署 Jenkins，让 Java 进程直接运行，这是比较传统的做法。
2. 将 Jenkins 封装成一个标准镜像，以容器化的方式运行，这样更容易安装、维护和管理。
3. 建立在第二种方式基础上，重点解决单例模式 Jenkins 部署下的高可用问题：一台 Jenkins 服务出现问题时，有另外的服务能够自动把它拉起；同时解决 Job 增加导致 Jenkins 系统负载趋于饱和后，如何从 Jenkins 本身的性能瓶颈上进行水平化的扩容。

### 主从架构与 K8s 融合

做法是把 Jenkins 做成主从模式：把需要消耗 Jenkins 性能的 Job 工作交给从节点（slave）去完成；再把 Jenkins 部署在 K8s 的 Pod 中，让 K8s 负责对 Jenkins 服务进行监控和拉起，保证 Jenkins 服务本身的高可用，同时借助 K8s 弹性资源调度优势对 Jenkins 资源进行水平化扩展。

**Jenkins 服务要做到真正的高可用，推荐遵循 Jenkins 主从架构，并且把 Jenkins 部署到 K8s 的架构体系中。**

![](/ops-course-images/12-基于_K8S_架构下打造_CICD_平台的核心思路__Cgq2xl58Pj2ASTTbAAPOlOYZ6DM633.png)

图中 K8s 集群包含三个 Node 节点，每个 Node 节点上有一组 Pod。Pod 分为两大类型：Master 类型的 Pod 和 Slave 类型的 Pod。K8s 里最小的管理单元是 Pod，可以把它视为一个独立的服务个体。运行 Jenkins Master 服务的 Pod 在其中一个 Node 上，另外两个 Node 上运行的是 Jenkins 的 Slave Pod 服务。在这套集群体系下，Jenkins 以主从的方式运行在 K8s 的架构之上：Job 任务交给 Slave 节点完成，Master 只负责 Job 的管控或中心平台的作用。

**优势**

1. **Job 资源隔离**：Jenkins 将 Job 分给不同的 Pod 处理，Pod 本身以容器化（cgroup）进行资源隔离，Job 间不会造成进程的争抢。
2. **动态伸缩**：K8s 支持动态伸缩，当 Pod 资源不足需要扩容新的 Pod 时，可以借用 K8s 的动态伸缩模式进行 Pod 资源扩容。
3. **高可用**：K8s 对服务的拉起可以做到自动的故障诊断及故障拉起。

此外，架构最外层挂了一组存储卷，把 Jenkins 需要持久化的相关内容以 PVC 方式挂载到分布式存储之中，保证数据的高可靠。

### 实现步骤

部署这套架构的核心思路：整个 K8s 集群部署完成后，首先部署 Jenkins 的 Master 节点。

Master 节点相关的配置通过 K8s 创建几个重要对象：一是 namespace，K8s 给 Jenkins 的一个独立命名空间；二是 PVC 对象（对应图中一组外挂的存储节点）；三是 deployment 对象——K8s 中非常重要的 control 对象，直接控制 Pod 资源的镜像、Pod 的资源使用、服务探针等相关内容；四是 service 对象，创建后 Pod 就可以正式对集群内部提供服务。

Master 启用以后，登录 Jenkins 的管理控制台配置 Slave 节点，重点两步：

- 安装 K8s 的插件（**kubernetes plugin**）。
- 配置 Slave 的模板信息，也就是 Slave deployment。

这都是在 Jenkins 的界面控制台进行的配置。

K8s 通过 yaml 语法格式创建、管理对象。deployment 对象配置的几个核心部分如下。

第一部分，创建 Pod 里面的容器的镜像，以及对外服务的端口：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jenkins
spec:
  selector:
    matchLabels:
      app: jenkins
  template:
    metadata:
      labels:
        app: jenkins
    spec:
      containers:
      - name: jenkins
        image: jeson_jenkins:1.1   # 镜像
        ports:                     # 服务端口
        - name: web
          containerPort: 8080
          protocol: TCP
        - name: agent
          containerPort: 50000
          protocol: TCP
```

> 注意：`extensions/v1beta1` 已在 Kubernetes v1.16 起废弃，Deployment 应使用 `apps/v1`（需补全 `selector.matchLabels` 与 `template.metadata.labels`）。

第二部分，定义两个探针，用于 K8s 对服务进行健康检测：

```yaml
        livenessProbe:             # 定义存活探针
          httpGet:
            path: /login
            port: 8080
        readinessProbe:            # 定义就绪探针（原文误写为第二个 livenessProbe）
          httpGet:
            path: /login
            port: 8080
```

第三部分，配置 PVC 内容，直接挂载一个逻辑卷：

```yaml
        volumeMounts:              # 定义卷挂载
        - name: jenkinshome
          mountPath: /var/jenkins_home
          subPath: jenkins2
      volumes:
      - name: jenkinshome
        persistentVolumeClaim:
          claimName: opspvc
```

最后通过 kubectl 创建 deployment 对象：

kubectl create -f jenkins-deployment.yaml

**Service 配置**

创建 service 对象的几个重要配置：创建服务的名称、对外暴露服务的端口、关联后端 Node 节点的端口。总共创建了对外服务两个端口：一个是 Jenkins 的 Web 服务端口，一个是 agent 所需要进行信息通信的端口。以 yaml 文件写好以后，同样通过 kubectl 来创建对象：

kubectl create -f jenkins-service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: jenkins
spec:
  type: NodePort
  selector:
    app: jenkins
  ports:
  - name: web
    port: 8080
    targetPort: web
    nodePort: 30002
  - name: agent
    port: 50000
    targetPort: agent
```

以上是 K8s 集群部署 Jenkins 高可用架构核心的优势与步骤，可参考相关资料模拟整体搭建。

## 三、思路二：Jenkins 的 Pipeline 工作流

![](/ops-course-images/12-基于_K8S_架构下打造_CICD_平台的核心思路__Cgq2xl58Pj2Af4yJAAGBiRwNohg190.png)

Jenkins 的工作 job 类型可以分成两类：一类是基础的 job 服务类型，一种常见的 job 方式；另一类是通过 Groovy 语言实现 Pipeline 工作流，它可以使构建任务更加灵活，维护性更好。

第一种类型 Job 方式需要通过控制台进行固定的配置；第二种方式使用脚本化的语言进行配置，更加灵活、更利于维护。大型工程建议更多使用 Pipeline。

企业应用中如果有代码需要做多分支、多版本的场景，需要选择多分支的 Pipeline 或者多配置的工程化来进行配置。

### 单流水线与多分支

![](/ops-course-images/12-基于_K8S_架构下打造_CICD_平台的核心思路__Cgq2xl58Pj6AO_1IAASzA5iuWew245.png)

图中是 Jenkins 整体的构建和发布过程：开发人员进行代码提交，通过在 git 仓库上做版本库的代码管理，同时通过一个钩子（webhook）触发 Jenkins 来进行部署、构建、测试，然后进行环境的发布。这是一种单流水线的方式。

![](/ops-course-images/12-基于_K8S_架构下打造_CICD_平台的核心思路__Cgq2xl58Pj6AWo65AABvMXRVTog127.png)

总结归纳：Jenkins 负责构建、测试和发布，属于单 Pipeline 任务流模式。

如果是多分支或者多部署环境的方式：假设有两种分支，一个测试分支，一个线上环境分支，Jenkins 里面就需要同步支持构建和本地测试，测试完可能需要进行两个工程的打包、发布。

![](/ops-course-images/12-基于_K8S_架构下打造_CICD_平台的核心思路__Cgq2xl58Pj6ADKhZAAExRAaf_HA281.png)

具体实现需要用一个名称为 Jenkinsfile 的脚本进行控制。Jenkinsfile 本身用 Groovy 语言编写，编写它可以让 Jenkins 的工作流支持控制多分支、多环境的部署。

### 关键步骤

**1、镜像 jenkinsci/blueocean = jenkins + Blue Ocean 插件和功能**

推荐容器用 jenkinsci/blueocean 这个镜像，它在 Jenkins 的基础上默认集成了 Blue Ocean 插件功能。Blue Ocean 插件的作用：

（1）清晰简单界面：使 Jenkins 管理控制台更加清晰、简单，例如定位 Pipeline 的错误时，在控制台就可以非常友好地定位，相比 Jenkins 默认的控制台更加方便。

（2）Pipeline 可视化编辑：支持 Pipeline 的可视化编辑，在控制台编辑创建 Pipeline 的任务更加方便。

**2、工程仓库**

创建好 Jenkins job 以后，需要创建 job 的代码工程。样例工程 GitHub 地址为（https://github.com/jenkins-docs/simple-node-js-react-npm-app，官方教程当前使用的样例仓库）。

这个工程的目录结构：

```text
./
├── jenkins
│   └── scripts
│       ├── deliver-for-development.sh
│       ├── deploy-for-production.sh
│       ├── kill.sh
│       └── test.sh
├── Jenkinsfile
├── package.json
├── public
│   └── index.html
└── src
    ├── App.css
    ├── App.js
    └── …
```

非常重要的一点：工程的根目录下有一个 Jenkinsfile，它就是用 Groovy 语言书写的 Pipeline 脚本，同时会引用 Jenkins 目录下的几个 sh 脚本来控制部署任务。

**3、创建多分支**

创建好工程以后，在本地模拟多个分支：创建测试环境的分支、线上环境的分支、预上线环境的分支等，git 通过 git branch 来操作。

**4、Jenkinsfile**

Jenkinsfile 这个 Pipeline 脚本需要同时支持多个分支构建。stages 这个大的模块控制着相关工作流的流程：最前面的 stage('build') 流程控制构建步骤，执行的是 npm install 命令；接下来是测试流程，执行一个 Shell 脚本；再往下是控制发布流程，需支持两个发布流程——发布到 Development（开发环境）和发布到线上环境。发布流程中会判断当前分支（通过 git branch 来打分支）是不是对应环境：如果是 git 的开发分支，就执行开发环境发布的脚本；如果是线上的分支，就执行另一个发布的脚本。这就是通过 Groovy 语言实现多分支部署的一个 Jenkinsfile 脚本样例。

安装步骤：https://www.jenkins.io/doc/tutorials/build-a-multibranch-pipeline-project/

### Jenkins 的 API 能力

JAVA:https://github.com/jenkinsci/java-client-api

Python:https://github.com/pycontribs/jenkinsapi

要把 Jenkins 能力融入 DevOps 平台，需要了解 Jenkins 的 API 能力，通过 DevOps 调用 Jenkins 的 API 来实现 job 的灵活管理、创建。API 官方文档地址为 https://www.jenkins.io/doc/book/using/remote-access-api/ 。为方便研发人员调用 Jenkins 的 API 接口，官方开放了 API 或者 SDK，可以直接选择对应的语言下载对应模块：Java 可访问 https://github.com/jenkinsci/java-client-api 下载 API 或 SDK；Python 可访问 https://github.com/pycontribs/jenkinsapi 下载。有了这些 API，本地 DevOps 工程直接引用这些模块即可，对 Jenkins 里面的 job 管理/创建非常方便。

## 四、小结

- K8s 架构下 CI/CD 平台的三点必要能力：Jenkins 主从架构部署高可用（K8s Pod 承载 Master/Slave，PVC 持久化，cgroup 资源隔离 + 动态伸缩 + 故障自动拉起）、Pipeline 管理 Job、API 集成管理 Job。
- Master 节点通过 namespace/PVC/deployment/service 四类对象落地；deployment 需配置镜像端口、liveness/readiness 双探针与 PVC 卷挂载，service 以 NodePort 暴露 web(8080) 与 agent(50000) 两个端口。
- Pipeline 相比基础 Job 更灵活、易维护；多分支多环境场景使用多分支 Pipeline，通过工程根目录的 Jenkinsfile（Groovy）控制构建、测试与按分支的发布脚本；jenkinsci/blueocean 镜像提供更友好的控制台与可视化编辑。
- 通过 Jenkins 远程访问 API 及 Java/Python SDK，可将 Jenkins 的 job 管理能力融入 DevOps 平台。
