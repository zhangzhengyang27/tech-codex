---
title: 如何使用 animation-direction 更好的控制动画方向
description: "animation-direction 属性详解：动画方向引发的问题、normal/reverse/alternate/alternate-reverse 四个取值的行为，以及动画方向对缓动函数与填充模式的影响和三次贝塞尔曲线反转技巧。"
keywords: [如何使用, 更好的控制动画方向]
category: CSS
tags: [CSS, 布局, 动画, 响应式]
---


# 如何使用 animation-direction 更好的控制动画方向

## 概念说明

任何物体的运动都是有方向的，CSS 动画也是如此。Web 开发者可以使用 `animation-direction` 属性来控制动画的方向。对许多 Web 设计师和开发者而言，如何精确地掌控动画的方向是一个挑战，掌握 `animation-direction` 属性的使用技巧是提升动画质量的一项重要技能。

随着 Web 技术不断演进，动画方向的控制变得愈发灵活。`animation-direction` 属性作为 CSS 动画中的关键一环，提供了多种取值，影响着动画的表现形式和视觉效果。深入理解 `animation-direction`，可以更好地应对动画方向的需求，创建出更为出色和引人注目的用户界面。

## 动画因方向存在的问题

在详细介绍 `animation-direction` 之前，先看几个因动画方向而给用户带来不好体验，或者说因动画方向而变得不够精致的真实案例。

### 案例一：过渡与动画的反转差异

使用 CSS 制作一个旋转动效再容易不过了，既可以使用 CSS 的 `transition` 来制作，也可以使用 CSS 的 `animation` 来制作：

```CSS
/* CSS Transition */
@layer transition {
    .sun {
        .transition & {
            transition: rotate 3s linear;
        }
        
        .transition:hover & {
            rotate: 360deg;
        }
    }
}

/* CSS Animation */
@layer animation {
    @keyframes rotate {
        to {
            rotate: 360deg;
        }
    }
  
    .animation:hover .sun {
        animation: rotate 3s linear;
    }
}
```

不管过渡动画还是关键帧动画，当用户鼠标悬停在"太阳"上时，太阳都会以恒速绕着自己的中心位置顺时针旋转 `360deg`：

> Demo 地址：https://codepen.io/airen/full/LYqXJwJ

差异出现在鼠标移出时：使用 CSS `transition` 制作的旋转动画，当用户鼠标移出"太阳"时，它会以相反方向旋转（逆时针）回到初始位置（`rotate: 0`），整个过程都具有平滑的动画效果；而 CSS `animation` 制作的旋转动画则不同——当用户鼠标移出"太阳"时，它会立即停止动画，并瞬间回到初始位置。

相比之下，CSS 过渡动画的反转效果更自然，体验更好。当然，使用 `animation` 也能实现相似的反转动画效果，只是要费一些时间：

```HTML
<div class="sun--wrapper">
    <div class="sun"></div>
</div>
```

```CSS
@layer animation {
    @keyframes rotate {
        to {
            rotate: 360deg;
        }
    }
    
    .sun--wrapper {
        transform-origin: center;
        animation: rotate 3s linear infinite reverse running;
    }

    .animation:hover {
        .sun--wrapper {
            animation-play-state: paused;
        }
    
        .sun {
            animation: rotate 3s linear infinite;
        }
    }
}
```

> Demo 地址：https://codepen.io/airen/full/YzBRJVo

虽然反转动画效果已经很平滑，但上面这个示例仍有一定局限：`.sun--wrapper` 元素上应用的动画默认是播放状态。如果该元素上动画默认是暂停状态，上面的代码就无法满足需求。要改变这种现状，需要借助 JavaScript 脚本以及多个关键帧动画：

```CSS
@layer animation {
    @keyframes rotateIn {
        to {
            rotate: 360deg;
        }
    }

    @keyframes rotateOut {
        to {
            rotate: -360deg;
        }
    }

    .sun {
        animation: var(--animn, none) 3s linear var(--animic, 1);
    }
}
```

```JavaScript
const animated = document.querySelector('.animation');
const sun = document.querySelector('.sun');

animated.addEventListener('mouseover',() => {
    sun.style.setProperty('--animn', 'rotateIn');
    sun.style.setProperty('--animic', 'infinite');
})

animated.addEventListener('mouseleave',() => {
    sun.style.setProperty('--animn', 'rotateOut');
    sun.style.setProperty('--animic', '1');
})
```

> Demo 地址：https://codepen.io/airen/full/eYxQQJx

这类场景在 Web 上很常见。也就是说，大多数制作反转动画效果的时候都是通过多个关键帧动画来实现的，即分离动画的 `@keyframes`，这也是一种最佳实践。例如下面这个示例，在"加号"按钮点击时显示菜单，然后在下一次点击时隐藏它：

> Demo 地址：https://codepen.io/airen/full/wvNQREV

```CSS
@layer animation {
    @keyframes handler {
        0% {
            rotate: 0deg;
            scale: 1;
        }
        20% {
            rotate: 60deg;
            scale: 0.93;
        }
        55% {
            rotate: 35deg;
            scale: 0.97;
        }
        80% {
            rotate: 48deg;
            scale: 0.94;
        }
        100% {
            rotate: 45deg;
            scale: 0.95;
        }
    }
     
    @keyframes handler-reverse {
        0% {
            rotate: 45deg;
            scale: 0.95;
        }
        20% {
            rotate: -15deg;
        }
        55% {
            rotate: 10deg;
        }
        80% {
            rotate: -3deg;
        }
        100% {
            rotate: 0;
            scale: 1;
        }
    }
 
    @keyframes bounceInUp {
        from,
        60%,
        75%,
        90%,
        to {
            animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
        }
    
        0% {
            opacity: 0;
            translate: 0 3000px;
            scale: 1 1;
        }
    
        60% {
            opacity: 1;
            translate: 0 -25px;
            scale: 0.95 1.05;
        }
    
        75% {
            translate: 0 10px;
            scale: 1.05 0.95;
        }
    
        90% {
            translate: 0 -5px;
            scale: 1 0.985;
        }
    
        to {
            translate: 0 0;
            scale: 1 1;
            opacity: 1;
        }
    }

    @keyframes bounceOutDown {
        0% {
            translate: 0 0;
            scale: 1 1;
            opacity: 1;
        }
    
        60% {
            translate: 0 -5px;
            scale: 1 0.985;
        }
    
        75% {
            translate: 0 10px;
            scale: 1.05 0.95;
        }
    
        90% {
            opacity: 1;
            translate: 0 -25px;
            scale: 0.95 1.05;
        }
    
        to {
            opacity: 0;
            translate: 0 3000px;
            scale: 1 1;
        }
    }

    .menu {
        opacity: 0;
        animation: bounceOutDown 0.4s ease-out forwards;
    }

    .handler {
        animation: handler-reverse 0.4s ease-out forwards;
    }

    input[type="checkbox"]:checked ~ .handler {
        animation: handler 0.4s ease-out forwards;
    }

    input[type="checkbox"]:checked ~ .menu {
        animation: bounceInUp 0.4s ease-in both 0.1s;
    }
}
```

值得思考的是：这几个动画明显是相互反转的，为什么不直接使用 CSS 的 `animation-direction` 来实现？这个问题在后文的"反向播放：reverse"一节中会给出答案。

### 案例二：颜色循环动画的突变

再来看一个更简单的示例。给一个元素做动画化改变其背景颜色的动画，例如从 `#cc0` 到 `#079`：

```CSS
@layer animation {
    @keyframes color {
        from {
            background: #cc0;
        }
        to {
            background: #079;
        }
    }

    body {
        animation: color 3s infinite;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/QWYJoQV

不难发现，从新迭代的结束状态到开始状态的变化相当突然。如果将该动画用线性图来描述，随着时间的推移，进展大致如下（显示四次迭代）：

可以通过更改关键帧来减轻这种情况，但更好的方式是使用 `animation-direction` 属性，在迭代时改变动画方向，使其更加平滑。

## 动画方向是什么

一个常被提及的观点是："越接近现实生活物体运动特征的动画，其效果就越逼真"。CSS 动画与现实生活中物体运动是相似的，它也有方向特征。例如五星级酒店大堂的自动滑门：当有客人靠近时，门会自动打开；当客人离开时，门会自动关闭。

要通过 CSS 动画让门的打开和关闭过程更加平滑，就可以使用 CSS 的 `animation-direction` 属性来控制。该属性用于设置动画应正向播放、反向播放，还是在正向和反向之间交替播放。

`animation-direction` 提供了四个不同的值，允许动画设置不同的方向：

-   `normal`：默认值，动画应正向播放
-   `reverse`：动画应反向播放
-   `alternate`：动画应交替播放，重复从正向到反向
-   `alternate-reverse`：动画应交替反向播放，重复从反向到正向

> Demo 地址：https://codepen.io/airen/full/QWYzNxv

继续以自动滑门为例：

```HTML
<div class="door">
    <div class="door--left" data-animation style="--animn: doorLeft; --animdir: normal"></div>
    <div class="door--right" data-animation style="--animn: doorRight; --animdir: normal"></div>
</div>
```

```CSS
@layer animation {
    @keyframes doorLeft {
        to {
            translate: -80%;
        }
    }
  
    @keyframes doorRight {
        to {
            translate: 80%;
        }
    }

    [data-animation] {
        animation: 
            var(--animn, none) 
            var(--animdur, 5s) 
            var(--animf, linear)
            var(--animic, infinite) 
            var(--animdir, normal);
    }
}
```

如果希望有人靠近大门时以正常方向打开（左侧的门向左，右侧的门向右），然后在人离开时以相同的方向关闭，只需要将 `--animdir` 设置为 `normal` 即可（`animation-direction: normal`）：

> Demo 地址：https://codepen.io/airen/full/MWLZyzQ

大门打开时符合日常生活中的现象（左侧门向左推，右侧门向右推）；但关闭时效果并不符合——示例中两扇门会立即回到最初状态。这是因为动画的 `animation-direction` 设置为 `normal`，表示动画按关键帧的正常顺序播放。而现实中大门关闭时，左侧门应该向右推，右侧门应该向左推。

也就是说，需要的动画效果是：门在有人靠近时以正常方向打开（左侧门向左，右侧门向右），在人离开时以相反方向关闭（左侧门向右，右侧门向左）。这时需要将 `animation-direction` 属性的值设置为 `alternate`，即 `--animdir: alternate`：

> Demo 地址：https://codepen.io/airen/full/PoVXzqW

这才更符合现实生活中开门和关门的效果。

## 如何掌控动画的方向

为了准确使用 `animation-direction` 属性掌控 CSS 动画的方向，需要一个基础的动画示例。以下基于一个动画元素从左向右移动的效果来展开：

```CSS
@keyframes move {
    from {
        translate: 0;
    }
    to {
        translate: 60vw;
    }
}

.animated {
    animation: move 4s linear infinite var(--animdir, normal);
}
```

> Demo 地址：https://codepen.io/airen/full/OJdrXXm

### 正向播放：normal

`animation-direction` 属性的值为 `normal` 时，动画将根据关键帧中指定的内容进行播放：

```CSS
.animated {
    animation-direction: normal;
}
```

这是 CSS 动画的正常播放方向，也称为"正向播放"：

> Demo 地址：https://codepen.io/airen/full/eYxbdqW

动画在每个循环中正向播放。换句话说，每次动画循环时，动画将重置为起始状态并重新开始。即动画如果重复播放，每次播放都会返回到关键帧的 `0%` 位置。动画正向播放（`animation-direction: normal`）时，每次循环播放的开始都在关键帧的 `0%` 位置，结束都在关键帧的 `100%` 位置。

通常情况下，如果对动画播放方向没有明确的要求，都会使用默认方向，即正向播放。

### 反向播放：reverse

反向播放指的是动画在每个循环中以相反的方向播放。以上面的示例为例，默认情况下动画元素 `.animated` 从左往右移动；将 `animation-direction` 设置为 `reverse` 时，动画则以相反的方向播放，即动画元素 `.animated` 从右向左移动：

```CSS
.animated {
    animation-direction: reverse;
}
```

> Demo 地址：https://codepen.io/airen/full/dyawORa

从效果上看，反向播放（`reverse`）刚好与正向播放（`normal`）相反：

> Demo 地址：https://codepen.io/airen/full/OJdrbxy

当动画播放方向为反向播放时，每次动画循环时，动画将重置为结束状态并重新开始。换句话说，动画每次会从关键帧的 `100%` 开始，到 `0%` 结束。

反向播放 `reverse` 非常适合动画以相反方向播放的场景。它的优势是可以基于同一个 `@keyframes`，使动画具有不同方向的播放效果，比如下面这个无限滚动的照片墙效果：

> Demo 地址：https://codepen.io/airen/full/mdvaRMR

示例中第二列的播放方向与其他两列相反。只需要创建一个 `@keyframes`，并将第二列的动画播放方向设置为反向播放即可：

```HTML
<div class="gallery">
    <div class="gallery__column">
        <!-- 第一列，正向播放 -->
    </div>
    <div class="gallery__column galler--reverse">
        <!-- 第二列，反向播放 -->
    </div>
    <div class="gallery__column">
        <!-- 第三列，正向播放 -->
    </div>
</div>
```

```CSS
@layer animation {
    @keyframes slide {
        to {
            translate: 0 -50%;
        }
    }

    .gallery__column {
        animation: slide 30s linear infinite; /* 正向播放，animation-direction 默认为 normal */
    
        &:hover {
          animation-play-state: paused;
        }
    }

    /* 反向播放 */
    .gallery--reverse {
        animation-direction: reverse;
    }
}
```

它同样可以应用于水平方向无限滚动的动画效果中：

> Demo 地址：https://codepen.io/airen/full/OJdrWwz

上面示例在同一个关键帧动画的基础上，仅改变动画播放方向，就实现了从右向左或从左往右无限滚动的动画效果：

```CSS
@layer animation {
    @keyframes scroll {
        to {
            translate: calc(-50% - 0.5rem);
        }
    }
    
    /* 默认正向播放，从右往左滚动 */
    [data-animation] {
        animation: scroll 20s linear infinite var(--animdir, normal);
    }
    
    /* 反向播放，从左往右滚动 */
    [data-direction="reverse"] {
        --animdir: reverse;
    }
}
```

反向播放有时也可以制作一些带有创意的交互效果。例如下面这个用户头像边框动画效果，默认它是顺时针旋转、改变圆锥渐变的角度；在悬浮状态下使动画反向播放，用户鼠标悬停在头像上时，头像边框的渐变就会反向旋转：

> Demo 地址：https://codepen.io/airen/full/mdvaWOL

```CSS
@layer animation {
    @keyframes a {
        to {
            --a: 1turn;
        }
    }
  
    .avatar {
        animation: a 2s linear infinite var(--animdir, normal);
    
        &:hover {
            --animdir: reverse; /* 反向播放 */
        }
    }
}
```

需要注意的是，有些场景下直接将 `animation-direction` 设置为 `reverse` 使动画反向播放，并不是期望的效果。例如下面这个示例，无法直接通过 `animation-direction: reverse` 达到预期的动画效果：

> Demo 地址：https://codepen.io/airen/full/wvNRemy

这种情境之下，要实现期望的反转动画效果，就需要使用多个 `@keyframes` 来创建动画：

```CSS
@layer animation {
    @keyframes lineScaleIn {
        from {
            scale: 0 1;
        }
        to {
            scale: 1 1;
        }
    }

    @keyframes lineScaleOut {
        from {
            scale: 1 1;
        }
        to {
            scale: 0 1;
        }
    }

    @keyframes buttonBounceIn {
        0% {
            scale: 0;
            opacity: 0;
        }
        50% {
            scale: 1.2;
            opacity: 0.3;
        }
        75% {
            scale: 0.9;
            opacity: 0.7;
        }
        100% {
            scale: 1;
            opacity: 1;
        }
    }

    @keyframes buttonBounceOut {
        0% {
            scale: 1;
            opacity: 1;
        }
        50% {
            scale: 0.9;
            opacity: 0.7;
        }
        75% {
            scale: 1.2;
            opacity: 0.3;
        }
        100% {
            scale: 0;
            opacity: 0;
        }
    }
    
    @keyframes a {
        to {
            --a: 1turn;
        }
    }
    
    .avatar {
        animation: a 2s linear infinite var(--animdir, normal);
    
        &:hover {
            --animdir: reverse;
        }
    }

    .running {
        .line {
            transform-origin: left center;
            animation: lineScaleIn 1s linear both;
            scale: 0 1;
        }
        & button {
            transform-origin: center;
            animation: buttonBounceIn 1s linear both 0.5s;
            scale: 0;
            opacity: 0;
        }
        & li:nth-child(2) {
            .line {
                animation-delay: 2s;
            }
            & button {
                animation-delay: 3s;
            }
        }
    
        & li:nth-child(3) {
            .line {
                animation-delay: 4s;
            }
            & button {
                animation-delay: 5s;
            }
        }
    
        & li:nth-child(4) {
            .line {
                animation-delay: 6s;
            }
            & button {
                animation-delay: 7s;
            }
        }
    
        & li:nth-child(5) {
            .line {
                animation-delay: 8s;
            }
            & button {
                animation-delay: 9s;
            }
        }
    }

    /* 动画反向播放 */
    .reverse {
        .line {
            transform-origin: left center;
            animation: lineScaleOut 1s linear both 1s;
        }
        & button {
            transform-origin: center;
            animation: buttonBounceOut 1s linear both;
        }
    
        & li:nth-child(2) {
            .line {
                animation-delay: 3s;
            }
            & button {
                animation-delay: 2s;
            }
        }
    
        & li:nth-child(3) {
            .line {
                animation-delay: 5s;
            }
            & button {
                animation-delay: 4s;
            }
        }
    
        & li:nth-child(4) {
            .line {
                animation-delay: 7s;
            }
            & button {
                animation-delay: 6s;
            }
        }
    
        & li:nth-child(5) {
            .line {
                animation-delay: 9s;
            }
            & button {
                animation-delay: 8s;
            }
        }
    }
}
```

上面示例中，蓝色线条的展开和收缩分别使用 `lineScaleIn` 和 `lineScaleOut` 关键帧，每个按钮的展示与隐藏则使用 `buttonBounceIn` 和 `buttonBounceOut` 关键帧。

因此，将 `animation-direction` 属性设置为 `reverse`，并不能直接实现所有反向播放的动画效果。实际使用时应该根据具体的情境来决定，并做出正确的选择——这也回答了前文案例一中"为什么不直接使用 `animation-direction`"的疑问。

另外，当 `animation-direction` 属性设置为 `reverse` 时，动画反转播放的同时，时间函数也将被反转，例如 `ease-in` 时间函数将变为 `ease-out`。因此使用 `reverse` 反转动画播放时，如果时间函数不是 `linear`，需要考虑对时间函数也进行反转，否则制作的动画效果会略显突兀。在 CSS 中，可以使用三次贝塞尔曲线 cubic-bezier() 与 CSS 自定义属性相结合，快速构建反向缓动函数（后文详细介绍）。

### 交替播放：alternate

将 `animation-direction` 设置为 `alternate` 时，动画在每个循环中正反交替播放，第一次是正向播放，第二次是反向播放：

```CSS
.animated {
    animation-direction: alternate;
}
```

> Demo 地址：https://codepen.io/airen/full/JjxweoV

它看上去同时具备正向播放（`normal`）和反向播放（`reverse`）的行为：设置交替播放的动画，第一次播放行为类似于 `normal`，第二次播放行为类似于 `reverse`，此后依此类推：

> Demo 地址：https://codepen.io/airen/full/gOqZQaM

这意味着，动画循环的奇数次迭代按正常方向播放（正向播放），偶数次迭代按反方向播放（反向播放）。确定动画循环是奇数次还是偶数次的计数从 `1` 开始。

交替播放对制作交替类动画非常有用，最为典型的就是脉动动画效果（也称呼吸灯动画效果）。如果不使用交替播放，制作脉动动画一般会将第一帧和最后一帧设置为初始状态，在 `50%` 设置为结束状态：

```CSS
@keyframes pulse {
    from, to {
        scale: 1;
        opacity: 1;
    }
    
    50% {
        scale: 1.15;
        opacity: .9;
    }
}

#follow {
    animation: pulse 4s ease-in-out infinite;
}
```

> Demo 地址：https://codepen.io/airen/full/ExrGOMx

应用在用户头像右下角的按钮动画效果就像是在呼吸一样，不断重复一大一小的效果。

事实上，使用交替播放（即 `animation-direction: alternate`）可以在关键帧中只定义一个 `50%` 的帧来实现同样的动画效果：

```CSS
@keyframes pulse {
    50% {
        scale: 1.15;
        opacity: .9;
    }
}
```

这个技巧非常有用，可以提供与第一个或最后一个关键帧相同的回退效果，而无需在 `@keyframes` 规则中重复定义它们。当首尾帧的样式与已应用于元素的样式相同时，可以省略每个动画中的 `from` 和 `to` 关键帧，这样设计的动画效果看起来会更自然：

```CSS
@keyframes pulse {
    50% {
        scale: 1.15;
        opacity: .9;
    }
}

#follow {
    animation: pulse 2s ease-in-out infinite;
}
```

> Demo 地址：https://codepen.io/airen/full/GRzPwaM

它只是翻转了每个偶数次迭代，而不是在动画中同时具有两种状态（缩小和放大）。动画看起来更自然，是因为 `animation-direction: alternate` 也会反转反向迭代的时间（缓动）函数。

### 交替反向播放：alternate-reverse

交替反向播放 `alternate-reverse` 与交替播放 `alternate` 相反，它反转了 `alternate` 的播放方向：

```CSS
.animated {
    animation-direction: alternate-reverse;
}
```

> Demo 地址：https://codepen.io/airen/full/wvNRNJB

交替播放从"第一次：正向"开始，而交替反向播放从"第一次：反向"开始；此后正向重复播放偶数次，反向播放奇数次。也就是说，动画在每个循环中正反交替播放，奇数次是反向播放，偶数次是正向播放。确定循环是奇数还是偶数的计数从 `1` 开始。

结合 `animation-direction` 属性的四个值，可以总结出以下几点：

-   `normal` 和 `reverse` 两者的表现行为恰好相反；
-   `alternate` 和 `alternate-reverse` 两者的表现行为恰好相反；
-   `alternate` 同时具备 `normal` 和 `reverse` 两者的表现特征。

制作动画的过程中，如果需要制作一个反向动画，使用 `reverse` 较为方便；如果需要制作一个交替动画，使用 `alternate` 较为方便。

## 动画方向会影响动画哪些特性

CSS 的 `animation-direction` 除了用来设置动画播放方向，还会影响动画缓动函数和填充模式的相应表现。例如将 `animation-direction` 设置为 `reverse` 时，它除了使动画反向播放之外，也会反转缓动函数，例如 `ease-in` 会反转成 `ease-out`。

另外，`animation-direction` 取不同值时，对关键帧的第一帧和最后一帧有着决定性的影响，这也会影响 `animation-fill-mode` 的最终结果，尤其是 `animation-fill-mode` 取值为 `forwards` 和 `backwards` 的结果。这两方面是 `animation-direction` 最容易给初学者带来困惑的地方，也是动画效果不符合预期的关键因素，实际开发动画时遇到类似问题需要立即修复，或尽可能在开发过程中规避。

### 使用自定义属性反转缓动函数

通常情况下，如果缓动函数使用的是 `linear` 缓动函数，即使动画设置了反向播放（`animation-direction: reverse`），也不会对动画效果有任何影响——`linear` 缓动函数是一种恒速运动，不管从动画开始到结束，还是动画结束到开始，动画元素运动的速度都是相等的。

除 `linear` 之外，开发动画时尤其是涉及反向播放的动画效果时，就需要考虑缓动函数被反转时给动画效果带来的影响。以 Web 中很常见的幻灯片播放效果（轮播图）为例，它可以在两个方向运动：

-   点击左箭头，当前项目将向右滑出视图或容器，下一个项目将从左边滑入视图或容器；
-   点击右箭头，当前项目将向左滑出视图或容器，下一个项目将从右边滑入视图或容器。

构建这个轮播图时，大多数 Web 开发者可能会忽略一个细节：不管项目是从左向右滑入，还是从右向左滑入，都使用同一个自定义缓动函数。这样制作的轮播图滑动效果并不是最好的。要给用户更好的滑入滑出动画体验，不仅需要自定义缓动函数，还需要将其反转以获得正确的效果，这就需要反转三次贝塞尔曲线。听上去复杂，实际上相当简单。

先说明反转三次贝塞尔曲线的用途和作用。继续以轮播图为例：大部分开发者会通过 `animation-direction` 来反转滑出的项目：

```CSS
.slider--reversed {
    animation: slide 3s cubic-bezier(0.45, 0.25, 0.60, 0.95) reverse;
    
    /* 或者 */
    animation-direction: reverse;
}
```

但有一个问题：反转动画的同时也反转了缓动曲线！因此动画在一个方向上（比如从左往右滑入）看起来很棒，但在另一个方向（比如从右向左滑入）就完全不对了。

通过一个简单示例来模拟：紫色框模拟从左往右滑入，蓝色框模拟从右往左滑入。这两个元素使用相同的动画参数（帧动画、缓动函数、持续时间等），唯一不同的是蓝色框动画被反转了（设置了 `animation-direction: reverse`）：

```CSS
@layer animation {
    @keyframes slide {
        from {
            translate: 0;
        }
        to {
            translate: calc(60vw - 100% - 2rem);
        }
    }
    
    .box {
        animation: slide 3000ms cubic-bezier(0.42, 0.15, 0.22, 0.96) forwards;
    
        &:last-child {
            translate: calc(60vw - 100% - 2rem);
          
            animation: slide 3000ms cubic-bezier(0.45, 0.25, 0.60, 0.95) reverse forwards;
        }
    }
}
```

> Demo 地址：https://codepen.io/airen/full/ZEwyEzb

这两个动画给人的感觉完全不同：紫色框在早期加速，随着进展逐渐减速；蓝色框一开始相当缓慢，然后在突然减速之前迅速加速。这对轮播图来说是完全不对的感觉。

有两种方式可以让轮播图滑动效果变得更优雅：

-   创建一个新的关键帧动画用于滑出的项目，然后应用与之前相同的缓动函数。但对于更复杂的动画，在相反方向创建相同的动画需要更多的工作量，还容易出错；
-   使用相同的关键帧动画（带有 `animation-direction: reverse`），并反转缓动曲线，以便在两个方向上都获得相同的缓动。这个方案相对更简单，也不容易出错。

两种方案相比，第二种更适合。该方案的关键是掌握如何反转缓动函数。

简单地说，反转缓动函数意味着改变其方向或流动。反转一个 `cubic-bezier()` 函数涉及交换控制点：将曲线围绕其轴旋转 `180` 度，并找到新的坐标。

`cubic-bezier()` 函数的定义方式是 `cubic-bezier(P1x, P1y, P2x, P2y)`。假设初始的 `cubic-bezier()` 函数是 `cubic-bezier(0.42, 0, 1, 1)`（即 `ease-in`），那么它的反转函数则是 `cubic-bezier(0, 0, 0.58, 1)`（即 `ease-out`）。这种反转会将缓动效果从缓入变为缓出，反之亦然，实质上是在水平方向上翻转了曲线。

反转可以通过一些简单的数学运算实现，即交换坐标对并从 `1` 中减去每个值：假设 `cubic-bezier()` 的初始值是 `(x1, y1, x2, y2)`，那么反转之后的值是 `((1 - x2), (1 - y2), (1 - x1), (1 - y1))`。

在上面的示例中再添加一个动画元素 `.box`，它朝相反的方向滑动，但缓动函数被反转了，最终获得与第一个 `.box` 相同的动画感觉，不同的只是移动方向相反：

```CSS
@layer animation {
    @keyframes slide {
        from {
            translate: 0;
        }
        to {
            translate: calc(60vw - 100% - 2rem);
        }
    }
    
    .box {
        --c1: 0.420;
        --c2: 0.150;
        --c3: 0.220;
        --c4: 1.015;
        
        --c1-r: calc(1 - var(--c3));
        --c2-r: calc(1 - var(--c4));
        --c3-r: calc(1 - var(--c1));
        --c4-r: calc(1 - var(--c2));
        
        --normal: cubic-bezier(var(--c1), var(--c2), var(--c3), var(--c4));
        --reverse: cubic-bezier(var(--c1-r), var(--c2-r), var(--c3-r), var(--c4-r));
    
        animation: slide 3000ms var(--normal) forwards;

        &:nth-child(2) {
            translate: calc(60vw - 100% - 2rem);
            animation: slide 3000ms var(--normal) reverse forwards;
        }
        
        &:nth-child(3) {
            translate: calc(60vw - 100% - 2rem);
            animation: slide 3000ms var(--reverse) reverse forwards;
        }
    }
}
```

> Demo 地址： https://codepen.io/airen/full/WNPONmw

正如示例代码所示，可以使用 CSS 自定义属性来计算新的缓动函数。首先给初始的三次贝塞尔曲线 `cubic-bezier()` 的每个参数值分配一个变量：

```CSS
:root {
    --x1: .45;
    --y1: .25;
    --x2: .6;
    --y2: .95;
    
    --originalCurve: cubic-bezier(var(--x1), var(--y1), var(--x2), var(--y2));
}
```

然后使用这些变量计算新的值：

```CSS
:root {
    --x1: .45;
    --y1: .25;
    --x2: .6;
    --y2: .95;
    
    --originalCurve: cubic-bezier(var(--x1), var(--y1), var(--x2), var(--y2));
    --reversedCurve: cubic-bezier(calc(1 - var(--x2)), calc(1 - var(--y2)), calc(1 - var(--x1)), calc(1 - var(--y1)));
}
```

这样，对第一组变量进行任何更改时，反转的曲线都会自动计算。为了便于检查和调试代码，可以将这些新值拆分成独立的变量：

```CSS
:root {
    /* 原始值 */
    --x1: .45;
    --y1: .25;
    --x2: .6;
    --y2: .95;
    --originalCurve: cubic-bezier(var(--x1), var(--y1), var(--x2), var(--y2));
    
    /* 反转值 */
    --x1-r: calc(1 - var(--x2));
    --y1-r: calc(1 - var(--y2));
    --x2-r: calc(1 - var(--x1));
    --y2-r: calc(1 - var(--y1));
    --reversedCurve: cubic-bezier(var(--x1-r), var(--y1-r), var(--x2-r), var(--y2-r));
}
```

最后将新的曲线应用于反转动画：

```CSS
.animation {
    animation: slide 3s var(--originalCurve);
}
.animation--reversed {
    animation-timing-function: var(--reversedCurve);
    animation-direction: reverse;
}
```

为了帮助可视化，有一个用于计算 `cubic-bezier` 反转值的小工具，输入原始坐标值即可获取反转曲线：

> Demo 地址：https://codepen.io/airen/full/QWYgwbd

再看一个反转三次贝塞尔曲线的实际用例——用于构建轮播组件的滑动动画，该案例由 [@Michelle Barker](https://codepen.io/michellebarker/full/OaYpWp) 提供：

> Demo 地址：https://codepen.io/airen/full/JjxJoEw （来源于 [@Michelle Barker](https://codepen.io/michellebarker/full/OaYpWp) ）

```HTML
<div data-carousel>
    <ul class="slide__list Wallop-list">
        <li class="slide__item Wallop-item Wallop-item--current"></li>
        <li class="slide__item Wallop-item"></li>
        <!-- ... -->
        <li class="slide__item Wallop-item"></li>
    </ul>
</div>    
```

涉及动画方面的代码如下：

```CSS
.Wallop-item {
    /* 初始三次贝塞尔曲线*/
    --x1: 0.1;
    --y1: 0.67;
    --x2: 0.29;
    --y2: 0.98;
    --originalCurve: cubic-bezier(var(--x1), var(--y1), var(--x2), var(--y2));
    
    /* 反转后的三次贝塞尔曲线 */
    --reversedCurve: cubic-bezier(calc(1 - var(--x2)), calc(1 - var(--y2)), calc(1 - var(--x1)), calc(1 - var(--y1)));
    --length: 1300ms;
    visibility: hidden;
}

.Wallop-item--current {
    visibility: visible;
    position: relative;
}

.Wallop-item--current .slide__heading,
.Wallop-item--current .slide__quote,
.Wallop-item--current .slide__cite {
    animation: slideIn var(--length) forwards var(--originalCurve);
}

.Wallop-item--showPrevious .slide__heading,
.Wallop-item--showPrevious .slide__quote,
.Wallop-item--showPrevious .slide__cite {
    animation: slideOut var(--length) var(--delay) forwards reverse var(--reversedCurve);
}

.Wallop-item--showNext .slide__heading,
.Wallop-item--showNext .slide__quote,
.Wallop-item--showNext .slide__cite {
    animation: slideIn var(--length) var(--delay) forwards var(--originalCurve);
}

.Wallop-item--hidePrevious,
.Wallop-item--hideNext {
    --length: 500ms;
    visibility: visible;
}

.Wallop-item--hidePrevious .slide__heading,
.Wallop-item--hidePrevious .slide__quote,
.Wallop-item--hidePrevious .slide__cite {
    animation: slideOut var(--length) forwards var(--originalCurve);
}

.Wallop-item--hideNext .slide__heading,
.Wallop-item--hideNext .slide__quote,
.Wallop-item--hideNext .slide__cite {
    animation: slideIn var(--length) forwards reverse var(--reversedCurve);
}

@keyframes slideIn {
    0% {
        transform: translate3d(50%, 0, 0);
        opacity: 0;
    }
    100% {
        transform: translate3d(0, 0, 0);
        opacity: 1;
    }
}
@keyframes slideOut {
    0% {
        transform: translate3d(0, 0, 0);
        opacity: 1;
    }
    100% {
        transform: translate3d(-50%, 0, 0);
        opacity: 0;
    }
}
```

可以采用相似方法优化轮播图组件的动画效果。

### 动画播放方向对动画填充模式的影响

通常情况下，动画填充模式中的"向前"模式（`forwards`）总是使用 `100%` 关键帧，"向后"模式（`backwards`）总是使用 `0%` 关键帧，但实际上并不总是如此。因为关键帧的 `0%` 和 `100%` 会受到 CSS 的 `animation-direction` 和 `animation-iteration-count` 属性值的影响，动画的第一个关键帧实际上可能不是 `0%`，最后一个关键帧也可能不是 `100%`。

先看一个使用 `backwards` 但 `animation-direction` 设置为 `reverse` 的简单示例：

```CSS
@layer animation {
    @keyframes ani {
        0% {
            background: lime;
            translate: -300px;
        }
        100% {
            background: yellow;
            translate: 300px;
        }
    }

    .animated {
        animation: ani 5s linear backwards reverse;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/rNPqpPp

动画的方向被反转后（`animation-direction: reverse`），动画的第一个关键帧是 `100%`，这意味着动画开始之前元素使用了 `100%` 关键帧的样式。这就是动画元素一开始就位于右侧 `300px`（即 `translate: 300px`）且背景色为 `yellow`，然后慢慢向左移动、背景色慢慢变成 `lime` 色，最后跳到 `0` 位置（`translate: 0`）且背景色跳回红色（`red`）的原因。

也就是说，当 `animation-direction` 为 `normal` 或 `alternate` 时，关键帧第一帧为 `0%` 或 `from`；当 `animation-direction` 属性的值为 `reverse` 或 `alternate-reverse` 时，关键帧的第一帧为 `100%` 或 `to`：

> Demo 地址：https://codepen.io/airen/full/abXRqoa

使用反向动画时，`forwards` 填充模式也会出现类似的问题；使用多次迭代的交替动画也可能导致结束关键帧不是 `100%`。以下示例中 `animation-direction` 设置为 `alternate`，`animation-iteration-count` 设置为 `2`：

```CSS
@layer animation {
    @keyframes ani {
        0% {
            background: lime;; 
            translate: -300px;
        }
        100% {
            background: yellow;
            translate: 300px;
        }
    }

    .animated {
        animation: 
            var(--animn, ani) 5s linear var(--animdel, 0s) 
            var(--animfm, forwards) var(--animps, paused) 
            var(--animic, 2) var(--animdir, alternate);  
    }
}
```

> Demo 地址：https://codepen.io/airen/full/BaMqYjL

在这个示例中，完成整个动画之后，动画元素一直保持着向左移了 `300px`（`translate: -300px`）且背景色为 `lime` 的样式。这是因为该动画的最后一个关键帧是 `0%`——动画运行了两次，第一次迭代从 `0%` 到 `100%`，第二次迭代从 `100%` 到 `0%`。

动画结束时，`forwards` 指定动画元素应用关键帧最后一帧的样式规则，但关键帧最后一帧会受到 `animation-direction`（动画运动方向）和 `animation-iteration-count`（播放次数）的影响：

| **`animation-direction`** | **`animation-iteration-count`** | **关键帧最后一帧**   |
| ------------------------- | ------------------------------- | ------------- |
| `normal`                  | 偶数或奇数                           | `100%` 或 `to` |
| `reverse`                 | 偶数或奇数                           | `0%` 或 `from` |
| `alternate`               | 偶数                              | `0%` 或 `from` |
| `alternate`               | 奇数                              | `100%` 或 `to` |
| `alternate-reverse`       | 偶数                              | `100%` 或 `to` |
| `alternate-reverse`       | 奇数                              | `0%` 或 `from` |

> Demo 地址：https://codepen.io/airen/full/OJdBQQp

实践要点：注意动画的方向（`animation-direction`）和迭代次数（`animation-iteration-count`），确切知道动画第一个和最后一个关键帧是哪个，才能准确判断出动画填充模式最终会将哪个状态的样式应用到动画元素上：

> Demo 地址：https://codepen.io/airen/full/RwveQEo

## 小结

`animation-direction` 属性是 CSS 动画中一个关键的控制属性，它允许开发者更精确地定义动画的播放方向：

-   `normal`：正向播放，即从动画的起始状态到结束状态；
-   `reverse`：反向播放，即从动画的结束状态到起始状态，同时会反转缓动函数；
-   `alternate`：交替播放，奇数次迭代正向播放，偶数次迭代反向播放；
-   `alternate-reverse`：交替反向播放，与 `alternate` 相反，奇数次迭代反向播放，偶数次迭代正向播放。

精确控制动画方向不仅是技术层面的考虑，更是为了提升用户体验。动画能够吸引用户的注意力，交替的动画方向可以增加页面的动态感，使用户感觉页面更加生动有趣。例如在一个按钮点击后颜色交替变化的动画中，用户可以更直观地感知按钮的交互反馈，提高用户与页面的互动性。

在实际项目中合理运用 `animation-direction` 将有助于优化页面交互，提升用户体验。使用时需要注意它对缓动函数和填充模式的影响，通过结合不同的属性值和其他动画属性，才能创造出更富有创意和吸引力的交互元素。
