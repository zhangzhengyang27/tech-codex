---
title: 防火墙：iptables 企业级安全策略
description: iptables 的 4 表 5 链基础、与 firewalld 的差异，以及白名单、黑名单限频、SYN Flood、ICMP、SSH 暴力破解防护等企业级安全规则设置
keywords: [运维, 防火墙, iptables, 企业级安全策略, firewalld, nftables]
category: 部署与运维实践
tags: [DevOps, 运维]
---
# 防火墙：iptables 企业级安全策略

## 一、什么是 iptables

iptables 是 Linux 上的一套防火墙服务，它调用的其实是 Netfilter 内核模块。Netfilter 是 Linux 操作系统核心层内部的一个数据包处理模块，具有如下功能：

- 网络地址转换；
- 数据包内容修改；
- 数据包过滤防火墙功能。

现实中很多应用服务都调用了 Netfilter：

![](/ops-course-images/26-防火墙_iptables_企业级安全策略__CgqCHl7GXLmAQNIJAAAx_JTgoQQ756.png)

图的中央就是 Netfilter 的 Linux 内核模块；最下层的 iptables 调用 Netfilter 模块来作为安全防火墙。CentOS7 以后出现的新防火墙服务 firewalld 同样调用了 Netfilter 模块。总体来说，无论是 iptables 还是 firewalld，都是调用了 Linux 的 Netfilter 内核模块。（另注：较新的发行版默认转向基于内核 nftables 的 `nft` 工具，RHEL 8 起还提供 iptables-nft 兼容层——nftables 已是现代替代方案，iptables 语法仍可继续使用。）

图片左边有一个 ipvs 应用工具，它也调用了 Netfilter，但功能与安全防护的防火墙有所区别：主要用来实现地址转换这一核心功能，因此 ipvs 会为很多负载均衡提供服务，也就是为 LVS 提供服务。LVS 就是使用 ipvs 的命令模块来对数据包规则进行设置，所以 ipvs 的上一层会供 LVS 调用；它在运维管理中可以作为防火墙服务使用。总结来说，负载均衡的服务其实也是调用了 Netfilter 内核模块。

图的左下角还有一个 Kube-proxy 命令模块，它既调用 ipvs，也调用 iptables。Kube-proxy 是 K8s 里的一个组件，负责管理 K8s 里的 service 模块（后端服务）；管理后端服务需要对数据包进行转发，并实现负载均衡。Kube-proxy 之所以还调用 iptables，是因为早期的 Kube-proxy 版本基于 iptables 实现，但 iptables 并非专门用作数据包转发，在 service 数量超过 1000 个的情况下，性能上 ipvs 优于 iptables，因此逐渐改用 ipvs 服务代替 iptables 工具。

从这张图可以看到 Netfilter 在整个应用平台服务里起到的至关重要的作用，而在其之上发布的是两款专业的防火墙工具——iptables 与 firewalld。

## 二、iptables 与 firewalld 的差异

两个防火墙服务之间有两个比较大的差异：

1. **默认策略相反**：iptables 默认允许访问服务或通过数据包进行访问，不允许某些数据包访问时，才设置具体规则进行阻断；firewalld 则默认拒绝所有数据包访问，只有满足某条允许规则的数据包才被放行。
2. **区域概念**：firewalld 在数据安全防护管理上引入了区域（zone）的概念，把网络环境分成多个区域进行安全管理；iptables 不分区，直接以面的方式进行规则设置。

企业层面的安全规则设置以下以 iptables 为例展开。

## 三、iptables 基础：4 表 5 链与自定义链

iptables 有一个很重要的设置概念：4 表 5 链。可以理解为把不同维度上对数据包的设置组合起来，完成数据包安全功能上的具体配置。

**4 张表**：

| 表 | 作用 |
| --- | --- |
| Filter | 过滤数据包（默认表） |
| NAT | 网络地址转换（IP、端口） |
| Mangle | 修改数据包的服务类型、TTL，并可配置路由实现 QoS |
| Raw | 决定数据包是否被状态跟踪机制处理 |

**5 条链**：

- INPUT 链：进来的数据包应用此规则链中的规则；
- OUTPUT 链：外出的数据包应用此规则链中的规则；
- FORWARD 链：转发数据包时应用此规则链中的规则；
- PREROUTING 链：对数据包作路由选择前应用此链中的规则；
- POSTROUTING 链：对数据包作路由选择后应用此链中的规则。

表和链共同组合，才完成了完整的数据包规则设置。一个数据包通常需要经过对应表中不同链结合起来的规则，从而完成整个流程的处理。

另一个需要特别提及的概念是**自定义链**。与 4 表 5 链相比，自定义链的特殊之处在于：它是为方便管理而存在的，并不会被直接使用，需要通过被默认链引用才能生效。可以把它理解为用户指定的规则链名称，用于方便整体规则上的组织。安全防控规则通常通过 iptables 的 Filter 表结合 INPUT 链进行设置。

## 四、命令规则设置的常见选项

通过 iptables 命令设置安全防护规则时，常见选项如下：

![](/ops-course-images/26-防火墙_iptables_企业级安全策略__Ciqc1F7GXNaAWc-BAACVfKp2FC8903.png)

- `-A`：向指定链添加一个或多个新规则；
- `-D`：从指定链中删除一个或多个规则；
- `-N`：创建一个新的用户定义链；
- `-F`：清空（flush）指定链或所有链中的规则，常用于初始化；
- `-X`：删除指定的用户定义链（需先清空链路中的策略）；
- `-p`：指定具体协议，如 TCP、UDP、ICMP 等常见协议数据包；
- `-s`：指定 IP 地址 [/mask] 源地址；
- `-d`：指定 IP 地址 [/mask] 目标地址；
- `-i`：指定数据包进入的设备接口，多网卡时可能需要指定具体接口。

## 五、企业级安全规则实战

### 初始化规则

iptables 初始化即将规则清空，同时设置一个默认规则。使用 `-F` 清空规则中的策略，`-X` 删除用户自定义链，`-Z` 将指定链路或策略中的计数归零，完成整体规则的清空；再用 `iptables -P` 分别为 INPUT、OUTPUT、FORWARD 三条链设置默认策略 ACCEPT（允许所有数据包访问）。此时初始化没有做任何安全防护规则，而是清空以往规则并设置一条权限较大的规则，在此基础上再进行具体的安全防护规则设置。

每次执行 iptables 命令后，命令会转化为 iptables 所能识别的一条规则写入配置文件。为便于批量管理，通常把 iptables 命令和选项封装成 Shell 脚本进行批量化设置。

### 白名单：放行本地回环、内部网段与指定主机

```bash
iptables -A INPUT -i lo -j ACCEPT  # 允许本地回环访问
LOCAL_NET="xxx.xxx.xxx.xxx/xx"     # 允许内部指定网段访问
if [ "$LOCAL_NET" ]
then
        iptables -A INPUT -p tcp -s $LOCAL_NET -j ACCEPT
fi
ALLOW_HOSTS=(                      # 允许访问主机 IP 开白
       "xxx.xxx.xxx.xxx"
       "xxx.xxx.xxx.xxx"
)

if [ "${ALLOW_HOSTS}" ]
then
        for allow_host in ${ALLOW_HOSTS[@]}
        do
                iptables -A INPUT -p tcp -s $allow_host -j ACCEPT
        done
fi

```

`-A` 表示向 INPUT 链添加规则，配合 `-i` 指定本地回环网卡（lo），即放行本地回环访问。`LOCAL_NET` 是定义的 Shell 变量，用于配置本地网络段；变量存在时执行 `iptables -A INPUT`，其中 `-p tcp` 表示 TCP 协议，`-s` 表示源地址，即允许所有本地网络源地址访问这台主机。`ALLOW_HOSTS` 数组则逐一放行允许访问的主机 IP。

### 黑名单：限频记录并丢弃

```bash
DENY_HOSTS=(                # 直接丢弃列表
       "xxx.xxx.xxx.xxx"
       "xxx.xxx.xxx.xxx"
)
if [ "${DENY_HOSTS}" ]
then
        for deny_host in ${DENY_HOSTS[@]}
        do
                iptables -A INPUT -s $deny_host -m limit --limit 1/s -j LOG --log-prefix "deny_host: "
                iptables -A INPUT -s $deny_host -j DROP
        done
fi

```

`DENY_HOSTS` 数组设置不允许访问的源 IP，并对其进行限频：对列表中的每个源 IP，先用 `-m` 加载的 limit 扩展模块做速率限制，`--limit 1/s` 表示每秒最多匹配一次，即该 IP 每秒至多记录一条日志（限频）；随后再加一条规则把它的数据包直接 DROP 丢弃——既做日志记录，也把数据包丢弃。

### 会话状态放行

```bash
iptables -A INPUT  -p tcp -m state --state ESTABLISHED,RELATED -j ACCEPT     # 建立会话后允许数据包通信

```

`-m state` 是 iptables 里通常需要加入的模块，表示已建立会话的包允许通信。例如设置 iptables 规则的主机主动访问黑名单主机里的服务：由于是主动发起的，一旦建立起会话，服务端这些黑名单主机回包到本主机上也允许通过。这与黑名单的差异在于：没有建立会话时，黑名单主机主动对本主机建联是不允许的。两条规则同时加上，更符合实际的 iptables 规则设置需求，且主机主动访问任何地址都可以通过这条规则优先匹配。

### SYN Flood 防护

针对 SYN 攻击等常见 4 层攻击，iptables 可以通过 hashlimit 限频进行防护：

```bash
iptables -N SYN_FLOOD
iptables -A SYN_FLOOD -p tcp --syn \
         -m hashlimit \
         --hashlimit 200/s \
         --hashlimit-burst 3 \
         --hashlimit-htable-expire 300000 \
         --hashlimit-mode srcip \
         --hashlimit-name t_SYN_FLOOD \
         -j RETURN
# --hashlimit 200/s：每秒最多放行 200 个新建连接（超出进入下方 LOG/DROP）
# --hashlimit-burst 3：令牌桶初始容量 3（允许 3 个突发）
# --hashlimit-htable-expire 300000：哈希表记录有效期限（单位：毫秒）
# --hashlimit-mode srcip：通过源地址管理请求数
# --hashlimit-name t_SYN_FLOOD：哈希表名，记录存储在 /proc/net/ipt_hashlimit
iptables -A SYN_FLOOD -j LOG --log-prefix "syn_flood_attack: "
iptables -A SYN_FLOOD -j DROP
iptables -A INPUT -p tcp --syn -j SYN_FLOOD

```

`-N SYN_FLOOD` 建立了一条自定义的规则链。这条自定义链中的具体策略为：首先匹配 tcp --syn 协议的数据包，hashlimit 限频每秒最多 200 次放行，突发容量为 3；未超过限速的数据包以 `-j RETURN` 返回默认链继续处理，超过限速的则不再 RETURN，落入后面的 LOG 记录与 DROP 丢弃两条规则。`--hashlimit-htable-expire` 对 hashlimit 哈希表的数据设置了过期时间，因为 hashlimit 表需要记录状态，所以需要设置有效期。`--hashlimit-mode srcip` 表示通过源地址管理请求数，即基于客户端源地址做唯一性标识进行判断。这一串命令主要做频次上的具体协议包限制，即不允许单个地址通过 tcp --syn 发起过多请求、建立过多连接。

自定义链都需要通过默认链调用：在默认链 INPUT 中以 `-j` 加自定义链名称的方式调用，即完成整个自定义链的设置。

### ICMP 防护（Ping of Death）

对其他协议的包可以用同样的办法，ICMP 设置如下：

```bash
iptables -N PING_OF_DEATH  # 丢弃超出限制的 ICMP
iptables -A PING_OF_DEATH -p icmp --icmp-type echo-request \
         -m hashlimit \
         --hashlimit 1/s \
         --hashlimit-burst 10 \
         --hashlimit-htable-expire 300000 \
         --hashlimit-mode srcip \
         --hashlimit-name t_PING_OF_DEATH \
         -j RETURN
iptables -A PING_OF_DEATH -j LOG --log-prefix "ping_of_death_attack: "
iptables -A PING_OF_DEATH -j DROP
iptables -A INPUT -p icmp --icmp-type echo-request -j PING_OF_DEATH

```

对 ICMP 连接做具体规则设置时，同样新建一条自定义链，在其中设置频次与具体策略，最后由默认链 INPUT 调用自定义链，实现对 ICMP 超出规则的设置。这里每秒只放行一次 ICMP 请求，突发容量为 10（`--hashlimit-burst 10`），超过后的请求会被记录日志并丢弃。

### HTTP 端口频次限制

HTTP 也可以纳入同样的防护。HTTP 虽是应用层协议，但这里的限制是基于 4 层策略的：`-p tcp` 之下针对 HTTP 端口做 TCP 连接的频次限制，而非基于 7 层会话的 cookie/session：

```bash
HTTP="80,443"
iptables -N HTTP_DOS
iptables -A HTTP_DOS -p tcp -m multiport --dports $HTTP \
         -m hashlimit \
         --hashlimit 1/s \
         --hashlimit-burst 100 \
         --hashlimit-htable-expire 300000 \
         --hashlimit-mode srcip \
         --hashlimit-name t_HTTP_DOS \
         -j RETURN
# --hashlimit-name t_HTTP_DOS：哈希表记录存储在 /proc/net/ipt_hashlimit
iptables -A HTTP_DOS -j LOG --log-prefix "http_dos_attack: "
iptables -A HTTP_DOS -j DROP
iptables -A INPUT -p tcp -m multiport --dports $HTTP -j HTTP_DOS

```

这里基于 4 层限制了 7 层：执行的是 TCP 连接限制，只不过指定了访问的具体服务端口，从而进行频次限制。基于底层连接式的频次限制，同样有助于应用层的安全。

### SSH 暴力破解防护

SSH 最大的问题是存在暴力破解，因此需要设置在指定时间内允许多少次访问，超出后做具体的安全限制。基于同样的思路，通过 recent 模块实现：

```bash
SSH=22
iptables -A INPUT -p tcp --syn -m multiport --dports $SSH -m recent --name ssh_attack --set
iptables -A INPUT -p tcp --syn -m multiport --dports $SSH -m recent --name ssh_attack --rcheck --seconds 60 --hitcount 5 -j LOG --log-prefix "ssh_brute_force: "
iptables -A INPUT -p tcp --syn -m multiport --dports $SSH -m recent --name ssh_attack --rcheck --seconds 60 --hitcount 5 -j REJECT --reject-with tcp-reset

```

同样是基于 TCP 协议请求，访问 SSH 端口时会判断最近 60 秒内的访问次数，超过次数限制就执行 REJECT（以 tcp-reset 方式拒绝该 IP 访问）。SSH、FTP 等服务都可以通过这种方式防止暴力破解攻击。

### 对外服务开放

接下来设置哪些服务需要正常对外提供服务：某些服务仅允许指定网段访问（如 SSH、FTP、MySQL），某些公共服务（如 HTTP）需要对外开放，则把网段源地址限制去掉，直接放行端口：

```bash
iptables -A INPUT -p tcp -m multiport --dports $HTTP -j ACCEPT
# ...（其他需要开放的服务，同理追加）
LIMITED_LOCAL_NET="xxx.xxx.xxx.xxx/xx"
if [ "$LIMITED_LOCAL_NET" ]
then
        # SSH
        iptables -A INPUT -p tcp -s $LIMITED_LOCAL_NET -m multiport --dports $SSH -j ACCEPT # LIMITED_LOCAL_NET -> SELF
        # FTP
        iptables -A INPUT -p tcp -s $LIMITED_LOCAL_NET -m multiport --dports $FTP -j ACCEPT # LIMITED_LOCAL_NET -> SELF
        # MySQL
        iptables -A INPUT -p tcp -s $LIMITED_LOCAL_NET -m multiport --dports $MYSQL -j ACCEPT # LIMITED_LOCAL_NET -> SELF
fi
ZABBIX_IP="xxx.xxx.xxx.xxx"
if [ "$ZABBIX_IP" ]
then
        iptables -A INPUT -p tcp -s $ZABBIX_IP --dport 10050 -j ACCEPT
fi

```

这一段围绕服务进行设置：公共服务直接放行端口；SSH、FTP、MySQL 等管理类服务仅允许 `LIMITED_LOCAL_NET` 指定网段访问；监控类服务（如 Zabbix 的 10050 端口）仅允许指定 IP 访问。

### 收尾默认策略

最后用一条规则整体收尾。iptables 默认不做设置时是允许对外提供服务的，未在上述规则中放行的端口（如文件共享类服务端口）默认也可以对外访问。因此需要设计一条收尾规则：除已设置的放行规则以外，其他访问的数据包一律丢弃：

```bash
iptables -P INPUT DROP  # 收尾：未匹配任何放行规则的数据包一律丢弃

```

至此完成了一个完整的规则设置：初始化、白名单、黑名单限频、会话放行、SYN Flood/ICMP/HTTP/SSH 频次防护、服务开放、默认丢弃。

## 六、小结

- iptables 与 firewalld 都基于 Netfilter 内核模块；iptables 默认放行、逐条阻断，firewalld 默认拒绝、逐条放行并引入区域概念；nftables 是现代替代方案，iptables 语法仍可继续使用。
- 规则体系的核心是 4 表 5 链加自定义链；自定义链必须被默认链以 `-j 链名` 引用才能生效。
- 企业级安全规则的典型组合：初始化（`-F`/`-X`/`-Z` + `-P ACCEPT`）→ 白名单放行（lo、内部网段、指定主机）→ 黑名单限频丢弃（limit + DROP）→ 会话状态放行（`-m state ESTABLISHED,RELATED`）→ hashlimit 防护 SYN Flood/ICMP/HTTP → recent 防护 SSH 暴力破解 → 服务按网段开放 → `iptables -P INPUT DROP` 收尾。
- 批量规则宜封装为 Shell 脚本统一管理，便于变量化网段与主机列表。
