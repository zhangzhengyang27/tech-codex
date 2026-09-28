---
title: "安装Tomcat服务器"
description: "Tomcat 本意为公猫的含义，最初是由 Sun 公司的软件架构师詹姆斯·邓肯·戴维森开发的，后来他帮助将其变为开源项目并由 Sun 公司贡献给 Apache 软件基金会。"
keywords: [安装Tomcat服务器]
category: "Java"
tags: [Java, JavaWeb]
---


# Tomcat 服务器安装与配置

Tomcat 本意为公猫的含义，最初是由 Sun 公司的软件架构师詹姆斯·邓肯·戴维森开发的，后来他帮助将其变为开源项目并由 Sun 公司贡献给 Apache 软件基金会。

Tomcat 服务器是一个开源的轻量级 Web 应用服务器，在中小型系统和并发量小的场合下被普遍使用，是开发和调试 Servlet、JSP 程序的首选。

> 下载地址：http://tomcat.apache.org/

## 版本选择

| Tomcat 版本 | Servlet 规范 | Java 版本 | 推荐场景 |
|------------|-------------|----------|---------|
| **Tomcat 10.1/11** | Jakarta EE 10+（Servlet 6.x, jakarta.*） | Java 11+（Tomcat 11 需 17+） | 新项目 |
| **Tomcat 9.x** | Java EE 8 (Servlet 4.0, javax.*) | Java 8+ | 老项目维护 |
| **Tomcat 8.5** | Java EE 7~8 (javax.*) | Java 7+ | 遗留系统 |

::: tip 注意
从 Tomcat 10 开始，Servlet 包名从 `javax.servlet` 改为 `jakarta.servlet`。Spring Boot 3.x 对应 Tomcat 10+，Spring Boot 2.x 对应 Tomcat 9。
:::

## macOS 安装 Tomcat

### 方式一：手动安装

**下载 Tomcat**

1. 打开 [Apache Tomcat 官方网站](https://tomcat.apache.org/)，选择需要的版本
2. 点击 Download 按钮，选择 Core 部分下的 tar.gz 文件进行下载

**解压 Tomcat**

```bash
cd ~/Downloads
tar xvf apache-tomcat-10.1.18.tar.gz
sudo mv apache-tomcat-10.1.18 /Library/tomcat10
```

**配置环境变量**

```bash
# 编辑 shell 配置文件
vim ~/.zshrc

# 添加以下内容
export CATALINA_HOME=/Library/tomcat10
export PATH=$CATALINA_HOME/bin:$PATH

# 使配置生效
source ~/.zshrc
```

**启动与停止**

```bash
# 启动
catalina.sh start

# 停止
catalina.sh stop

# 验证：打开浏览器访问 http://localhost:8080
```

### 方式二：Homebrew 安装

```bash
# 安装
brew install tomcat

# 启动
brew services start tomcat

# 停止
brew services stop tomcat

# 重启
brew services restart tomcat
```

## Windows 安装 Tomcat

1. 从官网下载 `.zip` 或 `.exe` 安装包
2. 解压到指定目录（如 `C:\apache-tomcat-10.1.18`）
3. 配置环境变量：

```text
CATALINA_HOME = C:\apache-tomcat-10.1.18
Path += %CATALINA_HOME%\bin
```

4. 启动：运行 `bin\startup.bat`
5. 停止：运行 `bin\shutdown.bat`

## 目录结构

```
apache-tomcat-10.1.18/
├── bin/            # 可执行文件和脚本（startup.sh、shutdown.sh）
├── conf/           # 配置文件（server.xml、web.xml）
├── lib/            # Tomcat 运行需要的 jar 包
├── logs/           # 日志文件（catalina.out、localhost.log）
├── temp/           # 临时文件
├── webapps/        # Web 应用部署目录
├── work/           # JSP 编译后的文件
└── README.md
```

| 目录 | 说明 |
|------|------|
| **bin** | 启动/停止脚本、可执行命令 |
| **conf** | 核心配置文件 |
| **lib** | Tomcat 及其依赖的 jar 包 |
| **logs** | 运行日志、访问日志 |
| **temp** | 临时文件 |
| **webapps** | 默认应用部署目录，WAR 包放在这里自动解压 |
| **work** | JSP 编译后的 Servlet 类文件和 Session 序列化数据 |

## 核心配置文件

### server.xml（主配置文件）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Server port="8005" shutdown="SHUTDOWN">
  <Service name="Catalina">
    
    <!-- 连接器：配置 HTTP 端口和线程池 -->
    <Connector port="8080"
               protocol="HTTP/1.1"
               connectionTimeout="20000"
               redirectPort="8443"
               maxThreads="200"
               minSpareThreads="10"
               acceptCount="100" />
    
    <!-- 引擎 -->
    <Engine name="Catalina" defaultHost="localhost">
      
      <!-- 虚拟主机 -->
      <Host name="localhost"
            appBase="webapps"
            unpackWARs="true"
            autoDeploy="true">
      </Host>
      
    </Engine>
  </Service>
</Server>
```

**关键参数说明**：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `port` | HTTP 监听端口 | 8080 |
| `maxThreads` | 最大工作线程数 | 200 |
| `minSpareThreads` | 最小空闲线程数 | 10 |
| `acceptCount` | 等待队列长度 | 100 |
| `connectionTimeout` | 连接超时时间(ms) | 20000 |
| `redirectPort` | HTTPS 重定向端口 | 8443 |

### web.xml（全局 Web 配置）

```xml
<!-- 配置默认 Session 超时时间（分钟） -->
<session-config>
    <session-timeout>30</session-timeout>
</session-config>

<!-- 配置欢迎文件列表 -->
<welcome-file-list>
    <welcome-file>index.html</welcome-file>
    <welcome-file>index.jsp</welcome-file>
</welcome-file-list>

<!-- 配置错误页面 -->
<error-page>
    <error-code>404</error-code>
    <location>/404.html</location>
</error-page>
<error-page>
    <error-code>500</error-code>
    <location>/500.html</location>
</error-page>
```

### tomcat-users.xml（管理用户）

```xml
<!-- 配置管理界面的用户和角色 -->
<role rolename="manager-gui"/>
<role rolename="admin-gui"/>
<user username="admin" password="admin123" roles="manager-gui,admin-gui"/>
```

>  生产环境中不要使用默认密码！

## 部署 Web 应用

### 方式一：直接放入 webapps 目录

```bash
# 将 WAR 包放入 webapps 目录
cp myapp.war /Library/tomcat10/webapps/

# Tomcat 会自动解压并部署
# 访问 http://localhost:8080/myapp
```

### 方式二：配置 Context 路径

在 `conf/Catalina/localhost/` 下创建 `myapp.xml`：

```xml
<Context docBase="/path/to/myapp" path="/myapp" reloadable="true" />
```

### 方式三：Spring Boot 嵌入式（推荐）

现代项目不需要单独安装 Tomcat，Spring Boot 内置了嵌入式容器：

```xml
<!-- Spring Boot 默认内置 Tomcat -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

```yaml
# application.yml（Spring Boot 3.x，Boot 2.x 为 server.tomcat.max-threads）
server:
  port: 8080
  tomcat:
    threads:
      max: 200
      min-spare: 10
    accept-count: 100
```

## 常见问题排查

### 启动失败

```text
排查步骤：
1. 检查端口是否被占用
   → lsof -i :8080
   → kill -9 <PID>

2. 检查 JAVA_HOME 是否配置
   → echo $JAVA_HOME

3. 检查 catalina.out 日志
   → tail -f logs/catalina.out

4. 检查 conf/ 目录下配置文件语法
```

### 启动日志乱码

```properties
# Windows 控制台日志乱码时改为 GBK；Linux/UTF-8 终端保持 UTF-8
java.util.logging.ConsoleHandler.encoding = GBK
```

### 端口被占用

```bash
# 查找占用 8080 端口的进程
lsof -i :8080

# 杀掉进程
kill -9 <PID>

# 或修改 conf/server.xml 中的端口号
<Connector port="8888" protocol="HTTP/1.1" ... />
```

### 内存溢出

```bash
# 设置 JVM 内存参数
export JAVA_OPTS="-Xms256m -Xmx512m -XX:MaxMetaspaceSize=256m"

# 启动 Tomcat
catalina.sh run
```

## 面试要点

1. **Tomcat 的默认端口号是多少？如何修改？**
   - 默认 8080，在 `server.xml` 中修改 `<Connector port="8888">`

2. **Tomcat 的目录结构？webapps 目录的作用？**
   - webapps 是默认应用部署目录，放入 WAR 包自动解压部署

3. **Tomcat 如何配置 HTTPS？**
   - 生成证书 → 在 `server.xml` 中配置 `<Connector port="8443" protocol="org.apache.coyote.http11.Http11NioProtocol" SSLEnabled="true" ...>` 并指定证书存储

4. **Tomcat 和 Spring Boot 的关系？**
   - Spring Boot 内置了嵌入式 Tomcat，无需单独安装
   - 也可以替换为 Jetty 或 Undertow

## 版本差异(Tomcat 8/9 → Tomcat 10.1/11)

| 特性 | 旧版（本文编写时，Tomcat 8/9） | 当前（Tomcat 10.1/11） |
|------|-------------------------------|------------------------|
| 命名空间 | javax.servlet.* | jakarta.servlet.*（Tomcat 10 起） |
| Servlet 版本 | Servlet 3.1/4.0 | Servlet 6.0/6.1 |
| JDK 要求 | JDK 8+ | Tomcat 10.1 需 JDK 11+，Tomcat 11 需 JDK 17+ |
| 虚拟线程 | 无 | Tomcat 10.1.20+ 配合 JDK 21 支持虚拟线程 |
| 安装方式 | 独立安装 | 新项目推荐 Spring Boot 内嵌（无需安装） |

> 若仍需要独立部署 Tomcat，请安装 Tomcat 10.1+ 并注意 jakarta 包名；Spring Boot 3.5.x 项目无需单独安装 Tomcat。
