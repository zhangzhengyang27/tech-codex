---
title: WAAPI 综合案例：如何使用 WAAPI 创建一个动画库或组件
description: "通过 WAAPI，可以将交互式动画从 CSS 中移动到 JavaScript 中，将样式与行为分离。本文以 Animate.css、Animista、Animatable、use-web-animations 等动画库为例，演示如何使用 WAAPI 创建属于自己的动画组件或库。"
keywords: [WAAPI, 综合案例, 如何使用, WAAPI, 创建一个动画库或组件]
category: CSS
tags: [CSS, 布局, 动画, 响应式]
---


# WAAPI 综合案例：如何使用 WAAPI 创建一个动画库或组件

## 概念说明

WAAPI 允许使用 JavaScript 构建 Web 动画并控制其播放。WAAPI 向 Web 开发者打开了浏览器的动画引擎，并被设计为 CSS 动画（`animation`）和过渡（`transition`）的底层实现，同时为未来的 Web 动画效果留下可能性。它是实现高性能 Web 动画的最佳方式之一——浏览器可以进行自身的内部优化，而无需使用任何 Hack 手段或 `window.requestAnimationFrame()`。

通过 WAAPI，可以将交互式动画从 CSS 中移动到 JavaScript 中，将样式与行为分离。开发者不再需要依赖 DOM 繁重的技术，比如通过 JavaScript 脚本动态添加类名来触发动画播放，或通过动画事件添加类名来改变播放方向。与声明式 CSS 不同，JavaScript 还允许动态设置动画化的属性和持续时间等。对于构建自定义动画组件和库以及创建交互式动画，WAAPI 是非常理想的工具。

## 从 CSS 动画库说起

Web 前端社区中有很多优秀的 CSS 动画库可以帮助快速实现 Web 动画效果。这些库并非用于学习动画的语法或技术，而是提供即插即用的能力。例如 [@Daniel Eden](https://daneden.me/) 的 [animation.css](https://animate.style/) 就是一个非常优秀的 CSS 动画库：

> Animate.css：https://animate.style/ （GitHub：https://github.com/animate-css/animate.css）

在项目中安装 `animation.css` 库或引入 `animate.min.css` 文件之后，只要将类 `animate__animated` 添加到一个元素上，以及任何动画名称（不要忘记 `animate__` 前缀）：

```HTML
<h1 class="animate__animated animate__bounce"An animated element</h1
```

一个带有 CSS 动画的元素就完成了。除了 [@Daniel Eden](https://daneden.me/) 的 [animation.css](https://animate.style/) 动画库之外，社区中还有很多与之相似的 CSS 动画库或在线制作动画的工具。

### Animista

[Animista](https://animista.net/) 是一款在线制作 CSS 动画的工具：选择一个喜欢的动画，它会生成一个类名，使用该类名即可调用一个关键帧动画（复制和粘贴即可）；也可以通过它提供的界面配置动画相关的参数：

> Animista：https://animista.net/

```CSS
@-webkit-keyframes swirl-in-fwd {
  0% {
    -webkit-transform: rotate(-540deg) scale(0);
            transform: rotate(-540deg) scale(0);
    opacity: 0;
  }
  100% {
    -webkit-transform: rotate(0) scale(1);
            transform: rotate(0) scale(1);
    opacity: 1;
  }
}
@keyframes swirl-in-fwd {
  0% {
    -webkit-transform: rotate(-540deg) scale(0);
            transform: rotate(-540deg) scale(0);
    opacity: 0;
  }
  100% {
    -webkit-transform: rotate(0) scale(1);
            transform: rotate(0) scale(1);
    opacity: 1;
  }
}

.swirl-in-fwd {
        -webkit-animation: swirl-in-fwd 1.6s cubic-bezier(0.755, 0.050, 0.855, 0.060) infinite both;
                animation: swirl-in-fwd 1.6s cubic-bezier(0.755, 0.050, 0.855, 0.060) infinite both;
}
```

复制出来的代码有点冗余，需要人工删除一些不必要的代码，比如带有浏览器私有前缀的样式代码。该工具的另一好处是只需取所需的部分，无需安装库或加载库文件。

### Vivify

> Demo 地址：https://codepen.io/chriscoyier/full/EBLZVG

[Vivify](https://codepen.io/chriscoyier/full/EBLZVG) 在某种程度上类似于 [Animate.css](https://animate.style/)，它的很多效果与 Animate.css 相同，但也提供了许多自己的动画。换句话说，也可以像 Vivify 一样，在 Animate.css 基础上构建属于自己的 CSS 动画库。

### Magic Effects

> Magic Effects：https://www.minimamente.com/project/magic/ （CodePen：https://codepen.io/chriscoyier/full/QXPQgN）

[Magic Effects](https://www.minimamente.com/project/magic/) 也和 Animate.css 非常相似，不同的是 Magic Effects 提供了一些更为复杂的动画效果。

### cssanimation.io

> cssanimation.io：https://cssanimation.io/

[cssanimation.io](http://cssanimation.io/) 相对于 animation.css 稍微复杂一点，但仍然是一个 CSS 动画库。

### transition.css

前面列出的都是 CSS 关键帧动画库，[transition.css](https://www.transition.style/) 则是 CSS 过渡动画库：

> transition.css：https://www.transition.style/

### Hover.css

> Demo 地址：https://ianlunn.github.io/Hover/

[Hover.css](https://ianlunn.github.io/Hover/) 也是一个过渡动画库，它提供一系列鼠标悬浮时的过渡动效，可以应用于链接、按钮、徽标、SVG、特色图像等。

## WAAPI 制作的动画组件和库

当下 Web 开发者通常基于 React 或 Vue 框架进行开发。虽然它们都提供了制作动画的相关 API，例如 `react-transition-group` 和 `<Transition>`、`<TransitionGroup>`，但 WAAPI 所提供的 API 也能很好地融入其中用于制作 Web 动画。[Animatable](https://github.com/proyecto26/animatable-component) 和 [use-web-animations](https://github.com/wellyshen/use-web-animations) 就是两个典型的案例。

[Animatable](https://github.com/proyecto26/animatable-component) 以声明性的方式使用 WAAPI（就像使用其他 HTML 元素一样）：

```HTML
<animatable-component 
    autoplay
    easing="ease-in-out"
    duration="800"
    delay="300"
    animation="zoomIn"
    iterations="Infinity"
    direction="alternate">
    <h1>Hello World</h1>
</animatable-component>
```

> Demo 地址：https://proyecto26.com/animatable-component/ （CodePen：https://codepen.io/jdnichollsc/full/rNNYBbe）

它除了在原生 JS 中使用之外，也可以用于 [React](https://github.com/proyecto26/animatable-component?tab=readme-ov-file#react) 和 [Vue](https://github.com/proyecto26/animatable-component?tab=readme-ov-file#vue) 这些主流的 JavaScript 框架中：

```HTML
<!-- React -->
<animatable-component 
    autoplay 
    animation={myAnimation} 
    duration={300}>
    <h1>Animate it</h1>
</animatable-component>
```

```HTML
<!-- Vue -->
<animatable-component 
    autoplay 
    v-bind:animation.prop="myAnimation" 
    duration="300">
    <h1>Animate it</h1>
</animatable-component>
```

在 React 或 Vue 中使用 `<animatable-component>` 或 `<animatable-cube>` 组件之前，需要先安装它们相对应的库，详细说明见 [Animatable 官方文档。](https://github.com/proyecto26/animatable-component?tab=readme-ov-file#usage-)

[use-web-animations](https://github.com/wellyshen/use-web-animations) 与 [Animatable](https://github.com/proyecto26/animatable-component) 有所不同，它是以 React 的 Hook 方式使用 WAAPI 构建的一个动画组件：

> URL：https://use-web-animations.netlify.app/

该 Hook 的 API 设计不仅继承了 WAAPI 的开发体验，还为开发者提供了有用的功能和简便的事件。例如，可以通过 `keyframes` 和 `animationOptions` 选项创建动画（这些是 `Element.animate()` 的参数）：

```JavaScript
import useWebAnimations from "@wellyshen/use-web-animations";

const App = () => {
    const { ref, playState } = useWebAnimations({
        // 等同于 WAAPI 中 Element.animate 中的 keyframes
        keyframes: {
            transform: "translateX(500px)", 
            background: ["red", "blue", "green"], 
        },
        // 等同于 WAAPI 中 Element.animate 中的 options
        animationOptions: {
            delay: 500, 
            duration: 1000,
            iterations: 2, 
            direction: "alternate",
            easing: "ease-in-out", 
        },
        // 等同于 WAAPI 中的 ready
        onReady: ({ playState, animate, animation }) => {
            // 动画准备播放时触发
        },
        onUpdate: ({ playState, animate, animation }) => {
            // 动画进入运行状态或改变状态时触发
        },
        // 等同于 WAAPI 中的 finish
        onFinish: ({ playState, animate, animation }) => {
            // 动画进入完成状态时触发
        },
        // More useful options...
    });

    return (
        <div className="container">
            <p>🍿 Animation is {playState}</p>
            <div className="target" ref={ref} />
        </div>
    );
};
```

[use-web-animations](https://github.com/wellyshen/use-web-animations) 更详细的使用方式，[请参阅其官方文档](https://github.com/wellyshen/use-web-animations?tab=readme-ov-file#usage)。

## 如何使用 WAAPI 创建动画组件和库

[Animatable](https://github.com/proyecto26/animatable-component) 和 [use-web-animations](https://github.com/wellyshen/use-web-animations) 本质上都是 WAAPI（或 JavaScript）版本的 Animate.css。如果想用 WAAPI 创建一个属于自己的 [Animatable](https://github.com/proyecto26/animatable-component) 和 [use-web-animations](https://github.com/wellyshen/use-web-animations)，最简单的方式是将它们 Fork 下来，然后在原有动画效果的基础上进行修改或扩展。

以 [use-web-animations](https://github.com/wellyshen/use-web-animations) 为例：从 GitHub 将其 Fork 到本地后，可以在 `src/` 目录下的 `animations` 目录中找到很多动画效果的文件，例如 `bounce.ts` 文件：

```JavaScript
const easing1 = "cubic-bezier(0.215, 0.61, 0.355, 1)";
const easing2 = "cubic-bezier(0.755, 0.05, 0.855, 0.06)";
const transformOrigin = "center bottom";
const frame1 = {
    transform: "translate3d(0, 0, 0)",
    easing: easing1,
    transformOrigin,
};
const frame2 = {
    transform: "translate3d(0, -30px, 0) scaleY(1.1)",
    easing: easing2,
    transformOrigin,
};

export default {
    keyframes: [
        { ...frame1, offset: 0 },
        { ...frame1, offset: 0.2 },
        { ...frame2, offset: 0.4 },
        { ...frame2, offset: 0.43 },
        { ...frame1, offset: 0.53 },
        {
            transform: "translate3d(0, -15px, 0) scaleY(1.05)",
            easing: easing2,
            transformOrigin,
            offset: 0.7,
        },
        {
            transform: "translate3d(0, 0, 0) scaleY(0.95)",
            easing: easing1,
            transformOrigin,
            offset: 0.8,
        },
        {
            transform: "translate3d(0, -4px, 0) scaleY(1.02)",
            transformOrigin,
            offset: 0.9,
        },
        { ...frame1, offset: 1 },
    ],
    animationOptions: { duration: 1000, fill: "both" },
};
```

> 上面代码来源于： https://github.com/wellyshen/use-web-animations/blob/master/src/animations/bounce.ts

在该项目的基础上，可以把 CSS 动画库中喜欢的动画效果按照 `bounce.ts` 的方式添加到项目中。例如 [Animista 的 rotate-center 的效果](https://animista.net/play/basic/rotate)：

```CSS
@keyframes rotate-center {
    0% {
        transform: rotate(0);
    }
    100% {
        transform: rotate(360deg);
    }
}

.rotate-center {
    animation: rotate-center 0.6s ease-in-out both;
}
```

在 `src/animations/` 目录下创建一个新的动画效果文件，例如 `rotateCenter.ts`，并在该文件中将上面代码中的 `@keyframes` 和 `animation` 以 WAAPI 的方式来描述：

```JavaScript
export default {
    keyframes: [
        {
            transform: 'rotate(0)'
        },
        {
            transform: 'rotate(360deg)'
        }
    ],
    animationOptions: {
        duration: 600,
        easing: 'ease-in-out',
        fill: 'both'
    },
};
```

接着在 `src/animations/` 目录下的 `index.ts` 文件中将新创建的 `rotateCenter` 动画导出：

```JavaScript
export { default as rotateCenter } from "./rotateCenter";
```

这样就给 [use-web-animations](https://github.com/wellyshen/use-web-animations) 新增了 `rotateCenter` 动画，可以将该动画应用于目标元素上。

再来看一个示例：假设需要将 `puffIn` 动画效果添加到 [use-web-animations](https://github.com/wellyshen/use-web-animations) 中：

```CSS
@keyframes puffIn {
    0% {
        opacity: 0;
        transform-origin: 50% 50%;
        transform: scale(2, 2);
        filter: blur(2px); 
    }
    100% {
        opacity: 1;
        transform-origin: 50% 50%;
        transform: scale(1, 1);
        filter: blur(0px); 
    } 
}
```

按照创建 `rotateCenter` 动画的方式来创建 `puffIn`：

```JavaScript
// src/animations 目录下创建 puffIn.ts
const transformOrigin = '50% 50%';

export default {
    keyframes: [
        {
            opacity: '0',
            transform: 'scale(2, 2)',
            filter: 'blur(2px)',
            transformOrigin
        },
        {
            opacity: '1',
            transform: 'scale(1, 1)',
            filter: 'blur(0px)',
            transformOrigin
        }
        
    ],
    animationOptions: { 
        duration: 1000, 
        fill: "both" 
    },
};


// src/animations/index.ts 
export { default as puffIn } from "./puffIn";
```

同样的方式也可以用于扩展 [Animatable](https://github.com/proyecto26/animatable-component)：将需要的动画文件放置在 `src/animations` 目录下即可，此处不再做重复演示。

这意味着动画库可以被不断扩展：把认为好的、有意思的动画都放进库中，动画库的效果就会越来越丰富。

### 扩展库的功能

上面展示的是如何在 [Animatable](https://github.com/proyecto26/animatable-component) 和 [use-web-animations](https://github.com/wellyshen/use-web-animations) 中扩展动画效果。如果需要增加相应的功能，就需要修改 `src/useWebAnimations.ts` 文件（以 [use-web-animations](https://github.com/wellyshen/use-web-animations) 为例）：

```JavaScript
import type { RefObject } from "react";
import { useState, useRef, useCallback, useEffect } from "react";

import useLatest from "./useLatest";

export const polyfillErr =
  "💡 use-web-animations: please install polyfill to use this hook. See https://github.com/wellyshen/use-web-animations##use-polyfill";
export const eventErr = `💡 use-web-animations: the browser doesn't support "onReady" event, please use "onUpdate" to monitor the animation's state instead. See https://github.com/wellyshen/use-web-animations#basic-usage`;

type Keyframes = Keyframe[] | PropertyIndexedKeyframes;
type PlayState = AnimationPlayState | undefined;
type BaseOptions = Partial<{
  id: string;
  playbackRate: number;
  autoPlay: boolean;
  animationOptions:
    | number
    | (KeyframeAnimationOptions & { pseudoElement?: string });
}>;
interface Animate {
  (options: BaseOptions & { keyframes: Keyframes }): void;
}
interface Callback {
  (event: {
    playState: PlayState;
    animate: Animate;
    animation: Animation;
  }): void;
}
export interface Options<T> extends BaseOptions {
  ref?: RefObject<T>;
  keyframes?: Keyframes;
  onReady?: Callback;
  onUpdate?: Callback;
  onFinish?: Callback;
}
interface Return<T> {
  ref: RefObject<T>;
  playState: PlayState;
  getAnimation: () => Animation | undefined;
  animate: Animate;
}

const useWebAnimations = <T extends HTMLElement | null>({
  ref: refOpt,
  id,
  playbackRate,
  autoPlay,
  keyframes,
  animationOptions,
  onReady,
  onUpdate,
  onFinish,
}: Options<T> = {}): Return<T> => {
  const [playState, setPlayState] = useState<PlayState>();
  const hasUnmountedRef = useRef(false);
  const animRef = useRef<Animation>();
  const prevPendingRef = useRef<boolean>();
  const prevPlayStateRef = useRef<string>();
  const keyframesRef = useRef(keyframes);
  const animationOptionsRef = useRef(animationOptions);
  const onReadyRef = useLatest(onReady);
  const onUpdateRef = useLatest(onUpdate);
  const onFinishRef = useLatest(onFinish);
  const refVar = useRef<T>(null);
  const ref = refOpt || refVar;

  const getAnimation = useCallback(() => animRef.current, []);

  const animate: Animate = useCallback(
    (args) => {
      if (!ref.current || !args.keyframes) return;
      if (!ref.current.animate) {
        console.error(polyfillErr);
        return;
      }

      animRef.current = ref.current.animate(
        args.keyframes,
        args.animationOptions
      );
      const { current: anim } = animRef;

      if (args.autoPlay === false) anim.pause();
      if (args.id) anim.id = args.id;
      if (args.playbackRate) anim.playbackRate = args.playbackRate;

      if (onReadyRef.current) {
        if (anim.ready) {
          // eslint-disable-next-line promise/catch-or-return, promise/always-return
          anim.ready.then((animation) => {
            // @ts-ignore
            onReadyRef.current({
              playState: animation.playState,
              animate,
              animation,
            });
          });
        } else {
          console.error(eventErr);
        }
      }

      if (onFinishRef.current) {
        anim.onfinish = (e) => {
          const animation = e.target as Animation;

          if (!hasUnmountedRef.current) {
            // @ts-ignore
            onFinishRef.current({
              playState: animation.playState,
              animate,
              animation,
            });
          }
        };
      }

      prevPlayStateRef.current = undefined;
    },
    [onFinishRef, onReadyRef, ref]
  );

  useEffect(() => {
    if (keyframesRef.current)
      animate({
        id,
        playbackRate,
        autoPlay,
        keyframes: keyframesRef.current,
        animationOptions: animationOptionsRef.current,
      });
  }, [animate, autoPlay, id, playbackRate]);

  useEffect(() => {
    let rafId: number;

    const update = () => {
      const animation = getAnimation();

      if (animation) {
        const { pending, playState: curPlayState } = animation;

        if (prevPlayStateRef.current !== curPlayState)
          setPlayState(curPlayState);

        if (
          onUpdateRef.current &&
          (prevPendingRef.current !== pending ||
            prevPlayStateRef.current !== curPlayState ||
            curPlayState === "running")
        )
          onUpdateRef.current({ playState: curPlayState, animate, animation });

        prevPendingRef.current = pending;
        prevPlayStateRef.current = curPlayState;
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafId);

      hasUnmountedRef.current = true;
      getAnimation()?.finish();
      getAnimation()?.cancel();
    };
  }, [animate, getAnimation, onUpdateRef]);

  return { ref, playState, getAnimation, animate };
};

export default useWebAnimations;
```

> 代码来源：https://github.com/wellyshen/use-web-animations/blob/master/src/useWebAnimations.ts

上面是基于 React 的 Hook 和 WAAPI 写的 `useWebAnimations`。可以使用 WAAPI 相关的 API 来扩展动画的功能；如果对 React 和 Vue 很熟悉，也可以按类似的方式创建属于自己的动画组件或库。

## 小结

WAAPI 允许 Web 开发者将自己喜欢的动画封装成一个组件或库：它既可以用于原生 JavaScript，也可以应用于 React 或 Vue 这样的 JavaScript 框架。在封装的库或组件中，可以整合任何动画库中喜欢的功能；有了这样的库，制作复杂动画会容易很多。
