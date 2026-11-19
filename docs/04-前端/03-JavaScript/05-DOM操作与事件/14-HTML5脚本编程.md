---
title: "HTML5脚本编程"
description: "介绍 HTML5 脚本编程相关 API：跨文档消息传递 postMessage 与 message 事件、原生拖放（拖放事件、dataTransfer、dropEffect/effectAllowed、draggable）、audio/video 媒体元素属性与事件、canPlayType 检测与 Audio 类型。"
keywords: [postMessage, dataTransfer, audio, video]
category: JavaScript
tags: [JavaScript, HTML5, DOM]
---

# HTML5脚本编程

## 概念说明

HTML5 规范定义了很多新 HTML 标记,同时用显著篇幅定义了很多 JavaScript API 来配合这些标记的变化。这些 API 的用意是简化此前实现起来困难重重的任务,最终简化创建动态 Web 界面的工作。

## 核心要点

- 跨文档消息传递(XDM)的核心是 `postMessage()` 方法:第二个参数指定接收方来源域,是保障安全通信的关键;传 `"*"` 表示任意域,不推荐。
- 接收 XDM 消息触发 window 的 `message` 事件(异步触发);事件对象包含 `data`(消息数据)、`origin`(发送方域)、`source`(发送窗口的代理)三方面信息,接收后必须校验 `origin`。
- `postMessage()` 第一个参数最早规定"永远是字符串",虽然后来允许任意数据结构,但并非所有浏览器都实现了这一变化;传结构化数据应先用 `JSON.stringify()` 序列化,接收端用 `JSON.parse()` 还原。
- 拖动元素依次触发 `dragstart` → `drag` → `dragend`(目标均为被拖动元素);拖到放置目标上依次触发 `dragenter` → `dragover` → `dragleave` 或 `drop`(目标均为放置目标元素)。
- 所有元素默认不允许放置;重写 `dragenter` 和 `dragover` 事件的默认行为可将任何元素变成有效放置目标;Firefox 中还需取消 `drop` 事件的默认行为(默认会打开被放置的 URL)。
- `dataTransfer` 对象用于拖放数据交换,只能在拖放事件处理程序中访问;`setData()`/`getData()` 的类型为 `"text"` 或 `"URL"`(HTML5 扩展为任意 MIME 类型,并映射 `"text"`→`"text/plain"`、`"URL"`→`"text/uri-list"`);数据只能在 `drop` 事件处理程序中读取。
- `dropEffect` 设置放置行为(none/move/copy/link),须在 `ondragenter` 中针对放置目标设置;`effectAllowed` 表示允许拖动元素的哪种 dropEffect,须在 `ondragstart` 中设置。浏览器只负责改变光标样式,移动/复制/打开链接等动作需开发者自行实现。
- 图像、链接默认可拖动(文本需选中);HTML5 为所有元素规定 `draggable` 属性控制可拖动性。
- `<audio>` 和 `<video>` 让开发人员不依赖插件即可嵌入跨浏览器音频/视频;并非所有浏览器支持所有编解码器,应指定多个 `<source>` 并用 `canPlayType()` 检测支持情况;`Audio` 构造函数可在不插入文档的情况下播放音频。

## 跨文档消息传递

跨文档消息传送(cross-document messaging),有时候简称为 XDM,指在来自不同域的页面间传递消息,例如 www.wrox.com 域中的页面与位于一个内嵌框架中的 p2p.wrox.com 域中的页面通信。

在 XDM 机制出现之前,要稳妥地实现这种通信需要花很多工夫。XDM 把这种机制规范化,使跨文档通信既稳妥又简单。

XDM 的核心是 postMessage() 方法。在 HTML5 规范中,除 XDM 部分之外的其他部分也会提到这个方法名,但都是为了同一个目的:向另一个地方传递数据。对 XDM 而言,"另一个地方"指包含在当前页面中的 `<iframe>` 元素,或者由当前页面弹出的窗口。

postMessage() 方法接收两个参数:一条消息和一个表示消息接收方来自哪个域的字符串。第二个参数对保障安全通信非常重要,可以防止浏览器把消息发送到不安全的地方:

```javascript
//注意：所有支持 XDM 的浏览器也支持 iframe 的 contentWindow 属性
var iframeWindow = document.getElementById("myframe").contentWindow; 
iframeWindow.postMessage("A secret", "http://www.wrox.com");
```

最后一行代码尝试向内嵌框架中发送一条消息,并指定框架中的文档必须来源于"http://www.wrox.com"域。如果来源匹配,消息会传递到内嵌框架中;否则,postMessage() 什么也不做。

这一限制可以避免窗口中的位置在不知情的情况下发生改变。如果传给 postMessage() 的第二个参数是 `"*"`,则表示可以把消息发送给来自任何域的文档,但不推荐这样做。

接收到 XDM 消息时,会触发 window 对象的 message 事件。这个事件以异步形式触发,因此从发送消息到接收消息(触发接收窗口的 message 事件)可能要经过一段时间的延迟。触发 message 事件后,传递给 onmessage 处理程序的事件对象包含以下三方面的重要信息:

- data:作为 postMessage() 第一个参数传入的字符串数据。
- origin:发送消息的文档所在的域,例如"http://www.wrox.com"。
- source:发送消息的文档的 window 对象的代理。这个代理对象主要用于在发送上一条消息的窗口中调用 postMessage() 方法。如果发送消息的窗口来自同一个域,那这个对象就是 window。

接收到消息后验证发送窗口的来源至关重要。就像给 postMessage() 方法指定第二个参数以确保浏览器不会把消息发送给未知页面一样,在 onmessage 处理程序中检测消息来源可以确保传入的消息来自已知的页面。基本的检测模式如下:

```javascript
EventUtil.addHandler(window, "message", function(event){ 
 	//确保发送消息的域是已知的域
 	if (event.origin == "http://www.wrox.com"){ 
 		//处理接收到的数据
 		processMessage(event.data); 
 		//可选：向来源窗口发送回执
 		event.source.postMessage("Received!", "http://p2p.wrox.com"); 
 } 
});
```

注意:event.source 大多数情况下只是 window 对象的代理,并非实际的 window 对象,不能通过这个代理对象访问 window 对象的其他任何信息。只通过这个代理调用 postMessage() 即可,这个方法永远存在、永远可以调用。

XDM 还有一些怪异之处。postMessage() 的第一个参数最早是作为"永远都是字符串"来实现的,后来改为允许传入任何数据结构,但并非所有浏览器都实现了这一变化。为保险起见,使用 postMessage() 时最好只传字符串;要传结构化数据,最佳选择是先调用 JSON.stringify() 序列化,通过 postMessage() 传入得到的字符串,再在 onmessage 事件处理程序中调用 JSON.parse() 还原。

在通过内嵌框架加载其他域的内容时,XDM 非常方便,因此在混搭(mashup)和社交网络应用中极为常用。有了 XDM,包含 `<iframe>` 的页面可以确保自身不受恶意内容的侵扰,因为它只通过 XDM 与嵌入的框架通信。XDM 也可以在来自相同域的页面间使用。

XDM 已经作为一个规范独立出来,现在它的名字叫 Web Messaging,已并入 HTML 标准(参见 WHATWG HTML 规范的 Web messaging 一节)。

## 原生拖放

拖放最有趣的能力是能够在框架间、窗口间,甚至在应用间拖放网页元素,浏览器对拖放的支持为实现这些功能提供了便利。

### 拖放事件

通过拖放事件,可以控制拖放相关的各个方面。关键在于确定哪里发生了拖放事件:有些事件在被拖动的元素上触发,有些事件在放置目标上触发。

拖动某元素时,将依次触发下列事件:

- dragstart
- drag
- dragend

按下鼠标键并开始移动鼠标时,会在被拖放的元素上触发 dragstart 事件。此时光标变成"不能放"符号(圆环中有一条反斜线),表示不能把元素放到自己上面。拖动开始时,可以通过 ondragstart 事件处理程序来运行 JavaScript 代码。

触发 dragstart 事件后,随即会触发 drag 事件,而且在元素被拖动期间会持续触发该事件。这个事件与 mousemove 事件相似:鼠标移动过程中,mousemove 事件也会持续发生。当拖动停止时(无论是把元素放到了有效的放置目标,还是放到了无效的放置目标上),会触发 dragend 事件。

上述三个事件的目标都是被拖动的元素。默认情况下,浏览器不会在拖动期间改变被拖动元素的外观,但可以通过代码修改;大多数浏览器会为正被拖动的元素创建一个半透明的副本,这个副本始终跟随光标移动。

当某个元素被拖动到一个有效的放置目标上时,下列事件会依次发生:

- dragenter
- dragover
- dragleave 或 drop

只要有元素被拖动到放置目标上,就会触发 dragenter 事件(类似于 mouseover 事件)。紧随其后的是 dragover 事件,在被拖动的元素还在放置目标的范围内移动时持续触发。如果元素被拖出了放置目标,dragover 事件不再发生,但会触发 dragleave 事件(类似于 mouseout 事件);如果元素被放到了放置目标中,则会触发 drop 事件而不是 dragleave 事件。这三个事件的目标都是作为放置目标的元素。

### 自定义放置目标

拖动元素经过某些无效放置目标时,会看到一种特殊的光标(圆环中有一条反斜线),表示不能放置。虽然所有元素都支持放置目标事件,但这些元素默认是不允许放置的:拖动元素经过不允许放置的元素时,无论用户如何操作,都不会发生 drop 事件。不过,可以把任何元素变成有效的放置目标,方法是重写 dragenter 和 dragover 事件的默认行为。

例如,假设有一个 ID 为 "droptarget" 的 `<div>` 元素,可以用如下代码将它变成放置目标:

```javascript
var droptarget = document.getElementById("droptarget"); 
EventUtil.addHandler(droptarget, "dragover", function(event){ 
 EventUtil.preventDefault(event); 
}); 

EventUtil.addHandler(droptarget, "dragenter", function(event){ 
 EventUtil.preventDefault(event); 
});
```

以上代码执行后,当拖动着元素移动到放置目标上时,光标会变成允许放置的符号;释放鼠标也会触发 drop 事件。

在 Firefox 3.5+ 中,放置事件的默认行为是打开被放到放置目标上的 URL:把图像拖放到放置目标上,页面会转向图像文件;把文本拖放到放置目标上,则会导致无效 URL 错误。因此,为了让 Firefox 支持正常的拖放,还要取消 drop 事件的默认行为,阻止它打开 URL:

```javascript
EventUtil.addHandler(droptarget, "drop", function(event){ 
 	EventUtil.preventDefault(event); 
});
```

### dataTransfer 对象

只有简单的拖放而没有数据变化是没有什么用的。为了在拖放操作时实现数据交换,IE 5 引入了 dataTransfer 对象,它是事件对象的一个属性,用于从被拖动元素向放置目标传递字符串格式的数据。

因为它是事件对象的属性,所以只能在拖放事件的事件处理程序中访问 dataTransfer 对象。在事件处理程序中,可以使用这个对象的属性和方法来完善拖放功能。目前,HTML5 规范草案也收入了 dataTransfer 对象。

dataTransfer 对象有两个主要方法:getData() 和 setData()。getData() 可以取得由 setData() 保存的值。setData() 方法的第一个参数(也是 getData() 方法唯一的参数)是一个字符串,表示保存的数据类型,取值为 "text" 或 "URL":

```javascript
//设置和接收文本数据
event.dataTransfer.setData("text", "some text"); 
var text = event.dataTransfer.getData("text"); 

//设置和接收 URL 
event.dataTransfer.setData("URL", "http://www.wrox.com/"); 
var url = event.dataTransfer.getData("URL");
```

IE 只定义了 "text" 和 "URL" 两种有效的数据类型,而 HTML5 对此加以扩展,允许指定各种 MIME 类型。考虑到向后兼容,HTML5 也支持 "text" 和 "URL",但这两种类型会被映射为 "text/plain" 和 "text/uri-list"。

实际上,dataTransfer 对象可以为每种 MIME 类型都保存一个值——同时保存一段文本和一个 URL 不会有任何问题。不过,保存在 dataTransfer 对象中的数据只能在 drop 事件处理程序中读取;如果在 ondrop 处理程序中没有读到数据,那就是 dataTransfer 对象已经被销毁,数据也丢失了。

在拖动文本框中的文本时,浏览器会调用 setData() 方法,将拖动的文本以 "text" 格式保存在 dataTransfer 对象中;类似地,在拖放链接或图像时,会调用 setData() 方法并保存 URL。这些元素被拖放到放置目标时,就可以通过 getData() 读到这些数据。当然,开发人员也可以在 dragstart 事件处理程序中调用 setData(),手工保存要传输的数据,以便将来使用。

将数据保存为文本和保存为 URL 是有区别的:保存为文本格式时,数据不会得到任何特殊处理;保存为 URL 时,浏览器会将其当成网页中的链接——把它放置到另一个浏览器窗口中,浏览器就会打开该 URL。

Firefox 在其第 5 个版本之前不能正确地将 "url" 和 "text" 映射为 "text/uri-list" 和 "text/plain",但却能把 "Text"(T 大写)映射为 "text/plain"。为了更好地在跨浏览器的情况下从 dataTransfer 对象取得数据,最好在取得 URL 数据时检测两个值,而在取得文本数据时使用 "Text"。

```html
<!DOCTYPE html>
<html>
<head>
    <title>Data Transfer Example</title>
    <script type="text/javascript" src="EventUtil.js"></script>
</head>
<body>
<p>Try dragging the link over to the red square. This won't work correctly in Opera.</p>
<a href="http://www.wrox.com">Wrox homepage</a>
<div style="width: 100px; height: 100px; float: right; background: red" id="droptarget"></div>
<div id="output"></div>
<script type="text/javascript">
    var droptarget = document.getElementById("droptarget");
        
    function handleEvent(event) {
        document.getElementById("output").innerHTML += event.type + "<br>";
        switch (event.type) {
            case "drop":
            case "dragdrop":
                droptarget.innerHTML = event.dataTransfer.getData("url") || event.dataTransfer.getData("text/uri-list");
            /* falls through */

            case "dropenter":
            case "dragover":
                EventUtil.preventDefault(event);
                break;
        }

    }

    EventUtil.addHandler(droptarget, "dragenter", handleEvent);
    EventUtil.addHandler(droptarget, "dragover", handleEvent);
    EventUtil.addHandler(droptarget, "dragleave", handleEvent);
    EventUtil.addHandler(droptarget, "drop", handleEvent);

</script>
</body>
</html>
```

注意,一定要把短数据类型放在前面,因为 IE 10 及之前的版本仍然不支持扩展的 MIME 类型名,它们在遇到无法识别的数据类型时会抛出错误。

### dropEffect 与 effectAllowed

利用 dataTransfer 对象,不光能够传输数据,还能确定被拖动的元素以及作为放置目标的元素能够接收什么操作。为此,需要访问 dataTransfer 对象的两个属性:dropEffect 和 effectAllowed。

通过 dropEffect 属性可以知道被拖动的元素能够执行哪种放置行为。这个属性有 4 个可能的值:

- "none":不能把拖动的元素放在这里。这是除文本框之外所有元素的默认值。
- "move":应该把拖动的元素移动到放置目标。
- "copy":应该把拖动的元素复制到放置目标。
- "link":表示放置目标会打开拖动的元素(但拖动的元素必须是一个链接,有 URL)。

把元素拖动到放置目标上时,以上每一个值都会导致光标显示为不同的符号。然而,怎样实现光标所指示的动作完全取决于开发者——如果不介入,没有什么会自动地移动、复制,也不会打开链接。浏览器只能改变光标的样式,其他的都要靠代码实现。要使用 dropEffect 属性,必须在 ondragenter 事件处理程序中针对放置目标来设置它。

dropEffect 属性只有搭配 effectAllowed 属性才有用。effectAllowed 属性表示允许拖动元素的哪种 dropEffect,可能的值如下:

- "uninitialized":没有给被拖动的元素设置任何放置行为。
- "none":被拖动的元素不能有任何行为。
- "copy":只允许值为"copy"的 dropEffect。
- "link":只允许值为"link"的 dropEffect。
- "move":只允许值为"move"的 dropEffect。
- "copyLink":允许值为"copy"和"link"的 dropEffect。
- "copyMove":允许值为"copy"和"move"的 dropEffect。
- "linkMove":允许值为"link"和"move"的 dropEffect。
- "all":允许任意 dropEffect。

必须在 ondragstart 事件处理程序中设置 effectAllowed 属性。

假设要允许用户把文本框中的文本拖放到一个 `<div>` 元素中:首先必须将 dropEffect 和 effectAllowed 设置为 "move";由于 `<div>` 元素的放置事件的默认行为是什么也不做,文本不可能自动移动,重写这个默认行为就能从文本框中移走文本,然后编写代码将文本插入到 `<div>` 中,整个拖放操作就完成了。如果将 dropEffect 和 effectAllowed 的值设置为 "copy",则不会自动移走文本框中的文本。

### 可拖动

默认情况下,图像、链接和文本是可以拖动的——不用额外编写代码,用户就可以拖动它们。文本只有在被选中的情况下才能拖动,而图像和链接在任何时候都可以拖动。

让其他元素可以拖动也是可能的。HTML5 为所有 HTML 元素规定了一个 draggable 属性,表示元素是否可以拖动。图像和链接的 draggable 属性自动被设置成了 true,而其他元素这个属性的默认值都是 false。要想让其他元素可拖动,或者让图像或链接不能拖动,都可以设置这个属性:

```html
<!-- 让这个图像不可以拖动 -->
<img src="smile.gif" draggable="false" alt="Smiley face"> 
  
<!-- 让这个元素可以拖动 --> 
<div draggable="true">...</div>
```

## 媒体元素

HTML5 新增了两个与媒体相关的标签,让开发人员不必依赖任何插件就能在网页中嵌入跨浏览器的音频和视频内容。这两个标签就是 `<audio>` 和 `<video>`。

这两个标签除了方便嵌入媒体文件之外,都提供了用于实现常用功能的 JavaScript API,允许为媒体创建自定义的控件。这两个元素的用法如下:

```html
<!-- 嵌入视频 --> 
<video src="conference.mpg" id="myVideo">Video player not available.</video> 
<!-- 嵌入音频 --> 
<audio src="song.mp3" id="myAudio">Audio player not available.</audio>
```

使用这两个元素时,至少要在标签中包含 src 属性,指向要加载的媒体文件。还可以设置 width 和 height 属性以指定视频播放器的大小;为 poster 属性指定图像的 URI,可以在加载视频内容期间显示一幅图像。另外,如果标签中有 controls 属性,则意味着浏览器应该显示 UI 控件,以便用户直接操作媒体。位于开始和结束标签之间的任何内容都将作为后备内容,在浏览器不支持这两个媒体元素的情况下显示。

因为并非所有浏览器都支持所有媒体格式,所以可以指定多个不同的媒体来源:不用在标签中指定 src 属性,而是使用一或多个 `<source>` 元素:

```html
<!-- 嵌入视频 --> 
<video id="myVideo"> 
 <source src="conference.webm" type="video/webm; codecs='vp8, vorbis'"> 
 <source src="conference.ogv" type="video/ogg; codecs='theora, vorbis'"> 
 <source src="conference.mpg"> 
 Video player not available. 
</video> 

<!-- 嵌入音频 --> 
<audio id="myAudio"> 
 <source src="song.ogg" type="audio/ogg"> 
 <source src="song.mp3" type="audio/mpeg"> 
 Audio player not available. 
</audio>
```

不同的浏览器支持不同的编解码器,因此一般来说指定多种格式的媒体来源是必需的。

### 属性

video 和 audio 元素都提供了完善的 JavaScript 接口。下表列出了这两个元素共有的属性,通过这些属性可以知道媒体的当前状态:

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310191427669.png)

### 事件

除了大量属性之外,这两个媒体元素还可以触发很多事件。这些事件监控着不同属性的变化,这些变化可能是媒体播放的结果,也可能是用户操作播放器的结果。下表列出了媒体元素相关的事件:

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310191427808.png)

这些事件之所以如此具体,就是为了让开发人员只使用少量 HTML 和 JavaScript(与创建 Flash 影片相比)即可编写出自定义的音频/视频播放器。

### 自定义媒体播放器

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Custom Video Player Example</title>
    <script src="EventUtil.js"></script>
  </head>
  <body>
    <p>Note: This example uses an OGG Theora video, which is supported in Firefox, Chrome, and Opera.</p>
    <div class="mediaplayer">
      <div class="video">
        <video id="player" src="./billyBrowsers.ogg"
               poster="mymovie.jpg"
               width="300" height="200">
          Video player not available.
        </video>
      </div>
      <div class="controls">
        <input type="button" value="Play" id="video-btn">
        <span id="curtime">0</span>/<span id="duration">0</span>
      </div>
    </div>
    <script>
      window.onload = function () {

        //get references to the elements
        var player = document.getElementById("player");
        var btn = document.getElementById("video-btn");
        var curtime = document.getElementById("curtime");
        var duration = document.getElementById("duration");
        duration.innerHTML = player.duration;

        //attach event handler to button
        EventUtil.addHandler(btn, "click", function (event) {

          if (player.paused) {
            player.play();
            btn.value = "Pause";
          } else {
            player.pause();
            btn.value = "Play";
          }
        });

        //update the current time periodically
        setInterval(function () {
          curtime.innerHTML = player.currentTime;
        }, 250);

      };

    </script>
  </body>
</html>
```

以上 JavaScript 代码给按钮添加了一个事件处理程序,单击它能让视频在暂停时播放、在播放时暂停;通过 window 的 load 事件处理程序,设置了页面加载完成后显示视频总时长;最后设置了一个计时器,定时更新当前显示的时间。可以进一步扩展这个视频播放器:监听更多事件、利用更多属性。同样的代码也可用于 `<audio>` 元素,创建自定义的音频播放器。

### 检测编解码器的支持情况

并非所有浏览器都支持 video 和 audio 的所有编解码器,这基本上就意味着必须提供多个媒体来源。不过,也有一个 JavaScript API 能够检测浏览器是否支持某种格式和编解码器:这两个媒体元素都有一个 canPlayType() 方法,该方法接收一种格式/编解码器字符串,返回 "probably"、"maybe" 或 ""(空字符串)。空字符串是假值,因此可以在 if 语句中使用:

```javascript
if (audio.canPlayType("audio/mpeg")){ 
 //进一步处理
}
```

"probably" 和 "maybe" 都是真值,在 if 语句的条件测试中可以转换成 true。

如果给 canPlayType() 传入一种 MIME 类型,则返回值很可能是 "maybe" 或空字符串——媒体文件本身只不过是音频或视频的一个容器,真正决定文件能否播放的是编码的格式。在同时传入 MIME 类型和编解码器的情况下,可能性就会增加,返回的字符串会变成 "probably":

```javascript
var audio = document.getElementById("audio-player"); 

//很可能"maybe" 
if (audio.canPlayType("audio/mpeg")){ 
 	//进一步处理
} 

//可能是"probably" 
if (audio.canPlayType("audio/ogg; codecs=\"vorbis\"")){ 
 	//进一步处理
}
```

注意,编解码器必须用引号引起来。下表列出了已知的已得到支持的音频格式和编解码器:

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310191427898.png)

### Audio 类型

audio 元素还有一个原生的 JavaScript 构造函数 Audio,可以在任何时候播放音频。从同为 DOM 元素的角度看,Audio 与 Image 很相似,但 Audio 不用像 Image 那样必须插入到文档中——只要创建一个新实例,并传入音频源文件即可:

```javascript
var audio = new Audio("sound.mp3"); 

EventUtil.addHandler(audio, "canplaythrough", function(event){ 
  audio.play(); 
});
```

创建新的 Audio 实例即可开始下载指定的文件;下载完成后,调用 play() 就可以播放音频。在 iOS 中,调用 play() 时会弹出一个对话框,得到用户的许可后才能播放声音。如果想在一段音频播放后再播放另一段音频,必须在 ended 事件(onended 事件处理程序)中调用 play() 方法。

## 小结

HTML5 除了定义新的标记规则,还定义了一些 JavaScript API,目的是让开发人员创建出更好的、能够与桌面应用媲美的用户界面。本文讨论的 API 包括:

- 跨文档消息传递 API 能够在不降低同源策略安全性的前提下,在来自不同域的文档间传递消息。
- 原生拖放功能可以方便地指定某个元素可拖动,并在操作系统要放置时做出响应,还可以创建自定义的可拖动元素及放置目标。
- 新的媒体元素 `<audio>` 和 `<video>` 拥有自己的与音频和视频交互的 API。并非所有浏览器支持所有的媒体格式,因此应该使用 canPlayType() 检查浏览器是否支持特定的格式。
- 历史状态管理可以不卸载当前页面即可修改浏览器的历史状态栈。有了这种机制,用户可以通过"后退"和"前进"按钮在页面状态间切换,而这些状态完全由 JavaScript 进行控制。
