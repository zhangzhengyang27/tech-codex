---
title: CSS 动画的播放方式：暂停、恢复和重播
description: "Web 上的动画都具备播放、暂停和重新播放等操作方式，不同类型的动画有不同的控制手段。本文以 CSS 关键帧动画为核心，介绍通过 animation-play-state、CSS 自定义属性、媒体查询与 JavaScript 控制动画暂停、恢复和重播的方法。"
keywords: [CSS, 动画的播放方式, 暂停, 恢复和重播]
category: CSS
tags: [CSS, 布局, 动画, 响应式]
---


# CSS 动画的播放方式：暂停、恢复和重播

CSS 动画的播放就好比视频的播放方式，通过一定的方式可以控制动画播放和暂停。严格来说，Web 上的所有动画类型都具备播放、暂停和重新播放等功能或操作方式，只不过不同类型的动画有着不同的控制方式。掌握如何有效播放和暂停 CSS 动画很有必要：这不仅对创造性的 Web 页面设计至关重要，而且对性能、用户控制和可访问性都具有重要意义。

## 动画暂停和恢复播放

CSS 动画主要有过渡动画和关键帧动画两类，其播放、暂停和重新播放的控制方式有所差异，其中 CSS 关键帧动画的控制要简单得多。

### CSS 关键帧动画的暂停与恢复播放

默认情况下，只要通过 `animation` 属性将 `@keyframes` 关键帧定义的动画应用到 Web 元素上，动画就会开始播放。页面加载的瞬间，CSS 关键帧动画就会自动播放，类似于视频（`<video>`）设置了自动播放（`autoplay`）。例如：

```CSS
@keyframes slideInLeft {
    from {
        translate: -300%;
    }
    to {
        translate: 0;
    }
}

.animated {
    animation: slideInLeft 2s ease-in infinite;
}
```

> Demo 地址：https://codepen.io/airen/full/PoVBqJQ

红色框（`.animated` 元素）应用了 `slideInLeft` 动画，持续时间为 `2s`，并设置为无限循环播放。浏览器动画面板中每个矩形代表动画的一次迭代（播放一次），各个迭代并排放置。动画一旦开始就不会停止，直到结束（示例播放完一次需要 `2s`）；如果设置为无限循环，动画每迭代完一次就会重新开始，每次重新开始都表示为一个单独的紫色矩形。

`animation-play-state` 属性用于控制动画的播放状态，它有 `running` 和 `paused` 两个值：

-   `running` ：默认值，表示当前动画正在播放
-   `paused` ：表示当前动画暂停播放

将 `animation-play-state` 属性的值设置为 `paused` 即可暂停动画：

```CSS
.animated {
    animation-play-state: paused;
}
```

通过对 `running` 或 `paused` 的切换即可控制动画是否播放。它的行为类似视频的播放和暂停：

> Demo 地址：https://codepen.io/airen/full/YzBjqNN

-   **暂停（`animation-play-state` 切换为 `paused`）** ：类似点击视频的暂停按钮，视频停止播放
-   **恢复（`animation-play-state` 切换为 `running`）** ：类似再次点击播放按钮，视频继续播放；在 CSS 动画中也称为恢复动画播放

关键的一点是：**当动画被暂停时，它会保留动画最后计算的值**，就好像时间突然停滞了一样。将 `animation-play-state` 重新设置为 `running` 即可恢复，不存在突然重新启动的情况——动画不会回到 `0%` 标记之前再恢复，而是从暂停的地方继续播放，就像媒体播放器上的播放/暂停功能一样。恢复暂停的动画从暂停时停止的位置开始播放，而不是从动画序列的开头重新播放。

#### 状态触发的动画如何保持暂停

默认情况下关键帧动画是自动播放的，除非显式设置 `animation-play-state: paused`。动画应用在特定状态时，例如 `:hover`、`:active`、`:focus`、`:checked` 或由 JavaScript 触发的类更改，情形会复杂一些。例如下面的示例，用户鼠标悬停在元素上时才触发 `spin` 动画：

```CSS
@keyframes spin {
    to {
        rotate: 360deg;
    }
}

.animated:hover {
    animation: spin 2s linear infinite;
}
```

> Demo 地址：https://codepen.io/airen/full/yLZqJge

用户鼠标悬停在元素上再移出时，元素会突然切换回原始状态（没有旋转）。但许多情况下更希望它在最后显示的帧中冻结，直到再次悬停。即：鼠标悬停时元素自动旋转（触发 `spin` 动画），鼠标移出时元素停留在移出那一刻的状态（暂停 `spin` 动画），再次悬停时又继续旋转（恢复播放）。

实现方式是：从一开始就在元素上应用 `spin` 动画，但将 `animation-play-state` 设置为 `paused`，然后在 `:hover` 状态下将其切换为 `running`：

```CSS
@keyframes spin {
    to {
        rotate: 360deg;
    }
}

.animated {
    --play-state: paused;
    animation: spin 2s linear var(--play-state) infinite;
    
    &:hover {
        --play-state: running;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/LYqBZOd

反之亦然。如果正在进行动画处理的对象内部有可点击的元素，动画移动会让用户难以点击目标——点击而错过的体验非常糟糕。这时可以在鼠标悬停时将 `animation-play-state` 设置为 `paused`：动画暂停，点击目标停止移动：

```CSS
@keyframes pulse {
  0% {
    scale: 1;
  }

  50% {
    scale: 1.1;
  }

  100% {
    scale: 1;
  }
}


.box {
    --play-state: running;
    animation: pulse 3s infinite var(--play-state);
    
    &:hover {
        --play-state: paused;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/WNPKGMO

这两个示例说明，使用 `animation-play-state` 可以很容易实现平滑的状态切换动画。

除了 `animation-play-state`，也可以用一些变通技巧暂停动画，例如用 `animation-duration` 将动画持续时间设置为 `0s`，或将 `animation-name` 的值设置为 `none`。但这些技巧有明显缺陷：

-   将动画的持续时间设置为 `0s` 时，动画仍在运行，只是在其初始位置和序列中的下一个位置之间切换
-   将动画的名称设置为 `none` 时，相当于完全删除动画

这两种方法实际上并没有暂停动画，与真正的动画暂停有本质差距，不推荐使用。

### CSS 过渡动画的暂停与恢复播放

过渡动画（Transition）是一种简化状态变化的方式，常用于在元素属性状态变化时添加平滑效果。它没有类似 `animation-play-state` 的属性，因此其暂停和恢复播放与关键帧动画有本质差异：

-   **过渡动画**：通常与状态变化或交互相关，只在属性从初始值到最终值变化时发生一次。变化完成后属性保持在最终值，直到再次触发状态变化。过渡动画不会在中途停止，也不会保留属性的中间值
-   **帧动画**：通常不依赖状态或交互，可根据定义的迭代次数无限循环播放，能在特定时间点停止，可以在播放过程中暂停并在特定时间保持属性的中间值。帧动画可手动控制播放，包括暂停、继续和跳转到特定帧

帧动画提供了更多控制，可以在播放过程中操作属性的中间状态；过渡动画通常只处理属性的起始和结束状态的变化。

```CSS
.animation:hover .car{
    animation-play-state: paused;
}
```

> Demo 地址：https://codepen.io/airen/full/NWoPEyN

上面示例同时呈现了两种动画的差异：对过渡动画，鼠标悬停到元素上动画才开始播放，鼠标移出后动画立即停止并回到初始状态；对帧动画，鼠标悬停时动画暂停播放，鼠标移出后动画从暂停处继续向前播放。

## 动画暂停的重要性

就 CSS 动画而言，只要动画开始播放了，即使它不在视窗或容器的可视区内，它仍然在运行：

> Demo 地址：https://codepen.io/airen/full/xxMJgJY

这和视频类似：视频启动播放后会一直播放，直到被暂停。正在播放的动画是否仍在使用 CPU 或 GPU、是否消耗不必要的处理能力从而影响页面性能？答案是肯定的。页面中存在大量动画元素时，这些动画可能消耗大量 CPU 和 GPU 资源；即使用户当前并未查看页面上的某些动画，它们仍在后台运行，可能导致性能下降。暂停不在视窗或容器可视区中的动画，可以减轻系统负担，提高页面整体性能。

除性能外，暂停动画还有两方面意义：

-   **用户控制**：用户希望对浏览体验有更多控制权。某些情况下用户可能希望暂停正在播放的动画，以便更好地关注内容或减少可能引起不适的动态效果。提供暂停选项增强了用户对页面上动画行为的掌控能力。
-   **可访问性**：可访问性要求 Web 应用对所有用户（包括有特殊需求的用户）友好。有些用户可能对动画敏感，动画甚至可能触发癫痫或晕动症等问题。提供动画暂停选项可以使网站更加包容。

通过允许暂停 CSS 动画，可以在性能、用户控制和可访问性方面提供更好的用户体验。`animation-play-state` 是真正控制动画暂停和恢复播放的 CSS 属性，值得深入了解其更多用法。

## 使用不同方法控制动画暂停和恢复播放

控制动画暂停和恢复播放的方法分为两部分：CSS 相关的技术和 JavaScript 相关的技术。

### CSS 如何控制动画暂停和恢复播放

在 CSS 中控制动画暂停和恢复播放，最直接的方法是使用 `animation-play-state` 或其简写属性 `animation`。下面介绍更好地使用 `animation-play-state` 的几种方式。

#### 属性选择器与 CSS 自定义属性相结合

通过属性选择器与 CSS 自定义属性相结合来控制动画的暂停和恢复播放，是一种轻便且灵活的技巧。

在 CSS 中可以使用属性选择器，比如 `[data-animation]` 选择器，选中所有希望暂停和恢复播放的动画元素：

```HTML
<!-- 你希望这个元素上的动画将会暂停或恢复播放 -->
<div data-animation></div>

<!-- 你希望这个元素上的动画不会出现暂停或恢复播放等操作 -->
<div class="animated"></div>
```

可以在 HTML 元素上定义任意属性，也可以直接使用 `animation` 属性，数据属性（`data-*`）是 HTML 元素上常见的[属性类型](https://html.spec.whatwg.org/multipage/dom.html#embedding-custom-non-visible-data-with-the-data-*-attributes)。

这样就能与其他动画区分开来：

```CSS
[data-animation] {
    /* 默认动画播放状态为运行 */
    animation-play-state: running;
}

[data-animation][data-animation-state="paused"] {
    /* 当 data-animation-state 为 paused 时，暂停动画 */
    animation-play-state: paused;
}
```

上述 CSS 为具有 `[data-animation]` 属性的元素定义了默认播放状态 `running`；当 `data-animation-state` 属性为 `paused` 时，动画播放状态被设置为 `paused`，实现暂停。

还可以将数据属性选择器与 CSS 自定义属性结合起来。给元素应用动画时，应尽可能使用 CSS 的 `animation` 简写属性，并将 CSS 自定义属性引入进来作为 `animation` 每个子属性的值，此时每个子属性具有一个变量值：

```CSS
[data-animation] {
    animation:
        var(--animn, none)        /* 动画名称 animation-name, 初始值为 none */
        var(--animdur, 1s)        /* 动画持续时间 animation-duration, 初始值为 1s */
        var(--animtf, linear)     /* 动画缓动函数 animation-timing-function, 初始值为 linear */
        var(--animdel, 0s)        /* 动画延迟时间 animation-delay, 初始值为 0s */
        var(--animdir, alternate) /* 动画方向 animation-direction, 初始值为 alternate */
        var(--animic, infinite)   /* 动画播放次数 animation-iteration-count, 初始值为 infinite */
        var(--animfm, none)       /* 动画填充查式 animation-fill-mode，初始值为 none */
        var(--animps, running)    /* 动画播放方式 animation-play-state，初始值为 running */
}
```

有了这个设置，任何具有 `[data-animation]` 数据属性的元素都准备好接受动画，并且可以用自定义属性控制动画的各个方面（参数）。某些动画可能有共同之处（如持续时间、缓动函数等），因此在自定义属性上设置了回退值。回退值相当于 `animation` 各子属性的初始值，例如 `--animdur` 的回退值是 `1s`，相当于 `animation-duration: 1s`；若 CSS 代码中没有重新给 `--animdur` 设置值，它将取回退值 `1s`。

使用 CSS 自定义属性有两个明显的好处：其一，可以在 CSS 和 JavaScript 中读取和设置它们；其二，有助于显著减少 CSS 代码量。并且可以在 `@keyframes` 中设置它们。

对于动画本身，使用类选择器，并从 `[data-animation]` 属性选择器中更新变量（自定义属性的值）：

```HTML
<div class="animated square a-slide" data-animation></div>
<div class="animated circle a-pulse" data-animation></div>
```

同时使用类和属性选择器的原因在于：此阶段 `data-animation` 属性虽然可以是一个普通的类，但在更高级的用法中属性选择器会发挥更大作用。`.animated`、`.square` 和 `.circle` 类名实际上与动画无关，它们只用于设置元素样式：

```CSS
.animated {
    display: grid;
    place-content: center;
    padding: 1rem;
    width: 100px;
    
    &.square {
        aspect-ratio: 1;
    }
    
    &.circle {
        aspect-ratio: 1;
        border-radius: 50%;
    }
}
```

`.a-slide` 和 `.a-pulse` 两个类名表示它们引用不同的两个关键帧动画，只需在各自对应的代码块中更新将发生变化的值：

```CSS
@keyframes slide {
    to {
       translate: 600px; 
    }
}

@keyframes pulse {
    0% { 
        scale:1; 
    }
    25% { 
        scale:.9; 
    }
    50% { 
        scale:1; 
    }
    75% { 
        scale:1.1; 
    }
    100% { 
        scale:1; 
    }
}

.a-slide {
    --animn: slide;
    --animdur: 3s;
}

.a-pulse {
    --animn: pulse;
}
```

> Demo 地址：https://codepen.io/airen/full/eYxjjON

如果在 `[data-animation]` 选择器的回退值中使用一些常见值，通常只需要更新动画名称自定义属性 `--animn` 即可。

这个示例展示了 CSS 自定义属性和属性选择器能显著减少 CSS 代码编写量。更进一步，若希望让页面上所有设置了 `data-animation` 属性的动画元素暂停播放，只需将 `--animps` 自定义属性的值设置为 `paused`。

CSS 或 JavaScript 都可以实现，使用 CSS 时可能需要在 HTML 中添加一两行代码。例如在页面上提供一个动画暂停/恢复切换按钮（如一个复选框），把控制权交给用户：用户选中复选框，设置了 `data-animation` 数据属性的动画暂停播放；再次点击复选框，暂停的动画恢复播放。

使用 CSS 实现时，需要在 `[data-animation]` 元素前添加一个复选框元素：

```HTML
<input type="checkebox" data-animation-pause name="play-state" id="play-state" />
<div class="animated square a-slide" data-animation></div>
<div class="animated circle a-pulse" data-animation></div>
```

不一定完全遵守这样的结构规则，只是不遵守时代码量会增加不少。在此基础上，可以通过复选框的 `:checked` 状态选择器来调整 `--animps` 自定义属性的值：

```CSS
[data-animation-pause]:checked ~ [data-animation] {
    --animps: paused;
}
```

用户选中复选框时，页面上设置了 `data-animation` 数据属性的元素上应用的动画都会暂停播放；再次点击复选框时，它们又恢复播放：

> Demo 地址：https://codepen.io/airen/full/eYxjjzJ

注意，该示例源码中使用的 HTML 结构更复杂，对应的 CSS 选择器也做了相应调整——示例使用了 `:has()` 和 `:checked` 相结合：

```CSS
.forms:has(:checked) ~ .container [data-animation] {
    --animps: paused;
}
```

这样做是为了美化复选框样式。实际使用时应根据业务场景做出相应调整，不可千篇一律。

同样可以用 JavaScript 调整 `--animps` 自定义属性的值。使用 JavaScript 时，复选框或其他元素（如 `<button>`）在 HTML 结构中的顺序和嵌套层级就没有太多要求。以复选框为例，只需添加以下几行代码：

```JavaScript
const forms = document.querySelector(".forms");
const animatedEles = document.querySelectorAll("[data-animation]");
const player = document.querySelector("input[data-animation-paused]");

forms.addEventListener("change", (etv) => {
    if (etv.target.type === "checkbox") {
        /* 选中暂停动画播放 */
        if (player.checked) {
            animatedEles.forEach((animated) => {
                animated.style.setProperty(`--animps`, "paused");
            });
        } else { /* 未选中恢复动画播放 */
            animatedEles.forEach((animated) => {
                animated.style.setProperty(`--animps`, "running");
            });
        }
    }
});
```

最终效果一致：

> Demo 地址：https://codepen.io/airen/full/vYbaaxr

##### 用 <details> 元素切换播放状态

HTML 中的 `<details>` 元素也可用于切换动画状态。`<details>` 可以制作手风琴、提示框、下拉菜单等常见 Web 组件，它有一个 `open` 属性和一个 `toggle` 事件。与复选框技巧类似，它非常适合切换状态（如动画的暂停和恢复播放），而且更简单：

```CSS
details[open] {
    --animps: running;
}

details:not([open]) {
    --animps: paused;
}
```

以 `<details>` 制作的提示框为例：

```HTML
<details class="tooltip">
    <summary><svg></svg>3 days ago</summary>
    <p data-animation>November 27th, 2023</p>
</details>
```

给 `<details>` 的子元素 `<p>` 的显示添加动画效果，默认暂停播放；只有当 `<details>` 的 `open` 为 `true`（展开状态）时，`p` 元素应用一个 `slideInDown` 动画并处于恢复播放状态，且该动画只播放一次：

```CSS
@layer animation {
    @keyframes slideInDown {
        0% {
            opacity: 0;
            translate: 0 -100%;
        }
        100% {
            opacity: 1;
            translate: 0 0;
        }
    }

    [data-animation] {
        --animps: paused;
        animation: 
            var(--animn, none) 
            var(--animdur, 1s) 
            var(--animtf, linear)
            var(--animdel, 0s) 
            var(--animdir, alternate) 
            var(--animic, infinite)
            var(--animfm, none) 
            var(--animps, running);
    }

    details[open] [data-animation] {
        --animn: slideInDown;
        --animps: running;
        --animfm: forwards;
        --animdur: 0.2s;
        --animic: 1;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/dyajqKx

这个示例中，用户再次点击 `<details>` 元素时，其子元素 `p` 出现时并不具备第一次点击那样的动画效果。原因在于 `<details>` 的内在机制：`display` 从 `block` 到 `none` 的过程属于离散型过渡属性，要给这类属性添加过渡或动画效果需要额外处理，相关内容可参考帧动画与过渡动画的专题讨论。

基于这个基础可以构建 `<details>` 版幻灯片组件。[这个案例由 @Mads Stoumann 提供](https://codepen.io/stoumann/full/NWRGavM)：

> Demo 地址：https://codepen.io/airen/full/RwvBeVp

构建该效果需要如下 HTML 结构：

```HTML
<div class="c-mm">
    <details>
        <summary class="c-mm__play"><span data-css-icon="play"><i></i></span></summary>
        <span hidden></span>
    </details>

    <div class="c-mm__inner">
        <figure class="c-mm__frame" style="--_animn:kenburns-bottom-left;--index:1;" data-animation="frame">
            <img class="c-mm__img" data-animation="figure" src="https://picsum.photos/1024/768?random=1" />
            <figcaption data-caption="bottom left">Holiday Memories<div>Bornholm</div></figcaption>
        </figure>
    
        <!-- 省略其他 figure -->
    
        <figure class="c-mm__frame" style="--_animn:kenburns-bottom-left;--index:10;" data-animation="frame">
            <img class="c-mm__img" data-animation="figure" src="https://picsum.photos/1024/768?random=10" />
            <figcaption data-caption="bottom left">Sunset At Bokul<div>Gudhjem</div></figcaption>
        </figure>
    </div>
</div>
```

这里使用 `<details>` 元素主要用于切换动画播放状态，也可以根据需要换成复选框，两者效果相同，只不过利用 `<details>` 元素的 `open` 属性更简单一点。

示例中每张幻灯片有两个动画：

-   所有 `<figure>` 元素应用同一个关键帧动画 `autoplay`，即 `--animn` 自定义属性的值为 `autoplay`
-   每个 `<img>` 元素应用不同的关键帧动画，动画名称在 `<figure>` 元素的内联样式中声明，即代码中的 `--_animn`，它有不同的值

所有需要动画化的元素上都设置了 `data-animation` 属性，并根据具体场景指定了不同的值：

-   `<figure>` 元素上的 `data-animation` 指定的值为 `frame`
-   `<img>` 元素上的 `data-animation` 指定的值为 `figure`

指定什么值并不重要，可根据喜好设置。关键是像前面那样通过 CSS 属性选择器和 CSS 自定义属性给动画化元素应用 `animation`，并根据需要调整已定义的自定义属性的值：

```CSS
[data-animation] {
    animation: 
        var(--animn, none) 
        var(--animdur, 1s) 
        var(--animtf, linear)
        var(--animdel, 0s) 
        var(--animdir, alternate) 
        var(--animic, infinite)
        var(--animfm, none) 
        var(--animps, running);
}

.c-mm {
    --_animdur: 18000ms;
    --animtf: ease-out;
    --slides: 20;
}

.c-mm__frame {
    --animn: autoplay;
    --animps: paused;
    --_img-animps: paused;
    --index: 1;
    --animdur: var(--_animdur);
    --animdel: calc(((var(--index) - 1) * var(--_animdur)) / 3);
}

.c-mm__img {
    --animdur: calc(var(--_animdur) / 1.5);
    --animfm: both;
    --animn: var(--_animn);
    --animps: var(--_img-animps);
}
```

动画名称由 `--animn` 定义：`<figure>`（`.c-mm__frame`）上的值是 `autoplay`，`<img>`（`.c-mm__img`）上的值是 `--_animn` 自定义属性（在 `figure` 元素上以内联方式声明）。

动画播放状态由 `--animps` 控制，次要动画（应用于 `<img>` 元素的动画）的播放状态则由 `--_img-animps` 属性控制。此外，根据动画效果所需，持续时间 `--animdur`、延迟时间 `--animdel` 和填充模式 `--animfm` 都有所差异。

为防止 CPU 和 GPU 过载，动画在播放之前最好处于暂停状态：

```CSS
.c-m__frame {
    --animps: paused;      /* 应用于主动画，figure 元素上的动画 */
    --_img-animps: paused; /* 应用于次动画， img 元素上的动画 */
}

.c-m__img {
    --animps: var(--_img-animps);
}

/* details 处于折叠状态（未打开） */
details:not([open]) ~ .c-mm__inner .c-mm__frame {
    --animps: paused;
    --_img-animps: paused !important;
}
```

更重要的是，次要动画的初始播放状态（`--_img-animps`）需要被设置为 `paused`，即使主动画正在运行：

```CSS
/* details 元素处于展开状态（已打开）*/
details[open] ~ .c-mm__inner .c-mm__frame {
    --animps: running;      /* 主动画（应用在 figure 元素上的动画）恢复播放 */
    --_img-animps: paused;  /* 次动画（应用在 img 元素上的动画）继续暂停 */
}
```

次要动画播放状态的切换在主动画 `autoplay` 的关键帧中进行：

```CSS
@keyframes autoplay {
    0.1% {
        --_img-animps: running; /* 次要动画恢复播放 */
        opacity: 0;
        z-index: calc(var(--z) + var(--slides));
    }
    5% {
        opacity: 1;
    }
    50% {
        opacity: 1;
    }
    51% {
        --_img-animps: paused; /* 次要动画暂停播放 */
    }
    100% {
        opacity: 0;
        z-index: var(--z);
    }
}
```

为了使这个效果能在除 Chrome 之外的浏览器中正常工作，`--_img-animps` 的初始值需要设置为 `running`，因为它们无法从 `@keyframe` 更新 CSS 自定义属性：

```CSS
details[open] ~ .c-mm__inner .c-mm__frame {
    --animps: running;
    --_img-animps: running;
}
```

注意，示例中的次要动画通过 [Animista](https://animista.net/) 工具获取，它类似于 [animate.style](https://animate.style/)，可以在线获得 CSS 关键帧动画：

> URL：https://animista.net/

示例对获得的关键帧代码做了微调，即用单个变换属性替换了原来的 `transform` 组合值。最终动画相关的核心代码如下：

```CSS
@layer animation {
    @keyframes autoplay {
        0.1% {
            --_img-animps: running;
            opacity: 0;
            z-index: calc(var(--z) + var(--slides));
        }
        5% {
            opacity: 1;
        }
        50% {
            opacity: 1;
        }
        51% {
            --_img-animps: paused;
        }
        100% {
            opacity: 0;
            z-index: var(--z);
        }
    }
    
    @keyframes kenburns-top {
        0% {
            scale: 1;
            translate: 0 0;
            transform-origin: 50% 16%;
        }
        100% {
            scale: 1.25;
            translate: 0 -15px;
            transform-origin: top;
        }
    }
    
    @keyframes kenburns-top-right {
        0% {
            scale: 1;
            translate: 0 0;
            transform-origin: 84% 16%;
        }
        100% {
            scale: 1.25;
            translate: 20px -15px;
            transform-origin: right top;
        }
    }
    
    @keyframes kenburns-right {
        0% {
            scale: 1;
            translate: 0 0;
            transform-origin: 84% 50%;
        }
        100% {
            scale: 1.25;
            translate: 20px 0;
            transform-origin: right;
        }
    }
    
    @keyframes kenburns-bottom-right {
        0% {
            scale: 1;
            translate: 0 0;
            transform-origin: 84% 84%;
        }
        100% {
            scale: 1.25;
            translate: 20px 15px;
            transform-origin: right bottom;
        }
    }
    
    @keyframes kenburns-bottom {
        0% {
            scale: 1;
            translate: 0 0;
            transform-origin: 50% 84%;
        }
        100% {
            scale: 1.25;
            translate: 0 15px;
            transform-origin: bottom;
        }
    }
    
    @keyframes kenburns-bottom-left {
        0% {
            scale: 1;
            translate: 0 0;
            transform-origin: 16% 84%;
        }
        100% {
            scale: 1.25;
            translate: -20px 15px;
            transform-origin: left bottom;
        }
    }
    
    @keyframes kenburns-left {
        0% {
            scale: 1;
            translate: 0 0;
            transform-origin: 16% 50%;
        }
        100% {
            scale: 1.25;
            translate: -20px 15px;
            transform-origin: left;
        }
    }
    
    @keyframes kenburns-top-left {
        0% {
            scale: 1;
            translate: 0 0;
            transform-origin: 16% 16%;
        }
        100% {
            scale: 1.25;
            translate: -20px -15px;
            transform-origin: top left;
        }
    }
    
    [data-animation] {
        animation: 
            var(--animn, none) 
            var(--animdur, 1s) 
            var(--animtf, linear)
            var(--animdel, 0s) 
            var(--animdir, alternate) 
            var(--animic, infinite)
            var(--animfm, none) 
            var(--animps, running);
    }

    .c-mm {
        --_animdur: 18000ms;
        --animtf: ease-out;
        --slides: 20;
    }

    .c-mm__frame {
        --animn: autoplay;
        --animps: paused;
        --_img-animps: paused;
        --index: 1;
        --animdur: var(--_animdur);
        --animdel: calc(((var(--index) - 1) * var(--_animdur)) / 3);
    }

    .c-mm__frame:nth-last-child(3):first-child,
    .c-mm__frame:nth-last-child(3):first-child ~ .c-mm__frame {
        --animdur: var(--_animdur);
    }
    
    .c-mm__frame:nth-last-child(4):first-child,
    .c-mm__frame:nth-last-child(4):first-child ~ .c-mm__frame {
        --animdur: calc((4 / 3) * var(--_animdur));
    }
    
    .c-mm__frame:nth-last-child(5):first-child,
    .c-mm__frame:nth-last-child(5):first-child ~ .c-mm__frame {
        --animdur: calc((5 / 3) * var(--_animdur));
    }
    
    .c-mm__frame:nth-last-child(6):first-child,
    .c-mm__frame:nth-last-child(6):first-child ~ .c-mm__frame {
        --animdur: calc((6 / 3) * var(--_animdur));
    }
  
    .c-mm__frame:nth-last-child(7):first-child,
    .c-mm__frame:nth-last-child(7):first-child ~ .c-mm__frame {
        --animdur: calc((7 / 3) * var(--_animdur));
    }
    
    .c-mm__frame:nth-last-child(8):first-child,
    .c-mm__frame:nth-last-child(8):first-child ~ .c-mm__frame {
        --animdur: calc((8 / 3) * var(--_animdur));
    }
    
    .c-mm__frame:nth-last-child(9):first-child,
    .c-mm__frame:nth-last-child(9):first-child ~ .c-mm__frame {
        --animdur: calc((9 / 3) * var(--_animdur));
    }
    
    .c-mm__frame:nth-last-child(10):first-child,
    .c-mm__frame:nth-last-child(10):first-child ~ .c-mm__frame {
        --animdur: calc((10 / 3) * var(--_animdur));
    }

    .c-mm__img {
        --animdur: calc(var(--_animdur) / 1.5);
        --animfm: both;
        --animn: var(--_animn);
        --animps: var(--_img-animps);
    }

    details[open] ~ .c-mm__inner .c-mm__frame {
        --animps: running;
        --_img-animps: running;
    }
    
    details:not([open]) ~ .c-mm__inner .c-mm__frame {
        --animps: paused;
        --_img-animps: paused !important;
    }
    
    details:not([open]) ~ .c-mm__inner .c-mm__frame:first-of-type {
        opacity: 1;
    }
}
```

注意，上面代码中 `kenburns-*` 系列关键帧动画的 `0%` 选择器对应的 `scale: 1` 和 `translate: 0 0` 可以省略不写。

也可以将 `<details>` 替换为复选框，只需更改部分代码即可实现同样效果：

```CSS
[name="slideshow"]:checked ~ .c-mm__inner .c-mm__frame {
    --animps: running;
    --_img-animps: running;
}

[name="slideshow"]:not(:checked) ~ .c-mm__inner .c-mm__frame {
    --animps: paused;
    --_img-animps: paused !important;
}

[name="slideshow"]:not(:checked) ~ .c-mm__inner .c-mm__frame:first-of-type {
    opacity: 1;
}
```

> Demo 地址：https://codepen.io/airen/full/QWYBzqp

#### 通过媒体查询控制动画暂停和恢复播放

很多设备都提供了用户偏好设置。有些人不喜欢在 Web 应用或页面上看到动画，或希望减少动画效果，他们会在设备上勾选相关选项来禁用或减少动画。

当用户勾选了 "Reduce motion" 选项，就会告诉终端：不希望在应用中看到动画效果，或希望减少动画效果。

Web 开发者可以通过媒体查询获取用户在设备上的相关设置。例如 `prefers-reduced-motion` 媒体查询用于检测用户的系统是否开启了动画减弱功能，该媒体查询特性接受两个值：

-   **`no-preference`**：用户未修改系统动画相关特性
-   **`reduce`**：用户修改了系统设置，将动画效果最小化，最好所有不必要的动画都能被移除

一种通用的全局处理方式：

```CSS
@media (prefers-reduced-motion: reduce) {
    *,
    ::before,
    ::after {
        animation-delay: -1ms !important;
        animation-duration: 1ms !important;
        animation-iteration-count: 1 !important;
        background-attachment: initial !important;
        scroll-behavior: auto !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
    }
}
```

因此也可以通过 `prefers-reduced-motion` 来控制动画的暂停和恢复播放：用户设备勾选了 "Reduce motion" 选项，表示不希望看到动画，可将 `--animps` 自定义属性的值设置为 `paused`；反之，用户未勾选，则将 `--animps` 设置为 `running`。

```CSS
[data-animation] {
    animation: 
        var(--animn, none) 
        var(--animdur, 1s) 
        var(--animtf, linear)
        var(--animdel, 0s) 
        var(--animdir, alternate) 
        var(--animic, infinite)
        var(--animfm, none) 
        var(--animps, running);
}

@media (prefers-reduced-motion: reduce) {
    [data-animation] {
        --animps: paused;
    }
}
```

用同样的方式，还可以通过自定义数据属性 `data-animation` 指定的值给动画设置不同的降级效果，比如将动画替换成一个简单的备用动画、只播放一次、以很慢的速度运行（甚至慢到似乎没有动画效果），或暂停动画播放：

```HTML
<div class="animated" data-animation="alternate">
    <!-- 替换成一个简单的备用动画 -->
</div>

<div class="animated" data-animation="once">
    <!-- 动画只播放一次 -->
</div>

<div class="animated" data-animation="slow">
    <!-- 动画播放速度较慢 -->
</div> 

<div class="animated" data-animation="slowly">
    <!-- 动画播放速度非常慢，慢到你无法感觉到它在运动 -->
</div>   

<div class="animated" data-animation="stop">
    <!-- 动画暂停播放 -->
</div>   
```

```CSS
[data-animation] {
    animation: 
        var(--animn, none) 
        var(--animdur, 1s) 
        var(--animtf, linear)
        var(--animdel, 0s) 
        var(--animdir, alternate) 
        var(--animic, infinite)
        var(--animfm, none) 
        var(--animps, running);
}

@media (prefers-reduced-motion: reduce) {
    [data-animation="alternate"] {
        --animn: opacity;
    }
    
    [data-animation="once"]{
        --animic: 1;
    }
    
    [data-animation="slow"]{
        --animdur: 10s;
    }
    
    [data-animation="slowly"]{
        --animdur: 99999999s;
    }
    
    [data-animation="stop"]{
        --animps: paused;
    }
}
```

> Demo 地址：https://codepen.io/airen/full/abXjxJj

注意，媒体查询 `prefers-reduced-motion` 已属于动画可访问性话题，它检测的正是用户系统中"减少动画"的偏好设置。

### JavaScript 如何控制动画暂停和恢复播放

CSS 自定义属性作为 `animation` 各子属性的值有一个优势：JavaScript 可以很容易读取这些自定义属性的值，也可以给它们重置新值。它与复选框或 `<details>` 元素的方式相似，不同之处在于通过脚本重置定义在 `[data-animation]` 上的 `--animps` 属性的值。

例如：

```HTML
<div class="animated" data-animation></div>
<!-- 省略其他的带有 data-animation 数据属性的元素 -->
<div class="animated" data-animation></div>

<button class="toggle">Toggle Animation</button>
```

```
[data-animation] {
    animation: 
        var(--animn, none) 
        var(--animdur, 1s) 
        var(--animtf, linear)
        var(--animdel, 0s) 
        var(--animdir, alternate) 
        var(--animic, infinite)
        var(--animfm, none) 
        var(--animps, running);
}
```

通过下面这段 JavaScript 脚本，可以将 `--animps` 自定义属性的值重置为 `paused`，暂停正在播放的动画。注意，是暂停带有 `data-animation` 数据属性的动画元素的动画播放：

```JavaScript
const toggle = document.querySelector(".toggle");
const animatedEles = document.querySelectorAll("[data-animation]");

toggle.addEventListener('click', () => {
    animatedEles.forEach(animated => {
        const running = getComputedStyle(animated).getPropertyValue("--animps") || 'running';
        animated.style.setProperty('--animps', running === 'running' ? 'paused' : 'running');
    })
})
```

> Demo 地址：https://codepen.io/airen/full/MWLBMYW

除了上述方法，还可以使用 `IntersectionObserver` API 来暂停和恢复所有 `[data-animation]` 的动画。

首先确保 `[data-animation]` 元素上的动画都处于暂停播放状态：

```CSS
[data-animation] {
    animation: 
        var(--animn, none) 
        var(--animdur, 1s) 
        var(--animtf, linear)
        var(--animdel, 0s) 
        var(--animdir, alternate) 
        var(--animic, infinite)
        var(--animfm, none) 
        var(--animps, running);
}

[data-animation] {
    --animps: paused;
}
```

然后使用 `IntersectionObserver` 创建一个观察器，元素在视口中达到 `25%` 或 `75%` 时触发。达到 `75%` 时动画开始播放（`--animps` 为 `running`），否则暂停（`--animps` 为 `paused`）：

```JavaScript
const IO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            const state = (entry.intersectionRatio >= 0.75) ? 'running' : 'paused';
            entry.target.style.setProperty('--animps', state);
        }
    });
}, {
    threshold: [0.25, 0.75]
});

const animatedEles = document.querySelectorAll("[data-animation]");

animatedEles.forEach(animated => {
    IO.observe(animated);
})
```

> Demo 地址：https://codepen.io/airen/full/poGZXdJ

利用这种方式可以实现滚动触发 CSS 动画，而无需任何 JavaScript 库：

> Demo 地址：https://codepen.io/airen/full/VwgBoZV

注意，现代 CSS 中可以使用原生的 CSS 方法实现滚动驱动动效，但该话题超出本文范畴，不再展开。

## 重播 CSS 动画

前文介绍了 CSS 和 JavaScript 如何控制动画的暂停和恢复播放，但 CSS 动画的重新播放是另一个问题。注意，重新播放和恢复播放是两个完全不同的概念：

-   恢复播放是指从暂停的地方继续向前播放
-   重新播放是指从头开始播放

CSS 的 `animation-play-state` 属性并没有一个叫 `restart` 的值。CSS 没有内置的方法来停止动画并让它从头开始播放；即使动画运行完成且未设置循环，重新启动该动画也并非易事。

到目前为止，要使动画重新开始，只能借助 JavaScript 脚本。例如：

```HTML
<div class="animated"></div>
<button class="restart">Restart Animation</button>
```

```CSS
@layer animation {
    @keyframes slide {
        to {
            translate: calc(60vw - 3.5rem);
        }
    }

    .animated {
        animation: slide 1s cubic-bezier(.17, .67, .32, 1.55) 1 both;
    }
}
```

在没有添加任何 JavaScript 脚本的情况下，应用在 `.animated` 元素上的 `slide` 动画只会运行一次，持续运行 `1s` 之后，元素停留在容器右侧。

通过 JavaScript 给按钮绑定点击事件（`click`），并执行以下代码：

```JavaScript
const restart = document.querySelector(".restart");
const animated = document.querySelector(".animated");

restart.addEventListener('click', () => {
    animated.style.animationName = "none";
    requestAnimationFrame(() => {
        setTimeout(() => {
            animated.style.animationName = ""
        }, 0);
    });
})
```

> Demo 地址：https://codepen.io/airen/full/bGzxeKP

动画播放完或正在播放时，只要点击按钮，动画就会从头开始重新播放。

关键技巧在于：CSS 动画只有在与之关联的关键帧存在时才执行所有类似动画的操作。将 `animation-name` 属性设置为 `none`，即断开了与关键帧的链接，使动画停止；再将 `animation-name` 设置为空，即告诉浏览器回退到最初在 CSS 中设置的 `animation-name` 值。为确保关键帧先在一帧中被分离、再在另一帧中重新附加，需要插入人为的延迟——这里采用 `requestAnimationFrame`，再加上一点 `setTimeout` 以处理跨浏览器的怪异行为。

也可以将上述代码封装成一个简单的函数：

```JavaScript
const restartAnimation = (aniEle, animn) => {
    aniEle.style.animationName = "none";
    requestAnimationFrame(() => {
        setTimeout(() => {
            aniEle.style.animationName = '' || `${animn}`;
        }, 0);
    });
};
```

需要重启动画时调用就方便得多：

```JavaScript
const restart = document.querySelector(".restart");
const animated = document.querySelector(".animated");

restart.addEventListener("click", () => {
    restartAnimation(animated, 'slide');
});
```

与控制动画的暂停和恢复播放一样，也可以通过 JavaScript 控制 CSS 自定义属性的值（如 `--animn`）。脚本相似，唯一区别是要传一个具体的值给 `--animn` 自定义属性，而不能是空值：

```CSS
@layer animation {
    [data-animation] {
        animation: 
            var(--animn, none)        /* 动画名称 animation-name, 初始值为 none */
            var(--animdur, 1s)        /* 动画持续时间 animation-duration, 初始值为 1s */
            var(--animtf, linear)     /* 动画缓动函数 animation-timing-function, 初始值为 linear */
            var(--animdel, 0s)        /* 动画延迟时间 animation-delay, 初始值为 0s */
            var(--animdir, alternate) /* 动画方向 animation-direction, 初始值为 alternate */
            var(--animic, infinite)   /* 动画播放次数 animation-iteration-count, 初始值为 infinite */
            var(--animfm, none)       /* 动画填充查式 animation-fill-mode，初始值为 none */
            var(--animps, running);   /* 动画播放方式 animation-play-state，初始值为 running */
    }

    @keyframes slide {
        to {
            translate: calc(60vw - 3.5rem);
        }
    }

    .animated {
        --animn: slide;
        --animic: 1;
        --animfm: both;
    }
}
```

```JavaScript
const restart = document.querySelector(".restart");
const animated = document.querySelector(".animated");

restart.addEventListener("click", () => {
    restartAnimation(animated, 'slide');
});

const restartAnimation = (aniEle, animn) => {
    aniEle.style.setProperty(`--animn`, 'none');
    requestAnimationFrame(() => {
        setTimeout(() => {
            aniEle.style.setProperty(`--animn`, `${animn}`);
        }, 0);
    });
};
```

> Demo 地址：https://codepen.io/airen/full/xxMaOop

除此之外，还可以使用 `getAnimations() 函数`使 CSS 动画重新播放。给 `getAnimations()` 函数传入一个动画元素，该函数将循环遍历绑定到元素上的所有附加动画；对每个动画，通过取消（`cancel()`）加播放（`play()`）来重新启动它们，从而达到重启 CSS 动画的目的：

```JavaScript
const restartAnimations = (aniEl) => {
    aniEl.getAnimations().forEach((anim) => {
        anim.cancel();
        anim.play();
    });
};


const restart = document.querySelector(".restart");
const animated = document.querySelector(".animated");

restart.addEventListener("click", () => {
    restartAnimations(animated);
});
```

> Demo 地址：https://codepen.io/airen/full/MWLqjwp

## 动画的暂停、恢复和重新播放综合示例

综合运用数据属性 `[data-animation]`、CSS 自定义属性和简单的 JavaScript 代码，可以灵活控制 CSS 动画的暂停、恢复播放和从头重新播放。

**第一步**，在需要动画的元素上设置一个 `data-animation` 数据属性，可根据需要指定值，也可以不指定值：

```HTML
<div class="container">
    <div class="animated" data-animation>
        <!-- 我是一个需要动画化的元素 -->
    </div>
</div>
```

**第二步**，定义 CSS 自定义属性，这些自定义属性对应 `animation` 属性的各个子属性，并给所有自定义属性提供备用值（初始值）：

```CSS
[data-animation] {
    animation: 
        var(--animn, none)        /* 动画名称 animation-name, 初始值为 none */
        var(--animdur, 1s)        /* 动画持续时间 animation-duration, 初始值为 1s */
        var(--animtf, linear)     /* 动画缓动函数 animation-timing-function, 初始值为 linear */
        var(--animdel, 0s)        /* 动画延迟时间 animation-delay, 初始值为 0s */
        var(--animdir, alternate) /* 动画方向 animation-direction, 初始值为 alternate */
        var(--animic, infinite)   /* 动画播放次数 animation-iteration-count, 初始值为 infinite */
        var(--animfm, none)       /* 动画填充查式 animation-fill-mode，初始值为 none */
        var(--animps, running);   /* 动画播放方式 animation-play-state，初始值为 running */
}
```

**第三步**，假设动画元素 `.animated` 需要应用一个名为 `progress` 的关键帧动画，只需调整已定义的自定义属性的值：

```CSS
@keyframes progress {
    from {
        scale: 0 1;
    }
    to {
        scale: 1 1;
    }
}

.animated {
    --animn: progress;
    --animic: 1;
    --animfm: both;
}
```

此时 `.animated` 元素应用了 `progress` 关键帧动画，动画执行一次，播放完后停留在最后一帧的位置，呈现一个简单的进度条动画效果。

**第四步**，为了让用户方便地控制动画，添加三个按钮，分别控制 `progress` 动画的暂停、恢复播放和重新播放。

**最后**，使用 JavaScript 为暂停、恢复播放和重新播放分别封装函数，并绑定到相应的按钮上：

```JavaScript
const restartBtn = document.querySelector(".restart");
const pausedBtn = document.querySelector(".paused");
const playBtn = document.querySelector(".play");

const animated = document.querySelector(".animated");

// 暂停动画
const pausedAnimations = (aniEl) => {
    aniEl.style.setProperty(`--animps`, "paused");
};

// 恢复动画播放
const playAnimations = (aniEl) => {
    aniEl.style.setProperty(`--animps`, "running");
};

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

restartBtn.addEventListener("click", () => {
    restartAnimations(animated, "progress");
});

pausedBtn.addEventListener("click", () => {
    pausedAnimations(animated);
});

playBtn.addEventListener("click", () => {
    playAnimations(animated);
});
```

> Demo 地址：https://codepen.io/airen/full/OJdoRRJ

## 小结

控制 CSS 动画的播放方式以 CSS 关键帧动画为核心。对 CSS 关键帧动画，通过内置的 CSS 属性 `animation-play-state` 或其简写属性 `animation` 就能轻易实现动画的暂停和恢复播放。

CSS 的 `animation-play-state` 属性没有 `restart` 值，无法直接通过 CSS 内置方法使动画从头开始播放，但通过简单的 JavaScript 脚本即可实现重播。

此外，使用 CSS 属性选择器、CSS 自定义属性、媒体查询（`prefers-reduced-motion`）和 JavaScript（含 `IntersectionObserver`、`getAnimations()`），可以更好地控制动画的暂停、恢复播放和重新播放，为用户提供更好的体验。
