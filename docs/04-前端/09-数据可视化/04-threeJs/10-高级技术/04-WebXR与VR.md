---
title: WebXR与VR
description: "WebXR 是 Web 平台的沉浸式技术标准，支持 VR（虚拟现实）和 AR（增强现实）两种模式。Three.js 通过 WebXRManager 实现对 XR 设备的支持。"
keywords: [WebXR与VR]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---


# WebXR 与 VR

WebXR API 允许在浏览器中创建沉浸式 VR（虚拟现实）和 AR（增强现实）体验。Three.js 提供了完整的 WebXR 支持，可以轻松创建跨平台的 XR 应用。

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WebXR 系统架构                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │   Three.js 层    │    │   WebXR API     │    │   XR 设备        │  │
│  │                  │    │                  │    │                  │  │
│  │  • WebGLRenderer │◀──▶│  • XRSession    │◀──▶│  • VR 头显       │  │
│  │  • XRManager     │    │  • XRReference  │    │  • 控制器        │  │
│  │  • Scene/Camera  │    │    Space        │    │  • 手部追踪      │  │
│  │  • Controllers   │    │  • XRFrame      │    │  • AR 设备       │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘  │
│           │                      │                       │              │
│           ▼                      ▼                       ▼              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                       渲染管线                                    │   │
│  │                                                                  │   │
│  │  正常模式：Scene → Camera → Renderer → Screen                    │   │
│  │  XR 模式：Scene → Camera → XRSession → XRDisplay → HMD           │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 核心组件说明

| 组件 | 说明 | 职责 |
|------|------|------|
| **XRSession** | XR 会话 | 管理 XR 体验的生命周期 |
| **XRReferenceSpace** | 参考空间 | 定义坐标系统和边界 |
| **XRFrame** | XR 帧 | 包含每帧的追踪数据 |
| **XRView** | XR 视图 | 表示单个眼睛的视图 |
| **XRInputSource** | 输入源 | 控制器、手部追踪等输入设备 |
| **XRPose** | XR 姿态 | 位置和方向信息 |

## 概述

WebXR 是 Web 平台的沉浸式技术标准，支持 VR（虚拟现实）和 AR（增强现实）两种模式。Three.js 通过 `WebXRManager` 实现对 XR 设备的支持。

### WebXR 模式

| 模式 | 说明 | 特点 |
|------|------|------|
| **immersive-vr** | 沉浸式 VR | 完全沉浸式体验，替代现实世界 |
| **immersive-ar** | 沉浸式 AR | 增强现实，虚拟物体叠加在现实世界 |
| **inline** | 内联模式 | 在页面内显示，无需 XR 设备 |

### 设备支持

| 设备类型 | 支持的模式 | 示例 |
|----------|-----------|------|
| **VR 头显** | immersive-vr | Oculus Quest、HTC Vive、Valve Index |
| **AR 设备** | immersive-ar | 手机 AR、Hololens、Magic Leap |
| **移动设备** | inline | 智能手机、平板电脑 |
| **桌面浏览器** | inline | PC、Mac |

### 浏览器支持

```javascript
// 检测 WebXR 支持
async function checkXRSupport() {
  if ('xr' in navigator) {
    // VR 支持
    const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
    // AR 支持
    const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
    
    console.log('VR 支持:', vrSupported);
    console.log('AR 支持:', arSupported);
    
    return { vr: vrSupported, ar: arSupported };
  }
  console.log('WebXR 不支持');
  return { vr: false, ar: false };
}
```

## WebXR 基础

### 检测 WebXR 支持

```javascript
// 完整的支持检测
async function detectXRFeatures() {
  const features = {
    webXR: 'xr' in navigator,
    vr: false,
    ar: false,
    handTracking: false,
    hitTest: false,
    anchors: false,
    depthSensing: false,
    domOverlay: false,
    lightEstimation: false
  };
  
  if (features.webXR) {
    features.vr = await navigator.xr.isSessionSupported('immersive-vr');
    features.ar = await navigator.xr.isSessionSupported('immersive-ar');
    
    // 检测可选功能
    const session = await navigator.xr.requestSession('immersive-vr', {
      optionalFeatures: [
        'hand-tracking',
        'hit-test',
        'anchors',
        'depth-sensing',
        'dom-overlay',
        'light-estimation'
      ]
    }).catch(() => null);
    
    if (session) {
      features.handTracking = session.enabledFeatures?.includes('hand-tracking') ?? false;
      features.hitTest = session.enabledFeatures?.includes('hit-test') ?? false;
      features.anchors = session.enabledFeatures?.includes('anchors') ?? false;
      features.depthSensing = session.enabledFeatures?.includes('depth-sensing') ?? false;
      features.domOverlay = session.enabledFeatures?.includes('dom-overlay') ?? false;
      features.lightEstimation = session.enabledFeatures?.includes('light-estimation') ?? false;
      await session.end();
    }
  }
  
  return features;
}

// 使用示例
detectXRFeatures().then(features => {
  console.log('XR 功能检测:', features);
});
```

### 初始化 VR

```javascript
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

// ==================== 创建基础场景 ====================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x505050);

const camera = new THREE.PerspectiveCamera(
  70,                                      // FOV
  window.innerWidth / window.innerHeight,  // 宽高比
  0.1,                                     // 近裁剪面
  1000                                     // 远裁剪面
);
camera.position.set(0, 1.6, 3);  // 默认站立高度

const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  alpha: false
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ==================== 启用 XR ====================
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);

// ==================== 添加 VR 按钮 ====================
const vrButton = VRButton.createButton(renderer);
document.body.appendChild(vrButton);

// ==================== 创建场景内容 ====================
// 地板
const floorGeometry = new THREE.PlaneGeometry(10, 10);
const floorMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x888888,
  roughness: 0.8,
  metalness: 0.2
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// 物体
const boxGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const box = new THREE.Mesh(boxGeometry, boxMaterial);
box.position.set(0, 0.15, -1);
box.castShadow = true;
box.receiveShadow = true;
scene.add(box);

// 光源
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

// ==================== XR 动画循环 ====================
// 使用 setAnimationLoop 而非 requestAnimationFrame
renderer.setAnimationLoop((time, frame) => {
  // 更新物体
  box.rotation.x += 0.01;
  box.rotation.y += 0.01;
  
  // 渲染
  renderer.render(scene, camera);
});

// ==================== 窗口调整 ====================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

### 会话生命周期

```javascript
// 监听 XR 会话事件
renderer.xr.addEventListener('sessionstart', (event) => {
  console.log('XR 会话开始');
  const session = renderer.xr.getSession();
  
  // 监听会话结束
  session.addEventListener('end', () => {
    console.log('XR 会话结束');
  });
  
  // 监听可见性变化
  session.addEventListener('visibilitychange', (event) => {
    console.log('可见性变化:', session.visibilityState);
    // visible, visible-blurred, hidden
  });
  
  // 监听输入源变化
  session.addEventListener('inputsourceschange', (event) => {
    console.log('输入源变化');
    console.log('添加:', event.added);
    console.log('移除:', event.removed);
  });
});

renderer.xr.addEventListener('sessionend', () => {
  console.log('XR 会话已结束');
});
```

## VRButton 配置

### 创建 VR 按钮

```javascript
import { VRButton } from 'three/addons/webxr/VRButton.js';

// 基础创建
const vrButton = VRButton.createButton(renderer);
document.body.appendChild(vrButton);

// 自定义样式
vrButton.style.position = 'absolute';
vrButton.style.bottom = '20px';
vrButton.style.left = '50%';
vrButton.style.transform = 'translateX(-50%)';
vrButton.style.padding = '12px 24px';
vrButton.style.fontSize = '16px';
vrButton.style.borderRadius = '8px';
vrButton.style.cursor = 'pointer';
```

### VRButton 配置选项

```javascript
// 完整配置
const vrButton = VRButton.createButton(renderer, {
  // 参考空间类型
  referenceSpaceType: 'local-floor',  // 默认值
  
  // 会话初始化选项
  sessionInit: {
    // 必需功能
    requiredFeatures: ['local-floor'],
    
    // 可选功能
    optionalFeatures: [
      'bounded-floor',   // 边界
      'hand-tracking',   // 手部追踪
      'layers',          // 图层
      'dom-overlay',     // DOM 叠加
      'hit-test',        // 命中测试（AR）
      'anchors',         // 锚点（AR）
      'light-estimation' // 光照估计（AR）
    ],
    
    // DOM 叠加元素（AR）
    domOverlay: {
      root: document.getElementById('overlay')
    }
  }
});

document.body.appendChild(vrButton);
```

### 自定义按钮行为

```javascript
// 手动创建 VR 按钮
async function createCustomVRButton(renderer) {
  const button = document.createElement('button');
  button.textContent = '进入 VR';
  button.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    font-size: 16px;
    background: #000;
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  `;
  
  // 检测支持
  if ('xr' in navigator) {
    const supported = await navigator.xr.isSessionSupported('immersive-vr');
    
    if (supported) {
      button.addEventListener('click', async () => {
        const session = await navigator.xr.requestSession('immersive-vr', {
          requiredFeatures: ['local-floor'],
          optionalFeatures: ['hand-tracking', 'bounded-floor']
        });
        
        renderer.xr.setSession(session);
        
        session.addEventListener('end', () => {
          button.textContent = '进入 VR';
        });
        
        button.textContent = '退出 VR';
      });
    } else {
      button.textContent = 'VR 不支持';
      button.disabled = true;
    }
  } else {
    button.textContent = 'WebXR 不支持';
    button.disabled = true;
  }
  
  return button;
}

const customButton = await createCustomVRButton(renderer);
document.body.appendChild(customButton);
```

## 控制器交互

### XR 控制器基础

```javascript
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

// 获取控制器
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);

// 添加到场景
scene.add(controller1);
scene.add(controller2);

// ==================== 控制器模型 ====================
const controllerModelFactory = new XRControllerModelFactory();

const controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
scene.add(controllerGrip1);

const controllerGrip2 = renderer.xr.getControllerGrip(1);
controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
scene.add(controllerGrip2);

// ==================== 控制器射线 ====================
const geometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, -1)
]);

const lineMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  linewidth: 2
});

const line1 = new THREE.Line(geometry, lineMaterial);
line1.name = 'line';
line1.scale.z = 5;

const line2 = line1.clone();

controller1.add(line1);
controller2.add(line2);
```

### 控制器事件

```javascript
// ==================== 基础事件 ====================
controller1.addEventListener('selectstart', (event) => {
  console.log('控制器 1 选择开始（按下扳机键）');
  const controller = event.target;
  controller.userData.isSelecting = true;
});

controller1.addEventListener('selectend', (event) => {
  console.log('控制器 1 选择结束（释放扳机键）');
  const controller = event.target;
  controller.userData.isSelecting = false;
});

controller1.addEventListener('select', (event) => {
  console.log('控制器 1 选择（点击）');
});

// ==================== 其他事件 ====================
controller1.addEventListener('squeezestart', (event) => {
  console.log('握持开始（按下手柄握持键）');
});

controller1.addEventListener('squeezeend', (event) => {
  console.log('握持结束');
});

controller1.addEventListener('squeeze', (event) => {
  console.log('握持点击');
});

// ==================== 摇杆/触摸板事件 ====================
controller1.addEventListener('connected', (event) => {
  console.log('控制器已连接:', event.data);
  // event.data.hand: "left" | "right" | ""
  // event.data.targetRayMode: "tracked-pointer" | "gaze" | "screen"
  // event.data.profiles: 支持的配置文件
});

controller1.addEventListener('disconnected', (event) => {
  console.log('控制器已断开');
});
```

### 控制器交互实现

```javascript
// ==================== 完整的交互系统 ====================
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();
const intersected = [];
const objects = [];  // 可交互物体列表

// 添加可交互物体
function addInteractiveObject(mesh) {
  objects.push(mesh);
}

// 控制器交互
function handleController(controller) {
  // 设置射线
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
  
  // 检测相交
  const intersects = raycaster.intersectObjects(objects, false);
  
  // 处理高亮
  if (intersects.length > 0) {
    const intersect = intersects[0];
    
    // 高亮
    if (intersected.indexOf(intersect.object) === -1) {
      intersected.push(intersect.object);
      intersect.object.material.emissive.setHex(0x444444);
    }
    
    // 选择
    if (controller.userData.isSelecting) {
      // 拖拽
      if (!controller.userData.selected) {
        controller.attach(intersect.object);
        controller.userData.selected = intersect.object;
      }
    }
  } else {
    // 取消高亮
    intersected.forEach(obj => {
      obj.material.emissive.setHex(0x000000);
    });
    intersected.length = 0;
  }
}

// 释放物体
function onSelectEnd(event) {
  const controller = event.target;
  if (controller.userData.selected) {
    scene.attach(controller.userData.selected);
    controller.userData.selected = undefined;
  }
}

controller1.addEventListener('selectend', onSelectEnd);
controller2.addEventListener('selectend', onSelectEnd);

// ==================== 动画循环 ====================
renderer.setAnimationLoop((time, frame) => {
  handleController(controller1);
  handleController(controller2);
  renderer.render(scene, camera);
});
```

### 控制器可视化

```javascript
// ==================== 自定义控制器模型 ====================
function createControllerModel(controller) {
  const group = new THREE.Group();
  
  // 圆环（表示握持位置）
  const ringGeometry = new THREE.TorusGeometry(0.02, 0.002, 16, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  
  // 射线终点
  const sphereGeometry = new THREE.SphereGeometry(0.01, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.z = -1;
  group.add(sphere);
  
  return group;
}

controller1.add(createControllerModel(controller1));
controller2.add(createControllerModel(controller2));
```

## 手部追踪

### 检测手部追踪支持

```javascript
async function checkHandTrackingSupport() {
  if (!('xr' in navigator)) return false;
  
  const isVRSupported = await navigator.xr.isSessionSupported('immersive-vr');
  
  if (isVRSupported) {
    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['hand-tracking']
      });
      
      const hasHandTracking = session.enabledFeatures?.includes('hand-tracking') ?? false;
      await session.end();
      
      return hasHandTracking;
    } catch (error) {
      console.error('检测手部追踪失败:', error);
      return false;
    }
  }
  
  return false;
}
```

### 使用手部追踪

```javascript
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

const handModelFactory = new XRHandModelFactory();

// ==================== 获取手部追踪 ====================
const hand1 = renderer.xr.getHand(0);  // 左手
const hand2 = renderer.xr.getHand(1);  // 右手

// 添加手部模型
hand1.add(handModelFactory.createHandModel(hand1, 'mesh'));  // mesh | points | spheres
hand2.add(handModelFactory.createHandModel(hand2, 'mesh'));

scene.add(hand1);
scene.add(hand2);

// ==================== 手部事件 ====================
hand1.addEventListener('pinchstart', (event) => {
  console.log('左手捏合开始');
  hand1.userData.isPinching = true;
});

hand1.addEventListener('pinchend', (event) => {
  console.log('左手捏合结束');
  hand1.userData.isPinching = false;
});

hand2.addEventListener('pinchstart', (event) => {
  console.log('右手捏合开始');
});

hand2.addEventListener('pinchend', (event) => {
  console.log('右手捏合结束');
});

// ==================== 手部关节 ====================
// WebXR 定义了 25 个手部关节
const HAND_JOINTS = {
  WRIST: 0,
  THUMB_METACARPAL: 1,
  THUMB_PHALANX_PROXIMAL: 2,
  THUMB_PHALANX_DISTAL: 3,
  THUMB_TIP: 4,
  INDEX_METACARPAL: 5,
  INDEX_PHALANX_PROXIMAL: 6,
  INDEX_PHALANX_INTERMEDIATE: 7,
  INDEX_PHALANX_DISTAL: 8,
  INDEX_TIP: 9,
  MIDDLE_METACARPAL: 10,
  MIDDLE_PHALANX_PROXIMAL: 11,
  MIDDLE_PHALANX_INTERMEDIATE: 12,
  MIDDLE_PHALANX_DISTAL: 13,
  MIDDLE_TIP: 14,
  RING_METACARPAL: 15,
  RING_PHALANX_PROXIMAL: 16,
  RING_PHALANX_INTERMEDIATE: 17,
  RING_PHALANX_DISTAL: 18,
  RING_TIP: 19,
  LITTLE_METACARPAL: 20,
  LITTLE_PHALANX_PROXIMAL: 21,
  LITTLE_PHALANX_INTERMEDIATE: 22,
  LITTLE_PHALANX_DISTAL: 23,
  LITTLE_TIP: 24
};

// 访问特定关节
function getJointPosition(hand, jointIndex) {
  const joint = hand.joints[jointIndex];
  if (joint) {
    return new THREE.Vector3().setFromMatrixPosition(joint.matrixWorld);
  }
  return null;
}

// 获取指尖位置
function getFingerTipPosition(hand) {
  return {
    thumb: getJointPosition(hand, HAND_JOINTS.THUMB_TIP),
    index: getJointPosition(hand, HAND_JOINTS.INDEX_TIP),
    middle: getJointPosition(hand, HAND_JOINTS.MIDDLE_TIP),
    ring: getJointPosition(hand, HAND_JOINTS.RING_TIP),
    little: getJointPosition(hand, HAND_JOINTS.LITTLE_TIP)
  };
}
```

### 手势识别

```javascript
// 简单的手势识别
function detectGesture(hand) {
  const tips = getFingerTipPosition(hand);
  const wrist = getJointPosition(hand, HAND_JOINTS.WRIST);
  
  if (!tips || !wrist) return null;
  
  // 检测握拳
  const isFist = [
    tips.thumb,
    tips.index,
    tips.middle,
    tips.ring,
    tips.little
  ].every(tip => tip && tip.distanceTo(wrist) < 0.1);
  
  if (isFist) return 'fist';
  
  // 检测张开手掌
  const isOpenPalm = [
    tips.thumb,
    tips.index,
    tips.middle,
    tips.ring,
    tips.little
  ].every(tip => tip && tip.distanceTo(wrist) > 0.15);
  
  if (isOpenPalm) return 'open';
  
  // 检测指向
  if (tips.index && tips.index.distanceTo(wrist) > 0.15) {
    const otherFingersClosed = [tips.middle, tips.ring, tips.little]
      .every(tip => tip && tip.distanceTo(wrist) < 0.12);
    
    if (otherFingersClosed) return 'pointing';
  }
  
  // 检测和平手势
  if (tips.index && tips.middle && 
      tips.index.distanceTo(wrist) > 0.15 && 
      tips.middle.distanceTo(wrist) > 0.15) {
    const otherFingersClosed = [tips.thumb, tips.ring, tips.little]
      .every(tip => tip && tip.distanceTo(wrist) < 0.12);
    
    if (otherFingersClosed) return 'peace';
  }
  
  return 'unknown';
}
```

## AR 支持

### 初始化 AR

```javascript
import { ARButton } from 'three/addons/webxr/ARButton.js';

// ==================== 创建 AR 按钮 ====================
const arButton = ARButton.createButton(renderer, {
  // 必需功能
  requiredFeatures: ['hit-test'],
  
  // 可选功能
  optionalFeatures: [
    'dom-overlay',
    'anchors',
    'light-estimation',
    'depth-sensing'
  ],
  
  // DOM 叠加层
  domOverlay: {
    root: document.getElementById('ar-ui')
  }
});

document.body.appendChild(arButton);

// AR 需要透明背景
scene.background = null;
renderer.alpha = true;
```

### AR 命中测试

```javascript
let hitTestSource = null;
let hitTestSourceRequested = false;
let reticle = null;

// ==================== 创建标记点 ====================
function createReticle() {
  const geometry = new THREE.RingGeometry(0.15, 0.2, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    opacity: 0.75,
    transparent: true,
    side: THREE.DoubleSide
  });
  const reticle = new THREE.Mesh(geometry, material);
  reticle.rotation.x = -Math.PI / 2;
  reticle.visible = false;
  return reticle;
}

reticle = createReticle();
scene.add(reticle);

// ==================== AR 渲染循环 ====================
function render(timestamp, frame) {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();
    
    // 请求命中测试源
    if (hitTestSourceRequested === false) {
      session.requestReferenceSpace('viewer').then((viewerSpace) => {
        session.requestHitTestSource({ space: viewerSpace }).then((source) => {
          hitTestSource = source;
        });
      });
      hitTestSourceRequested = true;
    }
    
    // 执行命中测试
    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      
      if (hitTestResults.length) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);
        
        // 更新标记点位置
        reticle.visible = true;
        reticle.position.setFromMatrixPosition(pose.transform.matrix);
        reticle.quaternion.setFromRotationMatrix(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }
  
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(render);

// ==================== 放置物体 ====================
const placedObjects = [];

function placeObject() {
  if (reticle.visible) {
    // 创建物体
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshStandardMaterial({ 
      color: Math.random() * 0xffffff 
    });
    const object = new THREE.Mesh(geometry, material);
    
    // 设置位置
    object.position.copy(reticle.position);
    object.quaternion.copy(reticle.quaternion);
    
    scene.add(object);
    placedObjects.push(object);
  }
}

// 点击控制器时放置
controller1.addEventListener('select', () => {
  placeObject();
});
```

### AR 锚点

```javascript
// 使用锚点固定虚拟物体
let anchor = null;

async function createAnchor(position, orientation) {
  const session = renderer.xr.getSession();
  const referenceSpace = renderer.xr.getReferenceSpace();
  
  if (session && 'anchors' in session) {
    // 创建锚点
    const anchorPose = new XRRigidTransform(
      { x: position.x, y: position.y, z: position.z },
      { x: orientation.x, y: orientation.y, z: orientation.z, w: orientation.w }
    );
    
    anchor = await session.createAnchor(anchorPose, referenceSpace);
    console.log('锚点已创建:', anchor);
    
    return anchor;
  }
  
  return null;
}

// 更新锚点位置
function updateAnchor(frame) {
  if (anchor) {
    const pose = frame.getPose(anchor.anchorSpace, renderer.xr.getReferenceSpace());
    if (pose) {
      // 更新物体位置
      object.position.setFromMatrixPosition(pose.transform.matrix);
    }
  }
}
```

### AR 光照估计

```javascript
let lightProbe = null;
let lightEstimate = null;

// 请求光照估计
async function setupLightEstimation() {
  const session = renderer.xr.getSession();
  
  if (session && 'lightEstimation' in session) {
    try {
      lightProbe = await session.initLightProbe();
      console.log('光照估计已启用');
    } catch (error) {
      console.warn('光照估计不支持:', error);
    }
  }
}

// 更新场景光照
function updateLighting(frame) {
  if (lightProbe) {
    lightEstimate = frame.getLightEstimate(lightProbe);
    
    if (lightEstimate) {
      // 更新环境光
      ambientLight.intensity = lightEstimate.primaryLightIntensity;
      
      // 更新主光源方向
      if (lightEstimate.primaryLightDirection) {
        const direction = lightEstimate.primaryLightDirection;
        directionalLight.position.set(
          direction.x,
          direction.y,
          direction.z
        );
      }
      
      // 更新主光源颜色
      if (lightEstimate.primaryLightColor) {
        const color = lightEstimate.primaryLightColor;
        directionalLight.color.setRGB(
          color.r,
          color.g,
          color.b
        );
      }
      
      // 使用球谐光照数据
      if (lightEstimate.sphericalHarmonicsCoefficients) {
        // 更新环境贴图
        // ...
      }
    }
  }
}
```

## 参考空间

### 参考空间类型

| 类型 | 说明 | 使用场景 |
|------|------|----------|
| **viewer** | 观察者空间 | 以用户当前位置为原点 |
| **local** | 本地空间 | 固定起始位置，可移动 |
| **local-floor** | 本地地板空间 | 站立体验，地板高度为原点 |
| **bounded-floor** | 有边界的地板空间 | 需要在指定区域内移动 |
| **unbounded** | 无界空间 | 大范围移动体验 |

```javascript
// 请求参考空间
async function setupReferenceSpace() {
  const session = renderer.xr.getSession();
  
  // 查看支持的参考空间
  const supportedReferenceSpaces = await session.supportedReferenceSpaces;
  console.log('支持的参考空间:', supportedReferenceSpaces);
  
  // 请求特定参考空间
  const referenceSpace = await session.requestReferenceSpace('local-floor');
  renderer.xr.setReferenceSpace(referenceSpace);
  
  return referenceSpace;
}

// 获取边界
async function getBounds() {
  const session = renderer.xr.getSession();
  
  if (session.enabledFeatures?.includes('bounded-floor')) {
    const boundedSpace = await session.requestReferenceSpace('bounded-floor');
    const bounds = boundedSpace.boundsGeometry;
    
    // bounds 是一个点数组，表示边界多边形
    console.log('边界:', bounds);
    
    return bounds;
  }
  
  return null;
}

// 可视化边界
function visualizeBounds(bounds) {
  if (!bounds) return;
  
  const points = bounds.map(p => new THREE.Vector3(p.x, 0, p.z));
  points.push(points[0]);  // 闭合
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const line = new THREE.Line(geometry, material);
  
  scene.add(line);
}
```

### 设置参考空间

```javascript
// 创建 VR 会话并设置参考空间
async function createVRSession() {
  const session = await navigator.xr.requestSession('immersive-vr', {
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['bounded-floor', 'hand-tracking']
  });
  
  // 设置参考空间
  const referenceSpace = await session.requestReferenceSpace('local-floor');
  renderer.xr.setReferenceSpace(referenceSpace);
  
  // 获取会话信息
  console.log('参考空间类型:', referenceSpace.type);
  
  return session;
}

// 重置参考空间（重置位置）
function resetReferenceSpace() {
  const referenceSpace = renderer.xr.getReferenceSpace();
  const newReferenceSpace = referenceSpace.getOffsetReferenceSpace(
    new XRRigidTransform({ x: 0, y: 0, z: 0 })
  );
  renderer.xr.setReferenceSpace(newReferenceSpace);
}
```

## VR 场景优化

### 优化渲染性能

```javascript
// ==================== 基础优化 ====================
// 降低渲染分辨率
renderer.setPixelRatio(1);  // 不使用设备像素比

// 禁用抗锯齿（或使用低质量）
renderer.antialias = false;

// 限制阴影
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;  // 最简单的阴影

// ==================== 材质优化 ====================
// 使用简化的材质
const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });

// 减少材质复杂度
const simpleMaterial = new THREE.MeshStandardMaterial({
  color: 0x00ff00,
  roughness: 1,
  metalness: 0,
  flatShading: true
});

// ==================== 几何体优化 ====================
// 减少几何体细分
const geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);

// 使用简化的几何体
const sphereGeometry = new THREE.IcosahedronGeometry(0.5, 1);  // 低细分

// ==================== LOD（细节层次）====================
const lod = new THREE.LOD();
lod.addLevel(highDetailMesh, 0);
lod.addLevel(mediumDetailMesh, 5);
lod.addLevel(lowDetailMesh, 10);
lod.addLevel(lowestDetailMesh, 20);
scene.add(lod);

// ==================== 视锥剔除 ====================
// 确保启用视锥剔除（默认启用）
object.frustumCulled = true;

// 计算正确的边界
geometry.computeBoundingBox();
geometry.computeBoundingSphere();
```

### 固定注视点渲染

```javascript
// 检测固定注视点支持
async function checkFixedFoveation() {
  const session = renderer.xr.getSession();
  
  if (session) {
    // 获取支持的帧率
    const supportedFrameRates = await session.supportedFrameRates;
    console.log('支持的帧率:', supportedFrameRates);
    
    // 设置目标帧率
    await session.updateTargetFrameRate(72);
    
    // 固定注视点渲染（如果支持）
    const baseLayer = session.renderState.baseLayer;
    if (baseLayer && 'fixedFoveation' in baseLayer) {
      baseLayer.fixedFoveation = 0.5;  // 0-1，越高越省性能
      console.log('固定注视点已设置');
    }
  }
}
```

### VR 性能监控

```javascript
// ==================== 帧率监控 ====================
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;

renderer.setAnimationLoop((time, frame) => {
  // 计算帧率
  frameCount++;
  if (time - lastTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastTime = time;
    console.log('FPS:', fps);
  }
  
  renderer.render(scene, camera);
});

// ==================== 使用 Stats.js ====================
import Stats from 'stats.js';

const stats = new Stats();
stats.showPanel(0);  // 0: fps, 1: ms, 2: mb
document.body.appendChild(stats.dom);

renderer.setAnimationLoop(() => {
  stats.begin();
  renderer.render(scene, camera);
  stats.end();
});
```

## API 参考

### XRSession

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `enabledFeatures` | Array | 已启用的功能列表 |
| `visibilityState` | String | 可见性状态 |
| `inputSources` | Array | 输入源列表 |
| `renderState` | Object | 渲染状态 |
| `requestReferenceSpace(type)` | Method | 请求参考空间 |
| `requestHitTestSource(options)` | Method | 请求命中测试源 |
| `updateTargetFrameRate(rate)` | Method | 更新目标帧率 |
| `end()` | Method | 结束会话 |

### XRReferenceSpace

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `type` | String | 参考空间类型 |
| `boundsGeometry` | Array | 边界几何数据 |
| `getOffsetReferenceSpace(origin)` | Method | 获取偏移参考空间 |

### XRFrame

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `session` | XRSession | 关联的会话 |
| `getPose(space, baseSpace)` | Method | 获取姿态 |
| `getViewerPose(referenceSpace)` | Method | 获取观察者姿态 |
| `getHitTestResults(hitTestSource)` | Method | 获取命中测试结果 |

### XRInputSource

| 属性 | 类型 | 说明 |
|------|------|------|
| `handedness` | String | "left" \| "right" \| "none" |
| `targetRayMode` | String | "tracked-pointer" \| "gaze" \| "screen" |
| `profiles` | Array | 支持的配置文件 |
| `gripSpace` | XRSpace | 握持空间 |
| `targetRaySpace` | XRSpace | 射线空间 |
| `hand` | XRHand | 手部追踪数据 |

### Three.js WebXRManager

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `enabled` | Boolean | 是否启用 XR |
| `isPresenting` | Boolean | 是否正在呈现 |
| `getSession()` | Method | 获取当前会话 |
| `setSession(session)` | Method | 设置会话 |
| `getReferenceSpace()` | Method | 获取参考空间 |
| `setReferenceSpace(space)` | Method | 设置参考空间 |
| `getController(index)` | Method | 获取控制器 |
| `getControllerGrip(index)` | Method | 获取握持控制器 |
| `getHand(index)` | Method | 获取手部追踪 |

## 配置参数详解

### 会话初始化选项

```javascript
const sessionInit = {
  // 必需功能（缺失会导致创建失败）
  requiredFeatures: [
    'local-floor',  // 地板空间
    'viewer'        // 观察者空间
  ],
  
  // 可选功能（缺失不会导致失败）
  optionalFeatures: [
    'bounded-floor',    // 边界地板
    'hand-tracking',    // 手部追踪
    'layers',           // 图层
    'dom-overlay',      // DOM 叠加
    'hit-test',         // 命中测试
    'anchors',          // 锚点
    'depth-sensing',    // 深度感知
    'light-estimation', // 光照估计
    'mesh-detection'    // 网格检测
  ],
  
  // DOM 叠加配置
  domOverlay: {
    root: document.getElementById('overlay')
  }
};
```

### 渲染状态配置

```javascript
// 更新渲染状态
session.updateRenderState({
  // 基础图层
  baseLayer: new XRWebGLLayer(session, gl, {
    alpha: true,
    antialias: false,
    depth: true,
    stencil: false,
    framebufferScaleFactor: 1.0  // 分辨率缩放
  }),
  
  // 深度/远近裁剪面
  depthNear: 0.1,
  depthFar: 1000.0,
  
  // 内联视图（用于 inline 模式）
  inlineVerticalFieldOfView: Math.PI / 3
});
```

### 控制器配置

```javascript
// 控制器射线配置
const rayConfig = {
  length: 5,           // 射线长度
  color: 0xffffff,     // 射线颜色
  opacity: 0.5,        // 射线透明度
  lineWidth: 2         // 线宽
};

// 创建自定义射线
function createCustomRay(config) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -config.length)
  ]);
  
  const material = new THREE.LineBasicMaterial({
    color: config.color,
    opacity: config.opacity,
    transparent: true
  });
  
  return new THREE.Line(geometry, material);
}
```

## 最佳实践

### 1. 性能优化

```javascript
// 遵循 72 FPS 目标
// - 减少绘制调用
// - 使用 LOD
// - 简化材质
// - 减少后处理
```

### 2. 舒适度

```javascript
// - 避免突然移动
// - 提供移动选项
// - 使用渐变过渡
// - 避免闪烁
```

### 3. 无障碍

```javascript
// - 提供多种交互方式
// - 支持坐姿和站姿
// - 支持手部追踪和控制器
// - 提供视觉反馈
```

### 4. 错误处理

```javascript
async function startVR() {
  try {
    // 检测支持
    if (!('xr' in navigator)) {
      throw new Error('WebXR 不支持');
    }
    
    const supported = await navigator.xr.isSessionSupported('immersive-vr');
    if (!supported) {
      throw new Error('VR 设备未检测到');
    }
    
    // 创建会话
    const session = await navigator.xr.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor']
    });
    
    renderer.xr.setSession(session);
    
  } catch (error) {
    console.error('VR 启动失败:', error);
    // 显示友好的错误信息
    showError(error.message);
  }
}
```

## 常见问题

### Q1: VR 模式无法启动？

**A:** 检查以下问题：

```javascript
// 1. 检测 WebXR 支持
if (!('xr' in navigator)) {
  console.log('浏览器不支持 WebXR');
  console.log('建议使用 Chrome、Edge 或 Firefox Reality');
}

// 2. 检测 VR 设备
const supported = await navigator.xr.isSessionSupported('immersive-vr');
if (!supported) {
  console.log('未检测到 VR 设备');
}

// 3. 检查 HTTPS
if (location.protocol !== 'https:') {
  console.log('WebXR 需要 HTTPS');
}

// 4. 检查 VRButton 是否正确添加
const vrButton = VRButton.createButton(renderer);
if (!document.body.contains(vrButton)) {
  document.body.appendChild(vrButton);
}
```

### Q2: 控制器不显示或不工作？

**A:** 排查步骤：

```javascript
// 1. 确保控制器已添加到场景
const controller1 = renderer.xr.getController(0);
scene.add(controller1);

// 2. 监听连接事件
controller1.addEventListener('connected', (event) => {
  console.log('控制器已连接:', event.data);
});

// 3. 检查 XR 会话状态
renderer.xr.addEventListener('sessionstart', () => {
  console.log('XR 会话已开始');
  // 此时控制器应该可用
});

// 4. 确保渲染器 XR 已启用
renderer.xr.enabled = true;
```

### Q3: 如何处理移动端 VR？

**A:** 移动端可能不支持沉浸式 VR：

```javascript
// 检测设备类型
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// 移动端可能需要不同的处理
if (isMobile) {
  // 检查 Cardboard 支持
  const supported = await navigator.xr.isSessionSupported('immersive-vr');
  
  if (!supported) {
    // 提供 inline 模式作为后备
    console.log('提供普通浏览模式');
  }
}
```

### Q4: 如何实现瞬移移动？

**A:** 瞬移移动实现：

```javascript
// 创建瞬移标记
const teleportMarker = new THREE.Mesh(
  new THREE.CircleGeometry(0.5, 32),
  new THREE.MeshBasicMaterial({ color: 0x00ff00, opacity: 0.5, transparent: true })
);
teleportMarker.rotation.x = -Math.PI / 2;
teleportMarker.visible = false;
scene.add(teleportMarker);

// 监听摇杆输入
let isTeleporting = false;

controller1.addEventListener('selectstart', () => {
  isTeleporting = true;
});

controller1.addEventListener('selectend', () => {
  if (teleportMarker.visible) {
    // 瞬移到目标位置
    const referenceSpace = renderer.xr.getReferenceSpace();
    const offset = new XRRigidTransform({
      x: teleportMarker.position.x,
      y: 0,
      z: teleportMarker.position.z
    });
    renderer.xr.setReferenceSpace(referenceSpace.getOffsetReferenceSpace(offset));
  }
  isTeleporting = false;
  teleportMarker.visible = false;
});

// 更新瞬移标记位置
function updateTeleportMarker(controller) {
  if (!isTeleporting) return;
  
  const raycaster = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();
  
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
  
  const intersects = raycaster.intersectObject(floor);
  
  if (intersects.length > 0) {
    teleportMarker.position.copy(intersects[0].point);
    teleportMarker.visible = true;
  } else {
    teleportMarker.visible = false;
  }
}
```

### Q5: 如何检测用户是否在移动？

**A:** 监听位置变化：

```javascript
let lastPosition = new THREE.Vector3();
const moveThreshold = 0.01;

renderer.setAnimationLoop((time, frame) => {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const pose = frame.getViewerPose(referenceSpace);
    
    if (pose) {
      const position = new THREE.Vector3().setFromMatrixPosition(
        pose.transform.matrix
      );
      
      if (position.distanceTo(lastPosition) > moveThreshold) {
        console.log('用户正在移动');
        // 触发移动事件
      }
      
      lastPosition.copy(position);
    }
  }
  
  renderer.render(scene, camera);
});
```

### Q6: 如何在 VR 中显示 UI？

**A:** 使用 VR 空间中的 3D UI：

```javascript
// 创建 3D UI 面板
function createVRUI() {
  const uiGroup = new THREE.Group();
  
  // 创建画布纹理
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // 绘制 UI
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = 'white';
  ctx.font = '32px Arial';
  ctx.fillText('VR 菜单', 200, 50);
  
  // 按钮绘制
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(50, 100, 200, 50);
  ctx.fillStyle = 'white';
  ctx.fillText('按钮 1', 100, 135);
  
  const texture = new THREE.CanvasTexture(canvas);
  
  // 创建面板
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide
  });
  const panel = new THREE.Mesh(geometry, material);
  
  // 跟随相机
  uiGroup.add(panel);
  uiGroup.position.set(0, 1.5, -2);
  
  return uiGroup;
}

// UI 跟随相机（始终可见）
function updateUIFollowCamera(ui, camera) {
  const cameraPosition = new THREE.Vector3();
  camera.getWorldPosition(cameraPosition);
  
  ui.position.x = cameraPosition.x;
  ui.position.z = cameraPosition.z - 2;
  ui.lookAt(cameraPosition);
}
```

### Q7: 如何处理不同高度的玩家？

**A:** 使用 local-floor 参考空间：

```javascript
// 使用 local-floor 确保地板高度正确
const sessionInit = {
  requiredFeatures: ['local-floor']
};

// 如果设备不支持 local-floor，手动设置高度
renderer.xr.addEventListener('sessionstart', async () => {
  const session = renderer.xr.getSession();
  
  try {
    const referenceSpace = await session.requestReferenceSpace('local-floor');
    renderer.xr.setReferenceSpace(referenceSpace);
  } catch (error) {
    // 使用 local 并手动调整
    const referenceSpace = await session.requestReferenceSpace('local');
    const offset = new XRRigidTransform({ x: 0, y: -1.7, z: 0 });  // 假设平均身高
    renderer.xr.setReferenceSpace(referenceSpace.getOffsetReferenceSpace(offset));
  }
});
```

## 相关链接

- [着色器编程](01-着色器编程.md)
- [后处理效果](02-后处理效果.md)
- [粒子系统](03-粒子系统.md)
- [Three.js 官方文档 - WebXR](https://threejs.org/docs/#api/en/renderers/webxr/WebXRManager)
- [Three.js 官方示例 - WebXR](https://threejs.org/examples/?q=webxr)
- [MDN - WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
- [WebXR Specifications](https://www.w3.org/TR/webxr/)
- [Immersive Web](https://immersive-web.github.io/)
