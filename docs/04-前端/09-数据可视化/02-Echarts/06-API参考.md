---
title: API参考
description: "ECharts API 参考：涵盖全局 echarts 对象（init/connect/registerMap/use 等）、echartsInstance 实例方法（setOption/on/dispatchAction/convertToPixel 等）及常用使用示例。"
keywords: [API参考]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---


# ECharts API 参考

本文档详细介绍 ECharts 的 API，包括全局 echarts 对象和 echartsInstance 实例对象。

## 全局 echarts 对象

全局 echarts 对象在 script 标签引入 `echarts.js` 文件后获得，或者在 AMD 环境中通过 `require('echarts')` 获得。

### echarts.init

创建一个 ECharts 实例，返回 echartsInstance。

```typescript
echarts.init(
  dom?: HTMLDivElement | HTMLCanvasElement,
  theme?: Object | string,
  opts?: {
    devicePixelRatio?: number
    renderer?: string
    useDirtyRect?: boolean
    useCoarsePointer?: boolean
    pointerSize?: number
    ssr?: boolean
    width?: number | string
    height?: number | string
    locale?: string
  }
) => ECharts
```

**参数说明：**

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| dom | HTMLElement | 实例容器，一般是一个具有高宽的 DIV 元素 |
| theme | Object \| string | 应用主题，可以是配置对象或已注册的主题名称 |
| opts.devicePixelRatio | number | 设备像素比，默认取浏览器的值 |
| opts.renderer | string | 渲染模式，支持 `'canvas'` 或 `'svg'` |
| opts.ssr | boolean | 是否使用服务端渲染（5.3.0+） |
| opts.useDirtyRect | boolean | 是否开启脏矩形渲染（5.0.0+） |
| opts.width | number \| string | 显式指定实例宽度 |
| opts.height | number \| string | 显式指定实例高度 |
| opts.locale | string | 使用的语言（5.0.0+） |

**示例：**

```javascript
const chart = echarts.init(dom, null, { renderer: 'svg' })
const darkChart = echarts.init(dom, 'dark')
```

### echarts.connect

多个图表实例实现联动。

```typescript
echarts.connect(group: string | Array)
```

**示例：**

```javascript
// 分别设置每个实例的 group id
chart1.group = 'group1'
chart2.group = 'group1'
echarts.connect('group1')

// 或者直接传入需要联动的实例数组
echarts.connect([chart1, chart2])
```

### echarts.disconnect

解除图表实例的联动。

```typescript
echarts.disconnect(group: string)
```

### echarts.dispose

销毁实例，实例销毁后无法再被使用。

```typescript
echarts.dispose(target: ECharts | HTMLDivElement | HTMLCanvasElement)
```

### echarts.getInstanceByDom

获取 dom 容器上的实例。

```typescript
echarts.getInstanceByDom(target: HTMLDivElement | HTMLCanvasElement) => ECharts
```

### echarts.use

使用组件，配合按需引入的接口使用（5.0.1+）。

```typescript
echarts.use(components: Array)
```

**示例：**

```javascript
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([GridComponent, BarChart, CanvasRenderer])
```

> 注意：该方法必须在 `echarts.init` 之前使用。

### echarts.registerMap

注册可用的地图。

```typescript
echarts.registerMap(
  mapName: string,
  geoJSON: Object | string,
  specialAreas?: Object
)
```

**示例：**

```javascript
echarts.registerMap('USA', usaJson, {
  Alaska: {
    left: -131,
    top: 25,
    width: 15
  }
})
```

### echarts.getMap

获取已注册的地图。

```typescript
echarts.getMap(mapName: string) => Object
```

### echarts.registerTheme

注册主题。

```typescript
echarts.registerTheme(themeName: string, theme: Object)
```

### echarts.registerLocale

注册语言包（5.0.0+）。

```typescript
echarts.registerLocale(locale: string, localeCfg: Object)
```

### echarts.setPlatformAPI

设置平台相关的 API（5.3.0+），在 NodeJS 等非浏览器平台时可能需要提供。

```typescript
echarts.setPlatformAPI({
  createCanvas(): HTMLCanvasElement,
  measureText(text: string, font?: string): { width: number },
  loadImage(src: string, onload: () => void, onerror: () => void): HTMLImageElement
})
```

### echarts.graphic

图形相关帮助方法。

#### echarts.graphic.extendShape

创建一个新的 shape class。

```typescript
echarts.graphic.extendShape(opts: Object) => zrender.graphic.Path
```

#### echarts.graphic.registerShape

注册一个开发者定义的 shape class。

```typescript
echarts.graphic.registerShape(name: string, ShapeClass: zrender.graphic.Path)
```

**示例：**

```javascript
var MyShape = echarts.graphic.extendShape({
  shape: {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  },
  buildPath: function(ctx, shape) {
    ctx.moveTo(shape.x, shape.y)
    ctx.lineTo(shape.x + shape.width, shape.y)
    ctx.lineTo(shape.x, shape.y + shape.height)
    ctx.lineTo(shape.x + shape.width, shape.y + shape.height)
    ctx.closePath()
  }
})
echarts.graphic.registerShape('myCustomShape', MyShape)
```

#### echarts.graphic.getShapeClass

获取一个注册好的 class。

```typescript
echarts.graphic.getShapeClass(name: string) => zrender.graphic.Path
```

内置 shape class：`'circle'`, `'sector'`, `'ring'`, `'polygon'`, `'polyline'`, `'rect'`, `'line'`, `'bezierCurve'`, `'arc'`

#### echarts.graphic.clipPointsByRect

输入一组点和一个矩形，返回被矩形截取过的点。

```typescript
echarts.graphic.clipPointsByRect(
  points: Array<Array<number>>,
  rect: { x: number, y: number, width: number, height: number }
) => Array<Array<number>>
```

#### echarts.graphic.clipRectByRect

输入两个矩形，返回第二个矩形截取第一个矩形的结果。

```typescript
echarts.graphic.clipRectByRect(
  targetRect: { x: number, y: number, width: number, height: number },
  rect: { x: number, y: number, width: number, height: number }
) => { x: number, y: number, width: number, height: number }
```

## echartsInstance 实例对象

通过 `echarts.init` 创建的实例对象。

### 属性

#### echartsInstance.group

图表的分组，用于联动。

```typescript
echartsInstance.group: string | number
```

### 方法

#### setOption

设置图表实例的配置项以及数据，万能接口。

```typescript
echartsInstance.setOption(
  option: Object,
  notMerge?: boolean,
  lazyUpdate?: boolean
)

// 或
echartsInstance.setOption(
  option: Object,
  opts?: {
    notMerge?: boolean
    replaceMerge?: string | string[]
    lazyUpdate?: boolean
    silent?: boolean
  }
)
```

**参数说明：**

| 参数 | 说明 |
| --- | --- |
| option | 图表的配置项和数据 |
| notMerge | 是否不跟之前设置的 option 进行合并，默认 false |
| replaceMerge | 指定进行替换合并的组件类型 |
| lazyUpdate | 是否不立即更新图表，默认 false |
| silent | 是否阻止调用 setOption 时抛出事件，默认 false |

#### getWidth

获取 ECharts 实例容器的宽度。

```typescript
echartsInstance.getWidth() => number
```

#### getHeight

获取 ECharts 实例容器的高度。

```typescript
echartsInstance.getHeight() => number
```

#### getDom

获取 ECharts 实例容器的 dom 节点。

```typescript
echartsInstance.getDom() => HTMLCanvasElement | HTMLDivElement
```

#### getOption

获取当前实例中维护的 option 对象。

```typescript
echartsInstance.getOption() => Object
```

> 注意：返回的 option 每个组件的属性值都统一是一个数组。

#### resize

改变图表尺寸，在容器大小发生改变时需要手动调用。

```typescript
echartsInstance.resize(opts?: {
  width?: number | string
  height?: number | string
  silent?: boolean
  animation?: {
    duration?: number
    easing?: string
  }
}) => ECharts
```

#### dispatchAction

触发图表行为。

```typescript
echartsInstance.dispatchAction(payload: Object)
```

**示例：**

```javascript
myChart.dispatchAction({
  type: 'dataZoom',
  start: 20,
  end: 30
})

myChart.dispatchAction({
  type: 'showTip',
  seriesIndex: 0,
  dataIndex: 1
})
```

#### on

绑定事件处理函数。

```typescript
echartsInstance.on(
  eventName: string,
  handler: Function,
  context?: Object
)

echartsInstance.on(
  eventName: string,
  query: string | Object,
  handler: Function,
  context?: Object
)
```

**示例：**

```javascript
chart.on('click', function(params) {})
chart.on('click', 'series', function() {})
chart.on('click', { seriesName: 'uuu' }, function() {})
```

#### off

解绑事件处理函数。

```typescript
echartsInstance.off(eventName: string, handler?: Function)
```

#### convertToPixel

转换坐标系上的点到像素坐标值。

```typescript
echartsInstance.convertToPixel(
  finder: {
    seriesIndex?: number
    seriesId?: string
    seriesName?: string
    geoIndex?: number
    geoId?: string
    geoName?: string
    xAxisIndex?: number
    xAxisId?: string
    xAxisName?: string
    yAxisIndex?: number
    yAxisId?: string
    yAxisName?: string
    gridIndex?: number
    gridId?: string
    gridName?: string
  },
  value: Array | number
) => Array | number
```

**示例：**

```javascript
chart.convertToPixel('geo', [128.3324, 89.5344])
chart.convertToPixel({ gridId: 'g1' }, [300, 900])
```

#### convertFromPixel

转换像素坐标值到逻辑坐标系上的点，是 `convertToPixel` 的逆运算。

```typescript
echartsInstance.convertFromPixel(finder: Object, value: Array | number) => Array | number
```

#### containPixel

判断给定的点是否在指定的坐标系或者系列上。

```typescript
echartsInstance.containPixel(finder: Object, value: Array) => boolean
```

**示例：**

```javascript
chart.containPixel('geo', [23, 44])
chart.containPixel({ gridId: 'z' }, [23, 44])
```

#### showLoading

显示加载动画效果。

```typescript
echartsInstance.showLoading(type?: string, opts?: Object)
```

**默认配置：**

```javascript
{
  text: 'loading',
  color: '#c23531',
  textColor: '#000',
  maskColor: 'rgba(255, 255, 255, 0.8)',
  zlevel: 0,
  fontSize: 12,
  showSpinner: true,
  spinnerRadius: 10,
  lineWidth: 5
}
```

#### hideLoading

隐藏加载动画效果。

```typescript
echartsInstance.hideLoading()
```

#### getDataURL

导出图表图片，返回一个 base64 的 URL。

```typescript
echartsInstance.getDataURL(opts?: {
  type?: string
  pixelRatio?: number
  backgroundColor?: string
  excludeComponents?: Array<string>
}) => string
```

**示例：**

```javascript
var img = new Image()
img.src = myChart.getDataURL({
  pixelRatio: 2,
  backgroundColor: '#fff'
})
```

#### getConnectedDataURL

导出联动的图表图片。

```typescript
echartsInstance.getConnectedDataURL(opts?: {
  type?: string
  pixelRatio?: number
  backgroundColor?: string
  excludeComponents?: Array<string>
}) => string
```

#### appendData

此方法用于在大数据量模式下追加数据。

```typescript
echartsInstance.appendData(opts: {
  seriesIndex: number
  data: Array
})
```

#### clear

清空当前实例，会移除实例中所有的组件和图表。

```typescript
echartsInstance.clear()
```

#### dispose

销毁实例，销毁后实例无法再被使用。

```typescript
echartsInstance.dispose()
```

## 常用 API 使用示例

### 完整初始化流程

```javascript
// 1. 获取 DOM 容器
const dom = document.getElementById('chart')

// 2. 初始化实例
const chart = echarts.init(dom, 'dark', {
  renderer: 'canvas',
  useDirtyRect: true,
  locale: 'ZH'
})

// 3. 设置配置项
chart.setOption({
  title: { text: '示例图表' },
  xAxis: { data: ['A', 'B', 'C'] },
  yAxis: {},
  series: [{ type: 'bar', data: [10, 20, 30] }]
})

// 4. 监听事件
chart.on('click', (params) => {
  console.log('点击了:', params.name, params.value)
})

// 5. 响应式处理
const observer = new ResizeObserver(() => chart.resize())
observer.observe(dom)

// 6. 清理
// window.addEventListener('beforeunload', () => {
//   observer.disconnect()
//   chart.dispose()
// })
```

### 动态更新数据

```javascript
// 追加数据
function appendData(newData) {
  chart.appendData({
    seriesIndex: 0,
    data: newData
  })
}

// 批量更新
function updateAllData(seriesData) {
  chart.setOption({
    series: seriesData.map(data => ({ data }))
  })
}

// 增量更新（保留其他配置）：按索引定位到指定系列
function updateSeries(index, data) {
  const series = []
  series[index] = { data }
  chart.setOption({ series })
}
```

### 事件处理完整示例

```javascript
// 鼠标事件
chart.on('click', 'series', (params) => {
  console.log('点击了系列:', params.seriesName)
})

chart.on('click', { seriesIndex: 0 }, (params) => {
  console.log('点击了第一个系列')
})

// 组件事件
chart.on('legendselectchanged', (params) => {
  console.log('图例选中状态变化:', params.selected)
})

chart.on('datazoom', (params) => {
  console.log('数据缩放:', params.start, params.end)
})

// 自定义交互
chart.on('mouseover', (params) => {
  // 鼠标悬停时高亮相关数据
  chart.dispatchAction({
    type: 'highlight',
    seriesIndex: params.seriesIndex,
    dataIndex: params.dataIndex
  })
})

chart.on('mouseout', (params) => {
  chart.dispatchAction({
    type: 'downplay',
    seriesIndex: params.seriesIndex,
    dataIndex: params.dataIndex
  })
})
```

### 导出图表

```javascript
// 导出为 PNG 图片
function exportAsPNG() {
  const url = chart.getDataURL({
    type: 'png',
    pixelRatio: 2,  // 高清
    backgroundColor: '#fff'
  })

  const link = document.createElement('a')
  link.download = 'chart.png'
  link.href = url
  link.click()
}

// 导出联动图表
function exportConnected() {
  const url = chart.getConnectedDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#fff'
  })
  // ...
}
```

### 坐标转换

```javascript
// 数据坐标 -> 像素坐标
const pixel = chart.convertToPixel('grid', [10, 20])
console.log('像素坐标:', pixel)  // [x, y]

// 像素坐标 -> 数据坐标
const data = chart.convertFromPixel('grid', [100, 200])
console.log('数据坐标:', data)  // [x, y]

// 判断点是否在图表内
const isInChart = chart.containPixel('grid', [150, 150])
console.log('点是否在图表内:', isInChart)
```

### Loading 状态

```javascript
// 显示加载动画
chart.showLoading('default', {
  text: '数据加载中...',
  color: '#c23531',
  textColor: '#000',
  maskColor: 'rgba(255, 255, 255, 0.8)',
  zlevel: 0,
  fontSize: 12,
  showSpinner: true,
  spinnerRadius: 10,
  lineWidth: 5
})

// 自定义加载动画
chart.showLoading({
  text: '加载中',
  color: '#1890ff',
  fontSize: 14,
  showSpinner: true
})

// 隐藏加载动画
chart.hideLoading()
```

### 获取图表信息

```javascript
// 获取图表尺寸
const width = chart.getWidth()
const height = chart.getHeight()

// 获取当前配置
const currentOption = chart.getOption()
console.log('当前配置:', currentOption)

// 获取 DOM 元素
const dom = chart.getDom()
```

### 清空与重置

```javascript
// 清空图表（保留实例）
chart.clear()

// 重新设置配置
chart.setOption(newOption)

// 重置数据缩放
chart.dispatchAction({
  type: 'dataZoom',
  start: 0,
  end: 100
})
```

### 图表联动

```javascript
// 创建多个图表
const chart1 = echarts.init(dom1)
const chart2 = echarts.init(dom2)

// 方式一：通过 group
chart1.group = 'group1'
chart2.group = 'group1'
echarts.connect('group1')

// 方式二：通过数组
echarts.connect([chart1, chart2])

// 解除联动
echarts.disconnect('group1')
```

### 自定义图形

```javascript
// 注册自定义图形
const CustomShape = echarts.graphic.extendShape({
  shape: {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  },
  buildPath: function(ctx, shape) {
    const { x, y, width, height } = shape
    ctx.moveTo(x, y)
    ctx.lineTo(x + width, y)
    ctx.lineTo(x + width, y + height)
    ctx.lineTo(x, y + height)
    ctx.closePath()
  }
})

echarts.graphic.registerShape('customRect', CustomShape)

// 在自定义系列中使用
option = {
  series: [{
    type: 'custom',
    renderItem: function(params, api) {
      return {
        type: 'customRect',
        shape: {
          x: api.value(0),
          y: api.value(1),
          width: 20,
          height: 30
        },
        style: {
          fill: '#5470c6'
        }
      }
    },
    data: [[10, 20], [30, 40]]
  }]
}
```

## 相关链接

- [API 文档](https://echarts.apache.org/zh/api.html)
- [配置项手册](https://echarts.apache.org/zh/option.html)
- [事件列表](https://echarts.apache.org/zh/api.html#events)
- [行为列表](https://echarts.apache.org/zh/api.html#action)
