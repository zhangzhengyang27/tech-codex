---
title: WebGL基础实践-下
description: "在之前的章节中，我们学会了如何用单色或渐变色填充图形。但在真实的应用场景（如游戏、3D 可视化）中，物体的表面往往拥有丰富多彩的图案和细节。我们不可能用代码去绘制这些复杂的图像，而是通过一种更高效的机制——将现成的图片“贴”到模型的表面上。"
keywords: [WebGL基础实践-下]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---


# WebGL基础实践-下

> 本篇涵盖第 7-9 章，讲解纹理贴图、3D 形体（立方体/球体/锥体）程序化生成、以及绘制方法的封装。

## 第 7 章：纹理贴图：为形体穿上外衣

在之前的章节中，我们学会了如何用单色或渐变色填充图形。但在真实的应用场景（如游戏、3D 可视化）中，物体的表面往往拥有丰富多彩的图案和细节。我们不可能用代码去绘制这些复杂的图像，而是通过一种更高效的机制——将现成的图片“贴”到模型的表面上。这种技术就是 **纹理贴图 (Texture Mapping)**。

本章，我们将深入学习如何使用 WebGL 为我们的几何图形穿上华丽的“外衣”。

### 7.1 学习目标

- 理解什么是纹理贴图及其应用场景。
- 掌握纹理坐标系（UV 坐标）的概念。
- 学习完整的 WebGL 纹理贴图流程，包括图片加载、着色器编写和 JavaScript API 调用。
- 了解并处理与纹理相关的常见问题，如图片跨域和尺寸要求。

### 7.2 理解纹理核心概念

#### 纹理坐标系对比

| 对比维度 | 屏幕坐标系 | 纹理坐标系 (UV) | 裁剪坐标系 |
|----------|-----------|----------------|-----------|
| 原点位置 | 左上角 | **左下角** | 中心 |
| Y 轴方向 | 向下为正 ✅ | 向上为正 ✅ | 向上为正 |
| X 轴方向 | 向右为正 | 向右为正 | 向右为正 |
| 值域范围 | [0, viewportWidth] | **[0.0, 1.0]** | [-1.0, 1.0] |
| 归一化 | 否 | **是** | 是 |

> **[常见陷阱]** 纹理坐标的 Y 轴方向与屏幕坐标系相反！图片数据通常以左上角为原点存储，而 UV 坐标以左下角为原点。如果不做翻转处理，纹理会上下颠倒。解决方法：在加载图片后使用 `gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)` 翻转 Y 轴。

#### 纹理参数速查表

| 参数类别 | 参数名 | 可选值 | 说明 |
|----------|--------|--------|------|
| **放大过滤** | `gl.TEXTURE_MAG_FILTER` | `gl.NEAREST` | 取最近像素，像素风格/锯齿明显 |
| | | `gl.LINEAR` ✅ | 插值取4个邻近像素，平滑但模糊 |
| **缩小过滤** | `gl.TEXTURE_MIN_FILTER` | `gl.NEAREST` | 同上，缩小时取最近像素 |
| | | `gl.LINEAR` | 同上，缩小时线性插值 |
| | | `gl.NEAREST_MIPMAP_NEAREST` | 选择最近mip层，取最近像素 |
| | | `gl.LINEAR_MIPMAP_NEAREST` | 选择最近mip层，线性插值 |
| | | `gl.NEAREST_MIPMAP_LINEAR` ✅ | 两层mip间线性插值，取最近像素 |
| | | `gl.LINEAR_MIPMAP_LINEAR` ✅ | 两层mip间线性插值，线性插值（最高质量） |
| **X轴包裹** | `gl.TEXTURE_WRAP_S` | `gl.REPEAT` ✅ | 重复纹理（默认） |
| | | `gl.CLAMP_TO_EDGE` | 边缘像素延伸到边界外 |
| | | `gl.MIRRORED_REPEAT` | 镜像重复 |
| **Y轴包裹** | `gl.TEXTURE_WRAP_T` | 同 `WRAP_S` | 同上 |

> **[重要提示]** 使用 mipmap 过滤模式时，纹理尺寸必须为 POT（2 的幂次方）。如果纹理是 NPOT 尺寸，只能使用 `NEAREST` 或 `LINEAR` 过滤模式，且包裹模式只能使用 `CLAMP_TO_EDGE`。

在动手实践之前，我们需要先掌握几个与纹理贴图紧密相关的核心概念。

#### 7.2.1 纹理坐标系（UV 坐标）

为了将一张二维的图片精确地映射到三维模型的表面，我们需要一套独立的坐标系统来定位图片上的点，这就是**纹理坐标系**，也常被称为 **UV 坐标系**。`U` 轴代表水平方向，`V` 轴代表垂直方向。

WebGL 的纹理坐标系有以下特点：

- **原点**：位于左下角，坐标为 `(0.0, 0.0)`。
- **U 轴**：水平向右为正方向，范围从 `0.0` 到 `1.0`。
- **V 轴**：垂直向上为正方向，范围从 `0.0` 到 `1.0`。

你可以把它想象成一个单位正方形，无论原始图片尺寸多大，它都会被归一化到这个 `1.0 x 1.0` 的坐标空间内。当我们为模型的每个顶点指定一个 UV 坐标时，就相当于告诉 WebGL 该顶点对应图片上的哪个点。



#### 7.2.2 图片尺寸要求

WebGL 对纹理图片的尺寸有一个重要的建议：**宽度和高度都应该是 2 的 N 次幂**（例如，64x64, 128x256, 512x512）。这类尺寸的纹理被称为 “Power-of-Two (POT)” 纹理。

虽然现代的 WebGL 实现大多也支持非 2 的幂（Non-Power-of-Two, NPOT）的纹理，但使用 POT 纹理有以下好处：

- **兼容性更好**：在一些旧的设备或驱动上，NPOT 纹理可能不被支持。
- **性能更优**：硬件对 POT 纹理有更好的优化。
- **支持 Mipmapping**：Mipmapping 是一种重要的优化技术（我们将在后续章节讨论），它要求纹理必须是 POT 尺寸。

因此，在准备图片素材时，养成使用 POT 尺寸的习惯是一个很好的工程实践。

### 7.3 纹理贴图实践

理论知识准备就绪，让我们通过一个完整的例子来实践如何为一个矩形贴上图片。

#### 7.3.1 步骤一：着色器准备

要实现纹理贴图，我们的着色器需要协同工作：顶点着色器负责接收并传递 UV 坐标，片元着色器则根据这些坐标从图片中采样颜色。

##### 顶点着色器 (Vertex Shader)

我们需要在顶点着色器中增加一个 `attribute` 变量来接收来自 JavaScript 的顶点 UV 坐标，并通过一个 `varying` 变量将其传递给片元着色器。

```glsl
// 设置浮点数精度为中等
precision mediump float;

// attribute: 从缓冲区接收数据
attribute vec2 a_Position;      // 接收顶点位置坐标
attribute vec2 a_Screen_Size;   // 接收 canvas 尺寸
attribute vec2 a_Uv;            // 接收顶点对应的 UV 坐标

// varying: 将数据从顶点着色器传递到片元着色器
varying vec2 v_Uv;              // 将 UV 坐标传递给片元着色器

void main() {
    // 将屏幕坐标转换为裁剪空间坐标
    vec2 position = (a_Position / a_Screen_Size) * 2.0 - 1.0;
    position = position * vec2(1.0, -1.0);

    gl_Position = vec4(position, 0.0, 1.0);

    // 将接收到的 UV 坐标赋值给 varying 变量
    v_Uv = a_Uv;
}
```

##### 片元着色器 (Fragment Shader)

片元着色器需要定义一个特殊的 `uniform` 变量 `sampler2D`，它代表了我们的纹理图片。然后，它使用内置的 `texture2D()` 函数，根据从顶点着色器传来的 `v_Uv` 坐标，从纹理中提取（采样）颜色值，并赋给 `gl_FragColor`。

```glsl
// 设置浮点数精度为中等
precision mediump float;

// varying: 接收从顶点着色器传递过来的插值后的 UV 坐标
varying vec2 v_Uv;

// uniform: 接收来自 JavaScript 的纹理单元
uniform sampler2D u_Texture;

void main() {
    // texture2D(sampler, coord): 从 sampler (纹理) 的 coord (UV坐标) 处进行颜色采样
    gl_FragColor = texture2D(u_Texture, v_Uv);
}
```

#### 7.3.2 步骤二：JavaScript 实现

JavaScript 在此过程中扮演着“指挥官”的角色，负责加载图片、创建和配置纹理对象，并将所有数据（顶点位置、UV 坐标、纹理）发送给 GPU。

##### 图片加载与跨域问题

纹理贴图的第一步是加载图片。在浏览器中，这通常通过 `new Image()` 对象来完成。然而，一个常见的问题是**跨域（Cross-Origin）**。如果你的图片资源和你的网页不在同一个源（协议、域名、端口号都相同），浏览器出于安全策略会阻止 JavaScript 读取图片数据，导致 `gl.texImage2D` 调用失败。

有三种常见的解决方案：

1.  **本地开发环境配置**：在本地开发时，可以启动一个本地 Web 服务器（如使用 VS Code 的 Live Server 插件），或者配置浏览器允许跨域请求。这能让你在开发阶段顺畅地测试，但不是生产环境的解决方案。

2.  **同源部署**：最简单的方法是将图片资源和你的 HTML 文件放在同一个 Web 服务器上，确保它们同源。

3.  **配置 CORS (跨域资源共享)**：这是生产环境中最标准的做法。需要两步：

    - **服务器端**：托管图片的服务器需要在响应头中加入 `Access-Control-Allow-Origin` 字段，值为允许访问的域名（或 `*` 表示允许所有域名）。
    - **客户端**：在 JavaScript 中创建 `Image` 对象时，必须设置其 `crossOrigin` 属性。

    ```javascript
    const image = new Image()
    image.crossOrigin = "anonymous" // 或 'use-credentials'
    image.onload = () => {
      // 图片加载完成后的纹理创建逻辑
    }
    image.src = "https://your-cdn.com/path/to/image.jpg"
    ```

> **重要提示**：纹理的所有相关操作都必须在 `image.onload` 回调函数中执行，以确保在图片完全加载到内存之后再进行。

##### 数据准备与 API 调用

图片加载成功后，我们就可以执行 WebGL 的一系列操作了。下面是一个完整的函数，它封装了创建纹理、设置参数、上传数据并进行绘制的全部流程。

```javascript
function createAndSetupTexture(gl, image) {
  // 1. 创建纹理对象
  const texture = gl.createTexture()

  // 2. 激活指定的纹理单元
  // WebGL 允许我们同时使用多个纹理，通过纹理单元来区分
  // gl.TEXTURE0, gl.TEXTURE1, ..., gl.TEXTUREN
  gl.activeTexture(gl.TEXTURE0)

  // 3. 绑定纹理对象到目标
  // gl.TEXTURE_2D 表示这是一个二维纹理
  gl.bindTexture(gl.TEXTURE_2D, texture)

  // 4. 配置纹理参数
  // a. 设置图片在xy轴方向的重复/拉伸方式
  // gl.REPEAT: 重复
  // gl.CLAMP_TO_EDGE: 边缘拉伸
  // gl.MIRRORED_REPEAT: 镜像重复
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  // b. 设置图片放大或缩小时的滤波（插值）算法
  // gl.LINEAR: 线性插值，效果平滑
  // gl.NEAREST: 最近点采样，效果锐利但可能产生像素感
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  // 5. 将图片数据上传到 GPU
  // gl.texImage2D(target, level, internalformat, format, type, source);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)

  // 6. 将纹理单元编号传递给着色器中的 sampler2D uniform 变量
  const u_Texture = gl.getUniformLocation(gl.program, "u_Texture")
  gl.uniform1i(u_Texture, 0) // 0 对应 gl.TEXTURE0
}

// --- 在你的主程序中 ---

// 定义包含位置和 UV 坐标的顶点数据
// 矩形由两个三角形组成，共 6 个顶点
const vertices = new Float32Array([
  // -- 顶点位置 --   -- UV 坐标 --
  30,
  30,
  0.0,
  0.0, // V0
  30,
  300,
  0.0,
  1.0, // V1
  300,
  300,
  1.0,
  1.0, // V2

  30,
  30,
  0.0,
  0.0, // V0
  300,
  300,
  1.0,
  1.0, // V2
  300,
  30,
  1.0,
  0.0 // V3
])

// ... 创建并绑定缓冲区，设置 vertexAttribPointer ...

// 加载图片并设置回调
const image = new Image()
image.crossOrigin = "anonymous"
image.onload = () => {
  // 在图片加载完成后创建纹理并绘制
  createAndSetupTexture(gl, image)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
}
image.src = "path/to/your/image.png"
```

> **深入理解 `gl.vertexAttribPointer`**
> 当顶点数据中同时包含位置和 UV 坐标时，我们需要更精细地配置 `gl.vertexAttribPointer` 的 `stride` 和 `offset` 参数，以告诉 WebGL 如何在缓冲区中正确地读取这两种数据。我们将在后续章节中对此进行更深入的探讨。

### 7.4 实践与练习

1.  **更换纹理图片**：找一张你喜欢的、符合 POT 尺寸的图片，替换掉示例中的图片，观察效果。
2.  **修改 UV 坐标**：
    - 尝试将所有 UV 坐标都乘以 2.0 (`v_Uv * 2.0`)，并设置 `TEXTURE_WRAP_S` 和 `TEXTURE_WRAP_T` 为 `gl.REPEAT`，观察会发生什么？
    - 尝试只截取图片的一部分进行贴图。例如，如何只显示图片的左上角四分之一？（提示：修改 UV 坐标的范围）
3.  **探索滤波模式**：将 `TEXTURE_MIN_FILTER` 和 `TEXTURE_MAG_FILTER` 的参数从 `gl.LINEAR` 改为 `gl.NEAREST`，仔细观察缩放或移动图形时，纹理边缘的显示效果有何不同。
4.  **（挑战）使用索引绘制**：将本章的例子与上一章的知识结合起来，改用 `gl.drawElements` 和 4 个顶点来绘制带纹理的矩形，以减少顶点数据的冗余。

### 7.5 总结

在本章节中，我们解锁了 WebGL 中一项极具表现力的功能：**纹理贴图**。通过将二维图片映射到三维几何体上，我们极大地丰富了图形的视觉细节，使其从单调的色块变成了生动的物体。

我们掌握了以下核心知识点：

1.  **纹理坐标系 (UV)**：一个独立的、归一化的二维坐标系，是连接模型顶点和纹理图片像素点的桥梁。
2.  **着色器协作**：顶点着色器负责传递 UV 坐标，而片元着色器通过 `sampler2D` 和 `texture2D()` 函数，根据 UV 坐标从纹理中采样颜色，最终完成了贴图过程。
3.  **JavaScript 流程**：我们学习了完整的纹理处理流程，包括异步加载图片、处理跨域问题、创建纹理对象 (`gl.createTexture`)、绑定与激活 (`gl.bindTexture`, `gl.activeTexture`)、配置参数 (`gl.texParameteri`) 以及上传数据 (`gl.texImage2D`)。
4.  **实践要点**：我们强调了图片尺寸（POT）的重要性，并了解了不同纹理参数（如 `WRAP` 和 `FILTER`）对最终渲染效果的影响。

纹理贴图是通向真实感渲染的关键一步。掌握了它，你就有能力创建出更加复杂和逼真的场景。

在下一章，我们将进入一个全新的维度，开始学习如何用我们掌握的这些基础技术来构建真正的 **3D 形体**，比如立方体、球体和锥体。

---

## 第 8 章：绘制立方体、球体、锥体：如何用基本图形构建规则形体

从本节开始，我们将正式踏入三维世界。前面的章节我们专注于在二维平面上绘制点、线和三角形，而现在，我们将学习如何利用这些基础图形，构建起立体的、可视化的三维形体。我们将从最经典的立方体开始，逐步探索球体、锥体等规则形体的构建方法。

### 8.1 学习目标

完成本章节后，你将能够：

- 理解从二维到三维的坐标系扩展，掌握 WebGL 中的裁剪坐标系和 NDC 坐标系。
- 掌握模型变换与投影变换的基本概念及其在 3D 场景中的作用。
- 学会如何使用三角形作为基本单元来构建立方体、球体、锥体等三维模型。
- 理解并应用“背面剔除”技术来优化渲染性能。
- 编写 JavaScript 函数来程序化地生成三维模型的顶点数据。

### 8.2 核心概念：从二维到三维

绘制三维形体与二维图形最大的不同在于，我们引入了深度（Z 轴）的概念。这不仅意味着顶点坐标增加了一个维度，更带来了一系列新的核心概念。

#### 1. 坐标系：裁剪空间与 NDC 空间

在之前的章节中，我们已经接触过 `gl_Position`，它是顶点着色器中一个至关重要的内置变量，用于指定顶点的最终位置。`gl_Position` 接收的坐标位于一个被称为 **裁剪坐标系（Clip Space）** 的特殊坐标系中。

裁剪坐标系是一个四维的齐次坐标系 `(x, y, z, w)`。在顶点着色器处理完毕后，GPU 会自动执行 **透视除法（Perspective Division）**，即用 `w` 分量去除 `x`, `y`, `z` 分量：`(x/w, y/w, z/w)`。这个过程将裁剪坐标转换到了 **标准化设备坐标系（Normalized Device Coordinates, NDC）**。

NDC 空间是一个边长为 2 的立方体，其中心在原点 `(0,0,0)`。`x`, `y`, `z` 三个分量的范围都是 `[-1, 1]`。任何超出这个范围的顶点都将被 GPU **裁剪**掉，即不会被渲染。

- **X 轴**：从左到右，范围 `[-1, 1]`。
- **Y 轴**：从下到上，范围 `[-1, 1]`。
- **Z 轴**：从近到远，范围 `[-1, 1]`。

> **左手坐标系 vs. 右手坐标系**
>
> 尽管 OpenGL 和 WebGL 的官方文档和社区通常推荐使用右手坐标系进行数学计算（Z 轴正方向朝向观察者），但其内部的 NDC 坐标系实际上是一个左手坐标系（Z 轴正方向远离观察者，即朝屏幕内）。在本系列教程中，为了与 WebGL 的底层行为保持一致，我们将在着色器和矩阵计算中统一采用左手坐标系。

#### 2. 三维变换：模型、视图与投影

如果直接在 `[-1, 1]` 的 NDC 空间中定义模型，会非常不便。我们更希望在一个方便的 **模型空间（Model Space）** 中定义物体的形状（例如，一个以自身原点为中心的立方体），然后通过一系列的矩阵变换，将它放置到我们想要的世界位置，并最终投影到屏幕上。这个过程通常涉及三个核心的变换矩阵：

- **模型矩阵 (Model Matrix)**：将物体从模型空间变换到 **世界空间（World Space）**。它定义了物体在全局场景中的位置、旋转和缩放。让物体动起来，就是通过在每一帧改变其模型矩阵来实现的。
- **视图矩阵 (View Matrix)**：将整个场景从世界空间变换到 **观察空间（View Space）**，模拟摄像机的位置和朝向。
- **投影矩阵 (Projection Matrix)**：将场景从观察空间变换到裁剪空间，定义了摄像机的“视野”，例如是模拟人眼的透视投影（近大远小），还是没有深度感的正交投影。它解决了之前章节中 2D 正方形因画布尺寸不等而变形的问题。

在顶点着色器中，我们将这三个矩阵与顶点的模型空间坐标相乘，得到最终的裁剪空间坐标：

```glsl
// 伪代码
gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
```

在本章中，为了简化入门，我们将暂时省略视图矩阵，直接使用模型矩阵和投影矩阵。

### 如何用三角形构建正方体

一个只包含坐标信息的立方体实际上是由 6 个正方形，每个正方形由两个三角形组成，每个三角形由三个顶点组成，所以一个立方体由 6 个正方形 \* 2 个三角形 \* 3 个顶点 = 36 个顶点组成，但是这 36 个顶点中有很多是重复的，我们很容易发现：一个纯色立方体实际上由 6 个矩形面，或者 8 个不重复的顶点组成。

请谨记，顶点的`重复与否`，不只取决于顶点的坐标信息一致，还取决于该顶点所包含的其他信息是否一致。比如顶点纹理坐标 uv、顶点法线，顶点颜色等。一旦有一个信息不同，就必须用两个顶点来表示。

仍然以矩形举例，每个顶点只包含`坐标`和`颜色`两类信息。如果我们的矩形是纯色的，假设是红色。

```
//顶点信息
var positions = [
 30, 30, 1, 0, 0, 1, //V0
 30, 300, 1, 0, 0, 1, //V1
 300, 300, 1, 0, 0, 1, //V2
 30, 30, 1, 0, 0, 1, //V0
 300, 300, 1, 0, 0, 1, //V2
 300, 30, 1, 0, 0, 1 //V3
]
```

很明显，V0 和 V2 这两个顶点坐标和颜色完全一致，所以，该顶点是重复的，我们可以忽略重复的顶点。

同样地，还是这样一个矩形，每个顶点还是只包含坐标和颜色两类信息，我们想实现一个渐变矩形，从 `V0 -> V1V2` 为红绿渐变，从`V1V2 -> V3` 为黄蓝渐变。
如下图所示：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20189281661ee227cedb437~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

我们看一下顶点数组：

```
//顶点信息
var positions = [
 30, 30, 1, 0, 0, 1, //V0，红色
 30, 300, 0, 1, 0, 1, //V1，绿色
 300, 300, 0, 1, 0, 1, //V2，绿色
 30, 30, 1, 1, 0, 1, //V4，黄色
 300, 300, 1, 1, 0, 1,//V5，黄色
 300, 30, 0, 0, 1, 1 //V3，蓝色
]
```

可以看到，虽然 V0 和 V4，V2 和 V5 的顶点坐标一致，但是顶点颜色不一样，所以我们只能把他们当做不同的顶点处理，否则达不到我们想要的效果。

> 一定要理解`重复顶点`的定义：两个顶点必须是所有信息一致，才可以称之为重复顶点。

### 彩色立方体

为了在视觉层面区分出立方体的各个面，接下来我们绘制一个彩色立方体。

立方体是 3 维形体，所以它们的顶点坐标需要从 2 维扩展成 3 维，除了 `x、y` 坐标，还需要深度值： `z` 轴坐标。

#### 代码调整

本节代码组织上和之前章节有所不同，主要有以下两点：

- 顶点属性不再使用一个 buffer 混合存储，改为每个属性对应一个 buffer，便于维护。
- 顶点坐标我们不再使用屏幕坐标系，而是采用 NDC 坐标系。如果使用屏幕坐标系，会涉及到相对复杂的坐标系变换，大家可能不容易理解。

我们还是按照之前的套路：

- 定义顶点
- 传递数据
- 执行绘制。

首先定义顶点，由于立方体包含六个面，每个面采用同一个颜色，所以我们需要定义 6 个矩形面 \* 4 个顶点 = 24 个不重复的顶点。

```
 //正方体 8 个顶点的坐标信息（顺序与下方 createCube 中的 cornerPositions 一致）
let zeroX = 0.5;
let zeroY = 0.5;
let zeroZ = 0.5;
let positions = [
 [-zeroX, -zeroY, -zeroZ], //V0
 [zeroX, -zeroY, -zeroZ], //V1
 [zeroX, zeroY, -zeroZ], //V2
 [-zeroX, zeroY, -zeroZ], //V3
 [-zeroX, -zeroY, zeroZ],//V4
 [-zeroX, zeroY, zeroZ], //V5
 [zeroX, zeroY, zeroZ], //V6
 [zeroX, -zeroY, zeroZ] //V7
]
```

接下来定义六个面包含的顶点索引：

```
const CUBE_FACE_INDICES = [
 [0, 1, 2, 3], //前面
 [4, 5, 6, 7], //后面
 [0, 3, 5, 4], //左面
 [1, 7, 6, 2], //右面
 [3, 2, 6, 5], //上面
 [0, 4, 7, 1] // 下面
];
```

定义六个面的颜色信息：

```
const FACE_COLORS = [
 [1, 0, 0, 1], // 前面，红色
 [0, 1, 0, 1], // 后面，绿色
 [0, 0, 1, 1], // 左面，蓝色
 [1, 1, 0, 1], // 右面，黄色
 [1, 0, 1, 1], // 上面，品色
 [0, 1, 1, 1] // 下面，青色
]
```

有了顶点坐标和颜色信息，接下来我们写一个方法生成立方体的顶点属性。
该方法接收三个参数：宽度、高度、深度，返回一个包含组成立方体的顶点坐标、颜色、索引的对象。

```
function createCube(width, height, depth) {
 let zeroX = width / 2;
 let zeroY = height / 2;
 let zeroZ = depth / 2;

 let cornerPositions = [
 [-zeroX, -zeroY, -zeroZ],
 [zeroX, -zeroY, -zeroZ],
 [zeroX, zeroY, -zeroZ],
 [-zeroX, zeroY, -zeroZ],
 [-zeroX, -zeroY, zeroZ],
 [-zeroX, zeroY, zeroZ],
 [zeroX, zeroY, zeroZ],
 [zeroX, -zeroY, zeroZ]
 ];
 let colorInput = [
 [255, 0, 0, 1],
 [0, 255, 0, 1],
 [0, 0, 255, 1],
 [255, 255, 0, 1],
 [0, 255, 255, 1],
 [255, 0, 255, 1]
 ];

 let colors = [];
 let positions = [];
 var indices = [];

 for (let f = 0; f < 6; ++f) {
 let faceIndices = CUBE_FACE_INDICES[f];
 let color = colorInput[f];
 for (let v = 0; v < 4; ++v) {
 let position = cornerPositions[faceIndices[v]];
 positions = positions.concat(position);
 colors = colors.concat(color);
 }
 let offset = 4 * f;
 indices.push(offset + 0, offset + 1, offset + 2);
 indices.push(offset + 0, offset + 2, offset + 3);
 }
 indices = new Uint16Array(indices);
 positions = new Float32Array(positions);
 colors = new Float32Array(colors);
 return {
 positions: positions,
 indices: indices,
 colors: colors
 };
}
```

有了生成立方体顶点的方法，我们生成一个边长为 1 的正方体：

```
var cube = createCube(1, 1, 1);
```

拿到了顶点的信息，就可以用我们熟悉的索引绘制方法来进行绘制了，这部分代码和之前一样，我们就不写了，看下效果：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201893016629a1a1667d97c~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

看到这个红色矩形，有的同学或许有疑问了：

- 我们定义的立方体的边长都是 1 ，也就是一个正方体，每个面应该是正方形，为什么渲染到屏幕后就成长方形了？
- 如何才能看到立方体的其他表面？

##### 第一个问题的答案

这是因为，我们给 gl_Position 赋的坐标，在 渲染到屏幕之前，GPU 还会对其做一次坐标变换：`视口变换`。该变换会将 NDC 坐标转换成对应设备的视口坐标。

假设有一顶点 P（0.5，0.5，0.5，1）， gl_Position 接收到坐标后，会经历如下阶段：

- 首先执行透视除法，将顶点 P 的坐标从裁剪坐标系转换到 NDC 坐标系，转换后的坐标为： `P1（0.5 / 1, 0.5 / 1, 0.5 / 1, 1 / 1）`。由于 w 分量是 1， 所以 P1 和 P 的坐标一致。
- 接着，GPU 将顶点渲染到屏幕之前，对顶点坐标执行视口变换。假设我们的 canvas 视口宽度 300，高度 400，顶点坐标在 canvas 中心。那么 3D 坐标转换成 canvas 坐标的算法是:
- canvas 坐标系 X 轴坐标 = NDC 坐标系下 X 轴坐标 \* 300 / 2 = 0.5 \* 150 = 75
- canvas 坐标系 Y 轴坐标 = NDC 坐标系下 Y 轴坐标 \* 400 / 2 = 0.5 \* 200 = 100

所以会有一个问题，立方体的每个面宽度和高度虽然都是 1 ，但是渲染效果会随着显示设备的尺寸不同而不同。

这个问题该如何解决呢？这就引出了 WebGL 坐标系的一个重要变换：`投影变换`。

##### 第二个问题的答案

因为我们绘制的是立方体，没有施加动画效果，所以我们只能看到立方体前表面，那如何看到其他表面呢？大家稍微一想就能知道，我们可以让立方体转动起来，转起来之后我们就能看到其他表面了。
那如何让立方体转动起来呢？
这就引出了 WebGL 坐标系的另一个重要变换：`模型变换`。

针对这两个问题的解决方案是对顶点施加投影和模型变换，本节采用业界常用的变换算法，暂时不做算法原理的讲解，只讲如何使用，让我们的正方体可以正常渲染并且能转动起来。

> 请谨记：每个转换可以用一个矩阵来表示，转换矩阵相乘，得出的最终矩阵用来表示组合变换。大家先记住这点，在后续讲解矩阵与变换的篇章中会详细展开。

#### 让立方体转动起来。

- 引入`模型变换`让立方体可以转动，以便我们能观察其他表面。
- 引入`投影变换`让我们的正方体能够以正常比例渲染到目标设备，不再随视口的变化而拉伸失真。

为了引入这两个变换，我们需要引入`矩阵乘法`、`绕 X 轴旋转`、`绕 Y 轴旋转`、`正交投影`四个方法，如下：

```
//返回一个单位矩阵
function identity() {}
//计算两个矩阵的乘积，返回新的矩阵。
function multiply(matrixLeft, matrixRight){}
//绕 X 轴旋转一定角度，返回新的矩阵。
function rotationX(angle) {}
//绕 Y 轴旋转一定角度，返回新的矩阵。
function rotateY(m, angle) {}
//正交投影，返回新的矩阵
function ortho(left, right, bottom, top, near, far, target) {}
```

在顶点着色器中定义一个变换矩阵，用来接收 JavaScript 中传过来的模型投影变换矩阵，同时将变换矩阵左乘顶点坐标。

```
 // 接收顶点坐标 (x, y, z)
 precision mediump float;
 attribute vec3 a_Position;
 attribute vec4 a_Color;
 varying vec4 v_Color;
 uniform mat4 u_Matrix;
 void main(){
 gl_Position = u_Matrix * vec4(a_Position, 1);
 v_Color = a_Color;
 }
```

增加旋转动画效果：每隔 50 ms 分别绕 X 轴和 Y 轴转动 1 度，然后将旋转对应的矩阵传给顶点着色器。

```
//生成单位矩阵
var initMatrix = matrix.identity();
var currentMatrix = null;
var xAngle = 0;
var yAngle = 0;
var deg = Math.PI / 180;
function animate(e) {
 if (timer) {
 clearInterval(timer);
 timer = null;
 } else {
 timer = setInterval(() => {
 xAngle += 1;
 yAngle += 1;

 currentMatrix = matrix.rotationX(deg * xAngle);
 currentMatrix = matrix.rotateY(currentMatrix, deg * yAngle);
 gl.uniformMatrix4fv(u_Matrix, false, currentMatrix);
 render(gl);
 }, 50);
 }
 }
```

我们看下效果：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201810916656d1a4ae38334~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

可以看到，渲染画面不再只是一幅静态的平面了，而是一个能够自由转动的立方体。

立方体的构建比较简单，我们看下如何使用三角面构建球体。

### 如何用三角面构建球体

> 我们学会了使用三角面构建立方体，那么球体该如何用三角面组成呢？

我们可以将球体按照纬度等分成 n 份，形成 n 个圆面，每个圆面的 Y 坐标都相同，然后将每个圆面按照经度划分成 m 份，形成 m 个顶点，这 m 个顶点的 Y 坐标也都相同。按照这个逻辑，我们思考下球体的顶点生成过程：

```
function createSphere(radius, divideByYAxis, divideByCircle) {
 let yUnitAngle = Math.PI / divideByYAxis;
 let circleUnitAngle = (Math.PI * 2) / divideByCircle;
 let positions = [];
 for (let i = 0; i <= divideByYAxis; i++) {
 let yValue = radius * Math.cos(yUnitAngle * i);
 let yCurrentRadius = radius * Math.sin(yUnitAngle * i);

 for (let j = 0; j <= divideByCircle; j++) {
 let xValue = yCurrentRadius * Math.cos(circleUnitAngle * j);
 let zValue = yCurrentRadius * Math.sin(circleUnitAngle * j);
 positions.push(xValue, yValue, zValue);
 }
 }

 let indices = [];
 let circleCount = divideByCircle + 1;
 for (let j = 0; j < divideByCircle; j++) {
 for (let i = 0; i < divideByYAxis; i++) {
 indices.push(i * circleCount + j);
 indices.push(i * circleCount + j + 1);
 indices.push((i + 1) * circleCount + j);

 indices.push((i + 1) * circleCount + j);
 indices.push(i * circleCount + j + 1);
 indices.push((i + 1) * circleCount + j + 1);
 }
 }
 return {
 positions: new Float32Array(positions),
 indices: new Uint16Array(indices)
 };
}
```

通过这个函数，我们得到了一个顶点对象，该对象包含所有顶点的坐标信息和索引信息。接下来我们为球体的每个三角面增加颜色信息。

我们知道，如果一个顶点的坐标相同，颜色不同的话，也必须视为两个顶点，否则会产生渐变颜色。因此，我们目前得到的球体的顶点仅仅坐标相同，如果我们要为每一个三角面绘制一种颜色的话，需要额外增加顶点，且不再使用`索引绘制`，而是采用`顶点数组绘制`。

```
function transformIndicesToUnIndices(vertex) {
 let indices = vertex.indices;
 let vertexsCount = indices.length;
 let destVertex = {};

 Object.keys(vertex).forEach(function(attribute) {
 if (attribute == 'indices') {
 return;
 }
 let src = vertex[attribute];
 let elementsPerVertex = getElementsCountPerVertex(attribute);
 let dest = [];
 let index = 0;
 for (let i = 0; i < indices.length; i++) {
 for (let j = 0; j < elementsPerVertex; j++) {
 dest[index] = src[indices[i] * elementsPerVertex + j];
 index++;
 }
 }
 let type = getArrayTypeByAttribName();
 destVertex[attribute] = new type(dest);
 });
 return destVertex;
}
```

该方法将我们第一步获取的球体顶点数组展开，得到所有三角形的顶点对象。

接着，我们可以为顶点施加颜色了。

```
function createColorForVertex(vertex) {
 let vertexNums = vertex.positions;
 let colors = [];
 let color = {
 r: 255,
 g: 0,
 b: 0
 };

 for (let i = 0; i < vertexNums.length; i++) {
 if (i % 36 == 0) {
 color = randomColor();
 }
 colors.push(color.r, color.g, color.b, 255);
 }

 vertex.colors = new Uint8Array(colors);
 return vertex;
}
```

生成球体顶点、增加三角面颜色这两个关键步骤做完之后，我们就可以执行绘制操作了，看下绘制后的效果：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201810916656b7d844aaaeb~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

### 构建锥体、柱体、台体

锥体、柱体、台体可以归为一类构建方法，因为它们都受上表面、下表面、高度这三个因素的影响。
按照这种思路，我们再思考下它们的构建方法：

- 定义上表面的半径：topRadius。
- 定义下表面的半径：bottomRadius。
- 定义高度：height。
- 定义横截面的切分数量：bottomDivide。
- 定义垂直方向的切分数量：verticalDivide。

生成算法如下：

```
function createCone(
 topRadius,
 bottomRadius,
 height,
 bottomDivide,
 verticalDivide
) {

 let vertex = {};
 let positions = [];
 let indices = [];

 for (let i = -1; i <= verticalDivide + 1; i++) {
 let currentRadius = 0;
 if (i > verticalDivide) {
 currentRadius = topRadius;
 } else if (i < 0) {
 currentRadius = bottomRadius;
 } else {
 currentRadius =
 bottomRadius + (topRadius - bottomRadius) * (i / verticalDivide);
 }
 let yValue = (height * i) / verticalDivide - height / 2;
 if (i == -1 || i == verticalDivide + 1) {
 currentRadius = 0;
 if (i == -1) {
 yValue = -height / 2;
 } else {
 yValue = height / 2;
 }
 }

 for (let j = 0; j <= bottomDivide; j++) {
 let xValue = currentRadius * Math.sin((j * Math.PI * 2) / bottomDivide);
 var zValue = currentRadius * Math.cos((j * Math.PI * 2) / bottomDivide);
 positions.push(xValue, yValue, zValue);
 }
 }

 // indices
 let vertexCountPerRadius = bottomDivide + 1;
 for (let i = 0; i < verticalDivide + 2; i++) {
 for (let j = 0; j < bottomDivide; j++) {
 indices.push(i * vertexCountPerRadius + j);
 indices.push(i * vertexCountPerRadius + j + 1);
 indices.push((i + 1) * vertexCountPerRadius + j + 1);

 indices.push(
 vertexCountPerRadius * (i + 0) + j,
 vertexCountPerRadius * (i + 1) + j + 1,
 vertexCountPerRadius * (i + 1) + j
 );
 }
 }

 vertex.positions = new Float32Array(positions);
 vertex.indices = new Uint16Array(indices);
 return vertex;
}
```

当我们定义上表面的半径为 0 时，得出的形体是锥体：

```
let coneVertex = createCone(6, 0, 12, 12, 12);
```

效果如下：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets2018109166576e23515ef1b~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

当我们定义上表面和下表面的半径相同，且都不为 0 时，得出的形体是柱体：

```
let coneVertex = createCone(4, 4, 12, 12, 12);
```

效果如下：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets2018109166576e460720c50~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

当我们定义上表面和下表面的半径不同，且都不为 0 时，得出的形体是台体（如圆台、棱台）：

```
let coneVertex = createCone(6, 3, 12, 12, 12);
```

效果如下：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets2018109166576e5afce7b89~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

### 回顾

本节主要教大家掌握使用普通三角面构建复杂形体的思路，顺便让大家简单了解`投影变换`和`模型变换`的用法（详细的变换我们在中级进阶深入讲解）。

下一节，我们将绘制方法封装一下，练习绘制多个模型。

---

## 第 9 章：绘制多个物体：进一步封装绘制方法

截止到目前，我们已经熟悉了 WebGL 的开发步骤：

- 初始化阶段
  - 创建所有着色器程序。
  - 寻找全部 attribute 参数位置。
  - 寻找全部 uniforms 参数位置。
  - 创建缓冲区，并向缓冲区上传顶点数据。
  - 创建纹理，并上传纹理数据。
- 首次渲染阶段
  - 为 uniforms 变量赋值。
  - 处理 attribute 变量
    - 使用 gl.bindBuffer 重新绑定模型的 attribute 变量。
    - 使用 gl.enableVertexAttribArray 启用 attribute 变量。
    - 使用 gl.vertexAttribPointer设置 attribute变量从缓冲区中读取数据的方式。
    - 使用 gl.bufferData 将数据传送到缓冲区中。
  - 使用 gl.drawArrays 执行绘制。
- 后续渲染阶段
  - 对发生变化的 uniforms 变量重新赋值。
  - 每个模型的 attribute 变量。
    - 使用 gl.bindBuffer 重新绑定模型的 attribute 变量。
    - 使用 gl.bufferData 重新向缓冲区上传模型的 attribute 数据。
  - 使用 gl.drawArrays 执行绘制。

这就是 WebGL 的基本绘制流程，但是这些只是在绘制单个模型时的步骤。思考一下，如果我们有多个模型，会碰到哪些问题？如何进行优化？

> 这里提到了模型的概念，3D 中的模型是由顶点`vertex`组成，顶点之间连成三角形，多个三角形就能够组成复杂的立体模型。简单模型诸如立方体、球体等，复杂模型诸如汽车、茶壶等。类比到现实世界中，模型可以理解为现实生活中看得见摸得着的物体。

### 创建模型类

每个模型都有对应的顶点数据，包含顶点位置、颜色、法向量、纹理坐标等，我们将这些数据用一个顶点缓冲对象来表示，每个属性对应一个 `attribute` 变量。除了顶点数据，还需要有众多 `uniforms` 变量，uniforms 变量存储和顶点无关的属性，比如`模型变换矩阵`、模型视图投影矩阵`MVP`，（后续我们用 `MVP` 指代模型视图投影矩阵），法向量矩阵，光照等。既然模型有这么多共同的属性，那么我们把模型抽象出来。

定义一个模型类，模型类自身属性有模型矩阵`u_ModelMatrix`，MVP 矩阵`u_Matrix`，以及所有的 uniforms 变量，顶点缓冲数据。

```
//模型类
function Model(bufferInfo, uniforms ){
 this.uniforms = uniforms || {};
 this.u_Matrix = matrix.identity();
 this.bufferInfo = bufferInfo || {};
 
 // 偏移
 this.translation = [0, 0, 0];
 // 旋转角度
 this.rotation = [0, 0, 0];
 // 缩放
 this.scalation = [1, 1, 1];
}
```

> matrix.identity 方法生成一个单位矩阵。

#### 设置顶点对象

提供一个为模型提供顶点数据的方法，顶点数据用一个对象表示，对象的属性用着色器中属性名称来 表示，对应顶点属性。一个完整的 `bufferInfo` 包含如下内容：

```
bufferInfo = {
 attributes:{
 a_Positions: {
 buffer: buffer,
 type: gl.FLOAT,
 normalize: false,
 numsPerElement: 4,
 },
 a_Colors:{
 buffer:buffer,
 type: gl.UNSIGNED_BYTE,
 normalize: true,
 numsPerElement: 4
 },
 a_Normals:{
 buffer:buffer,
 type: gl.FLOAT,
 normalize: false,
 numsPerElement: 3
 },
 a_Texcoords:{
 buffer:buffer,
 type: gl.FLOAT,
 normalize: false,
 numsPerElement: 2
 }
 },
 indices:[],
 elementsCount: 30
}
```

`indices` 代表顶点的索引数组， `elementsCount` 表示顶点的个数。buffer 代表 WebGL 创建的 buffer 对象，里面存储着对应的顶点数据。

顶点数据对象除了可以在初始化时为 model 设置以外，还需要为 model 提供一个单独设置方法：

```
Model.prototype.setBufferInfo = function(bufferInfo){
 this.bufferInfo = bufferInfo || {};
}
```

我们最初得到的顶点模型数据一般是这种格式的：

```
let vertexObject = {
 positions: [],
 normals: [],
 texcoords: [],
 indices: [],
 colors: []
}
```

这和我们上面设置的字段格式都不同，所以我们要添加一个适配器转换一下。

#### 设置模型状态

我们需要一些方法能够随时对模型对象的信息进行修改，比如位移，旋转角度，缩放比例等，最后还需要增加一个 preRender 预渲染方法，在绘制之前更新矩阵。

##### 设置模型位移。

位移的设置包含同时对三个分量设置以及对每个分量单独设置：

- translate：对模型设置 X 轴、Y 轴、Z 轴方向的偏移。
- translateX：对模型设置 X 轴偏移。
- translateY：对模型设置 Y 轴偏移。
- translateZ：对模型设置 Z 轴偏移。

```
Model.prototype.translate = function(tx, ty, tz){
 this.translateX(tx);
 this.translateY(ty);
 this.translateZ(tz);
}
Model.prototype.translateX = function(tx){
 this.translation[0] = tx || 0;
}
Model.prototype.translateY = function(ty){
 this.translation[1] = ty || 0;
}
Model.prototype.translateZ = function(tz){
 this.translation[2] = tz || 0;
}
```

##### 设置模型缩放比例。

缩放比例的设置包含同时对三个分量设置以及对每个分量单独设置：

- scale：对模型设置 X 轴、Y 轴、Z 轴上的缩放比例。
- scaleX：对模型设置 X 轴缩放比例。
- scaleY：对模型设置 Y 轴缩放比例。
- scaleZ：对模型设置 Z 轴缩放比例。

```
Model.prototype.scale = function(sx, sy, sz){
 this.scaleX(sx);
 this.scaleY(sy);
 this.scaleZ(sz);
}
Model.prototype.scaleX = function(sx){
 this.scalation[0] = sx || 1;
}
Model.prototype.scaleY = function(sy){
 this.scalation[1] = sy || 1;
}
Model.prototype.scaleZ = function(sz){
 this.scalation[2] = sz || 1;
}
```

##### 设置模型旋转角度。

模型旋转角度的设置包含同时对三个分量设置以及对每个分量单独设置：

- rotate：对模型设置 X轴、Y轴、Z 轴上的旋转角度。
- rotateX：对模型设置 X 轴旋转角度。
- rotateY：对模型设置 Y 轴旋转角度。
- rotateZ：对模型设置 Z 轴旋转角度。

```
Model.prototype.rotate = function(rx, ry, rz){
 this.rotateX(rx);
 this.rotateY(ry);
 this.rotateZ(rz);
}
Model.prototype.rotateX = function(rx){
 this.rotation[0] = rx || 0;
}
Model.prototype.rotateY = function(ry){
 this.rotation[1] = ry || 0;
}
Model.prototype.rotateZ = function(rz){
 this.rotation[2] = rz || 0;
}
```

##### 预渲染。

在将模型矩阵以及模型的 MVP 矩阵传递给 GPU 之前，我们对模型矩阵以及 MVP 矩阵重新计算。

- rotate：对模型设置 X 轴、Y 轴、Z 轴上的旋转角度。
- rotateX：对模型设置 X 轴旋转角度。
- rotateY：对模型设置 Y 轴旋转角度。
- rotateZ：对模型设置 Z 轴旋转角度。

```
Model.prototype.preRender = function( viewMatrix, projectionMatrix){
 let modelMatrix = matrix.identity();
 if (this.translation) {
 modelMatrix = matrix.translate(
 modelMatrix,
 this.translation[0],
 this.translation[1],
 this.translation[2]
 );
 }
 if (this.rotation) {
 if (this.rotation[0] !== undefined)
 modelMatrix = matrix.rotateX(modelMatrix, degToRadians(this.rotation[0]));
 if (this.rotation[1] !== undefined)
 modelMatrix = matrix.rotateY(modelMatrix, degToRadians(this.rotation[1]));
 if (this.rotation[2] !== undefined)
 modelMatrix = matrix.rotateZ(modelMatrix, degToRadians(this.rotation[2]));
 }
 if (this.scalation) {
 modelMatrix = matrix.scale(
 modelMatrix,
 this.scalation[0],
 this.scalation[1],
 this.scalation[2]
 );
 }

 this.u_ModelMatrix = modelMatrix;

 //重新计算 MVP 矩阵

 this.u_Matrix = matrix.multiply(viewMatrix, this.u_ModelMatrix);
 this.u_Matrix = matrix.multiply(projectionMatrix, this.u_Matrix);
}
```

#### 封装顶点数据的操作

最为重要的是顶点数据，它们是模型的基本组成元素，顶点数据一般包含如下几个属性：

- 颜色信息
- 位置信息
- 法向量信息
- 索引信息
- 纹理坐标

```
bufferInfo = {
 colors: [],
 positions: [],
 normals: [],
 indices: [],
 texcoords: []
}
```

我们有了这些顶点信息，还需要通过 attribute 变量传递给 GPU，所以，我们还需要找到对应的 attribute 变量。

在着色器中命名 attribute 变量时，我们通常使用 `a_` 开头，后面跟着顶点属性名称，按照这种规范命名也方便我们在 JavaScript 中对变量进行赋值。

```
attribute vec4 a_Positions;
attribute vec3 a_Normals;
attribute vec2 a_Texcoords;
attribute vec4 a_Colors;
```

那么我们查找变量时，可以这样查找：

```
let attributesCount = gl.getProgramParameter(program, param);
```

当 pname 为 gl.ACTIVE\_ATTRIBUTES时，返回program绑定的顶点着色器中 attribute 变量的数量 attributesCount。

有了变量数量，我们就可以对变量进行遍历了。

```
for(let i = 0; i< attributesCount; i++){
 let attributeInfo = gl.getActiveAttrib(program, i);
}
```

attributeInfo 对象包含 attribute 的变量名称 name，有了`name`我们就能够用 JavaScript 查找该 attribute 变量了：

```
let attributeIndex = gl.getAttribLocation(program, attributeInfo.name);
```

接着是熟悉的对变量的启用、读取缓冲区方式的设置了，我们将这些操作封装到一个方法中。

```
function createAttributeSetter(attributeIndex){
 return function(bufferInfo){
 gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
 gl.enableVertexAttribArray(attributeIndex);
 gl.vertexAttribPointer(
 attributeIndex,
 bufferInfo.numsPerElement || bufferInfo.size,
 bufferInfo.type || gl.FLOAT,
 bufferInfo.normalize || false,
 bufferInfo.stride || 0,
 bufferInfo.offset || 0
 );
 }
}
```

定义一个 attribute 变量设置对象，对每个 attribute 绑定上面实现的设置方法`createAttributeSetter`。

```
let attributeSetter = {};
for(let i = 0; i< attributesCount; i++){
 let attributeInfo = gl.getActiveAttrib(program, i);
 let attributeIndex = gl.getAttribLocation(program, attributeInfo.name);
 attributeSetter[attributeInfo.name] = createAttributeSetter(attributeIndex);
}
return attributeSetter;
```

以上是对着色器的各个attribute变量初始化操作，那么当我们需要对这些变量赋值时，就可以调用attribute 变量对应的 setter 函数对 attribute 进行设置了。

#### 封装 uniforms 变量操作。

那么，除了 attribute 变量，程序中还充斥着很多 uniforms 变量，uniforms 变量是与顶点无关的，即不管执行多少遍顶点操作， uniforms 变量始终保持不变。

像 attribute 变量一样，我们仍然需要先找到所有 uniforms 变量：

```
let uniformsCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
```

之后，遍历所有 uniforms 变量，根据 uniforms 变量名称，生成 uniforms 赋值函数。

```
let uniformSetters = {};
for(let i = 0; i< uniformsCount; i++){
 let uniformInfo = gl.getActiveUniform(program, i);
 if (!uniformInfo) {
 break;
 }
 let name = uniformInfo.name;
 if (name.substr(-3) === '[0]') {
 name = name.substr(0, name.length - 3);
 }
 var setter = createUniformSetter(gl, program, uniformInfo);
 uniformSetters[name] = setter;
}
```

uniforms 赋值函数比较繁琐一些，只因 uniforms 变量类型比较多，我们需要针对 uniforms 变量类型，编写对应的赋值函数。

```
let enums = {
 FLOAT_VEC2: {
 value: 0x8B50,
 setter: function(location, v){
 gl.uniform2fv(location, v);
 }
 },
 FLOAT_VEC3: {
 value: 0x8B51,
 setter: function(location, v){
 gl.uniform3fv(location, v);
 }
 },
 FLOAT_VEC4: {
 value: 0x8B52,
 setter: function(location, v){
 gl.uniform4fv(location, v);
 }
 },
 INT_VEC2: {
 value: 0x8B53,
 setter: function(location, v){
 gl.uniform2iv(location, v);
 }
 },
 INT_VEC3: {
 value: 0x8B54,
 setter: function(location, v){
 gl.uniform3iv(location, v);
 }
 },
 INT_VEC4: {
 value: 0x8B55,
 setter: function(location, v){
 gl.uniform4iv(location, v);
 }
 },
 BOOL: {
 value: 0x8B56,
 setter: function(location, v){
 gl.uniform1iv(location, v);
 }
 },
 BOOL_VEC2: {
 value: 0x8B57,
 setter: function(location, v){
 gl.uniform2iv(location, v);
 }
 },
 BOOL_VEC3: {
 value: 0x8B58,
 setter: function(location, v){
 gl.uniform3iv(location, v);
 }
 },
 BOOL_VEC4: {
 value: 0x8B59,
 setter: function(location, v){
 gl.uniform4iv(location, v);
 }
 },
 FLOAT_MAT2: {
 value: 0x8B5A,
 setter: function(location, v){
 gl.uniformMatrix2fv(location, false, v);
 }
 },
 FLOAT_MAT3: {
 value: 0x8B5B,
 setter: function(location, v){
 gl.uniformMatrix3fv(location, false, v);
 }
 },
 FLOAT_MAT4: {
 value: 0x8B5C,
 setter: function(location, v){
 gl.uniformMatrix4fv(location, false, v);
 }
 },
 SAMPLER_2D: {
 value: 0x8B5E,
 setter: function(location, texture){
 gl.uniform1i(location, 0);
 gl.activeTexture(gl.TEXTURE0);
 gl.bindTexture(gl.TEXTURE_2D, texture);
 }
 },
 SAMPLER_CUBE: {
 value: 0x8B60,
 setter: function(location, texture){
 gl.uniform1i(location, 0);
 gl.activeTexture(gl.TEXTURE0);
 gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
 }
 },
 
 INT: {
 value: 0x1404,
 setter: function(location, v){
 gl.uniform1i(location, v);
 }
 },
 
 FLOAT: {
 value: 0x1406,
 setter: function(location, v){
 gl.uniform1f(location, v);
 }
 }
};
```

enums 是所有的变量类型，但没有包含普通数组，所以我们还需要通过 uniformInfo.size 属性判断该 uniform 变量是否是数组，uniform 变量的 size 大于 1 并且该变量名称的最后三个字符是`[0]`，说明该 uniform 变量是数组类型，大家可以尝试一下。

> 有两点需要大家注意：  
> 1、如果 uniform 或者 attribute 变量只是在着色器中进行了定义，但没有被使用，那么它将被编译器抛弃，我们通过`gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)`这种方式获取不到该变量。  
> 2、uniform 和 attribute 变量的数量并不是可以无限定义的，而是有一定上限，不同平台/浏览器实现差异较大（规范只规定了最小值），可通过 `gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)` 等常量实测查询，如果定义数量超过这个上限，着色器程序会报编译错误。

```
function createUniformSetter(gl, program, uniformInfo) {
 let uniformLocation = gl.getUniformLocation(program, uniformInfo.name);
 let type = uniformInfo.type;
 let isArray = uniformInfo.size > 1 && uniformInfo.name.substr(-3) === '[0]';
 
 if(isArray && type == enums.INT.value){
 return function(v) {
 gl.uniform1iv(uniformLocation, v);
 };
 }
 if(isArray && type == enums.FLOAT.value){
 return function(v) {
 gl.uniform1fv(uniformLocation, v);
 };
 }
 return function createSetter(v){
 return enums[getKeyFromType(type)].setter(uniformLocation, v)
 }
}
```

以上就是 uniforms 变量的初始化过程，相对繁琐，但比较简单，容易理解。

### 绘制多个物体

既然有了模型类、uniforms 和 attribute 变量的赋值函数，接下来我们就可以创建一个模型列表和一个渲染列表，模型列表中存放所有模型对象，渲染列表中存放着待渲染的对象。

```
// 渲染列表
let renderList = new List();
// 模型列表
let modelList = new List();

// 列表类
function List(list){
 this.list = list || [];
 this.uuid = list.length;
}
// 添加对象
List.prototype.add = function(object){
 object.uuid = this.uuid;
 this.list.push(object);
 this.uuid++;
}
// 删除对象
List.prototype.remove = function(object){
 this.list.splice(object.uuid, 1);
}
// 查找对象
List.prototype.get = function(index){
 return this.list[index];
}
// 遍历列表
List.prototype.forEach = function(callback){
 return this.list.forEach(callback);
}
```

模型列表和渲染列表的区别在于，渲染列表只存储和渲染相关的数据，比如着色器程序，模型的顶点缓冲数据，uniforms 数据等。

一个完整的模型对象有如下内容：

```
let modelObject={
 // 偏移状态
 translation:[0, 0, 0],
 // 缩放状态
 scalation:[1, 1, 3],
 // 旋转状态
 rotation:[30, 60, 100],
 bufferInfo:{
 // 顶点属性
 attributes:{
 // 顶点坐标
 a_Position: {
 buffer: [],
 type: gl.FLOAT,
 normalize: false,
 numsPerElement: 4
 },
 ...
 },
 // 顶点索引
 indices: [],
 // 顶点数量
 elementsCount: 30
 },
 uniforms: {
 // MVP 矩阵
 u_Matrix: ...,
 // 模型矩阵
 u_ModelMatrix: ...,
 // 法向量矩阵
 u_NormalMatrix: ...,
 // 全局光照
 u_LightColor: ...,
 ...
 }
}
```

而一个渲染对象通常包含对应模型的几个属性：

```
let renderObject = {
 // 模型
 bufferInfo: modelObject.bufferInfo,
 program: program,
 uniforms: modelObject.uniforms,
}
```

添加一个新模型时，我们只需要初始化模型对象，添加到 modelList 中，同时往 renderList 中添加渲染对象。

```
let cube = createCube(5, 5, 5);
let cubeModel = new Model(cube);
modelList.add(cubeModel);
let renderObject= {
 program: program,
 model: cubeModel,
 primitive: 'TRIANGLES',
 renderType: 'drawArrays'
}
renderList.add(renderObject);
```

每次渲染时，首先遍历 modelList 中的模型对象，计算模型的 uniforms 变量，比如代表模型状态的 MVP 矩阵，模型矩阵，法向量矩阵等，以及顶点数据 bufferInfo，然后遍历 renderList 中的渲染对象，设置对应的 bufferInfo 和 uniforms 变量 ，执行绘制即可。

```
modelList.forEach(function(modelObject){
 // 计算相关 uniforms 属性。
 modelObject.preRender();
})
renderList.forEach(function(renderObject){
 let bufferInfo = renderObject.model.bufferInfo;
 let uniforms = renderObject.model.uniforms;
 let program = renderObject.program;
 // 往顶点缓冲区传递数据
 setBufferInfos(gl, program, bufferInfo);
 // 设置 uniforms 变量。
 setUniforms(gl, program, uniforms);
 // 绘制
 if (renderObject.renderType === 'drawElements') {
 if (bufferInfo.indices) {
 gl.drawElements(renderObject.primitive, bufferInfo.indices.length, gl.UNSIGNED_SHORT, 0);
 return;
 } else {
 console.warn('model buffer does not support indices to draw');
 return;
 }
 } else {
 gl.drawArrays(gl[renderObject.primitive], 0, bufferInfo.elementsCount);
 }
})
```

### 演示

接下来我们用上面的代码演示一下绘制多个模型的场景，利用之前写好的立方体和球体生成函数，我们生成 200 个模型，随机分配颜色，请注意由于目前强制要求一个模型的顶点必须包含`颜色`、`坐标`、`纹理坐标`、`法向量`的，所以我们的模型生成函数必须要有能力生成这些属性。

```
let cube = createCube(2, 2, 2);
// 将带索引的立方体顶点数据转化成无索引的顶点数据
cube = transformIndicesToUnIndices(cube);
// 为顶点数据添加颜色信息
createColorForVertex(cube);
let sphere = createSphere(1, 10, 10);
// 将带索引的球体顶点数据转化成无索引的顶点数据
sphere = transformIndicesToUnIndices(sphere);
// 为顶点数据添加颜色信息
createColorForVertex(sphere);
```

根据上面的顶点数据生成模型缓冲对象：

```
// 生成立方体的顶点缓冲对象
let cubeBufferInfo = createBufferInfoFromObject(gl, cube);
// 生成球体的顶点缓冲对象
let sphereBufferInfo = createBufferInfoFromObject(gl, sphere);
```

创建模型列表和渲染列表,这里我们选择创建 100 个模型

```
let modelList = new List();
let renderList = new List();
for (var i = 0; i < 100; ++i) {
 var object = new Model();
 if (i % 2 == 0) {
 object.setBufferInfo(cubeBufferInfo);
 } else {
 object.setBufferInfo(sphereBufferInfo);
 }
 // 设置模型的位置
 object.translate(rand(-10, 10), rand(-10, 10), rand(-10, 10));
 // 设置模型的旋转角度
 object.rotate(rand(0, 90));
 // 预渲染
 object.preRender(viewMatrix, projectionMatrix);
 // 设置模型的 uniforms 属性。
 object.setUniforms({
 u_ModelMatrix: object.u_ModelMatrix,
 u_Matrix: object.u_Matrix,
 u_ColorFactor: new Float32Array([rand(0.5, 0.75), rand(0.5, 0.75), rand(0.25, 0.5)])
 })

 modelList.add(object);
 // 根据模型对象创建渲染对象，并将渲染对象添加到渲染列表中
 renderList.add({
 programInfo: program,
 model: object,
 primitive: gl.TRIANGLES,
 renderType: 'drawArrays'
 });
}
```

有了模型列表和渲染列表，接下来我们就可以执行渲染操作了，渲染操作是遍历渲染列表，重新设置模型的 bufferInfo 和 uniforms 属性，然后执行绘制。

```
function render() {
 if (!playing) {
 requestAnimationFrame(render);
 return;
 }
 // 重新设置模型的状态
 modelList.forEach(function (object) {
 object.rotateX(object.rotation[0] + rand(0.2, 0.5));
 object.rotateY(object.rotation[1] + rand(0.2, 0.5));
 object.rotateZ(object.rotation[2] + rand(0.2, 0.5));
 object.preRender(viewMatrix, projectionMatrix);
 object.setUniforms({
 u_ModelMatrix: object.u_ModelMatrix,
 u_Matrix: object.u_Matrix,
 })
 })
 // 执行渲染
 let lastProgram;
 let lastBufferInfo;
 renderList.forEach(function (object) {
 let programInfo = object.programInfo;
 let bufferInfo = object.model.bufferInfo;
 let uniforms = object.model.uniforms;
 let bindBuffers = false;
 if (programInfo !== lastProgram) {
 lastProgram = programInfo;
 gl.useProgram(programInfo.program);
 bindBuffers = true;
 }

 if (bindBuffers || bufferInfo !== lastBufferInfo) {
 lastBufferInfo = bufferInfo;
 setBufferInfos(gl, programInfo, bufferInfo);
 }
 setUniforms(programInfo, uniforms);

 // 绘制
 if (object.renderType === 'drawElements') {
 if (bufferInfo.indices) {
 gl.drawElements(object.primitive, bufferInfo.indices.length, gl.UNSIGNED_SHORT, 0);
 return;
 } else {
 console.warn('model buffer does not support indices to draw');
 return;
 }
 } else {
 gl.drawArrays(gl[object.primitive], 0, bufferInfo.elementsCount);
 }
 });
 requestAnimationFrame(render);
 }
```

上面这些就是重构后的调用代码，是不是简洁了很多？我们看下效果：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets2018116166e7faf5af2477e~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

### 回顾

本节将之前的代码进行重构优化，大家可以看到一些前面用到的、没有用到的函数，比如 `uniforms` 属性赋值函数，虽然种类很多，但是很容易就能够见名知意。之前代码有用到 `gl.uniform1f` 给变量赋值单个 `float` 类型的数字，其他类似的函数也是为了给 uniform 变量赋值，只是赋值类型不同。

通过对重用代码进行封装，我们能够以很少的代码绘制多个模型，并且不用再去编写繁琐的`buffer` 和 `uniform` 的赋值代码，我们把精力放在编写模型的状态逻辑上，这大大地提高了我们的开发效率。

下一节我们开始学习光照效果，光照效果涉及到一些物理学知识，大家先别急着看代码，先理解下物理知识，然后多做实践，相信大家很快就能掌握。


