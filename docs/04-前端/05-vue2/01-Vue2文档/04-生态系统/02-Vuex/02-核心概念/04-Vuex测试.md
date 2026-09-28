---
title: Vuex 测试
description: "Vuex 3 测试：Mutation/Action/Getter 单元测试、@vue/test-utils 组件测试、集成测试与覆盖率配置。"
keywords: [Vue, Vuex 测试]
category: Vue
tags: [Vue]
---
# Vuex 测试

## Vuex 测试

Vuex 把状态与修改逻辑从组件中剥离出来，这让 Mutation、Action、Getter 都可以在没有 Vue 组件的情况下直接测试。

## 测试 Mutation

Mutation 是纯函数，测试起来最简单，只需验证输入和输出。

### 基本测试

```javascript
// store/modules/user/mutations.js
export default {
  SET_USER(state, user) {
    state.userInfo = user
  },
  
  SET_TOKEN(state, token) {
    state.token = token
  },
  
  CLEAR_USER(state) {
    state.userInfo = null
    state.token = null
  }
}
```

```javascript
// tests/store/modules/user/mutations.spec.js
import mutations from '@/store/modules/user/mutations'

describe('User Mutations', () => {
  let state
  
  beforeEach(() => {
    state = {
      userInfo: null,
      token: null
    }
  })
  
  describe('SET_USER', () => {
    it('应该设置用户信息', () => {
      const user = { id: 1, name: '张三' }
      mutations.SET_USER(state, user)
      
      expect(state.userInfo).toEqual(user)
    })
    
    it('应该覆盖已有的用户信息', () => {
      state.userInfo = { id: 1, name: '张三' }
      const newUser = { id: 2, name: '李四' }
      
      mutations.SET_USER(state, newUser)
      
      expect(state.userInfo).toEqual(newUser)
    })
  })
  
  describe('SET_TOKEN', () => {
    it('应该设置 token', () => {
      mutations.SET_TOKEN(state, 'abc123')
      
      expect(state.token).toBe('abc123')
    })
    
    it('应该允许设置 null 值', () => {
      state.token = 'abc123'
      
      mutations.SET_TOKEN(state, null)
      
      expect(state.token).toBeNull()
    })
  })
  
  describe('CLEAR_USER', () => {
    it('应该清除所有用户数据', () => {
      state.userInfo = { id: 1, name: '张三' }
      state.token = 'abc123'
      
      mutations.CLEAR_USER(state)
      
      expect(state.userInfo).toBeNull()
      expect(state.token).toBeNull()
    })
  })
})
```

### 使用常量测试

```javascript
// store/mutation-types.js
export const INCREMENT = 'INCREMENT'
export const SET_COUNT = 'SET_COUNT'

// store/mutations.js
import * as types from './mutation-types'

export default {
  [types.INCREMENT](state) {
    state.count++
  },
  
  [types.SET_COUNT](state,%20count) {
    state.count = count
  }
}
```

```javascript
// tests/store/mutations.spec.js
import mutations from '@/store/mutations'
import * as types from '@/store/mutation-types'

describe('Counter Mutations', () => {
  it('INCREMENT 应该增加计数', () => {
    const state = { count: 0 }
    
    mutations[types.INCREMENT](state)
    
    expect(state.count).toBe(1)
  })
  
  it('SET_COUNT 应该设置指定值', () => {
    const state = { count: 0 }
    
    mutations[types.SET_COUNT](state,%2010)
    
    expect(state.count).toBe(10)
  })
})
```

## 测试 Action

Action 测试需要处理异步操作，通常需要模拟 API 调用。

### 基本测试

```javascript
// store/modules/user/actions.js
import api from '@/api/user'
import * as types from '../mutation-types'

export default {
  async login({ commit }, credentials) {
    const response = await api.login(credentials)
    commit(types.SET_TOKEN, response.token)
    commit(types.SET_USER, response.user)
    return response
  },
  
  async logout({ commit }) {
    await api.logout()
    commit(types.CLEAR_USER)
  },
  
  async fetchUser({ commit, state }) {
    if (!state.token) {
      throw new Error('未登录')
    }
    
    const user = await api.getUserInfo()
    commit(types.SET_USER, user)
    return user
  }
}
```

```javascript
// tests/store/modules/user/actions.spec.js
import actions from '@/store/modules/user/actions'
import api from '@/api/user'
import * as types from '@/store/mutation-types'

// 模拟 API
jest.mock('@/api/user')

describe('User Actions', () => {
  let commit
  let state
  
  beforeEach(() => {
    commit = jest.fn()
    state = { token: 'test-token', userInfo: null }
    jest.clearAllMocks()
  })
  
  describe('login', () => {
    it('登录成功应该提交 token 和用户信息', async () => {
      const mockResponse = {
        token: 'new-token',
        user: { id: 1, name: '张三' }
      }
      api.login.mockResolvedValue(mockResponse)
      
      const result = await actions.login({ commit }, { username: 'test', password: '123' })
      
      expect(commit).toHaveBeenCalledWith(types.SET_TOKEN, 'new-token')
      expect(commit).toHaveBeenCalledWith(types.SET_USER, { id: 1, name: '张三' })
      expect(result).toEqual(mockResponse)
    })
    
    it('登录失败应该抛出错误', async () => {
      const error = new Error('用户名或密码错误')
      api.login.mockRejectedValue(error)
      
      await expect(
        actions.login({ commit }, { username: 'test', password: 'wrong' })
      ).rejects.toThrow('用户名或密码错误')
      
      expect(commit).not.toHaveBeenCalled()
    })
  })
  
  describe('logout', () => {
    it('登出应该清除用户数据', async () => {
      await actions.logout({ commit })
      
      expect(api.logout).toHaveBeenCalled()
      expect(commit).toHaveBeenCalledWith(types.CLEAR_USER)
    })
  })
  
  describe('fetchUser', () => {
    it('有 token 时应该获取用户信息', async () => {
      const mockUser = { id: 1, name: '张三' }
      api.getUserInfo.mockResolvedValue(mockUser)
      
      const result = await actions.fetchUser({ commit, state })
      
      expect(commit).toHaveBeenCalledWith(types.SET_USER, mockUser)
      expect(result).toEqual(mockUser)
    })
    
    it('没有 token 时应该抛出错误', async () => {
      state.token = null
      
      await expect(actions.fetchUser({ commit, state })).rejects.toThrow('未登录')
      
      expect(api.getUserInfo).not.toHaveBeenCalled()
    })
  })
})
```

### 测试异步 Action

```javascript
// store/modules/products/actions.js
import api from '@/api/products'

export default {
  async fetchProducts({ commit }) {
    commit('SET_LOADING', true)
    try {
      const products = await api.getProducts()
      commit('SET_PRODUCTS', products)
      return products
    } catch (error) {
      commit('SET_ERROR', error.message)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  async updateProduct({ commit, dispatch }, { id, data }) {
    commit('SET_LOADING', true)
    try {
      const product = await api.updateProduct(id, data)
      commit('UPDATE_PRODUCT', product)
      await dispatch('fetchProducts')
      return product
    } finally {
      commit('SET_LOADING', false)
    }
  }
}
```

```javascript
// tests/store/modules/products/actions.spec.js
import actions from '@/store/modules/products/actions'
import api from '@/api/products'

jest.mock('@/api/products')

describe('Products Actions', () => {
  let commit
  let dispatch
  
  beforeEach(() => {
    commit = jest.fn()
    dispatch = jest.fn().mockResolvedValue([])
    jest.clearAllMocks()
  })
  
  describe('fetchProducts', () => {
    it('成功获取商品列表', async () => {
      const mockProducts = [
        { id: 1, name: '商品1' },
        { id: 2, name: '商品2' }
      ]
      api.getProducts.mockResolvedValue(mockProducts)
      
      const result = await actions.fetchProducts({ commit })
      
      expect(commit).toHaveBeenCalledWith('SET_LOADING', true)
      expect(commit).toHaveBeenCalledWith('SET_PRODUCTS', mockProducts)
      expect(commit).toHaveBeenCalledWith('SET_LOADING', false)
      expect(result).toEqual(mockProducts)
    })
    
    it('获取失败应该设置错误', async () => {
      const error = new Error('网络错误')
      api.getProducts.mockRejectedValue(error)
      
      await expect(actions.fetchProducts({ commit })).rejects.toThrow('网络错误')
      
      expect(commit).toHaveBeenCalledWith('SET_LOADING', true)
      expect(commit).toHaveBeenCalledWith('SET_ERROR', '网络错误')
      expect(commit).toHaveBeenCalledWith('SET_LOADING', false)
    })
  })
  
  describe('updateProduct', () => {
    it('更新商品后应该刷新列表', async () => {
      const mockProduct = { id: 1, name: '更新后的商品' }
      api.updateProduct.mockResolvedValue(mockProduct)
      
      const result = await actions.updateProduct(
        { commit, dispatch },
        { id: 1, data: { name: '更新后的商品' } }
      )
      
      expect(commit).toHaveBeenCalledWith('SET_LOADING', true)
      expect(commit).toHaveBeenCalledWith('UPDATE_PRODUCT', mockProduct)
      expect(dispatch).toHaveBeenCalledWith('fetchProducts')
      expect(commit).toHaveBeenCalledWith('SET_LOADING', false)
      expect(result).toEqual(mockProduct)
    })
  })
})
```

## 测试 Getter

Getter 是纯函数，测试方式与 Mutation 类似。

### 基本测试

```javascript
// store/modules/cart/getters.js
export default {
  cartProducts: state => state.items,
  
  cartTotalPrice: (state, getters) => {
    return getters.cartProducts.reduce((total, item) => {
      return total + item.price * item.quantity
    }, 0)
  },
  
  cartItemCount: state => {
    return state.items.reduce((count, item) => count + item.quantity, 0)
  },
  
  hasItems: state => state.items.length > 0
}
```

```javascript
// tests/store/modules/cart/getters.spec.js
import getters from '@/store/modules/cart/getters'

describe('Cart Getters', () => {
  let state
  
  beforeEach(() => {
    state = {
      items: [
        { id: 1, title: '商品1', price: 100, quantity: 2 },
        { id: 2, title: '商品2', price: 200, quantity: 1 }
      ]
    }
  })
  
  describe('cartProducts', () => {
    it('应该返回购物车商品列表', () => {
      const result = getters.cartProducts(state)
      
      expect(result).toEqual(state.items)
    })
  })
  
  describe('cartTotalPrice', () => {
    it('应该计算购物车总价', () => {
      const cartProducts = getters.cartProducts(state)
      const result = getters.cartTotalPrice(state, { cartProducts })
      
      // 100 * 2 + 200 * 1 = 400
      expect(result).toBe(400)
    })
    
    it('空购物车总价应为 0', () => {
      state.items = []
      const cartProducts = getters.cartProducts(state)
      
      expect(getters.cartTotalPrice(state, { cartProducts })).toBe(0)
    })
  })
  
  describe('cartItemCount', () => {
    it('应该计算商品总数量', () => {
      expect(getters.cartItemCount(state)).toBe(3)
    })
  })
  
  describe('hasItems', () => {
    it('有商品时应该返回 true', () => {
      expect(getters.hasItems(state)).toBe(true)
    })
    
    it('无商品时应该返回 false', () => {
      state.items = []
      
      expect(getters.hasItems(state)).toBe(false)
    })
  })
})
```

### 测试依赖其他 Getter 的 Getter

```javascript
// store/modules/products/getters.js
export default {
  allProducts: state => state.products,
  
  productById: state => id => {
    return state.products.find(p => p.id === id)
  },
  
  availableProducts: state => {
    return state.products.filter(p => p.inventory > 0)
  },
  
  productIsAvailable: (state, getters) => id => {
    const product = getters.productById(id)
    return product ? product.inventory > 0 : false
  }
}
```

```javascript
// tests/store/modules/products/getters.spec.js
import getters from '@/store/modules/products/getters'

describe('Products Getters', () => {
  let state
  
  beforeEach(() => {
    state = {
      products: [
        { id: 1, name: '商品1', inventory: 10 },
        { id: 2, name: '商品2', inventory: 0 },
        { id: 3, name: '商品3', inventory: 5 }
      ]
    }
  })
  
  describe('productById', () => {
    it('应该根据 ID 返回商品', () => {
      const result = getters.productById(state)(1)
      
      expect(result).toEqual({ id: 1, name: '商品1', inventory: 10 })
    })
    
    it('找不到商品应该返回 undefined', () => {
      const result = getters.productById(state)(999)
      
      expect(result).toBeUndefined()
    })
  })
  
  describe('availableProducts', () => {
    it('应该只返回有库存的商品', () => {
      const result = getters.availableProducts(state)
      
      expect(result).toHaveLength(2)
      expect(result).toEqual([
        { id: 1, name: '商品1', inventory: 10 },
        { id: 3, name: '商品3', inventory: 5 }
      ])
    })
  })
  
  describe('productIsAvailable', () => {
    it('有库存的商品应该返回 true', () => {
      const mockGetters = {
        productById: getters.productById(state)
      }
      
      expect(getters.productIsAvailable(state, mockGetters)(1)).toBe(true)
    })
    
    it('无库存的商品应该返回 false', () => {
      const mockGetters = {
        productById: getters.productById(state)
      }
      
      expect(getters.productIsAvailable(state, mockGetters)(2)).toBe(false)
    })
    
    it('不存在的商品应该返回 false', () => {
      const mockGetters = {
        productById: getters.productById(state)
      }
      
      expect(getters.productIsAvailable(state, mockGetters)(999)).toBe(false)
    })
  })
})
```

## 测试组件中的 Vuex

### 使用 createLocalVue 和 Vuex

```javascript
// tests/components/UserProfile.spec.js
import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import UserProfile from '@/components/UserProfile.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

describe('UserProfile.vue', () => {
  let store
  let actions
  let state
  let getters
  
  beforeEach(() => {
    state = {
      userInfo: { id: 1, name: '张三', email: 'test@example.com' }
    }
    
    getters = {
      isLoggedIn: () => true,
      userName: () => '张三'
    }
    
    actions = {
      fetchUser: jest.fn(),
      updateUser: jest.fn()
    }
    
    store = new Vuex.Store({
      modules: {
        user: {
          namespaced: true,
          state,
          getters,
          actions
        }
      }
    })
  })
  
  it('应该显示用户名', () => {
    const wrapper = shallowMount(UserProfile, {
      store,
      localVue
    })
    
    expect(wrapper.find('.user-name').text()).toBe('张三')
  })
  
  it('点击编辑按钮应该触发编辑模式', async () => {
    const wrapper = shallowMount(UserProfile, {
      store,
      localVue
    })
    
    await wrapper.find('.edit-btn').trigger('click')
    
    expect(wrapper.vm.isEditing).toBe(true)
  })
  
  it('保存时应该调用 updateUser action', async () => {
    const wrapper = shallowMount(UserProfile, {
      store,
      localVue
    })
    
    wrapper.setData({ isEditing: true })
    await wrapper.find('.save-btn').trigger('click')
    
    expect(actions.updateUser).toHaveBeenCalled()
  })
})
```

### 测试 mapState 和 mapGetters

```vue
<!-- components/CartSummary.vue -->
<template>
  <div class="cart-summary">
    <p>商品数量: {{ itemCount }}</p>
    <p>总价: ¥{{ totalPrice }}</p>
    <button @click="checkout" :disabled="!hasItems">结算</button>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  computed: {
    ...mapGetters('cart', ['cartItemCount', 'cartTotalPrice', 'hasItems']),
    itemCount() {
      return this.cartItemCount
    },
    totalPrice() {
      return this.cartTotalPrice.toFixed(2)
    }
  },
  methods: {
    ...mapActions('cart', ['checkout'])
  }
}
</script>
```

```javascript
// tests/components/CartSummary.spec.js
import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import CartSummary from '@/components/CartSummary.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

describe('CartSummary.vue', () => {
  let store
  let getters
  let actions
  
  const createWrapper = (customGetters = {}) => {
    const defaultGetters = {
      cartItemCount: () => 0,
      cartTotalPrice: () => 0,
      hasItems: () => false,
      ...customGetters
    }
    
    store = new Vuex.Store({
      modules: {
        cart: {
          namespaced: true,
          getters: defaultGetters,
          actions
        }
      }
    })
    
    return shallowMount(CartSummary, {
      store,
      localVue
    })
  }
  
  beforeEach(() => {
    actions = {
      checkout: jest.fn()
    }
  })
  
  it('应该显示商品数量', () => {
    const wrapper = createWrapper({
      cartItemCount: () => 5
    })
    
    expect(wrapper.find('.cart-summary p:first-child').text()).toBe('商品数量: 5')
  })
  
  it('应该显示总价', () => {
    const wrapper = createWrapper({
      cartTotalPrice: () => 199.99
    })
    
    expect(wrapper.find('.cart-summary p:nth-child(2)').text()).toBe('总价: ¥199.99')
  })
  
  it('购物车为空时结算按钮应该禁用', () => {
    const wrapper = createWrapper({
      hasItems: () => false
    })
    
    expect(wrapper.find('button').attributes('disabled')).toBe('disabled')
  })
  
  it('购物车有商品时结算按钮应该可用', () => {
    const wrapper = createWrapper({
      hasItems: () => true
    })
    
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })
  
  it('点击结算按钮应该调用 checkout action', async () => {
    const wrapper = createWrapper({
      hasItems: () => true
    })
    
    await wrapper.find('button').trigger('click')
    
    expect(actions.checkout).toHaveBeenCalled()
  })
})
```

### 测试组件中的 dispatch 和 commit

```vue
<!-- components/ProductList.vue -->
<template>
  <div class="product-list">
    <div v-for="product in products" :key="product.id" class="product-item">
      <span>{{ product.name }}</span>
      <button @click="addToCart(product)">加入购物车</button>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  computed: {
    ...mapState('products', ['products'])
  },
  methods: {
    addToCart(product) {
      this.$store.dispatch('cart/addProduct', product)
    }
  }
}
</script>
```

```javascript
// tests/components/ProductList.spec.js
import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuex from 'vuex'
import ProductList from '@/components/ProductList.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

describe('ProductList.vue', () => {
  let store
  let state
  let dispatch
  
  beforeEach(() => {
    dispatch = jest.fn()
    
    state = {
      products: [
        { id: 1, name: '商品1', price: 100 },
        { id: 2, name: '商品2', price: 200 }
      ]
    }
    
    store = new Vuex.Store({
      modules: {
        products: {
          namespaced: true,
          state
        },
        cart: {
          namespaced: true,
          actions: {
            addProduct: jest.fn()
          }
        }
      }
    })
    store.dispatch = dispatch
  })
  
  it('应该渲染商品列表', () => {
    const wrapper = shallowMount(ProductList, {
      store,
      localVue
    })
    
    const items = wrapper.findAll('.product-item')
    expect(items.length).toBe(2)
    expect(items.at(0).find('span').text()).toBe('商品1')
  })
  
  it('点击加入购物车应该 dispatch action', async () => {
    const wrapper = shallowMount(ProductList, {
      store,
      localVue
    })
    
    const product = { id: 1, name: '商品1', price: 100 }
    await wrapper.findAll('.product-item button').at(0).trigger('click')
    
    expect(dispatch).toHaveBeenCalledWith('cart/addProduct', product)
  })
})
```

## 测试完整的 Store

### 集成测试

```javascript
// tests/store/integration.spec.js
import Vuex from 'vuex'
import { createLocalVue } from '@vue/test-utils'
import userModule from '@/store/modules/user'
import api from '@/api/user'

jest.mock('@/api/user')

const localVue = createLocalVue()
localVue.use(Vuex)

describe('User Store Integration', () => {
  let store
  
  beforeEach(() => {
    store = new Vuex.Store({
      modules: {
        user: {
          ...userModule,
          state: {
            userInfo: null,
            token: null
          }
        }
      }
    })
    jest.clearAllMocks()
  })
  
  describe('登录流程', () => {
    it('完整的登录流程', async () => {
      const mockResponse = {
        token: 'test-token',
        user: { id: 1, name: '张三' }
      }
      api.login.mockResolvedValue(mockResponse)
      
      // 初始状态
      expect(store.state.user.userInfo).toBeNull()
      expect(store.state.user.token).toBeNull()
      expect(store.getters['user/isLoggedIn']).toBe(false)
      
      // 执行登录
      await store.dispatch('user/login', { username: 'test', password: '123' })
      
      // 验证状态变化
      expect(store.state.user.userInfo).toEqual(mockResponse.user)
      expect(store.state.user.token).toBe('test-token')
      expect(store.getters['user/isLoggedIn']).toBe(true)
      expect(store.getters['user/userName']).toBe('张三')
    })
    
    it('登出流程', async () => {
      // 先登录
      store.state.user.userInfo = { id: 1, name: '张三' }
      store.state.user.token = 'test-token'
      
      api.logout.mockResolvedValue()
      
      await store.dispatch('user/logout')
      
      expect(store.state.user.userInfo).toBeNull()
      expect(store.state.user.token).toBeNull()
      expect(store.getters['user/isLoggedIn']).toBe(false)
    })
  })
})
```

## 最佳实践

### 1. 测试文件组织

```
tests/
├── unit/
│   ├── store/
│   │   ├── modules/
│   │   │   ├── user/
│   │   │   │   ├── mutations.spec.js
│   │   │   │   ├── actions.spec.js
│   │   │   │   └── getters.spec.js
│   │   │   └── cart/
│   │   │       └── ...
│   │   └── integration.spec.js
│   └── components/
│       └── UserProfile.spec.js
└── setup.js
```

### 2. 测试辅助函数

```javascript
// tests/helpers/store.js
import { createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'

const localVue = createLocalVue()
localVue.use(Vuex)

export function createTestStore(options = {}) {
  return new Vuex.Store({
    strict: false,
    ...options
  })
}

export function createTestModule(moduleDef, initialState = {}) {
  return {
    ...moduleDef,
    state: {
      ...moduleDef.state,
      ...initialState
    }
  }
}

export function mockAction(commit, payload) {
  return {
    commit,
    dispatch: jest.fn(),
    state: {},
    getters: {},
    rootState: {},
    rootGetters: {}
  }
}
```

### 3. 使用测试工厂函数

```javascript
// tests/factories/user.js
export function createUser(overrides = {}) {
  return {
    id: 1,
    name: '测试用户',
    email: 'test@example.com',
    ...overrides
  }
}

export function createState(overrides = {}) {
  return {
    userInfo: null,
    token: null,
    loading: false,
    error: null,
    ...overrides
  }
}
```

```javascript
// tests/store/modules/user/actions.spec.js
import { createUser, createState } from '../../factories/user'

describe('User Actions', () => {
  it('应该设置用户信息', async () => {
    const state = createState()
    const user = createUser({ name: '自定义名称' })
    
    // ...
  })
})
```

### 4. 模拟 API 响应

```javascript
// tests/__mocks__/api/user.js
const mockUsers = [
  { id: 1, name: '张三', email: 'zhangsan@example.com' },
  { id: 2, name: '李四', email: 'lisi@example.com' }
]

export default {
  login: jest.fn((credentials) => {
    if (credentials.username === 'error') {
      return Promise.reject(new Error('登录失败'))
    }
    return Promise.resolve({
      token: 'mock-token',
      user: mockUsers[0]
    })
  }),
  
  logout: jest.fn(() => Promise.resolve()),
  
  getUserInfo: jest.fn(() => Promise.resolve(mockUsers[0]))
}
```

### 5. 测试覆盖率配置

```javascript
// jest.config.js
module.exports = {
  // ...
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

### 6. 测试命名规范

```javascript
describe('模块/功能名称', () => {
  describe('方法/功能点', () => {
    it('应该 [期望的行为]', () => {
      // 测试代码
    })
    
    it('当 [条件] 时应该 [期望的行为]', () => {
      // 测试代码
    })
    
    it('应该抛出 [错误] 当 [条件]', () => {
      // 测试代码
    })
  })
})
```

## 常见问题

### Q: 如何测试严格模式下的 Store？

```javascript
// 测试时禁用严格模式
const store = new Vuex.Store({
  ...storeConfig,
  strict: false  // 测试环境禁用
})
```

### Q: 如何测试插件？

```javascript
// tests/store/plugins/persist.spec.js
import createPersistPlugin from '@/store/plugins/persist'

describe('Persist Plugin', () => {
  let store
  let plugin
  let localStorageMock
  
  beforeEach(() => {
    localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn()
    }
    global.localStorage = localStorageMock
    
    plugin = createPersistPlugin()
    store = new Vuex.Store({
      state: { user: { name: 'test' } },
      mutations: {
        setUserName(state, name) {
          state.user.name = name
        }
      },
      plugins: [plugin]
    })
  })
  
  it('应该在状态变化时保存到 localStorage', () => {
    store.commit('setUserName', 'new-name')
    
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })
})
```

### Q: 如何测试模块间的交互？

```javascript
describe('模块间交互', () => {
  let store
  
  beforeEach(() => {
    store = new Vuex.Store({
      modules: {
        user: userModule,
        cart: cartModule
      }
    })
  })
  
  it('添加商品到购物车应该检查登录状态', async () => {
    // 未登录状态
    await expect(
      store.dispatch('cart/addProduct', { id: 1 })
    ).rejects.toThrow('请先登录')
    
    // 登录
    store.commit('user/SET_TOKEN', 'test-token')
    
    // 现在应该可以添加
    await store.dispatch('cart/addProduct', { id: 1 })
    expect(store.state.cart.items).toHaveLength(1)
  })
})
```

## 下一步

- [1-Vuex概述](../01-Vuex概述.md) - 回顾 Vuex 的核心概念和设计思想
- [4-模块化](../04-模块化.md) - 学习 Vuex 模块化管理大型应用状态
