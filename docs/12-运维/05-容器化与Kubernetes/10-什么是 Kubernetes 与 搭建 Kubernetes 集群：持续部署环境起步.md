---
title: 什么是 Kubernetes 与 搭建 Kubernetes 集群：持续部署环境起步
description: Kubernetes 入门与 kubeadm 搭建集群实战：Master/Node 架构、基础环境（防火墙/Swap/Selinux）、Docker 安装与 cgroupdriver 配置、kubeadm init 初始化与 Flannel 网络安装。
keywords: [Kubernetes, kubeadm, 集群搭建, Flannel, Docker]
category: 部署与运维实践
tags: [DevOps, CI/CD]
---

::: warning 版本提示
本系列环境基于 Kubernetes 1.23 与 CentOS 7 编写：K8s 1.23 已 EOL，Kubernetes 自 1.24 起移除 dockershim，CentOS 7 已于 2024-06 EOL。本文流程适用于对应年代环境，新环境请参照 K8s 官方文档与容器化方案。
:::

# 什么是 Kubernetes 与 搭建 Kubernetes 集群：持续部署环境起步

## 一、什么是 Kubernetes

Kubernetes 是 Google 开源的容器编排引擎，支持自动化部署、大规模可伸缩、应用容器化管理。在生产环境中部署一个应用程序时，通常要部署该应用的多个实例以便对应用请求进行负载均衡。

通俗地讲，Kubernetes 可以看作一个用来部署镜像的平台：它能够操作多台机器调度部署镜像，大大降低运维成本。

**Kubernetes 与 Docker 的关系**：如果将 Docker 看作飞机，那么 Kubernetes 就是飞机场。在飞机场的加持下，飞机可以根据机场调度选择在合适的时间降落或起飞。

在 Kubernetes 中，使用集群来组织服务器。集群中存在一个 `Master` 节点，它是 Kubernetes 集群的控制节点，负责调度集群中其他服务器的资源；其他节点被称为 `Node`，Node 可以是物理机也可以是虚拟机。

## 二、基础安装（Master 与 Node 节点）

**基础安装章节，Master 与 Node 节点都需要安装。**

### 必备组件与系统配置

第一步安装必备组件：`vim` 是 Linux 下的文件编辑器；`wget` 用于文件下载；`ntpdate` 用于同步时区：

```shell
yum install vim wget ntpdate -y
```

第二步关闭防火墙。**Kubernetes 会创建防火墙规则，导致防火墙规则重复**，因此需要将防火墙关闭：

```shell
systemctl stop firewalld && systemctl disable firewalld
```

第三步关闭 `Swap` 分区。`Swap` 是 Linux 的交换分区，在系统资源不足时会启用，这会拖慢应用性能。新创建的服务应当自动调度到集群的其他 `Node` 节点，而不是使用 `Swap` 分区，因此将其关闭：

```shell
#临时关闭
swapoff -a
# 永久关闭
vi /etc/fstab
```

在 `/etc/fstab` 文件中注释掉下面这一行：

```shell
/dev/mapper/centos-swap swap ...
```

第四步关闭 `Selinux`。这是为了支持容器可以访问宿主机文件系统所做的，后续也许会优化掉：

```shell
# 暂时关闭 selinux
setenforce 0
```

```shell
# 永久关闭
vi /etc/sysconfig/selinux
# 修改以下参数，设置为disable
SELINUX=disabled
```

> **关于为什么关闭防火墙、selinux、swap，这里有几份更标准的回答：**[**https://www.zhihu.com/question/374752553**](https://www.zhihu.com/question/374752553)

第五步使用 `ntpdate` 统一系统时间和时区，服务器时间与阿里云服务器对齐：

```shell
# 统一时区，为上海时区
ln -snf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
bash -c "echo 'Asia/Shanghai' > /etc/timezone"

# 统一使用阿里服务器进行时间更新
ntpdate ntp1.aliyun.com
```

### 安装 Docker

Kubernetes 中的组件、服务都可以以 Docker 镜像方式部署，因此安装 Docker 是必不可少的。

安装 Docker 之前，需要安装 `device-mapper-persistent-data` 和 `lvm2` 两个依赖，使用 `Yum` 命令直接安装：

```shell
yum install -y yum-utils device-mapper-persistent-data lvm2
```
> device-mapper-persistent-data: 存储驱动，Linux上的许多高级卷管理技术
> lvm: 逻辑卷管理器，用于创建逻辑磁盘分区使用

接下来添加阿里云的 Docker 镜像源，加速 Docker 的安装：

```shell
sudo yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
yum install docker-ce -y
```

还需要修改 Docker 的 `cgroupdriver` 为 `systemd`，这样做是为了避免后面与 K8s 的冲突：

```shell
cat > /etc/docker/daemon.json <<EOF
{
  "exec-opts": ["native.cgroupdriver=systemd"]
}
EOF
```

安装完毕后，使用 `systemctl` 启动 Docker 即可：

```shell
systemctl start docker
systemctl enable docker
```

执行 `docker -v`，如果正常显示 Docker 版本信息，代表 Docker 安装成功。

拉取 Docker 镜像时一般默认从 Docker 官方源拉取，但国内网速较慢，通常更换为阿里云镜像仓库源进行镜像下载加速：登录阿里云官网，打开 [阿里云容器镜像服务](https://cr.console.aliyun.com)，点击左侧菜单最下面的 `镜像加速器`，选择 `CentOS`，按照官网提示执行命令，即可实现更换 Docker 镜像源地址。

另外，**如果私有镜像库是 HTTP 而不是 HTTPS，需要在 `/etc/docker/daemon.json` 里配置私有库地址**：编辑 `/etc/docker/daemon.json` 文件，添加 `insecure-registries` 字段，字段值为数组，数组第一项填入私有库地址（不要忘记后面的逗号）。示例：

```json
{
  "insecure-registries": ["[私有库地址]:[私有库端口]"],
  "registry-mirrors": ["https://*****.mirror.aliyuncs.com"]
}
```

保存后退出，重启 Docker 服务：

```shell
sudo systemctl daemon-reload
sudo systemctl restart docker.service
```

### 安装 Kubernetes 组件

开始安装 Kubernetes 的相关组件，先将安装源更换为国内的阿里云源：

```shell
cat <<EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=http://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=0
repo_gpgcheck=0
gpgkey=http://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg
        http://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF
```

接着直接使用 `yum` 命令安装 `kubelet`、`kubeadm`、`kubectl`，安装完毕后启用 `kubelet` 即可：

```shell
yum install -y kubelet-1.23.6 kubeadm-1.23.6 kubectl-1.23.6
# 启动kubelet
systemctl enable kubelet && systemctl start kubelet
```
> `kubelet` 是 Kubernetes 中的核心组件。它会运行在集群的所有节点上，并负责创建启动服务容器
> `kubectl` 则是Kubernetes的命令行工具。可以用来管理，删除，创建资源
> `kubeadm`  则是用来初始化集群，子节点加入的工具。

---

## 三、Master 节点安装

Master 节点是集群内的调度和主要节点，**以下部分仅限 Master 节点安装。**

首先使用 `hostnamectl` 修改主机名称为 `master`。`hostnamectl` 是 CentOS7 出的新命令，可以用来修改主机名称：

```shell
hostnamectl set-hostname  master
```

接着使用 `ip addr` 命令获取本机 IP，将其添加到 `/etc/hosts` 内：

```shell
# xxx.xxx.xxx.xxx master
vim /etc/hosts
```

### 配置 Kubernetes 初始化文件

使用 `kubeadm config print init-defaults` 输出一份默认初始化配置文件，使用 `>` 操作符导出为文件，方便修改：

```shell
kubeadm config print init-defaults > init-kubeadm.conf
vim init-kubeadm.conf
```

主要对配置文件做这几件事情：

- 更换 Kubernetes 镜像仓库为阿里云镜像仓库，加速组件拉取；
- 替换 `ip` 为自己主机 `ip`；
- 配置 `pod` 网络为 `flannel` 网段。

```shell
# imageRepository: k8s.gcr.io 更换k8s镜像仓库
imageRepository: registry.cn-hangzhou.aliyuncs.com/google_containers
# localAPIEndpoint，advertiseAddress 为 master-ip，port 默认不修改
localAPIEndpoint:
  advertiseAddress: 192.168.56.101  # 此处为master的IP
  bindPort: 6443
# 配置子网络
networking:
  dnsDomain: cluster.local
  serviceSubnet: 10.96.0.0/12
  podSubnet: 10.244.0.0/16	# 添加这个
```

修改完配置文件后，使用 `kubeadm` 拉取默认组件镜像：

```shell
kubeadm config images pull --config init-kubeadm.conf
```

### 初始化 Kubernetes

镜像拉取后，使用编辑好的配置文件初始化 Kubernetes 集群，直接使用 `kubeadm init` 命令：

```shell
kubeadm init --config init-kubeadm.conf
```

静等运行一会后，终端会给出初始化成功的提示。

其中，`Master` 节点需要执行的初始化命令，作用是将默认的 Kubernetes 认证文件拷贝进 `.kube` 文件夹内，才能默认使用该配置文件。

输出末尾的 `kubeadm join ...` 命令则需要在 `node` 节点执行，作用是快速将 Node 节点加入到 Master 集群内。

### 安装 Flannel

前面配置文件中提到的 **Pod 子网络**正是 Flannel 的作用范围。**Flannel 的主要作用是通过创建一个虚拟网络，让不同节点下的服务有着全局唯一的 IP 地址，且服务之间可以互相访问和连接。**

Flannel 作为 Kubernetes 的一个组件，使用 Kubernetes 部署服务的方式进行安装。首先下载配置文件：

```shell
wget https://raw.githubusercontent.com/coreos/flannel/v0.18.1/Documentation/kube-flannel.yml
```
> 如果提示 raw.githubusercontent.com 无法访问或连接超时，可以尝试以下办法：
> 1. 去 [https://githubusercontent.com.ipaddress.com/raw.githubusercontent.com](https://githubusercontent.com.ipaddress.com/raw.githubusercontent.com) 获取新的IP
> 1. 编辑 hosts 文件，将获取的新IP直接映射到域名上

接着手动拉取 flannel 镜像。找到编写镜像名称和版本的地方，使用 `docker pull` 手动拉取镜像：

```shell
docker pull quay.io/coreos/flannel:v0.13.0-rc2
```

等待镜像拉取结束后，使用 `kubectl apply` 命令加载服务：

```shell
kubectl apply -f kube-flannel.yml
```

### 查看启动情况

大约 1 分钟后，使用 `kubectl get nodes` 命令查看节点的运行状态。如果 `STATUS = ready`，则代表启动成功：

```shell
kubectl get nodes
```

## 四、Node 节点配置

**在安装 Node 节点前，需要先完整操作一遍上面的 `基础安装`。** Node 节点的职责是运行服务容器、负责接收调度。

第一步先设置 `hostname` 为 `node1`。在 node 机器上执行：

```shell
hostnamectl set-hostname node1
```

### 拷贝 Master 节点配置文件

将 `master` 节点的 K8s 配置文件拷贝到 `node` 节点：回到 `master` 节点，使用 `scp` 命令通过 SSH 传送文件：

```shell
scp $HOME/.kube/config root@node的ip:~/
```

随后在 `node` 节点执行以下命令，归档配置文件：

```shell
mkdir -p $HOME/.kube
sudo mv $HOME/config $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

### 加入 Master 节点

使用刚才在 `master` 生成的节点加入命令，在 `node` 机器上执行，让 Node 节点加入到 `master` 集群内：

```shell
# 这是一条是示例命令！！！！！！
kubeadm join 172.16.81.164:6443 --token abcdef.0123456789abcdef \
    --discovery-token-ca-cert-hash sha256:b4a059eeffa2e52f2eea7a5d592be10c994c7715c17bda57bbc3757d4f13903d
```

如果刚才的命令丢了，可以在 `master` 机器上使用 `kubeadm token create` 重新生成一条命令：

```shell
kubeadm token create --print-join-command
```

### 安装 Flannel

**与 Master 节点安装执行方式一样，参考同上。**

## 五、小结

- Kubernetes 是容器编排引擎，与 Docker 的关系可类比"机场调度飞机"：Master 节点负责调度，Node 节点负责承载服务。
- 集群搭建前的基础环境配置包括：安装必备组件、关闭防火墙（避免与 K8s 防火墙规则重复）、关闭 Swap（避免拖慢性能）、关闭 Selinux、用 ntpdate 统一时间。
- Docker 需配置 `cgroupdriver=systemd` 避免与 K8s 冲突；HTTP 私有镜像库需在 `daemon.json` 配置 `insecure-registries`。
- Master 侧流程：修改主机名与 hosts → 生成并修改 `kubeadm` 初始化配置（镜像仓库、 advertiseAddress、podSubnet=10.244.0.0/16）→ 拉取镜像 → `kubeadm init` → 安装 Flannel → `kubectl get nodes` 验证。
- Node 侧流程：基础安装 → 设置主机名 → 拷贝 `.kube/config` → `kubeadm join`（令牌丢失可用 `kubeadm token create --print-join-command` 重新生成）→ 安装 Flannel。
