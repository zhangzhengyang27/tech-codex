---
title: 初探 Web Animations API
description: "CSS 动画简单易用、性能出色，是开发 Web 动画的主要技术之一，但在动态创建、播放控制和监听动画生命周期等方面存在缺陷。Web Animations API（WAAPI）很好地弥补了这些缺陷，让开发者能够以更灵活、更动态的方式创建 Web 动画。"
keywords: [初探, Web, Animations, API]
category: CSS
tags: [CSS, 布局, 动画, 响应式]
---


# 初探 Web Animations API

## 概念说明

自 2007 年 Webkit 团队首次提出 CSS 过渡动画（transition）和关键帧动画（animation）以来，CSS 动画经过多年发展已经非常成熟，成为制作 Web 动画的关键技术之一。它简单易用、性能出色，是开发 Web 动画的主要技术。然而 CSS 动画在实际开发中也存在一些令人沮丧的缺陷，例如：动态创建不方便、播放控制受限、无法监听动画的生命周期等。

Web Animations API（简称 WAAPI）很好地解决了这些问题。WAAPI 为 Web 开发者提供访问浏览器动画引擎的能力，定义了在各个浏览器中如何实现动画的重要概念，使开发者能够以更灵活、更动态的方式创建 Web 动画。

## 历史与现状

大约从 1998 年开始，[W3C 引入了 SMIL （Synchronized Multimedia Integration Language）标准](https://www.w3.org/TR/REC-smil/)，它为 SVG 引入了动画。那时它是浏览器唯一的动画引擎，但主要用于创建基于时间的多媒体呈现（音频、视频、文本和图形等元素的同步播放）。SMIL 主要（或者说只能）用于动画 SVG 元素，而且非常复杂，兼容性也较差。

随着 Web 技术和标准的演进，尤其是 Webkit 团队推出 CSS 动画（过渡动画 `transition` 和关键帧动画 `animation`）之后，SMIL 在 Web 开发中的地位逐渐减弱，Web 开发者更倾向使用 CSS 特性创作动画。

CSS 虽已成为创建动画的主要工具之一，但同样有局限性（播放控制不方便、无法监听动画的生命周期等）。因此 Mozilla Firefox 和 Google Chrome 团队的开发人员着手创建了一种动画规范，以在所有浏览器中规范化动画功能——这就是 [Web Animations API](https://www.w3.org/TR/web-animations-1/)（简称 WAAPI）。

WAAPI 为 Web 开发人员提供了访问浏览器动画引擎的途径，并描述了各种浏览器如何实现动画。它填补了声明式 CSS 动画/过渡与动态 JavaScript 动画之间的差距：开发者既可以用它创建操作方式类似 CSS 的动画（从一个预定义状态到另一个状态），也可以使用变量、循环和回调创建能适应和响应变化的交互式动画。

到目前为止，大多数 Web 开发者要么通过 CSS 的 `transition` 或 `animation` 创作动画，要么通过 JavaScript 修改内联样式创作动画。

CSS 过渡通常用于元素两个状态（开始状态和结束状态）之间的平滑过渡，通过时间函数、持续时间和延迟时间来控制。由于其简单性，常用于基本动画效果，例如按钮悬浮效果：

```CSS
.button {
    opacity: .5; /* 开始状态 */
    transition: opacity .2s linear;
    
    &:hover {
        opacity: 1; /* 结束状态 */
    }
}
```

CSS 关键帧动画与过渡动画相比提供了更多控制，比如迭代次数、动画方向、填充模式等；动画本身通过关键帧 `@keyframes` 指定，允许创建比 CSS 过渡更复杂的动画效果：

```CSS
@keyframes pluse{
    50% {
        sacle: 1.15;
        opacity: .5;
    }
}

.button:hover {
    animation: pluse .2s ease-in-out both alternate;
}
```

这两者都属于声明式动画，并且在单个元素上可以高性能的方式执行。它们也提供了像 `animationend` 这样的 JavaScript 事件，允许开发者在动画完成时做出反应（例如显示或隐藏元素），但在很多方面仍有较大局限，例如很难使动画与应用程序状态同步、难以监听动画的完整生命周期等。

即便 CSS 这几年发展很快，提供了动画合成、路径动画、视图过渡、滚动驱动动效、锚点定位以及 `@property` 自定义属性和三角函数等便于制作动画的特性，声明式的 CSS 动画始终是简单动画的代名词。要创建循环的、复杂的动画，仍然需要基于 JavaScript 脚本或 JavaScript 库实现，例如 [Greensock](http://greensock.com/)、[AnimeJs](http://animejs.com/)、[Animxyz](http://animxyz.com/)、[Three.js](https://threejs.org/)、[Velocity.js](http://velocityjs.org/)、[Framer Motion](https://www.framer.com/motion/) 和 [Mo.js](https://mojs.github.io/) 等。基于 JavaScript 可以完全控制动画的时间和状态，并根据时间函数计算当前帧的状态：

```JavaScript
const aniElement = document.getElementById('animated');
const initialOpacity = 0;
const targetOpacity = 1;
const durationTime = 5000;
let startTime;

function step(time) {
    if (!startTime) {
        startTime = time;
    }
    
    let progress = time - startTime
    // 计算动画进度，作为 0 到 1 之间的因子
    let factor = Math.min(progress / durationTime, 1);
    // 将初始状态和目标状态差异与计算的因子相乘，计算出当前透明度
    let currentOpacity = initialOpacity + (targetOpacity - initialOpacity) * factor;
    
    // 将计算出来的透明度应用到动画元素上
    aniElement.style.opacity = currentOpacity;
    
    // 如果尚未达到目标持续时间，则移动下一帧
    if(progress < durationTime) {
        window.requestAnimationFrame(step);
    }
}

// 启动动画
window.requestAnimationFrame(step);
```

> Demo 地址：https://codepen.io/airen/full/bGZBdEW

过去通过 `setInterval` 执行 JavaScript 动画循环以获得 `60fps` 的动画效果；如今 `requestAnimationFrame` 可以获得更平滑的动画，因为浏览器会在下一次重绘之前调用它，并且可以在标签页失去焦点时暂停 `requestAnimationFrame`，防止非活动标签页以高帧率运行昂贵的动画。

尽管这种动画技术非常强大，但它需要在动画持续时间内每帧都进行大量计算，可能导致卡顿或延迟，尤其当页面上发生其他事件时（例如路由切换、数据获取和解析）。浏览器对此类动画的优化方式也有限——它只知道当前帧，无法完全将动画卸载到 GPU 上。

WAAPI 正是在这个发展过程中崭露头角的新技术：它以更便利的方式让开发者创作出性能更佳的 Web 动画，还能让浏览器在没有 Hack 或 `Window.requestAnimationFrame()` 的情况下进行自身内部优化。

## WAAPI 简介

简单地说，[WAAPI （全称是 Web Animations API）](https://www.w3.org/TR/web-animations-1)是一套允许 Web 开发者通过 JavaScript 脚本创建动画并且控制动画的 API。它最早得到 Firefox 和 Safari 的支持，Chrome 和 Edge 进一步推进了 WAAPI 的发展并带来更多功能，最可贵的是实现了跨浏览器互操作性。

WAAPI 打开了浏览器的动画引擎，使开发者可以通过 JavaScript 脚本访问这些 API，对动画进行开发和操作。该 API 的设计目的是为 CSS 动画（`transition` 和 `animation`）的实现提供基础，并为未来的动画效果留下更多可能性。

WAAPI 被设计成 CSS 动画的接口：通过这些 API，开发者可以将交互式动画从样式表移到 JavaScript，将表现（CSS）与行为（JavaScript）分开，不再依赖较重的 DOM 技术（例如将 CSS 属性和范围类写入元素来控制播放方向）。与纯粹的声明式 CSS 不同，JavaScript 还允许动态地将属性值设置为持续时间。对于构建自定义动画库和创建交互式动画，WAAPI 是理想的工具。

## WAAPI 的核心

从 W3C 定义的 [WAAPI 规范](https://www.w3.org/TR/web-animations-1/)的角度看，整个体系庞大而复杂，但抓住核心并不困难。WAAPI 的核心涉及两个模型：

-   [时间（Timing）模型](https://www.w3.org/TR/web-animations-1/#timing-model)
-   [动画（Animation）模型](https://www.w3.org/TR/web-animations-1/#animation-model)

除模型之外，WAAPI 还涉及几个核心概念：

-   [时间轴对象（Timeline Objects）](https://www.w3.org/TR/web-animations-1/#timelines)
-   [动画对象（Animation Objects）](https://www.w3.org/TR/web-animations-1/#animations)
-   [动画效果对象（Animation Effects Objects）](https://www.w3.org/TR/web-animations-1/#animation-effects)

### 两个模型：Timing 和 Animation

WAAPI 运行在时间和动画两个模型之上：一个处理时间（Timing Model），另一个处理随时间发生的视觉变化（Animation Model）。

-   **时间模型（Timing Model）** ：在动画的单次迭代内，迭代进度使时间点转换为比例距离。由于某些动画每次重复时可能会发生变化，因此还会保留迭代索引
-   **动画模型（Animation Model）** ：将时间模型的迭代进度值和迭代索引转换为一系列要应用于动画的值

时间模型是使用 WAAPI 的基础，它跟踪动画在时间轴上的进度。每个文档都有一个主时间轴（`Document.timeline`），从页面加载的瞬间开始，直到窗口关闭结束。动画根据其持续时间沿该时间轴分布；每个动画通过其 `startTime` 锚定到时间轴上的某一点，表示动画开始播放时沿文档时间轴的时刻。

所有动画的播放都依赖于这个时间轴：

-   搜索动画会将动画的位置沿时间轴移动
-   减缓或加速播放速率会在时间轴上压缩或扩展其分布
-   重复动画会使其沿时间轴排列额外的迭代

时间模型主要关注动画的时序，允许精确控制动画何时开始、结束以及播放期间的时间轴变化，从而实现更灵活的动画效果。

动画模型可以被看作是动画在其持续时间内在任何给定时间可能呈现的快照数组。它提供了描述动画结构和行为的框架，通过关键帧、效果、动画组等概念，使动画的创建更直观，同时支持复杂的动画组合。

两个模型相互配合：时间模型提供对时序的细致控制，动画模型提供描述和组织动画结构的框架，共同支撑丰富、灵活且高性能的动画。

### 核心概念

WAAPI 的核心概念包括时间轴对象（Timeline Objects）、动画对象（Animation Objects）和动画效果对象（Animation Effect Objects）等。它们共同协作，对这些对象进行组装即可创建所需的动画。

#### 时间轴对象

时间轴对象表示时间轴上的一段时间，主要用于管理动画的时间进度和持续时间，包含动画在时间轴上的位置和时长信息。

通常情况下，动画都在文档时间轴上运行。通过调用 `document.timeline` 可以获取文档时间轴；如需自行创建时间轴，可以使用 `new DocumentTimeline()` 构造函数（`AnimationTimeline` 是抽象接口，不能直接 `new AnimationTimeline()` 构造）：

```JavaScript
const timeline = document.timeline;
```

注意，文档时间轴（`document.timeline`）是文档的主时间轴，从页面加载一直延伸到无穷远，并且是全局共享的。

自从滚动驱动动画出现之后，文档时间轴不再是页面唯一的时间对象。与 `new DocumentTimeline()` 类似，还可以使用：

-   `new ScrollTimeline()` 构造函数创建滚动进度时间轴对象，用于控制滚动进度时间轴动画
-   `new ViewTimeline()` 构造函数创建视图进度时间轴对象，用于控制视图进度时间轴动画

```JavaScript
// 创建滚动进度时间轴对象
const scrollTimeline = new ScrollTimeline({
    source: document.documentElement,
    axis: "block",
});

// 创建视图进度时间轴对象
const viewTimeline = new ViewTimeline({
    subject: document.querySelector(".subject"),
    axis: "block",
});
```

注意：时间轴对象本身只有只读的 `currentTime` 属性；平时用来读取或设置动画参数、控制播放的属性和方法，都属于动画对象（`Animation`，即 `element.animate()` 等方法的返回值），而不是时间轴对象。以动画对象 `animation` 为例：

-   `currentTime` ：获取或设置当前时间，表示动画的当前播放位置
-   `startTime` ：获取或设置动画的起始时间，表示动画开始播放的时刻
-   `pending` ：只读属性，表示动画是否正处于等待状态（例如等待播放或暂停操作生效）
-   `playbackRate` ：获取或设置动画的播放速率，`1` 表示正常速率

```JavaScript
const animation = document.getAnimations()[0];

// 获取或设置当前时间
console.log(animation.currentTime);    // 获取当前时间
animation.currentTime = 2000;          // 设置当前时间为2000ms

// 获取或设置动画的起始时间
console.log(animation.startTime);      // 获取动画的起始时间
animation.startTime = 1000;            // 设置动画的起始时间为1000ms

// 检查动画是否处于等待状态
console.log(animation.pending);        // 检查动画是否处于等待状态

// 获取或设置动画播放速率
console.log(animation.playbackRate);   // 获取当前播放速率
animation.playbackRate = 2;            // 设置播放速率为2倍
```

这些属性允许在运行时获取动画信息，也提供了修改动画状态的途径（当前时间、起始时间、播放速率等），从而更精细地控制动画的播放过程。

动画对象的方法可用于控制动画：

-   `play()` ：播放动画，如果动画已经在运行，会重新播放
-   `pause()` ：暂停动画，保留当前播放状态
-   `cancel()` ：取消动画，使其立即停止
-   `finish()` ：将动画播放到末尾，结束动画
-   `reverse()` ：反向播放动画
-   `updatePlaybackRate(playbackRate)` ：异步更新动画的播放速率
-   `persist()` ：将动画的替代状态设置为持久化
-   `commitStyles()` ：将动画效果产生的当前效果值写入其相应效果目标的内联样式

```JavaScript
const animation = document.getAnimations()[0];

// 启动或继续动画的播放
animation.play();

// 暂停动画的播放。
animation.pause();

// 取消动画，清除所有由该动画引起的效果
animation.cancel();

// 将动画定位到效果的结束，完成播放
animation.finish();

// 反转动画的播放方向。
animation.reverse();

// 异步更新动画的播放速率。
animation.updatePlaybackRate(2); // 将播放速率更新为2倍

// 将动画的替代状态设置为持久化
animation.persist();

// 将动画效果产生的当前效果值写入其相应效果目标的内联样式
animation.commitStyles();
```

通过这些方法可以在运行时控制动画的播放、暂停、定位、取消等行为，以及调整动画的速率和持久化状态。

需要知道的一点：`document.timeline` 是全局共享的时间基准，但它本身不能构造、`currentTime` 只读，也没有 `play()`、`pause()` 等方法，不能直接控制动画的播放；若想统一控制页面上的所有动画，可以借助 `document.getAnimations()`：

```JavaScript
// 统一控制页面上的所有动画：例如暂停所有动画
document.getAnimations().forEach((animation) => animation.pause());
```

通过一个简单示例演示时间轴对象的使用。HTML 结构和 CSS 中包含一个动画元素（`.animated`）和一个按钮（`.button`）：

```HTML
<div class="animated"><!-- 我是一个动画元素 --></div>
<button class="button">Start Animation</button>
```

使用 WAAPI 对元素进行动画处理：

```JavaScript
// 获取时间对象
const timeline = document.timeline;

// 获取要进行动画的元素
const animationEle = document.querySelector('.animated');

// 获取按钮
const buttonHandler = document.querySelector('.button');

// 创建动画效果对象
const keyframes = [
    { translate: '0px' },
    { translate: '200px' }
];

const effect = new KeyframeEffect(animationEle, keyframes, { duration: 1000 });

// 创建动画对象，关联时间对象和动画效果对象
const animation = new Animation(effect, timeline);
    
// 点击按钮，开始播放动画
buttonHandler.addEventListener('click', () => {
    // 播放动画
    animation.play();
})
```

> Demo 地址：https://codepen.io/airen/full/LYaxpaL

#### 动画对象

动画对象可以想象成 DVD 播放器，动画效果则相当于光碟：DVD 用于控制光碟播放，但如果 DVD 中没有光碟，它就什么都不做。WAAPI 中的动画对象亦是如此——动画对象以动画效果的形式接受"媒体"（特别是关键帧效果），像 DVD 播放器一样，通过动画对象的方法来播放、暂停和控制动画的播放方向和速度。

关键帧效果是一组信息，包括至少一组关键帧及其需要进行动画处理的持续时间。动画对象接受这些信息，并使用时间轴对象组装出一个可播放的动画：

```JavaScript
// 创建动画效果对象
const keyframes = [
    { opacity: 0 },
    { opacity: 1 }
];

const effect = new KeyframeEffect(targetElement, keyframes, { duration: 1000 });

// 创建动画对象，关联动画效果对象和时间轴
const animation = new Animation(effect, document.timeline);
```

上面代码创建了一个动画效果对象 `effect`（通过两个关键帧改变元素透明度 `opacity`），并创建了动画对象 `animation`，将 `effect` 和全局时间轴对象 `document.timeline` 关联。`animation` 就是 WAAPI 中的动画对象，通过它可以控制动画的播放。类似的动画对象可用于创建更复杂的交互效果，例如页面过渡、元素的动态显示等。

#### 动画效果对象

动画效果对象就好比 DVD 光碟。在 WAAPI Level 1 规范中，动画效果对象主要指 `KeyframeEffect 对象`；在未来（WAAPI Level 2 规范），还将有[组效果（GroupEffect 对象）](https://www.w3.org/TR/web-animations-2/#the-groupeffect-interface)和[序列效果（SequenceEffect 对象）](https://www.w3.org/TR/web-animations-2/#the-sequenceeffect-interface)。

`KeyframeEffect` 对象表示动画的效果，即在动画过程中元素如何从一个状态过渡到另一个状态。它通过定义一系列关键帧来描述这个过渡过程，关键帧包含了动画不同时间点上元素的样式属性值：

```JavaScript
const keyframes = [
    { 
        opacity: 0, 
        translate: '0px' 
    },
    { 
        opacity: 1, 
        translate: '100%' 
    }
];

const effect = new KeyframeEffect(
    targetElement,      // 动画元素
    keyframes,          // 关键帧
    { duration: 1000 }  // 动画属性，这里设置动画持续时间
);
```

`new KeyframeEffect()` 构造函数定义的动画效果包括三个部分：

-   `targetElement` ：要应用动画效果的目标元素（动画元素）
-   `keyframes` ：由关键帧组成的数组，描述动画过程中元素属性的变化
-   `options` ：配置动画的参数，例如动画持续时间、缓动函数等

`targetElement` 就是动画元素。

关键帧 `keyframes` 类似于 CSS 中的 `@keyframes`，区别是在 WAAPI 中以数组形式描述。例如 CSS 关键帧：

```CSS
@keyframes ani {
    from {
        opacity: 0;
        translate: 0;
    }
    to {
        opacity: 1;
        translate: 100%;
    }
}
```

在 WAAPI 中会这样描述：

```JavaScript
const ani = [
    // 相当于 from 或 0%
    {
        opacity: 0,
        translate: '0px'
    },
    // 相当于 to 或 100%
    {
        opacity: 1;
        translate: '100'
    }
]
```

数组中的每个对象（`{}`）相当于 `@keyframes` 中的一个百分比选择器，同样描述动画中某个时间点上元素属性的变化。一个更复杂的定义：

```CSS
@keyframes flash {
    from,
    50%,
    to {
        opacity: 1;
    }

    25%,
    75% {
        opacity: 0;
    }
}
```

```JavaScript
const flash = [
    // from （0%）
    {opacity: 1},
    // 25%
    {opacity: 0},
    // 50%
    {opacity: 1},
    // 75%
    {opacity: 0},
    // to （100%）
    {opacity: 1}
]
```

`KeyframeEffect` 对象的第三个部分是动画属性的相关配置项，用于定义动画的行为和外观。常见的属性配置项：

-   `duration` ：动画的持续时间，例如 `duration: 1000`，接受一个数值，以 `ms` 为单位。类似于 CSS 的 animation-duration
-   `easing` ：动画的缓动函数，定义动画在不同时间点之间的速度变化，例如 `easing: 'ease'`，接受一个字符串。类似于 CSS 的 animation-timing-function
-   `delay` ：动画的延迟时间，例如 `delay: 500`，接受一个数值，单位 `ms`。类似于 CSS 的 animation-delay
-   `endDelay` ：在动画结束后延迟的毫秒数。在基于另一个动画的结束时间序列动画时很有用，默认为 `0`
-   `iterations` ：动画播放的迭代次数，可以是具体次数（数值）或 `'infinite'`（字符串），例如 `iterations: 2` 表示动画循环播放两次。类似于 CSS 的 `animation-iteration-count`
-   `iterationStart` ：动画迭代的起始位置，通常是小数，表示动画整个周期中的开始位置。例如 `iterationStart: 0.5` 表示从动画周期的中间位置（`50%`）开始播放
-   `direction` ：动画的播放方向，可以是 `'normal'`（正向播放）、`'reverse'`（反向播放）、`'alternate'`（交替播放）或 `'alternate-reverse'`（交替反向播放）。类似于 CSS 的 animation-direction
-   `fill` ：动画完成后是否保持最后状态，可以是 `'none'`、`'forwards'`、`'backwards'` 或 `'both'`。类似于 CSS 的 animation-fill-mode
-   `composite` ：确定在此动画和其他未指定自己特定合成操作的独立动画之间如何组合值，可以是 `add`、`accumulate` 和 `replace`。类似于 CSS 的 animation-composition
-   `iterationComposite` ：确定值如何在此动画的迭代之间构建，可以是 `add`、`accumulate` 和 `replace`

这些属性可以在创建 `KeyframeEffect` 对象时作为配置项传递，以定制动画的效果和行为：

```JavaScript
const keyframes = [
    { 
        opacity: 0, 
        translate: '0' 
    },
    { 
        opacity: 1, 
        translate: '100%' 
    }
];

const effect = new KeyframeEffect(
    targetElement, 
    keyframes, 
    {
        duration: 1000,
        easing: 'ease-in-out',
        delay: 500,
        iterations: 2,
        direction: 'alternate',
        fill: 'forwards'
     }
 );
```

这个示例定义了一个具有持续时间（`1000ms`）、缓动函数（`ease-in-out`）、延迟（`500ms`）、迭代次数（`2`）、播放方向（`alternate`）和填充模式（`forwards`）的动画效果。

### 组装动画

在 WAAPI 中，可以使用 `Animation()` 构造函数或 `Element.animate()` 函数将动画的不同部分（时间轴对象、动画对象和动画效果对象）组装在一起，创建一个可工作的动画。

使用 `Animation()` 构造函数可以创建 `Animation` 对象，它是动画的主要控制器。通过此构造函数可以设置动画的各种属性，包括持续时间、延迟时间、播放方向、循环播放次数等：

```JavaScript
// 创建 Animation 对象
const animation = new Animation(
    document.getElementById('targetElement'),  // 动画元素
    keyframes,                                 // 关键帧
    options                                    // 配置动画参数
);

// 播放动画
animation.play();
```

也可以直接在 `Element` 元素上调用 `.animate()` 函数创建并播放动画。该函数接受关键帧、选项等参数，并返回一个 `Animation` 对象：

```JavaScript
// 使用 Element.animate() 创建并播放动画
const targetElement = document.getElementById('targetElement'); // 动画元素
const animation = targetElement.animate(
    keyframes, // 关键帧
    options    // 配置动画参数
);
```

动画通常由关键帧（`keyframes`）序列定义，表示在动画不同时间点上元素应具有的样式。关键帧可以是单个样式对象，也可以是样式对象的数组：

```JavaScript
const keyframes = [
    { translate: '0px' },
    { translate: '100%' }
];
```

选项（`options`）包括动画的各种属性，如持续时间、延迟、播放方向、迭代次数等：

```JavaScript
const options = {
    duration: 1000,          // 持续时间为1秒
    delay: 500,              // 延迟0.5秒开始
    iterations: 2,           // 重复2次
    direction: 'alternate',  // 播放方向交替
    easing: 'ease-in-out',   // 动画缓动函数是 ease-in-out
    fill: 'both'             // 动画填充模式是 both   
};
```

组合这些部分即可轻松创建和控制动画，使 Web 页面上实现丰富、交互式的动画效果更加方便。

## WAAPI 的应用

### 从 CSS 动画开始

WAAPI 虽然是一组用于制作动画的 JavaScript API，但它与 CSS 动画有很多相似之处。从一个 CSS 动画着手是应用 WAAPI 最容易的入门方式。

假设有两个元素：将要应用动画的元素 `.animated` 和一个按钮元素：

```HTML
<div class="animated"></div>
<button>Player</button> 
```

点击 `button` 按钮，将应用一个名为 `tada` 的动画（该动画来自 [Animation.css](https://animate.style/)）：

```CSS
@keyframes tada {
    from {
        transform: scale3d(1, 1, 1);
    }

    10%,
    20% {
        transform: scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg);
    }

    30%,
    50%,
    70%,
    90% {
        transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg);
    }

    40%,
    60%,
    80% {
        transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg);
    }

    to {
        transform: scale3d(1, 1, 1);
    }
}

.player {
    animation: tada 1s ease both;
}
```

```JavaScript
const animatedEle = document.querySelector('.animated');
const buttonHandler = document.querySelector('button');

buttonHandler.addEventListener('click', () => {
    animatedEle.classList.toggle('player');
})
```

> Demo 地址：https://codepen.io/airen/full/WNmRRzY

接下来使用 WAAPI 实现与上面相同的动画效果。使用 WAAPI 有两种方法：

```JavaScript
const animatedEle = document.querySelector('.animated');
const buttonHandler = document.querySelector('button');

// 创建动画效果
const effect = new KeyframeEffect(
    animatedEle,  // 应用动画的元素 .animated
    tada,         // tada 动画 （CSS @keyframes 定义的关键帧动画）
    options       // 动画配置参数 （CSS animation-* 属性对应的值）
)

// 创建动画对象，关联时间对象和动画效果对象
const animation = new Animation(
    effect,  // 动画效果
    timeline // 时间轴
)

// 动画播放
buttonHandler.addEventListener('click', () => {
    animation.play()
})
```

上面示例使用 `new Animation()` 构建。另一种方法是 `element.animate()` 创建：

```JavaScript
const animatedEle = document.querySelector('.animated');
const buttonHandler = document.querySelector('button');

// 动画播放
buttonHandler.addEventListener("click", () => {
    // 创建动画对象并播放动画
    const animation = animatedEle.animate(
        tada, // tada 动画 （CSS @keyframes 定义的关键帧动画）
        options // 动画配置参数 （CSS animation-* 属性对应的值）
    );
});
```

无论哪种方式（`new Animation()` 还是 `element.animate()`），要让元素 `.animated` 动起来，都需要 `tada`（关键帧）和 `options`（动画参数配置）。

#### 创建关键帧

WAAPI 中有两种不同的格式创建关键帧。第一种方式与 CSS 的 `@keyframes` 相似：将 CSS 属性定义在 JavaScript 对象中，并将它们放在一个数组里：

```JavaScript
// 创建关键帧
const tada = [
    {
        transform: "scale3d(1, 1, 1)" // 0%
    },
    {
        transform: "scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg)" // 10%
    },
    {
        transform: "scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg)" // 20%
    },
    {
        transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)" // 30%
    },
    {
        transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)" // 40%
    },
    {
        transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)" // 50%
    },
    {
        transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)" // 60%
    },
    {
        transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)" // 70%
    },
    {
        transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)" // 80%
    },
    {
        transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)" // 90%
    },
    {
        transform: "scale3d(1, 1, 1)" // 100%
    }
];
```

注意，CSS 属性需要使用驼峰（camelCase）形式描述，例如 `background-color` 要写成 `backgroundColor`。

定义关键帧时，可以在每个对象（`{}`）中显式设置 `offset`。`offset` 指定关键帧对应的百分比，类似于 `@keyframes` 中的百分比选择器，但需要使用小数表示百分比：

```JavaScript
// 创建关键帧
const tada = [
    {
        transform: "scale3d(1, 1, 1)",
    },
    {
        transform: "scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg)",
        offset: .1 // 10%
    },
    {
        transform: "scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg)",
        offset: .2 // 20%
    },
    {
        transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)";
        offset: .3 // 30%
    },
    {
        transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)" 
        offset: .4 // 40%
    },
    {
        transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)",
        offset: .5 // 50%
    },
    {
        transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)",
        offset: .6 // 60%
    },
    {
        transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)" ,
        offset: .7 // 70%
    },
    {
        transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)",
        offset: .8  // 80%
    },
    {
        transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)",
        offset: .9  // 90%
    },
    {
        transform: "scale3d(1, 1, 1)" // 100%
    }
];
```

如果对象中（`{}`）没有显式指定 `offset`，动画时间会被平均分配：

```JavaScript
const keyframes = [
    { 
        opacity: 0  // 0%
    },
    {
        opacity: 1 // 50%
    },
    {
        opacity: 0 // 100%
    }
]
```

第二种定义关键帧的方式是以属性为 `key`、属性的值为 `value`：

```JavaScript
const tada = {
    transform:[
        "scale3d(1, 1, 1)", // 0%
        "scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg)", // 10%
        "scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg)", // 20%
        "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)", // 30%
        "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)",  // 40%
        "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)", // 50%
        "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)", // 60%
        "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)",  // 70%
        "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)", // 80%
        "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)", // 90%
        "scale3d(1, 1, 1)"
    ]
}
```

这种方式同样可以添加 `offset` 来指定关键帧的百分比：

```JavaScript
const tada = {
    transform:[
        "scale3d(1, 1, 1)", // 0%
        "scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg)", // 10%
        "scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg)", // 20%
        "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)", // 30%
        "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)",  // 40%
        "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)", // 50%
        "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)", // 60%
        "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)",  // 70%
        "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)", // 80%
        "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)", // 90%
        "scale3d(1, 1, 1)"
    ],
    offset: [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1]
}
```

与 CSS 的 `@keyframes` 一样，可以在百分比选择器中显式声明 `animation-timing-function` 属性的值来控制关键帧之间的进展方式。例如：

```CSS
@keyframes flip {
    from {
        transform: perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 0) rotate3d(0, 1, 0, -360deg);
        animation-timing-function: ease-out;
    }

    40% {
        transform: perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 150px) rotate3d(0, 1, 0, -190deg);
        animation-timing-function: ease-out;
    }

    50% {
        transform: perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 150px) rotate3d(0, 1, 0, -170deg);
        animation-timing-function: ease-in;
    }

    80% {
        transform: perspective(400px) scale3d(0.95, 0.95, 0.95) translate3d(0, 0, 0) rotate3d(0, 1, 0, 0deg);
        animation-timing-function: ease-in;
    }

    to {
        transform: perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 0) rotate3d(0, 1, 0, 0deg);
        animation-timing-function: ease-in;
    }
}
```

WAAPI 中定义关键帧时，同样可以在每个对象中设置 `easing` 属性的值。上面的 `@keyframes` 可按如下方式定义：

```JavaScript
const flip = [
    {
        transform: 'perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 0) rotate3d(0, 1, 0, -360deg)',
        offset: 0,
        easing: 'ease-out'
    },
    {
        transform: 'perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 150px) rotate3d(0, 1, 0, -190deg)',
        offset: .4,
        easing: 'ease-out'
    },
    {
        transform: 'perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 150px) rotate3d(0, 1, 0, -170deg)',
        offset: .5,
        easing: 'ease-in'   
    },
    {
        transform: 'perspective(400px) scale3d(0.95, 0.95, 0.95) translate3d(0, 0, 0) rotate3d(0, 1, 0, 0deg)',
        offset: .8,
        easing: 'ease-in'
    },
    {
        transform: 'perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 0) rotate3d(0, 1, 0, 0deg)',
        offset: 1,
        easing: 'ease-in'
    }
]
```

#### 创建 options

创建完 `tada` 关键帧之后，再定义 `options`。它是一个对象，用来设置动画的相关参数，可以简单理解为 `options` 对象中定义的参数与 CSS 的 `animation-*` 相似。例如前面 CSS 关键帧创建的动画：

```CSS
.player {
    animation: tada 1s ease both;
}
```

相当于：

```CSS
.player {
    animation-name: tada;
    animation-duration: 1s;
    animation-timing-function: ease;
    animation-fill-mode: both;
}
```

WAAPI 中定义 `options` 时，可以按如下方式定义出相似的动画参数：

```JavaScript
const options = {
    duration: 1000, // 等同于 animation-duration
    easing: 'ease', // 等同于 animation-timing-functin
    fill: 'both'    // 等同于 animation-fill-mode
}
```

还可以在 `options` 对象中配置动画的其他参数，例如迭代次数、播放方向等。至此，使用 WAAPI 的 `new Animation()` 和 `element.animate()` 复刻 CSS 的 `tada` 动画就实现了：

最左侧是 [CSS 的 @keyframes 创建的动画效果](https://codepen.io/airen/full/WNmRRzY)，中间是 [WAAPI 的 new Animation() 创建的效果](https://codepen.io/airen/full/LYaxWPj)，右侧是 `Element.animate()` 创建的效果。三者最终效果基本一致，只是实现方式略有差异；甚至可以说 WAAPI 两种方式创建的动画在控制方面略胜一筹。

### 创建一个复杂的动画

> Demo 地址：https://codepen.io/airen/full/oNVByZO

这是 Web 中一个典型的交互效果——Ripple Animation：鼠标悬浮到图片上时，一个蓝色层覆盖整个图片，且这个蓝色层由小到大平滑过渡；鼠标移出图片时，蓝色层由大到小直到看不见；蓝色层的圆心位置由鼠标移入图片的点决定。

使用 WAAPI 实现该效果。对应的 HTML 很简单：

```HTML
<figure style="--grid-area: 1 / 1 / 13 / 4;">
    <img src="https://picsum.photos/1024/768?random=1" alt=""  />
    <div class="box"></div>
</figure>
```

示例中的蓝色过渡遮罩层就是 `.box` 元素，其初始样式：

```CSS
.box {
    position: absolute;
    aspect-ratio: 1;
    width: var(--w, 0px);
    background-color:oklch(0.5 0.21 258.61/ .85);
    border-radius: 100%;
    will-change: scale, width, height, translate;
    transition: all .2s cubic-bezier(.2, 1, .2, 1);
    translate: var(--x, 0px) var(--y, 0px);
    scale: 0;
}
```

使用 WAAPI 分别给 `.box` 元素制作入场和离场两个动画：

```JavaScript
// 创建入场动画
const animationEnter = (element) => {
    const keyframes = [
        {
            scale: 0,
            mixBlendMode: "normal"
        },
        {
            scale: 1,
            mixBlendMode: "multiply"
        }
    ];
    
    const options = {
        duration: 600,
        fill: "forwards",
        easing: "cubic-bezier(.2, 1, .2, 1)",
        iterations: 1
    };
    
    element.animate(keyframes, options);
};

// 创建离场动画
const animationLeave = (element) => {
    const keyframes = [
        {
          scale: 1,
          mixBlendMode: "multiply"
        },
        {
          scale: 0,
          mixBlendMode: "normal"
        }
    ];
    
    const options = {
        duration: 400,
        fill: "forwards",
        easing: "cubic-bezier(.2, 1, .2, 1)",
        iterations: 1
    };
    
    element.animate(keyframes, options);
};
```

`animationEnter` 和 `animationLeave` 都使用 `Element.animate()` 创建，在关键帧 `keyframes` 中对元素的 `scale` 和 `mixBlendMode`（即 CSS 的 `mix-blend-mode` 属性）做动画化处理。相当于给 `.box` 应用下面两个 CSS 动画：

```CSS
@keyframes animationEnter {
    form {
        scale: 0;
        mix-blend-mode: normal;
    }
    to {
        scale: 1;
        mix-blend-mode: multiply;
    }
}

@keyframes animationLeave {
    from {
        scale: 1;
        mix-blend-mode: multiply;
    }
    to {
        scale: 0;
        mix-blend-mode: normal;
    }
}

.box {
    animation: animationLeave 400ms cubic-bezier(.2, 1, .2, 1) 1 forwards;
    
    figure:hover & {
        animation: animationEnter 600ms cubic-bezier(.2, 1, .2, 1) 1 forwards;
    }
}
```

然后将 WAAPI 创建的动画应用到 `.box` 元素上：

```JavaScript
const figures = document.querySelectorAll("figure");

figures.forEach((figure) => {
    figure.addEventListener("mouseenter", (event) => {
        const element = event.target.querySelector(".box");
        const coords = getCoords(event.target.getBoundingClientRect());
        const radius = circleSize(event.target.getBoundingClientRect(), coords);
    
        circleConstraints(element, coords, radius);
        animationEnter(element);
    });

    figure.addEventListener("mouseleave", function (event) {
        const element = event.target.querySelector(".box");
        animationLeave(element);
    });
});
```

至此就通过 WAAPI 构建了一个更复杂的交互动画效果。该示例完整的 JavaScript 代码如下：

```JavaScript
const figures = document.querySelectorAll("figure");

figures.forEach((figure) => {
    figure.addEventListener("mouseenter", (event) => {
        const element = event.target.querySelector(".box");
        const coords = getCoords(event.target.getBoundingClientRect());
        const radius = circleSize(event.target.getBoundingClientRect(), coords);
    
        circleConstraints(element, coords, radius);
        animationEnter(element);
    });

    figure.addEventListener("mouseleave", function (event) {
        const element = event.target.querySelector(".box");
        animationLeave(element);
    });
});

// 创建入场动画
const animationEnter = (element) => {
    const keyframes = [
        {
            scale: 0,
            mixBlendMode: "normal"
        },
        {
            scale: 1,
            mixBlendMode: "multiply"
        }
    ];
    const options = {
        duration: 600,
        fill: "forwards",
        easing: "cubic-bezier(.2, 1, .2, 1)",
        iterations: 1
    };
    element.animate(keyframes, options);
};

// 创建离场动画
const animationLeave = (element) => {
    const keyframes = [
        {
          scale: 1,
          mixBlendMode: "multiply"
        },
        {
          scale: 0,
          mixBlendMode: "normal"
        }
    ];
    const options = {
        duration: 400,
        fill: "forwards",
        easing: "cubic-bezier(.2, 1, .2, 1)",
        iterations: 1
    };
    element.animate(keyframes, options);
};

// 获取坐标
const getCoords = (rectangle) => {
    const xPos = rectangle.width * Math.random();
    const yPos = rectangle.height * Math.random();
    return {
        x: xPos,
        y: yPos
    };
};

// 圆形大小
const circleSize = (rectangle, coords) => {
    const x1 = coords.x;
    const y1 = coords.y;
    const rectCoords = [
        {
            x: 0,
            y: 0
        },
        {
            x: 0,
            y: rectangle.height
        },
        {
            x: rectangle.width,
            y: 0
        },
        {
            x: rectangle.width,
            y: rectangle.height
        }
    ];
    
    return Math.max(
        ...rectCoords.map((el) => {
            const x2 = el.x;
            const y2 = el.y;
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        })
    );
};

// 改变圆大小和位置
const circleConstraints = (element, coords, radius) => {
    element.style.setProperty(`--w`, `${radius * 2}px`);
    element.style.setProperty(`--x`, `${coords.x - radius}px`);
    element.style.setProperty(`--y`, `${coords.y - radius}px`);
};
```

### 操控动画

如《CSS 动画的播放方式：暂停、恢复和重播》一文所述，虽然可以使用 `animation-play-state` 属性控制关键帧动画暂停播放（`paused`）和恢复播放（`running`），但该属性无法使关键帧动画重播——这是 CSS 动画的致命缺点之一，有时不得不借助 JavaScript 实现重播：

```JavaScript
 // 重播动画
const restartAnimations = (aniEl, animn) => {
    aniEl.style.setProperty(`--animn`, "none");
    requestAnimationFrame(() => {
        setTimeout(() => {
            aniEl.style.setProperty(`--animn`, `${animn}`);
            aniEl.style.setProperty(`--animps`, "running");
        }, 0);
    });
};
```

> Demo 地址：https://codepen.io/airen/full/OJdoRRJ

相比之下，WAAPI 灵活很多。虽然可以用 WAAPI 编写 CSS 动画，但其 API 真正的价值在于操控动画。WAAPI 提供了一系列用于[控制动画的 API](https://www.w3.org/TR/web-animations-1/#the-animation-interface)：

-   `play()` ：启动或继续播放动画
-   `pause()` ：暂停动画的播放
-   `cancel()` ：取消动画，并清除所有由该动画引起的效果
-   `reverse()` ：反转动画的播放方向
-   `updatePlaybackRate(playbackRate)` ：异步更新动画的播放速率
-   `finish()` ：将动画设置为完成状态，即立即将其移到最后的关键帧
-   `replaceState()` ：提供了一种跟踪动画是处于活跃状态、持久保留还是已移除的方法
-   `commitStyles()` ：会根据底层样式更新元素的样式，以及元素上的所有动画（按合成顺序）
-   `persist()` ：用于将动画标记为不可替换
-   `onfinish` ：设置或获取动画完成时触发的事件处理程序
-   `oncancel` ：设置或获取动画取消时触发的事件处理程序
-   `ready` ：可以等待更改项生效（即在播放或暂停等播放控制方法之间切换）
-   `finished` ：提供了一种在动画播放完毕后执行自定义 JavaScript 代码的方法

这些 API 允许开发者对动画进行各种控制和交互（播放、暂停、取消、完成、反转等），结合使用可实现对动画的精细控制。

以下面这个动画为例：

```HTML
<div class="loader">
    <div class="animated"></div>
</div>
```

```CSS
.loader {
    container-type: inline-size;    
    width: 300px;
    height: 1.5rem;
    border-radius: 999rem;
    color: #514b82;
    border: 2px solid;
    position: relative;
    
    .animated {
        position: absolute;
        margin: 2px;
        width: 25%;
        top: 0;
        bottom: 0;
        left: 0;
        border-radius: inherit;
        background: currentColor;
    }
}
```

```JavaScript
const animatedEle = document.querySelector(".animated");

const keyframes = [
    {
        translate: 'calc(100cqi - 75px)',
        offset: .5
    }
]

const options = {
    duration: 1000,
    easing: 'linear',
    iterations: Infinity
}

const animation = animatedEle.animate(keyframes, options);
```

这是一个简单的 Loading 动画。在示例基础上添加一些按钮并监听它们的点击（`click`）事件——按钮只做一件事：触发 WAAPI 控制动画的 API，例如 `play()`、`pause()` 等：

```HTML
<div class="actions">
    <button class="play">Play</button>
    <button class="pause">Pause</button>
    <button class="reverse">Reverse</button>
    <button class="cancel">Cancel</button>
    <button class="finish">Finish</button>
</div>
```

```JavaScript
const action = document.querySelector(".actions");

action.addEventListener('click', (event) => {
    const targetClassName = event.target.className;
    
    if(targetClassName === 'play') {
        // 播放动画
        animation.play();
    } else if (targetClassName === 'pause'){
        // 暂停动画
        animation.pause();
    } else if (targetClassName === 'reverse'){
        // 反向播放
        animation.reverse();
    } else if (targetClassName === 'cancel'){
        // 取消动画
        animation.cancel();
    } else if (targetClassName === 'finish'){
        // 结束动画
        animation.finish();
    }else {
        return false;
    }
})
```

> Demo 地址：https://codepen.io/airen/full/oNVBQzb

注意，如果动画设置了无限次循环播放，点击 `Finish` 按钮触发 `animation.finish()` 方法时，浏览器会报错——上面的案例就存在这个程序错误。为了展示这几个函数的作用，将动画持续时间调长，并且动画只播放一次：

```JavaScript
const options = {
    duration: 6000,
    easing: 'linear'
    // iterations: Infinity
}
```

> Demo 地址：https://codepen.io/airen/full/zYbNyBo

#### 动画编排

动画编排是构建复杂动画和多动画的有效技巧。CSS 动画中通常依赖动画的持续时间和延迟时间，或动画相关事件（如 `transitionend` 或 `animationend`）来编排动画；WAAPI 在这方面具有天然优势。

WAAPI 中可以通过 `onfinish`、`oncancel` 事件处理程序，或监听 `finish` 和 `cancel` 事件，以及 `ready` 和 `finished` 两个 Promise 来编排动画，从而构建更复杂的动画效果。

以 `finished` 为例：假设希望在动画元素 `.animated` 上应用 `fadeIn` 和 `swing` 两个动画效果，且 `swing` 动画要在 `fadeIn` 结束那一刻才执行。使用 CSS 制作一般会像下面这样：

```CSS
@keyframes fadeIn {
    from {
        opacity: 0.1;
    }
    to {
        opacity: 1;
    }
}

@keyframes swing {
    0% {
        rotate:0 0 1 30deg;
    }
    100% {
        rotate: 0 0 1 -30deg;
    }
}

.animated {
    animation: fadeIn 1s ease-in both, swing 2s ease-in-out 1s infinite alternate;
}
```

> Demo 地址：https://codepen.io/airen/full/PoLWgPd

使用 WAAPI 的 `finished` 可以创建一个链式动画，实现上面的 CSS 动画效果：

```JavaScript
const animatedEle = document.querySelector(".lamp");
const playHandler = document.querySelector(".play");

// 创建 fadeIn 关键帧
const fadeIn = [
    { opacity: .1},
    { opacity: 1}, 
];

// fadeIn 动画参数
const fadeInOptions = {
  duration: 1000,     // 动画持续 1s
  iterations: 1,      // 播放 1 次
  easing: 'ease-in',  // 动画缓动函数为 ease-in
  fill: 'both'        // 动画填充模式为 both
}

// 创建 swing 关键帧
const swing = [
  { rotate: '0 0 1 30deg'},
  { rotate: '0 0 1 -30deg'}, 
];

// swing 动画参数
const swingOptions = {
  duration: 2000,        // 动画持续时间为 2s
  iterations: Infinity,  // 动画无限次循环播放
  easing: 'ease-in-out', // 动画缓动函数为 ease-in-out
  direction: 'alternate' // 动画来回播放
}

playHandler.addEventListener('click', () => {
    // 点击 Play 按钮，先播放 fadeIn 动画
    const animation = animatedEle.animate(fadeIn, fadeInOptions);
    
    // fadeIn 动画结束时开始播放 swing 动画
    animation.finished.then(() => {
        animatedEle.animate(swing, swingOptions)
    });
})
```

在执行链中的下一个动画（`swing`）之前，使用 `animation.finished.then()` 将动画链接起来，动画就会按顺序显示；还可以通过设置不同的选项（例如速度和缓动）将效果应用于不同的目标元素：

> Demo 地址：https://codepen.io/airen/full/VwRPNyd

另一种编排方式：创建两个等待播放的动画 `fadeIn` 和 `swing`，暂停其中一个（如 `swing`）将其延迟，直到另一个动画播放完毕；使用 Promise 等待每个动画执行完毕后再播放；最后根据标记决定是否倒放每个动画：

```JavaScript
const animatedEle = document.querySelector(".lamp");
const playHandler = document.querySelector(".play");

const fadeIn = [{ opacity: 0.1 }, { opacity: 1 }];

const fadeInOptions = {
    duration: 1000, 
    iterations: 1, 
    easing: "ease-in", 
    fill: "both" 
};

const swing = [{ rotate: "0 0 1 30deg" }, { rotate: "0 0 1 -30deg" }];

const swingOptions = {
    duration: 2000,
    iterations: Infinity,
    easing: "ease-in-out",
    direction: "alternate"
};

// 设置标记
let play = false;

playHandler.addEventListener("click", () => {
    const anim1 = animatedEle.animate(fadeIn, fadeInOptions);
    const anim2 = animatedEle.animate(swing, swingOptions);
    
    // 获取页面中所有动画
    let animations = document.getAnimations();
    
    // 如果标记为 true ，反向播放所有动画
    if (play) {
        animations.forEach((anim) => {
            anim.currentTime = anim.effect.getTiming().duration;
            anim.reverse();
        });
        animations = animations.reverse();
    }

    // swing 动画暂停播放
    animations[1].pause();
    
    // fadeIn 动画播放完了才播放 swing 动画
    animations[0].finished.then(() => {
        animations[1].play();
    });
    
    // 将标记重置为 true
    play = !play;
});
```

> Demo 地址：https://codepen.io/airen/full/qBvRGEM

同样的编排思路可以扩展到更多场景，例如模态框组件入场动画：给模态框容器定义一个 `slideIn` 动画，给模态框内容定义一个 `fadeIn` 动画，当容器的 `slideIn` 运行完毕之后再执行内容上的 `fadeIn` 动画。

#### 与部分关键帧交互

使用 WAAPI 制作动画时，还可以与动画的部分关键帧进行交互。例如下面这个示例：整个动画只有一个关键帧，并且没有指定起始位置。鼠标处理程序会给动画元素设置新的结束位置并触发新动画，系统会根据当前的底层位置推断新的起始位置：

```JavaScript
const animatedEle = document.querySelector('.overlay');

const handleClick = (etv) => {
    let sibling = etv.target;
    while (sibling.parentElement != animatedEle.parentElement)
        sibling = sibling.parentElement;
    let x = sibling.offsetLeft;
    let y = sibling.offsetTop - animatedEle.parentElement.offsetTop;
    const keyframes = [
        {
            translate: `${x}px  ${y}px`
        }
    ]
  
    const options = {
        duration: 1000,
        easing: 'ease',
        fill: 'forwards'
    }
    
    animatedEle.animate(keyframes, options)
}

const figures = document.querySelectorAll('.container > img');

figures.forEach(figure => {
    figure.addEventListener('click', handleClick)
})
```

> Demo 地址：https://codepen.io/airen/full/GReWqWW

新的过渡可以在现有过渡仍在运行时触发：当前过渡会中断，系统会创建新的过渡。

#### 可替换动画与自动清理

WAAPI 除能更好地控制动画外，在性能上也有明显优势。例如基于 `mousemove` 事件创建鼠标跟随动画时，每次都会创建新的动画，可能快速消耗内存并降低性能。WAAPI 可以创建一个可替换的动画实现自动清理：将已完成的动画标记为可替换，在被其他结束的动画替换后自动移除。

```JavaScript
let animationTally = 0;
const tally = document.querySelector('.tally');
const indicators = document.querySelectorAll('.indicator');

document.body.addEventListener('mousemove', evt => {
    let duration = 30;
    let opacity = 0.8;
    let size = 10;
    const x = evt.clientX;
    const y = evt.clientY;
  
    indicators.forEach(indicator => {
        indicator.style.opacity = opacity;
        indicator.style.width = `${size}px`;
        indicator.style.height = `${size}px`;
        const keyframes = [
            {
                translate: `${x}px ${y}px`
            }
        ]
        const options = {
            duration: duration,
            fill: 'forwards'
        }
        const anim = indicator.animate(keyframes, options);
        anim.onremove = () => {
            tally.textContent = `${++animationTally}`;
        };
        duration *= 2;
        size *= 0.9;
        opacity *= 0.8;
    });
});
```

> Demo 地址：https://codepen.io/airen/full/qBvrNyZ

每次鼠标移动时，浏览器都会重新计算每个玫红色圆点的位置并为其创建新动画。启用替换后，浏览器在以下情况下会移除旧动画：

-   动画播放完毕
-   存在一个或多个复合排序顺序更高的动画也已完成
-   新动画将为相同的属性添加动画效果

通过将计数器与每个已移除的动画汇总，并使用 `anim.onremove` 触发计数器，可以了解被替换动画的确切数量。此外还有其他控制动画的方法：

-   `animation.replaceState()` 提供了一种跟踪动画是处于活跃状态、持久保留还是已移除的方法
-   `animation.commitStyles()` 会根据底层样式更新元素的样式，以及元素上的所有动画（按复合顺序）
-   `animation.persist()` 用于将动画标记为不可替换

> **注意** ：**`animation.commitStyles()`** 和 **`animation.persist()`** 常与合成模式（例如 `add`）一起使用。

该特性可运用于很多交互场景，制作更具创意的带动画的交互效果。例如点赞按钮的效果：点击按钮时会有简单的粒子动画效果，动画结束时可以删除这些粒子：

> Demo 地址：https://codepen.io/airen/full/XWGMjJm

完整代码见示例源码。

#### 动画合成

CSS 中可以通过 `animation-composition` 属性对动画进行合成操作，它影响所有动画属性，无论元素应用一个还是多个动画。WAAPI 中同样可以设置动画的合成模式，允许开发者编写不同的动画并控制效果的组合方式。

合成动画时，可以编写简短的独特效果并将它们组合。例如下拉菜单效果：第一个是 `slideInDown` 动画，下拉菜单从页面顶部向下移动；第二个是 `bounce` 动画，是一个微动画，下拉菜单在贴近底部时会有一个小弹跳。使用 `add` 复合模式可以实现更顺畅的动画效果：

```JavaScript
let visibleMenu = undefined;
const dropMenu = document.body.querySelector(".dropmenu");
const menuBar = document.body.querySelector(".menu");
const menuBarHeight = menuBar.clientHeight;
const dropMenuHeight = dropMenu.clientHeight;
const menuItems = document.body.querySelectorAll(".menu--item");


async function displayMenu(name, yOffset) {
    if (visibleMenu) {
        await hideMenu();
    }
  
    document.getElementById(name).classList.add("active");
    visibleMenu = name;
    dropMenu.style.left = `${yOffset}px`;
    const dropMenuHeight = dropMenu.clientHeight;
    const menuBarHeight = menuBar.clientHeight;
    const maxOvershoot = 12;
  
    dropMenu.style.setProperty(`--top`, `0px`);

    const slideInDownKeyframes = [
        {
            translate: `0 ${-dropMenuHeight}px`,
            easing: "ease-in"
        },
        {
            translate: `0 ${menuBarHeight}px`
        }
    ];

    const slideInDownOptions = {
        duration: 300,
        fill: "forwards"
    };

    const slideInDown = dropMenu.animate(
        slideInDownKeyframes,
        slideInDownOptions
    );

    const bounceKeyframes = [
        {
            translate: `0px 0px`,
            easing: "ease-in"
        },
        {
            translate: `0px ${maxOvershoot}px`,
            easing: "ease-out"
        },
        {
            translate: `0px 0px`,
            easing: "ease-in"
        },
        {
            translate: `0px ${-maxOvershoot / 2}px`,
            easing: "ease-out"
        },
        {
            translate: `0px 0px`,
            easing: "ease-in"
        }
    ];

    const bounceOptions = {
        duration: 300,
        composite: "add"
    };

    slideInDown.finished.then(() => {
        const bounce = dropMenu.animate(bounceKeyframes, bounceOptions);
    });
}

function hideMenu() {
    let promise = new Promise((resolve, reject) => {
        if (!visibleMenu) {
            resolve();
            return;
        }
        document.getElementById(visibleMenu).classList.remove("active");
        visibleMenu = undefined;
        
        const slideOutUpKeframes = [
            {
                translate: `0px 0px`,
                easing: "ease-in"
            },
            {
                translate: `0px ${-dropMenuHeight}px`
            }
        ]
        
        const slideOutUpOptions = {
            duration: 300, 
            fill: "forwards"
        }
        const slideOutUp = dropMenu.animate(slideOutUpKeframes, slideOutUpOptions);
        slideOutUp.finished.then(() => {
            resolve();
        });
    });
    return promise;
}


document.body.addEventListener('click', () => {
    hideMenu();
})

menuItems.forEach((item) => {
    item.addEventListener('click', etv => {
        if (visibleMenu == item.id) return;
        displayMenu(item.id, parseFloat(item.offsetLeft));
        etv.stopPropagation();
    })
});
```

> Demo 地址：https://codepen.io/airen/full/MWxpbGr

如需进一步了解 WAAPI 复合模式，可参阅 WAAPI 规范中的 [CompositeOperation 和 CompositeOperationOrAuto](https://www.w3.org/TR/web-animations-1/#the-compositeoperation-enumeration)。

#### 调整播放速率

了解 CSS 动画的开发者应该知道，CSS 中调整动画播放速度通常只能调整动画的持续时间或缓动函数。WAAPI 中调整动画播放速度则灵活得多——可以使用 `playbackRate` 调整动画的播放速率：

```JavaScript
const rotate = [{ rotate: "0deg" }, { rotate: "-360deg" }];
const translate = [{ translate: `0px 0px` }, { translate: `0 -100%` }];
const gear1Options = {
    duration: 2500, 
    iterations: Infinity
};
const gear2Options = {
    duration: 5000,
    direction: "reverse",
    iterations: Infinity
};

const beltOption = {
    duration: 100000,
    iterations: Infinity
};

const setAnimation = (item, keyframes, options) =>
  document.getElementById(item).animate(keyframes, options);

const firstGear = setAnimation("gear1", rotate, gear1Options);
const secGear = setAnimation("gear2", rotate, gear2Options);
const belt = setAnimation("belt", translate, beltOption);

const animations = document.getAnimations();

const setSpeed = (etv) => {
    const rate = etv.target.value;

    animations.forEach((ani) => {
        if (rate >= 3) {
            ani.playbackRate = 1 + (rate - 3) * 0.3;
        } else if (rate < 3) {
            ani.playbackRate = 1 - (3 - rate) * 0.3;
        }
    });
    document.getElementById("speed-output").textContent = firstGear.playbackRate;
};

document.getElementById("speed").addEventListener("change", setSpeed);
```

> Demo 地址：https://codepen.io/airen/full/zYbZNZQ

一个小细节：当动画的播放速率 `playbackRate` 为负值时，相当于给动画设置了 `reverse()`，动画会反向播放。

## 小结

WAAPI 提供了一组用于控制 Web 动画的 JavaScript API，使开发者能以更灵活、强大的方式创建和控制动画：它填补了声明式 CSS 动画与动态 JavaScript 动画之间的差距，其核心是时间模型与动画模型，由时间轴对象、动画效果对象和动画对象组装出可播放、可操控的动画。借助播放控制 API、`finished`/`ready` Promise、可替换动画和合成模式，WAAPI 为实现复杂、交互式的动画提供了现代而强大的手段。

