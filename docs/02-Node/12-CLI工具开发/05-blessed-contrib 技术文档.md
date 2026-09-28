---
title: blessed-contrib 技术文档
description: blessed-contrib 的仪表盘/图表/日志组件在终端监控大屏中的应用
keywords: [Node.js, CLI, commander, blessed-contrib]
category: Node.js
tags: [Node.js, CLI工具开发]
---







# blessed-contrib 技术文档

## 概述

`blessed-contrib` 是基于 `blessed` 构建的 Node.js 库，用于在终端中创建功能丰富的仪表盘和可视化界面。它提供了一系列预置的、可组合的组件，使开发者能够轻松地构建出色的命令行界面（CLI）应用程序，实现数据的实时可视化

### 主要特点和优势

- **丰富的组件库**：提供多种即用型组件，如表格（Table）、折线图（Line Chart）、柱状图（Bar Chart）、仪表盘（Gauge）、地图（Map）等，满足各种数据展示需求
- **实时数据可视化**：支持动态更新组件数据，非常适合用于实时监控和数据分析场景
- **灵活的布局系统**：基于网格布局（Grid），可以轻松地将多个组件排列组合，构建复杂的仪表盘界面
- **跨平台兼容**：`blessed-contrib` 可以在大多数现代终端模拟器上运行，包括 Linux、macOS 和 Windows
- **高度可定制**：每个组件都提供丰富的配置选项，允许开发者自定义样式、颜色和行为

### 典型应用场景

- **服务器监控**：实时显示 CPU 使用率、内存占用、网络流量等系统指标
- **数据仪表盘**：聚合和展示来自不同数据源的业务数据，如销售额、用户活跃度等
- **开发工具**：构建交互式的开发辅助工具，如日志查看器、任务管理器等
- **物联网（IoT）**：可视化来自传感器和物联网设备的数据流

### 安装与配置

```bash
pnpm install blessed blessed-contrib
```

> **终端兼容性**：为获得最佳的显示效果，建议使用支持 256 色和 Unicode 字符的现代终端，如 iTerm2（macOS）、GNOME Terminal（Linux）或 Windows Terminal（Windows）

## 核心组件

`blessed-contrib` 提供基于网格（Grid）的布局系统，用于组织和管理各种组件

### 网格布局（Grid）

`Grid` 是 `blessed-contrib` 的核心布局工具，它将终端屏幕划分为一个 12x12 的网格。可以通过指定行、列、行跨度和列跨度来将组件放置在网格的任意位置

**创建 Grid 示例：**

```javascript
const blessed = require("blessed")
const contrib = require("blessed-contrib")

const screen = blessed.screen()
const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen })

// 将一个组件放置在第 0 行、第 0 列，占据 4 行 4 列
const component = grid.set(0, 0, 4, 4, contrib.log, { label: "My Log" })
```

### 支持的组件类型

以下是 `blessed-contrib` 提供的主要组件及其配置说明

#### `log` - 日志组件

用于显示日志信息流

- **`label`**: (String) 组件的标签
- **`fg`**: (String) 前景色。
- **`selectedFg`**: (String) 选中项的前景色

#### `line` - 折线图

用于展示时间序列数据或趋势

- **`style`**: (Object)
  - **`line`**: (String) 线的颜色。
  - **`text`**: (String) 文本颜色。
  - **`baseline`**: (String) 基线颜色。
- **`xLabelPadding`**: (Number) x 轴标签的内边距。
- **`xPadding`**: (Number) x 轴的内边距。
- **`showLegend`**: (Boolean) 是否显示图例。
- **`wholeNumbersOnly`**: (Boolean) y 轴是否只显示整数。

#### `bar` - 柱状图

用于比较不同类别的数据

- **`label`**: (String) 标签
- **`barWidth`**: (Number) 柱子的宽度
- **`barSpacing`**: (Number) 柱子之间的间距
- **`xOffset`**: (Number) x 轴的偏移量
- **`maxHeight`**: (Number) 柱子的最大高度

#### `table` - 表格

用于以表格形式展示数据

- **`keys`**: (Boolean) 是否响应键盘事件
- **`fg`**: (String) 前景色
- **`selectedFg`**: (String) 选中行的前景色
- **`selectedBg`**: (String) 选中行的背景色
- **`interactive`**: (Boolean) 是否可交互
- **`columnSpacing`**: (Number) 列间距
- **`columnWidth`**: (Array) 每列的宽度（字符数）

#### `gauge` - 仪表盘

用于显示百分比或进度

- **`label`**: (String) 标签
- **`stroke`**: (String) 仪表盘的颜色
- **`fill`**: (String) 填充颜色

#### `gauge-list` - 仪表盘列表

在一个组件中显示多个仪表盘

#### `donut` - 甜甜圈图

用于显示数据的部分与整体的关系

- **`radius`**: (Number) 半径
- **`arcWidth`**: (Number) 弧的宽度
- **`remainColor`**: (String) 剩余部分的颜色
- **`yPadding`**: (Number) y 轴的内边距

#### `map` - 地图

用于在世界地图上标记位置

- **`label`**: (String) 标签
- **`markers`**: (Array) 标记点数组

#### `markdown` - Markdown 组件

用于渲染 Markdown 格式的文本

- **`markdown`**: (String) 要渲染的 Markdown 字符串

### 组件间的交互

`blessed-contrib` 的组件可以响应键盘和鼠标事件。可以使用 `blessed` 提供的事件处理机制来捕获这些事件

**示例：**

```javascript
const table = grid.set(0, 0, 4, 4, contrib.table, {
  interactive: true,
  label: "My Table"
})

table.rows.on("select", (item, index) => {
  console.log(`Selected item: ${item.getContent()}, index: ${index}`)
})
```

## 完整示例代码

### 基础仪表盘示例

这个示例展示使用 `Grid` 布局创建一个包含多种组件的基础仪表盘

```javascript
import blessed from "blessed"
import contrib from "blessed-contrib"

// 创建 blessed 屏幕
const screen = blessed.screen()

// 创建 12x12 的网格布局
const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen })

// 创建一个 Markdown 组件
const markdown = grid.set(0, 0, 4, 4, contrib.markdown, {
  label: "Info",
  markdown:
    "# Welcome to\n`blessed-contrib`\n\n> A library for building terminal dashboards."
})

// 创建一个折线图组件
const line = grid.set(4, 0, 4, 8, contrib.line, {
  style: {
    line: "yellow",
    text: "green",
    baseline: "black"
  },
  xLabelPadding: 3,
  xPadding: 5,
  showLegend: true,
  wholeNumbersOnly: false,
  label: "Server Utilization (%)"
})

// 创建一个柱状图组件
const bar = grid.set(0, 4, 4, 4, contrib.bar, {
  label: "Server Load",
  barWidth: 4,
  barSpacing: 6,
  xOffset: 0,
  maxHeight: 9
})

// 创建一个表格组件
const table = grid.set(8, 0, 4, 4, contrib.table, {
  keys: true,
  fg: "white",
  selectedFg: "white",
  selectedBg: "blue",
  interactive: true,
  label: "Active Processes",
  width: "30%",
  height: "30%",
  border: { type: "line", fg: "cyan" },
  columnSpacing: 10,
  columnWidth: [16, 12, 12]
})

// 为折线图设置初始数据
const series = {
  title: "CPU",
  x: ["t1", "t2", "t3", "t4"],
  y: [5, 1, 7, 5]
}
line.setData([series])

// 为柱状图设置数据
bar.setData({
  titles: ["db", "web", "api"],
  data: [5, 9, 2]
})

// 为表格设置数据
table.setData({
  headers: ["Process", "CPU", "Memory"],
  data: [
    ["node", "1.5%", "20MB"],
    ["11-Nginx基础概述", "0.3%", "5MB"],
    ["redis", "0.8%", "15MB"]
  ]
})

// 聚焦到表格，使其可交互
table.focus()

// 渲染屏幕
screen.render()

// 按下 'q' 或 'escape' 或 'ctrl-c' 退出程序
screen.key(["escape", "q", "C-c"], function (ch, key) {
  return process.exit(0)
})
```

### 实时数据监控示例

这个示例展示动态更新组件数据，实现实时监控的效果


```javascript
import blessed from "blessed"
import contrib from "blessed-contrib"

const screen = blessed.screen()
const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen })

// 创建折线图用于显示实时 CPU 使用率
const line = grid.set(0, 0, 6, 6, contrib.line, {
  showNthLabel: 5,
  maxY: 100,
  label: "CPU Utilization",
  showLegend: true,
  legend: { width: 12 }
})

// 创建仪表盘用于显示内存使用率
const gauge = grid.set(6, 0, 6, 6, contrib.gauge, {
  label: "Memory Usage"
})

// 模拟实时数据
const cpuData = {
  title: "CPU",
  x: Array.from(Array(100).keys()).map(String),
  y: Array(100).fill(0)
}

// 动态更新数据
setInterval(() => {
  // 更新 CPU 数据
  const newCpuUsage = Math.random() * 100
  cpuData.y.shift()
  cpuData.y.push(newCpuUsage)
  line.setData([cpuData])

  // 更新内存数据
  const newMemUsage = Math.random() * 100
  gauge.setPercent(Math.round(newMemUsage))

  // 重新渲染屏幕
  screen.render()
}, 1000)

screen.key(["escape", "q", "C-c"], () => process.exit(0))

screen.render()
```

## 综合示例：构建功能丰富的仪表盘

本章节将通过一系列具体的、可独立运行的示例，展示如何利用 `blessed-contrib` 的核心组件构建功能丰富的 CLI 仪表盘。每个示例都侧重于一个特定的组件或功能，并提供了完整的代码和效果说明。

### 网格布局与多组件组合 (grid.js)

这个示例是 `blessed-contrib` 功能的集中展示。它利用 12x12 的网格布局，组合了 `gauge`、`donut`、`bar`、`line`、`table`、`log` 和 `map` 等多个组件，构建了一个复杂但有序的仪表盘界面。

核心功能

- **网格布局 (`grid`)**：创建 12x12 的网格，将屏幕划分为多个区域
- **多组件集成**：在网格的不同位置放置多种组件，展示不同类型的数据
- **动态数据更新**：通过 `setInterval` 定时更新 `gauge` 和 `donut` 组件的数据，模拟实时变化
- **交互式退出**：监听键盘事件，实现安全退出

示例代码：


```javascript
import blessed from "blessed"
import contrib from "blessed-contrib"

// 创建屏幕
const screen = blessed.screen({
  fullUnicode: true,
  smartCSR: true,
  title: "仪表盘 - 多组件布局"
})

// 创建 12x12 网格布局
const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen })

// 1. 仪表盘 (Gauge)
const gauge = grid.set(0, 0, 4, 4, contrib.gauge, {
  label: "CPU 使用率",
  stroke: "green",
  fill: "white",
  percent: 0.3
})

// 2. 甜甜圈图 (Donut)
const donut = grid.set(0, 4, 4, 4, contrib.donut, {
  label: "任务进度",
  radius: 8,
  arcWidth: 3,
  remainColor: "black",
  data: [{ percent: 0.3, label: "任务A", color: "green" }]
})

// 3. 条形图 (Bar Chart)
const bar = grid.set(4, 0, 4, 4, contrib.bar, {
  label: "月度销售额 (百万)",
  barWidth: 4,
  barSpacing: 6,
  xOffset: 2,
  maxHeight: 9,
  data: { titles: ["一月", "二月", "三月"], data: [5, 8, 7] }
})

// 4. 折线图 (Line Chart)
const line = grid.set(4, 4, 4, 4, contrib.line, {
  style: { line: "yellow", text: "green", baseline: "blue" },
  label: "网络流量 (MB/s)",
  showLegend: true,
  legend: { width: 12 }
})

// 5. 表格 (Table)
const table = grid.set(8, 0, 4, 8, contrib.table, {
  keys: true,
  fg: "white",
  selectedFg: "white",
  selectedBg: "blue",
  interactive: true,
  label: "活跃进程",
  border: { type: "line", fg: "cyan" },
  columnSpacing: 10,
  columnWidth: [24, 10, 10]
})

// 6. 日志 (Log)
const log = grid.set(0, 8, 8, 4, contrib.log, { fg: "green", label: "系统日志" })

// 7. 地图 (Map)
const map = grid.set(8, 8, 4, 4, contrib.map, { label: "服务器地理分布" })

// 动态更新计数器
let updateCount = 0

// 动态更新函数
const updateData = () => {
  // 更新仪表盘
  gauge.setPercent(Math.max(0, Math.min(1, 0.3 + Math.sin(updateCount * 0.1) * 0.2)))

  // 更新甜甜圈图
  const donutData = donut.options.data[0]
  donutData.percent = (donutData.percent + 0.05) % 1
  donut.setData([donutData])

  // 更新折线图
  const lineData = {
    title: "流量",
    x: Array.from({ length: 10 }, (_, i) => (updateCount + i).toString()),
    y: Array.from({ length: 10 }, () => Math.random() * 5 + 2)
  }
  line.setData([lineData])

  // 更新日志
  log.log(`系统状态更新 #${updateCount + 1}`)

  // 重新渲染屏幕
  screen.render()
  updateCount++
}

// 初始化数据
table.setData({
  headers: ["进程名", "CPU", "内存"],
  data: [
    ["node", "12%", "256MB"],
    ["chrome", "8%", "512MB"],
    ["docker", "5%", "1GB"]
  ]
})

// 设置定时器，每 0.5 秒更新一次数据
const updateInterval = setInterval(updateData, 500)

// 退出应用程序
screen.key(["escape", "q", "C-c"], (ch, key) => {
  clearInterval(updateInterval)
  return process.exit(0)
})

// 初始渲染
screen.render()
```

### 动态折线图 (line.js)

本示例聚焦于 `line` 组件，创建一个动态更新的折线图，非常适合用于监控时间序列数据，如服务器负载、应用性能指标或气温变化

核心功能

- **数据初始化**：生成一组初始数据，包含 x 轴标签和 y 轴数值
- **动态更新**：使用 `setInterval` 定时模拟数据波动，并调用 `setData` 方法更新图表
- **样式定制**：通过 `style` 选项设置线条、文本和基线的颜色

示例代码：

```javascript
import blessed from "blessed"
import contrib from "blessed-contrib"

// 创建屏幕
const screen = blessed.screen({
  fullUnicode: true,
  smartCSR: true,
  title: "动态折线图"
})

// 创建折线图组件
const lineChart = contrib.line({
  style: {
    line: "yellow", // 线条颜色
    text: "green", // 文本颜色
    baseline: "blue" // 基线颜色
  },
  label: "一周气温变化 (°C)"
})

// 初始数据
const generateWeeklyData = () => ({
  x: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
  y: [8, 12, 15, 10, 18, 20, 16],
  style: {
    line: "yellow"
  }
})

let data = generateWeeklyData()

// 将折线图附加到屏幕并设置数据
screen.append(lineChart)
lineChart.setData([data])

// 动态更新数据
const updateData = () => {
  // 模拟温度波动
  const newTemperatures = data.y.map((temp) => {
    const fluctuation = (Math.random() - 0.5) * 2 // -1 到 1 之间的波动
    return Math.max(5, Math.min(25, temp + fluctuation)) // 保持在 5-25 度之间
  })

  // 更新数据
  lineChart.setData([{ ...data, y: newTemperatures }])

  // 重新渲染屏幕
  screen.render()
}

// 设置定时器，每 0.5 秒更新一次
const updateInterval = setInterval(updateData, 500)

// 按 'q' 或 'escape' 退出
screen.key(["escape", "q", "C-c"], (ch, key) => {
  clearInterval(updateInterval)
  return process.exit(0)
})

// 初始渲染
screen.render()
```

### 交互式表格 (table.js)

本示例重点展示 `table` 组件的交互功能。它创建了一个包含学生成绩的表格，并实现了总分计算、排序、行选择和数据刷新等功能

核心功能：

- **数据处理**：在加载数据时动态计算总分
- **排序功能**：根据总分对学生进行降序排序
- **事件监听**：通过监听 `select` 事件，在用户选择某一行时输出该行数据
- **键盘交互**：支持通过按键（如 'r'）刷新数据

示例代码：


```javascript
import blessed from "blessed"
import contrib from "blessed-contrib"

// 创建屏幕
const screen = blessed.screen({
  fullUnicode: true,
  smartCSR: true,
  title: "学生成绩管理系统"
})

// 创建表格
const table = contrib.table({
  keys: true,
  label: "学生成绩单",
  width: "80%",
  height: "70%",
  fg: "white",
  selectedFg: "white",
  selectedBg: "blue",
  border: {
    type: "line",
    fg: "cyan"
  },
  columnWidth: [8, 6, 6, 6, 6, 6, 6]
})

table.focus()

screen.append(table)

// 生成更丰富的学生数据
const generateStudentData = () => {
  const classes = ["一班", "二班", "三班", "四班"]
  const names = [
    "张三",
    "李四",
    "王五",
    "赵六",
    "钱七",
    "孙八",
    "周九",
    "吴十",
    "郑一",
    "王二",
    "刘三",
    "陈四",
    "杨五",
    "黄六",
    "周七"
  ]

  return names.map((name, index) => [
    name,
    classes[index % classes.length],
    Math.floor(Math.random() * 40) + 60, // 60-100分
    Math.floor(Math.random() * 40) + 60,
    Math.floor(Math.random() * 40) + 60
  ])
}

let studentData = generateStudentData()

// 计算总分并排序
const calculateAndSort = (data) => {
  return data
    .map((row) => {
      const scores = row.slice(2).map(Number)
      const total = scores.reduce((sum, score) => sum + score, 0)
      const average = (total / scores.length).toFixed(1)
      return [...row, total, average]
    })
    .sort((a, b) => b[5] - a[5]) // 按总分降序排序
}

let sortedData = calculateAndSort(studentData)

table.setData({
  headers: ["姓名", "班级", "语文", "数学", "英语", "总分", "平均分"],
  data: sortedData.map((row) => [
    row[0], // 姓名
    row[1], // 班级
    row[2], // 语文
    row[3], // 数学
    row[4], // 英语
    row[5], // 总分
    row[6] // 平均分
  ])
})

// 添加选择事件
table.on("select", function (item, index) {
  const selectedRow = sortedData[index]
  if (selectedRow) {
    screen.title = `已选择: ${selectedRow[0]} - 总分: ${selectedRow[5]}`
    screen.render()
  }
})

// 添加统计信息
const stats = blessed.box({
  top: "75%",
  left: "10%",
  width: "80%",
  height: "20%",
  content: `统计信息: 总人数 ${sortedData.length} | 最高分 ${
    sortedData[0]?.[5] || 0
  } | 平均分 ${(
    sortedData.reduce((sum, row) => sum + parseFloat(row[6]), 0) / sortedData.length
  ).toFixed(1)}`,
  style: {
    fg: "yellow",
    bg: "black",
    border: {
      fg: "cyan"
    }
  },
  border: {
    type: "line"
  }
})
screen.append(stats)

// 添加提示信息
const helpText = blessed.text({
  top: "100%-2",
  left: 0,
  width: "100%",
  content: "操作提示: ↑↓ 选择行 | Enter 查看详情 | r 刷新数据 | q/ESC 退出",
  style: {
    fg: "green",
    bg: "black"
  }
})
screen.append(helpText)

// 刷新数据
screen.key("r", function () {
  studentData = generateStudentData()
  sortedData = calculateAndSort(studentData)
  table.setData({
    headers: ["姓名", "班级", "语文", "数学", "英语", "总分", "平均分"],
    data: sortedData.map((row) => [
      row[0],
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
      row[6]
    ])
  })

  stats.setContent(
    `统计信息: 总人数 ${sortedData.length} | 最高分 ${
      sortedData[0]?.[5] || 0
    } | 平均分 ${(
      sortedData.reduce((sum, row) => sum + parseFloat(row[6]), 0) /
      sortedData.length
    ).toFixed(1)}`
  )

  screen.render()
})

// 按键退出
screen.key(["escape", "q", "C-c"], function () {
  screen.destroy()
  process.exit(0)
})

screen.render()
```

### 动态条形图 (bar.js)

本示例展示了如何使用 `bar` 组件来可视化分类数据，并通过定时器模拟数据的动态变化，适用于展示销售统计、任务分布等场景

示例代码：


```javascript
import blessed from "blessed"
import contrib from "blessed-contrib"

// 创建屏幕
const screen = blessed.screen({
  fullUnicode: true,
  smartCSR: true,
  title: "销售数据统计"
})

// 创建条形图
const bar = contrib.bar({
  label: "月度销售额 (万元)",
  barWidth: 6,
  barSpacing: 8,
  maxHeight: 20,
  xLabelPadding: 3,
  xPadding: 5,
  wholeNumbersOnly: false
})

screen.append(bar)

// 生成初始数据
const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
let salesData = months.map(() => Math.floor(Math.random() * 50) + 20)

// 设置初始数据
bar.setData({
  titles: months,
  data: salesData
})

// 添加统计信息
const stats = blessed.box({
  top: "75%",
  left: "10%",
  width: "80%",
  height: "20%",
  content: "",
  style: {
    fg: "yellow",
    bg: "black",
    border: {
      fg: "cyan"
    }
  },
  border: {
    type: "line"
  }
})

const updateStats = () => {
  const total = salesData.reduce((sum, val) => sum + val, 0)
  const average = (total / salesData.length).toFixed(2)
  const max = Math.max(...salesData)
  const min = Math.min(...salesData)
  const maxMonth = months[salesData.indexOf(max)]
  const minMonth = months[salesData.indexOf(min)]

  stats.setContent(
    `统计信息: 总销售额 ${total} 万元 | 平均 ${average} 万元 | 最高 ${max} 万元 (${maxMonth}) | 最低 ${min} 万元 (${minMonth})`
  )
}

updateStats()
screen.append(stats)

// 添加提示信息
const helpText = blessed.text({
  top: "100%-2",
  left: 0,
  width: "100%",
  content: "操作提示: r 刷新数据 | q/ESC 退出",
  style: {
    fg: "green",
    bg: "black"
  }
})
screen.append(helpText)

// 动态更新数据
let updateCount = 0
const updateInterval = setInterval(() => {
  updateCount++
  if (updateCount > 30) {
    clearInterval(updateInterval)
    return
  }

  // 模拟数据变化（添加小幅波动）
  salesData = salesData.map(value => {
    const change = (Math.random() - 0.5) * 5 // -2.5 到 2.5 的随机变化
    return Math.max(10, Math.min(80, value + change))
  })

  bar.setData({
    titles: months,
    data: salesData.map(v => Math.round(v * 10) / 10)
  })

  updateStats()
  screen.render()
}, 800)

// 刷新数据
screen.key("r", function () {
  salesData = months.map(() => Math.floor(Math.random() * 50) + 20)
  bar.setData({
    titles: months,
    data: salesData
  })
  updateStats()
  screen.render()
})

// 按键退出
screen.key(["escape", "q", "C-c"], function () {
  clearInterval(updateInterval)
  screen.destroy()
  process.exit(0)
})

screen.render()

```

### 多任务甜甜圈图 (donut.js)

本示例聚焦于 `donut` 组件，展示了如何用它来同时监控多个任务的进度。每个任务都由甜甜圈图的一个彩色分片表示

核心功能：

- **多任务数据结构**：使用一个数组来管理多个任务的进度和样式
- **进度模拟**：通过 `setInterval` 动态更新每个任务的完成百分比
- **循环重置**：当所有任务都完成时，自动重置进度，实现循环监控

示例代码：


```javascript
import blessed from "blessed"
import contrib from "blessed-contrib"

// 创建屏幕
const screen = blessed.screen({
  fullUnicode: true,
  smartCSR: true,
  title: "多任务进度监控"
})

// 创建甜甜圈图
const donut = contrib.donut({
  label: "任务完成进度",
  radius: 20,
  arcWidth: 10,
  remainColor: "black",
  data: [
    { percent: 0, label: "下载任务", color: "green" },
    { percent: 0, label: "上传任务", color: "red" },
    { percent: 0, label: "处理任务", color: [242, 178, 25] },
    { percent: 0, label: "备份任务", color: "cyan" }
  ]
})

screen.append(donut)

// 模拟多个任务的进度更新
const tasks = [
  { name: "下载任务", color: "green", speed: 0.03, current: 0 },
  { name: "上传任务", color: "red", speed: 0.02, current: 0 },
  { name: "处理任务", color: [242, 178, 25], speed: 0.04, current: 0 },
  { name: "备份任务", color: "cyan", speed: 0.025, current: 0 }
]

const updateInterval = setInterval(() => {
  let allCompleted = true

  tasks.forEach(task => {
    if (task.current < 1) {
      task.current = Math.min(1, task.current + task.speed)
      allCompleted = false
    } else if (task.current >= 1) {
      // 完成后重置
      task.current = 0
    }
  })

  donut.update(
    tasks.map(task => ({
      percent: parseFloat(task.current.toFixed(2)),
      label: `${task.name} ${Math.round(task.current * 100)}%`,
      color: task.color
    }))
  )

  screen.render()

  // 如果所有任务都完成，可以停止或重置
  if (allCompleted && tasks.every(t => t.current === 0)) {
    // 继续循环
  }
}, 100)

// 按键退出
screen.key(["escape", "q", "C-c"], function () {
  clearInterval(updateInterval)
  screen.destroy()
  process.exit(0)
})

screen.render()
```

## 高级主题

### 自定义组件开发指南

虽然 `blessed-contrib` 提供丰富的组件，但可能需要创建自定义组件。可以通过继承 `blessed` 的 `Box` 或其他基础组件来创建自己的组件

**基本步骤：**

1.  **创建一个新的类**，继承自 `blessed.widget.Box` 或其他 `blessed` 组件。
2.  **在构造函数中**，调用父类的构造函数，并设置组件的默认选项。
3.  **实现一个 `setData` 方法**（如果需要），用于接收和处理数据。
4.  **实现一个 `render` 方法**（如果需要），用于绘制组件的内容。

### 性能优化建议

- **减少渲染次数**：只有在数据发生变化时才调用 `screen.render()`。
- **批量更新**：如果需要同时更新多个组件，可以在所有 `setData` 调用之后再调用一次 `screen.render()`。
- **使用渲染优化选项**：对于复杂的界面，可以在创建 `screen` 时开启 `fastCSR`、`useBCE`（back_color_erase 优化）等选项，这可以减少不必要的重绘。

### 常见问题解决方案

**组件显示不正确**：

- 确保你的终端支持 256 色和 Unicode
- 检查组件的布局参数（`row`, `col`, `rowSpan`, `colSpan`）是否正确

**程序崩溃**：

- 检查传递给 `setData` 的数据格式是否正确
- 确保所有依赖项都已正确安装

## 参考资料

- **官方 GitHub 仓库**: [https://github.com/yaronn/blessed-contrib](https://github.com/yaronn/blessed-contrib)
- **blessed (底层库)**: [https://github.com/chjj/blessed](https://github.com/chjj/blessed)
- **相关工具**:
  - `chalk`: 用于在终端中添加颜色
  - `inquirer`: 用于创建交互式命令行提示
