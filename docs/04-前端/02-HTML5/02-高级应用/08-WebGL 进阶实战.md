---
title: WebGL 进阶实战
description: 从 Canvas 2D 迈向 3D —— 矩阵变换、纹理、光照与渲染循环的深度实践
keywords: [WebGL, 3D, 着色器, 纹理, 矩阵变换]
category: HTML5
tags: [HTML5, WebGL, 图形渲染]
---

# WebGL 进阶实战

> 本文是 [`Canvas` 文档第 14 节 · WebGL 基础](../01-基础知识/12-Canvas/01-导读与1.%20概述至15.%20性能优化深度指南.md) 的延伸。基础概念（上下文获取、着色器编译、绘制矩形）请先阅读该节，本文聚焦 **3D 渲染、纹理、光照与渲染循环** 等进阶主题。

## 1. 坐标系与矩阵变换

WebGL 的裁剪空间是 `[-1, 1]` 的立方体制，要渲染 3D 场景必须手动管理**模型-视图-投影矩阵（MVP）**。浏览器原生不提供矩阵库，通常使用 `gl-matrix` 或手写工具函数。

```js
// 投影矩阵：透视投影，让远小近大
function perspective(out, fovy, aspect, near, far) {
  const f = 1.0 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
  out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
  out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
  out[12] = 0; out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
  return out;
}
```

顶点着色器中应用 MVP 矩阵：

```glsl
attribute vec3 a_position;
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

void main() {
  gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
}
```

:::: tip 提示
生产项目强烈建议直接使用 [`gl-matrix`](https://glmatrix.net/) 而非手写矩阵，避免数值与转置顺序错误。
::::

## 2. 纹理加载

纹理将图像贴到几何表面，是 3D 真实感的关键。

```js
function createTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // 占位 1x1 像素，等待图片加载
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([128, 128, 128, 255]));

  const image = new Image();
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    // 非 2 的幂尺寸需设置包裹与过滤
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  };
  image.src = url;
  return texture;
}
```

### 纹理参数速查

| 参数 | 常用值 | 作用 |
| ---- | ------ | ---- |
| `TEXTURE_MIN_FILTER` | `LINEAR` / `NEAREST_MIPMAP_LINEAR` | 缩小时过滤 |
| `TEXTURE_MAG_FILTER` | `LINEAR` / `NEAREST` | 放大时过滤 |
| `TEXTURE_WRAP_S/T` | `REPEAT` / `CLAMP_TO_EDGE` | 越界包裹（WebGL1 中仅 2 的幂尺寸可用 REPEAT，WebGL2 已解除此限制） |

## 3. 光照基础（冯氏模型）

在片段着色器中实现简易漫反射光照：

```glsl
precision mediump float;
varying vec3 v_normal;
uniform vec3 u_lightDir;

void main() {
  vec3 normal = normalize(v_normal);
  float diffuse = max(dot(normal, normalize(u_lightDir)), 0.0);
  vec3 color = vec3(0.2, 0.6, 0.9) * (0.3 + 0.7 * diffuse); // 环境 + 漫反射
  gl_FragColor = vec4(color, 1.0);
}
```

顶点着色器需将法线变换到世界空间并传给片段着色器（`varying vec3 v_normal`）。

## 4. 渲染循环

使用 `requestAnimationFrame` 驱动持续渲染，并在每一帧更新矩阵实现动画：

```js
let angle = 0;
function render() {
  angle += 0.01;
  // 更新模型矩阵（绕 Y 轴旋转）
  mat4.rotateY(modelMatrix, modelMatrix, angle);
  gl.uniformMatrix4fv(u_modelLoc, false, modelMatrix);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
```

:::: warning 注意
启用深度测试需在初始化时调用 `gl.enable(gl.DEPTH_TEST)`，否则 3D 物体会出现前后遮挡错误。
::::

## 5. WebGL 与 Three.js 的关系

| 方案 | 适用场景 | 学习成本 |
| ---- | -------- | -------- |
| 原生 WebGL | 极致性能控制、自定义着色器、教学理解 | 高 |
| Three.js | 快速搭建 3D 场景、产品级应用 | 中 |

对于大多数业务 3D 需求，推荐基于 Three.js 开发，仅在需要特殊渲染管线时回到原生 WebGL。

### 浏览器兼容性

WebGL 1.0 与 2.0 在所有现代浏览器均受支持（详见 Canvas 文档兼容性表）。移动端需注意 GPU 显存与发热控制，复杂场景建议降低分辨率或帧率。
