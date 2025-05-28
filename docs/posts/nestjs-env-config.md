---
title: 详解 Nestjs 环境变量使用
date: 2025-04-22
description: 详解NestJS环境变量配置实践，涵盖@nestjs/config模块使用、多环境配置(.env/.env.production)、YAML文件集成及Joi校验方案，通过优先级覆盖机制和全局加载策略构建专业级应用配置体系。
categories: ['notes']
tags: ["Nestjs"]
---

Nestjs 中的环境变量配置，可通过 `@nestjs/config` 模块实现，只是如果想要用的好，还需要配置一番。
<!-- more -->
下面详细介绍一下 `@nestjs/config` 模块的使用。

## 基础使用

安装 `@nestjs/config` 模块后，需要在模块中引用，这里是在 `app.module.ts` 中全局引用的：

```ts
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UserModule } from "./user/user.module";
import { ConfigModule } from "@nestjs/config"; // 引入ConfigModule // [!code focus]

@Module({
  imports: [
    ConfigModule.forRoot({       // [!code focus]
      isGlobal: true, // 设置全局生效 // [!code focus]
    }), // [!code focus]
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```
`ConfigModule.forRoot()` 方法接受一个参数，该参数是一个对象，其中 `isGlobal` 属性表示是否全局生效，默认为 `false`，设置为 `true` 后，该模块下所有导入的模块都可以直接使用环境变量。比如在 `UserModule` 中使用，下面就演示在 `UserModule` 中获取环境变量。

默认情况下，`@nestjs/config` 模块会从 `.env` 文件中读取环境变量，如果文件不存在，则会从 `process.env` 中读取。开发中我们肯定会添加自己的环境变量文件，添加 `.env` 文件：
```bash
DATABASE_USER = test
DATABASE_PASSWORD = 12345
```
获取 `.env` 中环境变量也很简单，在 Controller 中使用：
```ts
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('user')
export class UserController {
  // 注入 config 服务 
  constructor(private readonly configService: ConfigService) {} 

  @Get('')
  getEnv() {
    // 读取配置信息 
    const user = this.configService.get('DATABASE_USER') as string; 
    const password = this.configService.get('DATABASE_PASSWORD') as string; 
    return {
      user,
      password,
    };
  }
}
```
也可以在 Service 中使用：
```ts
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  // 注入 config 服务
  @Inject(ConfigService)
  private configService: ConfigService;

  getEnv() {
    // 读取配置信息
    const user = this.configService.get('DATABASE_USER') as string; 
    const password = this.configService.get('DATABASE_PASSWORD') as string; 

    return {
      user,
      password,
    };
  }
}
```

## 区分环境配置文件
实际开发中，我们可能需要区分不同的环境，比如开发环境、测试环境、生产环境等，这时我们可以使用 `.env.development`、`.env.test`、`.env.production` 等文件。然后使用 `NODE_ENV` 环境变量来区分环境，使用插件 `cross-env`来设置设置当前的 `NODE_ENV`：
```bash
"start:dev": "cross-env NODE_ENV=development nest start --watch",
"start:prod": "cross-env NODE_ENV=production node dist/main",
```
注意 `cross-env` 需要单独安装。

然后分别创建两个环境变量的文件，`.env.development` 和 `.env.production`，然后就是去加载这两个文件，利用 `envFilePath` 属性来设置：
```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';

// 利用 NODE_ENV 来区分环境，从而加载不同的环境变量文件 // [!code focus]
const envFilePath = process.env.NODE_ENV === 'development' // [!code focus]
    ? '.env.development' // [!code focus]
    : '.env.production'; // [!code focus]

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath, // 设置环境变量文件路径 // [!code focus]
    }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```
上述操作就是根据不同的环境来指定对应的环境变量文件，然后加载到 `ConfigModule` 中。

`envFilePath` 支持数组格式，可**按优先级加载多个环境文件**。我们可以将 `.env` 文件也加载进来，用于设置公共变量，改写如下：
```ts
envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
```
同时加载了两个环境变量文件，**若多个文件中存在同名变量，​​数组中的靠前的文件会覆盖靠后的同名变量​​**。这样写可以将通用配置写在 `.env`，环境相关配置写在 `.env.development` 和 `.env.production`中，更好的维护所有变量。

## 使用yaml配置文件
我们也可以使用 `yaml` 文件格式来配置环境变量，这样就可以使用嵌套写法了。但是默认不支持，需要安装插件 `js-yaml` 来手动实现，先安装：
```bash
npm i js-yaml
npm i -D @types/js-yaml
```

接下来，我们在`src`同级创建一个配置文件目录 `config`（文件位置没有限制，按自己爱好就行），然后分别创建 `config.yaml` 文件，如：
```yaml
# config/config.yaml

http:
  host: 'localhost'
  port: 9000
```
这只是一个简单的配置示例。然后创建配置文件 `configuration.ts`：
```ts
// config/configuration.ts

import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

export default () => {
  const configFile = readFileSync(join(__dirname, './config.yaml'), 'utf8');
  // 解析 yaml 并返回键值对对象
  return yaml.load(configFile) as Record<string, any>;
};
```
现在我们需要加载这个 `configuration.ts` 文件。`ConfigModule.forRoot` 方法参数中有一个 `load` 属性，它要求是一个数组，数组的每一项都要求是一个函数返回对象，返回的对象会合并到全局配置中。而 `configuration.ts` 文件刚好就是导出了这样的一个函数，所以可以这样写：
```ts{6,13}
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      load: [configuration],
    }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```
此时在项目中就可以这样获取`yaml`中的配置了：
```ts
this.configService.get('http') // { host: 'localhost', port: 9000 }
```
需要注意，`envFilePath` 和 `load` 是可以共存的，**如果有同名变量，`load` 的优先级要高于 `envFilePath`**。

如果喜欢 `yaml` 这种格式，可以将所有的环境变量都改成这种，甚至使用 `json` 格式也可以，这里就不展开了。

## 校验环境变量
我们也可以校验环境变量的值，使用插件 `joi`，然后在 `validationSchema` 传入校验规则：
```ts{7,15,16,17}
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration';
import * as Joi from 'joi'; // [!code focus]

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      load: [configuration],
      validationSchema: Joi.object({ // [!code focus]
        PORT: Joi.number(), // 校验 PORT 变量只能是数字类型 // [!code focus]
      }), // [!code focus]
    }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```
具体的校验规则可以参考 `joi` 的文档，这里不一一列举了。

需要注意的是，只能校验 `envFilePath` 中加载的环境变量，不能校验 `load` 加载的变量。`joi` 的校验发生在环境变量加载阶段，而 load 的配置是在环境变量合并后动态注入的。因此，load 中的变量不会触发 `joi` 的验证逻辑。
