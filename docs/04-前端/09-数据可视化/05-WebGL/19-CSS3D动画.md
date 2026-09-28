---
title: CSS3D动画
description: "前面介绍了 3D 变换的原理和算法实现，并通过一些简单的 demo 演示了变换效果，但这些 demo 都是使用 WebGL 技术渲染。本节暂时不使用 WebGL，而是改用前端同学最熟悉的 CSS 技术来实现 3D 效果，并进一步了解 CSS 中的 3D 属性和 WebGL 中 3D 概念的异同之处。"
keywords: [CSS3D动画]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---


# CSS3D动画

> 本篇涵盖第 24-26 章，从 CSS transform 到 perspective 再到数学库集成，完整讲解 CSS 3D 动画技术。

## 目录

- [第 24 章：CSS 与 3D 之 transform](#第-24-章css-与-3d-之-transform)
- [第 25 章：CSS 与 3D 之 perspective](#第-25-章css-与-3d-之-perspective)
- [第 26 章：数学库在 CSS 的 3D 动画中扮演的重要角色](#第-26-章数学库在-css-的-3d-动画中扮演的重要角色)

---

## 第 24 章：CSS 与 3D 之 transform

前面介绍了 3D 变换的原理和算法实现，并通过一些简单的 demo 演示了变换效果，但这些 demo 都是使用 WebGL 技术渲染。本节暂时不使用 WebGL，而是改用前端同学最熟悉的 CSS 技术来实现 3D 效果，并进一步了解 CSS 中的 3D 属性和 WebGL 中 3D 概念的异同之处。

### CSS 中的 3D 属性

下面是 CSS3 中的几个很重要的 3D 属性：

- transform：对 DOM 进行变换，相当于 WebGL 中对模型进行的变换。
- transform-origin：设置变换的中心点。
- perspective-origin：视点，相当于 WebGL 中摄像机的 X、Y 轴坐标。
- perspective：视距，启用该属性相当于在 WebGL 中设置摄像机和 DOM 元素之间在 Z 轴方向上的距离，设置该属性不等于 0 时会自动启用透视投影效果。
- transform-style：是否启用 3D 变换。
- backface-visibility：背面是否可见。

本节主要讲述 CSS 中的变换属性`transform`，变换分为`基本变换`和`矩阵变换`，基本变换大家都比较熟悉了，本节不做过多介绍，我们主要介绍`矩阵变换`和`组合变换`。

#### 变换：transform

`transform` 是大家最常用的一个属性，我们经常会使用它实现一像素的边框和以及容器或者内容的水平、垂直居中，又或者利用它实现强制 GPU 渲染，提升动画性能。

transform 分为 2D 和 3D 变换，3D 变换只是在 2D 的基础上增加了 Z 轴方向的变换。

一般情况下，如果对一个 DOM 施加变换，那么变换的中心往往是 DOM 的中心位置，类比到 WebGL 中，也就是模型的中心，我们可以把 CSS 中的 DOM 看做 WebGL 中的模型。

transform 包含四个基本变换属性值：`translate`、`rotate`、`skew`、`scale`，对应的 3D 变换属性值为 `translate3d`、`rotate3d`、`scale3d`。

> 注意，skew 没有对应的 3D 变换设置。

基本变换大家应该都很熟悉了，后面重点要讲解的是 `matrix` 、`matrix3d`的计算与使用，以及`组合变换`的使用技巧。

当然，下面我们还是先回顾一下 `transform` 的基本用法。

##### 平移

平移的使用方法：

- translate(tx, ty)
- translate3d(tx, ty, tz)
- translateX(tx)
- translateY(ty)
- translateZ(tz)

将 dom 元素分别沿着 X、Y、Z 轴向平移 30 px。

```
/* 分别沿 X 轴和 Y 轴平移 30 px。*/
transform: translate(30px, 30px);
/* 分别沿 X 轴、 Y 轴、Z 轴平移 30 px。*/
transform: translate3d(30px, 30px, 30px);
/* 沿 X 轴平移 30 px。*/
transform: translateX(30px);
/* 沿 Y 轴平移 30 px。*/
transform: translateY(30px);
/* 沿 Z 轴平移 30 px。*/
transform: translateZ(30px);
```

##### 旋转

旋转用法也比较简单，在此不做过多描述。

- rotate(angle)，绕 Z 轴旋转。
- rotate3d(x, y, z, angle)。绕轴`axis = {x:x, y:y, z:z}`旋转指定角度`angle`。
- rotateX(angle)，绕 X 轴旋转。
- rotateY(angle)，绕 Y 轴旋转。
- rotateZ(angle)，绕 Z 轴旋转。

```
/*绕 Z 轴旋转 45 deg。*/
transform: rotate(45deg);
/* 将第一个参数设置为 1， 代表绕 X 轴旋转 45 deg。*/
transform: rotate3d(1, 0, 0, 45deg);
/* 将第二个参数设置为 1， 代表绕 Y 轴旋转 45 deg。*/
transform: rotate3d(0, 1, 0, 45deg);
/* 将第三个参数设置为 1， 代表绕 Z 轴旋转 45 deg。*/
transform: rotate3d(0, 0, 1, 45deg);
/* 使用 rotateZ 绕 Z 轴旋转 45 deg。*/
transform: rotateZ(45deg);
```

###### 绕任意轴的旋转。

关于旋转，我想说明一下`rotate3d` 的使用方式，它接收一个`轴向量`和一个`角度`，代表绕`轴向量`旋转某个`角度`。

举个例子来说，我们想让模型绕轴 axis= {x: 1,y: 1,z: 1}进行旋转，那么用rotate3d表示如下：

```
.box{
 animation: rotate 3s infinite linear;
}
@keyframes rotate{
 0% {
 transform:rotate3d(1, 1, 1, 0deg);
 }
 100% {
 transform:rotate3d(1, 1, 1, 360deg);
 }
}
```

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20181210167974020596bd07~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

###### 变换参照点 transform-origin

根据上图的例子，你会发现，默认的旋转是绕着模型的中心位置进行的，这个位置是浏览器默认的。但事实上，CSS 仍然提供了对变换中心的设置功能，通过设置 `transform-origin` 来实现。

- transform-origin 包含 X、Y、Z 轴坐标的设置。
- transform-origin 接收百分比数值时，是以自身尺寸为基准的。

比如，我们让一个 DOM 元素沿着上边沿进行旋转，只需要将 transform-origin 的 Y 轴分量设置为 0% 或者 0 即可。

```
transform-origin: 50% 0%;
transform: rotateX(90deg);
```

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets2018121016797ac6ac7cad17~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

这个概念比较简单，但是很灵活。利用它我们能实现很多有意思的 3D 效果，比如 CSS 版的`魔方`。

#### 缩放

缩放的使用方法也很简单。

- scale(sx, sy)，沿 X 轴方向缩放 sx 倍，沿 Y 轴方向缩放 sy 倍。
- scale(sx)，沿 X 轴方向和 Y 轴方向缩放 sx 倍。
- scale3d(sx, sy, sz)，分别沿 X、Y、Z 轴方向缩放 sx、sy、sz 倍。
- scaleX(sx)，沿 X 轴方向缩放 sx 倍。
- scaleY(sy)，沿 Y 轴方向缩放 sy 倍。

代码示例：

```
/* 沿 X 轴和 Y 轴 放大两倍。*/
transform: scale(2);
/* 沿 X 轴方向放大 3 倍，沿 Y 轴方向放大 2 倍。*/
transform: scale(3, 2);
/* 分别在 X 、Y、 Z 轴方向放大 2倍、3倍、4倍。*/
transform: scale3d(2, 3, 4);
/* 在 X 轴方向放大两倍。*/
transform: scaleX(2);
/* 在 Y 轴方向放大两倍。*/
transform: scaleY(2);
```

#### 斜切

斜切的使用方法：

- skew(xAngle, yAngle)，DOM 元素沿着 X 方向切变 xAngle 度，沿 Y 轴方向切变 yAngle 度。
- skewX(xAngle)，沿 X 轴方向切变 xAngle 度。
- skewY(yAngle)，沿 Y 轴方向切变 yAngle 度。

斜切可以理解为将 DOM 元素沿 X 轴或者 Y 轴拉伸，切变会改变物体的形状。

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets2018126167817da6a38183a~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

代码示例：

```
/* 沿 X 轴切变 30 度。*/
transform: skew(30deg);
/* 沿 X 轴切变 30 度，沿 Y 轴切变 40 度。*/
transform: skew(30deg, 40deg);
/* 沿 X 轴方向切变 30 度。*/
transform: skewX(30deg);
/* 沿 Y 轴方向切变 40 度。*/
transform: skewY(40deg);
```

以上就是 `transform` 的常见用法，接下来我们开始讲重点了：`组合变换`和 `matrix`

#### 组合变换

`组合变换`就是在 transform 的属性值中附加多个变换效果，而不只是单一的变换。

比如下面这个变换样式：

```
transform: rotateX(60deg) rotateY(60deg);
```

这个样式的作用是先让 DOM 元素绕着 X 轴旋转 60 度，注意此时 DOM 元素的坐标系改变了，再绕变换后的坐标系的 Y 轴旋转 60 度。

需要谨记的是：

- transform 后的多个变换要用空格分开。
- 从前往后理解这些变换，后一个变换都是基于前一个变换后的新坐标系进行，也称`动态坐标系变换`。
- 从后往前理解，每一个变换都是按照 DOM 元素最开始的坐标轴（可以理解为世界坐标系）进行，也称为`静态坐标系变换`。

至于多个变换是基于动态坐标系进行构思，还是基于静态的世界坐标系进行构思，取决于每个人的理解习惯，但最终的变换效果都是一样的。

> 在欧拉角章节我们也讲过了多个矩阵相乘时，从前往后和从后往前理解变换所基于的坐标系是不同的。transform 多个变换理解顺序和前面所讲的保持一致。

再举个比较明显的例子，我们先让 DOM 旋转 60 度，然后将其沿 X 轴平移 200 像素，大家觉得 DOM 会按照怎样的轨迹变换？

我们看一下：

```
transform: rotateX(60deg) translateX(200px);
```

为了更方便观察 3D 组合变换的效果，我将图片外层容器的`视点`设置在了右上方：

```
.imgWrapper{
 perspective: 300px;
 margin-top:300px;
 position: relative;
 perspective-origin: 100% -100px;
}
```

关于视点 `perspective-origin` 和 视距 `perspective` 我们放在下一节讲述。

##### 从前往后理解变换，需要按照`模型坐标系`理解：

下图，白色坐标轴是图片默认的坐标系，当图片绕 X 轴旋转 60 度后，坐标系变成红色坐标轴的指向。

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20181261678241bcd2eb3a7~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

接着沿当前图片坐标系的红色 X' 轴平移 200 像素，此时，应该朝向屏幕里侧和右侧移动。

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201812616782469359b66e3~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

##### 从后往前理解多个变换，需按照世界坐标系理解

请注意，`CSS` 中的`世界坐标系`就是 施加变换的 DOM 节点（本例为图片）最开始的坐标系，即图中的白色坐标轴。

- 首先沿着 X 轴平移 200 像素。
- 接着绕世界坐标系的 X 轴旋转 60 度。

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201812616782664ef6d8d2e~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

可以看出，无论我们按照哪种坐标系理解，最终变换效果都是一样的，看下图：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201812616782681da82aeb6~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

这就是`组合变换`要注意的地方，了解了组合变换的规律，我们才能做出很有意思的特效，比如照片墙：

照片墙的核心原理就是先将图片沿着 Z 轴方向移动一定距离，之后绕世界坐标系的Y 轴旋转指定角度。

```
transform: rotateY(30deg) translateZ(200px);
```

当然，这只是核心原理，事实上我们还需要做如下几步：

- 让图片能够显示出 3D 效果，这一步需要让图片父容器的 `transform-style` 属性设置为 `preserve-3d`。
- 为父容器加上透视属性`perspective`，设置为透视投影，并调整合适的视距 ，这样才能实现近大远小的效果。

这几个属性我们下节细讲，先贴下照片墙的效果：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201812416778c9cd6a5b210~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

具体的实现我们在讲视点和视距属性时再分析。

又比如 3D 盒效果：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201812616783e9b138a5848~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

这是一个立方体盒子，每个面上都对应一张图片，当然，你也可以根据自己的需要往各个面上放置自己的内容。

立方体盒子的原理也是利用组合变换实现的：

- 前面：沿着 Z 轴往前（朝向屏幕外）平移指定像素。
- 后面，沿着 Z 轴往后（朝向屏幕里）平移指定像素。
- 上面，沿着 Y 轴往上平移，接着绕 X 轴旋转 90 度。
- 下面，沿着 Y 轴往下平移，接着绕 X 轴旋转 90 度。
- 左面，沿着 X 轴往左平移，接着绕 Y 轴旋转 90 度。
- 右面，沿着 X 轴往右平移，接着绕 Y 轴旋转 90 度。

当然，为了实现 3D 效果，也要在图片的父容器上设置 `transform-style` 为 `preserve-3d` 才可以。

这里主要展示组合变换顺序的理解与强大，不对实现做分析，`实现过程`留在下一节和`视点`以及`视距`一起介绍。

我们还是先把变换讲完，接下来介绍 `transform` 的另一个重要用法，`matrix` 和 `matrix3d`。

#### matrix

transform 除了提供一些基本变换，还提供了 `matrix` 和 `matrix3d` 属性值，这两个属性值是做什么的呢？

`matrix` 是矩阵的意思，transform 是变换属性，所以 matrix 就是对 DOM 执行变换的矩阵，这和我们前面讲的 WebGL 的变换矩阵概念相同。

根据前面的学习，我们知道 2 维平面的变换矩阵，是一个 3 阶矩阵，包含 9 个数字：

![\begin{aligned}
\begin{pmatrix}
x0 & y0 & tx \\\
x1 & y1 & ty \\\
0 & 0 & 1
\end{pmatrix}
\end{aligned}](https://juejin.cn/equation?tex=%5Cbegin%7Baligned%7D%0A%5Cbegin%7Bpmatrix%7D%0Ax0%20%26%20y0%20%26%20tx%20%5C%5C%5C%0Ax1%20%26%20y1%20%26%20ty%20%5C%5C%5C%0A0%20%26%200%20%26%201%0A%5Cend%7Bpmatrix%7D%0A%5Cend%7Baligned%7D)

按照我们之前章节坐标系变换的原理分析：

- x0、x1 代表变换之后的 X 轴基向量在原坐标系中的表示。
- y0、y1 代表变换之后的 Y 轴基向量在原坐标系中的表示。
- tx、ty 代表坐标原点的偏移量。

如果没有看之前章节的话，可能不太理解基向量的含义以及坐标系的概念，大家可以去看一下，理解一下坐标系变换的原理。

你会看到第三行的数值是固定的`0 0 1`，所以，浏览器为了简化赋值，规定 transform 中的 matrix 只接受 3 阶矩阵的前两行参数，共 6 个数字。

请记住，matrix 的参数顺序对应上面的矩阵元素如下：

```
transform: matrix(x0, x1, y0, y1, tx, ty);
```

前面章节我们推导过基本变换的矩阵表示：

- 平移

沿 X 轴平移 tx 像素，沿 Y 轴平移 ty 像素：

![\begin{aligned}
\begin{pmatrix}
1 & 0 & tx \\\
0 & 1 & ty \\\
0 & 0 & 1
\end{pmatrix}
\end{aligned}](https://juejin.cn/equation?tex=%5Cbegin%7Baligned%7D%0A%5Cbegin%7Bpmatrix%7D%0A1%20%26%200%20%26%20tx%20%5C%5C%5C%0A0%20%26%201%20%26%20ty%20%5C%5C%5C%0A0%20%26%200%20%26%201%0A%5Cend%7Bpmatrix%7D%0A%5Cend%7Baligned%7D)

- 缩放

沿 X 轴方向缩放 sx 倍， 沿 Y 轴缩放 sy 倍：

![\begin{aligned}
\begin{pmatrix}
sx & 0 & 0 \\\
0 & sy & 0 \\\
0 & 0 & 1
\end{pmatrix}
\end{aligned}](https://juejin.cn/equation?tex=%5Cbegin%7Baligned%7D%0A%5Cbegin%7Bpmatrix%7D%0Asx%20%26%200%20%26%200%20%5C%5C%5C%0A0%20%26%20sy%20%26%200%20%5C%5C%5C%0A0%20%26%200%20%26%201%0A%5Cend%7Bpmatrix%7D%0A%5Cend%7Baligned%7D)

也就是说基本变换我们都可以用 `matrix` 来表示。

- 斜切
  沿着 X 轴倾斜 α 度，沿着 Y 轴倾斜 θ 度：

![\begin{aligned}
\begin{pmatrix}
1 & tan\alpha & 0 \\\
tan\theta & 1 & 0 \\\
0 & 0 & 1
\end{pmatrix}
\end{aligned}](https://juejin.cn/equation?tex=%5Cbegin%7Baligned%7D%0A%5Cbegin%7Bpmatrix%7D%0A1%20%26%20tan%5Calpha%20%26%200%20%5C%5C%5C%0Atan%5Ctheta%20%26%201%20%26%200%20%5C%5C%5C%0A0%20%26%200%20%26%201%0A%5Cend%7Bpmatrix%7D%0A%5Cend%7Baligned%7D)

- 旋转

绕 Z 轴旋转 θ 角度：

![\begin{aligned}
\begin{pmatrix}
cos\theta & -sin\theta & 0 \\\
sin\theta & cos\theta & 0 \\\
0 & 0 & 1
\end{pmatrix}
\end{aligned}](https://juejin.cn/equation?tex=%5Cbegin%7Baligned%7D%0A%5Cbegin%7Bpmatrix%7D%0Acos%5Ctheta%20%26%20-sin%5Ctheta%20%26%200%20%5C%5C%5C%0Asin%5Ctheta%20%26%20cos%5Ctheta%20%26%200%20%5C%5C%5C%0A0%20%26%200%20%26%201%0A%5Cend%7Bpmatrix%7D%0A%5Cend%7Baligned%7D)

- 绕 Z 轴旋转 60 度。

用 rotateZ 表示上面的旋转很简单，我们看下用 matrix 如何表示：

![cos(60) = 0.5](https://juejin.cn/equation?tex=cos(60)%20%3D%200.5)

![sin60 = \frac{\sqrt3}{2} = 0.866（约等）](https://juejin.cn/equation?tex=sin60%20%3D%20%5Cfrac%7B%5Csqrt3%7D%7B2%7D%20%3D%200.866%EF%BC%88%E7%BA%A6%E7%AD%89%EF%BC%89)

将这两个数字代入 matrix 公式，得出变换样式为：

```
transform: matrix(0.5, 0.866, -0.866, 0.5, 0, 0);
```

你会发现无论我们是用 rotateZ 表示，还是用 matrix 表示，变换效果都是一样的。

#### matrix3d

matrix3d，顾名思义，代表 3 维变换，它是一个 4 阶矩阵，需要 16 个数字来表示。

![\begin{aligned}
\begin{pmatrix}
x0 & y0 & z0 & tx \\\
x1 & y1 & z1 & ty \\\
x2 & y2 & z2 & tz \\\
0 & 0 & 0 & 1
\end{pmatrix}
\end{aligned}](https://juejin.cn/equation?tex=%5Cbegin%7Baligned%7D%0A%5Cbegin%7Bpmatrix%7D%0Ax0%20%26%20y0%20%26%20z0%20%26%20tx%20%5C%5C%5C%0Ax1%20%26%20y1%20%26%20z1%20%26%20ty%20%5C%5C%5C%0Ax2%20%26%20y2%20%26%20z2%20%26%20tz%20%5C%5C%5C%0A0%20%26%200%20%26%200%20%26%201%0A%5Cend%7Bpmatrix%7D%0A%5Cend%7Baligned%7D)

可以看到，每一个基向量都增加了一个 Z 轴方向分量 x2、y2、z2、tz。

事实上，3D 的基本变换都可以用 matrix 或者 matrix3d 来表示，但是一些复杂变换只能使用 matrix 或者 matrix3d 来实现。

#### matrix 对我们来说有什么用呢？

这是一个很关键的问题，大家会觉得，基本变换的用法更容易理解，更方便书写，matrix 需要的参数太多，而且参数值需要计算，更糟糕的是，我们往往不知道怎么计算，那 matrix 有什么用呢？

这是个好问题，但我想说的是 matrix 能完成基本变换不能完成的变换，能做出基本变换完成不了的效果。

这时你就该考虑使用 matrix 了。

紧跟而来的问题是，matrix 如何求得呢？

我们前面章节讲述了 matrix 矩阵的求法，一旦你确定了需要的变换，你就可以计算变换后的基向量，然后将基向量的各个分量代入矩阵的各个位置即可求出变换矩阵，有了变换矩阵，也就有了 matrix 所需要的各个元素，将矩阵转化成 matrix 或者 matrix3d 所需要的字符串就轻而易举了。

- 镜像效果

镜像效果，采用基本变换是实现不了的，只能借助于矩阵。
比如左右镜像，左右镜像无非就是 Y 轴基向量不变，X 轴坐标对调，原坐标与新坐标关系如下：

![\begin{aligned}
x^{'} &= -x \\\
y^{'} &= y
\end{aligned}](https://juejin.cn/equation?tex=%5Cbegin%7Baligned%7D%0Ax%5E%7B'%7D%20%26%3D%20-x%20%5C%5C%5C%0Ay%5E%7B'%7D%20%26%3D%20y%0A%5Cend%7Baligned%7D)

所以有：

![\begin{aligned}
x0 &= -1 \\\
x1 &= 0 \\\
y0 &= 0 \\\
y1 &= 1
\end{aligned}](https://juejin.cn/equation?tex=%5Cbegin%7Baligned%7D%0Ax0%20%26%3D%20-1%20%5C%5C%5C%0Ax1%20%26%3D%200%20%5C%5C%5C%0Ay0%20%26%3D%200%20%5C%5C%5C%0Ay1%20%26%3D%201%0A%5Cend%7Baligned%7D)

将这些值，代入 matrix公式中，可以得出变换：

```
transform: matrix(-1,0,0,1,0,0);
```

我们看下效果：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201812616783fcc8bcfd906~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

当然大家也可以举一反三，比如上下镜像：

```
transform: matrix(1,0,0,-1,0,0);
```

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201812616783fea86654f76~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

- 绕任意轴旋转。

绕任意轴的旋转，除了可以使用 rotate3d 来实现，还可以使用 matrix3d。这个旋转矩阵该如何计算呢？

还记得基本变换章节我们推导出的绕固定轴旋转的矩阵方法`axisRotation`吗？

`axisRotation(axis, angle)`，其中 axis 是一个三维向量，angle 是一个弧度值。

这里我不准备举绕基本轴旋转的例子，因为它们不需要matrix3d 出手，我们想绕`{x:1, y: 1, z: 1}`的倾斜轴旋转，上面的 axisRotation 方法该出场了，它会为我们提供变换矩阵，但是我们还需要将变换矩阵转化为 css 样式，我们先封装一个矩阵转 css 的方法：

```
function matrix2css(mt){
 var transformStyle = 'matrix(';
 if(mt.length == 16){
 transformStyle = 'matrix3d(';
 }
 for(let i =0; i< mt.length; i++){
 transformStyle += mt[i];
 if(i !== mt.length - 1){
 transformStyle += ',';
 }else{
 transformStyle += ')';
 }
 }
 return transformStyle;
}
```

接着可以通过 axisRotation 方法计算出变换矩阵了，比如旋转 90 度。

```
let mt = matrix.axisRotation({x:1, y:1, z:1}, Math.PI / 180 * 90)
```

在这里我用绕轴向量 axis = {x:1, y:1, z:1} 不停旋转的动画演示：

```
function render(){
 if(!playing){
 return;
 }
 angle ++;
 mt = matrix.axisRotation({x: 1,y: 1,z: 1}, Math.PI / 180 * angle);
 let css = matrix2css(mt);
 $('.box')[0].style.transform = css;
 requestAnimationFrame(render);
}
document.body.addEventListener('click',function(){
 playing = !playing;
 render();
})
```

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201812616784262a1dc9805~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

是不是很简单呢？

#### 总结

transform 中的基本变换都可以使用 matrix 和 matrix3d 来表示，只有当基本变换表示不了我们的变换时，我们才考虑使用 matrix 或者 matrix3d 。

可见，即使不做 WebGL 开发，我们之前学到的内容也会对普通开发者大有帮助，掌握变换原理，配合 CSS3 中的 3D 属性，照样可以做出很酷炫的 3D 动画效果。

### 回顾

本节讲述了 CSS 中的 3D 变换，以及它们与 WebGL 变换的相同之处。总的来说，基本原理都是一样的，之前封装的数学矩阵库，不仅可以用在 WebGL 领域，也可以用在 css 领域。

下一节，我们讲述 CSS 中 3D 变换 的其它几个重要属性，`变换类型(transform-style)`、`视点(perspective-origin)`、`视距(perspective)`。

---

## 第 25 章：CSS 与 3D 之 perspective

上节我们讲述了 CSS 中的变换方式以及对它们原理的深入理解。本节介绍一下 3D 变换的投影方式`perspective`相关属性，并通过`照片墙`和`图片盒`的实现学习它们的深入使用方法。

本节要介绍的主要属性有如下几个：

- transform-style：子元素变换的表现形式。
- perspective：视距。
- perspective-origin： 视点位置。
- backface-visibility：背面是否可见。

本节教大家掌握这几个属性，之后用 CSS 就能够很轻松地做出有创意的 3D 效果了。

### transform-style

该属性是用来设置子元素变换的展示形式，默认是 2D 平面展示，当我们需要让子元素的渲染有 3D 效果时，那么我们要将当前元素的 transform-style 属性设置为 preserve-3d。

我们用一张图片做示例：

```
<div class="img-wrapper">
 <img src="xxx" />
</div>
```

```
.img-wrapper{
 text-align: center;
 font-size: 0;
 margin-top: 200px;
}

.img-wrapper img{
 width: 150px;
 height: 110px;
}
```

我们不对图片施加变换，图片是正常状态：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets2018127167884e85db72163~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

记住图片默认时的样子。

此时，我们对图片施加变换，让图片绕 X 轴旋转 60 度。

```
.img-wrapper img{
 transform: rotateX(60deg);
}
```

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets2018127167885037d697934~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

可以看出，图片因为旋转，展示到屏幕上已经变形了，正常情况下，绕 X 轴旋转，图片的上半部分应该转到屏幕内侧，下半部分转到屏幕外侧。

我们看一下，是不是这样子的。

我们让图片的父容器也绕 X 轴旋转，这样就能看出图片到底是不是真的有了 3D 效果。

```
.img-wrapper{
 transform: rotateX(0deg);
 animation: rotate 3s linear;
}
@keyframes rotate{
 0%{
 transform: rotateX(0deg);
 }
 50%{
 transform: rotateX(120deg);
 }
 100%{
 transform: rotateX(0deg);
 }
}
```

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20181281678d28a3c32c952~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

可以看到，图片并没有呈现出立体效果。

那如何让图片呈现立体效果呢？

transform-style 要闪亮登场了。

我们将 transform-style 设置为 preserve-3d 即可。

另一个问题是，为哪个元素设置 transform-style 属性呢？

#### 舞台

WebGL 中有舞台和场景的概念， CSS 中也有类似概念。

我们需要一个舞台，然后为舞台设置展示方式。

上面的示例，大家觉得哪个元素是舞台呢？

很简单，图片的祖先容器都可以当做图片的舞台，我们将一个祖先容器设定为舞台，祖先容器的子元素就是舞台上的元素。

因此，既然我们想让元素呈现立体效果，我们就要在元素所在的舞台上设置 transform-style 属性，对于图片来说，图片的任何一个祖先元素都可以作为舞台，我们将图片的父容器作为舞台，为它设置舞台元素的呈现效果。

```
.img-wrapper{
 transform-style: preserve-3d;
}
```

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20181281678d2b82976fbad~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

很明显，图片呈现出了 3D效果。

通过这两幅动图，我相信大家已经明白 transform-style 的作用了。

我们总结一下：

transform-style用来设置容器中子元素的呈现方式。

- 当设置为 preserve-3d 时，子元素进行 3D 变换会呈现出 3D 立体效果。
- 当不设置或者设置为 `flat` 时，子元素不管采用 2D 变换还是 3D 变换，总是呈现出平面效果。

### 观察点位置

如何改变观察点位置呢？

这就涉及到两个新属性 `perspective`和`perspective-origin`，这两个属性用来设置观察点的坐标，并让投影产生透视效果，透视效果最明显的现象就是近大远小。

perspective 用来设置观察点在 Z 轴方向的位置，默认时观察点在元素中心，即 z = 0 位置，我们可以调整它到元素中心的距离。

设置这个属性会产生两个效果：

- 改变了观察点距离元素的 Z 轴距离.
- 使得子元素的 3D 变换产生透视效果。

#### 舞台

我们想换个角度看图片，那观察点需要设置在哪个元素上呢？

perspective 这个属性也是在舞台上设置的。

我们为舞台设置 perspective属性。

> 请注意，perspective 默认值是 0，此时不产生透视效果。只有不为 0 时才会形成透视效果。

那么，观察点距离元素中心的远近对视觉呈现有什么影响呢？

千言万语抵不过一幅图。

我们通过一张动图感受一下，在这个动画里，我将观察点的 Z 轴坐标从 1 像素匀速改变到 100 像素，再从 100 像素移近到 1 像素，另外为了区别舞台和舞台元素在 Z 轴上的不同，我将舞台的背景颜色改为透明度为 70% 的红色。

```
.img-wrapper{
 perspective: 300px;
 animation: camera 3s linear;
 background-color: rgba(255, 0, 0, .7);
}
@keyframes camera {
 0% {
 perspective: 1px;
 }
 50% {
 perspective: 100px;
 }
 100% {
 perspective: 1px;
 }
}
```

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20181281678970a14c4eb7f~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

因为图片宽度是 150px，高度是 110px，当绕 X 轴旋转 60 度后，图片底边在 Z 轴的坐标为：

![z = 110 \div 2 * \frac{\sqrt{3}}{2} \approx 49](https://juejin.cn/equation?tex=z%20%3D%20110%20%5Cdiv%202%20*%20%5Cfrac%7B%5Csqrt%7B3%7D%7D%7B2%7D%20%5Capprox%2049)

所以，我们的观察点的 Z 轴坐标至少要大于这个值，才能看到图片的全貌。

距离越近，就越看不到图片在观察点后面的部分。

我们将 perspective （观察点的 Z 轴坐标）移动到 100px 处。

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20181281678cc5fc18c3c15~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

此时，图片有了近大远小的透视效果，这就是 perspective 的作用。

从感官上我们是能感受到它好像有了 3D 的感觉，但是还是看不出它在 Z 轴上的状态。

改变 perspective 只是改变了在 Z 轴的位置，也就是拉远或者拉近镜头，但是并没有将镜头移到图片上方去观察。

#### 观察点在 X、Y 轴的位置

让观察点沿着左、右、上、下方向进行移动的话，该如何做呢？

这就是 perspective-origin 所扮演的重要角色。

它负责设置观察点在 X、Y 轴的偏移，即屏幕的左右、上下方向。

我们看下它的用法：

perspective-origin，接收两个参数，一个代表 X 轴偏移，一个代表 Y 轴偏移。

请谨记：该属性的默认值是 （50%，50%），在舞台 DOM 的中心位置。

回到上面的话题，移动镜头到图片上方，也就是设置观察点在舞台上的 Y 轴坐标，我们将镜头往上移动一定高度，从舞台上方观察图片。

还是用动图来演示这个过程。

```
.img-wrapper{
 perspective: 200px;
 animation: camera 3s linear infinite;
}
@keyframes camera{
 0%{
 perspective-origin: 50% 50%;
 }
 50%{
 perspective-origin: 50% -200%;
 }
 100%{
 perspective-origin: 50% 50%;
 }
}
```

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20181281678d97bfccd73ed~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

上面就是我们将镜头慢慢移动到上方时，对舞台元素的观察过程。

注意，图片本身并没有动，我们移动的只是镜头，虽然你会有一种镜头没动，图片在动的感觉。

通过这几幅动图，我相信大家对这几个属性有了更深刻的认识，接下来，我们介绍如何利用这几个属性实现照片墙和图片盒。

### 照片墙

在上一节，我介绍了照片墙的原理，简单来说，就是图片先旋转一定度数，之后沿着 Z 轴方向移动一定距离。

在动手写代码之前，我们要想清楚两个问题：

- 每张图片绕 Y 轴旋转的角度。
- 沿 Z 轴方向至少移动多少像素。

我想，只要你想清楚了这两个问题，代码就信手拈来了。

#### 每张图片绕 Y 轴旋转的角度。

我们准备 12 张图片，并将每张图片设置成宽 150px，高 110px 。

```
img{
 width: 150px;
 height: 110px;
}
```

那么，每张图片旋转的角度是 360 / 12 = 30度。

#### 沿 Z 轴方向最少移动距离

为了让图片能够不交叉，我们需要沿图片 Z 轴平移一定距离，那么，这个距离是多少呢？

当然我们可以一点点地区尝试，但是我想我还是教给大家一个严谨的思路比较好。

大家看下图：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20181281678e79b9936cde6~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

根据下图，我们能够知道，图片在 Z 轴平移的最小距离是 ![\vec{OB}](https://juejin.cn/equation?tex=%5Cvec%7BOB%7D)，那么如何求得 ![\vec{OB}](https://juejin.cn/equation?tex=%5Cvec%7BOB%7D) 的长度呢？

由最简单的三角公式可以得出：

![OB = BC \times \sqrt3 = （BD + DC）\times \sqrt3](https://juejin.cn/equation?tex=OB%20%3D%20%20BC%20%5Ctimes%20%5Csqrt3%20%3D%20%EF%BC%88BD%20%2B%20DC%EF%BC%89%5Ctimes%20%5Csqrt3)

仍然根据三角公式可以知道：

![BD = AD \div 2 = 150 \div 2 = 75](https://juejin.cn/equation?tex=BD%20%3D%20AD%20%5Cdiv%202%20%3D%20150%20%5Cdiv%202%20%3D%2075)

![DC = DE \div \frac{\sqrt3}{ 2} = 75 \times 2 \div \sqrt3 \approx 89](https://juejin.cn/equation?tex=DC%20%3D%20DE%20%5Cdiv%20%5Cfrac%7B%5Csqrt3%7D%7B%202%7D%20%3D%2075%20%5Ctimes%202%20%5Cdiv%20%5Csqrt3%20%5Capprox%2089)

所以：

![OB = (BD + DC) \times \sqrt3 \approx 280](https://juejin.cn/equation?tex=OB%20%3D%20(BD%20%2B%20DC)%20%5Ctimes%20%5Csqrt3%20%5Capprox%20280)

也就是说，我们至少要让图片沿着 Z 轴移动 280 像素，才能让各个图片正好衔接。

口说无凭，看看效果吧。

```
Array.prototype.forEach.call($('img'), (item, i) => {
 item.style.transform = 'rotateY(' + i * 30 + 'deg) translateZ(280px)';
});
```

仍然用一幅动图来演示，我们将观察点移动到舞台上方：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20181291678e93e5f22b564~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

可以看到，当我们让图片沿Z 轴移动 280 像素之后，各个图片的边缘正好能够对齐，和我们推导的结果一致。

将舞台绕 X 轴旋转 90 度，以自下而上的角度观察照片墙是如何从默认位置沿着 Z 轴移动到指定位置：

```
.img-wrapper{
 transform: rotateX(90deg);
}
```

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20181291678e9a7e142deb5~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

从不同角度观看我们的舞台，展现效果也会不同。

#### 背面是否可见

照片墙这个效果，大家应该能看到处于背面的元素还是能够可见的，这与实际有所差异，如果大家不想背面元素可见，我们可以设置 backface-visibility 属性来实现：

```
backface-visibility: hidden;
```

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20181291679202ab61c6b7d~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

大家可以看到，设置完背面不可见属性之后，位于后面的图片此时已经看不到了。

以上就是图片墙的主要原理，可见，了解一些图形学知识对于我们做 3D 动效有莫大的帮助。

接下来，我们看一下另一个效果`图片盒子`的分析实现过程。

### 图片盒

图片盒是一个包含 6 个面的立方体，每个面其实就是一个 DOM 元素。

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201812916791e7ad7c1ff01~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

上图就是一个图片盒子的例子，我们接下来的目标就是利用 CSS 的 3D 属性实现这样一个效果。

写代码之前还是先思考一下，不考虑动效，我们如何实现这样一个立方体。

其实很简单，主要思考清楚六个面的状态就可以了。

- 首先我们需要六个 DOM 元素，此时六个元素在同一位置。
- 处理前后两个平面在 Z 轴方向的差别。
- 对上下两个平面施加绕 X 轴旋转90度的效果，然后处理 Y 轴方向的差别。
- 对左右两个平面施加绕 Y 轴旋转90度的效果，然后处理 X 轴方向的差别。

想清楚这几个步骤，代码就很简单了。

为了让图片展示 3D 效果，我们需要为图片父容器设置 transform-style 属性：

```
.img-wrapper{
 transform-style: preserve-3d;
 position: relative;
}
```

接下来，我们为图片元素设置宽高，并对六张图片采用绝对定位，使他们重合。

```
img{
 width: 150px;
 height: 110px;
 position: absolute;
}
```

然后，开始处理各个面的状态，对于图片盒子的前后两个面，我们只需要改变它们的 Z 轴坐标就可以了，那么 Z 轴坐标设置多少呢？

聪明的同学已经想到了， Z 轴坐标是图片高度的一半。

```
.front{
 transform: translateZ(55px);
}
.back{
 transform: translateZ(-55px);
}
```

前后平面处理完了，接下来处理上下两个面，上下两个面要绕 X 轴翻转 90 度，然后沿着 Y 轴分别向上下两个方向移动图片高度的一半距离。

```
 .top{
 transform: translateY(-55px) rotateX(90deg);
 }
 .bottom{
 transform: translateY(55px) rotateX(90deg);
 }
```

最后，处理左右两个平面，左右两个平面需要绕 Y 轴旋转 90 度，然后沿着 X 轴进行平移，分别向左、向右平移图片宽度的一半。

```
.left{
 transform: translateX(-75px) rotateY(90deg);
}
.right {
 transform: translateX(75px) rotateY(-90deg);
}
```

这样，就完成了一个图片盒子，很简单吧？

### 回顾

本节主要讲述了如何设置观察点在三维层面的坐标，并结合上节的变换属性实现照片墙和图片盒子的特效，主要目的不是教会大家做这些效果，而是教大家思考 3D 特效的分析过程。通过这两个例子，我想大家认识到了 css 的强大。即使不使用 WebGL ，我们依然可以用 DOM 元素结合 CSS 实现 3D 效果。

下一节，我们详细阐述一下数学库在 CSS 3D 属性中的高级应用。

---

## 第 26 章：数学库在 CSS 的 3D 动画中扮演的重要角色

前面两节，我们详细讲述了CSS 3D 属性的相关概念与使用方法，本节看一下 3D 数学库如何与 CSS 中的 transform 属性实现复杂的 3D 效果。

我们依然从最简单的平移、旋转、缩放开始演示，但是不再使用 translate、scale、rotate 等属性来实现，而是采用 matrix 和 matrix3d。

### matrix 和 matrix3d

作为 transform 属性最冷门的两个属性值，我想大家很少有人会用到它们，或者不知道它们是做什么的，以及不知道该如何使用它们。

上一节我简单介绍了 matrix 和 matrix3d 的使用方法，本节我会详细介绍一下它们。

- matrix 和 matrix3d 的作用。
- 它们的使用方法。
- 属性值的生成方式。

#### matrix

matrix 是 transform 的 2 维变换矩阵，由六个数字组成。

> transform: matrix(a, b, c, d, e, f);

事实上，二维变换矩阵是一个 3 阶矩阵，包含 3 x 3 = 9 个数字，但是你会发现 matrix 是由 6 个数字组成，它们对应一个 3 阶矩阵的如下部分：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201911216841fb9efa3a4fd~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

很容易理解，由于第三行的数字始终是固定的，所以 css 规范中把第三行给省略了，matrix 只需要接收前两行数字即可。

对于基本变换，matrix 各个元素表示如下：

##### 平移

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets2019112168420213d728550~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

如果 matrix 只表示平移时，只需要改变 tx 和 ty 即可，其中 tx 代表沿着 X 轴平移的像素值，ty 代表沿着 Y 轴平移的像素值。其余元素都是固定值，仅仅改变 tx 和 ty即可。

比如，让一个 dom 元素沿着 X 轴平移 30 像素，沿着 Y 轴平移 40 像素，那么，用 matrix 表示如下：

```
transform: matrix(1, 0, 0, 1, 30, 40);
```

> 注意，`tx` 和 `ty` 只能用数字表示，后面不可接 `px` 。

##### 缩放

单一矩阵表示缩放时，各个位置的元素如下：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets2019112168420a52a9fb0da~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

其中 sx 代表 X 轴方向的缩放比例，sy 代表 Y 轴方向的缩放比例，其余位置的元素都是固定的。
比如，沿着 X 轴放大两倍，沿着 Y 轴放大两倍时，css 表示如下：

```
transform: matrix(2, 0, 0, 2, 0, 0);
```

等价于

```
transform: scale(2);
```
或

```
transform: scale(2, 2);
```

当我们想通过 matrix 设置缩放比例时，只需要改变 sx、sy 即可。

##### 旋转

单一矩阵表示旋转时，各个位置元素表示如下：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets2019113168457c7ab0fc5ec~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

由于 2D 旋转是在 XY 平面的旋转，也就是绕 Z 轴的旋转，所以 θ 角度是绕 Z 轴旋转的角度。
比如旋转 45 度时：

![cos45^。 = \frac{\sqrt{2}}{2} \approx 0.7071](https://juejin.cn/equation?tex=cos45%5E%E3%80%82%20%3D%20%5Cfrac%7B%5Csqrt%7B2%7D%7D%7B2%7D%20%5Capprox%200.7071)

![sin45^。 = \frac{\sqrt{2}}{2} \approx 0.7071](https://juejin.cn/equation?tex=sin45%5E%E3%80%82%20%3D%20%5Cfrac%7B%5Csqrt%7B2%7D%7D%7B2%7D%20%5Capprox%200.7071)

将各个数字代入公式后，css 表示如下：

```
transform: matrix(0.7071, 0.7071, -0.7071, 0.7071, 0, 0);
```

等价于

```
transform: rotate(45deg);
transform: rotateZ(45deg);
```

以上就是通过单一矩阵介绍了 matrix 的用法。大家可能会有如下疑惑：transform 已经内置了基本变换属性`translate`、`rotate`、`scale`，所以，我们为什么还要用 matrix？况且 matrix 更复杂，更不易于理解。回答这个问题之前，我们趁热打铁，先了解下 3 维变换 matrix3d 的用法。

#### matrix3d

顾名思义，matrix3d 是transform 的 3 维变换矩阵，由 16 个数字组成。

> transform: matrix3d(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p);

CSS 中 matrix3d 的参数顺序对应变换矩阵的元素位置如下图所示。

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20191141684a5d49cf364c7~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

16 个数字乍看之下很多，初学者容易犯晕，不过大家可以根据上图对这 16 个数字进行分类，分为四组，每组 4 个数字，每组数字代表变换矩阵的每一列，每一列数字代表的含义如下：

- 第一列，代表变换后的坐标系的 X 轴在原坐标系下的坐标。
  - a：X 轴坐标分量
  - b：Y 轴坐标分量
  - c：Z 轴坐标分量
  - d：通常为 0，代表向量。
- 第二列，代表变换后的坐标系的 Y 轴在原坐标系下的坐标。
  - e：X 轴坐标分量
  - f：Y 轴坐标分量
  - g：Z 轴坐标分量
  - h：通常为 0，代表向量。
- 第三列，代表变换后的坐标系的 Z 轴在原坐标系下的坐标。
  - i：X 轴坐标分量
  - j：Y 轴坐标分量
  - k：Z 轴坐标分量
  - l：通常为 0，代表向量。
- 第四列，代表变换后的坐标系原点在原坐标系下的坐标
  - m：X 轴坐标分量。
  - n：Y 轴坐标分量。
  - o：Z 轴坐标分量。
  - p：通常为 1，代表点。

如果你看过在之前章节坐标系变换原理的话，相信你会很容易理解上面的解释，如果你没看过，那也没关系，只需要掌握数学矩阵库的使用即可生成这么一个`变换矩阵`，之后将矩阵的各个元素填入 matrix3d 的 对应位置即可。

接下来看一下 matrix3d 是如何达到 transform 基本变换效果的。

#### 3D 平移

3D 平移无非就是增加了一个 Z 轴的平移效果。

平移时，matrix3d 对应变换矩阵的各个元素位置如下：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20191141684b07647e78b71~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

其中：

- tx：代表沿 X 轴的平移量。
- ty：代表沿 Y 轴的平移量。
- tz：代表沿 Z 轴的平移量。

如果，我们想通过 matrix3d 表示平移的话，只需要改变 tx、ty、tz 三个元素即可，其余元素如上图，无需变化。

假设我们要实现沿 X 轴平移 30 像素，沿 Y 轴平移 40 像素，沿 Z 轴平移 50 像素，那么 CSS 可以像下面这样设置：

```
transform: matrix3d(
1, 0, 0, 0, 
0, 1, 0, 0, 
0, 0, 1, 0, 
30, 40, 50, 1
);
```

等价于

```
transform: translate3d(30px, 40px, 50px);
```

注意哦，当使用 translate 时需要带上单位 `px`。

> 大家仍然不难发现，使用 matrix3d 比 translate 复杂，要书写的属性内容也多，并且不易于理解。

#### 3D缩放

3D 缩放仍然增加了 Z 轴方向的缩放效果，当 transform-style 设置为 preserve-3d 时，能够看到缩放 Z 轴所带来的视觉效果。

缩放对应的变换矩阵各个元素的位置如下图：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20191141684b328f0962081~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

其中：

- sx：代表沿 X 轴缩放的比例。
- sy：代表沿 Y 轴缩放的比例。
- sz：代表沿 Z 轴缩放的比例。

除了 sx、sy、sz 这三个元素需要我们自己设置，其余位置的元素都是固定值，如上图。

假设我们要将一个 dom 元素沿 X 轴、Y 轴、Z 轴各放大两倍，那么用 matrix3d 表示如下：

```
transform: matrix3d(
 2, 0, 0, 0,
 0, 2, 0, 0,
 0, 0, 2, 0,
 0, 0, 0, 1
);
```

等价于：

```
transform: scale3d(2, 2, 2);
```

我们通过一个小例子，看下效果。

```
<div class="parent">
 <div class="son"></div>
</div>
```

```
.parent{
 transform-style: preserve-3d;
 background: bisque;
 transition: 2s;
}
.parent:hover{
 transform: rotateY(80deg);
}
.son{
 width: 100px;
 height: 100px;
 background-color: blueviolet;
 transform: matrix3d(1 , 0, 0, 0,
 0, 1, 0, 0, 
 0, 0, 4, 0,
 0, 0, 0, 1) 
 rotateX(60deg);
}
```

> 为了便于观察 Z 轴放大效果，此处我对子元素做了一个多重变换，首先将子元素沿着 X 轴旋转 60 度，之后再执行缩放变换。多重变换的细节大家可以参见本章《CSS 与 3D 之 transform》中组合变换的部分。

我们将子元素沿着 Z 轴放大四倍，X 轴和 Y 轴比例不变，观察下效果：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20191141684b783f6e95e9b~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

大家可以发现， Z 轴长度变为了之前的 4 倍。
上面我们是用 matrix3d 实现的，使用 scale3d 同样能达到上述效果，大家不妨试一试。

#### 旋转

3D 旋转是基本变换最复杂的一个，涉及到绕基本坐标轴的旋转、绕任意轴的旋转、欧拉角旋转、四元数旋转等，但是 CSS 中除了 matrix 和 matrix3d 以外，只提供了绕基本轴旋转、绕任意轴旋转，欧拉角旋转和四元数旋转需要通过数学库计算出对应的旋转矩阵。我们还是先看下如何使用 matrix3d 实现基本旋转。

##### 绕 X 轴旋转

绕 X 轴旋转 θ 角度对应的变换矩阵各个元素的位置如下图所示：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20191141684baa31098682e~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

举个例子，假设我们实现绕 X 轴旋转 45 度的效果，那么对应的 css 表示如下：

```
transform: matrix3d(
 1, 0, 0, 0,
 0, 0.7071, 0.7071, 0,
 0, -0.7071, 0.7071, 0,
 0, 0, 0, 1
);
```

等价于

```
transform: rotateX(45deg);
transform: rotate3d(1, 0, 0, 45deg);
```

效果如下图：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20191151684f46a4978eabe~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

##### 绕 Y 轴旋转

绕 Y 轴旋转 θ 角度对应的变换矩阵各个元素的位置如下图所示：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20191141684bec76da1333f~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

举个例子，假设我们实现绕 Y 轴旋转 45 度的效果，那么对应的 css 表示如下：

```
transform: matrix3d(
 0.7071, 0, 0.7071, 0,
 0, 1, 0, 0,
 -0.7071, 0, 0.7071, 0,
 0, 0, 0, 1
);
```

等价于

```
transform: rotateY(45deg);
transform: rotate3d(0, 1, 0, 45deg);
```

效果如下图：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20191151684f4708c2daaa6~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

##### 绕 Z 轴旋转

绕 Z 轴旋转 θ 角度对应的变换矩阵各个元素的位置如下图所示：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20191141684bee618018b04~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

举个例子，假设我们实现绕 Z 轴旋转 45 度的效果，那么对应的 css 表示如下：

```
transform: matrix3d(
 0.7071, -0.7071, 0, 0,
 0.7071, 0.7071, 0, 0,
 0, 0, 1, 0,
 0, 0, 0, 1
);
```

等价于

```
transform: rotateZ(45deg);
transform: rotate3d(0, 0, 1, 45deg);
```

效果如下图：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20191151684f473b63d8879~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

以上就是使用 matrix 和 matrix3d 来代替基本变换属性的讲解内容。大家应该能明白它们的用法了，归纳起来如下：

- matrix 接收二维变换矩阵。
- matrix3d 接收三维变换矩阵。

很简单。

那另一个问题是，如何求得变换矩阵呢？这就需要用到我们前面总结的数学矩阵库了。

#### 矩阵库与 matrix 的搭配

对于基本变换，我们没有必要使用 matrix 来实现，但是对于一些基本变换满足不了的效果，我们就需要考虑 matrix 了。

比如，我需要为一个 dom 元素进行如下变换：

- 首先绕 X 轴旋转 45 度。
- 接着沿 Y 轴平移 30 像素。
- 然后绕 Z 轴旋转 45 度。
- 最后沿 Y 轴方向旋转 90 度。

> 以上变换基于静态坐标系（世界坐标系）进行的。

对于这么一个复杂的变换，我们有两种方式来实现：

- 组合变换，上节已经讲过。
- matrix 变换。

首先，我们看下如何使用组合变换来实现：

```
transform: rotateY(90deg) 
 rotateZ(45deg) 
 translateY(30px) 
 rotateX(45deg);
```

> 在 css transform 章节中介绍了 transform 组合变换时各个变换的顺序与坐标系的关系，如果大家还没忘记的话，应该记得变换属性从后往前排列代表按照世界坐标系进行变换。

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20191151684fa203ee5ce01~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

变换的分步执行过程如上图。

你会发现，如果变换过程比较多的话，transform 中要书写很多属性，所以可以尝试另一种思路，matrix3d。

我们看下如何使用 matrix3d 来表示。

利用之前的矩阵库，我们需要如下几个方法计算最终的变换矩阵：

- rotateZ：绕 Z 轴旋转。
- rotateX：绕 X 轴旋转。
- rotationY：绕 Y 轴旋转。
- translate：平移。

> 你可能没有发现矩阵相乘的方法，这是因为 rotateZ、rotateX、translate 方法允许传入一个矩阵作为左乘矩阵，返回一个组合矩阵。当然，你也可以用矩阵相乘方法来实现组合矩阵的求值，但是那样会多执行一些重复运算。

这几个方法在之前章节已经讲述过，所以我们拿来使用即可：

```
var deg = Math.PI / 180;
// 首先创建一个沿 Y 轴旋转矩阵。
var target = matrix.rotationY(90 * deg); 
// 接着计算 Y 轴旋转矩阵与 Z 轴旋转矩阵的组合变换。
// 等价于 matrix.multiply(target, matrix.rotationZ(45 * deg));
target = matrix.rotateZ(target, 45 * deg);
// 等价于 matrix.multiply(target, matrix.translate(0, 30, 0));
target = matrix.translate(target, 0, 30, 0, target);
// 等价于 matrix.multiply(target, matrix.rotationX(45 * deg));
target = matrix.rotateX(target, 45 * deg, target);
```

我们将 target 打印出来看一下：

```
[ 4.329780632585522e-17, 0.7071067690849304, -0.7071067690849304, 0, 0.7071067690849304, 0.5, 0.5, 0, 0.7071067690849304, -0.5, -0.5, 0, -1.298934236097771e-15, 21.21320343017578, 21.21320343017578, 1]
```

target 就是上面几种变换组合后的最终矩阵，我们将它转化为 css 的 matrix3d 属性：

```
// 将矩阵转化为transform matrix 属性值。
function matrix2css(m){
 var style = 'matrix(';
 if(m.length == 16){
 style = 'matrix3d(';
 }
 for(let i =0; i< m.length; i++){
 style += m[i];
 if(i !== m.length - 1){
 style += ',';
 }else{
 style += ')';
 }
 }
 return style;
}
```

最终效果如下：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets2019115168506ba371e5fbf~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

很显然，通过组合变换和 matrix，我们达到了同样的效果。

通过比较上面的两种实现，我们发现，组合变换相较于 matrix 更容易理解，当变换次数较少时，使用组合变换更优一些。但是当变换次数越来越多时，就需要使用 matrix 了。那么，什么时候变换次数会越来越多呢？

- 分段动画
  - 当一段动画分成很多段时，变换次数会越来越多，这时，需要针对动画做关键帧处理，每一个关键帧处使用 matrix 来表示。
- 复杂交互
  - 当交互比较复杂时，每一次交互都会在原来的变换属性上触发一次或者多次变换，这就需要使用数学库的矩阵乘法来计算组合矩阵。

下面，我会通过一个魔方格子的旋转来讲述 matrix3d 的使用场景。

### 魔方格子的旋转

大家都玩过魔方吧，沿不同方向进行旋转，可以将一个面的格子绕指定轴旋转 90 度。

接下来我们构造一个魔方格子，演示一下如何通过 matrix3d 完成这种交互。

#### 构造魔方格子

首先，我们要构造一个魔方格子，魔方格子是一个立方体，在前面章节我曾经介绍过图片盒的实现，此处仍然采用图片盒的实现方式，只不过将图片换成 DIV 容器。

```
<div class="block" id="block">
 <div class="face front"></div>
 <div class="face back"></div>
 <div class="face up"></div>
 <div class="face down"></div>
 <div class="face left"></div>
 <div class="face right"></div>
</div>
```

样式如下：

```
.block {
 position: absolute;
 transform-style: preserve-3d;
 width: 100px;
 height: 100px;
 transform-origin: 50px 50px;
}
.front {
 background: fuchsia;
}

.back {
 transform: translate3d(0, 0, 100px) rotateY(180deg);
 background: red;
}
.left {
 transform-origin: 100% 50% 0px;
 transform: rotateY(90deg);
 background: aqua;
}
.right {
 transform-origin: 0% 50% 0px;
 transform: rotateY(-90deg);
 background: blueviolet;
}
.up {
 transform-origin: 50% 0% 0px;
 transform: rotateX(90deg);
 background: darkorange;
}
.down {
 transform-origin: 50% 100% 0px;
 transform: rotateX(-90deg);
 background: darkviolet;
}
```

为了便于观察，我们为让魔方格子旋转起来：

```
@keyframes rotate {
 0% {
 transform: translate(-50%, -50%) rotate3d(1, 1, 1, 0deg);
 }

 100% {
 transform: translate(-50%, -50%) rotate3d(1, 1, 1, 360deg);
 }
}

.block{
 animation: rotate 3s linear infinite;
}
```

魔方格子效果如下：

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets201911516850e6ba543ba69~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

上图魔方格子的旋转是通过CSS 中的 `animation` 属性 来实现的，并没有通过交互来触发，接下来，我们讲解一下如何通过鼠标滑动进行旋转。

#### 旋转

鼠标滑动分为左、右、上、下滑动，每种滑动对应一种方向的格子旋转。

- 从右往左：绕 Y 轴旋转 θ 角。
- 从左往右：绕 Y 轴旋转 -θ 角。
- 从上往下：绕 X 轴旋转 θ 角。
- 从下往上：绕 X 轴旋转 -θ 度。

当然旋转需要有一个参照点，默认盒子中心。在上一章《四元数的应用：使用鼠标控制模型的旋转》中我们使用四元数、欧拉角分别实现了模型的旋转交互，本节依然采用旋转矩阵的生成原理，区别就是将生成的矩阵转化为 CSS 中 transform 的 matrix3d 属性值。

```
var currentQ = {x:0, y:0, z:0, w:1};
var lastQ = {x:0, y:0, z:0, w:1};
var currentMatrix = matrix.identity();
var l = Math.sqrt(dx * dx + dy * dy);
if(l <= 0)return;
var x = dy / l, y = dx / l;
var axis = {x: x, y: y, z: 0};
var q = matrix.fromAxisAndAngle(axis, l);
currentQ = matrix.multiplyQuaternions(q, lastQ);
currentMatrix = matrix.makeRotationFromQuaternion(currentQ);
```

通过上述方式我们计算出了当前旋转矩阵 currentMatrix，接下来，我们使用上面介绍的矩阵转化成对应 css 的函数，生成对应的 transform 属性。

```
var style = matrix2css(currentMatrix);
```

最后将生成的样式应用到魔方格子上。

```
document.querySelector('#block').style.transform = style;
```

至此，我们通过 matrix3d 实现了使用鼠标控制魔方格子旋转的效果。

![](/webgl-images/p1-jj.byteimg.comtos-cn-i-t2oaga2asxgold-user-assets20191151685233083461428~tplv-t2oaga2asx-zoom-in-crop-mark3024000.awebp)

### 回顾

以上就是数学矩阵库与 CSS transform 属性的高级使用技巧，通过这两个例子的学习，大家应该对 transform 的 3D 属性更有信心了，希望大家以后碰到交互给出的 3D 特效时不再畏手畏脚，而是大胆的拥抱它。

至此，我们对 CSS 的 3D 属性的学习就告一段落了。下一节，我们还是回到 WebGL 的学习内容上来。
