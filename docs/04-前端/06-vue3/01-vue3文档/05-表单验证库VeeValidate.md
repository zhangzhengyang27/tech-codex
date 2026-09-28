---
title: "表单验证库 VeeValidate"
description: 介绍 Vue3 生态的表单验证库 VeeValidate v4：安装与中文本地化配置（@vee-validate/i18n）、全局注册校验规则（@vee-validate/rules），以及 Form/Field/ErrorMessage 组件完成表单校验的完整示例。
category: Vue
keywords: [VeeValidate, 表单验证, Vue3, 前端校验]
---



# VeeValidate

官方文档：https://vee-validate.logaretm.com/v4/

在终端中运行以下命令安装 VeeValidate 和相关依赖（本文用到的中文化包与规则包需一并安装）：

```sh
pnpm add vee-validate @vee-validate/i18n @vee-validate/rules
```


在 `common` 目录下创建一个名为 `vee-validate.ts` 的文件，并添加以下内容：

   ```typescript
import { configure, defineRule } from 'vee-validate';

import { localize } from '@vee-validate/i18n';
import zh from '@vee-validate/i18n/dist/locale/zh_CN.json';
// 可以在 @vee-validate 中全局定义所有可用的规则
import { all } from '@vee-validate/rules';

Object.entries(all).forEach(([name, rule]) => {
  defineRule(name, rule);
});

const config = {
  messages: {
    ...zh.messages,
    // 全局定义 message
    required: '请输入{field}',
    min: '请在{field}输入至少0:{length}个字符',
    confirmed: '两次输入的内容不一致',
  },
  // 与 <Field> 组件的 name 属性对应。key 为 name, value 为对应的中文 field 名称
  names: {
    email: '邮箱',
    password: '密码',
    repassword: '确认密码',
    oldpassword: '旧密码',
    name: '昵称',
    username: '账号',
    code: '验证码',
    title: '标题',
    catalog: '分类',
  },
  // 针对不同的 name，定义不同的 message 消息
  fields: {
    catalog: {
      // eslint-disable-next-line @typescript-eslint/camelcase
      is_not: '请选择{_field_}',
    },
    email: {
      email: '请输入正确的{_field_}',
      required: '请输入{_field_}',
    },
  },
};

configure({
  generateMessage: localize('zh_CN', config),
});
   ```

在 `main.ts` 文件中导入并使用 VeeValidate 配置文件：

   ```typescript
import { createApp } from 'vue';
import App from './App.vue';
import '@/common/vee-validate'; // 导入 VeeValidate 配置文件
import Alert from '@/components/modules/alert';

const app = createApp(App);

app.mount('#app');
   ```

在组件中使用 VeeValidate 进行表单验证。以下是一个示例：

```html
<template>
  <Form @submit="onSubmit">
    <div>
      <label for="email">Email:</label>
      <Field id="email" name="email" type="email" rules="required|email" />
      <ErrorMessage name="email" />
    </div>

    <div>
      <label for="password">Password:</label>
      <Field id="password" name="password" type="password" rules="required|min:6" />
      <ErrorMessage name="password" />
    </div>
    <button type="submit">Submit</button>
  </Form>
</template>

<script>
  import { Field, Form, ErrorMessage } from 'vee-validate';

  export default {
    components: {
      Form,
      Field,
      ErrorMessage,
    },
    methods: {
      onSubmit(values) {
        console.log('Form Submitted:', values);
      }
    }
  };
</script>
```