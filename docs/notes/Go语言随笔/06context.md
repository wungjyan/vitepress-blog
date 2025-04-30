---
title: Go语言的Context
date: "2025-04-30"
---
`context` 是 Go 语言标准库中的一个包，作用是创建上下文对象来实现跨层级、跨协程的并发控制与消息传递。

## 方法介绍
`context` 提供了一些方法来创建上下文对象，分别有：
- `Background()`：创建根上下文（Root Context），是所有派生上下文的起点，**无超时、无取消、无数据**，通常用于主函数、初始化或测试中；
- `TODO()`：功能与 Background() 相同，但作为​**​占位符**​​，表示此处上下文需后续明确替换，常用于未确定具体实现的场景；
- `WithCancel(parent)`：基于父上下文生成一个​**​可手动取消**​​的子上下文，并返回取消函数 CancelFunc。调用 CancelFunc 会触发取消信号，终止关联的所有操作；
- `WithTimeout(parent, timeout)`：基于父上下文生成一个​**​有超时**​​的子上下文，基于**相对时间**设置超时（如3秒后超时），返回取消函数 CancelFunc，调用 CancelFunc 会触发取消信号，终止关联的所有操作；
- `WithDeadline(parent, deadline)`：基于父上下文生成一个​**​有超时**​​的子上下文，基于**绝对时间**设置超时（如2025年4月30日0点0分0秒后超时），返回取消函数 CancelFunc，调用 CancelFunc 会触发取消信号，终止关联的所有操作；
- `WithValue(parent, key, value)`：基于父上下文生成一个​**​携带数据**​​的子上下文，返回携带数据的子上下文，用于跨层级传递请求域信息（如用户ID、请求跟踪ID）。

## WithCancel 基本使用
有一个场景，就是主动结束子协程，首先看不用 `context` 时，我们会怎么实现。

**全局变量方式**

使用同一个全局变量的值变化，来实现结束消息传递：
```go
package main

import (
	"fmt"
	"sync"
	"time"
)

var wg sync.WaitGroup
var exit bool

func task() {
	for {
		fmt.Println("task")
		time.Sleep(time.Second)
		if exit {
			break
		}
	}
	wg.Done()
}
func main() {
	wg.Add(1)
	go task()
	time.Sleep(time.Second * 3) // 模拟业务逻辑耗时，避免程序退出过快
	exit = true                 // 设置exit为true，以控制子协程退出
	wg.Wait()
	fmt.Println("end")
}
```
这种方式比较简单，但有两个弊端：
1. 在跨包调用时使用全局变量不方便
2. `task` 中再启动协程，不好控制

**通道方式**

使用通道传递消息来实现结束消息传递：
```go
package main

import (
	"fmt"
	"sync"
	"time"
)

var wg sync.WaitGroup

func task(exitChan chan struct{}) {
	for {
		fmt.Println("task")
		time.Sleep(time.Second)
		select {
		case <-exitChan:
			fmt.Println("exit")
			wg.Done()
			return
		default:
		}
	}
}
func main() {
	exitChan := make(chan struct{}) // 无缓冲通道
	wg.Add(1)
	go task(exitChan)
	time.Sleep(time.Second * 3) // 模拟业务逻辑耗时，避免程序退出过快
	exitChan <- struct{}{}      // 给子协程发送退出信号
	close(exitChan)
	wg.Wait()
	fmt.Println("end")
}
```
这种方式的弊端是在跨包调用时需要维护一个共用的 channel。

**使用 context 上下文统一通知**

使用 `context` 上下文统一通知，只要将上下文传递到子协程中，就可以在外面统一取消，实现所有子协程的退出：
```go
package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

var wg sync.WaitGroup

func task(ctx context.Context, name string) {
	for {
		fmt.Printf("task: %s\n", name)
		time.Sleep(time.Second)
		select {
		case <-ctx.Done():
			fmt.Printf("task: %s done\n", name)
			wg.Done()
			return
		default:
		}
	}
}
func main() {
	ctx, cancel := context.WithCancel(context.Background()) // 创建一个带有取消功能的上下文
	wg.Add(2)
	go task(ctx, "task1")
	go task(ctx, "task2")
	time.Sleep(time.Second * 3) // 模拟业务逻辑耗时，避免程序退出过快
	cancel()                    // 统一通知，结束所有上下文中的子协程
	wg.Wait()
	fmt.Println("end")
}
```

## WithTimeout 超时取消
`context` 提供了 `WithTimeout()` 方法，可以创建一个带有超时的上下文，当超时时，会自动触发取消信号，终止关联的所有操作。

下面的案例，是模拟查询数据库，本需要 5 秒完成的任务，却设置了 3 秒超时，超时后，会自动触发取消信号，终止关联的所有操作。
```go
package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

var wg sync.WaitGroup

func queryDB(ctx context.Context) {
	for i := 0; i < 5; i++ {
		select {
		case <-ctx.Done():
			fmt.Println("查询超时取消了") // 超时被取消
			wg.Done()
			return
		default:
			fmt.Printf("第%d次查询...\n", i)
			time.Sleep(1 * time.Second) // 每次查询耗时1秒
		}
	}
}
func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second) // 设置超时上下文，超时时间为3秒
	defer cancel() // 确保最后能取消
	wg.Add(1)
	go queryDB(ctx)
	wg.Wait()
}
```

## 未完待续