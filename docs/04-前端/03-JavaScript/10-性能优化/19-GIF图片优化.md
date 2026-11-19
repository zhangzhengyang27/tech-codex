---
title: GIF 图片优化：转视频方案
description: 通过 GIF 转 MP4/WebM 视频、FFmpeg 转码、自适应视频格式，将 GIF 体积减少 80% 并加快播放
keywords: [GIF优化, FFmpeg, WebM, 视频优化, GIF转视频]
category: JavaScript
tags: [JavaScript, 性能优化, GIF优化, 视频优化]
---

# GIF 图片优化：转视频方案

## 概念说明

GIF 是网络上常见的图片格式,具有**自动播放动态内容**的独特功能,常用于动态表情包或功能演示,在网页中应用广泛。

但 GIF 图片也有显著的痛点,主要体现在:

- 体积巨大
- 加载慢
- 帧数低
- 分辨率不高

因此,对 GIF 图片进行优化的方案应运而生。经过实践检验,投入产出比最高的方案是 GIF 图片转视频优化。

## 核心要点

- 同样的动态内容,MP4 体积约为 GIF 的 27%,WebM 体积约为 GIF 的 12%。
- 体积差异的根源:视频格式有运动估计(Motion Estimation)、预测编码(Predictive Coding)等编码优化技术,可做相邻帧优化,只保存帧间差异像素;GIF 需保存每一帧的全部像素。
- 播放时机差异:视频利用 HTTP 范围请求实现分片加载,第一帧加载后即可播放;GIF 必须完全加载(触发 `onload`)才能播放。
- 命令行场景用 FFmpeg 一行命令即可完成转换;构建场景可封装为 Shell 脚本;用户上传场景可用 Node.js + `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg` 搭建转换服务。
- WebM 体积约为 MP4 的 50%,但 Safari 16(2022 年)才完全支持;使用 `<video>` + `<source>` 声明式降级(WebM 优先、MP4 兜底)可兼得兼容性与体积。
- 上线前应统计用户 UA 验证 WebM 可用率,并预先上报"开始播放耗时"与"体积比例"指标,用于量化优化收益;实测开始播放耗时下降约 55%,产物体积约为原 GIF 的 20%。

## 1. GIF、MP4 和 WebM 格式对比

三种格式的异同如下表:

| **特性 \ 格式**       | GIF                    | MP4                         | Webm                                          |
| ----------------- | ---------------------- | --------------------------- | --------------------------------------------- |
| 动态内容              | 支持                     | 支持                          | 支持                                            |
| 自动播放              | 支持                     | 支持（仅限静音时）                   | 支持（仅限静音时）                                     |
| 包含音频              | **不**支持                | 支持                          | 支持                                            |
| 体积* 体积变化视文件内容有所波动 | 695 KB (100%)          | 191 KB (27%)                | 88 KB（12%）                                    |
| 浏览器兼容性            | 几乎所有浏览器                | 几乎所有浏览器                     | - Chrome 25+ （2013年发布） <br/>- Safari 16+ （2022年发布） |
| 开始播放时机            | 图片完全加载后， `onload`事件触发时 | 第一帧加载后， `onloadeddata`事件触发时 | 第一帧加载后， `onloadeddata`事件触发时                   |

从对比可以看出,同样是展示动态内容,MP4 和 WebM 等视频格式相较于 GIF 格式图片有显著优势。

### 1. 视频格式的体积显著小于 GIF 格式图片

因为视频格式有**运动估计(Motion Estimation)、预测编码(Predictive Coding)** 等专用的编码优化技术,可以实现"相邻帧优化":对于视频中相邻的几帧图像,只需要保存帧与帧之间的**部分**差异像素数据,而 GIF 格式则需要保存每一帧的**所有**像素。

### 2. 视频格式播放开始时间早于 GIF 格式图片

视频格式在浏览器中可以利用 **HTTP 范围请求(HTTP Range 响应头)** 实现"分片加载":一个视频文件,只需要加载一小部分即可开始播放,同时边播放边下载剩余部分。

但 GIF 格式的图片,则必须等待完全加载(触发 `onload` 事件)才能开始播放,通常要远远慢于视频格式。

总之,MP4 和 WebM 等视频格式在体积、播放开始时间等各方面都优于 GIF 格式。如果前端工程有大量 GIF 格式的图片,将 GIF 图片转为 MP4 和 WebM 视频格式,既可以节省用户带宽和 CDN 流量,也能为前端应用带来更好的用户体验。

> 注：[Twitter](http://twitter.com)、[Imgur](https://imgur.com/)、[知乎](https://zhihu.com)等网站都有应用这项 GIF 转视频优化方案，经过了业界的实践检验。

## 2. 用 FFmpeg 实现 GIF 图片转视频

`FFmpeg` 是广泛使用的开源跨平台音视频处理工具,持续维护了 20 余年,是开源界的常青树。众多流行的视频剪辑应用、图片裁剪工具、格式转换工具底层都基于 FFmpeg 实现。

其主要使用方式是通过命令行调用。以下是以命令行形式使用 FFmpeg 将 GIF 图像转换为 MP4 或 WebM 视频格式的步骤。

### 1. 下载并安装 FFmpeg

可从官方网站(https://ffmpeg.org )下载安装程序,也可以使用 `apt-get` 等包管理工具安装:

``` sh
# 示例：Ubuntu 系统使用 apt-get 安装 ffmpeg
sudo apt-get update && sudo apt install ffmpeg

ffmpeg -v
# 输出：ffmpeg version 4.2.7-0ubuntu0.1 Copyright (c) 2000-2022 the FFmpeg developers...
```

### 2. GIF 图像转 MP4 示例

非常简单,只需要 2 项参数:

- 输入文件路径:`input.GIF`
- 输出文件路径:`output.mp4`

``` sh
ffmpeg -i input.GIF output.mp4
```

此外,还可以通过以下参数调整细节:

- `-crf 10`:CRF 即 Constant Rate Factor,用于指定视频质量。值的范围视编码器而定,以 `x264` 编码器为例取值范围是 0 到 51,0 表示无损转换,51 表示最低质量转换。质量参数也直接影响产物体积:值越小,产物质量越高、体积越大。
- `-c:v`:指定使用的视频编解码器,可选值有:
    - `libx264` 即 H.264 编码器,默认 CRF 值为 23。
    - `libx265` 即 H.265/HEVC 编码器,默认 CRF 值为 28。

### 3. GIF 图像转 WebM 示例

``` sh
ffmpeg -i input.GIF output.webm
```

仍然只需要输入文件路径和输出文件路径 2 项参数。

#### 封装 FFmpeg Shell 脚本示例

如果需要转换格式的图片来自前端项目内部,可以将上述命令行封装成 Shell 脚本文件,作为前端项目构建的一个步骤执行。

例如对指定的 `dist/images` 目录下的所有 `.GIF` 格式图片,用 FFmpeg 转换成 WebM 格式,Shell 脚本可以写成:

``` sh
#!/bin/bash

# 指定要转换的目录和文件类型
dir="./materials"
filetype=".GIF"
for file in "$dir"/*"$filetype"; do
echo "Start process for $file"

# 获取文件名和路径
filename=$(basename "$file")
filepath=$(dirname "$file")
output="${filename%.*}.webm"
output_path="$filepath/$output"

# 使用FFmpeg将 GIF 转换成 WebM 文件
ffmpeg -i "$file" "$output_path"
done
```

但如果 GIF 图片来自项目外部且数量较多,例如**用户上传 GIF 图片**这一常见场景,则需要借助后端服务完成 GIF 转视频这一关键步骤。

## 3. GIF 转视频后端服务

对于用户上传 GIF 图片的场景,可以新建一个后端服务,在用户上传 GIF 图片时转换成视频格式文件,供后续使用。

### 1. 新建 Node.js 服务器应用

新建一个 Node.js 服务器应用,用于接收用户上传的 GIF 图片文件。为便于前端工程师理解和开发维护,选择 Node.js && Express 的架构,初始代码很简单:

```js
// index.js
const express = require('express');
const app = express();
const port = 3088;

app.listen(port, () => {
  console.log(`GIF2Video Server listening on http://localhost:${port}`);
});
```

再配置几个 package.json 脚本命令用于本地环境开发调试:

```json
"scripts": {
    "start-debug": "node --inspect ./src/index",
    "start": "node ./src/index"
  },
```

这个 Node.js 服务器的主要功能有两方面:

1. 接收并保存上传的 GIF 图片到服务器本地
1. 调用 FFmpeg 将服务器本地的 GIF 图片转换为视频格式,并消费(例如上传到 CDN)

### 2. 接收并保存上传的 GIF 图片

先用 Express 的路由搭建一个上传文件的 HTML 页面作为测试场地 playground,用于测试上传功能:

```js
app.get('/upload-page', (req, res) => {
  res.sendFile(__dirname + '/upload-page.html');
});
```

响应的 `upload-page.html` 是一个以 `FormData` 形式调用 HTTP 接口上传文件的简单页面:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>文件上传示例</title>
  </head>
  <body>
    <h1>文件上传</h1>
    <input type="file" id="fileInput" name="file" />
    <button onclick="uploadFile()">上传</button>
    <div>
      <br />
      <a target="_blank" href="https://github.com/JuniorTour/fe-optimization-demo"
        >《现代前端工程体验优化》示例</a
      >
    </div>

    <script>
      function uploadFile() {
        var fileInput = document.getElementById('fileInput');
        var file = fileInput.files[0];

        var formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name);
        formData.append('type', file.type);

        fetch('http://localhost:3088/GIF2video', {
          method: 'POST',
          body: formData,
        })
          .then(function (response) {
            if (response.ok) {
              // 请求成功处理逻辑
              return response.text();
            } else {
              // 请求失败处理逻辑
              throw new Error('上传文件失败');
            }
          })
          .then(function (data) {
            console.log(data);
          })
          .catch(function (error) {
            // 错误处理逻辑
            console.error(error);
          });
      }
    </script>
  </body>
</html>
```

其中的上传接口 URL:[http://localhost:3088/GIF2video](http://localhost:3088/GIF2video),就是要新增的另一个后端路由接口:

```js
const multer = require('multer');
const { v4: uuid } = require('uuid');

const upload = multer();

app.post('/GIF2video', upload.single('file'), async (req, res) => {
  console.log(`/GIF2video get formData`);
  const fileId = uuid();

  // https://www.npmjs.com/package/multer#file-information
  // startGIF2Video(fileId, req.file);

  res.send({
    msg: 'FormData数据已接收',
    fileId,
  });
});
```

这个接口使用开源库 [multer](https://www.npmjs.com/package/multer) 的 `upload.single('file')` 中间件,方便地获取随 HTTP 请求上传的文件数据;同时使用 `uuid` 库生成一个唯一 ID,用于关联定位 GIF 图片及其转换后的视频文件。

### 3. 在 Node.js 平台使用 FFmpeg

在 Node.js 平台调用 FFmpeg 有很多方式,以下是一套基于 `fluent-ffmpeg` 和 `@ffmpeg-installer/ffmpeg` 开源库的简单实现方案。

安装 `@ffmpeg-installer/ffmpeg` NPM 包后,会附带下载当前系统对应的 FFmpeg 运行时到 `node_modules` 文件夹中。

> 例如 Windows 平台对应FFmpeg的下载路径是：`node_modules@ffmpeg-installer\win32-x64\ffmpeg.exe`

再调用 `ffmpeg.setFfmpegPath(ffmpegPath.path)`,就可以将 FFmpeg 的运行时上下文同步给 `fluent-ffmpeg` 库,后续在 JS 代码中以链式调用的形式使用 FFmpeg:

```js
const ffmpegPath = require('@ffmpeg-installer/ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath.path);

ffmpeg()
  .input(absPath)
  // 其余常用选项示例：
  // .videoCodec('libx264')
  // .inputFPS(24)
  // .size('320x240')
  .on('stderr', function (stderrLine) {
    console.log('[FFmpeg] ' + stderrLine);
  })
  .on('error', (err) => {
    console.error(err);
    reject(err);
  })
  .on('end', () => {
    console.log(
      `[FFmpeg] Convert end. Time cost: ${Date.now() - startTime} ms`
    );
    resolve();
  })
  .save(path.resolve(outputFilePath, outputFileName));
```

上述代码逻辑就是 `/GIF2video` HTTP 接口的核心逻辑,加以封装后,可以实现输入指定路径的 GIF 文件、输出指定格式的视频文件:

```js
async function runConvertFile(fileId) {
  const GIFData = getGIFFilePath(fileId);
  console.log(`GIFData=${JSON.stringify(GIFData)}`);
  try {
    await convertGIFFileToVideo(GIFData, 'webm');
    await convertGIFFileToVideo(GIFData, 'mp4');
  } catch (error) {
    console.error(`runConvertFile ERROR:`, error);
    return false;
  }
  return true;
}

function afterConvertRenameDir(fileId, convertSuccess) {
  const GIFDirPath = getGIFDir(fileId);
  const newGIFDirPath = GIFDirPath.replace(
    fileId,
    `${
      convertSuccess
        ? CONVERT_STATUS.convertFinish
        : CONVERT_STATUS.convertFailed
    }_${fileId}`
  );
  console.log(`renameGIFDir \nfrom:${GIFDirPath}\nto  :${newGIFDirPath}`);
  fs.renameSync(GIFDirPath, newGIFDirPath);
}

async function startGIF2Video(fileId, file) {
  saveFile(fileId, file);
  const convertSuccess = await runConvertFile(fileId);
  afterConvertRenameDir(fileId, convertSuccess)
  // TODO 上传到 CDN
}
```

最终生成的转换后文件会统一存放在项目根目录下的 `/materials/convertFinish_${fileID}` 文件夹中,可以根据项目架构决定使用方式,常见的方式有:

1. 统一上传到 CDN 上的相同路径,供前端项目方便地转换格式,例如:

```text
https://cdn.com/GIF2video/${fileID}/dynamic.gif
https://cdn.com/GIF2video/${fileID}/dynamic.webm
https://cdn.com/GIF2video/${fileID}/dynamic.mp4
```

1. 提供专用 HTTP 接口,响应包含 GIF 和视频对应 URL 的 JSON 格式数据,供前端获取 GIF 及视频资源 URL

> GIF2Video 项目 GitHub 仓库：[https://github.com/JuniorTour/GIF2video-node-server](https://github.com/JuniorTour/GIF2video-node-server)

GIF 转视频后端服务提供了 `MP4` 和 `Webm` 2 种格式作为候选项。同样的视频内容,Webm 的体积一般只有 MP4 的 50% 左右,比 MP4 格式体积更小。

但 Webm 格式在 Safari 浏览器中兼容性较差,2022 年发布的 Safari 16 才完全支持播放 Webm 视频。由此又遇到了兼容性和节省体积不可兼得的问题——解决方案见下一节。

## 4. 自适应选择最优视频格式

与《图片优化:自适应选择最优格式》中的方案类似,浏览器平台的视频资源也有根据浏览器兼容性自适应加载视频格式的 API:

```html
<video muted autoplay loop playsinline>
  <source src="GIF-demo.webm" type="video/webm">
  <source src="GIF-demo.mp4" type="video/mp4">
</video>
```

这段代码中,首先为 video 元素声明了 4 项属性,用于模仿 GIF 图片的特性:

- `muted`:静音播放,是浏览器允许自动播放的前提条件。
- `autoplay`:加载完成后,自动开始播放。
- `loop`:循环播放。
- `playsinline`:用于控制视频是否在行内播放。移动端 Safari 浏览器上常见视频播放后自动全屏,设置 `playsinline=true` 就会禁用该自动全屏特性。

其次,在 `video` 元素中声明了 2 个 `source` 元素,分别设置 MP4 和 Webm 2 种格式的视频作为 `src` 属性值及 `type` 属性值。

> **注意：**
>
> 与`<picture>`元素**不同**，`<video>`元素中的`source`使用的是`src`属性，而非`<picture>`中的`srcset`。
>
> `type`属性**相同**，都是格式对应的MIME类型

这样浏览器就能像 `<picture>` 元素一样,按**从上到下的顺序**解析,根据浏览器自身的兼容性,决定播放某一个兼容格式的 `source` 元素对应的视频源。

将 Webm 格式**先于** MP4 格式声明,可以实现**优先**播放 Webm 格式视频,减少加载视频文件体积;如果用户的浏览器不支持播放 Webm 格式,就会忽略其对应的 `source` 元素,降级到使用下一个 MP4 格式的视频作为播放源。

由此实现自适应选择最优视频格式:优先加载体积较小的 Webm 格式视频,加快内容播放,节省 CDN 流量开销,兼容性和节省体积一举两得。

## 5. 验证、量化和评估

### 1. 验证

#### 1. 统计用户 UA,验证视频格式兼容性

Webm 格式的视频在浏览器平台的兼容性一般,建议优化上线前,提前统计用户的浏览器版本、系统版本等用户代理信息,用来验证 Webm 格式上线后的使用量。

推荐使用 [ua-parser-js](https://www.npmjs.com/package/ua-parser-js) 开源库获取用户代理信息:Gzip 压缩后仅有 7KB,体积较小,但功能完善,且有千万下载量,维护长达十年,久经考验。

获取用户代理数据示例代码:

```js
import UAParser from 'ua-parser-js';

async function reportCount({ name, labels, help, sampleRate = 1 }) {
  if (Math.random() > sampleRate) {
    return;
  }
  await fetch('http://localhost:4001/counter-metric', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      help,
      labels,
    }),
  });
}

export function reportUAInfo() {
  const parser = new UAParser();
  const ret = parser.getResult();
  // console.log(`getUAInfo ret=${JSON.stringify(ret)}`);
  reportCount({
    name: 'UAInfo',
    help: 'User Agent Info of fe-optimization-demo',
    labels: {
      browser: `${ret.browser.name}_${ret.browser.major}`,
      os: `${ret.os.name}_${ret.os.version}`,
    },
    sampleRate: 0.01,
    // sampleRate: 1,
  });
}
```

上报这些数据到 Grafana 后,就可以创建出多张可视化图表,包括:

- 各浏览器版本访问量(Page View)
- 各系统版本访问量(Page View)
- 各浏览器版本占比
- 各系统版本占比


<details>
    <summary>▶点击展开：《各浏览器版本访问量（Page View）》Grafana 图表配置JSON</summary>

``` json
{
  "type": "timeseries",
  "title": "各浏览器版本访问量（Page View）",
  "gridPos": {
    "x": 0,
    "y": 1,
    "w": 12,
    "h": 8
  },
  "datasource": {
    "uid": "grafanacloud-prom",
    "type": "prometheus"
  },
  "id": 41,
  "targets": [
    {
      "datasource": {
        "type": "prometheus",
        "uid": "grafanacloud-prom"
      },
      "refId": "A",
      "expr": "sum by(browser) (increase(UAInfo[$__rate_interval]))",
      "range": true,
      "instant": false,
      "editorMode": "builder",
      "legendFormat": "__auto",
      "useBackend": false,
      "disableTextWrap": false,
      "fullMetaSearch": false,
      "includeNullMetadata": true,
      "format": "time_series"
    }
  ],
  "options": {
    "tooltip": {
      "mode": "multi",
      "sort": "none"
    },
    "legend": {
      "showLegend": true,
      "displayMode": "table",
      "placement": "right",
      "calcs": [
        "min",
        "max",
        "sum"
      ]
    }
  },
  "fieldConfig": {
    "defaults": {
      "custom": {
        "drawStyle": "line",
        "lineInterpolation": "linear",
        "barAlignment": 0,
        "lineWidth": 1,
        "fillOpacity": 0,
        "gradientMode": "none",
        "spanNulls": false,
        "insertNulls": false,
        "showPoints": "auto",
        "pointSize": 5,
        "stacking": {
          "mode": "none",
          "group": "A"
        },
        "axisPlacement": "auto",
        "axisLabel": "",
        "axisColorMode": "text",
        "axisBorderShow": false,
        "scaleDistribution": {
          "type": "linear"
        },
        "axisCenteredZero": false,
        "hideFrom": {
          "tooltip": false,
          "viz": false,
          "legend": false
        },
        "thresholdsStyle": {
          "mode": "off"
        }
      },
      "color": {
        "mode": "palette-classic"
      },
      "mappings": [],
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {
            "value": null,
            "color": "green"
          },
          {
            "value": 80,
            "color": "red"
          }
        ]
      },
      "unit": "short"
    },
    "overrides": []
  },
  "interval": null
}
```
</details>
<details>

<summary>▶点击展开：《各浏览器版本占比》Grafana 图表配置JSON</summary>


```json
{
  "type": "piechart",
  "title": "各浏览器版本占比",
  "gridPos": {
    "x": 12,
    "y": 1,
    "w": 12,
    "h": 8
  },
  "datasource": {
    "uid": "grafanacloud-prom",
    "type": "prometheus"
  },
  "id": 43,
  "targets": [
    {
      "refId": "A",
      "expr": "sum by(browser) (UAInfo)",
      "range": true,
      "instant": false,
      "datasource": {
        "type": "prometheus",
        "uid": "grafanacloud-prom"
      },
      "editorMode": "builder",
      "legendFormat": "__auto",
      "useBackend": false,
      "disableTextWrap": false,
      "fullMetaSearch": false,
      "includeNullMetadata": true
    }
  ],
  "options": {
    "reduceOptions": {
      "values": false,
      "calcs": [
        "sum"
      ],
      "fields": ""
    },
    "pieType": "pie",
    "tooltip": {
      "mode": "single",
      "sort": "none"
    },
    "legend": {
      "showLegend": true,
      "displayMode": "table",
      "placement": "right",
      "values": [
        "percent",
        "value"
      ]
    },
    "displayLabels": [
      "percent",
      "name"
    ]
  },
  "fieldConfig": {
    "defaults": {
      "custom": {
        "hideFrom": {
          "tooltip": false,
          "viz": false,
          "legend": false
        }
      },
      "color": {
        "mode": "palette-classic"
      },
      "mappings": []
    },
    "overrides": []
  }
}
```
</details>


#### 2. 验证 GIF 转视频后帧数、分辨率、体积变化

优化上线前,推荐先在本地用上文的 [GIF2video-node-server](https://github.com/JuniorTour/gif2video-node-server) 服务,用多个站内的 GIF 图文件转换格式后,对比体积,初步验证体积优化效果。

GIF 转视频后分辨率、帧数可能都会有所变化,建议大量测试后充分验证。

如果视觉上有肉眼可见的显著变化,建议检查 FFmpeg 的参数配置,例如:

1. `-crf` 视频质量:值越小,产物质量越高、体积越大。调整 `crf` 值,控制转换后的视频质量。例如 `-crf 28`,即以 28 的质量分转换(值越小质量越高,取值范围视编码器而定)。
1. `-s` 视频分辨率:指定产物视频的宽度和高度。例如 `-s 1280x720` 表示将产物视频调整为 1280x720 的分辨率。

### 2. 量化

#### 1. 开始播放耗时指标

三种格式的**开始播放时机**不同:

- GIF 图片:在完全加载 GIF 图片后,`onload` 事件触发后,开始播放。
- 视频(MP4 和 Webm):第一帧加载后,`onloadeddata` 事件触发后,开始播放。

相对来说,视频类开始播放的时间要显著早于 GIF 图片,因为:

- 视频的完整体积远远小于 GIF
- 加载视频第一帧的体积和耗时更是远远小于完全加载 GIF 图片

这一区别导致 GIF 图片开始播放的耗时会比视频更**多**,意味着用户要等待更长的时间才能看到 GIF 图片开始播放,体验更差。

因此可以统计**开始播放时间点**这一数据,作为量化优化效果的方式。具体做法是分别监听 GIF 的 `onload` 事件和视频的 `onloadeddata` 事件,统计其触发耗时:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>GIF和视频对比加载耗时DEMO</title>
    <style>
      .box {
        width: 450px;
        height: 450px;
        font-size: 60px;
        display: flex;
        align-items: center;
      }
    </style>
  </head>
  <body>
    <h1>GIF Example</h1>
    <h3>
      <a href="https://github.com/JuniorTour/blog/issues/13"
         target="_blank"
        >《现代前端工程体验优化》DEMO</a>
    </h3>
    <div>
      <button onclick="handleClickLoad('GIF')">加载GIF</button>
      <button onclick="handleClickLoad('mp4')">加载MP4</button>
      <button onclick="handleClickLoad('webm')">加载Webm</button>
    </div>

    <h4>data: <span id="data"></span></h4>

    <div id="player"></div>

    <script>
      async function reportGauge({ name, help, labels, value, sampleRate }) {
        if (Math.random() > sampleRate) {
          return;
        }
        await fetch('http://localhost:4001/gauge-metric', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            help,
            labels,
            value,
          }),
        });
      }

      const player = document.querySelector('#player');
      function initLoad(loadType) {
        if (loadType === 'GIF') {
          html = `
  <div class="box">

    <div>GIF</div>
  </div>
            `;
        } else {
          html = `
  <div class="box">
    <video src="https://colinbendell.github.io/webperf/animated-GIF-decode/1.${loadType}"
           muted autoplay loop
           onloadeddata="onLoad('${loadType}_onloadeddata')"
           ></video>
    <div>${loadType}</div>
  </div>
            `;
        }
        player.innerHTML = html;
      }

      const query = new URLSearchParams(location.search);
      const loadType = query.get('type');
      initLoad(loadType);

      function handleClickLoad(type) {
        location.search = `type=${type}`;
      }

      // 视频素材：
      // https://colinbendell.github.io/webperf/animated-GIF-decode/1.avif
      // https://colinbendell.github.io/webperf/animated-GIF-decode/1.webm
      // https://colinbendell.github.io/webperf/animated-GIF-decode/1.GIF
      let data = {};
      const ele = document.querySelector('#data');
      function printData() {
        if (ele) {
          ele.innerHTML = JSON.stringify(data, null, 2);
        }
      }

      function onLoad(type) {
        const time = performance.now();
        data[type] = time;
        printData();

        reportGauge(
          {
            name: `GIF2VideoPlayTime`,
            help: `start to play time for GIF2Video optimization`,
            labels: {
              type,
            },
            value: time,
            sampleRate: 1,
          },
        );
      }
    </script>
  </body>
</html>
```

这段 HTML 代码对加载视频的 `video` 和加载 GIF 图片的 `img` 元素分别监听了 `onloadeddata` 和 `onload` 事件,并在事件回调 `function onLoad(type)` 中统计其触发耗时 `const time = performance.now();`,最后使用 `function reportGauge(name, help, labels, value)` 将类型(`type`)和耗时(`time`)通过数据收集服务的 HTTP 接口 [/gauge-metric](https://github.com/JuniorTour/node-prometheus-grafana-demo) 上报到 Grafana。

有了这些数据,就可以创建一张可视化图表,分析对比 GIF 和视频文件**开始播放耗时指标**的差异,量化 GIF 转视频优化的收益。

具体实践中,推荐在优化上线之前**预先**上线开始播放耗时指标,统计优化前 GIF 图片的播放耗时数据;优化上线后与之前的 GIF 数据对比,分析优化效果。

#### 2. GIF 图片和视频体积指标

GIF 转视频优化的直接收益就是加载体积显著减少,量化 GIF 图片和视频体积指标同样必不可少。

推荐在转视频的后端项目中,使用 Node.js 的 `fs` 模块计算并上报体积数据:

```js
function getFileSize(type, files, targetDir) {
  const fileName = files.find((fileNmae) => fileNmae.includes(`.${type}`));
  return fs.statSync(path.resolve(targetDir, fileName)).size; // unit: byte
}

// ...
const GIFFileSize = getFileSize('GIF', files, targetDir);
const webmFileSize = getFileSize('webm', files, targetDir);
const mp4FileSize = getFileSize('mp4', files, targetDir);

reportSizeRatio('Webm', webmFileSize / GIFFileSize);
reportSizeRatio('MP4', mp4FileSize / GIFFileSize);
```

上报数据可复用 Node.js 数据收集服务 HTTP 接口:[/gauge-metric](https://github.com/JuniorTour/node-prometheus-grafana-demo) 及其封装函数 `function reportGauge()`,上传到 Grafana 用于制作可视化图表。

> 《GIF2Video feat: 增加体积数据统计》完整代码Commit：<https://github.com/JuniorTour/GIF2video-node-server/commit/cc27be71ac6759e0aeb981bb81dc06f90393910c>

### 3. 评估

#### 1. 开始播放耗时下降 50%

基于优化上线前提前创建好的 Grafana 可视化图表,优化上线后应能观察到视频的**开始播放耗时**显著低于 GIF 图片,有 50% 以上的降幅。示例数据:

| 对比项 / 开始播放耗时（单位：毫秒 ms） | 优化前（**仅GIF图片**） | 优化后（**Webm视频**） | 差异               |
| ---------------------- | --------------- | --------------- | ---------------- |
| 平均值                    | 70.9            | 31.9            | -39ms (-55.0%)   |
| 最大值                    | 95.3            | 38.8            | -56.5ms (-59.3%) |
| 最小值                    | 59.5            | 25.8            | -33.7ms (-56.6%) |

#### 2. GIF 图片和视频体积比例指标仅 20% 左右

优化上线后,应能看到 GIF2Video 服务上报的体积比例指标长期保持在 20% 左右的较低水平,表示优化让用户加载的资源体积大幅减少 80%,取得了显著的优化收益。

## 6. 小结

GIF 图片转视频是经过业界实践检验的性能优化方案:首先对比 GIF、MP4 和 Webm 三种格式的异同,明确视频格式在体积与播放时机上的双重优势;其次掌握用 FFmpeg 命令行与 Node.js 服务实现 GIF 转视频的完整链路;最后利用 `<video>` 和 `<source>` 元素按 WebM 优先、MP4 兜底的方式自适应选择最优视频格式,并配合 UA 统计、开始播放耗时与体积比例指标完成验证、量化与评估。
