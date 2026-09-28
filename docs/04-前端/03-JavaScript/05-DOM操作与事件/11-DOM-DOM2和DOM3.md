---
title: "DOM2和DOM3"
description: "介绍 DOM2 和 DOM3 级在 DOM1 基础上扩展的模块（核心/视图/事件/样式/遍历和范围/HTML），重点讲解 DOM2 级样式 API：style 对象、cssText、getComputedStyle、样式表操作与 CSSRule，以及元素偏移、客户区和滚动大小。"
keywords: [DOM2, DOM3, CSSStyleDeclaration]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---

# DOM2和DOM3

DOM1 级主要定义的是 HTML 和 XML 文档的底层结构。

DOM2 和 DOM3 级则在这个结构的基础上引入了更多的交互能力，也支持了更高级的 XML特性。为此，DOM2 和 DOM3级分为许多模块（模块之间具有某种关联），分别描述了 DOM 的某个非常具体的子集。这些模块如下

- DOM2 级核心（DOM Level 2 Core）：在 1 级核心基础上构建，为节点添加了更多方法和属性。

- DOM2 级视图（DOM Level 2 Views）：为文档定义了基于样式信息的不同视图

- DOM2 级事件（DOM Level 2 Events）：说明了如何使用事件与 DOM 文档交互。

- DOM2 级样式（DOM Level 2 Style）：定义了如何以编程方式来访问和改变 CSS 样式信息。

- DOM2 级遍历和范围（DOM Level 2 Traversal and Range）：引入了遍历 DOM 文档和选择其特定部分的新接口

- DOM2 级 HTML（DOM Level 2 HTML）：在 1 级 HTML 基础上构建，添加了更多属性、方法和新接口

## DOM 变化

DOM2 级和 3 级的目的在于扩展 DOM API，以满足操作 XML 的所有需求，同时提供更好的错误处理及特性检测能力。从某种意义上讲，实现这一目的很大程度意味着对命名空间的支持。“DOM2 级核心”没有引入新类型，它只是在 DOM1 级的基础上通过增加新方法和新属性来增强了既有类型。“DOM3级核心”同样增强了既有类型，但也引入了一些新类型

类似地，“DOM2 级视图”和“DOM2 级 HTML”模块也增强了 DOM 接口，提供了新的属性和方法。由于这两个模块很小，因此我们将把它们与“DOM2 级核心”放在一起，讨论基本 JavaScript 对象的变化。可以通过下列代码来确定浏览器是否支持这些 DOM 模块

```javascript
var supportsDOM2Core = document.implementation.hasFeature("Core", "2.0"); 
var supportsDOM3Core = document.implementation.hasFeature("Core", "3.0"); 
var supportsDOM2HTML = document.implementation.hasFeature("HTML", "2.0"); 
var supportsDOM2Views = document.implementation.hasFeature("Views", "2.0"); 
var supportsDOM2XML = document.implementation.hasFeature("XML", "2.0");
```

## 样式

在 HTML 中定义样式的方式有 3 种：通过 `<link/>` 元素包含外部样式表文件、使用 `<style/>` 元素定义嵌入式样式，以及使用 style 特性定义针对特定元素的样式。“DOM2 级样式”模块围绕这 3 种应用样式的机制提供了一套 API。要确定浏览器是否支持 DOM2 级定义的 CSS 能力，可以使用下列代码

```javascript
var supportsDOM2CSS = document.implementation.hasFeature("CSS", "2.0"); 

var supportsDOM2CSS2 = document.implementation.hasFeature("CSS2", "2.0");
```

### 访问元素的样式

任何支持 style 特性的 HTML 元素在 JavaScript 中都有一个对应的 style 属性。这个 style 对象是 CSSStyleDeclaration 的实例，包含着通过 HTML 的 style 特性指定的所有样式信息，但不包含与外部样式表或嵌入样式表经层叠而来的样式。在 style 特性中指定的任何 CSS 属性都将表现为这个style 对象的相应属性。对于使用短划线（分隔不同的词汇，例如 background-image）的 CSS 属性名，必须将其转换成驼峰大小写形式，才能通过 JavaScript 来访问。下表列出了几个常见的 CSS 属性及其在 style 对象中对应的属性名

- background-image   style.backgroundImage

- color   style.color

- display   style.display

- font-family   style.fontFamily

多数情况下，都可以通过简单地转换属性名的格式来实现转换。其中一个不能直接转换的 CSS 属性就是 float。由于 float 是 JavaScript 中的保留字，因此不能用作属性名。“DOM2 级样式”规范规定样式对象上相应的属性名应该是 cssFloat；

只要取得一个有效的 DOM 元素的引用，就可以随时使用 JavaScript 为其设置样式。以下是几个例子

```javascript
var myDiv = document.getElementById("myDiv"); 

//设置背景颜色
myDiv.style.backgroundColor = "red"; 

//改变大小
myDiv.style.width = "100px"; 
myDiv.style.height = "200px"; 

//指定边框
myDiv.style.border = "1px solid black";
```

在以这种方式改变样式时，元素的外观会自动被更新

在标准模式下，所有度量值都必须指定一个度量单位。在混杂模式下，可以将style.width 设置为"20"，浏览器会假设它是"20px"；但在标准模式下，将 style.width 设置为"20"会导致被忽略——因为没有度量单位。在实践中，最好始终都指定度量单位。

通过 style 对象同样可以取得在 style 特性中指定的样式。以下面的 HTML 代码为例。

```html
<div id="myDiv" style="background-color:blue; width:10px; height:25px"></div>
```

在 style 特性中指定的样式信息可以通过下列代码取得。

```javascript
alert(myDiv.style.backgroundColor); //"blue" 

alert(myDiv.style.width); //"10px" 

alert(myDiv.style.height); //"25px"
```

如果没有为元素设置 style 特性，那么 style 对象中可能会包含一些默认的值，但这些值并不能准确地反映该元素的样式信息

#### DOM 样式属性和方法

“DOM2级样式”规范还为 style 对象定义了一些属性和方法。这些属性和方法在提供元素的 style 特性值的同时，也可以修改样式。下面列出了这些属性和方法

- cssText：如前所述，通过它能够访问到 style 特性中的 CSS 代码

- length：应用给元素的 CSS 属性的数量

- parentRule：表示 CSS 信息的 CSSRule 对象。本节后面将讨论 CSSRule 类

- getPropertyCSSValue(propertyName)：返回包含给定属性值的 CSSValue 对象。

- getPropertyPriority(propertyName)：如果给定的属性使用了 !important 设置，则返回 "important"；否则，返回空字符串。

- getPropertyValue(propertyName)：返回给定属性的字符串值。

- item(index)：返回给定位置的 CSS 属性的名称

- removeProperty(propertyName)：从样式中删除给定属性。

- setProperty(propertyName,value,priority)：将给定属性设置为相应的值，并加上优先权标志（"important"或者一个空字符串）

通过cssText 属性可以访问 style特性中的 CSS代码。在读取模式下，cssText 返回浏览器对style特性中 CSS 代码的内部表示。在写入模式下，赋给 cssText 的值会重写整个 style 特性的值；也就是说，以前通过 style 特性指定的样式信息都将丢失。例如，如果通过 style 特性为元素设置了边框，然后再以不包含边框的规则重写 cssText，那么就会抹去元素上的边框。下面是使用 cssText 属性的一个例子

```javascript
myDiv.style.cssText = "width: 25px; height: 100px; background-color: green"; 

alert(myDiv.style.cssText);
```

设置 cssText 是为元素应用多项变化最快捷的方式，因为可以一次性地应用所有变化。

设计 length 属性的目的，就是将其与 item()方法配套使用，以便迭代在元素中定义的 CSS 属性

在使用 length 和 item()时，style 对象实际上就相当于一个集合，都可以使用方括号语法来代替item()来取得给定位置的 CSS 属性，如下面的例子所示

```javascript
for (var i=0, len=myDiv.style.length; i < len; i++){ 
 	alert(myDiv.style[i]); //或者 myDiv.style.item(i) 
}
```

无论是使用方括号语法还是使用 item()方法，都可以取得 CSS 属性名（"background-color"，不是"backgroundColor"）。然后，就可以在 getPropertyValue()中使用取得的属性名进一步取得属性的值，如下所示。

```javascript
var prop, value, i, len; 

for (i=0, len=myDiv.style.length; i < len; i++){ 
		prop = myDiv.style[i]; // 或者 myDiv.style.item(i) 
		value = myDiv.style.getPropertyValue(prop); 
		alert(prop + " : " + value); 
}
```

getPropertyValue()方法取得的始终都是 CSS 属性值的字符串表示。如果你需要更多信息，可以使用 getPropertyCSSValue()方法，它返回一个包含两个属性的 CSSValue 对象，这两个属性分别是：cssText 和 cssValueType。

其中，cssText 属性的值与 getPropertyValue()返回的值相同，而 cssValueType 属性则是一个数值常量，表示值的类型：0 表示继承的值，1 表示基本的值，2 表示值列表，3 表示自定义的值。以下代码既输出 CSS 属性值，也输出值的类型

```html
<!DOCTYPE html>
<html>
<head>
    <title>DOM Style Object Example</title>
</head>
<body>
    <div id="myDiv" style="background-color: blue; width: 10px; height: 25px"></div>
    <input type="button" value="Get Styles" onclick="getStyles()" />    
    <input type="button" value="Get CSS" onclick="getCSS()" />    
    <input type="button" value="Change Styles" onclick="changeStyles()" />    
    <input type="button" value="Change CSS" onclick="changeCSS()" /><br />    
    <input type="button" value="Enumerate" onclick="enumerateCSS()" />    
    <input type="button" value="Enumerate CSS Values" onclick="enumerateCSSValues()" /><br />
    <input type="button" value="Remove Border" onclick="removeBorder()" />    
    
    <script type="text/javascript">
        function changeStyles(){
            var myDiv = document.getElementById("myDiv");
            
            //set the background color
            myDiv.style.setProperty("background-color", "red", "");
            
            //change the dimensions
            myDiv.style.setProperty("width", "100px", "");
            myDiv.style.setProperty("height", "200px", "");
            
            //assign a border
            myDiv.style.setProperty("border", "1px solid black", "");
        }
        
        function getStyles(){
            var myDiv = document.getElementById("myDiv");
            alert(myDiv.style.getPropertyValue("background-color"));
            alert(myDiv.style.getPropertyValue("width"));
            alert(myDiv.style.getPropertyValue("height"));
        }
        
        function getCSS(){
            var myDiv = document.getElementById("myDiv");
            alert(myDiv.style.cssText);
        }
        
        function changeCSS(){
            var myDiv = document.getElementById("myDiv");
            myDiv.style.cssText ="width: 25px; height: 100px; background-color: green";
        }

        function enumerateCSS(){
            var myDiv = document.getElementById("myDiv");
            var props = new Array();
            for (var i=0, len=myDiv.style.length; i < len; i++){
                var prop = myDiv.style[i];     //or myDiv.style.item(i)
                var value = myDiv.style.getPropertyValue(prop);
                props.push(prop + " : " + value); 
            }
            alert(props.join("\n"));
        
        }
        
        function enumerateCSSValues(){
            var myDiv = document.getElementById("myDiv");
            var props = new Array();
            for (var i=0, len=myDiv.style.length; i < len; i++){
                var prop = myDiv.style[i];     //or myDiv.style.item(i)
                var value = myDiv.style.getPropertyCSSValue(prop);
                props.push(prop + " : " + value.cssText + " (" + value.cssValueType + ")"); 
            }
            alert(props.join("\n"));
        
        }
        
        function removeBorder(){
            var myDiv = document.getElementById("myDiv");
            myDiv.style.removeProperty("border");
        }
    </script>
</body>
</html>
```

#### 计算的样式

虽然 style 对象能够提供支持 style 特性的任何元素的样式信息，但它不包含那些从其他样式表层叠而来并影响到当前元素的样式信息。“DOM2 级样式”增强了 document.defaultView，提供了

getComputedStyle()方法。这个方法接受两个参数：要取得计算样式的元素和一个伪元素字符串（例如":after"）。如果不需要伪元素信息，第二个参数可以是 null。getComputedStyle()方法返回一个 CSSStyleDeclaration 对象（与 style 属性的类型相同），其中包含当前元素的所有计算的样式

```html
<!DOCTYPE html>
<html>
<head>
    <title>Computed Styles Example</title>
    <style type="text/css">
        #myDiv {
            background-color: blue;
            width: 100px;
            height: 200px;
        }
    </style>
    <script type="text/javascript">
        function showComputedStyles(){
            var myDiv = document.getElementById("myDiv");
            var computedStyle = document.defaultView.getComputedStyle(myDiv, null);
            alert(computedStyle.backgroundColor);   //"red"
            alert(computedStyle.width);             //"100px"
            alert(computedStyle.height);            //"200px"
            alert(computedStyle.border);            //"1px solid black"
            alert(computedStyle.borderLeftWidth);   //"1px"
            alert(computedStyle.visibility);
        }
    </script>
</head>
<body>
    <div id="myDiv" style="background-color: red; border: 1px solid black"></div>
    <input type="button" value="Show Computed Styles" onclick="showComputedStyles()">
    <p>(This example won't work in IE &lt; 9.)</p>
</body>
</html>
```

### 操作样式表

CSSStyleSheet 类型表示的是样式表，包括通过 `<link>` 元素包含的样式表和在 `<style>` 元素中定义的样式表。有读者可能记得，这两个元素本身分别是由 HTMLLinkElement 和 HTMLStyleElement 类型表示的。

但是，CSSStyleSheet 类型相对更加通用一些，它只表示样式表，而不管这些样式表在 HTML中是如何定义的。此外，上述两个针对元素的类型允许修改 HTML 特性，但 CSSStyleSheet 对象则是一套只读的接口（有一个属性例外）。使用下面的代码可以确定浏览器是否支持 DOM2 级样式表。

```javascript
var supportsDOM2StyleSheets = document.implementation.hasFeature("StyleSheets", "2.0");
```

CSSStyleSheet 继承自 StyleSheet，后者可以作为一个基础接口来定义非 CSS 样式表。从StyleSheet 接口继承而来的属性如下。

- disabled：表示样式表是否被禁用的布尔值。这个属性是可读/写的，将这个值设置为 true 可以禁用样式表。

- href：如果样式表是通过 `<link>` 包含的，则是样式表的 URL；否则，是 null。

- media：当前样式表支持的所有媒体类型的集合。与所有 DOM 集合一样，这个集合也有一个 length 属性和一个 item() 方法，也可以使用方括号语法取得集合中特定的项。如果集合是空列表，表示样式表适用于所有媒体。在 IE 中，media 是一个反映 `<link>` 和 `<style>` 元素 media 特性值的字符串。

- ownerNode：指向拥有当前样式表的节点的指针，样式表可能是在 HTML 中通过 `<link>` 或 `<style/>` 引入的（在 XML 中可能是通过处理指令引入的）。如果当前样式表是其他样式表通过 `@import` 导入的，则这个属性值为 null。IE 不支持这个属性。

- parentStyleSheet：在当前样式表是通过 `@import` 导入的情况下，这个属性是一个指向导入它的样式表的指针。

- title：ownerNode 中 title 属性的值。

- type：表示样式表类型的字符串。对 CSS 样式表而言，这个字符串是 "text/css"。

除 了 disabled 属性之外，其他属性都是只读的。在支持以上所有这些属性的基础上，CSSStyleSheet 类型还支持下列属性和方法：

- cssRules：样式表中包含的样式规则的集合。IE 不支持这个属性，但有一个类似的 rules 属性。

- ownerRule：如果样式表是通过 `@import` 导入的，这个属性就是一个指针，指向表示导入的规则；否则，值为 null。

- deleteRule(*index*)：删除 cssRules 集合中指定位置的规则。IE 不支持这个方法，但支持一个类似的 removeRule()方法。

- insertRule(*rule,index*)：向 cssRules 集合中指定的位置插入 *rule* 字符串。IE 不支持这个方法，但支持一个类似的 addRule()方法。

应用于文档的所有样式表是通过 document.styleSheets 集合来表示的。通过这个集合的 length属性可以获知文档中样式表的数量，而通过方括号语法或 item()方法可以访问每一个样式表。来看一个例子。

```html
<!DOCTYPE html>
<html>
<head>
    <title>Style Sheets Example</title>
    <link rel="stylesheet" title="blah" type="text/css" href="stylesheet1.css">
    <link rel="alternate stylesheet" type="text/css" href="stylesheet2.css">    
    <style type="text/css">
        #myDiv {
            background-color: blue;
            width: 100px;
            height: 200px;
        }
    </style>
    <script type="text/javascript">
        function outputStyleSheets(){
            var sheet = null;
            for (var i=0, len=document.styleSheets.length; i < len; i++){
                sheet = document.styleSheets[i];
                alert(sheet.href);
            }
        }
        
        function toggleStyleSheet(){
            document.styleSheets[0].disabled = !document.styleSheets[0].disabled;
        }
    </script>
</head>
<body>
    <div id="myDiv"></div>
    <input type="button" value="Output Style Sheets" onclick="outputStyleSheets()">
    <input type="button" value="Enable/Disable Style Sheet" onclick="toggleStyleSheet()">
    
    
</body>
</html>
```

以上代码可以输出文档中使用的每一个样式表的 href 属性（`<style>`元素包含的样式表没有href 属性）。

不同浏览器的 document.styleSheets 返回的样式表也不同。所有浏览器都会包含 `<style>` 元素和 rel 特性被设置为"stylesheet"的`<link>` 元素引入的样式表。IE 和 Opera 也包含 rel 特性被设置为"alternate stylesheet"的元素引入的样式表。

也可以直接通过 `<link>`或`<style>`元素取得 CSSStyleSheet 对象。DOM 规定了一个包含CSSStyleSheet 对象的属性，名叫 sheet；除了 IE，其他浏览器都支持这个属性。IE 支持的是styleSheet 属性。要想在不同浏览器中都能取得样式表对象，可以使用下列代码。

```html
<!DOCTYPE html>
<html>
<head>
    <title>Style Sheets Example</title>
    <link rel="stylesheet" title="blah" type="text/css" href="stylesheet1.css">
    <link rel="alternate stylesheet" type="text/css" href="stylesheet2.css">    
    <style type="text/css">
        #myDiv {
            background-color: blue;
            width: 100px;
            height: 200px;
        }
    </style>
    <script type="text/javascript">
    
        function getStyleSheet(element){
            return element.sheet || element.styleSheet;
        }

    
        function outputStyleSheet(){            
            //get the style sheet for the first <link/> element
            var link = document.getElementsByTagName("link")[0];
            var sheet = getStyleSheet(link);
            alert(sheet.href);
        }
    </script>
</head>
<body>
    <div id="myDiv"></div>
    <input type="button" value="Output Style Sheet" onclick="outputStyleSheet()">
    
    
</body>
</html>
```

这里的 getStyleSheet() 返回的样式表对象与 document.styleSheets 集合中的样式表对象相同。

#### CSS 规则

CSSRule 对象表示样式表中的每一条规则。实际上，CSSRule 是一个供其他多种类型继承的基类型，其中最常见的就是 CSSStyleRule 类型，表示样式信息（其他规则还有 @import、@font-face、@page 和 @charset，但这些规则很少有必要通过脚本来访问）。CSSStyleRule 对象包含下列属性

- cssText：返回整条规则对应的文本。由于浏览器对样式表的内部处理方式不同，返回的文本可能会与样式表中实际的文本不一样；Safari 始终都会将文本转换成全部小写。

- parentRule：如果当前规则是导入的规则，这个属性引用的就是导入规则；否则，这个值为null。

- parentStyleSheet：当前规则所属的样式表。

- selectorText：返回当前规则的选择符文本。由于浏览器对样式表的内部处理方式不同，返回的文本可能会与样式表中实际的文本不一样（例如，Safari 3 之前的版本始终会将文本转换成全部小写）。在 Firefox、Safari、Chrome 和 IE 中这个属性是只读的。Opera允许修改 selectorText。

- style：一个 CSSStyleDeclaration 对象，可以通过它设置和取得规则中特定的样式值。

- type：表示规则类型的常量值。对于样式规则，这个值是 1。

其中三个最常用的属性是 cssText、selectorText 和 style。cssText 属性与 style.cssText属性类似，但并不相同。前者包含选择符文本和围绕样式信息的花括号，后者只包含样式信息（类似于元素的 style.cssText）。此外，rule 的 cssText 实际可写（DOM2 级样式规范与现代 CSSOM 均如此：赋值会解析并原地替换该规则，仅当规则本身只读时才不可修改），而 style.cssText 也可以被重写

```html
<!DOCTYPE html>
<html>
<head>
    <title>CSS Rules Example</title>
    <style type="text/css">
        div.box {
            background-color: blue;
            width: 100px;
            height: 200px;
        }
    </style>
    <script type="text/javascript">
    
        function getStyleInfo(){
            var sheet = document.styleSheets[0];
            var rules = sheet.cssRules || sheet.rules;
            var rule = rules[0];
            alert(rule.selectorText);
            alert(rule.style.cssText);
            alert(rule.style.backgroundColor);
            alert(rule.style.width);
            alert(rule.style.height);
        }
        
        function changeStyleInfo(){        
            var sheet = document.styleSheets[0];
            var rules = sheet.cssRules || sheet.rules;
            var rule = rules[0];    

            rule.style.backgroundColor = "red";
        }

    </script>
</head>
<body>
    <div class="box" style="margin-bottom: 10px"></div>
    <div class="box"></div>
    <input type="button" value="Get Style Info" onclick="getStyleInfo()">
    <input type="button" value="Change Style Info" onclick="changeStyleInfo()">
    
    
</body>
</html>
```

#### 元素大小

本节介绍的属性和方法并不属于“DOM2 级样式”规范，但却与 HTML 元素的样式息息相关。DOM中没有规定如何确定页面中元素的大小

##### 偏移量

首先要介绍的属性涉及偏移量（offset dimension），包括元素在屏幕上占用的所有可见的空间。元素的可见大小由其高度、宽度决定，包括所有内边距、滚动条和边框大小（注意，不包括外边距）。通过下列 4 个属性可以取得元素的偏移量。

- offsetHeight：元素在垂直方向上占用的空间大小，以像素计。包括元素的高度、水平滚动条的高度、上边框高度和下边框高度。

- offsetWidth：元素在水平方向上占用的空间大小，以像素计。包括元素的宽度、垂直滚动条的宽度、左边框宽度和右边框宽度。

- offsetLeft：元素的左外边框至包含元素的左内边框之间的像素距离。

- offsetTop：元素的上外边框至包含元素的上内边框之间的像素距离。

其中，offsetLeft 和 offsetTop 属性与包含元素有关，包含元素的引用保存在 offsetParent属性中。offsetParent 属性不一定与 parentNode 的值相等。例如，`<td>` 元素的 offsetParent 是作为其祖先元素的 `<table>` 元素，因为 `<table>` 是在 DOM 层次中距 `<td>` 最近的一个具有大小的元素。

![image-20231019150534840](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310191505530.png)

要想知道某个元素在页面上的偏移量，将这个元素的 offsetLeft 和 offsetTop 与其 offsetParent的相同属性相加，如此循环直至根元素，就可以得到一个基本准确的值。以下两个函数getElementLeft、getElementTop 就可以用于分别取得元素的左和上偏移量。

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Offset Dimensions Example</title>
    <script type="text/javascript">

      function getElementLeft(element){
        var actualLeft = element.offsetLeft;
        var current = element.offsetParent;

        while (current !== null){        
          actualLeft += current.offsetLeft;
          current = current.offsetParent;
        }

        return actualLeft;
      }

      function getElementTop(element){
        var actualTop = element.offsetTop;
        var current = element.offsetParent;

        while (current !== null){        
          actualTop += current.offsetTop;
          current = current.offsetParent;
        }

        return actualTop;
      }

      function getOffsetHeight(){
        alert(document.getElementById("myDiv").offsetHeight);
      }

      function getOffsetWidth(){
        alert(document.getElementById("myDiv").offsetWidth);
      }

      function getOffsetLeft(){
        alert(document.getElementById("myDiv").offsetLeft);
      }

      function getOffsetTop(){
        alert(document.getElementById("myDiv").offsetTop);
      }

      function getActualLeft(){
        alert(getElementLeft(document.getElementById("myDiv")));
      }

      function getActualTop(){
        alert(getElementTop(document.getElementById("myDiv")));
      }

    </script>
  </head>
  <body>
    <div style="margin: 20px">
      <div style="padding: 20px">
        <div id="myDiv" 
             style="width: 100px; height: 50px; background-color: red; border: 1px solid black"></div>
      </div>
    </div>
    <input type="button" value="Get Offset Height" onclick="getOffsetHeight()">
    <input type="button" value="Get Offset Width" onclick="getOffsetWidth()">
    <input type="button" value="Get Offset Left" onclick="getOffsetLeft()">
    <input type="button" value="Get Offset Top" onclick="getOffsetTop()">
    <br>
    <input type="button" value="Get Actual Left" onclick="getActualLeft()">
    <input type="button" value="Get Actual Top" onclick="getActualTop()">

  </body>
</html>
```

##### 客户区大小

元素的客户区大小（client dimension），指的是元素内容及其内边距所占据的空间大小。有关客户区大小的属性有两个：clientWidth 和 clientHeight

其中，clientWidth 属性是元素内容区宽度加上左右内边距宽度；clientHeight 属性是元素内容区高度加上上下内边距高度

![image-20231019150610564](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310191506622.png)

从字面上看，客户区大小就是元素内部的空间大小，因此滚动条占用的空间不计算在内。最常用到这些属性的情况，就是确定浏览器视口大小的时候

```javascript
 width: document.documentElement.clientWidth, 

 height: document.documentElement.clientHeight
```

##### 滚动大小

最后要介绍的是滚动大小（scroll dimension），指的是包含滚动内容的元素的大小。有些元素（例如`<html>`元素），即使没有执行任何代码也能自动地添加滚动条；但另外一些元素，则需要通过 CSS 的overflow 属性进行设置才能滚动。以下是 4 个与滚动大小相关的属性

- scrollHeight：在没有滚动条的情况下，元素内容的总高度。

- scrollWidth：在没有滚动条的情况下，元素内容的总宽度。

- scrollLeft：被隐藏在内容区域左侧的像素数。通过设置这个属性可以改变元素的滚动位置

- scrollTop：被隐藏在内容区域上方的像素数。通过设置这个属性可以改变元素的滚动位置

![image-20231019150648227](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310191506281.png)

因此，带有垂直滚动条的页面总高度就是 document.documentElement.scrollHeight

对于不包含滚动条的页面而言， scrollWidth 和 scrollHeight 与 clientWidth 和clientHeight 之间的关系并不十分清晰。在这种情况下，基于 document.documentElement 查看这些属性会在不同浏览器间发现一些不一致性问题，如下所述。

```javascript
function scrollToTop(element){
  if (element.scrollTop != 0){
    element.scrollTop = 0;
  }
}

function getDocumentDimensions(){
  var docHeight = Math.max(document.documentElement.scrollHeight,
                           document.documentElement.clientHeight);

  var docWidth = Math.max(document.documentElement.scrollWidth,
                          document.documentElement.clientWidth);
  alert("Client: Width: " + document.documentElement.clientWidth + "\nheight: " + document.documentElement.clientHeight);
  alert("Scroll: Width: " + document.documentElement.scrollWidth + "\nheight: " + document.documentElement.scrollHeight);
}

function setScrollTop(){
  scrollToTop(document.documentElement);
}

function getScrollTop(){
  alert(document.documentElement.scrollTop);
}
```
