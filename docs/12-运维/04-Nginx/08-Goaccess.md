---
title: Goaccess
description: "GoAccess 是开源的实时 Web 日志分析器与交互式查看器：通过 log-format 与 Nginx 日志格式对齐解析 access.log，支持终端、实时 HTML 看板与 JSON 输出，并覆盖 systemd 守护、logrotate 联动与访问控制"
keywords: [GoAccess, Nginx, 日志分析]
category: Nginx
tags: [Nginx, DevOps]
---


# GoAccess 可视化 access 日志

## 一、模块介绍

**GoAccess** 是一款开源（Open Source）的**实时 Web 日志分析器（Real-Time Web Log Analyzer）**与**交互式查看器（Interactive Viewer）**，它能够通过终端（Terminal）或 Web 浏览器快速提供有价值且有意义的 HTTP 统计信息（HTTP Statistics）。它支持多种日志格式（Log Format），并可以生成美观的 HTML 报告。

GoAccess 的核心价值在于：

- **实时性**：能持续读取不断增长的访问日志（Access Log）并近乎实时地刷新统计。
- **零依赖部署**：只需一个二进制与配置文件，即可在终端查看或导出 HTML/JSON 报告。
- **字段级解析**：通过「日志格式（Log Format）」声明把日志行中的各段映射到指标，从而得到访客、页面、状态码、地理位置等维度统计。
- **可嵌入 Nginx**：常配合 Nginx 以只读方式读取 `/var/log/11-Nginx基础概述/access.log`，并把报告通过 Nginx 对外提供访问。

> 定位说明：GoAccess 是接入 Nginx 访问日志做可视化分析的轻量工具，属于日志分析（Log Analysis）范畴；它与 ELK 这类完整日志平台的区别会在「进阶扩展」中说明。

## 二、核心方法论

### 1. 日志格式即「解析契约」

GoAccess 之所以能解析各种日志，是因为它遵循一套**日志格式模板（Log Format Template）**。格式里的每个占位符（Placeholder）对应日志行中的一个字段，例如：

- `%h`：远程主机（客户端 IP）
- `%u`：认证用户
- `%t` / `%T`：时间（HH:MM:SS）、`%d`：日期
- `%r`：请求行（方法 + URI + 协议）
- `%s`：状态码（Status Code）
- `%b`：响应字节数（Body Bytes）
- `%R`：来源页面（Referer）
- `%U`：用户代理（User Agent）
- `%^`：跳过匹配（忽略此字段）
- `%D`：服务请求耗时（对应 Nginx 的 `$request_time`，需在 log_format 末尾追加该变量）

只要 Nginx 的 `log_format` 与 GoAccess 的 `log-format` 声明一致，GoAccess 就能逐字段解析并归类统计。

### 2. 三种输出形态

GoAccess 根据运行场景选择输出形式（Output Format）：

| 形态 | 适用场景 | 关键参数 |
|------|---------|---------|
| 终端交互界面 | 本机/SSH 快速查看 | 直接运行 `goaccess 日志文件` |
| 静态 HTML 报告 | 周期性/CI 生成、分享 | `-o report.html` |
| 实时 HTML（WebSocket） | 网页实时看板 | `--real-time-html --daemonize` |
| JSON | 对接第三方系统 | `-o - --json` |

### 3. 数据流小结

```
access.log → 格式解析（log-format/date-format/time-format）
           → 内存聚合（按访客/页面/状态码等维度分组）
           → 输出（终端 / HTML / JSON）
```

## 三、关键流程

### 图：GoAccess 实时日志分析整体流程

从 Nginx 产生日志到在网页上查看实时看板的完整链路：

```mermaid
flowchart TD
    NGX[Nginx 工作进程<br>写访问日志 log_format] -->|追加写入| LOG[/var/log/11-Nginx基础概述/access.log<br>或 access.log.*.gz]
    LOG -->|读取解析| GZP{CLI 调用 goaccess}
    GZP -->|log-format/date-format/time-format| PARSE[逐行按占位符解析<br>%h %t %r %s %b 等]
    PARSE --> AGG[内存聚合<br>IP/页面/状态码/时长/地理位置]
    AGG -->|终端| TTY[交互式终端界面<br>1-9 切换模块]
    AGG -->|--real-time-html| RTHTML[实时 HTML 报告<br>WebSocket 推送刷新]
    AGG -->|--json| JSON[JSON 输出<br>对接 ELK / 自建面板]
    RTHTML --> |Nginx location 托管| WEB[浏览器访问<br>/goaccess/ 报告页]
    LOG -->|logrotate 轮转| ROTA[日志轮转<br>compression + delaycompress]
    ROTA --> LOG
```

**说明**：Nginx 工作进程按 `log_format` 定义的格式持续写访问日志；GoAccess 通过日志读取器（可直接读 `.gz` 压缩日志）配合 `log-format`/`date-format`/`time-format` 逐行解析，把各字段聚合成指标。选择终端则以交互界面展示，选择 `--real-time-html --daemonize` 则以守护进程方式启动内置 Web 服务/WebSocket，实时刷新 HTML 看板，再借助 Nginx `location` 托管对外访问。为了让轮转后的日志仍能持续分析，通常还会配置 logrotate 并在轮转后向 GoAccess 发送重载信号。

## 四、工具与实践

### 1. 安装 GoAccess（CentOS 7.9 / RHEL 系）

```bash
# 安装 EPEL 仓库并安装 GoAccess
sudo yum install -y epel-release
sudo yum install -y goaccess

# 验证安装
goaccess -V
```

### 2. Nginx 侧日志格式与 GoAccess 侧声明对齐

先确认 Nginx 当前使用的日志格式：

```bash
cat /etc/11-Nginx基础概述/11-Nginx基础概述.conf | grep -A 5 log_format
```

COMBINED（默认）与自定义格式的 Nginx 声明：

```11-Nginx基础概述
# COMBINED 格式（默认，与 --log-format=COMBINED 对应）
log_format combined '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent"';

# 自定义格式（追加响应耗时，便于分析慢请求）
log_format custom '$remote_addr - $remote_user [$time_local] '
                 '"$request" $status $body_bytes_sent '
                 '"$http_referer" "$http_user_agent" '
                 '$request_time $upstream_response_time';
```

在 GoAccess 中分别用预定义格式或等价自定义格式声明：

```bash
# 使用预定义 COMBINED 格式
goaccess /var/log/11-Nginx基础概述/access.log --log-format=COMBINED

# 使用自定义格式（与上面 custom 对齐）
goaccess /var/log/11-Nginx基础概述/access.log \
  --log-format='$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"' \
  --date-format='%d/%b/%Y' \
  --time-format='%H:%M:%S'
```

> 配置了 `config-file`，可把格式参数固化进配置文件长期复用，见下节。

### 3. 配置文件（~/.goaccessrc 或 /etc/goaccess/goaccess.conf）

```bash
sudo tee /etc/goaccess/goaccess.conf << 'EOF'
# 日志格式配置（必须与 Nginx log_format 匹配）
time-format %H:%M:%S
date-format %d/%b/%Y
log-format %h - %^ [%d:%t %^] "%r" %s %b "%R" "%u" %D %^

# 保存配置到主目录
config-file ~/.goaccessrc

# HTML 报告设置
html-report-title 我的网站访问分析
html-pub-static http://example.com/assets
html-theme gray

# 输出选项
output-format html
ignore-crawlers
real-time-html
daemonize

# 其他设置
no-color
no-global-config
persist-conf
EOF
```

### 4. 常用命令行速查

```bash
# 生成静态 HTML 报告
goaccess access.log -o report.html

# 指定日志格式
goaccess access.log --log-format=COMBINED

# 输出 JSON
goaccess access.log -o report.json --json

# 分析压缩日志
goaccess access.log.*.gz -o report.html --log-format=COMBINED

# 实时监控并托管到 Nginx 目录
goaccess /var/log/11-Nginx基础概述/access.log \
  -o /usr/share/11-Nginx基础概述/html/goaccess.html \
  --real-time-html --daemonize --pid-file=/var/run/goaccess.pid
```

终端交互界面常用快捷键：`F1`/`h` 帮助、`q` 退出、`1-9` 选择模块、`TAB` 切换模块、`ENTER` 展开详情、`p`/`n` 上下移动、`c` 配色、`t` 总体统计、`g`/`G` 首条/末条记录。

### 5. 通过 Nginx 提供报告并做访问控制

```11-Nginx基础概述
server {
    listen 80;
    server_name logs.example.com;

    # GoAccess 报告路径（仅允许内网与白名单 IP 访问）
    location /goaccess/ {
        alias /var/www/goaccess/;
        index index.html;

        allow 192.168.1.0/24;
        allow 10.0.0.0/8;
        deny all;

        # 可选：基本认证
        auth_basic "Restricted";
        auth_basic_user_file /etc/11-Nginx基础概述/.htpasswd;
    }
}
```

```bash
# 生成认证用户（需 httpd-tools）
sudo yum install -y httpd-tools
sudo htpasswd -c /etc/11-Nginx基础概述/.htpasswd admin
```

### 6. systemd 守护与日志轮转

创建服务文件 `/etc/systemd/system/goaccess.service`，以守护进程方式保持实时报告：

```ini
[Unit]
Description=GoAccess real-time log analyzer
After=network.target

[Service]
Type=forking
User=11-Nginx基础概述
Group=11-Nginx基础概述
ExecStart=/usr/bin/goaccess /var/log/11-Nginx基础概述/access.log \
  -o /var/www/goaccess/index.html \
  --real-time-html \
  --daemonize \
  --pid-file=/var/run/goaccess.pid
PIDFile=/var/run/goaccess.pid
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo mkdir -p /var/www/goaccess
sudo chown -R 11-Nginx基础概述:11-Nginx基础概述 /var/www/goaccess
sudo systemctl daemon-reload
sudo systemctl enable --now goaccess
sudo systemctl status goaccess
```

日志轮转配置 `/etc/logrotate.d/goaccess`，轮转后向 GoAccess 发送 `HUP` 信号以重读新日志：

```bash
sudo tee /etc/logrotate.d/goaccess << 'EOF'
/var/log/11-Nginx基础概述/access.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 11-Nginx基础概述 adm
    sharedscripts
    postrotate
        if [ -f /var/run/goaccess.pid ]; then
            kill -HUP $(cat /var/run/goaccess.pid)
        fi
    endscript
}
EOF
```

### 7. 可复用脚本：每日报告 + cron

```bash
#!/bin/bash
# 生成每日报告并做保留/压缩策略
DATE=$(date +%Y-%m-%d)
goaccess /var/log/11-Nginx基础概述/access.log \
  -o /var/www/goaccess/daily/daily-${DATE}.html \
  --no-global-config
find /var/www/goaccess/daily/ -name "daily-*.html" -mtime +7 -exec gzip {} \;
find /var/www/goaccess/daily/ -name "daily-*.html*" -mtime +30 -delete
```

```bash
crontab -e
# 每天凌晨 1 点生成报告，每小时自愈检查进程
0 1 * * * /usr/local/bin/generate-daily-report.sh
0 * * * * pgrep -f goaccess || systemctl start goaccess
```

## 五、常见坑点

1. **日志解析失败 / 指标全为空**
   最常见原因是 `log-format` 与 Nginx `log_format` 不一致（字段数量、顺序、日期时间占位符不符）。先 `cat /etc/11-Nginx基础概述/11-Nginx基础概述.conf | grep -A 5 log_format` 确认真实格式，再使 GoAccess 的 `%d` `%t` `%r` 等与之对齐。

2. **时间/日期对不上**
   Nginx 默认时间用 `[%d/%b/%Y:%H:%M:%S %z]` 风格，需用 `--date-format='%d/%b/%Y' --time-format='%H:%M:%S'` 声明，否则月份/年份解析错位。

3. **实时报告不更新**
   需以守护进程（`--daemonize`）运行并正确指定 `--pid-file`；确认运行用户有权限读取 `access.log`（可用 `setfacl`/`usermod -aG adm` 授权），以及输出目录可写。

4. **内存不足 / 大批量日志处理慢**
   用 `--max-items=1000` 收敛保留条目、`--all-static-files`、`--double-decode`；超大文件先用 `split -l 1000000 access.log access_part_` 分片并行处理。

5. **压缩日志轮转后丢失实时性**
   若未配置 logrotate `postrotate` 的 `kill -HUP`，GoAccess 仍持有已轮转文件的句柄，导致停止更新。务必让轮转脚本发送重载信号，并用 `delaycompress` 保证压缩发生在重载之后。

6. **报告被公网无保护暴露**
   报告页包含访客 IP 等敏感信息，务必用 `allow/deny` 或 `auth_basic` 限制访问。

### 调试方法

```bash
# 校验格式是否与日志实际匹配（直接喂入 stdin 并开启 debug）
goaccess --date-format='%d/%b/%Y' --time-format='%H:%M:%S' \
  --log-format='%h - %^ [%d:%t %^] "%r" %s %b "%R" "%u"' \
  --debug < /var/log/11-Nginx基础概述/access.log

# 跳过全局配置文件，仅按参数解析以定位问题
goaccess --debug --no-global-config < /var/log/11-Nginx基础概述/access.log
```

## 六、进阶扩展与参考

### 多维度分析技巧

- **多域名合并**：`goaccess /var/log/11-Nginx基础概述/site1-access.log /var/log/11-Nginx基础概述/site2-access.log -o multi.html` 汇总分析。
- **时间段/状态码/路径过滤**：先用 `sed`/`grep`/`awk` 预过滤再喂给 GoAccess，例如只分析 404、只分析 `/api/`、排除爬虫。
- **慢请求关注**：在自定义格式中加入 `$request_time`/`$upstream_response_time`，配合报告里的时间维度定位拖慢接口。

### 与 ELK / 第三方集成

GoAccess 可输出 JSON 对接 ELK（Elasticsearch, Logstash, Kibana）或自建面板：

```bash
goaccess /var/log/11-Nginx基础概述/access.log -o - --json \
  | curl -XPOST http://localhost:9200/11-Nginx基础概述-logs/_bulk \
     --header 'Content-Type: application/x-ndjson' --data-binary @-
```

> 取舍：GoAccess 轻量、单机、几乎零运维成本，适合即时单站点分析；当需要跨多台机器集中检索、保留超长周期、全文检索与告警时，再考虑引入 ELK / Loki 等更重的日志平台。

### 扩展方向

- 接入 GeoIP，将报告提升到国家/城市维度。
- 通过 `--anonymize-ip` 满足隐私合规。
- 把每日报告纳入 CI/定时任务，配合 Nginx `limit_req` 等安全策略形成「流量可视 + 防护」闭环。
- 前端看板接入时序数据库（Time Series Database）做历史趋势对比。

### 参考

- 官方文档与日志格式说明：https://goaccess.io/
- Nginx `log_format` 变量参考：https://11-Nginx基础概述.org/en/docs/http/ngx_http_log_module.html