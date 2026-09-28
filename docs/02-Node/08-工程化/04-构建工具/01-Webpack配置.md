---
title: Webpack 配置
description: Webpack 的 entry/output、loader、plugin 与优化（分包/缓存）
keywords: [Node.js, 构建, 脚手架, Webpack]
category: Node.js
tags: [Node.js, 工程化]
---







# Webpack 配置

## 介绍

Webpack 是一个静态模块打包工具，用于构建现代 JavaScript 应用程序。

## 安装

```bash
pnpm add webpack webpack-cli -D
```

## 基础配置

创建 `webpack.config.js`：

```javascript
const path = require('path')

module.exports = {
  // 入口
  entry: './src/index.js',
  
  // 输出
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true // 每次构建清理 dist
  },
  
  // 模式
  mode: 'development', // 'production' | 'development' | 'none'
  
  // 模块规则
  module: {
    rules: [
      // JavaScript
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      // TypeScript
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      // CSS
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      // Sass
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      },
      // 图片
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset/resource'
      },
      // 字体
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource'
      }
    ]
  },
  
  // 解析
  resolve: {
    extensions: ['.js', '.ts', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
}
```

## 开发服务器

### 安装

```bash
pnpm add webpack-dev-server -D
```

### 配置

```javascript
module.exports = {
  // ...其他配置
  devServer: {
    static: './dist',
    hot: true,
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
}
```

## 开发/生产环境分离

### webpack.common.js

```javascript
const path = require('path')

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      }
    ]
  }
}
```

### webpack.dev.js

```javascript
const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    static: './dist',
    hot: true
  }
})
```

### webpack.prod.js

```javascript
const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map'
})
```

## 常用插件

### HtmlWebpackPlugin

自动生成 HTML 文件：

```bash
pnpm add html-webpack-plugin -D
```

```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html'
    })
  ]
}
```

### MiniCssExtractPlugin

提取 CSS 到单独文件：

```bash
pnpm add mini-css-extract-plugin -D
```

```javascript
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css'
    })
  ]
}
```

### DefinePlugin

定义环境变量：

```javascript
const { DefinePlugin } = require('webpack')

module.exports = {
  plugins: [
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    })
  ]
}
```

## 性能优化

### 代码分割

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  }
}
```

### 懒加载

```javascript
// 动态导入
import('./module').then(module => {
  module.default()
})
```

### Tree Shaking

确保使用 ES Module 语法，并在 `package.json` 中添加：

```json
{
  "sideEffects": false
}
```

## package.json 脚本

```json
{
  "scripts": {
    "dev": "webpack serve --config webpack.dev.js",
    "build": "webpack --config webpack.prod.js"
  }
}
```
