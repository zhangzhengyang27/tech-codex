---
title: frontmatter配置
description: "VitePress frontmatter 页面级配置参考：title/titleTemplate/description/head 通用选项，以及 layout、hero、navbar、sidebar、outline、lastUpdated 等仅默认主题可用的选项"
keywords: [frontmatter, VitePress, 页面配置]
category: tools
tags: [VitePress, 文档站点, Markdown]
---


# Frontmatter 配置

Frontmatter 支持基于页面的配置。在每个 markdown 文件中，可以使用 frontmatter 配置来覆盖站点级别或主题级别的配置选项。此外，还有一些配置选项只能在 frontmatter 中定义。

## 基本用法

示例用法：

```markdown
---
title: Docs with VitePress
editLink: true
---
```

可以通过 Vue 表达式中的 `$frontmatter` 全局变量访问 frontmatter 数据：

```markdown
{{ $frontmatter.title }}
```

## 通用配置选项

| 配置项          | 类型                | 默认值 | 说明                                                                       |
| --------------- | ------------------- | ------ | -------------------------------------------------------------------------- |
| `title`         | `string`            | -      | 页面的标题。它与 `config.title` 相同，并且覆盖站点级配置                   |
| `titleTemplate` | `string \| boolean` | -      | 标题的后缀。它与 `config.titleTemplate` 相同，它会覆盖站点级别的配置       |
| `description`   | `string`            | -      | 页面的描述。它与 `config.description` 相同，它会覆盖站点级别的配置         |
| `head`          | `HeadConfig[]`      | -      | 指定要为当前页面注入的额外 head 标签。将附加在站点级配置注入的头部标签之后 |

### 使用示例

#### `title`

```yaml
---
title: VitePress
---
```

#### `titleTemplate`

```yaml
---
title: VitePress
titleTemplate: Vite & Vue powered static site generator
---
```

#### `description`

```yaml
---
description: VitePress
---
```

#### `head`

```yaml
---
head:
  - - meta
    - name: description
      content: hello
  - - meta
    - name: keywords
      content: super duper SEO
---
```

#### HeadConfig 类型定义

```typescript
type HeadConfig = [string, Record<string, string>] | [string, Record<string, string>, string]
```

## 仅默认主题配置选项

以下 frontmatter 选项仅在使用默认主题时适用。

| 配置项        | 类型                                            | 默认值 | 说明                                                                                                                                             |
| ------------- | ----------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `layout`      | `doc \| home \| page`                           | `doc`  | 指定页面的布局。`doc`：默认文档样式；`home`：主页布局（可配合 `hero` 和 `features`）；`page`：无样式布局，用于完全自定义页面                     |
| `hero`        | -                                               | -      | 当 `layout` 设置为 `home` 时，定义主页 hero 部分的内容。详见：[默认主题：主页](https://vitepress.dev/zh/reference/default-theme-home-page)       |
| `features`    | -                                               | -      | 当 `layout` 设置为 `home` 时，定义 features 部分中显示的项目。详见：[默认主题：主页](https://vitepress.dev/zh/reference/default-theme-home-page) |
| `navbar`      | `boolean`                                       | `true` | 是否显示导航栏                                                                                                                                   |
| `sidebar`     | `boolean`                                       | `true` | 是否显示侧边栏                                                                                                                                   |
| `aside`       | `boolean \| 'left'`                             | `true` | 定义侧边栏组件在 `doc` 布局中的位置。`false`：禁用；`true`：右侧；`'left'`：左侧                                                                 |
| `outline`     | `number \| [number, number] \| 'deep' \| false` | `2`    | 大纲中显示的标题级别。覆盖 `config.themeConfig.outline.level`                                                                                    |
| `lastUpdated` | `boolean \| Date`                               | `true` | 是否在页脚显示最后更新时间。指定日期时间则显示该时间而非 git 修改时间戳                                                                          |
| `editLink`    | `boolean`                                       | `true` | 是否在页脚显示编辑链接                                                                                                                           |
| `footer`      | `boolean`                                       | `true` | 是否显示页脚                                                                                                                                     |
| `pageClass`   | `string`                                        | -      | 将额外的类名称添加到特定页面，用于自定义样式                                                                                                     |

### 默认主题使用示例

#### `layout`

```yaml
---
layout: doc # 或 home、page
---
```

#### `navbar` / `sidebar` / `footer`

```yaml
---
navbar: false
sidebar: false
footer: false
---
```

#### `aside`

```yaml
---
aside: false # 禁用侧边栏容器
# aside: true   # 右侧（默认）
# aside: 'left' # 左侧
---
```

#### `lastUpdated`

```yaml
---
lastUpdated: false
# 或指定具体日期
# lastUpdated: 2024-01-01
---
```

#### `editLink`

```yaml
---
editLink: false
---
```

#### `pageClass`

```yaml
---
pageClass: custom-page-class
---
```

然后在 `.vitepress/theme/custom.css` 中自定义样式：

```css
.custom-page-class {
  /* 特定页面的样式 */
}
```
