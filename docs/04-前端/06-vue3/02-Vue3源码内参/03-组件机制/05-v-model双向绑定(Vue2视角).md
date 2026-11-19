---
title: "v-model 双向绑定实现（Vue2 视角）"
description: "从 Vue2 视角解析 v-model 双向绑定的实现，并与 Vue3 的实现差异对比。"
category: Vue
tags: [Vue3, 源码, 组件系统, v-model]
keywords: [v-model, 双向绑定, Object.defineProperty, Vue2]
---

# v-model 双向绑定实现（Vue2 视角）

## 概念说明

Vue 数据双向绑定的核心机制可以概括为一句话：Vue 内部通过 `Object.defineProperty` 方法属性拦截的方式，把 `data` 对象里每个数据的读写转化成 `getter`/`setter`，当数据变化时通知视图更新。这一概括覆盖了基本原理，但内部实现链条（监听器、订阅器、订阅者、解析器如何协作）值得逐一拆解。下文先以简化实现剖析双向绑定的完整过程，再对照 Vue2 源码分析各模块的真实实现。

简化实现的整体效果如下图所示：

![1.gif](https://github.com/fengshi123/blog/blob/master/assets/mvvm/1.gif?raw=true) 

## MVVM 双向绑定的定义

`MVVM` 数据双向绑定主要是指：数据变化更新视图，视图变化更新数据，如下图所示：

![2.png](https://github.com/fengshi123/blog/blob/master/assets/mvvm/2.png?raw=true) 

即：

- 输入框内容变化时，`Data` 中的数据同步变化，即 `View` => `Data` 的变化。
- `Data` 中的数据变化时，文本节点的内容同步变化，即 `Data` => `View` 的变化。

其中，`View` 变化更新 `Data` 可以通过事件监听的方式实现；`Data` 变化更新 `View` 则依赖框架内部的响应式机制，是下文讨论的重点。

## 实现机制总览

数据双向绑定由以下 4 个模块协作完成：

1. **监听器 `Observer`**：劫持并监听所有属性，属性发生变化时通知订阅者；
2. **订阅器 `Dep`**：收集订阅者，对监听器 `Observer` 和订阅者 `Watcher` 进行统一管理；
3. **订阅者 `Watcher`**：收到属性变化通知后执行相应的方法，从而更新视图；
4. **解析器 `Compile`**：解析每个节点的相关指令，对模板数据和订阅器进行初始化。

以上四个模块的协作流程如下图所示：

![3.png](https://github.com/fengshi123/blog/blob/master/assets/mvvm/3.png?raw=true) 

该实例的源码地址：<https://github.com/fengshi123/mvvm_example> 。

## 监听器 Observer 实现

### 原理：让数据变得"可观测"

监听器 `Observer` 的实现目标是让数据对象变得"可观测"，即每次数据被读取或写时，都能感知到数据被读取了或被改写了。Vue 2.0 源码中使用 `Object.defineProperty()` 劫持各个数据属性的 `setter / getter`。MDN 上对该方法的定义如下：

>  Object.defineProperty() 方法会直接在一个对象上定义一个新属性，或者修改一个对象的现有属性， 并返回这个对象。 

### Object.defineProperty() 语法

MDN 上对语法的定义如下：

> Object.defineProperty(obj, prop, descriptor)

**（1）参数**

- `obj`

  要在其上定义属性的对象。

- `prop`

  要定义或修改的属性的名称。

- `descriptor`

  将被定义或修改的属性描述符。

**（2）返回值**

被传递给函数的对象。

**（3）属性描述符**

`Object.defineProperty()` 为对象定义属性，分数据描述符和存取描述符，两种形式不能混用。

**数据描述符和存取描述符均具有以下可选键值：**

- `configurable`

当且仅当该属性的 `configurable` 为 `true` 时，该属性描述符才能够被改变，同时该属性也能从对应的对象上被删除。**默认为 false**。

- `enumerable`

当且仅当该属性的 `enumerable` 为 `true` 时，该属性才能够出现在对象的枚举属性中。**默认为 false**。

**数据描述符具有以下可选键值**： 

- `value`

该属性对应的值。可以是任何有效的 JavaScript 值（数值，对象，函数等）。**默认为 undefined**。

- `writable`

当且仅当该属性的 `writable` 为 `true` 时，`value `才能被赋值运算符改变。**默认为 false**。

**存取描述符具有以下可选键值**： 

- `get`

一个给属性提供 `getter` 的方法，如果没有 `getter` 则为 `undefined`。当访问该属性时，该方法会被执行，方法执行时没有参数传入，但是会传入`this`对象（由于继承关系，这里的`this`并不一定是定义该属性的对象）。默认为 `undefined`。

- `set`

一个给属性提供 `setter` 的方法，如果没有 `setter` 则为 `undefined`。当属性值修改时，触发执行该方法。该方法将接受唯一参数，即该属性新的参数值。默认为 `undefined`。

### 示例：字面量定义对象的局限

通过字面量方式定义对象时：

```javascript
let person = {
    name:'tom',
    age:15
}
```

`person.name` 和 `person.age` 可以直接读写对应的属性值，但当这些属性被读取或修改时，外部无法感知。要让对象在属性被读写时发出信号，需要借助 `Object.defineProperty()`。

### 示例：Object.defineProperty() 定义对象

```javascript
let val = 'tom'
let person = {}
Object.defineProperty(person,'name',{
    get(){
        console.log('name属性被读取了...');
        return val;
    },
    set(newVal){
        console.log('name属性被修改了...');
        val = newVal;
    }
})
```

通过 `object.defineProperty()` 方法给 `person` 的 `name` 属性定义了 `get()` 和 `set()` 进行拦截，每当该属性进行读或写操作时就会触发 `get()` 和 `set()`，对象的属性被读写时即可被感知。测试结果如下图所示：

![3_2.png](https://github.com/fengshi123/blog/blob/master/assets/mvvm/3_2.png?raw=true) 

### 封装：批量劫持所有属性

当数据对象的属性较多时，逐个设置拦截代码会非常冗余。对上述逻辑进行封装，让数据对象的所有属性都变得可观测：

```javascript
/**
 * 循环遍历数据对象的每个属性
 */
function observable(obj) {
    if (!obj || typeof obj !== 'object') {
        return;
    }
    let keys = Object.keys(obj);
    keys.forEach((key) => {
        defineReactive(obj, key, obj[key])
    })
    return obj;
}
/**
 * 将对象的属性用 Object.defineProperty() 进行设置
 */
function defineReactive(obj, key, val) {
    Object.defineProperty(obj, key, {
        get() {
            console.log(`${key}属性被读取了...`);
            return val;
        },
        set(newVal) {
            console.log(`${key}属性被修改了...`);
            val = newVal;
        }
    })
}
```

封装后可以直接定义 `person`：

```javascript
let person = observable({
    name: 'tom',
    age: 15
});
```

这样定义的 `person` 的两个属性都是"可观测"的。

## 订阅器 Dep 实现

### 前置知识：发布-订阅设计模式

发布-订阅模式又叫观察者模式，它定义对象间的一种一对多的依赖关系，当一个对象的状态改变时，所有依赖于它的对象都将得到通知。

**（1）发布-订阅模式的优点：**

- 发布-订阅模式广泛应用于异步编程中，这是一种替代传递回调函数的方案，比如可以订阅 ajax 请求的 error、succ 等事件。在异步编程中使用发布-订阅模式，无需过多关注对象在异步运行期间的内部状态，而只需要订阅感兴趣的事件发生点。
- 发布-订阅模式可以取代对象之间硬编码的通知机制，一个对象不用再显式地调用另外一个对象的某个接口。发布-订阅模式让两个对象松耦合地联系在一起，虽然不太清楚彼此的细节，但这不影响它们之间相互通信。当有新的订阅者出现时，发布者的代码不需要任何修改；同样发布者需要改变时，也不会影响到之前的订阅者。只要之前约定的事件名没有变化，就可以自由地改变它们。

**（2）生活类比**

发布-订阅模式的现实类比是售楼处：购房者把电话号码登记在售楼处（订阅），售楼处把号码记入花名册（维护订阅者列表），新楼盘推出时翻开花名册、遍历号码依次发送短信（发布事件、遍历通知）。购房者无需每天主动打电话询问，售楼处的通知机制也与具体购房者解耦。

### 订阅器 Dep 实现

数据变得"可观测"之后，下一步是在数据被读写时通知依赖该数据的视图更新。为此需要先将所有依赖收集起来，数据一旦发生变化就统一通知更新——这正是发布-订阅模式的应用：数据变化为"发布者"，依赖对象为"订阅者"。

订阅器 `Dep` 就是依赖收集容器（消息订阅器），负责收集订阅者，并在数据变化时执行对应订阅者的更新函数。

创建消息订阅器 `Dep`：

```javascript
function Dep () {
    this.subs = [];
}
Dep.prototype = {
    addSub: function(sub) {
        this.subs.push(sub);
    },
    notify: function() {
        this.subs.forEach(function(sub) {
            sub.update();
        });
    }
};
Dep.target = null;
```

有了订阅器，再将 `defineReactive` 函数进行改造，向其植入订阅器：

```javascript
defineReactive: function(data, key, val) {
	var dep = new Dep();
	Object.defineProperty(data, key, {
		enumerable: true,
		configurable: true,
		get: function getter () {
			if (Dep.target) {
				dep.addSub(Dep.target);
			}
			return val;
		},
		set: function setter (newVal) {
			if (newVal === val) {
				return;
			}
			val = newVal;
			dep.notify();
		}
	});
}
```

从代码上看，订阅器 `Dep` 类内部定义了一些属性和方法。需要特别注意的是它有一个静态属性 `Dep.target`，这是一个全局唯一的 `Watcher`，因为在同一时间只能有一个全局的 `Watcher` 被计算；另外它的自身属性 `subs` 也是 `Watcher` 的数组。

## 订阅者 Watcher 实现

订阅者 `Watcher` 在初始化时需要将自己添加进订阅器 `Dep` 中。监听器 `Observer` 是在 `get` 函数执行添加订阅者的操作的，因此只要在订阅者 `Watcher` 初始化时触发对应的 `get` 函数即可——获取对应的属性值就能触发 `get`，核心原因是数据监听基于 `Object.defineProperty()` 实现。

另一个细节是：只有订阅者 `Watcher` 初始化时才需要添加订阅者，其他时刻读取属性不应触发添加操作。判断机制是在 `Dep.target` 上缓存订阅者，添加成功后再将其置空。订阅者 `Watcher` 的实现如下：

```javascript
function Watcher(vm, exp, cb) {
    this.vm = vm;
    this.exp = exp;
    this.cb = cb;
    this.value = this.get();  // 将自己添加到订阅器的操作
}

Watcher.prototype = {
    update: function() {
        this.run();
    },
    run: function() {
        var value = this.vm.data[this.exp];
        var oldVal = this.value;
        if (value !== oldVal) {
            this.value = value;
            this.cb.call(this.vm, value, oldVal);
        }
    },
    get: function() {
        Dep.target = this; // 全局变量订阅者赋值
        var value = this.vm.data[this.exp]  // 强制执行监听器里的get函数
        Dep.target = null; // 全局变量订阅者释放
        return value;
    }
};
```

订阅者 `Watcher` 是一个类，其构造函数中定义的核心属性如下：

- vm：一个 Vue 的实例对象；
- exp：是 `node` 节点的 `v-model` 等指令的属性值或者插值符号中的属性。如 `v-model="name"`，`exp` 就是 `name`；
- cb：是 `Watcher` 绑定的更新函数。

实例化一个渲染 `watcher` 的执行过程分析：

1. 进入构造函数逻辑后执行 `this.get()` 方法，首先执行：

```javascript
Dep.target = this;  // 将自己赋值为全局的订阅者
```

实际上就是把 `Dep.target` 赋值为当前的渲染 `watcher`。接着执行：

```
let value = this.vm.data[this.exp]  // 强制执行监听器里的get函数
```

这个过程中会对 `vm` 上的数据进行访问，目的是触发数据对象的 `getter`。

2. 每个对象值的 `getter` 都持有一个 `dep`，在触发 `getter` 时会调用 `dep.depend()` 方法，执行 `this.addSub(Dep.target)`，即把当前的 `watcher` 订阅到这个数据持有的 `dep` 的 `watchers` 中，为后续数据变化时通知对应 `watchers` 做准备。至此完成一次依赖收集。

3. 依赖收集完成后，还需要把 `Dep.target` 恢复成上一个状态：

```javascript
Dep.target = null;  // 释放自己
```

`update()` 函数用于在数据发生变化时调用 `Watcher` 自身的更新函数进行更新：先通过 `let value = this.vm.data[this.exp];` 获取最新数据，然后与之前 `get()` 获得的旧数据进行比较，如果不一样，则调用更新函数 `cb` 进行更新。

至此，简单的订阅者 `Watcher` 设计完毕。

## 解析器 Compile 实现

### 关键逻辑

通过监听器 `Observer`、订阅器 `Dep` 和订阅者 `Watcher` 的实现，双向数据绑定的核心链路已经打通。但整个过程还没有解析 `dom` 节点，而是直接固定某个节点进行数据替换。解析器 `Compile` 负责解析和绑定工作，实现步骤如下：

- 解析模板指令，并替换模板数据，初始化视图；
- 将模板指令对应的节点绑定对应的更新函数，初始化相应的订阅器。

下面对 `'{{变量}}'` 这种形式的指令处理的关键代码进行分析，感受解析器 `Compile` 的处理逻辑，关键代码如下：

```javascript
compileText: function(node, exp) {
	var self = this;
	var initText = this.vm[exp]; // 获取属性值
	this.updateText(node, initText); // dom 更新节点文本值
    // 将这个指令初始化为一个订阅者，后续 exp 改变时，就会触发这个更新回调，从而更新视图
	new Watcher(this.vm, exp, function (value) { 
		self.updateText(node, value);
	});
}
```

### 验证：模拟 Vue 实例

完成监听器 `Observer`、订阅器 `Dep`、订阅者 `Watcher` 和解析器 `Compile` 的实现后，就可以模拟初始化一个 `Vue` 实例来检验以上理论的可行性。以下代码初始化一个 `Vue` 实例，实例源码地址：<https://github.com/fengshi123/mvvm_example> ：

```javascript
<body>
    <div id="mvvm-app">
        <input v-model="title">
        <h2>{{title}}</h2>
        <button v-on:click="clickBtn">数据初始化</button>
    </div>
</body>
<script src="../dist/bundle.js"></script>
<script type="text/javascript">
    var vm = new MVVM({
        el: '#mvvm-app',
        data: {
            title: 'hello world'
        },

        methods: {
            clickBtn: function (e) {
                this.title = 'hello world';
            }
        },
    });
</script>
```

运行以上实例，效果如下图所示，与实际的 Vue 数据绑定效果一致：

![1.gif](https://github.com/fengshi123/blog/blob/master/assets/mvvm/1.gif?raw=true)  

## Vue 源码中的数据双向绑定实现

以上从监听器 `Observer`、订阅器 `Dep`、订阅者 `Watcher` 和解析器 `Compile` 的实现出发，完成了一个简单的 `Vue` 数据绑定实例。以下从 `Vue` 源码层面分析这三个模块的真实实现。

### 监听器 Observer

Vue2 源码中监听器 Observer 的核心是利用 `Object.defineProperty` 给数据添加 `getter` 和 `setter`，目的是在访问数据和写数据时能自动执行一些逻辑。

**（1）initState**

在 `Vue` 的初始化阶段，`_init` 方法执行时会执行 `initState(vm)` 方法，它的定义在 `src/core/instance/state.js` 中。

```javascript
export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  if (opts.props) initProps(vm, opts.props)
  if (opts.methods) initMethods(vm, opts.methods)
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  if (opts.computed) initComputed(vm, opts.computed)
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}
```

`initState` 方法主要对 `props`、`methods`、`data`、`computed` 和 `watcher` 等属性做初始化操作，其中重点是 `data` 的初始化。

**（2）initData**

```javascript
function initData (vm: Component) {
  let data = vm.$options.data
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  const keys = Object.keys(data)
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  while (i--) {
    const key = keys[i]
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      proxy(vm, `_data`, key)
    }
  }
  // observe data
  observe(data, true /* asRootData */)
}
```

`data` 的初始化主要做两件事：一是遍历 `data` 函数返回的对象，通过 `proxy` 把每一个 `vm._data.xxx` 都代理到 `vm.xxx` 上；二是调用 `observe` 方法观测整个 `data` 的变化，把 `data` 变成响应式。

**（3）observe**

`observe` 的功能是监测数据的变化，它的定义在 `src/core/observer/index.js` 中：

```javascript
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}
```

`observe` 方法的作用是给非 VNode 的对象类型数据添加一个 `Observer`：如果已经添加过则直接返回，否则在满足一定条件时实例化一个 `Observer` 对象。

**（4）Observer**

`Observer` 是一个类，作用是给对象的属性添加 getter 和 setter，用于依赖收集和派发更新：

```javascript
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}
```

`Observer` 的构造函数逻辑：首先实例化 `Dep` 对象；接着对 `value` 做类型判断——数组调用 `observeArray` 方法，纯对象调用 `walk` 方法。`observeArray` 遍历数组再次调用 `observe` 方法；`walk` 方法遍历对象的 key 调用 `defineReactive` 方法。

**（5）defineReactive**

`defineReactive` 的功能是定义一个响应式对象，给对象动态添加 `getter` 和 `setter`，它的定义在 `src/core/observer/index.js` 中：

```javascript
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep()

  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = !shallow && observe(newVal)
      dep.notify()
    }
  })
}
```

`defineReactive` 函数最开始初始化 `Dep` 对象的实例，接着拿到 `obj` 的属性描述符，然后对子对象递归调用 `observe` 方法。这保证了无论 `obj` 的结构多复杂，它的所有子属性也能变成响应式对象，访问或修改 `obj` 中嵌套较深的属性同样能触发 getter 和 setter。

### 订阅器 Dep

订阅器 `Dep` 是整个 `getter` 依赖收集的核心，它的定义在 `src/core/observer/dep.js` 中：

```javascript
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
```

`Dep` 是一个 `Class`，它定义了一些属性和方法。需要特别注意的是它有一个静态属性 `target`，这是一个全局唯一的 `Watcher`——这是一个非常巧妙的设计，因为在同一时间只能有一个全局的 `Watcher` 被计算；另外它的自身属性 `subs` 也是 `Watcher` 的数组。`Dep` 实际上是对 `Watcher` 的一种管理，`Dep` 脱离 `Watcher` 单独存在没有意义。

### 订阅者 Watcher

订阅者 `Watcher` 的相关实现定义在 `src/core/observer/watcher.js` 中：

```javascript
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    this.value = this.lazy
      ? undefined
      : this.get()
  }
  // ...（get、set、addDep 等其余方法此处省略）
}
```

`Watcher` 是一个 `Class`，构造函数中定义了一些和 `Dep` 相关的属性。其中 `this.deps` 和 `this.newDeps` 表示 `Watcher` 实例持有的 `Dep` 实例的数组；`this.depIds` 和 `this.newDepIds` 分别代表 `this.deps` 和 `this.newDeps` 的 `id` Set。

**（1）过程分析**

实例化一个渲染 `watcher` 时，进入构造函数逻辑后执行 `this.get()` 方法。`get` 函数首先执行：

```javascript
pushTarget(this)
```

实际上是把 `Dep.target` 赋值为当前的渲染 `watcher` 并压栈（为了恢复用）。接着执行：

```javascript
value = this.getter.call(vm, vm)
```

这个时候就触发了数据对象的 `getter`。

每个对象值的 `getter` 都持有一个 `dep`，触发 `getter` 时会调用 `dep.depend()` 方法，也就是执行 `Dep.target.addDep(this)`。

此时 `Dep.target` 已经被赋值为渲染 `watcher`，因此会执行到 `addDep` 方法：

```
addDep (dep: Dep) {
  const id = dep.id
  if (!this.newDepIds.has(id)) {
    this.newDepIds.add(id)
    this.newDeps.push(dep)
    if (!this.depIds.has(id)) {
      dep.addSub(this)
    }
  }
}
```

`addDep` 内部做逻辑判断（保证同一数据不会被添加多次）后执行 `dep.addSub(this)`，即 `this.subs.push(sub)`——把当前的 `watcher` 订阅到这个数据持有的 `dep` 的 `subs` 中，为后续数据变化时通知对应 `subs` 做准备。在 `vm._render()` 过程中会触发所有数据的 `getter`，由此完成一次依赖收集。

在组件中对响应式数据做修改时，会触发 `setter` 的逻辑，最后调用 `watcher` 中的 `update` 方法：

```javascript
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }
```

`update` 针对 `Watcher` 的不同状态（`lazy`、`sync`、默认异步队列）执行不同的更新逻辑。

### 原理图

以上关键代码的整体原理图如下：

![4.png](https://github.com/fengshi123/blog/blob/master/assets/mvvm/4.png?raw=true)  

## 实践要点

- **依赖收集的时机**：依赖收集发生在 `getter` 触发时（渲染过程中访问数据），而不是数据定义时；`Watcher` 通过先把 `Dep.target` 指向自身再读取属性的方式完成订阅。
- **`Dep.target` 全局唯一**：同一时间只能有一个 `Watcher` 被计算，这是依赖收集正确性的前提；Vue2 源码中还通过 `pushTarget`/`popTarget` 栈结构支持嵌套场景。
- **更新去重**：`Watcher` 内部用 `newDepIds`/`depIds` 两个 Set 判断同一 `Dep` 不会被重复添加，避免重复订阅。
- **嵌套对象递归观测**：`defineReactive` 对子对象递归调用 `observe`，深层属性同样具备响应性。
- **数组的特殊处理**：数组不走 `defineReactive`，而是通过 `protoAugment`/`copyAugment` 以原型增强方式（`arrayMethods`）拦截变异方法，并对元素调用 `observeArray` 逐项观测。
- **数据代理**：`initData` 通过 `proxy` 把 `vm._data.xxx` 代理到 `vm.xxx`，这是组件中可以直接 `this.xxx` 访问数据的原因。
- **视图更新入口**：解析器 `Compile` 在解析指令（如 `{{变量}}`、`v-model`）时创建 `Watcher`，把 DOM 更新函数与数据订阅关联起来。

## 小结

数据双向绑定的基本原理可以拆解为四个模块的协作：监听器 `Observer` 基于 `Object.defineProperty` 实现数据可观测；订阅器 `Dep` 通过 `subs` 数组与静态属性 `Dep.target` 管理订阅关系；订阅者 `Watcher` 在初始化时完成依赖收集并在数据变化时执行更新；解析器 `Compile` 负责解析模板指令并把 DOM 更新函数注册为订阅者。对照 Vue2 源码可以看到同样的结构：`initState` → `initData` → `observe` → `Observer` → `defineReactive` 构成响应式入口，`Dep` 与 `Watcher` 完成依赖收集与派发更新。

## 参考文献

1、Vue 的双向绑定原理及实现：<https://www.cnblogs.com/canfoo/p/6891868.html> 

2、Vue 技术揭秘：<https://ustbhuangyi.github.io/vue-analysis/> 
