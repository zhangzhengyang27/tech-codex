---
title: Mock.js 完整指南
description: "讲解 Mock.js 的数据模板与占位符语法、接口拦截与 RESTful 匹配用法,以及白名单机制和 Vue/React 项目集成实践,并附 Faker.js 替代方案对比。"
keywords: [mock与接口测试, Mock.js]
category: 调试
tags: [Mock.js, Mock, 接口测试]
---

# Mock.js 完整指南

## 一、Mock.js概述 

### 1.1 为什么需要Mock.js?

**传统方式的痛点**:

```javascript
//  手写假数据的问题
const userList = [
  { id: 1, name: '张三', age: 25, email: 'test@example.com' }
  // 数据量不足，不够真实
];
```

**问题分析**:
-  数据量小，无法测试大量数据场景
-  数据不够真实，UI效果与预期有差距
-  手动编写耗时，维护成本高
-  无法模拟真实请求流程

**Mock.js的价值**:
-  数据生成：丰富的数据模板和占位符
-  请求拦截：拦截XHR请求，返回模拟数据
-  前后端分离：前端可独立开发，不依赖后端

---

### 1.2 Mock.js vs 其他工具

| 工具 | 类型 | 数据生成 | 请求拦截 | 维护状态 | 推荐指数 |
|------|------|----------|----------|----------|----------|
| **Mock.js** | 数据+拦截 | ✓ | ✓ | 停止更新 | 传统项目推荐 |
| **Faker.js** | 数据生成 | ✓ | ✗ | 活跃维护 | 现代项目推荐 |
| **MSW** | 请求拦截 | ✗ | ✓ | 活跃维护 | 现代项目推荐 |

**推荐策略**:
- 传统项目 → Mock.js (快速上手)
- 现代项目 → Faker.js + MSW (更活跃的生态)

---

## 二、数据生成功能 

### 2.1 安装与引入

```bash
# 安装
npm install mockjs --save-dev

# 引入
const Mock = require('mockjs');  // CommonJS
import Mock from 'mockjs';       // ES Modules
```

---

### 2.2 数据模板规范

####  基本语法

```javascript
Mock.mock({
  '属性名|生成规则': 初始值
})
```

####  常用生成规则

```javascript
const data = Mock.mock({
  // 数值范围
  'age|1-100': 1,
  'price|1-100.2-4': 1,
  
  // 数组生成
  'users|3-5': [{
    'id|+1': 1,      // 自增
    'name': '@cname'
  }],
  
  // 布尔值
  'isActive|1-3': true,  // 25%概率为true
  
  // 字符串重复
  'code|6': 'x'  // "xxxxxx"
});
```

---

### 2.3 数据占位符规范

####  中文数据

```javascript
const data = Mock.mock({
  'name': '@cname',              // 张三
  'title': '@ctitle(5, 10)',     // 5-10字标题
  'sentence': '@csentence(20)',  // 20字句子
  'province': '@province',       // 省
  'city': '@city(true)',         // 市
  'address': '@county(true)',    // 完整地址
  'email': '@email',             // 邮箱
  'phone': /^1[385][1-9]\d{8}/,  // 手机号正则
  'date': '@datetime',           // 日期时间
  'image': '@image("200x200")'   // 图片
});
```

---

### 2.4 扩展占位符

```javascript
// 自定义占位符
Mock.Random.extend({
  // 真实图片URL
  realImage() {
    const id = this.integer(1, 1000);
    return `https://picsum.photos/id/${id}/200/150`;
  },
  
  // 中国手机号
  phoneCN() {
    const prefixes = ['138', '139', '150', '186', '187', '188'];
    return this.pick(prefixes) + this.string('number', 8);
  }
});

// 使用自定义占位符
const data = Mock.mock({
  'avatar': '@realImage',
  'phone': '@phoneCN'
});
```

---

## 三、接口拦截功能 

### 3.1 Mock拦截原理

```
前端发起请求
    ↓
Mock.js拦截XHR
    ↓
匹配URL规则
    ↓
返回Mock数据
    
// Network面板不会看到真实HTTP请求!
```

---

### 3.2 Mock.mock()方法

####  基本语法

```javascript
Mock.mock(url, method, template);
```

**参数说明**:
- `url`: String | RegExp - 匹配的URL
- `method`: String - HTTP方法(get/post/put/delete)
- `template`: Object | Function - 响应数据

---

####  三种响应格式

**1. 对象模板**:

```javascript
Mock.mock('/api/user', 'get', {
  code: 200,
  data: {
    'id|1-100': 1,
    'name': '@cname'
  }
});
```

**2. 函数模板(动态响应)**:

```javascript
Mock.mock('/api/user/list', 'get', function(options) {
  const url = new URL(options.url, 'http://localhost');
  const page = url.searchParams.get('page') || 1;
  
  return Mock.mock({
    code: 200,
    data: {
      'list|10': [{
        'id|+1': (page - 1) * 10 + 1,
        'name': '@cname'
      }],
      page: parseInt(page)
    }
  });
});
```

**3. URL匹配规则**:

```javascript
// 精确匹配
Mock.mock('/api/user', 'get', {...});

// 正则匹配
Mock.mock(/\/api\/user\/\d+/, 'get', {...});

// 通配符
Mock.mock(/\/api\/.*/, 'get', {...});
```

---

### 3.3 RESTful接口支持

```javascript
// GET /api/user/:id
Mock.mock(/\/api\/user\/\d+/, 'get', (options) => {
  const id = options.url.match(/\/api\/user\/(\d+)/)[1];
  
  return {
    code: 200,
    data: {
      id: parseInt(id),
      name: Mock.Random.cname()
    }
  };
});

// DELETE /api/user/:id
Mock.mock(/\/api\/user\/\d+/, 'delete', (options) => {
  const id = options.url.match(/\/api\/user\/(\d+)/)[1];
  
  return {
    code: 200,
    message: `用户${id}删除成功`
  };
});
```

---

## 四、项目集成 

### 4.1 项目结构

```
src/
├── mock/
│   ├── index.ts          # Mock入口
│   ├── modules/          # Mock模块
│   │   ├── user.ts
│   │   └── product.ts
│   └── utils/
│       └── extend.ts     # 自定义占位符
├── api/
│   └── user.ts
└── main.ts
```

---

### 4.2 定义Mock模块

```typescript
// src/mock/modules/user.ts
import Mock from 'mockjs';

export default [
  {
    url: /\/api\/user\/list/,
    method: 'get',
    data: (options: any) => {
      const url = new URL(options.url, 'http://localhost');
      const page = parseInt(url.searchParams.get('page')) || 1;
      
      return Mock.mock({
        code: 200,
        data: {
          'list|10': [{
            'id|+1': (page - 1) * 10 + 1,
            'name': '@cname',
            'email': '@email',
            'phone': /^1[385][1-9]\d{8}/
          }],
          page
        }
      });
    }
  },
  {
    url: '/api/user/login',
    method: 'post',
    data: {
      code: 200,
      message: '登录成功',
      data: {
        'token': '@guid',
        'userName': '@cname',
        'role|1': ['admin', 'user', 'vip']
      }
    }
  }
];
```

---

### 4.3 封装Mock入口

```typescript
// src/mock/index.ts
import Mock from 'mockjs';

export interface MockItem {
  url: string | RegExp;
  method: string;
  data: any;
}

// 白名单配置(不拦截的接口)
const whiteList = [
  // { url: '/api/real-data', method: 'get' }
];

// 自动导入modules下所有模块
const modules = import.meta.glob('./modules/*.ts', { eager: true });

// 注册Mock
function registerMock(handle: MockItem | MockItem[]) {
  const mockHandler = (item: MockItem) => {
    const { url, method, data } = item;
    
    // 检查白名单
    const isInWhiteList = whiteList.some(white => {
      const urlMatch = typeof url === 'string' 
        ? white.url === url 
        : white.url instanceof RegExp && url.source === white.url.source;
      
      const methodMatch = !white.method || white.method.toLowerCase() === method.toLowerCase();
      
      return urlMatch && methodMatch;
    });
    
    if (!isInWhiteList) {
      Mock.mock(url, method.toLowerCase(), data);
      console.log(`[Mock] 注册: ${method.toUpperCase()} ${url}`);
    }
  };
  
  Array.isArray(handle) ? handle.forEach(mockHandler) : mockHandler(handle);
}

// 初始化Mock
export function setupMock() {
  // 设置响应延迟
  Mock.setup({ timeout: '200-600' });
  
  // 注册所有模块
  Object.values(modules).forEach((module: any) => {
    if (module.default) {
      registerMock(module.default);
    }
  });
  
  console.log('[Mock] Mock服务已启动');
}
```

---

### 4.4 在项目中集成

**Vue 3**:

```typescript
// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';

if (import.meta.env.DEV) {
  import('./mock').then(({ setupMock }) => {
    setupMock();
    createApp(App).mount('#app');
  });
} else {
  createApp(App).mount('#app');
}
```

**React**:

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

if (import.meta.env.DEV) {
  import('./mock').then(({ setupMock }) => {
    setupMock();
    renderApp();
  });
} else {
  renderApp();
}

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><App /></React.StrictMode>
  );
}
```

**注意**: 使用动态import确保Mock代码不会被打包到生产环境!

---

## 五、白名单机制 

### 5.1 为什么需要白名单?

**应用场景**:
- 部分接口已完成,需要调用真实后端
- Mock数据与真实接口混合使用
- 渐进式从Mock迁移到真实接口

---

### 5.2 白名单配置

```typescript
// 白名单配置
const whiteList = [
  // 精确匹配
  { url: '/api/real-data', method: 'get' },
  
  // 正则匹配
  { url: /\/api\/.*\/update/, method: 'post' },
  
  // 不指定method,匹配所有方法
  { url: '/api/health' }
];
```

---

### 5.3 白名单接口代理

**当白名单接口需要转发到真实后端时,配置Vite代理**:

```typescript
// vite.config.ts
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://real-backend.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  }
}
```

---

## 六、高级技巧 

### 6.1 响应延迟模拟

```javascript
// 全局设置
Mock.setup({
  timeout: '200-600'  // 200-600ms随机延迟
});

// 单个接口延迟
Mock.mock('/api/slow', 'get', () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ code: 200, data: '延迟响应' });
    }, 2000);
  });
});
```

---

### 6.2 模拟HTTP错误

```javascript
Mock.mock('/api/error', 'get', {
  code: 500,
  message: '服务器错误',
  data: null
});

Mock.mock('/api/not-found', 'get', {
  code: 404,
  message: '资源不存在',
  data: null
});
```

---

### 6.3 请求日志记录

```javascript
const originalMock = Mock.mock;

Mock.mock = function(url: any, method?: any, template?: any) {
  const wrappedTemplate = function(options: any) {
    console.log(`[Mock Request] ${method?.toUpperCase()} ${url}`);
    console.log('[Mock Options]', options);
    
    const result = typeof template === 'function' 
      ? template(options) 
      : template;
    
    console.log('[Mock Response]', result);
    return result;
  };
  
  return originalMock.call(this, url, method, wrappedTemplate);
};
```

---

## 七、常见问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| Mock未生效 | Mock文件未正确导入 | 检查main.ts中动态import是否执行 |
| Network面板无请求 | Mock拦截了XHR请求 | 这是正常的,Mock拦截后不会发起真实HTTP请求 |
| 生产构建包含Mock | 使用了静态import | 改用动态import: `import('./mock')` |
| Mock数据不真实 | 占位符使用不当 | 使用Faker.js或自定义占位符 |
| 白名单不生效 | 匹配逻辑错误 | 检查URL和方法是否完全一致 |

---

## 八、Faker.js替代方案 

### 8.1 为什么推荐Faker.js?

**Mock.js的问题**:
-  停止维护(最后更新2019年)
-  不支持ES Modules
-  图片生成是纯色占位图

**Faker.js的优势**:
-  活跃维护,社区活跃
-  支持40+语言
-  API极其丰富
-  支持Tree-shaking
-  生成真实图片URL

---

### 8.2 Faker.js示例

```javascript
import { faker } from '@faker-js/faker/locale/zh_CN';

const user = {
  name: faker.person.fullName(),           // 张三
  email: faker.internet.email(),           // zhang@example.com
  phone: faker.phone.number(),             // 13812345678
  avatar: faker.image.avatar(),            // 真实头像URL
  address: faker.location.streetAddress(), // 上海市浦东新区xxx路xxx号
  company: faker.company.name(),           // 某某科技有限公司
  date: faker.date.recent().toISOString()  // 近期日期
};
```

---

### 8.3 推荐组合

```
现代项目推荐方案:
├── 数据生成: Faker.js
├── 请求拦截: MSW (Mock Service Worker)
└── Mock服务: JSON Server

传统项目方案:
└── Mock.js (数据生成 + 请求拦截)
```

---

## 九、延伸学习资源

### 官方文档
- [Mock.js 文档](http://mockjs.com/)
- [Faker.js 文档](https://fakerjs.dev/)
- [MSW 文档](https://mswjs.io/)

### 练习建议
1. 使用Mock.js生成50条用户数据,包含嵌套结构
2. 在Vue3项目中集成Mock.js,实现用户CRUD
3. 配置白名单,部分接口调用真实后端
4. 尝试Faker.js + MSW方案,对比差异

---
