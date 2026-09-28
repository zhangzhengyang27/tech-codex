---
title: 日志方案 Winston
description: Nest 里如何打印日志、为什么 Node 里要用 Winston 打印日志，以及 Nest 集成日志框架 Winston
keywords: [日志, Logger, Winston, 日志级别, transport, format, nest-winston]
category: Node.js
tags: [Node.js, NestJS, Winston, 日志]
---

# 日志方案 Winston

本文介绍日志方案：Nest 里如何打印日志、为什么 Node 里要用 Winston、以及 Nest 如何集成日志框架 Winston。

## Nest 里如何打印日志

前面都是用 console.log 打印的日志，这样有不少弊端：没有日志的不同级别的区分，不能通过开关控制是否打印等。其实 Nest 提供了打印日志的 api。

还是先创建个项目：

```
nest new logger-test -p npm
```

进入目录，执行 nest start --watch 把服务跑起来，Nest 会打印这些日志。它也同样提供了打印这种日志的 api。

在 AppController 里创建个 logger 对象，使用它的 api 打印日志：

```javascript
import { ConsoleLogger, Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private logger = new Logger();

  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    this.logger.debug('aaa', AppController.name);
    this.logger.error('bbb', AppController.name);
    this.logger.log('ccc', AppController.name);
    this.logger.verbose('ddd', AppController.name);
    this.logger.warn('eee', AppController.name);

    return this.appService.getHello();
  }
}
```

浏览器访问下，会打印这样的日志。这里的 verbose、debug、log、warn、error 就是日志级别，而 \[\] 中的是 context，也就是当前所在的上下文，最后是日志的内容。

这个日志是受 Nest 控制的，可以在创建应用的时候指定是否开启：设置 logger 为 false 之后就没有日志了；你也可以自己决定输出什么级别的日志。

### 自定义 Logger

此外，你还可以自定义日志打印的方式，定义一个实现 LoggerService 接口的类，只要实现 log、warn、error 3 个方法就好了：

```javascript
import { LoggerService, LogLevel } from '@nestjs/common';

export class MyLogger implements LoggerService {
    log(message: string, context: string) {
        console.log(`---log---[${context}]---`, message)
    }

    error(message: string, context: string) {
        console.log(`---error---[${context}]---`, message)
    }

    warn(message: string, context: string) {
        console.log(`---warn---[${context}]---`, message)
    }
}
```

在创建应用时指定这个 logger。你也可以不自己实现 LoggerService 的全部方法，而是继承 ConsoleLogger，重写一些方法：

```javascript
import { ConsoleLogger } from '@nestjs/common';

export class MyLogger2 extends ConsoleLogger{
    log(message: string, context: string) {
        console.log(`[${context}]`,message)
    }
}
```

因为 ConsoleLogger 实现了 LoggerService 接口，这样你没重写的方法就是原来的。

### 在 Logger 中注入依赖

但这样有个问题，没法注入依赖，因为 Logger 是在容器外面，手动 new 的对象。怎么办呢？

这时候可以这样：bufferLogs 就是先不打印日志，把它放到 buffer 缓冲区，直到用 useLogger 指定了 Logger 并且应用初始化完毕。app.get 就是从容器中取这个类的实例的，写一个 Logger 类放到容器里：

```javascript
import { Inject } from '@nestjs/common';
import { ConsoleLogger, Injectable } from '@nestjs/common';
import { AppService } from './app.service';

@Injectable()
export class MyLogger3 extends ConsoleLogger{
    @Inject(AppService)
    private appService: AppService;

    log(message, context) {
        console.log(this.appService.getHello());
        console.log(`[${context}]`, message);
        console.log('--------------')
    }
}
```

添加 @Injectable() 装饰器，代表这是一个 provider，并且要在 Module 里引入。通过 @Inject 注入 AppService，并在 log 的时候调用。很明显，logger 里成功注入了 appService 的依赖。

可以单独搞一个模块来放 Logger，并把这个 Module 设置为全局模块，这样在任何地方都可以注入这个 logger 对象了。

或者你也可以声明一个动态模块，每次 imports 的时候配置下：

```javascript
import { DynamicModule, Global, Module } from '@nestjs/common';
import { MyLogger } from './MyLogger';

@Module({})
export class Logger2Module{

    static register(options): DynamicModule {
        return {
            module: Logger2Module,
            providers: [
                MyLogger,
                {
                    provide: 'LOG_OPTIONS',
                    useValue: options
                }
            ],
            exports: [MyLogger, 'LOG_OPTIONS']
        }
    }
}
```

把传入的 options 作为 provider，在 Logger 里注入，每次 imports 的时候传入不同的配置。在 AppService 里注入下 MyLogger，浏览器访问就可以看到 MyLogger 打印的传入的 option。具体是用全局模块还是动态模块，可以根据情况来选择。

## 为什么 Node 里要用 Winston 打印日志？

Node 里怎么打印日志呢？不，服务端打印日志一般不会用 console.log。因为 console.log 打印完就没了，而服务端的日志经常要用来排查问题，需要搜索、分析日志内容，所以需要写入文件或者数据库里。

而且打印的日志需要分级别，比如有的是错误的日志，有的只是普通日志，需要能够过滤不同级别的日志。此外，打印的日志需要带上时间戳、所在的代码位置等信息。这些都是 console.log 没有的功能。

所以一般都会用专门的日志框架来做，比如 winston。它是 Node 最流行的日志框架，npm 官网上可以看到每周千万级的下载量。

### winston 的基本使用

试试看：

```
mkdir winston-test
cd winston-test
npm init -y
npm install --save winston
```

然后写下 index.js：

```javascript
import winston from 'winston';

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            dirname: 'log', filename: 'test.log'
        }),
    ]
});

logger.info('光光光光光光光光光');
logger.error('东东东东东东东东');
logger.debug(66666666);
```

用 createLogger 创建了 logger 实例，指定 level、format、transports。level 是打印的日志级别，format 是日志格式，transports 是日志的传输方式。这里指定了 Console 和 File 两种传输方式。

在 package.json 里指定 type 为 module，这样代码里就可以直接用 import、export 这些语法了。用 node 跑一下：

```
node index.js
```

可以看到控制台和文件里都有了打印的日志，再跑一遍会在后面追加。

### 日志文件分割与滚动

如果所有日志都写在一个文件里，那这个文件最终会不会特别大？不用担心，winston 支持按照大小自动分割文件，指定 maxsize 为 1024 字节也就是 1kb，跑几次后就出现了第二个文件，而这时第一个日志文件刚好是 1kb。

如果想按照日期滚动呢？这里要换别的 Transport 了。在 winston 文档里可以看到有很多 Transport：Console、File、Http、Stream 这几个 Transport 是内置的，下面还有很多社区的 Transport，比如 MongoDB 的 Transport（把日志写入 mongodb）。这里的 DailyRotateFile 就是按照日期滚动存储到日志文件的 Transport。

试试看：

```
npm install --save winston-daily-rotate-file
```

然后改下代码：

```javascript
import winston from 'winston';
import 'winston-daily-rotate-file';

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.DailyRotateFile({
            level: 'info',
            dirname: 'log2',
            filename: 'test-%DATE%.log',
            datePattern: 'YYYY-MM-DD-HH-mm',
            maxSize: '1k'
        })
    ]
});

logger.info('光光光光光光光光光');
logger.error('东东东东东东东东');
logger.debug(66666666);
```

这里使用了 DailyRotateFile 的 transport，指定了文件名和日期格式，因为文件名里的日志格式包含分钟，所以不同的分钟打印的日志会写入不同文件里，这就达到了滚动日志的效果。

### http 传输

再来试试 http 的 transport。先创建个 nest 服务并添加一个路由：

```
nest new winston-log-server
```

```javascript
@Post('log')
log(@Body() body) {
    console.log(body);
}
```

然后改下 index.js，使用 http 的 transport 来传输日志：

```javascript
import winston from 'winston';
import 'winston-daily-rotate-file';

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.Http({
            host: 'localhost',
            port: '3000',
            path: '/log'
        })
    ]
});

logger.info('光光光光光光光光光');
logger.error('东东东东东东东东');
logger.debug(66666666);
```

跑一下，nest 服务收到了传过来的日志。基本上，内置的和社区的 transport 就足够用了，不管是想把日志发送到别的服务，还是把日志存到数据库等，都可以用不同 Transport 实现。

这些 transport 可以用 add、remove 方法来动态增删：

```javascript
import winston from 'winston';

const console = new winston.transports.Console();
const file = new winston.transports.File({ filename: 'test.log' });

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.simple()
});

logger.clear();
logger.add(console);
logger.remove(console);
logger.add(file);

logger.info('光光光光光光光光光');
logger.error('东东东东东东东东');
logger.debug(66666666);
```

比如先 clear，然后动态添加又删除了 console，然后又添加了一个 file 的 transport，效果就是只有一个 file 的 transport。

### 日志级别与格式

再就是日志级别，winston 默认有 7 种级别的日志（error、warn、info、http、verbose、debug、silly），从上往下重要程度依次降低。比如当你指定 level 是 info 时，那 info、warn、error 的日志会输出，而 http、debug 这些不会。日志级别虽然简单，但却是很实用的功能。

日志可以通过 format 指定格式：simple、json、prettyPrint（比 json 的格式多了一些空格）、用 combine 组合 timestamp 和 json，或者再组合个 label 加上个标签方便搜索相关日志、还有彩色。

如果不同的 transport 要指定不同的格式呢？可以这样：

```javascript
import winston from 'winston';

const logger = winston.createLogger({
    level: 'debug',
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
        new winston.transports.File({
            dirname: 'log3',
            filename: 'test.log',
            format: winston.format.json()
        }),
    ]
});

logger.info('光光光光光光光光光');
logger.error('东东东东东东东东');
logger.debug(66666666);
```

每个 transport 单独指定 format 就好了。

如果有的日志只想 console，而有的日志希望写入文件，而且配置都不同呢？可以创建多个 logger 实例，每个 logger 实例有不同的 format、transport、level 等配置：

```javascript
import winston from 'winston';

winston.loggers.add('console', {
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

winston.loggers.add('file', {
    format:winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            dirname: 'log4',
            filename: 'test.log',
            format: winston.format.json()
        })
    ]
});


const logger1 = winston.loggers.get('console');

logger1.info('aaaaa');
logger1.error('bbbbb');

const logger2 = winston.loggers.get('file');

logger2.info('xxxx');
logger2.info('yyyy');
```

创建了 2 个 logger 实例，其中一个只写入 console，另一个只写入 file，并且 format 都不同。这样，项目中有不同的日志需求的时候，就可以创建多个 logger 实例。

### 异常处理的日志

此外，winston 还支持指定如何处理未捕获的错误的日志：

```javascript
import winston from 'winston';

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console()
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: 'error.log'
        })
    ]
});

throw new Error('xxx');

logger.info('光光光光光光光光光');
logger.error('东东东东东东东东');
logger.debug(66666666);
```

跑一下可以看到错误日志被输出到了 error.log。除了 error 外，Promise 的未捕获异常也可以指定如何处理日志（用 rejectionHandlers）：

```javascript
import winston from 'winston';

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console()
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: 'rejection.log'
        })
    ]
});

(async function(){
    throw Error('yyy');
})();

logger.info('光光光光光光光光光');
logger.error('东东东东东东东东');
logger.debug(66666666);
```

这些就是 winston 的主要功能了。

## Nest 集成日志框架 Winston

学习了 Nest 如何自定义 logger，也学习了 Winston 的使用，那如何在 Nest 里集成 Winston 呢？这节来实现下。

```
nest new nest-winston-test
```

创建个 nest 项目，在 src 添加一个 MyLogger.ts：

```javascript
import { LoggerService, LogLevel } from '@nestjs/common';

export class MyLogger implements LoggerService {
    log(message: string, context: string) {
        console.log(`---log---[${context}]---`, message)
    }

    error(message: string, context: string) {
        console.log(`---error---[${context}]---`, message)
    }

    warn(message: string, context: string) {
        console.log(`---warn---[${context}]---`, message)
    }
}
```

然后在 main.ts 里引入：

```javascript
app.useLogger(new MyLogger());
```

把服务跑起来：

```
npm run start:dev
```

现在的 logger 就换成自己的了。接下来只要换成 winston 的 logger 就好了。安装 winston：

```
npm install --save  winston
```

然后改下 MyLogger，把 console.log 换成 winston 的 logger：

```javascript
import { ConsoleLogger, LoggerService, LogLevel } from '@nestjs/common';
import { createLogger, format, Logger, transports } from 'winston';

export class MyLogger implements LoggerService {

    private logger: Logger;

    constructor() {
        this.logger = createLogger({
            level: 'debug',
            format: format.combine(
                format.colorize(),
                format.simple()
            ),
            transports: [
                new transports.Console()
            ]
        });
    }

    log(message: string, context: string) {
        this.logger.log('info', `[${context}] ${message}`);
    }

    error(message: string, context: string) {
        this.logger.log('error', `[${context}] ${message}`);
    }

    warn(message: string, context: string) {
        this.logger.log('warn', `[${context}] ${message}`);
    }
}
```

再跑下，现在的日志就是 winston 的了，只不过和 nest 原本的日志格式不大一样。这个简单，自己写一下这种格式就好了。安装 dayjs 格式化日期，安装 chalk 来打印颜色：

```
npm install --save dayjs
npm install --save chalk@4
```

注意：这里用的是 chalk 4.x 的版本。然后来实现下 nest 日志的格式：

```javascript
import { ConsoleLogger, LoggerService, LogLevel } from '@nestjs/common';
import * as chalk from 'chalk';
import * as dayjs from 'dayjs';
import { createLogger, format, Logger, transports } from 'winston';

export class MyLogger extends ConsoleLogger {

    private logger: Logger;

    constructor() {
        super();

        this.logger = createLogger({
            level: 'debug',
            transports: [
                new transports.Console({
                    format: format.combine(
                        format.colorize(),
                        format.printf(({context, level, message, time}) => {
                            const appStr = chalk.green(`[NEST]`);
                            const contextStr = chalk.yellow(`[${context}]`);

                            return `${appStr} ${time} ${level} ${contextStr} ${message} `;
                        })
                    ),
                })
            ]
        });
    }

    log(message: string, context: string) {
        const time = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss');

        this.logger.log('info', message, { context, time });
    }

    error(message: string, context: string) {
        const time = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss');

        this.logger.log('error', message, { context, time });
    }

    warn(message: string, context: string) {
        const time = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss');

        this.logger.log('warn', message, { context, time });
    }
}
```

这里用到了 printf 的 format 函数，它可以自定义打印的日志格式，用 chalk 加上了颜色，并且打印了 dayjs 格式化的时间。是不是和 nest 原本的日志很像了？

然后再加一个 File 的 transport，指定为 json 格式，加上时间戳：

```javascript
new transports.File({
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    filename: '111.log',
    dirname: 'log'
})
```

console 的日志和 file 的日志格式不同。这样，就完成了 nest 和 winston 的集成。

### 封装成动态模块

还可以进一步把它封装成一个动态模块。

```javascript
import { DynamicModule, Global, Module } from '@nestjs/common';
import { LoggerOptions, createLogger } from 'winston';
import { MyLogger } from './MyLogger';

export const WINSTON_LOGGER_TOKEN = 'WINSTON_LOGGER';

@Global()
@Module({})
export class WinstonModule {

    public static forRoot(options: LoggerOptions): DynamicModule {
        return {
            module: WinstonModule,
            providers: [
                {
                    provide: WINSTON_LOGGER_TOKEN,
                    useValue: new MyLogger(options)
                }
            ],
            exports: [
                WINSTON_LOGGER_TOKEN
            ]
        };
      }
}
```

添加 forRoot 方法，接收 winston 的 createLogger 方法的参数，返回动态模块的 providers、exports。用 useValue 创建 logger 对象作为 provider。

这里的 MyLogger 是之前那个复制过来的，但需要改一下 constructor：

```javascript
constructor(options) {
    this.logger = createLogger(options)
}
```

然后在 AppModule 引入下：

```javascript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WinstonModule } from './winston/winston.module';
import { transports, format } from 'winston';
import * as chalk from 'chalk';

@Module({
  imports: [WinstonModule.forRoot({
      level: 'debug',
      transports: [
          new transports.Console({
              format: format.combine(
                  format.colorize(),
                  format.printf(({context, level, message, time}) => {
                      const appStr = chalk.green(`[NEST]`);
                      const contextStr = chalk.yellow(`[${context}]`);

                      return `${appStr} ${time} ${level} ${contextStr} ${message} `;
                  })
              ),

          }),
          new transports.File({
              format: format.combine(
                  format.timestamp(),
                  format.json()
              ),
              filename: '111.log',
              dirname: 'log'
          })
      ]
  })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

之后改一下 main.ts 里用的 logger：

```javascript
app.useLogger(app.get(WINSTON_LOGGER_TOKEN));
```

功能正常，只不过现在就没必要每次都 new 了，改成 inject 的方式，始终使用同一个实例，性能更好：

```javascript
@Inject(WINSTON_LOGGER_TOKEN)
private logger;
```

当然，其实这个模块没必要自己封装，社区有已经封装好的可以直接用：nest-winston（36w 的周下载量），用法也和实现的差不多。

## 总结

- **Nest 里打印日志**：可以用 Nest 的 Logger，它支持在创建应用的时候指定 logger 是否开启、打印的日志级别，还可以自定义 logger。自定义 Logger 需要实现 LoggerService 接口，或者继承 ConsoleLogger 然后重写部分方法。如果想在 Logger 注入一些 provider，就需要创建应用时设置 bufferLogs 为 true，然后用 app.useLogger(app.get(xxxLogger)) 来指定 Logger。可以把这个自定义 Logger 封装到全局模块，或者动态模块里。一般情况下，直接使用 Logger 就可以了。
- **为什么用 Winston**：Node 服务端不会用 console.log 打印日志，而是会用日志框架比如 winston。winston 支持 transport 配置，可以把日志传输到 console、file、通过 http 发送到别的服务、写入 mongodb 数据库等。支持 level 级别过滤，支持 format 的设置（json、simple、label、timestamp 等，一般输出到文件里的都是 json 格式并加时间戳和 label）。每个 transport 都可以单独指定 format，而且还可以创建多个 logger 用不同的配置。此外还支持指定未捕获的 error 的日志怎么处理。相比直接 console.log，用 winston 这样的灵活强大的日志框架可太香了。
- **Nest 集成 Winston**：只要在 Logger 的实现里改成 winston 的 logger 就好了。想要保持 nest 原本日志的格式，需要用 printf 自定义，使用 dayjs + chalk 自定义 winston 的日志格式。打印到 File 的日志依然是 json 的。之后封装了个动态模块，在 forRoot 方法里传入 options，模块内创建 winston 的 logger 实例，并声明为全局模块。这样应用各处都可以注入自定义的基于 winston 的 logger 了。不过项目里没必要自己写，用 nest-winston 就好了。