---
title: uniapp 开发记录
date: 2024-03-28T16:45:39+08:00
description: 总结uniapp跨平台App开发实战经验：涵盖基座配置、证书管理、easycom组件模式、路由拦截及原生图层层级难题解决方案，助力高效避坑与性能优化。
tags: ["uniapp", "开发记录"]
---

去年我用 uniapp 帮公司开发了一个跨平台 App，最近又改版优化了一版。App 虽然简单，但是也踩了不少坑，所以准备用此文记录一下。

<!-- more -->

## 初始化项目

uniapp 支持两种初始化项目方式，一个是用他们的编辑器 HBuilderX（后简称 HBX） 可视化创建，一个就是利用 vue-cli 命令行方式创建。但是开发 APP 始终需要用 HBX 来进行云端打包，所以我就直接用 HBX 来初始化项目的。

但是我觉得这个编辑器不好用，所有开发时用 HBX 运行项目，然后在 VSCode 中写代码，并配置了 prettier，保存自动格式化代码。

现在 uniapp 搞了个 `HBuilderX cli` 命令来运行或者打包 app，我浅看了下，本质还是需要安装 HBuilderX 的，只是可以通过命令来操作 HBX ，没啥意义。文档在这里：[HBuilderX cli](https://hx.dcloud.net.cn/cli/README)

我个人更希望 uniapp 官方拥抱 VSCode 这些成熟的编辑器，只专注做 sdk。

## 开发运行

### 关于基座

开发 app 时，可以使用模拟器或者真机来调试，此时安装的是基座包。uniapp 提供标准基座，也可以自定义基座。

标准基座使用的是 DCloud 的包名、证书和三方 SDK 配置，是可以直接安装调试的，但是 ios 的真机调试用不了。

只推荐自定义基座，或者只能使用自定义基座，因为可以使所有的 app 配置生效，比如 App 名称和图标，权限设置，三方 sdk 配置等等，都需要生成自定义基座来生效。参考文档：[自定义基座](https://uniapp.dcloud.net.cn/tutorial/run/run-app.html#customplayground)

### 关于证书

开发 App 就一定涉及证书，打自定义基座时也需要证书。只有安卓提供了测试证书，但是最后发布还是需要自定义证书的。安卓和苹果的证书教程：

- ios 证书，文档：https://ask.dcloud.net.cn/article/152

- android 证书，文档：https://ask.dcloud.net.cn/article/35777

### 关于组件

开发跨平台 App，需要考虑兼容性。官方自带的组件一般是可以兼容 android 和 ios 的。但是如果使用插件时，需要注意下有的插件是针对某一平台开发的，就不会兼容另一个平台。

另外 UI 组件的选择，我这里推荐 [uview-ui](https://ext.dcloud.net.cn/plugin?id=1593)，比官方出的 `uni-ui` 好用些，但是只兼容 Vue2。所以开发 App 我建议使用 Vue2 语法版本，因为很多插件都没更新到 Vue3 语法，即使出了也有不少问题。

### 指定页面调试

有时候开发的页面层级比较深，调试时需要能够直达页面比较快捷。此时可以设置 `condition` 这个配置项，在 pages.json 中配置页面路径列表，开发时即可选择打开指定页面。如图：
![uniapp-condition](https://img.wjian.xyz/2024/uniapp-condition.jpg)

### 其他

别的关于 app 的配置，参考文档就好，没啥大坑的。

还要提及下，如果新勾选了一些要用到的模块，需要重新打自定义基座并重新安装，这样真机调试才可以看到效果，当然这些都会有提示。

另一个就是配置文件 `manifest.json`支持可视化修改，也可以支持源码视图修改。如果你用别的编辑器，直接源码视图修改的话，要注意自动格式化的问题。因为这份配置文件里有很多注释，本来 json 文件是不支持这些注释的，在别的编辑器上可能会报错，保存时可能会格式化掉一些内容。

## 组件自动引用

HBuilderX 提供 `easycom` 组件模式，即使用组件前不需要手动引用，可以直接使用，只要符合规范的组件都会自动引用。那么这里就有一个坑，一定要严格遵循它的路径规则，即：

- 安装在项目根目录的 components 目录下，并符合`components/组件名称/组件名称.vue`
- 安装在 uni_modules 下，路径为`uni_modules/插件ID/components/组件名称/组件名称.vue`

我最开始自定义组件目录下用的是 `index.vue`，导致引用失败。当然这是他们的默认规则，你也可以去 `pages.json` 中自定义规则。

## 路由拦截

由于用的不是 vue-router，所以路由拦截就不好实现了。但好在 uniapp 提供了一个 api 拦截器，即 `addInterceptor`。它的作用是可以拦截 uniapp 中的一些 api，比如 `request`，`navigateTo`等。

如果需要拦截路由，拦截 `navigateTo` 或者 `redirectTo` 即可，可以在执行 api 之前进行一些判断。示例代码：

```js
function addInterceptor() {
  // 需要拦截的 api 列表
  let list = ["navigateTo", "redirectTo"];
  // 遍历执行拦截操作
  list.forEach((item) => {
    uni.addInterceptor(item, {
      invoke(res) {
        // return true 表示放行，return false 表示不继续执行
        if (res.url === "/pages/index/index") {
          return true;
        } else {
          // return false 之前可以进行一些操作，比如重定向
          return false;
        }
      },
      fail(err) {
        // 失败回调拦截
        console.log(err);
      },
    });
  });
}
```

## 图层层级

这是最坑的一点。开发 App 时，有些组件是原生渲染的，这就意味着无法使用 `z-index` 控制它的层级，就会出现遮挡内容的情况。

如果你使用 nvue 开发的页面，就没有关系，因为此时页面全是原生渲染的，可以覆盖层级。但是如果你页面已经用 vue 开发完，但是后来加了原生组件的需求，那么就有点难受了。

如果只想在原生组件上覆盖一些内容，那还好做，使用 `cover-view` 组件可以覆盖内容到原生组件上，具体看文档。

还有一类场景就是原生组件遮挡了页面中的内容，比如页面滑动时遮挡了底部操作栏，popup 弹窗被原生组件遮挡等。这种场景优点难办，但也有办法。一个就是使用 `cover-view`组件重写被遮挡内容，页面布局有点受限，但基本能实现。另一个办法就是使用原生子窗体 `subNVue`，关于它的介绍，引用官方定义：

> subNvue，是 vue 页面的原生子窗体，把 weex 渲染的原生界面当做 vue 页面的子窗体覆盖在页面上。它不是全屏页面，它给 App 平台 vue 页面中的层级覆盖和原生界面自定义提供了更强大和灵活的解决方案。它也不是组件，就是一个原生子窗体。

其实就是一个局部的 nvue 内容，可以覆盖住原生组件。关于它的使用就是需要在项目中创建一个 `nvue` 组件，然后去 pages.json 中对应的页面配置中配置`style -> app-plus -> subNVues`即可，可以参考这篇文档：[subNVue 原生子窗体开发指南](https://ask.dcloud.net.cn/article/35948)。
