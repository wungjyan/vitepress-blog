---
title: Three.js 绘制点，线，面和自定义几何体
date: 2025-05-09T07:33:02.990Z
description: 介绍使用 Three.js 中的 BufferGeometry 来绘制点，线，面以及自定义几何体
categories: ['code']
---

Three.js 内置了很多几何体模型供我们使用，但其实我们完全可以自定义任何形状的几何体。
<!-- more -->

任何几何体都是从**点->线->面**组成，因此，我们只需要知道如何绘制点、线、面，然后就可以绘制任何形状了。所以先从点，线，面的绘制开始介绍。

## 绘制“点”
Three.js 中并没有提供直接绘制“点”的几何模型，但是我们可以通过 `BufferGeometry`来实现。`BufferGeometry`是 threejs 内置的一个核心类，所有内置的几何体都是基于它创建的。任何绘制的屏幕的画面，都是基于顶点开始的，而 `BufferGeometry`就是通过缓冲区来存储顶点数据的。

只要有了“点”，就可以组成线，面，自定义几何体了。创建“点“的方法如下：
```js
// 创建缓冲几何体
const geometry = new THREE.BufferGeometry()

// 使用 Float32Array 存储顶点数据， 顶点数据 3 个一组表示三维坐标
// 这是只创建三个点，一共 9 个顶点数据
const vertices = new Float32Array([
  0, 0, 0,
  100, 0, 0,
  0, 100, 0
])
// 给缓冲几何体设置顶点位置，参数 3 表示每个顶点都是一个三元组组成
geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))

// 创建点材质，size设置点大小，color设置点颜色   
const pointMaterial = new THREE.PointsMaterial({
  size: 10,
  color: 0xff0000
})

// 创建点对象
const points = new THREE.Points(geometry, pointMaterial)

// 加入场景中显示
scene.add(points)
```
代码中省略了一些必要的创建步骤，如创建场景、相机、渲染器等，只看关键的“点”绘制部分。最终效果如下：

![threejs-create-points.png](https://img.wjian.xyz/2025/threejs-create-points.png)

可以看到三个点都被正确绘制了。只是这里点的颜色都是统一设置了，我们可以为每一个点单独设置颜色，其实顶点数据也可以设置颜色，操作如下：
```js
const geometry = new THREE.BufferGeometry()

const vertices = new Float32Array([
  0, 0, 0,
  100, 0, 0,
  0, 100, 0
])

// 创建颜色数组，长度需要与顶点位置一一对应
const colors = new Float32Array([ // [!code ++]
  1, 0, 0, // 第一个点红色 // [!code ++]
  0, 1, 0, // 第二个点绿色 // [!code ++]
  0, 0, 1 // 第三个点蓝色 // [!code ++]
]) // [!code ++]

// 设置顶点颜色，同位置设置
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)) // [!code ++]

geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
const pointMaterial = new THREE.PointsMaterial({
  size: 10,
  // color: 0xff0000 // [!code --]
  vertexColors: true // 启用顶点颜色渲染 // [!code ++]
})
const points = new THREE.Points(geometry, pointMaterial)

scene.add(points)
```
效果如下：
![threejs-create-points-color.png](https://img.wjian.xyz/2025/threejs-create-points-color.png)

颜色取值范围 0～1，表示 RGB 的分量，更多的颜色可以多多尝试。

## 绘制“线”
了解了“点”的绘制，绘制“线”就简单了，只要点的数量大于1，然后把点与点之间连接起来，就有了“线”。我们直接拿上面绘制“点”的代码来修改，将”点“用线连接起来。如下：
```js
const geometry = new THREE.BufferGeometry()

const vertices = new Float32Array([
  0, 0, 0,
  100, 0, 0,
  0, 100, 0
])

// 创建颜色数组，长度需要与顶点位置一一对应
const colors = new Float32Array([ 
  1, 0, 0, // 第一个点红色 
  0, 1, 0, // 第二个点绿色 
  0, 0, 1 // 第三个点蓝色 
]) 

// 设置顶点颜色
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

// 设置顶点位置
geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))

// 创建线材质   
const lineMaterial = new THREE.LineBasicMaterial({ //[!code ++]
  color: 0xffffff //[!code ++]
}) //[!code ++]
// 创建线
const line = new THREE.Line(geometry, lineMaterial) //[!code ++]
// 加入场景
scene.add(line) //[!code ++]

// const pointMaterial = new THREE.PointsMaterial({ // [!code --]
//   size: 10, // [!code --]
//   vertexColors: true // 启用顶点颜色渲染 // [!code --]
// }) // [!code --]
// const points = new THREE.Points(geometry, pointMaterial) // [!code --]
// scene.add(points) // [!code --]
```
绘制“线”和“点”一样，只是把材质（替换成 `LineBasicMaterial`）和形状对象（用 `THREE.Line`）换了就行。把坐标系辅助去掉，看效果如下：

![threejs-create-line.png](https://img.wjian.xyz/2025/threejs-create-line.png)

发现线没有闭合起来，可以使用 `THREE.LineLoop` 来绘制首位相连的线：
```js
const line = new THREE.LineLoop(geometry, lineMaterial)
```
效果：

![threejs-create-line2.png](https://img.wjian.xyz/2025/threejs-create-line2.png)

此时你会发现，由于这三个点在一个平面上，然后线是闭合的，这已经绘制出一个“面”了。

## 绘制“面”
待续。