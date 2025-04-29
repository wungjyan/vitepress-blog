---
title: 新的脚本，自动部署 Hugo 博客至服务器
date: 2023-03-19T13:42:39+08:00
description: 优化Hugo博客自动化部署方案：基于GitHub Actions精简工作流配置，集成rsync同步插件实现高效文件传输，降低运维复杂度与部署耗时。
tags: ["Blog", "Hugo"]
---

之前写过一篇 [通过 Github Actions 实现 Hugo 博客的自动构建部署](/posts/auto-deploy-hugo-blog-by-github-actions)，现在感觉部署脚本写的有点复杂了，所以重新写了一个脚本。

<!-- more -->

简化了不少，内容如下：

```yml
name: Auto Deploy

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true # Fetch Hugo themes (true OR recursive)
          fetch-depth: 0
      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: "0.110.0"
          extended: true
      - name: Build
        run: hugo --minify
      - name: Rsync Deployments Action
        uses: Burnett01/rsync-deployments@5.2.1
        with:
          switches: -avzr --delete
          path: ./public/
          remote_path: # 填服务器部署目录
          remote_host: # 填服务器IP地址
          remote_port: # 填端口号，一般就是 22
          remote_user: # 填服务器用户名
          remote_key: ${{ secrets.DEPLOY_KEY }} # 这里是 ssh 私钥，敏感数据建议设置成 secrets 获取
```

不明白的可以参考上篇文章，然后脚本改一下就行。
