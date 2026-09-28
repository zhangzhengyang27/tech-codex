---
title: "自定义hook练习"
description: "自定义 hook 练习：实现 react-use 的 useMountedState / useLifecycles / useCookie / useHover / useScrolling，与 ahooks 的 useSize / useHover / useTimeout / useWhyDidYouUpdate / useCountDown，总结事件绑定类 hook 的三种封装方式。"
keywords: [自定义hook练习]
category: React
tags: [React, 组件与实战]
---

# 自定义hook练习

## 学习目标

- 掌握 useMountedState / useLifeCycles / useCookie / useHover / useScrolling
- 掌握 useSize / useTimeout / useWhyDidYouUpdate / useCountDown
- 掌握 事件绑定类 hook 的三种封装方式

## useMountedState 和 useLifeCycles

useMountedState 可以用来获取组件是否 mount 到 dom：

```javascript
import { useEffect, useState } from 'react';
import {useMountedState} from 'react-use';

const App = () => {
    const isMounted = useMountedState();
    const [,setNum ] = useState(0);

    useEffect(() => {
        setTimeout(() => {
            setNum(1);
        }, 1000);
    }, []);

    return <div>{ isMounted() ? 'mounted' : 'pending' }</div>
};

export default App;
```
第一次渲染，组件渲染的时候，组件还没 mount 到 dom，1 秒后通过 setState 触发再次渲染的时候，这时候组件已经 mount 到 dom 了。

这个 hook 的实现也比较简单：

```javascript
import { useCallback, useEffect, useRef } from 'react';

export default function useMountedState(): () => boolean {
  const mountedRef = useRef<boolean>(false);
  const get = useCallback(() => mountedRef.current, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return get;
}
```
通过 useRef 保存 mount 状态，然后 useEffect 回调里修改它为 true。

因为 useEffect 是在 dom 操作之后异步执行的，所以这时候就已经 mount 了。

而使用 useRef 而不是 useState 保存 mount 的值是因为修改 ref.current 并不会引起组件重新渲染。

并且返回的 get 函数要用 useCallback 包裹，这样用它作为其它 memo 组件参数的时候，就不会导致额外的渲染。

类似的还有个 useLifeCycles 的 hook：

```javascript
import {useLifecycles} from 'react-use';

const App = () => {
  useLifecycles(() => console.log('MOUNTED'), () => console.log('UNMOUNTED'));

  return null;
};

export default App;
```
这个也是用 useEffect 的特性实现的：

```javascript
import { useEffect } from 'react';

const useLifecycles = (mount: Function, unmount?: Function) => {
  useEffect(() => {
    if (mount) {
      mount();
    }
    return () => {
      if (unmount) {
        unmount();
      }
    };
  }, []);
};

export default useLifecycles;
```
在 useEffect 里调用 mount，这时候 dom 操作完了，组件已经 mount。

然后返回的清理函数里调用 unmount，在组件从 dom 卸载时调用。

这两个 hook 都是依赖 useEffect 的特性来实现的。

## useCookie

useCookie 可以方便的增删改 cookie：

```javascript
import { useEffect } from "react";
import { useCookie } from "react-use";

const App = () => {
  const [value, updateCookie, deleteCookie] = useCookie("guang");

  useEffect(() => {
    deleteCookie();
  }, []);

  const updateCookieHandler = () => {
    updateCookie("666");
  };

  return (
    <div>
      <p>cookie 值: {value}</p>
      <button onClick={updateCookieHandler}>更新 Cookie</button>
      <br />
      <button onClick={deleteCookie}>删除 Cookie</button>
    </div>
  );
};
export default App;
```

它是对 js-cookie 这个包的封装：

安装下：
```
npm i --save js-cookie
```
然后实现 useCookie：

```javascript
import { useCallback, useState } from 'react';
import Cookies from 'js-cookie';

const useCookie = (
  cookieName: string
): [string | null, (newValue: string, options?: Cookies.CookieAttributes) => void, () => void] => {
  const [value, setValue] = useState<string | null>(() => Cookies.get(cookieName) || null);

  const updateCookie = useCallback(
    (newValue: string, options?: Cookies.CookieAttributes) => {
      Cookies.set(cookieName, newValue, options);
      setValue(newValue);
    },
    [cookieName]
  );

  const deleteCookie = useCallback(() => {
    Cookies.remove(cookieName);
    setValue(null);
  }, [cookieName]);

  return [value, updateCookie, deleteCookie];
};

export default useCookie;
```

就是基于 js-cookie 来 get、set、remove cookie：
**一般自定义 hook 里返回的函数都要用 useCallback 包裹下，这样调用者就不用自己处理了。**

## useHover

css 里有 :hover 伪类，但是 js 里没有 hover 事件，只有 mouseenter、mouseleave 事件。

useHover 封装了 hover 事件：

```javascript
import {useHover} from 'react-use';

const App = () => {
  const element = (hovered: boolean) =>
    <div>
      Hover me! {hovered && 'Thanks'}
    </div>;

  const [hoverable, hovered] = useHover(element);

  return (
    <div>
      {hoverable}
      <div>{hovered ? 'HOVERED' : ''}</div>
    </div>
  );
};

export default App;
```

我们写一下：

```javascript
import { cloneElement, useState } from "react";

export type Element = ((state: boolean) => React.ReactElement) | React.ReactElement;

const useHover = (element: Element): [React.ReactElement, boolean] => {
  const [state, setState] = useState(false);

  const onMouseEnter = (originalOnMouseEnter?: any) => (event: any) => {
    originalOnMouseEnter?.(event);
    setState(true);
  };
  const onMouseLeave = (originalOnMouseLeave?: any) => (event: any) => {
    originalOnMouseLeave?.(event);
    setState(false);
  };

  if (typeof element === 'function') {
    element = element(state);
  }

  const el = cloneElement(element, {
    onMouseEnter: onMouseEnter(element.props.onMouseEnter),
    onMouseLeave: onMouseLeave(element.props.onMouseLeave),
  });

  return [el, state];
};

export default useHover;
```

传入的可以是 ReactElement 也可以是返回 ReactElement 的函数，内部对函数做下处理：

用 cloneElement 复制 ReactElement，给它添加 onMouseEnter、onMouseLeave 事件。

并用 useState 保存 hover 状态：

这里注意如果传入的 React Element 本身有 onMouseEnter、onMouseLeave 的事件处理函数，要先调用下：

换成我们实现的试一下，没啥问题。

## useScrolling

useScrolling 封装了滚动的状态：

```javascript
import { useRef } from "react";
import { useScrolling } from "react-use";

const App = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolling = useScrolling(scrollRef);

  return (
    <>
    {<div>{scrolling ? "滚动中.." : "没有滚动"}</div>}

    <div ref={scrollRef} style={{height: '200px', overflow: 'auto'}}>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
      <div>guang</div>
    </div>
    </>
  );
};

export default App;
```

和刚才的 useHover 差不多，但是传入的是 ref。

我们实现下：

```javascript
import { RefObject, useEffect, useState } from 'react';

const useScrolling = (ref: RefObject<HTMLElement>): boolean => {
  const [scrolling, setScrolling] = useState<boolean>(false);

  useEffect(() => {
    if (ref.current) {
      let scollingTimer: number;

      const handleScrollEnd = () => {
        setScrolling(false);
      };

      const handleScroll = () => {
        setScrolling(true);
        clearTimeout(scollingTimer);
        scollingTimer = setTimeout(() => handleScrollEnd(), 150);
      };

      ref.current?.addEventListener('scroll', handleScroll);

      return () => {
        if (ref.current) {
          ref.current?.removeEventListener('scroll', handleScroll);
        }
      };
    }
    return () => {};
  }, [ref]);

  return scrolling;
};

export default useScrolling;
```
用 useState 创建个状态，给 ref 绑定 scroll 事件，scroll 的时候设置 scrolling 为 true：

并且定时器 150ms 以后修改为 false。

这样只要不断滚动，就会一直重置定时器，结束滚动后才会设置为 false。

为啥 useHover 的时候是传入 element，通过 cloneElement 添加事件，而 useScrolling 里是传入 ref，通过 addEventListener 添加事件呢？

确实，这两种实现方式都可以。

但是有区别，传入 element 通过 cloneElement 修改后返回的方式，因为会覆盖这个属性，所以要先调用下之前的事件处理函数。

而传入 ref 直接 addEventListener 的方式，则是直接把事件绑定在元素上了，可以绑定多个。

这两种选择用哪种方式实现都可以，差不多。

比如 useHover 在 react-use 里用的 React Element + cloneElement 的方式实现，而在 ahooks 就是用的 ref + addEventListener 实现的。

其实还有一种方式更常用，就是返回 hook 返回 onXxx 函数，调用者自己绑定。

比如 @floating-ui/react 包的 useInteractions，就是返回 props 对象，比如 {onClick: xxx} 让调用者自己绑定。

或者只返回事件处理函数。

封装绑定事件的自定义 hook，总共就这三种封装方式。

案例代码上传了[小册仓库](https://github.com/QuarkGluonPlasma/react-course-code/tree/main/react-use-hook)。

## react-use 部分小结

组件里的逻辑可以抽成自定义 hook 来复用，在 react-use、ahooks 里也有很多通用 hook。

我们实现了 useMountedState、useLifecycles、useCookie、useHover、useScrolling 这些自定义 hook。

其中要注意的是返回的函数一般都用 useCallback 包裹，这样返回值作为 memo 组件的参数的时候，调用者不用再处理。

再就是绑定事件的 hook 有三种封装方式：

- 传入 React Element 然后 cloneElement
- 传入 ref 然后拿到 dom 执行 addEventListener
- 返回 props 对象或者事件处理函数，调用者自己绑定

自定义 hook 的封装方式都差不多，练习几个就会了。


上文写了几个 react-use 的 hook，接下来写几个 ahooks 里的。

新建个项目：

```
npx create-vite
```

进入项目，安装依赖，然后把服务跑起来：

```
npm install
npm run dev
```

去掉 index.css 和 StrictMode：

安装 ahooks：

```
npm install --save ahooks
```

## useSize

useSize 是用来获取 dom 尺寸的，并且在元素尺寸改变的时候会实时返回新的尺寸。
```javascript
import React, { useRef } from 'react';
import { useSize } from 'ahooks';

export default () => {
  const ref = useRef<HTMLDivElement>(null);
  const size = useSize(ref);
  return (
    <div ref={ref}>
      <p>改变窗口大小试试</p>
      <p>
        width: {size?.width}px, height: {size?.height}px
      </p>
    </div>
  );
};
```

我们来实现下：

```javascript
import ResizeObserver from 'resize-observer-polyfill';
import { RefObject, useEffect, useState } from 'react';

type Size = { width: number; height: number };

function useSize(targetRef: RefObject<HTMLElement>): Size | undefined {

    const [state, setState] = useState<Size | undefined>(
        () => {
            const el = targetRef.current;
            return el ? { width: el.clientWidth, height: el.clientHeight } : undefined
        },
    );

    useEffect(() => {
        const el = targetRef.current;

        if (!el) {
            return;
        }

        const resizeObserver = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                const { clientWidth, clientHeight } = entry.target;
                setState({ width: clientWidth, height: clientHeight });
            });
        });
        resizeObserver.observe(el);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    return state;
}

export default useSize;
```
用 useState 创建 state，初始值是传入的 ref 元素的宽高。

这里取 clientHeight，也就是不包含边框的高度。

网页里的各种距离、尺寸可以看[图解网页的各种距离](22-图解网页的各种距离)那节。

然后用 ResizeObserver 监听元素尺寸的变化，改变的时候 setState 触发重新渲染。

这里为了兼容，用了 resize-observer-polyfill。

```
npm i --save resize-observer-polyfill
```

换成我们实现的试一下，没啥问题。

## useHover

上文用过 react-use 的 useHover，它是传入 React Element （或者返回 React Element 的函数）的方式：

```javascript
import {useHover} from 'react-use';

const App = () => {
  const element = (hovered: boolean) =>
    <div>
      Hover me! {hovered && 'Thanks'}
    </div>;

  const [hoverable, hovered] = useHover(element);

  return (
    <div>
      {hoverable}
      <div>{hovered ? 'HOVERED' : ''}</div>
    </div>
  );
};

export default App;
```

而 ahooks 里的 [useHover](https://ahooks.gitee.io/zh-CN/hooks/use-hover) 是这样用的：

```javascript
import React, { useRef } from 'react';
import { useHover } from 'ahooks';

export default () => {
  const ref = useRef<HTMLDivElement>(null);
  const isHovering = useHover(ref);
  return <div ref={ref}>{isHovering ? 'hover' : 'leaveHover'}</div>;
};
```
传入的是 ref。

实现下：

```javascript
import { RefObject, useEffect, useState } from 'react';

export interface Options {
  onEnter?: () => void;
  onLeave?: () => void;
  onChange?: (isHovering: boolean) => void;
}

export default (ref: RefObject<HTMLElement>, options?: Options): boolean => {
    const { onEnter, onLeave, onChange } = options || {};

    const [isEnter, setIsEnter] = useState<boolean>(false);

    useEffect(() => {
        ref.current?.addEventListener('mouseenter', () => {
            onEnter?.();
            setIsEnter(true);
            onChange?.(true);
        });

        ref.current?.addEventListener('mouseleave', () => {
            onLeave?.();
            setIsEnter(false);
            onChange?.(false);
        });
    }, [ref]);

    return isEnter;
};
```

上文讲过事件绑定类的 hook 有三种写法，之前用传入 React Element + cloneElement 的方式实现过，这次用 ref + addEventListener 实现的。

测试下，没啥问题。

## useTimeout

[闭包陷阱](06-Hook的闭包陷阱的成因和解决方案)那节我们实现过定时器的 hook：

```javascript
import React, { useState } from 'react';
import { useTimeout } from 'ahooks';

export default () => {
  const [state, setState] = useState(1);
  useTimeout(() => {
    setState(state + 1);
  }, 3000);

  return <div>{state}</div>;
};
```
它要保证只能跑一次，不然计时会不准。

ahooks 的实现和我们之前实现一样：

```javascript
import { useCallback, useEffect, useRef } from 'react';

const useTimeout = (fn: () => void, delay?: number) => {

  const fnRef = useRef<Function>(fn);

  fnRef.current = fn;

  const timerRef = useRef<number | undefined>(undefined);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(fnRef.current, delay);

    return clear;
  }, [delay]);

  return clear;
};

export default useTimeout;
```
首先 useRef 保存回调函数，每次调用都会更新这个函数，避免闭包陷阱（函数里引用之前的 state）：

setTimeout 执行从 fnRef.current 取的最新的函数。

要不要在渲染函数里直接改 ref.current，其实都可以，闭包陷阱那节也讲过。文档里不建议，但是很多库都是直接改的。

可以包一层 useLayoutEffect 或者 useEffect，这里我们就可以改了。

然后用 useRef 保存 timer 引用，方便 clear 函数里拿到它来 clearTimeout。

测试下，没啥问题。

## useWhyDidYouUpdate

props 变了会导致组件重新渲染，而 [useWhyDidYouUpdate](https://ahooks.gitee.io/zh-CN/hooks/use-why-did-you-update) 就是用来打印是哪些 props 改变导致的重新渲染：

用下试试：

```javascript
import { useWhyDidYouUpdate } from 'ahooks';
import React, { useState } from 'react';

const Demo: React.FC<{ count: number }> = (props) => {
  const [randomNum, setRandomNum] = useState(Math.random());

  useWhyDidYouUpdate('Demo', { ...props, randomNum });

  return (
    <div>
      <div>
        <span>number: {props.count}</span>
      </div>
      <div>
        randomNum: {randomNum}
        <button onClick={() => setRandomNum(Math.random)}>
          设置随机 state
        </button>
      </div>
    </div>
  );
};

export default () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <Demo count={count} />
      <div>
        <button onClick={() => setCount((prevCount) => prevCount - 1)}>减一</button>
        <button onClick={() => setCount((prevCount) => prevCount + 1)}>加一</button>
      </div>
    </div>
  );
};
```
Demo 组件有 count 的 props，有 randomNum 的 state。

当 count 或 randomNum 导致组件重新渲染时，都能打印出是哪个值从 from 变到了 to。

它的实现其实很简单，我们来写一下：

```javascript
import { useEffect, useRef } from 'react';

export type IProps = Record<string, any>;

export default function useWhyDidYouUpdate(componentName: string, props: IProps) {
  const prevProps = useRef<IProps>({});

  useEffect(() => {
    if (prevProps.current) {
      const allKeys = Object.keys({ ...prevProps.current, ...props });
      const changedProps: IProps = {};

      allKeys.forEach((key) => {
        if (!Object.is(prevProps.current[key], props[key])) {
          changedProps[key] = {
            from: prevProps.current[key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length) {
        console.log('[why-did-you-update]', componentName, changedProps);
      }
    }

    prevProps.current = props;
  });
}
```
Record<string, any> 是任意的对象的 ts 类型。

核心就是 useRef 保存 props 或者其他值，当下次渲染的时候，拿到新的值和上次的对比下，打印值的变化。

props 可以传入任意 props、state 或者其他值。

实现很简单，但是比较有用的一个 hook。

## useCountDown

这个是用来获取倒计时的：

```javascript
import { useCountDown } from 'ahooks';

export default () => {
  const [countdown, formattedRes] = useCountDown({
    targetDate: `${new Date().getFullYear()}-12-31 23:59:59`,
  });

  const { days, hours, minutes, seconds, milliseconds } = formattedRes;

  return (
    <p>
      距离今年年底还剩 {days} 天 {hours} 小时 {minutes} 分钟 {seconds} 秒 {milliseconds} 毫秒
    </p>
  );
};
```
比如获取到今年年底的倒计时。

我们来实现下：

```javascript
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';

export type TDate = dayjs.ConfigType;

export interface Options {
  leftTime?: number;
  targetDate?: TDate;
  interval?: number;
  onEnd?: () => void;
}

export interface FormattedRes {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

const calcLeft = (target?: TDate) => {
  if (!target) {
    return 0;
  }

  const left = dayjs(target).valueOf() - Date.now();
  return left < 0 ? 0 : left;
};

const parseMs = (milliseconds: number): FormattedRes => {
  return {
    days: Math.floor(milliseconds / 86400000),
    hours: Math.floor(milliseconds / 3600000) % 24,
    minutes: Math.floor(milliseconds / 60000) % 60,
    seconds: Math.floor(milliseconds / 1000) % 60,
    milliseconds: Math.floor(milliseconds) % 1000,
  };
};

const useCountdown = (options: Options = {}) => {
    const { leftTime, targetDate, interval = 1000, onEnd } = options || {};

    const memoLeftTime = useMemo<TDate>(() => {
        return leftTime && leftTime > 0 ? Date.now() + leftTime : undefined;
    }, [leftTime]);

    const target = 'leftTime' in options ? memoLeftTime : targetDate;

    const [timeLeft, setTimeLeft] = useState(() => calcLeft(target));

    const onEndRef = useRef(onEnd);
    onEndRef.current = onEnd;

    useEffect(() => {
        if (!target) {
            setTimeLeft(0);
            return;
        }

        setTimeLeft(calcLeft(target));

        const timer = setInterval(() => {
            const targetLeft = calcLeft(target);
            setTimeLeft(targetLeft);
            if (targetLeft === 0) {
                clearInterval(timer);
                onEndRef.current?.();
            }
        }, interval);

        return () => clearInterval(timer);
    }, [target, interval]);

    const formattedRes = useMemo(() => parseMs(timeLeft), [timeLeft]);

    return [timeLeft, formattedRes] as const;
};

export default useCountdown;
```
代码比较多，一部分一部分来看。

Options 是参数的类型，可以传入 leftTime 剩余时间，也可以传入目标日期值 targetDate。

interval 是倒计时变化的时间间隔，默认 1s。

onEnd 是倒计时结束的回调。

FormattedRes 是返回的格式化后的日期。

TDate 是 dayjs 允许的传入的日期类型。

然后 leftTime 和 targetDate 只需要取一个。

如果是 leftTime 那 Date.now() 加上 leftTime 就是目标日期。否则，就用传入的 targetDate。

onEnd 的函数也是要用 useRef 保存，然后每次更新 ref.current，取的时候取 ref.current。

这也是为了避免闭包陷阱的。

核心部分是 useState 创建一个 state，在初始和每次定时器都计算一次剩余时间。

这个就是当前日期到目标日期的差值。

然后把它格式化一下就好了。

倒计时的逻辑很简单，就是通过定时器，每次计算下当前日期和目标日期的差值，返回格式化以后的结果。

注意传入的回调函数都要用 useRef 包裹下，用的时候取 ref.current，避免闭包陷阱。

测试下，没啥问题。

案例代码上传了[小册仓库](https://github.com/QuarkGluonPlasma/react-course-code/tree/main/ahooks-hook)。

## ahooks 部分小结

这节我们写了几个 ahooks 里的自定义 hook。

useSize：拿到元素尺寸，通过 ResizeObserver 监听尺寸变动返回新的尺寸。

useHover：用 ref + addEventListener 实现的 hover 事件。

useTimeout：对 setTimeout 的封装，通过 useRef 保存 fn 避免了闭包陷阱。

useWhyDidYouUpdate：打印 props 或者 state 等的变化，排查引起组件重新渲染的原因，原理很简单，就是通过 useRef 保存之前的值，和当前渲染时的值对比

useCountDown：倒计时，通过当前时间和目标时间的差值实现，基于 dayjs。

写完这些 hook，相信你对自定义 hook 的封装更加得心应手了。



## 继续阅读

- 上一篇：[22-图解网页的各种距离](22-图解网页的各种距离)
- 下一篇：[24-组件实战-Message全局提示组件](24-组件实战-Message全局提示组件)
