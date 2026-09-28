---
title: 手写 EventEmitter
description: 理解发布-订阅模式，并基于 Node.js events 模块实现一个浏览器端的 EventEmitter
keywords: [EventEmitter, 发布订阅, 事件驱动, 手写实现]
category: JavaScript
tags: [JavaScript, 异步, 事件, 发布订阅]
---

# 手写 EventEmitter

## 概述

Node.js 采用事件驱动架构，其 `events` 模块对外提供 `EventEmitter` 对象，用于统一管理事件。Node.js 中几乎所有核心模块都继承自 `EventEmitter`，以支撑异步事件驱动架构。

```javascript
const events = require('events');
const eventEmitter = new events.EventEmitter();

eventEmitter.on('say', function (name) {
  console.log('Hello', name);
});

eventEmitter.emit('say', 'John'); // Hello John
```

上述代码中，通过 `emit` 发出 `say` 事件，通过 `on` 监听事件并执行对应回调。

## 核心 API

| 方法 | 说明 |
|------|------|
| `on` / `addListener` | 为指定事件添加监听器（二者等价） |
| `off` / `removeListener` | 移除指定事件的某一个监听器（二者等价） |
| `removeAllListeners` | 移除指定事件的全部监听器 |
| `emit` | 触发指定事件，执行其所有监听器 |
| `once` | 添加只触发一次的监听器 |

### on 与 addListener、off 与 removeListener

`on` 是 `addListener` 的别名，`off` 是 `removeListener` 的别名，功能完全一致。

```javascript
const emitter = new events.EventEmitter();

function hello1(name) {
  console.log('hello 1', name);
}
function hello2(name) {
  console.log('hello 2', name);
}

emitter.addListener('say', hello1);
emitter.addListener('say', hello2);
emitter.emit('say', 'John');
// hello 1 John
// hello 2 John

emitter.removeListener('say', hello1);
emitter.emit('say', 'John');
// 仅输出 hello 2 John（hello1 已被移除）
```

### removeAllListeners

移除指定事件的所有监听器。

```javascript
emitter.addListener('say', hello1);
emitter.addListener('say', hello2);
emitter.removeAllListeners('say');
emitter.emit('say', 'John'); // 无输出，所有监听器已被移除
```

### on 与 once 的区别

`on` 添加的监听器可被持续触发；`once` 添加的监听器触发一次后自动移除。

```javascript
emitter.on('say', hello1);
emitter.emit('say', 'John'); // hello John
emitter.emit('say', 'Lily'); // hello Lily

emitter.once('see', hello1);
emitter.emit('see', 'Tom'); // 仅一次 hello Tom
emitter.emit('see', 'Tom'); // 无输出
```

## 浏览器端实现

Node.js 的 `EventEmitter` 封装在 `events` 模块中，我们也可以在浏览器端封装一个类似的实现，用于自定义事件的订阅与发布，提升业务开发的便利性。其底层设计模式为**发布-订阅模式**。

### 初始化

用一个内部对象 `__events` 存储自定义事件及其监听器数组。

```javascript
function EventEmitter() {
  this.__events = {};
}
EventEmitter.VERSION = '1.0.0';
```

### 实现 on

`on` 的核心思路：当订阅一个自定义事件时，先校验监听器合法性，再将其存入 `__events` 对象中，供后续触发时调用。

```javascript
function isValidListener(listener) {
  if (typeof listener === 'function') {
    return true;
  } else if (listener && typeof listener === 'object') {
    return isValidListener(listener.listener);
  }
  return false;
}

function indexOf(array, item) {
  let result = -1;
  item = typeof item === 'object' ? item.listener : item;
  for (let i = 0; i < array.length; i++) {
    if (array[i].listener === item) {
      result = i;
      break;
    }
  }
  return result;
}

EventEmitter.prototype.on = function (eventName, listener) {
  if (!eventName || !listener) return;
  if (!isValidListener(listener)) {
    throw new TypeError('listener must be a function');
  }

  const events = this.__events;
  const listeners = (events[eventName] = events[eventName] || []);
  const listenerIsWrapped = typeof listener === 'object';

  // 不重复添加相同监听器
  if (indexOf(listeners, listener) === -1) {
    listeners.push(
      listenerIsWrapped
        ? listener
        : {
            listener: listener,
            once: false,
          }
    );
  }
  return this;
};
```

### 实现 emit

`emit` 获取对应事件的监听器并依次执行，对 `once` 为 `true` 的监听器在触发后自动解绑。参数使用剩余参数收集，以便 `apply` 转发给监听器：

```javascript
EventEmitter.prototype.emit = function (eventName, ...args) {
  const listeners = this.__events[eventName];
  if (!listeners) return;

  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i];
    if (listener) {
      listener.listener.apply(this, args);
      if (listener.once) {
        this.off(eventName, listener.listener);
      }
    }
  }
  return this;
};
```

### 实现 off

`off` 从监听器数组中移除指定的监听器（用 `null` 占位以保持索引稳定）。

```javascript
EventEmitter.prototype.off = function (eventName, listener) {
  const listeners = this.__events[eventName];
  if (!listeners) return;

  let index;
  for (let i = 0; i < listeners.length; i++) {
    if (listeners[i] && listeners[i].listener === listener) {
      index = i;
      break;
    }
  }

  if (typeof index !== 'undefined') {
    listeners.splice(index, 1, null);
  }
  return this;
};
```

### 实现 once 与 allOff

`once` 本质是调用 `on`，传入 `once: true` 标记；`allOff` 用于清空事件监听。

```javascript
EventEmitter.prototype.once = function (eventName, listener) {
  return this.on(eventName, {
    listener: listener,
    once: true,
  });
};

EventEmitter.prototype.allOff = function (eventName) {
  if (eventName && this.__events[eventName]) {
    this.__events[eventName] = [];
  } else {
    this.__events = {};
  }
};
```

## 设计模式辨析

`EventEmitter` 采用**发布-订阅模式**，它是观察者模式的变形。两者区别在于：**发布-订阅模式在目标和观察者之间增加了一个调度中心**。

- **观察者模式**：目标和观察者直接关联，目标状态变化时直接通知观察者。
- **发布-订阅模式**：通过事件中心解耦发布者和订阅者，双方互不直接感知。

Vue 组件通信方案中的 `EventBus` 就是发布-订阅模式的落地实现，其核心与 `EventEmitter` 的思路一致：所有组件共享一个事件中心，组件可以向中心注册或触发事件，从而实现跨组件通信。

## 总结

- `EventEmitter` 是 Node.js 事件驱动架构的基础，核心方法包括 `on` / `once` / `emit` / `off` / `removeAllListeners`。
- 浏览器端可基于发布-订阅模式自行封装一个功能完整的 `EventEmitter`。
- 理解其实现，有助于深入理解事件驱动与发布-订阅设计思想。
