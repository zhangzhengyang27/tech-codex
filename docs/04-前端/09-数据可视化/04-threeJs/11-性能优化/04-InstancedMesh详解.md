---
title: InstancedMesh详解
description: "InstancedMesh 是 Three.js 中用于高效渲染大量相同几何体和材质对象的专用类。通过单次 Draw Call 渲染成千上万个实例，它是优化大规模重复对象场景的核心技术。"
keywords: []
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---


# InstancedMesh 实例化渲染

InstancedMesh 是 Three.js 中用于高效渲染大量相同几何体和材质对象的专用类。通过单次 Draw Call 渲染成千上万个实例，它是优化大规模重复对象场景的核心技术。

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    InstancedMesh 渲染原理                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   传统方式（N 个独立 Mesh）：                                             │
│   ┌──────┐ ┌──────┐ ┌──────┐     ┌──────┐                             │
│   │ Mesh │ │ Mesh │ │ Mesh │ ... │ Mesh │  → N 次 Draw Call          │
│   │ #1   │ │ #2   │ │ #3   │     │ #N   │    (性能瓶颈)                │
│   └──┬───┘ └──┬───┘ └──┬───┘     └──┬───┘                             │
│      │        │        │            │                                   │
│      ▼        ▼        ▼            ▼                                   │
│   每个对象独立的 position/rotation/scale/color                          │
│                                                                         │
│   InstancedMesh 方式：                                                   │
│   ┌──────────────────────────────────────────────────┐                  │
│   │              InstancedMesh (1 个)                 │                  │
│   │                                                  │                  │
│   │  共享: Geometry + Material                        │                  │
│   │                                                  │                  │
│   │  实例数据:                                        │                  │
│   │  ┌─────┐ ┌─────┐ ┌─────┐    ┌─────┐             │                  │
│   │  │ Mat0 │ │ Mat1 │ │ Mat2 │... │MatN-1│           │                  │
│   │  └─────┘ └─────┘ └─────┘    └─────┘             │                  │
│   │                                                  │                  │
│   │  颜色数据 (可选):                                │                  │
│   │  ┌─────┐ ┌─────┐ ┌─────┐    ┌─────┐             │                  │
│   │  │Col0 │ │Col1 │ │Col2 │... │ColN-1│             │                  │
│   │  └─────┘ └─────┘ └─────┘    └─────┘             │                  │
│   └──────────────────────┬───────────────────────────┘                  │
│                           │                                              │
│                           ▼                                              │
│                    1 次 Draw Call (GPU 实例化渲染)                       │
│                                                                         │
│   性能提升: N=10000 时，从 ~10000 次降为 1 次 Draw Call               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

数据流向：
JavaScript 设置矩阵/颜色 → GPU Instancing → 单次绘制调用 → 屏幕输出
```

## 概述

### 什么是实例化渲染？

实例化渲染（Instanced Rendering）是一种 GPU 技术，允许在单次绘制调用中渲染同一几何体的多个副本，每个副本可以有不同的变换矩阵、颜色等属性。

### 适用场景

| 场景 | 示例 | 典型数量级 |
|------|------|-----------|
| **森林/植被** | 树木、草丛、花朵 | 1000~100000 |
| **粒子效果** | 雨滴、雪花、火花 | 10000~100000 |
| **建筑群** | 城市、房屋阵列 | 100~10000 |
| **文字/字符** | 3D 文字阵列 | 100~5000 |
| **游戏单位** | 军队、人群模拟 | 100~10000 |
| **数据可视化** | 3D 散点、柱状图 | 100~50000 |
| **物体阵列** | 货架商品、键盘按键 | 50~1000 |

### 不适用场景

| 场景 | 原因 |
|------|------|
| 对象各不相同 | 几何体或材质不同，无法共享 |
| 需要单独射线检测每个对象 | 可以但需要额外处理 |
| 对象数量很少 (< 50) | 开销不值得 |
| 需要对单个实例做复杂动画骨骼 | 不支持 |

## InstancedMesh 基础

### 创建基本实例

```javascript
import * as THREE from 'three'

// 1. 定义共享的几何体和材质
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 })

// 2. 创建 InstancedMesh
// 参数：(geometry, material, count)
const count = 10000
const instancedMesh = new THREE.InstancedMesh(geometry, material, count)

// 3. 添加到场景
scene.add(instancedMesh)

// 4. 设置每个实例的变换矩阵
const dummy = new THREE.Object3D()

for (let i = 0; i < count; i++) {
  // 计算位置（例如：分布在 100x100 的平面上）
  dummy.position.set(
    (Math.random() - 0.5) * 100,
    (Math.random() - 0.5) * 100,
    (Math.random() - 0.5) * 100
  )
  
  // 随机旋转
  dummy.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  )
  
  // 随机缩放
  const scale = 0.5 + Math.random() * 1.5
  dummy.scale.set(scale, scale, scale)
  
  // 更新世界矩阵并应用到实例
  dummy.updateMatrix()
  instancedMesh.setMatrixAt(i, dummy.matrix)
}

// 5. 通知 GPU 数据已更新
instancedMesh.instanceMatrix.needsUpdate = true
```

### 构造参数详解

```javascript
const mesh = new THREE.InstancedMesh(
  geometry,       // BufferGeometry - 所有实例共享的几何体
  material,       // Material 或 Material[] - 共享材质
  count           // Number - 实例数量
)

// 可选属性
mesh.instanceMatrix    // InstancedBufferAttribute - 变换矩阵（4x4，每实例16个float）
mesh.instanceColor     // InstancedBufferAttribute - 实例颜色（可选）
mesh.count              // Number - 当前活跃的实例数（可小于总数）
mesh.frustumCulled      // Boolean - 视锥体剔除（默认 true）
```

### 材质数组支持

```javascript
// 使用多个材质（每个面可以不同材质）
const materials = [
  new THREE.MeshStandardMaterial({ color: 0xff4444 }),  // 右面 (+X)
  new THREE.MeshStandardMaterial({ color: 0x44ff44 }),  // 左面 (-X)
  new THREE.MeshStandardMaterial({ color: 0x4444ff }),  // 顶面 (+Y)
  new THREE.MeshStandardMaterial({ color: 0xffff44 }),  // 底面 (-Y)
  new THREE.MeshStandardMaterial({ color: 0xff44ff }),  // 前面 (+Z)
  new THREE.MeshStandardMaterial({ color: 0x44ffff })   // 后面 (-Z)
]

const instancedMesh = new THREE.InstancedMesh(geometry, materials, 1000)
```

## 矩阵变换

### dummy 对象模式

使用临时 Object3D 来构建矩阵是最常用的方式：

```javascript
const dummy = new THREE.Object3D()

function setInstanceTransform(mesh, index, position, rotation, scale) {
  if (position) dummy.position.copy(position)
  if (rotation) {
    if (rotation.isEuler) {
      dummy.rotation.copy(rotation)
    } else if (rotation.isQuaternion) {
      dummy.quaternion.copy(rotation)
    }
  }
  if (scale) {
    if (typeof scale === 'number') {
      dummy.scale.setScalar(scale)
    } else {
      dummy.scale.copy(scale)
    }
  }
  
  dummy.updateMatrix()
  mesh.setMatrixAt(index, dummy.matrix)
}

// 批量设置
for (let i = 0; i < count; i++) {
  setInstanceTransform(
    instancedMesh,
    i,
    new THREE.Vector3(
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 50
    ),
    new THREE.Euler(Math.random(), Math.random(), Math.random()),
    0.5 + Math.random()
  )
}
```

### 直接操作矩阵

```javascript
const matrix = new THREE.Matrix4()

for (let i = 0; i < count; i++) {
  matrix.makeTranslation(x, y, z)
  matrix.multiply(new THREE.Matrix4().makeRotationY(angle))
  matrix.multiply(new THREE.Matrix4().makeScale(sx, sy, sz))
  
  instancedMesh.setMatrixAt(i, matrix)
}
```

### 从 InstancedMesh 读取矩阵

```javascript
const matrix = new THREE.Matrix4()
const position = new THREE.Vector3()
const quaternion = new THREE.Quaternion()
const scale = new THREE.Vector3()

// 获取第 i 个实例的变换信息
instancedMesh.getMatrixAt(i, matrix)
matrix.decompose(position, quaternion, scale)

console.log('位置:', position)
console.log('旋转:', quaternion)
console.log('缩放:', scale)
```

### 常见排列模式

```javascript
const dummy = new THREE.Object3D()

// ==================== 网格排列 ====================
function gridArrange(mesh, count, spacing = 2) {
  const sideLength = Math.ceil(Math.sqrt(count))
  let idx = 0
  
  for (let x = 0; x < sideLength && idx < count; x++) {
    for (let z = 0; z < sideLength && idx < count; z++) {
      dummy.position.set(
        (x - sideLength / 2) * spacing,
        0,
        (z - sideLength / 2) * spacing
      )
      dummy.updateMatrix()
      mesh.setMatrixAt(idx++, dummy.matrix)
    }
  }
}

// ==================== 球形分布 ====================
function sphereArrange(mesh, count, radius = 10) {
  const phi = Math.PI * (3 - Math.sqrt(5))  // 黄金角
  
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const radiusAtY = Math.sqrt(1 - y * y)
    const theta = phi * i
    
    dummy.position.set(
      Math.cos(theta) * radiusAtY * radius,
      y * radius,
      Math.sin(theta) * radiusAtY * radius
    )
    dummy.lookAt(0, 0, 0)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
}

// ==================== 螺旋排列 ====================
function spiralArrange(mesh, count, radius = 15, height = 10, turns = 5) {
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const angle = t * turns * Math.PI * 2
    const r = radius * (1 - t * 0.5)  // 半径逐渐减小
    
    dummy.position.set(
      Math.cos(angle) * r,
      t * height - height / 2,
      Math.sin(angle) * r
    )
    
    // 让物体朝向螺旋外侧
    dummy.lookAt(dummy.position.clone().multiplyScalar(1.01))
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
}

// ==================== 波浪表面 ====================
function waveSurface(mesh, countX, countZ, spacing = 1, amplitude = 2, frequency = 0.3) {
  let idx = 0
  
  for (let x = 0; x < countX; x++) {
    for (let z = 0; z < countZ; z++) {
      const px = (x - countX / 2) * spacing
      const pz = (z - countZ / 2) * spacing
      const py = Math.sin(px * frequency) * Math.cos(pz * frequency) * amplitude
      
      dummy.position.set(px, py, pz)
      
      // 法线方向作为朝向
      const nx = -Math.cos(px * frequency) * Math.sin(pz * frequency) * amplitude * frequency
      const ny = 1
      const nz = -Math.sin(px * frequency) * Math.cos(pz * frequency) * amplitude * frequency
      dummy.lookAt(px + nx, py + ny, pz + nz)
      
      dummy.updateMatrix()
      mesh.setMatrixAt(idx++, dummy.matrix)
    }
  }
}
```

## 颜色属性

### 设置实例颜色

```javascript
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshStandardMaterial({ vertexColors: true })
const count = 1000
const instancedMesh = new THREE.InstancedMesh(geometry, material, count)

// 启用颜色属性
instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
  new Float32Array(count * 3),  // RGB 各一个 float
  3                            // 每个实例 3 个分量
)

const color = new THREE.Color()

for (let i = 0; i < count; i++) {
  // 随机颜色
  color.setHSL(Math.random(), 0.7, 0.6)
  instancedMesh.setColorAt(i, color)
}

// 必须通知更新
instancedMesh.instanceColor.needsUpdate = true
```

### 渐变色方案

```javascript
// 按位置的渐变
function setColorByPosition(mesh, index, position) {
  const maxDist = 50
  const dist = position.length()
  const t = dist / maxDist
  
  const color = new THREE.Color()
  color.setHSL(t * 0.7, 0.8, 0.55)
  mesh.setColorAt(index, color)
}

// 按高度的渐变
function setColorByHeight(mesh, index, y, minY, maxY) {
  const t = (y - minY) / (maxY - minY)
  const color = new THREE.Color()
  
  // 地面绿色 -> 中间黄色 -> 顶部红色
  if (t < 0.5) {
    color.lerpColors(new THREE.Color(0x228b22), new THREE.Color(0xffd700), t * 2)
  } else {
    color.lerpColors(new THREE.Color(0xffd700), new THREE.Color(0xff4500), (t - 0.5) * 2)
  }
  
  mesh.setColorAt(index, color)
}

// 按索引的彩虹色
function setRainbowColor(mesh, index, total) {
  const color = new THREE.Color()
  color.setHSL(index / total, 0.8, 0.55)
  mesh.setColorAt(index, color)
}
```

### 读取实例颜色

```javascript
const color = new THREE.Color()
instancedMesh.getColorAt(42, color)
console.log('第42个实例的颜色:', color.getHexString())
```

## 自定义属性（着色器）

当需要超出内置矩阵+颜色的自定义属性时，需要使用 ShaderMaterial。

### 自定义 InstancedBufferAttribute

```javascript
const geometry = new THREE.IcosahedronGeometry(0.5, 2)
const count = 2000

// 添加自定义属性
const customData = new Float32Array(count * 2)  // 每个实例 2 个值
const phaseOffset = new Float32Array(count)     // 相位偏移
const scaleAttr = new Float32Array(count)        // 动态缩放因子

for (let i = 0; i < count; i++) {
  customData[i * 2] = Math.random()       // 随机参数 A
  customData[i * 2 + 1] = Math.random()   // 随机参数 B
  phaseOffset[i] = Math.random() * Math.PI * 2
  scaleAttr[i] = 0.5 + Math.random() * 1.5
}

geometry.setAttribute('aCustomData', new THREE.InstancedBufferAttribute(customData, 2))
geometry.setAttribute('aPhaseOffset', new THREE.InstancedBufferAttribute(phaseOffset, 1))
geometry.setAttribute('aScaleFactor', new THREE.InstancedBufferAttribute(scaleAttr, 1))

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uBaseColor: { value: new THREE.Color(0x4488ff) },
    uHighlightColor: { value: new THREE.Color(0xff6644) }
  },
  vertexShader: `
    attribute vec2 aCustomData;
    attribute float aPhaseOffset;
    attribute float aScaleFactor;
    
    uniform float uTime;
    
    varying float vCustomA;
    varying float vCustomB;
    varying float vPulse;
    
    void main() {
      vCustomA = aCustomData.x;
      vCustomB = aCustomData.y;
      
      // 脉冲动画
      vPulse = sin(uTime * 2.0 + aPhaseOffset) * 0.5 + 0.5;
      
      // 应用动态缩放
      vec3 scaledPosition = position * (aScaleFactor + vPulse * 0.3);
      
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(scaledPosition, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uBaseColor;
    uniform vec3 uHighlightColor;
    
    varying float vCustomA;
    varying float vCustomB;
    varying float vPulse;
    
    void main() {
      vec3 color = mix(uBaseColor, uHighlightColor, vPulse);
      color = mix(color, vec3(1.0), vCustomA * 0.3);
      
      float brightness = 0.7 + vCustomB * 0.3 + vPulse * 0.2;
      gl_FragColor = vec4(color * brightness, 1.0);
    }
  `
})

const instancedMesh = new THREE.InstancedMesh(geometry, material, count)

// 在动画循环中更新 uniform
function animate() {
  requestAnimationFrame(animate)
  material.uniforms.uTime.value = performance.now() * 0.001
  renderer.render(scene, camera)
}
```

## 性能对比

### InstancedMesh vs 普通 Mesh

```javascript
// 测试代码框架
function benchmark(scene, method, count) {
  const start = performance.now()
  
  if (method === 'normal') {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(Math.random(), Math.random(), Math.random())
      scene.add(mesh)
    }
  } else if (method === 'instanced') {
    const imesh = new THREE.InstancedMesh(geometry, material, count)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      dummy.position.set(Math.random(), Math.random(), Math.random())
      dummy.updateMatrix()
      imesh.setMatrixAt(i, dummy.matrix)
    }
    scene.add(imesh)
  }
  
  return performance.now() - start
}
```

| 数量 | 普通 Mesh | InstancedMesh | Draw Calls | 内存占用 |
|------|----------|---------------|------------|---------|
| 100 | ~5ms | ~1ms | 100 vs 1 | 高 vs 低 |
| 1,000 | ~30ms | ~2ms | 1000 vs 1 | 很高 vs 低 |
| 10,000 | ~300ms | ~10ms | 10000 vs 1 | 极高 vs 低 |
| 100,000 | 卡顿 | ~80ms | 100000 vs 1 | OOM vs 正常 |

> 注意：实际性能取决于硬件和场景复杂度。以上为参考值。

## 实战：森林场景

```javascript
class ForestScene {
  constructor(scene) {
    this.scene = scene
    this.trees = null
    this.grass = null
    this.rocks = null
    this.flowers = null
  }

  async build() {
    await this.createTrees(500)
    await this.createGrass(20000)
    await this.createRocks(300)
    await this.createFlowers(5000)
  }

  async createTrees(count) {
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.2, 1.5, 8)
    const trunkMat = new THREE.MeshStandardMaterial({ 
      color: 0x8b4513,
      roughness: 0.9 
    })
    
    const leavesGeo = new THREE.ConeGeometry(0.8, 2, 8)
    const leavesMat = new THREE.MeshStandardMaterial({ 
      color: 0x228b22,
      roughness: 0.8 
    })
    
    this.treesTrunk = new THREE.InstancedMesh(trunkGeo, trunkMat, count)
    this.treesLeaves = new THREE.InstancedMesh(leavesGeo, leavesMat, count)
    
    const dummy = new THREE.Object3D()
    const leavesDummy = new THREE.Object3D()
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 100
      const z = (Math.random() - 0.5) * 100
      
      // 树干
      dummy.position.set(x, 0.75, z)
      dummy.scale.setScalar(0.8 + Math.random() * 0.6)
      dummy.rotation.y = Math.random() * Math.PI * 2
      dummy.updateMatrix()
      this.treesTrunk.setMatrixAt(i, dummy.matrix)
      
      // 树冠（在树干上方）
      leavesDummy.position.set(x, 2.2 * dummy.scale.y, z)
      leavesDummy.scale.setScalar(dummy.scale.x * (0.8 + Math.random() * 0.5))
      leavesDummy.rotation.y = dummy.rotation.y
      leavesDummy.updateMatrix()
      this.treesLeaves.setMatrixAt(i, leavesDummy.matrix)
    }
    
    this.treesTrunk.instanceMatrix.needsUpdate = true
    this.treesLeaves.instanceMatrix.needsUpdate = true
    
    // 树冠颜色变化
    this.treesLeaves.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(count * 3), 3
    )
    const color = new THREE.Color()
    for (let i = 0; i < count; i++) {
      color.setHSL(0.28 + Math.random() * 0.08, 0.6 + Math.random() * 0.3, 0.3 + Math.random() * 0.25)
      this.treesLeaves.setColorAt(i, color)
    }
    this.treesLeaves.instanceColor.needsUpdate = true
    
    this.scene.add(this.treesTrunk)
    this.scene.add(this.treesLeaves)
  }

  createGrass(count) {
    const grassGeo = new THREE.PlaneGeometry(0.08, 0.35, 1, 3)
    grassGeo.translate(0, 0.175, 0)  // 将原点移到底部
    
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x3cb371,
      side: THREE.DoubleSide,
      alphaTest: 0.1
    })
    
    this.grass = new THREE.InstancedMesh(grassGeo, grassMat, count)
    this.grass.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(count * 3), 3
    )
    
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 100
      const z = (Math.random() - 0.5) * 100
      
      dummy.position.set(x, 0, z)
      dummy.rotation.y = Math.random() * Math.PI * 2
      dummy.rotation.x = (Math.random() - 0.5) * 0.3  // 轻微倾斜
      dummy.scale.setScalar(0.7 + Math.random() * 0.8)
      dummy.updateMatrix()
      this.grass.setMatrixAt(i, dummy.matrix)
      
      // 草的颜色变化
      color.setHSL(0.28 + Math.random() * 0.06, 0.5 + Math.random() * 0.3, 0.35 + Math.random() * 0.2)
      this.grass.setColorAt(i, color)
    }
    
    this.grass.instanceMatrix.needsUpdate = true
    this.grass.instanceColor.needsUpdate = true
    this.scene.add(this.grass)
  }

  createRocks(count) {
    const rockGeo = new THREE.DodecahedronGeometry(1, 0)
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.95,
      flatShading: true
    })
    
    this.rocks = new THREE.InstancedMesh(rockGeo, rockMat, count)
    
    const dummy = new THREE.Object3D()
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 100
      const z = (Math.random() - 0.5) * 100
      
      dummy.position.set(x, 0, z)
      const s = 0.2 + Math.random() * 0.8
      dummy.scale.set(s, s * (0.5 + Math.random() * 0.5), s)
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      dummy.updateMatrix()
      this.rocks.setMatrixAt(i, dummy.matrix)
    }
    
    this.rocks.instanceMatrix.needsUpdate = true
    this.scene.add(this.rocks)
  }

  createFlowers(count) {
    const flowerGeo = new THREE.CircleGeometry(0.08, 6)
    const flowerMat = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      alphaTest: 0.1
    })
    
    this.flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, count)
    this.flowers.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(count * 3), 3
    )
    
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    
    const flowerColors = [
      0xff69b4, 0xff1493, 0xff6347, 0xffd700, 
      0xda70d6, 0x87ceeb, 0xffffff
    ]
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 100
      const z = (Math.random() - 0.5) * 100
      
      dummy.position.set(x, 0.05 + Math.random() * 0.1, z)
      dummy.rotation.x = -Math.PI / 2  // 面向上方
      dummy.rotation.z = Math.random() * Math.PI * 2
      dummy.scale.setScalar(0.5 + Math.random() * 1.5)
      dummy.updateMatrix()
      this.flowers.setMatrixAt(i, dummy.matrix)
      
      color.setHex(flowerColors[Math.floor(Math.random() * flowerColors.length)])
      this.flowers.setColorAt(i, color)
    }
    
    this.flowers.instanceMatrix.needsUpdate = true
    this.flowers.instanceColor.needsUpdate = true
    this.scene.add(this.flowers)
  }

  getStats() {
    let triangles = 0
    ;[this.treesTrunk, this.treesLeaves, this.grass, this.rocks, this.flowers].forEach(mesh => {
      if (mesh) triangles += mesh.geometry.attributes.position.count / 3 * mesh.count
    })
    
    return {
      trees: this.treesTrunk?.count || 0,
      grass: this.grass?.count || 0,
      rocks: this.rocks?.count || 0,
      flowers: this.flowers?.count || 0,
      totalTriangles: Math.round(triangles),
      drawCalls: [
        this.treesTrunk, this.treesLeaves, this.grass, 
        this.rocks, this.flowers
      ].filter(Boolean).length
    }
  }
}
```

## 实战：粒子网格系统

结合 InstancedMesh 和动画创建高性能粒子效果：

```javascript
class ParticleGridSystem {
  constructor(scene, options = {}) {
    this.scene = scene
    this.count = options.count || 5000
    this.size = options.size || 40
    this.spacing = options.spacing || 1.5
    this.particleMesh = null
    this.clock = new THREE.Clock()
  }

  init() {
    const geometry = new THREE.OctahedronGeometry(0.2, 0)
    const material = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      metalness: 0.3,
      roughness: 0.4,
      emissive: 0x112244,
      emissiveIntensity: 0.5
    })

    this.particleMesh = new THREE.InstancedMesh(geometry, material, this.count)
    
    this.originalPositions = []
    this.phases = []
    this.amplitudes = []
    
    const dummy = new THREE.Object3D()
    const cols = Math.ceil(Math.sqrt(this.count))
    let idx = 0
    
    for (let x = 0; x < cols && idx < this.count; x++) {
      for (let z = 0; z < cols && idx < this.count; z++) {
        const ox = (x - cols / 2) * this.spacing
        const oz = (z - cols / 2) * this.spacing
        
        this.originalPositions.push(new THREE.Vector3(ox, 0, oz))
        this.phases.push(Math.random() * Math.PI * 2)
        this.amplitudes.push(0.5 + Math.random() * 1.5)
        
        dummy.position.set(ox, 0, oz)
        dummy.updateMatrix()
        this.particleMesh.setMatrixAt(idx, dummy.matrix)
        idx++
      }
    }
    
    this.particleMesh.count = idx
    this.particleMesh.instanceMatrix.needsUpdate = true
    
    // 颜色
    this.particleMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(idx * 3), 3
    )
    const color = new THREE.Color()
    for (let i = 0; i < idx; i++) {
      const hue = 0.55 + (this.originalPositions[i].x + this.size / 2) / this.size * 0.2
      color.setHSL(hue, 0.75, 0.55)
      this.particleMesh.setColorAt(i, color)
    }
    this.particleMesh.instanceColor.needsUpdate = true
    
    this.scene.add(this.particleMesh)
  }

  update() {
    const time = this.clock.getElapsedTime()
    const dummy = new THREE.Object3D()
    
    for (let i = 0; i < this.particleMesh.count; i++) {
      const orig = this.originalPositions[i]
      const phase = this.phases[i]
      const amp = this.amplitudes[i]
      
      // 波浪运动
      const wave = Math.sin(time * 1.5 + phase + orig.x * 0.2) * amp
      const wave2 = Math.cos(time * 1.2 + phase + orig.z * 0.15) * amp * 0.5
      
      dummy.position.set(orig.x, wave + wave2, orig.z)
      
      // 旋转
      dummy.rotation.x = time * 0.5 + phase
      dummy.rotation.y = time * 0.3 + phase * 0.7
      
      // 缩放脉动
      const pulseScale = 0.8 + Math.sin(time * 2 + phase) * 0.3
      dummy.scale.setScalar(pulseScale)
      
      dummy.updateMatrix()
      this.particleMesh.setMatrixAt(i, dummy.matrix)
    }
    
    this.particleMesh.instanceMatrix.needsUpdate = true
  }
}
```

## 交互与拾取

### 射线检测 InstancedMesh

```javascript
const raycaster = new THREE.Raycaster()
raycaster.firstHitOnly = true  // 只获取第一个命中

renderer.domElement.addEventListener('click', (event) => {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  )
  
  raycaster.setFromCamera(mouse, camera)
  
  // 检测 InstancedMesh
  const intersects = raycaster.intersectObject(instancedMesh)
  
  if (intersects.length > 0) {
    const hit = intersects[0]
    const instanceId = hit.instanceId  // 命中的实例索引
    
    console.log(`点击了第 ${instanceId} 个实例`)
    
    // 获取被点击实例的位置
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    instancedMesh.getMatrixAt(instanceId, matrix)
    matrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3())
    
    console.log('被点击实例的位置:', position)
    
    // 高亮被点击的实例
    highlightInstance(instancedMesh, instanceId)
  }
})
```

### 高亮选中实例

```javascript
let highlightedId = -1

function highlightInstance(mesh, id) {
  // 恢复之前高亮的实例
  if (highlightedId >= 0 && mesh.instanceColor) {
    const originalColor = new THREE.Color()
    originalColor.setHSL(Math.random(), 0.7, 0.55)
    mesh.setColorAt(highlightedId, originalColor)
  }
  
  // 高亮新的实例
  if (mesh.instanceColor) {
    mesh.setColorAt(id, new THREE.Color(0xffcc00))
    mesh.instanceColor.needsUpdate = true
  }
  
  highlightedId = id
}
```

### 悬停效果

```javascript
let hoveredId = -1

renderer.domElement.addEventListener('mousemove', (event) => {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  )
  
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObject(instancedMesh)
  
  if (hits.length > 0) {
    const newHoveredId = hits[0].instanceId
    
    if (newHoveredId !== hoveredId) {
      // 恢复之前悬停的
      if (hoveredId >= 0) restoreInstanceColor(hoveredId)
      
      hoveredId = newHoveredId
      hoverInstance(hoveredId)
      renderer.domElement.style.cursor = 'pointer'
    }
  } else {
    if (hoveredId >= 0) {
      restoreInstanceColor(hoveredId)
      hoveredId = -1
    }
    renderer.domElement.style.cursor = 'default'
  }
})

function hoverInstance(id) {
  const color = new THREE.Color(0x88ccff)
  instancedMesh.setColorAt(id, color)
  instancedMesh.instanceColor.needsUpdate = true
}

function restoreInstanceColor(id) {
  const color = new THREE.Color()
  color.setHSL((id % 100) / 100, 0.65, 0.55)
  instancedMesh.setColorAt(id, color)
  instancedMesh.instanceColor.needsUpdate = true
}
```

## 动态更新

### 实时修改实例

```javascript
// 更新单个实例
function updateSingleInstance(mesh, index, newPosition) {
  const matrix = new THREE.Matrix4()
  mesh.getMatrixAt(index, matrix)
  
  const pos = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const scl = new THREE.Vector3()
  matrix.decompose(pos, quat, scl)
  
  pos.copy(newPosition)
  matrix.compose(pos, quat, scl)
  
  mesh.setMatrixAt(index, matrix)
  mesh.instanceMatrix.needsUpdate = true
}

// 批量更新（推荐：减少 needsUpdate 调用次数）
function batchUpdateInstances(mesh, updates) {
  const matrix = new THREE.Matrix4()
  
  for (const { index, position, rotation, scale } of updates) {
    mesh.getMatrixAt(index, matrix)
    
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scl = new THREE.Vector3()
    matrix.decompose(pos, quat, scl)
    
    if (position) pos.copy(position)
    if (rotation) {
      if (rotation.isQuaternion) quat.copy(rotation)
      else quat.setFromEuler(rotation)
    }
    if (scale) {
      if (typeof scale === 'number') scl.setScalar(scale)
      else scl.copy(scale)
    }
    
    matrix.compose(pos, quat, scl)
    mesh.setMatrixAt(index, matrix)
  }
  
  mesh.instanceMatrix.needsUpdate = true  // 只调用一次
}
```

### 动态增减实例

```javascript
// 减少可见实例数（不销毁数据）
instancedMesh.count = 500  // 只显示前 500 个实例

// 恢复全部
instancedMesh.count = 10000

// 注意：count 不能超过构造时指定的最大数量
```

## 限制与注意事项

### 1. 共享几何体和材质

所有实例必须共享同一个 Geometry 和 Material：

```javascript
// ✅ 正确：所有实例共享
const mesh = new THREE.InstancedMesh(oneGeometry, oneMaterial, 1000)

// ❌ 错误：不能给不同实例不同的几何体或材质
// 如果需要不同外观，使用颜色或自定义着色器属性
```

### 2. 单独射线检测开销

虽然渲染只需一次 Draw Call，但射线检测仍需遍历所有实例：

```javascript
// 对于大量实例，考虑空间划分优化
// 如 BVH、八叉树等
```

### 3. 不能直接对单个实例添加子对象

```javascript
// ❌ 不行：InstancedMesh 的"实例"不是真正的 Object3D
instancedMesh.children[0].add(someObject)  // 错误！

// ✅ 替代方案：用单独的 Mesh 表示特殊对象
// 或者将额外信息存储在 userData 中
```

### 4. instanceMatrix 更新频率

```javascript
// ⚠️ 不要每帧都设置 needsUpdate = true（如果没有变化的话）
if (hasChanged) {
  instancedMesh.instanceMatrix.needsUpdate = true
}

// 对于静态场景，初始化后不需要再次更新
```

## API 参考

### InstancedMesh 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `instanceMatrix` | InstancedBufferAttribute | 4x4 变换矩阵（每实例16个float） |
| `instanceColor` | InstancedBufferAttribute | RGB 颜色（每实例3个float，可选） |
| `count` | Number | 当前活跃的实例数量 |

### InstancedMesh 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `setMatrixAt(id, matrix)` | void | 设置第 id 个实例的变换矩阵 |
| `getMatrixAt(id, matrix)` | void | 获取第 id 个实例的变换矩阵 |
| `setColorAt(id, color)` | void | 设置第 id 个实例的颜色 |
| `getColorAt(id, color)` | void | 获取第 id 个实例的颜色 |
| `dispose()` | void | 释放资源 |

### InstancedBufferAttribute

```javascript
// 创建自定义实例属性
const attr = new THREE.InstancedBufferAttribute(
  new Float32Array(count * componentCount),  // 数据数组
  componentCount                              // 每个实例的分量数
)

attr.setUsage(THREE.DynamicDrawUsage)  // 动态更新时设置
attr.needsUpdate = true                 // 标记需要上传到 GPU

geometry.setAttribute('attributeName', attr)
```

## 常见问题

### Q: InstancedMesh 和 Points 有什么区别？

| 特性 | InstancedMesh | Points |
|------|--------------|-------|
| 几何体 | 任意复杂几何体 | 仅点 |
| 方向 | 可有独立朝向 | 始终面向相机 |
| 光照 | 支持完整光照 | 受限 |
| 阴影 | 支持 | 通常不支持 |
| 复杂度 | 较高 | 较低 |
| 适用 | 3D 物体阵列 | 粒子效果 |

**选择建议**：如果只需要点状粒子，用 `Points`；如果需要完整的 3D 对象（如树木、方块），用 `InstancedMesh`。

### Q: 如何让部分实例隐藏？

```javascript
// 方法一：将实例移动到不可见区域
const hiddenMatrix = new THREE.Matrix4().set(
  0, 0, 0, 0,
  0, 0, 0, 0,
  0, 0, 0, 0,  // 零矩阵使实例消失
  0, 0, 0, 1
)
instancedMesh.setMatrixAt(hiddenIndex, hiddenMatrix)

// 方法二：设置透明度为 0（需要材质支持透明度）
// 方法三：减少 count
```

### Q: 如何实现实例间的碰撞检测？

```javascript
// 需要手动遍历实例位置进行碰撞检测
function checkCollisions(instancedMesh) {
  const positions = []
  const matrix = new THREE.Matrix4()
  const pos = new THREE.Vector3()
  
  for (let i = 0; i < instancedMesh.count; i++) {
    instancedMesh.getMatrixAt(i, matrix)
    matrix.decompose(pos, new THREE.Quaternion(), new THREE.Vector3())
    positions.push(pos.clone())
  }
  
  // 两两检测距离
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      if (positions[i].distanceTo(positions[j]) < minDistance) {
        console.log(`碰撞: 实例 ${i} 与 ${j}`)
      }
    }
  }
}
```
