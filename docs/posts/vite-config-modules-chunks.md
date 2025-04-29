---
title: Vite 项目配置模块分包
date: 2024-06-13T14:04:18.925Z
description: 详解Vite项目模块分包优化：通过rollupOptions配置manualChunks拆分第三方库与业务代码，提升加载速度与缓存利用率，解决大文件性能瓶颈的最佳实践。
tags: ["Vite"]
---

使用 Vite 开发项目，build 后发现所有的逻辑文件都被打包在一个入口 js 文件中。

<!-- more -->

如图：

![vite build 默认结果](https://img.wjian.xyz/2024/vite-build-result.png)

这样的打包结果显示不是合理的，当项目大了之后，js 入口文件会变得非常大，影响加载速度。还有就是对于项目中长期不变的 js 引入文件，我们不应该使其每次打包都重新生成 hash 名，这样会导致每次重新 build 后，客户端因为文件 hash 值的变化，都要重新下载这些固定文件内容，在网速不好的情况会影响使用体验。所以针对这点，需要做 build 优化，拆分模块文件。

但是 Vite 文档中没有找到这种功能的配置，其实 Vite 没有实现这个功能，它的打包是依赖 `rollup` 的，所以我们可以查找 `rollup` 的相关功能。Vite 打包是支持配置 `rollup` 功能以改变打包结果的，在`vite.config.js` 中配置 `build.rollupOptions`即可。

在查看 `rollup` 文档后得知，拆分包功能需要配置 `output.manualChunks`。`manualChunks` 是一个对象，对象的每一个属性名都是要生成的 chunk 名前缀，而属性值则是需要打入的模块包名。例如我们需要将 `vue` 文件单独拆分出来，则可以配置：

```js
{
  // 忽略其他配置
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ["vue"];
        }
      }
    }
  }
}
```

此时再执行打包，结果如下：

![优化build结果](https://img.wjian.xyz/2024/Snipaste_2024-06-13_22-36-07.png)

可以看到 `vue` 文件是被单独拆分出来了，且后续再修改项目代码时，这个文件指纹是不会再变的，因为开发中不可能修改 vue 源码。同样的道理，对于引用的第三方库，我们都应该拆分出来，可以放在一个 chunk 中，也可以单独拆分，如下：

```js
{
    // 忽略其他配置
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // 放在一个 chunk 中
                    chunk: ['vue','vue-router','vuex'],
                    // 也可以单独细分
                    vue:['vue'],
                    vuex:['vuex'],
                    'vue-router':['vue-router'],
                }
            }
        }
  }
}
```

至此，我们解决了基本需求。还有一个问题就是如果项目中需要拆分的模块很多，我们一个个去列举模块也不太现实，这时候就可以换个配置模式。`manualChunks` 是支持配置成一个函数的，函数的入参是每一个被打包的模块 id，我们可以判断这个 id 是否是来自`node_modules` 路径的，如果是则代表是第三方库，就可以统一打包进一个 chunk 中，配置如下：

```js
{
    // 忽略其他配置
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules")) {
                        return "vendor";
                    }
                },
            },
        },
    }
}
```

更多关于 `manualChunks` 的配置，可参考文档：[output-manualchunks](ttps://cn.rollupjs.org/configuration-options/#output-manualchunks)
