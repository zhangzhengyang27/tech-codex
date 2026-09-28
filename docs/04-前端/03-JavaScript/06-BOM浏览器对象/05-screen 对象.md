---
title: screen 对象
description: "screen 对象是 window 对象的属性，可以通过 window.screen 或直接使用 screen 访问。它实现了 Screen 接口，提供了访问屏幕信息的属性和方法。虽然不同浏览器中的 screen 对象可能包含不同的属性，"
keywords: [screen, 对象]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---


# screen 对象

`screen` 对象是 BOM（Browser Object Model）的一部分，提供了关于浏览器窗口外部的显示器（屏幕）的信息，包括屏幕的尺寸、颜色深度、可用区域、方向等。这些信息主要用于表明客户端的能力，帮助开发者根据用户的屏幕环境调整页面布局和功能。

## 概述

`screen` 对象是 `window` 对象的属性，可以通过 `window.screen` 或直接使用 `screen` 访问。它实现了 `Screen` 接口，提供了访问屏幕信息的属性和方法。虽然不同浏览器中的 `screen` 对象可能包含不同的属性，但核心属性在主流浏览器中都有良好的支持。

### 主要用途

- **响应式布局**：根据屏幕尺寸调整页面布局
- **性能优化**：根据屏幕能力选择合适的资源质量
- **全屏应用**：获取屏幕尺寸以实现全屏功能
- **多显示器支持**：在多屏幕环境中定位窗口
- **方向适配**：响应屏幕方向变化（移动设备）

## 核心属性

`screen` 对象实现了 `Screen` 接口，提供了一系列只读属性用于访问屏幕信息。

### 属性总览

| **属性名称**         | **描述**                                                        | **类型** | **只读** | **兼容性** |
| -------------------- | --------------------------------------------------------------- | -------- | -------- | ---------- |
| `screen.width`       | 返回屏幕的像素宽度（包括系统组件占用的区域）                    | `number` | 是       | 全平台     |
| `screen.height`      | 返回屏幕的像素高度（包括系统组件占用的区域）                    | `number` | 是       | 全平台     |
| `screen.availWidth`  | 返回屏幕的可用宽度（减去系统组件占用的宽度，如任务栏、Dock 等） | `number` | 是       | 全平台     |
| `screen.availHeight` | 返回屏幕的可用高度（减去系统组件占用的高度，如任务栏、Dock 等） | `number` | 是       | 全平台     |
| `screen.availLeft`   | 返回没有被系统组件占用的屏幕的最左侧像素距离                    | `number` | 是       | 部分支持   |
| `screen.availTop`    | 返回没有被系统组件占用的屏幕的最顶端像素距离                    | `number` | 是       | 部分支持   |
| `screen.colorDepth`  | 返回屏幕的颜色深度（每个像素的颜色位数），多数系统是 24 或 32   | `number` | 是       | 全平台     |
| `screen.pixelDepth`  | 返回屏幕的像素深度（位深），通常与 `colorDepth` 相同            | `number` | 是       | 全平台     |
| `screen.left`        | 返回当前屏幕左边的像素距离（在多屏幕环境中）                    | `number` | 是       | 部分支持   |
| `screen.top`         | 返回当前屏幕顶端的像素距离（在多屏幕环境中）                    | `number` | 是       | 部分支持   |
| `screen.orientation` | 返回 `ScreenOrientation` 对象，提供屏幕方向信息（横屏/竖屏）    | `object` | 是       | 现代浏览器 |

### 屏幕尺寸属性

#### width 和 height

`width` 和 `height` 属性返回屏幕的总像素宽度和高度，包括被系统组件（如任务栏、Dock）占用的区域。这些值通常代表显示器的物理分辨率。

```javascript
// 获取屏幕总尺寸
console.log("屏幕宽度:", screen.width)   // 例如: 1920
console.log("屏幕高度:", screen.height)  // 例如: 1080

// 检测屏幕尺寸类型
function getScreenType() {
  const resolution = screen.width * screen.height
  if (resolution >= 3840 * 2160) return "4K"
  if (resolution >= 1920 * 1080) return "Full HD"
  if (resolution >= 1280 * 720) return "HD"
  return "SD"
}
```

**注意事项**：
- 在移动设备上，这些值可能返回逻辑像素而非物理像素
- 高 DPI 显示器可能返回缩放后的值
- 不同操作系统的缩放设置会影响返回值

#### availWidth 和 availHeight

`availWidth` 和 `availHeight` 返回屏幕的可用区域，即减去系统组件后的实际可用空间。这些属性对于调整窗口大小和布局非常有用。

```javascript
// 获取可用屏幕尺寸
console.log("可用宽度:", screen.availWidth)   // 例如: 1920
console.log("可用高度:", screen.availHeight)  // 例如: 1040 (减去任务栏)

// 计算系统组件占用的高度
const systemUIHeight = screen.height - screen.availHeight
console.log("系统UI占用高度:", systemUIHeight)

// 根据可用空间调整窗口
function maximizeWindow() {
  try {
    window.resizeTo(screen.availWidth, screen.availHeight)
    window.moveTo(screen.availLeft, screen.availTop)
  } catch (e) {
    console.warn("窗口调整被阻止:", e.message)
  }
}
```

### 屏幕位置属性

#### availLeft 和 availTop

`availLeft` 和 `availTop` 表示可用区域的起始坐标。在多屏幕环境中，这些值非常有用；在单屏幕环境中，通常为 0。

```javascript
// 获取可用区域位置
console.log("可用区域左侧:", screen.availLeft)  // 例如: 0 或负数（多屏幕）
console.log("可用区域顶部:", screen.availTop)   // 例如: 0 或其他值

// 多屏幕环境检测
function detectMultiScreen() {
  return screen.availLeft !== 0 || screen.availTop !== 0
}

// 获取完整的可用区域信息
function getAvailableArea() {
  return {
    x: screen.availLeft,
    y: screen.availTop,
    width: screen.availWidth,
    height: screen.availHeight,
    right: screen.availLeft + screen.availWidth,
    bottom: screen.availTop + screen.availHeight
  }
}
```

#### left 和 top

`left` 和 `top` 属性返回当前屏幕在多屏幕环境中的坐标位置。在单屏幕环境中，这些值通常为 0。

```javascript
// 获取屏幕位置
console.log("屏幕左侧位置:", screen.left)  // 例如: 0 或负数
console.log("屏幕顶部位置:", screen.top)   // 例如: 0

// 多屏幕环境中的窗口定位示例
// 主屏幕: left=0, width=1920
// 副屏幕: left=1920, width=1920（在右侧）
function moveWindowToScreen(screenIndex) {
  // 假设每个屏幕宽度相同
  const targetX = screenIndex * screen.width
  window.moveTo(targetX, 0)
}
```

**浏览器兼容性说明**：
- `left` 和 `top` 属性在部分浏览器中不支持
- 多屏幕环境下的行为因浏览器而异
- 建议结合 `window.screenX` 和 `window.screenY` 使用

### 屏幕颜色属性

#### colorDepth 和 pixelDepth

`colorDepth` 和 `pixelDepth` 返回屏幕的颜色深度（位深），表示每个像素可以显示的颜色数量。这两个属性在现代浏览器中通常返回相同的值。

```javascript
// 获取颜色深度
console.log("颜色深度:", screen.colorDepth)  // 例如: 24 或 32
console.log("像素深度:", screen.pixelDepth)  // 通常与 colorDepth 相同

// 计算可显示的颜色数量
const colorCount = Math.pow(2, screen.colorDepth)
console.log("可显示颜色数:", colorCount.toLocaleString())
// 24位: 16,777,216 (约1677万色)
// 32位: 4,294,967,296 (约42.9亿色)
```

#### 颜色深度应用场景

```javascript
// 根据颜色深度选择图片质量
function getImageQuality() {
  if (screen.colorDepth >= 24) {
    return { quality: "high", format: "webp" }
  } else if (screen.colorDepth >= 16) {
    return { quality: "medium", format: "jpeg" }
  } else {
    return { quality: "low", format: "jpeg" }
  }
}

// 检测是否支持真彩色
function supportsTrueColor() {
  return screen.colorDepth >= 24
}

// 根据颜色能力调整渐变效果
function getGradientSteps() {
  // 低颜色深度设备减少渐变步数
  return screen.colorDepth >= 24 ? 256 : 64
}
```

**颜色深度对照表**：

| 位深 | 颜色数量 | 常见用途 |
|------|---------|---------|
| 8 位 | 256 | 旧设备、安全模式 |
| 16 位 | 65,536 | 移动设备（省电模式） |
| 24 位 | 16,777,216 | 标准显示器（真彩色） |
| 32 位 | 4,294,967,296 | 现代显示器（含透明通道） |

### 屏幕方向属性

`screen.orientation` 返回一个 `ScreenOrientation` 对象，包含 `type`（方向类型）和 `angle`（旋转角度）两个属性：

| **方向类型** | **说明** | **支持范围** |
|--------|------|---------|
| `portrait-primary` | 竖屏主方向（0°或180°） | 所有设备 |
| `portrait-secondary` | 竖屏次方向（180°） | 所有设备 |
| `landscape-primary` | 横屏主方向（90°） | 所有设备 |
| `landscape-secondary` | 横屏次方向（270°） | 所有设备 |

```
// 获取屏幕方向信息
console.log("屏幕方向:", screen.orientation.type)   // 例如: 'landscape-primary'
console.log("旋转角度:", screen.orientation.angle) // 例如: 0, 90, 180, 270

// 判断屏幕方向
function getOrientationCategory() {
  const type = screen.orientation.type
  if (type.includes('portrait')) return 'portrait'
  if (type.includes('landscape')) return 'landscape'
  return 'unknown'
}

// 监听屏幕方向变化
screen.orientation.addEventListener("change", () => {
  console.log("方向已改变:", screen.orientation.type)
  console.log("当前角度:", screen.orientation.angle)
  updateLayout()
})
```

#### 锁定屏幕方向

在支持全屏 API 的应用中，可以锁定屏幕方向：

```javascript
// 锁定为竖屏
async function lockPortrait() {
  try {
    await screen.orientation.lock('portrait')
    console.log("已锁定为竖屏")
  } catch (error) {
    console.error("无法锁定屏幕方向:", error.message)
  }
}

// 锁定为横屏
async function lockLandscape() {
  try {
    await screen.orientation.lock('landscape')
    console.log("已锁定为横屏")
  } catch (error) {
    console.error("无法锁定屏幕方向:", error.message)
  }
}

// 解除方向锁定
function unlockOrientation() {
  if (screen.orientation && screen.orientation.unlock) {
    screen.orientation.unlock()
  }
}
```

#### 方向适配实战示例

```javascript
// 根据屏幕方向调整布局
function adjustLayoutForOrientation() {
  const isPortrait = screen.orientation.type.includes('portrait')
  const body = document.body
  
  if (isPortrait) {
    body.classList.add('portrait')
    body.classList.remove('landscape')
    // 竖屏布局：单列显示
    document.getElementById('container').style.flexDirection = 'column'
  } else {
    body.classList.add('landscape')
    body.classList.remove('portrait')
    // 横屏布局：双列显示
    document.getElementById('container').style.flexDirection = 'row'
  }
}

// 监听方向变化，自动调整布局
screen.orientation?.addEventListener('change', adjustLayoutForOrientation)
window.addEventListener('resize', adjustLayoutForOrientation) // 降级方案

// 封装方向锁定管理器
const orientationManager = {
  async lock(orientation) {
    try {
      await screen.orientation.lock(orientation)
      return true
    } catch {
      return false
    }
  },

  unlock() {
    screen.orientation?.unlock()
  }
}

async function startGame() {
  const locked = await orientationManager.lock('landscape')
  if (locked) {
    console.log('游戏已锁定横屏模式')
  }
}
```

**浏览器兼容性注意事项**：
- `screen.orientation` 在 IE 和旧版浏览器中不支持
- 方向锁定功能需要全屏模式或特定权限
- 移动设备支持更好，桌面浏览器支持有限

## 实际应用场景

### 1. 响应式布局适配

根据屏幕尺寸动态调整页面布局，提供最佳用户体验。

```javascript
// 屏幕尺寸检测
function detectScreenCapability() {
  const { width, height } = screen
  const dpr = window.devicePixelRatio || 1
  const physicalWidth = width * dpr
  
  return {
    category: getScreenCategory(width, height),
    pixelRatio: dpr,
    physicalWidth,
    isHighDPI: dpr > 1,
    is4K: physicalWidth >= 3840
  }
}

function getScreenCategory(width, height) {
  if (width >= 1920 && height >= 1080) return 'large'
  if (width >= 1366 && height >= 768) return 'medium'
  if (width >= 768) return 'small'
  return 'mobile'
}

// 应用布局策略
const screenInfo = detectScreenCapability()
document.documentElement.setAttribute('data-screen', screenInfo.category)
document.documentElement.setAttribute('data-dpr', screenInfo.pixelRatio)
```

### 2. 全屏应用开发

结合 Fullscreen API 实现全屏功能。

```javascript
// 全屏管理器
class FullscreenManager {
  constructor() {
    this.element = null
    this.isFullscreen = false
  }
  
  async enter(element = document.documentElement) {
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen()
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen()
      }
      this.element = element
      this.isFullscreen = true
    } catch (error) {
      console.error('进入全屏失败:', error)
    }
  }

  async exit() {
    if (document.exitFullscreen) {
      await document.exitFullscreen()
    }
    this.isFullscreen = false
  }

  toggle(element) {
    return this.isFullscreen ? this.exit() : this.enter(element)
  }
}

const fullscreenManager = new FullscreenManager()
fullscreenManager
  .enter()
  .then(() => {
    console.log('已进入全屏')
  })

// 监听全屏变化
document.addEventListener('fullscreenchange', () => {
  console.log('全屏状态:', document.fullscreenElement !== null)
})
```

### 3. 多显示器环境适配

处理多显示器环境下的窗口定位和布局。

```javascript
// 多屏幕环境检测与管理
class MultiScreenManager {
  constructor() {
    this.screens = this.detectScreens()
  }
  
  detectScreens() {
    // 注意：浏览器安全限制，无法直接获取所有屏幕信息
    // 只能通过间接方式推测
    return {
      primary: {
        width: screen.width,
        height: screen.height,
        availLeft: screen.availLeft,
        availTop: screen.availTop
      },
      // availLeft/availTop 非 0 时可能存在多屏幕
      hasMultiple: screen.availLeft !== 0 || screen.availTop !== 0
    }
  }

  // 获取当前窗口相对于屏幕的位置与大小
  getWindowScreenInfo() {
    return {
      windowX: window.screenX,
      windowY: window.screenY,
      windowWidth: window.outerWidth,
      windowHeight: window.outerHeight,
      screen: this.screens.primary
    }
  }
}

// 使用示例
const multiScreen = new MultiScreenManager()
console.log("多屏幕环境:", multiScreen.screens.hasMultiple)
console.log("当前屏幕:", multiScreen.getWindowScreenInfo())
```

### 4. 性能优化与资源加载

根据屏幕能力优化资源加载策略。

```javascript
// 资源加载优化器
class ResourceOptimizer {
  constructor() {
    this.screenInfo = this.analyzeScreen()
  }
  
  analyzeScreen() {
    const dpr = window.devicePixelRatio || 1
    const { width, height, colorDepth } = screen
    
    return {
      pixelRatio: dpr,
      width: width * dpr,
      height: height * dpr,
      colorDepth,
      // 高分屏且屏幕较大时加载高清资源
      shouldLoadHighRes: dpr >= 2 && width >= 1280,
      shouldLoadRetinaImages: dpr >= 2
    }
  }

  getImageSrc(baseName, extension = 'png') {
    const suffix = this.screenInfo.shouldLoadRetinaImages ? '@2x' : ''
    return `${baseName}${suffix}.${extension}`
  }
}

const optimizer = new ResourceOptimizer()

// 根据能力加载不同质量的资源
if (optimizer.screenInfo.shouldLoadHighRes) {
  loadHighResAssets()
} else {
  loadStandardAssets()
}
```

### 5. 游戏与多媒体应用

针对游戏和多媒体应用的屏幕适配。

```javascript
// 游戏屏幕适配器
class GameScreenAdapter {
  constructor(canvasElement) {
    this.canvas = canvasElement
    this.context = canvasElement.getContext('2d')
    this.setupCanvas()
    this.listenOrientationChange()
  }
  
  setupCanvas() {
    const dpr = window.devicePixelRatio || 1
    // 画布使用视口大小，并按 DPR 放大以保证清晰度
    const cssWidth = Math.min(window.innerWidth, screen.availWidth)
    const cssHeight = Math.min(window.innerHeight, screen.availHeight)

    this.canvas.style.width = cssWidth + 'px'
    this.canvas.style.height = cssHeight + 'px'
    this.canvas.width = cssWidth * dpr
    this.canvas.height = cssHeight * dpr
    this.context.scale(dpr, dpr)
  }

  listenOrientationChange() {
    const onOrientationChange = () => this.setupCanvas()
    screen.orientation
      ? screen.orientation.addEventListener('change', onOrientationChange)
      : window.addEventListener('orientationchange', onOrientationChange)
  }

  async lockLandscape() {
    try {
      await screen.orientation.lock('landscape')
    } catch (error) {
      console.warn('方向锁定失败:', error.message)
    }
  }
}

const gameAdapter = new GameScreenAdapter(document.getElementById('game-canvas'))

// 进入游戏时锁定横屏
document.getElementById('start-game-btn').addEventListener('click', () => {
  gameAdapter.lockLandscape()
})
```

## 常见错误和注意事项

### 1. 窗口操作限制

现代浏览器出于安全考虑，严格限制窗口操作权限。

```javascript
// ❌ 错误：直接调整窗口大小（大多数情况会被阻止）
window.resizeTo(screen.availWidth, screen.availHeight)

// ✅ 正确：使用 Fullscreen API 或提供用户控制
async function enterFullscreenMode() {
  try {
    await document.documentElement.requestFullscreen()
  } catch (error) {
    console.error("全屏请求被拒绝:", error)
    alert("请手动按 F11 进入全屏")
  }
}

// ✅ 正确：提供用户触发的按钮
document.getElementById('fullscreen-btn').addEventListener('click', () => {
  enterFullscreenMode()
})
```

**限制说明**：
- `window.resizeTo()` 和 `window.moveTo()` 只能由用户触发的脚本调用
- 某些浏览器完全禁用这些方法
- 建议使用 CSS 和响应式设计代替窗口操作

### 2. 屏幕尺寸与视口尺寸混淆

`screen` 对象返回的是物理屏幕尺寸，不是浏览器视口尺寸。

```javascript
// ❌ 错误：混淆屏幕尺寸和视口尺寸
const contentWidth = screen.width      // 这是屏幕宽度，不是视口宽度
const contentHeight = screen.height    // 这是屏幕高度，不是视口高度

// ✅ 正确：使用正确的方式获取尺寸
// 获取视口尺寸（推荐）
const viewport = {
  width: window.innerWidth,
  height: window.innerHeight
}

// 获取文档尺寸（包含滚动区域）
function getDocumentSize() {
  return {
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    document: {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight
    },
    pixelRatio: window.devicePixelRatio
  }
}
```

**使用场景对比**：

| 场景 | 应使用的尺寸 | 原因 |
|-----|-------------|------|
| 布局调整 | 视口尺寸 | 内容显示在视口内 |
| 全屏应用 | 屏幕尺寸 | 全屏使用整个屏幕 |
| 响应式图片 | 视口尺寸 + DPR | 图片需匹配显示区域 |
| 窗口定位 | 屏幕尺寸 | 需要知道屏幕边界 |

### 3. 多屏幕环境兼容性

多屏幕环境下 `screen` 对象的行为可能不一致。

```javascript
// ⚠️ 问题：浏览器可能只返回主屏幕信息
function unreliableMultiScreenDetection() {
  return screen.availLeft !== 0 || screen.availTop !== 0
}

// ✅ 改进：结合多种信息判断
function getScreenEnvironment() {
  return {
    screen: {
      width: screen.width,
      height: screen.height,
      left: screen.left,
      top: screen.top,
      availLeft: screen.availLeft,
      availTop: screen.availTop,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight
    },
    window: {
      x: window.screenX,
      y: window.screenY,
      width: window.outerWidth,
      height: window.outerHeight
    },
    isWindowFullyVisible() {
      const { windowX, windowY, windowWidth, windowHeight } = this.window
      return (
        windowX >= screen.availLeft &&
        windowY >= screen.availTop &&
        windowX + windowWidth <= screen.availLeft + screen.availWidth &&
        windowY + windowHeight <= screen.availTop + screen.availHeight
      )
    }
  }
}
```

### 4. 移动设备特殊性

移动设备上的 `screen` 对象行为与桌面设备有显著差异。

```javascript
// ❌ 错误：假设移动设备返回物理像素
const physicalWidth = screen.width  // 可能返回逻辑像素

// ✅ 正确：考虑设备像素比
function getDeviceScreenInfo() {
  const dpr = window.devicePixelRatio || 1
  
  return {
    // 逻辑尺寸（CSS 像素）
    logical: {
      width: screen.width,
      height: screen.height
    },
    // 物理尺寸（实际像素）
    physical: {
      width: screen.width * dpr,
      height: screen.height * dpr
    },
    dpr
  }
}

// 根据视口与 DPR 计算实际渲染宽度，选择合适的图片规格
function getImageSize() {
  const dpr = window.devicePixelRatio || 1
  const actualWidth = window.innerWidth * dpr

  // 根据实际渲染宽度选择图片
  if (actualWidth <= 320) return 'small'
  if (actualWidth <= 640) return 'medium'
  if (actualWidth <= 1280) return 'large'
  return 'xlarge'
}
```

**移动设备特殊行为**：
- `screen.width` 可能返回逻辑像素而非物理像素
- `orientation` 属性在移动设备上支持更好
- 某些属性可能返回固定值或不准确
- 需要结合 `devicePixelRatio` 计算实际尺寸

### 5. 隐私和安全考虑

`screen` 对象信息可能被用于设备指纹识别。

```javascript
// ⚠️ 风险：过度收集屏幕信息
const fingerprint = {
  width: screen.width,
  height: screen.height,
  colorDepth: screen.colorDepth,
  pixelDepth: screen.pixelDepth,
  availWidth: screen.availWidth,
  availHeight: screen.availHeight
}

// ✅ 最佳实践：最小化信息收集
// 1. 只在必要时获取信息
// 2. 获取用户授权后再记录
// 3. 保存粗粒度信息而非精确值

const screenPrivacy = {
  allowScreenInfo: false,

  // 获得授权后才返回屏幕信息，且只返回粗粒度数据
  getScreenInfo() {
    if (!this.allowScreenInfo) {
      return null
    }
    return {
      // 只区分大屏/中屏/小屏，不记录精确分辨率
      category: screen.width >= 1920 ? 'large' : screen.width >= 1024 ? 'medium' : 'small'
    }
  },

  enableScreenInfo() {
    this.allowScreenInfo = true
  }
}
```

### 6. orientation 属性兼容性

`screen.orientation` 属性在旧版浏览器中不支持，需要提供降级方案。

```javascript
// ❌ 错误：直接使用可能不支持
const orientation = screen.orientation.type

// ✅ 正确：提供兼容方案
function getOrientation() {
  // 方案 1：现代浏览器
  if (screen.orientation) {
    return {
      type: screen.orientation.type,
      angle: screen.orientation.angle,
      supported: true
    }
  }

  // 方案 2：降级——用 window 尺寸推断方向
  const isPortrait = window.innerHeight >= window.innerWidth
  return {
    type: isPortrait ? 'portrait' : 'landscape',
    angle: null,
    supported: false
  }
}

// 添加方向变化监听的兼容方案
function addOrientationListener(callback) {
  if (screen.orientation) {
    screen.orientation.addEventListener('change', callback)
  } else {
    window.addEventListener('orientationchange', callback)
    window.addEventListener('resize', callback)
  }
}

// 移除监听
function removeOrientationListener(callback) {
  if (screen.orientation) {
    screen.orientation.removeEventListener('change', callback)
  } else {
    window.removeEventListener('orientationchange', callback)
    window.removeEventListener('resize', callback)
  }
}
```

### 7. 动态更新处理

某些属性可能动态变化，需要监听相应事件。

```javascript
// ✅ 完整的变化监听方案
class ScreenChangeMonitor {
  constructor() {
    this.callbacks = []
    this.init()
  }
  
  init() {
    // 监听方向变化
    if (screen.orientation) {
      screen.orientation.addEventListener('change', () => {
        this.notify('orientation')
      })
    } else {
      window.addEventListener('orientationchange', () => {
        this.notify('orientation')
      })
    }

    // 监听 resize（尺寸变化、窗口移动等）
    let lastW = window.innerWidth
    let lastH = window.innerHeight
    window.addEventListener('resize', () => {
      if (window.innerWidth !== lastW || window.innerHeight !== lastH) {
        lastW = window.innerWidth
        lastH = window.innerHeight
        this.notify('resize')
      }
    })
  }

  // 通知所有订阅者
  notify(type) {
    this.callbacks.forEach((callback) => callback({ type, screen: { width: screen.width, height: screen.height } }))
  }

  // 订阅屏幕变化，返回取消订阅函数
  subscribe(callback) {
    this.callbacks.push(callback)
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback)
    }
  }
}

const monitor = new ScreenChangeMonitor()

const unsubscribe = monitor.subscribe((change) => {
  console.log('屏幕变化:', change.type, change)
  updateLayout()
})
```

## 浏览器兼容性

### 核心属性兼容性

| 属性 | Chrome | Firefox | Safari | Edge | IE |
|-----|--------|---------|--------|------|-----|
| `width` / `height` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `availWidth` / `availHeight` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `colorDepth` / `pixelDepth` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `orientation` | 38+ | 43+ | 16.4+ | 12+ | ✗ |
| `availLeft` / `availTop` | ✓ | ✓ | ✓ | ✓ | ✗ |
| `left` / `top` | 部分 | ✓ | 部分 | 部分 | ✗ |

### 方向锁定兼容性

| 方法 | Chrome | Firefox | Safari | Edge | 移动浏览器 |
|-----|--------|---------|--------|------|-----------|
| `lock()` | 38+ | 43+ | 16.4+ | 12+ | 大部分支持 |
| `unlock()` | 38+ | 43+ | 16.4+ | 12+ | 大部分支持 |

**注意**：方向锁定通常需要全屏模式才能工作。

## 最佳实践总结

### 1. 优先使用媒体查询

```javascript
// ✅ 推荐：使用 CSS 媒体查询
const mediaQuery = window.matchMedia('(min-width: 1920px)')

function handleScreenChange(e) {
  if (e.matches) {
    // 大屏幕布局
  } else {
    // 小屏幕布局
  }
}

mediaQuery.addListener(handleScreenChange)
handleScreenChange(mediaQuery)
```

### 2. 提供降级方案

```javascript
// ✅ 总是提供降级方案
function getScreenInfo() {
  try {
    return {
      width: screen.width || window.innerWidth,
      height: screen.height || window.innerHeight,
      colorDepth: screen.colorDepth || 24
    }
  } catch (e) {
    return { width: 1920, height: 1080, colorDepth: 24 }
  }
}
```

### 3. 最小化信息收集

```javascript
// ✅ 只收集必要信息
function getMinimalInfo() {
  return {
    // 使用布尔值而非具体值
    isLargeScreen: window.matchMedia('(min-width: 1920px)').matches,
    isHighDPI: window.devicePixelRatio > 1
  }
}
```

### 4. 结合其他 API 使用

```javascript
// ✅ 结合 ResizeObserver 监听变化
const resizeObserver = new ResizeObserver(entries => {
  for (let entry of entries) {
    console.log('元素尺寸变化:', entry.contentRect)
  }
})

resizeObserver.observe(document.documentElement)
```

## 常见问题 FAQ

### Q1: 为什么 `screen.width` 返回的值与显示器分辨率不一致？

**A**: 这通常是因为：
1. 设备像素缩放（DPI 缩放）设置
2. 移动设备的逻辑像素与物理像素差异
3. 高 DPI 显示器的缩放设置

解决方法：结合 `devicePixelRatio` 计算物理尺寸。

### Q2: 如何检测用户的显示器数量？

**A**: 出于隐私保护，浏览器不提供直接获取多显示器信息的 API。只能通过 `screen.availLeft` 等属性间接推测，但这不准确。

### Q3: `screen.orientation.lock()` 为什么不起作用？

**A**: 方向锁定通常需要：
1. 页面处于全屏模式
2. 用户主动触发的操作
3. 移动设备浏览器支持更好

### Q4: 如何在用户调整显示器分辨率后更新页面？

**A**: `screen` 对象属性不会自动更新。需要：
1. 监听 `window.resize` 事件
2. 或者定期轮询检查（不推荐）

### Q5: `screen` 对象在 iframe 中表现如何？

**A**: 在跨域 iframe 中，`screen` 对象可能返回受限或不准确的值，这是安全限制的一部分。
