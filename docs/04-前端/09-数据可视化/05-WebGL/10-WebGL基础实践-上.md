---
title: WebGL基础实践-上
description: "在 WebGL 出现之前，要在浏览器中实现 3D 动画效果，通常需要依赖 Flash 或 Silverlight 等第三方插件。为了打破这一限制，各大厂商联合制定了 WebGL 规范，旨在为 Web 提供一个跨平台的、免插件的 3D 图形标准。本文涵盖 WebGL 程序基本结构、图元绘制、缓冲区、纹理映射与绘制封装。"
keywords: [WebGL基础实践-上]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---


# WebGL基础实践-上

> 本文涵盖第 1-9 章，系统讲解 WebGL 程序的基本结构、图元绘制、缓冲区机制、纹理映射与绘制封装。

## 目录
- 第 1 章：认识 WebGL
- 第 2 章：从一个点开始：掌握 WebGL 的编程要素
- 第 3 章：绘制三角形：学会使用缓冲区、了解 WebGL 中的基本图形元素
- 第 4 章：基本图元绘制：线段
- 第 5 章：绘制渐变三角形：深入理解缓冲区
- 第 6 章：画个矩形：用基本图形构建平面
- 第 7 章：纹理贴图：为形体穿上外衣
- 第 8 章：绘制立方体、球体、锥体：如何用基本图形构建规则形体
- 第 9 章：绘制多个物体：进一步封装绘制方法


---

## 第 1 章：认识 WebGL

WebGL 让网页具备绘制三维图形的能力。理解它的诞生背景与核心价值、以「渲染管线」为核心的基本工作原理、开发者需要具备的技能栈，以及对 GLSL（着色器语言）的初步认识，是掌握这门技术的起点。

> **[提示]**
> WebGL 涉及较多专业术语及 API，文中尽可能用通俗的语言解释关键概念。难以理解的部分可查阅 [MDN WebGL API 文档](https://developer.mozilla.org/zh-CN/docs/Web/API/WebGL_API) 作为补充。

---

本章内容包括：WebGL 的诞生背景与核心价值、以「渲染管线」为核心的基本工作原理、开发者需要具备的技能栈，以及对 GLSL（着色器语言）的初步认识。

---

### 1.1 WebGL 是什么？

在 WebGL 出现之前，要在浏览器中实现 3D 动画效果，通常需要依赖 Flash 或 Silverlight 等第三方插件。为了打破这一限制，各大厂商联合制定了 WebGL 规范，旨在为 Web 提供一个跨平台的、免插件的 3D 图形标准。

简单来说，**WebGL 是一套基于 JavaScript 的图形 API**。它允许 Web 开发者直接与计算机的图形处理单元（GPU）进行通信，从而在 `<canvas>` 元素中绘制出高性能的二维和三维图形。

基于 WebGL 可以开发的应用包括：

- **3D 数据可视化图表**
- **沉浸式网页游戏**
- **交互式 3D 地图**
- **WebVR/AR 应用**

### 1.2 WebGL 工作原理：渲染管线

复杂的 3D 模型最终显示在 2D 屏幕上的过程可以类比为一条**流水线**：原始的 3D 模型数据作为“原材料”投入，经过一系列固定的加工步骤，最终产出屏幕上显示的“成品”图像。在图形学中，这条流水线被称为**图形管线**或**渲染管线**。

> **[核心概念] 渲染管线 (Rendering Pipeline)**
> 渲染管线是 GPU 内部一系列处理数据、生成图像的阶段总称。它接收顶点数据，经过坐标变换、图元装配、光栅化、片元着色等步骤，最终将像素渲染到屏幕上。

WebGL 本身只能绘制三种基本图形，称为**图元**（Primitives）：

- **点 (Points)**
- **线段 (Lines)**
- **三角形 (Triangles)**

所有复杂的 3D 模型，无论是立方体、球体，还是生动的人物模型，其本质都是由大量的三角形拼接而成的。因此，WebGL 开发的核心任务就是定义这些三角形的顶点数据，并告诉 WebGL 如何去渲染它们。

GPU 渲染管线的主要处理流程如下：

```mermaid
flowchart LR
    subgraph 应用阶段["应用阶段 (CPU)"]
        A[顶点数据<br/>位置/颜色/UV] --> B[JavaScript 处理<br/>矩阵变换/数据组织]
    end

    subgraph 顶点处理["顶点处理阶段 (GPU)"]
        B --> C[顶点着色器<br/>坐标变换<br/>🟢 开发者可编程]
        C --> D[图元装配<br/>组装点/线/三角形]
    end

    subgraph 光栅化阶段["光栅化阶段 (GPU)"]
        D --> E[光栅化<br/>矢量→像素片元]
    end

    subgraph 片元处理["片元处理阶段 (GPU)"]
        E --> F[片元着色器<br/>计算颜色<br/>🟢 开发者可编程]
        F --> G[逐片元操作<br/>深度测试/混合]
    end

    G --> H[帧缓冲<br/>屏幕显示]

```

> **[关键理解]** 上图中绿色部分（顶点着色器、片元着色器）是**开发者通过 GLSL 编程控制**的阶段，其余阶段由 GPU 硬件固定执行。WebGL 编程的核心工作就是编写这两个着色器程序。

1.  **顶点着色器 (Vertex Shader)**：接收传入的顶点数据，对每个顶点进行坐标变换（例如，将模型从 3D 世界移动到观察视角下），计算出其在屏幕上的最终位置。
2.  **图元装配 (Primitive Assembly)**：将变换后的顶点按照指定的图元类型（如三角形）组装起来。
3.  **光栅化 (Rasterization)**：将矢量化的图元（如三角形）转换为屏幕上离散的像素点（片元），这个过程决定了哪些像素位于图形内部。
4.  **片元着色器 (Fragment Shader)**：为光栅化阶段生成的每个片元（像素）计算最终颜色，并将其输出到屏幕。

下图简要演示了 WebGL 渲染一个红色三角形的过程，其中绿色的部分是需要开发者通过编程来控制的。

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201895165a8dc3be028ca3~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

### 1.3 开发者需要掌握的技能

与传统的 Web 开发相比，WebGL 对开发者的技能要求更为综合：

```mermaid
graph TB
    subgraph WebGL开发技能栈
        HTML["HTML<br/>Canvas 元素<br/>渲染载体"]
        JS["JavaScript<br/>胶水语言<br/>数据管理/交互控制"]
        GLSL["GLSL<br/>着色器语言<br/>顶点/片元着色器"]
        MATH["3D 数学<br/>向量/矩阵<br/>坐标变换/光照计算"]
    end

    HTML --> JS
    JS --> GLSL
    MATH --> GLSL
    MATH --> JS

```

- **HTML**: 熟练使用 `<canvas>` 元素作为 WebGL 的渲染载体。
- **JavaScript**: 核心胶水语言。负责获取 WebGL 上下文、管理和处理模型数据（如顶点坐标、颜色、纹理等），并将这些数据传递给 GPU。
- **GLSL (OpenGL Shading Language)**: 一种在 GPU 上运行的 C-Style 语言。**顶点着色器**和**片元着色器**程序都用它编写，这是实现自定义渲染效果的关键。
- **3D 数学基础**: 向量和矩阵的数学知识至关重要。顶点的坐标变换、光照计算、相机视角等都依赖于矩阵运算。

> **[重点提示]**
> WebGL 的入门门槛不在于学习新的编程语言，而在于理解其背后的图形学概念和 3D 数学原理。矩阵变换是其中的核心内容。

### 1.4 什么是 GLSL？

GLSL (OpenGL Shading Language) 是专门用于编写着色器程序的高级语言。着色器是在 GPU 上运行的小程序，开发者通过它可以精确控制渲染管线的特定阶段，从而实现高度可定制的视觉效果。

在 WebGL 中，主要使用两种着色器：

- **顶点着色器 (Vertex Shader)**：处理每个顶点，负责坐标变换。
- **片元着色器 (Fragment Shader)**：处理每个片元（像素），负责计算颜色。

虽然需要学习一门新语言，但 GLSL 的语法相对简单，常用的功能也比较集中，通过练习可以较快掌握。

---

#### **第 1 章知识点小结**

核心知识点如下：

- WebGL 是一套基于 JavaScript、面向 GPU 的免插件图形 API，用于在 `<canvas>` 中绘制高性能 2D/3D 图形。
- 渲染管线依次经历顶点着色器、图元装配、光栅化、片元着色器等阶段，最终输出到帧缓冲。
- WebGL 只能绘制点、线段、三角形三种基本图元，复杂模型均由三角形拼接而成。
- WebGL 开发需要 JavaScript、GLSL 和 3D 数学知识的结合。
- 顶点着色器负责顶点坐标变换，片元着色器负责片元颜色计算，两者均可编程。

---

#### **延伸要点**

1.  **图元选择**：WebGL 选择三角形作为主要渲染图元的原因在于图形的平面性、凸性以及硬件实现的友好性——三角形必然共面、恒为凸多边形，且 GPU 对三角形的处理高度优化。
2.  **应用现状**：知名网站与应用中 WebGL 的典型用途集中在 3D 展示、数据可视化与网页游戏等方向。

---

## 第 2 章：从一个点开始：掌握 WebGL 的编程要素

本章从绘制一个最简单的图元 —— **点** —— 开始，完整展示一个 WebGL 程序从无到有的开发全过程，为后续更复杂的渲染功能奠定基础。

- **[演示地址](https://link.juejin.cn?target=http%3A%2F%2Fifanqi.top%2Fwebgl%2Fpages%2Flesson1.1.html)**
- **[源码地址](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Flucefer%2Fwebgl%2Fblob%2Fmaster%2Fpages%2Flesson1.1.html)**

---

本章实践一个完整 WebGL 程序的基本结构与开发流程，编写简单的顶点着色器和片元着色器，掌握 JavaScript 与 GLSL 之间的数据传递以及 `attribute`、`uniform` 变量的用法与区别，并实现鼠标交互动态绘制图形。

---

### 2.1 绘制一个静态点

第一个目标非常简单：在屏幕中心绘制一个大小为 10px、颜色为红色的点。

一个 WebGL 程序包含两大部分：**JavaScript 主程序** 和 **GLSL 着色器程序**，先从着色器入手。

#### **第一步：编写着色器 (GLSL)**

##### **顶点着色器 (Vertex Shader)**

顶点着色器的核心任务是计算并设置顶点的最终位置。这个例子将点绘制在裁剪坐标系的原点，即屏幕中心。

```glsl
// Vertex Shader
void main() {
  // 1. 设置顶点位置：vec4(x, y, z, w)
  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);

  // 2. 设置点的大小（仅对点图元有效）
  gl_PointSize = 10.0;
}
```

##### **片元着色器 (Fragment Shader)**

片元着色器的任务是计算并设置每个像素的最终颜色，此处设置为红色。

```glsl
// Fragment Shader
// 设置所有浮点数类型的默认精度
precision mediump float;

void main() {
  // 设置片元颜色为红色：vec4(r, g, b, a)
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
```

> **[核心概念] GLSL 内置变量**
>
> - `gl_Position`: (vec4) 顶点着色器内置输出变量，用于指定顶点的**裁剪坐标**。GPU 会将这个坐标进行处理，最终映射到屏幕上。
> - `gl_PointSize`: (float) 顶点着色器内置输出变量，用于指定点图元的大小（单位：像素）。
> - `gl_FragColor`: (vec4) 片元着色器内置输出变量，用于指定当前片元的 RGBA 颜色。颜色分量的值域为 `[0.0, 1.0]`。

#### **第二步：准备 HTML 结构**

需要一个 `<canvas>` 元素作为 WebGL 的“画板”，并用 `<script>` 标签存放着色器代码。

```html
<body onload="main()">
  <!-- Canvas 作为 WebGL 渲染的目标 -->
  <canvas id="canvas" width="500" height="500"></canvas>

  <!-- 顶点着色器 -->
  <script id="vertex-shader" type="x-shader/x-vertex">
    void main() {
      gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
      gl_PointSize = 10.0;
    }
  </script>

  <!-- 片元着色器 -->
  <script id="fragment-shader" type="x-shader/x-fragment">
    precision mediump float;
    void main() {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
  </script>

  <!-- 引入封装的工具函数和主程序 -->
  <script src="webgl-helper.js"></script>
  <script src="main.js"></script>
</body>
```

#### **第三步：编写主程序 (JavaScript)**

JavaScript 代码负责“胶水”工作：初始化 WebGL、编译着色器、创建着色器程序，并最终发出绘制指令。

为保持代码整洁，WebGL 的初始化和着色器编译等重复性工作通常封装成辅助函数（如下文 `webgl-helper.js` 所示）。

```javascript
// main.js
function main() {
  // 1. 获取 Canvas 和 WebGL 上下文
  const canvas = document.getElementById("canvas")
  const gl = canvas.getContext("webgl")
  if (!gl) {
    console.error("WebGL not supported!")
    return
  }

  // 2. 初始化着色器程序
  const program = initShaders(gl, "vertex-shader", "fragment-shader")
  gl.useProgram(program)

  // 3. 设置清空画布的颜色
  gl.clearColor(0.0, 0.0, 0.0, 1.0) // 黑色

  // 4. 清空画布
  gl.clear(gl.COLOR_BUFFER_BIT)

  // 5. 发出绘制指令
  // gl.drawArrays(mode, first, count);
  gl.drawArrays(gl.POINTS, 0, 1)
}
```

> **[核心 API] `gl.drawArrays()`**
> 这是 WebGL 中最核心的绘制函数之一。
>
> - `mode`: 指定绘制的图元类型，例如 `gl.POINTS`、`gl.LINES`、`gl.TRIANGLES`。
> - `first`: 指定从哪个顶点开始绘制。
> - `count`: 指定需要渲染的顶点数量。

运行代码后，黑色画布的中央会显示一个红色的点。

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201895165a8dc66b729ea4~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

### 2.2 绘制动态的点

在静态点的基础上可以增加交互：**每次点击鼠标时，在点击位置绘制一个随机颜色的点**。

实现这个功能的核心问题是：**如何将 JavaScript 中的动态数据（鼠标坐标、随机颜色）传递给着色器？**

答案是使用 `attribute` 和 `uniform` 变量。

#### **第一步：升级着色器**

修改着色器，使其能够接收来自 JavaScript 的数据。

##### **顶点着色器**

```glsl
// 接收顶点坐标 (attribute 变量)
attribute vec2 a_Position;
// 接收 Canvas 尺寸 (uniform 变量)
uniform vec2 u_ScreenSize;

void main() {
  // 将 Canvas 坐标系转换为裁剪坐标系
  vec2 position = (a_Position / u_ScreenSize) * 2.0 - 1.0;
  position = position * vec2(1.0, -1.0); // Y 轴翻转

  gl_Position = vec4(position, 0.0, 1.0);
  gl_PointSize = 10.0;
}
```

##### **片元着色器**

```glsl
precision mediump float;

// 接收颜色 (uniform 变量)
uniform vec4 u_Color;

void main() {
  gl_FragColor = u_Color;
}
```

> **[核心概念] `attribute` vs `uniform`**
> 这两者都是 GLSL 中用于接收外部数据的变量，但用途不同：
>
> - **`attribute`**: **顶点专属**。用于传递那些**每个顶点都不同的数据**，例如顶点的位置、法向量、纹理坐标等。它只能在顶点着色器中声明。
> - **`uniform`**: **全局共享**。用于传递那些**对于一批顶点都相同的数据**，例如变换矩阵、光照参数、颜色等。它可以在顶点着色器和片元着色器中声明。
> - **`varying`**: **桥梁变量**。用于将数据从**顶点着色器**传递到**片元着色器**。数据在传递过程中会被**插值**处理。

#### **第二步：升级 JavaScript 程序**

在 JS 中获取这些 `attribute` 和 `uniform` 变量的“地址”，然后为它们赋值。

```javascript
// main.js
function main() {
  // ... 初始化过程同上 ...
  const program = initShaders(gl, "vertex-shader", "fragment-shader")
  gl.useProgram(program)

  // 1. 获取 attribute 和 uniform 变量的存储地址
  const a_Position = gl.getAttribLocation(program, "a_Position")
  const u_ScreenSize = gl.getUniformLocation(program, "u_ScreenSize")
  const u_Color = gl.getUniformLocation(program, "u_Color")

  if (a_Position < 0 || !u_ScreenSize || !u_Color) {
    console.error("Failed to get the storage location of variables")
    return
  }

  // 2. 为 uniform 变量赋值
  gl.uniform2f(u_ScreenSize, canvas.width, canvas.height)

  // 3. 注册鼠标点击事件
  const points = [] // 存储点击的点
  canvas.addEventListener("click", (event) => {
    const x = event.clientX
    const y = event.clientY
    const color = [Math.random(), Math.random(), Math.random(), 1.0]

    points.push({ x, y, color })

    // 重新绘制所有点
    render(gl, points, a_Position, u_Color)
  })

  // 初始清空画布
  render(gl, points, a_Position, u_Color)
}

// 渲染函数
function render(gl, points, a_Position, u_Color) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  points.forEach((point) => {
    // 4. 为 attribute 和 uniform 变量赋值
    gl.vertexAttrib2f(a_Position, point.x, point.y)
    gl.uniform4fv(u_Color, point.color)

    // 5. 绘制点
    gl.drawArrays(gl.POINTS, 0, 1)
  })
}
```

> **[性能提示]**
> 在这个例子中，每绘制一个点就要调用一次 `gl.vertexAttrib2f` 和 `gl.drawArrays`。点的数量非常多时，这种做法的效率很低。使用**缓冲区（Buffer）**一次性向 GPU 传递大量顶点数据，可以大幅提升渲染性能。

---

#### **常见问题解答 (Q&A)**

**Q1: 为什么 GLSL 里的颜色值是 `[0.0, 1.0]`，而不是 CSS 中常见的 `[0, 255]`？**

A: 这是图形学领域的通用惯例。将颜色分量归一化到 `[0.0, 1.0]` 区间，便于进行光照、混合等数学计算。从 `[0, 255]` 转换到 `[0.0, 1.0]` 很简单，只需将每个分量除以 255 即可。

**Q2: 顶点着色器中的坐标转换 `(a_Position / u_ScreenSize) * 2.0 - 1.0` 是如何工作的？**

A: 这是将**屏幕像素坐标**转换为 WebGL **裁剪坐标**的标准流程：

1.  `(a_Position / u_ScreenSize)`: 将 `[0, width]` 和 `[0, height]` 的像素坐标归一化到 `[0.0, 1.0]` 区间。
2.  `* 2.0`: 将 `[0.0, 1.0]` 区间放大到 `[0.0, 2.0]`。
3.  `- 1.0`: 将 `[0.0, 2.0]` 区间平移到 `[-1.0, 1.0]`，这正是裁剪坐标系 X 和 Y 轴的范围。
4.  `position * vec2(1.0, -1.0)`: 因为屏幕坐标系 Y 轴向下为正，而裁剪坐标系 Y 轴向上为正，所以需要翻转 Y 轴。

---

#### **第 2 章知识点小结**

- WebGL 程序由 JavaScript 主程序和 GLSL 着色器两部分组成。
- `gl.drawArrays` 是核心的绘制命令。
- `attribute` 传递逐顶点不同的数据，`uniform` 传递一批顶点共享的数据，两者的应用场景不同。
- 通过 `gl.getAttribLocation` 和 `gl.getUniformLocation` 获取着色器变量的地址。
- 通过 `gl.vertexAttrib*` 和 `gl.uniform*` 系列函数为着色器变量赋值。
- 屏幕像素坐标转换为 WebGL 裁剪坐标的流程：归一化、放大到 `[0, 2]`、平移到 `[-1, 1]`，并翻转 Y 轴。

---

#### **实践要点**

1.  **修改点的大小**：修改 `gl_PointSize` 的值，观察点的变化；进一步可将它改造成 `uniform` 变量，通过 JS 动态控制点的大小。
2.  **改变清屏颜色**：修改 `gl.clearColor` 的参数，观察画布背景色的变化。
3.  **形状挑战**：仅使用前文介绍的 `gl.POINTS` 和 `drawArrays`，在画布上绘制出一个空心的正方形或圆形。

---

## 第 3 章：绘制三角形：学会使用缓冲区、了解 WebGL 中的基本图形元素

绘制大量点时，`for` 循环 + 多次 `drawArrays` 的方式效率极低，因为每次循环都会在 JavaScript 和 GPU 之间进行一次通信，产生巨大的性能开销。

本章绘制 WebGL 中最基本的面——**三角形**，并引出一个至关重要的性能优化工具：**缓冲区（Buffer）**。通过缓冲区，大量顶点数据可以一次性地从 CPU（内存）发送到 GPU（显存），从而极大地提升渲染效率。

- **[演示地址](https://link.juejin.cn?target=http%3A%2F%2Fifanqi.top%2Fwebgl%2Fpages%2Flesson2.html)**
- **[源码地址](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Flucefer%2Fwebgl%2Fblob%2Fmaster%2Fpages%2Flesson2.html)**

---

本章了解 WebGL 中三种三角形图元的区别，掌握使用缓冲区（Buffer）向 GPU 高效传输批量顶点数据的方法与 `gl.vertexAttribPointer` 的工作原理及参数含义，认识类型化数组（Typed Arrays）在 WebGL 中的作用，并实现动态绘制多个三角形。

---

### 3.1 三角形图元分类

WebGL 提供了三种绘制三角形的模式，它们在使用相同数量顶点时，会产生不同的连接方式和结果。

```mermaid
graph TB
    subgraph TRIANGLES[“gl.TRIANGLES — 基本三角形”]
        T1[“V0—V1—V2 → 三角形1”]
        T2[“V3—V4—V5 → 三角形2”]
        TN[“每3个顶点一组，互不关联<br/>6个顶点 → 2个三角形”]
    end

    subgraph STRIP[“gl.TRIANGLE_STRIP — 三角带”]
        S1[“V0—V1—V2 → 三角形1”]
        S2[“V1—V2—V3 → 三角形2”]
        S3[“V2—V3—V4 → 三角形3”]
        SN[“每个新顶点与前2个顶点构成新三角形<br/>6个顶点 → 4个三角形”]
    end

    subgraph FAN[“gl.TRIANGLE_FAN — 三角扇”]
        F1[“V0—V1—V2 → 三角形1”]
        F2[“V0—V2—V3 → 三角形2”]
        F3[“V0—V3—V4 → 三角形3”]
        FN[“V0为公共扇心<br/>6个顶点 → 4个三角形”]
    end

```

| 图元类型 | 连接规则 | 三角形数量 | 典型用途 |
|----------|----------|-----------|----------|
| `gl.TRIANGLES` | 每 3 个顶点独立成三角形 | `顶点数 / 3` | 独立三角形、网格模型 |
| `gl.TRIANGLE_STRIP` | 每个新顶点与前 2 个顶点构成三角形 | `顶点数 - 2` | 地形、连续曲面 |
| `gl.TRIANGLE_FAN` | 第一个顶点为扇心，后续顶点与之构成三角形 | `顶点数 - 2` | 圆形、锥体、多边形 |

- **`gl.TRIANGLES` (基本三角形)**
  这是最简单、最常用的一种。每三个顶点构成一个独立的三角形，顶点之间互不相干。若提供 6 个顶点，将绘制 2 个独立的三角形。
  `绘制数量 = 顶点数 / 3`
  ![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201895165a8dc0abecae80~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

- **`gl.TRIANGLE_STRIP` (三角带)**
  从第三个顶点开始，每个新顶点都会与前两个顶点构成一个新的三角形，形成一条”带子”。若提供 6 个顶点，将绘制 4 个三角形。
  `绘制数量 = 顶点数 - 2`
  ![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201912216875b8e51710e48~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

- **`gl.TRIANGLE_FAN` (三角扇)**
  第一个顶点是公共的”扇心”，后续每两个顶点与第一个顶点共同构成一个三角形，形成一个”扇面”。若提供 6 个顶点，也将绘制 4 个三角形。
  `绘制数量 = 顶点数 - 2`
  ![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201895165a8dc2bb044266~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

其中最基础的 `gl.TRIANGLES` 是后续示例的主要对象。

### 3.2 绘制第一个三角形：缓冲区实战

以下绘制一个固定的红色三角形，完整展示**缓冲区的使用流程**。

#### **第一步：编写着色器**

着色器非常简单。顶点着色器接收一个 `vec2` 类型的顶点位置，片元着色器输出一个固定的红色。

```glsl
// 顶点着色器
attribute vec2 a_Position;

void main() {
  // 直接使用裁剪坐标，范围 [-1.0, 1.0]
  gl_Position = vec4(a_Position, 0.0, 1.0);
}

// 片元着色器
precision mediump float;
uniform vec4 u_Color;

void main() {
  gl_FragColor = u_Color;
}
```

#### **第二步：缓冲区工作流 (JavaScript)**

这部分是本章的核心，遵循一个固定的工作流程，将多个顶点数据一次性发送给 GPU。

```mermaid
flowchart TB
    subgraph CPU端["CPU 端 (JavaScript)"]
        A[1. 准备顶点数据<br/>Float32Array] --> B[2. 创建缓冲区<br/>gl.createBuffer]
        B --> C[3. 绑定缓冲区<br/>gl.bindBuffer]
        C --> D[4. 写入数据<br/>gl.bufferData]
    end

    subgraph GPU端["GPU 端"]
        D --> E[5. 获取属性地址<br/>gl.getAttribLocation]
        E --> F[6. 配置属性指针<br/>gl.vertexAttribPointer]
        F --> G[7. 启用属性<br/>gl.enableVertexAttribArray]
    end

    G --> H[8. 绘制<br/>gl.drawArrays]

```

```javascript
// main.js
function main() {
  // ... 初始化 WebGL 和着色器程序 ...
  const program = initShaders(gl, ...);
  gl.useProgram(program);

  // 准备顶点数据 (3个顶点，每个顶点2个分量x, y)
  const vertices = new Float32Array([
     0.0,  0.5,  // 顶点1
    -0.5, -0.5,  // 顶点2
     0.5, -0.5   // 顶点3
  ]);
  const n = 3; // 顶点数量

  // ===== 缓冲区工作流开始 =====

  // 1. 创建缓冲区对象
  const vertexBuffer = gl.createBuffer();

  // 2. 绑定缓冲区到 WebGL 目标
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  // 3. 向缓冲区写入数据
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // 4. 获取 attribute 变量地址
  const a_Position = gl.getAttribLocation(program, 'a_Position');

  // 5. 将缓冲区分配给 attribute 变量
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

  // 6. 启用 attribute 变量
  gl.enableVertexAttribArray(a_Position);

  // ===== 缓冲区工作流结束 =====

  // ... 设置颜色、清空画布、执行绘制 ...
  gl.uniform4f(u_Color, 1.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, n);
}
```

> **[核心概念] 类型化数组 (Typed Arrays)**
> JavaScript 的普通数组 `[]` 是弱类型的，而 GPU 需要严格的、连续的二进制数据。`Float32Array` 就是一种**类型化数组**，它创建了一个由 32 位浮点数组成的连续内存空间，可以直接被 WebGL 使用，无需进行额外的类型转换。

> **[核心 API] `gl.vertexAttribPointer()`**
> 这是连接缓冲区和顶点着色器属性的桥梁，也是最容易混淆的函数。它告诉 WebGL 如何从当前绑定的缓冲区中“解析”数据。
> `gl.vertexAttribPointer(location, size, type, normalized, stride, offset);`
>
> - `location`: 要绑定的 `attribute` 变量的地址。
> - `size`: 每个顶点需要几个分量。本例中 `a_Position` 是 `vec2`，所以是 `2`。
> - `type`: 数据类型。这里使用 `Float32Array`，所以是 `gl.FLOAT`。
> - `normalized`: 是否将非浮点数据归一化。浮点数据直接传 `false`。
> - `stride`: **步长**。指从一个顶点到下一个顶点需要跳过多少个**字节**。如果数据是紧密排列的（如本例），可以设置为 `0`，让 WebGL 自动计算。假设一个顶点包含位置（vec2）和颜色（vec4），都是 float，那么步长就是 `(2+4) * 4 = 24` 字节。
> - `offset`: **偏移量**。指在每个顶点的数据块中，从开头要跳过多少个**字节**才是当前属性的数据。本例中位置数据就在最前面，所以偏移是 `0`。

下图清晰地展示了 `stride` 和 `offset` 的含义：
![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201896165adbb5478cdcb9~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

### 3.3 动态绘制多个三角形

掌握缓冲区的基础用法后，实现动态绘制就变得简单了：只需在鼠标点击时不断向顶点数组中添加新的坐标，并更新到缓冲区即可。

#### **第一步：修改着色器**

为处理屏幕像素坐标，需要把第 2 章的坐标转换逻辑加回来。

```glsl
// 顶点着色器
attribute vec2 a_Position;
uniform vec2 u_ScreenSize;

void main() {
  vec2 position = (a_Position / u_ScreenSize) * 2.0 - 1.0;
  position *= vec2(1.0, -1.0);
  gl_Position = vec4(position, 0.0, 1.0);
}
```

#### **第二步：修改 JavaScript**

关键在于**动态更新缓冲区数据**。

```javascript
// ... 初始化 ...
const positions = [] // 用普通 JS 数组存储坐标

canvas.addEventListener("click", (e) => {
  const x = e.clientX
  const y = e.clientY
  positions.push(x, y)

  // 只有当顶点数是 3 的倍数时才需要重绘
  if (positions.length % 6 === 0) {
    // 1. 将 JS 数组转换为类型化数组
    const vertices = new Float32Array(positions)

    // 2. 更新缓冲区数据
    // 注意最后一个参数 gl.DYNAMIC_DRAW，它是一个给 WebGL 的性能提示
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW)

    // 3. 重新渲染
    render(gl, positions.length / 2)
  }
})

function render(gl, n) {
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLES, 0, n)
}
```

> **[性能提示] `gl.bufferData` 的用法**
> 第三个参数是对 WebGL 的一个性能提示，告知 GPU 端数据预期的使用方式：
>
> - `gl.STATIC_DRAW`: 数据几乎不会改变（例如一个静态模型的顶点）。
> - `gl.DYNAMIC_DRAW`: 数据会频繁改变（例如本例中动态添加的顶点）。
> - `gl.STREAM_DRAW`: 数据每次绘制时都会改变。
>   WebGL 会根据这些提示在 GPU 内部进行优化。

---

#### **第 3 章知识点小结**

- 缓冲区可以代替循环绘制，一次性向 GPU 传递大量顶点数据，消除多次 CPU-GPU 通信的开销。
- 缓冲区使用的核心步骤：创建缓冲区、绑定缓冲区、写入数据、获取属性地址、配置属性指针、启用属性。
- `gl.vertexAttribPointer` 中 `size`、`stride`、`offset` 参数决定了从缓冲区中解析顶点数据的方式。
- `Float32Array` 这类类型化数组提供了 GPU 需要的连续二进制内存。
- 通过 `gl.bufferData` 可以更新缓冲区中的数据，`DYNAMIC_DRAW` 等提示参数帮助 WebGL 优化存储策略。

---

#### **实践要点**

1.  **探索不同图元**：将 `gl.drawArrays` 的第一个参数修改为 `gl.TRIANGLE_STRIP` 和 `gl.TRIANGLE_FAN`，并提供至少 4 个顶点，观察绘制结果的差异。
2.  **颜色扩展**：本章示例中所有三角形的颜色相同，可从两个方向扩展：
    - 如何让每个三角形的颜色都不同？
    - 更进一步，如何让同一个三角形的三个顶点颜色不同，从而实现“渐变色”效果？（提示：颜色也是一种可以传递给着色器的数据。）

---
