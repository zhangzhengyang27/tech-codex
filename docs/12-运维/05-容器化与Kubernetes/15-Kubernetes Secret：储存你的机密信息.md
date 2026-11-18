---
title: Kubernetes Secret：储存你的机密信息
description: Kubernetes Secret 存储机密信息实战：Opaque 与 docker-registry 两种类型创建（命令行/stringData/配置文件）、base64 解码查看、以及 Volume 挂载、环境变量注入、imagePullSecrets 三种使用方式。
keywords: [Kubernetes, Secret, Opaque, dockerconfigjson, imagePullSecrets]
category: 部署与运维实践
tags: [DevOps, CI/CD]
---

::: warning 版本提示
本系列环境基于 Kubernetes 1.23 与 CentOS 7 编写：K8s 1.23 已 EOL，Kubernetes 自 1.24 起移除 dockershim，CentOS 7 已于 2024-06 EOL。本文流程适用于对应年代环境，新环境请参照 K8s 官方文档与容器化方案。
:::

# Kubernetes Secret：储存你的机密信息

## 一、什么是 Secret

部署应用时难免遇到需要存放**机密内容**的需求：数据库密码、用户名密码、公钥私钥、`token` 等，甚至 `docker` 私有库的密码。这些内容不能写死在代码里，更不能明文挂载进去，`Kubernetes` 中的 `Secret` 就是用于此场景的资源类型。

Secret 是 Kubernetes 内的一种资源类型，可以用来存放机密信息（密码，token，密钥等）。信息被存入后，可以使用挂载卷的方式挂载进 Pod 内；也可以存放 docker 私有镜像库的登录名和密码，用于拉取私有镜像。

## 二、Secret 的类型

### Opaque 类型

`Opaque` 类型比较常用，一般用来存放密码、密钥等信息，存储格式为 `base64`。**注意：base64 并不是加密格式，依然可以通过 decode 解开。**

以创建一组用户名密码为例，用户名为 `janlay`，密码为 `367734qwer`，通过命令 `kubectl create secret generic` 创建：

```shell
kubectl create secret generic default-auth --from-literal=username=janlay \
--from-literal=password=367734qwer
```

其中，`default-auth` 为自定义的名称，`--from-literal` 后面跟随一组 `key=value`，按此格式向后拼接即可继续存储更多信息。

存储成功后，通过 `kubectl get secret` 命令查看已存储的 `Secret`，可以看到刚创建的密钥组 `default-auth` 已经展示出来。其中，`NAME` 代表 `Secret` 的名称；`TYPE` 代表 Secret 的类型；`DATA` 是 `Secret` 内存储内容的数量；`AGE` 是创建到现在的时间。

通过 `kubectl edit secret` 命令可以编辑 `default-auth` 的内容，查看里面到底存了什么：

```shell
kubectl edit secret default-auth
```
> 也可以用 kubectl get secret [secret名称] -o yaml 命令，将内容打印到终端上查看。其中 -o yaml 代表输出为 yaml 格式内容，当然也可以输出 json 等格式内容

`data` 字段存放的是存储信息 `base64` 后的结果。这种方式是不安全的，可以通过解码 base64 获取真实值：

```shell
echo MzY3NzM0cXdlcg== | base64 -d
```
> Linux 自带的 base64 命令可以进行解码。其中 -d 代表 --decode，解码的意思

解码后即可看到原始内容。

除了通过命令创建，也可以通过配置文件创建。新建一个名称为 `admin-auth.yaml` 的文件，输入以下配置：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: admin-auth
stringData:
  username: wss
  password: wss@1234
type: Opaque
```

其中，`name` 代表 `Secret` 的名称（`admin-auth`）；`type` 代表类型（`Opaque`）；`stringData` 代表存储的内容，格式为 `key:value`。

保存退出后使用 `kubectl apply -f` 命令生效这份配置，再用 `kubectl get secret admin-auth -o yaml` 查看内容：

```shell
kubectl apply -f admin-auth.yaml
kubectl get secret admin-auth -o yaml
```

可以看到，创建正常成功。

### 私有镜像库认证

第二种是私有镜像库认证类型，也比较常用，一般在拉取私有库的镜像时使用。

私有镜像库认证同样可以通过命令行创建，类型为 `docker-registry`：

```shell
kubectl create secret docker-registry private-registry \
--docker-username=[用户名] \
--docker-password=[密码] \
--docker-email=[邮箱] \
--docker-server=[私有镜像库地址]
```

创建成功后，使用 `kubectl get secret` 命令查看配置的私有库密钥组：

```shell
kubectl get secret private-registry -o yaml
```

可以看到，k8s 自动填写了一个 key，为 `.dockerconfigjson`；value 则是一串 base64 值。使用 `base64 -d` 命令可以查看里面的内容：

```shell
echo [value] | base64 -d
```

解码后可以看到，`k8s` 自动创建了一串 `dockerconfig` 的 `json` 串。`k8s` 拉取镜像时使用这个 `json` 串进行身份认证。

私有镜像库密钥组也可以通过配置文件创建。编辑名为 `private-registry-file.yaml` 的文件，输入以下内容：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-registry-file
data:
  .dockerconfigjson: eyJhdXRocyI6eyJodHRwczovL2luZGV4LmRvY2tlci5pby92MS8iOnsidXNlcm5hbWUiOiJ1c2VyIiwicGFzc3dvcmQiOiJwYXNzIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiYXV0aCI6ImRYTmxjanB3WVhOeiJ9fX0=
type: kubernetes.io/dockerconfigjson
```

这里创建镜像库认证时，声明的配置文件更像是一份 `dockerconfig`，而不只是单纯的镜像库身份认证：`data` 内的字段必须为 `.dockerconfigjson`，值是一串 `dockerconfigjson` 的 `base64` 值；`type` 为 `kubernetes.io/dockerconfigjson`，意思是声明一份 `dockerconfig` 的配置。

保存退出，使用 `kubectl apply -f` 命令让该配置生效，并用 `kubectl get secret` 命令查看配置详情：

```shell
kubectl apply -f ./private-registry-file.yaml
kubectl get secret private-registry-file -o yaml
```

配置内容和命令行创建的一样，创建成功。

## 三、使用方法

声明 Secret 后，需要在实际的配置中使用才有实际意义。在 K8S 中，一共有三种使用 Secret 的方式。

### Volume 挂载

第一种是通过存储卷的方式挂载进去。编辑 `front-v1` 的 `deployment` 配置文件来配置。

#### 第一步：在 Pod 层面设置一个外部存储卷

存储卷类型为 `secret`，在 `template.spec` 下填写。这里声明了一个外置存储卷：存储卷名称为 `admincert`，类型为 `secret`，`Secret` 的名称为 `admin-auth`：

```yaml
volumes:
- name: admincert
  secret:
    secretName: admin-auth
```

#### 第二步：在容器配置存储卷

在 `containers[]` 下填写字段 `volumeMounts`。`name` 值和上面的卷名对应；`mountPath` 是挂载到容器内的目录，这里代表挂载到用户目录下；`readOnly` 代表文件是否只读：

```yaml
volumeMounts:
- name: admincert
  mountPath: /root
  readOnly: true
```

编辑完后保存退出，使用 `kubectl apply -f` 命令生效配置文件：

```shell
kubectl apply -f ./v1.yaml
```

此时，`Pod` 会被杀死重新创建，通过 `kubectl get pods` 查看现在运行的 `Pod`。稍后可以看到，`Pod` 状态为 `Running` 运行状态。

运行正常的情况下，使用 `kubectl exec` 命令在 `Pod` 容器内执行命令，查看 `Pod` 镜像内 `/root` 文件夹里的文件：

> kubectl exec 命令格式：kubectl exec [POD] -- [COMMAND]

```shell
kubectl exec -it [POD_NAME] -- ls /root
```

可以看到两个文件，都是 `secret` 内配置的 `key`。接着使用 `kubectl exec` 命令查看文件内容：

```shell
kubectl exec -it [POD_NAME] -- cat /root/password
kubectl exec -it [POD_NAME] -- cat /root/username
```

此时代表挂载成功，可以使用。

### 环境变量注入

第二种是将 `Secret` 注入进容器的环境变量。同样需要配置 `deployment` 文件：找到 `containers`，下面新加一个 `env` 字段。

其中，`env[].name` 为环境变量的 `key`，`valueFrom` 为值；`secretKeyRef` 代表是一个 `Secret` 类型的 `value`。`secretKeyRef.name` 是要引用的 `secret` 的名称，`key` 是 `secret` 中配置的 `key` 值：

```yaml
env:
- name: USERNAME
  valueFrom:
    secretKeyRef:
      name: admin-auth
      key: username
- name: PASSWORD
  valueFrom:
    secretKeyRef:
      name: admin-auth
      key: password
```

编辑完后保存退出，使用 `kubectl apply -f` 命令生效配置文件：

```shell
kubectl apply -f ./v1.yaml
```

生效后，在最新的 Pod 内使用 `kubectl exec` 命令查看环境变量注入结果：

```shell
kubectl exec -it [POD_NAME] -- env
```

两个环境变量均已被注入进去。

### Docker 私有库认证

第三种是 Docker 私有库类型，这种方法只能用来配置私有镜像库认证。

先尝试不加认证拉取一个私有库镜像：编辑 `front-v1` 的 `deployment`，把镜像换成私有库的镜像，保存后使用 `kubectl apply` 生效配置：

```yaml
image: [镜像库地址]/jenkins-test:latest
```

使用 `kubectl get pods` 查看 Pod 的状态：`front-v1` 的 `Pod` 无法拉取下来镜像。使用 `kubectl describe` 命令查看该 Pod 的具体状态：

```shell
kubectl describe pods [POD_NAME]
```

找到 `Events` 部分，其中一条 `message` 写着：**unauthorized: access to the requested resource is not authorized（要请求的资源没有认证）。此时不登录，无法拉取私有镜像。**

解决方法是配置 `deployment` 文件：找到 `spec`，下面新加一个 `imagePullSecrets` 字段。该字段代表拉取 Pod 所需镜像时需要的认证信息，`name` 字段为之前配置的私有镜像库认证名：

```yaml
imagePullSecrets:
 - name: private-registry-file
```

编辑保存后，使用 `kubectl apply -f` 命令生效配置文件，再查看 Pod 的运行状态：Pod 可以成功拉取私有镜像了。

## 四、小结

- `Secret` 用于存储密码、token、密钥等机密信息，支持 `Opaque`（通用键值，base64 存储）与 `kubernetes.io/dockerconfigjson`（私有镜像库认证）等类型；base64 不是加密，可直接 `base64 -d` 还原，敏感数据仍需配合权限管控。
- 创建方式包括命令行（`kubectl create secret generic/docker-registry`）与配置文件（`stringData` 明文写入、`data` 写 base64 值）。
- 三种使用方式：Volume 挂载（`volumes[].secret` + `volumeMounts`）、环境变量注入（`env[].valueFrom.secretKeyRef`）、镜像拉取认证（`imagePullSecrets`）。
