---
title: Dockerfile 编写与优化
description: "Dockerfile 编写与优化：.dockerignore 语法、Nest 项目 Dockerfile 的编写，以及多阶段构建、alpine 基础镜像、ARG/ENV、CMD 与 ENTRYPOINT、ADD 与 COPY、非 root 用户运行等镜像优化与安全技巧。"
keywords: [Dockerfile, Nest, 多阶段构建, alpine, 优化, 安全]
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# Dockerfile 编写与优化

## 一、Nest 项目如何编写 Dockerfile

首先思考一个问题：dockerfile 是在哪里 build 的，在命令行工具里，还是在 docker 守护进程呢？

答案是在守护进程 docker daemon。我没启动 docker daemon 的时候是不能 build 的，启动之后才可以。命令行工具会和 docker daemon 交互来实现各种功能。

比如 docker build 的时候，会把 dockerfile 和它的构建上下文（也就是所在目录）打包发送给 docker daemon 来构建镜像：

```shell
docker build -t name:tag -f filename .
```

这个 . 就是构建上下文的目录，你也可以指定别的路径。而镜像自然是越小性能越好，所以 docker 支持你通过 .dockerignore 声明哪些不需要发送给 docker daemon。

### 1.1 .dockerignore 语法

.dockerignore 是这样写的：

```
*.md
!README.md
node_modules/
[a-c].txt
.git/
.DS_Store
.vscode/
.dockerignore
.eslintignore
.eslintrc
.prettierrc
.prettierignore
```

- \*.md 就是忽略所有 md 结尾的文件，然后 !README.md 就是其中不包括 README.md
- node\_modules/ 就是忽略 node\_modules 下的所有文件
- \[a-c].txt 是忽略 a.txt、b.txt、c.txt 这三个文件
- .DS\_Store 是 mac 的用于指定目录的图标、背景、字体大小的配置文件，这个一般都要忽略
- eslint、prettier 的配置文件在构建镜像的时候也用不到

**docker build 时，会先解析 .dockerignore，把该忽略的文件忽略掉，然后把剩余文件打包发送给 docker daemon 作为上下文来构建产生镜像。**这就像你在 git add 的时候，.gitignore 下配置的文件也会被忽略一样。忽略这些用不到的文件，是为了让构建更快、镜像体积更小。

### 1.2 Nest 项目 Dockerfile

新建个项目：

```shell
nest new dockerfile-test -p npm
```

编写 .dockerignore：

```
*.md
node_modules/
.git/
.DS_Store
.vscode/
.dockerignore
```

编写 Dockerfile：

```docker
FROM node:22

WORKDIR /app

COPY package.json .

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD [ "node", "./dist/main.js" ]
```

基于 node 22 的镜像，指定当前目录为容器内的 /app。把 package.json 复制到容器里，设置淘宝的 npm registry，执行 npm install。之后把其余的文件复制过去，执行 npm run build。指定暴露的端口为 3000，容器跑起来以后执行 node ./dist/main.js 命令。

然后执行 docker build：

```
docker build -t nest:first .
```

镜像名为 nest、标签为 first，构建上下文是当前目录。如果在 build 的时候报 runc 的错，需要加一行：`RUN ln -s /sbin/runc /usr/bin/runc`。

但现在 docker 镜像还是不完美的。这样构建出来的镜像有什么问题呢？明显，src 等目录就不再需要了，构建的时候需要这些，但运行的时候只需要 dist 目录就可以了。把这些文件包含在内，会让镜像体积变大。那怎么办呢？

构建两次么？第一次构建出 dist 目录，第二次再构建出跑 dist/main.js 的镜像。那不是要两个 dockerfile？确实需要构建两次，但只需要一个 dockerfile 就可以搞定，这需要用到 dockerfile 的多阶段构建的语法：

```docker
# build stage
FROM node:22 as build-stage

WORKDIR /app

COPY package.json .

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install

COPY . .

RUN npm run build

# production stage
FROM node:22 as production-stage

COPY --from=build-stage /app/dist /app
COPY --from=build-stage /app/package.json /app/package.json

WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install --omit=dev

EXPOSE 3000

CMD ["node", "/app/main.js"]
```

通过 FROM 继承镜像的时候，给当前镜像指定一个名字，比如 build-stage。然后第一个镜像执行 build。之后再通过 FROM 继承 node 镜像创建一个新镜像。通过 COPY --from=build-stage 从那个镜像内复制 /app/dist 的文件到当前镜像的 /app 下。还要把 package.json 也复制过来，然后切到 /app 目录执行 npm install --omit=dev 只安装 dependencies 依赖。这个生产阶段的镜像就指定容器跑起来执行 node /app/main.js 就好了。

执行 docker build，打上 second 标签：

```
docker build -t nest:second .
```

对比下镜像体积，明显看出有减小，少的就是 src、test、构建阶段的 node\_modules 这些文件。这就是多阶段构建（multi-stage build）的魅力。

一般情况下还会用 alpine 基础镜像：

```docker
FROM node:22-alpine3.20 as build-stage

WORKDIR /app

COPY package.json .

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install

COPY . .

RUN npm run build

# production stage
FROM node:22-alpine3.20 as production-stage

COPY --from=build-stage /app/dist /app
COPY --from=build-stage /app/package.json /app/package.json

WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install --omit=dev

EXPOSE 3000

CMD ["node", "/app/main.js"]
```

node:22-alpine3.20 就是用 alpine 的 linux 的 3.20 版本，用 node 的 22 版本。然后再 docker build 一下：

```
docker build -t nest:ccc .
```

可以看到现在镜像体积只有 277M 了。一般都会用多阶段构建 + alpine 基础镜像。alpine 是一种高山植物，就是很少的养分就能存活，很贴合体积小的含义。

## 二、提升 Dockerfile 水平的 5 个技巧

Docker 是一种容器技术，它可以在操作系统上创建多个相互隔离的容器。容器内独立安装软件、运行服务。

但是，这个容器和宿主机还是有关联的，比如可以把宿主机的端口映射到容器内的端口、宿主机某个目录挂载到容器内的目录。比如映射了 3000 端口，那容器内 3000 端口的服务，就可以在宿主机的 3000 端口访问了。比如挂载了 /aaa 到容器的 /bbb/ccc，那容器内读写 /bbb/ccc 目录的时候，改的就是宿主机的 /aaa 目录。这分别叫做端口映射、数据卷（volume）挂载。

这个容器是通过镜像起来的，通过 docker run image-name：

```
docker run -p 3000:3000 -v /aaa:/bbb/ccc --name xxx-container xxx-image
```

- -p 指定端口映射，映射宿主机的 3000 到容器的 3000 端口
- -v 指定数据卷挂载，挂载宿主机的 /aaa 到容器的 /bbb/ccc 目录

这个镜像是通过 Dockerfile 经过 build 产生的。一般在项目里维护 Dockerfile，然后执行 docker build 构建出镜像、push 到镜像仓库，部署的时候 pull 下来用 docker run 跑起来。基本 CI/CD 也是这样的流程：CI 的时候 git clone 项目，根据 dockerfile 构建出镜像，打上 tag，push 到仓库。CD 的时候把打 tag 的镜像下下来，docker run 跑起来。

比如我创建一个 nest 项目：

```
npx nest new dockerfile-test -p npm
```

然后执行 npm run build，之后把它跑起来：

```
npm run build
node ./dist/main.js
```

这时候访问 http://localhost:3000 可以看到 hello world，说明服务跑成功了。那如何通过 Docker 部署这个服务呢？来写下 Dockerfile：

```docker
FROM node:22

WORKDIR /app

COPY package.json .

COPY *.lock .

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD [ "node", "./dist/main.js" ]
```

FROM 是继承基础镜像，WORKDIR /app 是指定当前目录为 /app，COPY 复制宿主机的 package.json 和 lock 文件到容器的当前目录，也就是 /app 下。RUN 是执行命令，这里执行了 npm install。然后再复制其余的文件到容器内。EXPOSE 指定容器需要暴露的端口是 3000。CMD 指定容器跑起来时执行的命令是 node ./dist/main.js。

然后通过 docker build 把它构建成镜像：

```
docker build -t dockerfile-test:first .
```

-t 是指定名字和标签，这里镜像名为 dockerfile-test 标签为 first。然后在 docker desktop 的 images 里就可以看到这个镜像了，就是现在镜像稍微大了点，有 1.45 G。先跑起来看看：

```
docker run -d -p 2333:3000 --name first-container dockerfile-test:first
```

-d 是后台运行，-p 指定端口映射，映射宿主机的 2333 端口到容器的 3000 端口，--name 指定容器名。然后浏览器访问 http://localhost:2333 就可以访问容器内跑的这个服务。

这就是 Dockerfile 构建成镜像，然后通过容器跑起来的流程。但是刚才也发现了，现在镜像太大了，有 1.45G 呢，怎么优化一下呢？

### 技巧一：使用 alpine 镜像，而不是默认的 linux 镜像

docker 容器内跑的是 linux 系统，各种镜像的 dockerfile 都会继承 linux 镜像作为基础镜像。比如刚刚创建的那个镜像，点开详情可以看到它的镜像继承关系，最终还是继承了 debian 的 Linux 镜像，这是一个 linux 发行版。但其实这个 linux 镜像可以换成更小的版本，也就是 alpine。它裁剪了很多不必要的 linux 功能，使得镜像体积大幅减小了。alpine 是高山植物，就是很少的资源就能存活的意思。

改下 dockerfile，使用 node:22-alpine3.20 的镜像，然后 docker build：

```
docker build -t dockerfile-test:second .
```

这次的 tag 为 second。体积足足小了 900M。跑跑看：

```
docker run -d -p 2334:3000 --name second-container dockerfile-test:second
```

浏览器访问下，依然是正常的。这就是第一个技巧。

### 技巧二：使用多阶段构建

看下这个 dockerfile，大家发现有啥问题没：为什么先复制 package.json 进去，安装依赖之后再复制其他文件，直接全部复制进去不就行了？

不是的，这两种写法的效果不同。docker 是分层存储的，dockerfile 里的每一行指令是一层，会做缓存。每次 docker build 的时候，只会从变化的层开始重新构建，没变的层会直接复用。也就是说如果 package.json 没变，那么就不会执行 npm install，直接复用之前的。那如果一开始就把所有文件复制进去呢？那不管 package.json 变没变，任何一个文件变了，都会重新 npm install，这样没法充分利用缓存，性能不好。

试试看就知道了：现在重新跑 docker build，不管跑多少次，速度都很快，因为文件没变，直接用了镜像缓存。改下 README.md 重新 build 花了 25s，其实是没有重新 npm install 的。改下 package.json 再跑 docker build，时间明显多了很多，过程中你可以看到在 npm install 那层停留了很长时间。

这就是为什么要先复制依赖文件的原因。那还能发现有没有什么别的问题么？问题就是源码和很多构建的依赖是不需要的，但是现在都保存在了镜像里。实际上只需要构建出来的 ./dist 目录下的文件还有运行时的依赖。

这时可以用多阶段构建：

```docker
FROM node:22-alpine3.20 as build-stage

WORKDIR /app

COPY package.json .

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install

COPY . .

RUN npm run build

# production stage
FROM node:22-alpine3.20 as production-stage

COPY --from=build-stage /app/dist /app
COPY --from=build-stage /app/package.json /app/package.json

WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install --omit=dev

EXPOSE 3000

CMD ["node", "/app/main.js"]
```

FROM 后面添加一个 as 来指定当前构建阶段的名字。通过 COPY --from=xxx 可以从上个阶段复制文件过来。然后 npm install 的时候添加 --omit=dev，这样只会安装 dependencies 的依赖。docker build 之后，只会留下最后一个阶段的镜像。也就是说，最终构建出来的镜像里是没有源码的，有的只是 dist 的文件和运行时依赖。这样镜像就会小很多。

来试试看：

```
docker build -t dockerfile-test:third -f 222.Dockerfile .
```

标签为 third，-f 是指定 Dockerfile 的名字。镜像体积比没有用多阶段构建的时候小了 250 M，而且依然能正常访问。这就是第二个技巧，多阶段构建。

### 技巧三：使用 ARG 增加构建灵活性

写一个 test.js：

```javascript
console.log(process.env.aaa);
console.log(process.env.bbb);
```

打印了环境变量 aaa、bbb。跑一下：

```
export aaa=1 bbb=2
node ./test.js
```

可以看到打印了这俩环境变量。然后写个 dockerfile，文件名是 333.Dockerfile：

```docker
FROM node:22-alpine3.20

ARG aaa
ARG bbb

WORKDIR /app

COPY ./test.js .

ENV aaa=${aaa} \
    bbb=${bbb}

CMD ["node", "/app/test.js"]
```

使用 ARG 声明构建参数，使用 \${xxx} 来取，然后用 ENV 声明环境变量。dockerfile 内换行使用 \。之后构建的时候传入构建参数：

```
docker build --build-arg aaa=3 --build-arg bbb=4 -t arg-test -f 333.Dockerfile .
```

通过 --build-arg xxx=yyy 传入 ARG 参数的值。然后跑起来：

```
docker run  --name fourth-container arg-test
```

这次不用 -d 后台运行，直接看下日志。可以看到容器内拿到的环境变量就是 ENV 设置的。也就是说 ARG 是构建时的参数，ENV 是运行时的变量。灵活使用 ARG，可以增加 dockerfile 的灵活性。这就是第三个技巧。

### 技巧四：CMD 结合 ENTRYPOINT

前面指定容器跑起来之后运行什么命令，用的是 CMD。其实还可以写成 ENTRYPOINT。这两种写法有什么区别么？来试试，写个 444.Dockerfile：

```docker
FROM node:22-alpine3.20

CMD ["echo", "光光", "到此一游"]
```

然后 build 并 run：

```
docker build -t cmd-test -f 444.Dockerfile .
docker run cmd-test
```

重点是用 CMD 的时候，启动命令是可以重写的：

```
docker run cmd-test echo "东东"
```

可以替换成任何命令。而用 ENTRYPOINT 就不会：

```docker
FROM node:22-alpine3.20

ENTRYPOINT ["echo", "光光", "到此一游"]
```

可以看到，用 ENTRYPOINT 时 docker run 传入的参数作为了 echo 的额外参数。这就是 ENTRYPOINT 和 CMD 的区别。一般还是 CMD 用的多点，可以灵活修改启动命令。

其实 ENTRYPOINT 和 CMD 是可以结合使用的：

```docker
FROM node:22-alpine3.20

ENTRYPOINT ["echo", "光光"]

CMD ["到此一游"]
```

当没传参数的时候，执行的是 ENTRYPOINT + CMD 组合的命令，而传入参数的时候，只有 CMD 部分会被覆盖。这就起到了默认值的作用。所以，用 ENTRYPOINT + CMD 的方式更加灵活。这是第四个技巧。

### 技巧五：COPY vs ADD

其实不只是 ENTRYPOINT 和 CMD 相似，dockerfile 里还有一对指令也比较相似，就是 ADD 和 COPY。这俩都可以把宿主机的文件复制到容器内。但有一点区别，就是对于 tar.gz 这种压缩文件的处理上。

创建一个 aaa 目录，下面添加两个文件，使用 tar 命令打包：

```
tar -zcvf aaa.tar.gz ./aaa
```

然后写个 555.Dockerfile：

```docker
FROM node:22-alpine3.20

ADD ./aaa.tar.gz /aaa

COPY ./aaa.tar.gz /bbb
```

docker build 生成镜像：

```
docker build -t add-test -f 555.Dockerfile .
```

docker run 跑起来，可以看到，ADD 把 tar.gz 给解压然后复制到容器内了，而 COPY 没有解压，它把文件整个复制过去了。也就是说，ADD、COPY 都可以用于把目录下的文件复制到容器内的目录下，但是 ADD 还可以解压 tar.gz 文件。一般情况下，还是用 COPY 居多。

### 技巧小结

Dockerfile 有挺多技巧：

- 使用 alpine 的镜像，而不是默认的 linux 镜像，可以极大减小镜像体积，比如 node:22-alpine3.20 这种
- 使用多阶段构建，比如一个阶段来执行 build，一个阶段把文件复制过去，跑起服务来，最后只保留最后一个阶段的镜像。这样使镜像内只保留运行需要的文件以及 dependencies
- 使用 ARG 增加构建灵活性，ARG 可以在 docker build 时通过 --build-arg xxx=yyy 传入，在 dockerfile 中生效，可以使构建过程更灵活。如果是想定义运行时可以访问的变量，可以通过 ENV 定义环境变量，值使用 ARG 传入
- CMD 和 ENTRYPOINT 都可以指定容器跑起来之后运行的命令，CMD 可以被覆盖，而 ENTRYPOINT 不可以，两者结合使用可以实现参数默认值的功能
- ADD 和 COPY 都可以复制文件到容器内，但是 ADD 处理 tar.gz 的时候，还会做一下解压

## 三、Docker 镜像构建优化实战

本节聚焦 Docker 镜像构建的优化技巧，包括多阶段构建策略、.dockerignore 配置、镜像体积压缩、构建速度提升，以及 Docker Compose 高级配置和生产级部署方案。

### 3.1 多阶段构建优化

**Nuxt3 应用完整 Dockerfile**：

```dockerfile
# ==================== 构建阶段 ====================
FROM node:18-alpine AS builder
WORKDIR /app
RUN npm config set registry https://registry.npmmirror.com
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ==================== 生产阶段 ====================
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/.output ./.output
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", ".output/server/index.mjs"]
```

**多阶段构建价值**：

| 阶段 | 包含内容 | 体积 |
|------|---------|------|
| 构建阶段 | 完整 node_modules + 源码 + 开发依赖 | ~800MB |
| 生产阶段 | 仅构建产物（.output） | ~150-250MB |

核心原理：构建阶段的 node_modules 和源码不会进入最终镜像，只有 `COPY --from=builder` 指定的文件会被保留。

**NestJS 应用 Dockerfile**：

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
```

NestJS 与 Nuxt3 的差异：NestJS 生产阶段需要 `npm install --omit=dev` 安装运行时依赖，而 Nuxt3 的 `.output` 已自带所有依赖。

### 3.2 .dockerignore 配置

```plaintext
# .dockerignore
node_modules
.nuxt
.output
dist
.git
.github
.DS_Store
*.log
.env*
```

| 排除项 | 原因 |
|--------|------|
| node_modules | 容器内重新安装，避免跨平台兼容问题 |
| .nuxt / .output / dist | 构建产物，容器内重新生成 |
| .git | 版本历史不需要进入镜像 |
| .env* | 敏感配置不应写入镜像 |

### 3.3 镜像构建与运行

```bash
# 构建带版本号的镜像
docker build -t my-app:1.0 .

# 查看镜像
docker images | grep my-app

# 强制无缓存构建
docker build --no-cache -t my-app:1.0 .

# 运行容器
docker run -d --name app -p 3000:3000 my-app:1.0

# 查看日志
docker logs -f app

# 进入容器调试
docker exec -it app sh

# 查看容器资源占用
docker stats app
```

### 3.4 Docker Compose 高级配置

**环境变量三种方式**：

```yaml
services:
  app:
    image: my-app:1.0
    restart: always
    ports:
      - "3000:3000"
    # 方式一：直接定义
    environment:
      - NODE_ENV=production
      - PORT=3000
    # 方式二：引用 .env 文件（推荐）
    env_file:
      - .env.production
```

```bash
# 方式三：命令行传递
docker run -e BASE_URL=http://api.example.com my-app:1.0
```

**完整生产配置**：

```yaml
services:
  app:
    image: my-app:1.0
    container_name: my-app-prod
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  app-network:
    driver: bridge
```

**常用命令**：

```bash
docker compose up -d          # 后台启动
docker compose down           # 停止并删除
docker compose ps             # 查看状态
docker compose logs -f app    # 查看日志
docker compose pull           # 拉取最新镜像
docker compose up -d --build  # 重新构建并启动
```

### 3.5 镜像优化技巧

**体积优化**：

| 策略 | 效果 |
|------|------|
| 使用 alpine 基础镜像 | 从 ~900MB 降至 ~150MB |
| 多阶段构建 | 排除开发依赖和源码 |
| .dockerignore | 减少构建上下文传输 |
| 合并 RUN 指令 | 减少镜像层数 |
| npm ci 代替 npm install | 确定性安装，无缓存 |

**构建速度优化**：

```dockerfile
# 利用 Docker 层缓存：先复制依赖文件，再复制源码
COPY package*.json ./
RUN npm ci              # 依赖不变时复用缓存
COPY . .                # 源码变化不影响依赖层缓存
RUN npm run build
```

**包管理工具选择（容器场景）**：

| 工具 | 容器场景推荐度 | 原因 |
|------|--------------|------|
| npm | 推荐 | 兼容性好，无软链接问题 |
| yarn | 推荐 | 确定性安装 |
| pnpm | 不推荐 | 软链接机制在容器内可能路径异常 |

### 3.6 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 构建失败找不到文件 | .dockerignore 排除了必要文件 | 检查排除规则 |
| 镜像体积过大 | 未使用多阶段构建 | 分离构建和生产阶段 |
| 容器启动即退出 | CMD 命令错误或端口未暴露 | `docker logs` 排查 |
| 端口冲突 | 宿主机端口被占用 | `netstat -tlnp` 检查并更换端口 |
| 环境变量未生效 | env_file 路径错误 | 确认路径相对于 docker-compose.yml |

**排查流程**：

```bash
docker ps -a                              # 容器状态
docker logs -f <container>                # 日志
docker exec -it <container> sh            # 进入调试
docker inspect <container> | grep -A5 Env # 检查环境变量
docker build --no-cache -t app:1.0 .      # 排除缓存问题
```

**最佳实践**：

- 始终使用多阶段构建，最终镜像只包含运行时必需文件
- 基础镜像锁定具体版本（`node:18-alpine`），避免 `latest`
- 利用层缓存：不常变化的层（依赖安装）放前面
- 生产镜像不以 root 运行（参见下节安全配置）
- 镜像标签使用 Git SHA 或语义化版本，便于追溯和回滚

## 四、Docker 安全性与命令实践

本节讲解 Docker 容器安全配置（USER 权限、最小权限原则）、Docker 命令体系（镜像管理、容器生命周期、调试命令），以及生产级安全 Dockerfile 配置方案。

### 4.1 为什么需要设置 USER

Docker 容器默认以 root 用户运行所有进程，存在以下风险：

| 风险 | 说明 |
|------|------|
| 文件系统访问 | 通过 Volume 可访问宿主机文件 |
| 系统文件破坏 | root 权限可修改系统关键文件 |
| 容器逃逸 | 权限过大增加逃逸攻击面 |
| 审计不合规 | 违反最小权限原则 |

`node:18-alpine` 镜像预创建了 `node` 用户：

```bash
# 查看镜像用户
docker run --rm node:18-alpine cat /etc/passwd | grep node
# node:x:1000:1000:Linux User,,,:/home/node:/bin/sh
```

- 用户名：`node`，UID/GID：1000
- 主目录：`/home/node`

### 4.2 安全 Dockerfile 配置

**完整安全配置示例**：

```dockerfile
# ==================== 构建阶段 ====================
ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-alpine AS builder

# 切换到非 root 用户
USER node
WORKDIR /home/node/app

# 复制文件并设置所有者
COPY --chown=node:node package*.json ./
RUN npm install
COPY --chown=node:node . .
RUN npm run build

# ==================== 生产阶段 ====================
FROM node:${NODE_VERSION}-alpine AS production

USER node
WORKDIR /home/node/app

COPY --from=builder --chown=node:node /home/node/app/.output ./.output

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", ".output/server/index.mjs"]
```

**关键配置说明**：

| 配置 | 作用 |
|------|------|
| `USER node` | 后续 RUN/CMD 以 node 用户执行 |
| `WORKDIR /home/node/app` | 工作目录在 node 用户主目录下，确保写权限 |
| `COPY --chown=node:node` | 文件所有者设为 node，避免权限不足 |
| `ARG NODE_VERSION` | 构建时变量，便于版本统一管理 |

**安全 vs 不安全对比**：

```dockerfile
# 不安全：默认 root 运行
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "app.js"]

# 安全：指定普通用户
FROM node:18-alpine
USER node
WORKDIR /home/node/app
COPY --chown=node:node . .
RUN npm install
CMD ["node", "app.js"]
```

### 4.3 Linux 权限基础

```bash
# 权限数字：r=4, w=2, x=1
chmod 755 /app        # rwxr-xr-x
chmod 644 config.js   # rw-r--r--

# 修改所有者
chown node:node /app
chown -R node:node /home/node/app
```

| 权限值 | 含义 |
|--------|------|
| 7 (rwx) | 读+写+执行 |
| 6 (rw-) | 读+写 |
| 5 (r-x) | 读+执行 |
| 4 (r--) | 只读 |

### 4.4 Docker 命令体系

**镜像管理**：

```bash
docker build -t app:1.0 .           # 构建镜像
docker images                        # 列出镜像
docker rmi app:1.0                   # 删除镜像
docker image prune                   # 清理无用镜像
docker tag app:1.0 registry/app:1.0 # 打标签
docker push registry/app:1.0        # 推送到仓库
docker pull 11-Nginx基础概述:alpine            # 拉取镜像
```

**容器生命周期**：

```bash
docker run -d --name app -p 3000:3000 app:1.0  # 创建并启动
docker start app                    # 启动已停止容器
docker stop app                     # 优雅停止（SIGTERM）
docker restart app                  # 重启
docker rm app                       # 删除容器
docker rm -f app                    # 强制删除运行中容器
```

**容器调试**：

```bash
docker ps                           # 运行中容器
docker ps -a                        # 所有容器
docker logs -f app                  # 实时日志
docker logs --tail 100 app          # 最近100行
docker exec -it app sh              # 进入容器
docker inspect app                  # 详细信息
docker stats app                    # 资源占用
docker cp app:/app/log.txt ./       # 复制文件出来
```

**Docker Compose 批量管理**：

```bash
docker compose up -d                # 后台启动所有服务
docker compose down                 # 停止并删除
docker compose down -v              # 同时删除数据卷
docker compose ps                   # 查看状态
docker compose logs -f app          # 查看指定服务日志
docker compose exec app sh          # 进入指定服务
docker compose pull                 # 拉取最新镜像
docker compose up -d --build        # 重新构建并启动
docker compose config               # 验证配置文件
```

### 4.5 生产级安全配置实战

**完整 docker-compose.yml**：

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_VERSION: 18
    container_name: my-app-prod
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    volumes:
      - app-logs:/home/node/app/logs    # 日志持久化
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    # 安全加固
    read_only: true                     # 只读文件系统
    tmpfs:
      - /tmp                            # 临时文件用 tmpfs
    security_opt:
      - no-new-privileges:true          # 禁止提权

volumes:
  app-logs:

networks:
  app-network:
    driver: bridge
```

**安全配置清单**：

| 配置项 | 作用 |
|--------|------|
| `USER node` | 非 root 运行 |
| `read_only: true` | 容器文件系统只读 |
| `no-new-privileges` | 禁止进程提权 |
| `tmpfs: /tmp` | 临时写入用内存文件系统 |
| `healthcheck` | 自动检测应用健康状态 |
| `env_file` | 敏感配置不入代码库 |

**常见问题**：

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| Permission denied | 文件所有者非当前 USER | 使用 `--chown=node:node` |
| 无法写入日志 | read_only 文件系统 | 挂载 Volume 或使用 tmpfs |
| npm install 失败 | node 用户无 /root/.npm 缓存权限 | 设置 `ENV npm_config_cache=/tmp/.npm` |
| 端口绑定失败 | 非 root 无法绑定 <1024 端口 | 使用 >1024 端口（如 3000） |

**最佳实践**：

- 所有生产镜像必须指定非 root USER
- WORKDIR 设在用户主目录下（`/home/node/app`）
- 使用 `COPY --chown` 而非先 COPY 再 RUN chown（减少层数）
- 敏感信息通过 env_file 或 Docker Secret 注入
- 定期清理无用镜像：`docker image prune -f`
- 使用 `docker compose config` 验证配置后再部署

## 总结

docker build 的时候会把构建上下文的所有文件打包发送给 docker daemon 来构建镜像。可以通过 .dockerignore 指定哪些文件不发送，这样能加快构建时间，减小镜像体积。此外，多阶段构建也能减小镜像体积，也就是 build 一个镜像、production 一个镜像，最终保留下 production 的镜像。而且一般使用 alpine 的基础镜像，类似 node:22-alpine3.20，这样构建出来镜像体积会小很多。

Dockerfile 有挺多技巧：使用 alpine 镜像、多阶段构建、ARG 增加构建灵活性、CMD 结合 ENTRYPOINT、COPY vs ADD。灵活使用这些技巧，可以让你的 Dockerfile 更加灵活、性能更好。

安全方面，所有生产镜像必须指定非 root USER，使用 `COPY --chown`、`read_only`、`no-new-privileges`、`env_file` 等方式加固容器安全。