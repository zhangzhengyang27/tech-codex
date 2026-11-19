---
title: "sort 方法的基本使用"
description: "讲解 JS 数组 sort 方法的基本用法与比较函数语义，并结合 V8 源码剖析其底层排序策略：小数组插入排序、大数组三路快排与哨兵元素选择。"
category: JavaScript

---

# sort 方法的基本使用

## 概念说明

数组排序在日常开发中经常出现。除了手写排序算法之外，JavaScript 原生提供了数组的 `sort` 方法。本文介绍 `sort` 方法的基本用法与比较函数语义，并结合 V8 源码剖析其底层排序实现，帮助理解 JS 排序问题的设计思路。

核心问题有两个：

- `sort` 方法用了哪种排序思路？
- `sort` 方法参数中的比较函数是什么含义？

## sort 方法的基本使用

`sort` 方法对数组元素进行排序，**默认排序顺序是先将元素转换为字符串，再进行排序**。语法：

> arr.sort([compareFunction])

`compareFunction` 用来指定按某种顺序进行排列的函数；如果省略不写，元素按照转换为字符串的各个字符的 Unicode 位点进行排序：

```javascript
const months = ['March', 'Jan', 'Feb', 'Dec'];
months.sort();
console.log(months);
// ["Dec", "Feb", "Jan", "March"]

const array1 = [1, 30, 4, 21, 100000];
array1.sort();
console.log(array1);
// [1, 100000, 21, 30, 4]
```

从执行结果可以看出：不加参数时，第二段代码中 `21` 会排在 `4` 的前面——按数值从小到大的逻辑行不通。要按数值升序或降序排序，需要显式传入比较函数：

```javascript
const array1 = [1, 30, 4, 21, 100000];
array1.sort((a, b) => b - a);
console.log(array1);    // [100000, 30, 21, 4, 1]
```

```javascript
const array1 = [1, 30, 4, 21, 100000];
array1.sort((a, b) => a - b);
console.log(array1);    // [1, 4, 21, 30, 100000]
```

指明 `compareFunction` 参数后，数组按照调用该函数的返回值排序，`a` 和 `b` 是两个将要被比较的元素：

- 如果 `compareFunction(a, b)` 小于 0，`a` 会被排列到 `b` 之前
- 如果 `compareFunction(a, b)` 等于 0，`a` 和 `b` 的相对位置不变
- 如果 `compareFunction(a, b)` 大于 0，`b` 会被排列到 `a` 之前

## sort 方法的底层实现

`sort` 方法在 V8 内部是相对复杂的算法，针对很多边界情况结合排序算法做了反复优化。下面根据 V8 源码的思路，拆解其中的设计（源码摘要地址：[V8 源码 sort 排序部分](https://github.com/v8/v8/blob/98d735069d0937f367852ed968a33210ceb527c2/src/js/array.js#L709)）。

分析源码之前需要先回顾**插入排序**和**快速排序**的核心逻辑。

### 底层排序策略结论

当排序的元素个数是 n 时，V8 旧版实现采用以下策略：

> ⚠️ **注意**：以下分析基于 V8 在 2018 年之前的旧版排序实现（Chrome 70 之前）。此后 V8 已改用 Torque 实现的 **TimSort**（稳定排序，Firefox/Safari 等主流引擎同样如此），具体实现细节已不同；但"小数组用插入排序、大数组用快排并优化哨兵元素"的混合策略思想仍然值得学习。

- 当 n ≤ 10 时，采用插入排序
- 当 n > 10 时，采用三路快速排序
- 当 10 < n ≤ 1000 时，采用中位数作为哨兵元素
- 当 n > 1000 时，每隔 200~215 个元素挑出一个元素，放到一个新数组中，然后对它排序，找到中间位置的数，以此作为中位数

### 为什么元素个数少时采用插入排序

插入排序理论上平均时间复杂度为 O(n^2)，快速排序平均为 O(nlogn)。但这只是平均情况的估算，两者都有最好的情况——插入排序在最好情况下时间复杂度是 O(n)。

实际情况中两者的算法复杂度前面都会有一个系数：当 n 足够小时，快速排序 nlogn 的优势越来越小；插入排序在 n 足够小时反而会超过快排。插入排序经过优化后，对小数据集的排序有非常好的性能，很多时候甚至会超过快排。因此对很小的数据量，插入排序是合理的选择。

### 为什么要花大力气选择哨兵元素

快速排序的性能瓶颈在于递归深度。最坏情况是每次的哨兵都是最小元素或最大元素，此时 partition（一边是小于哨兵的元素，另一边是大于哨兵的元素）会有一边为空，递归层数达到 n，每层复杂度 O(n)，快排退化成 O(n^2) 级别。

避免的方法是让哨兵元素尽可能处于数组的中间位置，让最大或最小的情况尽可能少——这正是 V8 源码中各种优化的出发点。

### 官方实现的代码结构

V8 官方实现的 sort 排序算法代码基本结构如下：

```
function ArraySort(comparefn) {
	  CHECK_OBJECT_COERCIBLE(this,"Array.prototype.sort");
	  var array = TO_OBJECT(this);
	  var length = TO_LENGTH(array.length);
	  return InnerArraySort(array, length, comparefn);
}
function InnerArraySort(array, length, comparefn) {
  // 比较函数未传入
  if (!IS_CALLABLE(comparefn)) {
	    comparefn = function (x, y) {
	      if (x === y) return 0;
	      if (%_IsSmi(x) && %_IsSmi(y)) {
	        return %SmiLexicographicCompare(x, y);
	      }
	      x = TO_STRING(x);
	      y = TO_STRING(y);
	      if (x == y) return 0;
	      else return x < y ? -1 : 1;
	 };
  }
  function InsertionSort(a, from, to) {
    // 插入排序
    for (var i = from + 1; i < to; i++) {
	      var element = a[i];
	      for (var j = i - 1; j >= from; j--) {
	        var tmp = a[j];
	        var order = comparefn(tmp, element);
	        if (order > 0) {
	          a[j + 1] = tmp;
	        } else {
	          break;
	        }
	      }
	    a[j + 1] = element;
	 }
  }
  function GetThirdIndex(a, from, to) {   // 元素个数大于1000时寻找哨兵元素
    var t_array = new InternalArray();
	var increment = 200 + ((to - from) & 15);
	var j = 0;
	from += 1;
	to -= 1;
	for (var i = from; i < to; i += increment) {
	   t_array[j] = [i, a[i]];
	   j++;
	}
	t_array.sort(function(a, b) {
	   return comparefn(a[1], b[1]);
	});
	var third_index = t_array[t_array.length >> 1][0];
	return third_index;
  }
  function QuickSort(a, from, to) {  // 快速排序实现
        //哨兵位置
	    var third_index = 0;
	    while (true) {
	      if (to - from <= 10) {
	        InsertionSort(a, from, to); // 数据量小，使用插入排序，速度较快
	        return;
	      }
	      if (to - from > 1000) {
	        third_index = GetThirdIndex(a, from, to);
	      } else {
            // 小于1000 直接取中点
	        third_index = from + ((to - from) >> 1);
	      }
          // 下面开始快排
	      var v0 = a[from];
	      var v1 = a[to - 1];
	      var v2 = a[third_index];
	      var c01 = comparefn(v0, v1);
	      if (c01 > 0) {
	        var tmp = v0;
	        v0 = v1;
	        v1 = tmp;
	      }
	      var c02 = comparefn(v0, v2);
	      if (c02 >= 0) {
	        var tmp = v0;
	        v0 = v2;
	        v2 = v1;
	        v1 = tmp;
	      } else {
	        var c12 = comparefn(v1, v2);
	        if (c12 > 0) {
	          var tmp = v1;
	          v1 = v2;
	          v2 = tmp;
	        }
	      }
	      a[from] = v0;
	      a[to - 1] = v2;
	      var pivot = v1;
	      var low_end = from + 1; 
	      var high_start = to - 1;
	      a[third_index] = a[low_end];
	      a[low_end] = pivot;
	      partition: for (var i = low_end + 1; i < high_start; i++) {
	        var element = a[i];
	        var order = comparefn(element, pivot);
	        if (order < 0) {
	          a[i] = a[low_end];
	          a[low_end] = element;
	          low_end++;
	        } else if (order > 0) {
	          do {
	            high_start--;
	            if (high_start == i) break partition;
	            var top_elem = a[high_start];
	            order = comparefn(top_elem, pivot);
	          } while (order > 0);
	          a[i] = a[high_start];
	          a[high_start] = element;
	          if (order < 0) {
	            element = a[i];
	            a[i] = a[low_end];
	            a[low_end] = element;
	            low_end++;
	          }
	        }
	      }
          // 快排的核心思路，递归调用快速排序方法
	      if (to - high_start < low_end - from) {
	        QuickSort(a, high_start, to);
	        to = low_end;
	      } else {
	        QuickSort(a, from, low_end);
	        from = high_start;
	      }
	  }
  }
`
```

从源码可以看出完整的实现逻辑：数据量小于 10 时用插入排序；大于 10 后采用三路快排；10~1000 之间直接取中位数为哨兵元素；大于 1000 时通过 `GetThirdIndex` 采样寻找哨兵元素。关键点在于**根据数据量的大小确定使用什么排序**——时间复杂度随数据量变化，这一点需要深入理解。

## 时间复杂度对比

快速排序和插入排序在最好、最坏情况下的时间复杂度对比如下：

![插入排序与快速排序的时间复杂度对比](/js-core-images/02b5c03f655e.png)

对比可见：当 n 足够小时，最好的情况下插入排序的时间复杂度 O(n) 优于快速排序的 O(nlogn)——这解释了 V8 实现 JS 数组排序算法时，数据量较小采用插入排序的原因。

## 小结

- `sort` 方法默认将元素转换为字符串按 Unicode 位点排序；按数值排序必须传入比较函数，比较函数依据返回值的正负与零决定元素顺序
- V8 旧版实现的排序策略是混合式的：小数组插入排序（最好情况 O(n)），大数组三路快排（平均 O(nlogn)），并通过中位数或采样法优化哨兵元素，避免快排退化为 O(n^2)
- 时间复杂度不必死记硬背：不同数据量下，不代表某种排序一定比另一种快，应根据具体场景分析

---
