---
title: AOP、装饰器与请求处理链路
description: "Nest 的 AOP 机制详解：Middleware/Guard/Interceptor/Pipe/ExceptionFilter 五种切面的用法与执行顺序，内置与自定义装饰器（applyDecorators、createParamDecorator）、Reflect metadata 原理、ArgumentsHost/ExecutionContext 与 RxJS 常用 operator。"
keywords: []
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# AOP、装饰器与请求处理链路


---


后端框架基本都是 MVC 的架构。

MVC 是 Model View Controller 的简写。MVC 架构下，请求会先发送给 Controller，由它调度 Model 层的 Service 来完成业务逻辑，然后返回对应的 View。

在这个流程中，Nest 还提供了 AOP （Aspect Oriented Programming）的能力，也就是面向切面编程的能力。

AOP 是什么意思呢？什么是面向切面编程呢？

一个请求过来，可能会经过 Controller（控制器）、Service（服务）、Repository（数据库访问） 的逻辑：

如果想在这个调用链路里加入一些通用逻辑该怎么加呢？比如日志记录、权限控制、异常处理等。

容易想到的是直接改造 Controller 层代码，加入这段逻辑。

这样可以，但是不优雅，因为这些通用的逻辑侵入到了业务逻辑里面。能不能透明的给这些业务逻辑加上日志、权限等处理呢？

那是不是可以在调用 Controller 之前和之后加入一个执行通用逻辑的阶段呢？

比如这样：

是不是就和切了一刀一样？

这样的横向扩展点就叫做切面，这种透明的加入一些切面逻辑的编程方式就叫做 AOP （面向切面编程）。

**AOP 的好处是可以把一些通用逻辑分离到切面中，保持业务逻辑的纯粹性，这样切面逻辑可以复用，还可以动态的增删。**

其实 Express 的中间件的洋葱模型也是一种 AOP 的实现，因为你可以透明的在外面包一层，加入一些逻辑，内层感知不到。

而 Nest 实现 AOP 的方式更多，一共有五种，包括 Middleware、Guard、Pipe、Interceptor、ExceptionFilter。

新建个 nest 项目，挨个试一下：

```
nest new aop-test
```

### 中间件 Middleware

中间件是 Express 里的概念，Nest 的底层是 Express，所以自然也可以使用中间件，但是做了进一步的细分，分为了全局中间件和路由中间件。

全局中间件就是这样：

在 main.ts 里通过 app.use 使用：

```javascript
app.use(function(req: Request, res: Response, next: NextFunction) {
    console.log('before', req.url);
    next();
    console.log('after');
})
```

在 AppController 里也加个打印：

把服务跑起来：

```
npm run start:dev
```
浏览器访问下：

可以看到，在调用 handler 前后，执行了中间件的逻辑。

再添加几个路由：

```javascript
@Get('aaa')
aaa(): string {
    console.log('aaa...');
    return 'aaa';
}

@Get('bbb')
bbb(): string {
    console.log('bbb...');
    return 'bbb';
}
```
然后浏览器访问下：

可以看到，中间件逻辑都执行了：

也就是说，可以在多个 handler 之间复用中间件的逻辑：

这种可以给在 handler 前后动态增加一些可复用的逻辑，就是 AOP 的切面编程的思想。

除了全局中间件，Nest 还支持路由中间件。

用 nest cli 创建一个路由中间件：

```
nest g middleware log --no-spec --flat
```

--no-spec 是不生成测试文件，--flat 是平铺，不生成目录。

生成的代码是这样的：

在前后打印下日志：

```javascript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class LogMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    console.log('before2', req.url);

    next();

    console.log('after2');
  }
}

```
然后在 AppModule 里启用：

```javascript
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LogMiddleware } from './log.middleware';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule{

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogMiddleware).forRoutes('aaa*');
  }

}

```

在 configure 方法里配置 LogMiddleware 在哪些路由生效。

然后测试下：

可以看到，只有 aaa 的路由，中间件生效了。

这就是全局中间件和路由中间件的区别。

### Guard

Guard 是路由守卫的意思，可以用于在调用某个 Controller 之前判断权限，返回 true 或者 false 来决定是否放行：

创建个 Guard：

```
nest g guard login --no-spec --flat
```

生成的 Guard 代码是这样的：

Guard 要实现 CanActivate 接口，实现 canActivate 方法，可以从 context 拿到请求的信息，然后做一些权限验证等处理之后返回 true 或者 false。

加个打印语句，然后返回 false：

```javascript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class LoginGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    console.log('login check')
    return false;
  }
}

```

之后在 AppController 里启用：

然后再访问下：

aaa 没有权限，返回了 403。

Controller 本身不需要做啥修改，却透明的加上了权限判断的逻辑，这就是 AOP 架构的好处。

而且，就像 Middleware 支持全局级别和路由级别一样，Guard 也可以全局启用：

这样每个路由都会应用这个 Guard：

还有一种全局启用的方式，是在 AppModule 里这样声明：

```javascript
{
  provide: APP_GUARD,
  useClass: LoginGuard
}
```
把 main.ts 里的 useGlobalGuards 注释掉：

再试下：

可以看到，Guard 依然是生效的。

那为什么都是声明全局 Guard，需要有两种方式呢？

因为之前这种方式是手动 new 的 Guard 实例，不在 IoC 容器里：

而用 provider 的方式声明的 Guard 是在 IoC 容器里的，可以注入别的 provider：

注入下 AppService 试试：

```javascript
@Inject(AppService)
private appService: AppService;
```
浏览器访问下：

可以看到，注入的 AppService 生效了。

所以，当需要注入别的 provider 的时候，就要用第二种全局 Guard 的声明方式。

### Interceptor

Interceptor 是拦截器的意思，可以在目标 Controller 方法前后加入一些逻辑：

创建个 interceptor：

```
nest g interceptor time --no-spec --flat
```

生成的 interceptor 是这样的：

Interceptor 要实现 NestInterceptor 接口，实现 intercept 方法，调用 next.handle() 就会调用目标 Controller，可以在之前和之后加入一些处理逻辑。

Controller 之前之后的处理逻辑可能是异步的。Nest 里通过 rxjs 来组织它们，所以可以使用 rxjs 的各种 operator。

```javascript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class TimeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        console.log('time: ', Date.now() - startTime)
      })
    );
  }
}
```

把之前那个 LoginGuard 注掉：

然后启用这个 interceptor：

跑一下：

可以看到，interceptor 生效了。

有的同学可能会觉得 Interceptor 和 Middleware 差不多，其实是有区别的，主要在于参数的不同。

interceptor 可以拿到调用的 controller 和 handler：

后面会在 controller 和 handler 上加一些 metadata，这种就只有 interceptor 或者 guard 里可以取出来，middleware 不行。

Interceptor 支持每个路由单独启用，只作用于某个 handler：

也可以在 controller 级别启动，作用于下面的全部 handler：

也同样支持全局启用，作用于全部 controller：

两种全局启用方式的区别和 guard 的一样，就不测试了。

除了路由的权限控制、目标 Controller 之前之后的处理这些都是通用逻辑外，对参数的处理也是一个通用的逻辑，所以 Nest 也抽出了对应的切面，也就是 Pipe：

### Pipe

Pipe 是管道的意思，用来对参数做一些检验和转换：

用 nest cli 创建个 pipe：
```
nest g pipe validate --no-spec --flat
```

生成的代码是这样的：

Pipe 要实现 PipeTransform 接口，实现 transform 方法，里面可以对传入的参数值 value 做参数验证，比如格式、类型是否正确，不正确就抛出异常。也可以做转换，返回转换后的值。

实现下：

```javascript
import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ValidatePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {

    if(Number.isNaN(parseInt(value))) {
      throw new BadRequestException(`参数${metadata.data}错误`)
    }

    return typeof value === 'number' ? value * 10 : parseInt(value) * 10;
  }
}
```
这里的 value 就是传入的参数，如果不能转成数字，就返回参数错误，否则乘 10 再传入 handler：

在 AppController 添加一个 handler，然后应用这个 pipe：

```javascript
@Get('ccc')
ccc(@Query('num', ValidatePipe) num: number) {
    return num + 1;
}
```
访问下：


可以看到，参数错误的时候返回了 400 响应，参数正确的时候也乘 10 传入了 handler。

这就是 Pipe 的作用。

Nest 内置了一些 Pipe，从名字就能看出它们的意思：

*   ValidationPipe
*   ParseIntPipe
*   ParseBoolPipe
*   ParseArrayPipe
*   ParseUUIDPipe
*   DefaultValuePipe
*   ParseEnumPipe
*   ParseFloatPipe
*   ParseFilePipe

同样，Pipe 可以只对某个参数生效，或者整个 Controller 都生效：

或者全局生效：

不管是 Pipe、Guard、Interceptor 还是最终调用的 Controller，过程中都可以抛出一些异常，如何对某种异常做出某种响应呢？

这种异常到响应的映射也是一种通用逻辑，Nest 提供了 ExceptionFilter 来支持：

### ExceptionFilter

ExceptionFilter 可以对抛出的异常做处理，返回对应的响应：

其实刚刚在 pipe 里抛的这个错误，能够返回 400 的响应，就是 Exception Filter 做的：

创建一个 filter：

```
nest g filter test --no-spec --flat
```

生成的代码是这样的：

改一下：

```javascript
import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class TestFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {

    const response: Response = host.switchToHttp().getResponse();

    response.status(400).json({
      statusCode: 400,
      message: 'test: ' + exception.message
    })
  }
}
```

实现 ExceptionFilter 接口，实现 catch 方法，就可以拦截异常了。

拦截什么异常用 @Catch 装饰器来声明，然后在 catch 方法返回对应的响应，给用户更友好的提示。

用一下：

再次访问，异常返回的响应就变了：

Nest 内置了很多 http 相关的异常，都是 HttpException 的子类：

*   BadRequestException
*   UnauthorizedException
*   NotFoundException
*   ForbiddenException
*   NotAcceptableException
*   RequestTimeoutException
*   ConflictException
*   GoneException
*   PayloadTooLargeException
*   UnsupportedMediaTypeException
*   UnprocessableEntityException
*   InternalServerErrorException
*   NotImplementedException
*   BadGatewayException
*   ServiceUnavailableException
*   GatewayTimeoutException

当然，也可以自己扩展：

**Nest 通过这样的方式实现了异常到响应的对应关系，代码里只要抛出不同的异常，就会返回对应的响应，很方便。**

同样，ExceptionFilter 也可以选择全局生效或者某个路由生效：

某个 handler：
某个 controller：

全局：

了解了 Nest 提供的 AOP 的机制，但它们的顺序关系是怎样的呢？

### 几种 AOP 机制的顺序

Middleware、Guard、Pipe、Interceptor、ExceptionFilter 都可以透明的添加某种处理逻辑到某个路由或者全部路由，这就是 AOP 的好处。

但是它们之间的顺序关系是什么呢？

调用关系这个得看源码了。

对应的源码是这样的：

很明显，进入这个路由的时候，会先调用 Guard，判断是否有权限等，如果没有权限，这里就抛异常了：

抛出的 ForbiddenException 会被 ExceptionFilter 处理，返回 403 状态码。

如果有权限，就会调用到拦截器，拦截器组织了一个链条，一个个的调用，最后会调用的 controller 的方法：

调用 controller 方法之前，会使用 pipe 对参数做处理：

会对每个参数做转换：

ExceptionFilter 的调用时机很容易想到，就是在响应之前对异常做一次处理。

而 Middleware 是 express 中的概念，Nest 只是继承了下，那个是在最外层被调用。

这就是这几种 AOP 机制的调用顺序。把这些理清楚，就知道什么逻辑放在什么切面里了。

## 总结

Nest 基于 express 这种 http 平台做了一层封装，应用了 MVC、IOC、AOP 等架构思想。

MVC 就是 Model、View Controller 的划分，请求先经过 Controller，然后调用 Model 层的 Service、Repository 完成业务逻辑，最后返回对应的 View。

IOC 是指 Nest 会自动扫描带有 @Controller、@Injectable 装饰器的类，创建它们的对象，并根据依赖关系自动注入它依赖的对象，免去了手动创建和组装对象的麻烦。

AOP 则是把通用逻辑抽离出来，通过切面的方式添加到某个地方，可以复用和动态增删切面逻辑。

Nest 的 Middleware、Guard、Interceptor、Pipe、ExceptionFilter 都是 AOP 思想的实现，只不过是不同位置的切面，它们都可以灵活的作用在某个路由或者全部路由，这就是 AOP 的优势。

通过源码来看了它们的调用顺序，Middleware 是 Express 的概念，在最外层，到了某个路由之后，会先调用 Guard，Guard 用于判断路由有没有权限访问，然后会调用 Interceptor，对 Controller 前后扩展一些逻辑，在到达目标 Controller 之前，还会调用 Pipe 来对参数做检验和转换。所有的 HttpException 的异常都会被 ExceptionFilter 处理，返回不同的响应。

Nest 就是通过这种 AOP 的架构方式，实现了松耦合、易于维护和扩展的架构。

AOP 架构的好处，你感受到了么？

---


Nest 的功能都是大多通过装饰器来使用的，这节就把所有的装饰器过一遍。

创建个新的 nest 项目：

    nest new all-decorator -p npm

Nest 提供了一套模块系统，通过 @Module 声明模块：

通过 @Controller、@Injectable 分别声明其中的 controller 和 provider：

这个 provider 可以是任何的 class：

注入的方式可以是构造器注入：

或者属性注入：

属性注入要指定注入的 token，可能是 class 也可能是 string。

你可以通过 useFactory、useValue 等方式声明 provider：

这时候也需要通过 @Inject 指定注入的 token：

这些注入的依赖如果没有的话，创建对象时会报错。但如果它是可选的，你可以用 @Optional 声明一下，这样没有对应的 provider 也能正常创建这个对象。

如果模块被很多地方都引用，为了方便，可以用 @Global 把它声明为全局的，这样它 exports 的 provider 就可以直接注入了：

filter 是处理抛出的未捕获异常的，通过 @Catch 来指定处理的异常：

然后通过 @UseFilters 应用到 handler 上：

除了 filter 之外，interceptor、guard、pipe 也是这样用：

当然，pipe 更多还是单独在某个参数的位置应用：

这里的 @Query 是取 url 后的 ?bbb=true，而 @Param 是取路径中的参数，比如 /xxx/111 中的 111

此外，如果是 @Post 请求，可以通过 @Body 取到 body 部分：

一般用 dto 的 class 来接受请求体里的参数：

nest 会实例化一个 dto 对象：

用 postman 发个 post 请求：

可以看到 nest 接受到了 body 里的参数：

除了 @Get、@Post 外，还可以用 @Put、@Delete、@Patch、@Options、@Head 装饰器分别接受 put、delete、patch、options、head 请求：

handler 和 class 可以通过 @SetMetadata 指定 metadata：

然后在 guard 或者 interceptor 里取出来：

你可以通过 @Headers 装饰器取某个请求头 或者全部请求头：

通过 @Ip 拿到请求的 ip：

通过 @Session 拿到 session 对象：

但要使用 session 需要安装一个 express 中间件：

    npm install express-session

在 main.ts 里引入并启用：

指定加密的密钥和 cookie 的存活时间。

然后刷新页面：

会返回 set-cookie 的响应头，设置了 cookie，包含 sid 也就是 sessionId。

之后每次请求都会自动带上这个 cookie：

这样就可以在 session 对象里存储信息了。

@HostParam 用于取域名部分的参数：

再创建个 controller：

    nest g controller aaa --no-spec --flat

这样指定 controller 的生效路径：

```javascript
import { Controller, Get, HostParam } from '@nestjs/common';

@Controller({ host: ':host.0.0.1', path: 'aaa' })
export class AaaController {
    @Get('bbb')
    hello() {
        return 'hello';
    }
}
```

controller 除了可以指定某些 path 生效外，还可以指定 host：

然后再访问下：

这时候你会发现只有 host 满足 xx.0.0.1 的时候才会路由到这个 controller。

host 里的参数就可以通过 @HostParam 取出来：

```javascript
import { Controller, Get, HostParam } from '@nestjs/common';

@Controller({ host: ':host.0.0.1', path: 'aaa' })
export class AaaController {
    @Get('bbb')
    hello(@HostParam('host') host) {
        return host;
    }
}
```

前面取的这些都是 request 里的属性，当然也可以直接注入 request 对象：

通过 @Req 或者 @Request 装饰器，这俩是同一个东西：

注入 request 对象后，可以手动取任何参数：

当然，也可以 @Res 或者 @Response 注入 response 对象，只不过 response 对象有点特殊：

当你注入 response 对象之后，服务器会一直没有响应：

因为这时候 Nest 就不会再把 handler 返回值作为响应内容了。

你可以自己返回响应：

Nest 这么设计是为了避免你自己返回的响应和 Nest 返回的响应的冲突。

如果你不会自己返回响应，可以通过 passthrough 参数告诉 Nest：

除了注入 @Res 不会返回响应外，注入 @Next 也不会：

当你有两个 handler 来处理同一个路由的时候，可以在第一个 handler 里注入 next，调用它来把请求转发到第二个 handler：

Nest 不会处理注入 @Next 的 handler 的返回值。

handler 默认返回的是 200 的状态码，你可以通过 @HttpCode 修改它：

当然，你也可以修改 response header，通过 @Header 装饰器：

此外，你还可以通过 @Redirect 装饰器来指定路由重定向的 url：

或者在返回值的地方设置 url：

```javascript
@Get('xxx')
@Redirect()
async jump() {
    return {
      url: 'https://www.baidu.com',
      statusCode: 302
    }
}
```

你还可以给返回的响应内容指定渲染引擎，不过这需要先这样设置：

```javascript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  await app.listen(3000);
}
bootstrap();

```

分别指定静态资源的路径和模版的路径，并指定模版引擎为 handlebars。

当然，还需要安装模版引擎的包 hbs：

    npm install --save hbs

然后准备图片和模版文件：

在 handler 里指定模版和数据：

就可以看到渲染出的 html 了：

## 总结

这节梳理了下 Nest 全部的装饰器

*   @Module： 声明 Nest 模块
*   @Controller：声明模块里的 controller
*   @Injectable：声明模块里可以注入的 provider
*   @Inject：通过 token 手动指定注入的 provider，token 可以是 class 或者 string
*   @Optional：声明注入的 provider 是可选的，可以为空
*   @Global：声明全局模块
*   @Catch：声明 exception filter 处理的 exception 类型
*   @UseFilters：路由级别使用 exception filter
*   @UsePipes：路由级别使用 pipe
*   @UseInterceptors：路由级别使用 interceptor
*   @SetMetadata：在 class 或者 handler 上添加 metadata
*   @Get、@Post、@Put、@Delete、@Patch、@Options、@Head：声明 get、post、put、delete、patch、options、head 的请求方式
*   @Param：取出 url 中的参数，比如 /aaa/:id 中的 id
*   @Query: 取出 query 部分的参数，比如 /aaa?name=xx 中的 name
*   @Body：取出请求 body，通过 dto class 来接收
*   @Headers：取出某个或全部请求头
*   @Session：取出 session 对象，需要启用 express-session 中间件
*   @HostParam： 取出 host 里的参数
*   @Req、@Request：注入 request 对象
*   @Res、@Response：注入 response 对象，一旦注入了这个 Nest 就不会把返回值作为响应了，除非指定 passthrough 为 true
*   @Next：注入调用下一个 handler 的 next 方法
*   @HttpCode： 修改响应的状态码
*   @Header：修改响应头
*   @Redirect：指定重定向的 url
*   @Render：指定渲染用的模版引擎

把这些装饰器用熟，就掌握了 nest 大部分功能了。

---


Nest 内置了很多装饰器，大多数功能都是通过装饰器来使用的。

但当这些装饰器都不满足需求的时候，能不能自己开发呢？

装饰器比较多的时候，能不能把多个装饰器合并成一个呢？

自然是可以的。

很多内置装饰器都可以自己实现。

来试试看：

    nest new custom-decorator -p npm

创建个 nest 项目。

执行

    nest g decorator aaa --flat

创建个 decorator。

这个装饰器就是自定义的装饰器。

之前是这样用的 @SetMetadata

然后加个 Guard 取出来做一些判断：

    nest g guard aaa --flat --no-spec

guard 里使用 reflector 来取 metadata：

```javascript
import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class AaaGuard implements CanActivate {
  @Inject(Reflector)
  private reflector: Reflector;

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {

    console.log(this.reflector.get('aaa', context.getHandler()));

    return true;
  }
}
```
加到路由上：

把服务跑起来：

```
npm run start:dev
```
然后访问 http://localhost:3000 可以看到打印的 metadata

但是不同 metadata 有不同的业务场景，有的是用于权限的，有的是用于其他场景的。

但现在都用 @SetMetadata 来设置太原始了。

这时候就可以这样封装一层：

装饰器就可以简化成这样：

还有，有没有觉得现在装饰器太多了，能不能合并成一个呢？

当然也是可以的。

这样写：

```javascript
import { applyDecorators, Get, UseGuards } from '@nestjs/common';
import { Aaa } from './aaa.decorator';
import { AaaGuard } from './aaa.guard';

export function Bbb(path, role) {
  return applyDecorators(
    Get(path),
    Aaa(role),
    UseGuards(AaaGuard)
  )
}
```

在自定义装饰器里通过 applyDecorators 调用其他装饰器。

这三个 handler 的装饰器都是一样的效果。

这就是自定义方法装饰器。

此外，也可以自定义参数装饰器：

```javascript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Ccc = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    return 'ccc';
  },
);
```

先用用看：

大家猜这个 c 参数的值是啥？


回过头来看看这个装饰器：

data 很明显就是传入的参数，而 ExecutionContext 前面用过，可以取出 request、response 对象。

这样那些内置的 @Param、@Query、@Ip、@Headers 等装饰器，是不是能自己实现了呢？

来试试看：

```javascript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const MyHeaders = createParamDecorator(
  (key: string, ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest();
    return key ? request.headers[key.toLowerCase()] : request.headers;
  },
);
```

通过 ExecutionContext 取出 request 对象，然后取出 key 对应的请求头返回。

效果如下：

分别通过内置的 @Headers 装饰器和自己实现的 @MyHeaders 装饰器来取请求头，结果是一样的。

再来实现下 @Query 装饰器：

```javascript
export const MyQuery = createParamDecorator(
    (key: string, ctx: ExecutionContext) => {
        const request: Request = ctx.switchToHttp().getRequest();
        return request.query[key];
    },
);
```

用一下试试看：

和内置的 Query 用起来一毛一样！

同理，其他内置参数装饰器也能自己实现。

而且这些装饰器和内置装饰器一样，可以使用 Pipe 做参数验证和转换：

知道了如何自定义方法和参数的装饰器，那 class 的装饰器呢？

其实这个和方法装饰器的定义方式一样：

比如单个装饰器：

可以看到自定义装饰器生效了：

也可以通过 applyDecorators 组合多个装饰器：

在 guard 里加一条打印：

浏览器访问下：

可以看到 metadata 也设置成功了：

## 总结

内置装饰器不够用的时候，或者想把多个装饰器合并成一个的时候，都可以自定义装饰器。

方法的装饰器就是传入参数，调用下别的装饰器就好了，比如对 @SetMetadata 的封装。

如果组合多个方法装饰器，可以使用 applyDecorators api。

class 装饰器和方法装饰器一样。

还可以通过 createParamDecorator 来创建参数装饰器，它能拿到 ExecutionContext，进而拿到 request、response，可以实现很多内置装饰器的功能，比如 @Query、@Headers 等装饰器。

通过自定义方法和参数的装饰器，可以让 Nest 代码更加的灵活。

---


通过装饰器声明之后，启动 Nest 应用，对象就自动创建好了，依赖也自动注入了。

那它是怎么实现的呢？

大家如果就这样去思考它的实现原理，还真不一定能想出来，因为缺少了一些前置知识。也就是实现 Nest 最核心的一些 api： Reflect 的 metadata 的 api。

有的同学会说，Reflect 的 api 我很熟呀，就是操作对象的属性、方法、构造器的一些 api：

比如 Reflect.get 是获取对象属性值

Reflect.set 是设置对象属性值

Reflect.has 是判断对象属性是否存在

Reflect.apply 是调用某个方法，传入对象和参数

Reflect.construct 是用构造器创建对象实例，传入构造器参数

这些 api 在 [MDN 文档](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect)里可以查到，因为它们都已经是 es 标准了，也被很多浏览器实现了。

但是实现 Nest 用到的 api 还没有进入标准，还在草案阶段，也就是 [metadata 的 api](https://rbuckton.github.io/reflect-metadata/)：

它有这些 api：

```typescript
Reflect.defineMetadata(metadataKey, metadataValue, target);

Reflect.defineMetadata(metadataKey, metadataValue, target, propertyKey);


let result = Reflect.getMetadata(metadataKey, target);

let result = Reflect.getMetadata(metadataKey, target, propertyKey);
```

Reflect.defineMetadata 和 Reflect.getMetadata 分别用于设置和获取某个类的元数据，如果最后传入了属性名，还可以单独为某个属性设置元数据。

那元数据存在哪呢？

存在类或者对象上呀，如果给类或者类的静态属性添加元数据，那就保存在类上，如果给实例属性添加元数据，那就保存在对象上，用类似 \[\[metadata]] 的 key 来存的。

这有啥用呢？

看上面的 api 确实看不出啥来，但它也支持装饰器的方式使用：

```javascript
@Reflect.metadata(metadataKey, metadataValue)
class C {

  @Reflect.metadata(metadataKey, metadataValue)
  method() {
  }
}

```

Reflect.metadata 装饰器当然也可以再封装一层：

```typescript
function Type(type) {
    return Reflect.metadata("design:type", type);
}
function ParamTypes(...types) {
    return Reflect.metadata("design:paramtypes", types);
}
function ReturnType(type) {
    return Reflect.metadata("design:returntype", type);
}

@ParamTypes(String, Number)
class Guang {
  constructor(text, i) {
  }

  @Type(String)
  get name() { return "text"; }

  @Type(Function)
  @ParamTypes(Number, Number)
  @ReturnType(Number)
  add(x, y) {
    return x + y;
  }
}
```

然后就可以通过 Reflect metadata 的 api 获取这个类和对象的元数据了：

```typescript
let obj = new Guang("a", 1);

let paramTypes = Reflect.getMetadata("design:paramtypes", obj, "add");
// [Number, Number]
```

这里用 Reflect.getMetadata 的 api 取出了 add 方法的参数的类型。

看到这里，大家是否明白 nest 的原理了呢？

再看下 nest 的源码：

上面就是 @Module 装饰器的实现，里面就调用了 Reflect.defineMetadata 来给这个类添加了一些元数据。

所以这样用的时候：

    import { Module } from '@nestjs/common';
    import { CatsController } from './cats.controller';
    import { CatsService } from './cats.service';

    @Module({
      controllers: [CatsController],
      providers: [CatsService],
    })
    export class CatsModule {}

其实就是给 CatsModule 添加了 controllers 的元数据和 providers 的元数据。

后面创建 IOC 容器的时候就会取出这些元数据来处理：

而且 @Controller 和 @Injectable 的装饰器也是这样实现的：

Nest 的实现原理就是通过装饰器给 class 或者对象添加元数据，然后初始化的时候取出这些元数据，进行依赖的分析，然后创建对应的实例对象就可以了。

所以说，nest 实现的核心就是 Reflect metadata 的 api。

当然，现在 metadata 的 api 还在草案阶段，需要使用 reflect-metadata 这个 polyfill 包才行。

其实还有一个疑问，依赖的扫描可以通过 metadata 数据，但是创建的对象需要知道构造器的参数，现在并没有添加这部分 metadata 数据呀：

比如这个 CatsController 依赖了 CatsService，但是并没有添加 metadata 呀：

```typescript
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CatsService } from './cats.service';
import { CreateCatDto } from './dto/create-cat.dto';

@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }
}
```

这就不得不提到 TypeScript 的优势了，TypeScript 支持编译时自动添加一些 metadata 数据：

比如这段代码：

    import "reflect-metadata";

    class Guang {
      @Reflect.metadata("名字", "光光")
      public say(a: number): string {
        return '加油鸭';
      }
    }

按理说只添加了一个元数据，生成的代码也确实是这样的：

但是呢，ts 有一个编译选项叫做 emitDecoratorMetadata，开启它就会自动添加一些元数据。

开启之后再试一下：

你会看到多了三个元数据：

design:type 是 Function，很明显，这个是描述装饰目标的元数据，这里装饰的是函数

design:paramtypes 是 \[Number]，很容易理解，就是参数的类型

design:returntype 是 String，也很容易理解，就是返回值的类型

所以说，只要开启了这个编译选项，ts 生成的代码会自动添加一些元数据。

然后创建对象的时候就可以通过 design:paramtypes 来拿到构造器参数的类型了，那不就知道怎么注入依赖了么？

所以，nest 源码里你会看到这样的代码：

就是获取构造器的参数类型的。这个常量就是上面说的那个：

这也是为什么 nest 会用 ts 来写，因为它很依赖这个 emitDecoratorMetadata 的编译选项。

你用 cli 生成的代码模版里也都默认开启了这个编译选项：

这就是 nest 的核心实现原理：**通过装饰器给 class 或者对象添加 metadata，并且开启 ts 的 emitDecoratorMetadata 来自动添加类型相关的 metadata，然后运行的时候通过这些元数据来实现依赖的扫描，对象的创建等等功能。**

Nest 的装饰器都是依赖 reflect-metadata 实现的，而且还提供了一个 @SetMetadata 的装饰器让可以给 class、method 添加一些 metadata：

这个装饰器的底层实现自然是 Reflect.defineMetadata：

Nest 为什么暴露这样一个底层的 metadata api 出来呢？

因为这个 metadata 是可以在代码里取出来用的：

创建新项目来测试下：

    nest new metadata-and-reflector -p npm

创建 guard 和 interceptor：

    nest g interceptor aaa --flat --no-spec
    nest g guard aaa --flat --no-spec

在路由级别应用：

加个打印语句：

然后 nest start --watch 把服务跑起来。

浏览器访问：

可以看到 guard 和 interceptor 成功执行了：

然后用 @SetMetadata 在 controller 上加个 metadata：

在 guard 和 interceptor 就就可以这样取出来：

通过 ExecutionContext 取到目标 handler，然后注入 reflector，通过 reflector.get 取出 handler 上的 metadata。

interceptor 里也是这样，这里换种属性注入方式：

刷新下页面，就可以看到已经拿到了 metadata：

拿到 metadata 有什么用呢？

可以判断权限呀，比如这个路由需要 admin 角色，那可以取出 request 的 user 对象，看看它有没有这个角色，有才放行。

当然这只是一种用途。

除了能拿到 handler 上的装饰器，也可以拿到 class 上的：

reflector 还有 3 个方法：

这 4 个方法有啥区别呢？

看下[它们的源码](https://github.com/nestjs/nest/blob/5bba7e9d264319490f142ca5e8099c559fa7e7e3/packages/core/services/reflector.service.ts#L11-L97)就知道了：

get 的实现就是 Reflect.getMetadata。

getAll 是返回一个 metadata 的数组。

getAllAndMerge，会把它们合并为一个对象或者数组。

getAllAndOverride 会返回第一个非空的 metadata。

试一下：

可以看到它们结果的区别：

## 总结

Nest 的装饰器的实现原理就是 Reflect.getMetadata、Reflect.defineMetadata 这些 api。通过在 class、method 上添加 metadata，然后扫描到它的时候取出 metadata 来做相应的处理来完成各种功能。

Nest 的 Controller、Module、Service 等等所有的装饰器都是通过 Reflect.metadata 给类或对象添加元数据的，然后初始化的时候取出来做依赖的扫描，实例化后放到 IOC 容器里。

实例化对象还需要构造器参数的类型，这个开启 ts 的 emitDecoratorMetadata 的编译选项之后， ts 就会自动添加一些元数据，也就是 design:type、design:paramtypes、design:returntype 这三个，分别代表被装饰的目标的类型、参数的类型、返回值的类型。

当然，reflect metadata 的 api 还在草案阶段，需要引入 reflect metadata 的包做 polyfill。

Nest 还提供了 @SetMetadata 的装饰器，可以在 controller 的 class 和 method 上添加 metadata，然后在 interceptor 和 guard 里通过 reflector 的 api 取出来。

理解了 metadata，nest 的实现原理就很容易搞懂了。

---


Nest 支持创建多种类型的服务：

包括 HTTP 服务、WebSocket 服务，还有基于 TCP 通信的微服务。

这三种服务都会支持 Guard、Interceptor、Exception Filter 功能。

那么问题来了：

不同类型的服务它能拿到的参数是不同的，比如 http 服务可以拿到 request、response 对象，而 websocket 服务就没有。

也就是说你不能在 Guard、Interceptor、Exception Filter 里直接操作 request、response，不然就没法复用了，因为 websocket 没有这些。

那如何让同一个 Guard、Interceptor、Exception Filter 在不同类型的服务里复用呢？

Nest 的解决方法是 ArgumentHost 这个类。

来看一下：

创建个项目：
```
nest new argument-host
```
然后创建一个 filter：
```
nest g filter aaa --flat --no-spec
```
Nest 会 catch 所有未捕获异常，如果是 Exception Filter 声明的异常，那就会调用 filter 来处理。

那 filter 怎么声明捕获什么异常的呢？

创建一个自定义的异常类：

```javascript
export class AaaException {
    constructor(public aaa: string, public bbb: string) {

    }
}
```

在 @Catch 装饰器里声明这个 filter 处理该异常：

然后需要启用它：

路由级别启用 AaaFilter，并且在 handler 里抛了一个 AaaException 类型的异常。

也可以全局启用：

```javascript
app.useGlobalFilters(new AaaFilter());
```

访问 <http://localhost:3000> 就可以看到 filter 被调用了。

filter 的第一个参数就是异常对象，那第二个参数呢？

可以看到，它有这些方法：

用调试的方式跑一下：

点击 create launch.json file 创建一个调试配置文件：

在 .vscode/launch.json 添加这样的调试配置：

```json
{
    "type": "pwa-node",
    "request": "launch",
    "name": "debug nest",
    "runtimeExecutable": "npm",
    "args": [
        "run",
        "start:dev",
    ],
    "skipFiles": [
        "<node_internals>/**"
    ],
    "console": "integratedTerminal",
}
```

点击调试启动：

打个断点：

浏览器访问 <http://localhost:3000> 就可以看到它断住了：

分别调用下这些方法试试：

在 debug console 输入 host，可以看到它有这些属性方法：

host.getArgs 方法就是取出当前上下文的 request、response、next 参数。

因为当前上下文是 http 服务，如果是 WebSocket 服务，这里拿到的就是别的东西了。

host.getArgByIndex 方法是根据下标取参数：

当然，一般不会根据 index 来取，而是这样用：

调用 switchToHttp 切换到 http 上下文，然后再调用 getRequest、getResponse 方法。

如果是 websocket、基于 tcp 的微服务等上下文，就分别调用 host.switchToWs、host.switchToRpc 方法。

这样，就可以在 filter 里处理多个上下文的逻辑，跨上下文复用 filter了。

加个 if else 判断即可：

```javascript
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { AaaException } from './AaaException';

@Catch(AaaException)
export class AaaFilter implements ExceptionFilter {
  catch(exception: AaaException, host: ArgumentsHost) {
    if(host.getType() === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();

      response
        .status(500)
        .json({
          aaa: exception.aaa,
          bbb: exception.bbb
        });
    } else if(host.getType() === 'ws') {

    } else if(host.getType() === 'rpc') {

    }
  }
}
```

刷新页面，就可以看到 filter 返回的响应：

所以说，**ArgumentHost 是用于切换 http、websocket、rpc 等上下文类型的，可以根据上下文类型取到对应的 argument，让 Exception Filter 等在不同的上下文中复用**。

那 guard 和 interceptor 里呢？

创建个 guard 试一下：
```
nest g guard aaa --no-spec --flat
```
可以看到它传入的是 ExecutionContext：

有这些方法：

是不是很眼熟？


多加这两个方法是干啥的呢？

调试下看看：

路由级别启用 Guard：

在 Guard 里打个断点：

调用下 context.getClass 和 getHandler：

会发现这俩分别是要调用的 controller 的 class 以及要调用的方法。

为什么 ExecutionContext 里需要拿到目标 class 和 handler 呢？

因为 Guard、Interceptor 的逻辑可能要根据目标 class、handler 有没有某些装饰而决定怎么处理。

比如权限验证的时候，会先定义几个角色：

然后定义这样一个装饰器：

它的作用是往修饰的目标上添加 roles 的 metadata。

然后在 handler 上添加这个装饰器，参数为 admin，也就是给这个 handler 添加了一个 roles 为 admin 的metadata。

这样在 Guard 里就可以根据这个 metadata 决定是否放行了：

```javascript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Role } from './role';

@Injectable()
export class AaaGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {

    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user && user.roles?.includes(role));
  }
}
```

在 Guard 里通过 ExecutionContext 的 getHandler 方法拿到了目标 handler 方法。

然后通过 reflector 的 api 拿到它的 metadata。

判断如果没有 roles 的 metadata 就是需要权限，那就直接放行。

如果有，就是需要权限，从 user 的 roles中判断下又没有当前 roles，有的话就放行。

刷新页面，可以看到返回的是 403：

这说明 Guard 生效了。

这就是 Guard 里的 ExecutionContext 参数的用法。

同样，在 interceptor 里也有这个：
```
nest g interceptor aaa --no-spec --flat
```
同样可以通过 reflector 取出 class 或者 handler 上的 metdadata。

## 总结

为了让 Filter、Guard、Interceptor 支持 http、ws、rpc 等场景下复用，Nest 设计了 ArgumentHost 和 ExecutionContext 类。

ArgumentHost 可以通过 getArgs 或者 getArgByIndex 拿到上下文参数，比如 request、response、next 等。

更推荐的方式是根据 getType 的结果分别 switchToHttp、switchToWs、switchToRpc，然后再取对应的 argument。

而 ExecutionContext 还提供 getClass、getHandler 方法，可以结合 reflector 来取出其中的 metadata。

在写 Filter、Guard、Exception Filter 的时候，是需要用到这些 api 的。

---


Nest 里也有中间件 Middleware 的概念，它和 Express 的 Middleware 是一个东西么？

很像，但不一样。

上节讲过，Nest 并不是直接依赖于 Express，可以切换到别的 http 请求处理库，那 Nest 的特性肯定也不直接是 Express 里的。

创建个项目，边写边看：

```
nest new middleware-test
```
进入项目，执行：
```
nest g middleware aaa --no-spec --flat
```
创建个 middleware：

因为这时候并不知道你用的 express 还是 fastify，所以 request、response 是 any，手动标注下类型就好了：

这里是 express 的 request、response。

加一下前后的的逻辑：

```javascript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class AaaMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    console.log('before');
    next();
    console.log('after');
  }
}
```

然后在 Module 里这样使用：

```javascript
import { AaaMiddleware } from './aaa.middleware';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule{

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AaaMiddleware).forRoutes('*');
  }
}

```

实现 NestModule 接口的 configure 方法，在里面应用 AaaMiddleware 到所有路由。

然后跑起来试一下：

    nest start --watch

浏览器访问 <http://localhost:3000>

可以看到中间件的逻辑都执行了：

这里也可以指定更精确的路由。

添加几个 handler：

然后重新指定 Middleware 应用的路由：

```javascript
import { AaaMiddleware } from './aaa.middleware';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule{

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AaaMiddleware).forRoutes({ path: 'hello*', method: RequestMethod.GET });
    consumer.apply(AaaMiddleware).forRoutes({ path: 'world2', method: RequestMethod.GET });
  }
}
```
可以看到，hello、hello2、world2 的路由都调用了这个中间件，而 world1 没有：

这就是 Nest 里 middleware 的用法。

如果只是这样，那和 Express 的 middleware 差别并不大，无非是变成了 class 的方式。

Nest 为什么要把 Middleware 做成 class 呢？

当然是为了依赖注入了！

通过 @Inject 注入 AppService 到 middleware 里：

```javascript
import { AppService } from './app.service';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class AaaMiddleware implements NestMiddleware {
  @Inject(AppService)
  private readonly appService: AppService;

  use(req: Request, res: Response, next: () => void) {
    console.log('before');
    console.log('-------' + this.appService.getHello());
    next();
    console.log('after');
  }
}
```

当然，这里也可以用构造器注入，这样更简洁一点：

这时在访问这个路由的时候，就可以看到中间件成功调用了 AppService：

这就是 Nest 注入的依赖。

如果不注入依赖，那写函数的方式也是可以的。

看这个 apply 方法的类型声明也可以看出来：

如果不需要注入依赖，那可以写函数形式的 middleware，这时候和 Express 的 middleware 就没啥区别了。

如果需要注入依赖，那就写 class 形式的 middleware，可以用 Nest 的依赖注入能力。

当然，应用实例对象也可以 use 中间件，这个就和 express 那个一样了：

不过这种形式不能注入依赖，而且也不能配置应用到什么路由，不建议用。

app.use 等同于在 AppModule 的 configure 方法里的 forRoutes('\*')

此外，middleware 里有个 next 参数，而 Nest 还有个 @Next 装饰器，这俩的区别是什么呢？

middleware 的 next 参数就是调用下一个 middleware 的，这个很好理解。

而 @Next 装饰器是调用下一个 handler 的：

但如果是这样一个 handler，它就不返回值了：

这个和加上 @Response 装饰器的时候的效果一样。

因为 Nest 认为你会自己返回响应或者调用下个 handler，就不会处理返回值了。

如果依然想让 Nest 把函数返回值作为响应，可以这样写：

这个上节讲过。

当然，传入 Next 参数的时候，一般是不需要在这里响应的，一般是调用下个 handler 来响应：

不过一般也不需要这样写，直接写在一个 handler 里就行。

有的同学可能会问：Nest 的 middleware 和 interceptor 都是在请求前后加入一些逻辑的，这俩区别是啥呢？

区别有两点：

interceptor 是能从 ExecutionContext 里拿到目标 class 和 handler，进而通过 reflector 拿到它的 metadata 等信息的，这些 middleware 就不可以。

再就是 interceptor 里是可以用 rxjs 的操作符来组织响应处理流程的：

middleware 里也不可以。

它们都是 Nest AOP 思想的实现，但是 interceptor 更适合处理与具体业务相关的逻辑，而 middleware 适合更通用的处理逻辑。

## 总结

Nest 也有 middleware，但是它不是 Express 的 middleware，虽然都有 request、response、next 参数，但是它可以从 Nest 的 IOC 容器注入依赖，还可以指定作用于哪些路由。

用法是 Module 实现 NestModule 的 configure 方法，调用 apply 和 forRoutes 指定什么中间件作用于什么路由。

app.use 也可以应用中间件，但更建议在 AppModule 里的 configure 方法里指定。

Nest 还有个 @Next 装饰器，这个是用于调用下个 handler 处理的，当用了这个装饰器之后，Nest 就不会把 handler 返回值作为响应了。

middleware 和 interceptor 功能类似，但也有不同，interceptor 可以拿到目标 class、handler 等，也可以调用 rxjs 的 operator 来处理响应，更适合处理具体的业务逻辑。

middleware 更适合处理通用的逻辑。

---


RxJS 是一个组织异步逻辑的库，它有很多 operator，可以极大的简化异步逻辑的编写。

它是由数据源产生数据，经过一系列 operator 的处理，最后传给接收者。

这个数据源叫做 observable。

比如这样：

```javascript
import { of, filter, map } from 'rxjs';

of(1, 2, 3)
.pipe(map((x) => x * x))
.pipe(filter((x) => x % 2 !== 0))
.subscribe((v) => console.log(`value: ${v}`));
```

用 node 跑一下，结果如下：

这里 node 能直接解析 esm 需要在 package.json 里设置 type 为 module：

这就是 map、filter 的 operator 的作用。

还是很容易理解的。


那这种呢：

```javascript
import { of, scan, map } from 'rxjs';

const numbers$ = of(1, 2, 3);

numbers$
  .pipe(
    scan((total, n) => total + n),
    map((sum, index) => sum / (index + 1))
  )
  .subscribe(console.log);
```

scan 是计数，map 是转换，结果如下：

或者是节流、防抖：

```javascript
import { fromEvent, throttleTime } from 'rxjs';

const clicks = fromEvent(document, 'click');
const result = clicks.pipe(throttleTime(1000));

result.subscribe(x => console.log(x));
```

```javascript
import { fromEvent, debounceTime } from 'rxjs';

const clicks = fromEvent(document, 'click');
const result = clicks.pipe(debounceTime(1000));
result.subscribe(x => console.log(x));
```


但是架不住 RxJS 的 operator 多呀，组合起来可以实现非常复杂的异步逻辑处理。

可以在官网文档看到[所有的 operator](https://rxjs.dev/guide/operators#creation-operators-1)。

所以说，如果异步逻辑复杂度高了，那上 RxJS 收益还是很高的，异步逻辑的编写就变成了 operator 的组合，少写很多代码。

感受到为啥要用 RxJS 了么？

也是因为这个原因，Nest 的 interceptor 集成了 RxJS，可以用它来处理响应。

当然，也有人觉得这里没必要用 RxJS。

但既然 Nest 支持了，就用用看，基于那一堆 operator 确实是能简化异步逻辑的。

创建一个测试项目：

    nest new interceptor-test -p npm

进入目录执行 nest g interceptor：

    nest g interceptor aaa --flat --no-spec

可以这样实现接口耗时统计：

```javascript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class AaaInterceptor implements NestInterceptor {

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    return next
      .handle()
      .pipe(
        tap(() => console.log(`After... ${Date.now() - now}ms`)),
      );
  }
}
```

tap operator 不会改变数据，只是额外执行一段逻辑。

在 handler 上启用 interceptor：

然后浏览器访问 <http://localhost:3000>

就会看到打印的耗时数据：

或者全局启用这个 interceptor：

路由级别和全局级别的 interceptor 还是有区别的，路由级别的可以注入依赖，而全局的不行：

再来使用下别的 RxJS operator：

其实适合在 Nest 的 interceptor 里用的 operator 还真不多，也就这么几个：

## map

再生成一个 interceptor：

    nest g interceptor map-test --flat --no-spec

使用 map operator 来对 controller 返回的数据做一些修改：

```javascript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class MapTestInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(data => {
      return {
        code: 200,
        message: 'success',
        data
      }
    }))
  }
}
```

在 controller 里引入下：

跑下试试：

现在返回的数据就变成了这样。

map 算是在 nest interceptor 里必用的 rxjs operator 了

## tap

再生成个 interceptor

    nest g interceptor tap-test --flat --no-spec

使用 tap operator 来添加一些日志、缓存等逻辑：

```javascript
import { AppService } from './app.service';
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class TapTestInterceptor implements NestInterceptor {
  constructor(private appService: AppService) {}

  private readonly logger = new Logger(TapTestInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(tap((data) => {

      // 这里是更新缓存的操作，这里模拟下
      this.appService.getHello();

      this.logger.log(`log something`, data);
    }))
  }
}
```

因为还没讲到缓存那块，这里就调用 service 方法模拟了下。

日志记录用的 nest 内置的 Logger，在 controller 返回响应的时候记录一些东西。

浏览器访问这个接口，会打印日志：

这里用的是 Nest 内置的 Logger，所以打印格式是这样的。

## catchError

controller 里很可能会抛出错误，这些错误会被 exception filter 处理，返回不同的响应，但在那之前，可以在 interceptor 里先处理下。

生成 interceptor：

    nest g interceptor catch-error-test --flat --no-spec

使用 catchError 处理抛出的异常：

```javascript
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable()
export class CatchErrorTestInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CatchErrorTestInterceptor.name)

  intercept (context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(catchError(err => {
      this.logger.error(err.message, err.stack)
      return throwError(() => err)
    }))
  }
}
```

这里就是日志记录了一下，当然你也可以改成另一种错误，重新 throwError。

在 controller 里用一下：

浏览器访问下，可以看到返回 500 的错误：

打印了两次错误：

一次是在 interceptor 里打印的，一次是 exception filter 打印的。

其实能看到这个 500 错误，就是内置的 exception filter 处理的：

对应的 Nest 源码如下：

## timeout

接口如果长时间没返回，要给用户一个接口超时的响应，这时候就可以用 timeout operator。

再创建个 nest interceptor

    nest g interceptor timeout --flat --no-spec

添加如下逻辑：

```javascript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor, RequestTimeoutException } from '@nestjs/common';
import { catchError, Observable, throwError, timeout, TimeoutError } from 'rxjs';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(3000),
      catchError(err => {
        if(err instanceof TimeoutError) {
          console.log(err);
          return throwError(() => new RequestTimeoutException());
        }
        return throwError(() => err);
      })
    )
  }
}
```

timeout 操作符会在 3s 没收到消息的时候抛一个 TimeoutError。

然后用 catchError 操作符处理下，如果是 TimeoutError，就返回 RequestTimeoutException，这个有内置的 exception filter 会处理成对应的响应格式。

其余错误就直接 throwError 抛出去。

在 controller 里用一下：

浏览器访问，3s 后返回 408 响应：

就是在这里处理的：

不信可以抛一个其他的 exception 试一下：

最后，再来看下全局的 interceptor：

因为这种是手动 new 的，没法注入依赖。

但很多情况下是需要全局 interceptor 的，而且还用到一些 provider，怎么办呢？

nest 提供了一个 token，用这个 token 在 AppModule 里声明的 interceptor，Nest 会把它作为全局 interceptor：

在这个 interceptor 里注入了 appService：

添加一个路由：

访问下：

可以看到全局 interceptor 生效了，而且这个 hello world 就是注入的 appService 返回的：

## 总结

rxjs 是一个处理异步逻辑的库，它的特点就是 operator 多，你可以通过组合 operator 来完成逻辑，不需要自己写。

nest 的 interceptor 就用了 rxjs 来处理响应，但常用的 operator 也就这么几个：

*   tap: 不修改响应数据，执行一些额外逻辑，比如记录日志、更新缓存等
*   map：对响应数据做修改，一般都是改成 {code, data, message} 的格式
*   catchError：在 exception filter 之前处理抛出的异常，可以记录或者抛出别的异常
*   timeout：处理响应超时的情况，抛出一个 TimeoutError，配合 catchError 可以返回超时的响应

总之，rxjs 的 operator 多，但是适合在 nest interceptor 里用的也不多。

此外，interceptor 也是可以注入依赖的，你可以通过注入模块内的各种 provider。

全局 interceptor 可以通过 APP\_INTERCEPTOR 的 token 声明，这种能注入依赖，比 app.useGlobalInterceptors 更好。

interceptor 是 nest 必用功能，还是要好好掌握的。
