---
title: Go 语言互斥锁与读写锁
date: 2025-03-25T06:18:41.010Z
description: 解析Go语言互斥锁与读写锁机制：区分写排他/读并行场景，解决数据竞争与性能瓶颈，优化高并发程序在读写密集型任务中的执行效率。
category: "代码笔记"
tags: ["Go"]
---

Go 语言中“锁”的作用是**保护共享资源**。当多个协程（goroutine）同一时间访问（或修改）同一个数据资源时，会出现数据竞争的问题，导致最终获取的效果与期望不一致。所以需要一把“锁”，锁住这个数据，让它同一时刻只能被一个协程访问（或修改）。

<!-- more -->

Go 语言中提供了两种锁：互斥锁（Mutex）和读写锁（RWMutex）。本文主要介绍一下这两种锁机制的应用。阅读本文前需要先了解 Go 协程的知识。

## 互斥锁（Mutex）

“互斥”的意思是**协程之间对共享资源的独占访问控制**，一旦某个协程获取锁，其他尝试获取锁的协程会被阻塞，直到锁被释放。

用简单的算术例子来演示一下锁的作用。首先看下面代码场景，循环 1000 个协程对变量 `num` 进行累加，运行代码后，会发现最后的输出结果不一定是 1000，且每次运行结果都不一样。

```go
package main

import (
	"fmt"
)

var (
	num int
	wg  sync.WaitGroup
)

func add() {
	num += 1
	wg.Done()
}

func main() {
	wg.Add(1000)
	for i := 0; i < 1000; i++ {
		go add()
	}

	wg.Wait()
	fmt.Print(num)
}
```

此例子就是并发数据竞争导致的结果，多个协程同时修改共享变量 `num`时没有进行同步保护。就比如两个协程同时读取到 `num=100`，各自加 1 后都写回 101，实际只增加了一次。我们可以使用 `-race` 参数来运行代码来检测数据竞争：

```bash
// 使用 -race 参数来运行代码
go run -race main.go
```

会输出类似下面这样的结果：

```bash
==================
WARNING: DATA RACE
Read at 0x000100802e10 by goroutine 10:
  main.add()
      /Users/wungjyan/self/goDemo/main.go:14 +0x28

Previous write at 0x000100802e10 by goroutine 6:
  main.add()
      /Users/wungjyan/self/goDemo/main.go:14 +0x40

Goroutine 10 (running) created at:
  main.main()
      /Users/wungjyan/self/goDemo/main.go:21 +0x44

Goroutine 6 (finished) created at:
  main.main()
      /Users/wungjyan/self/goDemo/main.go:21 +0x44
==================
```

这就表示发生了**数据竞争（DATA RACE）**，代码第 14 行处，goroutine 10 进行了“读”，而 goroutine 6 进行了“写”，两个操作针对同一内存地址 `0x000100802e10`，对应代码中的共享变量 `num`。

针对这个场景，就要使用互斥锁来解决了。互斥锁需要引入包 `sync`，并使用 `sync.Mutex` 类型来创建锁，提供了两个方法：`Lock()` 和 `Unlock()`，分别用来获取锁和释放锁。使用很简单，来修改下代码，加上锁机制：

```go
package main

import (
	"fmt"
	"sync"
)

var (
	num int
	wg  sync.WaitGroup
	mu  sync.Mutex // 定义全局锁
)

func add() {
	mu.Lock()         // 加锁
	defer mu.Unlock() // defer 延迟解锁
	num += 1
    // mu.Unlock() // 如果不用 defer，在这里解锁是一样的
	wg.Done()
}

func main() {
	wg.Add(1000)
	for i := 0; i < 1000; i++ {
		go add()
	}

	wg.Wait()
	fmt.Print(num)
}
```

如代码中的注释，简单就加上了锁，现在再运行代码，结果永远是输出 1000。我们用锁来保护 `num += 1` 这个操作，当多个协程访问时，只允许一个协程持有锁，其他协程被阻塞，直到锁被释放再继续让下一个协程获取锁，这样来保证了结果的正确计算。

说到这里，我想到了一个问题，既然锁会让协程阻塞，那是否就是去了协程多并发的优势？上面这个例子只是为了演示锁的作用，如果不使用协程和锁，程序计算其实要快得多。实际开发的场景，应该是要综合考虑，平衡执行效率，本文就不多探究了。

## 读写锁（RWMutex）

**读写锁**，也可以说是“读写互斥锁”，本质是区分了“写锁”和“读锁”。为什么要区分呢？上面说到的互斥锁，是完全互斥的，但实际场景是读多写少的场景多，当我们并发去读取一个资源而不修改资源时，是没有必要加互斥锁的，因为读操作本身是线程安全的，不管同时多少个“读”，获取的结果是一样的。

而读写锁的优势就是，当协程获取到读锁后，其他的协如果是获取读锁则继续获得锁，如果是获取写锁就会等待；当一个协程获取写锁后，其他的协程无论是获取读锁还是写锁都会等待。总结就是：

- **读读不互斥**，多个协程同时获取读锁，无阻塞并行执行；
- **读写互斥**，读时禁止写，写时禁止读；
- **写写互斥**，写操作串行执行，保证数据一致性。

读写锁使用 `sync.RWMutex` 类型来创建锁，包含四个方法：

- `Lock()`：获取写锁；
- `Unlock()`：释放写锁；
- `RLock()`：获取读锁；
- `RUnlock()`：释放读锁。

读写锁的使用方式和互斥锁的使用基本一致，为了证明在“读多写少”的场景下，读写锁更具性能优势，我参考了网上一段测试代码，同样的逻辑，使用互斥锁和读写锁分别测试耗时，代码如下：

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

var (
	num  int
	wg   sync.WaitGroup
	mu   sync.Mutex
	rwMu sync.RWMutex
)

// 使用互斥锁的 写操作
func writeWithLock() {
	mu.Lock()
	defer mu.Unlock()
	num += 1
	time.Sleep(10 * time.Millisecond) // 假设写操作耗时 10 毫秒
	wg.Done()
}

// 使用互斥锁的 读操作
func readWithLock() {
	mu.Lock()
	defer mu.Unlock()
	_ = num                      // 显示读操作
	time.Sleep(time.Millisecond) // 假设写操作耗时 1 毫秒
	wg.Done()
}

// 使用读写锁的 写操作
func writeWithRWLock() {
	rwMu.Lock()         // 加写锁
	defer rwMu.Unlock() // 释放写锁
	num += 1
	time.Sleep(10 * time.Millisecond) // 假设写操作耗时 10 毫秒
	wg.Done()
}

// 使用读写锁的 读操作
func readWithRWLock() {
	rwMu.RLock()                 // 加读锁
	defer rwMu.RUnlock()         // 释放读锁
	_ = num                      // 显示读操作
	time.Sleep(time.Millisecond) // 假设写操作耗时 1 毫秒
	wg.Done()

}

func runTest(wf, rf func(), wc, rc int) {
	start := time.Now()
	defer func() {
		fmt.Printf("程序耗时： %v\n", time.Since(start))
	}()

	// 循环 wc 个写操作协程
	for i := 0; i < wc; i++ {
		wg.Add(1)
		go wf()
	}

	// 循环 rc 个读操作协程
	for i := 0; i < rc; i++ {
		wg.Add(1)
		go rf()
	}

	wg.Wait()

}

func main() {
	// 互斥锁，10个写，1000个读
	// runTest(writeWithLock, readWithLock, 10, 1000)  // 程序耗时： 1.255126125s

	// 读写锁，10个写，1000个读
	runTest(writeWithRWLock, readWithRWLock, 10, 1000) // 程序耗时： 109.684875ms
}

```

从上面代码的测试结果中，不难看出，在读多写少的场景下（读的单位耗时一般比写的单位耗时少），读写锁比互斥锁的性能高很多。可以修改这段代码来测试，如果读操作和写操作数量级差别不大，那么测试结果的差距则不明显。

## 总结

本文简单介绍了一下**互斥锁**和**读写锁**的区别和使用方式，它们的特性与使用场景总结如下：

- **互斥锁**：
  - **完全排他**：无论是读还是写操作，同一时间只允许一个协程持有锁。
  - **简单直接**：无需区分操作类型，直接加锁/解锁。
  - **适用场景**：主要适用写操作频繁的场景（写占比超过 20%），如实时日志写入。
- **读写锁**：
  - ​**读并行，写排他**：允许多个读协程同时持有锁，但写锁完全排他。
  - **​ 性能优势**：在读多写少的场景下，显著减少锁竞争。
  - **适用场景**：适合读操作远多于写操作的场景（读占比超过 90%），如数据库查询。
