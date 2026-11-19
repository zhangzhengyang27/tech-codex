---
title: "ZooKeeper 序列化与 Jute 实现原理"
description: "通过网络传输数据前必须先进行序列化。本文介绍 Java 序列化与 ZooKeeper 采用的 Jute 序列化方案，并深入 Jute 框架内部核心，分析 Binary、XML、CSV 三种序列化方式的底层实现。"
keywords: [ZooKeeper, 序列化, Jute, Binary, XML, CSV]
category: "Java"
tags: [Java, ZooKeeper]
---

# ZooKeeper 序列化与 Jute 实现原理

ZooKeeper 的核心工作方式是客户端与服务端之间的相互通信，通信的前提是解决网络数据传输问题。要通过网络传输 Java 对象数据，必须先对其进行序列化。例如，通过 ZooKeeper 客户端发送 ACL 权限控制请求时，请求信息会被封装成 packet 类型，经过序列化后才能通过网络将 ACL 信息发送给 ZooKeeper 服务端进行处理。

## 概念说明

**序列化（Serialization）** 是指将程序中定义的数据类型转化成数据流的形式。TCP 协议在网络传输过程中采用"流通信"的方式，提供可以读写的字节流，这种设计可以避免网络传输中经常出现的问题，例如消息丢失、消息重复和排序问题等。

需要序列化的两种典型场景：

- 通过网络传递对象。
- 将对象信息持久化到本地存储。

与之对应，从字节流中还原对象的过程称为**反序列化（Deserialization）**。

## 核心要点

- 序列化的本质是将对象转化为字节流，以适配 TCP 的流式传输和本地持久化存储。
- Java 原生序列化通过实现空接口 `Serializable` 进行标识，实际读写由 `ObjectOutputStream` / `ObjectInputStream` 完成。
- ZooKeeper 没有采用 Java 原生序列化，而是采用 Jute 序列化框架；Jute 最早是 Hadoop 中的序列化组件，后独立成为单独的解决方案。
- Jute 的性能并非最优（Apache Avro、Thrift 等框架性能优于它），ZooKeeper 持续采用它的主要原因是新老版本兼容。
- Jute 中可序列化的类必须实现 `Record` 接口，并自行编写 `serialize` / `deserialize` 两个方法的实现逻辑。
- 真正执行序列化/反序列化的工具类是 `OutputArchive` 与 `InputArchive`，二者分别有 Binary、Xml、Csv 三个实现族。
- ZooKeeper 默认采用 Binary 二进制方式，原因是性能最好且各平台对二进制的解析方式一致。
- 传输 Byte/Buffer 类型时同样需要序列化，目的是规避不同操作系统大端（Big-Endian）/小端（Little-Endian）的差异。

## Java 原生序列化机制

Java 中序列化一个对象，首先需要该类实现 `Serializable` 接口：

```java
public class User implements Serializable{
  private static final long serialVersionUID = 1L;
  private Long ids;
  private String name;
  ...
}

```

`Serializable` 是一个没有任何内容的空接口，起到的作用仅是标识该类需要进行序列化，这与 ZooKeeper 的序列化实现方式有明显区别。

```java
public interface Serializable {
}

```

定义好序列化接口后，序列化与反序列化主要使用 `ObjectInputStream` 和 `ObjectOutputStream` 两个 IO 类：

- `ObjectOutputStream` 负责将对象序列化并存储到本地。
- `ObjectInputStream` 从本地存储中读取对象信息并反序列化。

```java
//序列化
ObjectOutputStream oo = new ObjectOutputStream(new FileOutputStream("user"));
oo.writeObject(user);
//反序列化
ObjectInputStream ois = new ObjectInputStream(new FileInputStream("user"));
User user = (User) ois.readObject();

```

## ZooKeeper 中的序列化方案：Jute

ZooKeeper 没有采用与 Java 一样的序列化方式，而是采用 Jute 序列化解决方案作为框架自身的序列化方式。Jute 最早作为 Hadoop 中的序列化组件，之后从 Hadoop 中独立出来，成为一个独立的序列化解决方案。ZooKeeper 从最初就采用 Jute 作为其序列化解决方案，直到最新版本依然没有更改。

需要注意的是，ZooKeeper 一直采用 Jute 并不意味着 Jute 的性能相对其他框架更好，反倒是 Apache Avro、Thrift 等框架在性能上优于 Jute。ZooKeeper 持续采用 Jute 的主要原因在于新老版本的兼容等问题；在之后的版本中，ZooKeeper 也可能选择更高效的序列化解决方案。

## 使用 Jute 实现序列化

在 Jute 中，要对某个类进行序列化，该类需要实现 `Record` 接口的 `serialize` 和 `deserialize` 方法，这两个方法分别对应序列化和反序列化。以下是一般在 ZooKeeper 中进行序列化的具体实现：定义一个 `test_jute` 类，实现 `Record` 接口，并在对应的 `serialize` 序列化方法和 `deserialize` 反序列化方法中编写具体的实现逻辑。

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

在序列化方法 `serialize` 中，实现的逻辑是：首先通过字符类型参数 `tag` 传递序列化标识符，之后使用 `writeLong` 和 `writeString` 等方法分别将对象属性字段序列化。

```java
public void serialize(OutputArchive a_,String tag) throws IOException {
  a_.startRecord(this,tag);
  a_.writeLong(ids,"ids");
  a_.writeString(name,"name");
  a_.endRecord(this,tag);
}

```

反序列化方法 `deserialize` 的实现过程与序列化过程正好相反。

```java
public void deserialize(InputArchive a_,String tag) throws IOException {
  a_.startRecord(tag);
  ids = a_.readLong("ids");
  name = a_.readString("name");
  a_.endRecord(tag);
}

```

实现 Jute 序列化的关键约束：**在实现了 Record 接口后，具体的序列化和反序列化逻辑需要在 serialize 和 deserialize 函数中自行完成**。

实现逻辑的编码方式相对固定：首先通过 `startRecord` 开启一段序列化操作，之后通过 `writeLong`、`writeString` 或 `readLong`、`readString` 等方法执行序列化或反序列化。上例只实现了长整型和字符型的序列化与反序列化操作，除此之外，ZooKeeper 中的 Jute 框架还支持整数类型（Int）、布尔类型（Bool）、双精度类型（Double）以及 Byte/Buffer 类型。

## Jute 在 ZooKeeper 中的底层实现

ZooKeeper 的设计目的是将复杂的底层操作封装成简单易用的接口，因此通过实现 `Record` 接口即可完成序列化。以 `Record` 接口为入口，可以分析其底层实现原理。

`Record` 接口可以理解为 ZooKeeper 中专门用于网络传输或本地存储的数据类型。所有需要传输或存储到本地的类都要实现该接口。

```java
public interface Record{
  public void serialize(OutputArchive archive, String tag)
    throws IOException;
public void deserialize(InputArchive archive, String tag)
    throws IOException;
}

```

`Record` 接口的内部实现逻辑非常简单，只定义了一个序列化方法 `serialize` 和一个反序列化方法 `deserialize`。真正起到关键作用的是两个重要的类：`OutputArchive` 和 `InputArchive`，这两个类才是真正的序列化和反序列化工具类。

`OutputArchive` 是一个接口，规定了一系列序列化相关的操作。Jute 通过三个具体实现类分别实现了 Binary、Csv、XML 三种方式的序列化操作。`OutputArchive` 中定义了可进行序列化的参数类型，根据不同的序列化方式调用不同的实现类执行序列化操作。如下图所示，Jute 可以通过 Binary、Csv、Xml 等方式进行序列化操作。

![](/zookeeper-images/04-ZooKeeper_如何进行序列化___Ciqc1F6-a8CAUVfhAABcAV_NNXw402.png)

对应于序列化操作，反序列化时也会相应调用不同的实现类来执行反序列化操作。如下图所示：

![](/zookeeper-images/04-ZooKeeper_如何进行序列化___CgqCHl6-a8mAOP1YAABW8fO1GAM913.png)

无论是序列化还是反序列化，都可以对多个对象进行操作，因此定义序列化和反序列化方法时，需要字符类型参数 `tag` 表示要序列化或反序列化哪个对象。

## Jute 内部核心算法

`OutputArchive` 与 `InputArchive` 的三个实现类在 Jute 内部的实现方式各不相同，选择依据详见本节末尾的对比表。

### Binary 方式的序列化

Binary 序列化方式即二进制的序列化方式，核心是将 Java 对象信息转化成二进制的文件格式。

Jute 中实现 Binary 序列化方式的类是 `BinaryOutputArchive`。该类通过实现 `OutputArchive` 接口，在 Jute 框架采用二进制方式实现序列化时作为具体实现类。

以 `Record` 接口中的 `writeString` 方法为例，该方法将 Java 对象的 String 字符类型序列化。调用 `writeString` 方法后，首先判断所要序列化的字符串是否为空：如果是空字符串，则采用 `writeInt` 方法，将空字符串当作值为 -1 的数字类型序列化；如果不为空，则调用 `stringToByteBuffer` 方法对字符串执行序列化操作。

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

`stringToByteBuffer` 方法是 `BinaryOutputArchive` 类的内部核心方法。除 `writeString` 序列化方法外，其他如 `writeInt`、`writeDouble` 等序列化方法则调用 `DataOutput` 接口中的相关方法实现具体的序列化操作。

调用 `BinaryOutputArchive` 类的 `stringToByteBuffer` 方法将字符串转化成二进制字节流的过程中，首先将字符串转化成字符数组 `CharSequence` 对象，并根据 ascii 编码判断字符类型：字母等字符使用 1 个 byte 存储；"¥" 等符号采用两个 byte 存储；汉字采用 3 个 byte 存储。

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

Binary 二进制序列化方式的底层实现相对简单，只是将对应的 Java 对象转化成二进制字节流。Binary 方式的优点：无论是 Windows、Linux 还是 macOS 操作系统，底层都是对二进制文件进行操作，所有系统对二进制文件的编译与解析也是一致的，因此跨平台的支持性更好。缺点则是不同操作系统下会存在大端小端的问题。

### XML 方式的序列化

XML 是一种可扩展的标记语言，最初的设计目的是用来传输和存储数据，与 HTML 语言相似。与 HTML 不同的是，XML 的标签需要自定义：XML 文件中的每个标签都由使用方定义，每个标签对应一项内容。一个简单的 XML 格式如下：

```xml
<note>
<to>学生</to>
<from>老师</from>
<heading>上课提醒</heading>
<body>记得9:00来上课</body>
</note>

```

Jute 框架中使用 `XmlOutputArchive` 类作为 XML 方式序列化的具体实现类。以 `writeString` 方法的 XML 序列化实现为例：采用 XML 方式序列化时，调用 `writeString` 方法将 Java 中的 String 字符串对象序列化，`writeString` 内部首先调用 `printBeginEnvelope` 方法并传入 `tag` 参数，标记要序列化的字段名称；之后采用 `<string>` 和 `</string>` 作为自定义标签，封装传入的 Java 字符串。

```java
void writeString(String s, String tag){
   printBeginEnvelope(tag);
   stream.print("<string>");
   stream.print(Utils.toXMLString(s));
   stream.print("</string>");
   printEndEnvelope(tag);
}

```

`printBeginEnvelope` 方法的主要作用是添加该字段的名称、字段值等信息，用于之后的反序列化过程。

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

通过对 `XmlOutputArchive` 底层实现过程的分析可以得出其基本原理：根据 XML 格式的要求解析传入的序列化参数，并将参数按照 Jute 定义好的格式，采用设定好的默认标签封装成对应的序列化文件。

XML 方式序列化的优点：通过可扩展标记协议，不同平台或操作系统对序列化和反序列化的方式一致，不存在因平台不同而产生的差异，也不会出现 Binary 二进制方式中的大小端问题。缺点：序列化和反序列化的性能不如二进制方式，序列化后产生的文件相比二进制方式更大。

### Csv 方式的序列化

Csv 是 Jute 序列化框架的最后一种序列化方式，它与 XML 方式相似，只是采用的转化格式不同。Csv 格式采用逗号将文本进行分割，日常使用中最常见的 Csv 格式文件就是 Excel 文件。

Jute 框架中实现 Csv 序列化的类是 `CsvOutputArchive`。以 String 字符对象序列化为例，调用 `CsvOutputArchive` 的 `writeString` 方法时，该方法首先调用 `printCommaUnlessFirst` 方法生成一个逗号分隔符，之后将要序列化的字符串值转换成 CSV 编码格式追加到字节数组中。

```java
void writeString(String s, String tag){
  printCommaUnlessFirst();
  stream.print(Utils.toCSVString(s));
  throwExceptionOnError(tag);
}

```

### 三种方式的对比与默认选择

Jute 框架 3 种序列化方式的底层实现对比：

| 方式 | 实现类 | 优点 | 缺点 |
|---|---|---|---|
| Binary | BinaryOutputArchive / BinaryInputArchive | 底层实现最简单，性能最好，各平台对二进制的编译与解析一致 | 不同操作系统下存在大端小端问题 |
| XML | XmlOutputArchive / XmlInputArchive | 可扩展标记协议，跨平台性强，不存在大小端问题 | 性能不如二进制，同样信息产生的文件更大 |
| Csv | CsvOutputArchive / CsvInputArchive | 介于两者之间，实现起来比 XML 更简单 | 性能不如二进制 |

ZooKeeper 默认的序列化实现方式是 Binary 二进制方式，原因是二进制具有更好的性能，并且各平台对二进制的解析方式一致。

## 实践要点

- 需要通过网络传输或本地存储的自定义类，必须实现 `Record` 接口，并在 `serialize` / `deserialize` 中逐字段编写读写逻辑，字段顺序与类型需严格对应。
- `tag` 参数用于在多对象序列化场景中区分对象，实现时不可省略。
- 序列化异常排查方向：客户端与服务端通信中出现信息发送不完整或解析错误等情况时，可以从序列化模块入手排查信息错误的原因。
- Byte/Buffer 类型之所以也要经历序列化与反序列化，关键在于不同操作系统存在大端和小端的问题，序列化层统一字节序可以规避环境差异，日常使用中需要注意这一点。

## 总结

序列化的本质是将对象转化为字节流的形式，方便将对象信息存储到本地或通过网络传输。

Java 原生序列化与 ZooKeeper 序列化的差异在于：Java 中 `Serializable` 接口是一个空接口，只起标识作用；而 ZooKeeper 中需要序列化的对象实现的 `Record` 接口包含两个重要方法——`serialize` 和 `deserialize`，需要序列化的对象在实现 `Record` 接口的同时，还必须实现这两个方法，具体的实现过程就是序列化和反序列化的实现逻辑。真正起作用的工具类是 `OutputArchive` 和 `InputArchive` 及其 Binary、XML、Csv 三个实现族。

深入 Jute 底层实现的价值在于更好地使用 ZooKeeper：当出现客户端与服务端通信中信息发送不完整或解析错误等情况时，能够通过底层分析从序列化模块入手排查信息错误的原因。

## 版本差异(ZooKeeper 3.6 → 3.8/3.9)

| 特性 | 旧版（本文编写时，3.6.x） | 当前（3.8.x/3.9.x） |
|------|---------------------------|---------------------|
| 稳定版本 | 3.6.x | 3.8.x（LTS）/ 3.9.x |
| Java 支持 | JDK 8 | JDK 8/11/17（3.8+） |
| 客户端 | 原生客户端 | 推荐 Curator 5.x（容器节点、持久递归监听） |
| 监控 | JConsole + 四字母命令 | 3.6+ 实验性 Prometheus 指标端点，3.8+ 完善 |
| 核心机制 | ZAB/Watch/ACL/数据模型 | 原理不变，本文内容依然适用 |

> ZooKeeper 的核心协议（ZAB、Watch、ACL、数据模型）自 3.4 以来保持稳定，本文原理性讲解在 3.8/3.9 中依然适用；部署与监控建议按 3.8/3.9 官方文档更新。
