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

就拿字典选择下拉框来说，如果不做封装，我们是这样写的 （这里拿  ant-design-vue组件库来做示例）

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

看起来根本不需要什么封装,但是这只是一个 最简单 的逻辑，不考虑接口请求超时和错误的情况，甚至都没考虑下拉框的 `loading` 表现。 如果我们把所有的 意外情况 都考虑到的话，代码就会变得很臃肿了

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

这一次，代码直接来到了`22`行，虽说用户体验确实好了不少，但是这也忒费事了，而且这还只是一个下拉框，页面里有好几个下拉框也是很常见的，如此这般，可能什么逻辑都没写，页面代码就要上百行了。

这个时候，就需要我们来封装一下了，我们有两种选择：

1.  把字典下拉框封装成一个 组件；
2.  把请求、加载中、错误这些处理逻辑封装到 `hook` 里；

第一种大家都知道，就不多说了，直接说第二种

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

这样一来，代码行数直接又从`20`行降到`3`行，甚至比刚开始最简单的那个还要少两行，但是功能却一点不少，用户体验也是比较完善的

## Loading 状态 hook

点击按钮，调用接口是另一个我们经常遇到的场景，为了更好的用户体验，提示用户操作已经响应，同时防止用户多次点击，我们要在调用接口的同时将按钮置为 `loading` 状态，虽说只有一个 loading 状态，但是写多了也觉着麻烦

为此我们可以封装一个非常简单的 hook：hook.ts

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

这次把模拟接口的方法单独抽出一个文件 `api/index.ts`

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

这样封装一下，我们使用时就不再需要手动切换 `loading` 的状态了

这个 hook 还有另一种玩法：hook2.ts

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

这里也是用到了`promise`链式调用的特性，在接口调用之后马上将`loading`置为true，在接口调用完成后置为 false。而`useAutoRequest`则是在接口调用之前就将 `loading`  置为 true

`useAutoRequest`调用时代码更简洁，`useAutoLoading`的使用则更灵活，可以同时服务给多个接口使用，比较适合 提交 、取消 这种互斥的场景

解放组件
----

如果你翻看过我的这篇博客[一个省心省力的骨架屏实现方案](https://juejin.cn/post/6945748911147450405)，那么肯定知道在骨架屏组件中，我是用了传入的`res`对象的`code`属性来判断当前显示的视图状态。长话短说就是， `res`是接口返回给前端的数据，如

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

我们假定当`code`为`0`时代表成功，`不为0`表示失败，为`-100`时表示正在加载，当然接口并不会也不需要返回`-100`，`-100`是我们本地捏造出来的，只是为了让骨架屏组件显示对应的加载状态。 在页面中使用时，我们需要先声明一个`code`为`-100`的`res`对象绑定给骨架屏组件，然后在`onMounted`中调用查询接口，调用成功后更新`res`对象。

如果像上面这样使用`res`对象来给骨架屏组件设置状态的话，就感觉非常的麻烦，有时候我们只是要设置一个初始时的加载状态，但是要搞好几行没用的代码，但是如果我们把`res`拆解成一个个参数单独传递的话，父组件需要维护的变量就会非常多了，这时我们就可以封装hook来解决这个问题，把拆解出来的参数都扔到hook里面保存。

上代码（这部分代码比较长，想要详细了解的话可以去看原文章）

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

这里的`SkeletonView`不光用`v-bind`绑定了`hook`抛出的属性，还用`v-on`绑定的事件，目的就是监听请求报错时出现的“重试”按钮的点击事件。

使用优化
----

经常写`react`的朋友可能早就看出来了，这不是跟react中的一部分hook用法如出一辙吗？没错，很多人写react就这么写，而且react中绑定hook跟组件更简单，只需要...就可以了，比如：

```tsx
function Demo(){
    const select = useSelect({
        apiFun:getDict
    })
    
    return <Select {...select} />;
}


```

比起`vue`的`v-bind`和`v-on`算是简便了不少。那么，有没有一种办法也能做到差不多的效果呢？就比如能做到`v-xxx="select"`。

博主首先想到的就是 vue 的自定义指令，文档见[官方文档](https://cn.vuejs.org/guide/reusability/custom-directives.html)，但是折腾了半天发现行不通，因为自定义指令主要还是针对 dom 来的。vue 官网原话：

> 总的来说，**不**推荐在组件上使用自定义指令。

那么就只能考虑打包插件了，只要我们在`vue`解析`template`之前把`v-xxx="select"`翻译成`v-bind="select.bindProps" v-on="select.bindEvents"`就好了，听起来并不难，只要我们开发的时候规定绑定组件的 hook 返回格式必须有`bindProps`和`bindEvents`就好了。

思路有了，直接开干，现在`vue`官网的默认创建方式也改成 vite，我们就直接写 vite 的插件（不想看可以跳到最后用现成的）：

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

修改一下vue中的用法

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

OK! 完成了！

### 使用npm安装

不过我也提前打包编译好了发布在了npm上，需要的话可以直接使用这个

`npm i vite-plugin-vue-hook-enhance -D`

改一下引入方式就可以了

```ts
import { viteHookBind } from "vite-plugin-vue-hook-enhance";

```