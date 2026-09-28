---
title: Node 项目常用工具库实战
description: 整理 Node.js 项目常用库的用法：svg-captcha 图形验证码、require.context 的 Node 替代方案、nodemailer 邮件服务、dayjs/qs/uuid、koa-jwt 与 jsonwebtoken 鉴权、npm-run-all 脚本编排、bcrypt 密码哈希及 VSCode 路径别名配置。
keywords: [Node.js, svg-captcha, JWT, 登录鉴权]
category: Node.js
tags: [Node.js, 实战案例]
---

# Node 项目常用工具库实战

## svg-captcha 图形验证码

`svg-captcha` 是一个用于生成 SVG 格式验证码的插件库。它可以生成带有随机字符的 SVG 图片，常用于用户注册、登录等需要防止机器人自动提交的场景

- 生成随机字符的 SVG 图片验证码
- 支持自定义验证码长度、字符集、干扰线条数量、颜色和背景色等
- 可以生成数学表达式验证码

```bash
pnpm install svg-captcha
```

在 Koa 应用中引入并使用 `svg-captcha` 生成验证码：

```javascript
const Koa = require('koa');
const Router = require('koa-router');
const svgCaptcha = require('svg-captcha');

const app = new Koa();
const router = new Router();

router.get('/captcha', (ctx) => {
  const captcha = svgCaptcha.create({
    size: 6, // 验证码长度
    ignoreChars: '0o1i', // 忽略的字符
    noise: 2, // 干扰线条的数量
    color: true, // 是否使用颜色
    background: '#cc9966' // 背景颜色
  });

  ctx.type = 'image/svg+xml';
  ctx.body = captcha.data;
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
```

### 配置选项

可以在生成验证码时传递配置选项，例如：

```javascript
const captcha = svgCaptcha.create({
  size: 6, // 验证码长度
  ignoreChars: '0o1i', // 忽略的字符
  noise: 2, // 干扰线条的数量
  color: true, // 是否使用颜色
  background: '#cc9966' // 背景颜色
});
```

- `size`: 验证码长度，默认为 `4`
- `ignoreChars`: 忽略的字符，这些字符不会出现在验证码中
- `noise`: 干扰线条的数量，默认为 `1`
- `color`: 是否使用颜色，默认为 `false`
- `background`: 背景颜色，默认为 `undefined`

### 数学表达式验证码

还可以生成数学表达式验证码：

```javascript
const captcha = svgCaptcha.createMathExpr({
  mathMin: 1,
  mathMax: 9,
  mathOperator: '+', // 可选值：'+'、'-'
  noise: 2,
  color: true,
  background: '#cc9966'
});
```

- `mathMin`: 数学表达式中最小的数字，默认为 `1`
- `mathMax`: 数学表达式中最大的数字，默认为 `9`
- `mathOperator`: 数学运算符，默认为 `'+'`，可选值为 `'+'` 和 `'-'`

## require.context

`require.context` 是 Webpack 提供的一个特性，用于动态加载模块，但它在 Node.js 环境中不可用。要在 Node.js 环境中实现类似的功能，可以使用 `fs` 模块和 `path` 模块来遍历目录并加载模块

```javascript
import combineRoutes from "koa-combine-routers"

// 加载目录中的Router中间件
const moduleFiles = require.context("./modules", true, /\.js$/)

// reduce 方法去拼接 koa-combine-router 所需的数据结构 Object[]
const modules = moduleFiles.keys().reduce((items, path) => {
  const value = moduleFiles(path)
  items.push(value.default)
  return items
}, [])

export default combineRoutes(modules)
```

### 方法一：使用 `fs` 和 `path` 替换

以下是一个替代方案，使用 `fs` 和 `path` 模块来动态加载 `./modules` 目录中的所有 JavaScript 文件：

```javascript
import combineRoutes from "koa-combine-routers";
import fs from "fs";
import path from "path";

// 获取模块目录的绝对路径
const modulesDir = path.resolve(__dirname, "./modules");

// 读取目录中的所有文件
const moduleFiles = fs.readdirSync(modulesDir).filter(file => file.endsWith(".js"));

// 加载所有模块
const modules = moduleFiles.map(file => {
  const filePath = path.join(modulesDir, file);
  const module = require(filePath);
  return module.default || module;
});

export default combineRoutes(modules);
```

### 方法二：修改启动脚本

需要配置 webpack 打包的方式启动项目

```json
{
  "scripts": {
    "start-node": "npx nodemon --exec babel-node src/index.js",
    "start": "cross-env NODE_ENV=development webpack --watch --progress --config config/webpack.config.dev.js"
  }
}
```

## nodemailer 邮件服务

### 邮件服务注意

使用客户端授权码，QQ邮箱14天限制

公共邮箱限制了发送频次、数量、群发

邮件服务：阿里云/亚马逊SES/SendCloud

使用 `nodemailer` 来发送电子邮件是 Node.js 应用中的一个常见需求。以下是配置和使用 `nodemailer` 通过 QQ 邮箱发送邮件的详细步骤

```bash
pnpm install nodemailer
```

使用 QQ 邮箱发送邮件前，你需要做一些配置：

1. **开启 SMTP 服务**：登录 QQ 邮箱，进入“设置”->“账户”，开启“SMTP服务”。
2. **获取授权码**：开启 SMTP 服务后，QQ 邮箱会提供一个授权码，你需要使用这个授权码而不是你的 QQ 邮箱密码来进行 SMTP 身份验证

3. 获取授权码：登录 QQ 邮箱网页版，进入「设置 -> 账户」页按提示获取

### nodemailer

通过 `nodemailer` 使用 QQ 邮箱发送邮件的示例代码：

```javascript
const nodemailer = require('nodemailer');

// 创建一个 SMTP 传输对象
const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  port: 465, // QQ 邮箱使用 465 端口进行 SSL 连接
  secure: true, // 使用 SSL
  auth: {
    user: 'your-email@qq.com', // 你的 QQ 邮箱地址
    pass: 'your-smtp-auth-code' // 你的 SMTP 授权码
  }
});

// 设置邮件选项
const mailOptions = {
  from: 'your-email@qq.com', // 发件人地址
  to: 'recipient-email@example.com', // 收件人地址
  subject: '测试邮件', // 邮件主题
  text: '这是一封来自 Node.js 的测试邮件', // 邮件正文（文本格式）
  html: '<p>这是一封来自 <b>Node.js</b> 的测试邮件</p>' // 邮件正文（HTML 格式）
};

// 发送邮件
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.log(error);
  }
  console.log('邮件发送成功: %s', info.messageId);
});
```

保存上述代码为 `sendEmail.js`，然后在终端中运行：

```bash
node sendEmail.js
```

如果配置正确，你应该会在终端中看到邮件发送成功的消息，并且收件人会收到你发送的邮件

## dayjs

```bash
pnpm i dayjs
```

## qs

```bash
pnpm install qs  
```

## uuid

```bash
pnpm i uuid
```









## koa-jwt

可以使用 [jwt.io](https://jwt.io/) 在线查看与校验 token

在 Node.js 中集成 `koa-jwt` 处理基于 JWT 身份验证。下面是一个完整的示例，展示在 Koa 中使用 `koa-jwt`

```bash
pnpm install koa-jwt jsonwebtoken
```

编写一个简单的 Koa 应用，集成 `koa-jwt`：

```javascript
const Koa = require('koa');
const Router = require('koa-router');
const jwt = require('jsonwebtoken');
const koaJwt = require('koa-jwt');

const app = new Koa();
const router = new Router();

const secret = 'your_secret_key';  // 用于签署 JWT 的密钥

// 用户登录的路由，成功登录后返回 JWT
router.post('/login', async (ctx) => {
  const { username, password } = ctx.request.body;
  // 在这里你应该验证用户名和密码
  if (username === 'admin' && password === 'admin') {
    const token = jwt.sign({ username }, secret, { expiresIn: '1h' });
    ctx.body = { token };
  } else {
    ctx.status = 401;
    ctx.body = { error: 'Invalid login' };
  }
});

// 使用 koa-jwt 中间件保护的路由
router.get('/protected', koaJwt({ secret }), async (ctx) => {
  ctx.body = { message: 'This is a protected route', user: ctx.state.user };
});

app
  .use(require('koa-bodyparser')())  // 用于解析 POST 请求的 body
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
```

**受保护的路由**：

- 定义一个受保护的路由 `/protected`
- 使用 `koa-jwt` 中间件保护该路由。中间件会验证请求中的 JWT
- 如果 JWT 验证通过，返回受保护的信息

启动服务器：

```bash
node app.js
```

使用 `curl` 或 Postman 进行测试：

**登录获取 Token**：如果成功会收到一个包含 JWT 的响应

```bash
curl -X POST http://localhost:3000/login -d '{"username":"admin","password":"admin"}' -H "Content-Type: application/json"
```

**访问受保护的路由**：

```bash
curl -H "Authorization: Bearer <your_jwt_token>" http://localhost:3000/protected
```

替换 `<your_jwt_token>` 为登录时获取的 JWT。如果 token 有效，你会看到受保护的消息

## jsonwebtoken

`jsonwebtoken` 是一个用于生成和验证 JSON Web Tokens (JWT) 的插件

- **生成 JWT**：使用 `jwt.sign` 方法生成一个新的 JWT
- **验证 JWT**：使用 `jwt.verify` 方法验证一个 JWT 的有效性
- **解码 JWT**：使用 `jwt.decode` 方法解码一个 JWT，而不验证其签名

```sh
pnpm install jsonwebtoken
```

### 生成 JWT

```javascript
const jwt = require('jsonwebtoken');

// 定义一个密钥，用于签名 JWT
const secretKey = 'your-secret-key';

// 定义一个有效载荷
const payload = {
  userId: 123,
  username: 'john_doe'
};

// 生成 JWT
const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });

console.log('Generated Token:', token);
```

### 验证 JWT

```javascript
const jwt = require('jsonwebtoken');

// 定义一个密钥，用于验证 JWT
const secretKey = 'your-secret-key';

// 从请求中获取 JWT（例如，从 HTTP 头部）
const token = 'your-jwt-token';

try {
  // 验证 JWT
  const decoded = jwt.verify(token, secretKey);
  console.log('Decoded Payload:', decoded);
} catch (err) {
  console.error('Invalid Token:', err.message);
}
```

### 配置选项

#### `jwt.sign` 方法

- `payload`：JWT 的有效载荷，可以是对象、字符串或 Buffer
- `secretOrPrivateKey`：用于签名 JWT 的密钥或私钥
- `options`：可选的配置对象，例如：
  - `expiresIn`：设置 JWT 的过期时间，例如 `'1h'` 表示 1 小时
  - `algorithm`：指定用于签名的算法，默认是 `'HS256'`

#### `jwt.verify` 方法

- `token`：要验证的 JWT。
- `secretOrPublicKey`：用于验证 JWT 的密钥或公钥
- `options`：可选的配置对象，例如：
  - `algorithms`：指定允许的算法列表



## npm-run-all

`npm-run-all` 是一个用于并行或串行运行多个 npm 脚本的插件库。简化复杂的 npm 脚本执行流程，特别是在需要同时运行多个任务时非常有用

- `-s` 或 `--serial`：串行运行脚本（默认行为）
- `-p` 或 `--parallel`：并行运行脚本。
- `--continue-on-error`：即使某个脚本失败，也继续运行后续脚本
- `--race`：一旦有一个脚本成功或失败，立即终止其他脚本

```sh
pnpm install npm-run-all -D
```

### 串行运行脚本

使用 `run-s` 命令可以串行运行多个脚本，`npm-run-all clean build` 将会先运行 `clean` 脚本，然后运行 `build` 脚本

```json
{
  "scripts": {
    "clean": "rimraf dist",
    "build": "cross-env NODE_ENV=production webpack --config config/webpack.config.prod.js",
    "start": "npm-run-all clean build"
  }
}
```

### 并行运行脚本

使用 `run-p` 命令可以并行运行多个脚本，`npm-run-all -p server watch` 将会并行运行 `server` 和 `watch` 脚本

```json
{
  "scripts": {
    "server": "npx nodemon --exec babel-node src/index.js",
    "watch": "cross-env NODE_ENV=development webpack --watch --progress --config config/webpack.config.dev.js",
    "start": "npm-run-all -p server watch"
  }
}
```

## bcrypt

`bcrypt` 是一个用于加密和验证密码的插件库。它使用了 Blowfish 加密算法，提供了强大的安全性，常用于存储用户密码

- **加密密码**：使用 `bcrypt.hash` 方法加密密码
- **验证密码**：使用 `bcrypt.compare` 方法验证密码是否匹配已加密的密码
- **生成盐**：使用 `bcrypt.genSalt` 方法生成盐

```sh
pnpm install bcrypt
```

在 Node.js 应用中使用 `bcrypt` 进行密码加密和验证的示例：

### 加密密码

```javascript
const bcrypt = require('bcrypt');

// 定义一个密码
const password = 'myPlainPassword';

// 定义盐的轮数（越高越安全，但计算时间越长）
const saltRounds = 10;

// 加密密码
bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
  } else {
    console.log('Hashed Password:', hash);
  }
});
```

### 验证密码

```javascript
const bcrypt = require('bcrypt');

// 假设这是从数据库中获取的已加密密码
const hashedPassword = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Zf4a2B5N9yK3e6k9b5QK6';

// 用户输入的密码
const password = 'myPlainPassword';

// 验证密码
bcrypt.compare(password, hashedPassword, (err, result) => {
  if (err) {
    console.error('Error comparing password:', err);
  } else if (result) {
    console.log('Password is valid!');
  } else {
    console.log('Password is invalid!');
  }
});
```

`bcrypt.compare` 方法之所以只需要传入原始数据（明文密码）和加密后的数据（哈希密码）就可以进行对比，是因为 `bcrypt` 在生成哈希时会将盐（salt）嵌入到哈希中，并且使用了相同的算法进行加密

- 当使用 `bcrypt.hash` 方法加密密码时，`bcrypt` 会生成一个随机的盐，并将这个盐与密码一起进行哈希运算。生成的哈希值包含了盐和加密后的密码

  ```javascript
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  ```

- 当使用 `bcrypt.compare` 方法进行密码验证时，`bcrypt` 会从存储的哈希值中提取出盐，并使用这个盐对输入的明文密码进行相同的哈希运算。然后会将生成的哈希值与存储的哈希值进行比较

  ```javascript
  const isValid = await bcrypt.compare(password, hashedPassword);
  ```

## VSCode 配置 alias 的支持

VSCode 插件 `Node modules resolve`

生成 `jsconfig.json`

```json
{
  "compilerOptions": {
    "target": "es2017",
    "allowSyntheticDefaultImports": false,
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "exclude": ["node_modules", "dist"]
}
```

> 可能需要重启 编辑器