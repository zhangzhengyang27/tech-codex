---
title: 探索 SVG 动画的奇妙世界：深入了解 SMIL 动画
description: "SMIL（Synchronized Multimedia Integration Language）是 W3C 推荐的 XML 标记语言。本文系统介绍 SMIL 动画的概念、基本属性、动画元素（animate、set、animateMotion、animateTransform）与典型案例，并说明其兼容性现状与替代方案"
keywords: [探索, SVG, 动画的奇妙世界, 深入了解, SMIL]
category: CSS
tags: [CSS, 布局, 动画, 响应式]
---


# 探索 SVG 动画的奇妙世界：深入了解 SMIL 动画

## 概念说明

SVG 动画是一组用于让 SVG 图形产生动态效果的技术总称，主要包括三条实现路径：CSS 动画（`animation` / `transition`）、SMIL 声明式动画和 JavaScript 动画。其中 SMIL（Synchronized Multimedia Integration Language，同步多媒体集成语言）是 W3C 推荐的 XML 标记语言，通过专用动画元素直接内嵌在 SVG 文档中描述动画，无需编写脚本。

SMIL 动画的核心价值在于两点：一是能够处理 CSS 无法动画化的 SVG 属性（例如 `<path>` 元素的 `d` 属性）；二是当 SVG 作为 `<img>` 嵌入或用作 CSS `background-image` 时仍然生效，而 JavaScript 动画在这两种场景下不起作用。

::: tip 三种方案的适用边界
- 应用于 HTML 元素的 CSS 动画，基本上同样可以应用于 SVG 元素，覆盖大多数常规动画需求。
- 部分 SVG 属性只能通过 SMIL 进行修改和动画。SVG 元素由一组"表示属性"（presentation attributes）描述，其中一些可以通过 CSS 设置、修改和动画，另一些则不能，典型例子是路径元素的 `d` 属性。
- 当 SVG 以 `<img>` 或背景图方式引用时，文档内部不允许执行脚本，此时 SMIL 是唯一可用的动画方案。
:::

## SMIL 与 SMIL Animation 规范

[SMIL](https://www.w3.org/TR/SMIL3/)（Synchronized Multimedia Integration Language）是 W3C 推荐的 XML 标记语言，用于描述多媒体演示。它定义了用于定时、布局、动画、视觉过渡和媒体嵌入的标记，允许呈现文本、图像、视频、链接到其他 SMIL 演示以及来自多个 Web 服务器的文件等媒体项。SMIL 标记以 XML 编写，与 HTML 具有相似之处。

SMIL 的设计目标是提供一种描述时间和空间的结构，使多种媒体元素能够同步播放或呈现。其主要特点如下：

- **多媒体同步**：专注于实现文本、图像、音频和视频等多媒体元素在时间轴上的同步播放，以构建更复杂的多媒体呈现。
- **时间控制**：提供对时间的精确控制，允许定义动画、过渡以及媒体元素的出现和消失时间。
- **嵌套结构**：支持在文档中创建层次结构，以组织和控制多媒体元素之间的关系，提供更灵活的布局与设计选项。
- **与 XML 的兼容性**：作为基于 XML 的标记语言，SMIL 可以与 SVG、HTML 等其他 XML 技术集成使用。
- **声明式动画**：通过简单的 XML 标记即可描述元素的动态行为，无需编写大量 JavaScript 代码。

[SMIL Animation](https://www.w3.org/TR/REC-smil/smil-animation.html) 是基于 [SMIL](https://www.w3.org/TR/SMIL3/) 标准创建多媒体动画的规范子集，允许 Web 开发者定义和控制多媒体元素（图像、音频、视频等）的时间序列与交互。其关键特性包括：

- **时间轴控制**：通过定义时间轴上的关键帧和时刻，精确控制动画的开始时间、结束时间、持续时间等。
- **同步多媒体**：强调音频、视频、图形等元素在演示中的同步播放。
- **动画效果**：支持移动、缩放、旋转等各类动画效果，通过定义不同时间点的元素属性值实现。
- **嵌套结构**：允许嵌套不同的动画元素，构建具有层次结构的复杂动画序列。
- **与其他标准整合**：可与 SVG、HTML 等 Web 标准整合，在富媒体内容和交互式界面中使用。

::: info 学习重点
随着 HTML5 与 CSS3 的兴起以及 JavaScript 动画的广泛应用，SMIL 在 Web 中的使用逐渐减少，但它在需要强调多媒体元素同步性的场景中仍具优势。就学习 SVG 动画而言，SMIL Animation 比 SMIL 规范本身更为重要。
:::

### SVG、SMIL 和 SMIL Animation 之间的关系

三者的定位可以概括为：

- **[SVG](https://www.w3.org/TR/SVG2/)**：一种用于描述可伸缩矢量图形的 XML 标记语言，定义了一组图形元素，可用于创建静态和交互性图形，提供图形绘制和文本渲染的基本功能。
- **[SMIL](https://www.w3.org/TR/SMIL3/)**：一种用于创建同步多媒体演示的 XML 应用标准，描述多媒体元素之间的时间关系和同步。SVG 中的动画效果和时间控制可以通过整合 SMIL 来实现。
- **[SMIL Animation](https://www.w3.org/TR/REC-smil/smil-animation.html)**：SMIL 的一部分，专注于描述和控制动画效果，提供在文档中定义和控制动画序列的方式。

简单地说，SVG 图形可以使用动画元素进行动画处理。这些动画元素最初定义于 [SMIL Animation 规范](https://www.w3.org/TR/REC-smil/smil-animation.html#animationNS-BasicAnimationElements)，包括：

- **`<animate>`**：在 SVG 图形中定义各种动画效果，如平移、旋转、缩放、颜色变化等。
- **`<set>`**：为 SVG 图形的某个属性指定目标值，并在特定时间点应用。通常用于创建静态的、非交互式的属性更改。
- **`<animateMotion>`**：为元素指定运动路径，使元素沿路径移动，是定义元素动态运动的简便方法。
- **`<animateColor>`**：对 SVG 元素的颜色属性（如 `fill` 或 `stroke`）进行动画处理。该元素已被弃用，推荐使用 `<animate>` 元素直接定位可接受颜色值的属性；它仍存在于 [SVG 1.1 规范](https://www.w3.org/TR/SVG11/animate.html#AnimateColorElement)中并明确标注弃用，在 SVG 2 规范中已被完全删除。

除 SMIL 规范定义的动画元素外，SVG 还包括与之兼容的扩展：

- **`<animateTransform>`**：对 SVG 元素应用平移、缩放、旋转和倾斜等变换，并为变换属性创建平滑的动画效果。
- **`path`**（属性）：允许在 `<animateMotion>` 元素的 `path` 属性中使用 SVG 路径数据语法的任何特征（SMIL Animation 仅允许其子集）。
- **`<mpath>`**：用于指定一个路径元素，使其他动画元素（如 `<animateMotion>`）沿该路径运动，通常作为 `<animateMotion>` 的子元素，将运动路径与动画元素分离。
- **`keypoints`**（属性）：`<animateMotion>` 的属性，用于精确控制运动路径动画的速度。
- **`rotate`**（属性）：`<animateMotion>` 的属性，控制对象是否自动旋转，使其 `x` 轴指向运动路径的方向切线矢量（或相反方向）。该属性是沿路径运动正常工作的关键。

SVG 动画在性质上类似于 CSS 动画和过渡：创建关键帧、移动物体、改变颜色等，但它可以做到一些 CSS 动画无法做到的事情，后文将逐一介绍。

## 给 SVG 静态元素添加动画

使用 SVG 元素绘制的形状默认是静态的。例如，使用 `<rect>` 绘制一个 `40 x 40` 的矩形：

```SVG
<svg width="400" height="300" viewBox="0 0 400 300" class="element">
    <rect x="50" y="50" width="40" height="40" stroke="lime" fill="#3498db" stroke-width="2"/>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/eYXxbPe

该矩形没有任何动画效果。要为其添加动画，需要使用适当的 SVG 动画元素将动画嵌套进去。例如，使用 `<animate>` 元素对单一属性进行动画：

```SVG
<svg width="400" height="300" viewBox="0 0 400 300" class="element">
    <rect x="50" y="50" width="40" height="40" stroke="lime" fill="#3498db" stroke-width="2">
        <!-- 动画元素嵌套在这里 -->
        <animate attributeName="width" from="40" to="300" begin="0s" dur="5s" repeatCount="indefinite" fill="freeze" />
    </rect>
</svg>
```

嵌套的 `<animate>` 元素通过 `attributeName`、`from`、`to`、`begin`、`dur` 等属性定义动画行为，包括属性名称、起始值、结束值、开始时间和持续时间。动画元素嵌套在哪个元素内部，其作用范围就是哪个元素：上例中 `<animate>` 直接嵌套在 `<rect>` 元素内，因此被动画处理的是该矩形的 `width` 属性——矩形宽度在 `5s` 内从 `40` 个单位变化到 `300` 个单位，并不断重复播放：

> Demo 地址：https://codepen.io/airen/full/LYaqqeP

这种嵌套语法产生的是属性的线性变化。SVG 还提供了创建非线性或非插值动画的方法，即 `calcMode` 属性。以下示例演示颜色变化中 `calcMode` 的用法：

```SVG
<svg width="400" height="300" viewBox="0 0 400 300" class="element">
    <rect x="50" y="50" width="300" height="50" fill="#ffffff">
        <animate attributeName="fill" calcMode="linear" from="#ffffff" to="#ff3366" begin="1s" dur="5s" fill="freeze" />
    </rect>
    <rect x="50" y="150" width="300" height="50" fill="#ffffff">
        <animate attributeName="fill" calcMode="discrete" from="#ffffff" to="#ff3366" begin="1s" dur="5s" fill="freeze" />
    </rect>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/zYbeejb

示例创建了两个矩形，均带颜色变化动画。顶部矩形使用 `calcMode="linear"`，填充色（`fill`）在 `5s` 内从白色（`#ffffff`）线性过渡到玫红色（`#ff3366`）；底部矩形使用 `calcMode="discrete"`，填充色保持白色直到 `5s` 结束，然后突然切换为玫红色——即非插值变化，在动画结束时直接跳到目标值。

::: warning 两个 fill 属性的区别
应用在 `<animate>` 元素上的 `fill` 属性与应用在 SVG 元素（如 `<rect>`）上的 `fill` 属性作用不同。前者控制动画结束后元素如何"填充"状态；后者控制图形的填充颜色。若希望元素保留动画结束时的状态，需要在 `<animate>` 元素上显式设置 `fill="freeze"`，后文将详细介绍。
:::

`calcMode="discrete"` 在没有插值意义存在的场景中尤其重要，例如将 `visibility` 属性从 `visible` 更改为 `hidden` 或相反的场景。

`calcMode` 还有 `paced` 和 `spline` 两个可选值，用于实现不同类型的非线性动画。当值为 `paced` 时，动画在给定时间内均匀分布，整个动画周期保持匀速：

```SVG
<svg width="400" height="100" viewBox="0 0 400 100" class="element">
    <!-- 使用 calcMode="paced" 创建均匀分布的动画 -->
    <circle cx="50" cy="50" r="40" fill="lime">
        <animate attributeName="cx" values="50; 300" dur="4s" calcMode="paced" repeatCount="indefinite"/>
    </circle>
</svg>
```

示例中圆沿 `x` 轴从起点 `(50, 50)` 移动到终点 `(300, 50)`，由于 `calcMode` 设置为 `paced`，移动速度均匀：

> Demo 地址：https://codepen.io/airen/full/gOEqqqW

在 `spline` 模式下，可以使用 `keyTimes` 和 `keySplines` 属性定义动画的变化曲线，更精细地控制动画进度：

```SVG
<svg width="400" height="100" viewBox="0 0 400 100" class="element">
    <!-- 使用 calcMode="spline" 创建复杂路径的动画 -->
    <circle cx="50" cy="50" r="40" fill="lime">
        <animate attributeName="cx" values="50; 300" dur="4s" calcMode="spline" keyTimes="0; 1" keySplines="0.5 0 0.5 1" repeatCount="indefinite"/>
    </circle>
</svg>
```

示例中圆沿 `x` 轴从 `(50, 50)` 移动到 `(300, 50)`：`keyTimes` 属性指定关键时刻，`keySplines` 属性定义与这些时刻对应的贝塞尔曲线控制点，从而创建更复杂和自定义的运动节奏：

> Demo 地址：https://codepen.io/airen/full/yLwZZwQ

以下示例对比了 `calcMode` 四种不同模式带来的动画效果差异：

> Demo 地址：https://codepen.io/airen/full/bGZzzyL

除形状与颜色外，SVG 还允许随时间动画元素的许多属性：位置、透明度、可见性，以及 SVG 滤镜。下面的示例使用 `<feGaussianBlur>` 滤镜创建模糊效果，并通过 `<animate>` 元素改变模糊半径产生动画：

```SVG
<svg width="400" height="150" viewBox="0 0 400 150" class="element">
    <defs>
        <filter id="blurFilter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0" result="blurResult">
                <!-- 使用动画改变滤镜属性（模糊半径） -->
                <animate attributeName="stdDeviation" values="0;5;0" dur="2s" keyTimes="0;0.5;1" repeatCount="indefinite" />
            </feGaussianBlur>
        </filter>
    </defs>

    <!-- 创建矩形元素并应用滤镜 -->
    <rect x="10" y="10" width="380" height="130" fill="lime" filter="url(#blurFilter)" />
</svg>
```

`<feGaussianBlur>` 滤镜用于创建模糊效果，`<animate>` 元素动态改变其 `stdDeviation` 属性（模糊半径）：`values` 属性定义模糊半径在动画过程中的变化序列，`dur` 设置持续时间，`keyTimes` 指定关键时间点，`repeatCount="indefinite"` 表示无限循环：

> Demo 地址：https://codepen.io/airen/full/NWJoJWz

### 动画目标元素的两种指定方式

上述示例都将动画"封装"到目标元素内部，即目标元素是动画元素的直接父元素：

```SVG
<rect width="50" height="50">
    <animate />
</rect>
```

如果希望将动画元素与目标元素分开，可以通过 `xlink:href` 实现。该属性接受对当前 SVG 文档片段中目标元素的 `URI` 引用，被引用的目标元素将随时间被修改：

```SVG
<svg width="400" height="300" viewBox="0 0 400 300" class="element">
    <defs>
        <animate xlink:href="#animated" attributeName="width" from="40" to="300" begin="0s" dur="5s" repeatCount="indefinite" fill="freeze"  />
    </defs>
    <rect id="animated" x="50" y="50" width="40" height="40" stroke="lime" fill=" #3498db" stroke-width="2"  />
</svg>
```

`xlink:href="#animated"` 指定了动画的目标元素为 ID 为 `"animated"` 的矩形，其效果与下面这段嵌套写法完全相同：

```SVG
<svg width="400" height="300" viewBox="0 0 400 300" class="element">
    <rect x="50" y="50" width="40" height="40" stroke="lime" fill=" #3498db" stroke-width="2">
        <animate attributeName="width" from="40" to="300" begin="0s" dur="5s" repeatCount="indefinite" fill="freeze"/>
    </rect>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/ExMMKbr

至此已覆盖给 SVG 静态元素添加动画的基本方法。接下来需要明确动画元素上可用的动画属性。

## SVG 动画的基本属性

在 SVG 中为静态元素添加动画需要两个步骤：

- ① 指定动画目标元素：将动画元素（`<animate>`、`<animateTransform>`、`<animateMotion>` 等）嵌套在目标元素中，或通过 `xlink:href` 指定目标元素；
- ② 在动画元素上定义动画属性。

在 SVG 中定义动画与在 CSS 中定义动画非常相似：需要知道要动画化的内容是什么、动画何时开始、属性的起始值和结束值分别是什么。

### attributeName 与 attributeType：指定动画的目标属性

SVG 动画的目标属性通常由 `attributeName` 属性指定，其值为要动画化的属性名称：

```SVG
<svg width="400" height="20" viewBox="0 0 400 20" class="element">
    <rect width="400" height="20" fill="#356908" rx="10">
        <animate attributeName="width" from="0" to="400" dur="5s" repeatCount="indefinite" />
    </rect>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/XWGGjeg

示例中的绿色矩形（`#356908`）通过 `<animate>` 元素对 `width` 属性进行动画，`attributeName` 被设置为 `"width"`。

`attributeName` 只接受一个值而非值列表，因此一次只能对一个属性进行动画化。要同时动画化多个属性，需要定义多个动画元素。例如同时动画化矩形的宽度和填充颜色，需要在 `<rect>` 中嵌套两个 `<animate>` 元素：

```SVG
<svg width="400" height="20" viewBox="0 0 400 20" class="element">
    <rect width="400" height="20" fill="#356908" rx="10">
        <!-- 对 rect 元素的 width 属性进行动画化 -->
        <animate attributeName="width" from="0" to="400" dur="5s" repeatCount="indefinite" />
        <!-- 对 rect 元素的 fill 属性进行动画化 -->
        <animate attributeName="fill" from="#356908" to="#ff3366" dur="5s" repeatCount="indefinite" />
    </rect>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/LYaaRmB

在这一点上，CSS 比 SMIL 更具优势；但从另一个角度看，一次只定义一个属性名是有意义的，否则属性值列表可能过于复杂而难以维护。

在指定属性名称的同时，还可以通过 `attributeType` 属性指定动画要操作的属性所属的命名空间。SVG 动画中有两个主要命名空间：`CSS` 和 `XML`：

```SVG
<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect x="50" y="50" width="300" height="50" fill="lime">
        <!-- 通过 attributeType 属性，指定动画要操作的属性的命名空间是 XML -->
        <animate attributeType="XML" attributeName="width" from="50" to="300" dur="5s" repeatCount="indefinite"  />
    </rect>
    
    <rect x="50" y="100" width="300" height="50" fill="lime">
        <!-- 通过 attributeType 属性，指定动画要操作的属性的命名空间是 CSS -->
        <animate attributetype="CSS" attributename="opacity" from=".3" to="1" dur="5s"  repeatcount="indefinite" />
    </rect>    
</svg>
```

> Demo 地址：https://codepen.io/airen/full/PoLLGVo

如果要操作的属性是 CSS 属性，可将 `attributeType` 设置为 `"CSS"`（意味着该属性也可作为 CSS 属性找到）；其他属性则属于 `"XML"`。

如果 `attributeType` 未被明确设置或设置为 `auto`，浏览器会首先在 CSS 属性列表中搜索匹配的属性名称，找不到时再在元素的默认 XML 命名空间中搜索。因此实际应用中通常不需要显式设置 `attributeType`，浏览器会根据属性类型自动选择正确的命名空间。

### 动画的关键特征：from、to、dur、begin 与 fill

`from`、`to`、`dur`、`begin` 和 `fill` 等属性用于定义动画的关键特征：

```SVG
<svg width="400" height="120" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg" class="element">
    <circle cx="50" cy="60" r="50" fill="lime">
        <animate attributeName="cx" from="50" to="350" dur="2s" begin="click" fill="freeze" />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/LYaabVq

示例使用 `<animate>` 更改 `<circle>` 的 `cx` 属性（圆心横坐标），把圆从 `50`（起始位置）移动到 `350`（终点位置），整个过程持续 `2s`，并在动画结束后保持在最终状态：

- `from` 属性：`from="50"` 指定动画属性的起始值为 `50`。
- `to` 属性：`to="350"` 指定动画属性的结束值为 `350`。
- `dur` 属性：`dur="2s"` 指定动画的持续时间为 `2s`。

`from` 和 `to` 属性类似于 CSS `@keyframes` 中的 `from` 和 `to` 关键帧：

```CSS
@keyframes moveCircle {
    from {
        /* 起始值 */
    }
    to {
        /* 结束值 */
    }
}
```

`dur` 属性则类似于 CSS 中的 `animation-duration`：

```CSS
.animated {
    animation-duration: 2s;
}
```

`begin` 属性指定动画何时开始。上例中 `begin="click"` 表示圆将在点击时移动；该值也可以是时钟值，例如 `begin="0s"` 表示动画在页面加载后立即启动；设置为正的时钟值则延迟动画，例如 `begin="2s"` 表示页面加载 `2s` 后启动。`begin` 还可以接受 `click + 1s` 这类组合值，表示元素被点击 `1s` 后启动动画：

```SVG
<svg width="400" height="120" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg" class="element">
    <circle cx="50" cy="60" r="50" fill="lime">
        <animate begin="click + 1s" attributeName="cx" from="50" to="350" dur="2s"  fill="freeze" />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/JjzzEZb

`begin` 还可以设置为引用其他动画的值，从而在不必计算其他动画持续时间和延迟的情况下同步动画，后文将详细介绍这一特性。

动画结束后圆保持在最终位置，这是动画元素 `fill` 属性的作用。它类似于 CSS 的 `animation-fill-mode` 属性，指定动画结束后元素如何填充状态。SVG 中的取值与 CSS 相似但名称不同：

- `freeze`：动画结束后元素保持在动画的最终状态，即冻结在最后一帧上不再改变。
- `remove`（默认值）：动画结束后动画效果被移除，元素返回初始状态。

> Demo 地址：https://codepen.io/airen/full/yLwwgwL

### by：指定动画的相对偏移量

`by` 属性用于指定相对偏移，即动画属性相对于其初始值的偏移量。使用 `by` 可以定义相对于 `from` 或当前值的增量，而无需显式指定目标值 `to`：

```SVG
<svg width="400" height="150" viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg" class="element">
    <circle cx="50" cy="75" r="50" fill="orange">
        <!-- 将 cx 属性从当前值增加 300 -->
        <animate attributeName="cx" from="50" by="300" dur="2s" fill="freeze" begin="click" />
    </circle>
</svg>
```

示例中 `cx` 属性的初始值是 `50`，`by="300"` 使动画从当前值开始增加 `300`，最终位置为 `350`，与 `to="350"` 的效果等同：

```SVG
<svg width="400" height="150" viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg" class="element">
    <circle cx="50" cy="75" r="50" fill="orange">
        <animate attributeName="cx" from="50" to="350" dur="2s" fill="freeze" begin="click" />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/mdooRYK

`by` 属性在相对性动画和累积动画中特别有用：相对性动画中可以只指定相对于当前值的增量，无需知道元素的确切初始值；累积动画中多个动画可以基于之前动画的结果继续运算。

### restart：控制动画是否可以重新启动

`restart` 属性控制动画元素在其活动期间是否可以被重新启动。可选值有三种：

- `always`（默认值）：动画可以在任何时候重新启动，即使在其活动期间也可以。
- `whenNotActive`：动画只能在其非活动状态下重新启动，即活动结束后。若尝试在活动期间重新启动，该尝试将被忽略。
- `never`：元素在其父时间容器的当前简单持续时间内不能重新启动。在 SVG 中父时间容器是 SVG 文档片段，因此动画在文档持续时间内不能重新启动。

> Demo 地址：https://codepen.io/airen/full/BabbRB

### begin：命名动画并同步它们

`begin` 属性还可以用来命名动画并同步多个动画。给动画元素设置 `id` 属性即为动画命名，然后在其他动画的 `begin` 属性中引用这个 `id`，即可实现动画同步。以下示例演示了如何同步两个命名的动画：

```SVG
<svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" class="element">
    <!-- 圆形动画 -->
    <circle r="30" cx="50" cy="50" fill="orange">
        <animate begin="click" id="circ-anim" attributeName="cx" from="50" to="450" dur="5s"  fill="freeze"  />
    </circle>

    <!-- 矩形动画，开始时间与圆形动画同步 -->
    <rect width="50" height="50" x="25" y="200" fill="#0099cc">
        <animate begin="circ-anim.begin + 1s" id="rect-anim" attributeName="x" from="50" to="425" dur="5s"  fill="freeze"  />
    </rect>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/oNVVWbV

示例中圆形和矩形动画（嵌套在它们内部的 `<animate>`）分别有唯一的 `id`：`circ-anim` 和 `rect-anim`。矩形动画的 `begin` 属性设置为 `"circ-anim.begin + 1s"`，表示其开始时间与圆形动画的开始时间同步，并在此基础上延迟 `1s`。

类似地，可以使用 `end` 事件指定一个动画在另一个动画结束时开始：

```SVG
<svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" class="element">
    <!-- 圆形动画 -->
    <circle r="30" cx="50" cy="50" fill="orange">
        <animate begin="click" id="circ-anim" attributeName="cx" from="50" to="350" dur="5s"  fill="freeze"  />
    </circle>

    <!-- 矩形动画在圆形动画结束时开始 -->
    <rect width="50" height="50" x="25" y="200" fill="#0099cc">
        <animate begin="circ-anim.end + 0s" id="rect-anim" attributeName="x" from="50" to="350" dur="5s"  fill="freeze"  />
    </rect>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/BabbVWz

这种机制可以非常灵活地控制动画元素之间的时间关系，例如创建链式动画。先看一个最基础的动画：

```SVG
<svg width="400" height="300" viewBox="0 0 400 300" class="element">
    <rect x="10" y="10" width="30" height="30" fill="pink">
        <animate begin="2s" dur="10s" attributeName="width" from="10" to="380" />
    </rect>
</svg>
```

代码创建了一个矩形并应用动画：`2s` 后开始（`begin="2s"`），持续 `10s`，宽度从 `10` 逐渐增加到 `380`。

要将其扩展为链式动画，需要为 `<rect>`、`<animate>` 和新的 `<rect>` 元素添加 `id` 属性：

```SVG
<svg width="400" height="300" viewBox="0 0 400 300" class="element">
    <rect id="PinkRect" x="10" y="10" width="30" height="30" fill="pink" id="PinkRect">
        <animate id="PinkAnim" begin="2s" dur="10s" attributeName="width" from="10" to="380" />
    </rect>
    <rect id="limeRect" x="10" y="45" width="30" height="30" fill="lime">
        <animate begin="PinkAnim.begin + 2s" id="limeAnim" dur="10s" attributeName="width" from="10" to="380" />
    </rect>
</svg>
```

动画的执行顺序如下：SVG 文档加载完成两秒后，粉色矩形（`PinkRect`）由于以下代码开始动画：

```SVG
<animate id="PinkAnim" begin="2s" dur="10s" attributeName="width" from="10" to="380" />
```

动画元素的 `id` 为 `PinkAnim`。紧接着，另一个动画（`LimeAnim`）与该动画的开始时刻相链接：

```SVG
<animate begin="PinkAnim.begin + 2s" id="LimeAnim" dur="10s" attributeName="width" from="10" to="380" />
```

`begin="PinkAnim.begin + 2s"` 表示 `LimeAnim` 动画将在 `PinkAnim` 动画开始后的 `2s` 运行：

> Demo 地址：https://codepen.io/airen/full/wvOOXpg

类似地，还可以添加一个相对于 `PinkAnim` 动画结束时开始的动画：

```SVG
<svg width="400" height="300" viewBox="0 0 400 300" class="element">
    <rect id="PinkRect" x="10" y="10" width="30" height="30" fill="pink" id="PinkRect">
        <animate id="PinkAnim" begin="2s" dur="10s" attributeName="width" from="10" to="380" />
    </rect>
     
    <rect id="LimeRect" x="10" y="45" width="30" height="30" fill="lime">
        <animate begin="PinkAnim.begin + 2s" id="LimeAnim" dur="10s" attributeName="width" from="10" to="380" />
    </rect>

    <rect id="YellowRect" x="10" y="80" width="30" height="30" fill="yellow">
        <animate begin="PinkAnim.end + 2s" id="YellowAnim" dur="10s" attributeName="width" from="10" to="380" />
    </rect>
</svg>
```

运行上述代码：粉色矩形在文档加载完成两秒后开始动画；再过两秒，绿色矩形开始动画；粉色矩形动画完成后，再过两秒，黄色矩形开始动画。

> Demo 地址：https://codepen.io/airen/full/KKEEeOe

若要让三个矩形动画按顺序严格链接执行，可将第一个动画的结束作为第二个动画的开始，第二个动画的结束作为第三个动画的开始：

```SVG
<svg width="400" height="300" viewBox="0 0 400 300" class="element">
    <rect id="PinkRect" x="10" y="10" width="30" height="30" fill="pink" id="PinkRect">
        <animate id="PinkAnim" begin="2s" dur="10s" attributeName="width" from="10" to="380" />
    </rect>
    
    <rect id="LimeRect" x="10" y="45" width="30" height="30" fill="lime">
        <animate begin="PinkAnim.end" id="LimeAnim" dur="10s" attributeName="width" from="10" to="380" />
    </rect>

    <rect id="YellowRect" x="10" y="80" width="30" height="30" fill="yellow">
        <animate begin="LimeAnim.end" id="YellowAnim" dur="10s" attributeName="width" from="10" to="380" />
    </rect>
</svg>
```

这段代码中，第一个动画（粉色矩形）开始于文档加载后 `2s`，第二个动画（绿色矩形）开始于第一个动画的结束，第三个动画（黄色矩形）开始于第二个动画的结束：

> Demo 地址：https://codepen.io/airen/full/GReeBZm

以此类推，可以轻易制作出交错动画。

### end：指定动画的结束时间

除了指定动画何时开始，`end` 属性还可以指定动画何时结束，例如将动画设置为无限重复，然后在另一个元素开始动画时停止它。`end` 属性接受与 `begin` 类似的值：绝对或相对时钟值、偏移量、重复值、事件值等。

以下演示中，粉色矩形（`PinkRect`）的宽度在 `5s` 内从 `50` 缓慢变为 `380`；绿色矩形（`LimeRect`）只有在点击时才触发动画；粉色矩形的动画将在绿色矩形的动画开始时结束：

```SVG
<svg width="400" height="110" viewBox="0 0 400 110" class="element">
    <!-- 点击绿色矩形时，粉色矩形动画将结束 -->
    <rect id="PinkRect" x="10" y="20" width="30" height="30" fill="pink" id="PinkRect">
        <animate id="PinkAnim" begin="0s" dur="5s" end="LimeAnim.begin" fill="freeze" attributeName="width" from="10" to="380" />
    </rect>
    
    <rect id="LimeRect" x="10" y="60" width="30" height="30" fill="lime">
        <animate begin="click" id="LimeAnim" dur="5s" attributeName="width" from="10" to="380" fill="freeze" />
    </rect>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/VwRRBMP

同样的同步效果也可以应用于同一元素的两个动画。例如，矩形的颜色无限制地在 `lime` 与 `pink` 之间变化；单击元素时宽度从 `30` 缓慢变宽到 `380`，同时一旦宽度变化动画（`WidthAnim`）被触发，颜色动画（`ColorAnim`）即停止：

```SVG
<svg width="400" height="70" viewBox="0 0 400 70" class="element">
    <rect id="PinkRect" x="10" y="20" width="30" height="30" fill="lime" id="PinkRect">
        <animate id="ColorAnim" attributeName="fill" begin="0s" dur="5s" from="lime" to="deepPink" repeatCount="indefinite" end="WidthAnim.begin" fill="freeze"  from="10" to="380" />
        <animate id="WidthAnim" attributeName="width" begin="click" dur="5s" fill="freeze"  from="30" to="380" />
    </rect>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/qBvvyxN

### 多个 begin 和 end 值：多个开始或结束时间点

`begin` 和 `end` 属性都接受以分号分隔的值列表。`begin` 列表中的每个值对应 `end` 列表中的一个值，形成"活动"与"非活动"交替的动画间隔，好比行驶的小汽车：轮胎在一段时间内是活动的，然后是非活动的，取决于小汽车是否在行驶中。

```SVG
<svg width="400" height="70" viewBox="0 0 400 70" class="element">
    <rect id="PinkRect" x="10" y="20" width="30" height="30" fill="pink" id="PinkRect">
         <animate begin="2s; click" end="widthAnim.end; mouseover" 
         id="widthAnim" attributeName="width" from="30" to="380" dur="5s"  fill="freeze" />
    </rect>
</svg>
```

对该示例的逐项解释：

- `begin="2s; click"`：动画将在页面加载后 `2` 秒开始，之后还可以通过点击事件触发。动画因此拥有时间触发和用户点击两个入口点。
- `end="widthAnim.end; mouseover"`：动画将在 `widthAnim` 结束后或鼠标悬停（`mouseover`）事件发生时结束。

> Demo 地址：https://codepen.io/airen/full/gOEEjQz

这种方式让动画拥有多个入口和出口点，提供更灵活的控制，在创建复杂动画序列时特别有用：

```SVG
<svg width="430" height="310" viewBox="0 0 430 310" class="element">
    <rect id="rect1" x="10" y="10" width="50" height="50" fill="lime">
        <animate id="anim1" begin="0s; anim35.end" dur="0.2s" attributeName="opacity" from="0" to="1" fill="freeze"  />
    </rect>
  
    <rect id="rect2" x="70" y="10" width="50" height="50" fill="lime" >
        <animate id="anim2" begin="anim1.end" dur="0.2s" attributeName="opacity" from="0" to="1" fill="freeze"  />
    </rect>
  
    <!-- 省略其他 rect 元素 -->
  
    <rect id="rect35" x="370" y="250" width="50" height="50" fill="lime" >
        <animate id="anim35" begin="anim34.end" dur="0.2s" attributeName="opacity" from="0" to="1" fill="freeze"  />
    </rect>
</svg>
```

示例为每个 `<animate>` 元素定义了 `id`，并且第二个动画的 `begin` 值是前一个动画的结束时间（如 `anim1.end`）。值得注意的是，第一个 `<animate>` 的 `begin` 值为 `0s; anim35.end`，是一个值列表：第一个值表示矩形在文档加载后立即开始动画；第二个值表示它在最后一个矩形完成动画后再次开始。通过将第一个动画链接到最后一个动画的结束，即创建了一个循环动画：

> Demo 地址：https://codepen.io/airen/full/yLwwxNy

在任何单独动画的末尾都可以启动其他动画，也可以循环回第一个动画的开头形成循环动画。若将动画的开始由用户事件触发——例如鼠标悬停在 SVG 图像的某一部分或点击特定部分触发一系列链式动画，其中部分环节还可以循环——就能组合出复杂的交互式动画。

下面是一个带交互效果的链式动画：将鼠标悬浮在玫红色（最顶部）矩形或黄色（最底部）矩形上，或点击粉色（中间）矩形，均可触发动画：

```SVG
<svg width="300" height="150" viewBox="0 0 300 150" class="element">
    <g>
        <rect id="MaroonRect" x="10" y="15" width="32" height="32" fill="#ff3366">
            <animate id="MaroonAnim" begin="PinkAnim.end; mouseover" dur="5s" attributeName="width" from="32" to="250" />
        </rect>
        <rect id="PinkRect" x="10" y="62" width="32" height="32" fill="pink">
            <animate id="PinkAnim" begin="YellowAnim.end; click" dur="5s" attributeName="width" from="32" to="250" />
        </rect>
        <rect id="YellowRect" x="10" y="107" width="32" height="32" fill="#ffff00">
            <animate id="YellowAnim" begin="MaroonAnim.end; mouseover" dur="5s" attributeName="width" from="32" to="250" />
        </rect>
    </g>
    <g>
        <text x="50" y="38" fill="red" stroke="red">
            <animate begin="MaroonAnim.begin" dur="0.1s" attributeName="visibility" from="visible" to="hidden" fill="freeze" calcMode="discrete" />
            <animate begin="MaroonAnim.end" dur="0.1s" attributeName="visibility" from="hidden" to="visible" fill="freeze" calcMode="discrete" />
            👈Mouse here
        </text>
        <text x="50" y="86" fill="red" stroke="red">
            <animate begin="PinkAnim.begin" dur="0.1s" attributeName="visibility" from="visible" to="hidden" fill="freeze" calcMode="discrete" />
            <animate begin="PinkAnim.end" dur="0.1s" attributeName="visibility" from="hidden" to="visible" fill="freeze" calcMode="discrete" />
            👈Click here
        </text>
        <text x="50" y="130" fill="red" stroke="red">
            <animate begin="YellowAnim.begin" dur="0.1s" attributeName="visibility" from="visible" to="hidden" fill="freeze" calcMode="discrete" />
            <animate begin="YellowAnim.end" dur="0.1s" attributeName="visibility" from="hidden" to="visible" fill="freeze" calcMode="discrete" />
            👈Mouse here
        </text>
    </g>
</svg>
```

这些动画通过鼠标事件和点击事件相互关联，构成动态的视觉体验：

> Demo 地址：https://codepen.io/airen/full/KKEEGgq

### repeatCount：指定动画重复播放的次数

`repeatCount` 属性指定动画重复播放的次数，与 CSS 的 `animation-iteration-count` 属性非常相似，可设置为具体次数或关键字 `indefinite`（无限重复）：

```SVG
<svg width="300" height="300" viewBox="0 0 300 300" class="element">
    <circle cx="150" cy="150" r="50" stroke="lime" stroke-width="3" fill="orange">
        <animate attributeName="r" from="50" to="10" dur="2s" repeatCount="3" fill="freeze" />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/QWooJmJ

示例中圆的半径从 `50` 逐渐减小到 `10`，持续 `2s`，`repeatCount="3"` 表示动画重复播放 `3` 次；完成后动画保持在最后一帧的状态。设置为 `indefinite` 则无限重复：

```SVG
<svg width="300" height="300" viewBox="0 0 300 300" class="element">
    <circle cx="150" cy="150" r="50" stroke="lime" stroke-width="3" fill="orange">
        <animate repeatCount="indefinite" attributeName="r" from="50" to="10" dur="2s" fill="freeze" begin="click" />
    </circle>
</svg> 
```

> Demo 地址：https://codepen.io/airen/full/LYaaXBb

::: warning SMIL 没有 animation-direction 的等价机制
动画重新开始时从初始的 `from` 值而非结束值 `to` 开始。SMIL 没有类似 CSS `animation-direction: alternate` 的机制（CSS 中该值使奇数次迭代正常方向播放、偶数次反向播放）。在 CSS 中轻易实现的往返效果，在 SMIL 中只能依赖 JavaScript 脚本动态更改动画元素的 `from` 与 `to` 值；某些场景下也可以将结束值指定为中间值，并将结束值和初始值设为相同值——类似在 CSS `@keyframes` 的 `50%` 处设置中间值、`from` 和 `to` 设置相同值。以 `pluse` 动画为例：

```CSS
@keyframes pluse {
    from,to {
        scale: 1;
    }
    50% {
        scale: 1.3;
    } 
}
```

要在 SMIL 中实现相似效果，需要使用 `values` 属性，后文将详细介绍。
:::

### repeatDur：限制动画的重复时间

`repeatDur` 属性可以限制动画的总重复时间，这一概念在 CSS 动画以及 WAAPI 中并不存在。将一个动画设置为无限重复可能会对用户不够友好，尤其是持续时间很长的动画；将重复时间限制在一定时间段内，并在相对于文档开头的某个时间后停止重复，对动画自身和用户都更好。

::: info 什么是"演示时间"
SVG 动画中的"演示时间"指相对于文档开始的时间，表示文档片段在时间轴上的位置。演示时间可以用来控制动画的时序和重复行为，通过 `begin`、`end`、`dur`、`repeatCount` 和 `repeatDur` 等属性控制。理解演示时间对精确控制 SVG 动画行为非常重要。
:::

`repeatDur` 的语法类似于时钟值，但它与动画事件或交互事件无关，而是相对于文档的开头：

```SVG
<svg width="300" height="300" viewBox="0 0 300 300" class="element">
    <circle cx="150" cy="150" r="50" fill="orange">
        <animate attributeName="r" values="50;10;50" dur="3s" repeatCount="indefinite" repeatDur="2s" />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/ExMJVpj

示例中圆的半径（`r`）在动画期间变化：`repeatCount="indefinite"` 表示无限重复，`repeatDur="2s"` 表示动画在文档开始后的 `2s` 内重复，第 `2s` 时动画重新开始。`repeatDur` 也可以设置为 `"01:30"`，表示动画在文档开始后 `1` 分 `30` 秒内重复：

```SVG
<svg width="300" height="300" viewBox="0 0 300 300" class="element">
    <circle cx="150" cy="150" r="50" fill="orange">
        <animate repeatDur="01:30" attributeName="r" values="50;10;50" dur="3s" repeatCount="indefinite"  />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/eYXopPO

该属性适用于需要在特定时长内重复运行的场景，例如循环播放的动画或展示。

### 基于重复次数同步动画：repeat()

除了 `begin` 和 `end`，SMIL 还支持基于另一个动画的重复次数来同步动画：一个动画可以在另一个动画第 `n` 次重复后的某个时间开始，并可增减一定的偏移时间。

```SVG
<svg width="400" height="240" viewBox="0 0 400 240" class="element">
    <circle cx="60" cy="60" r="30" fill="lime">
        <animate id="circleAnim" attributeName="cx" begin="click" dur="5s" repeatCount="3" from="60" to="300" fill="freeze"/>
    </circle>
    
    <!-- 圆形动画的第三次重复后，矩形的动画在 2.5s 后开始 -->
    <rect x="230" y="140" width="60" height="60" fill="#ff3366">
        <animate id="rectAnim" begin="circleAnim.repeat(2)+2.5s" attributeName="x"   dur="5s" from="230" to="30" fill="freeze"/>
    </rect>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/NWJmGeO

示例将 `rectAnim` 动画的 `begin` 设置为 `"circleAnim.repeat(2)+2.5s"`，含义是：`circleAnim` 动画第三次重复播放的 `2.5s` 后，`rectAnim` 动画才开始播放。这种方法将第一个动画的重复次数与第二个动画的启动时间关联起来，有助于构建更复杂、更有机的动画序列。

### keyTimes 与 values：控制动画关键帧值

CSS 和 WAAPI 都支持指定动画属性在过程中某一帧应采用的值。例如对元素做偏移动画时，可以指定中间帧采用特定值，而不是直接从开始值（`0`）到结束值（`300px`）：

```CSS
/* CSS 定义关键帧值的方式 */
@keyframes move {
    0% {
        translate: 0px;
    }
    50% {
        translate: 360px;
    } 
    80% {
        translate: 260px;
    }
    100% {
        translate: 300px;
    }
}
```

`@keyframes` 中的 `0%`、`50%`、`80%` 和 `100%` 是动画的关键帧，每个关键帧中的值是该帧的属性值。

WAAPI 中指定关键帧值的方式与 `@keyframes` 非常相似，差别在于使用 `offset` 指定关键帧位置：

```JavaScript
const move = [
    {
        translate: '0px',
        offset: 0
    },
    {
        translate: '360px',
        offset: .5
    },
    {
        translate: '260px',
        offset: .8
    },
    {
        translate: '300px',
        offset: 1
    }
]
```

在 SMIL 中可以以类似方式控制每帧的值，但语法不同：使用 `keyTimes` 属性指定关键帧位置，使用 `values` 属性为每帧指定动画属性的值：

```SVG
<svg width="400" height="240" viewBox="0 0 400 240" class="element">
    <circle cx="60" cy="60" r="30" fill="lime">
        <animate values="0; 360; 260; 300" keytimes="0; 0.5; 0.8; 1" attributename="cx" from="0" to="300" dur="2s" begin="click"  fill="freeze" />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/ZEPZWQJ

要点如下：

- 关键帧时间和中间值都以列表形式指定。`keyTimes` 是以分号分隔的时间值列表，用于控制动画速度；列表中的每个时间对应 `values` 列表中的一个值，定义该值在动画函数中的使用时机。
- `keyTimes` 列表中的每个时间值是 `0 ~ 1` 之间的浮点数（含 `0` 和 `1`），表示动画元素简单持续时间内的比例偏移。因此 `keyTimes` 类似于 CSS 中的百分比，只是以分数形式指定，更接近 WAAPI 的 `offset`。
- 使用值列表时，动画将按顺序在过程中应用这些值；指定值列表后，任何 `from`、`to` 和 `by` 属性值都会被忽略。
- `values` 属性可以在没有 `keyTimes` 的情况下单独使用，此时各值会在时间上自动均匀分布。

### calcMode 与 keySplines：控制动画的速率

CSS 中使用 `animation-timing-function` 或 `transition-timing-function` 指定动画速率（缓动函数），可以是预定义关键词（`linear`、`ease`、`ease-in`、`ease-out`、`ease-in-out` 等），也可以是函数（`cubic-bezier()`、`linear()`、`steps()` 等）。

在 SVG 动画中，`calcMode` 属性承担同样的角色。所有动画元素的默认动画节奏都是线性（`linear`），唯一例外是 `<animateMotion>`。除线性外还有三个可选值：

- **`discrete`**：动画函数从一个值直接跳到下一个值，没有任何插值，类似 CSS 中的 `steps()` 函数。
- **`paced`**：类似线性，但忽略由 `keyTimes` 定义的任何中间进度时间，计算后续值之间的距离并相应分配时间。若各值按线性顺序排列则看不出差异；若值来回移动，或是颜色（被视为三维矢量值），中间值的差异会明显可见。
- **`spline`**：根据由 `keySplines` 属性定义的时间函数，从值列表中的一个值插值到下一个值。分段点在 `keyTimes` 属性中定义，每个区间的控制点在 `keySplines` 属性中定义。

以下示例演示 `calcMode` 四种模式的动画效果差异：

> Demo 地址：https://codepen.io/airen/full/bGZzzyL

`keySplines` 属性的作用可以借助 CSS 的对应特性来理解。CSS 允许在每个关键帧内单独指定缓动函数（`animation-timing-function`），从而精细控制每个关键帧的进行方式：

```CSS
@keyframes bounce {
    0% {
        translate: 0 0;
        animation-timing-function: ease-in;
    }
    15% {
        translate:0 200px;
        animation-timing-function: ease-out;
    }
    30% {
        translate: 70px;
        animation-timing-function: ease-in;
    }  
    45% {
        translate: 0 200px;
        animation-timing-function: ease-out;
    }
    60% {
        translate: 0 120px;
        animation-timing-function: ease-in;
    }
    75% {
        translate: 0 200px;
        animation-timing-function: ease-out;
    }
    90% {
        translate: 0 170px;
        animation-timing-function: ease-in;
    }
    100% {
        translate: 0 200px;
        animation-timing-function: ease-out;
    }    
}
```

CSS 预定义缓动关键词都可以用三次贝塞尔函数 `cubic-bezier()` 描述，例如：

- `ease-in = cubic-bezier(0.42, 0, 1, 1)`
- `ease-out = cubic-bezier(0, 0, 0.59, 1)`

在 SVG 中可以这样描述与上述 CSS `bounce` 类似的动画：

```SVG
<svg width="300" height="300" viewBox="0 0 300 300" class="element">
    <circle cx="150" cy="60" r="30" fill="lime">
        <animate 
            values="0; 200; 70; 200; 120; 200; 170; 200" 
            keytimes="0; 0.15; 0.3; 0.45; 0.6; 0.75; 0.9; 1"
            attributeName="cy" from="60" to="250" dur="3s" begin="click" fill="freeze" />
    </circle>
</svg>
```

动画将在点击时开始，并达到结束值时冻结。接下来添加 `keySplines` 属性为每个关键帧指定速率。

`keySplines` 属性接受与 `keyTimes` 列表相关联的一组贝塞尔控制点，定义控制各间隔节奏的三次贝塞尔函数。属性值是以分号分隔的控制点描述列表，每个控制点描述是四个值的集合 `x1 y1 x2 y2`，描述一个时间段的贝塞尔控制点。所有值必须在 `0 ~ 1` 范围内，并且 `calcMode` 必须设置为 `spline`，否则该属性被忽略。

`keySplines` 不直接接受 `cubic-bezier()` 的值形式，而是接受绘制曲线的两个控制点坐标。定义相关段的 `keyTimes` 值是贝塞尔"锚点"，`keySplines` 值是控制点，因此控制点集合的数量必须比 `keyTimes` 少一个：

```SVG
<svg width="300" height="300" viewBox="0 0 300 300" class="element">
    <circle cx="150" cy="60" r="30" fill="lime">
        <animate 
            calcMode="spline"
            keytimes="0; 0.15; 0.3; 0.45; 0.6; 0.75; 0.9; 1"
            values="0; 200; 70; 200; 120; 200; 170; 200"  
            keySplines="0.42 0 1 1; 0 0 0.59 1; 0.42 0 1 1; 0 0 0.59 1; 0.42 0 1 1; 0 0 0.59 1;  0.42 0 1 1"
            attributeName="cy" from="60" to="250" dur="3s" begin="click" fill="freeze"  />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/eYXoZMr

如果只想为整个动画指定一个整体缓动函数而没有中间值，仍然必须使用 `keyTimes` 属性指定关键帧，但只需指定起始和结束关键帧，即 `0; 1`。

### additive 与 accumulate：附加和累积动画

CSS 动画中有"动画合成"特性（`animation-composition` 属性），允许多个 CSS 动画效果同时影响同一属性的值，包括属性值的叠加、替换等；WAAPI 中对应的是 `composite` 属性。

SVG 动画中具备相似功能的是 `additive` 和 `accumulate` 属性。当一个动画需要从前一个动画结束的地方开始，或以前一个动画的累积和作为后续值时，这两个属性非常有用。

以圆形 `cx` 属性的动画为例，`from="0"`、`to="360"`。当把 `additive` 属性设置为 `sum` 时，各值都将相对于动画属性的原始值：

```SVG
<svg width="400" height="200" viewBox="0 0 400 200" class="element">
    <circle cx="50" cy="50" r="30" fill="#ff3366">
        <animate additive="sum" attributeName="cx" from="0" to="360" dur="3s" begin="click" fill="freeze" />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/RwdORjV

示例中圆的 `cx` 初始位置是 `50`。`additive="sum"` 时，`from` 的值 `0` 实际上是原始的 `50`，`to` 的值 `360` 实际上是 `50 + 360`——等效于设置 `from="50"` 和 `to="410"`：

```SVG
<!-- 未设置additive -->
<svg width="400" height="200" viewBox="0 0 400 200" class="element">
    <circle cx="50" cy="50" r="30" fill="lime">
        <animate attributeName="cx" from="50" to="410" dur="3s" begin="click" fill="freeze" />
    </circle>
</svg>

<!-- additive="sum" -->
<svg width="400" height="200" viewBox="0 0 400 200" class="element">
    <circle cx="50" cy="50" r="30" fill="#ff3366">
        <animate additive="sum" attributeName="cx" from="0" to="360" dur="3s" begin="click" fill="freeze" />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/LYavZBR

`additive` 属性定义动画的值是否相对于当前值（原始值）累加，有两个可选值：

- **`replace`**（默认值）：动画的 `from` 和 `to` 值将替换当前（原始）值，可能导致动画开始之前出现奇怪的跳跃。
- **`sum`**：动画的 `from` 和 `to` 值相对于当前值累加，即与当前值相加。

```SVG
<!-- additive="sum" -->
<svg width="400" height="100" viewBox="0 0 400 100" class="element">
    <circle cx="50" cy="50" r="30" fill="#ff3366">
        <animate additive="sum" attributeName="cx" from="0" to="360" dur="3s" begin="orangeAnim.begin; click" fill="freeze" id="redAnim" />
    </circle>
</svg>

<!-- additive="replace" -->
<svg width="400" height="100" viewBox="0 0 400 100" class="element">
    <circle cx="50" cy="50" r="30" fill="orange">
        <animate additive="replace" attributeName="cx" from="0" to="360" dur="3s" begin="redAnim.begin; click" fill="freeze" id="orangeAnim" />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/PoLgzXR

示例中有两个圆，动画相同（`cx` 从 `0` 移动到 `360`）：橙色圆使用默认值 `additive="replace"`，玫红色圆使用 `additive="sum"`。玫红色圆的动画实际从 `50` 移动到 `410`，即相对于当前值累加。

若希望每次重复从前一次的结束值开始，则需要 `accumulate` 属性。`accumulate` 控制动画重复时是否累积：累积意味着动画每次迭代都基于前一次迭代的最终值继续累加。可选值：

- **`none`**（默认值）：动画重复时从头开始，不进行累积，每次重复都从初始状态重新开始。
- **`sum`**：动画重复时累积，每次迭代基于前一次迭代的最终值累加。

```SVG
<svg width="400" height="200" viewBox="0 0 400 200" class="element">
    <!-- 初始圆 -->
    <circle cx="50" cy="60" r="20" fill="blue">
        <animate attributeName="cx" from="50" to="150" dur="2s" accumulate="none" begin="click" repeatCount="2" fill="freeze" />
    </circle>

    <!-- 累积动画 -->
    <circle cx="50" cy="140" r="20" fill="red">
        <animate attributeName="cx" from="50" to="150" dur="2s" accumulate="sum" repeatCount="2" fill="freeze" begin="click" />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/mdogrbX

示例中蓝色圆使用默认值 `accumulate="none"`，红色圆使用 `accumulate="sum"`。红色圆的动画在每次重复时基于前一次最终值累加，蓝色圆每次重复都从初始状态重新开始。

::: warning accumulate 被忽略的情况
- 目标属性值不支持加法时；
- 动画元素不重复时；
- 仅使用 `to` 属性指定动画函数时。
:::

### min 与 max：限制活动持续时间

与 `repeatDur` 类似，`min` 和 `max` 属性用于限制动画的活动持续时间，分别指定最小值和最大值，取值为时钟值。

- `min`：活动持续时间的最小值，默认 `0`，表示不限制。若设置，值必须大于或等于 `0`。
- `max`：活动持续时间的最大值，默认 `indefinite`，表示不限制。若设置，值必须大于 `0`。

若同时指定了 `min` 和 `max`，`max` 值必须大于或等于 `min` 值，否则两个属性都被忽略。

这里涉及三个关键的时间概念，它们描述动画元素在时间轴上的行为：

- **元素的活动持续时间**：动画元素实际处于活动状态的时间段，即动画正在产生可见效果、影响文档状态或执行其他动画操作的时间范围。它考虑动画的整体执行情况，包括所有重复周期和可能的结束；`dur`、`repeatCount`、`repeatDur` 和 `end` 属性都会影响它。
- **元素的重复持续时间**：单个重复周期的持续时间，仅考虑单个周期，不考虑整个动画的执行情况；主要受 `dur` 和 `repeatCount` 影响。
- **元素的简单持续时间**：没有任何重复的情况下单次执行的时间，仅描述最基本的执行时间；只受 `dur` 属性影响。

三者的差异在于关注的时间段和影响因素：活动持续时间是整个动画执行的总时间，重复持续时间是单个重复周期的时间，简单持续时间是无重复时的单次执行时间。

这些属性的协作与覆盖规则：浏览器首先根据动画元素的 `dur`、`repeatCount`、`repeatDur` 和 `end` 属性计算活动持续时间；若使用了 `min` 和 `max`，浏览器将计算结果与之比较并按以下情况调整：

- 计算的活动持续时间大于 `max`，则活动持续时间被设定为 `max` 的值。
- 计算的活动持续时间小于 `min`，则活动持续时间被设定为 `min` 的值。若元素的重复持续时间（或简单持续时间）大于 `min`，元素将以（`min` 受限的）活动持续时间正常播放；否则元素以其重复持续时间（或简单持续时间）正常播放，然后根据 `fill` 属性的值冻结或不冻结。

若元素使用了 `end` 属性，它会覆盖计算得到的活动持续时间，直接结束动画。综合起来：

- `end` 属性优先级最高，可以直接结束动画；
- `min` 和 `max` 限制活动持续时间的范围，超出范围则调整；
- 计算的活动持续时间综合了 `dur`、`repeatCount`、`repeatDur` 等属性，但受 `min` 和 `max` 调整。

[规范中有一张非常全面的表格](https://www.w3.org/TR/2001/REC-smil-animation-20010904/#ComputingActiveDur)，展示了 `dur`、`repeatCount`、`repeatDur` 和 `end` 属性的不同组合及对应的活动持续时间。

> 表格来源于：https://www.w3.org/TR/2001/REC-smil-animation-20010904/#ComputingActiveDur

以下是一个简单示例：

```SVG
<svg width="400" height="120" viewBox="0 0 400 120" class="element">
    <circle cx="50" cy="60" r="30" fill="lime">
        <animate attributeName="cx" from="50" to="400" dur="5s" begin="click" repeatCount="indefinite" min="2s" max="4s" fill="freeze" />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/oNVOzRM

示例中动画元素的活动持续时间被限制在 `2s`（`min="2s"`）到 `4s`（`max="4s"`）之间：无论 `dur="5s"`、`repeatCount="indefinite"` 等属性如何设置，活动持续时间都在 `2s ~ 4s` 之间。

`min` 和 `max` 需要与其他控制动画时长的属性（`dur`、`repeatCount`、`repeatDur`、`end`）配合使用：浏览器先根据后者计算初始的活动持续时间，再与 `min`/`max` 比较后确定最终值。

## SVG 动画元素

前文的案例大多使用 `<animate>` 元素创建。`<animate>` 可以视为通用的 SVG 动画元素，能够完成各种任务；某些动画则需要专门的动画元素，例如 `<animateTransform>`、`<animateMotion>` 和 `<set>`，以及已被弃用的 `<animateColor>`，它们提供额外的控制或便利性。

### `<animate>` 元素

`<animate>` 是 SVG 中创建动画的主要元素之一，可为 SVG 图形应用平移、缩放、颜色、透明度等各类动画效果。可应用于 `<animate>` 元素的属性主要有：

- `xlink:href`：指定要应用动画的目标元素的 `ID` 或 `URL`，动画将影响此元素的属性。
- `attributeName`：指定要动画的属性名称，例如更改圆的半径时设置为 `"r"`。
- `from`：指定动画属性的起始值。
- `to`：指定动画属性的结束值。
- `dur`：指定动画的持续时间，可使用时间值如 `s`（秒）或 `ms`（毫秒）。
- `begin`：指定动画何时开始，可以是 `"0s"`（立即开始），也可以是[事件触发](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/Events)（例如 `"click"`）。
- `repeatCount`：指定动画重复的次数，可设置为整数值或 `"indefinite"`（无限循环）。
- `fill`：指定动画结束后属性值的处理方式，常见值包括 `"freeze"`（保持最终值）和 `"remove"`（恢复初始状态）。
- `keyTimes`：指定关键帧的时间值，用于控制动画属性的插值。
- `keySplines`：当 `calcMode="spline"` 时，指定贝塞尔曲线的控制点以定制缓动效果。
- `calcMode`：指定插值模式，包括 `"linear"`、`"paced"`、`"discrete"` 和 `"spline"`。
- `keyPoints`：指定沿运动路径的进度点（`0 ~ 1` 之间的数值），需与 `keyTimes` 配合使用；`calcMode="paced"` 时该属性被忽略。
- `accumulate`：指定是否累积动画效果，允许上一个动画的效果叠加到下一个动画。
- `additive`：指定是否相对于原始值叠加动画效果，允许动画从当前值开始。
- `min` 和 `max`：指定动画的最小和最大活动时间，控制动画时长。
- `end`：指定动画的结束时间。

以下是使用 `<animate>` 创建的脉搏动画：

```SVG
<svg width="400" height="400" viewBox="0 0 400 400" class="element">
    <circle class="pulse" cx="50%" cy="50%" r="30" stroke="black" stroke-width="4" fill="#ffffff" stroke-opacity="0">
        <animate attributeName="stroke-width" from="4" to="0" repeatCount="indefinite" begin="0s" dur="2s" />
        <animate attributeName="stroke-opacity" from="1" to="0" repeatCount="indefinite" begin="0s" dur="2s" />
        <animate attributeName="r" from="9" to="60" repeatCount="indefinite" begin="0s" dur="2s" />
    </circle>
    <circle cx="50%" cy="50%" r="30" stroke="black" stroke-width="4" stroke-opacity="1" fill="black"></circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/GReLNLq

示例对圆的 `stroke-width`、`stroke-opacity` 和 `r` 三个属性进行动画：`from` 与 `to` 分别设置起始值和结束值，`dur` 设置持续时间为 `2s`，`begin="0s"` 表示文档加载完立即播放，`repeatCount="indefinite"` 表示无限循环。

使用 `<animate>` 创建动画的实践要点：

#### 属性名称和目标元素选择

确保 `attributeName` 指定的属性名称在目标元素上有效，并将 `<animate>` 嵌套在目标元素内，或通过 `xlink:href` 选择目标元素：

```SVG
<animate
    xlink:href="#target-element"
    attributeName="opacity"
    from="0"
    to="1"
    dur="2s"
    begin="click"
    fill="freeze"
/>
```

#### 值的类型和格式

根据属性的类型提供正确类型和格式的值。颜色属性需要有效的颜色值，位置属性需要数字或百分比。

#### 动画持续时间

与 CSS 动画类似：若 `animation-duration` 或 `transition-duration` 为 `0`，将看不到任何动画效果。SVG 中同理——`dur` 需要设置适当的值，过长或过短的持续时间都可能导致不理想的动画效果。

#### 动画开始时间

通过 `begin` 属性设置动画的开始时间，可使用事件关键字（如 `click`、`mouseover`）或时钟值（如 `2s`）。

#### 动画重复

通过 `repeatCount` 或 `repeatDur` 指定动画的重复次数或重复持续时间。

#### 动画填充模式

使用 `fill` 属性定义动画结束后元素的状态，常见值为 `"freeze"`（保持最后一帧）和 `"remove"`（回到初始状态）：

```SVG
<animate
    xlink:href="#target-element"
    attributeName="opacity"
    from="0"
    to="1"
    dur="2s"
    begin="click"
    fill="freeze" <!-- 或者 fill="remove" -->
/>
```

#### 附加或累积动画

使用 `additive` 和 `accumulate` 属性控制动画效果的附加和累积：

```SVG
<animate
    xlink:href="#moving-rectangle"
    attributeName="x"
    from="0"
    to="300"
    dur="2s"
    begin="click"
    fill="freeze"
    additive="sum"
/>
```

#### 控制动画元素的活动持续时间

使用 `min` 和 `max` 限制动画的活动持续时间，避免动画过短或过长：

```SVG
<animate
    xlink:href="#scaling-circle"
    attributeName="r"
    from="20"
    to="50"
    dur="1s"
    begin="click"
    fill="freeze"
    min="0.5s"
    max="2s"
/>
```

### `<set>` 元素

`<set>` 元素提供在指定时间段内将属性或属性值直接设置为特定值的方式。与其他 SMIL/SVG 动画元素一样，`<set>` 设置的是表示属性值，目标属性在 DOM 中的原始值保持不变。

使用 `<set>` 时需要了解以下规则：

- `<set>` 适合设置插值没有意义的属性值，例如 `visibility` 属性只能取 `hidden` 或 `visible` 两个值。
- `<set>` 是非累积的，不允许使用 `additive` 和 `accumulate` 属性，指定了也会被忽略。
- `<set>` 用于在特定时间内将元素设置为特定值，不接受其他动画元素的全部属性：它没有 `from` 或 `by` 属性，因为值的变化不是渐进性的。
- `<set>` 可指定目标元素、属性名称和类型、目标值，时序可通过 `begin`、`dur`、`end`、`min`、`max`、`restart`、`repeatCount`、`repeatDur` 和 `fill` 控制。注意 `repeatCount` 不会导致动画重复，而只是延长显示动画呈现值的时间。

以下示例使用 `<set>` 控制简单的滑入滑出效果：

```SVG
<svg width="400" height="400" viewBox="0 0 400 400" class="element">
    <rect x="100" y="100" rx="10" ry="10" width="200" height="200" fill="#000099"> 
        <set begin="mouseover" end="mouseout" attributeName="class" to="round"/> 
    </rect>
</svg>
```

```CSS
.round {
    rx: 100px;
    ry: 100px;
    fill: #CCCCFF;
}
```

> Demo 地址：https://codepen.io/airen/full/yLwrbXo

鼠标移动到矩形上时，矩形变成圆形，填充颜色变为淡蓝色，并保持该效果直到鼠标移开、动画结束。相对于成对的 `<animate>` 元素，`<set>` 提供了更简洁的方式。

SVG 还允许用 `<set>` 使元素在可见与不可见之间切换。例如，让文本在最初的 `2s` 内保持隐藏，随后 `6s` 内可见：先在 `<text>` 上设置 `visibility: hidden`，再嵌套一个 `<set>` 元素将 `visibility` 设为 `visible`，`begin="2s"`（文本在最初 `2s` 内不可见），`dur="6s"`（文本可见 `6s`）。此期间结束后，`visibility` 属性的原始值（`hidden`）恢复，文本再次隐藏：

```SVG
<svg width="400" height="60" viewBox="0 0 400 60" class="element">
    <text x="40" y="40" fill="#990066" stroke="#990066">
        <set attributeName="visibility" attributeType="CSS" to="visible" begin="2s" dur="6s" />
        现在你看到我了!🦹♀️
    </text>
</svg>
```

```CSS
text {
    visibility: hidden;
}
```

> Demo 地址：https://codepen.io/airen/full/MWxRmXQ

在 `<set>` 元素上指定 `fill="freeze"` 可以让文本保持在可见状态：

```SVG
<svg width="400" height="60" viewBox="0 0 400 60" class="element">
    <text x="40" y="40" fill="#990066" stroke="#990066">
        <set attributeName="visibility" fill="freeze" attributeType="CSS" to="visible" begin="2s" dur="6s" />
        现在你看到我了!🦹♀️
    </text>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/BabERvQ

在 SVG 中引用填充时，常会使用指向 `<linearGradient>` 等元素 `id` 属性的 `URI`。与许多其他 SVG 属性一样，这个 `URI` 也可以被动画化：

```SVG
<svg width="460" height="120" viewBox="0 0 460 120" class="element">
    <defs>
        <linearGradient id="gradient1" gradientUnits="userSpaceOnUse" x1="10" y1="10" x2="450" y2="100">
            <stop offset="10%"  stop-color="#ff0066" />
            <stop offset="90%" stop-color="#eeffee" />
        </linearGradient>
        <linearGradient id="gradient2" gradientUnits="userSpaceOnUse" x1="60" y1="60" x2="400" y2="120">
            <stop offset="20%" stop-color="#ff3366" />
            <stop offset="80%" stop-color="#ffccff" />
        </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="50" fill="url(#gradient1)" id="circle1" /> 
    <circle cx="170" cy="60" r="50" fill="url(#gradient1)" id="circle2" />
    <circle cx="280" cy="60" r="50" fill="url(#gradient1)" id="circle3" />
    <circle cx="390" cy="60" r="50" fill="url(#gradient1)"  id="circle4">
        <set attributeName="fill" from="url(#gradient1)" to="url(#gradient2)" begin="3s" dur="5s" repeatCount="3" />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/BabEReW

示例使用 `<linearGradient>` 定义了 `gradient1` 和 `gradient2` 两个线性渐变，并将所有 `<circle>` 的 `fill` 属性设置为 `url(#gradient1)`。`circle4` 中嵌套的 `<set>` 元素通过 `from` 引用 `id` 为 `gradient1` 的渐变，再切换为 `id` 为 `gradient2` 的渐变。由于 `<set>` 上没有设置 `fill` 属性，动画结束后使用的渐变返回到 `<circle>` 元素 `fill` 属性描述的渐变：

```SVG
<circle cx="390" cy="60" r="50" fill="url(#gradient1)"  id="circle4">
    <set attributeName="fill" from="url(#gradient1)" to="url(#gradient2)" begin="3s" dur="5s" repeatCount="3" />
</circle>
```

### `<animateMotion>` 元素

`<animateMotion>` 与 CSS 路径动画类似，可以在 SVG 中创建沿路径运动的动画效果。通过结合路径信息和动画属性，它能实现多种有趣的效果：

- **路径动画**：最基本的用途，让元素沿平滑曲线、直线或复杂路径移动，适用于图形或图标的路径呈现。
- **模拟车辆运动**：在道路或轨道上移动元素，模拟车辆、飞机等运动物体，适用于动态交通场景或游戏元素。
- **动态图表元素**：让图表元素沿预定路径移动，以引起注意或强调数据变化。
- **路径跟随效果**：元素根据路径形状不断改变方向，例如沿螺旋形路径移动并呈现跟随效果。
- **视觉故事叙述**：在场景中移动元素，创建更生动的叙事场景。
- **模拟粒子效果**：沿路径移动小元素，模拟粒子运动，例如星星沿弯曲路径飘动。

`<animateMotion>` 通过 `dur`（动画持续时间）、`repeatCount`（重复次数）、`rotate`（旋转方向）、`path`（路径定义）等属性控制动画行为。例如：

```SVG
<svg width="500" height="300" viewBox="0 0 500 300" class="element">
    <path d="M0,300 C 100,0 400,0 500,300" fill="none" stroke="#00ff00" stroke-width="2"/> 
    <circle x="100" y="50" r="20" fill="red"> 
        <animateMotion dur="6s" repeatCount="indefinite" path="M0,300 C 100,0 400,0 500,300" /> 
    </circle>
</svg>
```

代码创建了一个路径和一个沿该路径移动的动画圆圈：

> Demo 地址：https://codepen.io/airen/full/oNVOQGj

红色圆圈沿预定义曲线路径移动，持续 `6s` 并无限循环。类似的方法还可以构建更复杂的路径动画，例如小汽车在赛道上行驶的效果：

> Demo 地址：https://codepen.io/airen/full/yLwrXjZ

制作路径动画的关键要素是运动路径——元素沿路径运动的首要和必要条件。SVG 提供两种指定运动路径的方式：

- 通过 `path` 属性指定运动路径；
- 使用 `<mpath>` 元素指定运动路径。

`<animateMotion>` 在动画行为控制方面与 `<animate>` 相似，除 SVG 动画的基本属性外，还有 `keyPoints`、`rotate` 和 `path` 三个特有属性；此外其 `calcMode` 属性默认值为 `paced`（而非 `linear`）。

#### 通过 path 属性指定运动路径

`path` 属性是最常见的指定方式，格式与 `<path>` 元素的 `d` 属性相同。路径数据由一系列命令和参数组成的字符串构成：

- **`M`**（Move To）：将画笔移动到指定坐标位置，不画线。例如 `M10 20` 表示移动到坐标 `(10, 20)`。
- **`L`**（Line To）：从当前位置画一条直线到指定坐标。例如 `L30 40` 表示画直线到 `(30, 40)`。
- **`H`**（Horizontal Line To）：画水平线到指定的 `x` 坐标。例如 `H50`。
- **`V`**（Vertical Line To）：画垂直线到指定的 `y` 坐标。例如 `V60`。
- **`C`**（Cubic Bezier Curve）：创建三次贝塞尔曲线。例如 `C80 90, 100 110, 120 130`。
- **`Q`**（Quadratic Bezier Curve）：创建二次贝塞尔曲线。例如 `Q40 50, 60 70`。
- **`S`**（Smooth Curve）：创建平滑的贝塞尔曲线，可延续前面的曲线。例如 `S80 90, 100 110`。
- **`A`**（Elliptical Arc Curve）：创建椭圆弧曲线。例如 `A15 20 45 0 1 75 85`。
- **`Z`**（Close Path）：封闭当前路径，连接当前点和起始点。

这些指令可以组合创建复杂的路径形状。可进一步参考 [SVG Path Visualizer](https://svg-path-visualizer.netlify.app/) 或 [W3C 规范](https://www.w3.org/TR/SVG2/paths.html)。

::: tip 实践建议
手写命令绘制路径极其繁琐且易出错，建议使用矢量图形绘制工具或在线工具获取路径数据，例如在 Figma 中绘制路径后导出。
:::

以下是小汽车沿指定路径运动的动画：

```SVG
<svg viewBox="0 0 307 184" xmlns="http://www.w3.org/2000/svg" class="element">
    <!-- 定义路径形状 -->
    <path fill="none" stroke="#facc15" stroke-dasharray="4" d="M167.88,111.3 c3.11,0,6.12,1.44,8.06,3.96l30.58,39.82c1.75,2.28,4.95,2.91,7.43,1.46l64.07-37.37c1.75-1.02,2.84-2.92,2.84-4.95V96.04 c0-1.64-0.71-3.21-1.94-4.29c-1.23-1.09-2.87-1.59-4.5-1.39l-9.83,1.23c-4.66,0.58-8.96-1.96-10.68-6.34 c-1.73-4.37-0.33-9.16,3.48-11.93l0.19-0.14c2.48-1.8,2.71-4.49,2.09-6.41c-0.62-1.91-2.38-3.96-5.45-3.96 c-3.66,0-7.05-1.98-8.84-5.18L229.65,29.6c-1.01-1.8-2.93-2.93-5-2.93H155.2c-1.59,0-3.12,0.67-4.2,1.83l-28.78,31.06 c-1.91,2.06-4.62,3.25-7.43,3.25H31.87c-3.16,0-5.73,2.57-5.73,5.73v32.5c0,2.68,1.83,4.98,4.44,5.58l35.59-1.79 c3.27,0.76,23.73,23.28,26.51,22.67l73.06-15.98C166.45,111.38,167.17,111.3,167.88,111.3z" />
  
    <!-- 在路径上移动的小汽车 -->
    <path class="car" fill="#84CC16" style="transform: translate(-12px, -12px)" d="M16.38,18.39c0.22-0.44,0.24-0.8,0.2-1.07l0.19,0.01c0.02,0.21,0.18,0.37,0.4,0.38l2.44,0.06 c0.21,0.01,0.38-0.15,0.41-0.35l1.05,0.03c0.34,0.01,0.66-0.15,0.86-0.42l0.86-1.17c0.18-0.25,0.28-0.55,0.28-0.85V8.99 c0-0.31-0.1-0.6-0.28-0.85l-0.86-1.17c-0.2-0.27-0.52-0.43-0.86-0.42l-1.05,0.03c-0.03-0.2-0.2-0.36-0.41-0.35l-2.44,0.06 c-0.21,0.01-0.38,0.17-0.4,0.38l-0.19,0.01c0.04-0.27,0.02-0.63-0.2-1.07c-0.15-0.3-0.27-0.31-0.35-0.18 c-0.15,0.25-0.16,1,0.01,1.27L7.73,6.93C7.7,6.73,7.53,6.57,7.32,6.57L4.88,6.64C4.66,6.64,4.5,6.82,4.48,7.03L2.58,7.08 c0,0,0,0,0,0l-0.08,0C2.07,7.1,1.7,7.33,1.5,7.69C1.47,7.74,1.45,7.8,1.43,7.85C1.19,8.53,0.93,9.76,0.93,12 c0,2.24,0.26,3.47,0.5,4.15c0.16,0.45,0.59,0.75,1.06,0.77l2.04,0.06c0.01,0.21,0.18,0.38,0.4,0.39l2.44,0.06 c0.21,0.01,0.39-0.15,0.41-0.36l8.26,0.24c-0.17,0.27-0.16,1.02-0.01,1.27C16.11,18.71,16.23,18.7,16.38,18.39z M17.22,12 c0,0-0.02,3.07-0.57,4.6c0,0-1.07-0.27-2.03-1.49c-0.11-0.14-0.17-0.32-0.17-0.5V12V9.38c0-0.18,0.06-0.35,0.17-0.5 c0.96-1.22,2.03-1.49,2.03-1.49C17.2,8.93,17.22,12,17.22,12z M21.66,6.99c0.03-0.03,0.08-0.03,0.11,0.01 c0.19,0.25,0.88,1.16,1.04,1.38c0.18,0.26-0.02,0.74-0.2,0.36c-0.14-0.29-0.7-1.03-0.97-1.38C21.55,7.25,21.56,7.09,21.66,6.99z M15.83,7.18c0,0-0.95,1.2-3.43,1.2c-0.01,0-0.01,0-0.02,0V7.27L15.83,7.18z M6.51,7.42l5.56-0.14v1.1c-2.07,0-1.26,0-3.14,0 C6.97,8.37,6.51,7.42,6.51,7.42z M5.56,12c0-3.28,0.57-3.99,0.57-3.99C6.59,8.37,7.14,8.62,7.5,8.76c0.24,0.1,0.41,0.33,0.41,0.6 V12v2.64c0,0.26-0.16,0.5-0.41,0.6c-0.37,0.14-0.91,0.4-1.37,0.75C6.13,15.99,5.56,15.28,5.56,12z M6.51,16.58 c0,0,0.46-0.95,2.43-0.95c1.88,0,1.07,0,3.14,0v1.1L6.51,16.58z M12.38,16.73v-1.11c0.01,0,0.01,0,0.02,0c2.49,0,3.43,1.2,3.43,1.2 L12.38,16.73z M21.64,16.64c0.27-0.35,0.83-1.1,0.97-1.38c0.18-0.38,0.38,0.1,0.2,0.36c-0.16,0.22-0.85,1.13-1.04,1.38 c-0.03,0.03-0.08,0.04-0.11,0.01C21.56,16.91,21.55,16.75,21.64,16.64z">
        <!-- 使用animateMotion指定路径动画 -->
        <animateMotion dur="4s" repeatCount="indefinite" rotate="auto" begin="0.8" path="M167.88,111.3 c3.11,0,6.12,1.44,8.06,3.96l30.58,39.82c1.75,2.28,4.95,2.91,7.43,1.46l64.07-37.37c1.75-1.02,2.84-2.92,2.84-4.95V96.04 c0-1.64-0.71-3.21-1.94-4.29c-1.23-1.09-2.87-1.59-4.5-1.39l-9.83,1.23c-4.66,0.58-8.96-1.96-10.68-6.34 c-1.73-4.37-0.33-9.16,3.48-11.93l0.19-0.14c2.48-1.8,2.71-4.49,2.09-6.41c-0.62-1.91-2.38-3.96-5.45-3.96 c-3.66,0-7.05-1.98-8.84-5.18L229.65,29.6c-1.01-1.8-2.93-2.93-5-2.93H155.2c-1.59,0-3.12,0.67-4.2,1.83l-28.78,31.06 c-1.91,2.06-4.62,3.25-7.43,3.25H31.87c-3.16,0-5.73,2.57-5.73,5.73v32.5c0,2.68,1.83,4.98,4.44,5.58l35.59-1.79 c3.27,0.76,23.73,23.28,26.51,22.67l73.06-15.98C166.45,111.38,167.17,111.3,167.88,111.3z" />
    </path>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/WNmWYVY

示例中路径由图形设计软件绘制，小汽车（`.car`，同样是 `<path>` 绘制）使用 `<animateMotion>` 指定动画：`path` 属性引用路径数据（与 `<path>` 元素的 `d` 值相同），`dur` 指定持续时间，`repeatCount="indefinite"` 表示无限循环，`rotate="auto"` 指定元素沿运动路径的方向运动。

通过 `path` 属性指定运动路径时有一个原理需要了解：运动路径动画的效果是将一个补充变换矩阵添加到引用对象的当前变换矩阵上，通过计算得到的 `x` 和 `y` 值在当前用户坐标系的 `x` 和 `y` 轴上进行平移。换句话说，**指定的路径是相对于元素当前位置计算的**，路径数据将元素变换到路径位置。

这与 SVG 坐标系密切相关。以下面的案例解释这段话——让一个圆沿指定路径运动所需的代码：

```SVG
<svg width="500" height="350" viewBox="0 0 500 350" class="element">
    <!-- 定义圆的运动路径 -->
    <path fill="none" stroke="#facc15" stroke-dasharray="4" d="M0,0c3.2-3.4,18.4-0.6,23.4-0.6c5.7,0.1,10.8,0.9,16.3,2.3 c13.5,3.5,26.1,9.6,38.5,16.2c12.3,6.5,21.3,16.8,31.9,25.4c10.8,8.7,21,18.3,31.7,26.9c9.3,7.4,20.9,11.5,31.4,16.7 c13.7,6.8,26.8,9.7,41.8,9c21.4-1,40.8-3.7,61.3-10.4c10.9-3.5,18.9-11.3,28.5-17.8c5.4-3.7,10.4-6.7,14.8-11.5 c1.9-2.1,3.7-5.5,6.5-6.5" />
  
    <!-- 在指定的路径上移动圆 -->
    <circle id="circle" r="20" cx="100" cy="100" fill="lime">
        <!-- 使用animateMotion指定路径动画 -->
        <animateMotion dur="1s" begin="click" fill="freeze" path="M0,0c3.2-3.4,18.4-0.6,23.4-0.6c5.7,0.1,10.8,0.9,16.3,2.3 c13.5,3.5,26.1,9.6,38.5,16.2c12.3,6.5,21.3,16.8,31.9,25.4c10.8,8.7,21,18.3,31.7,26.9c9.3,7.4,20.9,11.5,31.4,16.7 c13.7,6.8,26.8,9.7,41.8,9c21.4-1,40.8-3.7,61.3-10.4c10.9-3.5,18.9-11.3,28.5-17.8c5.4-3.7,10.4-6.7,14.8-11.5 c1.9-2.1,3.7-5.5,6.5-6.5" />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/yLwrZNV

运行后会发现：圆的中心位置并没有落在指定的路径上。查看路径数据：路径开始时通过 `M` 移动到坐标点 `(0,0)`，然后绘制曲线到另一点。注意 `(0,0)` 实际上是圆的位置，并不是坐标系统左上角的 `(0,0)`——**路径属性中的坐标是相对于元素当前位置的**。

要修正这种现象，可以调整路径的位置或调整元素的位置。一种方式是使用 CSS 的 `transform` 将 `<path>` 移动到与圆相同的坐标位置：

```SVG
<svg width="500" height="350" viewBox="0 0 500 350" class="element">
    <!-- 定义圆的运动路径 -->
    <path style="translate:100px 100px" fill="none" stroke="#facc15" stroke-dasharray="4" d="M0,0c3.2-3.4,18.4-0.6,23.4-0.6c5.7,0.1,10.8,0.9,16.3,2.3 c13.5,3.5,26.1,9.6,38.5,16.2c12.3,6.5,21.3,16.8,31.9,25.4c10.8,8.7,21,18.3,31.7,26.9c9.3,7.4,20.9,11.5,31.4,16.7 c13.7,6.8,26.8,9.7,41.8,9c21.4-1,40.8-3.7,61.3-10.4c10.9-3.5,18.9-11.3,28.5-17.8c5.4-3.7,10.4-6.7,14.8-11.5 c1.9-2.1,3.7-5.5,6.5-6.5" />
  
    <!-- 在指定的路径上移动圆 -->
    <circle id="circle" r="20" cx="100" cy="100" fill="lime">
        <!-- 使用animateMotion指定路径动画 -->
        <animateMotion dur="1s" begin="click" fill="freeze" path="M0,0c3.2-3.4,18.4-0.6,23.4-0.6c5.7,0.1,10.8,0.9,16.3,2.3 c13.5,3.5,26.1,9.6,38.5,16.2c12.3,6.5,21.3,16.8,31.9,25.4c10.8,8.7,21,18.3,31.7,26.9c9.3,7.4,20.9,11.5,31.4,16.7 c13.7,6.8,26.8,9.7,41.8,9c21.4-1,40.8-3.7,61.3-10.4c10.9-3.5,18.9-11.3,28.5-17.8c5.4-3.7,10.4-6.7,14.8-11.5 c1.9-2.1,3.7-5.5,6.5-6.5" />
    </circle>
</svg>
```

另一种方式是调整圆圈的坐标位置：

```SVG
<svg width="500" height="350" viewBox="0 0 500 350" class="element">
    <!-- 定义圆的运动路径 -->
    <path fill="none" stroke="#facc15" stroke-dasharray="4" d="M0,0c3.2-3.4,18.4-0.6,23.4-0.6c5.7,0.1,10.8,0.9,16.3,2.3 c13.5,3.5,26.1,9.6,38.5,16.2c12.3,6.5,21.3,16.8,31.9,25.4c10.8,8.7,21,18.3,31.7,26.9c9.3,7.4,20.9,11.5,31.4,16.7 c13.7,6.8,26.8,9.7,41.8,9c21.4-1,40.8-3.7,61.3-10.4c10.9-3.5,18.9-11.3,28.5-17.8c5.4-3.7,10.4-6.7,14.8-11.5 c1.9-2.1,3.7-5.5,6.5-6.5" />
  
    <!-- 在指定的路径上移动圆 -->
    <circle id="circle" r="20" cx="0" cy="0" fill="lime">
        <!-- 使用animateMotion指定路径动画 -->
        <animateMotion dur="1s" begin="click" fill="freeze" path="M0,0c3.2-3.4,18.4-0.6,23.4-0.6c5.7,0.1,10.8,0.9,16.3,2.3 c13.5,3.5,26.1,9.6,38.5,16.2c12.3,6.5,21.3,16.8,31.9,25.4c10.8,8.7,21,18.3,31.7,26.9c9.3,7.4,20.9,11.5,31.4,16.7 c13.7,6.8,26.8,9.7,41.8,9c21.4-1,40.8-3.7,61.3-10.4c10.9-3.5,18.9-11.3,28.5-17.8c5.4-3.7,10.4-6.7,14.8-11.5 c1.9-2.1,3.7-5.5,6.5-6.5" />
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/KKEYJgN

两种方式最终都使圆圈位于指定路径坐标上运动，但呈现效果有所差异。这是路径动画的固有特性，CSS 路径动画中也一样。准备动画的运动路径时需要牢记这一点。

#### 使用 `<mpath>` 元素指定运动路径

`<mpath>` 是另一种指定运动路径的方法：它不是使用 `path` 属性，而是通过 `xlink:href` 属性引用外部路径：

```SVG
<svg width="500" height="300" viewBox="0 0 500 300" class="element">
    <path id="motionPath" d="M0,300 C 100,0 400,0 500,300" fill="none"  stroke="#facc15" stroke-dasharray="4" />

    <circle x="100" y="50" r="20" fill="lime">
        <animateMotion dur="6s" repeatCount="indefinite">
            <mpath xlink:href="#motionPath" />
        </animateMotion>
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/qBvwgpQ

示例中 `<path>` 元素定义了 `id` 为 `motionPath` 的曲线路径；`<circle>` 内嵌套的 `<animateMotion>` 内部又嵌套了一个 `<mpath>` 元素，通过 `xlink:href="#motionPath"` 引用该路径。圆将沿着 `motionPath` 路径移动并不断重复。路径可以在文档的任何地方定义，甚至只在文档中定义而不在 SVG 画布上渲染；上面的示例中路径被渲染，是因为多数情况下需要显示元素沿其移动的路径。

W3C 规范对运动路径有如下描述：

> 形状的各个 `(x, y)` 点为引用对象的 CTM 提供了一个补充变换矩阵，该矩阵通过计算得到的形状的 `(x,y)` 值在当前用户坐标系的 `x` 和 `y` 轴上进行平移。因此，引用对象会随时间的推移通过运动路径的偏移相对于当前用户坐标系的原点进行平移。该补充变换是应用在由于目标元素的 `transform` 属性或目标元素上的 `animateTransform` 元素导致的任何变换之上的。

同样，圆的位置由路径数据中的坐标"乘以"或"变换"。以下示例中，SVG 画布中央有一条路径，圆位于该路径的起点；但当应用运动路径时，圆不会从其当前位置开始运动：

```SVG
<svg width="500" height="350" viewBox="0 0 500 350" class="element">
    <path id="motionPath" fill="none" stroke="#facc15" stroke-dasharray="4" stroke-miterlimit="10" d="M91.4,104.2c3.2-3.4,18.4-0.6,23.4-0.6c5.7,0.1,10.8,0.9,16.3,2.3 c13.5,3.5,26.1,9.6,38.5,16.2c12.3,6.5,21.3,16.8,31.9,25.4c10.8,8.7,21,18.3,31.7,26.9c9.3,7.4,20.9,11.5,31.4,16.7 c13.7,6.8,26.8,9.7,41.8,9c21.4-1,40.8-3.7,61.3-10.4c10.9-3.5,18.9-11.3,28.5-17.8c5.4-3.7,10.4-6.7,14.8-11.5 c1.9-2.1,3.7-5.5,6.5-6.5" />
    <circle id="circle" r="20" cx="100" cy="100" fill="lime" />
    <animateMotion xlink:href="#circle" dur="1s" begin="click" fill="freeze">
        <mpath xlink:href="#motionPath" />
    </animateMotion>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/rNRbPKd

圆遵循路径的相同形状，但出现在不同位置——因为圆的位置由路径数据的值变换而来，现象与 `path` 属性指定的路径相似。解决方法有两种：让圆从 `(0, 0)` 位置开始，应用路径时它将按预期开始运动；或者应用一个"重置"圆坐标的变换，使它们在应用路径之前计算为零。

以下是上述演示的修改版本，使用闭合路径并无限次重复运动动画：

```SVG
<svg width="500" height="350" viewBox="0 0 500 350" class="element">
    <path id="motionPath" fill="none" stroke="#facc15" stroke-dasharray="4" stroke-miterlimit="10" d="M202.4,58.3c-13.8,0.1-33.3,0.4-44.8,9.2 c-14,10.7-26.2,29.2-31.9,45.6c-7.8,22.2-13.5,48-3.5,70.2c12.8,28.2,47.1,43.6,68.8,63.6c19.6,18.1,43.4,26.1,69.5,29.4 c21.7,2.7,43.6,3.3,65.4,4.7c19.4,1.3,33.9-7.7,51.2-15.3c24.4-10.7,38.2-44,40.9-68.9c1.8-16.7,3.4-34.9-10.3-46.5 c-9.5-8-22.6-8.1-33.2-14.1c-13.7-7.7-27.4-17.2-39.7-26.8c-5.4-4.2-10.4-8.8-15.8-12.9c-4.5-3.5-8.1-8.3-13.2-11 c-6.2-3.3-14.3-5.4-20.9-8.2c-5-2.1-9.5-5.2-14.3-7.6c-6.5-3.3-12.1-7.4-19.3-8.9c-6-1.2-12.4-1.3-18.6-1.5 C222.5,59,212.5,57.8,202.4,58.3" />

    <circle id="circle" r="10" cx="0" cy="0" fill="lime" />

    <animateMotion xlink:href="#circle" dur="5s" begin="0s" fill="freeze" repeatCount="indefinite">
        <mpath xlink:href="#motionPath" />
    </animateMotion>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/RwdOvYw

#### `<animateMotion>` 的覆盖规则

由于 `<animateMotion>` 中存在多种方式执行相同操作，规范定义了覆盖规则，分为两个部分：

- **关于运动路径的定义**：`<mpath>` 元素指定的运动路径覆盖 `path` 属性指定的运动路径；`path` 属性覆盖 `<animateMotion>` 元素的 `values` 属性；`values` 属性覆盖 `from`、`by` 和 `to`。
- **关于确定与 `keyTimes` 属性对应的点的定义**：`keyPoints` 属性覆盖 `path`；`path` 覆盖 `values`；`values` 覆盖 `from`、`by` 和 `to`。

例如同时使用 `path` 属性和 `<mpath>` 元素时，`<mpath>` 中的路径将生效；`keyPoints` 属性也会覆盖 `path` 中的定义。

#### rotate：设置元素沿运动路径的方向

前文小汽车沿路径移动的案例中，`<animateMotion>` 元素设置了 `rotate="auto"`：

```SVG
<svg viewBox="0 0 307 184" xmlns="http://www.w3.org/2000/svg" class="element">
    <!-- 定义路径形状 -->
    <path fill="none" stroke="#facc15" stroke-dasharray="4" d="M167.88,111.3 c3.11,0,6.12,1.44,8.06,3.96l30.58,39.82c1.75,2.28,4.95,2.91,7.43,1.46l64.07-37.37c1.75-1.02,2.84-2.92,2.84-4.95V96.04 c0-1.64-0.71-3.21-1.94-4.29c-1.23-1.09-2.87-1.59-4.5-1.39l-9.83,1.23c-4.66,0.58-8.96-1.96-10.68-6.34 c-1.73-4.37-0.33-9.16,3.48-11.93l0.19-0.14c2.48-1.8,2.71-4.49,2.09-6.41c-0.62-1.91-2.38-3.96-5.45-3.96 c-3.66,0-7.05-1.98-8.84-5.18L229.65,29.6c-1.01-1.8-2.93-2.93-5-2.93H155.2c-1.59,0-3.12,0.67-4.2,1.83l-28.78,31.06 c-1.91,2.06-4.62,3.25-7.43,3.25H31.87c-3.16,0-5.73,2.57-5.73,5.73v32.5c0,2.68,1.83,4.98,4.44,5.58l35.59-1.79 c3.27,0.76,23.73,23.28,26.51,22.67l73.06-15.98C166.45,111.38,167.17,111.3,167.88,111.3z" />
  
    <!-- 在路径上移动的小汽车 -->
    <path class="car" fill="#84CC16" style="transform: translate(-12px, -12px)" d="M16.38,18.39c0.22-0.44,0.24-0.8,0.2-1.07l0.19,0.01c0.02,0.21,0.18,0.37,0.4,0.38l2.44,0.06 c0.21,0.01,0.38-0.15,0.41-0.35l1.05,0.03c0.34,0.01,0.66-0.15,0.86-0.42l0.86-1.17c0.18-0.25,0.28-0.55,0.28-0.85V8.99 c0-0.31-0.1-0.6-0.28-0.85l-0.86-1.17c-0.2-0.27-0.52-0.43-0.86-0.42l-1.05,0.03c-0.03-0.2-0.2-0.36-0.41-0.35l-2.44,0.06 c-0.21,0.01-0.38,0.17-0.4,0.38l-0.19,0.01c0.04-0.27,0.02-0.63-0.2-1.07c-0.15-0.3-0.27-0.31-0.35-0.18 c-0.15,0.25-0.16,1,0.01,1.27L7.73,6.93C7.7,6.73,7.53,6.57,7.32,6.57L4.88,6.64C4.66,6.64,4.5,6.82,4.48,7.03L2.58,7.08 c0,0,0,0,0,0l-0.08,0C2.07,7.1,1.7,7.33,1.5,7.69C1.47,7.74,1.45,7.8,1.43,7.85C1.19,8.53,0.93,9.76,0.93,12 c0,2.24,0.26,3.47,0.5,4.15c0.16,0.45,0.59,0.75,1.06,0.77l2.04,0.06c0.01,0.21,0.18,0.38,0.4,0.39l2.44,0.06 c0.21,0.01,0.39-0.15,0.41-0.36l8.26,0.24c-0.17,0.27-0.16,1.02-0.01,1.27C16.11,18.71,16.23,18.7,16.38,18.39z M17.22,12 c0,0-0.02,3.07-0.57,4.6c0,0-1.07-0.27-2.03-1.49c-0.11-0.14-0.17-0.32-0.17-0.5V12V9.38c0-0.18,0.06-0.35,0.17-0.5 c0.96-1.22,2.03-1.49,2.03-1.49C17.2,8.93,17.22,12,17.22,12z M21.66,6.99c0.03-0.03,0.08-0.03,0.11,0.01 c0.19,0.25,0.88,1.16,1.04,1.38c0.18,0.26-0.02,0.74-0.2,0.36c-0.14-0.29-0.7-1.03-0.97-1.38C21.55,7.25,21.56,7.09,21.66,6.99z M15.83,7.18c0,0-0.95,1.2-3.43,1.2c-0.01,0-0.01,0-0.02,0V7.27L15.83,7.18z M6.51,7.42l5.56-0.14v1.1c-2.07,0-1.26,0-3.14,0 C6.97,8.37,6.51,7.42,6.51,7.42z M5.56,12c0-3.28,0.57-3.99,0.57-3.99C6.59,8.37,7.14,8.62,7.5,8.76c0.24,0.1,0.41,0.33,0.41,0.6 V12v2.64c0,0.26-0.16,0.5-0.41,0.6c-0.37,0.14-0.91,0.4-1.37,0.75C6.13,15.99,5.56,15.28,5.56,12z M6.51,16.58 c0,0,0.46-0.95,2.43-0.95c1.88,0,1.07,0,3.14,0v1.1L6.51,16.58z M12.38,16.73v-1.11c0.01,0,0.01,0,0.02,0c2.49,0,3.43,1.2,3.43,1.2 L12.38,16.73z M21.64,16.64c0.27-0.35,0.83-1.1,0.97-1.38c0.18-0.38,0.38,0.1,0.2,0.36c-0.16,0.22-0.85,1.13-1.04,1.38 c-0.03,0.03-0.08,0.04-0.11,0.01C21.56,16.91,21.55,16.75,21.64,16.64z">
        <!-- 使用animateMotion指定路径动画 -->
        <animateMotion dur="4s" repeatCount="indefinite" rotate="auto" begin="0.8" path="M167.88,111.3 c3.11,0,6.12,1.44,8.06,3.96l30.58,39.82c1.75,2.28,4.95,2.91,7.43,1.46l64.07-37.37c1.75-1.02,2.84-2.92,2.84-4.95V96.04 c0-1.64-0.71-3.21-1.94-4.29c-1.23-1.09-2.87-1.59-4.5-1.39l-9.83,1.23c-4.66,0.58-8.96-1.96-10.68-6.34 c-1.73-4.37-0.33-9.16,3.48-11.93l0.19-0.14c2.48-1.8,2.71-4.49,2.09-6.41c-0.62-1.91-2.38-3.96-5.45-3.96 c-3.66,0-7.05-1.98-8.84-5.18L229.65,29.6c-1.01-1.8-2.93-2.93-5-2.93H155.2c-1.59,0-3.12,0.67-4.2,1.83l-28.78,31.06 c-1.91,2.06-4.62,3.25-7.43,3.25H31.87c-3.16,0-5.73,2.57-5.73,5.73v32.5c0,2.68,1.83,4.98,4.44,5.58l35.59-1.79 c3.27,0.76,23.73,23.28,26.51,22.67l73.06-15.98C166.45,111.38,167.17,111.3,167.88,111.3z" />
    </path>
</svg>
```

汽车的方向固定、不随运动路径改变时就需要 `rotate` 属性。它影响元素在路径上的朝向，确保元素在运动路径上始终面向运动的方向，与 CSS 路径动画中的 `offset-rotate` 属性非常相似。`rotate` 属性可接受三个值：

- **`auto`**：对象随运动路径方向的角度（方向切线矢量）随时间旋转。
- **`auto-reverse`**：对象随运动路径方向的角度加 `180deg` 随时间旋转。
- **数字**：目标元素受到恒定的旋转变换，旋转角度为指定的角度数。

#### keyPoints：控制沿运动路径的动画距离

`keyPoints` 属性控制沿运动路径的动画距离，允许为 `keyTimes` 指定的每个时刻定义运动路径上的进度。如果指定了 `keyPoints`，`keyTimes` 将应用于 `keyPoints` 中的值，而不是 `values` 属性数组中指定的点或 `path` 属性上的点。

`keyPoints` 接受以分号分隔的浮点数值列表，各值介于 `0 ~ 1` 之间，表示在 `keyTimes` 指定的时刻对象在运动路径上的移动距离（距离的计算由浏览器的算法确定）；列表中的每个进度值对应 `keyTimes` 列表中的一个值。

::: warning keyPoints 需要 calcMode="linear"
要使 `keyPoints` 正常工作，需要将 `calcMode` 设置为 `linear`。若关键点来回移动，看似应该适用于步调动画（`paced`），但实际上不生效。
:::

以下示例演示 `keyPoints` 的用法：

```SVG
<svg width="300" height="180" viewBox="0 0 300 180" class="element">
    <path id="motionPath" fill="none" stroke="#facc15" stroke-dasharray="4" d="M10,80 Q150,10 300,80" />
    <circle cx="10" cy="80" r="10" fill="red" style="translate: -10px -80px">
        <animateMotion dur="6s" repeatCount="indefinite" keyPoints="0;0.5;1" keyTimes="0;0.5;1" calcMode="linear">
            <mpath xlink:href="#motionPath"/>
        </animateMotion>
    </circle>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/MWxRxoP

`keyPoints="0;0.5;1"` 表示动画在 `0%`、`50%` 和 `100%` 时刻沿运动路径的进度，从而在关键时刻精确控制动画位置。

#### 沿任意路径移动文本

沿路径移动文本与其他 SVG 元素不同：需要使用 SVG 的 `<textPath>` 元素而非 `<animateMotion>`。将 `<textPath>` 嵌套在 `<text>` 元素中，要沿路径定位的文本定义在 `<textPath>` 元素内部，并通过 `xlink:href` 引用 `<path>` 元素定义的路径：

```SVG
<svg width="500" height="180" viewBox="0 0 500 180" class="element">
    <path id="motionPath" fill="none" stroke="#facc15" stroke-dasharray="4" d="M10,120 Q250,10 500,120" />
    <text fill="lime">
        <textPath xlink:href="#motionPath">Follow me along the path!</textPath>
    </text>
</svg>
```

此时只能看到文本沿 `#motionPath` 路径排列，没有动画效果。要使文本沿路径运动，需要使用 `<animate>` 元素动画化 `startOffset` 属性：

```SVG
<svg width="500" height="180" viewBox="0 0 500 180" class="element">
    <path id="motionPath" fill="none" stroke="#facc15" stroke-dasharray="4" d="M10,120 Q250,10 500,120" />
    <text  fill="lime">
        <textPath xlink:href="#motionPath">
            <animate attributeName="startOffset" from="0%" to ="100%" begin="0s" dur="10s" repeatCount="indefinite" keyTimes="0;1" calcMode="spline" keySplines="0.1 0.2 .22 1"/>
            Follow me along the path!
        </textPath>
    </text>
</svg>
```

`startOffset` 表示文本在路径上的偏移：`0%` 是路径的开始，`100%` 是路径的结束。动画化 `startOffset` 即创建文本沿路径移动的效果：

> Demo 地址：https://codepen.io/airen/full/vYPMPrg

### `<animateTransform>` 元素

CSS 中可以通过 `transform` 属性及独立的变换属性（`translate`、`scale`、`rotate` 等）对元素进行变换，CSS 变换也是创建流畅动画的首选之一。

SVG 中对应的元素是 `<animateTransform>`：它对目标元素进行平移、缩放、旋转和倾斜的变换动画，在一定时间内逐渐改变目标元素的变换属性。它采用与 `<animate>` 元素相同的属性，并额外提供一个 `type` 属性。

`type` 属性指定正在进行动画的变换类型，有五个可能的值：`translate`、`scale`、`rotate`、`skewX` 和 `skewY`。`from`、`by` 和 `to` 属性采用与给定变换类型相同语法表达的值：

- `type="translate"`：每个独立的值表示为 `<tx> [,<ty>]`。
- `type="scale"`：每个独立的值表示为 `<sx> [,<sy>]`。
- `type="rotate"`：每个独立的值表示为 `<rotate-angle> [<cx> <cy>]`。
- `type="skewX"` 和 `type="skewY"`：每个独立的值表示为 `<skew-angle>`。

`<animateTransform>` 是 SVG 动画中最复杂的部分：单个变换动画并不复杂，但当包含多个变换时情况会变得非常混乱——一个 `<animateTransform>` 可能会覆盖另一个，最终效果可能与预期不符。相比之下，CSS 变换简单得多，而且 CSS 与 SVG 已经可以很好地配合创建复杂的动画效果，因此多数场景下可以不在 SVG 中使用 `<animateTransform>`。

以下是使用 `<animateTransform>` 旋转矩形的简单示例：

```SVG
<svg width="500" height="400" viewBox="0 0 500 400" class="element">
    <rect width="30" height="30" x="300" y="100" fill="lime">
        <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 50 25" to="360 50 25" dur="3s" repeatCount="indefinite" />
    </rect>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/ExMJJNy

矩形在 `3s` 内从初始状态（旋转角度 `0`）逐渐旋转到 `360deg`，无限次重复。

再看一个稍复杂的效果：`<animate>` 与 `<animateTransform>` 一起创建脉搏动画：

```SVG
<svg width="400" height="400" viewBox="0 0 400 400" class="element">
    <circle class="pulse" cx="50%" cy="50%" r="30" stroke="black" stroke-width="4" fill="#ffffff" stroke-opacity="0">
        <animate attributeName="stroke-width" from="4" to="0" repeatCount="indefinite" begin="0s" dur="2s" />
        <animate attributeName="stroke-opacity" from="1" to="0" repeatCount="indefinite" begin="0s" dur="2s" />
        <animateTransform attributeName="transform" type="scale" from=".3" to="2" repeatCount="indefinite" begin="0s" dur="2s" />
    </circle>
    <circle cx="50%" cy="50%" r="30" stroke="black" stroke-width="4" stroke-opacity="1" fill="black"></circle>
</svg>
```

代码中 `<animateTransform>` 实现缩放动画，各属性含义如下：

- `attributeName="transform"`：指定要动画的属性是元素的变换属性。
- `type="scale"`：指定变换类型是缩放。
- `from=".3"`：起始值，从原始大小的 `0.3` 倍开始。
- `to="2"`：结束值，缩放到原始大小的 `2` 倍。
- `repeatCount="indefinite"`：动画无限次重复。
- `begin="0s"`：文档加载后立即执行。
- `dur="2s"`：动画持续时间为 `2` 秒。

需要配合 CSS 的 `transform-origin` 让圆围绕圆心缩放：

```CSS
.pulse {
    transform-origin: 50% 50%;
}
```

> Demo 地址：https://codepen.io/airen/full/dyrLLvV

## SVG 动画案例

掌握前面的基础后，可以组合运用这些元素构建实际案例。

### 渐变动画

SVG 中可以使用 `<linearGradient>` 创建渐变效果，渐变本身也可以被动画化。先看一个静态渐变：

```SVG
<svg width="500" height="200" viewBox="0 0 500 200" class="element">
    <defs>
        <linearGradient id="gradient">
            <stop offset="5%" stop-color="#FF6600" />
            <stop offset="95%" stop-color="#FFFFCC" />
        </linearGradient>
    </defs>
    <rect x="50" y="50" width="400" height="100" fill="url(#gradient)" />
</svg>
```

代码使用 `<linearGradient>` 创建了 `#ff6600` 到 `#ffffcc` 的线性渐变，并作为矩形的背景。

若要动画化渐变右端的淡黄色，需要在 `<stop>` 元素中插入 `<animate>` 元素：

```SVG
<svg width="500" height="200" viewBox="0 0 500 200" class="element">
    <defs>
        <linearGradient id="gradient">
            <stop offset="5%" stop-color="#FF6600" />
            <stop offset="95%" stop-color="#FFFFCC">
                <animate attributeName="stop-color" begin="0s" dur="5s" from="#FFFFCC"
    to="#000066" repeatCount="indefinite" />
            </stop>
        </linearGradient>
    </defs>
    <rect x="50" y="50" width="400" height="100" fill="url(#gradient)" />
</svg>
```

第二个渐变色从淡黄色 `#ffffcc` 到深蓝色 `#000066` 进行动画，持续 `5s` 并不断循环播放。

若要同时动画化两个颜色，按相同方式给另一个 `<stop>` 元素添加动画即可：

```SVG
<svg width="500" height="200" viewBox="0 0 500 200" class="element">
    <defs>
        <linearGradient id="gradient">
            <stop offset="5%" stop-color="#FF6600">
                <animate attributeName="stop-color" begin="0s" dur="5s" from="#FF6600" to="#FFFFCC" repeatCount="indefinite" />
            </stop>
            <stop offset="95%" stop-color="#FFFFCC">
                <animate attributeName="stop-color" begin="0s" dur="5s" from="#FFFFCC"
    to="#FF6600" repeatCount="indefinite" />
            </stop>
        </linearGradient>
    </defs>
    <rect x="50" y="50" width="400" height="100" fill="url(#gradient)" />
</svg>
```

上述代码会动画化并改变渐变的方向：

> Demo 地址：https://codepen.io/airen/full/jOJRRXE

### 滤镜动画

除渐变外，SVG 滤镜同样可以动画化：

```SVG
<svg width="500" height="400" viewBox="0 0 500 400" class="element">
    <defs>
        <!-- 给渐变添加动画 -->
        <linearGradient id="gradient">
            <stop offset="5%" stop-color="#FF6600">
                <animate attributeName="stop-color" begin="0s" dur="5s" from="#FF6600" to="#FFFFCC" repeatCount="indefinite" />
            </stop>
            <stop offset="95%" stop-color="#FFFFCC">
                <animate attributeName="stop-color" begin="0s" dur="5s" from="#FFFFCC" to="#FF6600" repeatCount="indefinite" />
            </stop>
        </linearGradient>
         
        <!-- 给滤镜添加动画 -->
        <filter id="Turbulence1" in="SourceImage" filterUnits="objectBoundingBox">
            <feTurbulence in="SourceAlpha" type="turbulence" baseFrequency="0.01" numOctaves="1" seed="0">
                <animate attributeName="baseFrequency" values="0.01; 0.008; 0.01; 0.012; 0.01" keyTimes="0; 0.25; 0.5; 0.75; 1" begin="0s" dur="5s" repeatCount="indefinite" />
            </feTurbulence>
        </filter>
    </defs>
    
    <rect x="0" y="0" width="500" height="400" fill="url(#gradient)" filter="url(#Turbulence1)" />
</svg>
```

> Demo 地址：https://codepen.io/airen/full/xxBeNwY

使用相似的方法还可以创建类似投射在字母上的探照灯效果：

```SVG
<svg width="600" height="270" viewBox="0 0 600 270" class="element">
    <defs>
        <filter id="spot" x="-20%" y="-60%" width="150%" height="300%">
            <feDiffuseLighting in="SourceGraphic" lighting-color="red" result="lamp" diffuseConstant=".8" surfaceScale="10" resultScale=".2">
                <feSpotLight x="300" y="250" z="15" pointsAtX="0" pointsAtY="100" pointsAtZ="0" specularExponent="10">
                     <animate attributeName="pointsAtX" values="0;100;400;100;0" begin="0s" dur="8s" repeatCount="indefinite" />
                </feSpotLight>
                <animate attributeName="lighting-color" values="yellow;white;red;white;yellow;" begin="0s" dur="8s" repeatCount="indefinite"/>
            </feDiffuseLighting>
            <feComposite in="lamp" result="lamp" operator="arithmetic" k2="1" k3="1" />
        </filter>
    </defs>
    
    <text id="Spotlight" pointer-events="none" fill="white" stroke-width="4" stroke="white" filter="url(#spot)" x="10" y="150">SVG Animation!</text>
</svg>
```

> Demo 地址：https://codepen.io/airen/full/rNRbgzp

若未接触过 SVG 滤镜但喜欢其视觉效果，可以使用 [@yoksel_en](https://twitter.com/yoksel_en) 编写的 [SVG Filters 工具](https://yoksel.github.io/svg-filters/#/)：

> Demo 地址：https://yoksel.github.io/svg-filters/

### 形状变形的路径

SVG 中还可以对 `<path>` 元素的 `d` 属性进行动画处理，从而创建形状变形（morphing）的动画效果。

`d` 属性包含定义所绘制形状轮廓的数据——一组命令和坐标，告诉浏览器在最终路径中绘制点、弧线和线段的位置和方式。对该属性进行动画即可对 SVG 路径做形状变形。实现条件是：**起始、结束和任何中间路径形状都必须具有相同数量的顶点（点），并且以相同的顺序出现**。顶点数量不匹配时动画无法正常工作——形状变形实际是通过移动顶点并插值其位置实现的，缺少或不匹配一个顶点，路径将不再被插值。

例如创建形状变形动画需要两个具有相同数量顶点（或点）的 SVG：

```SVG
<!-- 形状一 -->
<svg  xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 288 288">
    <linearGradient id="PSgrad_0" x1="70.711%" x2="0%" y1="70.711%" y2="0%">
        <stop offset="0%" stop-color="rgb(95,54,152)" stop-opacity="1" />
        <stop offset="100%" stop-color="rgb(247,109,138)" stop-opacity="1" />
    </linearGradient>
    
    <path fill="url(#PSgrad_0)" d="M37.5,186c-12.1-10.5-11.8-32.3-7.2-46.7c4.8-15,13.1-17.8,30.1-36.7C91,68.8,83.5,56.7,103.4,45 c22.2-13.1,51.1-9.5,69.6-1.6c18.1,7.8,15.7,15.3,43.3,33.2c28.8,18.8,37.2,14.3,46.7,27.9c15.6,22.3,6.4,53.3,4.4,60.2 c-3.3,11.2-7.1,23.9-18.5,32c-16.3,11.5-29.5,0.7-48.6,11c-16.2,8.7-12.6,19.7-28.2,33.2c-22.7,19.7-63.8,25.7-79.9,9.7 c-15.2-15.1,0.3-41.7-16.6-54.9C63,186,49.7,196.7,37.5,186z"/>
</svg> 

<!-- 形状二 -->
<svg  xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 288 288">
    <linearGradient id="PSgrad_0" x1="70.711%" x2="0%" y1="70.711%" y2="0%">
        <stop offset="0%" stop-color="rgb(95,54,152)" stop-opacity="1" />
        <stop offset="100%" stop-color="rgb(247,109,138)" stop-opacity="1" />
    </linearGradient>
    <path fill="url(#PSgrad_0)" d="M51,171.3c-6.1-17.7-15.3-17.2-20.7-32c-8-21.9,0.7-54.6,20.7-67.1c19.5-12.3,32.8,5.5,67.7-3.4C145.2,62,145,49.9,173,43.4 c12-2.8,41.4-9.6,60.2,6.6c19,16.4,16.7,47.5,16,57.7c-1.7,22.8-10.3,25.5-9.4,46.4c1,22.5,11.2,25.8,9.1,42.6 c-2.2,17.6-16.3,37.5-33.5,40.8c-22,4.1-29.4-22.4-54.9-22.6c-31-0.2-40.8,39-68.3,35.7c-17.3-2-32.2-19.8-37.3-34.8 C48.9,198.6,57.8,191,51,171.3z"/>
</svg>
```

::: warning 顶点数量与顺序必须一致
两个形状（`<path>`）之间不要删除或添加任何节点，否则动画将出错。基于相同数量和顺序的顶点，可以得到两个或多个不同效果的形状。
:::

将两个 `<svg>` 合并为一个，只保留一个 `<path>` 元素，并在其中嵌套 `<animate>` 元素对 `d` 属性进行动画，设置持续时间为 `5s`，无限循环播放：

```SVG
<svg xmlns="http://www.w3.org/2000/svg" width="288" height="288" viewBox="0 0 288 288" class="element">
    <linearGradient id="PSgrad_0" x1="70.711%" x2="0%" y1="70.711%" y2="0%">
        <stop offset="0%" stop-color="rgb(95,54,152)" stop-opacity="1" />
        <stop offset="100%" stop-color="rgb(247,109,138)" stop-opacity="1" />
    </linearGradient>
    
    <path fill="url(#PSgrad_0)">
    <animate repeatCount="indefinite" attributeName="d" dur="5s" 
        values="
            M37.5,186c-12.1-10.5-11.8-32.3-7.2-46.7c4.8-15,13.1-17.8,30.1-36.7C91,68.8,83.5,56.7,103.4,45 c22.2-13.1,51.1-9.5,69.6-1.6c18.1,7.8,15.7,15.3,43.3,33.2c28.8,18.8,37.2,14.3,46.7,27.9c15.6,22.3,6.4,53.3,4.4,60.2 c-3.3,11.2-7.1,23.9-18.5,32c-16.3,11.5-29.5,0.7-48.6,11c-16.2,8.7-12.6,19.7-28.2,33.2c-22.7,19.7-63.8,25.7-79.9,9.7 c-15.2-15.1,0.3-41.7-16.6-54.9C63,186,49.7,196.7,37.5,186z;
            M51,171.3c-6.1-17.7-15.3-17.2-20.7-32c-8-21.9,0.7-54.6,20.7-67.1c19.5-12.3,32.8,5.5,67.7-3.4C145.2,62,145,49.9,173,43.4 c12-2.8,41.4-9.6,60.2,6.6c19,16.4,16.7,47.5,16,57.7c-1.7,22.8-10.3,25.5-9.4,46.4c1,22.5,11.2,25.8,9.1,42.6 c-2.2,17.6-16.3,37.5-33.5,40.8c-22,4.1-29.4-22.4-54.9-22.6c-31-0.2-40.8,39-68.3,35.7c-17.3-2-32.2-19.8-37.3-34.8 C48.9,198.6,57.8,191,51,171.3z;
            M37.5,186c-12.1-10.5-11.8-32.3-7.2-46.7c4.8-15,13.1-17.8,30.1-36.7C91,68.8,83.5,56.7,103.4,45 c22.2-13.1,51.1-9.5,69.6-1.6c18.1,7.8,15.7,15.3,43.3,33.2c28.8,18.8,37.2,14.3,46.7,27.9c15.6,22.3,6.4,53.3,4.4,60.2 c-3.3,11.2-7.1,23.9-18.5,32c-16.3,11.5-29.5,0.7-48.6,11c-16.2,8.7-12.6,19.7-28.2,33.2c-22.7,19.7-63.8,25.7-79.9,9.7 c-15.2-15.1,0.3-41.7-16.6-54.9C63,186,49.7,196.7,37.5,186z" />
    </path>
</svg>
```

`<animate>` 元素的 `values` 属性是以分号分隔的列表值，列表中的每个值对应 `d` 属性的一个值。上述代码定义了三个形状之间的变化：

> Demo 地址：https://codepen.io/airen/full/rNRbXVa

示例只展示了三个形状之间的变形，按需可以创建更多形状的变形。例如 [Felix Hornoiu 编写的数字倒计时变形效果](https://codepen.io/felixhornoiu/full/JjmVZw)：

> Demo 地址：https://codepen.io/felixhornoiu/full/JjmVZw （来源于 [@Felix Hornoiu](https://codepen.io/felixhornoiu/full/JjmVZw)）

### 粒子动画

结合其他特性可以构建更复杂的动画。例如基于 `getPointAtLength()` 函数动态改变 `<path>` 的数据，创造复杂的粒子动画效果。[Louis Hoebregts](https://codepen.io/Mamboleoo) 在 CodePen 提供了两个案例：

> Demo 地址：https://codepen.io/Mamboleoo/full/ZEXMjmm

> Demo 地址：https://codepen.io/Mamboleoo/full/NWaogXW

在此基础上稍作调整，即可将这些动画效果添加到 Web 组件或界面中，创建引人注目的视觉效果。

### 给 SVG 插图添加动画

Web 上使用的 SVG 常来自第三方库或工具，通常是静态的，例如 [unDraw](https://undraw.co/illustrations) 平台提供的插图。运用本文的知识即可为插图添加动画效果：

```SVG
<svg xmlns="http://www.w3.org/2000/svg" data-name="Layer 1" width="657.03596" height="776.13897" viewBox="0 0 657.03596 776.13897" xmlns:xlink="http://www.w3.org/1999/xlink">
    <path id="line1" data-name="Path 2548" d="M319.381,207.34151a4.98,4.98,0,0,1-3.286-1.233l-42.939-37.481a5,5,0,0,1,6.576-7.533l42.939,37.481a5,5,0,0,1-3.29,8.767Z" transform="translate(-271.48202 -61.93052)" fill="#e4e4e4" fill-opacity="0">
        <animate attributeName="fill" from="#e4e4e4" to="#FFEB3B" dur=".5s" begin="0s" fill="freeze" />
        <animate attributeName="fill-opacity" from="0" to="1" dur=".5s" begin="0s" fill="freeze" id="anim1" />
    </path>
    <path id="line2" data-name="Path 2553" d="M451.981,157.43052a5,5,0,0,1-5-5v-85.5a5,5,0,0,1,10,0v85.5A5,5,0,0,1,451.981,157.43052Z" transform="translate(-271.48202 -61.93052)" fill="#e4e4e4" fill-opacity="0">
        <animate attributeName="fill" from="#e4e4e4" to="#FFEB3B" dur=".5s" begin="anim1.end" fill="freeze" />
        <animate attributeName="fill-opacity" from="0" to="1" dur=".5s" begin="anim1.end" fill="freeze" id="anim2" />
    </path>
  
    <path id="line3" data-name="Path 2549" d="M577.45905,207.34151a5,5,0,0,1-3.29-8.767l42.93792-37.484a5,5,0,0,1,6.576,7.533l-42.939,37.481A4.98,4.98,0,0,1,577.45905,207.34151Z" transform="translate(-271.48202 -61.93052)" fill="#e4e4e4" fill-opacity="0">
        <animate attributeName="fill" from="#e4e4e4" to="#FFEB3B" dur=".5s" begin="anim2.end" fill="freeze"  />
        <animate attributeName="fill-opacity" from="0" to="1" dur=".5s" begin="anim2.end" fill="freeze" id="anim3" />
    </path>
  
    <path d="M916.98312,822.59834a50.79382,50.79382,0,0,1-13.58984,12.63c-1.12012.71-2.27,1.38-3.43994,2H872.42355c.32959-.66.64991-1.33.96-2a95.35446,95.35446,0,0,0-19.84034-109.34c16.64014,5.14,32.02,15.16,42.08008,29.37006a64.46956,64.46956,0,0,1,10.23,23,96.27571,96.27571,0,0,0-7.66992-48.41c13.50977,10.99,24.03027,26.04,28.04,42.98C930.23312,789.77833,927.32346,808.58833,916.98312,822.59834Z" transform="translate(-271.48202 -61.93052)" fill="#f0f0f0" />
    <path id="b35682e1-9f03-403a-b8b0-c3d37d0d1380-2562" data-name="Path 2533" d="M928.136,838.06948H670.398v-2.106h258.12Z" transform="translate(-271.48202 -61.93052)" fill="#3f3d56" />
    <path d="M580.23,325.2c0,38.64-13.5,71.63-39.19,96.18-18.23,17.43-46.31,41.86-46.31,67.69v21.37h-85.5V489.07c0-26.1-28.19-50.58-46.31-67.69-25.11-23.69-39.19-58.92-39.19-96.18v-.79a128.25061,128.25061,0,0,1,256.5.79Z" transform="translate(-271.48202 -61.93052)" fill="#6c63ff" />
    <path id="ecc2cf6c-8ee8-498c-972d-3c77e28b77e9-2563" data-name="Path 2546" d="M494.729,513.44052a3,3,0,0,1-3-3v-21.374c0-25.125,24.779-48.58,42.873-65.706,1.5-1.422,2.961-2.8,4.363-4.145,25.029-23.928,38.259-56.437,38.259-94.014,0-70.229-55.013-125.243-125.242-125.243h-.354A125.03,125.03,0,0,0,326.739,324.49652v.7c0,36.8,13.939,71.063,38.245,94.007,1.231,1.163,2.51,2.36,3.823,3.589,18.327,17.159,43.427,40.658,43.427,66.275v21.373a3,3,0,0,1-6,0v-21.374c0-23.015-24-45.486-41.528-61.9q-1.9785-1.851-3.841-3.605c-25.5-24.072-40.126-59.924-40.126-98.364v-.72c.2-72.045,58.885-130.523,130.88-130.523h.371A130.557,130.557,0,0,1,583.22407,323.83091q.00357.68526-.00006,1.3706c0,39.255-13.871,73.264-40.112,98.351-1.409,1.347-2.876,2.736-4.386,4.165-17.3,16.377-41,38.806-41,61.349v21.374a3,3,0,0,1-3,3Z" transform="translate(-271.48202 -61.93052)" fill="#3f3d56" />
    <path id="b22bef41-3cd7-4c1e-881c-c9a642005cb0-2564" data-name="Path 2547" d="M480.481,551.93552h-57a5,5,0,1,1,0-10h57a5,5,0,0,1,0,10Z" transform="translate(-271.48202 -61.93052)" fill="#6c63ff" />
    <path d="M458.10991,585.43538H445.84282a23.44664,23.44664,0,0,1-12.09412-3.35059,2.79354,2.79354,0,0,1-1.26831-3.21435,2.8865,2.8865,0,0,1,2.80164-2.14209h33.38891a2.88664,2.88664,0,0,1,2.80176,2.14209,2.79336,2.79336,0,0,1-1.26856,3.21435A23.44509,23.44509,0,0,1,458.10991,585.43538Z" transform="translate(-271.48202 -61.93052)" fill="#3f3d56" />
    <path d="M480.49077,567.72932l-57.33814-.00634-.17761-.38086a4.726,4.726,0,0,1,.89978-4.05811,4.85563,4.85563,0,0,1,3.82288-1.84863h48.55773a4.855,4.855,0,0,1,3.82325,1.84912,4.698,4.698,0,0,1,.91089,4.00732l-.09009.38623Z" transform="translate(-271.48202 -61.93052)" fill="#3f3d56" />
    <path id="a74da646-4683-465e-97fe-dd817e7fc328-2567" data-name="Path 2550" d="M494.729,534.19052h-85.5a5,5,0,0,1,0-10h85.5a5,5,0,0,1,0,10Z" transform="translate(-271.48202 -61.93052)" fill="#6c63ff" />
  
    <path d="M449.88,403.57,432.1,510.44H421.95l18.06-108.51a5.00266,5.00266,0,0,1,9.87,1.64Z" transform="translate(-271.48202 -61.93052)" fill="#e6e6e6" >
        <animate attributeName="fill" from="#e4e4e4" to="red" dur="1s" begin="0s" fill="freeze" repeatCount="indefinite" />
    </path>
    <path d="M484.05,510.44H473.9L456.12,403.57a5.00266,5.00266,0,0,1,9.87-1.64Z" transform="translate(-271.48202 -61.93052)" fill="#e6e6e6" >
        <animate attributeName="fill" from="#e4e4e4" to="red" dur="1s" begin="0s" fill="freeze" repeatCount="indefinite" />
    </path>
    <path id="line4" data-name="Path 2551" d="M419.48452,400a5,5,0,0,1,5-5h54.993a5,5,0,0,1,0,10h-54.993A5,5,0,0,1,419.48452,400Z" transform="translate(-271.48202 -61.93052)" fill="#e6e6e6" >
        <animate attributeName="fill" from="#e4e4e4" to="red" dur="1s" begin="0s" fill="freeze" repeatCount="indefinite" />
    </path>
  
    <path id="eba1f826-879a-4c25-b118-6bb025be95d0-2570" data-name="Path 2559" d="M860.701,824.07953H848.443l-5.832-47.288h18.092Z" transform="translate(-271.48202 -61.93052)" fill="#feb8b8" />
    <path id="f6694a1b-3521-46e6-aa9c-51f4297aac52-2571" data-name="Path 2560" d="M863.82805,835.96354H824.297v-.5a15.387,15.387,0,0,1,15.385-15.386h24.146Z" transform="translate(-271.48202 -61.93052)" fill="#2f2e41" />
    <path id="fae71c2d-33fb-45f7-8331-19b4de5eddc8-2572" data-name="Path 2561" d="M767.564,823.67553l-11.844-3.167,6.58-47.19,17.48,4.674Z" transform="translate(-271.48202 -61.93052)" fill="#feb8b8" />
    <path id="b3b10fd6-5fa4-49f3-8270-96ad6a3a1e0e-2573" data-name="Path 2562" d="M767.515,835.96354l-38.189-10.212.129-.483a15.387,15.387,0,0,1,18.839-10.89h0l23.325,6.237Z" transform="translate(-271.48202 -61.93052)" fill="#2f2e41" />
    <path id="f6267da0-acb1-421a-9dac-5a6151c1f955-2574" data-name="Path 2563" d="M867.754,559.06753l10.269,11.931-13.28,242.442h-28.369l-14.3-186.551-44.349,191.554-29.492-7.233,26.816-243.3Z" transform="translate(-271.48202 -61.93052)" fill="#2f2e41" />
    <path id="ea0dabd6-18d7-4484-8048-4cddc34702bd-2575" data-name="Path 2564" d="M781.905,402.54252l28.246-14.172,43.437.764,37.38,19.127L869.7,514.4795l9.187,55.38h0a226.53255,226.53255,0,0,1-108.335.892l-.284-.068s21.114-74.916,12.126-97.779Z" transform="translate(-271.48202 -61.93052)" fill="#e6e6e6" />
    <path id="a75b604a-8411-40e9-b5d3-81fba8b6e00c-2576" data-name="Path 2565" d="M863.621,345.93452a31.994,31.994,0,1,0,0,.237Z" transform="translate(-271.48202 -61.93052)" fill="#feb8b8" />
    <path id="b97e8772-edf1-4d51-bb40-aaab108bf113-2577" data-name="Path 2567" d="M778.007,479.9835a11.462,11.462,0,0,0,16.65,5.627l57.353,30.318,1.857-13.971-55.73-32.863a11.524,11.524,0,0,0-20.131,10.889Z" transform="translate(-271.48202 -61.93052)" fill="#feb8b8" />
    <path id="b7638692-4395-4c34-bc33-e4b41c888504-2578" data-name="Path 2568" d="M854.436,482.39851a11.462,11.462,0,0,1-17.478,1.848l-62.6,17.035.545-17.738,62.27106-16.173a11.524,11.524,0,0,1,17.261,15.03Z" transform="translate(-271.48202 -61.93052)" fill="#feb8b8" />
    <path id="fb7d8996-2760-43c1-a9a4-d402d6d3756c-2579" data-name="Path 2569" d="M878.762,409.0305l12.205-.765s14.29,18.855,6.364,39.316c0,0,1.373,73.5-30.276,70.48s-41.65-3.019-41.65-3.019l9.5-26.5,21.253-6.562s-6.55-28.894,5.849-40.916Z" transform="translate(-271.48202 -61.93052)" fill="#e6e6e6" />
    <path id="a9eb06d8-8cbf-43ab-991d-4f9eccd60edd-2580" data-name="Path 2570" d="M790.63005,408.38551l-1.725-8.843s-25.44-.6-30.47,37.951c0,0-22.877,57.692-.454,65.121s47.089,0,47.089,0l-1.85711-25.444-24.67-5.033s12.745-16.489,5.805-30.792Z" transform="translate(-271.48202 -61.93052)" fill="#e6e6e6" />
    <path id="ba7ab43e-494b-455d-a87f-0e0f24cb0a47-2581" data-name="Path 2387" d="M842.70445,361.6451c-2.35273-.92321-4.95894-.87527-7.44567-1.33105-8.89342-1.63849-15.75239-10.70648-14.90781-19.70962a10.84778,10.84778,0,0,0,.05763-3.5329c-.61621-2.569-3.47169-3.94789-6.09484-4.25558s-5.33331.086-7.885-.59694c-3.93954-1.05505-6.883-4.64835-7.88062-8.603a19.487,19.487,0,0,1,1.267-11.96329l1.22416,2.55209a9.91759,9.91759,0,0,0,2.5062-4.85275,6.25462,6.25462,0,0,1,5.16622,3.27253c1.58106.70614,1.388-2.90614,2.96395-3.621a2.95887,2.95887,0,0,1,2.10019.27339c3.47269,1.16515,7.156-.583,10.59739-1.83576a40.41732,40.41732,0,0,1,18.64164-2.13018c4.18269.51056,8.40506,1.74686,11.66025,4.41951a26.60667,26.60667,0,0,1,6.156,8.27393c4.017,7.50846,7.04316,15.79159,6.96075,24.30956a35.29808,35.29808,0,0,1-6.1645,19.5192c-2.052,2.98581-8.67978,13.34292-13.08484,12.20287C843.00869,372.607,849.32934,364.24347,842.70445,361.6451Z" transform="translate(-271.48202 -61.93052)" fill="#2f2e41" />
</svg>
```

> Demo 地址：https://codepen.io/airen/full/zYbXgEK

这种思路创建的动画效果非常适用于带插图的语言页面，例如 404 页面。

## 实践要点与兼容性

::: warning 浏览器兼容性
- SMIL 为高性能的 SVG 动画渲染提供了许多强大的功能，但 Webkit 对 SMIL 的支持正在逐渐减弱。
- Microsoft 的 IE 与 Edge 浏览器从未支持 SMIL。
- SMIL 动画在 SVG 作为 `<img>` 嵌入或用作 CSS `background-image` 时仍然有效（前提是浏览器支持），而 JavaScript 动画在这两种情况下不起作用——这是 SMIL 相对 JavaScript 动画的关键优势。
:::

替代方案方面，CSS 与 WAAPI 可以找到 SMIL 大部分能力的对应实现，并且往往能更好地实现相同的动画效果、提供更好的控制。选择技术方案时可以遵循以下原则：

- 常规的属性动画优先使用 CSS 动画或过渡，可维护性和兼容性更好。
- 涉及 `d` 属性变形、路径运动等 CSS 覆盖不到的能力，且运行环境允许时，可使用 SMIL。
- 需要 SVG 作为 `<img>` 或背景图且必须带动画时，SMIL 是唯一可行方案。
- 复杂交互驱动的动画优先使用 JavaScript 或 WAAPI。

## 小结

本文系统介绍了 SMIL 动画在 SVG 中的基础与技术性内容：从静态元素动画、基本属性（`attributeName`、`from`/`to`/`by`、`begin`/`end`、`dur`、`repeatCount`/`repeatDur`、`fill`、`restart`、`min`/`max`），到四个动画元素（`<animate>`、`<set>`、`<animateMotion>`、`<animateTransform>`），再到渐变、滤镜、形状变形、粒子和插图等典型案例。这些知识足以创建许多令人印象深刻的动画效果，尤其是形状变形和滤镜方向。

SMIL 是 SVG 动画的规范，为高性能 SVG 动画渲染提供了强大的功能；但考虑到 Webkit 支持减弱、IE/Edge 从未支持的现状，以及 CSS 与 WAAPI 替代方案的成熟，投入 SMIL 的深度学习需要谨慎评估——它有可能像 Flash 技术一样成为历史。实践中建议优先使用 CSS 或 WAAPI 实现同样的动画效果，SMIL 作为特定场景（`<img>`/背景图内动画、`d` 属性变形）的补充手段。
