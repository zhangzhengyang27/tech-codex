---
title: "OOM 与内存问题排查"
description: "OOM 排查、内存溢出模拟、MAT 分析、堆外内存问题定位。"
keywords: [OOM, MAT, 堆外内存, 内存泄漏]
category: "Java"
tags: [Java, JVM]
---

# OOM 与内存问题排查

## OOM 排查与应对

#### GC Roots 有哪些

GC Roots 是一组必须活跃的引用。用通俗的话来说，就是程序接下来通过直接引用或者间接引用，能够访问到的潜在被使用的对象。

GC Roots 包括：

- Java 线程中，当前所有正在被调用的方法的引用类型参数、局部变量、临时值等。也就是与栈帧相关的各种引用。
- 所有当前被加载的 Java 类。
- Java 类的引用类型静态变量。
- 运行时常量池里的引用类型常量（String 或 Class 类型）。
- JVM 内部数据结构的一些引用，比如 sun.jvm.hotspot.memory.Universe 类。
- 用于同步的监控对象，比如调用了对象的 wait() 方法。
- JNI handles，包括 global handles 和 local handles。

这些 GC Roots 大体可以分为三大类，下面的说法更加好记一些：

- 活动线程相关的各种引用。
- 类的静态变量的引用。
- JNI 引用。

![](/jvm-course-images/31d81da11c82.png)

有两个注意点：

- 这里说的是活跃的引用，而不是对象，对象是不能作为 GC Roots 的。
- GC 过程是找出所有活对象，并把其余空间认定为"无用"；而不是找出所有死掉的对象，并回收它们占用的空间。所以，哪怕 JVM 的堆非常的大，基于 tracing 的 GC 方式，回收速度也会非常快。

#### 引用级别

能够找到 Reference Chain 的对象，就一定会存活么？

对象对于另外一个对象的引用，要看关系牢靠不牢靠，可能在链条的其中一环就断掉了。

![](/jvm-course-images/516bbbc104dc.png)

根据发生 GC 时这条链条的表现，可以对引用关系进行更加细致的划分。

它们的关系可以分为强引用、软引用、弱引用、虚引用等。

##### 强引用 Strong references

当内存空间不足，系统撑不住了，JVM 就会抛出 OutOfMemoryError 错误。即使程序会异常终止，这种对象也不会被回收。这种引用属于最普通最强硬的一种存在，只有在和 GC Roots 断绝关系时才会被消灭掉。

这种引用在每天的编码中都在使用。例如：new 一个普通的对象。

```
Object obj = new Object();

```

这种方式可能是有问题的。假如系统被大量用户（User）访问，需要记录这个 User 访问的时间。可惜的是，User 对象里并没有这个字段，所以决定将这些信息额外开辟一个空间进行存放。

```
static Map<User,Long> userVisitMap = new HashMap<>();
...
userVisitMap.put(user, time);

```

用完了 User 对象之后，其实是期望它被回收掉的。但是，由于它被 userVisitMap 引用，没有其他手段 remove 掉它。这个时候，就发生了内存泄漏（memory leak）。

这种情况还通常发生在一个没有设定上限的 Cache 系统，由于设置了不正确的引用方式，加上不正确的容量，很容易造成 OOM。

##### 软引用 Soft references

软引用用于维护一些可有可无的对象。在内存足够的时候，软引用对象不会被回收，只有在内存不足时，系统则会回收软引用对象，如果回收了软引用对象之后仍然没有足够的内存，才会抛出内存溢出异常。

可以看到，这种特性非常适合用在缓存技术上。比如网页缓存、图片缓存等。

Guava 的 CacheBuilder 就提供了软引用和弱引用的设置方式。在这种场景中，软引用比强引用安全得多。

软引用可以和一个引用队列（ReferenceQueue）联合使用，如果软引用所引用的对象被垃圾回收，Java 虚拟机就会把这个软引用加入到与之关联的引用队列中。

看一下它的代码。软引用需要显式的声明，使用泛型来实现。

```
// 伪代码
Object object = new Object();
SoftReference<Object> softRef = new SoftReference(object);

```

这里有一个相关的 JVM 参数。它的意思是：每 MB 堆空闲空间中 SoftReference 的存活时间。这个值的默认时间是 1 秒（1000）。

```
-XX:SoftRefLRUPolicyMSPerMB=<N>

```

这里要特别说明的是，网络上一些流传的优化方法，即把这个值设置成 0，其实是错误的，这样容易引发故障。

这种比较偏门的优化手段，只有在对其原理相当了解的情况下，才能设置一些比较特殊的值。比如 0 值、无限大等，这种值在 JVM 的设置中最好不要发生。

##### 弱引用 Weak references

弱引用对象相比较软引用要更加无用一些，它拥有更短的生命周期。

当 JVM 进行垃圾回收时，无论内存是否充足，都会回收被弱引用关联的对象。弱引用拥有更短的生命周期，在 Java 中用 java.lang.ref.WeakReference 类来表示。

它的应用场景和软引用类似，可以在一些对内存更加敏感的系统里采用。它的使用方式类似于下面的代码：

```
// 伪代码
Object object = new Object();
WeakReference<Object> softRef = new WeakReference(object);

```

##### 虚引用 Phantom References

这是一种形同虚设的引用，在现实场景中用的不是很多。虚引用必须和引用队列（ReferenceQueue）联合使用。如果一个对象仅持有虚引用，那么它就和没有任何引用一样，在任何时候都可能被垃圾回收。

实际上，虚引用的 get 总是返回 null。

```
Object  object = new Object();
ReferenceQueue queue = new ReferenceQueue();
// 虚引用，必须与一个引用队列关联
PhantomReference pr = new PhantomReference(object, queue);

```

虚引用主要用来跟踪对象被垃圾回收的活动。

当垃圾回收器准备回收一个对象时，如果发现它还有虚引用，就会在回收对象之前把这个虚引用加入到与之关联的引用队列中。

程序如果发现某个虚引用已经被加入到引用队列，那么就可以在所引用的对象的内存被回收之前采取必要的行动。

下面的方法就是一个用于监控 GC 发生的例子。

```
private static void startMonitoring(ReferenceQueue<MyObject> referenceQueue, Reference<MyObject> ref) {
     ExecutorService ex = Executors.newSingleThreadExecutor();
     ex.execute(() -> {
         while (referenceQueue.poll()!=ref) {
             //don't hang forever
             if(finishFlag){
                 break;
            }
        }
         System.out.println("-- ref gc'ed --");

    });
     ex.shutdown();
}

```

基于虚引用有一个更加优雅的实现方式，那就是 Java 9 以后新加入的 Cleaner，用来替代 Object 类的 finalizer 方法。

#### 典型 OOM 场景

OOM 的全称是 Out Of Memory，那内存区域有哪些会发生 OOM 呢？可以从内存区域划分图上，看一下彩色部分。

![](/jvm-course-images/65f905fb9870.png)

可以看到除了程序计数器，其他区域都有 OOM 溢出的可能。但是最常见的还是发生在堆上。

![](/jvm-course-images/d6f015b75421.png)

所以 OOM 到底是什么引起的呢？有几个原因：

- 内存的容量太小了，需要扩容，或者需要调整堆的空间。
- 错误的引用方式，发生了内存泄漏。没有及时切断与 GC Roots 的关系。比如线程池里的线程，在复用的情况下忘记清理 ThreadLocal 的内容。
- 接口没有进行范围校验，外部传参超出范围。比如数据库查询时的每页条数等。
- 对堆外内存无限制的使用。这种情况一旦发生更加严重，会造成操作系统内存耗尽。

典型的内存泄漏场景，原因在于对象没有及时释放自己的引用。比如一个局部变量被外部的静态集合引用。

![](/jvm-course-images/a356038e3a01.png)

在平常写代码时，一定要注意这种情况，不要为了方便把对象到处引用。即使引用了，也要在合适时机进行手动清理。关于这部分的问题根源排查，将在实践文中详细介绍。

## 模拟内存溢出场景

### 堆溢出模拟

首先模拟堆溢出的情况，在模拟之前需要准备一份测试代码。这份代码开放了一个 HTTP 接口，触发它之后将每秒钟生成 1MB 的数据。由于它和 GC Roots 的强关联性，每次都不能被回收。

程序通过 JMX，将在每一秒创建数据之后输出一些内存区域的占用情况。然后通过访问 http://localhost:8888 触发后，它将一直运行直到堆溢出。

```
import com.sun.net.httpserver.HttpContext;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.OutputStream;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryPoolMXBean;
import java.net.InetSocketAddress;
import java.util.ArrayList;
import java.util.List;
public class OOMTest {
   public static final int _1MB = 1024 * 1024;
   static List<byte[]> byteList = new ArrayList<>();
   private static void oom(HttpExchange exchange) {
       try {
           String response = "oom begin!";
           exchange.sendResponseHeaders(200, response.getBytes().length);
           OutputStream os = exchange.getResponseBody();
           os.write(response.getBytes());
           os.close();
       } catch (Exception ex) {
       }
       for (int i = 0; ; i++) {
           byte[] bytes = new byte[_1MB];
           byteList.add(bytes);
           System.out.println(i + "MB");
           memPrint();
           try {
               Thread.sleep(1000);
           } catch (Exception e) {
           }
       }
   }
   static void memPrint() {
       for (MemoryPoolMXBean memoryPoolMXBean : ManagementFactory.getMemoryPoolMXBeans()) {
           System.out.println(memoryPoolMXBean.getName() +
                   "  committed:" + memoryPoolMXBean.getUsage().getCommitted() +
                   "  used:" + memoryPoolMXBean.getUsage().getUsed());
       }
   }
   private static void srv() throws Exception {
       HttpServer server = HttpServer.create(new InetSocketAddress(8888), 0);
       HttpContext context = server.createContext("/");
       context.setHandler(OOMTest::oom);
       server.start();
   }
   public static void main(String[] args) throws Exception{
       srv();
   }
}
```

使用 CMS 收集器进行垃圾回收，可以看到如下的信息。

命令：

```
java -Xmx20m -Xmn4m -XX:+UseConcMarkSweepGC -verbose:gc \
  -Xlog:gc,gc+ref=debug,gc+heap=debug,gc+age=trace:file=/tmp/logs/gc_%p.log:tags,uptime,time,level \
  -Xlog:safepoint:file=/tmp/logs/safepoint_%p.log:tags,uptime,time,level \
  -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/logs \
  -XX:ErrorFile=/tmp/logs/hs_error_pid%p.log -XX:-OmitStackTraceInFastThrow \
  OOMTest
```

输出：

[0.025s][info][gc] Using Concurrent Mark Sweep

0MB

CodeHeap 'non-nmethods'  committed:2555904  used:1120512

Metaspace  committed:4980736  used:854432

CodeHeap 'profiled nmethods'  committed:2555904  used:265728

Compressed Class Space  committed:524288  used:96184

Par Eden Space  committed:3407872  used:2490984

Par Survivor Space  committed:393216  used:0

CodeHeap 'non-profiled nmethods'  committed:2555904  used:78592

CMS Old Gen  committed:16777216  used:0

...省略

[16.377s][info][gc] GC(9) Concurrent Mark 1.592ms

[16.377s][info][gc] GC(9) Concurrent Preclean

[16.378s][info][gc] GC(9) Concurrent Preclean 0.721ms

[16.378s][info][gc] GC(9) Concurrent Abortable Preclean

[16.378s][info][gc] GC(9) Concurrent Abortable Preclean 0.006ms

[16.378s][info][gc] GC(9) Pause Remark 17M->17M(19M) 0.344ms

[16.378s][info][gc] GC(9) Concurrent Sweep

[16.378s][info][gc] GC(9) Concurrent Sweep 0.248ms

[16.378s][info][gc] GC(9) Concurrent Reset

[16.378s][info][gc] GC(9) Concurrent Reset 0.013ms

17MB

CodeHeap 'non-nmethods'  committed:2555904  used:1120512

Metaspace  committed:4980736  used:883760

CodeHeap 'profiled nmethods'  committed:2555904  used:422016

Compressed Class Space  committed:524288  used:92432

Par Eden Space  committed:3407872  used:3213392

Par Survivor Space  committed:393216  used:0

CodeHeap 'non-profiled nmethods'  committed:2555904  used:88064

CMS Old Gen  committed:16777216  used:16452312

[18.380s][info][gc] GC(10) Pause Initial Mark 18M->18M(19M) 0.187ms

[18.380s][info][gc] GC(10) Concurrent Mark

[18.384s][info][gc] GC(11) Pause Young (Allocation Failure) 18M->18M(19M) 0.186ms

[18.386s][info][gc] GC(10) Concurrent Mark 5.435ms

[18.395s][info][gc] GC(12) Pause Full (Allocation Failure) 18M->18M(19M) 10.572ms

[18.400s][info][gc] GC(13) Pause Full (Allocation Failure) 18M->18M(19M) 5.348ms

Exception in thread "main" java.lang.OutOfMemoryError: Java heap space

at OldOOM.main(OldOOM.java:20)

最后 JVM 在一阵疯狂的 GC 日志输出后进程停止了。在现实情况中，JVM 在停止工作之前很多会垂死挣扎一段时间，这个时候 GC 线程会造成 CPU 飙升，但其实它已经不能工作了。

VisualVM 的截图展示了这个溢出结果。可以看到 Eden 区刚开始还是运行平稳的，内存泄漏之后就开始疯狂回收（其实是提升），老年代内存一直增长直到 OOM。

![](/jvm-course-images/bcfaf6799b99.jpeg)

很多参数会影响对象的分配行为，但如果不是非常必要，一般不去调整它们。为了观察这些参数的默认值，通常使用 -XX:+PrintFlagsFinal 参数输出一些设置信息。

命令：

```
java -XX:+PrintFlagsFinal -version 2>&1 | grep SurvivorRatio
```

### 通过 -XX:+PrintFlagsFinal 观察参数默认值

uintx SurvivorRatio                            = 8                                         {product} {default}`

Java13 输出了几百个参数和默认值，通过修改一些参数来观测一些不同的行为。

**NewRatio** 默认值为 2，表示年轻代是老年代的 1/2。追加参数 "-XX:NewRatio=1"，可以把年轻代和老年代的空间大小调成一样大。在实践中，一般使用 -Xmn 来设置一个固定值。注意，这两个参数不要用在 G1 垃圾回收器中。

**SurvivorRatio** 默认值为 8，表示伊甸区和幸存区的比例。在上面的例子中，Eden 的内存大小为：0.8*4MB。S 分区不到 1MB，根本存不下 1MB 数据。

**MaxTenuringThreshold** 这个值在 CMS 下默认为 6，G1 下默认为 15。这是因为 G1 存在动态阈值计算。这个值和前面提到的对象提升有关，如果想要对象尽量长时间存在于年轻代，则在 CMS 中可以把它调整到 15。

java -XX:+PrintFlagsFinal -XX:+UseConcMarkSweepGC 2>&1 | grep MaxTenuringThreshold

java -XX:+PrintFlagsFinal -XX:+UseG1GC 2>&1 | grep MaxTenuringThreshold

**PretenureSizeThreshold** 这个参数默认值是 0，意味着所有的对象年轻代优先分配。把这个值调小一点，再观测 JVM 的行为。追加参数 -XX:PretenureSizeThreshold=1024，可以看到 VisualVM 中老年代的区域增长。

**TargetSurvivorRatio** 默认值为 50。在动态计算对象提升阈值的时候使用。计算时，会从年龄最小的对象开始累加，如果累加的对象大小大于幸存区的一半，则将当前的对象 age 作为新的阈值，年龄大于此阈值的对象直接进入老年代。工作中不建议调整这个值，如果要调，请调成比 50 大的值。

可以尝试着更改其他参数，比如垃圾回收器的种类，动态看一下效果。尤其注意每一项内存区域的内容变动，会对垃圾回收器有更好的理解。

**UseAdaptiveSizePolicy**，因为它和 CMS 不兼容，所以 CMS 下默认为 false，但 G1 下默认为 true。这是一个非常智能的参数，用来自适应调整空间大小。它会在每次 GC 之后重新计算 Eden、From、To 的大小。很多人在 Java 8 的一些配置中会见到这个参数，但其实在 CMS 和 G1 中是不需要显式设置的。

值得注意的是，Java 8 默认垃圾回收器是 Parallel Scavenge，它的这个参数是默认开启的，有可能会发生把幸存区自动调小的可能造成一些问题，显式的设置 SurvivorRatio 可以解决这个问题。

下面这张截图是切换到 G1 之后的效果。

java -Xmx20m   -XX:+UseG1GC  -verbose:gc -Xlog:gc,gc+ref=debug,gc+heap=debug,gc+age=trace:file=/tmp/logs/gc_%p.log:tags,uptime,time,level -Xlog:safepoint:file=/tmp/logs/safepoint_%p.log:tags,uptime,time,level -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/logs -XX:ErrorFile=/tmp/logs/hs_error_pid%p.log -XX:-OmitStackTraceInFastThrow  OOMTest

![](/jvm-course-images/dae8a16da3fd.jpeg)

可以通过下面这个命令调整小堆区的大小来看一下这个过程。

-XX:G1HeapRegionSize=<N>M

### 元空间溢出

堆一般都是指定大小的，但元空间不是。所以如果元空间发生内存溢出会更加严重，会造成操作系统的内存溢出。在使用的时候也会给它设置一个上限。

元空间溢出主要是由于加载的类太多，或者动态生成的类太多。下面是一段模拟代码。通过访问 http://localhost:8888 触发后，它将会发生元空间溢出。

```
import com.sun.net.httpserver.HttpContext;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.OutputStream;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.net.InetSocketAddress;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.HashMap;
import java.util.Map;
public class MetaspaceOOMTest {
   public interface Facade {
       void m(String input);
   }
   public static class FacadeImpl implements Facade {
       @Override
       public void m(String name) {
       }
   }
   public static class MetaspaceFacadeInvocationHandler implements InvocationHandler {
       private Object impl;
       public MetaspaceFacadeInvocationHandler(Object impl) {
           this.impl = impl;
       }
       @Override
       public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
           return method.invoke(impl, args);
       }
   }
   private static Map<String, Facade> classLeakingMap = new HashMap<String, Facade>();
   private static void oom(HttpExchange exchange) {
       try {
           String response = "oom begin!";
           exchange.sendResponseHeaders(200, response.getBytes().length);
           OutputStream os = exchange.getResponseBody();
           os.write(response.getBytes());
           os.close();
       } catch (Exception ex) {
       }
       try {
           for (int i = 0; ; i++) {
               String jar = "file:" + i + ".jar";
               URL[] urls = new URL[]{new URL(jar)};
               URLClassLoader newClassLoader = new URLClassLoader(urls);
               Facade t = (Facade) Proxy.newProxyInstance(newClassLoader,
                       new Class<?>[]{Facade.class},
                       new MetaspaceFacadeInvocationHandler(new FacadeImpl()));
               classLeakingMap.put(jar, t);
           }
       } catch (Exception e) {
       }
   }
   private static void srv() throws Exception {
       HttpServer server = HttpServer.create(new InetSocketAddress(8888), 0);
       HttpContext context = server.createContext("/");
       context.setHandler(MetaspaceOOMTest::oom);
       server.start();
   }
   public static void main(String[] args) throws Exception {
       srv();
   }
}
```

这段代码将使用 Java 自带的动态代理类不断的生成新的 class。

java -Xmx20m  -Xmn4m   -XX:+UseG1GC  -verbose:gc -Xlog:gc,gc+ref=debug,gc+heap=debug,gc+age=trace:file=/tmp/logs/gc_%p.log:tags,uptime,time,level -Xlog:safepoint:file=/tmp/logs/safepoint_%p.log:tags,uptime,time,level -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/logs -XX:ErrorFile=/tmp/logs/hs_error_pid%p.log -XX:-OmitStackTraceInFastThrow -XX:MetaspaceSize=16M -XX:MaxMetaspaceSize=16M  MetaspaceOOMTest

在启动的时候，限制 Metaspace 空间大小为 16MB。可以看到运行一小会之后，Metaspace 会发生内存溢出。

[6.509s][info][gc] GC(28) Pause Young (Concurrent Start) (Metadata GC Threshold) 9M->9M(20M) 1.186ms

[6.509s][info][gc] GC(30) Concurrent Cycle

[6.534s][info][gc] GC(29) Pause Full (Metadata GC Threshold) 9M->9M(20M) 25.165ms

[6.556s][info][gc] GC(31) Pause Full (Metadata GC Clear Soft References) 9M->9M(20M) 21.136ms

[6.556s][info][gc] GC(30) Concurrent Cycle 46.668ms

java.lang.OutOfMemoryError: Metaspace

Dumping heap to /tmp/logs/java_pid36723.hprof ...

Heap dump file created [17362313 bytes in 0.134 secs]

![](/jvm-course-images/16efafbdcb85.jpeg)

但假如把堆 Metaspace 的限制给去掉，会更可怕。它占用的内存会一直增长。

### 堆外内存溢出

严格来说，上面的 Metaspace 也是属于堆外内存的。但是这里的堆外内存指的是 Java 应用程序通过直接方式从操作系统中申请的内存。所以严格来说，这里是指直接内存。

程序将通过 ByteBuffer 的 allocateDirect 方法每 1 秒钟申请 1MB 的直接内存。不要忘了通过链接触发这个过程。

但是，使用 VisualVM 看不到这个过程，使用 JMX 的 API 同样也看不到。关于这部分内容，将在堆外内存排查节进行详细介绍。

```
import com.sun.net.httpserver.HttpContext;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.OutputStream;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryPoolMXBean;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
public class OffHeapOOMTest {
   public static final int _1MB = 1024 * 1024;
   static List<ByteBuffer> byteList = new ArrayList<>();
   private static void oom(HttpExchange exchange) {
       try {
           String response = "oom begin!";
           exchange.sendResponseHeaders(200, response.getBytes().length);
           OutputStream os = exchange.getResponseBody();
           os.write(response.getBytes());
           os.close();
       } catch (Exception ex) {
       }
       for (int i = 0; ; i++) {
           ByteBuffer buffer = ByteBuffer.allocateDirect(_1MB);
           byteList.add(buffer);
           System.out.println(i + "MB");
           memPrint();
           try {
               Thread.sleep(1000);
           } catch (Exception e) {
           }
       }
   }
   private static void srv() throws Exception {
       HttpServer server = HttpServer.create(new InetSocketAddress(8888), 0);
       HttpContext context = server.createContext("/");
       context.setHandler(OffHeapOOMTest::oom);
       server.start();
   }
   public static void main(String[] args) throws Exception {
       srv();
   }
   static void memPrint() {
       for (MemoryPoolMXBean memoryPoolMXBean : ManagementFactory.getMemoryPoolMXBeans()) {
           System.out.println(memoryPoolMXBean.getName() +
                   "  committed:" + memoryPoolMXBean.getUsage().getCommitted() +
                   "  used:" + memoryPoolMXBean.getUsage().getUsed());
       }
   }
}
```

通过 top 或者操作系统的监控工具能够看到内存占用的明显增长。为了限制这些危险的内存申请，如果确定在程序中用到了大量的 JNI 和 JNA 操作，要显式的设置 MaxDirectMemorySize 参数。

以下是程序运行一段时间抛出的错误。

Exception in thread "Thread-2" java.lang.OutOfMemoryError: Direct buffer memory

at java.nio.Bits.reserveMemory(Bits.java:694)

at java.nio.DirectByteBuffer.<init>(DirectByteBuffer.java:123)

at java.nio.ByteBuffer.allocateDirect(ByteBuffer.java:311)

at OffHeapOOMTest.oom(OffHeapOOMTest.java:27)

at com.sun.net.httpserver.Filter$Chain.doFilter(Filter.java:79)

at sun.net.httpserver.AuthFilter.doFilter(AuthFilter.java:83)

at com.sun.net.httpserver.Filter$Chain.doFilter(Filter.java:82)

at sun.net.httpserver.ServerImpl$Exchange$LinkHandler.handle(ServerImpl.java:675)

at com.sun.net.httpserver.Filter$Chain.doFilter(Filter.java:79)

at sun.net.httpserver.ServerImpl$Exchange.run(ServerImpl.java:647)

at sun.net.httpserver.ServerImpl$DefaultExecutor.execute(ServerImpl.java:158)

at sun.net.httpserver.ServerImpl$Dispatcher.handle(ServerImpl.java:431)

at sun.net.httpserver.ServerImpl$Dispatcher.run(ServerImpl.java:396)

at java.lang.Thread.run(Thread.java:748)

启动命令。

java -XX:MaxDirectMemorySize=10M -Xmx10M OffHeapOOMTest

### 栈溢出

还记得虚拟机栈么？栈溢出指的就是这里的数据太多造成的溢出。通过 -Xss 参数可以设置它的大小。比如下面的命令就是设置栈大小为 128K。

-Xss128K

从这里也能了解到，由于每个线程都有一个虚拟机栈，线程的开销也是要占用内存的。如果系统中的线程数量过多，那么占用内存的大小也是非常可观的。

栈溢出不会造成 JVM 进程死亡，危害"相对较小"。下面是一个简单的模拟栈溢出的代码，只需要递归调用就可以了。

```
public class StackOverflowTest {
   static int count = 0;
   static void a() {
       System.out.println(count);
       count++;
       b();
   }
   static void b() {
       System.out.println(count);
       count++;
       a();
   }
   public static void main(String[] args) throws Exception {
       a();
   }
}
```

运行后，程序直接报错。

Exception in thread "main" java.lang.StackOverflowError

at java.io.PrintStream.write(PrintStream.java:526)

at java.io.PrintStream.print(PrintStream.java:597)

at java.io.PrintStream.println(PrintStream.java:736)

at StackOverflowTest.a(StackOverflowTest.java:5)

如果应用经常发生这种情况，可以试着调大这个值。但一般都是因为程序错误引起的，最好检查一下自己的代码。

### 进程异常退出

上面这几种溢出场景都有明确的原因和报错，排查起来也是非常容易的。但是还有一类应用死亡的时候静悄悄的，什么都没留下。

**Java 进程没了，什么都没留下，直接蒸发不见了**，这是已经不止一个同学问过的问题。

执行 dmesg 命令，大概率会看到进程崩溃信息躺在那里。

![](/jvm-course-images/69ba97f72dce.jpeg)

为了能看到发生的时间，习惯性加上参数 T（dmesg -T）。

这个现象其实和 Linux 的内存管理有关。由于 Linux 系统采用的是虚拟内存分配方式，JVM 的代码、库、堆和栈的使用都会消耗内存，但是申请出来的内存只要没真正 access 过，是不算的，因为没有真正为之分配物理页面。

随着使用内存越用越多。第一层防护墙就是 SWAP；当 SWAP 也用的差不多了，会尝试释放 cache；当这两者资源都耗尽，杀手就出现了。oom-killer 会在系统内存耗尽的情况下跳出来，选择性地干掉一些进程以求释放一点内存。

所以这时候 Java 进程是操作系统"主动"终结的，JVM 连发表遗言的机会都没有。这个信息只能在操作系统日志里查找。

要解决这种问题，首先不能太贪婪。比如一共 8GB 的机器，把整整 7.5GB 都分配给了 JVM。当操作系统内存不足时，JVM 就可能成为 oom-killer 的猎物。

相对于被动终结，还有一种主动求死的方式。有些程序会在代码里面做一些判断，直接调用 System.exit() 函数。

这个函数危险得很，它将强制终止应用，而且什么都不会留下。应该扫描代码，确保这样的逻辑不会存在。

再聊一种最初级最常见还经常发生的、会造成应用程序意外死亡的情况，那就是对 Java 程序错误的启动方式。

很多同学对 Linux 不是很熟悉，使用 XShell 登陆之后调用下面的命令进行启动。

java com.cn.AA &

这样调用还算有点意识，在最后使用了"&"号，以期望进程在后台运行。但可惜的是，很多情况下随着 XShell Tab 页的关闭或者等待超时，后面的 Java 进程就随着一块停止了，很让人困惑。

正确的启动方式是使用 nohup 关键字，或者阻塞在其他更加长命的进程里（比如 docker）。

nohup java com.cn.AA &

进程这种静悄悄的死亡方式，通常会给问题排查带来更多的困难。

在发生问题时，要确保留下足够的证据来支持接下来的分析。

通常，在关闭服务的时候会使用"kill -15"，而不是"kill -9"，以便让服务在临死之前喘口气。信号 9 和 15 的区别是面试经常问的一个问题，也是一种非常有效的手段。

## 内存泄漏排查

### 1. GC 引起 CPU 飙升

有个线上应用，单节点在运行一段时间后 CPU 的使用会飙升。一旦飙升，一般怀疑某个业务逻辑的计算量太大，或者是触发了死循环（比如著名的 HashMap 高并发引起的死循环），但排查到最后其实是 GC 的问题。

在 Linux 上，分析哪个线程引起的 CPU 问题通常有一个固定的步骤。下面分解这个过程，**这是面试频率极高的一个问题**。

![](/jvm-course-images/6179a5ca350c.jpeg)

（1）使用 top 命令查找到使用 CPU 最多的某个进程，记录它的 pid。使用 Shift + P 快捷键可以按 CPU 的使用率进行排序。

```
top
```

（2）再次使用 top 命令，加 -H 参数，查看某个进程中使用 CPU 最多的某个线程，记录线程的 ID。

```
top -Hp $pid
```

（3）使用 printf 函数，将十进制的 tid 转化成十六进制。

```
printf %x $tid
```

（4）使用 jstack 命令，查看 Java 进程的线程栈。

```
jstack $pid >$pid.log
```

（5）使用 less 命令查看生成的文件，并查找刚才转化的十六进制 tid，找到发生问题的线程上下文。

```
less $pid.log
```

在 jstack 日志中找到了 CPU 使用最多的几个线程。

![](/jvm-course-images/4ff68a4dac09.jpeg)

可以看到问题发生的根源是堆已经满了，但是又没有发生 OOM，于是 GC 进程就一直在那里回收，回收的效果又非常一般，造成 CPU 升高应用假死。

接下来的具体问题排查就需要把内存 dump 一份下来，使用 MAT 等工具分析具体原因了（见下文《利用 MAT 定位根因》）。

### 2. 现场保留

可以看到这个过程是繁杂而冗长的，需要记忆很多内容。现场保留可以使用自动化方式将必要的信息保存下来，那一般在线上系统会保留哪些信息呢？下面进行一下总结。

#### 2.1. 瞬时态和历史态

为了协助分析，这里创造了两个名词：**瞬时态和历史态**。瞬时态是指当时发生的、快照类型的元素；历史态是指按照频率抓取的、有固定监控项的资源变动图。

有很多信息，比如 CPU、系统内存等，瞬时态的价值就不如历史态来得直观一些。因为瞬时状态无法体现一个趋势性问题（比如斜率、求导等），而这些信息的获取一般依靠监控系统的协作。

但对于 lsof、heap 等这种没有时间序列概念的混杂信息，体积都比较大，无法进入监控系统产生有用价值，就只能通过瞬时态进行分析。在这种情况下瞬时态的价值反而更大一些。常见的堆快照就属于瞬时状态。

问题不是凭空产生的，在分析时一般要收集系统的整体变更集合，比如代码变更、网络变更，甚至数据量的变化。

![](/jvm-course-images/6f3089afdd24.jpeg)

接下来对每一项资源的获取方式进行介绍。

#### 2.2. 保留信息

（1）系统当前网络连接

```
ss -antp > $DUMP_DIR/ss.dump 2>&1
```

其中，ss 命令将系统的所有网络连接输出到 ss.dump 文件中。使用 ss 命令而不是 netstat 的原因，是因为 netstat 在网络连接非常多的情况下执行非常缓慢。

后续的处理，可通过查看各种网络连接状态的梳理，来排查 TIME_WAIT 或者 CLOSE_WAIT，或者其他连接过高的问题，非常有用。

线上有个系统更新之后，监控到 CLOSE_WAIT 的状态突增，最后整个 JVM 都无法响应。CLOSE_WAIT 状态的产生一般都是代码问题，使用 jstack 最终定位到是因为 HttpClient 的不当使用而引起的，多个连接不完全主动关闭。

（2）网络状态统计

```
netstat -s > $DUMP_DIR/netstat-s.dump 2>&1
```

此命令将网络统计状态输出到 netstat-s.dump 文件中。它能够按照各个协议进行统计输出，对把握当时整个网络状态有非常大的作用。

```
sar -n DEV 1 2 > $DUMP_DIR/sar-traffic.dump 2>&1
```

上面这个命令会使用 sar 输出当前的网络流量。在一些速度非常高的模块上，比如 Redis、Kafka，就经常发生跑满网卡的情况。如果 Java 程序和它们在一起运行，资源则会被挤占，表现形式就是网络通信非常缓慢。

（3）进程资源

```
lsof -p $PID > $DUMP_DIR/lsof-$PID.dump
```

这是个非常强大的命令，通过查看进程能看到打开了哪些文件。它可以以进程的维度来查看整个资源的使用情况，包括每条网络连接、每个打开的文件句柄。同时也可以很容易地看到连接到了哪些服务器、使用了哪些资源。这个命令在资源非常多的情况下输出稍慢，请耐心等待。

（4）CPU 资源

```
mpstat > $DUMP_DIR/mpstat.dump 2>&1
vmstat 1 3 > $DUMP_DIR/vmstat.dump 2>&1
sar -p ALL  > $DUMP_DIR/sar-cpu.dump  2>&1
uptime > $DUMP_DIR/uptime.dump 2>&1
```

主要用于输出当前系统的 CPU 和负载，便于事后排查。这几个命令的功能有不少重合，使用者要注意甄别。

（5）I/O 资源

```
iostat -x > $DUMP_DIR/iostat.dump 2>&1
```

一般，以计算为主的服务节点 I/O 资源会比较正常，但有时也会发生问题，比如日志输出过多，或者磁盘问题等。此命令可以输出每块磁盘的基本性能信息，用来排查 I/O 问题。在前文《JVM 垃圾回收与调优》中介绍的 GC 日志分磁盘问题就可以使用这个命令去发现。

（6）内存问题

```
free -h > $DUMP_DIR/free.dump 2>&1
```

free 命令能够大体展现操作系统的内存概况，这是故障排查中一个非常重要的点，比如 SWAP 影响了 GC，SLAB 区挤占了 JVM 的内存。

（7）其他全局

```
ps -ef > $DUMP_DIR/ps.dump 2>&1
dmesg > $DUMP_DIR/dmesg.dump 2>&1
sysctl -a > $DUMP_DIR/sysctl.dump 2>&1
```

dmesg 是许多静悄悄死掉的服务留下的最后一点线索。当然，ps 作为执行频率最高的一个命令，它当时的输出信息也必然有一些可以参考的价值。

另外，由于内核的配置参数会对系统和 JVM 产生影响，所以也输出了一份。

（8）进程快照，最后的遗言（jinfo）

```
${JDK_BIN}jinfo $PID > $DUMP_DIR/jinfo.dump 2>&1
```

此命令将输出 Java 的基本进程信息，包括环境变量和参数配置，可以查看是否因为一些错误的配置造成了 JVM 问题。

（9）dump 堆信息

```
${JDK_BIN}jstat -gcutil $PID > $DUMP_DIR/jstat-gcutil.dump 2>&1
${JDK_BIN}jstat -gccapacity $PID > $DUMP_DIR/jstat-gccapacity.dump 2>&1
```

jstat 将输出当前的 gc 信息。一般基本能大体看出一个端倪，如果不能，可借助 jmap 来进行分析。

（10）堆信息

```
${JDK_BIN}jmap $PID > $DUMP_DIR/jmap.dump 2>&1
${JDK_BIN}jmap -heap $PID > $DUMP_DIR/jmap-heap.dump 2>&1
${JDK_BIN}jmap -histo $PID > $DUMP_DIR/jmap-histo.dump 2>&1
${JDK_BIN}jmap -dump:format=b,file=$DUMP_DIR/heap.bin $PID > /dev/null  2>&1
```

jmap 将会得到当前 Java 进程的 dump 信息。如上所示，其实最有用的就是第 4 个命令，但是前面三个能够对系统概况进行大体判断。

因为第 4 个命令产生的文件一般都非常大。而且需要下载下来，导入 MAT 这样的工具进行深入分析才能获取结果。这是分析内存泄漏一个必经的过程。

（11）JVM 执行栈

```
${JDK_BIN}jstack $PID > $DUMP_DIR/jstack.dump 2>&1
```

jstack 将会获取当时的执行栈。一般会多次取值，这里取一次即可。这些信息非常有用，能够还原 Java 进程中的线程情况。

```
top -Hp $PID -b -n 1 -c >  $DUMP_DIR/top-$PID.dump 2>&1
```

为了能够得到更加精细的信息，使用 top 命令来获取进程中所有线程的 CPU 信息，这样就能看到资源到底耗费在什么地方了。

（12）高级替补

```
kill -3 $PID
```

有时候 jstack 并不能够运行，有很多原因，比如 Java 进程几乎不响应了等之类的情况。会尝试向进程发送 kill -3 信号，这个信号将会打印 jstack 的 trace 信息到日志文件中，是 jstack 的一个替补方案。

```
gcore -o $DUMP_DIR/core $PID
```

对于 jmap 无法执行的问题也有替补，那就是 GDB 组件中的 gcore，将会生成一个 core 文件。可以使用如下的命令去生成 dump：

```
${JDK_BIN}jhsdb jmap --exe ${JDK}java  --core $DUMP_DIR/core --binaryheap
```

### 3. 内存泄漏的现象

稍微提一下 jmap 命令，它的 `-heap` 选项在 JDK 9 中被移除，取而代之的是 jhsdb，可以像下面的命令一样使用（jmap 本身的 `-dump`、`-histo` 等功能仍然可用）。

```
jhsdb jmap  --heap --pid  37340
jhsdb jmap  --pid  37288
jhsdb jmap  --histo --pid  37340
jhsdb jmap  --binaryheap --pid  37340
```

heap 参数能够看到大体的内存布局，以及每一个年代中的内存使用情况。这和前面介绍的内存布局，以及在 VisualVM 中看到的没有什么不同。但由于它是命令行，所以使用更加广泛。

![](/jvm-course-images/7900e7791c61.jpeg)

histo 能够大概地看到系统中每一种类型占用的空间大小，用于初步判断问题。比如某个对象 instances 数量很小，但占用的空间很大，这就说明存在大对象。但它也只能看大概的问题，要找到具体原因还是要 dump 出当前 live 的对象。

![](/jvm-course-images/3f4735301ad2.jpeg)

一般内存溢出，表现形式就是 Old 区的占用持续上升，即使经过了多轮 GC 也没有明显改善。前面提到了 GC Roots，内存泄漏的根本就是有些对象并没有切断和 GC Roots 的关系，可通过一些工具看到它们的联系。

### 4. 一个卡顿实例

有一个关于服务的某个实例，经常发生服务卡顿。由于服务的并发量是比较高的，所以表现也非常明显。这个服务和前文介绍的高并发服务类似，每多停顿 1 秒钟，几万用户的请求就会感到延迟。

统计、类比了此服务其他实例的 CPU、内存、网络、I/O 资源，区别并不是很大，所以一度怀疑是机器硬件的问题。

接下来对比了节点的 GC 日志，发现无论是 Minor GC 还是 Major GC，这个节点所花费的时间都比其他实例长得多。

通过仔细观察发现，在 GC 发生的时候 vmstat 的 si、so 飙升得非常严重，这和其他实例有着明显的不同。

使用 free 命令再次确认，发现 SWAP 分区使用的比例非常高。引起的具体原因是什么呢？

更详细的操作系统内存分布，从 /proc/meminfo 文件中可以看到具体的逻辑内存块大小，有多达 40 项的内存信息，这些信息都可以通过遍历 /proc 目录的一些文件获取。注意到 slabtop 命令显示的有一些异常，dentry（目录高速缓冲）占用非常高。

问题最终定位到是由于某个运维工程师执行了一句命令：

```
find / | grep "x"
```

他是想找一个叫做 x 的文件，看看在哪台服务器上。结果这些老服务器由于文件太多，扫描后这些文件信息都缓存到了 slab 区上。而服务器开了 swap，操作系统发现物理内存占满后并没有立即释放 cache，导致每次 GC 都要和硬盘打一次交道。

解决方式就是关闭 SWAP 分区。

**swap 是很多性能场景的万恶之源，建议禁用**。当应用真正高并发了，SWAP 绝对能让人体验到它魔鬼性的一面：**进程倒是死不了了，但 GC 时间长的却让人无法忍受。**

### 5. 内存泄漏

![](/jvm-course-images/a9cf9a25296a.jpeg)

再来聊一下内存溢出和内存泄漏的区别。

**内存溢出是一个结果，而内存泄漏是一个原因**。内存溢出的原因有内存空间不足、配置错误等因素。

不再被使用的对象没有被回收、没有及时切断与 GC Roots 的联系，这就是内存泄漏。内存泄漏是一些错误的编程方式，或者过多的无用对象创建引起的。

举个例子，有团队使用了 HashMap 做缓存，但是并没有设置超时时间或者 LRU 策略，造成了放入 Map 对象的数据越来越多，而产生内存泄漏。

再来看一个经常发生的内存泄漏的例子，也是由于 HashMap 产生的。代码如下，由于没有重写 Key 类的 hashCode 和 equals 方法，造成了放入 HashMap 的所有对象都无法被取出来，它们和外界**失联了**。所以下面的代码结果是 null。

```
//leak example
import java.util.HashMap;
import java.util.Map;

public class HashMapLeakDemo {
    public static class Key {
        String title;

public Key(String title) {
            this.title = title;
        }
    }

public static void main(String[] args) {
        Map<Key, Integer> map = new HashMap<>();

map.put(new Key("1"), 1);
        map.put(new Key("2"), 2);
        map.put(new Key("3"), 2);

        Integer integer = map.get(new Key("2"));
        System.out.println(integer);
    }
}
```

即使提供了 equals 方法和 hashCode 方法，也要非常小心，尽量避免使用自定义的对象作为 Key。仓库中 dog 目录有一个实际的、有问题的例子，可以尝试排查一下。

再看一个例子，关于文件处理器的应用，在读取或者写入一些文件之后，由于发生了一些异常，close 方法又没有放在 finally 块里面，造成了文件句柄的泄漏。由于文件处理十分频繁，产生了严重的内存泄漏问题。

另外，对 Java API 的一些不当使用也会造成内存泄漏。很多同学喜欢使用 String 的 intern 方法，但如果字符串本身是一个非常长的字符串，而且创建之后不再被使用，则会造成内存泄漏。

```
import java.util.UUID;

public class InternDemo {
    static String getLongStr() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 100000; i++) {
            sb.append(UUID.randomUUID().toString());
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        while (true) {
            getLongStr().intern();
        }
    }
}
```

## 利用 MAT 定位根因

### 1. 工具介绍

有很多工具能够帮助分析这份内存快照。在前面已多次提到 VisualVm 这个工具，它同样可以加载和分析这份 dump 数据，虽然比较"寒碜"。

专业的事情要有专业的工具来做，下面要介绍一款专业的开源分析工具，即 MAT。

MAT 工具是基于 Eclipse 平台开发的，本身是一个 Java 程序，所以如果堆快照比较大的话，则需要一台内存比较大的分析机器，并给 MAT 本身加大初始内存，这个可以修改安装目录中的 MemoryAnalyzer.ini 文件。

看一下 MAT 工具的截图，主要的功能都体现在工具栏上。其中，默认的启动界面展示了占用内存最高的一些对象，并有一些常用的快捷方式。通常，发生内存泄漏的对象会在快照中占用比较大的比重，分析这些比较大的对象是切入问题的第一步。

![](/jvm-course-images/ab8cecbd191b.jpeg)

点击对象可以浏览对象的引用关系，这是一个非常有用的功能：

- **outgoing references** 对象的引出
- **incoming references** 对象的引入

**path to GC Roots** 这是快速分析的一个常用功能，显示和 GC Roots 之间的路径。

![](/jvm-course-images/a3754a7142ae.jpeg)

另外一个比较重要的概念就是**浅堆**（Shallow Heap）和**深堆**（Retained Heap），在 MAT 上经常看到这两个数值。

![](/jvm-course-images/9172753c01dd.jpeg)

浅堆代表了对象本身的内存占用，包括对象自身的内存占用，以及"为了引用"其他对象所占用的内存。

深堆是一个统计结果，会循环计算引用的具体对象所占用的内存。但是深堆和"对象大小"有一点不同，**深堆指的是一个对象被垃圾回收后能够释放的内存大小，这些被释放的对象集合叫做保留集**（Retained Set）。

![](/jvm-course-images/7bcc97374f07.png)

如上图所示，A 对象浅堆大小 1 KB，B 对象 2 KB，C 对象 100 KB。A 对象同时引用了 B 对象和 C 对象，但由于 C 对象也被 D 引用，所以 A 对象的深堆大小为 3 KB（1 KB + 2 KB）。

A 对象大小（1 KB + 2 KB + 100 KB）> A 对象深堆 > A 对象浅堆。

### 2. 代码示例

```
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

public class Objects4MAT {

static class A4MAT {
        B4MAT b4MAT = new B4MAT();
    }

static class B4MAT {
        C4MAT c4MAT = new C4MAT();
    }

static class C4MAT {
        List<String> list = new ArrayList<>();
    }

static class DominatorTreeDemo1 {
        DominatorTreeDemo2 dominatorTreeDemo2;

public void setValue(DominatorTreeDemo2 value) {
            this.dominatorTreeDemo2 = value;
        }
    }

static class DominatorTreeDemo2 {
        DominatorTreeDemo1 dominatorTreeDemo1;

public void setValue(DominatorTreeDemo1 value) {
            this.dominatorTreeDemo1 = value;
        }
    }

static class Holder {
        DominatorTreeDemo1 demo1 = new DominatorTreeDemo1();
        DominatorTreeDemo2 demo2 = new DominatorTreeDemo2();

Holder() {
            demo1.setValue(demo2);
            demo2.setValue(demo1);
        }

private boolean aBoolean = false;
        private char aChar = '\0';
        private short aShort = 1;
        private int anInt = 1;
        private long aLong = 1L;
        private float aFloat = 1.0F;
        private double aDouble = 1.0D;
        private Double aDouble_2 = 1.0D;
        private int[] ints = new int[2];
        private String string = "1234";
    }

Runnable runnable = () -> {
        Map<String, A4MAT> map = new HashMap<>();

IntStream.range(0, 100).forEach(i -> {
            byte[] bytes = new byte[1024 * 1024];
            String str = new String(bytes).replace('\0', (char) i);
            A4MAT a4MAT = new A4MAT();
            a4MAT.b4MAT.c4MAT.list.add(str);

map.put(i + "", a4MAT);
        });

Holder holder = new Holder();

try {
            //sleep forever , retain the memory
            Thread.sleep(Integer.MAX_VALUE);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    };

void startHugeThread() throws Exception {
        new Thread(runnable, "huge-thread").start();
    }

    public static void main(String[] args) throws Exception {
        Objects4MAT objects4MAT = new Objects4MAT();
        objects4MAT.startHugeThread();
    }
}
```

#### 2.1. 代码介绍

以一段代码示例 **Objects4MAT**，来具体看一下 MAT 工具的使用。代码创建了一个新的线程 "huge-thread"，并建立了一个引用的层级关系，总的内存大约占用 100 MB。同时，demo1 和 demo2 展示了一个循环引用的关系。最后使用 sleep 函数让线程永久阻塞住，此时整个堆处于一个相对"静止"的状态。

![](/jvm-course-images/6af252da23cb.png)

如果是在本地启动的示例代码，则可以使用 Accquire 的方式来获取堆快照。

![](/jvm-course-images/78dbf9586e00.jpeg)

#### 2.2. 内存泄漏检测

如果问题特别突出，则可以通过 Find Leaks 菜单快速找出问题。

![](/jvm-course-images/19cfdfe8f4f0.jpeg)

![](/jvm-course-images/b124dff7ae55.jpeg)

对于特别明显的内存泄漏，在这里能够帮助迅速定位，但通常内存泄漏问题会比较隐蔽，需要更加复杂的分析。

#### 2.3. 支配树视图

支配树视图对数据进行了归类，体现了对象之间的依赖关系。如图，通常会根据"深堆"进行倒序排序，可以很容易地看到占用内存比较高的几个对象，点击前面的箭头即可一层层展开支配关系。

图中显示的是其中的 1 MB 数据，从左侧的 inspector 视图可以看到这 1 MB 的 byte 数组具体内容。

![](/jvm-course-images/59c6e1f4ef1f.jpeg)

从支配树视图同样能够找到创建的两个循环依赖，但它们并没有显示这个过程。

![](/jvm-course-images/94eb916034ea.jpeg)

支配树视图的概念有一点点复杂，只需要了解这个概念即可。

![](/jvm-course-images/d7c5bb8aad70.png)

如上图，左边是引用关系，右边是支配树视图。可以看到 A、B、C 被当作是"虚拟"的根，支配关系是可传递的，因为 C 支配 E，E 支配 G，所以 C 也支配 G。

另外，到对象 C 的路径中，可以经过 A，也可以经过 B，因此对象 C 的直接支配者也是根对象。同理，对象 E 是 H 的支配者。

再来看看比较特殊的 D 和 F。对象 F 与对象 D 相互引用，因为到对象 F 的所有路径必然经过对象 D，因此对象 D 是对象 F 的直接支配者。

可以看到支配树视图并不一定总是能看到对象的真实引用关系，但这对分析问题的影响并不是很大。

这个视图是非常好用的，甚至可以根据 package 进行归类，对目标类的查找也是非常快捷的。

![](/jvm-course-images/e8c97014550e.jpeg)

编译下面这段代码可以展开视图，实际观测一下支配树，这和上面介绍的一致。

```
public class DorminatorTreeDemo {
    static class A {
        C c;

byte[] data = new byte[1024 * 1024 * 2];
    }

static class B {
        C c;
        byte[] data = new byte[1024 * 1024 * 3];
    }

static class C {
        D d;
        E e;
        byte[] data = new byte[1024 * 1024 * 5];
    }

static class D {
        F f;
        byte[] data = new byte[1024 * 1024 * 7];
    }

static class E {
        G g;
        byte[] data = new byte[1024 * 1024 * 11];
    }

static class F {
        D d;
        H h;
        byte[] data = new byte[1024 * 1024 * 13];
    }

static class G {
        H h;
        byte[] data = new byte[1024 * 1024 * 17];
    }

static class H {
        byte[] data = new byte[1024 * 1024 * 19];
    }

A makeRef(A a, B b) {
        C c = new C();
        D d = new D();
        E e = new E();
        F f = new F();
        G g = new G();
        H h = new H();
        a.c = c;
        b.c = c;
        c.e = e;
        c.d = d;
        d.f = f;
        e.g = g;
        f.d = d;
        f.h = h;
        g.h = h;
        return a;
    }

static A a = new A();
    static B b = new B();

public static void main(String[] args) throws Exception {

new DorminatorTreeDemo().makeRef(a, b);

        Thread.sleep(Integer.MAX_VALUE);
    }
}
```

![](/jvm-course-images/cb3cbb3b2134.jpeg)

#### 2.4. 线程视图

想要看具体的引用关系，可以通过线程视图。在前文就已经了解了线程其实是可以作为 GC Roots 的。如图展示了线程内对象的引用关系，以及方法调用关系，相对比 jstack 获取的栈 dump，能够更加清晰地看到内存中具体的数据。

如下图，找到了 huge-thread，依次展开找到 holder 对象，可以看到循环依赖已经陷入了无限循环的状态。这在查看一些 Java 对象的时候经常发生，不要感到奇怪。

![](/jvm-course-images/10d875167d1b.jpeg)

#### 2.5. 柱状图视图

返回头来再看一下柱状图视图，可以看到除了对象的大小还有类的实例个数。结合 MAT 提供的不同显示方式，往往能够直接定位问题。也可以通过正则过滤一些信息，在这里输入 MAT，过滤猜测的、可能出现问题的类，可以看到创建的这些自定义对象不多不少正好一百个。

![](/jvm-course-images/eab63857bb3a.jpeg)

右键点击类然后选择 incoming，这会列出所有的引用关系。

![](/jvm-course-images/6376ea8a5e84.jpeg)

再次选择某个引用关系，然后选择菜单"Path To GC Roots"，即可显示到 GC Roots 的全路径。通常在排查内存泄漏的时候会选择排除虚弱软等引用。

![](/jvm-course-images/005eeb0e501b.jpeg)

使用这种方式即可在引用之间进行跳转，方便地找到所需要的信息。

![](/jvm-course-images/644b87b4a1c3.jpeg)

再介绍一个比较高级的功能。

对于堆的快照，其实是一个"**瞬时态**"，有时候仅仅分析这个瞬时状态并不一定能确定问题，这就需要对两个或者多个快照进行对比来确定一个增长趋势。

![](/jvm-course-images/a4bea0fc1bd9.jpeg)

可以将代码中的 100 改成 10 或其他数字，再次 dump 一份快照进行比较。如图，通过分析某类对象的增长即可辅助问题定位。

### 3. 高级功能—OQL

MAT 支持一种类似于 SQL 的查询语言 OQL（Object Query Language），这个查询语言 VisualVM 工具也支持。

![](/jvm-course-images/ed656579c80c.jpeg)

以下是几个例子，可以实际实践一下。

查询 A4MAT 对象：

```
SELECT * FROM  Objects4MAT$A4MAT
```

正则查询 MAT 结尾的对象：

```
SELECT * FROM ".*MAT"
```

查询 String 类的 char 数组：

```
SELECT OBJECTS s.value FROM java.lang.String s 
SELECT OBJECTS mat.b4MAT FROM  Objects4MAT$A4MAT mat
```

根据内存地址查找对象：

```
select * from 0x55a034c8
```

使用 INSTANCEOF 关键字查找所有子类：

```
SELECT * FROM INSTANCEOF java.util.AbstractCollection
```

查询长度大于 1000 的 byte 数组：

```
SELECT * FROM byte[] s WHERE s.@length>1000
```

查询包含 java 字样的所有字符串：

```
SELECT * FROM java.lang.String s WHERE toString(s) LIKE ".*java.*"
```

查找所有深堆大小大于 1 万的对象：

```
SELECT * FROM INSTANCEOF java.lang.Object o WHERE o.@retainedHeapSize>10000
```

如果忘记这些属性的名称的话，MAT 是可以自动补全的。

![](/jvm-course-images/af73c4fb4ea6.jpeg)

OQL 有比较多的语法和用法，若想深入了解可参考 MAT 官方帮助文档中的 OQL 章节。

一般，使用上面这些简单的查询语句就够用了。

OQL 还有一个好处，就是可以分享。如果和同事同时在分析一个大堆，不用告诉他先点哪一步、再点哪一步，共享给他一个 OQL 语句就可以了。

如下图，MAT 提供了复制 OQL 的功能，但是用在其他快照上不会起作用，因为它复制的是如下的内容。

![](/jvm-course-images/20d7ba2d9505.jpeg)

## 堆外内存排查

### 1. 现象

有一个服务非常奇怪，在某个版本之后占用的内存开始增长，直到虚拟机分配的内存上限，但是并不会 OOM。如果开启了 SWAP，会发现这个应用也会毫不犹豫地将它吞掉，有多少吞多少。

说它的内存增长，是通过 top 命令去观察的，看它的 RES 列的数值；反之，如果使用 jmap 命令去看内存占用，得到的只是堆的大小，只能看到一小块可怜的空间。

![](/jvm-course-images/77a745c97359.png)

使用 ps 也能看到相同的效果。观测到除了虚拟内存比较高达到了 17GB 以外，实际使用的内存 RSS 也夸张地达到了 7 GB，远远超过了 -Xmx 的设定。

```
[root]$ ps -p 75 -o rss,vsz  
RSS    VSZ 7152568 17485844
```

使用 jps 查看启动参数，发现分配了大约 3GB 的堆内存。实际内存使用超出了最大内存设定的一倍还多，这明显是不正常的，肯定是使用了堆外内存。

### 2. 模拟程序

为了能够使用这些工具实际观测这个内存泄漏的过程，这里准备了一份小程序。程序将会持续地使用 Java 的 Zip 函数进行压缩和解压，这种操作在一些对传输性能较高的场景经常会用到。

程序将会申请 1kb 的随机字符串，然后持续解压。为了避免让操作系统陷入假死状态，每次都会判断操作系统内存使用率，在达到 60% 的时候将挂起程序；通过访问 8888 端口，将会把内存阈值提高到 85%。将分析这两个处于相对静态的虚拟快照。

```
import com.sun.management.OperatingSystemMXBean;
import com.sun.net.httpserver.HttpContext;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.lang.management.ManagementFactory;
import java.net.InetSocketAddress;
import java.util.Random;
import java.util.concurrent.ThreadLocalRandom;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

/**
 * @author xjjdog
 */
public class LeakExample {
    /**
     * 构造随机的字符串
     */
    public static String randomString(int strLength) {
        Random rnd = ThreadLocalRandom.current();
        StringBuilder ret = new StringBuilder();
        for (int i = 0; i < strLength; i++) {
            boolean isChar = (rnd.nextInt(2) % 2 == 0);
            if (isChar) {
                int choice = rnd.nextInt(2) % 2 == 0 ? 65 : 97;
                ret.append((char) (choice + rnd.nextInt(26)));
            } else {
                ret.append(rnd.nextInt(10));
            }
        }
        return ret.toString();
    }

public static int copy(InputStream input, OutputStream output) throws IOException {
        long count = copyLarge(input, output);
        return count > 2147483647L ? -1 : (int) count;
    }

public static long copyLarge(InputStream input, OutputStream output) throws IOException {
        byte[] buffer = new byte[4096];
        long count = 0L;

int n;
        for (; -1 != (n = input.read(buffer)); count += (long) n) {
            output.write(buffer, 0, n);
        }

return count;
    }

public static String decompress(byte[] input) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        copy(new GZIPInputStream(new ByteArrayInputStream(input)), out);
        return new String(out.toByteArray());
    }

public static byte[] compress(String str) throws Exception {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        GZIPOutputStream gzip = new GZIPOutputStream(bos);

try {
            gzip.write(str.getBytes());
            gzip.finish();
            byte[] b = bos.toByteArray();
            return b;
        }finally {
            try { gzip.close(); }catch (Exception ex ){}
            try { bos.close(); }catch (Exception ex ){}
        }
    }

private static OperatingSystemMXBean osmxb = (OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();

public static int memoryLoad() {
        double totalvirtualMemory = osmxb.getTotalPhysicalMemorySize();
        double freePhysicalMemorySize = osmxb.getFreePhysicalMemorySize();

double value = freePhysicalMemorySize / totalvirtualMemory;
        int percentMemoryLoad = (int) ((1 - value) * 100);
        return percentMemoryLoad;
    }

private static volatile int RADIO = 60;

public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8888), 0);
        HttpContext context = server.createContext("/");
        context.setHandler(exchange -> {
            try {
                RADIO = 85;
                String response = "OK!";
                exchange.sendResponseHeaders(200, response.getBytes().length);
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes());
                os.close();
            } catch (Exception ex) {
            }
        });
        server.start();

        //1kb
        int BLOCK_SIZE = 1024;
        String str = randomString(BLOCK_SIZE / Byte.SIZE);
        byte[] bytes = compress(str);
        for (; ; ) {
            int percent = memoryLoad();
            if (percent > RADIO) {
                Thread.sleep(1000);
            } else {
                decompress(bytes);
                Thread.sleep(1);
            }
```

程序将使用下面的命令行进行启动。为了简化问题，这里省略了一些无关的配置。

```
java -Xmx1G -Xmn1G -XX:+AlwaysPreTouch  -XX:MaxMetaspaceSize=10M -XX:MaxDirectMemorySize=10M -XX:NativeMemoryTracking=detail LeakExample
```

### 3. NMT

首先介绍一下上面的几个 JVM 参数，分别使用 Xmx、MaxMetaspaceSize、MaxDirectMemorySize 这三个参数限制了堆、元空间、直接内存的大小。

然后使用 AlwaysPreTouch 参数。其实通过参数指定了 JVM 大小，只有在 JVM 真正使用的时候才会分配给它。这个参数在 JVM 启动的时候就把它的所有内存在操作系统分配了。在堆比较大的时候会加大启动时间，但在这个场景中为了减少内存动态分配的影响，把这个值设置为 True。

接下来的 NativeMemoryTracking 是用来追踪 Native 内存的使用情况的。通过在启动参数上加入 -XX:NativeMemoryTracking=detail 就可以启用。使用 jcmd 命令就可查看内存分配。

```
jcmd $pid  VM.native_memory summary
```

在一台 4GB 的虚拟机上使用上面的命令。启动程序之后发现进程使用的内存迅速升到 2.4GB。

```
## 堆外内存排查
2154:
Native Memory Tracking:

Total: reserved=2370381KB, committed=1071413KB
-                 Java Heap (reserved=1048576KB, committed=1048576KB)
                            (mmap: reserved=1048576KB, committed=1048576KB)

-                     Class (reserved=1056899KB, committed=4995KB)
                            (classes #432)
                            (malloc=131KB #328)
                            (mmap: reserved=1056768KB, committed=4864KB)

-                    Thread (reserved=10305KB, committed=10305KB)
                            (thread #11)
                            (stack: reserved=10260KB, committed=10260KB)
                            (malloc=34KB #52)
                            (arena=12KB #18)

-                      Code (reserved=249744KB, committed=2680KB)
                            (malloc=144KB #502)
                            (mmap: reserved=249600KB, committed=2536KB)

-                        GC (reserved=2063KB, committed=2063KB)
                            (malloc=7KB #80)
                            (mmap: reserved=2056KB, committed=2056KB)

-                  Compiler (reserved=138KB, committed=138KB)
                            (malloc=8KB #38)
                            (arena=131KB #5)

-                  Internal (reserved=789KB, committed=789KB)
                            (malloc=757KB #1272)
                            (mmap: reserved=32KB, committed=32KB)

-                    Symbol (reserved=1535KB, committed=1535KB)
                            (malloc=983KB #114)
                            (arena=552KB #1)

-    Native Memory Tracking (reserved=159KB, committed=159KB)
                            (malloc=99KB #1399)
                            (tracking overhead=60KB)

-               Arena Chunk (reserved=174KB, committed=174KB)
                            (mall
```

可惜的是，这个名字让人振奋的工具并不能如它描述的一样，看到这种泄漏的场景。下图这点小小的空间是不能和 2GB 的内存占用相比的。

![](/jvm-course-images/bbddfb108b0c.png)

NMT 能看到堆内内存、Code 区域或者使用 unsafe.allocateMemory 和 DirectByteBuffer 申请的堆外内存，虽然是个好工具但问题并不能解决。

使用 jmap 工具 dump 一份堆快照，然后使用 MAT 分析依然不能找到这部分内存。

### 4. pmap

像是 EhCache 这种缓存框架提供了多种策略，可以设定将数据存储在非堆上，要排查的就是这些影响因素。如果能够在代码里看到这种可能性最大的代码块是最好的。

为了进一步分析问题，使用 pmap 命令查看进程的内存分配，通过 RSS 升序排列。结果发现除了地址 00000000c0000000 上分配的 1GB 堆以外（也就是堆内存），还有数量非常多的 64M 一块的内存段，还有巨量小的物理内存块映射到不同的虚拟内存段上。但到现在为止不知道里面的内容是什么，是通过什么产生的。

```
## pmap -x 2154  | sort -n -k3
Address           Kbytes     RSS   Dirty Mode  Mapping
---------------- ------- ------- -------
0000000100080000 1048064       0       0 -----   [ anon ]
00007f2d4fff1000      60       0       0 -----   [ anon ]
00007f2d537fb000    8212       0       0 -----   [ anon ]
00007f2d57ff1000      60       0       0 -----   [ anon ]
.....省略N行
00007f2e3c000000   65524   22064   22064 rw---   [ anon ]
00007f2e00000000   65476   22068   22068 rw---   [ anon ]
00007f2e18000000   65476   22072   22072 rw---   [ anon ]
00007f2e30000000   65476   22076   22076 rw---   [ anon ]
00007f2dc0000000   65520   22080   22080 rw---   [ anon ]
00007f2dd8000000   65520   22080   22080 rw---   [ anon ]
00007f2da8000000   65524   22088   22088 rw---   [ anon ]
00007f2e8c000000   65528   22088   22088 rw---   [ anon ]
00007f2e64000000   65520   22092   22092 rw---   [ anon ]
00007f2e4c000000   65520   22096   22096 rw---   [ anon ]
00007f2e7c000000   65520   22096   22096 rw---   [ anon ]
00007f2ecc000000   65520   22980   22980 rw---   [ anon ]
00007f2d84000000   65476   23368   23368 rw---   [ anon ]
00007f2d9c000000  131060   43932   43932 rw---   [ anon ]
00007f2d50000000   57324   56000   56000 rw---   [ anon ]
00007f2d4c000000   65476   64160   64160 rw---   [ anon ]
00007f2d5c000000   65476   64164   64164 rw---   [ anon ]
00007f2d64000000   65476   64164   64164 rw---   [ anon ]
00007f2d54000000   65476   64168   64168 rw---   [ anon ]
00007f2d7c000000   65476   64168   64168 rw---   [ anon ]
00007f2d60000000   65520   64172   64172 rw---   [ anon ]
00007f2d6c000000   65476   64172   64172 rw---   [ anon ]
00007f2d74000000   65476   64172   64172 rw---   [ anon ]
00007f2d78000000   65520   64176   64176 rw---   [ anon ]
00007f2d68000000   65520   64180   64180 rw---   [ anon ]
00007f2d80000000   65520   64184   64184 rw---   [ anon ]
00007f2d58000000   65520   64188   64188 rw---   [ anon ]
00007f2d70000000   65520   64192   64192 rw---   [ anon ]
00000000c0000000 1049088 1049088 1049088 rw---   [ anon ]
total kB         8492740 3511008 3498584
```

通过搜索找到以下资料：Linux glibc >= 2.10 (RHEL 6) malloc may show excessive virtual memory usage。

文章指出造成应用程序大量申请 64M 大内存块的原因是由 Glibc 的一个版本升级引起的，通过 export MALLOC_ARENA_MAX=4 可以解决 VSZ 占用过高的问题。虽然这也是一个问题，但却不是想要的，因为增长的是物理内存而不是虚拟内存，程序在这一方面表现是正常的。

### 5. gdb

非常好奇 64M 或者其他小内存块中是什么内容，接下来可以通过 gdb 工具将其 dump 出来。

读取 /proc 目录下的 maps 文件能精准地知晓目前进程的内存分布。以下脚本通过传入进程 id，能够将所关联的内存全部 dump 到文件中。注意，这个命令会影响服务，要慎用。

```
pid=$1;grep rw-p /proc/$pid/maps | sed -n 's/^\([0-9a-f]*\)-\([0-9a-f]*\) .*$/\1 \2/p' | while read start stop; do gdb --batch --pid $pid -ex "dump memory $1-$start-$stop.dump 0x$start 0x$stop"; done
```

这个命令十分霸道，甚至把加载到内存中的 class 文件、堆文件一块给 dump 下来。这是机器的原始内存，大多数文件打不开。

![](/jvm-course-images/677be3444ad5.png)

更多时候只需要 dump 一部分内存就可以。再次提醒操作会影响服务，注意 dump 的内存块大小，线上一定要慎用。

复制 pmap 的一块 64M 内存，比如 00007f2d70000000，然后去掉前面的 0，使用下面代码得到内存块的开始和结束地址。

```
cat /proc/2154/maps | grep 7f2d70000000
7f2d6fff1000-7f2d70000000 ---p 00000000 00:00 0 7f2d70000000-7f2d73ffc000 rw-p 00000000 00:00 0
```

接下来就 dump 这 64MB 的内存。

```
gdb --batch --pid 2154 -ex "dump memory a.dump 0x7f2d70000000 0x7f2d73ffc000"
```

使用 du 命令查看具体的内存块大小，不多不少正好 64M。

```
## du -h a.dump
64M a.dump
```

是时候查看里面的内容了，使用 strings 命令可以看到内存块里一些可以打印的内容。

```
## strings -10 a.dump

0R4f1Qej1ty5GT8V1R8no6T44564wz499E6Y582q2R9h8CC175GJ3yeJ1Q3P5Vt757Mcf6378kM36hxZ5U8uhg2A26T5l7f68719WQK6vZ2BOdH9lH5C7838qf1
...
```

等等？这些内容不应该在堆里面么？为何还会使用额外的内存进行分配？那么还有什么地方在分配堆外内存呢？

这种情况只可能是 native 程序对堆外内存的操作。

### 6. perf

下面介绍一个神器 perf，除了能够进行一些性能分析，它还能帮助找到相应的 native 调用。这么突出的堆外内存使用问题，肯定能找到相应的调用函数。

使用 perf record -g -p 2154 开启监控栈函数调用，然后访问服务器的 8888 端口，这将会把内存使用的阈值增加到 85%，程序会逐渐把这部分内存占满，可以手工观察这个过程。perf 运行一段时间后 Ctrl+C 结束，会生成一个文件 perf.data。

执行 perf report -i perf.data 查看报告。

![](/jvm-course-images/061aab6df6c9.png)

如图，一般第三方 JNI 程序，或者 JDK 内的模块，都会调用相应的本地函数，在 Linux 上这些函数库的后缀都是 so。

依次浏览用的可疑资源，发现了"libzip.so"，还发现了不少相关的调用。搜索 zip（输入 / 进入搜索模式），结果如下：

![](/jvm-course-images/0c0c6bc4b11d.png)

查看 JDK 代码，发现 bzip 大量使用了 native 方法。也就是说，有大量内存的申请和销毁是在堆外发生的。

![](/jvm-course-images/44745c4bf879.png)

进程调用了 Java_java_util_zip_Inflater_inflatBytes() 申请了内存，却没有调用 Deflater 释放内存。与 pmap 内存地址相比对，确实是 zip 在搞鬼。

### 7. gperftools

google 还有一个类似的、非常好用的工具叫做 gperftools，主要用到它的 Heap Profiler，功能更加强大。

它的启动方式有点特别，安装成功之后只需要输出两个环境变量即可。

```
mkdir -p /opt/test 
export LD_PRELOAD=/usr/lib64/libtcmalloc.so 
export HEAPPROFILE=/opt/test/heap
```

在同一个终端再次启动应用程序，可以看到内存申请动作都被记录到了 opt 目录下的 test 目录。

![](/jvm-course-images/74824d59aef0.png)

接下来就可以使用 pprof 命令分析这些文件。

```
cd /opt/test
pprof -text *heap  | head -n 200
```

使用这个工具能够一眼追踪到申请内存最多的函数。Java_java_util_zip_Inflater_init 这个函数立马就被发现了。

```
Total: 25205.3 MB
 20559.2  81.6%  81.6%  20559.2  81.6% inflateBackEnd
  4487.3  17.8%  99.4%   4487.3  17.8% inflateInit2_
    75.7   0.3%  99.7%     75.7   0.3% os::malloc@8bbaa0
    70.3   0.3%  99.9%   4557.6  18.1% Java_java_util_zip_Inflater_init
     7.1   0.0% 100.0%      7.1   0.0% readCEN
     3.9   0.0% 100.0%      3.9   0.0% init
     1.1   0.0% 100.0%      1.1   0.0% os::malloc@8bb8d0
     0.2   0.0% 100.0%      0.2   0.0% _dl_new_object
     0.1   0.0% 100.0%      0.1   0.0% __GI__dl_allocate_tls
     0.1   0.0% 100.0%      0.1   0.0% _nl_intern_locale_data
     0.0   0.0% 100.0%      0.0   0.0% _dl_check_map_versions
     0.0   0.0% 100.0%      0.0   0.0% __GI___strdup
     0.0   0.0% 100.0%      0.1   0.0% _dl_map_object_deps
     0.0   0.0% 100.0%      0.0   0.0% nss_parse_service_list
     0.0   0.0% 100.0%      0.0   0.0% __new_exitfn
     0.0   0.0% 100.0%      0.0   0.0% getpwuid
     0.0   0.0% 100.0%      0.0   0.0% expand_dynamic_string_token
```

### 8. 解决

这就是模拟内存泄漏的整个过程，到此问题就解决了。

GZIPInputStream 使用 Inflater 申请堆外内存、Deflater 释放内存，调用 close() 方法来主动释放。如果忘记关闭，Inflater 对象的生命会延续到下一次 GC，有一点类似堆内的弱引用。在此过程中堆外内存会一直增长。

把 decompress 函数改成如下代码，重新编译代码后观察，问题解决。

```
public static String decompress(byte[] input) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        GZIPInputStream gzip = new GZIPInputStream(new ByteArrayInputStream(input));
        try {
            copy(gzip, out);
            return new String(out.toByteArray());
        }finally {
            try{ gzip.close(); }catch (Exception ex){}
            try{ out.close(); }catch (Exception ex){}
        }
    }
```

## 版本差异(旧版 → Java 21)

| 特性 | 旧版(Java 8/11) | Java 21 |
|------|----------------|---------|
| 逃逸分析/标量替换 | JDK 8+ 默认开启 | 不变（JEP 前） |
| 字符串去重 | G1 默认 | 不变 |
| 堆转储 | jmap -dump | 不变；`jcmd GC.heap_dump` 更推荐 |
| 元空间 OOM | 默认无上限 | 不变；需显式 MaxMetaspaceSize |
| 虚拟线程内存 | 无 | 虚拟线程栈不受 -Xss 限制，需监控数量 |

> **虚拟线程 OOM 注意点**：每个虚拟线程默认有少量内存开销，若无限创建且不关闭，会导致内存耗尽（类似线程池 OOM）。务必使用 try-with-resources 或限流。
