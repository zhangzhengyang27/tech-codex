---
title: WebSQL
description: WebSQL（Web SQL Database）历史介绍：它是一种在浏览器端用 SQL 操作本地数据库的 API，W3C 已于 2010 年 11 月正式放弃该规范，Chrome 已于 119 版本移除，新项目必须使用 IndexedDB（或 SQLite WASM）。本文仅作技术史料与迁移参考
keywords: [WebSQL, 浏览器数据库, 前端存储, 已废弃]
category: 数据库基础
tags: [数据库, DBMS, 前端存储]
---

# WebSQL

> **⚠️ 废弃声明**：WebSQL（Web SQL Database）规范已被 W3C 于 **2010 年 11 月**正式放弃（因所有实现都依赖 SQLite、缺乏独立实现）；Chromium 自 **119 版本**（2023 年 10 月）起默认移除该 API。**新项目必须使用 IndexedDB**（或 SQLite WASM + OPFS）。本文保留 WebSQL 的历史介绍，仅作技术史料与老项目维护参考，**不推荐在新项目中使用**。

## WebSQL简介

WebSQL是一种在Web前端操作本地数据库的API接口，允许开发者使用SQL语句在浏览器端进行数据存储和操作。

### 浏览器本地存储技术对比

| 技术 | 容量 | 特点 | 适用场景 |
|-----|------|------|---------|
| **Cookies** | 4KB | 自动发送到服务器 | 会话管理 |
| **LocalStorage** | 5MB+ | 持久化存储 | 简单数据存储 |
| **SessionStorage** | 5MB+ | 会话级存储 | 临时数据 |
| **WebSQL** | 较大 | SQL操作（已废弃） | 仅历史项目维护 |
| **IndexedDB** | 250MB+ | NoSQL、支持事务 | 大量数据存储（推荐） |

### WebSQL特点

```
WebSQL特点：
├── 使用SQL语法操作数据库
├── 数据存储在浏览器本地
├── 支持事务处理
├── Chrome、Safari等浏览器曾支持（Chrome 已于 119 版本移除）
└── 底层使用SQLite实现
```

### 浏览器兼容性

| 浏览器 | 支持情况 |
|-------|---------|
| Chrome | 曾支持（97 起废弃，119 起默认移除） |
| Safari | 已废弃，但仍可用 |
| Opera | 同 Chromium（曾支持，已随 Chromium 移除） |
| Firefox | 从未实现 |
| Edge（Chromium） | 曾支持，已随 Chromium 移除 |
| IE | 从未实现 |

> **注意**：W3C 于 2010 年 11 月正式放弃该规范后，Firefox、IE 从未实现过 WebSQL；实现它的 Chromium 系浏览器也已陆续移除。新项目应使用 IndexedDB（需要 SQL 语义时可考虑 SQLite WASM）。

## WebSQL核心API

### 三个核心方法

| 方法 | 说明 |
|-----|------|
| `openDatabase()` | 打开或创建数据库 |
| `transaction()` | 执行事务 |
| `executeSql()` | 执行SQL语句 |

### API结构

```
WebSQL API结构：
┌─────────────────────────────────────────────────────┐
│                                                     │
│  openDatabase()                                     │
│       │                                             │
│       ▼                                             │
│  Database对象                                       │
│       │                                             │
│       ├── transaction()                             │
│       │       │                                     │
│       │       ▼                                     │
│       │   Transaction对象                           │
│       │       │                                     │
│       │       ├── executeSql()                      │
│       │       │       │                             │
│       │       │       ▼                             │
│       │       │   SQL执行结果                       │
│       │       │                                     │
│       │       └── 错误处理                          │
│       │                                             │
│       └── readTransaction() (只读事务)              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 使用WebSQL

> 以下 API 用法仅适用于仍保留 WebSQL 的环境（如 Safari 或老版本 Chromium），在现行 Chrome/Edge 中 `openDatabase` 已不存在。

### 检测浏览器支持

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <script>
        if (window.openDatabase) {
            console.log('浏览器支持WebSQL');
        } else {
            alert('浏览器不支持WebSQL');
        }
    </script>
</head>
<body>
    <div id="status">WebSQL检测</div>
</body>
</html>
```

### 打开数据库

```javascript
// 语法
var db = openDatabase(dbname, version, description, size, callback);

// 参数说明
// dbname: 数据库名称
// version: 版本号
// description: 数据库描述
// size: 数据库大小（字节）
// callback: 创建回调（可选）

// 示例
var db = openDatabase('wucai', '1.0', '王者荣耀数据库', 1024 * 1024);
```

### 执行事务

```javascript
// 语法
db.transaction(callback, errorCallback, successCallback);

// 参数说明
// callback: 事务处理函数（必选）
// errorCallback: 错误回调（可选）
// successCallback: 成功回调（可选）

// 示例
db.transaction(function(tx) {
    // 在这里执行SQL语句
    tx.executeSql('CREATE TABLE IF NOT EXISTS heros (id unique, name)');
}, function(error) {
    console.log('事务失败: ' + error.message);
}, function() {
    console.log('事务成功');
});
```

### 执行SQL语句

```javascript
// 语法
tx.executeSql(sql, params, successCallback, errorCallback);

// 参数说明
// sql: SQL语句
// params: 参数数组（用于?占位符）
// successCallback: 成功回调
// errorCallback: 错误回调

// 示例：创建表并插入数据
db.transaction(function(tx) {
    // 创建表
    tx.executeSql('CREATE TABLE IF NOT EXISTS heros (id unique, name, hp_max, mp_max, role_main)');
    
    // 插入数据
    tx.executeSql('INSERT INTO heros (id, name, hp_max, mp_max, role_main) VALUES (?, ?, ?, ?, ?)',
        [10000, '夏侯惇', 7350, 1746, '坦克']);
});
```

## 实战：王者荣耀英雄查询页面

### 完整代码示例

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>王者荣耀英雄查询</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
        .search-box {
            margin-bottom: 20px;
        }
        input[type="text"] {
            padding: 8px;
            width: 200px;
        }
        input[type="button"] {
            padding: 8px 16px;
            cursor: pointer;
        }
        table {
            border-collapse: collapse;
            width: 100%;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        #status {
            margin: 10px 0;
            color: #666;
        }
    </style>
    <script>
        var db;
        var datatable;
        
        // 初始化
        function init() {
            datatable = document.getElementById("datatable");
            
            // 打开数据库
            db = openDatabase('wucai', '1.0', '王者荣耀英雄数据', 1024 * 1024);
            
            // 创建表并插入初始数据
            db.transaction(function(tx) {
                tx.executeSql('CREATE TABLE IF NOT EXISTS heros (id unique, name, hp_max, mp_max, role_main)');
                tx.executeSql('INSERT INTO heros (id, name, hp_max, mp_max, role_main) VALUES (?, ?, ?, ?, ?)',
                    [10000, '夏侯惇', 7350, 1746, '坦克']);
                tx.executeSql('INSERT INTO heros (id, name, hp_max, mp_max, role_main) VALUES (?, ?, ?, ?, ?)',
                    [10001, '钟无艳', 7000, 1760, '战士']);
                tx.executeSql('INSERT INTO heros (id, name, hp_max, mp_max, role_main) VALUES (?, ?, ?, ?, ?)',
                    [10002, '张飞', 8341, 100, '坦克']);
                tx.executeSql('INSERT INTO heros (id, name, hp_max, mp_max, role_main) VALUES (?, ?, ?, ?, ?)',
                    [10003, '牛魔', 8476, 1926, '坦克']);
                tx.executeSql('INSERT INTO heros (id, name, hp_max, mp_max, role_main) VALUES (?, ?, ?, ?, ?)',
                    [10004, '吕布', 7344, 0, '战士']);
                
                document.getElementById('status').innerHTML = '<p>数据库初始化完成，已插入5条数据</p>';
            });
        }
        
        // 显示单行数据
        function showData(row) {
            var tr = document.createElement("tr");
            var fields = ['id', 'name', 'hp_max', 'mp_max', 'role_main'];
            
            fields.forEach(function(field) {
                var td = document.createElement("td");
                td.innerHTML = row[field];
                tr.appendChild(td);
            });
            
            datatable.appendChild(tr);
        }
        
        // 清空表格
        function clearTable() {
            var childs = datatable.childNodes;
            while (childs.length > 0) {
                datatable.removeChild(childs[0]);
            }
        }
        
        // 查询英雄
        function search() {
            var keyword = document.getElementById("keyword").value;
            document.getElementById('status').innerHTML = '';
            clearTable();
            
            db.transaction(function(tx) {
                var sql = "SELECT * FROM heros WHERE name LIKE ?";
                tx.executeSql(sql, ['%' + keyword + '%'], function(tx, results) {
                    var len = results.rows.length;
                    document.getElementById('status').innerHTML = 
                        '<p>查询到 ' + len + ' 条记录</p>';
                    
                    for (var i = 0; i < len; i++) {
                        showData(results.rows.item(i));
                    }
                }, function(tx, error) {
                    document.getElementById('status').innerHTML = 
                        '<p>查询失败: ' + error.message + '</p>';
                });
            });
        }
        
        // 页面加载完成后初始化
        window.onload = init;
    </script>
</head>
<body>
    <h1>王者荣耀英雄查询</h1>
    
    <div class="search-box">
        <input type="text" id="keyword" placeholder="输入英雄名称">
        <input type="button" value="查询" onclick="search()">
    </div>
    
    <div id="status"></div>
    
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>名称</th>
                <th>最大生命值</th>
                <th>最大法力值</th>
                <th>定位</th>
            </tr>
        </thead>
        <tbody id="datatable"></tbody>
    </table>
</body>
</html>
```

### 代码解析

**1. 数据库初始化**

```javascript
// 页面加载时自动执行
window.onload = init;

function init() {
    // 打开/创建数据库
    db = openDatabase('wucai', '1.0', '王者荣耀英雄数据', 1024 * 1024);
    
    // 创建表并插入初始数据
    db.transaction(function(tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS heros ...');
        tx.executeSql('INSERT INTO heros VALUES ...');
    });
}
```

**2. 查询功能**

```javascript
function search() {
    db.transaction(function(tx) {
        // 使用参数化查询防止SQL注入
        var sql = "SELECT * FROM heros WHERE name LIKE ?";
        tx.executeSql(sql, ['%' + keyword + '%'], function(tx, results) {
            // 处理查询结果
            var len = results.rows.length;
            for (var i = 0; i < len; i++) {
                showData(results.rows.item(i));
            }
        });
    });
}
```

**3. 结果展示**

```javascript
function showData(row) {
    var tr = document.createElement("tr");
    // 创建单元格并填充数据
    var td = document.createElement("td");
    td.innerHTML = row['name'];
    tr.appendChild(td);
    // 添加到表格
    datatable.appendChild(tr);
}
```

## WebSQL数据操作

### 增删改查示例

```javascript
var db = openDatabase('test', '1.0', 'Test DB', 1024 * 1024);

// 创建表
db.transaction(function(tx) {
    tx.executeSql('CREATE TABLE IF NOT EXISTS users (id PRIMARY KEY, name, age)');
});

// 插入数据
function insertUser(id, name, age) {
    db.transaction(function(tx) {
        tx.executeSql('INSERT INTO users (id, name, age) VALUES (?, ?, ?)', 
            [id, name, age], 
            function(tx, result) {
                console.log('插入成功');
            },
            function(tx, error) {
                console.log('插入失败: ' + error.message);
            }
        );
    });
}

// 查询数据
function queryUsers() {
    db.transaction(function(tx) {
        tx.executeSql('SELECT * FROM users', [], function(tx, results) {
            var len = results.rows.length;
            for (var i = 0; i < len; i++) {
                console.log(results.rows.item(i));
            }
        });
    });
}

// 更新数据
function updateUser(id, newName) {
    db.transaction(function(tx) {
        tx.executeSql('UPDATE users SET name = ? WHERE id = ?', 
            [newName, id],
            function(tx, result) {
                console.log('更新成功，影响行数: ' + result.rowsAffected);
            }
        );
    });
}

// 删除数据
function deleteUser(id) {
    db.transaction(function(tx) {
        tx.executeSql('DELETE FROM users WHERE id = ?', 
            [id],
            function(tx, result) {
                console.log('删除成功');
            }
        );
    });
}
```

## 清除WebSQL数据

### 通过浏览器清除

**Chrome浏览器**（适用于仍保留 WebSQL 面板的老版本；新版 Chrome 已随 API 一起移除该面板）：
1. 打开开发者工具（F12）
2. 选择 Application 标签
3. 左侧找到 Storage → Web SQL
4. 右键选择 Delete database

**或使用Clear storage**：
```
Application → Clear storage → Clear site data
```

### 通过代码清除

```javascript
// 删除特定表
db.transaction(function(tx) {
    tx.executeSql('DROP TABLE IF EXISTS heros');
});

// 删除数据库（需要重新打开）
// 注意：WebSQL没有直接删除数据库的API
// 可以通过清空所有表来达到类似效果
```

## WebSQL vs IndexedDB

| 特性 | WebSQL | IndexedDB |
|-----|--------|-----------|
| **数据模型** | 关系型（SQL） | NoSQL（键值对） |
| **事务支持** | 支持 | 支持 |
| **存储容量** | 较大 | 更大（250MB+） |
| **查询方式** | SQL语句 | API调用 |
| **浏览器支持** | 部分浏览器 | 主流浏览器 |
| **规范状态** | 已废弃（W3C 2010-11 放弃，Chromium 119 移除） | 推荐使用 |
| **学习曲线** | 低（熟悉SQL） | 较高 |

## 迁移到IndexedDB

WebSQL 已废弃，如需浏览器端结构化存储，应迁移到 IndexedDB：

```javascript
// IndexedDB示例
var request = indexedDB.open('wucai', 1);

request.onupgradeneeded = function(event) {
    var db = event.target.result;
    var store = db.createObjectStore('heros', { keyPath: 'id' });
    store.createIndex('name', 'name', { unique: false });
};

request.onsuccess = function(event) {
    var db = event.target.result;
    var transaction = db.transaction(['heros'], 'readwrite');
    var store = transaction.objectStore('heros');
    store.add({ id: 10000, name: '夏侯惇', hp_max: 7350 });
};
```

## 总结

WebSQL作为浏览器端SQL数据库，核心要点如下：

| 方面 | 说明 |
|-----|------|
| **核心API** | openDatabase、transaction、executeSql |
| **主要优势** | 使用SQL语法、支持事务 |
| **主要局限** | 浏览器支持有限、规范已废弃 |
| **适用场景** | 需要SQL操作的Web应用 |
| **替代方案** | IndexedDB |

**使用建议**：
1. **新项目一律使用IndexedDB**（需要 SQL 语义时可考虑 SQLite WASM + OPFS）；
2. WebSQL 仅在 Safari 或未移除该 API 的老版本浏览器中可用，且规范早已废弃，**不要再用于新代码**；
3. 维护遗留代码时做好浏览器兼容性检测（`window.openDatabase` 存在性判断）；
4. 无论哪种存储方案，参数化查询/参数绑定都应遵守，防止注入。
