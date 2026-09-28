---
title: Day库进阶使用
description: "Day.js 进阶使用：add/subtract/startOf/endOf 操作与支持单位、UTC/local/utcOffset 转换、format 占位符与本地化格式、fromNow/from 相对时间、diff 差值计算、各类查询 API 与国际化配置。"
keywords: [Day库进阶使用]
category: tools
tags: [Day.js, 日期处理, 时间]
---


# Day.js 库进阶使用

## 操作

您可能需要一些方法来操作 Day.js 对象。支持链式调用：

```javascript
dayjs('2019-01-25').add(1, 'day').subtract(1, 'year').year(2009).toString()
```

### Add

返回增加一定时间的复制的 Day.js 对象

```javascript
const a = dayjs()
const b = a.add(7, 'day')

// a -> the original value and will not change
// b -> the manipulation result
```

各个传入的单位对大小写不敏感，支持缩写和复数。 请注意，缩写是区分大小写的。

支持的单位列表

| **单位**    | **缩写** | **详情**                                                     |
| ----------- | -------- | ------------------------------------------------------------ |
| day         | d        | 日                                                           |
| week        | w        | 周                                                           |
| month       | M        | 月                                                           |
| quarter     | Q        | 季度 ( 依赖 [QuarterOfYear](https://dayjs.gitee.io/docs/zh-CN/plugin/quarter-of-year) 插件 ) |
| year        | y        | 年                                                           |
| hour        | h        | 小时                                                         |
| minute      | m        | 分钟                                                         |
| second      | s        | 秒                                                           |
| millisecond | ms       | 毫秒                                                         |

或者，也可以给 Day.js 对象增加一个 [持续时间](https://dayjs.gitee.io/docs/zh-CN/durations/durations)

```javascript
result = dayjs().add(dayjs.duration({'days' : 1}))
console.log(dayjs.duration().days(1))
```

### Subtract

返回减去一定时间的复制的 Day.js 对象

```javascript
dayjs().subtract(7, 'year')
```

各个传入的单位对大小写不敏感，支持缩写和复数

### Start of Time

返回复制的 Day.js 对象，并设置到一个时间的开始。

```text
dayjs().startOf('year')
```

各个传入的单位对大小写不敏感，支持缩写和复数。

支持的单位列表

| **单位** | **缩写** | **详情**                                                     |
| -------- | -------- | ------------------------------------------------------------ |
| year     | y        | 今年一月1日上午 00:00                                        |
| quarter  | Q        | 本季度第一个月1日上午 00:00 ( 依赖 [QuarterOfYear](https://dayjs.gitee.io/docs/zh-CN/plugin/quarter-of-year) 插件 ) |
| month    | M        | 本月1日上午 00:00                                            |
| week     | w        | 本周的第一天上午 00:00 (取决于国际化设置)                    |
| isoWeek  |          | 本周的第一天上午 00:00 (根据 ISO 8601) ( 依赖 [IsoWeek](https://dayjs.gitee.io/docs/zh-CN/plugin/iso-week) 插件 ) |
| date     | D        | 当天 00:00                                                   |
| day      | d        | 当天 00:00                                                   |
| hour     | h        | 当前时间，0 分、0 秒、0 毫秒                                 |
| minute   | m        | 当前时间，0 秒、0 毫秒                                       |
| second   | s        | 当前时间，0 毫秒                                             |

### End of Time

返回复制的 Day.js 对象，并设置到一个时间的末尾

各个传入的单位对大小写不敏感，支持缩写和复数

```javascript
dayjs().endOf('month')
```

### Local

返回一个在当前时区模式下的 Day.js 对象

这依赖 [UTC](https://dayjs.gitee.io/docs/zh-CN/plugin/utc) 插件，才能正常运行

```javascript
dayjs.extend(utc)

var a = dayjs.utc()
a.format() // 2019-03-06T00:00:00Z
a.local().format() //2019-03-06T08:00:00+08:00
```

了解更多关于 [UTC 模式](https://dayjs.gitee.io/docs/zh-CN/parse/utc) 的信息

### UTC

返回一个在 UTC 模式下的 Day.js 对象

传入 true 将只改变 UTC 模式而不改变本地时间

这依赖 [UTC](https://dayjs.gitee.io/docs/zh-CN/plugin/utc) 插件，才能正常运行

```javascript
dayjs.extend(utc)

var a = dayjs()
a.format() //2019-03-06T08:00:00+08:00
a.utc().format() // 2019-03-06T00:00:00Z
```

### UTC offset

获取 UTC 偏移量 (分钟)

```javascript
dayjs().utcOffset()
```

也可以传入分钟来得到一个更改 UTC 偏移量的新实例。 请注意，一旦您设置了 UTC 偏移量，它将保持固定，不会自动改变 (即没有DST夏令时变更)

这依赖 [UTC](https://dayjs.gitee.io/docs/zh-CN/plugin/utc)插件，才能正常运行

```javascript
dayjs.extend(utc)

dayjs().utcOffset(120)
```

如果输入在 -16 到 16 之间，会将您的输入理解为小时数而非分钟

```javascript
// 以下两种写法是等效的
dayjs().utcOffset(8)  // 设置小时偏移量
dayjs().utcOffset(480)  // 设置分钟偏移量 (8 * 60)
```

第二个参数传入 true 可以只改变偏移量而保持本地时间不变

```javascript
dayjs.utc('2000-01-01T06:01:02Z').utcOffset(1, true).format() 
// 2000-01-01T06:01:02+01:00
```

## 显示

当解析和操作完成后，您需要一些方式来展示 Day.js 对象

### Format

根据传入的占位符返回格式化后的日期

将字符放在方括号中，即可原样返回而不被格式化替换 (例如， [MM])。

```javascript
dayjs().format() 
// 默认返回的是 ISO8601 格式字符串 '2020-04-02T08:02:17-05:00'

dayjs('2019-01-25').format('[YYYYescape] YYYY-MM-DDTHH:mm:ssZ[Z]') 
// 'YYYYescape 2019-01-25T00:00:00-02:00Z'

dayjs('2019-01-25').format('DD/MM/YYYY') // '25/01/2019'
```

#### 支持的格式化占位符列表

| **占位符** | **输出**         | **详情**                                                     |
| ---------- | ---------------- | ------------------------------------------------------------ |
| YY         | 18               | 两位数的年份                                                 |
| YYYY       | 2018             | 四位数的年份                                                 |
| M          | 1-12             | 月份，从 1 开始                                              |
| MM         | 01-12            | 月份，两位数                                                 |
| MMM        | Jan-Dec          | 缩写的月份名称                                               |
| MMMM       | January-December | 完整的月份名称                                               |
| D          | 1-31             | 月份里的一天                                                 |
| DD         | 01-31            | 月份里的一天，两位数                                         |
| d          | 0-6              | 一周中的一天，星期天是 0                                     |
| dd         | Su-Sa            | 最简写的星期几                                               |
| ddd        | Sun-Sat          | 简写的星期几                                                 |
| dddd       | Sunday-Saturday  | 星期几                                                       |
| H          | 0-23             | 小时                                                         |
| HH         | 00-23            | 小时，两位数                                                 |
| h          | 1-12             | 小时, 12 小时制                                              |
| hh         | 01-12            | 小时, 12 小时制, 两位数                                      |
| m          | 0-59             | 分钟                                                         |
| mm         | 00-59            | 分钟，两位数                                                 |
| s          | 0-59             | 秒                                                           |
| ss         | 00-59            | 秒 两位数                                                    |
| SSS        | 000-999          | 毫秒 三位数                                                  |
| Z          | +05:00           | UTC 的偏移量，±HH:mm                                         |
| ZZ         | +0500            | UTC 的偏移量，±HHmm                                          |
| A          | AM PM            |                                                              |
| a          | am pm            |                                                              |
| ...        | ...              | 其他格式 ( 依赖 [AdvancedFormat](https://dayjs.gitee.io/docs/zh-CN/plugin/advanced-format) 插件 ) |

- 更多可用格式 Q Do k X x ... 请使用 [AdvancedFormat插件](https://dayjs.gitee.io/docs/zh-CN/plugin/advanced-format)

#### 本地化格式

在不同的本地化配置下，有一些不同的本地化格式可以使用。

这依赖 [LocalizedFormat](https://dayjs.gitee.io/docs/zh-CN/plugin/localized-format)插件，才能正常运行

```javascript
dayjs.extend(LocalizedFormat)
dayjs().format('L LT')
```

#### 支持的本地化格式列表

| **占位符** | **英语语言**              | **示例输出**                      |
| ---------- | ------------------------- | --------------------------------- |
| LT         | h:mm A                    | 8:02 PM                           |
| LTS        | h:mm:ss A                 | 8:02:18 PM                        |
| L          | MM/DD/YYYY                | 08/16/2018                        |
| LL         | MMMM D, YYYY              | August 16, 2018                   |
| LLL        | MMMM D, YYYY h:mm A       | August 16, 2018 8:02 PM           |
| LLLL       | dddd, MMMM D, YYYY h:mm A | Thursday, August 16, 2018 8:02 PM |
| l          | M/D/YYYY                  | 8/16/2018                         |
| ll         | MMM D, YYYY               | Aug 16, 2018                      |
| lll        | MMM D, YYYY h:mm A        | Aug 16, 2018 8:02 PM              |
| llll       | ddd, MMM D, YYYY h:mm A   | Thu, Aug 16, 2018 8:02 PM         |

### Time from now

返回现在到当前实例的相对时间

这依赖 [RelativeTime](https://dayjs.gitee.io/docs/zh-CN/plugin/relative-time)插件，才能正常运行

```javascript
dayjs.extend(relativeTime)

dayjs('1999-01-01').fromNow() // 22 years ago
```

如果传入 true，则可以获得不带后缀的值

```javascript
dayjs.extend(relativeTime)

dayjs('1999-01-01').fromNow(true) // 22 年
```

#### 时间范围划分标准

表格里的值是由语言配置决定的，并且 [可以自定义输出内容](https://dayjs.gitee.io/docs/zh-CN/customization/relative-time)。 时间会舍入到最接近的秒数

| **范围**         | **键值** | **示例输出**           |
| ---------------- | -------- | ---------------------- |
| 0 到 44 秒       | s        | 几秒前                 |
| 45 到 89 秒      | m        | 1 分钟前               |
| 90 秒 到 44 分   | mm       | 2 分钟前 ... 44 分钟前 |
| 45 到 89 分      | h        | 1 小时前               |
| 90 分 到 21 小时 | hh       | 2 小时前 ... 21 小时前 |
| 22 到 35 小时    | d        | 1 天前                 |
| 36 小时 到 25 天 | dd       | 2 天前 ... 25 天前     |
| 26 到 45 天      | M        | 1 个月前               |
| 46 天 到 10 月   | MM       | 2 个月前 ... 10 个月前 |
| 11 月 到 17 月   | y        | 1 年前                 |
| 18 月以上        | yy       | 2 年前 ... 20 年前     |

### Time from X

返回 X 到当前实例的相对时间。

这依赖 [RelativeTime](https://dayjs.gitee.io/docs/zh-CN/plugin/relative-time)插件，才能正常运行

```javascript
dayjs.extend(relativeTime)

var a = dayjs('2000-01-01')

dayjs('1999-01-01').from(a) // 1 年前
```

如果传入 true，则可以获得不带后缀的值

```javascript
dayjs.extend(relativeTime)

var a = dayjs('2000-01-01')

dayjs('1999-01-01').from(a, true) // 1 年
```

### Time to now

返回当前实例到现在的相对时间

如果传入 true，则可以获得不带后缀的值

这依赖 [RelativeTime](https://dayjs.gitee.io/docs/zh-CN/plugin/relative-time)插件，才能正常运行

```javascript
dayjs.extend(relativeTime)

dayjs('1999-01-01').toNow() // 22 年后
```

### Time to X

返回当前实例到 X 的相对时间

如果传入 true，则可以获得不带后缀的值

这依赖 [RelativeTime](https://dayjs.gitee.io/docs/zh-CN/plugin/relative-time)插件，才能正常运行

```javascript
dayjs.extend(relativeTime)

var a = dayjs('2000-01-01')

dayjs('1999-01-01').to(a) // 1 年后
```

### Calendar-time

日历时间显示了距离给定时间 (默认为现在) 的相对时间，但与 dayjs#fromNow 略有不同。

这依赖 [Calendar](https://dayjs.gitee.io/docs/zh-CN/plugin/calendar)插件，才能正常运行

```javascript
dayjs.extend(calendar)

dayjs().calendar()
dayjs().calendar(dayjs('2008-01-01'))
```

| **键值**            | **值**        |
| ------------------- | ------------- |
| 上个星期 (lastWeek) | 上星期一 2:30 |
| 前一天 (lastDay)    | 昨天 2:30     |
| 同一天 (sameDay)    | 今天 2:30     |
| 下一天 (nextDay)    | 明天 2:30     |
| 下个星期 (nextWeek) | 星期日 2:30   |
| 其他 (sameElse)     | 7/10/2011     |

表格里的值是由语言配置决定的，并且 [可以自定义输出内容](https://dayjs.gitee.io/docs/zh-CN/customization/calendar)。

您也可以通过第二个参数传入指定日历输出格式。

将字符放在方括号中，即可原样返回而不被格式化替换 (例如， [Today])

```javascript
dayjs().calendar(null, {
  sameDay: '[Today at] h:mm A', // The same day ( Today at 2:30 AM )
  nextDay: '[Tomorrow]', // The next day ( Tomorrow at 2:30 AM )
  nextWeek: 'dddd', // The next week ( Sunday at 2:30 AM )
  lastDay: '[Yesterday]', // The day before ( Yesterday at 2:30 AM )
  lastWeek: '[Last] dddd', // Last week ( Last Monday at 2:30 AM )
  sameElse: 'DD/MM/YYYY' // Everything else ( 7/10/2011 )
})
```

### Difference

返回指定单位下两个日期时间之间的差异

要获得以毫秒为单位的差异，请使用 dayjs#diff

```javascript
const date1 = dayjs('2019-01-25')
const date2 = dayjs('2018-06-05')
date1.diff(date2) // 20214000000 默认单位是毫秒
```

要获取其他单位下的差异，则在第二个参数传入相应的单位

```javascript
const date1 = dayjs('2019-01-25')
date1.diff('2018-06-05', 'month') // 7
```

默认情况下， `dayjs#diff` 会将结果截去小数部分，返回一个整数。 如果要得到一个浮点数，将 true 作为第三个参数传入

```javascript
const date1 = dayjs('2019-01-25')
date1.diff('2018-06-05', 'month', true) // 7.645161290322581
```

支持的单位列表

各个传入的单位对大小写不敏感，支持缩写和复数。 请注意，缩写是区分大小写的。

| **单位**    | **缩写** | **详情**                  |
| ----------- | -------- | ------------------------- |
| day         | d        | 日                        |
| week        | w        | Week of Year              |
| quarter     | Q        | Quarter                   |
| month       | M        | 月份 (一月 0， 十二月 11) |
| year        | y        | Year                      |
| hour        | h        | Hour                      |
| minute      | m        | Minute                    |
| second      | s        | Second                    |
| millisecond | ms       | Millisecond               |

### Unix 时间戳 (毫秒)

返回当前实例的 UNIX 时间戳，13位数字，毫秒

```javascript
dayjs('2019-01-25').valueOf() // 1548381600000
  +dayjs(1548381600000) // 1548381600000
```

您应该使用 [Unix Timestamp](https://dayjs.gitee.io/docs/zh-CN/display/unix-timestamp) 来获取 UNIX 时间戳(10位 **秒**)

### Unix 时间戳

返回当前实例的 UNIX 时间戳，10位数字，秒。

```javascript
dayjs('2019-01-25').unix() // 1548381600
```

此值不包含毫秒信息，毫秒部分会被舍弃（向下取整到秒，而非四舍五入）

### 月份中天数

获取当前月份包含的天数。

```javascript
dayjs('2019-01-25').daysInMonth() // 31
```

### As Javascript Date

调用 `dayjs#toDate` 从 Day.js 对象中获取原生的 Date 对象

```javascript
dayjs('2019-01-25').toDate()
```

### As Array

返回一个包含各个时间信息的 Array

这依赖 [ToArray](https://dayjs.gitee.io/docs/zh-CN/plugin/to-array)插件，才能正常运行

```javascript
dayjs.extend(toArray)

dayjs('2019-01-25').toArray() // [ 2019, 0, 25, 0, 0, 0, 0 ]
```

### As JSON

序列化为 ISO 8601 格式的字符串

```javascript
dayjs('2019-01-25').toJSON() // '2019-01-25T02:00:00.000Z'
```

### As ISO 8601 String

返回一个 ISO 8601 格式的字符串

```javascript
dayjs('2019-01-25').toISOString() // '2019-01-25T02:00:00.000Z'
```

### As Object

返回包含时间信息的 Object

这依赖 [ToObject](https://dayjs.gitee.io/docs/zh-CN/plugin/to-object)插件，才能正常运行

```javascript
dayjs.extend(toObject)

dayjs('2019-01-25').toObject()
/* { years: 2019,
     months: 0,
     date: 25,
     hours: 0,
     minutes: 0,
     seconds: 0,
     milliseconds: 0 } */
```

### As String

返回包含时间信息的 string

```javascript
dayjs('2019-01-25').toString() // 'Fri, 25 Jan 2019 02:00:00 GMT'
```

## 查询

Day.js 对象还有很多查询的方法

### Is Before

这表示 Day.js 对象是否在另一个提供的日期时间之前。

```javascript
dayjs().isBefore(dayjs('2011-01-01')) // 默认毫秒
```

如果想使用除了毫秒以外的单位进行比较，则将单位作为第二个参数传入。 在这种情况下，会使用传入的单位以及比其范围大的单位进行比较

```javascript
dayjs().isBefore('2011-01-01', 'month') // compares month and year
```

各个传入的单位对大小写不敏感，支持缩写和复数

### Is Same

这表示 Day.js 对象是否和另一个提供的日期时间相同

```javascript
dayjs().isSame(dayjs('2011-01-01')) // 默认毫秒
```

如果想使用除了毫秒以外的单位进行比较，则将单位作为第二个参数传入。

当使用第二个参数时，将会连同去比较更大的单位。 如传入 month 将会比较 month 和 year。 传入 day 将会比较 day、 month和 year

```javascript
dayjs().isSame('2011-01-01', 'year')
```

各个传入的单位对大小写不敏感，支持缩写和复数

### Is After

这表示 Day.js 对象是否在另一个提供的日期时间之后

```javascript
dayjs().isAfter(dayjs('2011-01-01')) // 默认毫秒
```

如果想使用除了毫秒以外的单位进行比较，则将单位作为第二个参数传入。 在这种情况下，会使用传入的单位以及比其范围大的单位进行比较

```javascript
dayjs().isAfter('2011-01-01', 'month') // compares month and year
```

各个传入的单位对大小写不敏感，支持缩写和复数

### Is Same or Before

这表示 Day.js 对象是否和另一个提供的日期时间相同或在其之前

这依赖 [IsSameOrBefore](https://dayjs.gitee.io/docs/zh-CN/plugin/is-same-or-before)插件，才能正常运行

```javascript
dayjs.extend(isSameOrBefore)
dayjs().isSameOrBefore(dayjs('2011-01-01')) // 默认毫秒
```

如果想使用除了毫秒以外的单位进行比较，则将单位作为第二个参数传入

```javascript
dayjs().isSameOrBefore('2011-01-01', 'year')
```

各个传入的单位对大小写不敏感，支持缩写和复数

### Is Same or After

这表示 Day.js 对象是否和另一个提供的日期时间相同或在其之后。

这依赖 [IsSameOrAfter](https://dayjs.gitee.io/docs/zh-CN/plugin/is-same-or-after)插件，才能正常运行

```javascript
dayjs.extend(isSameOrAfter)
dayjs().isSameOrAfter(dayjs('2011-01-01')) // 默认毫秒
```

如果想使用除了毫秒以外的单位进行比较，则将单位作为第二个参数传入

```javascript
dayjs().isSameOrAfter('2011-01-01', 'year')
```

各个传入的单位对大小写不敏感，支持缩写和复数

### Is Between

这表示 Day.js 对象是否在其他两个的日期时间之间。

这依赖 [IsBetween](https://dayjs.gitee.io/docs/zh-CN/plugin/is-between)插件，才能正常运行

```javascript
dayjs.extend(isBetween)
dayjs('2010-10-20').isBetween('2010-10-19', dayjs('2010-10-25')) 
// 默认毫秒
```

如果想使用除了毫秒以外的单位进行比较，则将单位作为第三个参数传入。 在这种情况下，会使用传入的单位以及比其范围大的单位进行比较

```javascript
dayjs().isBetween('2010-10-19', '2010-10-25', 'month') // compares month and year
```

- 各个传入的单位对大小写不敏感，支持缩写和复数
- 第四个参数是设置包容性。 [ 表示包含。 ( 表示排除。
- 要使用包容性参数，必须同时传入两个指示符

```javascript
dayjs('2016-10-30').isBetween('2016-01-01', '2016-10-30', null, '[)')
```

### Is a Dayjs

这表示一个变量是否为 Day.js 对象。

```javascript
dayjs.isDayjs(dayjs()) // true
dayjs.isDayjs(new Date()) // false
```

这和使用 instanceof 的结果是一样的：

```javascript
dayjs() instanceof dayjs // true
```

### Is Leap Year

查询 Day.js 对象的年份是否是闰年。

这依赖 [IsLeapYear](https://dayjs.gitee.io/docs/zh-CN/plugin/is-leap-year)插件，才能正常运行

```javascript
dayjs.extend(isLeapYear)

dayjs('2000-01-01').isLeapYear() // true
```

## 国际化

- Day.js 完美支持国际化
- 但除非手动加载，多国语言默认是不会被打包到工程里的
- 您可以加载多个其他语言并自由切换
- [支持的语言列表](https://github.com/iamkun/dayjs/tree/dev/src/locale)
- 我们还在根目录提供了 [locale.json](https://cdn.jsdelivr.net/npm/dayjs@1/locale.json) 文件，包含所有支持的语言列表
- 语言包配置的具体细节以及如何更新或自定义语言都可以查看 [自定义](https://dayjs.gitee.io/docs/customization/customization) 中的内容
- 欢迎给我们提交 Pull Request 来增加新的语言

### 加载语言配置 (NodeJS)

按需加载语言文件

```javascript
require('dayjs/locale/zh-cn')
// import 'dayjs/locale/zh-cn' // ES 2015 

dayjs.locale('zh-cn') // 全局使用
dayjs().locale('zh-cn').format() // 当前实例使用
```

您还可以加载并获取语言配置对象方便后面使用

```javascript
var locale_de = require('dayjs/locale/de')
// import locale_de from 'dayjs/locale/de'  // ES 2015 
```

### 加载语言配置 (浏览器)

按需加载语言文件

```html
<script src="path/to/dayjs/locale/de"></script>
<script>
  dayjs.locale('de') // 全局使用
  dayjs().locale('de').format() // 当前实例使用
</script>
```

获取语言对象方便后面使用

```html
<script src="path/to/dayjs/locale/de"></script>
<!-- Load locale as window.dayjs_locale_NAME -->
<script>
  var customLocale = window.dayjs_locale_zh_cn // zh-cn -> zh_cn
</script>
```

可以通过 [CDN](https://dayjs.gitee.io/docs/zh-CN/installation/browser#cdn-resource) 加载 Day.js

```html
<!-- CDN example (jsDelivr) -->
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/locale/zh-cn.js"></script>
<script>dayjs.locale('zh-cn')</script>
```

### 改变语言配置 (全局)

默认情况下，Day.js **只**内置了 English 的语言配置。

您可以按需加载其他本地化语言配置。

```javascript
require('dayjs/locale/zh-cn')
```

当加载了一个语言配置之后，它就是可用的状态了。 要改变全局语言配置，只需调用 dayjs.locale 并传入一个已经加载的语言配置的名称。

更改全局的语言配置并不会影响之前存在的实例

```javascript
dayjs.locale('zh-cn') // 全局使用简体中文
dayjs.locale('en') // 全局使用默认的英语语言
```

### 改变语言配置 (当前实例)

当操作多个 Day.js 实例并想格式化显示为不同语言的文字时，全局的语言配置可能会出现问题

用法与 dayjs#locale 一致，但只会修改当前实例的语言配置

```javascript
require('dayjs/locale/de')
dayjs().locale('de').format() // 局部修改语言配置
```

### 查看当前语言配置

返回当前 Day.js 实例的语言配置

```javascript
dayjs.locale() // 'en'
```

### 列出当前语言的月份和周

获取当前语言配置的全部月份和星期列表

这依赖 [LocaleData](https://dayjs.gitee.io/docs/zh-CN/plugin/locale-data)插件，才能正常运行

```javascript
dayjs.extend(localeData)

dayjs.weekdays()
dayjs.weekdaysShort()
dayjs.weekdaysMin()
dayjs.monthsShort()
dayjs.months() // e.g. return [ 'January','February','March','April','May',
// 'June','July','August','September','October','November','December' ]
```

### 获取语言配置的属性

你可以通过调用 dayjs.localeData() 来获得当前全局语言配置的属性，或 dayjs().localeData() 获取当前 Day.js 对象的。

这依赖 [LocaleData](https://dayjs.gitee.io/docs/zh-CN/plugin/locale-data)插件，才能正常运行

```javascript
dayjs.extend(localeData)

globalLocaleData = dayjs.localeData()
globalLocaleData.firstDayOfWeek()
globalLocaleData.months()
globalLocaleData.monthsShort()
globalLocaleData.weekdays()
globalLocaleData.weekdaysShort()
globalLocaleData.weekdaysMin()

globalLocaleData.months(dayjs())
globalLocaleData.monthsShort(dayjs())
globalLocaleData.weekdays(dayjs())
globalLocaleData.weekdaysShort(dayjs())
globalLocaleData.weekdaysMin(dayjs())

instanceLocaleData = dayjs().localeData()
instanceLocaleData.firstDayOfWeek()
instanceLocaleData.months()
instanceLocaleData.monthsShort()
instanceLocaleData.weekdays()
instanceLocaleData.weekdaysShort()
instanceLocaleData.weekdaysMin()
```