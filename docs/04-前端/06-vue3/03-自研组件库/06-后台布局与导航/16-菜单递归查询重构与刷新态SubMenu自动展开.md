---
title: 菜单递归查询重构与刷新态SubMenu自动展开
description: "这一节修复混合模式与多级菜单的两个关键问题：深层子路由进入时左侧二级菜单不显示，以及刷新页面后父级 SubMenu 没自动展开。根因都在菜单派生与状态恢复逻辑——getSubMenus 不能直接拿完整叶子路径当根路径；刷新恢复不能只靠模板初值，要命令式调用 menu.open()。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 菜单递归查询重构与刷新态 SubMenu 自动展开

## 概述

这一节修复混合模式与多级菜单的两个关键问题：深层子路由进入时左侧二级菜单不显示，以及刷新页面后父级 SubMenu 没自动展开。根因都在菜单派生与状态恢复逻辑——getSubMenus 不能直接拿完整叶子路径当根路径；刷新恢复不能只靠模板初值，要命令式调用 menu.open()。同时把重复的递归查找重构成「按条件递归」的通用能力。

这一节的工程收益不只在修好两个 bug，更在于把「菜单派生与查找」从零散的过程代码，沉淀成可复用的递归原语。后续任何新的菜单查询需求，都应该是「传入一个条件」而不是「再写一遍遍历」，这是菜单系统能持续演进的关键。

## 学习目标

- 用 rootPath 把深层页面归一化到一级模块，再派生二级菜单
- 区分 rootPath（派生二级菜单）与 parentPath（展开父级 submenu）两类导航上下文
- 把重复的递归查找重构成 getItemByCondition(fn)，把遍历与匹配规则拆开
- 用 getParentMenu 补上刷新恢复的父节点定位能力
- 在 onMounted 中命令式调用 menu.open(parent.meta.key) 恢复展开态

---

## 一、深层路由下二级菜单不能直接用完整路径

第一个关键 bug：访问深层子页面如 /components/icon/icon-picker，切到 mixTop 或 mixedBar 时左侧二级菜单没正常显示。根因不在模板，而在菜单派生逻辑——如果 getSubMenus 直接拿当前完整路径做判断，深层路由匹配的就不是「所属一级模块」，而是叶子页自己。二级菜单数据来源应依赖当前页面所属的一级菜单根路径，而不是完整叶子路径。

```ts
const rootPath = computed(() => {
  if (route.path === "/") return "/"
  const segments = (route.path ?? "/").split("/").filter(Boolean)
  if (segments.length === 0) return "/"
  return `/${segments[0]}`
})
```

mixTop 和 mixedBar 的二级菜单都依赖这个根路径归一化；/ 首页路径要单独处理避免拼接异常；本质是在做导航上下文归一化，不是单纯字符串处理。

## 二、区分根路径与父级路径

继续推进时很容易把两个概念混在一起：根路径决定当前页面属于哪个一级模块、用来派生二级菜单；父级路径决定当前叶子页应该展开哪个父级 submenu。两者都来自 route.path，但用途完全不同。

```text
当前路径：/components/icon/icon-picker
根路径：/components        （用于 getSubMenus）
父级路径：/components/icon  （用于 getParentMenu / menu.open）
```

根路径更粗粒度，父级路径更贴近叶子节点的直接上级；只要菜单支持多层级，这两个概念就必须分开建模，不能复用同一段逻辑直接替代。

## 三、把递归查找重构成按条件递归

原先菜单系统已有递归 getItem(index)，但课程又出现新查询需求：按 meta.key 找当前节点、按 name 找父级、按路径规则找上下文。如果每新增一种匹配就复制一套递归函数，后面会越来越乱。更合理的是把「递归遍历」保留下来，把「匹配条件」交给调用方传入。

```ts
function getItemByCondition(
  menus: AppRouteMenuItem[],
  fn: (item: AppRouteMenuItem) => boolean
): AppRouteMenuItem | undefined {
  for (const current of menus) {
    if (fn(current)) return current
    if (Array.isArray(current.children)) {
      const target = getItemByCondition(current.children, fn)
      if (target) return target
    }
  }
}
```

这类高阶递归函数的核心价值是把「遍历结构」和「匹配规则」拆开，非常适合继续收口到 useMenu；返回值允许 undefined，调用方要保持判空。

## 四、getParentMenu 补上父节点定位能力

新增 getParentMenu 不是又写一个「找节点」函数，而是解决一个具体需求：刷新当前叶子页面时，如何找出应该自动展开的父级 submenu。它和 getItem 职责不同——getItem 找当前命中节点，getParentMenu 找命中节点的上一级。

```ts
const parentPath = computed(() => {
  const segments = (route.path ?? "/").split("/").filter(Boolean)
  if (segments.length < 2) return "/"
  segments.pop()
  return `/${segments.join("/")}`
})

const parent = getItemByCondition(menus, (item) => item.name === parentPath.value)
```

getParentMenu 的价值不在「查到任意节点」，而在「查到正确层级的父节点」；路径层级太浅可能没有需要展开的父级，这时直接跳过；父级节点更适合用 name 或层级路径匹配，而非直接拿叶子路径本身。

## 五、刷新恢复要命令式调用 menu.open()

课程最后修的典型体验问题：当前页在深层菜单下，刷新后内容是对的，但左侧 submenu 没自动展开。只依赖模板初始状态通常不够，因为刷新恢复是当前路由先恢复、菜单树再准备好、组件实例方法最后才能操作展开态。所以借助 Element Plus Menu 暴露的 open 方法，在挂载后主动展开父级菜单。

```ts
const menuRef = ref<InstanceType<typeof ElMenu>>()

onMounted(() => {
  const parent = getParentMenu(filteredMenus.value)
  if (parent?.meta?.key && menuRef.value?.open) {
    menuRef.value.open(parent.meta.key)
  }
})
```

open 打开的是父级 submenu 的索引，不是当前叶子节点本身；因依赖组件实例，放在 onMounted 更自然；调用前同时检查 menuRef、open 方法、父级 meta.key 是否存在。

## 六、恢复顺序：定位路由 → 推导父级 → 恢复展开

真正重要的不只是多写了一个 open()，而是整个恢复顺序终于清楚了：当前路由已知 → 菜单树已知 → 递归定位当前节点与父级节点 → 再恢复 submenu 展开态。顺序错了（比如菜单树还没准备好就调用 open）往往什么都没展开或展开错层级。刷新恢复是状态恢复问题，不是「再执行一次点击」；如果后续改成异步菜单数据，这个顺序会更重要；这类逻辑最好集中收口，不要在多个组件里各自恢复一半状态。

## 七、递归能力收口到组合式函数更利于复用

`getItemByCondition`、`getParentMenu`、`getSubMenus` 这类菜单派生与查找逻辑，最终都应收口到一个 `useMenu` 组合式函数里，而不是散落在各个布局组件。布局组件只调用语义清晰的派生结果，不必关心遍历细节；同时这些纯函数也更容易单独测试，不依赖组件实例和 DOM。当菜单系统继续演进时，所有查找规则的变动只发生在组合式函数内部，视图层保持稳定，维护半径被压缩到最小。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 深层页面进入后二级菜单不显示 | getSubMenus 直接用完整叶子路径 | 先提取一级根路径再派生二级菜单 |
| 刷新后父级菜单没展开 | 只恢复路由没恢复 submenu 展开态 | onMounted 中 menuRef.open(parent.meta.key) |
| 不同查找场景写很多递归函数 | 每个场景重复遍历菜单树 | 抽成 getItemByCondition 外置条件 |
| 父级菜单定位总出错 | 把叶子路径当父级路径 | 拆分路径移除最后一级再匹配 |
| open() 没效果 | 调用时实例或父级 key 还不存在 | 挂载后判空再命令式展开 |
| 查找逻辑在多个组件重复实现 | 派生与查找没收口到组合式 | 统一进 useMenu，组件只消费派生结果 |

## 延伸阅读

- 上一篇：[菜单标题国际化与路由 Meta 翻译约定](15-菜单标题国际化与路由Meta翻译约定.md)
- 下一篇：[顶部导航折叠交互与 Element-Plus 菜单排查](17-顶部导航折叠交互与Element-Plus菜单排查.md)
- 相关链接：[Element Plus Menu](https://element-plus.org/zh-CN/component/menu.html)、[Vue onMounted](https://cn.vuejs.org/api/composition-api-lifecycle)、[Vue computed](https://cn.vuejs.org/guide/essentials/computed)
