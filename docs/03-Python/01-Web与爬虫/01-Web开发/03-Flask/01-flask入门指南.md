---
title: Flask 入门指南
description: Flask 快速入门：安装依赖、路由与变量规则、Jinja2 模板渲染、请求响应处理、Session 会话管理与最佳实践
version: 1.0
author: 文档维护组
created: 2026-02-23
updated: 2026-08-12
status: 草案
category: Python

---
# Flask 入门指南

## Flask 安装

推荐使用最新版本的 Python，Flask 3.1.x 要求 Python 3.9+，建议使用 3.13/3.14

当安装 Flask 时，以下配套软件会被自动安装：

- **[Werkzeug](https://palletsprojects.com/p/werkzeug/)**: 实现 WSGI，应用和服务之间的标准 Python 接口
- **[Jinja](https://palletsprojects.com/p/jinja/)**: 用于渲染页面的模板语言
- **[MarkupSafe](https://palletsprojects.com/p/markupsafe/)**: 与 Jinja 共用，在渲染页面时用于避免不可信的输入，防止注入攻击
- **[ItsDangerous](https://palletsprojects.com/p/itsdangerous/)**: 保证数据完整性的安全标志数据，用于保护 Flask 的 session cookie
- **[Click](https://palletsprojects.com/p/click/)**: 一个命令行应用的框架，用于提供 `flask` 命令，并允许添加自定义管理命令
- **[Blinker](https://blinker.readthedocs.io/)**: 提供对于[信号](https://dormousehole.readthedocs.io/en/2.3.2/signals.html)的支持

### 可选依赖

以下配套软件不会被自动安装。如果安装了，那么 Flask 会检测到这些软件：

- **[python-dotenv](https://github.com/theskumar/python-dotenv#readme)**: 当运行 `flask` 命令时为[通过 dotenv 设置环境变量](https://dormousehole.readthedocs.io/en/2.3.2/cli.html#dotenv)提供支持
- **[Watchdog](https://pythonhosted.org/watchdog/)**: 为开发服务器提供快速高效的重载

### 安装 Flask

在已激活的虚拟环境中使用 `pip` 安装 Flask：

```bash
pip install Flask
```

## 快速上手

### 最小的应用

最简单的 Flask 应用：

```python
from flask import Flask

# 创建 Flask 应用实例
# __name__ 是一个适用于大多数情况的快捷方式，Flask 以此来确定应用的根目录
app = Flask(__name__)

# 使用 route() 装饰器来告诉 Flask 触发函数的 URL
@app.route("/")
def hello_world():
  return "<p>Hello, World!</p>"
```

**说明:**

1.  导入 `Flask` 类
2.  创建该类的实例，`__name__` 参数帮助 Flask 找到模板和静态文件
3.  使用 `@app.route()` 装饰器将 URL 路径 `/` 绑定到 `hello_world` 函数
4.  函数返回要在用户浏览器中显示的信息

将以上代码保存为 `hello.py`（避免使用 `flask.py`，会与 Flask 本身冲突）

#### 运行应用

使用 `flask` 命令来运行应用。使用 `--app` 选项指定应用的位置

```bash
flask --app hello run
```

> **捷径**: 如果文件名是 `app.py` 或 `wsgi.py`，则无需使用 `--app` 选项

这会启动一个内置的开发服务器。在浏览器中打开 `http://127.0.0.1:5000/`，您应该能看到 "Hello, World!"

> **警告**: 如果 5000 端口被占用，您会看到 `OSError: [Errno 98]` 或 `OSError: [WinError 10013]` 的错误。您可以使用 `flask run --port=5001` 来指定其他端口

### 调试模式

开启调试模式后，服务器会在代码更改后自动重启，并在发生错误时提供一个交互式调试器。

```bash
flask --app hello run --debug
```

> **安全警告**: **永远不要**在生产环境中开启调试模式

### 路由 (Routing)

使用 `@app.route()` 装饰器将函数绑定到 URL

#### 变量规则

可以在 URL 中添加变量，并将变量作为关键字参数传递给函数

```python
from markupsafe import escape

@app.route('/user/<username>')
def show_user_profile(username):
    # 使用 escape() 来防止 XSS 攻击
    return f'User {escape(username)}'

@app.route('/post/<int:post_id>')
def show_post(post_id):
    # post_id 是一个整数
    return f'Post {post_id}'

@app.route('/path/<path:subpath>')
def show_subpath(subpath):
    # subpath 可以包含斜杠
    return f'Subpath {escape(subpath)}'
```

**转换器类型:**

| 类型     | 描述                            |
| :------- | :------------------------------ |
| `string` | (默认) 接受任何不包含斜杠的文本 |
| `int`    | 接受正整数                      |
| `float`  | 接受正浮点数                    |
| `path`   | 类似 `string`，但可以包含斜杠   |
| `uuid`   | 接受 UUID 字符串                |

#### URL 构建

使用 `url_for()` 函数来构建 URL，而不是在代码中硬编码

**优点:**

- 更具描述性
- 方便统一修改 URL
- 自动处理特殊字符的转义
- 生成的路径总是绝对路径

```python
from flask import url_for

with app.test_request_context():
  print(url_for('hello_world'))
  print(url_for('show_user_profile', username='John Doe'))
```

#### HTTP 方法

默认情况下路由只响应 `GET` 请求。可以使用 `methods` 参数来处理不同的 HTTP 方法

```python
from flask import request

@app.route('/login', methods=['GET', 'POST'])
def login():
  if request.method == 'POST':
    # 处理登录逻辑
    return do_the_login()
  else:
    # 显示登录表单
    return show_the_login_form()
```

或者使用便捷的装饰器：

```python
@app.get('/login')
def login_get():
  return show_the_login_form()

@app.post('/login')
def login_post():
  return do_the_login()
```

## 模板渲染

Flask 使用 Jinja2 模板引擎。在 `templates` 文件夹中创建 HTML 文件

**项目结构:**

```text
/myproject
    /app.py
    /templates
        /hello.html
```

**示例:**

```python
from flask import render_template

@app.route('/hello/')
@app.route('/hello/<name>')
def hello(name=None):
  return render_template('hello.html', name=name)
```

**`templates/hello.html`:**

```html
<!DOCTYPE html>
<title>Hello from Flask</title>
{% if name %}
<h1>Hello {{ name }}!</h1>
{% else %}
<h1>Hello, World!</h1>
{% endif %}
```

> **注意**: Jinja2 会自动转义 HTML，防止 XSS 攻击。如果需要输出原始 HTML，请使用 `|safe` 过滤器

## 请求与响应

### 请求对象

`request` 对象包含了客户端的请求信息

- `request.form`: 访问表单数据 (POST/PUT)
- `request.args`: 访问 URL 查询参数 (GET)
- `request.method`: 获取当前的请求方法
- `request.files`: 访问上传的文件

```python
from flask import request

@app.route('/login', methods=['POST'])
def login():
    username = request.form['username']
    password = request.form['password']
    # ...
```

### 文件上传

在 HTML 表单中设置 `enctype="multipart/form-data"`

```python
from flask import request
from werkzeug.utils import secure_filename

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'the_file' in request.files:
        f = request.files['the_file']
        # 使用 secure_filename 保证文件名安全
        f.save(f"/var/www/uploads/{secure_filename(f.filename)}")
        return 'File uploaded successfully'
```

### Cookies

使用 `request.cookies` 读取 cookies，使用响应对象的 `set_cookie()` 方法设置 cookies

```python
from flask import make_response, request

@app.route('/')
def index():
    username = request.cookies.get('username')
    resp = make_response(render_template('index.html'))
    resp.set_cookie('username', 'the username')
    return resp
```

### 重定向和错误

- `redirect(url_for(...))`: 重定向到其他 URL
- `abort(404)`: 中断请求并返回错误代码

```python
from flask import abort, redirect, url_for

@app.route('/')
def index():
  return redirect(url_for('login'))

@app.errorhandler(404)
def page_not_found(error):
    return render_template('page_not_found.html'), 404
```

### JSON 响应

直接从视图返回字典或列表，Flask 会自动将其转换为 JSON 响应。

```python
@app.route("/me")
def me_api():
  user = get_current_user()
  return {
    "username": user.username,
    "theme": user.theme,
  }
```

对于更复杂的序列化，可以使用 `jsonify()` 函数

## 会话 (Session)

`session` 对象允许在不同请求之间存储信息。它使用加密的 cookie

**必须设置 `secret_key`:**

```python
from flask import Flask, session, redirect, url_for, request

app = Flask(__name__)
# 密钥必须是随机且保密的
app.secret_key = b'_5#y2L"F4Q8z\n\xec]/'

@app.route('/')
def index():
  if 'username' in session:
    return f'Logged in as {session["username"]}'
  return 'You are not logged in'

@app.route('/login', methods=['GET', 'POST'])
def login():
  if request.method == 'POST':
    session['username'] = request.form['username']
    return redirect(url_for('index'))
  return '''
        <form method="post">
            <p><input type=text name=username>
            <p><input type=submit value=Login>
        </form>
    '''

@app.route('/logout')
def logout():
  session.pop('username', None)
  return redirect(url_for('index'))
```

## 常见问题 (FAQ)

**Q1: 如何生成一个好的 `secret_key`?**

A1: 使用 Python 的 `secrets` 模块来生成一个安全的随机密钥。

```python
import secrets
secrets.token_hex(16)
```

**Q2: 为什么我的应用无法从网络中的其他计算机访问？**

A2: 默认情况下，开发服务器只监听本地回环地址 (`127.0.0.1`)。要使其公开访问，请使用 `--host=0.0.0.0`。

```bash
flask run --host=0.0.0.0
```

**Q3: 如何处理静态文件，如 CSS 和 JavaScript？**

A3: 在应用根目录下创建一个名为 `static` 的文件夹。文件将通过 `/static/filename` URL 访问。在模板中使用 `url_for('static', filename='style.css')` 来生成 URL。

## 最佳实践

- **始终使用虚拟环境**: 隔离项目依赖
- **保持 `secret_key` 的私密性**: 不要将其硬编码在代码中，而是从环境变量加载
- **在生产中使用专业的 WSGI 服务器**: 例如 Gunicorn 或 uWSGI，而不是 Flask 内置的开发服务器
- **使用蓝图 (Blueprints) 组织大型应用**: 将应用拆分为更小的、可重用的组件
- **编写测试**: 使用 Pytest 等框架为您的应用编写单元测试和集成测试

## 相关资源

- **[Flask 官方文档](https://flask.palletsprojects.com/)**: 最权威的学习资源
- **[Jinja2 模板文档](https://jinja.palletsprojects.com/templates/)**: 学习模板引擎的详细用法
- **[Werkzeug 文档](https://werkzeug.palletsprojects.com/)**: 了解 WSGI 工具库的更多信息
- **[Awesome Flask](https://github.com/humiaozuzu/awesome-flask)**: 一个精选的 Flask 资源列表

## 版本差异（Flask → 3.1.x）

| 特性 | 本文编写时 | 当前（Flask 3.1.x） |
|------|-----------|---------------------|
| 版本基线 | Flask 2.x | 3.1 为最新稳定版；要求 Python 3.9+ |
| 异步视图 | 部分支持 | 3.0 起原生支持 async 视图（无需额外扩展） |
| CLI | `flask run` | 3.x 默认启用 debugger/pin；`FLASK_DEBUG` 等环境变量不变 |
| 依赖 | — | 3.x 依赖 Werkzeug 3.x；`app.json`/config 方式不变 |
| 安全性 | — | 3.x 强化 cookie 与会话默认值 |

> 本文讲解的路由、模板、表单、数据库集成等核心模式在 Flask 3.x 中完全适用；升级主要关注 Python 3.9+ 要求与异步视图支持。
