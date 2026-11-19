---
title: 掌握 Web Animations API 的精髓
description: "Web Animations API(WAAPI)将 CSS 动画的单一触发点升级为对动画播放的完全控制:通过 Animation 接口管理播放状态,通过 KeyframeEffect 接口定义关键帧效果,配合时间轴、offset、delay/endDelay 等参数,可以以编程方式创建、编排和精细控制 Web 动画。"
keywords: [掌握, Web, Animations, API, 的精髓]
category: CSS
tags: [CSS, 布局, 动画, 响应式]
---

# 掌握 Web Animations API 的精髓

## 概念说明

CSS 过渡(`transition`)和动画(`animation`)为定义动画效果提供了强大的方式,但它们都是通过触发相应的 CSS 属性变化来启动,只有一个单一的启动点。典型场景是购物网站的商品图片:鼠标悬浮时产生微妙的动画效果以吸引注意。鼠标悬浮就是 CSS 动画的单一启动点,只有在用户与页面交互时动画才会触发——CSS 动画好比一个开关,要么打开,要么关闭。虽然可以利用持续时间、延迟时间、缓动函数(如 `cubic-bezier()`、`linear()`、`steps()`)以及动画编排技巧创建相当复杂的效果,但处理的元素越多,创作过程越难保证精度,容易使动画"跑调"。

WAAPI(Web Animations API)在这方面强大得多:它将单一的启动点转变为对播放的完全控制——开关变成了带滑块的调光开关。除了控制动画播放之外,还可以在动画运行时定义和更改动画效果,根据上下文调整动画,甚至实现一个具有实时预览动画的编辑器。

WAAPI 的能力来自它提供的 [API 接口](https://www.w3.org/TR/web-animations-1/#programming-interface):

> API：https://www.w3.org/TR/web-animations-1/#programming-interface

- `Animation 接口`:用于表示一个动画,包含动画的各种属性和控制方法。通过创建 `Animation` 实例,可以定义动画的持续时间、缓动函数等属性
- `KeyframeEffect 接口`:用于定义动画的关键帧效果,包含动画的起始状态、中间状态和结束状态
- `AnimationEffect 接口`:代表动画的效果,可以是 CSS 样式、变换或其他类型的动画效果
- `AnimationTimeline 接口`:用于获取和控制动画的时间轴,可获取当前时间、暂停和恢复动画等
- `DocumentTimeline 接口`:提供文档级别的时间轴,可用来获取全局的动画信息

这些接口共同提供了一套强大的工具,使 Web 开发者能够更灵活地创建和控制 Web 动画,实现更复杂、流畅的动画效果。

## 核心要点

- CSS 动画只有单一启动点;WAAPI 提供播放、暂停、反向、变速、跳转等完全播放控制。
- `Animation` 接口负责管理动画的状态和行为,类似播放器;`KeyframeEffect` 接口负责定义动画效果,类似内容载体。
- `Element.animate(keyframes, options)` 是创建动画的快捷方式,等效于创建 `KeyframeEffect` + 创建 `Animation` + 调用 `play()` 三步。
- 关键帧可用数组形式(每帧一个对象)或对象形式(属性值为数组)定义;未指定 `offset` 时各帧自动均分持续时间。
- WAAPI 关键帧不能像 CSS `@keyframes` 那样合并应用相同样式规则的选择器,必须按 `offset` 递增逐帧列出;`offset` 取值必须在 `0.0 ~ 1.0` 之间,否则抛出 `TypeError`。
- 动画总体持续时间按公式 `delay + (iterations × duration) + endDelay` 计算,与单次迭代持续时间是两个概念。
- `pseudoElement` 配置项可将 WAAPI 动画应用于元素的伪元素(`::before`、`::after`)。
- 控制多个动画时,可将多个 `Animation` 实例收集到数组,通过统一的 `createPlayer()` 包装函数批量播放、暂停、取消与跳转。

## Animation 接口

`Animation` 接口主要用于表示和控制动画,提供一系列方法和属性,允许 Web 开发者对动画进行播放、暂停、取消等操作,并获得动画的状态和属性。

### 构造函数

`Animation` 接口有一个 `new Animation()` 构造函数:

```JavaScript
const animation = new Animation(effect, timeline);
```

- `effect`:可选参数,表示动画的效果,通常是 `KeyframeEffect` 对象,由 `new KeyframeEffect()` 创建
- `timeline`:可选参数,表示动画的时间轴

### 属性

Animation 接口的属性可用于获取动画相关信息或设置动画:

- `animation.effect`:获取或设置动画的效果
- `animation.timeline`:获取或设置动画的时间轴
- `animation.startTime`:获取或设置动画的开始时间
- `animation.currentTime`:获取或设置动画的当前时间
- `animation.playbackRate`:获取或设置动画的播放速率
- `animation.playState`:获取动画的播放状态
- `animation.replaceState`:获取动画的替换状态
- `animation.pending`:检查动画是否处于等待执行的状态
- `animation.onfinish`:事件处理程序,动画播放结束时调用
- `animation.oncancel`:事件处理程序,动画被取消时调用
- `animation.onremove`:事件处理程序,动画被移除时调用
- `animation.ready`:返回一个 Promise,可等待更改项生效(如在播放或暂停等播放控制方法之间切换)
- `animation.finished`:返回一个 Promise,提供在动画播放完毕后执行自定义 JavaScript 代码的方法

**effect 属性**

在 WAAPI 中,`effect` 是 `Animation` 接口的属性,类型为 `AnimationEffect`,可为空:

```JavaScript
const animation = new Animation(element, keyframes, options);

// 获取 effect 属性
const animationEffect = animation.effect;
```

`effect` 属性表示动画的关联效果,通常由 `KeyframeEffect` 对象定义。设置 `effect` 属性的过程:

```JavaScript
const newEffect = new KeyframeEffect(newElement, newKeyframes, newOptions);

animation.effect = newEffect;
```

这会更新动画的关联效果,并用新的 `KeyframeEffect` 对象定义动画效果。`effect` 属性可为空:将其设置为 `null` 可以清除之前定义的效果。

**timeline、startTime 与 currentTime**

`timeline`、`startTime` 和 `currentTime` 都是 `Animation` 接口的属性,主要与动画时间相关联。

`timeline` 属性表示动画所关联的时间轴,时间轴用于管理动画的时序:

```JavaScript
// 获取动画的时间轴
const animationTimeline = animation.timeline;
```

设置新的时间轴:

```JavaScript
const newTimeline = new AnimationTimeline();

// 设置动画的时间轴
animation.timeline = newTimeline;
```

该属性允许在运行时获取和设置动画的时间轴,从而影响动画的整体时间控制。需要将动画与特定时间轴关联、或改变动画时间轴时,可以使用它。

`startTime` 属性表示动画的开始时间,用于控制动画何时开始播放:

```JavaScript
// 获取动画开始时间
const startTime = animation.startTime;
```

设置新的开始时间:

```JavaScript
// 设置动画的开始时间
animation.startTime = 1000; // 设置开始时间为 1000 毫秒
```

`startTime` 为 `null` 时,动画会在当前时间(按时间轴的时间)立即开始;设置了具体时间值时,动画将在指定时间开始播放。该属性可用于实现延迟播放、同步多个动画或在特定时刻启动动画。例如让动画在页面加载后延迟 `1s` 开始播放:

```JavaScript
animation.startTime = 1000; // 设置延迟 1000 毫秒
```

注意:`startTime` 是相对于动画关联时间轴(`animation.timeline`)的时间值,更改时间轴后 `startTime` 也会受影响。

`currentTime` 表示动画的当前时间,允许获取或设置动画当前所处的时间点:

```JavaScript
// 获取动画的当前时间
var currentTime = animation.currentTime;

// 设置新的当前时间
animation.currentTime = 500; // 设置当前时间为 500 毫秒
```

读取 `currentTime` 可获取动画当前所处的时间;设置 `currentTime` 可调整动画的播放位置。该属性对实现高级控制很有用,例如实现暂停和恢复效果:

```JavaScript
// 暂停动画
animation.currentTime = animation.currentTime;

// 恢复动画
animation.currentTime = 0;
animation.play();
```

也可以通过设置 `currentTime` 将播放位置直接跳跃到特定时间点:

```JavaScript
animation.currentTime = 1000; // 跳跃到 1000 毫秒的时间点
```

注意:`currentTime` 同样是相对于动画关联时间轴的时间值。

**playbackRate 属性**

`playbackRate` 表示动画的播放速率:

```JavaScript
// 获取动画的播放速率
const playbackRate = animation.playbackRate;

// 设置新的播放速率
animation.playbackRate = 2.0; // 设置播放速率为 2.0
```

播放速率决定动画在时间轴上前进的速度,默认值为 `1.0`(正常速度)。设置为 `2.0` 表示两倍速快进,`0.5` 表示半速播放:

```JavaScript
animation.playbackRate = 2.0; // 加速动画

// 或
animation.playbackRate = 0.5; // 减缓动画
```

该属性可用于实现速度控制、慢动作或快进效果。`playbackRate` 是倍数值,可为正数、负数或零;负数表示反向播放(类似于 `animation.reverse()`)。

**playState 属性**

动画有开始、暂停、结束等播放状态,与 DVD 播放类似。WAAPI 使用 `playState` 表示动画的播放状态,返回一个字符串:

- `"idle"`: 动画未开始播放,或已经完成并返回到起始状态
- `"pending"`: 动画正在等待开始播放
- `"running"`: 动画正在播放中
- `"paused"`: 动画已被暂停
- `"finished"`: 动画已经完成播放

获取动画播放状态的方式:

```JavaSript
const animation = new Animation(element, keyframes, options);

console.log(animation.playState); // 输出 "idle"

animation.play(); // 播放动画
console.log(animation.playState); // 输出 "running"
```

根据不同状态执行相应逻辑,可用于监测动画状态,在适当的时机执行其他操作,例如动画完成时触发回调函数。

**pending 属性**

`pending` 是 `Animation` 接口的只读属性,类型为布尔值(`boolean`),指示动画是否有待处理的播放任务或暂停任务。返回 `true` 表示有等待执行的任务(可能是播放或暂停);返回 `false` 表示当前没有待处理的任务:

```JavaScript
if (!animation.pending) {// 执行新的动画任务
  animation.play();
}
```

该属性用于检查动画当前状态,确定是否有任务需要在启动新操作之前完成。注意它是只读的,仅用于查询状态,不能手动触发或取消任务。

**ready 属性**

`ready` 是只读属性,类型为 `Promise<Animation>`,表示当前动画对象的准备状态。可用 `async/await` 或 `then` 方法等待动画准备好后执行相应操作:

```JavaScript
async function executeAnimation() {
    await animation.ready;// 在这里执行动画相关的操作
    animation.play();
}

// 或者使用 then 方法
animation.ready.then(() => {
    // 在这里执行动画相关的操作
    animation.play();
});
```

`animation.ready` 返回的 Promise 会在动画准备就绪时被解析,帮助在确保动画准备好执行时采取相应步骤。

**finished 属性**

`finished` 与 `ready` 类似,返回一个 Promise 对象,表示当前动画对象的完成状态(动画已执行完毕、达到最终状态):

```JavaScript
async function executeAfterAnimation() {
    await animation.finished;// 在这里执行动画完成后的操作
    console.log("Animation has finished!");
}

// 或者使用 then 方法
animation.finished.then(() => {
    // 在这里执行动画完成后的操作
    console.log("Animation has finished!");
});
```

**事件处理程序**

WAAPI 还有 `onfinish`、`oncancel` 和 `onremove` 等事件处理程序(`EventHandler`):

- `onfinish` 指定动画完成时的事件处理程序,动画完成时调用
- `oncancel` 指定动画取消时的事件处理程序,动画被取消时调用
- `onremove` 指定动画被移除时的事件处理程序,动画被移除时调用

```JavaScript
// 指定动画完成时的事件处理程序
animation.onfinish = function(event) {
    // 在这里执行动画完成时的操作
    console.log("Animation has finished!");
};

animation.oncancel = function(event) {
    // 在这里执行动画取消时的操作
    console.log("Animation has been canceled!");
};

animation.onremove = function(event) {
    // 在这里执行动画被移除时的操作
    console.log("Animation has been removed!");
};

// 或者
animation.addEventListener('finish', etv => {
    // 在这里执行动画完成时的操作
    console.log("Animation has finished!");
})

animation.addEventListener('cancel', etv => {
    // 在这里执行动画取消时的操作
    console.log("Animation has canceled!");
})

animation.addEventListener('remove', etv => {
    // 在这里执行动画被移除时的操作
    console.log("Animation has removed!");
})
```

将 `onfinish`、`oncancel` 和 `onremove` 设置为 `null` 可以删除现有的事件处理程序,便于在动画完成、取消或移除时执行界面清理等自定义操作。触发条件需要注意:

- `onfinish` 仅在动画自然完成时触发,不包括中途取消或替换而中断的情况
- `oncancel` 仅在动画被取消时触发,不包括动画自然完成的情况
- `onremove` 仅在动画被显式移除时触发,不包括自然完成或被取消的情况

### 方法

WAAPI 的 `Animation` 接口还提供了一些方法,用于控制动画:

- `animation.play()`: 启动或恢复动画的播放
- `animation.pause()`: 暂停动画的播放
- `animation.reverse()`: 反转动画的方向
- `animation.finish()`: 立即完成动画
- `animation.cancel()`: 取消动画
- `animation.updatePlaybackRate(playbackRate)`: 更新动画的播放速率
- `animation.commitStyles()`: 会根据底层样式更新元素的样式,以及元素上的所有动画(按合成顺序)
- `animation.persist()`: 用于将动画标记为不可替换

这些方法可以类比为播放器的播放、暂停、快进、倒带等物理按键。

**play() 方法**

调用 `play()` 方法会开始或恢复动画的播放:

```JavaScript
animation.play();
```

动画按其正常的播放进度逐帧更新,直到达到结束位置。动画处于暂停状态时,调用 `play()` 使其继续播放;动画已经结束时,调用 `play()` 将重新开始播放。注意:`play()` 方法将动画的自动倒带标志设置为 `true`,动画达到结束位置后将自动回到初始状态;不希望自动倒带时,可使用 `currentTime` 属性手动控制播放位置。

**pause() 方法**

`pause()` 方法用于暂停动画的播放:

```JavaScript
animation.pause();
```

动画停在当前位置,不再更新帧。动画播放期间调用 `pause()`,动画暂停在当前位置;动画已经结束时调用 `pause()` 不产生任何效果。暂停后重新开始动画可使用 `play()`;需要将动画恢复到初始状态可使用 `cancel()`。

**reverse() 方法**

`reverse()` 方法会反转动画的播放速率并播放:

```JavaScript
animation.reverse();
```

动画当前正向播放时,反转播放方向;当前反向播放时,反转为正向播放。反转播放会影响动画的当前状态;希望在动画完成后反转播放,可在 `onfinish` 事件处理程序中调用 `reverse()`:

```JavaScript
animation.onfinish = function() {
    // 在动画完成后反转播放
    animation.reverse();
};
```

动画已经反向播放并且完成时,再次调用 `reverse()` 会重新开始正向播放。

**updatePlaybackRate() 方法**

`updatePlaybackRate(playbackRate)` 方法用于异步更新动画的播放速率,传入的 `playbackRate` 参数成为动画的新播放速率。该过程异步执行,不会立即影响动画的当前状态:

```JavaScript
animation.updatePlaybackRate(2.0);
```

适用于在运行时动态更改动画播放速率的场景。

**cancel() 方法**

`cancel()` 方法用于取消动画,清除由该动画引起的所有效果,并通过运行取消动画的过程中止其播放:

```JavaScript
animation.cancel();
```

调用 `cancel()` 会立即中止动画播放并清除该动画引起的所有效果,包括将动画回退到初始状态。该方法在动画播放期间或结束之前调用以中止其执行。希望在动画播放完成后执行操作,应使用 `onfinish` 事件处理程序而不是直接调用 `cancel()`。取消动画会触发 `oncancel` 事件处理程序(如果已设置),可在事件处理程序中执行相应操作。

**finish() 方法**

调用 `finish()` 方法会将动画立即定位到关联效果的结束位置,即动画的最终状态,相当于立即完成动画,不等待其正常播放结束:

```JavaScript
animation.finish();
```

适用于希望立即将动画移动到最终状态的场景。注意:调用 `finish()` 可能会触发 `onfinish` 事件处理程序,具体取决于动画的状态和设置。

**persist() 方法**

调用 `persist()` 方法会将动画的替代状态设置为 `persisted`:

```JavaScript
animation.persist();
```

替代状态指示动画是否应该被保留在其替代容器中。通常情况下,动画会在完成或被取消后自动从替代容器中移除;通过调用 `persist()` 可以防止动画在这些情况下被自动移除。

**commitStyles() 方法**

调用 `commitStyles()` 方法会将动画效果的当前效果值写入其对应效果目标的内联样式中,确保在动画执行过程中目标元素的外观与动画效果保持同步:

```JavaScript
animation.commitStyles();
```

适用于希望立即应用动画效果到目标元素外观的场景。注意:`commitStyles()` 立即把当前动画效果值应用到目标元素的内联样式;动画中途被取消时,元素会保留动画结束时的状态而非回退到开始状态,需要回退时应使用 `cancel()` 方法。

### Animation 与 KeyframeEffect 的关系

`Animation` 接口提供的属性和方法使开发者可以灵活控制和监控动画行为,但它只负责管理动画的状态和行为。可以把 `Animation` 接口类比为一台 DVD 播放机:它有一个插槽用于放置光盘(`KeyframeEffect`);没有光盘时,只能操作机器的物理按键(播放、暂停、快进、倒带等),无法听到音乐。

也就是说,`Animation` 接口实例就是播放器,它包含定义的动画并提供控制播放的方式——`play()`、`pause()` 等方法以及 `currentTime` 属性。有了这三个控制,在播放方面可以构建任何东西。但要真正播放内容,还需要光盘,即 WAAPI 中的 `KeyframeEffect` 接口。

## KeyframeEffect 接口

`KeyframeEffect` 接口是"播放器"需要的"光盘":它包含要应用动画效果的元素、描述动画的关键状态和对应的样式,以及动画的各种设置。现实中的 DVD 光盘存储音视频数据,在 WAAPI 中对应的就是 `KeyframeEffect` 接口。

它提供一个 `new KeyframeEffect()` 构造函数,通过指定目标元素、关键帧和选项来创建一个关键帧动画效果:

```JavaScript
new KeyframeEffect(target, keyframes, options);
```

- `target`:目标元素,即要应用动画效果的元素
- `keyframes`:关键帧,描述动画的关键状态和对应的样式
- `options`:选项,包含动画的各种设置,如持续时间、缓动函数等

`target` 相当于 CSS 动画中的动画元素(如 `.animated`),`keyframes` 相当于 CSS 动画中的 `@keyframes`,`options` 相当于 CSS 中的 `animation-*` 属性(除 `animation-name`)。假设在 CSS 中给 `.animated` 元素应用了一个 `fadeIn` 动画:

```HTML
<div class="animated"></div>
```

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
    animation: fadeIn 1s ease-in both;
    
    /* 等同于 */
    animation-name: fadeIn;
    animation-duration: 1s;
    animation-fill-mode: both;
    animation-timing-function: ease-in;
    animation-iteration-count: 1;
}
```

在 WAAPI 中,则像下面这样创建 `KeyframeEffect`:

```HTML
<div class="animated"></div>
```

```JavaScript
const target = document.querySelector('.animated');

const keyframes = [
    {opacity: 0}, // 相当于 @keyframes 中的 from
    {opacity: 1}  // 相当于 @keyframes 中的 to
]

const options = {
    duration: 1000,     // 相当于 animation-duration: 1s;
    fill: 'both',       // 相当于 animation-fill-mode: both;
    easing: 'ease-in',  // 相当于 animation-timing-function: ease-in;
    iterations: 1       // 相当于 animation-iteration-count: 1;
}

// 创建 KeyframeEffect 对象
const animationEffect = new KeyframeEffect(target, keyframes, options)
```

上面的代码使用 `new KeyframeEffect()` 构造函数创建了 `KeyframeEffect` 对象,将 `keyframes` 应用于 `target` 元素。动画效果是最简单的淡入:`opacity` 从 `0` 过渡到 `1`;选项设置了持续时间 `1s`、填充模式 `both`、缓动函数 `ease-in`,动画播放 `1` 次。

### options 参数

`options` 中可配置一个或多个参数。下面这些参数与 CSS 的 `animation-*` 属性作用相同,用于设置动画的运行参数:

- `delay`:动画开始之前的延迟时间,以 `ms` 为单位,默认值为 `0`。例如 `delay: 200` 表示动画延迟 `200ms` 再开始播放。类似于 CSS 的 animation-delay 属性
- `endDelay`:动画结束后的延迟时间,以 `ms` 为单位,默认值为 `0`,主要用于基于另一个动画的结束时间对动画进行排序
- `duration`:每次迭代动画完成所需的时间,以 `ms` 为单位,默认值为 `0`。它是可选值,但因为默认值是 `0`,不显式设置 `duration` 时动画不会运行。类似于 CSS 的 animation-duration 属性
- `direction`:动画运行的方向,可设置的值有 `normal`(正常)、`reverse`(反向)、`alternate`(交替)或 `alternate-reverse`(反向交替),默认值为 `normal`。值类型是字符串,例如 `direction: 'reverse'`。类似于 CSS 的 animation-direction 属性
- `easing`:设置动画的缓动曲线,即动画随时间变化的速率,接受一个 `<easing-function>`,可使用内置值如 `linear`(默认值)、`ease`、`ease-in`、`ease-out`、`ease-in-out`、`step-end` 和 `step-start`,也可应用 `steps()`、`cubic-bezier()` 或 `linear()` 函数定制的缓动曲线。值类型是字符串,例如 `easing: 'ease'`。注意:在 `easing` 中不能直接使用 JavaScript 定义的缓动曲线。类似于 CSS 的 animation-timing-function 属性
- `fill`:设置动画结束时的填充模式,可选值有 `none`(默认值)、`backwards`、`forwards` 和 `both`,值也是字符串类型,例如 `fill: 'both'`。类似于 CSS 的 animation-fill-mode 属性
- `iterations`:动画循环播放的次数,默认值为 `1`,可设置为 `Infinity` 使动画无限循环播放。类似于 CSS 的 `animation-iteration-count` 属性
- `iterationStart`:描述动画应该从迭代的哪一点开始。例如 `0.5` 表示从第一次迭代的中间开始;设置后,具有两次迭代的动画会在第三次迭代的中间结束。默认值为 `0.0`
- `composite`:决定在这个动画和其他不指定自己特定合成操作的独立动画之间如何合并值。默认为 `replace`,表示使用新值覆盖先前的值;`add` 指定一种附加效果,每个后续迭代都建立在上一次迭代的基础上,例如在 `transform` 中,`translateX(-200px)` 不会覆盖早期的 `rotate(20deg)` 值,而会产生 `translateX(-200px) rotate(20deg)`;`accumulate` 与 `add` 类似但更聪明,例如 `filter` 的 `blur(2)` 和 `blur(5)` 会变成 `blur(7)`,而不是 `blur(2) blur(5)`。类似于 CSS 的 animation-composition 属性
- `iterationComposite`:决定在这个动画的迭代之间如何构建值,可设置为 `accumulate` 或 `replace`,默认为 `replace`
- `pseudoElement`:包含伪元素选择器的字符串,例如 `"::before"`。如果存在,则效果应用于目标的所选伪元素,而不是目标本身

### keyframes 参数

`keyframes` 与 CSS 的 `@keyframes` 非常相似,用于描述动画的关键状态和对应的样式,但定义方式更多样,比 `@keyframes` 略复杂。

**两种关键帧形式**

以最简单的 `fadeIn` 动画为例。CSS 的 `@keyframes` 定义:

```CSS
@keyframes fadeIn{
    from { /* from 选择器也可以换成 0% */
        opacity: 0;
    }
    to {  /* to 选择器也可以换成 100% */
        opacity: 1;
    }
}
```

在 WAAPI 中,可以将 `fadeIn` 的每一帧视为一个对象(相比 CSS 的 `@keyframes` 少了百分比选择器),然后把这些对象放到一个数组中:

```JavaScript
const fadeInKeyframes = [
    { opacity: 0 }, // 相当于 0% 或 from
    { opacity: 1 }  // 相当于 100% 或 to
]
```

也可以以对象的形式定义 `keyframes`:

```JavaScript
const fadeInKeyframes = {
    opacity: [0, 1] // 将每一帧中 opacity 属性的值放到一个数组中
}
```

每帧有多个属性时,例如 `rotateIn` 动画的每一帧都有 `transform` 和 `opacity` 属性:

```CSS
@keyframes rotateIn {
    from {
        transform: rotate3d(0, 0, 1, -200deg);
        opacity: 0;
    }

    to {
        transform: translate3d(0, 0, 0);
        opacity: 1;
    }
}
```

在 WAAPI 中,两种形式都可以定义:

```JavaScript
// 数组形式
const rotateInKeyframes = [
    {
        transform: 'rotate3d(0, 0, 1, -200deg)',
        opacity: 0
    },
    {
        transform: 'translate3d(0, 0, 0)',
        opacity: 1
    }
]

// 对象形式
const rotateInKeyframes = {
    transform: ['rotate3d(0, 0, 1, -200deg)', 'translate3d(0, 0, 0)'],
    opacity: [0, 1]
}
```

**属性数量不等的帧**

上面示例中每一帧应用的属性数量相等,但很多时候关键帧的每一帧属性数量并不同。例如 `rollOut` 动画,最后一帧比第一帧多了一个 `transform` 属性:

```CSS
@keyframes rollOut {
    from {
        opacity: 1;
    }

    to {
        opacity: 0;
        transform: translate3d(100%, 0, 0) rotate3d(0, 0, 1, 120deg);
    }
}
```

在 WAAPI 中的定义:

```JavaScript
// 数组的形式
const rollOutKeyframes = [
    {
        opacity: 1
    },
    {
        opacity: 0,
        transform: 'translate3d(100%, 0, 0) rotate3d(0, 0, 1, 120deg)'
    }
]

// 对象的形式
const rollOutKeyframes = {
    opacity: [1, 0],
    transform: ['translate3d(100%, 0, 0) rotate3d(0, 0, 1, 120deg)']
}
```

无论哪种方式,只需关注每一帧有哪些属性及属性值,不需要每一帧的属性名和数量相同。

**多百分比关键帧与 offset**

前面的案例都只有第一帧(`from` 或 `0%`)和最后一帧(`to` 或 `100%`)。很多关键帧动画会有很多百分比选择器设置的关键帧,例如 `shake` 动画:

```CSS
@keyframes shake {
    from,to {
        transform: translate3d(0, 0, 0);
    }

    10%,30%,50%,70%,90% {
        transform: translate3d(-10px, 0, 0);
    }

    20%,40%,60%,80% {
        transform: translate3d(10px, 0, 0);
    }
}
```

这个关键帧分为 `0%`(或 `from`)、`10%`、`20%`、`30%`、`40%`、`50%`、`60%`、`70%`、`80%`、`90%` 和 `100%`(或 `to`)共 `11` 帧,均分了动画单次迭代所需的持续时间。它的特征:

- 关键帧的 `0%` 和 `100%` 应用了同一个样式规则 `transform: translate3d(0, 0, 0)`
- 关键帧的 `10%`、`30%`、`50%`、`70%` 和 `90%` 应用了同一个样式规则 `transform: translate3d(-10px, 0, 0)`
- 关键帧的 `20%`、`40%`、`60%` 和 `80%` 应用了同一个样式规则 `transform: translate3d(10px, 0, 0)`

```CSS
@keyframes shake {
    from,to {
        transform: translate3d(0, 0, 0);
    }

    10%,30%,50%,70%,90% {
        transform: translate3d(-10px, 0, 0);
    }

    20%,40%,60%,80% {
        transform: translate3d(10px, 0, 0);
    }
}

/* 等同于 */
@keyframes shake {
    0% {
        transform: translate3d(0, 0, 0);
    }
    
    10% {
        transform: translate3d(-10px, 0, 0);
    }
    
    20% {
        transform: translate3d(10px, 0, 0);
    }
    
    30% {
        transform: translate3d(-10px, 0, 0);
    }
    
    40% {
        transform: translate3d(10px, 0, 0);
    }
    
    50% {
        transform: translate3d(-10px, 0, 0);
    }

    60% {
        transform: translate3d(10px, 0, 0);
    }
        
    70%{
        transform: translate3d(-10px, 0, 0);
    }
    
    80% {
        transform: translate3d(10px, 0, 0);
    }
    
    90% {
        transform: translate3d(-10px, 0, 0);
    }
    
    100% {
        transform: translate3d(0, 0, 0);
    }
}
```

在 WAAPI 中定义时,不能像 `@keyframes` 那样将应用相同样式规则的关键帧组合在一起(类似 CSS 的组合选择器),要在对象或数组中列出动画所需的所有关键帧:

```JavaScript
// 数组形式
const shakeKeyframes = [
    { transform: 'translate3d(0, 0, 0)' },     // 相当于 0%
    { transform: 'translate3d(-10px, 0, 0)' }, // 相当于 10%
    { transform: 'translate3d(10px, 0, 0)' },  // 相当于 20%
    { transform: 'translate3d(-10px, 0, 0)' }, // 相当于 30%
    { transform: 'translate3d(10px, 0, 0)' },  // 相当于 40%
    { transform: 'translate3d(-10px, 0, 0)' }, // 相当于 50%
    { transform: 'translate3d(10px, 0, 0)' },  // 相当于 60%
    { transform: 'translate3d(-10px, 0, 0)' }, // 相当于 70%
    { transform: 'translate3d(10px, 0, 0)' },  // 相当于 80%
    { transform: 'translate3d(-10px, 0, 0)' }, // 相当于 90%
    { transform: 'translate3d(0, 0, 0)' }      // 相当于 100%
]

// 对象的形式
const shakeKeyframes = {
    transform: [
        'translate3d(0, 0, 0)',      // 相当于 0%
        'translate3d(-10px, 0, 0)',  // 相当于 10%
        'translate3d(10px, 0, 0)',   // 相当于 20%
        'translate3d(-10px, 0, 0)',  // 相当于 30%
        'translate3d(10px, 0, 0)',   // 相当于 40%
        'translate3d(-10px, 0, 0)',  // 相当于 50%
        'translate3d(10px, 0, 0)',   // 相当于 70%
        'translate3d(-10px, 0, 0)',  // 相当于 80%
        'translate3d(10px, 0, 0)',   // 相当于 90%
        'translate3d(0, 0, 0)'       // 相当于 100%
    ]
}
```

那么 WAAPI 能否也像 CSS 那样合并应用相同样式规则的关键帧?

```CSS
@keyframes shake {
    from,to {
        transform: translate3d(0, 0, 0);
    }

    10%,30%,50%,70%,90% {
        transform: translate3d(-10px, 0, 0);
    }

    20%,40%,60%,80% {
        transform: translate3d(10px, 0, 0);
    }
}
```

即上面的 `@keyframes` 是不是可以在 WAAPI 中像下面这样定义:

```JavaScript
// 数组形式
const shakeKeyframes = [
    { transform: 'translate3d(0, 0, 0)' },
    { transform: 'translate3d(-10px, 0, 0)' },
    { transform: 'translate3d(10px, 0, 0)' }
]

// 对象形式 
const shakeKeyframes = {
    transform: [
        'translate3d(0, 0, 0)',
        'translate3d(-10px, 0, 0)',
        'translate3d(10px, 0, 0)'
    ]
}
```

不可以,这样定义将是两个完全不同的关键帧效果:

```JavaScript
const shakeKeyframes1 = [
    { transform: 'translate3d(0, 0, 0)' },     // 相当于 0%
    { transform: 'translate3d(-10px, 0, 0)' }, // 相当于 10%
    { transform: 'translate3d(10px, 0, 0)' },  // 相当于 20%
    { transform: 'translate3d(-10px, 0, 0)' }, // 相当于 30%
    { transform: 'translate3d(10px, 0, 0)' },  // 相当于 40%
    { transform: 'translate3d(-10px, 0, 0)' }, // 相当于 50%
    { transform: 'translate3d(10px, 0, 0)' },  // 相当于 60%
    { transform: 'translate3d(-10px, 0, 0)' }, // 相当于 70%
    { transform: 'translate3d(10px, 0, 0)' },  // 相当于 80%
    { transform: 'translate3d(-10px, 0, 0)' }, // 相当于 90%
    { transform: 'translate3d(0, 0, 0)' }      // 相当于 100%
]

const shakeKeyframes2 = [
    { transform: 'translate3d(0, 0, 0)' },
    { transform: 'translate3d(-10px, 0, 0)' },
    { transform: 'translate3d(10px, 0, 0)' }
]
```

`shakeKeyframes1` 和 `shakeKeyframes2` 是完全不同的两个关键帧效果:

> Demo 地址：https://codepen.io/airen/full/QWovOmQ

原因在于:WAAPI 中如果没有给每个关键帧指定偏移值,将会均分动画单次迭代的持续时间。`shakeKeyframes2` 相当于只在动画单次迭代持续时间的 `0%`、`50%` 和 `100%` 位置处创建了关键帧:

```CSS
@keyframes shakeKeyframes2 {
    0% {
        transform: translate3d(0, 0, 0);
    }
    50% {
        transform: translate3d(-10px, 0, 0);
    }
    100% {
        transform: translate3d(10px, 0, 0);
    }
}
```

需要给关键帧指定偏移量时,使用 `offset`:

```JavaScript
// 数组形式
const shakeKeyframes = [
    { 
        transform: 'translate3d(0, 0, 0)',
        offset: 0      // 相当于 0%
    },     
    { 
        transform: 'translate3d(-10px, 0, 0)',
        offset: 0.1    // 相当于 10%                       
    },
    { 
        transform: 'translate3d(10px, 0, 0)',
        offset: 0.2   // 相当于 20% 
    },  
    { 
        transform: 'translate3d(-10px, 0, 0)',
        offset: .3    // 相当于 30%
    }, 
    { 
        transform: 'translate3d(10px, 0, 0)', 
        offset: .4   // 相当于 40%
    },  
    { 
        transform: 'translate3d(-10px, 0, 0)',
        offset: .5   // 相当于 50%
    }, 
    { 
        transform: 'translate3d(10px, 0, 0)', 
        offset: .6   // 相当于 60%
    },  
    { 
        transform: 'translate3d(-10px, 0, 0)',
        offset: .7   // 相当于 70%
    }, 
    { 
        transform: 'translate3d(10px, 0, 0)', 
        offset: 0.8  // 相当于 80%
    },  
    { 
        transform: 'translate3d(-10px, 0, 0)', 
        offset: .9   // 相当于 90%
    }, 
    { 
        transform: 'translate3d(0, 0, 0)',
        offset: 1    // 相当于 100%
    }      
]

// 对象的形式
const shakeKeyframes = {
    transform: [
        'translate3d(0, 0, 0)',      // 相当于 0%
        'translate3d(-10px, 0, 0)',  // 相当于 10%
        'translate3d(10px, 0, 0)',   // 相当于 20%
        'translate3d(-10px, 0, 0)',  // 相当于 30%
        'translate3d(10px, 0, 0)',   // 相当于 40%
        'translate3d(-10px, 0, 0)',  // 相当于 50%
        'translate3d(10px, 0, 0)',   // 相当于 70%
        'translate3d(-10px, 0, 0)',  // 相当于 80%
        'translate3d(10px, 0, 0)',   // 相当于 90%
        'translate3d(0, 0, 0)'       // 相当于 100%
    ]，
    offset: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
}
```

`offset` 的值为 `0.0 ~ 1.0` 之间的数字,表示关键帧的偏移量:`0.0` 相当于 `@keyframes` 中的 `0%` 或 `from`,`1.0` 相当于 `100%` 或 `to`,`.5` 相当于 `50%`。指定的 `offset` 值不在 `0.0 ~ 1.0` 范围内(小于 `0` 或大于 `1`)时,程序会抛出 `TypeError`。

构建不均分动画持续时间的关键帧时,`offset` 尤其重要。例如创建类似 `headShake` 的关键帧:

```CSS
@keyframes headShake {
    0% {
        transform: translateX(0);
    }

    6.5% {
        transform: translateX(-6px) rotateY(-9deg);
    }

    18.5% {
        transform: translateX(5px) rotateY(7deg);
    }

    31.5% {
        transform: translateX(-3px) rotateY(-5deg);
    }

    43.5% {
        transform: translateX(2px) rotateY(3deg);
    }

    50% {
        transform: translateX(0);
    }
}
```

在 WAAPI 中的定义:

```JavaScript
// 数组方式
const headShakeKeyframes = [
    {
        transform: 'translateX(0)',
        offset: 0        // 0%
    },
    {
        transform: 'translateX(-6px) rotateY(-9deg)',
        offset: 0.065    // 6.5% 
    },
    {
        transform: 'translateX(5px) rotateY(7deg)',
        offset: 0.185    // 18.5% 
    },
    {
        transform: 'translateX(-3px) rotateY(-5deg)',
        offset: 0.315    // 31.5% 
    },
    {
        transform: 'translateX(2px) rotateY(3deg)',
        offset: 0.435    // 43.5% 
    },
    {
        transform: 'translateX(0)',
        offset: 0.5     // 50%
    }
]

// 对象形式
const headShakeKeyframes = {
    transform: [
        'translateX(0)',
        'translateX(-6px) rotateY(-9deg)',
        'translateX(5px) rotateY(7deg)',
        'translateX(-3px) rotateY(-5deg)',
        'translateX(2px) rotateY(3deg)',
        'translateX(0)'
    ],
    offset: [0, 0.065, 0.185, 0.315, 0.435, 0.5]
}
```

**自动计算偏移**

WAAPI 中定义动画关键帧时,不带 `offset` 的关键帧将会自动计算偏移:

```JavaScript
const keyframes = [
    {
        color: 'blue'
    },
    {
        color: 'green',
        offset: 0.5
    },
    {
        color: 'red'
    },
    {
        color: 'yellow',
        offset: .8
    },
    {
        color: 'pink'
    }
]
```

上面定义的 `keyframes` 中,第一个关键帧的 `offset` 为 `0`;第三个关键帧位于第二个和第四个之间,它的 `offset` 是 `0.5` 和 `0.8` 之间的中间值,即 `0.65`(`(0.8 - 0.5) ÷ 2 + 0.5 = 0.65`);最后一个关键帧的 `offset` 是 `1`。所以上面的关键帧与下面这个关键效果相同:

```JavaScript
const keyframes = [
    {
        color: 'blue',
        offset: null
    },
    {
        color: 'green',
        offset: 0.5
    },
    {
        color: 'red',
        offset: null
    },
    {
        color: 'yellow',
        offset: .8
    },
    {
        color: 'pink',
        offset: null
    }
]
```

将 `offset` 的值设置为 `null`,表示关键帧应在相邻关键帧之间自动间隔;最后一个关键帧的 `offset` 在不指定值时会被视为 `null`。

**offset 必须递增**

与 `@keyframes` 不同的是,WAAPI 中定义关键帧时,必须按照偏移 `offset` 递增的方式定义。例如 `flash` 关键帧,`from`、`50%` 和 `to` 三个关键帧都应用了 `opacity: 1`,而 `25%` 和 `75%` 两个关键帧都应用了 `opacity: 0`:

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

WAAPI 无法将相同样式规则的选择器以组的方式设置,只能按照 `offset` 递增来定义:

```JavaScript
const flashKeyframes = [
    {
        opacity: 1,
        offset: 0
    },
    {
        opacity: 0,
        offset: .25
    },
    {
        opacity: 1,
        offset: .5
    },
    {
        opacity: 0,
        offset: .75
    },
    {
        opacity: 1,
        offset: 1
    }
]
```

不过,WAAPI 允许相邻且相等的 `offset`。

**每帧的缓动函数**

定义关键帧时,可以在每一个关键帧上指定缓动函数。例如 `bounce` 关键帧:

```CSS
@keyframes bounce {
    from,
    20%,
    53%,
    to {
        animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
        transform: translate3d(0, 0, 0);
    }

    40%,
    43% {
        animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
        transform: translate3d(0, -30px, 0) scaleY(1.1);
    }

    70% {
        animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
        transform: translate3d(0, -15px, 0) scaleY(1.05);
    }

    80% {
        transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
        transform: translate3d(0, 0, 0) scaleY(0.95);
    }

    90% {
        transform: translate3d(0, -4px, 0) scaleY(1.02);
    }
}
```

在 WAAPI 中的定义:

```JavaScript
// 数组的形式
const bounceKeyframes = [
    {
        transform: 'translate3d(0, 0, 0)',
        offset: 0,
        easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
    },
    {
        transform: 'translate3d(0, 0, 0)',
        offset: 0.2,
        easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
    },
    {
        transform: 'translate3d(0, -30px, 0) scaleY(1.1)',
        offset: 0.4,
        easing: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)'
    },
    {
        transform: 'translate3d(0, -30px, 0) scaleY(1.1)',
        offset: 0.43,
        easing: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)'
    },
    {
        transform: 'translate3d(0, 0, 0)',
        offset: 0.53,
        easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
    },
    {
        transform: 'translate3d(0, -15px, 0) scaleY(1.05)',
        offset: 0.7,
        easing: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)'
    },
    {
        transform: 'translate3d(0, 0, 0) scaleY(0.95)',
        offset: 0.8,
        easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
    },
    {
        transform: 'translate3d(0, -4px, 0) scaleY(1.02)',
        offset: 0.9
    },
    {
        transform: 'translate3d(0, 0, 0)',
        offset: 1,
        easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
    }
]

// 对象形式
const bounceKeyframes = {
    transform: [
        'translate3d(0, 0, 0)',
        'translate3d(0, 0, 0)',
        'translate3d(0, -30px, 0) scaleY(1.1)',
        'translate3d(0, -30px, 0) scaleY(1.1)',
        'translate3d(0, 0, 0)',
        'translate3d(0, -15px, 0) scaleY(1.05)',
        'translate3d(0, 0, 0) scaleY(0.95)',
        'translate3d(0, -4px, 0) scaleY(1.02)',
        'translate3d(0, 0, 0)'
    ],
    offset: [0, 0.2, 0.4, 0.43, 0.53, 0.7, 0.8, 0.9, 1],
    easing: [
        'cubic-bezier(0.215, 0.61, 0.355, 1)',
        'cubic-bezier(0.215, 0.61, 0.355, 1)',
        'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
        'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
        'cubic-bezier(0.215, 0.61, 0.355, 1)',
        'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
        'cubic-bezier(0.215, 0.61, 0.355, 1)',
        'cubic-bezier(0.215, 0.61, 0.355, 1)'
    ]
}
```

数组形式允许为每个关键帧指定不同的值;对象形式会将值重复列表,直到为每个关键帧分配一个值为止。重复行为使得将相同的值分配给所有关键帧变得简单:

```JavaScript
const color = {
    color: ['blue', 'green', 'red', 'yellow', 'pink'],
    offset: [null, 0.5, null, .8],
    easing: 'ease-in-out'
}
```

上面代码中的 `ease-in-out` 会在每个颜色值之间应用。注意:关键帧中的 `easing` 与 `options` 中的 `easing` 表达的效果完全不同:

```JavaScript
// 在这里，'ease-in-out' 在每个颜色值之间应用。
elem.animate({ 
    color: [ 'blue', 'green', 'yellow' ],
    easing: 'ease-in-out'   // keyframe 中的 easing
}, 2000);

// 但是，在这种情况下，'ease-in-out' 从动画的整个跨度应用，即从 'blue' 到 'yellow'。
elem.animate({ 
    color: [ 'blue', 'green', 'yellow' ] 
},{ 
    duration: 2000, 
    easing: 'ease-in-out'  // options 中的 easing
});
```

**每帧的 composite**

定义关键帧时,除了 `offset`、`easing`,还可以应用 `composite`,它是 `CompositeOperation` 类型,用于定义该关键帧效果与效果堆栈合成的合成操作。`CompositeOperation` 是一个枚举,`composite` 属性有三个可能的枚举值:

- `replace`:对应于 `replace` 合成操作值,使动画效果覆盖它所组合的底层值
- `add`:对应于 `add` 合成操作值,使动画效果与其组合的底层值相加
- `accumulate`:对应于 `accumulate` 合成操作值,使动画效果在底层值上累积

这些值决定了关键帧效果与底层值合成时采用的合成策略。通过 `composite` 属性可以控制关键帧效果如何与其他效果组合,从而影响动画的最终表现。

**keyframes 的其他用途**

上面创建的 `keyframes` 除了可作为 `KeyframeEffect(target, keyframes, options)` 构造函数的参数之外,还可以用于:

- `KeyframeEffect` 接口上的 `setKeyframes()` 方法:用于设置关键帧,可替换构造函数中设置的关键帧
- `Animatable` 接口混合的 `animate()` 方法:用于启动动画,接受关键帧作为参数,并返回一个 `Animation` 对象,该对象可用于控制和操作动画

### 创建 KeyframeEffect 对象

`new KeyframeEffect()` 构造函数中的 `keyframes` 参数可以是下面三种的任何一种:

- `keyframes` 是单个属性
- `keyframes` 是多个属性
- `keyframes` 是一个关键帧

第一种方式最简单,构造一个将 `aniEle` 元素的 `translate` 属性在 `3s` 内更改为 `0 -100px` 的 `KeyframeEffect` 对象:

```JavaScript
const effect = new KeyframeEffect(
    aniEle,                    // target
    {translate: '0 -100px'},   // keyframes
    3000                       // options
)
```

也可以在第二个参数中同时指定多个属性:

```JavaScript
const effect = new KeyframeEffect(
    aniEle,                     // target
    {                           // keyframes
        translate: '0 -100px',
        scale: .5
    },                       
    3000                        // options
)
```

第三种是第二个参数为一个关键帧,前面的案例都是这种方式:

```JavaScript
const keyframes = [
    { 
        translate: "0 -100px" 
    },
    { 
        scale: 0.5, 
        translate: "0 100px" 
    }
]

const effect = new KeyframeEffect(aniEle, keyframes, 3000)
```

第三个 `options` 可以是简单表示动画迭代持续时间的毫秒数的数字(如上面的 `3000`,表示 `duration` 为 `3s`),也可以使用 `EffectTiming` 对象指定更详细的动画参数:

```JavaScript
const options = {
    duration: 2000,
    fill: "both",
    easing: "ease-in-out"
};

const keyframes = [
    { 
        translate: "0 -100px", 
        scale: 1.2, 
        opacity: 0.3 
    },
    { 
        scale: 0.5, 
        translate: "0 100px", 
        opacity: 1 
    }
];

const effect = new KeyframeEffect(aniEle, keyframes, options);
```

> Demo 地址：https://codepen.io/airen/full/LYaLPPz

创建 `KeyframeEffect` 对象时也可以不显式指定动画持续时间,甚至不指定任何参数:

```JavaScript
const effect = new KeyframeEffect(
    aniEle2,
    { translate: "0 -100px", scale: 0.5 }
);
```

此时动画的持续时间会被视为 `0`,不会有任何动画效果,相当于创建了一个仅设置属性而不进行任何插值的动画。

## 使动画动起来

创建好 `KeyframeEffect` 对象("光盘")和 `Animation` 对象("播放器")之后,将两者关联并按下播放键,动画即可运行。完整流程:

- ① 获取 DVD 光盘:使用 `new KeyframeEffect(target, keyframes, options)` 创建一个 `KeyframeEffect` 对象
- ② 将 DVD 光盘放到 DVD 播放器:使用 `new Animation(effect, timeline)` 创建一个 `Animation` 对象
- ③ 按下 DVD 播放器的开始键(`animation.play()`)开始播放;播放过程中按下暂停键(`animation.pause()`)暂停播放;按下取消键(`animation.cancel()`)取消播放

以下用代码描述整个过程。首先,准备一个动画元素:

```HTML
<svg id="logo"></svg>
```

然后,使用 `new KeyframeEffect(target, keyframes, options)` 构造函数创建一个动画效果 `effect`,它是一个 `KeyframeEffect` 对象,即"DVD 光盘":

```JavaScript
// target
const aniEle = document.querySelector('#logo');

// keyframes
const wobble = [
    {
        transform: 'translate3d(0, 0, 0)',
        offset: 0
    },
    {
        transform: 'translate3d(-25%, 0, 0) rotate3d(0, 0, 1, -5deg)',
        offset: 0.15
    },
    {
        transform: 'translate3d(20%, 0, 0) rotate3d(0, 0, 1, 3deg)',
        offset: 0.3
    },
    {
        transform: 'translate3d(-15%, 0, 0) rotate3d(0, 0, 1, -3deg)',
        offset: 0.45
    },
    {
        transform: 'translate3d(10%, 0, 0) rotate3d(0, 0, 1, 2deg)',
        offset: 0.6
    },
    {
        transform: 'translate3d(-5%, 0, 0) rotate3d(0, 0, 1, -1deg)',
        offset: 0.75
    },
    {
        transform: 'translate3d(0, 0, 0)',
        offset: 1
    }
]

// options
const options = {
    duration: 10000,
    easing: 'ease'
}

// create KeyframeEffect => create DVD disc
const effect = new KeyframeEffect(aniEle, wobble, options);
```

创建完 `effect`,再使用 `new Animation(effect, timeline)` 构造函数创建 `animation`,并将 `effect` 插入播放器:

```JavaScript
// Get Document Timeline
const timeline = document.timeline || new Animation();

// Create Animation Object => Create DVD Player
const animation = new Animation(effect, timeline);
```

接下来通过"播放器按键"控制动画:

- 按下播放键(`play()`)开始播放动画
- 按下暂停键(`pause()`)暂停动画播放
- 按下取消键(`cancel()`)取消动画播放
- 按下"反向"键(`reverse()`),动画反向播放(DVD 播放器只有倒带功能)
- 按下快进键(`playbackRate()`),动画按指定的速率播放(DVD 播放器有快进功能)

在代码中,分别以不同的按钮表示播放器的按键:

```HTML
<div class="btn" id="play"><!-- 播放按键 --></div>
<div class="btn" id="pause"><!-- 暂停按键 --></div>
<div class="btn" id="cancel"><!-- 取消按键 --></div>
<div class="btn" id="reverse"><!-- “反向”按键 --></div>
<div class="btn" id="rate"><!-- 快进按键 --></div>
```

在 JavaScript 中监听这些按钮的 `click` 事件,并调用 `Animation` 提供的方法:

- `animation.play()`: 启动或恢复动画的播放,对应播放按键(`#play`)
- `animation.pause()`: 暂停动画的播放,对应暂停按键(`#pause`)
- `animation.cancel()`: 取消动画,对应取消按键(`#cancel`)
- `animation.reverse()`: 反转动画的方向,对应"反向"按键(`#reverse`)
- `animation.updatePlaybackRate(playbackRate)`: 更新动画的播放速率,对应"快进"按键(`#rate`)

```JavaScript
const playHandler = document.getElementById('play');       // 播放按键
const pauseHandler = document.getElementById('pause');     // 暂停按键
const cancelHandler = document.getElementById('cancel');   // 取消按键
const reverseHandler = document.getElementById('reverse'); // “反向”按键
const rateHandler = document.getElementById('rate');       // “快进”按键

// 播放动画
playHandler.addEventListener('click', () => {
    animation.play();
});

// 动画暂停播放
pauseHandler.addEventListener('click', () => {
    animation.pause();
});

// 取消动画播放
cancelHandler.addEventListener('click', () => {
    animation.cancel();
});

// 动画反向播放
reverseHandler.addEventListener('click', () => {
    animation.reverse();
});

// 动画以 3 倍的速率播放
rateHandler.addEventListener('click', () => {
    animation.updatePlaybackRate(3);
    animation.ready.then(() => {
        console.log(`Playback rate set to ${animation.playbackRate}`);
        animation.play()
    });
});
```

> Demo 地址：https://codepen.io/airen/full/Rwdgbxv

也可以通过 `Animation` 的混合接口 `Element.animate()` 获取动画对象:

```JavaScript
Element.animate(keyframes, options)
```

使用 `Element.animate()` 方法时,只要提供 `keyframes` 和 `options`,它会立即播放动画。`Element.animate(keyframes, options)` 相当于一个执行三个操作的快捷方式:

- 它创建了一个 `KeyframeEffect` 实例(步骤 ①,获取 DVD 光盘),等同于使用 `new KeyframeEffect(target, keyframes, options)` 创建了一个 `KeyframeEffect`
- 它将创建好的 `KeyframeEffect` 放入一个新的 `Animation` 实例中(步骤 ②,将 DVD 光盘放入了 DVD 播放器中),等同于使用 `new Animation(effect, timeline)` 创建了一个 `Animation`
- 它会立即开始播放动画(步骤 ③,播放动画),等同于 `animation.play()`

```JavaScript
const animEle = document.querySelector('.animated');

const keyframes = [
    {
        opacity: 0
    },
    {
        opacity: 1
    }
]

const options = {
    duration: 1000,
    fill: 'both',
    easing: 'ease-in'
}


// Element.animate() 创建动画
animEle.animate(keyframes, options);
```

上面的代码等同于:

```JavaScript
const animEle = document.querySelector('.animated');

const keyframes = [
    {
        opacity: 0
    },
    {
        opacity: 1
    }
]

const options = {
    duration: 1000,
    fill: 'both',
    easing: 'ease-in'
}

// 步骤 ①，获取 DVD 光盘
const effect = new KeyframeEffect(animEle, keyframes, options);

// 步骤 ②，将 DVD 光盘放入了 DVD 播放器中
const animation = new Animation(effect, document.timeline);

// 步骤 ③，按播放键播放动画
animation.play()
```

理解幕后工作机制的关键在于:能够区分关键帧的定义并决定何时播放它。有很多动画需要协调时,先收集它们会有所帮助,这样能确认它们已经准备好播放;在运行时生成并期望它们在正确时刻开始播放,不是明智的选择——通过几帧的拖动很容易破坏期望的效果,长序列下拖拽累积会导致完全不令人信服的体验。

## 控制时间

[WAAPI 引入了时间轴的概念](https://www.w3.org/TR/web-animations-1/#timelines)。默认情况下,所有动画都与[文档的时间轴](https://www.w3.org/TR/web-animations-1/#document-timelines)(`document.timeline`)相关联,即动画共享相同的"内部时钟"——一个从页面加载开始的时钟。这个共享的时钟是协调动画的基础,无论何种节奏或模式,都不必担心某些事情拖慢或超前于自己。

时间就是动画的生命线。WAAPI 中有两个级别的时间可以控制。

### 帧级时间:offset

第一级是在定义关键帧时使用 `offset` 对单个帧时间进行控制。给它一个从 `0` 到 `1` 的值,可以定义每个效果何时开始;省略时默认值为 `0`。`offset` 相当于 CSS `@keyframes` 中的百分比选择器,只是 WAAPI 中的 `offset` 是一个除以 `100` 的值。两者都是动画单次迭代持续时间的一部分,相对于动画单次迭代的持续时间计算。

`offset` 允许开发者在 `KeyframeEffect` 中排列关键帧。作为一个相对数值,`offset` 确保无论播放速度如何,所有关键帧都相对于彼此在同一时刻开始。

### 动画级时间:delay、endDelay 与总体持续时间

需要明确的概念:偏移 `offset` 只是动画持续时间的一部分,而动画持续时间与动画的总体持续时间不是同一回事。通常所说的动画持续时间指动画一次迭代完成所需的时间(动画播放完一次的用时);默认情况下它等于动画的总持续时间。一旦添加延迟 `delay` 或增加迭代次数,两者就不相等了。

构建大型或复杂动画(涉及多个动画播放)时,时间尤为重要。动画从开始到结束的整个持续时间应通过以下公式计算:

```
delay + (iterations × duration) + endDelay
```

以下示例演示了上面这个公式的结果:

> Demo 地址：https://codepen.io/smashingmag/full/VwWWrzz

这使得在固定的时间长度上控制多个动画成为可能。

保持所需的动画持续时间不变,可以在开始时用延迟 `delay`、在结束时用 `endDelay` 来"填充",将其嵌入持续时间较长的上下文。从这个意义上说,延迟的作用类似于关键帧中的偏移。开发者对 `delay` 更为熟悉,因为它与 CSS 中的 `animation-delay` 相似,指定动画延迟播放的时间;`endDelay` 则有所不同。

定义 `KeyframeEffect` 时,可以在 `options` 中设置 `endDelay`,指定动画结束后的延迟时间——动画结束后元素保持最终状态的时间,之后再执行其他操作或开始下一次迭代。例如动画元素沿 `x` 轴从 `0px` 位置向右移动 `200px`:

```JavaScript
const animatedEle = document.querySelector('.animated');

const keyframes = [
    {
        translate: '0px'
    },
    {
        translate: '200px'
    }
]

const options = {
    duration: 2000,
    fill: 'both',
    iterations: Infinity,
    easing: 'ease',
    direction: 'alternate',
    endDelay: 3000  // 在动画结束后延迟 3s 
}

const timeline = document.timeline || new Animation();

const effect = new KeyframeEffect(animatedEle, keyframes, options);

const animation = new Animation(effect, timeline);

animation.play()
```

在创建序列动画和交错动画上,`endDelay` 很有用。假设给动画元素创建了两个动画效果 `fadeIn` 和 `pulse`,希望 `fadeIn` 动画结束后 `300ms` 再运行 `pulse` 动画:

```JavaScript
const animatedEle = document.querySelector(".animated");

const fadeInKeyframes = [
    {
        opacity: 0
    },
    {
        opacity: 1
    }
];

const fadeInOptions = {
    duration: 300,
    fill: "both",
    easing: "ease-in",
    endDelay: 300 // 在动画结束后延迟 3s
};

const pulseKeyframes = [
    {
        scale: `1.25 1.25 1.25`,
        offset: 0.5
    }
];

const pulseOptions = {
    duration: 1000,
    direction: "alternate",
    fill: "both",
    easing: "ease-in-out"
};

const timeline = document.timeline || new Animation();

const fadeInEffect = new KeyframeEffect(
    animatedEle,
    fadeInKeyframes,
    fadeInOptions
);

const pulseEffect = new KeyframeEffect(
    animatedEle,
    pulseKeyframes,
    pulseOptions
);

const fadeInAni = new Animation(fadeInEffect, timeline);
const pulseAni = new Animation(pulseEffect, timeline);

fadeInAni.play();

fadeInAni.onfinish = () => {
    // fadeInAni 动画结束后执行其他操作
    console.log("FadeIn Animation Finished!");
    pulseAni.play();
};
```

> Demo 地址：https://codepen.io/airen/full/wvOdrYM

`endDelay` 常用于控制动画结束后的等待时间,使动画效果更加灵活,适用于各种交互和设计场景。

### iterationStart 配置参数

除 `endDelay` 之外,另一个有助于对齐动画的时间选项是 `iterationStart`,它是 `KeyframeEffect` 的配置选项,指定动画的起始迭代点,即动画应该从整个迭代中的哪个点开始播放。默认值为 `0.0`,即动画从第一次迭代的开始点开始播放:

```JavaScript
const animatedEle = document.querySelector(".animated");

const keyframes = [
    { transform: 'translateX(0px)' },
    { transform: 'translateX(200px)' },
];

const options = {
    duration: 1000,
    iterations: 2,
    iterationStart: 0.5, // 从动画的一半位置开始播放
};

const animation = new Animation(new KeyframeEffect(animEle, keyframes, options));
animation.play();
```

上面的示例中,动画迭代次数为 `2` 次,`iterationStart` 被设置为 `0.5`,动画将从第一次迭代的中间位置开始播放,产生在动画中间位置开始播放的效果。

> Demo 地址：https://codepen.io/airen/full/XWGgBLO

与 `endDelay` 相似,通过设置多个动画的 `iterationStart`,可以创建一组在迭代时间上交错执行的动画,产生更复杂的动画序列。`iterationStart` 适用于需要定制起始位置的动画场景。

## pseudoElement 配置参数

在 CSS 中,可以给伪元素 `::before` 或 `::after` 添加过渡或关键帧动画:

```CSS
@keyframes pulse {
    50% {
        scale: 1.5;
    }
}

.animated::before {
    animation: pulse 1s ease-in-out;
}
```

在 WAAPI 中,通过 `KeyframeEffectOptions` 中的 `pseudoElement` 配置选项,可以给指定元素的伪元素 `::before` 或 `::after` 应用动画:

```JavaScript
const animEle = document.querySelector(".animated");
const buttonHandler = document.querySelector(".button");

const keyframes = [{ scale: 2, offset: 0.5 }];

const options = {
    duration: 3000,
    iterations: Infinity,
    easing: "ease-in-out",
    pseudoElement: "::before"  // 将动画应用于元素的 ::before 伪元素
};

const effect = new KeyframeEffect(animEle, keyframes, options);
const timeline = document.timeline || new Animation();

const animation = new Animation(effect, timeline);

buttonHandler.addEventListener("click", () => {
    animation.play();
});
```

> Demo 地址：https://codepen.io/airen/full/xxBraKv

## 使用 WAAPI 构建动画

以下用 WAAPI 创建一个让表情包在屏幕上飞舞的效果:

> Demo 地址：https://codepen.io/airen/full/QWogzwm

该动画对每个表情符的 `transform` 做随机处理。具体代码如下:

```JavaScript
const main = document.querySelector("main");

const emojis = [
  "😀",
  "😃",
  // 省略其他的表情符号
];

emojis.forEach((emoji, index) => {
    // 每一个表情符号放在一个 div，并且命名为 animated
    const aniEle = document.createElement("div");
    aniEle.classList.add("animated");
    aniEle.textContent = `${emoji}`;
    
    // 将所有的表情符塞入到 main 元素中
    main.appendChild(aniEle);

    // 获取随机的 translate、rotate 和 scale 值
    const startx1 = Math.random() * 100;
    const startx2 = Math.random() * 100;
    const starty1 = Math.random() * 100;
    const starty2 = Math.random() * 100;
    const startr1 = Math.random();
    const startr2 = Math.random();
    const starts1 = Math.random();

    const endx1 = Math.random() * 100;
    const endx2 = Math.random() * 100;
    const endy1 = Math.random() * 100;
    const endy2 = Math.random() * 100;
    const endr1 = Math.random();
    const endr2 = Math.random();
    const ends1 = Math.random();

    // 创建 translate 关键帧，改变 transform 属性的值
    const translate = [
        {
            transform: `
                translate(${startx1}vmin,${starty1}vmin)
                rotate(${startr1}turn) 
                scale(${starts1}) 
                rotate(${startr2}turn) 
                translate(${startx2}vmin,${starty2}vmin)`
        },
        {
            transform: `
                translate(${endx1}vmin,${endy1}vmin) 
                rotate(${endr1}turn) 
                scale(${ends1}) 
                rotate(${endr2}turn) 
                translate(${endx2}vmin,${endy2}vmin)`
        }
    ];

    // 配置 translate 动画参数
    const translateOptions = {
        iterations: Infinity,
        duration: Math.random() * 5000 + 5000,
        direction: "alternate",
        easing: "ease-in-out"
    };

    // 创建 scale 关键帧，改变 scale 属性的值
    const scale = [
        {
            scale: 0
        },
        {
            scale: 1
        }
    ];

    // 配置 scale 动画参数
    const scaleOptions = {
        duration: 20000,
        easing: "ease-out"
    };

    // 每个表情符应用 translate 动画
    aniEle.animate(translate, translateOptions);

    // main 元素应用 scale 动画
    main.animate(scale, scaleOptions);
});
```

代码使用 `Element.animate()` 分别创建了 `translate` 和 `scale` 动画。每个表情符应用了 `translate` 动画:

```JavaScript
// 获取随机的 translate、rotate 和 scale 值
const startx1 = Math.random() * 100;
const startx2 = Math.random() * 100;
const starty1 = Math.random() * 100;
const starty2 = Math.random() * 100;
const startr1 = Math.random();
const startr2 = Math.random();
const starts1 = Math.random();

const endx1 = Math.random() * 100;
const endx2 = Math.random() * 100;
const endy1 = Math.random() * 100;
const endy2 = Math.random() * 100;
const endr1 = Math.random();
const endr2 = Math.random();
const ends1 = Math.random();

// 创建 translate 关键帧，改变 transform 属性的值
const translate = [
    {
        transform: `
            translate(${startx1}vmin,${starty1}vmin)
            rotate(${startr1}turn) 
            scale(${starts1}) 
            rotate(${startr2}turn) 
            translate(${startx2}vmin,${starty2}vmin)`
    },
    {
        transform: `
            translate(${endx1}vmin,${endy1}vmin) 
            rotate(${endr1}turn) 
            scale(${ends1}) 
            rotate(${endr2}turn) 
            translate(${endx2}vmin,${endy2}vmin)`
    }
];

// 配置 translate 动画参数
const translateOptions = {
    iterations: Infinity,
    duration: Math.random() * 5000 + 5000,
    direction: "alternate",
    easing: "ease-in-out"
};

// 每个表情符应用 translate 动画
aniEle.animate(translate, translateOptions);
```

同时在 `main` 元素上应用了 `scale` 动画:

```JavaScript
// 创建 scale 关键帧，改变 scale 属性的值
const scale = [
    {
        scale: 0
    },
    {
        scale: 1
    }
];

// 配置 scale 动画参数
const scaleOptions = {
    duration: 20000,
    easing: "ease-out"
};

// main 元素应用 scale 动画
main.animate(scale, scaleOptions);
```

## WAAPI 控制多个动画

在 CSS 中控制多个动画时,通常使用动画编排技术管理整个时间轴上的所有动画:控制动画的持续时间和延迟时间来协调时间轴上的动画,使其播放时不产生混乱。

相比之下,WAAPI 中控制多个动画更容易。可以把 WAAPI 想象成一个"超级 DVD 播放器":可以放入任意数量的 DVD 光盘,并添加任意数量的控制按钮。假设这个播放器被命名为 `createPlayer`,它是一个函数:

```JavaScript
const createPlayer = (animations) => {
    // 超级 DVD 播放器
}
```

`createPlayer()` 函数是超级 DVD 播放器;`animations` 是任意数量的 DVD 光盘,作为函数参数传入。

DVD 光盘(`KeyframeEffect`)放入 DVD 播放器(`Animation`)的插槽后,按下播放按键即可播放:

```JavaScript
animation.play()
```

播放器中有任意数量的光盘时,播放每张光盘就需要遍历——这就是调用单个动画和多个动画(动画数组)上 `play()` 的区别:单个动画直接调用,多个动画需要遍历:

```JavaScript
const createPlayer = (animations) => {
    animations.forEach(animation => {
        animation.play()
    })
}
```

可以用它为播放器创建各种功能。例如,`createPlayer()` 函数接受要同步播放的动画数组,并返回具有单个 `play` 方法的对象,该方法使用 `forEach` 循环遍历传入的动画数组并对每个动画调用其 `play` 方法:

```JavaScript
function createPlayer(animations) {
    return Object.freeze({
        play: function() {
            animations.forEach((animation) => animation.play());
        }
    });
}
```

在此基础上扩展 `pause` 和 `currentTime` 方法:

```JavaScript
function createPlayer(animations) {
    return Object.freeze({
        play: function() {
            animations.forEach((animation) => animation.play());
        },
        pause: function() {
            animations.forEach((animation) => animation.pause());
        },
        currentTime: function(time = 0) {
            animations.forEach((animation) => animation.currentTime = time);
        }
    });
}
```

具有这些方法的 `createPlayer` 足以对任意数量的动画进行编排。

来看一个完整示例:

```HTML
<div class="animations">
    <div class="animated"></div>
    <div class="animated"></div>
    <div class="animated"></div>
    <div class="animated"></div>
    <div class="animated"></div>
</div>

<div class="actions">
    <div class="button play" id="play">playAll</div>
    <div class="button pause" id="pause">pauseAll</div>
    <div class="button seek" id="seek">seekAll</div>
    <div class="button cancel" id="cancel">cancelAll</div>
</div>
```

页面上有五个动画元素 `.animated` 和四个控制所有动画的按钮。通过 WAAPI 的 `Element.animate()` 给 `.animated` 创建动画,使用 `pause()` 让所有动画暂停播放,同时将所有动画推到 `animations` 数组:

```JavaScript
const animEles = document.querySelectorAll(".animated");
const animations = [];

const DURATION = 8000;

// 创建动画
animEles.forEach((animEle, index) => {
    // 创建关键帧
    const keyframes = [
        {
            translate: `0px`,
            rotate: `0deg`
        },
        {
            translate: `80vw`,
            rotate: `2700deg`
        }
    ];

    // 配置动画参数
    const options = {
        duration: DURATION,                         // 动画持续时间
        easing: "ease-in-out",                      // 动画缓动函数
        fill: "both",                               // 动画填充模式  
        delay: (DURATION / 4) * index,              // 动画延迟播放时间
        endDelay: DURATION - (DURATION / 4) * index // 动画结束后延迟时间
    };

    // 使用 Element.animate() 创建 Animation 实例
    const anim = animEle.animate(keyframes, options);
    
    // 默认暂停所有动画播放
    anim.pause();
  
    // 将所有动画推送到 animations 数组  
    animations.push(anim);
});
```

创建超级播放器,控制所有动画的播放、暂停、取消等:

```JavaScript
function createPlayer(animations) {
    return Object.freeze({
        play: function() {
            animations.forEach((animation) => animation.play());
        },
        pause: function() {
            animations.forEach((animation) => animation.pause());
        },
        cancel: function() {
            animations.forEach((animation) => animation.cancel());
        },
        currentTime: function(time = 0) {
            animations.forEach((animation) => (animation.currentTime = time));
        }
    });
}
```

给按钮绑定 `click` 事件,在相应程序中执行 `createPlayer` 播放器的相关操作:

```JavaScript
const playHandler = document.getElementById('play');
const seekHandler = document.getElementById('seek');
const pauseHandler = document.getElementById('pause');
const cancelHandler = document.getElementById('cancel');

const player = createPlayer(animations);

playHandler.addEventListener('click', etv => {
    console.log('Play all animations');
    player.play()
})

pauseHandler.addEventListener('click', etv => {
    console.log('Pause all animations');
    player.pause()
})

cancelHandler.addEventListener('click', etv => {
    console.log('Cancel all animations')
    player.cancel()
})

seekHandler.addEventListener('click', etv => {
    console.log('Seek all animations')
    player.currentTime(1000);
})
```

这样可以同时操作多个动画:

> Demo 地址：https://codepen.io/airen/full/dyrzpRM

## 小结

WAAPI 提供了一种现代且强大的方式来处理 Web 页面上的动画效果。通过使用 JavaScript 控制动画,Web 开发者能够更灵活地实现各种交互和动态效果,而不仅仅依赖于静态的 CSS 动画。掌握 `Animation` 与 `KeyframeEffect` 两个核心接口、`Element.animate()` 快捷方式、`offset`/`delay`/`endDelay`/`iterationStart` 等时间控制参数,以及批量编排多个动画的包装函数模式,即可在需要精细播放控制的场景中游刃有余。
