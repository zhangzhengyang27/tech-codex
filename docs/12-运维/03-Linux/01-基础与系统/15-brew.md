---
title: "brew"
description: Homebrew 常用实践：安装与卸载、配置中科大镜像、30 个推荐工具、常用命令清单，以及用 brew 安装 JDK（jEnv 管理）、MySQL、Nginx、Python 与 Tomcat 的步骤
category: Linux 系统
---

# brew

[brew 官网](https://brew.sh/index_zh-cn)

[参考链接](https://juejin.cn/post/7113802155634458631?searchId=202308021509228FED127AB6267FA57DFD#heading-2)

## 安装brew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

- Run these commands in your terminal to add Homebrew to your PATH:
    echo >> /Users/zhangzhengyang/.zprofile
    echo 'eval "$(/usr/local/bin/brew shellenv)"' >> /Users/zhangzhengyang/.zprofile
    eval "$(/usr/local/bin/brew shellenv)"
```

删除
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"
```


## 配置镜像
1. 打开终端，运行命令：`cd "$(brew --repo)"` ，这会进入 Homebrew 的根目录
2. 运行命令：`git remote set-url origin https://mirrors.ustc.edu.cn/brew.git`，这会将 Homebrew 的远程仓库设置为中科大镜像；（当然，你也可以选择其他的镜像地址，比如清华大学、阿里云等）
3. 运行命令：`cd "$(brew --repo)/Library/Taps/homebrew/homebrew-core"`，这会进入 Homebrew 核心库的目录
4. 运行命令：`git remote set-url origin https://mirrors.ustc.edu.cn/homebrew-core.git`，这会将 Homebrew核心库 的远程仓库设置为中科大镜像；
5. 最后，运行命令：`brew update`，这会更新 Homebrew 的安装源，然后你就可以尽情享受飞一般的下载速度啦！

## 推荐

以下是我为您提供的30个常用的brew软件安装推荐：

1. wget - 用于从Web服务器下载文件
2. tree - 可以以树状图形式展示文件和目录
3. htop - 用于查看系统资源使用情况
4. nmap - 用于网络探测和安全审计
5. curl - 用于命令行方式访问Web服务器
6. ffmpeg - 用于音视频编解码和转换
7. imagemagick - 用于图像处理和转换
8. pandoc - 用于文档格式转换
9. git - 版本控制工具
10. tmux - 终端复用工具
11. lynx - 命令行方式的Web浏览器
12. jq - JSON数据处理工具
13. youtube-dl - 用于下载YouTube视频（已停止维护，可改用其分支 yt-dlp）
14. ranger - 终端文件管理器
15. ncdu - 用于磁盘空间使用情况分析
16. tig - Git可视化工具
17. zsh - 更好的命令行终端
18. neovim - Vim编辑器的现代化分支
19. fzf - 命令行模糊查找工具
20. fasd - 快速访问文件和目录的工具
21. the_silver_searcher - 高效的文本搜索工具
22. fd - 更快的文件搜索工具
23. ripgrep - 更快的文本搜索工具
24. exa - 更好的ls命令替代品
25. bat - 更好的cat命令替代品
26. tokei - 统计代码行数的工具
27. httpie - 更好的curl命令替代品
28. watch - 定时执行命令并输出结果
29. sshuttle - VPN 代理工具
30. mosh - 更好的SSH连接工具

## 命令

```bash
# 安装 firefox 软件
brew install --cask firefox
```

- `brew ls` 查看本地已安装的软件包；
- `brew search mongodb` 查找软件；
- `brew -v` 查看版本；
- `brew update` 更新版本；
- `brew install --cask firefox` 安装图形化界面软件
- `brew config` 查看配置

这里是 homebrew 常用命令的一个清单，可供参考

| 命令                          | 描述                     |
| ----------------------------- | ------------------------ |
| brew update                   | 更新 Homebrew            |
| brew search package           | 搜索软件包               |
| brew install package          | 安装软件包               |
| brew uninstall package        | 卸载软件包               |
| brew upgrade                  | 升级所有软件包           |
| brew upgrade package          | 升级指定软件包           |
| brew list                     | 列出已安装的软件包列表   |
| brew services command package | 管理 brew 安装软件包     |
| brew services list            | 列出 brew 管理运行的服务 |
| brew info package             | 查看软件包信息           |
| brew deps package             | 列出软件包的依赖关系     |
| brew help                     | 查看帮助                 |
| brew cleanup                  | 清除过时软件包           |
| brew link package             | 创建软件包符号链接       |
| brew unlink package           | 取消软件包符号链接       |
| brew doctor                   | 检查系统是否存在问题     |
| brew tap [user/repo]          | 将开源仓库添加到源       |

## brew 安装 JDK

执行 `brew search jdk` 查找有哪些可供安装的 JDK

![](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309201356524.png)

执行 `brew install openjdk@17` 安装 JDK

![image-20230920140342649](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309201422166.png)

上面报错，主要是因为权限不足

```bash
sudo chown -R $(whoami) /usr/local/share /usr/local/share/zsh /usr/local/share/zsh/site-functions
chmod u+w /usr/local/share /usr/local/share/zsh /usr/local/share/zsh/site-functions
```

### jEnv 管理 jdk 版本

[github.com/jenv/jenv](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fjenv%2Fjenv)

```bash
# 安装
brew install jenv

# 配置
echo 'export PATH="$HOME/.jenv/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(jenv init -)"' >> ~/.zshrc

# 添加
jenv add /usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home/

# 管理
jenv versions
jenv global 17.0.3
```

JDK 的安装路径可以通过下图的位置查找(`brew install openjdk@17` 给出的地址)

![image-20230920140729500](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309201407250.png)

## brew 安装 mysql

```bash
brew install mysql

brew services start mysql

mysql -u root
```

设置密码

```
SHOW VARIABLES LIKE 'validate_password%';
```

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309201419062.png)

首先需要设置密码的验证强度等级，先执行 `SET GLOBAL validate_password.policy=LOW;` 将验证强度设为 LOW，再执行 `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root1234';` 设置密码

## brew 安装 11-Nginx基础概述

```bash
brew install 11-Nginx基础概述
```

![image.png](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309201429112.png)

<img src="https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309201431712.png" alt="img" />

### 查看 11-Nginx基础概述 安装目录

```bash
open /usr/local/etc/11-Nginx基础概述/
```

![image.png](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309201438736.png)

打开目录下 **/usr/local/Cellar/11-Nginx基础概述**，执行如下命令可以查看到：

![image.png](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309201439135.png)

在该目录下可以看到一个名字为 html 的快捷方式的文件夹，进入该目录后，它有两个文件 `50x.html`和`index.html`

### 启动 11-Nginx基础概述 服务

```bash
brew services start 11-Nginx基础概述 

# 重启的命令是: 
brew services restart 11-Nginx基础概述
```

![image.png](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309201440600.png)

### 关闭 11-Nginx基础概述 服务

终端输入 `ps -ef|grep 11-Nginx基础概述` 获取到 11-Nginx基础概述 的进程号, 注意是找到“11-Nginx基础概述:master”的那个进程号

**注意：**

- kill -QUIT 72 （从容的停止，即不会立刻停止）

- kill -TERM 72 （立刻停止）

- kill -INT 72 （和上面一样，也是立刻停止）

## brew 安装 python 和 pip

```bash
brew install python3
python --version
```

会出现报错：zsh: command not found: python

添加 python 到 zsh 以便它在键入python命令时运行。可以通过在终端中运行以下命令来做到这一点：

```bash
echo "alias python=/usr/bin/python3" >> ~/.zshrc
```

这会将 zsh 配置文件配置为把 `python` 命令映射到 `/usr/bin/python3`。如果仍然遇到问题，请确保 `alias python=` 后面的路径与实际 python 安装路径一致。

```bash
source ~/.zshrc
python --version    
```

这时，python命令应该可以成功运行

### 安装 pip

```bash
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py

sudo python3 get-pip.py

pip --version
```

## brew 安装 tomcat

浏览器访问 http://localhost:8080 来验证 Tomcat 是否已经成功安装并运行。`/usr/local/Cellar/tomcat/10.1.13` 安装目录

```bash
brew install tomcat

# 启动 tomcat
catalina start

# 系统启动时自动启动 Tomcat
brew services start tomcat
```

![image-20230920150849526](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309201508677.png)

以下是一些常用的 Tomcat 命令：

- catalina start：启动 Tomcat 服务器。
- catalina stop：停止 Tomcat 服务器。
- catalina restart：重启 Tomcat 服务器。
- catalina run：以调试模式启动 Tomcat 服务器。
- catalina version：显示当前安装的 Tomcat 版本信息。
- catalina configtest：测试 Tomcat 配置文件是否正确。
- catalina jpda start：以调试模式启动 Tomcat 服务器，并监听来自远程调试器的连接。
- catalina jpda stop：停止监听来自远程调试器的连接

### 配置文件

server.xml 文件是服务器的主配置文件，可以设置端口号、设置域名或IP、默认加载的项目、请求编码等

```xml
<Connector port="8888" protocol="HTTP/1.1" connectionTimeout="20000" redirectPort="8443" />
```

tomcat-users.xml文件用来配置管理Tomcat服务器的用户与权限

```xml
<role rolename="manager-gui"/> <user username="admin" password="123456" roles="manager-gui"/>
```

部署项目

在 `/usr/local/Cellar/tomcat/10.1.13/libexec/webapps` 目录部署项目


注意：本地 mac 电脑的 tomcat 地址为 /Library/tomcat9/bin

