---
title: Web服务API
description: "百度地图Web服务API为开发者提供HTTP接口，可在服务端调用，实现地点检索、路线规划、地理编码等功能。"
keywords: [Web服务API]
category: 前端
tags: [可视化, ECharts, D3, Canvas]
---


# Web服务API

百度地图Web服务API为开发者提供HTTP接口，可在服务端调用，实现地点检索、路线规划、地理编码等功能。

## 基础说明

### 接口地址

```
https://api.map.baidu.com/
```

### 请求方式

支持GET和POST请求，返回JSON或XML格式数据。

### 公共参数

| 参数名 | 必填 | 说明 |
| ------ | ---- | ---- |
| ak | 是 | 用户密钥 |
| output | 否 | 输出格式，默认JSON |
| callback | 否 | JSONP回调函数名 |
| sn | 否 | 安全签名 |
| timestamp | 否 | 时间戳（SN签名时需要） |

### 响应格式

```json
{
  "status": 0,
  "message": "ok",
  "result": {}
}
```

### 错误码大全

| 状态码 | 说明 | 解决方案 |
| ------ | ---- | -------- |
| 0 | 成功 | - |
| 1 | 服务器内部错误 | 重试或联系技术支持 |
| 2 | 参数无效 | 检查参数格式和必填项 |
| 3 | 权限不足 | 检查AK配置和权限 |
| 4 | 配额超限 | 升级配额或购买配额包 |
| 5 | AK不存在 | 检查AK是否正确 |
| 6 | IP或域名未授权 | 配置白名单 |
| 7 | SN签名错误 | 检查签名算法和SK |
| 8 | 请求过于频繁 | 降低请求频率，使用缓存 |
| 9 | 服务不可用 | 稍后重试 |
| 10 | API不存在 | 检查接口地址 |
| 11 | 请求方法错误 | 使用正确的HTTP方法 |
| 12 | 请求超时 | 优化请求内容，减少数据量 |
| 13 | 数据格式错误 | 检查JSON/XML格式 |
| 14 | 服务正在维护 | 等待维护完成 |
| 15 | 功能未开通 | 联系商务开通功能 |
| 16 | 坐标无效 | 检查坐标格式和范围 |
| 17 | 地址解析失败 | 使用更准确的地址 |
| 18 | 路线规划失败 | 检查起终点是否可达 |
| 19 | 搜索无结果 | 调整搜索关键词 |
| 20 | 超时 | 增加超时时间 |
| 21 | 坐标转换失败 | 检查原始坐标 |
| 22 | 行政区不存在 | 检查行政区名称 |
| 23 | 天气查询失败 | 检查城市名称 |
| 24 | 实时路况不可用 | 稍后重试 |
| 25 | 轨迹服务异常 | 检查entity_name等参数 |
| 101 | AK参数缺失 | 添加ak参数 |
| 102 | AK不合法 | 检查AK格式 |
| 103 | AK已被禁用 | 联系客服处理 |
| 200 | 服务内部错误 | 联系技术支持 |
| 201 | 服务在当前区域不可用 | 检查服务范围 |
| 202 | 服务在当前时间不可用 | 等待服务恢复 |
| 300 | 未知错误 | 联系技术支持 |

## 配额与限流

### 免费配额

| 服务类型 | 日配额 | QPS限制 | 单次返回 |
| -------- | ------ | ------- | -------- |
| 地点检索 | 5,000次 | 50 | 20条 |
| 地点详情 | 5,000次 | 50 | - |
| 地理编码 | 5,000次 | 50 | - |
| 逆地理编码 | 5,000次 | 50 | - |
| 路线规划 | 5,000次 | 50 | - |
| 坐标转换 | 5,000次 | 50 | 100点 |
| 静态图 | 5,000次 | 50 | - |
| 行政区域 | 5,000次 | 50 | - |

### 配额提升

| 方式 | 配额提升 | 费用 |
| ---- | -------- | ---- |
| 企业认证 | 2-5倍 | 免费 |
| 配额包 | 自定义 | 按量计费 |
| 商务定制 | 不限 | 协商定价 |

### 限流策略

```javascript
// 实现请求限流
class RateLimiter {
  constructor(qps = 50) {
    this.qps = qps;
    this.queue = [];
    this.lastTime = 0;
  }

  async request(url) {
    const now = Date.now();
    const elapsed = now - this.lastTime;
    const minInterval = 1000 / this.qps;

    if (elapsed < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - elapsed));
    }

    this.lastTime = Date.now();
    return fetch(url);
  }
}

const limiter = new RateLimiter(50);
```

## 地点检索

### 地点搜索

```http
GET https://api.map.baidu.com/place/v2/search?query=餐厅&region=北京&output=json&ak=您的密钥
```

| 参数 | 必填 | 类型 | 说明 |
| ---- | ---- | ---- | ---- |
| query | 是 | String | 检索关键字，多个用$分隔 |
| region | 是 | String | 检索区域（城市名） |
| city_limit | 否 | Boolean | 是否限制在区域内 |
| output | 否 | String | 输出格式 |
| page_num | 否 | Number | 分页页码，默认0 |
| page_size | 否 | Number | 分页大小，默认10，最大20 |
| scope | 否 | Number | 检索精度：1基础，2详细 |
| filter | 否 | String | 过滤条件 |
| coord_type | 否 | Number | 坐标类型：1WGS84，2GCJ02，3BD09 |

**响应示例：**

```json
{
  "status": 0,
  "message": "ok",
  "total": 100,
  "results": [
    {
      "name": "餐厅名称",
      "location": {
        "lng": 116.404,
        "lat": 39.915
      },
      "address": "详细地址",
      "province": "北京市",
      "city": "北京市",
      "area": "海淀区",
      "telephone": "电话号码",
      "uid": "唯一标识",
      "street_id": "街道ID",
      "detail": 1,
      "detail_info": {
        "tag": "标签",
        "rating": 4.5,
        "price": 80,
        "shop_hours": "营业时间"
      }
    }
  ]
}
```

### 周边搜索

```http
GET https://api.map.baidu.com/place/v2/search?query=餐厅&location=39.915,116.404&radius=1000&output=json&ak=您的密钥
```

| 参数 | 必填 | 类型 | 说明 |
| ---- | ---- | ---- | ---- |
| query | 是 | String | 检索关键字 |
| location | 是 | String | 中心点坐标(纬度,经度) |
| radius | 否 | Number | 搜索半径，默认1000米 |
| radius_limit | 否 | Boolean | 是否严格限制半径 |
| sort_by_distance | 否 | Number | 按距离排序：0否，1是 |
| filter | 否 | String | 过滤条件 |

### 多边形区域搜索

```http
GET https://api.map.baidu.com/place/v2/search?query=餐厅&bounds=39.915,116.404,39.975,116.414&output=json&ak=您的密钥
```

| 参数 | 说明 |
| ---- | ---- |
| bounds | 区域范围：左下角纬度,左下角经度,右上角纬度,右上角经度 |

### 地点详情

```http
GET https://api.map.baidu.com/place/v2/detail?uid=地点UID&output=json&ak=您的密钥
```

**响应示例：**

```json
{
  "status": 0,
  "result": {
    "uid": "xxx",
    "name": "地点名称",
    "location": {"lng": 116.404, "lat": 39.915},
    "address": "详细地址",
    "telephone": "电话",
    "detail_info": {
      "tag": "分类标签",
      "rating": 4.5,
      "price": 80,
      "shop_hours": "营业时间",
      "alias": "别名",
      "description": "描述",
      "image": "图片URL",
      "photos": ["图片数组"],
      "scope_type": "类型",
      "scope_grade": "等级",
      "content_tag": "内容标签"
    }
  }
}
```

### 地点输入提示

```http
GET https://api.map.baidu.com/place/v2/suggestion?query=中关村&region=北京&output=json&ak=您的密钥
```

**响应示例：**

```json
{
  "status": 0,
  "result": [
    {
      "name": "中关村",
      "location": {"lng": 116.31, "lat": 39.98},
      "uid": "xxx",
      "city": "北京市",
      "district": "海淀区",
      "business": "中关村"
    }
  ]
}
```

## 地理编码

### 地理编码(地址转坐标)

```http
GET https://api.map.baidu.com/geocoding/v3/?address=北京市海淀区上地十街10号&output=json&ak=您的密钥
```

| 参数 | 必填 | 类型 | 说明 |
| ---- | ---- | ---- | ---- |
| address | 是 | String | 待解析的地址 |
| city | 否 | String | 指定城市 |
| ret_coordtype | 否 | String | 返回坐标类型：bd09ll/gcj02ll/wgs84ll |
| postal_code | 否 | Number | 是否返回邮编：0否，1是 |

**响应示例：**

```json
{
  "status": 0,
  "result": {
    "location": {
      "lng": 116.308,
      "lat": 40.056
    },
    "precise": 1,
    "confidence": 80,
    "comprehension": 100,
    "level": "道路"
  }
}
```

| 字段 | 说明 |
| ---- | ---- |
| precise | 精确程度：1精确，0模糊 |
| confidence | 置信度(0-100) |
| comprehension | 理解程度(0-100) |
| level | 地址级别：道路、道路交叉口、POI等 |

### 逆地理编码(坐标转地址)

```http
GET https://api.map.baidu.com/reverse_geocoding/v3/?location=40.056,116.308&output=json&ak=您的密钥
```

| 参数 | 必填 | 类型 | 说明 |
| ---- | ---- | ---- | ---- |
| location | 是 | String | 坐标(纬度,经度) |
| coordtype | 否 | String | 坐标类型：bd09ll/gcj02ll/wgs84ll |
| radius | 否 | Number | POI召回半径，默认1000 |
| extensions_poi | 否 | String | 是否返回POI：road/road surrounding/poi |
| extensions_road | 否 | Boolean | 是否返回道路信息 |
| extensions_town | 否 | Boolean | 是否返回乡镇信息 |
| language | 否 | String | 语言：zh-CN/en-GB |

**响应示例：**

```json
{
  "status": 0,
  "result": {
    "location": {
      "lng": 116.308,
      "lat": 40.056
    },
    "formatted_address": "北京市海淀区上地十街10号",
    "business": "上地",
    "addressComponent": {
      "country": "中国",
      "country_code": 0,
      "country_code_iso": "CHN",
      "country_code_iso2": "CN",
      "province": "北京市",
      "city": "北京市",
      "city_level": 2,
      "district": "海淀区",
      "town": "上地街道",
      "adcode": "110108",
      "street": "上地十街",
      "street_number": "10号",
      "direction": "附近",
      "distance": "10"
    },
    "pois": [
      {
        "addr": "详细地址",
        "cp": "数据来源",
        "direction": "方向",
        "distance": "距离",
        "name": "POI名称",
        "poiType": "POI类型",
        "point": {"x": 116.308, "y": 40.056},
        "tag": "标签",
        "tel": "电话",
        "uid": "唯一标识",
        "zip": "邮编"
      }
    ],
    "roads": [],
    "poiRegions": []
  }
}
```

## 路线规划

### 驾车路线规划

```http
GET https://api.map.baidu.com/direction/v2/driving?origin=40.056,116.308&destination=39.915,116.404&output=json&ak=您的密钥
```

| 参数 | 必填 | 类型 | 说明 |
| ---- | ---- | ---- | ---- |
| origin | 是 | String | 起点(纬度,经度) |
| destination | 是 | String | 终点(纬度,经度) |
| waypoints | 否 | String | 途经点，多个用\|分隔 |
| tactics | 否 | Number | 导航策略 |
| coord_type | 否 | String | 坐标类型 |
| alternatives | 否 | Boolean | 是否返回备选路线 |
| speed_limit | 否 | Number | 限速(KM/h) |
| avoid_roads | 否 | String | 避让道路名称 |
| avoid_scenes | 否 | Number | 避让场景 |

**导航策略：**

| 值 | 说明 |
| -- | ---- |
| 0 | 默认 |
| 1 | 逃避拥堵 |
| 2 | 距离优先（距离最短） |
| 3 | 不走高速 |
| 4 | 躲避收费 |
| 5 | 躲避收费&不走高速 |
| 6 | 躲避收费&躲避拥堵 |
| 7 | 躲避收费&不走高速&躲避拥堵 |
| 8 | 优先高速 |
| 9 | 躲避拥堵&优先高速 |
| 10 | 躲避收费&躲避拥堵&优先高速 |
| 11 | 优先大道 |
| 12 | 优先大道&躲避拥堵 |

**响应示例：**

```json
{
  "status": 0,
  "result": {
    "routes": [
      {
        "distance": 12000,
        "duration": 1800,
        "toll": 10,
        "toll_distance": 5000,
        "toll_info": {"toll_price": 10, "toll_mileage": 5},
        "restriction": 0,
        "traffic_lights": 15,
        "steps": [
          {
            "distance": 500,
            "duration": 60,
            "road": "道路名称",
            "instruction": "沿道路名称行驶500米",
            "path": "坐标串",
            "start_location": {"lng": 116.308, "lat": 40.056},
            "end_location": {"lng": 116.310, "lat": 40.060},
            "turn_type": "直行",
            "road_type": 0,
            "direction": "东",
            "traffic_condition": [
              {"distance": 300, "status": 1},
              {"distance": 200, "status": 2}
            ]
          }
        ]
      }
    ]
  }
}
```

### 骑行路线规划

```http
GET https://api.map.baidu.com/direction/v2/riding?origin=40.056,116.308&destination=39.915,116.404&output=json&ak=您的密钥
```

| 参数 | 说明 |
| ---- | ---- |
| riding_type | 骑行类型：0普通，1电动 |

### 步行路线规划

```http
GET https://api.map.baidu.com/direction/v2/walking?origin=40.056,116.308&destination=39.915,116.404&output=json&ak=您的密钥
```

### 公交路线规划

```http
GET https://api.map.baidu.com/direction/v2/transit?origin=40.056,116.308&destination=39.915,116.404&city=北京&output=json&ak=您的密钥
```

| 参数 | 必填 | 说明 |
| ---- | ---- | ---- |
| origin | 是 | 起点(纬度,经度) |
| destination | 是 | 终点(纬度,经度) |
| city | 是 | 城市 |
| tactics | 否 | 换乘策略 |

**换乘策略：**

| 值 | 说明 |
| -- | ---- |
| 0 | 推荐 |
| 1 | 少换乘 |
| 2 | 少步行 |
| 3 | 不乘地铁 |
| 4 | 时间短 |
| 5 | 地铁优先 |

## 距离测量

```http
GET https://api.map.baidu.com/routematrix/v2/driving?origins=40.056,116.308&destinations=39.915,116.404&output=json&ak=您的密钥
```

| 参数 | 必填 | 说明 |
| ---- | ---- | ---- |
| origins | 是 | 起点坐标，多个用\|分隔 |
| destinations | 是 | 终点坐标，多个用\|分隔 |
| type | 否 | 测量方式：driving/walking/riding |
| tactics | 否 | 导航策略 |

**响应示例：**

```json
{
  "status": 0,
  "result": [
    {
      "distance": {
        "text": "12.5公里",
        "value": 12500
      },
      "duration": {
        "text": "20分钟",
        "value": 1200
      },
      "origin": {"lng": 116.308, "lat": 40.056},
      "destination": {"lng": 116.404, "lat": 39.915}
    }
  ]
}
```

## 静态图

生成静态地图图片，适合简单展示场景。

```http
GET https://api.map.baidu.com/staticimage/v2?center=116.404,39.915&zoom=15&width=400&height=300&ak=您的密钥
```

| 参数 | 必填 | 说明 |
| ---- | ---- | ---- |
| center | 是 | 中心点坐标(经度,纬度) |
| zoom | 否 | 缩放级别(3-18) |
| width | 否 | 图片宽度(默认400，最大1024) |
| height | 否 | 图片高度(默认300，最大1024) |
| markers | 否 | 标注点 |
| paths | 否 | 折线 |
| labels | 否 | 标签 |
| scale | 否 | 比例尺 |
| dpiType | 否 | 分辨率：ph/high |

### 添加标注

```
markers=116.404,39.915|116.408,39.920
markerStyles=样式配置
```

**标注样式：**

```
markerStyles=larger,l,A,0xFF0000
```

| 参数 | 说明 |
| ---- | ---- |
| size | 大小：small/normal/large/larger |
| label | 标签内容 |
| color | 颜色(十六进制) |

### 添加折线

```
paths=116.404,39.915;116.408,39.920;116.410,39.925
pathStyles=样式配置
```

## 坐标转换

将其他坐标系转换为百度坐标。

```http
GET https://api.map.baidu.com/geoconv/v1/?coords=114.21892734521,29.575429778924&from=1&to=5&ak=您的密钥
```

| 参数 | 必填 | 说明 |
| ---- | ---- | ---- |
| coords | 是 | 需转换的坐标，多个用\|分隔 |
| from | 否 | 源坐标类型 |
| to | 否 | 目标坐标类型 |

**坐标类型对照：**

| 编号 | 说明 |
| ---- | ---- |
| 1 | GPS坐标(WGS84) |
| 2 | 火星坐标(GCJ02) |
| 3 | 百度坐标(BD09) |
| 4 | MapBar坐标 |
| 5 | 百度坐标(BD09) |
| 6 | 搜狗坐标 |
| 7 | 51地图坐标 |
| 8 | 谷歌坐标(GCJ02) |

**响应示例：**

```json
{
  "status": 0,
  "result": [
    {
      "x": 114.230,
      "y": 29.583
    }
  ]
}
```

## 行政区域

```http
GET https://api.map.baidu.com/api_custom/v1/boundaries?keyword=海淀区&output=json&ak=您的密钥
```

| 参数 | 必填 | 说明 |
| ---- | ---- | ---- |
| keyword | 是 | 行政区名称 |
| sub_admin | 否 | 是否返回下级行政区：0否，1是 |
| level | 否 | 行政区级别 |

**响应示例：**

```json
{
  "status": 0,
  "boundaries": [
    {
      "name": "海淀区",
      "code": "110108",
      "boundary": "坐标点串"
    }
  ]
}
```

## SDK封装示例

### Node.js SDK

```javascript
// baidu-map-sdk.js
const crypto = require('crypto');
const axios = require('axios');

class BaiduMapSDK {
  constructor(ak, sk = null) {
    this.ak = ak;
    this.sk = sk;
    this.baseUrl = 'https://api.map.baidu.com';
  }

  // 生成SN签名
  generateSn(query) {
    if (!this.sk) return null;
    const str = query + this.sk;
    return crypto.createHash('md5').update(encodeURIComponent(str)).digest('hex');
  }

  // 通用请求方法
  async request(path, params) {
    const queryString = new URLSearchParams(params).toString();
    const sn = this.generateSn(queryString);
    const url = `${this.baseUrl}${path}?${queryString}${sn ? '&sn=' + sn : ''}`;

    const response = await axios.get(url);
    
    if (response.data.status !== 0) {
      throw new Error(`API错误: ${response.data.message || response.data.status}`);
    }

    return response.data;
  }

  // 地理编码
  async geocode(address, city = null) {
    const params = { address, ak: this.ak, output: 'json' };
    if (city) params.city = city;
    return this.request('/geocoding/v3/', params);
  }

  // 逆地理编码
  async reverseGeocode(lat, lng) {
    return this.request('/reverse_geocoding/v3/', {
      location: `${lat},${lng}`,
      ak: this.ak,
      output: 'json'
    });
  }

  // 地点搜索
  async searchPlace(query, region, options = {}) {
    return this.request('/place/v2/search', {
      query,
      region,
      ak: this.ak,
      output: 'json',
      ...options
    });
  }

  // 路线规划
  async drivingRoute(originLat, originLng, destLat, destLng, options = {}) {
    return this.request('/direction/v2/driving', {
      origin: `${originLat},${originLng}`,
      destination: `${destLat},${destLng}`,
      ak: this.ak,
      output: 'json',
      ...options
    });
  }

  // 坐标转换
  async convertCoords(coords, from = 1, to = 5) {
    const coordsStr = coords.map(c => `${c.lng},${c.lat}`).join('|');
    return this.request('/geoconv/v1/', {
      coords: coordsStr,
      from,
      to,
      ak: this.ak,
      output: 'json'
    });
  }
}

module.exports = BaiduMapSDK;
```

### 使用示例

```javascript
const BaiduMapSDK = require('./baidu-map-sdk');

// 初始化SDK
const bmap = new BaiduMapSDK('您的AK', '您的SK');

// 地理编码
async function test() {
  try {
    // 地址转坐标
    const geoResult = await bmap.geocode('北京市海淀区上地十街10号');
    console.log('坐标：', geoResult.result.location);

    // 坐标转地址
    const reverseResult = await bmap.reverseGeocode(39.915, 116.404);
    console.log('地址：', reverseResult.result.formatted_address);

    // 地点搜索
    const searchResult = await bmap.searchPlace('餐厅', '北京', { page_size: 10 });
    console.log('搜索结果：', searchResult.results);

    // 路线规划
    const routeResult = await bmap.drivingRoute(39.915, 116.404, 40.056, 116.308);
    console.log('距离：', routeResult.result.routes[0].distance);
  } catch (error) {
    console.error('错误：', error.message);
  }
}

test();
```

### Python SDK示例

```python
import hashlib
import requests
from urllib.parse import quote

class BaiduMapSDK:
    def __init__(self, ak, sk=None):
        self.ak = ak
        self.sk = sk
        self.base_url = 'https://api.map.baidu.com'

    def _generate_sn(self, query):
        if not self.sk:
            return None
        temp = query + self.sk
        return hashlib.md5(quote(temp).encode('utf-8')).hexdigest()

    def _request(self, path, params):
        params['ak'] = self.ak
        params['output'] = 'json'
        query = '&'.join([f'{k}={v}' for k, v in params.items()])
        sn = self._generate_sn(query)
        url = f'{self.base_url}{path}?{query}'
        if sn:
            url += f'&sn={sn}'
        
        response = requests.get(url)
        data = response.json()
        
        if data['status'] != 0:
            raise Exception(f"API错误: {data.get('message', data['status'])}")
        
        return data

    def geocode(self, address, city=None):
        params = {'address': address}
        if city:
            params['city'] = city
        return self._request('/geocoding/v3/', params)

    def reverse_geocode(self, lat, lng):
        return self._request('/reverse_geocoding/v3/', {
            'location': f'{lat},{lng}'
        })

    def search_place(self, query, region, **options):
        params = {'query': query, 'region': region, **options}
        return self._request('/place/v2/search', params)

    def driving_route(self, origin_lat, origin_lng, dest_lat, dest_lng, **options):
        params = {
            'origin': f'{origin_lat},{origin_lng}',
            'destination': f'{dest_lat},{dest_lng}',
            **options
        }
        return self._request('/direction/v2/driving', params)
```

## 最佳实践

### 安全签名

为防止AK被盗用，建议使用SN签名：

```javascript
const crypto = require('crypto');

function generateSn(ak, sk, query) {
  const str = query + sk;
  return crypto.createHash('md5').update(encodeURIComponent(str)).digest('hex');
}

// 使用示例
const ak = '您的AK';
const sk = '您的SK';
const query = '/geocoding/v3/?address=北京&ak=' + ak + '&output=json';
const sn = generateSn(ak, sk, query);
```

### 错误处理

```javascript
async function searchPlace(query) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 0) {
      throw new Error(`API错误: ${data.message || data.status}`);
    }
    
    return data.results;
  } catch (error) {
    console.error('请求失败:', error);
    throw error;
  }
}
```

### 配额管理

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

async function searchWithCache(query) {
  const cacheKey = `search_${query}`;
  
  // 检查缓存
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.time < CACHE_TTL) {
      return cached.data;
    }
  }
  
  // 请求数据
  const result = await searchPlace(query);
  
  // 更新缓存
  cache.set(cacheKey, {
    data: result,
    time: Date.now()
  });
  
  return result;
}

// 定期清理过期缓存
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.time > CACHE_TTL) {
      cache.delete(key);
    }
  }
}, 60 * 1000);
```

### 批量请求

```javascript
// 批量地理编码
async function batchGeocode(addresses) {
  const results = [];
  const concurrency = 10; // 并发数
  
  for (let i = 0; i < addresses.length; i += concurrency) {
    const batch = addresses.slice(i, i + concurrency);
    const promises = batch.map(addr => geocode(addr));
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    
    // 避免超过QPS限制
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}
```

## 下一步

- 学习 [地图智能体](05-地图智能体.md) 智能服务
- 了解 [行业解决方案](06-行业解决方案.md)
- 查看 [实战案例](07-实战案例.md)
