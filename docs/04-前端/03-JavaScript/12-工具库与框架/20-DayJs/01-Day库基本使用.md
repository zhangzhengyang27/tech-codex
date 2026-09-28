---
title: Day库基本使用
description: "Day.js 基本使用：安装与导入、字符串/时间戳/对象/数组/UTC 等多种解析方式、取值赋值、格式化占位符、add/subtract/startOf/endOf 操作、比较查询 API 与常用插件、国际化配置。"
keywords: [Day库基本使用]
category: tools
tags: [Day.js, 日期处理, 时间]
---


# Day.js 基本使用指南

https://github.com/iamkun/dayjs

https://dayjs.gitee.io/zh-CN/

## 简介

### 特点

- **简易**

  - Day.js 是一个轻量的处理时间和日期的 JavaScript 库，和 Moment.js 的 API 设计保持完全一样
  - 如果您曾经用过 Moment.js, 那么您已经知道如何使用 Day.js

- **不可变的**

  - 所有的 API 操作都将返回一个新的 Dayjs 对象
  - 这种设计能避免 bug 产生，节约调试时间

- **国际化**

  - Day.js 对国际化支持良好。但除非手动加载，多国语言默认是不会被打包到工程里的

- **轻量级**

  - 仅有 2KB 大小，但提供了大部分日期处理功能
  - 可通过插件按需扩展功能

- **兼容性**
  - 支持所有现代浏览器
  - 支持 Node.js 环境

## 安装

### Node.js

要在您的 Node.js 项目中使用 Day.js，只需使用 NPM 安装即可。

```shell
npm install dayjs
```

然后在项目代码中引入即可：

```javascript
const dayjs = require("dayjs")
//import dayjs from 'dayjs' // ES 2015
dayjs().format()
```

查看这里了解更多关于加载 [多语言](https://dayjs.gitee.io/docs/zh-CN/i18n/loading-into-nodejs) 和 [插件](https://dayjs.gitee.io/docs/zh-CN/plugin/loading-into-nodejs) 的信息

### 浏览器

```html
<script src="path/to/dayjs/dayjs.min.js"></script>
<script>
  dayjs().format()
</script>
```

#### CDN 资源

Day.js 同步更新在这些 CDN 上 [cdnjs.com](https://cdnjs.com/libraries/dayjs), [unpkg](https://unpkg.com/dayjs/) 和 [jsDelivr](https://www.jsdelivr.com/package/npm/dayjs)

```html
<!-- CDN example (jsDelivr) -->
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js"></script>
<script>
  dayjs().format()
</script>
```

查看这里了解更多关于加载 [多语言](https://dayjs.gitee.io/docs/zh-CN/i18n/loading-into-browser) 和 [插件](https://dayjs.gitee.io/docs/zh-CN/plugin/loading-into-browser) 的信息

### TypeScript

在 NPM 包中已经包含 Day.js 的 TypeScript 类型定义文件

```shell
npm install dayjs
```

在 TypeScript 项目中导入并使用

```typescript
import * as dayjs from 'dayjs'
dayjs().format()
```

#### 导入 Day.js 遇到了问题？

如果您的 tsconfig.json 包含以下配置，您必须使用 import dayjs from 'dayjs' 的 default import 模式：

```json
{
  //tsconfig.json
  "compilerOptions": {
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

如果您没有上述配置，default import 将无法正常工作。 您需要使用 `import * as dayjs from 'dayjs'`

#### 导入本地化语言和插件

在使用本地化语言和插件，您首先需要导入它们

```js
import * as dayjs from "dayjs"
import * as isLeapYear from "dayjs/plugin/isLeapYear" // 导入插件
import "dayjs/locale/zh-cn" // 导入本地化语言

dayjs.extend(isLeapYear) // 使用插件
dayjs.locale("zh-cn") // 使用本地化语言
```

## 解析

Day.js 并没有对原生 Date.prototype 做任何修改， 而是给 Date 对象做了一层封装。 使用支持的数据格式调用 dayjs() 即可取到这个封装的对象。

Day.js 对象是不可变的，所有的 API 操作都将返回一个全新的实例

### 当前时间

直接调用 dayjs() 将返回一个包含当前日期和时间的 Day.js 对象

- 当没有传入参数时，参数默认值是 undefined，所以调用 dayjs(undefined) 就相当于调用 dayjs()
- Day.js 将 dayjs(null) 视为无效的输入

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310181658625.png)

```javascript
var now = dayjs()
// 等同于 dayjs(new Date()) 的调用
```

### 字符串

解析传入的 [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) 格式的字符串并返回一个 Day.js 对象实例

为了保证结果一致，当解析**除了** ISO 8601 格式以外的字符串时，您应该使用 [String + Format](https://dayjs.gitee.io/docs/zh-CN/parse/string-format)

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310181658725.png)

```javascript
dayjs("2018-04-04T16:00:00.000Z")
dayjs("2018-04-13 19:18:17.040+02:00")
dayjs("2018-04-13 19:18")
```

### 字符串 + 格式

如果知道输入字符串的格式，您可以用它来解析日期。

依赖 [CustomParseFormat](https://dayjs.gitee.io/docs/zh-CN/plugin/custom-parse-format)插件，才能正常运行

```javascript
dayjs.extend(customParseFormat)
dayjs("12-25-1995", "MM-DD-YYYY")
```

如果想解析包含本地化语言的日期字符串，可以传入第三个参数

```javascript
require("dayjs/locale/zh-cn")
dayjs("2018 三月 15", "YYYY MMMM DD", "zh-cn")
```

最后一个参数可传入布尔值来启用严格解析模式。 严格解析要求格式和输入内容完全匹配，包括分隔符

```javascript
dayjs("1970-00-00", "YYYY-MM-DD").isValid() // true
dayjs("1970-00-00", "YYYY-MM-DD", true).isValid() // false
dayjs("1970-00-00", "YYYY-MM-DD", "es", true).isValid() // false
```

如果您不知道输入字符串的确切格式，但知道它可能是几种中的一种，可以使用数组传入多个格式

```javascript
dayjs("12-25-2001", ["YYYY", "YYYY-MM-DD"], "es", true)
```

#### 支持的解析占位符列表

| **输入** | **例子**         | **详情**                |
| -------- | ---------------- | ----------------------- |
| YY       | 01               | 两位数的年份            |
| YYYY     | 2001             | 四位数的年份            |
| M        | 1-12             | 月份，从 1 开始         |
| MM       | 01-12            | 月份，两位数            |
| MMM      | Jan-Dec          | 缩写的月份名称          |
| MMMM     | January-December | 完整的月份名称          |
| D        | 1-31             | 月份里的一天            |
| DD       | 01-31            | 月份里的一天，两位数    |
| H        | 0-23             | 小时                    |
| HH       | 00-23            | 小时，两位数            |
| h        | 1-12             | 小时, 12 小时制         |
| hh       | 01-12            | 小时, 12 小时制, 两位数 |
| m        | 0-59             | 分钟                    |
| mm       | 00-59            | 分钟，两位数            |
| s        | 0-59             | 秒                      |
| ss       | 00-59            | 秒 两位数               |
| S        | 0-9              | 毫秒，一位数            |
| SS       | 00-99            | 毫秒，两位数            |
| SSS      | 000-999          | 毫秒，三位数            |
| Z        | -05:00           | UTC 的偏移量            |
| ZZ       | -0500            | UTC 的偏移量，两位数    |
| A        | AM PM            | 上午 下午 大写          |
| a        | am pm            | 上午 下午 小写          |
| Do       | 1st... 31st      | 带序数词的月份里的一天  |
| X        | 1410715640.579   | Unix 时间戳             |
| x        | 1410715640579    | Unix 时间戳             |

#### 和 Moment.js 的差异

| **title**                                       | **parameters**                                                               | **dayjs**             | **moment**            |
| ----------------------------------------------- | ---------------------------------------------------------------------------- | --------------------- | --------------------- |
| invalid date with overflow                      | ('35/22/2010 99:88:77', 'DD-MM-YYYY HH:mm:ss')                               | '08-11-2011 04:29:17' | 'Invalid date'        |
| invalid date with overflow, strict              | ('35/22/2010 99:88:77', 'DD-MM-YYYY HH:mm:ss', true)                         | 'Invalid Date'        | 'Invalid date'        |
| '0' day or month (using default values)         | ('1970-00-00', 'YYYY-MM-DD')                                                 | '1970-01-01'          | 'Invalid date'        |
| '0' day or month (using default values), strict | ('1970-00-00', 'YYYY-MM-DD', true)                                           | 'Invalid Date'        | 'Invalid date'        |
| date not matching format                        | ('10/12/2014', 'YYYY-MM-DD')                                                 | '01-01-2014'          | '12-20-2010'          |
| date not matching format, strict                | ('10/12/2014', 'YYYY-MM-DD', true)                                           | 'Invalid Date'        | 'Invalid date'        |
| first match vs. longest match                   | ('2012-05-28 10:21:15', ['YYYY', 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss'])       | '2012-01-01 00:00:00' | '2012-05-28 10:21:15' |
| first match vs. longest match, strict           | ('2012-05-28 10:21:15', ['YYYY', 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss'], true) | '2012-05-28 10:21:15' | '2012-05-28 10:21:15' |

### Unix 时间戳 (毫秒)

解析传入的一个 Unix 时间戳 (13 位数字，从 1970 年 1 月 1 日 UTC 午夜开始所经过的毫秒数) 创建一个 Day.js 对象

传入的参数必须是 **number**

```javascript
dayjs(1318781876406)
```

### Unix 时间戳 (秒)

解析传入的一个 Unix 时间戳 (10 位数字，从 1970 年 1 月 1 日 Utc 午夜开始所经过的秒数) 创建一个 Day.js 对象

```javascript
dayjs.unix(1318781876)
```

这个方法是用 dayjs( timestamp \* 1000) 实现的，所以传入时间戳里的小数点后面的秒也会被解析

### Date 对象

使用原生 Javascript Date 对象创建一个 Day.js 对象

这将克隆 Date 对象。 对传入的 Date 对象做进一步更改不会影响 Day.js 对象，反之亦然

```javascript
var d = new Date(2018, 8, 18)
var day = dayjs(d)
```

### 对象

您可以传入包含单位和数值的一个对象来创建 Dayjs 对象。

这依赖 [ObjectSupport](https://dayjs.gitee.io/docs/zh-CN/plugin/object-support) 插件，才能正常运行

- day 和 date 都表示月份里的日期。
- dayjs({}) 返回当前时间。
- 注意类似 new Date(year, month, date)，月份从 0 开始计算

```javascript
dayjs.extend(objectSupport)
dayjs({ hour: 15, minute: 10 })
dayjs.utc({ y: 2010, M: 3, d: 5, h: 15, m: 10, s: 3, ms: 123 })
dayjs({ year: 2010, month: 3, day: 5, hour: 15, minute: 10, second: 3, millisecond: 123 })
dayjs({ years: 2010, months: 3, date: 5, hours: 15, minutes: 10, seconds: 3, milliseconds: 123 })
```

### 数组

您可以传入一个数组来创建一个 Dayjs 对象，数组和结构和 new Date() 十分类似。

这依赖 [ArraySupport](https://dayjs.gitee.io/docs/zh-CN/plugin/array-support)插件，才能正常运行

- 注意类似 new Date(year, month, date)，月份从 0 开始计算

```javascript
dayjs.extend(arraySupport)
dayjs([2010, 1, 14, 15, 25, 50, 125]) // February 14th, 3:25:50.125 PM
dayjs.utc([2010, 1, 14, 15, 25, 50, 125])
dayjs([2010]) // January 1st
dayjs([2010, 6]) // July 1st
dayjs([2010, 6, 10]) // July 10th
```

### UTC

- 默认情况下，Day.js 会把时间解析成本地时间
- 如果想使用 UTC 时间，您可以调用 dayjs.utc() 而不是 dayjs()
- 在 UTC 模式下，所有显示方法将会显示 UTC 时间而非本地时间
- 此外，在 UTC 模式下， 所有 getters 和 setters 将使用 Date#getUTC* 和 Date#setUTC* 方法而不是 Date#get* 和 Date#set* 方法
- 要在本地时间和 UTC 时间之间切换，您可以使用 [dayjs#utc](https://dayjs.gitee.io/docs/zh-CN/manipulate/utc) 或 [dayjs#local](https://dayjs.gitee.io/docs/zh-CN/manipulate/local)

这依赖 [UTC](https://dayjs.gitee.io/docs/zh-CN/plugin/utc)插件，才能正常运行

```javascript
dayjs.extend(utc)

// 默认是当地时间
dayjs().format() //2019-03-06T08:00:00+08:00
// UTC 时间
dayjs.utc().format() // 2019-03-06T00:00:00Z
```

### Dayjs 复制

- 所有的 Day.js 对象都是 **不可变的**。 但如果有必要，使用 `dayjs#clone` 可以复制出一个当前对象
- 在 dayjs() 里传入一个 Day.js 对象也会返回一个复制的对象

```javascript
var a = dayjs()
var b = a.clone()
// a 和 b 是两个独立的 Day.js 对象
var a = dayjs()
var b = dayjs(a)
```

### 验证

返回 布尔值 表示 Dayjs 的日期是否通过校验。

- 不严格的校验只检查传入的值能否被解析成一个时间日期
- 严格校验检查传入的值能否被解析，且是否是一个有意义的日期。 最后两个参数 format 和 strict 必须提供。

这依赖 [CustomParseFormat](https://dayjs.gitee.io/docs/zh-CN/plugin/custom-parse-format)插件，才能正常运行

```javascript
dayjs("2022-01-33").isValid()
// true, parsed to 2022-02-02
dayjs("some invalid string").isValid()
// false
dayjs("2022-02-31", "YYYY-MM-DD", true).isValid()
// false
```

## 取值/赋值

- 在设计上 Day.js 的 getter 和 setter 使用了相同的 API，也就是说，不传参数调用方法即为 getter，调用并传入参数为 setter
- 由于 dayjs 对象是不可变的，所有设置操作将返回一个新的 dayjs 实例
- 这些 API 调用了对应原生 Date 对象的方法

```javascript
dayjs().second(30).valueOf() // => new Date().setSeconds(30)
dayjs().second() // => new Date().getSeconds()
```

如果您处于 [UTC 模式](https://dayjs.gitee.io/docs/zh-CN/parse/utc)，将会调用对应的 UTC 方法

```javascript
dayjs.utc().second(30).valueOf() // => new Date().setUTCSeconds(30)
dayjs.utc().second() // => new Date().getUTCSeconds()
```

### Millisecond

- 获取或设置毫秒
- 传入 0 到 999 的数字。 如果超出这个范围，它会进位到秒

```javascript
// gets current millisecond
dayjs().millisecond() // 372
dayjs().millisecond(1) // 返回一个 day.js对象
```

### Second

- 获取或设置秒
- 传入 0 到 59 的数字。 如果超出这个范围，它会进位到分钟

```javascript
dayjs().second() // gets current second
dayjs().second(1) // returns new dayjs object
```

### Minute

- 获取或设置分钟
- 传入 0 到 59 的数字。 如果超出这个范围，它会进位到小时

```javascript
dayjs().minute() // gets current minute
dayjs().minute(59) // returns new dayjs object
```

### Hour

获取或设置小时。

传入 0 到 23 的数字。 如果超出这个范围，它会进位到天数。

```javascript
dayjs().hour() // gets current hour
newDate = dayjs().hour(12) // returns new dayjs object
```

### Date of Month

- 获取或设置月份里的日期
- 接受 1 到 31 的数字。 如果超出这个范围，它会进位到月份

```javascript
dayjs().date() // gets day of current month
dayjs().date(1) // returns new dayjs object
```

### Day of Week

- 获取或设置星期几
- 传入 number 从 0(星期天)到 6(星期六)。 如果超出这个范围，它会进位到其他周

dayjs#date 是该月的日期。 dayjs#day 是星期几。

```javascript
dayjs().day() // gets day of current week
dayjs().day(0) // returns new dayjs object
```

### Day of Week (Locale Aware)

根据本地化配置获取或设置星期几。

这依赖 [Weekday](https://dayjs.gitee.io/docs/zh-CN/plugin/weekday)插件，才能正常运行

如果本地化配置了星期天为一周的第一天， dayjs().weekday(0) 将返回星期天。 如果星期一是一周的第一天， dayjs().weekday(0) 将返回星期一。

```javascript
dayjs.extend(weekday)

// 当星期天是一周的第一天
dayjs().weekday(-7) // last Sunday
dayjs().weekday(7) // next Sunday

// 当星期一是一周的第一天
dayjs().weekday(-7) // last Monday
dayjs().weekday(7) // next Monday

// 当星期天是一周的第一天
dayjs().weekday(-5) // last Tuesday (5th day before Sunday)
dayjs().weekday(5) // next Friday (5th day after Sunday)
```

### ISO Day of Week

获取或设置 [ISO 星期几](https://en.wikipedia.org/wiki/ISO_week_date) ，其中 1 是星期一、7 是星期日

这依赖 [IsoWeek](https://dayjs.gitee.io/docs/zh-CN/plugin/iso-week)插件，才能正常运行

```javascript
dayjs.extend(isoWeek)

dayjs().isoWeekday() // gets the current ISO day of the week
dayjs().isoWeekday(1) // Monday
```

### 每年中的第几天

- 获取或设置年份里第几天
- 传入 1 到 366 的数字
- 如果超出这个范围，它会进位到下一年

这依赖 [DayOfYear](https://dayjs.gitee.io/docs/zh-CN/plugin/day-of-year)插件，才能正常运行

```javascript
dayjs.extend(dayOfYear)

dayjs("2010-01-01").dayOfYear() // 1
dayjs("2010-01-01").dayOfYear(365) // 2010-12-31
```

### Week of Year

获取或设置该年的第几周

这依赖 [WeekOfYear](https://dayjs.gitee.io/docs/zh-CN/plugin/week-of-year)插件，才能正常运行

```javascript
dayjs.extend(weekOfYear)

dayjs("2018-06-27").week() // 26
dayjs("2018-06-27").week(5) // returns new dayjs object
```

### Week of Year (ISO)

获取或设置年份的 [ISO 星期](https://en.wikipedia.org/wiki/ISO_week_date)。

这依赖 [IsoWeek](https://dayjs.gitee.io/docs/zh-CN/plugin/iso-week)插件，才能正常运行

```javascript
dayjs.extend(isoWeek)

dayjs().isoWeek() // gets the current ISO week of the year
newDate = dayjs().isoWeek(2) // returns new dayjs object
```

### Month

- 获取或设置月份
- 传入 0 到 11 的 number。 如果超出这个范围，它会进位到年份

月份是从 0 开始计算的，即 1 月是 0

```javascript
dayjs().month() // gets current month
dayjs().month(0) // returns new dayjs object
```

### Quarter

获取或设置季度

这依赖 [QuarterOfYear](https://dayjs.gitee.io/docs/zh-CN/plugin/quarter-of-year)插件，才能正常运行

```javascript
dayjs.extend(quarterOfYear)

dayjs("2010-04-01").quarter() // 2
dayjs("2010-04-01").quarter(2) // returns new dayjs object
```

### Year

获取或设置年份

```javascript
dayjs().year() // gets current year
dayjs().year(2000) // returns new dayjs object
```

### Week Year

获取基于当前语言配置的按周计算的年份

这依赖 [WeekYear](https://dayjs.gitee.io/docs/zh-CN/plugin/week-year)插件，才能正常运行

```javascript
dayjs.extend(weekYear)
dayjs.extend(weekOfYear)

dayjs().weekYear()
```

### Week Year (ISO)

获取 [ISO 周年](https://en.wikipedia.org/wiki/ISO_week_date)

这依赖 [IsoWeek](https://dayjs.gitee.io/docs/zh-CN/plugin/iso-week)插件，才能正常运行

```javascript
dayjs.extend(isoWeek)

dayjs().isoWeekYear()
```

### Weeks In Year (ISO)

获取当前年份的周数，根据 [ISO weeks](https://en.wikipedia.org/wiki/ISO_week_date)的定义

这依赖 [IsoWeeksInYear](https://dayjs.gitee.io/docs/zh-CN/plugin/iso-weeks-in-year)插件，才能正常运行

```javascript
dayjs.extend(isoWeeksInYear)
dayjs.extend(isLeapYear)

dayjs("2004-01-01").isoWeeksInYear() // 53
dayjs("2005-01-01").isoWeeksInYear() // 52
```

### Get

从 Day.js 对象中获取相应信息的 getter

```javascript
dayjs().get(unit) === dayjs()[unit]()
```

各个传入的单位对大小写不敏感，支持缩写和复数。 请注意，缩写是区分大小写的

```javascript
dayjs().get("year")
dayjs().get("month") // start 0
dayjs().get("date")
dayjs().get("hour")
dayjs().get("minute")
dayjs().get("second")
dayjs().get("millisecond")
```

#### 支持的单位列表

| **单位**    | **缩写** | **详情**                    |
| ----------- | -------- | --------------------------- |
| date        | D        | 月份里的日期                |
| day         | d        | 星期几 (星期天 0，星期六 6) |
| month       | M        | 月份 (一月 0， 十二月 11)   |
| year        | y        | 年份                        |
| hour        | h        | 小时                        |
| minute      | m        | 分钟                        |
| second      | s        | 秒                          |
| millisecond | ms       | 毫秒                        |

### Set

通用的 setter，两个参数分别是要更新的单位和数值，调用后会返回一个修改后的新实例。

```javascript
dayjs().set(unit, value) === dayjs()[unit](value)

dayjs().set(unit, value) === dayjs()[unit](value)
dayjs().set("date", 1)
dayjs().set("month", 3) // 四月
dayjs().set("second", 30)
```

也支持这样的链式调用

```javascript
dayjs().set("hour", 5).set("minute", 55).set("second", 15)
```

各个传入的单位对大小写不敏感，支持缩写和复数

### Maximum

返回传入的 Day.js 实例中的最大的 (即最靠近未来的)。 它接受传入多个 Day.js 实例或一个数组

这依赖 [MinMax](https://dayjs.gitee.io/docs/zh-CN/plugin/min-max)插件，才能正常运行

```javascript
dayjs.extend(minMax)

dayjs.max(dayjs(), dayjs("2018-01-01"), dayjs("2019-01-01"))
dayjs.max([dayjs(), dayjs("2018-01-01"), dayjs("2019-01-01")])
```

### Minimum

返回传入的 Day.js 实例中的最小的 (即最靠近过去的)。 它接受传入多个 Day.js 实例或一个数组。

这依赖 [MinMax](https://dayjs.gitee.io/docs/zh-CN/plugin/min-max)插件，才能正常运行

```javascript
dayjs.extend(minMax)

dayjs.min(dayjs(), dayjs("2018-01-01"), dayjs("2019-01-01"))
dayjs.min([dayjs(), dayjs("2018-01-01"), dayjs("2019-01-01")])
```

## 格式化

### 格式化

返回指定格式的字符串

```javascript
dayjs().format() // 默认格式: '2020-04-02T08:02:17-05:00'
dayjs().format("YYYY-MM-DD HH:mm:ss") // '2020-04-02 08:02:17'
```

#### 支持的格式化占位符

| **占位符** | **输出**         | **详情**                |
| ---------- | ---------------- | ----------------------- |
| YY         | 18               | 两位数的年份            |
| YYYY       | 2018             | 四位数的年份            |
| M          | 1-12             | 月份，从 1 开始         |
| MM         | 01-12            | 月份，两位数            |
| MMM        | Jan-Dec          | 缩写的月份名称          |
| MMMM       | January-December | 完整的月份名称          |
| D          | 1-31             | 月份里的一天            |
| DD         | 01-31            | 月份里的一天，两位数    |
| H          | 0-23             | 小时                    |
| HH         | 00-23            | 小时，两位数            |
| h          | 1-12             | 小时, 12 小时制         |
| hh         | 01-12            | 小时, 12 小时制, 两位数 |
| m          | 0-59             | 分钟                    |
| mm         | 00-59            | 分钟，两位数            |
| s          | 0-59             | 秒                      |
| ss         | 00-59            | 秒，两位数              |
| SSS        | 000-999          | 毫秒，三位数            |
| Z          | -05:00           | UTC 的偏移量            |
| ZZ         | -0500            | UTC 的偏移量，两位数    |
| A          | AM PM            | 上午 下午 大写          |
| a          | am pm            | 上午 下午 小写          |
| Do         | 1st... 31st      | 带序数词的月份里的一天  |
| X          | 1410715640.579   | Unix 时间戳（秒）       |
| x          | 1410715640579    | Unix 时间戳（毫秒）     |

### 差异化格式

这依赖 [AdvancedFormat](https://dayjs.gitee.io/docs/zh-CN/plugin/advanced-format)插件，才能正常运行

```javascript
dayjs.extend(advancedFormat)

dayjs().format("Q Do k kk X x")
```

#### 支持的额外格式化占位符

| **占位符** | **输出**      | **详情**               |
| ---------- | ------------- | ---------------------- |
| Q          | 1-4           | 季度                   |
| Do         | 1st... 31st   | 带序数词的月份里的一天 |
| kk         | 01-24         | 小时，2 位数           |
| k          | 1-24          | 小时                   |
| X          | 1360013296    | Unix 时间戳（秒）      |
| x          | 1360013296123 | Unix 时间戳（毫秒）    |

## 操作

### 增加

增加时间并返回一个新的 Day.js 对象

```javascript
dayjs().add(7, "day") // 增加七天
dayjs().add(7, "month") // 增加七个月
dayjs().add(7, "year") // 增加七年
```

#### 支持的单位列表

| **单位**    | **缩写** | **详情**                    |
| ----------- | -------- | --------------------------- |
| date        | D        | 月份里的日期                |
| day         | d        | 星期几 (星期天 0，星期六 6) |
| month       | M        | 月份 (一月 0， 十二月 11)   |
| year        | y        | 年份                        |
| hour        | h        | 小时                        |
| minute      | m        | 分钟                        |
| second      | s        | 秒                          |
| millisecond | ms       | 毫秒                        |

### 减少

减少时间并返回一个新的 Day.js 对象

```javascript
dayjs().subtract(7, "year") // 减少七年
```

### 开始时间

返回一个当前时间单位的开始的 Day.js 对象

```javascript
dayjs().startOf("year") // 今年一月1日 00:00:00
dayjs().startOf("month") // 本月1日 00:00:00
dayjs().startOf("week") // 本周的第一天 00:00:00
dayjs().startOf("day") // 今天 00:00:00
dayjs().startOf("hour") // 当前小时 00:00:00
```

### 结束时间

返回一个当前时间单位的结束的 Day.js 对象

```javascript
dayjs().endOf("month") // 本月最后一天 23:59:59
```

## 比较

### 是否之前

返回一个布尔值，表示一个 Day.js 对象是否在另一个 Day.js 对象之前

```javascript
dayjs("2010-10-20").isBefore(dayjs("2010-10-21")) // true
```

### 是否相同

返回一个布尔值，表示一个 Day.js 对象是否和另一个 Day.js 对象相同

```javascript
dayjs("2010-10-20").isSame(dayjs("2010-10-20")) // true
```

### 是否之后

返回一个布尔值，表示一个 Day.js 对象是否在另一个 Day.js 对象之后

```javascript
dayjs("2010-10-20").isAfter(dayjs("2010-10-19")) // true
```

### 是否相同或之前

返回一个布尔值，表示一个 Day.js 对象是否在或早于另一个 Day.js 对象

这依赖 [IsSameOrBefore](https://dayjs.gitee.io/docs/zh-CN/plugin/is-same-or-before)插件，才能正常运行

```javascript
dayjs("2010-10-20").isSameOrBefore(dayjs("2010-10-21")) // true
dayjs("2010-10-20").isSameOrBefore(dayjs("2010-10-20")) // true
```

### 是否相同或之后

返回一个布尔值，表示一个 Day.js 对象是否在或晚于另一个 Day.js 对象

这依赖 [IsSameOrAfter](https://dayjs.gitee.io/docs/zh-CN/plugin/is-same-or-after)插件，才能正常运行

```javascript
dayjs("2010-10-20").isSameOrAfter(dayjs("2010-10-19")) // true
dayjs("2010-10-20").isSameOrAfter(dayjs("2010-10-20")) // true
```

### 是否之间

返回一个布尔值，表示一个 Day.js 对象是否在两个 Day.js 对象之间

这依赖 [IsBetween](https://dayjs.gitee.io/docs/zh-CN/plugin/is-between)插件，才能正常运行

```javascript
dayjs("2010-10-20").isBetween(dayjs("2010-10-19"), dayjs("2010-10-25")) // true
```

## 查询

### 是否是闰年

获取是否是闰年

这依赖 [IsLeapYear](https://dayjs.gitee.io/docs/zh-CN/plugin/is-leap-year)插件，才能正常运行

```javascript
dayjs.extend(isLeapYear)

dayjs("2000-01-01").isLeapYear() // true
```

### 是否是某一天

获取是否是某一天

这依赖 [IsSameOrBefore](https://dayjs.gitee.io/docs/zh-CN/plugin/is-same-or-before)和[IsSameOrAfter](https://dayjs.gitee.io/docs/zh-CN/plugin/is-same-or-after)插件，才能正常运行

```javascript
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)

dayjs("2010-10-20").isSameOrBefore("2010-10-21", "year") // true
dayjs("2010-10-20").isSameOrAfter("2010-10-19", "year") // true
```

## 插件

Day.js 的核心功能很小，但可以通过插件扩展功能。以下是一些常用插件：

### 自定义解析格式

```javascript
import customParseFormat from "dayjs/plugin/customParseFormat"
dayjs.extend(customParseFormat)

dayjs("12-25-1995", "MM-DD-YYYY")
```

### 相对时间

```javascript
import relativeTime from "dayjs/plugin/relativeTime"
dayjs.extend(relativeTime)

dayjs("1999-01-01").fromNow() // 24 years ago
```

### UTC

```javascript
import utc from "dayjs/plugin/utc"
dayjs.extend(utc)

dayjs.utc().format()
```

### 时区

```javascript
import timezone from "dayjs/plugin/timezone"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)
dayjs.extend(timezone)

dayjs.tz("2019-01-01", "America/New_York")
```

## 国际化

### 使用语言包

```javascript
import "dayjs/locale/zh-cn" // 导入中文语言包

dayjs.locale("zh-cn") // 使用中文

dayjs().format("dddd, MMMM DD, YYYY") // 星期三, 三月 15, 2023
```

### 支持的语言

Day.js 支持多种语言，包括但不限于：

- 中文 (zh-cn)
- 英文 (en)
- 日文 (ja)
- 韩文 (ko)
- 法文 (fr)
- 德文 (de)
- 西班牙文 (es)

## 实际应用场景

### 1. 倒计时功能

```javascript
// 计算距离目标日期的剩余时间
function countdown(targetDate) {
  const now = dayjs()
  const target = dayjs(targetDate)
  const diff = target.diff(now)

  if (diff <= 0) return "已结束"

  const days = target.diff(now, "day")
  const hours = target.diff(now, "hour") % 24
  const minutes = target.diff(now, "minute") % 60
  const seconds = target.diff(now, "second") % 60

  return `${days}天 ${hours}小时 ${minutes}分钟 ${seconds}秒`
}

// 使用示例
console.log(countdown("2023-12-31 23:59:59"))
```

### 2. 格式化显示时间

```javascript
// 根据时间显示不同的格式
function formatTime(date) {
  const now = dayjs()
  const target = dayjs(date)
  const diffDays = now.diff(target, "day")

  if (diffDays === 0) {
    // 今天
    return target.format("HH:mm")
  } else if (diffDays === 1) {
    // 昨天
    return `昨天 ${target.format("HH:mm")}`
  } else if (diffDays < 7) {
    // 一周内
    return target.format("dddd HH:mm")
  } else {
    // 超过一周
    return target.format("MM-DD HH:mm")
  }
}

// 使用示例
console.log(formatTime("2023-03-15 14:30:00"))
```

### 3. 工作日计算

```javascript
// 计算工作日（排除周末）
function addWorkdays(startDate, days) {
  let date = dayjs(startDate)
  let remainingDays = days

  while (remainingDays > 0) {
    date = date.add(1, "day")
    // 周末不算工作日
    if (date.day() !== 0 && date.day() !== 6) {
      remainingDays--
    }
  }

  return date
}

// 使用示例
console.log(addWorkdays("2023-03-15", 5).format("YYYY-MM-DD"))
```

### 4. 时间范围选择

```javascript
// 获取常用时间范围
function getTimeRange(type) {
  const now = dayjs()

  switch (type) {
    case "today":
      return {
        start: now.startOf("day"),
        end: now.endOf("day")
      }
    case "yesterday":
      return {
        start: now.subtract(1, "day").startOf("day"),
        end: now.subtract(1, "day").endOf("day")
      }
    case "thisWeek":
      return {
        start: now.startOf("week"),
        end: now.endOf("week")
      }
    case "thisMonth":
      return {
        start: now.startOf("month"),
        end: now.endOf("month")
      }
    case "lastMonth":
      return {
        start: now.subtract(1, "month").startOf("month"),
        end: now.subtract(1, "month").endOf("month")
      }
    default:
      return {
        start: now.startOf("day"),
        end: now.endOf("day")
      }
  }
}

// 使用示例
const { start, end } = getTimeRange("thisWeek")
console.log(`本周范围: ${start.format("YYYY-MM-DD")} 至 ${end.format("YYYY-MM-DD")}`)
```

## 最佳实践

1. **统一使用 UTC 时间存储**

   - 在服务器端存储和传输时间时，统一使用 UTC 时间
   - 在前端显示时，根据用户时区进行转换

2. **避免直接操作 Date 对象**

   - 使用 Day.js 提供的 API 而不是直接操作原生 Date 对象
   - 这样可以避免时区问题和浏览器兼容性问题

3. **合理使用插件**

   - 只加载需要的插件，减少打包体积
   - 对于常用功能，可以考虑封装成工具函数

4. **处理时区问题**

   - 明确应用是否需要处理多时区
   - 如果需要，使用 timezone 插件（`dayjs/plugin/timezone`）

5. **性能优化**
   - 避免频繁创建 Day.js 对象
   - 对于大量日期操作，考虑使用原生 Date 对象进行计算

## 常见问题

### Q: Day.js 和 Moment.js 有什么区别？

A: Day.js 是 Moment.js 的轻量级替代品，主要区别：

- Day.js 只有 2KB，而 Moment.js 有 67KB
- Day.js API 与 Moment.js 基本兼容
- Day.js 采用不可变设计，所有操作返回新实例
- Day.js 支持插件化，按需加载功能

### Q: 如何处理时区问题？

A: 使用 timezone 插件（`dayjs/plugin/timezone`）：

```javascript
import timezone from "dayjs/plugin/timezone"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)
dayjs.extend(timezone)

// 转换为特定时区
const date = dayjs.tz("2023-03-15 12:00", "America/New_York")

// 获取当前时区
const localDate = dayjs.tz("2023-03-15 12:00", dayjs.tz.guess())
```

### Q: 如何计算两个日期之间的工作日？

A: 可以使用以下方法：

```javascript
function getWorkdays(startDate, endDate) {
  const start = dayjs(startDate)
  const end = dayjs(endDate)
  let workdays = 0

  let currentDate = start
  while (currentDate.isBefore(end) || currentDate.isSame(end)) {
    // 周末不算工作日
    if (currentDate.day() !== 0 && currentDate.day() !== 6) {
      workdays++
    }
    currentDate = currentDate.add(1, "day")
  }

  return workdays
}

// 使用示例
console.log(getWorkdays("2023-03-01", "2023-03-31"))
```

### Q: 如何格式化相对时间？

A: 使用 relativeTime 插件：

```javascript
import relativeTime from "dayjs/plugin/relativeTime"
dayjs.extend(relativeTime)

dayjs("2023-03-10").fromNow() // 5 days ago
dayjs("2023-03-20").toNow() // in 5 days
```

### Q: 如何处理夏令时？

A: 使用时区插件会自动处理夏令时：

```javascript
import timezone from "dayjs/plugin/timezone"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)
dayjs.extend(timezone)

// 时区插件会自动处理夏令时
const date = dayjs.tz("2023-03-15 12:00", "America/New_York")
```
