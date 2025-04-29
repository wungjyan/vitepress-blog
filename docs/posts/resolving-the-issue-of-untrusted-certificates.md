---
title: 解决 Mac 钥匙串访问中证书不受信任问题
date: 2024-10-31T02:46:35.279Z
description: 解决Mac钥匙串中iOS开发证书不受信任问题：通过下载安装Apple Worldwide Developer Relations根证书，修复.p12证书导出错误，保障应用打包流程顺畅。
tags: ["开发记录"]
---

开发 IOS 应用时少不了打几次证书，这次重新打包一个好久没动的 app，证书要重新申请，结果在导出 `.p12` 证书时，出现证书不受信任问题。

<!-- more -->

![证书不受信任截图](https://img.wjian.xyz/2024/Snipaste_2024-10-30_16-43-59.png)

这个问题在之前也出现过，当时也解决了，这次又出现让我迷惑了一下，后来想到我不久前重装过几次系统，可能是这个原因导致的，那就重新解决下。

这个问题具体原因说不清，我手动信任证书是没有用的，从各方搜集到的解决方法都是安装根证书，证书下载地址： https://www.apple.com/certificateauthority/ 。需要下载其中的 `Worldwide Developer Relations` 证书：

![image-20241031105707317](https://img.wjian.xyz/2024/image-20241031105707317.png)

有人说要下载全部，但我只下载了 3 个安装上就解决了问题，安装方式是双击。
