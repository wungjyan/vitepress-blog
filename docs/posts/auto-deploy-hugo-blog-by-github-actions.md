---
title: "通过 Github Actions 实现 Hugo 博客的自动构建部署"
date: 2022-02-24T09:50:29+08:00
description: 详解通过GitHub Actions实现Hugo博客自动化部署，包含SSH密钥配置、工作流编排与rsync同步技术，解决手动构建痛点，提升静态站点持续交付效率的最佳实践。
category: "折腾记录"
tags: ["Blog", "Hugo"]
---

玩过静态博客的人都知道，写一篇文章的过程远不如动态博客那么方便，每次写完文章部署时，都需要重新构建整个站点文件，然后再重新上传到网站服务器。这种方式过于繁琐，影响写博客的心情，所以需要更自动的方式，这里我推荐 `Github Actions`。

<!-- more -->

目前我这个博客是采用 `Hugo` 搭建的，并部署在阿里云 ECS 云服务器上的。而整个构建发布过程我都是利用 `Github Actions` 帮我完成的，个人觉得很方便，所以记录下来，有需要的可以参考一下。

## 服务器准备

### 安装 nginx，配置 web 服务器目录

因为本文是介绍部署到服务器，所以需要准备一个服务器的。然后部署 Web 站点是通过 `nginx` 的，你可以自己安装配置 `nginx`，也可以通过宝塔这样的程序来简易安装，总而言之，你都会得到一个网站静态文件存放的目录，这个目录其实就是存放博客构建之后的文件的。我是自己安装 nginx 并配置目录的：

![nginx 根目录](https://img.jyan.wang/2022/WX20220224-102219%402x.png)

之所以强调这个目录，是因为我们后面要用到它。不熟悉命令行操作的，推荐使用宝塔，会自动帮你配置好。

### 服务器配置公钥

一般使用过 `git` 的，你的电脑上都会有一个公钥和私钥，是用来连接远程仓库的。没有也没关系，他们是通过以下命令创建的：

```shell
ssh-keygen -t rsa -C "youremail@example.com"  // 后面填你自己的邮箱
```

找到你电脑本地已经创建好的公钥，Mac 和 Linux 系统上一般在 `~/.ssh` 目录中，Windows 系统一般也在用户目录中的 `.ssh` 目录中。

![密钥名称](https://img.jyan.wang/2022/WX20220224-105012%402x.png)

`id_rsa.pub` 是公钥，`id_rsa` 是私钥，现在要将公钥内容拷贝一份到服务器上。不管是手动复制粘贴还是命令形式都好，你要做的就是将本地的 `id_rsa.pub` 文件内容拷贝到服务器的 `~/.ssh/authorized_keys` 文件中，如果服务器没有这个文件，按照路径创建一个。

这一步的目的是为了后面让 `Github Actions` 服务器能免密访问我们自己的服务器，具体后面会说到。

其实服务器配置了公钥后，我们自己的电脑也可以免密访问服务器，可以参考我写的一篇文章：[mac 上配置 ssh 免密登录服务器](https://www.cnblogs.com/wjaaron/p/12283679.html)

## 上传博客代码到 gtihub，配置私钥

既然是利用 `Github Actions`，那我们的代码肯定是要放在 Github 上了，**不过需要注意的是存放的代码不是构建好的博客代码，而是完整的博客程序代码**，因为构建过程我们也交给了 `Github Actions`。

创建的代码仓库不管是公开库还是私密库都可以，过程我就不细述了。仓库建好之后，我们要配置一下私钥，按照下图操作：

![私钥配置步骤](https://img.jyan.wang/2022/WechatIMG51.png)

在你的仓库界面，点击 `Settings`，点开左侧的 `Secrets`，点击 `Actions`，再点击 `New repository secret` 创建密钥，密钥名称输入 `BLOG_DEPLOY_KEY`，内容则是你电脑本地的 `id_rsa` 私钥内容。

密钥名称其实完全可以自定义的，但因为后面需要引用这个名称，所以建议按照我的来写，或者你后面记得改成对应名称也行。这里设置的私钥是对应我们第一步在服务器上设置的公钥的，使得 `Github Actions` 服务可以直接访问我们自己的服务器了。

## 创建 Actions

还是在你的代码仓库界面，点击 `Actions`，然后点击 `New workflow`，然后会跳转到一个界面让你选择一个 `workflow`，这里有很多现成的流程配置，但由于我们需要自己写配置文件，所以直接点击 `set up a workflow yourself` 即可，它会初始化一个新的 `.yml` 文件。

这个 `.yml` 文件的名称你可以自定义，然后将初始文件内容全部替换成以下我写的并加以修改：

```yml
name: CI

# Controls when the workflow will run
on:
  # 在 push 的时候执行，分支是 main 分支，自行修改
  push:
    branches: [main]

  workflow_dispatch:

# A workflow run is made up of one or more jobs that can run sequentially or in parallel
jobs:
  # This workflow contains a single job called "build"
  build:
    # The type of runner that the job will run on
    runs-on: ubuntu-latest

    # Steps represent a sequence of tasks that will be executed as part of the job
    steps:
      # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
      - uses: actions/checkout@v2
        with:
          submodules: "recursive"

      # BLOG_DEPLOY_KEY 私钥名称自行修改
      - uses: webfactory/ssh-agent@v0.5.4
        with:
          ssh-private-key: |
            ${{ secrets.BLOG_DEPLOY_KEY }}

      # Runs a single command using the runners shell
      # 这里的 jyan.wang 是我的域名，自行修改，前提条件是域名已经解析到 ip 上
      - name: Scan public keys
        run: |
          ssh-keyscan jyan.wang >> ~/.ssh/known_hosts

      # Hugo setup
      - name: Hugo setup
        uses: peaceiris/actions-hugo@v2.4.13

      # hugo 构建命令，可自行修改参数
      - name: Build
        run: |
          hugo --minify

      # deploy
      # rsync -av --delete 后面的自行修改
      - name: Deploy
        run: |
          rsync -av --delete public/ root@jyan.wang:/usr/share/nginx/html
```

虽然上面要修改的部分我都中文注释了，这里还是把关键地方分别介绍一下吧。

### 触发时机

一般我们是在代码 `push` 之后才触发，所以这里不用改，然后分支根据实际情况修改，你的不一定在 `main` 分支：

```yml
on:
  push:
    branches: [main]
```

### 代码检出

工作流的第一步就是要将最新的代码检出到 `Github Actions` 的虚拟环境中，通过 `actions/checkout` 实现。由于我的博客主题是以子模块的形式存在于博客仓库中的，所以还需要使用 `submodules: 'recursive'` 将子模块也递归检出。

```yml
- uses: actions/checkout@v2
  with:
    submodules: "recursive"
```

### 密钥处理

使用 `webfactory/ssh-agent` 缓存私钥，私钥名称需要对应你自己设置的名称：

```yml
- uses: webfactory/ssh-agent@v0.5.4
  with:
    ssh-private-key: |
      ${{ secrets.BLOG_DEPLOY_KEY }}
```

同时使用 `ssh-keyscan` 扫描服务器的公钥并保存到 `Github Actions` 虚拟环境的 `~/.ssh/known_hosts` 中，使工作流自动运行。

### 安装 Hugo

在虚拟环境安装 Hugo，可以使用 `peaceiris/actions-hugo`：

```yml
- name: Hugo setup
  uses: peaceiris/actions-hugo@v2.4.13
```

### Hugo 构建

安装好 Hugo 后，就可以正常使用 Hugo 各种命令了，由于我们是用来构建，所以直接写 `hugo --minify` 即可：

```yml
- name: Build
  run: |
    hugo --minify
```

### 部署

这一步其实就是将上一步由 Hugo 生成的静态网站文件（默认在 `public` 目录下）传到我们服务器的 `Web服务器根目录`中即可。根目录我们在文章开篇就介绍了，现在来说下怎么传输文件。

我这里使用 `rsync` 命令，`rsync` 是一个常用的 Linux 应用程序，用于文件同步，感兴趣的可以查阅阮一峰老师的这篇介绍：[rsync 用法教程](http://www.ruanyifeng.com/blog/2020/08/rsync.html)，我这里就不多介绍了。**注意你的服务器上要先安装好 `rsync` 程序**，而 `GitHub Actions` 服务器已经默认安装了 `rsync`。

文件同步命令：

```yml
- name: Deploy
  run: |
    rsync -av --delete public/ root@jyan.wang:/usr/share/nginx/html
```

上面命令中，`public/` 是 Hugo 构建后的文件夹，这里需要注意的是加 `/` 是表示把目录中的文件分别传输，如果不加 `/`，则将整个 `public` 目录直接传输了。

`root@jyan.wang:/usr/share/nginx/html`，冒号前面的是我的账号和域名，后面的则是 Web 服务器根目录，你需要根据自己的情况进行修改。**域名需要提前解析到 ip 上**。

### 保存 actions 工作流，测试

将上述配置文件按照自己的实际情况修改好，然后点击右上角的 `Start commit`，再点击 `Commit new file`，将文件保存。此时你的仓库中就会生成一个 `.github` 文件，存的就是保存的配置文件。

回到你的本地代码中，使用 `git pull` 更新文件，然后修改你的博客内容，最后 `push` 到远程仓库，看看 `Actions` 中是不是开始构建发布你的博客吧。

如果一切正常，点开你的仓库 `Actions`，你会发现正在运行的工作流，例如我的：

![工作流列表](https://img.jyan.wang/2022/WX20220224-172418.png)

点开触发的工作流，还可查看工作流的各个步骤及其详细日志：

![工作流执行日志](https://img.jyan.wang/2022/WX20220224-173003.png)

自此之后，不需要每次更新博客都要手动登录服务器部署站点了。

## 结尾

以上方法适用于任何静态网站的部署而不仅限于 Hugo，也不限于部署到服务器，不过都需要你自己修改工作流的一些配置，原理都是一样的。希望可以给你一些参考。
