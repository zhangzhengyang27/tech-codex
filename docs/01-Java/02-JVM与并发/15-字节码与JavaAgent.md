---
title: "字节码与 Java Agent"
description: "字节码指令、栈帧、方法调用底层与 Java Agent 改字节码。"
keywords: [字节码, Agent, Arthas]
category: "Java"
tags: [Java, JVM]
---

# 字节码与 Java Agent

## 字节码指令

### 异常处理

在上一节中，细心的你可能注意到了，在 synchronized 生成的字节码中，其实包含两条 monitorexit 指令，是为了保证所有的异常条件都能够退出。

![](/jvm-course-images/bfc19a6f9ae0.jpeg)

如果熟悉 Java 语言，那么对上面的异常继承体系一定不会陌生，其中，Error 和 RuntimeException 是非检查型异常（Unchecked Exception），也就是不需要 catch 语句去捕获的异常；而其他异常，则需要程序员手动去处理。

#### 异常表

在发生异常的时候，Java 就可以通过 Java 执行栈来构造异常栈。回想一下前文中的栈帧，获取这个异常栈只需要遍历一下它们就可以了。

但是这种操作，比起常规操作要昂贵的多。Java 的 Log 日志框架，通常会把所有错误信息打印到日志中，在异常非常多的情况下，会显著影响性能。

还是看一下上一节生成的字节码：

```
void doLock();    descriptor: ()V    flags:    Code:      stack=2, locals=3, args_size=1         0: aload_0         1: getfield      #3                  // Field lock:Ljava/lang/Object;         4: dup         5: astore_1         6: monitorenter         7: getstatic     #4                  // Field java/lang/System.out:Ljava/io/PrintStream;        10: ldc           #8                  // String lock        12: invokevirtual #6                  // Method java/io/PrintStream.println:(Ljava/lang/String;)V        15: aload_1        16: monitorexit        17: goto          25        20: astore_2        21: aload_1        22: monitorexit        23: aload_2        24: athrow        25: return      Exception table:         from    to  target type             7    17    20   any            20    23    20   any
```

可以看到，编译后的字节码带有一个叫 Exception table 的异常表，里面的每一行数据，都是一个异常处理器：

- **from** 指定字节码索引的开始位置

- **to** 指定字节码索引的结束位置

- **target** 异常处理的起始位置

- **type** 异常类型

也就是说，只要在 from 和 to 之间发生了异常，就会跳转到 target 所指定的位置。

#### finally

通常在做一些文件读取的时候，都会在 finally 代码块中关闭流，以避免内存的溢出。关于这个场景，再分析一下下面这段代码的异常表。

```
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;

public class A {
    public void read() {
        InputStream in = null;
        try {
            in = new FileInputStream("A.java");
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        } finally {
            if (null != in) {
                try {
                    in.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
```

上面的代码捕获了一个 FileNotFoundException 异常，然后在 finally 中捕获了 IOException 异常。当分析字节码的时候，却发现了一个有意思的地方：IOException 足足出现了三次。

```
Exception table:    from    to  target type    17    21    24   Class java/io/IOException    2    12    32   Class java/io/FileNotFoundException    42    46    49   Class java/io/IOException     2    12    57   any    32    37    57   any    63    67    70   Class java/io/IOException
```

Java 编译器使用了一种比较**傻**的方式来组织 finally 的字节码，它分别在 try、catch 的正常执行路径上，复制一份 finally 代码，追加在正常执行逻辑的后面；同时，再复制一份到其他异常执行逻辑的出口处。

这也是下面这段方法不报错的原因，都可以在字节码中找到答案。

```
// B.java
public int read() {
    try {
        int a = 1 / 0;
        return a;
    } finally {
        return 1;
    }
}
```

下面是上面程序的字节码，可以看到，异常之后直接跳转到序号 8 了。

```
stack=2, locals=4, args_size=1         0: iconst_1         1: iconst_0         2: idiv         3: istore_1         4: iload_1         5: istore_2         6: iconst_1         7: ireturn         8: astore_3         9: iconst_1        10: ireturn      Exception table:         from    to  target type             0     6     8   any
```

### 装箱拆箱

在刚开始学习 Java 语言时，可能会被自动装箱和拆箱搞得晕头转向。Java 中有 8 种基本类型，但鉴于 Java 面向对象的特点，它们同样有着对应的 8 个包装类型，比如 int 和 Integer，包装类型的值可以为 null，很多时候，它们都能够相互赋值。

使用下面的代码从字节码层面上来观察一下：

```
public class Box {
    public Integer cal() {
        Integer a = 1000;
        int b = a * 10;
        return b;
    }
}
```

上面是一段简单的代码，首先使用包装类型构造了一个值为 1000 的数字，然后乘以 10 后返回，但是中间的计算过程使用了普通类型 int。

```
public java.lang.Integer read();    descriptor: ()Ljava/lang/Integer;    flags: ACC_PUBLIC    Code:      stack=2, locals=3, args_size=1         0: sipush        1000         3: invokestatic  #2                  // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;         6: astore_1         7: aload_1         8: invokevirtual #3                  // Method java/lang/Integer.intValue:()I        11: bipush        10        13: imul        14: istore_2        15: iload_2        16: invokestatic  #2                  // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;        19: areturn
```

通过观察字节码，可以发现赋值操作使用的是 Integer.valueOf 方法，在进行乘法运算的时候，调用了 Integer.intValue 方法来获取基本类型的值。在方法返回的时候，再次使用了 Integer.valueOf 方法对结果进行了包装。

这就是 Java 中的自动装箱拆箱的底层实现。

但这里有一个 Java 层面的陷阱问题，继续跟踪 Integer.valueOf 方法。

```
@HotSpotIntrinsicCandidate    public static Integer valueOf(int i) {        if (i >= IntegerCache.low && i <= IntegerCache.high)            return IntegerCache.cache[i + (-IntegerCache.low)];        return new Integer(i);    }
```

这个 IntegerCache，缓存了 low 和 high 之间的 Integer 对象，可以通过 -XX:AutoBoxCacheMax 来修改上限。

下面是一个典型问题，请考虑一下运行代码后会输出什么结果？

```
public class BoxCacheError {
    public static void main(String[] args) {
        Integer n1 = 123;
        Integer n2 = 123;
        Integer n3 = 128;
        Integer n4 = 128;
        System.out.println(n1 == n2);
        System.out.println(n3 == n4);
    }
}
```

当使用 **java BoxCacheError** 执行时，是 true,false；当加上参数 **java -XX:AutoBoxCacheMax=256 BoxCacheError** 执行时，结果是 true,true，原因就在于此。

### 数组访问

在访问一个数组长度的时候，直接使用它的属性 **.length** 就能获取，而在 Java 中却无法找到对于数组的定义。

比如 int[] 这种类型，通过 getClass（getClass 是 Object 类中的方法）可以获取它的具体类型是 **[I**。

其实，数组是 JVM 内置的一种对象类型，这个对象同样是继承的 Object 类。

使用下面一段代码来观察一下数组的生成和访问。

```
public class ArrayDemo {
    int getValue() {
        int[] arr = new int[]{
                1111, 2222, 3333, 4444
        };
        return arr[2];
    }

    int getLength(int[] arr) {
        return arr.length;
    }
}
```

首先看一下 getValue 方法的字节码。

```
int getValue();    descriptor: ()I    flags:    Code:      stack=4, locals=2, args_size=1         0: iconst_4         1: newarray       int         3: dup         4: iconst_0         5: sipush        1111         8: iastore         9: dup        10: iconst_1        11: sipush        2222        14: iastore        15: dup        16: iconst_2        17: sipush        3333        20: iastore        21: dup        22: iconst_3        23: sipush        4444        26: iastore        27: astore_1        28: aload_1        29: iconst_2        30: iaload        31: ireturn
```

可以看到，新建数组的代码被编译成了 newarray 指令。数组里的初始内容，被顺序编译成了一系列指令放入：

- **sipush** 将一个短整型常量值推送至栈顶；

- **iastore** 将栈顶 int 型数值存入指定数组的指定索引位置。

为了支持多种类型，从操作数栈存储到数组，有更多的指令：bastore、castore、sastore、iastore、lastore、fastore、dastore、aastore。

数组元素的访问，是通过第 28 ~ 30 行代码来实现的：

- **aload_1** 将第二个引用类型本地变量推送至栈顶，这里是生成的数组；

- **iconst_2** 将 int 型 2 推送至栈顶；

- **iaload** 将 int 型数组指定索引的值推送至栈顶。

值得注意的是，在这段代码运行期间，有可能会产生 ArrayIndexOutOfBoundsException，但由于它是一种非捕获型异常，不必为这种异常提供异常处理器。

再看一下 getLength 的字节码，字节码如下：

```
int getLength(int[]);    descriptor: ([I)I    flags:    Code:      stack=1, locals=2, args_size=2         0: aload_1         1: arraylength         2: ireturn
```

可以看到，获取数组的长度是由字节码指令 arraylength 来完成的。

### foreach

无论是 Java 的数组，还是 List，都可以使用 foreach 语句进行遍历，比较典型的代码如下：

```
import java.util.List;

public class ForDemo {
    void loop(int[] arr) {
        for (int i : arr) {
            System.out.println(i);
        }
    }

    void loop(List<Integer> arr) {
        for (int i : arr) {
            System.out.println(i);
        }
    }
}
```

虽然在语言层面它们的表现形式是一致的，但实际实现的方法并不同。先看一下遍历数组的字节码：

```
void loop(int[]);    descriptor: ([I)V    flags:    Code:      stack=2, locals=6, args_size=2         0: aload_1         1: astore_2         2: aload_2         3: arraylength         4: istore_3         5: iconst_0         6: istore        4         8: iload         4        10: iload_3        11: if_icmpge     34        14: aload_2        15: iload         4        17: iaload        18: istore        5        20: getstatic     #2                  // Field java/lang/System.out:Ljava/io/PrintStream;        23: iload         5        25: invokevirtual #3                  // Method java/io/PrintStream.println:(I)V        28: iinc          4, 1        31: goto          8        34: return
```

可以很容易看到，它将代码解释成了传统的变量方式，即 **for(int i;i<length;i++)** 的形式。

而 List 的字节码如下：

```
void loop(java.util.List<java.lang.Integer>);    Code:       0: aload_1       1: invokeinterface #4,  1            // InterfaceMethod java/util/List.iterator:()Ljava/util/Iterator;       6: astore_2-       7: aload_2       8: invokeinterface #5,  1            // InterfaceMethod java/util/Iterator.hasNext:()Z      13: ifeq          39      16: aload_2      17: invokeinterface #6,  1            // InterfaceMethod java/util/Iterator.next:()Ljava/lang/Object;      22: checkcast     #7                  // class java/lang/Integer      25: invokevirtual #8                  // Method java/lang/Integer.intValue:()I      28: istore_3      29: getstatic     #2                  // Field java/lang/System.out:Ljava/io/PrintStream;      32: iload_3      33: invokevirtual #3                  // Method java/io/PrintStream.println:(I)V      36: goto          7      39: return
```

它实际是把 list 对象进行迭代并遍历的，在循环中使用了 Iterator.next() 方法。

使用 jd-gui 等反编译工具，可以看到实际生成的代码：

```
void loop(List<Integer> paramList) {    for (Iterator<Integer> iterator = paramList.iterator(); iterator.hasNext(); ) {      int i = ((Integer)iterator.next()).intValue();      System.out.println(i);    }   }
```

### 注解

注解在 Java 中得到了广泛的应用，Spring 框架更是由于注解的存在而起死回生。注解在开发中的作用就是做数据约束和标准定义，可以将其理解成代码的规范标准，并帮助写出方便、快捷、简洁的代码。

那么注解信息是存放在哪里的呢？使用两个 Java 文件来看一下其中的一种情况。

**MyAnnotation.java**

```
public @interface MyAnnotation {}
```

**AnnotationDemo.java**

```
@MyAnnotation
public class AnnotationDemo {
    @MyAnnotation
    public void test(@MyAnnotation int a) {
    }
}
```

下面来看一下字节码信息。

```
{  public AnnotationDemo();    descriptor: ()V    flags: ACC_PUBLIC    Code:      stack=1, locals=1, args_size=1         0: aload_0         1: invokespecial #1                  // Method java/lang/Object."<init>":()V         4: return      LineNumberTable:        line 2: 0  public void test(int);    descriptor: (I)V    flags: ACC_PUBLIC    Code:      stack=0, locals=2, args_size=2         0: return      LineNumberTable:        line 6: 0    RuntimeInvisibleAnnotations:      0: #11()    RuntimeInvisibleParameterAnnotations:      0:        0: #11()}SourceFile: "AnnotationDemo.java"RuntimeInvisibleAnnotations:  0: #11()
```

可以看到，无论是类的注解还是方法注解，都是由一个叫做 RuntimeInvisibleAnnotations 的结构来存储的，而参数的存储是由 RuntimeInvisibleParameterAnnotations 来保证的。

## 栈帧与字节码执行

#### 工具介绍

在开始本文的内容之前，先介绍两个分析字节码的小工具。

#### javap

第一个小工具是 javap，javap 是 JDK 自带的反解析工具。它的作用是将 .class 字节码文件解析成可读的文件格式。第一节就是用它的输出了 HelloWorld 的内容。

使用 javap 时一般会添加 -v 参数，尽量多打印一些信息，同时也会使用 -p 参数打印一些私有的字段和方法。使用起来大概是这样：

```
`javap -p -v HelloWorld
`
```

在 Stack Overflow 上有一个非常有意思的问题：在某个类中增加一行注释之后，为什么两次生成的 .class 文件，它们的 MD5 是不一样的？

这是因为在 javac 中可以指定一些额外的内容输出到字节码。经常用的有

- **javac -g:lines** 强制生成 LineNumberTable。
- **javac -g:vars**  强制生成 LocalVariableTable。
- **javac -g** 生成所有的 debug 信息。

为了观察字节码的流转，本文就会使用到这些参数。

#### jclasslib

如果不习惯使用命令行的操作，还可以使用 jclasslib。jclasslib 是一个图形化的工具，能够更加直观地查看字节码中的内容。它还分门别类地对类中的各个部分进行了整理。同时，它还提供了 Idea 的插件，可以从 plugins 中搜索到它。

如果看不到一些诸如 LocalVariableTable 的信息，记得在编译代码的时候加上上面提到的这些参数。

jclasslib 的下载地址：https://github.com/ingokegel/jclasslib

#### 类加载和对象创建的时机

下面来看一个稍微复杂的例子，具体看一下类加载和对象创建的过程。

先写一个最简单的 Java 程序 A.java。它有一个公共方法 test，还有一个静态成员变量和动态成员变量。

```
`class B {
    private int a = 1234;

static long C = 1111;

public long test(long num) {
        long ret = this.a + num + C;
        return ret;
    }
}

public class A {
    private B b = new B();

public static void main(String[] args) {
        A a = new A();
        long num = 4321 ;

long ret = a.b.test(num);

        System.out.println(ret);
    }
}
`
```

前面提到，类的初始化发生在类加载阶段，那对象都有哪些创建方式呢？除了常用的 new，还有下面这些方式：

- 使用 Class 的 newInstance 方法（JDK 9 起已废弃，推荐使用 Constructor 的 newInstance）。
- 使用 Constructor 类的 newInstance 方法。
- 反序列化。
- 使用 Object 的 clone 方法。

其中，后面两种方式没有调用到构造函数。

当虚拟机遇到一条 new 指令时，首先会检查这个指令的参数能否在常量池中定位一个符号引用。然后检查这个符号引用的类字节码是否加载、解析和初始化。如果没有，将执行对应的类加载过程。

拿上面的代码来说，执行 A 代码，在调用 private B b = new B() 时，就会触发 B 类的加载。

![](/jvm-course-images/081fee841516.jpeg)

结合上图回顾一下前面章节的内容。A 和 B 会被加载到元空间的方法区，进入 main 方法后，将会交给执行引擎执行。这个执行过程是在栈上完成的，其中有几个重要的区域，包括虚拟机栈、程序计数器等。下面详细看一下虚拟机栈上的执行过程。

#### 查看字节码

#### 命令行查看字节码

使用下面的命令编译源代码 A.java。如果使用 Idea，可以直接将参数追加在 VM options 里面。

```
`javac -g:lines -g:vars A.java
`
```

这将强制生成 LineNumberTable 和 LocalVariableTable。

然后使用 javap 命令查看 A 和 B 的字节码。

```
`javap -p -v A
javap -p -v B
`
```

这个命令不仅会输出行号、本地变量表信息、反编译汇编代码，还会输出当前类用到的常量池等信息。由于内容很长，这里就不具体展示了。

注意 javap 中的如下字样。

**<1>**

```
`1: invokespecial #1   // Method java/lang/Object."<init>":()V
`
```

可以看到对象的初始化，首先是调用了 Object 类的初始化方法。注意这里是 <init> 而不是 <clinit>。

**<2>**

```
`#2 = Fieldref           #6.#27         // B.a:I
`
```

它其实直接拼接了 #13 和 #14 的内容。

```
`#6 = Class             #29           // B
#27 = NameAndType       #8:#9         // a:I
...
#8 = Utf8               a
#9 = Utf8               I
`
```

**<3>**

会注意到 :I 这样特殊的字符，它们也是有意义的。如果经常使用 jmap 这种命令，应该不会陌生。大体包括：

- B 基本类型 byte
- C 基本类型 char
- D 基本类型 double
- F 基本类型 float
- I 基本类型 int
- J 基本类型 long
- S 基本类型 short
- Z 基本类型 boolean
- V 特殊类型 void
- L 对象类型，以分号结尾，如 Ljava/lang/Object;
- [Ljava/lang/String; 数组类型，每一位使用一个前置的"["字符来描述

注意到 code 区域有非常多的二进制指令。如果接触过汇编语言，会发现它们之间其实有一定的相似性。但这些二进制指令并不是操作系统能够认识的，它们是提供给 JVM 运行的源材料。

#### 可视化查看字节码

下面使用更加直观的工具 jclasslib，来查看字节码中的具体内容。

以 B.class 文件为例来查看它的内容。

**<1>**

首先能够看到 Constant Pool（常量池），这些内容存放于 Metaspace 区域，属于非堆。

![](/jvm-course-images/f50daa817f7f.jpeg)

常量池包含 .class 文件常量池、运行时常量池、String 常量池等部分，大多是一些静态内容。

**<2>**

可以看到两个默认的 <init> 和 <clinit> 方法。以下截图是 test 方法的 code 区域，比命令行版的更加直观。

![](/jvm-course-images/870fc235f938.jpeg)

**<3>**

继续往下看，看到了 LocalVariableTable 的三个变量。其中 slot 0 指向的是 this 关键字。该属性的作用是描述帧栈中局部变量与源码中定义的变量之间的关系。如果没有这些信息，那么在 IDE 中引用这个方法时，将无法获取到方法名，取而代之的则是 arg0 这样的变量名。

![](/jvm-course-images/9811ba61db34.jpeg)

本地变量表的 slot 是可以复用的。注意一个有意思的地方，index 的最大值为 3，证明了本地变量表同时最多能够存放 4 个变量。

另外，还观察到有 LineNumberTable 等选项。该属性的作用是描述源码行号与字节码行号（字节码偏移量）之间的对应关系，有了这些信息，在 debug 时就能够获取到发生异常的源代码行号。

#### test 函数执行过程

#### Code 区域介绍

test 函数同时使用了成员变量 a、静态变量 C，以及输入参数 num。此时说的函数执行，内存其实就是在虚拟机栈上分配的。下面这些内容就是 test 方法的字节码。

```
`public long test(long);
   descriptor: (J)J
   flags: ACC_PUBLIC
   Code:
     stack=4, locals=5, args_size=2
        0: aload_0
        1: getfield      #2                  // Field a:I
        4: i2l
        5: lload_1
        6: ladd
        7: getstatic     #3                  // Field C:J
       10: ladd
       11: lstore_3
       12: lload_3
       13: lreturn
     LineNumberTable:
       line 13: 0
       line 14: 12
     LocalVariableTable:
       Start  Length  Slot  Name   Signature
           0      14     0  this   LB;
           0      14     1   num   J
          12       2     3   ret   J
`
```

介绍比较重要的 3 个数值。

**<1>**

首先注意 stack 字样，它此时的数值为 4，表明了 test 方法的最大操作数栈深度为 4。JVM 运行时，会根据这个数值来分配栈帧中操作栈的深度。

**<2>**

相对应的，locals 变量存储了局部变量的存储空间。它的单位是 Slot（槽），可以被重用。其中存放的内容包括：

- this
- 方法参数
- 异常处理器的参数
- 方法体中定义的局部变量

**<3>**

args_size 指的是方法的参数个数，因为每个方法都有一个隐藏参数 this，所以这里的数字是 2。

#### 字节码执行过程

回顾一下 JVM 运行时的相关内容。main 线程会拥有两个主要的运行时区域：Java 虚拟机栈和程序计数器。其中，虚拟机栈中的每一项内容叫作栈帧，栈帧中包含四项内容：局部变量报表、操作数栈、动态链接和完成出口。

字节码指令就是靠操作这些数据结构运行的。下面看具体的字节码指令。

![](/jvm-course-images/1d1782dc0c4f.jpeg)

（1）**0: aload_0**

把第 1 个引用型局部变量推到操作数栈，这里的意思是把 this 装载到了操作数栈中。

对于 static 方法，aload_0 表示对方法的第一个参数的操作。

![](/jvm-course-images/b5ec2074d3f1.jpeg)

（2）**1: getfield      #2**

将栈顶的指定的对象的第 2 个实例域（Field）的值压入栈顶。#2 就是指的成员变量 a。

```
`#2 = Fieldref           #6.#27         // B.a:I
...
#6 = Class             #29           // B
#27 = NameAndType       #8:#9         // a:I
`
```

![](/jvm-course-images/561a5cae04e9.jpeg)

（3）**i2l**

将栈顶 int 类型的数据转化为 long 类型，这里就涉及隐式类型转换。图中的信息没有变动，不再详细介绍。

（4）**lload_1**

将第一个局部变量入栈，也就是参数 num。这里的 l 表示 long，同样用于局部变量装载。可以看到这个位置的局部变量，一开始就已经有值了。

![](/jvm-course-images/cc4a6c727420.jpeg)

（5）**ladd**

把栈顶两个 long 型数值出栈后相加，并将结果入栈。

![](/jvm-course-images/4c664d06c911.jpeg)

（6）**getstatic #3**

根据偏移获取静态属性的值，并把这个值 push 到操作数栈上。

![](/jvm-course-images/bf3748d73516.jpeg)

（7）**ladd**

再次执行 ladd。

![](/jvm-course-images/a3d131f886c7.jpeg)

（8）**lstore_3**

把栈顶 long 型数值存入第 4 个局部变量。

前面图中 slot 为 4、索引为 3 的就是 ret 变量。

![](/jvm-course-images/82fd243d9e47.jpeg)

（9）**lload_3**

与上面相反。上面是变量存入，现在要做的，就是把这个变量 ret 压入虚拟机栈中。

![](/jvm-course-images/6c9feb336582.jpeg)

（10）**lreturn**

从当前方法返回 long。

到此为止，函数就完成了相加动作，执行成功。JVM 提供了非常丰富的字节码指令。详细的字节码指令列表可以参考以下网址：

https://docs.oracle.com/javase/specs/jvms/se8/html/jvms-6.html

#### 注意点

注意上面的第 8 步，首先把变量存放到了变量报表，然后又拿出这个值入栈。为什么会有这种多此一举的操作？原因就在于定义了 ret 变量。JVM 不知道后面还会不会用到这个变量，所以只好按顺序执行。

为了看到这些差异，可以把程序稍微改动一下，直接返回这个值。

```
`public long test(long num) {
       return this.a + num + C;
}
`
```

再次看下对应的字节码指令，简单了很多。

```
`0: aload_0
1: getfield     #2                 // Field a:I
4: i2l
5: lload_1
6: ladd
7: getstatic     #3                 // Field C:J
10: ladd
11: lreturn
`
```

那以后编写程序时，是不是要尽量少的定义成员变量？

这是没有必要的。栈的操作复杂度是 O(1)，对程序性能几乎没有影响。平常的代码编写还是以可读性作为首要任务。

## 方法调用的底层实现

### 字节码结构

#### 基本结构

在开始之前，先简要介绍一下 class 文件的内容，这个结构和前面使用的 jclasslib 是一样的。关于 class 文件结构的资料已经非常多了（可参考《Java 虚拟机规范》第 4 章对 class 文件格式的介绍），这里不再展开讲解，大体介绍如下。

![](/jvm-course-images/8d2c93a015ac.jpeg)

**magic：**魔数，用于标识当前 class 的文件格式，JVM 可据此判断该文件是否可以被解析，目前固定为 0xCAFEBABE。

**major_version：**主版本号。

**minor_version：**副版本号，这两个版本号用来标识编译时的 JDK 版本，常见的一个异常比如 Unsupported major.minor version 52.0 就是因为运行时的 JDK 版本低于编译时的 JDK 版本（52 是 Java 8 的主版本号）。

**constant_pool_count**：常量池计数器，等于常量池中的成员数加 1。

**constant_pool**：常量池，是一种表结构，包含 class 文件结构和子结构中引用的所有字符串常量，类或者接口名，字段名和其他常量。

**access_flags**：表示某个类或者接口的访问权限和属性。

**this_class**：类索引，该值必须是对常量池中某个常量的一个有效索引值，该索引处的成员必须是一个 CONSTANT_Class_info 类型的结构体，表示这个 class 文件所定义的类和接口。

**super_class**：父类索引。

**interfaces_count**：接口计数器，表示当前类或者接口直接继承接口的数量。

**interfaces**：接口表，是一个表结构，成员同 this_class，是对常量池中 CONSTANT_Class_info 类型的一个有效索引值。

**fields_count**：字段计数器，当前 class 文件所有字段的数量。

**fields**：字段表，是一个表结构，表中每个成员必须是 filed_info 数据结构，用于表示当前类或者接口的某个字段的完整描述，但它不包含从父类或者父接口继承的字段。

**methods_count**：方法计数器，表示当前类方法表的成员个数。

**methods**：方法表，是一个表结构，表中每个成员必须是 method_info 数据结构，用于表示当前类或者接口的某个方法的完整描述。

**attributes_count**：属性计数器，表示当前 class 文件 attributes 属性表的成员个数。

**attributes**：属性表，是一个表结构，表中每个成员必须是 attribute_info 数据结构，这里的属性是对 class 文件本身，方法或者字段的补充描述，比如 SourceFile 属性用于表示 class 文件的源代码文件名。

![](/jvm-course-images/4b141fda9838.jpeg)

当然，class 文件结构的细节是非常多的，如上图展示了一个简单方法的字节码描述，可以看到真正的执行指令在整个文件结构中的位置。

#### 实际观测

为了避免枯燥的二进制对比分析，直接定位到真正的数据结构，这里介绍一个小工具 asmtools，使用这种方式学习字节码会节省很多时间。为了方便使用，仓库中已经编译好了一个 jar 包。

执行下面的命令，将看到类的 JCOD 语法结果。

```
java -jar asmtools-7.0.jar jdec LambdaDemo.class
```

输出的结果类似于下面的结构，它与上面介绍的字节码组成是一一对应的，对照官网或者资料去学习，速度飞快。若想要细挖字节码，一定要掌握好它。

```
class LambdaDemo {
  0xCAFEBABE;
  0; // minor version
  52; // version
  [] { // Constant Pool
    ; // first element is empty
    Method #8 #25; // #1
    InvokeDynamic 0s #30; // #2
    InterfaceMethod #31 #32; // #3
    Field #33 #34; // #4
    String #35; // #5
    Method #36 #37; // #6
    class #38; // #7
    class #39; // #8
    Utf8 "<init>"; // #9
    Utf8 "()V"; // #10
    Utf8 "Code"; // #11
```

了解了类的文件组织方式，下面来看一下类文件在加载到内存中以后的表现形式。

### 内存表示

准备以下代码，使用 **javac -g InvokeDemo.java** 进行编译，然后使用 java 命令执行。程序将阻塞在 sleep 函数上，来看一下它的内存分布：

```
interface I {
    default void infMethod() { }

void inf();
}

abstract class Abs {
    abstract void abs();
}

public class InvokeDemo extends Abs implements I {

static void staticMethod() { }

private void privateMethod() { }

public void publicMethod() { }

@Override
    public void inf() { }

@Override
    void abs() { }

public static void main(String[] args) throws Exception{
        InvokeDemo demo = new InvokeDemo();

InvokeDemo.staticMethod();
        demo.abs();
        ((Abs) demo).abs();
        demo.inf();
        ((I) demo).inf();
        demo.privateMethod();
        demo.publicMethod();
        demo.infMethod();
        ((I) demo).infMethod();

        Thread.sleep(Integer.MAX_VALUE);
    }
}
```

为了更加明显的看到这个过程，下面介绍一个 jhsdb 工具，这是在 Java 9 之后 JDK 先加入的调试工具，可以在命令行中使用 **jhsdb hsdb** 来启动它。注意，要加载相应的进程时，必须确保是同一个版本的应用进程，否则会产生报错。

![](/jvm-course-images/a04f4d8dd257.jpeg)

attach 启动 Java 进程后，可以在 **Class Browser** 菜单中查看加载的所有类信息。在搜索框中输入 **InvokeDemo**，找到要查看的类。

![](/jvm-course-images/971676e33b88.jpeg)

**@** 符号后面的就是具体的内存地址，可以复制一个，然后在 **Inspector** 视图中查看具体的属性，可以**大体**认为这就是类在方法区的具体存储。

![](/jvm-course-images/ed0a3de64fef.jpeg)

在 Inspector 视图中，找到方法相关的属性 **_methods**，可惜它无法点开，也无法查看。

![](/jvm-course-images/6911007bb773.jpeg)

接下来使用命令行来检查这个数组里面的值。打开菜单中的 Console，然后输入 examine 命令，可以看到这个数组里的内容，对应的地址就是 Class 视图中的方法地址。

```
examine 0x000000010e650570/10
```

![](/jvm-course-images/8dec10af36c9.jpeg)

在 Inspect 视图中可以看到方法所对应的内存信息，这确实是一个 Method 方法的表示。

![](/jvm-course-images/b4a0c575ad35.jpeg)

相比较起来，对象就简单了，它只需要保存一个到达 Class 对象的指针即可。需要先从对象视图中进入，然后找到它，一步步进入 Inspect 视图。

![](/jvm-course-images/ab9abbf6e6e5.jpeg)

由以上的这些分析，可以得出下面这张图。执行引擎想要运行某个对象的方法，需要先在栈上找到这个对象的引用，然后再通过对象的指针，找到相应的方法字节码。

![](/jvm-course-images/5d65f58a9b22.jpeg)

### 方法调用指令

关于方法的调用，Java 共提供了 5 个指令，来调用不同类型的函数：

- **invokestatic**  用来调用静态方法；

- **invokevirtual**  用于调用非私有实例方法，比如 public 和 protected，大多数方法调用属于这一种；

- **invokeinterface** 和上面这条指令类似，不过作用于接口类；

- **invokespecial** 用于调用私有实例方法、构造器及 super 关键字等；

- **invokedynamic** 用于调用动态方法。

依然使用上面的代码片段来看一下前四个指令的使用场景。代码中包含一个接口 **I、**一个抽象类** Abs、**一个实现和继承了两者类的** InvokeDemo**。

回想一下《类加载机制》一篇讲到的类加载机制，在 class 文件被加载到方法区以后，就完成了从符号引用到具体地址的转换过程。

可以看一下编译后的 main 方法字节码，尤其需要注意的是对于接口方法的调用。使用实例对象直接调用，和强制转化成接口调用，所调用的字节码指令分别是 **invokevirtual** 和 **invokeinterface**，它们是有所不同的。

```
public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
      stack=2, locals=2, args_size=1
         0: new           #2                  // class InvokeDemo
         3: dup
         4: invokespecial #3                  // Method "<init>":()V
         7: astore_1
         8: invokestatic  #4                  // Method staticMethod:()V
        11: aload_1
        12: invokevirtual #5                  // Method abs:()V
        15: aload_1
        16: invokevirtual #6                  // Method Abs.abs:()V
        19: aload_1
        20: invokevirtual #7                  // Method inf:()V
        23: aload_1
        24: invokeinterface #8,  1            // InterfaceMethod I.inf:()V
        29: aload_1
        30: invokespecial #9                  // Method privateMethod:()V
        33: aload_1
        34: invokevirtual #10                 // Method publicMethod:()V
        37: aload_1
        38: invokevirtual #11                 // Method infMethod:()V
        41: aload_1
        42: invokeinterface #12,  1           // InterfaceMethod I.infMethod:()V
        47: return
```

另外还有一点，和想象中的不同，大多数普通方法调用使用的是 **invokevirtual** 指令，它其实和 **invokeinterface** 是一类的，都属于虚方法调用。很多时候，JVM 需要根据调用者的动态类型来确定调用的目标方法，这就是动态绑定的过程。

invokevirtual 指令有多态查找的机制，该指令运行时，解析过程如下：

- 找到操作数栈顶的第一个元素所指向的对象实际类型，记做 c；

- 如果在类型 c 中找到与常量中的描述符和简单名称都相符的方法，则进行访问权限校验，如果通过则返回这个方法直接引用，查找过程结束，不通过则返回 java.lang.IllegalAccessError；

- 否则，按照继承关系从下往上依次对 c 的各个父类进行第二步的搜索和验证过程；

- 如果始终没找到合适的方法，则抛出 java.lang.AbstractMethodError 异常，这就是 Java 语言中方法重写的本质。

相对比，**invokestatic** 指令加上 **invokespecial** 指令，就属于静态绑定过程。

所以**静态绑定**，指的是能够直接识别目标方法的情况，而**动态绑定**指的是需要在运行过程中根据调用者的类型来确定目标方法的情况。

可以想象，相对于静态绑定的方法调用来说，动态绑定的调用会更加耗时一些。由于方法的调用非常的频繁，JVM 对动态调用的代码进行了比较多的优化，比如使用方法表来加快对具体方法的寻址，以及使用更快的缓冲区来直接寻址（内联缓存）。

### invokedynamic

在写一些 Python 脚本或者 JS 脚本时，常常会羡慕这些动态语言。如果把查找目标方法的决定权从虚拟机转嫁给用户代码，就会有更高的自由度。

之所以单独把 invokedynamic 抽离出来介绍，是因为它比较复杂。和反射类似，它用于一些动态的调用场景，但它和反射有着本质的不同，效率也比反射要高得多。

这个指令通常在 Lambda 语法中出现，来看一下一小段代码：

```
public class LambdaDemo {
    public static void main(String[] args) {
        Runnable r = () -> System.out.println("Hello Lambda");
        r.run();
    }
}
```

使用 javap -p -v 命令可以在 main 方法中看到 invokedynamic 指令：

```
public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
      stack=1, locals=2, args_size=1
         0: invokedynamic #2,  0              // InvokeDynamic #0:run:()Ljava/lang/Runnable;
         5: astore_1
         6: aload_1
         7: invokeinterface #3,  1            // InterfaceMethod java/lang/Runnable.run:()V
        12: return
```

另外，在 javap 的输出中找到了一些奇怪的东西：

```
BootstrapMethods:
  0: #27 invokestatic java/lang/invoke/LambdaMetafactory.metafactory:
  (Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang
  /invoke/MethodType;Ljava/lang/invoke/MethodType;Ljava/lang/invoke/
  MethodHandle;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/CallSite;
    Method arguments:
      #28 ()V
      #29 invokestatic LambdaDemo.lambda$main$0:()V
      #28 ()V
```

BootstrapMethods 属性在 Java 1.7 以后才有，位于类文件的属性列表中，这个属性用于保存 invokedynamic 指令引用的引导方法限定符。

和上面介绍的四个指令不同，invokedynamic 并没有确切的接受对象，取而代之的是一个叫 **CallSite** 的对象。

```
static CallSite bootstrap(MethodHandles.Lookup caller, String name, MethodType type);
```

其实，invokedynamic 指令的底层是使用方法**方法句柄**（MethodHandle）来实现的。方法句柄是一个能够被执行的引用，它可以指向静态方法和实例方法，以及虚构的 get 和 set 方法，从 IDE 中可以看到这些函数。

![](/jvm-course-images/1b8190e7cbf3.jpeg)

**句柄类型**（MethodType）是对方法的具体描述，配合方法名称，能够定位到一类函数。访问方法句柄和调用原来的指令基本一致，但它的调用异常，包括一些权限检查，在运行时才能被发现。

下面这段代码可以完成一些动态语言的特性，通过方法名称和传入的对象主体进行不同的调用，而 Bike 和 Man 类可以没有任何关系。

```
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

public class MethodHandleDemo {
    static class Bike {
        String sound() {
            return "ding ding";
        }
    }

static class Animal {
        String sound() {
            return "wow wow";
        }
    }

static class Man extends Animal {
        @Override
        String sound() {
            return "hou hou";
        }
    }

String sound(Object o) throws Throwable {
        MethodHandles.Lookup lookup = MethodHandles.lookup();
        MethodType methodType = MethodType.methodType(String.class);
        MethodHandle methodHandle = lookup.findVirtual(o.getClass(), "sound", methodType);

String obj = (String) methodHandle.invoke(o);
        return obj;
    }

    public static void main(String[] args) throws Throwable {
        String str = new MethodHandleDemo().sound(new Bike());
        System.out.println(str);
        str = new MethodHandleDemo().sound(new Animal());
        System.out.println(str);
        str = new MethodHandleDemo().sound(new Man());
        System.out.println(str);
```

可以看到 Lambda 语言实际上是通过方法句柄来完成的，在调用链上自然也多了一些调用步骤。那么在性能上，是否就意味着 Lambda 性能低呢？对于大部分"非捕获"的 Lambda 表达式来说，JIT 编译器的逃逸分析能够优化这部分差异，性能和传统方式无异；但对于"捕获型"的表达式来说，则需要通过方法句柄不断生成适配器，性能自然就低了很多（不过和便捷性相比，一丁点性能损失是可接受的）。

除了 Lambda 表达式，还没有其他的方式来产生 invokedynamic 指令。但可以使用一些外部的字节码修改工具，比如 ASM，来生成一些带有这个指令的字节码，这通常能够完成一些非常酷的功能，比如完成一门弱类型检查的 JVM-Base 语言。

## 并发编程的字节码底层

### 字节码

synchronized 可以是多线程中使用最多的关键字了。在开始介绍之前，先思考一个问题：在执行速度方面，是基于 CAS 的 Lock 效率高一些，还是同步关键字效率高一些？

synchronized 关键字给代码或者方法上锁时，会有显示或者隐藏的上锁对象。当一个线程试图访问同步代码块时，它必须先得到锁，而在退出或抛出异常时必须释放锁。

- 给普通方法加锁时，上锁的对象是 this，如代码中的方法 m1 。

- 给静态方法加锁时，锁的是 class 对象，如代码中的方法 m2 。

- 给代码块加锁时，可以指定一个具体的对象。

关于对象对锁的争夺，依然拿前面讲的一张图来看一下这个过程。

![](/jvm-course-images/a01a88eb5db2.png)

下面来看一段简单的代码，并观测一下它的字节码。

```
public class SynchronizedDemo {
	synchronized void m1() {
		System.out.println("m1");
	}
    static synchronized void  m2() {
		System.out.println("m2");
	}
	final Object lock = new Object();

	void doLock() {
		synchronized (lock) {
			System.out.println("lock");
		}
	}
}
```

下面是普通方法 m1 的字节码。

```
synchronized void m1();
    descriptor: ()V
    flags: ACC_SYNCHRONIZED
    Code:
      stack=2, locals=1, args_size=1
         0: getstatic     #4                 
         3: ldc           #5                         
         5: invokevirtual #6           
         8: return
```

可以看到，在字节码的体现上，它只给方法加了一个 flag：ACC_SYNCHRONIZED。

静态方法 m2 和 m1 区别不大，只不过 flags 上多了一个参数：ACC_STATIC。

相比较起来，doLock 方法就麻烦了一些，其中出现了 monitorenter 和 monitorexit 等字节码指令。

```
void doLock();
    descriptor: ()V
    flags:
    Code:
      stack=2, locals=3, args_size=1
         0: aload_0
         1: getfield      #3                  // Field lock:Ljava/lang/Object;
         4: dup
         5: astore_1
         6: monitorenter
         7: getstatic     #4                  // Field java/lang/System.out:Ljava/io/PrintStream;
        10: ldc           #8                  // String lock
        12: invokevirtual #6                  // Method java/io/PrintStream.println:(Ljava/lang/String;)V
        15: aload_1
        16: monitorexit
        17: goto          25
        20: astore_2
        21: aload_1
        22: monitorexit
        23: aload_2
        24: athrow
        25: return
      Exception table:
         from    to  target type
             7    17    20   any
            20    23    20   any
```

很多人都认为，synchronized 是一种悲观锁、一种重量级锁；而基于 CAS 的 AQS 是一种乐观锁，这种理解并不全对。JDK1.6 之后，JVM 对同步关键字进行了很多的优化，这把锁有了不同的状态，大多数情况下的效率，已经和 concurrent 包下的 Lock 不相上下了，甚至更高。

### 对象内存布局

![](/jvm-course-images/fa4b6f32239b.png)

下面分别解释一下各个部分的含义。

**Mark Word**：用来存储 hashCode、GC 分代年龄、锁类型标记、偏向锁线程 ID、CAS 锁指向线程 LockRecord 的指针等，synchronized 锁的机制与这里密切相关，这有点像 TCP/IP 中的协议头。

**Class Pointer：**用来存储对象指向它的类元数据指针、JVM 就是通过它来确定是哪个 Class 的实例。

**Instance Data：**存储的是对象真正有效的信息，比如对象中所有字段的内容。

**Padding：**HotSpot 规定对象的起始地址必须是 8 字节的整数倍，这是为了高效读取对象而做的一种"对齐"操作。

### 可重入锁

synchronized 是一把可重入锁。因此，在一个线程使用 synchronized 方法时可以调用该对象的另一个 synchronized 方法，即一个线程得到一个对象锁后再次请求该对象锁，是可以永远拿到锁的。

Java 中线程获得对象锁的操作是以**线程**而不是以调用为单位的。synchronized 锁的对象头的 Mark Word 中会记录该锁的线程持有者和计数器。当一个线程请求成功后，JVM 会记下持有锁的线程，并将计数器计为 1 。此时如果有其他线程请求该锁，则必须等待。而该持有锁的线程如果再次请求这个锁，就可以再次拿到这个锁，同时计数器会递增。当线程退出一个  synchronized 方法/块时，计数器会递减，如果计数器为 0 则释放该锁。

### 锁升级

根据使用情况，锁升级大体可以按照下面的路径：偏向锁→轻量级锁→重量级锁，锁只能升级不能降级，所以一旦锁升级为重量级锁，就只能依靠操作系统进行调度。

再看一下 Mark Word 的结构。其中，Biased 有 1 bit 大小，Tag 有 2 bit 大小，锁升级就是通过 Thread Id、Biased、Tag 这三个变量值来判断的。

![](/jvm-course-images/309d597364a1.png)

#### 偏向锁

偏向锁，其实是一把偏心锁（一般不这么描述）。在 JVM 中，当只有一个线程使用了锁的情况下，偏向锁才能够保证更高的效率。

当第 1 个线程第一次访问同步块时，会先检测对象头 Mark Word 中的标志位（Tag）是否为 01，以此来判断此时对象锁是否处于无锁状态或者偏向锁状态（匿名偏向锁）。

这也是锁默认的状态，线程一旦获取了这把锁，就会把自己的线程 ID 写到 Mark Word 中，在其他线程来获取这把锁之前，该线程都处于偏向锁状态。

#### 轻量级锁

当下一个线程参与到偏向锁竞争时，会先判断 Mark Word 中保存的线程 ID 是否与这个线程 ID 相等，如果不相等，则会立即撤销偏向锁，升级为轻量级锁。

轻量级锁的获取是怎么进行的呢？它们使用的是自旋方式。

参与竞争的每个线程，会在自己的线程栈中生成一个 LockRecord ( LR )，然后每个线程通过 CAS（自旋）的操作将锁对象头中的 Mark Word 设置为指向自己的 LR 指针，哪个线程设置成功，就意味着哪个线程获得锁。在这种情况下，JVM 不会依赖内核进行线程调度。

当锁处于轻量级锁的状态时，就不能够再通过简单的对比 Tag 值进行判断了，每次对锁的获取，都需要通过自旋的操作。

当然，自旋也是面向不存在锁竞争的场景，比如一个线程运行完了，另外一个线程去获取这把锁。但如果自旋失败达到一定的次数（JVM 自动管理）时，就会膨胀为重量级锁。

#### 重量级锁

重量级锁即为对 synchronized 的直观认识，在这种情况下，线程会挂起，进入到操作系统内核态，等待操作系统的调度，然后再映射回用户态。系统调用是昂贵的，重量级锁的名称也由此而来。

如果系统的共享变量竞争非常激烈，那么锁会迅速膨胀到重量级锁，这些优化也就名存实亡了。如果并发非常严重，则可以通过参数 -XX:-UseBiasedLocking 禁用偏向锁（JDK 15 起偏向锁已默认禁用，JDK 18 起该参数与偏向锁实现已从 HotSpot 移除，此处按历史机制理解）。这种方法在理论上会有一些性能提升，但实际上并不确定。

因为，synchronized 在 JDK，包括一些框架代码中的应用是非常广泛的。在一些不需要同步的场景中，即使加上了 synchronized 关键字，由于锁升级的原因，效率也不会太差。

下面这张图展示了三种锁的状态和 Mark Word 值的变化。

![](/jvm-course-images/9fe70e55ceae.png)

## 使用 Java Agent 修改字节码

### 获取统计信息

在许多 APM 产品里，比如 Pinpoint、SkyWalking 等，就是使用 Java Agent 对代码进行的增强。通过在方法执行前后动态加入的统计代码，来进行监控信息的收集；通过兼容 OpenTracing 协议，可以实现分布式链路追踪的功能。

它的原理类似于 AOP，最终以字节码的形式存在，性能损失取决于你的代码逻辑。

### 热部署

通过自定义的 ClassLoader，可以实现代码的热替换。使用 agentmain，实现热部署功能会更加便捷，通过 agentmain 获取到 Instrumentation 以后，就可以对类进行动态重定义了。

### 诊断

配合 JVMTI 技术，可以 attach 到某个进程进行运行时的统计和调试，比较流行的 btrace 和 arthas，其底层就是这种技术。

## 代码示例

要构建一个 agent 程序，大体可分为以下步骤：

- 使用字节码增强工具，编写增强代码；

- 在 manifest 中指定 Premain-Class/Agent-Class 属性；

- 使用参数加载或者使用 attach 方式。

下面来详细介绍一下这个过程。

### 编写 Agent

Java Agent 最终的体现方式是一个 jar 包，使用 IDEA 创建一个默认的 maven 工程即可。

创建一个普通的 Java 类，添加 premain 或者 agentmain 方法，它们的参数完全一样。

![](/jvm-course-images/b8de255765a6.jpeg)

### 编写 Transformer

实际的代码逻辑需要实现 ClassFileTransformer 接口。假如要统计某个方法的执行时间，使用 JavaAssist 工具来增强字节码，则可以通过以下代码来实现：

- 获取 MainRun 类的字节码实例；

- 获取 hello 方法的字节码实例；

- 在方法前后加入时间统计，首先定义变量 _begin，然后追加要写的代码。

需要加入 maven 依赖，借用 javassist 完成字节码增强：

```
<dependency>
    <groupId>org.javassist</groupId>
    <artifactId>javassist</artifactId>
    <version>3.24.1-GA</version>
</dependency>
```

![](/jvm-course-images/ae8fec4407f7.jpeg)

字节码增强也可以使用 Cglib、ASM 等其他工具。

### MANIFEST.MF 文件

编写的代码是如何让外界知晓的呢？那就是依靠 MANIFEST.MF 文件，具体路径在

src/main/resources/META-INF/MANIFEST.MF：

```
Manifest-Version: 1.0
premain-class: com.sayhiai.example.javaagent.AgentApp
```

一般的，maven 打包会覆盖这个文件，所以需要为它指定一个。

```
<build><plugins><plugin>
<groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-jar-plugin</artifactId>
    <configuration>
        <archive>
            <manifestFile>src/main/resources/META-INF/MANIFEST.MF</manifestFile>
            </archive>
    </configuration></plugin></plugins></build>
```

然后，在命令行执行 mvn install 安装到本地代码库，或者使用 mvn deploy 发布到私服上。

附 MANIFEST.MF 参数清单：

```
Premain-Class
Agent-Class
Boot-Class-Path
Can-Redefine-Classes
Can-Retransform-Classes
Can-Set-Native-Method-Prefix
```

### 使用

使用方式取决于使用的是 premain 还是 agentmain，它们之间有一些区别，具体如下。

#### premain

在例子中，直接在启动命令行中加入参数即可，在 jvm 启动时启用代理。

```
java -javaagent:agent.jar MainRun
```

在 IDEA 中，可以将参数附着在 jvm options 里。

![](/jvm-course-images/0f14f7a3da8a.jpeg)

接下来看一下测试代码。

![](/jvm-course-images/193a41e111d8.jpeg)

这是执行类，执行后直接输出 hello world。通过增强以后，还额外的输出了执行时间，以及一些 debug 信息。其中，debug 信息在 main 方法执行之前输出。

![](/jvm-course-images/7efbc5f677c8.jpeg)

#### agentmain

这种模式一般用在一些诊断工具上。使用 **jdk/lib/tools.jar** 中的工具类，可以动态的为运行中的程序加入一些功能。它的主要运行步骤如下：

- 获取机器上运行的所有 JVM 进程 ID；

- 选择要诊断的 jvm；

- 将 jvm 使用 attach 函数链接上；

- 使用 loadAgent 函数加载 agent，动态修改字节码；

- 卸载 jvm。

代码样例如下：

```
import com.sun.tools.attach.VirtualMachine;
import com.sun.tools.attach.VirtualMachineDescriptor;

import java.util.List;

public class JvmAttach {

    public static void main(String[] args)
            throws Exception {
        List<VirtualMachineDescriptor> list = VirtualMachine.list();
        for (VirtualMachineDescriptor vmd : list) {
            if (vmd.displayName().endsWith("MainRun")) {
                VirtualMachine virtualMachine = VirtualMachine.attach(vmd.id());
                virtualMachine.loadAgent("test.jar ", "...");
                //.....
                virtualMachine.detach();
            }
        }
    }
```

这些代码功能虽然强大，但都是比较危险的，这就是为什么 Btrace 说了这么多年，还是只在小范围内被小心的使用。相对来说，Arthas 显的友好而且安全的多。

## 使用注意点

**（1）jar 包依赖方式**

一般，Agent 的 jar 包会以 fatjar 的方式提供，即将所有的依赖打包到一个大的 jar 包中。如果功能复杂、依赖多，那么这个 jar 包将会特别的大。

使用独立的 **bom** 文件维护这些依赖是另外一种方法。使用方自行管理依赖问题，但这通常会发生一些找不到 jar 包的错误，更糟糕的是，大多数在运行时才发现。

**（2）类名称重复**

不要使用和 jdk 及 instrument 包中相同的类名（包括包名），有时候能够侥幸过关，但也会陷入无法控制的异常中。

**（3）做有限的功能**

可以看到，给系统动态的增加功能是非常酷的，但大多数情况下非常耗费性能。一些简单的诊断工具，会占用 1 核的 CPU，这是很平常的事情。

**（4）ClassLoader**

如果使用的 JVM 比较旧，频繁地生成大量的代理类，会造成元空间的膨胀，容易发生内存占用问题。

ClassLoader 有双亲委派机制，如果想要替换相应的类，一定要搞清楚它的类加载器应该用哪个，否则替换的类是不生效的。

具体的调试方法，可以在 Java 进程启动时加入 -verbose:class 参数，用来监视引用程序对类的加载。

## Arthas

回顾一下在故障排查时所做的一些准备和工具支持。

在前面的章节中，了解了 jstat、jmap 等查看内存状态的工具，介绍了超过 20 个排查工具的使用，以及 jstack 的一些典型状态。对于这种瞬时态问题的分析，需要综合很多工具，对刚进入这个行业的人来说很不友好。

Arthas 就是使用 Java Agent 技术编写的一个工具，具体采用的方式就是上面提到的 attach 方式，它会无侵入的 attach 到具体的执行进程上，方便进行问题分析。

甚至可以像 debug 本地的 Java 代码一样，观测到方法执行的参数值，甚至做一些统计分析。这通常可以解决下面的问题：

- 哪个线程使用了最多的 CPU

- 运行中是否有死锁，是否有阻塞

- 如何监测一个方法哪里耗时最高

- 追加打印一些 debug 信息

- 监测 JVM 的实时运行状态

Arthas 官方文档十分详细，可在 https://arthas.aliyun.com/doc/ 查阅参考。

但无论工具如何强大，一些基础知识是需要牢固掌握的，否则工具中出现的那些术语，也会让人一头雾水。

工具常变，但基础更加重要。如果想要一个适应性更强的技术栈，还是要多花点时间在原始的排查方法上。

## 版本差异(旧版 → Java 21)

| 特性 | 旧版(Java 8/11) | Java 21 |
|------|----------------|---------|
| 字节码版本 | 52（Java 8）/ 55（Java 11） | 65（Java 21） |
| 类文件格式 | 常量池、方法表 | 不变；21 新增常量池项（CONSTANT_Dynamic 等） |
| invokedynamic | 8 引入（Lambda） | 不变；字符串模板等新特性也基于它 |
| 隐藏类 | 无 | JDK 15+（JEP 371），`MethodHandles.Lookup.defineHiddenClass` |
| 强封装 | 可反射访问内部 API | JDK 17+ 默认强封装（JEP 403），反射受限 |
| Java Agent | 可直接修改 JDK 类 | JDK 21 仍支持，但需 `--enable-native-access` 等配合 |

> **注意**：Java 17+ 强封装 JDK 内部 API，字节码/反射工具（如 CGLIB、Arthas 依赖的 Instrumentation）需适配；`Unsafe` 等内部 API 访问需 `--add-opens` 显式开放。