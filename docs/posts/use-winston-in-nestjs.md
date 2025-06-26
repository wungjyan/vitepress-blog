---
title: Nestjs 中使用 winston 日志库
date: 2025-06-25T02:15:44.655Z
description: 介绍在 nestjs 中如何使用 winston 日志库，以及结合 nest-winston 模块使用。  
categories: ['notes']
tags: ["Nestjs"]
---

本文介绍在 nestjs 中如何使用 `winston`，以及结合 `nest-winston` 模块使用。
<!-- more -->
这不是一个基础教程，是我使用过程中的理解记录。

## 自定义 winston 模块
`winston` 不是专为 nestjs 设计的，所以在 nestjs 中直接使用的话，不能实现依赖注入，这样使用起来就相对比较繁琐。我们可以尝试将 winston 再封装一层，让它成为一个单独的模块，方便全局各模块调用。

这个单独的winston的模块应该设计成动态模块，这样就可以传入不同的配置项应对不同场景。创建 `winston` 模块：
```bash
nest g mo winston
```
编写模块内容：
```ts
// winston.module.ts

import { DynamicModule, Module } from '@nestjs/common';
import { MyLogger } from 'src/myLogger';
import { LoggerOptions } from 'winston';

export const WINSTON_MODULE_OPTIONS = 'WINSTON_MODULE_OPTIONS';

@Module({})
export class WinstonModule {
  public static forRoot(options: LoggerOptions): DynamicModule {
    return {
      module: WinstonModule,
      providers: [
        {
          provide: WINSTON_MODULE_OPTIONS,
          useValue: new MyLogger(options),
        },
      ],
      exports: [WINSTON_MODULE_OPTIONS],
    };
  }
}
```
代码中的 `MyLogger` 是需要自定义的 Logger 类，可以对 nestjs 内置的 `LoggerService` 进行实现，然后将实例替换成 `winston` 实例。编写 `src/myLogger.ts` 文件：
```ts
// src/myLogger.ts

import { LoggerService } from '@nestjs/common';
import { Logger, createLogger, LoggerOptions } from 'winston';

export class MyLogger implements LoggerService {
    // 定义 logger 实例，注意是 winston 的 Logger 实例
  private logger: Logger;

  constructor(options: LoggerOptions) {
    // 创建一个 winston 日志实例，配置项是动态传入的
    this.logger = createLogger(options);
  }
  // 在内部 Logger方法中，调用 winston 实例方法
  log(message: string, context: string) {
    // 调用的 winston Logger 实例方法
    this.logger.info(message, context);
  }
  error(message: string, context: string) {
    this.logger.error(message, context);
  }
  warn(message: string, context: string) {
    this.logger.warn(message, context);
  }
}
```
代码中只实现了 `log`、`error` 和 `warn` 方法，用作演示。

现在使用时，只需要在模块中动态 imports 即可，比如我想在 `user.controller.ts` 中使用 `logger`，首先要在 `user.module.ts` 中引入 `WinstonModule`：
```ts
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { WinstonModule } from 'src/winston/winston.module';
import { transports, format } from 'winston';

@Module({
  imports: [
    // 动态模块，传入配置
    WinstonModule.forRoot({
      level: 'info',
      format: format.combine(
        format.label({ label: 'UserModule' }),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.splat(),
        format.printf(({ label, timestamp, level, message }) => {
          return `${timestamp} [${label}] ${level}: ${message}`;
        }),
      ),
      transports: [
        new transports.Console({}),
        new transports.File({
          filename: 'logs/app.log',
          level: 'info',
        }),
      ],
    }),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```
然后在 `user.controller.ts` 中注入：
```ts
import { Controller, Get, Inject } from '@nestjs/common';
import { UserService } from './user.service';
import { Logger } from 'winston';
import { WINSTON_MODULE_OPTIONS } from 'src/winston/winston.module';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    // 使用 @Inject 注入，WINSTON_MODULE_OPTIONS 是动态模块中注册的token
    @Inject(WINSTON_MODULE_OPTIONS) private logger: Logger,
  ) {}

  @Get()
  findAll() {
    // 这个 logger 就是 winston 模块中创建的 logger
    this.logger.log('findAll', UserController.name);
    return this.userService.findAll();
  }
}
```
这样请求 `/user` 路径时就会输出 winston 日志。

也可以在 `main.ts` 中替换全局日志：
```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_OPTIONS } from './winston/winston.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // bufferLogs: true,  // 如果设置true，初始化阶段的日志也会替换
  });
  app.useLogger(app.get(WINSTON_MODULE_OPTIONS));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```
此时默认的 `Logger` 会被替换成 `WinstonLogger`，可以直接在各模块中直接使用内置的 `Logger`，但输出结果是被 `WinstonLogger` 接管了。

以上就是我对 `winston` 在 nestjs 中使用的一种尝试，要想好用，还是需要费功夫完善对 `WinstonModule` 模块的封装。但是我们完全不必自己花时间封装，行业内已经有了成熟的封装库，那就是 [nest-winston](https://github.com/gremo/nest-winston#readme)，实际开发中直接用这个就好。

## nest-winston
`nest-winston`的使用方式，其实就跟上面我自己封装的动态模块是一样的，在需要使用的模块动态 imports 即可，如：
```ts
// user.module.ts

import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { WinstonModule } from 'nest-winston';
import { format, transports } from 'winston';

@Module({
  imports: [
    // 使用 WinstonModule.forRoot 传入配置
    WinstonModule.forRoot({
      level: 'info',
      format: format.combine(
        format.label({ label: 'UserModule' }),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.splat(),
        format.printf(({ label, timestamp, level, message }) => {
          return `${timestamp} [${label}] ${level}: ${message}`;
        }),
      ),
      transports: [
        new transports.Console({}),
        new transports.File({
          filename: 'logs/app.log',
          level: 'info',
        }),
      ],
    }),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```
可以看到只是将我自己定义的 `WinstonModule` 替换成 `nest-winston` 中的 `WinstonModule` 即可。注入日志实例时，再替换 `nest-winston` 提供的 token 即可：
```ts
// user.controller.ts

import { Controller, Get, Inject } from '@nestjs/common';
import { UserService } from './user.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // WINSTON_MODULE_PROVIDER 是 nest-winston 提供的，用于注入 winston 的 logger 对象
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Get()
  findAll() {
    // 这里第一个参数是日志级别，跟 winston.Logger 实例的 log 方法一样
    this.logger.log('info', 'user findAll');
    return this.userService.findAll();
  }
}
```
不过 `nest-winsto` 提供了两种 token：
- `WINSTON_MODULE_PROVIDER`：提供 winston.Logger 实例，即 winston 原生日志对象，可以调用 winston 所有 API；
- `WINSTON_MODULE_NEST_PROVIDER`：提供 LoggerService 实例，实现 nestjs 内置的 LoggerService 接口，替换默认的 Logger。

按需使用即可。

### 我的方案
`nest-winston` 的使用方式比较灵活，我更喜欢直接替换全局 logger，在 `main.ts` 中修改如下：
```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createLogger } from 'winston';
import { WinstonModule } from 'nest-winston';
async function bootstrap() {
  // 创建 winston 日志实例
  const instance = createLogger({
    //options of Winston
  });
  const app = await NestFactory.create(AppModule, {
    // 将 winston 日志实例传入 WinstonModule.createLogger
    logger: WinstonModule.createLogger({
      instance,
    }),
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```
这也是文档中介绍的一种方式，参考 [Replacing the Nest logger (also for bootstrapping)](https://github.com/gremo/nest-winston#replacing-the-nest-logger-also-for-bootstrapping)。

此时由于替换的内置的 `Logger`，所有在其他模块中可以直接使用 `Logger`，为了方便所有模块使用，我在 `app.module.ts` 中引入并设置为全局模块：
```ts
import { Global, Logger, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';

// 需要设置为全局模块
@Global()
@Module({
  imports: [UserModule],
  controllers: [AppController],
  providers: [AppService, Logger], // 传入 Logger 供 app 模块内部使用
  exports: [Logger], // 导出 Logger 供其他模块使用  
})
export class AppModule {}
```
此时其他地方想要使用 Logger 时，不需要用装饰器 `@Inject` 来注入了，如在 `user.controller.ts` 中使用：
```ts
import { Controller, Get, Logger } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: Logger,
  ) {}

  @Get()
  findAll() {
    this.logger.log('findAll', UserController.name);
    return this.userService.findAll();
  }
}
```
这样全局使用就简单很多，不需要在各模块 imports 中引入 `WinstonModule`了。

将 winston 配置摘出来，便于管理，以下是我尝试的一份配置：
```ts
import { utilities } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

// 控制台输出
const consoleFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.timestamp(),
  winston.format.ms(),
  utilities.format.nestLike('MyApp'),
);

// 文件输出
const fileFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf((info) => `${JSON.stringify(info)}\n`), // 关键：每条日志末尾添加换行符
);

// 创建日志滚动传输（按日期/大小分割）
const createRotateTransport = (level: string, filename: string) =>
  new DailyRotateFile({
    level,
    dirname: 'logs',
    filename: `${filename}-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: fileFormat, // 使用带换行的 JSON 格式
  });

export const logger = winston.createLogger({
  level: 'info',
  transports: [
    // 控制台输出
    new winston.transports.Console({ format: consoleFormat }),
    // 滚动文件输出
    createRotateTransport('info', 'app'),
    createRotateTransport('error', 'errors'), // 错误日志
    createRotateTransport('warn', 'warnings'), // 警告日志
  ],
});
```
更多的配置需要在实际项目中进行修改。