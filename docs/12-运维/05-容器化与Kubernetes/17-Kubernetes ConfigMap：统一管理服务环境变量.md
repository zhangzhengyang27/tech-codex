---
title: Kubernetes ConfigMap：统一管理服务环境变量
description: Kubernetes ConfigMap 管理环境变量：与 Secret 的区别、四种创建方式（命令行/配置清单/文件/目录）、env 与 envFrom 环境变量注入、存储卷挂载及 items 按需挂载单个文件。
keywords: [Kubernetes, ConfigMap, envFrom, configMapKeyRef, 挂载卷]
category: 部署与运维实践
tags: [DevOps, CI/CD]
---

::: warning 版本提示
本系列环境基于 Kubernetes 1.23 与 CentOS 7 编写：K8s 1.23 已 EOL，Kubernetes 自 1.24 起移除 dockershim，CentOS 7 已于 2024-06 EOL。本文流程适用于对应年代环境，新环境请参照 K8s 官方文档与容器化方案。
:::

# Kubernetes ConfigMap：统一管理服务环境变量

## 一、什么是 ConfigMap

日常开发部署时经常遇到环境变量的配置需求：数据库地址、负载均衡要转发的服务地址等。这类内容使用 `Secret` 显然不合适，打包在镜像内耦合又太严重，此时可以借助 `Kubernetes ConfigMap`。

`ConfigMap` 是 `Kubernetes` 的一种资源类型，用于存放环境变量和配置文件。信息存入后，可以使用挂载卷的方式挂载进 Pod 内，也可以通过环境变量注入。与 `Secret` 最大的不同是，存在 `ConfigMap` 内的内容不会加密。

## 二、创建方式

与 `Secret` 一样，`ConfigMap` 支持多种创建方式。

### 命令行直接创建

第一种是使用命令行直接创建，使用 `kubectl create configmap [config_name]` 命令，格式如下：

```shell
kubectl create configmap [config_name] --from-literal=[key]=[value]
```

`--from-literal` 对应一条信息；想创建多个 `key value` 组合，向后重复 `--from-literal=[key]=[value]` 即可。

例如创建一个 `mysql` 的配置，包含服务地址、端口：

```shell
kubectl create configmap mysql-config \
--from-literal=MYSQL_HOST=192.168.1.172 \
--from-literal=MYSQL_PORT=3306
```
> 注意：configmap 的名称必须是全小写，特殊符号只能包含 '-' 和 '.'。可以用下面的这个正则表达式校验下看看符不符合规则：
> 

> `[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*`


创建成功后，使用 `kubectl get cm` 查看创建过的 `configmap`：刚创建的 `ConfigMap` 的 `DATA` 为 `2`，代表有 `2` 条数据存在。使用 `kubectl describe cm mysql-config` 可查看这个 `ConfigMap` 的具体信息，确认存放的数据，代表该 `configmap` 创建成功。

### 配置清单创建

通过一份配置清单创建：

新建一个名称为 `mysql-config-file.yaml` 的文件，填入以下内容：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-config-file
data:
  MYSQL_HOST: '192.168.1.172'
  MYSQL_PORT: '3306'
```
> 字符串不要忘记加引号

字段含义：`kind` 的值为 `ConfigMap`，代表声明一个 `ConfigMap` 类型的资源；`metadata.name` 是该 `configmap` 的名称；`data` 是存放数据的地方，数据格式为 `key:value`。

保存后使用 `kubectl apply` 命令使配置生效：

```shell
kubectl apply -f ./mysql-config-file.yaml
```

生效后，使用 `kubectl describe cm mysql-config-file` 查看配置结果，确认创建的内容成功存入。

### 文件创建

另一种方式是将文件加载进去，适合挂载配置文件（例如 nginx 配置文件等）。使用 `kubectl create configmap` 命令行创建，格式如下：

```shell
kubectl create configmap [configname] --from-file=[key]=[file_path]
```

每一条 `--from-file` 代表一个文件，key 是文件在 `configmap` 内的 `key`，`file_path` 是文件的路径。

创建一个名为 `env.config` 的文件，输入以下内容：

```
URL: 192.168.1.173
PATH: /root/abcd/efg
```

保存后，使用 `kubectl create configmap` 命令将其存入 `configmap`：

```shell
kubectl create configmap env-from-file --from-file=env=./env.config
```

使用 `kubectl get cm env-from-file -o yaml` 查看保存进入的内容：`configmap` 将整个文件内容都保存了进去，`env` 是这个文件的 `key` 值。

### 目录创建

除了单个文件，也可以将一个目录下的文件整个存入。

目录创建与文件创建的命令类似，差别只是将 `--from-file` 的值从一个 `key=value` 变成输入一整个文件夹：

```shell
kubectl create configmap [configname] --from-file=[dir_path]
```

创建一个文件夹，下面存放几个文件来测试。创建三个文件 `env1.config`、`env2.config`、`env3.config`，内容与文件名对应：

```shell
mkdir env && cd ./env
echo 'env1' > env1.config
echo 'env2' > env2.config
echo 'env3' > env3.config
```

使用创建命令，将内容批量存入到 `configmap` 内：

```shell
kubectl create configmap env-from-dir --from-file=./
```

创建完成后，使用 `kubectl get cm env-from-dir -o yaml` 查看保存进去的文件内容：文件夹下的文件内容被批量存放了进去。

## 三、使用方式

### 环境变量注入

注入到环境变量是比较常见的方式。编辑 `front-v1` 的 `deployment` 配置文件，将 `configmap` 注入进环境变量：

```yaml
env:
- name: MYSQL_HOST
  valueFrom:
    configMapKeyRef:
      name: mysql-config
      key: MYSQL_HOST
```

`configmap` 的环境变量注入与 `Secret` 的方式差别不大，只是字段换成了 `configMapKeyRef`：`name` 为要选择注入的 `configmap` 名称；`key` 为 `configmap` 内的其中一个 `key`。

编辑完后保存退出，使用 `kubectl apply -f` 命令生效配置文件，此时旧 Pod 会被杀死重启创建：

```shell
kubectl apply -f ./v1.yaml
```

生效后，在最新的 `Pod` 内使用 `kubectl exec` 命令查看环境变量注入结果：

```shell
kubectl exec -it [POD_NAME] -- env | grep MYSQL_HOST
```

环境变量成功注入。

---

一条一条注入环境配置比较繁琐。一次性将整个 `ConfigMap` 注入，可以借助 `containers.envFrom` 字段批量导入：

```yaml
envFrom:
- configMapRef:
   name: mysql-config
   optional: true
```
> 注意：使用 `envFrom` 时，如果 `configmap` 中的 key 不是合法的环境变量名（例如含有 "-" 或 "."），该 key 会被跳过（Pod 可正常启动，但事件中会记录 InvalidVariableNames 警告），并不会自动转换为 "_"

`name` 为已配置好的 `configmap`；`optional` 代表如果没有该 `configmap`，容器是否能够正常启动。

编辑 `front-v1` 的 `deployment` 配置文件加入这项配置，保存并生效。`Pod` 杀死重建后，使用 `kubectl exec` 命令查看 `Pod` 内环境变量注入情况：

```shell
kubectl exec -it [POD_NAME] -- env | grep MYSQL
```

环境变量被批量注入。

### 存储卷挂载

第二种方式是存储卷挂载。这种方式会将 `configmap` 内容中的每个 `key` 和 `value`，以独立文件方式通过外部挂载卷挂载进去（`key` 是文件名，`value` 是文件内容）。用法与 `Secret` 的存储卷挂载类似。

编辑 `front-v1` 的 `deployment` 配置文件：

#### 第一步：在 Pod 层面声明一个外部存储卷

`name` 为存储卷名称；`configMap` 代表存储卷的文件来源为 `configMap`；`configMap.name` 填入要加载的 `configMap` 名称：

```yaml
volumes:
- name: envfiles
  configMap: 
    name: env-from-dir
```

#### 第二步：在容器镜像层面配置存储卷

`name` 的值来源于第一步配置的 `name` 值；`mountPath` 为要挂载的目录；`readOnly` 代表文件是否只读：

```yaml
volumeMounts:
- name: envfiles
  mountPath: /root/
  readOnly: true
```

编辑完后保存退出，使用 `kubectl apply -f` 命令生效配置文件：

```shell
kubectl apply -f ./v1.yaml
```

待 `Pod` 杀死重建后，使用 `kubectl exec` 命令查看目录中的文件，验证是否挂载成功：

```shell
kubectl exec -it [POD_NAME] -- ls /root
```

三个文件都成功挂载。

---

这种方式每次挂载都要将整个文件夹挂载进去。一次只挂载单个文件，可以借助 `volumes.configMap.items[]` 字段配置多个 `item` 项：

```yaml
volumes:
- name: envfiles
  configMap:
    name: env-from-dir
    items:
    - key: env1.config
      path: env1.config
    - key: env2.config
      path: env2.config
```

`item` 是个数组，每一项都是一条 `ConfigMap` 里的独立字段：`key` 是 `ConfigMap` 中的字段名称；`path` 是要挂载的路径（相对于容器镜像层面配置存储卷时的 `mountPath` 字段）。填写保存后退出生效。

使用 `kubectl exec` 命令验证挂载结果：只挂载了配置的 2 个文件。

## 四、小结

- `ConfigMap` 用于外置环境变量与配置文件，与业务代码解耦；内容明文存储（区别于 Secret 的 base64 机密存储）。
- 四种创建方式：`--from-literal` 键值对、配置清单 `data` 字段、`--from-file` 单文件（适合挂载 nginx 等配置文件）、`--from-file` 整目录批量导入；名称须匹配正则 `[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*`。
- 两种使用方式：环境变量注入（单条 `configMapKeyRef`、批量 `envFrom` + `configMapRef`）与存储卷挂载（`volumes[].configMap` + `volumeMounts`，可用 `items[]` 按需只挂载部分文件）。
- 注意 `envFrom` 对非法环境变量名的 key 会直接跳过，不会自动转换。
