---
title: KeepAlive：内存缓存与调度
description: "Vue3 源码解析：KeepAlive 组件的内存缓存与调度机制。"
order: 4
group: 组件机制
category: Vue
tags: [Vue3, 源码, 组件系统, KeepAlive]
keywords:
  - Vue3
  - KeepAlive
  - 缓存
  - 组件调度
---
# KeepAlive：内存缓存与调度

## 概念说明

多个平行组件条件渲染时，满足条件的组件会触发挂载，已渲染的组件在条件不满足时会触发卸载。示例如下：

```html
<comp-a v-if="flag"></comp-a>
<comp-b v-else></comp-b>
<button @click="flag=!flag">toggle</button>
```

flag 为 true 时触发组件 A 的渲染；点击按钮把 flag 修改为 false 后，又会触发组件 A 的卸载以及组件 B 的渲染。

组件的挂载和卸载都是一个递归过程，存在一定的性能损耗。对于可能频繁切换的组件，Vue.js 提供了内置组件 KeepAlive 来减少这部分损耗：

```html
<keep-alive>
  <comp-a v-if="flag"></comp-a>
  <comp-b v-else></comp-b>
  <button @click="flag=!flag">toggle</button>
</keep-alive>
```

通过模板导出工具可以查看它编译后的 render 函数：

```js
import { resolveComponent as _resolveComponent, createVNode as _createVNode, createCommentVNode as _createCommentVNode, KeepAlive as _KeepAlive, openBlock as _openBlock, createBlock as _createBlock } from "vue"
export function render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_comp_a = _resolveComponent("comp-a")
  const _component_comp_b = _resolveComponent("comp-b")
  return (_openBlock(), _createBlock(_KeepAlive, null, [
    (_ctx.flag)
      ? _createVNode(_component_comp_a, { key: 0 })
      : _createVNode(_component_comp_b, { key: 1 }),
    _createVNode("button", {
      onClick: $event => (_ctx.flag=!_ctx.flag)
    }, "toggle", 8 /* PROPS */, ["onClick"])
  ], 1024 /* DYNAMIC_SLOTS */))
}
```

KeepAlive 组件对内部子组件做了一层封装：它是一个抽象组件，本身不会渲染成真实的 DOM，只渲染内部包裹的子节点，并让内部子组件在切换时跳过整套递归卸载和挂载 DOM 的流程，从而优化性能。

## KeepAlive 的定义与整体结构

KeepAlive 组件的定义如下：

```js
const KeepAliveImpl = {
  name: `KeepAlive`,
  __isKeepAlive: true,
  inheritRef: true,
  props: {
    include: [String, RegExp, Array],
    exclude: [String, RegExp, Array],
    max: [String, Number]
  },
  setup(props, { slots }) {
    const cache = new Map()
    const keys = new Set()
    let current = null
    const instance = getCurrentInstance()
    const parentSuspense = instance.suspense
    const sharedContext = instance.ctx
    const { renderer: { p: patch, m: move, um: _unmount, o: { createElement } } } = sharedContext
    const storageContainer = createElement('div')
    sharedContext.activate = (vnode, container, anchor, isSVG, optimized) => {
      const instance = vnode.component
      move(vnode, container, anchor, 0 /* ENTER */, parentSuspense)
      patch(instance.vnode, vnode, container, anchor, instance, parentSuspense, isSVG, optimized)
      queuePostRenderEffect(() => {
        instance.isDeactivated = false
        if (instance.a) {
          invokeArrayFns(instance.a)
        }
        const vnodeHook = vnode.props && vnode.props.onVnodeMounted
        if (vnodeHook) {
          invokeVNodeHook(vnodeHook, instance.parent, vnode)
        }
      }, parentSuspense)
    }
    sharedContext.deactivate = (vnode) => {
      const instance = vnode.component
      move(vnode, storageContainer, null, 1 /* LEAVE */, parentSuspense)
      queuePostRenderEffect(() => {
        if (instance.da) {
          invokeArrayFns(instance.da)
        }
        const vnodeHook = vnode.props && vnode.props.onVnodeUnmounted
        if (vnodeHook) {
          invokeVNodeHook(vnodeHook, instance.parent, vnode)
        }
        instance.isDeactivated = true
      }, parentSuspense)
    }
    function unmount(vnode) {
      resetShapeFlag(vnode)
      _unmount(vnode, instance, parentSuspense)
    }
    function pruneCache(filter) {
      cache.forEach((vnode, key) => {
        const name = getName(vnode.type)
        if (name && (!filter || !filter(name))) {
          pruneCacheEntry(key)
        }
      })
    }
    function pruneCacheEntry(key) {
      const cached = cache.get(key)
      if (!current || cached.type !== current.type) {
        unmount(cached)
      }
      else if (current) {
        resetShapeFlag(current)
      }
      cache.delete(key)
      keys.delete(key)
    }
    watch(() => [props.include, props.exclude], ([include, exclude]) => {
      include && pruneCache(name => matches(include, name))
      exclude && pruneCache(name => matches(exclude, name))
    })
    let pendingCacheKey = null
    const cacheSubtree = () => {
      if (pendingCacheKey != null) {
        cache.set(pendingCacheKey, instance.subTree)
      }
    }
    onBeforeMount(cacheSubtree)
    onBeforeUpdate(cacheSubtree)
    onBeforeUnmount(() => {
      cache.forEach(cached => {
        const { subTree, suspense } = instance
        if (cached.type === subTree.type) {
          resetShapeFlag(subTree)
          const da = subTree.component.da
          da && queuePostRenderEffect(da, suspense)
          return
        }
        unmount(cached)
      })
    })
    return () => {
      pendingCacheKey = null
      if (!slots.default) {
        return null
      }
      const children = slots.default()
      let vnode = children[0]
      if (children.length > 1) {
        if ((process.env.NODE_ENV !== 'production')) {
          warn(`KeepAlive should contain exactly one component child.`)
        }
        current = null
        return children
      }
      else if (!isVNode(vnode) ||
        !(vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */)) {
        current = null
        return vnode
      }
      const comp = vnode.type
      const name = getName(comp)
      const { include, exclude, max } = props
      if ((include && (!name || !matches(include, name))) ||
        (exclude && name && matches(exclude, name))) {
        return (current = vnode)
      }
      const key = vnode.key == null ? comp : vnode.key
      const cachedVNode = cache.get(key)
      if (vnode.el) {
        vnode = cloneVNode(vnode)
      }
      pendingCacheKey = key
      if (cachedVNode) {
        vnode.el = cachedVNode.el
        vnode.component = cachedVNode.component
        vnode.shapeFlag |= 512 /* COMPONENT_KEPT_ALIVE */
        keys.delete(key)
        keys.add(key)
      }
      else {
        keys.add(key)
        if (max && keys.size > parseInt(max, 10)) {
          pruneCacheEntry(keys.values().next().value)
        }
      }
      vnode.shapeFlag |= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */
      current = vnode
      return vnode
    }
  }
}
```

KeepAlive 的实现可拆成四个部分：**组件的渲染**、**缓存的设计**、**Props 设计**和**组件的卸载**。下面依次分析其实现，并结合前面的示例讲解。

## 组件的渲染

KeepAlive 组件使用 Composition API 实现：当 setup 函数返回的是一个函数，该函数就是组件的渲染函数。渲染函数的实现如下：

```js
return () => {
  pendingCacheKey = null
  if (!slots.default) {
    return null
  }
  const children = slots.default()
  let vnode = children[0]
  if (children.length > 1) {
    if ((process.env.NODE_ENV !== 'production')) {
      warn(`KeepAlive should contain exactly one component child.`)
    }
    current = null
    return children
  }
  else if (!isVNode(vnode) ||
    !(vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */)) {
    current = null
    return vnode
  }
  const comp = vnode.type
  const name = getName(comp)
  const { include, exclude, max } = props
  if ((include && (!name || !matches(include, name))) ||
    (exclude && name && matches(exclude, name))) {
    return (current = vnode)
  }
  const key = vnode.key == null ? comp : vnode.key
  const cachedVNode = cache.get(key)
  if (vnode.el) {
    vnode = cloneVNode(vnode)
  }
  pendingCacheKey = key
  if (cachedVNode) {
    vnode.el = cachedVNode.el
    vnode.component = cachedVNode.component
    // 避免 vnode 节点作为新节点被挂载
    vnode.shapeFlag |= 512 /* COMPONENT_KEPT_ALIVE */
    // 让这个 key 始终新鲜
    keys.delete(key)
    keys.add(key)
  }
  else {
    keys.add(key)
    // 删除最久不用的 key，符合 LRU 思想
    if (max && keys.size > parseInt(max, 10)) {
      pruneCacheEntry(keys.values().next().value)
    }
  }
  // 避免 vnode 被卸载
  vnode.shapeFlag |= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */
  current = vnode
  return vnode
}
```

渲染函数的处理流程：

1. 先从 `slots.default()` 拿到子节点 children，即 KeepAlive 组件包裹的子组件。KeepAlive 只能渲染单个子节点，children 长度大于 1 时会报警告。
2. 不考虑缓存部分时，KeepAlive 渲染的 vnode 就是子节点 children 的第一个元素，也是函数的返回值。
3. 因此 KeepAlive 是抽象组件：本身不渲染成实体节点，而是渲染它的第一个子节点。

没有缓存的抽象封装没有实际意义，KeepAlive 的核心价值在缓存设计。

## 缓存的设计

### 缓存什么

组件的递归 patch 过程主要为渲染 DOM，这一递归过程存在性能耗时。既然目标是渲染 DOM，那么可以把 DOM 缓存起来：下一次渲染直接从缓存获取 DOM 并渲染，无需每次重新递归渲染。KeepAlive 正是这样实现的。

### 缓存时机

KeepAlive 注入了两个钩子函数 onBeforeMount 和 onBeforeUpdate，二者内部都执行 cacheSubtree 函数做缓存：

```js
const cacheSubtree = () => {
  if (pendingCacheKey != null) {
    cache.set(pendingCacheKey, instance.subTree)
  }
}
```

由于 pendingCacheKey 只在 KeepAlive 的 render 函数中被赋值，KeepAlive 首次进入 onBeforeMount 钩子函数时不会缓存。

KeepAlive 执行 render 时，pendingCacheKey 会被赋值为 vnode.key。回看示例渲染后的模板：

```js
import { resolveComponent as _resolveComponent, createVNode as _createVNode, createCommentVNode as _createCommentVNode, KeepAlive as _KeepAlive, openBlock as _openBlock, createBlock as _createBlock } from "vue"
export function render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_comp_a = _resolveComponent("comp-a")
  const _component_comp_b = _resolveComponent("comp-b")
  return (_openBlock(), _createBlock(_KeepAlive, null, [
    (_ctx.flag)
      ? _createVNode(_component_comp_a, { key: 0 })
      : _createVNode(_component_comp_b, { key: 1 }),
    _createVNode("button", {
      onClick: $event => (_ctx.flag=!_ctx.flag)
    }, "toggle", 8 /* PROPS */, ["onClick"])
  ], 1024 /* DYNAMIC_SLOTS */))
}
```

KeepAlive 的子节点创建时都添加了一个 key 的 prop——它专门为 KeepAlive 的缓存设计，保证每一个子节点都有唯一的 key。

结合示例梳理缓存过程：页面首先渲染 A 组件；点击按钮修改 flag 值后触发当前组件重新渲染，进而触发 KeepAlive 组件重新渲染。组件重新渲染前会执行 onBeforeUpdate 对应的钩子函数，再次执行 cacheSubtree。此时 pendingCacheKey 对应的是 A 组件 vnode 的 key，instance.subTree 对应的也是 A 组件的渲染子树，所以 KeepAlive 每次在更新前会缓存前一个组件的渲染子树。

> 经源码分析，onBeforeMount 的钩子函数注入似乎并非必需：删除后再运行 Vue.js 3.0 的单测也能通过。

之后渲染 B 组件；再次点击按钮修改 flag 值时，会再次触发 KeepAlive 组件重新渲染，此时 onBeforeUpdate 钩子函数缓存的是 B 组件的渲染子树。

接着再次执行 KeepAlive 组件的 render 函数，此时可以从缓存中根据 A 组件的 key 拿到对应的渲染子树 cachedVNode，然后执行如下逻辑：

```js
if (cachedVNode) {
  vnode.el = cachedVNode.el
  vnode.component = cachedVNode.component
  // 避免 vnode 节点作为新节点被挂载
  vnode.shapeFlag |= 512 /* COMPONENT_KEPT_ALIVE */
  // 让这个 key 始终新鲜
  keys.delete(key)
  keys.add(key)
}
else {
  keys.add(key)
  // 删除最久不用的 key，符合 LRU 思想
  if (max && keys.size > parseInt(max, 10)) {
    pruneCacheEntry(keys.values().next().value)
  }
}
```

拿到缓存的渲染子树后，可以直接取到它对应的 DOM 以及组件实例 component，赋值给 KeepAlive 的 vnode，并更新 vnode.shapeFlag，供后续 patch 阶段使用。

> 注意，这里有一个额外的缓存管理逻辑，在 Props 设计部分详细说明。

### 缓存命中后的 patch 流程

KeepAlive 缓存的是有状态的组件 vnode，有缓存和没缓存在 patch 阶段的区别如下。回顾 patchComponent 函数的实现：

```js
const processComponent = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized) => {
  if (n1 == null) {
    // 处理 KeepAlive 组件
    if (n2.shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
      parentComponent.ctx.activate(n2, container, anchor, isSVG, optimized)
    }
    else {
      // 挂载组件
      mountComponent(n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized)
    }
  }
  else {
    // 更新组件
  }
}
```

KeepAlive 首次渲染某个子节点时与正常组件节点渲染无区别；命中缓存后由于标记了 shapeFlag，执行 processComponent 时会走到处理 KeepAlive 组件的逻辑，执行 KeepAlive 组件实例上下文中的 activate 函数：

```js
sharedContext.activate = (vnode, container, anchor, isSVG, optimized) => {
  const instance = vnode.component
  move(vnode, container, anchor, 0 /* ENTER */, parentSuspense)
  patch(instance.vnode, vnode, container, anchor, instance, parentSuspense, isSVG, optimized)
  queuePostRenderEffect(() => {
    instance.isDeactivated = false
    if (instance.a) {
      invokeArrayFns(instance.a)
    }
    const vnodeHook = vnode.props && vnode.props.onVnodeMounted
    if (vnodeHook) {
      invokeVNodeHook(vnodeHook, instance.parent, vnode)
    }
  }, parentSuspense)
}
```

此时能从 vnode.el 中拿到缓存的 DOM，直接调用 move 方法挂载节点，再执行 patch 方法更新组件以防止 props 变化。随后通过 queuePostRenderEffect 的方式，在组件渲染完毕后执行子节点组件定义的 activated 钩子函数。

缓存机制小结：KeepAlive 包裹的子组件在其渲染后、下一次 KeepAlive 组件更新前会被缓存；缓存后的子组件在下一次渲染时直接从缓存拿到子树 vnode 以及对应的 DOM 元素，直接渲染即可。

## Props 设计

KeepAlive 支持三个 Props：include、exclude 和 max，用于对缓存行为做配置——针对某些子组件缓存、某些不缓存，以及限制最大缓存个数。

```js
props: {
  include: [String, RegExp, Array],
  exclude: [String, RegExp, Array],
  max: [String, Number]
}
```

### include 与 exclude

include 和 exclude 对应的实现逻辑如下：

```js
const { include, exclude, max } = props
if ((include && (!name || !matches(include, name))) ||
  (exclude && name && matches(exclude, name))) {
  return (current = vnode)
}
```

匹配规则：子组件名称不匹配 include 的 vnode，以及子组件名称匹配 exclude 的 vnode，都不缓存、直接返回。

由于 props 是响应式的，include 和 exclude 发生变化时也有相应的处理逻辑：

```js
watch(() => [props.include, props.exclude], ([include, exclude]) => {
  include && pruneCache(name => matches(include, name))
  exclude && !pruneCache(name => matches(exclude, name))
})
```

监听逻辑：当 include 发生变化时，从缓存中删除那些 name 不匹配 include 的 vnode 节点；当 exclude 发生变化时，从缓存中删除那些 name 匹配 exclude 的 vnode 节点。

### max 与 LRU 缓存管理

max prop 控制缓存的最大个数。缓存本身占用内存，需要限制缓存个数的场景可以通过 max 属性控制。缓存新的 vnode 时会做一定程度的缓存管理：

```js
keys.add(key)
// 删除最久不用的 key，符合 LRU 思想
if (max && keys.size > parseInt(max, 10)) {
pruneCacheEntry(keys.values().next().value)
}
```

新的缓存 key 都在 keys 的结尾添加，当缓存个数超过 max 时从最前面开始删除，符合 LRU（最近最少使用）算法思想。

## 组件的卸载

KeepAlive 渲染的过程实际上是渲染它的第一个子组件节点，并会给渲染的 vnode 打上如下标记：

```js
vnode.shapeFlag |= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */
```

结合示例分析这个 shapeFlag 的作用：

```html
<keep-alive>
  <comp-a v-if="flag"></comp-a>
  <comp-b v-else></comp-b>
  <button @click="flag=!flag">toggle</button>
</keep-alive>
```

flag 为 true 时渲染 A 组件；点击按钮修改 flag 值会触发 KeepAlive 组件重新渲染，先执行 BeforeUpdate 钩子函数缓存 A 组件对应的渲染子树 vnode，再执行 patch 更新子组件。

此时会执行 B 组件的渲染以及 A 组件的卸载。组件卸载会执行 unmount 方法，其中有一个关于 KeepAlive 组件的逻辑：

```js
const unmount = (vnode, parentComponent, parentSuspense, doRemove = false) => {
  const { shapeFlag  } = vnode
  if (shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
    parentComponent.ctx.deactivate(vnode)
    return
  }
  // 卸载组件
}
```

shapeFlag 满足 KeepAlive 的条件时，执行相应的 deactivate 函数：

```js
sharedContext.deactivate = (vnode) => {
  const instance = vnode.component
  move(vnode, storageContainer, null, 1 /* LEAVE */, parentSuspense)
  queuePostRenderEffect(() => {
    if (instance.da) {
      invokeArrayFns(instance.da)
    }
    const vnodeHook = vnode.props && vnode.props.onVnodeUnmounted
    if (vnodeHook) {
      invokeVNodeHook(vnodeHook, instance.parent, vnode)
    }
    instance.isDeactivated = true
  }, parentSuspense)
}
```

deactivate 的处理流程：函数首先通过 move 方法把节点移入 storageContainer（从 DOM 树中移除），接着通过 queuePostRenderEffect 的方式执行定义的 deactivated 钩子函数。

注意：这里只是移除了 DOM，并没有真正执行子组件的整套卸载流程——这正是 KeepAlive 缓存的本质。

### KeepAlive 自身卸载

除了切换导致的子组件"卸载"（失活）外，当 KeepAlive 所在的组件卸载时，由于卸载的递归特性也会触发 KeepAlive 组件卸载，卸载过程中会执行 onBeforeUnmount 钩子函数：

```js
onBeforeUnmount(() => {
  cache.forEach(cached => {
    const { subTree, suspense } = instance
    if (cached.type === subTree.type) {
      resetShapeFlag(subTree)
      const da = subTree.component.da
      da && queuePostRenderEffect(da, suspense)
      return
    }
    unmount(cached)
  })
})
```

处理逻辑：遍历所有缓存的 vnode，比对缓存的 vnode 是否为当前 KeepAlive 组件渲染的 vnode。

- 如果是，执行 resetShapeFlag 方法修改 vnode 的 shapeFlag，使它不再被当作 KeepAlive 的 vnode，走正常的卸载逻辑；接着通过 queuePostRenderEffect 执行子组件的 deactivated 钩子函数。
- 如果不是，执行 unmount 方法重置 shapeFlag 并执行缓存 vnode 的整套卸载流程。

### activated / deactivated 钩子的执行时机

activated 与 deactivated 钩子函数都通过 queuePostRenderEffect 注册，在组件渲染完毕后的 post 队列中执行，这一点与普通的生命周期钩子的执行时机不同。

## 实践要点

- **KeepAlive 只支持单个子节点**：children 长度大于 1 时开发环境会收到警告，常见做法是配合动态组件或条件渲染使用。
- **子节点的 key 是缓存索引**：key 用于在 cache（Map）中定位渲染子树，未显式设置 key 时会退化为使用组件对象本身作为 key。
- **shapeFlag 标记是机制核心**：`COMPONENT_SHOULD_KEEP_ALIVE`（256）避免 vnode 被真正卸载，`COMPONENT_KEPT_ALIVE`（512）避免 vnode 作为新节点被挂载。
- **缓存的是渲染子树与 DOM**：命中缓存时直接复用 vnode.el 和 component 实例，跳过递归挂载。
- **include/exclude 变化会触发缓存修剪**：pruneCache 按名称匹配过滤缓存，被修剪的缓存项会走真正的卸载流程。
- **max 用 LRU 策略淘汰缓存**：keys（Set）维护访问新鲜度，超出上限时淘汰最久未使用的缓存。

## 小结

KeepAlive 是一个不渲染实体 DOM 的抽象组件：渲染阶段返回子组件 vnode 并打上 shapeFlag 标记；缓存阶段借助 onBeforeUpdate 钩子在更新前缓存前一个子组件的渲染子树；命中缓存时通过 activate 直接复用 DOM 与组件实例，跳过递归挂载；切换时通过 deactivate 仅把 DOM 移入隐藏容器而非真正卸载。include/exclude/max 三个 Props 分别控制缓存的匹配过滤与容量上限（LRU 淘汰），KeepAlive 自身卸载时统一清理全部缓存。

## 源码位置

本文分析的相关代码在源代码中的位置如下：

- packages/runtime-core/src/components/KeepAlive.ts
- packages/runtime-core/src/renderer.ts
