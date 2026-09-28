---
title: OBJ与其他格式
description: "不同格式有不同的特点和用途。OBJ 是最通用的格式，FBX 支持动画，STL 常用于 3D 打印，PLY 用于点云数据。本文档详细介绍各种格式的加载方法和使用场景。"
keywords: [OBJ与其他格式]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---


# OBJ 与其他格式

除了 GLTF，Three.js 还支持多种 3D 模型格式，包括 OBJ、FBX、STL、PLY 等。

## 概述

不同格式有不同的特点和用途。OBJ 是最通用的格式，FBX 支持动画，STL 常用于 3D 打印，PLY 用于点云数据。本文档详细介绍各种格式的加载方法和使用场景。

## 格式对比

### 功能对比表

| 格式 | 几何体 | 材质 | 纹理 | 动画 | 骨骼 | 压缩 | 文件大小 | 推荐场景 |
|------|:------:|:----:|:----:|:----:|:----:|:----:|:--------:|----------|
| **GLTF** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 中 | Web 3D 开发首选 |
| **GLB** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 小 | Web 3D 部署 |
| **OBJ** | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | 大 | 通用交换格式 |
| **FBX** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 大 | 游戏引擎导入 |
| **STL** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 小 | 3D 打印 |
| **PLY** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 中 | 点云数据 |
| **DAE** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 大 | 游戏开发 |
| **3DS** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 中 | 旧格式迁移 |
| **3MF** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | 小 | 3D 打印 |
| **VRML** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 中 | 旧格式迁移 |

⚠️ OBJ 材质通过 MTL 文件定义

### 格式选择指南

```
需要动画？
├── 是 → GLTF/GLB 或 FBX
│   └── Web 部署？ → GLTF/GLB
│   └── 游戏引擎？ → FBX
└── 否
    ├── 3D 打印？ → STL 或 3MF
    ├── 点云数据？ → PLY
    ├── 通用交换？ → OBJ
    └── Web 部署？ → GLTF/GLB（仍推荐）
```

## OBJ 格式

### OBJLoader 基础

```javascript
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const loader = new OBJLoader();

loader.load(
  'model.obj',
  // 加载完成回调
  (object) => {
    scene.add(object);
    console.log('OBJ 模型加载完成');
  },
  // 加载进度回调
  (xhr) => {
    console.log(`${(xhr.loaded / xhr.total * 100)}% 已加载`);
  },
  // 错误回调
  (error) => {
    console.error('加载失败:', error);
  }
);
```

### 加载 OBJ + MTL

MTL 文件定义 OBJ 模型的材质属性。

```javascript
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

// 先加载 MTL 材质文件
const mtlLoader = new MTLLoader();

mtlLoader.load('model.mtl', (materials) => {
  // 预加载材质
  materials.preload();
  
  // 创建 OBJ 加载器并设置材质
  const objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  
  objLoader.load('model.obj', (object) => {
    scene.add(object);
  });
});
```

### Promise 封装

```javascript
async function loadOBJ(url, mtlUrl = null) {
  if (mtlUrl) {
    // 加载 MTL
    const mtlLoader = new MTLLoader();
    const materials = await new Promise((resolve, reject) => {
      mtlLoader.load(mtlUrl, resolve, undefined, reject);
    });
    
    materials.preload();
    
    // 加载 OBJ
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    
    return new Promise((resolve, reject) => {
      objLoader.load(url, resolve, undefined, reject);
    });
  } else {
    // 只加载 OBJ
    const objLoader = new OBJLoader();
    return new Promise((resolve, reject) => {
      objLoader.load(url, resolve, undefined, reject);
    });
  }
}

// 使用
const object = await loadOBJ('model.obj', 'model.mtl');
scene.add(object);
```

### 处理 OBJ 模型

```javascript
loader.load('model.obj', (object) => {
  // 遍历所有子对象
  object.traverse((child) => {
    if (child.isMesh) {
      // 设置材质
      child.material = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        metalness: 0.5,
        roughness: 0.5
      });
      
      // 启用阴影
      child.castShadow = true;
      child.receiveShadow = true;
      
      // 计算法线（如果模型没有法线）
      if (!child.geometry.attributes.normal) {
        child.geometry.computeVertexNormals();
      }
    }
  });
  
  // 设置位置和缩放
  object.position.set(0, 0, 0);
  object.scale.set(1, 1, 1);
  
  scene.add(object);
});
```

### OBJ 文件格式说明

```
# OBJ 文件示例
# 注释以 # 开头

# 顶点 (v x y z)
v 0.0 0.0 0.0
v 1.0 0.0 0.0
v 1.0 1.0 0.0
v 0.0 1.0 0.0

# 纹理坐标 (vt u v)
vt 0.0 0.0
vt 1.0 0.0
vt 1.0 1.0
vt 0.0 1.0

# 法线 (vn x y z)
vn 0.0 0.0 1.0

# 面 (f v/vt/vn)
f 1/1/1 2/2/1 3/3/1
f 1/1/1 3/3/1 4/4/1

# 材质库引用
mtllib model.mtl

# 使用材质
usemtl material_name
```

## FBX 格式

FBX 是 Autodesk 开发的专有格式，广泛用于游戏开发和 3D 建模软件之间的数据交换。

### FBXLoader 基础

```javascript
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const loader = new FBXLoader();

loader.load('model.fbx', (object) => {
  // 设置阴影
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  
  scene.add(object);
  
  // 播放动画
  if (object.animations && object.animations.length > 0) {
    const mixer = new THREE.AnimationMixer(object);
    const action = mixer.clipAction(object.animations[0]);
    action.play();
    
    object.userData.mixer = mixer;
  }
});
```

### FBX 动画处理

```javascript
let mixer = null;
let actions = [];
let currentAction = null;
const clock = new THREE.Clock();

loader.load('character.fbx', (object) => {
  scene.add(object);
  
  if (object.animations.length > 0) {
    mixer = new THREE.AnimationMixer(object);
    
    // 存储所有动画
    object.animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      actions.push({
        name: clip.name,
        action: action
      });
    });
    
    // 播放第一个动画
    if (actions.length > 0) {
      currentAction = actions[0].action;
      currentAction.play();
    }
    
    object.userData.mixer = mixer;
  }
});

// 切换动画
function switchAnimation(index) {
  if (currentAction) {
    currentAction.fadeOut(0.3);
  }
  
  currentAction = actions[index].action;
  currentAction.reset().fadeIn(0.3).play();
}

// 动画循环
function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  
  renderer.render(scene, camera);
}
```

### FBX 骨骼模型

```javascript
loader.load('character.fbx', (object) => {
  scene.add(object);
  
  // 获取骨骼
  object.traverse((child) => {
    if (child.isSkinnedMesh) {
      console.log('骨骼网格:', child.name);
      
      // 获取骨骼信息
      const skeleton = child.skeleton;
      console.log('骨骼数量:', skeleton.bones.length);
      
      // 骨骼列表
      skeleton.bones.forEach((bone, index) => {
        console.log(`骨骼 ${index}:`, bone.name);
      });
    }
  });
});
```

## STL 格式

STL 是 3D 打印的标准格式，只包含几何体数据，不支持材质、纹理和动画。

### STLLoader 基础

```javascript
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

const loader = new STLLoader();

loader.load('model.stl', (geometry) => {
  // STL 不包含材质，需要手动创建
  const material = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    metalness: 0.3,
    roughness: 0.7
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  scene.add(mesh);
});
```

### STL 二进制和 ASCII 格式

```javascript
// STLLoader 自动识别二进制和 ASCII 格式

// 二进制格式（推荐，文件更小）
loader.load('binary.stl', (geometry) => {
  console.log('顶点数:', geometry.attributes.position.count);
});

// ASCII 格式（可读，文件较大）
loader.load('ascii.stl', (geometry) => {
  console.log('顶点数:', geometry.attributes.position.count);
});
```

### STL 文件格式说明

**ASCII 格式：**
```
solid model_name
  facet normal 0.0 0.0 1.0
    outer loop
      vertex 0.0 0.0 0.0
      vertex 1.0 0.0 0.0
      vertex 1.0 1.0 0.0
    endloop
  endfacet
endsolid model_name
```

**二进制格式：**
- 80 字节头信息
- 4 字节三角形数量
- 每个三角形：50 字节（法线 + 3 顶点 + 属性字节）

### STL 模型处理

```javascript
loader.load('model.stl', (geometry) => {
  // 计算法线（STL 可能没有法线）
  geometry.computeVertexNormals();
  
  // 居中模型
  geometry.center();
  
  // 创建材质
  const material = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    metalness: 0.3,
    roughness: 0.7,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  
  // 计算边界
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());
  
  console.log('模型尺寸:', size);
  
  scene.add(mesh);
});
```

## PLY 格式

PLY（Polygon File Format）常用于点云数据，支持顶点颜色。

### PLYLoader 基础

```javascript
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';

const loader = new PLYLoader();

loader.load('model.ply', (geometry) => {
  // 计算顶点法线
  geometry.computeVertexNormals();
  
  // 创建材质
  const material = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
});
```

### PLY 点云渲染

```javascript
loader.load('points.ply', (geometry) => {
  // 检查是否有顶点颜色
  const hasColors = geometry.hasAttribute('color');
  
  // 创建点材质
  const material = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: hasColors,
    color: hasColors ? 0xffffff : 0x00ff00,
    sizeAttenuation: true
  });
  
  const points = new THREE.Points(geometry, material);
  scene.add(points);
});
```

### PLY 带颜色的网格

```javascript
loader.load('colored.ply', (geometry) => {
  // PLY 可能有顶点颜色
  const hasColors = geometry.hasAttribute('color');
  
  const material = new THREE.MeshStandardMaterial({
    vertexColors: hasColors,
    color: hasColors ? 0xffffff : 0x00ff00,
    side: THREE.DoubleSide
  });
  
  geometry.computeVertexNormals();
  
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
});
```

## 其他格式

### Collada (DAE)

```javascript
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';

const loader = new ColladaLoader();

loader.load('model.dae', (collada) => {
  const model = collada.scene;
  
  // 播放动画
  if (collada.animations && collada.animations.length > 0) {
    const mixer = new THREE.AnimationMixer(model);
    const action = mixer.clipAction(collada.animations[0]);
    action.play();
    
    model.userData.mixer = mixer;
  }
  
  scene.add(model);
});
```

### 3DS

```javascript
import { TDSLoader } from 'three/addons/loaders/TDSLoader.js';

const loader = new TDSLoader();

// 设置资源路径（纹理等）
loader.setResourcePath('/textures/');

loader.load('model.3ds', (object) => {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  
  scene.add(object);
});
```

### 3MF

```javascript
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';

const loader = new ThreeMFLoader();

loader.load('model.3mf', (object) => {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  
  scene.add(object);
});
```

### VRML

```javascript
import { VRMLLoader } from 'three/addons/loaders/VRMLLoader.js';

const loader = new VRMLLoader();

loader.load('model.wrl', (object) => {
  scene.add(object);
});
```

### VTK

```javascript
import { VTKLoader } from 'three/addons/loaders/VTKLoader.js';

const loader = new VTKLoader();

loader.load('model.vtk', (geometry) => {
  geometry.computeVertexNormals();
  
  const material = new THREE.MeshStandardMaterial({
    color: 0x00ff00
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
});
```

## 统一加载管理

### 通用模型加载器

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

class ModelLoader {
  constructor(manager) {
    this.manager = manager;
    this.loaders = {
      gltf: new GLTFLoader(manager),
      obj: new OBJLoader(manager),
      fbx: new FBXLoader(manager),
      stl: new STLLoader(manager),
      ply: new PLYLoader(manager),
      mtl: new MTLLoader(manager)
    };
  }
  
  async load(url, options = {}) {
    const extension = url.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'glb':
      case 'gltf':
        return this.loadGLTF(url);
      case 'obj':
        return this.loadOBJ(url, options.mtlUrl);
      case 'fbx':
        return this.loadFBX(url);
      case 'stl':
        return this.loadSTL(url, options.materialOptions);
      case 'ply':
        return this.loadPLY(url, options.asPoints);
      default:
        throw new Error(`不支持的格式: ${extension}`);
    }
  }
  
  async loadGLTF(url) {
    const gltf = await new Promise((resolve, reject) => {
      this.loaders.gltf.load(url, resolve, undefined, reject);
    });
    return {
      scene: gltf.scene,
      animations: gltf.animations,
      cameras: gltf.cameras
    };
  }
  
  async loadOBJ(url, mtlUrl = null) {
    if (mtlUrl) {
      const materials = await new Promise((resolve, reject) => {
        this.loaders.mtl.load(mtlUrl, resolve, undefined, reject);
      });
      materials.preload();
      this.loaders.obj.setMaterials(materials);
    }
    
    const object = await new Promise((resolve, reject) => {
      this.loaders.obj.load(url, resolve, undefined, reject);
    });
    
    return { scene: object };
  }
  
  async loadFBX(url) {
    const object = await new Promise((resolve, reject) => {
      this.loaders.fbx.load(url, resolve, undefined, reject);
    });
    
    return {
      scene: object,
      animations: object.animations || []
    };
  }
  
  async loadSTL(url, materialOptions = {}) {
    const geometry = await new Promise((resolve, reject) => {
      this.loaders.stl.load(url, resolve, undefined, reject);
    });
    
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      metalness: 0.3,
      roughness: 0.7,
      ...materialOptions
    });
    
    return {
      scene: new THREE.Mesh(geometry, material)
    };
  }
  
  async loadPLY(url, asPoints = false) {
    const geometry = await new Promise((resolve, reject) => {
      this.loaders.ply.load(url, resolve, undefined, reject);
    });
    
    geometry.computeVertexNormals();
    
    const hasColors = geometry.hasAttribute('color');
    
    let object;
    if (asPoints) {
      const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: hasColors,
        sizeAttenuation: true
      });
      object = new THREE.Points(geometry, material);
    } else {
      const material = new THREE.MeshStandardMaterial({
        vertexColors: hasColors,
        side: THREE.DoubleSide
      });
      object = new THREE.Mesh(geometry, material);
    }
    
    return { scene: object };
  }
}

// 使用示例
const modelLoader = new ModelLoader();

async function loadModels() {
  const models = await Promise.all([
    modelLoader.load('model.glb'),
    modelLoader.load('model.obj', { mtlUrl: 'model.mtl' }),
    modelLoader.load('model.fbx'),
    modelLoader.load('model.stl', { materialOptions: { color: 0xff0000 } }),
    modelLoader.load('points.ply', { asPoints: true })
  ]);
  
  models.forEach((model, i) => {
    model.scene.position.x = i * 3;
    scene.add(model.scene);
    
    // 处理动画
    if (model.animations && model.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(model.scene);
      model.animations.forEach(clip => {
        mixer.clipAction(clip).play();
      });
      model.scene.userData.mixer = mixer;
    }
  });
}
```

## API 参考

### OBJLoader

| 方法 | 参数 | 说明 |
|------|------|------|
| `load(url, onLoad, onProgress, onError)` | string, Function, Function, Function | 加载 OBJ 模型 |
| `setMaterials(materials)` | MTLLoader.MaterialCreator | 设置 MTL 材质 |
| `setPath(path)` | string | 设置基础路径 |

### MTLLoader

| 方法 | 参数 | 说明 |
|------|------|------|
| `load(url, onLoad, onProgress, onError)` | string, Function, Function, Function | 加载 MTL 材质 |
| `setPath(path)` | string | 设置基础路径 |
| `setMaterialOptions(options)` | Object | 设置材质选项 |

### FBXLoader

| 方法 | 参数 | 说明 |
|------|------|------|
| `load(url, onLoad, onProgress, onError)` | string, Function, Function, Function | 加载 FBX 模型 |
| `setPath(path)` | string | 设置基础路径 |

### STLLoader

| 方法 | 参数 | 说明 |
|------|------|------|
| `load(url, onLoad, onProgress, onError)` | string, Function, Function, Function | 加载 STL 模型 |

### PLYLoader

| 方法 | 参数 | 说明 |
|------|------|------|
| `load(url, onLoad, onProgress, onError)` | string, Function, Function, Function | 加载 PLY 模型 |
| `setPropertyNameMapping(mapping)` | Object | 设置属性名映射 |

## 常见问题

### Q: OBJ 模型没有材质？

**A:** OBJ 格式本身不包含材质，需要配合 MTL 文件：

```javascript
// 方式1：加载 OBJ + MTL
const mtlLoader = new MTLLoader();
mtlLoader.load('model.mtl', (materials) => {
  materials.preload();
  
  const objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.load('model.obj', (object) => {
    scene.add(object);
  });
});

// 方式2：手动设置材质
objLoader.load('model.obj', (object) => {
  object.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({
        color: 0x00ff00
      });
    }
  });
  scene.add(object);
});
```

### Q: FBX 模型加载很慢？

**A:** FBX 文件通常较大，建议：

```javascript
// 1. 显示加载进度
loader.load('model.fbx', 
  (object) => { scene.add(object); },
  (xhr) => { console.log(`${xhr.loaded / xhr.total * 100}%`); }
);

// 2. 转换为 GLTF 格式（推荐）
// 使用 Blender 或其他工具将 FBX 转换为 GLTF

// 3. 使用压缩
// 转换时启用 DRACO 压缩
```

### Q: STL 模型渲染不正常？

**A:** STL 只有几何数据，需要正确设置：

```javascript
loader.load('model.stl', (geometry) => {
  // 计算法线
  geometry.computeVertexNormals();
  
  // 可能需要翻转法线
  geometry.scale(1, 1, -1);
  
  // 使用双面材质
  const material = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
});
```

### Q: 如何选择合适的格式？

**A:** 根据使用场景选择：

| 场景 | 推荐格式 | 原因 |
|------|---------|------|
| Web 3D 应用 | GLTF/GLB | 最完整支持，性能最优 |
| 3D 打印 | STL/3MF | 行业标准格式 |
| 点云处理 | PLY | 支持顶点颜色 |
| 游戏开发 | FBX | 支持骨骼动画 |
| 通用交换 | OBJ | 广泛支持 |
| 遗留项目 | DAE/3DS | 兼容旧格式 |

### Q: PLY 点云颜色不显示？

**A:** 确保正确设置顶点颜色：

```javascript
loader.load('points.ply', (geometry) => {
  console.log('颜色属性:', geometry.hasAttribute('color'));
  
  const material = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: geometry.hasAttribute('color'),  // 关键
    sizeAttenuation: true
  });
  
  const points = new THREE.Points(geometry, material);
  scene.add(points);
});
```

### Q: 如何将其他格式转换为 GLTF？

**A:** 使用 Blender 或命令行工具：

```bash
# 使用 Blender Python API
blender --background --python-expr "
import bpy
bpy.ops.import_scene.obj(filepath='model.obj')
bpy.ops.export_scene.gltf(filepath='model.glb')
"

# 使用 obj2gltf
npm install -g obj2gltf
obj2gltf -i model.obj -o model.glb

# 使用 FBX2glTF
FBX2glTF model.fbx model.glb
```

## 最佳实践

1. **优先使用 GLTF**：功能最完整，性能最优
2. **压缩模型**：使用 DRACO 压缩减小文件大小
3. **合理 LOD**：根据距离使用不同精度模型
4. **异步加载**：避免阻塞主线程
5. **错误处理**：完善的加载失败处理
6. **格式转换**：旧格式项目迁移到 GLTF

## 相关链接

- [GLTF 加载](01-GLTF加载.md)
- [模型优化](03-模型优化.md)
- [Three.js 官方文档 - Loaders](https://threejs.org/docs/#examples/en/loaders/)
