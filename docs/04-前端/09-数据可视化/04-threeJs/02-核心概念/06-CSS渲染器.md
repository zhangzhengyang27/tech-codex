---
title: CSS渲染器
description: "CSS2DRenderer 和 CSS3DRenderer 允许在 Three.js 3D 场景中使用 HTML 元素作为渲染对象。这使得我们可以将常规的 HTML/CSS 内容（文字、图片、表单、动画等）与 3D 对象结合，实现标签、信息面板、悬浮提示等丰富的交互效果。"
keywords: [CSS渲染器]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---


# CSS2D / CSS3D 渲染器

CSS2DRenderer 和 CSS3DRenderer 允许在 Three.js 3D 场景中使用 HTML 元素作为渲染对象。这使得我们可以将常规的 HTML/CSS 内容（文字、图片、表单、动画等）与 3D 对象结合，实现标签、信息面板、悬浮提示等丰富的交互效果。

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CSS 渲染器工作原理                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────────────────┐    ┌──────────────────────────┐            │
│   │   WebGLRenderer      │    │   CSS2D / CSS3D Renderer │            │
│   │                      │    │                          │            │
│   │  渲染 3D 几何体/材质  │    │  渲染 HTML DOM 元素       │            │
│   │  (Mesh/Light/etc)    │    │  (Labels/Panels/UI)     │            │
│   └──────────┬───────────┘    └────────────┬─────────────┘            │
│              │                              │                          │
│              ▼                              ▼                          │
│   ┌──────────────────────────────────────────────────────┐           │
│   │                    同一 Canvas 容器                    │           │
│   │                                                      │           │
│   │  ┌─────────────────────────────────────────────┐    │           │
│   │  │         HTML 元素叠加在 WebGL 画布之上        │    │           │
│   │  │                                             │    │           │
│   │  │  ┌──────────┐                               │    │           │
│   │  │  │ 3D 模型   │ ← WebGL 渲染层               │    │           │
│   │  │  └────┬─────┘                               │    │           │
│   │  │       │                                     │    │           │
│   │  │  ┌────▼────┐                               │    │           │
│   │  │  │HTML标签  │ ← CSS2D 覆盖层（始终面向相机）  │    │           │
│   │  │  └─────────┘                               │    │           │
│   │  └─────────────────────────────────────────────┘    │           │
│   └──────────────────────────────────────────────────────┘           │
│                                                                         │
│   CSS2D: 2D 平面元素，始终面向相机，适合标签、提示                       │
│   CSS3D: 3D 空间元素，可随场景旋转，适合面板、窗口                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

坐标同步流程：
1. CSS2DObject/CSS3DObject 的位置由 Object3D 的矩阵决定
2. 渲染器将 3D 坐标投影到屏幕空间
3. DOM 元素通过 transform 定位到对应位置
4. 每帧更新保持同步
```

## 概述

### 为什么需要 CSS 渲染器？

| 需求 | 用 Canvas/Sprite 实现 | 用 CSS 渲染器实现 |
|------|---------------------|------------------|
| 文字标签 | 需要 TextureLoader 加载字体纹理 | 直接用 HTML + CSS |
| 复杂样式 | 受限于着色器能力 | 完整 CSS 支持 |
| 动态内容 | 需要重新生成纹理 | 直接操作 DOM |
| 交互事件 | 需要射线检测 | 原生 DOM 事件 |
| 响应式布局 | 手动计算位置 | CSS flexbox/grid |

### CSS2D vs CSS3D 对比

| 特性 | CSS2DRenderer | CSS3DRenderer |
|------|--------------|---------------|
| **维度** | 2D 平面元素 | 3D 空间元素 |
| **朝向** | 始终面向相机（公告板） | 可随父对象旋转 |
| **透视变形** | 无（始终保持原始大小） | 有（近大远小） |
| **适用场景** | 标签、提示、标注 | 3D 面板、悬浮窗口 |
| **性能** | 更高 | 较低 |
| **使用频率** | ⭐⭐⭐⭐⭐ 高 | ⭐⭐ 中 |

### 安装与导入

```javascript
// CSS2D
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

// CSS3D
import { CSS3DRenderer, CSS3DObject, CSS3DSprite } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
```

## CSS2DRenderer 基础

### 创建和配置

```javascript
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

// 创建场景、相机、WebGL 渲染器（略）
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(width, height)
document.body.appendChild(renderer.domElement)

// ==================== 创建 CSS2D 渲染器 ====================
const labelRenderer = new CSS2DRenderer()
labelRenderer.setSize(width, height)
labelRenderer.domElement.style.position = 'absolute'
labelRenderer.domElement.style.top = '0px'
labelRenderer.domElement.style.pointerEvents = 'none' // 让点击穿透到 3D 场景
document.body.appendChild(labelRenderer.domElement)

// 在渲染循环中同时渲染两个渲染器
function animate() {
  requestAnimationFrame(animate)
  
  controls.update()
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)  // 渲染 CSS2D 元素
}

// 窗口大小变化时同步更新
window.addEventListener('resize', () => {
  const width = window.innerWidth
  const height = window.innerHeight
  
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  
  renderer.setSize(width, height)
  labelRenderer.setSize(width, height)  // 同步大小
})
```

### CSS2DRenderer 参数

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `domElement` | HTMLElement | 包含所有 CSS2D 元素的容器 div |
| `setSize(width, height)` | method | 设置渲染器尺寸 |
| `render(scene, camera)` | method | 执行渲染，更新所有 CSS2DObject 位置 |
| `domElement.style` | CSSStyleDeclaration | 可设置 position/top/left 等 |

### 关键样式设置

```javascript
const labelRenderer = new CSS2DRenderer()

// 必须设置的样式
labelRenderer.domElement.style.position = 'absolute'   // 绝对定位
labelRenderer.domElement.style.top = '0'               // 从顶部开始
labelRenderer.domElement.style.left = '0'              // 从左侧开始
labelRenderer.domElement.style.pointerEvents = 'none'  // 点击穿透（重要！）

// 如果需要标签可点击
labelRenderer.domElement.style.pointerEvents = 'auto'  // 启用指针事件
```

## CSS2DObject 标签对象

### 基本用法

```javascript
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

// 1. 创建 HTML 元素
const div = document.createElement('div')
div.className = 'label'
div.textContent = 'Hello World'
div.style.color = '#ffffff'
div.style.fontSize = '14px'
div.style.fontFamily = 'sans-serif'
div.style.padding = '4px 8px'
div.style.background = 'rgba(0, 0, 0, 0.6)'
div.style.borderRadius = '4px'
div.style.whiteSpace = 'nowrap'  // 防止换行

// 2. 创建 CSS2DObject
const label = new CSS2DObject(div)

// 3. 设置位置并添加到场景（或作为某个对象的子对象）
label.position.set(0, 1.5, 0)
scene.add(label)

// 或者附加到特定对象上（跟随移动）
mesh.add(label)
label.position.set(0, 1.5, 0)  // 相对于 mesh 的偏移
```

### 产品标注示例

```javascript
class ProductLabelManager {
  constructor(scene, labelRenderer) {
    this.scene = scene
    this.labelRenderer = labelRenderer
    this.labels = []
  }

  createLabel(text, position, options = {}) {
    const {
      color = '#ffffff',
      fontSize = '12px',
      backgroundColor = 'rgba(0,0,0,0.7)',
      padding = '4px 10px',
      borderRadius = '4px',
      offset = new THREE.Vector3(0, 0.5, 0),
      parent = null,
      onClick = null
    } = options

    // 创建 DOM 元素
    const div = document.createElement('div')
    div.className = 'product-label'
    div.textContent = text
    
    Object.assign(div.style, {
      color,
      fontSize,
      background: backgroundColor,
      padding,
      borderRadius,
      whiteSpace: 'nowrap',
      pointerEvents: onClick ? 'auto' : 'none',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'opacity 0.2s, transform 0.2s'
    })

    // 悬停效果
    div.addEventListener('mouseenter', () => {
      div.style.transform = 'scale(1.1)'
      div.style.opacity = '1'
    })
    div.addEventListener('mouseleave', () => {
      div.style.transform = 'scale(1)'
      div.style.opacity = '0.9'
    })

    // 点击事件
    if (onClick) {
      div.addEventListener('click', onClick)
    }

    // 创建 CSS2DObject
    const label = new CSS2DObject(div)
    label.position.copy(offset)

    if (parent) {
      parent.add(label)
    } else {
      this.scene.add(label)
    }

    this.labels.push({ label, element: div })
    return label
  }

  // 创建带图标的标签
  createIconLabel(iconHtml, text, position, options = {}) {
    const div = document.createElement('div')
    div.className = 'icon-label'
    div.innerHTML = `
      <span class="icon">${iconHtml}</span>
      <span class="text">${text}</span>
    `
    
    Object.assign(div.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '6px 12px',
      background: options.backgroundColor || 'rgba(0,0,0,0.75)',
      borderRadius: '20px',
      color: options.color || '#ffffff',
      fontSize: options.fontSize || '13px',
      whiteSpace: 'nowrap',
      pointerEvents: options.onClick ? 'auto' : 'none'
    })

    const label = new CSS2DObject(div)
    label.position.copy(options.offset || new THREE.Vector3(0, 0.5, 0))

    if (options.parent) {
      options.parent.add(label)
    } else {
      this.scene.add(label)
    }

    this.labels.push({ label, element: div })
    return label
  }

  removeAll() {
    this.labels.forEach(({ label }) => {
      if (label.parent) label.parent.remove(label)
      else this.scene.remove(label)
    })
    this.labels = []
  }
}
```

### 动态内容标签

```javascript
// 显示实时数据的标签
function createDataLabel(object, getDataFn) {
  const div = document.createElement('div')
  div.className = 'data-label'
  
  const updateContent = () => {
    const data = getDataFn()
    div.innerHTML = `
      <div style="font-weight:bold;color:#00ff88;">${data.name}</div>
      <div>温度: ${data.temperature}°C</div>
      <div>状态: ${data.status}</div>
    `
  }
  
  updateContent()
  setInterval(updateContent, 1000)  // 每秒更新
  
  const label = new CSS2DObject(div)
  object.add(label)
  label.position.set(0, 1.2, 0)
  
  return { label, updateContent }
}
```

### 富文本标签

```javascript
function createRichLabel(position) {
  const div = document.createElement('div')
  div.className = 'rich-label'
  div.innerHTML = `
    <style>
      .rich-label {
        font-family: -apple-system, sans-serif;
        width: 200px;
        padding: 16px;
        background: linear-gradient(135deg, rgba(30,40,60,0.95), rgba(20,25,40,0.95));
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.1);
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      }
      .rich-label .title {
        font-size: 15px;
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 8px;
      }
      .rich-label .info-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #aaa;
        margin: 4px 0;
      }
      .rich-label .info-value {
        color: #4fc3f7;
        font-weight: 500;
      }
      .rich-label .progress-bar {
        height: 4px;
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
        margin-top: 8px;
        overflow: hidden;
      }
      .rich-label .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4caf50, #8bc34a);
        border-radius: 2px;
        width: 75%;
        animation: pulse 2s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
    </style>
    <div class="title">服务器节点 A</div>
    <div class="info-row">
      <span>CPU 使用率</span>
      <span class="info-value">45%</span>
    </div>
    <div class="info-row">
      <span>内存使用</span>
      <span class="info-value">3.2GB</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill"></div>
    </div>
  `
  
  const label = new CSS2DObject(div)
  label.position.copy(position)
  scene.add(label)
  
  return label
}
```

## CSS3DRenderer 与 CSS3DObject

### CSS3DRenderer 基本用法

```javascript
import { CSS3DRenderer, CSS3DObject, CSS3DSprite } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

// 创建 CSS3D 渲染器
const css3dRenderer = new CSS3DRenderer()
css3dRenderer.setSize(window.innerWidth, window.innerHeight)
css3dRenderer.domElement.style.position = 'absolute'
css3dRenderer.domElement.style.top = '0'
css3dRenderer.domElement.style.left = '0'
document.body.appendChild(css3dRenderer.domElement)

// 渲染循环中调用
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
  css3dRenderer.render(scene, camera)  // 渲染 CSS3D 元素
}
```

### CSS3DObject（3D 面板）

CSS3DObject 创建一个可以在 3D 空间中旋转的面板。

```javascript
// 创建 HTML 内容
const iframe = document.createElement('iframe')
iframe.src = 'https://example.com'
iframe.style.width = '400px'
iframe.style.height = '300px'
iframe.style.border = 'none'
iframe.style.background = '#fff'

// 创建 CSS3DObject
const css3dObject = new CSS3DObject(iframe)
css3dObject.position.set(0, 1.5, -5)
css3dObject.scale.set(0.01, 0.01, 0.01)  // 缩放到合适大小
scene.add(css3dObject)
```

### CSS3DSprite（始终面向相机的 3D 元素）

类似 CSS2DObject 但有透视效果（近大远小）。

```javascript
const div = document.createElement('div')
div.innerHTML = '<h1>3D Sprite Label</h1>'
div.style.width = '200px'
div.style.height = '100px'
div.style.background = 'rgba(255,200,0,0.8)'
div.style.display = 'flex'
div.style.alignItems = 'center'
div.style.justifyContent = 'center'

const sprite = new CSS3DSprite(div)
sprite.position.set(0, 2, 0)
scene.add(sprite)
```

## 实战：产品标注系统

完整的 3D 产品标注系统，支持多种标注类型和交互效果。

```javascript
class AnnotationSystem {
  constructor(scene, camera, domElement) {
    this.scene = scene
    this.camera = camera
    this.domElement = domElement
    
    this.labelRenderer = new CSS2DRenderer()
    this.labelRenderer.setSize(domElement.clientWidth, domElement.clientHeight)
    this.labelRenderer.domElement.style.position = 'absolute'
    this.labelRenderer.domElement.style.top = '0'
    this.labelRenderer.domElement.style.pointerEvents = 'none'
    domElement.appendChild(this.labelRenderer.domElement)
    
    this.annotations = []
    this.activeAnnotation = null
  }

  addAnnotation(options) {
    const {
      id,
      target,          // 目标 3D 对象或世界坐标 Vector3
      title,
      description,
      icon = '📍',
      type = 'default', // default | info | warning | error
      offset = new THREE.Vector3(0, 0.5, 0),
      onClick
    } = options

    // 创建标注点（3D 小球）
    const dotGeometry = new THREE.SphereGeometry(0.05, 16, 16)
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: this.getTypeColor(type)
    })
    const dot = new THREE.Mesh(dotGeometry, dotMaterial)
    
    if (target instanceof THREE.Object3D) {
      target.add(dot)
      dot.position.copy(offset)
    } else {
      scene.add(dot)
      dot.position.copy(target)
    }

    // 创建标签
    const labelDiv = document.createElement('div')
    labelDiv.className = 'annotation-label'
    labelDiv.dataset.id = id
    labelDiv.innerHTML = `
      <div class="annotation-header">
        <span class="annotation-icon">${icon}</span>
        <span class="annotation-title">${title}</span>
      </div>
      ${description ? `<div class="annotation-desc">${description}</div>` : ''}
    `
    
    Object.assign(labelDiv.style, {
      padding: '8px 14px',
      background: this.getBackgroundGradient(type),
      borderRadius: '8px',
      color: '#fff',
      fontSize: '13px',
      fontFamily: '-apple-system, sans-serif',
      whiteSpace: 'nowrap',
      maxWidth: '250px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      borderLeft: `3px solid ${this.getTypeColorHex(type)}`,
      opacity: '0',
      transform: 'translateY(10px)',
      transition: 'opacity 0.3s, transform 0.3s',
      pointerEvents: onClick ? 'auto' : 'none',
      cursor: onClick ? 'pointer' : 'default'
    })

    const label = new CSS2DObject(labelDiv)
    
    if (target instanceof THREE.Object3D) {
      target.add(label)
      label.position.copy(offset.clone().add(new THREE.Vector3(0, 0.3, 0)))
    } else {
      scene.add(label)
      label.position.copy(target.clone().add(new THREE.Vector3(0, 0.3, 0)))
    }

    // 交互逻辑
    let isHovered = false
    
    dot.userData.annotationId = id
    
    labelDiv.addEventListener('mouseenter', () => {
      isHovered = true
      labelDiv.style.opacity = '1'
      labelDiv.style.transform = 'translateY(0)'
      dot.scale.setScalar(1.5)
      
      if (this.onHover) this.onHover(id)
    })

    labelDiv.addEventListener('mouseleave', () => {
      isHovered = false
      if (this.activeAnnotation !== id) {
        labelDiv.style.opacity = '0'
        labelDiv.style.transform = 'translateY(10px)'
      }
      dot.scale.setScalar(1)
    })

    if (onClick) {
      labelDiv.addEventListener('click', () => onClick(id))
    }

    const annotation = {
      id,
      dot,
      label,
      element: labelDiv,
      target,
      show() {
        labelDiv.style.opacity = '1'
        labelDiv.style.transform = 'translateY(0)'
      },
      hide() {
        labelDiv.style.opacity = '0'
        labelDiv.style.transform = 'translateY(10px)'
      },
      remove() {
        if (dot.parent) dot.parent.remove(dot)
        if (label.parent) label.parent.remove(label)
      }
    }

    this.annotations.push(annotation)
    return annotation
  }

  setActive(id) {
    this.activeAnnotation = id
    this.annotations.forEach(a => {
      if (a.id === id) a.show()
      else a.hide()
    })
  }

  clearActive() {
    this.activeAnnotation = null
    this.annotations.forEach(a => a.hide())
  }

  getById(id) {
    return this.annotations.find(a => a.id === id)
  }

  getAll() {
    return this.annotations
  }

  remove(id) {
    const index = this.annotations.findIndex(a => a.id === id)
    if (index > -1) {
      this.annotations[index].remove()
      this.annotations.splice(index, 1)
    }
  }

  clearAll() {
    this.annotations.forEach(a => a.remove())
    this.annotations = []
  }

  render(scene, camera) {
    this.labelRenderer.render(scene, camera)
  }

  resize(width, height) {
    this.labelRenderer.setSize(width, height)
  }

  getTypeColor(type) {
    const colors = {
      default: 0x4fc3f7,
      info: 0x2196f3,
      warning: 0xff9800,
      error: 0xf44336
    }
    return colors[type] || colors.default
  }

  getTypeColorHex(type) {
    const hex = this.getTypeColor(type)
    return '#' + hex.toString(16).padStart(6, '0')
  }

  getBackgroundGradient(type) {
    const colors = {
      default: 'rgba(79,195,247,0.92)',
      info: 'rgba(33,150,243,0.92)',
      warning: 'rgba(255,152,0,0.92)',
      error: 'rgba(244,67,54,0.92)'
    }
    return colors[type] || colors.default
  }
}
```

## 实战：3D 信息卡片

创建悬浮在 3D 场景中的信息卡片面板。

```javascript
class InfoCardSystem {
  constructor(scene, labelRenderer) {
    this.scene = scene
    this.labelRenderer = labelRenderer
    this.cards = []
  }

  createCard(data, anchorPosition, options = {}) {
    const {
      width = 280,
      closable = true,
      draggable = false,
      animateIn = true
    } = options

    const card = document.createElement('div')
    card.className = 'info-card'
    card.innerHTML = `
      <style>
        .info-card {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          width: ${width}px;
          background: linear-gradient(
            145deg,
            rgba(22, 28, 38, 0.96),
            rgba(15, 18, 25, 0.98)
          );
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow:
            0 20px 60px rgba(0,0,0,0.5),
            0 0 0 1px rgba(255,255,255,0.05) inset;
          overflow: hidden;
          backdrop-filter: blur(20px);
          user-select: none;
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .card-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 600;
          font-size: 14px;
        }
        .card-title-group { flex: 1; }
        .card-title {
          font-size: 14px;
          font-weight: 600;
          color: #e8eaed;
        }
        .card-subtitle {
          font-size: 11px;
          color: #8b9298;
          margin-top: 2px;
        }
        .card-close {
          width: 24px;
          height: 24px;
          border: none;
          background: rgba(255,255,255,0.06);
          border-radius: 6px;
          color: #8b9298;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.2s;
        }
        .card-close:hover {
          background: rgba(255,80,80,0.15);
          color: #ff5050;
        }
        .card-body { padding: 14px 16px; }
        .card-stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }
        .stat-item {
          background: rgba(255,255,255,0.03);
          border-radius: 10px;
          padding: 10px 12px;
        }
        .stat-label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #e8eaed;
          margin-top: 2px;
        }
        .stat-value.highlight { color: #34d399; }
        .card-description {
          font-size: 12px;
          line-height: 1.6;
          color: #9ca3af;
        }
        .card-footer {
          padding: 10px 16px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex;
          gap: 8px;
        }
        .card-btn {
          flex: 1;
          padding: 8px;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .card-btn-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: #fff;
        }
        .card-btn-primary:hover { opacity: 0.85; }
        .card-btn-secondary {
          background: rgba(255,255,255,0.06);
          color: #9ca3af;
        }
        .card-btn-secondary:hover {
          background: rgba(255,255,255,0.1);
          color: #e8eaed;
        }
      </style>
      <div class="card-header">
        <div class="card-avatar">${data.avatar || data.name?.charAt(0)}</div>
        <div class="card-title-group">
          <div class="card-title">${data.title || data.name}</div>
          <div class="card-subtitle">${data.subtitle || data.category}</div>
        </div>
        ${closable ? '<button class="card-close">✕</button>' : ''}
      </div>
      <div class="card-body">
        ${data.stats ? `
        <div class="card-stat-grid">
          ${data.stats.map(s => `
            <div class="stat-item">
              <div class="stat-label">${s.label}</div>
              <div class="stat-value ${s.highlight ? 'highlight' : ''}">${s.value}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}
        ${data.description ? `<div class="card-description">${data.description}</div>` : ''}
      </div>
      ${data.actions ? `
      <div class="card-footer">
        ${data.actions.map((a, i) => `
          <button class="card-btn ${i === 0 ? 'card-btn-primary' : 'card-btn-secondary'}"
                  data-action="${a.action}">
            ${a.label}
          </button>
        `).join('')}
      </div>
      ` : ''}
    `

    // 入场动画
    if (animateIn) {
      card.style.opacity = '0'
      card.style.transform = 'translateY(20px) scale(0.95)'
      requestAnimationFrame(() => {
        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease'
        card.style.opacity = '1'
        card.style.transform = 'translateY(0) scale(1)'
      })
    }

    // 关闭按钮
    if (closable) {
      const closeBtn = card.querySelector('.card-close')
      closeBtn.addEventListener('click', () => this.removeCard(cardObj))
    }

    // 操作按钮
    data.actions?.forEach(action => {
      const btn = card.querySelector(`[data-action="${action.action}"]`)
      if (btn && action.onClick) {
        btn.addEventListener('click', action.onClick)
      }
    })

    const cardObj = new CSS2DObject(card)
    cardObj.position.copy(anchorPosition)
    this.scene.add(cardObj)

    const cardData = { object: cardObj, element: card, data }
    this.cards.push(cardData)
    return cardData
  }

  removeCard(cardObj) {
    const index = this.cards.findIndex(c => c.object === cardObj)
    if (index > -1) {
      const { object, element } = this.cards[index]
      element.style.transition = 'opacity 0.3s, transform 0.3s'
      element.style.opacity = '0'
      element.style.transform = 'translateY(-10px) scale(0.95)'
      setTimeout(() => {
        this.scene.remove(object)
      }, 300)
      this.cards.splice(index, 1)
    }
  }

  clearAll() {
    this.cards.slice().forEach(c => this.removeCard(c.object))
  }
}
```

## 性能优化

### 减少 DOM 操作开销

```javascript
// 1. 使用 CSS will-change 提示浏览器优化
labelElement.style.willChange = 'transform'

// 2. 大量标签时使用对象池
class LabelPool {
  constructor(maxSize = 100) {
    this.pool = []
    this.active = []
    this.maxSize = maxSize
  }

  acquire() {
    let label = this.pool.pop()
    if (!label && this.active.length < this.maxSize) {
      const div = document.createElement('div')
      div.className = 'pooled-label'
      label = new CSS2DObject(div)
    }
    if (label) this.active.push(label)
    return label
  }

  release(label) {
    const idx = this.active.indexOf(label)
    if (idx > -1) {
      this.active.splice(idx, 1)
      label.element.style.display = 'none'
      this.pool.push(label)
    }
  }

  releaseAll() {
    while (this.active.length) {
      this.release(this.active[0])
    }
  }
}
```

### 视距裁剪（隐藏远处标签）

```javascript
class VisibilityOptimizer {
  constructor(camera, maxDistance = 50) {
    this.camera = camera
    this.maxDistance = maxDistance
    this.managedObjects = []
  }

  add(css2dObject) {
    this.managedObjects.push({
      object: css2dObject,
      element: css2dObject.element,
      visible: true
    })
  }

  update() {
    const cameraPos = this.camera.position
    
    for (const item of this.managedObjects) {
      const worldPos = new THREE.Vector3()
      item.object.getWorldPosition(worldPos)
      
      const distance = cameraPos.distanceTo(worldPos)
      const shouldBeVisible = distance <= this.maxDistance
      
      if (item.visible !== shouldBeVisible) {
        item.visible = shouldBeVisible
        item.element.style.display = shouldBeVisible ? '' : 'none'
      }
    }
  }
}
```

### 使用 requestAnimationFrame 合并更新

```javascript
// 对于频繁更新的动态标签内容，避免每帧都修改 DOM
class BatchedLabelUpdater {
  constructor(updateInterval = 100) {
    this.pendingUpdates = new Map()
    this.lastUpdateTime = 0
    this.updateInterval = updateInterval
  }

  scheduleUpdate(labelId, contentFn) {
    this.pendingUpdates.set(labelId, contentFn)
  }

  flush(currentTime) {
    if (currentTime - this.lastUpdateTime < this.updateInterval) return
    
    this.pendingUpdates.forEach((contentFn, labelId) => {
      const element = this.getElementById(labelId)
      if (element) {
        element.innerHTML = contentFn()
      }
    })
    
    this.pendingUpdates.clear()
    this.lastUpdateTime = currentTime
  }
}
```

## 与后处理配合

当使用 EffectComposer 后处理时，需要注意 CSS 渲染器的层级关系。

```javascript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

// 后处理管线
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(...))
composer.addPass(new OutputPass())

// CSS2D 渲染器需要放在单独的容器中，覆盖在后处理结果之上
const container = document.getElementById('app-container')

// WebGL 画布（包含后处理结果）
container.appendChild(composer.renderer.domElement)

// CSS2D 层（在最上层）
const labelRenderer = new CSS2DRenderer()
labelRenderer.setSize(container.clientWidth, container.clientHeight)
labelRenderer.domElement.style.position = 'absolute'
labelRenderer.domElement.style.top = '0'
labelRenderer.domElement.style.left = '0'
labelRenderer.domElement.style.pointerEvents = 'none'
container.appendChild(labelRenderer.domElement)

// 渲染循环
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  composer.render()             // 后处理渲染 → WebGL canvas
  labelRenderer.render(scene, camera)  // CSS2D 渲染 → 覆盖层
}
```

## API 参考

### CSS2DRenderer

| 方法/属性 | 类型 | 说明 |
|-----------|------|------|
| `constructor()` | - | 创建 CSS2D 渲染器实例 |
| `domElement` | HTMLElement | DOM 容器（div） |
| `setSize(w, h)` | void | 设置尺寸 |
| `render(scene, camera)` | void | 执行渲染，更新所有 CSS2DObject 位置 |

### CSS2DObject

| 方法/属性 | 类型 | 说明 |
|-----------|------|------|
| `constructor(element)` | - | 从 HTML 元素创建 |
| `element` | HTMLElement | 关联的 DOM 元素 |
| `position` | Vector3 | 位置（继承自 Object3D） |

### CSS3DRenderer

| 方法/属性 | 类型 | 说明 |
|-----------|------|------|
| `constructor()` | - | 创建 CSS3D 渲染器实例 |
| `domElement` | HTMLElement | DOM 容器 |
| `setSize(w, h)` | void | 设置尺寸 |
| `render(scene, camera)` | void | 执行渲染 |

### CSS3DObject / CSS3DSprite

| 类 | 说明 |
|----|------|
| `CSS3DObject(element)` | 3D 空间中的 HTML 面板，可旋转 |
| `CSS3DSprite(element)` | 始终面向相机的 3D HTML 元素，有透视效果 |

## 常见问题

### Q: 标签被 3D 对象遮挡了怎么办？

CSS2D 元素是 DOM 覆盖层，天然不会被 3D 物体遮挡。如果需要遮挡效果：

```javascript
// 方案一：使用 CSS3DObject（参与深度排序）
// 方案二：手动检测遮挡
function checkOcclusion(labelPos, camera, objects) {
  const dir = labelPos.clone().sub(camera.position).normalize()
  const raycaster = new THREE.Raycaster(camera.position, dir)
  const hits = raycaster.intersectObjects(objects)
  
  if (hits.length > 0) {
    const distToLabel = camera.position.distanceTo(labelPos)
    if (hits[0].distance < distToLabel) {
      return true  // 被遮挡
    }
  }
  return false
}
```

### Q: 标签闪烁或抖动？

确保 `labelRenderer.render()` 在每一帧都被调用，且与 `renderer.render()` 使用相同的 scene 和 camera。

### Q: 如何让标签可点击但又不影响 3D 交互？

```javascript
// 设置 pointer-events: auto 仅在标签上
labelElement.style.pointerEvents = 'auto'
labelRenderer.domElement.style.pointerEvents = 'none'  // 容器本身不拦截

// 标签内部阻止事件冒泡
labelElement.addEventListener('mousedown', (e) => e.stopPropagation())
```

### Q: 移动端标签太小？

```javascript
if ('ontouchstart' in window) {
  labelElement.style.fontSize = '16px'  // 移动端增大字号
  labelElement.style.padding = '8px 14px'
  labelElement.style.minWidth = '120px'
}
```
