---
title: "Canvas 案例"
description: "Canvas 综合案例：绘制形状/文本/图像、旋转缩放与时钟、globalCompositeOperation 叠加模式与刮刮卡、画板与图片压缩等完整示例。"
keywords: [Canvas, 案例]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---

#  Canvas 案例

## 1. 认识 canvas

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title></title>
</head>
<body>
<!--
 canvas三要素：
 id:作为唯一的标识
 width:画布内容宽度的像素大小（与style的宽度和高度是有区别）
 height:画布内容高度的像素大小

 cavas仅仅只是1个画布标签，要绘制内容，必须用js绘制
 -->
<canvas id="canvas1" width="600" height="400">
    这里的内容，正常的画布是不显示的，你的浏览器不支持canvas
</canvas>


<script type="text/javascript">

    // 1找到画布对象
    var canvas1 = document.querySelector("#canvas1")
    console.log([canvas1])
    // 2上下文对象(画笔)
    var ctx = canvas1.getContext("2d")
    console.log(ctx)

    // 3绘制路径
    ctx.rect(50, 50, 300, 300)

    // 4填充
    ctx.fillStyle = "aqua";
    ctx.fill()

    // 5描边,渲染路径
    ctx.lineWidth = 20
    ctx.strokeStyle = "salmon"
    ctx.stroke()


</script>

</body>
</html>
```

## 2. 绘制形状

### 不规则形状

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title></title>
</head>
<body>
<canvas id="canvas1" width="600" height="400"></canvas>

<script type="text/javascript">
    var canvas1 = document.querySelector("#canvas1")
    var ctx = canvas1.getContext('2d')

    // 设置开始路径
    ctx.beginPath()
    // 设置绘制的起始点
    ctx.moveTo(50, 50)
    // 设置经过某个位置
    ctx.lineTo(50, 300)
    // 设置经过某个位置
    ctx.lineTo(300, 100)
    // 设置经过某个位置
    ctx.lineTo(300, 250)
    // 设置结束路径 线段就会自动收尾相连，产生闭合
    ctx.closePath()

    console.log(ctx)
    //绘制路径
    ctx.lineCap = "round"//起始路径的线段边缘设置为圆角
    /* ctx.lineJoin = "round" */
    ctx.miterLimit = 3
    ctx.strokeStyle = "aqua"
    ctx.lineWidth = 20
    ctx.stroke()
</script>
</body>
</html>
```

### 绘制圆形

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title></title>
</head>
<body>
<canvas id="canvas1" width="600" height="400"></canvas>
<script type="text/javascript">
    var canvas1 = document.querySelector("#canvas1")
    var ctx = canvas1.getContext('2d')

    //默认为false(可不写),是顺时针,true为逆时针,是否是逆时针
    ctx.arc(150, 150, 100, 0, 2 * Math.PI, false)

    ctx.fillStyle = "bisque";
    ctx.fill()
    ctx.stroke()
</script>
</body>
</html>
```

### 绘制文本

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title></title>
</head>
<body>
<canvas id="canvas1" width="600" height="400"></canvas>
<script type="text/javascript">
    var canvas1 = document.querySelector("#canvas1")
    var ctx = canvas1.getContext('2d')
    console.log(ctx)
    ctx.font = "50px 微软雅黑"


    //设置阴影
    ctx.shadowBlur = 20;
    ctx.shadowColor = "rgba(0, 0, 0, 1)";
    ctx.shadowOffsetX = 10
    ctx.shadowOffsetY = 10

    var x = 600;
    setInterval(function () {
        //清空画布
        ctx.clearRect(0, 0, 600, 600)
        x -= 3;
        if (x < -100) {
            x = 600;
        }
        ctx.fillText("helloworld", x, 100)
        ctx.strokeText("中午吃啥？", x, 200)
    }, 16)

</script>
</body>
</html>
```

## 3. 绘制图像



### 图片

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title></title>
</head>
<body>
<!--width="200" height="150" 将200 150的图片 放到到 600 450的大小		-->
<canvas id="canvas" width="200" height="150" style="width:600px;height: 450px;"></canvas>
<script type="text/javascript">
    var canvas = document.querySelector("#canvas")

    var ctx = canvas.getContext('2d')


    var img = new Image()
    img.src = "img/cat.jpg"
    img.onload = function () {
        ctx.drawImage(img, 0, 0)
    }
</script>
</body>
</html>
```

### 水印

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title></title>
</head>
<body>
<canvas id="canvas" width="600" height="400"></canvas>
<script type="text/javascript">
    var canvas = document.querySelector("#canvas")
    var ctx = canvas.getContext('2d')

    //绘制图像
    //ctx.drawImage(图片对象，x位置,y位置)
    //ctx.drawImage(图片对象，x位置,y位置，宽度，高度)
    //ctx.drawImage(图片对象，图像裁剪的位置x，图像裁剪y的位置，裁剪的宽度，裁剪的高度，x位置,y位置，宽度，高度)
    var img = new Image()
    img.src = "img/cat.jfif"

    //图片载入数据后在绘制内容
    img.onload = function () {
        ctx.drawImage(img, 50, 50)
        console.log(img)
    }

    var img2 = new Image()
    img2.src = "img/mnist_images.png"
    img2.onload = function () {
        // 18,50,200,150  x位置,y位置，宽度，高度
        ctx.drawImage(img2, 150, 100, 550, 350, 180, 50, 200, 150)
        // 制作水印
        ctx.fillText("制作水印", 550, 380)
    }

</script>
</body>
</html>
```

### 处理图像

[跳转](http://vuepress.zhangzhengyang.com/canvas-code/3绘制图像/处理图像.html)

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title></title>
    <link rel="shortcut icon" href="img/bitbug_favicon.ico"/>
</head>
<body>
<!-- 集合了65000张手写的数字图片 宽度784 高度65000  784 = 28*28 -->
<!-- 总共有65000行，一行代表一个图片，宽是784个像素，一个像素有四位数表示 -->
<!-- 显示数字图片 -->
<canvas id="c2" width="100" height="65000" style="width: 300px;height: 65000px;"></canvas>
<!-- 显示所有内容的图片 -->
<canvas id="c1" width="784" height="65000"></canvas>

<script type="text/javascript">
    var c1 = document.querySelector("#c1")
    var c2 = document.querySelector("#c2")
    var c1Cxt = c1.getContext('2d')
    var c2Cxt = c2.getContext('2d')
    var img = new Image()
    img.src = "img/mnist_images.png";

    /*
    * c1Cxt.getImageData(0,70,10,10)
    * 数组里面会有400（10*10）条数据，4个位一组代表一个颜色值rgba
    */
    img.onload = function () {
        c1Cxt.drawImage(img, 0, 0)

        for (var j = 0; j < 65000; j++) {
            var imgData = c1Cxt.getImageData(0, j, 784, 1)

            var imgData2 = c2Cxt.createImageData(28, 28)


            for (var i = 0; i < 784 * 4; i++) {
                imgData2.data[i] = imgData.data[i]
            }
            console.log(imgData2)
            console.log(imgData)
            c2Cxt.putImageData(imgData2, 0, j * 28, 0, 0, 28, 28)
        }

    }
</script>


</body>
</html>
```

### 处理视频

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title></title>
</head>
<body>
<canvas id="canvas" width="800" height="600" style="width:800px;height: 600px;"></canvas>
<video width="800" height="" src="img/mov_bbb.mp4" controls="controls"></video>


<script type="text/javascript">
    var video = document.querySelector("video")
    var canvas = document.querySelector("#canvas")

    var interId;
    var ctx = canvas.getContext('2d')
    // 视频播放的时候，截取图片输出到canvas中
    video.onplay = function () {
        interId = setInterval(function () {
            ctx.clearRect(0, 0, 800, 600)
            ctx.fillRect(0, 0, 800, 600)
            ctx.drawImage(video, 0, 70, 800, 440)

            ctx.font = "20px 微软雅黑"
            ctx.strokeStyle = "#999"
            ctx.strokeText("制作水印", 50, 50)

        }, 16)
    }
    video.onpause = function () {
        clearInterval(interId)
    }
</script>
</body>
</html>
```

## 4. 变形

### 旋转

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title></title>
</head>
<body>
<canvas id="canvas" width="800" height="400"></canvas>

<script type="text/javascript">
    var canvas = document.querySelector("#canvas")
    var cxt = canvas.getContext('2d')

    cxt.fillStyle = "deepskyblue"
    cxt.fillRect(100, 0, 300, 100)


    cxt.rotate(Math.PI / 4)
    cxt.fillStyle = "deepskyblue"
    cxt.fillRect(100, 0, 300, 100)

</script>
</body>
</html>
```

### 移动

```html
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<title></title>
	</head>
	<body>
		<canvas id="canvas" width="800" height="400"></canvas>

		<script type="text/javascript">
			var canvas = document.querySelector("#canvas")
			var cxt = canvas.getContext('2d')

			//移动即是translate,会将整个坐标尺进行移动

			cxt.fillStyle = "hotpink"
			cxt.fillRect(0,0,100,100)

			cxt.translate(300,0)
			cxt.fillStyle = "deepskyblue"
			cxt.fillRect(100,100,300,100)

		</script>
	</body>
</html>
```

### 缩放

```html
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<title></title>
	</head>
	<body>
		<canvas id="canvas" width="800" height="400"></canvas>

		<script type="text/javascript">
			var canvas = document.querySelector("#canvas")
			var cxt = canvas.getContext('2d')

			cxt.fillStyle = "hotpink"
			cxt.fillRect(0,0,100,100)
			//保留环境的状态(画笔的状态)
			cxt.save()

			cxt.scale(2,4)
			cxt.fillStyle = "deepskyblue"
			cxt.fillRect(100,0,300,100)
			cxt.save()


			//恢复之前保留的画笔状态
			cxt.restore()
			cxt.restore()
			//cxt.fillStyle = "hotpink"
			cxt.fillRect(0,150,100,100)

		</script>
	</body>
</html>
```

### 时钟

```html
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<title></title>
	</head>
	<body>
		<canvas id="canvas" width="800" height="550"></canvas>

		<script type="text/javascript">
			var canvas = document.querySelector("#canvas")
			var cxt = canvas.getContext('2d')

			function renderClock(){
				cxt.clearRect(0,0,800,550)
				// 保留最原始的状态
				cxt.save()
				// 将坐标移动到画布的中央
				cxt.translate(400,300)
				cxt.rotate(-2*Math.PI/4)

				cxt.save()
				//绘制表盘
				cxt.beginPath()
				cxt.arc(0,0,200,0,2*Math.PI)
				cxt.strokeStyle = "darkgrey"
				cxt.lineWidth = 10
				cxt.stroke()
				cxt.closePath()

				//绘制分钟刻度
				for(var j=0;j<60;j++){
					// 画笔旋转的角度
					cxt.rotate(Math.PI/30)
					cxt.beginPath()
					// 画笔的起点
					cxt.moveTo(180,0)
					// 画笔的结束
					cxt.lineTo(190,0)
					cxt.lineWidth = 2;
					cxt.strokeStyle = "orangered"
					cxt.stroke()
					cxt.closePath()
				}
				cxt.restore()
				cxt.save()
				//绘制时钟刻度
				for(var i = 0;i<12;i++){
					cxt.rotate(Math.PI/6)
					cxt.beginPath()
					cxt.moveTo(180,0)
					cxt.lineTo(200,0)
					cxt.lineWidth = 10;
					cxt.strokeStyle = "darkgrey"
					cxt.stroke()
					cxt.closePath()
				}
				cxt.restore()
				cxt.save()


				var time = new Date()

				var hour =  time.getHours()
				var min = time.getMinutes()
				var sec = time.getSeconds()
				//如果时间是大于12的话,就直接减去12
				hour = hour>12?hour-12:hour
				console.log(hour+":"+min+":"+sec)


				//绘制秒针
				cxt.beginPath()
				//根据秒针的时间进行旋转
				cxt.rotate(2*Math.PI/60*sec)
				cxt.moveTo(-30,0)
				cxt.lineTo(170,0)
				cxt.lineWidth = 2;
				cxt.strokeStyle = "red"
				cxt.stroke()
				cxt.closePath()

				cxt.restore()
				cxt.save()


				//绘制分针
				cxt.beginPath()
				//根据分针的时间进行旋转
				cxt.rotate(2*Math.PI/60*min+2*Math.PI/3600*sec)
				cxt.moveTo(-20,0)
				cxt.lineTo(150,0)
				cxt.lineWidth = 4;
				cxt.strokeStyle = "darkblue"
				cxt.stroke()
				cxt.closePath()

				cxt.restore()
				cxt.save()

				//绘制时针
				cxt.beginPath()
				//根据时针的时间进行旋转
				cxt.rotate(2*Math.PI/12*hour+2*Math.PI/60/12*min + 2*Math.PI/12/60/60*sec)
				cxt.moveTo(-20,0)
				cxt.lineTo(140,0)
				cxt.lineWidth = 6;
				cxt.strokeStyle = "darkslategray"
				cxt.stroke()
				cxt.closePath()

				cxt.beginPath()
				cxt.arc(0,0,10,0,2*Math.PI)
				cxt.fillStyle  = "deepskyblue";
				cxt.fill()
				cxt.closePath()

				cxt.restore()
				cxt.restore()
			}

			setInterval(function(){
				renderClock()
			},1000)

		</script>
	</body>
</html>
```

## 5. 叠加模式

### 图形叠加

```html
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<title></title>
	</head>
	<body>
		<canvas id="canvas" width="800" height="600"></canvas>
		<script type="text/javascript">
			var canvas = document.querySelector("#canvas")
			var ctx = canvas.getContext('2d')
			//第一个红色矩形为目标图像
			ctx.fillStyle = "hotpink"
			ctx.fillRect(100,100,200,200)

			ctx.globalCompositeOperation="xor"
			console.log(ctx)
			/*
			 如何将一个源(新的)图像绘制到目标(已有的)的图像上
			 默认值为source-over，源图像叠加在目标图像上
			 source-atop，在*目标图像*顶部显示*源图像*。*源图像*位于*目标图像*之外的部分是不可见的。
			 source-in,在*目标图像*中显示*源图像*。只有*目标图像*之内的*源图像*部分会显示，*目标图像*是透明的。
			 source-out,在*目标图像*之外显示*源图像*。只有*目标图像*之外的*源图像*部分会显示，*目标图像*是透明的
			 destination-over,在*源图像*上显示*目标图像*。
			 destination-atop,在*源图像*顶部显示*目标图像*。*目标图像*位于*源图像*之外的部分是不可见的。
			 destination-in,在*源图像*中显示*目标图像*。只有*源图像*之内的*目标图像*部分会被显示，*源图像*是透明的。
			 destination-out,在*源图像*之外显示*目标图像*。只有*源图像*之外的*目标图像*部分会被显示，*源图像*是透明的。
			 lighter,显示*源图像* + *目标图像*
			 copy,显示*源图像*。忽略*目标图像*。
			 xor,使用异或操作对*源图像*与*目标图像*进行组合。
			 */


			//第二个蓝色矩形为源图像
			ctx.fillStyle = "deepskyblue"
			ctx.fillRect(200,200,200,200)
		</script>
	</body>
</html>
```

### 刮刮卡

```html
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<title></title>
		<style type="text/css">
			#ggk{
				width: 600px;
				height: 200px;
				position: relative;
			}
			#ggk .jp{
				width: 600px;
				height: 200px;
				text-align: center;
				color: deeppink;
				font-size: 50px;
				line-height: 200px;
			}
			#ggk #canvas{
				width: 600px;
				height: 200px;
				position: absolute;
				left: 0;
				top: 0;
			}
		</style>
	</head>
	<body>
		<div id="ggk">
			<div class="jp">谢谢惠顾</div>
			<canvas id="canvas" width="600" height="200"></canvas>
		</div>
		<script type="text/javascript">
			var ggkDom = document.querySelector("#ggk")
			var jpDom = document.querySelector(".jp")
			var canvas = document.querySelector("#canvas")
			var ctx = canvas.getContext('2d');

			ctx.fillStyle= "darkgray"
			ctx.fillRect(0,0,600,200)
			ctx.font = "20px 微软雅黑"
			ctx.fillStyle = '#fff'
			ctx.fillText("刮刮卡",260,100)
			var isDraw = false;
			//设置isDraw = true,即为允许绘制
			canvas.onmousedown = function(){
				isDraw = true
				console.log(isDraw)
			}

			//移动的时候绘制圆形,将源图像内的目标的内容给清除掉
			canvas.onmousemove = function(e){
				//console.log(e)
				if(isDraw){
					var x = e.pageX - ggkDom.offsetLeft;
					var y = e.pageY - ggkDom.offsetTop
					ctx.globalCompositeOperation = "destination-out"
					ctx.arc(x,y,20,0,2*Math.PI)
					ctx.fill()

				}

			}

			canvas.onmouseup = function(){
				isDraw = false
				console.log(isDraw)
			}
			jpDom.onselectstart = function(){
				return false
			}

			var arr = [{content:"一等奖：IphoneXs",p:0.1},{content:"二等奖：娃娃1个",p:0.2},{content:"三等奖：Ipad",p:0.3}]
			var randomNum = Math.random()
			if(randomNum<arr[0].p){
				jpDom.innerHTML = arr[0].content
			}else if(randomNum<arr[1].p+arr[0].p){
				jpDom.innerHTML = arr[1].content
			}else if(randomNum<arr[2].p+arr[1].p+arr[0].p){
				jpDom.innerHTML = arr[2].content
			}
		</script>
	</body>
</html>
```

## 6. 画板

[跳转](http://vuepress.zhangzhengyang.com/canvas-code/6画板/index.html)

:::details

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title></title>
    <link rel="stylesheet" type="text/css" href="css/style.css"/>
</head>
<body>
<!--
 将画笔功能：能够拖动鼠标在页面内绘图，能够设置画笔的粗细，设置画笔的颜色
 能够在任意位置绘制圆形：拖动鼠标即可随意在任意位置绘制圆形，并且可以随意定制大小
 能够在任意位置绘制出矩形：拖动鼠标即可随意在任意位置绘制矩形，并且可以随意定制大小
 -->

<div class="caidan">
    <div class="btn active" id="huabi" style="background-image: url(img/huabi.png);"></div>
    <div class="btn" id="rect">矩形</div>
    <div class="btn">圆形</div>
    <div class="btn">橡皮擦</div>
    <div class="btn2 download">下载图片</div>
    <div class="btn2 download2" style="display: none;">
        <a href="" download="download">下载</a>
    </div>
    <div class="btn1 line xi active"></div>
    <div class="btn1 line normal"></div>
    <div class="btn1 line cu"></div>
    <div class="btn2"><input type="color" name="color" id="color" value="#000000"/></div>
</div>

<canvas id="canvas"></canvas>
<link rel="stylesheet" type="text/css" href="css/alert.css"/>
<script src="js/alert.js" type="text/javascript" charset="utf-8"></script>
<script type="text/javascript">
    var allBtn = document.querySelectorAll(".btn")
    //获取canvas
    var canvas = document.querySelector("#canvas")
    console.log([canvas])
    var ctx = canvas.getContext('2d')
    console.log(ctx)

    //设置canvas的宽度和高度
    canvas.setAttribute("width", canvas.offsetWidth);
    canvas.setAttribute("height", canvas.offsetHeight)
    var huaban = {
        type: "huabi",
        isDraw: false,
        beginX: 0,
        beginY: 0,
        lineWidth: 6,
        imageData: null,
        color: "#000",
        huabiFn: function (e) {
            var x = e.pageX - canvas.offsetLeft;
            var y = e.pageY - canvas.offsetTop
            ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
            if (huaban.imageData != null) {
                ctx.putImageData(huaban.imageData, 0, 0, 0, 0, canvas.offsetWidth, canvas.offsetHeight)
            }
            ctx.lineTo(x, y)
            ctx.strokeStyle = huaban.color;
            ctx.lineWidth = huaban.lineWidth;
            ctx.lineCap = "round"
            ctx.lineJoin = "round"
            ctx.stroke()

        },
        rectFn: function (e) {
            var x = e.pageX - canvas.offsetLeft;
            var y = e.pageY - canvas.offsetTop

            ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
            if (huaban.imageData != null) {
                ctx.putImageData(huaban.imageData, 0, 0, 0, 0, canvas.offsetWidth, canvas.offsetHeight)
            }

            ctx.beginPath()
            ctx.rect(huaban.beginX, huaban.beginY, x - huaban.beginX, y - huaban.beginY);
            ctx.strokeStyle = huaban.color;
            ctx.stroke()
            ctx.closePath()
        }
    }

    var huabiBtn = document.querySelector("#huabi")
    huabiBtn.onclick = function () {
        allBtn.forEach(function (item, i) {
            item.classList.remove("active")
        })
        huabiBtn.classList.add("active")
        huaban.type = "huabi"
    }

    var rectBtn = document.querySelector("#rect")
    rectBtn.onclick = function () {
        allBtn.forEach(function (item, i) {
            item.classList.remove("active")
        })
        rectBtn.classList.add("active")
        huaban.type = "rect"
    }

    //设置粗细的按钮
    var lineDivs = document.querySelectorAll(".line")
    lineDivs.forEach(function (item, i) {
        item.onclick = function () {
            lineDivs.forEach(function (a, b) {
                a.classList.remove("active")
            })
            item.classList.add('active')
            if (i == 0) {
                huaban.lineWidth = 6;

            } else if (i == 1) {
                huaban.lineWidth = 16;
            } else {
                huaban.lineWidth = 32;
            }
        }
    })

    //监听颜色设置改变事件
    var colorInput = document.querySelector("#color")
    colorInput.onchange = function (e) {
        /* console.log(e)
        console.log(colorInput.value) */
        huaban.color = colorInput.value;
    }

    //找到下载按钮
    var downloadBtn = document.querySelector(".download")
    downloadBtn.onclick = function () {
        var url = canvas.toDataURL()
        /*lcAlert({
            title: "请点击图片另存！",
            content: "<img style='width:auto;height:230px;' src='" + url + "'/>"
        })*/

        var aDom = document.querySelector(".download2 a")
        aDom.setAttribute("href", url);
        //自动触发点击事件
        aDom.click()
    }


    //监听鼠标按下事件
    canvas.onmousedown = function (e) {
        huaban.isDraw = true;
        if (huaban.type == "rect") {
            var x = e.pageX - canvas.offsetLeft;
            var y = e.pageY - canvas.offsetTop;
            huaban.beginX = x;
            huaban.beginY = y;
        }

        if (huaban.type == "huabi") {
            var x = e.pageX - canvas.offsetLeft;
            var y = e.pageY - canvas.offsetTop;
            huaban.beginX = x;
            huaban.beginY = y;
            ctx.beginPath()
            ctx.moveTo(x, y)
        }
    }

    //监听鼠标抬起事件
    canvas.onmouseup = function () {
        huaban.imageData = ctx.getImageData(0, 0, canvas.offsetWidth, canvas.offsetHeight)
        huaban.isDraw = false;

        if (huaban.type == "huabi") {
            ctx.closePath()
        }

    }


    canvas.onmousemove = function (e) {
        if (huaban.isDraw) {
            var strFn = huaban.type + 'Fn'
            /* console.log(huaban) */
            huaban[strFn](e)

        }
    }

</script>
</body>
</html>
```

:::

## 7. 图片压缩

```html
<!DOCTYPE html>
<html>
  <head>
  </head>
  <body>
    <input type="file" id="upload">
    <script>
      const ACCEPT = ['image/jpg', 'image/png', 'image/jpeg']; // 限定图片文件类型
      const MAXSIZE = 1024 * 1024 * 3; // 限定图片最大容量
      const MAXSIZE_STR = '3MB';
      function convertImageToBase64(file, cb) {
        let reader = new FileReader();
        reader.addEventListener('load', function(e) {
          const base64Image = e.target.result; // 获取文件内容，等同于 reader.result
          cb(base64Image);
          reader = null;
        });
        reader.readAsDataURL(file); // 读取 file 对象中的内容
      }
      function compress(base64Image, cb) {
        let maxW = 1024;
        let maxH = 1024;

        const image = new Image();
        image.addEventListener('load', function() {
          let ratio; // 压缩比
          let needCompress = false; // 是否需要压缩
          if (maxW < image.naturalWidth) {
            needCompress = true;
            ratio = image.naturalWidth / maxW;
            maxH = image.naturalHeight / ratio;
          }
          if (maxH < image.naturalHeight) {
            needCompress = true;
            ratio = image.naturalHeight / maxH;
            maxW = image.naturalWidth / ratio;
          }
          if (!needCompress) {
            maxW = image.naturalWidth;
            maxH = image.naturalHeight;
          }
          const canvas = document.createElement('canvas');
          canvas.setAttribute('id', '__compress__');
          canvas.width = maxW;
          canvas.height = maxH;
          canvas.style.visibility = 'hidden';
          document.body.append(canvas);

          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, maxW, maxH);
          ctx.drawImage(image, 0, 0, maxW, maxH); // 渲染图片
          const compressImage = canvas.toDataURL('image/jpeg', 0.9); // 压缩图片
          cb(compressImage);
          const _image = new Image();
          _image.src = compressImage;
          document.body.appendChild(_image);
          canvas.remove(); // 移除 canvas
        });
        image.src = base64Image; // 将图片设置到 image 的 src 属性中
        document.body.appendChild(image);
      }
      function uploadImage(compressImage) {
        console.log('upload image to server...', compressImage);
      }

      const upload = document.getElementById('upload');
      upload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        console.log(file);
        if (!file) {
          return;
        }
        const { type: fileType, size: fileSize } = file;
        // 图片类型检查
        if (!ACCEPT.includes(fileType)) {
          alert('不支持上传该格式文件！');
          upload.value = '';
          return;
        }
        // 图片大小检查
        if (fileSize > MAXSIZE) {
          alert('文件超出' + MAXSIZE_STR + '！');
          upload.value = '';
          return;
        }
        // 压缩文件
        convertImageToBase64(file, (base64Image) => compress(base64Image, uploadImage));
      });
    </script>
  </body>
</html>
```