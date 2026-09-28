---
title: 菜单模块收尾与Vue代码组织规范
description: "菜单组件的核心逻辑到这里已经稳定：模式切换主链路跑通、一/二级菜单职责拆清、折叠/主题/布局联动接上、组件具备独立可复用边界。后续的重点从「把功能做出来」转向「组织代码」。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 菜单模块收尾与 Vue 代码组织规范

## 概述

菜单组件的核心逻辑到这里已经稳定：模式切换主链路跑通、一/二级菜单职责拆清、折叠/主题/布局联动接上、组件具备独立可复用边界。后续的重点从「把功能做出来」转向「组织代码」。本节沉淀几条 Vue 3 script setup 下的工程规范：不必为形式统一急着改 v-model、主动维持代码分组顺序、明确 emit / provide-inject / Store 的通信边界，以及用 useMenu 这类 composable 收口逻辑边界。

代码组织的目标不是“一次写完美”，而是让后续维护和重构的成本更低、风险更可控。

## 学习目标

- 理解菜单模块「主干逻辑稳定」即阶段性收尾，重构前提是链路先跑通
- 在 props + emit 已清晰独立时，不必为了形式统一立即改 v-model
- 为 script setup 建立 import/type/props/state/computed/watch/function 的分组顺序
- 用 useMenu 这类 composable 收口相关逻辑，判断标准是关联性与运行时上下文
- 区分 emit、provide/inject、Store、app.provide 四者的通信范围与职责
- 认识重构应“先稳链路、再小步优化”，不一次性过度抽象
- 掌握按关注点把菜单相关 composable 拆分到独立目录

---

## 一、收尾意味着主干逻辑已稳定

所谓「菜单模块完成」，不是以后永远不改，而是：模式切换主链路已跑通、一/二级菜单职责已拆清、折叠/主题/布局联动已接上、组件具备相对独立可复用的边界。真正值得重构的前提，是先把状态链路跑通。后续如果还要优化，重点不再是「先做功能」，而是「要不要优化 API 与代码组织」。

## 二、props + emit 已独立就不必急着改 v-model

只要组件能接收 props、也能通过事件把状态变化抛出去、调用方能明确感知状态变化，它就已经是功能独立的组件。这时没有必要为了追求「更像双向绑定」而立即换成 v-model。v-model 更像是 API 形式上的优化，不是功能正确性的前提；是否升级应基于使用频率和调用体验，而不是为了「看起来更高级」。

```ts
const props = defineProps<{ collapse: boolean }>()
const emit = defineEmits<{ change: [value: boolean] }>()
```

## 三、script setup 更需要主动维持分组顺序

setup 语法糖去掉大量样板后，所有东西几乎平铺在一个脚本里，组件一复杂就难读。推荐顺序：import → type/interface → props/emit/model → 响应式状态 → computed → watch → 普通函数 → 组件内部事件函数。顺序不是绝对教条，但同一项目最好统一；只要组件一复杂，代码分组习惯的收益立刻体现。

```ts
import { computed, ref, watch } from "vue"

interface MenuProps { collapse?: boolean }

const props = withDefaults(defineProps<MenuProps>(), { collapse: false })
const localState = ref(false)
const visibleMenus = computed(() => [])
watch(localState, () => {})
function normalizeMenu() {}
const handleClick = () => {}
```

## 四、分组与依赖顺序降低维护成本

把 props 靠前、watch 写在一起、computed 写在一起、function 写在一起，不只是好看，而是让维护者快速定位：组件依赖什么输入、有哪些派生状态、哪些地方有副作用监听、有哪些可复用函数和事件处理函数。computed 多了以后顺序尤其重要，且 JavaScript 仍按顺序解析——后面的 computed 依赖前面变量时，要确保依赖项先声明。建议按「基础派生 → 复合派生」排序，模板里复杂逻辑也提到 computed。

```ts
const showSidebar = computed(() => settings.navMode !== "top")
const sidebarStyle = computed(() =>
  showSidebar.value ? { width: `${settings.menuWidth}px` } : {}
)
```

## 五、箭头函数与 function 的语义分工

课程里的实用经验：箭头函数通常更适合组件内部事件处理，function 形式更适合表达可抽离、可复用的逻辑。这不是语法强制，而是语义约定——别人一眼就能大致判断哪些只是当前点击事件、哪些有机会提取成工具函数或 composable。一旦组件里出现大量可抽离 function，通常说明已接近抽 composable 的时机。保持风格稳定，比绝对选哪种形式更重要。

## 六、useMenu 收口逻辑边界而非几个函数

useMenu 这类 composable 的价值，不只是导出几个函数，而是把相关逻辑边界收在一起：这些逻辑都和菜单相关、有些依赖 useRoute / computed 等 Vue 运行时能力、不是任意场景都能独立调用的纯工具集合。composable 不是 class，但同样在表达「这一组逻辑有明确边界和上下文」。判断是否抽成 composable，不看函数数量，看逻辑关联性 + 运行时上下文 + 是否可能被多组件复用。

```ts
export function useMenu() {
  const route = useRoute()
  function generateMenuKeys() {}
  function filterAndOrderMenu() {}
  const currentActiveMenu = computed(() => route.path)
  return { generateMenuKeys, filterAndOrderMenu, currentActiveMenu }
}
```

## 七、emit / provide-inject / Store 的通信边界

课程最后系统梳理了通信方式，核心是按通信范围选型：父子之间的状态变化通知直接用 emit；父到孙、父到更深后代的配置共享用 provide/inject；跨布局、跨模块、多页面共享、多处同时读写才上全局状态管理；应用入口的 app.provide() 是轻量全局上下文，不等于完整状态管理系统。

- emit 解决「谁通知谁发生了变化」
- provide/inject 解决「谁给谁共享一份配置」
- Store 解决「跨模块/跨页面的复杂业务状态」

不要把 provide/inject 当事件系统用，也不要为了少写一层 props 就把普通父子通信硬改成依赖注入；状态更新链路复杂、需要 DevTools、需要持久化时，仍是 Store 更稳。

## 八、重构时机：链路稳了再优化，不一次到位

菜单模块收尾传递的最重要信号是：先让功能链路稳定，再谈代码组织与 API 优化，不要试图在第一次实现就把分层、类型、composable 全部做到位。等业务稳定、调用模式清晰后，哪些逻辑该进 composable、哪些 props 该升级 v-model 会自然浮现。一次性过度设计反而拖慢交付，也容易在没验证的抽象上浪费时间。工程成熟度是逐步叠加的，而不是开局定死。

```ts
// 菜单相关 composables 收口到独立目录，按关注点划分
// composables/
//   useMenu.ts         // 菜单生成与激活
//   useMenuCollapse.ts // 折叠状态
//   useMenuTheme.ts    // 主题联动
```

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 功能能用却急着全改 v-model | 把 API 形式与功能正确性混在一起 | 先保留清晰 props + emit，按需升级 |
| script setup 越写越乱 | 逻辑平铺无分组 | 建立 import/type/props/state/computed/watch/function 顺序 |
| computed 多了看不懂依赖 | 没按依赖层级排序 | 先基础派生再复合派生，必要时补注释 |
| 不知何时抽 composable | 只按函数数量判断 | 以关联性 + 运行时上下文为判断标准 |
| 父到孙层层 props | 层级变深传递链过长 | 用 provide/inject 共享内部配置 |
| 把 provide/inject 当事件系统 | 混淆共享配置与状态通知 | 父子事件用 emit，深层共享配置才用注入 |
| 所有共享都塞 Store | 没区分通信范围与复杂度 | 组件树内用 provide/inject，跨模块/页面再用 Store |
| 一开始就想抽很多 composable | 没验证的抽象浪费 | 链路稳了再收口 |
| 重构把 props 全改 v-model | 形式优先于稳定 | 按需升级，不一次到位 |
| composable 目录混乱 | 没按关注点划分 | 按 useXxx 关注点拆分文件 |
| 重构引入回归 | 改动没有边界 | 先稳链路，小步增量优化 |
| 把工具函数塞进组件 | 没及时提取 | 可复用逻辑提 composable |
| 类型与逻辑混在页面 | 职责不清 | 类型定义与逻辑分层放 composables |

## 延伸阅读

- 上一篇：[二级菜单折叠图标策略与 mixTop 布局修正](11-二级菜单折叠图标策略与mixTop布局修正.md)
- 下一篇：[Header 细节优化与 LocaleSelect 激活态](13-Header细节优化与LocaleSelect激活态.md)
- 相关链接：[Vue script setup](https://cn.vuejs.org/api/sfc-script-setup)、[Vue 组合式函数](https://cn.vuejs.org/guide/reusability/composables.html)、[Vue Provide/Inject](https://cn.vuejs.org/guide/components/provide-inject)
