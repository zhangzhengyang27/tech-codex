---
title: 代理 Proxy
description: "ES6 Proxy 元编程指南：构造语法与不变式、13 种 trap（get/set/has/apply/construct/ownKeys 等）、Reflect 配合、数据校验/日志/缓存等常见用例，以及与 Object.defineProperty 的对比。"
keywords: [Proxy, Reflect, 元编程]
category: JavaScript
tags: [JavaScript, ES6, Proxy, 元编程]
created: 2026-11-14
updated: 2026-11-14
status: 正式
---

# 代理 Proxy

> Proxy（代理）是 ES6 引入的元编程能力：在外层包住目标对象，拦截并改写对目标的基本操作（属性读取、赋值、函数调用等），所有拦截点统称为 trap（捕捉器）。

在 Proxy 出现之前，JavaScript 对象的"默认操作"无法干预——读取属性、`in` 检测、`delete` 等行为由引擎固定。Proxy 把这些底层操作暴露为可重写的钩子，使开发者能在"对象"这一层实现数据校验、日志审计、权限控制、缓存、响应式系统（Vue 3 的核心）等能力。Proxy 与 Reflect 通常成对出现：Reflect 的静态方法与 trap 一一对应，代表"执行默认行为"的标准方式。

---

## 一、构造语法

### 1. 基本形式

```javascript
// proxy = new Proxy(target, handler)
const target = {};   // 被代理的目标对象
const handler = {};  // trap 配置对象，为空时是透明代理
const proxy = new Proxy(target, handler);

proxy.name = 'Tom';
console.log(target.name); // 'Tom'（操作实际落在 target 上）
```

要点：对 `proxy` 的操作默认转发到 `target`（代理对象本身，不是副本）；空 handler 是透明代理；**必须持有 proxy 引用**——代理只拦截"经过 proxy"的操作，直接操作 `target` 不会被拦截，实践中通常不对外暴露 `target`。

### 2. target 的类型与可撤销代理

target 可以是普通对象、数组、函数，甚至另一个 Proxy，但**不能是原始值**。代理数组时常用于越界兜底：`new Proxy([1,2,3], { get: (t, p) => t[p] ?? '越界' })`。

此外 `Proxy.revocable(target, handler)` 返回 `{ proxy, revoke }`，调用 `revoke()` 后代理永久失效（再次操作抛 TypeError），适合把对象交给不可信代码临时使用。

---

## 二、13 种 trap

handler 上可配置 13 种 trap，与对象层面的基本操作一一对应：

| trap | 拦截的操作 | 典型触发方式 |
| --- | --- | --- |
| `get` | 读取属性 | `proxy.x`、`proxy['x']`、`arr[0]` |
| `set` | 设置属性 | `proxy.x = 1`、继承写操作 |
| `has` | 属性存在检测 | `'x' in proxy`、`with(proxy)` |
| `deleteProperty` | 删除属性 | `delete proxy.x` |
| `apply` | 函数调用 | `proxy()`、`proxy.call()`、`proxy.apply()` |
| `construct` | new 调用 | `new proxy(...)` |
| `ownKeys` | 枚举自身键 | `Object.keys`、`for...in`、`Reflect.ownKeys` |
| `getOwnPropertyDescriptor` | 获取属性描述符 | `Object.getOwnPropertyDescriptor` |
| `defineProperty` | 定义属性 | `Object.defineProperty` |
| `preventExtensions` | 阻止扩展 | `Object.preventExtensions` |
| `isExtensible` | 可扩展检测 | `Object.isExtensible` |
| `getPrototypeOf` | 读取原型 | `Object.getPrototypeOf`、`proxy.__proto__` |
| `setPrototypeOf` | 设置原型 | `Object.setPrototypeOf` |

> 组合触发：`Object.assign` 触发 `set` + `ownKeys`；`JSON.stringify` 触发 `get` + `ownKeys`；`for...in` 触发 `ownKeys` + `getOwnPropertyDescriptor`（用描述符过滤可枚举属性）。

### 1. get：拦截属性读取

签名 `get(target, property, receiver)`，返回值即读取结果：

```javascript
const proxy = new Proxy({ name: 'Tom' }, {
  get(target, property, receiver) {
    if (!(property in target)) {
      console.warn(`属性 ${String(property)} 不存在`);
      return undefined;
    }
    // Reflect.get 等价于 target[property]，并把 receiver 语义传递下去
    return Reflect.get(target, property, receiver);
  }
});
console.log(proxy.name); // 'Tom'
console.log(proxy.job);  // warn → undefined
```

常用场景：默认值、负索引数组、属性访问埋点、`_` 开头私有属性的外部读取保护。

### 2. set：拦截属性赋值

签名 `set(target, property, value, receiver)`，**必须返回布尔值**：返回 `false` 表示失败，严格模式下抛 TypeError。校验逻辑推荐直接 throw，让错误尽早暴露：

```javascript
const person = new Proxy({}, {
  set(target, property, value, receiver) {
    if (property === 'age') {
      if (!Number.isInteger(value)) throw new TypeError('age 必须是整数');
      if (value < 0 || value > 150) throw new RangeError('age 必须在 0-150 之间');
    }
    return Reflect.set(target, property, value, receiver);
  }
});

person.age = 20;   // OK
person.age = '20'; // TypeError: age 必须是整数
```

### 3. has：拦截 in 操作

签名 `has(target, property)`，拦截 `in` 与 `with` 内的变量查找（不拦截 `for...in`），必须返回布尔值：

```javascript
const rangeProxy = new Proxy({ start: 1, end: 100 }, {
  has(target, property) {
    // 把 '5' in rangeProxy 变成数字区间判断
    return Number(property) >= target.start && Number(property) <= target.end;
  }
});

console.log(5 in rangeProxy);   // true
console.log(200 in rangeProxy); // false
```
经典应用是隐藏内部属性：`_` 开头的键在 `has` 中返回 `false`。

### 4. deleteProperty：拦截删除

签名 `deleteProperty(target, property)`，返回 `false` 时严格模式抛 TypeError：

```javascript
const data = new Proxy({ id: 1, remark: 'x' }, {
  deleteProperty(target, property) {
    if (property === 'id') throw new Error('id 不可删除');
    delete target[property];
    return true;
  }
});
delete data.id; // Error: id 不可删除
```

### 5. apply：拦截函数调用

签名 `apply(target, thisArg, argumentsList)`，target 必须是函数：

```javascript
const sum = new Proxy(function (...args) {
  return args.reduce((a, b) => a + b, 0);
}, {
  apply(target, thisArg, argumentsList) {
    console.log(`sum(${argumentsList}) 被调用`);
    return Reflect.apply(target, thisArg, argumentsList);
  }
});
sum(1, 2, 3); // sum(1,2,3) 被调用 → 返回 6
```

### 6. construct：拦截 new

签名 `construct(target, argumentsList, newTarget)`，target 必须可实现 `new`，且**必须返回对象**，否则抛 TypeError：

```javascript
const User = new Proxy(class {
  constructor(name) { this.name = name; }
}, {
  construct(target, argumentsList, newTarget) {
    console.log(`new User(${argumentsList.join(', ')})`);
    return Reflect.construct(target, argumentsList, newTarget);
  }
});
new User('Tom'); // new User(Tom)
```

> `new proxy(...)` 只触发 `construct`（构造体内 `this.xxx = ...` 发生在新建对象上，不经过 proxy）；直接 `proxy()` 只触发 `apply`。

### 7. ownKeys：拦截键枚举

签名 `ownKeys(target)`，返回值必须是**数组**，并满足不变式：必须包含 target 的所有不可配置自有属性（target 不可扩展时还须包含全部自有属性）。`Object.keys` / `for...in` 只展示其中可枚举的字符串键：

```javascript
const obj = new Proxy({ a: 1, b: 2, _c: 3 }, {
  ownKeys(target) {
    // 过滤下划线开头的键
    return Reflect.ownKeys(target).filter(k => !String(k).startsWith('_'));
  }
});
console.log(Object.keys(obj)); // ['a', 'b']
```

### 8. 其余 6 种描述符与扩展类 trap

分三组：描述符类（`getOwnPropertyDescriptor` / `defineProperty`）、扩展能力类（`preventExtensions` / `isExtensible`）、原型类（`getPrototypeOf` / `setPrototypeOf`），均在拦截后转发 Reflect 同名方法即可：

```javascript
const proxy = new Proxy({}, {
  setPrototypeOf(target, proto) {
    throw new Error('禁止修改原型'); // 锁死原型；其余 5 种 trap 转发 Reflect 同名方法
  }
});

Object.setPrototypeOf(proxy, {}); // Error: 禁止修改原型
```

---

## 三、Reflect 配合

Reflect 是与 Proxy 同期推出的反射对象，把对象层面的底层操作收拢为静态方法，与 13 种 trap **一一对应**，是 trap 内"执行默认行为"的标准写法。

### 1. 为什么用 Reflect 而不是直接操作 target

关键差异在 **receiver 的传递**。`target[prop]` 会让 getter 的 `this` 指向 target，丢失真实读取者：

```javascript
const parent = {
  get value() { return this._value; } // this 应指向触发读取的 receiver
};
const child = Object.create(new Proxy(parent, {
  get(target, prop, receiver) {
    // 错误：return target[prop] → getter 内 this 是 target，找不到 _value
    // 正确：把 receiver（即 child）传下去
    return Reflect.get(target, prop, receiver);
  }
}));
child._value = 42;
console.log(child.value); // 42；若写 target[prop] 则是 undefined
```

### 2. Reflect 方法与 trap 对照

`Reflect.get/set/has/deleteProperty/apply/construct/ownKeys/getOwnPropertyDescriptor/defineProperty/preventExtensions/isExtensible/getPrototypeOf/setPrototypeOf` 与同名 trap 一一对应，参数约定也一致（多一个可传的 `receiver`）。例如 `Reflect.has(target, key)` 等价 `'key' in target`，`Reflect.ownKeys(target)` 返回全部字符串键与 Symbol 键。

Reflect 方法用**布尔返回值**替代命令式操作的抛错/静默失败，方便 `if (Reflect.set(obj, 'x', 1))` 这类判断；同时把"操作"从运算符/语法变为函数调用，与 trap 形成统一风格的元编程代码。

---

## 四、常见用例

### 1. 数据校验

校验规则与数据分离，规则集中管理，写入即校验：

```javascript
function createValidated(obj, rules) {
  return new Proxy(obj, {
    set(target, property, value, receiver) {
      const rule = rules[property];
      if (rule) {
        const errMsg = rule(value);
        if (errMsg) throw new TypeError(`${String(property)}: ${errMsg}`);
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}

const form = createValidated(
  { username: '', email: '' },
  {
    username: v => (typeof v === 'string' && v.length >= 3) ? null : '用户名至少 3 位',
    email: v => /^\S+@\S+\.\S+$/.test(v) ? null : '邮箱格式不正确'
  }
);
form.username = 'tom'; // OK
form.email = 'bad';    // TypeError: email: 邮箱格式不正确
```

### 2. 访问日志（AOP 式埋点）

不改动业务对象即可记录读写，适合调试与监控：

```javascript
function logAccess(obj, name = 'obj') {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      console.log(`[GET] ${name}.${String(prop)}`);
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      console.log(`[SET] ${name}.${String(prop)} = ${value}`);
      return Reflect.set(target, prop, value, receiver);
    }
  });
}
const state = logAccess({ count: 0 }, 'state');
state.count++; // [GET] state.count → [SET] state.count = 1
```

同一思路可做**方法计时**：在 `get` 中判断拿到的是函数，包一层计时后返回。

### 3. 缓存（惰性求值只算一次）

以属性读取为键缓存计算结果，适合方法/getter 成本高的对象：

```javascript
function cached(obj) {
  const cache = new Map();
  return new Proxy(obj, {
    get(target, prop, receiver) {
      if (prop in target && typeof target[prop] === 'function') {
        // 把方法绑定到 target 后缓存，避免每次访问都创建新函数
        if (!cache.has(prop)) cache.set(prop, Reflect.get(target, prop, receiver).bind(target));
        return cache.get(prop);
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}
```

### 4. 响应式系统的核心（Vue 3 思路简版）

`get` 中收集依赖、`set` 中触发更新，这就是响应式的最小模型：

```javascript
let activeEffect = null;
const depsMap = new WeakMap(); // target -> key -> Set<effect>

function reactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      if (activeEffect) {
        // track：谁读了我，就登记谁
        const deps = depsMap.get(target) ?? depsMap.set(target, new Map()).get(target);
        const effects = deps.get(key) ?? deps.set(key, new Set()).get(key);
        effects.add(activeEffect);
      }
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
      const ok = Reflect.set(target, key, value, receiver);
      // trigger：写入后通知该 key 的所有读者
      depsMap.get(target)?.get(key)?.forEach(fn => fn());
      return ok;
    }
  });
}

function effect(fn) { activeEffect = fn; fn(); activeEffect = null; }

const state = reactive({ count: 0 });
effect(() => console.log('count is', state.count)); // count is 0
state.count = 1; // count is 1（自动重新执行）
```

> WeakMap 以原对象为键避免内存泄漏；Set 去重保证同一 effect 只触发一次；Reflect 的 receiver 传递保证 getter 内 `this` 指向代理，嵌套属性的依赖收集才正确。

其他典型场景：**负索引数组**（`get` 中把负数下标换算成 `target.length + prop`）、**废弃 API 提示**（`get` 中打印 deprecation 警告后转发）等。

---

## 五、与 Object.defineProperty 对比

`Object.defineProperty` 是 ES5 时代唯一的对象拦截手段，二者能力差异显著：

| 维度 | Object.defineProperty | Proxy |
| --- | --- | --- |
| 拦截范围 | 只能劫持**已存在的指定属性**的读/写 | 拦截**对象层面**的 13 类基本操作 |
| 新增/删除属性 | 监听不到（Vue 2 需要 `$set`/`$delete`） | 天然拦截（get/set/deleteProperty 覆盖） |
| 数组 | 无法监听下标赋值与 `length` 修改（Vue 2 需重写数组方法） | `set`/`get` 直接覆盖任意下标 |
| 操作种类 | 只有数据属性 get/set 与访问器 | 13 种 trap：in、delete、new、调用、枚举、原型都可拦截 |
| 性能 | 属性描述符层，访问路径更短 | 每次操作多一层代理转发（V8 已高度优化） |
| 兼容性 | IE9+ | 不支持 IE，现代浏览器均支持 |
| 可撤销 | 不可逆（define 后只能 redefine） | `Proxy.revocable` 可整体撤销 |

### 1. 典型局限对比

```javascript
// defineProperty：只劫持"整体替换"，下标赋值/数组方法/新增属性全部漏掉
const s1 = { list: [1, 2] };
Object.defineProperty(s1, 'list', {
  get() { return s1._list; },
  set(v) { console.log('set list'); s1._list = v; }
});
s1.list[0] = 99; // ❌ 不触发 set（下标赋值绕过 getter/setter）
s1.newKey = 1;   // ❌ 未 defineProperty 的新属性完全无法监听

// Proxy：对象层面统一拦截，下标/新增/删除全覆盖
const s2 = new Proxy({ list: [1, 2] }, {
  set(target, prop, value, receiver) {
    console.log(`set ${String(prop)}`);
    return Reflect.set(target, prop, value, receiver);
  }
});
s2.list[0] = 99; // ✅ set 0（下标也是属性）
s2.extra = 1;    // ✅ set extra（新增属性）
delete s2.extra; // ✅ deleteProperty 可拦截删除
```

这正是 Vue 2 需要 `Vue.set` 与数组方法补丁（重写 push/splice 等 7 个方法）、而 Vue 3 可以直接用 Proxy 的原因。

### 2. 各自的适用位置

- **defineProperty**：单属性精细控制、需兼容旧浏览器的库代码、只读常量定义。
- **Proxy**：整对象元编程、响应式框架（Vue 3 / MobX 5+）、数据校验层、调试与监控、权限隔离。

> 注意：`#` 声明的私有字段绕过属性查找机制，Proxy 无法拦截；`_` 前缀约定属性则可以配合 `get`/`has`/`ownKeys` 做软性保护。

---

## 六、使用注意

1. **代理引用是唯一入口**：拿到 `target` 原对象就能绕过代理，封装时不要泄露 `target`。
2. **this 指向问题**：trap 内若直接 `target[method]()`，方法内部 `this` 是 `target` 而非 `proxy`，可能绕过其他 trap；必要时 `bind(proxy)` 或在 `apply` 中处理。
3. **不变式（invariants）**：部分 trap 结果必须与 target 的真实状态一致（不可配置属性、不可扩展对象等），违反即抛 TypeError——代理不能凭空"伪造"引擎已知的既成事实。
4. **性能**：热路径上的高频小对象读写加代理有可测开销，粒度应放在合适层级（如 Vue 3 的组件级 effect）。
5. **带内部槽的内置对象**：`Date`、`Map`、`Promise` 等的方法依赖内部 this 槽，代理后直接调用可能报错，需绑定正确的 receiver。

---

## 小结

- Proxy 在目标对象外建立一层**可编程拦截**，13 种 trap 覆盖属性读写、`in`、`delete`、函数调用、`new`、枚举与原型操作。
- trap 内用 **Reflect** 执行默认行为并传递 `receiver`，是与代理配套的标准姿势。
- 典型应用：数据校验、日志埋点、缓存、响应式系统（Vue 3 `reactive` 的核心即 Proxy）。
- 相比 `Object.defineProperty`，Proxy 拦截的是对象操作而非单个属性，天然支持新增/删除属性与数组下标，能力全面但有兼容性与轻微性能代价。
