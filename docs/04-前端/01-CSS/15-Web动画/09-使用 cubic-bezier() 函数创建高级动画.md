---
title: 使用 cubic-bezier() 函数创建高级动画
description: "通过上一节课（《CSS 缓动函数基础：为 Web 动画注入灵魂》）的学习，知道了 CSS 为我们提供了一些预设的动画缓动函数，比如 linear 、ease 、ease-in 、ease-out 和 ease-in-out 。"
keywords: [使用, 函数创建高级动画]
category: CSS
tags: [CSS, 布局, 动画, 响应式]
---


# 使用 cubic-bezier() 函数创建高级动画

每一位 Web 开发者都期望自己创建的 Web 动画能更接近现实物体运动，效果才更自然、直观和真实。只有如此才能使用户界面更加吸引人，同时给用户提供更好的体验。为了使 Web 上的元素运动更自然和生动，缓动函数起到了关键作用。换句话说，**在 Web 动画中，核心的关键在于缓动曲线**。缓动曲线是动画的“节奏”，了解它有助于改进自己的动画和用户界面。通过选择合适的缓动曲线，可以实现动画的平滑过渡，提高用户体验，以及传达更好的品牌形象。

  


通过上一节课（《CSS 缓动函数基础：为 Web 动画注入灵魂》）的学习，知道了 CSS 为我们提供了一些预设的动画缓动函数，比如 `linear` 、`ease` 、`ease-in` 、`ease-out` 和 `ease-in-out` 。也知道如何为动画选择合适的缓动函数。但在某些情境中，使用这些预设的缓动函数制作出来的动画效果似乎感觉不太对，需要使用 `cubic-bezier()` 函数来调整动画的缓动函数，使动画效果达到更令人满意的结果。`cubic-bezier()` 函数允许 Web 开发者完全控制创建自定义缓动函数，从而创建更高级动画效果。

  


在这节课中，我将带领大家一起进入 `cubic-bezier()` 函数的世界。通过学习 `cubic-bezier()` 函数的工作原理，你将能够自定义动画的缓动曲线，实现更吸引人的动画效果。我们将深入探讨 `cubic-bezier()` 函数的各种参数以及它背后的数学，然后尝试可视化这个函数的图形表示是如何转化为运动的，并演示如何通过 `cubic-bezier()` 函数相关参数来获得不同的动画效果。此外，我们还将提供实际示例和在线工具，帮助你更好地应用这一知识。

  


无论你是 Web 设计师还是开发人员，这个节课的内容都将帮助你提升动画的质量和创造力。让我们开始吧！

  


## 问题和现象

  


在开始探讨 `cubic-bezier()` 函数之前，我们先从实际问题和存在的现象出发，这样有助于大家更好的理解 `cubic-bezier()` 函数存在的意义以及给动画带来的作用。

  


Web 上有很多令人着迷的微互动效果，只是制作这些微互动效果可能会很繁琐，但如果构建得当，它们可以使组件从好到卓越！例如，按钮组件的悬停过渡效果，使用 `linear` 、`ease` 、`ease-in` 、`ease-out` 或 `ease-in-out` 等缓动函数，效果似乎都感觉不太对。你会发现，使用 `cubic-bezier(0.34, 1.56, 0.64, 1)` 缓动函数能够得到令人满意的效果：

  


  


> Demo 地址：https://codepen.io/airen/full/VwgPqgb

  


你可能会感到困惑，为什么 `cubic-bezier(0.34, 1.56, 0.64, 1)` 缓动函数构建的动画效果就要更好呢？

  


请先把你这个困惑留着！我们继续来看另一个问题，或者说现象吧！

  


在创建 CSS 动画时，有的时候你可能要处理复杂的 CSS 动画。此时的你，往往倾向于使用一个复杂的 `@keyframes` 。例如一个类似弹簧的动画效果：

  


```CSS
@keyframes spring {
    0% {
        translate: -180px;
    }

    1% {
        translate: -177.3435735090288px;
    }

    2% {
        translate: -169.8454506830849px;
    }

    3% {
        translate: -158.073277255957px;
    }

    4% {
        translate: -142.60161357036569px;
    }

    5% {
        translate: -124.00308531410745px;
    }

    6% {
        translate: -102.84040395651255px;
    }

    7% {
        translate: -79.65928788338486px;
    }

    8% {
        translate: -54.982299437869386px;
    }

    9% {
        translate: -29.303598569845974px;
    }

    10% {
        translate: -3.0846006619091213px;
    }

    11% {
        translate: 23.24948560739793px;
    }

    12% {
        translate: 49.31227475156342px;
    }

    13% {
        translate: 74.75801848731751px;
    }

    14% {
        translate: 99.28266777327894px;
    }

    15% {
        translate: 122.6242392946777px;
    }

    16% {
        translate: 144.56254736004888px;
    }

    17% {
        translate: 164.91836542116408px;
    }

    18% {
        translate: 183.5520834485631px;
    }

    19% {
        translate: 200.3619282795715px;
    }

    20% {
        translate: 215.2818138991761px;
    }

    21% {
        translate: 228.27888751789862px;
    }

    22% {
        translate: 239.35083537988584px;
    }

    23% {
        translate: 248.52300957580974px;
    }

    24% {
        translate: 255.84543385597448px;
    }

    25% {
        translate: 261.38974264507675px;
    }

    26% {
        translate: 265.246103254431px;
    }

    27% {
        translate: 267.5201667692865px;
    }

    28% {
        translate: 268.33008835228674px;
    }

    29% {
        translate: 267.80365283746283px;
    }

    30% {
        translate: 266.07553657417265px;
    }

    31% {
        translate: 263.28473159176565px;
    }

    32% {
        translate: 259.57215336065343px;
    }

    33% {
        translate: 255.0784487833692px;
    }

    34% {
        translate: 249.94201661170968px;
    }

    35% {
        translate: 244.29724829698108px;
    }

    36% {
        translate: 238.27299337578154px;
    }

    37% {
        translate: 231.99124990225454px;
    }

    38% {
        translate: 225.56607718073366px;
    }

    39% {
        translate: 219.10272514478993px;
    }

    40% {
        translate: 212.69697217810642px;
    }

    41% {
        translate: 206.4346609817099px;
    }

    42% {
        translate: 200.39142025789545px;
    }

    43% {
        translate: 194.63255849587296px;
    }

    44% {
        translate: 189.21311499574364px;
    }

    45% {
        translate: 184.17805244017552px;
    }

    46% {
        translate: 179.56257479832334px;
    }

    47% {
        translate: 175.39255410283846px;
    }

    48% {
        translate: 171.6850496549534px;
    }

    49% {
        translate: 168.44890345987153px;
    }

    50% {
        translate: 165.6853961493295px;
    }

    51% {
        translate: 163.38894828402147px;
    }

    52% {
        translate: 161.5478527192617px;
    }

    53% {
        translate: 160.14502463681646px;
    }

    54% {
        translate: 159.15875686887495px;
    }

    55% {
        translate: 158.56346924222765px;
    }

    56% {
        translate: 158.33044182863728px;
    }

    57% {
        translate: 158.4285231793046px;
    }

    58% {
        translate: 158.8248058270238px;
    }

    59% {
        translate: 159.48526254058396px;
    }

    60% {
        translate: 160.37533799553677px;
    }

    61% {
        translate: 161.46049166883768px;
    }

    62% {
        translate: 162.70668885921407px;
    }

    63% {
        translate: 164.0808377694908px;
    }

    64% {
        translate: 165.55117155246808px;
    }

    65% {
        translate: 167.0875751111032px;
    }

    66% {
        translate: 168.6618572512744px;
    }

    67% {
        translate: 170.2479695075545px;
    }

    68% {
        translate: 171.8221735970276px;
    }

    69% {
        translate: 173.36316000252071px;
    }

    70% {
        translate: 174.85212064531407px;
    }

    71% {
        translate: 176.27277898023027px;
    }

    72% {
        translate: 177.61138113584747px;
    }

    73% {
        translate: 178.8566519331921px;
    }

    74% {
        translate: 179.9997197521883px;
    }

    75% {
        translate: 181.03401428153745px;
    }

    76% {
        translate: 181.9551411902455px;
    }

    77% {
        translate: 182.76073770374558px;
    }

    78% {
        translate: 183.4503129607712px;
    }

    79% {
        translate: 184.02507687524485px;
    }

    80% {
        translate: 184.4877610369138px;
    }

    81% {
        translate: 184.84243496168693px;
    }

    82% {
        translate: 185.09432075384433px;
    }

    83% {
        translate: 185.24960897352895px;
    }

    84% {
        translate: 185.3152782199175px;
    }

    85% {
        translate: 185.29892064860013px;
    }

    86% {
        translate: 185.20857534597468px;
    }

    87% {
        translate: 185.05257118847055px;
    }

    88% {
        translate: 184.83938052428567px;
    }

    89% {
        translate: 184.57748473373476px;
    }

    90% {
        translate: 184.27525245445435px;
    }

    91% {
        translate: 183.94083100233445px;
    }

    92% {
        translate: 183.58205128040072px;
    }

    93% {
        translate: 183.20634624777006px;
    }

    94% {
        translate: 182.82068282062158px;
    }

    95% {
        translate: 182.4315068978134px;
    }

    96% {
        translate: 182.044701045917px;
    }

    97% {
        translate: 181.66555424223145px;
    }

    98% {
        translate: 181.29874295966852px;
    }

    99% {
        translate: 180.9483227838531px;
    }

    100% {
        translate: 180.61772967967636px;
    }
}

.ball {
    animation: spring 1500ms linear forwards;
}
```

  


  


> Demo 地址：https://codepen.io/airen/full/BaMpMZM

  


其实，我们可以使用“多个动画”和“缓动函数”来简化它。例如下面这个示例，展示如何将一个球按无限符号（`∞`）形状移动：

  


```CSS
@layer animation {
    @property --x {
        inherits: false;
        initial-value: 0;
        syntax: "<length-percentage>";
    }
    
    @property --y {
        inherits: false;
        initial-value: 0;
        syntax: "<length-percentage>";
    }
    
    @keyframes translateX {
        from {
            --x: 300px;
        }
        to {
            --x: 301px;
        }
    }
    
    @keyframes translateY {
        from {
            --y: 100px;
        }
        to {
            --y: 100.2px;
        }
    }

    .ball {
        transform: translateX(var(--x)) translateY(var(--y));
        animation: translateX 2s, translateY 1s;
        animation-timing-function: cubic-bezier(0.5, -800, 0.5, 800);
        animation-iteration-count: infinite;
    }
}
```

  


  


> Demo 地址：https://codepen.io/airen/full/xxMgMzX

  


只要你对 CSS 帧动画有一定的基础，那么多个动画的理解不是难事，它比理解各种可用的缓动函数以及它们的工作方式要容易得多。正如上面这个示例，没有复杂的代码，只有两个关键帧和一个 `cubic-bezier()` 函数。然而，最终得到的是一个看起来相当复杂的无限符号形状（球沿着无限符号形状移动）运动的动画。

  


正如你所看到的，通过巧妙地操纵 `cubic-bezier()` 函数，你可以用相对简单的代码实现精妙复杂的动画。很酷，对吧？让我们深入了解一下！

  


## cubic-bezier() 函数

  


`cubic-bezier()` 函数通常称为**三次贝塞尔曲线**，是 CSS 中用于创建自定义缓动曲线的函数。Web 上任何动画的缓动都被称为三次贝塞尔曲线：

  


```CSS
:root {
    /* Default Easing Function */
    --linear: cubic-bezier(0, 0, 1, 1);
    --ease: cubic-bezier(0.25, 0.1, 0.25, 1);
    --ease-in: cubic-bezier(0.42, 0, 1, 1);
    --ease-out: cubic-bezier(0, 0, 0.58, 1);
    --ease-in-out: cubic-bezier(0.42, 0, 0.58, 1);
    
    /* Sine Easing Function */
    --sine-in: cubic-bezier(0.47, 0, 0.745, 0.715);
    --sine-out: cubic-bezier(0.39, 0.575, 0.565, 1);
    --sine-in-out: cubic-bezier(0.445, 0.05, 0.55, 0.95);
    --ease-in-sine: cubic-bezier(0.12, 0, 0.39, 0);
    --ease-out-sine: cubic-bezier(0.61, 1, 0.88, 1);
    --ease-in-out-sine: cubic-bezier(0.37, 0, 0.63, 1);
    --ease-out-in-sine: cubic-bezier(0.05, 0.445, 0.95, 0.55);
    
    /* Circular Easing Function */
    --circ-in: cubic-bezier(0.6, 0.04, 0.98, 0.335);
    --circ-out: cubic-bezier(0.075, 0.82, 0.165, 1);
    --circ-in-out: cubic-bezier(0.785, 0.135, 0.15, 0.86);
    --ease-in-circ: cubic-bezier(0.55, 0, 1, 0.45);
    --ease-out-circ: cubic-bezier(0, 0.55, 0.45, 1);
    --ease-in-out-circ: cubic-bezier(0.85, 0, 0.15, 1);
    --ease-out-in-circ: cubic-bezier(0.135, 0.785, 0.86, 0.15);
    
    /* Quadratic Easing Function */
    --quad-in: cubic-bezier(0.55, 0.085, 0.68, 0.53);
    --quad-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
    --quad-in-out: cubic-bezier(0.455, 0.03, 0.515, 0.955);
    --ease-in-quad: cubic-bezier(0.11, 0, 0.5, 0);
    --ease-out-quad: cubic-bezier(0.5, 1, 0.89, 1);
    --ease-in-out-quad: cubic-bezier(0.45, 0, 0.55, 1);
    --ease-out-in-quad: cubic-bezier(0.03, 0.455, 0.955, 0.515);
    
    /* Cubic Easing Function */
    --cubic-in: cubic-bezier(0.55, 0.055, 0.675, 0.19);
    --cubic-out: cubic-bezier(0.215, 0.61, 0.355, 1);
    --cubic-in-out: cubic-bezier(0.645, 0.045, 0.355, 1);
    --ease-in-cubic: cubic-bezier(0.32, 0, 0.67, 0);
    --ease-out-cubic: cubic-bezier(0.33, 1, 0.68, 1);
    --ease-in-out-cubic: cubic-bezier(0.65, 0, 0.35, 1);
    --ease-out-in-cubic: cubic-bezier(0.045, 0.645, 1.0, 0.355);
    
    /* Quartic Easing Function */
    --quart-in: cubic-bezier(0.895, 0.03, 0.685, 0.22);
    --quart-out: cubic-bezier(0.165, 0.84, 0.44, 1);
    --quart-in-out: cubic-bezier(0.77, 0, 0.175, 1);
    --ease-in-quart: cubic-bezier(0.5, 0, 0.75, 0);
    --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
    --ease--in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);
    --ease-out-in-quart: cubic-bezier(0.0, 0.77, 1.0, 0.175);
    
    /* Quintic Easing Function */
    --quint-in: cubic-bezier(0.755, 0.05, 0.855, 0.06);
    --quint-out: cubic-bezier(0.23, 1, 0.32, 1);
    --quint-in-out: cubic-bezier(0.86, 0, 0.07, 1);
    --ease-in-quint: cubic-bezier(0.64, 0, 0.78, 0);
    --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
    --ease-in-out-quint: cubic-bezier(0.83, 0, 0.17, 1);
    --ease-out-in-quint: cubic-bezier(0.0, 0.86, 1.0, 0.07);
    
    /* Exponential Easing Function */
    --expo-in: cubic-bezier(0.95, 0.05, 0.795, 0.035);
    --expo-out: cubic-bezier(0.19, 1, 0.22, 1);
    --expo-in-out: cubic-bezier(1, 0, 0, 1);
    --ease-in-expo: cubic-bezier(0.7, 0, 0.84, 0);
    --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-in-out-expo: cubic-bezier(0.87, 0, 0.13, 1);
    --ease-out-in-expo: cubic-bezier(0.0, 1.0, 1.0, 0.0);
    
    /* Back Easing Function */
    --back-in: cubic-bezier(0.6, -0.28, 0.735, 0.045);
    --back-out: cubic-bezier(0.175, 0.885, 0.32, 1.275);
    --back-in-out: cubic-bezier(0.68, -0.55, 0.265, 1.55);
    --ease-in-back: cubic-bezier(0.36, 0, 0.66, -0.56);
    --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
    --ease-in-out-back: cubic-bezier(0.68, -0.6, 0.32, 1.6);
    --ease-out-in-back: cubic-bezier(0.25, 1.25, 0.75, -0.25);
    
    /* Epic Easing Function*/
    --ease-in-epic: cubic-bezier(0.25, 0.0, 0.75, 0.25);
    --ease-out-epic: cubic-bezier(0.25, 0.75, 0.75, 1.0);
    --ease-in-out-epic: cubic-bezier(0.75, 0.25, 0.25, 0.75);
    --ease-out-in-epic:cubic-bezier(0.25, 0.75, 0.75, 0.25);
}
```

  


  


> Demo 地址： https://codepen.io/airen/full/KKJaYvx

  


这看起来很高级和令人畏惧，但它们只是由四个数值定义的曲线。[W3C 官方是这样定义 cubic-bezier() 函数](https://www.w3.org/TR/css-easing-1/#cubic-bezier-easing-functions)：一个三次贝塞尔缓动函数是一种由四个实数定义的缓动函数，它指定了三次贝塞尔缓动曲线的两个控制点 `P1` 和 `P2` ，以及分别固定在 `(0, 0)` 和 `(1, 1)` 的 `P0` 和 `P3` 锚点 。其中 `P1` 和 `P2` 的 `x` 轴坐标限制在 `[0, 1]` 范围内。

  


这个曲线由两个轴和四个点组成，该图也常称为“距离时间”图：

  


-   **锚点**：图中的 `P0` 和 `P3` 两个点被称为锚点，它们固定不动，其中 `P0` 固定在图的左下角（即 `(0,0)`）位置，表示起始状态（即起始位置和开始时间）；`P3` 固定在图的右上角（即 `(1,1)`）位置，表示终点状态（即终点位置和结束时间）
-   **控制点**：图中的 `P1` 和 `P2` 两个点被称为控制点，它们在 `x` 轴的坐标限制在 `[0,1]` 的范围，在 `y` 轴的坐标不受限制。你可以像设计软件中的钢笔工具一样，拖动这两个控制点来塑造三次贝塞尔曲线，即改变 `P1` 和 `P2` 两个控制点的坐标获得三次贝塞尔曲线。它们的组合是 `cubic-bezier()` 函数的参数，例如 `cubic-bezier(P1x,P1y,P2x,P2y)`
-   **时间轴**：水平方向的 `x` 轴表示动画的持续时间。你可以将 `x` 轴看作动画的时间轴，有点像音频或视频文件上的播放栏，它从最左边开始，随着动画播放会慢慢向右移动。简单地说，`x` 轴代表的就是过渡动画中的 `transition-duration` 和帧动画中的 `animation-duration`
-   **距离轴**：垂直方向的 `y` 轴表示动画运动的距离，也称运动的进度或速度。过渡动画起始状态和终点状态的过渡属性值，帧动画中 `@keyframes` 中属性值

  


  


简而言之，三次贝塞尔函数 `cubic-bezier()` 定义了基于动画持续时间（`x` 轴）输出动画的行为（`y` 轴）。每个轴的范围是 `[0,1]` （或 `[0%, 100%]`）。

  


如果我们有一个持续两秒（`animation-duration: 2s`）的动画，那么：

  


-   `0` （或 `0%`）等于 `0s`
-   `1` （或 `100%`）等于 `2s`

  


如果我们想将动画元素从屏幕的左侧（ `0vw` ） 移动屏幕右侧（ `100vw` ），那么：

  


-   `0` （或 `0%`）等于 `0vw`
-   `1` （或 `100%`）等于 `100vw`

时间 `x` 始终限制在 `[0 1]` 范围内；然而，输出 `y` 可以超出 `[0 1]`。

  


  


> URL：https://cubic-bezier.com/

  


你还可以通过调整 `P1` 和 `P2` 控制点来创建抛物线曲线或正弦曲线：

  


  


你可能会认为这是不可能实现的，因为根据三次贝塞尔曲线的定义，锚点 `P0` 和 `P3` 分别固定在 `(0,0)` 和 `(1,1)` 两点，这意味着它们不能在同一个轴上。这个观点是正确的，但我们可以通过一些数学知识使 `cubic-bezier()` 函数创建出来的曲线近似抛物线或正弦曲线。

  


如此一来，你将可以使用 `cubic-bezier()` 函数创建一些更高级的动画效果，例如下面示例中的圆圈按照缓动曲线从左下角移动到右上角。看上去沿着指定的路径移动，但它实际上并不是使用 CSS 的 offset-path 或 CSS 路径动画相关特性完成的，而是通过 CSS 的 `transform` 实现的。

  


  


> Demo 地址：https://codepen.io/airen/full/eYxvZMz

  


更为神奇的是，你只需要调整应用于 `.ball` 元素上的 `cubic-bezier()` 函数的参数值，那么所有圆圈就会按照你指定的三次贝塞尔曲线移动：

  


  


> Demo 地址：https://codepen.io/airen/full/poGeyqg

  


看到上面所展示的动画效果，你是不是感觉到很神奇，想一探其究竟。那我们就从 `cubic-bezier()` 函数的背后的数学知识开始吧！

  


## 贝塞尔曲线背后的数学原理

  


我们现在知道了，`cubic-bezier()` 函数定义了三次贝塞尔曲线，用于表示一个动画如何从初始状态到最终状态的。那为什么是三次贝塞尔曲线？这就是我们接下来要解释的。

  


首先，贝塞尔曲线是由一组控制点定义的曲线。我们可以从它们最简单的形式开始探索贝塞尔曲线，以理解这些“控制点”是什么，然后逐渐复杂化，达到三次贝塞尔曲线。

  


### 线性插值

  


我们考虑两个不同的点 `P0` 和 `P1` ，以及另一个位于它们之间的点 `P` 。在这种情况下，`P0` 和 `P1` 是曲线的控制点，而 `P` 是在它们之间移动的点。我们可以用一个介于 `0` 和 `1` 之间的值 `t` 来定义 `P` 的位置，类似于百分比：

  


-   如果 `t = 1` ，`P` 将移动到 `P1`
-   如果 `t = 0` ，`P` 将移动到 `P0`
-   介于 `0` 和 `1` 之间的任何值都将是 `P0` 和 `P1` 的“混合”

  


  


在线性插值中，`P0` 和 `P1` 位于两端，而 `P` 是在它们之间移动的蓝点。你会看到 `t` 越接近 `1` ，`P` 距离曲线的末端（`P1`）就越近。

  


这被称为“线性插值”。在线性插值的情况下，我们可以使用下面这个公式计算出 `P` 的位置：

  


```
P = (1 - t) × P0 + t × P1
```

  


你可以尝试将 `t` 替换为 `0` 或 `1` ，其计算出来的结果将会与上面描述的结果一样：

  


```
t = 0
P = (1 - t) × P0 + t × P1 = (1 - 0) × P0 + 0 × P1 = P0 👉 P 移动到 P0

t = 1
P = (1 - t) × P0 + t × P1 = (1 - 1) × P0 + 1 × P1 = P1 👉 P 移动到 P1
```

  


### 二次贝塞尔曲线

  


现在，我们再添加一个点 `P2` ！这样就可以有两个插值点，分别在每个线段之间移动，即分别沿着 `P0 👉 P1` 和 `P1 👉 P2` 移动。如果我们用一条线段连接这两个插值点（红点），并在该线段上也放置一个插值（蓝点），我们将得到一些非常有趣的东西：

  


  


你会看到蓝点沿着一条类似曲线的路径移动。这个特定的路径称为二次贝塞尔曲线。我们可以通过一些数学知识，推导出给定时间 `t` 时蓝点位置的方程式。

  


首先，我们使用上面的公式分解红点的位置。这两个红点的位置可以被描述为两个不同的线性插值：

  


```
A = (1 - t) × P0 + t × P1
B = (1 - t) × P1 + t × P2
```

  


我们也可以描述蓝点的位置，但这次是在点 `A` 和点 `B` 之间进行线性插值：

  


```
P = (1 - t) × A + t × B
```

  


然后，我们替换 `A` 和 `B` ：

  


```
P = (1 - t) × ((1 - t) × P0 + t × P1) + t × ((1 - t) × P1 + t × P2)
  = (1 - t) × (1 - t) × P0 + (1 - t) × t × P1 + t × (1 - t) × P1 + t × t × P2
```

  


我们将得到二次贝塞尔曲线的公式：

  


  


基于上面这个公式，我们可以编写 JavaScript 脚本来获取蓝点移动时每个位置的 `x` 和 `y` 坐标值，并以每秒 `60` 帧的速度在 `1s` 内绘制出上面的曲线：

  


```JavaScript
const quadratic = (P0, P1, P2) => {
    const x0 = P0.x;
    const y0 = P0.y;
    const x1 = P1.x;
    const y1 = P1.y;
    const x2 = P2.x;
    const y2 = P2.y;

    const x = (t) => Math.pow(1 - t, 2) * x0 + 2 * (1 - t) * t * x1 + Math.pow(t, 2) * x2;
    const y = (t) => Math.pow(1 - t, 2) * y0 + 2 * (1 - t) * t * y1 + Math.pow(t, 2) * y2;
  
    const res = [];

    // 以每秒 60 帧持续 15 秒的速度获得所有的过渡点
    for (let t = 0; t <= 1; t = t + 1 / 60) {
        const valX = x(t);
        const valY = y(t);
        
        res.push({ 
            x: valX, 
            y: valY 
        });
    }

    res.push({ x: 1, y: 0 });

    return res;
};
```

  


### 三次贝塞尔曲线

  


接着再添加第四个点。此时，我们有四个控制点，它们分别是 `P0` 、`P1` 、`P2` 和 `P3` ，这样我们就可以按照前面的过程来添加插值点。

  


-   首先在连接四个点的每一段线（即 `P0 👉 P1` 、`P1 👉 P2` 和 `P2 👉 P3`）之间添加一个插值点（红点）。
-   然后将三个红点（插值点）连接起来，将会得到两条新线段，并在新获得的每个线段上定义一个新的插值点（绿点）。
-   按同样的方式，再次连接绿点，将得到一条新线段，并在该线段上定义一个新的插值点（蓝点）：

  


  


这三个红点的位置可以被描述为三个不同的线性插值：

  


```
A = (1 - t) × P0 + t × P1
B = (1 - t) × P1 + t × P2
C = (1 - t) × P2 + t × P3
```

  


我们可以使用 `A` 、`B` 和 `C` 来描述图中绿点的插值 `D` 和 `E` ：

  


```
D = (1 - t) × A + t × B
E = (1 - t) × B + t × C
```

  


再使用 `D` 和 `E` 来描述蓝点：

  


```
P = (1 - t) × D + t × E
```

  


将上面公式中的 `D` 和 `E` 替换成 `A` 、`B` 和 `C` ：

  


```
P = (1 - t) × ((1 - t) × A + t × B) + t × ((1 - t) × B + t × C)
  = (1 - t) × (1 - t) × A + (1 - t) × t × B) + t × (1 - t) × B + t × t × C
  = (1 - t) × (1 - t) × A  + 2 × (1 - t) × t × B + t × t × C
```

  


继续将 `A` 、`B` 和 `C` 替换掉：

  


```
P = (1 - t) × (1 - t) × ((1 - t) × P0 + t × P1)  + 2 × (1 - t) × t × ((1 - t) × P1 + t × P2) + t × t × ((1 - t) × P2 + t × P3)
  = (1 - t) × (1 - t) × (1 - t) × P0 + (1 - t) × (1 - t) × t × P1 + 2 × (1 - t) × t × (1 - t) × P1 + 2 × ( 1 - t) × t × t × P2 + t × t × (1 - t) × P2 + t × t × t × P3
  = (1 - t) × (1 - t) × (1 - t) × P0 + 3 × (1 - t) × (1 - t) × t × P1 + 3 × (1 - t) × t × t × P2 + t × t × t × P3
```

  


这样就获得三次贝塞尔曲线的计算公式：

  


  


和二次贝塞尔曲线一样，使用 JavaScript 可以获取三次贝塞尔曲线上蓝点位置移动时每个点的 `x` 和 `y` 坐标，并以每秒 `60` 帧的速度在 `1s` 内绘制出上面的曲线：

  


```JavaScript
const cubic = (P0, P1, P2, P3) => {
    const x0 = P0.x;
    const y0 = P0.y;
    const x1 = P1.x;
    const y1 = P1.y;
    const x2 = P2.x;
    const y2 = P2.y;
    const x3 = P3.x;
    const y3 = P3.y;

    const y = (t) => Math.pow(1 - t, 3) * y0 + 3 * Math.pow(1 - t, 2) * t * y1 + 3 * (1 - t) * Math.pow(t, 2) * y2 + Math.pow(t, 3) * y3;
    const x = (t) => Math.pow(1 - t, 3) * x0 + 3 * Math.pow(1 - t, 2) * t * x1 + 3 * (1 - t) * Math.pow(t, 2) * x2 + Math.pow(t, 3) * x3;

    const res = [];
  
    for (let t = 0; t <= 1; t = t + 1 / 60) {
        const valX = x(t);
        const valY = y(t);
        res.push({ x: valX, y: valY });
    }
  
    res.push({ x: 1, y: 0 });
    return res;
};
```

  


这就是贝塞尔曲线背后的数学原理。

  


## 使用贝塞尔函数构建抛物线和正弦曲线

  


了解了贝塞尔曲线背后的原理之后，我们就可以进入下一步了。即使用所掌握的贝塞尔曲线相关的知识来构建更为复杂的曲线，例如抛物线曲线和正弦曲线：

  


  


首先要明确的是，我们无法直接通过单个 `cubic-bezier()` 函数构建抛物线曲线和正弦曲线，那是因为该函数的 `P0` 和 `P3` 两个锚点位置始终是固定不变的，它们分别在 `(0,0)` 和 `(1,1)` 两个位置。我们需要通过多个帧动画和 `cubic-bezier()` 组合起来模拟近似抛物线曲线和正弦曲线。

  


我们先来看抛物线曲线。

  


### 抛物线曲线

  


假设我们有一个 `cubic-bezier(0,1.5,1,1.5)` 函数，它使我们获得一条中间向上隆起的曲线：

  


  


我们的目标是要将 `P3` 点从 `(1,1)` 移动到 `(0,1)` ，这样才能把这条曲线变成抛物线曲线，这在技术上是不可能达到的，至少使用 `cubic-bezier()` 函数是无法做到的。所以我们需要通过其他的技术手段来模拟它。

  


在介绍 `cubic-bezier()` 函数时，曾说过我们的范围是 `[0,1]` （或 `[0%, 100%]`），因此我们可以想象一下，当 `0%` 非常接近 `100%` 的情况。比如，如果我们想要将动画元素从 `20px` （即初始状态，也就是 `0%`）移动到 `20.1px` （即终点状态，也就是 `100%` ），那么我们就可以说初始状态和最终状态是相等的。

  


只是这样设置，动画元素并不会真的移动，对吗？虽然 `0%` 和 `100%` 两个状态的值并不完全相等（相差 `0.1px`），但这不足以让我们看到动画元素有明显的移动：

  


```CSS
@layer animation {
    @keyframes move {
        0% {
            translate:0 -20px;
        }
        100% {
            translate:0 -20.1px;
        }
    }
  
    .ball {
        animation: move 0.3s cubic-bezier(0,1.5,1,1.5) both;
    }
}
```

  


  


> Demo 地址：https://codepen.io/airen/full/YzBZYyX

  


如果我们把 `cubic-bezier(0,1.5,1,1.5)` 函数替换为 `cubic-bezier(0,4,1,4)` （`y1` 和 `y2` 的坐标值调得更大了）。不难发现，`cubic-bezier(0,4,1,4)` 绘制的曲线要比 `cubic-bezier(0,1.5,1,1.5)` 绘制的曲线高得多：

  


  


```CSS
.ball {
    animation: move 0.3s cubic-bezier(0,1.5,1,1.5) infinite;
    
    &:nth-child(2) {
        animation-timing-function: cubic-bezier(0,4,1,4);
    }
}
```

  


  


> Demo 地址：https://codepen.io/airen/full/NWopXEz

  


看上去似乎并没有任何差异（至少在肉眼上没发现它有什么差异）。虽然看上去没有差异，但我们可以继续尝试一下，将缓动曲线调得更高一些，比如 `cubic-bezier(0, 50, 1, 50)` ：

  


  


> Demo 地址：https://codepen.io/airen/full/BaMWYjP

  


惊不惊喜，虽然初始状态（`20px`）和结束状态（`20.1px`）仅相差 `.1px` ，但由于缓动函数的原因，球居然动起来了。

  


既然如此，我们就可以将 `cubic-bezier()` 函数中的 `P1y` 和 `P2y` 的值调得更大，球的移动距离是否就会越大：

  


  


> Demo 地址： https://codepen.io/airen/full/ZEweVPZ

  


如果你足够仔细的话，你会发现每次我们增加 `P1y` 和 `P2y` 的数值时，曲线就会变得更大。当我们缩小看到完整的曲线时，它使我们的点 `(1,1)` 在“视觉上”更接近 `(0,1)` ，这就是诀窍。

  


通过使用三次贝塞尔函数 `cubic-bezier(0, V, 1, V)` ，其中 `V` 是一个非常大的值，并且初始状态和最终状态非常接近（或几乎相等），我们可以模拟抛物线曲线。

  


```CSS
@layer animation {
    @property --x {
        inherits: false;
        initial-value: 0;
        syntax: "<length-percentage>";
    }
    
    @property --y {
        inherits: false;
        initial-value: 0;
        syntax: "<length-percentage>";
    }

    @keyframes x {
        0% {
            --x: -100px;
        }
        100% {
            --x: 100px;
        }
    }

    @keyframes y {
        0% {
            --y: 0px;
        }
        100% {
            --y: -0.1px;
        }
    }

    .ball {
        --p1y: 2500;
        --p2y: 2500;
        transform: translateX(var(--x)) translateY(var(--y));
        animation: 
            x 3s linear infinite alternate,
            y 3s cubic-bezier(0, var(--p1y), 1, var(--p2y)) infinite;
    }
}
```

  


  


> Demo 地址：https://codepen.io/airen/full/mdvWvyB

  


上面示例使用两个动画，分别是沿水平方向 `x` 轴移动和沿垂直方向 `y` 轴移动，并且在 `x` 动画应用了 `linear` 缓动函数，在 `y` 动画上运用了 `cubic-bezier()` 缓动函数。两者结合起来，就使得球沿着一条抛物线曲线移动。它的分解效果可以在下面的 Demo 中查看：

  


  


> Demo 地址：https://codepen.io/airen/full/NWopoyJ

  


你可能想知道这背景的原理吧。我们可以进一步分解它。前面，我们知道可以使用下面这个公式来定义三次贝塞尔曲线：

  


  


其中每个点的坐标分别是：

  


-   锚点 `P0` 的坐标是 `(0,0)` ，起始点位置，固定不变
-   锚点 `P3` 的坐标是 `(1,1)` ，终点位置，它也固定不变
-   控制点 `P1` 的坐标是 `(0,V)`
-   控制点 `P2` 的坐标是 `(1, V)`

  


它们组合在一起的三次贝塞尔曲线就是 `cubic-bezier(0, V, 1, V)` 。

  


将 `P0` ，`P1` ，`P2` 和 `P3` 的 `x` 坐标和 `y` 坐标放入三次贝塞尔曲线的公式中，就可以得到三次贝塞尔曲线的 `x` 和 `y` 坐标的两个函数：

  


```
/* 推导 x 轴坐标 */
P = (1−t)³ × P0 + 3 × (1−t)² × t × P1 + 3 × (1−t) × t² × P2 + t³ × P3
👇
Px = (1−t)³ × P0x + 3 × (1−t)² × t × P1x + 3 × (1−t) × t² × P2x + t³ × P3x
   = (1−t)³ × 0 + 3 × (1−t)² × t × 0 + 3 × (1−t) × t² × 1 + t³ × 1
   = 3 × (1−t) × t² + t³
   = 3 × t² - 2 × t³

/* 推导 y 轴坐标 */
P = (1−t)³ × P0 + 3 × (1−t)² × t × P1 + 3 × (1−t) × t² × P2 + t³ × P3
👇
Py = (1−t)³ × P0y + 3 × (1−t)² × t × P1y + 3 × (1−t) × t² × P2y + t³ × P3y
   = (1−t)³ × 0 + 3 × (1−t)² × t × V + 3 × (1−t) × t² × V + t³ × 1
   = 3 × (1−t)² × t × V + 3 × (1−t) × t² × V + t³
   = t³ - 3 × V × t² + 3 × V × t
```

  


这样就推导出 `x` 和 `y` 坐标的两个函数：

  


```
X(t) =3 × t² - 2 × t³
Y(t) =t³ - 3 × V × t² + 3 × V × t
```

  


`V` 是指 `P1` 和 `P2` 两个控制点中 `y` 轴所需的一个大值，`t` 在 `[0,1]` 范围内。如果考虑前面的例子，`Y(t)` 将给出动画元素在 `y` 轴的移动位置，即 `--y` 的值，而 `X(t)` 是时间的进度。点 `(X(t), Y(t))` 就定义了我们的曲线。

  


其中最为关键的是，如何找到 `Y(t)` 的最大值。为此，我们需要找到使 `Y'(t) = 0` 时的 `t` 值（导数等于 `0` 时）：

  


```
Y'(t) = 3 × t² - 6 × V × t + 3 × V
```

  


`Y'(t) = 0` 是一个二次方程，即 `t = V - sqrt(V² - V)`。

  


当 `V` 是一个大值时，`t` 将等于 `0.5`。因此，`Y(0.5) = Max`，而 `X(0.5)` 将等于 `0.5`。这意味着在动画的中间点达到最大值，这符合我们想要的抛物线形状。

  


此外，`Y(0.5)` 将给我们 `(1 + 6 × V) ÷ 8`，这将允许我们基于 `V` 找到最大值。由于我们将始终使用一个大的 `V` 值，所以我们可以简化为 `6 × V ÷ 8 = 0.75 × V` ，即 `0.75V`。

  


在上一个示例中，我们使用了 `V = 5000`，所以最大值为 `3750`（或 `375000%`），同时：

  


-   初始状态（`0`）：`--y` 的值等于 `0px`
-   最终状态（`1`）： `--y` 的值等于 `-0.1px` （注意，这里的负值代表的是方向，因为该值用于 `translateY()` 函数）

  


两个状态（即 `0` 和 `1` ）之间相差 `0.1px` 。我们把这个差值称之为增量。对于 `3750` （或 `375000%`），我们有一个方程：

  


```
3750 × 0.1px = 375px
```

  


我们的动画元素的 `--y` 值为 `-375px` ，并产生以下动画：

  


  


或者另一种表示是，`0%` （`0s`） 和 `100%` （`3s`）时，`--y` 的值都是 `0` ，`50%` （`1.5s`）时，`--y` 的值为 `-375px` ：

  


  


现在我们反过来思考。`V` 值在多少的时候才能使动画元素的 `--y` 为 `375px` ？动画将是 `0px → 375px → 0px` ，所以我们需要 `375px` 才能从 `0` 达到 `375px` 。我们的增量总是 `0.1px` 。最大值将等于 `375 ÷ 0.1 = 3750` ，所以 `0.75V = 3750` ，这意味着 `V = 5000` 。

  


三次贝塞尔函数计算抛物线曲线最高点位置的公式可以总结为：最高值 = `0.75V` × 增量，其中 `V` 是 `cubic-bezier(0, V, 1, V)` 中所取的大值，增量指动画终点状态与初始状态的差值。

  


  


### 正弦曲线

  


我们将使用几乎完全相同的技巧来创建正弦曲线，但公式有所不同。创建正弦曲线的三次贝塞尔函数是 `cubic-bezier(0.5, V, 0.5, -V)` 。和之前一样，让我们看看当 `V` 的值变大之后，曲线会如何变化：

  


  


正如你所看到的，`V` 值越大，`cubic-bezier(0.5, V, 0.5, -V)` 函数绘制的曲线就越接近正弦曲线。

  


  


> Demo 地址：https://codepen.io/airen/full/NWojWJb

  


把上面示例中的 `x` 轴和 `y` 轴的分层效果去掉，能看得更清晰一些：

  


```CSS
@layer animation {
    @property --x {
        inherits: false;
        initial-value: 0;
        syntax: "<length-percentage>";
    }
  
    @property --y {
        inherits: false;
        initial-value: 0;
        syntax: "<length-percentage>";
    }

    @keyframes x {
        0% {
            --x: 0;
        }
        100% {
            --x: 70vw;
        }
    }

    @keyframes y {
        0% {
            --y: -50%;
        }
        100% {
            --y: -49.8%;
        }
    }

    .ball {
        --v: 800;
        transform: translateX(var(--x)) translateY(var(--y));
        animation: 
            x 10s linear infinite alternate,
            y 2s cubic-bezier(0.5, var(--v), .5, calc(var(--v) * -1)) infinite;
    }
}
```

  


  


> Demo 地址：https://codepen.io/airen/full/NWojqGL

  


和抛物线一样，我们来看一下它背后的数学理论。

  


从 `cubic-bezier(0.5, V, 0.5, -V)` 函数中，我们可以获取到三次贝塞尔曲线四个点 `P0` 、`P1` 、`P2` 和 `P3` 的坐标值：

  


-   `P0 = (0, 0)` ，它的 `x` 和 `y` 坐标值都是 `0`
-   `P3 = (1, 1)` ，它的 `x` 和 `y` 坐标值都是 `1`
-   `P1 = (0.5, V)` ，它的 `x` 坐标值是 `0.5` ，`y` 坐标值是 `V`
-   `P2 = (0.5, -V)` ，它的 `x` 坐标值是 `0.5` ，`y` 坐标值是 `-V`

  


我们将这些值放到三次贝塞尔曲线的公式中，就可以得到三次贝塞尔曲线的 `x` 和 `y` 坐标的两个函数：

  


  


```
/* 推导 x 轴坐标 */
P = (1−t)³ × P0 + 3 × (1−t)² × t × P1 + 3 × (1−t) × t² × P2 + t³ × P3
👇
Px = (1−t)³ × P0x + 3 × (1−t)² × t × P1x + 3 × (1−t) × t² × P2x + t³ × P3x
   = (1−t)³ × 0 + 3 × (1−t)² × t × 0.5 + 3 × (1−t) × t² × 0.5 + t³ × 1
   = 3 ÷ 2 × (1−t)² × t + 3 ÷ 2 × (1−t) × t² + t³
   = (3 ÷ 2) × t - (3 ÷ 2) × t² + t³

/* 推导 y 轴坐标 */
P = (1−t)³ × P0 + 3 × (1−t)² × t × P1 + 3 × (1−t) × t² × P2 + t³ × P3
👇
Py = (1−t)³ × P0y + 3 × (1−t)² × t × P1y + 3 × (1−t) × t² × P2y + t³ × P3y
   = (1−t)³ × 0 + 3 × (1−t)² × t × V + 3 × (1−t) × t² × (-V) + t³ × 1
   = 3 × (1−t)² × t × V - 3 × (1−t) × t² × V + t³
```

我们将得到以下函数：

  


```
X(t) = (3 ÷ 2) × t - (3 ÷ 2) × t² + t³
Y(t) = 3 × (1−t)² × t × V - 3 × (1−t) × t² × V + t³
```

  


这次我们需要找出 `Y(t)` 的最小值和最大值。`Y'(t) = 0` 将给出两个解。求解后：

  


```
Y'(t) = 3 × (6 × V + 1) × t² - 18 × V × t + 3 × V = 0
```

  


我们将分别得到 `t'` 和 `t''` ：

  


```
t' = (3V + sqrt(3V² - V))/(6V + 1)
t''= (3V - sqrt(3V² - V))/(6V + 1)
```

  


对于较大的 `V` 值，`t' = 0.211` 和 `t'' = 0.789` 。这将得到 `Max` 和 `Min` 值：

  


```
Max = Y(0.211)
Min = Y(0.789)
```

  


这意味着 `X(0.211) = 0.26` 和 `X(0.789) = 0.74` 。换句话说，**我们在时间轴的** **`26%`** **位置点达到最大值，在时间轴** **`74%`** **位置点达到最小值**。

  


`Y(0.211) = 0.289V` 和 `Y(0.789) = -0.289V`。考虑到 `V` 非常大，我们对这些值进行了四舍五入。

  


我们的正弦曲线也应该在一半时间内（或 `X(t) = 0.5`）与 `x` 轴相交（或 `Y(t) = 0`）。为了证明这一点，我们使用 `Y(t)` 的二次导数——它应该等于 `0` ，所以 `Y''(t) = 0`。

  


```
Y''(t) = 6 × (6 × V + 1) × t - 18 × V = 0
```

  


解为 `3V/(6V+1)` ，对于大 `V` 值，解为 `0.5` 。这给出了 `Y(0.5) = 0` 和 `X(0.5) = 0.5` ，这证实了我们的曲线穿过 `(0.5, 0)` 点。

  


现在，我们回到前面的那个示例中，并尝试找到元素回到顶部的 `V` 值，主是要 `y` 轴移动动画。

  


```CSS
@keyframes y {
    0% {
        --y: -50%;
    }
    100% {
        --y: -49.8%;
    }
}
```

  


从 `y` 动画中不难发现：

  


-   动画初始状态（`0` 或 `0%`）：`--y` 的值为 `-50%` （其中负号代表方向）
-   动画终点状态（`1` 或 `100%` ）：`--y` 的值为 `-49.8%` （其中负号代表方向）

  


它们之间的增量是 `-0.2%` （`49.8% - 50% = -0.2%`）。我们需要 `-50%` 才能到达 `--y:0%` ，因此 `0.289V × -0.2% = -50%` ，计算出 `V` 的值大约等于 `865.052` 。

  


  


> Demo 地址：https://codepen.io/airen/full/bGzWVLV

  


如此一来，我们就推导出 `cubic-bezier(0.5, V, 0.5, -V)` 函数制作正弦函数的相关公式，即计算出 `Max` （最大值）和 `Min` （最小值）：

  


  


把它们放到一起，你可以看到使用 `cubic-bezier()` 函数模拟的抛物线曲线和正弦曲线的效果：

  


  


> Demo 地址：https://codepen.io/airen/full/jOdmwmW

  


```CSS
@layer animation {
    @property --x {
        inherits: false;
        initial-value: 0;
        syntax: "<length-percentage>";
    }
  
    @property --y {
        inherits: false;
        initial-value: 0;
        syntax: "<length-percentage>";
    }

    @keyframes x {
        0% {
            --x: 0;
        }
        100% {
            --x: 268px;
        }
    }

    @keyframes y1 {
        0% {
            --y: -50%;
        }
        100% {
            --y: -49.8%;
        }
    }

    @keyframes y2 {
        0% {
          --y: 50%;
        }
        100% {
          --y: 49.8%;
        }
    }

    .ball {
        transform: translateX(var(--x)) translateY(var(--y));
    
        /* 抛物线一 */
        .parabolic-1 & {
            animation: 
                x 3s linear infinite alternate,
                y1 3s infinite cubic-bezier(0, 3250, 1, 3250);
        }
        
        /* 抛物线二 */
        .parabolic-2 & {
            animation: 
                x 3s linear infinite alternate,
                y2 3s infinite cubic-bezier(0, 3250, 1, 3250);
        }
        
        /* 正弦曲线一 */
        .sinusoidal-1 & {
            animation: 
                x 3s linear infinite alternate,
                y1 3s infinite cubic-bezier(0.5, 8000, 0.5, -8000) alternate;
        }
        
        /* 正弦曲线二 */
        .sinusoidal-2 & {
            animation: 
                x 3s linear infinite alternate,
                y2 3s infinite cubic-bezier(0.5, 8000, 0.5, -8000) alternate;
        }
    }
}
```

  


上面示例中的四条曲线使用了两种不同的动画，其中`y1` 动画的 `--y` 值从 `-50%` 过渡 `-49.8%` ，其增量是 `0.2%` ，另一个 `y2` 动画的 `--y` 值从 `50%` 过渡到 `49.8%` ，其增量是 `-0.2%` 。通过改变增量的符号（正负值），我们可以控制抛物线和正弦曲线的方向。除此之外，我们还可以控制三次贝塞尔曲线的其他参数，但不包括 `V` 值（即 `V` 值保持不变），以相同的曲线中获得更多的曲线。

  


  


> Demo 地址：https://codepen.io/airen/full/GRzmvKg

  


## 使用三次贝塞尔曲线创建复杂的帧动画

  


有了这个基础之后，再回过头去看球沿着无限符号形状移动就不会觉得困难了。在那个示例中，将两个正弦曲线组合在一起拼接出无限符号形状，使球沿着曲线运动即可。

  


基于该原理，你还可以制作出更为复杂的动画效果，例如下面这个模拟螺旋仪的效果：

  


  


> Demo 地址：https://codepen.io/airen/full/xxMdLEM

  


在 Web 上，我们可以使用这种技术来制作很多有创意的动画效果以及交互效果，比如抽奖、点赞等。

  


  


> Demo 地址：https://codepen.io/airen/full/WNPjZVV

  


上面 Demo 这个效果，我们采用的是 `cubic-bezier(0, v, 1, v)` 函数使每个动画元素沿着不同的抛物线曲线运动：

  


  


```HTML
<div class="lottery--container">
    <button class="lottery__button">💟</button>
    <div class="lotteries">
        <span style="--x2:25px;--max: 180; --index: 1;">💝</span>
        <span style="--x2:-20px; --max: 200; --index: 2;">💞</span>
        <span style="--x2:40px; --max: 250; --index: 3;">🔥</span>
        <span style="--x2:-55px; --max: 240; --index: 4;">💛</span>
        <span style="--x2:100px; --max: 280; --index: 5;">💖</span>
        <span style="--x2:-115px; --max: 320; --index: 6;">🩹</span>
        <span style="--x2:150px; --max: 400; --index: 7;">💋</span>
        <span style="--x2:-190px; --max: 350; --index: 8;">💥</span>
    </div>
</div>
```

  


核心 CSS 代码如下：

  


```CSS
@layer animation {
    @keyframes heartBeat {
        0%,
        28%,
        70% {
            scale: 1;
        }
    
        14%,
        42% {
            scale: 1.3;
        }
    }

    @property --x {
        inherits: false;
        initial-value: 0;
        syntax: "<length-percentage>";
    }

    @property --y {
        inherits: false;
        initial-value: 0;
        syntax: "<length-percentage>";
    }

    @property --s {
        inherits: false;
        initial-value: 0;
        syntax: "<number>";
    }

    @keyframes x {
        100% {
            --x: var(--x2);
        }
    }

    @keyframes y {
        0% {
            --y: 0.1px;
        }
        100% {
            --y: 0px;
        }
    }

    @keyframes s {
        0% {
            --s: 0;
            opacity: 1;
        }
        25% {
            --s: 0.8;
        }
        50% {
            --s: 1;
        }
        90% {
            --s: 0.7;
            opacity: 0.5;
        }
        100% {
            opacity: 0;
            --s: 0;
        }
    }
    
    .lottery__button {
        animation: heartBeat 1.3s ease-in-out infinite alternate;
    }

    span {
        .lotteries & {
            transform: translateX(var(--x)) translateY(var(--y)) scale(var(--s));
        }
        .playing & {
            --x2: 100px;
            --max: 10;
            --increment: 0.1;
            /* V   = max  ÷ increment ÷ 0.75*/
            --v: calc(var(--max) / var(--increment) / 0.75);
            --delay-ratio: 0.02s;
            --_delay: calc((var(--index) - 1) * var(--delay-ratio));
            animation: 
                x 1.5s linear var(--_delay) both,
                y 1.5s cubic-bezier(0, var(--v), 1, var(--v)) var(--_delay) both,
                s 1.5s ease-in-out var(--_delay) both;
        }
    }
}
```

  


按照上面这种方式，你可以添加更多的元素，并且调整除 `V` 参数之外的任意参数，使每个动画元素沿着不同的抛物线曲线移动。这样整个动画效果会更自然一些，感兴趣的同学可以自己尝试一下。

  


从这些示例中可以得出一些要点：

  


-   每个关键帧仅使用一个声明来定义，其中包含增量。
-   元素的位置和动画是相互独立的。我们可以轻松地将元素放在任何位置，而无需调整动画。
-   我们没有进行大量的计算。没有大量的角度或像素值。我们只需要在关键帧内使用一个小值（增量值，越小越好）和在 `cubic-bezier()` 函数内使用一个大值（它会决定抛物线或正弦曲线的最高点和最低点）。
-   整个动画可以通过调整持续时间值来进行控制。

  


## 使用三次贝塞尔曲线创建复杂过渡动画

  


现在，我们可以使用 `cubic-bezier(0, V, 1, V)` 和 `cubic-bezier(0.5, V, 0.5, -V)` 来模拟抛物线和正弦曲线，并且使动画元素可以沿着它们创建的缓动曲线运动，从而创建复杂的帧动画。其实，我们可以使用同样的原理与技巧用来创建复杂的过渡动画。

  


例如下面这个按钮悬停效果，小狗狗是沿着一条曲线向右移动：

  


  


> Demo 地址：https://codepen.io/airen/full/YzBVYOw

  


注意，按钮悬浮的效果是 CSS 过渡动画并不是关键帧动画。很棒，对吧？接下来， 我们来看看类似这样的过渡动画效果应该如何实现？

  


其核心会用到两个方面的 CSS 知识：

  


-   使用 CSS 的 @property 规则定义 CSS 自定义属性，使属性能动画化（主要用于 `transition-property` 属性上）
-   使用三次贝塞尔 `cubic-bezier()` 函数将抛物线和正弦曲线结合起来，创建动画运动的路径

  


例如上一个示例，其核心代码如下：

  


```CSS
@layer animation {
    @property --d1 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }
    
    @property --d2 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }

    .walk {
        left: 0;
        translate: 0 calc((50 + var(--d1) + var(--d2)) * -1.5%);
        transition: 
            --d1 3s cubic-bezier(0.7, 4613.610, 0.3, -4613.610),
            --d2 3s cubic-bezier(0.5, 4613.610, 0.5, -4613.610), 
            left 3s linear;
    
        .button:hover & {
            --d1: 0.2;
            --d2: -0.2;
            left: 100%;
        }
    }
}
```

  


我们使用 `@property` 规则定义了 `--d1` 和 `--d2` 两个自定义属性，然后将它们的和作为 `.walk` （示例中小狗，动画元素）元素的 `translateY` 属性的值。

  


这两个属性被定义为 `<number>` （数字）类型值，将这些值乘以 `1%` 将它们转换为百分比值。你也可以直接将 `--d1` 和 `--d2` 的值类型（`<syntax>`）定义为 `<percentage>` 或 `<length-percentage>` 类型，这样可以避免通过做乘法的方式来转换值类型。示例中选择数字，主要出发点是可以更灵活地进行更复杂的操作。

  


我们将 `--d1` 和 `--d2` 作为可动画化属性用于 `transition-property` ，并且对它们应用了不同的过渡，更准确的说，它们在动画化时应用了相同的持续时间（`transition-duration: 3s`）和不同的缓动函数（`--d1` 应用的三次贝塞尔函数是 `cubic-bezier(0.7, 4613.610, 0.3, -4613.610)` ，`--d2` 应用的是 `cubic-bezier(0.5, 4613.610, 0.5, -4613.610)` ）。实际上，这两个变量应用了不同的正弦曲线。

  


最后是通过 `:hover` 来触发过渡动画，我们在按钮悬浮状态（`.button:hover`）下改变了应用于 `.walk` 元素的 `--d1` 和 `--d2` 值。即：`--d1` 由初始状态 （`0` ）经过 `3s` 时间过渡到结束状态（ `0.2` ）；`--d2` 也由初始状态（`0`）经过 `3s` 时间过渡到结束状态（`-0.2`）。

  


除此之外，还有一些数学计算。我们正在将两个函数相加以创建第三个函数。对于 `--d1` ，我们有一个函数 `cubic-bezier(0.7, 4613.610, 0.3, -4613.610)`（为了方便，将它称为 `F1` 函数）；对于 `--d2` ，我们有另一个函数 `cubic-bezier(0.5, 4613.610, 0.5, -4613.610)` （我们把它称为 `F2` 函数）。这意味着，应用于 `.walk` 元素的 `translate` 属性的 `y` 轴的值是 `F1 + F2` 。

  


为了便于大家理解，我把上面示例简化一下，并将过渡动画分解出来：

  


```CSS
@layer transition {
    @property --d1 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }
  
    @property --d2 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }

    .walk {
        left: 0;
        translate: 0 calc((50 + var(--d1) + var(--d2)) * -1.5%);
        
        /* Transiton 1: F1 */
        .walk--d1 & {
            transition: 
                --d1 3s cubic-bezier(0.7, 4613.61, 0.3, -4613.61),
                left 3s linear;
        }
    
        /* Transition 2: F2 */
        .walk--d2 & {
            transition: 
                --d2 3s cubic-bezier(0.5, 4613.61, 0.5, -4613.61),
                left 3s linear;
        }
    
        /* Composite Transition: Fc = F1 + F2 */
        .walk--composite & {
            transition: 
                --d1 3s cubic-bezier(0.7, 4613.61, 0.3, -4613.61),
                --d2 3s cubic-bezier(0.5, 4613.61, 0.5, -4613.61), left 3s linear;
        }
    
        /* --d1、--d2 和 left 终点状态对应的值 */
        .walk--wrapper:hover &,
        .player & {
            --d1: 0.2;
            --d2: -0.2;
            left: 100%;
        }
    }
}
```

  


  


> Demo 地址：https://codepen.io/airen/full/jOdmKKR

  


正如你所看到的，第一个和第二个过渡分别说明了 `--d1` 和 `--d2` 两个变量的变化。第三个是它们的和。想象一下，在过渡动画的每个步骤中，我们取 `--d1` 和 `--d2` 两个变量的值并将它们相加，以获得最终曲线上的每个点，然后动画元素沿着这条曲线运动。

  


接着在上面示例的基础上，将 `cubic-bezier(0.5, v, 0.5, -v)` 函数（绘制正弦曲线的三次贝塞尔函数）替换成绘制抛物线曲线的三次贝塞尔曲线 `cubic-bezier(0, v, 1, v)` ：

  


```CSS
@layer transition {
    @property --d1 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }
    
    @property --d2 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }

    .walk {
        --v: 2144.44;
        left: 0;
        translate: 0 calc((50 + var(--d1) + var(--d2)) * -1.5%);
    
        .walk--d1 & {
            transition: 
            --d1 3s cubic-bezier(0.7, var(--v), 0.3, var(--v)),
            left 3s linear;
        }
    
        .walk--d2 & {
            transition: 
            --d2 3s cubic-bezier(0.1, var(--v), 0.9, var(--v)),
            left 3s linear;
        }
    
        .walk--composite & {
            transition: 
            --d1 3s cubic-bezier(0.7, var(--v), 0.3, var(--v)),
            --d2 3s cubic-bezier(0.1, var(--v), 0.9, var(--v)), left 3s linear;
        }
    
        .walk--wrapper:hover &,
        .player & {
            --d1: 0.2;
            --d2: -0.2;
            left: calc(100% - 32px);
        }
    }
}
```

  


我们仅仅调整了 `--d1` 和 `--d2` 的缓动函数：

  


-   `--d1` 使用的是 `cubic-bezier(0.7, var(--v), 0.3, var(--v))` 函数，其中 `--v` 的值是 `2144.44`
-   `--d2` 使用的是 `cubic-bezier(0.1, var(--v), 0.9, var(--v))` 函数，其中 `--v` 的值也是 `2144.44`

  


但最终呈现的动画效果明显不一样：

  


  


> Demo 地址：https://codepen.io/airen/full/PoVmBQr

  


更有意思的是，这种技巧不仅限于抛物线和正弦曲线的组合。它可以适用于任何类型的缓动函数，而且输出的结果总是会不一样，当然，结果也并不总是一条复杂的曲线。你可以尝试调整下面示例中的缓动函数：

  


  


> Demo 地址：https://codepen.io/airen/full/ZEwKjda

  


在这种情况下，我们并没有得到一个复杂的过渡效果，更多的是为了说明这是一个通用的思想，不仅仅局限于 `cubic-bezier()`。

  


现在，我们可以在这个通用的思想上将一些可变的参数抽取出来，例如：

  


-   用于 `--d1` 过渡动画的 `cubic-bezier()` 函数的四个参数，你可以定义为 `--c11` 、`--c12` 、`--c13` 和 `--c14`
-   用于 `--d2` 过渡动画的 `cubic-bezier()` 函数的四个参数，你可以定义为 `--c21` 、`--c22` 、`--c23` 和 `--c24`
-   `--d1` 变量的初始值 `--d1-initial-val` 和终点值 `--d1-final-val`
-   `--d2` 变量的初始值 `--d2-initial-val` 和终点值 `--d2-final-val`
-   用于 `--d1` 过渡动画的持续时间 `--d1-duration`
-   用于 `--d2` 过渡动画的持续时间 `--d2-duration`

  


给上面这些自定义属性（变量）赋值时，有几个关键的细节点要注意一下：

  


-   由于 `cubic-bezier()` 函数中的 `P1` 和 `P2` 控制点的 `x` 轴坐标始终在 `[0,1]` 范围内，因此 `--c11` 、`--c13` 、`--c21` 和 `--c23` 的值范围是 `0 ~ 1` 。
-   `cubic-bezier()` 函数模拟抛物线或正弦曲线时，分别使用的是 `cubic-bezier(0, V, 1, V)` 和 `cubic-bezier(0.5, V, 0.5, -V)` ，`V` 参数决定曲线的最高点 `Max` 和最低点 `Min` ，一般是一个较大值。因此，`--c12` 、`--c14` 、`--c22` 和 `--c24` 将会是一个较大的正（或负）值
-   `--d1-initial-val` 和 `--d1-final-val` 用来计算 `--d1` 增量，其值一般较小，在模拟抛物线或正弦曲线时，这个值越小越好
-   `--d2-initial-val` 和 `--d2-final-val` 用来计算 `--d2` 增量，其值一般较小，在模拟抛物线或正弦曲线时，这个值越小越好
-   `--d1-duration` 和 `--d2-duration` 分别用来定义 `--d1` 和 `--d2` 过渡动画的持续时间，它们也将会影响最终曲线的结果

  


你可以全部通过 `@property` 属性来定义这些自定义属性，当然，不涉及动画化的自定义属性也可以直接使用 CSS 的原生自定义属性。至于它们之间的差异，这里就不阐述了。我在这里统一使用 `@property` 规则来定义：

  


```CSS
/* 需要动画化的属性 */
@property --d1 {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}

@property --d2 {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}

/* 用于 --d1 的 cubic-bezier() 函数的参数 */
@property --c11 {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}

@property --c12 {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}

@property --c13 {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}

@property --c14 {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}

/* 用于 --d2 的 cubic-bezier() 函数的参数 */
@property --c21 {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}

@property --c22 {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}

@property --c23 {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}

@property --c24 {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}

/* --d1 的初始值和终点值 */
@property --d1-initial-val {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}

@property --d1-final-val {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}

/* --d2 的初始值和终点值 */
@property --d2-initial-val {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}

@property --d2-final-val {
    syntax: '<number>';
    inherits: false;
    initial-value: 0;
}

/* --d1 过渡动画的持续时间 */
@property --d1-duration {
    syntax: '<time>';
    inherits: false;
    initial-value: 1s;
}

/* --d2 过渡动画的持续时间 */
@property --d2-duration {
    syntax: '<time>';
    inherits: false;
    initial-value: 1s;
}
```

  


注意，除了 `--d1-duration` 和 `--d2-duration` 自定义属性的值类型定义为 `<time>` 之外，其他自定义属性的值类型都定义为 `<number>` ，这样做的好处是，我们可以通过 `calc()` 函数对其做值类型转换，比如，转换为 `<length>` 、`<percentage>` 或 `<angle>` 等值类型，相对而言比较灵活和便利。

  


```CSS
@layer transition {
    .walk {
        --c11: 0.7;
        --c12: 5000;
        --c13: 0.3;
        --c14: 5000;
        --duration: 1s;
        --d1-duration: 1s;
        --d1-initial-val: 0;
        --d1: var(--d1-initial-val);
    
        --c12: 0.5;
        --c22: 5000;
        --c23: 0.5;
        --c24: -5000;
        --d2-duration: 1s;
        --d2-initial-val: 0;
        --d2: var(--d2-initial-val);
        
        left: 0;
        translate: 0 calc((50 + var(--d1) + var(--d2)) * 1%);
    
        .walk--d1 & {
            transition: 
                --d1 var(--d1-duration) cubic-bezier(var(--c11), var(--c12), var(--c13), var(--c14)),
                left var(--duration) linear;
        }
    
        .walk--d2 & {
            transition: 
                --d2 var(--d2-duration)  cubic-bezier(var(--c12), var(--c22), var(--c23), var(--c24)),
                left var(--duration) linear;
        }
    
        .walk--composite & {
            transition: 
                --d1 var(--d1-duration) cubic-bezier(var(--c11), var(--c12), var(--c13), var(--c14)),
                --d2 var(--d2-duration) cubic-bezier(var(--c12), var(--c22), var(--c23), var(--c24)),
                left var(--duration) linear;
        }
    
        .walk--wrapper:hover &,
        .player & {
            --d1-final-val: 0.2;
            --d1-final-val: -0.2;
            --d1: var(--d1-final-val);
            --d2: var(--d1-final-val);
            left: calc(100% - 32px);
        }
    }
}
```

  


  


> Demo 地址：https://codepen.io/airen/full/BaMRePO

  


正如你所看到的，我们可以组合两个不同的时间函数（使用 `cubic-bezier()` 创建）来创建一个足够复杂的第三个函数，以实现漂亮的过渡效果。组合是无限的！

  


事实上，你还可以将这个逻辑扩展到 `N` 个变量上（你还可以有 `--d3` 、`--d4` 和 `--dN` 等）。可以为每个变量定义一个缓动函数，并将它们相加，以实现更复杂的过渡效果。例如下面这个，在原有基础上再增加了一个 `--d3` 的过渡动画效果：

  


  


> Demo 地址：https://codepen.io/airen/full/jOdmjRV

  


在大多数情况下，两个变量足以创建一个漂亮的曲线，但知道这个技巧可以扩展到更多变量也是很不错的。

  


上面我们所演示的都是多个变量相加的效果，但这并不仅限于此。也就是说，我们可以对变量进行减法、乘法和除法等操作，甚至还可以在变量之间执行更复杂的计算。以此获得更复杂的曲线。比如下面这个是使用了加法和乘法混合计算出来的一个曲线效果：

  


```CSS
@layer transition {
    @property --d1 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }
    
    @property --d2 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }
  
    @property --d3 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }

    .walk {
        left: 0;
        translate: 0 calc((50 + (var(--d1) + var(--d2)) * var(--d3)) * 1%);
    
        .walk--d1 & {
            transition: 
                --d1 3s cubic-bezier(0.7, 4444.44, 0.3, 4444.44),
                left 3s linear;
        }
    
        .walk--d2 & {
            transition: 
                --d2 3s cubic-bezier(0.5, 4444.44, 0.5, -4444.44),
                left 3s linear;
        }
        
         .walk--d3 & {
             transition: 
                 --d3 3s cubic-bezier(1, -20, .6, 50),
                 left 3s linear;
        }
    
        .walk--composite & {
            transition: 
                --d1 3s cubic-bezier(0.7, 4444.44, 0.3, 4444.44),
                --d2 3s cubic-bezier(0.5, 4444.44, 0.5, -4444.44), 
                --d3 3s cubic-bezier(1, -20, .6, 50),
                left 3s linear;
        }
    
        .walk--wrapper:hover &,
        .player & {
            --d1: 0.2;
            --d2: -0.1;
            --d3: 0.1;
            left: calc(100% - 32px);
        }
    }
}
```

  


  


> Demo 地址：https://codepen.io/airen/full/rNPmEEp

  


如下例所示，基于该技术方案，只要你想，你可以有 `N` 种方式创建出 `N` 种类型的缓动曲线。在这里我们无法将所有可能性覆盖，但我们要做的是找到正确的公式。只有这样，无论是使用一个变量还是组合多个变量，你都能明白发生了什么，也知道要做什么？

  


这种技术方式的初始代码可以概括为：

  


```CSS
 /* 使用 @property 规则定义可动画化属性，其他变量定义方式一样 */
@property --d1 {
    /* 注册 number 类型，易于使用 calc() 进行转换 */
    syntax: '<number>';
    inherits: false;
    /* 变量初始值，每个变量的初始值都可以不一样 */
    initial-value: i1; 
}

.animated {
    /* 所有过渡动画的持续时间可以一样 */
    --duration: 1s; 
    /* 需要动画化的属性，比如前面示例中的 translate 属性
     * 可以对变量进行加、减、乘、除或四则运算 
     */
    property: calc(f(var(--d1),var(--d2), .. ,var(--dn))*[1UNIT]); 
    
    /* 可以是任意你需要的三次贝塞尔曲线 */
    transition:
        --d1 var(--duration) cubic-bezier(var(--c11),var(--c12),var(--c13),var(--c14)),
        --d2 var(--duration) cubic-bezier(var(--c21),var(--c22),var(--c23),var(--c24)),
        /* 省略其他变量 */
        --dn var(--duration) cubic-bezier(var(--cn1),var(--cn2),var(--cn3),var(--cn4));
}
.animated:hover {
    /* 终点状态变量的值 */
    --d1:f1;
    --d2:f2;
    /* 省略其他变量 */
    --dn:f3;
}
```

  


上面代码是一段伪代码，主要用来说明前面示例中所应用的逻辑：

  


-   使用 `@property` 来定义具有初始值的数字自定义属性，通常将需要动画化的属性用该规则来定义
-   每个变量（如 `--d1` 、`--d2` 和 `--dn` 等）都有自己的缓动函数，但持续时间相同，当然，你也可以设置不同的持续时间，得到不一样的缓动曲线
-   我们定义了一个 `f` 函数，它是在变量之间使用的公式。该函数提供一个数字，我们使用它来乘以相关单位，易于获得所需单位值。所有这些一般通过 `calc()` 函数来执行。`f` 函数可以对多个变量进行加、减、乘、除或四则混合运算等操作
-   在悬停（或切换，或其他触发过渡动画的方式）时更新每个变量的值

鉴于此，属性以自定义时间函数从 `f(i1,i2,…,in)` 过渡到 `f(f1,f2,..,fn)`。

  


现在，你已经掌握了如何通过组合多个基本的时间函数（缓动函数）来创建一个复杂的时间函数技巧。接下来，我们再将这个技巧升级一下。把延迟时间加进来，即使用 `transition-delay` 属性，将时间函数链接在一起。

  


  


> Demo 地址：https://codepen.io/airen/full/LYqywba

  


上面这个示例是一个将正弦曲线和抛物线相加得到的一个新的动画曲线的示例。接下来，我们在上面这个示例的基础上给 `--d2` 动画添加 `transition-delay` 属性，将其延迟 `1.5s` 播放。

  


```CSS
@layer transition {
    @property --d1 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }
    
    @property --d2 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }
  
    .walk {
        --v: 3144.44;
        left: 0;
        translate: 0 calc((50 + var(--d1) + var(--d2)) * 1%);
    
        .walk--d1 & {
            /* --d1 过渡用时 1.5s, left 过渡用时 3s */
            transition: 
                --d1 1.5s cubic-bezier(0.5, var(--v), 0.5, calc(var(--v) * -1)),
                left 3s linear;
        }
    
        .walk--d2 & {
            /* --d2 过渡用时 1.5s, 并延迟 1.5s 开始； left 过渡用时 3s */
            transition: 
                --d2 1.5s cubic-bezier(0, var(--v), 1, var(--v)) 1.5s,
                left 3s linear;
        }
        
    
        .walk--composite & {
            /** 
             * --d1 过渡用时 1.5s
             * --d2 过渡用时 1.5s, 并延迟 1.5s 开始 
             * left 过渡用时 3s */
            transition: 
                --d1 1.5s cubic-bezier(0.5, var(--v), 0.5, calc(var(--v) * -1)),
                --d2 1.5s cubic-bezier(0, var(--v), 1, var(--v)) 1.5s,
                left 3s linear;
        }
    
        .walk--wrapper:hover &,
        .player & {
            --d1: 0.2;
            --d2: -0.2;
            left: calc(100% - 32px);
        }
    }
}
```

  


我们是将时间函数链接在一起，而不是将它们相加，这是创造更复杂时间函数的另一种方式。从数学上来说，它仍然是一个和，但由于过渡不是同时运行的，比如上面代码中的 `--d2` ，它添加了 `transition-delay` ，使其比 `--d1` 延迟 `1.5s` 才开始。这样就模拟了一个缓动函数链接的效果：

  


  


> Demo 地址： https://codepen.io/airen/full/JjxNgNx

  


接下来，我们使用这些技巧来制作一些 CSS 过渡动画效果。比如下面这个摆锤动画：

  


  


> Demo 地址：https://codepen.io/airen/full/qBgmeKz

  


以往都是使用 CSS 的帧动画来创建摆锤动画效果：

  


```HTML
<div class="pendulum"></div>
```

  


```CSS
@layer animation {
    @keyframes pendulum {
        0% {
            rotate: -20deg;
        }
        100% {
            rotate: 20deg;
        }
    }
    
    .pendulum {
        animation: pendulum 0.35s ease-in-out infinite alternate;
        transform-origin: 50% 0%;
    }
}
```

  


接下来，我们将使用新学到的技巧来制作与上面示例一样的摆锤动画效果，不同的是，使用 CSS 过渡动画来实现：

  


```CSS
@layer animation {

    @property --p1 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }
  
    @property --p2 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }
    
    @property --p3 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }
    
    .pendulum {
        rotate: calc((var(--p1) + var(--p2) + var(--p3)) * 1deg);
        transform-origin: top center;

        &:hover {
            --p1: 0.1;
            --p2: -0.2;
            --p3: 0.1;
          
          transition: 
              --p1 0.5s cubic-bezier(0.5, 500, 0.5, -400),
              --p2 0.5s cubic-bezier(0.5, -250, 0.5, 150) 0.5s,
              --p3 0.5s cubic-bezier(0.5, 50, 0.5, 0) 1s;
        }
    }
}
```

  


  


> Demo 地址：https://codepen.io/airen/full/XWORvxo

  


使用 CSS 的帧动画制作一个自然弹跳的小球不是一件难事：

  


  


> Demo 地址：https://codepen.io/airen/full/jOdwNOK

  


我们可以使用相同思想，通过 CSS 的 `transition` 来制作类似的小球弹跳的效果：

  


```CSS
@layer animation {
    @property --p1 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }
    
    @property --p2 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }
  
    @property --p3 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }
  
    @property --p4 {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }

    .ball {
        translate: 0 calc((var(--p1) * var(--p1) + var(--p2) + var(--p3) + var(--p4)) * 1px);
        left: 0;

        .ball--container:hover & {
            --p1: 13;
            --p2: -0.1;
            --p3: -0.1;
            --p4: -0.1;
          
            left: calc(100% - 60em);
            transition: 
                left 1.7s linear, --p1 0.6s linear,
                --p2 0.4s cubic-bezier(0.1, 1000, 0.8, 1000) 0.6s,
                --p3 0.3s cubic-bezier(0.1, 500, 0.8, 500) 1s,
                --p4 0.2s cubic-bezier(0.1, 200, 0.8, 200) 1.3s;
        }
    }
}
```

  


  


> Demo 地址：https://codepen.io/airen/full/gOqRYrx

  


看到了吗？你现在不使用关键帧，也可以制作出一个复杂的过渡动画。这主要得益于这三个特性：

  


-   使用 `cubic-bezier()` 获取抛物线和正弦曲线，从而可以在不使用关键帧的情况下创建复杂的过渡效果
-   可以通过使用 `@property` 定义自定义属性和 `calc()` 结合不同的时间函数来创建更多曲线
-   可以使用 `transition-delay` 将这些曲线链接在一起，构建复杂的时间轴

  


换句话说，现在理论有了，技巧也有了，缺的就是你的创意。你可以利用这些原理，通过 `cubic-bezier()` 函数来创建各种不同的、复杂的缓动曲线，并且结合 `@property` 定义的自定义属性，你可以制作出很多有创意、而且复杂的关键帧动画和过渡动画。从而打破了 CSS 的 `@keyframes` 、`animation` 和 `transition` 只能制作简单动画的限制，尤其是 `transition` 。

  


## 反转三次贝塞尔曲线

  


在 Web 上有很多动画效果是双向的，比如 Web 上的轮播组件，幻灯片组件就具有双向移动的动画效果：

  


  


像上面这种轮播图可以在两个方向运动：

  


-   如果你点击左箭头，当前项目将向右滑出视图或容器，下一个项目将从左边滑入视图或容器
-   如果你点击右箭头，当前项目将向左滑出视图或容器，下一个项目将从右边滑入视图或容器

  


在构建这个轮播图时，大多数 Web 开发者可能会忽略一个细节，不管项目是从左向右滑入，还是从右向左滑入，都会使用相同的一个自定义的缓动函数。事实上，这样制作的轮播图滑动的效果并不是最好的一个效果。如果你想给用户一个体验更好的滑入滑出的动画效果，不仅需要一个自定义缓动函数，而且还需要将其反转以获得正确的效果。这就需要反转三次贝塞尔曲线。这意味着，你需要创建自定义缓动函数，并且反转它。听上去很复杂，但实际上相当简单。

  


在详细介绍如何反转三次贝塞尔曲线之前，我还是想花一点时间来向大家阐述一下反转三次贝塞尔曲线的用途和作用。继续拿轮播图为例。

  


通常情况之下，用户会点击轮播图组件中的“上一个”或“下一个”按钮来使项目滑入滑出视图。大部分开发者会通过 `animation-direction` 来反转滑出的项目：

  


```CSS
.slider--reversed {
    animation: slide 3s cubic-bezier(0.45, 0.25, 0.60, 0.95) reverse;
    
    /* 或者 */
    animation-direction: reverse;
}
```

  


但有一个问题：反转动画的同时也反转了缓动曲线！因此，动画在一个方向上（比如从左往右滑入）看起来很棒，但在另一个方向（比如从右向左滑入）就完全不对了。

  


我们通过下面这个简单的示例来模拟。紫色框模拟从左往右滑入，蓝色框模拟从右往左滑入。这两个元素使用相同的动画参数，比如帧动画、缓动函数、持续时间等，唯一不同的是，蓝色框动画被反转了（设置了 `animation-direction: reverse`）：

  


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

  


这两个动画给你的感觉完全不同。紫色框在早期加速，随着进展逐渐减速；而蓝色框一开始就相当缓慢，然后在突然减速之前迅速加速。这对于轮播图来说感觉完全不对。

  


我们可以通过以下两种方式来使轮播图滑动效果变得更优雅：

  


-   可以创建一个新的关键帧动画用于滑出的项目，然后应用与之前相同的缓动函数。只不过这种方式对于一个更复杂的动画，要在相反的方向创建相同的动画则需要更多的工作量，还很容易出错
-   可以使用相同的关键帧动画（带有 `animation-direction: reverse`），并反转缓动曲线，以便在两个方向上都获得相同的缓动。这个方案相对而言更简单一点，也不容易出错

  


也就是说，两种方案相比，第二种方案更适合我们。就该方案而言，最为关键的是我们要掌握如何反转缓动函数。

  


简单地说，反转缓动函数意味着改变其方向或流动。如果你有一个 `cubic-bezier()` 函数，反转它将涉及到交换控制点。这意味着我们需要将曲线围绕其轴旋转 `180` 度，并找到新的坐标。

  


通过前面内容的学习，都知道 `cubic-bezier()` 函数定义的方式是 `cubic-bezier(P1x, P1y, P2x, P2y)` 。假设你初始的 `cubic-bezier()` 函数是 `cubic-bezier(0.42, 0, 1, 1)` （即 `ease-in`），那么它的反转函数则是 `cubic-bezier(0, 0, 0.58, 1)` （即 `ease-out`）。这种反转会将缓动效果从缓入变为缓出，反之亦然。实质上，它在水平方向上翻转了曲线。

  


  


你可能已经发现了，我们可以通过一些简单的数学运算实现三次贝塞尔曲线的反转，即通过交换坐标对并从 `1` 中减去每个值。假设 `cubic-bezier()` 的初始值是 `(x1, y1, x2, y2)` ，那么它反转之后的值将是 `((1 - x2), (1 - y2), (1 - x1), (1 - y1))` 。

  


在上面的示例中，再添加一个动画元素 `.box` ，它朝着相反的方向滑动，但缓动函数被反转了，最终给了和第一个 `.box` 相同的动画感觉，不同的只是移动方向相反：

  


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

  


正如示例中代码所示，你可以使用 CSS 自定义属性来计算新的缓动函数。

  


首先，你可以给初始的三次贝塞尔曲线 `cubic-bezier()` 的每个参数值分配一个变量，例如：

  


```CSS
:root {
    --x1: .45;
    --y1: .25;
    --x2: .6;
    --y2: .95;
    
    --originalCurve: cubic-bezier(var(--x1), var(--y1), var(--x2), var(--y2));
}
```

  


然后，我们可以使用这些变量来计算新的值：

  


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

  


现在，如果我们对第一组变量进行任何更改，反转的曲线将自动计算。为了在检查和调试代码时更容易查看，我喜欢将这些新值拆分为它们自己的变量：

  


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

  


现在，唯一剩下的是将新的曲线应用于我们的反转动画：

  


```CSS
.animation {
    animation: slide 3s var(--originalCurve);
}
.animation--reversed {
    animation-timing-function: var(--reversedCurve);
    animation-direction: reverse;
}
```

  


为了帮助可视化，我构建了一个小工具来计算 `cubic-bezier` 的反转值。输入原始坐标值以获取反转曲线：

  


  


> Demo 地址：https://codepen.io/airen/full/QWYgwbd

  


我们来看一个反转三次贝塞尔曲线的实际用例，用于构建轮播组件的滑动动画。该案例由 [@Michelle Barker](https://codepen.io/michellebarker/full/OaYpWp) 提供，实际效果如下：

  


  


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

  


涉及到动画方面的代码如下：

  


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

  


你可以使用相似方法去优化你的轮播图组件的动画效果了！

  


## 小结

  


通过这节课的学习，我想你会对三次贝塞尔曲线 `cubic-bezier()` 有一个更深入更彻底的认识，也能更好的使用该函数来制作出更加生动、富有表现力的动画效果。

  


我们详细的介绍了 `cubic-bezier()` 的基本原理，并且向大家阐述了其背后的数学原理。并且进一步的向大家演示了如何使用 `cubic-bezier()` 函数模拟抛物线和正弦曲线，以及它们组合在一起的更复杂的缓动曲线。你现在完全可以运用这些原理与技术，自定义缓动函数构建出复杂的帧动画，甚至是不需要帧动画的复杂动画（过渡动画）。

  


简而言之，三次贝塞尔函数使我们能够精确控制动画的加速和减速过程，并且利用一定的数学知识，可以组合出更为复杂的缓动曲线。这种灵活性使得开发者能够创造出更加生动、富有表现力的动画效果。我们不仅提供了数学概念的解释，还通过实际案例展示了如何在动画中应用这些理论，使得开发者能够更好地驾驭动画，为用户提供更出色的交互体验。