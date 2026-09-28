---
title: URL 与 QueryString
description: url 模块的 WHATWG URL 与 Legacy API 差异、查询串解析与编码规则
keywords: [Node.js, URL, QueryString]
category: Node.js
tags: [Node.js, 核心模块]
---







# URL 与 QueryString

Node.js 提供 `url` 与 `querystring` 模块，用于解析、格式化、拼接 URL 以及处理查询字符串参数。自 Node.js v10 起新增了 WHATWG URL 标准接口，推荐在新项目中优先使用。

## 模块导入

```javascript
// WHATWG URL API（推荐）
const { URL, URLSearchParams } = require("url")

// Legacy API（兼容旧代码）
const url = require("url")

// 查询字符串处理
const querystring = require("querystring")
```

## URL 结构说明

### 标准 URL 组成部分

```
  https://user:pass@sub.example.com:8080/p/a/t/h?query=string#hash
  \____/   \____/ \__/ \_____________/\__/\_______/ \___________/\____/
    |        |     |         |         |      |          |        |
  protocol  auth  host    hostname   port pathname   search    hash
                                        |                |
                                    origin          query params
```

### URL 各部分详解

| 组成部分     | 属性名           | 说明                           | 示例                    |
| ------------ | ---------------- | ------------------------------ | ----------------------- |
| 协议         | `protocol`       | URL 协议方案                   | `https:`                |
| 用户名       | `username`       | 认证用户名                     | `user`                  |
| 密码         | `password`       | 认证密码                       | `pass`                  |
| 主机名       | `hostname`       | 域名或 IP 地址                 | `sub.example.com`       |
| 端口         | `port`           | 端口号                         | `8080`                  |
| 主机         | `host`           | 主机名 + 端口                  | `sub.example.com:8080`  |
| 来源         | `origin`         | 协议 + 主机                    | `https://sub.example.com:8080` |
| 路径         | `pathname`       | URL 路径部分                   | `/p/a/t/h`              |
| 查询字符串   | `search`         | 完整查询字符串（含 ?）         | `?query=string`         |
| 查询参数     | `searchParams`   | URLSearchParams 对象           | 可迭代查询参数          |
| 片段标识符   | `hash`           | 锚点部分（含 #）               | `#hash`                 |
| 完整 URL     | `href`           | 完整的 URL 字符串              | 完整 URL                |

## URL 模块概览

`url` 模块提供两套 API：

- **WHATWG URL API**：符合浏览器的标准接口，类实例化使用，**推荐**
- **Legacy API**：早期接口（`url.parse`、`url.format`、`url.resolve`），用于兼容旧代码

### API 对比

| 特性         | WHATWG URL API                | Legacy API                    |
| ------------ | ----------------------------- | ----------------------------- |
| 标准性       | WHATWG 标准，浏览器兼容       | Node.js 特有                  |
| 使用方式     | 类实例化                      | 函数调用                      |
| 性能         | 更快（原生 C++ 实现）         | 较慢                          |
| 错误处理     | 构造时抛出异常                | 返回对象，不抛错              |
| 推荐程度     | **推荐使用**                  | 仅用于旧代码兼容              |

## WHATWG URL API

### 创建 URL 对象

```javascript
const { URL } = require("url")

// 方式1：从完整 URL 创建
const url1 = new URL("https://example.com:8080/path/name?foo=bar&baz=1#fragment")

// 方式2：从相对 URL 和基础 URL 创建
const base = "https://example.com/docs/"
const url2 = new URL("/api/v1", base)
// https://example.com/api/v1

// 方式3：从各个部分构建
const url3 = new URL("https://example.com")
url3.pathname = "/search"
url3.searchParams.set("q", "nodejs")
url3.searchParams.set("page", "1")

console.log(url3.href) // https://example.com/search?q=nodejs&page=1
```

### URL 属性详解

```javascript
const { URL } = require("url")

const myURL = new URL("https://user:pass@example.com:8080/path/name?foo=bar&baz=1#fragment")

// 基本属性（可读写）
console.log(myURL.protocol)   // "https:"
console.log(myURL.username)   // "user"
console.log(myURL.password)   // "pass"
console.log(myURL.hostname)   // "example.com"
console.log(myURL.port)       // "8080"
console.log(myURL.pathname)   // "/path/name"
console.log(myURL.hash)       // "#fragment"

// 计算属性（只读）
console.log(myURL.host)       // "example.com:8080"
console.log(myURL.origin)     // "https://example.com:8080"
console.log(myURL.href)       // 完整 URL
console.log(myURL.search)     // "?foo=bar&baz=1"

// searchParams 对象（可操作）
console.log(myURL.searchParams instanceof URLSearchParams) // true
```

### 修改 URL 组件

```javascript
const url = new URL("https://example.com")

// 修改路径
url.pathname = "/api/v1/users"

// 添加查询参数
url.searchParams.set("q", "nodejs")
url.searchParams.set("limit", "10")

// 修改端口
url.port = "3000"

// 添加片段标识符
url.hash = "results"

console.log(url.toString())
// https://example.com:3000/api/v1/users?q=nodejs&limit=10#results

// 修改认证信息
url.username = "admin"
url.password = "secret123"
console.log(url.href)
// https://admin:secret123@example.com:3000/api/v1/users?q=nodejs&limit=10#results

// 删除查询参数
url.searchParams.delete("limit")
console.log(url.search) // ?q=nodejs
```

### 特殊情况处理

```javascript
const { URL } = require("url")

// 端口特殊处理
const url1 = new URL("https://example.com:443") // HTTPS 默认端口
console.log(url1.port) // ""（空字符串，默认端口会被省略）

const url2 = new URL("http://example.com:80") // HTTP 默认端口
console.log(url2.port) // ""（空字符串）

// 设置为默认端口会自动省略
url2.port = "80"
console.log(url2.port) // ""（空字符串）

// 路径规范化
const url3 = new URL("https://example.com/a/../b/./c")
console.log(url3.pathname) // "/b/c"（自动规范化）

// 编码处理
const url4 = new URL("https://example.com/search?q=你好 世界")
console.log(url4.search) // "?q=%E4%BD%A0%E5%A5%BD%20%E4%B8%96%E7%95%8C"（自动编码）
```

### URL 格式化与序列化

```javascript
const { URL } = require("url")

const url = new URL("https://example.com/path")

// toString() 方法
console.log(url.toString()) // "https://example.com/path"

// toJSON() 方法
console.log(url.toJSON()) // "https://example.com/path"

// JSON 序列化
const json = JSON.stringify({ url })
console.log(json) // {"url":"https://example.com/path"}

// href 属性（完整 URL）
console.log(url.href) // "https://example.com/path"

// origin 属性（仅协议和主机）
console.log(url.origin) // "https://example.com"
```

## URLSearchParams API

`URLSearchParams` 提供对查询参数的便利操作，是 WHATWG 标准的一部分。

### 创建 URLSearchParams

```javascript
const { URLSearchParams } = require("url")

// 方式1：从查询字符串创建
const params1 = new URLSearchParams("foo=bar&baz=1&baz=2")

// 方式2：从对象创建
const params2 = new URLSearchParams({
  foo: "bar",
  baz: "qux",
  page: "1"
})

// 方式3：从二维数组创建（支持重复键）
const params3 = new URLSearchParams([
  ["foo", "bar"],
  ["baz", "1"],
  ["baz", "2"]
])

// 方式4：从 URL 对象获取
const url = new URL("https://example.com?foo=bar")
const params4 = url.searchParams

console.log(params1.toString()) // "foo=bar&baz=1&baz=2"
console.log(params2.toString()) // "foo=bar&baz=qux&page=1"
console.log(params3.toString()) // "foo=bar&baz=1&baz=2"
```

### URLSearchParams 方法完整列表

#### 查询方法

| 方法                           | 返回值              | 说明                                       |
| ------------------------------ | ------------------- | ------------------------------------------ |
| `get(name)`                    | `string \| null`    | 获取第一个匹配的值，不存在返回 `null`      |
| `getAll(name)`                 | `string[]`          | 获取所有匹配的值数组                       |
| `has(name)`                    | `boolean`           | 检查是否存在指定参数                       |
| `keys()`                       | `Iterator`          | 返回所有参数名的迭代器                     |
| `values()`                     | `Iterator`          | 返回所有参数值的迭代器                     |
| `entries()`                    | `Iterator`          | 返回所有 [name, value] 对的迭代器          |
| `forEach(callback)`            | `void`              | 遍历所有参数                               |

#### 修改方法

| 方法                           | 返回值              | 说明                                       |
| ------------------------------ | ------------------- | ------------------------------------------ |
| `set(name, value)`             | `void`              | 设置参数值（覆盖同名参数）                 |
| `append(name, value)`          | `void`              | 追加参数值（允许同名参数）                 |
| `delete(name)`                 | `void`              | 删除指定参数                               |
| `sort()`                       | `void`              | 按参数名排序                               |

#### 其他方法

| 方法                           | 返回值              | 说明                                       |
| ------------------------------ | ------------------- | ------------------------------------------ |
| `toString()`                   | `string`            | 返回查询字符串（不含 ?）                   |
| `toJSON()`                     | `string`            | 返回查询字符串（同 toString）              |

### 基本操作示例

```javascript
const params = new URLSearchParams("foo=bar&baz=1&baz=2")

// 获取参数
console.log(params.get("foo"))      // "bar"
console.log(params.get("unknown"))  // null

// 获取所有同名参数
console.log(params.getAll("baz"))   // ["1", "2"]
console.log(params.getAll("foo"))   // ["bar"]

// 检查参数是否存在
console.log(params.has("foo"))      // true
console.log(params.has("unknown"))  // false

// 设置参数（覆盖）
params.set("foo", "newbar")
console.log(params.get("foo"))      // "newbar"

// 追加参数
params.append("baz", "3")
console.log(params.getAll("baz"))   // ["1", "2", "3"]

// 删除参数
params.delete("foo")
console.log(params.has("foo"))      // false

console.log(params.toString())      // "baz=1&baz=2&baz=3"
```

### 迭代操作

```javascript
const params = new URLSearchParams("a=1&b=2&c=3")

// 使用 for...of 迭代
for (const [name, value] of params) {
  console.log(`${name} = ${value}`)
}
// 输出：
// a = 1
// b = 2
// c = 3

// 使用 entries()
for (const [name, value] of params.entries()) {
  console.log(`${name}: ${value}`)
}

// 使用 keys()
for (const name of params.keys()) {
  console.log("参数名:", name)
}

// 使用 values()
for (const value of params.values()) {
  console.log("参数值:", value)
}

// 使用 forEach()
params.forEach((value, name) => {
  console.log(`${name} => ${value}`)
})

// 转换为数组
const entries = Array.from(params.entries())
console.log(entries) // [["a", "1"], ["b", "2"], ["c", "3"]]

const keys = Array.from(params.keys())
console.log(keys) // ["a", "b", "c"]

const values = Array.from(params.values())
console.log(values) // ["1", "2", "3"]

// 转换为对象
const obj = Object.fromEntries(params)
console.log(obj) // { a: "1", b: "2", c: "3" }
```

### 参数排序

```javascript
const params = new URLSearchParams("z=3&a=1&m=2")

console.log(params.toString()) // "z=3&a=1&m=2"

// 按参数名排序
params.sort()

console.log(params.toString()) // "a=1&m=2&z=3"
```

### 编码与解码

```javascript
const params = new URLSearchParams()

// 自动编码特殊字符
params.set("q", "你好 世界")
params.set("url", "https://example.com/path?foo=bar")

console.log(params.toString())
// "q=%E4%BD%A0%E5%A5%BD+%E4%B8%96%E7%95%8C&url=https%3A%2F%2Fexample.com%2Fpath%3Ffoo%3Dbar"

// 获取时自动解码
console.log(params.get("q"))   // "你好 世界"
console.log(params.get("url")) // "https://example.com/path?foo=bar"

// 手动编码和解码
const encoded = encodeURIComponent("你好 世界")
console.log(encoded) // "%E4%BD%A0%E5%A5%BD%20%E4%B8%96%E7%95%8C"

const decoded = decodeURIComponent(encoded)
console.log(decoded) // "你好 世界"
```

### URLSearchParams 与 URL 结合使用

```javascript
const { URL, URLSearchParams } = require("url")

// 从 URL 创建并修改查询参数
const url = new URL("https://example.com/search")
url.searchParams.set("q", "nodejs")
url.searchParams.set("page", "1")
url.searchParams.set("limit", "10")

console.log(url.href)
// https://example.com/search?q=nodejs&page=1&limit=10

// 批量设置参数
const searchParams = new URLSearchParams({
  category: "books",
  sort: "price",
  order: "desc"
})

url.search = searchParams.toString()
console.log(url.href)
// https://example.com/search?category=books&sort=price&order=desc

// 追加参数到现有 URL
url.searchParams.append("tag", "javascript")
url.searchParams.append("tag", "nodejs")

console.log(url.searchParams.getAll("tag")) // ["javascript", "nodejs"]
```

## Legacy API（兼容旧代码）

Legacy API 是 Node.js 早期提供的 URL 解析接口，虽然已被 WHATWG URL API 取代，但仍用于维护旧代码。

::: danger
`url.parse()` 已被官方标记为废弃（DEP0169），运行时会输出 `DeprecationWarning`，且其解析行为未标准化、存在安全隐患（官方不会为其漏洞发布 CVE 修复）。**新代码一律使用 WHATWG URL API**。
:::

### url.parse - 解析 URL

```javascript
const url = require("url")

// 解析 URL 字符串
const parsedUrl = url.parse("https://user:pass@example.com:8080/path/name?foo=bar&baz=1#hash")

console.log(parsedUrl)
// {
//   protocol: "https:",
//   slashes: true,
//   auth: "user:pass",
//   host: "example.com:8080",
//   port: "8080",
//   hostname: "example.com",
//   hash: "#hash",
//   search: "?foo=bar&baz=1",
//   query: "foo=bar&baz=1",
//   pathname: "/path/name",
//   path: "/path/name?foo=bar&baz=1",
//   href: "https://user:pass@example.com:8080/path/name?foo=bar&baz=1#hash"
// }

// 第二个参数为 true 时，query 会被解析为对象
const parsedWithQuery = url.parse("https://example.com/search?q=nodejs&page=1", true)

console.log(parsedWithQuery.query)
// { q: "nodejs", page: "1" }

// 第三个参数控制是否严格解析协议
const parsedStrict = url.parse("//example.com/path", false, true)
console.log(parsedStrict.host) // "example.com"
```

### url.parse 返回对象属性

| 属性         | 类型      | 说明                                   |
| ------------ | --------- | -------------------------------------- |
| `protocol`   | `string`  | URL 协议（含冒号）                     |
| `slashes`    | `boolean` | 协议后是否有双斜杠                     |
| `auth`       | `string`  | 认证信息（用户名:密码）                |
| `host`       | `string`  | 主机名 + 端口                          |
| `port`       | `string`  | 端口号                                 |
| `hostname`   | `string`  | 主机名                                 |
| `hash`       | `string`  | 片段标识符（含 #）                     |
| `search`     | `string`  | 查询字符串（含 ?）                     |
| `query`      | `string \| object` | 查询字符串（不含 ?）或解析后的对象 |
| `pathname`   | `string`  | URL 路径                               |
| `path`       | `string`  | 路径 + 查询字符串                      |
| `href`       | `string`  | 完整 URL                               |

### url.format - 格式化 URL

```javascript
const url = require("url")

// 从对象生成 URL 字符串
const urlObj = {
  protocol: "https:",
  hostname: "example.com",
  port: "8080",
  pathname: "/api/v1",
  query: { q: "nodejs", page: "1" },
  hash: "#results"
}

const urlString = url.format(urlObj)
console.log(urlString)
// https://example.com:8080/api/v1?q=nodejs&page=1#results

// query 为对象时自动序列化
const urlWithArray = url.format({
  protocol: "https",
  host: "example.com",
  pathname: "/search",
  query: { tags: ["js", "node"], limit: 10 }
})

console.log(urlWithArray)
// https://example.com/search?tags=js&tags=node&limit=10

// query 为字符串时直接使用
const urlWithString = url.format({
  protocol: "https",
  host: "example.com",
  pathname: "/search",
  query: "q=nodejs"
})

console.log(urlWithString)
// https://example.com/search?q=nodejs
```

### url.resolve - 解析相对 URL

```javascript
const url = require("url")

// 解析相对路径
const resolved1 = url.resolve("https://example.com/docs/", "guide.html")
console.log(resolved1) // "https://example.com/docs/guide.html"

const resolved2 = url.resolve("https://example.com/docs/guide.html", "../api/rest")
console.log(resolved2) // "https://example.com/api/rest"

const resolved3 = url.resolve("https://example.com/docs/", "/absolute/path")
console.log(resolved3) // "https://example.com/absolute/path"

// 更多示例（基础路径最后一段视为"文件名"，相对路径先替换它再导航）
console.log(url.resolve("/a/b/c", "../d"))      // "/a/d"
console.log(url.resolve("/a/b/c", "./d"))       // "/a/b/d"
console.log(url.resolve("http://example.com/a/b/c", "../../d")) // "http://example.com/d"
```

### url.resolve 解析规则

```javascript
const url = require("url")

// 相对于基础路径
console.log(url.resolve("https://example.com/docs/", "api.html"))
// https://example.com/docs/api.html

// 绝对路径替换整个路径
console.log(url.resolve("https://example.com/docs/", "/api/v1"))
// https://example.com/api/v1

// 相对路径导航
console.log(url.resolve("https://example.com/a/b/c", "../d"))
// https://example.com/a/d

console.log(url.resolve("https://example.com/a/b/c", "../../d"))
// https://example.com/d

// 当前目录
console.log(url.resolve("https://example.com/a/b/", "./c"))
// https://example.com/a/b/c

// 协议相对 URL
console.log(url.resolve("https://example.com/", "//cdn.example.com/lib.js"))
// https://cdn.example.com/lib.js
```

### WHATWG URL vs Legacy API 对比

```javascript
const url = require("url")

// ✅ 推荐：WHATWG URL API
const whatUrl = new URL("https://example.com/path?foo=bar")
console.log(whatUrl.searchParams.get("foo")) // "bar"

// ⚠️ Legacy API（仅用于旧代码兼容）
const legacyUrl = url.parse("https://example.com/path?foo=bar", true)
console.log(legacyUrl.query.foo) // "bar"
```

| 特性           | WHATWG URL API                | Legacy API                    |
| -------------- | ----------------------------- | ----------------------------- |
| 性能           | 更快（C++ 实现）              | 较慢（JavaScript 实现）       |
| 错误处理       | 无效 URL 抛出异常             | 不抛错，尽力解析              |
| 查询参数操作   | URLSearchParams 对象          | query 对象                    |
| URL 修改       | 支持属性修改                  | 需重新创建或使用 format       |
| 标准           | WHATWG 标准                   | Node.js 特有                  |
| 推荐程度       | **推荐**                      | 不推荐（仅用于兼容）          |

## querystring 模块

`querystring` 模块用于解析和格式化传统查询字符串，接口简单直接。**注意：该模块已被标记为 Legacy，推荐使用 `URLSearchParams`。**

### querystring.parse - 解析查询字符串

```javascript
const querystring = require("querystring")

// 基本解析
const query1 = "foo=bar&baz=1&baz=2"
const parsed1 = querystring.parse(query1)
console.log(parsed1)
// { foo: "bar", baz: ["1", "2"] }

// 自定义分隔符
const query2 = "foo:bar|baz:1|baz:2"
const parsed2 = querystring.parse(query2, "|", ":")
console.log(parsed2)
// { foo: "bar", baz: ["1", "2"] }

// 自定义选项
const query3 = "a=1&b=2&c=3"
const parsed3 = querystring.parse(query3, "&", "=", {
  maxKeys: 2 // 限制解析的键数量
})
console.log(parsed3)
// { a: "1", b: "2" }（c 被忽略）

// 解码百分比编码
const query4 = "name=%E5%BC%A0%E4%B8%89&msg=hello%20world"
const parsed4 = querystring.parse(query4)
console.log(parsed4)
// { name: "张三", msg: "hello world" }
```

### querystring.parse 参数说明

```javascript
querystring.parse(str[, sep[, eq[, options]]])
```

| 参数        | 类型     | 默认值             | 说明                                   |
| ----------- | -------- | ------------------ | -------------------------------------- |
| `str`       | `string` | -                  | 要解析的查询字符串                     |
| `sep`       | `string` | `"&"`              | 键值对之间的分隔符                     |
| `eq`        | `string` | `"="`              | 键和值之间的分隔符                     |
| `options`   | `Object` | -                  | 解析选项                               |

**options 对象属性：**

| 属性            | 类型       | 默认值             | 说明                                   |
| --------------- | ---------- | ------------------ | -------------------------------------- |
| `maxKeys`       | `number`   | `1000`             | 最大解析键数量，设为 0 表示无限制      |
| `decodeURIComponent` | `Function` | `querystring.unescape` | 自定义解码函数                   |

### querystring.stringify - 序列化查询字符串

```javascript
const querystring = require("querystring")

// 基本序列化
const obj1 = {
  foo: "bar",
  baz: ["1", "2", "3"],
  token: "abc"
}
const str1 = querystring.stringify(obj1)
console.log(str1)
// "foo=bar&baz=1&baz=2&baz=3&token=abc"

// 自定义分隔符
const obj2 = { a: "1", b: "2" }
const str2 = querystring.stringify(obj2, ";", ":")
console.log(str2)
// "a:1;b:2"

// 自定义编码函数
const obj3 = { name: "张三", msg: "hello world" }
const str3 = querystring.stringify(obj3, null, null, {
  encodeURIComponent: (str) => str // 不编码
})
console.log(str3)
// "name=张三&msg=hello world"

// 使用默认编码
const str4 = querystring.stringify(obj3)
console.log(str4)
// "name=%E5%BC%A0%E4%B8%89&msg=hello%20world"
```

### querystring.stringify 参数说明

```javascript
querystring.stringify(obj[, sep[, eq[, options]]])
```

| 参数        | 类型     | 默认值             | 说明                                   |
| ----------- | -------- | ------------------ | -------------------------------------- |
| `obj`       | `Object` | -                  | 要序列化的对象                         |
| `sep`       | `string` | `"&"`              | 键值对之间的分隔符                     |
| `eq`        | `string` | `"="`              | 键和值之间的分隔符                     |
| `options`   | `Object` | -                  | 序列化选项                             |

**options 对象属性：**

| 属性            | 类型       | 默认值             | 说明                                   |
| --------------- | ---------- | ------------------ | -------------------------------------- |
| `encodeURIComponent` | `Function` | `querystring.escape` | 自定义编码函数                   |

### 编码与解码函数

```javascript
const querystring = require("querystring")

// 编码
const encoded = querystring.escape("你好 world")
console.log(encoded) // "%E4%BD%A0%E5%A5%BD%20world"

// 解码
const decoded = querystring.unescape("%E4%BD%A0%E5%A5%BD%20world")
console.log(decoded) // "你好 world"

// 注意：escape 和 unescape 已弃用，推荐使用 encodeURIComponent 和 decodeURIComponent
const encoded2 = encodeURIComponent("你好 world")
console.log(encoded2) // "%E4%BD%A0%E5%A5%BD%20world"

const decoded2 = decodeURIComponent(encoded2)
console.log(decoded2) // "你好 world"
```

### querystring 与 URLSearchParams 对比

```javascript
const querystring = require("querystring")

// querystring.parse() 示例
const parsed = querystring.parse("foo=bar&baz=1&baz=2")
console.log(parsed.baz) // ["1", "2"]

// URLSearchParams 示例
const params = new URLSearchParams("foo=bar&baz=1&baz=2")
console.log(params.getAll("baz")) // ["1", "2"]
```

| 特性           | `querystring`                 | `URLSearchParams`                 |
| -------------- | ----------------------------- | --------------------------------- |
| 标准性         | Node.js 特有（已弃用）        | WHATWG 标准，浏览器兼容           |
| API 风格       | 函数式（parse/stringify）     | 面向对象（get/set/append/delete） |
| 类型处理       | 值为字符串或字符串数组        | 值始终为字符串                    |
| 编码函数       | `escape`/`unescape`（已弃用） | `encodeURIComponent`（现代）      |
| 迭代支持       | 不支持                        | 支持迭代器和 for...of             |
| 排序支持       | 不支持                        | 支持 `sort()` 方法                |
| 性能           | 较慢                          | 更快（原生实现）                  |
| 推荐程度       | **不推荐**（已弃用）          | **推荐**                          |

## 实用工具函数

### 文件路径与 URL 转换

```javascript
const { pathToFileURL, fileURLToPath } = require("url")
const path = require("path")

// 文件路径转换为 file URL
const filePath = path.resolve("./data/config.json")
const fileURL = pathToFileURL(filePath)
console.log(fileURL.href)
// file:///Users/username/project/data/config.json

// file URL 转换为文件路径
const fileUrlString = "file:///Users/username/project/data/config.json"
const convertedPath = fileURLToPath(fileUrlString)
console.log(convertedPath)
// /Users/username/project/data/config.json

// 处理特殊字符和空格
const pathWithSpaces = "/Users/user name/data file.json"
const urlWithSpaces = pathToFileURL(pathWithSpaces)
console.log(urlWithSpaces.href)
// file:///Users/user%20name/data%20file.json
```

### URL 解析与重建

```javascript
const { URL } = require("url")

// 解析并添加追踪参数
function addTrackingParam(inputURL, trackingId) {
  try {
    const url = new URL(inputURL)
    url.searchParams.set("tracking_id", trackingId)
    url.searchParams.set("timestamp", Date.now().toString())
    return url.toString()
  } catch (err) {
    console.error("无效的 URL:", err.message)
    return null
  }
}

const original = "https://example.com/products?page=2"
const updated = addTrackingParam(original, "abc123")
console.log(updated)
// https://example.com/products?page=2&tracking_id=abc123&timestamp=1234567890

// 批量修改查询参数
function modifyQueryParams(inputURL, params) {
  const url = new URL(inputURL)
  
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      url.searchParams.delete(key)
    } else {
      url.searchParams.set(key, value.toString())
    }
  })
  
  return url.toString()
}

const modified = modifyQueryParams(
  "https://example.com/search?q=nodejs&page=1",
  { page: "2", limit: "10", sort: "date" }
)
console.log(modified)
// https://example.com/search?q=nodejs&page=2&limit=10&sort=date
```

### URL 验证与检查

```javascript
const { URL } = require("url")

// 验证 URL 格式
function isValidURL(urlString) {
  try {
    new URL(urlString)
    return true
  } catch (err) {
    return false
  }
}

console.log(isValidURL("https://example.com")) // true
console.log(isValidURL("not-a-url")) // false
console.log(isValidURL("ftp://files.example.com")) // true

// 检查 URL 协议
function getProtocol(urlString) {
  try {
    const url = new URL(urlString)
    return url.protocol.replace(":", "")
  } catch (err) {
    return null
  }
}

console.log(getProtocol("https://example.com")) // "https"
console.log(getProtocol("ftp://files.example.com")) // "ftp"

// 检查是否为安全 URL
function isSecureURL(urlString) {
  try {
    const url = new URL(urlString)
    return url.protocol === "https:"
  } catch (err) {
    return false
  }
}

console.log(isSecureURL("https://example.com")) // true
console.log(isSecureURL("http://example.com")) // false

// 提取域名
function extractDomain(urlString) {
  try {
    const url = new URL(urlString)
    return url.hostname
  } catch (err) {
    return null
  }
}

console.log(extractDomain("https://www.example.com/path")) // "www.example.com"
console.log(extractDomain("https://sub.example.co.uk:8080")) // "sub.example.co.uk"
```

### 构建分页 URL

```javascript
const { URL } = require("url")

class PaginationBuilder {
  constructor(baseUrl, currentPage, totalPages, itemsPerPage) {
    this.url = new URL(baseUrl)
    this.currentPage = currentPage
    this.totalPages = totalPages
    this.itemsPerPage = itemsPerPage
  }

  setPage(page) {
    this.url.searchParams.set("page", page.toString())
    this.url.searchParams.set("limit", this.itemsPerPage.toString())
    return this.url.toString()
  }

  getFirstPage() {
    return this.setPage(1)
  }

  getLastPage() {
    return this.setPage(this.totalPages)
  }

  getNextPage() {
    const next = Math.min(this.currentPage + 1, this.totalPages)
    return this.setPage(next)
  }

  getPrevPage() {
    const prev = Math.max(this.currentPage - 1, 1)
    return this.setPage(prev)
  }

  getPagesAround(range = 2) {
    const pages = []
    const start = Math.max(1, this.currentPage - range)
    const end = Math.min(this.totalPages, this.currentPage + range)
    
    for (let i = start; i <= end; i++) {
      pages.push({
        page: i,
        url: this.setPage(i),
        current: i === this.currentPage
      })
    }
    
    return pages
  }
}

// 使用示例
const pagination = new PaginationBuilder(
  "https://example.com/products",
  5,  // 当前页
  20, // 总页数
  10  // 每页条数
)

console.log("当前页:", pagination.setPage(5))
console.log("下一页:", pagination.getNextPage())
console.log("上一页:", pagination.getPrevPage())
console.log("第一页:", pagination.getFirstPage())
console.log("最后一页:", pagination.getLastPage())
console.log("周围页码:", pagination.getPagesAround(2))
```

### URL 比较与规范化

```javascript
const { URL } = require("url")

// 规范化 URL（移除默认端口、排序查询参数等）
function normalizeURL(urlString) {
  const url = new URL(urlString)
  
  // 移除默认端口
  const defaultPorts = { "http:": "80", "https:": "443", "ftp:": "21" }
  if (url.port === defaultPorts[url.protocol]) {
    url.port = ""
  }
  
  // 规范化路径（移除尾部斜杠，除了根路径）
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1)
  }
  
  // 排序查询参数
  url.searchParams.sort()
  
  // 移除片段标识符（可选）
  url.hash = ""
  
  return url.toString()
}

console.log(normalizeURL("https://example.com:443/path/?b=2&a=1#section"))
// https://example.com/path?a=1&b=2

// 比较 URL 是否相同（忽略参数顺序）
function areURLsEqual(url1, url2) {
  const normalized1 = normalizeURL(url1)
  const normalized2 = normalizeURL(url2)
  return normalized1 === normalized2
}

console.log(areURLsEqual(
  "https://example.com?a=1&b=2",
  "https://example.com?b=2&a=1"
)) // true
```

### 提取 URL 参数为对象

```javascript
const { URL } = require("url")

// 提取所有查询参数为对象
function getQueryParams(urlString) {
  const url = new URL(urlString)
  const params = {}
  
  for (const [key, value] of url.searchParams) {
    // 处理重复键
    if (params[key]) {
      if (Array.isArray(params[key])) {
        params[key].push(value)
      } else {
        params[key] = [params[key], value]
      }
    } else {
      params[key] = value
    }
  }
  
  return params
}

const url = "https://example.com/search?q=nodejs&tags=js&tags=node&page=1"
const params = getQueryParams(url)
console.log(params)
// { q: "nodejs", tags: ["js", "node"], page: "1" }

// 类型转换
function getQueryParamsWithTypes(urlString) {
  const url = new URL(urlString)
  const params = {}
  
  for (const [key, value] of url.searchParams) {
    // 自动类型推断
    if (value === "true") {
      params[key] = true
    } else if (value === "false") {
      params[key] = false
    } else if (value === "null") {
      params[key] = null
    } else if (!isNaN(value) && value !== "") {
      params[key] = Number(value)
    } else {
      params[key] = value
    }
  }
  
  return params
}

const typedParams = getQueryParamsWithTypes(
  "https://example.com?active=true&count=42&name=test"
)
console.log(typedParams)
// { active: true, count: 42, name: "test" }
```

### 构建带签名的 URL

```javascript
const crypto = require("crypto")
const { URL } = require("url")

// 为 URL 添加签名参数（防止篡改）
function signURL(urlString, secretKey, expiresIn = 3600) {
  const url = new URL(urlString)
  
  // 添加过期时间戳
  const expires = Math.floor(Date.now() / 1000) + expiresIn
  url.searchParams.set("expires", expires.toString())
  
  // 生成签名
  const dataToSign = `${url.pathname}?${url.searchParams.toString()}`
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(dataToSign)
    .digest("hex")
  
  url.searchParams.set("signature", signature)
  
  return url.toString()
}

// 验证 URL 签名
function verifyURL(urlString, secretKey) {
  const url = new URL(urlString)
  
  const signature = url.searchParams.get("signature")
  const expires = parseInt(url.searchParams.get("expires"))
  
  if (!signature || !expires) {
    return { valid: false, reason: "Missing signature or expires" }
  }
  
  // 检查是否过期
  if (Date.now() / 1000 > expires) {
    return { valid: false, reason: "URL expired" }
  }
  
  // 验证签名
  url.searchParams.delete("signature")
  const dataToSign = `${url.pathname}?${url.searchParams.toString()}`
  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(dataToSign)
    .digest("hex")
  
  if (signature !== expectedSignature) {
    return { valid: false, reason: "Invalid signature" }
  }
  
  return { valid: true }
}

// 使用示例
const secretKey = "my-secret-key"
const signedURL = signURL(
  "https://example.com/download/file.pdf?user=123",
  secretKey,
  300 // 5分钟有效期
)

console.log("签名 URL:", signedURL)

const verification = verifyURL(signedURL, secretKey)
console.log("验证结果:", verification)
// { valid: true }
```

## 错误处理

### URL 解析错误

```javascript
const { URL } = require("url")

// ✅ 正确：捕获 URL 构造错误
function parseURL(urlString) {
  try {
    const url = new URL(urlString)
    return { success: true, url }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

console.log(parseURL("https://example.com"))
// { success: true, url: URL {} }

console.log(parseURL("not-a-valid-url"))
// { success: false, error: "Invalid URL" }

// ✅ 正确：验证用户输入的 URL
function validateUserURL(input) {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "URL must be a string" }
  }
  
  try {
    const url = new URL(input)
    
    // 仅允许特定协议
    const allowedProtocols = ["http:", "https:"]
    if (!allowedProtocols.includes(url.protocol)) {
      return { valid: false, error: "Only HTTP and HTTPS are allowed" }
    }
    
    return { valid: true, url }
  } catch (err) {
    return { valid: false, error: "Invalid URL format" }
  }
}

const result = validateUserURL("ftp://malicious.com")
console.log(result)
// { valid: false, error: "Only HTTP and HTTPS are allowed" }
```

### 查询参数错误处理

```javascript
const { URL, URLSearchParams } = require("url")

// ✅ 正确：安全地获取查询参数
function safeGetParam(urlString, paramName) {
  try {
    const url = new URL(urlString)
    const value = url.searchParams.get(paramName)
    return value !== null ? value : undefined
  } catch (err) {
    console.error("URL 解析失败:", err.message)
    return undefined
  }
}

const value = safeGetParam("https://example.com?name=test", "name")
console.log(value) // "test"

// ✅ 正确：类型安全的参数转换
function getNumberParam(url, paramName, defaultValue = 0) {
  const value = url.searchParams.get(paramName)
  if (value === null) return defaultValue
  
  const num = parseInt(value, 10)
  return isNaN(num) ? defaultValue : num
}

const url = new URL("https://example.com?page=2&limit=invalid")
console.log(getNumberParam(url, "page", 1)) // 2
console.log(getNumberParam(url, "limit", 10)) // 10（默认值，因为"invalid"不是数字）
console.log(getNumberParam(url, "offset", 0)) // 0（参数不存在）
```

## 安全性考虑

### 防止 URL 注入攻击

```javascript
const { URL } = require("url")

// ❌ 危险：直接拼接用户输入
function buildDangerousURL(basePath, userInput) {
  return `https://example.com/${basePath}?q=${userInput}`
}

// ✅ 安全：使用 URL 构造函数自动编码
function buildSafeURL(basePath, userInput) {
  const url = new URL(basePath, "https://example.com")
  url.searchParams.set("q", userInput)
  return url.toString()
}

const userInput = "test<script>alert('xss')</script>"
const safeURL = buildSafeURL("search", userInput)
console.log(safeURL)
// https://example.com/search?q=test%3Cscript%3Ealert('xss')%3C%2Fscript%3E

// ✅ 安全：限制重定向 URL
function isSafeRedirect(urlString, allowedDomains) {
  try {
    const url = new URL(urlString)
    
    // 检查协议
    if (url.protocol !== "https:") {
      return false
    }
    
    // 检查域名白名单
    return allowedDomains.some(domain => 
      url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    )
  } catch (err) {
    return false
  }
}

const allowedDomains = ["example.com", "trusted.com"]
console.log(isSafeRedirect("https://example.com/page", allowedDomains)) // true
console.log(isSafeRedirect("https://malicious.com/page", allowedDomains)) // false
console.log(isSafeRedirect("http://example.com/page", allowedDomains)) // false
```

### 防止 SSRF（服务器端请求伪造）

```javascript
const { URL } = require("url")

// 验证 URL 不指向内部资源
function isInternalURL(urlString) {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname
    
    // 检查是否为内部 IP 或域名
    const internalPatterns = [
      /^localhost$/i,
      /^127\.\d+\.\d+\.\d+$/,
      /^10\.\d+\.\d+\.\d+$/,
      /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
      /^192\.168\.\d+\.\d+$/,
      /^0\.0\.0\.0$/,
      /\.local$/i,
      /\.internal$/i
    ]
    
    return internalPatterns.some(pattern => pattern.test(hostname))
  } catch (err) {
    return true // 解析失败视为内部 URL
  }
}

function validateExternalURL(urlString) {
  if (isInternalURL(urlString)) {
    throw new Error("Access to internal URLs is not allowed")
  }
  
  const url = new URL(urlString)
  
  // 只允许 HTTP 和 HTTPS
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS protocols are allowed")
  }
  
  return url
}

// 使用示例
try {
  validateExternalURL("http://localhost/admin")
} catch (err) {
  console.error(err.message) // Access to internal URLs is not allowed
}

try {
  validateExternalURL("https://example.com/api")
} catch (err) {
  console.error(err.message) // 不会执行
}
```

### 敏感信息处理

```javascript
const { URL } = require("url")

// ✅ 正确：移除 URL 中的敏感信息
function sanitizeURL(urlString) {
  const url = new URL(urlString)
  
  // 移除认证信息
  url.username = ""
  url.password = ""
  
  // 移除敏感查询参数
  const sensitiveParams = ["token", "key", "secret", "password", "auth"]
  sensitiveParams.forEach(param => url.searchParams.delete(param))
  
  return url.toString()
}

const urlWithCredentials = "https://user:pass123@example.com/api?token=abc123&id=1"
const sanitized = sanitizeURL(urlWithCredentials)
console.log(sanitized)
// https://example.com/api?id=1

// ✅ 正确：记录日志时隐藏敏感信息
function logURLRequest(urlString) {
  const sanitized = sanitizeURL(urlString)
  console.log(`Request to: ${sanitized}`)
}

logURLRequest("https://api.example.com/data?api_key=secret123&user=john")
// Request to: https://api.example.com/data?user=john
```

## 性能优化

### 缓存 URL 对象

```javascript
const { URL } = require("url")

// ❌ 低效：重复解析相同的 URL
function processRequest(urlString) {
  const url1 = new URL(urlString) // 第一次解析
  const url2 = new URL(urlString) // 第二次解析
  // ...
}

// ✅ 高效：缓存 URL 对象
const urlCache = new Map()

function parseURLCached(urlString) {
  if (urlCache.has(urlString)) {
    return urlCache.get(urlString)
  }
  
  const url = new URL(urlString)
  urlCache.set(urlString, url)
  
  // 限制缓存大小
  if (urlCache.size > 1000) {
    const firstKey = urlCache.keys().next().value
    urlCache.delete(firstKey)
  }
  
  return url
}
```

### 批量操作优化

```javascript
const { URL, URLSearchParams } = require("url")

// ✅ 高效：批量设置查询参数
function buildURLWithParams(baseURL, params) {
  const url = new URL(baseURL)
  
  // 使用 Object.entries 比 for...in 更快
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, value.toString())
    }
  })
  
  return url.toString()
}

// ✅ 高效：从对象创建 URLSearchParams
function createSearchParams(params) {
  // 直接从对象创建比逐个 append 更快
  return new URLSearchParams(params)
}

const params = { a: "1", b: "2", c: "3", d: "4" }
const searchParams = createSearchParams(params)
console.log(searchParams.toString()) // "a=1&b=2&c=3&d=4"
```

### 避免不必要的转换

```javascript
const { URL } = require("url")

// ❌ 低效：多次转换
function processURLInefficient(urlString) {
  const url = new URL(urlString)
  const urlStr = url.toString() // 转换为字符串
  const url2 = new URL(urlStr)  // 再次解析
  return url2.href
}

// ✅ 高效：直接使用 URL 对象
function processURLEfficient(urlString) {
  const url = new URL(urlString)
  // 直接操作 URL 对象
  return url.href
}
```

## 常见问题与解决方案

### Q1: URL 和 URI 有什么区别？

```javascript
// URI（统一资源标识符）是更广泛的概念
// URL（统一资源定位符）是 URI 的一种，提供了资源的访问方式

// 示例：
// URL: https://example.com/page.html（包含访问方式）
// URI: urn:isbn:0451450523（仅标识资源，不包含访问方式）

// Node.js 的 URL 模块主要处理 URL
const { URL } = require("url")
const url = new URL("https://example.com/page.html")
console.log(url.href) // "https://example.com/page.html"
```

### Q2: 如何处理中文和特殊字符？

```javascript
const { URL, URLSearchParams } = require("url")

// ✅ 正确：URL 构造函数自动编码
const url1 = new URL("https://example.com/search")
url1.searchParams.set("q", "你好 世界")
console.log(url1.href)
// https://example.com/search?q=%E4%BD%A0%E5%A5%BD%20%E4%B8%96%E7%95%8C

// ✅ 手动编码路径中的中文
const chinesePath = "文件/目录"
const encodedPath = chinesePath.split("/").map(encodeURIComponent).join("/")
const url2 = new URL(`https://example.com/${encodedPath}`)
console.log(url2.href)
// https://example.com/%E6%96%87%E4%BB%B6/%E7%9B%AE%E5%BD%95

// ✅ 解码
const decoded = decodeURIComponent("%E4%BD%A0%E5%A5%BD")
console.log(decoded) // "你好"
```

### Q3: 如何处理空格？+ 还是 %20？

```javascript
const { URL, URLSearchParams } = require("url")

// 在查询字符串中，URLSearchParams 使用 +
const params = new URLSearchParams()
params.set("q", "hello world")
console.log(params.toString()) // "q=hello+world"

// 在路径中，URL 构造函数使用 %20
const url = new URL("https://example.com/path with spaces")
console.log(url.pathname) // "/path%20with%20spaces"

// 解码时要注意区别
console.log(decodeURIComponent("hello+world")) // "hello+world"（不处理 +）
console.log(decodeURIComponent("hello%20world")) // "hello world"

// URLSearchParams 会正确处理
console.log(new URLSearchParams("q=hello+world").get("q")) // "hello world"
```

### Q4: 如何判断两个 URL 是否相同？

```javascript
const { URL } = require("url")

function areURLsEqual(url1, url2) {
  try {
    const u1 = new URL(url1)
    const u2 = new URL(url2)
    
    // 规范化比较
    // 1. 排序查询参数
    u1.searchParams.sort()
    u2.searchParams.sort()
    
    // 2. 移除默认端口
    const defaultPorts = { "http:": "80", "https:": "443" }
    if (u1.port === defaultPorts[u1.protocol]) u1.port = ""
    if (u2.port === defaultPorts[u2.protocol]) u2.port = ""
    
    // 3. 规范化路径（可选）
    if (u1.pathname !== "/" && u1.pathname.endsWith("/")) {
      u1.pathname = u1.pathname.slice(0, -1)
    }
    if (u2.pathname !== "/" && u2.pathname.endsWith("/")) {
      u2.pathname = u2.pathname.slice(0, -1)
    }
    
    return u1.href === u2.href
  } catch (err) {
    return false
  }
}

console.log(areURLsEqual(
  "https://example.com/page?a=1&b=2",
  "https://example.com/page?b=2&a=1"
)) // true

console.log(areURLsEqual(
  "https://example.com:443/page",
  "https://example.com/page"
)) // true
```

### Q5: 如何从 URL 中提取域名和子域名？

```javascript
const { URL } = require("url")

function parseDomain(urlString) {
  const url = new URL(urlString)
  const hostname = url.hostname
  
  const parts = hostname.split(".")
  const length = parts.length
  
  // 简单处理（不考虑特殊情况如 .co.uk）
  if (length >= 2) {
    return {
      hostname,
      subdomain: length > 2 ? parts.slice(0, -2).join(".") : null,
      domain: parts.slice(-2).join("."),
      tld: parts[length - 1]
    }
  }
  
  return { hostname }
}

console.log(parseDomain("https://www.example.com/page"))
// { hostname: "www.example.com", subdomain: "www", domain: "example.com", tld: "com" }

console.log(parseDomain("https://blog.sub.example.co.uk"))
// { hostname: "blog.sub.example.co.uk", subdomain: "blog.sub", domain: "example.co", tld: "uk" }
```

### Q6: 如何处理相对 URL？

```javascript
const { URL } = require("url")

// ✅ 使用基础 URL
const baseURL = "https://example.com/docs/guide/"
const relativeURL = "../api/rest.html"

const absoluteURL = new URL(relativeURL, baseURL)
console.log(absoluteURL.href)
// https://example.com/docs/api/rest.html

// ✅ 从 HTML 页面解析相对 URL
function resolveURL(basePageURL, linkHref) {
  const base = new URL(basePageURL)
  const absolute = new URL(linkHref, base)
  return absolute.href
}

const pageURL = "https://example.com/docs/current/page.html"
console.log(resolveURL(pageURL, "./next.html"))
// https://example.com/docs/current/next.html

console.log(resolveURL(pageURL, "/absolute"))
// https://example.com/absolute

console.log(resolveURL(pageURL, "https://other.com/page"))
// https://other.com/page
```

### Q7: 如何合并两个 URL 的查询参数？

```javascript
const { URL, URLSearchParams } = require("url")

function mergeQueryParams(url1, url2) {
  const u1 = new URL(url1)
  const u2 = new URL(url2)
  
  // 将 u2 的参数合并到 u1
  for (const [key, value] of u2.searchParams) {
    u1.searchParams.set(key, value)
  }
  
  return u1.toString()
}

console.log(mergeQueryParams(
  "https://example.com?a=1&b=2",
  "https://other.com?c=3&d=4"
))
// https://example.com/?a=1&b=2&c=3&d=4

// 保留重复参数
function mergeQueryParamsKeepDuplicates(url1, url2) {
  const u1 = new URL(url1)
  const u2 = new URL(url2)
  
  for (const [key, value] of u2.searchParams) {
    u1.searchParams.append(key, value)
  }
  
  return u1.toString()
}

console.log(mergeQueryParamsKeepDuplicates(
  "https://example.com?tag=a",
  "https://other.com?tag=b"
))
// https://example.com/?tag=a&tag=b
```

### Q8: 如何获取 URL 中的所有参数名？

```javascript
const { URL } = require("url")

function getParamNames(urlString) {
  const url = new URL(urlString)
  return Array.from(new Set(url.searchParams.keys()))
}

const url = "https://example.com/search?q=nodejs&page=1&sort=date&q=test"
console.log(getParamNames(url))
// ["q", "page", "sort"]

// 获取参数数量
function getParamCount(urlString) {
  const url = new URL(urlString)
  return Array.from(url.searchParams).length
}

console.log(getParamCount(url)) // 4（包括重复的 q）
```

### Q9: 如何移除 URL 中的特定参数？

```javascript
const { URL } = require("url")

function removeParams(urlString, paramsToRemove) {
  const url = new URL(urlString)
  
  paramsToRemove.forEach(param => {
    url.searchParams.delete(param)
  })
  
  return url.toString()
}

const original = "https://example.com/search?q=test&page=1&token=abc123"
const cleaned = removeParams(original, ["token", "session"])
console.log(cleaned)
// https://example.com/search?q=test&page=1

// 移除所有参数
function removeAllParams(urlString) {
  const url = new URL(urlString)
  url.search = ""
  return url.toString()
}

console.log(removeAllParams(original))
// https://example.com/search
```

### Q10: 如何处理 URL 中的端口？

```javascript
const { URL } = require("url")

// 默认端口会被省略
const url1 = new URL("https://example.com:443/path")
console.log(url1.port) // ""（空字符串，因为 443 是 HTTPS 的默认端口）

const url2 = new URL("https://example.com:8443/path")
console.log(url2.port) // "8443"

// 获取实际端口（包括默认值）
function getActualPort(url) {
  const defaultPorts = {
    "http:": "80",
    "https:": "443",
    "ftp:": "21"
  }
  
  return url.port || defaultPorts[url.protocol] || ""
}

const url3 = new URL("https://example.com/path")
console.log(getActualPort(url3)) // "443"

// 设置端口
const url4 = new URL("https://example.com")
url4.port = "3000"
console.log(url4.href) // "https://example.com:3000/"

// 设置为默认端口会自动省略
url4.port = "443"
console.log(url4.href) // "https://example.com/"
```

## 总结

### 核心要点

1. **使用现代 API**：优先使用 WHATWG `URL` 和 `URLSearchParams`，避免使用 Legacy API 和 `querystring`
2. **验证外部输入**：始终验证用户提供的 URL，防止注入攻击和 SSRF
3. **正确处理编码**：让 URL 和 URLSearchParams 自动处理编码，避免手动编码导致的双重编码
4. **安全性考虑**：验证协议、域名，限制重定向，过滤敏感信息
5. **性能优化**：缓存 URL 对象，批量处理参数，避免不必要的转换

### API 选择指南

| 场景                     | 推荐使用的 API                    |
| ------------------------ | --------------------------------- |
| 解析 URL                 | `new URL(urlString)`              |
| 修改 URL                 | `URL` 对象的属性                  |
| 处理查询参数             | `URLSearchParams`                 |
| 解析相对 URL             | `new URL(relative, base)`         |
| 文件路径转 URL           | `url.pathToFileURL()`             |
| URL 转文件路径           | `url.fileURLToPath()`             |
| 验证 URL 格式            | `try { new URL() } catch`         |
| 编码/解码                | `encodeURIComponent`/`decodeURIComponent` |

### 最佳实践清单

- ✅ 使用 WHATWG URL API 而非 Legacy API
- ✅ 使用 URLSearchParams 而非 querystring 模块
- ✅ 始终验证外部 URL 输入
- ✅ 让 URL 构造函数自动处理编码
- ✅ 使用 try-catch 捕获 URL 解析错误
- ✅ 记录日志时移除敏感信息
- ✅ 验证协议和域名白名单
- ✅ 使用类型安全的参数获取函数
- ✅ 缓存频繁使用的 URL 对象
- ✅ 使用配置对象管理基础 URL

### 何时使用什么

| 模块/API            | 用途                           | 推荐程度 |
| ------------------- | ------------------------------ | -------- |
| `URL`               | 解析和构建 URL                 | ⭐⭐⭐⭐⭐    |
| `URLSearchParams`   | 处理查询参数                   | ⭐⭐⭐⭐⭐    |
| `url.pathToFileURL` | 文件路径转 URL                 | ⭐⭐⭐⭐⭐    |
| `url.fileURLToPath` | URL 转文件路径                 | ⭐⭐⭐⭐⭐    |
| `url.parse`         | 解析 URL（Legacy）             | ⭐⭐       |
| `url.format`        | 格式化 URL（Legacy）           | ⭐⭐       |
| `url.resolve`       | 解析相对 URL（Legacy）         | ⭐⭐       |
| `querystring`       | 查询字符串处理（已弃用）       | ⭐        |

## querystring 序列化实战

### 简单 URL 参数解析

```javascript
const qs = require('querystring')

qs.parse('utm_campaign=bd&utm_source=web&utm_medium=link')
// { utm_campaign: 'bd', utm_source: 'web', utm_medium: 'link' }

// 自定义分隔符
qs.stringify({ utm_campaign: 'bd', utm_source: 'web', utm_medium: 'link' }, '@@')
// utm_campaign=bd@@utm_source=web@@utm_medium=link
```

### 复杂 URL 的多级参数解析

实际业务中的 URL 参数可能包含嵌套的编码数据（如二跳地址），需要逐级解码与解析：

```javascript
const qs = require('querystring')

// 第一级：解析完整 URL 参数
qs.parse('https://srd.simba.taobao.com/rd?w=mmp4ptest&f=https%3A%2F%2Fre.taobao.com%2Fauction%3Fkeyword%3D%26catid%3D50050587%26refpid%3Dtt_26632537_19294801_67276517%26crtid%3D1189307289%26itemid%3D572699375755%26adgrid%3D1016912923%26elemtid%3D1%26clk1info%3D1210788191%2C64%2CdPGasl8cWaKf4G0xY6c%252BLZZBixWUMilHWql2oFy2mXu521tWpp6T7wwyX7D1fRla%26sbid%3D%3B%3B%2C%3B31234%26nick%3D%25%5Cu6dd8%5Cu5b9d%5Cu6635%5Cu79f0%26qtype%3D5%26tagvalue%3D6459423679025591774_0_100%26isf%3D0&k=eb305a7ca09eeebf&pvid=0a67267d00005bd5b1c04ab300826baf&p=tt_26632537_19294801_67276517')
// 解析出 w/f/k/pvid/p 这 5 个参数
// 其中 f 参数是一个二跳地址，内含 % 编码

// 第二级：对 f 参数值进行解码
qs.unescape('keyword=&catid=50050587&refpid=tt_26632537_19294801_67276517&crtid=1189307289&itemid=572699375755&adgrid=1016912923&elemtid=1&clk1info=1210788191,64,dPGasl8cWaKf4G0xY6c+LZZBixWUMilHWql2oFy2mXu521tWpp6T7wwyX7D1fRla&sbid=;;,;31234&nick=%\\u6dd8\\u5b9d\\u6635\\u79f0&qtype=5&tagvalue=6459423679025591774_0_100&isf=0')

// 第三级：对解码后的参数串再次解析
qs.parse('keyword=&catid=50050587&refpid=tt_26632537_19294801_67276517&crtid=1189307289&itemid=572699375755&adgrid=1016912923&elemtid=1&clk1info=1210788191,64,dPGasl8cWaKf4G0xY6c LZZBixWUMilHWql2oFy2mXu521tWpp6T7wwyX7D1fRla&sbid=;;,;31234&nick=%\\u6dd8\\u5b9d\\u6635\\u79f0&qtype=5&tagvalue=6459423679025591774_0_100&isf=0')
// 解析出 keyword/catid/refpid/crtid/itemid/adgrid/elemtid/clk1info/sbid/nick/qtype/tagvalue/isf 等参数
```

> 通过逐级解码与解析，可以从复杂的 URL 中提取嵌套的参数结构。例如 `itemid` 可定位具体商品，`nick` 中的 UTF-8 编码可还原为用户昵称。这种多级参数结构使得单个 URL 可以承载商品定位、用户信息透传、类目信息和流量跟踪等多种业务逻辑。

### 编解码实战

```javascript
const qs = require('querystring')

// 编码：中文和特殊字符转义
qs.escape('a=开 心')
// a%3D%E5%BC%80%20%E5%BF%83

// 解码：还原原始字符串
qs.unescape('a%3D%20%E4%B8%8D')
// a= 不
```

> `querystring.escape` 和 `querystring.unescape` 已标记为废弃，现代项目推荐使用 `encodeURIComponent` 和 `decodeURIComponent`，或直接使用 `URLSearchParams` 的自动编解码能力。
