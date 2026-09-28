---
title: "API"
description: "vue-router 3（Vue 2）组件 API 参考：router-link 的 props 与 v-slot、router-view、路由对象属性与组件注入。"
category: 前端

---

# API

## router-link

`<router-link>` 组件支持用户在具有路由功能的应用中 (点击) 导航

`to` 属性指定目标地址，默认渲染成带有正确链接的 `<a>` 标签，可以通过配置 `tag` 属性生成别的标签。另外，当目标路由成功激活时，链接元素自动设置一个表示激活的 CSS 类名

`<router-link>` 比起写死的 `<a href="...">` 会好一些

- 无论是 HTML5 history 模式还是 hash 模式，它的表现行为一致，所以，当你要切换路由模式，或者在 IE9 降级使用 hash 模式，无须作任何变动
- 在 HTML5 history 模式下，`router-link` 会守卫点击事件，让浏览器不再重新加载页面
- 当你在 HTML5 history 模式下使用 `base` 选项之后，所有的 `to` 属性都不需要写 (基路径) 了

### v-slot (3.1.0 新增)

`router-link` 通过一个[作用域插槽](https://cn.vuejs.org/v2/guide/components-slots.html#作用域插槽)暴露底层的定制能力。这是一个更高阶的 API，主要面向库作者，但也可以为开发者提供便利，多数情况用在一个类似 *NavLink* 这样的自定义组件里

**在使用** `v-slot` **API 时，需要向** `router-link` **传入一个单独的子元素**。否则 `router-link` 将会把子元素包裹在一个 `span` 元素内

```html
<router-link to="/about" custom v-slot="{ href, route, navigate, isActive, isExactActive }">
  <NavLink :active="isActive" :href="href" @click="navigate">{{ route.fullPath }}</NavLink>
</router-link>
```

- `href`：解析后的 URL。将会作为一个 `a` 元素的 `href` attribute
- `route`：解析后的规范化的地址
- `navigate`：触发导航的函数。**会在必要时自动阻止事件**，和 `router-link` 同理
- `isActive`：如果需要应用[激活的 class](#active-class) 则为 `true`。允许应用一个任意的 class
- `isExactActive`：如果需要应用[精确激活的 class](#exact-active-class) 则为 `true`。允许应用一个任意的 class

### 示例：将激活的 class 应用在外层元素

把激活的 class 应用到一个外部元素而不是 `<a>` 标签本身，这时你可以在一个 `router-link` 中包裹该元素并使用 `v-slot` 属性 来创建链接

```html
<router-link
  to="/foo"
  v-slot="{ href, route, navigate, isActive, isExactActive }"
  custom
  >
  <li
    :class="[isActive && 'router-link-active', isExactActive && 'router-link-exact-active']"
    >
    <a :href="href" @click="navigate">{{ route.fullPath }}</a>
  </li>
</router-link>
```

在 `<a>` 元素上添加一个 `target="_blank"`，则 `@click="navigate"` 处理器会被忽略

```html
<!DOCTYPE html>
<html lang="en">

  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script src="https://unpkg.com/vue@2.7/dist/vue.js"></script>
    <script src="https://unpkg.com/vue-router@3/dist/vue-router.js"></script>
    <style>
      a.router-link-active, li.router-link-active a {
        color: #f66;
      }

      a.router-link-exact-active, li.router-link-exact-active a {
        border-bottom: 1px solid #f66;
      }
    </style>
  </head>

  <body>
    <div id="app">
      <h1>Active Links</h1>
      <ul>
        <li>
          <router-link to="/">/</router-link>
        </li>
        <li>
          <router-link to="/" exact>/ (exact match)</router-link>
        </li>

        <li>
          <router-link to="/users">/users</router-link>
        </li>
        <li>
          <router-link to="/users" exact>/users (exact match)</router-link>
        </li>

        <li>
          <router-link to="/users/evan">/users/evan</router-link>
        </li>
        <li>
          <router-link to="/users/evan#foo">/users/evan#foo</router-link>
        </li>
        <li>
          <router-link :to="{ path: '/users/evan', query: { foo: 'bar' }}">
            /users/evan?foo=bar
          </router-link>
        </li>
        <li><!-- #635 -->
          <router-link :to="{ name: 'user', params: { username: 'evan' }, query: { foo: 'bar' }}" exact>
            /users/evan?foo=bar (named view + exact match)
          </router-link>
        </li>
        <li>
          <router-link :to="{ path: '/users/evan', query: { foo: 'bar', baz: 'qux' }}">
            /users/evan?foo=bar&baz=qux
          </router-link>
        </li>

        <li>
          <router-link to="/about">/about</router-link>
        </li>

        <router-link tag="li" to="/about">
          <a>/about (active class on outer element)</a>
        </router-link>

        <li>
          <router-link to="/gallery">/gallery (redirect to /gallery/image1)</router-link>
        </li>
        <li>
          <router-link :to="{ name: 'gallery' }">/gallery named link (redirect to /gallery/image1)</router-link>
        </li>
        <li>
          <router-link :to="{ name: 'image', params: {imageId: 'image2'} }">/gallery/image2</router-link>
        </li>
        <li>
          <router-link :to="{ name: 'image', params: {imageId: 'image1'} }">/gallery/image1</router-link>
        </li>
        <li>
          <router-link to="/redirect-gallery">/redirect-gallery (redirect to /gallery)</router-link>
        </li>
        <li>
          <router-link :to="{ name: 'redirect-gallery' }">/redirect-gallery named (redirect to /gallery)</router-link>
        </li>
        <li>
          <router-link to="/redirect-image">/redirect-image (redirect to /gallery/image1)</router-link>
        </li>
        <li>
          <router-link :to="{ name: 'redirect-image' }">/redirect-image named (redirect to /gallery/image1)
          </router-link>
        </li>

        <li>
          <router-link to="/users?one" exact-path>/users?one</router-link>
        </li>
        <li>
          <router-link to="/users?two" exact-path>/users?two</router-link>
        </li>
        <li>
          <router-link to="/users/nested?two" exact-path>/users/nested?two</router-link>
        </li>
      </ul>
      <router-view class="view"></router-view>
    </div>
    <script>
      const Home = {template: '<div><h2>Home</h2></div>'}
      const About = {template: '<div><h2>About</h2></div>'}

      const Users = {
        template: `
            <div>
            <h2>Users</h2>
            <router-view></router-view>
      </div>
            `
      }

      const User = {template: '<div>{{ $route.params.username }}</div>'}

      const Gallery = {
        template: `
            <div>
            <h2>Gallery</h2>
            <router-view></router-view>
      </div>
            `
      }

      const Image = {template: '<div>{{ $route.params.imageId }}</div>'}

      const router = new VueRouter({
        mode: 'hash',
        base: "routerLink",
        routes: [
          {path: '/', component: Home},
          {path: '/about', component: About},
          {
            path: '/redirect-gallery',
            name: 'redirect-gallery',
            redirect: {name: 'gallery'}
          },
          {
            path: '/redirect-image',
            name: 'redirect-image',
            redirect: {name: 'image', params: {imageId: 'image1'}}
          },
          {
            path: '/users',
            component: Users,
            children: [{path: ':username', name: 'user', component: User}]
          },
          {
            path: '/gallery',
            component: Gallery,
            children: [
              {
                path: '',
                name: 'gallery',
                redirect: {name: 'image', params: {imageId: 'image1'}}
              },
              {path: ':imageId', component: Image, name: 'image'}
            ]
          }
        ]
      })

      const app = new Vue({
        router,
      }).$mount('#app')

    </script>
  </body>

</html>
```

### props

#### to

表示目标路由的链接。当被点击后，内部会立刻把 `to` 的值传到 `router.push()`，所以这个值可以是一个字符串或者是描述目标位置的对象。

-  类型: `string | Location` 
-  required

```html
<!-- 字符串 -->
<router-link to="home">Home</router-link>

<!-- 渲染结果 -->
<a href="home">Home</a>

<!-- 使用 v-bind 的 JS 表达式 -->
<router-link v-bind:to="'home'">Home</router-link>

<!-- 不写 v-bind 也可以，就像绑定别的属性一样 -->
<router-link :to="'home'">Home</router-link>

<!-- 同上 -->
<router-link :to="{ path: 'home' }">Home</router-link>

<!-- 命名的路由 -->
<router-link :to="{ name: 'user', params: { userId: 123 }}">User</router-link>

<!-- 带查询参数，下面的结果为 /register?plan=private -->
<router-link :to="{ path: 'register', query: { plan: 'private' }}">Register</router-link>
```

#### replace

设置`replace`属性的话，当点击时，会调用`router.replace()`而不是`router.push()`，于是导航后不会留下 history 记录

-  类型: `boolean` 
-  默认值: `false`

```html
<router-link :to="{ path: '/abc'}" replace></router-link>
```

#### append

设置`append`属性后，则在当前 (相对) 路径前添加基路径。例如，我们从`/a`导航到一个相对路径`b`，如果没有配置`append`，则路径为`/b`，如果配了，则为`/a/b`

-  类型: `boolean` 
-  默认值: `false`

```html
<router-link :to="{ path: 'relative/path'}" append></router-link>
```

#### tag

有时候想要 `<router-link>` 渲染成某种标签，例如 `<li>`。于是我们使用`tag`类指定何种标签，同样它还是会监听点击，触发导航

-  类型: `string` 
-  默认值: `"a"`

```html
<router-link to="/foo" tag="li">foo</router-link>

<!-- 渲染结果 -->
<li>foo</li>
```

#### active-class

设置链接激活时使用的 CSS 类名。默认值可以通过路由的构造选项`linkActiveClass`来全局配置。

-  类型: `string` 
-  默认值: `"router-link-active"`

#### exact

“是否激活”默认类名的依据是**包含匹配**

举个例子，如果当前的路径是 `/a` 开头的，那么 `<router-link to="/a">` 也会被设置 CSS 类名。
按照这个规则，每个路由都会激活 `<router-link to="/">`！想要链接使用“精确匹配模式”，则使用 `exact` 属性： 

-  类型: `boolean` 
-  默认值: `false`

```html
<!-- 这个链接只会在地址为 / 的时候被激活 -->
<router-link to="/" exact></router-link>
```

#### event

声明可以用来触发导航的事件。可以是一个字符串或是一个包含字符串的数组。

-  类型: `string | Array<string>` 
-  默认值: `'click'`

#### exact-active-class

配置当链接被精确匹配的时候应该激活的 class。注意默认值也是可以通过路由构造函数选项 `linkExactActiveClass` 进行全局配置的

-  类型: `string` 
-  默认值: `"router-link-exact-active"`

#### aria-current-value

当链接根据精确匹配规则激活时配置的 `aria-current` 的值。这个值应该是 ARIA 规范中[允许的 aria-current 的值](https://www.w3.org/TR/wai-aria-1.2/#aria-current)。在绝大多数场景下，默认值 `page` 应该是最合适的

-  类型: `'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false'` 
-  默认值: `"page"`

## router-view

`<router-view>` 组件是一个 functional 组件，渲染路径匹配到的视图组件。`<router-view>` 渲染的组件还可以内嵌自己的 `<router-view>`，根据嵌套路径，渲染嵌套组件

其他属性 (非 router-view 使用的属性) 都直接传给渲染的组件，很多时候，每个路由的数据都是包含在路由参数中。

因为它也是个组件，所以可以配合`<transition>`和`<keep-alive>`使用。如果两个结合一起用，要确保在内层使用`<keep-alive>`

```html
<transition>
  <keep-alive>
    <router-view></router-view>
  </keep-alive>
</transition>
```

### Props

#### name

-  类型: `string` 
-  默认值: `"default"`
  如果 `<router-view>`设置了名称，则会渲染对应的路由配置中 `components` 下的相应组件。查看 命名视图 中的例子

## 路由对象

一个**路由对象 (route object)** 表示当前激活的路由的状态信息，包含了当前 URL 解析得到的信息，还有 URL 匹配到的**路由记录 (route records)**。

路由对象是不可变 (immutable) 的，每次成功的导航后都会产生一个新的对象。

路由对象出现在多个地方:

-  在组件内，即 `this.$route` 
-  在 `$route` 观察者回调内 
-  `router.match(location)` 的返回值 
-  导航守卫的参数

```javascript
router.beforeEach((to, from, next) => {
  // `to` 和 `from` 都是路由对象
})
```

-  `scrollBehavior` 方法的参数: 

```javascript
const router = new VueRouter({
  scrollBehavior(to, from, savedPosition) {
    // `to` 和 `from` 都是路由对象
  }
})
```

### 路由对象属性

-  **$route.path** 

-  类型: `string`
  字符串，对应当前路由的路径，总是解析为绝对路径，如 `"/foo/bar"`

-  **$route.params** 

-  类型: `Object`
  一个 key/value 对象，包含了动态片段和全匹配片段，如果没有路由参数，就是一个空对象

-  **$route.query** 

-  类型: `Object`
  一个 key/value 对象，表示 URL 查询参数。例如，对于路径 `/foo?user=1`，则有 `$route.query.user == 1`，如果没有查询参数，则是个空对象

-  **$route.hash** 

-  类型: `string`
  当前路由的 hash 值 (带 `#`) ，如果没有 hash 值，则为空字符串

-  **$route.fullPath** 

-  类型: `string`
  完成解析后的 URL，包含查询参数和 hash 的完整路径

-  **$route.matched** 

- 类型: `Array<RouteRecord>`

一个数组，包含当前路由的所有嵌套路径片段的**路由记录** 。路由记录就是 `routes` 配置数组中的对象副本 (还有在 `children` 数组)。 

```javascript
const router = new VueRouter({
  routes: [
    // 下面的对象就是路由记录
    {
      path: '/foo',
      component: Foo,
      children: [
        // 这也是个路由记录
        { path: 'bar', component: Bar }
      ]
    }
  ]
})
```

当 URL 为 `/foo/bar`，`$route.matched` 将会是一个包含从上到下的所有对象 (副本)

-  **$route.name**
  当前路由的名称，如果有的话。(查看[命名路由](https://router.vuejs.org/zh/guide/essentials/named-routes.html)) 
-  **$route.redirectedFrom**
  如果存在重定向，即为重定向来源的路由的名字。(参阅[重定向和别名](https://router.vuejs.org/zh/guide/essentials/redirect-and-alias.html)) 

### 组件注入

#### 注入的属性

通过在 Vue 根实例的`router`配置传入 router 实例，下面这些属性成员会被注入到每个子组件

-  **this.$router** 

- router 实例

-  **this.$route**

- 当前激活的路由信息对象（详见本页下方「路由对象」一节）。这个属性是只读的，里面的属性是 immutable (不可变) 的，不过你可以 watch (监测变化) 它

#### 增加的组件配置选项

-  **beforeRouteEnter** 
-  **beforeRouteUpdate** 
-  **beforeRouteLeave**
  查看[组件内的守卫](04-进阶)。 