---
title: navigator 对象
description: "navigator 对象是 BOM（浏览器对象模型）的核心组成部分，用于获取浏览器和运行环境的信息。它实现了多个标准接口，提供了丰富的属性和方法，是前端开发中进行浏览器检测、功能检测和设备检测的重要工具。"
keywords: [navigator, 对象]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---


# navigator 对象

`navigator` 对象是 BOM（浏览器对象模型）的核心组成部分，用于获取浏览器和运行环境的信息。它实现了多个标准接口，提供了丰富的属性和方法，是前端开发中进行**浏览器检测**、**功能检测**和**设备检测**的重要工具。

## 概述

### 核心能力

- **设备信息获取**：获取操作系统、设备类型、硬件配置等信息
- **浏览器特征识别**：获取浏览器名称、版本、用户代理等信息
- **网络状态监测**：检测在线状态、网络类型、连接质量
- **权限管理**：查询和请求各种设备权限
- **媒体设备访问**：访问摄像头、麦克风等媒体设备
- **地理位置定位**：获取设备的位置信息

### 标准接口

`navigator` 对象实现了以下标准接口定义的属性和方法：

| 接口名称                       | 主要功能                     |
| ------------------------------ | ---------------------------- |
| `NavigatorID`                  | 浏览器标识信息               |
| `NavigatorLanguage`            | 语言偏好设置                 |
| `NavigatorOnLine`              | 网络在线状态                 |
| `NavigatorContentUtils`        | 内容处理工具                 |
| `NavigatorStorage`             | 存储功能                     |
| `NavigatorConcurrentHardware`  | 硬件并发信息                 |
| `NavigatorPlugins`             | 插件信息                     |
| `NavigatorUserMedia`           | 媒体设备访问                 |
| `NavigatorGeolocation`         | 地理位置定位                 |
| `NavigatorClipboard`           | 剪贴板操作                   |
| `NavigatorCredentials`         | 凭证管理                     |

## 常见属性

### 属性分类总览

| 属性名称                        | 描述                                                                      | 类型      | 分类         |
| ------------------------------- | ------------------------------------------------------------------------- | --------- | ------------ |
| `navigator.userAgent`           | 返回浏览器的用户代理字符串，用于识别浏览器类型、版本和平台等信息          | `string`  | 浏览器信息   |
| `navigator.platform`            | 返回浏览器运行的操作系统平台（已废弃）                                    | `string`  | 浏览器信息   |
| `navigator.language`            | 返回浏览器的首选语言，通常是用户的系统语言                                | `string`  | 语言设置     |
| `navigator.languages`           | 返回一个数组，包含浏览器支持的语言列表，按优先级排序                      | `array`   | 语言设置     |
| `navigator.cookieEnabled`       | 返回一个布尔值，表示浏览器是否支持并启用了 Cookie                         | `boolean` | 功能检测     |
| `navigator.onLine`              | 返回一个布尔值，表示浏览器是否处于在线状态                                | `boolean` | 网络状态     |
| `navigator.connection`          | 返回一个 `NetworkInformation` 对象，提供有关设备网络连接的信息            | `object`  | 网络状态     |
| `navigator.geolocation`         | 返回一个 `Geolocation` 对象，用于获取设备的地理位置信息                   | `object`  | 位置服务     |
| `navigator.mediaDevices`        | 返回一个 `MediaDevices` 对象，用于访问媒体输入设备（如摄像头、麦克风）    | `object`  | 媒体设备     |
| `navigator.permissions`         | 返回一个 `Permissions` 对象，用于查询和请求设备权限（如通知、摄像头等）   | `object`  | 权限管理     |
| `navigator.hardwareConcurrency` | 返回浏览器支持的逻辑处理器数量，用于评估设备的多核性能                    | `number`  | 硬件信息     |
| `navigator.maxTouchPoints`      | 返回设备支持的最大触摸点数，用于判断设备是否支持多点触控                  | `number`  | 硬件信息     |
| `navigator.userAgentData`       | 返回一个 `UserAgentData` 对象，提供更详细的浏览器和设备信息（实验性 API） | `object`  | 浏览器信息   |
| `navigator.clipboard`           | 返回一个 `Clipboard` 对象，用于读写剪贴板内容                             | `object`  | 剪贴板       |
| `navigator.credentials`         | 返回一个 `CredentialsContainer` 对象，用于管理用户凭证                    | `object`  | 凭证管理     |
| `navigator.storage`             | 返回一个 `StorageManager` 对象，用于管理存储配额                          | `object`  | 存储管理     |

### 浏览器信息属性

#### userAgent

`userAgent` 属性返回一个字符串，包含了浏览器、操作系统和设备的详细信息。这是最常用的浏览器检测方式，但需要注意其可能被修改。

```javascript
console.log(navigator.userAgent)
// Chrome 示例：
// "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

// Firefox 示例：
// "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0"

// Safari 示例：
// "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15"

// 检测浏览器类型
function detectBrowser() {
  const ua = navigator.userAgent.toLowerCase()

  if (ua.includes("edg")) {
    return { name: "Edge", engine: "Blink" }
  } else if (ua.includes("chrome") && !ua.includes("edg")) {
    return { name: "Chrome", engine: "Blink" }
  } else if (ua.includes("firefox")) {
    return { name: "Firefox", engine: "Gecko" }
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    return { name: "Safari", engine: "WebKit" }
  } else if (ua.includes("opera") || ua.includes("opr")) {
    return { name: "Opera", engine: "Blink" }
  }
  return { name: "Unknown", engine: "Unknown" }
}

console.log(detectBrowser())
```

#### platform（已废弃）

`platform` 属性返回运行浏览器的操作系统平台。

```javascript
console.log(navigator.platform)
// 可能的值：
// "Win32", "Win64", "MacIntel", "Linux x86_64", "iPhone", "iPad", "Android"

// 检测操作系统（兼容方案）
function detectOS() {
  // 优先使用 userAgentData
  if (navigator.userAgentData?.platform) {
    return navigator.userAgentData.platform
  }

  // 回退到 platform（已废弃）
  const platform = navigator.platform?.toLowerCase() || ""

  if (platform.includes("win")) return "Windows"
  if (platform.includes("mac")) return "macOS"
  if (platform.includes("linux")) return "Linux"
  if (platform.includes("iphone") || platform.includes("ipad")) return "iOS"
  if (platform.includes("android")) return "Android"

  return "Unknown"
}

console.log(detectOS())
```

#### userAgentData（实验性）

`userAgentData` 是 User-Agent Client Hints API 的一部分，提供更结构化的浏览器和设备信息。相比传统的 `userAgent`，它提供了更可控、更隐私友好的信息获取方式。

```javascript
if ("userAgentData" in navigator) {
  const uaData = navigator.userAgentData

  // 低熵值（无需用户权限）
  console.log("品牌列表:", uaData.brands)
  // [{ brand: "Google Chrome", version: "120" }, { brand: "Chromium", version: "120" }, ...]
  console.log("移动设备:", uaData.mobile) // true/false
  console.log("平台:", uaData.platform) // "Windows", "macOS", "Linux", "Android", etc.

  // 获取高熵值（需要用户授权）
  uaData
    .getHighEntropyValues(["architecture", "model", "platformVersion", "fullVersionList"])
    .then((values) => {
      console.log("架构:", values.architecture) // "x86", "arm"
      console.log("型号:", values.model) // 设备型号
      console.log("平台版本:", values.platformVersion) // "10.15.7"
      console.log("完整版本列表:", values.fullVersionList)
    })
    .catch((error) => {
      console.error("获取高熵值失败:", error)
    })
} else {
  console.log("User-Agent Client Hints API 不支持，回退到传统方案")
}
```

**高熵值可用字段：**

| 字段名              | 描述                       |
| ------------------- | -------------------------- |
| `architecture`      | CPU 架构（如 "x86"、"arm"）|
| `model`             | 设备型号                   |
| `platformVersion`   | 操作系统版本               |
| `fullVersionList`   | 完整的浏览器品牌和版本列表 |
| `wow64`             | 是否在 64 位系统上运行 32 位浏览器 |

### 语言设置属性

#### language 和 languages

`language` 返回浏览器的首选语言，`languages` 返回一个按优先级排序的语言数组。

```javascript
console.log(navigator.language) // "zh-CN"
console.log(navigator.languages) // ["zh-CN", "zh", "en-US", "en"]

// 获取用户语言偏好（完整方案）
function getUserLanguage() {
  // 优先使用 languages 数组的第一个值
  const preferredLang = navigator.languages?.[0] || navigator.language || "en"

  // 提取语言代码（去掉地区代码）
  const langCode = preferredLang.split("-")[0]

  return {
    full: preferredLang, // 完整语言标签，如 "zh-CN"
    code: langCode, // 语言代码，如 "zh"
    region: preferredLang.split("-")[1] || null, // 地区代码，如 "CN"
    all: navigator.languages || [navigator.language] // 所有偏好语言
  }
}

console.log(getUserLanguage())

// 监听语言偏好变化
if ("languages" in navigator) {
  // 注：languages 属性变化没有标准事件，需要在页面切换时重新获取
  window.addEventListener("focus", () => {
    const currentLang = getUserLanguage()
    console.log("当前语言偏好:", currentLang)
  })
}
```

### 网络状态属性

#### onLine

`onLine` 属性返回一个布尔值，表示浏览器是否在线。

```javascript
console.log(navigator.onLine) // true 或 false

// 监听网络状态变化
window.addEventListener("online", () => {
  console.log("网络已连接")
  // 重新同步数据
  syncData()
})

window.addEventListener("offline", () => {
  console.log("网络已断开")
  // 启用离线模式
  enableOfflineMode()
})

// 主动探测网络是否真正可用（onLine 属性可能不准确）
async function checkConnectivity(timeout = 5000) {
  if (!navigator.onLine) {
    return { connected: false, reason: "offline" }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch("/favicon.ico", {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return { connected: response.ok, reason: response.ok ? "connected" : "server_error" }
  } catch (error) {
    return { connected: false, reason: error.name === "AbortError" ? "timeout" : "network_error" }
  }
}
```

#### connection

`connection` 属性（NetworkInformation API）提供网络连接的详细信息，包括连接类型、带宽等。

```javascript
if ("connection" in navigator) {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

  console.log("连接类型:", connection.effectiveType) // "4g", "3g", "2g", "slow-2g"
  console.log("下行速度:", connection.downlink, "Mbps") // 预估下行速度
  console.log("往返时间:", connection.rtt, "ms") // 预估往返时间
  console.log("是否节省数据:", connection.saveData) // 用户是否启用了省流模式

  // 监听连接变化
  connection.addEventListener("change", () => {
    console.log("网络连接已改变")
    console.log("新连接类型:", connection.effectiveType)
    adaptToNetworkConditions()
  })
} else {
  console.log("NetworkInformation API 不支持")
}
```

**NetworkInformation 对象属性：**

| 属性名         | 类型      | 描述                                           |
| -------------- | --------- | ---------------------------------------------- |
| `effectiveType` | `string`  | 有效网络类型：`"4g"`、`"3g"`、`"2g"`、`"slow-2g"` |
| `downlink`     | `number`  | 预估下行带宽（Mbps）                           |
| `rtt`          | `number`  | 预估往返时间（ms）                             |
| `saveData`     | `boolean` | 是否启用了省流/数据保护模式                    |
| `type`         | `string`  | 连接类型（如 `"wifi"`、`"cellular"`，部分浏览器支持）|

### 硬件信息属性

#### hardwareConcurrency

`hardwareConcurrency` 返回逻辑处理器的数量，可用于优化 Web Worker 的并行处理能力。

```javascript
const cores = navigator.hardwareConcurrency || 4 // 提供默认值作为回退
console.log("CPU 核心数:", cores)

// 根据核心数优化 Web Worker 数量
function createOptimizedWorkers(workerScript) {
  const maxWorkers = 8 // 避免创建过多 Worker
  const workerCount = Math.min(cores - 1, maxWorkers) // 保留一个核心给主线程

  const workers = []
  for (let i = 0; i < workerCount; i++) {
    workers.push(new Worker(workerScript))
  }

  // 并行执行任务：任务按 worker 数量轮流分发
  async function runTasks(tasks) {
    const results = await Promise.all(
      tasks.map((task, i) => {
        const worker = workers[i % workers.length]
        return new Promise((resolve) => {
          worker.onmessage = (e) => resolve(e.data)
          worker.postMessage(task)
        })
      })
    )

    // 清理 Workers
    workers.forEach((worker) => worker.terminate())

    return results.flat()
  }

  return { workers, runTasks }
}
```

#### maxTouchPoints

`maxTouchPoints` 返回设备支持的最大触摸点数，用于判断是否支持多点触控。

```javascript
const maxTouch = navigator.maxTouchPoints || 0
console.log("最大触摸点数:", maxTouch)

// 设备类型检测
function detectInputType() {
  const hasTouch = maxTouch > 0
  const hasMouse = window.matchMedia("(pointer: fine)").matches

  return {
    touch: hasTouch,
    mouse: hasMouse,
    primary: hasTouch && !hasMouse ? "touch" : "mouse",
    multiTouch: maxTouch > 1
  }
}

console.log(detectInputType())

// 根据输入类型优化交互
if (detectInputType().touch) {
  // 启用触摸手势
  enableTouchGestures()
} else {
  // 使用鼠标事件
  enableMouseEvents()
}
```

### 媒体设备属性

#### mediaDevices

`mediaDevices` 属性返回一个 `MediaDevices` 对象，用于访问媒体输入设备和进行媒体流管理。

```javascript
if ("mediaDevices" in navigator) {
  // 枚举所有媒体设备
  async function listDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      devices.forEach((device) => {
        console.log(`${device.kind}: ${device.label} (${device.deviceId})`)
      })
      return devices
    } catch (error) {
      console.error("枚举设备失败:", error)
      return []
    }
  }

  listDevices()

  // 监听设备变化（如插入/拔出摄像头）
  navigator.mediaDevices.addEventListener("devicechange", async () => {
    console.log("媒体设备列表已变化")
    const devices = await navigator.mediaDevices.enumerateDevices()
    // 更新设备选择器
    updateDeviceSelector(devices)
  })
} else {
  console.log("MediaDevices API 不支持")
}
```

**MediaDevices 常用方法：**

| 方法名                          | 描述                               | 返回值                      |
| ------------------------------- | ---------------------------------- | --------------------------- |
| `getUserMedia(constraints)`     | 请求访问摄像头/麦克风               | `Promise<MediaStream>`      |
| `getDisplayMedia(constraints)`  | 请求屏幕共享                        | `Promise<MediaStream>`      |
| `enumerateDevices()`            | 枚举所有媒体设备                    | `Promise<MediaDeviceInfo[]>`|
| `getSupportedConstraints()`     | 获取支持的约束条件                  | `MediaTrackSupportedConstraints` |

#### geolocation

`geolocation` 属性返回一个 `Geolocation` 对象，用于获取设备的地理位置信息。

```javascript
if ("geolocation" in navigator) {
  // 获取当前位置
  function getCurrentLocation() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed
          })
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }

  getCurrentLocation()
    .then((location) => console.log("当前位置:", location))
    .catch((error) => console.error("定位失败:", error))
} else {
  console.log("Geolocation API 不支持")
}
```

### 权限管理属性

#### permissions

`permissions` 属性返回一个 `Permissions` 对象，用于查询和监控设备权限状态。

```javascript
if ("permissions" in navigator) {
  // 查询权限状态
  async function checkPermission(permissionName) {
    try {
      const result = await navigator.permissions.query({ name: permissionName })
      console.log(`${permissionName} 权限状态:`, result.state)
      // 状态值: "granted"（已授权）, "denied"（已拒绝）, "prompt"（待询问）

      // 监听权限变化
      result.addEventListener("change", () => {
        console.log(`${permissionName} 权限状态已改变:`, result.state)
      })

      return result.state
    } catch (error) {
      return "unsupported"
    }
  }

  // 批量检查多个权限
  async function checkAllPermissions() {
    const names = ["geolocation", "notifications", "camera", "microphone", "clipboard-read"]
    const results = {}
    for (const name of names) {
      results[name] = await checkPermission(name)
    }
    return results
  }

  checkAllPermissions().then(console.log)
} else {
  console.log("Permissions API 不支持")
}
```

**可查询的权限类型：**

| 权限名称            | 描述               |
| ------------------- | ------------------ |
| `geolocation`       | 地理位置           |
| `notifications`     | 通知               |
| `camera`            | 摄像头             |
| `microphone`        | 麦克风             |
| `clipboard-read`    | 剪贴板读取         |
| `clipboard-write`   | 剪贴板写入         |
| `midi`              | MIDI 设备访问      |
| `persistent-storage`| 持久化存储         |

### 剪贴板属性

#### clipboard

`clipboard` 属性返回一个 `Clipboard` 对象，用于异步读写剪贴板内容。

```javascript
if ("clipboard" in navigator) {
  // 写入文本到剪贴板
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text)
      console.log("文本已复制到剪贴板")
      return true
    } catch (error) {
      console.error("复制失败:", error)
      return false
    }
  }

  // 回退方案：execCommand（已废弃，仅在不支持 Clipboard API 的旧环境中使用）
  function copyTextFallback(text) {
    const textarea = document.createElement("textarea")
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand("copy")
    document.body.removeChild(textarea)
  }
}
```

### 凭证管理属性

#### credentials

`credentials` 属性返回一个 `CredentialsContainer` 对象，用于管理用户凭证（如密码、FIDO2 密钥等）。

```javascript
if ("credentials" in navigator) {
  // 创建密码凭证
  async function savePasswordCredential(username, password) {
    try {
      const credential = new PasswordCredential({
        id: username,
        password: password
      })
      await navigator.credentials.store(credential)
      console.log("凭证已保存")
    } catch (error) {
      console.error("保存凭证失败:", error)
    }
  }

  // 阻止自动登录（例如用户退出登录后调用）
  async function preventAutoSignIn() {
    await navigator.credentials.preventSilentAccess()
    console.log("已阻止自动登录")
  }
} else {
  console.log("Credentials API 不支持")
}
```

## 常见方法

### 方法总览

| 方法名称                                                                    | 描述                                                                                             | 返回值类型                      | 安全要求   |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------- | ---------- |
| `navigator.javaEnabled()`                                                   | 检查浏览器是否启用 Java 支持（已废弃）                                                           | `boolean`                       | 无         |
| `navigator.getBattery()`                                                    | 获取设备的电池信息                                                                               | `Promise<BatteryManager>`       | HTTPS      |
| `navigator.vibrate(pattern)`                                                | 触发设备的振动功能                                                                               | `boolean`                       | 无         |
| `navigator.share(data)`                                                     | 调用 Web Share API 分享内容                                                                      | `Promise<void>`                 | HTTPS      |
| `navigator.sendBeacon(url, data)`                                           | 异步发送数据（适合页面卸载时）                                                                   | `boolean`                       | 无         |
| `navigator.registerProtocolHandler(scheme, url, title)`                     | 注册自定义协议处理器                                                                             | `void`                          | HTTPS      |
| `navigator.requestMediaKeySystemAccess(keySystem, configs)`                 | 请求媒体密钥系统访问（DRM）                                                                      | `Promise<MediaKeySystemAccess>` | HTTPS      |

### getBattery()

获取设备的电池信息，用于优化能耗敏感型应用。

```javascript
if ("getBattery" in navigator) {
  navigator.getBattery().then((battery) => {
    console.log("电池电量:", Math.round(battery.level * 100) + "%")
    console.log("是否充电:", battery.charging)
    console.log("充满时间:", battery.chargingTime === Infinity ? "未知" : battery.chargingTime + "秒")
    console.log("放电时间:", battery.dischargingTime === Infinity ? "未知" : battery.dischargingTime + "秒")

    // 监听电池状态变化
    battery.addEventListener("chargingchange", () => {
      console.log("充电状态改变:", battery.charging)
      if (battery.charging) {
        // 充电中，可以执行耗能操作
        enableHighPowerMode()
      } else {
        // 使用电池供电，降低能耗
        enablePowerSavingMode()
      }
    })

    battery.addEventListener("levelchange", () => {
      if (battery.level < 0.2 && !battery.charging) {
        console.log("电量不足，建议保存当前工作")
      }
    })
  }).catch((error) => {
    console.error("获取电池信息失败:", error)
  })
} else {
  console.log("Battery API 不支持")
}
```

### vibrate()

触发设备的振动功能，常用于触觉反馈。

```javascript
if ("vibrate" in navigator) {
  // 单次振动（200毫秒）
  navigator.vibrate(200)

  // 振动模式：振动 200ms，暂停 100ms，再振动 200ms
  navigator.vibrate([200, 100, 200])

  // 复杂模式：短-短-长（类似 SOS）
  navigator.vibrate([100, 50, 100, 50, 300])

  // 停止振动
  navigator.vibrate(0)

  // 封装触觉反馈工具
  const HapticFeedback = {
    light: () => navigator.vibrate(10),
    medium: () => navigator.vibrate(20),
    heavy: () => navigator.vibrate(30),
    success: () => navigator.vibrate([30, 40, 30]),
    error: () => navigator.vibrate([50, 50, 50, 50, 50])
  }

  document.querySelector(".button").addEventListener("click", () => {
    HapticFeedback.light()
  })
} else {
  console.log("Vibration API 不支持")
}
```

### share()

调用 Web Share API，使用系统原生分享界面。

```javascript
if ("share" in navigator) {
  async function shareContent(options = {}) {
    const shareData = {
      title: options.title || document.title,
      text: options.text || "",
      url: options.url || window.location.href,
      files: options.files // 可选，分享文件（部分浏览器支持）
    }

    // 检查是否可以分享
    if (navigator.canShare && !navigator.canShare(shareData)) {
      console.log("不支持分享此内容")
      return false
    }

    try {
      await navigator.share(shareData)
      console.log("分享成功")
      return true
    } catch (error) {
      // 用户取消分享会抛出 AbortError，无需提示错误
      if (error.name !== "AbortError") {
        console.error("分享失败:", error)
      }
      return false
    }
  }

  document.querySelector("#shareBtn").addEventListener("click", () => {
    shareContent({ title: "看看这篇文章", url: location.href })
  })
} else {
  console.log("Web Share API 不支持，使用备用方案")
  // 显示自定义分享界面
  showCustomShareDialog()
}
```

### sendBeacon()

异步发送数据，特别适合在页面卸载时发送分析数据、错误日志等。与 `fetch` 不同，`sendBeacon` 保证请求会被发送，即使页面已经关闭。

```javascript
// 发送分析数据
function sendAnalytics(data) {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" })
  const success = navigator.sendBeacon("/api/analytics", blob)

  if (!success) {
    // 回退方案：使用 fetch
    fetch("/api/analytics", {
      method: "POST",
      body: blob,
      keepalive: true // 类似 sendBeacon 的行为
    })
  }
  return success
}

// 封装一个批量上报的分析追踪器
class AnalyticsTracker {
  constructor(url) {
    this.url = url
    this.events = []
  }

  track(event) {
    this.events.push({ event, time: Date.now() })
  }

  // 页面隐藏/卸载前批量上报
  flush() {
    if (this.events.length === 0) return
    const blob = new Blob([JSON.stringify(this.events)], { type: "application/json" })
    navigator.sendBeacon(this.url, blob)
    this.events = []
  }
}

const tracker = new AnalyticsTracker("/api/analytics")
window.addEventListener("pagehide", () => tracker.flush())
```

### registerProtocolHandler()

注册自定义协议处理器，允许网站处理特定的 URL 方案（如 `mailto:`、`web+myapp:`）。

```javascript
if ("registerProtocolHandler" in navigator) {
  // 注册自定义协议处理器
  try {
    navigator.registerProtocolHandler(
      "web+myapp", // 协议名称（必须以 web+ 开头，或使用标准协议如 mailto）
      "https://myapp.com/handler?uri=%s", // 处理 URL，%s 会被替换为实际 URL
      "My App Handler" // 用户友好的名称
    )
    console.log("协议处理器注册成功")
  } catch (error) {
    console.error("注册失败:", error)
    // 常见错误：
    // - 协议名称没有以 web+ 开头（或不是 mailto 等标准协议）
    // - 处理 URL 与当前页面不同源
    // - 缺少 HTTPS 环境
  }

  // 注册处理标准协议的处理器
  navigator.registerProtocolHandler(
    "mailto",
    "https://example.com/process?data=%s",
    "Custom Handler"
  )
} else {
  console.log("Protocol Handler API 不支持")
}
```

## 实际应用场景

### 1. 设备能力检测

根据设备能力调整应用行为，实现自适应体验。

```javascript
class DeviceCapabilityDetector {
  static detect() {
    return {
      // 设备类型
      isMobile: this.isMobileDevice(),
      isTablet: this.isTabletDevice(),
      isDesktop: !this.isMobileDevice() && !this.isTabletDevice(),

      // 输入能力
      hasTouch: navigator.maxTouchPoints > 0,
      hasMouse: window.matchMedia("(pointer: fine)").matches,
      maxTouchPoints: navigator.maxTouchPoints || 0,

      // 硬件信息
      cpuCores: navigator.hardwareConcurrency || 4,
      memoryGB: navigator.deviceMemory || 4,

      // 网络
      effectiveType: navigator.connection?.effectiveType || "unknown",
      saveData: navigator.connection?.saveData || false
    }
  }

  static isMobileDevice() {
    return /Android|iPhone/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && window.matchMedia("(pointer: coarse)").matches)
  }

  static isTabletDevice() {
    return /iPad/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && window.matchMedia("(min-width: 600px) and (pointer: coarse)").matches)
  }

  // 性能分级：low / medium / high
  static getPerformanceProfile() {
    const { cpuCores, memoryGB, effectiveType } = this.detect()
    if (cpuCores <= 2 || memoryGB <= 2 || effectiveType === "2g" || effectiveType === "slow-2g") {
      return "low"
    }
    if (cpuCores >= 8 && memoryGB >= 8) {
      return "high"
    }
    return "medium"
  }
}

// 根据性能等级调整应用配置
const profile = DeviceCapabilityDetector.getPerformanceProfile()
if (profile === "low") {
  // 禁用动画、降低图片质量等
  document.body.classList.add("low-performance")
}
```

### 2. 网络状态监控

实现智能的网络状态管理，优化离线体验。

```javascript
class NetworkManager {
  constructor() {
    this.connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    this.listeners = new Set()
    this.state = {
      online: navigator.onLine,
      effectiveType: this.connection?.effectiveType || "unknown",
      downlink: this.connection?.downlink || 0
    }

    this.init()
  }

  init() {
    window.addEventListener("online", () => {
      this.state.online = true
      this.notifyListeners("online")
    })

    window.addEventListener("offline", () => {
      this.state.online = false
      this.notifyListeners("offline")
    })

    if (this.connection) {
      this.connection.addEventListener("change", () => {
        this.state.effectiveType = this.connection.effectiveType
        this.state.downlink = this.connection.downlink
        this.notifyListeners("change")
      })
    }
  }

  // 订阅网络状态变化，返回取消订阅函数
  onChange(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  notifyListeners(event) {
    this.listeners.forEach((callback) => callback({ event, ...this.state }))
  }

  // 通过实际请求验证网络连通性（onLine 可能不准确）
  async checkConnectivity() {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const response = await fetch("/favicon.ico", {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }
}

const networkManager = new NetworkManager()
networkManager.onChange(({ event, online }) => {
  console.log(`网络事件: ${event}, 在线: ${online}`)
})

// 检查连接性
networkManager.checkConnectivity().then((isConnected) => {
  console.log("实际连接状态:", isConnected)
})
```

### 3. 国际化支持

根据用户语言偏好自动配置应用语言。

```javascript
class I18nManager {
  constructor(supportedLocales = ["en", "zh-CN", "ja", "ko"]) {
    this.supportedLocales = supportedLocales
    this.currentLocale = null
    this.translations = new Map()
  }

  // 获取最佳匹配语言
  getPreferredLocale() {
    const userLanguages = navigator.languages || [navigator.language]

    for (const lang of userLanguages) {
      // 精确匹配（如 zh-CN）
      if (this.supportedLocales.includes(lang)) {
        return lang
      }
      // 语言主码匹配（如 zh-CN 匹配 zh）
      const primary = lang.split("-")[0]
      const match = this.supportedLocales.find((locale) => locale.startsWith(primary))
      if (match) {
        return match
      }
    }

    return this.supportedLocales[0] // 回退到默认语言
  }

  // 加载翻译文件
  async loadTranslations(locale) {
    const translations = await fetch(`/locales/${locale}.json`).then((r) => r.json())
    this.translations.set(locale, translations)
    this.currentLocale = locale
  }
}

const i18n = new I18nManager()
i18n.loadTranslations(i18n.getPreferredLocale())

// 监听语言变化（languagechange 事件不携带详情，需重新读取 navigator）
window.addEventListener("languagechange", () => {
  const locale = i18n.getPreferredLocale()
  console.log("语言已切换:", locale)
  i18n.loadTranslations(locale)
  location.reload() // 或动态更新 UI
})
```

### 4. 性能优化

根据设备性能动态调整应用配置。

```javascript
class PerformanceOptimizer {
  constructor() {
    this.config = this.generateConfig()
    this.setupBatteryOptimizations()
  }

  generateConfig() {
    const cores = navigator.hardwareConcurrency || 4
    const memory = navigator.deviceMemory || 8
    const connection = navigator.connection

    return {
      maxImageWidth: connection?.saveData ? 640 : 1920,
      animationQuality: cores >= 8 ? "high" : "low",
      enableVirtualScroll: memory <= 4,
      prefetchLimit: connection?.effectiveType === "4g" ? 10 : 2
    }
  }

  setupBatteryOptimizations() {
    if (!("getBattery" in navigator)) return
    navigator.getBattery().then((battery) => {
      if (!battery.charging && battery.level < 0.2) {
        this.config.animationQuality = "off"
      }
    })
  }

  applyOptimizations() {
    return this.config
  }
}

// 使用示例
const optimizer = new PerformanceOptimizer()
console.log("性能配置:", optimizer.applyOptimizations())
```

## 浏览器兼容性

### API 兼容性表格

| API/属性               | Chrome | Firefox | Safari | Edge | 说明                     |
| ---------------------- | ------ | ------- | ------ | ---- | ------------------------ |
| `userAgent`            | 全支持 | 全支持  | 全支持 | 全支持 | 基础 API                 |
| `language`             | 全支持 | 全支持  | 全支持 | 全支持 | 基础 API                 |
| `languages`            | 32+    | 32+     | 10.1+  | 全支持 | -                        |
| `hardwareConcurrency`  | 37+    | 48+     | 10.1+  | 全支持 | -                        |
| `maxTouchPoints`       | 22+    | 全支持  | 13+    | 全支持 | -                        |
| `onLine`               | 全支持 | 全支持  | 全支持 | 全支持 | 可能不准确               |
| `connection`           | 61+    | 不支持  | 不支持 | 全支持 | 实验性 API               |
| `geolocation`          | 5+     | 3.5+    | 5+     | 全支持 | 需要 HTTPS               |
| `mediaDevices`         | 47+    | 36+     | 11+    | 全支持 | 需要 HTTPS               |
| `permissions`          | 43+    | 46+     | 16+    | 全支持 | -                        |
| `clipboard`            | 66+    | 63+     | 13.1+  | 全支持 | 需要 HTTPS               |
| `credentials`          | 51+    | 60+     | 13+    | 全支持 | 需要 HTTPS               |
| `userAgentData`        | 90+    | 不支持  | 不支持 | 全支持 | 实验性，仅 Chromium      |
| `getBattery()`         | 38+    | 52+     | 不支持 | 全支持 | 需要 HTTPS，Firefox 需启用 |
| `vibrate()`            | 30+    | 11+     | 不支持 | 全支持 | 仅移动设备               |
| `share()`              | 61+    | 不支持  | 12.1+  | 全支持 | 需要 HTTPS               |
| `sendBeacon()`         | 39+    | 31+     | 11.1+  | 全支持 | -                        |
| `registerProtocolHandler()` | 13+ | 3+      | 不支持 | 全支持 | 需要 HTTPS               |

### 兼容性检测工具

```javascript
// 全面的 API 兼容性检测
function checkAPICompatibility() {
  return {
    // 核心 API
    geolocation: "geolocation" in navigator,
    mediaDevices: "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices,
    permissions: "permissions" in navigator,
    clipboard: "clipboard" in navigator,
    credentials: "credentials" in navigator,

    // 网络 API
    onLine: "onLine" in navigator,
    connection: "connection" in navigator,
    deviceMemory: "deviceMemory" in navigator,
    hardwareConcurrency: "hardwareConcurrency" in navigator,

    // 其他 API
    getBattery: "getBattery" in navigator,
    vibrate: "vibrate" in navigator,
    share: "share" in navigator,
    sendBeacon: "sendBeacon" in navigator,
    userAgentData: "userAgentData" in navigator,
    registerProtocolHandler: "registerProtocolHandler" in navigator
  }
}

console.log("API 兼容性:", checkAPICompatibility())
```

## 安全性考虑

### HTTPS 要求

许多 Navigator API 要求在安全上下文（HTTPS 或 localhost）中使用：

| API                  | HTTPS 要求 |
| -------------------- | ---------- |
| `geolocation`        | 是         |
| `mediaDevices`       | 是         |
| `clipboard`          | 是         |
| `credentials`        | 是         |
| `getBattery()`       | 是         |
| `share()`            | 是         |
| `registerProtocolHandler()` | 是  |

```javascript
// 检查安全上下文
function isSecureContext() {
  return window.isSecureContext || location.protocol === "https:" || location.hostname === "localhost"
}

// 安全使用敏感 API
async function safeGetLocation() {
  if (!isSecureContext()) {
    throw new Error("需要 HTTPS 环境")
  }

  if (!("geolocation" in navigator)) {
    throw new Error("不支持地理位置 API")
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject)
  })
}
```

### 权限管理最佳实践

```javascript
// 权限请求封装
class PermissionManager {
  // 检查权限状态
  async checkPermission(name) {
    if (!("permissions" in navigator)) {
      return "unknown"
    }

    try {
      const result = await navigator.permissions.query({ name })
      return result.state
    } catch {
      return "unknown"
    }
  }

  // 请求地理位置权限
  async requestGeolocation() {
    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      })
      return "granted"
    } catch (error) {
      return error.code === error.PERMISSION_DENIED ? "denied" : "unknown"
    }
  }
}

// 使用示例
const permManager = new PermissionManager()
permManager.requestGeolocation().then((hasPermission) => {
  console.log("地理位置权限:", hasPermission)
})
```

### 隐私保护

```javascript
// 敏感信息脱敏：只暴露粗粒度的设备画像
class SafeDeviceInfo {
  // 不暴露精确的 userAgent
  get browserType() {
    return detectBrowser().name // "Chrome", "Firefox" 等
  }

  get osType() {
    return detectOS() // "Windows", "macOS" 等
  }

  // 不暴露精确的核心数，只返回性能等级
  get performanceLevel() {
    const cores = navigator.hardwareConcurrency || 4
    return cores >= 8 ? "high" : cores >= 4 ? "medium" : "low"
  }

  // 不暴露精确的语言
  get preferredLanguage() {
    return navigator.language.split("-")[0] // 只保留语言代码
  }

  networkType() {
    return navigator.connection?.effectiveType || "unknown"
  }
}

function getSafeDeviceInfo() {
  const info = new SafeDeviceInfo()
  return {
    browserType: info.browserType,
    osType: info.osType,
    performanceLevel: info.performanceLevel,
    preferredLanguage: info.preferredLanguage,
    networkType: info.networkType()
  }
}
```

## 最佳实践

### 1. 优先使用功能检测

```javascript
// ❌ 错误：浏览器检测
if (navigator.userAgent.includes("Chrome")) {
  // 假设 Chrome 支持某功能
  useNewAPI()
}

// ✅ 正确：功能检测
if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(...)
}
```

### 2. 始终提供回退方案

```javascript
// 获取位置的兼容方案
async function getLocation() {
  // 首选：Geolocation API
  if ("geolocation" in navigator) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        reject,
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  // 回退：IP 定位服务
  try {
    const response = await fetch("/api/geolocate")
    return response.json()
  } catch {
    // 最终回退：默认位置
    return { latitude: 0, longitude: 0 }
  }
}
```

### 3. 处理 API 不可用的情况

```javascript
// 安全使用 API
function safeAPIUsage() {
  // 检查 API 存在
  if (!("share" in navigator)) {
    console.log("Web Share API 不支持，使用备用分享方案")
    showFallbackShareDialog()
    return
  }

  // 检查是否可以分享特定内容
  const shareData = { title: "标题", text: "内容", url: "https://..." }
  if (navigator.canShare && !navigator.canShare(shareData)) {
    console.log("当前内容不支持分享")
    return
  }

  // 执行分享
  navigator.share(shareData).catch((error) => {
    if (error.name !== "AbortError") {
      console.error("分享失败:", error)
    }
  })
}
```

### 4. 使用 Promise 封装回调式 API

```javascript
// 封装 Geolocation API
function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation API 不支持"))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options
      }
    )
  })
}

// 使用 async/await
async function showUserLocation() {
  try {
    const coords = await getCurrentPosition()
    console.log(`位置: ${coords.latitude}, ${coords.longitude}`)
  } catch (error) {
    console.error("获取位置失败:", error.message)
  }
}
```

### 5. 清理资源

```javascript
// 清理 Watch 和事件监听
class LocationTracker {
  constructor() {
    this.watchId = null
    this.listeners = []
  }

  start() {
    this.watchId = navigator.geolocation.watchPosition(...)

    // 记录事件监听器以便清理
    const onlineHandler = () => this.handleOnline()
    window.addEventListener("online", onlineHandler)
    this.listeners.push(["online", onlineHandler])
  }

  stop() {
    // 清理 watch
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }

    // 清理事件监听器
    this.listeners.forEach(([event, handler]) => {
      window.removeEventListener(event, handler)
    })
    this.listeners = []
  }
}
```

## 常见错误和注意事项

### 1. 过度依赖 userAgent

```javascript
// ❌ 错误：完全依赖 userAgent
function badBrowserCheck() {
  if (navigator.userAgent.includes("Chrome")) {
    // 假设 Chrome 支持某个功能
    useNewAPI() // 可能在其他 Chrome 版本中失败
  }
}

// ✅ 正确：使用功能检测
function goodFeatureCheck() {
  if ("geolocation" in navigator) {
    // 功能确实存在
    useGeolocation()
  } else {
    // 提供回退方案
    useFallback()
  }
}
```

### 2. 忽略 API 兼容性检查

```javascript
// ❌ 错误：直接使用可能不存在的 API
navigator.getBattery().then((battery) => {
  console.log(battery.level)
}) // 在不支持或非 HTTPS 环境下会报错

// ✅ 正确：先检查 API 是否存在
if ("getBattery" in navigator && window.isSecureContext) {
  navigator.getBattery().then((battery) => {
    console.log(battery.level)
  }).catch((error) => {
    console.error("获取电池信息失败:", error)
  })
} else {
  console.log("Battery API 不支持或需要 HTTPS")
}
```

### 3. 网络状态检测不准确

```javascript
// ❌ 错误：只依赖 onLine 属性
if (navigator.onLine) {
  fetchData() // 可能在实际离线时执行
}

// ✅ 正确：结合事件和实际请求
class NetworkAwareFetcher {
  constructor() {
    this.isActuallyOnline = navigator.onLine
    this.queue = []
    this.setupListeners()
  }

  setupListeners() {
    window.addEventListener("online", () => {
      this.isActuallyOnline = true
      this.flushQueue() // 恢复联网后重发排队的请求
    })
    window.addEventListener("offline", () => {
      this.isActuallyOnline = false
    })
  }

  async fetch(url, options) {
    try {
      const response = await fetch(url, options)
      this.isActuallyOnline = true
      return response
    } catch (error) {
      this.isActuallyOnline = false
      return this.queueRequest(url, options)
    }
  }

  queueRequest(url, options) {
    this.queue.push({ url, options })
    return null
  }

  flushQueue() {
    while (this.queue.length) {
      const { url, options } = this.queue.shift()
      fetch(url, options)
    }
  }
}
```

### 4. 权限请求未处理错误

```javascript
// ❌ 错误：未处理权限请求失败
navigator.geolocation.getCurrentPosition((position) => {
  console.log(position) // 用户拒绝时会无响应
})

// ✅ 正确：处理错误情况
navigator.geolocation.getCurrentPosition(
  (position) => {
    console.log("位置:", position.coords)
  },
  (error) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        console.error("用户拒绝了位置权限")
        showPermissionDeniedMessage()
        break
      case error.POSITION_UNAVAILABLE:
        console.error("位置信息不可用")
        showFallbackLocationInput()
        break
      case error.TIMEOUT:
        console.error("获取位置超时")
        retryWithHigherTimeout()
        break
      default:
        console.error("未知错误:", error.message)
    }
  },
  { timeout: 10000 }
)
```

### 5. 未检查 HTTPS 环境

```javascript
// ❌ 错误：某些 API 需要 HTTPS
navigator.getBattery() // 在 HTTP 下可能失败

// ✅ 正确：检查安全上下文
function isSecureContext() {
  return window.isSecureContext || location.protocol === "https:" || location.hostname === "localhost"
}

if (isSecureContext()) {
  navigator.getBattery().then((battery) => {
    console.log("电池电量:", battery.level)
  })
} else {
  console.log("需要 HTTPS 环境才能使用 Battery API")
}
```

### 6. 忽略浏览器前缀

```javascript
// ❌ 错误：只检查标准属性
if ("connection" in navigator) {
  const conn = navigator.connection // Firefox 不支持
}

// ✅ 正确：检查带前缀的属性
function getConnection() {
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null
}

const connection = getConnection()
if (connection) {
  console.log("网络类型:", connection.effectiveType)
}
```

### 7. 未考虑隐私设置

```javascript
// ❌ 错误：假设权限总是可用
navigator.permissions.query({ name: "geolocation" })
  .then(result => console.log(result.state))
// 可能抛出 TypeError

// ✅ 正确：处理权限查询失败
async function checkPermissionSafely(name) {
  try {
    if (!("permissions" in navigator)) {
      return "unknown"
    }
    const result = await navigator.permissions.query({ name })
    return result.state
  } catch (error) {
    console.warn("权限查询失败:", error)
    return "unknown"
  }
}
```

## 总结

`navigator` 对象是前端开发中不可或缺的工具，它提供了丰富的浏览器和设备信息访问能力。以下是关键要点：

### 核心原则

1. **功能检测优先**：始终使用功能检测而非浏览器检测
2. **提供回退方案**：对于不支持的 API 提供合理的替代方案
3. **安全上下文**：注意 HTTPS 要求，检查安全上下文
4. **权限管理**：正确处理权限请求和用户拒绝的情况
5. **隐私保护**：避免过度收集敏感信息，尊重用户隐私

### 推荐使用场景

| 场景           | 推荐 API                                              |
| -------------- | ----------------------------------------------------- |
| 国际化         | `language`, `languages`                               |
| 网络适配       | `onLine`, `connection`                                |
| 设备适配       | `hardwareConcurrency`, `maxTouchPoints`, `deviceMemory` |
| 位置服务       | `geolocation`                                         |
| 媒体访问       | `mediaDevices`                                        |
| 权限管理       | `permissions`                                         |
| 剪贴板操作     | `clipboard`                                           |
| 分享功能       | `share()`                                             |
| 离线数据发送   | `sendBeacon()`                                        |
| 性能优化       | `getBattery()`, `hardwareConcurrency`                 |

### API 选择指南

- **生产环境**：优先使用稳定、广泛支持的 API
- **实验性 API**：做好兼容性检查和回退方案
- **敏感 API**：确保 HTTPS 环境，正确处理权限
- **性能敏感**：利用 `hardwareConcurrency` 和 `deviceMemory` 进行适配
