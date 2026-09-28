---
title: "组件实战-Upload拖拽上传"
description: "首先用 express + multer 跑的服务端，创建 /upload 接口来接收文件。"
keywords: [组件实战-Upload拖拽上传]
category: React
tags: [React, 组件与实战]
---

# 组件实战-Upload拖拽上传

## 学习目标

- 掌握 Upload 组件的实现（express + multer 服务端、FormData 上传）
- 掌握 beforeUpload / onProgress / onSuccess 回调与 Dragger 拖拽上传

## 总结

今天我们实现了 Upload 组件。

首先用 express + multer 跑的服务端，创建 /upload 接口来接收文件。

然后在 Upload 组件里调用 axios，上传包含 file 的 FormData。

之后加上了 beforeUpload、onProgress、onSuccess、onChange 等回调函数。

最后又加上了 UploadList 来可视化展示上传文件的状态。

然后实现了 Dragger 组件，可以拖拽文件来上传。

这样，我们就实现了 Upload 组件。
## 继续阅读

- 上一篇：[29-组件实战-onBoarding漫游式引导组件](29-组件实战-onBoarding漫游式引导组件)
- 下一篇：[31-组件实战-Form表单组件](31-组件实战-Form表单组件)
