---
title: 使用 Kubernetes 部署访问你的第一个应用
description: 部署第一个 Kubernetes 应用：Deployment/Pod/Service 概念、YAML 配置清单编写、kubectl apply 部署、NodePort 访问及 ingress-nginx 路径分流（networking.k8s.io/v1）。
keywords: [Kubernetes, Deployment, Service, NodePort, Ingress, kubectl]
category: 部署与运维实践
tags: [DevOps, CI/CD]
---

::: warning 版本提示
本系列环境基于 Kubernetes 1.23 与 CentOS 7 编写：K8s 1.23 已 EOL，Kubernetes 自 1.24 起移除 dockershim，CentOS 7 已于 2024-06 EOL。本文流程适用于对应年代环境，新环境请参照 K8s 官方文档与容器化方案。
:::

# 使用 Kubernetes 部署访问你的第一个应用

## Changelog

### 2021.11.10 

1. Ingress apiVersion的变化。从 Kubernetes v1.14 开始引入 networking.k8s.io/v1beta1，v1.19 起 GA 为 networking.k8s.io/v1，v1.22 起彻底移除 extensions/v1beta1。

2. 结构体的变化。移除了spec.backend字段；backend下的service也会接着细化。主要修改为：

     - 移除了spec.backend字段
     - backend.serviceName，backend.servicePort 更换为了backend.service.name，backend.service.port.number

3. 新增了必填字段：pathType。其功能作用是精确匹配和前缀匹配的区别。

例如 `path：/wss，pathType: Prefix，等同于path: /wss*`。具体详细内容：https://kubernetes.io/zh/docs/concepts/services-networking/ingress/#path-types

4. 更新 ingress 版本到 stable 1.0.4 版本（编写时的最新 stable），原有的镜像源会失效，暂无稳定可用的替代镜像。

## 一、声明一份配置清单

在 Kubernetes 中，应用部署完全可以通过 `YAML` 配置清单来进行。部署前需要先声明一份配置清单，文件格式为 `YAML`。

新建一个名称为 `deployment` 的文件夹，并在文件夹内创建一份名称为 `v1` 的 `yaml` 文件：

```shell
mkdir deployment && cd deployment
vim v1.yaml
```

在配置文件中写入以下内容：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: front-v1
spec:
  selector:
    matchLabels:
      app: nginx-v1
  replicas: 3
  template:
    metadata:
      labels:
        app: nginx-v1
    spec:
      containers:
      - name: nginx
        image: registry.cn-hangzhou.aliyuncs.com/janlay/k8s_test:v1
        ports:
        - containerPort: 80
```

YAML 文件中的 `kind` 字段用于声明 Kubernetes 的资源类型，此处 `kind` 值为 `deployment`。

### 什么是 Deployment

如果将 `k8s` 看作是一个大型机场，那么 `deployment` 刚好就是机场内的**停机坪**。

根据飞机的种类进行划分停机坪，不同的停机坪都停着不同类型的飞机。`deployment` 比停机坪还要灵活，随时可以根据剩余的空地大小（服务器剩余资源）和塔台的指令，增大/变小停机坪的空间。**这个"增大变小停机坪空间的动作"，在 k8s 中就是 `deployment` 对它下面所属容器数量的扩容/缩小的操作。**

这也意味着 **`deployment` 是无状态的，不会负责停机坪中每架飞机之间的通信和组织关系**，只需要根据塔台的指令，维护好飞机的更新和进出指令即可。**这个根据指令维护飞机更新和进出的行为，在 k8s 中就是 `deployment` 对它下面的容器版本更新升级、暂停和恢复更新升级的动作。**

这里的**容器**并不等于 Docker 中的容器，它在 K8S 中被称为 `Pod`。

### 什么是 Pod

Pod 是 K8S 中最小的可调度单元（可操作/可部署单元），里面可以包含 1 个或者多个 Docker 容器。Pod 内的所有 Docker 容器都会共享同一个网络、存储卷、端口映射规则。一个 Pod 拥有一个 IP。

但这个 IP 会随着 Pod 的重启、创建、删除等跟着改变，不固定且不完全可靠，这就是 Pod 的 IP 漂移问题。该问题可以使用后面的 Service 去自动映射。

Pod 和 Docker 容器的关系像是豌豆和豌豆荚：Pod 是一个容器组，里面有很多容器，容器组内共享资源。

### 分析配置文件构成

`kind` 字段不只可以声明 `deployment`，还可以声明其他资源类型。了解 `deployment` 的概念后，将配置清单分成三段阅读：

最上面的第一段声明了当前资源配置的 API 版本、资源类型和资源名称：

- API 配置版本： `apps/v1`
- 资源类型：`deployment`
- 资源名称：`deployment` 的名称叫 `front-v1`

其中，API 配置版本会随着 K8S 版本迭代和资源类型不同有变化。

> 该怎么选择 apiVersion 的值: [https://matthewpalmer.net/kubernetes-app-developer/articles/kubernetes-apiversion-definition-guide.html](https://matthewpalmer.net/kubernetes-app-developer/articles/kubernetes-apiversion-definition-guide.html)

配置文件中 `spec.selector` 一段，告诉 `deployment` 根据规则匹配相应的 `Pod` 进行控制和管理。这里使用 `matchLabels` 字段匹配 `Pod` 的 `label` 值。

`spec.template` 配置则代表声明一个 Pod 组：

- replicas：要创建的 `Pod` 数量（期望副本数）。数字类型
- labels.app：Pod 组的名称
- spec：组内创建的 Pod 信息
   - name：Pod 名称
   - image：以什么镜像创建 Pod。这里是 Docker 镜像地址
   - ports.containerPort：Pod 内容器映射的端口

**这里的镜像使用了一份自行编译的 nginx 镜像作为演示，也可以换成其他任意可用镜像**

## 二、启动第一个应用

在 k8s 中，使用 `kubectl apply` 来执行一份 k8s 的配置：

```shell
kubectl apply -f ./v1.yaml
```

其中，`kubectl apply` 代表准备对资源进行配置，`-f` 等于 `--filename`，后面可以跟随多个配置文件。例如：

```shell
kubectl apply -f ./v1.yaml ./v1-service.yaml ./v1-ingress.yaml
```

当提示 `deployment.apps/front-v1 created` 时，代表配置文件执行成功。

部署完毕后的 `Pod` 运行状态可以使用 `kubectl get pod` 命令获取：

```shell
kubectl get pod
```

执行后会得到一个表格，展示当前 K8S 中部署的所有 Pod。其中，name 是 Pod 的名称；READY 为容器状态，格式为可用容器/所有容器数量；STATUS 为 Pod 的运行状态；RESTARTS 为重启数量；AGE 为 Pod 运行时间。当状态都是 `Running` 时，代表 Pod 运行正常。

### 无状态带来的访问问题

部署成功了，但如何访问具体应用？前面写到 `deployment` 是无状态的，意味着 `deployment` 并不对 `pod` 进行网络通信和分发。想访问服务，有两个办法：

1. 直接访问具体的 `Pod`：`Pod` 数量太多，达不到自动调度的效果，且 `Pod` 的 `IP` 在运行时经常漂移且不固定。
2. 使用 `Service` 组织统一的 `Pod` 访问入口。

这里选择另一种资源类型 —— `Service` 来统一组织 `Pod` 服务访问。

## 三、访问第一个应用：Service

### 什么是 Service

`deployment` 是停机坪，`Service` 则是一块停机坪的统一通信入口。它**负责自动调度和组织 deployment 中 Pod 的服务访问。由于自动映射 Pod 的 IP，同时也解决了 Pod 的 IP 漂移问题。**

`Service` 的作用是：流量会首先进入 VM（主机），随后进入 Service 中，接着 Service 再将流量调度给匹配的 Pod。

### Service 的配置

创建一个 `Service` 同样需要一份 `YAML` 配置清单。一份简单的 `Service` 配置如下：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: front-service-v1
spec:
  selector:
    app: nginx-v1
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: NodePort
```

通用字段之外，有几个特有字段需要关注：

| 字段 | 解释 |
| --- | --- |
| protocol | 通信类型（TCP/UDP） |
| targetPort | 原本 Pod 开放的端口 |
| port | k8s 容器之间互相访问的端口 |
| type | NodePort，Service的一种访问方式 |

这里 Service 的模式选择 `NodePort`。其他模式可以参考：[http://www.dockerone.com/article/4884](http://www.dockerone.com/article/4884)

### 与 Deployment 配置文件合并

根据 YAML 语法，可以将 Service 和 deployment 合并为同一个配置文件，当然新建一个文件也可以。编辑原有的 v1.yaml，在文件底部添加 `---` 继续拼接 Service 的配置：

```shell
vim ./v1.yaml
```

编辑保存退出后，使用 `kubectl apply` 命令更新配置：

```shell
kubectl apply -f ./v1.yaml
```

此时，Service 已经部署完毕。

### 查看 Service 的访问端口

Service 部署成功后，使用 `kubectl get svc` 获取已部署的 `Service` 列表，并查看具体打开的服务端口：

```shell
kubectl get svc
```

执行后，会展示相关结果。其中，`PORT` 字段代表 `Service` 的访问端口，`:` 前为映射到 Pod 的端口，31048 为访问端口。访问 `Master节点IP + 端口`，就可以访问到该服务。

## 四、Ingress 与路径分流

前面部署了 `deployment` 和 `Service`，实现了对服务的访问。但实际使用中还需要根据请求路径前缀的匹配、权重，甚至根据 `cookie/header` 的值去访问不同的服务。为了达到这种**负载均衡**效果，可以使用 `k8s` 的另一个组件 —— `ingress`。

日常开发中经常会遇到**路径分流**问题：访问 `/a` 时返回 A 服务的页面，访问 `/b` 时返回服务 B 的页面。这类需求可以使用 `k8s` 中的 `ingress` 实现。

这里选择 `ingress-nginx`。`ingress-nginx` 是基于 `nginx` 的一个 `ingress` 实现，可以实现正则匹配路径、流量转发、基于 `cookie header` 切分流量（灰度发布）。

### 部署 ingress

进入 `master` 节点，下载 `ingress` 配置文件：

```shell
wget https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.0.4/deploy/static/provider/baremetal/deploy.yaml
```

接着编辑部署文件，将 `ingress` 的 `nodePort` 端口改为 `31234`，以方便后面访问：

```shell
vim ./deploy.yaml
```

在对应位置添加 `nodePort` 字段为 `31234`，https 为 `31235`。

接着执行命令使 `ingress` 生效：

```shell
kubectl apply -f deploy.yaml
```

接下来会自动拉取 `ingress` 镜像、自动部署 `ingress`。使用 `kubectl` 命令查看部署状态：

```shell
kubectl get pods -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --watch
```

如果 Pod 状态变为 `Running`，则代表部署成功。

输入以下命令，检查配置是否生效：

```shell
kubectl -n ingress-nginx get svc
```

如果看到 `80:31234` 的端口映射，代表生效。

### 初识配置文件

`ingress` 服务的配置同样使用 `yaml` 文件管理。

新建一个 `ingress` 文件夹，将 `ingress` 的配置放在里面：

```shell
mkdir ingress && cd ingress && vim base.yaml
```

拷贝以下内容进去：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-demo
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - http:
      paths: 
       - path: /wss
         pathType: Prefix
         backend:
           service:
             name: front-service-v1
             port:
               number: 80
```

这是一份简单的 `ingress` 配置文件，配置主要分三部分：

#### annotations

`annotations` 是 `ingress` 的主要配置项目，通过修改这些配置可以调整 `ingress` 的行为：实现灰度发布、跨域资源，甚至将 `www.abc.com` 重定向到 `abc.com`。

具体详细配置解释，可以翻阅官网文档：[https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)

```yaml
annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
```

#### rules

`rules` 是 `ingress` 配置路径转发规则的地方。`path` 可以是一个路径字符串，**也可以是一个正则表达式**。`backend` 则是 `k8s` 的 `service` 服务，`service.name` 是服务名称，`service.port.number` 是服务端口。

访问 `/wss` 时，`ingress` 就会调度到 `front-service-v1` 这个 `service` 上。

```yaml
rules:
  - http:
      paths: 
       - path: /wss
         pathType: Prefix
         backend:
           service:
             name: front-service-v1
             port:
               number: 80
```

---

执行命令，使配置项目生效：

```shell
kubectl apply -f ./base.yaml
```

访问 `http://<Master节点IP>:31234`，如果能看到服务页面则代表成功。

## 五、小结

- Kubernetes 应用部署以 `YAML` 配置清单为核心：`kind` 声明资源类型，`apiVersion` 随版本与资源类型变化，`spec.selector.matchLabels` 建立 Deployment 与 Pod 的关联。
- `Deployment` 无状态，负责副本数量扩缩与版本更新；`Pod` 是最小调度单元，组内容器共享网络与存储卷，但 IP 会漂移。
- `Service`（此处为 `NodePort` 模式）组织统一的 Pod 访问入口，自动映射 Pod IP 并解决 IP 漂移；`kubectl get svc` 可查看对外端口。
- `ingress-nginx` 实现基于路径的分流：`annotations` 控制行为（重定向、灰度等），`rules.paths` 定义路径到 `backend.service` 的转发；apiVersion 使用 `networking.k8s.io/v1` 且 `pathType` 为必填字段。

零宕机发布与灰度环境配置见后续章节。
