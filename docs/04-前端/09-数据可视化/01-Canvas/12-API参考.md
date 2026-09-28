---
title: API参考
description: "Canvas 2D API 参考：涵盖 Canvas 元素、OffscreenCanvas、绘图/路径/样式/变换/文本/图像方法、像素操作、合成属性、滤镜与 Path2D 等接口速查。"
keywords: [API参考]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---


# Canvas API 参考

本文档提供 Canvas 2D API 的完整参考，包括所有方法、属性和常量。

## Canvas 元素

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `width` | Number | 画布宽度（像素） |
| `height` | Number | 画布高度（像素） |

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `getContext(contextType)` | CanvasRenderingContext2D | 获取渲染上下文 |
| `toDataURL(type, quality)` | String | 返回画布的 data URL |
| `toBlob(callback, type, quality)` | void | 返回画布的 Blob 对象 |
| `transferControlToOffscreen()` | OffscreenCanvas | 将控制权转移到离屏画布 |

### 使用示例

```javascript
const canvas = document.getElementById('myCanvas')

// 设置尺寸
canvas.width = 800
canvas.height = 600

// 获取 2D 上下文
const ctx = canvas.getContext('2d')

// 获取图像数据
const dataURL = canvas.toDataURL('image/png')

// 获取 Blob
canvas.toBlob((blob) => {
  // 处理 Blob
}, 'image/png', 0.9)

// 转移到离屏画布
const offscreen = canvas.transferControlToOffscreen()
```

---

## OffscreenCanvas

OffscreenCanvas 提供了在 Worker 中进行 Canvas 渲染的能力，可以避免阻塞主线程。

### 创建方式

```javascript
// 方式1：直接创建
const offscreen = new OffscreenCanvas(800, 600)

// 方式2：从现有 Canvas 转移
const canvas = document.getElementById('myCanvas')
const offscreen = canvas.transferControlToOffscreen()
```

### 在 Worker 中使用

```javascript
// main.js
const canvas = document.getElementById('myCanvas')
const offscreen = canvas.transferControlToOffscreen()
const worker = new Worker('renderer.js')

worker.postMessage({ canvas: offscreen }, [offscreen])

// renderer.js (Worker)
self.onmessage = function(e) {
  const canvas = e.data.canvas
  const ctx = canvas.getContext('2d')
  
  // 在 Worker 中渲染
  ctx.fillStyle = '#3498db'
  ctx.fillRect(0, 0, 100, 100)
}
```

### 与主线程同步

```javascript
// Worker 中渲染完成后通知主线程
const bitmap = offscreen.transferToImageBitmap()
self.postMessage({ bitmap }, [bitmap])

// 主线程接收
worker.onmessage = function(e) {
  const ctx = canvas.getContext('2d')
  ctx.drawImage(e.data.bitmap, 0, 0)
}
```

---

## 2D 渲染上下文

### 获取方式

```javascript
const ctx = canvas.getContext('2d')

// 带选项获取（与上面二选一，不能重复声明）
// const ctx = canvas.getContext('2d', {
//   alpha: false,      // 不透明画布
//   desynchronized: true // 低延迟渲染
// })
```

---

## 绘图方法

### 矩形绘制

| 方法 | 参数 | 说明 |
|------|------|------|
| `fillRect(x, y, width, height)` | x, y: 坐标<br>width, height: 尺寸 | 绘制填充矩形 |
| `strokeRect(x, y, width, height)` | x, y: 坐标<br>width, height: 尺寸 | 绘制描边矩形 |
| `clearRect(x, y, width, height)` | x, y: 坐标<br>width, height: 尺寸 | 清除矩形区域 |
| `roundRect(x, y, width, height, radii)` | x, y: 坐标<br>width, height: 尺寸<br>radii: 圆角半径 | 创建圆角矩形路径 |

```javascript
ctx.fillRect(10, 10, 100, 50)
ctx.strokeRect(120, 10, 100, 50)
ctx.clearRect(30, 20, 60, 30)

// roundRect 方法（现代浏览器）
ctx.beginPath()
ctx.roundRect(250, 10, 100, 50, 10) // 圆角半径 10
ctx.fill()

// 支持每个角不同半径
ctx.beginPath()
ctx.roundRect(250, 80, 100, 50, [5, 10, 15, 20]) // 左上、右上、右下、左下
ctx.fill()
```

---

## 路径方法

### 路径操作

| 方法 | 参数 | 说明 |
|------|------|------|
| `beginPath()` | 无 | 开始新路径 |
| `closePath()` | 无 | 闭合当前路径 |
| `fill()` | 无 | 填充当前路径 |
| `stroke()` | 无 | 描边当前路径 |
| `clip()` | 无 | 创建裁剪路径 |
| `isPointInPath(x, y)` | x, y: 坐标 | 判断点是否在路径内 |
| `isPointInStroke(x, y)` | x, y: 坐标 | 判断点是否在描边上 |

### 路径绘制

| 方法 | 参数 | 说明 |
|------|------|------|
| `moveTo(x, y)` | x, y: 坐标 | 移动到指定点 |
| `lineTo(x, y)` | x, y: 坐标 | 画线到指定点 |
| `rect(x, y, width, height)` | x, y: 坐标<br>width, height: 尺寸 | 创建矩形路径 |
| `arc(x, y, radius, startAngle, endAngle, anticlockwise)` | x, y: 圆心<br>radius: 半径<br>startAngle, endAngle: 弧度<br>anticlockwise: 方向 | 创建圆弧路径 |
| `arcTo(x1, y1, x2, y2, radius)` | x1, y1: 控制点1<br>x2, y2: 控制点2<br>radius: 半径 | 创建圆角路径 |
| `quadraticCurveTo(cp1x, cp1y, x, y)` | cp1x, cp1y: 控制点<br>x, y: 终点 | 二次贝塞尔曲线 |
| `bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)` | cp1x, cp1y: 控制点1<br>cp2x, cp2y: 控制点2<br>x, y: 终点 | 三次贝塞尔曲线 |

### Path2D

```javascript
// 创建 Path2D 对象
const path = new Path2D()
path.rect(10, 10, 100, 50)

// 从 SVG 路径创建
const svgPath = new Path2D('M 10 10 L 100 10 L 100 60 Z')

// 使用路径
ctx.fill(path)
ctx.stroke(path)
```

---

## 样式属性

### 填充与描边

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `fillStyle` | String/CanvasGradient/CanvasPattern | 'black' | 填充样式 |
| `strokeStyle` | String/CanvasGradient/CanvasPattern | 'black' | 描边样式 |

### 线条样式

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `lineWidth` | Number | 1 | 线条宽度 |
| `lineCap` | String | 'butt' | 线条端点样式 |
| `lineJoin` | String | 'miter' | 线条连接样式 |
| `miterLimit` | Number | 10 | 斜接限制 |
| `lineDashOffset` | Number | 0 | 虚线偏移量 |

**lineCap 值：** 'butt' | 'round' | 'square'

**lineJoin 值：** 'miter' | 'round' | 'bevel'

### 虚线

| 方法 | 参数 | 说明 |
|------|------|------|
| `setLineDash(segments)` | segments: 数组 | 设置虚线样式 |
| `getLineDash()` | 无 | 获取虚线样式 |

```javascript
ctx.setLineDash([10, 5])
ctx.strokeRect(10, 10, 100, 50)
```

### 阴影

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `shadowColor` | String | 'rgba(0,0,0,0)' | 阴影颜色 |
| `shadowBlur` | Number | 0 | 阴影模糊程度 |
| `shadowOffsetX` | Number | 0 | 阴影 X 轴偏移 |
| `shadowOffsetY` | Number | 0 | 阴影 Y 轴偏移 |

### 渐变

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `createLinearGradient(x0, y0, x1, y1)` | 起点和终点坐标 | CanvasGradient | 创建线性渐变 |
| `createRadialGradient(x0, y0, r0, x1, y1, r1)` | 两个圆的参数 | CanvasGradient | 创建径向渐变 |

#### CanvasGradient 方法

| 方法 | 参数 | 说明 |
|------|------|------|
| `addColorStop(offset, color)` | offset: 位置(0-1)<br>color: 颜色 | 添加颜色停止点 |

```javascript
const gradient = ctx.createLinearGradient(0, 0, 200, 0)
gradient.addColorStop(0, 'red')
gradient.addColorStop(1, 'blue')
ctx.fillStyle = gradient
```

### 图案

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `createPattern(image, repetition)` | image: 图像源<br>repetition: 重复模式 | CanvasPattern | 创建图案 |

**repetition 值：** 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'

---

## 变换方法

| 方法 | 参数 | 说明 |
|------|------|------|
| `save()` | 无 | 保存当前状态 |
| `restore()` | 无 | 恢复保存的状态 |
| `translate(x, y)` | x, y: 偏移量 | 平移坐标系 |
| `rotate(angle)` | angle: 弧度 | 旋转坐标系 |
| `scale(x, y)` | x, y: 缩放因子 | 缩放坐标系 |
| `transform(a, b, c, d, e, f)` | 变换矩阵参数 | 叠加变换 |
| `setTransform(a, b, c, d, e, f)` | 变换矩阵参数 | 设置变换 |
| `resetTransform()` | 无 | 重置变换矩阵 |

---

## 文本方法

### 方法

| 方法 | 参数 | 说明 |
|------|------|------|
| `fillText(text, x, y, maxWidth)` | text: 文本<br>x, y: 坐标<br>maxWidth: 最大宽度 | 绘制填充文本 |
| `strokeText(text, x, y, maxWidth)` | text: 文本<br>x, y: 坐标<br>maxWidth: 最大宽度 | 绘制描边文本 |
| `measureText(text)` | text: 文本 | 测量文本 |

### 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `font` | String | '10px sans-serif' | 字体样式 |
| `textAlign` | String | 'start' | 水平对齐 |
| `textBaseline` | String | 'alphabetic' | 垂直对齐 |
| `direction` | String | 'inherit' | 文本方向 |
| `fontKerning` | String | 'auto' | 字距调整 |
| `fontStretch` | String | 'normal' | 字体拉伸 |
| `fontVariantCaps` | String | 'normal' | 大写字母变体 |
| `textRendering` | String | 'auto' | 文本渲染模式 |
| `letterSpacing` | String | '0px' | 字母间距 |
| `wordSpacing` | String | '0px' | 单词间距 |

**textAlign 值：** 'start' | 'end' | 'left' | 'right' | 'center'

**textBaseline 值：** 'top' | 'hanging' | 'middle' | 'alphabetic' | 'ideographic' | 'bottom'

**direction 值：** 'ltr' | 'rtl' | 'inherit'

### TextMetrics 完整属性

| 属性 | 说明 |
|------|------|
| `width` | 文本宽度 |
| `actualBoundingBoxLeft` | 从对齐点到文本左边距离 |
| `actualBoundingBoxRight` | 从对齐点到文本右边距离 |
| `actualBoundingBoxAscent` | 从基线到文本顶部距离 |
| `actualBoundingBoxDescent` | 从基线到文本底部距离 |
| `fontBoundingBoxAscent` | 从基线到字体顶部距离 |
| `fontBoundingBoxDescent` | 从基线到字体底部距离 |
| `emHeightAscent` | 从基线到 em 方块顶部距离 |
| `emHeightDescent` | 从基线到 em 方块底部距离 |
| `hangingBaseline` | 悬挂基线位置 |
| `alphabeticBaseline` | 字母基线位置 |
| `ideographicBaseline` | 表意文字基线位置 |

```javascript
const metrics = ctx.measureText('Hello')

// 计算文本边界框
const textWidth = metrics.width
const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent

console.log(`宽度: ${textWidth}, 高度: ${textHeight}`)
```

---

## 图像方法

| 方法 | 参数 | 说明 |
|------|------|------|
| `drawImage(image, dx, dy)` | image: 图像源<br>dx, dy: 目标位置 | 基本绘制 |
| `drawImage(image, dx, dy, dWidth, dHeight)` | dWidth, dHeight: 目标尺寸 | 缩放绘制 |
| `drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)` | sx, sy, sWidth, sHeight: 源裁剪区域 | 裁剪绘制 |

```javascript
// 基本绘制
ctx.drawImage(img, 0, 0)

// 缩放绘制
ctx.drawImage(img, 0, 0, 200, 150)

// 裁剪绘制
ctx.drawImage(img, 0, 0, 100, 100, 50, 50, 200, 200)
```

---

## ImageBitmap API

ImageBitmap 是一种高效的图像表示方式，可以在 Canvas 和 Worker 之间高效传递。

### 创建 ImageBitmap

```javascript
// 从图像元素创建
const bitmap = await createImageBitmap(img)

// 从 Blob 创建
const blob = new Blob([data], { type: 'image/png' })
const bitmap = await createImageBitmap(blob)

// 从 Canvas 创建
const bitmap = await createImageBitmap(canvas)

// 从 ImageData 创建
const bitmap = await createImageBitmap(imageData)
```

### 创建选项

```javascript
const bitmap = await createImageBitmap(img, {
  resizeWidth: 200,
  resizeHeight: 150,
  resizeQuality: 'high',  // 'pixelated', 'low', 'medium', 'high'
  premultiplyAlpha: 'default',  // 'none', 'premultiply', 'default'
  colorSpaceConversion: 'default'  // 'none', 'default'
})

// 也可以指定裁剪区域
const bitmap = await createImageBitmap(img, 0, 0, 100, 100)
```

### 使用 ImageBitmap

```javascript
// 绘制到 Canvas
ctx.drawImage(bitmap, 0, 0)

// 在 Worker 中使用
const offscreen = new OffscreenCanvas(800, 600)
const ctx = offscreen.getContext('2d')
ctx.drawImage(bitmap, 0, 0)

// 释放资源
bitmap.close()
```

### ImageBitmap 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `width` | Number | 图像宽度 |
| `height` | Number | 图像高度 |

```javascript
console.log(bitmap.width, bitmap.height)
```

---

## 像素操作

### 方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `createImageData(width, height)` | width, height: 尺寸 | ImageData | 创建空白 ImageData |
| `getImageData(x, y, width, height)` | x, y: 坐标<br>width, height: 尺寸 | ImageData | 获取像素数据 |
| `putImageData(imageData, dx, dy)` | imageData: 像素数据<br>dx, dy: 位置 | 无 | 绘制像素数据 |

### ImageData 对象

```javascript
{
  width: Number,     // 宽度
  height: Number,    // 高度
  data: Uint8ClampedArray  // 像素数据 [r, g, b, a, ...]
}
```

```javascript
const imageData = ctx.getImageData(0, 0, 100, 100)

// 访问像素
const data = imageData.data
const r = data[0]
const g = data[1]
const b = data[2]
const a = data[3]

// 修改像素
data[0] = 255  // R
data[1] = 0    // G
data[2] = 0    // B
data[3] = 255  // A

ctx.putImageData(imageData, 0, 0)
```

---

## 合成属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `globalAlpha` | Number | 1.0 | 全局透明度 |
| `globalCompositeOperation` | String | 'source-over' | 合成模式 |
| `filter` | String | 'none' | CSS 滤镜效果 |

### globalCompositeOperation 值

**基础模式：**
- 'source-over' - 新图形在上
- 'source-in' - 只显示重叠
- 'source-out' - 只显示不重叠
- 'source-atop' - 新图形在已有内容上

**目标模式：**
- 'destination-over' - 新图形在下
- 'destination-in' - 只显示重叠的已有内容
- 'destination-out' - 只显示不重叠的已有内容
- 'destination-atop' - 已有内容在新图形上

**混合模式：**
- 'lighter' - 变亮
- 'multiply' - 正片叠底
- 'screen' - 滤色
- 'overlay' - 叠加
- 'darken' - 变暗
- 'lighten' - 变亮

### Canvas 滤镜

Canvas 支持与 CSS 相同的滤镜效果：

```javascript
// 模糊
ctx.filter = 'blur(5px)'

// 亮度
ctx.filter = 'brightness(1.5)'

// 对比度
ctx.filter = 'contrast(200%)'

// 灰度
ctx.filter = 'grayscale(100%)'

// 色相旋转
ctx.filter = 'hue-rotate(90deg)'

// 反色
ctx.filter = 'invert(100%)'

// 透明度
ctx.filter = 'opacity(50%)'

// 饱和度
ctx.filter = 'saturate(200%)'

// 褐色调
ctx.filter = 'sepia(100%)'

// 阴影
ctx.filter = 'drop-shadow(5px 5px 10px rgba(0,0,0,0.5))'

// 组合多个滤镜
ctx.filter = 'blur(2px) brightness(1.2) contrast(1.1)'

// 绘制图像时应用滤镜
ctx.drawImage(img, 0, 0)

// 重置滤镜
ctx.filter = 'none'
```

### 滤镜函数说明

| 滤镜 | 参数 | 说明 |
|------|------|------|
| `blur(radius)` | 半径（像素） | 高斯模糊 |
| `brightness(amount)` | 0-∞ (1=原值) | 亮度 |
| `contrast(amount)` | 0-∞ (1=原值) | 对比度 |
| `grayscale(amount)` | 0-1 或 0-100% | 灰度 |
| `hue-rotate(angle)` | 角度 | 色相旋转 |
| `invert(amount)` | 0-1 或 0-100% | 反色 |
| `opacity(amount)` | 0-1 或 0-100% | 透明度 |
| `saturate(amount)` | 0-∞ (1=原值) | 饱和度 |
| `sepia(amount)` | 0-1 或 0-100% | 褐色调 |
| `drop-shadow(offset-x, offset-y, blur-radius, color)` | 阴影参数 | 阴影 |

---

## 其他方法

| 方法 | 参数 | 说明 |
|------|------|------|
| `getContextAttributes()` | 无 | 获取上下文属性 |
| `isContextLost()` | 无 | 判断上下文是否丢失 |

---

## CanvasGradient 接口

| 方法 | 参数 | 说明 |
|------|------|------|
| `addColorStop(offset, color)` | offset: 0-1<br>color: 颜色值 | 添加颜色停止点 |

---

## CanvasPattern 接口

| 方法 | 参数 | 说明 |
|------|------|------|
| `setTransform(transform)` | transform: DOMMatrix | 设置图案变换 |

---

## Path2D 接口

| 方法 | 说明 |
|------|------|
| `addPath(path, transform)` | 添加路径 |
| `closePath()` | 闭合路径 |
| `moveTo(x, y)` | 移动到指定点 |
| `lineTo(x, y)` | 画线到指定点 |
| `rect(x, y, width, height)` | 创建矩形路径 |
| `arc(x, y, radius, startAngle, endAngle, anticlockwise)` | 创建圆弧路径 |
| `arcTo(x1, y1, x2, y2, radius)` | 创建圆角路径 |
| `quadraticCurveTo(cp1x, cp1y, x, y)` | 二次贝塞尔曲线 |
| `bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)` | 三次贝塞尔曲线 |

---

## 相关资源

- [MDN Canvas API 文档](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API)
- [W3C Canvas 规范](https://www.w3.org/TR/2dcontext/)
- [HTML5 Canvas 教程](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API/Tutorial)

---

**返回**：[01-概览](01-概览.md) | **上一篇**：[11-性能优化](11-性能优化.md)
