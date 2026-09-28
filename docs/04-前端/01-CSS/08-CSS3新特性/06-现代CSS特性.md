---
title: 现代 CSS 特性
description: 全面掌握 CSS 嵌套、@layer、:has() 选择器、容器查询、@property、View Transitions API、滚动驱动动画等现代 CSS 核心特性
category: 前端

---

# 现代 CSS 特性

## 背景与动机

近年来，CSS 规范引入了大量革命性的新特性，这些特性显著提升了 CSS 的表达能力和开发效率，正在彻底改变前端开发的编写方式。

### 为什么需要现代 CSS 特性？

传统 CSS 开发面临以下挑战：

1. **样式组织混乱**：依赖预处理器（Sass/Less）实现嵌套和变量
2. **优先级冲突**：样式覆盖难以管理，`!important` 滥用
3. **响应式局限**：只能基于视口尺寸，无法实现组件级响应式
4. **动画能力有限**：复杂动画需要 JavaScript，性能不佳
5. **选择器能力不足**：无法根据子元素状态选择父元素

现代 CSS 特性解决了这些问题：

- **原生嵌套**：无需预处理器即可实现层级化样式
- **显式层叠控制**：通过 `@layer` 精确管理样式优先级
- **容器查询**：基于组件容器尺寸实现真正的响应式设计
- **强大选择器**：`:has()` 实现"父选择器"功能
- **高级动画**：View Transitions、滚动驱动动画等
- **类型化变量**：`@property` 让 CSS 变量具备类型和动画能力

### 现代 CSS 特性全景图

```mermaid
graph TD
    A[现代 CSS 特性] --> B[语法增强]
    A --> C[选择器增强]
    A --> D[响应式增强]
    A --> E[变量与类型]
    A --> F[视觉效果]
    A --> G[性能优化]
    
    B --> B1[CSS 嵌套]
    B --> B2[@layer 层叠层]
    B --> B3[@scope 作用域]
    
    C --> C1[:has 关系选择器]
    C --> C2[:is/:where]
    C --> C3[:not 多参数]
    
    D --> D1[容器查询]
    D --> D2[样式查询]
    D --> D3[现代视口单位]
    
    E --> E1[@property]
    E --> E2[类型系统]
    
    F --> F1[View Transitions]
    F --> F2[滚动驱动动画]
    F --> F3[@starting-style]
    
    G --> G1[content-visibility]
    G --> G2[contain]
    
```

### 浏览器支持概览

| 特性 | Chrome | Firefox | Safari | 状态 |
|------|--------|---------|--------|------|
| CSS 嵌套 | 120+ | 117+ | 17.2+ | ✅ 稳定 |
| @layer | 99+ | 97+ | 15.4+ | ✅ 稳定 |
| :has() | 105+ | 121+ | 15.4+ | ✅ 稳定 |
| 容器查询 | 105+ | 110+ | 16+ | ✅ 稳定 |
| @property | 85+ | 128+ | 16.4+ | ✅ 稳定 |
| View Transitions（同文档） | 111+ | 144+ | 18+ | ✅ 稳定 |
| 样式查询 | 111+ | 151+ | 18+ | ✅ 稳定（自定义属性） |
| @scope | 118+ | 146+ | 17.4+ | ✅ 稳定 |
| 滚动驱动动画 | 115+ | 144+ | 26+ | ✅ 稳定 |

## 核心概念

### CSS 特性演进时间线

```
CSS 演进历程：

2020 ─── @property (Chrome 85)
         │
2022 ─── @layer (Chrome 99)
         │
2022 ─── 容器查询 / :has() (Chrome 105)
         │
2023 ─── View Transitions (Chrome 111)
         │
2023 ─── 滚动驱动动画 (Chrome 115)
         │
2023 ─── CSS 嵌套 (Chrome 120)
```

## 深入原理

### CSS 嵌套（Nesting）工作原理

CSS 嵌套允许在规则内部编写子规则，无需预处理器即可实现层级化的样式组织。

#### 编译原理

浏览器在解析嵌套 CSS 时，会将其转换为标准的选择器：

```css
/* 嵌套写法 */
.card {
  padding: 1rem;
  
  & .title {
    font-size: 1.5rem;
  }
}

/* 等价于 */
.card {
  padding: 1rem;
}

.card .title {
  font-size: 1.5rem;
}
```

#### & 符号的作用

`&` 代表父选择器。以 `.`、`:`、`#`、`[` 等符号开头的嵌套选择器可省略 `&`（隐式引用父选择器）；以标签选择器开头或 `&` 不在首位时必须显式写出：

```css
.card {
  /* 后代选择器 */
  & .title { }          /* .card .title */
  
  /* 父选择器在前 */
  .wrapper & { }        /* .wrapper .card */
  
  /* BEM 修饰符 */
  &--featured { }       /* .card--featured */
  
  /* BEM 元素 */
  &__title { }          /* .card__title */
  
  /* 复合选择器 */
  .section & &--large { } /* .section .card .card--large */
}
```

#### 嵌套 @规则

嵌套不仅支持选择器，还支持 @规则：

```css
.component {
  font-size: 1rem;

  /* 嵌套媒体查询 */
  @media (min-width: 768px) {
    font-size: 1.125rem;
  }

  /* 嵌套容器查询 */
  @container (min-width: 400px) {
    display: flex;
  }

  /* 嵌套特性检测 */
  @supports (backdrop-filter: blur(10px)) {
    backdrop-filter: blur(10px);
  }
}
```

### CSS 层叠层（@layer）原理

`@layer` 允许开发者显式控制 CSS 样式的层叠顺序，解决样式优先级冲突问题。

#### 层叠顺序规则

```
CSS 层叠优先级（从低到高）：

┌─────────────────────────────────────┐
│  @layer base                        │  ← 最低优先级
├─────────────────────────────────────┤
│  @layer components                  │
├─────────────────────────────────────┤
│  @layer utilities                   │
├─────────────────────────────────────┤
│  无 @layer 的样式                    │  ← 最高优先级
├─────────────────────────────────────┤
│  !important 声明                     │  ← 最高（反向）
└─────────────────────────────────────┘
```

#### 层叠计算流程

```
样式优先级计算：

1. 确定样式所属层级
   └─ @layer 内 → 层优先级
   └─ @layer 外 → 高于所有层

2. 在同一层内计算特异性
   └─ ID 选择器 > 类选择器 > 标签选择器

3. 源代码顺序
   └─ 后定义的样式覆盖先定义的
```

### :has() 关系选择器原理

`:has()` 被称为 CSS 的"父选择器"，可以根据子元素或后续兄弟元素的状态来选择父元素。

#### 匹配机制

```
:has() 匹配流程：

┌─────────────────────────────────────┐
│           DOM 树                    │
│  ┌─────────┐                        │
│  │  form   │                        │
│  │ ┌─────┐ │                        │
│  │ │input│ │ ← 检查 input 状态     │
│  │ │:invalid│                       │
│  │ └─────┘ │                        │
│  └─────────┘                        │
│       ↑                              │
│  form:has(:invalid) 匹配成功        │
└─────────────────────────────────────┘
```

#### 性能考虑

`:has()` 的性能影响：

- **简单选择器**：性能影响较小
- **深层嵌套**：可能导致性能问题
- **动态内容**：需要实时检查 DOM 变化

```css
/* ✅ 推荐：简单选择器 */
.card:has(img) { }

/* ⚠️ 谨慎：深层嵌套 */
.card:has(.content .wrapper .image) { }

/* ✅ 推荐：限制范围 */
.card:has(> img) { }  /* 直接子元素 */
```

### 容器查询原理

容器查询允许根据容器尺寸而非视口尺寸应用样式，是组件级响应式设计的核心方案。

#### 工作原理

```
容器查询工作流程：

┌─────────────────────────────────────┐
│  容器元素 (container-type: inline-size) │
│  ┌───────────────────────────────┐  │
│  │  子元素内容                    │  │
│  │                               │  │
│  │  @container (min-width: 400px)│  │
│  │  └─ 检查容器宽度               │  │
│  │  └─ 应用对应样式               │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

#### 容器类型对比

| 类型 | 说明 | 使用场景 | 性能 |
|------|------|---------|------|
| `inline-size` | 查询行向尺寸（宽度） | ✅ 最常用 | 较好 |
| `size` | 查询行向和块向尺寸 | 需要高度查询时 | 较差 |
| `normal` | 默认值，不作为查询容器 | — | — |

### @property 类型系统原理

`@property` 允许为 CSS 自定义属性注册类型、初始值和继承性，使变量具备类型约束和动画能力。

#### 类型注册流程

```
@property 注册流程：

1. 声明属性名称
   └─ --property-name

2. 定义语法类型
   └─ syntax: '<color>' | '<length>' | ...

3. 设置继承性
   └─ inherits: true | false

4. 指定初始值
   └─ initial-value: <value>
```

#### 动画能力对比

```css
/* 未注册的变量：无法动画 */
:root {
  --color: #007bff;
}

.element {
  background: var(--color);
  transition: --color 0.3s;  /* ❌ 无效 */
}

/* 注册的变量：可以动画 */
@property --color {
  syntax: '<color>';
  inherits: false;
  initial-value: #007bff;
}

.element {
  background: var(--color);
  transition: --color 0.3s;  /* ✅ 有效 */
}
```

### View Transitions API 原理

View Transitions API 提供了一种简单的方式在不同 DOM 状态之间创建平滑的过渡动画。

#### 过渡流程

```
View Transition 工作流程：

┌─────────────────────────────────────┐
│  1. 调用 startViewTransition()      │
├─────────────────────────────────────┤
│  2. 浏览器捕获旧状态截图            │
│     └─ ::view-transition-old        │
├─────────────────────────────────────┤
│  3. 执行 DOM 更新回调               │
├─────────────────────────────────────┤
│  4. 浏览器捕获新状态截图            │
│     └─ ::view-transition-new        │
├─────────────────────────────────────┤
│  5. 执行过渡动画                    │
│     └─ old → new 平滑过渡           │
└─────────────────────────────────────┘
```

## 代码示例

### CSS 嵌套（Nesting）

#### 基础语法

```css
.card {
  padding: 1rem;
  background: #fff;
  border-radius: 8px;

  /* 后代选择器 */
  & .title {
    font-size: 1.5rem;
    font-weight: bold;
  }

  & .body {
    margin-top: 0.5rem;
    line-height: 1.6;
  }

  /* 伪类 */
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  /* BEM 修饰符 */
  &--featured {
    border-left: 4px solid #007bff;
  }
}
```

#### 嵌套 @规则

```css
.component {
  font-size: 1rem;

  /* 嵌套媒体查询 */
  @media (min-width: 768px) {
    font-size: 1.125rem;
  }

  /* 嵌套容器查询 */
  @container (min-width: 400px) {
    display: flex;
  }

  /* 嵌套特性检测 */
  @supports (backdrop-filter: blur(10px)) {
    backdrop-filter: blur(10px);
  }
}
```

#### 隐式嵌套

```css
/* 省略 & 的写法 */
.nav {
  .item {
    padding: 0.5rem;

    .link {
      color: #007bff;
    }
  }
}

/* 等价于 */
.nav .item {
  padding: 0.5rem;
}

.nav .item .link {
  color: #007bff;
}
```

#### 完整示例：卡片组件

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>CSS 嵌套示例</title>
  <style>
    .card {
      max-width: 400px;
      margin: 20px auto;
      padding: 1.5rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s, box-shadow 0.3s;

      & .card-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;

        & .avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
        }

        & .info {
          & .name {
            font-weight: 600;
            font-size: 1.1rem;
          }

          & .date {
            font-size: 0.875rem;
            color: #666;
          }
        }
      }

      & .card-body {
        line-height: 1.6;
        color: #333;
      }

      & .card-footer {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #eee;
        display: flex;
        gap: 1rem;

        & .action-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;

          &.primary {
            background: #007bff;
            color: white;

            &:hover {
              background: #0056b3;
            }
          }

          &.secondary {
            background: #f0f0f0;
            color: #333;

            &:hover {
              background: #e0e0e0;
            }
          }
        }
      }

      /* 悬停效果 */
      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      }

      /* 特色卡片 */
      &--featured {
        border: 2px solid #007bff;
        background: linear-gradient(135deg, #f8f9ff, #fff);
      }
    }
  </style>
</head>
<body style="background: #f5f5f5; padding: 40px;">
  <div class="card">
    <div class="card-header">
      <div class="avatar"></div>
      <div class="info">
        <div class="name">张三</div>
        <div class="date">2024-01-15</div>
      </div>
    </div>
    <div class="card-body">
      <p>这是一个使用 CSS 嵌套编写的卡片组件示例。嵌套语法让样式组织更加清晰和直观。</p>
    </div>
    <div class="card-footer">
      <button class="action-btn primary">点赞</button>
      <button class="action-btn secondary">评论</button>
    </div>
  </div>
</body>
</html>
```

### CSS 层叠层（@layer）

#### 基本用法

```css
/* 声明层的顺序 */
@layer base, components, utilities;

/* 定义各层内容 */
@layer base {
  h1 { font-size: 2rem; margin: 0; }
  p { line-height: 1.6; }
}

@layer components {
  .card { padding: 1rem; border-radius: 8px; }
  .button { padding: 0.5rem 1rem; }
}

@layer utilities {
  .hidden { display: none !important; }
  .text-center { text-align: center; }
}
```

#### 实际应用场景

```css
/* 完整的项目层叠结构 */
@layer reset, base, components, utilities;

/* 重置层 */
@layer reset {
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
}

/* 基础层 */
@layer base {
  body {
    font-family: system-ui, sans-serif;
    line-height: 1.5;
    color: #333;
  }

  a {
    color: #007bff;
    text-decoration: none;
  }
}

/* 组件层 */
@layer components {
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    border: none;
    font-weight: 500;
  }

  .btn-primary {
    background: #007bff;
    color: white;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }
}

/* 工具层 */
@layer utilities {
  .mt-4 { margin-top: 1rem; }
  .mb-4 { margin-bottom: 1rem; }
  .text-center { text-align: center; }
  .hidden { display: none; }
}

/* 第三方库样式放入低优先级层 */
@layer third-party {
  @import url('bootstrap.css');
}
```

#### @layer 与 @import

```css
/* 将外部样式表导入到指定层 */
@import url('reset.css') layer(reset);
@import url('base.css') layer(base);
@import url('components.css') layer(components);
```

#### @layer 与优先级

```css
@layer low {
  .text { color: red; }     /* 低优先级 */
}

@layer high {
  .text { color: blue; }    /* 高优先级 */
}

/* 不在任何层中，优先级最高 */
.text { color: green; }
```

### :has() 关系选择器

#### 基础用法

```css
/* 选择包含 img 的 a 标签 */
a:has(img) {
  display: block;
  border: 1px solid #eee;
}

/* 选择包含错误输入的表单 */
form:has(:invalid) {
  border: 2px solid #dc3545;
}

/* 选择子元素被选中的标签 */
label:has(input:checked) {
  font-weight: bold;
  color: #007bff;
}
```

#### 基于兄弟元素选择

```css
/* 选择后面紧跟 p 的 h2 */
h2:has(+ p) {
  margin-bottom: 0.5em;
}

/* 选择后面有 figcaption 的 figure */
figure:has(figcaption) {
  padding-bottom: 2em;
}

/* 选择前面有 h1 的 p */
p:has(~ h1) {
  font-size: 1.2rem;
}
```

#### 复杂选择

```css
/* 选择包含特色图片的卡片 */
.card:has(img[src*="featured"]) {
  border: 2px solid gold;
}

/* 选择空卡片 */
.card:not(:has(*)) {
  display: none;
}

/* 选择包含多个条件的元素 */
section:has(h2):has(p) {
  padding: 2rem;
}

/* 结合 :not() 使用 */
.card:not(:has(.badge)) {
  border: 1px solid #ddd;
}
```

#### 实际应用示例

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>:has() 选择器示例</title>
  <style>
    /* 表单验证反馈 */
    .form-group {
      margin-bottom: 1rem;
    }

    .form-group:has(input:invalid) {
      background: #fff5f5;
      padding: 1rem;
      border-radius: 8px;
    }

    .form-group:has(input:invalid) .error-message {
      display: block;
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .form-group:has(input:valid) .success-icon {
      display: inline;
      color: #28a745;
    }

    .error-message {
      display: none;
    }

    .success-icon {
      display: none;
    }

    /* 卡片布局自适应 */
    .grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }

    /* 当有3个卡片时，使用3列布局 */
    .grid:has(.card:nth-child(3)) {
      grid-template-columns: repeat(3, 1fr);
    }

    /* 卡片样式 */
    .card {
      padding: 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
    }

    /* 包含图片的卡片特殊样式 */
    .card:has(img) {
      display: flex;
      flex-direction: column;
    }

    .card:has(img) img {
      width: 100%;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    /* 暗色主题下包含图片的卡片 */
    .dark-theme .card:has(img) {
      background: #2d2d2d;
      border-color: #444;
    }
  </style>
</head>
<body>
  <h2>表单验证示例</h2>
  <form>
    <div class="form-group">
      <label>邮箱：</label>
      <input type="email" required>
      <span class="error-message">请输入有效的邮箱地址</span>
      <span class="success-icon">✓</span>
    </div>
    <div class="form-group">
      <label>用户名：</label>
      <input type="text" required minlength="3">
      <span class="error-message">用户名至少3个字符</span>
      <span class="success-icon">✓</span>
    </div>
  </form>

  <h2>卡片布局示例</h2>
  <div class="grid">
    <div class="card">
      <p>纯文本卡片</p>
    </div>
    <div class="card">
      <img src="https://picsum.photos/200/150?random=1" alt="图片">
      <p>带图片的卡片</p>
    </div>
    <div class="card">
      <img src="https://picsum.photos/200/150?random=2" alt="图片">
      <p>另一张带图片的卡片</p>
    </div>
  </div>
</body>
</html>
```

### 容器查询

#### 基础用法

```css
/* 定义容器 */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* 简写 */
.card-container {
  container: card / inline-size;
}

/* 容器查询 */
@container card (min-width: 400px) {
  .card {
    display: flex;
    gap: 1rem;
  }
}
```

#### 容器查询单位

```css
.card-container {
  container-type: inline-size;
}

/* 使用容器查询单位 */
.card-title {
  /* 字体大小基于容器宽度 */
  font-size: clamp(1rem, 3cqi, 2rem);
  padding: 1cqi 2cqi;
}

.card-image {
  /* 图片尺寸基于容器宽度 */
  width: 100cqi;
  max-width: 400px;
}
```

#### 响应式卡片完整示例

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>容器查询示例</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }

    .container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* 定义容器 */
    .card-container {
      container-type: inline-size;
      background: white;
      border-radius: 12px;
      overflow: hidden;
    }

    .card {
      display: grid;
      gap: 1rem;
      padding: 1rem;
    }

    .card-image {
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      border-radius: 8px;
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .card-description {
      color: #666;
      line-height: 1.6;
    }

    /* 容器宽度 >= 400px */
    @container (min-width: 400px) {
      .card {
        grid-template-columns: 150px 1fr;
      }

      .card-image {
        aspect-ratio: 1;
      }
    }

    /* 容器宽度 >= 600px */
    @container (min-width: 600px) {
      .card {
        grid-template-columns: 200px 1fr;
        padding: 1.5rem;
      }

      .card-title {
        font-size: 1.5rem;
      }
    }

    /* 调整容器大小演示 */
    .resize-handle {
      resize: horizontal;
      overflow: auto;
      border: 2px dashed #ccc;
      min-width: 250px;
      max-width: 100%;
    }
  </style>
</head>
<body>
  <h1>容器查询示例</h1>
  <p>拖动右下角调整容器大小，观察卡片布局变化</p>

  <div class="container">
    <div class="resize-handle">
      <div class="card-container">
        <div class="card">
          <img src="https://picsum.photos/400/300?random=1" class="card-image" alt="图片">
          <div>
            <h3 class="card-title">卡片标题</h3>
            <p class="card-description">这是一个响应式卡片示例。当容器宽度变化时，卡片布局会自动调整。</p>
          </div>
        </div>
      </div>
    </div>

    <div class="resize-handle">
      <div class="card-container">
        <div class="card">
          <img src="https://picsum.photos/400/300?random=2" class="card-image" alt="图片">
          <div>
            <h3 class="card-title">另一张卡片</h3>
            <p class="card-description">每张卡片都是独立的容器，可以根据自己的宽度调整布局。</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
```

### @property 自定义属性注册

#### 基础语法

```css
@property --property-name {
  syntax: '<type>';
  inherits: true | false;
  initial-value: <value>;
}
```

#### 支持的类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `<length>` | 长度值 | `0px`, `16px` |
| `<number>` | 数值 | `0`, `1.5` |
| `<percentage>` | 百分比 | `0%`, `50%` |
| `<length-percentage>` | 长度或百分比 | `0px`, `50%` |
| `<color>` | 颜色值 | `#000`, `red` |
| `<angle>` | 角度值 | `0deg`, `45deg` |
| `<time>` | 时间值 | `0s`, `300ms` |
| `<resolution>` | 分辨率 | `96dpi` |
| `<url>` | URL 值 | `url(...)` |
| `<integer>` | 整数 | `0`, `1` |
| `*` | 任意值 | 任意 |

#### 使用示例

```css
/* 注册颜色变量 */
@property --primary-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #007bff;
}

/* 注册长度变量 */
@property --spacing {
  syntax: '<length>';
  inherits: false;
  initial-value: 16px;
}

/* 注册角度变量 */
@property --gradient-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

/* 使用注册的变量 */
.element {
  background: var(--primary-color);
  padding: var(--spacing);
}
```

#### @property 实现动画

```css
/* 注册可动画的颜色变量 */
@property --hue {
  syntax: '<number>';
  inherits: false;
  initial-value: 0;
}

/* 渐变动画 */
.animated-gradient {
  background: linear-gradient(
    calc(var(--hue) * 1deg),
    #007bff, #7c3aed, #db2777
  );
  animation: hue-rotate 3s linear infinite;
}

@keyframes hue-rotate {
  to {
    --hue: 360;
  }
}

/* 边框宽度动画 */
@property --border-width {
  syntax: '<length>';
  inherits: false;
  initial-value: 0px;
}

.animated-border {
  border: var(--border-width) solid #007bff;
  transition: --border-width 0.3s ease;
}

.animated-border:hover {
  --border-width: 4px;
}
```

#### JavaScript 注册

```javascript
// 使用 JavaScript 注册自定义属性
CSS.registerProperty({
  name: '--primary-color',
  syntax: '<color>',
  inherits: true,
  initialValue: '#007bff',
});

// 注册数值类型
CSS.registerProperty({
  name: '--progress',
  syntax: '<number>',
  inherits: false,
  initialValue: '0',
});
```

### View Transitions API

#### 基础用法

```javascript
// 启动视图过渡
document.startViewTransition(() => {
  // 更新 DOM
  updateTheDOMSomeHow();
});
```

#### 页面导航过渡

```css
/* 旧视图淡出 */
::view-transition-old(root) {
  animation: fade-out 0.3s ease;
}

/* 新视图淡入 */
::view-transition-new(root) {
  animation: fade-in 0.3s ease;
}

@keyframes fade-out {
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
}
```

#### 自定义过渡效果

```css
/* 元素级过渡 */
.card {
  view-transition-name: card;
}

::view-transition-old(card) {
  animation: slide-out 0.3s ease;
}

::view-transition-new(card) {
  animation: slide-in 0.3s ease;
}

@keyframes slide-out {
  to { transform: translateX(-100%); opacity: 0; }
}

@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
}
```

#### 主题切换过渡

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>View Transitions 主题切换</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #333333;
    }

    .dark {
      --bg: #1a1a1a;
      --text: #ffffff;
    }

    body {
      background: var(--bg);
      color: var(--text);
      transition: background 0.3s, color 0.3s;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: system-ui, sans-serif;
    }

    .toggle-btn {
      padding: 1rem 2rem;
      font-size: 1.125rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      background: var(--text);
      color: var(--bg);
      transition: transform 0.2s;
    }

    .toggle-btn:hover {
      transform: scale(1.05);
    }

    /* View Transition 样式 */
    ::view-transition-old(root),
    ::view-transition-new(root) {
      animation: none;
      mix-blend-mode: normal;
    }

    ::view-transition-old(root) {
      z-index: 1;
    }

    ::view-transition-new(root) {
      z-index: 9999;
    }
  </style>
</head>
<body>
  <h1>View Transitions API</h1>
  <p>点击按钮切换主题，观察平滑过渡效果</p>
  <button class="toggle-btn" onclick="toggleTheme(event)">
    切换主题
  </button>

  <script>
    function toggleTheme(event) {
      // 检查浏览器支持
      if (!document.startViewTransition) {
        document.documentElement.classList.toggle('dark');
        return;
      }

      // 启动视图过渡
      document.startViewTransition(() => {
        document.documentElement.classList.toggle('dark');
      });
    }
  </script>
</body>
</html>
```

#### SPA 路由过渡

```javascript
function navigateTo(url) {
  // 检查浏览器支持
  if (!document.startViewTransition) {
    location.href = url;
    return;
  }

  // 启动视图过渡
  document.startViewTransition(async () => {
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    document.querySelector('main').innerHTML = doc.querySelector('main').innerHTML;
  });
}
```

### @scope 作用域样式

#### 基础语法

```css
/* 将样式限制在 .card 内部 */
@scope (.card) {
  .title {
    font-size: 1.5rem;
  }

  .body {
    line-height: 1.6;
  }
}
```

#### 带下限的作用域

```css
/* 样式作用于 .card 内部，但不作用于 .card-content 内部 */
@scope (.card) to (.card-content) {
  .title {
    color: blue;
  }
}
```

#### 与 Shadow DOM 的区别

| 特性 | @scope | Shadow DOM |
|------|--------|------------|
| 样式隔离 | 限定范围 | 完全隔离 |
| JavaScript | 无影响 | 隔离 DOM |
| 选择器穿透 | 支持 | 需 CSS 变量 |
| 复杂度 | 低 | 高 |

### @starting-style

#### 基础用法

```css
.dialog {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.3s, transform 0.3s;

  /* 定义首次渲染时的初始样式 */
  @starting-style {
    opacity: 0;
    transform: translateY(20px);
  }
}

.dialog[open] {
  opacity: 1;
  transform: translateY(0);
}
```

#### 应用场景

```css
/* 弹窗入场动画 */
.modal {
  transition: opacity 0.3s, transform 0.3s;
  opacity: 0;
  transform: scale(0.9);

  @starting-style {
    opacity: 0;
    transform: scale(0.9);
  }
}

.modal.active {
  opacity: 1;
  transform: scale(1);
}

/* 元素首次出现动画 */
.notification {
  animation: slide-in 0.3s ease;

  @starting-style {
    transform: translateX(100%);
  }
}

@keyframes slide-in {
  to {
    transform: translateX(0);
  }
}
```

### 滚动驱动动画

#### 基础语法

```css
.scroll-progress {
  transform: scaleX(0);
  transform-origin: left;
  animation: progress linear;
  animation-timeline: scroll();
}

@keyframes progress {
  to { transform: scaleX(1); }
}
```

#### 滚动进度条

```css
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: #007bff;
  transform-origin: left;
  transform: scaleX(0);
  animation: scale-x linear;
  animation-timeline: scroll();
}

@keyframes scale-x {
  to { transform: scaleX(1); }
}
```

#### 视差滚动

```css
.parallax-bg {
  animation: parallax linear;
  animation-timeline: scroll();
}

@keyframes parallax {
  from { transform: translateY(0); }
  to { transform: translateY(-200px); }
}
```

#### 元素滚动驱动

```css
.reveal-element {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## 最佳实践

### 渐进增强策略

```css
/* 使用 @supports 检测特性支持 */
@supports (selector(:has(*))) {
  .card:has(img) {
    display: flex;
  }
}

@supports (container-type: inline-size) {
  .card-container {
    container-type: inline-size;
  }
}

/* 使用 CSS 嵌套作为增强 */
.card {
  padding: 1rem;
}

@supports (selector(&)) {
  .card {
    padding: 1rem;

    &:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
  }
}
```

### 特性组合使用

```css
@layer components {
  .card {
    container-type: inline-size;

    & .title {
      font-size: clamp(1rem, 3cqi, 1.5rem);
    }

    @container (min-width: 400px) {
      display: flex;
    }
  }
}
```

### 性能考虑

- `:has()` 在复杂选择器中可能影响性能，避免深层嵌套
- 容器查询的 `container-type: size` 比 `inline-size` 开销更大
- `@layer` 不影响运行时性能，仅影响层叠顺序
- View Transitions 会创建截图，大元素可能消耗内存
- 滚动驱动动画由浏览器优化，性能优于 JavaScript 滚动监听

### 浏览器兼容性处理

```css
/* 提供回退方案 */
.card {
  /* 基础样式 */
  padding: 1rem;
}

/* 嵌套增强 */
@supports (selector(&)) {
  .card {
    & .title {
      font-size: 1.5rem;
    }
  }
}

/* 容器查询增强 */
@supports (container-type: inline-size) {
  .card-container {
    container-type: inline-size;
  }

  @container (min-width: 400px) {
    .card {
      display: flex;
    }
  }
}
```

## 常见问题

### Q1: CSS 嵌套和 Sass 嵌套有什么区别？

**A**: 主要区别：

| 特性 | CSS 嵌套 | Sass 嵌套 |
|------|---------|----------|
| 执行环境 | 浏览器原生 | 预处理器编译 |
| 性能 | 无额外开销 | 编译时处理 |
| 语法 | 标签选择器需 `&`，其余可省略 | 可选 `&` |
| 功能 | 基础嵌套 | 完整功能（循环、条件等） |

```css
/* CSS 嵌套（标签选择器必须写 &，其余可省略） */
.card {
  & div { }    /* 标签选择器需要 & */
  .title { }   /* 以 . 开头可省略 & */
}

/* Sass 嵌套 */
.card {
  .title { }  /* 可以省略 & */
}
```

### Q2: @layer 会影响 !important 的优先级吗？

**A**: 对 `!important` 声明，层叠顺序会**反转**：越早声明的层优先级越高，无层样式的 `!important` 反而最低：

```css
@layer base {
  .text { color: red !important; }  /* 最先声明的层，!important 优先级最高 */
}

@layer utilities {
  .text { color: blue !important; } /* 低于 base 层的 !important */
}

.text { color: green !important; }  /* 无层的 !important 优先级最低 */
```

### Q3: :has() 的性能影响大吗？

**A**: 取决于选择器复杂度：

```css
/* ✅ 性能好：简单选择器 */
.card:has(img) { }

/* ⚠️ 谨慎使用：深层嵌套 */
.card:has(.content .wrapper .image) { }

/* ✅ 推荐：限制范围 */
.card:has(> img) { }  /* 直接子元素 */
```

### Q4: 容器查询和媒体查询可以同时使用吗？

**A**: 可以，它们解决不同的问题：

```css
/* 媒体查询：基于视口 */
@media (min-width: 768px) {
  .container {
    flex-direction: row;
  }
}

/* 容器查询：基于组件容器 */
@container (min-width: 400px) {
  .card {
    display: flex;
  }
}
```

### Q5: @property 注册的变量可以继承吗？

**A**: 取决于 `inherits` 设置：

```css
@property --color {
  syntax: '<color>';
  inherits: true;  /* 可以继承 */
  initial-value: #007bff;
}

@property --size {
  syntax: '<length>';
  inherits: false;  /* 不能继承 */
  initial-value: 16px;
}

.parent {
  --color: red;
  --size: 20px;
}

.child {
  color: var(--color);  /* 继承 red */
  font-size: var(--size);  /* 使用初始值 16px */
}
```

### Q6: View Transitions API 在 Firefox 中如何使用？

**A**: Firefox 144（2025 年 10 月）起已支持同文档视图过渡；跨文档过渡各浏览器支持不一。旧浏览器可用 JavaScript 回退：

```javascript
function transition(callback) {
  if (document.startViewTransition) {
    document.startViewTransition(callback);
  } else {
    // 回退方案：简单的淡入淡出
    document.body.style.opacity = '0';
    setTimeout(() => {
      callback();
      document.body.style.opacity = '1';
    }, 300);
  }
}
```

### Q7: 滚动驱动动画如何添加 JavaScript 回退？

**A**: 使用 Intersection Observer 作为回退：

```javascript
// 检查浏览器支持
if (!CSS.supports('animation-timeline', 'view()')) {
  // 使用 Intersection Observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => {
    observer.observe(el);
  });
}
```

## 参考资源

- [MDN - CSS Nesting](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_nesting)
- [MDN - @layer](https://developer.mozilla.org/zh-CN/docs/Web/CSS/@layer)
- [MDN - :has()](https://developer.mozilla.org/zh-CN/docs/Web/CSS/:has)
- [MDN - Container Queries](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_containment/Container_queries)
- [MDN - @property](https://developer.mozilla.org/zh-CN/docs/Web/CSS/@property)
- [MDN - View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [MDN - Scroll-driven Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-driven_animations)
- [Can I Use](https://caniuse.com/) - 浏览器兼容性查询
- [CSS Nesting Demo](https://codepen.io/argyleink/pen/KKvyqXj) - CSS 嵌套示例
- [Container Queries Playground](https://codepen.io/argyleink/pen/LYvKYKv) - 容器查询实验场
