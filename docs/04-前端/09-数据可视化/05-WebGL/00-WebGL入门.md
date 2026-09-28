---
title: "webgl 入门"
category: 前端
---

# webgl 入门

webgl 是在网页上绘制和渲染三维图形的技术，可以让用户与其进行交互

学过的 div+css、canvas 2d 都是专注于二维图形的，它们虽然也能模拟一部分三维效果，但它们和 webgl 比起来，那就是天壤之别

## webgl 行业背景

随着 5G 时代的到来，3D 可视化需求大量涌现。3D 游戏，酷炫的活动宣传页，三维数字城市，VR全景展示、3D 产品展示等领域中，很多项目都是用 WebGL 实现的，也只能用 WebGL 来做，也就是说，WebGL 的时代就在眼前了

通过一些实际案例，我们可以知道WebGL 能做什么：

- 3D数据可视化：https://cybermap.kaspersky.com/
- 家居卖场：https://showroom.littleworkshop.fr/
- 天猫宣传页：https://shrek.imdevsh.com/show/tmall/
- 汽车模型：https://ezshine.gitee.io/www/showcase/smart3dh5/loader.html
- 趣空间：http://www.3dnest.cn/page/case/case0.html

webgl 的行业背景决定了其在市场中具有广大的需求量。

webgl 发展潜力大，不像曾经的 flash，学完了，还会面临被淘汰的风险。

webgl 的职场竞争力要比 vue、react 等主流框架小。

webgl 薪资可观，一般只要你理解 webgl 原理，可以熟练使用 three.js，会用 react，月薪可达 25k+

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310202222539.png)

综上所述，对公司而言，webgl 可以解决他们在三维模型的显示和交互上的问题；对开发者而言，webgl 可以让我们实现更多、更炫酷的效果，让我们即使工作，也可以乐在其中，并且还会有一份不错的薪资

## webgl 最快入门

### 刷底色

`clearColor(r,g,b,a)` 中的参数是红、绿、蓝、透明度，其定义域是 [0,1]

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>00-刷底色</title>
    <style>
      body {
        margin: 0;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <canvas id="canvas"></canvas>
    <script>
      const canvas = document.querySelector("#canvas")
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      // 使用 canvas 获取 webgl 绘图上下文
      const gl = canvas.getContext("webgl")

      // 指定将要用来清空绘图区的颜色
      gl.clearColor(1, 1, 0, 1)

      // 使用之前指定的颜色，清空绘图区
      gl.clear(gl.COLOR_BUFFER_BIT)
    </script>
  </body>
</html>
```

### 灵活操作 webgl 中的颜色

css 中有一个“rgba(255,255,255,1)” 颜色，其中 r、g、b的定义域是[0,255]，这里要和 webgl 里的颜色区分一下。可以将 css 颜色解析为 webgl 颜色的原理

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>01-刷底色</title>
    <style>
      body {
        margin: 0;
        overflow: hidden;
      }

      #canvas {
        background-color: antiquewhite;
      }
    </style>
  </head>
  <body>
    <canvas id="canvas"></canvas>
    <script>
      const canvas = document.querySelector("#canvas")
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      const gl = canvas.getContext("webgl")
      gl.clearColor(1, 1, 0, 1) // 声明颜色 rgba
      gl.clear(gl.COLOR_BUFFER_BIT) // 刷底色 gl.COLOR_BUFFER_BIT 颜色的缓冲区

      const rgbaCss = "rgba(255,100,0,1)" // css颜色
      const reg = RegExp(/\((.*)\)/) // 正则
      const rgbaStr = reg.exec(rgbaCss)[1]  // 捕捉数据
      console.log(rgbaStr) // 255,100,0,1
      // 加工数据 字符串变为数组-数字
      const rgba = rgbaStr.split(",").map((n) => parseInt(n))
      console.log(rgba) // [255, 100, 0, 1]

      const r = rgba[0] / 255
      const g = rgba[1] / 255
      const b = rgba[2] / 255
      const a = rgba[3]
      console.log(g) // 0.39215686274509803
      // 声明颜色 rgba
      gl.clearColor(r, g, b, a)
      // 刷底色
      gl.clear(gl.COLOR_BUFFER_BIT)
    </script>
  </body>
</html>
```

在 three.js 里有一个非常完美的颜色对象 Color，我们通过这个对象可以轻松的控制颜色

### 案例-多姿多彩的画布

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>02-多姿多彩的画布</title>
    <style>
      body {
        margin: 0;
        overflow: hidden;
      }

      #canvas {
        background-color: antiquewhite;
      }
    </style>
  </head>
  <body>
    <canvas id="canvas"></canvas>
    <script type="module">
      import { Color } from "https://unpkg.com/three/build/three.module.js"

      const canvas = document.querySelector("#canvas")
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      const gl = canvas.getContext("webgl")
      gl.clearColor(1, 1, 0, 1) // 声明颜色 rgba
      gl.clear(gl.COLOR_BUFFER_BIT) //刷底色

      // 建立 Color 对象
      const color = new Color("rgba(255,0,0,1)")
      gl.clearColor(color.r, color.g, color.b, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)

        !(function ani() {
          // 颜色、饱和度、亮度
          color.offsetHSL(0.005, 0, 0)
          gl.clearColor(color.r, color.g, color.b, 1)
          gl.clear(gl.COLOR_BUFFER_BIT)
          requestAnimationFrame(ani)
        })()
    </script>
  </body>
</html>
```

## webgl 坐标系

webgl 画布的建立和获取，和 canvas 2d是一样的。

一旦我们使用 canvas.getContext() 方法获取了webgl 类型的上下文对象，那这张画布就不再是以前的 canvas 2d 画布，它的坐标系也变了。

canvas 2d 画布和webgl 画布使用的坐标系都是二维直角坐标系，只不过它们坐标原点、y 轴的坐标方向，坐标基底都不一样了。

### canvas 2d画布的坐标系

canvas 2d 坐标系的原点在左上角。y 轴方向是朝下的

canvas 2d 坐标系的坐标基底有两个分量，分别是一个像素的宽和一个像素的高，即 1 个单位的宽便是 1 个像素的宽，1 个单位的高便是一个像素的高

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310202222653.png)

### webgl的坐标系

webgl 坐标系的坐标原点在画布中心，y 轴方向是朝上的

webgl 坐标基底中的两个分量分别是半个 canvas 的宽和半个 canvas 的高，即 1 个单位的宽便是半个 canvas 的宽，1 个单位的高便是半个 canvas 的高

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310202222710.png)

## webgl 最简单的图形-画一个点

点是最简单的形状，是几何图形最基本的组成部分。接下来咱们就说一下在webgl 画布上如何画一个点。

### canvas 2d和webgl绘图的差异

在 webgl 里绘图，或许你会觉得也可以像 canvas 2d 那样，就像下面这样写：

```javascript
//canvas画布
const canvas=document.getElementById('canvas');
//三维画笔
const ctx=canvas.getContext('webgl');
//设置画笔的颜色
ctx.fillStyle='red';
//用画笔画一个立方体
ctx.fillBox(20,20,300,200);
```

但实际上，webgl 的绘图逻辑和 canvas 2d 的绘图逻辑还有一个本质的差别

浏览器有三大线程： js 引擎线程、GUI 渲染线程、浏览器事件触发线程。



其中GUI 渲染线程就是用于渲图的，在这个渲染线程里，有负责不同渲染工作的工人。比如有负责渲染HTML+css的工人，有负责渲染二维图形的工人，有负责渲染三维图形的工人。

- 渲染二维图形的工人说的是 js 语言
- 渲染三维图形的工人说的是 GLSL ES 语言

而我们在做web项目时，业务逻辑、交互操作都是用js 写的。

- 用 js 绘制 canvas 2d 图形的时候，渲染二维图形的工人认识 js 语言，所以它可以正常渲图。
- 用 js 绘制 webgl 图形时，渲染三维图形的工人就不认识这个 js 语言了，因为它只认识 GLSL ES 语言。因此，这个时候我们就需要找人翻译翻译。
- 这个做翻译的人是谁呢，它就是我们之前提到过的手绘板，它在webgl 里叫“程序对象”。

接下来咱们从手绘板的绘图步骤中捋一下webgl 的绘图思路。

### webgl 的绘图思路

1. 找一台电脑 - 浏览器里内置的 webgl 渲染引擎，负责渲染 webgl 图形，只认 GLSL ES 语言
2. 找一块手绘板 - 程序对象，承载 GLSL ES 语言，翻译 GLSL ES 语言和 js 语言，使两者可以相互通信
3. 找一支触控笔 - 通过 canvas 获取的 webgl 类型的上下文对象，可以向手绘板传递绘图命令，并接收手绘板的状态信息
4. 开始画画 - 通过 webgl 类型的上下文对象，用js 画画。

在上面的思路中，大家对其中的一些名词可能还没有太深的概念，比如程序对象。接下来咱们就详细说一下webgl 实际的绘图步骤

### webgl 的绘图步骤

```javascript
function initShaders(gl, vsSource, fsSource) {
  //创建程序对象
  const program = gl.createProgram();
  //建立着色对象
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  //把顶点着色对象装进程序对象中
  gl.attachShader(program, vertexShader);
  //把片元着色对象装进程序对象中
  gl.attachShader(program, fragmentShader);
  //连接webgl上下文对象和程序对象
  gl.linkProgram(program);
  //启动程序对象
  gl.useProgram(program);
  //将程序对象挂到上下文对象上
  gl.program = program;
  return true;
}

function loadShader(gl, type, source) {
  //根据着色类型，建立着色器对象
  const shader = gl.createShader(type);
  //将着色器源文件传入着色器对象中
  gl.shaderSource(shader, source);
  //编译着色器对象
  gl.compileShader(shader);
  //返回着色器对象
  return shader;
}

export {initShaders};
```



```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>03-一个点</title>
    <style>
      body {
        margin: 0;
        overflow: hidden;
      }

      #canvas {
        background-color: antiquewhite;
      }
    </style>
  </head>
  <body>
    <canvas id="canvas"></canvas>
    <!-- 顶点着色器 -->
    <script id="vertexShader" type="x-shader/x-vertex">
      void main(){
        // 点位 x、y、z
        gl_Position=vec4(0,0,0,1);
        // 尺寸,必须是浮点数
        gl_PointSize=100.0;
      }
    </script>
    <!-- 片元着色器 -->
    <script id="fragmentShader" type="x-shader/x-fragment">
      void main(){
        gl_FragColor=vec4(1,1,0,1);
      }
    </script>
    <script type="module">
      import { initShaders } from "../jsm/Utils.js"

      const canvas = document.querySelector("#canvas")
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      // 获取着色器文本
      const vsSource = document.querySelector("#vertexShader").innerText
      const fsSource = document.querySelector("#fragmentShader").innerText

      // 三维画笔
      const gl = canvas.getContext("webgl")

      // 初始化着色器
      // 功能：解析着色器文本，整合到程序对象里，关联 webgl 上下文对象，实现两种语言的相互通信
      initShaders(gl, vsSource, fsSource)

      // 声明颜色 rgba
      gl.clearColor(0, 0, 0, 1)
      // 刷底色
      gl.clear(gl.COLOR_BUFFER_BIT)

      // 绘制顶点 gl.drawArrays(mode, first, count)
      gl.drawArrays(gl.POINTS, 0, 1)
    </script>
  </body>
</html>
```

在 script 里用 GLSL ES 语言写着色器

## 着色器

webgl 绘图需要两种着色器：

- 顶点着色器（Vertex shader）：描述顶点的特征，如位置、颜色等
- 片元着色器（Fragment shader）：进行逐片元处理，如光照

给大家翻译翻译：

补间动画大家知道不？顶点着色器里的顶点就是补间动画里的关键帧，片元着色器里的片元就是关键帧之间以某种算法算出的插值。webgl 里的片元是像素的意思

再给大家举一个更简单、更贴切的例子：

两点决定一条直线大家知道不？顶点着色器里的顶点就是决定这一条直线的两个点，片元着色器里的片元就是把直线画到画布上后，这两个点之间构成直线的每个像素

### 着色器语言

webgl 的着色器语言是 GLSL ES 语言

- 顶点着色程序，要写在`type="x-shader/x-vertex"` 的 script 中

```html
<script id="vertexShader" type="x-shader/x-vertex">
    void main() {
        gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
        gl_PointSize = 100.0;
    }
</script>
```

- 片元着色程序，要写在 `type="x-shader/x-fragment"` 的 script 中

```html
<script id="fragmentShader" type="x-shader/x-fragment">
    void main() {
        gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
    }
</script>
```

- 在顶点着色器中，gl_Position 是顶点的位置，gl_PointSize 是顶点的尺寸，这种名称都是固定的，不能写成别的
- 在片元着色器中，gl_FragColor 是片元的颜色。
- vec4()  是一个4维矢量对象。
- 将 vec4() 赋值给顶点点位 gl_Position 的时候，其中的前三个参数是 x、y、z，第4个参数默认1.0，其含义我们后面会详解；
- 将 vec4() 赋值给片元颜色 gl_FragColor 的时候，其中的参数是 r,g,b,a。

### 着色器初始化

初始化着色器的步骤：

1.  建立程序对象，目前这只是一个手绘板的外壳。 

```javascript
const shaderProgram = gl.createProgram();
```

1.  建立顶点着色器对象和片元着色器对象，这是手绘板里用于接收触控笔信号的零部件，二者可以分工合作，把触控笔的压感（js信号）解析为计算机语言(GLSL ES)，然后让计算机(浏览器的webgl 渲染引擎)识别显示。 

```javascript
const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
```

1.  将顶点着色器对象和片元着色器对象装进程序对象中，这就完成的手绘板的拼装。 

```javascript
gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
```

1.  连接 webgl 上下文对象和程序对象，就像连接触控笔和手绘板一样（触控笔里有传感器，可以向手绘板发送信号）

```javascript
gl.linkProgram(shaderProgram);
```

1.  启动程序对象，就像按下了手绘板的启动按钮，使其开始工作。 

```javascript
gl.useProgram(program);
```

 上面第二步中的建立着色对象方法 loadShader()，是一个自定义的方法，其参数是(webgl上下文对象，着色器类型，着色器源文件)，gl.VERTEX_SHADER 是顶点着色器类型，gl.FRAGMENT_SHADER是片元着色器类型。

```javascript
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}
```

-  gl.createShader(type) ：根据着色器类型建立着色器对象的方法
-  gl.shaderSource(shader, source)：将着色器源文件传入着色器对象中，这里的着色器源文件就是我们之前在script 里用 GLSL ES 写的着色程序
-  gl.compileShader(shader)：编译着色器对象



在以后的学习里，initShaders 会经常用到，所以我们可以将其模块化

```javascript
function initShaders(gl,vsSource,fsSource){
  //创建程序对象
  const program = gl.createProgram();
  //建立着色对象
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  //把顶点着色对象装进程序对象中
  gl.attachShader(program, vertexShader);
  //把片元着色对象装进程序对象中
  gl.attachShader(program, fragmentShader);
  //连接webgl上下文对象和程序对象
  gl.linkProgram(program);
  //启动程序对象
  gl.useProgram(program);
  //将程序对象挂到上下文对象上
  gl.program = program;
  return true;
}

function loadShader(gl, type, source) {
  //根据着色类型，建立着色器对象
  const shader = gl.createShader(type);
  //将着色器源文件传入着色器对象中
  gl.shaderSource(shader, source);
  //编译着色器对象
  gl.compileShader(shader);
  //返回着色器对象
  return shader;
}
export {initShaders}
```

后面在需要的时候，import 引入即可。

```javascript
import {initShaders} from '../jsm/Utils.js';
```

综上所述，webgl 绘图好麻烦啊！麻烦不是不学的理由，因为后面还有 three.js 为你排忧解难

three.js 若是只想画个旋转的立方体还好，若是要深入学习，实现复杂的模型交互逻辑，就必须要有 webgl 基础了