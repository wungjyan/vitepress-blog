---
title: Vue项目自动路由和自动导入功能配置
date: 2024-06-04T04:51:07.752Z
description: 详解Vite+Vue项目自动化配置方案：通过unplugin-vue-router实现文件系统路由自动生成，结合unplugin-auto-import解决模块重复导入痛点，提升开发效率与代码整洁度。
categories: ['notes']
tags: ["Vite"]
---

在写自己的一个 Vite+Vue 项目时，考虑加入自动路由和自动导入功能。分别使用插件：[unplugin-vue-router](https://github.com/posva/unplugin-vue-router) 和 [unplugin-auto-import](https://github.com/unplugin/unplugin-auto-import)。

<!-- more -->

## unplugin-vue-router 实现自动路由

自动路由要达到的效果是：无需手动添加路由路径，而是根据文件路径自动生成路由配置。
这里以 Vite 项目为例，安装好插件后，在 vite.config.ts 中配置如下：

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
// 引入 vite 适配插件
import VueRouter from "unplugin-vue-router/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [VueRouter(), vue()], // VueRouter 插件必须放在 Vue 插件之前
});
```

如果是 Typescript 项目，运行项目后，会在项目中自动生成一个 `typed-router.d.ts`文件，这个文件在后续开发中会自动生更新路由映射类型，为防止 ts 报错，所以需要将这个文件引入到 `tsconfig.json` 文件中，同时需要将 `moduleResolution` 项设置为 `bundler` ：

```json
{
  "include": [
    // other files...
    "./typed-router.d.ts" // [!code ++]
  ],
  "compilerOptions": {
    // ...
    "moduleResolution": "bundler" // [!code ++]
    // ...
  }
}
```

另外，如果项目中有 `env.d.ts`文件，例如 Vite + Typescript 创建的项目就会有 `vite-env.d.ts`文件，则需要添加类型到其中：

```ts
/// <reference types="vite/client" />
/// <reference types="unplugin-vue-router/client" /> // [!code ++]
```

配置完成后，需要修改 `router.ts` 文件，不再直接使用 `vue-router` 模块：

```ts
import { createRouter, createWebHistory } from 'vue-router' // [!code --]
import {createRouter,createWebHistory} from 'vue-router/auto' // [!code ++]
import {routes} from 'vue-router/auto-routes' // [!code ++]

const router = createRouter({
  history:createWebHistory(),
  routes: [ // [!code --]
    { // [!code --]
      path: '/', // [!code --]
      component: () => import('src/pages/Home.vue'), // [!code --]
    } // [!code --]
  ] // [!code --]
  routes, // [!code ++]
})

export default router
```

上面代码中的 `routes` 变成自动生成的，它是基于文件系统的，默认路由文件映射目录是 `src/pages`，测试创建 `pages/index.vue`文件，可以看到 `typed-router.d.ts`文件中，已自动生成路由的映射：
![typed-router.d.ts.png](https://img.wjian.xyz/2024/typed-router.d.ts.png)

### 排除目录

有些时候，`pages`目录中可能会有一些其他的非页面内容的目录，比如 `components`目录，我们不希望它生成路由映射。`unplugin-vue-router` 支持排除目录设置，在 `exclude`数组中，列出你不想要生成路由的文件即可：

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import VueRouter from "unplugin-vue-router/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    VueRouter({
      routesFolder: "src/pages", // 这里可指定页面目录 // [!code ++]
      exclude: ["src/pages/components/**/*.vue"], // 这里排除了pages目录中components目录文件的路由映射 // [!code ++]
    }),
    vue(),
  ],
});
```

至此，自动路由配置完成，更多配置功能，详见文档：[configuration](https://uvr.esm.is/guide/configuration.html)。

## unplugin-auto-import 实现自动导入

自动导入要达到的效果是：使用过一些公共库或者是频繁导入使用的模块时，无需手动添加导入就可直接使用。
还是 Vite 项目为例，安装插件后，在 vite.config.ts 中配置：

```ts
// vite.config.ts
import AutoImport from "unplugin-auto-import/vite";

export default defineConfig({
  plugins: [
    AutoImport({
      /* options */
    }),
  ],
});
```

想要自动导出模块，需要在插件中具体配置。不是所有的插件或库都支持自动导入，首先官方默认提供了一些预设 [presets](https://github.com/unplugin/unplugin-auto-import/tree/main/src/presets)，在这个预设表中的插件，都可以直接配置成字符串即可。比如我希望自动导入 `vue` 和 `vue-router`中的方法，即可配置成：

```ts
// vite.config.ts
import AutoImport from "unplugin-auto-import/vite";

export default defineConfig({
  plugins: [
    AutoImport({
      imports: ["vue", "vue-router"],
    }),
  ],
});
```

此时如果是 Typescript 项目，运行项目后，会自动生成 `auto-imports.d.ts`文件，文件中会根据配置自动生成类型声明，防止 ts 报错，同样我们需要将此文件包含到 `tsconfig.json` 文件中：

```json
{
  "include": [
    // other files...
    "./auto-imports.d.ts" // [!code ++]
  ]
}
```

观察 `auto-imports.d.ts`文件，会发现已经有`vue`和 `vue-router`的内置模块的类型声明了：
![typed-router.d.ts.png](https://img.wjian.xyz/2024/auto-imports.d.ts.png)

现在使用 vue 模块开发时，就不需要再手动导入了：

```vue
<template>
  <div>{{ str }}</div>
</template>

<script setup lang="ts">
import { ref } from "vue"; // [!code --]
const str = ref("hello world!");
</script>
```

### 结合 unplugin-vue-router 使用

如果使用的插件库不在官方预设内，有些插件会自己实现，例如 `unplugin-vue-router`。

在使用 `unplugin-vue-router` 时，我们不直接使用 `vue-router`，希望是自动导入插件中的方法，而此插件刚好也暴露了自己实现的自动导入预设，所以可修改配置如下：

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import VueRouter from "unplugin-vue-router/vite";
import AutoImport from "unplugin-auto-import/vite";
import { VueRouterAutoImports } from "unplugin-vue-router"; // [!code ++]

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    VueRouter({
      routesFolder: "src/pages",
      exclude: ["src/pages/components/**/*.vue"],
    }),
    vue(),
    AutoImport({
      imports: [
        "vue",
        "vue-router", // [!code --]
        VueRouterAutoImports, // [!code ++]
      ],
    }),
  ],
});
```

再查看`auto-imports.d.ts`文件，发现也已经有了对应方法的类型声明：
![auto-imports-router.png](https://img.wjian.xyz/2024/auto-imports-router.png)

### 自动导入自己写的工具模块

有时候我们也希望可以将自己写的工具方法实现自动导入，好在插件中可以配置。
举个例子，假设我们有一个 `utils`目录，其中有文件`date.ts`是封装了一些日期方法，有文件`storage.ts`文件封装了缓存方法，再来一个 `index.ts`作为入口文件：

```ts
export function getTime() {
  return new Date().getTime();
}
```

```ts
export function getStorage(key: string) {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}
```

```ts
export { getTime } from "./date";
export { getStorage } from "./storage";
```

这个时候，我们希望 `utils`目录中所有的方法都能自动导入，就可以配置 `dirs`项：

```ts
AutoImport({
  imports: ["vue", "vue-router"],
  dirs: [
    "src/utils", // 配置工具类的目录即可
  ],
});
```

配置完成后，观察 `auto-imports.d.ts`文件，可以发现所有的方法都已声明了类型，可以直接使用了。
![auto-imports-utils.png](https://img.wjian.xyz/2024/auto-imports-utils.png)
