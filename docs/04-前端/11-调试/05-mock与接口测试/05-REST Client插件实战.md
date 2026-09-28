---
title: REST Client 插件实战
description: "讲解 VS Code REST Client 插件的 .http 请求语法、环境变量与 dotenv 配置、curl 互转与代码生成,并给出项目级 .http 文件组织和 Git 团队协作方案。"
keywords: [mock与接口测试, REST, Client]
category: 调试
tags: [REST Client, VSCode, 接口测试]
---

# REST Client 插件实战
---

## 一、为什么选择 REST Client

### 与 Postman 的对比 

#### 概念说明

`REST Client` 是 VS Code 扩展市场中的轻量级接口测试插件，与 Postman 相比：

| 特性 | Postman | REST Client |
|------|---------|-------------|
| **安装方式** | 桌面客户端 | VS Code 插件 |
| **体积** | 较大(约 200MB) | 轻量(约 1MB) |
| **上下文切换** | 需切换应用 | 编辑器内调试 |
| **生产环境** | 不易安装 |  轻松安装 |
| **文件管理** | 云端同步 |  本地文件 |
| **学习成本** | 中等 | 低 |

#### 适用场景 

**REST Client 更适合**：
- 生产服务器临时调试
- 开发代码与接口测试同屏操作
- 团队共享 `.http` 文件
- Git 管理接口文档
- 快速验证接口响应

**Postman 更适合**：
- 复杂自动化测试
- Mock Server 需求
- 定时监控接口
- 团队云端协作
- 图形化测试报告

---

## 二、快速上手

### 安装插件 

#### 安装步骤

1. 打开 VS Code 扩展市场
2. 搜索 `REST Client`
3. 点击安装（作者：Huachao Mao）

#### 创建第一个请求

创建文件：`request.http`

```http
GET http://localhost:3000/db
```

**使用方式**：
- 文件上方出现 `Send Request` 按钮
- 点击发送请求
- 右侧显示响应结果（高亮显示）

---

## 三、核心功能详解

### 3.1 基本请求语法 

#### GET 请求

```http
# 查询数据库
GET http://localhost:3000/db
```

#### POST 请求

```http
### 新增数据
POST http://localhost:3000/home
Content-Type: application/json

{
  "message": "from rest client"
}
```

**语法要点**：
- `###` 分隔多个请求（必须）
- 空行分隔 Headers 和 Body
- 请求方法可省略（默认 GET）

---

### 3.2 GET 参数查询 

#### 分页参数

```http
### 分页查询
GET http://localhost:3000/hello?page=2&size=2
```

**多行参数写法**：

```http
### 多行参数
GET http://localhost:3000/hello?page=2
  &size=2
  &sort=id
```

**注意事项**：
- 每行一个参数
- 使用 `&` 连接
- 支持自动补全

---

### 3.3 Headers 配置 

#### 常用 Headers

```http
### 带 Headers 的请求
POST http://localhost:3000/api/user
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Custom-Header: custom-value

{
  "name": "张三",
  "email": "zhangsan@example.com"
}
```

**语法规则**：
- Header 名: 值
- 多个 Headers 逐行书写
- 空行分隔 Headers 和 Body

---

## 四、高级功能

### 4.1 环境变量管理 

#### 文件内变量

```http
@host = http://localhost:3000
@token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9

### 使用变量
GET {{host}}/db
Authorization: Bearer {{token}}
```

**注意**：
- 变量定义在文件顶部
- 使用 `@变量名 = 值` 定义
- 变量全局生效，注意避免覆盖

---

#### Prompt 变量（敏感数据）

通过 `# @prompt 变量名 说明` 声明运行时输入变量，发送请求时会弹出输入框（值不会被存储）：

```http
### 输入密码场景
# @prompt password 请输入密码

POST {{host}}/api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "{{password}}"
}
```

**使用场景**：
- 密码输入
- Token 输入
- 敏感数据

---

#### .env 文件变量

创建 `.env` 文件：

```env
BASE_URL=http://localhost:3000
API_KEY=your-api-key-here
```

在 `.http` 文件中使用：

```http
### 读取 .env 变量
GET {{$dotenv BASE_URL}}/api/data
X-API-Key: {{$dotenv API_KEY}}
```

**语法**：`{{$dotenv 变量名}}`

---



### 4.2 curl 命令互转 

#### HTTP 转 curl

**操作步骤**：
1. 右键点击请求
2. 选择 `Copy Request As cURL`
3. 粘贴到终端

**生成示例**：

```bash
curl --request GET \
  --url http://localhost:3000/db \
  --header 'Authorization: Bearer token123'
```

---

#### curl 转 HTTP

**操作步骤**：
1. 粘贴 curl 命令到 `.http` 文件
2. REST Client 可直接识别并运行 curl 命令（支持 `-X`、`-H`、`-d` 等常用参数）

**示例**：

```bash
# 原始 curl
curl -X POST http://localhost:3000/home -H "Content-Type: application/json" -d '{"message":"test"}'
```

等价的 `.http` 写法：

```http
POST http://localhost:3000/home
Content-Type: application/json

{"message":"test"}
```

---

### 4.3 代码生成（Code Snippets）

#### 生成步骤

1. 选中请求代码
2. 打开命令面板（Cmd+Shift+P）
3. 输入 `REST Client: Generate Code Snippet`
4. 选择目标语言

---

#### 支持的语言

| 语言 | 框架/库 |
|------|---------|
| **JavaScript** | fetch, axios, jQuery |
| **Python** | requests, http.client |
| **Java** | OkHttp, Unirest |
| **Go** | native, req |
| **PHP** | curl, guzzle |
| **Ruby** | net/http |
| **C#** | HttpClient, RestSharp |

---

#### 示例：生成 Python 代码

**原始请求**：

```http
GET http://localhost:3000/hello?page=1&size=2
```

**生成 Python 代码**：

```python
import http.client

conn = http.client.HTTPConnection("localhost", 3000)

payload = ''

headers = {}

conn.request("GET", "/hello?page=1&size=2", payload, headers)

res = conn.getresponse()
data = res.read()

print(data.decode("utf-8"))
```

---

### 4.4 历史记录与重放 

#### 查看历史请求

**操作步骤**：
1. 打开命令面板（Cmd+Shift+P）
2. 输入 `REST Client: Request History`
3. 选择历史请求
4. 点击重放

**特点**：
- 自动保存请求历史
- 快速重放请求
- 适合重复调试

---

### 4.5 请求导航 

#### 快速定位请求

**快捷键**：
- Mac: `Cmd+Shift+O`
- Windows/Linux: `Ctrl+Shift+O`

**功能**：
- 快速在多个请求间跳转
- 显示所有请求列表
- 显示变量定义

---

## 五、完整实战案例

### 5.1 完整的 API 测试文件 

创建 `api-test.http`：

```http
# ====================
# 环境变量配置
# ====================
@baseUrl = http://localhost:3000
# 真实 Token 建议用 Prompt 变量(见 4.1)或环境变量注入,不要明文提交
@token = your-jwt-token

# ====================
# 用户相关接口
# ====================

### 用户登录
POST {{baseUrl}}/api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "123456"
}

### 获取用户列表
GET {{baseUrl}}/api/users
Authorization: Bearer {{token}}

### 查询用户详情
GET {{baseUrl}}/api/users/1
Authorization: Bearer {{token}}

### 新增用户
POST {{baseUrl}}/api/users
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "name": "张三",
  "email": "zhangsan@example.com",
  "age": 28
}

### 更新用户
PUT {{baseUrl}}/api/users/1
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "name": "李四",
  "age": 30
}

### 删除用户
DELETE {{baseUrl}}/api/users/1
Authorization: Bearer {{token}}

# ====================
# 课程相关接口
# ====================

### 课程列表（分页）
GET {{baseUrl}}/api/courses?page=1
  &size=10
  &sort=createdAt

### 课程详情
GET {{baseUrl}}/api/courses/101

### 搜索课程
GET {{baseUrl}}/api/courses/search?keyword=Vue

# ====================
# 文件上传
# ====================

### 上传头像
POST {{baseUrl}}/api/upload/avatar
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="avatar.jpg"
Content-Type: image/jpeg

< ./avatar.jpg
------WebKitFormBoundary--
```

---



### 5.2 项目集成方案 

#### 目录结构

```
project/
├── .env              # 环境变量
├── api/
│   ├── auth.http     # 认证接口
│   ├── user.http     # 用户接口
│   ├── course.http   # 课程接口
│   └── upload.http   # 上传接口
└── docs/
    └── api-guide.md  # 接口文档说明
```

---

#### .env 配置

```env
# 开发环境
BASE_URL=http://localhost:3000
API_VERSION=v1

# 测试环境
# BASE_URL=http://test.example.com

# 生产环境
# BASE_URL=https://api.example.com
```

---

#### Git 管理

`.gitignore` 排除敏感信息：

```gitignore
# 排除敏感变量
.env.local
.env.*.local

# 排除临时文件
*.http.tmp
```

---

## 六、最佳实践

### 6.1 文件组织 

#### 按模块分离

```
api/
├── auth.http      # 认证模块
├── user.http      # 用户模块
├── product.http   # 商品模块
├── order.http     # 订单模块
└── common.http    # 公共变量
```

#### 公共变量文件

`common.http`：

```http
@baseUrl = http://localhost:3000
@apiVersion = v1
@contentType = application/json

# 可在其他文件引用
```

---

### 6.2 注释规范 

```http
# ====================
# 用户接口模块
# 功能：用户 CRUD 操作
# 作者：前端团队
# 更新时间：2026-03-08
# ====================

### 接口说明：用户登录
# 请求参数：
# - username: 用户名（必填）
# - password: 密码（必填）
# 返回示例：
# {
#   "code": 0,
#   "token": "eyJhbGc..."
# }
POST {{baseUrl}}/api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "123456"
}
```

---

### 6.3 环境管理 

#### 多环境配置

创建多个环境文件：

```env
# .env.dev
BASE_URL=http://localhost:3000

# .env.test
BASE_URL=http://test.example.com

# .env.prod
BASE_URL=https://api.example.com
```

**切换环境**：

修改 `.env` 引用：

```bash
# 开发环境
ln -s .env.dev .env

# 测试环境
ln -s .env.test .env

# 生产环境
ln -s .env.prod .env
```

---



### 6.4 团队协作 

#### 共享接口文件

**优势**：
-  接口定义纳入版本控制
-  团队成员统一接口标准
-  新成员快速上手
-  接口文档即代码

**规范**：
1. 统一 `.http` 文件命名规范
2. 统一变量命名规范
3. 定期同步接口变更
4. 敏感信息使用 `.env.local` 管理

---

## 七、常见问题与解决方案

| 问题 | 原因分析 | 解决方案 |
|------|----------|----------|
| **变量未生效** | 变量未定义或作用域错误 | 检查变量定义位置和引用语法 |
| **请求超时** | 网络问题或服务器未启动 | 检查网络连接和服务状态 |
| **CORS 错误** | 跨域限制 | 使用代理或后端配置 CORS |
| **HTTPS 证书错误** | 自签名证书 | VS Code 设置忽略证书检查 |
| **文件过长难查找** | 缺少组织 | 按模块分离文件 + 使用注释 |
| **敏感信息泄露** | 提交到 Git | 使用 `.env.local` + `.gitignore` |
| **中文乱码** | 编码问题 | 确保文件 UTF-8 编码 |
| **Body 格式错误** | JSON 格式不规范 | 使用 JSON 校验工具 |

---

## 八、REST Client vs Postman 深度对比

### 功能对比表 

| 功能 | REST Client | Postman |
|------|-------------|---------|
| **接口调试** | 支持 | 支持 |
| **环境变量** | 支持(@变量/.env) | 支持(多环境管理) |
| **代码生成** | 支持 | 支持 |
| **curl 互转** | 支持 | 支持 |
| **历史记录** | 支持 | 支持 |
| **Mock Server** | 不支持 | 支持 |
| **自动化测试** | 不支持 | 支持 |
| **定时监控** | 不支持 | 支持 |
| **团队协作** | Git 协作 | 云端协作 |
| **文件管理** |  本地文件 | 云端存储 |
| **学习成本** | 低 | 中 |
| **安装便捷性** | 极简 | 较繁琐 |

---

### 选型建议 

#### 选择 REST Client，如果：
-  主要在开发环境调试接口
-  希望接口定义纳入版本控制
-  团队小，协作需求简单
-  生产服务器临时调试
-  偏好编辑器内操作

#### 选择 Postman，如果：
-  需要 Mock Server
-  需要自动化测试和监控
-  团队规模大，需要云端协作
-  需要图形化测试报告
-  复杂的接口编排流程

---

## 九、延伸学习资源

### 官方文档
- [REST Client GitHub](https://github.com/Huachao/vscode-restclient)
- [REST Client Wiki](https://github.com/Huachao/vscode-restclient/wiki)

### 相关文章
- [REST Client 使用指南](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
- [HTTP 文件语法规范](https://github.com/Huachao/vscode-restclient#http-language)

### 练习建议
1. 在项目中创建 `api/` 目录，按模块组织 `.http` 文件
2. 练习环境变量配置，实现开发/测试环境切换
3. 尝试将常用 curl 命令转换为 `.http` 文件
4. 生成不同语言的代码片段，对比差异
5. 团队协作：共享 `.http` 文件，统一接口标准

---


