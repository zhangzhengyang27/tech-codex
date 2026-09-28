---
title: Seaborn 与交互式图表
description: 使用 Seaborn 快速绘制统计图表，并用 Plotly 实现可交互的可视化。
version: 2.0
author: 文档维护组
created: 2026-08-09
updated: 2026-08-12
status: 正式
category: Python

---
# Seaborn 与交互式图表

现阶段随着数据分析的蓬勃发展，人们基于 matplotlib 开发了新一代更好用的绘图工具包：seaborn。本节介绍如何使用 seaborn，用更简洁的代码绘制更漂亮的曲线。

## 初识 seaborn

seaborn 并不是一套全新的工具包，而是基于 matplotlib 进行了扩展，在使用的时候仍然是和 matplotlib 的函数们配合使用的。

使用 seaborn 的主要方式有两种：

- 只是使用 seaborn 的样式，但仍然使用 matplotlib 的函数；
- seaborn 的全新函数。

下面分别进行介绍。

### 安装 seaborn

安装命令为：conda install seaborn。安装过程中如果提示是否继续，输入 y 回车，完成安装。

另外，plotly 是用来绘制交互式图表的工具包。seaborn 的章节也会用到 plotly 的数据集，所以一并安装 plotly。方法同上，安装命令为：conda install plotly。

### 比较 matplotlib 和 seaborn 的样式

首先，用一个简单的例子来看一下 seaborn 和 matplotlib 样式上的区别。

之后导入需要使用的工具包：

```
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import numpy as np

```

以之前画过的直方图为例，首先是准备一个正态分布的数据源：

```
np.random.seed(100)
hints = np.random.normal(5, 10, 1000)

```

然后直接使用默认的样式来画出直方图：

```
figure1 = plt.figure(figsize = (10, 5))
figure1.add_subplot(1,1,1)
plt.hist(hints, bins=50)
plt.show()

```

执行之后，图形如下（原书此处配有插图，未随迁移入库）。

这个图之前就已经画出来过，可以说 matplotlib 如果不额外进行样式指定的话，图像的可读性还是比较差的。

现在，来试一下用 seaborn 的样式改造这个直方图。只需要设置激活 seaborn 的样式，然后用 matplotlib 的函数，这样直方图就自动被应用上 seaborn 样式了。

激活 seaborn 样式的代码如下：

```
sns.set()

```

执行完上述 Cell 之后，重新执行一遍刚才画直方图的代码，画出来的图形如下（原书此处配有插图，未随迁移入库）。可以看到，在什么都不做的时候， seaborn 画的图明显更好看一些。

## seaborn 常见曲线的绘制

下面来学习 seaborn 常见的几种曲线的绘制方式。为了方便演示，选择行业通用的 iris 数据集作为例子。

### 数据集准备

[iris 数据集](https://baike.baidu.com/item/IRIS/4061453?fr=aladdin)是常见的用来做数据分析以及分类分析的数据集。有 150 个数据样本，每个样本包含五个字段（原书此处配有插图，未随迁移入库）。iris 数据集简单、易于分析，且容易建立出根据花瓣和花萼的长宽来对花的类型进行分类的模型，所以被广泛应用于数据分析的各类教学中。掌握 iris 数据集对数据分析也是非常有帮助的。

plotly 数据包中有现成的 iris 数据，所以并不需要从 csv 中读取。代码如下：

```
import plotly.express as px
df_iris = px.data.iris()
df_iris

```

输出如下：

可以看到，DataFrame 的内容和描述基本一致，只是多了一个 species_id。这个就是分类的 id，可以不用理会。

### 折线图

seaborn 区别于原生 matplotlib 最明显的一点，就是 seaborn 和 pandas 进行了**深度的整合**，使得画图的代码大幅减少。比如画出花瓣宽度的折线图，只需要一行代码：

```
df_iris.petal_width.plot()

```

输出如下：

甚至没有调用任何的绘图代码——pandas 给 Series 和 DataFrame 对象内置了 plot 方法，直接调用数据源对象的 plot 方法就可以完成绘图。

一般调用 DataFrame 或者 Series 的 plot 方法时，横轴默认使用 DataFrame 的 index 作为横轴的数据源。甚至可以直接调用 DataFrame 的 plot 方法，来一次性地将所有列绘制在图表上。

代码如下：

```
df_iris.plot()

```

输出如下：

可以看到，DataFrame 中所有字段的曲线都被画在了画布上，并且自动都有图例来显示不同曲线对应的哪个字段。seaborn 的好处就是，往往不需要多少特别的设置，就能获得不错的结果。

### 直方图

下面来学习直方图，比如统计记录中花瓣宽度的分布图。

同样只需要一行代码就可以，如下所示：

```
df_iris.petal_width.plot.hist()

```

输出之后显示：

（原书此处配有运行截图，未随迁移入库，略）

pandas 还提供了 plot 访问器（plot 对象），如上述代码就是调用了 plot 对象的 hist 方法，来实现直方图的绘制。

### 核密度图

核密度图是数据分析中非常常见的一种分析手段，其功能类似于直方图，也是用于观察数据分布的工具之一。核密度图展示的是概率分布，直方图展示的是频率，有时候分析的数据往往是有限的，有的数据区域没有直方图画出来的时候，不代表一定不存在，只是可能出现概率比较低，所以没有被收录到数据集而已。核密度图就能够比较好地表示这类信息。

核密度的估计是直方图的一种自然扩展，可以认为是平滑版的直方图。核密度曲线是一种概率密度曲线，曲线下的面积是 1，y 轴上的单位通常是小于 1 的概率分布值。

seaborn 提供 kdeplot 方法来绘制核密度图。还是以之前的花瓣宽度为例，花瓣宽度的核密度图，代码如下：

```
sns.kdeplot(df_iris.petal_width, fill=True)

```

输出如下：

可以看到，从形状上来看，概率密度图和直方图是相对接近的。

### 直方核密度图

从上面的例子中可以发现，直方图和核密度图往往是一起分析的。seaborn 提供了一个 histplot 方法，可以在绘制直方图时同时也画出对应的概率密度曲线。

代码如下：

```
sns.histplot(df_iris.petal_width, kde=True)

```

输出

（原书此处配有运行截图，未随迁移入库，略）

### 二维核密度图

之前绘制的都是单一变量的核密度图，seaborn 的 kdeplot 函数还支持绘制二维的核密度图，就是在一张图上体现两个变量的概率分布。二维的核密度图可以帮助从概率分布的角度来分析两个变量的相关性。

这时候只需要分别指定 data 参数， x 参数和 y 参数即可。来看 petal_width 和 sepal_width 两个列的概率分布。代码如下：

```
sns.kdeplot(data=df_iris, x="petal_width", y="sepal_width")

```

输出如下：

（原书此处配有运行截图，未随迁移入库，略）

直接这样看可能并不明显，加上 fill 参数，设置为 True。

```
sns.kdeplot(data=df_iris, x="petal_width", y="sepal_width", fill=True)

```

添加 fill 参数后的效果如下：

这样就能比较明显地看到颜色越深的地方，概率分布越密集。

### pairplot

除了以上常见的图形，seaborn 还提供了一种非常方便的分析相关性图表：pairplot。

pairplot 是一种特殊的图表，它能够显示 DataFrame 中字段两两之间的关系。非常适合在还不够了解数据集的时候，直接把所有字段的关系以图表的形式绘制出来，做第一步的探索。比如拿到一个房价数据集，有单价、面积、地段等，单价和面积可能有关系，面积和地段可能也有关系，与其一个个去看特征的相关性，直接把整个表的 pairplot 画出来，就能够一目了然地看到它们之间的关系。

以 iris 数据集为例，查看特征两两之间的关系，因为要绘制图表，所以只有数字类型的特征会被用来画图，species_id 这一列可能会导致问题，因为本质这是一个类别的标识（只有三个取值）。所以第一步，首先将这一列删除。

```
df_iris = df_iris.drop(columns=["species_id"])

```

第二步，绘制 iris 数据集的 pairplot。

```
sns.pairplot(df_iris, hue="species")

```

输出如下：

可以看到，输出了非常丰富的一个图标，横轴和纵轴都是各个特征。每个子图都代表某两个特征的散点图。比如第四行第四列的图，petal_length 和 petal_width，从图上就能很明显看出这两个特征是正相关的。在对角线上代表同一个特征的比较，比如第一行第一列，第二行第二列，都是同一个特征的相关性，但同一个特征不存在相关性一说，所以就以直方图来表示了。

当然，还可以更进一步。因为 species 字段是字符串内容，没有画在里面，但把图像中不同的 species 数据用不同的颜色标出来，也能够看出很多额外的信息。

在 pairplot 中，如果图像根据某个字段进行分类，只需要指定 hue 参数即可。代码如下：

```
sns.pairplot(df_iris, hue="species")

```

输出如下：

这次的 pairplot 相比纯特征比较，表示出了更多的特征，比如 setosa 类型（蓝色）数据就非常容易区别，比如从第三行第一列的图就能发现，简单通过 petal_length 就能够把 setosa 类型的花分类出来。

对于数据量不是很大的数据集来说，直接通过 pairplot，一次性地把所有相关的特征数据绘制出来，是非常有效的分析手段。

## 绘制可交互的图表

通过前面内容的学习，可以感受到 seaborn 的强大本领，它能够用非常少的代码来绘制出更好看、丰富的图表。

下面更近一步，介绍一种更先进的图表绘制技术：可交互的图表。

在之前工具安装的环节，就提到过绘制可交互图表的工具叫 plotly，之前已经安装完毕了。plotly 支持的可交互图表的类型非常多，教程无法一一列举。

下面举两个比较有代表性的例子，来演示可交互图表的基础以及所支持的交互方式。

首先，先导入 plotly 工具包：

```
import plotly.express as px
from plotly.offline import init_notebook_mode, iplot, plot
import plotly.graph_objs as go

```

### 绘制可交互图表

可交互散点图的绘制非常简单，只需要调用 px 模块的 scatter 函数，构造出图表对象。然后调用图表对象的 show 方法即可。

以绘制 iris 数据集中 sepal_width 和 sepal_length 的特征为例：

```
# 指定 x/y 轴的数据源，以及基于哪一列做颜色区分，这里选择用种类一类来做颜色的区分
fig = px.scatter(df_iris, x="sepal_width", y="sepal_length", color="species")
fig.show()

```

输出如下：

（原书此处配有运行截图，未随迁移入库，略）

整体绘图方式和 seaborn 差别并不大。

### plotly 基本交互要素

绝大多数 plotly 图像的交互形式都是相对确定的，一般都分为三个可操作区：

（1）操作区 1：图表区域

操作区 1 就是图表的曲线绘制的区域，这个操作区里 plotly 支撑两个主要的操作方式。首先是鼠标悬停在数据点上方时，可以显示该数据点的相关信息，比如对应 x 轴和 y 轴的点，以及对应的 species。

第二个交互方式是可以鼠标单击拖拽，可以将局部区域放大。

拖拽期间的效果如下（原书此处配有插图，未随迁移入库）

拖拽结束后，拖拽选择的区域被放大，效果如下（原书此处配有插图，未随迁移入库）：

可以看到，图像已经变成刚才鼠标拖动的选择框区域。

（2）操作区 2：图例区域

操作区 2 就是之前讲过的图例区域，对于 plotly 绘制的曲线，图例都是可以点击的。点击图例可以控制显示或者隐藏某个分类，比如点击 setosa 这个图例，可以看到 setosa 类别的蓝色点隐藏了，图像里只剩下另外两个类别的数据点，如下（原书此处配有插图，未随迁移入库）。

对于隐藏的图例，再次点击可以重新显示。通过这个功能，把暂时不感兴趣的数据点隐藏，帮助聚焦在当前看的数据类别，非常好用。

（3）操作区 3：工具栏区

操作区 3 是顶部工具栏的区域，从左到右的功能依次为：

- 保存 JPG
- 放大缩小
- 移动
- 矩形选择（就是之前的鼠标拖动矩形框）
- 套索选择（可以支持选不规则的曲线区域）
- 放大
- 缩小
- 自动放缩
- 重置曲线
- 显示辅助线
- 悬浮框显示一个点
- 悬浮框显示两个点

这里选择性地讲几个比较常用的操作。

第一个是辅助线，点击打开之后。当鼠标移动到具体的数据点上时，会有线条标注出该数据点在 x 轴和 y 轴的位置，如下（原书此处配有插图，未随迁移入库）。

这个功能在分析数据点和附近区域关系时非常方便。

### 常见的 plotly 图形的绘制

plotly 图形的绘制和 seaborn 大同小异，无非就是指定数据源 x 和 y 即可，简单举几个例子。

（1）气泡图

气泡图就是点的大小不一的散点图，就是用 scatter 函数的 size 参数，来指定数据点的大小。这样就能在散点图的基础上反映出数据点的一些其他维度信息。

比如拿刚才的散点图为例：

绘制了 sepal_width 和 sepal_length 的关系图，这个时候如果想看额外的特征，比如 petal_width 和它们的关系，将其指定为 size 的参数，代码如下：

```
fig = px.scatter(df_iris, x="sepal_width", y="sepal_length", color="species", size="petal_width")
fig.show()

```

输出如下：

这样上图里的数据点就变成了大小不一的气泡，大小则是由 petal_width 来决定。从图里不难看出，似乎 virginica 类型的鸢尾花的 petal_width 比较大。

（2）折线图

plotly 的折线图用的是 line 函数，用法如下：

```
fig1 = px.line(df_iris[["petal_width","petal_length"]])
fig1.show()

```

输出如下：

（原书此处配有运行截图，未随迁移入库，略）

（3）直方图

直方图则使用 histogram 函数，用法如下：

```
fig2 = px.histogram(df_iris[["sepal_length"]])
fig2.show()

```

输出如下：

（原书此处配有运行截图，未随迁移入库，略）

## 小结

本节关于 seaborn 和 plotly 的一些基本知识就介绍完毕了。一共学习了三套绘图的技术：matplotlib、seaborn 和 plotly。

那实际项目中该如何选择呢？ 一般情况下，可以遵循以下的标准：

- 简单绘制图表即可——使用 seaborn；
- 需要比较多的定制、子图的排布等——使用 seaborn 的样式 + matplotlib 绘图；
- 绘制的图表信息量较大，希望用户可以进行交互——使用 plotly。
下面简单回顾一下本节所学习的内容。

首先是 seaborn：

- 使用 sns.set() 激活 seaborn 的样式；
- 使用 DataFrame / Series 的 plot 方法绘制折线图，plot.hist 方法绘制直方图；
- 使用 sns.kdeplot 绘制核密度图；
- 使用 sns.histplot 配合 kde 参数，来将直方图和核密度图同时绘制；
- 使用 pairplot 一次性绘制所有特征两两关系大图。

之后是 plotly，主要包括：

- 使用 px.data.iris()，直接加载 iris 数据集；
- 使用 px.scatter，绘制散点图，增加 size 属性则可以绘制气泡图；
- plotly 图表的基本操作；
- 使用 px.line 绘制折线图；
- 使用 px.histogram 绘制直方图。
至此，数据可视化的知识部分就基本讲完了，下一篇将以一个实战案例来演示数据可视化是如何帮助做数据分析的。

课后作业：

针对 iris 数据集，绘制所有山鸢尾四个特征的直方核密度图。

---

答案如下：

```
sns.histplot(df_iris[df_iris["species"]=="setosa"], kde=True)

```

输出如下：

（原书此处配有运行截图，未随迁移入库，略）

## 版本差异（数据科学栈 → 当前版本）

| 库 | 本文编写时 | 当前稳定版 | 升级要点 |
|----|-----------|-----------|---------|
| Python | 3.8-3.12 | 3.14 | 3.12+ 起性能显著提升；3.14 PEP 649/750 |
| NumPy | 1.x/2.0 | 2.3.x | `np.float_` 等别名移除；NEP 50 类型提升 |
| Pandas | 1.x/2.x | 3.0.x | Copy-on-Write 默认开启；`inplace` 移除；字符串 dtype 变化 |
| Matplotlib | 3.x | 3.x 稳定版 | API 兼容，样式更新 |
| Seaborn | 0.12/0.13 | 0.13.x | API 稳定 |
| scikit-learn | 1.x | 1.7.x | API 稳定，新算法持续加入 |

> 本文讲解的数据分析流程（读取→清洗→分析→可视化）与核心 API 在最新版本中成立；升级时重点关注 Pandas 3.0 的 Copy-on-Write 与 NumPy 2.x 的类型变化。
