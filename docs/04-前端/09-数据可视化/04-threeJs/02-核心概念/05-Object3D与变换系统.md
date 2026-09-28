---
title: Object3D与变换系统
description: "Object3D 是 Three.js 中几乎所有 3D 对象的基类，理解 Object3D 对于掌握 Three.js 至关重要。Scene、Camera、Mesh、Light、Group 等全部继承自 Object3D。"
keywords: [Object3D与变换系统]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---


# Object3D 与变换系统

Object3D 是 Three.js 中几乎所有 3D 对象的基类，理解 Object3D 对于掌握 Three.js 至关重要。Scene、Camera、Mesh、Light、Group 等全部继承自 Object3D。

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Object3D 继承体系                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │                    THREE.Object3D (基类)                        │    │
│   │                                                               │    │
│   │  position / rotation / scale  quaternion  matrix               │    │
│   │  visible / frustumCulled       userData                       │    │
│   │  add() / remove() / traverse()  lookAt()                      │    │
│   └───────────────────────┬───────────────────────────────────────┘    │
│                           │                                            │
│         ┌─────────────────┼─────────────────┬──────────────────┐      │
│         ▼                 ▼                 ▼                  ▼      │
│   ┌───────────┐   ┌───────────┐   ┌───────────┐     ┌───────────┐    │
│   │   Scene   │   │   Camera  │   │   Mesh    │     │   Light   │    │
│   │  场景容器  │   │   相机    │   │  网格对象  │     │   光源    │    │
│   └───────────┘   └─────┬─────┘   └─────┬─────┘     └─────┬─────┘    │
│                         │               │                 │          │
│              ┌──────────┼───────────────┼─────────────────┤          │
│              ▼          ▼               ▼                 ▼          │
│        ┌──────────┐ ┌──────────┐ ┌──────────┐     ┌──────────┐      │
│        │Perspective│ │Orthographic│ │ Group   │     │ Sprite   │      │
│        │ Camera   │ │ Camera   │ │  分组    │     │  精灵    │      │
│        └──────────┘ └──────────┘ └──────────┘     └──────────┘      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

变换流程：
Object3D 变换属性 → 本地矩阵 → 世界矩阵 → GPU 渲染
```

## 概述

### 什么是 Object3D？

Object3D 是 Three.js 场景图（Scene Graph）中所有 3D 对象的抽象基类。它提供了以下核心能力：

| 能力 | 说明 |
|------|------|
| **空间变换** | 位置、旋转、缩放 |
| **层级管理** | 父子关系、添加/移除对象 |
| **坐标转换** | 本地/世界坐标空间互转 |
| **遍历** | 递归遍历自身及所有后代 |
| **可见性** | 控制对象是否参与渲染 |
| **自定义数据** | `userData` 存储任意数据 |

### 为什么需要理解 Object3D？

```javascript
// Scene、Mesh、Camera、Light、Group 全部是 Object3D 的子类
const scene = new THREE.Scene()
scene instanceof THREE.Object3D // true

const mesh = new THREE.Mesh(geometry, material)
mesh instanceof THREE.Object3D // true

const light = new THREE.DirectionalLight(0xffffff)
light instanceof THREE.Object3D // true

// 这意味着它们共享同一套变换和层级管理 API
mesh.position.set(1, 2, 3)     // ✅ Object3D 的方法
light.position.set(5, 5, 5)    // ✅ 同样的方法
camera.position.set(0, 0, 5)  // ✅ 同样的方法
```

## 基础属性

### 属性总览

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `position` | Vector3 | (0, 0, 0) | 本地位置 |
| `rotation` | Euler | (0, 0, 0) | 本地旋转（欧拉角） |
| `scale` | Vector3 | (1, 1, 1) | 本地缩放 |
| `quaternion` | Quaternion | (0, 0, 0, 1) | 本地旋转（四元数） |
| `matrix` | Matrix4 | 单位矩阵 | 本地变换矩阵 |
| `matrixWorld` | Matrix4 | 单位矩阵 | 世界变换矩阵 |
| `visible` | Boolean | true | 是否可见 |
| `frustumCulled` | Boolean | true | 是否进行视锥体剔除 |
| `renderOrder` | Number | 0 | 渲染顺序 |
| `parent` | Object3D | null | 父对象（只读） |
| `children` | Array | [] | 子对象数组（只读） |
| `name` | String | '' | 对象名称 |
| `type` | String | 'Object3D' | 对象类型（只读） |
| `uuid` | String | auto | 唯一标识符（只读） |
| `userData` | Object | {} | 自定义数据容器 |
| `castShadow` | Boolean | false | 是否投射阴影 |
| `receiveShadow` | Boolean | false | 是否接收阴影 |

## 位置 (Position)

### 基本操作

```javascript
import * as THREE from 'three'

const obj = new THREE.Object3D()

// 方式一：直接设置分量
obj.position.x = 10
obj.position.y = 20
obj.position.z = 30

// 方式二：使用 set 方法（推荐）
obj.position.set(10, 20, 30)

// 方式三：使用 copy 复制另一个向量
obj.position.copy(new THREE.Vector3(10, 20, 30))

// 方式四：从数组创建
obj.position.fromArray([10, 20, 30])
```

### 常用位置操作

```javascript
const obj = new THREE.Object3D()

// 获取当前位置到原点的距离
const distance = obj.position.length()

// 获取两点之间的距离
const target = new THREE.Vector3(5, 5, 5)
const dist = obj.position.distanceTo(target)

// 归一化（变为单位长度方向）
obj.position.normalize()

// 限制长度
obj.position.setLength(10)

// 向量运算
obj.position.add(new THREE.Vector3(1, 0, 0))    // 加法
obj.position.sub(new THREE.Vector3(1, 0, 0))    // 减法
obj.position.multiplyScalar(2)                    // 标量乘法
obj.position.lerp(target, 0.5)                   // 线性插值

// 克隆位置
const clonedPos = obj.position.clone()
```

### 平移方法

```javascript
const obj = new THREE.Object3D()

// 沿自身坐标轴平移
obj.translateX(1)   // 沿 X 轴移动 1
obj.translateY(2)   // 沿 Y 轴移动 2
obj.translateZ(3)   // 沿 Z 轴移动 3

// 沿指定轴平移
const axis = new THREE.Vector3(1, 1, 0).normalize()
obj.translateOnAxis(axis, 5)  // 沿指定方向移动 5
```

**translateX/Y/Z vs 直接修改 position：**

```javascript
// translateX/Y/Z 是沿对象的局部坐标系平移
// 直接修改 position 是沿世界坐标系平移

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0x00ff00 })
)
cube.rotation.y = Math.PI / 4 // 先旋转 45 度

// 沿局部 X 轴向前移动（会沿旋转后的方向）
cube.translateX(5)

// 沿世界 X 轴移动（不受旋转影响）
cube.position.x += 5
```

## 旋转 (Rotation)

### 欧拉角 (Euler)

Three.js 默认使用欧拉角表示旋转，以弧度为单位（Math.PI / 4 即 45°）。

```javascript
const obj = new THREE.Object3D()

// 基本设置
obj.rotation.x = Math.PI / 4   // 绕 X 轴旋转 45°
obj.rotation.y = Math.PI / 2   // 绕 Y 轴旋转 90°
obj.rotation.z = 0             // 绕 Z 轴不旋转

// 使用 set 方法
obj.rotation.set(Math.PI / 4, Math.PI / 2, 0)

// 使用 setFromVector3
obj.rotation.setFromVector3(new THREE.Vector3(Math.PI / 4, Math.PI / 2, 0))
```

### 旋转顺序 (Order)

欧拉角的旋转顺序会影响最终结果。默认为 `'XYZ'`，即先绕 X 轴旋转，再绕 Y 轴，最后绕 Z 轴。

```javascript
const obj = new THREE.Object3D()

// 默认旋转顺序
console.log(obj.rotation.order) // 'XYZ'

// 可选的旋转顺序
const orders = ['XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX']

// 设置旋转顺序
obj.rotation.order = 'YXZ'

// 常见应用场景：
// 'YXZ' - 常用于 FPS 游戏（先偏航 Y，再俯仰 X）
// 'XYZ' - 默认值，通用场景
```

**不同旋转顺序的效果差异：**

```
假设旋转角度相同：(45°, 45°, 0°)

XYZ 顺序：先 X 转 45° → 再 Y 转 45° → 结果 A
YXZ 顺序：先 Y 转 45° → 再 X 转 45° → 结果 B

结果 A ≠ 结果 B！
```

### 常用旋转方法

```javascript
const obj = new THREE.Object3D()

// 绕指定轴旋转
obj.rotateX(Math.PI / 4)    // 绕局部 X 轴旋转
obj.rotateY(Math.PI / 4)    // 绕局部 Y 轴旋转
obj.rotateZ(Math.PI / 4)    // 绕局部 Z 轴旋转

// 绕任意轴旋转
const axis = new THREE.Vector3(0, 1, 0)  // Y 轴
obj.rotateOnAxis(axis, Math.PI / 4)     // 绕 Y 轴旋转 45°

// 让对象朝向某个点
obj.lookAt(new THREE.Vector3(10, 5, 0))

// 让对象朝向某个向量方向
const direction = new THREE.Vector3(1, 0, 1).normalize()
obj.lookAt(obj.position.clone().add(direction))

// 获取两个向量之间的夹角
const v1 = new THREE.Vector3(1, 0, 0)
const v2 = new THREE.Vector3(0, 1, 0)
const angle = v1.angleTo(v2) // π/2 (90°)
```

### 万向锁问题 (Gimbal Lock)

当两个旋转轴重合时，会丢失一个自由度，这就是万向锁。

```javascript
// 万向锁示例（XYZ 顺序下，X 旋转 90° 时，Y 和 Z 轴重合）
const obj = new THREE.Object3D()
obj.rotation.order = 'XYZ'
obj.rotation.x = Math.PI / 2  // X 旋转 90°

// 此时再旋转 Y 和 Z 效果一样（万向锁发生）
obj.rotation.y = Math.PI / 4
obj.rotation.z = Math.PI / 4  // 和 Y 旋转效果相同！

// 解决方案：使用四元数（见下一节）
```

## 缩放 (Scale)

### 基本操作

```javascript
const obj = new THREE.Object3D()

// 均匀缩放
obj.scale.set(2, 2, 2)  // 各方向放大 2 倍

// 非均匀缩放
obj.scale.set(2, 1, 0.5)  // X 放大 2 倍，Y 不变，Z 缩小一半

// 单独设置
obj.scale.x = 3
obj.scale.y = 0.5
obj.scale.z = 1

// 翻转（镜像效果）
obj.scale.set(-1, 1, 1)  // 沿 X 轴翻转
```

### 缩放的注意事项

```javascript
// 非均匀缩放说明：Three.js 用逆转置矩阵（normalMatrix）变换法线，
// 因此对 mesh.scale 做非均匀缩放时光照依然正确，不会“法线未更新”。
sphere.scale.set(2, 1, 1)  // 将球体压扁成椭球，光照正常

// 若希望形状改变“烘焙”进几何体（而非每帧矩阵变换），直接缩放几何体：
geometry.scale(2, 1, 1)
geometry.computeVertexNormals()  // 烘焙后重新计算法线
```

## 四元数 (Quaternion)

四元数可以避免万向锁问题，是表示旋转的更可靠方式。Three.js 内部同时维护 `rotation`(Euler) 和 `quaternion`，两者保持同步。

### 基本概念

```javascript
const obj = new THREE.Object3D()

// 四元数的基本结构：x, y, z, w
console.log(obj.quaternion) // { x: 0, y: 0, z: 0, w: 1 }

// w=1 表示无旋转（单位四元数）
```

### 四元数常用操作

```javascript
const obj = new THREE.Object3D()

// 从欧拉角创建四元数
const euler = new THREE.Euler(Math.PI / 4, Math.PI / 2, 0)
obj.quaternion.setFromEuler(euler)

// 从轴-角创建四元数（绕某轴旋转多少角度）
const axis = new THREE.Vector3(0, 1, 0)  // Y 轴
const angle = Math.PI / 4                // 45°
obj.quaternion.setFromAxisAngle(axis, angle)

// 四元数相乘（组合旋转）
const q1 = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0), Math.PI / 4
)
const q2 = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(1, 0, 0), Math.PI / 6
)
obj.quaternion.multiplyQuaternions(q1, q2)  // 先 q1 再 q2

// 四元数插值（球面线性插值，用于平滑旋转动画）
const startQuat = obj.quaternion.clone()
const endQuat = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(0, Math.PI, 0)
)
const t = 0.5
obj.quaternion.slerp(endQuat, t)  // 插值到中间状态

// 四元数求逆（反向旋转）
const inverseQuat = obj.quaternion.clone().invert()
```

### 欧拉角 vs 四元数对比

| 特性 | 欧拉角 (Euler) | 四元数 (Quaternion) |
|------|----------------|---------------------|
| 直观性 | ⭐⭐⭐ 高（角度直观） | ⭐ 低（难以直观理解） |
| 万向锁 | ❌ 会发生 | ✅ 不会 |
| 插值平滑性 | ❌ 可能抖动 | ✅ slerp 最短路径 |
| 内存占用 | 3 个浮点数 | 4 个浮点数 |
| 计算效率 | 较高 | 较低 |
| 适用场景 | 编辑器 UI、简单旋转 | 动画、复杂旋转、避免万向锁 |

### 实际使用建议

```javascript
// 日常开发：使用欧拉角（更直观）
mesh.rotation.y += 0.01

// 动画/复杂旋转：使用四元数（避免万向锁）
function slerpRotate(object, targetQuat, duration) {
  const startQuat = object.quaternion.clone()
  const startTime = performance.now()

  function update() {
    const elapsed = performance.now() - startTime
    const t = Math.min(elapsed / duration, 1)
    
    object.quaternion.slerpQuaternions(startQuat, targetQuat, t)
    
    if (t < 1) {
      requestAnimationFrame(update)
    }
  }
  
  update()
}
```

## 矩阵系统

Object3D 内部通过矩阵来管理变换。理解矩阵系统有助于处理高级场景。

### 自动更新 vs 手动更新

```javascript
const obj = new THREE.Object3D()

// 默认情况下，修改 position/rotation/scale 会自动更新矩阵
obj.matrixAutoUpdate = true  // 默认值

obj.position.set(1, 2, 3)
// 矩阵自动更新，无需手动调用

// 手动模式（性能优化时使用）
obj.matrixAutoUpdate = false

obj.position.set(1, 2, 3)
obj.updateMatrix()  // 必须手动调用更新矩阵
```

### 矩阵更新时机

```javascript
const obj = new THREE.Object3D()

// 矩阵更新标志
obj.matrixWorldNeedsUpdate = true  // 标记需要更新世界矩阵

// 强制更新世界矩阵
obj.updateMatrixWorld(true)  // true 表示递归更新所有子对象

// 当父对象变化后，子对象的世界矩阵也需要更新
parent.add(child)
child.matrixWorldNeedsUpdate = true
```

### 矩阵分解

```javascript
const obj = new THREE.Object3D()
obj.position.set(10, 20, 30)
obj.rotation.set(Math.PI / 4, 0, Math.PI / 2)
obj.scale.set(2, 2, 2)

// 更新矩阵
obj.updateMatrix()

// 从矩阵中提取变换信息
const position = new THREE.Vector3()
const rotation = new THREE.Quaternion()
const scale = new THREE.Vector3()

obj.matrix.decompose(position, rotation, scale)

console.log('Position:', position)
console.log('Rotation:', rotation)
console.log('Scale:', scale)
```

### 应用预计算的矩阵

```javascript
const obj = new THREE.Object3D()

// 创建一个组合变换矩阵
const matrix = new THREE.Matrix4()
  .makeTranslation(10, 0, 0)
  .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 4))
  .multiply(new THREE.Matrix4().makeScale(2, 2, 2))

// 直接应用矩阵
obj.matrixAutoUpdate = false
obj.matrix.copy(matrix)
```

## 层级管理

### 添加和移除子对象

```javascript
const parent = new THREE.Object3D()
const child1 = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
)
const child2 = new THREE.Mesh(
  new THREE.SphereGeometry(0.5),
  new THREE.MeshBasicMaterial({ color: 0x00ff00 })
)

// 添加子对象
parent.add(child1)
parent.add(child2)

// 移除子对象
parent.remove(child1)

// 从当前父对象移除
child2.removeFromParent()

// 清空所有子对象
parent.clear()
```

### 父子关系的含义

```javascript
const parent = new THREE.Object3D()
const child = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
)

parent.add(child)

// 子对象的变换是相对于父对象的本地坐标
child.position.set(2, 0, 0)  // 相对于父对象偏移 (2, 0, 0)

// 父对象移动时，子对象跟随移动
parent.position.set(5, 0, 0)
// child 的世界位置变成 (7, 0, 0) = parent(5,0,0) + child.local(2,0,0)

// 父对象旋转时，子对象的本地坐标也会被旋转
parent.rotation.y = Math.PI / 2
// child 的世界位置会围绕父对象旋转
```

### 典型层级结构

```
Scene (根节点)
├── camera (相机)
├── lights (光源组)
│   ├── ambientLight
│   ├── directionalLight
│   └── pointLight
├── models (模型组)
│   ├── car (汽车)
│   │   ├── body (车身)
│   │   ├── wheel_FL (左前轮)
│   │   ├── wheel_FR (右前轮)
│   │   ├── wheel_RL (左后轮)
│   │   └── wheel_RR (右后轮)
│   └── ground (地面)
└── ui (UI 元素组)
    └── labels (标签组)
```

```javascript
// 构建上述层级结构
const scene = new THREE.Scene()

// 光源组
const lights = new THREE.Group()
lights.name = 'lights'
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
lights.add(ambientLight, directionalLight)
scene.add(lights)

// 汽车模型组
const car = new THREE.Group()
car.name = 'car'

const body = new THREE.Mesh(
  new THREE.BoxGeometry(2, 1, 4),
  new THREE.MeshStandardMaterial({ color: 0x3366ff })
)
body.name = 'body'

// 创建四个轮子
const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16)
wheelGeometry.rotateZ(Math.PI / 2)
const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 })

const wheels = {}
;['FL', 'FR', 'RL', 'RR'].forEach(pos => {
  const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
  wheel.name = `wheel_${pos}`
  
  const [x, z] = pos === 'FL' ? [1, 1.5] 
                  : pos === 'FR' ? [-1, 1.5] 
                  : pos === 'RL' ? [1, -1.5] 
                  : [-1, -1.5]
  wheel.position.set(x, -0.4, z)
  wheels[`wheel_${pos}`] = wheel
  car.add(wheel)
})

car.add(body, ...Object.values(wheels))
scene.add(car)

// 通过 name 查找对象
const wheelFL = car.getObjectByName('wheel_FL')
console.log(wheelFL) // 找到了左前轮
```

### 遍历树结构

```javascript
const scene = new THREE.Scene()

// traverse - 遍历自身及所有后代
scene.traverse((object) => {
  console.log(object.type, object.name)
  
  // 只处理 Mesh 类型
  if (object instanceof THREE.Mesh) {
    object.castShadow = true
  }
})

// traverseVisible - 只遍历可见的对象
scene.traverseVisible((object) => {
  console.log('Visible:', object.name)
})

// traverseAncestors - 遍历所有祖先
child.traverseAncestors((ancestor) => {
  console.log('Ancestor:', ancestor.name)
})
```

### 查找对象

```javascript
const scene = new THREE.Scene()

// 通过 ID 查找（UUID）
const obj = scene.getObjectByUuid(someUuid)

// 通过名称查找（返回第一个匹配的）
const car = scene.getObjectByName('car')

// 递归查找
const wheel = scene.getObjectByName('wheel_FL') // 该方法本身即按递归方式查找

// 手动深度优先搜索
function findByName(root, name) {
  if (root.name === name) return root
  
  for (const child of root.children) {
    const result = findByName(child, name)
    if (result) return result
  }
  
  return null
}
```

## 坐标空间转换

### 本地坐标 vs 世界坐标

```
世界坐标系 (World Space)
├── 固定不变的全局参考系
├── 场景的原点和轴向
└── 所有对象的绝对位置

本地坐标系 (Local Space / Object Space)
├── 以对象自身为中心
├── 随对象的位置和旋转而改变
├── position/rotation/scale 都是相对于父对象的本地坐标
└── 子对象的位置是相对于父对象的本地坐标
```

### 坐标转换方法

```javascript
const obj = new THREE.Object3D()
obj.position.set(10, 0, 0)
obj.rotation.y = Math.PI / 4
scene.add(obj)

// 本地坐标 → 世界坐标
const localPoint = new THREE.Vector3(1, 2, 3)
const worldPoint = localPoint.clone().applyMatrix4(obj.matrixWorld)
console.log(worldPoint) // 转换后的世界坐标

// 使用内置方法
obj.localToWorld(localPoint)  // 直接转换 localPoint

// 世界坐标 → 本地坐标
const worldPos = new THREE.Vector3(15, 2, 3)
const localPos = worldPos.clone().applyMatrix4(obj.matrixWorld.clone().invert())

// 使用内置方法
obj.worldToLocal(localPos)  // 直接转换

// 方向向量转换（不含位移）
const localDir = new THREE.Vector3(0, 1, 0)  // 本地"上"方向
const worldDir = localDir.clone().transformDirection(obj.matrixWorld)
```

### 实际应用示例

```javascript
// 示例：让对象 B 始终出现在对象 A 的右前方 5 个单位处
const objectA = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
)
const objectB = new THREE.Mesh(
  new THREE.SphereGeometry(0.5),
  new THREE.MeshBasicMaterial({ color: 0x00ff00 })
)

scene.add(objectA)
scene.add(objectB)

// 在每一帧中更新 B 的位置
function animate() {
  requestAnimationFrame(animate)
  
  // A 的前方偏移 (0, 0, -5) 的世界坐标
  const offset = new THREE.Vector3(0, 0, -5)
  const worldOffset = offset.clone().applyMatrix4(objectA.matrixWorld)
  
  objectB.position.copy(worldOffset)
  
  renderer.render(scene, camera)
}

// 更简洁的方式：将 B 作为 A 的子对象
objectA.add(objectB)
objectB.position.set(0, 0, -5)  // 相对于 A 的局部坐标
// 这样 B 会自动跟随 A 移动和旋转
```

### getWorldPosition / getWorldQuaternion / getWorldScale

```javascript
const obj = new THREE.Object3D()
parent.add(obj)
obj.position.set(1, 2, 3)
obj.rotation.y = Math.PI / 4

// 获取世界位置
const worldPos = new THREE.Vector3()
obj.getWorldPosition(worldPos)
console.log(worldPos)  // 包含了父对象的变换

// 获取世界旋转（四元数）
const worldQuat = new THREE.Quaternion()
obj.getWorldQuaternion(worldQuat)

// 获取世界缩放
const worldScale = new THREE.Vector3()
obj.getWorldScale(worldScale)

// 获取世界方向向量
const worldDirection = new THREE.Vector3()
obj.getWorldDirection(worldDirection)  // 对象的本地 -Z 方向在世界空间中的方向
```

## 可见性与渲染控制

### 可见性

```javascript
const obj = new THREE.Object3D()

// 控制单个对象可见性
obj.visible = true   // 显示
obj.visible = false  // 隐藏

// 隐藏对象及其所有子对象
obj.visible = false  // 子对象也一起隐藏

// 注意：父对象 visible = false 时，渲染器会跳过整个子树，
// 子对象即使 visible = true 也不会渲染；如需隐藏父级但显示子级，
// 可改用 layers 或调整层级结构
```

### 视锥体剔除

```javascript
const obj = new THREE.Object3D()

// 启用视锥体剔除（默认开启）
obj.frustumCulled = true

// 禁用视锥体剔除
// 适用场景：对象边界不准确或始终需要渲染的对象
obj.frustumCulled = false

// 手动设置包围球（优化剔除精度）
obj.geometry.computeBoundingSphere()
console.log(obj.geometry.boundingSphere)  // 包围球信息
```

### 渲染顺序

```javascript
const obj1 = new THREE.Mesh(/* ... */)
const obj2 = new THREE.Mesh(/* ... */)

// 控制渲染先后顺序
// 数值越小越先渲染（在底层），数值越大越后渲染（在上层）
obj1.renderOrder = 0
obj2.renderOrder = 1

// 常见用途：
// - 透明对象需要在不透明对象之后渲染
// - 后处理覆盖层需要在最上层
// - UI 元素需要在最后渲染
```

### 投射阴影 / 接收阴影

```javascript
const mesh = new THREE.Mesh(geometry, material)

// 投射阴影
mesh.castShadow = true

// 接收阴影
mesh.receiveShadow = true

// 批量设置
scene.traverse((obj) => {
  if (obj instanceof THREE.Mesh) {
    obj.castShadow = true
    obj.receiveShadow = true
  }
})
```

## 自定义数据与事件

### userData

`userData` 是一个空对象，可以存储任何自定义数据。

```javascript
const mesh = new THREE.Mesh(geometry, material)

// 存储自定义数据
mesh.userData = {
  id: 'player_001',
  type: 'character',
  health: 100,
  speed: 5,
  metadata: {
    created: Date.now(),
    author: 'developer'
  }
}

// 读取数据
console.log(mesh.userData.id)           // 'player_001'
console.log(mesh.userData.health)       // 100
console.log(mesh.userData.metadata.created) // 时间戳

// 射线检测后获取自定义数据
const intersects = raycaster.intersectObjects(scene.children)
if (intersects.length > 0) {
  const hit = intersects[0].object
  console.log('Hit:', hit.userData.type, hit.userData.id)
}
```

### 事件分发

Object3D 继承自 `EventDispatcher`，支持事件监听机制。

```javascript
const obj = new THREE.Object3D()

// 监听事件
obj.addEventListener('customEvent', (event) => {
  console.log('Event received:', event.type, event.message)
})

// 触发事件
obj.dispatchEvent({
  type: 'customEvent',
  message: 'Hello from Object3D!'
})

// 移除监听
function onEvent(event) {
  console.log(event)
}
obj.addEventListener('click', onEvent)
obj.removeEventListener('click', onEvent)

// 实际应用：点击交互
canvas.addEventListener('click', (event) => {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  )
  
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(scene.children)
  
  if (intersects.length > 0) {
    const clickedObj = intersects[0].object
    clickedObj.dispatchEvent({ type: 'click', point: intersects[0].point })
  }
})

// 为每个可点击对象绑定点击事件
interactiveObjects.forEach(obj => {
  obj.addEventListener('click', (e) => {
    console.log(`${obj.name} was clicked at`, e.point)
    // 可以在这里实现选中高亮、弹出信息等
  })
})
```

## Group 分组

Group 是 Object3D 的直接子类，专门用于组织和管理多个对象。

### Group vs Object3D

| 特性 | Group | Object3D |
|------|-------|----------|
| 用途 | 分组管理 | 通用基类 |
| 是否渲染 | ❌ 不可见（无几何体） | 取决于具体类型 |
| 变换能力 | ✅ 完整支持 | ✅ 完整支持 |
| 层级管理 | ✅ 完整支持 | ✅ 完整支持 |

### Group 使用示例

```javascript
const scene = new THREE.Scene()

// 创建分组
const group = new THREE.Group()
group.name = 'solarSystem'

// 太阳
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(2, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffff00 })
)
sun.name = 'sun'
group.add(sun)

// 地球（作为太阳的子对象，会随太阳运动）
const earthGroup = new THREE.Group()
earthGroup.name = 'earthOrbit'
earthGroup.position.set(8, 0, 0)

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(0.8, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x2233ff })
)
earth.name = 'earth'
earthGroup.add(earth)

// 月球（作为地球的子对象）
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.25, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xcccccc })
)
moon.name = 'moon'
moon.position.set(2, 0, 0)
earthGroup.add(moon)

group.add(earthGroup)
scene.add(group)

// 动画：地球公转 + 月球公转
function animate() {
  requestAnimationFrame(animate)
  
  // 地球绕太阳公转
  const time = Date.now() * 0.001
  earthGroup.position.x = Math.cos(time) * 8
  earthGroup.position.z = Math.sin(time) * 8
  
  // 月球绕地球公转
  moon.position.x = Math.cos(time * 3) * 2
  moon.position.z = Math.sin(time * 3) * 2
  
  // 地球自转
  earth.rotation.y += 0.01
  
  renderer.render(scene, camera)
}
```

### 使用 Group 组织场景

```javascript
class SceneManager {
  constructor(scene) {
    this.scene = scene
    
    // 创建顶层分组
    this.groups = {
      environment: new THREE.Group(),
      staticObjects: new THREE.Group(),
      dynamicObjects: new THREE.Group(),
      characters: new THREE.Group(),
      effects: new THREE.Group(),
      ui: new THREE.Group()
    }
    
    Object.values(this.groups).forEach(group => {
      this.scene.add(group)
    })
  }
  
  addToGroup(category, object) {
    if (this.groups[category]) {
      this.groups[category].add(object)
    } else {
      console.warn(`Unknown group: ${category}`)
    }
  }
  
  showGroup(category) {
    if (this.groups[category]) {
      this.groups[category].visible = true
    }
  }
  
  hideGroup(category) {
    if (this.groups[category]) {
      this.groups[category].visible = false
    }
  }
  
  toggleGroup(category) {
    if (this.groups[category]) {
      this.groups[category].visible = !this.groups[category].visible
    }
  }
}

// 使用
const manager = new SceneManager(scene)
manager.addToGroup('characters', playerMesh)
manager.addToGroup('staticObjects', buildingMesh)
manager.hideGroup('effects')  // 隐藏特效组
```

## API 参考

### Object3D 常用方法速查

#### 变换相关

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `lookAt(x, y, z)` | 目标坐标 | void | 让对象朝向目标点 |
| `getWorldPosition(target)` | Vector3 | Vector3 | 获取世界位置 |
| `getWorldQuaternion(target)` | Quaternion | Quaternion | 获取世界旋转（四元数） |
| `getWorldScale(target)` | Vector3 | Vector3 | 获取世界缩放 |
| `getWorldDirection(target)` | Vector3 | Vector3 | 获取对象本地 -Z 轴的世界方向 |
| `localToWorld(vector)` | Vector3 | Vector3 | 本地坐标→世界坐标 |
| `worldToLocal(vector)` | Vector3 | Vector3 | 世界坐标→本地坐标 |
| `translateX/Y/Z(distance)` | number | void | 沿局部轴平移 |
| `translateOnAxis(axis, distance)` | Vector3, number | void | 沿指定轴平移 |
| `rotateX/Y/Z(angle)` | radian | void | 绕局部轴旋转 |
| `rotateOnAxis(axis, angle)` | Vector3, radian | void | 绕指定轴旋转 |

#### 层级相关

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `add(...objects)` | Object3D[] | void | 添加子对象 |
| `remove(...objects)` | Object3D[] | void | 移除子对象 |
| `attach(object)` | Object3D | Object3D | 将对象移动到此对象下（保持世界变换） |
| `removeFromParent()` | 无 | Object3D | 从父对象移除自己 |
| `clear()` | 无 | void | 清空所有子对象 |
| `getObjectById(id)` | number | Object3D \| null | 按 ID 查找 |
| `getObjectByName(name, recursive?)` | string, boolean | Object3D \| null | 按名称查找 |
| `getObjectByProperty(name, value)` | string, any | Object3D \| null | 按属性查找 |
| `traverse(callback)` | function | void | 遍历自身及后代 |
| `traverseVisible(callback)` | function | void | 遍历可见的后代 |

#### 矩阵相关

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `updateMatrix()` | 无 | void | 更新本地矩阵 |
| `updateMatrixWorld(force?)` | boolean | void | 更新世界矩阵 |
| `toJSON(meta?)` | object | object | 序列化为 JSON |

#### 克隆与复制

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `clone(recursive?)` | boolean | Object3D | 克隆对象 |
| `copy(source, recursive?)` | Object3D, boolean | this | 复制属性 |

## 常见问题

### Q: position 改变了但没有生效？

确保 `matrixAutoUpdate` 为 `true`（默认值）。如果设为了 `false`，需要在修改后手动调用 `updateMatrix()`。

### Q: 子对象没有跟随父对象移动？

检查是否正确使用了 `add()` 方法。直接修改 `children` 数组不会建立正确的父子关系：

```javascript
// ❌ 错误做法
parent.children.push(child)

// ✅ 正确做法
parent.add(child)
```

### Q: 如何获取对象在屏幕上的 2D 坐标？

```javascript
function toScreenPosition(obj, camera) {
  const vector = new THREE.Vector3()
  obj.getWorldPosition(vector)
  vector.project(camera)
  
  return {
    x: (vector.x * 0.5 + 0.5) * window.innerWidth,
    y: (-vector.y * 0.5 + 0.5) * window.innerHeight
  }
}
```

### Q: 如何让对象始终面向相机？（公告板效果）

```javascript
function billboard(object, camera) {
  object.lookAt(camera.position)
}

// 或者在每帧调用
function animate() {
  requestAnimationFrame(animate)
  billboard(labelSprite, camera)
  renderer.render(scene, camera)
}
```

### Q: attach() 和 add() 有什么区别？

```javascript
// add(): 对象的本地变换保持不变，世界变换会改变
parent.add(child)

// attach(): 对象的世界变换保持不变，重新计算本地变换
parent.attach(child)
// 适用于：将对象从一个父节点移动到另一个父节点时保持其世界位置不变
```

### Q: 如何获取对象的完整路径？

```javascript
function getObjectPath(obj) {
  const path = []
  let current = obj
  
  while (current) {
    path.unshift(current.name || current.type)
    current = current.parent
  }
  
  return path.join(' > ')
}

// 输出示例: "Scene > car > wheel_FL"
```
