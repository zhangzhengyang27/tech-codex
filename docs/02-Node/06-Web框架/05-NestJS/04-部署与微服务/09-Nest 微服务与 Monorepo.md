---
title: Nest 微服务与 Monorepo
description: "之前写了很多 Http 服务了，这些服务都是单体架构的。单体架构就是所有业务逻辑都在一个服务里实现。这样有个问题：项目越来越大之后，模块越来越多，代码会越来越难以维护。并且因为代码都在一个项目里，不好扩展。"
keywords: [Nest, 微服务, TCP, Monorepo, Library]
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# Nest 微服务与 Monorepo

之前写了很多 Http 服务了，这些服务都是单体架构的。单体架构就是所有业务逻辑都在一个服务里实现。这样有个问题：项目越来越大之后，模块越来越多，代码会越来越难以维护。并且因为代码都在一个项目里，不好扩展。比如有的业务模块想多部署几个节点就做不到，只能整体扩展。

所以就有了拆分的需求，把业务模块拆成单独的微服务。拆分也很简单，就是把之前放在不同目录的业务模块放到不同的服务里，再加上通信就好了。

不过微服务和微服务之间一般不是用 http 来通信的。因为 http 的请求响应会携带大量的 header，增大了通信的开销。所以服务和服务之间没必要用 http，直接用 tcp 就好了。nest 里实现微服务以及之间的 tcp 通信也很简单。

## 一、创建微服务

创建个 nest 项目作为 http 服务向外提供接口：

```
nest new microservice-test-main
```

再创建一个作为提供 tcp 微服务通信端口的服务：

```
nest new microservice-test-user
```

### 1.1 改造微服务端

进入 microservice-test-user，安装微服务的包：

```
npm install @nestjs/microservices --save
```

然后修改应用启动方式。微服务不需要暴露 http 接口，只需要支持微服务的通信就行：

```javascript
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        port: 8888,
      },
    },
  );
  app.listen();
}
bootstrap();
```

这就是启动一个微服务，通信端口在 8888，用 TCP 方式通信。

然后暴露方法出去，这里暴露接口不再是 http 时的 @Get、@Post，而是这样：

```javascript
@MessagePattern('sum')
sum(numArr: Array<number>): number {
    return numArr.reduce((total, item) => total + item, 0);
}
```

接收一个数字数组，返回所有数字的和。这样，就创建了一个微服务。

### 1.2 在主服务连接微服务

进入 microservice-test-main，安装微服务相关的包：

```
npm install @nestjs/microservices --save
```

要引入连接微服务的客户端。在 AppModule 引入 ClientsModule 动态模块：

```javascript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: {
          port: 8888,
        },
      },
    ])
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

这里 register 参数是一个数组，也就是说你有多个微服务的时候，都依次写在这里就行。

引入了 ClientsModule 模块，就可以注入其中的 provider 来用了：

```javascript
@Inject('USER_SERVICE')
private userClient: ClientProxy;

@Get('sum')
calc(@Query('num') str) {
    const numArr = str.split(',').map((item) => parseInt(item));

    return this.userClient.send('sum', numArr);
}
```

注入的时候指定 token 为前面声明的微服务名字，注入的对象就是连接这个微服务的客户端代理。调用它的 send 方法，第一个是消息的名字，第二个是参数。这里的 sum 就是微服务那边声明的这个消息，参数就是那边声明的参数。

把两个服务都跑起来（`npm run start:dev`），然后浏览器访问 http://localhost:3000/sum?num=3,5,6，返回了 14，是 3 + 5 + 6 的结果。浏览器把 3、5、6 的参数传递给 http 服务，它给微服务发送消息把参数带过去，微服务计算后返回 14 给 http 服务，它再返回给浏览器。

### 1.3 Message 与 Event

前面在微服务里是用 @MessagePattern 声明要处理的消息。如果并不需要返回消息的话，可以用 @EventPattern 声明：

```javascript
@EventPattern('log')
log(str: string) {
    console.log(str);
}
```

然后在主服务里调用：

```javascript
this.userClient.emit('log', '求和')
```

注意：如果那边是 @MessagePattern 声明的方法，这边要用 send 方法调用；而 @EventPattern 声明的方法，这边要用 emit 方法调用。

### 1.4 TCP 通信内容分析

通过 wireshark 抓包（选择 loopback 网卡，过滤器 port 8888）可以看到：

```
{"pattern": "log", "data": "求和"}
{"pattern": "sum", "data": [1, 2, 3], "id": "3b4a92305a76109bf0e79"}
{"response": 6, "isDisposed": true, "id": "3b4a92305a76109bf0e79"}
```

前两个是主服务发送给微服务的，后面那个是微服务返回的。可以得出结论：

- 微服务之间的 tcp 通信的消息格式是 json
- 如果是 message 的方式，需要两边各发送一个 tcp 包，也就是一问一答的方式
- 如果是 event 的方式，只需要客户端发送一个 tcp 的包

## 二、Nest 的 Monorepo 和 Library

上节学习微服务时创建了 2 个 Nest 项目，如果微服务多了，可能会创建更多项目。那如果有 10 个微服务，就创建 10 个 Nest 项目的 git 仓库么？那肯定不行，太难维护了。这时候就需要 monorepo 了。

这样，同一个 git 仓库中存放多个 Nest 项目，外层叫做 workspace。就算是 10 个微服务项目，也能在一个 Git 仓库里管理起来。

### 2.1 创建 monorepo

Nest 是支持这种 monorepo 的方式的：

```
nest new monorepo-test
```

添加一个 aaa 的路由并建立端口，跑起来没问题。然后再添加一个 nest 项目：

```
nest g app app2
```

它删除了 src 和 test，并创建了 apps 目录。apps/monorepo-test 就是之前的 src、test 代码，而 apps/app2 就是新创建的 nest 项目（nest app）。

重新跑 `npm run start:dev`，跑的还是之前的 nest 项目，只不过换成了 webpack 编译。为什么换成 monorepo 之后还是跑之前项目呢？答案在 nest-cli.json 里：projects 下保存着多个 nest 项目的信息（根目录、入口文件、src 目录、编译配置文件），然后 sourceRoot 和 root 分别指向了默认项目的 src 目录和根目录。所以跑 nest start 的时候，依然跑的是之前的项目。

如果想跑另一个项目，就要这样：

```
npm run start:dev app2
```

原理也很简单，就是 nest cli 会根据 app 名字去读取对应的 tsconfig 文件。

### 2.2 创建 Library 复用代码

项目多了以后，难免有一些公共代码，这种公共代码怎么复用呢？这涉及到 nest 的另一个特性：library。

创建一个 library：

```
nest g lib lib1
```

它会让你指定一个前缀，这里用默认的 @app。然后会生成 libs/lib1 目录，在 src 下生成了 module、service 并把它们导出了。还在 tsconfig.json 的 paths 下添加了对应的别名配置，在 nest-cli.json 里也多了这样一个 projects 配置。

在 LibService 添加一个 xxx 方法：

```javascript
xxx() {
    return 'xxx';
}
```

然后在 monorepo-test 的 app 里导入 Lib1Module、注入 Lib1Service 并调用：

```javascript
@Inject(Lib1Service)
private lib : Lib1Service;

@Get('aaa')
aaa() {
    return 'aaa' + this.lib.xxx();
}
```

同样的方式在 app2 里也导入并使用它，然后分别把两个服务跑起来：

```
npm run start:dev

npm run start:dev app2
```

浏览器访问 http://localhost:3001/aaa 和 http://localhost:3000/bbb，可以看到引入的 library 中的模块生效了。如果你只是改 lib 下的代码，不想跑服务时，可以单独编译 lib 代码：`npm run start:dev lib1`。

### 2.3 构建与输出

现在 build 之后的代码是 webpack 打包的，删掉 dist 后执行：

```
npm run build
npm run build app2
npm run build lib1
```

分别产生 apps/monorepo-test/main.js、apps/app2/main.js、libs 下对应的输出。之所以 application 或者 library 都能知道输出目录在哪，是因为在 tsconfig.json 里配了。

## 总结

之前一直写的是单体的 http 服务，这样项目大了以后会难以维护和扩展。这时候可以通过微服务的方式把业务逻辑拆分到不同的微服务里。微服务之间通过 tcp 方式通信，在 nest 里需要用到 @nestjs/microservices 这个包。

微服务启动的时候不再调用 NestFactory.create 而是调用 NestFactory.createMicroservice 方法，指定 tcp 的端口。然后另一个服务里通过 ClientsModule 来注入连接这个微服务的代理对象，之后分别用 send、emit 方法来调用微服务的 @MessagePattern、@EventPattern 声明的方法。通过 wireshark 抓包分析发现微服务之间的通信是基于 json 的。

微服务项目可能会有很多个项目，为了方便管理，会使用 monorepo 的方式：在一个 git 仓库里管理多个项目。nest cli 支持 monorepo，只要执行 nest g app xxx 就会把项目变为 monorepo 的，在 apps 下保存多个 nest 应用。nest-cli.json 里配置了多个 projects 的信息以及默认的 project，npm run start:dev 或 npm run build 可以加上应用名来编译对应的 app。

此外，多个项目可能有公共代码，这时候可以用 nest g lib xxx 创建 library。library 保存在 libs 目录下，nest 会为 libs 创建别名，可以在其他 app 或者 lib 里用别名引入。这就是 nest 里创建 monorepo 以及通过 library 复用代码的方式。