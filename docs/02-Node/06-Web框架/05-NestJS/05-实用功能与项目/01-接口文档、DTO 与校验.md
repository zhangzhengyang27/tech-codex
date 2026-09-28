---
title: 接口文档、DTO 与校验
description: "Nest 接口文档与参数校验：@nestjs/swagger 自动生成 OpenAPI 文档（@ApiProperty、@ApiOperation 等装饰器）、compodoc 可视化项目依赖、@nestjs/mapped-types 的 PartialType/PickType 等复用 DTO、class-validator 校验装饰器，以及用 entity + ClassSerializerInterceptor 替代 VO。"
keywords: [NestJS, Swagger, OpenAPI, DTO, VO, class-validator, class-transformer, compodoc]
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---

# 接口文档、DTO 与校验


---


后端开发完接口后，需要给前端一份接口文档，描述有哪些接口，是 GET 还是 POST，有哪些参数，响应是什么。

但是写完代码后再去单独写一份这样的文档还是很麻烦的，并且改动接口之后也要同步去修改接口文档。

能不能自动生成 API 接口文档呢？

是可以的，就是这节要讲的 swagger。

新建个项目：
```
nest new swagger-test -p npm
```
安装 swagger 的包：

```
npm install --save @nestjs/swagger
```

然后在 main.ts 添加这样一段代码：

```javascript
const config = new DocumentBuilder()
    .setTitle('Test example')
    .setDescription('The API description')
    .setVersion('1.0')
    .addTag('test')
    .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('doc', app, document);
```
通过 DocumentBuilder 创建 config。

然后用 SwaggerModule.createDocument 根据 config 创建文档。

之后用 SwaggerModule.setup 指定在哪个路径可以访问文档。

跑起来试试：

```
npm run start:dev
```
访问 http://localhost:3000/doc 就可以看到 swagger 的 api 文档了：

和 DocumentBuilder 填的配置的对应关系如下：

现在只有一个接口，调用会返回 hello world：

点击 try it out，再点击 execute，就可以看到返回的响应体和 header：

在 AppController 加几个接口试试：

```javascript
@Get('aaa')
aaa(@Query('a1') a1, @Query('a2') a2) {
    console.log(a1, a2);
    return 'aaa success';
}

@Get('bbb/:id')
bbb(@Param('id') id) {
    console.log(id);
    return 'bbb success';
}

@Post('ccc')
ccc(@Body('ccc') ccc) {
    console.log(ccc);
    return 'ccc success';
}
```

加了一个有 query 参数、一个有 param 参数、一个有 body 参数的接口。

刷新下可以看到，这几个接口都列出来了：

但是都没有 param 的描述和 response 的描述：

这时就需要手动标注了：

```javascript
@ApiOperation({ summary: '测试 aaa',description: 'aaa 描述' })
@ApiResponse({
    status: HttpStatus.OK,
    description: 'aaa 成功',
    type: String
})
@Get('aaa')
aaa(@Query('a1') a1, @Query('a2') a2) {
    console.log(a1, a2);
    return 'aaa success';
}
```
给 aaa 接口添加 @ApiOperation 和 @ApiResponse 的装饰器。

这俩分别是指定这个接口的描述，接口的响应的。

再加上 @ApiQuery 来添加 query 参数的说明：

```javascript
@ApiQuery({
    name: 'a1',
    type: String,
    description: 'a1 param',
    required: false,
    example: '1111',
})
@ApiQuery({
    name: 'a2',
    type: Number,
    description: 'a2 param',
    required: true,
    example: 2222,
})
```
刷新下，可以看到 swagger 文档里出现了这两个参数的说明：

点击 try it out 和 execute，就可以看到发送了请求并返回了响应：

这样，一个接口就描述完了：

通过 @ApiOperation 描述接口的信息，@ApiResponse 描述返回值信息，@ApiQuery 描述 query 参数信息。

就能生成对应的 swagger 文档：

接着来生成 bbb 接口的 swagger 文档：

这里用到的是 @ApiParam 而不是 @ApiQuery，其余部分一样：
```javascript
@ApiOperation({ summary: '测试 bbb',description: 'bbb 描述' })
@ApiResponse({
    status: HttpStatus.OK,
    description: 'bbb 成功',
    type: String
})
@ApiParam({
    name: 'id',
    description: 'ID',
    required: true,
    example: 222,
})
```
刷新可以看到 bbb 接口的文档：

那如果 id 不合法的时候，我返回了一个 401 的响应呢？

那就再加一个 @ApiResponse

```javascript
@ApiOperation({ summary: '测试 bbb',description: 'bbb 描述' })
@ApiResponse({
    status: HttpStatus.OK,
    description: 'bbb 成功',
    type: String
})
@ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'id 不合法'
})
@ApiParam({
    name: 'id',
    description: 'ID',
    required: true,
    example: 222,
})
@Get('bbb/:id')
bbb(@Param('id') id: number) {
    console.log(id);
    if(id !== 111) {
      throw new UnauthorizedException();
    }
    return 'bbb success';
}
```
刷新下，可以看到 swagger 文档标识出了这两种响应：

然后再来写 ccc 接口的文档：

ccc 接收的是请求体的参数，创建个 CccDto。

```javascript
export class CccDto {
    aaa: string;
    bbb: number;
    ccc: Array<string>;
}
```
接收参数通过 dto 来接收，而返回值放在 vo 里：

```javascript
@Post('ccc')
ccc(@Body('ccc') ccc: CccDto) {
    console.log(ccc);
    return {
      aaa: 111,
      bbb: 222
    };
}
```
创建个 vo 的 class：

```javascript
export class CccVo {
    aaa: number;
    bbb: number;
}
```
返回值就可以改成这样了：

```javascript
@Post('ccc')
ccc(@Body('ccc') ccc: CccDto) {
    console.log(ccc);

    const vo = new CccVo();
    vo.aaa = 111;
    vo.bbb = 222;
    return vo;
}
```

这里的 dto、vo 随便搜一下就能查到解释：

在 Nest 里要能清楚的区分 dto、vo、entity 的区别：

dto 是 data transfer object，用于参数的接收。

vo 是 view object，用于返回给视图的数据的封装。

而 entity 是和数据库表对应的实体类。

然后继续来写 ccc 接口的 swagger 文档。

很容易想到，body 的描述是通过 @ApiBody 的装饰器：

```javascript
@ApiOperation({summary:'测试 ccc'})
@ApiResponse({
    status: HttpStatus.OK,
    description: 'ccc 成功',
    type: CccVo
})
@ApiBody({
    type: CccDto
})
@Post('ccc')
ccc(@Body('ccc') ccc: CccDto) {
    console.log(ccc);

    const vo = new CccVo();
    vo.aaa = 111;
    vo.bbb = 222;
    return vo;
}
```

刷新页面，你会看到除了接口外，还生成了俩 schema。

也就是说对象的响应会对应 swagger 的 schema。

只不过现在 CccDto、CccVo 的 schema 没有内容，这是因为还没有标注。

在 CccDto 加一下：

aaa、bbb、ccc 通过 @ApiProperty 标识下，并且 bbb 是 @ApiPropertyOptional，也就是可选，这个和 @ApiProperty({ required: false }) 等价。

aaa 可以传 enum 的值，取值范围是 a1、a2、a3。

同样，CccVo 也加一下：

```javascript
import { ApiProperty } from "@nestjs/swagger";

export class CccVo {
    @ApiProperty({ name: 'aaa' })
    aaa: number;

    @ApiProperty({ name: 'bbb' })
    bbb: number;
}
```
刷新下，现在就可以看到 CccDto、CccVo 的 schema 有属性了：

其中 bbb 是没有 * 的，代表可不传。

上面的接口部分也有了请求和响应的示例：

点下 try it out，可以自己编辑请求体：

然后点击 execute 就可以看到响应的内容和 header：

服务端也确实接收到了这个请求：

可以用 swagger 来方便的测试接口。

此外，还可以通过 @ApiTags 来给接口分组：

比如 controller 是 xxx 开头的，那可以用 @ApiTags 来分组到 xxx。

显示的时候，就会把这个 controller 的接口分到一个组下：

也可以添加在 handler 上：

比如把 aaa、bbb 接口分到 xxx-get 的组。

那显示的时候就会把这俩接口分出来：

当接口多了之后，分组还是很有必要的。

回过头来，再讲下 @ApiProperty，其实它还有很多属性：

```javascript
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CccDto {
    @ApiProperty({ name: 'aaa', enum: ['a1', 'a2', 'a3'], maxLength: 30, minLength: 2, required: true})
    aaa: string;

    @ApiPropertyOptional({ name: 'bbb', maximum: 60, minimum: 40, default: 50, example: 55})
    bbb: number;

    @ApiProperty({ name: 'ccc' })
    ccc: Array<string>;
}
```

比如 required、minimum、maximum、default、maxLength 等。

此外，很多接口是需要登录才能访问的，那如何限制呢？

swagger 也提供了这方面的支持。

常用的认证方式就是 jwt、cookie。

分别在 aaa、bbb、ccc 接口添加 @ApiBearerAuth、@ApiCookieAuth、@ApiBasicAuth

然后在 main.ts 里添 3 种认证方式的信息：

```javascript
const config = new DocumentBuilder()
    .setTitle('Test example')
    .setDescription('The API description')
    .setVersion('1.0')
    .addTag('test')
    .addBasicAuth({
      type: 'http',
      name: 'basic',
      description: '用户名 + 密码'
    })
    .addCookieAuth('sid', {
      type: 'apiKey',
      name: 'cookie',
      description: '基于 cookie 的认证'
    })
    .addBearerAuth({
      type: 'http',
      description: '基于 jwt 的认证',
      name: 'bearer'
    })
    .build();
```
刷新页面就可以看到接口出现了锁的标记：

点击 aaa 的锁：

输入 jwt 的 token，然后点击 authorize。

锁会变成锁住状态，代表授权成功了。

这时候再发一个请求：

会发现带上了 Authorization 的 header，这就是见过的 jwt 认证方式。

同理，下面的 cookie 会带上对应的 cookie来认证：

而 basic 的方式，会要求你输入用户名密码：

请求时会带上 Authorization： Basic xxx 的 header 来访问。

这样，这些需要授权的接口就分别添加上了不同的认证方式的标识。

其实，swagger 是一种叫做 openapi 标准的实现。

在 /doc 后加上个 -json 就可以看到对应的 json

装个格式化 chrome 插件格式化一下，大概是这样的：

如果你觉得 swagger 文档比较丑，可以这个 json 导入别的平台。

一般 api 接口的平台都是支持 openapi 的。

## 总结

这节学习了 swagger 自动生成文档。

需要先安装 @nestjs/swagger 的包。

然后在 main.ts 里用 DocumentBuilder + SwaggerModule.createDocument 创建 swagger 文档配置，然后 setup 跑起来就好了。

还需要手动加一些装饰器来标注：

- ApiOperation：声明接口信息
- ApiResponse：声明响应信息，一个接口可以多种响应
- ApiQuery：声明 query 参数信息
- ApiParam：声明 param 参数信息
- ApiBody：声明 body 参数信息，可以省略
- ApiProperty：声明 dto、vo 的属性信息
- ApiPropertyOptional：声明 dto、vo 的属性信息，相当于 required: false 的 ApiProperty
- ApiTags：对接口进行分组
- ApiBearerAuth：通过 jwt 的方式认证，也就是 Authorization: Bearer xxx
- ApiCookieAuth：通过 cookie 的方式认证
- ApiBasicAuth：通过用户名、密码认证，在 header 添加 Authorization: Basic xxx

swagger 是 openapi 标准的实现，可以在 url 后加个 -json 拿到对应的 json，然后导入别的接口文档平台来用。

绝大多数公司的接口文档都是用 swagger 来自动生成的，不然手动维护太麻烦了。

而且 swagger 还可以方便的测试接口，自动添加身份认证等。

你们公司用的是 swagger 生成的接口文档么？

---


Nest 项目会有很多模块，模块之间相互依赖，模块内有 controller、service 等。

当项目复杂之后，模块之间的关系错综复杂。

这时候可以用 compodoc 生成一份文档，把依赖关系可视化。

compodoc 本来是给 angular 项目生成项目文档的，但是因为 angular 和 nest 项目结构类似，所以也支持了 nest。

创建个项目：

```
nest new compodoc-test
```

安装 compodoc：

```
npm install --save-dev @compodoc/compodoc
```
然后生成一份文档：

```
npx @compodoc/compodoc -p tsconfig.json -s -o
```

这个 README 就是项目下的 README.md:

改一下 README.md，然后重新执行命令生成：

可以看到页面上的也变了：

overview 部分上面是依赖图，下面是项目有几个模块、controller，可注入的 provider

在项目下加几个模块：

```
nest g resource aaa

nest g resource bbb
```

在 AaaModule 里把 AaaService 导出：

然后 BbbModule 引入 AaaModule：

在 BbbService 里注入 AaaService：

先跑起来看一下：

```
npm run start:dev
```

没啥问题：

类似这种依赖关系，compodoc 可视化之后是什么样的呢？

重新跑一下 compodoc：
```
npx @compodoc/compodoc -p tsconfig.json -s -o
```
依赖可视化是这样的：

用不同的颜色表示 Module、Provider、Exports 等。

可以看到 AppModule 引入了 AaaModule、BbbModule。

AaaModule 导出了 AaaService。

以及每个模块的 provider。

都可以可视化的看到。

点击左侧的 Modules，可以看到每个模块的可视化分析：

AaaModule：

BbbModule：
AppModule：

当然，这个例子还是比较简单，当项目依赖复杂之后，这个可视化还是比较有用的。

此外，可以看到每个 Controller、Service 或者其他的 class 的属性、方法，点进去可以看到方法的参数、返回值等：


当新人接手这个项目的时候，可以通过这份文档快速了解项目的结构。

回过头来，看下 compodoc 的一些 cli 选项：

```
npx @compodoc/compodoc -p tsconfig.json -s -o
```

-p 是指定 tsconfig 文件

-s 是启动静态服务器

-o 是打开浏览器

更多选项在 [compodoc 文档](https://compodoc.app/guides/options.html)里可以看到:


比如 --theme 可以指定主题，一共有 gitbook, laravel, original, material, postmark, readthedocs, stripe, vagrant 这 8 个主题：

跑一下：
```
npx @compodoc/compodoc -p tsconfig.json -s -o --theme postmark
```

可以看到文档主题换了：

选项还是挺多的，如果都写在命令行也不现实，compodoc 同样支持配置文件。

在项目下添加一个 .compodoc.json 的文件：

```json
{
    "port": 8888,
    "theme": "postmark"
}
```

然后再跑下 compodoc：

```
npx @compodoc/compodoc -p tsconfig.json -s -o -c .compodoc.json
```

可以看到，配置生效了：

文档里写的这些 cli options，基本都可以写在配置文件里。

不过一般也不咋用配置。

案例代码上传了。

## 总结

学习了用 compodoc 生成 nest 项目的文档，它会列出项目的模块，可视化展示模块之间的依赖关系，展示每个模块下的 provider、exports 等。

对于新人接手项目来说，还是比较有用的。

而且可视化分析依赖和模块结构，对于复杂项目来说，是比较有帮助的。

compodoc 算是一个不错的 nest 相关的工具。

---


dto 是 data transfer object，用于封装请求参数，后端应用常见对象。

当开发 CRUD 接口的时候，你会发现 create 的 dto 对象和 update 的 dto 对象很类似。

那能不能不从头创建，而是基于已有的对象来创建呢？

可以的。

来试一下：

```
nest new dto-vo-test
```

创建个 nest 项目。

进入项目，创建 aaa 的 crud 模块：

```
nest g resource aaa
```

可以看到，它自动创建了 CreateAaaDto、UpdateAaaDto 用来封装 create、update 的参数：

改下 aaa.entity.ts

```javascript
export class Aaa {

    id: number;

    name: string;

    age: number;

    sex: boolean;

    email: string;

    hobbies: string[]
}
```

Entity 有 id、name、age、sex、email、hobbies 这些字段。

那 CreateAaaDto 里要有 name、age、sex、email、hobbies 这些字段

而 UpdateAaaDto 里也是 name、age、sex、email、hobbies 这些字段。

```javascript
export class CreateAaaDto {
    name: string;

    age: number;

    sex: boolean;

    email: string;

    hobbies: string[]
}
```

```javascript
export class UpdateAaaDto  {

    name: string;

    age: number;

    sex: boolean;

    email: string;

    hobbies: string[]
}
```

而且还要用 ValidationPipe 加上参数校验。

安装用到的包：

```
npm install --save class-validator class-transformer
```
然后在 CreateAaaDto 和 UpdateAaaDto 加一下验证：

```javascript
import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, Length, MaxLength, MinLength } from "class-validator";

export class CreateAaaDto {
    @IsNotEmpty()
    @MinLength(4)
    @MaxLength(20)
    name: string;

    @IsNotEmpty()
    @IsNumber()
    age: number;

    @IsNotEmpty()
    @IsBoolean()
    sex: boolean;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    hobbies: string[]
}
```

```javascript
import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, Length, MaxLength, MinLength } from "class-validator";

export class UpdateAaaDto {
    @IsNotEmpty()
    @MinLength(4)
    @MaxLength(20)
    name: string;

    @IsNotEmpty()
    @IsNumber()
    age: number;

    @IsNotEmpty()
    @IsBoolean()
    sex: boolean;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    hobbies: string[]
}
```
然后全局启用 ValidationPipe：

```javascript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    transform: true
  }))

  await app.listen(3000);
}
bootstrap();
```
transform 指定为 true，这样会自动把参数的 js 对象转换为 dto 类型对象。

打印下 dto 对象：

测试下：

```
npm run start:dev
```

create 接口，当参数没通过校验时：

参数通过校验后：

可以看到，打印的是 CreateAaaDto 的对象，说明 ValidationPipe 的 transform 生效了：

再试下 update 接口：

也没问题。

虽然没问题，但是现在 CreateAaaDto 和 UpdateAaaDto 明显重复太多了。

很多字段重复写了两次。

有什么办法能避免这种重复呢？

很简单呀，继承不就行了？

```javascript
import { CreateAaaDto } from "./create-aaa.dto";

export class UpdateAaaDto extends CreateAaaDto {
}
```
试一下：

没啥问题。

当然，现在所有字段都是必填的，比如 name、age、email 等。

其实更新的时候可以只更新 name 或者 email。

这时候直接继承就不行了。

可以用 PartialType 处理下：

```javascript
import { PartialType } from '@nestjs/mapped-types';
import { CreateAaaDto } from "./create-aaa.dto";

export class UpdateAaaDto extends PartialType(CreateAaaDto) {

}
```
试下：

现在只填部分字段依然校验通过了。

好神奇，不是指定了 @IsNotEmpty 了么？

咋继承过来就没了呢？

这是因为 PartialType 内部做了处理。

简单看下源码：

它创建了一个新的 class 返回，继承了传入的 class 的属性，和 validation metadata。

但是添加一个 @IsOptional 的装饰器。

这样可不就变为可选的了么？

类似的这样的方法还有几个：

比如 PickType：

```javascript
import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateAaaDto } from "./create-aaa.dto";

export class UpdateAaaDto extends PickType(CreateAaaDto, ['age', 'email']) {

}

```
现在可以只传 age、email 这两个字段：

但它和 PartialType 不同，Pick 出来的字段并不会变为可选：

或者也可以用 OmitType，从之前的 dto 删除几个字段：

```javascript
import { OmitType, PartialType, PickType } from '@nestjs/mapped-types';
import { CreateAaaDto } from "./create-aaa.dto";

export class UpdateAaaDto extends OmitType(CreateAaaDto, ['name', 'hobbies', 'sex']) {

}
```

效果一样。

PickType 是从中挑选几个，OmitType 是从中去掉几个取剩下的。

此外，如果你有两个 dto 想合并，可以用 IntersectionType。

创建个 xxx.dto.ts

```javascript
import { IsNotEmpty, IsNumber, MinLength } from "class-validator";

export class XxxDto {
    @IsNotEmpty()
    @MinLength(4)
    xxx: string;

    @IsNotEmpty()
    @IsNumber()
    yyy: number;
}

```
用 CreateAaaDto 和 XxxDto 来创建 UpdateAaaDto：

```javascript
import { IntersectionType } from '@nestjs/mapped-types';
import { CreateAaaDto } from "./create-aaa.dto";
import { XxxDto } from './xxx.dto';

export class UpdateAaaDto extends IntersectionType(CreateAaaDto, XxxDto) {

}
```

可以看到，现在会提示你这些字段都是必填的：

这些字段都填上之后，校验就通过了：
服务端接收到了 dto 的数据。

当然，PartialType、PickType、OmitType、IntersectionType 经常会组合用：

```javascript
import { IntersectionType, OmitType, PartialType, PickType } from '@nestjs/mapped-types';
import { CreateAaaDto } from "./create-aaa.dto";
import { XxxDto } from './xxx.dto';

export class UpdateAaaDto extends IntersectionType(
    PickType(CreateAaaDto, ['name', 'age']),
    PartialType(OmitType(XxxDto, ['yyy']))
) {

}
```
从 CreateAaaDto 里拿出 name 和 age 属性，从 XxxDto 里去掉 yyy 属性变为可选，然后两者合并。

试一下效果：

name 必填、xxx 不是必填。

这样创建 dto 对象可太灵活了，随意组合已有的 dto 就行。

## 总结

开发 CRUD 接口的时候，经常会发现 update 的 dto 和 create 的 dto 很类似，而要重复的写两次。

这时候可以用 @nestjs/mapped-types 的 PartialType、PickType、OmitType、IntersectionType 来避免重复。

PickType 是从已有 dto 类型中取某个字段。

OmitType 是从已有 dto 类型中去掉某个字段。

PartialType 是把 dto 类型变为可选。

IntersectionType 是组合多个 dto 类型。

灵活运用这些方法，可以轻松的基于已有 dto 创建出新的 dto。

---


会用 class-validator 的装饰器对 dto 对象做校验。

那 class-validator 都有哪些装饰器可用呢？

这节来过一遍。

```
nest new class-validator-decorators
```

创建个 CRUD 模块：

```
nest g resource aaa --no-spec
```

全局启用 ValidationPipe，对 dto 做校验：

```javascript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3000);
}
bootstrap();
```

安装用到的 class-validator 和 class-transformer 包：

```
npm install --save class-validator class-transformer
```
然后在 create-aaa.dto.ts 加一下校验：

```javascript
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CreateAaaDto {

    @IsNotEmpty({message: 'aaa 不能为空'})
    @IsString({message: 'aaa 必须是字符串'})
    @IsEmail({}, {message: 'aaa 必须是邮箱'})
    aaa: string;

}
```
把服务跑起来：

```
npm run start:dev
```

postman 里访问下：

这就是 class-validator 的装饰器的用法。

类似这种装饰器有很多。

和 @IsNotEmpty 相反的是 @IsOptional：

加上之后就是可选的了：

上节学的 PartialType 就是用的 IsOptional 装饰器实现的。

@IsIn 可以限制属性只能是某些值：

```javascript
@IsNotEmpty({message: 'aaa 不能为空'})
@IsString({message: 'aaa 必须是字符串'})
@IsEmail({}, {message: 'aaa 必须是邮箱'})
@IsIn(['aaa@aa.com', 'bbb@bb.com'])
aaa: string;
```

还有 @IsNotIn，可以限制属性不能是某些值：

```javascript
@IsNotEmpty({message: 'aaa 不能为空'})
@IsString({message: 'aaa 必须是字符串'})
@IsEmail({}, {message: 'aaa 必须是邮箱'})
@IsNotIn(['aaa@aa.com', 'bbb@bb.com'])
aaa: string;
```
@IsBoolean、@IsInt、@IsNumber、@IsDate 这种就不说了。

@IsArray 可以限制属性是 array：

```javascript
@IsArray()
bbb:string;
```
@ArrayContains 指定数组里必须包含的值：

```javascript
@IsArray()
@ArrayContains(['aaa'])
bbb:string;
```
类似的还有 @ArrayNotContains 就是必须不包含的值。

@ArrayMinSize 和 @ArrayMaxSize 限制数组的长度。

@ArrayUnique 限制数组元素必须唯一：

```javascript
@IsArray()
@ArrayNotContains(['aaa'])
@ArrayMinSize(2)
@ArrayMaxSize(5)
@ArrayUnique()
bbb:string;
```

前面讲过 @IsNotEmpty，和它类似的还有 @IsDefined。

@IsNotEmpty 检查值是不是 ''、undefined、null。

@IsDefined 检查值是不是 undefined、null。

当你允许传空字符串的时候就可以用 @IsDefined。

```javascript
@IsDefined()
ccc: string;
```

如果是 @IsNotEmpty，那空字符串也是不行的：

```javascript
// @IsDefined()
@IsNotEmpty()
ccc: string;
```
数字可以做更精准的校验：

```javascript
@IsPositive()
@Min(1)
@Max(10)
@IsDivisibleBy(2)
ddd:number;
```
@IsPositive 是必须是正数、@IsNegative 是必须是负数。

@Min、@Max 是限制范围。

@IsDivisibleBy 是必须被某个数整除。

@IsDateString 是 ISO 标准的日期字符串：

```javascript
@IsDateString()
eee: string;
```
也就是这种：

还有几个字符串相关的：

@IsAlpha 检查是否只有字母

@IsAlphanumeric 检查是否只有字母和数字

@Contains 是否包含某个值

```javascript
@IsAlphanumeric()
@Contains('aaa')
fff: string;
```

字符串可以通过 @MinLength、@MaxLength、@Length 来限制长度：

```javascript
@MinLength(2)
@MaxLength(6)
ggg: string;
```
也可以用 @Length：

```javascript
@Length(2, 6)
ggg: string;
```
还可以校验颜色值的格式：@IsHexColor、@IsHSL、@IsRgbColor

校验 IP 的格式：@IsIP

校验端口： @IsPort

校验 JSON 格式 @IsJSON

常用的差不多就这些，更多的可以看 [class-validator 的文档](https://www.npmjs.com/package/class-validator#validation-decorators)。

此外，如果某个属性是否校验要根据别的属性的值呢？

这样：

```javascript
@IsBoolean()
hhh: boolean;

@ValidateIf(o => o.hhh === true)
@IsNotEmpty()
@IsHexColor()
iii: string;
```
如果 hhh 传了 true，那就需要对 iii 做校验，否则不需要。

此外，如果这些内置的校验规则都不满足需求呢？

那就自己写！

创建 my-validator.ts

```javascript
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

@ValidatorConstraint()
export class MyValidator implements ValidatorConstraintInterface {
    validate(text: string, validationArguments: ValidationArguments) {
        console.log(text, validationArguments)
        return true;
    }
}
```
用 @ValidatorConstraint 声明 class 为校验规则，然后实现 ValidatorConstraintInterface 接口。

用一下：
```javascript
@Validate(MyValidator, [11, 22], {
    message: 'jjj 校验失败',
})
jjj: string;
```

访问下：

第一个参数传入的字段值，第二个参数包含更多信息，比如 @Validate 指定的参数在 constraints 数组里。

这样，只要用这些做下校验然后返回 true、false 就好了。

比如这样：

```javascript
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

@ValidatorConstraint()
export class MyValidator implements ValidatorConstraintInterface {
    validate(text: string, validationArguments: ValidationArguments) {
        // console.log(text, validationArguments)
        return text.includes(validationArguments.constraints[0]);
    }
}
```

内容包含 11 的时候才会校验通过。

那如果这个校验是异步的呢？

返回 promise 就行：

```javascript
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

@ValidatorConstraint()
export class MyValidator implements ValidatorConstraintInterface {
    async validate(text: string, validationArguments: ValidationArguments) {
        // console.log(text, validationArguments)
        return new Promise<boolean>((resolve) => {
            setTimeout(() => {
                resolve(text.includes(validationArguments.constraints[0]));
            }, 3000);
        })
    }
}
```

这样用起来还是不如内置装饰器简单：

可以用前面学的创建自定义装饰器的方式来包装一下：

创建 my-contains.decorator.ts

```javascript
import { applyDecorators } from '@nestjs/common';
import { Validate, ValidationOptions } from 'class-validator';
import { MyValidator } from './my-validator';

export function MyContains(content: string, options?: ValidationOptions) {
  return applyDecorators(
     Validate(MyValidator, [content], options)
  )
}
```
用 applyDecorators 组合装饰器生成新的装饰器。

然后用起来就可以这样：

```javascript
@MyContains('111', {
    message: 'jjj 必须包含 111'
})
jjj: string;
```

封装出了 @Contains，其实内置的那些装饰器都可以自己封装出来。

## 总结

过了一遍 class-validator 的常用装饰器。

它们可以对各种类型的数据做精确的校验。

然后 @ValidateIf 可以根据别的字段来决定是否校验当前字段。

如果内置的装饰器不符合需求，完全可以自己实现，然后用 @Validate 来应用，用自定义装饰器 applyDecorators 包一层之后，和 class-validator 的内置装饰器就一模一样了。

所有的 class-validator 内置装饰器完全可以自己实现一遍。

---


后端系统常见的对象有三种：

Entity：数据实体，和数据库表对应。

DTO： Data Transfer Object，用于封装请求参数。

VO：View Object，用于封装返回的响应数据。

三者的关系如下：

但文档中并没有提到 VO 对象，这是为什么呢？

因为有替代方案。

来看一下：

```
nest new vo-test
```

生成一个 user 的 CRUD 模块：

```
nest g resource user --no-spec
```

在 entity 里加一些内容：

```javascript
export class User {
    id: number;

    username: string;

    password: string;

    email: string;

    constructor(partial: Partial<User>) {
        Object.assign(this, partial);
    }
}
```

Partial 是把 User 的属性变为可选：

可以传入部分属性，然后 Object.assign 赋值到 this。

然后 CreateUserDto 里包含这些属性：

```javascript
export class CreateUserDto {
    username: string;

    password: string;

    email: string;
}
```

实现下 UserService 的 create 和 find 的逻辑：

这里直接用数组模拟 database 来保存数据。

```javascript
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

const database = [];
let id = 0;

@Injectable()
export class UserService {
  create(createUserDto: CreateUserDto) {
    const user = new User(createUserDto);

    user.id = id++;

    database.push(user);

    return user;
  }

  findAll() {
    return database;
  }

  findOne(id: number) {
    return database.filter(item =>  item.id === id).at(0);
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
```

把服务跑起来：

```
npm run start:dev
```

创建两个 user：

查一下：

可以看到，user 的 password 也被返回了。

而这个应该过滤掉。

一般这种情况，都会封装个 vo。

创建 vo/user.vo.ts：

```javascript
export class UserVo {
    id: number;

    username: string;

    email: string;

    constructor(partial: Partial<UserVo>) {
        Object.assign(this, partial);
    }
}
```

然后把数据封装成 vo 返回：

```javascript
findAll() {
    return database.map(item => {
      return new UserVo({
        id: item.id,
        username: item.username,
        email: item.email
      });
    });
}

findOne(id: number) {
    return database.filter(item =>  item.id === id).map(item => {
      return new UserVo({
        id: item.id,
        username: item.username,
        email: item.email
      });
    }).at(0);
}
```

试一下：

可以看到，这样就没有 password 了。

但你会发现 UserVo 和 User entity 很类似：

对于 dto 可以通过 PartialType、PickType、OmitType、IntersectionType 来组合已有 dto，避免重复。

那 vo 是不是也可以呢？

是的，nest 里可以直接复用 entity 作为 vo。

这里要用到 class-transformer 这个包：

```
npm install --save class-transformer
```

然后在 UserController 的查询方法上加上 ClassSerializerInterceptor 就好了：

代码恢复原样：

现在返回的数据就没有 password 字段了：

class-transformer 这个包用过，是用于根据 class 创建对应的对象的。

当时是 ValidationPipe 里用它来创建 dto class 对应的对象。

这里也是用它来创建 entity class 对应的对象。

简单看下 ClassSerializerInterceptor 的源码：

它是通过 map 对响应做转换，在 serialize 方法拿到响应的对象，如果是数组就拿到每个元素。

在 transformToPlain 方法里，调用 classToPlain 创建对象。

它会先拿到响应对象的 class、然后根据 class 上的装饰器来创建新的对象。

当然，装饰器不只有 @Exclude，还有几个有用的：

```javascript
import { Exclude, Expose, Transform } from "class-transformer";

export class User {
    id: number;

    username: string;

    @Exclude()
    password: string;

    @Expose()
    get xxx(): string {
        return `${this.username} ${this.email}`;
    }

    @Transform(({value}) => '邮箱是：' + value)
    email: string;

    constructor(partial: Partial<User>) {
        Object.assign(this, partial);
    }
}
```

@Expose 是添加一个导出的字段，这个字段是只读的。

@Transform 是对返回的字段值做一些转换。

测试下：

可以看到，返回的数据多了 xxx 字段，email 字段也做了修改：

这样基于 entity 直接创建 vo 确实方便多了。

此外，你可以可以通过 @SerializeOptions 装饰器加一些序列化参数：

strategy 默认值是 exposeAll，全部导出，除了有 @Exclude 装饰器的。

设置为 excludeAll 就是全部排除，除了有 @Expose 装饰器的。

当然，你可以 ClassSerializerInterceptor 和 SerializeOptions 加到 class 上：

这样，controller 所有的接口返回的对象都会做处理：

swagger 那节当返回对象的时候，都是创建了个 vo 的类，在 vo class 上加上 swagger 的装饰器：

其实没必要，完全可以直接用 entity。

安装 swagger 的包：

```
npm install --save @nestjs/swagger
```

然后在 main.ts 添加 swagger 的入口代码：

```javascript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Test example')
    .setDescription('The API description')
    .setVersion('1.0')
    .addTag('test')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document);

  await app.listen(3000);
}
bootstrap();
```

现在 @apiResponse 里就可以直接指定 User 的 entity 了：

```javascript
import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, ClassSerializerInterceptor, SerializeOptions, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { User } from './entities/user.entity';

@Controller('user')
@SerializeOptions({
  // strategy: 'excludeAll'
})
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @ApiOperation({summary:'findAll'})
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ok',
    type: User
  })
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
```

在 User 里加一下 swagger 的装饰器：

```javascript
import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import { Exclude, Expose, Transform } from "class-transformer";

export class User {
    @ApiProperty()
    id: number;

    @ApiProperty()
    username: string;

    @ApiHideProperty()
    @Exclude()
    password: string;

    @ApiProperty()
    @Expose()
    get xxx(): string {
        return `${this.username} ${this.email}`;
    }

    @ApiProperty()
    @Transform(({value}) => '邮箱是：' + value)
    email: string;

    constructor(partial: Partial<User>) {
        Object.assign(this, partial);
    }
}
```

注意，这里要用 @ApiHideProperty 把 password 字段隐藏掉。

可以看到，现在的 swagger 文档是对的：

而且没有用 vo 对象。

这也是为什么 Nest 文档里没有提到 vo，因为完全可以用 entity 来替代。

## 总结

后端系统中常见 entity、vo、dto 三种对象，vo 是用来封装返回的响应数据的。

但是 Nest 文档里并没有提到 vo 对象，因为完全可以用 entity 来代替。

entity 里加上 @Exclude 可以排除某些字段、@Expose 可以增加一些派生字段、@Transform 可以对已有字段的序列化结果做修改。

然后在 controller 上加上 ClassSerializerInterceptor 的 interceptor，还可以用 @SerializeOptions 来添加 options。

它的底层是基于 class-transformer 包来实现的，拿到响应对象，plainToInstance 拿到 class，然后根据 class 的装饰器再 classToPlain 创建序列化的对象。

swagger 的 @ApiResponse 也完全可以用 entity 来代替 vo，在想排除的字段加一下 @ApiHideProperty 就好了。

Nest 文档里并没有提到 vo 对象，因为完全没有必要，可以直接用序列化的 entity。

---


上节学了用 class-transformer +  ClassSerializerInterceptor 来序列化 entity 对象，可以替代 vo。

这节自己来实现一下 ClassSerializerInterceptor，深入理解它的实现原理。

```
nest new serializer-interceptor-test
```

生成一个 user 的 CRUD 模块：

```
nest g resource user --no-spec
```

在 entity 里加一些内容：

```javascript
export class User {
    id: number;

    username: string;

    password: string;

    email: string;

    constructor(partial: Partial<User>) {
        Object.assign(this, partial);
    }
}
```

改下 UserService：

```javascript
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

const database = [
  new User({ id: 1, username: 'xxx', password: 'xxx', email: 'xxx@xx.com'}),
  new User({ id: 2, username: 'yyy', password: 'yyy', email: 'yyy@yy.com'})
];
let id = 0;

@Injectable()
export class UserService {
  create(createUserDto: CreateUserDto) {
    const user = new User(createUserDto);

    user.id = id++;

    database.push(user);

    return user;
  }

  findAll() {
    return database;
  }

  findOne(id: number) {
    return database.filter(item =>  item.id === id).at(0);
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
```
内置两条数据，这样就不用每次调用接口创建了。

然后安装 class-transformer 包：

```
npm install --save class-transformer
```
在 entity 上加一下 class-transformer 的装饰器：

```javascript
import { Exclude, Expose, Transform } from "class-transformer";

export class User {
    id: number;

    username: string;

    @Exclude()
    password: string;

    @Expose()
    get xxx(): string {
        return `${this.username} ${this.email}`;
    }

    @Transform(({value}) => '邮箱是：' + value)
    email: string;

    constructor(partial: Partial<User>) {
        Object.assign(this, partial);
    }
}
```

然后自己来实现 ClassSerializerInterceptor，还有一个自定义装饰器 SerializeOptions：

先来写这个自定义装饰器，它比较简单：
```
nest g decorator serialize-options --flat
```

```javascript
import { SetMetadata } from '@nestjs/common';
import { ClassTransformOptions } from 'class-transformer';

export const CLASS_SERIALIZER_OPTIONS = 'class_serializer:options';

export const SerializeOptions = (options: ClassTransformOptions) =>
    SetMetadata(CLASS_SERIALIZER_OPTIONS, options);
```
它做的事情就是往 class 或者 method 上加一个 metadata。

然后 interceptor 取出这个 metadata 的 options 给 class-transformer 用。

所以这个 options 的类型就是 ClassTransformOptions。

是不是第一次见这样设置参数？

确实挺巧妙的。

然后来写 interceptor：

```
nest g interceptor class-serializer --flat --no-spec
```

```javascript
import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClassTransformOptions } from 'class-transformer';
import { Observable } from 'rxjs';
import { CLASS_SERIALIZER_OPTIONS } from './serialize-options.decorator';

@Injectable()
export class ClassSerializerInterceptor implements NestInterceptor {

  @Inject(Reflector)
  protected readonly reflector: Reflector;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const contextOptions = this.getContextOptions(context);

    return next.handle();
  }

  protected getContextOptions(
    context: ExecutionContext,
  ): ClassTransformOptions | undefined {
    return this.reflector.getAllAndOverride(CLASS_SERIALIZER_OPTIONS, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}
```
注入 Reflector 包，用它的 getAllAndOverride 方法拿到 class 或者 handler 上的 metadata。

打印下看看。

把它加到 handler 上：

加一个调试配置：

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
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
    ]
}
```
打个断点，然后点击调试启动：

现在是 undefined：
加一下 @SerializeOptions 装饰器，用刚才写的那个。然后点击 restart：

这时候就拿到 options 了：

然后继续写：

```javascript
import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClassTransformOptions } from 'class-transformer';
import { Observable, map } from 'rxjs';
import { CLASS_SERIALIZER_OPTIONS } from './serialize-options.decorator';
import * as classTransformer from 'class-transformer';

function isObject(value) {
  return value !== null && typeof value === 'object'
}

@Injectable()
export class ClassSerializerInterceptor implements NestInterceptor {

  @Inject(Reflector)
  protected readonly reflector: Reflector;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const contextOptions = this.getContextOptions(context);

    return next
      .handle()
      .pipe(
        map((res) =>
          this.serialize(res, contextOptions),
        ),
      );
  }

  serialize(
    response: Record<string, any> | Array<Record<string, any>>,
    options: ClassTransformOptions
  ){

    if (!isObject (response) || response instanceof StreamableFile) {
      return response;
    }

    return Array.isArray(response)
      ? response.map(item => this.transformToNewPlain(item, options))
      : this.transformToNewPlain(response, options);
  }

  transformToNewPlain(
    palin: any,
    options: ClassTransformOptions,
  ) {
    if (!palin) {
      return palin;
    }

    return classTransformer.instanceToPlain(palin, options);
  }


  protected getContextOptions(
    context: ExecutionContext,
  ): ClassTransformOptions | undefined {
    return this.reflector.getAllAndOverride(CLASS_SERIALIZER_OPTIONS, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}

```

在 interceptor 里用 map operator 对返回的数据做修改。

在 serialize 方法里根据响应是数组还是对象分别做处理，调用 transformToNewPlain 做转换。

这里排除了 response 不是对象的情况和返回的是文件流的情况：

transformToNewPlain 就是用 class-transformer 包的 instanceToPlain 根据对象的 class 上的装饰器来创建新对象：

> 注意：旧版 API `classToPlain` 已废弃，使用 `instanceToPlain` 代替。

打个断点测试下：

最开始的响应数据是 user 对象：

转换完之后就是新的对象了：

这样就实现了 ClassSerializerInterceptor 拦截器的功能。

## 总结

上节学了用 entity 结合 class-transformer 的装饰器和 ClassSerializerInterceptor 拦截器实现复用 entity 做 vo 的功能。

这节自己实现了下。

首先是 @SerializeOptions 装饰器，它就是在 class 或者 handler 上加一个 metadata，存放 class-transformer 的 options。

在 ClassSerializerInterceptor 里用 reflector 把它取出来。

然后拦截响应，用 map operator 对响应做变换，调用 classTransformer 包的 instanceToPlain 方法进行转换。

自己实现一遍之后，对它的理解就更深了。
