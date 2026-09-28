---
title: IPython 使用教程
description: IPython 交互式解释器的完整使用指南，涵盖内省、魔术命令、快捷键、与系统 shell 的协作等高效开发技巧。
version: 1.0
author: 文档维护组
created: 2026-02-23
updated: 2026-08-12
status: 正式版
category: Python

---
# IPython 使用教程

IPython 是一个非常流行的 Python 解释器，相比于原生的 Python 解释器有很多优点和长处。

```python
pip install ipython

# 指定安装版本（当前主流为 IPython 9.x）
pip install "ipython>=9.0"
```

## IPython 对于原生的优势

1. Python shell 不能在退出后保存历史；IPython 历史记录自动保存：保存在 history.sqlite 文件中：可用 `_` 、`__` 、`___`  调用最近三次记录
2. Python shell 不支持 tab 自动补全；IPython 支持 tab 补全
3. Python shell 不能快速获取类、函数信息；IPython通过 ？显示对象签名、文档字符串、代码位置，通过 ？？显示源代码
4. Python shell 不能直接执行 shell 命令，需要借助 sys；IPython通过 ! 调用系统命令，如 `!uptime`
5. 其他 IPython 有很多 magic函数，可通过使用 `%lsmagic`  枚举

```text
 %run：运行 Python 文件

 %edit：使用编辑器打开当前函数编辑

 %save：把某些历史记录保存到文件

 %debug：激活debug程序

 等等，后面会讲到
```

6. IPython有很多快捷键
7. IPython 的扩展宏系统、storemagic 持久化宏、变量、别名；以及 autoreload 自动重载等功能；

案例

1. Python 对象在 IPython 环境下排版得更好，格式化更加美观

```python
>>> import numpy as np
>>> data={i:np.random.randn() for i in range(8)}
>>> data
{0: 0.5745972896627615, 1: 0.888451102340561, 2: -2.2941687621316924, 3: 0.01790118639622907, 4: 0.3600199138099036, 5: 0.6118078188322031, 6: 0.5261552735725278, 7: -0.20874867962524404}
```

这是原生 Python 下显示的结果，很不美观， 因为当字典很长的时候，很难看

```python
data={i:np.random.randn() for i in range(8)}
 
In [13]: data
Out[13]:
{0: -0.24691306010199965,
 1: 1.0770180986231184,
 2: 0.9459463985248865,
 3: 0.7618376828038825,
 4: 1.6075756654719342,
 5: -0.04417798701828061,
 6: -1.062961626712148,
 7: -0.7381927912455305}
```

2. 提供更强大的交互体验

我们都知道，在Python原生开发条件下，单下划线“_”表示的是最近的一个输出结果，但是IPython则在此基础之上做出了更强大的功能。因为原生Python编辑器不仅丑，而且是没有行号的，但是IPython提供了行号，这不仅更好看，而且有很多妙用哦，如下：

- `_`   表示最近的一个输出结果；
- `__`  :表示最近的两个输出结果；
- `_行号` ：查看指定行的那个变量的结果
- `_i行号`：查看指定行号输入的变量名称

示例如下：

```python
In [1]: a=100
 
In [2]: a
Out[2]: 100
 
In [3]: b=200
 
In [4]: b
Out[4]: 200
 
In [5]: _
Out[5]: 200
 
In [6]: __
Out[6]: 200
```

注意：这里一定要输出 a、b，也就是说，如果上面没有第二行和第四行，那是不行的，因为_和__针对的是最近一个和最近两个**输出**了的，没有输出就不行了

**注意：** 

- `_4`  表示的是查看第四行输出的变量，但是这里如果改为 `_3` 就不行了，因为第三行只定义了 b=200，并没有输出，所以 `_行号` 只能够用在输出的行号上面
- 但是 ` _i行号` 不管是用在输出还是输入上面都是没有问题的


判断是输出还是输入，主要看前面是 In 的表示输入，是 Out 表示输出

## IPython 内省

IPython 相较于原生的 Python，提供了更加强大的内省功能，所谓**内省**，也称之为**内视**，即 **object introspection,**主要有以下一些常见的方法：

- **object? 或者?object :**显示该对象的一些通用信息，注意 Python 里面一切皆对象哦，包括函数、类
- **object?？ 或者??object**：两个问号显示详细信息，如果是类或者是函数，还会显示源代码。即将问号放在前面和后面都可以

通配符 `*` 匹配：如：

- **numpy.\*load\*?** 这会显示所有的包含有 load 的函数
- **numpy.*sort?** 这会显示所有以 sort 结尾的函数

## IPython 快捷键

下面介绍一下第一个和第二个快捷键，比如有如下代码：

1.  Ctrl-P    或上箭头键 后向搜索命令历史中以当前输入的文本开头的命令
2.  Ctrl-N   或下箭头键 前向搜索命令历史中以当前输入的文本开头的命令
3.  Ctrl-R   按行读取的反向历史搜索（部分匹配）
4.  Ctrl-Shift-v   从剪贴板粘贴文本
5.  Ctrl-C   中止当前正在执行的代码
6.  Ctrl-A   将光标移动到行首
7.  Ctrl-E   将光标移动到行尾
8.  Ctrl-K   删除从光标开始至行尾的文本
9.  Ctrl-U   清除当前行的所有文本
10.  Ctrl-F   将光标向前移动一个字符
11.  Ctrl-b   将光标向后移动一个字符 
12.  Ctrl-L   清屏

```python
In [16]: a=100
 
In [17]: a
Out[17]: 100
 
In [18]: abc=100
 
In [19]: abcd=1000
 
In [20]: a=100
 
In [21]: a
```

当输入 a 之后，然后按 Ctrl+P，或者是按向上的方向键，则会依次显示已 a 开头的变量，依次是 a、abcd、abc、a，不仅如此，很久之前在 IPython 里面输入过的变量，只要是以 a 开头的，都能够显示，直到最开始的那个以 a 开头的位置，如果是Ctrl+N或者是向下的方向键，则正好相反

## 模式命令 magic command

模式命令，是指那些给我们提供方便，轻松控制 IPython 交互系统的命令

**%quickref  :**可以显示IPython的快速参考

**%magic  ：** 可以查看到底有哪些模式命令（这个方法会显示每一个命令的详细信息，因此会很多）

**%lsmagic :**这里只会显示模式命令的名字，会比较简洁，查看起来更方便

**%命令？ 或者是%命令？？：** 当我们想要查看某一命令的详细信息，我们可以使用同前面类似的方法，在魔术命令后面添加一个或者是两个问号？？来查看详细信息

默认情况下，魔术命令总是以百分号%开头，但这不是必须的，我们也可以不使用百分号，我们也可以直接使用不带百分号的魔术命令，这称之为“**自动魔术命令——automagic**”如：

magic 这会得到和 %magic一样的效果，但是需要注意的是，不使用百分号时，不能出现和魔术命令同名称的变量，否则显示的就是变量了。那到底是使用百分号还是不使用百分号呢？事实上，我们也是可以自由控制的，通过**%automagic**来控制，

默认情况下，它是开启的，即我们可以使用无%的魔术命令，只要与变量名不冲突即可，我么也可以关闭，如下：

```python
%automagic 0
 
Automagic is OFF, % prefix IS needed for line magics.
```

此时，再次输入magic命令时，显示：

```python
magic
---------------------------------------------------------------------------
NameError                                 Traceback (most recent call last)
~\Desktop\test.py in <module>()
----> 1 magic
 
NameError: name 'magic' is not defined
```

显示 magic 是不存在的，因为已经关闭了。此时必须使用%开头

如何控制它的开还是关闭呢？

- `%automagic on`（或 `%automagic 1`）：此时打开

- `%automagic off`（或 `%automagic 0`）：此时关闭

### %run  运行 Python 脚本

即在 IPython 中我不仅可以运行代码，我还可以运行一个已知的 Python 脚本文件，就像是在命令行中的使用是一样的，比如有一个以下的 Python 文件：

```python
def addfunc(a,b,c):
    return a+b-c
 
a=100
b=200
c=150
result=addfunc(a,b,c)
```

现在我们在 IPython 里面输入如下代码：

```python
In [21]: %run C:\Users\XinAir\Desktop\test.py
 
In [22]: a
Out[22]: 100
 
In [23]: b
Out[23]: 200
 
In [24]: c
Out[24]: 150
 
In [25]: result
Out[25]: 150
```

这个和 cmd 模式之下的 `python C:\\Users\\XinAir\\Desktop\\test.py`  命令行参数（如果有命令的话） 两者是不是异曲同工。

不仅如此，我不仅能够直接使用脚本文件里面的代码，脚本文件也可以使用IPython环境中的变量，如下：

```python
In [26]: %run C:\Users\XinAir\Desktop\test.py
 
In [27]: x=1000
 
In [28]: y=2000
 
In [29]: z=1500
 
In [30]: result=addfunc(x,y,z)
 
In [31]: result
Out[31]: 1500
```

我们发现，不仅可以直接使用脚本文件中的变量、函数，还可以给脚本文件使用 IPython 本身的变量，除此之外，我还可以使用下面语句：

### %paste 或 %cpaste 执行剪切板中代码

在编写代码的时候，希望执行某一小段代码进行相关的测试，但又不想专门再建立一个 py 文件，可以将代码复制或者是剪切一下，这个时候代码进入了剪切板，然后打开 IPython，此时我们有三种处理办法

- 直接使用 Ctrl+V 进行粘贴，然后测试代码

- 输入魔术命令 `%paste` 回车，这个时候在剪切板中的代码自动粘贴了进来，不再需要手动复制了

- 输入魔术命令 `%cpaste`  回车，然后再手动 Ctrl+V,将代码复制进来，注意最后一定要按两个减号“--”退出才行哦，实际上它给了提示的

```python
%cpaste
Pasting code; enter '--' alone on the line to stop or use Ctrl-D.
:x=5
:y=7
:if x>5:
:    x+=1
:
:    y=8
:--
 
In [54]: y
Out[54]: 7
 
In [55]: x
Out[55]: 5
```

### %timeit 和 %time 检测 Python 语句执行时间

```python
a=numpy.random.randn(100,100)
 
In [65]: %timeit numpy.dot(a,a)
70.8 µs ± 1.74 µs per loop (mean ± std. dev. of 7 runs, 10000 loops each)
```

注意，执行的语句要和 %timeit 放在同一行，%timeit Python 语句

- **%time**  指一次执行代码的总体时间
- **%timeit** 指多次执行代码的平均时间，使用这个命令是因为每次执行同一个代码的时间是不一样的，所以通过多次执行代码求出的平均时间更能说明代码的总体执行时间

### %who、%who_ls 和 %whos 查看当前 interactive 环境中的变量

他们都可以查看当前的IPython环境中有哪些变量，但有所区别

- **%who**   依次显示出每一个变量的名称
- **%who_ls**  以列表的形式返回
- **%whos**  显示出每一个变量的详细信息

```python
In [5]: %who
a        b       c
 
In [6]: %who_ls
Out[6]: ['a', 'b', 'c']
 
In [7]: %whos
Variable   Type    Data/Info
----------------------------
a          int     100
b          int     200
c          int     300
```

### %hist 查看历史命令

```python
In [11]: %hist
magic
a=100
b=200
c=300
%who
%who_ls
%whos
%hist
```

### 删除 IPython 环境中的变量

- **%xdel variable** 删除单个变量的引用
- **%reset**  指删除 interactive 命名空间中全部的变量名

### 其他常用命令

- %debug 从最新的异常跟踪的底部进入交互式调试器

- %pdb 在异常发生后自动进入调试器

- %page OBJECT 通过分页器打印输出 object

- %prun statement 通过 cProfile 执行 statement，并打印分析器的输出结果


当然魔术命令有很多，没有完全列举出

## IPython 环境与 cmd 的互相切换

在 IPython 交互情况下，直接输入命令 `!cmd`  即可进入 cmd 模式

在 cmd 模式下直接输入 IPython 可以再次回到 `ipython` 模式

## 版本差异（Python 3.8-3.12 → 3.14）

| 特性 | 本文编写时 | Python 3.14 |
|------|-----------|-------------|
| 类型注解求值 | 运行时立即求值 | PEP 649/749 延迟求值：注解不再在定义时执行，解决前向引用，提升启动性能 |
| 字符串模板 | 普通 f-string / `str.format` | PEP 750 模板字符串 `t"..."`：可插值且能被安全处理（3.14 新特性） |
| 标准库多解释器 | 无官方支持 | PEP 734：`concurrent.interpreters` 模块支持在同一进程创建多个子解释器 |
| 调试 | 仅 Python 内建 pdb / IDE 调试 | PEP 768：安全的 CPython 外部调试器接口（custom debugger protocol） |
| 字节码与运行时 | 3.12 前无 JIT | 3.13 引入实验性 JIT（PEP 744）；3.14 进一步改进 free-threaded（无 GIL）构建 |
| `datetime` API | `utcnow()` 常用 | 3.12 起弃用，官方要求改用 `datetime.now(tz=datetime.UTC)`（aware 对象） |
| 压缩算法 | zlib / gzip / bz2 / lzma | 3.14 新增标准库 Zstandard 支持（PEP 784） |

> 本文讲解的语法与数据结构原理在 3.14 中依然成立；新项目建议基于 Python 3.13/3.14，并优先使用 aware datetime、PEP 649 注解与最新类型语法。
