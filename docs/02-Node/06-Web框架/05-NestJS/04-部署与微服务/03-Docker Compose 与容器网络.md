---
title: Docker Compose 与容器网络
description: "多个容器（Nest、Mysql、Redis）手动 docker run 部署麻烦、还要处理启动顺序，用 Docker Compose 编排批量启动，并通过桥接网络实现容器间按容器名直接通信。"
keywords: [Docker, Compose, 桥接网络, 容器通信, depends_on]
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# Docker Compose 与容器网络

学习了 Nest、Mysql、Redis，并且在 Nest 里远程连接 Mysql 和 Redis 来做数据存储、增删改查。Mysql 和 Redis 都是跑在 Docker 容器里的。部署 Nest 项目的时候也是跑 dockerfile + docker build 产生的镜像。这就涉及到了 3 个 Docker 容器：Nest、Mysql、Redis，后面可能还会涉及更多。

那么问题来了，每次想把项目跑起来都要 docker run 一堆镜像也太麻烦了，有没有什么简便方式呢？而且，这么多的容器怎么保证启动顺序呢？解决方式就是 Docker Compose。

## 一、为什么需要 Docker Compose

先来看看不用 Docker Compose 的时候怎么部署。创建一个 nest 项目：

```
nest new docker-compose-test -p npm
```

安装 typeorm、mysql2：

```
npm install --save @nestjs/typeorm typeorm mysql2
```

在 AppModule 引入 TypeOrmModule：

```javascript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "mysql",
      host: "localhost",
      port: 3306,
      username: "root",
      password: "guang",
      database: "aaa",
      synchronize: true,
      logging: true,
      entities: [],
      poolSize: 10,
      connectorPackage: 'mysql2',
      extra: {
          authPlugin: 'caching_sha2_password',
      }
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

这里的 database 在 mysql workbench 里创建：

```sql
CREATE DATABASE `aaa` DEFAULT CHARACTER SET utf8mb4 ;
```

添加一个 aaa.entity.ts：

```javascript
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Aaa {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        length: 30
    })
    aaa: string;

    @Column({
        length: 30
    })
    bbb: string;
}
```

在 entities 里注册下，然后把 nest 服务跑起来（`npm run start:dev`），可以看到执行了 create table 的 sql，说明 mysql 连接成功了。

再引入 redis：

```
npm install redis
```

添加一个 redis client 的 provider：

```javascript
{
  provide: 'REDIS_CLIENT',
  async useFactory() {
    const client = createClient({
        socket: {
            host: 'localhost',
            port: 6379
        }
    });
    await client.connect();
    return client;
  }
}
```

在 AppController 里注入：

```javascript
import { Controller, Get, Inject } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Inject('REDIS_CLIENT')
  private redisClient: RedisClientType;

  @Get()
  async getHello() {
    const keys = await this.redisClient.keys('*');
    console.log(keys);

    return this.appService.getHello();
  }
}
```

这里用到的 mysql、redis 都是之前通过 docker 跑的容器。

### 1.1 多容器手动部署的问题

假设 nest 服务开发完了，想部署，那就要写这样的 dockerfile（用多阶段构建 + alpine 基础镜像）：

```docker
FROM node:22-alpine3.20 as build-stage

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

# production stage
FROM node:22-alpine3.20 as production-stage

COPY --from=build-stage /app/dist /app
COPY --from=build-stage /app/package.json /app/package.json

WORKDIR /app

RUN npm install --omit=dev

EXPOSE 3000

CMD ["node", "/app/main.js"]
```

在根目录添加这个 Dockerfile，然后 docker build 一下：

```
docker build -t eee .
```

在服务器上，没有 docker desktop，需要通过命令行方式部署。先跑 mysql 的容器：

```
docker run -d -p 3306:3306 -v /Users/guang/mysql-data:/var/lib/mysql --name mysql-container mysql
```

- -d 是 daemon，放到后台运行
- -p 是端口映射
- -v 是挂载数据卷，把宿主机目录映射到容器内的目录（要换成你自己的）
- -name 是容器名
- 可能还需要 -e MYSQL_ROOT_PASSWORD=xxx 设置 root 用户的密码

再跑 redis 的容器：

```
docker run -d -p 6379:6379 -v /Users/guang/aaa:/data --name redis-container redis
```

然后跑 nest 的：

```
docker run -d -p 3000:3000 --name nest-container eee
```

看下 3 个容器的日志。这时候你会发现报错了，说是 127.0.0.1 的 6379 端口连不上。为什么呢？因为这时候 127.0.0.1 就是容器内的端口了，不是宿主机的。所以要把 ip 换成宿主机 ip 才行。查一下本机的 ip，然后改 AppModule 里的 redis 和 mysql 连接信息，重新 build 镜像 `docker build -t fff .`，删掉旧容器 `docker rm nest-container`，再跑起来就正常了。

可以发现，手动部署跑了多次 docker build，而且还要注意顺序，不然 nest 服务跑起来了但 mysql 服务没跑起来就会报错。

### 1.2 Docker Compose 批量编排

Docker Compose 可以解决这种问题。把 3 个容器停掉：

```
docker stop nest-container mysql-container redis-container
```

然后在根目录添加一个 docker-compose.yml：

```yaml
services:
  nest-app:
    build:
      context: ./
      dockerfile: ./Dockerfile
    depends_on:
      - mysql-container
      - redis-container
    ports:
      - '3000:3000'
  mysql-container:
    image: mysql
    ports:
      - '3306:3306'
    volumes:
      - /Users/guang/mysql-data:/var/lib/mysql
    environment:
      MYSQL_DATABASE: aaa
      MYSQL_ROOT_PASSWORD: guang
  redis-container:
    image: redis
    ports:
      - '6379:6379'
    volumes:
      - /Users/guang/aaa:/data
```

每个 services 都是一个 docker 容器，名字随便指定。这里指定了 nest-app、mysql-container、redis-container 3 个 service。然后 nest-app 配置了 depends_on 其他两个 service，这样 docker compose 就会先启动另外两个，再启动这个，解决顺序问题。mysql-container、redis-container 的 service 指定了 image 和 ports、volumes 的映射。mysql 容器跑的时候还要指定 MYSQL_DATABASE（自动创建的 database）和 MYSQL_ROOT_PASSWORD 环境变量。nest-app 指定了 context 下的 dockerfile 路径和端口映射。

然后通过 docker compose 把它跑起来：

```
docker compose up
```

docker compose 是 docker CLI 的插件子命令，docker 能用，docker compose 就能用。它会把所有容器的日志合并输出。可以看到是先跑的 mysql、redis，再跑的 nest，只不过 mysql 服务启动有点慢会连接失败几次，最后会成功。

这样，只需要定义 docker-compose.yml 来声明容器的顺序和启动方式，之后执行 docker compose up 一条命令就能按照顺序启动所有的容器。启动流程就简便了很多。

## 二、桥接网络：容器通信的最简单方式

上面 docker compose 涉及多个容器通信时，是通过指定宿主机 ip 和端口的方式：因为 mysql、redis 的容器都映射到了宿主机的端口，那 nest 的容器就可以通过宿主机实现和其他容器的通信。

前面 Docker 实现原理讲过，Docker 通过 Namespace 的机制实现容器隔离，其中就包括 Network Namespace。每个容器都有独立的 Network Namespace，容器内的 127.0.0.1 指的是容器自己，所以不能通过它访问别的容器的服务。

Docker 支持创建一个虚拟网络（网桥），把多个容器都接入这个网络，它们之间就可以直接互访了，这种方式叫做**桥接网络**。

### 2.1 通过 docker network 创建

通过 docker network 创建：

```
docker network create common-network
```

然后把之前的 3 个容器停掉、删除：

```
docker stop mysql-container redis-container nest-container
docker rm mysql-container redis-container nest-container
```

这次跑的时候要指定 --network：

```
docker run -d --network common-network -v /Users/guang/mysql-data:/var/lib/mysql --name mysql-container mysql
docker run -d --network common-network -v /Users/guang/aaa:/data --name redis-container redis
```

通过 --network 指定桥接网络为刚创建的 common-network，不需要指定和宿主机的端口映射。然后 nest 的部分要改成用容器名来访问 redis、mysql（修改 AppModule 的代码），docker build 之后 docker run：

```
docker build -t mmm .
docker run -d --network common-network -p 3000:3000 --name nest-container mmm
```

nest 容器是要指定和宿主机的端口映射的，因为宿主机要访问这个端口的网页。docker logs 看下日志，sql 语句打印说明 mysql 连接成功，redis 的 key 打印说明 redis 也连接成功。

这就是桥接网络。之前是通过宿主机 ip 来互相访问，现在可以通过容器名直接互相访问了。原理是 Docker 在宿主机上创建了一个 linux 网桥，每个容器都通过虚拟网卡接到这个网桥上，并且 Docker 内置了 DNS，可以用容器名解析出对方容器的 ip。比起端口映射到宿主机再访问宿主机 ip 的方式，简便太多了。

### 2.2 在 Docker Compose 中配置桥接网络

之前的多容器配置是映射宿主机端口然后用宿主机 ip 访问，现在改成：

```yml
services:
  nest-app:
    build:
      context: ./
      dockerfile: ./Dockerfile
    depends_on:
      - mysql-container
      - redis-container
    ports:
      - '3000:3000'
    networks:
      - common-network
  mysql-container:
    image: mysql
    volumes:
      - /Users/guang/mysql-data:/var/lib/mysql
    environment:
      MYSQL_DATABASE: aaa
      MYSQL_ROOT_PASSWORD: guang
    networks:
      - common-network
  redis-container:
    image: redis
    volumes:
      - /Users/guang/aaa:/data
    networks:
      - common-network
networks:
  common-network:
    driver: bridge
```

（早期的 docker-compose.yml 需要在顶部通过 `version` 字段声明配置格式版本，Compose V2 已废弃该字段，现在不用再写。）把 mysql-container、redis-container 的 ports 映射去掉，指定桥接网络为 common-network。然后下面通过 networks 指定创建的 common-network 桥接网络，网络驱动程序指定为 bridge。其实一直用的网络驱动程序都是 bridge，它的含义是容器的网络和宿主机网络是隔离开的，但是可以做端口映射，比如 -p 3000:3000、-p 3306:3306 这样。

然后执行：

```
docker compose down --rmi all
```

删除 3 个容器和它们的镜像，之后再 docker compose up 就会先 build dockerfile 产生镜像，然后把 3 个镜像跑起来。

不过，其实不指定 networks 也可以，docker compose 会创建个默认的网络。把 networks 部分注释掉重新跑，你会发现它创建了一个默认的 network，mysql 和 redis 的访问都是正常的。所以，不手动指定 networks，也是可以用桥接网络的。

## 总结

不用 Docker Compose 的方式需要手动 docker build 来构建 nest 应用的镜像，然后按顺序使用 docker run 来跑 mysql、redis、nest 容器（要注意 nest 容器里需要使用宿主机 ip 来访问 mysql、redis 服务）。

而 docker compose 就只需要写一个 docker-compose.yml 文件，配置多个 service 的启动方式和 depends_on 依赖顺序，然后 docker compose up 就可以批量按顺序启动一批容器。基本上，跑 Nest 项目都会依赖别的服务，所以在单台机器跑的时候都是需要用 Docker Compose 的。

多个容器之间的通信方式，用桥接网络是最简便的。通过 docker network create 创建一个桥接网络，然后 docker run 的时候指定 --network，这样 3 个容器就可以通过容器名互相访问了。在 docker-compose.yml 配置下 networks 创建桥接网络，然后添加到不同的 service 上即可。或者不配置 networks，docker compose 会生成一个默认的。实现原理是每个容器依然有独立的 Network Namespace，但虚拟网卡都接入同一个网桥，通过 Docker 内置的 DNS 就能用容器名互访了。