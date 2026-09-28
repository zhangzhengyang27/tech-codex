---
title: Postman 进阶功能与使用技巧
description: 梳理 Postman 的进阶能力:环境变量管理、代码生成、代理设置、Monitor 定时监控、Flows 流程编排、鉴权配置,以及脚本编写与 Newman/CLI 运行集合。
keywords: [mock与接口测试, Postman, 进阶功能与使用技巧]
category: 调试
tags: [Postman, 接口测试]
---

# Postman 进阶功能与使用技巧

> 本节重点不是"再学一次怎么发请求"，而是理解 `Postman` 在真实开发中的进阶能力：环境变量、代码生成、代理、监控、Flows、JSON 格式化、鉴权配置，以及 CLI 运行集合。

## 核心知识点

### Postman 的定位与能力范围  必须掌握

#### 概念说明

`Postman` 早已不只是一个"发 HTTP 请求的工具"，它目前已经形成了一整套 API 协作生态，常见能力包括：

- 发送和调试 HTTP 请求
- 管理 `Collection`（接口集合）
- 管理 `Environment`（环境）与变量
- 编写测试脚本与前置脚本
- 创建 `Mock Server`
- 创建 `Monitor` 做定时监控
- 使用 `Flows` 进行图形化流程编排
- 通过 CLI 运行接口集合

#### 注意事项

- 本节的很多高级能力都建立在 `Collection` 之上
- 真正用好 Postman 的关键，不是只会点 `Send`，而是要会组织"环境 + 集合 + 脚本 + 监控"
- 视频文字稿里多处把 `Collection` 识别成了 `Connection`，整理时已统一修正为 `Collection`

---

## Environment 与变量管理

### 环境变量与全局变量  必须掌握

#### 概念说明

在不同环境中，请求地址、Token、用户信息、接口前缀通常都不一样，这时就应该使用变量来统一管理。

Postman 中常见变量范围包括：

- `Global variables`：全局变量，所有工作区都可能用到
- `Environment variables`：环境变量，适合区分开发、测试、生产环境
- `Collection variables`：集合变量，适合某一组接口共享使用
- `Local variables`：局部变量，通常用于脚本执行过程中的临时值

#### 语法 / 用法

变量在请求中通常使用双大括号引用：

```text
{{baseUrl}}
```

例如把本地服务地址抽成变量：

```text
{{baseUrl}}/db
```

当 `baseUrl = http://localhost:3000` 时，实际发送的请求就是：

```text
http://localhost:3000/db
```

#### 代码示例

```http
GET {{baseUrl}}/api/courses
Authorization: Bearer {{token}}
```

#### 代码解析

- `{{baseUrl}}`：用来切换不同环境下的服务地址
- `{{token}}`：用来切换不同登录态或用户身份
- 通过环境切换，可以避免每次手动改 URL 和请求头

#### 注意事项

- 如果变量未定义，Postman 通常会高亮提示，说明没有成功取到变量值
- 建议把 `baseUrl`、`token`、`userId` 这类值放到环境变量中统一维护
- 不要把敏感信息直接硬编码在每一个请求里

#### 最佳实践

- `dev`、`test`、`prod` 分别建立独立环境
- 环境变量统一命名，如：`baseUrl`、`apiPrefix`、`token`
- 团队协作时，尽量把"值会变"的内容都抽成变量

---

## Code 生成功能

### 一键转换为各语言请求代码  重要

#### 概念说明

Postman 提供了 `Code` 功能，可以把当前请求转换成不同语言或工具的调用代码，例如：

- `cURL`
- `JavaScript - fetch`
- `Node.js - Axios`
- `Python - requests`
- `Go - native`
- `Java - OkHttp`

#### 使用场景

这个功能非常适合：

- 把调试好的请求快速转成前端代码
- 把接口调用片段发给后端或测试同学
- 快速生成 `curl` 命令用于终端排查

#### 代码示例

假设当前请求是：

```http
GET {{baseUrl}}/api/courses
```

它可能被转换为：

```bash
curl --location '{{baseUrl}}/api/courses'
```

也可能被转换为：

```js
fetch("{{baseUrl}}/api/courses", {
  method: "GET"
});
```

#### 注意事项

- 自动生成的代码适合"快速起步"，但不一定是最终生产代码
- 拿到代码后，要自行补充错误处理、超时控制、业务封装等逻辑
- 某些生成模板会随着 Postman 版本演进而变化

---

## Proxy 代理设置

### 为请求配置代理  重要

#### 概念说明

在某些网络环境下，你可能需要通过代理访问接口，例如：

- 公司内网代理
- 抓包调试
- 测试特殊网络环境
- 访问受限服务

Postman 支持使用：

- 系统代理
- HTTP 代理
- SOCKS 代理

#### 用法说明

可以在 `Settings` 中配置代理策略，常见方式是：

- 直接跟随系统代理
- 手动输入代理地址和端口
- 配置是否对某些域名跳过代理

#### 注意事项

- 视频文字稿中的 `process` 实际应为 `proxy`
- 如果请求总是失败，要排查是否代理设置错误
- 某些抓包场景下，请记得同时检查系统证书与 HTTPS 配置

---

## Monitor：定时监控接口可用性



### 使用 Monitor 监控接口  必须掌握

#### 概念说明

`Monitor` 是 Postman 的定时任务能力，可以定期运行某个 `Collection`，并生成结果报告，用来观察接口是否可用。

它常用于：

- 监控线上第三方接口可达性
- 监控核心接口是否连续报错
- 定时检查测试环境接口是否失效
- 定时执行带断言的接口集合

#### 语法 / 用法

创建 Monitor 时，通常要配置：

- `Monitor name`
- 要运行的 `Collection`
- 使用的 `Environment`
- 运行周期
- 通知邮箱
- 请求超时时间

#### 实战步骤

1. 选择一个已有的 `Collection`
2. 创建 `Monitor`
3. 配置运行周期，例如每小时一次
4. 设置邮箱通知规则
5. 手动运行一次确认配置正确
6. 查看运行结果与失败报告

#### 代码示例

假设某个集合里有如下测试断言：

```js
pm.test("状态码应为 200", function () {
  pm.response.to.have.status(200);
});
```

只要定时任务运行该请求，失败时就能在报告里看到断言失败结果。

#### 代码逐行解析

- `pm.test(...)`：定义测试用例
- `pm.response.to.have.status(200)`：断言响应状态码必须为 `200`
- 如果接口异常或断言不通过，Monitor 报告中会显示失败

#### 注意事项

- Monitor 属于云端执行能力，不是单纯本地点击运行
- 不同套餐下，监控频率、运行次数、协作能力可能受限
- 某些鉴权或网络场景在 Monitor 中运行时，需要额外确认是否可访问

#### 最佳实践

- 优先监控关键接口，而不是把所有接口都塞进去
- 给集合写好断言，否则 Monitor 只能知道“请求发了”，却无法知道“业务是否正确”
- 报警阈值不要设置得过于敏感，否则会造成邮件轰炸

---

## Flows：图形化流程编排

### 使用 Flows 搭建自动化流程  重要

#### 概念说明

`Postman Flows` 是一种图形化流程工具，可以把请求、条件判断、变量处理、数据流转连接起来，实现低代码式自动化编排。

它很像“接口测试版的流程图”或“可视化自动化脚本编排工具”。

#### 典型场景

- 登录后拿 Token，再继续请求后续接口
- 根据接口结果分支处理不同逻辑
- 自动串联多个 API 请求
- 做一些无需手写太多脚本的测试流程

#### 语法 / 用法

Flows 中常见块包括：

- Request：发起请求
- Condition：条件判断
- Data / Variable：数据传递
- Delay / Control：流程控制
- Output：输出结果

#### 关键知识

视频中提到 `FQL condition`，这里指的是 Flows 使用的表达式 / 条件能力。你不一定要把所有函数记住，因为：

- 官方提供函数参考文档
- 编辑器通常会提供函数提示
- 常见条件模板可以直接套用

#### 代码示例

下面是一个简单的流程逻辑：

```text
请求课程接口 -> 判断 data 是否为空 ->
为空：输出“暂无课程”
不为空：继续请求课程详情
```

如果用条件表达，其本质可能接近：

```text
count(data) > 0
```

#### 注意事项

- 适合流程可视化，但不意味着完全替代脚本能力
- 简单流程用 Flows 很直观，复杂业务仍然要配合脚本与集合设计
- 视频中的 `sleeps` 实际应为 `snippets` 或示例模板语义，表示“常用条件片段 / 模板”

#### 最佳实践

- 先从一条简单链路开始，不要一上来就搭复杂流程
- 把复杂逻辑拆成多个小块，避免画成一张巨大的流程图
- 关键节点补充断言或输出，方便调试和复盘

---

## JSON Beautify 与响应查看

### 格式化请求体与响应体  必须掌握

#### 概念说明

在调试接口时，经常会遇到很长的一段 JSON，如果没有格式化，阅读成本非常高。Postman 提供了格式化展示能力，便于：

- 查看层级结构
- 折叠 / 展开对象
- 快速定位字段
- 复制标准 JSON 数据

#### 代码示例

原始 JSON：

```json
{"code":0,"data":{"name":"前端课程","tags":["js","ts","react"]}}
```

格式化后：

```json
{
  "code": 0,
  "data": {
    "name": "前端课程",
    "tags": [
      "js",
      "ts",
      "react"
    ]
  }
}
```

#### 注意事项

- 视频中的 `beauty` 实际应为 `Beautify` 或界面中的格式化能力
- 折叠节点功能对查看大型 JSON 非常实用
- 格式化只影响查看体验，不会改变接口的真实返回内容

---

## Authorization 鉴权配置



### 使用可视化方式管理认证信息  必须掌握

#### 概念说明

很多接口都要求认证，Postman 在 `Authorization` 面板中提供了常见认证方式，避免你每次都手写请求头。

常见类型包括：

- `Bearer Token`
- `Basic Auth`
- `API Key`
- `OAuth 2.0`
- `JWT Bearer`
- `Digest Auth`

#### 代码示例

如果你使用 Bearer Token，本质上等价于：

```http
Authorization: Bearer {{token}}
```

#### 优势说明

相比手动在 `Headers` 中一个字一个字写：

- 更直观
- 更不容易拼错
- 更适合多个请求统一配置
- 更方便切换环境变量中的 Token

#### 注意事项

- 视频中的 `betoken` 实际应为 `Bearer Token`
- 如果某些请求头是自动生成的，可以通过界面隐藏不必要的 headers，减少干扰
- 不建议把敏感 Token 明文硬编码到集合里长期保存

---

## Postman 脚本与 CLI

### 脚本能力与命令行运行集合  重要

#### 概念说明

除了界面操作，Postman 还支持：

- 在请求前执行脚本（Pre-request Script）
- 在请求后执行测试脚本（Tests）
- 通过 CLI 执行集合，实现自动化测试或 CI 集成

#### 代码示例

前置脚本示例：

```js
pm.environment.set("timestamp", Date.now());
```

测试脚本示例：

```js
pm.test("返回值包含 data 字段", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("data");
});
```

#### 代码逐行解析

- `pm.environment.set(...)`：把一个值写入当前环境变量
- `pm.response.json()`：把响应体解析成 JSON
- `pm.expect(...)`：对返回结果做断言

#### CLI 相关补充

“通过 CLI 运行 collection 集合”，这个方向是正确的，但要注意区分两个概念：

1. **Postman CLI**
   - 官方命令行工具
   - 更偏与 Postman 平台能力集成

2. **Newman**
   - 更经典的 Collection 命令行运行器
   - 很多团队在 CI 中依然常用

#### 注意事项

- 视频中的 `CRI` 实际应为 `CLI`
- 如果你做前端自动化联调，CLI 是非常有价值的能力
- 想接入 CI/CD 时，通常要把集合、环境、断言一起组织好

## 延伸学习资源

- Postman 官方文档首页：[Postman Docs](https://learning.postman.com/)
- 变量文档：[Variables](https://learning.postman.com/docs/sending-requests/variables/variables/)
- 代码生成文档：[Generate code snippets](https://learning.postman.com/docs/sending-requests/create-requests/generate-code-snippets/)
- 代理设置文档：[Proxy settings](https://learning.postman.com/docs/getting-started/installation/proxy/)
- Monitor 文档：[Monitor an API](https://learning.postman.com/docs/monitoring-your-api/intro-monitors/)
- Flows 文档：[Postman Flows](https://learning.postman.com/docs/postman-flows/overview/)
- 鉴权文档：[Authorization](https://learning.postman.com/docs/sending-requests/authorization/authorization-types/)
- Postman CLI 文档：[Postman CLI](https://learning.postman.com/docs/postman-cli/postman-cli-overview/)
- Newman 仓库：[Newman](https://github.com/postmanlabs/newman)
- W3Cschool 中文资料：[Postman 教程](https://www.w3cschool.cn/postman/)

### 练习建议

1. 创建 `dev` 和 `test` 两个环境，并用 `{{baseUrl}}` 切换同一组接口。
2. 任意挑一个请求，分别生成 `curl`、`fetch`、`axios` 三种代码片段对比差异。
3. 给一个集合补上断言后，创建一个每小时执行一次的 `Monitor`。
4. 使用 `Flows` 设计一个“登录 -> 获取课程列表 -> 判断列表是否为空”的流程。
5. 把一个需要 Token 的请求，从手写 Header 改造成 `Authorization` 面板配置方式。

---

