---
title: "自定义 Hook 实战"
description: "以字典下拉框、按钮 loading、骨架屏三个实战案例讲解 Vue 3 自定义 Hook 的封装思路，并进一步用 Vite 插件把 v-bind/v-on 绑定简化为 v-ehb 指令式写法。"
category: Vue
keywords: [Hooks, Composition API, 自定义Hook, Vue3]
tags: [Vue, Vue3, 组合式函数, 实战]
---

# 自定义 Hook 实战

> 原文参考：<https://juejin.cn/post/7172889961446768670>

## 普通实现下拉框

以字典选择下拉框为例，不做任何封装时的写法如下（示例基于 ant-design-vue 组件库）：

```vue
<template>
  <div>
    <a-select :options="optionsArr" />
  </div>
</template>

<script setup name="DDemo" lang="ts">
  import { onMounted, ref } from 'vue';

  function getRemoteData() {
    return new Promise<any[]>((resolve) => {
      setTimeout(() => {
        resolve([
          {
            key: 1,
            name: '苹果',
            value: 1,
          },
          {
            key: 2,
            name: '香蕉',
            value: 2,
          },
          {
            key: 3,
            name: '橘子',
            value: 3,
          },
        ]);
      }, 3000);
    });
  }
  
  const optionsArr = ref<any[]>([]);

  onMounted(() => {
    getRemoteData().then((data) => {
      optionsArr.value = data;
    });
  });
</script>

<style lang="less" scoped></style>
```

看起来似乎不需要封装，但上面只是一个最简单的逻辑，没有考虑接口请求超时和错误的情况，甚至没有考虑下拉框的 `loading` 表现。如果把所有意外情况都考虑到，组件内的代码就会变得很臃肿：

```vue
<template>
  <div>
    <a-select :loading="optLoading" :options="optionsArr"/>
  </div>
</template>

<script setup name="DDemo" lang="ts">
import {onMounted, ref} from 'vue';

function getRemoteData() {
  return new Promise<any[]>((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.5) {
        resolve([
          {
            key: 1,
            name: '苹果',
            value: 1,
          },
          {
            key: 2,
            name: '香蕉',
            value: 2,
          },
          {
            key: 3,
            name: '橘子',
            value: 3,
          },
        ]);
      } else {
        reject(new Error('不小心出错了！'));
      }
    }, 3000);
  });
}

const optLoading = ref(false);
const optionsArr = ref<any[]>([]);

function initSelect() {
  optLoading.value = true;

  getRemoteData()
      .then((data) => {
        optionsArr.value = data;
      })
      .catch((e) => {
        optionsArr.value = [
          {
            key: -1,
            value: -1,
            label: e.message,
            disabled: true,
          },
        ];
      })
      .finally(() => {
        optLoading.value = false;
      });
}

onMounted(() => {
  initSelect();
});
</script>
```

这一次代码来到了 22 行，用户体验确实好了不少，但成本明显增加；而且这还只是一个下拉框，页面里同时存在多个下拉框是很常见的场景，逐个这样处理，可能什么业务逻辑都没写，页面代码就要上百行了。

此时有两种封装方案：

1.  把字典下拉框封装成一个组件；
2.  把请求、加载中、错误这些处理逻辑封装到 `hook` 里；

组件方案适用于外观和交互完全一致的场合；当不同下拉框的模板结构差异较大、只有数据请求逻辑相同时，hook 方案更合适。下面重点分析第二种方案。

### 封装下拉框 hook

```ts
import { onMounted, reactive, ref } from 'vue';

// 定义接口
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  key?: string;
}

interface FetchSelectProps {
  apiFun: () => Promise<any[]>;
}

export function useFetchSelect(props: FetchSelectProps) {
  const { apiFun } = props;

  const options = ref<SelectOption[]>([]);

  const loading = ref(false);

  const loadData = () => {
    loading.value = true;
    options.value = [];
    return apiFun().then(
      (data) => {
        loading.value = false;
        options.value = data;
        return data;
      },
      (err) => {
        loading.value = false;
        options.value = [
          {
            value: '-1',
            label: err.message,
            disabled: true,
          },
        ];
        return Promise.reject(err);
      }
    );
  };

  
  onMounted(() => {
    loadData();
  });

  return reactive({
    options,
    loading,
  });
}

```

然后在组件中调用

```vue
<template>
  <div>
    <a-select v-bind="selectBind" />
  </div>
</template>

<script setup name="DDemo" lang="ts">
  import { useFetchSelect } from './hook';
  
  function getRemoteData() {
    return new Promise<any[]>((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.5) {
          resolve([
            {
              key: 1,
              name: '苹果',
              value: 1,
            },
            {
              key: 2,
              name: '香蕉',
              value: 2,
            },
            {
              key: 3,
              name: '橘子',
              value: 3,
            },
          ]);
        } else {
          reject(new Error('不小心出错了！'));
        }
      }, 3000);
    });
  }
   
  const selectBind = useFetchSelect({
    apiFun: getRemoteData,
  });
</script>
```

这样一来，组件中的代码行数直接从 20 行降到 3 行，甚至比最初最简单的版本还要少，但功能一点不少，loading 与错误状态的体验也更完善。

## Loading 状态 hook

点击按钮调用接口是另一个高频场景。为了更好的用户体验——提示操作已响应、防止重复点击——需要在调用接口的同时把按钮置为 `loading` 状态。逻辑虽简单，但在每个按钮处重复书写仍然繁琐。

对此可以封装一个通用的 hook：hook.ts

```ts
import { Ref, ref } from 'vue';

type TApiFun<TData, TParams extends Array<any>> = (...params: TParams) => Promise<TData>;

interface AutoRequestOptions {
  loading?: boolean;
  onSuccess?: (data: any) => void;
}

type AutoRequestResult<TData, TParams extends Array<any>> = [Ref<boolean>, TApiFun<TData, TParams>];

export function useAutoRequest<TData, TParams extends any[] = any[]>(fun: TApiFun<TData, TParams>, options?: AutoRequestOptions): AutoRequestResult<TData, TParams> {
  const { loading = false, onSuccess } = options || { loading: false };

  const requestLoading = ref(loading);

  const run: TApiFun<TData, TParams> = (...params) => {
    requestLoading.value = true;
    return fun(...params)
      .then((res) => {
      onSuccess && onSuccess(res);
      return res;
    })
      .finally(() => {
      requestLoading.value = false;
    });
  };

  return [requestLoading, run];
}

```

把模拟接口的方法单独抽出一个文件 `api/index.ts`：

```ts
export function submitApi(text: string) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      
      if (Math.random() > 0.5) {
        resolve({
          status: "ok",
          text: text,
        });
      } else {
        reject(new Error("不小心出错了！"));
      }
    }, 3000);
  });
}

```

使用：index.vue

```vue
<template>
	<div class="col">
  	<Button :loading="loading" @click="onSubmit">提交</Button>
  </div>
</template>

<script setup name="Index" lang="ts">
  import { useAutoRequest } from "./hook";
  import { Button } from "ant-design-vue";
  import { submitApi } from "@/api";

  const [loading, submit] = useAutoRequest(submitApi);

  function onSubmit() {
    submit("aaa").then((res) => {
      console.log("res", res);
    });
  }
</script>
```

这样封装后，调用方不再需要手动切换 `loading` 状态。

这个 hook 还有另一种封装思路：hook2.ts

```ts
import type { Ref } from "vue";
import { ref } from "vue";

type AutoLoadingResult = [
  Ref<boolean>,
  <T>(requestPromise: Promise<T>) => Promise<T>
    ];

export function useAutoLoading(defaultLoading = false): AutoLoadingResult {
  const ld = ref(defaultLoading);

  function run<T>(requestPromise: Promise<T>): Promise<T> {
    ld.value = true;
    return requestPromise.finally(() => {
      ld.value = false;
    });
  }

  return [ld, run];
}
```

使用：`index.vue`

```vue
<template>
  <div class="col">
    <Button type="primary" :loading="commonLoading" @click="onSubmit">
      提交
    </Button>
    <Button :loading="commonLoading" @click="onCancel">取消</Button>
  </div>
</template>

<script setup name="Index" lang="ts">

import { useAutoLoading } from "./hook2";
import { Button } from "ant-design-vue";
import { submitApi, cancelApi } from "@/api";
const [commonLoading, fetch] = useAutoLoading();

function onSubmit() {
  fetch(submitApi("submit")).then((res) => {
    console.log("res", res);
  });
}

function onCancel() {
  fetch(cancelApi("cancel")).then((res) => {
    console.log("res", res);
  });
}
</script>
```

两种方案的差异在于 `loading` 的置位时机：`useAutoLoading` 利用 `promise` 链式调用的特性，在拿到请求 Promise 之后立刻将 `loading` 置为 true，在请求完成后置回 false；而 `useAutoRequest` 是在内部调用接口之前就将 `loading` 置为 true。

`useAutoRequest` 调用时代码更简洁；`useAutoLoading` 则更灵活，可以同时服务多个接口，比较适合"提交/取消"这类互斥场景。

## 用 Hook 适配骨架屏组件

在[一个省心省力的骨架屏实现方案](https://juejin.cn/post/6945748911147450405)一文所实现的骨架屏组件中，视图状态由传入的 `res` 对象的 `code` 属性判断。`res` 是接口返回给前端的数据，形如：

```json
{
    "code": 0,
    "msg": "查询成功",
    "data": {
        "username": "小王",
        "age": 20
    }
}
```

约定如下：`code` 为 `0` 时代表成功，不为 `0` 表示失败，为 `-100` 时表示正在加载。接口本身并不会也不需要返回 `-100`，它是本地约定出来的状态值，仅用于让骨架屏组件显示对应的加载状态。在页面中使用时，需要先声明一个 `code` 为 `-100` 的 `res` 对象绑定给骨架屏组件，然后在 `onMounted` 中调用查询接口，调用成功后更新 `res` 对象。

这种用法相当繁琐：有时只需要设置一个初始加载状态，却要写好几行模板代码；而如果将 `res` 拆解成一个个参数单独传递，父组件需要维护的变量又会非常多。封装一个 hook 可以同时解决这两个问题，把拆解出来的状态统一收拢在 hook 内部管理。

骨架屏组件与配套 hook 的完整代码如下（代码较长，实现细节可参考原文）：

#### 骨架屏组件

SkeletonView/index.vue

```vue
<script setup lang="ts">
import { computed } from "vue";
import { LoadingOutlined } from "@ant-design/icons-vue";
import { isArray } from "@/utils/is";
import { Button } from "ant-design-vue";

type ViewStatus = "loading" | "error" | "success" | "empty";

interface SkeletonProps<T = any> {
  status: ViewStatus;
  result: T;
  placeholderResult: T;
  emptyMsg?: string;
  errorMsg?: string;
  isEmpty?: (result: T) => boolean;
}

const props = withDefaults(defineProps<SkeletonProps>(), {
  status: "loading",
  emptyMsg: "暂无数据",
  errorMsg: "未知错误",
});

const emits = defineEmits(["retry"]);

const retryClick = () => {
  emits("retry");
};

const viewStatus = computed(() => {
  const status = props.status;

  if (status === "success") {
    let isEmp = false;
    const result = props.result;
    if (props.isEmpty) {
      isEmp = props.isEmpty(props.result);
    } else {
      if (isArray(result)) {
        isEmp = result.length === 0;
      } else if (!result) {
        isEmp = true;
      } else {
        isEmp = false;
      }
    }
    if (isEmp) {
      return "empty";
    }
    return "success";
  }
  return status;
});

const placeholderData = computed(() => {
  if (props.result) {
    return props.result;
  }
  return props.placeholderResult;
});
</script>

<template>
  <div v-if="viewStatus === 'empty'" key="empty" class="empty_view flex-col">
    <span>{{ emptyMsg }}</span>
    <Button class="mt4 max-w-160px" @click="retryClick">重试</Button>
  </div>

  <div
    key="error"
    v-else-if="viewStatus === 'error'"
    class="empty_view flex-col"
  >
    <span>{{ errorMsg }}</span>
    <Button class="mt4 max-w-160px" @click="retryClick">重试</Button>
  </div>

  <div
    v-else
    key="loadingOrContent"
    :class="[
      placeholderData && viewStatus === 'loading'
        ? 'skeleton-view-empty-view'
        : 'skeleton-view-default-view',
    ]"
  >
    <div
      v-if="!placeholderData && viewStatus === 'loading'"
      class="loading-center"
    >
      <LoadingOutlined style="font-size: 40px; color: #2a6de5" />
    </div>
    <slot
      v-else
      :result="placeholderData"
      :status="viewStatus"
      :success="viewStatus === 'success'"
      :mask="viewStatus === 'loading' ? 'skeleton-mask' : ''"
    ></slot>
  </div>
</template>

<style>
.clam-box {
  width: 100%;
  height: 100%;
}
.empty_view {
  padding-top: 50px;
  padding-bottom: 50px;
  align-items: center;
}
.empty_img {
  width: 310px;
  height: 218px;
}
.trip_text {
  font-size: 20px;
  color: #999999;
}

.mt4 {
  margin-top: 4px;
}

.flex-col {
  display: flex;
  flex-direction: column;
}

.loading-center {
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.skeleton-view-default-view span,
.skeleton-view-default-view a,
.skeleton-view-default-view img,
.skeleton-view-default-view td,
.skeleton-view-default-view button {
  transition-duration: 0.7s;
  transition-timing-function: ease;
  transition-property: background, width;
}

.skeleton-view-empty-view {
  position: relative;
  pointer-events: none;
}

.skeleton-view-empty-view::before {
  content: " ";
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background: linear-gradient(
    110deg,
    rgba(255, 255, 255, 0.1) 40%,
    rgba(180, 199, 255, 0.3) 50%,
    rgba(255, 255, 255, 0.1) 60%
  );
  background-size: 200% 100%;
  background-position-x: 180%;
  animation: loading 1s ease-in-out infinite;
  z-index: 1;
}

@keyframes loading {
  to {
    background-position-x: -20%;
  }
}

.skeleton-view-empty-view .skeleton-mask {
  position: relative;
}
.skeleton-view-empty-view .skeleton-mask::before {
  content: " ";
  background-color: #f5f5f5;
  position: absolute;
  width: 100%;
  height: 100%;
  border: 1px solid #f5f5f5;
  top: -1px;
  left: -1px;
  z-index: 1;
}

.skeleton-view-empty-view button,
.skeleton-view-empty-view span,
.skeleton-view-empty-view input,
.skeleton-view-empty-view td,
.skeleton-view-empty-view a {
  color: rgba(0, 0, 0, 0) !important;
  border: none;
  background: #f5f5f5 !important;
}

.skeleton-view-empty-view img {
  content: url(./no_url.png);
  border-radius: 2px;
  background: #f5f5f5 !important;
}
</style>

```

这里样式中用到的`no_url.png`只是一张空白透明图片，防止加载时图片显示裂图。

hook代码 useAutoSkeletonView.ts

```ts
import { computed, onMounted, reactive, ref } from "vue";
import type { UnwrapRef } from "vue";

type TApiFun<TData, TParams extends Array<any>> = (
  ...params: TParams
) => Promise<TData>;

export type SkeletonStatus = "loading" | "success";

export interface IUseAutoSkeletonViewProps<TData, TParams extends any[]> {
  apiFun: TApiFun<TData, TParams>;
  placeholderResult?: TData; 
  queryInMount?: boolean; 
  initQueryParams?: TParams; 
  transformDataFun?: (data: TData) => TData; 
  updateParamsOnFetch?: boolean; 
  defaultStatus?: SkeletonStatus; 
  onSuccess?: (data: any) => void; 
  isEmpty?: (data: TData) => boolean; 
}

export type IAutoSkeletonViewResult<TData, TParams extends any[]> = UnwrapRef<{
  execute: TApiFun<TData, TParams>;
  result: TData | null;
  retry: () => Promise<TData>;
  loading: boolean;
  status: SkeletonStatus | "error";
  getField: (key: string) => any;
  bindProps: {
    result: TData | null;
    status: SkeletonStatus | "error";
    errorMsg: string;
    placeholderResult?: TData;
    isEmpty?: (data: TData) => boolean;
  };
  bindEvents: {
    retry: () => Promise<TData>;
  };
}>;

export function useAutoSkeletonView<TData = any, TParams extends any[] = any[]>(
  prop: IUseAutoSkeletonViewProps<TData, TParams>
): IAutoSkeletonViewResult<TData, TParams> {
  const {
    apiFun,
    defaultStatus = "loading",
    placeholderResult,
    isEmpty,
    initQueryParams = [],
    transformDataFun,
    onSuccess,
    updateParamsOnFetch = true,
    queryInMount = true,
  } = prop;

  const status = ref<SkeletonStatus | "error">(defaultStatus);

  const result = ref<TData | null>(null);

  const placeholder = ref<TData | undefined>(placeholderResult);

  const errorMsg = ref("");

  const lastFetchParams = ref<TParams>(initQueryParams as TParams);

  const executeApiFun: TApiFun<TData, TParams> = (...params: TParams) => {
    if (updateParamsOnFetch) {
      lastFetchParams.value = params;
    }

    status.value = "loading";

    return apiFun(...params)
      .then((res) => {
        let data: any = res;
        if (transformDataFun) {
          data = transformDataFun(res);
        }
        placeholder.value = data;
        result.value = data;
        status.value = "success";
        onSuccess && onSuccess(data);
        return res;
      })
      .catch((e) => {
        console.error("--useAutoSkeletonView--", e);
        status.value = "error";
        errorMsg.value = e.message;
        throw e;
      });
  };

  function retry() {
    return executeApiFun(...(lastFetchParams.value as TParams));
  }

  onMounted(() => {
    if (queryInMount && defaultStatus === "loading") {
      executeApiFun(...(initQueryParams as TParams));
    }
  });

  const loading = computed(() => {
    return status.value === "loading";
  });

  function getField(key: string) {
    if (status.value !== "success") {
      return "";
    }
    if (result.value) {
      
      return result.value[key];
    }
    return "";
  }

  return reactive({
    execute: executeApiFun,
    result: result,
    retry,
    loading,
    status,
    getField,
    bindProps: {
      result: result,
      status,
      errorMsg,
      placeholderResult: placeholder,
      isEmpty,
    },
    bindEvents: {
      retry: retry,
    },
  });
}

```

使用 index.vue

```vue
<script setup name="SkeletonView" lang="ts">
import SkeletonView from "@/components/SkeletonView/index.vue";
import { useAutoSkeletonView } from "./useAutoSkeletonView";
import { listApi } from "@/api";

const view = useAutoSkeletonView({
  apiFun: listApi,
});
</script>

<template>
  <div class="col">
    <SkeletonView
      v-slot="{ result }"
      v-bind="view.bindProps"
      v-on="view.bindEvents"
    >
      <span>{{ result }}</span>
    </SkeletonView>
  </div>
</template>

```

这里的 `SkeletonView` 不光用 `v-bind` 绑定了 hook 抛出的属性，还用 `v-on` 绑定了 hook 抛出的事件，目的是监听请求报错时出现的"重试"按钮的点击事件。

## 使用优化：v-ehb 指令式绑定

写过 `react` 的开发者可能已经发现，这套用法与 React 中部分 hook 的用法如出一辙，而且 React 中把 hook 结果绑定到组件上更简单，只需展开运算符即可：

```tsx
function Demo(){
    const select = useSelect({
        apiFun:getDict
    })
    
    return <Select {...select} />;
}

```

比起 `vue` 的 `v-bind` 和 `v-on` 确实简便不少。那么 Vue 中能否做到类似 `v-xxx="select"` 的效果？

首先可以考虑 Vue 的自定义指令，文档见[官方文档](https://cn.vuejs.org/guide/reusability/custom-directives.html)，但这条路走不通，因为自定义指令主要针对 DOM。Vue 官网原话：

> 总的来说，**不**推荐在组件上使用自定义指令。

剩下的可行方案是打包插件：在 `vue` 解析 `template` 之前，把 `v-xxx="select"` 翻译成 `v-bind="select.bindProps" v-on="select.bindEvents"`。实现并不复杂，只需要在开发时约定绑定组件的 hook 返回格式必须包含 `bindProps` 和 `bindEvents` 两个字段。

思路明确后即可实现。现在 `vue` 官网的默认创建方式已改为 vite，因此直接编写 vite 插件（也可以直接跳到文末使用现成的 npm 包）：

```ts

import type { PluginOption } from "vite";

type HookBindPluginOptions = {
  prefix?: string;
  bindKey?: string;
  eventKey?: string;
};
export const viteHookBind = (options?: HookBindPluginOptions): PluginOption => {
  const { prefix, bindKey, eventKey } = Object.assign(
    {
      prefix: "v-ehb",
      bindKey: "bindProps",
      eventKey: "bindEvents",
    },
    options
  );

  return {
    name: "vite-plugin-vue-component-enhance-hook-bind",
    enforce: "pre",
    transform: (code, id) => {
      const last = id.substring(id.length - 4);

      if (last === ".vue") {
        
        if (code.indexOf(prefix) === -1) {
          return code;
        }
        
        const templateStrStart = code.indexOf("<template>");
        
        const templateStrEnd = code.lastIndexOf("</template>");

        let templateStr = code.substring(templateStrStart, templateStrEnd + 11);

        let startIndex;
        
        while ((startIndex = templateStr.indexOf(prefix)) > -1) {
          const endIndex = templateStr.indexOf(`"`, startIndex + 7);
          const str = templateStr.substring(startIndex, endIndex + 1);
          const obj = str.split(`"`)[1];

          const newStr = templateStr.replace(
            str,
            `v-bind="${obj}.${bindKey}" v-on="${obj}.${eventKey}"`
          );

          templateStr = newStr;
        }

        
        return (
          code.substring(0, templateStrStart) +
          templateStr +
          code.substring(templateStrEnd + 11)
        );
      }

      return code;
    },
  };
};

```

应用插件

```ts
import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";

import { viteHookBind } from "./vBindPlugin";

export default defineConfig({
  plugins: [vue(), vueJsx(), viteHookBind()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

```

修改一下 Vue 中的用法

```vue
<script setup name="SkeletonView" lang="ts">
import SkeletonView from "@/components/SkeletonView/index.vue";
import { useAutoSkeletonView } from "./useAutoSkeletonView";
import { listApi } from "@/api";

const view = useAutoSkeletonView({
  queryInMount: true,
  apiFun: listApi,
  placeholderResult: [
    {
      key: 1,
      name: "苹果",
      value: 1,
    },
    {
      key: 2,
      name: "香蕉",
      value: 2,
    },
    {
      key: 3,
      name: "橘子",
      value: 3,
    },
  ],
});
</script>

<template>
  <div class="col">
    <SkeletonView v-slot="{ result }" v-ehb="view">
      <span>{{ result }}</span>
    </SkeletonView>
  </div>
</template>

```

到这里，`v-ehb` 指令式绑定即已完成。

### 使用 npm 安装

该插件已打包编译发布到 npm，可直接安装使用：

`npm i vite-plugin-vue-hook-enhance -D`

安装后修改引入方式即可：

```ts
import { viteHookBind } from "vite-plugin-vue-hook-enhance";

```