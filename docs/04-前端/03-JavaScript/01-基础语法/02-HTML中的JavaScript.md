---
title: "HTML 中的 JavaScript"
description: "介绍 <script> 元素的 8 个属性（async/defer/crossorigin/integrity/type 等）、标签位置对页面渲染的影响、动态加载脚本、XHTML 兼容写法与 noscript 元素。"
category: JavaScript

---

# HTML 中的 JavaScript

## script 元素

将 JavaScript 插入 HTML 的主要方法是使用 `<script>` 元素。这个元素是由网景公司创造出来，并最早在 Netscape Navigator 2 中实现的。后来，这个元素被正式加入到 HTML 规范。script 元素有下列 8 个属性

- async 可选。表示应该立即下载脚本，但不应妨碍页面中的其他操作，比如下载其他资源或等待加载其他脚本。只对外部脚本文件有效
- charset  可选。表示通过 src 属性指定的代码的字符集。由于大多数浏览器会忽略它的值，因此这个属性很少有人用
- crossorigin  可选。配置相关请求的 CORS（跨源资源共享）设置。默认不使用CORS。`crossorigin= "anonymous"`  配置文件请求不必设置凭据标志。crossorigin="use-credentials"设置凭据标志，意味着出站请求会包含凭据
- defer  可选。表示脚本可以延迟到文档完全被解析和显示之后再执行。只对外部脚本文件有效。IE7 及更早版本对嵌入脚本也支持这个属性
- integrity  可选。允许比对接收到的资源和指定的加密签名以验证子资源完整性（SRI，Subresource Integrity）。如果接收到的资源的签名与这个属性指定的签名不匹配，则页面会报错，脚本不会执行。这个属性可以用于确保内容分发网络（CDN，Content Delivery Network）不会提供恶意内容
- language：已废弃。原来用于表示编写代码使用的脚本语言（如 JavaScript、JavaScript1.2或 VBScript）。大多数浏览器会忽略这个属性，因此也没有必要再用了
- src：可选。表示包含要执行代码的外部文件
- type：可选。可以看成是 language 的替代属性；表示编写代码使用的脚本语言的内容类型（也称为 MIME 类型）。目前 type 属性的值依旧还是 text/javascript。不过，这个属性并不是必需的，如果没有指定这个属性，则其默认值仍为 text/javascript。如果这个值是 module，则代码会被当成 ES6 模块，而且只有这时候代码中才能出现 import 和 export 关键字

### 使用方式

使用 script 元素的方式有两种：直接在页面中嵌入 JavaScript 代码和包含外部 JavaScript 文件

```html
<script type="text/javascript"> 
 	function sayHi(){ 
 		alert("Hi!"); 
 	} 
</script>
```

在使用 `<script>` 嵌入 JavaScript 代码时，记住不要在代码中的任何地方出现 `</script>` 字符串。而通过转义字符 `\`（反斜杠）可以解决这个问题

```html
<script type="text/javascript"> 
 	function sayScript(){ 
 		alert("<\/script>");
 } 
</script>
```

如果要通过`<script>`元素来包含外部 JavaScript 文件，那么 src 属性就是必需的。这个属性的值是一个指向外部 JavaScript 文件的链接，例如：

```html
<script type="text/javascript" src="example.js"></script>
```

按照惯例，外部 JavaScript 文件带有 `.js` 扩展名。但这个扩展名不是必需的，因为浏览器不会检查包含 JavaScript 的文件的扩展名。这样一来，使用 JSP、PHP 或其他服务器端语言动态生成 JavaScript 代码也就成为了可能。但是，服务器通常还是需要看扩展名决定为响应应用哪种 MIME 类型。如果不使用 `.js` 扩展名，请确保服务器能返回正确的 MIME 类型

无论如何包含代码，只要不存在 defer 和 async 属性，浏览器都会按照 `<script>` 元素在页面中出现的先后顺序对它们依次进行解析

### 标签的位置

按照传统的做法，所有 `<script>` 元素都应该放在页面的 `<head>` 元素中

```html
<!DOCTYPE html> 
<html> 
 <head> 
 		<title>Example HTML Page</title> 
 		<script type="text/javascript" src="example1.js"></script> 
 		<script type="text/javascript" src="example2.js"></script> 
 </head> 
  
 <body> 
 		<!-- 这里放内容 --> 
 </body> 
</html>
```

这种做法的目的就是把所有外部文件（包括 CSS 文件和 JavaScript 文件）的引用都放在相同的地方

可是，在文档的 `<head>` 元素中包含所有 JavaScript 文件，意味着必须等到全部 JavaScript 代码都被下载、解析和执行完成以后，才能开始呈现页面的内容（浏览器在遇到 `<body>` 标签时才开始呈现内容）

对于那些需要很多 JavaScript 代码的页面来说，这无疑会导致浏览器在呈现页面时出现明显的延迟，而延迟期间的浏览器窗口中将是一片空白。为了避免这个问题，现代 Web 应用程序一般都把全部 JavaScript 引用放在 `<body>` 元素中页面内容的后面

这样，在解析包含的 JavaScript 代码之前，页面的内容将完全呈现在浏览器中。而用户也会因为浏览器窗口显示空白页面的时间缩短而感到打开页面的速度加快了

### 推迟执行脚本

HTML 4.01 为 `<script>` 标签定义了 defer 属性。这个属性的用途是表明脚本在执行时不会影响页面的构造。也就是说，脚本会被延迟到整个页面都解析完毕后再运行。因此，在 `<script>` 元素中设置 defer 属性，相当于告诉浏览器立即下载，但延迟执行

```html
<!DOCTYPE html> 
<html> 
 <head> 
 		<title>Example HTML Page</title> 
 		<script type="text/javascript" defer="defer" src="example1.js"></script> 
 		<script type="text/javascript" defer="defer" src="example2.js"></script> 
 </head> 
  
 <body> 
 	<!-- 这里放内容 --> 
 </body> 

</html>
```

虽然我们把 `<script>` 元素放在了文档的 `<head>` 元素中，但其中包含的脚本将延迟到浏览器遇到 `</html>` 标签后再执行。

HTML5 规范要求脚本按照它们出现的先后顺序执行，因此第一个延迟脚本会先于第二个延迟脚本执行，而这两个脚本会先于 DOMContentLoaded 事件执行。在现实当中，延迟脚本并不一定会按照顺序执行，也不一定会在 DOMContentLoaded 事件触发前执行，因此最好只包含一个延迟脚本

### 异步执行脚本

HTML5 为 `<script>` 元素定义了 async 属性。这个属性与 defer 属性类似，都用于改变处理脚本的行为。同样与 defer 类似，async 只适用于外部脚本文件，并告诉浏览器立即下载文件。但与 defer 不同的是，标记为 async 的脚本并不保证按照指定它们的先后顺序执行

```html
<!DOCTYPE html> 
<html> 
 <head> 
 		<title>Example HTML Page</title> 
		<script type="text/javascript" async src="example1.js"></script> 
		<script type="text/javascript" async src="example2.js"></script> 
 </head> 
 <body> 
 <!-- 这里放内容 --> 
 </body> 
</html>
```

在以上代码中，第二个脚本文件可能会在第一个脚本文件之前执行。因此，确保两者之间互不依赖非常重要。

指定 async 属性的目的是不让页面等待两个脚本下载和执行，从而异步加载页面其他内容。为此，建议异步脚本不要在加载期间修改 DOM。

异步脚本一定会在页面的 load 事件前执行，但可能会在 DOMContentLoaded 事件触发之前或之后执行

### 动态加载脚本

除了 `<script>` 标签，还有其他方式可以加载脚本。因为 JavaScript 可以使用 DOM API，所以通过向 DOM 中动态添加 script 元素同样可以加载指定的脚本。只要创建一个 script 元素并将其添加到 DOM 即可

```js
let script = document.createElement('script'); 
script.src = 'gibberish.js'; 
document.head.appendChild(script); 
```

当然，在把 `<script>` 元素添加到 DOM 且执行到这段代码之前不会发送请求。默认情况下，以这种方式创建的 `<script>` 元素是以异步方式加载的，相当于添加了 async 属性。不过这样做可能会有问题，因为所有浏览器都支持 createElement()方法，但不是所有浏览器都支持 async 属性。因此，如果要统一动态脚本的加载行为，可以明确将其设置为同步加载：

```js
let script = document.createElement('script'); 
script.src = 'gibberish.js'; 
script.async = false; 
document.head.appendChild(script); 
```

以这种方式获取的资源对浏览器预加载器是不可见的。严重影响它们在资源获取队列中的优先级。根据应用程序的工作方式以及怎么使用，这种方式可能会严重影响性能。要想让预加载器知道这些动态请求文件的存在，可以在文档头部显式声明它们：

```html
<link rel="preload" href="gibberish.js"> 
```

### XHTML 中的变化

可扩展超文本标记语言（XHTML，Extensible HyperText Markup Language）是将 HTML 作为 XML 的应用重新包装的结果。与 HTML 不同，在 XHTML 中使用 JavaScript 必须指定 type 属性且值为 text/javascript，HTML 中则可以没有这个属性。XHTML 虽然已经退出历史舞台，但实践中偶尔可能也会遇到遗留代码

在 XHTML 中编写代码的规则比 HTML 中严格，这会影响使用 `<script>` 元素嵌入 JavaScript 代码。

下面的代码块虽然在 HTML 中有效，但在 XHTML 中是无效的。

```html
<script type="text/javascript"> 
  function compare(a, b) { 
    if (a < b) { 
      console.log("A is less than B"); 
    } else if (a > b) { 
      console.log("A is greater than B"); 
    } else { 
      console.log("A is equal to B"); 
    } 
  } 
</script>
```

 HTML 中，解析 `<script>` 元素会应用特殊规则。XHTML 中则没有这些规则。这意味着 a < b 语句中的小于号（<）会被解释成一个标签的开始，并且由于作为标签开始的小于号后面不能有空格，这会导致语法错误。

避免 XHTML 中这种语法错误的方法有两种。第一种是把所有小于号（<）都替换成对应的 HTML实体形式（`&lt;`）。结果代码就是这样的：

```html
<script type="text/javascript"> 
  function compare(a, b) { 
    if (a &lt; b) { 
      console.log("A is less than B"); 
    } else if (a > b) { 
      console.log("A is greater than B"); 
    } else { 
      console.log("A is equal to B"); 
    } 
  } 
</script>
```

这样代码就可以在 XHTML 页面中运行了。不过，缺点是会影响阅读。好在还有另一种方法。

第二种方法是把所有代码都包含到一个 CDATA 块中。在 XHTML（及 XML）中，CDATA 块表示文档中可以包含任意文本的区块，其内容不作为标签来解析，因此可以在其中包含任意字符，包括小于号，并且不会引发语法错误。使用 CDATA 的格式如下：

```html
<script type="text/javascript"><![CDATA[ 
    function compare(a, b) { 
      if (a < b) { 
        console.log("A is less than B"); 
      } else if (a > b) { 
        console.log("A is greater than B"); 
      } else { 
        console.log("A is equal to B"); 
      } 
    } 
  ]]></script>
```

在兼容 XHTML 的浏览器中，这样能解决问题。但在不支持 CDATA 块的非 XHTML 兼容浏览器中则不行。为此，CDATA 标记必须使用 JavaScript 注释来抵消：

```html
<script type="text/javascript"> 
  //<![CDATA[
  function compare(a, b) { 
    if (a < b) { 
      console.log("A is less than B"); 
    } else if (a > b) { 
      console.log("A is greater than B"); 
    } else { 
      console.log("A is equal to B"); 
    } 
  } 
  //]]>
</script> 
```

这种格式适用于所有现代浏览器。虽然有点黑科技的味道，但它可以通过 XHTML 验证，而且对 XHTML 之前的浏览器也能优雅地降级。

### 行内代码与外部文件

在 HTML 中嵌入 JavaScript 代码虽然没有问题，但一般认为最好的做法还是尽可能使用外部文件来包含 JavaScript 代码。不过，并不存在必须使用外部文件的硬性规定，但支持使用外部文件的人多会强调如下优点

- 可维护性：遍及不同 HTML 页面的 JavaScript 会造成维护问题。但把所有 JavaScript 文件都放在一个文件夹中，维护起来就轻松多了。而且开发人员因此也能够在不触及 HTML 标记的情况下，集中精力编辑 JavaScript 代码
- 可缓存：浏览器能够根据具体的设置缓存链接的所有外部 JavaScript 文件。也就是说，如果有两个页面都使用同一个文件，那么这个文件只需下载一次。因此，最终结果就是能够加快页面加载的速度

在配置浏览器请求外部文件时，要重点考虑的一点是它们会占用多少带宽。在 SPDY/HTTP2 中，预请求的消耗已显著降低，以轻量、独立 JavaScript 组件形式向客户端送达脚本更具优势。

比如，第一个页面包含如下脚本：

```html
<script src="mainA.js"></script> 
<script src="component1.js"></script> 
<script src="component2.js"></script> 
<script src="component3.js"></script> 
...
```

后续页面可能包含如下脚本：

```html
<script src="mainB.js"></script> 
<script src="component3.js"></script> 
<script src="component4.js"></script> 
<script src="component5.js"></script> 
...
```

在初次请求时，如果浏览器支持 SPDY/HTTP2，就可以从同一个地方取得一批文件，并将它们逐个放到浏览器缓存中。从浏览器角度看，通过 SPDY/HTTP2 获取所有这些独立的资源与获取一个大 JavaScript 文件的延迟差不多

在第二个页面请求时，由于你已经把应用程序切割成了轻量可缓存的文件，第二个页面也依赖的某些组件此时已经存在于浏览器缓存中了

当然，这里假设浏览器支持 SPDY/HTTP2，只有比较新的浏览器才满足。如果你还想支持那些比较老的浏览器，可能还是用一个大文件更合适

## 文档模式

IE5.5 引入了文档模式的概念，而这个概念是通过使用文档类型（doctype）切换实现的。最初的两种文档模式是：混杂模式（quirks mode）和标准模式（standards mode）。

混杂模式会让 IE 的行为与（包含非标准特性的）IE5 相同，而标准模式则让 IE 的行为更接近标准行为。虽然这两种模式主要影响 CSS内容的呈现，但在某些情况下也会影响到 JavaScript 的解释执行。本书将在必要时再讨论这些因文档模式而影响 JavaScript 执行的情况

在 IE 引入文档模式的概念后，其他浏览器也纷纷效仿。在此之后，IE 又提出一种所谓的准标准模式（almost standards mode）。这种模式下的浏览器特性有很多都是符合标准的，但也不尽然。不标准的地方主要体现在处理图片间隙的时候（在表格中使用图片时问题最明显）。

如果在文档开始处没有发现文档类型声明，则所有浏览器都会默认开启混杂模式。但采用混杂模式不是什么值得推荐的做法，因为不同浏览器在这种模式下的行为差异非常大，如果不使用某些 hack 技术，跨浏览器的行为根本就没有一致性可言。

对于标准模式，可以通过使用下面任何一种文档类型来开启：

```html
<!-- HTML 4.01 严格型 --> 
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd"> 

<!-- XHTML 1.0 严格型 --> 
<!DOCTYPE html PUBLIC 
"-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"> 

<!-- HTML 5 --> 
<!DOCTYPE html>
```

而对于准标准模式，则可以通过使用过渡型（transitional）或框架集型（frameset）文档类型来触发，如下所示：

```html
<!-- HTML 4.01 过渡型 --> 

<!DOCTYPE HTML PUBLIC 
"-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd"> 

<!-- HTML 4.01 框架集型 --> 

<!DOCTYPE HTML PUBLIC 
"-//W3C//DTD HTML 4.01 Frameset//EN" "http://www.w3.org/TR/html4/frameset.dtd"> 

<!-- XHTML 1.0 过渡型 --> 

<!DOCTYPE html PUBLIC 
"-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"> 

<!-- XHTML 1.0 框架集型 --> 

<!DOCTYPE html PUBLIC 

"-//W3C//DTD XHTML 1.0 Frameset//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd">
```

准标准模式与标准模式非常接近，它们的差异几乎可以忽略不计。因此，当有人提到“标准模式”时，有可能是指这两种模式中的任何一种。而且，检测文档模式（本书后面将会讨论）时也不会发现什么不同。本书后面提到标准模式时，指的是除混杂模式之外的其他模式

## noscript 元素

早期浏览器都面临一个特殊的问题，即当浏览器不支持 JavaScript 时如何让页面平稳地退化。对这个问题的最终解决方案就是创造一个`<noscript>` 元素，用以在不支持 JavaScript 的浏览器中显示替代的内容。这个元素可以包含能够出现在文档 `<body>` 中的任何 HTML 元素——`<script> `元素除外。包含在 `<noscript>` 元素中的内容只有在下列情况下才会显示出来：

- 浏览器不支持脚本；
- 浏览器支持脚本，但脚本被禁用

符合上述任何一个条件，浏览器都会显示 `<noscript>` 中的内容。而在除此之外的其他情况下，浏览器不会呈现 `<noscript>` 中的内容

请看下面这个简单的例子：

```html
<html> 
 <head> 
 <title>Example HTML Page</title> 
 		<script type="text/javascript" defer="defer" src="example1.js"></script> 
 		<script type="text/javascript" defer="defer" src="example2.js"></script> 
 </head> 
 <body> 
		<noscript>
 			<p>本页面需要浏览器支持（启用）JavaScript。</p>
 		</noscript> 
 </body> 
</html>
```

这个页面会在脚本无效的情况下向用户显示一条消息。而在启用了脚本的浏览器中，用户永远也不会看到它——尽管它是页面的一部分