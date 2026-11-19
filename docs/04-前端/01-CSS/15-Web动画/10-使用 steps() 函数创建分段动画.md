---
title: 使用 steps() 函数创建分段动画
description: "steps() 是 CSS 步进缓动函数，它将动画分解为指定数量的离散步骤，而不是平滑过渡。本文介绍 steps() 的语法、jump-start/jump-end/jump-none/jump-both 参数的差异，以及精灵动画、时钟、频闪、打字机等典型用例。"
keywords: [使用, steps, 函数创建分段动画]
category: CSS
tags: [CSS, 布局, 动画, 响应式]
---


# 使用 steps() 函数创建分段动画

## 概念说明

在 CSS 动画和过渡中，通常使用平滑过渡从一个值过渡到另一个值，产生流畅的动画效果。但有时需要创建一种分段、定格的动画，而不是连续的过渡——这时就轮到 `steps()` 函数出场了。与传统的平滑过渡动画不同，`steps()` 函数使动画呈现出分明的离散步骤，丰富了动画的表现形式。

在 CSS 动画制作中，常用的缓动函数有 `linear`、`ease`、`ease-in`、`ease-out`、`ease-in-out` 和 `cubic-bezier()`，它们设置动画从一个状态（初始状态）到另一个状态（结束状态）的速率：

> Demo 地址：https://codepen.io/airen/full/wvNezro

然而，在 [CSS 规范](https://www.w3.org/TR/css-easing-1)中，还有一种较少为人知的缓动函数——步进缓动（也称阶梯缓动），即 **`steps()` 缓动函数**。它允许将动画分解成指定数量的步骤，而不是平滑地从一个状态过渡到另一个状态，即动画可以跳跃地从一个关键帧到另一个关键帧。

步进缓动函数 `steps()` 遵循一个简单的原则：**指定动画跳跃到达其最终值所需的步数**。例如一个动画的透明度 `opacity` 从 `0` 过渡到 `1` 用时 `1s`，分 `4` 步完成，那么动画元素的不透明度将在不同的时间点瞬间过渡到特定值：

```CSS
@layer animation {
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    .ball {
        animation: fadeIn 1s steps(5) infinite alternate;
    }
}
```

在这些预定义的值之间，不透明度保持静止，产生类似定格在时间中的快照效果：

> Demo 地址：https://codepen.io/airen/full/ZEwypMj

更明显的例子是类似 Twitter 点赞按钮的动画效果：

> Demo 地址：https://codepen.io/airen/full/LYqLRMP

再来看一个复杂场景，[@Julien Knebel 提供的一个使用 steps() 模拟《街头霸王2》的动画效果](https://codepen.io/jkneb/full/DRWdGg)：

> Demo 地址：https://codepen.io/jkneb/full/DRWdGg

标准的缓动函数使动画元素沿平滑的缓动曲线运动，而步进缓动函数 `steps()` 带有一种不寻常的气质：通过强制动画在设定的点之间跳跃，可以为项目注入一种突然的动感。步进缓动函数明确、量化的特性为创造性表达提供了可能，特别适用于需要明显、离散变化的情景——无论是打造独特的加载动画，还是为精灵注入生命（精灵动画），受控跳跃都为动画带来新的视角。

## 基本语法与参数

[W3C 规范](https://www.w3.org/TR/css-easing-1/#step-easing-functions)对步进缓动函数 `steps()` 的定义是：

> **`steps()`** **函数是一种缓动函数类型，将输入时间分为指定数量的等长间隔**。

步进函数 `steps()` 与其他缓动函数一样用于定义动画在其持续时间内的时间进度，区别在于它允许将动画或过渡分解为多个片段，而不是从一个状态到另一个状态的连续过渡——动画的变化是离散而非连续的。

`steps()` 函数接受两个参数：

```
steps() = steps(<integer>[, <step-position>]?)

<step-position> = jump-start | jump-end | jump-none | jump-both | start | end
```

它由步数（`<integer>`）和方向（`<step-position>`）两个参数组成：

-   **步数（** **`<integer>`** **）** ：指定动画应该分成多少个步骤。必须是大于 `0` 的正整数；除非第二个参数是 `jump-none`，在这种情况下必须是大于 `1` 的正整数
-   **方向（** **`<step-position>`** **）** ：可选参数，指定动画的方向，取值为 `jump-start`、`jump-end`、`jump-none`、`jump-both`、`start` 和 `end` 之一，默认是 `end`。该参数定义了在 `@keyframes` 中声明的动作将发生的时间点

`steps()` 的工作方式是在每个步骤中直接跳转到下一个状态，而不是平滑过渡，因此特别适用于模拟帧动画或其他需要离散状态变化的场景：

> Demo 地址：https://codepen.io/airen/full/QWYgdNe

上面示例展示了 `steps()` 函数与常用缓动函数的效果对比，差异一目了然。

## 在动画中使用 steps() 函数

`steps()` 是 CSS 缓动函数的一种，可用于 `transition-timing-function` 和 `animation-timing-function` 以及它们的简写属性 `transition` 和 `animation`：

```CSS
.transition {
    transition-timing-function: steps(5);
}

.animation {
    animation-timing-function: steps(5);
}
```

`steps()` 通过指定动画中的步数将动画分为不同的间隔，以分段方式控制动画的运动。例如：

```HTML
<div class="animated" style="--easing: linear">
    <!-- 动画运用 linear 缓动函数 -->
</div>

<div class="animated" style="--easing: steps(4)">
    <!-- 动画运用 steps() 缓动函数 -->
</div>
```

```CSS
@layer animation {
    @keyframes move {
        to {
            translate: 400px;
        }
    }
  
    .animated {
        animation: move 4s var(--easing) 1 both;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/LYqLWGM

`linear` 函数使动画平滑地从初始状态过渡到终点状态；而 `steps(4)` 函数将动画分为 `4` 个步骤，动画会在整个过程中跳跃，而不是平滑过渡。

就上面这个示例而言，`steps(4)` 函数使关键帧动画分了四段来执行，等效于在关键帧上手动分段：

```CSS
@keyframes move2 {
    0%, 24.9% {
        translate: 0;
    }
    
    /* 第一步 */
    25%,49.9% {
        translate: 100px;
    }
    
    /* 第二步 */
    50%,74.9% {
        translate: 200px;
    }
    
    /* 第三步 */
    75%,99.9% {
        translate: 300px;
    }
    
    /* 第四步 */
    100% {
        translate: 400px;
    }
}

.linear {
    animation: move2 4s var(--easing) 1 both;
}
```

> Demo 地址：https://codepen.io/airen/full/KKJqWZX

通过分段关键帧使 `linear` 缓动函数的运行行为类似于 `steps()` 是有局限性的：对于简单动画可以手工调整 `@keyframes`，但对于步数很多的动画，这种方式既繁琐又容易出错。分段跳跃式的动画正是 `steps()` 的优势所在。此外，`steps()` 还有第二个参数，用于指定动画在何处进行跳跃——这也是掌握 `steps()` 函数的关键和易混淆之处。

### 搞清楚 steps() 函数中的 start 和 end

`steps()` 函数的第一个参数指定动画分成多少段，第二个参数指定动画中动作将发生的时间点。第一个参数直观易懂，第二个参数（主要是 `start` 和 `end`）则常令人困惑。

第二个参数的取值有 `jump-start`、`jump-end`、`jump-none`、`jump-both`、`start` 和 `end`。其中 `start` 和 `end` 是 `steps()` 函数的原始值，`jump-start` 和 `jump-end` 分别是它们的别名：

```
jump-start === start
jump-end   === end
```

新增 `jump-` 前缀表示"跳过"，能更清晰地解释 `start` 和 `end`：使用 `start`（或 `jump-start`）表示跳过起始位置；使用 `end`（或 `jump-end`）表示跳过结束位置。

通过示例解释两者的差异。假设有一个动画沿 `x` 轴从 `0` 的位置移动到 `50vw`：

```CSS
@keyframes moveX {
    to {
        translate: 50vw;
    }
}
```

将 `moveX` 关键帧动画应用在 `.animated` 元素上，动画持续 `4s`，分四个步骤（`steps(4)`）完成：

```CSS
.animated {
    animation: moveX 4s steps(4);
}
```

`steps()` 未显式指定第二个参数时，其值是默认值 `end`（即 `jump-end`），因此上面的代码等同于：

```CSS
.animated {
    animation: moveX 4s steps(4, jump-end);
    
    /* 等同于 */
    animation: moveX 4s steps(4, end);
}
```

先回顾一下：如果 `moveX` 动画指定的缓动函数是 `linear`，其执行过程大致为：

-   第 `0s` 时（初始位置），动画元素位于 `0` 的位置，即 `translate: 0`
-   第 `1s` 时（执行了 `1s`），动画元素位于 `100px` 的位置，即 `translate: 100px`（从 `0` 移动到 `100px`）
-   第 `2s` 时（执行了 `2s`），动画元素位于 `200px` 的位置，即 `translate: 200px`（从 `100px` 移动到 `200px`）
-   第 `3s` 时（执行了 `3s`），动画元素位于 `300px` 的位置，即 `translate: 300px`（从 `200px` 移动到 `300px`）
-   第 `4s` 时（执行了 `4s`），动画元素位于 `400px` 的位置，即 `translate: 400px`（从 `300px` 移动到 `400px`）

使用 `steps(4, jump-end)` 或 `steps(4, jump-start)` 会将 `moveX` 动画分为四段（由第一个参数 `4` 决定），但第二个参数将决定 `moveX` 中声明的动作发生的时间点。两者的规范定义：

-   `start` 或 `jump-start` 表示一个左连续函数，动画的第一步将在动画开始时立即完成。它会立即跳到第一步的末尾，并一直保持在那里，直到这一步的持续时间结束。即使用 `start` 或 `jump-start` 时，跳过起始位置
-   `end` 或 `jump-end` 表示一个右连续函数，它指示元素保持不动，直到第一步的持续时间完成。即使用 `end` 或 `jump-end` 时，跳过结束位置

每个选项实质上都会将元素从不同的一侧移动，并为相同的动画产生不同的定位：

> Demo 地址：https://codepen.io/airen/full/NWogjgz

W3C 规范提供了一张时序图来解释 `start`（或 `jump-start`）和 `end`（`jump-end`）的差异。按规范时序图，`steps(4, jump-start)` 和 `steps(4, jump-end)` 的执行时序为：

-   `jump-start`（或 `start`）表示直接开始：时间刚开始，就已经执行了一个距离段。`steps(4, jump-start)` 将动画分成四段，起点被忽略，因为时间一开始就直接到了第二个点
-   `jump-end`（或 `end`）表示戛然而止：时间一结束，当前距离位移就停止。`steps(4, jump-end)` 将动画分成四段，结束点被忽略，因为等到要执行结束点时已经没有时间了

这里 `jump-end`（或 `end`）与 `jump-start`（或 `start`）所指的开始和结束是相对于时间（动画持续时间）而言的；若站在人类可感知的具体事物角度，两者却有相反的含义，可以这样理解：

-   `jump-start`（或 `start`）：表示结束。分段结束的时候，时间才开始走（动画才开始播放）。`steps(4, jump-start)` 动画执行的四个分段点是后四个点
-   `jump-end`（或 `end`）：表示开始。分段开始的时候，时间跟着一起走（动画开始播放）。`steps(4, jump-end)` 动画执行的四个分段点是前四个点

还可以将 `steps(n)` 函数视为：在指定间隔内使用线性缓动（`linear`）拍摄动画的快照，并在显示下一个快照之前一直显示该快照。因此 `steps(4, jump-end)` 得到的是一个将动画分成四个部分、拍摄每个部分初始位置的动画；`steps(4, jump-start)` 得到的是一个将动画分成四个部分、并在每个部分中拍摄最终位置的动画。

> Demo 地址：https://codepen.io/airen/full/oNmwqLG

正如上面 Demo 所呈现的，`steps(4, jump-start)` 有一个明显的空档（没有图片）。

### steps() 函数中的 jump-none

`jump-start`（或 `start`）和 `jump-end`（或 `end`）总是让动画跳过结束状态或开始状态。但有时希望动画不跳过初始或结束状态，这时 `steps()` 的新选项 `jump-none` 就派上用场了。

`jump-none` 允许动画不跳过开始或结束状态。对于任何至少有两个步骤的动画，起始状态和结束状态都将被表示，其余步骤均匀分布。三个步骤将在 `0%`、`50%` 和 `100%` 处分别拍摄它们的有效快照。

> 注意，`steps()` 函数第二个参数设置为 `jump-none` 时，它的步数必须大于 `1`，至少从 `2` 开始！

这个选项的典型应用是移动屏幕上的对象。将动画元素从点 `A`（`translate: 0`）移动到点 `B`（`translate: 50vw`）时，无论选 `jump-start` 还是 `jump-end`，动画总会跳过初始状态或结束状态，无法在起止位置之间显示相等的帧数。`jump-none` 可以实现这个目标：

```CSS
@keyframes moveX {
    0% {
        translate: 0;
    }
    
    100% {
        translate: 50vw;
    }
}

.animated {
    animation: moveX 4s steps(4, jump-none) infinite;
}
```

> Demo 地址：https://codepen.io/airen/full/YzBQaod

如上面 Demo 所示，`steps(4, jump-none)` 将动画分成四段，分别是 `0%`、`33.333%`、`66.667%` 和 `100%`。

同样可以用模拟快照的方式查看 `jump-none` 与 `jump-start`、`jump-end` 之间的差异：

> Demo 地址：https://codepen.io/airen/full/xxMrzrb

`jump-none` 非常适合淡出或淡入的动画效果。用 `steps()` 函数使动画元素的透明度从 `1` 过渡到 `0`（淡出）时，若第二个参数使用 `jump-start` 或 `jump-end`，完全不透明或完全透明的状态将永远不会被看到；而 `jump-none` 可以确保完全透明和完全不透明都可见。例如 `steps(2, jump-none)` 产生一个直接的开/关动画，可创建闪烁效果；`steps(4, jump-none)` 将元素的 `opacity` 分为四个状态：`1`、`.667`、`.33` 和 `0`：

```CSS
@keyframes fadeOut {
    form {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
}

.animation-1{
    animation: fadeOut 2s steps(2, jump-none) infinite; 
}

.animation-2 {
    animation: fadeOut 4s steps(4, jump-none) infinite;
}
```

> Demo 地址：https://codepen.io/airen/full/abXwKGO

### steps() 函数中的 jump-both

综上，`jump-start`、`jump-end`、`jump-none` 对动画元素状态的处理为：

-   `jump-start` 跳过初始状态
-   `jump-end` 跳过终点状态
-   `jump-none` 初始状态和终点状态都不跳过

有时制作动画时希望同时跳过初始状态和终点状态，这时 `jump-both` 就非常有用：它允许动画将初始状态和终点状态都跳过，并在此过程中将动画分成多段。

> Demo 地址：https://codepen.io/airen/full/NWogzeO

`steps(4, jump-both)` 将动画分成四段，跳过 `0%` 和 `100%`，动画的四个步骤点分别是 `20%`、`40%`、`60%` 和 `80%`。

`jump-both` 对应的快照方式如下：

> Demo 地址：https://codepen.io/airen/full/RwvgBpJ

### steps() 函数会受到哪些属性的影响

`steps()` 函数的最终表现结果会受到 `animation-fill-mode` 属性值的影响，而 `animation-fill-mode` 又会受到 `animation-direction` 和 `animation-iteration-count` 的影响。

假设动画的迭代次数为 `1`，改变 `animation-fill-mode` 的值，观察其对 `steps()` 呈现的影响：

```CSS
@layer animation {
    @keyframes move {
        to {
            translate: 50vw;
        }
    }
  
    .animated {
        --animation-fill-mode: none;
        animation: move 4s var(--easing) 1 var(--animation-fill-mode);
    }
}
```

> Demo 地址：https://codepen.io/airen/full/yLZXQyB

`move` 动画只执行一次（未设置 `infinite`）。以 `animation-fill-mode: forwards` 为例：`forwards` 表示关键帧动画结束后，动画元素的样式设置为动画最后一帧的样式。因此上面示例中的动画，无论缓动函数是 `linear` 还是 `steps()`（即使第二个参数不同），整个动画都会停止在关键帧 `move` 最后的状态（`translate: 50vw`）。对 `steps()` 函数而言，整个动画停止在第 `5` 个分段点上。

用快照的方式更易于理解：

> Demo 地址：https://codepen.io/airen/full/GRzEBXz

`animation-fill-mode` 的 `forwards` 值会使动画元素将样式从 `@keyframes` 的最后一帧（通常是 `100%`）延伸到动画持续时间之外并保留该状态。将其与 `steps()` 结合使用时，动作看起来好像初始静止状态不计入步数总和——正如使用 `jump-end` 或 `end` 的效果，或者说动画元素在 `steps()` 之外又多走了一步。如上面示例所示，`steps(6, jump-start)` 和 `steps(6, jump-end)` 遇到 `animation-fill-mode: forwards` 时，待动画结束之后，容器中看不到任何东西。

解决办法是消减分段个数和动画运动的跨度：

```HTML
<div class="wrapper" style="--easing: steps(4,jump-start);--animationFillMode: none;">
    <div class="octocat"></div>
    <div class="roll"></div>
</div>

<div class="wrapper" style="--easing: steps(3,jump-start);--animationFillMode: none;">
    <div class="octocat" style="--name: octocat-animation2;"></div>
    <div class="roll" style="--name: roll-animation2;"></div>
</div>
```

```CSS
@layer animation {
    /* 服务于 steps(4, jump-start) */
    @keyframes roll-animation {
        0% {
            translate: 0;
        }
        100% {
            translate: -200px;
        }
    }
    @keyframes octocat-animation {
        from {
            background-position: 0 0;
        }
        to {
            background-position: -200px 0;
        }
    }
  
    /* 服务于 steps(3, jump-start)，它比四步少了一个跨度 */
    @keyframes roll-animation2 {
        0% {
            translate: 0;
        }
        100% {
            translate: -150px;
        }
    }
    @keyframes octocat-animation2 {
        from {
            background-position: 0 0;
        }
        to {
            background-position: -150px 0;
        }
    }
    
    .octocat {
        --name: octocat-animation;
        animation: var(--name) var(--duration) var(--easing) 1 var(--animationFillMode);
    }
    .roll {
        --name: roll-animation;
        animation:var(--name)  var(--duration) var(--easing) 1 var(--animationFillMode);
    }
}
```

调整后，`steps(3,jump-start)` 和 `octocat-animation2` 构建的动画效果才是所期望的（具体效果见下方 Demo）：

> Demo 地址：https://codepen.io/airen/full/vYbZzjY

就 `jump-start` 或 `start` 而言，即使 `animation-iteration-count` 属性设置为 `infinite`，`steps()` 也会有一个空档帧（什么都没有），但 `jump-end` 和 `end` 不会有这个现象。因此使用 `steps()` 函数制作雪碧图动画时，选择 `jump-end` 的效果要好于 `jump-start`：

> Demo 地址：https://codepen.io/airen/full/OJdgaKL

`animation-fill-mode` 受 `animation-direction` 属性的影响，这也意味着 `animation-direction` 对 `steps()` 函数最终呈现的效果同样有影响：

> Demo 地址：https://codepen.io/airen/full/vYbZvpB

`animation-fill-mode`、`animation-direction` 与 `animation-iteration-count` 各自的完整行为属于填充模式与动画方向的专题内容，此处不再展开。

### step-start 和 step-end

`step-start` 和 `step-end` 是 `steps()` 缓动函数中用于指定步进位置的两个预定值：

-   **`step-start`** ：等效于 `steps(1, start)` 或 `steps(1, jump-start)`。此步进位置使动画在开始时立即完成第一步，并立即跳到第一步的结束位置；在整个步进的持续时间内，元素停留在第一步的结束位置
-   **`step-end`** ：等效于 `steps(1, end)` 或 `steps(1, jump-end)`。此步进位置使动画在开始时等待，直到第一步的持续时间结束，然后立即完成第一步，停留在第一步的结束位置

两者的区别在于对第一步的处理方式：`step-start` 在动画开始时立即完成第一步，而 `step-end` 在动画开始时等待第一步的持续时间。简单地说，`step-start` 是一步到位，`step-end` 是延迟到位。

实际项目中，如果动画只有 `0%`（或 `from`）和 `100%`（或 `to`）两个关键帧，`step-start` 和 `step-end` 没有任何意义；但如果关键帧动画是非等分、无法过渡的阶梯动画，它们就有意义了。例如下面这个动画效果：

> Demo 地址：https://codepen.io/airen/full/gOqRErj

其核心代码如下：

```CSS
@layer animation {
    @keyframes loading {
        25% {
            box-shadow: none; /* 0个点 */
        } 
        50% {
            box-shadow: 0.5em 0; /* 1个点 */
        } 
        75% {
            box-shadow: 0.5em 0, 1.5em 0; /* 2个点 */
        } 
    }
    
    button::after {
        box-shadow: 0.5em 0, 1.5em 0, 2.5em 0;
        animation: loading 2s infinite step-start both;
    }
}
```

## steps() 缓动函数的用例

`steps()` 缓动函数在动画中的运用非常多，能实现其他 CSS 缓动函数无法达到的效果，例如精灵动画（Sprite Animation）、频闪效果、钟表指针运动、打字机效果、游戏场景、加载动画、交互动画等。

### 精灵动画

精灵动画（Sprite Animation）是一种通过快速连续显示图像的不同帧来创建动画效果的技术。所有动画的图像帧都包含在一个图像文件（通常称为精灵表或精灵图/雪碧图）中的不同部分，通过在屏幕上迅速切换显示这些图像帧，即可创建动画效果。

假设有一张由 `16` 张 `144px x 190px` 图像拼接而成的精灵图，要让动画元素逐帧显示这张精灵图上的内容。

通过将位置从 `translateX(0)` 过渡到 `translateX(-1600%)`（或使用背景位置 `background-position: -1600%`）实现动画。`steps()` 函数在此发挥关键作用：指定动画分 `16` 步完成，步数对应精灵图中的图像数量。由于整个精灵图的宽度被平移，最终状态不可见，因此需要给 `steps()` 指定步进位置——使用 `jump-end` 可以精确捕捉每一帧：

```HTML
<div class="octocat"></div>
<div class="roll"></div>
```

```CSS
@layer animation {
    @keyframes roll-animation {
        0% {
            translate: 0;
        }
        100% {
            translate: calc(var(--w) * -1);
        }
    }
    
    @keyframes octocat-animation {
        from {
            background-position: 0 0;
        }
        to {
            background-position: calc(var(--w) * -1) 0;
        }
    }
  
    .wrapper {
        --opacity: 0;
        --duration: 2s;
        --w: 2304px;
        --h: 190px;
        --steps: 16;
        --easing: steps(var(--steps), jump-end);
        --bg-size: var(--w) var(--h);
    }

    
    .octocat {
        animation: octocat-animation var(--duration) var(--easing) infinite;
    }
    .roll {
        animation: roll-animation var(--duration) var(--easing) infinite;
    } 
}
```

> Demo 地址：https://codepen.io/airen/full/ZEwJRYR

这个示例分别展示了如何使用 `translate` 和 `background-position` 实现精灵动画。

以 `background-position` 方案为例：精灵的第一帧显示为背景图像，其余帧刚好在视野之外。将图片向左滑动以显示其余帧，只需将 `background-position-x` 设置为与背景宽度相等的负值，例如示例中的 `-2304px`。容器的尺寸应刚好是精灵图中每一帧图像的尺寸，如上例是 `144px` 宽、`190px` 高。

制作精灵动画的一个细节：当动画元素或其容器尺寸调整后，精灵图片的 `background-size` 和关键帧动画中的 `translateX` 或 `background-position-x` 的值也需要按比例调整。例如将容器尺寸调整为 `72px x 95px`（缩小一半），精灵图片的 `background-size` 宽高需相应缩小一半，关键帧中对应的负值也需缩小一半：

```CSS
@layer animation {
    @keyframes roll-animation {
        0% {
            translate: 0;
        }
        100% {
            translate: calc(var(--w) * -1);
        }
    }
    @keyframes octocat-animation {
        from {
            background-position: 0 0;
        }
        to {
            background-position: calc(var(--w) * -1) 0;
        }
    }

    .wrapper {
        --opacity: 0;
        --duration: 2s;
        --w: 2304px;
        --h: 190px;
        --steps: 16;
        --easing: steps(var(--steps), jump-end);
        --bg-size: var(--w) var(--h);
        
        /* 缩小一半 */
        &:nth-child(2) {
            --w: 1152px; /*2304px*/
            --h: 95px; /*190px*/
        }
    }

    .octocat {
        animation: octocat-animation var(--duration) var(--easing) infinite;
    }
    .roll {
        animation: roll-animation var(--duration) var(--easing) infinite;
    }
}

@layer demo {
    /* background-positon 实现精灵动画 */
    .octocat {
        width: calc(var(--w) / var(--steps));
        height: var(--h);
        background: var(--bg) no-repeat left top / var(--bg-size);
    }

    /* translate 实现精灵动画 */
    .roll {
        width: var(--w);
        height: var(--h);
        background: var(--bg) no-repeat left top / var(--bg-size);
    }

    .wrapper {
        width: calc(var(--w) / var(--steps));
        height: var(--h);
    }
}
```

> Demo 地址：https://codepen.io/airen/full/yLZoxgg

注意，可以缩小尺寸，但不建议放大尺寸，因为放大容易造成图片失真。

也可以考虑用百分比（`%`）单位计算相关尺寸，但要知道：`translate` 的百分比相对于元素自身宽度计算，而 `background-position` 的百分比计算规则复杂得多，且容易出错。制作精灵动画时，`background-position` 请慎用百分比值。

精灵图的拼接方式多样，可以是横拼、竖拼和矩阵方式拼接。拼接方式不同，`@keyframes` 的定义也要随之调整，否则精灵动画效果会不符合预期。

如果精灵图换成竖排模式，相应的 `@keyframes` 和样式要调整为：

```CSS
@layer animation {
    @keyframes roll-animation {
        0% {
            translate: 0 0;
        }
        100% {
            translate: 0 calc(var(--h) * -1);
        }
    }
    
    @keyframes octocat-animation {
        from {
            background-position: 0 0;
        }
        to {
            background-position: 0 calc(var(--h) * -1);
        }
    }

    .wrapper {
        --opacity: 0;
        --duration: 1s;
        --w: 194px;
        --h: 4080px;
        --steps: 16;
        --easing: steps(var(--steps), jump-end);
        --bg-size: var(--w) var(--h);
    }

    .octocat {
        animation: octocat-animation var(--duration) var(--easing) infinite;
    }
    .roll {
        animation: roll-animation var(--duration) var(--easing) infinite;
    }
}

@layer demo {
    .octocat {
        width: var(--w);
        height: calc(var(--h) / var(--steps));
        background: var(--bg) no-repeat left top / var(--bg-size);
    }

    .roll {
        width: var(--w);
        height: var(--h);
        background: var(--bg) no-repeat left top / var(--bg-size);
    }

    .wrapper {
        width: var(--w);
        height: calc(var(--h) / var(--steps));
        position: relative;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/vYbJzjq

如果精灵图以矩阵方式排列，对应的 `@keyframes` 会更复杂一些。[@Eduardo Moreno 使用矩阵排列的精灵图制作了一个更为复杂的精灵动画](https://codepen.io/emoreno911/full/PmKmYO)：

> Demo 地址：https://codepen.io/airen/full/xxMLaMQ

核心代码如下：

```HTML
<div class="char-wrap">
    <div class="char-svg"></div>
</div>
```

```CSS
.char-svg {
    height: 64px;
    width: 32px;
    background: url(https://dl.dropbox.com/s/gup87pb8b7rvmd7/sprite-color.svg) no-repeat;
    background-size: 450px 341px; /*非常重要*/
    animation: stand 0.8s steps(4) infinite;
}


/* 走的动作 */
@keyframes walk {
    from {
        background-position: -14px -84px;
    }
    to {
        background-position: -224px -84px;
    }
}

.char-svg.walk {
    animation: walk 1s steps(6) infinite;
}

/* 跑的动作 */
@keyframes run {
    from {
        background-position: -228px -84px;
    }
    to {
        background-position: -436px -84px;
    }
}
.char-svg.run {
    animation: run 1s steps(6) infinite;
}

/* 蹲下的动作 */
@keyframes crouch {
    from {
        background-position: -290px -10px;
    }
    to {
        background-position: -365px -10px;
    }
}
.char-svg.crouch {
    animation: crouch 1.6s steps(2) infinite;
}

/* 跳的动作 */
@keyframes jump {
    from {
        background-position: -14px -220px;
    }
    to {
        background-position: -224px -220px;
    }
}
.char-svg.jump {
    height: 82px;
    animation: jump 1s steps(6) infinite;
}

@keyframes play {
    from {
        background-position: -14px -84px;
    }
    to {
        background-position: -440px -84px;
    }
}

@keyframes stand {
    from {
        background-position: -20px -10px;
    }
    to {
        background-position: -152px -10px;
    }
}
```

将精灵动画与其他动画结合起来，就可以在游戏场景中为元素添加动画效果：

> Demo 地址：https://codepen.io/airen/full/mdvMzpO

这两个示例呈现的精灵动画很像游戏中的角色动画。精灵动画常用于制作游戏角色动画：一个角色的不同动作和状态都绘制在同一个精灵图上，通过切换显示不同的帧来模拟角色的运动和行为。这种技术能在有限资源下实现丰富的动画效果——所有帧都包含在一个图像文件中，避免了每帧单独加载的开销。

`steps()` 制作精灵动画时还可以和其他帧动画结合，创造更有创意的效果，例如章鱼遨游海洋世界的动画：

> Demo 地址：https://codepen.io/airen/full/MWLvPRx

精灵动画也可用于交互动画，例如前文提到的模拟 Twitter 点赞的按钮效果：

> Demo 地址：https://codepen.io/airen/full/LYqLRMP

此外，精灵动画并不限于将精灵图片用于元素背景，还可以应用于遮罩图片上，创造更多交互动画效果。例如下面的按钮悬浮效果，就是精灵动画应用于 `mask` 上的效果：

> Demo 地址：[https://codepen.io/airen/full/abXyQwm](https://codepen.io/airen/full/abXyQwm)  

三个按钮分别使用三张图作为遮罩图，动画化 `mask-position` 属性的值，并在按钮的悬浮状态触发动画。核心代码如下：

```HTML
<button class="button"><span>Hover Me!</span></button>
```

```CSS
@layer animation {
    @keyframes ani {
        from {
            mask-position: 0 0;
        }
        to {
            mask-position: -100% 0;
        }
    }
    
    @keyframes ani2 {
        from {
            mask-position: -100% 0;
        }
        to {
            mask-position: 0 0;
        }
    }
    
    button {
    --_mask: var(--mask-bg1);

        &::before {
            mask: var(--_mask);
            mask-size: 2300% 100%;
            animation: ani2 0.7s steps(22) forwards;
        }
    
        &:hover {
            color: #000;
            &::before {
                animation: ani 0.7s steps(22) forwards;
            }
        }
    
        &:nth-child(2) {
            --_mask: var(--mask-bg2);
    
            &::before {
                mask-size: 3000% 100%;
                animation-timing-function: steps(29);
            }
        }
    
        &:nth-child(3) {
            --_mask: var(--mask-bg3);
    
            &::before {
                mask-size: 7100% 100%;
                animation-timing-function: steps(70);
                animation-name: ani;
            }
            &:hover::before {
                animation-timing-function: steps(70);
                animation-name: ani2;
            }
        }
    }
}
```

### CSS 时钟

时钟是演示 `steps()` 缓动函数的经典案例。需要对时钟的指针（秒针、分针和时针）进行旋转，但不是平滑和连续的运动——`steps()` 可以创建模仿真实时钟指针运动的动画。

使用 `steps()` 时会涉及一些简单的数学计算：

-   秒针旋转一圈（`360deg`）用时 `60s`，即秒针在 `60` 步内旋转 `360deg`。`steps()` 函数的步数是 `60`，动画持续时间（`animation-duration`）是 `60s`
-   分针转完一圈需要 `60` 分钟（`3600s`），即分针在 `60` 步内旋转 `360deg`。`steps()` 步数同样是 `60`，动画持续时间调整为 `3600s`
-   时针希望恒速旋转一圈，根据时间计算持续时间，即 `43200s`（对应 `12` 小时）

定义秒针和分针的动画缓动函数时，考虑使用 `steps(60)`（相当于 `steps(60, jump-end)` 或 `steps(60, end)`），这使秒针随钟面上的每个标记步进。如果不跳过结束状态，动画的开始和结束将位于顶部（`0deg`），时钟会在顶部分停留两秒，其余 `58s` 分布在之间，显得不自然。因此给 `steps()` 函数指定 `jump-start`，让秒针跳过其结束状态，秒针动画会更自然：

```CSS
@layer animation {
    @keyframes clock {
        to {
            rotate: 360deg;
        }
    }
  
    .second-hand {
        animation: clock 60s steps(60 ,jump-start)  infinite;
    }
  
    .minute-hand {
        animation: clock 3600s steps(60, jump-end) infinite;
    }
  
    .hour-hand {
        animation: clock 43200s linear infinite;;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/NWovVJM

### 频闪效果

常见的闪光灯效果就是一种[频闪效果](https://en.wikipedia.org/wiki/Stroboscopic_effect)。为了建立比较基准：下面红色闪光效果是一个典型的脉动动画，不透明度 `opacity` 从 `1` 到 `0` 再到 `1` 无限循环，呈现脉动光源的视觉效果；黄色闪光效果（下方）使用了 `steps()` 函数，步进缓动引起的离散运动跳跃产生一种不安的"多步闪烁"感觉，仿佛夜总会的闪光灯：

```CSS
@layer animation {
    @keyframes pulse {
        50% {
            opacity: 0;
        }
    }

    .light {
        --easing: linear
        animation: pulse 175ms var(--easing) infinite alternate;
        
        &:nth-of-type(2) {
            --easing: steps(2, jump-none);
        }
    }
}
```

> Demo 地址：https://codepen.io/airen/full/zYeEpoz

使用 `steps(2, jump-none)` 可以确保动画元素要么完全不透明，要么完全透明，创建干净的闪烁效果。

`steps(2, jump-none)` 也适用于类似的闪烁动画，例如眨眼睛的效果。把上面示例中的 `opacity` 换成 `scale()` 函数，就可以制作眨眼的企鹅：

```CSS
@layer animation {
    @keyframes eye {
        to {
            scale: 1 0.25;
        }
    }

    .belly-eye::before,
    .belly-eye::after {
        animation: eye 0.5s steps(2, jump-none) infinite alternate;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/bGzoveK

### 打字机效果

打字机效果涉及文本逐渐显示，就像正在被逐字输入一样。将其应用于文本块可以吸引用户注意力，常用于登录页面、个人网站和代码演示等场景。

打字机效果很容易创建，工作原理如下：

-   通过 CSS 的 `steps()` 函数逐步将文本元素的宽度（`width`）从 `0` 更改为 `100%` 来显示文本
-   一个闪烁动画对"输入"文本的光标进行动画处理

```HTML
<h1>CSS Text Animation: CSS Type Animation.</h1>
<h1>欢迎来到动画世界！我将向你呈现不同动画制作过程与技巧！</h1>
```

```CSS
@layer animation {
    @keyframes typing {
        0% {
            width: 0;
        }
    }

    @keyframes blink {
        50% {
            border-color: transparent;
        }
    }

    h1 {
        width: 40ch; /* 字符数量，最好是比文本内容多出 1 个，英文最好使用 ch 单位，这个很重要 */
        animation: 
            typing 10s steps(40) infinite alternate,
            blink 0.4s steps(2, jump-none) infinite alternate;
        
        &:nth-of-type(2) {
            width: 28em; /* 字符数量，最好是比文本内容多出 1 个，中文最好使用 em 单位，这个很重要 */
            animation-timing-function: steps(28), steps(2, jump-none);
        }
    }
}
```

> Demo 地址：https://codepen.io/airen/full/eYxGrmz

制作打字机动画的要点：

-   元素的 `width` 最好根据语言调整：拉丁语使用 `ch` 单位，中文使用 `em` 单位，因为它们刚好是一个字符的宽度
-   `width` 的值最好比文本字符数量略微多一个，效果更自然
-   `steps()` 函数中的步数与 `width` 属性的值相同，例如 `width` 为 `28em`，相应的步数就是 `28`，即 `steps(28)`

这种技术最好用于小部分非关键性文本，仅用于增加愉悦感。CSS 动画实现打字机效果有一些限制，应在各种设备和视口大小上测试打字机文本，因为结果可能因平台而异。如果打字机效果对关键内容很重要，最好考虑 JavaScript 解决方案。

### 数字倒计时

如果倒计时效果在时间准确性上没有严格要求，可以考虑使用 CSS 计数器和 `steps()` 模拟一个简单的倒计时效果，例如十秒倒计时：

> Demo 地址：https://codepen.io/airen/full/YzBrjGZ

关键代码如下：

```CSS
@layer animation {
    @keyframes counter {
        0% {
            counter-increment: count 10;
        }
        10% {
            counter-increment: count 9;
        }
        20% {
            counter-increment: count 8;
        }
        30% {
            counter-increment: count 7;
        }
        40% {
            counter-increment: count 6;
        }
        50% {
            counter-increment: count 5;
        }
        60% {
            counter-increment: count 4;
        }
        70% {
            counter-increment: count 3;
        }
        80% {
            counter-increment: count 2;
        }
        90% {
            counter-increment: count 1;
        }
        100% {
            counter-increment: count 0;
        }
    }
    
    .loading::after {
        counter-reset: count 0;
        content: counter(count);
        animation: counter 10s steps(10) infinite;
    }
}
```

这些用例展示了步进缓动 `steps()` 在创建独特视觉效果、控制动画在特定间隔出现方面的多功能性，满足不同的设计和动画需求。

## steps() 缓动函数的优势

`steps()` 缓动函数的最大优势在于它能够将动画或过渡分为特定数量的步骤而不是平滑过渡，这种分段方式使动画看起来更生动、有独特的呈现效果：

-   **离散性和控制性**：只显示每个步骤的关键帧而不是过渡，为开发人员提供更精确的控制，特别适用于需要明确定义动画状态的场景
-   **复古和动画帧效果**：可以产生类似帧动画的效果，适合营造复古或动画帧感觉的场景
-   **自然和特定场景**：某些情况下平滑过渡可能显得过于人工，`steps()` 的离散效果更能模拟自然的运动

## 何时不使用 steps() 缓动函数

尽管 `steps()` 缓动函数可以实现每秒 `60` 帧的动画，但它也可能导致文件大小增加，在设计复杂动画或需要高分辨率的场景中需谨慎使用。如果需要大型或复杂的动画，步进动画可行但可能并非最优解，可考虑其他实现方式：非步进的 CSS 动画、SVG 动画和 JavaScript 动画。

不过 `steps()` 动画若运用得当，也能胜任复杂场景。例如 2015 年淘宝年货节的揭幕动画就是较早使用 `steps()` 制作的大型动画，随后多次大促活动的氛围动画中也有 `steps()` 制作的动画效果，如 2017 年年货节的门神动画（该动画的精灵图尺寸达 `14250px x 1334px`，在大促活动对图片体积有严格限制的前提下，优化过程耗费了不少精力）。

一个知名案例来自暴雪娱乐公司的《魔兽世界：军团再临》网站：网站的一部分展示了一个游戏角色手持武器轻轻摇摆，动画时长三秒，由 `54` 帧组成，由一张尺寸为 `14000px x 300px` 的 `.png` 文件驱动，文件大小仅 `846kb`。文件较大，但动画效果令人惊叹。

完整查看源图像时，没有 CSS 步进动画的图像"胶片"显得很奇怪：源图像非常宽，宽到肉眼无法看清；从生产角度看也相当令人生畏——更新图像时需要在正确位置以正确间距替换动画帧。源图像的原始形式是一张短而宽的图像，显示许多身穿紫色衣物的相同角色站在一起，每个副本略有变化，显示彼此之间动画帧的差异。

当图像应用了 CSS 步进动画后，它焕发生机：本地移动自动播放、透明背景、高保真图像质量、以每秒 `18` 帧运行的相对平滑动画。逐帧捕捉运动中的物体并将它们排列成单个 `png` 文件序列需要大量幕后工作，但结果令人叹为观止：

> Demo 地址：https://codepen.io/airen/full/LYqzgZv

稍微变动一下，就能得到另一个动画效果：

> Demo 地址：https://codepen.io/airen/full/ExrwdwG

拖动一下滑块，就可以得到一个镜像的游戏角色动画。该示例思路来自 [@Adam Argyle 在 CodePen 提供的一个案例](https://codepen.io/argyleink/full/XWOaazZ)：

> Demo 地址：https://codepen.io/airen/full/rNPGqbR （来源于 [@Adam Argyle](https://codepen.io/argyleink/full/XWOaazZ) ）

## 小结

`steps()` 函数为 CSS 动画提供了一种强大的分段效果创建方式，关键点如下：

-   `steps()` 允许将动画划分为一系列离散的步骤而不是平滑过渡，对模拟钟表、创建动画精灵表或其他需要分段效果的场景非常实用
-   通过第一个参数定义步数（如 `steps(10)` 将动画分为 `10` 步），通过第二个参数设置步进方向：`start`、`end`、`jump-none`、`jump-start`、`jump-end`、`jump-both`
-   `steps()` 不仅能模拟自然运动，还能创造各种独特的视觉效果，如逐字打印的打字机效果
-   性能方面，`steps()` 在需要高帧率和透明度支持的场景可能比其他动画选项更具优势
-   对于大规模或复杂的动画，`steps()` 可能不是最佳选择，此时可考虑非步进的 CSS 动画、SVG 动画或 JavaScript 动画

使用 `steps()` 函数时需要谨慎权衡文件大小、性能和动画效果之间的关系。总体而言，`steps()` 提供了一种有趣而灵活的方式，通过分步动画效果为网站或应用引入生动的运动。
