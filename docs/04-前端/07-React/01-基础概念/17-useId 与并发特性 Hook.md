---
title: useId 与并发特性 Hook
description: "React 18 并发特性四件套实战:useId 的 SSR 安全 ID 生成、useTransition 标记非紧急更新、useDeferredValue 延迟响应、useSyncExternalStore 订阅外部数据源,以及四个 Hook 的选型对比。"
version: 1.0
author: 文档维护组
created: 2026-11-14
updated: 2026-11-14
status: 正式
category: React
---

# useId 与并发特性 Hook

React 18 引入并发渲染(Concurrent Rendering)后,官方新增了四个 Hook:`useId`、`useTransition`、`useDeferredValue`、`useSyncExternalStore`。它们解决的问题各不相同,但都围绕同一个主题——**让组件在可中断、可分片的渲染模型下正确工作**。

```jsx
// 四个 Hook 一览
const id = useId();                             // 生成 SSR 安全的唯一 ID
const [isPending, start] = useTransition();     // 把更新标记为非紧急
const deferred = useDeferredValue(value);       // 返回延迟响应的值
const snap = useSyncExternalStore(sub, getSnap);// 订阅 React 之外的 Store
```

## useId:生成 SSR 安全的唯一 ID

### 问题背景

服务端渲染下,常见需求是为表单控件生成 `id` 并用 `htmlFor` 关联:

```jsx
// ❌ 反例:模块级自增计数器
let counter = 0;

function Field({ label }) {
  const id = `field-${counter++}`; // 服务端与客户端各自计数,顺序一旦不一致就对不上
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} />
    </>
  );
}
```

服务端与客户端是两个独立的执行环境,自增计数器、`Math.random()`、`Date.now()` 产生的 ID **在两边不一致**,水合(Hydration)时 `htmlFor` 与 `id` 对不上,React 会警告属性不匹配。

### 正确用法

```jsx
import { useId } from 'react';

function Field({ label }) {
  const id = useId(); // 形如 ':r0:'
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} />
    </>
  );
}
```

`useId` 的返回值由 React 根据**组件在树中的位置**生成:服务端与客户端渲染同一棵树时会得到相同结果,因此水合安全。同一组件被复用多份,各自的 ID 也不会冲突。

::: tip useId 不是身份标识
`useId` 生成的 ID 保证唯一,但不保证稳定语义(形如 `:r1:` 且带冒号前缀)。不要把它当数据库主键、DOM 选择器(`document.querySelector(':r1:')` 会被当作伪类报错)或测试定位器使用,它只用于可访问性属性关联与 SSR 场景。
:::

### 一次调用派生多个 ID

```jsx
function EmailField() {
  const id = useId();
  return (
    <>
      <label htmlFor={`${id}-email`}>邮箱</label>
      <input id={`${id}-email`} type="email" />
      <p id={`${id}-hint`}>请输入有效邮箱</p>
      <input aria-describedby={`${id}-hint`} />
    </>
  );
}
```

用同一个 `id` 拼出多个派生 ID,比调用多次 `useId` 更省。

::: warning 不要用 useId 生成列表 key
列表渲染的 `key` 应来自数据本身(如 `item.id`)。`useId` 依赖组件树位置,列表项增删后位置变化,ID 随之变化,用它做 key 会破坏 diff 与复用。
:::

## useTransition:把更新标记为非紧急

React 18 把更新分成两类:**紧急更新**(输入、点击,需要即时反馈)与**非紧急更新**(列表过滤、图表重算,可以稍后完成)。`useTransition` 用于把后者让位给前者。

```jsx
import { useState, useTransition } from 'react';

function TabSwitcher() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();

  function select(next) {
    // 标记内的更新是低优先级,可被紧急更新打断
    startTransition(() => {
      setTab(next);
    });
  }

  return (
    <>
      <button onClick={() => select('report')}>查看报表</button>
      {isPending && <Spinner />}
      <ReportView tab={tab} />
    </>
  );
}
```

点击后输入与按钮反馈立即生效,昂贵的 `ReportView` 重渲染被调度到后台;期间 `isPending` 为 `true`,可以展示 loading 态,避免界面"卡住"的错觉。

::: warning startTransition 的三个约束
- 传入的函数必须是**同步**的;其中的 `await`、`setTimeout` 回调里执行的更新不会被标记。
- 它只能在事件处理函数或 Effect 中触发,不能在渲染期间调用。
- 更新被标记后是异步调度的,不要依赖它在同一帧内完成。
:::

## useDeferredValue:延迟响应的值

`useDeferredValue` 接收一个值,返回一个"滞后"的副本:紧急渲染先用旧值立刻完成,随后 React 在空闲时再用新值重新渲染。

```jsx
import { useState, useDeferredValue, useMemo } from 'react';

function SearchList({ query }) {
  const deferredQuery = useDeferredValue(query);
  const list = useMemo(
    () => bigData.filter((item) => item.includes(deferredQuery)),
    [deferredQuery]
  );
  const isStale = query !== deferredQuery;

  return (
    <div style={{ opacity: isStale ? 0.6 : 1 }}>
      <ResultList list={list} />
    </div>
  );
}
```

打字时输入本身是紧急更新、立即生效;昂贵的过滤列表用 `deferredQuery` 渲染,被安排到下一轮。配合 `isStale` 把列表临时调淡,即可获得"输入不卡、结果稍后到"的体验。

### 与防抖的区别

| 维度 | useDeferredValue | debounce |
| --- | --- | --- |
| 机制 | React 调度,空闲即渲染 | 固定延迟后才执行 |
| 中断 | 可被紧急更新打断重排 | 定时器触发后不可中断 |
| 依赖 | 零依赖,React 内置 | 手写或引入 lodash |
| 适用 | 渲染开销大 | 网络请求、埋点等非渲染副作用 |

::: tip useDeferredValue 与 useTransition 的分工
两者解决同一类问题,视角不同:**值从哪里来**。如果某个**值**更新太慢拖累输入,用 `useDeferredValue` 包住那个值;如果你在**事件处理函数**里想触发低优先级更新,用 `useTransition`。受控输入框的典型场景优先考虑 `useDeferredValue`。
:::

## useSyncExternalStore:订阅外部数据源

当状态存在于 React 之外(第三方 Store、浏览器 API、WebSocket),直接在渲染期间读取会发生撕裂(Tearing):并发渲染下不同组件可能读到不一致的快照。`useSyncExternalStore` 专门解决这一问题。

```jsx
// 1. 订阅:返回取消订阅的清理函数
const subscribe = (callback) => {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
};

// ❌ 每次调用返回新对象 → 无限重渲染
// const getSnapshot = () => ({ online: navigator.onLine });

// ✅ 返回缓存住的同一份快照
let cached = { online: navigator.onLine };
const getSnapshot = () => {
  if (cached.online !== navigator.onLine) {
    cached = { online: navigator.onLine };
  }
  return cached;
};

function useOnlineStatus() {
  // 第三个参数是服务端渲染用的快照
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}

function StatusBar() {
  const online = useOnlineStatus();
  return <span>{online ? '在线' : '离线'}</span>;
}
```

三个参数分别是:

1. `subscribe`:订阅函数,接收状态变化回调,返回取消订阅函数。
2. `getSnapshot`:返回当前状态的**不可变快照**,同一状态下必须返回相同引用。
3. `getServerSnapshot`(可选):服务端渲染期间使用的快照。

::: warning getSnapshot 必须返回稳定引用
`getSnapshot` 在每次渲染时都会被调用,React 靠**引用相等**判断状态是否变化。若每次返回新对象或新数组,组件会陷入无限重渲染。正确做法是维护缓存:内容没变就返回旧引用,变了才替换。
:::

## 四个 Hook 的选型

| 场景 | 选型 |
| --- | --- |
| 表单控件 id、可访问性关联、SSR 场景 | `useId` |
| 事件处理中触发昂贵的非紧急更新 | `useTransition` |
| 某个值(如受控输入)更新导致渲染过重 | `useDeferredValue` |
| 状态在 React 之外(浏览器 API、第三方 Store) | `useSyncExternalStore` |

共同点:四个 Hook 都是并发模型的配套 API。选型先问两个问题——**状态在 React 里还是外面?更新是紧急还是可以等待?** 在 React 里且能等待,用 `useTransition` / `useDeferredValue`;在 React 外面,一律走 `useSyncExternalStore`;而 `useId` 与优先级无关,只管 SSR 一致性。

## 小结

- `useId` 基于组件树位置生成 SSR 安全的唯一 ID,只做属性关联,不做业务标识与列表 key。
- `useTransition` 面向事件处理,把更新标记为非紧急,`isPending` 提供过渡反馈,回调必须同步。
- `useDeferredValue` 面向值,让昂贵渲染滞后于紧急更新,是防抖的调度版替代。
- `useSyncExternalStore` 是订阅外部 Store 的官方方案,`getSnapshot` 必须返回稳定引用。

## 延伸阅读

- [useId 官方文档](https://react.dev/reference/react/useId)
- [useSyncExternalStore 官方文档](https://react.dev/reference/react/useSyncExternalStore)
- [15-StrictMode 与双重渲染](15-StrictMode 与双重渲染) — 并发模式下组件双重执行与开发期检测
- [16-useMemo与useCallback在React19的取舍](16-useMemo与useCallback在React19的取舍) — 并发渲染下的记忆化策略
- [14-React 19 新特性概览](14-React 19 新特性概览) — 并发特性之后的下一代 API 全景
