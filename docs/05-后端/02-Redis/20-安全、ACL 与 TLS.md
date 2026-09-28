---
title: 安全、ACL 与 TLS
description: Redis 安全体系：ACL 用户权限管理、requirepass 认证、TLS 加密传输、危险命令治理与生产加固清单
keywords: [Redis, 安全, ACL, TLS, 认证, 权限, 加固]
category: Redis
tags: [Redis, 安全, ACL, TLS, 运维]
---

# 安全、ACL 与 TLS

## 0. 引言

Redis 默认**无认证、无加密**，且进程以 root 运行会直接写文件——历史上大量"未授权访问被挖矿"事件都源于此。安全不是可选配置，而是上线前置条件。本章按"认证 → 授权 → 加密 → 治理"四层梳理 Redis 安全体系（以 6.x/7.x 的 ACL 与 TLS 为主）。

## 1. 第一层：认证

### 1.1 传统方式：requirepass（5.x 及之前）

```text
# redis.conf
requirepass "very-strong-password"
```

```bash
> auth "very-strong-password"
OK
```

- 全局单密码，认证后获得全部权限；
- 明文密码写在配置中，且 AUTH 本身不加密（可被嗅探）；
- 仅作为"基础门禁"，6.0 后推荐 ACL 取代。

### 1.2 ACL：细粒度用户体系（Redis 6.0+）

```text
# redis.conf 中定义用户
user default on nopass ~* +@all          # 默认用户（示例：谨慎）
user app_user on >app-password ~cache:* +get +set +@string -flushall
user readonly on >readonly-password ~* +@read
```

```bash
> acl setuser alice on >alice-pass ~user:* +get +set +@string -del
OK
> acl getuser alice                        # 查看用户规则
1) "flags"
2) 1) "on"
3) "passwords"
4) 1) "<sha256 哈希>"                      # 密码以哈希存储，不回显明文
5) "commands"
6) "1) -del +@string +get +set"
7) "keys"
8) "~user:*"
```

**ACL 语法速查**：

| 要素 | 示例 | 含义 |
|------|------|------|
| 用户状态 | `on` / `off` | 启用/禁用 |
| 密码 | `>password` / `<password` / `nopass` | 添加/删除密码/免密 |
| 命令权限 | `+get` / `-del` / `+@string` / `+@all` | 允许/禁止/按类别 |
| key 模式 | `~pattern` / `~*` / `%R~pattern` | 可访问的 key（支持通配） |
| channel 模式 | `&channel` / `&*` | Pub/Sub 频道权限 |
| 选择器 | `(+SET ~key2)` | 附加命令-键选择器（7.0+） |

```bash
> acl whoami                    # 当前用户
"alice"
> acl list                      # 列出所有用户
> auth alice alice-pass         # 用户名+密码认证
OK
```

**ACL 带来的能力**：按业务分用户（读写分离、风险命令隔离）、按 key 模式隔离（防误删他域数据）、审计（`ACL LOG`）。

## 2. 第二层：授权与命令治理

### 2.1 危险命令治理

即使有认证，**危险命令**仍可能在"被攻破的应用侧"被滥用。两招：

**禁用/重命名**（`rename-command`，7.x 仍支持）：

```text
# redis.conf
rename-command KEYS ""
rename-command FLUSHALL ""
rename-command CONFIG "config_admin_94f2"
```

**ACL 限定**（推荐，更精细）：

```text
user ops on >ops-pass ~* +@all -keys -flushall -flushdb -config -shutdown
```

### 2.2 高危命令清单

| 命令 | 风险 | 治理建议 |
|------|------|---------|
| `KEYS` | 阻塞全库 | 禁用，用 SCAN |
| `FLUSHALL`/`FLUSHDB` | 清空数据 | 禁用或限权 |
| `CONFIG` | 改配置/提权 | 仅管理员用户 |
| `EVAL`/`FUNCTION` | 任意代码 | 限权 + 审计 |
| `DEBUG` | 调试绕过 | 禁用 |
| `SHUTDOWN` | 宕机 | 仅运维 |
| `MONITOR` | 泄露流量 | 限权 |

## 3. 第三层：TLS 加密

### 3.1 为什么需要

- Redis 协议默认**明文**：密码、数据在网络上可被嗅探；
- 跨机房、跨 VPC 场景必须加密（同机房内网也不应裸奔）。

### 3.2 配置 TLS（Redis 6.0+）

```text
# redis.conf
port 0                    # 关闭明文端口
tls-port 6379             # 开启 TLS 端口
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
tls-auth-clients yes      # 双向认证（mTLS）
```

```bash
# redis-cli 通过 TLS 连接
redis-cli -h redis.example.com -p 6379 --tls \
    --cacert ca.crt --cert client.crt --key client.key
```

### 3.3 客户端连接（Java）

```java
// Lettuce TLS 示例：服务端校验 + 客户端证书（mTLS）
SslOptions sslOptions = SslOptions.builder()
    .truststore(new File("truststore.jks"))               // 校验服务端证书
    .keystore(new File("client.p12"), "changeit".toCharArray()) // 客户端证书
    .build();

RedisURI uri = RedisURI.builder()
    .withHost("redis.example.com").withPort(6379)
    .withSsl(true)
    .withVerifyPeer(VerifyPeer.ON)
    .withPassword("alice-pass".toCharArray())
    .build();

RedisClient client = RedisClient.create(uri);
client.setOptions(ClientOptions.builder().sslOptions(sslOptions).build());
```

### 3.4 其他加固

- **绑定地址**：`bind 127.0.0.1` 或内网 IP，绝不 `0.0.0.0` 裸奔公网；
- **protected-mode**：无认证时仅允许本机访问（默认 yes，勿关）；
- **最小权限运行**：禁止 root 运行 Redis（写文件漏洞提权路径）；
- **禁用危险模块加载**：`enable-module-command no`（7.x，防远程加载模块）。

## 4. 生产加固清单（Checklist）

```text
✅ bind 内网地址（非 0.0.0.0）
✅ protected-mode yes
✅ 非 root 用户运行（如 redis 用户）
✅ requirepass 或 ACL（default 用户设强密码）
✅ ACL 按业务分用户：最小权限原则
✅ rename-command 或 ACL 禁用 KEYS/FLUSHALL/CONFIG 等
✅ 跨网络 TLS（tls-port + 双向认证）
✅ enable-module-command no
✅ 防火墙/安全组限制 6379/16379 端口来源
✅ 定期 acl log 审计异常登录
```

## 5. 常见安全事故复盘要点

| 事故类型 | 根因 | 预防 |
|---------|------|------|
| 未授权访问挖矿 | 无认证 + 公网暴露 | 认证 + 绑定 + 防火墙 |
| 主从复制被劫持 | master 裸奔，攻击者 REPLICAOF | 认证（`masterauth`）+ 内网 |
| 配置被改 | CONFIG 未限权 | rename/ACL 限权 |
| 密码泄露 | 明文传输 | TLS + 强密码轮换 |

## 6. 小结

- **认证**：6.0+ 用 ACL（用户/密码/命令/key 粒度），替代全局 requirepass；
- **授权**：危险命令禁用或限权，最小权限是黄金法则；
- **加密**：跨网络必须 TLS，双向认证更稳；
- **治理**：绑定内网、非 root 运行、protected-mode、模块加载关闭——四件套缺一不可。

下一章讲解 Java 客户端：Jedis 与 Lettuce 的选型与最佳实践。