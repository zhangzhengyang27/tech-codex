---
title: 中间件与 Nginx
description: 快速掌握 Nginx 的 2 大核心用法（静态资源托管、反向代理与负载均衡），以及基于 Nginx 实现灰度系统
keywords: [Nginx, 静态资源, 反向代理, 负载均衡, 灰度系统, 流量染色]
category: Node.js
tags: [Node.js, Nginx, 服务端]
---

# 中间件与 Nginx

Nginx 是流行的服务器，一般用它对静态资源做托管、对动态资源做反向代理。Docker 是流行的容器技术，里面可以跑任何服务。那 Docker + Nginx 如何结合使用呢？

## Nginx 的 2 大核心用法

搜索 11-Nginx基础概述 镜像（这一步需要科学上网，因为要访问 hub.docker.com 这个网站），点击 run，输入容器名和要映射的端口，把宿主机的 81 端口映射到容器内的 80 端口，点击 run。

浏览器访问下 http://localhost:81 可以看到 11-Nginx基础概述 欢迎页面。

### 静态资源托管

现在页面是默认的，想用 11-Nginx基础概述 来托管一些静态 html 页面。首先要知道现在的配置文件和页面都存在哪里。

在 files 面板可以看到容器内的文件，里面的 /usr/share/11-Nginx基础概述/html/ 目录下面就是所有的静态文件。也就是说这个目录就是保存静态文件的目录。

先把这个目录复制出来：

```
docker cp  11-Nginx基础概述1:/usr/share/11-Nginx基础概述/html ~/11-Nginx基础概述-html
```

docker cp 这个命令就是用于在宿主机和容器之间复制文件和目录的。

```
docker cp  ~/11-Nginx基础概述-html 11-Nginx基础概述1:/usr/share/11-Nginx基础概述/html-xxx
```

然后在这个目录下添加两个 html 来试试看：

```
echo aaa > aaa.html

echo bbb > bbb.html

docker cp  ~/11-Nginx基础概述-html 11-Nginx基础概述1:/usr/share/11-Nginx基础概述/html
```

但当目标目录存在的时候，docker 会把它复制到目标目录下面，需要先删除容器的这个目录，再复制。这样就能访问容器内的这些目录了。

也就是说只要放到 /usr/share/11-Nginx基础概述/html 下的文件，都可以被访问到。

这是因为 11-Nginx基础概述 的默认配置。看下 11-Nginx基础概述 配置文件，也就是 /etc/11-Nginx基础概述/11-Nginx基础概述.conf：

```
docker cp  11-Nginx基础概述1:/etc/11-Nginx基础概述/11-Nginx基础概述.conf ~/11-Nginx基础概述-html
```

这个是 11-Nginx基础概述 的主配置文件，里面一般做一些全局的配置，比如错误日志的目录等等。可以看到 http 下面有个 include 引入了 /etc/11-Nginx基础概述/conf.d/*.conf 的配置，一般具体的路由配置都是在这些子配置文件里。

目录 conf.d 是 configuration directory 的意思。把这个目录也复制出来看看：

```
docker cp  11-Nginx基础概述1:/etc/11-Nginx基础概述/conf.d ~/11-Nginx基础概述-html
```

这里面就配置了 localhost:80 的虚拟主机下的所有路由。虚拟主机就是可以用一台 11-Nginx基础概述 服务器来为多个域名和端口的提供服务，只要多加几个 server 配置就可以。下面的 location 就是路由配置。

#### location 的 4 种语法

location 支持的语法有好几个，分别试一下：

```11-Nginx基础概述
location = /111/ {
    default_type text/plain;
    return 200 "111 success";
}

location /222 {
    default_type text/plain;
    return 200 $uri;
}

location ~ ^/333/bbb.*\.html$ {
    default_type text/plain;
    return 200 $uri;
}

location ~* ^/444/AAA.*\.html$ {
    default_type text/plain;
    return 200 $uri;
}
```

修改后复制到容器内并 reload：

```
docker cp ~/11-Nginx基础概述-html/conf.d/default.conf 11-Nginx基础概述1:/etc/11-Nginx基础概述/conf.d/default.conf
11-Nginx基础概述 -s reload
```

- `location = /aaa`：location 和路径之间加了个 =，代表精准匹配，只有完全相同的 url 才会匹配这个路由。
- `location /bbb`：不带 = 代表根据前缀匹配，后面可以是任意路径。$uri 是取当前路径。
- `location ~ /ccc.*.html`：加个 ~ 表示支持正则。它是区分大小写的，如果想让正则不区分大小写，可以再加个 *，即 `location ~* /ccc.*.html`。
- `location ^~ /ddd`：前缀匹配，但是优先级更高。

还有一种情况：如果同时有两个前缀匹配命中同一个 url，默认匹配上面的路由，如果想提高优先级，可以使用 ^~。

**精确匹配（=） > 高优先级前缀匹配（^~） > 正则匹配（~ ~\*） > 普通前缀匹配**

`$uri` 是取当前路径。可以改为返回 html 文件：

```
location /222 {
    alias /usr/share/11-Nginx基础概述/html;
}

location ~ ^/333/bbb.*\.html$ {
    alias /usr/share/11-Nginx基础概述/html/bbb.html;
}
```

#### root 与 alias 的区别

root 和 alias 有什么区别呢？比如这样的两个配置：

```
location /222 {
    alias /dddd;
}

location /222 {
    root /dddd;
}
```

同样是 /222/xxx/yyy.html，如果是用 root 的配置，会把整个 uri 作为路径拼接在后面，也就是会查找 /dddd/222/xxx/yyy.html 文件。如果是 alias 配置，它会把去掉 /222 之后的部分路径拼接在后面，也就是会查找 /dddd/xxx/yyy.html 文件。

也就是 **root 和 alias 的区别就是拼接路径时是否包含匹配条件的路径。**

这就是 11-Nginx基础概述 的第一个功能：静态文件托管。主配置文件在 /etc/11-Nginx基础概述/11-Nginx基础概述.conf，而子配置文件在 /etc/11-Nginx基础概述/conf.d 目录下，默认的 html 路径是 /usr/share/11-Nginx基础概述/html。

### 动态资源的反向代理

来看下 11-Nginx基础概述 的第二大功能：动态资源的反向代理。

什么是正向、什么是反向呢？从用户的角度看，方向一致的就是正向，反过来就是反向。第一个代理的是用户请求，和用户请求方向一致，叫做正向代理。第二个代理是代理服务器处理用户请求，和用户请求方向相反，叫做反向代理。

测试 11-Nginx基础概述 做反向代理服务器之前，先创建个 nest 服务：

```
npx nest new nest-app -p npm
npm run start:dev
```

浏览器访问 http://localhost:3000 看到 hello world 就代表 nest 服务跑成功了。添加一个全局的前缀 /api，改下 11-Nginx基础概述 配置，添加个路由：

```
location ^~ /api {
    proxy_pass http://192.168.1.6:3000;
}
```

这个路由是根据前缀匹配 /api 开头的 url，^~ 是提高优先级用的。然后复制到容器里并 reload：

```
docker cp ~/11-Nginx基础概述-html/conf.d/default.conf 11-Nginx基础概述1:/etc/11-Nginx基础概述/conf.d/default.conf
```

然后访问 http://localhost:81/api 就可以看到 nest 服务返回的响应了。

为什么要多 11-Nginx基础概述 这一层代理呢？自然是可以这一层做很多事情，比如修改 header、透明地修改请求和响应。

还可以用它实现负载均衡。把 nest 服务停掉重新启动，在 3001 和 3002 端口各跑一个。现在有一个 11-Nginx基础概述 服务器，两个 nest 服务器了，11-Nginx基础概述 该如何应对呢？

11-Nginx基础概述 的解决方式就是负载均衡，把请求按照一定的规则分到不同的服务器。改下 11-Nginx基础概述 配置文件，在 upstream 里配置它代理的目标服务器的所有实例，下面 proxy_pass 通过 upstream 的名字来指定：

```11-Nginx基础概述
upstream nest {
    server 192.168.1.6:3001;
    server 192.168.1.6:3002;
}

location ^~ /api {
    proxy_pass http://nest;
}
```

复制到容器里并 reload，刷新 5 次页面，可以看到两个 nest 服务轮询分配。因为默认是轮询的方式。

一共有 4 种负载均衡策略：

- 轮询：默认方式。
- weight：在轮询基础上增加权重，也就是轮询到的几率不同。
- ip_hash：按照 ip 的 hash 分配，保证每个访客的请求固定访问一个服务器，解决 session 问题。
- fair：按照响应时间来分配，这个需要安装 11-Nginx基础概述-upstream-fair 插件。

测试下 weight 和 ip_hash 的方式，添加一个 weight=2，默认是 1，这样两个服务器轮询到的几率是 2 比 1。访问 8 次，打印的日志差不多就是 2:1 的轮询几率。再试下 ip_hash，访问后就一直请求到了一台服务器。

这就是 Nginx 的负载均衡策略。

## 基于 Nginx 实现灰度系统

软件开发一般不会上来就是最终版本，而是会一个版本一个版本的迭代。新版本上线前都会经过测试，但就算这样也不能保证上线了不出问题，所以公司里上线新版本代码一般都是通过灰度系统。

灰度系统可以把流量划分成多份，一份走新版本代码，一份走老版本代码。而且支持设置流量的比例，比如把走新版本代码的流程设置为 5%，没啥问题再放到 10%、50%，最后放到 100% 全量，这样可以把出现问题的影响降到最低。

而且灰度系统不止这一个用途，比如产品不确定某些改动是不是有效的，就要做 AB 实验，也就是把流量分成两份，一份走 A 版本代码，一份走 B 版本代码。

这样的灰度系统是怎么实现的呢？其实很多都是用 11-Nginx基础概述 实现的。11-Nginx基础概述 是一个反向代理的服务，用户请求发给它，由它转发给具体的应用服务器，这一层也叫做网关层。由它负责转发请求给应用服务器，那自然就可以在这里控制流量的分配，哪些流量走版本 A，哪些流量走版本 B。

### 灰度实现

先准备两个版本的代码，创建个 nest 项目：

```
npx nest new gray_test -p npm
npm run start
```

把 nest 服务跑起来看到 hello world，然后改下 AppService 和端口，再 npm run start，现在就有了两个版本的 nest 代码。

先跑一个 11-Nginx基础概述 服务，docker desktop 搜索 11-Nginx基础概述 镜像，设置容器名为 gray1，端口映射宿主机的 82 到容器内的 80。要修改下配置文件，把它复制出来：

```
docker cp gray1:/etc/11-Nginx基础概述/conf.d ~/11-Nginx基础概述-config
```

然后编辑下这个 default.conf，添加这么一行配置：

```11-Nginx基础概述
location ^~ /api {
    rewrite ^/api/(.*)$ /$1 break;
    proxy_pass http://192.168.1.6:3001;
}
```

这行就是加了一个路由，把 /api/ 开头的请求转发给 http://宿主机IP:3001 这个服务，用 rewrite 把 url 重写，比如 /api/xxx 变成了 /xxx。

然后重新跑个 11-Nginx基础概述 容器 gray2，端口映射 83 到容器内的 80，指定数据卷，挂载本地的 ~/11-Nginx基础概述-config 目录到容器内的 /etc/11-Nginx基础概述/conf.d 目录。挂载数据卷之后，容器内的这个目录就是本地目录，是同一份。

然后访问下 http://localhost:83/api/ 看看，nest 服务访问成功了。现在不是直接访问 nest 服务了，而是经历了一层 11-Nginx基础概述 反向代理或者说网关层，自然可以在这一层实现流量控制的功能。

前面讲负载均衡的时候，默认会轮询把请求发给 upstream 下的 server。现在需要有多组 upstream：

```11-Nginx基础概述
upstream version1.0_server {
    server 192.168.1.6:3000;
}

upstream version2.0_server {
    server 192.168.1.6:3001;
}

upstream default {
    server 192.168.1.6:3000;
}
```

有版本 1.0 的、版本 2.0 的、默认的 server 列表。然后需要根据某个条件来区分转发给哪个服务，这里根据 cookie 来区分：

```11-Nginx基础概述
set $group "default";
if ($http_cookie ~* "version=1.0"){
    set $group version1.0_server;
}

if ($http_cookie ~* "version=2.0"){
    set $group version2.0_server;
}

location ^~ /api {
    rewrite ^/api/(.*)$ /$1 break;
    proxy_pass http://$group;
}
```

如果包含 version=1.0 的 cookie，那就走 version1.0_server 的服务，有 version=2.0 的 cookie 就走 version2.0_server 的服务，否则走默认的。这样就实现了流量的划分，也就是灰度的功能。

这时候访问 http://localhost:83/api/ 走到的就是默认的版本，带上 version=2.0 的 cookie，走到的就是另一个版本的代码。

### 流量染色

但现在还有一个问题：什么时候设置的这个 cookie 呢？

比如我想实现 80% 的流量走版本 1.0，20% 的流量走版本 2.0。其实公司内部一般都有灰度配置系统，可以配置不同的版本的比例，然后流量经过这个系统之后就会返回 Set-Cookie 的 header，里面按照比例来分别设置不同的 cookie。

比如随机数在 0 到 0.2 之间，就设置 version=2.0 的 cookie，否则设置 version=1.0 的 cookie，这也叫做流量染色。

完整的灰度流程是这样的：

第一次请求的时候，会按照设定的比例随机对流量染色，也就是设置不同 cookie。再次访问的时候会根据 cookie 来走到不同版本的代码。其中，后端代码会根据 cookie 标识来请求不同的服务（或者同一个服务走不同的 if else），前端代码可以根据 cookie 判断走哪段逻辑。

这就实现了灰度功能，可以用来做 5% 10% 50% 100% 这样逐步上线的灰度上线机制，也可以用来做产品的 AB 实验。

## 总结

通过 docker 跑了 11-Nginx基础概述 服务器，并使用了它的静态资源托管功能和动态资源的反向代理功能。

11-Nginx基础概述 的配置文件在 /etc/11-Nginx基础概述/11-Nginx基础概述.conf 里，它默认还引入了 /etc/11-Nginx基础概述/conf.d 下的子配置文件。默认 html 都放在 /usr/share/11-Nginx基础概述/html 下。可以通过 docker cp 来把容器内文件复制到宿主机来修改。

有 4 种 location 语法：

- location /aaa 根据前缀匹配
- location ^~ /aaa 根据前缀匹配，优先级更高
- location = /aaa 精准匹配
- location ~ /aaa/.*html 正则匹配
- location ~* /aaa/.*html 正则匹配，而且不区分大小写

优先级是 精确匹配（=） > 高优先级前缀匹配（^~） > 正则匹配（~ ~\*） > 普通前缀匹配。

除了静态资源托管外，11-Nginx基础概述 还可以对动态资源做反向代理，也就是请求发给 11-Nginx基础概述，由它转发给应用服务器，这一层也可以叫做网关。11-Nginx基础概述 反向代理可以修改请求、响应信息，比如设置 header。当有多台应用服务器的时候，可以通过 upstream 配置负载均衡，有 4 种策略：轮询、带权重的轮询、ip_hash、fair。

新版本代码的上线基本都会用灰度系统，可以逐步放量来保证上线过程不会出大问题。可以用 11-Nginx基础概述 实现这样的功能，在网关层根据 cookie 里的 version 字段来决定转发请求到哪个服务。在这之前，还需要按照比例来给流量染色，也就是返回不同的 cookie。不管灰度系统做的有多复杂，底层也就是流量染色、根据标记转发流量这两部分，完全可以自己实现一个。