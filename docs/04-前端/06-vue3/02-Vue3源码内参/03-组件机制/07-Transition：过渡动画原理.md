---
title: Transition：过渡动画原理
description: "Vue3 源码解析：Transition 过渡动画的实现原理。"
order: 5
group: 组件机制
category: Vue
tags: [Vue3, 源码, 组件系统, 过渡动画]
keywords:
  - Vue3
  - Transition
  - 过渡
  - 动画
---
# Transition：过渡动画原理

## 概念说明

页面过渡动画通常可以用 CSS 脚本实现，某些场景也会用 JavaScript 操作 DOM 实现。Vue.js 技术栈提供了内置的 Transition 组件，用于轻松实现动画过渡效果。

> 若不熟悉 Transition 组件的使用，建议先阅读[官网文档](https://vuejs.org/guide/built-ins/transition.html)。

Transition 组件通常有三类用法：CSS 过渡、CSS 动画和 JavaScript 钩子。下面分别用示例说明。

### 用法一：CSS 过渡

```html
<template>
  <div class="app">
    <button @click="show = !show">
      Toggle render
    </button>
    <transition name="fade">
      <p v-if="show">hello</p>
    </transition>
  </div>
</template>
<script>
  export default {
    data() {
      return {
        show: true
      }
    }
  }
</script>
<style>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.5s ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
```

CSS 过渡主要定义过渡相关的 CSS 样式。点击按钮切换文本显隐时，框架会按时机应用这些 CSS 样式，实现过渡效果。

### 用法二：CSS 动画

```html
<template>
  <div class="app">
    <button @click="show = !show">Toggle show</button>
    <transition name="bounce">
      <p v-if="show">Vue is an awesome front-end MVVM framework. We can use it to build multiple apps.</p>
    </transition>
  </div>
</template>
<script>
  export default {
    data() {
      return {
        show: true
      }
    }
  }
</script>
<style>
  .bounce-enter-active {
    animation: bounce-in 0.5s;
  }
  .bounce-leave-active {
    animation: bounce-in 0.5s reverse;
  }
  @keyframes bounce-in {
    0% {
      transform: scale(0);
    }
    50% {
      transform: scale(1.5);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
```

CSS 动画与 CSS 过渡类似，定义的是动画相关的 CSS 样式（`@keyframes`），点击按钮切换显隐时按时机应用，实现动画效果。

### 用法三：JavaScript 钩子

```html
<template>
  <div class="app">
    <button @click="show = !show">
      Toggle render
    </button>
    <transition
      @before-enter="beforeEnter"
      @enter="enter"
      @before-leave="beforeLeave"
      @leave="leave"
      css="false"
    >
      <p v-if="show">hello</p>
    </transition>
  </div>
</template>
<script>
  export default {
    data() {
      return {
        show: true
      }
    },
    methods: {
      beforeEnter(el) {
        el.style.opacity = 0
        el.style.transition = 'opacity 0.5s ease'
      },
      enter(el) {
        this.$el.offsetHeight
        el.style.opacity = 1
      },
      beforeLeave(el) {
        el.style.opacity = 1
      },
      leave(el) {
        el.style.transition = 'opacity 0.5s ease'
        el.style.opacity = 0
      }
    }
  }
</script>
```

Transition 组件允许在过渡组件上定义过渡生命周期的 JavaScript 钩子函数，在这些钩子函数中编写 JavaScript 操作 DOM，即可实现过渡动画效果。

## Transition 组件的核心思想

三个示例的共同点：点击按钮时通过修改 v-if 的条件值触发过渡动画。

Transition 组件过渡动画的触发条件有以下四点：

- 条件渲染 (使用 v-if)；

- 条件展示 (使用 v-show)；

- 动态组件；

- 组件根节点。

Transition 组件只能用于上述四种情况。进入/离开过渡时有 6 个 class 切换：

1. **v-enter-from**：定义进入过渡的开始状态。在元素被插入之前生效，在元素被插入之后的下一帧移除。

2. **v-enter-active**：定义进入过渡生效时的状态。在整个进入过渡的阶段中应用，在元素被插入之前生效，在过渡动画完成之后移除。这个类可以被用来定义进入过渡的过程时间，延迟和曲线函数。

3. **v-enter-to**：定义进入过渡的结束状态。在元素被插入之后下一帧生效 (与此同时 v-enter-from 被移除)，在过渡动画完成之后移除。

4. **v-leave-from**：定义离开过渡的开始状态。在离开过渡被触发时立刻生效，下一帧被移除。

5. **v-leave-active**：定义离开过渡生效时的状态。在整个离开过渡的阶段中应用，在离开过渡被触发时立刻生效，在过渡动画完成之后移除。这个类可以被用来定义离开过渡的过程时间，延迟和曲线函数。

6. **v-leave-to**：定义离开过渡的结束状态。在离开过渡被触发之后下一帧生效 (与此同时 v-leave-from 被删除)，在过渡动画完成之后移除。

![transitions.png](/vue3-src-images/i/image/M00/55/F3/CgqCHl9q7XSAZVLbAAIHrhK4PT8658.png)

以 `v-leave`（离开过渡）为例，各 class 的生命周期状态图如下：

```mermaid
stateDiagram-v2
    [*] --> v_leave_from: 离开过渡触发
    v_leave_from --> v_leave_active: 下一帧 (v-leave-from 被移除)
    v_leave_active --> v_leave_to: 同一帧生效
    v_leave_to --> [*]: 过渡动画完成后 (v-leave-active / v-leave-to 移除)
```

> 进入过渡（v-enter）的状态机结构相同：`v-enter-from → v-enter-active → v-enter-to`，中间通过下一帧切换。

Transition 组件的核心思想可以概括为：**Transition 包裹的元素插入删除时，在适当的时机插入这些 CSS 样式**，而这些 CSS 的实现决定了元素的过渡动画。

## Transition 组件的实现原理

结合示例分析实现原理：

```html
<template>
  <div class="app">
    <button @click="show = !show">
      Toggle render
    </button>
    <transition name="fade">
      <p v-if="show">hello</p>
    </transition>
  </div>
</template>
```

### 组件的渲染

先看模板编译后生成的 render 函数：

```js
import { createVNode as _createVNode, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, Transition as _Transition, withCtx as _withCtx } from "vue"
export function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createBlock("div", { class: "app" }, [
    _createVNode("button", {
      onClick: $event => (_ctx.show = !_ctx.show)
    }, " Toggle render ", 8 /* PROPS */, ["onClick"]),
    _createVNode(_Transition, { name: "fade" }, {
      default: _withCtx(() => [
        (_ctx.show)
          ? (_openBlock(), _createBlock("p", { key: 0 }, "hello"))
          : _createCommentVNode("v-if", true)
      ]),
      _: 1
    })
  ]))
}
```

对于 Transition 组件部分，生成的 render 函数主要创建了 Transition 组件 vnode，并且有一个默认插槽。

Transition 组件的定义如下：

```js
const Transition = (props, { slots }) => h(BaseTransition, resolveTransitionProps(props), slots)
const BaseTransition = {
  name: `BaseTransition`,
  props: {
    mode: String,
    appear: Boolean,
    persisted: Boolean,
    // enter
    onBeforeEnter: TransitionHookValidator,
    onEnter: TransitionHookValidator,
    onAfterEnter: TransitionHookValidator,
    onEnterCancelled: TransitionHookValidator,
    // leave
    onBeforeLeave: TransitionHookValidator,
    onLeave: TransitionHookValidator,
    onAfterLeave: TransitionHookValidator,
    onLeaveCancelled: TransitionHookValidator,
    // appear
    onBeforeAppear: TransitionHookValidator,
    onAppear: TransitionHookValidator,
    onAfterAppear: TransitionHookValidator,
    onAppearCancelled: TransitionHookValidator
  },
  setup(props, { slots }) {
    const instance = getCurrentInstance()
    const state = useTransitionState()
    let prevTransitionKey
    return () => {
      const children = slots.default && getTransitionRawChildren(slots.default(), true)
      if (!children || !children.length) {
        return
      }
      // Transition 组件只允许一个子元素节点，多个报警告，提示使用 TransitionGroup 组件
      if ((process.env.NODE_ENV !== 'production') && children.length > 1) {
        warn('<transition> can only be used on a single element or component. Use ' +
          '<transition-group> for lists.')
      }
      // 不需要追踪响应式，所以改成原始值，提升性能
      const rawProps = toRaw(props)
      const { mode } = rawProps
      // 检查 mode 是否合法
      if ((process.env.NODE_ENV !== 'production') && mode && !['in-out', 'out-in', 'default'].includes(mode)) {
        warn(`invalid <transition> mode: ${mode}`)
      }
      // 获取第一个子元素节点
      const child = children[0]
      if (state.isLeaving) {
        return emptyPlaceholder(child)
      }
      // 处理 <transition><keep-alive/></transition> 的情况
      const innerChild = getKeepAliveChild(child)
      if (!innerChild) {
        return emptyPlaceholder(child)
      }
      const enterHooks = resolveTransitionHooks(innerChild, rawProps, state, instance)
        setTransitionHooks(innerChild, enterHooks)
      const oldChild = instance.subTree
      const oldInnerChild = oldChild && getKeepAliveChild(oldChild)
      let transitionKeyChanged = false
      const { getTransitionKey } = innerChild.type
      if (getTransitionKey) {
        const key = getTransitionKey()
        if (prevTransitionKey === undefined) {
          prevTransitionKey = key
        }
        else if (key !== prevTransitionKey) {
          prevTransitionKey = key
          transitionKeyChanged = true
        }
      }
      if (oldInnerChild &&
        oldInnerChild.type !== Comment &&
        (!isSameVNodeType(innerChild, oldInnerChild) || transitionKeyChanged)) {
        const leavingHooks = resolveTransitionHooks(oldInnerChild, rawProps, state, instance)
        // 更新旧树的钩子函数
        setTransitionHooks(oldInnerChild, leavingHooks)
        // 在两个视图之间切换
        if (mode === 'out-in') {
          state.isLeaving = true
          // 返回空的占位符节点，当离开过渡结束后，重新渲染组件
          leavingHooks.afterLeave = () => {
            state.isLeaving = false
            instance.update()
          }
          return emptyPlaceholder(child)
        }
        else if (mode === 'in-out') {
          leavingHooks.delayLeave = (el, earlyRemove, delayedLeave) => {
            const leavingVNodesCache = getLeavingNodesForType(state, oldInnerChild)
            leavingVNodesCache[String(oldInnerChild.key)] = oldInnerChild
            // early removal callback
            el._leaveCb = () => {
              earlyRemove()
              el._leaveCb = undefined
              delete enterHooks.delayedLeave
            }
            enterHooks.delayedLeave = delayedLeave
          }
        }
      }
      return child
    }
  }
}
```

Transition 组件是在 BaseTransition 基础上封装的高阶函数式组件。其实现可分为组件的渲染、钩子函数的执行、模式的应用三个部分。

组件渲染部分的要点：

- Transition 组件与 KeepAlive 组件一样，是抽象组件：组件本身不渲染任何实体节点，只渲染第一个子元素节点。

> 注意，Transition 组件内部只能嵌套一个子元素节点，如果有多个节点需要用 TransitionGroup 组件。

- 如果 Transition 组件内部嵌套的是 KeepAlive 组件，它会继续查找 KeepAlive 组件嵌套的第一个子元素节点，作为渲染的元素节点。
- 如果 Transition 组件内部没有嵌套任何子节点，它会渲染空的注释节点。
- 渲染过程中，Transition 组件通过 resolveTransitionHooks 定义组件创建和删除阶段的钩子函数对象，再通过 setTransitionHooks 函数把该钩子函数对象设置到 vnode.transition 上。
- 渲染过程还会判断是否为更新渲染：更新渲染时针对不同模式执行不同的处理逻辑（详见"模式的应用"部分）。

核心结论：**Transition 渲染的是组件嵌套的第一个子元素节点**。

### 钩子函数的执行

Transition 在节点的创建和删除过程中设置过渡动画相关 CSS，全部通过钩子函数完成。setTransitionHooks 定义的钩子函数对象如下：

```js
function resolveTransitionHooks(vnode, props, state, instance) {
  const { appear, mode, persisted = false, onBeforeEnter, onEnter, onAfterEnter, onEnterCancelled, onBeforeLeave, onLeave, onAfterLeave, onLeaveCancelled, onBeforeAppear, onAppear, onAfterAppear, onAppearCancelled } = props
  const key = String(vnode.key)
  const leavingVNodesCache = getLeavingNodesForType(state, vnode)
  const callHook = (hook, args) => {
    hook &&
    callWithAsyncErrorHandling(hook, instance, 9 /* TRANSITION_HOOK */, args)
  }
  const hooks = {
    mode,
    persisted,
    beforeEnter(el) {
      let hook = onBeforeEnter
      if (!state.isMounted) {
        if (appear) {
          hook = onBeforeAppear || onBeforeEnter
        }
        else {
          return
        }
      }
      if (el._leaveCb) {
        el._leaveCb(true /* cancelled */)
      }
      const leavingVNode = leavingVNodesCache[key]
      if (leavingVNode &&
        isSameVNodeType(vnode, leavingVNode) &&
        leavingVNode.el._leaveCb) {
        leavingVNode.el._leaveCb()
      }
      callHook(hook, [el])
    },
    enter(el) {
      let hook = onEnter
      let afterHook = onAfterEnter
      let cancelHook = onEnterCancelled
      if (!state.isMounted) {
        if (appear) {
          hook = onAppear || onEnter
          afterHook = onAfterAppear || onAfterEnter
          cancelHook = onAppearCancelled || onEnterCancelled
        }
        else {
          return
        }
      }
      let called = false
      const done = (el._enterCb = (cancelled) => {
        if (called)
          return
        called = true
        if (cancelled) {
          callHook(cancelHook, [el])
        }
        else {
          callHook(afterHook, [el])
        }
        if (hooks.delayedLeave) {
          hooks.delayedLeave()
        }
        el._enterCb = undefined
      })
      if (hook) {
        hook(el, done)
        if (hook.length <= 1) {
          done()
        }
      }
      else {
        done()
      }
    },
    leave(el, remove) {
      const key = String(vnode.key)
      if (el._enterCb) {
        el._enterCb(true /* cancelled */)
      }
      if (state.isUnmounting) {
        return remove()
      }
      callHook(onBeforeLeave, [el])
      let called = false
      const done = (el._leaveCb = (cancelled) => {
        if (called)
          return
        called = true
        remove()
        if (cancelled) {
          callHook(onLeaveCancelled, [el])
        }
        else {
          callHook(onAfterLeave, [el])
        }
        el._leaveCb = undefined
        if (leavingVNodesCache[key] === vnode) {
          delete leavingVNodesCache[key]
        }
      })
      leavingVNodesCache[key] = vnode
      if (onLeave) {
        onLeave(el, done)
        if (onLeave.length <= 1) {
          done()
        }
      }
      else {
        done()
      }
    },
    clone(vnode) {
      return resolveTransitionHooks(vnode, props, state, instance)
    }
  }
  return hooks
}
```

钩子函数对象定义了 4 个钩子函数：beforeEnter、enter、leave 和 clone。其中 beforeEnter、enter 和 leave 发生在元素的插入和删除阶段，下面分析这几个钩子函数的执行过程。

#### beforeEnter 的执行

在 patch 阶段的 mountElement 函数中，插入元素节点前且存在过渡的条件下会执行 vnode.transition 中的 beforeEnter 函数：

```js
beforeEnter(el) {
  let hook = onBeforeEnter
  if (!state.isMounted) {
    if (appear) {
      hook = onBeforeAppear || onBeforeEnter
    }
    else {
      return
    }
  }
  if (el._leaveCb) {
    el._leaveCb(true /* cancelled */)
  }
  const leavingVNode = leavingVNodesCache[key]
  if (leavingVNode &&
    isSameVNodeType(vnode, leavingVNode) &&
    leavingVNode.el._leaveCb) {
    leavingVNode.el._leaveCb()
  }
  callHook(hook, [el])
}
```

beforeEnter 钩子函数主要根据 appear 的值和 DOM 是否挂载，决定执行 onBeforeEnter 函数或 onBeforeAppear 函数。

appear、onBeforeEnter、onBeforeAppear 这些变量都来自 props。props 的初始化回到 Transition 组件的定义：

```js
const Transition = (props, { slots }) => h(BaseTransition, resolveTransitionProps(props), slots)
```

传递的 props 经过了 resolveTransitionProps 函数的封装：

```js
function resolveTransitionProps(rawProps) {
  let { name = 'v', type, css = true, duration, enterFromClass = `${name}-enter-from`, enterActiveClass = `${name}-enter-active`, enterToClass = `${name}-enter-to`, appearFromClass = enterFromClass, appearActiveClass = enterActiveClass, appearToClass = enterToClass, leaveFromClass = `${name}-leave-from`, leaveActiveClass = `${name}-leave-active`, leaveToClass = `${name}-leave-to` } = rawProps
  const baseProps = {}
  for (const key in rawProps) {
    if (!(key in DOMTransitionPropsValidators)) {
      baseProps[key] = rawProps[key]
    }
  }
  if (!css) {
    return baseProps
  }
  const durations = normalizeDuration(duration)
  const enterDuration = durations && durations[0]
  const leaveDuration = durations && durations[1]
  const { onBeforeEnter, onEnter, onEnterCancelled, onLeave, onLeaveCancelled, onBeforeAppear = onBeforeEnter, onAppear = onEnter, onAppearCancelled = onEnterCancelled } = baseProps
  const finishEnter = (el, isAppear, done) => {
    removeTransitionClass(el, isAppear ? appearToClass : enterToClass)
    removeTransitionClass(el, isAppear ? appearActiveClass : enterActiveClass)
    done && done()
  }
  const finishLeave = (el, done) => {
    removeTransitionClass(el, leaveToClass)
    removeTransitionClass(el, leaveActiveClass)
    done && done()
  }
  const makeEnterHook = (isAppear) => {
    return (el, done) => {
      const hook = isAppear ? onAppear : onEnter
      const resolve = () => finishEnter(el, isAppear, done)
      hook && hook(el, resolve)
      nextFrame(() => {
        removeTransitionClass(el, isAppear ? appearFromClass : enterFromClass)
        addTransitionClass(el, isAppear ? appearToClass : enterToClass)
        if (!(hook && hook.length > 1)) {
          if (enterDuration) {
            setTimeout(resolve, enterDuration)
          }
          else {
            whenTransitionEnds(el, type, resolve)
          }
        }
      })
    }
  }
  return extend(baseProps, {
    onBeforeEnter(el) {
      onBeforeEnter && onBeforeEnter(el)
      addTransitionClass(el, enterActiveClass)
      addTransitionClass(el, enterFromClass)
    },
    onBeforeAppear(el) {
      onBeforeAppear && onBeforeAppear(el)
      addTransitionClass(el, appearActiveClass)
      addTransitionClass(el, appearFromClass)
    },
    onEnter: makeEnterHook(false),
    onAppear: makeEnterHook(true),
    onLeave(el, done) {
      const resolve = () => finishLeave(el, done)
      addTransitionClass(el, leaveActiveClass)
      addTransitionClass(el, leaveFromClass)
      nextFrame(() => {
        removeTransitionClass(el, leaveFromClass)
        addTransitionClass(el, leaveToClass)
        if (!(onLeave && onLeave.length > 1)) {
          if (leaveDuration) {
            setTimeout(resolve, leaveDuration)
          }
          else {
            whenTransitionEnds(el, type, resolve)
          }
        }
      })
      onLeave && onLeave(el, resolve)
    },
    onEnterCancelled(el) {
      finishEnter(el, false)
      onEnterCancelled && onEnterCancelled(el)
    },
    onAppearCancelled(el) {
      finishEnter(el, true)
      onAppearCancelled && onAppearCancelled(el)
    },
    onLeaveCancelled(el) {
      finishLeave(el)
      onLeaveCancelled && onLeaveCancelled(el)
    }
  })
}
```

resolveTransitionProps 函数的作用是在给 Transition 传递的 Props 基础上做一层封装，返回一个新的 Props 对象。该函数包含所有 Props 的处理，可按需分析。

onBeforeEnter 函数的内部逻辑：执行基础 props 传入的 onBeforeEnter 钩子函数，并给 DOM 元素 el 添加 enterActiveClass 和 enterFromClass 样式。

其中，props 传入的 onBeforeEnter 函数就是使用 Transition 组件时添加的 beforeEnter 钩子函数。enterActiveClass 默认值是 v-enter-active，enterFromClass 默认值是 v-enter-from；如果给 Transition 组件传入了 name 的 prop（比如 fade），则 enterActiveClass 的值是 fade-enter-active，enterFromClass 的值是 fade-enter-from。

这就是 DOM 元素对象在创建后、插入到页面前做的事情：**执行 beforeEnter 钩子函数，以及给元素添加相应的 CSS 样式**。

onBeforeAppear 与 onBeforeEnter 逻辑类似，区别在于它在给 Transition 组件传入 appear 的 Prop 且首次挂载时执行。

#### enter 的执行

执行完 beforeEnter 钩子函数后，元素被插入页面，然后会执行 vnode.transition 中的 enter 钩子函数：

```js
enter(el) {
  let hook = onEnter
  let afterHook = onAfterEnter
  let cancelHook = onEnterCancelled
  if (!state.isMounted) {
    if (appear) {
      hook = onAppear || onEnter
      afterHook = onAfterAppear || onAfterEnter
      cancelHook = onAppearCancelled || onEnterCancelled
    }
    else {
      return
    }
  }
  let called = false
  const done = (el._enterCb = (cancelled) => {
    if (called)
      return
    called = true
    if (cancelled) {
      callHook(cancelHook, [el])
    }
    else {
      callHook(afterHook, [el])
    }
    if (hooks.delayedLeave) {
      hooks.delayedLeave()
    }
    el._enterCb = undefined
  })
  if (hook) {
    hook(el, done)
    if (hook.length <= 1) {
      done()
    }
  }
  else {
    done()
  }
}
```

enter 钩子函数主要根据 appear 的值和 DOM 是否挂载，执行 onEnter 函数或 onAppear 函数。函数的第二个参数是一个 done 函数，表示过渡动画完成后执行的回调函数，它是异步执行的。

> 注意，当 onEnter 或者 onAppear 函数的参数长度小于等于 1 的时候，done 函数在执行完 hook 函数后同步执行。

done 函数内部会执行 onAfterEnter 函数或 onEnterCancelled 函数。

onEnter、onAppear、onAfterEnter 和 onEnterCancelled 函数同样从 Props 传入。重点看 onEnter 的实现——它是 makeEnterHook(false) 函数执行后的返回值：

```js
const makeEnterHook = (isAppear) => {
  return (el, done) => {
    const hook = isAppear ? onAppear : onEnter
    const resolve = () => finishEnter(el, isAppear, done)
    hook && hook(el, resolve)
    nextFrame(() => {
      removeTransitionClass(el, isAppear ? appearFromClass : enterFromClass)
      addTransitionClass(el, isAppear ? appearToClass : enterToClass)
      if (!(hook && hook.length > 1)) {
        if (enterDuration) {
          setTimeout(resolve, enterDuration)
        }
        else {
          whenTransitionEnds(el, type, resolve)
        }
      }
    })
  }
}
```

函数内部首先执行基础 props 传入的 onEnter 钩子函数，然后在下一帧给 DOM 元素 el 移除 enterFromClass，同时添加 enterToClass 样式。

其中，props 传入的 onEnter 函数就是使用 Transition 组件时添加的 enter 钩子函数；enterFromClass 在 beforeEnter 阶段添加、在当前阶段移除；新增的 enterToClass 默认值是 v-enter-to，传入 name 的 prop（如 fade）后为 fade-enter-to。

添加 enterToClass 后，浏览器开始根据编写的 CSS 进入过渡动画。动画结束的判定方式：Transition 组件允许传入 enterDuration 这个 prop 指定进入过渡的动画时长；不指定时，Vue.js 内部监听动画结束事件，在动画结束后执行 finishEnter 函数：

```js
const finishEnter = (el, isAppear, done) => {
  removeTransitionClass(el, isAppear ? appearToClass : enterToClass)
  removeTransitionClass(el, isAppear ? appearActiveClass : enterActiveClass)
  done && done()
}
```

finishEnter 给 DOM 元素移除 enterToClass 以及 enterActiveClass，同时执行 done 函数，进而执行 onAfterEnter 钩子函数。

#### leave 的执行

当元素被删除时，会执行 remove 方法；在真正从 DOM 移除元素前且存在过渡的情况下，会执行 vnode.transition 中的 leave 钩子函数，并把移动 DOM 的方法作为第二个参数传入：

```js
leave(el, remove) {
  const key = String(vnode.key)
  if (el._enterCb) {
    el._enterCb(true /* cancelled */)
  }
  if (state.isUnmounting) {
    return remove()
  }
  callHook(onBeforeLeave, [el])
  let called = false
  const done = (el._leaveCb = (cancelled) => {
    if (called)
      return
    called = true
    remove()
    if (cancelled) {
      callHook(onLeaveCancelled, [el])
    }
    else {
      callHook(onAfterLeave, [el])
    }
    el._leaveCb = undefined
    if (leavingVNodesCache[key] === vnode) {
      delete leavingVNodesCache[key]
    }
  })
  leavingVNodesCache[key] = vnode
  if (onLeave) {
    onLeave(el, done)
    if (onLeave.length <= 1) {
      done()
    }
  }
  else {
    done()
  }
}
```

leave 钩子函数主要执行 props 传入的 onBeforeLeave 钩子函数和 onLeave 函数。onLeave 函数的第二个参数是 done 函数，表示离开过渡动画结束后执行的回调函数。

done 函数内部主要执行 remove 方法移除 DOM，然后执行 onAfterLeave 钩子函数或 onLeaveCancelled 函数。

onLeave 函数的实现如下：

```js
onLeave(el, done) {
  const resolve = () => finishLeave(el, done)
  addTransitionClass(el, leaveActiveClass)
  addTransitionClass(el, leaveFromClass)
  nextFrame(() => {
    removeTransitionClass(el, leaveFromClass)
    addTransitionClass(el, leaveToClass)
    if (!(onLeave && onLeave.length > 1)) {
      if (leaveDuration) {
        setTimeout(resolve, leaveDuration)
      }
      else {
        whenTransitionEnds(el, type, resolve)
      }
    }
  })
  onLeave && onLeave(el, resolve)
}
```

onLeave 函数首先给 DOM 元素添加 leaveActiveClass 和 leaveFromClass，并执行基础 props 传入的 onLeave 钩子函数；然后在下一帧移除 leaveFromClass，并添加 leaveToClass。

其中，leaveActiveClass 的默认值是 v-leave-active，leaveFromClass 的默认值是 v-leave-from，leaveToClass 的默认值是 v-leave-to。传入 name 的 prop（如 fade）后，三个值分别是 fade-leave-active、fade-leave-from、fade-leave-to。

添加 leaveToClass 后，浏览器开始根据编写的 CSS 执行离开过渡动画。动画结束的判定方式与进入动画类似：可传入 leaveDuration prop 指定过渡的动画时长；不指定时，Vue.js 内部监听动画结束事件，动画结束后执行 resolve 函数（执行 finishLeave 函数的返回值）：

```js
const finishLeave = (el, done) => {
  removeTransitionClass(el, leaveToClass)
  removeTransitionClass(el, leaveActiveClass)
  done && done()
}
```

finishLeave 给 DOM 元素移除 leaveToClass 以及 leaveActiveClass，同时执行 done 函数，进而执行 onAfterLeave 钩子函数。

至此，元素离开的过渡动画逻辑分析完毕。离开过渡与进入过渡思路一致：本质上都是在添加和移除一些 CSS 去执行动画，并在过程中执行传入的钩子函数。

### 模式的应用

Transition 渲染过程中提到过模式的应用。模式通过示例说明，把前面的例子稍加修改：

```html
<template>
  <div class="app">
    <button @click="show = !show">
      Toggle render
    </button>
    <transition name="fade">
      <p v-if="show">hello</p>
      <p v-else>hi</p>
    </transition>
  </div>
</template>
<script>
  export default {
    data() {
      return {
        show: true
      }
    }
  }
</script>
<style>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.5s ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
```

show 条件为 false 时显示字符串 hi。运行这个示例会发现过渡效果有些生硬，并不理想。

给 Transition 组件加一个 out-in 的 mode：

```html
<transition mode="out-in" name="fade">
  <p v-if="show">hello</p>
  <p v-else>hi</p>
</transition>
```

过渡效果明显改善：hello 文本先完成离开的过渡，之后 hi 文本才开始进入过渡动画。

模式适合两个元素切换的场景。Vue.js 给 Transition 组件提供了两种模式：in-out 和 out-in：

- 在 in-out 模式下，新元素先进行过渡，完成之后当前元素过渡离开。

- 在 out-in 模式下，当前元素先进行过渡，完成之后新元素过渡进入。

实际开发中大部分场景使用 out-in 模式，in-out 模式较少使用，因此下面分析 out-in 模式的实现原理。

先解释不加模式时过渡效果生硬的原因：点击按钮后 show 由 true 变成 false，当前元素 hello 的离开动画和新元素 hi 的进入动画同时触发。由于两个动画同时进行，且在离开动画结束之前 hello 元素未从 DOM 移除、仍然占位，新元素 hi 被挤到下面；hello 的离开动画执行完毕从 DOM 删除后，hi 才能回到原位置。

要让当前元素过渡动画执行完毕后再执行新元素的过渡，需要看 out-in 模式的实现：

```js
const leavingHooks = resolveTransitionHooks(oldInnerChild, rawProps, state, instance)
setTransitionHooks(oldInnerChild, leavingHooks)
if (mode === 'out-in') {
  state.isLeaving = true
  leavingHooks.afterLeave = () => {
    state.isLeaving = false
    instance.update()
  }
  return emptyPlaceholder(child)
}
```

当模式为 out-in 时：标记 state.isLeaving 为 true，返回一个空的注释节点，同时更新当前元素钩子函数中的 afterLeave 函数，其内部执行 instance.update 重新渲染组件。

这样的效果：当前元素执行离开过渡期间，新元素只渲染成一个注释节点，页面上只呈现当前元素的离开过渡动画；离开动画执行完毕后触发 Transition 组件重新渲染，如期渲染新元素并执行进入过渡动画。

## 实践要点

- **Transition 是抽象组件**：只渲染第一个子元素节点，内部只能嵌套单个子元素；多节点场景使用 TransitionGroup。
- **触发条件限定四种**：v-if 条件渲染、v-show 条件展示、动态组件、组件根节点。
- **6 个 class 两两配对使用**：进入侧 `enter-from/active/to`、离开侧 `leave-from/active/to`，配合 name 前缀（如 fade-enter-from）；from/to 定义首末状态，active 定义时长、延迟与曲线。
- **动画结束判定双通道**：显式传 duration prop 用 setTimeout；否则通过 whenTransitionEnds 监听动画结束事件。
- **过渡可被打断**：beforeEnter 中检查 el._leaveCb、leave 中检查 el._enterCb，存在则立即执行并以 cancelled 标记回调，避免快速切换时进入/离开过渡状态互相冲突。
- **mode 解决同时过渡的布局问题**：out-in 模式通过 isLeaving 标记 + 空占位节点 + afterLeave 后 instance.update 的方式，把进入过渡推迟到离开过渡完成之后。
- **css="false" 时走纯 JS 钩子**：此时 resolveTransitionProps 直接返回 baseProps，跳过 CSS class 的添加与移除。

## 小结

Transition 组件的核心思想是在元素插入/删除的适当时机添加与移除 CSS class。实现层面：Transition 是基于 BaseTransition 封装的高阶函数式组件，渲染时只输出第一个子元素节点，并通过 resolveTransitionHooks/setTransitionHooks 把钩子函数挂到 vnode.transition 上；元素插入前执行 beforeEnter 添加 enter-from/active class，插入后下一帧切到 enter-to，动画结束后清理 class 并执行 after 类钩子；离开流程对称。mode 属性通过延迟渲染新元素（out-in）或延迟移除旧元素（in-out）控制两个元素过渡的先后顺序。

## 源码位置

本文分析的相关代码在源代码中的位置如下：

- packages/runtime-core/src/components/BaseTransition.ts
- packages/runtime-core/src/renderer.ts
- packages/runtime-dom/src/components/Transition.ts
