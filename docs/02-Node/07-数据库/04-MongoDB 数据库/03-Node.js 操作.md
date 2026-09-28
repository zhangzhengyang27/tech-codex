---
title: Node.js 操作 MongoDB
description: 官方驱动与 Mongoose 的接入、连接池与聚合查询
keywords: [Node.js, MongoDB, 驱动, Mongoose]
category: Node.js
tags: [Node.js, 数据库]
---

# Node.js 操作 MongoDB

在 Node.js 中操作 MongoDB 主要有两种选择：原生驱动 `mongodb` 和 ODM 框架 `Mongoose`。

| 特性 | `mongodb` (原生驱动) | `Mongoose` (ODM) |
|------|---------------------|------------------|
| 抽象级别 | 底层 API | 高层抽象 |
| 数据结构 | 灵活，无预设模式 | 基于 Schema |
| 数据验证 | 需手动实现 | 内置验证 |
| 学习曲线 | 较低 | 中等 |
| 性能 | 最高 | 略低（有中间件开销） |
| 适用场景 | 性能要求极高、需要底层控制 | 企业级应用、快速开发 |

## 使用 mongodb 原生驱动

### 安装与连接

```bash
npm install mongodb
```

```javascript
// lib/mongodb.js
const { MongoClient } = require("mongodb")

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017"

// 连接选项
const options = {
  maxPoolSize: 10,        // 连接池大小
  minPoolSize: 2,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000
}

const client = new MongoClient(uri, options)

let db

async function connectToDatabase() {
  if (db) return db
  await client.connect()
  console.log("Connected to MongoDB")
  db = client.db("myproject")
  return db
}

// 优雅关闭连接
async function closeConnection() {
  await client.close()
  console.log("MongoDB connection closed")
}

// 监听进程退出
process.on("SIGINT", async () => {
  await closeConnection()
  process.exit(0)
})

module.exports = { connectToDatabase, closeConnection, client }
```

### CRUD 操作示例

**插入文档：**

```javascript
const db = await connectToDatabase()
const users = db.collection("users")

// 插入单个
const result = await users.insertOne({ 
  name: "Alice", 
  age: 25,
  createdAt: new Date()
})
console.log("Inserted ID:", result.insertedId)

// 插入多个
const manyResult = await users.insertMany([
  { name: "Bob", age: 30 },
  { name: "Charlie", age: 35 }
])
console.log("Inserted count:", manyResult.insertedCount)
```

**查询文档：**

```javascript
// 查询单个
const user = await users.findOne({ name: "Alice" })

// 查询多个
const cursor = users.find({ age: { $gt: 25 } })
const userList = await cursor.toArray()

// 使用游标迭代（适合大数据量）
for await (const doc of users.find()) {
  console.log(doc)
}

// 带投影
const limitedFields = await users.findOne(
  { name: "Alice" },
  { projection: { name: 1, email: 1, _id: 0 } }
)

// 排序和分页
const page = 1
const pageSize = 10
const pagedResults = await users.find()
  .sort({ createdAt: -1 })
  .skip((page - 1) * pageSize)
  .limit(pageSize)
  .toArray()
```

**更新文档：**

```javascript
// 更新单个
const updateResult = await users.updateOne(
  { name: "Alice" },
  { $set: { age: 26 }, $currentDate: { updatedAt: true } }
)
console.log("Modified count:", updateResult.modifiedCount)

// 更新多个
const multiResult = await users.updateMany(
  { status: "inactive" },
  { $set: { status: "active" } }
)

// 查找并更新
const updatedUser = await users.findOneAndUpdate(
  { name: "Bob" },
  { $set: { status: "active" } },
  { 
    returnDocument: "after",  // 返回更新后的文档
    projection: { name: 1, status: 1 }
  }
)

// 查找并替换
const replacedDoc = await users.findOneAndReplace(
  { name: "Bob" },
  { name: "Bob", age: 31, city: "New York" },
  { returnDocument: "after" }
)
```

**删除文档：**

```javascript
const deleteResult = await users.deleteOne({ name: "Charlie" })
console.log("Deleted count:", deleteResult.deletedCount)

// 批量删除
const multiDelete = await users.deleteMany({ status: "inactive" })
```

### 批量操作（bulkWrite）

```javascript
const result = await users.bulkWrite([
  { insertOne: { document: { name: "User1", age: 20 } } },
  { updateOne: { 
      filter: { name: "Alice" }, 
      update: { $set: { age: 26 } } 
  }},
  { deleteOne: { filter: { name: "User2" } } }
], { ordered: false })  // ordered: false 表示不保证执行顺序，某条失败不中断后续操作

console.log(result)
// { insertedCount: 1, modifiedCount: 1, deletedCount: 1, ... }
```

### 聚合管道

```javascript
const pipeline = [
  { $match: { status: "active" } },
  { $group: { _id: "$department", total: { $sum: 1 } } },
  { $sort: { total: -1 } }
]

const aggCursor = users.aggregate(pipeline)

// 方式1：转换为数组
const results = await aggCursor.toArray()

// 方式2：游标迭代（更节省内存）
for await (const doc of users.aggregate(pipeline)) {
  console.log(doc)
}
```

### 事务管理

```javascript
// MongoDB 4.0+ 支持多文档事务（需要副本集）
const session = client.startSession()

try {
  await session.withTransaction(async () => {
    const users = client.db("myproject").collection("users")
    const orders = client.db("myproject").collection("orders")
    
    // 所有操作使用同一个 session
    await users.insertOne(
      { name: "Eve", age: 28 }, 
      { session }
    )
    
    await orders.insertOne(
      { userId: "eve", amount: 100 }, 
      { session }
    )
  })
  console.log("Transaction committed")
} catch (error) {
  console.error("Transaction failed:", error)
} finally {
  await session.endSession()
}
```

### 连接字符串格式

```
# 标准连接
mongodb://[username:password@]host1[:port1][,host2[:port2],...]/database[?options]

# 示例
mongodb://localhost:27017/mydb
mongodb://user:pass@localhost:27017/mydb
mongodb://user:pass@host1:27017,host2:27017,host3:27017/mydb?replicaSet=myRs

# DNS Seedlist（推荐用于云环境）
mongodb+srv://user:pass@cluster.example.com/mydb

# 常用选项
mongodb://localhost:27017/mydb?
  maxPoolSize=10&
  minPoolSize=2&
  connectTimeoutMS=10000&
  socketTimeoutMS=45000&
  retryWrites=true&
  w=majority
```

### Express 完整示例

```javascript
const express = require("express")
const { ObjectId } = require("mongodb")
const { connectToDatabase } = require("./lib/mongodb")

const app = express()
app.use(express.json())

// 错误处理中间件
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// 获取文章列表（分页）
app.get("/articles", asyncHandler(async (req, res) => {
  const { page = 1, size = 10, status } = req.query
  const db = await connectToDatabase()
  const collection = db.collection("articles")
  
  const filter = {}
  if (status) filter.status = status
  
  const [articles, total] = await Promise.all([
    collection.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(size))
      .limit(parseInt(size))
      .project({ title: 1, summary: 1, status: 1, createdAt: 1 })
      .toArray(),
    collection.countDocuments(filter)
  ])
  
  res.json({ 
    articles, 
    pagination: {
      page: parseInt(page),
      size: parseInt(size),
      total,
      pages: Math.ceil(total / parseInt(size))
    }
  })
}))

// 创建文章
app.post("/articles", asyncHandler(async (req, res) => {
  const { title, body, status = "draft" } = req.body
  
  if (!title || !body) {
    return res.status(400).json({ error: "title and body are required" })
  }

  const db = await connectToDatabase()
  const result = await db.collection("articles").insertOne({
    title,
    body,
    status,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  res.status(201).json({ 
    id: result.insertedId,
    message: "Article created successfully"
  })
}))

// 获取单篇文章
app.get("/articles/:id", asyncHandler(async (req, res) => {
  const db = await connectToDatabase()
  const article = await db.collection("articles").findOne({
    _id: new ObjectId(req.params.id)
  })

  if (!article) {
    return res.status(404).json({ error: "Article not found" })
  }
  res.json(article)
}))

// 更新文章
app.patch("/articles/:id", asyncHandler(async (req, res) => {
  const { title, body, status } = req.body
  const updates = { updatedAt: new Date() }
  if (title) updates.title = title
  if (body) updates.body = body
  if (status) updates.status = status
  
  const db = await connectToDatabase()
  const result = await db.collection("articles").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: updates }
  )
  
  if (result.matchedCount === 0) {
    return res.status(404).json({ error: "Article not found" })
  }
  
  res.json({ message: "Article updated successfully" })
}))

// 删除文章
app.delete("/articles/:id", asyncHandler(async (req, res) => {
  const db = await connectToDatabase()
  const result = await db.collection("articles").deleteOne({
    _id: new ObjectId(req.params.id)
  })
  
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: "Article not found" })
  }
  
  res.json({ message: "Article deleted successfully" })
}))

// 全局错误处理
app.use((err, req, res, next) => {
  console.error(err.stack)
  
  // MongoDB 错误处理
  if (err.code === 11000) {
    return res.status(409).json({ error: "Duplicate key error" })
  }
  if (err.name === "BSONError") {
    return res.status(400).json({ error: "Invalid ID format" })
  }
  
  res.status(500).json({ error: "Internal Server Error" })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, async () => {
  await connectToDatabase()
  console.log(`Server running on port ${PORT}`)
})
```

## 使用 Mongoose ODM

### 安装与连接（Mongoose）

```bash
npm install mongoose
```

```javascript
const mongoose = require("mongoose")

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/myapp"

// 连接选项
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
}

// 连接数据库
mongoose.connect(uri, options)
  .then(() => console.log("Connected to MongoDB via Mongoose"))
  .catch(err => console.error("Connection error:", err))

// 监听连接事件
mongoose.connection.on("connected", () => {
  console.log("Mongoose connected")
})
mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err)
})
mongoose.connection.on("disconnected", () => {
  console.log("Mongoose disconnected")
})

// 优雅关闭
process.on("SIGINT", async () => {
  await mongoose.connection.close()
  console.log("Mongoose connection closed")
  process.exit(0)
})

module.exports = mongoose
```

### Schema 定义与模型

```javascript
const mongoose = require("mongoose")
const { Schema } = mongoose

const userSchema = new Schema({
  username: { 
    type: String, 
    required: [true, "Username is required"], 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"]
  },
  age: { 
    type: Number, 
    min: [18, "Must be at least 18"], 
    max: 120 
  },
  role: {
    type: String,
    enum: ["user", "admin", "moderator"],
    default: "user"
  },
  status: {
    type: String,
    enum: ["active", "inactive", "suspended"],
    default: "active"
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  hobbies: [{
    type: String,
    enum: ["reading", "gaming", "sports", "music", "travel"]
  }],
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    zipCode: { type: String, match: /^\d{5}$/ }
  },
  metadata: { type: Map, of: String }
}, {
  timestamps: true,           // 自动添加 createdAt, updatedAt
  versionKey: false,          // 禁用 __v 字段
  toJSON: { virtuals: true }, // JSON 输出包含虚拟属性
  toObject: { virtuals: true }
})

// 索引
userSchema.index({ email: 1 })
userSchema.index({ createdAt: -1 })

// 虚拟属性
userSchema.virtual("fullAddress").get(function() {
  if (!this.address) return null
  return `${this.address.street}, ${this.address.city} ${this.address.zipCode}`
})

// 实例方法
userSchema.methods.greet = function() {
  return `Hello, I'm ${this.username}!`
}

userSchema.methods.toJSON = function() {
  const user = this.toObject()
  delete user.password
  return user
}

// 静态方法
userSchema.statics.findByUsername = function(username) {
  return this.find({ username: new RegExp(username, "i") })
}

userSchema.statics.findActive = function() {
  return this.find({ status: "active" })
}

// 查询助手
userSchema.query.byRole = function(role) {
  return this.where({ role })
}

const User = mongoose.model("User", userSchema)
module.exports = User
```

### 验证器

```javascript
// 自定义验证器
const productSchema = new Schema({
  price: {
    type: Number,
    validate: {
      validator: function(v) {
        return v > 0
      },
      message: props => `Price must be positive, got ${props.value}`
    }
  },
  discount: {
    type: Number,
    validate: {
      validator: function(v) {
        return v < this.price  // 可以访问其他字段
      },
      message: "Discount must be less than price"
    }
  }
})

// 异步验证器
userSchema.path("email").validate({
  validator: async function(email) {
    const user = await this.constructor.findOne({ email })
    return !user || this._id.equals(user._id)
  },
  message: "Email already exists"
})
```

### CRUD 操作

```javascript
// 创建
const user = await User.create({ 
  username: "john", 
  email: "john@example.com" 
})

// 查询
const users = await User.find({ age: { $gt: 20 } })
  .sort({ username: 1 })
  .limit(5)
  .select("username email age")

const oneUser = await User.findOne({ username: "john" })
const userById = await User.findById("507f1f77bcf86cd799439011")

// 使用查询助手
const admins = await User.find().byRole("admin")

// 更新
await User.updateOne({ username: "john" }, { $set: { age: 26 } })

const updated = await User.findOneAndUpdate(
  { username: "john" },
  { $inc: { age: 1 } },
  { new: true, runValidators: true }
)

// 批量更新
await User.updateMany(
  { status: "inactive" },
  { $set: { status: "active" } }
)

// 删除
await User.deleteOne({ username: "john" })
await User.findByIdAndDelete("507f1f77bcf86cd799439011")

// 批量删除
await User.deleteMany({ status: "suspended" })
```

### 中间件（Hooks）

```javascript
// 保存前钩子
userSchema.pre("save", function(next) {
  if (this.isModified("password")) {
    // this.password = await bcrypt.hash(this.password, 10)
  }
  this.updatedAt = new Date()
  next()
})

// 保存后钩子
userSchema.post("save", function(doc, next) {
  console.log(`User ${doc.username} saved`)
  next()
})

// 查询中间件
userSchema.pre(/^find/, function(next) {
  this.where({ status: "active" })  // 默认只查询活跃用户
  next()
})

// 删除中间件
userSchema.pre("deleteOne", { document: true }, async function(next) {
  // 级联删除相关数据
  await Post.deleteMany({ author: this._id })
  next()
})

// 聚合中间件
userSchema.pre("aggregate", function(next) {
  this.pipeline().unshift({ $match: { status: "active" } })
  next()
})
```

### 数据关联（Population）

```javascript
const postSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { 
    type: Schema.Types.ObjectId, 
    ref: "User",
    required: true
  },
  comments: [{
    user: { type: Schema.Types.ObjectId, ref: "User" },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  tags: [{ type: String }]
}, { timestamps: true })

const Post = mongoose.model("Post", postSchema)

// 创建带关联的文档
const post = await Post.create({
  title: "My First Post",
  content: "Hello World!",
  author: user._id
})

// 填充单个关联字段
const postWithAuthor = await Post.findOne()
  .populate("author", "username email")

// 填充嵌套关联
const postWithComments = await Post.findOne()
  .populate("author", "username")
  .populate("comments.user", "username")

// 条件填充（只填充满足 match 条件的关联文档）
const posts = await Post.find()
  .populate({
    path: "comments.user",
    match: { status: "active" },  // 只填充活跃用户的评论
    select: "username"
  })

// 虚拟填充
userSchema.virtual("posts", {
  ref: "Post",
  localField: "_id",
  foreignField: "author",
  justOne: false
})

const userWithPosts = await User.findOne()
  .populate("posts", "title createdAt")
```

### 事务

```javascript
const session = await mongoose.startSession()

try {
  await session.withTransaction(async () => {
    const user = await User.create([{ name: "Alice" }], { session })
    await Post.create([{ title: "First Post", author: user[0]._id }], { session })
  })
} finally {
  await session.endSession()
}
```

---

**上一篇**：[基础操作](02-基础操作.md)  
**下一篇**：[架构与高级特性](04-架构与高级特性.md)
