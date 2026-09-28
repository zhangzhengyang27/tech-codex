---
title: useList 通用列表封装
description: 面向管理后台增删改查场景，封装通用列表组合式函数：分页、筛选、加载态、导出与数据转换
keywords: [useList, 组合式函数, 列表封装, 分页, Element Plus]
category: Vue
tags: [Vue, 组合式函数, 实战, TypeScript]
---

# useList 通用列表封装

开发管理后台时会遇到大量增删改查页面，这些页面的逻辑高度雷同——获取列表数据、分页、筛选。真正不同的只是呈现出来的数据项和操作按钮。

把共性部分抽成一个通用的 `useList`，就能覆盖大多数列表页面。本篇给出一个可直接落地的完整实现。

## 设计目标

一个通用列表 hook 至少要处理这几件事：

| 能力 | 说明 |
| --- | --- |
| 分页 | 维护 `curPage` / `pageSize` / `total`，变化时自动重新请求 |
| 筛选 | 持有筛选条件对象，提供一键重置 |
| 加载态 | 请求期间暴露 `loading` 供表格使用 |
| 数据转换 | 不同接口返回结构不一致，需要一个 `transformFn` 兜底 |
| 导出 | 可选的导出能力，复用当前筛选条件 |
| 时机控制 | 支持 `immediate` 决定是否挂载即请求 |

## 类型定义

先约定接口返回结构与配置项类型。`OptionsType` 中所有字段均为可选，保证最简用法只需传一个请求函数。

```typescript
// types.ts
import { Ref } from 'vue';

// Api 接口类型
export interface ResponseDataType<T = any> {
  data: T;
  meta: { total: number };
}

export interface ExportLinkType {
  link: string;
}

export interface MessageType {
  GET_DATA_IF_FAILED?: string;
  GET_DATA_IF_SUCCEED?: string;
  EXPORT_DATA_IF_FAILED?: string;
  EXPORT_DATA_IF_SUCCEED?: string;
}

export interface ListReturn<T = any> {
  data: T[];
  total: number;
}

export interface OptionsType<T = any> {
  requestError?: () => void;
  requestSuccess?: () => void;
  exportError?: () => void;
  exportSuccess?: () => void;
  filterOption?: Ref<T>;
  transformFn?: (...args: any[]) => ListReturn;
  exportRequestFn?: (...args: any) => Promise<ResponseDataType<ExportLinkType>>;
  message?: MessageType;
  preRequest?: (...args: any[]) => void;
  immediate?: boolean;
}
```

## 消息提示封装

基于 Element Plus 封装一层 message，避免在 hook 内部散落 UI 库调用，也方便后续替换组件库。

```typescript
// message.ts
import { ElMessage, MessageOptions } from 'element-plus';

export function message(message: string, option?: MessageOptions) {
  ElMessage({ message, ...option });
}

export function warningMessage(message: string, option?: MessageOptions) {
  ElMessage({ message, ...option, type: 'warning' });
}

export function errorMessage(message: string, option?: MessageOptions) {
  ElMessage({ message, ...option, type: 'error' });
}

export function infoMessage(message: string, option?: MessageOptions) {
  ElMessage({ message, ...option, type: 'info' });
}
```

## useList 实现

```typescript
import { onMounted, ref, unref, watch } from 'vue';
import { errorMessage } from '../message';
import { MessageType, OptionsType, ResponseDataType } from './types';

const DEFAULT_MESSAGE: MessageType = {
  GET_DATA_IF_FAILED: '获取列表数据失败',
  EXPORT_DATA_IF_FAILED: '导出数据失败',
};

export default function useList<
  T extends (...args: any) => Promise<ResponseDataType<any>>
>(listRequestFn: T, options: OptionsType = {}) {
  const {
    immediate = true,
    preRequest,
    message = DEFAULT_MESSAGE,
    filterOption = ref(),      // 对应列表中的筛选条件字段
    exportRequestFn = undefined, // 导出函数
    transformFn = undefined,
  } = options;

  const { GET_DATA_IF_FAILED, EXPORT_DATA_IF_FAILED } = message;

  const loading = ref(false);  // 加载态
  const curPage = ref(1);      // 当前页
  const total = ref(0);        // 总数量
  const pageSize = ref(10);    // 分页大小
  const list = ref<Awaited<ReturnType<typeof listRequestFn>>['data']>([]);

  // 获取数据，page 可选，默认取 curPage 当前值
  const loadData = (page = curPage.value, size = pageSize.value) => {
    // 兼容 page 可能是 event 对象的情况（如直接绑定到分页组件事件）
    const requestPage = typeof page === 'object' ? unref(curPage) : page;

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      loading.value = true;
      try {
        preRequest?.();
        const result = await listRequestFn(size, requestPage, filterOption.value);
        const transformResult = transformFn ? transformFn(result) : result;
        const { data } = transformResult;

        // 兼容 meta.total 与 total 两种总数字段位置
        let count = 0;
        if ('meta' in transformResult && transformResult?.meta?.total) {
          count = transformResult.meta.total;
        }
        if ('total' in transformResult && transformResult.total) {
          count = transformResult.total;
        }

        list.value = data;
        total.value = count;
        options?.requestSuccess?.();
        resolve({ list: data, total: count });
      } catch (error) {
        if (GET_DATA_IF_FAILED) {
          errorMessage(GET_DATA_IF_FAILED);
        }
        options?.requestError?.();
      } finally {
        loading.value = false;
      }
    });
  };

  // 清空筛选条件并重新加载
  const reset = () => {
    if (!filterOption.value) return;
    const keys = Reflect.ownKeys(filterOption.value);
    keys.forEach((key) => {
      Reflect.set(filterOption.value, key, undefined);
    });
    loadData();
  };

  // 导出：复用当前筛选条件
  const exportFile = async () => {
    if (!exportRequestFn && typeof exportRequestFn !== 'function') {
      throw new Error('当前没有提供 exportRequest 函数');
    }
    try {
      const { data: { link } } = await exportRequestFn(filterOption.value);
      window.open(link);
      options?.exportSuccess?.();
    } catch (error) {
      if (EXPORT_DATA_IF_FAILED) {
        errorMessage(EXPORT_DATA_IF_FAILED);
      }
      options?.exportError?.();
    }
  };

  // 分页变化时自动重新请求
  watch([curPage, pageSize], () => {
    loadData(curPage.value);
  });

  onMounted(() => {
    if (immediate) {
      loadData(curPage.value);
    }
  });

  return {
    loading,
    curPage,
    total,
    list,
    filterOption,
    reset,
    pageSize,
    exportFile,
    loadData,
  };
}
```

### 几个实现细节

**`typeof page === 'object'` 的兼容处理**：分页组件的事件回调可能直接把 event 对象传进来，此时应回退到 `curPage` 的当前值，否则会请求到错误的页码。

**总数字段的双重兼容**：后端返回结构常见 `meta.total` 和顶层 `total` 两种，都做了读取，避免为此单独写 `transformFn`。

**`reset` 用 `Reflect.ownKeys` 遍历**：直接把 `filterOption.value` 替换成新对象会断开响应式引用（如果外部还持有旧引用），逐字段置 `undefined` 更安全。

**`watch` 与 `onMounted` 的配合**：`watch` 只监听分页变化，首次加载交给 `onMounted` + `immediate` 控制，避免初始化时重复请求。

## 使用示例

配合 Element Plus 的表格与分页组件，一个完整列表页只需关注模板和筛选字段：

```vue
<template>
  <el-collapse class="mb-6">
    <el-collapse-item title="筛选条件" name="1">
      <el-form label-position="left" label-width="90px" :model="filterOption">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
            <el-form-item label="用户名">
              <el-input v-model="filterOption.name" placeholder="筛选指定签名名称" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
            <el-form-item label="注册时间">
              <el-date-picker
                v-model="filterOption.timeRange"
                type="daterange"
                unlink-panels
                range-separator="到"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
            <el-row class="flex mt-4">
              <el-button type="primary" @click="loadData()">筛选</el-button>
              <el-button type="primary" @click="reset">重置</el-button>
            </el-row>
          </el-col>
        </el-row>
      </el-form>
    </el-collapse-item>
  </el-collapse>

  <el-table v-loading="loading" :data="list" border style="width: 100%">
    <el-table-column label="用户名" min-width="110px">
      <template #default="scope">{{ scope.row.name }}</template>
    </el-table-column>
    <el-table-column label="手机号码" min-width="130px">
      <template #default="scope">{{ scope.row.mobile || "未绑定手机号码" }}</template>
    </el-table-column>
    <el-table-column label="邮箱地址" min-width="130px">
      <template #default="scope">{{ scope.row.email || "未绑定邮箱地址" }}</template>
    </el-table-column>
    <el-table-column prop="createAt" label="注册时间" min-width="220px" />
    <el-table-column width="200px" fixed="right" label="操作">
      <template #default="scope">
        <el-button type="primary" link @click="detail(scope.row)">详情</el-button>
      </template>
    </el-table-column>
  </el-table>

  <div v-if="total > 0" class="flex justify-end mt-4">
    <el-pagination
      v-model:current-page="curPage"
      v-model:page-size="pageSize"
      background
      layout="sizes, prev, pager, next"
      :total="total"
      :page-sizes="[10, 30, 50]"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { UserInfoApi } from '@/network/api/User';
import useList from '@/lib/hooks/useList/index';

const filterOption = ref<UserInfoApi.FilterOptionType>({});

const {
  list,
  loading,
  reset,
  filterOption: filter,
  curPage,
  pageSize,
  exportFile,
  total,
  loadData,
} = useList(UserInfoApi.list, {
  filterOption,
  message: {
    GET_DATA_IF_FAILED: '获取用户列表失败',
  },
});
</script>
```

分页组件通过 `v-model:current-page` 和 `v-model:page-size` 双向绑定到 hook 返回的 ref 上，用户切页时 `watch` 自动触发重新请求，无需手写事件回调。

## 相关阅读

- [组合式函数设计模式](03-组合式函数设计模式.md)：组合层级模型、管道/混合/适配器三种组合模式、异步竞态处理
- [概述与响应式系统](01-概述与响应式系统.md)：`ref` / `reactive` 与响应式基础
