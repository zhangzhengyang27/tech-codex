---
title: Redis 综合实战
description: 基于 Redis 实现分布式 session、搜索附近的充电宝、关注关系、各种排行榜（周榜、月榜、年榜）
keywords: [Redis, 分布式 session, geo, 附近的人, 关注关系, 排行榜, zset]
category: Node.js
tags: [Node.js, NestJS, Redis]
---

# Redis 综合实战

Redis 有多种 value 类型，可以灵活实现各种业务。本文综合实战基于 Redis 实现分布式 session、搜索附近的充电宝、关注关系、各种排行榜。

## 基于 Redis 实现分布式 session

前面学习了登录鉴权的两种方式 session 和 jwt。

session 是在服务端保存用户数据，然后通过 cookie 返回 sessionId。cookie 在每次请求的时候会自动带上，服务端就能根据 sessionId 找到对应的 session，拿到用户的数据。而 jwt 是把所有的用户数据保存在加密后的 token 里返回，客户端只要在 authorization 的 header 里带上 token，服务端就能从中解析出用户数据。

jwt 天然是支持分布式的，比如有两个服务器的时候，任何一个服务器都能从 token 里拿到用户数据。但是 session 的方式不行，它的数据是存在单台服务器的内存的，如果再请求另一台服务器就找不到对应的 session 了。

那如何让 session 支持分布式环境呢？一种方式就是做 session 的同步，在多台服务器之间复制 session。另一种方式就是自己基于 redis 实现一个分布式 session 了。

### 实现思路

分布式 session 就是在多台服务器都可以访问到同一个 session，可以在 redis 里存储它：

用户第一次请求的时候，生成一个随机 id，以它作为 key，存储的对象作为 value 放到 redis 里。之后携带 cookie 的时候，根据其中的 sid 来取 redis 中的值，注入 handler。修改 session 之后再设置到 redis 里。这样就完成了 session 的创建、保存、修改。

### 代码实现

创建 nest 项目并安装 redis 包：

```
nest new redis-session-test -p npm
npm install --save redis
```

然后创建个 redis 模块：

```
nest g module redis
nest g service redis
```

在 RedisModule 创建连接 redis 的 provider，导出 RedisService，并把这个模块标记为 @Global 模块：

```javascript
import { Global, Module } from '@nestjs/common';
import { createClient } from 'redis';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    RedisService,
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
  ],
  exports: [RedisService]
})
export class RedisModule {}
```

然后在 RedisService 里注入 REDIS_CLIENT，并封装一些方法：

```javascript
import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {

    @Inject('REDIS_CLIENT')
    private redisClient: RedisClientType;

    async hashGet(key: string) {
        return await this.redisClient.hGetAll(key);
    }

    async hashSet(key: string, obj: Record<string, any>, ttl?: number) {
        for(let name in obj) {
            await this.redisClient.hSet(key, name, obj[name]);
        }

        if(ttl) {
            await this.redisClient.expire(key, ttl);
        }
    }
}
```

因为要操作的是对象结构，比较适合使用 hash。redis 的 hash 有这些方法：

- `HSET key field value`： 设置指定哈希表 key 中字段 field 的值为 value。
- `HGET key field`：获取指定哈希表 key 中字段 field 的值。
- `HMSET key field1 value1 field2 value2 ...`：同时设置多个字段的值到哈希表 key 中。
- `HMGET key field1 field2 ...`：同时获取多个字段的值从哈希表 key 中。
- `HGETALL key`：获取哈希表 key 中所有字段和值。
- `HDEL key field1 field2 ...`：删除哈希表 key 中一个或多个字段。
- `HEXISTS key field`：检查哈希表 key 中是否存在字段 field。
- `HKEYS key`：获取哈希表 key 中的所有字段。
- `HVALUES key`：获取哈希表 key 中所有的值。
- `HLEN key`：获取哈希表 key 中字段的数量。
- `HINCRBY key field increment`：将哈希表 key 中字段 field 的值增加 increment。
- `HSETNX key field value`：只在字段 field 不存在时，设置其值为 value。

这里就用到 hGetAll 和 hSet 方法，再就是用 expire 设置 key 的过期时间。这里的 Record<string, any> 是对象类型的意思。

然后再封装个 SessionModule：

```
nest g module session
nest g service session --no-spec
```

导出 SessionService，并且设置 SessionModule 为 Global：

```javascript
import { Global, Module } from '@nestjs/common';
import { SessionService } from './session.service';

@Global()
@Module({
  providers: [SessionService],
  exports: [SessionService]
})
export class SessionModule {}
```

然后实现 SessionService：

```javascript
import { Inject, Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SessionService {

    @Inject(RedisService)
    private redisService: RedisService;

    async setSession(sid: string, value: Record<string, any>, ttl: number = 30 * 60) {
        if(!sid) {
            sid = this.generateSid();
        }
        await this.redisService.hashSet(`sid_${sid}`, value, ttl);
        return sid;
    }

    async getSession(sid: string) {
        return await this.redisService.hashGet(`sid_${sid}`);
    }

    generateSid() {
        return Math.random().toString().slice(2,12);
    }
}
```

setSession 就是用 sid_xx 的 key 在 redis 里创建数据，getSession 是用 sid_xx 从 redis 取值。setSession 的时候如果没有传入 sid，则随机生成一个，并返回 sid。

在 AppController 添加个方法测试下，这里用到 cookie，需要安装 cookie-parser 的包并在 main.ts 里启用：

```
npm install --save cookie-parser
```

现在 getSession 返回的是 Record<string, any> 也就是对象类型，但并不知道有啥具体的属性。所以改造下 getSession 的类型声明加个重载：

```typescript
async getSession<SessionType extends Record<string,any>>(sid: string): Promise<SessionType>;
async getSession(sid: string) {
    return await this.redisService.hashGet(`sid_${sid}`);
}
```

这样当传入类型参数之后，返回的就是该类型了。为什么取到 count 是 string 呢？因为 redis 虽然可以存整数、浮点数，但是它会转为 string 来存，所以取到的是 string，需要自己转换一下。

实现下计数逻辑：

```javascript
@Inject(SessionService)
private sessionService: SessionService;

@Get('count')
async count(@Req() req: Request, @Res({ passthrough: true}) res: Response) {
    const sid = req.cookies?.sid;

    const session = await this.sessionService.getSession<{count: string}>(sid);

    const curCount = session.count ? parseInt(session.count) + 1 : 1;
    const curSid = await this.sessionService.setSession(sid, {
      count: curCount
    });

    res.cookie('sid', curSid, { maxAge: 1800000 });
    return curCount;
}
```

先根据 cookie 的 sid 调用 getSession 取 session，拿到的如果有 count 就 + 1 之后放回去，没有就设置 1，然后 setSession 更新 session，在 cookie 中返回 sid。

默认用了 @Res 传入 response 之后就需要手动返回响应了，比如 res.end('xxx')，如果还是想让 nest 把返回值作为响应，就加个 passthrough: true。

这样，自己实现的 session 就生效了，在 Redis Insight 里可以看到 session 的值，而且这个 session 是支持分布式的。

用 11-Nginx基础概述 做网关层，使用轮询的负载均衡策略，那请求可能到任何一台服务器上。如果是之前的 session，当前机器没有对应的 session 对象，就拿不到登录状态。而现在基于 redis 存储的 session，不管请求到了哪台服务器，都能从 redis 中取出对应的 session 从而拿到登录状态、用户数据。这就是分布式 session。

## Redis + 高德地图，实现附近的充电宝

想必大家都打过车，打车软件可以根据你的当前位置搜索附近的车辆；借用共享充电宝也是基于你的位置来搜索附近充电宝；再就是搜索附近的酒店、餐厅等，也是基于位置的搜索。这种附近的人、附近的酒店、附近的充电宝的功能是怎么实现的呢？答案是用 Redis 实现的。

redis 是 key-value 的数据库，value 有很多种类型：

- **string**： 可以存数字、字符串，比如存验证码就是这种类型
- **hash**：存一个 map 的结构，比如文章的点赞数、收藏数、阅读量，就可以用 hash 存
- **set**：存去重后的集合数据，支持交集、并集等计算，常用来实现关注关系，比如可以用交集取出互相关注的用户
- **zset**：排序的集合，可以指定一个分数，按照分数排序。每天看的文章热榜、微博热榜等各种排行榜，都是 zset 做的
- **list**：存列表数据
- **geo**：存地理位置，支持地理位置之间的距离计算、按照半径搜索附近的位置

其中，geo 的数据结构，就可以用来实现附近的人等功能。比如大众点评、美团外卖这种，就是用 redis 实现的基于地理位置的功能。

### Redis 的 geo 命令

在 RedisInsight 里输入命令，点击执行：

```redis
geoadd loc 13.361389 38.115556 "guangguang" 15.087269 37.502669 "dongdong"
```

用 geoadd 命令添加了两个位置。guangguang 的位置是经度 13.361389，纬度 38.115556；dongdong 的位置是经度 15.087269，纬度 37.502669。

然后可以用 geodist 计算两个位置之间的距离：

```
geodist loc guangguang dongdong
```

可以看到相距差不多 166 km。

然后用 georadius 分别查找经度 15、纬度 37 位置的附近 100km 半径和 200km 半径的点：

```
georadius loc 15 37 100 km
georadius loc 15 37 200 km
```

因为两个点相距 166km，所以搜索 100km 以内的点只能搜到一个，而 200km 内的点能搜到两个。这样，就可以实现搜索附近 1km 的充电宝的功能。

### 后端实现

服务端提供一个接口，让充电宝机器上传位置信息存到 redis 里；再提供个搜索接口，基于传入的位置用 georadius 搜索附近的充电宝机器返回客户端。

创建个 nest 项目：

```
npm install -g @nestjs/cli
nest new nearby-search
npm run start:dev
npm install --save redis
```

创建个 redis 模块和 service：

```
nest g module redis
nest g service redis
```

在 RedisModule 创建连接 redis 的 provider，导出 RedisService（连接代码同前文）：在 RedisService 里注入 REDIS_CLIENT，并封装 geoAdd 方法，传入 key 和位置信息，底层调用 redis 的 geoadd：

```javascript
import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {

    @Inject('REDIS_CLIENT')
    private redisClient: RedisClientType;

    async geoAdd(key: string, posName: string, posLoc: [number, number]) {
        return await this.redisClient.geoAdd(key, {
            longitude: posLoc[0],
            latitude: posLoc[1],
            member: posName
        })
    }
}
```

在 AppController 里注入 RedisService，添加 addPos 的 get 请求的路由，传入 name、longitude、latitude，调用 redisService 添加位置信息：

```javascript
import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { RedisService } from './redis/redis.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Inject(RedisService)
  private redisService: RedisService;

  @Get('addPos')
  async addPos(
    @Query('name') posName: string,
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number
  ) {
    if(!posName || !longitude || !latitude) {
      throw new BadRequestException('位置信息不全');
    }
    try {
      await this.redisService.geoAdd('positions', posName, [longitude, latitude]);
    } catch(e) {
      throw new BadRequestException(e.message);
    }
    return {
      message: '添加成功',
      statusCode: 200
    }
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

测试下：

```
/addPos?name=guang
/addPos?name=guang&longitude=15&latitude=35
/addPos?name=dong&longitude=15&latitude=85
```

然后再添加个查询位置列表的接口。因为 geo 信息底层使用 zset 存储的，所以查询所有的 key 用 zrange：

```javascript
async geoPos(key: string, posName: string) {
    const res = await this.redisClient.geoPos(key, posName);

    return {
        name: posName,
        longitude: res[0].longitude,
        latitude: res[0].latitude
    }
}

async geoList(key: string) {
    const positions = await this.redisClient.zRange(key, 0, -1);

    const list = [];
    for(let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const res = await this.geoPos(key, pos);
        list.push(res);
    }
    return list;
}
```

zset 是有序列表，列表项会有一个分数，zrange 是返回某个分数段的 key，传入 0、-1 就是返回所有的。然后在 AppController 添加 allPos、pos 两个路由：

```javascript
@Get('allPos')
async allPos() {
    return this.redisService.geoList('positions');
}

@Get('pos')
async pos(@Query('name') name: string) {
    return this.redisService.geoPos('positions', name);
}
```

最后，还要提供一个搜索附近的点的接口，在 RedisService 添加 geoSearch 方法，传入 key，经纬度、搜索半径，返回附近的点（单位 km）：

```javascript
async geoSearch(key: string, pos: [number, number], radius: number) {
    const positions = await this.redisClient.geoRadius(key, {
        longitude: pos[0],
        latitude: pos[1]
    }, radius, 'km');

    const list = [];
    for(let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const res = await this.geoPos(key, pos);
        list.push(res);
    }
    return list;
}
```

先用 geoRadius 搜索半径内的点，然后再用 geoPos 拿到点的经纬度返回。在 AppController 添加 nearbySearch 接口：

```javascript
@Get('nearbySearch')
async nearbySearch(
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number,
    @Query('radius') radius: number
) {
    if(!longitude || !latitude) {
      throw new BadRequestException('缺少位置信息');
    }
    if(!radius) {
      throw new BadRequestException('缺少搜索半径');
    }

    return this.redisService.geoSearch('positions', [longitude, latitude], radius);
}
```

可以用高德地图的坐标拾取工具来取几个位置，比如天安门：116.397444,39.909183；文化宫科技馆：116.3993,39.908578；售票处：116.397283,39.90943；故宫彩扩部：116.398002,39.909175。

把这样 4 个位置添加到系统中：

```
/addPos?name=天安门&longitude=116.397444&latitude=39.909183
/addPos?name=文化宫科技馆&longitude=116.3993&latitude=39.908578
/addPos?name=售票处&longitude=116.397283&latitude=39.90943
/addPos?name=故宫彩扩部&longitude=116.398002&latitude=39.909175
```

计算下天安门到故宫彩扩部的距离是 0.0476km，那么在天安门的位置搜索 0.04km 内的点应该搜不到它，搜索 0.05km 的点的时候才能搜到：

```
/nearbySearch?longitude=116.397444&latitude=39.909183&radius=0.04
/nearbySearch?longitude=116.397444&latitude=39.909183&radius=0.05
```

这样搜索附近的充电宝的后端功能就完成了。

### 前端实现（接入高德地图）

在 main.ts 指定 public 目录为静态文件的目录：

```javascript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets('public');

  await app.listen(3000);
}
bootstrap();
```

然后接入高德地图，先按照文档的步骤获取 key：点击创建新应用，选择 web 应用，就可以生成 key 了。然后把文档的 demo 代码复制过来，引入 axios 来调用服务端接口：

```html
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="initial-scale=1.0, user-scalable=no, width=device-width">
    <title>附近的充电宝</title>
  <link rel="stylesheet" href="https://a.amap.com/jsapi_demos/static/demo-center/css/demo-center.css" />
    <script src="https://cache.amap.com/lbs/static/es5.min.js"></script>
    <script type="text/javascript" src="https://cache.amap.com/lbs/static/addToolbar.js"></script>
    <style>
        html,
        body,
        #container {
          width: 100%;
          height: 100%;
        }

        label {
            width: 55px;
            height: 26px;
            line-height: 26px;
            margin-bottom: 0;
        }
        button.btn {
            width: 80px;
        }
    </style>
</head>
<body>
<div id="container"></div>
<script src="https://webapi.amap.com/maps?v=2.0&key=f96fa52474cedb7477302d4163b3aa09"></script>
<script src="https://unpkg.com/axios@1.5.1/dist/axios.min.js"></script>
<script>

    const radius = 0.2;

    axios.get('/nearbySearch', {
        params: {
            longitude: 116.397444,
            latitude: 39.909183,
            radius
        }
    }).then(res => {
        const data = res.data;

        var map = new AMap.Map('container', {
            resizeEnable: true,
            zoom: 6,
            center: [116.397444, 39.909183]
        });

        data.forEach(item => {
            var marker = new AMap.Marker({
                icon: "https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png",
                position: [item.longitude, item.latitude],
                anchor: 'bottom-center'
            });
            map.add(marker);
        });

        var circle = new AMap.Circle({
            center: new AMap.LngLat(116.397444, 39.909183), // 圆心位置
            radius: radius * 1000,
            strokeColor: "#F33",
            strokeOpacity: 1,
            strokeWeight: 3,
            fillColor: "#ee2200",
            fillOpacity: 0.35
        });

        map.add(circle);
        map.setFitView();
    })
</script>
</body>
</html>
```

把 radius 改成 0.05，就看到更小半径内的充电宝。这样就实现了查找附近的充电宝的功能。

## 基于 Redis 实现关注关系

在掘金、知乎、抖音等平台，可以关注其他用户，其他用户也可以关注，而且如果彼此关注，会标出共同关注。这种关注、被关注、相互关注是怎么实现的呢？一般是用 redis 的 Set 实现的。

Set 是集合，有很多命令：

**SADD**：添加元素；**SMEMBERS**：查看所有元素；**SISMEMBER**：某个 key 是否在集合中；**SCARD**：集合中元素数量；**SMOVE**：移动元素从一个集合到另一个集合；**SDIFF**：两个集合的差集；**SINTER**：两个集合的交集；**SUNION**：两个集合的并集；**SINTERSTORE**：两个集合的交集存入新集合；**SUNIONSTORE**：两个集合的并集存入新集合；**SDIFFSTORE**：两个集合的差集存入新集合。更多命令可以在 redis 文档中搜索以 S 开头的。

关注关系用 redis 来实现就是这样的：比如张三的 userId 是 1，那用一个 set 来存储它的关注者 followers:1（比如其中有 2、3、4），然后用一个集合来存储他关注的人 following:1（其中有 2、5、6）。那相互关注的人就是 followers:1 和 following:1 的交集 SINTERSTORE 的结果，存入新集合，比如叫 follow-each-other:1。然后返回关注者或者关注的人的时候，用 SISMEMBER 判断下用户是否在 follow-each-other:1 这个集合中，是的话就可以标记出互相关注。

### 代码实现

安装 TypeORM 的包：

```bash
npm install --save @nestjs/typeorm typeorm mysql2
```

在 app.module.ts 引入下 TypeOrmModule：

```javascript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "mysql",
      host: "localhost",
      port: 3306,
      username: "root",
      password: "guang",
      database: "following_test",
      synchronize: true,
      logging: true,
      entities: [],
      poolSize: 10,
      connectorPackage: 'mysql2',
      extra: {
          authPlugin: 'caching_sha2_password',
      }
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

新建一个 user 模块，改下 user.entity.ts：

```
nest g resource user --no-spec
```

```javascript
import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @ManyToMany(() => User, user => user.following)
    @JoinTable()
    followers: User[];

    @ManyToMany(() => User, user => user.followers)
    following: User[];
}
```

这里用户和用户是多对多的关系，因为用户可以关注多个用户，用户也可以被多个用户关注，所以用 @ManyToMany 还有 @JoinTable 来声明。跑起来后，在 mysql workbench 里可以看到 user 表和 user_followers_user 中间表。

在 UserService 添加一个初始化数据的方法：

```javascript
@InjectEntityManager()
entityManager: EntityManager;

async initData() {
    const user2 = new User();
    user2.name = '李四';

    const user3 = new User();
    user3.name = '王五';

    const user4 = new User();
    user4.name = '赵六';

    const user5 = new User();
    user5.name = '刘七';

    await this.entityManager.save(user2);
    await this.entityManager.save(user3);
    await this.entityManager.save(user4);
    await this.entityManager.save(user5);

    const user1 = new User();
    user1.name = '张三';

    user1.followers = [user2, user3, user4];

    user1.following = [user2, user5];

    await this.entityManager.save(user1);
}
```

### 引入 Redis 实现互相关注

安装 redis 的包，然后创建 redis 模块（连接 provider 代码同前文，标记为 @Global）：

```
npm install --save redis
nest g module redis
nest g service redis
```

然后在 RedisService 里注入 REDIS_CLIENT 并封装一些方法：

```javascript
import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {

    @Inject('REDIS_CLIENT')
    private redisClient: RedisClientType;

    async sAdd(key: string, ...members: string[]) {
        return this.redisClient.sAdd(key, members);
    }

    async sInterStore(newSetKey: string, set1: string, set2: string) {
        return this.redisClient.sInterStore(newSetKey, [set1, set2]);
    }

    async sIsMember(key: string, member: string) {
        return this.redisClient.sIsMember(key, member);
    }

    async sMember(key: string) {
        return this.redisClient.sMembers(key);
    }

    async exists(key: string) {
        const result =  await this.redisClient.exists(key);
        return result > 0
    }
}
```

封装 SADD、SINTERSTORE、SISMEMBER、SMEMBER 命令。还有 EXISTS 用来判断某个 key 是否存在，返回 1 代表存在，返回 0 代表不存在。

然后在 UserService 添加查询关注关系的方法：

```javascript
@Inject(RedisService)
redisService: RedisService;

async findUserByIds(userIds: string[] | number[]) {
  let users = [];

  for(let i = 0; i< userIds.length; i ++) {
    const user = await this.entityManager.findOne(User, {
      where: {
        id: +userIds[i]
      }
    });
    users.push(user);
  }

  return users;
}

async getFollowRelationship(userId: number) {
  const exists = await this.redisService.exists('followers:' + userId);
  if(!exists) {
    const user = await this.entityManager.findOne(User, {
      where: {
        id: userId
      },
      relations: ['followers', 'following']
    });

    if(!user.followers.length || !user.following.length) {
      return {
        followers: user.followers,
        following: user.following,
        followEachOther: []
      }
    }

    await this.redisService.sAdd('followers:' + userId, ...user.followers.map(item => item.id.toString()));

    await this.redisService.sAdd('following:' + userId, ...user.following.map(item => item.id.toString()))

    await this.redisService.sInterStore('follow-each-other:' + userId, 'followers:' + userId, 'following:' + userId);

    const followEachOtherIds = await this.redisService.sMember('follow-each-other:' + userId);

    const followEachOtherUsers = await this.findUserByIds(followEachOtherIds);

    return {
      followers: user.followers,
      following: user.following,
      followEachOther: followEachOtherUsers
    }
  } else {

    const followerIds = await this.redisService.sMember('followers:' + userId);

    const followUsers = await this.findUserByIds(followerIds);

    const followingIds = await this.redisService.sMember('following:' + userId);

    const followingUsers = await this.findUserByIds(followingIds);

    const followEachOtherIds = await this.redisService.sMember('follow-each-other:' + userId);

    const followEachOtherUsers =await this.findUserByIds(followEachOtherIds);

    return {
      followers: followUsers,
      following: followingUsers,
      followEachOther: followEachOtherUsers
    }
  }
}
```

逻辑整理：根据 id 查询用户的信息，关联查出 followers 和 following。如果 followers 或者 following 为空，那就没有互相关注，可以直接返回。否则就分别把 followers 和 following 的 id 用 SADD 添加到两个集合中，之后求两个集合的交集存入 follow-each-other:userId 的集合，最后返回。如果 exists 判断 followers 集合存在，就是处理过了，那就直接取 redis 里的这三个集合，根据集合的 id 求出用户信息返回。

在 UserController 添加一个路由：

```javascript
@Get('follow-relationship')
async followRelationShip(@Query('id') id: string) {
    if(!id) {
      throw new BadRequestException('userId 不能为空');
    }
    return this.userService.getFollowRelationship(+id);
}
```

那如果有新的关注者呢？比如张三又关注了赵六，这时要更新下数据库，并且更新 redis 里的 following 和 follow-each-other 集合。在 UserService 添加 follow 方法：

```javascript
async follow(userId: number, userId2: number){
  const user = await this.entityManager.findOne(User, {
    where: {
      id: userId
    },
    relations: ['followers', 'following']
  });

  const user2 = await this.entityManager.findOne(User, {
    where: {
      id: userId2
    }
  });

  user.followers.push(user2);

  await this.entityManager.save(User, user);

  const exists = await this.redisService.exists('followers:' + userId);

  if(exists) {
    await this.redisService.sAdd('followers:' + userId, userId2.toString());
    await this.redisService.sInterStore('follow-each-other:' + userId, 'followers:' + userId, 'following:' + userId);
  }

 const exists2 = await this.redisService.exists('following:' + userId2);

 if(exists2) {
    await this.redisService.sAdd('following:' + userId2, userId.toString());
    await this.redisService.sInterStore('follow-each-other:' + userId2, 'followers:' + userId2, 'following:' + userId2);
  }
}
```

先查询出 user 的数据，在 followers 添加 user2，然后 save 保存到数据库。之后查询下 redis，如果有 followers:userId 的 key，就更新下 followers 和 follow-each-other 集合。这里 user1 和 user2 的集合都要查询并更新下。

然后在 UserController 里添加下 follow 路由：

```javascript
@Get('follow')
async follow(@Query('id1') userId1: string, @Query('id2') userId2: string) {
    await this.userService.follow(+userId1, +userId2);
    return 'done';
}
```

浏览器访问下，可以看到数据库和 redis 都更新了，再次查询下，相互关注的功能就实现了。知乎、掘金这种关注关系都是这样实现的。

## 基于 Redis 实现各种排行榜（周榜、月榜、年榜）

生活中各种排行榜可太多了，比如微博文娱榜、掘金的文章榜、微信的步数排行榜、自习室学习时长排行榜等。排行的依据各有不同，有的是根据学习时长，有的是根据阅读数、点赞数，有的是根据搜索次数等。

那这些排行榜是怎么实现的呢？有的同学说，在 mysql 里加一个排序的字段，比如热度，然后根据这个字段来排序。这样能完成功能，但是效率太低，数据库的读写性能比 Redis 低很多，而且可能排序的依据只是一个临时数据，不需要存到数据库里。

一般涉及到排行榜，都是用 Redis 来做，因为它有一个专为排行榜准备的数据结构：有序集合 ZSET。

它有这些命令：

**ZADD**：往集合中添加成员；**ZREM**：从集合中删除成员；**ZCARD**：集合中的成员个数；**ZSCORE**：某个成员的分数；**ZINCRBY**：增加某个成员的分数；**ZRANK**：成员在集合中的排名；**ZRANGE**：打印某个范围内的成员；**ZRANGESTORE**：某个范围内的成员放入新集合；**ZCOUNT**：集合中分数在某个范围内的成员个数；**ZDIFF**：打印两个集合的差集；**ZDIFFSTORE**：两个集合的差集放入新集合；**ZINTER**：打印两个集合的交集；**ZINTERSTORE**：两个集合的交集放入新集合；**ZINTERCARD**：两个集合的交集的成员个数；**ZUNION**：打印两个集合的并集；**ZUNIONSTORE**：两个集合的并集放入新集合。

### zset 命令练习

依次来试一下：

```redis
ZADD set1 1 mem1 2 mem2 3 mem3
```

在 RedisInsight 里输入命令，点击执行。用 ZRANGE 查看：

```
ZRANGE set1 0 -1
```

范围从 0 到 -1 就是返回全部。默认是分数从小到大排序，也可以从大到小，加个 REV 就行：

```
ZRANGE set1 0 -1 REV
```

还可以用 ZRANGESTORE 把它存入新集合、用 ZREM 删除成员、用 ZCARD 查看成员个数、用 ZSCORE 查看某个成员的分数、用 ZRANK 查看成员在集合内的排名、用 ZINCRBY 给成员增加分数。

再创建一个集合 set2，用 ZUNION 合并下：

```
ZADD set2 4 aaa 6 bbb
ZUNION 2 set1 set2
```

还可以加上分数一起：

```
ZUNION 2 set1 set2 WITHSCORES
```

或者把合并后放到另一个集合：

```
ZUNIONSTORE set3 2 set1 set2
ZRANGE set3 0 -1
```

并集合并的时候相同的 key 的 score 会求和：

```
ZADD s1 1 aa 2 bb

ZADD s2 1 aa 3 cc

ZUNIONSTORE s3 2 s1 s2
```

在 s1 和 s2 集合中都有 aa，合并到 s3 之后 aa 的分数也合并了。

周榜、月榜、年榜就是这么实现的：月榜就是对周榜的合并，然后年榜就是月榜的合并，最后就会算出一个新的排行榜。

### 用 Nest 实现排行榜功能

创建 nest 项目并安装 redis 包、创建 RedisModule（代码同前文，标记为 @Global）：

```
nest new ranking-list-test
npm install --save redis
nest g module redis
nest g service redis
```

然后在 RedisService 里封装 zset 相关方法：

```javascript
import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {

    @Inject('REDIS_CLIENT')
    private redisClient: RedisClientType;

    async zRankingList(key: string, start: number = 0, end: number = -1) {
        const keys = await this.redisClient.zRange(key, start, end, {
            REV: true
        });
        const rankingList = {};
        for(let i = 0; i< keys.length; i++){
            rankingList[keys[i]] = await this.zScore(key, keys[i]);
        }
        return rankingList;
    }

    async zAdd(key: string, members: Record<string, number>) {
        const mems = [];
        for(let key in members) {
            mems.push({
                value: key,
                score: members[key]
            });
        }
        return  await this.redisClient.zAdd(key, mems);
    }

    async zScore(key: string, member: string) {
        return  await this.redisClient.zScore(key, member);
    }

    async zRank(key: string, member: string) {
        return  await this.redisClient.zRank(key, member);
    }

    async zIncr(key: string, member: string, increment: number) {
        return  await this.redisClient.zIncrBy(key, increment, member)
    }

    async zUnion(newKey: string, keys: string[]) {
        if(!keys.length) {
            return []
        };
        if(keys.length === 1) {
            return this.zRankingList(keys[0]);
        }

        await this.redisClient.zUnionStore(newKey, keys);

        return this.zRankingList(newKey);
    }

    async keys(pattern: string) {
        return this.redisClient.keys(pattern);
    }
}
```

这里对 zset 的命令进行了封装。zUnion 要做下边界的处理，如果只传了一个 set 的名字，就返回这个 set 的内容，否则才合并。

创建一个 ranking 模块：

```
nest g module ranking
nest g controller ranking --no-spec
nest g service ranking --no-spec
```

就实现下自习室学习时长的月榜和年榜，实现下 RankingService：

```javascript
import { RedisService } from './../redis/redis.service';
import { Inject, Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';

@Injectable()
export class RankingService {

    @Inject(RedisService)
    redisService: RedisService;

    private getMonthKey() {
        const dateStr = dayjs().format('YYYY-MM');
        return `learning-ranking-month:${dateStr}`;
    }

    private getYearKey() {
        const dateStr = dayjs().format('YYYY');
        return `learning-ranking-year:${dateStr}`;
    }

    async join(name: string) {
        await this.redisService.zAdd(this.getMonthKey(), { [name]: 0 });
    }

    async addLearnTime(name:string, time: number) {
        await this.redisService.zIncr(this.getMonthKey(), name, time);
    }

    async getMonthRanking() {
        return this.redisService.zRankingList(this.getMonthKey(), 0, 10);
    }

    async getYearRanking() {
        const dateStr = dayjs().format('YYYY');
        const keys = await this.redisService.keys(`learning-ranking-month:${dateStr}-*`);

        return this.redisService.zUnion(this.getYearKey(), keys);
    }
}
```

这里用到了 dayjs，安装下：

```
npm install --save dayjs
```

月份的榜单是 learning-ranking-month:2024-01 这样的格式，年份的榜单是 learning-ranking-year:2023 这样的格式。用 dayjs 拿到当前的年份和月份拼接出需要的 key。年份的榜单就是拿到用 learning-ranking-month:当前年份- 开头的所有 zset 做下合并。

在 RankingController 加一下接口：

```javascript
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { RankingService } from './ranking.service';

@Controller('ranking')
export class RankingController {

    @Inject(RankingService)
    rankingService: RankingService;

    @Get('join')
    async join(@Query('name') name: string) {
        await this.rankingService.join(name);
        return 'success';
    }

    @Get('learn')
    async addLearnTime(@Query('name') name:string, @Query('time') time: string) {
        await this.rankingService.addLearnTime(name, parseFloat(time));
        return 'success';
    }

    @Get('monthRanking')
    async getMonthRanking() {
        return this.rankingService.getMonthRanking();
    }

    @Get('yearRanking')
    async getYearRanking() {
        return this.rankingService.getYearRanking();
    }
}
```

join 是加入自习室，learn 是增加学习时长，monthRanking 和 yearRanking 是拿到月榜和年榜。

把服务跑起来，在 postman 里调用下：

```
localhost:3000/ranking/join?name=guang
localhost:3000/ranking/join?name=dong
localhost:3000/ranking/join?name=xiaohong
```

调用 join 接口加入三个同学，然后调用 learn 接口增加学习时长：

```
localhost:3000/ranking/learn?name=dong&time=1
localhost:3000/ranking/learn?name=guang&time=2
localhost:3000/ranking/learn?name=xiaohong&time=5
localhost:3000/ranking/monthRanking
```

改下本地时间，再次调用 join 和 learn 接口，就可以看到 3 月份的月榜和年榜。年榜是合并了所有月榜的结果，每个月榜和年榜都是单独的 zset。

至于用户自己的排名和时长，就用 zScore、zRank 来实现，也就是"我的排名"功能。

## 总结

- **分布式 session**：session 是在服务端内存存储会话数据，通过 cookie 中的 session id 关联，不支持分布式。通过 redis 自己实现了分布式的 session，使用的是 hash 的数据结构，以 sid_xxx 为 key，封装了 SessionModule 来读写 redis 中的 session。如果你想在分布式场景下用 session，就自己基于 redis 实现一个吧。
- **附近的充电宝**：基于位置的功能（附近的充电宝、酒店、打车、附近的人）都是基于 redis 实现的，因为 redis 有 geo 的数据结构，可以方便地计算两点的距离、计算某个半径内的点。前端部分使用地图的 sdk 在搜出的点处绘制 marker。geo 的底层数据结构是 zset。
- **关注关系**：在 mysql 里用中间表来存储 user 和 user 的关系，在 TypeORM 里用 @ManyToMany 映射。互相关注用 redis 的 Set 来实现，先把 user 的 followers 和 following 存储到集合中，然后把两个集合的交集求出来放入一个新的集合，这样就能求出互相关注的关系。当有新的关注或者取消关注时，除了要更新数据库外，也要顺便更新下 redis。
- **排行榜**：各种排行榜以及它们的周榜、月榜、年榜都是用 redis 的 zset 有序集合实现的，它保存的值都有一个分数，会自动排序，多个集合之间可以求并集、交集、差集。通过并集的方式就能实现月榜合并成年榜的功能。