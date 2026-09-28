---
title: "Vue3 选项式 API"
description: "以可运行示例讲解 Vue 3 选项式 API：声明式渲染、计算属性与侦听器的区别和缓存、条件/列表渲染注意点、class 与 style 绑定、v-model 表单绑定与生命周期钩子，最后给出一个综合筛选案例。"
keywords: [Vue3, 选项式 API, 计算属性, 侦听器, 生命周期]
category: Vue
tags: [Vue, Vue3, Options API]
---

# Vue3 选项式 API

官网地址：https://cn.vuejs.org/

Vue.js 下载地址：https://unpkg.com/vue@3/dist/vue.global.js

## 选项式 API 编程风格

选项式 API 即：options API

```javascript
let vm = createApp({
  methods: {},
  computed: {},
  watch: {},
  data(){},
  mounted(){}
})
```

优势：

- 只有一个参数，不会出现参数顺序的问题，随意调整配置的位置
- 非常清晰，语法化特别强
- 非常适合添加默认值的

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
    <script src="/vue.global.js"></script>
  </head>
  <body>
    <div id="app"></div>
    <script>
      // 仿照 Vue.createApp 的实现，主要是解构 options 对象
      function createApp(options) {
        let { methods = {} } = options
      }

      let vm = Vue.createApp({
        methods: {
          xxx() {}
        },
        data() {
          return {}
        },
        computed: {
          xxx() {}
        }
      }).mount("#app")
    </script>
  </body>
</html>
```

## 声明式渲染

Vue.js 的核心是一个允许采用简洁的模板语法来声明式地将数据渲染进 DOM 的系统。js 表达式就是能够赋值的操作，  `{{ if(true){} }}` 不是 js 表达式

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
    <script src="/vue.global.js"></script>
  </head>
  <body>
    <div id="app">{{ message }} {{ 'hi' }} {{ [1, 2, 3] }}
      <!-- {{ function(){} }} 与 {{ if(true){} }} 不是合法的 js 表达式，写进插值会在编译阶段报错 -->
    </div>
    <script>
      let vm = Vue.createApp({
        data() {
          return {
            message: "hello world"
          }
        }
      }).mount("#app")
    </script>
  </body>
</html>
```

声明式编程：不需要编写具体是如何实现的，直接调用声明就可以实现功能。SQL 就是比较经典的声明式语言：

```plsql
SELECT * from user WHERE username = xiaoming
```

命令式编程

```javascript
for(var i=0;i<user.length;i++){
  if(user[i].username == "xiaoye"){
    print("find");
    break;
  }
}
```

## 计算属性与侦听器区别与原理

### 计算属性

模板内的表达式非常便利，但是设计它们的初衷是用于简单运算的。在模板中放入太多的逻辑会让模板过重且难以维护，所以过于复杂的逻辑可以移植到计算属性中进行处理

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script src="/vue.global.js"></script>
  </head>
  <body>
    <div id="app">
      {{ message.split(' ').reverse().join(' ') }}<br>
      {{ reverseMessageMethod() }}<br>
      {{ reverseMessageMethod() }}<br>
      {{ reverseMessage }}<br>
      {{ reverseMessage }}<br>
    </div>
    <script>

      let vm = Vue.createApp({
        data() {
          return {
            message: 'hello world'
          }
        },
        methods: {
          reverseMessageMethod() {
            console.log(1);
            return this.message.split(' ').reverse().join(' ');
          }
        },
        computed: {
          /* 
          reverseMessage(){
              console.log(2);
              return this.message.split(' ').reverse().join(' ');
            } 
          */
          reverseMessage: {
            // setter
            set(value) {
              this.message = value;
            },
            // getter
            get() {
              return this.message.split(' ').reverse().join(' ');
            }
          }
        }
      }).mount('#app');

      setTimeout(() => {
        vm.reverseMessage = 'hi vue';
        //vm.message = 'hi vue';
      }, 2000)

    </script>
  </body>
</html>
```

计算属性跟方法相比，具备缓存的能力，而方法不具备缓存

注意：默认是只读的，一般不会直接更改计算属性，如果想更改也是可以做到的，通过Setter写法实现，[官方地址](https://cn.vuejs.org/guide/essentials/computed.html#可写计算属性)

既然计算属性编写的是一个函数，而调用的时候以函数名的形式进行使用，其实实现起来也不是特别难的事情：

```javascript
let computed = {
  num(){
    return 123;
  }
}

let vm = {}
for(let attr in computed){
  console.log(attr)  // num
  Object.defineProperty(vm, attr, {
    value: computed[attr]()
  })
}
```

### 侦听器

虽然计算属性在大多数情况下更合适，但有时也需要一个自定义的侦听器。侦听器的目的：侦听器用来观察和响应 Vue 实例上的数据变动,类似于监听机制+事件机制。当有一些数据需要随着其它数据变化而变化时,就可以使用侦听器。

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script src="/vue.global.js"></script>
  </head>
  <body>
    <div id="app">
      {{ message }}
    </div>
    <script>

      let vm = Vue.createApp({
        data() {
          return {
            message: 'hello world'
          }
        },
        watch: {
          message(newVal, oldVal) {
            console.log(newVal, oldVal);
          }
        }
      }).mount('#app');

      setTimeout(() => {
        vm.message = 'hi vue';
      }, 2000)

    </script>
  </body>
</html>
```

有时候，计算属性 和 侦听器 往往能实现同样的需求，那么它们有何区别呢？

- **计算属性适合：多个值去影响一个值的应用**
- **而侦听器适合：一个值去影响多个值的应用**
- **侦听器支持异步的程序，而计算属性不支持异步的程序**

## 条件渲染与列表渲染及注意点

### 条件渲染

`v-if` 指令用于条件性地渲染一块内容。这块内容只会在指令的表达式返回 truthy 值的时候被渲染

在 `JavaScript` 中，`truthy`（真值）指的是在布尔值上下文中，转换后的值为真的值。所有值都是真值，除非它们被定义为 falsy 假值（即除 `false、0、-0、0n、""、null、undefined 和 NaN` 以外皆为真值）

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script src="/vue.global.js"></script>
  </head>
  <body>
    <div id="app">
      <div v-if="isShow">aaaaa</div>
      <div v-else>bbbbb</div>
    </div>
    <script>

      let vm = Vue.createApp({
        data(){
          return {
            isShow: 0
          }
        }
      }).mount('#app');

    </script>
  </body>
</html>
```

### 列表渲染

v-for 指令基于一个数组来渲染一个列表。v-for 指令需要使用 item in items 形式的特殊语法，其中 items 是源数据数组，而 item 则是被迭代的数组元素的别名

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script src="/vue.global.js"></script>
  </head>
  <body>
    <div id="app">
      <div v-for="(item, index) in list">{{ item }}, {{ index }}</div>
      <div v-for="(value, key, index) in info">{{ value }}, {{ key }}, {{ index }}</div>
      <div v-for="item in num">{{ item }}</div>
      <div v-for="item in text">{{ item }}</div>
    </div>
    <script>

      let vm = Vue.createApp({
        data() {
          return {
            list: ['a', 'b', 'c'],
            info: {username: 'xiaoming', age: 20},
            num: 10,
            text: 'hello'
          }
        }
      }).mount('#app');

      // 修改生效的
      setTimeout(() => {
        vm.list.push('d');
        vm.list[1] = 'd';
      }, 2000)

    </script>
  </body>
</html>
```

### 条件渲染与列表渲染需要注意的点

- 列表渲染需要添加 key 属性，用来跟踪列表的身份
- v-if 和 v-for 尽量不要一起使用，可利用计算属性来完成筛选这类功能（因为 v-if 优先级高于 v-for，这样 v-if  拿不到 v-for 中的 item 属性）
- template 标签起到的作用，形成一个整体容器

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script src="/vue.global.js"></script>
</head>
<body>
<div id="app">
    <template v-if="isShow">
        <div>aaaa</div>
        <div>bbbb</div>
    </template>
    <div v-for="(item, index) in list" :key="index">{{ item.text }}, {{ index }}, <input type="text"></div>
    <br>
    <div v-for="(item, index) in oddList" :key="index">{{ item.text }}, {{ index }}, <input type="text"></div>
</div>
<script>

    let vm = Vue.createApp({
        data() {
            return {
                isShow: true,
                list: [
                    {id: 1, text: 'a'},
                    {id: 2, text: 'b'},
                    {id: 3, text: 'c'},
                ]
            }
        },
        computed: {
            oddList() {
                return this.list.filter((v) => v.id % 2 === 1);
            }
        }
    }).mount('#app');

    setTimeout(() => {
        vm.list.unshift({id: 4, text: 'd'});
    }, 3000)

</script>
</body>
</html>
```

## class 与 style 的三种形态

操作元素的 class 列表和内联样式是数据绑定的一个常见需求。因为它们都是 attribute，所以我们可以用 `v-bind` 处理它们：只需要通过表达式计算出字符串结果即可

不过，字符串拼接麻烦且易错。因此，在将 `v-bind` 用于 `class` 和 `style` 时，Vue.js 做了专门的增强。表达式结果的类型除了字符串之外，还可以是对象或数组

- 字符串
- 数组
- 对象

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
      .box1 {
        background: red;
      }
      .box2 {
        color: white;
      }
    </style>
    <script src="/vue.global.js"></script>
  </head>
  <body>
    <div id="app">
      <div :class="myClass">aaaaa</div>
      <div :style="myStyle">bbbbb</div>
    </div>
    <script>

      let vm = Vue.createApp({
        data() {
          return {
            myClass: 'box1 box2',
            //myClass: ['box1', 'box2'],
            //myClass: { box1: true, box2: true }
            
            //myStyle: 'background: blue; color: yellow',
            //myStyle: ['background: blue', 'color: yellow'],
            myStyle: {background: 'blue', color: 'yellow'},
          }
        }
      }).mount('#app');

      setTimeout(() => {

        //vm.myClass.pop();
        //vm.myClass.box2 = false;

        //vm.myStyle.push('width: 300px');
        vm.myStyle.color = 'white';

      }, 2000)

    </script>
  </body>
</html>
```

数组和对象的形式要比字符串形式更加的灵活，也更容易控制变化。

## 表单处理与双向数据绑定原理

在 Vue 中是通过 v-model 指令来操作表单的，可以非常灵活的实现响应式数据的处理

尽管有些神奇，但 `v-model` 本质上不过是语法糖。可通过 value 属性 + input 事件来实现同样的效果

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script src="/vue.global.js"></script>
  </head>
  <body>
    <div id="app">
      <!-- <input type="text" v-model="message"> -->
      <input type="text" :value="message" @input="message = $event.target.value">
    </div>
    <script>

      let vm = Vue.createApp({
        data() {
          return {
            message: 'hello world'
          }
        }
      }).mount('#app');

      setTimeout(() => {
        vm.message = 'hi vue'
      }, 2000)

    </script>
  </body>
</html>
```

v-model 除了可以处理输入框以外，也可以用在单选框、复选框、以及下拉菜单中

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script src="/vue.global.js"></script>
  </head>
  <body>
    <div id="app">
      <input type="checkbox" v-model="fruits" value="苹果">苹果<br>
      <input type="checkbox" v-model="fruits" value="西瓜">西瓜<br>
      <input type="checkbox" v-model="fruits" value="哈密瓜">哈密瓜<br>
      {{ fruits }}
      <br>

      <input type="radio" v-model="gender" value="女">女<br>
      <input type="radio" v-model="gender" value="男">男<br>
      {{ gender }}
      <br>

      <select v-model="city">
        <option value="北京">北京</option>
        <option value="上海">上海</option>
        <option value="杭州">杭州</option>
      </select>
      {{ city }}
    </div>
    <script>

      let vm = Vue.createApp({
        data() {
          return {
            fruits: ['西瓜', '哈密瓜'],
            gender: '男',
            city: '杭州'
          }
        }
      }).mount('#app');

      setTimeout(() => {
        vm.message = 'hi vue'
      }, 2000)

    </script>
  </body>
</html>
```

## 生命周期钩子函数及原理分析

每个组件在被创建时都要经过一系列的初始化过程——例如，需要设置数据监听、编译模板、将实例挂载到 DOM 并在数据变化时更新 DOM 等

同时在这个过程中也会运行一些叫做**生命周期钩子**的函数，这给了用户在不同阶段添加自己的代码的机会

简单来说生命周期钩子函数就是回调函数，在 Vue 的某个时机去调用对应的回调函数。就像定时器一样，谁调用的定时器的回调函数呢？其实就是定时器内部在调用的

```javascript
setTimeout(()=>{
	console.log('2秒后被执行了');
}, 2000)
```

官方提供的[**生命周期图示**](https://cn.vuejs.org/guide/essentials/lifecycle.html#lifecycle-diagram)

![img](https://cdn.nlark.com/yuque/0/2023/png/28081210/1681442541974-8f0d4aa1-64a7-4d8b-a081-2cef32906319.png)



生命周期可划分为三个部分：

1. 初始阶段：beforeCreate、created、beforeMount、mounted
2. 更新阶段：beforeUpdate、updated
3. 销毁阶段：beforeUnmount、unmounted

注：一般在，created，mounted 中都可以发送数据请求，但是，大部分时候，会在 created 发送请求。因为这样可以更短的时间去响应数据

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <script src="/vue.global.js"></script>
</head>
<body>
  <div id="app">
    {{ message }}
  </div>
  <script>

    /* function foo(cb){
      //指定的时机去调用回调函数
      cb();
    }
    foo(function(){
      // 编写复杂的逻辑1
    });
    foo(function(){
      // 编写复杂的逻辑2
    }); */

    let vueApp = Vue.createApp({
      data(){
        return {
          message: 'hello world'
        }
      },
      beforeCreate(){
        // console.log( this.message );
        // console.log( app.innerHTML );
      },
      // 响应式数据准备好后触发的生命周期
      created(){
        // console.log( this.message );   // ✔
        // console.log( app.innerHTML );
       /*  setTimeout(()=>{
          this.message = 'hi vue';
        }, 1000) */
      },
      beforeMount(){
        // console.log( this.message );   // ✔
        // console.log( app.innerHTML );
      },
      // 等DOM加载完毕后触发的生命周期
      mounted(){
        // console.log( this.message );   // ✔
        // console.log( app.innerHTML );  // ✔

        /* setTimeout(()=>{
          this.message = 'hi vue';
        }, 1000) */

      },
      beforeUpdate(){   // 在更新数据的时候会触发的生命周期
        // console.log( this.message );
        // console.log( app.innerHTML );
      },
      updated(){
        // console.log( this.message );
        // console.log( app.innerHTML );
      },
      beforeUnmount(){
        // console.log( this.message );
        // console.log( app.innerHTML );
      },
      unmounted(){
        console.log( this.message );
        console.log( app.innerHTML );   // ''
      }
    })
    
    
    vueApp.mount('#app');

    setTimeout(()=>{
      //vm.message = 'hi vue';
      vueApp.unmount();
    }, 1000)

  </script>
</body>
</html>
```

## 综合案例

02-data.json 文件

```json
[
  {
    "id": 1,
    "name": "小明",
    "gender": "女",
    "age": 20
  },
  {
    "id": 2,
    "name": "小强",
    "gender": "男",
    "age": 18
  },
  {
    "id": 3,
    "name": "大白",
    "gender": "女",
    "age": 25
  },
  {
    "id": 4,
    "name": "大红",
    "gender": "男",
    "age": 22
  }
]
```

配套的 HTML 页面：

```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
        .active-gender {
            background: red;
        }
    </style>
    <script src="/vue.global.js"></script>
</head>

<body>
<div id="app">
    <input type="text" v-model="message">
    <button :class="activeGender('全部')" @click="handleGender('全部')">全部</button>
    <button :class="activeGender('男')" @click="handleGender('男')">男</button>
    <button :class="activeGender('女')" @click="handleGender('女')">女</button>
    <ul>
        <li v-for="item in filterList" :key="item.id">{{ item.name }}, {{ item.gender }}, {{ item.age }}</li>
    </ul>
</div>
<script>

    let vm = Vue.createApp({
        data() {
            return {
                list: [],
                message: '',
                gender: '全部'
            }
        },
        created() {
            fetch('./02-data.json').then((res) => res.json()).then((res) => {
                this.list = res;
            })
        },
        computed: {
            filterList() {
                return this.list
                    .filter((v) => v.name.includes(this.message))
                    .filter((v) => v.gender === this.gender || '全部' === this.gender);
            }
        },
        methods: {
            activeGender(gender) {
                return {'active-gender': this.gender === gender};
            },
            handleGender(gender) {
                this.gender = gender;
            }
        }
    }).mount('#app');

</script>
</body>

</html>
```