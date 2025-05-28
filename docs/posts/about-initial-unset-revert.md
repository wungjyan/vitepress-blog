---
title: CSS 属性值 initial、unset 和 revert 的区别
date: 2024-11-29
description: 介绍 CSS 属性值 initial、unset 和 revert 的区别。
categories: ['notes']
---

initial、unset 和 revert 都是 CSS 中用于控制属性值的全局关键字，它们都能重置属性值，但各自的作用机制和应用场景存在差异。

<!-- more -->

## initial
用于将属性值重置为 **CSS 规范中定义的初始值**（这个初始值不是浏览器的默认值，而是CSS规范的默认值）。

设置 `initial` 会**忽略继承和层叠规则**，直接采用规范定义的默认值。

例如 `color` 属性，如果元素设置为 `color: initial`，那么这个元素字体颜色就是黑色，这是 CSS 规范字体颜色的默认值。此时即使其父元素设置了颜色，也不会继承父元素的颜色值。

## unset
会根据属性的继承特性，自动选择`initial`还是`inherit`，`inherit`就是继承父元素的属性值。

如果一个属性是**可继承的**，如 color，font-family，那么设置 `unset` 等同于设置为 `inherit`。

如果一个属性是**不可继承的**，如 display，margin，那么设置 `unset` 等同于设置为 `initial`。

可以快速清除样式的同时保留合理的继承逻辑，可以设置 `all: unset`重置所有属性。

## revert
将属性值还原为**浏览器默认样式表**中的值。

一般浏览器会默认设置一些标签的样式，例如谷歌浏览器中就会给 a 标签设置：
```css
a:-webkit-any-link {
    color: -webkit-link;
    cursor: pointer;
    text-decoration: underline;
}
```
如果代码中 a 标签样式被全局修改了，而你又希望局部恢复到默认样式，就可以设置为:
```css
a {
    all: revert;
}
```

