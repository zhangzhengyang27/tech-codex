---
title: JavaScript API
description: "百度地图JavaScript API是一套由JavaScript语言编写的应用程序接口，可帮助您在网站中构建功能丰富、交互性强的地图应用。"
keywords: [JavaScript, API]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---


# JavaScript API

百度地图JavaScript API是一套由JavaScript语言编写的应用程序接口，可帮助您在网站中构建功能丰富、交互性强的地图应用。

## 版本说明

### JavaScript API v3.0

经典版本，稳定可靠，适合传统Web应用。

```html
<script src="https://api.map.baidu.com/api?v=3.0&ak=您的密钥"></script>
```

### JavaScript API GL v1.0

新一代WebGL版本，支持3D渲染、更流畅的动画效果。

```html
<script src="https://api.map.baidu.com/api?v=1.0&type=webgl&ak=您的密钥"></script>
```

### 版本特性对比

| 特性 | v3.0 | GL v1.0 |
| ---- | ---- | ------- |
| 2D渲染 | ✓ | ✓ |
| 3D渲染 | ✗ | ✓ |
| 倾斜/旋转 | ✗ | ✓ |
| WebGL加速 | ✗ | ✓ |
| 海量点 | 插件支持 | 原生支持 |
| 自定义样式 | 基础支持 | 完整支持 |
| 兼容性 | IE9+ | 现代浏览器 |

### 加载方式

#### 同步加载

```html
<script src="https://api.map.baidu.com/api?v=3.0&ak=您的密钥"></script>
<script>
  var map = new BMap.Map('container');
</script>
```

#### 异步加载

```html
<script>
  window.initMap = function() {
    var map = new BMap.Map('container');
  };
</script>
<script src="https://api.map.baidu.com/api?v=3.0&ak=您的密钥&callback=initMap"></script>
```

#### 按需加载模块

绘图工具、热力图等库不在核心包内，需单独引入对应 script 后使用（BMap 命名空间下没有 `BMap.loader` 这样的按需加载 API）：

```html
<!-- 引入鼠标绘制工具库 -->
<script src="https://api.map.baidu.com/library/DrawingManager/1.4/src/DrawingManager_min.js"></script>
<!-- 引入热力图库 -->
<script src="https://api.map.baidu.com/library/Heatmap/2.0/src/HeatmapOverlay.js"></script>
```

```javascript
// 库加载完成后即可使用 BMapLib 下的工具类
var drawingManager = new BMapLib.DrawingManager(map);
var heatmapOverlay = new BMapLib.HeatmapOverlay();
```

## API参考

### Map类

#### 构造函数

```javascript
new BMap.Map(container, opts)
```

| 参数 | 类型 | 说明 |
| ---- | ---- | ---- |
| container | String/HTMLElement | 地图容器元素或ID |
| opts | MapOptions | 配置选项 |

#### MapOptions

| 属性 | 类型 | 默认值 | 说明 |
| ---- | ---- | ------ | ---- |
| enableMapClick | Boolean | true | 是否开启地图点击热点 |
| minZoom | Number | 3 | 最小缩放级别 |
| maxZoom | Number | 19 | 最大缩放级别 |
| mapType | MapType | BMAP_NORMAL_MAP | 地图类型 |

#### 方法列表

| 方法 | 参数 | 返回值 | 说明 |
| ---- | ---- | ------ | ---- |
| centerAndZoom(center, zoom) | Point, Number | - | 初始化地图 |
| setCenter(center) | Point | - | 设置中心点 |
| getCenter() | - | Point | 获取中心点 |
| setZoom(zoom) | Number | - | 设置缩放级别 |
| getZoom() | - | Number | 获取缩放级别 |
| setMapType(type) | MapType | - | 设置地图类型 |
| getMapType() | - | MapType | 获取地图类型 |
| addOverlay(overlay) | Overlay | - | 添加覆盖物 |
| removeOverlay(overlay) | Overlay | - | 移除覆盖物 |
| clearOverlays() | - | - | 清除所有覆盖物 |
| getOverlays() | - | Array | 获取所有覆盖物 |
| addControl(control) | Control | - | 添加控件 |
| removeControl(control) | Control | - | 移除控件 |
| getBounds() | - | Bounds | 获取视野范围 |
| setSize(size) | Size | - | 设置容器尺寸 |
| getSize() | - | Size | 获取容器尺寸 |
| panTo(point) | Point | - | 平移到指定点 |
| panBy(x, y) | Number, Number | - | 平移指定像素 |
| setViewport(points) | Array | - | 设置视野范围 |
| enableDragging() | - | - | 启用拖拽 |
| disableDragging() | - | - | 禁用拖拽 |
| enableScrollWheelZoom() | - | - | 启用滚轮缩放 |
| disableScrollWheelZoom() | - | - | 禁用滚轮缩放 |
| addEventListener(event, handler) | String, Function | - | 添加事件监听 |
| removeEventListener(event, handler) | String, Function | - | 移除事件监听 |

### Point类

```javascript
new BMap.Point(lng, lat)
```

| 属性 | 类型 | 说明 |
| ---- | ---- | ---- |
| lng | Number | 经度 |
| lat | Number | 纬度 |

### Marker类

```javascript
new BMap.Marker(point, opts)
```

#### MarkerOptions

| 属性 | 类型 | 默认值 | 说明 |
| ---- | ---- | ------ | ---- |
| icon | Icon | - | 标注图标 |
| offset | Size | (0,0) | 偏移量 |
| enableDragging | Boolean | false | 是否可拖拽 |
| raiseOnDrag | Boolean | false | 拖拽时是否弹起 |
| draggingCursor | String | - | 拖拽时光标样式 |
| rotation | Number | 0 | 旋转角度 |
| shadow | Icon | - | 阴影图标 |
| title | String | - | 鼠标悬停提示 |

#### Marker方法

| 方法 | 说明 |
| ---- | ---- |
| setPosition(point) | 设置位置 |
| getPosition() | 获取位置 |
| setIcon(icon) | 设置图标 |
| getIcon() | 获取图标 |
| setRotation(angle) | 设置旋转角度 |
| setAnimation(animation) | 设置动画 |
| enableDragging() | 启用拖拽 |
| disableDragging() | 禁用拖拽 |
| addEventListener(event, handler) | 添加事件 |

### Polyline类

```javascript
new BMap.Polyline(points, opts)
```

#### PolylineOptions

| 属性 | 类型 | 默认值 | 说明 |
| ---- | ---- | ------ | ---- |
| strokeColor | String | #006600 | 线颜色 |
| strokeWeight | Number | 2 | 线宽 |
| strokeOpacity | Number | 0.8 | 透明度 |
| strokeStyle | String | solid | 线样式 |

### Polygon类

```javascript
new BMap.Polygon(points, opts)
```

#### PolygonOptions

| 属性 | 类型 | 默认值 | 说明 |
| ---- | ---- | ------ | ---- |
| strokeColor | String | #006600 | 边框颜色 |
| strokeWeight | Number | 2 | 边框宽度 |
| strokeOpacity | Number | 0.8 | 边框透明度 |
| fillColor | String | #006600 | 填充颜色 |
| fillOpacity | Number | 0.3 | 填充透明度 |

### InfoWindow类

```javascript
new BMap.InfoWindow(content, opts)
```

#### InfoWindowOptions

| 属性 | 类型 | 默认值 | 说明 |
| ---- | ---- | ------ | ---- |
| width | Number | 自动 | 宽度 |
| height | Number | 自动 | 高度 |
| title | String | - | 标题 |
| enableAutoPan | Boolean | true | 是否自动平移 |
| enableCloseOnClick | Boolean | true | 点击地图关闭 |

## 地图基础

### 创建地图实例

```javascript
var map = new BMap.Map('container', {
  enableMapClick: false,
  minZoom: 3,
  maxZoom: 19
});

map.centerAndZoom(new BMap.Point(116.404, 39.915), 15);
```

### 地图方法详解

```javascript
// 设置中心点
map.setCenter(new BMap.Point(116.404, 39.915));

// 平移地图
map.panTo(new BMap.Point(116.404, 39.915));
map.panBy(100, 100);

// 缩放地图
map.setZoom(15);
map.zoomIn();
map.zoomOut();

// 设置视野范围
var bounds = new BMap.Bounds(
  new BMap.Point(116.3, 39.9),
  new BMap.Point(116.5, 40.0)
);
map.setBounds(bounds);

// 根据点数组设置视野
var points = [point1, point2, point3];
map.setViewport(points, {
  margins: [50, 50, 50, 50]  // 上右下左边距
});
```

## 覆盖物详解

### 标注(Marker)

```javascript
var marker = new BMap.Marker(point, {
  enableDragging: true,
  raiseOnDrag: true,
  draggingCursor: 'move'
});

marker.enableDragging();
marker.disableDragging();

marker.setPosition(newPoint);
marker.setIcon(icon);
marker.setAnimation(BMAP_ANIMATION_BOUNCE);
```

### 海量点(PointCollection)

当需要展示大量标注时，使用海量点提升性能（BMap 命名空间下没有 `MassOverlay` 类，v3 使用 `PointCollection`）：

```javascript
var points = [];
for (var i = 0; i < 10000; i++) {
  points.push(new BMap.Point(
    116.404 + Math.random() * 0.1,
    39.915 + Math.random() * 0.1
  ));
}

var pointCollection = new BMap.PointCollection(points, {
  size: BMAP_POINT_SIZE_NORMAL,  // 点大小
  color: '#d340c1'               // 点颜色
});
map.addOverlay(pointCollection);
```

### 点聚合(MarkerClusterer)

```javascript
var markers = [];
for (var i = 0; i < 100; i++) {
  var point = new BMap.Point(116.404 + Math.random(), 39.915 + Math.random());
  markers.push(new BMap.Marker(point));
}

var markerClusterer = new BMapLib.MarkerClusterer(map, {
  markers: markers,
  maxZoom: 15,           // 最大聚合级别
  gridSize: 60,          // 聚合网格大小
  styles: [{             // 自定义样式
    url: 'cluster.png',
    size: new BMap.Size(40, 40)
  }]
});
```

### 矢量覆盖物

GL 版本基于矢量渲染，直接使用 Polygon/Circle 等覆盖物即可获得矢量绘制效果（BMap 命名空间下没有 `Shape` 类与 `ShapeType` 枚举）：

```javascript
var polygon = new BMapGL.Polygon(
  [
    new BMapGL.Point(116.387112, 39.920977),
    new BMapGL.Point(116.385243, 39.913063),
    new BMapGL.Point(116.394226, 39.917988)
  ],
  {
    strokeColor: 'blue',
    strokeWeight: 2,
    fillColor: 'red',
    fillOpacity: 0.3
  }
);
map.addOverlay(polygon);
```

## 服务类详解

### 地点检索服务

```javascript
var local = new BMap.LocalSearch(map, {
  renderOptions: {
    map: map,
    panel: 'results'
  },
  onSearchComplete: function(results) {
    console.log('搜索完成');
  }
});

local.search('餐厅');
local.searchNearby('餐厅', point, 1000);
local.searchInBounds('餐厅', map.getBounds());
```

#### LocalSearchOptions

| 属性 | 类型 | 说明 |
| ---- | ---- | ---- |
| renderOptions | Object | 渲染选项 |
| onSearchComplete | Function | 搜索完成回调 |
| onMarkersSet | Function | 标注设置回调 |
| onInfoHtmlSet | Function | 信息窗口设置回调 |
| onResultsHtmlSet | Function | 结果HTML设置回调 |
| pageCapacity | Number | 每页结果数 |

#### 搜索结果对象

```javascript
// 回调在构造 LocalSearch 时通过 onSearchComplete 配置，
// results 为 LocalResult 对象
var local = new BMap.LocalSearch(map, {
  onSearchComplete: function(results) {
    var num = results.getCurrentNumPois();  // 当前页结果数
    var keyword = results.getKeyword();      // 搜索关键词

    for (var i = 0; i < num; i++) {
      var poi = results.getPoi(i);
      console.log('名称：', poi.title);
      console.log('地址：', poi.address);
      console.log('电话：', poi.phoneNumber);
      console.log('坐标：', poi.point);
      console.log('类型：', poi.type);
    }
  }
});

local.search('餐厅');
```

### 路线规划服务

#### 驾车路线

```javascript
var driving = new BMap.DrivingRoute(map, {
  renderOptions: {
    map: map,
    panel: 'route',
    autoViewport: true
  },
  policy: BMAP_DRIVING_POLICY_LEAST_TIME,
  onSearchComplete: function(results) {
    var plan = results.getPlan(0);
    console.log('距离：' + plan.getDistance() + '米');
    console.log('时间：' + plan.getDuration() + '秒');
  }
});

driving.search(startPoint, endPoint, {waypoints: [waypoint1, waypoint2]});
```

| 策略常量 | 说明 |
| --------- | ---- |
| `BMAP_DRIVING_POLICY_LEAST_TIME` | 最少时间 |
| `BMAP_DRIVING_POLICY_LEAST_DISTANCE` | 最短距离 |
| `BMAP_DRIVING_POLICY_AVOID_HIGHWAYS` | 避开高速 |

#### 公交路线

```javascript
var transit = new BMap.TransitRoute(map, {
  renderOptions: {map: map},
  policy: BMAP_TRANSIT_POLICY_LEAST_TIME
});

transit.search(startPoint, endPoint);
```

| 策略常量 | 说明 |
| --------- | ---- |
| `BMAP_TRANSIT_POLICY_LEAST_TIME` | 最少时间 |
| `BMAP_TRANSIT_POLICY_LEAST_TRANSFER` | 最少换乘 |
| `BMAP_TRANSIT_POLICY_LEAST_WALKING` | 最少步行 |
| `BMAP_TRANSIT_POLICY_AVOID_SUBWAYS` | 不乘地铁 |

#### 步行路线

```javascript
var walking = new BMap.WalkingRoute(map, {
  renderOptions: {map: map}
});

walking.search(startPoint, endPoint);
```

#### 骑行路线

```javascript
var riding = new BMap.RidingRoute(map, {
  renderOptions: {map: map}
});

riding.search(startPoint, endPoint);
```

### 地理编码服务

#### 地址解析

```javascript
var geocoder = new BMap.Geocoder();

geocoder.getPoint('北京市海淀区上地十街10号', function(point) {
  if (point) {
    map.centerAndZoom(point, 16);
    map.addOverlay(new BMap.Marker(point));
  }
}, '北京市');
```

#### 逆地址解析

```javascript
geocoder.getLocation(point, function(result) {
  if (result) {
    console.log('地址：' + result.address);
    console.log('省份：' + result.addressComponents.province);
    console.log('城市：' + result.addressComponents.city);
    console.log('区县：' + result.addressComponents.district);
    console.log('街道：' + result.addressComponents.street);
    console.log('门牌号：' + result.addressComponents.streetNumber);
    
    // 周边POI
    if (result.surroundingPois) {
      result.surroundingPois.forEach(function(poi) {
        console.log('周边：', poi.title, poi.address);
      });
    }
  }
});
```

### 定位服务

```javascript
var geolocation = new BMap.Geolocation();

geolocation.getCurrentPosition(function(result) {
  if (this.getStatus() === BMAP_STATUS_SUCCESS) {
    var point = result.point;
    map.centerAndZoom(point, 15);
    var marker = new BMap.Marker(point);
    map.addOverlay(marker);
    
    console.log('定位精度：', result.accuracy);
    console.log('地址：', result.address);
  } else {
    console.log('定位失败：', this.getStatus());
  }
}, {
  enableHighAccuracy: true,  // 高精度定位
  timeout: 10000             // 超时时间
});
```

#### 定位状态码

| 状态常量 | 值 | 说明 |
| -------- | -- | ---- |
| BMAP_STATUS_SUCCESS | 0 | 成功 |
| BMAP_STATUS_CITY_LIST | 1 | 城市列表 |
| BMAP_STATUS_UNKNOWN_LOCATION | 2 | 未知位置 |
| BMAP_STATUS_UNKNOWN_ROUTE | 3 | 未知路线 |
| BMAP_STATUS_INVALID_KEY | 4 | 无效密钥 |
| BMAP_STATUS_INVALID_REQUEST | 5 | 无效请求 |
| BMAP_STATUS_PERMISSION_DENIED | 6 | 权限被拒绝 |
| BMAP_STATUS_SERVICE_UNAVAILABLE | 7 | 服务不可用 |
| BMAP_STATUS_TIMEOUT | 8 | 超时 |

## 事件详解

### 事件监听

```javascript
var listener = map.addEventListener('click', function(e) {
  console.log(e.point);
});

map.removeEventListener('click', listener);
```

### 事件对象

```javascript
map.addEventListener('click', function(e) {
  console.log('经度：' + e.point.lng);
  console.log('纬度：' + e.point.lat);
  console.log('像素坐标：' + e.pixel.x + ', ' + e.pixel.y);
  console.log('DOM事件：', e.domEvent);
});
```

### 自定义事件

```javascript
var overlay = new BMap.Overlay();

overlay.addEventListener('customEvent', function(e) {
  console.log('自定义事件触发', e.data);
});

overlay.dispatchEvent(new BMap.Event('customEvent', {data: 'test'}));
```

## WebGL版本特性

### 3D建筑

```javascript
var map = new BMapGL.Map('container');
map.centerAndZoom(new BMapGL.Point(116.404, 39.915), 15);

// 设置倾斜和旋转
map.setHeading(45);   // 旋转角度
map.setTilt(60);      // 倾斜角度

// 启用交互
map.enableRotate(true);
map.enableTilt(true);
```

### 3D覆盖物

```javascript
// 3D棱柱
var prism = new BMapGL.Prism([
  new BMapGL.Point(116.387112, 39.920977),
  new BMapGL.Point(116.385243, 39.913063),
  new BMapGL.Point(116.394226, 39.917988)
], 5000, {  // 高度5000米
  topFillColor: '#5679ea',
  topFillOpacity: 0.5,
  sideFillColor: '#5679ea',
  sideFillOpacity: 0.9
});
map.addOverlay(prism);

// 3D标签
var label = new BMapGL.Label3D('百度大厦', new BMapGL.Point(116.404, 39.915), {
  fontSize: 20,
  fontColor: '#333',
  backgroundColor: '#fff',
  padding: 10
});
map.addOverlay(label);
```

### 热力图

```javascript
var heatmapOverlay = new BMapLib.HeatmapOverlay({
  radius: 20,
  opacity: 0.8
});
map.addOverlay(heatmapOverlay);

heatmapOverlay.setDataSet({
  data: [
    {lng: 116.418261, lat: 39.921984, count: 50},
    {lng: 116.423332, lat: 39.916532, count: 51}
  ],
  max: 100
});

// 显示/隐藏热力图
heatmapOverlay.show();
heatmapOverlay.hide();
```

## TypeScript支持

### 类型声明文件

百度地图提供官方TypeScript类型定义：

```typescript
// 安装类型定义
// npm install @types/bmap --save-dev

// 在ts文件中使用
/// <reference path="node_modules/@types/bmap/index.d.ts" />

// 或者配置tsconfig.json
{
  "compilerOptions": {
    "types": ["bmap"]
  }
}
```

### TypeScript示例

```typescript
// 定义地图类型
interface MapOptions {
  enableMapClick?: boolean;
  minZoom?: number;
  maxZoom?: number;
}

// 创建地图实例
const map = new BMap.Map('container', {
  enableMapClick: false,
  minZoom: 3,
  maxZoom: 19
} as MapOptions);

// 类型安全的标注创建
const point = new BMap.Point(116.404, 39.915);
const marker = new BMap.Marker(point, {
  enableDragging: true
});

// 类型安全的事件处理
map.addEventListener('click', (e: { point: BMap.Point; pixel: BMap.Pixel }) => {
  console.log(`点击位置：${e.point.lng}, ${e.point.lat}`);
});

// 类型安全的服务调用
const local = new BMap.LocalSearch(map, {
  onSearchComplete: (results: BMap.LocalResult) => {
    const num = results.getCurrentNumPois();
    for (let i = 0; i < num; i++) {
      const poi = results.getPoi(i);
      console.log(poi?.title);
    }
  }
});
```

### 封装工具类

```typescript
// baidu-map.ts
declare const BMap: any;

export interface BMapOptions {
  ak: string;
  container: string | HTMLElement;
  center?: { lng: number; lat: number };
  zoom?: number;
}

export class BaiduMap {
  private map: any;
  private ak: string;

  constructor(options: BMapOptions) {
    this.ak = options.ak;
    this.initMap(options);
  }

  private initMap(options: BMapOptions): void {
    const container = typeof options.container === 'string'
      ? document.getElementById(options.container)
      : options.container;

    this.map = new BMap.Map(container);
    
    const center = options.center || { lng: 116.404, lat: 39.915 };
    const zoom = options.zoom || 15;
    
    this.map.centerAndZoom(
      new BMap.Point(center.lng, center.lat),
      zoom
    );
  }

  addMarker(lng: number, lat: number, options?: any): any {
    const point = new BMap.Point(lng, lat);
    const marker = new BMap.Marker(point, options);
    this.map.addOverlay(marker);
    return marker;
  }

  setCenter(lng: number, lat: number): void {
    this.map.setCenter(new BMap.Point(lng, lat));
  }

  on(event: string, handler: Function): void {
    this.map.addEventListener(event, handler);
  }
}
```

## 性能优化

### 按需加载

绘图工具等库需单独引入 script 后使用（BMap 命名空间下没有 `BMap.loader` API）：

```html
<script src="https://api.map.baidu.com/library/DrawingManager/1.4/src/DrawingManager_min.js"></script>
```

```javascript
var drawingManager = new BMapLib.DrawingManager(map, {
  isOpen: true,
  drawingToolOptions: {
    anchor: BMAP_ANCHOR_TOP_RIGHT
  }
});
```

### 批量操作

```javascript
map.disableDragging();
for (var i = 0; i < markers.length; i++) {
  map.addOverlay(markers[i]);
}
map.enableDragging();
```

### 事件节流

```javascript
var timer = null;
map.addEventListener('moveend', function() {
  clearTimeout(timer);
  timer = setTimeout(function() {
    console.log('地图移动完成');
  }, 300);
});
```

### 内存管理

```javascript
// 销毁地图前清理
function destroyMap() {
  // 清除所有覆盖物
  map.clearOverlays();
  
  // 移除所有控件
  map.getControls().forEach(function(control) {
    map.removeControl(control);
  });
  
  // 移除事件监听
  // ...
  
  map = null;
}
```

## 下一步

- 了解 [Web服务API](04-Web服务API.md) 服务端调用
- 学习 [地图智能体](05-地图智能体.md) 智能服务
- 查看 [实战案例](07-实战案例.md)
