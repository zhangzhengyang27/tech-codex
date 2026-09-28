---
title: GLTF加载
description: "GLTF（GL Transmission Format）是 Three.js 推荐的 3D 模型格式，支持几何体、材质、纹理、动画、骨骼等完整特性。"
keywords: [GLTF加载]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---


# GLTF 加载

GLTF（GL Transmission Format）是 Three.js 推荐的 3D 模型格式，支持几何体、材质、纹理、动画、骨骼等完整特性。

## 概述

GLTF 是一种开放的 3D 模型标准，由 Khronos Group 制定，具有高效、完整、跨平台等特点，是 Web 3D 开发的首选格式。

## GLTF 格式说明

### GLTF vs GLB

| 特性 | GLTF (.gltf) | GLB (.glb) |
|------|-------------|------------|
| **文件结构** | JSON + 外部资源 | 二进制单文件 |
| **资源引用** | 外部纹理、二进制文件 | 资源内嵌 |
| **文件数量** | 多文件 | 单文件 |
| **文件大小** | 较大（未压缩） | 较小 |
| **编辑便利** | 易于编辑 JSON | 需工具编辑 |
| **网络传输** | 多次请求 | 单次请求 |
| **推荐场景** | 开发调试 | 生产部署 |

### GLTF 文件结构

```
model.gltf (JSON 文件)
├── scenes        # 场景数组
├── nodes         # 节点数组（变换层级）
├── meshes        # 网格数组
├── materials     # 材质数组
├── textures      # 纹理数组
├── images        # 图像数组
├── skins         # 骨骼蒙皮数组
├── animations    # 动画数组
├── cameras       # 相机数组
├── accessors     # 访问器数组（数据引用）
├── bufferViews   # 缓冲区视图数组
├── buffers       # 缓冲区数组（二进制数据）
└── asset         # 元数据

model.bin        # 二进制数据（可选）
textures/        # 纹理文件夹（可选）
├── diffuse.png
├── normal.png
└── ...
```

### GLTF 支持的特性

| 特性 | 支持状态 | 说明 |
|------|---------|------|
| 几何体 | ✅ | 支持索引和非索引几何体 |
| PBR 材质 | ✅ | Metal-Roughness 工作流 |
| 纹理 | ✅ | 所有标准贴图类型 |
| 动画 | ✅ | 变换、形变、骨骼动画 |
| 骨骼蒙皮 | ✅ | 完整支持 |
| 变形目标 | ✅ | Morph Targets |
| 相机 | ✅ | 透视和正交相机 |
| 光源 | ✅ | 扩展支持 |
| 实例化 | ✅ | 通过扩展支持 |

## GLTFLoader 基础

### 加载 GLTF 模型

```javascript
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 创建加载器
const loader = new GLTFLoader();

// 加载模型
loader.load(
  'model.glb',
  // 加载完成回调
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);
    
    console.log('模型加载完成');
    console.log('动画数量:', gltf.animations.length);
    console.log('相机数量:', gltf.cameras.length);
  },
  // 加载进度回调
  (xhr) => {
    console.log(`${(xhr.loaded / xhr.total * 100)}% 已加载`);
  },
  // 加载错误回调
  (error) => {
    console.error('模型加载失败:', error);
  }
);
```

### 使用 Promise 封装

```javascript
function loadGLTF(url) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(url, resolve, undefined, reject);
  });
}

// 使用 async/await
async function loadModel() {
  try {
    const gltf = await loadGLTF('model.glb');
    scene.add(gltf.scene);
  } catch (error) {
    console.error('加载失败:', error);
  }
}

// 并行加载多个模型
async function loadMultipleModels() {
  const models = await Promise.all([
    loadGLTF('model1.glb'),
    loadGLTF('model2.glb'),
    loadGLTF('model3.glb')
  ]);
  
  models.forEach((gltf, i) => {
    gltf.scene.position.x = i * 3;
    scene.add(gltf.scene);
  });
}
```

## GLTF 结构

### 返回对象

```javascript
loader.load('model.glb', (gltf) => {
  // gltf 对象包含以下属性：
  
  // 1. scene - 默认场景（THREE.Group）
  const model = gltf.scene;
  
  // 2. scenes - 所有场景数组
  const scenes = gltf.scenes;
  
  // 3. cameras - 相机数组
  const cameras = gltf.cameras;
  
  // 4. animations - 动画片段数组
  const animations = gltf.animations;
  
  // 5. asset - 元数据
  const asset = gltf.asset;
  console.log('版本:', asset.version);
  console.log('生成器:', asset.generator);
  
  // 6. parser - 解析器（高级用途）
  const parser = gltf.parser;
  
  // 7. userData - 自定义数据
  const userData = gltf.userData;
});
```

### 遍历模型

```javascript
loader.load('model.glb', (gltf) => {
  const model = gltf.scene;
  
  // 遍历所有子对象
  model.traverse((child) => {
    if (child.isMesh) {
      console.log('网格:', child.name);
      console.log('几何体:', child.geometry);
      console.log('材质:', child.material);
    }
    
    if (child.isLight) {
      console.log('光源:', child.name, child.type);
    }
    
    if (child.isCamera) {
      console.log('相机:', child.name);
    }
    
    if (child.isSkinnedMesh) {
      console.log('骨骼网格:', child.name);
    }
    
    if (child.isBone) {
      console.log('骨骼:', child.name);
    }
  });
  
  scene.add(model);
});
```

### 获取特定对象

```javascript
loader.load('model.glb', (gltf) => {
  const model = gltf.scene;
  
  // 按名称查找
  const mesh = model.getObjectByName('Cube');
  
  // 按属性查找
  const meshes = [];
  model.traverse((child) => {
    if (child.isMesh && child.name.includes('Part')) {
      meshes.push(child);
    }
  });
  
  // 按 userData 查找（注意：按严格相等比较，对象字面量无法匹配引用类型）
  const interactive = model.getObjectByProperty('userData', userDataRef);
});
```

## 模型处理

### 设置模型位置和缩放

```javascript
loader.load('model.glb', (gltf) => {
  const model = gltf.scene;
  
  // 设置位置
  model.position.set(0, 0, 0);
  
  // 设置旋转
  model.rotation.set(0, 0, 0);
  // 或使用四元数
  model.quaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0));
  
  // 设置缩放
  model.scale.set(1, 1, 1);
  
  // 或者统一设置
  model.position.y = -1;
  model.scale.multiplyScalar(0.5);
  
  scene.add(model);
});
```

### 调整模型大小

将模型缩放到指定尺寸，并居中。

```javascript
loader.load('model.glb', (gltf) => {
  const model = gltf.scene;
  
  // 计算边界框
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  
  // 计算最大尺寸
  const maxDim = Math.max(size.x, size.y, size.z);
  
  // 缩放到指定大小
  const targetSize = 2;
  const scale = targetSize / maxDim;
  model.scale.multiplyScalar(scale);
  
  // 居中（注意缩放后的中心点）
  model.position.sub(center.multiplyScalar(scale));
  
  scene.add(model);
});
```

### 自动缩放助手函数

```javascript
function autoScale(model, targetSize, center = true) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const boxCenter = box.getCenter(new THREE.Vector3());
  
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = targetSize / maxDim;
  
  model.scale.setScalar(scale);
  
  if (center) {
    model.position.sub(boxCenter.multiplyScalar(scale));
  }
  
  return {
    size: size.clone().multiplyScalar(scale),
    center: boxCenter.clone()
  };
}

// 使用
loader.load('model.glb', (gltf) => {
  autoScale(gltf.scene, 2);
  scene.add(gltf.scene);
});
```

### 修改材质

```javascript
loader.load('model.glb', (gltf) => {
  const model = gltf.scene;
  
  model.traverse((child) => {
    if (child.isMesh) {
      // 修改材质颜色
      child.material.color.setHex(0xff0000);
      
      // 启用阴影
      child.castShadow = true;
      child.receiveShadow = true;
      
      // 修改材质属性
      if (child.material.isMeshStandardMaterial) {
        child.material.metalness = 0.5;
        child.material.roughness = 0.5;
      }
      
      // 完全替换材质
      child.material = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        metalness: 0.5,
        roughness: 0.5
      });
      
      // 克隆材质（避免影响其他对象）
      child.material = child.material.clone();
    }
  });
  
  scene.add(model);
});
```

## 动画处理

### 播放动画

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let mixer;
const clock = new THREE.Clock();

loader.load('model.glb', (gltf) => {
  const model = gltf.scene;
  scene.add(model);
  
  if (gltf.animations.length > 0) {
    // 创建动画混合器
    mixer = new THREE.AnimationMixer(model);
    
    // 播放所有动画
    gltf.animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.play();
    });
    
    console.log('动画列表:', gltf.animations.map(a => a.name));
  }
});

// 在动画循环中更新
function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  
  renderer.render(scene, camera);
}
```

### 切换动画

```javascript
const actions = [];
let currentAction = null;
let mixer = null;

loader.load('model.glb', (gltf) => {
  const model = gltf.scene;
  scene.add(model);
  
  mixer = new THREE.AnimationMixer(model);
  
  // 存储所有动画动作
  gltf.animations.forEach((clip) => {
    const action = mixer.clipAction(clip);
    actions.push({
      name: clip.name,
      action: action,
      clip: clip
    });
  });
  
  model.userData.mixer = mixer;
  model.userData.actions = actions;
  
  // 播放默认动画
  if (actions.length > 0) {
    playAnimation(0);
  }
});

// 平滑切换动画
function playAnimation(index, duration = 0.5) {
  if (currentAction) {
    currentAction.fadeOut(duration);
  }
  
  currentAction = actions[index].action;
  currentAction.reset().fadeIn(duration).play();
}

// 按名称播放动画
function playAnimationByName(name, duration = 0.5) {
  const actionData = actions.find(a => a.name === name);
  if (actionData) {
    if (currentAction) {
      currentAction.fadeOut(duration);
    }
    currentAction = actionData.action;
    currentAction.reset().fadeIn(duration).play();
  }
}

// 获取动画名称列表
function getAnimationNames() {
  return actions.map(a => a.name);
}
```

### 动画控制

```javascript
// 暂停/继续
function togglePause() {
  if (currentAction) {
    currentAction.paused = !currentAction.paused;
  }
}

// 停止
function stopAnimation() {
  if (currentAction) {
    currentAction.stop();
    currentAction = null;
  }
}

// 设置播放速度
function setSpeed(speed) {
  if (currentAction) {
    currentAction.timeScale = speed;
  }
}

// 设置循环模式
function setLoopMode(mode) {
  if (currentAction) {
    // THREE.LoopOnce - 播放一次
    // THREE.LoopRepeat - 循环播放
    // THREE.LoopPingPong - 来回播放
    currentAction.loop = mode;
    currentAction.clampWhenFinished = mode === THREE.LoopOnce;
  }
}

// 跳转到指定时间
function seekTo(time) {
  if (currentAction) {
    currentAction.time = time;
  }
}
```

## 高级加载

### 加载进度管理

```javascript
import { LoadingManager } from 'three';

const loadingManager = new LoadingManager();

loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
  console.log(`开始加载: ${url}`);
  // 显示加载界面
  showLoadingUI();
};

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const progress = itemsLoaded / itemsTotal * 100;
  console.log(`进度: ${progress.toFixed(1)}%`);
  updateProgressBar(progress);
};

loadingManager.onLoad = () => {
  console.log('所有模型加载完成');
  hideLoadingUI();
};

loadingManager.onError = (url) => {
  console.error(`加载错误: ${url}`);
  showErrorMessage(url);
};

// 使用加载管理器
const loader = new GLTFLoader(loadingManager);
```

### 加载带资源的模型

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

const loader = new GLTFLoader();

// 配置 DRACO 解码器（用于压缩模型）
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
dracoLoader.setDecoderConfig({ type: 'wasm' });  // 使用 WASM 更快
loader.setDRACOLoader(dracoLoader);

// 配置 KTX2 解码器（用于压缩纹理）
const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath('/basis/');
ktx2Loader.detectSupport(renderer);
loader.setKTX2Loader(ktx2Loader);

// 设置基础路径
loader.setPath('/models/');

// 加载模型
loader.load('model.glb', (gltf) => {
  scene.add(gltf.scene);
});
```

### 加载器配置

```javascript
const loader = new GLTFLoader();

// 设置资源路径
loader.setPath('/models/');

// 设置跨域
loader.setCrossOrigin('anonymous');

// 设置请求头
loader.setRequestHeader({
  'Authorization': 'Bearer token',
  'Content-Type': 'application/json'
});

// 设置 DRACO 解码器
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
dracoLoader.setDecoderConfig({ type: 'js' });  // 或 'wasm'
loader.setDRACOLoader(dracoLoader);

// 设置 KTX2 解码器
const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath('/basis/');
ktx2Loader.detectSupport(renderer);
loader.setKTX2Loader(ktx2Loader);

// 设置网格优化选项
loader.meshoptDecoder = MeshoptDecoder;  // 需要 Meshopt 解码器
```

## GLTF 扩展

### 常用 GLTF 扩展

| 扩展名 | 说明 |
|--------|------|
| `KHR_draco_mesh_compression` | DRACO 网格压缩 |
| `KHR_materials_pbrSpecularGlossiness` | 高光光泽度材质（已废弃，GLTFLoader r143 起不再支持） |
| `KHR_materials_unlit` | 无光照材质 |
| `KHR_lights_punctual` | 点光源支持 |
| `KHR_texture_transform` | 纹理变换 |
| `KHR_materials_clearcoat` | 清漆材质 |
| `KHR_materials_sheen` | 丝绒材质 |
| `KHR_materials_transmission` | 透射材质 |
| `KHR_materials_volume` | 体积材质 |
| `KHR_materials_ior` | 折射率材质 |
| `KHR_materials_specular` | 高光材质 |
| `EXT_mesh_gpu_instancing` | GPU 实例化 |

### 使用插件

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 注册自定义插件
class CustomExtension {
  constructor(parser) {
    this.parser = parser;
    this.name = 'CustomExtension';
  }
  
  beforeRoot() {
    console.log('解析前');
    return Promise.resolve();
  }
  
  afterRoot(gltf) {
    console.log('解析后', gltf);
    return Promise.resolve();
  }
  
  // 处理特定扩展
  loadMaterial(materialIndex) {
    const parser = this.parser;
    const json = parser.json;
    const materialDef = json.materials[materialIndex];
    
    // 自定义材质处理
    return null;  // 返回 null 使用默认处理
  }
}

const loader = new GLTFLoader();
loader.register(parser => new CustomExtension(parser));

loader.load('model.glb', (gltf) => {
  scene.add(gltf.scene);
});
```

### 加载带光源的模型

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

loader.load('model.glb', (gltf) => {
  const model = gltf.scene;
  
  // 查找光源
  model.traverse((child) => {
    if (child.isLight) {
      console.log('光源类型:', child.type);
      console.log('光源强度:', child.intensity);
      console.log('光源颜色:', child.color);
      
      // 可选：调整光源
      // child.intensity *= 0.5;
    }
  });
  
  scene.add(model);
});
```

## 错误处理

### 常见错误

```javascript
loader.load('model.glb', 
  (gltf) => {
    scene.add(gltf.scene);
  },
  undefined,
  (error) => {
    console.error('加载错误:', error);
    
    // 常见错误处理
    if (error.message) {
      if (error.message.includes('404')) {
        console.error('文件不存在，请检查路径');
      } else if (error.message.includes('Unexpected token')) {
        console.error('文件格式错误，请验证 GLTF 文件');
      } else if (error.message.includes('DRACO')) {
        console.error('DRACO 解码器未配置，请设置 DRACOLoader');
      } else if (error.message.includes('CORS')) {
        console.error('跨域错误，请配置服务器 CORS 头');
      }
    }
    
    // 显示错误提示
    showErrorMessage(error.message);
  }
);
```

### 模型验证

```javascript
function validateGLTF(gltf) {
  const errors = [];
  const warnings = [];
  
  // 验证场景
  if (!gltf.scene) {
    errors.push('模型不包含场景');
    return { valid: false, errors, warnings };
  }
  
  // 验证几何体
  let hasGeometry = false;
  let totalVertices = 0;
  let totalTriangles = 0;
  
  gltf.scene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      hasGeometry = true;
      const geo = child.geometry;
      totalVertices += geo.attributes.position.count;
      if (geo.index) {
        totalTriangles += geo.index.count / 3;
      } else {
        totalTriangles += geo.attributes.position.count / 3;
      }
    }
  });
  
  if (!hasGeometry) {
    errors.push('模型不包含几何体');
  }
  
  // 性能警告
  if (totalVertices > 100000) {
    warnings.push(`顶点数过多 (${totalVertices})，建议优化`);
  }
  
  if (totalTriangles > 50000) {
    warnings.push(`三角形数过多 (${totalTriangles})，建议优化`);
  }
  
  // 验证动画
  if (gltf.animations.length === 0) {
    warnings.push('模型不包含动画');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      vertices: totalVertices,
      triangles: totalTriangles,
      animations: gltf.animations.length,
      cameras: gltf.cameras.length
    }
  };
}

// 使用
loader.load('model.glb', (gltf) => {
  const validation = validateGLTF(gltf);
  
  if (!validation.valid) {
    console.error('验证失败:', validation.errors);
    return;
  }
  
  if (validation.warnings.length > 0) {
    console.warn('警告:', validation.warnings);
  }
  
  console.log('模型统计:', validation.stats);
  scene.add(gltf.scene);
});
```

## 优化加载

### 异步加载

```javascript
async function loadModels() {
  const loader = new GLTFLoader();
  
  // 并行加载多个模型
  const models = await Promise.all([
    loadGLTF('model1.glb'),
    loadGLTF('model2.glb'),
    loadGLTF('model3.glb')
  ]);
  
  models.forEach((gltf, i) => {
    gltf.scene.position.x = i * 3;
    scene.add(gltf.scene);
  });
}

function loadGLTF(url) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(url, resolve, undefined, reject);
  });
}
```

### 预加载与缓存

```javascript
// 模型缓存管理器
class ModelCache {
  constructor() {
    this.cache = new Map();
    this.loader = new GLTFLoader();
  }
  
  async load(url) {
    // 检查缓存
    if (this.cache.has(url)) {
      // 返回克隆的场景
      return {
        scene: this.cache.get(url).scene.clone(),
        animations: this.cache.get(url).animations
      };
    }
    
    // 加载模型
    const gltf = await new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });
    
    // 存入缓存
    this.cache.set(url, gltf);
    
    return {
      scene: gltf.scene.clone(),
      animations: gltf.animations
    };
  }
  
  has(url) {
    return this.cache.has(url);
  }
  
  clear() {
    this.cache.clear();
  }
  
  // 获取缓存大小
  get size() {
    return this.cache.size;
  }
}

// 使用
const modelCache = new ModelCache();

async function init() {
  // 预加载
  await modelCache.load('model1.glb');
  await modelCache.load('model2.glb');
  
  console.log('模型预加载完成');
}

// 使用缓存的模型
const model = await modelCache.load('model1.glb');
scene.add(model.scene);
```

### 懒加载

```javascript
class LazyLoader {
  constructor(options = {}) {
    this.loadDistance = options.loadDistance || 50;
    this.unloadDistance = options.unloadDistance || 100;
    this.models = new Map();
  }
  
  register(id, url, position) {
    this.models.set(id, {
      url,
      position,
      loaded: false,
      object: null
    });
  }
  
  update(camera) {
    const cameraPosition = camera.position;
    
    this.models.forEach((model, id) => {
      const distance = cameraPosition.distanceTo(model.position);
      
      if (!model.loaded && distance < this.loadDistance) {
        this.loadModel(id);
      } else if (model.loaded && distance > this.unloadDistance) {
        this.unloadModel(id);
      }
    });
  }
  
  async loadModel(id) {
    const model = this.models.get(id);
    if (model.loaded) return;
    
    const gltf = await loadGLTF(model.url);
    gltf.scene.position.copy(model.position);
    scene.add(gltf.scene);
    
    model.loaded = true;
    model.object = gltf.scene;
  }
  
  unloadModel(id) {
    const model = this.models.get(id);
    if (!model.loaded) return;
    
    scene.remove(model.object);
    disposeModel(model.object);
    
    model.loaded = false;
    model.object = null;
  }
}
```

## API 参考

### GLTFLoader 类

#### 构造函数

```javascript
new GLTFLoader(manager)
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `manager` | LoadingManager | null | 加载管理器 |

#### 主要方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `load(url, onLoad, onProgress, onError)` | string, Function, Function, Function | void | 加载 GLTF 模型 |
| `loadAsync(url, onProgress)` | string, Function | Promise | 异步加载 |
| `setPath(path)` | string | this | 设置基础路径 |
| `setResourcePath(path)` | string | this | 设置资源路径 |
| `setCrossOrigin(crossOrigin)` | string | this | 设置跨域 |
| `setRequestHeader(headers)` | Object | this | 设置请求头 |
| `setDRACOLoader(dracoLoader)` | DRACOLoader | this | 设置 DRACO 解码器 |
| `setKTX2Loader(ktx2Loader)` | KTX2Loader | this | 设置 KTX2 解码器 |
| `register(callback)` | Function | this | 注册扩展插件 |
| `unregister(callback)` | Function | this | 注销扩展插件 |

### GLTF 返回对象

| 属性 | 类型 | 说明 |
|------|------|------|
| `scene` | Group | 默认场景图 |
| `scenes` | Group[] | 所有场景 |
| `cameras` | Camera[] | 相机数组 |
| `animations` | AnimationClip[] | 动画片段 |
| `asset` | Object | 元数据（version, generator 等） |
| `parser` | Object | GLTF 解析器 |
| `userData` | Object | 自定义数据 |

### DRACOLoader 配置

| 方法 | 说明 |
|------|------|
| `setDecoderPath(path)` | 设置解码器路径 |
| `setDecoderConfig(config)` | 设置解码器配置 ({ type: 'js' \| 'wasm' }) |
| `dispose()` | 释放解码器资源 |

## 常见问题

### Q: 模型加载后看不到？

**A:** 检查以下几点：

```javascript
loader.load('model.glb', (gltf) => {
  const model = gltf.scene;
  
  // 1. 检查模型位置
  const box = new THREE.Box3().setFromObject(model);
  console.log('模型边界:', box);
  
  // 2. 检查相机是否能看到模型
  const center = box.getCenter(new THREE.Vector3());
  console.log('模型中心:', center);
  
  // 3. 可能需要调整相机位置
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  camera.position.set(center.x, center.y, center.z + maxDim * 2);
  camera.lookAt(center);
  
  // 4. 检查是否有材质
  model.traverse((child) => {
    if (child.isMesh) {
      console.log('网格材质:', child.material);
    }
  });
  
  scene.add(model);
});
```

### Q: DRACO 压缩模型加载失败？

**A:** 确保正确配置 DRACO 解码器：

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();

// 方式1：使用 CDN
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

// 方式2：使用本地文件
// 从 three/examples/jsm/libs/draco/ 复制到 public/draco/
dracoLoader.setDecoderPath('/draco/');

// 使用 WASM 版本更快
dracoLoader.setDecoderConfig({ type: 'wasm' });

loader.setDRACOLoader(dracoLoader);
```

### Q: 动画不播放？

**A:** 确保动画混合器在渲染循环中更新：

```javascript
let mixer = null;
const clock = new THREE.Clock();

loader.load('model.glb', (gltf) => {
  scene.add(gltf.scene);
  
  if (gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(gltf.scene);
    
    gltf.animations.forEach((clip) => {
      mixer.clipAction(clip).play();
    });
  }
});

function animate() {
  requestAnimationFrame(animate);
  
  // 必须在渲染循环中更新混合器
  const delta = clock.getDelta();
  if (mixer) {
    mixer.update(delta);
  }
  
  renderer.render(scene, camera);
}
```

### Q: 跨域加载失败？

**A:** 配置服务器 CORS 或使用代理：

```javascript
// 方式1：设置跨域
loader.setCrossOrigin('anonymous');

// 方式2：使用代理
loader.load('/proxy?url=' + encodeURIComponent(externalUrl), ...);

// 方式3：服务器配置（Node.js 示例）
// res.setHeader('Access-Control-Allow-Origin', '*');
```

### Q: 如何获取模型的实际尺寸？

**A:** 使用 Box3 计算边界框：

```javascript
loader.load('model.glb', (gltf) => {
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  
  console.log('模型尺寸:', size.x, size.y, size.z);
  console.log('模型中心:', center.x, center.y, center.z);
  console.log('最大尺寸:', Math.max(size.x, size.y, size.z));
});
```

### Q: 如何导出 GLTF？

**A:** 使用 GLTFExporter：

```javascript
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const exporter = new GLTFExporter();

// 导出为 GLB（二进制）
exporter.parse(
  scene,
  (result) => {
    const blob = new Blob([result], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'model.glb';
    link.click();
  },
  (error) => {
    console.error('导出失败:', error);
  },
  { binary: true }
);
```

## 最佳实践

1. **优先使用 GLB**：生产环境使用 GLB 单文件格式，减少网络请求
2. **启用 DRACO 压缩**：显著减小模型文件大小（可减少 60-80%）
3. **合理 LOD**：为大型场景准备不同精度的模型
4. **预加载关键模型**：提前加载重要资源，提升用户体验
5. **错误处理**：完善的加载失败处理和重试机制
6. **资源释放**：不再使用的模型及时释放内存

## 相关链接

- [OBJ 与其他格式](02-OBJ与其他格式.md)
- [模型优化](03-模型优化.md)
- [Three.js 官方文档 - GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
- [GLTF 规范](https://github.com/KhronosGroup/glTF)
- [gltf-pipeline 工具](https://github.com/CesiumGS/gltf-pipeline)
