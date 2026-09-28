---
title: 菜单标题国际化与路由Meta翻译约定
description: "切换语言后左侧/顶部菜单不刷新，根因通常不是 Menu 组件坏了，而是路由来源的 meta.title 没有稳定的国际化 key。本节建立一条清晰的菜单国际化链路：路由层存 key、组件层做翻译、插件辅助提取与补全文案。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 菜单标题国际化与路由 Meta 翻译约定

## 概述

切换语言后左侧/顶部菜单不刷新，根因通常不是 Menu 组件坏了，而是路由来源的 meta.title 没有稳定的国际化 key。本节建立一条清晰的菜单国际化链路：路由层存 key、组件层做翻译、插件辅助提取与补全文案。重点包括 meta.title 写 key 而非中文、模板用 $t / 脚本用 t() / 页面宏只存 key 三类写法的边界、MenuItem 与 SubMenu 渲染层统一翻译、I18n Ally 提取后的人工校正，以及编辑器占位 T 函数的真实作用。

菜单国际化看似是文案问题，本质是“标题来源唯一 + 翻译集中在渲染层”的架构约定。把这条链路想清楚，后续面包屑、标签页、动态菜单都能复用，而不是每个入口单独处理。

## 学习目标

- 用统一的 meta.title 国际化 key 作为菜单/面包屑/标签页的单一标题来源
- 区分模板 $t、脚本 useI18n().t、页面元信息宏只存 key 三种写法边界
- 在 MenuItem / SubMenu 渲染层统一包一层翻译函数处理 meta.title
- 用 I18n Ally 提取 key 后补全缺失文案并人工校正机翻
- 理解静态配置里占位 T 函数只是编辑器预览，不是运行时翻译
- 认识面包屑、标签页、document.title 都应复用 route.meta.title
- 掌握语言包按模块拆文件再合并的组织方式
- 理解动态/权限路由也要在注册时登记 meta.title key
- 建立翻译缺失主动发现（告警/扫描）的机制

---

## 一、菜单不跟随语言切换先看 meta.title

切换语言后菜单、顶部菜单、图标选择等入口没有同步中英文，根因通常不是 Menu 组件本身，而是路由来源的 meta.title 没有稳定 key。对于基于页面自动生成菜单的项目，菜单标题最终往往来自页面级或路由记录的 meta.title；如果这里放的是中文原文而不是稳定 key，菜单组件就无法统一通过 t() 翻译。推荐做法是 meta.title = "components.iconList" 而非 "图标列表"——真正的翻译动作应发生在渲染层，而不是写路由时直接翻译。

## 二、所有参与菜单的页面都要补齐 title

容易漏掉的准备：不是只有叶子页面需要 title，父级页面、分组页面、基础组件页也都要统一补齐。否则会出现某些菜单项能翻译、某些不能，父级有标题子级没有。此外自动路由场景下，目录约定和页面入口文件也会影响菜单表现。菜单国际化要先保证页面元数据完整，再谈组件层翻译；父子级 title key 命名最好遵循同一套层级规则。

## 三、模板 $t、脚本 t()、页面宏只存 key

三类使用位置要分清：模板里直接渲染文案用 $t("key")；脚本里处理消息提示、函数返回值用 const { t } = useI18n() 再调 t("key")。同一个组件同时出现 $t 和 t() 是正常的，只要位置对即可。最关键的边界是 definePage / definePageMeta 这类页面元信息宏——它们通常在更早阶段被收集转换，不能随手调用 useI18n()，所以应该「登记 key」而非「翻译」：

```ts
// 推荐：只存原始 key
definePage({ meta: { title: "components.iconList" } })
// 不推荐：在宏里直接翻译
definePage({ meta: { title: t("components.iconList") } })
```

路由元信息一旦写成稳定 key，菜单、标签页、面包屑都能共用同一份来源。

## 四、渲染层统一翻译 meta.title

既然 meta.title 保存的是 key，菜单组件最终只需要做一件事：在渲染标题的位置统一执行翻译。无论一级菜单、二级菜单、顶部菜单，只要显示的是 route.meta.title，就应该在 MenuItem / SubMenu 统一走翻译函数。

```vue
<el-menu-item :index="item.path">
  <span>{{ $t(String(item.meta?.title ?? "")) }}</span>
</el-menu-item>
```

meta.title 可能不存在，要有兜底值避免把 undefined 传给翻译函数；一级/二级/顶部菜单都要统一处理，否则语言切换体验会不一致；翻译集中在渲染层，后续维护成本最低。

## 五、I18n Ally 提取后的人工校正闭环

VS Code 配合 I18n Ally 能很快把硬编码文案提取成 key，适合批量替换模板 label、按钮文字和脚本消息。但提取之后替换方式要按位置调整：模板属性要改成绑定表达式 :label="$t('...')"（别漏了冒号）；脚本改成 t("...")；页面标题优先提取成语义化 key（pages.components）。提取只是第一步，还要在缺失文案列表补齐目标语言文本、检查机翻结果——例如 components 被机翻成「成分」，在组件库项目里显然不对，这类高频入口文案人工校正比信任机翻更重要。

## 六、占位 T 函数只是编辑器辅助

某些静态配置对象的 title 会写成 T("pages.components")，这里的 T 不是运行时 t，通常只是一个「原样返回 key」的本地占位函数，目的是让编辑器/I18n Ally 更直观显示该 key 对应文案。真正显示中英文的，仍是渲染层对该字段再包一层 $t(...)。占位 T 只是编辑器辅助、不负责翻译；definePage 里依然建议直接写字符串 key；若团队不依赖这种预览能力，统一只写原始 key 也能保持约定单纯。

## 七、key 命名语义化并收敛流程

meta.title 这类长期存在、多处复用的字段，key 命名最好满足「看 key 就知道对应哪类页面」「语言包里能快速定位」，例如 components.iconList 比 title1 / 菜单A 更可维护。最终菜单国际化可收敛成清晰流程：页面给 meta.title 配稳定 key → 语言包维护多语言文案 → 模板 $t / 脚本 t() → MenuItem/SubMenu 统一翻译 → I18n Ally 辅助提取维护。路由层负责存储，组件层负责展示，是职责最清晰的分法；后续新增页面只需补 meta.title 和语言包字段。

## 八、面包屑与标签页复用同一份 title 来源

菜单只是 meta.title 的一个消费方。面包屑、多标签页、文档标题（document.title）都应从同一份路由 meta 读取并统一翻译，而不是各自维护一份标题映射。这样切换语言时三处同步更新，新增页面也只需补一次 meta.title。把“标题来源唯一”作为约定，能避免多处标题不一致这类隐性 bug。

## 九、语言包文件组织与按需加载

key 语义化之后，语言包本身也要有结构：按模块拆文件（components、pages、menus），再在入口合并；大型项目可对非首屏语言做按需加载，避免初始包过大。组织方式不复杂，但能显著提升多语言维护效率，也方便按模块移交或复用某语言片段。

```ts
// locales/en.ts 合并多模块语言包
import components from "./components"
import pages from "./pages"
export default { ...components, ...pages }
```

## 十、动态路由 title 的处理

权限路由、后端下发的动态菜单，常常在运行时才注册路由记录。这类路由同样要在注册时带上 meta.title key，否则动态菜单项无法翻译。可以在注册前统一给路由记录补 meta，或约定动态菜单接口返回的就是 key 而非中文，从源头保证一致性。

## 十一、翻译缺失的提前发现

项目大了之后，漏翻的 key 往往上线后才被发现。可以在开发期用脚本或 I18n Ally 的缺失面板定期扫描，甚至给 $t 包一层开发期告警：命中空翻译时 console.warn 出具体 key。把“翻译缺失”从被动反馈变成主动发现，能显著降低多语言回归成本。

```ts
function t(key: string) {
  const msg = messages[key]
  if (!msg) console.warn(`[i18n] missing key: ${key}`)
  return msg ?? key
}
```

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 切换语言菜单还是中文 | meta.title 写中文原文，菜单无翻译入口 | 改成国际化 key，渲染层统一 $t |
| 脚本提示文案不生效 | 脚本误用 $t | 用 useI18n() 解构 t() |
| definePage 写 t() 报错 | 页面宏不适合运行时翻译 | 宏里只存 key，渲染时再翻译 |
| 某些菜单项能翻译某些不能 | meta.title 配置不完整 | 所有参与菜单的页面统一补 title |
| 提取 key 但属性不生效 | 模板属性仍是普通字符串 | 写成 :label="$t('...')" 绑定 |
| 机翻中文很奇怪 | 字面翻译不懂组件库语境 | 缺失文案面板手动编辑，关键入口词人工校正 |
| 静态配置用了 T() 却没翻译 | 把占位 T 当运行时函数 | 占位 T 只做预览，展示层还要 $t |
| 语言包 key 很乱 | 命名无语义 | 按模块分组，如 components.iconList |
| 面包屑和菜单标题不一致 | 各自维护标题 | 统一从 route.meta.title 读取 |
| 语言包越来越大 | 单文件堆砌 | 按模块拆文件再合并 |
| 动态菜单不翻译 | 运行时路由没 meta | 注册时补 meta.title key |
| 漏翻 key 上线才发现 | 没主动扫描 | 开发期告警或缺失面板扫描 |
| 标签页标题不跟随 | 没复用 meta | 标签页也读 meta.title 再 $t |
| 子菜单无标题 | 父级漏补 title | 父级同样要配 title key |
| key 命名冲突 | 没按模块分组 | 用模块前缀避免冲突 |
| 切换语言部分刷新 | 翻译没集中渲染层 | MenuItem/SubMenu 统一翻译 |
| 文档标题(document.title)不变 | 没同步更新 | 路由守卫里按 meta 设 title |

## 延伸阅读

- 上一篇：[Dropdown 通用封装与 LocaleSelect 泛型改造](14-Dropdown通用封装与LocaleSelect泛型改造.md)
- 下一篇：[菜单递归查询重构与刷新态 SubMenu 自动展开](16-菜单递归查询重构与刷新态SubMenu自动展开.md)
- 相关链接：[Vue I18n Composition API](https://vue-i18n.intlify.dev/guide/advanced/composition)、[I18n Ally](https://github.com/lokalise/i18n-ally)、[Vue script setup](https://cn.vuejs.org/api/sfc-script-setup)
