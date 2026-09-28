---
title: Express 实战：用户管理系统
description: 通过完整的实战项目，深入了解 Express 的核心功能。本项目将构建一个具备 CRUD（创建、读取、更新、删除）功能的用户管理系统，涵盖路由、中间件、错误处理、前后端联调、测试与部署等核心概念的实际应用。
keywords: [Node.js, Web框架, Express]
category: Node.js
tags: [Node.js, Web框架]
---







# Express 实战：用户管理系统

通过完整的实战项目，深入了解 Express 的核心功能。本项目将构建一个具备 CRUD（创建、读取、更新、删除）功能的用户管理系统，涵盖路由、中间件、错误处理等核心概念的实际应用。

---

## 项目概述

### 功能需求

| 功能 | HTTP 方法 | 路由 | 说明 |
|------|-----------|------|------|
| 获取用户列表 | GET | `/users` | 返回所有用户 |
| 获取单个用户 | GET | `/users/:id` | 返回指定用户 |
| 创建用户 | POST | `/users` | 新增用户 |
| 更新用户 | PUT | `/users/:id` | 更新用户信息 |
| 删除用户 | DELETE | `/users/:id` | 删除指定用户 |

### 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 后端框架 | Express 4.x | Node.js Web 框架 |
| 数据存储 | JSON 文件 | 简化演示，无需数据库 |
| 前端 | 原生 HTML/CSS/JS | 无框架依赖 |
| 跨域 | cors | 允许跨域请求 |

### 项目架构

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端（浏览器）                        │
│                    public/index.html                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP 请求
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Express 服务器                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   中间件     │  │    路由     │  │     数据访问层       │  │
│  │  cors       │  │  /users     │  │      db.js          │  │
│  │  json       │  │  /users/:id │  │                      │  │
│  │  static     │  │             │  │                      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 文件读写
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       db.json                                │
│                    数据持久化存储                             │
└─────────────────────────────────────────────────────────────┘
```

### 目录结构

```bash
express-crud-demo/
├── app.js                 # 应用入口
├── db.js                  # 数据库操作模块
├── db.json                # 数据存储文件
├── package.json           # 项目配置
└── public/                # 静态资源目录
    ├── index.html         # 主页面
    ├── css/
    │   └── style.css      # 样式文件
    └── js/
        └── app.js         # 前端逻辑
```

---

## 快速开始

### 创建项目

```bash
# 创建项目目录
mkdir express-crud-demo
cd express-crud-demo

# 初始化项目
npm init -y

# 安装依赖
npm install express cors
```

### package.json 配置

```json
{
  "name": "express-crud-demo",
  "version": "1.0.0",
  "description": "Express CRUD Demo",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

---

## 数据层实现

### 数据文件

**db.json**：

```json
{
  "users": [
    { "id": 1, "username": "张三", "age": 25, "email": "zhangsan@example.com" },
    { "id": 2, "username": "李四", "age": 30, "email": "lisi@example.com" },
    { "id": 3, "username": "王五", "age": 28, "email": "wangwu@example.com" }
  ]
}
```

### 数据访问模块

**db.js**：

```javascript
const fs = require("fs").promises
const path = require("path")

const dbPath = path.join(__dirname, "db.json")

/**
 * 读取数据库
 * @returns {Promise<Object>} 数据库对象
 */
async function getDb() {
  try {
    const data = await fs.readFile(dbPath, "utf8")
    return JSON.parse(data)
  } catch (error) {
    // 文件不存在时创建默认数据
    if (error.code === "ENOENT") {
      const defaultData = { users: [] }
      await saveDb(defaultData)
      return defaultData
    }
    throw error
  }
}

/**
 * 保存数据库
 * @param {Object} data - 要保存的数据
 */
async function saveDb(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf8")
}

/**
 * 获取所有用户
 */
async function getUsers() {
  const db = await getDb()
  return db.users
}

/**
 * 根据 ID 获取用户
 * @param {number} id - 用户 ID
 */
async function getUserById(id) {
  const db = await getDb()
  return db.users.find(user => user.id === id)
}

/**
 * 创建用户
 * @param {Object} userData - 用户数据
 */
async function createUser(userData) {
  const db = await getDb()
  const newUser = {
    id: db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
    ...userData,
    createdAt: new Date().toISOString()
  }
  db.users.push(newUser)
  await saveDb(db)
  return newUser
}

/**
 * 更新用户
 * @param {number} id - 用户 ID
 * @param {Object} userData - 更新数据
 */
async function updateUser(id, userData) {
  const db = await getDb()
  const index = db.users.findIndex(user => user.id === id)

  if (index === -1) return null

  db.users[index] = {
    ...db.users[index],
    ...userData,
    updatedAt: new Date().toISOString()
  }

  await saveDb(db)
  return db.users[index]
}

/**
 * 删除用户
 * @param {number} id - 用户 ID
 */
async function deleteUser(id) {
  const db = await getDb()
  const index = db.users.findIndex(user => user.id === id)

  if (index === -1) return false

  db.users.splice(index, 1)
  await saveDb(db)
  return true
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
}
```

---

## 服务端实现

### 应用入口

**app.js**：

```javascript
const express = require("express")
const cors = require("cors")
const path = require("path")
const db = require("./db")

const app = express()
const PORT = process.env.PORT || 3000

// ==================== 中间件配置 ====================

// 跨域支持
app.use(cors())

// JSON 请求体解析
app.use(express.json())

// URL 编码请求体解析
app.use(express.urlencoded({ extended: true }))

// 静态文件托管
app.use(express.static(path.join(__dirname, "public")))

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

// ==================== API 路由 ====================

// 获取所有用户
app.get("/api/users", async (req, res) => {
  try {
    const users = await db.getUsers()
    res.json({
      success: true,
      data: users,
      count: users.length
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 获取单个用户
app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await db.getUserById(Number(req.params.id))

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "用户不存在"
      })
    }

    res.json({
      success: true,
      data: user
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 创建用户
app.post("/api/users", async (req, res) => {
  try {
    const { username, age, email } = req.body

    // 验证必填字段
    if (!username || !age) {
      return res.status(400).json({
        success: false,
        error: "用户名和年龄为必填项"
      })
    }

    // 验证年龄格式
    if (isNaN(age) || age < 0 || age > 150) {
      return res.status(400).json({
        success: false,
        error: "年龄必须是 0-150 之间的数字"
      })
    }

    const newUser = await db.createUser({
      username: username.trim(),
      age: Number(age),
      email: email?.trim() || null
    })

    res.status(201).json({
      success: true,
      data: newUser,
      message: "用户创建成功"
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 更新用户
app.put("/api/users/:id", async (req, res) => {
  try {
    const { username, age, email } = req.body
    const updateData = {}

    if (username) updateData.username = username.trim()
    if (age !== undefined) {
      if (isNaN(age) || age < 0 || age > 150) {
        return res.status(400).json({
          success: false,
          error: "年龄必须是 0-150 之间的数字"
        })
      }
      updateData.age = Number(age)
    }
    if (email !== undefined) updateData.email = email?.trim() || null

    const updatedUser = await db.updateUser(Number(req.params.id), updateData)

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: "用户不存在"
      })
    }

    res.json({
      success: true,
      data: updatedUser,
      message: "用户更新成功"
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 删除用户
app.delete("/api/users/:id", async (req, res) => {
  try {
    const deleted = await db.deleteUser(Number(req.params.id))

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "用户不存在"
      })
    }

    res.status(204).send()
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== 错误处理 ====================

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `路由 ${req.url} 不存在`
  })
})

// 全局错误处理
app.use((err, req, res, next) => {
  console.error("服务器错误:", err)
  res.status(500).json({
    success: false,
    error: "服务器内部错误"
  })
})

// ==================== 启动服务器 ====================

app.listen(PORT, () => {
  console.log(`
┌─────────────────────────────────────────────┐
│  Express 用户管理系统已启动                  │
│  本地地址: http://localhost:${PORT}           │
│  API 地址: http://localhost:${PORT}/api/users │
└─────────────────────────────────────────────┘
  `)
})
```

---

## 前端实现

### 主页面

**public/index.html**：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>用户管理系统</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>用户管理系统</h1>
      <p class="subtitle">Express CRUD Demo</p>
    </header>

    <!-- 表单区域 -->
    <section class="form-section">
      <h2 id="form-title">添加用户</h2>
      <form id="user-form">
        <input type="hidden" id="user-id">
        
        <div class="form-group">
          <label for="username">用户名 <span class="required">*</span></label>
          <input type="text" id="username" placeholder="请输入用户名" required>
        </div>
        
        <div class="form-group">
          <label for="age">年龄 <span class="required">*</span></label>
          <input type="number" id="age" min="0" max="150" placeholder="请输入年龄" required>
        </div>
        
        <div class="form-group">
          <label for="email">邮箱</label>
          <input type="email" id="email" placeholder="请输入邮箱（可选）">
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="submit-btn">添加用户</button>
          <button type="button" class="btn btn-secondary" id="cancel-btn" style="display:none;">取消编辑</button>
        </div>
      </form>
    </section>

    <!-- 用户列表 -->
    <section class="list-section">
      <h2>用户列表 <span id="user-count"></span></h2>
      <div class="search-box">
        <input type="text" id="search-input" placeholder="搜索用户...">
      </div>
      <table id="user-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>年龄</th>
            <th>邮箱</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="user-list">
          <!-- 动态渲染 -->
        </tbody>
      </table>
      <div id="empty-state" class="empty-state" style="display:none;">
        <p>暂无用户数据</p>
      </div>
    </section>
  </div>

  <!-- 加载状态 -->
  <div id="loading" class="loading" style="display:none;">
    <div class="spinner"></div>
    <p>加载中...</p>
  </div>

  <!-- 提示消息 -->
  <div id="toast" class="toast"></div>

  <script src="js/app.js"></script>
</body>
</html>
```

### 样式文件

**public/css/style.css**：

```css
/* 基础样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

/* 头部 */
header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  text-align: center;
}

header h1 {
  font-size: 2rem;
  margin-bottom: 5px;
}

.subtitle {
  opacity: 0.8;
  font-size: 0.9rem;
}

/* 表单区域 */
.form-section {
  padding: 30px;
  border-bottom: 1px solid #eee;
}

.form-section h2 {
  font-size: 1.2rem;
  margin-bottom: 20px;
  color: #333;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.required {
  color: #e74c3c;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-actions {
  margin-top: 20px;
}

/* 按钮 */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 10px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.btn-edit {
  background: #3498db;
  color: white;
  padding: 5px 10px;
  font-size: 0.85rem;
}

.btn-delete {
  background: #e74c3c;
  color: white;
  padding: 5px 10px;
  font-size: 0.85rem;
}

.btn-edit:hover {
  background: #2980b9;
}

.btn-delete:hover {
  background: #c0392b;
}

/* 列表区域 */
.list-section {
  padding: 30px;
}

.list-section h2 {
  font-size: 1.2rem;
  margin-bottom: 15px;
  color: #333;
}

#user-count {
  font-size: 0.9rem;
  color: #888;
  font-weight: normal;
}

.search-box {
  margin-bottom: 15px;
}

.search-box input {
  width: 100%;
  max-width: 300px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

/* 表格 */
table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  background: #f8f9fa;
  font-weight: 600;
  color: #555;
}

tr:hover {
  background: #f8f9fa;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #888;
}

/* 加载状态 */
.loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 提示消息 */
.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.3s;
  z-index: 1001;
}

.toast.show {
  opacity: 1;
  transform: translateY(0);
}

.toast.success {
  background: #27ae60;
}

.toast.error {
  background: #e74c3c;
}

/* 响应式 */
@media (max-width: 600px) {
  .container {
    border-radius: 0;
  }

  header h1 {
    font-size: 1.5rem;
  }

  table {
    font-size: 0.85rem;
  }

  th, td {
    padding: 8px;
  }
}
```

### 前端逻辑

**public/js/app.js**：

```javascript
// API 基础地址
const API_BASE_URL = "/api/users"

// DOM 元素
const userForm = document.getElementById("user-form")
const userIdInput = document.getElementById("user-id")
const usernameInput = document.getElementById("username")
const ageInput = document.getElementById("age")
const emailInput = document.getElementById("email")
const submitBtn = document.getElementById("submit-btn")
const cancelBtn = document.getElementById("cancel-btn")
const formTitle = document.getElementById("form-title")
const userList = document.getElementById("user-list")
const userCount = document.getElementById("user-count")
const emptyState = document.getElementById("empty-state")
const userTable = document.getElementById("user-table")
const searchInput = document.getElementById("search-input")
const loading = document.getElementById("loading")
const toast = document.getElementById("toast")

// 所有用户数据
let allUsers = []

// ==================== 工具函数 ====================

// 显示加载状态
function showLoading() {
  loading.style.display = "flex"
}

function hideLoading() {
  loading.style.display = "none"
}

// 显示提示消息
function showToast(message, type = "success") {
  toast.textContent = message
  toast.className = `toast ${type} show`

  setTimeout(() => {
    toast.className = "toast"
  }, 3000)
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return "-"
  const date = new Date(dateString)
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}

// ==================== API 请求 ====================

// 获取所有用户
async function fetchUsers() {
  try {
    showLoading()
    const response = await fetch(API_BASE_URL)
    const result = await response.json()

    if (result.success) {
      allUsers = result.data
      renderUsers(allUsers)
    } else {
      showToast(result.error, "error")
    }
  } catch (error) {
    showToast("获取用户列表失败", "error")
    console.error(error)
  } finally {
    hideLoading()
  }
}

// 创建用户
async function createUser(userData) {
  try {
    showLoading()
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    })

    const result = await response.json()

    if (result.success) {
      showToast(result.message)
      fetchUsers()
      resetForm()
    } else {
      showToast(result.error, "error")
    }
  } catch (error) {
    showToast("创建用户失败", "error")
    console.error(error)
  } finally {
    hideLoading()
  }
}

// 更新用户
async function updateUser(id, userData) {
  try {
    showLoading()
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    })

    const result = await response.json()

    if (result.success) {
      showToast(result.message)
      fetchUsers()
      resetForm()
    } else {
      showToast(result.error, "error")
    }
  } catch (error) {
    showToast("更新用户失败", "error")
    console.error(error)
  } finally {
    hideLoading()
  }
}

// 删除用户
async function deleteUser(id) {
  if (!confirm("确定要删除这个用户吗？")) return

  try {
    showLoading()
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: "DELETE"
    })

    if (response.status === 204) {
      showToast("用户删除成功")
      fetchUsers()
    } else {
      const result = await response.json()
      showToast(result.error, "error")
    }
  } catch (error) {
    showToast("删除用户失败", "error")
    console.error(error)
  } finally {
    hideLoading()
  }
}

// ==================== 渲染函数 ====================

// 渲染用户列表
function renderUsers(users) {
  userCount.textContent = `(${users.length})`

  if (users.length === 0) {
    userTable.style.display = "none"
    emptyState.style.display = "block"
    return
  }

  userTable.style.display = "table"
  emptyState.style.display = "none"

  userList.innerHTML = users.map(user => `
    <tr>
      <td>${user.id}</td>
      <td>${escapeHtml(user.username)}</td>
      <td>${user.age}</td>
      <td>${escapeHtml(user.email || "-")}</td>
      <td>${formatDate(user.createdAt)}</td>
      <td>
        <button class="btn btn-edit" onclick="editUser(${user.id})">编辑</button>
        <button class="btn btn-delete" onclick="deleteUser(${user.id})">删除</button>
      </td>
    </tr>
  `).join("")
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

// ==================== 表单操作 ====================

// 重置表单
function resetForm() {
  userForm.reset()
  userIdInput.value = ""
  formTitle.textContent = "添加用户"
  submitBtn.textContent = "添加用户"
  cancelBtn.style.display = "none"
}

// 编辑用户
async function editUser(id) {
  const user = allUsers.find(u => u.id === id)
  if (!user) return

  userIdInput.value = user.id
  usernameInput.value = user.username
  ageInput.value = user.age
  emailInput.value = user.email || ""

  formTitle.textContent = "编辑用户"
  submitBtn.textContent = "保存修改"
  cancelBtn.style.display = "inline-block"

  // 滚动到表单
  document.querySelector(".form-section").scrollIntoView({ behavior: "smooth" })
}

// 搜索用户
function searchUsers(keyword) {
  const filtered = allUsers.filter(user =>
    user.username.toLowerCase().includes(keyword.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(keyword.toLowerCase()))
  )
  renderUsers(filtered)
}

// ==================== 事件监听 ====================

// 表单提交
userForm.addEventListener("submit", (e) => {
  e.preventDefault()

  const userData = {
    username: usernameInput.value,
    age: parseInt(ageInput.value),
    email: emailInput.value || null
  }

  const userId = userIdInput.value

  if (userId) {
    updateUser(userId, userData)
  } else {
    createUser(userData)
  }
})

// 取消编辑
cancelBtn.addEventListener("click", resetForm)

// 搜索
searchInput.addEventListener("input", (e) => {
  searchUsers(e.target.value)
})

// ==================== 初始化 ====================

// 页面加载完成后获取用户列表
document.addEventListener("DOMContentLoaded", fetchUsers)
```

---

## 测试

### 使用 cURL 测试 API

```bash
# 获取所有用户
curl http://localhost:3000/api/users

# 获取单个用户
curl http://localhost:3000/api/users/1

# 创建用户
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"测试用户","age":25,"email":"test@example.com"}'

# 更新用户
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"username":"更新后的名字","age":26}'

# 删除用户
curl -X DELETE http://localhost:3000/api/users/1
```

### API 测试脚本

创建 `test/api.test.js`：

```javascript
const http = require("http")

const BASE_URL = "http://localhost:3000"

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3000,
      path,
      method,
      headers: { "Content-Type": "application/json" }
    }

    const req = http.request(options, (res) => {
      let data = ""
      res.on("data", chunk => data += chunk)
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          data: data ? JSON.parse(data) : null
        })
      })
    })

    req.on("error", reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function runTests() {
  console.log("开始 API 测试...\n")

  // 测试获取用户列表
  console.log("1. 测试 GET /api/users")
  const listResult = await request("GET", "/api/users")
  console.log(`   状态码: ${listResult.status}`)
  console.log(`   用户数: ${listResult.data.count}\n`)

  // 测试创建用户
  console.log("2. 测试 POST /api/users")
  const createResult = await request("POST", "/api/users", {
    username: "测试用户",
    age: 25,
    email: "test@example.com"
  })
  console.log(`   状态码: ${createResult.status}`)
  console.log(`   创建的用户: ${createResult.data.data.username}\n`)

  // 测试获取单个用户
  const userId = createResult.data.data.id
  console.log(`3. 测试 GET /api/users/${userId}`)
  const getResult = await request("GET", `/api/users/${userId}`)
  console.log(`   状态码: ${getResult.status}`)
  console.log(`   用户名: ${getResult.data.data.username}\n`)

  // 测试更新用户
  console.log(`4. 测试 PUT /api/users/${userId}`)
  const updateResult = await request("PUT", `/api/users/${userId}`, {
    username: "更新后的用户",
    age: 26
  })
  console.log(`   状态码: ${updateResult.status}`)
  console.log(`   更新后用户名: ${updateResult.data.data.username}\n`)

  // 测试删除用户
  console.log(`5. 测试 DELETE /api/users/${userId}`)
  const deleteResult = await request("DELETE", `/api/users/${userId}`)
  console.log(`   状态码: ${deleteResult.status}\n`)

  console.log("测试完成!")
}

runTests().catch(console.error)
```

运行测试：

```bash
node test/api.test.js
```

---

## 部署

### PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start app.js --name "user-management"

# 查看状态
pm2 status

# 查看日志
pm2 logs user-management

# 开机自启
pm2 startup
pm2 save
```

### Docker 部署

**Dockerfile**：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "app.js"]
```

构建和运行：

```bash
# 构建镜像
docker build -t express-crud-demo .

# 运行容器
docker run -d -p 3000:3000 --name user-api express-crud-demo
```

---

## 性能优化

### 启用压缩

```bash
npm install compression
```

```javascript
const compression = require("compression")
app.use(compression())
```

### 缓存静态资源

```javascript
app.use(express.static("public", {
  maxAge: "1d",
  etag: true,
  lastModified: true
}))
```

### 使用日志库

```bash
npm install morgan
```

```javascript
const morgan = require("morgan")

if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined"))
} else {
  app.use(morgan("dev"))
}
```

---

## 常见问题

### Q1: 为什么 PUT 请求后数据没有更新？

检查请求是否设置了正确的 `Content-Type` 头：

```javascript
fetch(url, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
})
```

### Q2: 跨域请求被拒绝？

确保已启用 CORS 中间件：

```javascript
const cors = require("cors")
app.use(cors())
```

### Q3: JSON 文件写入失败？

检查文件权限和数据格式：

```javascript
// 确保数据是有效对象
if (typeof data !== "object") {
  throw new Error("无效的数据格式")
}

// 格式化 JSON 字符串
JSON.stringify(data, null, 2)
```

### Q4: 如何添加分页功能？

```javascript
app.get("/api/users", async (req, res) => {
  const { page = 1, limit = 10 } = req.query
  const users = await db.getUsers()

  const start = (page - 1) * limit
  const end = start + Number(limit)

  res.json({
    data: users.slice(start, end),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: users.length,
      totalPages: Math.ceil(users.length / limit)
    }
  })
})
```

---

## 扩展阅读

- [Express 基础](01-Express%20基础.md)
- [路由系统](02-路由系统.md)
- [中间件](03-中间件.md)
- [错误处理](04-错误处理.md)

---

## Node.js 22+ Express 实战新特性

### 原生 --watch 替代 nodemon

```bash
# 传统方式
npm install -g nodemon
nodemon app.js

# Node.js 22+ 原生方式
node --watch bin/www

# 配合 --env-file
node --watch --env-file=.env.development bin/www
```

### 原生 fetch 简化 API 调用

```javascript
// Express 路由中使用原生 fetch
app.get('/api/proxy/users', async (req, res) => {
  try {
    const response = await fetch('https://api.example.com/users', {
      headers: { Authorization: req.headers.authorization }
    })
    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
```

### node:test 测试 Express 应用

> 注意：被测的 `app.js` 需导出 app 实例（`module.exports = app`），并将 `app.listen(...)` 移到 `if (require.main === module)` 判断内，避免导入时重复启动服务器。

```javascript
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import app from '../app.js'

describe('Express API', () => {
  let server
  const BASE = 'http://localhost:3001'

  beforeEach(() => {
    server = app.listen(3001)
  })

  afterEach(() => {
    server.close()
  })

  it('GET /api/users 返回 200', async () => {
    const res = await fetch(`${BASE}/api/users`)
    assert.strictEqual(res.status, 200)
  })
})
```
