---
title: Axios无感刷新token
description: "token 过期时间只有两小时，但又想让一个月内经常活跃的用户不再次登录，于是才有这样需求，避免了用户再次输入账号密码登录。"
keywords: [Axios, token, 无感刷新]
category: tools
tags: [Axios, HTTP, 请求库]
---


# axios 无感刷新 token

在登录后管理 `access_token` 和 `refresh_token` ，主要就是封装 axios 拦截器

> 单点登录( Single Sign On ，简称 SSO），是目前比较流行的企业业务整合的解决方案之一，用于多个应用系统间，用户只需要登录一次就可以访问所有相互信任的应用系统。

## 需求

1.  进入该项目某个页面 `http://xxxx.project.com/profile` 需要登录，未登录就跳转至 SSO 登录平台，此时的登录网址 url 为`http://xxxxx.com/login?app_id=project_name_id&redirect_url=http://xxxx.project.com/profile`，其中 `app_id` 是后台那边约定定义好的，`redirect_url` 是成功授权后指定的回调地址

2.  输入账号密码且正确后，就会重定向回刚开始进入的页面，并在地址栏带一个参数 `?code=XXXXX`，即是`http://xxxx.project.com/profile?code=XXXXXX`，code 的值是使用一次后即无效，且 10 分钟内过期

3.  使用 code 值再去请求一个 api `/access_token/authenticate`，携带参数 `{ verify_code: code }` ，并且该 api 已经自带`app_id` 和 `app_secret` 两个固定值参数，通过它去请求授权的 api，请求成功后得到返回值 `{ access_token: "xxxxxxx", refresh_token: "xxxxxxxx", expires_in: xxxxxxxx }` ，存下 `access_token` 和 `refresh_token` 到 cookie 中或者 localStorage

4.  `access_token` 为标准 JWT 格式，是授权令牌，在调用 api 访问和修改用户数据必须传入的参数（放在请求头 headers 里），2 小时后过期。过去两个小时后，再去请求这些 api，就会报 `access_token` 过期，调用失败

5.  解决方法就是两小时后拿着过期的 `access_token` 和 `refresh_token` （`refresh_token` 过期时间一般长一些，比如一个月）去请求 `/refresh` api，返回结果为 `{ access_token: "xxxxx", expires_in: xxxxx }` ，换取新的 `access_token`，新的`access_token` 过期时间也是 2 小时，循环往复继续保持登录调用用户 api 了

6.  `refresh_token` 在限定过期时间内（比如一周或一个月等），下次就可以继续换取新的 `access_token`，但过了限定时间，就算真正意义过期了，也就要重新输入账号密码来登录了

## Token 认证流程

token 过期时间只有两小时，但又想让一个月内经常活跃的用户不再次登录，于是才有这样需求，避免了用户再次输入账号密码登录。

> `access_token` 会关联一定的用户权限，如果用户授权更改了，`access_token` 也是需要被刷新以关联新的权限的，如果没有 `refresh_token`，也可以刷新 `access_token`，但每次刷新都要用户输入登录用户名与密码。
>
> 有了 `refresh_token`，客户端直接用 `refresh_token` 去更新 `access_token`，无需用户进行额外的操作。

有的公司 `refresh_token` 是后台包办的并不需要前端处理。但是，前置场景在那了，需求都是基于该场景下的。

1.  当`access_token`过期的时候，要用`refresh_token`去请求获取新的`access_token`，前端需要做到用户无感知的刷新`access_token`。比如用户发起一个请求时，如果判断`access_token`已经过期，那么就先要去调用刷新 token 接口拿到新的`access_token`，再重新发起用户请求
2.  如果同时发起多个用户请求，第一个用户请求去调用刷新 token 接口，当接口还没返回时，其余的用户请求也依旧发起了刷新 token 接口请求，就会导致多个请求

## 请求拦截器处理(不推荐)

写在请求拦截器里，在请求前，先利用最初请求返回的字段`expires_in`字段来判断`access_token`是否已经过期，若已过期，则将请求挂起，先刷新`access_token`后再继续请求

- 优点： 能节省 http 请求
- 缺点： 因为使用了本地时间判断，若本地时间被篡改，有校验失败的风险
- 注意：下面的示例只示意了过期判断逻辑；在请求拦截器中直接调用 `refreshToken()` 并不会真正挂起当前请求（请求仍会带着旧 token 发出），完整可用的实现见下文的响应拦截器方案

```javascript
axios.interceptors.request.use((config) => {
  const token = getToken() // 获取 token
  if (token) {
    const exp = getTokenExpiration(token)
    if (exp && exp < new Date().getTime() / 1000 + 30) {
      // token 即将过期
      refreshToken()
    }
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

```javascript
// 浏览器端请使用 jwt-decode（jsonwebtoken 为 Node 专用库）
import { jwtDecode } from "jwt-decode"

function getTokenExpiration(token) {
  const decoded = jwtDecode(token)
  if (!decoded || !decoded.exp) {
    return null
  }
  return decoded.exp
}
```

## 响应拦截器处理(推荐)

写在响应拦截器里，拦截返回后的数据。先发起用户请求，如果接口返回 `access_token` 过期，先刷新 `access_token`，再进行一次重试

- 优点：无需判断时间
- 缺点： 会消耗多一次 http 请求

`@utils/auth.js`

```javascript
import Cookies from "js-cookie"

const TOKEN_KEY = "access_token"
const REFRESH_TOKEN_KEY = "refresh_token"

export const getToken = () => Cookies.get(TOKEN_KEY)

export const setToken = (token, params = {}) => {
  Cookies.set(TOKEN_KEY, token, params)
}

export const setRefreshToken = (token) => {
  Cookies.set(REFRESH_TOKEN_KEY, token)
}

export const getRefreshToken = () => Cookies.get(REFRESH_TOKEN_KEY)
```

request.js

```javascript
import axios from 'axios'
import { getToken, setToken, getRefreshToken } from '@utils/auth'

// 刷新 access_token 的接口
const refreshToken = () => {
  return instance.post('/auth/refresh', { refresh_token: getRefreshToken() })
}

const instance = axios.create({
  baseURL:  process.env.URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
})

instance.interceptors.response.use(response => {
    return response
}, error => {
    if (!error.response) {
        return Promise.reject(error)
    }
    if (error.response.status === 401 && !error.config.url.includes('/auth/refresh')) {
        const { config } = error
        return refreshToken().then(res=> {
            const { access_token } = res.data
            setToken(access_token)
            config.headers.Authorization = `Bearer ${access_token}`
            return instance(config)
        }).catch(err => {
            console.log('抱歉，您的登录状态已失效，请重新登录！')
            return Promise.reject(err)
        })
    }
    return Promise.reject(error)
})

// 给请求头添加 access_token
const setHeaderToken = (isNeedToken) => {
  const accessToken = isNeedToken ? getToken() : null
  if (isNeedToken) {
    if (!accessToken) {
      console.log('不存在 access_token 则跳转回登录页')
    }
    instance.defaults.headers.common.Authorization = `Bearer ${accessToken}`
  }
}


export const get = (url, params = {}, isNeedToken = false) => {
  setHeaderToken(isNeedToken)
  return instance({
    method: 'get',
    url,
    params,
  })
}

export const post = (url, params = {}, isNeedToken = false) => {
  setHeaderToken(isNeedToken)
  return instance({
    method: 'post',
    url,
    data: params,
  })
}
```

约定返回 401 状态码表示 `access_token` 过期或者无效，则请求刷新 `access_token` 的接口。请求成功则进入 `then` 里面，重置配置，并刷新 `access_token` 并重新发起原来的请求。

如果 `refresh_token` 也过期了，则请求也是返回 401。此时调试会发现函数进不到 `refreshToken()` 的 `catch` 里面，那是因为`refreshToken()`方法内部是也是用了同个 `instance` 实例，重复响应拦截器 401 的处理逻辑，故需要把该接口排除掉，即：

```javascript
if (error.response.status === 401 && !error.config.url.includes('/auth/refresh')) {}
```

### 防止多次刷新 token

如果 token 是过期的，那请求刷新 `access_token` 的接口返回也是有一定时间间隔，如果此时还有其他请求发过来，就会再执行一次刷新 `access_token` 的接口，就会导致多次刷新 `access_token`

因此，我们需要做一个判断，定义一个标记判断当前是否处于刷新 `access_token` 的状态，如果处在刷新状态则不再允许其他请求调用该接口

```javascript
let isRefreshing = false
instance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (!error.response) {
      return Promise.reject(error)
    }
    if (error.response.status === 401 && !error.config.url.includes("/auth/refresh")) {
      const { config } = error
      if (!isRefreshing) {
        isRefreshing = true
        return refreshToken()
          .then((res) => {
            const { access_token } = res.data
            setToken(access_token)
            config.headers.Authorization = `Bearer ${access_token}`
            return instance(config)
          })
          .catch((err) => {
            console.log("抱歉，您的登录状态已失效，请重新登录！")
            return Promise.reject(err)
          })
          .finally(() => {
            isRefreshing = false
          })
      }
    }
    return Promise.reject(error)
  }
)
```

### 同时发起多个请求的处理

上面做法还不够，因为如果同时发起多个请求，在 token 过期的情况，第一个请求进入刷新 token 方法，则其他请求进去没有做任何逻辑处理，单纯返回失败，最终只执行了第一个请求，这显然不合理

比如同时发起三个请求，第一个请求进入刷新 token 的流程，第二个和第三个请求需要存起来，等到 token 更新后再重新发起请求

定义一个数组 `requests`，用来保存处于等待的请求，之后返回一个 `Promise`，只要不调用 `resolve` 方法，该请求就会处于等待状态，则可以知道其实数组存的是函数；等到 token 更新完毕，则通过数组循环执行函数，即逐个执行 resolve 重发请求

```javascript
let isRefreshing = false // 标记是否正在刷新 token
let requests = [] // 存储待重发请求的数组

instance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (!error.response) {
      return Promise.reject(error)
    }
    if (error.response.status === 401 && !error.config.url.includes("/auth/refresh")) {
      const { config } = error
      if (!isRefreshing) {
        isRefreshing = true
        return refreshToken()
          .then((res) => {
            const { access_token } = res.data
            setToken(access_token)
            config.headers.Authorization = `Bearer ${access_token}`
            // token 刷新后将数组的方法重新执行
            requests.forEach((cb) => cb(access_token))
            requests = []
            return instance(config)
          })
          .catch((err) => {
            console.log("抱歉，您的登录状态已失效，请重新登录！")
            return Promise.reject(err)
          })
          .finally(() => {
            isRefreshing = false
          })
      } else {
        // 返回未执行 resolve 的 Promise
        return new Promise((resolve) => {
          // 用函数形式将 resolve 存入，等待刷新后再执行
          requests.push((token) => {
            config.headers.Authorization = `Bearer ${token}`
            resolve(instance(config))
          })
        })
      }
    }
    return Promise.reject(error)
  }
)
```

### 问题

比如同时发起三个请求，第一个请求进入刷新 token 的流程，第二个和第三个请求需要存起来，等到 token 更新后再重新发起请求。但是后两个请求事实上已经请求过接口，只是不返回请求结果，等新 token 来了之后，再次请求这两个接口，所以实际上上述过程，一共请求了 7 次接口，一次 token 接口， 3 个数据接口各两次

> 这种情况不怎么需要考虑。刷新 token 的情况发生毕竟是少数，而且有需求是多个请求是并行发送的。如果等新 token 来了再请求（请求就必须串行），整体响应会变慢。 一般在请求的响应拦截处判断，如果需要刷新，就统一去调用一个更新 token 接口（会缓存），保证更新 token 接口只调用一次。其余接口也就多调用一次而已

## TypeScript 版本实现

下面是使用 TypeScript 实现的完整版本，包含类型定义和更严格的类型检查：

```typescript
// types/auth.ts
export interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface RefreshTokenResponse {
  access_token: string
  expires_in: number
}

// utils/auth.ts
import Cookies from "js-cookie"

const TOKEN_KEY = "access_token"
const REFRESH_TOKEN_KEY = "refresh_token"

export const getToken = (): string | undefined => Cookies.get(TOKEN_KEY)

export const setToken = (token: string, params: Cookies.CookieAttributes = {}): void => {
  Cookies.set(TOKEN_KEY, token, params)
}

export const setRefreshToken = (token: string): void => {
  Cookies.set(REFRESH_TOKEN_KEY, token)
}

export const getRefreshToken = (): string | undefined => Cookies.get(REFRESH_TOKEN_KEY)

export const removeTokens = (): void => {
  Cookies.remove(TOKEN_KEY)
  Cookies.remove(REFRESH_TOKEN_KEY)
}

// utils/request.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios"
import { getToken, setToken, getRefreshToken, removeTokens } from "./auth"
import { TokenResponse, RefreshTokenResponse } from "../types/auth"

// 创建 axios 实例
const instance: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json"
  }
})

// 刷新 token 的接口
const refreshToken = (): Promise<AxiosResponse<RefreshTokenResponse>> => {
  return instance.post("/auth/refresh", { refresh_token: getRefreshToken() })
}

// 标记是否正在刷新 token
let isRefreshing = false
// 存储待重发请求的数组
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: any) => void
}> = []

// 处理队列中的请求
const processQueue = (error: any, token: string | null = null): void => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token!)
    }
  })

  failedQueue = []
}

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (!error.response) {
      return Promise.reject(error)
    }

    // 如果是 401 错误且不是刷新 token 的请求
    if (error.response.status === 401 && !originalRequest.url.includes("/auth/refresh")) {
      if (isRefreshing) {
        // 如果正在刷新 token，则将请求加入队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return instance(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      isRefreshing = true

      try {
        const response = await refreshToken()
        const { access_token } = response.data

        setToken(access_token)
        processQueue(null, access_token)

        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return instance(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)

        // 刷新 token 失败，清除 token 并跳转到登录页
        removeTokens()
        window.location.href = "/login"

        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// 封装请求方法
export const request = {
  get: <T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> => {
    return instance.get(url, { params, ...config })
  },

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return instance.post(url, data, config)
  },

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return instance.put(url, data, config)
  },

  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return instance.delete(url, config)
  }
}

export default instance
```

## 最佳实践

1. **Token 存储安全**

   - 敏感应用应使用 `httpOnly` 的 Cookie 存储 token，防止 XSS 攻击
   - 非敏感应用可以使用 `localStorage`，但要注意防范 XSS 攻击
   - 设置合理的过期时间，`access_token` 短期有效（如 2 小时），`refresh_token` 长期有效（如 7-30 天）

2. **错误处理**

   - 当 `refresh_token` 也过期时，应清除本地存储的 token 并跳转到登录页
   - 提供友好的错误提示，避免直接暴露技术细节
   - 记录 token 刷新失败的日志，便于排查问题

3. **性能优化**

   - 避免频繁刷新 token，设置合理的刷新阈值
   - 对于批量请求，考虑在应用启动时检查 token 状态
   - 使用请求队列避免重复刷新 token

4. **用户体验**
   - 在 token 刷新过程中显示加载状态
   - 避免在 token 刷新时丢失用户输入的数据
   - 提供网络异常时的重试机制

## 常见问题

### Q: 如何处理页面刷新后 token 丢失的问题？

A: 可以使用 `localStorage` 或 `sessionStorage` 存储 token，或者使用 `httpOnly` 的 Cookie。如果使用 `localStorage`，需要注意防范 XSS 攻击：

```javascript
// 在应用启动时检查 token
const initApp = () => {
  const token = getToken()
  if (!token) {
    // 没有 token，跳转到登录页
    redirectToLogin()
  } else {
    // 有 token，验证 token 是否有效
    validateToken()
  }
}
```

### Q: 如何处理多个标签页之间的 token 同步问题？

A: 可以使用 `localStorage` 的 `storage` 事件来监听 token 的变化：

```javascript
// 在一个标签页中更新 token
const updateToken = (newToken) => {
  setToken(newToken)
  // 触发自定义事件，通知其他标签页
  localStorage.setItem("token_updated", Date.now().toString())
}

// 在其他标签页中监听 token 更新
window.addEventListener("storage", (event) => {
  if (event.key === "token_updated") {
    // 重新获取最新的 token
    const newToken = getToken()
    // 更新当前标签页的 token
    updateAxiosToken(newToken)
  }
})
```

### Q: 如何处理网络断开重连后的 token 刷新问题？

A: 可以监听网络状态变化，在网络恢复时检查 token 状态：

```javascript
window.addEventListener("online", () => {
  // 网络恢复，检查 token 是否有效
  validateToken()
})

const validateToken = async () => {
  try {
    // 发送一个简单的请求验证 token
    await instance.get("/auth/validate")
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // token 无效，尝试刷新
      try {
        await refreshToken()
      } catch (refreshError) {
        // 刷新失败，跳转到登录页
        redirectToLogin()
      }
    }
  }
}
```

### Q: 如何处理 token 刷新时的并发请求？

A: 使用请求队列和 Promise 缓存机制，确保 token 刷新只执行一次：

```typescript
// 缓存刷新 token 的 Promise
let refreshPromise: Promise<string> | null = null

const refreshTokenOnce = async (): Promise<string> => {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = refreshToken()
    .then((response) => {
      const { access_token } = response.data
      setToken(access_token)
      return access_token
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}
```
