---
title: Go 语言defer详解
date: 2025-03-24T06:33:20.797Z
description: 详解Go语言defer机制：涵盖延迟执行顺序、参数预计算、返回值修改，解决资源管理与错误处理难题，提升代码健壮性与可维护性。
categories: ['notes']
---

Go 中的 `defer` 是一种延迟执行机制，用于在函数返回前执行特定操作。它在资源管理、错误处理和性能调试等场景中具有重要作用。本文详细记录 `defer` 的用法。

<!-- more -->

## 基本用法

`defer` 的使用方法很简单，放在要执行的操作之前即可，会在函数返回前执行，如：

```go
func main() {
	defer fmt.Print("我是defer执行～")
	fmt.Println("我是main函数")

    // 执行结果
    // 我是main函数
    // 我是defer执行～
}
```

注意 `defer` 后面要接的是一个函数调用，如下代码：

```go
func main() {
    // 错误，这里应该是函数调用
	// defer func(){
	// 	fmt.Print("defer")
	// }

    // 修改为函数调用
    defer func() {
	    fmt.Print("defer")
	}()

	fmt.Print("main")
}
```

## 执行顺序

多个 `defer`语句按**后进先出（LIFO）** 的顺序执行：

```go
func main() {
	defer fmt.Println(1)
	defer fmt.Println(2)
	defer fmt.Println(3)
	fmt.Println("main")

    // 执行结果
    // main
    // 3
    // 2
    // 1
}
```

循环 defer，遵循**后进先出**原则：

```go
func main() {
	for i := 0; i < 5; i++ {
		defer fmt.Println(i)
	}

    // 执行结果
    // 4
    // 3
    // 2
    // 1
    // 0
}
```

## 参数预计算

`defer` 执行方法的参数，在声明时即被固定，无法执行时动态取值，如：

```go
func main() {
	n := 10
	defer fmt.Println(n) // 10
	n = 20
}
```

代码 `fmt.Println(n)` 的 `n`在 `defer` 声明时已经固定为了 10，即使后面修改了值，也无法改变 `defer` 的执行结果。若需要动态取值，可以使用闭包：

```go
func main() {
	n := 10
	defer func() {
		fmt.Println(n) // 20
	}()
	n = 20
}
```

## 修改返回值

注意 `defer` 可以修改命名返回值，会影响最终结果：

```go
func getNum() (x int) {
	defer func() { x++ }()
	return 1
}

func main() {
	fmt.Print(getNum()) // 2
}
```

代码中一个误区就是以为 `return 1` 之前执行 `defer`，其实是先将 `x` 赋值为 1，再执行 `defer`，所以 `x` 的值是 2。`getNum`代码等价以下形式：

```go
func getNum() (x int) {
	x = 1
	func() { x++ }()
	return
}
```

## 场景案例

### 资源释放

在资源管理场景中，`defer` 可以用于释放资源，如文件、数据库连接等，避免内存泄漏。如：

```go
func readFile() error {
	file, _ := os.Open("test.txt")
	defer file.Close() // 这里用defer延迟关闭，一目了然

    // 下面执行文件操作
}
```

### 错误处理

`defer` 可以结合 `recover` 捕获 `panic`：

```go
func main() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("捕获异常:", r) // 捕获异常: panic~
		}
	}()

	panic("panic~") // 这里主动 panic
}
```

### 性能分析

记录函数执行时间或调试信息：

```go
func main() {
	start := time.Now()

	defer func() {
		fmt.Printf("程序执行时间：%v\n", time.Since(start))
	}()

	time.Sleep(1 * time.Second)
}
```
