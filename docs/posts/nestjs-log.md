---
title: Nestjs 中自定义日志
date: 2025-06-24T03:27:23.991Z
description: 介绍 Nestjs 中自定义日志的实现方式，以及介绍自定义日志类如何实现依赖注入。
categories: ['notes']
tags: ["Nestjs"]
---

本文介绍一下 Nestjs 中自定义日志的实现方式，以及如何给自定义日志类实现依赖注入。
<!-- more -->

## 全局替换 Logger
nestjs中可以自定义日志类并全局替换，首先是创建自己的日志类，实现 `LoggerService` 这个类即可：
```ts
// myLogger.ts

import { LoggerService } from '@nestjs/common';

export class MyLogger implements LoggerService {
  log(message: any, context: string) {
    console.log(`---log---[${context}]---`, message);
  }
  error(message: any, context: string) {
    console.log(`---error---[${context}]---`, message);
  }
  warn(message: any, context: string) {
    console.log(`---warn---[${context}]---`, message);
  }
}
```
我这里只实现了 `log`、`error` 和 `warn` 这三个方法做演示。因为实现的 `LoggerService` 类，所以我们可以直接去 `main.ts` 中全局替换：
```ts
// main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MyLogger } from './myLogger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new MyLogger(), // 这里替换成自定义的类，并传入实例
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```
注意在使用时，还是需要引入 `Logger` 并实例化，如在 `app.controller` 中使用：
```ts
// app.controller.ts

import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  private logger = new Logger(); // 实例化 Logger
  @Get()
  getHello() {
    // 测试打印
    this.logger.log('info log', AppController.name);
    this.logger.error('error log', AppController.name);
    this.logger.warn('warn log', AppController.name);
    this.logger.debug('debug log', AppController.name);
    return this.appService.getHello();
  }
}
```
打印结果：

![](https://img.wjian.xyz/2025/log-console-res-1.png)

可以看到整个系统的日志都被替换成了自定义日志的输出格式。

另外 `debug` 级别日志没有被输出，因为 `MyLogger` 中没有实现 `debug` 方法，像这样只想自定义一个或者多个日志方法时，可以使用继承 `ConsoleLogger` 的方式，比如我只想重写 `log` 方法：
```ts
// myLogger2.ts

import { ConsoleLogger } from '@nestjs/common';

export class MyLogger2 extends ConsoleLogger {
  // 只重写 log 方法
  log(message: string, context: string): void {
    console.log(`[${context}] ${message}`);
  }
}
```
使用 `MyLogger2` 方式跟上面一致，直接全局替换即可。此时打印结果：

![](https://img.wjian.xyz/2025/log-console-res-2.png)

可以看到只有 `log` 方法的输出格式被重写，其他方法保留原格式输出。

## 依赖注入
以上面 `MyLogger2` 为例，如果我们需要在类中使用其他模块的服务时，该怎么做？最普通的方法就是在类实例化时传入对应服务参数，如 `new MyLogger2(new AppService())`。但是在 `nestjs` 中，我们优先考虑怎么实现**依赖注入**。

假设我们要在`MyLogger2` 中使用 `appService.getHello` 方法，改写如下：
```ts
// myLogger2.ts

import { ConsoleLogger, Inject, Injectable } from '@nestjs/common';
import { AppService } from './app.service';

@Injectable()
export class MyLogger2 extends ConsoleLogger {

  @Inject(AppService)
  private readonly appService: AppService;

  log(message: string, context: string): void {
    console.log(this.appService.getHello());
    console.log(`[${context}] ${message}`);
    console.log('--------------');
  }
}
```
添加 `@Injectable()` 装饰器，代表这是一个 `provider`，并且要在 Module 里引入：
```ts
// app.module.ts

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MyLogger2 } from './myLogger2';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, MyLogger2], // 这里需引入 MyLogger2
})
export class AppModule {}
```
此时还是不生效，我们需要修改全局日志替换的方式：
```ts
// main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MyLogger2 } from './myLogger2';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // logger: new MyLogger2(),
    bufferLogs: true, // 启用日志缓冲，避免启动日志丢失
  });

  app.useLogger(app.get(MyLogger2)); // 从容器获取MyLogger2实例（含注入的AppService）
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```
解释下，`bufferLogs: true` 的作用是先不打印日志，而是放到缓冲区，等 `useLogger` 指定了 Logger 后再统一输出，直白说就是**可以捕获启动初期的日志**，这是为了配合 `app.useLogger`而设置的，其实下面这两种写法效果是一致的：
```ts
// 1. bufferLogs 结合 app.useLogger
const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
});
app.useLogger(new MyLogger2());

// 2. 直接实例化
const app = await NestFactory.create(AppModule, {
logger: new MyLogger2(),
});
```
再说说 `app.get(MyLogger2)` 的作用，系统的依赖注入容器会检查 `MyLogger2` 是否已在某个模块的 `providers` 中注册，若 `MyLogger2` 依赖 `AppService`，容器会递归创建 `AppService` 实例，最终返回一个完整构建的 `MyLogger2` 实例（含所有注入的依赖）。这样就实现了依赖注入的效果。

使用方式不变，打印结果：

![](https://img.wjian.xyz/2025/log-console-res-3.png)

## 结尾
以上就是自定义日志的实现方式，也可以直接将自定义的日志类单独放到一个全局模块中，方便各模块调用。但是实际开发中，更多的是使用第三方封装好的日志库，功能更加强大，使用更便捷。后面准备记录一下 [winston](https://github.com/winstonjs/winston) 日志库的使用。