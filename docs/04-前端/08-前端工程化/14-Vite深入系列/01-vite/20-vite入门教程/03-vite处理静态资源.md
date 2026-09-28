---
title: "Vite 处理静态资源"
description: "Vite 静态资源处理：图片/SVG/JSON/Web Worker 的加载方式、特殊资源后缀（?url/?raw/?inline）、生产环境的 base 部署、内联阈值 assetsInlineLimit、图片压缩与雪碧图优化。"
keywords: [静态资源]
category: tools
tags: [Vite, 静态资源, 构建工具, 工程化]
---

# Vite 处理静态资源

静态资源本身并不是标准意义上的模块，因此对它们的处理和普通的代码是需要区别对待的。

- 一方面需要解决**资源加载**的问题，对 Vite 来说就是将静态资源解析并加载为一个 ES 模块的问题
- 另一方面在**生产环境**下还需要考虑静态资源的部署问题、体积问题、网络性能问题，并采取相应的方案来进行优化

## 图片加载

图片本身包括了非常多的格式，诸如 png、jpeg、webp、avif、gif，当然也包括经常用作图标的 svg 格式。在日常的项目开发过程中一般会遇到三种加载图片的场景:

```
# 在 HTML 或者 JSX 中，通过 img 标签来加载图片
<img src="../../assets/a.png"></img>

# 在 CSS 中通过 background 属性加载图片
background: url('../../assets/b.png') no-repeat;

# 在 js 中通过脚本的方式动态指定图片的 src 属性
document.getElementById('hero-img').src = '../../assets/c.png'
```

> 当然一般还会有别名路径的需求，比如地址前缀直接换成 `@assets`，这样就不用开发人员手动寻址，降低开发时的心智负担
>

### 在 Vite 中加载图片

在目前的脚手架项目来进行实际的编码，可以在 Vite 的配置文件中配置一下别名

```javascript
// vite.config.ts
import path from 'path';

{
  resolve: {
    alias: {
      '@assets': path.join(__dirname, 'src/assets')
    }
  }
}
```

值得注意的是，alias 别名配置不仅在 JavaScript 的 import 语句中生效，在 CSS 代码的 `@import` 和 `url ` 导入语句中也同样生效。

现在 `src/assets` 目录的内容如下:

```javascript
├── icons
│   ├── favicon.svg
│   ├── logo-1.svg
│   ├── logo-2.svg
│   ├── logo-3.svg
│   ├── logo-4.svg
│   ├── logo-5.svg
│   └── logo.svg
└── imgs
    ├── background.png
    └── vite.png
```

接下来在 Header 组件中引入 `vite.png`这张图片:

```jsx
// Header/index.tsx
import { useEffect } from 'react';
import styles from './index.module.scss';
import logoSrc from '@assets/imgs/vite.png';

export default function HandleAssets() {
  useEffect(() => {
    const img = document.getElementById('logo') as HTMLImageElement;
    img.src = logoSrc;
  }, []);

  return (
    <div className={`p-20px text-center ${styles.header}`}>
      <img className="m-auto mb-4" src={logoSrc} alt="" />
      <img id="logo" className="m-auto mb-4" alt="" />
    </div>
  );
}
```

可以发现图片能够正常显示，而图片路径也被解析为了正确的格式（`/` 表示项目根路径）。

样式文件中添加 `background` 属性，再次回到浏览器，可以看到背景已生效

```css
.header {
  background: url('@assets/imgs/background.png') no-repeat;
}
```

### SVG 组件加载

上述这些加载的方式对于 svg 格式来说依然是适用的。通常希望能将 svg 当做一个组件来引入，可以很方便地修改 svg 的各种属性，而且比 img 标签的引入方式更加优雅

SVG 组件加载在不同的前端框架中的实现不太相同，社区中也已经有了对应的插件支持:

*   Vue2 项目中可以使用 [vite-plugin-vue2-svg](https://github.com/pakholeung37/vite-plugin-vue2-svg) 插件
*   Vue3 项目中可以引入 [vite-svg-loader](https://github.com/jpkleemans/vite-svg-loader)
*   React 项目使用 [vite-plugin-svgr](https://github.com/pd4d10/vite-plugin-svgr) 插件

在 React 脚手架项目中安装对应的依赖:

```bash
pnpm i vite-plugin-svgr -D
```

然后需要在 vite 配置文件添加这个插件:

```ts
// vite.config.ts
import svgr from 'vite-plugin-svgr';

{
  plugins: [svgr()]
}
```

随后注意要在 `tsconfig.json` 添加如下配置，否则会有类型错误:

```json
{
  "compilerOptions": {
    // 省略其它配置
    "types": ["vite-plugin-svgr/client"]
  }
}
```

4.0 版本之前在项目中使用 svg 组件方式:

```jsx
import { ReactComponent as ReactLogo } from '@assets/icons/logo.svg';

export function Header() {
  return (
    // 其他组件内容省略
     <ReactLogo />
  )
}
```

4.0 版本之后在项目中使用 svg 组件方式:

```tsx
import ReactLogo from '@assets/icons/logo.svg?react';

export default function HandleAssets() {

  return (
    <ReactLogo />
  );
}
```

## JSON 加载

Vite 中已经内置了对于 JSON 文件的解析，底层使用 `@rollup/pluginutils`  的 `dataToEsm` 方法将 JSON 对象转换为一个包含各种具名导出的 ES 模块

```tsx
import './index.scss';
import styles from './index.module.scss';
import { devDependencies } from '../../../package.json';

export default function Header() {
  return (
    <>
      <div className="p-20px text-center">
        <h1 className="font-bold text-2xl mb-2">vite version: {devDependencies.vite}</h1>
      </div>
    </>
  );
}
```

也可以在配置文件禁用按名导入的方式:

```ts
// vite.config.ts
{
  json: {
    stringify: true
  }
}
```

这样会将 JSON 的内容解析为 `export default JSON.parse("xxx")`，这样会失去`按名导出`的能力，不过在 JSON 数据量比较大的时候，可以优化解析性能

```tsx
import './index.scss';
import styles from './index.module.scss';
import pkg from '../../../package.json';

export default function Header() {
  return (
    <>
      <div className="p-20px text-center">
        {pkg.version}
      </div>
    </>
  );
}
```

## Web Worker 脚本

Vite 中使用 Web Worker 也非常简单，可以新建 `Header/example.js` 文件:

```jsx
const start = () => {
  let count = 0;
  setInterval(() => {
    // 给主线程传值
    postMessage(++count);
  }, 2000);
};

start();
```

然后在 Header 组件中引入，引入的时候注意加上 `?worker` 后缀，相当于告诉 Vite 这是一个 Web Worker 脚本文件:

```jsx
import Worker from './example.js?worker';
// 1. 初始化 Worker 实例
const worker = new Worker();
// 2. 主线程监听 worker 的信息
worker.addEventListener('message', (e) => {
  console.log(e);
});
```

打开浏览器的控制面板，你可以看到 Worker 传给主线程的信息已经成功打印:

![image-20240320144112018](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403201441396.png)

## 其它静态资源

除了上述的一些资源格式，Vite 也对下面几类格式提供了内置的支持:

*   媒体类文件包括 `mp4`、`webm`、`ogg`、`mp3`、`wav`、`flac` 和 `aac`
*   字体类文件  包括 `woff`、`woff2`、`eot`、`ttf` 和 `otf`
*   文本类。包括 `webmanifest`、`pdf ` 和 `txt`

Vite 将这些类型的文件当做一个 ES 模块来导入使用。如果项目中还存在其它格式的静态资源，通过 `assetsInclude`  配置让 Vite 来支持加载:

```ts
// vite.config.ts

{
  assetsInclude: ['**/*.gltf']
}
```

## 特殊资源后缀

Vite 中引入静态资源时，也支持在路径最后加上一些特殊的 query 后缀，包括:

*   `?url`: 表示获取资源的路径，这在只想获取文件路径而不是内容的场景将会很有用
*   `?raw`: 表示获取资源的字符串内容，如果只想拿到资源的原始内容，可以使用这个后缀
*   `?inline`: 表示资源强制内联，而不是打包成单独的文件

## 生产环境处理

### 自定义部署域名

一般在访问线上的站点时，站点里面一些静态资源的地址都包含了相应域名的前缀，如:

```html
<img src="https://xxx.cos.ap-beijing.myqcloud.com/logo.png" />
```

`https://xxx.cos.ap-beijing.myqcloud.com` 是 CDN 地址前缀，`/logo.png` 则是开发阶段使用的路径。

> 不需要在上线前把图片先上传到 CDN，然后将代码中的地址手动替换成线上地址

在 Vite 中可以有更加自动化的方式来实现地址的替换，只需要在配置文件中指定 `base` 参数即可:

```javascript
// vite.config.ts

// 是否为生产环境，在生产环境一般会注入 NODE_ENV 这个环境变量，见下面的环境变量文件配置
const isProduction = process.env.NODE_ENV === 'production';
// 填入项目的 CDN 域名地址
const CDN_URL = 'xxxxxx';

// 具体配置
{
  base: isProduction ? CDN_URL: '/'
}
```

在项目根目录新增的两个环境变量文件 `.env.development` 和 `.env.production` ，顾名思义，即分别在开发环境和生产环境注入一些环境变量，这里为了区分不同环境加上了`NODE_ENV`，可以根据需要添加别的环境变量

```javascript
// .env.development
NODE_ENV=development

// .env.production
NODE_ENV=production
```

> 打包的时候 Vite 会自动将这些环境变量替换为相应的字符串。
>
> 注：Vite 通常会根据命令（`vite` / `vite build`）自动设置 `NODE_ENV`，一般无需在 `.env` 文件中手动配置，此处保留原书示例仅作了解。

接着执行 `pnpm run build`，可以发现产物中的静态资源地址已经自动加上了 CDN 地址前缀，当然，HTML 中的一些 JS、CSS 资源链接也一起加上了 CDN 地址前缀

```javascript
var logo="https://xxx.cos.ap-beijing.myqcloud.com/logo.png"
```

#### 另外的存储服务

有时候项目中的某些图片需要存放到另外的存储服务，一种直接的方案是将完整地址写死到 src 属性中

```html
<img src="https://my-image-cdn.com/logo.png">
```

这样做显然是不太优雅的，可以通过定义环境变量的方式来解决这个问题，在项目根目录新增 `.env`文件:

```javascript
// 开发环境优先级: .env.development > .env
// 生产环境优先级: .env.production > .env

// .env 文件
VITE_IMG_BASE_URL=https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images
```

然后进入 `src/vite-env.d.ts` 增加类型声明:

```javascript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_IMG_BASE_URL: string; // 自定义的环境变量
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

如果环境变量要在 Vite 中通过 `import.meta.env` 访问，那么它必须以 `VITE_` 开头，如 `VITE_IMG_BASE_URL`

```javascript
// 很奇怪，明明配置在 VITE_IMG_BASE_URL 添加了 images 前缀，但使用的时候还需要添加
<img src={new URL('/images/202403201450086.png', import.meta.env.VITE_IMG_BASE_URL).href} />
```

接下来在 `开发环境` 启动项目或者 `生产环境` 打包后可以看到环境变量已经被替换，地址能够正常显示:

![image-20240320145051746](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403201450086.png)

### 单文件 or 内联

在 Vite 中，所有的静态资源都有两种构建方式

- 一种是打包成一个单独的文件，适合比较大的资源，便于浏览器单独缓存
- 另一种是以 base64 编码的格式内嵌到代码中，适合比较小的资源，对代码体积影响很小，同时减少不必要的网络请求

而对于比较大的资源，推荐单独打包成一个文件，否则可能导致上 MB 的 base64 字符串内嵌到代码中，导致代码体积瞬间庞大

Vite 中内置的优化方案是下面这样的:

*   如果静态资源体积 >= 4KB，则提取成单独的文件
*   如果静态资源体积 < 4KB，则作为 base64 格式的字符串内联

上述的 `4KB` 即为提取成单文件的临界值，当然临界值你可以通过 `build.assetsInlineLimit` 自行配置，如下代码所示:

```javascript
// vite.config.ts
{
  build: {
    assetsInlineLimit: 8 * 1024 // 8 KB
  }
}
```

> svg 格式的文件不受这个临界值的影响，始终会打包成单独的文件，因为它和普通格式的图片不一样，需要动态设置一些属性

### 图片压缩

图片资源的体积往往是项目产物体积的大头。在 JavaScript 领域有一个非常知名的图片压缩库 [imagemin](https://www.npmjs.com/package/imagemin)，作为一个底层的压缩工具，前端的项目中经常基于它来进行图片压缩，比如 Webpack 中大名鼎鼎的 `image-webpack-loader`。社区当中也已经有了开箱即用的 Vite 插件—— `vite-plugin-imagemin`

```bash
pnpm i vite-plugin-imagemin -D
```

随后在 Vite 配置文件中引入:

```ts
//vite.config.ts
import viteImagemin from 'vite-plugin-imagemin';

{
  plugins: [
    // 忽略前面的插件
    viteImagemin({
      // 无损压缩配置，无损压缩下图片质量不会变差
      optipng: {
        optimizationLevel: 7
      },
      // 有损压缩配置，有损压缩下图片质量可能会变差
      pngquant: {
        quality: [0.8, 0.9],
      },
      // svg 优化
      svgo: {
        plugins: [
          {
            name: 'removeViewBox'
          },
          {
            name: 'removeEmptyAttrs',
            active: false
          }
        ]
      }
    })
  ]
}
```

接下来我们可以尝试执行 `pnpm run build` 进行打包:

![image-20240325163719728](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403251637451.png)

Vite 插件已经自动调用 `imagemin` 进行项目图片的压缩，可以看到压缩的效果非常明显，强烈推荐在项目中使用

### 雪碧图优化

项目中经常用到很多 svg 图标，虽然 svg 文件一般体积不大，但 Vite 中对于 svg 文件会始终打包成单文件，大量的图标引入之后会导致网络请求增加，大量的 HTTP 请求会导致网络解析耗时变长，页面加载性能直接受到影响

> HTTP2 的多路复用设计可以解决大量 HTTP 的请求导致的网络加载性能问题，因此雪碧图技术在 HTTP2 并没有明显的优化效果，这个技术更适合在传统的 HTTP 1.1 场景下使用(比如本地的 Dev Server)

比如在 Header 中分别引入 5 个 svg 文件:

```javascript
import Logo1 from '@assets/icons/logo-1.svg';
import Logo2 from '@assets/icons/logo-2.svg';
import Logo3 from '@assets/icons/logo-3.svg';
import Logo4 from '@assets/icons/logo-4.svg';
import Logo5 from '@assets/icons/logo-5.svg';
```

#### import.meta.glob

这里顺便说一句，Vite 中提供了 `import.meta.glob` 的语法糖来解决这种**批量导入**的问题，如上述的 import 语句可以写成下面这样:

```javascript
const icons = import.meta.glob('../../assets/icons/logo-*.svg');
```

![image-20240320145458861](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403201455252.png)

#### 过时的 globEager

可以看到对象的 value 都是动态 import，适合按需加载的场景。在这里只需要同步加载即可，可以使用 `import.meta.globEager`  来完成:

```javascript
const icons = import.meta.globEager('../../assets/icons/logo-*.svg');
```

`icons` 的结果打印如下

![image-20240320145540488](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403201455861.png)

接下来稍作解析，然后将 svg 应用到组件当中:

```ts
// Header/index.tsx
const iconUrls = Object.values(icons).map(mod => mod.default);

// 组件返回内容添加如下
{iconUrls.map((item) => (
  <img src={item} key={item} width="50" alt="" />
))}
```

回到页面中，我们发现浏览器分别发出了 5 个 svg 的请求:

![image-20240320145637813](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403201456985.png)

#### 代替 globEager 方法

上面的 `import.meta.globEager` 方法过时了,需要配置下面的 `vite-plugin-svg-icons` 插件

```tsx
import SvgIcon from '../SvgIcon';

const icons = import.meta.glob('../../assets/icons/logo-*.svg', { eager: true });
console.log(icons);
const iconUrls = Object.values(icons).map((mod) => {
  const fileName = mod.default.split('/').pop();
  const [svgName] = fileName.split('.');
  console.log(svgName);
  return svgName;
});

export function Header() {
  return (
    <div>
      {iconUrls.map((item) => (
        <SvgIcon name={item} key={item} width="50" height="50" />
      ))}
    </div>
  );
}
```

#### vite-plugin-svg-icons

假设页面有 100 个 svg 图标，将会多出 100 个 HTTP 请求，依此类推。能不能把这些 svg 合并到一起，从而大幅减少网络请求。这种合并图标的方案也叫`雪碧图`，可以通过 `vite-plugin-svg-icons` 来实现这个方案

```bash
pnpm i vite-plugin-svg-icons -D
```

接着在 Vite 配置文件中增加如下内容:

```javascript
// vite.config.ts
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';

{
  plugins: [
    // 省略其它插件
    createSvgIconsPlugin({
      iconDirs: [path.join(__dirname, 'src/assets/icons')]
    })
  ]
}
```

在 `src/components` 目录下新建 `SvgIcon` 组件:

```tsx
// SvgIcon/index.tsx
export interface SvgIconProps {
  name?: string;
  prefix: string;
  color: string;
  [key: string]: string;
}

export default function SvgIcon({name,prefix = 'icon',color = '#333',...props}: SvgIconProps) {
  const symbolId = `#${prefix}-${name}`;

  return (
    <svg {...props} aria-hidden="true">
      <use href={symbolId} fill={color} />
    </svg>
  );
}
```

回到 Header 组件中，稍作修改:

```tsx
// index.tsx
const icons = import.meta.glob('../../assets/icons/logo-*.svg', { eager: true });
const iconUrls = Object.values(icons).map((mod) => {
  // 如 ../../assets/icons/logo-1.svg -> logo-1
  const fileName = mod.default.split('/').pop();
  const [svgName] = fileName.split('.');
  return svgName;
});

// 渲染 svg 组件
{iconUrls.map((item) => (
  <SvgIcon name={item} key={item} width="50" height="50" />
))}
```

最后在 `src/main.tsx` 文件中添加一行代码:

```ts
import 'virtual:svg-icons-register';
```

现在回到浏览器的页面中，发现雪碧图已经生成:

![image-20240320150001364](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403201500418.png)

雪碧图包含了所有图标的具体内容，而对于页面每个具体的图标，则通过 `use` 属性来引用雪碧图的对应内容:

![image-20240320150017382](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403201500863.png)

如此一来就能将所有的 svg 内容都内联到 HTML 中，省去了大量 svg 的网络请求
