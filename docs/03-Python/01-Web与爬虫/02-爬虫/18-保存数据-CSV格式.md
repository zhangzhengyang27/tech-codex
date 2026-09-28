---
title: 保存数据：如何将爬取的数据保存成 CSV 格式
version: 1.0
author: 文档维护组
created: 2026-08-09
updated: 2026-08-12
status: 正式
category: Python

---
# 保存数据：如何将爬取的数据保存成 CSV 格式

本文学习数据分析领域最常见的一种文件格式：CSV 文件，然后将前文抓取到的数据保存到 CSV 文件中。

## 什么是 CSV 文件

CSV（Comma-Separated Values）是一种使用逗号分隔来实现存储表格数据的文本文件。

表格有多种存储形式，比如 Excel 格式或数据库格式。CSV 文件也可以存储表格数据，并且能够被多种软件兼容，比如 Excel 能直接打开 CSV 文件的表格，很多数据库软件也支持导入 CSV 文件。除了兼容性好之外，CSV 格式还是所有能存储表格的格式中最简单的一种。

下面以一个例子讲解 CSV 存储表格的原理。

假设有如下员工信息的表格。

![](/python-data-analysis-images/11-Cgp9HWCGW3uAdw0gAAEO7lp53XM723.png)

要存储类似上面的表格，以往只能将其输入到 Excel 中并保存为 xlsx 格式，现在尝试将其以 CSV 的格式保存。

在工作目录下新建 chapter09 文件夹，作为本节实验的目录。然后打开文本编辑器，如 Windows 下的记事本，新建空白文件。

输入以下内容，并保存为 info.csv（编码选择 ANSI），文件夹的位置选择刚才创建的 chapter09/ 中。

```
姓名,年龄,籍贯,部门
小明,22,河北,IT部
小亮,25,广东,IT部
小E,23,四川,财务部

```

保存成功后，用 Excel 打开这个文件，可以看到存储的 CSV 文件成功地在 Excel 中展示为表格。

![](/python-data-analysis-images/11-Cgp9HWCGW4iAfTk4AASFdtZ50e0408.png)

至此，CSV 格式的奥秘已经清晰，总结如下：

- 表格中的一行，对应 CSV 文件中的一行；
- 一行中不同单元格的内容，在 CSV 文件中用**逗号分隔**；
- 务必保证每行的逗号数量是一致的（对应表格中每行的单元格一致）。

在后续的数据分析任务中，CSV 文件将是存储数据的主要格式。

## Python 的 CSV 模块

了解了 CSV 文件的基本概念后，学习如何使用 Python 操作 CSV 文件。对于数据分析场景而言，最常见的操作就是读取和写入。

### 准备知识

在学习使用 Python 操作 CSV 文件之前，先学习一个 Python 常见的循环技术：遍历循环。

要逐个打印一个列表的元素，按照之前学习的循环知识，方法如下：让循环变量 i 从 0 逐步叠加到列表的长度，然后在循环体中每次取列表的第 i 个数并打印。

这种逐个处理列表中元素的行为，称为遍历。比如初始化一个数组，然后让变量 i 从 0 循环到列表的长度。

```
# 初始化一个数组
arr = [12,5,33,4,1]
# 让变量 i 从 0 循环到列表的长度
for i in range(0,len(arr)):
    # 取列表的第 i 个元素，存储在 item 中
    item = arr[i]

    # 打印 item 变量
    print(item)

```

输出结果为数组的所有数值：

```
12
5
33
4
1

```

事实上，Python 还存在一个更简便的方法来实现列表的遍历，即不用循环变量，而是直接对列表使用 for..in.. 语句，用法如下：

```
# 初始化一个数组
arr = [12,5,33,4,1]
# 直接对列表 arr 使用 for..in..，for 后面是循环变量，in 后面是列表变量
# 列表有几个元素，循环就执行多少次。
# 每次循环都从列表中取一个还没处理过的元素存储在循环变量中，然后调用循环体
for item in arr:
    print(item)

```

输出为：

```
12
5
33
4
1

```

可以看到，两种循环输出的结果是一样的，但直接的遍历循环代码量更少、更简单。遍历循环可以适用于任何类型的列表，以字符串列表为例：

```
string_arr = ["hi","hello", "你好", "aloha"]
for item in string_arr:
    print("本次循环 item 变量的值：", item)

```

上述列表中有四个字符串，使用遍历循环的方式遍历该列表，循环会执行四次：第一次执行，item 变量存储的值是 "hi"，第二次是 "hello"，以此类推。

上述代码输出为：

```
本次循环 item 变量的值： hi
本次循环 item 变量的值： hello
本次循环 item 变量的值： 你好
本次循环 item 变量的值： aloha

```

遍历循环相比之前的循环适用场景更广，比如后续会遇到一些“特殊列表”只能通过此方案去访问每个元素。

### 从 CSV 文件读取内容

下面尝试读取刚才保存的 info.csv。

打开 VS Code，新建 Notebook，并保存为 chapter09.ipynb。在第一个 cell 中，首先导入 csv 模块，输入如下代码：

```
import csv

```

要读取 CSV 文件，用到 CSV 模块中的 DictReader 类。DictReader 可以将每一行以字典的形式读出来，key 就是表头，value 就是对应单元格的内容。

具体用法如下所示，新建 Cell，输入如下代码：

```
# 通过 open 函数打开 info.csv，并将文件对象保存在 fo 中
fo = open("info.csv")
# 通过打开 CSV 文件的文件对象作为参数来创建 DictReader 类的对象，存在 reader 变量中
reader = csv.DictReader(fo)
# 调用 reader 对象的 fieldnames 属性，获取 CSV 文件中表格的表头
headers = reader.fieldnames
# 关闭文件
fo.close()
# 打印表头的信息
print(headers)

```

输出如下：

```
['姓名', '年龄', '籍贯', '部门']

```

上面的例子中，学习了 DictReader 对象的创建方法，并通过 fieldnames 属性获取了 CSV 表格的表头。

接下来，尝试获取表格的实际内容。

新建 cell，输入如下代码：

```
# 打开 info.csv
fo = open("info.csv")
# 创建 DictReader 对象
reader = csv.DictReader(fo)
# 创建列表，用于存储读到的行
row_list = []
# 使用遍历循环，直接对 reader 对象进行遍历
# 每次执行循环时，row 变量都存储了当前行的内容
for row in reader:
    # 直接将 row 变量添加到行列表中
    row_list.append(row)
# 关闭文件
fo.close()
# 打印第一行的表格数据
print(row_list[0])

```

打印的结果显示：

```
{'姓名': '小明', '年龄': '22', '籍贯': '河北', '部门': 'IT部'}

```

可以看到，拿到了第一行的内容，并且是以字典的形式。字典把每个单元格的内容和表头联系了起来，表头是 key，而具体内容就是 value。每行都是这样的一个字典，所有字典都存储在 row_list 列表中。

接下来，演示对于 row_list 列表的常见操作：打印某一行、某一列的值。

```
print("打印年龄一列的内容：")
# 遍历循环 row_list，d 为循环变量
for d in row_list:
    # 因为 d 是字典，直接打印 key 为 年龄的值即可。
    print(d["年龄"])
# 打印一个换行
print("")
print("打印第三行的内容：")
d = row_list[2]
print("姓名:", d["姓名"])
print("年龄：",d["年龄"])
print("籍贯：",d["籍贯"])
print("部门：",d["部门"])

```

输出如下：

```
打印年龄一列的内容
22
25
23
打印第三行的内容
姓名: 小E
年龄： 23
籍贯： 四川
部门： 财务部

```

### 写入 CSV 文件

在之前的例子中，写入 CSV 文件靠人工写入。下面尝试通过 Python 写入 CSV 文件。

与读取类似，Python 的 CSV 模块提供了 DictWriter 方法，使得将表格数据以字典的形式存到 CSV 文件中。

具体用法如下：

```
# 打开一个文件，假设是 info2.CSV，因为是写入，所以需要指定模式 "w"
# newline=''，在写入 CSV 时，需要指定这个参数，这个记住即可。
fo = open("info2.CSV", "w", newline='')
# 将表头存储在一个列表中
header = ["姓名", "年龄", "籍贯", "部门"]
# 创建一个 DictWriter 对象，第二个参数就是上面创建的表头
writer = csv.DictWriter(fo, header)
# 写入表头
writer.writeheader()
# 写入一行记录，以字典的形式，key 需要和表头对应。
writer.writerow({"姓名": "小刚", "年龄":"28", "籍贯":"福建", "部门":"行政部"})
# 关闭写入的文件
fo.close()

```

上述代码的关键点就在于，创建了 DictWriter 后，需要首先调用 writeheader 来写入表头，然后再调用 writerow 来写入行。

执行上述代码之后，并不会有内容输出，但是 chapter09 文件夹下会多出一个 Info2.csv，用 Excel 打开后，如下图所示。

![](/python-data-analysis-images/11-CioPOWCGW5-AAHi1AAUBviplMwg738.png)

可以看到，表头和记录已经成功写入 CSV 文件中。

DictWriter 除了提供 writerow 方法来将单个字典保存为 CSV 表格中的一行，还提供了 writerows 方法来一次性地保存多行的内容。

前面将手工建的 CSV 表格的内容存储在 row_list 变量中，现在尝试使用 writerows 方法来一次性写入多条记录。

新建 Cell，输入以下代码：

```
# 新打开一个 info3.CSV 文件
fo = open("info3.CSV", "w", newline='')
# 将表头存储在一个列表中
header = ["姓名", "年龄", "籍贯", "部门"]
# 创建一个 DictWriter 对象，第二个参数就是上面创建的表头
writer = csv.DictWriter(fo, header)
# 将小刚的记录插入到 row_list 中
row_list.append({"姓名": "小刚", "年龄":"28", "籍贯":"福建", "部门":"行政部"})
# 写表头
writer.writeheader()
# 调用 writerows 方法，一次性写多个字典（一个字典列表）到 CSV 文件中
writer.writerows(row_list)
# 关闭文件
fo.close()

```

执行完毕后，chapter09/ 下生成了新的 info3.csv，打开后如下图所示，包含了一开始的三条记录，以及插入的“小刚”的记录。

![](/python-data-analysis-images/11-CioPOWCGW-WAP4BrAAU43clX1Mg547.png)

## 实现煎蛋新闻列表保存到 CSV 文件中

下面将前文中过滤出来的新闻列表写入 CSV 文件中。在前文中，课程内容中获取了煎蛋的新闻标题，在课后作业中获取了新闻发布的时间。

本文的内容是将每篇新闻的这两个内容保存到 CSV 中，相当于一篇新闻就是一行，每一行有两列，一个是新闻标题，一列是发布时间。对应的表头就是：标题、发布时间。

### （1）数据准备

第一步，将 chapter08 文件夹中的 jiandan.html 拷贝到 chapter09 文件夹中。

第二步，将第 08 讲中的抽取标题的代码整理成几个函数，方便后续调用。这里再简单回顾一下前文中抓取新闻的步骤：

- 打开网页文件，读出内容，并创建对应的 BeautifulSoup 对象；
- 找到所有包含新闻的 div 元素列表（class=indexs 的 div）；
- 从上述 div 元素中抽取出标题；
- 从上述 div 元素中抽取出时间。

把上述四个操作整理为四个函数。

**1**. 首先实现创建 BeautifulSoup 对象的函数。

```
from bs4 import BeautifulSoup
# 输入参数为要分析的 html 文件名，返回值为对应的 BeautifulSoup 对象
def create_doc_from_filename(filename):
    fo = open(filename, "r", encoding='utf-8')
    html_content = fo.read()
    fo.close()
    doc = BeautifulSoup(html_content, "html.parser")
    return doc

```

函数的具体实现在 chapter08 讲过，这里不再赘述。按 shift + enter 执行，这样后续就可以使用该函数。

**2**. 实现定位包含新闻的 div 元素的列表函数。

```
# 输入参数是 BeautifulSoup 对象，返回包含新闻的 div 元素列表
def find_index_labels(doc):
    index_labels = doc.find_all("div", class_="indexs")
    return index_labels

```

继续按 shift + enter 执行。

**3**. 实现新闻标题的抽取函数。

这里直接复制前文中的 get_title 函数即可。

```
# 从第一次 find_all 获取的标签对象中抽取标题
def get_title(label_object):
    # 从刚才的参数传入的标签对象中过滤出所有 target=_blank 的 a 标签
    a_labels = label_object.find_all("a",target="_blank")
    # 取第一个标签对象
    my_label = a_labels[0]
    # 将标签的文字内容作为返回值返回
    return my_label.get_text()

```

**4**. 实现获取新闻发布时间的函数。

```
# 和 get_title 函数一样，传入 label_object，返回发布时间
def get_pub_time(label_object):
    # 找到 class=comment-link 的 span 标签
    spans = label_object.find_all("span", class_="comment-link")
    # 取第一个
    span = spans[0]
    # 返回标题属性
    return span["title"]

```

至此，四个基础函数已经准备好，以上的 Cell 都需要注意按 shift + enter 执行，这样接下来才可以使用这些函数。

### （2）获取新闻标题与列表

接下来，开始使用上面的函数来获得新闻的标题与新闻列表。

新建 Cell，输入如下代码：

```
# 调用 create_doc_from_filename 函数，创建 BeautifulSoup 对象
doc = create_doc_from_filename("jiandan.html")
# 调用 find_index_labels 函数，传入 BeautifulSoup 对象
# 将返回的 div 列表存储在 index_labels 中
index_labels = find_index_labels(doc)
# 使用遍历循环遍历 index_labels 列表，循环变量为 label_object
for label_object in index_labels:
    # 调用 get_title，传入当前处理的 div 元素对象，获取标题
    title = get_title(label_object)
    # 调用 get_pub_time，传入当前处理的 div 元素对象，获取发布时间
    pub_time = get_pub_time(label_object)
    # 将标题和发布时间打印出来
    print("标题：", title)
    print("发布时间：", pub_time)

```

上述代码把刚才准备的四个函数都串了起来。整体思路是：首先创建 BeautifulSoup 对象，之后针对该对象查询 class = indexs 的列表，然后使用遍历循环遍历该列表，对于每一个 div 元素，分别调用 get_title 以及 get_pub_time 函数来获得标题与发布时间。

执行上述代码后，输出如下所示。可以看到，新闻标题和时间都已经被成功打印了出来。

```
标题： 引发普通感冒的鼻病毒会将新冠病毒排挤出细胞！
发布时间： 1小时 ago
标题： 无厘头研究：植入虚假的记忆再抹去它们
发布时间： 4小时 ago
标题： 什么是仇恨犯罪？
发布时间： 8小时 ago
标题： 突发：LHCb发现了违背标准模型的现象
发布时间： 12小时 ago
标题： 今日带货 20210324
发布时间： 14小时 ago
标题： 舌战裸猿：IBM搞出了可以打辩论赛的AI
发布时间： 23小时 ago
标题： 大吐槽：「我没醉，醉的是世界」
发布时间： 1天 ago
标题： 今年世界总发电量的0.6%被用于挖比特币
发布时间： 1天 ago
标题： 接种疫苗后还是感染新冠？不要为此惊讶
发布时间： 1天 ago
标题： 今日带货：蛋友家的血橙
发布时间： 2天 ago
标题： 科学家首次在野外检测到抗多药的超级真菌
发布时间： 2天 ago
标题： 未在iPhone12盒中搭配充电器，苹果被巴西消协罚200万美元
发布时间： 2天 ago
标题： 工程师将解决城市陷坑的问题
发布时间： 2天 ago
标题： 今日带货：粉面专场
发布时间： 3天 ago
标题： 科学家在碟子里培育出了泪腺，并让它哭泣
发布时间： 3天 ago
标题： 疯狂实验进行时：把志愿者禁闭在黑暗的空间里40天
发布时间： 3天 ago
标题： 今日带货 20210321
发布时间： 4天 ago
标题： 我们已向外星人发送了哪些消息？
发布时间： 4天 ago
标题： 脑力小体操：石头+剪刀 VS 石头+布
发布时间： 4天 ago
标题： 发霉啦：今天，我终于向母亲摊牌了
发布时间： 5天 ago
标题： 普渡大学的经济学家计算出世界各地幸福的价格
发布时间： 5天 ago
标题： 人类首次观察到木星上极光黎明风暴的成形过程
发布时间： 5天 ago
标题： 为女儿出头，母亲编辑假裸照败坏高中啦啦队队员的名誉
发布时间： 5天 ago
标题： 今日带货：淘宝京东蛋友推荐
发布时间： 6天 ago

```

### （3）将数据存储为字典的形式

要存储到 CSV，首先将数据创建为字典的形式。在（2）的循环中将标题和时间存储为字典，然后使用一个字典列表来存储每个新闻对应的字典。最后直接使用 DictWriter 的 writerows 方法来将字典列表写入 CSV 文件即可。

直接修改刚才打印标题和发布时间的 Cell，删除原本的打印代码，并添加字典相关操作的代码。

添加完后的 Cell，如下所示：

```
# 调用 create_doc_from_filename 函数，创建 BeautifulSoup 对象
doc = create_doc_from_filename("jiandan.html")
# 调用 find_index_labels 函数，传入 BeautifulSoup 对象
# 将返回的 div 列表存储在 index_labels 中
index_labels = find_index_labels(doc)
# 【新增代码】存储新闻的字典列表
news_dict_list = []
# 使用遍历循环遍历 index_labels 列表，循环变量为 label_object
for label_object in index_labels:
    # 调用 get_title，传入当前处理的 div 元素对象，获取标题
    title = get_title(label_object)
    # 调用 get_pub_time，传入当前处理的 div 元素对象，获取发布时间
    pub_time = get_pub_time(label_object)
    # 【新增代码】创建单条新闻的字典
    news = {"标题": title, "发布时间": pub_time}
    # 【新增代码】将新闻字典添加到字典列表
    news_dict_list.append(news)
# 【新增代码】打印出字典列表
print(news_dict_list)

```

通过循环，将新闻以字典的形式逐个添加到字典列表中，然后在最后打印出列表，输出如下所示。

```
[{'标题': '引发普通感冒的鼻病毒会将新冠病毒排挤出细胞！', '发布时间': '1小时 ago'}, {'标题': '无厘头研究：植入虚假的记忆再抹去它们', '发布时间': '4小时 ago'}, {'标题': '什么是仇恨犯罪？', '发布时间': '8小时 ago'}, {'标题': '突发：LHCb发现了违背标准模型的现象', '发布时间': '12小时 ago'}, {'标题': '今日带货 20210324', '发布时间': '14小时 ago'}, {'标题': '舌战裸猿：IBM搞出了可以打辩论赛的AI', '发布时间': '23小时 ago'}, {'标题': '大吐槽：「我没醉，醉的是世界」', '发布时间': '1天 ago'}, {'标题': '今年世界总发电量的0.6%被用于挖比特币', '发布时间': '1天 ago'}, {'标题': '接种疫苗后还是感染新冠？不要为此惊讶', '发布时间': '1天 ago'}, {'标题': '今日带货：蛋友家的血橙', '发布时间': '2天 ago'}, {'标题': '科学家首次在野外检测到抗多药的超级真菌', '发布时间': '2天 ago'}, {'标题': '未在iPhone12盒中搭配充电器，苹果被巴西消协罚200万美元', '发布时间': '2天 ago'}, {'标题': '工程师将解决城市陷坑的问题', '发布时间': '2天 ago'}, {'标题': '今日带货：粉面专场', '发布时间': '3天 ago'}, {'标题': '科学家在碟子里培育出了泪腺，并让它哭泣', '发布时间': '3天 ago'}, {'标题': '疯狂实验进行时：把志愿者禁闭在黑暗的空间里40天', '发布时间': '3天 ago'}, {'标题': '今日带货 20210321', '发布时间': '4天 ago'}, {'标题': '我们已向外星人发送了哪些消息？', '发布时间': '4天 ago'}, {'标题': '脑力小体操：石头+剪刀 VS 石头+布', '发布时间': '4天 ago'}, {'标题': '发霉啦：今天，我终于向母亲摊牌了', '发布时间': '5天 ago'}, {'标题': '普渡大学的经济学家计算出世界各地幸福的价格', '发布时间': '5天 ago'}, {'标题': '人类首次观察到木星上极光黎明风暴的成形过程', '发布时间': '5天 ago'}, {'标题': '为女儿出头，母亲编辑假裸照败坏高中啦啦队队员的名誉', '发布时间': '5天 ago'}, {'标题': '今日带货：淘宝京东蛋友推荐', '发布时间': '6天 ago'}]

```

### （4）存储到 CSV 文件中

此时，已经将网页中抓取到的数据都保存在一个字典列表中：news_dict_list，接下来将这个列表写入到 CSV 文件中即可。

代码如下所示：

```
# 创建 news.CSV 文件
fo = open("news.CSV", "w", newline='', encoding='utf_8_sig')
# 这一次的表头
header = ["标题", "发布时间"]
# 使用文件对象和表头初始化 DictWriter 对象
writer = csv.DictWriter(fo, header)
# 写入表头
writer.writeheader()
# 将上一步计算的字典列表写入 CSV 文件中
writer.writerows(news_dict_list)
# 关闭文件对象
fo.close()

```

执行之后，在 chapter09 文件夹下会生成 news.CSV 文件，用 Excel 打开后如下图所示。可以看到，数据已经成功以表格的形式呈现了。

![](/python-data-analysis-images/11-Cgp9HWCGXFOAGwVfAAdzQElKjnA321.png)

## 小结

本文主要介绍了以下内容：

- 使用 for..in.. 语句可以直接对列表进行**遍历循环**，每次循环时，循环变量存储的都是当前遍历到的列表元素；
- 使用 DictReader 可以读取 CSV 文件，主要方式是构建 reader 对象后，直接对 reader 对象用 for..in.. 循环来遍历；
- 使用 DictWriter 可以写入 CSV 文件，writerow 方法用于写入一行，writerows 方法用于写入一个列表（对应多行）。

至此，已经完整学习了通过 Python 实现爬虫的网页下载 → 数据抽取 → 数据保存三大环节。下一篇将以一个实战案例的形式，通过爬虫技术构建一个数据集。

课后练习：

读取刚才保存的 news.csv，添加一列“分级信息”。

分级信息的标准是：前三条的分级信息为“推荐”，后面为“普通”，添加之后保存为新的 news1.csv。

---

答案如下：

关键点：

- 将本文学习的读取 csv 和写入 csv 的操作整理成两个函数，方便后续调用；
- 遍历读取到的字典列表，为每个元素都增加分级信息的键值对；
- 通过一个计算变量 i 来判断当前是第几次循环；
- 用 if 语句根据变量 i 的值来决定当前字典的分级信息是推荐还是普通。

```
# 整理写入 CSV 文件的代码为函数
# 输入参数为：要写入的字典列表、要写入的文件名、表头
def write_dict_list_to_CSV(dict_list, filename, headers):
    fo = open(filename, "w", newline='', encoding='utf_8_sig')
    writer = csv.DictWriter(fo, headers)
    writer.writeheader()
    writer.writerows(dict_list)
    fo.close()
# 整理读取 CSV 的代码为函数
# 输入参数为 CSV 文件名，返回值为读取到的字典列表
def get_dict_list_from_CSV(filename):
    fo = open(filename, "r")
    reader = csv.DictReader(fo)
    dict_list = []
    for item in reader:
        dict_list.append(item)
    return dict_list
# 获取 news.CSV 中的新闻数据，将字典列表存储在 news_list
news_list = get_dict_list_from_CSV("news.CSV")
# 表头
header = ["标题","发布时间", "分级信息"]
# 遍历循环字典列表，并用变量 i 来统计当前是第几次循环
# 循环体中修改 news_list 中的每个字典，添加分级信息的内容
i = 0
for item in news_list:
    # 前三次为推荐，后面为普通
    if i<=2:
        item["分级信息"] = "推荐"
    else:
        item["分级信息"] = "普通"
    # 每次循环结束后，变量 i 的值+1
    i = i + 1
# 调用上面的函数，将新的字典列表写入 news1.CSV 文件中
write_dict_list_to_CSV(news_list, "news1.CSV", header)

```

执行后，用 Excel 打开新产生的 news1.csv，如下图所示。可以看到分级信息已经按照题目要求加上了。

![](/python-data-analysis-images/11-Cgp9HWCGXF-AS6avAAgYOOiMiFQ649.png)

## 版本差异（爬虫技术栈 → 当前版本）

| 库 | 本文编写时 | 当前稳定版 |
|----|-----------|-----------|
| `requests` | 2.28/2.31 | 2.32.x |
| `Scrapy` | 1.x/2.0 | 2.13.x（API 稳定，截至 2026-09） |
| `httpx` | 0.24 | 0.28.x |
| `Playwright` | 1.3x | 1.6x（Python 版） |
| `lxml`/`BeautifulSoup` | 旧版 | 保持稳定 |
| Python | 3.8-3.12 | 3.14（推荐） |

> 本文讲解的爬虫原理（HTTP、解析、反爬、存储）与核心 API 在最新版本中成立；注意 Python 3.9 及以下已 EOL，新项目使用 3.13/3.14。
