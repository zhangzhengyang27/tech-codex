---
title: 权限控制：ACL 与 RBAC 实现
description: 基于 ACL（访问控制表）和 RBAC（基于角色）两种方式实现接口权限控制
keywords: [权限控制, ACL, RBAC, 鉴权, Authorization, Nest, TypeORM]
category: Node.js
tags: [Node.js, Nest, TypeORM, MySQL, Redis, 服务端, ACL, RBAC, 权限控制]
---


# 权限控制：ACL 与 RBAC

登录和权限是两回事：

* **身份验证（Authentication）**：登录后有的接口只有登录可以访问，会在 Guard 里做身份验证。
* **鉴权（Authorization）**：但有的接口，不只需要登录，可能还需要一定的权限，这时就需要鉴权。比如管理员登录后，可以调用用户管理的接口，但普通用户登录后就不可以。

也就是说，身份验证通过之后还需要再做一步权限的校验，也就是鉴权。

那怎么给不同用户分配权限呢？主要有两种方案：

* **ACL（Access Control List，访问控制表）**：直接给用户分配权限。
* **RBAC（Role Based Access Control，基于角色的权限控制）**：给角色分配权限，然后给用户分配角色。

## ACL 与 RBAC 的对比

**ACL** 是最简单的方式：直接给用户分配权限。比如用户 1 有权限 A、B、C，用户 2 有权限 A，用户 3 有权限 A、B。这种记录每个用户有什么权限的方式，叫做访问控制表（Access Control List）。用户和权限是多对多关系，存储这种关系需要用户表、权限表、用户-权限的中间表。

**RBAC** 是给角色分配权限，然后给用户分配角色。这样有什么好处呢？

比如说管理员有 aaa、bbb、ccc 3 个权限，而张三、李四、王五都是管理员。有一天想给管理员添加一个 ddd 的权限：
* 如果是 ACL 的权限控制，需要给张三、李四、王五分别分配这个权限。
* 而 RBAC 呢？只需要给张三、李四、王五分配管理员的角色，然后只更改管理员角色对应的权限就好了。

所以说，当用户很多的时候，给不同的用户分配不同的权限会很麻烦，这时候一般会先把不同的权限封装到角色里，再把角色授予用户。

RBAC 相比 ACL 更方便的地方就在于：分配权限的时候，是以角色为单位的，这样如果这个角色的权限变了，那分配这个角色的用户权限也就变了。

## 基于 ACL 实现权限控制

### 数据库与项目准备

在数据库中创建 acl_test 的 database：

```sql
CREATE DATABASE acl_test DEFAULT CHARACTER SET utf8mb4;
```

创建个 nest 项目：

    nest new acl-test -p npm

安装 typeorm 的依赖：

    npm install --save @nestjs/typeorm typeorm mysql2

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
      database: "acl_test",
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

然后添加创建 user 模块：

    nest g resource user

添加 User 和 Permission 的 Entity：

```javascript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        length: 50
    })
    username: string;

    @Column({
        length: 50
    })
    password: string;

    @CreateDateColumn()
    createTime: Date;

    @UpdateDateColumn()
    updateTime: Date;
}
```

User 有 id、username、password、createTime、updateTime 5 个字段。

```javascript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Permission {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        length: 50
    })
    name: string;

    @Column({
        length: 100,
        nullable: true
    })
    desc: string;

    @CreateDateColumn()
    createTime: Date;

    @UpdateDateColumn()
    updateTime: Date;
}

```

permission 有 id、name、desc、createTime、updateTime 5 个字段，desc 字段可以为空。

然后在 User 里加入和 Permission 的关系，也就是多对多：

```javascript
@ManyToMany(() => Permission)
@JoinTable({
    name: 'user_permission_relation'
})
permissions: Permission[]
```

通过 @ManyToMany 声明和 Permission 的多对多关系。多对多是需要中间表的，通过 @JoinTable 声明，指定中间表的名字。

然后在 TypeOrmModule.forRoot 的 entities 数组加入这俩 entity，把 Nest 服务跑起来试试：

    npm run start:dev

可以看到生成了 user、permission、user_permission_relation 这 3 个表，并且中间表 user_permission_relation 还有 userId、permissionId 两个外键（主表删除或者更新时，从表级联删除或者更新）。

### 初始化数据

不是用 sql 插入，而是用 TypeORM 的 api 来插入。修改下 UserService，添加这部分代码：

```javascript
@InjectEntityManager()
entityManager: EntityManager;

async initData() {
    const permission1 = new Permission();
    permission1.name = 'create_aaa';
    permission1.desc = '新增 aaa';

    const permission2 = new Permission();
    permission2.name = 'update_aaa';
    permission2.desc = '修改 aaa';

    const permission3 = new Permission();
    permission3.name = 'remove_aaa';
    permission3.desc = '删除 aaa';

    const permission4 = new Permission();
    permission4.name = 'query_aaa';
    permission4.desc = '查询 aaa';

    const permission5 = new Permission();
    permission5.name = 'create_bbb';
    permission5.desc = '新增 bbb';

    const permission6 = new Permission();
    permission6.name = 'update_bbb';
    permission6.desc = '修改 bbb';

    const permission7 = new Permission();
    permission7.name = 'remove_bbb';
    permission7.desc = '删除 bbb';

    const permission8 = new Permission();
    permission8.name = 'query_bbb';
    permission8.desc = '查询 bbb';

    const user1 = new User();
    user1.username = '东东';
    user1.password = 'aaaaaa';
    user1.permissions  = [
      permission1, permission2, permission3, permission4
    ]

    const user2 = new User();
    user2.username = '光光';
    user2.password = 'bbbbbb';
    user2.permissions  = [
      permission5, permission6, permission7, permission8
    ]

    await this.entityManager.save([
      permission1,
      permission2,
      permission3,
      permission4,
      permission5,
      permission6,
      permission7,
      permission8
    ])
    await this.entityManager.save([
      user1,
      user2
    ]);
}
```

注入 EntityManager，实现权限和用户的保存。aaa 增删改查、bbb 增删改查，一共 8 个权限。user1 有 aaa 的 4 个权限，user2 有 bbb 的 4 个权限。调用 entityManager.save 来保存。

然后改下 UserController，添加 init 的路由：

```javascript
@Get('init')
async initData() {
    await this.userService.initData();
    return 'done'
}
```

浏览器访问下，服务端打印了一堆 sql（包了一层事务），分别向 user、permission、user_permission_relation 中插入了数据。

### 登录（session + cookie 方式）

然后实现登录的接口，这次通过 session + cookie 的方式。安装 session 相关的包：

    npm install express-session @types/express-session

在 main.ts 里使用这个中间件：

```javascript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(session({
    secret: 'guang',
    resave: false,
    saveUninitialized: false
  }));
  await app.listen(3000);
}
bootstrap();
```

secret 是加密 cookie 的密钥。resave 是 session 没变的时候要不要重新生成 cookie。saveUninitialized 是没登录要不要也创建一个 session。

然后在 UserController 添加一个 /user/login 的路由：

```javascript
@Post('login')
login(@Body() loginUser: LoginUserDto, @Session() session){
    console.log(loginUser)
    return 'success'
}
```

然后先去创建 dto 对象，并安装 ValidationPipe 用到的包：

    npm install --save class-validator class-transformer

然后给 dto 对象添加 class-validator 的装饰器，并全局启用 ValidationPipe：

```javascript
import { IsNotEmpty, Length } from "class-validator";

export class LoginUserDto {
    @IsNotEmpty()
    @Length(1, 50)
    username: string;

    @IsNotEmpty()
    @Length(1, 50)
    password: string;
}
```

接下来实现查询数据库的逻辑，在 UserService 添加 login 方法：

```javascript
async login(loginUserDto: LoginUserDto) {
    const user = await this.entityManager.findOneBy(User, {
      username: loginUserDto.username
    });

    if(!user) {
      throw new HttpException('用户不存在', HttpStatus.ACCEPTED);
    }

    if(user.password !== loginUserDto.password) {
      throw new HttpException('密码错误', HttpStatus.ACCEPTED);
    }

    return user;
}
```

然后改下 UserController 的 login 方法，调用 userService，并且把 user 信息放入 session：

```javascript
@Post('login')
async login(@Body() loginUser: LoginUserDto, @Session() session){
    const user = await this.userService.login(loginUser);

    session.user = {
      username: user.username
    }

    return 'success';
}
```

登录成功之后会返回 cookie，之后只要带上这个 cookie 就可以查询到服务端的对应的 session，从而取出 user 信息。

### 添加 CRUD 模块和 Guard

然后添加 aaa、bbb 两个模块，分别生成 CRUD 方法：

    nest g resource aaa
    nest g resource bbb

这些接口默认可以直接访问，而实际上需要控制权限。用户东东有 aaa 的增删改查权限，而用户光光拥有 bbb 的增删改查权限。

先添加一个 LoginGuard，限制只有登录状态才可以访问这些接口：

    nest g guard login --no-spec --flat

然后增加登录状态的检查：

```javascript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

declare module 'express-session' {
  interface Session {
    user: {
      username: string
    }
  }
}

@Injectable()
export class LoginGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    if(!request.session?.user){
      throw new UnauthorizedException('用户未登录');
    }

    return true;
  }
}
```

因为默认的 session 里没有 user 的类型，所以需要扩展下：利用同名 interface 会自动合并的特点来扩展 Session。然后给接口都加上这个 Guard。

在 postman 里带上 cookie 访问（访问登录接口之后，服务端返回 set-cookie 的 header，postman 会自动带上 cookie，行为和浏览器里一致），这时候再访问 aaa、bbb 的接口，就可以访问了。

### PermissionGuard 实现权限校验

这样还不够，还需要再做登录用户的权限控制，再写个 PermissionGuard：

    nest g guard permission --no-spec --flat

因为 PermissionGuard 里需要用到 UserService 来查询数据库，所以把它移动到 UserModule 里，注入 UserService：

```javascript
import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { UserService } from './user.service';

@Injectable()
export class PermissionGuard implements CanActivate {

  @Inject(UserService)
  private userService: UserService;

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {

    console.log(this.userService);

    return true;
  }
}
```

在 UserModule 的 providers、exports 里添加 UserService：

```javascript
import { Module, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PermissionGuard } from './permission.guard';

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
```

在 AaaModule 里引入这个 UserModule，然后在 /aaa 的 handler 里添加 PermissionGuard。

然后在 UserService 里添加一个方法，根据用户名查找用户，并且查询出关联的权限：

```javascript
async findByUsername(username: string) {
  const user = await this.entityManager.findOne(User, {
    where: {
      username,
    },
    relations: {
      permissions: true
    }
  });
  return user;
}
```

在 PermissionGuard 里调用下：

```javascript
import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { UserService } from './user.service';

@Injectable()
export class PermissionGuard implements CanActivate {

  @Inject(UserService)
  private userService: UserService;

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    const user = request.session.user;
    if(!user) {
      throw new UnauthorizedException('用户未登录');
    }

    const foundUser = await this.userService.findByUsername(user.username);

    console.log(foundUser);

    return true;
  }
}
```

### 通过 metadata 标记所需权限

然后根据当前 handler 需要的权限来判断是否返回 true。怎么给当前 handler 标记需要什么权限呢？很明显是通过 metadata。给 /aaa 接口声明需要 query_aaa 的 permission，然后在 PermissionGuard 里通过 reflector 取出来：取出 handler 声明的 metadata，如果用户权限里包含需要的权限，就返回 true，否则抛出没有权限的异常。

```javascript
import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { UserService } from './user.service';

@Injectable()
export class PermissionGuard implements CanActivate {

  @Inject(UserService)
  private userService: UserService;

  @Inject(Reflector)
  private reflector: Reflector;

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    const user = request.session.user;
    if(!user) {
      throw new UnauthorizedException('用户未登录');
    }

    const foundUser = await this.userService.findByUsername(user.username);

    const permission = this.reflector.get('permission', context.getHandler());

    if(foundUser.permissions.some(item => item.name === permission)) {
       return true;
    } else {
      throw new UnauthorizedException('没有权限访问该接口');
    }
  }
}
```

测试下：登录光光的账号访问 /aaa，会提示没有权限；登录东东的账号（有 query_aaa 权限）访问 /aaa，可以正常访问。这样就通过 ACL 的方式完成了接口权限的控制。

### 用 redis 优化查询

每次访问接口，都会触发 3 个表的关联查询，效率太低。可以借助 redis 缓存来优化。

引入 redis：

    npm install redis

然后新建一个模块来封装 redis 操作：

    nest g module redis
    nest g service redis --no-spec

然后在 RedisModule 里添加 redis 的 provider，并使用 @Global 把这个模块声明为全局的，这样各个模块就都可以注入这个 RedisService：

```javascript
import { Global, Module } from '@nestjs/common';
import { createClient } from 'redis';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService,
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

然后在 RedisService 里添加一些 redis 操作方法：

```javascript
import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {

    @Inject('REDIS_CLIENT')
    private redisClient: RedisClientType

    async listGet(key: string) {
        return await this.redisClient.lRange(key, 0, -1);
    }

    async listSet(key: string, list: Array<string>, ttl?: number) {
        for(let i = 0; i < list.length;i++) {
            await this.redisClient.lPush(key, list[i]);
        }
        if(ttl) {
            await this.redisClient.expire(key, ttl);
        }
    }
}
```

注入 redisClient，封装 listGet 和 listSet 方法，listSet 方法支持传入过期时间。底层用的命令是 lrange 和 lpush、expire。

然后在 PermissionGuard 里注入来用下：先查询 redis、没有再查数据库并存到 redis，有的话就直接用 redis 的缓存结果。key 为 user_${username}_permissions，缓存过期时间为 30 分钟。

```javascript
import { RedisService } from './../redis/redis.service';
import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { UserService } from './user.service';

@Injectable()
export class PermissionGuard implements CanActivate {

  @Inject(UserService)
  private userService: UserService;

  @Inject(Reflector)
  private reflector: Reflector;

  @Inject(RedisService)
  private redisService: RedisService;

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    const user = request.session.user;
    if(!user) {
      throw new UnauthorizedException('用户未登录');
    }

    let permissions = await this.redisService.listGet(`user_${user.username}_permissions`);

    if(permissions.length === 0) {
      const foundUser = await this.userService.findByUsername(user.username);
      permissions = foundUser.permissions.map(item => item.name);

      this.redisService.listSet(`user_${user.username}_permissions`, permissions, 60 * 30)
    }

    const permission = this.reflector.get('permission', context.getHandler());

    if(permissions.some(item => item === permission)) {
      return true;
    } else {
      throw new UnauthorizedException('没有权限访问该接口');
    }
  }
}
```

整体效果：第一次访问会查数据库并写入 redis 缓存，之后刷新多少次都不会再产生 sql，直接查 redis 缓存。redis 是基于内存的，访问速度会比 mysql 快很多。

#### ACL 总结

有的接口除了需要登录外，还需要权限。这节通过 ACL（Access Control List）的方式实现了权限控制，它的特点是用户直接和权限关联。用户和权限是多对多关系，在数据库中会存在用户表、权限表、用户权限中间表。

登录的时候，把用户信息查出来，放到 session 或者 jwt 返回。然后访问接口的时候，在 Guard 里判断是否登录，是否有权限，没有就返回 401，有的话才会继续处理请求。

采用的是访问接口的时候查询权限的方案，通过 handler 上用 SetMetadata 声明的所需权限的信息，和从数据库中查出来的当前用户的权限做对比，有相应权限才会放行。这种方案查询数据库太频繁，需要用 redis 来做缓存。当然，选择登录的时候把权限一并查出来放到 session 或者 jwt 里也是可以的。

## 基于 RBAC 实现权限控制

### 数据库与项目准备

创建 rbac_test 的 database：

```sql
CREATE DATABASE rbac_test DEFAULT CHARACTER SET utf8mb4;
```

然后创建 nest 项目：

    nest new rbac-test -p npm

安装 typeorm 的依赖并引入 TypeOrmModule：

    npm install --save @nestjs/typeorm typeorm mysql2

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
      database: "rbac_test",
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

然后添加创建 user 模块：

    nest g resource user

用户、角色、权限都是多对多的关系。添加 User、Role、Permission 的 Entity：

```javascript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        length: 50
    })
    username: string;

    @Column({
        length: 50
    })
    password: string;

    @CreateDateColumn()
    createTime: Date;

    @UpdateDateColumn()
    updateTime: Date;

    @ManyToMany(() => Role)
    @JoinTable({
        name: 'user_role_relation'
    })
    roles: Role[]
}
```

User 有 id、username、password、createTime、updateTime 5 个字段。通过 @ManyToMany 映射和 Role 的多对多关系，并指定中间表的名字。

然后创建 Role 的 entity：

```javascript
import { Column, CreateDateColumn, Entity,PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Role {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        length: 20
    })
    name: string;

    @CreateDateColumn()
    createTime: Date;

    @UpdateDateColumn()
    updateTime: Date;

    @ManyToMany(() => Permission)
    @JoinTable({
        name: 'role_permission_relation'
    })
    permissions: Permission[]
}

```

Role 有 id、name、createTime、updateTime 4 个字段。通过 @ManyToMany 映射和 Permission 的多对多关系，并指定中间表的名字。

```javascript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Permission {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        length: 50
    })
    name: string;

    @Column({
        length: 100,
        nullable: true
    })
    desc: string;

    @CreateDateColumn()
    createTime: Date;

    @UpdateDateColumn()
    updateTime: Date;
}
```

Permission 有 id、name、createTime、updateTime 4 个字段。

然后在 TypeOrmModule.forRoot 的 entities 数组加入这三个 entity，把 Nest 服务跑起来试试：

    npm run start:dev

可以看到生成了 user、role、permission 这 3 个表，还有 user_role_relation、role_permission_relation 这 2 个中间表，两个中间表的外键约束也是对的。

### 初始化数据

然后来添加一些数据，同样是用代码的方式。修改下 UserService，添加这部分代码：

```javascript
@InjectEntityManager()
entityManager: EntityManager;

async initData() {
    const user1 = new User();
    user1.username = '张三';
    user1.password = '111111';

    const user2 = new User();
    user2.username = '李四';
    user2.password = '222222';

    const user3 = new User();
    user3.username = '王五';
    user3.password = '333333';

    const role1 = new Role();
    role1.name = '管理员';

    const role2 = new Role();
    role2.name = '普通用户';

    const permission1 = new Permission();
    permission1.name = '新增 aaa';

    const permission2 = new Permission();
    permission2.name = '修改 aaa';

    const permission3 = new Permission();
    permission3.name = '删除 aaa';

    const permission4 = new Permission();
    permission4.name = '查询 aaa';

    const permission5 = new Permission();
    permission5.name = '新增 bbb';

    const permission6 = new Permission();
    permission6.name = '修改 bbb';

    const permission7 = new Permission();
    permission7.name = '删除 bbb';

    const permission8 = new Permission();
    permission8.name = '查询 bbb';


    role1.permissions = [
      permission1,
      permission2,
      permission3,
      permission4,
      permission5,
      permission6,
      permission7,
      permission8
    ]

    role2.permissions = [
      permission1,
      permission2,
      permission3,
      permission4
    ]

    user1.roles = [role1];

    user2.roles = [role2];

    await this.entityManager.save(Permission, [
      permission1,
      permission2,
      permission3,
      permission4,
      permission5,
      permission6,
      permission7,
      permission8
    ])

    await this.entityManager.save(Role, [
      role1,
      role2
    ])

    await this.entityManager.save(User, [
      user1,
      user2
    ])
}
```

然后在 UserController 里添加一个 handler：

```javascript
@Get('init')
async initData() {
    await this.userService.initData();
    return 'done';
}
```

浏览器访问下，服务端打印了一堆 sql，分别插入了 user、role、permission 还有 2 个中间表的数据。管理员的角色有 aaa、bbb 的增删改查权限，而普通用户只有 aaa 的增删改查权限。

### 登录（jwt 方式）

然后实现下登录，通过 jwt 的方式。在 UserController 里增加一个 login 的 handler，并创建 user/dto/user-login.dto.ts：

```javascript
@Post('login')
login(@Body() loginUser: UserLoginDto){
    console.log(loginUser)
    return 'success'
}
```

```javascript
export class UserLoginDto {
    username: string;

    password: string;
}
```

安装 ValidationPipe 用到的包并给 dto 对象添加 class-validator 的装饰器，全局启用 ValidationPipe：

    npm install --save class-validator class-transformer

```javascript
import { IsNotEmpty, Length } from "class-validator";

export class UserLoginDto {
    @IsNotEmpty()
    @Length(1, 50)
    username: string;

    @IsNotEmpty()
    @Length(1, 50)
    password: string;
}
```

接下来实现查询数据库的逻辑，在 UserService 添加 login 方法，并把 user 的 roles 也关联查询出来：

```javascript
async login(loginUserDto: UserLoginDto) {
    const user = await this.entityManager.findOne(User, {
      where: {
        username: loginUserDto.username
      },
      relations: {
        roles: true
      }
    });

    if(!user) {
      throw new HttpException('用户不存在', HttpStatus.ACCEPTED);
    }

    if(user.password !== loginUserDto.password) {
      throw new HttpException('密码错误', HttpStatus.ACCEPTED);
    }

    return user;
}
```

安装 jwt 的包，在 AppModule 里引入 JwtModule（设置为全局模块），然后在 UserController 里注入 JwtService，把 user 信息放到 jwt 里，然后返回：

    npm install --save @nestjs/jwt

```javascript
@Post('login')
async login(@Body() loginUser: UserLoginDto){
  const user = await this.userService.login(loginUser);

  const token = this.jwtService.sign({
    user: {
      username: user.username,
      roles: user.roles
    }
  });

  return {
      token
  }
}
```

### 添加 CRUD 模块与全局 Guard

添加 aaa、bbb 两个模块，分别生成 CRUD 方法：

    nest g resource aaa
    nest g resource bbb

然后要对接口的调用做限制。先添加一个 LoginGuard：

    nest g guard login --no-spec --flat

然后增加登录状态的检查（这里不用查数据库，因为 jwt 是用密钥加密的，只要 jwt 能 verify 通过就行了）：

```javascript
import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class LoginGuard implements CanActivate {

  @Inject(JwtService)
  private jwtService: JwtService;

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    const authorization = request.headers.authorization;

    if(!authorization) {
      throw new UnauthorizedException('用户未登录');
    }

    try{
      const token = authorization.split(' ')[1];
      const data = this.jwtService.verify(token);

      request.user = data.user;
      return true;
    } catch(e) {
      throw new UnauthorizedException('token 失效，请重新登录');
    }
  }
}
```

然后把它放到 request 上，但会报错 user 不在 Request 的类型上，扩展下就好了：

```typescript
declare module 'express' {
  interface Request {
    user: {
      username: string;
      roles: Role[]
    }
  }
}
```

因为 typescript 里同名 module 和 interface 会自动合并，可以这样扩展类型。

ACL 方案是一个个加的 Guard，太麻烦，这次全局加：通过 app.useGlobalXxx 的方式不能注入 provider，可以通过在 AppModule 添加 token 为 APP_XXX 的 provider 的方式来声明全局 Guard、Pipe、Interceptor 等。

但这时候访问 /user/login 接口也被拦截了，需要区分哪些接口需要登录，哪些接口不需要。这时候就可以用 SetMetadata 了。添加一个 custom-decorator.ts 来放自定义的装饰器：

```typescript
import { SetMetadata } from "@nestjs/common";

export const  RequireLogin = () => SetMetadata('require-login', true);
```

声明一个 RequireLogin 的装饰器，在 aaa、bbb 的 controller 上用一下。支持在 controller 上添加声明，不需要每个 handler 都添加，这样方便很多。

然后需要改造下 LoginGuard，取出目标 handler 的 metadata 来判断是否需要登录：

```javascript
const requireLogin = this.reflector.getAllAndOverride('require-login', [
  context.getClass(),
  context.getHandler()
]);

console.log(requireLogin)

if(!requireLogin) {
  return true;
}
```

如果目标 handler 或者 controller 不包含 require-login 的 metadata，那就放行，否则才检查 jwt。这样登录接口能正常访问，而 aaa、bbb 需要登录。

### PermissionGuard 实现权限校验

还需要再做登录用户的权限控制，再写个 PermissionGuard：

    nest g guard permission --no-spec --flat

同样声明成全局 Guard。PermissionGuard 里需要用到 UserService，所以在 UserModule 里导出下 UserService，然后注入：

```javascript
import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { UserService } from './user.service';

@Injectable()
export class PermissionGuard implements CanActivate {

  @Inject(UserService)
  private userService: UserService;

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {

    console.log(this.userService);

    return true;
  }
}
```

然后在 UserService 里实现查询 role 的信息的 service，关联查询出 permissions：

```typescript
async findRolesByIds(roleIds: number[]) {
    return this.entityManager.find(Role, {
      where: {
        id: In(roleIds)
      },
      relations: {
        permissions: true
      }
    });
}
```

然后在 PermissionGuard 里调用下。因为这个 PermissionGuard 在 LoginGuard 之后调用（在 AppModule 里声明在 LoginGuard 之后），所以走到这里 request 里就有 user 对象了。但也不一定，因为 LoginGuard 没有登录也可能放行，所以要判断下 request.user 如果没有，这里也放行。

```typescript
import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user/user.service';

@Injectable()
export class PermissionGuard implements CanActivate {

  @Inject(UserService)
  private userService: UserService;

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    if(!request.user) {
      return true;
    }

    const roles = await this.userService.findRolesByIds(request.user.roles.map(item => item.id))

    const permissions: Permission[]  = roles.reduce((total, current) => {
      total.push(...current.permissions);
      return total;
    }, []);

    console.log(permissions);

    return true;
  }
}
```

取出 user 的 roles 的 id，查出 roles 的 permission 信息，然后合并到一个数组里。

再增加个自定义 decorator：

```typescript
export const  RequirePermission = (...permissions: string[]) => SetMetadata('require-permission', permissions);
```

然后在 BbbController 上声明需要的权限，在 PermissionGuard 里取出来判断：

```javascript
const requiredPermissions = this.reflector.getAllAndOverride<string[]>('require-permission', [
  context.getClass(),
  context.getHandler()
])

console.log(requiredPermissions);
```

然后添加对比逻辑，判断用户有的权限是否包含接口需要的权限：

```javascript
for(let i = 0; i < requiredPermissions.length; i++) {
  const curPermission = requiredPermissions[i];
  const found = permissions.find(item => item.name === curPermission);
  if(!found) {
    throw new UnauthorizedException('您没有访问该接口的权限');
  }
}
```

测试下：当前用户是李四，是没有访问 bbb 的权限的；再登录下张三账号，用他的 token 访问 bbb 接口，就能正常访问了。这样，就实现了基于 RBAC 的权限控制。

RBAC 检查权限的部分和 ACL 差别不大，都是通过声明的需要的权限和用户有的权限作对比。但是分配权限的时候，是以角色为单位的，这样如果这个角色的权限变了，那分配这个角色的用户权限也就变了，这就是 RBAC 相比 ACL 更方便的地方。此外，查询角色需要的权限没必要每次都查数据库，可以通过 redis 来加一层缓存（具体写法参考 ACL 一节）。

#### RBAC 总结

这节学了 RBAC（role based access control）权限控制，它相比于 ACL 的方式，多了一层角色，给用户分配角色而不是直接分配权限。检查权限的时候还是要把角色的权限合并之后再检查是否有需要的权限。

通过 jwt 实现了登录，把用户和角色信息放到 token 里返回。添加了 LoginGuard 来做登录状态的检查，然后添加了 PermissionGuard 来做权限的检查。

LoginGuard 里从 jwt 取出 user 信息放入 request，PermissionGuard 从数据库取出角色对应的权限，检查目标 handler 和 controller 上声明的所需权限是否满足。LoginGuard 和 PermissionGuard 需要注入一些 provider，所以通过在 AppModule 里声明 APP_GUARD 为 token 的 provider 来注册的全局 Guard。然后在 controller 和 handler 上添加 metadata 来声明是否需要登录、需要什么权限，之后在 Guard 里取出来做检查。

这种方案查询数据库也比较频繁，也应该加一层 redis 来做缓存。

这就是基于 RBAC 的权限控制，是用的最多的一种权限控制方案。当然，这是 RBAC0 的方案，更复杂一点的权限模型，可能会用 RBAC1、RBAC2 等，那个就是多角色继承、用户组、角色之间互斥之类的概念，会了 RBAC0，那些也就是做一些变形的事情。绝大多数系统，用 RBAC0 就足够了。