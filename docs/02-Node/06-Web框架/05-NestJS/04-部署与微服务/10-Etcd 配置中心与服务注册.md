---
title: Etcd 配置中心与服务注册
description: "它其实是一个 key-value 的存储服务，k8s 就是用它来做的注册中心、配置中心。接下来会分别用 docker + etcdctl、Node（etcd3 客户端）、Nest（provider / 动态模块）三种方式走一遍。"
keywords: [Etcd, 配置中心, 注册中心, Nest, etcd3, 服务注册, 服务发现]
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# Etcd 配置中心与服务注册

微服务架构的系统都会有配置中心和注册中心，本文先讲清楚这两个组件的原理，再用 etcd 来实现。

它其实是一个 key-value 的存储服务，k8s 就是用它来做的注册中心、配置中心。接下来会分别用 docker + etcdctl、Node（etcd3 客户端）、Nest（provider / 动态模块）三种方式走一遍。

## 一、为什么需要配置中心和注册中心

先说配置中心：

系统中会有很多微服务，它们会有一些配置信息，比如环境变量、数据库连接信息等。这些配置信息散落在各个服务中，以配置文件的形式存在。这样你修改同样的配置需要去各个服务下改下配置文件，然后重启服务，就很麻烦。

如果有一个服务专门用来集中管理配置信息，每个微服务都从这里拿配置，可以统一的修改，并且配置更改后也会通知各个微服务。这个集中管理配置信息的服务就叫**配置中心**。

再就是注册中心：

微服务之间会相互依赖，共同完成业务逻辑的处理。如果某个微服务挂掉了，那所有依赖它的服务就都不能工作了。为了避免这种情况，会通过集群部署的方式，每种微服务部署若干个节点，并且还可能动态增加一些节点。

那么微服务 A 依赖了微服务 B 时，怎么知道 B 目前有哪些节点可用呢？答案是需要一个单独的服务来管理，这个服务就是**注册中心**：

- 微服务在启动的时候，向注册中心注册
- 销毁的时候向注册中心注销
- 并且定时发心跳包来汇报自己的状态
- 在查找其他微服务的时候，去注册中心查一下这个服务的所有节点信息，然后再选一个来用，这个叫做**服务发现**

这样微服务就可以动态的增删节点而不影响其他微服务了。虽然这是两种服务，但功能确实很类似，完全可以在一个服务里实现。可以做配置中心、注册中心的中间件还是挺多的，比如 nacos、apollo、etcd 等。

## 二、用 Docker 跑起 Etcd

通过 docker 把它跑起来。在 docker desktop 搜索 etcd 的镜像，点击 run：输入容器名，映射 2379 端口到容器内的 2379 端口，设置 ETCD_ROOT_PASSWORD 环境变量，也就是指定 root 的密码。然后就可以看到 etcd server 的 docker 镜像成功跑起来了。

它带了一个 etcdctl 的命令行工具，可以作为客户端和 etcd server 交互。常用的命令有这么几个：

```
etcdctl put key value
etcdctl get key
etcdctl del key
etcdctl watch key
```

就是对 key value 的增删改查和 watch 变动，还是比较容易理解的。

但是现在执行命令要加上 --user、--password 的参数才可以：

```
etcdctl get --user=root --password=guang key
```

如果不想每次都指定用户名密码，可以设置环境变量：

```
export ETCDCTL_USER=root
export ETCDCTL_PASSWORD=guang
```

这里的 password 就是启动容器的时候指定的那个环境变量。

设置几个 key：

```
etcdctl put /services/a xxxx
etcdctl put /services/b yyyy
```

之后可以 get 来查询他们的值：

```
etcdctl get /services/a
etcdctl get /services/b
```

也可以通过 --prefix 查询指定前缀的 key 的值：

```
etcdctl get --prefix /services
```

删除也是可以单个删和指定前缀批量删：

```
etcdctl del /services/a
etcdctl del --prefix /services
```

这样的 key-value 用来存储 服务名-链接信息，那就是注册中心，用来存储配置信息，那就是配置中心。

## 三、Node 集成 Etcd（etcd3 客户端）

创建个项目：

```
mkdir etcd-test
cd etcd-test
npm init -y
```

安装 etcd 的包：

```
npm install --save etcd3
```

创建 index.js，使用 etcd 官方提供的 npm 包 etcd3：

```javascript
const { Etcd3 } = require('etcd3');
const client = new Etcd3({
    hosts: 'http://localhost:2379',
    auth: {
        username: 'root',
        password: 'guang'
    }
});

(async () => {
  const services = await client.get('/services/a').string();
  console.log('service A:', services);

  const allServices = await client.getAll().prefix('/services').keys();
  console.log('all services:', allServices);

  const watcher = await client.watch().key('/services/a').create();
  watcher.on('put', (req) => {
    console.log('put', req.value.toString())
  })
  watcher.on('delete', (req) => {
    console.log('delete')
  })
})();
```

get、getAll、watch 这些 api 和 etcdctl 命令行差不多，很容易搞懂。

- get(xx) 是查询某个 key 的值
- getAll().prefix(xx).keys() 是查询某个字符串开头的 key
- watch().key(xx).create 则是创建某个 key 的监听器，监听他的 put 和 delete 事件

再 put 几个 key：

```
etcdctl put /services/a xxx
etcdctl put /services/b yyy
```

然后执行上面的 node 脚本，确实取到了 etcd server 中的值。然后在 etcdctl 里 put 修改下 /services/a 的值：

```
etcdctl put /services/a zzz
```

在 node 脚本这里收到了通知；再 del 试下：

```
etcdctl del /services/a
```

也收到了通知。这样，在 node 里操作 etcd server 就跑通了。

## 四、封装配置中心和注册中心工具函数

配置中心的实现比较简单，就是直接 put、get、del 对应的 key：

```javascript
// 保存配置
async function saveConfig(key, value) {
    await client.put(key).value(value);
}

// 读取配置
async function getConfig(key) {
    return await client.get(key).string();
}

// 删除配置
async function deleteConfig(key) {
    await client.delete().key(key);
}
```

使用起来也很简单：

```javascript
(async function main() {
    await saveConfig('config-key', 'config-value');
    const configValue = await getConfig('config-key');
    console.log('Config value:', configValue);
})();
```

你可以在这里存各种数据库连接信息、环境变量等各种配置。

然后是注册中心：服务注册：

```javascript
// 服务注册
async function registerService(serviceName, instanceId, metadata) {
    const key = `/services/${serviceName}/${instanceId}`;
    const lease = client.lease(10);
    await lease.put(key).value(JSON.stringify(metadata));
    lease.on('lost', async () => {
        console.log('租约过期，重新注册...');
        await registerService(serviceName, instanceId, metadata);
    });
}
```

注册的时候按照 `/services/服务名/实例id` 的格式来指定 key，也就是一个微服务可以有多个实例。设置了租约 10s，这个就是过期时间的意思，过期会自动删除。etcd3 的 lease 默认会自动发送 keepalive 保活；可以监听 lost 事件，在租约丢失后自动重新注册。当不再重新注册的时候，就代表这个服务挂掉了。

然后是服务发现：

```javascript
// 服务发现
async function discoverService(serviceName) {
    const instances = await client.getAll().prefix(`/services/${serviceName}`).strings();
    return Object.entries(instances).map(([key, value]) => JSON.parse(value));
}
```

服务发现就是查询 `/services/服务名` 下的所有实例，返回它的信息。

```javascript
// 监听服务变更
async function watchService(serviceName, callback) {
    const watcher = await client.watch().prefix(`/services/${serviceName}`).create();
    watcher.on('put', async event => {
        console.log('新的服务节点添加:', event.key.toString());
        callback(await discoverService(serviceName));
    }).on('delete', async event => {
        console.log('服务节点删除:', event.key.toString());
        callback(await discoverService(serviceName));
    });
}
```

通过 watch 监听 `/services/服务名` 下所有实例的变动，包括添加节点、删除节点等，返回现在的可用节点。

来测试下：

```javascript
(async function main() {
    const serviceName = 'my_service';

    await registerService(serviceName, 'instance_1', { host: 'localhost', port:3000 });
    await registerService(serviceName, 'instance_2', { host: 'localhost', port:3002 });

    const instances = await discoverService(serviceName);
    console.log('所有服务节点:', instances);

    watchService(serviceName, updatedInstances => {
        console.log('服务节点有变动:', updatedInstances);
    });
})();
```

跑起来确实能获得服务的所有节点信息。当在 etcdctl 里 del 一个服务节点的时候，这里也能收到通知：

```
etcdctl del /services/my_service/instance_2
```

这样，就实现了服务注册、服务发现功能。

有的同学可能问了：redis 不也是 key-value 存储的么？为什么不用 redis 做配置中心和注册中心？因为 redis 没法监听不存在的 key 的变化，而 etcd 可以，而配置信息很多都是动态添加的。当然，还有很多别的原因，毕竟 redis 只是为了缓存设计的，不是专门的配置中心、注册中心的中间件。专业的事情还是交给专业的中间件来干。

也在这里贴一份完整的工具函数：

```javascript
const { Etcd3 } = require('etcd3');
const client = new Etcd3({
    hosts: 'http://localhost:2379',
    auth: {
        username: 'root',
        password: 'guang'
    }
});

// 保存配置
async function saveConfig(key, value) {
    await client.put(key).value(value);
}

// 读取配置
async function getConfig(key) {
    return await client.get(key).string();
}

// 删除配置
async function deleteConfig(key) {
    await client.delete().key(key);
}

// 服务注册
async function registerService(serviceName, instanceId, metadata) {
    const key = `/services/${serviceName}/${instanceId}`;
    const lease = client.lease(10);
    await lease.put(key).value(JSON.stringify(metadata));
    lease.on('lost', async () => {
        console.log('租约过期，重新注册...');
        await registerService(serviceName, instanceId, metadata);
    });
}

// 服务发现
async function discoverService(serviceName) {
    const instances = await client.getAll().prefix(`/services/${serviceName}`).strings();
    return Object.entries(instances).map(([key, value]) => JSON.parse(value));
}

// 监听服务变更
async function watchService(serviceName, callback) {
    const watcher = await client.watch().prefix(`/services/${serviceName}`).create();
    watcher.on('put', async event => {
        console.log('新的服务节点添加:', event.key.toString());
        callback(await discoverService(serviceName));
    }).on('delete', async event => {
        console.log('服务节点删除:', event.key.toString());
        callback(await discoverService(serviceName));
    });
}

(async function main() {
    const serviceName = 'my_service';

    await registerService(serviceName, 'instance_1', { host: 'localhost', port:3000 });
    await registerService(serviceName, 'instance_2', { host: 'localhost', port:3002 });

    const instances = await discoverService(serviceName);
    console.log('所有服务节点:', instances);

    watchService(serviceName, updatedInstances => {
        console.log('服务节点有变动:', updatedInstances);
    });
})();
```

## 五、Nest 集成 Etcd（provider 方式）

学了 etcd 来做配置中心和注册中心，它比较简单，就是 key 的 put、get、del、watch 这些。虽然简单，它却是微服务体系必不可少的组件：服务注册、发现、配置集中管理，都是用它来做。

那 Nest 里怎么集成它呢？其实和 Redis 差不多。集成 Redis 的时候就是写了一个 provider 创建连接，然后注入到 service 里调用它的方法。还可以像 TypeOrmModule、JwtModule 等这些，封装一个动态模块。

先来看看：
```
nest new nest-etcd
```

进入项目，把服务跑起来：
```
npm run start:dev
```

按照前面的步骤把 etcd 服务跑起来，然后加一个 etcd 的 provider：

```javascript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Etcd3 } from 'etcd3';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'ETCD_CLIENT',
      useFactory() {
        const client = new Etcd3({
            hosts: 'http://localhost:2379',
            auth: {
                username: 'root',
                password: 'guang'
            }
        });
        return client;
      }
    }
  ],
})
export class AppModule {}
```

在 AppController 里注入下：

```javascript
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { Etcd3 } from 'etcd3';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Inject('ETCD_CLIENT')
  private etcdClient: Etcd3;

  @Get('put')
  async put(@Query('value') value: string) {
    await this.etcdClient.put('aaa').value(value);
    return 'done';
  }

  @Get('get')
  async get() {
    return await this.etcdClient.get('aaa').string();
  }

  @Get('del')
  async del() {
    await this.etcdClient.delete().key('aaa');
    return 'done';
  }
}
```

测试下，这样 etcd 就集成好了，很简单。

## 六、Nest 集成 Etcd（动态模块封装）

然后封装一个动态模块。创建一个 module 和 service：

```
nest g module etcd
nest g service etcd
```

在 EtcdModule 添加 etcd 的 provider：

```javascript
import { Module } from '@nestjs/common';
import { EtcdService } from './etcd.service';
import { Etcd3 } from 'etcd3';

@Module({
  providers: [
    EtcdService,
    {
      provide: 'ETCD_CLIENT',
      useFactory() {
        const client = new Etcd3({
            hosts: 'http://localhost:2379',
            auth: {
                username: 'root',
                password: 'guang'
            }
        });
        return client;
      }
    }
  ],
  exports: [
    EtcdService
  ]
})
export class EtcdModule {}
```

然后在 EtcdService 添加一些方法：

```javascript
import { Inject, Injectable } from '@nestjs/common';
import { Etcd3 } from 'etcd3';

@Injectable()
export class EtcdService {

    @Inject('ETCD_CLIENT')
    private client: Etcd3;

    // 保存配置
    async saveConfig(key, value) {
        await this.client.put(key).value(value);
    }

    // 读取配置
    async getConfig(key) {
        return await this.client.get(key).string();
    }

    // 删除配置
    async deleteConfig(key) {
        await this.client.delete().key(key);
    }

    // 服务注册
    async registerService(serviceName, instanceId, metadata) {
        const key = `/services/${serviceName}/${instanceId}`;
        const lease = this.client.lease(10);
        await lease.put(key).value(JSON.stringify(metadata));
        lease.on('lost', async () => {
            console.log('租约过期，重新注册...');
            await this.registerService(serviceName, instanceId, metadata);
        });
    }

    // 服务发现
    async discoverService(serviceName) {
        const instances = await this.client.getAll().prefix(`/services/${serviceName}`).strings();
        return Object.entries(instances).map(([key, value]) => JSON.parse(value));
    }

    // 监听服务变更
    async watchService(serviceName, callback) {
        const watcher = await this.client.watch().prefix(`/services/${serviceName}`).create();
        watcher.on('put', async event => {
            console.log('新的服务节点添加:', event.key.toString());
            callback(await this.discoverService(serviceName));
        }).on('delete', async event => {
            console.log('服务节点删除:', event.key.toString());
            callback(await this.discoverService(serviceName));
        });
    }

}
```

配置的管理、服务注册、服务发现、服务变更的监听，这些前面都写过一遍，就不细讲了。

然后再创建个模块，引入它试一下：

```
nest g resource aaa
```

引入 EtcdModule，然后在 AaaController 注入 EtcdService，添加两个 handler：

```javascript
@Inject(EtcdService)
private etcdService: EtcdService;

@Get('save')
async saveConfig(@Query('value') value: string) {
    await this.etcdService.saveConfig('aaa', value);
    return 'done';
}

@Get('get')
async getConfig() {
    return await this.etcdService.getConfig('aaa');
}
```

测试下，没啥问题。不过现在 EtcdModule 是普通的模块，改成动态模块：

```javascript
import { DynamicModule, Module, ModuleMetadata, Type } from '@nestjs/common';
import { EtcdService } from './etcd.service';
import { Etcd3, IOptions } from 'etcd3';

export const ETCD_CLIENT_TOKEN = 'ETCD_CLIENT';

export const ETCD_CLIENT_OPTIONS_TOKEN = 'ETCD_CLIENT_OPTIONS';

@Module({})
export class EtcdModule {

  static forRoot(options?: IOptions): DynamicModule {
    return {
      module: EtcdModule,
      providers: [
        EtcdService,
        {
          provide: ETCD_CLIENT_TOKEN,
          useFactory(options: IOptions) {
            const client = new Etcd3(options);
            return client;
          },
          inject: [ETCD_CLIENT_OPTIONS_TOKEN]
        },
        {
          provide: ETCD_CLIENT_OPTIONS_TOKEN,
          useValue: options
        }
      ],
      exports: [
        EtcdService
      ]
    };
  }
}
```

把 EtcdModule 改成动态模块的方式，加一个 forRoot 方法。把传入的 options 作为一个 provider，然后再创建 etcd client 作为一个 provider。然后 AaaModule 引入 EtcdModule 的方式也改下：

用起来是一样的，但是现在 etcd 的参数是动态传入的了，这就是动态模块的好处。

当然，一般动态模块都有 forRootAsync，也加一下：

```javascript
export interface EtcdModuleAsyncOptions  {
  useFactory?: (...args: any[]) => Promise<IOptions> | IOptions;
  inject?: any[];
}
```

```javascript
static forRootAsync(options: EtcdModuleAsyncOptions): DynamicModule {
    return {
      module: EtcdModule,
      providers: [
        EtcdService,
        {
          provide: ETCD_CLIENT_TOKEN,
          useFactory(options: IOptions) {
            const client = new Etcd3(options);
            return client;
          },
          inject: [ETCD_CLIENT_OPTIONS_TOKEN]
        },
        {
          provide: ETCD_CLIENT_OPTIONS_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject || []
        }
      ],
      exports: [
        EtcdService
      ]
    };
}
```

and forRoot 的区别就是现在的 options 的 provider 是通过 useFactory 的方式创建的，之前是直接传入。现在就可以这样传入 options 了：

```javascript
EtcdModule.forRootAsync({
  async useFactory() {
      await 111;
      return {
          hosts: 'http://localhost:2379',
          auth: {
              username: 'root',
              password: 'guang'
          }
      }
  }
})
```

配合 @nestjs/config 使用。安装下 config 的包：

```
npm install @nestjs/config
```

在 AppModule 引入 ConfigModule：

```javascript
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: 'src/.env'
})
```

添加对应的 src/.env：

```env
etcd_hosts=http://localhost:2379
etcd_auth_username=root
etcd_auth_password=guang
```

然后在引入 EtcdModule 的时候，从 ConfigService 拿配置：

```javascript
EtcdModule.forRootAsync({
  async useFactory(configService: ConfigService) {
      await 111;
      return {
          hosts: configService.get('etcd_hosts'),
          auth: {
              username: configService.get('etcd_auth_username'),
              password: configService.get('etcd_auth_password')
          }
      }
  },
  inject: [ConfigService]
})
```

测试下，功能正常。这样，EtcdModule.forRootAsync 就成功实现了。

## 总结

微服务架构的系统中少不了配置中心和注册中心：

- 不同服务的配置需要统一管理，并且在更新后通知所有的服务，所以需要配置中心。
- 微服务的节点可能动态的增加或者删除，依赖他的服务在调用之前需要知道有哪些实例可用，所以需要注册中心。
- 服务启动的时候注册到注册中心，并定时续租期，调用别的服务的时候，可以查一下有哪些服务实例可用，也就是服务注册、服务发现功能。

注册中心和配置中心可以用 etcd 来做，它就是一个专业做这件事的中间件，k8s 就是用的它来做的配置和服务注册中心。用 docker 跑了 etcd server，它内置了命令行工具 etcdctl 可以用来和 server 交互，常用的命令有 put、get、del、watch 等。在 node 里可以通过 etcd3 这个包来操作 etcd server，稍微封装一下就可以实现配置管理和服务注册、发现的功能。

Nest 集成 etcd 的方式：可以加一个 provider 创建连接，然后直接注入 etcdClient 来 put、get、del、watch；或者再做一步，封装一个动态模块来用，用的时候再传入连接配置。这一点和集成 Redis 的时候差不多。注册中心和配置中心是微服务体系必不可少的组件，后面会大量用到。