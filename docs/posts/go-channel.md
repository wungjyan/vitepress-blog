---
title: Go 语言中的 channel
date: 2025-03-27T06:57:02.579Z
description: 详解Go语言Channel核心机制：涵盖无缓冲/有缓冲通道、select多路复用、单向通道及超时处理，解决协程通信死锁问题，提升并发编程可靠性。
category: "代码笔记"
tags: ["Go"]
---

Go 语言中的通道（channel）是用于在多个 goroutine 之间通信，它就像是一个传送带或者队列，遵循先入先出（FIFO）的规则，保证数据收发的顺序。同时，每一个通道都是一个具体类型的管道，所以在声明 channel 的时候需要为其指定元素类型。

<!-- more -->

## 声明以及初始化 channel

在 Go 语言中，声明 channel 的语法为：

```go
var 变量名称 chan 元素类型

// 如
var ch1 chan int // 声明一个传递整型的通道
var ch2 chan string // 声明一个传递字符串的通道
var ch3 chan struct{} // 声明一个传递结构体的通道
```

只声明而未初始化的 channel，其默认零值是 `nil`，此时是不能够被使用的，只有对它初始化后方可使用。使用 `make` 关键字初始化 channel，格式如下：

```go
make(chan 元素类型, [缓冲大小])
```

这个缓冲大小是可选的，其值是一个整型。所以我们可以这样定义 channel：

```go
ch1 := make(chan int) // 定义无缓冲的通道
ch2 := make(chan int, 1) // 定义一个缓冲区大小为 1 的通道
```

## channel 操作

channel 有三种操作：发送（send）、接收（receive）和关闭（close）。而发送和接收操作，都是使用 `<-` 符号来完成。

当 channel 变量在 `<-` 左边时，表示将右边的数发送到通道中，当 channel 变量在 `<-` 右边时，表示从通道中接收数据。例如：

```go
func main() {
	ch := make(chan int, 1) // 定义一个缓冲区大小为 1 的通道

	ch <- 3 // 将数字 3 发送到通道中

	n := <-ch // 从通道中接收数字并赋值给变量 n

	fmt.Println(n) // 输出：3

    // 如果不用变量接收值，也可以忽略接收值
    <- ch
}
```

使用 `close` 方法关闭通道：

```go
close(ch)
```

对已关闭的通道执行操作时，它的表现会有一些不同：

1. **对已关闭的通道再发送值会导致 panic**，如：

```go
ch := make(chan int, 2) // 为了证明不是缓冲大小导致的panic，这里设置缓冲大小为2
ch <- 3
close(ch)
// 由于已经关闭通道，再发送值会导致 panic
ch <- 4 // panic: send on closed channel
```

2. **对已关闭的通道进行接收，会一直获取值直到通道为空，此时再接收会得到对应类型的零值**，如：

```go
ch := make(chan int, 2)

ch <- 3
ch <- 4

close(ch)

fmt.Println(<-ch) // 3
fmt.Println(<-ch) // 4
fmt.Println(<-ch) // 0
fmt.Println(<-ch) // 0
```

3. **对已关闭的通道再次执行关闭，也会导致 panic**，如：

```go
ch := make(chan int, 1)
ch <- 3
close(ch) // 正常关闭通道
close(ch) // 再次关闭，导致panic: close of closed channel
```

## 无缓冲通道

**无缓冲通道**也叫阻塞的通道，使用 `make` 初始化 channel 时，不指定缓冲大小，即 `make(chan int)`，这样就创建了一个无缓冲的通道。

无缓冲通道的核心作用是通过强制同步机制来实现协程间的精准协作，特点就是要求发送和接收双方必须同时准备好，否则数据传递就会阻塞。其实也好理解，两个协程之间没有了缓冲区，数据的传递就需要两边同时做好准备。例如：

```go
ch := make(chan int)
ch <- 3  // fatal error: all goroutines are asleep - deadlock!
```

由于 `ch` 通道没有缓冲区，同时又没有接收者，所以 `3` 就无法被传递，导致程序死锁错误了。解决办法就是添加一个接收者，且必须在一个新的协程中添加接收者，代码：

```go

func main() {
	var wg sync.WaitGroup

	ch := make(chan int)

	wg.Add(1)
	// 创建一个 goroutine 从通道接收值
	go func() {
		defer wg.Done()
		ret := <-ch
		fmt.Printf("接收到值：%v\n", ret)
	}()

	ch <- 3 // 发送数据到通道中

	wg.Wait()
}
```

上面代码中，数据 `3` 被正确发送和接收，因为我们先创建了一个接收者，然后在数据发送时，接收者就已经准备好接收了。这里最重要的就是先创建的接收者必须要在一个新协程中，因为如果在同一协程中，不管是先接收还是先发送，都会导致程序阻塞，无法继续执行。

综上所述，**无缓冲通道**是同步的“桥梁”，适合实时数据的传递，避免延迟处理。

## 有缓冲通道

**有缓冲通道**顾名思义就是通道中有了缓冲区，就可以存放一些数据。使用 `make` 初始化 channel 时，只要指定了缓冲容量大于零，那么该通道就是有缓冲通道。

因为缓冲区的存在，可以允许收发存在时间差，是一个异步过程，能减少阻塞，更适合高频操作。但需要注意缓冲区满或者空时的操作，仍会发生阻塞。

有缓冲通道，只要通道有数据就可以随时接收。如：

```go
ch := make(chan int, 1)
ch <- 1
fmt.Println(<-ch) // 1
```

需要注意 2 个会发生阻塞的场景：

1. 当缓冲区满时，发送方阻塞；
2. 当缓冲区空时，接收方阻塞。

```go
ch1 := make(chan int, 1)
ch1 <- 1
ch1 <- 2 // 缓冲区已被填满，无法再发送，导致阻塞。

ch2 := make(chan int, 1)
ret := <- ch2 // 缓冲区为空，无法再接收，导致阻塞。
```

## 多返回值模式

通道支持多返回值模式，考虑到通道关闭了但还有值的情况，可以接收两个值，第一个值是通道的值，第二个值是通道是否关闭。如：

```go
value, ok := <- ch
```

其中：

- `value` ：从通道中取出的值，如果通道关闭则返回对应类型的零值。
- `ok` ：通道关闭也无值时，返回 `false`，否则返回 `true`。

例如：

```go
func main() {
	ch := make(chan int, 2)
	ch <- 1
	ch <- 2
	close(ch)

	for {
		v, ok := <-ch
		if !ok {
			fmt.Println("channel is closed")
			break
		}
		fmt.Println(v)
	}
}

// 运行结果：//
// 1
// 2
// channel is closed
```

## for range 接收值

可以使用 `for range` 循环从通道中接收值，当通道被关闭后，会在通道内的值全部被接收后自动退出循环。上面的例子可以改成如下：

```go
func main() {
	ch := make(chan int, 2)
	ch <- 1
	ch <- 2
	close(ch)

	for v := range ch {
		fmt.Println(v)
	}
}
```

## 单向通道

单向通道用于限制通道的操作权限，使其**仅支持发送或接收数据**。这种通过类型系统强制约束程序的行为可以提高代码的**安全性**和**可读性**。

单向通道分为两种类型：

- **发送通道（chan <- T）**：只能向通道发送数据，无法接收。
- **接收通道（<- chan T）**：只能从通道接收数据，无法发送。

箭头 `<-` 和关键字 `chan` 的相对位置表明了当前通道允许的操作。这里举例生产者和消费者的角色分工：

```go
package main

import "fmt"

// 生产者，仅发送数据
func producer(out chan<- int) {
	for i := 0; i < 3; i++ {
		out <- i
	}
	close(out)
}

// 发送者，仅接收数据
func consumer(in <-chan int) {
	for v := range in {
		fmt.Println(v)
	}
}

func main() {
	ch := make(chan int)
	go producer(ch)
	consumer(ch)
}
```

## select

`select` 关键字是专为并发编程设计的控制结构，主要用于在多个通道操作之间进行非阻塞选择，实现协程间的高效同步与通信。

说白了就是`select`可以同时监听多个通道的读写操作，当任意一个通道就绪（数据可读或可写）时，自动执行对应的 `case` 分支。没错，`select` 也是搭配 `case` 使用，与 `switch` 结构一样。

以下是一个简单的例子，从两个协程分别读取通道值：

```go
package main

import (
	"fmt"
	"time"
)

func g1(ch chan struct{}) {
	time.Sleep(1 * time.Second)
	ch <- struct{}{}
}

func g2(ch chan struct{}) {
	time.Sleep(2 * time.Second)
	ch <- struct{}{}
}

func main() {
	ch1 := make(chan struct{})
	ch2 := make(chan struct{})

	go g1(ch1)
	go g2(ch2)

	select {
	case <-ch1:
		fmt.Println("ch1")
	case <-ch2:
		fmt.Println("ch2")
	}
}

```

上例中打印结果永远是 `ch1`，因为 `g1` 执行时间更短，`ch1` 总是会先到达。而如果 `g1` 和 `g2` 内部的等待时间设为一致，即触发多个 `case` 同时就绪的情况，此时 `select` 会随机选择一个执行，而不会执行先 `case` 的 `ch1`，这样设定是为了避免“饥饿”，确保程序行为的不可预测性和公平性。

`select` 还支持 `default` 分支，当没有 `case` 分支就绪时，`default` 分支会执行，避免阻塞。例如：

```go
func main() {
	ch := make(chan int, 1)
	ch <- 1

	select {
	case ch <- 2:
		fmt.Println("发送成功")
	default:
		fmt.Println("通道已满")
	}
}
```

上例中，当通道 `ch` 满时，`default` 分支会执行，这样就可以检测通道状态。

但是使用 `default` 分支会带来另一个问题，就是永远只执行 `default` 分支了。有些场景中，比如获取请求响应，一般会有些耗时的，我们希望程序等待响应，但是又不想程序等不到结果而阻塞住，此时更适合的方式是加上超时处理，如下：

```go
package main

import (
	"fmt"
	"time"
)

func reponseData(ch chan struct{}) {
	time.Sleep(3 * time.Second)
	ch <- struct{}{}
}

func main() {
	ch := make(chan struct{})

	go reponseData(ch)

	select {
	case <-ch:
		fmt.Println("reponse success")
	case <-time.After(5 * time.Second): //  设置 5 秒超时
		fmt.Println("timeout")
	}
}

```

使用 `time.After()` 可以设置超时分支，程序中设置了 5 秒的超时，如果协程 `reponseData` 中响应时间超过 5 秒，则会执行超时分支，否则会获取响应。
