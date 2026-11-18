---
title: Clerk 与登录注册
description: 使用 Clerk 在 Next.js 中实现身份认证，涵盖登录注册、会话管理和权限控制
keywords: [Clerk, 身份认证, 登录注册, 会话管理, 权限控制]
category: Next.js
tags: [Next.js]
---

# Clerk 与登录注册

登录与注册是一个说简单也简单、说复杂也复杂的功能。

往简单的说，注册时提供两个输入框，将数据写入数据库，登录时校验数据是否正确即可。

往复杂的说，除了登录注册，还有账号注销、忘记密码、密码重置、邮箱验证、更新个人资料、更新密码、删除账号等功能，此外，数据的安全性如何保证？Magic Links、Multi-Factor Auth (MFA)、社交媒体登录 (Google, Facebook, Twitter, GitHub, Apple, and more) 是否要支持？是否还要做个后台统计用户登录数据？这些都是不小的工作量。

所以虽然可以从零自研，但通常优先选用现成的方案。

所幸关于登录注册的技术方案，并不像评论系统那么多，主流的技术选型有 3 个：

1.  [**Clerk**](https://clerk.com/)

> The most comprehensive User Management Platform

Clerk 提供了一个开发人员友好的身份验证和用户管理解决方案，帮助开发者轻松构建和管理用户身份验证、用户账户和权限管理功能。它提供了安全的身份验证、社交登录集成、角色和权限管理等功能。

2.  [**Supabase**](https://supabase.com/)

> Supabase is an open source Firebase alternative.

> Start your project with a Postgres database, Authentication, instant APIs, Edge Functions, Realtime subscriptions, Storage, and Vector embeddings.

简单来说，Supabase 是 Firebase 的开源替代品，属于 BaaS（后端即服务）产品。所谓 BaaS，开发者只需要开发和维护前端代码，由 BaaS 服务商提供了开发应用所需要的后端服务，如用户身份验证、数据库管理、推送通知（针对移动应用程序），以及云存储和托管等。

此外，Supabase 建立在 Postgres 之上。Postgres 是一个免费的开源数据库，被认为是世界上最稳定、最先进的数据库之一。

所以用户身份验证只是 Supabase 提供的功能之一。

如果要比较 Clerk 和 Supabase 的话，Clerk 更专注于身份验证和用户管理，对应功能更加丰富。Supabase 实现的功能更多，身份验证只是其中之一。

实际使用的时候，两者也可以一起使用。Clerk 和 Supabase 各自提供了接入对方的文档：

1.  [Clerk：Integrate Supabase with Clerk](https://clerk.com/docs/integrations/databases/supabase)
2.  [Supabase：Integrate Clerk](https://supabase.com/partners/integrations/clerk)

注意：这两个平台都提供了免费版，但免费版毕竟有一些限制，比如 Clerk 会限制 10000 月活跃用户等，Supabase 会限制 50000 月活跃用户，数据库大小为 500 MB 等等。

3.  [**Next-Auth**](https://next-auth.js.org/getting-started/introduction)

《React Notes 全栈项目实战》中使用的便是 Next-Auth。Next-auth 不是平台，是一个开源库，用于快速实现登录注册等功能。

总的来说，如果要快速接入登录注册功能，最好还是使用平台，也就是 Clerk 和 Supabase，其中 Clerk 提供的功能更为丰富，但免费版月活限制用户数更少。

以下围绕 Clerk 的使用展开。

## Clerk

### 1. Clerk 注册并创建应用

打开 <https://clerk.com/> 注册一个账号，首次登录后会进入创建应用界面。

输入应用的名字，左边选择支持的登录方式，右边为预览登录界面 UI，样式会根据左边的选择有所不同。

创建应用后，会跳转到 Get started 页面，指导用户如何接入 Clerk。

### 2. 接入 Clerk

为了演示如何[接入 Clerk](https://clerk.com/docs/quickstarts/nextjs)，先使用官方脚手架创建一个新项目：

```bash
npx create-next-app@latest
```

项目安装依赖项：

```bash
npm install @clerk/nextjs
```

添加本地环境变量：

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxx
```

新建 `middleware.js`，代码如下：

```javascript
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

修改 `app/layout.jsx`，代码如下：

```jsx
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs'
import './globals.css'
export default function RootLayout({
  children,
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <SignedOut>
            <SignInButton />
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
```

这段代码中用到的组件解释如下：

所有 Clerk hooks 和组件都必须是 `<ClerkProvider>` 的子组件，因此需要用 `<ClerkProvider>` 将整个页面代码包裹，该组件会存储 session 和用户上下文数据。

`<SignedIn>`下的子组件仅在登录状态时显示。`<SignedOut>`下的子组件仅在非登录状态时显示。

`<SignInButton>` 是一个链接至登录页面的无样式组件。`<UserButton>`是一个 Clerk 提供的自带样式的组件，用于展示用户头像。

此时即完成了 Clerk 的接入，并实现了账号的登录、注册、账号管理、注销等功能。

打开 <http://localhost:3000/> 即可查看效果。

### 3. 添加中文

Clerk 实现的登录注册界面默认都是英文的。Clerk 也考虑到了这一点，并提供了[本地化方法](https://clerk.com/docs/components/customization/localization)，可将界面改为中文。

安装依赖项：

```bash
npm install @clerk/localizations
```

修改 `app/layout.js`，代码如下：

```jsx
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs'
import './globals.css'
import { zhCN } from "@clerk/localizations";

export default function RootLayout({
  children,
}) {
  return (
    <ClerkProvider localization={zhCN}>
      <html lang="zh-CN">
        <body>
          <SignedOut>
            <SignInButton mode="modal">
              登录
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton showName={true} />
          </SignedIn>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
```

注意：这里`<SignInButton>` 的 `mode` 设置为了 `"modal"` 才让登录界面的本地化生效。如果不设置为 modal 则会直接跳转到登录界面，此时本地化不会生效。要让跳转登录界面也实现本地化，可参考下文 Next-js-Boilerplate 的实现方式。

### 4. 后台界面

Clerk 提供了后台界面，可以查看登录用户数据以及进行登录相关的设置。

当然，Clerk 实现的功能远不止如此，完全自定义登录界面、使用内置的组件自定义开发、构架自己的登录流程等等都有支持，并提供了详细的文档：<https://clerk.com/docs>

## Next-js-Boilerplate

了解 Next.js 项目如何接入 Clerk 后，再来看 Next-js-Boilerplate 模板中的 Clerk 用法。

### 1. 基础设置

在这个模板中使用 Clerk，最基础的就是设置 `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` 和 `CLERK_SECRET_KEY`。

> 从安全的角度来讲，应该将 `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` 放到 `.env`文件中，`CLERK_SECRET_KEY` 放到 `.env.local`文件中，并且 Git 不提交 `.env.local`

### 2. 登录路由

但与上文简易接入 Clerk 的方式不同，在 Next-js-Boilerplate 中，当用户点击 Sign In 的时候，跳转的并不是 Clerk 的登录页面，而是 <http://localhost:3000/sign-in>，这是因为在 `.env`中通过 `CLERK_SIGN_IN_URL` 环境变量重新设置了登录的跳转地址：

```bash
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
```

查看 `/sign-in`路由对应的文件代码，打开 `src/app/[locale]/(auth)/(center)/sign-in/[[...sign-in]]/page.tsx`：

```tsx
import { SignIn } from '@clerk/nextjs';
import { getTranslations } from 'next-intl/server';
import { getI18nPath } from '@/utils/Helpers';

// ...

const SignInPage = (props: { params: { locale: string } }) => (
  <SignIn path={getI18nPath('/sign-in', props.params.locale)} />
);

export default SignInPage;

```

在这个页面路由中，使用了 Clerk 提供的 `<SignIn>` 组件来渲染登录界面，其中 `path` 属性用来设置组件挂载的路径。

### 3. 中文设置

如果 Next-js-Boilerplate 要实现默认中文登录界面的效果，配置方式如下。

首先，修改 `src/utils/AppConfig.ts`，完整代码如下：

```typescript
import type { LocalePrefix } from 'node_modules/next-intl/dist/types/src/shared/types';

const localePrefix: LocalePrefix = 'as-needed';

export const AppConfig = {
  name: 'Nextjs Starter',
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
  localePrefix,
};
```

然后修改 `src/app/[locale]/(auth)/layout.tsx`，完整代码如下：

```tsx
import { enUS, zhCN } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/nextjs';

export default function AuthLayout(props: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  let clerkLocale = zhCN;
  let signInUrl = '/sign-in';
  let signUpUrl = '/sign-up';
  let dashboardUrl = '/dashboard';

  if (props.params.locale === 'en') {
    clerkLocale = enUS;
  }

  if (props.params.locale !== 'zh') {
    signInUrl = `/${props.params.locale}${signInUrl}`;
    signUpUrl = `/${props.params.locale}${signUpUrl}`;
    dashboardUrl = `/${props.params.locale}${dashboardUrl}`;
  }

  return (
    <ClerkProvider
      localization={clerkLocale}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      signInFallbackRedirectUrl={dashboardUrl}
      signUpFallbackRedirectUrl={dashboardUrl}
      >
      {props.children}
    </ClerkProvider>
  );
}
```

最后，添加翻译文件，新建 `src/locales/zh.json`，代码如下：

```javascript
{
  "RootLayout": {
    "home_link": "主页",
    "about_link": "关于",
    "guestbook_link": "Guestbook",
    "portfolio_link": "Portfolio",
    "sign_in_link": "登录",
    "sign_up_link": "注册"
  },
  // ...
}
```

这里只翻译了登录相关的文字，其他内容的翻译可借助 Crowdin 平台实现，参见《Crowdin 与本地化》。

## 总结

登录注册所代表的鉴权功能，主流技术选型有 3 个：Clerk、Supabase 和 Next-Auth。其不同之处在于 Clerk 专注于用户管理，Supabase 是 BaaS 产品，鉴权是其中一个功能。Next-Auth 是一个开源库，需要自己实现数据库等。

总的来说，为了快速接入，会优先选择接入 Clerk 和 Supabase，这两个平台自带数据库实现，但免费版都有一些限制。但两者也不冲突，Clerk 和 Supabase 可以一起使用。

在本地化方面，上文只翻译了很小一部分内容，所有内容的自动翻译可借助 Crowdin 平台实现，参见《Crowdin 与本地化》。
