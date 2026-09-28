---
title: 全局 API
description: 讲解 Vue 2 全局 API：Vue.extend/nextTick/set/delete/directive/filter/component/use/mixin/compile/observable/version 的用法与区别
keywords: [Vue, 全局 API]
category: Vue
tags: [Vue]
---
# 全局 API

## 概述

全局 API 是直接挂载在 Vue 构造函数上的方法，用于全局配置、注册组件/指令/过滤器、以及执行全局操作。这些 API 在调用 `new Vue()` 创建实例之前使用，影响所有 Vue 实例。

### 核心特点

- **全局作用域**：影响所有后续创建的 Vue 实例
- **配置性质**：通常在应用初始化阶段调用
- **不可逆性**：部分操作（如 `Vue.mixin`）一旦执行无法撤销

### API 分类

| 分类       | API                                            | 用途                   |
| ---------- | ---------------------------------------------- | ---------------------- |
| 构造器扩展 | `Vue.extend`                                   | 创建可复用的组件构造器 |
| 响应式操作 | `Vue.set`、`Vue.delete`、`Vue.observable`      | 手动管理响应式数据     |
| 异步更新   | `Vue.nextTick`                                 | DOM 更新后执行回调     |
| 注册机制   | `Vue.component`、`Vue.directive`、`Vue.filter` | 全局注册可复用单元     |
| 扩展机制   | `Vue.use`、`Vue.mixin`                         | 插件和混入             |
| 工具方法   | `Vue.compile`、`Vue.version`                   | 编译和版本检测         |

---

## Vue.extend(options)

### 功能描述

创建一个 Vue 构造器的"子类"，返回一个新的构造器函数。参数是一个包含组件选项的对象。

### 核心原理

`Vue.extend` 内部实现基于原型继承：

1. 创建一个新构造器 `Sub`
2. 将 `Super.prototype` 作为 `Sub.prototype` 的原型
3. 合并选项（`options` 与 `Super.options`）
4. 缓存构造器以便复用

### 参数说明

| 参数    | 类型   | 必填 | 说明                            |
| ------- | ------ | ---- | ------------------------------- |
| options | Object | 是   | 组件选项对象，`data` 必须是函数 |

### 使用示例

#### 基础用法

```html
<div id="mount-point"></div>
```

```js
var Profile = Vue.extend({
  template: "<p>{{firstName}} {{lastName}} aka {{alias}}</p>",
  data: function () {
    return {
      firstName: "Walter",
      lastName: "White",
      alias: "Heisenberg"
    }
  }
})

new Profile().$mount("#mount-point")
```

输出结果：

```html
<p>Walter White aka Heisenberg</p>
```

#### 动态创建组件实例

```js
var AlertComponent = Vue.extend({
  template: `
    <div class="alert" :class="type">
      {{ message }}
      <button @click="close">×</button>
    </div>
  `,
  props: ["type", "message"],
  methods: {
    close() {
      this.$emit("close")
      this.$destroy()
      this.$el.remove()
    }
  }
})

function showAlert(type, message, duration = 3000) {
  var alert = new AlertComponent({
    propsData: { type, message }
  })

  alert.$mount()
  document.body.appendChild(alert.$el)

  if (duration > 0) {
    setTimeout(() => alert.close(), duration)
  }

  return alert
}

showAlert("success", "操作成功！")
```

#### 继承链

```js
var Base = Vue.extend({
  data: function () {
    return {
      baseData: "base"
    }
  },
  methods: {
    baseMethod: function () {
      console.log("base method")
    }
  }
})

var Extended = Base.extend({
  data: function () {
    return {
      extendedData: "extended"
    }
  },
  methods: {
    extendedMethod: function () {
      console.log("extended method")
    }
  }
})

var instance = new Extended()
instance.baseMethod()
instance.extendedMethod()
```

### 最佳实践

1. **组件复用**：适合需要编程式创建组件实例的场景
2. **propsData**：通过 `propsData` 传递初始 props 值
3. **手动挂载**：使用 `$mount()` 手动控制挂载时机

### 注意事项

- `data` 选项必须是函数，避免数据共享问题
- 返回的构造器可以继续调用 `extend` 形成继承链
- 与 `Vue.component` 的区别：`extend` 返回构造器，`component` 直接注册

### 组件精讲补充：extend + $mount 实战场景

> 💡 **组件精讲补充**：常规组件使用方式只能在规定位置渲染，但某些场景需要**动态渲染组件**或**命令式调用组件**，此时 `Vue.extend` + `$mount` 就派上用场了。

#### 场景一：命令式调用组件（如全局提示 Alert）

```js
import Vue from 'vue';
import Alert from './alert.vue';

// 在 Alert 组件上添加静态方法
Alert.newInstance = properties => {
  const props = properties || {};

  const Instance = new Vue({
    data: props,
    render (h) {
      return h(Alert, {
        props: props
      });
    }
  });

  const component = Instance.$mount();
  document.body.appendChild(component.$el);

  const alert = Instance.$children[0];

  return {
    add (noticeProps) {
      alert.add(noticeProps);
    },
    remove (name) {
      alert.remove(name);
    }
  };
};

export default Alert;
```

#### 场景二：动态渲染 .vue 文件

```js
import Vue from 'vue';
import Notification from './notification.vue';

const props = {};  // 传入组件的 props 选项

const Instance = new Vue({
  render (h) {
    return h(Notification, {
      props: props
    });
  }
});

const component = Instance.$mount();
document.body.appendChild(component.$el);

// 访问 Render 的 Notification 实例
const notification = Instance.$children[0];
```

#### $mount 的快捷方式

```js
// 方式 1：在 $mount 里指定挂载节点
new AlertComponent().$mount('#app');

// 方式 2：创建实例时指定 el 选项
new AlertComponent({ el: '#app' });

// 方式 3：先渲染再手动挂载
const component = new AlertComponent().$mount();
document.body.appendChild(component.$el);
```

> **注意**：手动挂载的组件，销毁时也需要手动调用 `$destroy()`，必要时用 `removeChild` 把节点从 DOM 中移除。

---

## Vue.nextTick([callback, context])

### 功能描述

在下次 DOM 更新循环结束之后执行延迟回调。Vue 的 DOM 更新是异步执行的，当数据变化时，Vue 会开启一个队列缓存同一事件循环内的所有数据变更，在"tick"结束后统一更新 DOM。

### 核心原理

Vue 的异步更新机制：

1. **数据变更**：触发 setter，通知 watcher
2. **队列缓冲**：将 watcher 添加到队列，去重
3. **异步刷新**：在下一个 tick 批量执行 watcher
4. **DOM 更新**：所有 watcher 执行完毕后 DOM 完成更新

`nextTick` 的实现策略（按优先级）：

- Promise.then
- MutationObserver
- setImmediate
- setTimeout(fn, 0)

### 参数说明

| 参数     | 类型     | 必填 | 说明                 |
| -------- | -------- | ---- | -------------------- |
| callback | Function | 否   | 回调函数             |
| context  | Object   | 否   | 回调函数的执行上下文 |

### 返回值

- 如果提供了 callback，返回 `undefined`
- 如果未提供 callback（2.1.0+），返回 Promise

### 使用示例

#### 基础用法

```js
var vm = new Vue({
  data: {
    message: "Hello"
  }
})

vm.message = "World"
console.log(vm.$el.textContent)

Vue.nextTick(function () {
  console.log(vm.$el.textContent)
})
```

#### Promise 用法（2.1.0+）

```js
Vue.nextTick().then(function () {
  console.log("DOM 已更新")
})

async function updateData() {
  vm.message = "New Value"
  await Vue.nextTick()
  console.log("DOM 已更新")
}
```

#### 组件内使用

```js
Vue.component("example", {
  template: "<div>{{ message }}</div>",
  data: function () {
    return {
      message: "未更新"
    }
  },
  methods: {
    updateMessage: function () {
      this.message = "已更新"
      this.$nextTick(function () {
        console.log(this.$el.textContent)
      })
    }
  }
})
```

#### 等待子组件渲染

```js
Vue.component("parent", {
  template: '<div><child ref="child"></child></div>',
  mounted: function () {
    this.$nextTick(function () {
      console.log(this.$refs.child.$el)
    })
  }
})
```

### 应用场景

| 场景           | 说明                          |
| -------------- | ----------------------------- |
| 获取更新后 DOM | 数据变更后获取最新的 DOM 状态 |
| 子组件访问     | 等待子组件完成渲染后操作      |
| 第三方库集成   | 在 DOM 更新后初始化第三方库   |
| 表单聚焦       | 动态显示输入框后自动聚焦      |

### 最佳实践

```js
new Vue({
  methods: {
    addItem: function () {
      this.items.push({ id: Date.now(), text: "New Item" })

      this.$nextTick(function () {
        var lastItem = this.$el.querySelector(".item:last-child")
        if (lastItem) {
          lastItem.scrollIntoView({ behavior: "smooth" })
        }
      })
    }
  }
})
```

### 注意事项

- Vue 不自带 Promise polyfill，IE 环境需自行引入
- 在同一个 tick 内多次修改数据，只会触发一次 DOM 更新
- 推荐使用实例方法 `this.$nextTick()` 以自动绑定上下文

---

## Vue.set(target, propertyName/index, value)

### 功能描述

向响应式对象添加一个 property，并确保这个新 property 同样是响应式的，且触发视图更新。

### 为什么需要 Vue.set？

Vue 2.x 使用 `Object.defineProperty` 实现响应式，无法检测对象属性的添加/删除和数组索引的直接赋值。

> 📖 **响应式限制的完整原理**（Observer/Dep/Watcher 机制、数组方法拦截、defineReactive 源码）请参见：[深入响应式原理](../01-响应式与生命周期/01-响应式原理.md)
> 
> 📖 **`$set`/`$delete` 的源码实现**（defineReactive 递归调用 + ob.dep.notify() 触发流程）请参见：[Vue 实例 - $set/$delete](../../01-入门基础/07-Vue实例API参考.md#vm-settarget-propertynameindex-value)

### 参数说明

| 参数               | 类型             | 必填 | 说明             |
| ------------------ | ---------------- | ---- | ---------------- |
| target             | Object \| Array  | 是   | 目标对象或数组   |
| propertyName/index | String \| Number | 是   | 属性名或数组索引 |
| value              | Any              | 是   | 要设置的值       |

### 返回值

返回设置的值。

### 使用示例

#### 对象属性添加

```js
var vm = new Vue({
  data: {
    user: {
      name: "John"
    }
  }
})

vm.user.age = 25

Vue.set(vm.user, "age", 25)
this.$set(this.user, "age", 25)
```

#### 数组元素修改

```js
var vm = new Vue({
  data: {
    items: ["a", "b", "c"]
  }
})

vm.items[1] = "x"          // ❌ 非响应式

vm.items.length = 2        // ❌ 非响应式

Vue.set(vm.items, 1, "x")  // ✅ 响应式
vm.items.splice(1, 1, "x") // ✅ 响应式

vm.items.splice(2)         // ✅ 用 splice 修改数组长度
```

#### 批量添加属性

```js
var vm = new Vue({
  data: {
    user: {}
  }
})

// ❌ 错误：Object.assign 直接添加属性，不会触发更新
Object.assign(vm.user, {
  name: "John",
  age: 25,
  email: "john@example.com"
})

// ✅ 正确：创建新对象整体替换
vm.user = Object.assign({}, vm.user, {
  name: "John",
  age: 25,
  email: "john@example.com"
})
```

#### 动态表单字段

```js
new Vue({
  data: {
    form: {}
  },
  methods: {
    addField: function (fieldName, defaultValue) {
      this.$set(this.form, fieldName, defaultValue)
    },
    removeField: function (fieldName) {
      this.$delete(this.form, fieldName)
    }
  }
})
```

### 最佳实践

1. **提前声明**：在 data 中预先声明所有需要的属性
2. **使用 $set**：组件内使用 `this.$set` 更简洁
3. **对象替换**：需要添加多个属性时，使用对象替换

> 📖 **响应式检测的限制对照表**（哪些操作响应式、哪些不响应式、各自的解决方案）请参见：[深入响应式原理 - Vue 不能检测的变动](../01-响应式与生命周期/01-响应式原理.md)

### 注意事项

- 目标对象不能是 Vue 实例或 Vue 实例的根数据对象
- 数组索引不能超过当前长度

---

## Vue.delete(target, propertyName/index)

### 功能描述

删除对象的 property。如果对象是响应式的，确保删除能触发视图更新。

### 为什么需要 Vue.delete？

Vue 2.x 无法检测对象属性的删除（`delete obj.key` 不被拦截）。这与 Vue.set 是同一根源的限制。

> 📖 **响应式限制的完整原理**请参见：[深入响应式原理](../01-响应式与生命周期/01-响应式原理.md)
> 📖 **`$delete` 的源码实现**请参见：[Vue 实例 - $set/$delete](../../01-入门基础/07-Vue实例API参考.md#vm-deletetarget-propertynameindex)

### 参数说明

| 参数               | 类型             | 必填 | 说明             |
| ------------------ | ---------------- | ---- | ---------------- |
| target             | Object \| Array  | 是   | 目标对象或数组   |
| propertyName/index | String \| Number | 是   | 属性名或数组索引 |

### 使用示例

#### 删除对象属性

```js
var vm = new Vue({
  data: {
    user: {
      name: "John",
      age: 25,
      email: "john@example.com"
    }
  }
})

delete vm.user.age

Vue.delete(vm.user, "age")
this.$delete(this.user, "age")
```

#### 删除数组元素

```js
var vm = new Vue({
  data: {
    items: ["a", "b", "c"]
  }
})

Vue.delete(vm.items, 1)
```

#### 条件性删除属性

```js
new Vue({
  data: {
    config: {
      debug: true,
      api: "/api",
      mock: false
    }
  },
  methods: {
    cleanConfig: function () {
      if (!this.config.debug) {
        this.$delete(this.config, "mock")
      }
    }
  }
})
```

### 最佳实践

1. **优先使用 $delete**：组件内使用 `this.$delete`
2. **配合 Vue.set**：动态属性管理时成对使用

### 注意事项

- 目标对象不能是 Vue 实例或 Vue 实例的根数据对象
- 2.2.0+ 支持数组操作

---

## Vue.directive(id, [definition])

### 功能描述

注册或获取全局自定义指令。指令用于直接操作 DOM，适合底层 DOM 操作逻辑的复用。

### 指令生命周期

```
bind → inserted → update → componentUpdated → unbind
```

| 钩子函数         | 触发时机                                   |
| ---------------- | ------------------------------------------ |
| bind             | 指令首次绑定到元素时（父组件未挂载）       |
| inserted         | 被绑定元素插入父节点时（父组件已挂载）     |
| update           | 所在组件 VNode 更新时                      |
| componentUpdated | 指令所在组件 VNode 及其子 VNode 全部更新后 |
| unbind           | 指令与元素解绑时                           |

### 参数说明

| 参数       | 类型               | 必填 | 说明                        |
| ---------- | ------------------ | ---- | --------------------------- |
| id         | String             | 是   | 指令 ID，使用时加 `v-` 前缀 |
| definition | Function \| Object | 否   | 指令定义对象或函数          |

### 钩子函数参数

```js
{
  el: HTMLElement,
  binding: {
    name: String,
    value: Any,
    oldValue: Any,
    expression: String,
    arg: String,
    modifiers: Object
  },
  vnode: VNode,
  oldVnode: VNode
}
```

### 使用示例

#### 完整指令定义

```js
Vue.directive("focus", {
  bind: function (el, binding, vnode) {
    console.log("指令绑定")
  },
  inserted: function (el, binding) {
    if (binding.value !== false) {
      el.focus()
    }
  },
  update: function (el, binding) {
    console.log("值更新:", binding.value)
  },
  componentUpdated: function (el, binding) {
    console.log("组件更新完成")
  },
  unbind: function (el) {
    console.log("指令解绑")
  }
})
```

#### 函数简写

```js
Vue.directive("color", function (el, binding) {
  el.style.color = binding.value
})
```

#### 自动聚焦指令

```js
Vue.directive("focus", {
  inserted: function (el) {
    el.focus()
  }
})
```

```html
<input v-focus />
```

#### 权限控制指令

```js
Vue.directive("permission", {
  inserted: function (el, binding, vnode) {
    var permission = binding.value
    var permissions = vnode.context.$store.state.permissions

    if (!permissions.includes(permission)) {
      el.parentNode && el.parentNode.removeChild(el)
    }
  }
})
```

```html
<button v-permission="'admin'">管理员操作</button>
```

#### 防抖指令

```js
Vue.directive("debounce", {
  inserted: function (el, binding) {
    var timer = null
    var delay = binding.arg ? parseInt(binding.arg) : 300

    el.addEventListener("input", function () {
      if (timer) clearTimeout(timer)
      timer = setTimeout(function () {
        binding.value()
      }, delay)
    })
  }
})
```

```html
<input v-debounce:500="search" />
```

#### 点击外部指令

```js
Vue.directive("click-outside", {
  bind: function (el, binding, vnode) {
    el._clickOutside = function (event) {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value.call(vnode.context, event)
      }
    }
    document.addEventListener("click", el._clickOutside)
  },
  unbind: function (el) {
    document.removeEventListener("click", el._clickOutside)
    delete el._clickOutside
  }
})
```

```html
<div v-click-outside="closeDropdown">
  <button @click="showDropdown = true">打开</button>
  <div v-show="showDropdown">下拉内容</div>
</div>
```

#### 图片懒加载指令

```js
Vue.directive("lazy", {
  inserted: function (el, binding) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          el.src = binding.value
          observer.unobserve(el)
        }
      })
    })
    observer.observe(el)
  }
})
```

```html
<img v-lazy="imageUrl" />
```

### 获取已注册指令

```js
var focusDirective = Vue.directive("focus")
```

### 最佳实践

1. **命名规范**：使用小写字母和连字符，如 `v-click-outside`
2. **清理资源**：在 `unbind` 中清理事件监听器和定时器
3. **局部注册**：仅在需要时使用局部指令

```js
export default {
  directives: {
    focus: {
      inserted: function (el) {
        el.focus()
      }
    }
  }
}
```

---

## Vue.filter(id, [definition])

### 功能描述

注册或获取全局过滤器。过滤器用于文本格式化，在模板中通过管道符 `|` 使用。

### 参数说明

| 参数       | 类型     | 必填 | 说明       |
| ---------- | -------- | ---- | ---------- |
| id         | String   | 是   | 过滤器 ID  |
| definition | Function | 否   | 过滤器函数 |

### 使用示例

#### 基础过滤器

```js
Vue.filter("uppercase", function (value) {
  if (!value) return ""
  return value.toString().toUpperCase()
})

Vue.filter("lowercase", function (value) {
  if (!value) return ""
  return value.toString().toLowerCase()
})
```

```html
<p>{{ message | uppercase }}</p>
<p>{{ message | lowercase }}</p>
```

#### 带参数的过滤器

```js
Vue.filter("currency", function (value, symbol, decimals) {
  symbol = symbol || "¥"
  decimals = decimals || 2
  return symbol + parseFloat(value).toFixed(decimals)
})
```

```html
<p>{{ price | currency('$', 2) }}</p>
```

#### 链式调用

```js
Vue.filter("capitalize", function (value) {
  if (!value) return ""
  return value.charAt(0).toUpperCase() + value.slice(1)
})

Vue.filter("truncate", function (value, length) {
  length = length || 15
  if (!value) return ""
  value = value.toString()
  return value.length > length ? value.slice(0, length) + "..." : value
})
```

```html
<p>{{ message | capitalize | truncate(20) }}</p>
```

#### 日期格式化

```js
Vue.filter("date", function (value, format) {
  format = format || "YYYY-MM-DD"
  var date = new Date(value)
  var map = {
    YYYY: date.getFullYear(),
    MM: String(date.getMonth() + 1).padStart(2, "0"),
    DD: String(date.getDate()).padStart(2, "0"),
    HH: String(date.getHours()).padStart(2, "0"),
    mm: String(date.getMinutes()).padStart(2, "0"),
    ss: String(date.getSeconds()).padStart(2, "0")
  }

  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, function (matched) {
    return map[matched]
  })
})
```

```html
<p>{{ timestamp | date('YYYY-MM-DD HH:mm:ss') }}</p>
```

#### JSON 格式化

```js
Vue.filter("json", function (value, indent) {
  indent = indent || 2
  return JSON.stringify(value, null, indent)
})
```

```html
<pre>{{ object | json }}</pre>
```

#### 获取已注册过滤器

```js
var uppercaseFilter = Vue.filter("uppercase")
```

### 局部注册

```js
export default {
  filters: {
    capitalize: function (value) {
      if (!value) return ""
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
}
```

### 最佳实践

1. **保持简单**：过滤器应该是纯函数，无副作用
2. **优先计算属性**：复杂逻辑优先使用计算属性
3. **局部注册**：仅在当前组件使用的过滤器使用局部注册

### 注意事项

- 过滤器在 Vue 3 中已移除，建议使用计算属性或方法替代
- 过滤器只能在插值表达式和 `v-bind` 中使用

---

## Vue.component(id, [definition])

### 功能描述

注册或获取全局组件。注册后可在任何 Vue 实例的模板中使用。

### 参数说明

| 参数       | 类型               | 必填 | 说明                 |
| ---------- | ------------------ | ---- | -------------------- |
| id         | String             | 是   | 组件名称             |
| definition | Function \| Object | 否   | 组件定义对象或构造器 |

### 使用示例

#### 注册组件

```js
Vue.component(
  "my-component",
  Vue.extend({
    template: "<div>A custom component!</div>"
  })
)

Vue.component("my-component", {
  template: "<div>A custom component!</div>"
})
```

#### 获取已注册组件

```js
var MyComponent = Vue.component("my-component")
```

#### 完整组件示例

```js
Vue.component("todo-item", {
  props: {
    todo: {
      type: Object,
      required: true
    },
    index: {
      type: Number,
      default: 0
    }
  },
  template: `
    <li class="todo-item" :class="{ completed: todo.completed }">
      <input type="checkbox" v-model="todo.completed">
      <span>{{ index + 1 }}. {{ todo.text }}</span>
      <button @click="$emit('remove', index)">删除</button>
    </li>
  `
})
```

```html
<ul>
  <todo-item
    v-for="(todo, index) in todos"
    :key="todo.id"
    :todo="todo"
    :index="index"
    @remove="removeTodo"></todo-item>
</ul>
```

#### 动态组件注册

```js
var componentFiles = require.context("./components", false, /\.vue$/)

componentFiles.keys().forEach(function (path) {
  var componentName = path.replace(/^\.\/(.*)\.\w+$/, "$1")
  var componentConfig = componentFiles(path).default

  Vue.component(componentName, componentConfig)
})
```

#### 异步组件

```js
Vue.component("async-component", function (resolve, reject) {
  setTimeout(function () {
    resolve({
      template: "<div>异步加载的组件</div>"
    })
  }, 1000)
})

Vue.component("async-webpack", function () {
  return import("./AsyncComponent.vue")
})
```

### 组件命名规范

| 风格       | 示例           | 使用场景                |
| ---------- | -------------- | ----------------------- |
| kebab-case | `my-component` | 模板中 `<my-component>` |
| PascalCase | `MyComponent`  | JSX 或字符串模板        |

### 最佳实践

1. **命名规范**：使用多词名称避免与 HTML 元素冲突
2. **局部注册**：优先使用局部注册减少全局污染
3. **按需加载**：大型组件使用异步加载

```js
export default {
  components: {
    "my-component": function () {
      return import("./MyComponent.vue")
    }
  }
}
```

---

## Vue.use(plugin)

### 功能描述

安装 Vue.js 插件。如果插件是一个对象，必须提供 `install` 方法；如果插件是一个函数，它会被作为 install 方法。

### 参数说明

| 参数   | 类型               | 必填 | 说明           |
| ------ | ------------------ | ---- | -------------- |
| plugin | Object \| Function | 是   | 插件对象或函数 |

### 插件开发

```js
var MyPlugin = {
  install: function (Vue, options) {
    Vue.globalMethod = function () {
      console.log("全局方法")
    }

    Vue.directive("my-directive", {
      bind: function (el, binding) {
        el.textContent = binding.value
      }
    })

    Vue.mixin({
      created: function () {
        console.log("全局混入")
      }
    })

    Vue.prototype.$myMethod = function (methodOptions) {
      console.log("实例方法")
    }
  }
}
```

### 使用示例

#### 安装插件

```js
Vue.use(MyPlugin, { someOption: true })

Vue.use(VueRouter)
Vue.use(Vuex)
```

#### 自动安装

```js
var MyPlugin = {
  install: function (Vue) {
    Vue.myAddedProperty = "Hello"
  }
}

if (typeof window !== "undefined" && window.Vue) {
  window.Vue.use(MyPlugin)
}
```

#### 完整插件示例

```js
var LoadingPlugin = {
  install: function (Vue, options) {
    var LoadingComponent = Vue.extend({
      template: `
        <div class="loading-overlay" v-show="visible">
          <div class="loading-spinner"></div>
          <p>{{ message }}</p>
        </div>
      `,
      data: function () {
        return {
          visible: false,
          message: "加载中..."
        }
      }
    })

    var loading = new LoadingComponent()
    document.body.appendChild(loading.$mount().$el)

    Vue.prototype.$loading = {
      show: function (message) {
        loading.message = message || options.defaultMessage || "加载中..."
        loading.visible = true
      },
      hide: function () {
        loading.visible = false
      }
    }
  }
}

Vue.use(LoadingPlugin, {
  defaultMessage: "请稍候..."
})
```

```js
this.$loading.show("正在提交...")
await submitForm()
this.$loading.hide()
```

### 常用插件列表

| 插件       | 用途                      |
| ---------- | ------------------------- |
| vue-router | 路由管理                  |
| vuex       | 状态管理                  |
| vue-i18n   | 国际化                    |
| axios      | HTTP 请求（需封装为插件） |
| element-ui | UI 组件库                 |

### 最佳实践

1. **安装时机**：在 `new Vue()` 之前调用
2. **避免重复**：同一插件多次调用只安装一次
3. **按需引入**：UI 组件库按需引入减少体积

### 注意事项

- 插件只会被安装一次，即使多次调用 `Vue.use`
- 需要在创建 Vue 实例之前安装插件

---

## Vue.mixin(mixin)

### 功能描述

全局注册一个混入，影响注册之后所有创建的每个 Vue 实例。

### 参数说明

| 参数  | 类型   | 必填 | 说明     |
| ----- | ------ | ---- | -------- |
| mixin | Object | 是   | 混入对象 |

### 使用示例

#### 全局混入

```js
Vue.mixin({
  created: function () {
    console.log("组件创建:", this.$options.name)
  },
  methods: {
    globalMethod: function () {
      console.log("全局方法")
    }
  }
})
```

#### 插件中的混入

```js
var LoggerPlugin = {
  install: function (Vue, options) {
    Vue.mixin({
      created: function () {
        if (this.$options.name) {
          console.log("[Logger] Component created:", this.$options.name)
        }
      },
      mounted: function () {
        if (options.trackMounted) {
          console.log("[Logger] Component mounted:", this.$options.name)
        }
      }
    })
  }
}
```

#### 全局错误处理

```js
Vue.mixin({
  methods: {
    handleError: function (error) {
      console.error("Error:", error)
      this.$notify.error({
        title: "错误",
        message: error.message
      })
    }
  },
  errorCaptured: function (err, vm, info) {
    console.error("Error captured:", err, info)
    return false
  }
})
```

#### 路由权限控制

```js
Vue.mixin({
  beforeRouteEnter: function (to, from, next) {
    if (to.meta.requiresAuth && !isAuthenticated()) {
      next("/login")
    } else {
      next()
    }
  }
})
```

### 混入策略

| 选项                          | 合并策略               |
| ----------------------------- | ---------------------- |
| data                          | 合并，组件优先         |
| methods                       | 合并，组件优先         |
| computed                      | 合并，组件优先         |
| lifecycle hooks               | 合并为数组，先执行混入 |
| watch                         | 合并为数组，都执行     |
| components/directives/filters | 合并，组件优先         |

### 最佳实践

1. **谨慎使用**：全局混入会影响所有组件，仅用于插件开发
2. **避免污染**：使用独特命名避免与组件选项冲突
3. **文档说明**：清晰记录混入的功能和影响范围

### 注意事项

- **不推荐**在应用代码中使用，主要用于插件开发
- 一旦注册无法撤销，影响所有后续创建的实例
- 可能导致组件行为难以追踪

---

## Vue.compile(template)

### 功能描述

将模板字符串编译成渲染函数。仅在完整版（包含编译器的 Vue 构建）中可用。

### 参数说明

| 参数     | 类型   | 必填 | 说明       |
| -------- | ------ | ---- | ---------- |
| template | String | 是   | 模板字符串 |

### 返回值

```js
{
  render: Function,
  staticRenderFns: Array<Function>
}
```

### 使用示例

#### 基础用法

```js
var res = Vue.compile("<div><span>{{ msg }}</span></div>")

new Vue({
  data: {
    msg: "hello"
  },
  render: res.render,
  staticRenderFns: res.staticRenderFns
})
```

#### 动态模板编译

```js
new Vue({
  data: {
    template: "<div>{{ message }}</div>",
    message: "Hello Vue!"
  },
  computed: {
    compiledTemplate: function () {
      return Vue.compile(this.template)
    }
  },
  render: function (h) {
    return this.compiledTemplate.render.call(this, h)
  }
})
```

#### 运行时编译器检测

```js
if (typeof Vue.compile === "function") {
  console.log("运行完整版 Vue，包含编译器")
} else {
  console.log("运行时版本，不包含编译器")
}
```

### 版本对比

| 版本   | 文件           | 编译器 | 体积  |
| ------ | -------------- | ------ | ----- |
| 完整版 | vue.js         | 包含   | ~30KB |
| 运行时 | vue.runtime.js | 不包含 | ~20KB |

### 最佳实践

1. **优先预编译**：使用 Vue 单文件组件预编译模板
2. **运行时版本**：生产环境使用运行时版本减少体积
3. **动态场景**：仅在需要动态编译模板时使用

### 注意事项

- 仅在完整版可用
- 运行时版本（vue.runtime.js）不包含此方法
- 性能开销：运行时编译有性能成本

---

## Vue.observable(object)

> 2.6.0 新增

### 功能描述

让一个对象可响应。Vue 内部会用它来处理 `data` 函数返回的对象。

### 参数说明

| 参数   | 类型   | 必填 | 说明                   |
| ------ | ------ | ---- | ---------------------- |
| object | Object | 是   | 需要转换为响应式的对象 |

### 返回值

返回一个响应式对象（Vue 2.x 中返回的是被修改的原始对象）。

### 使用示例

#### 简单状态管理

```js
const state = Vue.observable({
  count: 0,
  user: {
    name: "John"
  }
})

const Demo = {
  render(h) {
    return h("div", [
      h("p", `Count: ${state.count}`),
      h(
        "button",
        {
          on: {
            click: () => {
              state.count++
            }
          }
        },
        "Increment"
      )
    ])
  }
}
```

#### 跨组件状态共享

```js
var store = Vue.observable({
  items: [],
  loading: false
})

var mutations = {
  setItems: function (items) {
    store.items = items
  },
  setLoading: function (loading) {
    store.loading = loading
  }
}

var actions = {
  fetchItems: function () {
    mutations.setLoading(true)
    return fetch("/api/items")
      .then(function (res) {
        return res.json()
      })
      .then(function (items) {
        mutations.setItems(items)
        mutations.setLoading(false)
      })
  }
}
```

```js
Vue.component("item-list", {
  computed: {
    items: function () {
      return store.items
    },
    loading: function () {
      return store.loading
    }
  },
  template: `
    <div>
      <div v-if="loading">加载中...</div>
      <ul v-else>
        <li v-for="item in items" :key="item.id">{{ item.name }}</li>
      </ul>
    </div>
  `,
  mounted: function () {
    actions.fetchItems()
  }
})
```

#### 响应式配置对象

```js
var config = Vue.observable({
  theme: "light",
  language: "zh-CN",
  sidebar: {
    collapsed: false
  }
})

Vue.component("theme-toggle", {
  computed: {
    theme: function () {
      return config.theme
    }
  },
  methods: {
    toggleTheme: function () {
      config.theme = config.theme === "light" ? "dark" : "light"
    }
  },
  template: `
    <button @click="toggleTheme">
      切换主题 (当前: {{ theme }})
    </button>
  `
})
```

### Vue 2.x vs Vue 3.x 行为差异

| 版本    | 行为                         |
| ------- | ---------------------------- |
| Vue 2.x | 直接修改原对象，返回同一引用 |
| Vue 3.x | 返回响应式代理，原对象不变   |

### 最佳实践

1. **向前兼容**：始终操作 `Vue.observable` 返回的对象
2. **简单场景**：适合小型应用的状态管理
3. **复杂场景**：大型应用推荐使用 Vuex

### 注意事项

- Vue 2.x 中，传入的对象会被直接修改
- Vue 3.x 中，返回的是代理对象，原对象保持不变
- 为向前兼容，建议始终使用返回的对象

---

## Vue.version

### 功能描述

提供字符串形式的 Vue 安装版本号。

### 使用示例

#### 版本检测

```js
var version = Vue.version

console.log(version)
```

#### 版本判断

```js
var majorVersion = Number(Vue.version.split(".")[0])

if (majorVersion === 2) {
  console.log("Vue 2.x")
} else if (majorVersion === 3) {
  console.log("Vue 3.x")
} else {
  console.warn("不支持的 Vue 版本")
}
```

#### 插件兼容性处理

```js
var MyPlugin = {
  install: function (Vue) {
    var version = Vue.version.split(".")
    var major = parseInt(version[0])
    var minor = parseInt(version[1])

    if (major === 2 && minor < 6) {
      console.warn("此插件需要 Vue 2.6.0 或更高版本")
      return
    }

    Vue.prototype.$myPlugin = {}
  }
}
```

---

## 常见问题解答 (FAQ)

### Q1: Vue.set 和直接赋值有什么区别？

**A:** Vue 2.x 使用 `Object.defineProperty` 实现响应式，无法检测：

- 对象属性的添加/删除
- 通过索引直接修改数组元素
- 直接修改数组长度

`Vue.set` 会正确触发视图更新，而直接赋值不会。

### Q2: nextTick 和 setTimeout 有什么区别？

**A:**

- `nextTick`：在 Vue 的 DOM 更新队列刷新后执行，优先使用微任务
- `setTimeout`：在宏任务队列执行，时机晚于 `nextTick`

```js
this.message = "updated"

Vue.nextTick(() => {
  console.log("nextTick: DOM 已更新")
})

setTimeout(() => {
  console.log("setTimeout: DOM 已更新")
}, 0)

// 输出顺序: nextTick → setTimeout
```

### Q3: 全局 API 和实例方法有什么区别？

| 类型     | 示例                          | 作用域                 |
| -------- | ----------------------------- | ---------------------- |
| 全局 API | `Vue.set`、`Vue.nextTick`     | 全局，需手动传参       |
| 实例方法 | `this.$set`、`this.$nextTick` | 实例内，自动绑定上下文 |

推荐在组件内使用实例方法。

### Q4: Vue.extend 和 Vue.component 有什么区别？

**A:**

- `Vue.extend`：返回组件构造器，适合编程式创建实例
- `Vue.component`：全局注册组件，返回构造器

```js
var Constructor = Vue.extend({ template: "<div/>" })
var instance = new Constructor().$mount()

Vue.component("my-component", { template: "<div/>" })
```

### Q5: 什么时候使用全局混入？

**A:** 全局混入主要用于插件开发，应避免在应用代码中使用。替代方案：

```js
var mixin = {
  created: function () {
    console.log("混入")
  }
}

export default {
  mixins: [mixin]
}
```

### Q6: 运行时版本和完整版有什么区别？

| 特性          | 完整版 | 运行时版 |
| ------------- | ------ | -------- |
| 编译器        | 包含   | 不包含   |
| 体积          | ~30KB  | ~20KB    |
| template 选项 | 支持   | 不支持   |
| Vue.compile   | 支持   | 不支持   |

推荐使用运行时版本 + 单文件组件预编译。

---

## API 速查表

| API              | 用途           | 版本要求       |
| ---------------- | -------------- | -------------- |
| `Vue.extend`     | 创建组件构造器 | 2.x            |
| `Vue.nextTick`   | DOM 更新后回调 | 2.x            |
| `Vue.set`        | 添加响应式属性 | 2.x            |
| `Vue.delete`     | 删除响应式属性 | 2.x            |
| `Vue.directive`  | 注册全局指令   | 2.x            |
| `Vue.filter`     | 注册全局过滤器 | 2.x (3.x 移除) |
| `Vue.component`  | 注册全局组件   | 2.x            |
| `Vue.use`        | 安装插件       | 2.x            |
| `Vue.mixin`      | 全局混入       | 2.x            |
| `Vue.compile`    | 编译模板字符串 | 2.x 完整版     |
| `Vue.observable` | 创建响应式对象 | 2.6.0+         |
| `Vue.version`    | 获取版本号     | 2.x            |

---

## Vue 3.x 迁移提示

| Vue 2.x API              | Vue 3.x 变化                     |
| ------------------------ | -------------------------------- |
| `Vue.filter`             | 已移除，使用计算属性或方法       |
| `Vue.mixin`              | 保留，但推荐使用 Composition API |
| `Vue.set` / `Vue.delete` | 不再需要，Proxy 自动检测         |
| `Vue.observable`         | 替换为 `reactive()`              |
| `Vue.extend`             | 仍可用但不推荐，推荐 `defineComponent` |
