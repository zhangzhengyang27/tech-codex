---
title: "Vite 项目大屏适配"
description: "数据可视化大屏适配方案：基于 CSS transform 的 scale() 缩放，封装监听窗口尺寸变化的 Vue 组合式工具函数，保持 1920x1080 设计稿比例自适应。"
keywords: [大屏适配]
category: tools
tags: [Vite, Vue, 大屏适配, 工程化]
---

# Vite 项目大屏适配

## Vite 基于 scale 的适配方案

在 CSS3 中，可以使用 transform 属性的 scale() 方法来实现元素的缩放效果

新建 `resize.ts/js` 文件

```javascript
import { ref } from "vue";

export default function windowResize() {
  // 指向最外层容器
  const screenRef = ref();
  // 定时函数
  const timer = ref(0);
  // 默认缩放值
  const scale = {
    width: "1",
    height: "1",
  };

  // 设计稿尺寸（px）
  const baseWidth = 1920;
  const baseHeight = 1080;

  // 需保持的比例（默认1.77778）
  const baseProportion = parseFloat((baseWidth / baseHeight).toFixed(5));
  const calcRate = () => {
    // 当前宽高比
    const currentRate = parseFloat(
      (window.innerWidth / window.innerHeight).toFixed(5)
    );
    if (screenRef.value) {
      if (currentRate > baseProportion) {
        // 表示更宽
        scale.width = ((window.innerHeight * baseProportion) /baseWidth).toFixed(5);
        scale.height = (window.innerHeight / baseHeight).toFixed(5);
        screenRef.value.style.transform = `scale(${scale.width}, ${scale.height})`;
      } else {
        // 表示更高
        scale.height = (window.innerWidth /baseProportion /baseHeight).toFixed(5);
        scale.width = (window.innerWidth / baseWidth).toFixed(5);
        screenRef.value.style.transform = `scale(${scale.width}, ${scale.height})`;
      }
    }
  };

  const resize = () => {
    clearTimeout(timer.value);
    timer.value = window.setTimeout(() => {
      calcRate();
    }, 200);
  };

  // 改变窗口大小重新绘制
  const windowDraw = () => {
    window.addEventListener("resize", resize);
  };

  // 移除 resize 监听
  const unWindowDraw = () => {
    window.removeEventListener("resize", resize);
  };

  return {
    screenRef,
    calcRate,
    windowDraw,
    unWindowDraw,
  };
}
```

相关界面引入 `resize.ts/js`

```vue
<template>
    <div class="screen-container">
        <div class="screen-content" ref="screenRef">
            <span class="screen-title">基于scale的适配方案</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import windowResize from '../../utils/resize';
import {onMounted, onUnmounted} from 'vue';

const { screenRef, calcRate, windowDraw, unWindowDraw } = windowResize()

onMounted(() => {
    // 监听浏览器窗口尺寸变化
    windowDraw()
    calcRate()
})

onUnmounted(() => {
    unWindowDraw();
})

</script>

<style lang="scss" scoped>
.screen-container {
    height: 100%;
    background-color: lightcyan;
    display: flex;
    justify-content: center;
    align-items: center;

    .screen-content {
        width: 1920px;
        height: 1080px;
        background-color: #fff;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;

        .screen-title {
            font-size: 32px;
        }

        .screen-img {
            margin-top: 20px;
        }
    }
}
</style>
```

