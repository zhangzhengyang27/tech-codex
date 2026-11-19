---
title: CSS Animations vs Web Animations API ：选择最佳的动画方法
description: "在 Web 设计中，动画是提高用户体验和吸引注意力的重要元素。随着 Web 技术的发展，CSS 动画（@keyframes）与 Web Animations API（WAAPI）各有优劣，本文从创建、控制、生命周期、缓动函数等维度对比两者，帮助开发者选择最佳的动画方法。"
keywords: [CSS, Animations, vs, Web, Animations]
category: CSS
tags: [CSS, 布局, 动画, 响应式]
---


# CSS Animations vs Web Animations API ：选择最佳的动画方法

## 概念说明

在 Web 设计中，动画是提高用户体验和吸引注意力的重要元素。这也是许多 JavaScript 动画库（如 [Framer Motion](https://www.framer.com/motion/) 和 [GreenSock](https://gsap.com/)）持续增长的原因。不过，随着 Web 技术的发展，实现 Web 动画效果的原生方案仍然是 CSS 过渡（`transition`）、CSS 动画（`animation`）和 WAAPI。

三者之中，CSS 动画通常指过渡动画（`transition`）和关键帧动画（`animation`）；本文讨论的 CSS 动画以关键帧动画为主，即使用 CSS 的 `@keyframes` 定义、以 `animation` 属性设置参数的动画。WAAPI 则是通过一系列 JavaScript API 定义的动画。因此，**CSS 动画与 WAAPI 最大的差异是：CSS 动画是一种声明式动画；WAAPI 是一种命令式动画**。

选择 CSS 动画还是 WAAPI，需要根据具体项目需求和团队技能权衡：动画的复杂性、性能需求和开发团队对技术的熟悉程度，都是决定最佳实现方法的因素。

### 同一个动画的两种实现

以名为 `slideInBlurredTop` 的入场动画为例。使用 CSS 实现：

```CSS
/* 使用 @keyframe 创建名为 slideInBlurredTop 动画 */
@keyframes slideInBlurredTop {
    0% {
        transform: translateY(-1000px) scaleY(2.5) scaleX(.2);
        transform-origin: 50% 0;
        filter: blur(40px);
        opacity: 0;
    }
    100% {
        transform: translateY(0) scaleY(1) scaleX(1);
        transform-origin: 50% 50%;
        filter: blur(0);
        opacity: 1;
    }
}

/* 将已创建的 slideInBlurredTop 动画应用到 animated 元素上 */
.animated {
    animation: slideInBlurredTop 0.6s cubic-bezier(0.230, 1.000, 0.320, 1.000) infinite alternate forwards;
}
```

在 WAAPI 中有两种创建方式：使用 `new Animation()` 和 `new KeyframeEffect()` 构建，或使用 `Element.animate()`。两种方式都需要一个类似 CSS `@keyframes` 的关键帧对象 `keyframes` 和一个类似 `animation-*` 属性值列表的 `options`：

```JavaScript
// 创建关键帧，类似于 CSS 的 @keyframes
const keyframes = [
    { 
        offset: 0, // 相当于 @keyframes 中的 0% 或 from
        transform: 'translateY(-1000px) scaleY(2.5) scaleX(.2)',
        transformOrigin: '50% 0',
        filter: 'blur(40px)',
        opacity: 0
    },
    {
        offset: 1,
        transform: 'translateY(0) scaleY(1) scaleX(1)',
        transformOrigin: '50% 50%',
        filter: 'blur(0)',
        opacity: 1
    }
]

// 定义 options，配置动画参数，相当于 CSS 的 animation-* 属性值
const options = {
    duration: 600,  // 设置动画持续时间：相当于 animation-duration: 0.6s
    easing: 'cubic-bezier(0.230, 1.000, 0.320, 1.000)', // 设置动画缓动函数：相当于 animation-timing-function: cubic-bezier(0.230, 1.000, 0.320, 1.000)
    iterations: Infinity, // 设置动画播放次数：相当于 animation-iteration-count: infinite
    direction: 'alternate', // 设置动画方向：相当于 animation-direction: alternate
    fill: 'forwards' // 设置动画填充模式：相当于 animation-fill-mode: forwards
}
```

> 注意，在 WAAPI 中还可以以对象形式来创建 `keyframes`，详细内容参见《掌握 Web Animations API 的精髓》中关于 `keyframes` 定义的部分。

将定义好的 `keyframes` 和 `options` 分别传递给 `new KeyframeEffect()` 构造函数或 `Element.animate()` 函数：

```JavaScript
const animEle = document.querySelector('.animated'); // 获取要应用动画的目标元素，相当于 CSS 中的 .animated 选择中的元素

// 使用 new KeyframeEffect() 创建一个效果
const slideInBlurredTop = new KeyframeEffect(animEle, keyframes, options);

// 使用 new Animation() 创建一个动画
const animation = new Animation(slideInBlurredTop, document.timeline);

// 播放动画
animation.play()
```

使用 `Element.animate()` 则更简洁：

```JavaScript
const animEle = document.querySelector('.animated'); // 获取要应用动画的目标元素，相当于 CSS 中的 .animated 选择中的元素

animEle.animate(keyframes, options);
```



> Demo 地址：https://codepen.io/airen/full/rNRzzGb

动画最终效果几乎一致。但从代码层面看，对熟悉 CSS 动画的开发者而言，部分术语的习惯不同。下表列出 CSS `animation` 属性与 WAAPI `options` 的对应关系：

| **CSS** **`animation`** **属性**  | **WAAPI 等效 API（** **`options`** **）** | **描述**                                                                                                                                               |
| ------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`animation-name`**            | ❌                                    | 在 WAAPI 中没有直接对应项，关键帧作为 `keyframes` 参数传入，动画对象可通过 `id` 命名                                                                                                           |
| **`animation-duration`**        | **`duration`**                        | 动画单次迭代所需时间（动画持续时间），等同于 CSS 的 `animation-duration` 。在 WAAPI 中 `duration` 的值不带单位，而且只能是 `ms` ，但在 CSS 中可以是 `ms` 也可以是 `s`                                 |
| **`animation-timing-function`** | **`easing`**                          | 动画缓动函数，等同于 CSS 的 `animation-timing-function`。                                                                                                        |
| **`animation-fill-mode`**       | **`fill`**                            | 动画填充模式，等同于 CSS 的 `animation-fill-mode`                                                                                                               |
| **`animation-iteration-count`** | **`iterations`**                      | 动画循环播放次数，等同于 CSS 的 `animation-iteration-count` 。如果希望动画无限循环播放，是 `Infinity` 而不是 `infinite`。`Infinity` 不用引号括起来，因为 `Infinity` 是JavaScript关键字，而其他值是字符串。 |
| **`animation-direction`**       | **`direction`**                       | 动画运动方向，等同于 CSS 的 `animation-direction`                                                                                                               |
| **`animation-delay`**           | **`delay`**                           | 动画延迟时间，等同于 CSS 的 `animation-delay` 。在 WAAPI 中 `delay` 的值不带单位，而且只能是 `ms` ，但在 CSS 中可以是 `ms` 也可以是 `s`                                                   |
| **`animation-play-state`**      | ❌                                     | 与 WAAPI 中的 `play()` 和 `pause()` 方法有点类似                                                                                                               |
| **`animation-composition`**     | **`composite`**                       | 动画合成，等同于 CSS 的 `animation-composition`                                                                                                               |
| ❌                               | **`endDelay`**                        | 指定动画结束后的延迟时间                                                                                                                                         |
| ❌                               | **`iterationStart`**                  | 指定动画应该在迭代的哪个点开始                                                                                                                                      |

WAAPI 配置动画参数时，没有类似 `animation-play-state` 的参数，但可以通过 `play()` 和 `pause()` 方法控制动画的播放和暂停。CSS 中没有 `endDelay` 和 `iterationStart` 的概念，只有动画延迟播放的概念。两者的含义：

- `endDelay`：指定动画结束后的延迟时间。串联多个动画、并希望在一个动画结束和后续动画开始之间留出间隔时，`endDelay` 很有用
- `iterationStart`：指定动画在迭代的哪个点开始，取值范围 `0.0 ~ 1.0`。值为 `0.5` 表示动画从 `50%` 关键帧点（即动画中间）开始。若迭代次数设置为 `1` 而 `iterationStart` 为 `0.5`，则动画从中间播放到结束，然后从头重新播放，并在中间结束

此外，总迭代次数还可以设置为小于一的值：

```JavaScript
const options = {
    iterations: .5,
    iterationStart: .5
}
```

这将使动画从中间播放到结束。`endDelay` 和 `iterationStart` 的详细机制参见《掌握 Web Animations API 的精髓》。

从工程角度对比：CSS 动画（`transition` 和 `animation`）在声明静态动画时便利且高效，但在动态创建、播放控制和监听动画生命周期等方面存在局限；WAAPI 则解决了这些问题。

## 动画的创建

CSS 可以很容易地为元素状态变化添加动画，例如在按钮悬浮状态改变 `transform` 的值：

```CSS
.button {
    transition: transform .2s ease;
    
    &:hover {
        transform: scale(1.2);
    }
}
```

或者使用关键帧动画：

```CSS
@keyframes scale {
    0% {
        transform: scale(1);
    }
    100% {
        transform: scale(1.2);
    }
}

.button:hover {
    animation: scale .2s ease;
}
```

CSS 动画显得容易，是因为动画化属性的开始值和结束值预先已知。如果开始值和结束值事先未知（例如按钮悬浮状态下 `scale()` 的值是一个随机值），CSS 就没那么方便了，此时通常采用 JavaScript 处理：

```JavaScript
const buttonHandler = document.querySelector(".button");

buttonHandler.addEventListener("mousemove", (etv) => {
    const randomValue = 1 + Math.random() * 0.5;
    
    const target = etv.target;

    // 设置过渡属性和起始值。
    target.style.transitionProperty = "transform";
    target.style.transitionDuration = "1s";
    target.style.transform = "scale(1)";

    // 强制进行样式失效，以记录起始值。
    window.getComputedStyle(target);

    // 现在，设置结束值。
    target.style.transform = `scale(${randomValue})`;
});

buttonHandler.addEventListener("mouseout", (etv) => {
    const target = etv.target;

    target.style.transitionProperty = "transform";
    target.style.transitionDuration = "1s";

    target.style.transform = `scale(1)`;
});
```



> Demo 地址：https://codepen.io/airen/full/PoLKMWW

这种方式存在一些问题：示例中强制进行样式失效不会让浏览器在它认为最合适的时间执行该任务；而且这只是一个单一动画，页面上若有多个类似效果，将导致样式失效倍增，降低页面性能。

若改用 CSS 关键帧动画，就必须先生成一个专用的 `@keyframes` 规则并插入 `<style>` 元素——未能封装的、针对单个元素的样式更改会导致昂贵的样式失效。

WAAPI 则不同：它保留让浏览器引擎高效运行动画的能力，同时提供更高级别的动画控制。使用 `Element.animate()` 实现同样的按钮悬浮动画：

```JavaScript
const buttonHandler = document.querySelector(".button");

buttonHandler.addEventListener("mousemove", (etv) => {
    const randomValue = 1 + Math.random() * 0.5;
    const target = etv.target;
    const keyframes = [
        {
            transform: `scale(1)`
        },
        {
            transform: `scale(${randomValue})`
        }
    ];
    const options = {
        duration: 1000,
        fill: "both"
    };

    target.animate(keyframes, options);
});

buttonHandler.addEventListener("mouseout", (etv) => {
    const target = etv.target;
    const keyframes = [
        {
            transform: `scale(1)`,
            offset: 1
        }
    ];
    const options = {
        duration: 1000,
        fill: "both"
    };

    target.animate(keyframes, options);
});
```



> Demo 地址：https://codepen.io/airen/full/mdoMNjW

`Element.animate()` 的第一个参数类似 CSS 的 `@keyframes`，第二个参数类似 CSS 的 `animation-*` 属性值，可以表达 CSS 动画的所有特性。

与前面基于过渡的方案相比，WAAPI 的优势在于时机：前一个方案只是告诉浏览器对什么进行动画以及如何动画，但没有指定何时进行动画，且需要强制样式失效；使用 WAAPI 创建的动画，浏览器会在下一个最合适的时刻处理所有新动画，无需强制样式失效。自建动画、第三方 JavaScript 库的动画、甚至位于不同文档中的动画，都将同时启动并同步进行。

## 动画的控制

控制一个动画通常涉及三个方面：

- 控制动画的播放状态（开始播放、暂停、重播和取消等）
- 动画播放速度（速率）
- 动画的时间（动画持续时间和延迟时间）

### CSS 动画控制能力的边界

**播放状态**方面，CSS 过渡动画（`transition`）最弱：一旦被触发只能往前运行，无法在播放过程中暂停或取消。CSS 关键帧动画（`animation`）稍强，可以通过 `animation-play-state` 属性控制播放（`running`）和暂停（`paused`），但与过渡动画一样，CSS 中无法使一个动画重新播放，通常需要借助 JavaScript 才能实现重播。

**时间**方面，CSS 通过 `transition-duration` 或 `animation-duration` 控制持续时间，通过 `transition-delay` 或 `animation-delay` 控制延迟时间；但设置动画的"当前时间"只能采用变通手段，例如巧妙地操纵负的 `animation-delay` 或 `transition-delay` 值（参见《深入了解 CSS 动画的持续时间和延迟时间》）。

**播放速度**方面，CSS 中没有属性可以直接调整动画播放速率，只能通过调整缓动函数和时间值间接影响：相同距离和时间条件下，不同的缓动曲线（除恒速 `linear` 外）会影响播放速度；调整持续时间也会影响播放速度。

### WAAPI 的专用控制 API

上述各方面对 WAAPI 都不是问题，因为它们由专用 API 处理：`play()`（播放）、`pause()`（暂停）、`cancel()`（取消）和 `finish()`（结束）等方法控制播放状态；`currentTime`、`startTime`、`endDelay` 和 `iterationStart` 查询和设置时间；`playbackRate` 控制播放速度。

```JavaScript
const animEle = document.querySelector(".animated");
const buttonHandler = document.querySelector(".button");

const keyframes = [
    { 
        scale: 1.2, 
        offset: 0.5 
    }
];

const options = {
    duration: 1000,
    iterations: Infinity,
    easing: "ease"
};

const animation = animEle.animate(keyframes, options);

animation.pause();

// 将其当前时间更改，使其向前移动500ms。
animation.currentTime += 500;

// 将动画减速以半速播放
animation.playbackRate = 0.5;

buttonHandler.addEventListener("click", () => {
    if (animation.playState === "paused") {
        animation.play();
    } else {
        animation.pause();
    }
});
```



这使得开发者可以在动画创建后控制其行为，例如在按下按钮时切换动画的播放状态：

> Demo 地址：https://codepen.io/airen/full/ExMwVpR

还可以根据一个 `<input type="range">` 来调整动画的 `currentTime`：

```JavaScript
const animEle = document.querySelector(".animated");
const inputHandler = document.querySelector("#currentTime");

const keyframes = [{ scale: 1.2, offset: 0.5 }];

const options = {
    duration: 1000,
    iterations: Infinity,
    easing: "ease"
};

const animation = animEle.animate(keyframes, options);

animation.pause();

// 将其当前时间更改，使其向前移动500ms。
animation.currentTime += 500;

// 将动画减速以半速播放
animation.playbackRate = 0.5;

inputHandler.addEventListener("input", (etv) => {
    animation.currentTime = etv.target.value * animation.effect.getTiming().duration;
    console.log(animation.currentTime);
    animation.play();
});
```



> Demo 地址：https://codepen.io/airen/full/eYXGpqr

对于在其自然播放范围之外暂停的动画，通过设置新的持续时间和开始时间，可以将其从暂停状态转换为已完成状态，而无需重新启动：

```JavaScript
const animEle = document.querySelector(".animated");

const keyframes = [{ scale: 1.2, offset: 0.5 }];

const options = {
    duration: 1000,
    iterations: 1,
    easing: "ease"
};

const animation = animEle.animate(keyframes, options);

// 更新了动画效果的时间设置，它将动画的持续时间设置为 5000ms
animation.effect.updateTiming({ duration: 5000 });

// 将动画的当前时间设置为 4000ms, 动画将从 4000ms 的位置开始播放
animation.currentTime = 4000;

// 将动画暂停，此时动画处于暂停状态
animation.pause();

// 在动画准备好之后执行回调函数，在这个回调函数中，我们对动画进行一些额外的操作
animation.ready.then(function() {
    // 在 Promise 回调中，再次更新动画效果的时间设置，将持续时间缩短为 3000ms
    animation.effect.updateTiming({ duration: 3000 });
    
    // 命令行 输出动画的播放状态，这个时候动画被暂停，所以状态显示为 paused
    console.log(animation.playState); // 显示 'paused'
    
    // 计算新的开始时间，以便将动画从暂停状态转换为已完成状态。它使用了当前文档时间减去动画当前时间乘以播放速率的计算
    animation.startTime = document.timeline.currentTime - animation.currentTime * animation.playbackRate;
    
    // 命令行 输出动画的播放状态，这个时候动画设置为已完成，所以状态显示为 finished
    console.log(animation.playState); // 显示 'finished'
});
```



> Demo 地址：https://codepen.io/airen/full/eYXGJgP

### 完成状态的通知机制

动画完成状态的通知通常是异步执行的，这允许动画暂时进入已完成的播放状态，而不触发事件或解析 Promise。下面示例中动画暂时进入已完成状态；如果完成状态的通知同步发生，这段代码将导致完成事件排队和当前已完成的 Promise 被解析——而如果颠倒两个语句的顺序（先更新迭代次数），则不会发生。为了避免这种令人惊讶的行为，完成状态通知被设计为异步执行：

```JavaScript
const animEle = document.querySelector(".animated");
const buttonHandler = document.querySelector(".button");

const keyframes = [{ scale: 1.2, offset: 0.5 }];

const options = {
    duration: 2000,
    easing: "ease"
};

buttonHandler.addEventListener("click", (etv) => {
    // 创建了一个动画对象 animation
    const animation = animEle.animate(keyframes, options);
    
    // 设置动画的播放速率为 2。这意味着动画将以正常速度的两倍播放。
    animation.playbackRate = 2;
    
    // 将动画的当前时间设置为 1000ms, 相当于动画已完成一部分
    animation.currentTime = 1000; // 动画现在已完成
    
    // 更新动画效果，将迭代次数设置为 2。这会导致动画不再处于已完成状态，而是会再次播放两次
    animation.effect.updateTiming({ iterations: 2 }); // 动画不再处于已完成状态
});
```



这种设置可能导致动画在点击按钮后以加速的速度重新播放，并在播放两次后停止。

> Demo 地址：https://codepen.io/airen/full/WNmZXBR

异步行为的唯一例外是显式执行完成动画过程（通常通过调用 `finish()` 方法）。此时开发者明确希望完成动画，完成状态的通知同步执行：

```JavaScript
const animEle = document.querySelector(".animated");
const buttonHandler = document.querySelector(".button");

const keyframes = [{ scale: 1.2, offset: 0.5 }];

const options = {
    duration: 2000,
    easing: "ease"
};

buttonHandler.addEventListener("click", (etv) => {
    const animation = animEle.animate(keyframes, options);
    
    // 方法会立即触发完成事件，并解析已完成的 Promise
    animation.finish(); 
    
    // 将动画的当前时间设置为 0
    animation.currentTime = 0;
});
```



> Demo 地址：https://codepen.io/airen/full/xxBXpxm

点击 `buttonHandler` 元素时会创建动画对象，立即调用 `finish` 方法触发完成事件，然后将动画当前时间设置为 `0`，使其离开已完成状态，准备好重新播放。

## 动画生命周期

JavaScript 为 CSS 的 transition 和 animation 提供了相关事件：

- CSS `transition` 对应的 JavaScript 事件：`transitionstart`、`transitionrun`、`transitionend` 和 `transitioncancel`
- CSS `animation` 对应的 JavaScript 事件：`animationstart`、`animationend`、`animationcancel` 和 `animationiteration`

通过这些事件可以监听 CSS 动画的开始、结束和取消，但正确使用它们并不容易。例如元素应用了一个 `fadeOut` 动画，动画结束时从 DOM 中删除该元素。使用 CSS 动画的常见写法：

```CSS
@keyframes fadeOut {
    to {
        opacity: 0;
    }
}

.animated.play {
    animation: fadeOut 1s ease-out;
}
```



```JavaScript
const animEle = document.querySelector(".animated");

animEle.addEventListener('animationend', etv => {
    animEle.remove();
})
```



> Demo 地址：https://codepen.io/airen/full/MWxErML

这段代码看似没问题，实际上有隐患：它会在元素上分派 `animationend` 事件时立即删除元素，但动画事件会冒泡，事件可能来自 DOM 层次结构中子元素完成的动画。虽然可以采取措施使代码更安全，但使用 WAAPI 编写这类代码更容易也更安全——可以直接引用 `Animation` 对象，而不依赖元素层次结构范围内的动画事件。

此外，WAAPI 还使用 Promises 监视动画的准备和完成状态：

```JavaScript
const animEle = document.querySelector(".animated");
const buttonHandler = document.querySelector(".button");

const keyframes = [
    {
        opacity: 1
    },
    {
        opacity: 0
    }
];

const options = {
    duration: 1000,
    easing: "ease-out"
};

buttonHandler.addEventListener("click", (etv) => {
    const animation = animEle.animate(keyframes, options);
    
    // animation 动画结束时删除 animEle 元素
    animation.finished.then(() => {
        animEle.remove();
    });
});
```



> Demo 地址：https://codepen.io/airen/full/poYWaPm

若要在删除共享容器之前监视针对多个元素的多个 CSS 动画的完成，传统方式会非常复杂；使用 WAAPI 及其对 Promises 的支持，可以简洁地表达：

```JavaScript
// 在删除容器之前等待所有动画完成。
let animations = container.getAnimations();
Promise.all(
    animations.map(animation => animation.finished.then(() => {
        container.remove();
    }
);
```

## 缓动函数

缓动函数（缓动曲线）对任何动画都非常重要。CSS 关键帧动画和 WAAPI 各有两种设置方式。

第一种：为整个动画指定缓动函数。CSS 关键帧动画使用 `animation-timing-function` 属性；WAAPI 在 `options` 中设置 `easing` 属性：

```CSS
.animation {
    animation-timing-function: ease;
}
```



```JavaScript
const options = {
    easing: 'ease'
}
```

第二种：在定义关键帧时指定缓动函数：

```CSS
@keyframes fadeIn {
    0% {
        opacity: 0;
        animation-timing-function: ease-in;
    }
    50% {
        opacity: .5;
        animation-timing-function: ease-out;
    }
    100% {
        opacity: 1;
    }
}
```



```JavaScript
const keyframes = [
    {
        offset: 0,
        opacity: 0,
        easing: 'ease-in'
    },
    {
        offset: .5,
        opacity: .5,
        easing: 'ease-out'
    },
    {
        offset: 1,
        opacity: 1
    }
]
```

::: warning 关键帧缓动的两个要点
关键帧中定义的缓动函数只应用于关键帧之间，而不是整个动画，这样可以实现精细控制。另外，无论 CSS 还是 WAAPI，都不应为最后一帧传递缓动值——这没有任何效果，这是一个常见错误。
:::

以下 WAAPI 示例分别在 `keyframes` 和 `options` 中定义缓动函数，两个动画呈现的效果不同：

```JavaScript
const animEle1 = document.querySelector(".animated1");
const animEle2 = document.querySelector(".animated2");

// 在 keyframes 中应用缓动函数
const keyframes1 = [
    {
        offset: 0,
        rotate: '0deg',
        easing: 'ease-out'
    },
    {
        offset: .5,
        rotate: '180deg',
        easing: 'ease-out'
    },
    {
        offset: 1,
        rotate: '0deg'
    }
]

const options1 = {
    duration: 1000,
    iterations: Infinity
}

const keyframes2 = [
    {
        offset: 0,
        rotate: '0deg'
    },
    {
        offset: .5,
        rotate: '180deg'
    },
    {
        offset: 1,
        rotate: '0deg'
    }
]

// 在 options 中定义缓动函数
const options2 = {
    duration: 1000,
    iterations: Infinity,
    easing: 'ease-out'
}

buttonHandler.addEventListener("click", (etv) => {
    animEle1.animate(keyframes1, options1);
    animEle2.animate(keyframes2, options2);
});
```



> Demo 地址：https://codepen.io/airen/full/dyrVdwJ

注意默认值差异：CSS 动画缓动函数的默认值是 `ease`，WAAPI 的默认值是 `linear`。`linear` 是恒速运动，动画看起来比较机械、不自然。因此在 WAAPI 中需要手动重置 `easing` 的值，避免动画显得乏味呆板。

### 能否在 WAAPI 中使用 JavaScript 缓动函数

easings.net 等站点定义了大量 JavaScript 版缓动函数。它们能否直接应用于 WAAPI 的 `easing`？答案是不能。以 easings.net 定义的 `bounce` 为例：

```JavaScript
const bounce = (pos) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (pos < 1 / d1) {
        return n1 * pos * pos;
    } else if (pos < 2 / d1) {
        return n1 * (pos -= 1.5 / d1) * pos + 0.75;
    } else if (pos < 2.5 / d1) {
        return n1 * (pos -= 2.25 / d1) * pos + 0.9375;
    } else {
        return n1 * (pos -= 2.625 / d1) * pos + 0.984375;
    }
};

const animEle = document.querySelector('.animated');

const keyframes = [
    {
        translate: '0% 0%'
    },
    {
        translate: '100% 0%'
    }
]

const options = {
    duration: 2000,
    easing: bounce, // ❌ 不工作
    fill: 'both',
    iterations: Infinity
}

animEle.animate(keyframes, options);
```

`easing` 只接受字符串（如 `cubic-bezier()`、`linear()` 的字符串表示），不接受函数。要让 JavaScript 缓动函数生效，需要其他方法。

理解原理有助于选择替代方案：缓动函数是一个接受输入值并产生输出值的函数，输入值通常在 `[0,1]` 范围内：

```JavaScript
const easingInput = 0.5; // 缓动函数的输入值，通常在 0 ~ 1 之间

// 缓动函数的输出值, 根据传入的输入值，缓动函数会输出一个值 
const easingOutput = easingFn(easingInput); 
```

`linear` 缓动的输出与输入相同，因为它以恒速运行：

```JavaScript
const linear = (input) => {
    const output = input;
    return output;
}
```



在 `x` 轴上绘制输入（`input`）、`y` 轴上绘制输出（`output`）即可将它可视化。`bounce` 比 `linear` 复杂得多，但原理相同：根据给定输入 `input` 产生特定输出 `output` 的函数。在 WAAPI 中有几种方式实现它的功能。

### 方式一：CustomEffect（提案阶段）

WAAPI Level 2 提议的 `CustomEffect` 允许通过 JavaScript 定义效果：

```JavaScript
const animEle = document.querySelector('.animated');

const bounce = (pos) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (pos < 1 / d1) {
        return n1 * pos * pos;
    } else if (pos < 2 / d1) {
        return n1 * (pos -= 1.5 / d1) * pos + 0.75;
    } else if (pos < 2.5 / d1) {
        return n1 * (pos -= 2.25 / d1) * pos + 0.9375;
    } else {
        return n1 * (pos -= 2.625 / d1) * pos + 0.984375;
    }
};

const animation = new Animation();

animation.effect = new CustomEffect((progress) => {
    animEle.style.transform = `translateY(${CSS.percent(200 * bounce(progress))})`
}, 2000)

animation.play();
```

`CustomEffect` 尚未得到主流浏览器支持，未来可能发生很大变化；而且它不如常规动画高效，因为始终在主线程上运行。

### 方式二：CSS 的 linear() 函数（推荐）

CSS 新增的 `linear()` 缓动函数允许以简单方式构建复杂缓动函数：它将原始曲线简化为一系列点。`bounce()` 用 `linear()` 表示如下：

```JavaScript
const bounce = `linear(
    0, 0.004, 0.016, 0.035, 0.063, 0.098, 0.141 13.6%, 0.25, 0.391, 0.563, 0.765,
    1, 0.891 40.9%, 0.848, 0.813, 0.785, 0.766, 0.754, 0.75, 0.754, 0.766, 0.785,
    0.813, 0.848, 0.891 68.2%, 1 72.7%, 0.973, 0.953, 0.941, 0.938, 0.941, 0.953,
    0.973, 1, 0.988, 0.984, 0.988, 1
  );`
```

在 WAAPI 中，可以直接将 `linear()` 字符串作为 `easing` 选项的值：

```JavaScript
const animEle = document.querySelector('.animated');

const keyframes = [
    {
        translate: '0% 0%'
    },
    {
        translate: '0% 100%'
    }
]

const bounce = `linear(
    0, 0.004, 0.016, 0.035, 0.063, 0.098, 0.141 13.6%, 0.25, 0.391, 0.563, 0.765,
    1, 0.891 40.9%, 0.848, 0.813, 0.785, 0.766, 0.754, 0.75, 0.754, 0.766, 0.785,
    0.813, 0.848, 0.891 68.2%, 1 72.7%, 0.973, 0.953, 0.941, 0.938, 0.941, 0.953,
    0.973, 1, 0.988, 0.984, 0.988, 1
  );`
  
const options = {
    duration: 2000,
    easing: bounce,
    fill: "both",
    iterations: Infinity,
    pseudoElement: '::before'
}

buttonHandler.addEventListener("click", (etv) => {
    animEle.animate(keyframes, options);
});
```



> Demo 地址：https://codepen.io/airen/full/LYazmPa

`bounce()` 函数到 `linear()` 函数的转换可借助 [@Jake Archibald](https://twitter.com/jaffathecake) 创建的[在线生成器](https://linear-easing-generator.netlify.app/)完成，它可以将 `bounce()` 或其他 JavaScript 版本的缓动函数转换为 `linear()` 函数：

> URL：https://linear-easing-generator.netlify.app/



在 WAAPI 中也可以直接在 JavaScript 里使用 [@Michelle Barker](https://michellebarker.co.uk/) 提供的转换函数，将 JavaScript 定义的缓动函数转换为 `linear()` 函数：

```JavaScript
const animEle = document.querySelector('.animated');
const buttonHandler = document.querySelector('.button');

// 来自 easings.net 的 bounce 缓动函数
const bounce =  (pos) => {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (pos < 1 / d1) {
        return n1 * pos * pos;
    } else if (pos < 2 / d1) {
        return n1 * (pos -= 1.5 / d1) * pos + 0.75;
    } else if (pos < 2.5 / d1) {
        return n1 * (pos -= 2.25 / d1) * pos + 0.9375;
    } else {
        return n1 * (pos -= 2.625 / d1) * pos + 0.984375;
    }
};

// 将 JavaScript 定义的缓动函数转换成 linear() 函数，返回的是 options 中 easing 选项所的字符串
const toLinear = (easing, points = 50) => {
    const result = [...new Array(points+1)].map((d, i) => easing( i * (1 / points)));
    return `linear(${result.join(",")})`;
};


// 创建关键帧
const keyframes = [
    {
        translate: '0% 0%'
    },
    {
        translate: '0% 100%'
    }
]

const options = {
    duration: 2000,
    easing: toLinear(bounce),
    fill: "both",
    iterations: Infinity,
    pseudoElement: '::before'
}

buttonHandler.addEventListener("click", (etv) => {
    animEle.animate(keyframes, options);
});
```



> Demo 地址：https://codepen.io/airen/full/RwdLyOK

### 方式三：注册自定义缓动函数（提案阶段）

更高级的方法是注册自定义缓动函数。[W3C CSS 工作小组提出的建议](https://github.com/w3c/csswg-drafts/issues/1012)允许 Web 开发人员注册自定义缓动函数，通过新的方法 `document.registerTimingFunction` 实现：

```JavaScript
document.registerTimingFunction('bounce', function (pos) {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (pos < 1 / d1) {
        return n1 * pos * pos;} 
    else if (pos < 2 / d1) {
        return n1 * (pos -= 1.5 / d1) * pos + 0.75;
    } else if (pos < 2.5 / d1) {
        return n1 * (pos -= 2.25 / d1) * pos + 0.9375;
    } else {
        return n1 * (pos -= 2.625 / d1) * pos + 0.984375;
    }
});
```

注册后，该缓动函数可用于 CSS 动画：

```CSS
.animated {
    animation-timing-function: bounce;
}

.transitioned {
    transition-timing-function: bounce;
}
```

也可用于 WAAPI 中 `options` 的 `easing` 选项：

```JavaScript
const options = {
    easing: bounce
}
```

这仍然只是一个提案，尚无正式规范内容，值得持续关注其进展。

## 文档中的动画

所有动画都在 `document.timeline` 中描述。通过 `getAnimations()` 可以获得站点上的所有动画，包括 WAAPI 定义的动画对象，以及任何 CSS 过渡动画和关键帧动画：

```JavaScript
// 获取文档中所有动画
const animations = document.getAnimations()

// 获取应用于 Element 元素的所有动画
const animations = element.getAnimations()
```

`getAnimations()` 可以和 `@keyframes` 一起使用：即使动画用 CSS 创作，需要通过 API 控制时，`getAnimations()` 会让事情变得容易得多。

注意 `getAnimations()` 始终返回一个数组——即使 DOM 元素只应用了一个动画。获取应用于元素上的单一动画对象的方式：

```JavaScript
const animEle = document.querySelector(".animated");

// 获取用于 animEle 元素的动画
const animation = animEle.getAnimations()[0]
```

取得动画对象后，就可以通过相关 API 控制 CSS 动画，例如：

```JavaScript
animation.playbackRate = 4;
animation.reverse()
```



> Demo 地址：https://codepen.io/airen/full/MWxEXjd

`getAnimations()` 在可访问性场景中也有实用价值。好的 Web 动画能为 Web 应用或网站锦上添花，但开发者需要为创作的动画负责：动画可能对患有前庭障碍等疾病的用户产生心理负担，甚至触发疾病。正因如此，现在很多终端设备都提供了"减少运动"（`prefers-reduced-motion`）的用户偏好设置（参见《提升可访问性动画的关键技巧》）。

`getAnimations()` 可以获取文档中的所有动画，并按需取消：

```JavaScript
if (window.matchMedia('(prefers-reduced-motion)')) {
    document.getAnimations().forEach((animation) => animation.cancel());
}
```

## 多动画

多动画有两种形式：同一个元素上应用多个动画；同一个页面上多个元素应用动画。两种形式下，CSS 中多动画的时序主要依赖持续时间和延迟时间进行编排。

### 同一元素上的多个动画

以下示例在同一个元素上应用 `rotate`、`scale` 和 `opacity` 三个关键帧动画：

```CSS
@keyframes rotate{
    from {
        rotate: 540deg;
    }
    to {
        rotate: 0deg;
    }
}

@keyframes scale {
    from {
        scale: 5;
    }
    to {
        scale: 1;
    }
}

@keyframes opacity {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.animated {
    animation: rotate .65s ease-out both, scale .65s ease-out both, opacity .65s ease-out both;
}
```



> Demo 地址：https://codepen.io/airen/full/wvOrYzX

在 WAAPI 中，可以在同一个元素上多次调用 `Element.animate()`，给元素设置多个动画：

```JavaScript
const animEle = document.querySelector('.animated');

const rotateKeyframe = [
    {rotate: '540deg'},
    {rotate: '0deg'}
]

const scaleKeyframe = [
    {scale: 5},
    {scale: 1}
]

const opacityKeyframe = [
    {opacity: 0},
    {opacity: 1}
]

const options = {
    duration: 650,
    easing: 'ease-out',
    fill: 'both'
}

const rotateEffect = animEle.animate(rotateKeyframe, options);
const scaleEffect = animEle.animate(scaleKeyframe, options);
const opacityEffect = animEle.animate(opacityKeyframe, options);
```



> Demo 地址：https://codepen.io/airen/full/wvOrYPY

两种方法虽然不同，但都可以使用 `getAnimations()` 获取应用于 `.animated` 上的 `rotate`、`scale` 和 `opacity` 三个动画，每个动画都可以暂停、播放、完成、取消，并通过时间轴或播放速率进行操作。

若希望三个动画不是同时播放、持续时间和缓动函数都有所不同，CSS 中只能利用多动画的特性为每个动画设置不同的参数（延迟时间、持续时间、缓动函数等）：

```CSS
.animated {
    animation: rotate 1s linear both, scale 1s linear .3s, opacity 1s ease-in .5s both;
}
```



> Demo 地址：https://codepen.io/airen/full/jOJaPEv

WAAPI 中同样可以通过 `delay` 和 `duration` 控制动画时间；与 CSS 不同的是，WAAPI 还可以通过 `endDelay` 和 `iterationStart` 控制动画在时间轴上的时间：

> Demo 地址：https://codepen.io/smashingmag/full/VwWWrzz

### 多个元素上的动画

第二种多动画指页面上多个元素应用动画（即使是相同的动画效果）。控制多个元素的动画，WAAPI 比 CSS 更具优势。以下示例中二十个 `div` 分别应用 `transform`、`opacity` 和 `backgroundColor` 关键帧效果，且每个动画的 `duration` 和 `delay` 都不相同：

```JavaScript
const animEles = document.querySelectorAll(".animated");

const options = {
    easing: "ease-in-out",
    iterations: Infinity,
    direction: "alternate",
    fill: "both"
};

animEles.forEach((animEle, index) => {
    const transform = [
        {
            translate: "0 0",
            scale: ".8 1"
        },
        {
            translate: "0 90vh",
            scale: "1 1"
        }
    ];

    const opacity = [{ opacity: 1 }, { opacity: 0 }];

    const bgColor = [
        { backgroundColor: "rgb(239 239 255)" },
        { backgroundColor: "#e4c349" }
    ];

    options.delay = index * 98;
  
    options.duration = 2500;
    animEle.animate(transform, options);

    options.duration = 2000;
    animEle.animate(opacity, options);

    options.duration = 3000;
    animEle.animate(bgColor, options);
});
```



> Demo 地址：https://codepen.io/airen/full/abMEOQd

此外，WAAPI Level 2 规范还提供了 `GroupEffect`（组合效果）和 `SequenceEffect`（序列效果）两个 API，用于更好地创建多动画。

### GroupEffect：组合效果

`GroupEffect` 将一个或多个 `KeyframeEffect` 组合在一起同时播放。它接受一个 `effects` 参数，可在其中传递表示多个动画的 `KeyframeEffect` 数组。定义之后，可以在默认时间轴上播放动画组。

以下示例是一个分组动画效果：第一组元素沿 `Y` 轴向上移动，第二组元素沿 `Y` 轴向下移动。以下将第一组称为"舞蹈组"，第二组称为"滑雪组"：

> Demo 地址：https://codepen.io/airen/full/gOEoapK

HTML 结构：

```HTML
<div class="container">
    <!-- 第一组，舞蹈组 -->
    <div  class="animated dance" style="--hue: .5turn">①💃</div>
    <div  class="animated dance" style="--hue: .5turn">①🕺</div>
    
    <!-- 第二组：滑雪组 -->
    <div  class="animated skiing" style="--hue: .25turn">②⛷️</div>
    <div  class="animated skiing" style="--hue: .25turn">②🏂</div>
</div>
<button class="button" id="play">Play</button>
```

首先初始化两个对象来保存动画所需的关键帧效果：

```JavaScript
const danceKeyframeEffects = [];
const skiingKeyframeEffects = [];
```

分别给"舞蹈组"和"滑雪组"定义动画效果：在关键帧中改变 `translate` 属性 `Y` 轴的值：

```JavaScript
const effects = {
    // 舞蹈组关键帧，沿 Y 轴向上移动 100%
    danceKeyframes: [
        {
            translate: "0% 0%",
            offset: 0
        },
        {
            translate: "0% -100%",
            offset: 0.7
        },
        {
            translate: "0% 0%",
            offset: 1
        }
    ],
    // 滑雪组关键帧，沿 Y 轴向下移动 100%
    skiingKeyframes: [
        {
            translate: "0% 0%",
            offset: 0
        },
        {
            translate: "0 100%",
            offset: 0.7
        },
        {
            translate: "0% 0%",
            offset: 1
        }
    ]
};
```

为两组动画设置相同的动画参数：

```JavaScript
const options = {
    duration: 1000,
    easing: "ease-in",
    fill: "both",
    iterations: 1
};
```

使用 `new KeyframeEffect()` 分别为两组中的成员创建动画，并推送到相应的数组。这是创建具有相同动画和定时功能的多个对象的方法。注意这里使用关键帧效果而不是直接调用 `Element.animate()`，因为需要更多地控制何时启动动画：

```JavaScript
const dances = document.querySelectorAll(".dance");
const skiings = document.querySelectorAll(".skiing");

dances.forEach((dance) => {
    const effect = new KeyframeEffect(dance, effects.danceKeyframes, options);
    danceKeyframeEffects.push(effect);
});

skiings.forEach((skiing) => {
    const effect = new KeyframeEffect(skiing, effects.skiingKeyframes, options);
    skiingKeyframeEffects.push(effect);
});
```

将关键帧效果数组作为 `new GroupEffect()` 的参数，创建两个组效果：

```JavaScript
const danceEffect = new GroupEffect(danceKeyframeEffects);
const anim = document.timeline.play(danceEffect);

const skiingEffect = new GroupEffect(skiingKeyframeEffects);
const anim2 = document.timeline.play(skiingEffect);
```

最后创建按钮控制动画的播放和暂停——可以为每个动画组创建独立的控制：

```JavaScript
const buttonHandler = document.getElementById("play");

buttonHandler.addEventListener("click", (etv) => {
    if (anim.playState !== "running") {
        anim.play();
    } else {
        anim.pause();
    }
    
    if (anim2.playState !== "running") {
        anim2.play();
    } else {
        anim2.pause();
    }
});
```

最终效果：页面上四个元素分为两组动画，"舞蹈组"的两个元素沿 `Y` 轴向上移动，"滑雪组"的两个元素沿 `Y` 轴向下移动：

> Demo 地址：https://codepen.io/airen/full/gOEoapK

### SequenceEffect：序列效果

`SequenceEffect` 与 `GroupEffect` 类似，允许将多个动画（由 `KeyframeEffects` 指定）分组在一起，但不是并行播放，而是一个接一个地播放。

把上面示例中的 `new GroupEffect()` 替换为 `new SequenceEffect()`，其他代码不变：

```JavaScript
const danceEffect = new SequenceEffect(danceKeyframeEffects);
const anim = document.timeline.play(danceEffect);

const skiingEffect = new SequenceEffect(skiingKeyframeEffects);
const anim2 = document.timeline.play(skiingEffect);
```



> Demo 地址：https://codepen.io/airen/full/NWJXjxw

`SequenceEffect` 解决了 CSS 以及前述动画 API 中难以解决的问题：在 CSS 中维持序列动画需要基于先前动画的持续时间维护延迟，或使用完成回调，这些方法难以维护且不够精确。

注意：`GroupEffect` 和 `SequenceEffect` 是制作多动画的更高级 API，目前使用需要 [WAAPI 的 Polyfill](https://github.com/web-animations/web-animations-js)。

以下示例直观呈现 `GroupEffect` 和 `SequenceEffect` 之间的差异：

> Demo 地址：https://codepen.io/airen/full/oNVpWZj

## 硬件加速

过去，CSS 动画通常更受青睐，因为它可以提供硬件加速，提高动画性能。现在，如果浏览器已支持 WAAPI，在 WAAPI 中也将获得同样的加速。

使用 WAAPI 时，所有动画都在 `document.timeline` 中描述，浏览器可以访问所有动画并进行优化。

外部动画库的一个问题是：浏览器有时无法识别动画库操作的元素正在进行动画，因此这些元素不会被提升到自己的层级或在 GPU 上呈现。使用 WAAPI 则是明确告诉浏览器：该元素正在通过浏览器提供的 API 进行动画，浏览器可以使用其可用的方式对其进行优化。

## WAAPI 与 CSS 集成

WAAPI 并非用来替代 CSS 动画或现有技术，而是与之紧密集成。开发者可以自由选择适合用例和偏好的任何技术。

WAAPI 规范不仅定义了一个 API，还为 Web 上的动画提供一个共享模型——处理动画的其他规范都使用相同的模型和术语。最好将 WAAPI 视为 Web 上动画的基础，而 WAAPI API、CSS 过渡动画（`transition`）和关键帧动画（`animation`）都是共享基础之上的层。

这意味着创建一个出色的 WAAPI 动画引擎，需要为 CSS Animations、CSS Transitions 和 WAAPI 建立全新且共享的动画引擎：即使不使用 WAAPI、只编写 CSS Animations 和 CSS Transitions，也会在新的 WAAPI 引擎中运行。无论选择哪种技术，所有动画都将同步运行和更新，由 CSS 发起的动画和 WAAPI 分派的事件将一起传递。

对开发者而言更重要的是：整个 WAAPI 都可以用于查询或控制由 CSS 创建的动画——使用 `Document.getAnimations()` 和 `Element.getAnimations()` 可以获取纯 CSS 中的动画，再用 WAAPI 控制它们。

目前的局限：SVG Animations 仍然与 WAAPI 模型不同，WAAPI 与 SVG 之间没有集成，这仍是 Web 平台改进的一个方向。

## 小结

WAAPI 在 Web 动画领域有着重要地位：它建立了在所有浏览器中描述动画的基础，提供了播放控制、CSS 硬件加速、访问文档中所有动画等新能力，并允许将更复杂的动画行为放在 JavaScript 中，使 CSS 动画保持简单。

Web 上实现动画的方式很多，WAAPI 并不是解决所有动画问题的方法。对于常见问题，纯 CSS 往往已有出色的解决方案，建议优先尝试在纯 CSS 中执行动画——深入掌握 CSS 本身收益很大，并非所有场景都需要 JavaScript。

当动画变得更复杂、需要更好地控制原生动画时，WAAPI 是合适的工具；当需要创建动态值或处理 DOM 事件以增强交互性时，JavaScript 能提供很大的灵活性。
