---
title: next.config.js 配置详解
description: Next.js 配置文件 next.config.ts 的完整配置项参考，涵盖路由、渲染、构建、部署等全部配置选项
keywords: [next.config, 配置, basePath, assetPrefix, images, webpack, 环境变量]
category: Next.js
tags: [配置, next.config.ts, 构建优化, 部署配置]
---

# next.config.js 配置详解

Next.js 通过根目录的 `next.config.ts` 进行项目配置：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
}
 
export default nextConfig
```

无论扩展名是 `.js` 还是 `.ts`，`next.config` 都是一个常规的 Node.js 模块，而不是一个 JSON 文件。它会在 Next.js server 和构建阶段被用到，并且不包含在浏览器构建中（代码不会打包到客户端）。

如果你需要 ECMAScript 模块，你可以使用 `next.config.mjs`：

```javascript
/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  /* config options here */
}
 
export default nextConfig
```

你也可以使用一个函数：

```javascript
export default (phase, { defaultConfig }) => {
  /**
   * @type {import('next').NextConfig}
   */
  const nextConfig = {
    /* config options here */
  }
  return nextConfig
}

export default nextConfig
```

从 Next.js 12.1.0 起，你还可以使用一个异步函数：

```javascript
export default async (phase, { defaultConfig }) => {
  /**
   * @type {import('next').NextConfig}
   */
  const nextConfig = {
    /* config options here */
  }
  return nextConfig
}

export default nextConfig
```

其中 `phase` 表示配置加载的当前上下文。通过[查看源码](https://github.com/vercel/next.js/blob/5e6b008b561caf2710ab7be63320a3d549474a5b/packages/next/shared/lib/constants.ts#L19-L23)，可以知道 `phase` 的值一共有 5 个：

```javascript
export const PHASE_EXPORT = 'phase-export'
export const PHASE_PRODUCTION_BUILD = 'phase-production-build'
export const PHASE_PRODUCTION_SERVER = 'phase-production-server'
export const PHASE_DEVELOPMENT_SERVER = 'phase-development-server'
export const PHASE_TEST = 'phase-test'
```

可以通过 `next/constants` 导入，根据不同的阶段进行自定义配置：

```javascript
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')
 
export default (phase, { defaultConfig }) => {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return {
      /* 这里放 development 配置选项 */
    }
  }
 
  return {
    /* 除了 development 阶段的其他阶段的配置 */
  }
}
```

在这个例子中，注释行的地方就是你可以放配置的地方，实际上，Next.js 定义的配置非常多，可以查看[源码配置文件](https://github.com/vercel/next.js/blob/canary/packages/next/src/server/config-shared.ts)。

然而，这些配置又都不是必须的，也没有必要清楚的了解每个配置的作用，大致看一下，有个印象即可，需要用到的时候再去细查。

因为要讲解的配置有 34 个，内容繁琐细节且庞大，所以 `next.config.ts` 的配置部分拆分为上下两篇。上篇讲解请求相关的 headers、redirects、rewrites，这是 Next.js 中常用的配置，且内容有很多相似之处，放在一起方便触类旁通。下篇讲解剩余的 31 个配置，每个配置内容都不多，了解即可。

现在让我们开始学习吧！

## 1. headers

### 1.1. 介绍

Headers 用于设置自定义 HTTP 标头，使用 `next.config.ts` 的 `headers`字段：

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/about',
        headers: [
          {
            key: 'x-custom-header',
            value: 'my custom header value',
          },
          {
            key: 'x-another-custom-header',
            value: 'my other custom header value',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

此时访问 `/about`，可以看到响应中带上了自定义的 `x-custom-header` 和 `x-another-custom-header` 标头。

`headers`是一个异步函数，该函数返回一个包含 `source` 和 `headers` 属性的对象数组，其中：

*   `source` 表示传入的请求路径
*   `headers` 是一个包含 key 和 value 属性的响应标头对象数组

除了这两个值外，还可以设置：

*   `basePath`：`false` 或者 `undefined`。当值为 `false` ，匹配时不会包含 `basePath`，只能用于外部重写
*   `locale`：`false` 或者 `undefined`，匹配时是否应该包含 locale
*   `has`：一个有 `type`、`key`、`value` 属性的对象数组
*   `missing`：一个有 `type`、`key`、`value` 属性的对象数组

headers 会在文件系统（包括页面和 `/public` 文件）之前被触发。

这些字段我们来一一举例介绍。

### 1.2. source

source 表示传入的请求路径，除了可以匹配具体的值，还支持三种匹配模式：

#### 路径匹配

普通的路径匹配，举个例子，`/blog/:slug` 会匹配 `/blog/hello-world`（无嵌套路径，也就是说 `/blog/hello-world/about`不会匹配）

```javascript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/blog/:slug',
        headers: [
          {
            key: 'x-slug',
            value: ':slug', // 匹配参数可以在 value 中使用
          },
          {
            key: 'x-slug-:slug', // 匹配参数可以在 key 中使用
            value: 'my other custom header value',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

访问 `/blog/hello-world`，可以看到响应带上了以匹配参数填充后的自定义标头。

但访问 `/blog/hello-world/about`就不会有自定义标头。

#### 通配符路径匹配

在参数后使用 `*` 实现通配符路径匹配，举个例子：`/blog/:slug*` 会匹配 `/blog/a/b/c/d/hello-world`：

```javascript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/blog/:slug*',
        headers: [
          {
            key: 'x-slug',
            value: ':slug*',
          },
          {
            key: 'x-slug-:slug*',
            value: 'my other custom header value',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

访问 `/blog/hello-world/about`，可以看到通配符匹配生效：

访问 `/blog/hello-world` 同样可以匹配到。

#### 正则表达式路径匹配

在参数后用括号将正则表达式括住实现正则表达式匹配，举个例子：`blog/:slug(\\d{1,})` 匹配 `/blog/123` 而不匹配 `/blog/abc`

```javascript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/blog/:post(\\d{1,})',
        headers: [
          {
            key: 'x-post',
            value: ':post',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

访问 `/blog/123`，可以看到正则匹配生效。

注意：这 8 个字符  `(`、`)`、 `{`、 `}`、 `:`、 `*`、 `+`、 `?` 都会用于正则表达式匹配，所以需要用到这些字符本身的时候，使用 `\\`转义

```javascript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        // 匹配 `/english(default)/something`
        source: '/english\\(default\\)/:slug',
        headers: [
          {
            key: 'x-header',
            value: 'value',
          },
        ],
      },
    ]
  },
}
```

### 1.3. headers

headers 无须多说，我们聊聊 headers 的覆盖行为。

如果两个 headers 匹配相同的路径以及设置了相同的 header key，最后一个 header 的 key 会覆盖前一个。举个例子：

```javascript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'x-hello',
            value: 'there',
          },
        ],
      },
      {
        source: '/hello',
        headers: [
          {
            key: 'x-hello',
            value: 'world',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

在这个例子中，当访问 `/hello` 时，既匹配 `/:path*`，又匹配 `/hello`，而两个 source 对应设置的 `x-hello` 的 key 值不同，因为`/hello` 是最后一个 header，所以最终的值是 `world`。

那如果匹配了相同的路径，但设置的  header key 不冲突呢？那就都会添加，举个例子：

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'hello',
            value: 'hello',
          },
          {
            key: 'hello2',
            value: 'hello2',
          }
        ],
      },
      {
        source: '/hello',
        headers: [
          {
            key: 'hello',
            value: 'world',
          },
          {
            key: 'hello3',
            value: 'hello3',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

最终的结果为：请求同时带上了 `hello`（值为 `world`，后者覆盖前者）、`hello2` 和 `hello3` 三个标头。

### 1.4. basePath

`basePath`的值为 `false` 或者 `undefined`。当值为 `false` ，匹配时不会包含 `basePath`，举个例子：

```javascript
// next.config.ts
const nextConfig = {
  basePath: '/docs',
 
  async headers() {
    return [
      {
        source: '/with-basePath', // 匹配 /docs/with-basePath
        headers: [
          {
            key: 'x-hello',
            value: 'world',
          },
        ],
      },
      {
        source: '/without-basePath', // 匹配 /without-basePath
        headers: [
          {
            key: 'x-hello',
            value: 'world',
          },
        ],
        basePath: false, // 因为设置了 false
      },
    ]
  },
}

export default nextConfig
```

在这个例子中，设置了 `basePath` 为 `/docs`，正常 headers 中的 source 会匹配 basePath + source 构成的链接，除非你设置了 `basePath` 为 `false`。

### 1.5. locale

`locale` 的值为 `false` 或者 `undefined`，决定匹配时是否应该包含 locale，其实效果跟 basePath 类似。

考虑到部分同学对 `locale` 不太熟悉，我们先简单的讲下 `locale`配置项，locale 的作用就是国际化（i18n），`next.config.ts` 针对 Pages Router 提供了 i18n 配置项，注意是在 Pages Router 下，在 App Router 下 Next.js 已经不再提供直接的支持，具体内容查看本系列国际化章节。

比如我们在 `pages` 目录下新建一个 `article.js` 文件：

```javascript
// pages/article.js
export default function Home() {
  return  <h1>Hello Article!</h1>
}
```

然后 `next.config.ts` 修改配置项：

```javascript
// next.config.ts
const nextConfig = {
  i18n: {
    locales: ['en', 'fr', 'de', 'zh'],
    defaultLocale: 'zh',
  }
}

export default nextConfig
```

此时，访问 `/en/article`、`/fr/article`、`/de/article` 都会重写为 `/article`，注意是重写，就是路由地址不变，但内容是 `/article`的内容。访问 `/zh/article` 会重定向到 `/article`。

而如果你在 `app/article` 目录下新建一个 `page.js` 文件，文件内容同上。

此时，访问 `/en/article`、`/fr/article`、`/de/article` 都会 404 错误。访问 `/zh/article` 会重写为 `/article`。说明在 App Router 下只有 `i18n.defaultLocale` 是生效的。

好了，基本介绍完毕，主要是为了让大家了解配置项中的 i18n 的作用。我们再看 headers 中的 locales 设置，举个例子：

```javascript
const nextConfig = {
  i18n: {
    locales: ['en', 'fr', 'de'],
    defaultLocale: 'en',
  },
 
  async headers() {
    return [
      {
        // 自动处理所有的 locales
        // 也就是 `/en/with-locale`、`/fr/with-locale`、`/de/with-locale`、`/with-locale` 都会匹配
        source: '/with-locale', 
        headers: [
          {
            key: 'x-hello',
            value: 'world1',
          },
        ],
      },
      {
        // 因为 locale 设置为 false，所以不会自动处理 locales
        // 也就是只匹配 `/nl/with-locale-manual`
        source: '/nl/with-locale-manual',
        locale: false,
        headers: [
          {
            key: 'x-hello',
            value: 'world2',
          },
        ],
      },
      {
        // 匹配 '/' 因为 `en` 是 defaultLocale
        // 也就是只匹配 `/`、`/en`
        source: '/en',
        locale: false,
        headers: [
          {
            key: 'x-hello',
            value: 'world3',
          },
        ],
      },
      {
        // 会转换为 /(en|fr|de)/(.*) 所以不会匹配顶层
        // 也就是 `/` 和 `/fr` 都不会匹配到
        // 如果要匹配到这两个，可以用 `/:path*`
        source: '/(.*)',
        headers: [
          {
            key: 'x-hello',
            value: 'world4',
          },
        ],
      },
    ]
  },
}
```

注意，虽然 i18n.locales 配置在 App Router 下不生效，但这也只是导致页面出现 404 错误而已，并不会影响处理标头，即便页面 404，你可以正常的查看标头。

### 1.6. has 和 missing

`has` 和 `missing` 是用来处理请求中的 header、cookie 和请求参数是否匹配某些字段，或者不匹配某些字段的时候，才应用 header。

举个例子，比如请求 `/article?id=1&author=yayu`，`has` 可以要求请求中必须有 id 参数，或者 id 参数等于 xxx 的时候才返回某个标头。`missing` 可以要求请求中必须没有 id 参数，或者 id 参数不等于 xxx 的时候才返回某个标头。

`has` 和 `missing` 对象有下面这些字段：

*   `type`: `String`类型，值为 `header`、`cookie`、`host`、`query` 之一
*   `key`: `String`类型，所选类型（也就是上面的四种值）中要匹配的 key
*   `value`： `String` 或者 `undefined`，要检查的值。如果没有提供（即 `undefined`），任何值都会匹配。支持使用一个类似正则的字符串捕获值的特殊部分。比如 `first-(?<paramName>.*)`用于匹配 `first-second`，然后就可以用 `:paramName`获取 `second` 这个值

听起来有些复杂，看个例子其实就懂了：

```javascript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      // 如果 header 中 `x-add-header` 字段存在
      // 那就返回 `x-another-header` 标头
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-add-header',
          },
        ],
        headers: [
          {
            key: 'x-another-header',
            value: 'hello',
          },
        ],
      },
      // 如果 header 中 `x-no-header` 字段不存在
      // 就返回 `x-another-header` 标头
      {
        source: '/:path*',
        missing: [
          {
            type: 'header',
            key: 'x-no-header',
          },
        ],
        headers: [
          {
            key: 'x-another-header',
            value: 'hello',
          },
        ],
      },
      // 如果 source、query、cookie 都匹配
      // 就返回 `x-authorized` 标头
      {
        source: '/specific/:path*',
        has: [
          {
            type: 'query',
            key: 'page',
            value: 'home',
          },
          {
            type: 'cookie',
            key: 'authorized',
            value: 'true',
          },
        ],
        headers: [
          {
            key: 'x-authorized',
            value: 'hello',
          },
        ],
      },
      //如果 header 中 `x-authorized` 存在且等于 yes 或 true
      // 就返回 `x-another-header` 标头
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-authorized',
            value: '(?<authorized>yes|true)',
          },
        ],
        headers: [
          {
            key: 'x-another-header',
            value: ':authorized',
          },
        ],
      },
      // 如果 host 是 `example.com`,
      // 应用 header
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'example.com',
          },
        ],
        headers: [
          {
            key: 'x-another-header',
            value: 'hello',
          },
        ],
      },
    ]
  },
}
```

注意，`has` 和 `missing` 判断的是请求中的值，`type` 的四种类型为 header、cookie、host、query：

cookie 指的是其中的 Cookie 标头，Next.js 已经自动做了解析，所以可以直接判断 Cookie 中的字段值：

host 就是主机名 + 端口，query 表示参数。以 `'http://user:pass@host.com:8080/p/a/t/h?query=string#hash'`为例的话，**host** 的值为 `host.com:8080`。**query** 为 `query=string`。

### 1.7. Cache-Control

你不能在 `next.config.ts` 中为页面或静态资源设置 `Cache-Control`标头，因为该标头会在生产中被覆盖，以确保有效缓存响应和静态资源。

### 1.8. 选项

#### X-DNS-Prefetch-Control

[X-DNS-Prefetch-Control](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control)  头控制着浏览器的 DNS 预读取功能。DNS 预读取是一项使浏览器主动去执行域名解析的功能，其范围包括文档的所有链接，无论是图片的，CSS 的，还是 JavaScript 等其他用户能够点击的 URL。

因为预读取会在后台执行，所以 DNS 很可能在链接对应的东西出现之前就已经解析完毕。这能够减少用户点击链接时的延迟。

```json
{
  key: 'X-DNS-Prefetch-Control',
  value: 'on'
}
```

#### Strict-Transport-Security

[Strict-Transport-Security](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Strict-Transport-Security)（通常简称为 HSTS）响应标头用来通知浏览器应该只通过 HTTPS 访问该站点，并且以后使用 HTTP 访问该站点的所有尝试都应自动重定向到 HTTPS。

使用下面的配置，所有当前和未来的子域都将使用 `max-age` 为 2 年的 HTTPS：

```javascript
{
  key: 'Strict-Transport-Security',
  value: 'max-age=63072000; includeSubDomains; preload'
}
```

#### X-Frame-Options

[X-Frame-Options](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/X-Frame-Options) HTTP 响应头是用来给浏览器指示允许一个页面可否在 `<frame>`、`<iframe>`、`<embed>` 或者 `<object>` 中展现的标记。站点可以通过确保网站没有被嵌入到别人的站点里面，从而避免点击劫持攻击。

此标头已经被 [frame-ancestors](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors) 替代，它在现代浏览器中有更好的支持。

#### Permissions-Policy

[Permissions-Policy](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Permissions-Policy)  响应标头提供了一种可以在本页面或包含的 iframe 上启用或禁止浏览器特性的机制，之前叫做 `Feature-Policy`。

```json
{
  key: 'Permissions-Policy',
  value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
}
```

#### X-Content-Type-Options

如果 `Content-Type` 标头没有被显式设置，[X-Content-Type-Options](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/X-Content-Type-Options) 会阻止浏览器尝试猜测内容类型。这可以防止允许用户上传和共享文件的网站受到 XSS 攻击。

这个标头只有一个有效值是 `nosniff`。

```json
{
  key: 'X-Content-Type-Options',
  value: 'nosniff'
}
```

#### Referrer-Policy

[Referrer-Policy](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Referrer-Policy) 控制当从当前网页导航到另一个网页时携带的信息内容：

```json
{
  key: 'Referrer-Policy',
  value: 'origin-when-cross-origin'
}
```

## 2. redirects

### 2.1. 介绍

重定向，顾名思义，将请求路径重定向到其他目标路径。配置重定向，使用 `next.config.ts` 的 `redirects`，示例如下：

```javascript
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/about',
        destination: '/',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
```

`redirects` 是一个异步函数，该函数返回一个包含 `source`、`destination` 和 `permanent` 属性的对象数组，其中：

*   `source` 表示传入的请求路径
*   `destination` 表示你重定向的目标路径
*   `permanent` 值为 true 或者  false。如果为 true，使用 308 状态码，表示客户端或搜索引擎永久缓存重定向。如果是 false，使用 307 状态码表示临时未缓存。

为什么 Next.js 使用 307 和 308 呢？传统都是使用 302 表示临时重定向，301 表示永久重定向，但是很多浏览器会将重定向的请求方法修改为 GET，而不管原本的方法是什么。举个例子，如果浏览器发送了一个 POST 请求，`/v1/users` ，然后返回了 302 状态码，新地址是 `/v2/users`，则后续的请求会是 GET `/V2/users` 而不是 POST `/v2/users`，Next.js 用 307 临时重定向和 308 永久重定向状态码就是为了显式保留之前使用的请求方法。

除了这三个值外，还可以设置：

*   `basePath`：`false` 或者 `undefined`。当值为 `false` ，匹配时不会包含 `basePath`，只能用于外部重定向
*   `locale`：`false` 或者 `undefined`，匹配时是否应该包含 locale
*   `has`：一个有 `type`、`key`、`value` 属性的对象数组
*   `missing`：一个有 `type`、`key`、`value` 属性的对象数组

重定向会在文件系统（包括页面和 `/public` 文件）之前被触发。

重定向不会应用于客户端路由（`Link`、`router.push`），除非使用了中间件，且有匹配的路径。

当应用重定向的时候，请求路径的参数也会传递给重定向目标路径。举个例子：

```javascript
{
  source: '/old-blog/:path*',
  destination: '/blog/:path*',
  permanent: false
}
```

当请求`/old-blog/post-1?hello=world`时，客户端会重定向到 `/blog/post-1?hello=world`。

### 2.2. source

#### 路径匹配

普通的路径匹配，举个例子，比如 `/old-blog/:slug`会匹配 `/old-blog/hello-world`（无嵌套路径，也就是说 `/old-blog/hello-world/about`不会匹配）

```javascript
// next.config.ts
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/old-blog/:slug',
        destination: '/news/:slug',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
```

#### 通配符路径匹配

在参数后使用 `*` 实现通配符路径匹配，举个例子：`/blog/:slug*` 会匹配 `/blog/a/b/c/d/hello-world`：

```javascript
// next.config.ts
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/blog/:slug*',
        destination: '/news/:slug*',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
```

#### 正则表达式路径匹配

在参数后用括号将正则表达式括住实现正则表达式匹配，举个例子：`/post/:slug(\\d{1,})` 匹配 `/post/123` 而不匹配 `/post/abc`

```javascript
// next.config.ts
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/post/:slug(\\d{1,})',
        destination: '/news/:slug',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
```

注意：这 8 个字符  `(`、`)`、 `{`、 `}`、 `:`、 `*`、 `+`、 `?` 都会用于正则表达式匹配，所以需要用到这些字符本身的时候，使用 `\\`转义

```javascript
// next.config.ts
const nextConfig = {
  async redirects() {
    return [
      {
        // 匹配 `/english(default)/something`
        source: '/english\\(default\\)/:slug',
        destination: '/en-us/:slug',
        permanent: false,
      },
    ]
  },
}
```

### 2.3. basePath

当使用 `basePath` 的时候，每一个 `source` 和 `destination` 都会自动添加 `basePath` 作为前缀，除非你为重定向设置 `basePath: false`：

```javascript
// next.config.ts
const nextConfig = {
  basePath: '/docs',
 
  async redirects() {
    return [
      {
        source: '/with-basePath', // 自动变成 /docs/with-basePath
        destination: '/another', // 自动变成 /docs/another
        permanent: false,
      },
      {
        // does not add /docs since basePath: false is set
        source: '/without-basePath',
        destination: 'https://example.com',
        basePath: false,
        permanent: false,
      },
    ]
  },
}

export default nextConfig
```

### 2.4. locale

当使用 `i18n`的时候，每一个 `source` 和 `destination` 都会自动根据 `locales`添加前缀进行处理，除非你为重定向设置 `locale: false`。如果设置 `locale: false`，你必须使用一个 `locale` 作为 `source` 和 `destination` 的前缀才能够正确匹配，让我们看个例子：

```javascript
// next.config.ts
const nextConfig = {
  i18n: {
    locales: ['en', 'fr', 'de'],
    defaultLocale: 'en',
  },
 
  async redirects() {
    return [
      {
        // /with-locale -> /another
        // /en/with-locale -> /en/another
        // /fr/with-locale -> /fr/another
        // /de/with-locale -> /de/another
        source: '/with-locale',
        destination: '/another',
        permanent: false,
      },
      {
        // 因为 locale 设置为 false，所以不会自动处理
        // /nl/with-locale-manual -> /nl/another
        source: '/nl/with-locale-manual',
        destination: '/nl/another',
        locale: false,
        permanent: false,
      },
      {
        // 因为 `en` 是 defaultLocale，所以匹配 '/'
        // /en -> /en/another
        // / -> /en/another
        source: '/en',
        destination: '/en/another',
        locale: false,
        permanent: false,
      },
      // 尽管 locale 设置为 false，但匹配所有 locale
      // /page -> /en/newpage
      // /en/page -> /en/newpage
      // /fr/page -> /fr/newpage
      // /de/page -> /de/newpage
      {
        source: '/:locale/page',
        destination: '/en/newpage',
        permanent: false,
        locale: false,
      },
      {
        // 转换为 /(en|fr|de)/(.*) 所以不会匹配 `/`
        // /page -> /another2
        // /fr/page -> /fr/another2
        // 匹配 `/` 或 `/fr` 使用 /:path*
        source: '/(.*)',
        destination: '/another2',
        permanent: false,
      },
    ]
  },
}
```

### 2.5. has 和 missing

`has` 和 `missing` 是用来处理请求中的 header、cookie 和请求参数是否匹配某些字段，或者不匹配某些字段的时候，才发生重定向。

举个例子，比如请求 `/article?id=1&author=yayu`，`has` 可以要求请求中必须有 id 参数，或者 id 参数等于 xxx 的时候才重定向。`missing` 可以要求请求中必须没有 id 参数，或者 id 参数不等于 xxx 的时候才重定向。

`has` 和 `missing` 对象有下面这些字段：

*   `type`: `String`类型，值为 `header`、`cookie`、`host`、`query` 之一
*   `key`: `String`类型，所选类型（也就是上面的四种值）中要匹配的 key
*   `value`： `String` 或者 `undefined`，要检查的值。如果没有提供（即 `undefined`），任何值都会匹配。支持使用一个类似正则的字符串捕获值的特殊部分。比如 `first-(?<paramName>.*)`用于匹配 `first-second`，然后就可以用 `:paramName`获取 `second` 这个值

其实跟 headers 是一样的，只不过一个是返回标头，一个是发生重定向。

```javascript
// next.config.ts
const nextConfig = {
  async redirects() {
    return [
      // 如果 header `x-redirect-me` 存在,
      // 才应用重定向
      {
        source: '/:path((?!another-page$).*)',
        has: [
          {
            type: 'header',
            key: 'x-redirect-me',
          },
        ],
        permanent: false,
        destination: '/another-page',
      },
      // 如果 `x-dont-redirect` 存在,
      // 不会应用重定向
      {
        source: '/:path((?!another-page$).*)',
        missing: [
          {
            type: 'header',
            key: 'x-do-not-redirect',
          },
        ],
        permanent: false,
        destination: '/another-page',
      },
      // 如果 source, query, 和 cookie 匹配,
      // 会应用重定向
      {
        source: '/specific/:path*',
        has: [
          {
            type: 'query',
            key: 'page',
            value: 'home',
          },
          {
            type: 'cookie',
            key: 'authorized',
            value: 'true',
          },
        ],
        permanent: false,
        destination: '/another/:path*',
      },
      // 如果 header `x-authorized` 存在，并且是 yes 或者 true,
      // 会应用重定向
      {
        source: '/',
        has: [
          {
            type: 'header',
            key: 'x-authorized',
            value: '(?<authorized>yes|true)',
          },
        ],
        permanent: false,
        destination: '/home?authorized=:authorized',
      },
      // 如果 host 是 `example.com`,
      // 会应用重定向
      {
        source: '/:path((?!another-page$).*)',
        has: [
          {
            type: 'host',
            value: 'example.com',
          },
        ],
        permanent: false,
        destination: '/another-page',
      },
    ]
  },
}
```

## 3. rewrites

### 3.1. 介绍

重写允许你将传入的请求路径映射到其他目标路径。它与重定向的不同之处在于，重写相当于扮演了 URL 代理的角色，会屏蔽目标路径，地址还是这个地址，但路由逻辑发生了变化。而重定向则是导航至新的页面，浏览器中的 URL 也会发生更改。配置重写，使用 `next.config.ts` 的 `rewrites`，示例如下：

```javascript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/about',
        destination: '/',
      },
    ]
  },
}

export default nextConfig
```

重写会应用于客户端路由，在这个例子中，如果使用`<Link href="/about">` 会应用重写。

`rewrites` 是一个异步函数，该函数可以返回一个包含 `source`、`destination` 属性的对象数组，其中：

*   `source` 表示传入的请求路径
*   `destination` 表示你重写的目标路径
*   `basePath`：`false` 或者 `undefined`。当值为 `false` ，匹配时不会包含 `basePath`，只能用于外部重写
*   `locale`：`false` 或者 `undefined`，匹配时是否应该包含 locale
*   `has`：一个有 `type`、`key`、`value` 属性的对象数组
*   `missing`：一个有 `type`、`key`、`value` 属性的对象数组

如果返回的是这种数组，重写会在检查文件系统（页面和 /public 文件）之后和动态路由之前应用。

也可以返回一个具有特定属性的对象，这是为了实现更精细的控制，示例代码如下：

```javascript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        // 在 headers/redirects 之后
        // 在 _next/public files 文件之前触发
        {
          source: '/some-page',
          destination: '/somewhere-else',
          has: [{ type: 'query', key: 'overrideMe' }],
        },
      ],
      afterFiles: [
        // 在 pages/public 之后，在动态路由之前触发
        {
          source: '/non-existent',
          destination: '/somewhere-else',
        },
      ],
      fallback: [
        // 在 pages/public files 和动态路由之后触发
        {
          source: '/:path*',
          destination: `https://my-old-site.com/:path*`,
        },
      ],
    }
  },
}
```

这个时候就要说到 Next.js 的路由的检查顺序是：

1.  headers
2.  redirects
3.  beforeFiles 重写
4.  `public` 目录下的静态文件、`_next/static` 文件、非动态的页面
5.  afterFiles 重写，按顺序进行检查匹配
6.  动态路由
7.  fallback 重写，会在渲染 404 页面之前、动态路由和所有静态资源检查之后被应用

### 3.2. 重写参数

如果 `destination`没有使用参数（例子中的`:path*`），那么 `source` 的中的参数会以查询字符串的形式（query）默认传递给 `destination`：

```javascript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/old-about/:path*',
        destination: '/about',
      },
    ]
  },
}

export default nextConfig
```

假设 `app/about/page.js`的代码为：

```javascript
// app/about/page.js
export default function Page(props) {
  console.dir(props)
  return  <h1>Hello About!</h1>
}
```

访问 `/old-about/article?id=1`，可以看到匹配到的参数和查询参数都会出现在 searchParams 中。

`source` 中的参数 article 可以在 searchParams 中查到。

如果 `destination`使用了参数，则不会自动传递任何参数：

```javascript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/docs/:path*',
        destination: '/:path*',
      },
    ]
  },
}

export default nextConfig
```

访问 `/docs/about?id=1`，可以看到查询参数 `id` 并不会出现在 searchParams 中。

如果 `destination`使用了参数，你依然可以手动传递参数：

```javascript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/:first/:second',
        destination: '/:first?second=:second'
      },
    ]
  },
}

export default nextConfig
```

在这个例子中，因为 `destination` 使用了 `:first` 参数，所以 `:second` 参数不会自动被添加到 query 中，但我们可以通过例子中的方式手动添加，使得能够在 query 中获取。

访问 `/about/article?id=1`，可以看到手动添加的 `second` 参数出现在了 searchParams 中。

### 3.3. source

#### 路径匹配

普通的路径匹配，举个例子，比如 `/blog/:slug`会匹配 `/blog/hello-world`（无嵌套路径，也就是说 `/blog/hello-world/about`不会匹配）

```javascript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/blog/:slug',
        destination: '/news/:slug',
      },
    ]
  },
}

export default nextConfig
```

#### 通配符路径匹配

在参数后使用 `*` 实现通配符路径匹配，举个例子：`/blog/:slug*` 会匹配 `/blog/a/b/c/d/hello-world`：

```javascript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/blog/:slug*',
        destination: '/news/:slug*', // Matched parameters can be used in the destination
      },
    ]
  },
}

export default nextConfig
```

#### 正则表达式路径匹配

在参数后用括号将正则表达式括住实现正则表达式匹配，举个例子：`/post/:slug(\\d{1,})` 匹配 `/post/123` 而不匹配 `/post/abc`

```javascript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/old-blog/:post(\\d{1,})',
        destination: '/blog/:post',
      },
    ]
  },
}

export default nextConfig
```

注意：这 8 个字符  `(`、`)`、 `{`、 `}`、 `:`、 `*`、 `+`、 `?` 都会用于正则表达式匹配，所以需要用到这些字符本身的时候，使用 `\\`转义

```javascript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        // this will match `/english(default)/something` being requested
        source: '/english\\(default\\)/:slug',
        destination: '/en-us/:slug',
      },
    ]
  },
}
```

### 3.4. basePath

当使用 `basePath` 的时候，每一个 `source` 和 `destination` 都会自动添加 `basePath` 作为前缀，除非你为重写设置 `basePath: false`：

```javascript
// next.config.ts
const nextConfig = {
  basePath: '/docs',
 
  async rewrites() {
    return [
      {
        source: '/with-basePath', // 自动变成 /docs/with-basePath
        destination: '/another', // 自动变成 /docs/another
      },
      {
        // 不会添加 /docs 到 /without-basePath 因为 basePath 设置为 false 
        source: '/without-basePath',
        destination: 'https://example.com',
        basePath: false,
      },
    ]
  },
}

export default nextConfig
```

### 3.5. locale

当使用 `i18n`的时候，每一个 `source` 和 `destination` 都会自动根据 `locales`添加前缀进行处理，除非你为重写设置 `locale: false`。如果设置 `locale: false`，你必须使用一个 `locale` 作为 `source` 和 `destination` 的前缀才能够正确匹配，让我们看个例子：

```javascript
// next.config.ts
const nextConfig = {
  i18n: {
    locales: ['en', 'fr', 'de'],
    defaultLocale: 'en',
  },
 
  async rewrites() {
    return [
      {
        // /with-locale -> /another
        // /en/with-locale -> /en/another
        // /fr/with-locale -> /fr/another
        // /de/with-locale -> /de/another
        source: '/with-locale',
        destination: '/another',
      },
      {
        // 因为 locale 设置为 false，所以不会自动处理
        // /nl/with-locale-manual -> /nl/another
        source: '/nl/with-locale-manual',
        destination: '/nl/another',
        locale: false,
      },
      {
        // 因为 `en` 是 defaultLocale，所以匹配 '/'
        // /en -> /en/another
        // / -> /en/another
        source: '/en',
        destination: '/en/another',
        locale: false
      },
      // 尽管 locale 设置为 false，但匹配所有 locale
      {
        source: '/:locale/api-alias/:path*',
        destination: '/api/:path*',
        locale: false,
      },
      {
        // 转换为 /(en|fr|de)/(.*) 所以不会匹配 `/`
        // /page -> /another
        // /fr/page -> /fr/another
        // 匹配 `/` 或 `/fr` 使用 /:path*
				source: '/(.*)',
        destination: '/another',
      },
    ]
  },
}
```

### 3.6. has 和 missing

`has` 和 `missing` 是用来处理请求中的 header、cookie 和请求参数是否匹配某些字段，或者不匹配某些字段的时候，才发生重写。

举个例子，比如请求 `/article?id=1&author=yayu`，`has` 可以要求请求中必须有 id 参数，或者 id 参数等于 xxx 的时候才重写。`missing` 可以要求请求中必须没有 id 参数，或者 id 参数不等于 xxx 的时候才重写。

`has` 和 `missing` 对象有下面这些字段：

*   `type`: `String`类型，值为 `header`、`cookie`、`host`、`query` 之一
*   `key`: `String`类型，所选类型（也就是上面的四种值）中要匹配的 key
*   `value`： `String` 或者 `undefined`，要检查的值。如果没有提供（即 `undefined`），任何值都会匹配。支持使用一个类似正则的字符串捕获值的特殊部分。比如 `first-(?<paramName>.*)`用于匹配 `first-second`，然后就可以用 `:paramName`获取 `second` 这个值

其实跟 redirects 是一样的，只不过一个是重定向，一个是重写。

```javascript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      // 如果 header `x-rewrite-me` 存在,
      // 会应用重写
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-rewrite-me',
          },
        ],
        destination: '/another-page',
      },
      // 如果 `x-rewrite-me` 不存在
      // 会应用重写
      {
        source: '/:path*',
        missing: [
          {
            type: 'header',
            key: 'x-rewrite-me',
          },
        ],
        destination: '/another-page',
      },
      // 如果 source, query, 和 cookie 匹配,
      // 会应用重写
      {
        source: '/specific/:path*',
        has: [
          {
            type: 'query',
            key: 'page',
            value: 'home',
          },
          {
            type: 'cookie',
            key: 'authorized',
            value: 'true',
          },
        ],
        destination: '/:path*/home',
      },
      // 如果 header `x-authorized` 存在且为 yes 或 true
      // 会应用重写
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-authorized',
            value: '(?<authorized>yes|true)',
          },
        ],
        destination: '/home?authorized=:authorized',
      },
      // 如果 host 是 `example.com`,
      // 会应用重写
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'example.com',
          },
        ],
        destination: '/another-page',
      },
    ]
  },
}
```

### 3.7. 重写到外部 URL

rewrites 可以重写到外部 url，这在增量采用 Next.js 的项目中特别有用，比如这个例子就是将应用中的 `/blog` 路由全部重写到外部网址：

```javascript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/blog',
        destination: 'https://example.com/blog',
      },
      {
        source: '/blog/:slug',
        destination: 'https://example.com/blog/:slug',
      },
    ]
  },
}

export default nextConfig
```

如果设置了 `trailingSlash:true`，你也需要在 `source` 中插入一个尾部斜杠。如果目标地址也需要尾部斜杠，也应该包含在 `destination` 参数中。

```javascript
// next.config.ts
const nextConfig = {
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: '/blog/',
        destination: 'https://example.com/blog/',
      },
      {
        source: '/blog/:path*/',
        destination: 'https://example.com/blog/:path*/',
      },
    ]
  },
}

export default nextConfig
```

### 3.8. 增量采用 Next.js

可以让 Next.js 在检查所有 Next.js 路由后，如果没有对应的路由，那就代理现有的网站。这样你将更多页面迁移成 Next.js 时，就无需重写配置：

```javascript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return {
      fallback: [
        {
          source: '/:path*',
          destination: `https://custom-routes-proxying-endpoint.vercel.app/:path*`,
        },
      ],
    }
  },
}
```

## 参考链接

1.  <https://nextjs.org/docs/app/api-reference/config/next-config-js>
2.  <https://nextjs.org/docs/app/api-reference/config/next-config-js/headers>
3.  <https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects>
4.  <https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites>
## 1. assetPrefix

assetPrefix 用于设置资源前缀，举个例子：

```javascript
// next.config.ts
const isProd = process.env.NODE_ENV === 'production'
 
const nextConfig = {
  // Use the CDN in production and localhost for development.
  assetPrefix: isProd ? 'https://cdn.mydomain.com' : undefined,
}

export default nextConfig
```

Next.js 会自动为从 `/_next`路径（`.next/static/`文件夹）加载的 JavaScript 和 CSS 文件添加资源前缀。以这个例子为例，当请求 JS 代码片段的时候，原本地址是：

    /_next/static/chunks/4b9b41aaa062cbbfeff4add70f256968c51ece5d.4d708494b3aed70c04f0.js

会变成：

    https://cdn.mydomain.com/_next/static/chunks/4b9b41aaa062cbbfeff4add70f256968c51ece5d.4d708494b3aed70c04f0.js

注意：虽然这里请求的路径是在 `/_next`下，但实际文件在 `.next/` 下。

在开发环境中测试一下这个配置，请求地址会由 `http://localhost:3000/_next/...` 变为 `https://cdn.mydomain.com/_next/...`。

注意：

1.  你应该上传到 CDN 的只有 `.next/static/`的内容，不要上传 `.next/` 剩余的部分，这会导致你暴露服务端代码和其他配置。
2.  `assetPrefix`不会影响 `public` 文件夹下的文件。对于 `public` 下的资源，你需要自己处理前缀。

## 2. basePath

`basePath` 用于设置应用的路径前缀。举个例子：

```javascript
// next.config.ts
const nextConfig = {
  basePath: '/docs',
}

export default nextConfig
```

修改 `app/page.js`的代码为：

```javascript
import Link from 'next/link'

export default function HomePage() {
  return (
    <>
      <Link href="/about">About Page</Link>
    </>
  )
}
```

使用 `basePath` 后，直接访问 `/`会导致 404 错误。你应该访问 `/docs`。

如果你不希望访问 `/` 导致 404 错误，那你可以来个重写或者重定向：

```javascript
// next.config.ts
const nextConfig = {
  basePath: '/docs',
  async redirects() {
    return [
        {
            source: '/',
            destination: '/docs',
            basePath: false,
            permanent: false
        }
    ]
  }
}

export default nextConfig
```

当你使用 `next/link` 和 `next/router` （App Router 下使用 `next/navigation`）链接到其他页面时，`basePath` 就会自动应用。举个例子，`/about` 会自动变成 `/docs/about`：

```javascript
export default function HomePage() {
  return (
    <>
      <Link href="/about">About Page</Link>
    </>
  )
}
```

输出的 HTML 为：

```html
<a href="/docs/about">About Page</a>
```

当你使用 `next/image`组件的时候，你应该在 `src` 前添加 `basePath`（如果你使用静态导入就正常处理即可）：

```javascript
import Image from 'next/image'
 
function Home() {
  return (
    <>
      <h1>My Homepage</h1>
      <Image
        src="/docs/me.png"
        alt="Picture of the author"
        width={500}
        height={500}
      />
      <p>Welcome to my homepage!</p>
    </>
  )
}
 
export default Home
```

在这个例子中，图片放在 `/public`目录下，正常使用 `/me.png` 即可访问，设置 `basePath` 为 `/docs` 后，应该改为使用 `/docs/me.png`。

## 3. compress

Next.js 提供 gzip 压缩来压缩渲染的内容和静态文件。如果你想禁用压缩功能：

```javascript
// next.config.ts
const nextConfig = {
  compress: false,
}

export default nextConfig
```

## 4. devIndicators

当你编辑代码，Next.js 正在编译应用的时候，页面右下角会有一个编译指示器。

这个指示器只会在开发模式下展示，生产环境中不会展示。如果你想更改它的位置，就比如它跟页面的其他元素位置发生冲突了：

```javascript
const nextConfig = {
  devIndicators: {
    buildActivityPosition: 'bottom-right',
  },
}

export default nextConfig
```

默认值是 `bottom-right`，其他值还有 `bottom-left`、`top-right`、`top-left`。

如果你想禁用它：

```javascript
const nextConfig = {
  devIndicators: {
    buildActivity: false,
  },
}

export default nextConfig
```

## 5. distDir

`distDir` 用于自定义构建目录，默认是 `.next`：

举个例子：

```javascript
const nextConfig = {
  distDir: 'build',
}

export default nextConfig
```

现在如果你运行 `next build`，Next.js 会使用 `build` 文件夹而不是 `.next`文件夹。注意：`distDir` 不能离开你的项目目录，举个例子，`../build`就是一个无效目录。

## 6. env

Next.js 9.4 后使用新的方式添加环境变量，新的方式更加直观方便、功能强大，具体内容参考本系列《环境变量、路径别名与 src 目录》。

添加一个环境变量到 JavaScript bundle 中，举个例子：

```javascript
const nextConfig = {
  env: {
    customKey: 'my-value',
  },
}

export default nextConfig
```

现在你可以在代码中通过 `process.env.customKey` 获取：

```javascript
function Page() {
  return <h1>The value of customKey is: {process.env.customKey}</h1>
}
 
export default Page
```

Next.js 会在构建的时候，将 `process.env.customKey`替换为 `my-value`（因为 webpack [DefinePlugin](https://webpack.js.org/plugins/define-plugin/) 的特性，不支持通过解构赋值）。举个例子：

```javascript
return <h1>The value of customKey is: {process.env.customKey}</h1>
```

相当于：

```javascript
return <h1>The value of customKey is: {'my-value'}</h1>
```

最终页面上会渲染出 `The value of customKey is: my-value`。

## 7. eslint

如果项目中检测到 ESLint，Next.js 会在出现错误的时候，让生产构建（`next build`）失败。

如果你希望即使有错误，也要构建生产代码，可以禁止内置的 ESLint：

```javascript
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
```

## 8. generateBuildId

Next.js 会在 `next build` 的时候生成一个 ID，用于标示应用正在使用的版本，适用于在多个 Docker 容器中运行多个应用实例的场景。

如果你要为环境的每个阶段进行重建，你需要在不同的容器间生成一致的构建 ID（比如测试、开发、预生产、生产等不同的阶段对应不同的容器，但最好使用相同的构建 ID），使用 `next.config.ts` 的 `generateBuildId`：

```javascript
const nextConfig = {
  generateBuildId: async () => {
    // This could be anything, using the latest git hash
    return process.env.GIT_HASH
  },
}

export default nextConfig
```

## 9. generateEtags

Next.js 默认会为每个页面生成 [etags](https://en.wikipedia.org/wiki/HTTP_ETag)，如果你希望禁用 HTML 页面生成 etags，使用 `next.config.ts` 的 `generateEtags`：

```javascript
const nextConfig = {
  generateEtags: false
}

export default nextConfig
```

## 10. httpAgentOptions

在 Nodejs 18 之前，Next.js 会自动使用 [undici](https://github.com/nodejs/undici) 作为 `fetch()` 的 polyfill，并且默认开启 HTTP [Keep-Alive](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Keep-Alive)。

如果禁用服务端所有 fetch() 请求的 HTTP Keep-Alive ，使用 `next.config.ts` 的 `httpAgentOptions` 配置：

```javascript
const nextConfig = {
  httpAgentOptions: {
    keepAlive: false,
  },
}

export default nextConfig
```

## 11. images

如果你想要使用云提供商优化图片而不使用 Next.js 内置的图像优化 API，那可以在 `next.config.ts` 中进行如下配置：

```javascript
const nextConfig = {
  images: {
    loader: 'custom',
    loaderFile: './my/image/loader.js',
  },
}

export default nextConfig
```

`loaderFile` 必须指向一个相对于应用根目录的地址，这个文件必须导出一个返回字符串的默认函数，例如：

```javascript
export default function myImageLoader({ src, width, quality }) {
  return `https://example.com/${src}?w=${width}&q=${quality || 75}`
}
```

就比如你想要使用 Cloudflare，参考 Cloudflare 的 [url-format](https://developers.cloudflare.com/images/url-format) 文档：

```javascript
// Docs: https://developers.cloudflare.com/images/url-format
export default function cloudflareLoader({ src, width, quality }) {
  const params = [`width=${width}`, `quality=${quality || 75}`, 'format=auto']
  return `https://example.com/cdn-cgi/image/${params.join(',')}/${src}`
}
```

此为全局修改，如果你只想更改部分图片，那你可以使用 `loader` prop：

```javascript
'use client'
 
import Image from 'next/image'
 
const imageLoader = ({ src, width, quality }) => {
  return `https://example.com/${src}?w=${width}&q=${quality || 75}`
}
 
export default function Page() {
  return (
    <Image
      loader={imageLoader}
      src="me.png"
      alt="Picture of the author"
      width={500}
      height={500}
    />
  )
}
```

## 12. cacheHandler

用于自定义 Next.js 的缓存处理程序，举个例子：

```javascript
const nextConfig = {
  cacheHandler: './cache-handler.js',
}

export default nextConfig
```

自定义的缓存示例代码为：

```javascript
// cache-handler.js
const cache = new Map()
 
module.exports = class CacheHandler {
  constructor(options) {
    this.options = options
    this.cache = {}
  }
 
  async get(key) {
    return cache.get(key)
  }
 
  async set(key, data) {
    cache.set(key, {
      value: data,
      lastModified: Date.now(),
    })
  }
}
```

完整的 API 参考 <https://nextjs.org/docs/app/api-reference/config/next-config-js/incrementalCacheHandlerPath>

## 13. logging

当在开发模式运行 Next.js ，你可以配置日志等级以及控制台是否记录完整 URL。目前，logging 只应用于使用 fetch API 的数据获取，还不能用于 Next.js 其他日志。

```javascript
const nextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

export default nextConfig
```

## 14. mdxRs

使用新的 Rust 编译器编译 MDX 文件，和 `@next/mdx` 一起使用：

```javascript
const withMDX = require('@next/mdx')()
 
/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
  experimental: {
    mdxRs: true,
  },
}
 
export default withMDX(nextConfig)
```

## 15. onDemandEntries

onDemandEntries 用于控制开发模式下服务端如何处理内存中构建的页面：

```javascript
const nextConfig = {
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
}

export default nextConfig
```

## 16. optimizePackageImports

有些包可以导出成百上千个模块，这会导致开发和生产中的性能问题。

添加一个包到 `experimental.optimizePackageImports` 后，Next.js 只会加载实际用到的模块：

```javascript
const nextConfig = {
  experimental: {
    optimizePackageImports: ['package-name'],
  },
}

export default nextConfig
```

`@mui/icons-material`, `@mui/material`, `date-fns`, `lodash`, `lodash-es`, `react-bootstrap`, `@headlessui/react`, `@heroicons/react`以及 `lucide-react` ，这些库默认已经优化。

## 17. output

在构建的时候，Next.js 会自动追踪每个页面和它的依赖项，以确定部署一个生产版本所需要的所有文件。

这个功能会帮你大幅减少部署的大小。之前使用 Docker 部署的时候，你需要安装 `dependencies` 中的所有文件才能运行 `run start`。从 Next.js 12 起，你可以追踪 `.next/` 目录中的输出文件以实现只包含必要的文件。

之所以能够实现，是因为在 `next build` 的时候，Next.js 会使用 `@vercel/nft` 静态分析 `import`、`require` 和` fs` 使用情况来确定页面加载的所有文件。

Next.js 的生产服务器也会在 `.next/next-server.js.nft.json`中追踪所有它所需要的文件和输出。这个文件就可以被用来在每次追踪的时候，读取文件列表，然后将文件拷贝到部署位置上。

现在让我们在 `next.config.ts` 中开启：

```javascript
const nextConfig = {
  output: 'standalone',
}

export default nextConfig
```

Next.js 会自动在 `.next`中创建一个 `standalone` 文件夹，然后拷贝 `node_modules` 中生产部署会用到的所有必需文件。靠着这个文件夹，都不需要再次安装 `node_modules` 即可实现部署。

## 18. pageExtensions

默认情况下，Next.js 接受 `.tsx`、`.ts`、`.js`、`.jsx`作为拓展名的文件。 pageExtension 用于接受其他的扩展名比如 markdown （`.md`、`.mdx`）

```javascript
const withMDX = require('@next/mdx')()
 
/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
}
 
export default withMDX(nextConfig)
```

## 19. 局部渲染

局部渲染是一个实验性的功能，目前在 `next@latest` 中可用：

```bash
npm install next@latest
```

开启局部渲染：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: 'incremental',
  },
}
 
export default nextConfig
```

注意：局部渲染目前不能用于客户端导航。

> 说明：在 Next.js 16 中，`experimental.ppr` 配置已被移除，PPR 并入了 Cache Components（开启 `cacheComponents: true` 后配合 `use cache` 指令使用）。

## 20. poweredByHeader

默认情况下，Next.js 会添加 `x-powered-by`标头，如果要禁用此功能：

```javascript
const nextConfig = {
  poweredByHeader: false,
}

export default nextConfig
```

## 21. productionBrowserSourceMaps

SourceMap 默认在开发环境中开启，在生产构建的时候会禁用以防止源码泄漏，但如果你非要开启：

```javascript
const nextConfig = {
  productionBrowserSourceMaps: true,
}

export default nextConfig
```

## 22. reactStrictMode

从 Next.js 13.4 起，严格模式在 App Router 下默认为 `true`，所以这个配置仅用于 Pages Router。不过你依然可以设置 `reactStrictMode: false` 来禁用严格模式。

React 的严格模式是一个为了突出应用中潜在问题的功能，在开发模式中使用会有助于识别不安全的生命周期、过期的 API 用法以及其他功能。使用严格模式，在 `next.config.ts` 中配置：

```javascript
const nextConfig = {
  reactStrictMode: true,
}

export default nextConfig
```

如果不希望整个应用都使用严格模式，只针对某些页面使用的话，那可以用 `<React.StrictMode>`。

## 23. serverExternalPackages

Next.js 会自动打包服务端组件和路由处理程序中的依赖项。如果某一个依赖项使用了 Nodejs 特定的功能，那你可以选择从 Bundle 中去除该依赖项，然后使用原生的 Nodejs `require`。

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@acme/ui'],
}
 
export default nextConfig
```

## 24. trailingSlash

默认情况下，Next.js 会将带尾部斜杠的 URL 重定向到没有尾部斜杠的地址。举个例子，`/about/`会重定向到 `/about`。你也可以进行相反的配置，将没有尾部斜杠的地址重定向到带尾部斜杠的地址：

```javascript
const nextConfig = {
  trailingSlash: true,
}

export default nextConfig
```

现在，`/about`重定向到 `/about/`。

## 25. transpilePackages

Next.js 可以自动编译和打包来自本地的包（如 monorepos）或者外部依赖（node_modules）。以前是通过使用 [next-transpile-modules](https://www.npmjs.com/package/next-transpile-modules) 这个包，有了这个选项就可以直接使用了：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@acme/ui', 'lodash-es'],
}
 
export default nextConfig
```

## 26. turbopack

这些功能是实验性的，只有当使用 `next dev` 的时候才会开启。

目前，Turbopack 支持 webpack loader API 的子集，允许你在 Turbopack 中使用一些 webpack loader 转换代码。举个例子：

```javascript
const nextConfig = {
      turbopack: {
      rules: {
        // Option format
        '*.md': [
          {
            loader: '@mdx-js/loader',
            options: {
              format: 'md',
            },
          },
        ],
        // Option-less format
        '*.mdx': ['@mdx-js/loader'],
      },
    },
  },
}

export default nextConfig
```

现在，你可以在应用中使用：

```javascript
import MyDoc from './my-doc.mdx'
 
export default function Home() {
  return <MyDoc />
}
```

类似于 webpack 的 resolve.alias，Turbopack 也可以配置别名：

```javascript
const nextConfig = {
      turbopack: {
      resolveAlias: {
        underscore: 'lodash',
        mocha: { browser: 'mocha/browser-entry.js' },
      },
    },
  },
}

export default nextConfig
```

在这个例子中，使用 `import underscore from 'underscore'`其实会导入 lodash。

Turbopack 也支持条件别名，目前只支持 browser 这个条件。在这个例子中，当 Turbopack 以浏览器环境为目标的时候，导入 mocha 模块相当于导入 mocha/browser-entry.js。

## 27. typedRoutes

对静态类型链接的实验性支持，此功能需要在 App Router 下以及开启使用 TypeScript：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
}
 
export default nextConfig
```

## 28. typescript

如果出现 TypeScript 错误，生产构建（`next build`）会失败。如果你希望即便有错误，也要构建生产代码：

```javascript
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
}

export default nextConfig
```

## 29. urlImports

URL 导入是一项实验性功能，允许你从外部服务器导入模块。

如果你要使用该功能，使用示例如下：

```javascript
const nextConfig = {
  experimental: {
    urlImports: ['https://example.com/assets/', 'https://cdn.skypack.dev'],
  },
}

export default nextConfig
```

在这个例子中，添加了允许的资源前缀（毕竟要保证安全）。

然后你就可以直接通过 URL 导入模块：

```javascript
import { a, b, c } from 'https://example.com/assets/some/module.js'
```

当使用 URL 导入的时候，Next.js 会创建一个 `next.lock`目录包含一个 lockfile 和获取的资源。这个目录必须要提交到 Git，不能通过 `.gitignore`忽略。

当运行 `next dev`的时候，Next.js 会下载并添加所有新发现的导入 URL 到 lockfile 中。当运行 `next build`的时候，Next.js 会只使用 lockfile 构建用于生产版本的应用。

使用 URL 导入的一些例子：

使用 skypack：

```javascript
import confetti from 'https://cdn.skypack.dev/canvas-confetti'
import { useEffect } from 'react'
 
export default () => {
  useEffect(() => {
    confetti()
  })
  return <p>Hello</p>
}
```

静态图片导入：

```javascript
import Image from 'next/image'
import logo from 'https://example.com/assets/logo.png'
 
export default () => (
  <div>
    <Image src={logo} placeholder="blur" />
  </div>
)
```

CSS 中的 URLs：

```css
.className {
  background: url('https://example.com/assets/hero.jpg');
}
```

导入资源：

```javascript
const logo = new URL('https://example.com/assets/file.txt', import.meta.url)
 
console.log(logo.pathname)
 
// prints "/_next/static/media/file.a9727b5d.txt"
```

## 30. 自定义 Webpack 配置

为了扩展 webpack 的用法，你需要在 next.config.ts 中定义一个函数用于扩展它的配置，举个例子：

```javascript
const nextConfig = {
  webpack: (
    config,
    { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }
  ) => {
    // Important: return the modified config
    return config
  },
}

export default nextConfig
```

webpack 函数会被执行两次，一次在服务端，一次在客户端，你可以使用 isServer 属性来区分是客户端配置还是服务端配置。

webpack 函数的第二个参数是一个具有以下属性的对象：

*   `buildId`：`String`，构建 ID，构建的唯一标识
*   `dev`：`Boolean` 编译是否会在开发中完成
*   `isServer`：`Boolean`，如果 true 表示服务端编译，如果 false 表示客户端编译
*   `nextRuntime`：`String | undefined`，服务端编译的目标运行时，要么是 `"edge"` ，要么是 `"nodejs"`，`undefined`用于客户端编译
*   `defaultLoaders`：`Object` Next.js 内部使用的默认加载器
    *   `babel`：`Object` 默认的 `babel-loader` 配置

`defaultLoaders.babel` 示例用法：

```javascript
// 这段来自于 @next/mdx 插件源码:
// https://github.com/vercel/next.js/tree/canary/packages/next-mdx
const nextConfig = {
  webpack: (config, options) => {
    config.module.rules.push({
      test: /\.mdx/,
      use: [
        options.defaultLoaders.babel,
        {
          loader: '@mdx-js/loader',
          options: pluginOptions.options,
        },
      ],
    })
 
    return config
  },
}

export default nextConfig
```

## 31. webVitalsAttribution

在调试 Web Vitals 相关的问题时，如果能查明根源通常会很有帮助。比如在 CLS 中，我们可能想知道最大的布局偏移发生时偏移的第一个元素，或者 LCP 中，我们可能想要知道 LCP 对应的元素。如果该元素是图片，知道它的 URL 有助于我们进行优化。

这就需要用到 `experimental.webVitalsAttribution` 配置项，它会帮助我们获取更深层的信息如 [PerformanceEventTiming](https://developer.mozilla.org/docs/Web/API/PerformanceEventTiming)、[PerformanceNavigationTiming](https://developer.mozilla.org/docs/Web/API/PerformanceNavigationTiming)、[PerformanceResourceTiming](https://developer.mozilla.org/docs/Web/API/PerformanceResourceTiming)。

```javascript
const nextConfig = {
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP'],
  },
}
```

有效的归因值都是 web-vitals 中的特定指标，在 [NextWebVitalsMetric](https://github.com/vercel/next.js/blob/442378d21dd56d6e769863eb8c2cb521a463a2e0/packages/next/shared/lib/utils.ts#L43) 中可以查看：

```javascript
export type NextWebVitalsMetric = {
  id: string
  startTime: number
  value: number
} & (
  | {
      label: 'web-vital'
      name: 'FCP' | 'LCP' | 'CLS' | 'FID' | 'TTFB' | 'INP'
    }
  | {
      label: 'custom'
      name:
        | 'Next.js-hydration'
        | 'Next.js-route-change-to-render'
        | 'Next.js-render'
    }
)
```

## 参考链接

1.  <https://nextjs.org/docs/app/api-reference/config/next-config-js>
