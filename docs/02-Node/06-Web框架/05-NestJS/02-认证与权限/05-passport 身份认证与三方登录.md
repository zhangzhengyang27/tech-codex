---
title: passport 身份认证与三方登录（GitHub、Google）
description: 使用 passport 库做身份认证，并基于 GitHub、Google 策略实现三方账号登录
keywords: [passport, 身份认证, 三方登录, GitHub, Google, Nest]
category: Node.js
tags: [Node.js, Nest, passport, JWT, GitHub, Google, 服务端, OAuth]
---


# passport 身份认证与三方登录

之前都是自己实现身份认证，比如基于用户名密码的认证，基于 jwt 的认证。像这种身份认证逻辑其实很通用，每个项目都会有，自然可以抽取成一个库。passport 就是这样一个身份认证库。

先不看第三方库是怎么做的，思考下，如果让你做一个身份认证的库，你会怎么设计呢？

首先，身份认证有多种方式，比如用户名密码、jwt、google 登录、github 登录等。这多种方式都可以实现身份认证，那就可以用策略模式把它们封装成一个个策略类（Strategy）。策略模式其实就是实现了一个接口的多个类，这些类可以相互替换。

然后每个策略类里封装什么呢？其实不同的认证方式虽然逻辑不同，但做的事情很类似：

* 用户名密码登录就是从 request 的 body 里取出 username、password 来认证。
* jwt 是从 request 的 Authorization 的 header 取出 token 来认证。

**不同策略都会从 request 中取出一些东西来认证，如果认证成功，就在 request.user 上存放认证后的 user 信息**，这就是它们的共同点。比如 passport 的两种策略，不管是用户名密码的身份认证，还是 jwt 的身份认证，都会从 request 的 body 或者 header 中取出一些信息来，然后认证通过之后返回 user 的信息，passport 会设置到 request.user 上。

这个封装思路你理解了，那 passport 这个库也就差不多掌握了。

## 使用 passport 做身份认证

### 用户名密码认证（passport-local）

在 nest 里用一下 passport 这个库：

    nest new nest-passport

进入项目，安装 passport：

    npm install --save @nestjs/passport passport

然后首先实现用户名密码的认证，这用到 passport-local 的策略，安装下：

    npm install --save passport-local
    npm install --save-dev @types/passport-local

然后创建一个认证模块：

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

在 AuthModule 引入下。这个 LocalStrategy 的逻辑就像前面分析的：从 request 的 body 中取出 username 和 password 交给你去认证，认证过了之后返回 user，它会把 user 放到 request.user 上，如果认证不通过，就抛异常，由 exception filter 处理。

在 AuthService 里实现这个 validateUser 方法：

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

AuthService 里根据用户名密码去校验，但是查询用户的逻辑应该在 UserModule 里，写一下：

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

在 UserModule 里导出 UserService，然后在 AuthModule 里引入下。这样，passport 的流程就完成了：它会从 request 中取出 body 的 username 和 password 交给 validate 方法去认证，认证完会返回 user 信息，放到 request.user 上。

### 应用策略（Guard 方式）

那怎么应用这个策略呢？很明显，这里适合用 Guard。@nestjs/passport 已经做了封装了。在 AppController 里加个 login 方法：

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

把服务跑起来，postman 里测试下。这样，基于 passport 的登录就完成了。不用自己从 request 取 body 中的 username 和 password，也不用把查询结果放到 request.user 上，更不用自己实现 Guard。

### JWT 认证（passport-jwt）

继续做 JWT 的认证：登录的时候通过用户名、密码认证，登录认证成功会返回 jwt，然后再次访问会在 Authorization 的 header 携带 jwt，然后通过 header 的 jwt 来认证。这是一种新的认证方式，需要用新的策略。

首先在登录成功之后返回 jwt，安装用到的包：

    npm install --save @nestjs/jwt

在 AppModule 里引入下：

```javascript
JwtModule.register({
    secret: "guang"
}),
```

然后在 AppController 里 login 接口返回 jwt 的 token，这里需要扩展下 express 的 request.user 的类型：

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

这样，登录之后返回 jwt 就完成了。

然后添加 jwt.strategy.ts：

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

指定从 request 的 header 里提取 token，然后取出 payload 之后会传入 validate 方法做验证，返回的值同样会设置到 request.user。

安装用到的包：

    npm install --save passport-jwt
    npm install --save-dev @types/passport-jwt

在 AuthModule 引入下，在 AppController 里添加一个新的需要登录认证的接口：

```javascript
@UseGuards(AuthGuard('jwt'))
@Get("list")
list(@Req() req: Request) {
    console.log(req.user);
    return ['111', '222', '333', '444', '555']
}
```

不带 token 访问会失败，通过 Authorization 的 header 带上 Bearer xxx 的 token 访问就成功，jwt 的认证生效了。

对比下用 passport 和不用有啥区别呢？不用自己从 request 的 header 里取 token 了，也不用自己从 token 提取的信息放到 request.user 里了，也不用自己写 Guard 了，方便了很多。

### 扩展 Guard（@IsPublic 装饰器）

这样，就用了 local 和 jwt 两个策略了。其他策略也是类似的流程：从 request 取一些信息，交给 validate 方法去验证，返回 user 放到 request.user 里。

如果我想对 Guard 的流程做一些扩展呢？比如 jwt 的 Guard，现在需要在每个 controller 上手动应用，我想通过一个 @IsPublic 的装饰器来标识，如果有 @IsPublic 的装饰器就不需要身份认证，否则就需要。这就需要继承 AuthGuard('jwt') 做一些扩展了。

首先，生成一个自定义装饰器：

    nest g decorator is-public --flat --no-spec

它的实现就是给被装饰对象添加一个 metadata：

```javascript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const IsPublic = () => SetMetadata(IS_PUBLIC_KEY, true);
```

然后在 AppController 里加几个路由：

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

aaa 是 public 的，不需要身份认证，而 bbb 需要。这时就需要对 AuthGuard('jwt') 做下扩展。新建 auth/JwtAuthGuard.ts：

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

实现就是从目标 controller、handler 上取 public 的 metadata，如果有就直接放行，否则才做认证。然后在 AppModule 里注册为全局 Guard：

```javascript
{
    provide: APP_GUARD,
    useClass: JwtAuthGuard
}
```

#### passport 基础总结

passport 把不同的认证逻辑封装成了不同 Strategy，每个 Strategy 都有 validate 方法来验证。

**每个 Strategy 都是从 request 取出一些东西，交给 validate 方法验证，validate 方法返回 user 信息，自动放到 request.user 上。**

并且 @nestjs/passport 提供了 Guard 可以直接用，如果你想扩展，继承 AuthGuard('xxx') 然后重写下 canActivate 方法就好了。

## passport 实现 GitHub 三方账号登录

每天都会登录各种网站，这些网站除了用户名、密码登录外，一般也都支持三方登录。比如 google 登录、github 登录，免去了输入用户名密码的麻烦，直接用别的账号来登录当前网站。

还是用 passport 这个包，它提供了非常多的策略。passport-local（用户名密码认证）、passport-jwt（jwt 认证）只是最基础的。这节用 passport-github2 来实现基于 github 的三方登录。

### 获取 GitHub client id 和 secret

这个的关键是要拿到 client id 和 secret。来生成一下：点击 settings > developer settings > new OAuth App，填入信息后点击 register application。现在 client id 有了，点击生成 secret。提示你了，这里的 secret 只能看见这一次，复制保存下来（丢了也没啥，可以再次生成）。

有了 client id 和 secret 之后，就能实现 github 登录了。

### 代码实现

新建个 nest 项目并安装 passport 的包：

    nest new github-login
    npm install --save passport @nestjs/passport

然后安装 passport-github2 的策略：

    npm install --save passport-github2
    npm install --save-dev @types/passport-github2

生成一个 auth 模块：

    nest g module auth

然后添加 auth/auth.strategy.ts：

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

这里的 clientID 和 clientSecret 要换成你自己的。callbackURL 是登录成功后回调的 url。scope 是请求的数据的范围。

在 AuthModule 引入下这个 GithubStrategy：

```javascript
import { Module } from '@nestjs/common';
import { GithubStrategy } from './auth.strategy';

@Module({
    providers: [GithubStrategy]
})
export class AuthModule {}
```

然后在 AppController 添加两个路由：

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

login 是触发 github 登录的，然后 callback 是回调的 url。前面讲过 passport 的策略会在验证过后把 validate 的返回值放在 request.user 上，所以这里可以从 req.user 取到返回的用户信息。

跑一下：当你访问 http://localhost:3000/login，会跳转 github 登录授权页面，然后点击 authorize，会回调 callback 接口。这样拿到 id 就可以唯一标识这个用户。

可以在用户表里添加一个 githubId 的字段，第一次用 github 登录的时候，记录返回的 id、username、avatar 等信息，然后打开一个页面让用户完善其他信息（比如 email、password 等）。然后后续用 github 登录的时候，直接根据 githubId 来查询用户即可。

改下 AppService：

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

guangguang 用户用 github 登录过，记录了他的 githubId。然后在 AppController 里取出 github 返回的 id 来，查询用户信息，即可登录：

```javascript
@Get('callback')
@UseGuards(AuthGuard('github'))
async authCallback(@Req() req) {
    return this.appService.findUserByGithubId(req.user.id);
}
```

现在访问 http://localhost:3000/login 会跳转 github 登录，授权后访问 callback，根据 id 查询出了用户信息返回。这样就实现了 github 的登录。当然，这里应该是返回 jwt，然后后续直接用 jwt 来认证就好了。

#### GitHub 登录总结

很多网站都支持三方登录，这样不用每次都输入用户名密码。基于 passport 的 GitHub 策略实现了三方登录。它核心就是要获取 clientID、clientSecret，然后在 GithubStrategy 的构造函数传入这些信息，在 validate 方法里就可以拿到返回的 profile。

只要在用户表存一个 githubId 的字段，用 github 登录之后根据 id 查询用户信息，实现登录就好了。这样就免去了每次登录都输入用户名密码的麻烦。

## passport 实现 Google 三方账号登录

上一节实现了 Github 登录，这节继续来实现下 Google 登录。

### 获取 Google client id 和 secret

创建个 nest 项目并安装 passport 包：

    nest new google-login
    npm install --save passport @nestjs/passport

然后安装 google 的策略包（去 passport 的网站搜索 passport-google-oauth20，找下载量最多的那个）：

    npm install --save passport-google-oauth20
    npm install --save-dev @types/passport-google-oauth20

做 google 登录，最关键的也是要获取 client id 和 client secret。打开 google cloud 的控制台页面 https://console.cloud.google.com/welcome。

点击左上角的按钮，然后点击 new project，填入项目名后点击 create。点击左上角的按钮切换到你刚刚创建的 project，进入 api & service 页面。点击 OAuth consent screen，然后勾选 external，点击 create，输入三个必填信息，点击 save and continue。然后点击 Credentials 创建凭证，输入应用类型、name、填入授权的域名、回调的 url，点击 create。这样 client id 和 client secret 就生成好了。

### 代码实现

    nest g module auth

生成 auth 模块，然后创建 auth/google.strategy.ts：

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

这里填入刚刚的 clientID、clientSecret、callbackURL。然后在 AuthModule 引入：

```javascript
import { Module } from '@nestjs/common';
import { GoogleStrategy } from './google.strategy';

@Module({
    providers: [GoogleStrategy]
})
export class AuthModule {}
```

之后在 AppController 添加两个路由：

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

一个是登录的，一个是回调的。把服务跑起来：

    npm run start:dev

测试下：google 的用户信息拿到了。这里没有 github 返回的那种有 id，但这里返回了 email，同样可以唯一标识用户。

### 接入数据库自动注册

你可以试下 medium.com 或 hub.docker.com 的三方登录，用 google 账号登录之后，会让你完善一些信息，然后 create account。也就是基于你 google 账号里的东西，再让你填一些东西之后，完成账号注册。之后 google 登录，就会查到这个账号，从而直接登录，不用输密码。也来实现下。

引入下 TypeORM 来操作数据库：

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

在 mysql workbench 创建这个 database，添加 src/user.entity.ts：

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

有 id、email、nickName、avatar、registerType、createTime、updateTime 7 个字段。registerType 用来标识哪种注册方式，正常注册是 1，google 账号自动注册是 2。要区分是因为 google 方式注册就不用 password 了，验证逻辑不一样。在 entities 里引入，跑起来自动创建了对应的表。

然后在 AppService 里注入 EntityManager 来操作 user 表：

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

实现了 findGoogleUserByEmail 方法，可以根据 email 查询 google 注册的账号。实现了 registerByGoogleInfo 方法，根据 google 返回的信息自动注册账号。

然后在 AppController 里改下 callback 的逻辑：

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

首先根据 email 查询 google 方式登录的 user，如果有，就自动登录。否则自动注册然后登录。这里因为 google 返回的信息是全的，就直接自动注册了。如果不全，需要再跳转一个页面填写其余信息之后再自动注册。

因为前面登录过 google 账号并授权了，短时间内不需要再次授权，所以这里直接触发了注册并登录了。当你用这个 google 账号登录，就会直接登录，不需要再注册了。

网站登录后一般都会重定向到首页，那这时候怎么返回 jwt 的 token 呢？看下 hub.docker.com 怎么做的：它并不是直接返回 jwt 的 token，而是重定向回首页，在 cookie 里携带 token。这样前端只要判断下如果 cookie 里有这些 token 就自动登录就好了。

#### Google 登录总结

实现了基于 google 的三方账号登录。首先搜索对应的 passport 策略，然后生成 client id 和 client secret。在 nest 项目里使用这个策略，添加登录和 callback 的路由。

之后基于 google 返回的信息来自动注册，如果信息不够，可以重定向到一个 url 让用户填写其余信息。之后再次用这个 google 账号登录的话，就会自动登录。