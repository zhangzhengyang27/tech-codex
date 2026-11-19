---
title: passport 身份认证与三方登录（GitHub、Google）
description: 使用 passport 库做身份认证，并基于 GitHub、Google 策略实现三方账号登录
keywords: [passport, 身份认证, 三方登录, GitHub, Google, Nest]
category: Node.js
tags: [Node.js, Nest, passport, JWT, GitHub, Google, 服务端, OAuth]
---


# passport 身份认证与三方登录（GitHub、Google）

## passport 的设计思路

身份认证逻辑（如基于用户名密码的认证、基于 JWT 的认证）非常通用，每个项目都会有，因此可以抽取成一个库——passport 就是这样一个身份认证库。

理解 passport 的关键在于它的封装思路：

1. **策略模式封装多种认证方式**。身份认证有多种方式：用户名密码、JWT、Google 登录、GitHub 登录等。passport 用策略模式把它们封装成一个个策略类（Strategy）。策略模式即实现了一个接口的多个类，这些类可以相互替换。
2. **不同策略的共同点**。虽然认证逻辑不同，但各策略做的事情很类似：
   - 用户名密码登录是从 request 的 body 里取出 username、password 来认证；
   - JWT 是从 request 的 Authorization 的 header 取出 token 来认证。

   **不同策略都会从 request 中取出一些东西来认证，认证成功后就在 request.user 上存放认证后的 user 信息**——这就是它们的共同点。

理解了这个封装思路，passport 这个库的核心也就掌握了。

## 使用 passport 做身份认证

### 用户名密码认证（passport-local）

创建 Nest 项目并安装 passport：

    nest new nest-passport
    npm install --save @nestjs/passport passport

实现用户名密码认证需要 passport-local 策略：

    npm install --save passport-local
    npm install --save-dev @types/passport-local

创建认证模块：

    nest g module auth
    nest g service auth --no-spec

添加用户名密码认证的策略：

```javascript
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(username: string, password: string) {
    const user = await this.authService.validateUser(username, password);
    return user;
  }
}
```

在 AuthModule 引入 LocalStrategy。其逻辑与 passport 的设计一致：从 request 的 body 中取出 username 和 password 交给 validate 方法认证，认证通过后返回 user，passport 会把 user 放到 request.user 上；认证不通过则抛异常，由 exception filter 处理。

在 AuthService 里实现 validateUser 方法：

```javascript
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {

    @Inject()
    private userService: UserService;

    async validateUser(username: string, pass: string) {
        const user = await this.userService.findOne(username);

        if(!user) {
            throw new UnauthorizedException('用户不存在');
        }
        if(user.password !== pass) {
            throw new UnauthorizedException('密码错误');
        }

        const { password, ...result } = user;
        return result;
    }
}
```

查询用户的逻辑应在 UserModule 里实现：

    nest g module user
    nest g service user --no-spec

UserService：

```javascript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
    private readonly users = [
        {
            userId: 1,
            username: '神说要有光',
            password: 'guang',
        },
        {
            userId: 2,
            username: '东东东',
            password: 'dong',
        },
    ];

    async findOne(username: string) {
        return this.users.find(user => user.username === username);
    }
}
```

在 UserModule 里导出 UserService，然后在 AuthModule 里引入。这样 passport 的流程就完成了：从 request 中取出 body 的 username 和 password 交给 validate 方法认证，认证完返回 user 信息并放到 request.user 上。

### 应用策略（Guard 方式）

应用策略适合用 Guard，@nestjs/passport 已做好封装。在 AppController 里添加 login 方法：

```javascript
import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Req() req: Request) {
    console.log(req.user);
    return req.user;
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

把服务跑起来，在 postman 里测试。基于 passport 的登录就此完成：不需要自己从 request 取 body 中的 username 和 password，不需要把查询结果放到 request.user 上，也不需要自己实现 Guard。

### JWT 认证（passport-jwt）

JWT 认证是另一种认证方式，需要新的策略。流程：登录时通过用户名、密码认证，登录成功返回 JWT；之后访问时在 Authorization 的 header 携带 JWT，服务端通过 header 的 JWT 来认证。

首先在登录成功后返回 JWT，安装用到的包：

    npm install --save @nestjs/jwt

在 AppModule 里引入：

```javascript
JwtModule.register({
    secret: "guang"
}),
```

然后在 AppController 里让 login 接口返回 JWT 的 token，这里需要扩展 express 的 request.user 的类型：

```javascript
import { Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';

interface JwtUserData {
  userId: number;
  username: string;
}

declare module 'express' {
  interface Request {
    user: JwtUserData
  }
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Inject()
  jwtService: JwtService;

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Req() req: Request) {
    console.log(req.user);
    const token = this.jwtService.sign({
      userId: req.user.userId,
      username: req.user.username
    }, {
      expiresIn: '0.5h'
    });

    return {
      token
    }
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

登录之后返回 JWT 就此完成。

接着添加 jwt.strategy.ts：

```javascript
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'guang',
    });
  }

  async validate(payload: any) {
    return { userId: payload.userId, username: payload.username };
  }
}
```

该策略指定从 request 的 header 里提取 token，取出 payload 后传入 validate 方法做验证，返回的值同样会设置到 request.user。

安装用到的包：

    npm install --save passport-jwt
    npm install --save-dev @types/passport-jwt

在 AuthModule 引入，并在 AppController 里添加一个新的需要登录认证的接口：

```javascript
@UseGuards(AuthGuard('jwt'))
@Get("list")
list(@Req() req: Request) {
    console.log(req.user);
    return ['111', '222', '333', '444', '555']
}
```

不带 token 访问会失败；通过 Authorization 的 header 带上 `Bearer xxx` 的 token 访问就成功——JWT 认证生效。

对比使用 passport 与不使用的区别：不需要自己从 request 的 header 里取 token，不需要把从 token 提取的信息放到 request.user 里，也不需要自己写 Guard，方便了很多。

### 扩展 Guard（@IsPublic 装饰器）

以上用到了 local 和 jwt 两个策略。其他策略的流程类似：从 request 取一些信息，交给 validate 方法验证，返回 user 放到 request.user 里。

对 Guard 流程的扩展示例：JWT 的 Guard 需要在每个 controller 上手动应用，改为通过一个 `@IsPublic` 装饰器来标识——有 `@IsPublic` 装饰器的路由不需要身份认证，否则需要。做法是继承 `AuthGuard('jwt')` 做扩展。

首先生成一个自定义装饰器：

    nest g decorator is-public --flat --no-spec

其实现就是给被装饰对象添加一个 metadata：

```javascript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const IsPublic = () => SetMetadata(IS_PUBLIC_KEY, true);
```

在 AppController 里加几个路由：

```javascript
@IsPublic()
@Get('aaa')
aaa() {
    return 'aaa';
}

@Get('bbb')
bbb() {
    return 'bbb';
}
```

aaa 是 public 的，不需要身份认证；bbb 需要。这时需要扩展 `AuthGuard('jwt')`，新建 auth/JwtAuthGuard.ts：

```javascript
import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from '../is-public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
```

实现逻辑：从目标 controller、handler 上取 public 的 metadata，有就直接放行，否则才做认证。然后在 AppModule 里注册为全局 Guard：

```javascript
{
    provide: APP_GUARD,
    useClass: JwtAuthGuard
}
```

#### passport 基础总结

- passport 把不同的认证逻辑封装成了不同 Strategy，每个 Strategy 都有 validate 方法来验证。
- **每个 Strategy 都是从 request 取出一些东西，交给 validate 方法验证，validate 方法返回 user 信息，自动放到 request.user 上。**
- @nestjs/passport 提供了 Guard 可以直接用；需要扩展时，继承 `AuthGuard('xxx')` 然后重写 canActivate 方法即可。

## passport 实现 GitHub 三方账号登录

各类网站除用户名、密码登录外，一般也支持三方登录（如 Google 登录、GitHub 登录），免去输入用户名密码的麻烦，直接用别的账号登录当前网站。passport 提供了非常多的策略，passport-local（用户名密码认证）、passport-jwt（JWT 认证）只是最基础的；GitHub 三方登录使用 passport-github2 策略。

### 获取 GitHub client id 和 secret

GitHub 登录的关键是拿到 client id 和 secret。生成步骤：点击 settings > developer settings > new OAuth App，填入信息后点击 register application。client id 生成后，点击生成 secret。注意：secret 只能看见这一次，需复制保存（丢失可以再次生成）。

### 代码实现

新建 Nest 项目并安装 passport 的包：

    nest new github-login
    npm install --save passport @nestjs/passport

安装 passport-github2 的策略：

    npm install --save passport-github2
    npm install --save-dev @types/passport-github2

生成一个 auth 模块：

    nest g module auth

添加 auth/auth.strategy.ts：

```javascript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: 'Ov23liPsg7pxupYsMXah',
      clientSecret: 'ad3604a0147924406fcd2f597fb234a188cae1f9',
      callbackURL: 'http://localhost:3000/callback',
      scope: ['user:email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    return profile;
  }
}
```

这里的 clientID 和 clientSecret 要替换为自己的。callbackURL 是登录成功后回调的 url，scope 是请求的数据的范围。

在 AuthModule 引入 GithubStrategy：

```javascript
import { Module } from '@nestjs/common';
import { GithubStrategy } from './auth.strategy';

@Module({
    providers: [GithubStrategy]
})
export class AuthModule {}
```

在 AppController 添加两个路由：

```javascript

import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('')
export class AppController {
  constructor(private appService: AppService) {}

  @Get('login')
  @UseGuards(AuthGuard('github'))
  async login() {
  }

  @Get('callback')
  @UseGuards(AuthGuard('github'))
  async authCallback(@Req() req) {
    return req.user;
  }
}
```

login 是触发 GitHub 登录的路由，callback 是回调的 url。passport 的策略会在验证过后把 validate 的返回值放在 request.user 上，所以可以从 req.user 取到返回的用户信息。

运行项目：访问 http://localhost:3000/login 会跳转 GitHub 登录授权页面，点击 authorize 后会回调 callback 接口。拿到 id 即可唯一标识这个用户。

### 基于 githubId 查询用户

可以在用户表里添加一个 githubId 字段：第一次用 GitHub 登录时记录返回的 id、username、avatar 等信息，然后打开一个页面让用户完善其他信息（如 email、password 等）；后续用 GitHub 登录时，直接根据 githubId 查询用户即可。

修改 AppService：

```javascript
import { Injectable } from '@nestjs/common';

const users = [
  {
    username: 'guangguang',
    githubId: '80755847',
    email: 'yyy@163.com',
    hobbies: ['sleep', 'writing']
  },
  {
    username: 'dongdong',
    email: 'xxx@xx.com',
    hobbies: ['swimming']
  }
]

@Injectable()
export class AppService {

  findUserByGithubId(githubId: string){
    return users.find(item => item.githubId === githubId);
  }

  getHello(): string {
    return 'Hello World!';
  }
}
```

其中 guangguang 用户用 GitHub 登录过、记录了 githubId。在 AppController 里取出 GitHub 返回的 id 查询用户信息，即可登录：

```javascript
@Get('callback')
@UseGuards(AuthGuard('github'))
async authCallback(@Req() req) {
    return this.appService.findUserByGithubId(req.user.id);
}
```

访问 http://localhost:3000/login 会跳转 GitHub 登录，授权后访问 callback，根据 id 查询出用户信息返回。GitHub 登录实现完成。实际项目中这里应返回 JWT，后续直接用 JWT 来认证。

#### GitHub 登录总结

- 基于 passport 的 GitHub 策略可实现三方登录，核心是获取 clientID、clientSecret，在 GithubStrategy 的构造函数传入这些信息，在 validate 方法里拿到返回的 profile。
- 在用户表存一个 githubId 字段，用 GitHub 登录之后根据 id 查询用户信息实现登录，免去每次登录输入用户名密码的麻烦。

## passport 实现 Google 三方账号登录

### 获取 Google client id 和 secret

创建 Nest 项目并安装 passport 包：

    nest new google-login
    npm install --save passport @nestjs/passport

安装 Google 的策略包（去 passport 的官网搜索 passport-google-oauth20，选下载量最多的那个）：

    npm install --save passport-google-oauth20
    npm install --save-dev @types/passport-google-oauth20

Google 登录的关键同样是获取 client id 和 client secret。步骤：打开 Google Cloud 控制台页面 https://console.cloud.google.com/welcome ；点击左上角按钮，点击 new project，填入项目名后点击 create；切换到刚创建的 project，进入 api & service 页面；点击 OAuth consent screen，勾选 external，点击 create，输入三个必填信息后点击 save and continue；然后点击 Credentials 创建凭证，输入应用类型、name、授权的域名、回调的 url，点击 create，client id 和 client secret 即生成。

### 代码实现

生成 auth 模块：

    nest g module auth

创建 auth/google.strategy.ts：

```javascript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: '122695705559-9nr9alq0s53e2pr3vkiv2h7vau917ic4.apps.googleusercontent.com',
      clientSecret: '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',
      callbackURL: 'http://localhost:3000/callback/google',
      scope: ['email', 'profile'],
    });
  }

  validate (accessToken: string, refreshToken: string, profile: any) {
    const { name, emails, photos } = profile
    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0].value,
      accessToken
    }
    return user;
  }
}
```

填入刚生成的 clientID、clientSecret、callbackURL。然后在 AuthModule 引入：

```javascript
import { Module } from '@nestjs/common';
import { GoogleStrategy } from './google.strategy';

@Module({
    providers: [GoogleStrategy]
})
export class AuthModule {}
```

在 AppController 添加两个路由（一个登录、一个回调）：

```javascript
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('callback/google')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req) {
    if (!req.user) {
      return 'No user from google'
    }

    return {
      message: 'User information from google',
      user: req.user
    }
  }
}
```

把服务跑起来：

    npm run start:dev

测试可见 Google 的用户信息已拿到。与 GitHub 返回 id 不同，Google 返回了 email，同样可以唯一标识用户。

### 接入数据库自动注册

medium.com 或 hub.docker.com 的三方登录流程可供参考：用 Google 账号登录后会让用户完善一些信息然后 create account——即基于 Google 账号的信息再补充一些内容，完成账号注册；之后 Google 登录就会查到该账号，直接登录、不用输密码。以下实现同样的流程。

引入 TypeORM 操作数据库：

    npm install --save @nestjs/typeorm typeorm mysql2

AppModule 里引入 TypeOrmModule：

```javascript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forRoot({
      type: "mysql",
      host: "localhost",
      port: 3306,
      username: "root",
      password: "guang",
      database: "google-login",
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

在 mysql workbench 创建 database，添加 src/user.entity.ts：

```javascript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum RegisterType {
    normal = 1,
    google = 2
}
@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        length: 50
    })
    email: string;

    @Column({
        length: 20
    })
    password: string;

    @Column({
        comment: '昵称',
        length: 50
    })
    nickName: string;

    @Column({
        comment: '头像 url',
        length: 200
    })
    avatar: string;

    @Column({
        comment: '注册类型: 1.用户名密码注册 2. google自动注册',
        default: 1
    })
    registerType: RegisterType;

    @CreateDateColumn()
    createTime: Date;

    @UpdateDateColumn()
    updateTime: Date;
}
```

User 实体有 id、email、nickName、avatar、registerType、createTime、updateTime 7 个字段。registerType 用来标识注册方式：正常注册是 1，Google 账号自动注册是 2。需要区分是因为 Google 方式注册不需要 password，验证逻辑不一样。在 entities 里引入后跑起来，会自动创建对应的表。

在 AppService 里注入 EntityManager 操作 user 表：

```javascript
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { User } from './user.entity';

export interface GoogleInfo {
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
}

@Injectable()
export class AppService {

  @InjectEntityManager()
  entityManager: EntityManager;

  getHello(): string {
    return 'Hello World!';
  }

  async registerByGoogleInfo(info: GoogleInfo) {
    const user = new User();

    user.nickName = `${info.firstName}_${info.lastName}`;
    user.avatar = info.picture;
    user.email = info.email;
    user.password = '';
    user.registerType = RegisterType.google;

    return this.entityManager.save(User, user);
  }

  async findGoogleUserByEmail(email: string) {
    return this.entityManager.findOneBy(User, {
      registerType: 2,
      email
    });
  }
}
```

其中 findGoogleUserByEmail 方法根据 email 查询 Google 注册的账号，registerByGoogleInfo 方法根据 Google 返回的信息自动注册账号。

在 AppController 里修改 callback 的逻辑：

```javascript
@Get('callback/google')
@UseGuards(AuthGuard('google'))
async googleAuthRedirect(@Req() req) {
    const user = await this.appService.findGoogleUserByEmail(req.user.email);

    if(!user) {
      const newUser = this.appService.registerByGoogleInfo(req.user);
      return newUser;
    } else {
      return user;
    }
}
```

逻辑：先根据 email 查询 Google 方式登录的 user，有就自动登录，否则自动注册然后登录。因为 Google 返回的信息是全的，可以直接自动注册；如果信息不全，需要再跳转一个页面填写其余信息之后再自动注册。

由于之前登录过 Google 账号并授权，短时间内不需要再次授权，这里直接触发注册并登录；之后再用这个 Google 账号登录，就会直接登录、不需要再注册。

**登录后如何返回 JWT**：网站登录后一般会重定向到首页，此时返回 JWT 的 token 可参考 hub.docker.com 的做法——不直接返回 JWT 的 token，而是重定向回首页并在 cookie 里携带 token；前端判断 cookie 里有这些 token 就自动登录。

#### Google 登录总结

- 搜索对应的 passport 策略，生成 client id 和 client secret。
- 在 Nest 项目里使用该策略，添加登录和 callback 的路由。
- 基于 Google 返回的信息自动注册；信息不够时重定向到一个 url 让用户填写其余信息。
- 再次用该 Google 账号登录时会自动登录。
