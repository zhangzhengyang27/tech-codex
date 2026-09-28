---
title: 数据获取与 API 可视化实战
description: 掌握 CSV/JSON 文件处理、requests API 调用、异常处理，结合 Matplotlib 与 Plotly 完成端到端数据可视化
version: 1.0
author: 文档维护组
created: 2026-06-07
updated: 2026-08-12
status: 正式
category: Python

---

# 数据获取与 API 可视化实战

## 开篇概述

在数据分析的完整工作流中，**数据获取**是第一步，也是最关键的一步。无论你的可视化技巧多么精湛、模型算法多么精妙，如果无法高效地获取和预处理数据，一切都无从谈起。本章将系统讲解两大类数据获取途径——**本地文件（CSV/JSON）**与 **Web API 请求**——并结合 **Matplotlib** 和 **Plotly** 完成端到端的数据可视化呈现。

### 知识体系总览

```mermaid
mindmap
  root((数据获取与<br/>API可视化))
    数据文件处理
      CSV文件
        csv模块
        DictReader
        日期解析
      JSON文件
        json.load/dump
        GeoJSON格式
        嵌套结构解析
    Web API调用
      HTTP协议基础
      requests库
        GET/POST请求
        认证方式
        速率限制
      GitHub API
        搜索仓库
        响应解析
      Hacker News API
        批量请求
        并发控制
    可视化呈现
      Matplotlib
        折线图/填充图
        温度对比
      Plotly Express
        散点地图
        交互式条形图
    工程实践
      异常处理
      缓存策略
      重试机制
      编码问题
```

### 核心工具链

| 阶段 | 工具库 | 用途 | 安装命令 |
|------|--------|------|----------|
| **CSV 处理** | `csv`（内置） | 读写 CSV 文件 | 无需安装 |
| **JSON 处理** | `json`（内置） | 解析 JSON 数据 | 无需安装 |
| **日期解析** | `datetime`（内置） | 字符串转日期对象 | 无需安装 |
| **HTTP 请求** | `requests` | 调用 Web API | `pip install requests` |
| **静态可视化** | `matplotlib` | 绘制出版级图表 | `pip install matplotlib` |
| **交互可视化** | `plotly` | 生成交互式 HTML | `pip install plotly` |

::: tip 本章学习目标
完成本章学习后，你将能够：
- ✅ 使用 `csv` 和 `json` 模块熟练处理常见数据文件格式
- ✅ 掌握 `requests` 库发起 HTTP 请求并处理响应
- ✅ 理解 API 认证、限流等工程概念
- ✅ 结合 Matplotlib 和 Plotly 完成从数据获取到可视化的完整流程
- ✅ 具备处理缺失值、编码错误、网络异常等实际问题的能力
:::

---

## 数据文件格式对比

在开始具体操作之前，先对常见的数据存储格式建立全局认知。

### 格式速查表

| 特性 | CSV | JSON | XML | Parquet |
|------|-----|------|-----|---------|
| **可读性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **体积** | 小 | 中 | 大 | 最小 |
| **嵌套支持** | ❌ 不支持 | ✅ 原生支持 | ✅ 支持 | ✅ 支持 |
| **类型保真** | ❌ 全为字符串 | ✅ 类型明确 | ⚠️ 需 schema | ✅ 完整类型 |
| **Python 支持** | `csv` 模块 | `json` 模块 | `xml.etree` | `pyarrow` |
| **适用场景** | 表格数据 | API 响应/配置 | 传统系统集成 | 大数据/列式存储 |
| **典型扩展名** | `.csv` | `.json` | `.xml` | `.parquet` |

### 选择决策树

```mermaid
flowchart TD
    Start[数据来源是什么?] --> Q1{结构类型?}

    Q1 -->|二维表格<br/>行列整齐| A1[📊 CSV 格式]
    Q1 -->|嵌套/层级结构| A2[📋 JSON 格式]
    Q1 -->|遗留系统交换| A3[📄 XML 格式]
    Q1 -->|大数据量分析| A4[🗄️ Parquet 格式]

    A1 --> B1["csv.reader / csv.DictReader"]
    A2 --> B2["json.load / json.dumps"]
    A3 --> B3["ElementTree / lxml"]
    A4 --> B4["pyarrow / pandas.read_parquet"]

```

---

## CSV 数据处理实战

CSV（Comma-Separated Values）是最古老也最广泛使用的数据交换格式之一。Python 内置的 `csv` 模块提供了完善的读写支持。

### csv 模块核心 API

#### 1. 基础读取：csv.reader

```python
import csv

# 示例 CSV 内容（sitka_weather_2024.csv）：
# name,station,date,PRCP,TMAX,TMIN
# Sitka Airport,USW00094621,2024-01-01,0.00,7,-1
# Sitka Airport,USW00094621,2024-01-02,15.99,5,-3

filename = 'data/sitka_weather_2024.csv'
with open(filename) as f:
    reader = csv.reader(f)
    header_row = next(reader)  # 读取文件头

    print("表头字段：")
    for index, column_header in enumerate(header_row):
        print(index, column_header)

    # 输出：
    # 0 name
    # 1 station
    # 2 date
    # 3 PRCP（降水量）
    # 4 TMAX（最高温度）
    # 5 TMIN（最低温度）
```

#### 2. 字典式读取：csv.DictReader

```python
import csv

filename = 'data/sitka_weather_2024.csv'

with open(filename) as f:
    reader = csv.DictReader(f)
    for row in reader:
        # 通过列名访问，更直观
        print(f"日期: {row['date']}, 最高温: {row['TMAX']}°C")
        break  # 只打印第一行演示
```

| 方法 | 返回类型 | 访问方式 | 适用场景 |
|------|----------|----------|----------|
| `csv.reader(f)` | 列表迭代器 | `row[索引]` | 列位置固定、性能敏感 |
| `csv.DictReader(f)` | 字典迭代器 | `row['列名']` | 列名有意义、代码可读性优先 |

#### 3. 写入数据：csv.writer

```python
import csv

headers = ['name', 'age', 'city']
data = [
    ['张三', 28, '北京'],
    ['李四', 32, '上海'],
]

with open('output.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(headers)       # 写入单行
    writer.writerows(data)         # 批量写入多行
```

::: warning 关键细节
- **`newline=''`**：防止 Windows 平台出现空行
- **`encoding='utf-8'`**：显式指定编码避免中文乱码
- **写入顺序**：先写 header 再写 data，保持一致
:::

### 日期时间解析

CSV 中的日期通常是字符串形式，需要转换为 `datetime` 对象才能进行时间序列分析和排序。

#### datetime.strptime() 格式码速查表

| 格式码 | 含义 | 示例 | 输出 |
|--------|------|------|------|
| `%Y` | 四位年份 | 2024 | 2024 |
| `%m` | 两位月份 | 01-12 | 06 |
| `%d` | 两位日期 | 01-31 | 07 |
| `%H` | 24小时制小时 | 00-23 | 14 |
| `%M` | 分钟 | 00-59 | 30 |
| `%S` | 秒 | 00-59 | 45 |
| `%B` | 完整月份名 | June | June |
| `%b` | 缩写月份名 | Jun | Jun |
| `%A` | 完整星期名 | Friday | Friday |
| `%a` | 缩写星期名 | Fri | Fri |

```python
from datetime import datetime

date_string = '2024-01-02'
converted_date = datetime.strptime(date_string, '%Y-%m-%d')
print(converted_date)   # 2024-01-02 00:00:00
print(type(converted_date))  # <class 'datetime.datetime'>

# 提取年月日
print(converted_date.year)   # 2024
print(converted_date.month)  # 1
print(converted_date.day)    # 2
```

### 案例：天气数据可视化（Matplotlib）

以下是一个完整的端到端案例：读取 CSV 天气数据 → 解析日期 → 用 Matplotlib 绘制温度曲线。

```python
"""
天气数据可视化：Sitka 与死亡谷温度对比
数据源：NOAA 天气数据（CSV格式）
"""
import csv
from datetime import datetime
import matplotlib.pyplot as plt

# ====== 配置中文显示 ======
plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False


def get_weather_data(filename, date_index, tmax_index, tmin_index):
    """
    从 CSV 文件提取日期和温度数据

    Args:
        filename: CSV 文件路径
        date_index: 日期列索引
        tmax_index: 最高温列索引
        tmin_index: 最低温列索引

    Returns:
        (dates, highs, lows) 元组
    """
    dates, highs, lows = [], [], []

    with open(filename) as f:
        reader = csv.reader(f)
        header_row = next(reader)  # 跳过表头

        for row in reader:
            try:
                current_date = datetime.strptime(row[date_index], '%Y-%m-%d')
                high = int(row[tmax_index])
                low = int(row[tmin_index])
            except ValueError:
                # 跳过缺失或格式异常的数据行
                print(f"⚠️ 缺失数据: {row}")
                continue

            dates.append(current_date)
            highs.append(high)
            lows.append(low)

    return dates, highs, lows


def plot_temperature_comparison(sitka_dates, sitka_highs, sitka_lows,
                                 dv_dates, dv_highs, dv_lows):
    """绘制双城市温度对比图"""

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))
    fig.suptitle('Sitka vs 死亡谷 2024 年温度对比', fontsize=16, fontweight='bold')

    # ---- 左图：Sitka ----
    ax1.plot(sitka_dates, sitka_highs, c='red', alpha=0.6, label='最高温')
    ax1.plot(sitka_dates, sitka_lows, c='blue', alpha=0.6, label='最低温')
    ax1.fill_between(sitka_dates, sitka_highs, sitka_lows,
                     facecolor='blue', alpha=0.15, label='温差区间')
    ax1.set_title('Sitka（阿拉斯加）', fontsize=13, fontweight='bold')
    ax1.set_xlabel('日期', fontsize=11)
    ax1.set_ylabel('温度 (°C)', fontsize=11)
    ax1.legend(loc='upper right')
    ax1.grid(True, alpha=0.3)

    # ---- 右图：死亡谷 ----
    ax2.plot(dv_dates, dv_highs, c='red', alpha=0.6, label='最高温')
    ax2.plot(dv_dates, dv_lows, c='blue', alpha=0.6, label='最低温')
    ax2.fill_between(dv_dates, dv_highs, dv_lows,
                     facecolor='orange', alpha=0.15, label='温差区间')
    ax2.set_title('死亡谷（加利福尼亚）', fontsize=13, fontweight='bold')
    ax2.set_xlabel('日期', fontsize=11)
    ax2.set_ylabel('温度 (°C)', fontsize=11)
    ax2.legend(loc='upper right')
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig('temperature_comparison.png', dpi=150, bbox_inches='tight')
    plt.show()
    print("✅ 温度对比图已生成")


if __name__ == '__main__':
    # 注意：请确保 data 目录下有对应的 CSV 文件
    # 这里使用模拟数据演示完整流程

    # Sitka 数据（模拟）
    sitka_dates, sitka_highs, sitka_lows = [], [], []
    from datetime import timedelta
    base_date = datetime(2024, 1, 1)
    for i in range(365):
        sitka_dates.append(base_date + timedelta(days=i))
        sitka_highs.append(5 + (i % 180 - 90) * 0.05 + (i // 30))  # 模拟季节变化
        sitka_lows.append(-2 + (i % 180 - 90) * 0.03 + (i // 30))

    # 死亡谷数据（模拟）
    dv_dates, dv_highs, dv_lows = [], [], []
    for i in range(365):
        dv_dates.append(base_date + timedelta(days=i))
        dv_highs.append(35 + (i % 180 - 90) * 0.08)
        dv_lows.append(18 + (i % 180 - 90) * 0.05)

    plot_temperature_comparison(
        sitka_dates, sitka_highs, sitka_lows,
        dv_dates, dv_highs, dv_lows
    )
```

#### fill_between() 核心参数

| 参数 | 说明 | 示例值 |
|------|------|--------|
| `x` | X 轴数据 | `dates` 列表 |
| `y1` | 上边界 | `highs` 最高温 |
| `y2` | 下边界 | `lows` 最低温 |
| `facecolor` | 填充颜色 | `'blue'`, `'#3498db'` |
| `alpha` | 透明度（0-1） | `0.15`（半透明） |
| `interpolate` | 是否插值平滑 | `True` / `False` |
| `label` | 图例标签 | `'温差区间'` |

::: tip 设计理念
`fill_between()` 的核心价值在于**直观展示数据的波动范围**。在温度对比中，它让读者一眼看出两个城市的温差幅度差异——死亡谷的填充区域明显比 Sitka 更宽更深。
:::

### 缺失值与异常处理策略

真实数据几乎必然包含缺失值或异常值。以下是两种主流处理方式的对比：

| 方案 | 方法 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|----------|
| **try/except 跳过** | `continue` 跳过异常行 | 简单直接 | 丢失数据 | 异常比例低 (<5%) |
| **pandas.fillna()** | 填充均值/中位数/插值 | 保留数据量 | 可能引入偏差 | 结构化分析任务 |

```python
# 方案一：原生 Python try/except（适合小规模数据）
for row in reader:
    try:
        high = int(row[4])  # TMAX 列
        low = int(row[5])   # TMIN 列
    except ValueError:
        print(f"跳过异常行: {row}")
        continue
    # 正常处理...

# 方案二：pandas 自动处理（适合大规模数据）
import pandas as pd
df = pd.read_csv('data/weather.csv')
df['TMAX'] = pd.to_numeric(df['TMAX'], errors='coerce')  # 无法转换的变为 NaN
df['TMAX'] = df['TMAX'].fillna(df['TMAX'].mean())         # 用均值填充
```

---

## JSON 数据处理实战

JSON（JavaScript Object Notation）是 Web API 的**事实标准**响应格式。Python 的 `json` 模块提供了简洁高效的编解码能力。

### json 模块四大方法

| 方法 | 方向 | 输入 | 输出 | 典型用途 |
|------|------|------|------|----------|
| `json.loads()` | 字符串→对象 | JSON 字符串 | dict/list | 解析 API 响应文本 |
| `json.load()` | 文件→对象 | 文件对象 | dict/list | 读取本地 JSON 文件 |
| `json.dumps()` | 对象→字符串 | dict/list | JSON 字符串 | 构造请求体 |
| `json.dump()` | 对象→文件 | dict/list + 文件 | 写入文件 | 保存数据到磁盘 |

```python
import json

# === loads：字符串 → Python 对象 ===
json_str = '{"name": "python", "version": "3.12", "features": ["动态类型", "丰富生态"]}'
data = json.loads(json_str)
print(data['name'])          # python
print(data['features'][0])  # 动态类型

# === dumps：Python 对象 → 格式化字符串 ===
pretty_json = json.dumps(data, indent=2, ensure_ascii=False)
print(pretty_json)
# {
#   "name": "python",
#   "version": "3.12",
#   "features": ["动态类型", "丰富生态"]
# }

# === load/dump：文件读写 ===
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

with open('data.json', 'r', encoding='utf-8') as f:
    loaded = json.load(f)
    print(loaded)  # {'name': 'python', ...}
```

::: warning ensure_ascii 参数
默认情况下 `json.dumps()` 会将非 ASCII 字符转义为 `\uXXXX` 格式。设置 `ensure_ascii=False` 可以保留原始中文字符，提升可读性。
:::

### GeoJSON 地震数据结构解析

GeoJSON 是一种基于 JSON 的地理空间数据格式，广泛用于地图应用和地震数据发布。下面以 USGS 地震数据为例进行完整解析。

#### GeoJSON 数据结构图

```mermaid
graph TD
    Root["GeoJSON 根对象"] --> Type["type: 'FeatureCollection'"]
    Root --> Metadata["metadata（元数据）"]
    Root --> Features["features[]（要素数组）"]

    Metadata --> M1["count: 总数"]
    Metadata --> M2["generated: 生成时间戳"]

    Features --> Feature["单个 Feature 要素"]

    Feature --> F1["type: 'Feature'"]
    Feature --> Props["properties（属性）"]
    Feature --> Geom["geometry（几何）"]

    Props --> P1["mag: 震级"]
    Props --> P2["place: 地点描述"]
    Props --> P3["time: 发生时间"]
    Props --> P4["title: 标题"]
    Props --> P5["url: 详情链接"]

    Geom --> G1["type: 'Point'"]
    Geom --> G2["coordinates: [经度,纬度,深度]"]

```

#### 完整解析代码

```python
"""
GeoJSON 地震数据解析与 Plotly 地图可视化
数据源：USGS Earthquake API (https://earthquake.usgs.gov/)
"""
import json
import plotly.express as px


def extract_earthquake_data(json_file):
    """
    从 GeoJSON 文件提取地震数据

    Args:
        json_file: GeoJSON 文件路径

    Returns:
        list[dict]: 包含经度、纬度、震级、标题的字典列表
    """
    with open(json_file, 'r', encoding='utf-8') as f:
        all_eq_data = json.load(f)

    all_eq_features = all_eq_data['features']

    eq_data = []
    for eq_dict in all_eq_features:
        eq = {
            'longitude': eq_dict['geometry']['coordinates'][0],
            'latitude': eq_dict['geometry']['coordinates'][1],
            'magnitude': eq_dict['properties']['mag'],
            'title': eq_dict['properties']['title'],
            'depth': eq_dict['geometry']['coordinates'][2],  # 深度(km)
        }
        eq_data.append(eq)

    return eq_data


def plot_earthquake_map(eq_data, output_file='earthquake_map.html'):
    """
    使用 Plotly Express 创建交互式地震散点图

    Args:
        eq_data: 地震数据列表
        output_file: 输出 HTML 文件名
    """
    # 提取各维度数据
    lons = [eq['longitude'] for eq in eq_data]
    lats = [eq['latitude'] for eq in eq_data]
    mags = [eq['magnitude'] for eq in eq_data]
    titles = [eq['title'] for eq in eq_data]
    depths = [eq['depth'] for eq in eq_data]

    fig = px.scatter_geo(
        lat=lats,
        lon=lons,
        size=mags,              # 点大小映射到震级
        color=mags,             # 颜色映射到震级
        hover_name=titles,      # 悬停显示标题
        title='全球地震分布图',
        color_continuous_scale='YlOrRd',  # 黄-橙-红渐变
        projection='natural earth',       # 地球投影方式
        size_max=15,                      # 最大点尺寸
        opacity=0.7,
    )

    fig.update_layout(
        title_font_size=18,
        title_x=0.5,
        coloraxis_colorbar=dict(title="震级"),
    )

    fig.write_html(output_file)
    print(f"✅ 地震地图已保存: {output_file}")
    return fig


if __name__ == '__main__':
    # 构建模拟 GeoJSON 数据用于演示
    mock_geojson = {
        "type": "FeatureCollection",
        "metadata": {"count": 5, "generated": 1717728000000},
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "mag": 7.2,
                    "place": "95km W of Port-Olry, Vanuatu",
                    "time": 1717728000000,
                    "title": "M 7.2 - 95km W of Port-Olry, Vanuatu"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [167.3, -15.5, 135.0]  # [经度, 纬度, 深度]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "mag": 5.8,
                    "place": "12km ENE of Hualien City, Taiwan",
                    "time": 1717641600000,
                    "title": "M 5.8 - 12km ENE of Hualien City, Taiwan"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [121.6, 24.0, 10.5]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "mag": 6.5,
                    "place": "78km SSE of Padangsidimpuan, Indonesia",
                    "time": 1717555200000,
                    "title": "M 6.5 - 78km SSE of Padangsidimpuan, Indonesia"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [98.9, 1.2, 89.0]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "mag": 4.2,
                    "place": "5km NE of Ridgecrest, CA",
                    "time": 1717468800000,
                    "title": "M 4.2 - 5km NE of Ridgecrest, CA"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-117.67, 35.62, 2.1]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "mag": 5.1,
                    "place": "42km WSW of Ovalle, Chile",
                    "time": 1717382400000,
                    "title": "M 5.1 - 42km WSW of Ovalle, Chile"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-71.5, -30.8, 25.0]
                }
            }
        ]
    }

    # 先保存模拟数据
    with open('data/earthquakes.json', 'w', encoding='utf-8') as f:
        json.dump(mock_geojson, f, indent=2, ensure_ascii=False)

    # 解析并可视化
    eq_data = extract_earthquake_data('data/earthquakes.json')
    print(f"\n共解析 {len(eq_data)} 条地震记录:")
    for eq in eq_data[:3]:
        print(f"  📍 {eq['title']} | 震级: {eq['magnitude']}")

    fig = plot_earthquake_map(eq_data)
    # fig.show()  # 取消注释可在浏览器中打开
```

#### Plotly Express scatter_geo 关键参数

| 参数 | 作用 | 示例 |
|------|------|------|
| `lat` | 纬度数据 | `[35.62, 24.0, ...]` |
| `lon` | 经度数据 | `[-117.67, 121.6, ...]` |
| `size` | 控制点大小 | 震级数组 |
| `color` | 控制点颜色 | 震级数组（连续色阶） |
| `hover_name` | 悬停主标题 | 地震标题列表 |
| `projection` | 地图投影 | `'natural earth'`, `'orthographic'` |
| `color_continuous_scale` | 色阶方案 | `'YlOrRd'`, `'Viridis'` |
| `size_max` | 最大点半径 | `15`, `20` |

---

## Web API 基础

API（Application Programming Interface）是现代软件系统的"粘合剂"。通过 Web API，我们可以从 GitHub、Twitter、天气预报服务等平台实时获取数据。

### HTTP 协议速查

| 方法 | 作用 | 幂等性 | 典型场景 |
|------|------|--------|----------|
| **GET** | 获取资源 | ✅ 是 | 查询数据、下载文件 |
| **POST** | 创建资源 | ❌ 否 | 提交表单、创建记录 |
| **PUT** | 更新资源 | ✅ 是 | 全量更新 |
| **DELETE** | 删除资源 | ✅ 是 | 删除记录 |
| **PATCH** | 部分更新 | ❌ 否 | 修改某个字段 |

#### 常见 HTTP 状态码

| 状态码 | 含义 | 处理建议 |
|--------|------|----------|
| **200 OK** | 请求成功 | 正常处理响应体 |
| **301/302** | 重定向 | requests 默认自动跟随 |
| **400 Bad Request** | 请求参数有误 | 检查 URL 和参数 |
| **401 Unauthorized** | 未认证 | 添加认证头（API Key/Token） |
| **403 Forbidden** | 无权限 | 检查权限范围 |
| **404 Not Found** | 资源不存在 | 检查端点路径 |
| **429 Too Many Requests** | 触发限流 | 降低请求频率或等待 |
| **500 Server Error** | 服务端内部错误 | 稍后重试 |

### requests 库完整指南

`requests` 是 Python HTTP 请求的事实标准库，以"HTTP for Humans"为设计理念。

```bash
pip install requests
```

#### 核心 API 速查表

| 方法 | 签名 | 说明 |
|------|------|------|
| `requests.get(url, **kwargs)` | GET 请求 | 获取资源 |
| `requests.post(url, **kwargs)` | POST 请求 | 创建资源 |
| `requests.put(url, **kwargs)` | PUT 请求 | 更新资源 |
| `requests.delete(url, **kwargs)` | DELETE 请求 | 删除资源 |

**通用参数 (`**kwargs`)：**

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `params` | dict | URL 查询参数 | `{'q': 'python', 'sort': 'stars'}` |
| `headers` | dict | 请求头 | `{'User-Agent': 'MyBot/1.0'}` |
| `json` | dict | JSON 请求体 | `{'name': 'test', 'value': 42}` |
| `data` | dict/str | 表单请求体 | `{'key': 'value'}` |
| `timeout` | float/tuple | 超时时间(秒) | `5` 或 `(3, 10)` |
| `auth` | tuple | HTTP Basic Auth | `('user', 'pass')` |
| `verify` | bool/str | SSL 证书验证 | `False` 或 `'/path/to/cert'` |

#### 基本用法示例

```python
import requests

# === 1. 基本 GET 请求 ===
response = requests.get('https://httpbin.org/get')
print(response.status_code)     # 200
print(response.text[:100])      # 响应文本前100字符

# === 2. 带查询参数 ===
params = {'q': 'python programming', 'lang': 'en'}
response = requests.get('https://httpbin.org/get', params=params)
print(response.url)  # https://httpbin.org/get?q=python+programming&lang=en

# === 3. 自定义请求头 ===
headers = {
    'User-Agent': 'Mozilla/5.0 (DataAnalysisBot/1.0)',
    'Accept': 'application/json',
}
response = requests.get('https://api.github.com', headers=headers)

# === 4. 解析 JSON 响应 ===
data = response.json()
print(type(data))  # <class 'dict'>

# === 5. POST 请求（发送 JSON）===
payload = {'username': 'alice', 'role': 'analyst'}
response = requests.post(
    'https://httpbin.org/post',
    json=payload,
    headers={'Content-Type': 'application/json'}
)
result = response.json()['json']
print(result)  # {'username': 'alice', 'role': 'analyst'}

# === 6. 超时设置（重要！）===
try:
    response = requests.get('https://api.example.com/data', timeout=5)
except requests.exceptions.Timeout:
    print("❌ 请求超时！")

# === 7. Session 复用连接（高性能推荐）===
session = requests.Session()
session.headers.update({'User-Agent': 'MyDataApp/1.0'})

# 多次请求复用同一 TCP 连接
r1 = session.get('https://api.example.com/users')
r2 = session.get('https://api.example.com/posts')
session.close()
```

### API 认证方式对比

| 认证方式 | 安全级别 | 实现难度 | 典型场景 | 代码示例位置 |
|----------|----------|----------|----------|-------------|
| **无认证** | ⭐ | 极简 | 公开数据接口 | 直接请求 |
| **API Key** | ⭐⭐ | 简单 | 大多数商业 API | Header 或 Query 参数 |
| **Bearer Token** | ⭐⭐⭐ | 中等 | OAuth 2.0 流程 | `Authorization: Bearer xxx` |
| **Basic Auth** | ⭐⭐ | 简单 | 内部系统 | `auth=('user', 'pass')` |
| **OAuth 2.0** | ⭐⭐⭐⭐⭐ | 复杂 | 第三方授权登录 | 库辅助实现 |
| **JWT** | ⭐⭐⭐⭐ | 中等 | 微服务架构 | Token 包含签名 |

```python
# API Key 认证（最常用）
headers = {'X-API-Key': 'your_api_key_here'}
response = requests.get('https://api.example.com/v1/data', headers=headers)

# Bearer Token 认证
headers = {'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9...'}
response = requests.get('https://api.example.com/v1/user', headers=headers)

# Basic Auth
from requests.auth import HTTPBasicAuth
response = requests.get(
    'https://api.example.com/v1/resource',
    auth=HTTPBasicAuth('username', 'password')
)
```

### 速率限制与优雅重试

大多数 API 都有**速率限制（Rate Limiting）**，超过限制会返回 `429 Too Many Requests`。

```python
import time
import requests


def api_request_with_retry(url, max_retries=3, initial_delay=1):
    """
    带重试机制的 API 请求

    Args:
        url: 请求地址
        max_retries: 最大重试次数
        initial_delay: 初始等待秒数

    Returns:
        Response 对象或 None
    """
    delay = initial_delay

    for attempt in range(max_retries + 1):
        try:
            response = requests.get(
                url,
                headers={'User-Agent': 'DataVizBot/1.0'},
                timeout=10
            )

            if response.status_code == 200:
                return response

            elif response.status_code == 429:
                # 从响应头获取限流信息
                retry_after = int(response.headers.get('Retry-After', delay))
                print(f"⏳ 触发限流，等待 {retry_after} 秒后重试... (第{attempt+1}次)")
                time.sleep(retry_after)
                delay *= 2  # 指数退避

            elif response.status_code >= 500:
                print(f"⚠️ 服务器错误 {response.status_code}，重试中...")
                time.sleep(delay)
                delay *= 2

            else:
                print(f"❌ 请求失败: {response.status_code} - {response.reason}")
                return None

        except requests.exceptions.RequestException as e:
            print(f"❌ 网络异常: {e}")
            time.sleep(delay)
            delay *= 2

    print(f"❌ 达到最大重试次数 ({max_retries})")
    return None
```

#### API 调用时序图

```mermaid
sequenceDiagram
    participant Client as Python 客户端
    participant API as REST API 服务
    participant RateLimiter as 限流器

    Client->>API: GET /search/repositories<br/>Header: Authorization
    API->>RateLimiter: 检查配额

    alt 配额充足
        RateLimiter-->>API: ✅ 放行
        API-->>Client: 200 OK<br/>{items: [...]}<br/>X-RateLimit-Remaining: 59
    else 配额耗尽
        RateLimiter-->>API: ❌ 拒绝
        API-->>Client: 429 Too Many Requests<br/>Retry-After: 60
        Client->>Client: 等待 60 秒...
        Client->>API: 重新发送请求
    end
```

---

## GitHub API 可视化实战

GitHub 提供了丰富的 REST API，可以获取仓库、用户、Issue 等各类数据。本节以搜索热门 Python 项目为例，展示完整的 API 调用到可视化流程。

### GitHub REST API 端点概览

| 端点 | 方法 | 说明 | 认证需求 |
|------|------|------|----------|
| `/search/repositories` | GET | 搜索仓库 | 公开数据无需认证 |
| `/repos/{owner}/{repo}` | GET | 获取仓库详情 | 认证后限额更高 |
| `/users/{username}` | GET | 用户信息 | 同上 |
| `/users/{username}/repos` | GET | 用户仓库列表 | 同上 |

### 搜索仓库 + Plotly 条形图

```python
"""
GitHub API 实战：搜索热门 Python 项目并用 Plotly 可视化
API 文档：https://docs.github.com/en/rest/search
"""
import requests
import plotly.graph_objects as go
from plotly.subplots import make_subplots


def search_github_repositories(query, sort='stars', per_page=30):
    """
    搜索 GitHub 仓库

    Args:
        query: 搜索关键词（如 language:python）
        sort: 排序方式 (stars/forks/updated)
        per_page: 返回数量

    Returns:
        dict: API 响应数据
    """
    url = 'https://api.github.com/search/repositories'
    params = {
        'q': query,
        'sort': sort,
        'per_page': per_page,
    }
    headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Python-DataViz/1.0',
    }

    response = requests.get(url, params=params, headers=headers, timeout=15)

    if response.status_code != 200:
        raise Exception(f"API 请求失败: {response.status_code}")

    return response.json()


def extract_repo_data(response_json):
    """
    从 API 响应中提取关键字段

    GitHub API 响应结构:
    {
        "total_count": 1234567,
        "items": [{
            "name": "awesome-python",
            "full_name": "vinta/awesome-python",
            "owner": {"login": "vinta"},
            "stargazers_count": 150000,
            "forks_count": 25000,
            "html_url": "https://github.com/...",
            "description": "Curated list...",
            "language": "Python",
            "created_at": "2014-06-27T..."
        }, ...]
    }
    """
    items = response_json.get('items', [])

    repos = []
    for item in items:
        repo = {
            'name': item['name'],
            'owner': item['owner']['login'],
            'stars': item['stargazers_count'],
            'forks': item['forks_count'],
            'url': item['html_url'],
            'description': item.get('description', 'N/A') or 'N/A',
            'language': item.get('language', 'Unknown'),
        }
        repos.append(repo)

    return repos


def plot_top_repos(repos, top_n=15, output_file='github_top_repos.html'):
    """
    使用 Plotly 创建交互式水平条形图

    Args:
        repos: 仓库数据列表
        top_n: 显示前 N 个
        output_file: 输出文件名
    """
    # 按 star 数降序排列，取前 top_n
    sorted_repos = sorted(repos, key=lambda x: x['stars'], reverse=True)[:top_n]

    names = [f"{r['owner']}/{r['name']}" for r in sorted_repos]
    stars = [r['stars'] for r in sorted_repos]
    forks = [r['forks'] for r in sorted_repos]
    descriptions = [r['description'][:60] + '...' if len(r['description']) > 60
                    else r['description'] for r in sorted_repos]
    urls = [r['url'] for r in sorted_repos]

    # 创建子图：条形图 + 信息表格
    fig = make_subplots(
        rows=1, cols=2,
        column_widths=[0.7, 0.3],
        specs=[[{"type": "bar"}, {"type": "table"}]],
        subplot_titles=['Star 数排名', '项目详情']
    )

    # 条形图
    fig.add_trace(
        go.Bar(
            y=names,
            x=stars,
            orientation='h',
            marker_color='#0366d6',
            text=stars,
            textposition='outside',
            hovertemplate=(
                '<b>%{y}</b><br>'
                '⭐ Stars: %{x:,}<br>'
                '🍴 Forks: %{customdata[0]:,}<br>'
                '<extra></extra>'
            ),
            customdata=list(zip(forks, descriptions)),
        ),
        row=1, col=1
    )

    # 信息表格
    table_data = [
        [r['name'] for r in sorted_repos],
        [r['language'] for r in sorted_repos],
        [f"{r['stars']:,}" for r in sorted_repos],
        [f"{r['forks']:,}" for r in sorted_repos],
    ]
    fig.add_trace(
        go.Table(
            header=dict(
                values=['项目', '语言', 'Stars', 'Forks'],
                fill_color='#0366d6',
                font=dict(color='white', size=12),
                align='center'
            ),
            cells=dict(
                values=table_data,
                fill_color=[['#f6f8fa', 'white'] * top_n],
                align='left',
                font_size=11,
                height=25
            )
        ),
        row=1, col=2
    )

    fig.update_layout(
        title={
            'text': f'🔥 GitHub 热门 Python 项目 Top {top_n}',
            'x': 0.5,
            'font_size': 20
        },
        height=700,
        showlegend=False,
        bargap=0.15,
        yaxis=dict(autorange='reversed'),  # 第一名在最上面
    )

    fig.update_xaxes(title_text='Stars 数量', row=1, col=1)

    fig.write_html(output_file)
    print(f"✅ GitHub 项目排行图已保存: {output_file}")
    return fig


if __name__ == '__main__':
    # 搜索语言为 Python 的热门项目
    print("🔍 正在搜索 GitHub 热门 Python 项目...")
    response = search_github_repositories(
        query='language:python',
        sort='stars',
        per_page=30
    )

    total = response.get('total_count', 0)
    print(f"📊 共找到 {total:,} 个相关仓库")

    repos = extract_repo_data(response)
    print(f"\n🏆 Top 5 项目:")
    for i, repo in enumerate(repos[:5], 1):
        print(f"  {i}. {repo['owner']}/{repo['name']}"
              f" ⭐{repo['stars']:,} 🍴{repo['forks']:,}")

    # 可视化
    fig = plot_top_repos(repos, top_n=15)
    # fig.show()  # 取消注释可在浏览器中查看
```

#### GitHub API 响应字段说明

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `total_count` | int | 匹配总数 | `1234567` |
| `items[]` | list | 结果数组 | — |
| `name` | str | 仓库名称 | `"requests"` |
| `full_name` | str | 完整名称 | `"psf/requests"` |
| `owner.login` | str | 所有者用户名 | `"psf"` |
| `stargazers_count` | int | Star 数 | `52000` |
| `forks_count` | int | Fork 数 | `11500` |
| `html_url` | str | 仓库链接 | `"https://github.com/..."` |
| `description` | str | 描述 | `"HTTP library"` |
| `language` | str | 主语言 | `"Python"` |
| `created_at` | str | 创建时间 | `"2012-02-13T..."` |
| `open_issues_count` | int | 开放 Issue 数 | `85` |

---

## Hacker News API 实战

Hacker News（HN）是一个技术新闻社区，其公开 API 是练习 API 数据获取的优秀靶场。

### HN API 数据结构

| 端点 | 说明 | 返回格式 |
|------|------|----------|
| `v0/item/{id}.json` | 获取单篇文章 | Item 对象 |
| `v0/topstories.json` | 热门文章 ID 列表 | ID 数组 |
| `v0/newstories.json` | 最新文章 ID 列表 | ID 数组 |
| `v0/beststories.json` | 最佳文章 ID 列表 | ID 数组 |

#### Item 对象关键字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int | 文章唯一标识 |
| `title` | str | 标题 |
| `by` | str | 作者用户名 |
| `url` | str | 原文链接（可为空） |
| `score` | int | 投票分数 |
| `descendants` | int | 评论数 |
| `kids` | list[int] | 子评论 ID 列表 |
| `time` | int | Unix 时间戳 |
| `type` | str | 类型（story/job/poll/comment） |

### 批量请求与并发

```python
"""
Hacker News API 实战：获取热门文章并可视化
API 地址：https://hacker-news.firebaseio.com/v0/
"""
import requests
import time
from operator import itemgetter
import matplotlib.pyplot as plt
import numpy as np

plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False


BASE_URL = 'https://hacker-news.firebaseio.com/v0'


def get_top_story_ids(limit=20):
    """获取热门文章 ID 列表"""
    url = f'{BASE_URL}/topstories.json'
    response = requests.get(url, timeout=10)
    return response.json()[:limit]


def get_item(item_id):
    """获取单篇文章详情"""
    url = f'{BASE_URL}/item/{item_id}.json'
    response = requests.get(url, timeout=10)
    return response.json()


def fetch_top_stories_with_sequential(ids):
    """
    顺序请求模式（简单但慢）
    每次请求一个，完成后才请求下一个
    """
    stories = []
    start_time = time.time()

    for sid in ids:
        item = get_item(sid)
        if item and item.get('type') == 'story':
            stories.append({
                'title': item.get('title', 'N/A'),
                'score': item.get('score', 0),
                'descendants': item.get('descendants', 0),
                'url': item.get('url', ''),
                'by': item.get('by', 'unknown'),
            })
        time.sleep(0.1)  # 礼貌延迟，避免被限流

    elapsed = time.time() - start_time
    print(f"⏱️ 顺序模式耗时: {elapsed:.2f}s ({len(stories)} 篇文章)")
    return stories


def fetch_top_stories_with_concurrent(ids, batch_size=5):
    """
    批量并发模式（快但需控制并发数）
    使用 requests.Session + 批量请求
    """
    stories = []
    session = requests.Session()
    start_time = time.time()

    for i in range(0, len(ids), batch_size):
        batch_ids = ids[i:i + batch_size]
        urls = [f'{BASE_URL}/item/{sid}.json' for sid in batch_ids]

        # 批量请求（Session 复用连接）
        responses = [session.get(url, timeout=10) for url in urls]

        for resp in responses:
            item = resp.json()
            if item and item.get('type') == 'story':
                stories.append({
                    'title': item.get('title', 'N/A'),
                    'score': item.get('score', 0),
                    'descendants': item.get('descendants', 0),
                    'url': item.get('url', ''),
                    'by': item.get('by', 'unknown'),
                })

        time.sleep(0.2)  # 批次间延迟

    session.close()
    elapsed = time.time() - start_time
    print(f"⏱️ 并发模式耗时: {elapsed:.2f}s ({len(stories)} 篇文章)")
    return stories


def plot_hn_rankings(stories, output_file='hn_rankings.png'):
    """绘制 HN 热门文章排行榜"""

    # 按 score 降序排列
    sorted_stories = sorted(stories, key=itemgetter('score'), reverse=True)[:15]

    titles = [s['title'][:30] + '...' if len(s['title']) > 30
              else s['title'] for s in sorted_stories]
    scores = [s['score'] for s in sorted_stories]
    comments = [s['descendants'] for s in sorted_stories]

    fig, ax = plt.subplots(figsize=(12, 8))

    y_pos = np.arange(len(titles))

    # 水平条形图
    bars = ax.barh(y_pos, scores, color='#ff6600', alpha=0.8, edgecolor='white')

    # 在柱子上添加评论数标注
    for i, (bar, comment_count) in enumerate(zip(bars, comments)):
        ax.text(bar.get_width() + 5, bar.get_y() + bar.get_height()/2,
                f'💬 {comment_count}', va='center', fontsize=9, color='#666')

    ax.set_yticks(y_pos)
    ax.set_yticklabels(titles, fontsize=10)
    ax.invert_yaxis()  # 第一名在最上面
    ax.set_xlabel('投票分数 (Points)', fontsize=12)
    ax.set_title('🔥 Hacker News 当前热门文章 TOP 15',
                 fontsize=14, fontweight='bold', pad=15)
    ax.grid(axis='x', alpha=0.3)
    ax.set_xlim(0, max(scores) * 1.2)

    # 添加统计信息文本框
    stats_text = (
        f"平均分数: {np.mean(scores):.0f}\n"
        f"平均评论: {np.mean(comments):.0f}\n"
        f"最高分: {max(scores)}"
    )
    ax.text(0.98, 0.02, stats_text,
            transform=ax.transAxes,
            fontsize=10,
            verticalalignment='bottom',
            horizontalalignment='right',
            bbox=dict(boxstyle='round', facecolor='#fff3cd',
                     edgecolor='#ffc107', alpha=0.9))

    plt.tight_layout()
    plt.savefig(output_file, dpi=150, bbox_inches='tight')
    plt.show()
    print(f"✅ HN 排行榜已保存: {output_file}")


if __name__ == '__main__':
    print("📰 获取 Hacker News 热门文章...\n")

    # 获取热门文章 ID
    story_ids = get_top_story_ids(limit=20)
    print(f"获取到 {len(story_ids)} 个热门文章 ID")

    # 使用批量并发模式获取详情
    stories = fetch_top_stories_with_concurrent(story_ids, batch_size=5)

    # 打印前 5 名
    print("\n🏆 HN 热门文章 Top 5:")
    for i, s in enumerate(sorted(stories, key=lambda x: x['score'], reverse=True)[:5], 1):
        print(f"  {i}. [{s['score']}pts] {s['title']}"
              f" (💬{s['descendants']}) by {s['by']}")

    # 可视化
    plot_hn_rankings(stories)
```

#### 顺序 vs 并发模式对比

| 维度 | 顺序模式 | 并发模式 |
|------|----------|----------|
| **速度** | 慢（线性累加延迟） | 快（批次并行） |
| **复杂度** | 低 | 中等 |
| **限流风险** | 低 | 高（需控制批次大小） |
| **适用场景** | 少量请求 | 大量请求 |
| **代码量** | ~10 行 | ~25 行 |
| **推荐指数** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 数据获取最佳实践

在实际项目中，数据获取环节需要考虑工程化的可靠性问题。

### 缓存策略

频繁请求相同数据既浪费带宽又可能触发限流。缓存是必要的优化手段：

```python
import json
import os
import hashlib
import time
from pathlib import Path


class SimpleCache:
    """简单的文件缓存系统"""

    def __init__(self, cache_dir='cache', ttl_seconds=3600):
        self.cache_dir = Path(cache_dir)
        self.ttl = ttl_seconds
        self.cache_dir.mkdir(exist_ok=True)

    def _get_cache_path(self, url):
        """根据 URL 生成缓存文件路径"""
        url_hash = hashlib.md5(url.encode()).hexdigest()
        return self.cache_dir / f"{url_hash}.json"

    def get(self, url):
        """尝试从缓存获取数据"""
        cache_path = self._get_cache_path(url)

        if cache_path.exists():
            age = time.time() - cache_path.stat().st_mtime
            if age < self.ttl:
                print(f"📦 命中缓存: {url[:50]}...")
                with open(cache_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                print(f"⏰ 缓存已过期: {url[:50]}...")
        return None

    def set(self, url, data):
        """写入缓存"""
        cache_path = self._get_cache_path(url)
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        print(f"💾 已缓存: {url[:50]}...")


# 使用示例
cache = SimpleCache(cache_dir='api_cache', ttl_seconds=1800)  # 30分钟过期

url = 'https://api.github.com/search/repositories?q=language:python&sort=stars'

# 先查缓存
cached_data = cache.get(url)
if cached_data is None:
    # 缓存未命中，发起请求
    response = requests.get(url, headers={'User-Agent': 'MyApp/1.0'})
    data = response.json()
    cache.set(url, data)  # 存入缓存
else:
    data = cached_data
```

### 大文件分块读取

当 CSV/JSON 文件很大时，一次性读入内存可能导致 OOM：

```python
import csv

# 方式一：逐行迭代（内存友好）
chunk_size = 10000
rows_processed = 0

with open('large_dataset.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)

    chunk = []
    for row in reader:
        chunk.append(row)
        rows_processed += 1

        if len(chunk) >= chunk_size:
            process_chunk(chunk)  # 处理当前批次
            chunk.clear()          # 释放内存
            print(f"已处理 {rows_processed:,} 行")

    # 处理剩余不足一个 chunk 的数据
    if chunk:
        process_chunk(chunk)

# 方式二：pandas 分块读取（推荐用于数据分析）
import pandas as pd

chunk_iter = pd.read_csv(
    'large_dataset.csv',
    chunksize=50000,           # 每块 5 万行
    encoding='utf-8',
    usecols=['date', 'value']  # 只读需要的列
)

results = []
for i, chunk in enumerate(chunk_iter):
    aggregated = chunk.groupby('date')['value'].sum()
    results.append(aggregated)
    print(f"已处理第 {i+1} 个数据块")

final_result = pd.concat(results).groupby(level=0).sum()
```

### 错误重试与幂等性

| 原则 | 说明 | 实现 |
|------|------|------|
| **幂等性** | 相同请求多次执行结果一致 | GET/PUT/DELETE 天然幂等；POST 需业务保证 |
| **指数退避** | 重试间隔逐渐增大 | `delay *= 2` |
| **最大重试** | 避免无限循环 | 通常 3-5 次 |
| **断路器** | 连续失败后暂停请求 | 第三方库如 `tenacity` |

```python
# 使用 tenacity 库实现优雅重试
# pip install tenacity
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import requests.exceptions

@retry(
    stop=stop_after_attempt(3),                    # 最多重试 3 次
    wait=wait_exponential(multiplier=1, min=1, max=10),  # 指数退避
    retry=retry_if_exception_type((               # 仅对以下异常重试
        requests.exceptions.ConnectionError,
        requests.exceptions.Timeout,
    )),
    reraise=True                                   # 最终失败时抛出原异常
)
def robust_api_call(url):
    """带自动重试的 API 调用"""
    return requests.get(url, timeout=10)
```

---

## 常见陷阱

在实际开发中，以下问题出现频率极高。提前了解可以节省大量调试时间。

### 陷阱清单

::: danger ❌ 陷阱 1：CSV 编码错误导致乱码

**现象**：读取 CSV 时报 `UnicodeDecodeError` 或中文显示为乱码

**原因**：文件编码与读取时不一致（常见于 Windows 导出的 GBK 编码文件）

**解决**：
```python
# 方案一：显式指定编码
with open('data.csv', 'r', encoding='gbk') as f:   # Windows 中文 Excel
    reader = csv.reader(f)

# 方案二：自动检测编码（需安装 chardet）
import chardet
with open('data.csv', 'rb') as f:
    result = chardet.detect(f.read(10000))
    encoding = result['encoding']
    print(f"检测到编码: {encoding}")  # 如 'GB2312', 'UTF-8-SIG'

with open('data.csv', 'r', encoding=encoding) as f:
    reader = csv.reader(f)
```
:::

::: danger ❌ 陷阱 2：API 限流导致 429 错误

**现象**：脚本运行一段时间后突然收到 `429 Too Many Requests`

**原因**：请求频率超过 API 的速率限制

**解决**：
```python
# 1. 检查响应头中的限流信息
remaining = response.headers.get('X-RateLimit-Remaining')
reset_time = response.headers.get('X-RateLimit-Reset')
print(f"剩余配额: {remaining}, 重置时间: {reset_time}")

# 2. 添加请求间延迟
import time
for url in urls:
    response = requests.get(url)
    time.sleep(0.5)  # 至少间隔 0.5 秒

# 3. 使用 Session + 连接池减少开销
session = requests.Session()
session.mount('https://', HTTPAdapter(pool_connections=10, pool_maxsize=10))
```
:::

::: danger ❌ 陷阱 3：JSON 解析 KeyError

**现象**：`KeyError: 'expected_field'` 导致程序崩溃

**原因**：API 返回的字段可能与文档不一致，或某些字段可选（可能不存在）

**解决**：
```python
# 安全访问嵌套字段
item = response.json()
title = item.get('properties', {}).get('title', '无标题')  # 三层安全访问
mag = item.get('properties', {}).get('mag', 0)             # 给默认值

# 或使用 try/except
try:
    magnitude = item['properties']['mag']
except (KeyError, TypeError):
    magnitude = 0
    print("⚠️ 震级字段缺失，使用默认值 0")
```
:::

::: warning ⚠️ 陷阱 4：datetime.strptime 格式不匹配

**现象**：`ValueError: time data '2024/01/02' does not match format '%Y-%m-%d'`

**原因**：日期字符串格式与指定的 format code 不一致

**解决**：
```python
# 先确认实际格式
date_str = '2024/01/02 14:30:00'
print(date_str)  # 观察分隔符是 / 还是 -

# 匹配正确的格式
dt = datetime.strptime(date_str, '%Y/%m/%d %H:%M:%S')  # ✅ 正确

# 更灵活的方式：使用 dateutil.parser
from dateutil import parser
dt = parser.parse('2024-01-02')  # 自动识别多种格式
```
:::

::: warning ⚠️ 陷阱 5：fill_between 数据长度不一致

**现象**：`ValueError: arguments have different lengths`

**原因**：由于异常数据处理导致 x/y 数据列表长度不同

**解决**：
```python
# 确保三个列表始终同步增删
dates, highs, lows = [], [], []
for row in reader:
    try:
        d = datetime.strptime(row[2], '%Y-%m-%d')
        h = int(row[4])
        l = int(row[5])
    except ValueError:
        continue  # 一行数据有问题，三者都不追加

    dates.append(d)   # 只有成功才同时 append
    highs.append(h)
    lows.append(l)

# 最后检查长度一致性
assert len(dates) == len(highs) == len(lows), "数据长度不一致!"
ax.fill_between(dates, highs, lows, alpha=0.15)
```
:::

::: info 💡 陷阱 6：Plotly 离线渲染文件过大

**现象**：生成的 HTML 文件包含大量内联 JS，体积可达数 MB

**原因**：Plotly 默认将完整 JavaScript 库内嵌到 HTML 中

**解决**：
```python
# 方案一：使用 CDN（减小文件体积）
import plotly.io as pio
pio.renderers.default = 'notebook_connected'  # Jupyter 中使用 CDN

# 方案二：压缩输出
fig.write_html('output.html', include_plotlyjs='cdn', full_html=False)

# 方案三：静态导出（牺牲交互性换体积）
fig.write_image('output.png', scale=2)  # 需要 kaleido: pip install kaleido
```
:::

---

## 术语表

| 术语 | 英文 | 解释 |
|------|------|------|
| **CSV** | Comma-Separated Values | 逗号分隔值，最常用的表格数据格式 |
| **JSON** | JavaScript Object Notation | 轻量级数据交换格式，Web API 标准响应格式 |
| **GeoJSON** | Geographic JSON | 基于 JSON 的地理空间数据格式，包含坐标和属性 |
| **API** | Application Programming Interface | 应用程序编程接口，定义软件组件间的交互规范 |
| **REST** | Representational State Transfer | 一种 API 架构风格，使用 HTTP 方法操作资源 |
| **Endpoint** | 端点 | API 的具体 URL 路径，如 `/search/repositories` |
| **Rate Limiting** | 速率限制 | API 对单位时间内请求数量的限制 |
| **Status Code** | 状态码 | HTTP 响应状态码，如 200/404/429/500 |
| **Payload** | 载荷 | HTTP 请求或响应中的数据部分 |
| **Header** | 请求头 | HTTP 元数据，包含认证、内容类型等信息 |
| **Authentication** | 认证 | 验证身份的过程（API Key/Bearer Token 等） |
| **Authorization** | 授权 | 验证是否有权限访问特定资源 |
| **幂等性** | Idempotency | 相同操作执行多次结果一致的特性 |
| **指数退避** | Exponential Backoff | 重试间隔按指数增长的策略（1s → 2s → 4s → 8s） |
| **Session** | 会话 | requests 中复用 TCP 连接的对象，提升性能 |
| **Timeout** | 超时 | 等待响应的最大时间，防止无限阻塞 |
| **Serialization** | 序列化 | 将数据对象转换为可传输/存储格式（如 JSON 字符串） |
| **Deserialization** | 反序列化 | 将传输格式还原为数据对象 |
| **UTC** | Coordinated Universal Time | 协调世界时，API 时间戳的标准参考 |
| **Unix Timestamp** | Unix 时间戳 | 从 1970-01-01 00:00:00 UTC 起的秒数 |
| **fill_between** | 区域填充 | Matplotlib 函数，用于绘制两条曲线之间的填充区域 |
| **scatter_geo** | 地理散点图 | Plotly Express 函数，用于在地图上绘制散点 |
| **DictReader** | 字典读取器 | csv 模块的类，将每行数据转为字典 |
| **strptime** | String Parse Time | datetime 方法，将字符串解析为日期对象 |
| **Hover Data** | 悬停数据 | 交互图表中鼠标悬停时显示的附加信息 |
| **Callback** | 回调 | 事件驱动的函数，如图表点击后的处理逻辑 |

---

## 总结与实践建议

### 本章知识图谱

```mermaid
flowchart LR
    subgraph Input["数据输入层"]
        CSV_F[CSV 文件<br/>csv.reader/DictReader]
        JSON_F[JSON 文件<br/>json.load/dumps]
        API_R[Web API<br/>requests.get/post]
    end

    subgraph Process["数据处理层"]
        Parse[日期解析<br/>datetime.strptime]
        Clean[清洗转换<br/>try/except]
        Extract[字段提取<br/>嵌套字典访问]
    end

    subgraph Output["可视化输出层"]
        Mat[Matplotlib<br/>折线图/填充图]
        Plot[Plotly<br/>散点地图/条形图]
    end

    Input --> Process
    Process --> Output

```

### 最佳实践清单

- [ ] **CSV 读取**：始终指定 `encoding` 参数，使用 `newline=''` 写入
- [ ] **JSON 处理**：用 `.get()` 安全访问字段，设置 `ensure_ascii=False`
- [ ] **日期解析**：先用 `print()` 确认实际格式再写 `strptime`
- [ ] **API 请求**：必设 `timeout`，使用 `Session` 复用连接
- [ ] **异常处理**：`try/except` 包裹数据转换代码，`continue` 跳过坏数据
- [ ] **限流应对**：请求间加 `sleep()`，监控 `X-RateLimit-Remaining` 头
- [ ] **可视化选择**：静态报告用 Matplotlib，交互展示用 Plotly
- [ ] **缓存策略**：重复请求走缓存，设置合理 TTL
- [ ] **大文件处理**：分块读取，避免一次性加载全量数据
- [ ] **代码组织**：数据获取/处理/可视化分离为独立函数

### 学习路线延伸

| 下一步方向 | 推荐资源 | 关键词 |
|------------|----------|--------|
| **Pandas I/O** | Pandas 官方文档 | `read_csv`, `read_json`, `to_parquet` |
| **异步 HTTP** | `aiohttp` / `httpx` | async/await, 并发请求 |
| **API 测试** | Postman / httpie | Mock Server, 契约测试 |
| **数据管道** | Apache Airflow / Prefect | ETL, DAG, 调度 |
| **Scrapy 爬虫** | Scrapy 文档 | Spider, Middleware, Pipeline |

> **核心理念**：数据获取不是一次性的脚本任务，而是需要考虑**可靠性、效率、容错性**的工程化过程。良好的习惯（如缓存、重试、日志）会在长期运行中体现价值。

---

## 附录：完整代码索引

| 文件名 | 功能说明 | 涉及技术 |
|--------|----------|----------|
| `weather_visualization.py` | 天气数据 CSV 读取 + Matplotlib 温度对比图 | csv, datetime, matplotlib |
| `earthquake_map.py` | GeoJSON 地震数据解析 + Plotly 交互地图 | json, plotly.express |
| `github_viz.py` | GitHub API 搜索 + Plotly 条形图 | requests, plotly.graph_objects |
| `hn_analyzer.py` | Hacker News API 批量请求 + Matplotlib 排行榜 | requests, concurrent, matplotlib |
| `api_cache.py` | 文件缓存系统实现 | hashlib, json, pathlib |

## 版本差异（Pandas 1.x/2.x → 3.0.x）

| 特性 | 本文编写时 | 当前（Pandas 3.0.x） |
|------|-----------|----------------------|
| 版本基线 | 1.x / 2.x | 3.0 为最新稳定版（重大版本） |
| Copy-on-Write | 需手动开启 | 3.0 起 **默认开启**：视图/副本语义更安全，链式赋值不再静默修改 |
| 字符串类型 | object 存储 | 3.0 起 `str` dtype 默认使用 `StringDtype`，性能与语义更好 |
| `inplace` 参数 | 普遍可用 | 2.x 起逐步弃用，3.0 起大范围弃用（触发 FutureWarning）；改用 `df = df.method()` |
| 时间序列 | `pd.date_range` 等 | 不变；`Timestamp` 默认纳秒精度 |
| 依赖 | numpy 1.x | 要求 numpy 1.26+/2.x |

> 本文涉及的 Pandas 用法（`read_csv`/`to_numeric`/`fillna`/`groupby`）在 3.0 中兼容；升级重点：Copy-on-Write 默认开启、弃用 API 清理、字符串 dtype 变化。
