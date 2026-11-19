---
title: 多个 CSS 动画与动画合成：创造更复杂的动画效果
description: "CSS 动画为开发者提供了轻量级、灵活的动画实现方式；多个 CSS 动画与动画合成（animation-composition）技术进一步创造了更复杂、更有层次感的动画效果。本文介绍多动画的规则、冲突问题与 animation-composition 的三种复合操作及典型用例"
keywords: [多个, CSS, 动画与动画合成, 创造更复杂的动画效果]
category: CSS
tags: [CSS, 布局, 动画, 响应式]
---


# 多个 CSS 动画与动画合成：创造更复杂的动画效果

## 概念说明

随着 Web 技术的发展，动画已不仅是页面上的点缀，而是提升用户体验、传达信息和吸引注意力的关键元素。CSS 动画提供了轻量级、灵活的动画实现方式，但随着 Web 设计日益复杂、用户对更独特动画效果的需求增加，单一 CSS 动画可能难以满足设计要求。为此，CSS 引入了**多个动画**的概念以及**动画合成**（`animation-composition`）技术，以创造更复杂、更富有层次感的动画效果。

掌握这两项技术不仅能够更灵活地应对各种设计需求，还能提高动画性能，让 Web 应用或页面更具吸引力和流畅感。

## 理解多个动画

CSS 中的多个动画是指**在同一个元素上同时执行两个或多个动画**。通过组合不同的动画属性，可以创建复杂而独特的动画效果。

CSS 过渡动画（`transition`）和帧动画（`animation`）都具备多动画能力，只是多个关键帧动画比多个过渡动画复杂一些。两者使用都很简单，不同的是 `animation` 需要一个 `@keyframes` 声明的关键帧动画：

```CSS
.transition {
    transition: color 2s linear 1s;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.animation {
    animation: fadeIn 2s linear 1s infinite forwards alternate;
}
```

`transition` 和 `animation` 有相似之处（都具有缓动函数、持续时间和延迟时间等），也有很大差异。此处需要明确的是：两者都具备多个过渡或帧动画的能力：

```CSS
.transition {
    transition: color 1s ease-in, opacity 2s ease-in 1s;
}

@keyframes color {
    to {
        color: red;
    }
}

@keyframes opacity {
    to {
        opacity: 0;
    }
}

.animation {
    animation: color 1s linear forwards, opacity 1s ease-out both 1s;
}
```

通过这种方式使用多个动画，可以灵活地控制每个动画的持续时间、延迟时间、缓动函数和顺序等，从而产生独特且迷人的视觉效果。

### 多动画属性值的分配规则

多个动画的使用涉及多个值的应用以及排序细节，这些规则对创建复杂动画很重要。

**值列表与动画数量一致**时，值与动画一一对应：

```CSS
.multi-animation {
    animation-name:fadeIn, rotateOut, bounceIn;
    animation-duration: 1s, 2s, 1s;
    animation-timing-function: linear, ease, ease-in-out;   
}
```

`.multi-animation` 元素同时应用了 `fadeIn`、`rotateOut` 和 `bounceIn` 三个帧动画，每个动画的持续时间和缓动函数都不一样：

- `fadeIn` 动画持续播放 `1s`，缓动函数是 `linear`
- `rotateOut` 动画持续播放 `2s`，缓动函数是 `ease`
- `bounceIn` 动画持续播放 `1s`，缓动函数是 `ease-in-out`

> Demo 地址：https://codepen.io/airen/full/wvNROdq

**值列表少于动画数量**（只有一个值）时，所有动画共享同一个值：

```CSS
.multi-animation {
    animation-name:fadeIn, rotateOut, bounceIn;
    animation-duration: 1s;
    animation-timing-function: linear;   
}
```

`fadeIn`、`rotateOut` 和 `bounceIn` 三个动画都会被赋予相同的持续时间（`1s`）和缓动函数（`linear`）：

> Demo 地址：https://codepen.io/airen/full/XWOoGRO

**值列表少于动画数量但有多个值**时，值分配将从可用列表的第一个项目循环到最后一个项目，再重新循环到第一个项目：

```CSS
.multi-animation {
    animation-name:fadeIn, rotateOut, bounceIn;
    animation-duration: 1s, 2s;
    animation-timing-function: linear, ease-in-out;   
}
```

此时：

- `fadeIn` 动画的持续时间是 `1s`，缓动函数是 `linear`
- `rotateOut` 动画的持续时间是 `2s`，缓动函数是 `ease-in-out`
- `bounceIn` 动画的持续时间是 `1s`，缓动函数是 `linear`

这是因为 `rotateOut` 动画获得的持续时间 `2s` 和缓动函数 `ease-in-out` 分别是两个属性值列表中的最后一个，之后值分配重置为第一个值，因此 `bounceIn` 拿到 `1s` 和 `linear`：

> Demo 地址：https://codepen.io/airen/full/RwvEdgR

**值列表多于动画数量**时，多出来的值将被忽略：

```CSS
.multi-animation {
    animation-name:fadeIn, rotateOut, bounceIn;
    animation-duration: 1s, 2s, .2s, .4s, .5s;
    animation-timing-function: linear, ease-in-out, ease, ease-in, ease-out;   
}
```

`animation-name` 只显式指定了三个动画，而 `animation-duration` 和 `animation-timing-function` 各指定了五个值。多出来的持续时间（`.4s` 和 `.5s`）和缓动函数（`ease-in` 和 `ease-out`）不会应用于任何动画，并且会被忽略：

> Demo 地址：https://codepen.io/airen/full/MWZVPoZ

### 多动画的执行顺序

同一个元素应用多个动画时，它们按照出现在 `animation-name` 中的顺序从左往右执行：

```CSS
@keyframes slideInLeft {
  from {
    transform: translate3d(-100vw, 0, 0);
    visibility: visible;
  }

  to {
    transform: translate3d(0, 0, 0);
  }
}

@keyframes swing {
  20% {
    transform: rotate3d(0, 0, 1, 15deg);
  }

  40% {
    transform: rotate3d(0, 0, 1, -10deg);
  }

  60% {
    transform: rotate3d(0, 0, 1, 5deg);
  }

  80% {
    transform: rotate3d(0, 0, 1, -5deg);
  }

  to {
    transform: rotate3d(0, 0, 1, 0deg);
  }
}

@keyframes slideOutRight {
  from {
    transform: translate3d(0, 0, 0);
  }

  to {
    visibility: hidden;
    transform: translate3d(100vw, 0, 0);
  }
}

.multi-animation {
    animation-name: slideInLeft, swing, slideOutRight;
    animation-duration: 1s, 2s, 1s;
    animation-delay: 0s, .5s, 2.5s;
    animation-timing-function: ease-in-out;
    transform-origin: top center;
}
```

> Demo 地址：https://codepen.io/airen/full/qBgLvXW

元素会先执行 `slideInLeft` 动画，然后是 `swing` 动画，最后才是 `slideOutRight` 动画。只调整 `animation-name` 的值顺序，动画效果就会不同：

```CSS
.multi-animation {
    animation-name: swing, slideInLeft, slideOutRight;
}
```

`swing` 被调整到最左侧后，元素会先执行 `swing` 动画，再执行 `slideInLeft`，最后执行 `slideOutRight`：

> Demo 地址：https://codepen.io/airen/full/BaMvbdZ

::: warning 顺序决定覆盖
如果有多个动画应用在同一个元素上，并且它们修改了相同的属性，最后一个动画的效果将覆盖之前的动画。因此动画的顺序很重要。
:::

## 多动画存在的问题

在同一个元素上使用两个或以上的 CSS 动画会产生冲突。以一个圆点动画为例，动画元素（圆点）由两个简单动画组成：沿 `x` 轴移动一定距离，和沿 `y` 轴移动一定距离。使用 `@keyframes` 描述这两个动画：

```CSS
@keyframes xAxis {
    50% {
        animation-timing-function: ease-in;
        translate:450px 0;
    }
}

@keyframes yAxis {
    50% {
        animation-timing-function: ease-out;
        translate:0 -450px;
    }
}
```

将两个动画都应用到动画元素 `.dot` 上：

```CSS
.dot {
    animation: 
        xAxis 2.5s infinite cubic-bezier(0.02, 0.01, 0.21, 1),
        yAxis 2.5s infinite cubic-bezier(0.3, 0.27, 0.07, 1.64);
}
```

> Demo 地址：https://codepen.io/airen/full/gOqZEaM

结果与期望的动画效果相差甚远：

> Demo 地址：https://codepen.io/airen/full/rNPoROZ

原因在于：`xAxis` 和 `yAxis` 都使用 CSS 的 `translate` 属性对动画元素进行位移——`xAxis` 使元素沿 `x` 轴水平向右移动（`translate: 450px 0`），`yAxis` 使元素沿 `y` 轴垂直向上移动（`translate: 0 -450px`）。在同一个元素上，同一时间只能设置一个变换值（只有一个 `translate` 生效），因此只有一个位移动画会生效——动画列表中 `yAxis` 动画覆盖了 `xAxis` 动画。

在同一个元素上使用多个 CSS 动画，除了性能问题以及增加维护和调试困难之外，还会带来以下问题：

- **冲突**：不同的动画可能同时修改相同的 CSS 属性，导致冲突和不一致。例如一个动画试图将元素向左移动，另一个动画同时试图将元素向右移动。
- **不可控**：多个动画可能导致元素状态复杂、难以预测和控制。例如一个动画试图将元素向右移动，另一个动画同时试图将元素向上移动。
- **混乱**：多个动画可能导致动画效果重叠，元素行为混乱。例如一个动画正在逐渐淡出元素，另一个动画同时试图将元素放大。

### 修复方式一：分层

避免这些问题需要仔细规划和组织 CSS 动画，确保它们不相互干扰，并尽量减少多个动画同时作用于同一个元素的情况。例如采用分层修复上述示例：

```HTML
<div class="dot xAxis">
    <span class="yAxis"></span>
</div>
```

父元素运用 `xAxis` 动画沿 `x` 轴向右移动，子元素运用 `yAxis` 动画沿 `y` 轴向上移动：

```CSS
@layer animation {
    @keyframes xAxis {
        50% {
            animation-timing-function: ease-in;
            translate:450px 0;
        }
    }

    @keyframes yAxis {
        50% {
          animation-timing-function: ease-out;
          translate: 0 -450px;
        }
    }
    
    .dot {
        animation: xAxis 2.5s infinite cubic-bezier(0.02, 0.01, 0.21, 1);
    
        &::after {
            animation: yAxis 2.5s infinite cubic-bezier(0.3, 0.27, 0.07, 1.64);
        }
    }
}
```

> Demo 地址：https://codepen.io/airen/full/RwvEdrW

### 修复方式二：WAAPI 的 composite

使用 [WAAPI](https://www.w3.org/TR/web-animations-1/)（Web Animations API）开发动画时，可以使用它的 `composite` 功能修复示例中的问题。先使用 WAAPI 创建与之前 CSS 示例等效的动画：

```JavaScript
const dot = document.querySelector('.dot');

// xAxis Animation
dot.animate({
    transform: ['translateX(450px)']
}, {
    duration: 2500,
    easing: 'cubic-bezier(0.02, 0.01, 0.21, 1)',
    iterations: Infinity
});

// yAxis Animation
dot.animate({
    transform: ['translateY(-450px)']
}, {
    duration: 2500,
    easing: 'cubic-bezier(0.3, 0.27, 0.07, 1.64)',
    iterations: Infinity
});
```

默认行为保持不变，这段代码与 CSS 制作的动画效果相同：

> Demo 地址：https://codepen.io/airen/full/MWLZxKG

给第二个动画添加 `composite` 属性并设置其值为 `add`，浏览器会将此动画的值添加到该属性的当前状态中：

```JavaScript
// yAxis Animation
dot.animate({
    transform: ['translateY(-450px)']
}, {
    duration: 2500,
    easing: 'cubic-bezier(0.3, 0.27, 0.07, 1.64)',
    iterations: Infinity,
    composite: 'add'
});
```

> Demo 地址：https://codepen.io/airen/full/xxMmBZe

### 修复方式三：CSS 动画合成

CSS 的 [CSS Animations Level 2](https://drafts.csswg.org/css-animations-2/) 也引入了类似 WAAPI `composite` 的功能——[CSS 动画合成](https://drafts.csswg.org/css-animations-2/#propdef-animation-composition)（`animation-composition`）。现在可以直接使用 CSS 动画合成修复前面的动画，无需再对多动画进行分层：

```CSS
@keyframes xAxis {
    50% {
        animation-timing-function: ease-in;
        translate:450px 0;
    }
}

@keyframes yAxis {
    50% {
        animation-timing-function: ease-out;
        translate:0 -450px;
    }
}

.dot {
    animation: 
        xAxis 2.5s infinite cubic-bezier(0.02, 0.01, 0.21, 1),
        yAxis 2.5s infinite cubic-bezier(0.3, 0.27, 0.07, 1.64);
    animation-composition: add; 
}
```

> Demo 地址：https://codepen.io/airen/full/WNPLmwZ

综上，可以使用分层、WAAPI 和动画合成等技术运用多动画，并尽可能避免多动画带来的弊端：

> Demo 地址：https://codepen.io/airen/full/oNmJVLv

## CSS 动画合成是什么

[W3C 规范对 CSS 动画合成的描述](https://drafts.csswg.org/css-animations-2/#animation-composition)如下：

> The `animation-composition` property defines the composite operation used when multiple animations affect the same property simultaneously.

即：`animation-composition` 属性定义了在多个动画同时影响同一属性时所使用的复合操作。

换句话说，CSS 动画合成是指同时使用多个 CSS 动画效果影响同一属性时，通过属性和方法控制这些动画如何组合影响动画元素的属性值——包括属性值的叠加、替换等。这为 Web 开发人员提供了更多控制权，以创建复杂的动画效果，而不必依赖单一的动画规则。

CSS 动画合成通常通过 CSS 的 `animation-composition` 属性或 WAAPI 的 `composite` 方法实现，有助于避免不必要的复杂性和冲突，使多个动画效果协同工作。

## CSS 动画合成如何使用

CSS 的 `animation-composition` 属性用于定义当多个动画同时影响同一属性时的复合操作。例如：

```CSS
@keyframes move {
    0% {
        transform: translate(0, 0);
    }
    50% {
        transform: translate(100px, 0);
    }
    100% {
        transform: translate(0, 0);
    }
}

@keyframes rotate {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

.element {
    animation-name: move, rotate;
    animation-duration: 2s;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    animation-composition: add;
}
```

元素 `.element` 同时应用了 `move` 和 `rotate` 两个动画，并显式设置 `animation-composition: add`——两个动画效果将相加而不是互相替换。`.element` 将同时执行位移和旋转，而不是先位移再旋转：

> Demo 地址：https://codepen.io/airen/full/QWYzoEO

`animation-composition` 可选的值包括 `replace`、`add` 和 `accumulate`，每个值产生不同的效果：

> Demo 地址：https://codepen.io/airen/full/qBgLvNz

对比结果：

- 取值为 `replace` 时，元素只有旋转效果
- 取值为 `add` 时，元素有位移加旋转的效果
- 取值为 `accumulate` 时，元素只有位移效果

理解复合操作可以更精细地控制多个动画之间的互动效果。

## 如何理解 CSS 的动画合成

### 底层值与效果值

以下面代码为例说明动画合成的工作原理：

```CSS
.element {
    filter: blur(5px);
    animation: filter 2s linear infinite;
}

@keyframes filter {
    0% {
        filter: blur(10px);
    }
    100% {
        filter:blur(20px);
    }
}
```

初始状态下，`.element` 元素上 `filter` 属性的 `blur(5px)` 被称为**底层值**（underlying value），`@keyframes` 第一帧的 `filter` 属性值 `blur(10px)` 被称为**效果值**（effect value）。`animation-composition` 属性指定合成底层值和效果值之后执行的操作，以产生最终效果值。不同的取值会影响 `filter` 属性的最终值。

**`replace`（默认值）**：效果值替换底层值。`@keyframes` 第一帧的 `blur(10px)` 替换底层值 `blur(5px)`，元素从 `blur(10px)` 到 `blur(20px)` 动画，等效于：

```CSS
@keyframes filterReplace {
    0% {
        filter: blur(10px);
    }
    100% {
        filter: blur(20px);
    }
}
```

> Demo 地址：https://codepen.io/airen/full/qBLoNGK

**`add`（叠加）**：效果值与底层值叠加。`0%` 关键帧的 `blur(10px)` 与底层值 `blur(5px)` 叠加，`filter` 属性复合值为 `blur(5px) blur(10px)`，等效于：

```CSS
@keyframes filterAdd {
    0% {
        filter: blur(5px) blur(10px);
    }
    100% {
        filter: blur(20px);
    }
}
```

> Demo 地址：https://codepen.io/airen/full/ZEwVPpM

**`accumulate`（累积）**：效果值与底层值按累积方式合并。`0%` 关键帧的复合效果值为 `blur(15px)`，等效于：

```CSS
@keyframes filterAccumulate {
    0% {
        filter: blur(15px)
    }
    
    100% {
        filter: blur(20px);
    }
}
```

> Demo 地址：https://codepen.io/airen/full/dyawrOP

三个值的语义总结：

- **`replace`（替换）**：默认行为。多个动画同时影响同一属性时，最后一个动画完全替换之前的动画效果，只有最后一个动画的效果应用到属性上。例如 `rotate` 动画完全替代 `move` 动画，最终只有旋转效果。
- **`add`（叠加）**：多个动画的效果叠加在一起，一起影响属性的最终值。例如一个动画使元素向右移动 `30px`，另一个使元素向左移动 `20px`，`add` 之后元素向右移动 `10px`。
- **`accumulate`（累积）**：动画效果逐渐累积而非替换或叠加，每个动画基于之前动画的效果计算最终效果。例如元素默认 `blur(5px)`、`0%` 关键帧为 `blur(10px)`，`accumulate` 后 `0%` 关键帧的复合值为 `blur(15px)`。

### 以 transform 为例

CSS 动画常用 `transform` 属性，下面以 `transform` 为例说明动画合成的工作方式。假设元素上应用了如下代码：

```CSS
.element {
    transform-origin: 50% 50%;
    transform: translateX(50px) rotate(45deg);
}
```

同时设置了一个 `@keyframes`：

```CSS
@keyframes adjust {
    to {
        transform: translateX(100px);
    }
}
```

将 `adjust` 动画应用于元素时，关键帧将应用于元素——`to` 关键帧中的 `transform` 会替代元素初始设置的 `transform`。这与滤镜示例相似，也是浏览器的默认行为：

```CSS
@keyframes adjust {
    to {
        transform: translateX(100px);
    }
}

.element {
    transform-origin: 50% 50%;
    transform: translateX(50px) rotate(45deg);
    animation: adjust 5s linear infinite alternate;
}
```

> Demo 地址：https://codepen.io/airen/full/KKJbENo

Demo 中，浅蓝色正方形是 `.element` 未使用 `adjust` 动画时的初始状态：沿 `x` 轴向右移动 `50px`（`translateX(50px)`）并旋转 `45deg`（`rotate(45deg)`）；深蓝色正方形是使用 `adjust` 动画后的效果——`to` 关键帧中的 `transform` 替代了现有的 `transform`。让动画只播放一次并设置 `animation-fill-mode: forwards` 或 `both`，可以更清楚地看到 `translateX(100px)` 替代了 `translateX(50px) rotate(45deg)`：

> Demo 地址：https://codepen.io/airen/full/abXPMBx

这个效果与 `animation-composition: replace` 等同。改用 `add` 或 `accumulate` 则产生不同结果：

> Demo 地址：https://codepen.io/airen/full/mdvaoRE

具体解释：

- **`replace`**：`to` 关键帧中的 `transform` 替换元素底层的 `transform`，即 `translateX(100px)` 替代 `translateX(50px) rotate(45deg)`。
- **`add`**：`to` 关键帧中的 `translateX(100px)`（效果值）被添加到元素的 `transform` 属性中，最终值变成 `translateX(50px) rotate(45deg) translateX(100px)`——即先执行 `translateX(50px)`，再执行 `rotate(45deg)`，最后执行 `translateX(100px)`：

> Demo 地址：https://codepen.io/airen/full/ZEwVPLM

- **`accumulate`**：`to` 关键帧中 `transform` 的值 `translateX(100px)` 与元素 `transform` 的 `translateX(50px) rotate(45deg)` 相结合（效果值与底层值结合）。可以理解为动画混合后，元素先执行 `translateX(150px)`，再执行 `rotate(45deg)`：

> Demo 地址：https://codepen.io/airen/full/LYqMaWP

也可以单独观察动画 `to` 关键帧状态下的效果：

> Demo 地址：https://codepen.io/airen/full/PoVXLpW

::: tip 一个类比
可以将 `animation-composition` 类比为一杯被茶填满的杯子，倒入牛奶时会发生以下情况：

- `replace`：茶被移除，并被牛奶替换
- `add`：牛奶被添加到杯子中，但仍然位于茶的顶部
- `accumulate`：牛奶被加到茶中，因为它们都是液体，会很好地混合在一起
:::

### 多关键帧下的合成

把前面的 `adjust` 帧动画调整为多关键帧版本：

```CSS
@keyframes adjust {
    20%,
    40% {
        transform: translateX(100px);
    }
    80%,
    100% {
        transform: translateX(150px);
    }
}

.element {
    transform-origin: 50% 50%;
    transform: translateX(50px) rotate(45deg);
    animation: adjust 5s linear infinite alternate;
    
    &.replace {
        animation-composition: replace;
    }
    &.add {
        animation-composition: add;
    }
    &.accumulate {
        animation-composition: accumulate;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/oNmJVWg

三种取值的效果对比：

- `replace`：`adjust` 动画的 `20%` 和 `40%` 关键帧中 `transform` 的最终效果值是 `translateX(100px)`（完全替换底层值 `translateX(50px) rotate(45deg)`）。元素从 `45deg` 旋转到 `0deg`，因为它从元素默认值动画到 `20%` 标记处的非旋转值。
- `add`：`20%` 和 `40%` 关键帧中 `transform` 的最终效果值是 `translateX(50px) rotate(45deg)` 然后是 `translateX(100px)`——元素先向右移动 `50px`、旋转 `45deg`，然后沿 `x` 轴再向右移动 `100px`。
- `accumulate`：`20%` 和 `40%` 关键帧中的最终效果值是 `translateX(150px) rotate(45deg)`——两个 `x` 轴平移值 `50px` 和 `100px` 被合并或"累积"在一起。

### 多动画合成的值列表规则

`animation-composition` 也可以设置以逗号分隔的多个值：

```CSS
.element {
    animation-composition: add, replace, accumulate;
}
```

它遵循与多动画相同的值分配规则。**值列表数量与动画数量相同**时，一一对应：

```CSS
.multi-animation {
    animation-name:fadeIn, rotateOut, bounceIn;
    animation-duration: 1s, 2s, 1s;
    animation-timing-function: linear, ease, ease-in-out;   
    animation-composition: add, replace, accumulate;
}
```

动画合成的值与动画一一对应：`fadeIn` 应用 `add`（叠加）、`rotateOut` 应用 `replace`（替代）、`bounceIn` 应用 `accumulate`（混合）：

> Demo 地址：https://codepen.io/airen/full/QWYzoMQ

**值列表少于动画数量**（只有一个值）时，所有动画共用该值：

```CSS
.multi-animation {
    animation-name:fadeIn, rotateOut, bounceIn;
    animation-duration: 1s;
    animation-timing-function: linear;  
    animation-composition: add; 
}
```

浏览器会将 `fadeIn`、`rotateOut` 和 `bounceIn` 三个动画的合成方式都设置为 `add`（叠加）：

> Demo 地址：https://codepen.io/airen/full/qBgLvPB

**值列表少于动画数量但有多个值**时，从第一个值开始循环：

```CSS
.multi-animation {
    animation-name:fadeIn, rotateOut, bounceIn;
    animation-duration: 1s, 2s;
    animation-timing-function: linear, ease-in-out;   
    animation-composition: add, accumulate;
}
```

- `fadeIn` 动画应用 `add`（叠加）
- `rotateOut` 动画应用 `accumulate`（混合）
- `bounceIn` 动画应用 `add`（叠加）——值列表只有两个值，`rotateOut` 已用完第二个值，`bounceIn` 从第一个值开始循环使用

> Demo 地址：https://codepen.io/airen/full/jOdXJGx

**值列表多于动画数量**时，多出来的值被忽略：

```CSS
.element.playing {
    animation-name:fadeIn, rotateOut, bounceIn;
    animation-duration: 1s, 2s,.3s,.4s,.5s;
    animation-timing-function: linear, ease-in-out,ease, ease-in, ease-out;   
    animation-composition: add, replace, accumulate, replace, add;
}
```

- `fadeIn` 动画应用 `add`
- `rotateOut` 动画应用 `replace`
- `bounceIn` 动画应用 `accumulate`

值列表中多出来的 `replace` 和 `add`（从右往左数的两个）直接被忽略：

> Demo 地址：https://codepen.io/airen/full/xxMmBXv

总结：多个动画合成的使用和多动画的使用一致——当在 `animation-*` 属性上指定多个逗号分隔的值时，它们按照 `animation-name` 出现的顺序应用于动画。**如果动画数量和合成数量不同，`animation-composition` 属性中列出的值将循环从第一个 `animation-name` 到最后一个 `animation-name`，直到所有动画都有分配的 `animation-composition` 值**。

### 多动画合成的执行过程

前文提到，多个动画应用在同一元素上且修改相同属性时，以最后一个动画中的属性为准。CSS 动画合成的出现打破了这一规则。通过一个简化示例理解多个动画合成如何影响元素的动画效果。先在元素上应用：

```CSS
.element {
    transform: translateX(50px);
}
```

元素沿 `x` 轴向右平移 `50px`，`translateX(50px)` 是 `transform` 的底层值。再给元素添加三个简单动画：

```CSS
@keyframes moveX {
    to {
        transform: translateX(100px);
    }
}

@keyframes rotate {
    to {
        transform: rotate(45deg);
    }
}

@keyframes moveY {
    to {
        transform: translateY(200px);
    }
}

.element {
    animation: 
        moveX 1s linear infinite alternate,
        rotate 1s linear infinite alternate,
        moveY 1s linear infinite alternate;
    animation-composition: add, replace, accumulate;
}
```

> Demo 地址：https://codepen.io/airen/full/mdvaoqO

整个动画效果的分解如下：

- 元素默认设置 `transform: translateX(50px)`，即浅蓝色正方形从红色虚线框向右移动 `50px`，这是 `transform` 的底层值。
- 元素设置了三个动画 `moveX`、`rotate` 和 `moveY`，三个动画的 `to` 关键帧都重新对 `transform` 属性设置值，分别是 `translateX(100px)`、`rotate(45deg)` 和 `translateY(200px)`；执行顺序是 `moveX`、`rotate`、最后 `moveY`。
- `animation-composition: add, replace, accumulate` 分别给三个动画设置合成模式：`add`（叠加）、`replace`（替代）和 `accumulate`（混合）。
- `moveX` 的合成模式是 `add`：动画执行到 `to` 关键帧时，对应的 `transform` 与底层 `transform` 相叠加，效果值变成 `translateX(50px) translateX(100px)`。
- 接着执行 `rotate` 动画，合成模式是 `replace`：执行到 `to` 关键帧时，对应的 `transform` 值直接替换 `moveX` 合成后的效果值，此时效果值变成 `rotate(45deg)`。
- 最后执行 `moveY` 动画，合成模式是 `accumulate`：执行到 `to` 关键帧时，对应的 `transform` 值与 `rotate` 合成后的值相混合，效果值变成 `translateY(200px) rotate(45deg)`。

将所有动画只播放一次并停留在结束位置，最终结果与分解描述一致：

> Demo 地址：https://codepen.io/airen/full/NWoeJwX

如此一来，可以更进一步使用 `animation-composition` 控制动画，制作出效果更佳的动画。

## CSS 动画合成的用例

::: info 核心认知
> CSS 动画合成 `animation-composition` 属性用于确定当多个动画同时影响相同属性时应该发生什么情况。它主要用于控制多个动画如何组合它们的效果，特别是当它们影响相同的 CSS 属性时。

使用时需要避免一个误区：CSS 动画合成并不是把多个动画合在一起，而是多个动画应用到同一个元素并影响同一个属性时，决定元素属性值如何变化。
:::

以模态框（`dialog`）动画为例。通常使用下面的 CSS 代码让模态框在视窗中水平垂直居中：

```CSS
.modal {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}
```

但为模态框添加动画效果时，可能在 `@keyframes` 中用到元素的 `transform` 属性：

```CSS
@layer modal {
    @keyframes bounceInDown {
        from,
        60%,
        75%,
        90%,
        to {
            animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
        }
    
        0% {
            opacity: 0;
            transform: translate3d(0, -3000px, 0) scaleY(3);
        }
    
        60% {
            opacity: 1;
            transform: translate3d(0, 25px, 0) scaleY(0.9);
        }
    
        75% {
            transform: translate3d(0, -10px, 0) scaleY(0.95);
        }
    
        90% {
            transform: translate3d(0, 5px, 0) scaleY(0.985);
        }
    
        to {
            transform: translate3d(0, 0, 0);
        }
    }
    
    dialog {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: bounceInDown 0.28s cubic-bezier(0.215, 0.61, 0.355, 1) both;
    }
}
```

添加 `bounceInDown` 动效之后，模态框在动效结束时的位置也被改变了，没有在视窗中水平垂直居中——因为应用于模态框的 `transform` 不是最初设置的值（`transform: translate(-50%,-50%)`），而是被 `@keyframes` 最后一帧的 `transform` 值（`translate3d(0,0,0)`）覆盖了。

**解决方式一**：调整 `bounceInDown` 动画中每一帧的 `transform` 值，将居中偏移合并进每一帧：

```CSS
@layer modal {
    @keyframes bounceInDown {
        from,
        60%,
        75%,
        90%,
        to {
            animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
        }
    
        0% {
            opacity: 0;
            transform : translate3d (-50% , calc (-3000px - 50% ), 0 ) scaleY ( 3 );
        }
    
        60% {
            opacity: 1;
            transform : translate3d (-50% , calc ( 25px - 50% ), 0 ) scaleY ( 0.9 );
        }
    
        75% {
            transform : translate3d (-50% , calc (-10px - 50% ), 0 ) scaleY ( 0.95 );
        }
    
        90% {
            transform : translate3d (-50% , calc ( 5px - 50% ), 0 ) scaleY ( 0.985 );
        }
    
        to {
            transform : translate3d (-50% , -50% , 0 );
        }
    }
    
    dialog {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: bounceInDown 0.28s cubic-bezier(0.215, 0.61, 0.355, 1) both;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/JjxwzZo

**解决方式二**：使用单个变换属性替代 `transform` 属性：

```CSS
@layer modal {
    @keyframes bounceInDown {
        from,
        60%,
        75%,
        90%,
        to {
            animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
        }
    
        0% {
            opacity: 0;
            /* transform: translate3d(-50%, calc(-3000px - 50%), 0) scaleY(3); */
            translate: -50% calc(-3000px - 50%);
            scale: 1 3 1;
        }
    
        60% {
            opacity: 1;
            /* transform: translate3d(-50%, calc(25px - 50%), 0) scaleY(0.9); */
            translate: -50% calc(25px - 50%);
            scale: 1 .9 1;
        }
    
        75% {
            /*transform: translate3d(-50%, calc(-10px - 50%), 0) scaleY(0.95); */
            translate: -50% calc(-10px - 50%);
            scale: 1 .95 1;
        }
    
        90% {
            /* transform: translate3d(-50%, calc(5px - 50%), 0) scaleY(0.985); */
            translate: -50% calc(5px - 50%);
            scale: 1 .985 1;
        }
    
        to {
            /*transform: translate3d(-50%, -50%, 0); */
            translate: -50% -50%; 
        }
    }
    dialog {
        position: absolute;
        top: 50%;
        left: 50%;
        /* transform: translate(-50%, -50%); */
        translate: -50% -50%;
        animation: bounceInDown 0.28s cubic-bezier(0.215, 0.61, 0.355, 1) both;
    }
}
```

使用单个变换属性也能获得相同的模态框效果：

> Demo 地址：https://codepen.io/airen/full/GRzPeGm

**解决方式三**：使用 CSS 动画合成。不对动画中每一帧的 `transform` 做调整，只在 `dialog` 元素上新增 `animation-composition` 属性并指定其值为 `add`：

```CSS
@layer modal {
    @keyframes bounceInDown {
        from,
        60%,
        75%,
        90%,
        to {
            animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
        }
    
        0% {
            opacity: 0;
            transform: translate3d(0, -3000px, 0) scaleY(3);
        }
    
        60% {
            opacity: 1;
            transform: translate3d(0, 25px, 0) scaleY(0.9);
        }
    
        75% {
            transform: translate3d(0, -10px, 0) scaleY(0.95);
        }
    
        90% {
            transform: translate3d(0, 5px, 0) scaleY(0.985);
        }
    
        to {
            transform: translate3d(0, 0, 0);
        }
    }
    
    dialog {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: bounceInDown 0.28s cubic-bezier(0.215, 0.61, 0.355, 1) both;
        animation-composition: add;
    }
}
```

最终效果符合预期：

> Demo 地址：https://codepen.io/airen/full/XWOoGYw

::: tip
在这个示例中，将 `animation-composition` 的值改成 `accumulate` 也能得到同样的效果。
:::

在此基础上还可以给模态框添加新的动画，例如 `swing`：

```CSS
@keyframes swing {
    20% {
        transform: rotate3d(0, 0, 1, 15deg);
    }

    40% {
        transform: rotate3d(0, 0, 1, -10deg);
    }

    60% {
        transform: rotate3d(0, 0, 1, 5deg);
    }

    80% {
        transform: rotate3d(0, 0, 1, -5deg);
    }

    to {
        transform: rotate3d(0, 0, 1, 0deg);
    }
}

dialog {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    transform-origin: top center;
    animation: 
      bounceInDown 0.28s cubic-bezier(0.215, 0.61, 0.355, 1) both,
      swing .2s cubic-bezier(0.215, 0.61, 0.355, 1) .28s both;
    animation-composition: add;
}
```

打开模态框的动画效果又将呈现另一种形态：

> Demo 地址：https://codepen.io/airen/full/mdvaojW

借助动画合成，[Animate.css](https://animate.style/) 提供的 CSS 动画效果可以随意组合地应用于动画元素上。再来看一个示例，将 `zoomIn`、`lightSpeedInLeft` 和 `heartBeat` 三个动画用于模态框：

```CSS
@layer modal {
    @keyframes zoomIn {
        from {
            opacity: 0;
            transform: scale3d(0.3, 0.3, 0.3);
        }
    
        50% {
            opacity: 1;
        }
    }
    
    @keyframes heartBeat {
        0% {
            transform: scale(1);
        }
    
        14% {
            transform: scale(1.3);
        }
    
        28% {
            transform: scale(1);
        }
    
        42% {
            transform: scale(1.3);
        }
    
        70% {
            transform: scale(1);
        }
    }
    
    @keyframes lightSpeedInLeft {
        from {
            transform: translate3d(-100%, 0, 0) skewX(30deg);
            opacity: 0;
        }
    
        60% {
            transform: skewX(-20deg);
            opacity: 1;
        }
    
        80% {
            transform: skewX(5deg);
        }
    
        to {
            transform: translate3d(0, 0, 0);
        }
    }
    
    dialog {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        transform-origin: top center;
        animation: 
            lightSpeedInLeft 0.28s ease-out both, 
            zoomIn 0.2s linear both,
            heartBeat 1.3s cubic-bezier(0.215, 0.61, 0.355, 1) 0.28s both;
        animation-composition: add, accumulate, add;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/ZEwVPjw

## 小结

可以给同一个元素应用多个动画，并通过调整多个动画的相关参数（持续时间、延迟时间和顺序等）将多个动画串联或并行运行，使它们协同工作，创造更复杂生动的整体效果，这对实现复杂的动画交互非常关键。

多个动画能创建复杂、更有创意的动画，但存在缺陷：在同一个元素上使用多个 CSS 动画除性能问题和维护调试困难外，还会增加冲突，甚至让动画不可控、造成混乱。CSS 动画合成（`animation-composition`）可以进一步改善和优化多个动画。

CSS 动画合成对处理多个影响相同属性的动画非常有用：它允许按需控制动画之间的相互作用。`animation-composition` 属性通常与多个动画一起使用，动画的应用顺序由 `animation-name` 属性决定，`animation-composition` 的值按 `animation-name` 中列出的顺序应用。通过选择合适的 `animation-composition` 值（`replace`、`add`、`accumulate`），可以精确控制多个动画之间的效果叠加和组合方式，创建复杂而精彩的动画效果。
