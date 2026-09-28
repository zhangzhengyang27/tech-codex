---
title: 动画-JavaScript
description: "对于需要复杂逻辑、物理效果或与用户交互的动画，JavaScript 是最佳选择。可以使用 requestAnimationFrame 来创建高性能的逐帧动画，也可以使用 GSAP、Anime.js 等成熟动画库驱动 SVG 动画。"
keywords: [动画-JavaScript, requestAnimationFrame, GSAP, Anime.js]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---


# JavaScript 动画

对于需要复杂逻辑、物理效果或与用户交互的动画，JavaScript 是最佳选择。可以使用 `requestAnimationFrame` 来创建高性能的逐帧动画，或者使用成熟的动画库，如：

- **GSAP (GreenSock Animation Platform)**：功能强大、性能卓越的专业动画库
- **Snap.svg**：专注于处理 SVG 的 JavaScript 库
- **Anime.js**：轻量级且灵活的动画库

## 示例：使用 GSAP 控制动画

```html
<svg width="200" height="100">
  <circle id="myCircle" cx="50" cy="50" r="20" fill="purple" />
</svg>

<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.9.1/gsap.min.js"></script>
<script>
  gsap.to("#myCircle", {
    duration: 2,
    x: 100, // 移动
    scale: 1.5, // 缩放
    rotation: 360, // 旋转
    ease: "bounce.out", // 缓动函数
    repeat: -1, // 无限重复
    yoyo: true // 往返运动
  })
</script>
```

> 如果项目对动画性能和功能要求极高，需要复杂的物理效果或插件生态，GSAP 是行业标杆。如果项目需要一个轻量、易用且功能足够的动画库，特别是涉及 SVG 动画时，Anime.js 是一个绝佳的选择

## Anime.js

[Anime.js](https://animejs.com/) 是轻量级、功能强大的 JavaScript 动画库。它可以处理 CSS 属性、SVG、DOM 属性和 JavaScript 对象，让复杂的动画实现变得简单高效

> 本文示例均基于 Anime.js v3（CDN 固定 3.2.1）。v4 起改为纯 ESM 导出（`import { animate, createTimeline } from "animejs"`），API 命名有较大调整，使用时请注意所装版本。

相较于其他动画库（如 GSAP）或纯 CSS 动画，Anime.js 在功能、体积和易用性上取得了很好的平衡：

- **体积小巧**: Gzip 压缩后仅有约 6KB，对页面加载性能影响极小。
- **功能全面**: 支持链式调用、时间轴、动画控制、交错动画等高级功能。
- **语法简洁**: API 设计直观，学习成本低，可以快速上手。
- **对 SVG 支持友好**: 内置了对 SVG 形变（Morphing）、路径动画（Line Drawing）等复杂效果的强大支持，是 SVG 动画开发的利器

### 通过 npm 安装

```bash
npm install animejs
```

然后引入:

```javascript
import anime from "animejs"
```

或直接在 HTML 文件中通过 `<script>` 标签引入最新版本：

```html
<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>
```

简单示例：方块平移动画开始

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Anime.js - 第一个动画</title>
    <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 20px;
      }

      .container {
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        text-align: center;
      }

      h1 {
        color: #333;
        margin-bottom: 30px;
        font-size: 28px;
      }

      .demo-area {
        width: 400px;
        height: 200px;
        background: #f5f5f5;
        border-radius: 8px;
        position: relative;
        margin: 30px auto;
        overflow: hidden;
      }

      .box {
        width: 100px;
        height: 100px;
        background-color: #4caf50;
        border-radius: 8px;
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>第一个动画 - 方块平移动画</h1>
      <div class="demo-area">
        <div class="box"></div>
      </div>
    </div>

    <script>
      // 第一个动画：方块平移动画
      anime({
        targets: ".box", // 目标元素
        translateX: 250, // 动画属性：沿 X 轴移动 250px
        duration: 2000, // 持续时间：2000ms
        easing: "easeInOutSine", // 缓动函数
        loop: true, // 循环播放
        direction: "alternate" // 循环方式：往返
      })
    </script>
  </body>
</html>
```

### 核心概念

Anime.js 的核心是 `anime()` 函数，它接受一个对象作为参数，用于描述动画的所有细节。该函数会返回一个动画实例，你可以用它来控制动画（播放、暂停等）

`targets` 参数指定动画作用于哪些元素。它的值可以是：

- **CSS 选择器**: `'div'`, `'.box'`, `'#my-element'`
- **DOM 节点**: `document.querySelector('.box')`
- **NodeList**: `document.querySelectorAll('.box')`
- **JavaScript 对象**: `{ score: 0 }`
- **数组**: `['.box1', document.querySelector('.box2')]`

#### 属性 (Properties)

在 `targets` 之外的参数，大多用于定义要改变的属性

- **CSS 属性**:
  - `opacity`, `backgroundColor`, `fontSize` 等
  - **Transform 属性**: `translateX`、`rotate`、`scale`。推荐使用 `transform` 来实现位移、旋转和缩放，以获得更好的性能
- **SVG 属性**: `points`, `d` (用于路径), `fill` 等
- **JavaScript 对象属性**: 如果 `targets` 是一个 JS 对象，你可以对它的任意属性做动画

#### 动画参数

控制动画行为的特殊参数：

| 参数        | 说明                          | 默认值                    | 示例                                     |
| ----------- | ----------------------------- | ------------------------- | ---------------------------------------- |
| `duration`  | 动画持续时间 (ms)             | `1000`                    | `2000`                                   |
| `delay`     | 动画延迟执行时间 (ms)         | `0`                       | `500`                                    |
| `easing`    | 缓动函数，控制动画的速度曲线  | `'easeOutElastic(1, .8)'` | `'easeInOutSine'`, `'linear'`            |
| `loop`      | 循环次数。`true` 表示无限循环 | `false`                   | `3`, `true`                              |
| `direction` | 循环方向                      | `'normal'`                | `'alternate'` (往返), `'reverse'` (反向) |
| `autoplay`  | 是否自动播放                  | `true`                    | `false`                                  |
| `round`     | 将动画过程中的数值四舍五入    | `false`                   | `true`                                   |

#### 值类型

属性的值可以有多种形式：

- **具体值 (Unitless)**: `translateX: 250` (默认单位是 `px`)
- **带单位值 (Specific Unit)**: `translateX: '15rem'`
- **函数值 (Function-based)**: 动态计算每个目标元素的值

  ```javascript
  translateX: (el, i) => 50 + 100 * i
  ```

- **关键帧 (Keyframes)**: 定义动画的多个阶段。

  ```javascript
  translateX: [
    { value: 100, duration: 500 },
    { value: 200, duration: 800, delay: 200 },
    { value: 0, duration: 600, delay: 300 }
  ]
  ```

- **颜色值**: 支持 `Hex`, `RGB`, `HSL` 格式，并可以在它们之间平滑过渡。

  ```javascript
  backgroundColor: "#FFF" // 也可以是 ['#FFF', '#000']
  ```

### 高级技巧

#### 多元素动画与交错效果

当 `targets` 包含多个元素时，Anime.js 可以轻松创建复杂的交错动画（Staggering）

```javascript
anime({
  targets: ".dot",
  translateX: 270,
  delay: anime.stagger(100) // 每个元素依次延迟 100ms
})
```

`anime.stagger()` 是一个强大的工具，可以实现网格、从中心开始等多种交错效果

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Anime.js - 多元素动画与交错效果</title>
    <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 20px;
      }

      .container {
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        text-align: center;
        max-width: 800px;
      }

      h1 {
        color: #333;
        margin-bottom: 30px;
        font-size: 28px;
      }

      .demo-area {
        width: 100%;
        height: 300px;
        background: #f5f5f5;
        border-radius: 8px;
        position: relative;
        margin: 30px auto;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding: 20px;
        gap: 20px;
      }

      .dot {
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      button {
        margin-top: 20px;
        padding: 12px 24px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        transition: background 0.3s;
      }

      button:hover {
        background: #5568d3;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>多元素动画与交错效果</h1>
      <div class="demo-area">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
      <button onclick="restartAnimation()">重新播放</button>
    </div>

    <script>
      let animation

      function initAnimation() {
        animation = anime({
          targets: ".dot",
          translateX: 270,
          delay: anime.stagger(100), // 每个元素依次延迟 100ms
          easing: "easeInOutSine",
          duration: 1000,
          loop: true,
          direction: "alternate"
        })
      }

      function restartAnimation() {
        if (animation) {
          animation.restart()
        }
      }

      // 初始化动画
      initAnimation()
    </script>
  </body>
</html>
```

#### 动画控制

`anime()` 函数返回的实例包含多个控制方法：

- `myAnimation.play()`: 播放动画
- `myAnimation.pause()`: 暂停动画
- `myAnimation.restart()`: 重新播放动画
- `myAnimation.reverse()`: 反转动画播放方向
- `myAnimation.seek(time)`: 跳转到指定时间点 (ms)

##### 示例

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Anime.js - 动画控制</title>
    <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 20px;
      }

      .container {
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        text-align: center;
      }

      h1 {
        color: #333;
        margin-bottom: 30px;
        font-size: 28px;
      }

      .demo-area {
        width: 400px;
        height: 200px;
        background: #f5f5f5;
        border-radius: 8px;
        position: relative;
        margin: 30px auto;
        overflow: hidden;
      }

      .box {
        width: 100px;
        height: 100px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 8px;
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .controls {
        display: flex;
        gap: 15px;
        justify-content: center;
        margin-top: 30px;
        flex-wrap: wrap;
      }

      button {
        padding: 12px 24px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.3s;
        font-weight: 500;
      }

      .play {
        background: #4caf50;
        color: white;
      }

      .play:hover {
        background: #45a049;
      }

      .pause {
        background: #ff9800;
        color: white;
      }

      .pause:hover {
        background: #e68900;
      }

      .restart {
        background: #2196f3;
        color: white;
      }

      .restart:hover {
        background: #0b7dda;
      }

      .reverse {
        background: #9c27b0;
        color: white;
      }

      .reverse:hover {
        background: #7b1fa2;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>动画控制</h1>
      <div class="demo-area">
        <div class="box"></div>
      </div>
      <div class="controls">
        <button class="play" onclick="animation.play()">播放</button>
        <button class="pause" onclick="animation.pause()">暂停</button>
        <button class="restart" onclick="animation.restart()">重新播放</button>
        <button class="reverse" onclick="animation.reverse()">反转</button>
      </div>
    </div>

    <script>
      // 创建动画实例，但不自动播放
      const animation = anime({
        targets: ".box",
        translateX: 250,
        duration: 2000,
        easing: "easeInOutSine",
        autoplay: false // 不自动播放，等待用户操作
      })
    </script>
  </body>
</html>
```

#### 时间轴 (Timeline)

时间轴用于编排多个动画的播放顺序。

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Anime.js - 时间轴</title>
    <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 20px;
      }

      .container {
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        text-align: center;
        width: 900px;
      }

      h1 {
        color: #333;
        margin-bottom: 30px;
        font-size: 28px;
      }

      .demo-area {
        width: 100%;
        height: 400px;
        background: #f5f5f5;
        border-radius: 8px;
        position: relative;
        margin: 30px auto;
        overflow: hidden;
      }

      .box {
        width: 80px;
        height: 80px;
        border-radius: 8px;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        left: 50px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .box1 {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      .box2 {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }

      .box3 {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }

      button {
        margin-top: 20px;
        padding: 12px 24px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        transition: background 0.3s;
      }

      button:hover {
        background: #5568d3;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>时间轴 (Timeline)</h1>
      <div class="demo-area">
        <div class="box box1"></div>
        <div class="box box2"></div>
        <div class="box box3"></div>
      </div>
      <button onclick="restartTimeline()">重新播放</button>
    </div>

    <script>
      let timeline

      function initTimeline() {
        // 创建时间轴
        timeline = anime.timeline({
          easing: "easeOutExpo",
          duration: 750,
          loop: true
        })

        // 添加第一个动画
        timeline.add({
          targets: ".box1",
          translateX: 250
        })

        // 添加第二个动画，提前 600ms 开始（与前一个动画重叠）
        timeline.add({
          targets: ".box2",
          translateX: 250,
          offset: "-=600" // 相对前一个动画的偏移量，-600ms 表示提前 600ms 开始
        })

        // 添加第三个动画，提前 700ms 开始
        timeline.add({
          targets: ".box3",
          translateX: 250,
          offset: "-=700"
        })
      }

      function restartTimeline() {
        if (timeline) {
          timeline.restart()
        }
      }

      // 初始化时间轴
      initTimeline()
    </script>
  </body>
</html>
```

`.add()` 方法会将动画按顺序添加到时间轴中。使用 `offset` 参数可以精确控制动画之间的时间关系

### 实践应用

#### 性能优化建议

- **优先使用 `transform` 和 `opacity`**: 动画 `transform` (位移、旋转、缩放) 和 `opacity` (透明度) 属性可以利用 GPU 加速，性能最好。应避免对 `width`、`height`、 `margin` 等触发布局重排（Layout）的属性进行动画。
- **使用 `will-change`**: 对于即将发生动画的元素，可以提前告知浏览器，让其进行优化

  ```css
  .box {
    will-change: transform, opacity;
  }
  ```

- **合理使用 `round`**: 如果动画不需要高精度浮点数，设置 `round: true` 可以减少计算开销

#### 调试技巧

- **使用 `seek()`**: 通过 `seek()` 方法和滑块（`<input type="range">`）结合，可以手动控制动画进度，方便地查看任意时间点的状态
- **回调函数**: Anime.js 提供了 `begin`, `run`, `update`, `complete` 等回调函数，可以在动画的不同生命周期打印日志或执行代码

  ```javascript
  anime({
    targets: ".box",
    translateX: 250,
    update: function (anim) {
      console.log("Progress: " + anim.progress + "%")
    }
  })
  ```

### 案例

#### SVG 路径描边

Anime.js 的路径动画功能非常出色，可以轻松实现“描边”效果。`anime.setDashoffset` 是内置的辅助函数，它会自动获取路径的长度并设置初始的 `stroke-dashoffset`，从而实现从无到有的描边动画

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Anime.js - SVG 路径动画</title>
    <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 20px;
      }

      .container {
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        text-align: center;
      }

      h1 {
        color: #333;
        margin-bottom: 30px;
        font-size: 28px;
      }

      .demo-area {
        width: 300px;
        height: 300px;
        background: #f5f5f5;
        border-radius: 8px;
        margin: 30px auto;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      svg {
        width: 100%;
        height: 100%;
      }

      .my-path {
        stroke: #667eea;
        stroke-width: 3;
        fill: none;
      }

      button {
        margin-top: 20px;
        padding: 12px 24px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        transition: background 0.3s;
      }

      button:hover {
        background: #5568d3;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>SVG 路径动画 - 描边效果</h1>
      <div class="demo-area">
        <svg width="200" height="200" viewBox="0 0 200 200">
          <path
            class="my-path"
            d="M 10 10 H 190 V 190 H 10 Z"
            stroke="#667eea"
            stroke-width="3"
            fill="none" />
        </svg>
      </div>
      <button onclick="restartAnimation()">重新播放</button>
    </div>

    <script>
      let pathAnimation

      function initAnimation() {
        // SVG 路径描边动画
        pathAnimation = anime({
          targets: ".my-path",
          strokeDashoffset: [anime.setDashoffset, 0], // anime.setDashoffset 会自动获取路径长度并设置初始值
          easing: "easeInOutSine",
          duration: 1500,
          loop: true,
          direction: "alternate" // 往返播放
        })
      }

      function restartAnimation() {
        if (pathAnimation) {
          pathAnimation.restart()
        }
      }

      // 初始化动画
      initAnimation()
    </script>
  </body>
</html>
```

#### 文字描边

实现一个经典的 SVG 文字“先描边、后填充”的动画效果。

1. **创建文字轮廓**: 使用矢量图形软件（如 Adobe Illustrator, Figma, Inkscape）输入文字，并将其转换为轮廓/路径。将文本从可编辑的字体格式转换为了由路径 (`<path>`) 节点定义的形状

    <img src="https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202512071308900.png" alt="文字轮廓路径示例" style="zoom:30%;" />

2. **导出并清理 SVG**: 将其导出为 SVG 文件，并清理代码。AI 等工具导出的 SVG 通常包含大量冗余信息（如编辑器元数据、空的 `<g>` 标签等）。一个干净的 SVG 结构更易于维护

    **清理前 (示例):**

    ```xml
    <?xml version="1.0" encoding="utf-8"?>
    <svg version="1.1" id="图层_1" ...>
      <g id="XMLID_2_">
        <path id="XMLID_3_" d="..."/>
        ...
      </g>
    </svg>
    ```

    **清理后 (推荐):**

    ```html
    <svg viewBox="0 0 300 200">
      <path class="letter" d="M82.4,127.1..." />
      <path class="letter" d="M98.9,110.6..." />
      <path class="letter" d="M183.1,75.6..." />
      <path class="letter" d="M196,127.1..." />
    </svg>
    ```

    **关键处理**:
    - 为每个 `<path>` 添加一个统一的 `class`（如 `letter`），方便 Anime.js 进行批量选择。
    - 暂时将 `fill` 和 `stroke` 属性移除或设为 `none`，以便在动画开始前隐藏图形。

示例：

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>
    <title>文字描边动画</title>
    <style>
      body {
        background-color: #000;
      }
      .line-draw {
        position: relative;
        width: 600px;
        height: 400px;
        text-align: center;
      }

      svg {
        width: 600px;
        height: 400px;
        padding: 10px;
      }

      button {
        width: 100px;
        margin-left: auto;
        margin-right: auto;
        margin-top: -30px;
        background: #007fff;
        color: white;
        padding: 10px;
        border-radius: 4px;
        font-family: "Lato";
        cursor: pointer;
        border: none;
        outline: none;
      }
    </style>
  </head>
  <body>
    <div class="line-draw">
      <svg x="0px" y="0px" viewBox="0 0 300 200">
        <path
          class="letter-i"
          d="M82.4,127.1V75.6h6.8v51.5H82.4z"
          stroke="none"
          fill="none" />
        <path
          class="letter-s"
          d="M98.9,110.6l6.4-0.6c0.3,2.6,1,4.7,2.1,6.3s2.8,3,5.2,4s5,1.5,7.9,1.5c2.6,0,4.9-0.4,6.9-1.2
  s3.5-1.8,4.4-3.2s1.5-2.8,1.5-4.4c0-1.6-0.5-3-1.4-4.2s-2.5-2.2-4.6-3c-1.4-0.5-4.4-1.4-9.2-2.5s-8.1-2.2-9.9-3.2
  c-2.5-1.3-4.3-2.9-5.5-4.8c-1.2-1.9-1.8-4-1.8-6.4c0-2.6,0.7-5,2.2-7.3c1.5-2.3,3.6-4,6.5-5.2c2.8-1.2,6-1.8,9.5-1.8
  c3.8,0,7.2,0.6,10.1,1.8s5.2,3,6.7,5.4s2.4,5.1,2.5,8.1l-6.5,0.5c-0.4-3.3-1.5-5.7-3.6-7.4c-2-1.7-5-2.5-9-2.5
  c-4.1,0-7.1,0.8-9,2.3s-2.8,3.3-2.8,5.5c0,1.9,0.7,3.4,2,4.6c1.3,1.2,4.7,2.4,10.3,3.7c5.5,1.3,9.3,2.4,11.4,3.3
  c3,1.4,5.2,3.1,6.6,5.3s2.1,4.6,2.1,7.3c0,2.7-0.8,5.3-2.4,7.8s-3.8,4.3-6.8,5.7s-6.3,2-9.9,2c-4.7,0-8.6-0.7-11.7-2
  c-3.2-1.4-5.6-3.4-7.4-6.1C99.9,117.1,99,114,98.9,110.6z"
          stroke="none"
          fill="none" />
        <path
          class="letter-u"
          d="M183.1,75.6h6.8v29.8c0,5.2-0.6,9.3-1.8,12.3s-3.3,5.5-6.3,7.4s-7.1,2.9-12,2.9c-4.8,0-8.8-0.8-11.8-2.5
  s-5.3-4.1-6.6-7.2s-2-7.5-2-12.9V75.6h6.8v29.7c0,4.5,0.4,7.8,1.2,9.9s2.3,3.8,4.3,4.9s4.5,1.7,7.4,1.7c5,0,8.6-1.1,10.7-3.4
  s3.2-6.6,3.2-13.1V75.6z"
          stroke="none"
          fill="none" />
        <path
          class="letter-x"
          d="M196,127.1l19.9-26.9l-17.6-24.7h8.1l9.4,13.2c1.9,2.7,3.3,4.9,4.1,6.3c1.1-1.9,2.5-3.8,4.1-5.9l10.4-13.7
  h7.4l-18.1,24.3l19.5,27.2h-8.4l-13-18.4c-0.7-1.1-1.5-2.2-2.2-3.4c-1.1,1.9-2,3.2-2.5,3.9l-12.9,18H196z"
          stroke="none"
          fill="none" />
      </svg>
      <button class="play-drawing">isux</button>
    </div>
  </body>
  <script>
    var letterTime = 2000

    var lineDrawing = anime({
      targets: "path",
      strokeDashoffset: [anime.setDashoffset, 0],
      easing: "easeInOutCubic",
      duration: letterTime,
      delay: function (el, i) {
        return letterTime * i
      },
      begin: function (anim) {
        var letters = document.querySelectorAll("path"),
          i

        for (i = 0; i < letters.length; ++i) {
          letters[i].setAttribute("stroke", "white")
          letters[i].setAttribute("fill", "none")
        }
      },
      autoplay: false
    })

    document.querySelector(".play-drawing").onclick = lineDrawing.restart
  </script>
</html>
```

#### 路径跟随动画

路径动画就是指运动对象沿着特定的路径在运动的动画效果

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>
    <title>路径跟随动画</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 20px;
      }

      .container {
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        text-align: center;
      }

      h1 {
        color: #333;
        margin-bottom: 30px;
        font-size: 28px;
      }

      /* 动画容器：相对定位，用于定位跟随路径移动的元素 */
      .motion-path {
        width: 600px;
        height: 400px;
        position: relative;
        background: #f5f5f5;
        border-radius: 8px;
        margin: 0 auto;
        overflow: hidden;
      }

      /* 跟随路径移动的小方块 */
      .square {
        width: 30px;
        height: 30px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 4px;
        position: absolute;
        top: 0;
        left: 0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        /* 设置变换原点为中心，便于旋转 */
        transform-origin: center center;
      }

      /* SVG 路径样式 */
      svg {
        position: absolute;
        top: 0;
        left: 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>路径跟随动画</h1>
      <div id="motionPath">
        <div class="motion-path">
          <!-- 跟随路径移动的元素 -->
          <div class="square"></div>
          <!-- SVG 路径：定义元素移动的轨迹 -->
          <svg width="600" height="400" viewBox="0 0 600 400">
            <path
              id="curpath"
              fill="none"
              stroke="#667eea"
              stroke-width="2"
              d="M11.6,246.9c0,0,143.1-274.1,267.8-137.9s124.7,136.2,124.7,136.2L11.6,246.9z" />
          </svg>
        </div>
      </div>
    </div>

    <script>
      /**
       * anime.path() 是 Anime.js 提供的路径动画辅助函数
       * 它可以解析 SVG 路径，并返回一个函数，用于获取路径上任意点的坐标和角度
       */
      var path = anime.path("#curpath")

      /**
       * 创建路径跟随动画
       *
       * translateX: path("x") - 元素在 X 轴上的位置跟随路径
       * translateY: path("y") - 元素在 Y 轴上的位置跟随路径
       * rotate: path("angle") - 元素根据路径方向自动旋转，实现更自然的跟随效果
       */
      anime({
        targets: ".square", // 目标元素
        translateX: path("x"), // X 坐标跟随路径
        translateY: path("y"), // Y 坐标跟随路径
        rotate: path("angle"), // 角度跟随路径方向（自动旋转）
        duration: 3000, // 动画持续时间：3 秒
        loop: true, // 无限循环
        easing: "linear" // 线性缓动，保持匀速运动
      })
    </script>
  </body>
</html>
```

#### 蒙版动画实战

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>
    <title>蒙版动画</title>
  </head>
  <body>
    <svg
      width="500"
      height="500"
      viewBox="0 0 600 600"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      xml:space="preserve"
      xmlns:serif="http://www.serif.com/">
      <defs>
        <clipPath id="Mask">
          <path
            id="XMLID_2_"
            class="st0"
            d="M64,168c0,0-30-123,80-108s91,54,182,64s137-83,163-57s119,203-37,214s-205,89-299,22
 S64,168,64,168z" />
        </clipPath>
      </defs>
      <image
        id="_Image1"
        width="900px"
        height="600px"
        xlink:href="../../../assets/images/pexels-photo-1133957.jpeg"
        clip-path="url(#Mask)" />
    </svg>
  </body>

  <script>
    var morph = anime({
      targets: "path",
      d: [
        {
          value:
            "M64,168c0,0-30-123,80-108s91,54,182,64s95,10,121,36s161,110,5,121s-239,115.9-333,48.9S64,168,64,168z"
        }
      ],
      easing: "easeInOutQuad",
      duration: 3000,
      direction: "alternate",
      // rotate: '1turn',
      loop: true
    })
  </script>
</html>
```

#### 点赞动画

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>
    <title>点赞动画</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        overflow: hidden;
      }

      .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 30px;
      }

      .wrap {
        position: relative;
        width: 200px;
        height: 200px;
        cursor: pointer;
        transition: transform 0.3s ease;
      }

      .wrap:hover {
        transform: scale(1.05);
      }

      .wrap:active {
        transform: scale(0.95);
      }

      .wrap svg {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        filter: drop-shadow(0 0 20px rgba(255, 20, 147, 0.5));
      }

      .heart-outer {
        transform-origin: 50% 50%;
        transform: scale(0);
        filter: drop-shadow(0 0 10px rgba(255, 20, 147, 0.8));
        will-change: transform;
      }

      .heart {
        position: absolute;
        left: 50%;
        top: 50%;
        margin-top: -25px;
        margin-left: -25px;
        width: 50px;
        height: 50px;
        background-image: url("../../../assets/images/heart.jpg");
        background-size: 100% 100%;
        background-position: center;
        border-radius: 50%;
        transform: scale(0);
        opacity: 0;
        filter: drop-shadow(0 0 15px rgba(255, 20, 147, 0.6));
        transition: filter 0.3s ease;
        will-change: transform, opacity;
      }

      .heart:hover {
        filter: drop-shadow(0 0 25px rgba(255, 20, 147, 1));
      }

      .particles {
        position: absolute;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .particle {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 6px;
        height: 6px;
        margin-left: -3px;
        margin-top: -3px;
        background: radial-gradient(circle, #ff1493 0%, #ff69b4 100%);
        border-radius: 50%;
        opacity: 0;
        pointer-events: none;
        will-change: transform, opacity;
      }

      .title {
        color: white;
        font-size: 24px;
        font-weight: 600;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        letter-spacing: 2px;
      }

      .ripple {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        border: 2px solid rgba(255, 20, 147, 0.6);
        transform: translate(-50%, -50%);
        opacity: 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1 class="title">💖 点赞动画</h1>
      <div class="wrap" id="heartWrap">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="100"
          height="100"
          viewBox="0 0 100 100">
          <defs>
            <radialGradient id="heartGradient">
              <stop offset="0%" stop-color="#ff1493" />
              <stop offset="100%" stop-color="#ff69b4" />
            </radialGradient>
            <mask id="heart-mask">
              <rect width="100%" height="100%" fill="white" />
              <circle
                class="heart-inner"
                cx="50"
                cy="50"
                r="0"
                fill="black"></circle>
            </mask>
          </defs>
          <circle
            class="heart-outer"
            cx="50"
            cy="50"
            r="50"
            fill="url(#heartGradient)"
            mask="url(#heart-mask)"></circle>
        </svg>
        <div class="heart"></div>
        <div class="particles" id="particles"></div>
      </div>
    </div>

    <script>
      // 创建粒子
      function createParticles(count = 12) {
        const particlesContainer = document.getElementById("particles")
        for (let i = 0; i < count; i++) {
          const particle = document.createElement("div")
          particle.className = "particle"
          particlesContainer.appendChild(particle)
        }
      }

      // 创建涟漪效果
      function createRipple() {
        const wrap = document.getElementById("heartWrap")
        const ripple = document.createElement("div")
        ripple.className = "ripple"
        wrap.appendChild(ripple)

        anime({
          targets: ripple,
          width: [0, 300],
          height: [0, 300],
          opacity: [0.8, 0],
          duration: 1000,
          easing: "easeOutQuad",
          complete: () => ripple.remove()
        })
      }

      // 初始化粒子
      createParticles()

      // 主时间轴动画
      var timeline = anime.timeline({
        autoplay: true,
        loop: true,
        loopComplete: function () {
          createRipple()
        }
      })

      timeline
        // 外层圆形展开
        .add({
          targets: ".heart-outer",
          scale: {
            value: [0, 1.2, 1],
            duration: 800,
            easing: "easeOutElastic(1, .6)"
          },
          offset: 0
        })
        // 内层圆形展开（蒙版效果）
        .add({
          targets: ".heart-inner",
          r: {
            value: [0, 50],
            duration: 600,
            easing: "easeOutQuad"
          },
          offset: 200
        })
        // 心形图片出现
        .add({
          targets: ".heart",
          scale: {
            value: [0, 1.3, 1],
            duration: 600,
            easing: "easeOutBack(1.7)"
          },
          opacity: {
            value: [0, 1],
            duration: 400,
            easing: "easeOutQuad"
          },
          offset: 400
        })
        // 粒子动画（在心形出现后立即开始）
        .add({
          targets: ".particle",
          translateX: function () {
            return anime.random(-100, 100)
          },
          translateY: function () {
            return anime.random(-100, 100)
          },
          scale: {
            value: [0, 1, 0],
            duration: 1000,
            easing: "easeOutQuad"
          },
          opacity: {
            value: [0, 1, 0],
            duration: 1000,
            easing: "easeOutQuad"
          },
          delay: anime.stagger(40),
          offset: 500
        })
        // 第一次心跳效果
        .add({
          targets: ".heart",
          scale: {
            value: [1, 1.15, 1],
            duration: 400,
            easing: "easeInOutQuad"
          },
          offset: 1200
        })
        // 第二次心跳效果
        .add({
          targets: ".heart",
          scale: {
            value: [1, 1.1, 1],
            duration: 300,
            easing: "easeInOutQuad"
          },
          offset: 1600
        })
        // 重置动画（确保所有动画完成后重置）
        .add({
          targets: [".heart-outer", ".heart-inner", ".heart"],
          scale: 0,
          opacity: 0,
          r: 0,
          duration: 200,
          easing: "easeInQuad",
          offset: 2000
        })
        .add({
          targets: ".particle",
          translateX: 0,
          translateY: 0,
          scale: 0,
          opacity: 0,
          duration: 0,
          offset: 2000
        })

      // 点击交互
      let isClicking = false
      document.getElementById("heartWrap").addEventListener("click", function () {
        if (isClicking) return
        isClicking = true

        // 创建点击涟漪
        createRipple()

        // 触发心跳动画
        anime({
          targets: ".heart",
          scale: {
            value: [1, 1.4, 1],
            duration: 600,
            easing: "easeOutElastic(1, .8)"
          }
        })

        // 重新触发粒子动画
        anime({
          targets: ".particle",
          translateX: function () {
            return anime.random(-120, 120)
          },
          translateY: function () {
            return anime.random(-120, 120)
          },
          scale: {
            value: [0, 1.5, 0],
            duration: 1000,
            easing: "easeOutQuad"
          },
          opacity: {
            value: [0, 1, 0],
            duration: 1000,
            easing: "easeOutQuad"
          },
          delay: anime.stagger(30),
          complete: function () {
            isClicking = false
          }
        })
      })
    </script>
  </body>
</html>
```
