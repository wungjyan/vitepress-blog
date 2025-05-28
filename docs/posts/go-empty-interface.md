---
title: Go 语言中空接口以及类型断言的使用
date: 2024-09-28T08:29:28.986Z
description: 解析Go语言空接口机制与类型断言实践：实现动态数据存储与安全类型转换，解决JSON解析与配置管理中的类型不确定性难题。
categories: ['notes']
---

## 空接口

Go 语言中空接口的表示方式是 `interface{}`，空接口是不包含任何方法签名的接口，因此所有类型都隐式实现了空接口。它最大的作用就是可以存储任意类型的值，可以理解为 TypeScript 中的 `any`。

作为一个前端开发，Go 中这种表示任意类型的方式让我觉得有些怪异，但它确实是很有用的。比如我想存储一组用户信息，但具体多少信息是不确定的，我希望可以无限被扩展，那我可以这样写：

```go
func main() {
	userInfo := make(map[string]interface{}) // 信息的值是可以任意类型的

	userInfo["name"] = "Tom"
    userInfo["isAdmin"] = true
	userInfo["age"] = 18
	userInfo["hobby"] = []string{"reading", "running"}
}
```

如果不使用空接口，那么我可能需要定义一个结构体来存储这些信息：

```go
type UserInfo struct {
	name    string
	isAdmin bool
	age     int
	hobby   []string
}

func main() {
	userInfo := UserInfo{
		name:    "Tom",
		isAdmin: true,
		age:     18,
		hobby:   []string{"reading", "running"},
	}
}
```

这样每当我想要新增一个字段，就需要去结构体中添加一个字段类型，虽说加类型不算什么大问题，但无法做到添加未知类型的字段。所以空接口的作用在这个场景下就体现出来了。其实空接口在 Go 标准库的源码中也是被大量使用的。

## 类型断言

说到空接口，那不得不提下类型断言，一些被定义为空接口的值，如果想要访问其身上的特定方法时，就必须要用到类型断言。

还是上面的例子，如果想要访问 `hobby` 中的第一个值，我们的直觉应该是通过索引去访问，如：

```go
func main() {
	userInfo := make(map[string]interface{})

	userInfo["hobby"] = []string{"reading", "running"}

    fmt.Println(userInfo["hobby"][0]) // 通过索引访问
}
```

但这样写是错误的，会报错 `invalid operation: cannot index userInfo["hobby"] (map index expression of type interface{})`。

其实仔细想想也很正常，`userInfo["hobby"]` 可能是任意一种类型的值，它不一定具备索引访问的特性。所以这里就需要用到类型断言，必须先断言出它的具体类型，才可以去访问它的值。

不过 Go 中的类型断言写法，也是让我觉得有点怪异，写法是 `n.(type)`，n 代表要断言的变量，type 代表断言的类型。如上我想要获取 `hobby` 中的第一个值，可以这样写：

```go
v, ok := userInfo["hobby"].([]string)
if ok {
    fmt.Println(v[0])
} else {
    fmt.Println("no hobby")
}
```

这样写可能看着有些繁琐，但确实能提高程序的健壮性，作为初学者，我只能去适应接受。
