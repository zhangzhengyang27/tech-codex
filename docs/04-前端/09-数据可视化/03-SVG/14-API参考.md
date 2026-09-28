---
title: API参考
description: 本章节提供 SVG DOM API 的快速参考，涵盖 SVGSVGElement、SVGGraphicsElement 等常用接口，getBBox、getCTM、坐标转换与元素创建等要点
keywords: [API参考]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---

# API 参考

本章节提供 SVG DOM API 的快速参考,包括常用属性、方法和事件。

## SVG 元素接口

### SVGSVGElement

SVG 根元素的接口。

```javascript
const svg = document.querySelector('svg');
```

**常用属性**:
- `width`: SVG 宽度
- `height`: SVG 高度
- `viewBox`: 视图框

**常用方法**:
- `createSVGPoint()`: 创建 SVGPoint 点对象(常用于坐标转换)
- `createSVGRect()`: 创建 SVGRect 矩形几何对象(注意:并非 `<rect>` 图形元素)
- `getScreenCTM()`: 获取屏幕变换矩阵

### SVGGraphicsElement

所有图形元素的基类。

```javascript
const rect = document.querySelector('rect');
```

**常用属性**:
- `transform`: 变换列表
- `classList`: 类列表

**常用方法**:
- `getBBox()`: 获取边界框
- `getCTM()`: 获取当前变换矩阵
- `getScreenCTM()`: 获取屏幕变换矩阵

---

## 常用方法

### getBBox()

获取元素的边界框:

```javascript
const bbox = element.getBBox();
console.log(bbox.x, bbox.y, bbox.width, bbox.height);
```

### getCTM()

获取当前变换矩阵:

```javascript
const ctm = element.getCTM();
console.log(ctm.a, ctm.b, ctm.c, ctm.d, ctm.e, ctm.f);
```

### getScreenCTM()

获取屏幕坐标变换矩阵:

```javascript
const screenCTM = element.getScreenCTM();
```

---

## 属性操作

### 获取属性

```javascript
// 使用 getAttribute
const fill = element.getAttribute('fill');

// 使用 SVG DOM 属性
const width = element.width.baseVal.value;
```

### 设置属性

```javascript
// 使用 setAttribute
element.setAttribute('fill', 'red');

// 使用 SVG DOM 属性
element.width.baseVal.value = 100;
```

### 移除属性

```javascript
element.removeAttribute('fill');
```

---

## 事件处理

### 鼠标事件

```javascript
element.addEventListener('click', (e) => {
  console.log('Clicked', e.target);
});

element.addEventListener('mouseover', (e) => {
  console.log('Mouse over', e.target);
});
```

### 触摸事件

```javascript
element.addEventListener('touchstart', (e) => {
  console.log('Touch start', e.touches);
});
```

### 自定义事件

```javascript
const event = new CustomEvent('myEvent', {
  detail: { message: 'Hello' }
});
element.dispatchEvent(event);
```

---

## 创建元素

### 创建 SVG 元素

```javascript
// 创建 SVG 元素必须使用 createElementNS
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
```

### 设置属性

```javascript
rect.setAttribute('x', '10');
rect.setAttribute('y', '10');
rect.setAttribute('width', '50');
rect.setAttribute('height', '50');
rect.setAttribute('fill', 'blue');
```

### 添加到 DOM

```javascript
svg.appendChild(rect);
document.body.appendChild(svg);
```

---

## 坐标转换

### 屏幕坐标转 SVG 坐标

```javascript
function screenToSVG(svg, x, y) {
  const pt = svg.createSVGPoint();
  pt.x = x;
  pt.y = y;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
```

### SVG 坐标转屏幕坐标

```javascript
function SVGToScreen(svg, x, y) {
  const pt = svg.createSVGPoint();
  pt.x = x;
  pt.y = y;
  return pt.matrixTransform(svg.getScreenCTM());
}
```

---

## 参考资源

- [MDN: SVG API](https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model#svg_interfaces)
- [W3C SVG DOM](https://www.w3.org/TR/SVG11/svgdom.html)
- [SVG DOM 参考](https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element)
