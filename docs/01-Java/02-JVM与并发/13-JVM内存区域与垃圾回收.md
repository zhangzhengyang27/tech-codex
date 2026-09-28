---
title: "JVM 内存区域与垃圾回收"
description: "运行时数据区、对象内存布局、垃圾回收算法与收集器。"
keywords: [JVM, 内存, GC]
category: "Java"
tags: [Java, JVM]
---

# JVM 内存区域与垃圾回收

## JVM 在技术栈中的位置

#### JVM 和操作系统的关系

![](/jvm-course-images/a845d79213c6.png)

JVM 全称 Java Virtual Machine，即 Java 虚拟机。它能识别 .class 后缀的文件，解析它的指令，最终调用操作系统上的函数，完成相应的操作。

一般情况下，使用 C++ 开发的程序，编译成二进制文件后就可以直接执行，操作系统能够识别它；但是 Java 程序不一样，使用 javac 编译成 .class 文件之后，还需要使用 Java 命令去主动执行它，操作系统并不认识这些 .class 文件。

Java 程序不像 C++ 那样直接在操作系统上运行编译后的二进制文件，而是需要处于程序与操作系统中间层的虚拟机。这是因为 Java 是一门抽象程度特别高的语言，提供了自动内存管理等一系列特性，这些特性直接在操作系统上实现是不太可能的，所以需要 JVM 进行转换。

据此可以做出如下的类比：

- JVM：等同于操作系统；
- Java 字节码：等同于汇编语言。

Java 字节码一般都比较容易读懂，这从侧面证明 Java 语言的抽象程度比较高。可以把 JVM 看作一个翻译器，持续不断地翻译执行 Java 字节码，然后调用真正的操作系统函数，这些操作系统函数与平台息息相关。

整体关系可参考下图：

![](/jvm-course-images/696954ef779f.png)

从图中可以看到，有了 JVM 这个抽象层之后，Java 就可以实现跨平台。JVM 只需要保证能够正确执行 .class 文件，就可以运行在诸如 Linux、Windows、MacOS 等平台上。

Java 跨平台的意义在于一次编译，处处运行，能够做到这一点 JVM 功不可没。比如在 Maven 仓库下载同一版本的 jar 包就可以到处运行，不需要在每个平台上再编译一次。

现在的一些 JVM 扩展语言，比如 Clojure、JRuby、Groovy 等，编译到最后都是 .class 文件，Java 语言的维护者只需要控制好 JVM 这个解析器，就可以将这些扩展语言无缝地运行在 JVM 之上。

用一句话概括 JVM 与操作系统之间的关系：JVM 上承开发语言，下接操作系统，它的中间接口就是字节码。

Java 程序与通常使用的 C++ 程序的不同之处可以用两张图说明。

![](/jvm-course-images/7960340c35db.png)

![](/jvm-course-images/0b4c9c51c552.png)

对比这两张图可以看到，C++ 程序编译成操作系统能够识别的 .exe 文件，而 Java 程序编译成 JVM 能够识别的 .class 文件，然后由 JVM 负责调用系统函数执行程序。

#### JVM、JRE、JDK的关系

![](/jvm-course-images/4ec755da1f18.png)

JVM 是 Java 程序能够运行的核心。但是 JVM 自己什么也干不了，需要为它提供生产原料（.class 文件）。它虽然功能强大，仍需要为它提供 .class 文件。

仅仅是 JVM，无法完成一次编译、处处运行，它需要一个基本的类库，比如怎么操作文件、怎么连接网络等。Java 体系会一次性将 JVM 运行所需的类库都传递给它。JVM 标准加上实现的一大堆基础类库，就组成了 Java 的运行时环境，也就是常说的 JRE（Java Runtime Environment）。

有了 JRE 之后，Java 程序便可以在浏览器中运行。如果只需要执行一些 Java 程序，只需要一个 JRE 就足够了。

对于 JDK 来说，就更大一些。除了 JRE，JDK 还提供了很多小工具，比如 javac、java、jar 等，它是 Java 开发的核心。

JDK 的全拼是 Java Development Kit。JVM、JRE、JDK 三者之间的关系，可以用一个包含关系表示。

- JDK>JRE>JVM
![](/jvm-course-images/89905d0541c7.png)

#### Java 虚拟机规范和 Java 语言规范的关系

谈到 JVM，首先会想到它的垃圾回收器，其实它还有很多部分，比如对字节码进行解析的执行引擎等。广义上来讲，JVM 是一种规范，是最为官方、最为准确的文档；狭义上来讲，由于 Hotspot 使用更多，一般谈到这个概念时会将它们等同起来。

再加上平常使用的 Java 语言的话，可以得出下面这张图，这是 Java 开发人员必须搞懂的两个规范。

![](/jvm-course-images/2324778d409f.png)

左半部分是 Java 虚拟机规范，为输入和执行字节码提供一个运行环境。右半部分是常说的 Java 语法规范，比如 switch、for、泛型、lambda 等相关的程序，最终都会编译成字节码。而连接左右两部分的桥梁依然是 Java 的字节码。

如果 .class 文件的规格是不变的，这两部分是可以独立进行优化的。但 Java 也会偶尔扩充一下 .class 文件的格式，增加一些字节码指令，以便支持更多的特性。

可以把 Java 虚拟机看作一台抽象的计算机，它有自己的指令集以及各种运行时内存区域，与《计算机组成结构》中有很多相似性。

不学习 JVM 理论上不会影响编写 Java 代码，两者之间没有必然的联系，通过 .class 文件进行交互，即使不了解 JVM，也能编写大多数 Java 代码。这就像编写 C++ 代码一样，并不需要特别深入地了解操作系统的底层实现。

但要编写比较精巧、效率比较高的代码，就需要了解一些执行层面的知识了。了解 JVM 主要用在调优以及故障排查上，能够对运行中的各种资源分配有一个比较全面的掌控。

#### Java 代码到底是如何运行起来的

下面简单看一下一个 Java 程序的执行过程。

Java 程序是文本格式的。比如下面这段 HelloWorld.java，它遵循的是 Java 语言规范，其中调用了 System.out 等模块，也就是 JRE 里提供的类库。

```
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}
```

使用 JDK 的工具 javac 进行编译后，会产生 HelloWorld 的字节码。

Java 字节码是沟通 JVM 与 Java 程序的桥梁，下面使用 javap 稍微看一下字节码的样子。

```
0 getstatic #2 <java/lang/System.out>
3 ldc #3 <Hello World>
5 invokevirtual #4 <java/io/PrintStream.println>
8 return
```

Java 虚拟机采用基于栈的架构，其指令由操作码和操作数组成。这些字节码指令叫作 opcode。其中，getstatic、ldc、invokevirtual、return 等，就是 opcode，比较容易理解。

继续使用 hexdump 看一下字节码的二进制内容。与以上字节码对应的二进制，就是下面这几个数字。

```
b2 00 02 12 03 b6 00 04 b1
```

对应的关系如下：

```
0xb2   getstatic       获取静态字段的值
0x12   ldc             常量池中的常量值入栈
0xb6   invokevirtual   运行时方法绑定调用方法
0xb1   return          void 函数返回
```

opcode 有一个字节的长度(0~255)，意味着指令集的操作码个数不能超过 256 条。而紧跟在 opcode 后面的是操作数。比如 b2 00 02，就代表了 getstatic #2 <java/lang/System.out>。

JVM 靠解析这些 opcode 和操作数来完成程序的执行。使用 Java 命令运行 .class 文件的时候，实际上就相当于启动了一个 JVM 进程。

JVM 翻译这些字节码有两种执行方式。常见的是解释执行，将 opcode + 操作数翻译成机器代码；另一种执行方式是 JIT，也就是常说的即时编译，它会在一定条件下将字节码编译成机器码之后再执行。

这些 .class 文件会被加载、存放到 metaspace 中，等待被调用，这里会有一个类加载器的概念。

JVM 的程序运行都是在栈上完成的，和其他普通程序的执行类似，同样分为堆和栈。比如运行到 main 方法，就会给它分配一个栈帧；当退出方法体时，会弹出相应的栈帧。可以发现，大多数字节码指令就是不断对栈帧进行操作。

而其他大块数据存放在堆上。Java 在内存划分上会更为细致，相关概念在后续节中详细介绍。

整体结构见下图，其中 JVM 部分就是本文的要点。

![](/jvm-course-images/b0632b06f83e.png)

#### 选用的版本

JVM 只是一个虚拟机规范，有非常多的实现。其中，最流行的是 Oracle 的 HotSpot。

原文撰写时最新的版本是 Java 13（当时最新的 LTS 版本是 11），后续内容以 13 版本的 Java 为基准。截至 2026-09，最新版本是 JDK 25（最新 LTS 同为 25，此前 LTS 为 21、17），JVM 规范层面的内容基本不受版本影响，但部分特性（如分代 ZGC、虚拟线程）仅在较新版本可用，实践时请结合所用版本。整个 JVM 的调优就是在不断试错中完成的。

## 运行时数据区与对象内存布局

### 为什么需要理解 JVM

这部分内容的价值不只是为了面试答题，更是为了在真实项目里能够：

- **诊断 OOM（内存溢出）**：快速定位内存泄漏原因
- **排查频繁 GC**：解决 GC 导致的服务抖动
- **优化性能瓶颈**：合理配置 JVM 参数
- **解决生产故障**：快速响应线上问题

### 运行时数据区

JVM 在运行时将内存划分为多个区域，每个区域有不同的作用和特点：

```
┌─────────────────────────────────────────────────────┐
│              JVM 运行时数据区                         │
├─────────────────────────────────────────────────────┤
│  线程私有区域                                         │
│  ┌───────────────────────────────────────────────┐  │
│  │ 程序计数器（Program Counter Register）         │  │
│  │ - 记录当前线程执行的字节码指令位置               │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │ Java 虚拟机栈（Java Virtual Machine Stack）   │  │
│  │ - 每个方法创建一个栈帧                         │  │
│  │ - 存储局部变量表、操作数栈、动态链接、返回地址  │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │ 本地方法栈（Native Method Stack）             │  │
│  │ - 为 Native 方法服务                          │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  线程共享区域                                         │
│  ┌───────────────────────────────────────────────┐  │
│  │ Java 堆（Java Heap）                          │  │
│  │ - 对象实例和数组的主要分配区域                 │  │
│  │ - 垃圾回收的核心区域                           │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │ 方法区（Method Area）/ 元空间（Metaspace）    │  │
│  │ - 类元数据、运行时常量池、静态变量             │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

#### 线程私有区域

线程私有区域的生命周期与线程绑定，随线程创建而创建，随线程销毁而销毁。

#### 1. 程序计数器（Program Counter Register）

**作用：** 记录当前线程下一条将执行的字节码指令位置。

**特点：**

- **线程私有**：每个线程都有独立的程序计数器
- **内存占用小**：仅存储指令偏移地址
- **唯一无 OOM 区域**：Java 虚拟机规范中唯一没有规定 OOM 的区域

**工作原理：**

```
字节码执行流程：
┌─────────────────────────────────────┐
│  线程 A 执行：                       │
│  0: iconst_1       ← PC 指向这里    │
│  1: istore_1                        │
│  2: iload_1                         │
│  ...                                │
└─────────────────────────────────────┘
```

**多线程环境下：**

- 线程切换后恢复执行位置
- 执行 Java 方法时记录字节码指令地址
- 执行 Native 方法时值为空（Undefined）

#### 2. Java 虚拟机栈（Java Virtual Machine Stack）

**作用：** 描述 Java 方法执行的内存模型，每个方法执行时创建一个栈帧（Stack Frame）。

**栈帧结构：**

```
┌─────────────────────────────────────┐
│  栈帧（Stack Frame）                │
├─────────────────────────────────────┤
│  局部变量表（Local Variable Table） │
│  - 基本数据类型                      │
│  - 对象引用（reference）             │
│  - returnAddress 类型               │
│  - 以槽（Slot）为单位，long/double 占 2 个槽 │
├─────────────────────────────────────┤
│  操作数栈（Operand Stack）          │
│  - 计算过程的中间结果                │
│  - 方法调用的参数传递                │
├─────────────────────────────────────┤
│  动态链接（Dynamic Linking）        │
│  - 指向运行时常量池的方法引用        │
├─────────────────────────────────────┤
│  方法返回地址（Return Address）     │
│  - 方法正常退出：PC 计数器值        │
│  - 方法异常退出：异常处理器地址     │
└─────────────────────────────────────┘
```

**示例：方法执行过程**

```java
public int calculate(int a, int b) {
    int result = a + b;
    return result;
}
```

**字节码执行：**

```
 0: iload_1      // 将局部变量表索引 1 的值压入操作数栈
 1: iload_2      // 将局部变量表索引 2 的值压入操作数栈
 2: iadd         // 从操作数栈弹出两个值相加，结果压栈
 3: istore_3     // 将栈顶值存入局部变量表索引 3
 4: iload_3      // 将局部变量表索引 3 的值压入操作数栈
 5: ireturn      // 返回栈顶值
```

**局部变量表示例：**

| 索引 | 类型 | 值 | 说明 |
|-----|------|-----|------|
| 0 | reference | this | 当前对象引用（实例方法） |
| 1 | int | a | 参数 a |
| 2 | int | b | 参数 b |
| 3 | int | result | 局部变量 result |

**常见异常：**

- **StackOverflowError**：递归调用过深，栈深度超过限制
- **OutOfMemoryError**：栈扩展时无法申请到足够内存（-Xss 参数设置栈大小）

**示例：StackOverflowError**

```java
public class StackOverflowDemo {
    private int depth = 0;
    
    public void recursiveCall() {
        depth++;
        recursiveCall(); // 无限递归
    }
    
    public static void main(String[] args) {
        StackOverflowDemo demo = new StackOverflowDemo();
        try {
            demo.recursiveCall();
        } catch (StackOverflowError e) {
            System.out.println("栈深度：" + demo.depth); // 约 15000-20000
        }
    }
}
```

#### 3. 本地方法栈（Native Method Stack）

**作用：** 为 Native 方法（本地方法）服务。

**特点：**

- 与 Java 虚拟机栈类似，但为 Native 方法服务
- Native 方法通常用 C/C++ 实现
- HotSpot 虚拟机将本地方法栈与虚拟机栈合二为一

**常见 Native 方法：**

```java
// Object 类的 hashCode 方法
public native int hashCode();

// System 类的 currentTimeMillis 方法
public static native long currentTimeMillis();

// Thread 类的 start 方法
private native void start0();
```

#### 线程共享区域

线程共享区域在 JVM 启动时创建，所有线程共享这些内存区域。

#### 1. Java 堆（Java Heap）

**作用：** 存储对象实例和数组，是垃圾回收管理的核心区域。

**特点：**

- **所有线程共享**：所有对象实例在此分配
- **垃圾回收核心**：GC 主要工作区域
- **可扩展**：通过 -Xms 和 -Xmx 控制大小
- **物理不连续**：逻辑上连续即可

**堆的结构（分代设计）：**

```
┌─────────────────────────────────────────────────────┐
│              Java 堆（分代结构）                      │
├─────────────────────────────────────────────────────┤
│  新生代（Young Generation）                          │
│  ┌───────────────────────────────────────────────┐  │
│  │ Eden 区（伊甸园区）                            │  │
│  │ - 新对象首先在此分配                           │  │
│  │ - 占新生代的 80%                              │  │
│  ├───────────────────────────────────────────────┤  │
│  │ Survivor 0（From 区）                          │  │
│  │ - 存活对象的中转站                             │  │
│  │ - 占新生代的 10%                              │  │
│  ├───────────────────────────────────────────────┤  │
│  │ Survivor 1（To 区）                            │  │
│  │ - 存活对象的中转站                             │  │
│  │ - 占新生代的 10%                              │  │
│  └───────────────────────────────────────────────┘  │
│  新生代占堆大小的 1/3（可通过 -XX:NewRatio 调整）    │
├─────────────────────────────────────────────────────┤
│  老年代（Old Generation / Tenured Generation）      │
│  ┌───────────────────────────────────────────────┐  │
│  │ - 存储长期存活的对象                           │  │
│  │ - 大对象直接进入老年代                         │  │
│  │ - 占堆大小的 2/3                              │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**对象分配流程：**

```
1. 新对象在 Eden 区分配
   ↓
2. Eden 区满，触发 Minor GC
   ↓
3. 存活对象复制到 Survivor 区
   ↓
4. 年龄计数器 +1
   ↓
5. 年龄达到阈值（默认 15），晋升到老年代
   或 Survivor 区空间不足，提前晋升
```

**常见异常：**

- **OutOfMemoryError: Java heap space**：堆内存不足

**示例：堆内存溢出**

```java
import java.util.ArrayList;
import java.util.List;

public class HeapOOMDemo {
    static class OOMObject {
        private byte[] data = new byte[1024 * 1024]; // 1MB
    }
    
    public static void main(String[] args) {
        List<OOMObject> list = new ArrayList<>();
        while (true) {
            list.add(new OOMObject()); // 不断创建对象
        }
    }
}
```

**运行配置：**

```bash
java -Xms10m -Xmx10m -XX:+HeapDumpOnOutOfMemoryError HeapOOMDemo
```

**输出：**

```
java.lang.OutOfMemoryError: Java heap space
Dumping heap to java_pid12345.hprof ...
Heap dump file created [12345678 bytes in 0.123 secs]
```

#### 2. 方法区（Method Area）

**作用：** 存储类元数据、运行时常量池、静态变量、即时编译器生成的代码等。

**特点：**

- **线程共享**
- **逻辑上是堆的一部分**，但有个别名 Non-Heap
- **不同实现：**
  - JDK 7 及之前：永久代（Permanent Generation）
  - JDK 8 及之后：元空间（Metaspace）

**永久代 vs 元空间：**

| 特性 | 永久代（JDK 7） | 元空间（JDK 8+） |
|-----|----------------|----------------|
| 存储位置 | JVM 堆内存 | 本地内存（Native Memory） |
| 大小限制 | 固定大小（-XX:MaxPermSize） | 默认无限制（受系统内存限制） |
| OOM 风险 | 高（空间固定） | 低（可用系统内存） |
| 调优难度 | 较高 | 较低 |

**元空间参数：**

```bash
-XX:MetaspaceSize=128m         # 初始元空间大小
-XX:MaxMetaspaceSize=512m      # 最大元空间大小
-XX:MinMetaspaceFreeRatio=40   # 最小空闲比率
-XX:MaxMetaspaceFreeRatio=70   # 最大空闲比率
```

**运行时常量池：**

- Class 文件中的常量池（编译期生成的字面量和符号引用）
- 运行期间可以动态添加常量（如 String.intern()）

**示例：运行时常量池溢出**

```java
import java.util.ArrayList;
import java.util.List;

public class RuntimeConstantPoolOOM {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>();
        int i = 0;
        while (true) {
            // intern() 将字符串加入常量池
            list.add(String.valueOf(i++).intern());
        }
    }
}
```

**运行配置（JDK 7）：**

```bash
java -XX:PermSize=10m -XX:MaxPermSize=10m RuntimeConstantPoolOOM
```

**输出：**

```
java.lang.OutOfMemoryError: PermGen space
```

> 注：JDK 8 起字符串常量池随永久代移除已归入 Java 堆，此例在 JDK 8+ 中不会再触发 PermGen 溢出；如需复现，可将配置改为小堆（如 `-Xmx10m`），最终抛出 `OutOfMemoryError: Java heap space`。

#### 3. 直接内存（Direct Memory）

**作用：** 不属于 JVM 运行时数据区，但经常被使用。

**特点：**

- 通过 Native 函数直接在堆外分配内存
- 避免了 Java 堆和 Native 堆之间来回复制数据
- 提高读写性能（如 NIO）

**使用场景：**

```java
import java.nio.ByteBuffer;

public class DirectMemoryDemo {
    public static void main(String[] args) {
        // 分配 1MB 直接内存
        ByteBuffer buffer = ByteBuffer.allocateDirect(1024 * 1024);
        
        // 写入数据
        buffer.put("Hello".getBytes());
        
        // 读取数据
        buffer.flip();
        byte[] data = new byte[buffer.remaining()];
        buffer.get(data);
    }
}
```

**常见异常：**

- **OutOfMemoryError: Direct buffer memory**：直接内存不足

**配置参数：**

```bash
-XX:MaxDirectMemorySize=256m  # 最大直接内存大小
```

### 对象的创建与内存布局

#### 对象的创建过程

```
1. 类加载检查
   ↓ 检查类是否已加载、解析、初始化
2. 分配内存
   ↓ 在堆中为对象分配内存空间
3. 初始化零值
   ↓ 将分配的内存空间初始化为零值
4. 设置对象头
   ↓ 设置对象是哪个类的实例、如何找到类元数据、GC 年龄等
5. 执行 <init> 方法
   ↓ 执行构造方法，完成对象初始化
```

#### 内存分配方式

#### 1. 指针碰撞（Bump the Pointer）

**适用场景：** 堆内存规整（Serial、ParNew 等带压缩整理过程的收集器）

**原理：**

```
已使用内存 | 空闲内存
          ↑
      指针位置

分配对象：指针向后移动对象大小距离
```

#### 2. 空闲列表（Free List）

**适用场景：** 堆内存不规整（CMS 等基于标记-清除算法的收集器）

**原理：**

```
已使用 | 空闲 | 已使用 | 空闲 | 已使用
       └───┘        └───┘
      空闲列表维护空闲内存块

分配对象：从空闲列表中找到足够大的空间
```

#### 并发安全

**问题：** 对象创建在并发环境下需要保证线程安全。

**解决方案：**

#### 1. CAS（Compare And Swap）

JVM 采用 CAS + 失败重试的方式保证分配内存的原子性。

#### 2. TLAB（Thread Local Allocation Buffer）

每个线程在 Eden 区预先分配一小块私有内存，优先在 TLAB 中分配。

**参数配置：**

```bash
-XX:+UseTLAB           # 开启 TLAB（默认开启）
-XX:TLABSize=256k      # 设置 TLAB 大小
```

#### 对象的内存布局

对象在堆中的存储布局分为三部分：

```
┌─────────────────────────────────────────┐
│  对象头（Object Header）                │
├─────────────────────────────────────────┤
│  Mark Word（标记字段）                  │
│  - 哈希码（HashCode）                   │
│  - GC 分代年龄                          │
│  - 锁状态标志                           │
│  - 偏向线程 ID                          │
│  - 偏向时间戳                           │
│  - 32 位 JVM 占 4 字节，64 位占 8 字节  │
├─────────────────────────────────────────┤
│  类型指针（Class Pointer）              │
│  - 指向类元数据的指针                   │
│  - 32 位 JVM 占 4 字节，64 位占 8 字节  │
│  - 开启指针压缩后占 4 字节              │
├─────────────────────────────────────────┤
│  实例数据（Instance Data）              │
│  - 对象真正存储的有效信息               │
│  - 包括父类继承的和子类定义的           │
├─────────────────────────────────────────┤
│  对齐填充（Padding）                    │
│  - 保证对象大小是 8 字节的整数倍        │
│  - 不是必须的                           │
└─────────────────────────────────────────┘
```

**Mark Word 结构（64 位 JVM）：**

```
┌────────────────────────────────────────────────────────────┐
│                    Mark Word (64 bits)                     │
├────────────────────────────────────────────────────────────┤
│  锁状态  │  56bit  │  1bit  │  4bit  │  1bit  │  2bit  │
│         │         │  锁标志 │  年龄   │  偏向锁 │  锁标志 │
│         │         │  偏向锁 │        │        │        │
├────────────────────────────────────────────────────────────┤
│  无锁    │ hashCode │  0     │  age   │   0    │  01    │
│  偏向锁  │ ThreadID │  epoch │  age   │   1    │  01    │
│  轻量锁  │    指向栈中锁记录的指针       │   00    │
│  重量锁  │    指向堆中对象监视器的指针   │   10    │
│  GC 标记│    空                         │   11    │
└────────────────────────────────────────────────────────────┘
```

#### 对象的访问定位

**两种主流方式：**

#### 1. 句柄访问

```
Java 栈 → reference → 句柄池 → 对象实例数据地址
                         → 对象类型数据地址
```

**优点：** reference 存储的是稳定的句柄地址，对象移动时只需修改句柄中的实例数据指针。

**缺点：** 需要两次指针定位，访问效率稍低。

#### 2. 直接指针访问（HotSpot 使用）

```
Java 栈 → reference → 对象实例数据（对象头中包含类型指针）
```

**优点：** 访问速度快，节省一次指针定位的时间开销。

**缺点：** 对象移动时需要修改 reference 本身。

### 垃圾回收基础

#### 对象存活判定

#### 1. 引用计数法

**原理：** 为对象添加一个引用计数器，每当有地方引用它时计数器加 1，引用失效时减 1。计数器为 0 时对象可回收。

**优点：** 实现简单，判定效率高。

**缺点：** 无法解决循环引用问题。

**示例：循环引用问题**

```java
public class ReferenceCountingGC {
    public Object instance = null;
    
    public static void main(String[] args) {
        ReferenceCountingGC objA = new ReferenceCountingGC();
        ReferenceCountingGC objB = new ReferenceCountingGC();
        
        // 循环引用
        objA.instance = objB;
        objB.instance = objA;
        
        // 对象不可达，但引用计数不为 0
        objA = null;
        objB = null;
        
        // 引用计数法无法回收 objA 和 objB
    }
}
```

#### 2. 可达性分析算法（主流）

**原理：** 从一组根对象（GC Roots）出发，向下搜索，搜索走过的路径称为引用链（Reference Chain）。如果一个对象到 GC Roots 没有任何引用链相连，则证明对象不可用。

**GC Roots 包括：**

```
┌────────────────────────────────────────────┐
│  GC Roots 对象                             │
├────────────────────────────────────────────┤
│  1. 虚拟机栈中的引用对象                    │
│     - 方法中的局部变量、参数                │
│                                            │
│  2. 方法区中类静态属性引用的对象            │
│     - static 修饰的引用类型变量            │
│                                            │
│  3. 方法区中常量引用的对象                  │
│     - final 修饰的引用类型变量             │
│                                            │
│  4. 本地方法栈中 JNI 引用的对象             │
│     - Native 方法引用的对象                │
│                                            │
│  5. JVM 内部的引用                          │
│     - 基本数据类型的 Class 对象            │
│     - 常驻异常对象（NullPointerException 等）│
│     - 系统类加载器                         │
│                                            │
│  6. 同步锁持有的对象                        │
│     - synchronized 锁定的对象              │
│                                            │
│  7. JVM 内部状态                            │
│     - 正在执行的线程对象                   │
│     - 正在加载的类对象                     │
└────────────────────────────────────────────┘
```

**可达性分析示例：**

```
          GC Root
             │
        ┌────┴────┐
        ↓         ↓
      对象A     对象B
        │         │
        ↓         ↓
      对象C     对象D ←──┐
        │               │
        ↓               │
      对象E         对象F（循环引用）
                      ↑↓
                    对象G

对象A-G 都可达，不会被回收

对象H ←─── 对象I ←─── 对象J
  ↑                      │
  └──────────────────────┘
（循环引用，但不可达，会被回收）
```

#### 引用类型

JDK 1.2 后，Java 对引用进行了扩充，分为四种类型：

#### 1. 强引用（Strong Reference）

**特点：** 只要强引用存在，垃圾回收器永远不会回收。

```java
Object obj = new Object();  // 强引用
obj = null;  // 解除强引用，对象可被回收
```

#### 2. 软引用（Soft Reference）

**特点：** 内存不足时会被回收（OOM 之前）。

**用途：** 缓存、内存敏感的缓存。

```java
import java.lang.ref.SoftReference;

SoftReference<byte[]> softRef = new SoftReference<>(new byte[1024 * 1024]);

// 使用
byte[] data = softRef.get();
if (data == null) {
    // 已被回收，重新创建
    data = new byte[1024 * 1024];
    softRef = new SoftReference<>(data);
}
```

#### 3. 弱引用（Weak Reference）

**特点：** 无论内存是否充足，GC 时都会回收。

**用途：** WeakHashMap、ThreadLocal。

```java
import java.lang.ref.WeakReference;

WeakReference<Object> weakRef = new WeakReference<>(new Object());

// 使用
Object obj = weakRef.get();
System.gc();  // 触发 GC
obj = weakRef.get();  // 通常返回 null
```

#### 4. 虚引用（Phantom Reference）

**特点：** 无法通过虚引用获取对象实例，唯一目的是在对象被回收时收到系统通知。

**用途：** 跟踪对象被垃圾回收的活动。

```java
import java.lang.ref.PhantomReference;
import java.lang.ref.ReferenceQueue;

ReferenceQueue<Object> queue = new ReferenceQueue<>();
PhantomReference<Object> phantomRef = new PhantomReference<>(new Object(), queue);

// 无法通过虚引用获取对象
Object obj = phantomRef.get();  // 总是返回 null

// 检查队列，判断对象是否被回收
Reference<? extends Object> ref = queue.poll();
if (ref != null) {
    // 对象已被回收
}
```

**引用强度排序：**

```
强引用 > 软引用 > 弱引用 > 虚引用
```

#### finalize() 方法

**作用：** 对象在被回收前，会调用 finalize() 方法（如果重写了）。

**注意：**

- 不推荐使用 finalize()，JDK 9 起标记为 deprecated，JDK 18 起（JEP 421）进一步废弃以待移除
- finalize() 执行时间不确定
- finalize() 可能导致对象复活（不推荐）
- 性能开销大

**对象的三种状态：**

```
1. 可达（Reachable）
   ↓
2. 可复活（Finalizer-Reachable）
   - finalize() 方法未执行，对象可能被复活
   ↓
3. 不可达（Unreachable）
   - finalize() 方法已执行或未重写 finalize()
   - 对象将被回收
```

### 垃圾回收算法

#### 1. 标记-清除算法（Mark-Sweep）

**流程：**

```
标记阶段：标记所有需要回收的对象
    ↓
清除阶段：统一回收被标记的对象
```

**示意图：**

```
标记前：
┌───┬───┬───┬───┬───┬───┬───┬───┐
│ A │ B │ C │ D │ E │ F │ G │ H │
└───┴───┴───┴───┴───┴───┴───┴───┘

标记阶段（标记 B、D、F、H 为垃圾）：
┌───┬───┬───┬───┬───┬───┬───┬───┐
│ A │ B │ C │ D │ E │ F │ G │ H │
│   │ × │   │ × │   │ × │   │ × │
└───┴───┴───┴───┴───┴───┴───┴───┘

清除阶段：
┌───┬───┬───┬───┬───┬───┬───┬───┐
│ A │   │ C │   │ E │   │ G │   │
│   │ 空│   │ 空│   │ 空│   │ 空│
└───┴───┴───┴───┴───┴───┴───┴───┘
```

**缺点：**

1. **效率问题**：标记和清除效率都不高
2. **空间问题**：产生大量不连续的内存碎片

#### 2. 复制算法（Copying）

**流程：**

```
将内存按容量划分为大小相等的两块
    ↓
每次只使用其中一块
    ↓
用完时将还存活的对象复制到另一块
    ↓
清理已使用的那块
```

**示意图：**

```
初始状态：
┌───────────────────────┬───────────────────────┐
│   使用区（已满）       │   空闲区               │
│ A B C D E F G H       │                       │
└───────────────────────┴───────────────────────┘

复制存活对象（A、C、E、G 存活）：
┌───────────────────────┬───────────────────────┐
│                       │ A C E G               │
│                       │ 存活对象               │
└───────────────────────┴───────────────────────┘

清空原使用区，交换角色：
┌───────────────────────┬───────────────────────┐
│   空闲区               │   使用区               │
│                       │ A C E G               │
└───────────────────────┴───────────────────────┘
```

**优点：**

- 没有内存碎片
- 实现简单，运行高效

**缺点：**

- 内存利用率低（只能用一半）
- 存活率高时效率降低

**优化：Appel 式回收（新生代使用）**

```
Eden : Survivor : Survivor = 8 : 1 : 1

每次使用 Eden 和一块 Survivor，另一块 Survivor 留作备用
内存利用率 = 90%
```

#### 3. 标记-整理算法（Mark-Compact）

**流程：**

```
标记阶段：标记所有需要回收的对象
    ↓
整理阶段：将存活对象向一端移动，然后清理端边界以外的内存
```

**示意图：**

```
标记阶段：
┌───┬───┬───┬───┬───┬───┬───┬───┐
│ A │ B │ C │ D │ E │ F │ G │ H │
│   │ × │   │ × │   │ × │   │ × │
└───┴───┴───┴───┴───┴───┴───┴───┘

整理阶段（移动存活对象）：
┌───┬───┬───┬───┬───┬───┬───┬───┐
│ A │ C │ E │ G │   │   │   │   │
└───┴───┴───┴───┴───┴───┴───┴───┘
                      ↑
                  边界指针

清理边界以外内存：
┌───┬───┬───┬───┐
│ A │ C │ E │ G │
└───┴───┴───┴───┘
```

**优点：**

- 没有内存碎片
- 适合老年代

**缺点：**

- 移动对象成本高
- 需要更新引用

#### 4. 分代收集算法（Generational Collection）

**原理：** 根据对象存活周期的不同，将内存划分为几块，针对不同区域采用不同的垃圾回收算法。

**分代设计：**

```
┌─────────────────────────────────────────┐
│  新生代（Young Generation）              │
│  - 朝生夕灭，存活率低                    │
│  - 使用复制算法                          │
│  - 回收频繁、速度快                      │
├─────────────────────────────────────────┤
│  老年代（Old Generation）                │
│  - 存活率高，没有额外空间担保            │
│  - 使用标记-清除或标记-整理算法          │
│  - 回收代价高、速度慢                    │
└─────────────────────────────────────────┘
```

**对象晋升规则：**

1. **年龄达到阈值**：默认 15（-XX:MaxTenuringThreshold）
2. **Survivor 空间不足**：提前晋升（动态年龄判定）
3. **大对象直接进入老年代**：-XX:PretenureSizeThreshold

#### 5. 增量收集算法

**原理：** 让垃圾收集线程和用户线程交替执行，每次只收集一小部分内存区域。

**优点：** 减少单次 GC 停顿时间。

**缺点：** 总停顿时间可能增加，吞吐量下降。

### 主流垃圾回收器

#### 垃圾回收器对比

| 收集器 | 类型 | 算法 | 特点 | 适用场景 |
|-------|------|------|------|---------|
| **Serial** | 新生代 | 复制 | 单线程、简单高效 | 客户端模式、小内存 |
| **ParNew** | 新生代 | 复制 | Serial 的多线程版本 | 服务端、配合 CMS |
| **Parallel Scavenge** | 新生代 | 复制 | 吞吐量优先 | 后台计算任务 |
| **Serial Old** | 老年代 | 标记-整理 | Serial 的老年代版本 | 客户端模式 |
| **Parallel Old** | 老年代 | 标记-整理 | Parallel Scavenge 的老年代版本 | 后台计算任务 |
| **CMS** | 老年代 | 标记-清除 | 低停顿、并发收集 | 互联网站、B/S 架构 |
| **G1** | 新老年代 | 复制+标记-整理 | 面向服务端、可预测停顿 | 大多数业务系统 |
| **ZGC** | 全堆 | 复制 | 极低停顿（<10ms） | 对延迟敏感的系统 |

> **收集器现状（2026-09）**：G1 自 JDK 9 起为 HotSpot 默认收集器；CMS 在 JDK 9 废弃、JDK 14 移除（JEP 363），与之配套的 ParNew 亦不可用；现代 JDK（21+）可用的收集器为 Serial、Parallel、G1、ZGC、Shenandoah。

#### 1. Serial 收集器

**特点：**

- 单线程收集器
- 进行 GC 时必须暂停其他所有工作线程
- 简单高效（没有线程交互开销）

**适用场景：**

- 客户端模式
- 单核 CPU 环境
- 小内存应用（几十 MB 到一两百 MB）

**参数：**

```bash
-XX:+UseSerialGC    # 新生代和老年代都用 Serial 收集器
```

#### 2. ParNew 收集器

**特点：**

- Serial 收集器的多线程版本
- 使用多个线程进行垃圾收集
- 除了多线程外，其余行为与 Serial 完全一致

**适用场景：**

- 服务端模式
- 配合 CMS 收集器使用

**参数：**

```bash
-XX:+UseParNewGC    # 新生代使用 ParNew
-XX:ParallelGCThreads=4  # 设置 GC 线程数
```

#### 3. Parallel Scavenge 收集器

**特点：**

- 吞吐量优先的收集器
- 自适应调节策略（GC Ergonomics）
- 关注点：可控的吞吐量（Throughput）

**吞吐量计算：**

```
吞吐量 = 运行用户代码时间 / (运行用户代码时间 + 运行垃圾收集时间)
```

**参数：**

```bash
-XX:+UseParallelGC           # 新生代使用 Parallel Scavenge
-XX:+UseParallelOldGC        # 老年代使用 Parallel Old
-XX:MaxGCPauseMillis=200     # 最大 GC 停顿时间
-XX:GCTimeRatio=99           # 吞吐量大小（99 表示 1/(1+99)=1% 时间用于 GC）
-XX:+UseAdaptiveSizePolicy   # 自适应调节策略
```

#### 4. CMS 收集器（Concurrent Mark Sweep）

> **现状**：CMS 已在 JDK 9 被标记废弃，并于 JDK 14 被彻底移除（JEP 363），本节内容仅作历史机制理解，现代应用应选用 G1 或 ZGC。

**特点：**

- 以获取最短回收停顿时间为目标
- 基于"标记-清除"算法
- 并发收集、低停顿

**工作流程：**

```
1. 初始标记（STW）
   ↓ 标记 GC Roots 直接关联的对象
2. 并发标记
   ↓ 进行 GC Roots Tracing
3. 重新标记（STW）
   ↓ 修正并发标记期间变动的对象
4. 并发清除
   ↓ 清除标记的对象
```

**优点：**

- 并发收集、低停顿

**缺点：**

- 对 CPU 资源敏感（默认启动线程数 = (CPU 数 + 3) / 4）
- 无法处理浮动垃圾（并发清理时产生的新垃圾）
- 标记-清除算法会产生内存碎片

**参数：**

```bash
-XX:+UseConcMarkSweepGC      # 使用 CMS
-XX:CMSInitiatingOccupancyFraction=75  # 老年代占用 75% 时触发 GC
-XX:+UseCMSCompactAtFullCollection    # Full GC 时进行压缩整理
-XX:CMSFullGCsBeforeCompaction=0      # 每次 Full GC 都压缩
-XX:+CMSParallelRemarkEnabled         # 并行重新标记
```

**适用场景：**

- 互联网站、B/S 架构的服务端
- 重视响应速度、低停顿的应用

#### 5. G1 收集器（Garbage-First）

**特点：**

- 面向服务端的垃圾收集器
- 将堆划分为多个大小相等的独立区域（Region）
- 可预测的停顿时间模型
- 无内存碎片（基于复制算法）

**Region 划分：**

```
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ E   │ E   │ S   │ S   │ O   │ O   │ O   │ H   │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
E: Eden 区    S: Survivor 区    O: Old 区
H: Humongous 区（存放大对象）
```

**工作流程：**

```
1. 初始标记（STW）
   ↓ 标记 GC Roots 直接关联的对象
2. 并发标记
   ↓ 从 GC Roots 开始进行可达性分析
3. 最终标记（STW）
   ↓ 处理 SATB（Snapshot-At-The-Beginning）
4. 筛选回收（STW）
   ↓ 根据 GC 停顿时间预测，选择价值最大的 Region 回收
```

**优点：**

- 可预测停顿时间
- 无内存碎片
- 并发与并行收集

**参数：**

```bash
-XX:+UseG1GC                 # 使用 G1
-XX:MaxGCPauseMillis=200     # 最大 GC 停顿时间目标
-XX:G1HeapRegionSize=4m      # Region 大小（1-32MB，2 的幂次）
-XX:InitiatingHeapOccupancyPercent=45  # 堆占用 45% 时触发并发标记
-XX:G1NewSizePercent=5       # 新生代最小比例
-XX:G1MaxNewSizePercent=60   # 新生代最大比例
```

**适用场景：**

- 大多数业务系统（JDK 9+ 默认）
- 大堆内存（> 4-6GB）
- 对延迟敏感的应用

#### 6. ZGC 收集器（Z Garbage Collector）

**特点：**

- JDK 11 引入，JDK 15 正式可用
- 极低停顿时间（< 10ms，甚至 < 1ms）
- 支持 TB 级大内存
- 并发整理（Concurrent Compaction）

**核心技术：**

1. **着色指针（Colored Pointer）**：在指针中存储标记信息
2. **读屏障（Load Barrier）**：在读取对象引用时检查指针颜色

**工作流程：**

```
并发标记 → 并发预备重分配 → 并发重分配 → 并发重映射
```

**优点：**

- 极低停顿（< 10ms）
- 支持 TB 级内存
- 无内存碎片

**缺点：**

- 吞吐量略低于 G1
- 内存占用较高（需要额外的视图空间）

**参数：**

```bash
-XX:+UseZGC                   # 使用 ZGC
-XX:ZCollectionInterval=5     # GC 间隔（秒）
-XX:ZAllocationSpikeTolerance=2  # 内存分配尖峰容忍度
-XX:+UnlockDiagnosticVMOptions -XX:+ZProactive  # 主动触发 GC
-XX:+ZGenerational            # JDK 21+ 分代 ZGC（JEP 439）
```

> **分代 ZGC 演进**：分代 ZGC 由 JDK 21 引入（JEP 439，`-XX:+ZGenerational` 开启）；JDK 23 起（JEP 474）分代模式成为 ZGC 默认，JDK 24 起（JEP 490）非分代模式已移除，无需再显式指定该参数。

**适用场景：**

- 对延迟极其敏感的系统
- 大内存应用（> 16GB）
- 实时交易系统

#### 7. Shenandoah 收集器

**特点：**

- OpenJDK 12 引入（JDK 15 起正式可用，JEP 379）
- 类似 ZGC，目标低停顿
- 不使用着色指针，而是用转发指针
- 仅随 OpenJDK 发布，Oracle JDK 不包含

**优点：**

- 低停顿（< 10ms）
- 适合大堆内存

**缺点：**

- 性能开销较大
- 吞吐量受影响

**参数：**

```bash
-XX:+UseShenandoahGC    # 使用 Shenandoah
```

### 内存分配与回收策略

#### 对象优先在 Eden 分配

**规则：** 大多数情况下，对象在新生代 Eden 区分配。

**示例：**

```java
public class EdenAllocationDemo {
    public static void main(String[] args) {
        byte[] allocation1 = new byte[2 * 1024 * 1024];
        byte[] allocation2 = new byte[2 * 1024 * 1024];
        byte[] allocation3 = new byte[2 * 1024 * 1024];
        byte[] allocation4 = new byte[4 * 1024 * 1024]; // 触发 Minor GC
    }
}
```

**运行参数：**

```bash
-XX:+PrintGCDetails -Xms20M -Xmx20M -Xmn10M -XX:SurvivorRatio=8
```

> 注：`-XX:+PrintGCDetails` 为 JDK 8 的 GC 日志参数，JDK 9+ 请使用 `-Xlog:gc*`。

#### 大对象直接进入老年代

**规则：** 大于设置阈值的对象直接在老年代分配。

**参数：**

```bash
-XX:PretenureSizeThreshold=3145728  # 大于 3MB 的对象直接进入老年代
```

**适用场景：** 避免在新生代发生大量内存复制。

#### 长期存活对象进入老年代

**规则：** 对象年龄达到阈值（默认 15）后晋升到老年代。

**参数：**

```bash
-XX:MaxTenuringThreshold=15  # 年龄阈值
```

#### 动态对象年龄判定

**规则：** 如果 Survivor 空间中相同年龄所有对象大小的总和大于 Survivor 空间的一半，年龄大于或等于该年龄的对象直接进入老年代。

#### 空间分配担保

**规则：** Minor GC 前，检查老年代最大可用的连续空间是否大于新生代所有对象总大小。

**流程：**

```
检查老年代最大可用连续空间 > 新生代所有对象总大小？
    ↓ 是
    Minor GC 安全
    ↓ 否
检查 HandlePromotionFailure 设置？
    ↓ 是（允许担保失败）
检查老年代最大可用连续空间 > 历次晋升到老年代对象的平均大小？
    ↓ 是
    尝试 Minor GC（有风险）
    ↓ 否 或 不允许担保失败
    Full GC
```

### JVM 调优实战

#### JVM 参数分类

#### 1. 内存参数

```bash
## 堆内存
-Xms2g              # 初始堆大小
-Xmx2g              # 最大堆大小
-Xmn1g              # 新生代大小
-XX:NewRatio=2      # 老年代:新生代 = 2:1
-XX:SurvivorRatio=8 # Eden:Survivor = 8:1

## 元空间
-XX:MetaspaceSize=128m       # 初始元空间大小
-XX:MaxMetaspaceSize=512m    # 最大元空间大小

## 直接内存
-XX:MaxDirectMemorySize=256m # 最大直接内存

## 栈内存
-Xss256k            # 每个线程栈大小
```

#### 2. 垃圾回收器参数

```bash
## Serial
-XX:+UseSerialGC

## Parallel
-XX:+UseParallelGC
-XX:+UseParallelOldGC
-XX:ParallelGCThreads=4

## CMS
-XX:+UseConcMarkSweepGC
-XX:CMSInitiatingOccupancyFraction=75

## G1
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200

## ZGC
-XX:+UseZGC
```

#### 3. 日志参数

```bash
## JDK 8
-XX:+PrintGCDetails
-XX:+PrintGCDateStamps
-XX:+PrintGCTimeStamps
-Xloggc:/path/to/gc.log

## JDK 9+
-Xlog:gc*:file=/path/to/gc.log:time,level,tags
```

#### 4. 故障诊断参数

```bash
-XX:+HeapDumpOnOutOfMemoryError             # OOM 时生成堆转储
-XX:HeapDumpPath=/path/to/heapdump.hprof    # 堆转储路径
-XX:ErrorFile=/path/to/hs_err_pid%p.log     # 错误日志路径
-XX:+PrintCommandLineFlags                  # 打印 JVM 参数
```

#### 常见参数配置示例

#### 示例 1：小型应用（1-2GB 堆）

```bash
java \
  -Xms1g \
  -Xmx1g \
  -Xmn512m \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -XX:+HeapDumpOnOutOfMemoryError \
  -XX:HeapDumpPath=/data/logs/heapdump.hprof \
  -Xlog:gc*:file=/data/logs/gc.log:time,level,tags \
  -jar app.jar
```

#### 示例 2：中型应用（4-8GB 堆）

```bash
java \
  -Xms4g \
  -Xmx4g \
  -Xmn2g \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -XX:InitiatingHeapOccupancyPercent=40 \
  -XX:G1HeapRegionSize=8m \
  -XX:+HeapDumpOnOutOfMemoryError \
  -XX:HeapDumpPath=/data/logs/heapdump.hprof \
  -Xlog:gc*:file=/data/logs/gc.log:time,level,tags:filecount=5,filesize=100m \
  -jar app.jar
```

#### 示例 3：大型应用（16GB+ 堆）

```bash
java \
  -Xms16g \
  -Xmx16g \
  -XX:+UseZGC \
  -XX:ZCollectionInterval=5 \
  -XX:ConcGCThreads=4 \
  -XX:ParallelGCThreads=8 \
  -XX:+HeapDumpOnOutOfMemoryError \
  -XX:HeapDumpPath=/data/logs/heapdump.hprof \
  -Xlog:gc*:file=/data/logs/gc.log:time,level,tags:filecount=10,filesize=100m \
  -jar app.jar
```

#### GC 日志分析

#### G1 GC 日志示例

```
[2026-03-29T18:30:45.123+0800][info][gc     ] GC(0) Pause Young (Allocation Failure)
[2026-03-29T18:30:45.125+0800][info][gc,heap] GC(0) Eden regions: 24->0(24)
[2026-03-29T18:30:45.125+0800][info][gc,heap] GC(0) Survivor regions: 0->3(3)
[2026-03-29T18:30:45.125+0800][info][gc,heap] GC(0) Old regions: 0->5
[2026-03-29T18:30:45.125+0800][info][gc,heap] GC(0) Humongous regions: 0->0
[2026-03-29T18:30:45.125+0800][info][gc,metaspace] GC(0) Metaspace: 20480K->20480K(1069056K)
[2026-03-29T18:30:45.125+0800][info][gc     ] GC(0) User=0.02s Sys=0.01s Real=0.01s
```

**关键指标：**

- **Pause Young**：年轻代 GC 停顿
- **Eden regions: 24->0**：Eden 区从 24 个 Region 变为 0
- **Old regions: 0->5**：老年代增加了 5 个 Region
- **User/Sys/Real**：用户态/内核态/实际耗时

#### GC 日志分析工具

1. **GCViewer**：图形化分析 GC 日志
2. **GCEasy**：在线 GC 日志分析（https://gceasy.io/）
3. **JClarity Censum**：商业工具
4. **jhat**：JDK 8 自带的堆转储分析工具（JDK 9 起已移除，现多用 MAT、VisualVM 或 JProfiler）

### JVM 监控工具

#### 命令行工具

#### 1. jps（JVM Process Status Tool）

**作用：** 列出正在运行的 JVM 进程。

```bash
jps -l
## 输出：
## 12345 org.apache.catalina.startup.Bootstrap
## 12346 sun.tools.jps.Jps
```

#### 2. jstat（JVM Statistics Monitoring Tool）

**作用：** 监控 JVM 类加载、内存、垃圾收集、JIT 编译等运行数据。

```bash
## 查看 GC 统计（每 1 秒输出一次）
jstat -gcutil <pid> 1000

## 输出：
##   S0     S1     E      O      M     CCS    YGC     YGCT    FGC    FGCT     GCT
##   0.00  93.47  24.62  46.68  93.47  88.71    15    0.156     3    0.234    0.390

## 参数说明：
## S0/S1：Survivor 0/1 使用率
## E：Eden 使用率
## O：Old 使用率
## M：Metaspace 使用率
## YGC：年轻代 GC 次数
## YGCT：年轻代 GC 总时间
## FGC：Full GC 次数
## FGCT：Full GC 总时间
```

#### 3. jinfo（Configuration Info for Java）

**作用：** 实时查看和调整 JVM 配置参数。

```bash
## 查看所有参数
jinfo -flags <pid>

## 查看特定参数
jinfo -flag MaxHeapSize <pid>

## 动态修改参数（仅限可写参数）
jinfo -flag +PrintGCDetails <pid>
```

#### 4. jmap（Memory Map for Java）

**作用：** 生成堆转储快照、查询堆内存详细信息。

```bash
## 生成堆转储
jmap -dump:format=b,file=heap.hprof <pid>

## 查看堆内存使用
jmap -heap <pid>

## 查看对象统计（前 20 个）
jmap -histo <pid> | head -20
```

#### 5. jstack（Stack Trace for Java）

**作用：** 生成线程快照，定位线程停顿、死锁等问题。

```bash
## 生成线程快照
jstack -l <pid> > thread.txt

## 检测死锁
jstack -F <pid> | grep -A 10 "Found one Java-level deadlock"
```

#### 可视化工具

#### 1. VisualVM

**功能：**

- 监控内存、CPU、类、线程
- 生成和分析堆转储
- 分析 CPU 性能
- 插件扩展

**使用：**

```bash
## JDK 8 自带
jvisualvm

## JDK 9+ 需单独下载
## https://visualvm.github.io/
```

#### 2. JConsole

**功能：**

- 监控内存、线程、类、CPU
- MBean 管理
- 简单易用

**使用：**

```bash
jconsole
```

#### 3. Java Mission Control（JMC）

**功能：**

- 低开销性能分析
- Java Flight Recorder（JFR）
- 生产环境友好

**使用：**

```bash
## JDK 8 自带
jmc

## JDK 11+ 需单独下载
```

#### 4. Arthas（阿里巴巴开源）

**功能：**

- 在线诊断工具
- 无需重启应用
- 支持查看类加载、方法执行、线程状态等

**使用：**

```bash
## 下载并启动
curl -O https://arthas.aliyun.com/arthas-boot.jar
java -jar arthas-boot.jar

## 常用命令：
## dashboard    - 查看仪表盘
## thread       - 查看线程信息
## jvm          - 查看 JVM 信息
## heapdump     - 生成堆转储
## watch        - 观察方法执行
## trace        - 追踪方法调用路径
```

### 实战案例分析

#### 案例 1：内存泄漏排查

**问题现象：**

服务运行一段时间后频繁 Full GC，响应变慢。

**排查过程：**

```bash
## 1. 查看堆内存使用
jmap -heap <pid>

## 输出：
## Heap Configuration:
##    MaxHeapSize = 2147483648 (2048.0MB)
## Heap Usage:
## PS Old Generation
##    capacity = 1431830528 (1365.5MB)
##    used     = 1423421440 (1357.5MB)  # 老年代接近满

## 2. 生成堆转储
jmap -dump:format=b,file=leak.hprof <pid>

## 3. 使用 MAT 分析
## 发现 HashMap 占用大量内存
```

**定位问题：**

```java
public class CacheManager {
    // 缓存只增不减，导致内存泄漏
    private static Map<String, Object> cache = new HashMap<>();
    
    public static void put(String key, Object value) {
        cache.put(key, value);
    }
    
    // 缺少 remove 或清理机制
}
```

**解决方案：**

```java
import java.util.concurrent.TimeUnit;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;

public class CacheManager {
    // 使用 Guava Cache，设置过期时间和最大容量
    private static Cache<String, Object> cache = CacheBuilder.newBuilder()
        .maximumSize(10000)
        .expireAfterWrite(10, TimeUnit.MINUTES)
        .build();
    
    public static void put(String key, Object value) {
        cache.put(key, value);
    }
    
    public static Object get(String key) {
        return cache.getIfPresent(key);
    }
}
```

#### 案例 2：CPU 飙高排查

**问题现象：**

服务器 CPU 使用率持续 90%+。

**排查过程：**

```bash
## 1. 找到高 CPU 进程
top
## PID: 12345, CPU: 95%

## 2. 查看高 CPU 线程
top -Hp 12345
## Thread ID: 12350, CPU: 92%

## 3. 转换线程 ID
printf "%x\n" 12350
## 输出: 303e

## 4. 查看线程栈
jstack 12345 | grep 303e -A 20

## 输出：
## "http-nio-8080-exec-10" #123 daemon prio=5 os_prio=0 tid=0x00007f8c0c0a4800 nid=0x303e runnable [0x00007f8bfe7f6000]
##    java.lang.Thread.State: RUNNABLE
##         at com.example.service.CalculateService.calculate(CalculateService.java:25)
```

**定位问题：**

```java
public class CalculateService {
    public int calculate(int n) {
        // 死循环
        while (true) {
            n++;
            if (n < 0) break;  // 永远不会执行
        }
        return n;
    }
}
```

**解决方案：**

```java
public class CalculateService {
    public int calculate(int n) {
        // 添加循环退出条件
        int maxIterations = 10000;
        int count = 0;
        while (count < maxIterations) {
            n++;
            count++;
        }
        return n;
    }
}
```

#### 案例 3：频繁 Young GC

**问题现象：**

Young GC 频繁（每秒 10+ 次），吞吐量下降。

**排查过程：**

```bash
## 1. 查看 GC 统计
jstat -gcutil <pid> 1000 5

## 输出：
##   S0     S1     E      O      M     CCS    YGC     YGCT
##   0.00 100.00 100.00  30.12  90.34  85.67   523    2.345
##   0.00 100.00 100.00  30.45  90.34  85.67   534    2.456  # 11 次 Young GC
##   0.00 100.00 100.00  30.78  90.34  85.67   545    2.567  # 11 次 Young GC

## 2. 查看新生代大小
jinfo -flag NewSize <pid>
## -XX:NewSize=10485760  # 新生代只有 10MB

## 3. 分析 Eden 区快速填满原因
## 使用 Arthas watch 观察对象创建
```

**定位问题：**

```java
public class DataProcessService {
    public void process(List<String> dataList) {
        // 每次处理创建大量临时对象
        for (String data : dataList) {
            byte[] temp = new byte[1024 * 1024];  // 1MB 临时数组
            // 处理数据
        }
    }
}
```

**解决方案：**

```java
public class DataProcessService {
    // 重用临时数组，减少对象创建
    private static final ThreadLocal<byte[]> tempBuffer = 
        ThreadLocal.withInitial(() -> new byte[1024 * 1024]);
    
    public void process(List<String> dataList) {
        byte[] temp = tempBuffer.get();
        for (String data : dataList) {
            // 重用 temp 数组
            // 处理数据
        }
    }
}
```

**参数调优：**

```bash
## 增大新生代
-Xmn512m  # 新生代从 10MB 增加到 512MB
```

### 常见误区

#### 误区一：只要 Full GC 少就是好

**真相：**

GC 性能需要综合多个指标：

- **吞吐量**：应用运行时间占比
- **停顿时间**：单次 GC 停顿时长
- **GC 频率**：单位时间内 GC 次数
- **内存占用**：堆内存使用率

**案例：**

- 系统A：Full GC 1 次/小时，每次停顿 5 秒
- 系统B：Full GC 10 次/小时，每次停顿 0.5 秒

对于实时交易系统，系统B更好（停顿短）；对于批处理系统，系统A更好（吞吐高）。

#### 误区二：调优只看 JVM 参数

**真相：**

很多 GC 问题来自代码层面：

- **内存泄漏**：对象无法回收
- **对象创建风暴**：短时间内创建大量对象
- **大对象频繁创建**：直接进入老年代
- **缓存失控**：缓存无限增长
- **集合只增不减**：List/Map 无限增长

**建议：** 80% 的性能问题来自代码，20% 来自配置。

#### 误区三：-Xms 和 -Xmx 应该设置不同

**真相：**

生产环境建议 `-Xms` 和 `-Xmx` 设置相同：

**原因：**

1. **避免动态扩容**：堆扩容会触发 Full GC
2. **避免动态缩容**：堆缩容影响性能
3. **内存抖动**：扩容/缩容导致应用不稳定

**最佳实践：**

```bash
-Xms4g -Xmx4g  # 推荐
-Xms2g -Xmx4g  # × 不推荐
```

#### 误区四：对象可回收就会立即回收

**真相：**

对象变为不可达后，不会立即回收：

1. **等待 GC 时机**：由 JVM 决定何时触发 GC
2. **Finalizer 队列**：如果重写了 finalize()，需要等待执行
3. **收集器策略**：不同的收集器有不同的回收时机

**示例：**

```java
Object obj = new Object();
obj = null;  // 对象变为不可达
// 不会立即回收，等待下次 GC
```

#### 误区五：Metaspace 无限制就不会 OOM

**真相：**

Metaspace 默认无限制，但受限于系统内存：

**风险：**

- 类加载泄漏（动态生成类）
- 大量代理类（CGLIB、Spring AOP）
- JSP 重新编译（Tomcat）

**最佳实践：**

```bash
## 设置 Metaspace 上限
-XX:MaxMetaspaceSize=512m
```

#### 误区六：GC 日志影响性能

**真相：**

GC 日志开销很小（< 1%），但价值巨大：

- 排查生产问题
- 性能调优依据
- 监控系统健康

**建议：** 生产环境必须开启 GC 日志。

```bash
## JDK 8
-XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:/path/to/gc.log

## JDK 9+
-Xlog:gc*:file=/path/to/gc.log:time,level,tags:filecount=5,filesize=100m
```

#### 误区七：所有对象都在堆中分配

**真相：**

以下情况对象不在堆中分配：

1. **栈上分配**：逃逸分析后，对象可能分配在栈上
2. **TLAB**：线程本地分配缓冲区（仍在堆中，但线程私有）
3. **直接内存**：NIO 的 DirectByteBuffer

**逃逸分析示例：**

```java
public String concat(String a, String b) {
    // StringBuilder 未逃逸，可能在栈上分配
    StringBuilder sb = new StringBuilder();
    sb.append(a);
    sb.append(b);
    return sb.toString();
}
```

#### 误区八：收集器越新越好

**真相：**

不同收集器有不同适用场景：

| 收集器 | 适用场景 |
|-------|---------|
| Serial | 客户端、小内存 |
| Parallel | 后台计算、吞吐优先 |
| CMS | 响应优先、中小堆（JDK 14 已移除） |
| G1 | 服务端、大堆、低延迟 |
| ZGC | 极低延迟、超大堆 |

**建议：** 根据应用特点选择，不是越新越好。

#### 基础概念题

**Q1：JVM 内存结构包含哪些区域？**

**参考答案：**

JVM 运行时数据区分为线程私有和线程共享两类：

**线程私有区域：**
- 程序计数器：记录当前线程执行的字节码指令位置
- Java 虚拟机栈：方法调用时创建栈帧，存储局部变量、操作数栈等
- 本地方法栈：为 Native 方法服务

**线程共享区域：**
- Java 堆：对象实例和数组的分配区域，GC 核心区域
- 方法区（元空间）：存储类元数据、运行时常量池、静态变量

**直接内存**不属于 JVM 运行时数据区，但常被使用（如 NIO）。

## 版本差异(旧版 → Java 21)

| 特性 | 旧版(JDK 8) | Java 9/21 |
|------|-------------|-----------|
| 方法区 | 永久代 PermGen（JDK 8 起元空间） | 元空间 Metaspace（JDK 8+，无上限默认） |
| 字符串常量池 | 永久代 | JDK 7 起移入堆；JDK 9+ 与 PermGen 无关 |
| 垃圾回收器 | CMS 为主 | CMS 已移除（JDK 14），G1 默认，ZGC 可选 |
| 堆默认大小 | 物理内存 1/4 | 不变；但容器化环境需显式 -Xmx |
| 分代演进 | 年轻代/老年代 | 不变；ZGC 分代（21）新增 |

> **CMS 移除**：CMS 收集器在 JDK 9 废弃、JDK 14 移除（JEP 363）。Java 21 中可用收集器为 Serial、Parallel、G1、ZGC、Shenandoah。