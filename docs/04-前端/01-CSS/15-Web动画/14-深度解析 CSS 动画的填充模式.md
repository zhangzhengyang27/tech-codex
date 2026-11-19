---
title: 深度解析 CSS 动画的填充模式
description: "深度理解动画填充模式（animation-fill-mode）：关键帧前后样式状态的控制机制、none/forwards/backwards/both 四个取值的行为差异、animation-direction 与 animation-iteration-count 对填充模式的影响，以及封面动画实战案例。"
keywords: [深度解析, CSS, 动画的填充模式]
category: CSS
tags: [CSS, 布局, 动画, 响应式]
---


# 深度解析 CSS 动画的填充模式

## 概念说明

Web 开发者对创造引人入胜、交互丰富的用户体验的需求愈发迫切，CSS 动画凭借其灵活性和强大的表现力，是构建界面动效的重要工具。其中有一个不太被注意却关键的属性——**动画填充模式（`animation-fill-mode`）**，它决定了动画元素在开始前和结束后的样式状态，直接影响用户感知体验。

CSS 动画填充模式（`animation-fill-mode`）在动画播放前和播放后的样式处理上发挥着关键作用：要创建流畅、自然的动画效果，并确保动画结束后元素样式的一致性，就需要深入理解它。它能够解决动画播放前后可能出现的样式问题，是优化动画交互不可或缺的一部分。

## 问题场景：动画前后的样式不一致

在制作 CSS 动画时，动画填充模式往往是最令人困惑的部分之一。以下两个典型问题都源于对填充模式的缺失。

### 问题一：淡出动画结束后元素重新出现

给一个元素添加淡出的动画效果，动画本身效果良好，但在动画结束时，元素突然又出现了：

```CSS
@keyframes fadeOut {
    to {
        opacity: 0;
    }
}

.animated {
    animation: fadeOut 2s ease-out 1;
}
```

> Demo 地址：https://codepen.io/airen/full/QWYVqEa

如果将 `.animated` 元素的不透明度（`opacity`）随时间变化绘制成图表（"距离时间图"），就能清楚地看到问题所在：动画 `fadeOut` 执行前，`.animated` 元素是完全可见的（CSS 中没有给该元素的 `opacity` 指定任何值，相当于 `opacity: 1`）；动画执行完之后，元素却突然回到完全可见的状态。

原因在于 `@keyframes` 关键帧的工作机制：**`@keyframes` 规则块中的样式规则（例如 `from` 和 `to` 选择器中的样式规则）仅在动画运行时应用**。这也是 CSS 级联的基本规则——`@keyframes` 中的样式权重大于常规规则中声明的样式。

也就是说，示例中的 `fadeOut` 关键帧在经过 `2s`（动画持续时间）后执行结束，`to` 选择器中的 `opacity: 0` 也随之消失，动画元素 `.animated` 的 `opacity` 将回到样式表其他地方声明的值（如果有的话）。示例中没有在其他地方设置该元素的不透明度，因此回到默认值 `opacity: 1`，元素立即变得可见。

解决这个问题的一种方法是在动画元素 `.animated` 中指定 `opacity` 属性的值为 `0`：

```CSS
@layer animation {
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
  
    .animated {
        animation: var(--animn, fadeOut) 2s ease-out 1 var(--animps, paused);
        
        &.playing {
            opacity: 0;
        }
    }
}
```

> Demo 地址：https://codepen.io/airen/full/mdvGqRx

动画运行时，`@keyframes` 规则块中的 `opacity` 会覆盖 `.playing` 选择器中的 `opacity`；动画结束后，`.playing` 选择器中的 `opacity` 将生效，使元素保持在完全透明的状态。

这种通过技术手段让元素的 `opacity` 与关键帧 `to` 选择器保持一致的方式并不是最佳方案，CSS 中有更好的方式达到相同的效果（后文详述）。

### 问题二：动画延迟期间样式未生效

制作 CSS 动画时，有时并不希望动画立即执行，通常会使用 `animation-delay` 延迟一段时间再执行。例如：

```CSS
@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.animated {
    animation: var(--animn, fadeIn) 2s ease-in 2s 1;
}
```

> Demo 地址：https://codepen.io/airen/full/YzBOEBj

当用户点击播放按钮后，`.animated` 元素仍然有 `2s` 的时间完全可见，然后才从完全不可见（`opacity: 0`）过渡到完全可见。

原因同样是 `@keyframes` 的工作机制：`from`（`opacity: 0`）和 `to`（`opacity: 1`）选择器中设置的样式规则只有在动画运行时才会应用到目标元素上，而**动画延迟期间并不计算在内**。在延迟的 `2s` 内，就好像 `from` 块中的 CSS 不存在一样；样式表其他地方又没有给 `.animated` 元素设置与 `from` 相同的 `opacity` 值，因此出现了上述视觉效果。

简单的解决方法是在 `.animated` 元素上设置 `opacity` 的值与 `from` 选择器中的一样：

```CSS
@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.animated {
    opacity: 0;
    animation: var(--animn, fadeIn) 2s ease-in 2s 1;
}
```

这样虽然解决了动画延迟之前的问题，但动画结束之后又产生了与问题一相似的现象：元素淡入之后立即又变得不可见了。如果继续沿用之前的方法在动画结束后改变元素的 `opacity` 值：

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
  
    .animated {
        opacity: 0;
        animation: var(--animn, fadeIn) 2s ease-in 1 var(--animps, paused) 2s;
        transition: opacity 2s ease-in 2s;
        &.playing {
            opacity: 1;
        }
    }
}
```

> Demo 地址：https://codepen.io/airen/full/BaMOJWy

视觉效果虽然达到预期，但从代码实现角度看，脱离了关键帧动画的优势，属于画蛇添足的方案。

事实上，这两个示例呈现的都是**动画结束前后，动画元素样式如何保持一致性的问题**。CSS 动画填充模式就是用来解决这个问题的：通过 `animation-fill-mode` 使动画元素的视觉在动画执行完前后都保持一致，避免在视觉上带来困惑。

## 动画填充模式是什么

简单地说，动画填充模式 `animation-fill-mode` 设置 CSS 动画（关键帧动画）在执行之前和之后如何将样式应用于其目标（动画元素）。

按照 [W3C 规范](https://drafts.csswg.org/css-animations/#animation-fill-mode)的解释：动画填充模式是一种用于控制 CSS 动画在执行期间以外的时间内如何应用样式的属性。默认情况下，动画在应用（即将 `animation-name` 属性设置在元素上）和动画开始执行（由 `animation-delay` 属性确定）之间，以及动画结束后（由 `animation-duration` 和 `animation-iteration-count` 属性确定），并不会影响属性值。而通过 `animation-fill-mode` 属性，可以改变这种默认行为，允许动态更新的属性值在动画延迟期间或动画结束后反映出来。

`animation-fill-mode` 属性主要有四个值：

-   **`none`**：默认值，表示动画在应用但未执行时没有效果。当动画未执行时，动画不会将任何样式应用于目标，元素按已赋予的 CSS 规则显示。
-   **`forwards`**：在动画结束时，动画将应用动画结束时的属性值，即目标将保留执行期间遇到的最后一个关键帧的计算值。
-   **`backwards`**：在由 `animation-delay` 定义的期间，动画将应用定义在将开始动画的第一次迭代的关键帧中的属性值。也就是说，动画将在应用于目标时立即应用第一个关键帧中定义的值，并在 `animation-delay` 期间保留此值。
-   **`both`**：动画将遵循 `forwards` 和 `backwards` 的规则，从而在两个方向上扩展动画属性。

回到前面的两个问题示例，可以看出四个取值的基本用法。

**问题一（淡出动画）**：给动画元素 `.animated` 添加了一个淡出 `fadeOut` 动画：

```CSS
@keyframes fadeOut {
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
}

.animated {
    animation: fadeOut 2s ease-out 1;
}
```

点击播放按钮时，`fadeOut` 动画立即执行，动画元素 `.animated` 的可见度从完全可见过渡到完全不可见；在 `2s` 结束时（动画结束），动画元素将再次变得完全可见。这是因为默认情况下 `animation-fill-mode` 的值为 `none`，动画开始之前和结束之后，动画元素不会使用来自关键帧的任何样式。

而期望的效果是：动画结束后元素保持在完全不可见的状态，即 `opacity` 保持与关键帧最后一帧（`100%` 选择器）一致，因此需要将 `animation-fill-mode` 设置为 `forwards`：

```CSS
.animated {
    animation: fadeOut 2s ease-out 1 forwards;
}
```

> Demo 地址：https://codepen.io/airen/full/jOdvJVR

`animation-fill-mode: forwards` 会将最终块中的声明"复制粘贴"到时间轴上持续保留，相当于继续应用于动画元素上，比手动维护元素属性值的方式更灵活方便，也不易出错。

**问题二（延迟淡入动画）**：给动画元素 `.animated` 应用了一个淡入 `fadeIn` 动画，并且该动画将延迟 `2s` 才开始执行：

```CSS
@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.animated {
    animation: fadeIn 2s ease-in 1 2s;
}
```

默认情况下，关键帧中 `from` 和 `to` 选择器声明的样式规则在动画延迟期间不会应用到目标元素上，因此在最初的 `2s` 里动画元素完全可见，然后再从不可见慢慢过渡到可见。期望的效果是：动画元素在等待期间就不可见，即关键帧第一帧的样式应用到目标元素上，使用 `animation-fill-mode: backwards`：

```CSS
.animated {
    animation: fadeIn 2s ease-out 1 backwards 2s;
}
```

> Demo 地址：https://codepen.io/airen/full/vYbzPmp

`backwards` 与 `forwards` 做的事情类似，但它使用动画的第一个关键帧，并在动画开始之前将这些样式应用于目标元素。

再看一个同时需要两个方向的示例：给动画元素添加淡入淡出 `fadeInOut` 动画，同样延迟 `2s` 执行：

```CSS
@keyframes fadeInOut {
    0% {
        opacity: 0;
    }
    
    50% {
        opacity: 1;
    }
    
    100% {
        opacity: 0;
    }
}

.animated {
    animation: fadeInOut 2s ease-in-out 1 2s;
}
```

> Demo 地址：https://codepen.io/airen/full/XWOPGYj

期望的效果是动画元素在等待期间和执行完动画之后都不可见，即关键帧中的第一帧（`0%` 选择器的样式）和最后一帧（`100%` 选择器样式）同时应用于动画元素——同时具备 `forwards` 和 `backwards` 的特性。`animation-fill-mode` 的 `both` 值刚好同时具备这两者：动画元素在动画开始之前使用第一个关键帧的样式，并在动画结束之后使用最后一个关键帧的样式：

```CSS
.animated {
    animation: fadeInOut 2s ease-in-out 1 both 2s;
}
```

> Demo 地址：https://codepen.io/airen/full/qBgMvLP

## 深度解析填充模式

`animation-fill-mode` 是 CSS `animation` 属性的一个子属性，它指定了 CSS 动画中关键帧开始前后的状态，共有四个值：

-   ① `none`：默认值，关键帧开始前后保持默认值
-   ② `forwards`：关键帧结束后保持最后采用的关键帧
-   ③ `backwards`：保持关键帧开始前最先采用的关键帧（保留关键帧）
-   ④ `both`：同时满足条件 ② 和 ③，即同时具备 `forwards` 和 `backwards` 两者的特性

只要理解了 `forwards` 和 `backwards`，就理解了 `animation-fill-mode` 属性。

### "向前"与"向后"的真实含义

从字面上说，`forwards` 是"向前"的意思，`backwards` 则是"向后"。这两个方向很容易让人产生如下误解：

-   "向前"应该对应关键帧的前面，即关键帧的第一帧 `from` 或 `0%`。事实上，它对应的是关键帧的最后一帧 `to` 或 `100%`，**实为后**；
-   "向后"应该对应关键帧的后面，即关键帧的最后一帧 `to` 或 `100%`。事实上，它对应的是关键帧的第一帧 `from` 或 `0%`，**实为前**。

理解的关键在于参考系：`forwards`（"向前"）实质上是位于距离时间图时间轴的前面，也就是关键帧结束位置的前面；`backwards`（"向后"）则刚好相反，位于时间轴的后面，即关键帧开始位置的后面。可以类比为一个记录会话的视频：既可以在动画开始之前向后移动，也可以在动画结束后向前移动。

### "关键帧前后"与"动画前后"的区别

需要特别强调：**`animation-fill-mode` 指定的是"关键帧之前和之后"的状态，而不是"动画之前和之后"**。这两者存在差异。

假设有一个动画元素 `.animated`，它被放置在名为 `.container` 的容器中：

```HTML
<div class="container">
    <div class="animated">
        <!-- 我是目标元素，也是动画元素 -->
    </div>
</div>
```

在添加关键帧动画之前，先给这两个元素设置一段与 CSS 动画没有任何关联的普通样式：

```CSS
.container {
    width: 60vw;
    display: grid;
    place-content: center start;
    background: #2b062a;
    
    .animated {
        --size: 100px;
        width: var(--size);
        aspect-ratio: 1;
        background: #f36;
    }
}
```

给 `.animated` 元素添加一个 `ani` 动画：

```CSS
@keyframes ani {
    0% {
        background: orange;
        translate: -100%;
    }
    100% {
        background: yellow;
        translate: 60vw;
    }
}

.animated {
    animation: ani 2s linear 1s;
}
```

`ani` 动画对元素的背景色（`background`）和位移（`translate`）两个属性做了动画化处理。此时动画元素 `.animated` 的 `background` 和 `translate` 在动画前后可能存在以下几种表现：

-   默认情况：`.animated` 的 `background` 为 `#f36`，`translate` 为 `0`（未显式设置该属性），以下称为既定值或预定值；
-   `ani` 关键帧的 `0%` 选择器中将 `background` 的值更改为 `orange`，`translate` 的值更改为 `-100%`；
-   `ani` 关键帧的 `100%` 选择器中将 `background` 的值更改为 `yellow`，`translate` 的值更改为 `60vw`。

由于应用了动画延迟（`animation-delay: 1s`），即使在动画本身开始之后、关键帧开始之前，也会有一段"等待时间"。

`animation-fill-mode` 所指的"开始之前"，指的是由于延迟而产生的"等待时间"（关键帧开始之前）。如果发生动画延迟，它将与 CSS 动画本身的开始时间不匹配；而 `animation-fill-mode` 所指的"完成后"是指关键帧完成后，这始终与 CSS 动画本身的结束时间一致。

简单地说：关键帧开始之前对应的是动画应用后、因动画延迟而等待的状态；关键帧结束后与动画完成后相同。关键帧之前和之后应用哪个状态的样式，由动画填充模式 `animation-fill-mode` 决定：

-   关键帧开始之前，目标元素应用的是原定值还是第一个关键帧的样式值；
-   关键帧结束之后，目标元素应用的是原定值还是最后一个关键帧的样式值。

基于上面的示例，`animation-fill-mode` 指定不同值时，动画元素 `.animated` 在关键帧前后的样式都会有所不同：

```CSS
@keyframes ani {
    0% {
        background: orange;
        translate: -100%;
    }
    100% {
        background: yellow;
        translate: 60vw;
    }
}

.animated {
    animation: ani 2s linear 1s var(--animfm, none);
}
```

> Demo 地址：https://codepen.io/airen/full/xxMaoqE

为了更清晰地呈现各取值之间的差异，将示例稍作调整：

```CSS
/* 动画元素预定样式值 */
.animated {
    background: red;
}

@keyframes ani {
    from {
        background: lime;
        translate: -300px;
    }
    to {
        background: yellow;
        translate: 300px;
    }
}

.animated {
    animation: ani 5s linear var(--animdel, 0s) var(--animfm, none);
}
```

上面代码中，动画元素 `.animated` 的 `background` 和 `translate` 会随关键帧 `ani` 的不同选择器变化。就此示例而言，它有三个状态，即预定值、关键帧第一帧和关键帧最后一帧：

```CSS
/* CSS 预定值 */
.animated {
    background: red;
    translate: 0;
}

/* 关键帧第一帧 */
.animated {
    background: lime;
    translate: -300px;
}

/* 关键帧最后一帧 */
.animated {
    background: yellow;
    translate: 300px;
}
```

动画元素运用 `ani` 关键帧动画之后，关键帧前后目标元素的样式由动画填充模式决定。

#### 没有任何模式：none

`animation-fill-mode` 取默认值 `none` 时，关键帧开始前后目标元素保持默认值。

```CSS
.animated {
    animation: ani 5s linear 0s none 1;
    
    &.delay {
        animation-delay: 2s;
    }
}
```

这两个动画元素只有一个差异：第二个动画元素设置了动画延迟 `animation-delay: 2s`。

> Demo 地址：https://codepen.io/airen/full/WNPabPR

第一个动画元素没有设置动画延迟时间，"等待时间等于关键帧开始之前"不存在，动画立即执行，此时动画元素立即应用关键帧 `ani` 中第一帧（示例是 `0%`）的样式规则；第二个动画元素设置了 `2s` 的延迟时间，"等待时间"存在，动画执行之后关键帧需要等待 `2s` 才开始运行，此时动画元素并不应用关键帧第一帧的样式规则，而是应用元素在 CSS 中的预定值。

在这个示例中，动画结束刚好是关键帧结束，因此两个动画元素的样式规则都会应用 CSS 中的预定值。这就是 `animation-fill-mode` 取 `none` 值时，动画元素在关键帧前后样式的应用规则。

#### "向前"模式：forwards

`animation-fill-mode` 取 `forwards` 值时，动画填充采用"向前"模式，关键帧结束后保持最后采用的关键帧。

```CSS
.animated {
    animation: ani 5s linear 0s forward 1;
    
    &.delay {
        animation-delay: 2s;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/BaMqoKV

"向前"模式对动画元素在关键帧之前的样式没有影响，表现行为与 `none` 一样；但它对动画元素在关键帧结束之后的样式起决定性作用。在这个示例中，动画的结束刚好与关键帧的结束相同。"向前"模式是在时间轴的前面填充，它会把关键帧的最后一帧 `to`（或 `100%`）中的样式规则复制给动画元素。简单地说，关键帧结束之后，动画元素始终应用关键帧中最后一帧的样式规则。**如果要将动画元素的样式维持在关键帧结束状态，就需要使用"向前"填充模式**，即动画保持在结束状态。

#### "向后"模式：backwards

"向后"模式（`backwards`）与"向前"模式相反，动画元素在关键帧开始之前会采用关键帧第一帧的样式规则。

```CSS
.animated {
    animation: ani 5s linear 0s backwards 1;
    
    &.delay {
        animation-delay: 2s;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/RwveWRL

当动画填充模式为"向后"模式时，不管动画有没有设置延迟时间（`animation-delay`），动画元素在关键帧开始之前都会应用关键帧中第一帧的样式规则，相当于将关键帧第一帧的样式规则复制给了动画元素。同时，"向后"模式不会对动画元素在关键帧之后的样式有任何影响：动画执行完，动画元素的样式将应用 CSS 中的预定值，关键帧中的样式规则似乎被丢失了。

也就是说，如果希望动画维持开始状态，就应该选择"向后"填充模式。

#### "向前向后"模式：both

"向前向后"模式（`both`）同时具有 `forwards` 和 `backwards` 两者的特征：

```CSS
.animated {
    animation: ani 5s linear 0s both 1;
    
    &.delay {
        animation-delay: 2s;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/QWYZjEz

当动画填充模式为 `both` 时，不管动画是否设置了延迟播放，在关键帧开始之前，动画元素都会应用关键帧中第一帧的样式；当关键帧结束时，动画元素会应用关键帧中最后一个关键帧的样式。

### 状态与填充模式的作用范围

上面通过四个简单示例呈现了 `animation-fill-mode` 在不同模式下对动画元素样式的设置。在时间轴上，一次动画过程主要有三个状态：

-   动画等待：只有设置了动画延迟的动画才有这个过程；
-   动画进行：关键帧执行的过程；
-   动画结束：动画执行完成，这个过程也是关键帧执行完成。

在这三个状态中，动画元素的样式受到关键帧和动画填充模式的影响：

-   动画等待状态下，动画元素的样式由动画填充模式决定；
-   动画进行状态下，动画元素的样式由关键帧决定；
-   动画结束状态下，动画元素的样式由动画填充模式决定。

也就是说，动画填充模式 `animation-fill-mode` 只能控制动画元素在关键帧前后的样式。其中：

-   如果 `animation-fill-mode` 取 `forwards`，那么动画结束状态下，动画元素的样式会应用关键帧最后一帧的样式，在动画等待和进行中不受影响；
-   如果 `animation-fill-mode` 取 `backwards`，那么动画等待状态下，动画元素的样式会应用关键帧第一帧的样式，在动画进行和结束后不受影响；
-   如果 `animation-fill-mode` 取 `both`，那么动画等待状态下应用关键帧第一帧的样式，动画结束状态下应用关键帧最后一帧的样式，动画执行过程中不受影响。

### 隐式的第一帧与最后一帧

前面的示例中，关键帧都显式指定了第一帧（`from` 或 `0%`）和最后一帧（`to` 或 `100%`）。一个自然的疑问是：如果关键帧没有显式指定第一帧和最后一帧，甚至整个关键帧只声明了一个帧（例如 `50%`），动画填充模式对动画元素在关键帧前后的样式有何影响？

通过下面这个示例寻找答案：

```CSS
@layer animation {
    @keyframes ani {
        50% {
            translate: 20vw;
            scale: 1.5;
            background: lime;
        }
    }

    .animated {
        background: red;
        animation: var(--animn, ani) 5s linear var(--animdel, 0s) var(--animfm, none) var(--animps, paused) 1;
    }
}
```

示例中的 `ani` 关键帧只有一个 `50%` 选择器设置了样式。改变动画填充模式时，不管取何值，动画元素在关键帧前后的样式都是一样的：

> Demo 地址：https://codepen.io/airen/full/Jjxmrjw

通过浏览器调试工具将整个动画慢放，仔细观察动画元素的样式变化，会发现：虽然关键帧 `ani` 并没有显式地通过 `from`（或 `0%`）和 `to`（`100%`）指定第一帧和最后一帧的样式变化，但这并不代表没有相应的样式。理解这一点的关键是 `@keyframes` 中百分比选择器与时间轴（`animation-duration`）之间的关系。

以该示例为例，动画的持续时间是 `5s`。任何动画都有开始时间和结束时间：开始时间对应时间轴 `0s` 位置，结束时间由动画延迟时间和动画持续时间决定。示例中第一个动画元素没有设置延迟时间，动画结束时间位于时间轴 `5s` 位置；第二个元素设置了 `2s` 的延迟时间，动画结束时间位于时间轴 `7s` 位置。而关键帧中百分比选择器的计算是相对于动画持续时间的，即便没有显式指定 `0%` 和 `100%`，它们在时间轴上始终有自己的位置。这意味着，不管关键帧有没有显式设置 `0%` 和 `100%`，动画元素在这两个位置都会有相应的样式规则——只不过这个样式规则是 CSS 中的预定值：

```CSS
@keyframes ani {
    50% {
        translate: 20vw;
        scale: 1.5;
        background: lime;
    }
}

/* 等同于 */
@keyframes ani {
    0%, 100% {
        translate: 0;
        scale: 1;
        background: red;
    }
    50% {
        translate: 20vw;
        scale: 1.5;
        background: lime;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/oNmaGGv

这个示例说明：即使 `@keyframes` 中只定义了一个 `50%` 的帧、没有显式定义 `0%` 和 `100%`，动画中同样存在第一帧和最后一帧。由此可以总结出几个要点：

-   任何一个关键帧动画，第一帧（`0%`）和最后一帧（`100%`）不是绝对必须显式声明的；
-   `@keyframes` 中没有显式声明 `0%` 和 `100%`，并不表示没有第一帧和最后一帧，任何一个关键帧动画都有第一帧和最后一帧；
-   `@keyframes` 中没有显式声明 `0%` 和 `100%` 时，`animation-fill-mode` 属性值的作用不变。

结合前面的示例可以得出：`animation-fill-mode` 与 `@keyframes` 中第一个和最后一个显式声明的百分比选择器并无关联，它只与 `@keyframes` 的 `0%` 和 `100%` 选择器有关。换句话说，"关键帧的第一帧"指的是 `@keyframes` 中的 `0%` 或 `from` 选择器，"最后一帧"指的是 `@keyframes` 中的 `100%` 或 `to` 选择器。`animation-fill-mode` 属性决定着动画元素在关键帧执行完前后，应用的是 `@keyframes` 中 `0%` 选择器中的样式、`100%` 选择器中的样式，还是 CSS 预设值。

注意：如果 `@keyframes` 规则中没有显式指定 `0%` 和 `100%` 选择器对应的样式规则，那么它们将与动画元素在 CSS 中的预设值等同。

## 注意事项：动画方向与迭代次数的影响

乍一看，"向前"模式（`forwards`）总是使用 `100%` 关键帧，"向后"模式（`backwards`）总是使用 `0%` 关键帧，但实际上并不总是如此。因为关键帧的 `0%` 和 `100%` 会受到 CSS 的 `animation-direction` 和 `animation-iteration-count` 属性值的影响，动画的第一个关键帧实际上可能不是 `0%`，最后一个关键帧也可能不是 `100%`。

先看一个使用 `backwards` 但 `animation-direction` 设置为 `reverse` 的示例：

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

动画的方向被反转后（`animation-direction: reverse`），动画的第一个关键帧变成了 `100%`，动画开始之前元素使用的是 `100%` 关键帧的样式。这就是为什么动画元素一开始就位于右侧 `300px`（即 `translate: 300px`）且背景色为 `yellow`，然后慢慢向左移动、背景色慢慢变成 `lime` 色，最后跳到 `0` 位置（`translate: 0`）且背景色跳回红色（`red`）。

也就是说，当 `animation-direction` 为 `normal` 或 `alternate` 时，关键帧第一帧为 `0%` 或 `from`；当 `animation-direction` 的值为 `reverse` 或 `alternate-reverse` 时，关键帧的第一帧为 `100%` 或 `to`：

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

在这个示例中，完成整个动画之后，动画元素一直保持着向左移了 `300px`（`translate: -300px`）且背景色为 `lime` 的状态。这是因为该动画的最后一个关键帧是 `0%`——动画运行了两次，第一次迭代从 `0%` 到 `100%`，第二次迭代从 `100%` 到 `0%`。

可见，动画结束时 `forwards` 指定动画元素应用关键帧最后一帧的样式规则，但关键帧最后一帧会受到 `animation-direction`（动画运动方向）和 `animation-iteration-count`（播放次数）的影响：

| **`animation-direction`** | **`animation-iteration-count`** | **关键帧最后一帧**   |
| ------------------------- | ------------------------------- | ------------- |
| `normal`                  | 偶数或奇数                           | `100%` 或 `to` |
| `reverse`                 | 偶数或奇数                           | `0%` 或 `from` |
| `alternate`               | 偶数                              | `0%` 或 `from` |
| `alternate`               | 奇数                              | `100%` 或 `to` |
| `alternate-reverse`       | 偶数                              | `100%` 或 `to` |
| `alternate-reverse`       | 奇数                              | `0%` 或 `from` |

> Demo 地址：https://codepen.io/airen/full/OJdBQQp

实践要点：编写动画时要注意动画方向（`animation-direction`）和迭代次数（`animation-iteration-count`），确切判断动画第一个和最后一个关键帧是哪个，才能准确判断出动画填充模式最终会将哪个状态的样式应用到动画元素上：

> Demo 地址：https://codepen.io/airen/full/RwveQEo

## 案例：封面动画

下面是一个很常见的封面动画案例。"标题"、"描述文本"和"按钮"三个元素都应用了动画：

-   标题应用了一个 `zoomIn` 动画，整个动画大约持续了 `1s`；
-   描述文本应用了一个 `fadeInUp` 动画，整个动画大约持续了 `.6s`，并且延迟 `0.3s` 执行；
-   按钮应用了一个与描述文本相同的动画 `fadeInUp`，整个动画大约持续了 `1.2s`，并且延迟 `0.4s`。

三个动画执行完都保留在结束状态。

构建这样一个封面动画，需要的 HTML 结构如下：

```HTML
<div class="hero">
    <h1>NOUVEAU</h1>
    <p>NYC online clothing store</p>
    <button>Online Store</button>
    <figure><img src="hero.png" alt="hero" /></figure>
</div>
```

首先添加 CSS 代码完成整个封面的布局效果。接下来编写与动画相关的 CSS 代码：创建两个关键帧动画，一个用于标题，另一个用于描述文本和按钮：

```CSS
@keyframes zoomIn {
    from {
        scale: .3
    }
    to {
        scale: 1;
    }
}

@keyframes fadeInUp {
    from {
        translate: 0 50px
    }
    to {
        translate: 0 0;
    }
}
```

将关键帧动画应用到相应的动画元素上：

```CSS
.hero {
    & h1 {
        animation: zoomIn 1s cubic-bezier(.19,1,.22,1);
    }
    
    & p {
        animation: fadeInUp .6s cubic-bezier(.19,1,.22,1) .3s;
    }
    
    & button {
        animation: fadeInUp 1.2s cubic-bezier(.19,1,.22,1) .4s;
    }
}
```

上面代码没有给任何动画设置动画填充模式。把动画放慢速度播放，会发现两个问题：

-   标题应用的 `zoomIn` 动画会先将元素缩小到 `0.3`，再慢慢放大到 `1`，恢复到正常状态。由于该动画没有动画延迟（没有等待过程），动画运行时元素立即应用关键帧第一帧，然后到最后一帧结束；
-   描述文本和按钮则不同：最初位于原始位置不动，动画开始运行后，待动画延迟时间结束（关键帧开始运行）时，先向下移动 `50px`，然后再慢慢回到原始位置（即向上移动 `50px`）。

描述文本和按钮出现的"先下移再上移"的闪跳，正是因为延迟期间没有应用关键帧第一帧的样式。期望的效果是：三个元素都从关键帧第一帧开始运行到最后一帧，并且动画结束后保持在关键帧结束状态。这需要通过动画填充模式实现。

就本案例而言：标题的 `zoomIn` 动画没有延迟时间，只需确保动画结束之后标题样式保持关键帧最后一帧状态，将 `animation-fill-mode` 设置为 `forwards`；描述文本和按钮都有延迟时间（`.3s` 和 `.4s`），既要确保延迟期间样式与关键帧第一帧一致（`backwards`），又要确保动画结束之后样式与关键帧最后一帧一致（`forwards`），因此 `animation-fill-mode` 应设置为 `both`：

```CSS
.hero {
    & h1 {
        animation: zoomIn 1s cubic-bezier(.19,1,.22,1) forwards;
    }
    
    & p {
        animation: fadeInUp .6s cubic-bezier(.19,1,.22,1) .3s both;
    }
    
    & button {
        animation: fadeInUp 1.2s cubic-bezier(.19,1,.22,1) .4s both;
    }
}
```

处理后描述文本和按钮不会再有闪跳的突兀感。

另一个实践细节是：很多开发者在定义 `zoomIn` 和 `fadeInUp` 动画时，会将 `opacity` 属性加入（fade 系列动画通常如此），这样即使填充模式配置有疏漏，元素的视觉跳变也会被淡化：

```CSS
@layer animation {
    @keyframes zoomIn {
        from {
            opacity: 0;
            scale: 0.3;
        }
        to {
            opacity: 1;
            scale: 1;
        }
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            translate: 0 50px;
        }
        to {
            opacity: 1;
            translate: 0 0;
        }
    }

    .hero {
        & h1 {
            animation: zoomIn 1s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }
    
        & p {
            animation: fadeInUp 0.6s cubic-bezier(0.19, 1, 0.22, 1) 0.3s both;
        }
    
        & button {
            animation: fadeInUp 1.2s cubic-bezier(0.19, 1, 0.22, 1) 0.4s both;
        }
    }
}
```

> Demo 地址：https://codepen.io/airen/full/QWYZmNZ

这个案例说明，动画效果的细节将决定最终呈现的质量，哪怕微小的细节都会影响整体的动画效果。同时，做出正确填充模式选择的前提，是对动画填充模式的基础和理论有足够的了解。

## 小结

动画的复杂性很大程度上源于它们在动画结束时自动重置回初始状态的行为。`animation-fill-mode` 属性让开发者可以精确调整元素在动画运行之前和之后的样式，核心要点如下：

-   `animation-fill-mode` 控制的是关键帧之前和之后（等待与结束状态）的样式，动画进行中的样式始终由关键帧决定；
-   `forwards` 让元素保持在关键帧最后一帧（`100%`/`to`）的状态，适合结束后需要维持最终状态的动画；
-   `backwards` 让元素在延迟等待期间应用关键帧第一帧（`0%`/`from`）的状态，适合有延迟且不希望等待期间跳变的动画；
-   `both` 同时具备两者的特性，是最常用的组合取值；
-   关键帧的第一帧和最后一帧始终对应 `0%` 与 `100%` 选择器（未显式声明时等同 CSS 预设值），并且会受 `animation-direction` 和 `animation-iteration-count` 影响，组合这两个属性判断"实际的最后一帧"是准确使用填充模式的关键。

有了 `animation-fill-mode`，制作元素在两个状态之间永久过渡的复杂动画变得非常简单。
