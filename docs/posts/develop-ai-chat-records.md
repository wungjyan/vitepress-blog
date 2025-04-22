---
title: 开发 AI 对话功能的踩坑记录
date: 2024-11-27T08:25:56.669Z
description: 记录AI对话功能开发中WebSocket重连机制、Markdown实时分段渲染、数学公式解析等关键问题及解决方案。
category: "开发记录"
tags: ["开发记录"]
---

最近给公司的 APP 开发了一个 AI 对话的功能，是直接做成 H5 页面内嵌到 APP 中的。功能本身不难，就是调用第三方 AI 接口，做点前端效果，只是过程中踩了点小坑，在此记录下。

<!-- more -->

## Websocket 的关闭与重连

我调用的 AI 接口是经过服务端转发了一层，最终调用方式是使用的 `Websocket`。因为需求的原因，会有很多场景需要重新组装连接地址，然后重新连接 `Websocket`，这里面就涉及连接关闭问题，只有旧的连接关闭了才能重新连接。

最开始我的做法是在每次连接 `Websocket` 前都先判断一下是否已有连接，有的话就先关闭，伪代码大致如下：

```javascript
connectWebSocket(){
  //  如果有连接则关闭
	if(this.socket){
    this.socket.close();
    this.socket = null;
  }
  // 创建新连接
  let url = 'xxxx'
  this.socket = new WebSocket(url);
}
```

这样做看似也没有问题，确实功能也能跑起来，但是发现总会报错一次，这个报错一直没找到原因。后来跟服务端沟通了下，才知道光前端这边关闭也不行，也需要等服务端那边关闭才行。也就是说我在前端关闭连接后，马上就重新连接了新的，此时服务端可能还来不及响应或者判断（这里服务端说的也比较含糊），但我理解了我这边关闭后应该等待一下再重新连接，因为 `Websocket` 关闭也会有一个“握手”的过程，只有服务端也响应了关闭帧才算真正关闭了这个连接。

等待连接，加个定时器是最简单的方式，但我不想这样干，因为这个等待的时间是不确定的，我不想给一个较长的时间，也不敢给一个太短的时间（其实应该会很快）。后来我想到了另一个方式，`Websocket` 关闭后是有关闭回调的，因为不熟悉它所以一开始没想到这个，有了这个回调那就好办了，我在关闭回调中判断是否需要重连即可。伪代码：

```javascript
// 开启连接
connectWebSocket(){
  // ...

  // 连接关闭回调
  this.socket.onclose = () => {
    this.socket = null
    // 判断是否需要重新连接，这个状态是在关闭前决定的
    if (this.needReconnect) {
      setTimeout(() => {
        this.connectWebSocket();
      }, 1000);
    }
  }
}

// 关闭连接
closeConnect(needReconnect) {
  if (
    this.socket &&
    this.socket.readyState !== WebSocket.CLOSED &&
    this.socket.readyState !== WebSocket.CLOSING
  ) {
    this.needReconnect = needReconnect;
    this.socket.close();
    this.socket = null;
  }
}
```

这样在需要重新连接的时候，直接调用 `closeConnect` 方法，并根据当前情况决定是否要重新连接，传入对应的参数即可。

## 消息渲染

`Websocket` 返回的 AI 回复内容，是一段一段的，并不是一次性下发完整的内容，所以需要拼接消息，然后也做上了打字机效果。这里面有个问题就是回复的内容是 `Markdown` 格式的，你需要将文本转为 `Html` 格式再渲染。在转换格式的时机上，走了两次弯路导致效果不理想。

最开始我做的是每次接收到消息时，就直接转换为 html 文本再拼接，伪代码：

```js
  // WebSocket 接收消息时调用
  receiveMessage(content) {
    const newHtml = marked(content); // 将 Markdown 转为 HTML
    this.fullHtmlBuffer += newHtml;  // 将 HTML 内容追加到缓冲区
    // 拿 this.fullHtmlBuffer 内容做打字机效果，拼接所有消息
    this.startTypingEffect();
  }
```

上面这样写的话，问题很严重，因为 markdown 解析基本失败了。稍微思考下也发现了原因，就是 AI 回复的内容不仅是一段一段的，连成对出现的 markdown 符号可能都是拆散的，比如文本加粗，它的回复可能是 `**hello` 、 `，world*` 和 `*` 这三段，显然单独解析哪一段都不能成功，所以后来调整了方式，就是先拼接 markdown 文本，再解析格式：

```javascript
receiveMessage(content){
  // 拼接 markdown 文本
  this.messageBuffer += content;
  // 拼接好的文本再解析成 html
  const fullHtml = marked(this.messageBuffer);
}
```

最后利用打字机效果，将 `fullHtml` 文本慢慢渲染到页面上，我用的是 `Vue` 开发的，所有渲染 html 很简单，类似这样：

```vue
<div v-html="answeringText"></div>
```

到这里，再加上定制的样式，渲染效果是做到了，但又出现另一个问题，就是打字机效果中，会闪现 html 的标签符合，如 `<`、`>` 这样，观感会不好。这个问题我在开发完整体功能后尝试解决，但一直没成功。直到快提测前突然想到换种渲染方式看看，于是真给解决了。做法也很简单，就是将 markdown 文本的解析，延后到渲染时，直接在 `v-html` 指令中解析 markdown，大致流程代码如下：

```javascript
// 接收消息拼接到 messageBuffer，再开启打字机
receiveMessage(content){
    this.messageBuffer += content;
  	this.startTypingEffect();
}

// 打字机效果简单实现
startTypingEffect() {
  if (this.typingInterval) return;

  this.typingInterval = setInterval(() => {
    if (this.typingIndex < this.messageBuffer.length) {
      // 分割 markdown 文本
      this.answeringText = this.messageBuffer.slice(
        0,
        this.typingIndex + 1
      );
      this.typingIndex++;
    } else {
      clearInterval(this.typingInterval);
      this.typingInterval = null;
    }
  }, 30);
}
```

再渲染：

```vue
<div v-html="marked(answeringText)"></div>
```

此时就不会再有 html 标签闪现的问题了。问题的原因我猜测跟之前的分步解析 markdown 问题一样，就是渲染到 `<` 时还不能完整渲染出 html 内容，只有等渲染到 `>` 时才算完毕，所以会先闪。但是现在改进的写法，就可以避免分步解析 html 标签符号的问题。

## 数学公式的解析

AI 的回复内容中会包含数学公式，一开始我没处理，就被测试提出了 bug：

![image-20241128155859085](https://img.jyan.wang/blog/image-20241128155859085.png)

这个问题也好解决，我用的是 `markdown-it` 来解析 markdown 文本的，它有个插件 `markdown-it-katex` 就可以解析数学公式。按照文档加入了插件，确实可以正确解析数学公式，但是这个插件需要引入`katex` 的样式，官方是提供的 cdn 链接，用 `link` 引入的：

```html
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.5.1/katex.min.css"
/>
```

但正式项目中，我不敢直接用公开的 cdn 连接，于是我直接下载这个样式文件到项目中引入了，但是发现还需要一堆字体文件：

![image-20241128160701853](https://img.jyan.wang/blog/image-20241128160701853.png)

我不想下载这一堆字体，于是换个方法，就是直接 `npm` 安装 `katex` 这个插件，然后引入它暴露出的样式即可。但是！这样是不行的。

我不得不说，坑无处不在，npm 安装的 `katex` 版本是 `v0.16.11`，但是插件 `markdown-it-katex` 需要的是 `v0.5.1` 版本的样式，好，那我直接安装 `katex@0.5.1` 就好了，但是等我切换版本安装后，骤然发现这个版本的 npm 包根本没暴露样式文件！我真的是大写的无语了，最后我不得不下载了所有的字体，幸好每个字体文件也不大，都是十几 k 大小的，然后下载了 `v0.5.1` 版本的样式文件到项目中引入。

这个问题看似好解决，但是也耽误了我不少时间，在使用第三方插件包时，还是要注意版本更新问题啊，太久的包还是能不用就不用的好，就比如这个 `markdown-it-katex` 包最后一次更新还是 8 年前，但奈何周下载量还有几万的，不得不用。
