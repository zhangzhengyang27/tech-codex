---
title: Zustand 状态管理
description: "Zustand 状态管理用法教程:create 创建 Store、selector 细粒度订阅与 useShallow 浅比较、set 更新与异步 action、persist/devtools 中间件、TypeScript 类型定义,以及与 Redux 的对比选型。"
version: 1.0
author: 文档维护组
created: 2026-11-14
updated: 2026-11-14
status: 正式
category: React
---

# Zustand 状态管理

Zustand 是 React 生态中最轻量的状态管理库:一个 `create` API 搞定 Store 的创建,不需要 Provider 包裹,天然支持 TypeScript,由 React 团队成员参与维护。本文是**用法教程**,聚焦如何在业务中正确使用;其内部实现原理不在本篇展开。

> 版本说明:本文基于 Zustand v5 写法(v4 起核心 API 一致),版本只关注大方向:`create` + Hook 式消费 + 中间件体系。

## 为什么是 Zustand

与 Redux 对比,Zustand 砍掉了 Action、Reducer、Dispatch 的固定链条,把"定义状态 + 定义修改函数"合并在一个对象里:

```bash
npm install zustand
```

核心心智模型只有一句话:**Store 是一个 Hook,状态在组件外,谁订阅谁更新**。

## 快速上手:create 创建 Store

```jsx
import { create } from 'zustand';

// 约定:Hook 名以 use 开头,如 useCounterStore
const useCounterStore = create((set) => ({
  // 1. 状态
  count: 0,
  // 2. 修改函数(即 action),内部调用 set
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

`set` 有两种用法:

```jsx
set((state) => ({ count: state.count + 1 })); // 函数式:基于旧状态计算,推荐
set({ count: 0 });                            // 对象式:直接覆盖对应字段(浅合并)
set((state) => ({ count: 0 }), true);         // 第二个参数 true:整体替换而非合并
```

::: tip set 是浅合并
对象式 `set` 只替换传入的字段,其余字段原样保留,类似 `Object.assign`。要"清空整个 Store"必须使用第二个参数 `true` 做整体替换,否则旧字段会残留。
:::

## 组件中消费:selector 细粒度订阅

```jsx
function Counter() {
  // ✅ 传入 selector,只订阅需要的字段
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);

  return (
    <>
      <p>{count}</p>
      <button onClick={increment}>+1</button>
    </>
  );
}
```

selector 是性能的关键:count 变化时,**只有 selector 返回值发生变化的组件会重渲染**。不加 selector 直接调用 `useCounterStore()` 会订阅整个 Store,任何字段变化都触发重渲染。

### 返回新对象必须配合 useShallow

```jsx
import { useShallow } from 'zustand/react/shallow';

// ❌ selector 每次返回新对象,引用不同 → 无限重渲染告警
// const { count, increment } = useCounterStore((s) => ({ count: s.count, increment: s.increment }));

// ✅ useShallow 对返回值做浅比较,内容没变就不触发更新
const { count, increment } = useCounterStore(
  useShallow((s) => ({ count: s.count, increment: s.increment }))
);

// 多个字段也可以分别订阅
const count = useCounterStore((s) => s.count);
const increment = useCounterStore((s) => s.increment);
```

::: warning selector 返回引用类型时警惕无限循环
Zustand 用 `Object.is` 比较 selector 的返回值。返回**新对象、新数组、新 Map/Set** 时引用必然不同,每次 Store 变化都会引发重渲染。要么拆成多个基础类型 selector,要么用 `useShallow` 浅比较,要么把派生数据放到组件内用 `useMemo` 计算。
:::

## 组件外读写 Store

```jsx
// 组件外直接调用,拿到当前状态(适合日志、路由守卫等非响应式场景)
const current = useCounterStore.getState();

// 组件外直接修改
useCounterStore.setState({ count: 100 });

// 订阅变化(返回取消订阅函数)
const unsub = useCounterStore.subscribe((state, prev) => {
  console.log('count:', prev.count, '->', state.count);
});
```

## 异步 Action

Zustand 的 action 天然支持异步,`set` 可以在任何时机调用,不需要中间件:

```jsx
const useUserStore = create((set) => ({
  user: null,
  loading: false,
  fetchUser: async (id) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/users/${id}`);
      const user = await res.json();
      set({ user, loading: false });
    } catch (e) {
      set({ loading: false, error: e.message });
    }
  },
}));
```

## 中间件:persist 持久化

`persist` 把状态同步到 `localStorage`(或自定义存储),刷新后自动恢复:

```jsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'light',
      fontSize: 14,
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'app-settings',       // localStorage 的 key,必填
      partialize: (state) => ({   // 只持久化部分字段(如 loading 不落盘)
        theme: state.theme,
        fontSize: state.fontSize,
      }),
      version: 1,                 // 版本号,结构变更时迁移
      migrate: (persisted, version) => {
        if (version === 0) {
          return { ...persisted, fontSize: persisted.fontSize ?? 14 };
        }
        return persisted;
      },
    }
  )
);
```

::: warning 持久化的是快照不是响应
`persist` 只在初始化时从存储恢复一次快照,之后存储内容不会随内存状态实时同步给其他标签页。跨标签页同步需要自行监听 `storage` 事件,或使用 `subscribeWithSelector` 等中间件组合实现。
:::

## 中间件:devtools 调试

`devtools` 把每次 `set` 上报到 Redux DevTools 扩展,可看到时间线并回溯:

```jsx
import { devtools } from 'zustand/middleware';

const useCounterStore = create(
  devtools(
    (set) => ({
      count: 0,
      increment: () =>
        set(
          (state) => ({ count: state.count + 1 }),
          false,
          'counter/increment' // action 名,DevTools 时间线上显示
        ),
    }),
    { name: 'CounterStore' } // DevTools 中的 Store 名称
  )
);
```

## 组合多个中间件

中间件从右向左包裹,`devtools` 通常放最外层:

```jsx
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const useStore = create(
  devtools(
    persist(
      (set) => ({
        theme: 'light',
        setTheme: (theme) => set({ theme }),
      }),
      { name: 'app-store' }
    ),
    { name: 'AppStore' }
  )
);
```

## TypeScript 用法

Zustand 的类型定义推荐用**柯里化写法**,先声明状态接口,再传入 `create`:

```tsx
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  reset: () => void;
}

// 注意:create<CounterState>()( ... ) 的两组括号,中间件场景下必须这样写
const useCounterStore = create<CounterState>()((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 }),
}));

// 组件中消费时无需再标注类型
const count = useCounterStore((s) => s.count);
```

带中间件与异步 action 的完整类型示例:

```tsx
interface UserState {
  user: { id: string; name: string } | null;
  loading: boolean;
  fetchUser: (id: string) => Promise<void>;
}

const useUserStore = create<UserState>()(
  devtools((set) => ({
    user: null,
    loading: false,
    fetchUser: async (id) => {
      set({ loading: true });
      const user = await fetchUserApi(id); // 返回类型与 user 字段对齐
      set({ user, loading: false });
    },
  }))
);
```

::: tip 柯里化括号不能省
`create<CounterState>()(...)` 中间那组 `()` 不是笔误:它是 TS 4+ 柯里化泛型的写法,让中间件(persist/devtools)在推断时保留完整状态类型。写成 `create<CounterState>(...)` 在配合中间件时会丢失类型推断甚至报错。
:::

## 与 Redux 的对比

| 维度 | Zustand | Redux(RTK) |
| --- | --- | --- |
| 心智模型 | Hook 即 Store,直接 set | 单向数据流:action → reducer → store |
| Provider | 不需要 | 需要 Provider 包裹 |
| 样板代码 | 极少,一个 create | 较少(RTK 已简化)但仍需 slice/action |
| 异步 | action 内直接 async/await | 需要 createAsyncThunk / RTK Query |
| 中间件 | persist/devtools 等内置封装 | 生态成熟,saga/thunk 等 |
| 调试 | Redux DevTools(devtools 中间件) | Redux DevTools 原生支持 |
| 适合场景 | 中小规模、组件外状态、快速迭代 | 大型团队、强约定、复杂副作用编排 |

选型建议:中小型应用或"服务端数据的本地缓存"之外的全局状态(主题、登录态、UI 开关),Zustand 几乎总是更省事;需要严格的时间旅行、复杂副作用调度或团队已有 Redux 资产时,继续用 RTK。两者的状态切片思想可以互相迁移。

## 小结

- `create` 一把梭:状态与修改函数写在同一个对象里,`set` 默认浅合并。
- 消费时必传 selector,只订阅所需字段;返回新对象要配 `useShallow`。
- 异步 action 无需中间件,`set` 在 `await` 任意时机调用即可。
- `persist` 落盘快照、`devtools` 接入调试面板,多个中间件可组合,devtools 放最外层。
- TS 用柯里化 `create<State>()(...)` 保住完整类型推断。

## 延伸阅读

- [Zustand 官方文档](https://zustand.docs.pmnd.rs/)
- [01-React-Redux](01-React-Redux) — 理解 Redux 的 action/reducer 链路,再看 Zustand 会更通透
- [02-React-Mobx](02-React-Mobx) — 另一种响应式状态管理思路,与 Zustand 的不可变风格互为参照
- [03-实现mini-Router](03-实现mini-Router) — 组件外维护状态 + Hook 消费的同类设计
- [07-Context](../01-基础概念/07-Context) — 不引入第三方库时的状态共享方案及其局限
