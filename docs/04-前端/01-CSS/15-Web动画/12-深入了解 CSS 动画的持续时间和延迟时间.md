---
title: 深入了解 CSS 动画的持续时间和延迟时间
description: "在现代 Web 体验中，动画已经成为吸引用户、传递信息的不可或缺的元素。而在这场视觉盛宴中，CSS 帧动画和过渡动画以其简单易用的特性成为 Web 设计师和开发者的宠儿。要真正发挥 CSS 动画的潜力，深入了解动画的持续时间和延迟时间至关重要。"
keywords: [深入了解, CSS]
category: CSS
tags: [CSS, 布局, 动画, 响应式]
---


# 深入了解 CSS 动画的持续时间和延迟时间

## 概念说明

CSS 动画有两个核心时间参数：**持续时间**（Duration）和**延迟时间**（Delay）。

- **持续时间**定义动画从开始到结束所经历的时间长度，决定动画的速度与节奏。短持续时间适合快速、引人注目的效果；长持续时间适合呈现缓慢、连贯的状态变化。
- **延迟时间**定义动画从触发到实际开始的等待时间。通过为不同元素设置不同的延迟时间，可以构建错落有致的动画序列，引导用户注意力，并避免多个动画同时触发造成的视觉混乱。

这两个参数共同决定动画在时间轴上的时序，是控制动画速度、编排动画顺序的基础。

::: tip 核心关系
速度由距离和时间共同决定，其主要表现形式是缓动函数；时间参数则决定动画的时长与启动时机。缓动函数（`steps()`、`cubic-bezier()`、`linear()` 等）与时间参数相辅相成，缺一不可。
:::

## 时间轴与动画时序

### 动画的三种时间轴

CSS 动画目前有三种类型的时间轴：

- **文档时间轴（Document Timeline）**：当前文档的默认时间轴，在网页加载时自动创建。每个文档唯一，并在文档生命周期中保持不变。默认情况下，CSS 动画都使用文档时间轴，**动画播放进度跟随自然时间**。
- **滚动进度时间轴（Scroll Progress Timeline）**：与滚动容器沿特定轴的滚动位置进度关联的时间轴。
- **视图进度时间轴（View Progress Timeline）**：与滚动容器内特定元素的相对进度关联的时间轴。

滚动进度时间轴和视图进度时间轴由 CSS 滚动动效引入。使用这两种时间轴时，动画的播放进度由页面（或滚动容器）的滚动接管：滚动条滚动了多少，动画就播放多少，时间参数不再起作用。

> 特别声明，如无特别说明，以下内容均以文档时间轴阐述动画的延迟时间和持续时间。

### 过渡动画在时间轴上的呈现

通过 Chrome 浏览器的动画调试工具可以观察动画持续时间和延迟时间在时间轴上的呈现。以下是一个过渡动画示例：

```CSS
.transition {
    background-color: #09f;
    border-radius: 4px;
    transition: background-color 1s, translate 2s 1s, scale 3s 2s;
    
    &:hover {
        background-color: #f36;
        border-radius: 8px;
        scale: 1.2;
        translate: 0 -4px;
    }
}
```



> Demo 地址：https://codepen.io/airen/full/LYqQbGd

这个过渡动画对 `background-color`、`translate` 和 `scale` 三个 CSS 属性的状态变化进行动画化，其中：

- `background-color` 属性从 `#09f`（起始状态）过渡到 `#f36`（结束状态），共用时 `1s`（持续时间）
- `translate` 属性从 `0 0`（起始状态）过渡到 `0 -4px`（结束状态），共用时 `2s`（持续时间），并且延迟 `1s` 才开始执行
- `scale` 属性从 `1`（起始状态）过渡到 `1.2`（结束状态），共用时 `3s`（持续时间），并且延迟 `2s` 才开始执行

调试工具中三个属性的过渡运动曲线类似设计软件中的图层，只是附加了时间轴，每个属性过渡所用时间和等待时间都会展示出来。

CSS 过渡动画相对简单：每个动画化属性的状态只有初始状态（`A`）和结束状态（`B`）。

### 关键帧动画在时间轴上的呈现

同样的效果也可以用关键帧动画实现：

```CSS
@keyframes backgroundColor {
    to {
        background-color: #f36;
    }
}

@keyframes translate {
    to {
        translate: 0 -4px;
    }
}

@keyframes scale {
    to {
        scale: 1.2;
    }
}

.animated {
    background-color: #09f;
    border-radius: 4px;
    
    &:hover {
        animation:
            backgroundColor 1s forwards,
            translate 2s 1s forwards,
            scale 3s 2s forwards;
    }
}
```



> Demo 地址：https://codepen.io/airen/full/XWOZpNx

最终效果与前面的过渡动画一致。鼠标悬停在 `.animated` 元素上会同时触发三个关键帧动画（`@keyframes`），但它们的时序不同：

- `backgroundColor` 关键帧动画持续 `1s`
- `translate` 关键帧持续 `2s`，并延迟 `1s` 后开始执行
- `scale` 关键帧持续 `3s`，并延迟 `2s` 后开始执行

由于 `animation-fill-mode` 属性的值为 `forwards`，三个关键帧动画所设置的属性值将停留在最后一帧。

虽然该示例在 `.animated` 元素上应用了多个关键帧动画，但每个动画都只有初始状态和结束状态，并且只有单独的属性值变化。随着关键帧动画复杂度增加，对应的时序图也会更为复杂。

## 动画持续时间

在 CSS 中，过渡动画和关键帧动画都可以通过设置持续时间来定义动画时长，即动画从开始到结束所需的时间长度。两者作用相似，但存在一定差异。

### 过渡动画的持续时间

过渡动画通常使用 `transition-duration` 属性或其简写属性 `transition` 设定持续时间：

```CSS
.element {
    color: #09f;
    transition-property: color; /* 过渡的属性为width */
    transition-duration: 1s;    /* 过渡时间为1秒 */
    
    &:hover {
        color: #f36; /* 鼠标悬停时改变 color 属性的值（#09f 👉 #f36），触发过渡效果 */
    }
}
```

鼠标悬停在 `.element` 元素上时，`color` 属性的值会从 `#09f`（初始状态）过渡到 `#f36`（结束状态），整个过渡过程用时 `1s`，这个 `1s` 就是该过渡动画的持续时间。

过渡动画生效需要指定两个值：

- 希望进行动画的属性名称
- 过渡动画的持续时间

由于 `transition-duration` 属性的默认值为 `0`，属性状态变化会瞬间完成，肉眼无法看到平滑过渡的过程，从而产生没有过渡动画的错觉。

> Demo 地址：https://codepen.io/airen/full/ZEwrLdP

当 `transition-duration` 的值为 `0` 时，属性状态变化没有平滑过渡的过程，呈现的是一闪而过的效果，即从初始状态到结束状态瞬间发生。

#### 持续时间的多值匹配规则

`transition-duration` 可以指定多个过渡持续时间，以逗号（`,`）分隔。每个持续时间会应用到 `transition-property` 指定的对应属性上。如果持续时间的个数小于属性个数，持续时间列表会重复；反之，多出来的持续时间会被忽略：

```CSS
.element {
    transition-property: color, translate, scale, rotate, opacity;
    transition-duration: .1s;
}

.element {
    transition-property: color, translate, scale, rotate, opacity;
    transition-duration: .1s, .2s;
}

.element {
    transition-property: color, translate, scale, rotate, opacity;
    transition-duration: .1s, .2s, .3s;
}
```

如果持续时间列表比属性列表长，多出来的值会被忽略：

```CSS
.element {
    transition-property: color, translate;
    transition-duration: .1s, .2s, .3s;
}
```

上面示例中 `.3s` 会被忽略：`.1s` 对应 `color` 属性过渡，`.2s` 对应 `translate` 属性过渡，`.3s` 找不到对应的过渡属性。

::: tip 利用多值匹配为不同属性设置不同时长
不同属性使用不同的过渡持续时间，可以让元素的悬停反馈更精细：小变化用短时长，大变化用长时长。
:::

```CSS
.element {
    background-color: #09f;
    border-radius: 4px;
    transition: 
        background-color 1s,
        border-radius .75s,
        scale .5s,
        translate .25s;
    
    &:hover {
        background-color: #f36;
        border-radius: 18px;
        scale: 1.5;
        translate: 0 -10px;
    }
}
```



> Demo 地址：https://codepen.io/airen/full/eYxVvrN

### 关键帧动画的持续时间

关键帧动画通常使用 `animation-duration` 属性或其简写属性 `animation` 设置持续时间：

```CSS
@keyframes slide {
    to {
        translate: 100px;
    }
}
.element {
    animation-duration: 2s; /* 持续时间为2秒 */
    animation-name: slide; /* 动画名称为slide，需要事先定义该动画 */
}
```

关键帧动画的持续时间指该动画完成一个周期所需的时间，即完成 `@keyframes` 中定义的动画。

`animation-duration` 与 `transition-duration` 一样，未提供值时使用默认值 `0`。但两者行为有差异：关键帧动画即使未显式指定持续时间，动画仍然会执行，并会触发 `animationstart` 和 `animationend` 事件。

`animation-duration` 为 `0` 时，动画是否可见取决于 `animation-fill-mode` 的值，而 `animation-fill-mode` 的表现又受 `animation-direction` 属性影响：

```CSS
@keyframes ani {
    to {
        translate: 1000px;
        border-radius: 50%;
    }
}

.animated {
    animation: ani var(--animation-duration, 0s) var(--animation-fill-mode, none) var(--animation-direction, normal);
}
```



> Demo 地址：https://codepen.io/airen/full/xxMYWGQ

`animation-duration` 为 `0` 时，`animation-fill-mode` 和 `animation-direction` 取不同值，关键帧动画的最终位置会有所不同：

- `animation-fill-mode` 设置为 `forwards` 或 `both`，且 `animation-direction` 设置为 `normal` 或 `alternate`：动画显示最后一帧
- `animation-fill-mode` 设置为 `forwards` 或 `both`，但 `animation-direction` 设置为 `reverse` 或 `alternate-reverse`：动画显示第一帧
- `animation-fill-mode` 设置为 `backwards`：无论 `animation-direction` 取何值，动画始终显示第一帧
- `animation-fill-mode` 设置为 `none`：动画没有任何视觉效果

若 `animation-duration` 不为 `0`，关键帧动画会有平滑的运动过程，元素最终保持的状态同样受 `animation-fill-mode` 和 `animation-direction` 属性值的影响。

#### 关键帧百分比与持续时间的关系

过渡动画的持续时间周期对应的是过渡属性初始状态到结束状态；关键帧动画的持续时间周期对应的则是整个 `@keyframes`：

```CSS
@layer animation {
    @keyframes ani {
        50% {
            scale: .5;
        }
        to {
            translate: calc(60vw - 1.25rem);
            rotate: 360deg;
            scale: 1.1
        }
    }
    .animated {
        animation: ani var(--animation-duration, 1s) infinite;
    }
} 
```



> Demo 地址：https://codepen.io/airen/full/MWLQVOX

整个时间轴上只有 `.animated` 元素应用的 `ani` 关键帧，并不像过渡动画那样把所有过渡属性在时间轴上呈现出来。该示例中 `ani` 有三个关键位置：初始位置 `0%` 或 `from`（示例中未显式定义，对应元素相应属性的初始值）、`50%` 和 `to`（或 `100%`）。它与下面显式设置 `from` 的关键帧等同：

```CSS
/* 未显示设置 from 或 0% 的 ani 关键帧 */
@keyframes ani {
    50% {
        scale: .5;
    }
    to {
        translate: calc(60vw - 1.25rem);
        rotate: 360deg;
        scale: 1.1
    }
}

/* 等同于（显式设置 from 或 0% 的 ani 关键帧）*/
@keyframes ani {
    from {
        translate: 0; /* 或 none */
        rotate: 0deg; /* 或 none */
        scale: 1;    /* 或 none */
    }
    50% {
        scale: .5;
    }
    to {
        translate: calc(60vw - 1.25rem);
        rotate: 360deg;
        scale: 1.1
    }
}
```

通过 `animation-duration` 属性给 `ani` 关键帧动画设置的持续时间 `1s`，即动画一个周期所花费的时间。由于示例动画设置了无限次循环播放，关键帧动画完成第一个时间周期后会重新播放，时间轴上会出现无限个 `0s ~ 1s` 的过程。

只看第一个时间周期（`0s` 到 `1s`），时间轴上存在三个节点，分别对应 `@keyframes` 中的百分比选择器：

- `from` 或 `0%` 对应持续时间周期的 `0%` 位置，即 `0s` 时间位置
- `50%` 对应持续时间周期的 `50%` 位置，即 `.5s` 时间位置
- `to` 或 `100%` 对应持续时间周期的 `100%` 位置，即 `1s` 时间位置

由此可以确定：**`@keyframes` 中的百分比选择器是相对于动画的持续时间计算的**。

#### 关键帧动画持续时间的多值匹配

`animation-duration` 同样支持多个值。与 `transition-duration` 不同的是，多个持续时间映射的是 `animation-name` 属性指定的关键帧动画名称：

```CSS
.animated {
    animation-name: translate, rotate, scale;
    animation-duration: 1s;
    
    /* 等同于 */
    animation-duration: 1s, 1s, 1s;
}

.animated {
    animation-name: translate, rotate, scale;
    animation-duration: 1s, 2s;
    
    /* 等同于 */
    animation-duration: 1s, 2s, 1s;
}

.animated {
    animation-name: translate, rotate, scale;
    animation-duration: 1s, 2s, 3s; /* 每个关键帧动画有相应的持续时间 */
}

.animated {
    animation-name: translate, rotate, scale;
    animation-duration: 1s, 2s, 3s, 4s;
    
    /* 等同于 */
    animation-duration: 1s, 2s, 3s; /* 持续时间 4s 没有相应的关键帧动画，将会被忽略 */
}
```

将单个 `ani` 关键帧动画拆分为 `translate`、`rotate` 和 `scale` 三个关键帧动画，并分别应用 `1s`、`2s` 和 `3s` 的持续时间：

```CSS
@keyframes translate {
    to {
        translate: calc(60vw - 1.25rem);
    }
}

@keyframes rotate {
    to {
        rotate: 360deg;
    }
}

@keyfrmaes scale {
    50% {
        scale: .5;
    }
    
    to {
        scale: 1.1;
    }
}

.animated {
    animation-name: translate, rotate, scale;
    animation-duration: 1s, 2s, 3s;
}
```



> Demo 地址：https://codepen.io/airen/full/PoVQaQM

此时 `.animated` 元素同时应用了三个持续时间不同的关键帧动画，时间轴上会呈现三个时间周期不同的动画：

- `translate` 关键帧动画的持续时间周期是 `1s`，对应的关键帧只有 `from` 和 `to`，以 `1s` 为一个周期不断循环
- `rotate` 关键帧动画的持续时间周期是 `2s`，对应的关键帧也只有 `from` 和 `to`，以 `2s` 为一个周期不断循环
- `scale` 关键帧动画的持续时间周期是 `3s`，对应的关键帧分别是 `from`、`50%` 和 `to`，以 `3s` 为一个周期不断循环

也就是说，`scale` 动画播放一次时，`rotate` 动画播放了两次，`translate` 动画播放了三次。

### 动画持续时间的最佳实践

动画速度对可用性至关重要：过快难以观察甚至令人晕眩；过慢显得冗长，给用户延迟感。持续时间是决定动画速度的关键要素——距离相等时，持续时间太短会导致动画过快，太长则过慢。

::: tip 经验法则
寻找能够在没有刺眼感的情况下完成动画的最短时间。相比过短，动画过长的情况更为常见。
:::

许多研究发现，用户界面上的动画最佳速度在 `200ms ~ 500ms` 之间，这一区间基于人脑的特定特性：短于 `100ms` 的动画是瞬时的，不会被察觉；超过 `1s` 的动画会给用户延迟感，显得乏味。

[Material Design](https://material.io/design/motion/speed.html#duration) 对此做过大量研究和实践，其建议如下：

| 设备类型 | 建议持续时间 | 原因 |
|---|---|---|
| 移动设备 | `200ms ~ 300ms` | 基准值 |
| 平板电脑 | `400ms ~ 450ms`（比移动设备长约 30%） | 屏幕尺寸较大，对象移动距离更长 |
| 可穿戴设备 | `150ms ~ 200ms`（比移动设备短约 30%） | 屏幕较小，移动距离较短 |
| Web 过渡 | `150ms ~ 200ms` | 用户期望浏览器中状态快速切换 |

这符合"更长距离用时更长、更短距离用时更少"的运动规律，也更接近现实生活中物体的运动法则。

::: warning 例外情况
为网站创建装饰性动画或试图引起用户对某些元素的注意时，可以忽略上述规则，持续时间可以更长。
:::

除移动距离外，动画持续时间还取决于对象的大小：较小的元素或变化较小的动画应移动得更快；大型、复杂元素的动画稍长会看起来更好。在相同大小的移动对象中，最先停止的是移动距离最短的对象；相对较小的对象移动较慢，产生的偏移距离更大。碰撞的能量必须根据物理法则均匀分配，因此应避免弹跳效果，只在确实有意义的特殊情况下使用（弹跳效果容易分散注意力）。

几类典型场景的参考值：

- **简单反馈动画**（复选框、切换开关）：总持续时间约 `100ms`，对用户感觉是立即的，可创建物理操纵对象的错觉
- **屏幕较大变化**（模态框移入）：`200ms ~ 300ms` 较为合适；元素移动距离越远，保证平稳且不刺眼就越重要（尤其对运动敏感的用户）
- **对象出现与消失**：出现的动画通常比消失的略长，例如弹出窗口可能需要 `300ms` 出现，只需 `200ms ~ 250ms` 消失
- **列表项出现**：新列表项每次出现持续 `20ms ~ 25ms`，速度慢会让用户感到烦恼

综合而言，可以按以下档位设置持续时间：

- 淡入淡出和颜色动画：几乎瞬时的持续时间（小于 `100ms`）
- 简单效果和较小的动画：较短持续时间，约 `100ms ~ 300ms`，适用于触摸、点击、滑动等用户发起的反馈操作
- 复杂效果和较大规模的动画（页面过渡、对象进出屏幕）：较长持续时间（大于 `300ms`）
- 慢动画（大于 `500ms`）：保留给大幅移动和影响氛围的背景元素

::: warning 持续时间不是速度的唯一决定因素
除运动距离、物体大小之外，缓动函数也会影响动画速度。相同大小、相等距离、相同持续时间的元素，应用不同的缓动函数，最终的运动速度也不同。
:::

## 动画延迟时间

CSS 动画的延迟时间指动画开始执行之前等待的时间长度。在这段延迟时间内，元素保持原始状态；延迟时间结束后，动画按定义的规则播放。这使得页面元素可以在一定时间间隔后再开始动画，而不是立即开始。

### 过渡动画的延迟时间

过渡动画使用 `transition-delay` 属性或其简写属性 `transition` 指定延迟时间。以下示例用过渡动画模拟开关灯：灯光状态改变时产生过渡效果，并在按下开关后等待一段时间再开始过渡：

```CSS
.lamp {
    opacity: .25;
    transition: opacity 1s ease-out 0.5s; /* 过渡效果：1秒，延迟0.5秒开始 */
}

.lamp--on {
    opacity: 1; /* 开关打开后，灯光立即变亮 */
}
```



> Demo 地址：https://codepen.io/airen/full/abXqQRr

当灯光状态从关闭（`opacity: .25`）变为打开（`opacity: 1`）时，将产生 `1s` 的过渡效果，并且在按下开关后延迟 `0.5s` 才开始执行。即从按下开关那一刻起计算，`0.5s` 之后灯光才由暗平滑过渡到亮。

显式指定延迟时间的过渡动画，在时间轴上会有一个明显的等待时间段。

#### 延迟时间的多值匹配规则

与持续时间类似，`transition-delay` 可以指定多个延迟时间，以逗号分隔。每个延迟时间会应用到 `transition-property` 指定的对应属性上；个数小于属性个数时列表重复，多于属性个数时多出的值被忽略：

```CSS
.element {
    transition-property: color, translate, scale, rotate, opacity;
    transition-delay: .5s;
    
    /* 等同于 */
    transition-delay: .5s, .5s, .5s, .5s, .5s;
}

.element {
    transition-property: color, translate, scale, rotate, opacity;
    transition-delay: .5s, 1s;
    
    /* 等同于 */
    transition-delay: .5s, 1s, .5s, 1s, .5s;
}

.element {
    transition-property: color, translate, scale, rotate, opacity;
    transition-delay: .5s, 1s, 1.5s;
    
    /* 等同于 */
    transition-delay: .5s, 1s, 1.5s, .5s, 1s;
}

.element {
    transition-property: color, translate, scale, rotate, opacity;
    transition-delay: .5s, 1s, 1.5s, 2s;
    
    /* 等同于 */
    transition-delay: .5s, 1s, 1.5s, 2s, .5s;
}

.element {
    transition-property: color, translate, scale, rotate, opacity;
    transition-delay: .5s, 1s, 1.5s, 2s, 2.5s;
    
    /* 等同于 */
    transition-delay: .5s, 1s, 1.5s, 2s, 2.5s;
}

.element {
    transition-property: color, translate, scale, rotate, opacity;
    transition-delay: .5s, 1s, 1.5s, 2s, 2.5s, 3s;
    
    /* 等同于 */
    transition-delay: .5s, 1s, 1.5s, 2s, 2.5s; /* 3s 将会被忽略 */
}
```

利用该特性可以实现分段的过渡动画：

```CSS
.element {
    background-color: #09f;
    transition: 
        background-color 1s,
        translate 1s 1s,
        rotate 1s 2s,
        scale 1s 3s;
        
    &.player {
        background-color: #f36;
        translate: 100px;
        rotate: 315deg;
        scale: .65; 
    }
}
```



> Demo 地址：https://codepen.io/airen/full/poGaGNg

通过逗号将多个过渡效果连接在一起，并为每个过渡效果指定不同的延迟时间，可以创建类似关键帧动画的多步过渡效果。当 `.element` 元素的过渡动画被触发（添加 `.player` 类）时，由以下几个过渡效果组成：

- 背景颜色以 `1s` 时长从 `#09f` 平滑过渡到 `#f36`
- `1s` 之后（`background-color` 过渡完成时），元素从初始位置向右移动 `100px`，该过渡持续 `1s`，相对于 `background-color` 过渡延迟了 `1s`
- `translate` 过渡完成后，元素花费 `1s` 从 `0deg` 旋转到 `315deg`，相对于 `background-color` 过渡延迟了 `2s`，相对于 `translate` 过渡延迟了 `1s`
- 最后元素缩小到 `.65`（`scale` 从 `1` 过渡到 `.65`），耗时 `1s`，相对于 `background-color` 延迟 `3s`、相对于 `translate` 延迟 `2s`、相对于 `rotate` 延迟 `1s`

这种编排方式可以增加过渡动画的额外动作。例如让按钮在悬停状态下呈现多步过渡动画效果：

```HTML
<button>
    Welcome CSS.<span>Transition Is Cool.</span>
</button>
```



```CSS
@layer demo {
    button {
        border: 5px solid transparent;
        background: #aed6d1;
        color: #333;
        border-radius: 999rem;
        padding: 15px 30px;
        overflow: hidden;
        width: 200px;
        cursor: pointer;
        white-space: nowrap;
        text-indent: 23px;
        font-weight: bold;
        
        transition: all 1.2s, border 0.5s 1.2s, box-shadow 0.3s 1.5s;
        
        & span {
            display: inline-flex;
            font-weight: normal;
          
            translate: 100%;
            opacity: 0;
            transition: opacity 0.1s 0.5s, translate 0.4s 0.5s;
        }
        
        &:hover {
            text-indent: 0;
            background: #55706d;
            color: #ffe8a3;
            width: 300px;
            border: 10px solid #8dccc4;
            box-shadow: 3px 3px 2px color-mix(in oklch, #000, transparent 85%);
          
            & span {
                translate: 0;
                opacity: 1;
            }
        }
    }
}
```



> Demo 地址：https://codepen.io/airen/full/MWLQxwO

#### 负值的延迟时间

`transition-delay` 可以接受负值。负延迟时间下过渡动画会立即执行，但不是从头开始，而是从过渡执行了延迟时间的那一刻开始，即过渡在播放周期的某个阶段开始。[W3C 规范](https://www.w3.org/TR/css-transitions-1/#transition-delay-property)指出：如果过渡具有隐含的起始值并且具有负的 `transition-delay`，起始值将从属性更改的时刻获取。

例如三个元素的 `background-color` 都用时 `3s` 从 `red` 过渡到 `lime`，延迟时间分别为 `0`、`1.5s` 和 `-1.5s`：

- 第一个元素立即执行，有持续 `3s` 的平滑过程
- 第二个元素延迟 `1.5s` 后执行，同样有持续 `3s` 的平滑过程
- 第三个元素立即执行，但从中间状态开始，肉眼几乎看不到平滑过渡

> Demo 地址：https://codepen.io/airen/full/ZEwxWmK

下面的示例更直观地展示负延迟的偏移效果：

```HTML
<!-- transition-delay: 0s -->
<div class="container">
    <div class="animated ani1" style="--delay: 0s; --bg: #09eafc"></div>
</div>

<!-- transition-delay: 2s -->
<div class="container">
    <div class="animated ani2" style="--delay: 2s; --bg: #f36afc"></div>
</div>

<!-- transition-delay: -2s -->
<div class="container">
    <div class="animated ani3" style="--delay: -2s; --bg: #f3590a"></div>
</div>

<!-- transition-delay: -8s -->
<div class="container">
    <div class="animated ani4" style="--delay: -8s; --bg: #4aecdf"></div>
</div>
```



```CSS
@layer animation {
    .animated {
        translate: 0;
        transition: translate 6s var(--delay);
    
        &.player {
            translate: 600px;
        }
    }
}
```



> Demo 地址：https://codepen.io/airen/full/ExrQMbG

延迟为 `-2s` 的元素位置瞬间到达约 `350px` 处，然后执行过渡动画；延迟为 `-8s` 的元素位置瞬间到达 `600px`（结束状态），看不到任何过渡效果。

负值延迟应用得当，可以为过渡动画带来更协调、更优雅的效果。例如下述悬浮效果，左侧使用正延迟时间，右侧使用负延迟时间，两者都是错落有致的效果，但负延迟一侧的整体观感更自然：

> Demo 地址：https://codepen.io/airen/full/poGLbOL

在此基础上稍微调整过渡参数，可以得到更别致的悬浮效果；若按钮上的点足够多，还可以模拟简单的粒子效果：

> Demo 地址：https://codepen.io/airen/full/eYxMdYx

### 关键帧动画的延迟时间

关键帧动画使用 `animation-delay` 属性或其简写属性 `animation` 指定延迟时间。以下示例用关键帧动画模拟灯光逐渐变亮的过程：

```CSS
@keyframes lightUp {
    to {
        opacity: 1; /* 最终状态：完全亮起 */
    }
}

.lamp {
    opacity: .25; /* 最初状态：灯光未点亮 */
    animation: lightUp 2s ease-out 1s; /* 动画持续 2s，延迟 1s 开始 */
}
```



> Demo 地址：https://codepen.io/airen/full/XWOEjpv

该示例通过 `animation` 属性（或子属性 `animation-delay`）给关键帧动画 `lightUp` 指定了延迟时间 `1s`：按下开关 `1s` 之后，灯光才由暗逐渐变亮，过程持续 `2s`（`animation-duration: 2s`）。由于 `animation-fill-mode` 属性设置为 `both`，动画执行完后元素停留在关键帧最后一帧的状态，灯保持常亮。

从等待（延迟 `1s`）到动画执行完（持续 `2s`），整个过程总共用时 `3s`。

#### 延迟时间的多值匹配规则

与持续时间类似，`animation-delay` 可以指定多个延迟时间，以逗号分隔。每个延迟时间会应用到 `animation-name` 指定的对应关键帧动画上；个数小于关键帧动画个数时列表重复，多于时多出的值被忽略：

```CSS
.element {
    animation-name: color, translate, scale, rotate, opacity;
    animation-delay: .5s;
    
    /* 等同于 */
    animation-delay: .5s, .5s, .5s, .5s, .5s;
}

.element {
    animation-name: color, translate, scale, rotate, opacity;
    animation-delay: .5s, 1s;
    
    /* 等同于 */
    animation-delay: .5s, 1s, .5s, 1s, .5s;
}

.element {
    animation-name: color, translate, scale, rotate, opacity;
    animation-delay: .5s, 1s, 1.5s;
    
    /* 等同于 */
    animation-delay: .5s, 1s, 1.5s, .5s, 1s;
}

.element {
    animation-name: color, translate, scale, rotate, opacity;
    animation-delay: .5s, 1s, 1.5s, 2s;
    
    /* 等同于 */
    animation-delay: .5s, 1s, 1.5s, 2s, .5s;
}

.element {
    animation-name: color, translate, scale, rotate, opacity;
    animation-delay: .5s, 1s, 1.5s, 2s, 2.5s;
    
    /* 等同于 */
    animation-delay: .5s, 1s, 1.5s, 2s, 2.5s;
}

.element {
    animation-name: color, translate, scale, rotate, opacity;
    animation-delay: .5s, 1s, 1.5s, 2s, 2.5s, 3s;
    
    /* 等同于 */
    animation-delay: .5s, 1s, 1.5s, 2s, 2.5s; /* 3s 将会被忽略 */
}
```

为不同元素上应用的关键帧动画指定不同的延迟时间，可以制作列表项错落有致、依次出现的动画效果。HTML 结构如下，通过内联样式为每个动画元素定义 `--delay` 自定义属性：

```HTML
<ul class="lists">
    <li class="item">
        <div class="list__icon" style="--delay: 0s;">
            <svg> </svg>
        </div>
        <div class="list__content" style="--delay: 0.8s;">
            <h4>Basic design skills</h4>
            <p>Read 15 lectures...</p>
        </div>
    </li>
    <li class="item">
        <div class="list__icon" style="--delay: 1.6s;">
            <svg> </svg>
        </div>
        <div class="list__content" style="--delay: 2.4s;">
            <h4>Composition principles</h4>
            <p>We discover classic ...</p>
        </div>
    </li>
    <li class="item">
        <div class="list__icon" style="--delay: 3.2s;">
            <svg> </svg>
        </div>
        <div class="list__content" style="--delay: 4.0s;">
            <h4>Being confident in graphic software</h4>
            <p>Be qualified! We...</p>
        </div>
    </li>
  </ul>
```

`.list__icon` 和 `.list__content` 对应的标签上以内联样式定义了 `--delay`，用于设置每个动画元素的延迟时间（示例中相邻元素延迟 `.8s`）。两个关键帧动画分别应用到两类元素上：

```CSS
@layer animation {
    /* 用于列表标记 .list__icon */
    @keyframes zoomIn {
        to {
          scale: 1;
          opacity: 1;
        }
    }
  
    /* 用于列表内容 .list__content */
    @keyframes fadeInLeft {
        to {
            opacity: 1;
            translate: 0;
        }
    }
  
    .list__icon {
        /* 初始状态 */
        opacity: 0;
        scale: 0;
        
        animation: zoomIn 2s cubic-bezier(0.19, 1, 0.22, 1) var(--delay) both;
    }
  
    .list__content {
        /* 初始状态 */
        opacity: 0;
        translate: 100px;
        
        animation: fadeInLeft 1s cubic-bezier(0.19, 1, 0.22, 1) var(--delay) both;
    }
}
```



> Demo 地址：https://codepen.io/airen/full/NWoYRee

#### 负值的延迟时间

`animation-delay` 通常接受正值，表示动画延迟开始的时间。负值则不再表示延迟，而是一个**偏移量**：关键帧动画立即开始，并在指定的时间偏移内自动推进，如同动画在过去的某个时间点已经开始，因此呈现为在活跃持续时间的中间开始。该特性可以更灵活地控制动画的启动时机。

使用负动画延迟可以让错开动画看起来更自然。例如一组元素依次循环播放、类似波浪形的动画：

> Demo 地址：https://codepen.io/airen/full/YzBaZBr

示例使用与元素索引对应的自定义属性 `--i` 计算 `animation-delay` 值：

```HTML
<h1>
    <span style="--i: 0"><span>H</span></span>
    <span style="--i: 1"><span>E</span></span>
    <span style="--i: 2"><span>L</span></span>
    <span style="--i: 3"><span>L</span></span>
    <span style="--i: 4"><span>O</span></span>
    <span style="--i: 5"><span>C</span></span>
    <span style="--i: 6"><span>S</span></span>
    <span style="--i: 7"><span>S</span></span>
</h1>
```



```CSS
@layer animation {
    @keyframes bounce {
        0% {
            translate: 0 0 0;
            rotate: y 0deg;
            scale: 1 1;
            animation-timing-function: ease-in;
        }
        45% {
            translate: 0 4em 0;
            rotate: y 180deg;
            scale: 1 1;
            animation-timing-function: ease-in;
        }
        50% {
            translate: 0 4em 0;
            rotate: y 180deg;
            scale: 1 0.2;
            animation-timing-function: ease-out, ease-out, linear;
        }
        100% {
            translate: 0 0 0;
            rotate: y 0deg;
            scale: 1 1;
            animation-timing-function: ease-out;
        }
    }

    @keyframes shadow {
        0% {
            translate: 0 3.8em 0;
            scale: 1.5 0.3 1;
            opacity: 0;
            animation-timing-function: ease-in;
        }
        45% {
            translate: 0 3.8em 0;
            scale: 0.8 0.2 1;
            opacity: 1;
            animation-timing-function: ease-in;
        }
        50% {
            translate: 0 3.8em 0;
            scale: 0.8 0.2 1;
            opacity: 1;
            animation-timing-function: linear;
        }
        100% {
            translate: 0 3.8em 0;
            scale: 1.5 0.3 1;
            opacity: 0;
            animation-timing-function: ease-out;
        }
    }
    
    h1 {
        --hue: 60;
    }
    
    span {
        --stagger: -200ms;
        --delay: calc(var(--i) * var(--stagger, 200ms));
        > span {
            animation: bounce 2000ms var(--delay, 0ms) infinite;
            transform-origin: center bottom;
        }
    }

    span:not(span > span)::after {
        translate: 0 3.8em 0;
        scale: 0.8 0.3 1;
        transform-origin: center top;
        animation: shadow 2000ms var(--delay, 0ms) infinite;
    }
}
```



> Demo 地址：https://codepen.io/airen/full/gOqzGYv

`animation-delay` 负值中的负号是一个信号，告诉浏览器将该值视为偏移而不是延迟：动画立即执行，并自动按延迟绝对值推进，如同动画在过去的某个时间点开始。如果动画的关键帧有隐含的起始值，这些值从动画开始的时间获取，而不是从过去的时间点。

偏移量大于动画单次迭代的持续时间也没有问题：动画将从迭代中起始点所在的任意点开始。前提是迭代次数足够覆盖起始点；如果迭代次数不够且偏移量较大，动画不会运行：

```HTML
<div class="container">
    <div class="animated ani1" style="--delay: 0s; --bg: #09eafc"></div>
</div>

<div class="container">
    <div class="animated ani2" style="--delay: 2s; --bg: #f36afc"></div>
</div>

<div class="container">
    <div class="animated ani3" style="--delay: -2s; --bg: #f3590a"></div>
</div>

<div class="container">
    <div class="animated ani4" style="--delay: -10s; --bg: #4aecdf"></div>
</div>
```



```CSS
@layer animation {
    @keyframes ani{
        from {
            translate: 0;
        }
        to {
            translate: 600px;
        }
    }
  
    .player {
        animation: ani 3s var(--delay) both 3;
    }
}
```



该示例中 `ani` 循环播放 `3` 次，每次持续 `3s`。最后一个元素延迟时间为 `-10s`，其绝对值大于动画三次循环的总时长（`9s`），因此该元素不会有任何动画效果，一瞬间就到达 `ani` 关键帧的最终状态（示例中 `animation-fill-mode` 设置为 `both`）。

> Demo 地址：https://codepen.io/airen/full/VwgxMmM

综上，通过 `animation-delay` 属性可以让动画稍后开始、立即从开头开始，或立即开始并在动画中途播放。

需要注意：`animation-delay` 只能延迟动画的启动，启动后动画会持续运行。CSS 没有内置方法在 `@keyframes` 动画的每次迭代之间添加暂停——例如"动画运行 `1s`，然后延迟 `4s` 再次运行"无法直接实现，但可以模拟。

#### 模拟迭代之间的暂停

虽然没有内置的迭代间暂停，但可以通过关键帧百分比模拟：

```CSS
@layer animation {
    @keyframes move {
        20%, 100% {
            translate: calc(100% + 50vw);
            rotate: 360deg;
        }
    }
  
    .ball {
        animation: move 5s infinite ease-in-out;
    }
} 
```



> Demo 地址：https://codepen.io/airen/full/eYxdjZL

原理是让关键帧在 `20%` 到 `100%` 之间保持相同的属性值，动画在前 `20%` 的时间段内执行实际运动，其余时间停留在同一状态，视觉上形成暂停。

再看一个流星雨案例（由 [@Yusuke Nakaya](https://codepen.io/YusukeNakaya/full/XyOaBj) 提供）：

> Demo 地址：https://codepen.io/airen/full/gOqzoYM （来源于 [@Yusuke Nakaya](https://codepen.io/YusukeNakaya/full/XyOaBj) ）

该效果放在首页横幅上时，密集的流星会干扰主内容。若想减少星星数量以降低干扰、防止 CPU 过热，同时让流星看起来仍是随机产生的，就需要通过 `@keyframes` 对流星雨动画做延迟处理：

```CSS
@layer animation {
    @keyframes tail {
        /* 动画发生在 0% 和 50% 之间 */
        0% {
            width: 0;
        }
        15% {
            width: 100px;
        }
        /* 动画在 50% ~ 100% 之间暂停（延迟） */
        50%,
        100% {
            width: 0;
        }
    }

    @keyframes shining {
        /* 动画发生在 0% 和 50% 之间 */
        0% {
            width: 0;
        }
        25% {
            width: 30px;
        }
        /* 动画在 50% ~ 100% 之间暂停（延迟） */
        50%,
        100% {
            width: 0;
        }
    }
    
    @keyframes shooting {
        /* 动画发生在 0% 和 50% 之间 */
        0% {
            translate: 0;
        }
        /* 动画在 50% ~ 100% 之间暂停（延迟） */
        50%,
        100% {
            translate: 300px;
        }
    }
    
    .shooting_star {
        animation: 
            tail 6000ms ease-in-out infinite var(--delay),
            shooting 6000ms ease-in-out infinite var(--delay);
    
        &::before {
            animation: shining 6000ms ease-in-out infinite var(--delay);
        }
    
        &::after {
            animation: shining 6000ms ease-in-out infinite var(--delay);
        }
    }
}
```



> Demo 地址：https://codepen.io/airen/full/OJdZzyW

这种方案的做法是：先确定迭代之间需要的延迟时间，然后将实际动画的关键帧压缩到 `100%` 的一小部分，再让动画保持最终状态直到 `100%`，从而形成暂停。主要缺点是每个关键帧都必须手动调整，容易出错；把所有关键帧换算回 `100%` 的时间刻度，也会增加理解动画逻辑的难度。

关键在于把所需时间转换为关键帧百分比。计算方法：例如动画持续时间为 `1s`，`0%` 处为起始关键帧，`20%` 处为相同值（等待 `0.2s`），结束关键帧放在 `80%` 处，`100%` 处再次使用相同的结束值，则动画将等待 `0.2s`、运行 `0.6s`、再等待 `0.2s`。

以下例说明百分比的定义方法：每个圆点在实际动画前等待 `0.15s`，动画持续 `0.5s`，整个过程 `1s`。第四个圆点等待 `0s`、动画 `0.5s`、再等待 `0.5s`；第二个圆点等待 `0.15s`、动画 `0.5s`、再等待 `0.35s`，依此类推。

> Demo 地址：https://codepen.io/airen/full/WNPJMXB

实现需要四个关键帧（三对关键帧）：`1` 和 `2` 用于等待延迟，`2` 和 `3` 用于实际动画时间，`3` 和 `4` 用于最终等待。以第二个圆点为例，先等待 `0.15 x 2 = 0.3s`，再进行 `0.5s` 的动画，总持续时间 `1s`，关键帧百分比计算如下：

```
0s   = 0%
0.3s = 0.3 / 1s * 100 =  30%
0.8s = (0.3 + 0.5) / 1s * 100 = 80%
1s   = 100%
```

按此计算，四个圆点对应四组关键帧。HTML 结构如下：

```HTML
<div id="container">
    <span></span>
    <span></span>
    <span></span>
    <span></span>
</div>
```



```CSS
@layer animation {
    @keyframes dot1 {
        0% {
            translate: 0;
        }
        50%,
        100% {
            translate: 60px;
        }
    }

    @keyframes dot2 {
        0%,
        15% {
            translate: 0;
        }
        65%,
        100% {
            translate: 60px;
        }
    }

    @keyframes dot3 {
        0%,
        30% {
            translate: 0;
        }
        80%,
        100% {
            translate: 60px;
        }
    }

    @keyframes dot4 {
        0%,
        45% {
            translate: 0;
        }
        95%,
        100% {
            translate: 60px;
        }
    }
    
    span {
        animation: dot4 1s infinite;
        
        &:nth-child(1) {
            animation-name: dot4;
        }
        &:nth-child(2) {
            animation-name: dot3;
        }
        &:nth-child(3) {
            animation-name: dot2;
        }
        &:nth-child(4) {
            animation-name: dot1;
        }
    } 
}
```

整个动画（包括嵌入到关键帧中的交错时间和等待时间）总共正好一秒，动画不会失去同步。

Sass 可以用 `for` 循环和内联数学自动化该计算过程，编译成一系列关键帧动画。通过操纵时间变量可以实验和测试，找出动画效果最佳的设置：

```SCSS
$animTime: 0.5s;
$totalTime: 1s;
$staggerTime: 0.15s;

@mixin createCircleAnimation($i, $animTime, $totalTime, $delay){   
    @keyframes dot#{$i+1}{
        0%, #{($i * $delay)/$totalTime * 100}%{              
            translate: 0;           
        }         
        #{($i * $delay + $animTime)/$totalTime * 100}%, 100% {     
            translate: 60px;          
        }                    
    }      
}


@for $i from 0 through 3 {
    @include createCircleAnimation($i, $animTime, $totalTime, $staggerTime);     
  
    span:nth-child(#{($i + 1)}){
        animation: dot#{(4 - $i)} $totalTime infinite;
        left: #{$i * 60 - 60 }px;
    }
}
```

另一种方案是**在延迟期间隐藏动画**：创建一个专门负责在延迟期间隐藏动画的 `@keyframes`，与原始动画一起应用。该技术的局限是动画之间的暂停必须是"暂停"关键帧的整数倍，因为无限重复的关键帧会立即再次执行，即使同一元素上应用了更长时间运行的关键帧：

```CSS
@layer animation {
    @keyframes tail {
        0% {
            width: 0;
        }
        30% {
            width: 100px;
        }
        100% {
            width: 0;
        }
    }

    @keyframes shining {
        0% {
            width: 0;
        }
        50% {
            width: 30px;
        }
        100% {
            width: 0;
        }
    }
    
    @keyframes shooting {
        0% {
            translate: 0;
        }
        100% {
            translate: 300px;
        }
    }

    @keyframes pause-animation {
        0% {
            opacity: 1;
        }
        50% {
            opacity: 1;
        }
        50.1% {
            opacity: 0;
        }
        100% {
            opacity: 0;
        }
    }

    .shooting_star {
        animation: 
            tail 3000ms ease-in-out infinite var(--delay),
            shooting 3000ms ease-in-out infinite var(--delay),
            pause-animation 6000ms infinite var(--delay);
    
        &::before {
            animation: 
                shining 3000ms ease-in-out infinite var(--delay),
                pause-animation 6000ms infinite var(--delay);
        }
    
        &::after {
            animation: 
                shining 3000ms ease-in-out infinite var(--delay),
                pause-animation 6000ms infinite var(--delay);
        }
    }
}
```



> Demo 地址：https://codepen.io/airen/full/YzBLYVq

### 动画延迟时间的作用

动画延迟时间主要有两个方面的作用：

- **控制动画的启动时间**：通过设置延迟时间调整动画在应用到元素后等待一段时间再开始执行，对创建自然、流畅的动画效果非常有用，尤其在处理复杂页面过渡或用户界面元素时
- **协调多个动画**：在同一元素上同时应用多个动画时，用延迟时间协调它们的启动顺序，避免同时启动，以达到预期的动画效果

## 典型案例

### 交错动画

运动在自然界中不是一次性完成的。一群鸟飞起、雨滴溅落地面、树在风中摇曳——这些瞬间的效果来自许多小运动的重叠和交汇。这种类型的动画称为**交错动画**（Stagger Animation），在 Web 上很常见：

> Demo 地址：https://codepen.io/airen/full/ExrYWbP

CSS 过渡动画和关键帧动画都可以实现交错动画。先看一个使用过渡动画实现的菜单交错动画：

> Demo 地址：https://codepen.io/airen/full/mdvLxjd

动画包含六个菜单项，最初都位于容器可视区域之外。用户点击"Show"按钮时触发过渡动画，每个菜单项逐渐从容器右侧移入。

实现方式：为每个元素定义一个对应其索引值的自定义属性 `--index`，便于计算延迟时间：

```HTML
<ul class="menu">
    <li style="--index: 1"></li>
    <!-- 省略其它的 li -->
    <li style="--index: 6"></li>
</ul>
```



通过 `translate: 100%` 将菜单项移出容器；过渡动画触发时将 `translate` 设置为 `0`，形成从右向左移入的运动：

```CSS
li {
    translate: 100%;
    opacity: 0;
    transition: translate .2s ease-out var(--delay), opacity .2s ease-out var(--delay);
}

.player li {
    translate: 0;
    opacity: 1;
}
```



每个菜单项从右向左移入是逐个进行的，因此需要通过 `calc()` 函数和 `--index` 计算每个菜单项的延迟时间（替代代码中的 `--delay`）。假设每个菜单项比前一个延迟 `0.025s`：

```CSS
li {
    --delay: calc((var(--index) - 1) * 0.025s);
}
```



隐藏菜单时可以添加反转动画：移除 `.player` 类即可，但菜单项隐藏时应以相反顺序动画（第一个菜单项最后消失），这需要交换过渡延迟。通过另一个自定义属性实现——在 `ul` 上添加 `--length`（菜单项总数）：

```HTML
<ul class="menu" style="--length: 6">
    <li style="--index: 1"></li>
    <!-- 省略其它的 li -->
    <li style="--index: 6"></li>
</ul>
```



```CSS
li {
    /* 这个延迟将在隐藏元素时生效 */
    --delay: calc(0.025s * (var(--length) - var(--index)));
}

.player li {
    /* 这个延迟将在显示元素时生效 */
    --delay: calc(0.025s * (var(--index) - 1));
}
```



有了这些改变，隐藏元素时动画顺序已反转：第一个菜单项第一个显示，但最后一个消失。

> Demo 地址：https://codepen.io/airen/full/mdvLxjd

若用关键帧动画实现同样的效果，需要定义两个关键帧动画（移入、移出），分别应用到菜单项的显示与隐藏状态上：

```CSS
@layer animation {
    /* 移入，菜单项显示的动画 */
    @keyframes slideIn {
        from {
            translate: 100%;
            opacity: 0;
        }
        to {
            translate: 0;
            opacity: 1;
        }
    }
    
    /* 移出，菜单项隐藏的动画 */
    @keyframes slideOut {
        from {
            translate: 0;
            opacity: 1;
        }
        to {
            translate: 100%;
            opacity: 0;
        }
    }
    
    li {
        /* 菜单项隐藏 */
        --delay: calc(0.025s * (var(--length) - var(--index)));
        animation: slideOut .2s ease-out var(--delay) both;
        
        .player & {
            /* 菜单项显示 */
            --delay: calc((var(--index) - 1) * 0.025s);
            animation: slideIn .2s ease-in var(--delay) both;
        }
    }
}
```



效果几乎与过渡动画版本一致：

> Demo 地址：https://codepen.io/airen/full/RwvyyPW

再看一个类似 Apple Music 应用中的动画效果：明亮的粉色容器里叠放着一堆盒子，盒子一个接一个以淡入方式出现在容器中心，然后以无限循环的方式淡出并放大到容器大小。同样使用交错动画的原理实现。

HTML 结构如下，`.box` 元素定义自定义属性 `--index` 用于动画延迟计算：

```HTML
<div class="container">
    <div class="content">
        <h1>Hits</h1>
        <p>in Spatial Audio</p>
    </div>
    <div class="box" style="--index: 1;"></div>
    <div class="box" style="--index: 2;"></div>
    <div class="box" style="--index: 3;"></div>
    <div class="box" style="--index: 4;"></div>
    <div class="box" style="--index: 5;"></div>
    <div class="box" style="--index: 6;"></div>
    <div class="box" style="--index: 7;"></div>
    <div class="box" style="--index: 8;"></div>
    <div class="box" style="--index: 9;"></div>
    <div class="box" style="--index: 10;"></div>
</div> 
```



核心 CSS 代码：

```CSS
@layer animation {
    @keyframes grow {
        from {
            opacity: 0.5;
            scale: 0;
        }
        to {
            opacity: 0;
            scale: 3.85;
        }
    }
    
    .box {
        --delay: calc(var(--index) * 1s);
        animation: grow 10s linear infinite var(--delay);
    }
}
```



> Demo 地址：https://codepen.io/airen/full/yLZjqbM

### 使用 CSS 自定义属性构建动画时间轴

多阶段动画可以让 Web 应用或网站更生动，但在 CSS 中编写和维护比较困难，通常需要引入复杂的 JavaScript 库。实际上，利用 CSS 自定义属性等现代 CSS 特性，可以规划纯 CSS 时间轴来创建复杂动画。

这类动画序列可用于显示隐藏内容。例如主标题（Heading）、次标题（Subheading）和按钮（Button）应用不同的动画效果：

- 主标题：从下往上淡入（`fadeInUp`），垂直移动距离 `100px`，动画持续 `1.1s`
- 次标题：同样应用 `fadeInUp`，持续时间 `0.9s`，延迟 `0.2s` 开始
- 按钮：放大动画（`zoomIn`），持续 `0.9s`，延迟 `1.1s` 开始

首先使用 `@keyframes` 定义两个关键帧动画：

```CSS
@keyframes fadeInUp {
    from {
        opacity: 0;
        translate: 0 100px;
    }
    to {
        opacity: 1;
        translate: 0 0;
    }
}

@keyframes zoomIn {
    from {
        scale: .7;
        opacity: 0;
    }
    to {
        scale: 1;
        opacity: 1;
    }
}
```



每个元素需要相对其兄弟元素在精确时间执行动画。传统写法如下：

```CSS
h1 {
    animation: fadeInUp 1.1s cubic-bezier(.19,1,.22,1) both;
}

h4 {
    animation: fadeInUp .9s cubic-bezier(.19,1,.22,1) both .2s;
}

button {
    animation: zoomIn .9s cubic-bezier(.19,1,.22,1) 1.1s both;
}
```



这种写法存在维护问题：更改其中一个元素的动画时间，其他元素的动画时间也需要手动调整，否则整个动画序列就会混乱。

> Demo 地址：https://codepen.io/airen/full/LYqmBav

可以创建一个可视化的动画序列时间轴：主标题动画开始，接着是次标题动画，最后是按钮动画。用 CSS 自定义属性编写与时间轴匹配的 CSS，可解决上述问题：

- 动画延迟时间是相对于前一个动画的时间，而不是设置特定的时间值
- 每个动画延迟都相对于前一个动画，改变一个动画的时间会自动更新整个序列

第一步，设置每个步骤的持续时间：

```CSS
:root {
    --heading-duration: 1.1s;
    --subheading-duration: .9s;
    --button-duration: .9s;
}
```



第二步，计算每个动画的延迟时间——将前一个动画的开始时间和持续时间相加，得到前一个动画结束的时间：

```CSS
:root {
    --heading-delay: 0s;
    --subheading-delay: calc(var(--heading-delay) + var(--heading-duration));
    --button-delay: calc(var(--subheading-delay) + var(--subheading-duration));
}
```



合并后得到每个动画的持续时间和延迟时间：

```CSS
:root {
    /* 持续时间 */
    --heading-duration: 1.1s;
    --subheading-duration: .9s;
    --button-duration: .9s;
    
    /* 延迟时间 */
    --heading-delay: 0s;
    --subheading-delay: calc(var(--heading-delay) + var(--heading-duration));
    --button-delay: calc(var(--subheading-delay) + var(--subheading-duration));
}
```



第三步，把时间变量应用到对应的动画元素上：

```CSS
h1 {
     animation: fadeInUp var(--heading-duration) cubic-bezier(.19,1,.22,1) var(--heading-delay) both;
}
    
h4 {
     animation: fadeInUp var(--subheading-duration) cubic-bezier(.19,1,.22,1) var(--subheading-delay) both ;
}
 
button {
     animation: zoomIn var(--button-duration) cubic-bezier(.19,1,.22,1) var(--button-delay) both;
}
```



这种技术使动画时间轴更容易理解和修改：更改一个动画的速度会自动影响整个动画序列，无需手动调整。

> Demo 地址：https://codepen.io/airen/full/YzBLObZ

在此基础上还可以添加基础速度 `--base-speed`，用于整体调整动画序列的快慢：

```CSS
:root {
    --base-speed-unitless: 0.2;
    --base-speed: calc(var(--base-speed-unitless) * 1s);

    --relative-heading-speed: 0.5;
    --relative-subheading-speed: 0.5;
    --relative-button-speed: 1;

    /* 持续时间 */
    --heading-duration: calc(var(--base-speed) * var(--relative-heading-speed));
    --subheading-duration: calc(
      var(--base-speed) * var(--relative-subheading-speed)
    );
    --button-duration: calc(var(--base-speed) * var(--relative-button-speed));

    /* 延迟时间 */
    --heading-delay: 0s;
    --subheading-delay: calc(var(--heading-delay) + var(--heading-duration));
    --button-delay: calc(var(--subheading-delay) + var(--subheading-duration));
}
```



配合几个滑块控件，就可以按需调整整个动画的时序：

> Demo 地址：https://codepen.io/airen/full/mdvLzEp

该技术可以扩展到构建真正复杂的动画。例如 [Paul Hebert 在 CodePen 使用这种技术写了一个"鲁布·戈德堡机"的复杂动画](https://codepen.io/phebert/full/oNXRPNK)：

> Demo 地址：https://codepen.io/phebert/full/oNXRPNK

这个动画的 CSS 时间轴最终如下：

```CSS
:root {
    --base-speed: 0.5s;

    --domino-speed: calc(var(--base-speed) * 1.5);
    --domino-hit-speed: calc(var(--domino-speed) * 0.25);
    --last-domino-speed: calc(var(--domino-speed) * 10 / 9);

    --domino-1-delay: 0s;
    --domino-2-delay: calc(var(--domino-1-delay) + var(--domino-hit-speed));
    --domino-3-delay: calc(var(--domino-2-delay) + var(--domino-hit-speed));
    --domino-4-delay: calc(var(--domino-3-delay) + var(--domino-hit-speed));
    --domino-5-delay: calc(var(--domino-4-delay) + var(--domino-hit-speed));
    --domino-6-delay: calc(var(--domino-5-delay) + var(--domino-hit-speed));

    --ball-and-string-speed: calc(var(--base-speed) * 2);
    --ball-and-string-delay: calc(var(--domino-6-delay) + var(--domino-speed) * 0.2);

    --car-speed: calc(var(--base-speed) * 4);
    --car-delay: calc(var(--ball-and-string-delay) + var(--ball-and-string-speed) * 0.25);

    --_8-ball-speed: calc(var(--base-speed) * 5);
    --_8-ball-delay: calc(var(--car-delay) + var(--car-speed) * 0.9);

    --domino-7-delay: calc(var(--_8-ball-delay) + var(--_8-ball-speed) * 0.9);
    --domino-8-delay: calc(var(--domino-7-delay) + var(--domino-hit-speed));
    --domino-9-delay: calc(var(--domino-8-delay) + var(--domino-hit-speed));
    --domino-10-delay: calc(var(--domino-9-delay) + var(--domino-hit-speed));
    --domino-11-delay: calc(var(--domino-10-delay) + var(--domino-hit-speed));
    --domino-12-delay:  calc(var(--domino-11-delay) + var(--domino-hit-speed));

    --last-ball-speed: calc(var(--base-speed) * 3);
    --last-ball-delay: calc(var(--domino-12-delay) + var(--domino-hit-speed));

    --total-duration: calc(var(--last-ball-delay) + var(--last-ball-speed));
}
```



掌握该技巧后，复杂 CSS 动画的时序维护成本会显著降低。

### 纯 CSS 制作幻灯片组件

结合 CSS 动画和自定义属性可以构建图片幻灯片。先从一个简单的 HTML 结构着手：

```HTML
<div class="hero">
    <div class="slideshow"></div>
</div>
```



使用 CSS 自定义属性定义图片：

```CSS
.hero {
    --slide1: url("https://picsum.photos/1920/1028?random=2");
    --slide2: url("https://picsum.photos/1920/1028?random=3");
    --slide3: url("https://picsum.photos/1920/1028?random=4");
    --slide4: url("https://picsum.photos/1920/1028?random=5");
    --slide5: url("https://picsum.photos/1920/1028?random=6");
}
```



再定义一个名为 `--currentSlide` 的自定义属性，并在关键帧中改变它的值：

```CSS
.hero {
    --currentSlide: var(--slide1);
}

@keyframes slideshow {
    0% {
        --currentSlide: var(--slide1);
    }
    20% {
        --currentSlide: var(--slide2);
    }
    40% {
        --currentSlide: var(--slide3);
    }
    60% {
        --currentSlide: var(--slide4);
    }
    80% {
        --currentSlide: var(--slide5);
    }
    100% {
        --currentSlide: var(--slide1);
    }
}
```



最后将 `--currentSlide` 作为 `.slideshow` 元素的背景图片，并通过 `animation` 属性应用已定义好的 `slideshow` 关键帧，即实现最基本的图片幻灯片自动播放效果：

```CSS
.slideshow {
    animation: slideshow 20s linear infinite;
    background-size: cover;
    background-image: var(--currentSlide);
}
```



> Demo 地址：https://codepen.io/airen/full/vYbjqzq

这个效果较为生硬，需要给图片添加淡入淡出效果让播放更自然。思路是：图像在部分时间显示，在另一部分时间隐藏。

在此基础上定义一个 `fade` 关键帧：

```CSS
@keyframes fade {
    25% {
        opacity: 1;
    }
    50% {
        opacity: 0;
    }
    75% {
        opacity: 1;
    }
}
```



将其追加到 `.slideshow` 上，即应用多个关键帧动画。注意 `fade` 关键帧动画的持续时间是 `slideshow` 的五分之一（`4s`）：

```CSS
.slideshow {
    animation: 
        slideshow 20s linear infinite, 
        fade 4s linear infinite;
}
```



> Demo 地址：https://codepen.io/airen/full/OJdZKyR

可以通过两个自定义属性计算动画所需的持续时间：

```CSS
.slideshow {
    --numberOfSlides: 5; /* 幻灯片数量 */
    --slideshowDuration: 20s; /* slideshow 动画所需持续时间 */
    --fadeDuration: calc(var(--slideshowDuration) / var(--numberOfSlide)); /* 计算出 fade 动画的持续时间 */
    
    animation:
        slideshow var(--slideshowDuration) linear infinite,
        fade var(--fadeDuration) linear infinite;
}
```



这样得到了图像之间的平滑过渡，但每个图像之间存在空白间隙。进一步优化：让图像淡入到下一个图像中，而不是淡入到底色再切换。做法是在 HTML 中复制 `.slideshow` 元素并附加 `.slideshow2` 类：

```HTML
<div class="hero">
    <div class="slideshow"></div>
    <div class="slideshow slideshow2"></div>
</div>
```



然后为第二个幻灯片添加动画延迟时间 `--delay-duration`：图像仍位于第一个幻灯片下方，但时间延迟足以避免图像之间露出底色。关键是 `--delay-duration` 的取值——**应为一张幻灯片持续时间的一半**，用 `calc` 计算：

```CSS
.slideshow {
    --numberOfSlides: 5;
    --slideshowDuration: 20s;
    --fadeDuration: calc(var(--slideshowDuration) / var(--numberOfSlides));
    --delay-duration: calc(var(--fadeDuration) / 2 );
  
    animation: 
        slideshow var(--slideshowDuration) linear infinite, 
        fade var(--fadeDuration) linear infinite;
}
.slideshow2 {
      animation: 
          slideshow var(--slideshowDuration) var(--delay-duration) linear infinite, 
          fade var(--fadeDuration) var(--delay-duration) linear infinite;
}
```



> Demo 地址：https://codepen.io/airen/full/oNmybyX

也可以用多个图片元素实现类似效果：

```HTML
<div class="slideshow">
    <img src="slide1.jpg" class="slide" />
    <img src="slide1.jpg" class="slide" />
    <img src="slide1.jpg" class="slide" />
</div>
```



需要先确定三个要素：

- 动画的总持续时间
- 每张幻灯片（每个图像）的动画延迟时间
- 关键帧的时序

三个要素的计算公式：

```
动画总持续时间 = （淡入 + 可见）× 图像数
```



```
动画延迟时间 = (淡入 + 可见) × (顺序位置 - 1)
```



延迟时间的逻辑：在前一个图像开始淡出时启动下一张图像的动画。例如淡入 `1s`、可见 `2s`，则第二张图像的延迟为 `3s`，第三张为 `6s`，第四张为 `9s`，依此类推。

关键帧时序的定义方法：将 `100%` 分割成动画持续时间的秒数。动画持续 `10s` 时每秒为 `10%`；持续 `6s` 时每秒为 `16.667%`；定时为该值的倍数：

```
100 ÷ 动画持续时间 = 1 秒的百分比
```



假设动画进行 `1s` 淡入、`2s` 可见后淡出，淡入关键帧定义如下：

```CSS
@keyframes fade {
    0% { 
        opacity: 0; 
    }
    11.11% {  /* 100 ÷ 动画持续时间 × 1 */
        opacity: 1;  
    }
    33.33% { /* 100 ÷ 动画持续时间 × 3 */
        opacity: 1; 
    }
    44.44% { /* 100 ÷ 动画持续时间 × 4 */
        opacity: 0; 
    }
    100% { /* 延迟到 100% */
        opacity: 0; 
    }
}
```



用 CSS 自定义属性定义动画相关参数，便于计算动画时间：

```CSS
:root {
    --fadein: 1s; /* 1s 淡入时间 */
    --visible: 2s; /* 2s 可见时间 */
    --slides: 3; /* 幻灯片数量 */
    --duration: calc((var(--fadein) + var(--visible)) * var(--slides));
}
```



在幻灯片对应元素上以内联方式定义 `--index` 自定义属性，对应其自身的索引值：

```HTML
<div class="slideshow">
    <img src="slide1.jpg" class="slide" style="--index: 1;" />
    <img src="slide1.jpg" class="slide" style="--index: 2;" />
    <img src="slide1.jpg" class="slide" style="--index: 3;" />
</div>
```



通过 `--index` 计算每张幻灯片的延迟时间：

```CSS
.slideshow img {
    --delay: calc((var(--fadein) + var(--visible)) * (var(--index) - 1));
}
```



最终核心代码如下：

```CSS
@layer animation {
    @keyframes fade {
        0% { 
            opacity: 0; 
        }
        11.11% {  /* 100 ÷ 动画持续时间 × 1 */
            opacity: 1;  
        }
        33.33% { /* 100 ÷ 动画持续时间 × 3 */
            opacity: 1; 
        }
        44.44% { /* 100 ÷ 动画持续时间 × 4 */
            opacity: 0; 
        }
        100% { /* 延迟到 100% */
            opacity: 0; 
        }
    }
    
    .slideshow {
        --fadein: 1s; /* 1s 淡入时间 */
        --visible: 2s; /* 2s 可见时间 */
        --slides: 3; /* 幻灯片数量 */
        --duration: calc((var(--fadein) + var(--visible)) * var(--slides));
        
        
        & img {
            --delay: calc((var(--fadein) + var(--visible)) * (var(--index) - 1));
            animation: fade var(--duration) linear infinite var(--delay);
        }
    }
}
```



> Demo 地址：https://codepen.io/airen/full/VwgdjaB

使用相似的方法还可以让幻灯片具有不同的动画效果，例如 `slideInLeft`、`zoomIn` 等。

## 实践要点

- 持续时间和延迟时间分别在时间轴上控制动画的**时长**与**启动时机**；`@keyframes` 的百分比选择器相对于动画持续时间计算。
- `transition-duration` / `animation-duration` 默认值为 `0`：过渡动画时长为 `0` 时状态瞬间变化；关键帧动画时长为 `0` 时仍会执行并触发事件，最终状态取决于 `animation-fill-mode` 与 `animation-direction`。
- 多值列表遵循同一规则：值个数少于属性/动画个数时列表重复，多于时多出的值被忽略；`transition` 的多值对应 `transition-property`，`animation` 的多值对应 `animation-name`。
- 负延迟是偏移量而非延迟：动画立即从播放周期中的某个阶段开始；偏移量超过总时长（含迭代）时动画直接呈现最终状态。
- 关键帧动画没有内置的迭代间暂停，可通过关键帧百分比压缩、Sass 循环生成或额外的隐藏动画关键帧模拟。
- 持续时间参考值：简单反馈约 `100ms`；一般 UI 动画 `100ms ~ 300ms`；复杂动画 `300ms ~ 500ms`；移动端 `200ms ~ 300ms`，平板加长约 `30%`，可穿戴设备缩短约 `30%`。
- 用 CSS 自定义属性构建相对时间轴（每个动画的延迟等于前一个动画的延迟加持续时间），可让动画序列随单个参数自动重排。

## 小结

CSS 动画中的时间参数分为持续时间和延迟时间，二者决定动画的速度、时序和启动时机。持续时间定义动画从开始到结束的时长，在过渡动画中对应属性从初始状态到结束状态的过程，在关键帧动画中对应 `@keyframes` 的一个完整周期；延迟时间定义动画从触发到开始的等待，支持负值偏移和多值编排。结合多值匹配、负延迟偏移、关键帧百分比压缩与自定义属性时间轴，可以在纯 CSS 中实现交错动画、多阶段动画和自动播放幻灯片等复杂的时序编排。
