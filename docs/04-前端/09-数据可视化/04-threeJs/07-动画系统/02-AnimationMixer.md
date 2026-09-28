---
title: AnimationMixer
description: "AnimationMixer 负责调度和混合多个动画片段（AnimationClip），支持从外部模型加载动画或程序化创建动画。"
keywords: [AnimationMixer]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---


# AnimationMixer

AnimationMixer 是 Three.js 动画系统的核心，用于管理和播放复杂的关键帧动画。

## 概述

AnimationMixer 负责调度和混合多个动画片段（AnimationClip），支持从外部模型加载动画或程序化创建动画。

## 架构概览

```
Three.js 动画系统核心架构
│
├── AnimationMixer（动画混合器）
│   ├── 管理动画时间线
│   ├── 处理动画混合
│   └── 调度动画更新
│       │
│       ├── AnimationAction（动画动作）
│       │   ├── 控制播放状态
│       │   ├── 管理播放速度
│       │   └── 处理渐变过渡
│       │
│       └── AnimationClip（动画片段）
│           ├── 包含动画数据
│           └── 由多个轨道组成
│               │
│               └── KeyframeTrack（关键帧轨道）
│                   ├── VectorKeyframeTrack（位置、缩放）
│                   ├── QuaternionKeyframeTrack（旋转）
│                   ├── NumberKeyframeTrack（单个数值）
│                   ├── ColorKeyframeTrack（颜色）
│                   ├── BooleanKeyframeTrack（布尔值）
│                   └── StringKeyframeTrack（字符串）
│
└── 目标对象
    ├── Object3D（任意 3D 对象）
    ├── Bone（骨骼）
    └── Material（材质属性）
```

### 核心概念关系图

```
AnimationMixer
     │
     │ clipAction(clip)
     ▼
AnimationAction ─────────────────┐
     │                           │
     │ play() / stop()           │ 控制
     ▼                           ▼
AnimationClip ──────────────► 目标对象属性
     │                      （位置、旋转、材质等）
     │
     │ 包含
     ▼
KeyframeTrack[] ───► 关键帧数据
```

## 核心类 API 参考

### AnimationMixer

| 方法/属性 | 参数 | 说明 |
|-----------|------|------|
| `constructor(root)` | root: Object3D | 创建混合器，root 为动画根对象 |
| `clipAction(clip)` | clip: AnimationClip | 返回与片段关联的动作，不存在则创建 |
| `existingAction(clip)` | clip: AnimationClip | 返回已存在的动作，不存在返回 null |
| `stopAllAction()` | - | 停止所有动作 |
| `update(deltaTime)` | deltaTime: Number | 更新动画，通常在渲染循环中调用 |
| `setTime(time)` | time: Number | 设置全局时间 |
| `uncacheClip(clip)` | clip: AnimationClip | 移除片段缓存 |
| `uncacheRoot(root)` | root: Object3D | 移除根对象的所有缓存 |
| `time` | 属性 | 全局时间（秒） |
| `timeScale` | 属性 | 时间缩放因子，默认为 1 |

### AnimationAction

| 方法/属性 | 参数 | 说明 |
|-----------|------|------|
| `play()` | - | 开始播放动画 |
| `stop()` | - | 停止动画 |
| `reset()` | - | 重置动画到初始状态 |
| `fadeIn(duration)` | duration: Number | 渐入效果 |
| `fadeOut(duration)` | duration: Number | 渐出效果 |
| `crossFadeTo(to, duration)` | to: Action, duration: Number | 交叉淡出到另一动作 |
| `crossFadeFrom(from, duration)` | from: Action, duration: Number | 从另一动作交叉淡入 |
| `syncWith(action)` | action: Action | 与另一动作同步 |
| `setEffectiveWeight(weight)` | weight: Number | 设置有效权重 |
| `setEffectiveTimeScale(scale)` | scale: Number | 设置有效时间缩放 |
| `time` | 属性 | 当前播放时间（秒） |
| `timeScale` | 属性 | 播放速度倍数，默认为 1 |
| `weight` | 属性 | 混合权重，0-1 |
| `loop` | 属性 | 循环模式 |
| `repetitions` | 属性 | 循环次数，Infinity 为无限 |
| `clampWhenFinished` | 属性 | 完成时是否停在最后一帧 |

### AnimationClip

| 方法/属性 | 参数 | 说明 |
|-----------|------|------|
| `constructor(name, duration, tracks)` | 名称、持续时间、轨道数组 | 创建动画片段 |
| `resetDuration()` | - | 重置持续时间以匹配轨道 |
| `trim()` | - | 裁剪空白时间 |
| `optimize(tolerance)` | tolerance: Number | 优化关键帧 |
| `name` | 属性 | 片段名称 |
| `duration` | 属性 | 持续时间（秒） |
| `tracks` | 属性 | 关键帧轨道数组 |

### KeyframeTrack 类型

| 类型 | 说明 | 值格式 |
|------|------|--------|
| `VectorKeyframeTrack` | 向量属性（位置、缩放） | [x, y, z, x, y, z, ...] |
| `QuaternionKeyframeTrack` | 四元数旋转 | [x, y, z, w, x, y, z, w, ...] |
| `NumberKeyframeTrack` | 单个数值 | [value1, value2, ...] |
| `ColorKeyframeTrack` | 颜色值 | [r, g, b, r, g, b, ...] |
| `BooleanKeyframeTrack` | 布尔值 | [true, false, ...] |
| `StringKeyframeTrack` | 字符串值 | ['name1', 'name2', ...] |

### 循环模式

| 常量 | 值 | 说明 |
|------|-----|------|
| `THREE.LoopOnce` | 2200 | 播放一次后停止 |
| `THREE.LoopRepeat` | 2201 | 循环播放 |
| `THREE.LoopPingPong` | 2202 | 来回播放 |

## 创建关键帧动画

### 简单关键帧动画

```javascript
import * as THREE from 'three';

// 创建动画对象
const mesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
scene.add(mesh);

// 创建位置关键帧
const positionKF = new THREE.VectorKeyframeTrack(
  '.position',           // 属性路径
  [0, 1, 2, 3, 4],       // 时间（秒）
  [                      // 值（x, y, z）
    0, 0, 0,             // t=0
    2, 0, 0,             // t=1
    2, 2, 0,             // t=2
    0, 2, 0,             // t=3
    0, 0, 0              // t=4
  ]
);

// 创建旋转关键帧
const rotationKF = new THREE.QuaternionKeyframeTrack(
  '.quaternion',
  [0, 2, 4],
  [
    0, 0, 0, 1,          // t=0
    0, 0.707, 0, 0.707,  // t=2 (旋转 90 度)
    0, 0, 0, 1           // t=4
  ]
);

// 创建动画片段
const clip = new THREE.AnimationClip(
  'myAnimation',  // 名称
  4,              // 持续时间
  [positionKF, rotationKF]  // 轨道数组
);

// 创建混合器并播放
const mixer = new THREE.AnimationMixer(mesh);
const action = mixer.clipAction(clip);
action.play();

// 在渲染循环中更新
function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  mixer.update(delta);
  
  renderer.render(scene, camera);
}
```

::: tip
属性路径使用点号语法访问嵌套属性，如 `.position`、`.material.opacity`、`.bones[0].rotation` 等。
:::

### 不同类型的 KeyframeTrack

```javascript
// VectorKeyframeTrack - 用于位置、缩放
const positionTrack = new THREE.VectorKeyframeTrack(
  '.position',
  [0, 1, 2],
  [0, 0, 0, 1, 1, 1, 2, 2, 2]
);

// QuaternionKeyframeTrack - 用于旋转（四元数）
const rotationTrack = new THREE.QuaternionKeyframeTrack(
  '.quaternion',
  [0, 1, 2],
  [0, 0, 0, 1, 0, 0.707, 0, 0.707, 0, 0, 0, 1]
);

// NumberKeyframeTrack - 用于单个数值
const opacityTrack = new THREE.NumberKeyframeTrack(
  '.material.opacity',
  [0, 1, 2],
  [1, 0, 1]
);

// ColorKeyframeTrack - 用于颜色
const colorTrack = new THREE.ColorKeyframeTrack(
  '.material.color',
  [0, 1, 2],
  [1, 0, 0, 0, 1, 0, 0, 0, 1]  // R, G, B
);

// BooleanKeyframeTrack - 用于布尔值
const visibleTrack = new THREE.BooleanKeyframeTrack(
  '.visible',
  [0, 1],
  [true, false]
);

// StringKeyframeTrack - 用于字符串
const nameTrack = new THREE.StringKeyframeTrack(
  '.name',
  [0, 1],
  ['name1', 'name2']
);
```

### 关键帧轨道属性

```javascript
// KeyframeTrack 常用属性
const track = new THREE.VectorKeyframeTrack(
  '.position',
  [0, 1, 2],
  [0, 0, 0, 1, 1, 1, 2, 2, 2]
);

console.log(track.name);       // '.position'
console.log(track.times);      // Float32Array [0, 1, 2]
console.log(track.values);     // Float32Array [0, 0, 0, 1, 1, 1, 2, 2, 2]
console.log(track.createInterpolant()); // 插值器
```

## AnimationAction 控制

### 基本控制

```javascript
const mixer = new THREE.AnimationMixer(object);
const action = mixer.clipAction(clip);

// 播放
action.play();

// 暂停
action.paused = true;

// 停止（保留当前状态）
action.stop();

// 完全重置
action.reset();

// 设置时间
action.time = 1.5;  // 跳到第 1.5 秒

// 设置权重
action.weight = 0.5;  // 混合权重（0-1）

// 设置播放速度
action.timeScale = 2;  // 2 倍速

// 设置循环模式
action.loop = THREE.LoopRepeat;    // 循环播放
action.loop = THREE.LoopOnce;      // 播放一次
action.loop = THREE.LoopPingPong;  // 来回播放

// 循环次数
action.repetitions = Infinity;  // 无限循环
action.repetitions = 3;         // 循环 3 次

// 钳制播放（停止在最后一帧）
action.clampWhenFinished = true;
```

### 渐入渐出

```javascript
// 渐入
action.fadeIn(0.5);  // 0.5 秒渐入

// 渐出
action.fadeOut(0.5);  // 0.5 秒渐出

// 交叉渐变（切换动画）
const action1 = mixer.clipAction(clip1);
const action2 = mixer.clipAction(clip2);

action1.play();
action2.play();

// 从 action1 淡入到 action2
action1.crossFadeTo(action2, 0.5);  // 0.5 秒过渡

// 从 action2 淡入到 action1
action2.crossFadeFrom(action1, 0.5);
```

::: warning
使用交叉渐变时，两个动作都必须处于播放状态（已调用 `play()`）。
:::

### 同步动画

```javascript
// 同步两个动画
const action1 = mixer.clipAction(clip1);
const action2 = mixer.clipAction(clip2);

action1.play();
action2.play();

// action2 与 action1 同步
action2.syncWith(action1);

// 取消同步
action2.unSync();
```

## 动画混合

### 多动画混合原理

```
动画混合示意

权重分配：
┌─────────────────────────────────┐
│   idle (0.3)  +  walk (0.7)    │
│   ────────     ─────────────   │
│   站立姿势    +  行走姿势      │
│           ╲   ╱                │
│            ╲ ╱                 │
│             ▼                  │
│        混合后的姿势            │
│   (0.3×站立 + 0.7×行走)        │
└─────────────────────────────────┘

约束：所有权重的总和应为 1.0
```

### 多动画混合示例

```javascript
const mixer = new THREE.AnimationMixer(object);

// 创建多个动作
const walkAction = mixer.clipAction(walkClip);
const runAction = mixer.clipAction(runClip);
const idleAction = mixer.clipAction(idleClip);

// 播放多个动画并混合
walkAction.play();
runAction.play();

// 设置混合权重
walkAction.weight = 0.5;
runAction.weight = 0.5;

// 动态调整
function updateAnimation(speed) {
  if (speed < 0.5) {
    idleAction.weight = 1 - speed * 2;
    walkAction.weight = speed * 2;
    runAction.weight = 0;
  } else {
    idleAction.weight = 0;
    walkAction.weight = 2 - speed * 2;
    runAction.weight = speed * 2 - 1;
  }
}
```

### 动画层（分层动画）

```javascript
// 上半身动画
const upperBodyMixer = new THREE.AnimationMixer(upperBodyGroup);
const upperBodyAction = upperBodyMixer.clipAction(upperClip);
upperBodyAction.play();

// 下半身动画
const lowerBodyMixer = new THREE.AnimationMixer(lowerBodyGroup);
const lowerBodyAction = lowerBodyMixer.clipAction(lowerClip);
lowerBodyAction.play();

// 更新两个 mixer
function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  upperBodyMixer.update(delta);
  lowerBodyMixer.update(delta);
  
  renderer.render(scene, camera);
}
```

## 从 GLTF 加载动画

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

loader.load('model.glb', (gltf) => {
  const model = gltf.scene;
  scene.add(model);
  
  // 获取动画
  const animations = gltf.animations;
  
  // 创建 mixer
  const mixer = new THREE.AnimationMixer(model);
  
  // 播放第一个动画
  const action = mixer.clipAction(animations[0]);
  action.play();
  
  // 存储引用
  model.userData.mixer = mixer;
  model.userData.actions = animations.map(clip => mixer.clipAction(clip));
  
  // 切换动画
  function playAnimation(index) {
    model.userData.actions.forEach((action, i) => {
      if (i === index) {
        action.reset().fadeIn(0.5).play();
      } else {
        action.fadeOut(0.5);
      }
    });
  }
  
  // 更新 mixer
  function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    model.userData.mixer.update(delta);
    
    renderer.render(scene, camera);
  }
  
  animate();
});
```

::: tip
GLTF 模型的动画名称通常在 3D 建模软件中定义。可通过 `animations.forEach(clip => console.log(clip.name))` 查看所有动画名称。
:::

## 动画事件

### Mixer 事件

```javascript
const mixer = new THREE.AnimationMixer(object);

// 监听动画完成事件
mixer.addEventListener('finished', (event) => {
  console.log('动画完成:', event.action.getClip().name);
});

// 监听动画循环事件
mixer.addEventListener('loop', (event) => {
  console.log('动画循环:', event.action.getClip().name);
});
```

### 自定义动画事件

```javascript
// 通过脚本触发事件
const action = mixer.clipAction(clip);
let eventTriggered = false;

function checkAnimationEvents() {
  const time = action.time;
  
  if (time >= 1 && !eventTriggered) {
    console.log('触发事件');
    eventTriggered = true;
  }
}

// 在渲染循环中检查
function animate() {
  requestAnimationFrame(animate);
  
  mixer.update(clock.getDelta());
  checkAnimationEvents();
  
  renderer.render(scene, camera);
}
```

## 动画曲线编辑

### 插值类型

```
插值类型对比

InterpolateLinear（线性插值）
  ┌──────────────────────────┐
  │        /                 │
  │       /                  │
  │      /                   │
  │     /                    │
  │    /                     │
  │───●─────────●─────────●──│
  └──────────────────────────┘
  关键帧之间直线连接

InterpolateSmooth（平滑插值）
  ┌──────────────────────────┐
  │           __             │
  │         /    \           │
  │       /        \         │
  │     /            \       │
  │   /                \     │
  │──●───────────────────●───│
  └──────────────────────────┘
  使用样条曲线平滑过渡

InterpolateDiscrete（离散插值）
  ┌──────────────────────────┐
  │              ────●       │
  │                          │
  │    ────●                 │
  │                          │
  │                          │
  │──●───────────────────────│
  └──────────────────────────┘
  无插值，直接跳变
```

### 自定义插值

```javascript
// 设置插值类型
const track = new THREE.VectorKeyframeTrack(
  '.position',
  [0, 1, 2],
  [0, 0, 0, 1, 1, 1, 2, 2, 2]
);

// 插值类型
track.setInterpolation(THREE.InterpolateSmooth);   // 平滑插值
track.setInterpolation(THREE.InterpolateLinear);   // 线性插值
track.setInterpolation(THREE.InterpolateDiscrete); // 离散插值（无插值）
```

### 贝塞尔曲线动画

```javascript
function createBezierAnimation(object, points, duration) {
  const curve = new THREE.CubicBezierCurve3(
    points[0],
    points[1],
    points[2],
    points[3]
  );
  
  const frames = 100;
  const times = [];
  const values = [];
  
  for (let i = 0; i <= frames; i++) {
    const t = i / frames;
    times.push(t * duration);
    
    const point = curve.getPoint(t);
    values.push(point.x, point.y, point.z);
  }
  
  const track = new THREE.VectorKeyframeTrack(
    '.position',
    times,
    values
  );
  
  const clip = new THREE.AnimationClip('bezierMove', duration, [track]);
  
  const mixer = new THREE.AnimationMixer(object);
  const action = mixer.clipAction(clip);
  
  return { mixer, action };
}
```

## 动画工具

### AnimationUtils

```javascript
import { AnimationUtils } from 'three';

// 剪辑动画片段（按帧）
const subClip = AnimationUtils.subclip(
  originalClip,   // 原始片段
  'subClip',      // 新名称
  2,              // 开始帧
  5               // 结束帧
);

// 按帧范围裁剪（注意：trim 的参数是帧号而非秒，默认按 30fps 换算）
const trimmedClip = AnimationUtils.trim(
  originalClip,
  30,  // 开始帧
  90   // 结束帧
);
```

### 动画重定向

```javascript
// 将动画应用到不同的骨骼
function retargetAnimation(source, target, clip) {
  const newTracks = [];
  
  clip.tracks.forEach(track => {
    // 转换骨骼名称
    const newTrack = convertTrack(track, source, target);
    if (newTrack) {
      newTracks.push(newTrack);
    }
  });
  
  return new THREE.AnimationClip('retargeted', clip.duration, newTracks);
}
```

## 性能优化

### 减少活跃动画

```javascript
// 只播放可见对象的动画
function updateAnimations() {
  objects.forEach(obj => {
    if (obj.visible) {
      obj.mixer.update(delta);
    }
  });
}
```

### LOD 动画

```javascript
// 根据距离选择不同复杂度的动画
function updateAnimationLOD(camera, objects) {
  objects.forEach(obj => {
    const distance = camera.position.distanceTo(obj.position);
    
    if (distance < 10) {
      obj.activeAction = obj.detailedAction;
    } else if (distance < 30) {
      obj.activeAction = obj.mediumAction;
    } else {
      obj.activeAction = obj.simpleAction;
    }
    
    obj.activeAction.play();
  });
}
```

### 优化关键帧数量

```javascript
// 减少关键帧数量以提升性能
const optimizedClip = clip.clone();
optimizedClip.optimize(0.01);  // 容差值，值越大优化越多
```

## 常见问题解答（FAQ）

### Q: 为什么动画不播放？

**A:** 检查以下几点：
1. 确保在渲染循环中调用了 `mixer.update(delta)`
2. 确保调用了 `action.play()`
3. 检查 `action.weight` 是否大于 0
4. 检查 `action.timeScale` 是否为 0

```javascript
// 调试动画状态
function debugAnimation(mixer, action) {
  console.log('Mixer time:', mixer.time);
  console.log('Action time:', action.time);
  console.log('Action weight:', action.weight);
  console.log('Action timeScale:', action.timeScale);
  console.log('Action paused:', action.paused);
  console.log('Action running:', action.isRunning());
}
```

### Q: 如何实现动画倒放？

**A:** 设置 `timeScale` 为负值：

```javascript
action.timeScale = -1;
action.play();

// 注意：倒放时需要设置初始时间
action.time = action.getClip().duration;
```

### Q: 动画混合时出现抖动怎么办？

**A:** 检查以下几点：
1. 确保所有动画的骨骼结构一致
2. 使用交叉淡变过渡而非直接切换
3. 检查权重归一化是否正确

```javascript
// 归一化权重
function normalizeWeights(actions) {
  const totalWeight = actions.reduce((sum, a) => sum + a.weight, 0);
  if (totalWeight > 0) {
    actions.forEach(a => a.weight /= totalWeight);
  }
}
```

### Q: 如何在动画播放到特定帧时触发事件？

**A:** 使用 `action.time` 监测：

```javascript
let lastTime = 0;

function animate() {
  requestAnimationFrame(animate);
  
  mixer.update(clock.getDelta());
  
  const currentTime = action.time;
  
  // 在第 1 秒触发
  if (lastTime < 1 && currentTime >= 1) {
    console.log('到达 1 秒');
    // 触发自定义事件
  }
  
  lastTime = currentTime;
  
  renderer.render(scene, camera);
}
```

### Q: 如何暂停和恢复动画？

**A:** 使用 `paused` 属性：

```javascript
// 暂停
action.paused = true;

// 恢复
action.paused = false;

// 或使用全局暂停
mixer.timeScale = 0;  // 暂停所有动画
mixer.timeScale = 1;  // 恢复
```

### Q: 如何在动画结束后执行回调？

**A:** 监听 `finished` 事件：

```javascript
// 设置为播放一次
action.loop = THREE.LoopOnce;
action.clampWhenFinished = true;

// 监听完成事件
mixer.addEventListener('finished', (event) => {
  if (event.action === action) {
    console.log('动画播放完成');
    // 执行回调
  }
});
```

## 完整示例

```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 场景设置
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
camera.position.z = 5;

const clock = new THREE.Clock();

// 创建程序化动画对象
const mesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
scene.add(mesh);

// 创建动画
const positionKF = new THREE.VectorKeyframeTrack(
  '.position',
  [0, 1, 2, 3, 4],
  [0, 0, 0, 2, 0, 0, 2, 2, 0, 0, 2, 0, 0, 0, 0]
);

const rotationKF = new THREE.QuaternionKeyframeTrack(
  '.quaternion',
  [0, 2, 4],
  [0, 0, 0, 1, 0, 0.707, 0, 0.707, 0, 0, 0, 1]
);

const scaleKF = new THREE.VectorKeyframeTrack(
  '.scale',
  [0, 1, 2, 3, 4],
  [1, 1, 1, 1.5, 1.5, 1.5, 1, 1, 1, 0.5, 0.5, 0.5, 1, 1, 1]
);

const clip = new THREE.AnimationClip('programmed', 4, [positionKF, rotationKF, scaleKF]);

const mixer = new THREE.AnimationMixer(mesh);
const action = mixer.clipAction(clip);
action.play();

// 控制面板
const gui = {
  play: () => action.play(),
  pause: () => { action.paused = !action.paused; },
  stop: () => action.stop(),
  reset: () => action.reset(),
  speed: 1,
  loop: THREE.LoopRepeat
};

// 更新速度
Object.defineProperty(gui, 'speed', {
  set: (value) => {
    action.timeScale = value;
  }
});

// 光源
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// 动画循环
function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  
  // 更新动画
  mixer.update(delta);
  
  controls.update();
  renderer.render(scene, camera);
}

animate();
```

## 相关链接

- [动画基础](01-动画基础.md)
- [骨骼动画与变形动画](03-骨骼动画与变形动画.md)
- [Three.js 官方文档 - AnimationMixer](https://threejs.org/docs/#api/en/animation/AnimationMixer)
- [Three.js 官方文档 - AnimationClip](https://threejs.org/docs/#api/en/animation/AnimationClip)
- [Three.js 官方文档 - AnimationAction](https://threejs.org/docs/#api/en/animation/AnimationAction)
