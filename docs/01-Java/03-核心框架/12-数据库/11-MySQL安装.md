---
title: "MySQL安装"
description: "下面以 CentOS 7.x 环境为例，演示如何安装 MySQL 5.7.x，如果需要在其他 Linux 系统下安装其他版本的 MySQL，请读者自行在网络上查找对应的安装教程。"
keywords: [MySQL安装]
category: "Java"
tags: [Java, 数据库]
---


# MySQL 安装

## Windows 环境

1. 通过 [官方网站](https://www.mysql.com/) 提供的 [下载链接](https://dev.mysql.com/downloads/windows/installer/8.0.html) 下载“MySQL社区版服务器”安装程序，建议大家下载离线安装版的 MySQL Installer


2. 运行 Installer，按照下面的步骤进行安装。

    - 选择自定义安装。


    - 选择需要安装的组件。


    - 如果缺少依赖项，需要先安装依赖项。


    - 准备开始安装。


    - 安装完成。


    - 准备执行配置向导。


3. 执行安装后的配置向导。

    - 配置服务器类型和网络。


    - 配置认证方法（保护密码的方式）。


    - 配置用户和角色。


    - 配置Windows服务名以及是否开机自启。


    - 配置日志。


    - 配置高级选项。


    - 应用配置。


4. 可以在 Windows 系统的“服务”窗口中启动或停止 MySQL。


5. 配置 PATH 环境变量，以便在命令行提示符窗口使用 MySQL 客户端工具。

    - 打开 Windows 的“系统”窗口并点击“高级系统设置”。


    - 在“系统属性”的“高级”窗口，点击“环境变量”按钮。


    - 修改PATH环境变量，将MySQL安装路径下的`bin`文件夹的路径配置到PATH环境变量中。


    - 配置完成后，可以尝试在“命令提示符”下使用 MySQL 的命令行工具


## Linux 环境

下面以 CentOS 7.x 环境为例，演示如何安装 MySQL 5.7.x，如果需要在其他 Linux 系统下安装其他版本的 MySQL，请读者自行在网络上查找对应的安装教程。

1. 安装 MySQL。

   可以在 MySQL 官方网站下载安装文件。首先在下载页面中选择平台和版本，然后找到对应的下载链接，直接下载包含所有安装文件的归档文件，解归档之后通过包管理工具进行安装。

   ```Shell
   wget https://dev.mysql.com/get/Downloads/MySQL-5.7/mysql-5.7.26-1.el7.x86_64.rpm-bundle.tar
   tar -xvf mysql-5.7.26-1.el7.x86_64.rpm-bundle.tar
   ```

   如果系统上有 MariaDB 相关的文件，需要先移除 MariaDB 相关的文件。

   ```Shell
   yum list installed | grep mariadb | awk '{print $1}' | xargs yum erase -y
   ```

   更新和安装可能用到的底层依赖库。

   ```Bash
   yum update
   yum install -y libaio libaio-devel
   ```

   接下来可以按照如下所示的顺序用 RPM（Redhat Package Manager）工具安装 MySQL。

   ```Shell
   rpm -ivh mysql-community-common-5.7.26-1.el7.x86_64.rpm
   rpm -ivh mysql-community-libs-5.7.26-1.el7.x86_64.rpm
   rpm -ivh mysql-community-libs-compat-5.7.26-1.el7.x86_64.rpm
   rpm -ivh mysql-community-devel-5.7.26-1.el7.x86_64.rpm
   rpm -ivh mysql-community-client-5.7.26-1.el7.x86_64.rpm
   rpm -ivh mysql-community-server-5.7.26-1.el7.x86_64.rpm
   ```

   可以使用下面的命令查看已经安装的 MySQL 相关的包。

   ```Shell
   rpm -qa | grep mysql
   ```

2. 配置 MySQL。

   MySQL 的配置文件在`/etc`目录下，名为`my.cnf`，默认的配置文件内容如下所示。

   ```Shell
   cat /etc/my.cnf
   ```

   ```INI
   # For advice on how to change settings please see
   # http://dev.mysql.com/doc/refman/5.7/en/server-configuration-defaults.html
   
   [mysqld]
   #
   # Remove leading # and set to the amount of RAM for the most important data
   # cache in MySQL. Start at 70% of total RAM for dedicated server, else 10%.
   # innodb_buffer_pool_size = 128M
   #
   # Remove leading # to turn on a very important data integrity option: logging
   # changes to the binary log between backups.
   # log_bin
   #
   # Remove leading # to set options mainly useful for reporting servers.
   # The server defaults are faster for transactions and fast SELECTs.
   # Adjust sizes as needed, experiment to find the optimal values.
   # join_buffer_size = 128M
   # sort_buffer_size = 2M
   # read_rnd_buffer_size = 2M
   datadir=/var/lib/mysql
   socket=/var/lib/mysql/mysql.sock
   
   # Disabling symbolic-links is recommended to prevent assorted security risks
   symbolic-links=0
   
   log-error=/var/log/mysqld.log
   pid-file=/var/run/mysqld/mysqld.pid
   ```

   通过配置文件，我们可以修改 MySQL 服务使用的端口、字符集、最大连接数、套接字队列大小、最大数据包大小、日志文件的位置、日志过期时间等配置。当然，我们还可以通过修改配置文件来对 MySQL 服务器进行性能调优和安全管控。

3. 启动 MySQL 服务。

   可以使用下面的命令来启动 MySQL。

   ```Shell
   service mysqld start
   ```

   在 CentOS 7 中，更推荐使用下面的命令来启动 MySQL。

   ```Shell
   systemctl start mysqld
   ```

   启动 MySQL 成功后，可以通过下面的命令来检查网络端口使用情况，MySQL 默认使用`3306`端口。

   ```Shell
   netstat -ntlp | grep mysql
   ```

   也可以使用下面的命令查找是否有名为`mysqld`的进程。

   ```Shell
   pgrep mysqld
   ```

4. 使用 MySQL 客户端工具连接服务器。

   命令行工具：

   ```Shell
   mysql -u root -p
   ```

   > 说明：启动客户端时，`-u`参数用来指定用户名，MySQL 默认的超级管理账号为`root`；`-p`表示要输入密码（用户口令）；如果连接的是其他主机而非本机，可以用`-h`来指定连接主机的主机名或IP地址。

   如果是首次安装 MySQL，可以使用下面的命令来找到默认的初始密码。

   ```Shell
   cat /var/log/mysqld.log | grep password
   ```

   上面的命令会查看 MySQL 的日志带有`password`的行，在显示的结果中`root@localhost:`后面的部分就是默认设置的初始密码。

   进入客户端工具后，可以通过下面的指令来修改超级管理员（root）的访问口令为`123456`。

   ```SQL
   set global validate_password_policy=0;
   set global validate_password_length=6;
   alter user 'root'@'localhost' identified by '123456';
   ```

   > **说明**：MySQL 较新的版本默认不允许使用弱口令作为用户口令，所以上面的代码修改了验证用户口令的策略和口令的长度。事实上我们不应该使用弱口令，因为存在用户口令被暴力破解的风险。近年来，**攻击数据库窃取数据和劫持数据库勒索比特币**的事件屡见不鲜，要避免这些潜在的风险，最为重要的一点是**不要让数据库服务器暴露在公网上**（最好的做法是将数据库置于内网，至少要做到不向公网开放数据库服务器的访问端口），另外要保管好`root`账号的口令，应用系统需要访问数据库时，通常不使用`root`账号进行访问，而是**创建其他拥有适当权限的账号来访问**。

   再次使用客户端工具连接 MySQL 服务器时，就可以使用新设置的口令了。在实际开发中，为了方便用户操作，可以选择图形化的客户端工具来连接 MySQL 服务器，包括：

   - MySQL Workbench（官方工具）


   - Navicat for MySQL（界面简单友好）

   

## macOS 环境

macOS 系统安装 MySQL 是比较简单的，只需要从刚才说到的官方网站下载 DMG 安装文件并运行就可以了，下载的时候需要根据自己使用的是 Intel 的芯片还是苹果的 M1 芯片选择下载链接。


安装成功后，可以在“系统偏好设置”中找到“MySQL”，在这个偏好设置面板中，可以启动和停止 MySQL 服务器，也可以对 MySQL 核心文件的路径进行配置。


## 版本差异(MySQL 5.7 → 8.0/8.4)

| 特性 | 旧版（本文编写时，MySQL 5.7） | 当前（MySQL 8.0/8.4 LTS） |
|------|-----------------------------|--------------------------|
| 默认字符集 | utf8（需显式配置 utf8mb4） | utf8mb4（MySQL 8.0 起默认） |
| 索引 | 普通 B+Tree | 降序索引、隐藏索引、函数索引（8.0+） |
| SQL 能力 | 常规查询 | 递归 CTE、窗口函数（8.0+） |
| 版本策略 | 5.7 | 8.0（主流）/ 8.4 LTS / 9.x（创新版） |
| Java 驱动 | mysql-connector-java 5.x/8.0 | mysql-connector-j 8.x/9.x |

> 本文基于 MySQL 5.7 编写，核心概念（索引、事务、锁、MVCC、InnoDB）在 8.0/8.4 中依然适用；8.0 的默认字符集、隐藏索引与 SQL 增强（CTE/窗口函数）是升级后的主要差异。
