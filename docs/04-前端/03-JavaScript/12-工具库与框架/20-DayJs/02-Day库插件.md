---
title: Day库插件
description: "Day.js 官方插件一览：加载方式（NodeJS/浏览器）、自定义插件模板，以及 AdvancedFormat、UTC、Timezone、RelativeTime、Duration、IsBetween、MinMax、LocaleData 等插件的用法示例。"
keywords: [Day库插件]
category: tools
tags: [Day.js, 日期处理, 时间]
---



# 插件

- 插件是一些独立的程序，可以给 Day.js 增加新功能和扩展已有功能
- 默认情况下，Day.js 只包含核心的代码，并没有安装任何插件
- 您可以加载多个插件来满足各类需求

## 自定义

- 您可以编写自己的 Day.js 插件来满足不同的需求
- 欢迎给我们提交 pull request 来分享您的插件
- Day.js 插件模板

```javascript
export default (option, dayjsClass, dayjsFactory) => {
  // extend dayjs()
  // e.g. add dayjs().isSameOrBefore()
  dayjsClass.prototype.isSameOrBefore = function(arguments) {}

  // extend dayjs
  // e.g. add dayjs.utc()
  dayjsFactory.utc = arguments => {}

  // overriding existing API
  // e.g. extend dayjs().format()
  const oldFormat = dayjsClass.prototype.format
  dayjsClass.prototype.format = function(arguments) {
    // original format result
    const result = oldFormat.bind(this)(arguments)
    // return modified result
  }
}
```

## 加载插件 (NodeJS)

```javascript
var AdvancedFormat = require('dayjs/plugin/advancedFormat')
// import AdvancedFormat from 'dayjs/plugin/advancedFormat' // ES 2015

dayjs.extend(AdvancedFormat) // use plugin
```

## 加载插件 (浏览器)

```html
<script src="path/to/dayjs/plugin/advancedFormat"></script>
<!-- Load plugin as window.dayjs_plugin_NAME -->
<script>
  dayjs.extend(window.dayjs_plugin_advancedFormat)
</script>
```

## AdvancedFormat

AdvancedFormat 扩展了 dayjs().format API 以支持更多模版

```javascript
var advancedFormat = require('dayjs/plugin/advancedFormat')
dayjs.extend(advancedFormat)

dayjs().format('Q Do k kk X x')
```

注意：下表中的一些格式选项，如 z 和 zzz 需要配置额外插件。

扩展的模版列表：

| **模版** | **输出**              | **详情**                                                     |
| -------- | --------------------- | ------------------------------------------------------------ |
| Q        | 1-4                   | 季度                                                         |
| Do       | 1st 2nd ... 31st      | 带序数词的月份里的一天                                       |
| k        | 1-24                  | 时：由 1 开始                                                |
| kk       | 01-24                 | 时：由 1 开始，两位数                                        |
| X        | 1360013296            | 秒为单位的 Unix 时间戳                                       |
| x        | 1360013296123         | 毫秒单位的 Unix 时间戳                                       |
| w        | 1 2 ... 52 53         | 周数 ( 依赖 [WeekOfYear](https://dayjs.gitee.io/docs/zh-CN/plugin/week-of-year) 插件 ) |
| ww       | 01 02 ... 52 53       | 周数，两位数 ( 依赖 [WeekOfYear](https://dayjs.gitee.io/docs/zh-CN/plugin/week-of-year) 插件 ) |
| W        | 1 2 ... 52 53         | ISO 周数 ( 依赖 [IsoWeek](https://dayjs.gitee.io/docs/zh-CN/plugin/iso-week) 插件 ) |
| WW       | 01 02 ... 52 53       | ISO 周数，两位数 ( 依赖 [IsoWeek](https://dayjs.gitee.io/docs/zh-CN/plugin/iso-week) 插件 ) |
| wo       | 1st 2nd ... 52nd 53rd | 带序号周数 ( 依赖 [WeekOfYear](https://dayjs.gitee.io/docs/zh-CN/plugin/week-of-year) 插件 ) |
| gggg     | 2017                  | 按周计算的年份 ( 依赖 [WeekYear](https://dayjs.gitee.io/docs/zh-CN/plugin/week-year) 插件 ) |
| GGGG     | 2017                  | ISO 按周计算的年份 ( 依赖 [IsoWeek](https://dayjs.gitee.io/docs/zh-CN/plugin/iso-week) 插件 ) |
| z        | EST                   | UTC 偏移量的缩写 ( 依赖 [Timezone](https://dayjs.gitee.io/docs/zh-CN/plugin/timezone) 插件 ) |
| zzz      | Eastern Standard Time | UTC 偏移量的全名 ( 依赖 [Timezone](https://dayjs.gitee.io/docs/zh-CN/plugin/timezone) 插件 ) |

## ArraySupport

ArraySupport 扩展了 dayjs(), dayjs.utc API 以支持数组参数。

```javascript
var arraySupport = require("dayjs/plugin/arraySupport");
dayjs.extend(arraySupport);

dayjs([2010, 1, 14, 15, 25, 50, 125]);
dayjs.utc([2010, 1, 14, 15, 25, 50, 125]);
```

## BadMutable

Day.js 被设计成不可变的对象，但是为了方便一些老项目实现对 moment.js 的替换，可以使用🚨 BadMutable 🚨插件让 Day.js 转变成可变的对象

在绝大多数项目中 **不推荐**使用这个插件。

当使用这个插件后，所有的 setter 都会更新当前实例

```javascript
var badMutable = require('dayjs/plugin/badMutable')
dayjs.extend(badMutable)
// with 🚨 BadMutable 🚨 plugin
const today = dayjs()
today.add(1, 'day')
console.log(today) // update itself, value will be tomorrow
```

## BigIntSupport

BigIntSupport 扩展 dayjs(), dayjs.unix API 以支持 [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) 参数

```javascript
var bigIntSupport = require("dayjs/plugin/bigIntSupport");
dayjs.extend(bigIntSupport);

dayjs(BigInt(1666310421101));
dayjs.unix(BigInt(1666311003));
```

## DayOfYear

DayOfYear 增加了 .dayOfYear() API 返回一个 number 来表示 Dayjs 的日期是年中第几天，或设置成是年中第几天

```javascript
var dayOfYear = require('dayjs/plugin/dayOfYear')
dayjs.extend(dayOfYear)

dayjs('2010-01-01').dayOfYear() // 1
dayjs('2010-01-01').dayOfYear(365) // 2010-12-31
```

## DevHelper

DevHelper 可以在您使用 Day.js 时显示一些提示和警告方便开发。

注意，您可以将 process.env.NODE_ENV 设置为 production 以禁用您的生产环境中的DevHelper。 如果您启用了像UglifyJS这样的 JavaScript 优化工具，它可以自动从生产包中移除此插件来减小打包体积。

```javascript
var devHelper = require('dayjs/plugin/devHelper')

dayjs.extend(devHelper)
```

您也可自行实现按需加载此插件

```javascript
if (isInDevelopment) {
  // load DevHelper plugin like above
}
```

## Duration

Duration 增加了 .duration .isDuring API 来支持时间长度

```javascript
var duration = require('dayjs/plugin/duration')
dayjs.extend(duration)

dayjs.duration(100)
```

## IsBetween

IsBetween 增加了 .isBetween() API 返回一个 boolean 来展示一个时间是否介于两个时间之间

```javascript
var isBetween = require('dayjs/plugin/isBetween')
dayjs.extend(isBetween)

// 如果使用年份对比 `year` 则传入第三个参数
dayjs('2010-10-20').isBetween('2010-10-19', dayjs('2010-10-25'), 'year')

// 第四个参数是两个字符 '[' 表示包含, '(' 表示不包含
// '()' 不包含开始和结束的日期 (默认)
// '[]' 包含开始和结束的日期
// '[)' 包含开始日期但不包含结束日期
// 例如，当想包含开始的日期作为比较依据，你应该使用“day”作为第三个参数。
dayjs('2016-10-30').isBetween('2016-01-01', '2016-10-30', 'day', '[)')
```

## IsLeapYear

IsLeapYear 增加了 .isLeapYear API 返回一个 boolean 来展示一个 Day.js 对象的年份是不是闰年

```javascript
var isLeapYear = require('dayjs/plugin/isLeapYear')
dayjs.extend(isLeapYear)

dayjs('2000-01-01').isLeapYear() // true
```

## IsSameOrAfter

IsSameOrAfter 增加了 .isSameOrAfter() API 返回一个 boolean来展示一个时间是否和一个时间相同或在一个时间之后

```javascript
var isSameOrAfter = require('dayjs/plugin/isSameOrAfter')
dayjs.extend(isSameOrAfter)

dayjs('2010-10-20').isSameOrAfter('2010-10-19', 'year')
```

## IsSameOrBefore

IsSameOrBefore 增加了 .isSameOrBefore() API 返回一个 boolean 来展示一个时间是否和一个时间相同或在一个时间之前

```javascript
var isSameOrBefore = require('dayjs/plugin/isSameOrBefore')
dayjs.extend(isSameOrBefore)

dayjs('2010-10-20').isSameOrBefore('2010-10-19', 'year')
```

## IsToday

IsToday 增加了 .isToday() API 来判断当前 Day.js 对象是否是今天

```javascript
var isToday = require('dayjs/plugin/isToday')

dayjs.extend(isToday)

dayjs().isToday() // true
```

## IsTomorrow

IsTomorrow 增加了 .isTomorrow() API 来判断当前 Day.js 对象是否是明天

```javascript
var isTomorrow = require('dayjs/plugin/isTomorrow')

dayjs.extend(isTomorrow)

dayjs().add(1, 'day').isTomorrow() // true
```

## IsYesterday

IsYesterday 增加了 .isYesterday() API 来判断当前 Day.js 对象是否是昨天

```javascript
var isYesterday = require('dayjs/plugin/isYesterday')

dayjs.extend(isYesterday)

dayjs().add(-1, 'day').isYesterday() // true
```

## IsoWeek

IsoWeek 添加 .isoWeek() API 以获取或设置年度的 ISO 周数。 并添加 .isoWeekday() 获取或设置一周的 ISO 日和 isoWeekYear() 获取ISO 周年，并扩展 .startOf .endOf APIs 支持单位 isoWeek

```javascript
var isoWeek = require('dayjs/plugin/isoWeek')

dayjs.extend(isoWeek)

dayjs().isoWeek()
dayjs().isoWeekday()
dayjs().isoWeekYear()
```

## IsoWeeksInYear

IsoWeeksInYear 增加了 .isoWeeksInYear() API 返回一个 number 来得到依据 ISO week 标准一年中有几周

这依赖 [IsLeapYear](https://dayjs.gitee.io/docs/zh-CN/plugin/is-leap-year)插件，才能正常运行

```javascript
var isoWeeksInYear = require('dayjs/plugin/isoWeeksInYear')
var isLeapYear = require('dayjs/plugin/isLeapYear') // dependent on isLeapYear plugin
dayjs.extend(isoWeeksInYear)
dayjs.extend(isLeapYear)

dayjs('2004-01-01').isoWeeksInYear() // 53
dayjs('2005-01-01').isoWeeksInYear() // 52
```

## LocaleData

LocaleData 增加了 dayjs().localeData API 来提供本地化数据。

```javascript
var localeData = require('dayjs/plugin/localeData')
dayjs.extend(localeData)

dayjs().localeData()
```

支持的方法：

```javascript
dayjs.months()
dayjs.monthsShort()
dayjs.weekdays()
dayjs.weekdaysShort()
dayjs.weekdaysMin()
dayjs.longDateFormat('L')

globalLocaleData = dayjs.localeData()
globalLocaleData.firstDayOfWeek()
globalLocaleData.months()
globalLocaleData.monthsShort()
globalLocaleData.weekdays()
globalLocaleData.weekdaysShort()
globalLocaleData.weekdaysMin()
globalLocaleData.longDateFormat('L')

globalLocaleData.months(dayjs())
globalLocaleData.monthsShort(dayjs())
globalLocaleData.weekdays(dayjs())
globalLocaleData.weekdaysShort(dayjs())
globalLocaleData.weekdaysMin(dayjs())
globalLocaleData.meridiem()
globalLocaleData.ordinal()

instanceLocaleData = dayjs().localeData()
instanceLocaleData.firstDayOfWeek()
instanceLocaleData.months()
instanceLocaleData.monthsShort()
instanceLocaleData.weekdays()
instanceLocaleData.weekdaysShort()
instanceLocaleData.weekdaysMin()
instanceLocaleData.longDateFormat('L')
instanceLocaleData.meridiem()
instanceLocaleData.ordinal()
```

## LocalizedFormat

LocalizedFormat 扩展了 dayjs().format API 以支持更多本地化的长日期格式。

```javascript
var localizedFormat = require('dayjs/plugin/localizedFormat')
dayjs.extend(localizedFormat)

dayjs().format('L LT')
```

[支持的本地化格式列表](https://dayjs.gitee.io/docs/zh-CN/display/format#list-of-localized-formats)

## MinMax

MinMax 增加了 .min .max API 返回一个 dayjs 来比较传入的 Day.js 实例的大小。它接受传入多个 Day.js 实例或一个数组

```javascript
var minMax = require('dayjs/plugin/minMax')
dayjs.extend(minMax)

dayjs.max(dayjs(), dayjs('2018-01-01'), dayjs('2019-01-01'))
dayjs.min([dayjs(), dayjs('2018-01-01'), dayjs('2019-01-01')])
```

## ObjectSupport

ObjectSupport 扩展了 dayjs(), dayjs.utc, dayjs().set, dayjs().add, dayjs().subtract API 以支持传入对象参数

```javascript
var objectSupport = require("dayjs/plugin/objectSupport");
dayjs.extend(objectSupport);

dayjs({
  year: 2010,
  month: 1,
  day: 12
});
dayjs.utc({
  year: 2010,
  month: 1,
  day: 12
});
dayjs().set({ year: 2010, month: 1, day: 12 })
dayjs().add({ M: 1 })
dayjs().subtract({ month: 1 })
```

## PluralGetSet

PluralGetSet 增加了复数形式的 API .milliseconds(), .seconds(), .minutes(), .hours(), .days(), .weeks(), .isoWeeks(), .months(), .quarters(), .years(), .dates()

```javascript
var pluralGetSet = require('dayjs/plugin/pluralGetSet')
dayjs.extend(pluralGetSet)

dayjs().millisecond()
dayjs().milliseconds()
```

## QuarterOfYear

QuarterOfYear 增加了 .quarter() API 返回当前实例是哪个季度，并扩展了 .add .subtract .startOf .endOf API 来支持 quarter 季度单位

```javascript
var quarterOfYear = require('dayjs/plugin/quarterOfYear')
dayjs.extend(quarterOfYear)

dayjs('2010-04-01').quarter() // 2
dayjs('2010-04-01').quarter(2)
```

## RelativeTime

RelativeTime 增加了 .from .to .fromNow .toNow 4 个 API 来展示相对的时间 (e.g. 3 小时以前).

```javascript
var relativeTime = require('dayjs/plugin/relativeTime')
dayjs.extend(relativeTime)

dayjs().from(dayjs('1990-01-01')) // 31 年后
dayjs().from(dayjs('1990-01-01'), true) // 31 年
dayjs().fromNow()

dayjs().to(dayjs('1990-01-01')) // 31 年前
dayjs().toNow()
```

### 距离现在的相对时间 .fromNow(withoutSuffix?: boolean)

返回 string 距离现在的相对时间

### 距离 X 的相对时间 .from(compared: Dayjs, withoutSuffix?: boolean)

返回 string 距离 X 的相对时间

### 到现在的相对时间 .toNow(withoutSuffix?: boolean)

返回 string 到现在的相对时间

### 到 X 的相对时间 .to(compared: Dayjs, withoutSuffix?: boolean)

返回 string 到 X 的相对时间

## ToArray

ToArray 增加了 .toArray() API 来返回包含时间数值的 array

```javascript
var toArray = require('dayjs/plugin/toArray')
dayjs.extend(toArray)

dayjs('2019-01-25').toArray() // [ 2019, 0, 25, 0, 0, 0, 0 ]
```

## ToObject

ToObject 增加了 .toObject() API 来返回包含时间数值的 object

```javascript
var toObject = require('dayjs/plugin/toObject')
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

## UpdateLocale

UpdateLocale 增加了 .updateLocale API 来更新语言配置的属性

```javascript
var updateLocale = require('dayjs/plugin/updateLocale')
dayjs.extend(updateLocale)

dayjs.updateLocale('en', {
  months : String[]
})
```

## weekOfYear

WeekOfYear 增加了 .week() API 返回一个 number 来表示 Day.js 的日期是年中第几周

```javascript
var weekOfYear = require('dayjs/plugin/weekOfYear')
dayjs.extend(weekOfYear)

dayjs('2018-06-27').week() // 26
dayjs('2018-06-27').week(5) // 设置周
```

## WeekYear

WeekYear 增加了 .weekYear() API 来获取基于当前语言的按周计算的年份。

```javascript
var weekYear = require('dayjs/plugin/weekYear') // dependent on weekOfYear plugin
var weekOfYear = require('dayjs/plugin/weekOfYear')
dayjs.extend(weekOfYear)
dayjs.extend(weekYear)

dayjs().weekYear()
```

## Weekday

WeekDay 增加了 .weekday() API 来获取或设置当前语言的星期。

```javascript
var weekday = require('dayjs/plugin/weekday')
dayjs.extend(weekday)

// 当星期天是一周的第一天
dayjs().weekday(-7); // 上个星期天
dayjs().weekday(7); // 下个星期天

// 当星期一是一周的第一天
dayjs().weekday(-7) // 上个星期一
dayjs().weekday(7) // 下个星期一
```