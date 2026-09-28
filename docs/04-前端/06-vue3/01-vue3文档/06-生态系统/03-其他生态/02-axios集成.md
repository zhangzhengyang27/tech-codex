---
title: axios集成
description: "Vue 3 项目 axios 集成：实例创建与拦截器配置、TypeScript 类型定义、API 模块化、useRequest/usePagination 封装、Token 无感刷新及 Axios 与 fetch 选型对比。"
keywords: [axios集成]
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# axios 集成

> axios 是 Vue 项目中最流行的 HTTP 客户端，支持浏览器和 Node.js，提供了拦截器、取消请求、自动转换 JSON 等强大功能。

## 一、安装与基础配置

### 安装

```bash
npm install axios

# 或使用 yarn
yarn add axios

# 或使用 pnpm
pnpm add axios
```

### TypeScript 类型支持

axios 自带 TypeScript 类型定义，无需额外安装：

```bash
# 已包含类型定义
npm install axios
```

### 创建实例

```ts
// utils/request.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export default request
```

---

## 二、拦截器配置

### 请求拦截器

```ts
// utils/request.ts
import type { InternalAxiosRequestConfig } from 'axios'

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 添加 token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 添加请求 ID（用于追踪）
    config.headers['X-Request-ID'] = generateRequestId()
    
    // 添加时间戳防止缓存
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}
```

### 响应拦截器

```ts
// utils/request.ts
import type { AxiosError } from 'axios'

request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data, status } = response
    
    // 根据业务状态码处理
    if (data.code === 0) {
      return data.data
    }
    
    // 业务错误
    const error = new Error(data.message || '请求失败')
    return Promise.reject(error)
  },
  async (error: AxiosError<ApiError>) => {
    const { response, config } = error
    
    // 处理不同 HTTP 状态码
    if (response) {
      switch (response.status) {
        case 401:
          // 未授权，跳转登录
          localStorage.removeItem('token')
          window.location.href = '/login'
          break
          
        case 403:
          // 无权限
          console.error('无权限访问')
          break
          
        case 404:
          console.error('请求的资源不存在')
          break
          
        case 500:
          console.error('服务器错误')
          break
          
        case 502:
        case 503:
        case 504:
          console.error('服务暂时不可用')
          break
      }
    }
    
    // 网络错误
    if (error.code === 'ERR_NETWORK') {
      console.error('网络连接失败')
    }
    
    // 请求超时
    if (error.code === 'ECONNABORTED') {
      console.error('请求超时')
    }
    
    return Promise.reject(error)
  }
)

// API 错误类型定义
interface ApiError {
  code: number
  message: string
  data?: any
}
```

---

## 三、TypeScript 类型定义

### 通用响应类型

```ts
// types/api.ts

// API 响应基础结构
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 分页响应
export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// 请求参数
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  order?: 'asc' | 'desc'
}
```

### 实体类型示例

```ts
// types/user.ts
export interface User {
  id: number
  username: string
  email: string
  avatar: string
  role: 'admin' | 'user' | 'guest'
  createdAt: string
  updatedAt: string
}

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  user: User
}

export interface RegisterParams {
  username: string
  password: string
  email: string
}
```

---

## 四、API 模块化管理

### 目录结构

```
src/
├── api/
│   ├── index.ts          # 统一导出
│   ├── user.ts           # 用户相关 API
│   ├── post.ts           # 文章相关 API
│   ├── comment.ts        # 评论相关 API
│   └── types/            # API 类型定义
│       ├── user.ts
│       ├── post.ts
│       └── index.ts
├── utils/
│   └── request.ts        # axios 实例
└── types/
    └── api.ts            # 通用类型
```

### API 模块示例

```ts
// api/user.ts
import request from '@/utils/request'
import type { 
  User, 
  LoginParams, 
  LoginResult, 
  RegisterParams,
  PaginatedResponse,
  PaginationParams 
} from './types/user'

export const userApi = {
  // 登录
  login(params: LoginParams) {
    return request.post<LoginResult>('/auth/login', params)
  },
  
  // 注册
  register(params: RegisterParams) {
    return request.post<User>('/auth/register', params)
  },
  
  // 获取用户信息
  getUserInfo(id: number) {
    return request.get<User>(`/user/${id}`)
  },
  
  // 获取用户列表
  getUsers(params?: PaginationParams) {
    return request.get<PaginatedResponse<User>>('/users', { params })
  },
  
  // 更新用户信息
  updateUser(id: number, data: Partial<User>) {
    return request.put<User>(`/user/${id}`, data)
  },
  
  // 删除用户
  deleteUser(id: number) {
    return request.delete(`/user/${id}`)
  },
  
  // 上传头像
  uploadAvatar(file: File) {
    const formData = new FormData()
    formData.append('avatar', file)
    return request.post<{ url: string }>('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}
```

```ts
// api/post.ts
import request from '@/utils/request'
import type { Post, CreatePostParams, UpdatePostParams } from './types/post'

export const postApi = {
  // 获取文章列表
  getPosts(params?: PaginationParams) {
    return request.get<PaginatedResponse<Post>>('/posts', { params })
  },
  
  // 获取文章详情
  getPost(id: number) {
    return request.get<Post>(`/posts/${id}`)
  },
  
  // 创建文章
  createPost(data: CreatePostParams) {
    return request.post<Post>('/posts', data)
  },
  
  // 更新文章
  updatePost(id: number, data: UpdatePostParams) {
    return request.put<Post>(`/posts/${id}`, data)
  },
  
  // 删除文章
  deletePost(id: number) {
    return request.delete(`/posts/${id}`)
  }
}
```

```ts
// api/index.ts
export * from './user'
export * from './post'
export * from './comment'
```

---

## 五、组合式函数封装

### 基础封装

```ts
// composables/useRequest.ts
import { ref, Ref } from 'vue'
import request from '@/utils/request'
import type { AxiosRequestConfig } from 'axios'

interface UseRequestOptions<T> extends AxiosRequestConfig {
  immediate?: boolean    // 是否立即执行
  initialData?: T        // 初始数据
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  onFinally?: () => void
}

interface UseRequestReturn<T> {
  data: Ref<T>
  error: Ref<Error | null>
  loading: Ref<boolean>
  execute: () => Promise<void>
}

export function useRequest<T = any>(
  url: string,
  options: UseRequestOptions<T> = {}
): UseRequestReturn<T> {
  const { 
    immediate = true, 
    initialData,
    onSuccess,
    onError,
    onFinally,
    ...axiosOptions 
  } = options
  
  const data = ref<T>(initialData as T) as Ref<T>
  const error = ref<Error | null>(null)
  const loading = ref(false)
  
  async function execute() {
    loading.value = true
    error.value = null
    
    try {
      const result = await request({ url, ...axiosOptions })
      data.value = result
      onSuccess?.(result)
    } catch (e) {
      error.value = e as Error
      onError?.(e as Error)
    } finally {
      loading.value = false
      onFinally?.()
    }
  }
  
  if (immediate) {
    execute()
  }
  
  return { data, error, loading, execute }
}
```

### 分页请求封装

```ts
// composables/usePagination.ts
import { ref, computed } from 'vue'
import request from '@/utils/request'
import type { PaginatedResponse, PaginationParams } from '@/types/api'

interface UsePaginationOptions<T> {
  url: string
  pageSize?: number
  immediate?: boolean
}

export function usePagination<T>(options: UsePaginationOptions<T>) {
  const { url, pageSize = 10, immediate = true } = options
  
  const list = ref<T[]>([])
  const total = ref(0)
  const page = ref(1)
  const loading = ref(false)
  const finished = ref(false)
  
  const hasMore = computed(() => list.value.length < total.value)
  
  async function fetchList(isLoadMore = false) {
    if (loading.value) return
    
    loading.value = true
    
    try {
      const params: PaginationParams = {
        page: page.value,
        pageSize
      }
      
      const result = await request.get<PaginatedResponse<T>>(url, { params })
      
      if (isLoadMore) {
        list.value = [...list.value, ...result.list]
      } else {
        list.value = result.list
      }
      
      total.value = result.total
      finished.value = list.value.length >= total.value
    } catch (error) {
      console.error('获取列表失败:', error)
    } finally {
      loading.value = false
    }
  }
  
  // 加载更多
  function loadMore() {
    if (!hasMore.value) return
    page.value++
    fetchList(true)
  }
  
  // 刷新列表
  function refresh() {
    page.value = 1
    finished.value = false
    fetchList()
  }
  
  if (immediate) {
    fetchList()
  }
  
  return {
    list,
    total,
    page,
    loading,
    finished,
    hasMore,
    fetchList,
    loadMore,
    refresh
  }
}
```

### 使用示例

```vue
<script setup lang="ts">
import { useRequest } from '@/composables/useRequest'
import { usePagination } from '@/composables/usePagination'
import { userApi } from '@/api/user'
import type { User } from '@/api/types/user'

// 基础请求
const { data: user, loading, error, execute } = useRequest<User>('/user/1', {
  onSuccess: (data) => {
    console.log('获取成功:', data)
  },
  onError: (error) => {
    console.error('获取失败:', error)
  }
})

// 分页请求
const { 
  list: users, 
  loading: loadingUsers,
  hasMore,
  loadMore, 
  refresh 
} = usePagination<User>({
  url: '/users',
  pageSize: 20
})
</script>

<template>
  <div>
    <!-- 基础请求 -->
    <div v-if="loading">加载中...</div>
    <div v-else-if="error">错误: {{ error.message }}</div>
    <div v-else>
      <button @click="execute">刷新</button>
      <pre>{{ user }}</pre>
    </div>
    
    <!-- 分页请求 -->
    <div>
      <button @click="refresh">刷新列表</button>
      <ul>
        <li v-for="item in users" :key="item.id">
          {{ item.username }}
        </li>
      </ul>
      <button 
        v-if="hasMore && !loadingUsers" 
        @click="loadMore"
      >
        加载更多
      </button>
    </div>
  </div>
</template>
```

---

## 六、高级特性

### 请求取消

```ts
// composables/useRequest.ts
import axios from 'axios'

let abortController: AbortController | null = null

export function useRequestWithCancel<T>(url: string) {
  const { data, error, loading } = useRequest<T>(url, {
    immediate: false
  })
  
  async function execute() {
    // 取消之前的请求
    if (abortController) {
      abortController.abort()
    }
    
    // 创建新的 AbortController（axios v0.22+ 推荐方式，
    // 旧版 CancelToken 已废弃）
    abortController = new AbortController()
    
    loading.value = true
    
    try {
      const result = await request({
        url,
        signal: abortController.signal
      })
      data.value = result
    } catch (e) {
      if (!axios.isCancel(e)) {
        error.value = e as Error
      }
    } finally {
      loading.value = false
    }
  }
  
  function cancel(message?: string) {
    if (abortController) {
      abortController.abort(message)
    }
  }
  
  return { data, error, loading, execute, cancel }
}
```

### 请求重试

```ts
// utils/request.ts

// 重试配置
interface RetryConfig {
  retries: number       // 重试次数
  retryDelay: number    // 重试延迟（毫秒）
  retryCondition?: (error: AxiosError) => boolean
}

// 重试拦截器
function setupRetry(instance: AxiosInstance, config: RetryConfig) {
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const { config: requestConfig, response } = error
      
      // 初始化重试计数
      requestConfig.__retryCount = requestConfig.__retryCount || 0
      
      // 判断是否需要重试
      const shouldRetry = 
        requestConfig.__retryCount < config.retries &&
        (!config.retryCondition || config.retryCondition(error))
      
      if (shouldRetry) {
        requestConfig.__retryCount++
        
        // 延迟重试
        await new Promise(resolve => 
          setTimeout(resolve, config.retryDelay)
        )
        
        // 重新发送请求
        return instance(requestConfig)
      }
      
      return Promise.reject(error)
    }
  )
}

// 使用
setupRetry(request, {
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error) => {
    // 网络错误或 5xx 错误时重试
    return !error.response || error.response.status >= 500
  }
})
```

### 请求缓存

```ts
// utils/cache.ts
interface CacheItem<T> {
  data: T
  timestamp: number
  expiry: number
}

class RequestCache {
  private cache = new Map<string, CacheItem<any>>()
  
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    // 检查是否过期
    if (Date.now() - item.timestamp > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }
  
  set<T>(key: string, data: T, expiry = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry
    })
  }
  
  clear(key?: string) {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }
}

export const requestCache = new RequestCache()

// 带缓存的请求
export async function fetchWithCache<T>(
  url: string,
  options: AxiosRequestConfig & { cacheExpiry?: number } = {}
): Promise<T> {
  const cacheKey = `${url}:${JSON.stringify(options.params)}`
  
  // 尝试从缓存获取
  const cached = requestCache.get<T>(cacheKey)
  if (cached) {
    return cached
  }
  
  // 发送请求
  const data = await request({ url, ...options })
  
  // 缓存结果
  requestCache.set(cacheKey, data, options.cacheExpiry)
  
  return data
}
```

---

## 七、文件上传与下载

### 文件上传

```ts
// utils/upload.ts

// 单文件上传
export async function uploadFile(
  url: string,
  file: File,
  options: {
    fieldName?: string
    data?: Record<string, any>
    onProgress?: (progress: number) => void
  } = {}
) {
  const { fieldName = 'file', data = {}, onProgress } = options
  
  const formData = new FormData()
  formData.append(fieldName, file)
  
  // 添加其他字段
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value)
  })
  
  const result = await request.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        onProgress(progress)
      }
    }
  })
  
  return result
}

// 多文件上传
export async function uploadFiles(
  url: string,
  files: File[],
  options: {
    fieldName?: string
    data?: Record<string, any>
    onProgress?: (fileIndex: number, progress: number) => void
  } = {}
) {
  const { fieldName = 'files', data = {}, onProgress } = options
  
  const formData = new FormData()
  
  files.forEach((file, index) => {
    formData.append(`${fieldName}[${index}]`, file)
  })
  
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value)
  })
  
  return request.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        // 这里简化处理，实际应跟踪每个文件
        onProgress(0, progress)
      }
    }
  })
}
```

### 文件下载

```ts
// utils/download.ts

// 下载文件
export async function downloadFile(
  url: string,
  filename: string,
  options: AxiosRequestConfig = {}
) {
  const response = await request.get(url, {
    ...options,
    responseType: 'blob'
  })
  
  // 创建下载链接
  const blob = new Blob([response])
  const downloadUrl = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = filename
  
  document.body.appendChild(link)
  link.click()
  
  // 清理
  document.body.removeChild(link)
  URL.revokeObjectURL(downloadUrl)
}

// 带进度条的下载
export async function downloadWithProgress(
  url: string,
  filename: string,
  onProgress?: (progress: number) => void
) {
  const response = await request.get(url, {
    responseType: 'blob',
    onDownloadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        onProgress(progress)
      }
    }
  })
  
  const blob = new Blob([response])
  const downloadUrl = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(downloadUrl)
}
```

### 使用示例

```vue
<script setup lang="ts">
import { uploadFile, downloadWithProgress } from '@/utils/upload'
import { ref } from 'vue'

const uploadProgress = ref(0)
const downloadProgress = ref(0)

// 上传文件
async function handleUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  try {
    const result = await uploadFile('/api/upload', file, {
      onProgress: (progress) => {
        uploadProgress.value = progress
      }
    })
    console.log('上传成功:', result)
  } catch (error) {
    console.error('上传失败:', error)
  }
}

// 下载文件
async function handleDownload() {
  try {
    await downloadWithProgress(
      '/api/file/report.pdf',
      'report.pdf',
      (progress) => {
        downloadProgress.value = progress
      }
    )
  } catch (error) {
    console.error('下载失败:', error)
  }
}
</script>

<template>
  <div>
    <!-- 上传 -->
    <input type="file" @change="handleUpload" />
    <div v-if="uploadProgress > 0">上传进度: {{ uploadProgress }}%</div>
    
    <!-- 下载 -->
    <button @click="handleDownload">下载文件</button>
    <div v-if="downloadProgress > 0">下载进度: {{ downloadProgress }}%</div>
  </div>
</template>
```

---

## 八、错误处理最佳实践

### 统一错误处理

```ts
// utils/error.ts

// 错误类型
export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  BUSINESS_ERROR = 'BUSINESS_ERROR'
}

// 业务错误类
export class ApiError extends Error {
  code: ErrorCode
  status?: number
  data?: any
  
  constructor(
    message: string,
    code: ErrorCode,
    status?: number,
    data?: any
  ) {
    super(message)
    this.code = code
    this.status = status
    this.data = data
  }
}

// 错误消息映射
const errorMessages: Record<ErrorCode, string> = {
  [ErrorCode.NETWORK_ERROR]: '网络连接失败，请检查网络',
  [ErrorCode.TIMEOUT]: '请求超时，请稍后重试',
  [ErrorCode.SERVER_ERROR]: '服务器错误，请稍后重试',
  [ErrorCode.UNAUTHORIZED]: '登录已过期，请重新登录',
  [ErrorCode.FORBIDDEN]: '无权限访问',
  [ErrorCode.NOT_FOUND]: '请求的资源不存在',
  [ErrorCode.BUSINESS_ERROR]: '业务错误'
}

// 获取错误消息
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return errorMessages[error.code] || error.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return '未知错误'
}
```

### 全局错误提示

```ts
// utils/request.ts
import { ElMessage } from 'element-plus'

request.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = getErrorMessage(error)
    
    // 显示错误提示
    ElMessage.error(message)
    
    return Promise.reject(error)
  }
)
```

---

## 九、完整配置示例

```ts
// utils/request.ts
import axios, { 
  AxiosInstance, 
  AxiosRequestConfig,
  InternalAxiosRequestConfig 
} from 'axios'

// 创建实例
const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 错误处理逻辑...
    return Promise.reject(error)
  }
)

// 扩展配置
declare module 'axios' {
  interface AxiosRequestConfig {
    __retryCount?: number
  }
}

export default request
```

---

## 十、常见问题

### Q1: 如何处理 CORS 跨域？

**开发环境**：配置代理

```ts
// vite.config.ts
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
}
```

**生产环境**：后端配置 CORS 头

### Q2: 如何实现 token 刷新？

```ts
let isRefreshing = false
let requestQueue: (() => void)[] = []

request.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (!isRefreshing) {
        isRefreshing = true
        
        try {
          const newToken = await refreshToken()
          localStorage.setItem('token', newToken)
          
          // 重试队列中的请求
          requestQueue.forEach(cb => cb())
          requestQueue = []
          
          // 重试当前请求
          return request(error.config)
        } catch (e) {
          // 刷新失败，跳转登录
          localStorage.removeItem('token')
          window.location.href = '/login'
        } finally {
          isRefreshing = false
        }
      } else {
        // 加入等待队列
        return new Promise((resolve) => {
          requestQueue.push(() => {
            resolve(request(error.config))
          })
        })
      }
    }
    
    return Promise.reject(error)
  }
)
```

### Q3: 如何取消所有请求？

```ts
// 存储所有请求的取消函数
const pendingRequests = new Map<string, AbortController>()

request.interceptors.request.use((config) => {
  const controller = new AbortController()
  config.signal = controller.signal
  
  const key = `${config.method}-${config.url}`
  pendingRequests.set(key, controller)
  
  return config
})

// 取消所有请求
export function cancelAllRequests() {
  pendingRequests.forEach((controller) => {
    controller.abort()
  })
  pendingRequests.clear()
}
```

---

> 以下为深度补充内容，涵盖源码分析、性能优化和生产级实践。

---

## 十一、Axios 架构与拦截器链原理

### Axios 核心架构概览

Axios 的整体设计围绕 **请求配置流转** 展开，核心流程如下：

```
AxiosRequestConfig → 请求拦截器链 → dispatchRequest → 响应拦截器链 → AxiosResponse
```

每一个请求/响应拦截器都是一个 **中间件**，它们被组织成 Promise 链来依次执行。理解这一点是深入掌握 Axios 行为的关键。

### 拦截器链简化源码实现

以下是从 Axios 源码中提炼出的拦截器链核心逻辑：

```ts
// --- 简化版 Axios 拦截器链实现 ---

interface InterceptorHandler<T> {
  fulfilled: (value: T) => T | Promise<T>
  rejected: (error: any) => any
}

type ResolvedFn<T> = (val: T) => T | Promise<T>
type RejectedFn = (error: any) => any

interface Interceptor<T> {
  resolved: ResolvedFn<T>
  rejected?: RejectedFn
}

class InterceptorManager<T> {
  private handlers: (Interceptor<T> | null)[] = []

  use(resolved: ResolvedFn<T>, rejected?: RejectedFn): number {
    this.handlers.push({ resolved, rejected })
    return this.handlers.length - 1
  }

  eject(id: number): void {
    if (this.handlers[id]) {
      this.handlers[id] = null  // 置 null 而非 splice 以保持 id 稳定
    }
  }

  clear(): void {
    this.handlers = []
  }

  forEach(fn: (interceptor: Interceptor<T>) => void): void {
    this.handlers.forEach((h) => {
      if (h !== null) fn(h)
    })
  }
}

// 请求串联——拦截器 + dispatchRequest 拼接成 Promise 链
async function buildRequestChain(
  requestInterceptors: InterceptorManager<InternalAxiosRequestConfig>,
  responseInterceptors: InterceptorManager<AxiosResponse>,
  dispatchRequest: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>
): Promise<AxiosResponse> {

  const config: InternalAxiosRequestConfig = { /* 初始配置 */ } as any

  // 初始 Promise：将原始 config 作为链的起点
  let chain: Promise<any> = Promise.resolve(config)

  // 洋葱模型：请求拦截器前插 + 响应拦截器后插
  // 源码中的核心做法：
  //   1. chain 初始 = Promise.resolve(config)
  //   2. 请求拦截器以 [fulfilled, rejected] 从头部 unshift 进链
  //   3. dispatchRequest 也作为一对 [fulfilled, undefined] 加入
  //   4. 响应拦截器以 [fulfilled, rejected] 从尾部 push 进链
  //   5. 链中的每一对都通过 .then(fulfilled, rejected) 连接

  const chainPairs: Array<[ResolvedFn<any>, RejectedFn | undefined]> = []

  // 请求拦截器按注册顺序 unshift，从而后注册的先执行
  requestInterceptors.forEach((interceptor) => {
    chainPairs.unshift([interceptor.resolved, interceptor.rejected])
  })

  // dispatchRequest 作为请求-响应分界点
  chainPairs.push([dispatchRequest, undefined])

  // 响应拦截器按注册顺序 push，从而先注册的先执行
  responseInterceptors.forEach((interceptor) => {
    chainPairs.push([interceptor.resolved, interceptor.rejected])
  })

  // 拼接 Promise 链
  for (const [resolved, rejected] of chainPairs) {
    chain = chain.then(resolved, rejected)
  }

  return chain
}
```

### 洋葱模型执行流程

假设注册了 2 个请求拦截器（R1、R2）和 2 个响应拦截器（S1、S2），最终 Promise 链如下：

```
Promise.resolve(config)       // 起点
  .then(R2.fulfilled, R2.rejected)   // 请求拦截器（unshift 导致反向）
  .then(R1.fulfilled, R1.rejected)
  .then(dispatchRequest, undefined)  // 实际发送 HTTP 请求
  .then(S1.fulfilled, S1.rejected)   // 响应拦截器（正向）
  .then(S2.fulfilled, S2.rejected)
```

**执行时序图解：**

```
     请求阶段（进入）          响应阶段（返回）
    ┌──────────────────┐    ┌──────────────────┐
    │  R2 → R1         │    │  S1 → S2         │
    │  (后注册先执行)    │    │  (先注册先执行)    │
    │         │         │    │         │         │
    │         ▼         │    │         ▼         │
    │   dispatchRequest │    │    最终 Response   │
    └──────────────────┘    └──────────────────┘
```

关键点：
1. **请求拦截器**是 unshift 进入链的，所以 **后注册的先执行**，后注册的拦截器更靠近实际请求。
2. **响应拦截器**是 push 进入链的，所以 **先注册的先执行**，先注册的拦截器更先拿到响应。
3. 任何一环抛出异常都会被后续链上的 rejected 回调捕获，如果没有被捕获则一路传播到调用方。

### 请求拦截器中的错误传播

```ts
api.interceptors.request.use(
  (config) => {
    // 场景：token 不存在但接口必须要求 token
    if (!localStorage.getItem('token')) {
      // 这里 reject 会直接短路后续所有请求拦截器
      // 直接跳到响应拦截器的 rejected 链上（如果有）或到调用方 catch
      return Promise.reject(new Error('缺少认证信息'))
    }
    config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`
    return config
  },
  (error) => Promise.reject(error)
)
```

请求拦截器中的 rejected 会在以下情况触发：
- 前一个请求拦截器的 fulfilled 返回了 `Promise.reject`
- 前一个请求拦截器的 fulfilled 抛出了同步异常

### InternalAxiosRequestConfig vs AxiosRequestConfig

这是 Axios 类型体系中容易混淆的两个类型：

```ts
// AxiosRequestConfig —— 用户侧传入的配置（外部接口）
// 来自 axios 创建实例或调用请求方法时的配置参数
interface AxiosRequestConfig {
  url?: string
  method?: Method
  baseURL?: string
  headers?: RawAxiosRequestHeaders
  params?: any
  data?: any
  timeout?: number
  signal?: AbortSignal
  responseType?: ResponseType
  // ... 更多可选字段
}

// InternalAxiosRequestConfig —— 拦截器内部流转的配置（已规范化）
// 继承自 AxiosRequestConfig，在进入请求拦截器链之前，Axios 会将
// 用户配置与默认配置合并，并填充 headers/method 等内部字段
interface InternalAxiosRequestConfig<D = any> extends AxiosRequestConfig<D> {
  headers: AxiosRequestHeaders  // headers 已规范化，不再是可选
}

// 使用建议：
// - 创建实例、调用 request.get/post 时使用 AxiosRequestConfig
// - 请求拦截器中参数类型使用 InternalAxiosRequestConfig
// - 类型扩展应声明在 InternalAxiosRequestConfig 上
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    // 自定义元数据：重试计数、请求 ID、是否走缓存
    __retryCount?: number
    __requestId?: string
    __skipCache?: boolean
  }
}
```

### 拦截器最佳实践

```ts
// 生产级拦截器组织方式

// 1. 请求拦截器——关注横切面
const authInterceptor = request.interceptors.request.use(
  attachToken,
  (err) => Promise.reject(err)
)

const logInterceptor = request.interceptors.request.use(
  (config) => {
    config.__requestId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
    return config
  }
)

// 2. 响应拦截器——分层错误处理
const dataExtractInterceptor = request.interceptors.response.use(
  (res: AxiosResponse<ApiResponse>) => {
    // 业务状态码检查——成功时提取 data
    if (res.data.code !== 0) {
      const businessError = new BusinessError(
        res.data.message,
        res.data.code,
        res.config.__requestId
      )
      return Promise.reject(businessError)
    }
    // 返回解包后的数据，后续拦截器和调用方直接拿到业务数据
    return res.data.data as any
  }
)

const httpErrorInterceptor = request.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiError>) => {
    // HTTP 层错误统一处理
    handleHttpError(error)
    return Promise.reject(error)
  }
)

// 可选：动态管理拦截器
function detachInterceptor(id: number) {
  request.interceptors.request.eject(id)
}
```

---

## 十二、高级请求模式

### 请求去重（并发请求自动合并）

当同一接口的相同参数请求并发发起时，自动合并为一个请求，共享结果：

```ts
class RequestDeduplicator {
  private pending = new Map<string, { 
    promise: Promise<any>
    subscribers: number
  }>()

  // 生成唯一请求标识
  private getKey(config: AxiosRequestConfig): string {
    const { method = 'GET', url, params, data } = config
    return `${method}:${url}:${this.stableStringify(params)}:${this.stableStringify(data)}`
  }

  private stableStringify(obj: unknown): string {
    if (obj === undefined || obj === null) return ''
    if (typeof obj === 'object') {
      // 按 key 排序保证相同内容生成相同字符串
      return JSON.stringify(obj, Object.keys(obj as object).sort())
    }
    return String(obj)
  }

  async execute<T>(config: AxiosRequestConfig, requester: () => Promise<T>): Promise<T> {
    const key = this.getKey(config)
    const existing = this.pending.get(key)

    if (existing) {
      existing.subscribers++
      // 直接返回已存在的 Promise——多个调用方 wait 同一个结果
      return existing.promise
    }

    const promise = requester().finally(() => {
      this.pending.delete(key)
    })

    this.pending.set(key, { promise, subscribers: 1 })
    return promise
  }

  get size(): number {
    return this.pending.size
  }
}

// 集成到请求拦截器
const deduplicator = new RequestDeduplicator()

request.interceptors.request.use(async (config) => {
  // 仅对 GET 请求开启去重
  if (config.method?.toUpperCase() === 'GET' && config.__deduplicate !== false) {
    // 记录原始 dispatchRequest，拦截器链中该函数由 Axios 注入
    config.__deduplicator = deduplicator
  }
  return config
})

// 包装发送逻辑（配合拦截器机制）
function enhancedRequest<T>(config: AxiosRequestConfig): Promise<T> {
  if (config.__deduplicator && config.method?.toUpperCase() === 'GET') {
    return config.__deduplicator.execute<T>(config, () => request(config))
  }
  return request(config)
}

// 类型补充分
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    __deduplicate?: boolean
    __deduplicator?: RequestDeduplicator
  }
}
```

### 请求队列管理（并发控制 + 优先级）

```ts
interface QueuedRequest<T = any> {
  id: string
  priority: number       // 数值越小优先级越高
  config: AxiosRequestConfig
  resolve: (value: T) => void
  reject: (reason?: any) => void
  timestamp: number
  controller: AbortController
}

class RequestQueue {
  private queue: QueuedRequest[] = []
  private running = 0
  private maxConcurrent: number
  private pendingByKey = new Map<string, QueuedRequest>()

  constructor(maxConcurrent = 6) {
    this.maxConcurrent = maxConcurrent
  }

  enqueue<T>(config: AxiosRequestConfig & { priority?: number }): Promise<T> {
    const controller = new AbortController()
    const mergedConfig = { ...config, signal: controller.signal }

    return new Promise<T>((resolve, reject) => {
      const item: QueuedRequest<T> = {
        id: crypto.randomUUID?.() || `${Date.now()}`,
        priority: config.priority ?? 0,
        config: mergedConfig,
        resolve,
        reject,
        timestamp: Date.now(),
        controller,
      }

      // 按优先级插入（同优先级按时间先后）
      const insertIdx = this.queue.findIndex(
        (existing) => existing.priority > item.priority
      )
      if (insertIdx === -1) {
        this.queue.push(item)
      } else {
        this.queue.splice(insertIdx, 0, item)
      }

      this.pendingByKey.set(item.id, item)
      this.flush()
    })
  }

  private flush(): void {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift()!
      this.running++
      this.pendingByKey.delete(item.id)

      request(item.config)
        .then(item.resolve, item.reject)
        .finally(() => {
          this.running--
          this.flush()
        })
    }
  }

  cancel(id: string): boolean {
    const item = this.pendingByKey.get(id)
    if (item) {
      item.controller.abort()
      this.pendingByKey.delete(id)
      this.queue = this.queue.filter((q) => q.id !== id)
      item.reject(new Error('请求已取消'))
      return true
    }
    return false
  }

  cancelAll(): void {
    this.queue.forEach((item) => {
      item.controller.abort()
      item.reject(new Error('所有请求已取消'))
    })
    this.queue = []
    this.pendingByKey.clear()
  }

  getStats() {
    return {
      pending: this.queue.length,
      running: this.running,
      maxConcurrent: this.maxConcurrent,
    }
  }
}

// 使用示例
const requestQueue = new RequestQueue(4) // 最多 4 个并发

// 高优先级请求
requestQueue.enqueue<User>({
  url: '/user/me',
  method: 'GET',
  priority: -1,  // 负数优先
})

// 低优先级请求
requestQueue.enqueue<Post[]>({
  url: '/posts',
  method: 'GET',
  priority: 10,
})
```

### 指数退避重试算法

比对现有简单的固定延迟重试，生产环境应使用指数退避 + 随机抖动（jitter）：

```ts
interface BackoffRetryConfig {
  maxRetries: number
  baseDelay: number        // 基础延迟 ms
  maxDelay: number         // 最大延迟上限 ms
  backoffMultiplier: number // 退避倍数
  jitter: boolean          // 是否启用随机抖动
  retryCondition?: (error: AxiosError) => boolean
  shouldResetTimeout?: boolean  // 每次重试是否重置超时
}

function calculateBackoff(
  retryCount: number,
  config: BackoffRetryConfig
): number {
  // 指数退避: delay = min(maxDelay, baseDelay * multiplier^retryCount)
  let delay = config.baseDelay * Math.pow(config.backoffMultiplier, retryCount)
  delay = Math.min(delay, config.maxDelay)

  if (config.jitter) {
    // 随机抖动：在 [0, delay] 范围内随机，避免"惊群效应"
    delay = Math.random() * delay
  }

  return delay
}
```

### 竞态条件处理（AbortController + useKey）

Vue 组件中最常见的竞态问题：快速切换 tab/搜索关键词导致旧请求的结果覆盖新请求。

```ts
// composables/useLatestRequest.ts
import { ref, onBeforeUnmount } from 'vue'

interface UseLatestRequestOptions<T> {
  fetcher: (signal: AbortSignal, ...args: any[]) => Promise<T>
}

export function useLatestRequest<T>() {
  let currentController: AbortController | null = null

  async function execute(
    fetcher: (signal: AbortSignal) => Promise<T>
  ): Promise<T | undefined> {
    // 取消上一个未完成的请求
    currentController?.abort()
    currentController = new AbortController()
    const { signal } = currentController

    try {
      const result = await fetcher(signal)
      // 仅当当前请求未被取消时才返回
      if (!signal.aborted) {
        return result
      }
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.name === 'AbortError') {
        // 请求被取消，静默处理
        return undefined
      }
      throw error
    }
  }

  onBeforeUnmount(() => {
    currentController?.abort()
  })

  return { execute }
}

// 实际使用——搜索防竞态
// <script setup lang="ts">
// import { ref, watch } from 'vue'
// const keyword = ref('')
// const results = ref<SearchResult[]>([])
// const { execute } = useLatestRequest()
//
// watch(keyword, async (kw) => {
//   const data = await execute(
//     (signal) =>
//       request.get<SearchResult[]>('/search', {
//         params: { q: kw },
//         signal,
//       })
//   )
//   if (data !== undefined) {
//     results.value = data
//   }
// })
// </script>
```

**useKey 模式（React/Vue 通用思路）：**

每次请求带上一个递增的 key，回调时比对 key 是否匹配：

```ts
class LatestRequestGuard {
  private latestKey: number = 0

  nextKey(): number {
    return ++this.latestKey
  }

  isLatest(key: number): boolean {
    return key === this.latestKey
  }
}

// 使用示意
const guard = new LatestRequestGuard()

async function search(keyword: string) {
  const key = guard.nextKey()
  const results = await request.get('/search', { params: { q: keyword } })
  if (guard.isLatest(key)) {
    updateUI(results)
  }
  // 如果不是 latest，丢弃结果
}
```

---

## 十三、Token 管理深度方案

### 双 Token 机制（AccessToken + RefreshToken）

AccessToken 有效期短（5-15 分钟），RefreshToken 有效期长（7-30 天）。方案设计原则：

```ts
// types/token.ts
interface TokenPair {
  accessToken: string
  refreshToken: string
  accessExpiresAt: number   // accessToken 过期时间戳
  refreshExpiresAt: number  // refreshToken 过期时间戳
}

interface TokenStorage {
  get(): TokenPair | null
  set(tokens: TokenPair): void
  clear(): void
}

// 内存 + localStorage 双层存储（防止 XSS 直接读取关键 token）
class SecureTokenStorage implements TokenStorage {
  private memoryCache: TokenPair | null = null

  get(): TokenPair | null {
    if (this.memoryCache) return this.memoryCache
    try {
      const raw = localStorage.getItem('__tokens')
      if (raw) {
        this.memoryCache = JSON.parse(raw)
        return this.memoryCache
      }
    } catch { /* ignore */ }
    return null
  }

  set(tokens: TokenPair): void {
    this.memoryCache = tokens
    try {
      localStorage.setItem('__tokens', JSON.stringify(tokens))
    } catch {
      console.warn('Token 存储失败——可能 storage 已满')
    }
  }

  clear(): void {
    this.memoryCache = null
    localStorage.removeItem('__tokens')
  }
}

const tokenStorage = new SecureTokenStorage()

function isTokenExpired(token: TokenPair): boolean {
  // 提前 60 秒视为过期，避免临界情况
  return Date.now() > token.accessExpiresAt - 60_000
}

function isRefreshTokenExpired(token: TokenPair): boolean {
  return Date.now() > token.refreshExpiresAt
}
```

### 无感刷新 Token——请求队列暂停与恢复

这是目前最优雅的方案：刷新 Token 期间挂起所有 401 请求，刷新成功后统一重放。

```ts
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null
type PendingTask = {
  resolve: (token: string) => void
  reject: (error: any) => void
}
let pendingQueue: PendingTask[] = []

async function refreshAccessToken(): Promise<string | null> {
  const tokens = tokenStorage.get()
  if (!tokens || isRefreshTokenExpired(tokens)) {
    return null
  }

  try {
    const res = await axios.post<{ accessToken: string; expiresIn: number }>(
      '/auth/refresh',
      { refreshToken: tokens.refreshToken },
      { baseURL: import.meta.env.VITE_API_URL }
    )

    const newTokens: TokenPair = {
      ...tokens,
      accessToken: res.data.accessToken,
      accessExpiresAt: Date.now() + res.data.expiresIn * 1000,
    }
    tokenStorage.set(newTokens)
    return res.data.accessToken
  } catch {
    tokenStorage.clear()
    return null
  }
}

// 核心：刷新 Token 期间的互斥与队列管理
async function getValidToken(): Promise<string> {
  const tokens = tokenStorage.get()
  if (!tokens) {
    throw new Error('未登录')
  }

  // accessToken 未过期：直接返回
  if (!isTokenExpired(tokens)) {
    return tokens.accessToken
  }

  // accessToken 过期但 refreshToken 也过期：直接登出
  if (isRefreshTokenExpired(tokens)) {
    tokenStorage.clear()
    throw new Error('登录已过期')
  }

  // 已经在刷新中：加入等待队列
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      pendingQueue.push({ resolve, reject })
    })
  }

  // 开始刷新
  isRefreshing = true
  refreshPromise = refreshAccessToken().finally(() => {
    isRefreshing = false
    refreshPromise = null
  })

  const newToken = await refreshPromise

  if (newToken) {
    // 重放所有等待的请求
    pendingQueue.forEach((task) => task.resolve(newToken))
    pendingQueue = []
    return newToken
  } else {
    // 刷新失败：拒绝所有等待的请求
    const refreshError = new Error('Token 刷新失败')
    pendingQueue.forEach((task) => task.reject(refreshError))
    pendingQueue = []
    throw refreshError
  }
}

// 拦截器集成
request.interceptors.request.use(async (config) => {
  // 跳过不需要 token 的接口
  if (config.headers?.__skipAuth) return config

  try {
    const token = await getValidToken()
    config.headers.Authorization = `Bearer ${token}`
  } catch (err) {
    // Token 获取失败，注入自定义标记供响应拦截器处理
    config.__authFailed = true
  }
  return config
})
```

### 多 Tab 同步登录状态（BroadcastChannel）

```ts
// utils/token-sync.ts

type TokenSyncAction = 'login' | 'logout' | 'refresh'
interface TokenSyncMessage {
  action: TokenSyncAction
  payload?: TokenPair
  timestamp: number
  source: string   // 来源 tab 标识
}

const TOKEN_CHANNEL = 'app_token_sync'

class TokenBroadcastSync {
  private channel: BroadcastChannel
  private onChangeCallbacks: Array<(action: TokenSyncAction, data?: TokenPair) => void> = []

  constructor() {
    this.channel = new BroadcastChannel(TOKEN_CHANNEL)
    this.channel.onmessage = (event: MessageEvent<TokenSyncMessage>) => {
      const { action, payload, source } = event.data
      // 忽略自己发出的消息
      if (source === this.sourceId) return

      switch (action) {
        case 'login':
          if (payload) {
            tokenStorage.set(payload)
          }
          break
        case 'logout':
          tokenStorage.clear()
          break
        case 'refresh':
          if (payload) {
            tokenStorage.set(payload)
          }
          break
      }

      this.onChangeCallbacks.forEach((cb) => cb(action, payload))
    }
  }

  private sourceId = `tab_${Date.now()}_${Math.random()}`

  broadcast(action: TokenSyncAction, payload?: TokenPair): void {
    this.channel.postMessage({
      action,
      payload,
      timestamp: Date.now(),
      source: this.sourceId,
    })
  }

  onTokenChange(callback: (action: TokenSyncAction, data?: TokenPair) => void): () => void {
    this.onChangeCallbacks.push(callback)
    return () => {
      this.onChangeCallbacks = this.onChangeCallbacks.filter((cb) => cb !== callback)
    }
  }

  destroy(): void {
    this.channel.close()
    this.onChangeCallbacks = []
  }
}

const tokenSync = new TokenBroadcastSync()

// 登录成功后广播
function notifyLogin(tokens: TokenPair): void {
  tokenStorage.set(tokens)
  tokenSync.broadcast('login', tokens)
}

// 登出时广播
function notifyLogout(): void {
  tokenStorage.clear()
  tokenSync.broadcast('logout')
}

// Token 刷新成功后广播（使其他 tab 同步新 token）
function notifyTokenRefresh(tokens: TokenPair): void {
  tokenSync.broadcast('refresh', tokens)
}

// Vue 中使用
import { useRouter } from 'vue-router'

export function useTokenSync() {
  const router = useRouter()

  const unsubscribe = tokenSync.onTokenChange((action) => {
    if (action === 'logout') {
      router.push('/login')
    }
  })

  onBeforeUnmount(unsubscribe)

  return { notifyLogin, notifyLogout, notifyTokenRefresh }
}
```

---

## 十四、性能优化

### 请求缓存策略——分级缓存

参考前文基础的内存缓存，此处扩展为 **Z 级缓存**（内存 → IndexedDB 持久化）：

```ts
// utils/cache/indexeddb-cache.ts

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

class IndexedDBCache {
  private dbName = 'api_cache'
  private version = 1
  private db: IDBDatabase | null = null

  async open(): Promise<void> {
    if (this.db) return
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('responses')) {
          const store = db.createObjectStore('responses', { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
      req.onsuccess = () => {
        this.db = req.result
        resolve()
      }
      req.onerror = () => reject(req.error)
    })
  }

  async get<T>(key: string): Promise<T | null> {
    await this.open()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('responses', 'readonly')
      const store = tx.objectStore('responses')
      const req = store.get(key)
      req.onsuccess = () => {
        const entry: CacheEntry<T> | undefined = req.result?.value
        if (!entry || Date.now() - entry.timestamp > entry.expiry) {
          resolve(null)
        } else {
          resolve(entry.data)
        }
      }
      req.onerror = () => reject(req.error)
    })
  }

  async set<T>(key: string, data: T, expiry: number): Promise<void> {
    await this.open()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('responses', 'readwrite')
      const store = tx.objectStore('responses')
      const req = store.put({
        key,
        value: { data, timestamp: Date.now(), expiry },
      })
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  async clear(): Promise<void> {
    await this.open()
    return new Promise((resolve) => {
      const tx = this.db!.transaction('responses', 'readwrite')
      tx.objectStore('responses').clear()
      tx.oncomplete = () => resolve()
    })
  }

  // 清理过期缓存
  async evictExpired(): Promise<number> {
    await this.open()
    return new Promise((resolve, reject) => {
      let count = 0
      const tx = this.db!.transaction('responses', 'readwrite')
      const store = tx.objectStore('responses')
      const index = store.index('timestamp')
      const range = IDBKeyRange.upperBound(Date.now())
      const req = index.openCursor(range)
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          const entry = cursor.value.value as CacheEntry<any>
          if (Date.now() - entry.timestamp > entry.expiry) {
            cursor.delete()
            count++
          }
          cursor.continue()
        }
      }
      tx.oncomplete = () => resolve(count)
      req.onerror = () => reject(req.error)
    })
  }
}

const indexedDBCache = new IndexedDBCache()

// 两级缓存管理器
class TieredCacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>()
  private memoryMaxSize = 50 // 内存缓存上限

  async get<T>(key: string): Promise<T | null> {
    // L1: 内存缓存
    const memEntry = this.memoryCache.get(key)
    if (memEntry && Date.now() - memEntry.timestamp < memEntry.expiry) {
      return memEntry.data
    }

    // L2: IndexedDB 持久化缓存
    const persisted = await indexedDBCache.get<T>(key)
    if (persisted) {
      // 回填 L1
      this.setMemory(key, persisted, 60_000) // 内存中短缓存 1 分钟
    }
    return persisted
  }

  async set<T>(key: string, data: T, expiry: number): Promise<void> {
    this.setMemory(key, data, expiry)
    await indexedDBCache.set(key, data, expiry)
  }

  private setMemory(key: string, data: any, expiry: number): void {
    // LRU-like：超出上限时删除最早的条目
    if (this.memoryCache.size >= this.memoryMaxSize) {
      const firstKey = this.memoryCache.keys().next().value
      if (firstKey) this.memoryCache.delete(firstKey)
    }
    this.memoryCache.set(key, { data, timestamp: Date.now(), expiry })
  }

  async clear(): Promise<void> {
    this.memoryCache.clear()
    await indexedDBCache.clear()
  }
}

export const tieredCache = new TieredCacheManager()

// 定期清理过期条目
if (typeof window !== 'undefined') {
  setInterval(() => indexedDBCache.evictExpired(), 5 * 60 * 1000)
}
```

### 请求合并（Request Batching）

将短时间内的多个请求合并为一个批量请求：

```ts
class RequestBatcher<TParams, TResult> {
  private queue: Array<{
    params: TParams
    resolve: (result: TResult) => void
    reject: (error: any) => void
  }> = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private delay: number
  private maxBatch: number
  private executor: (params: TParams[]) => Promise<TResult[]>

  constructor(
    executor: (params: TParams[]) => Promise<TResult[]>,
    { delay = 50, maxBatch = 20 }: { delay?: number; maxBatch?: number } = {}
  ) {
    this.executor = executor
    this.delay = delay
    this.maxBatch = maxBatch
  }

  enqueue(params: TParams): Promise<TResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({ params, resolve, reject })

      if (this.queue.length >= this.maxBatch) {
        this.flush()
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.delay)
      }
    })
  }

  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.queue.length === 0) return

    const batch = this.queue.splice(0, this.maxBatch)
    const params = batch.map((item) => item.params)

    try {
      const results = await this.executor(params)
      batch.forEach((item, index) => {
        item.resolve(results[index])
      })
    } catch (err) {
      batch.forEach((item) => item.reject(err))
    }
  }

  destroy(): void {
    if (this.timer) clearTimeout(this.timer)
    this.queue.forEach((item) => item.reject(new Error('Batcher destroyed')))
    this.queue = []
  }
}

// 使用示例：统计埋点批量上报
const analyticsBatcher = new RequestBatcher(
  (events: AnalyticsEvent[]) =>
    request.post('/analytics/batch', { events }),
  { delay: 2000, maxBatch: 50 }
)

function reportEvent(event: AnalyticsEvent): void {
  analyticsBatcher.enqueue(event).catch(console.warn)
}
```

### 大文件分片上传

完整实现，包含 MD5 秒传、分片进度、断点续传：

```ts
// utils/upload/chunk-upload.ts

interface ChunkUploadOptions {
  file: File
  chunkSize?: number       // 默认 5MB
  concurrency?: number     // 并发分片数
  onProgress?: (percent: number) => void
  onChunkComplete?: (index: number, total: number) => void
}

interface ChunkMeta {
  index: number
  start: number
  end: number
  blob: Blob
  hash: string
  uploaded: boolean
}

// 计算文件 MD5（使用 SparkMD5 或 Web Crypto）
async function computeFileHash(file: File): Promise<string> {
  const chunks = Math.ceil(file.size / (2 * 1024 * 1024))
  const spark = new (window as any).SparkMD5.ArrayBuffer()

  for (let i = 0; i < chunks; i++) {
    const start = i * 2 * 1024 * 1024
    const end = Math.min(start + 2 * 1024 * 1024, file.size)
    const chunk = file.slice(start, end)
    const buffer = await chunk.arrayBuffer()
    spark.append(buffer)
  }

  return spark.end()
}

async function uploadChunks(options: ChunkUploadOptions): Promise<{ fileId: string; url: string }> {
  const { file, chunkSize = 5 * 1024 * 1024, concurrency = 3, onProgress, onChunkComplete } = options

  // 1. 计算文件哈希（用于秒传校验）
  const fileHash = await computeFileHash(file)

  // 2. 检查服务器是否有此文件（秒传）
  const checkRes = await request.get<{ exists: boolean; fileId?: string; url?: string }>(
    '/upload/check',
    { params: { hash: fileHash } }
  )
  if (checkRes.exists && checkRes.fileId) {
    onProgress?.(100)
    return { fileId: checkRes.fileId, url: checkRes.url! }
  }

  // 3. 分片
  const totalChunks = Math.ceil(file.size / chunkSize)
  const chunks: ChunkMeta[] = Array.from({ length: totalChunks }, (_, i) => ({
    index: i,
    start: i * chunkSize,
    end: Math.min((i + 1) * chunkSize, file.size),
    blob: file.slice(i * chunkSize, Math.min((i + 1) * chunkSize, file.size)),
    hash: '',
    uploaded: false,
  }))

  // 4. 检查已上传的分片（断点续传）
  const uploadedRes = await request.get<{ uploaded: number[] }>('/upload/chunks', {
    params: { hash: fileHash },
  })
  const uploadedIndices = new Set(uploadedRes.uploaded)
  chunks.forEach((chunk) => {
    chunk.uploaded = uploadedIndices.has(chunk.index)
  })

  const remainingChunks = chunks.filter((c) => !c.uploaded)

  // 5. 并发上传分片
  let completedCount = totalChunks - remainingChunks.length

  async function uploadChunk(chunk: ChunkMeta): Promise<void> {
    const formData = new FormData()
    formData.append('chunk', chunk.blob)
    formData.append('hash', fileHash)
    formData.append('index', String(chunk.index))
    formData.append('totalChunks', String(totalChunks))
    formData.append('fileName', file.name)

    await request.post('/upload/chunk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,
    })

    chunk.uploaded = true
    completedCount++
    onChunkComplete?.(chunk.index, totalChunks)
    onProgress?.(Math.round((completedCount / totalChunks) * 90)) // 合并占 10%
  }

  // 并发控制
  const pool = new Set<Promise<void>>()
  for (const chunk of remainingChunks) {
    const promise = uploadChunk(chunk).finally(() => pool.delete(promise))
    pool.add(promise)
    if (pool.size >= concurrency) {
      await Promise.race(pool)
    }
  }
  await Promise.all(pool)

  // 6. 合并分片
  const mergeRes = await request.post<{ fileId: string; url: string }>('/upload/merge', {
    hash: fileHash,
    fileName: file.name,
    totalChunks,
  })
  onProgress?.(100)

  return mergeRes
}

export { uploadChunks, computeFileHash }
```

### 慢请求检测与上报

```ts
// utils/slow-request-detector.ts

interface SlowRequestReport {
  url: string
  method: string
  duration: number
  threshold: number
  timestamp: number
  requestId?: string
}

class SlowRequestDetector {
  private threshold: number // ms
  private reporter: (report: SlowRequestReport) => void

  constructor(
    threshold = 3000,
    reporter: (report: SlowRequestReport) => void = (r) => {
      console.warn(`[SlowRequest] ${r.method} ${r.url} took ${r.duration}ms`, r)
    }
  ) {
    this.threshold = threshold
    this.reporter = reporter
  }

  install(instance: AxiosInstance): void {
    instance.interceptors.request.use((config) => {
      config.__startTime = Date.now()
      return config
    })

    instance.interceptors.response.use(
      (response) => {
        this.check(response.config)
        return response
      },
      (error) => {
        if (error.config) this.check(error.config)
        return Promise.reject(error)
      }
    )
  }

  private check(config: InternalAxiosRequestConfig): void {
    const startTime = config.__startTime
    if (!startTime) return

    const duration = Date.now() - startTime
    if (duration > this.threshold) {
      this.reporter({
        url: config.url ?? '',
        method: config.method?.toUpperCase() ?? 'GET',
        duration,
        threshold: this.threshold,
        timestamp: Date.now(),
        requestId: config.__requestId,
      })
    }
  }
}

// 安装
const slowDetector = new SlowRequestDetector(5000, (report) => {
  // 生产环境上报到监控平台
  window.__monitor__?.logSlowRequest?.(report)
})
slowDetector.install(request)
```

---

## 十五、错误处理架构

### 错误分级处理

将错误分为四个层级，每个层级有独立的处理策略：

```ts
// utils/errors/types.ts

enum ErrorLevel {
  NETWORK = 'network',       // 网络层：超时、断网、DNS 失败
  HTTP = 'http',             // HTTP 层：4xx 5xx 状态码
  BUSINESS = 'business',     // 业务层：后端返回的 code!=0
  UNKNOWN = 'unknown',       // 未知：JSON 解析失败、非标准异常
}

interface ClassifiedError extends Error {
  level: ErrorLevel
  status?: number
  businessCode?: number
  requestId?: string
  originalError: unknown
  retryable: boolean
  userMessage: string
}

// 错误分类器
function classifyError(error: unknown): ClassifiedError {
  if (axios.isCancel(error)) {
    return {
      name: 'CanceledError',
      message: '请求已取消',
      level: ErrorLevel.NETWORK,
      originalError: error,
      retryable: false,
      userMessage: '',
    }
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>

    // 网络错误
    if (!axiosError.response) {
      return {
        name: 'NetworkError',
        message: axiosError.message,
        level: ErrorLevel.NETWORK,
        originalError: error,
        retryable: true,
        userMessage: '网络连接异常，请检查网络',
      }
    }

    // HTTP 错误
    const { status, data } = axiosError.response
    return {
      name: 'HttpError',
      message: data?.message || axiosError.message,
      level: ErrorLevel.HTTP,
      status,
      businessCode: data?.code,
      originalError: error,
      retryable: status >= 500 || status === 429,
      userMessage: getUserMessageForStatus(status, data?.message),
    }
  }

  // 未知错误
  return {
    name: 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
    level: ErrorLevel.UNKNOWN,
    originalError: error,
    retryable: false,
    userMessage: '系统异常，请稍后重试',
  }
}

function getUserMessageForStatus(status: number, serverMsg?: string): string {
  const messages: Record<number, string> = {
    400: '请求参数有误',
    401: '登录已过期，请重新登录',
    403: '没有访问权限',
    404: '请求的资源不存在',
    409: '数据冲突',
    429: '请求过于频繁，请稍后重试',
    500: '服务器内部错误',
    502: '服务暂时不可用',
    503: '服务正在维护中',
  }
  return serverMsg || messages[status] || `请求失败 (${status})`
}
```

### 错误重试策略配置化

```ts
// utils/errors/retry-strategy.ts

interface RetryRule {
  levels: ErrorLevel[]
  maxRetries: number
  backoff: BackoffRetryConfig
}

class RetryStrategy {
  private rules: RetryRule[] = [
    {
      levels: [ErrorLevel.NETWORK],
      maxRetries: 3,
      backoff: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
      },
    },
    {
      levels: [ErrorLevel.HTTP],
      maxRetries: 2,
      backoff: {
        maxRetries: 2,
        baseDelay: 2000,
        maxDelay: 8000,
        backoffMultiplier: 2,
        jitter: false,
        retryCondition: (error) => {
          const status = error.response?.status
          return !!(status && (status >= 500 || status === 429))
        },
      },
    },
    // BUSINESS / UNKNOWN 级别不重试
  ]

  getRule(error: ClassifiedError): RetryRule | undefined {
    return this.rules.find((rule) => rule.levels.includes(error.level))
  }

  shouldRetry(error: ClassifiedError, retryCount: number): boolean {
    const rule = this.getRule(error)
    if (!rule) return false
    if (retryCount >= rule.maxRetries) return false
    return true
  }

  getDelay(error: ClassifiedError, retryCount: number): number {
    const rule = this.getRule(error)
    if (!rule) return 0
    return calculateBackoff(retryCount, rule.backoff)
  }

  // 运行时覆盖
  setRules(rules: RetryRule[]): void {
    this.rules = rules
  }
}

const retryStrategy = new RetryStrategy()
```

### 错误上报与监控集成

```ts
// utils/errors/reporter.ts

interface ErrorReport {
  message: string
  level: ErrorLevel
  status?: number
  businessCode?: number
  url?: string
  method?: string
  requestId?: string
  duration?: number
  userId?: string
  pageUrl: string
  timestamp: number
}

// Sentry 集成
let sentryCaptureException: ((error: unknown, context?: Record<string, any>) => void) | null = null

try {
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    sentryCaptureException = (window as any).Sentry.captureException
  }
} catch { /* Sentry 未安装 */ }

// 自定义监控上报
function reportError(report: ErrorReport): void {
  const reportData = {
    ...report,
    userId: localStorage.getItem('userId') ?? undefined,
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
  }

  // 1. Sentry——仅上报关键错误
  if (sentryCaptureException && report.level !== ErrorLevel.UNKNOWN) {
    sentryCaptureException(new Error(report.message), {
      tags: { level: report.level, status: String(report.status ?? '') },
      extra: reportData,
    })
  }

  // 2. 自定义埋点
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(
      '/api/monitor/error',
      JSON.stringify(reportData)
    )
  }
}

// 统一错误处理入口
async function handleError(
  error: unknown,
  config?: InternalAxiosRequestConfig
): Promise<ClassifiedError> {
  const classified = classifyError(error)

  // 上报
  const report: ErrorReport = {
    message: classified.message,
    level: classified.level,
    status: classified.status,
    businessCode: classified.businessCode,
    url: config?.url,
    method: config?.method?.toUpperCase(),
    requestId: config?.__requestId,
    duration: config?.__startTime ? Date.now() - config.__startTime : undefined,
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    timestamp: Date.now(),
  }
  reportError(report)

  return classified
}
```

---

## 十六、Axios vs fetch 深度对比

### API 设计差异

| 能力 | Axios | 原生 fetch |
|------|-------|------------|
| **请求/响应拦截器** | 内置，洋葱模型，支持多个 | 不支持，需自行包装 |
| **请求取消** | AbortController（v0.22+）+ 旧版 CancelToken | AbortController |
| **上传/下载进度** | onUploadProgress / onDownloadProgress | 不支持原生进度，需 ReadableStream |
| **请求超时** | timeout 配置项 | 需自行结合 AbortController + setTimeout |
| **自动 JSON 转换** | 自动 parse/stringify | 需手动 .json() |
| **baseURL** | 内置支持 | 需自行拼接 |
| **请求参数序列化** | params 自动处理 | 需手动 URLSearchParams |
| **响应数据提取** | response.data 直接可用 | response.json() 返回 Promise |
| **CSRF 保护** | xsrfCookieName / xsrfHeaderName | 需自行实现 |
| **请求重试** | 拦截器轻松实现 | 需自行包装 |
| **浏览器兼容** | 支持 IE11+（老版本） | 现代浏览器，IE 不支持 |
| **包体积** | ~14KB gzip | 0（浏览器内置） |
| **Node.js 支持** | 原生支持 | Node 18+ 原生支持，低版本需 polyfill |

### 拦截器对比

```ts
// Axios 拦截器——开箱即用
axios.interceptors.request.use((config) => {
  config.headers.Authorization = 'Bearer xxx'
  return config
})

// fetch——需手动包装
async function fetchWithInterceptors(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // 请求"拦截器"
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${getToken()}`)
  const modifiedOptions = { ...options, headers }

  const response = await fetch(url, modifiedOptions)

  // 响应"拦截器"
  if (response.status === 401) {
    // 处理 401...
  }

  return response
}
```

### 性能对比

```ts
// 1. 包体积
// Axios: ~14KB gzip  → 新项目首屏增加 ~14KB
// fetch: 0 KB          → 零额外开销
//
// 2. 运行时性能（单次请求）
// Axios 和 fetch 都基于相同的底层 XMLHttpRequest / fetch API，
// 单次请求耗时无明显差异。Axios 的开销主要体现在：
//   - Promise 链中的拦截器遍历（纳秒级）
//   - config 合并与规范化（微秒级）
//
// 3. 高频请求场景（每页面 >50 个请求）
// 原生 fetch 可能略优，因为：
//   - 无拦截器链开销
//   - 无内部 config 合并逻辑
//   - Response 对象更轻量
//
// 4. 大文件上传/下载
// Axios 明显更优：原生不支持进度回调，需自己实现 ReadableStream
```

### 选型建议

```ts
/**
 * 使用 Axios 的场景：
 * - 需要请求/响应拦截器（Token 注入、统一错误处理）
 * - 需要上传/下载进度（文件上传、大文件下载）
 * - 需要超时控制
 * - 需要请求取消的简便 API
 * - 项目已重度依赖 Axios 生态（axios-retry 等插件）
 * - 需要支持旧浏览器（IE）
 *
 * 使用 fetch 的场景：
 * - 对包体积敏感的项目（移动端 H5、PWA）
 * - 请求逻辑简单（无复杂拦截器需求）
 * - 新项目，希望减少依赖
 * - 需要 ReadableStream 流式读取（SSE、ChatGPT 流式响应）
 * - 希望使用原生 API，避免未来迁移成本
 * - Service Worker 中（fetch 是唯一选择）
 *
 * 过渡方案——逐步迁移：
 * 使用 ky/redaxios 等轻量级 fetch 包装器，
 * 它们提供类似 Axios 的 API，但基于 fetch 实现（~2KB）
 */
import ky from 'ky'

const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_URL,
  timeout: 30_000,
  hooks: {
    beforeRequest: [
      (request) => {
        request.headers.set('Authorization', `Bearer ${getToken()}`)
      },
    ],
    afterResponse: [
      (_request, _options, response) => {
        if (response.status === 401) {
          // 处理未授权
        }
      },
    ],
  },
})
```

### fetch 的流式读取（Axios 不擅长的场景）

```ts
// fetch 处理 SSE 流式数据（如 ChatGPT 流式响应）
async function streamChat(
  prompt: string,
  onToken: (token: string) => void
): Promise<void> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  if (!response.body) throw new Error('不支持流式读取')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    // 解析 SSE 格式并回调
    const lines = chunk.split('\n').filter((line) => line.startsWith('data: '))
    for (const line of lines) {
      const data = line.slice(6)
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        onToken(parsed.content ?? '')
      } catch { /* ignore parse errors */ }
    }
  }
}

// Axios 也可处理但与 fetch 比无优势
// Axios 的 responseType: 'stream' 仅在 Node.js 中可用
```

---

## 下一步

- [UI组件库](03-UI组件库.md) - 学习主流 UI 组件库的使用与选型
