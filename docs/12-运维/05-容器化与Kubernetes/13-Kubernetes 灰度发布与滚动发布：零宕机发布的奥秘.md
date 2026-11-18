---
title: Kubernetes 灰度发布与滚动发布：零宕机发布的奥秘
description: Kubernetes 灰度发布与滚动发布实战：ingress-nginx canary 注解按 Cookie/Header/权重切流、优先级规则、Deployment 滚动更新策略（maxSurge/maxUnavailable/minReadySeconds）与 kubectl rollout 管理。
keywords: [Kubernetes, 灰度发布, 金丝雀, 滚动发布, ingress-nginx, kubectl rollout]
category: 部署与运维实践
tags: [DevOps, CI/CD]
---

::: warning 版本提示
本系列环境基于 Kubernetes 1.23 与 CentOS 7 编写：K8s 1.23 已 EOL，Kubernetes 自 1.24 起移除 dockershim，CentOS 7 已于 2024-06 EOL。本文流程适用于对应年代环境，新环境请参照 K8s 官方文档与容器化方案。
:::

# Kubernetes 灰度发布与滚动发布：零宕机发布的奥秘

典型发布场景包括：

> A 用户是VIP，怎么才能让VIP用户看到内测版本？
> 不想停机，怎么发布新版本？
> 如何让新版本服务只开放小流量访问？

这些场景依靠单纯的访问控制无法实现，需要引入灰度发布与滚动发布机制。

## 一、什么是灰度发布

**灰度发布**是一种发布方式，也叫 `金丝雀发布`。**起源是矿工在下井之前会先放一只金丝雀到井里，如果金丝雀不叫了，就代表瓦斯浓度高，原因是金丝雀对瓦斯气体很敏感。**这一典故非常形象地描述了发布行为。

灰度发布的做法是：在现存旧应用的基础上，启动一个新版应用。新版应用并不直接让用户访问，而是先让测试同学进行测试；如果没有问题，则将真正的用户流量慢慢导入新版。中间持续对新版本运行状态做观察，直到慢慢切换过去，**这就是所谓的 A/B 测试。**也可以招募一些**灰度用户**，给他们设置独有的灰度标示（Cookie、Header），让他们可以访问到新版应用。

如果中间切换出现问题，应将流量迅速切换回老应用。

## 二、实现方案：ingress-nginx canary

利用 `ingress annotations` 中的 `canary` 配置项实现灰度发布逻辑。

### 1. 准备新版本的 Service

灰度之前需要准备一套新环境以备流量切分。切换到 `deployment` 目录，新启动一套 `v2` 的环境配置：将原先 `v1` 的配置文件拷贝一份，替换为 `v2` 的镜像：

```shell
cd deployment && cp v1.yaml v2.yaml
```

修改 `v2.yaml`，将 `Deployment Name`、`Service Name` 和匹配规则都替换为 `v2`，并将镜像版本替换为 `v2`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: front-v2
spec:
  selector:
    matchLabels:
      app: nginx-v2
  replicas: 3
  template:
    metadata:
      labels:
        app: nginx-v2
    spec:
      containers:
      - name: nginx
        image: registry.cn-hangzhou.aliyuncs.com/janlay/k8s_test:v2
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: front-service-v2
spec:
  selector:
    app: nginx-v2
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: NodePort
```

使用 `kubectl apply` 命令使配置生效：

```shell
kubectl apply -f ./v2.yaml
```

### 2. 根据 Cookie 切分流量

基于 `Cookie` 切分流量的原理：根据**用户请求中的 Cookie 是否存在灰度标示 Cookie** 判断是否为灰度用户，再决定是否返回灰度版本服务。

新建一个全新的 ingress 配置文件，名称为 `gray`：

```shell
cd ./ingress && vim ./gray.yaml
```

输入以下配置：

```yaml
# 与上一章一致，使用 networking.k8s.io/v1（extensions/v1beta1 已在 Kubernetes v1.22 移除）
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-demo-canary
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-cookie: "users_from_Beijing"
spec:
  rules:
  - http:
      paths:
       - path: /
         pathType: Prefix
         backend:
          service:
            name: front-service-v2
            port:
              number: 80
```

`annotations` 中有两个关于灰度的配置项：

- nginx.ingress.kubernetes.io/canary：可选值为 `true / false`，代表是否开启灰度功能。
- nginx.ingress.kubernetes.io/canary-by-cookie：灰度发布 `cookie` 的 `key`。当 `key` 值等于 `always` 时，灰度触发生效；等于其他值时，则不会走灰度环境。

保存后使用 `kubectl apply` 生效配置文件：

```shell
kubectl apply -f ./gray.yaml
```

执行成功后，使用 `kubectl get svc` 命令获取 `ingress` 的外部端口：

```shell
kubectl -n ingress-nginx get svc
```
> -n: 指定命名空间（namespace）查询

其中，`PORT` 字段是可以访问的外部端口：80 为 `ingress` 内部端口，31234 为外部端口。

访问 `http://<Master节点IP>:31234/` 可以正常访问到页面。之后在 chrome 控制台中手动设置一个 cookie：key 为 `users_from_Beijing`，值为 `always`。刷新页面，访问的是 v2——灰度发布环境搭建成功。

### 3. 基于 Header 切分流量

基于 `Header` 切分流量的原理：根据**用户请求中的 header 是否存在灰度标示 header** 判断是否为灰度用户，再决定是否返回灰度版本服务。

配置只需修改 `annotations` 配置项：

- nginx.ingress.kubernetes.io/canary-by-header：要灰度 `header` 的 `key` 值
- nginx.ingress.kubernetes.io/canary-by-header-value：要灰度 `header` 的 `value` 值

保存后使用 `kubectl apply` 生效配置文件：

```shell
kubectl apply -f ./gray.yaml
```

查看效果可使用 `curl` 命令加 header 头请求访问：

```shell
curl --header 'header的key:header的value' 127.0.0.1:端口值
```

对比验证：当灰度 `header` 配置为 `janlay: isme` 时，`janlay` 的值不是 `isme` 则灰度失效。

### 4. 基于权重切分流量

这种实现原理是根据灰度百分比决定用户请求是否转发到灰度服务环境。

修改 `annotations` 配置项即可：

- nginx.ingress.kubernetes.io/canary-weight：值为字符串，是 `0-100` 的数字，代表灰度环境命中概率。值为 0 表示不会走灰度，值越大命中概率越大，值为 `100` 时代表全走灰度。

保存后使用 `kubectl apply` 生效配置文件：

```shell
kubectl apply -f ./gray.yaml
```

用 shell 脚本写个轮询，循环 10 次调用服务，观察灰度命中概率：

```shell
for ((i=1; i<=10; i++)); do curl 127.0.0.1:端口值;echo; done
```

轮询 10 次的命中概率大概在 `4-6` 次左右。这个命中概率只是相对于单次请求而言拥有 50% 的概率，批量执行存在误差是正常的。

### 5. 注意事项：优先级

三种灰度方案同时配置时，`ingress` 中的优先级规则在官方文档的 `Note` 提示中明确写明：

> Canary rules are evaluated in order of precedence. Precedence is as follows: 
> **canary-by-header -> canary-by-cookie -> canary-weight**

`k8s` 会优先匹配 `header`，如果未匹配则匹配 `cookie`，最后是 `weight`。

## 三、什么是滚动发布

滚动发布就是通常所说的无宕机发布。发布方式如同名称：一次取出一台/多台服务器（看策略配置）进行新版本更新，当取出的服务器新版确保无问题后，接着采用同等方式更新后面的服务器。

### 发布流程

**就绪状态**：准备一组当前服务版本为 V1 的服务器，接下来使用滚动策略将其发布到 V2 版本。

**升级第一个 Pod**：增加一个 V2 版本的 Pod1 上来，**将 V1 版本的 Pod1 下线但不移除。此时 V1 版本的 Pod1 不再接受流量，而是进入一个平滑期等待状态（大约几十秒）后才会被杀掉。**第一个 Pod 升级完毕。

**升级剩下的 Pod**：与上同理，**新增新版本 Pod 后，将旧版本 Pod 下线进入平滑期但不删除，等平滑期度过后再删除 Pod。**

### 优缺点

优点：

1. 不需要停机更新，无感知平滑更新。
2. 版本更新成本小，不需要新旧版本共存。

缺点：

1. 更新时间长：每次只更新一个/多个镜像，需要频繁连续等待服务启动缓冲（平滑期）。
2. 旧版本环境无法得到备份：始终只有一个环境存在。
3. 回滚版本异常痛苦：如果滚动发布到一半出了问题，回滚时需要使用同样的滚动策略回滚旧版本。

## 四、Kubernetes 中的滚动发布

在 `Kubernetes` 中，`Deployment` 默认就采用滚动发布的方式更新镜像，通过简单配置即可调整滚动发布策略。

编辑 `deployment` 文件：

```shell
vim ./v2.yaml
```

在 `spec` 下添加以下字段：

```yaml
spec:
  minReadySeconds: 1
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

字段含义：

| 名称 | 含义 |
| --- | --- |
| minReadySeconds | 容器接收流量延缓时间：单位为秒，默认为0。如果没有设置的话，k8s会认为容器启动成功后就可以用了。设置该值可以延缓容器流量切分 |
| strategy.type = RollingUpdate | ReplicaSet 发布类型，声明为滚动发布，默认也为滚动发布 |
| strategy.rollingUpdate.maxSurge | 最多Pod数量：为数字类型/百分比。如果 maxSurge 设置为1，replicas 设置为10，则在发布过程中pod数量最多为10 + 1个（多出来的为新版本pod）。maxUnavailable 为 0 时，该值也不能设置为0 |
| strategy.rollingUpdate.maxUnavailable | 升级中最多不可用pod的数量：为数字类型/百分比。当 maxSurge 为 0 时，该值也不能设置为0。 |

编辑结束后保存文件。接着使 Kubernetes 生效配置，配置生效后立即继续发布动作，随后监听查看发布状态更改：

```shell
kubectl apply -f ./v2.yaml && kubectl rollout status deployment/front-v2
```

通过日志可以看到，3 个 `replicas` 的更新逻辑为：**单个逐个地去进行更新 Pod，而不是一次性将旧的 Pod 全部杀死后再启动新的 Pod。**

通过简单的配置，即可在 k8s 中实现滚动发布。

### 另一种发布模式：Recreate

`Kubernetes` 中另一种发布方式为 `Recreate`：直接把所有旧的 `Pod` 全部杀死，杀死后再批量创建新的 `Pod`。

将 `strategy.type` 改为 `Recreate` 即可：

```shell
vim ./v2.yaml
# type: Recreate
```

接着更新 `deployment` 并查看发布状态：

```shell
kubectl apply -f ./v2.yaml && kubectl rollout status deployment/front-v2
```

`k8s` 会将所有旧的 `Pod` 杀死，随后再批量启动新的 `Pod`。这种发布方式相对滚动发布偏暴力，**且在发布空窗期（杀死旧 Pod、新 Pod 还没创建成功的情况下）服务会不可用。**

## 五、kubectl rollout

`kubectl rollout` 命令用于管理 `deployment` 资源，包括版本的快速回退、暂停/恢复版本更新、根据更新历史回退版本等功能。

暂停一个 `deployment` 的发布：

```shell
kubectl rollout pause deployment/名称
```

继续一个 `deployment` 的发布：

```shell
kubectl rollout resume deployment/名称
```

查看一个 `deployment` 的发布状态：

```shell
kubectl rollout status deployment/名称
```

## 六、小结

- 灰度发布（金丝雀发布）基于 ingress-nginx 的 canary 注解实现，支持三种切流方式：`canary-by-cookie`（Cookie 标示）、`canary-by-header`（Header 标示）、`canary-weight`（0-100 权重概率），优先级为 header -> cookie -> weight。
- 滚动发布按"新增新版 Pod → 旧版 Pod 下线进平滑期 → 平滑期后删除"逐个替换实例，通过 `minReadySeconds`、`maxSurge`、`maxUnavailable` 控制节奏；`Recreate` 模式则全量替换，存在服务不可用空窗期。
- `kubectl rollout` 提供 `pause`/`resume`/`status` 等发布过程管理能力。

## 参考链接


- kubernetes ingress 官方文档：[https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#canary](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#canary)

> 📖 **相关理论延伸**：灰度/滚动/蓝绿等部署策略的概念与选型逻辑，及灰度发布与 A/B 测试的关系，见《持续交付36讲》[部署策略：蓝绿、金丝雀、渐进式交付](../01-持续交付36讲/16-部署策略：蓝绿、金丝雀、渐进式交付.md) 与 [灰度发布与 A/B 测试](../01-持续交付36讲/18-灰度发布与A-B测试.md)。 
