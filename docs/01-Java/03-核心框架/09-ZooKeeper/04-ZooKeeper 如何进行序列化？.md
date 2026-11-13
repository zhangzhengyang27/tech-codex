---
title: "ZooKeeper 序列化与 Jute 实现原理"
description: "通过网络传输数据前必须先进行序列化。本文介绍 Java 序列化与 ZooKeeper 采用的 Jute 序列化方案，并深入 Jute 框架内部核心，分析 Binary、XML、CSV 三种序列化方式的底层实现。"
keywords: [ZooKeeper, 序列化, Jute, Binary, XML, CSV]
category: "Java"
tags: [Java, ZooKeeper]
---

# ZooKeeper 序列化与 Jute 实现原理

通过前几节的学习，我们大概清楚了使用 ZooKeeper 实现一些功能的主要方式，也就是通过客户端与服务端之间的相互通信。那么首先要解决的问题就是通过网络传输数据，而要想通过网络传输我们定义好的 Java 对象数据，必须要先对其进行序列化。例如，我们通过 ZooKeeper 客户端发送 ACL 权限控制请求时，需要把请求信息封装成 packet 类型，经过序列化后才能通过网络将 ACL 信息发送给 ZooKeeper 服务端进行处理。

本篇先讲清楚"什么是序列化、ZooKeeper 为什么选择 Jute"，再深入 Jute 框架的内部核心，看一看其内部的实现原理和算法，包括 Binary、XML、CSV 三种序列化方式的底层实现。通过研究 Jute 序列化框架的内部实现原理，能够让我们在日常工作中更加高效安全地使用 Jute 序列化框架。

## 什么是序列化，为什么要进行序列化操作

序列化是指将我们定义好的 Java 类型转化成数据流的形式。之所以这么做是因为在网络传输过程中，TCP 协议采用"流通信"的方式，提供了可以读写的字节流。而这种设计的好处在于避免了在网络传输过程中经常出现的问题：比如消息丢失、消息重复和排序等问题。那么什么时候需要序列化呢？如果我们需要通过网络传递对象或将对象信息进行持久化的时候，就需要将该对象进行序列化。

我们较为熟悉的序列化操作是在 Java 中，当我们要序列化一个对象的时候，首先要实现一个 Serializable 接口。

```java
public class User implements Serializable{
  private static final long serialVersionUID = 1L;
  private Long ids;
  private String name;
  ...
}

```

实现了 Serializable 接口后其实没有做什么实际的工作，它是一个没有任何内容的空接口，起到的作用就是标识该类是需要进行序列化的，这个就与我们后边要重点讲解的 ZooKeeper 序列化实现方法有很大的不同，这里请你先记住当前的写法，后边我们会展开讲解。

```java
public interface Serializable {
}

```

定义好序列化接口后，我们再看一下如何进行序列化和反序列化的操作。Java 中进行序列化和反序列化的过程中，主要用到了 ObjectInputStream 和 ObjectOutputStream 两个 IO 类。

ObjectOutputStream 负责将对象进行序列化并存储到本地。而 ObjectInputStream 从本地存储中读取对象信息反序列化对象。

```java
//序列化
ObjectOutputStream oo = new ObjectOutputStream(new FileOutputStream("user"));
oo.writeObject(user);
//反序列化
ObjectInputStream ois = new ObjectInputStream(new FileInputStream("user"));
User user = (User) ois.readObject();

```

到目前为止我们了解了什么是序列化，以及为什么要进行序列化，并通过我们熟悉的 Java 编程语言中的序列化实现，进一步对序列化操作有更加具体的了解。我们知道，当我们要把对象进行本地存储或网络传输时是需要进行序列化操作的，而在 ZooKeeper 中需要频繁的网络传输工作，那么在 ZooKeeper 中是如何进行序列化的呢，我们带着这个问题继续下面的学习。

## ZooKeeper 中的序列化方案：Jute

在 ZooKeeper 中并没有采用和 Java 一样的序列化方式，而是采用了一个 Jute 的序列化解决方案作为 ZooKeeper 框架自身的序列化方式，说到 Jute 框架，它最早作为 Hadoop 中的序列化组件。之后 Jute 从 Hadoop 中独立出来，成为一个独立的序列化解决方案。ZooKeeper 从最开始就采用 Jute 作为其序列化解决方案，直到其最新的版本依然没有更改。

虽然 ZooKeeper 一直将 Jute 框架作为序列化解决方案，但这并不意味着 Jute 相对其他框架性能更好，反倒是 Apache Avro、Thrift 等框架在性能上优于前者。之所以 ZooKeeper 一直采用 Jute 作为序列化解决方案，主要是新老版本的兼容等问题，这里也请你注意，也许在之后的版本中，ZooKeeper 会选择更加高效的序列化解决方案。

## 使用 Jute 实现序列化

简单介绍了 Jute 框架的发展过程，下面我们来看一下如何使用 Jute 在 ZooKeeper 中实现序列化。如果我们要想将某个定义的类进行序列化，首先需要该类实现 Record 接口的 serialize 和 deserialize 方法，这两个方法分别是序列化和反序列化方法。下边这段代码给出了我们一般在 ZooKeeper 中进行序列化的具体实现：首先，我们定义了一个 test_jute 类，为了能够对它进行序列化，需要该 test_jute 类实现 Record 接口，并在对应的 serialize 序列化方法和 deserialize 反序列化方法中编辑具体的实现逻辑。

```java
class test_jute implements Record{
  private long ids;
  private String name;
  ...
  public void serialize(OutputArchive a_,String tag){
    ...
  }
  public void deserialize(InputArchive a_,String tag){
    ...
  }
}

```

而在序列化方法 serialize 中，我们要实现的逻辑是，首先通过字符类型参数 tag 传递标记序列化标识符，之后使用 writeLong 和 writeString 等方法分别将对象属性字段进行序列化。

```java
public void serialize(OutputArchive a_,String tag) throws IOException {
  a_.startRecord(this,tag);
  a_.writeLong(ids,"ids");
  a_.writeString(name,"name");
  a_.endRecord(this,tag);
}

```

而调用 deserialize 在实现反序列化的过程则与我们上边说的序列化过程正好相反。

```java
public void deserialize(InputArchive a_,String tag) throws IOException {
  a_.startRecord(tag);
  ids = a_.readLong("ids");
  name = a_.readString("name");
  a_.endRecord(tag);
}

```

到这里我们就介绍完了如何在 ZooKeeper 中使用 Jute 实现序列化，需要注意的是，**在实现了 Record 接口后，具体的序列化和反序列化逻辑要我们自己在 serialize 和 deserialize 函数中完成**。

序列化和反序列化的实现逻辑编码方式相对固定，首先通过 startRecord 开启一段序列化操作，之后通过 writeLong、writeString 或 readLong、readString 等方法执行序列化或反序列化。本例中只是实现了长整型和字符型的序列化和反序列化操作，除此之外 ZooKeeper 中的 Jute 框架还支持整数类型（Int）、布尔类型（Bool）、双精度类型（Double）以及 Byte/Buffer 类型。

## Jute 在 ZooKeeper 中的底层实现

正因为 ZooKeeper 的设计目的是将复杂的底层操作封装成简单易用的接口，从而方便用户调用，也使得我们在使用 ZooKeeper 实现序列化的时候能够更加容易。

学会了利用 Jute 实现序列化和反序列化后，我们深入底层，看一下 ZooKeeper 框架具体是如何实现序列化操作的。正如上边我们提到的，通过简单的实现 Record 接口就可以实现序列化，那么我们接下来就以这个接口作为入口，详细分析其底层原理。

Record 接口可以理解为 ZooKeeper 中专门用来进行网络传输或本地存储时使用的数据类型。因此所有我们实现的类要想传输或者存储到本地都要实现该 Record 接口。

```java
public interface Record{
  public void serialize(OutputArchive archive, String tag)
    throws IOException;
public void deserialize(InputArchive archive, String tag)
    throws IOException;
}

```

Record 接口的内部实现逻辑非常简单，只是定义了一个序列化方法 serialize 和一个反序列化方法 deserialize。而真正起到关键作用的则是两个重要的类：OutputArchive 和 InputArchive，其实这两个类才是真正的序列化和反序列化工具类。

OutputArchive 是一个接口，规定了一系列序列化相关的操作。而要实现具体的相关操作，Jute 是通过三个具体实现类分别实现了 Binary、Csv、XML 三种方式的序列化操作。在 OutputArchive 中定义了可进行序列化的参数类型，根据不同的序列化方式调用不同的实现类进行序列化操作。如下图所示，Jute 可以通过 Binary、Csv、Xml 等方式进行序列化操作。

![](/zookeeper-images/04-ZooKeeper_如何进行序列化___Ciqc1F6-a8CAUVfhAABcAV_NNXw402.png)

而对应于序列化操作，在反序列化时也会相应调用不同的实现类，来进行反序列化操作。

如下图所示：

![](/zookeeper-images/04-ZooKeeper_如何进行序列化___CgqCHl6-a8mAOP1YAABW8fO1GAM913.png)

注意：无论是序列化还是反序列化，都可以对多个对象进行操作，所以当我们在定义序列化和反序列化方法时，需要字符类型参数 tag 表示要序列化或反序列化哪个对象。

## Jute 内部核心算法

下边我们分别来看一下 OutputArchive 与 InputArchive 的三个实现类在 Jute 内部是如何实现的。这三种方式有什么不同，我们在日常工作中应该如何选择呢？带着这些问题我们来深入到 Jute 的内部实现来找寻答案。

### Binary 方式的序列化

首先我们来看一下 Jute 中的第 1 种序列化方式：Binary 序列化方式，即二进制的序列化方式。正如我们前边所提到的，采用这种方式的序列化就是将 Java 对象信息转化成二进制的文件格式。

在 Jute 中实现 Binary 序列化方式的类是 BinaryOutputArchive。该 BinaryOutputArchive 类通过实现 OutputArchive 接口，在 Jute 框架采用二进制的方式实现序列化的时候，采用其作为具体的实现类。

在这里我们通过调用 Record 接口中的 writeString 方法为例，该方法是将 Java 对象的 String 字符类型进行序列化。当调用 writeString 方法后，首先判断所要进行序列化的字符串是否为空。如果是空字符串则采用 writeInt 方法，将空字符串当作值为 -1 的数字类型进行序列化；如果不为空，则调用 stringtoByteBuffer 方法对字符串进行序列化操作。

```java
void writeString (String s, String tag){
  if(s==null){
    writeInt(-1,"len");
    return;
  }
  ByteBuffer bb = stringToByteBuffer(s);
  ...
}

```

而 stringToByteBuffer 方法也是 BinaryOutputArchive 类的内部核心方法，除了 writeString 序列化方法外，其他的比如 writeInt、writeDouble 等序列化方法则是调用 DataOutput 接口中的相关方法来实现具体的序列化操作。

在调用 BinaryOutputArchive 类的 stringToByteBuffer 方法时，在将字符串转化成二进制字节流的过程中，首先将字符串转化成字符数组 CharSequence 对象，并根据 ascii 编码判断字符类型，如果是字母等则使用 1 个 byte 进行存储。如果是诸如 "¥" 等符号则采用两个 byte 进行存储。如果是汉字则采用 3 个 byte 进行存储。

```java
...
private ByteBuffer bb = ByteBuffer.allocate(1024);
...
ByteBuffer stringToByteBuffer(CharSequence s){
    if (c < 0x80) {
                bb.put((byte) c);
    } else if (c < 0x800) {
      bb.put((byte) (0xc0 | (c >> 6)));
      bb.put((byte) (0x80 | (c & 0x3f)));
    } else {
      bb.put((byte) (0xe0 | (c >> 12)));
      bb.put((byte) (0x80 | ((c >> 6) & 0x3f)));
      bb.put((byte) (0x80 | (c & 0x3f)));
    }
 }

```

Binary 二进制序列化方式的底层实现相对简单，只是采用将对应的 Java 对象转化成二进制字节流的方式。Binary 方式序列化的优点有很多：无论是 Windows 操作系统、还是 Linux 操作系统或者是苹果的 macOS 操作系统，其底层都是对二进制文件进行操作，而且所有的系统对二进制文件的编译与解析也是一样的，所有操作系统都能对二进制文件进行操作，跨平台的支持性更好。而缺点则是会存在不同操作系统下，产生大端小端的问题。

### XML 方式的序列化

说完了 Binary 的序列化方式，我们再来看看 Jute 中的另一种序列化方式 XML 方式。XML 是一种可扩展的标记语言。当初设计的目的就是用来传输和存储数据，很像我们都很熟悉的 HTML 语言，而与 HTML 语言不同的是我们需要自己定义标签。在 XML 文件中每个标签都是我们自己定义的，而每个标签就对应一项内容。一个简单的 XML 的格式如下面这段代码所示：

```xml
<note>
<to>学生</to>
<from>老师</from>
<heading>上课提醒</heading>
<body>记得9:00来上课</body>
</note>

```

大概了解了 XML 文件，接下来我们看一下 Jute 框架中是如何采用 XML 方式进行序列化操作的。在 Jute 中使用 XmlOutputArchive 类作为 XML 方式序列化的具体实现类。与上面讲解二进制的序列化实现一样，这里我们还是以 writeString 方法的 XML 序列化方式的实现为例。

首先，当采用XML 方式进行序列化时，调用 writeString 方法将 Java 中的 String 字符串对象进行序列化时，在 writeString 内部首先调用 printBeginEnvelope 方法并传入 tag 参数，标记我们要序列化的字段名称。之后采用 `<string>` 和 `</string>` 作为自定义标签，封装好传入的 Java 字符串。

```java
void writeString(String s, String tag){
   printBeginEnvelope(tag);
   stream.print("<string>");
   stream.print(Utils.toXMLString(s));
   stream.print("</string>");
   printEndEnvelope(tag);
}

```

而在 printBeginEnvelope 方法中，其主要作用就是添加该字段的名称、字段值等信息，用于之后反序列化的过程中。

```java
void printBeginEnvelope (String tag){
  ...
  if ("struct".equals(s)) {
        putIndent();
        stream.print("<member>\n");
        addIndent();
        putIndent();
        stream.print("<name>"+tag+"</name>\n");
        putIndent();
        stream.print("<value>");
    } else if ("vector".equals(s)) {
        stream.print("<value>");
    } else if ("map".equals(s)) {
        stream.print("<value>");
    } else {
        stream.print("<value>");
    }
}

```

通过上面在 Jute 框架中，对采用 XML 方式序列化的实现类：XmlOutputArchive 中的底层实现过程分析，我们可以了解到其实现的基本原理，也就是根据 XML 格式的要求，解析传入的序列化参数，并将参数按照 Jute 定义好的格式，采用设定好的默认标签封装成对应的序列化文件。

而采用 XML 方式进行序列化的优点则是，通过可扩展标记协议，不同平台或操作系统对序列化和反序列化的方式都是一样的，不存在因为平台不同而产生的差异性，也不会出现如 Binary 二进制序列化方法中产生的大小端的问题。而缺点则是序列化和反序列化的性能不如二进制方式。在序列化后产生的文件相比于二进制方式，同样的信息所产生的文件更大。

### Csv 方式的序列化

最后我们来学习一下 Jute 序列化框架的最后一种序列化方式：Csv，它和 XML 方式很像，只是所采用的转化格式不同，Csv 格式采用逗号将文本进行分割，我们日常使用中最常用的 Csv 格式文件就是 Excel 文件。

在 Jute 框架中实现 Csv 序列化的类是 CsvOutputArchive，我们还是以 String 字符对象序列化为例，在调用 CsvOutputArchive 的 writeString 方法时，writeString 方法首先调用 printCommaUnlessFirst 方法生成一个逗号分隔符，之后将要序列化的字符串值转换成 CSV 编码格式追加到字节数组中。

```java
void writeString(String s, String tag){
  printCommaUnlessFirst();
  stream.print(Utils.toCSVString(s));
  throwExceptionOnError(tag);
}

```

### 三种方式的对比与默认选择

到这里我们已经对 Jute 框架的 3 种序列化方式的底层实现有了一个整体了解：

| 方式 | 实现类 | 优点 | 缺点 |
|---|---|---|---|
| Binary | BinaryOutputArchive / BinaryInputArchive | 底层实现最简单，性能最好，各平台对二进制的编译与解析一致 | 不同操作系统下存在大端小端问题 |
| XML | XmlOutputArchive / XmlInputArchive | 可扩展标记协议，跨平台性强，不存在大小端问题 | 性能不如二进制，同样信息产生的文件更大 |
| Csv | CsvOutputArchive / CsvInputArchive | 介于两者之间，实现起来比 XML 更简单 | 性能不如二进制 |

在 ZooKeeper 中，默认的序列化实现方式是 Binary 二进制方式。这是因为二进制具有更好的性能，并且各平台对二进制的解析方式是一致的。

## 总结

本文首先介绍了什么是序列化以及为什么要进行序列化，简单来说，就是将对象转化为字节流的形式，方便将对象信息存储到本地或通过网络传输。

之后我们复习了 Java 中的序列化方式，与 ZooKeeper 中的序列化使用不同的是，在 Java 中，Serializable 接口是一个空接口，只是起到标识作用，实现了该接口的对象是需要进行序列化的。而在 ZooKeeper 的实现中，序列化对象需要实现的 Record 接口里边存在两个重要的方法，分别是 serialize 和 deserialize 方法。需要序列化的对象在实现 Record 接口的同时，还需要实现这两个方法。而具体的实现过程就是我们要序列化和反序列化的实现逻辑，真正起作用的工具类是 OutputArchive 和 InputArchive 及其 Binary、XML、Csv 三个实现族。

最后我们深入了 Jute 的底层实现。之所以深入底层学习 Jute，是为了在日常开发中更好地使用 ZooKeeper，在发生诸如客户端与服务端通信中信息发送不完整或解析错误等情况时，能通过底层分析从序列化模块入手排查信息错误的原因，进一步提高我们在日常设计和解决问题的能力。

另外请你思考一个问题：如果说序列化就是将对象转化成字节流的格式，那么为什么 ZooKeeper 的 Jute 序列化框架还提供了对 Byte/Buffer 这两种类型的序列化操作呢？

其实这其中最关键的作用就是在不同操作系统中存在大端和小端的问题，为了避免不同操作系统环境的差异，在传输字节类型时也要进行序列化和反序列化。这里你需要在日常使用中多注意。

## 版本差异(ZooKeeper 3.6 → 3.8/3.9)

| 特性 | 旧版（本文编写时，3.6.x） | 当前（3.8.x/3.9.x） |
|------|---------------------------|---------------------|
| 稳定版本 | 3.6.x | 3.8.x（LTS）/ 3.9.x |
| Java 支持 | JDK 8 | JDK 8/11/17（3.8+） |
| 客户端 | 原生客户端 | 推荐 Curator 5.x（容器节点、持久递归监听） |
| 监控 | JConsole + 四字母命令 | 3.6+ 实验性 Prometheus 指标端点，3.8+ 完善 |
| 核心机制 | ZAB/Watch/ACL/数据模型 | 原理不变，本文内容依然适用 |

> ZooKeeper 的核心协议（ZAB、Watch、ACL、数据模型）自 3.4 以来保持稳定，本文原理性讲解在 3.8/3.9 中依然适用；部署与监控建议按 3.8/3.9 官方文档更新。
