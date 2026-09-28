---
title: "Set 与 Map 集合详解"
description: "Java Set 与 Map：HashSet/TreeSet/LinkedHashSet 去重原理，HashMap 哈希冲突与树化、扩容机制，LinkedHashMap 访问顺序与 LRU，ConcurrentHashMap 并发安全"
keywords: [Java, Set, Map, HashSet, HashMap, 哈希]
category: "Java"
tags: [Java, 基础, 集合]
---

# Set 和 Map 集合详解

## 学习目标

- 理解 `Set` 去重的底层逻辑（先 `hashCode` 再 `equals`）及自定义对象必须同时重写二者
- 掌握 `HashMap` 的哈希计算、索引定位、冲突链表与红黑树树化（>8）及扩容（负载因子 0.75）
- 区分 `HashMap` / `LinkedHashMap`（插入/访问顺序）/ `TreeMap`（键排序）的适用场景
- 理解 `ConcurrentHashMap`（JDK 8 CAS + synchronized）的并发安全机制
- 识别 `subList` 视图、`Arrays.asList` 固定大小、`==` 比较键等常见陷阱

## 概述

`Set` 和 `Map` 是 Java 集合框架中的两个核心接口，它们分别用于不同的场景：

```mermaid
flowchart LR
    subgraph Set接口
        HS2[HashSet<br/>哈希表 O(1)] --> LHS2[LinkedHashSet<br/>保持插入顺序]
        HS2 --> TS2[TreeSet<br/>红黑树 O(log n)]
    end
    
    subgraph Map接口
        HM2[HashMap<br/>哈希表 O(1)] --> LHM2[LinkedHashMap<br/>保持插入/访问顺序]
        HM2 --> TM2[TreeMap<br/>红黑树 O(log n)]
    end
    
```

- **Set**：存储不重复的元素集合，主要用于去重和成员检查
- **Map**：存储键值对（key-value），主要用于通过键快速查找值

两者都是 Java 集合框架的重要组成部分，在实际开发中应用广泛。理解它们的实现原理和适用场景，是写出高质量 Java 代码的基础。

---

## 第一部分：Set 集合

### 1.1 Set 接口概述

`Set` 是 Java 集合框架中的一个重要接口，它继承自 `Collection` 接口，表示一个不包含重复元素的集合。

#### 核心特点

| 特性 | 说明 |
|------|------|
| **唯一性** | 不允许重复元素，任何重复的元素都会被忽略 |
| **无序性** | 大多数实现不保证元素的存储顺序（`LinkedHashSet`、`TreeSet` 除外） |
| **null 处理** | 大多数实现允许一个 `null` 元素（`TreeSet` 不允许） |
| **高效查找** | 基于哈希表的实现提供 O(1) 的查找效率 |

### 1.2 Set 常用方法

`Set` 接口继承了 `Collection` 接口的所有方法，没有添加新的方法。

#### 基本操作

```java
// 添加元素 - 如果元素已存在则返回 false
boolean add(E e)

// 移除元素 - 如果元素存在则返回 true
boolean remove(Object o)

// 判断是否包含元素
boolean contains(Object o)

// 获取元素数量
int size()

// 判断是否为空
boolean isEmpty()

// 清空集合
void clear()
```

#### 集合运算

```java
// 并集 - 添加指定集合中的所有元素
boolean addAll(Collection<? extends E> c)

// 差集 - 移除包含在指定集合中的元素
boolean removeAll(Collection<?> c)

// 交集 - 仅保留同时存在于两个集合中的元素
boolean retainAll(Collection<?> c)

// 判断是否包含指定集合的所有元素
boolean containsAll(Collection<?> c)
```

#### 遍历方式

```java
// 1. 增强 for 循环
for (String item : set) {
    System.out.println(item);
}

// 2. 迭代器（可在遍历时删除元素）
Iterator<String> iterator = set.iterator();
while (iterator.hasNext()) {
    String item = iterator.next();
    if (item.equals("delete")) {
        iterator.remove(); // 安全删除
    }
}

// 3. forEach 方法（Java 8+）
set.forEach(item -> System.out.println(item));

// 4. Stream API（Java 8+）
set.stream()
   .filter(item -> item.length() > 3)
   .forEach(System.out::println);
```

### 1.3 HashSet 详解

#### 实现原理

`HashSet` 是最常用的 `Set` 实现类，基于哈希表实现。

```
┌─────────────────────────────────────────────────────┐
│                    HashSet 内部结构                  │
├─────────────────────────────────────────────────────┤
│  内部使用 HashMap 存储元素：                         │
│  private transient HashMap<E,Object> map;           │
│                                                     │
│  元素作为 HashMap 的 key，value 固定为 PRESENT      │
│  private static final Object PRESENT = new Object();│
└─────────────────────────────────────────────────────┘
```

**存储流程：**

```
添加元素 "Apple"
    ↓
计算 hashCode: "Apple".hashCode() = 63476538
    ↓
计算数组索引: (n - 1) & hash
    ↓
检查该位置是否已有元素
    ↓
  无元素 → 直接存入
  有元素 → 比较 equals()
           ↓
         相同 → 不添加（去重）
         不同 → 形成链表/红黑树
```

#### 核心特点

```java
// 1. 基于哈希表，底层是 HashMap
// 2. 不保证元素顺序
// 3. 允许一个 null 元素
// 4. 线程不安全
// 5. 增删查时间复杂度：平均 O(1)，最坏 O(n) → O(log n)（Java 8+ 红黑树优化）
```

#### 构造方法

```java
// 默认构造：初始容量 16，加载因子 0.75
Set<String> set1 = new HashSet<>();

// 指定初始容量
Set<String> set2 = new HashSet<>(100);

// 指定初始容量和加载因子
Set<String> set3 = new HashSet<>(100, 0.8f);

// 从其他集合创建
Set<String> set4 = new HashSet<>(Arrays.asList("A", "B", "C"));
```

#### 重要参数

```java
// 初始容量：默认 16
// - 哈希表数组的初始大小
// - 如果预知元素数量，建议设置合适的初始容量避免扩容

// 加载因子：默认 0.75
// - 当元素数量 > 容量 * 加载因子 时，扩容为原来的 2 倍
// - 0.75 是时间和空间的平衡点

// 示例：预知要存 10000 个元素
// 建议容量 = 预期元素数 / 加载因子 + 1
Set<String> set = new HashSet<>((int)(10000 / 0.75) + 1);
```

#### 使用示例

```java
import java.util.*;

public class HashSetDemo {
    public static void main(String[] args) {
        Set<String> set = new HashSet<>();
        
        // 添加元素
        set.add("Apple");
        set.add("Banana");
        set.add("Cherry");
        set.add("Apple"); // 重复，不会添加
        set.add(null);    // 允许一个 null
        
        System.out.println(set); // [null, Apple, Cherry, Banana]（顺序不确定）
        System.out.println("大小: " + set.size()); // 4
        
        // 查找
        System.out.println("包含 Apple? " + set.contains("Apple")); // true
        
        // 删除
        set.remove("Banana");
        System.out.println("删除后: " + set);
        
        // 集合运算
        Set<String> other = new HashSet<>(Arrays.asList("Apple", "Durian"));
        
        // 并集
        Set<String> union = new HashSet<>(set);
        union.addAll(other);
        System.out.println("并集: " + union);
        
        // 交集
        Set<String> intersection = new HashSet<>(set);
        intersection.retainAll(other);
        System.out.println("交集: " + intersection);
        
        // 差集
        Set<String> difference = new HashSet<>(set);
        difference.removeAll(other);
        System.out.println("差集: " + difference);
    }
}
```

### 1.4 LinkedHashSet 详解

#### 实现原理

`LinkedHashSet` 继承自 `HashSet`，在哈希表的基础上维护一个双向链表来记录插入顺序。

```
┌──────────────────────────────────────────────────────┐
│              LinkedHashSet 内部结构                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│   哈希表（快速查找）    +    双向链表（维护顺序）      │
│                                                      │
│   ┌───┐                                               │
│   │ A │←──────────────────────┐                      │
│   └─┬─┘                       │                      │
│     │ head                    │ tail                 │
│   ┌─▼─┐     ┌───┐     ┌───┐  │                      │
│   │ B │ ←── │ C │ ←── │ D │──┘                      │
│   └───┘     └───┘     └───┘                         │
│                                                      │
│   遍历时按链表顺序：A → B → C → D                    │
└──────────────────────────────────────────────────────┘
```

#### 核心特点

```java
// 1. 继承 HashSet，保持哈希表的查询效率
// 2. 维护双向链表，保证迭代顺序 = 插入顺序
// 3. 允许一个 null 元素
// 4. 线程不安全
// 5. 性能略低于 HashSet（需维护链表）
```

#### 使用示例

```java
import java.util.*;

public class LinkedHashSetDemo {
    public static void main(String[] args) {
        // 对比 HashSet 和 LinkedHashSet
        Set<String> hashSet = new HashSet<>();
        Set<String> linkedHashSet = new LinkedHashSet<>();
        
        String[] items = {"Apple", "Cherry", "Banana", "Durian"};
        
        for (String item : items) {
            hashSet.add(item);
            linkedHashSet.add(item);
        }
        
        // HashSet：顺序不确定
        System.out.println("HashSet: " + hashSet);
        // 输出可能是：[Cherry, Apple, Durian, Banana]
        
        // LinkedHashSet：保持插入顺序
        System.out.println("LinkedHashSet: " + linkedHashSet);
        // 输出一定是：[Apple, Cherry, Banana, Durian]
        
        // 再次添加（更新不会改变顺序）
        linkedHashSet.add("Apple");
        System.out.println("重复添加后: " + linkedHashSet);
        // 输出：[Apple, Cherry, Banana, Durian]
    }
}
```

#### 适用场景

```java
// 1. 需要保持插入顺序的去重集合
Set<String> orderedSet = new LinkedHashSet<>();

// 2. 实现 LRU 缓存的候选方案
LinkedHashMap<Integer, String> lruCache = new LinkedHashMap<>(16, 0.75f, true);

// 3. 配置项按添加顺序处理
Set<ConfigItem> configs = new LinkedHashSet<>();
```

### 1.5 TreeSet 详解

#### 实现原理

`TreeSet` 基于红黑树（一种自平衡的二叉搜索树）实现，元素自动排序。

```
┌──────────────────────────────────────────────────────┐
│                TreeSet 内部结构（红黑树）              │
├──────────────────────────────────────────────────────┤
│                                                      │
│                      ┌───┐                           │
│                      │ 4 │（黑）                     │
│                      └─┬─┘                           │
│                  ┌─────┴─────┐                       │
│                ┌─▼─┐       ┌─▼─┐                     │
│                │ 2 │（红） │ 6 │（红）               │
│                └─┬─┘       └─┬─┘                     │
│               ┌─┴─┐       ┌─┴─┐                      │
│              ┌▼┐ ┌▼┐     ┌▼┐ ┌▼┐                     │
│              │1│ │3│     │5│ │7│                     │
│              └─┘ └─┘     └─┘ └─┘                     │
│                                                      │
│   特点：                                              │
│   1. 左子节点 < 父节点 < 右子节点                    │
│   2. 自动平衡，保证 O(log n) 操作                    │
│   3. 根节点到叶子节点的最长路径 ≤ 最短路径的 2 倍    │
└──────────────────────────────────────────────────────┘
```

#### 核心特点

```java
// 1. 基于红黑树实现
// 2. 元素自动排序（自然顺序或自定义比较器）
// 3. 不允许 null 元素
// 4. 线程不安全
// 5. 增删查时间复杂度：O(log n)
```

#### 排序方式

```java
import java.util.*;

public class TreeSetDemo {
    public static void main(String[] args) {
        // 方式一：自然排序（元素实现 Comparable 接口）
        TreeSet<String> set1 = new TreeSet<>();
        set1.add("Banana");
        set1.add("Apple");
        set1.add("Cherry");
        System.out.println("自然排序: " + set1); // [Apple, Banana, Cherry]
        
        // 方式二：自定义比较器
        TreeSet<String> set2 = new TreeSet<>(Comparator.reverseOrder());
        set2.add("Banana");
        set2.add("Apple");
        set2.add("Cherry");
        System.out.println("降序: " + set2); // [Cherry, Banana, Apple]
        
        // 方式三：按字符串长度排序
        TreeSet<String> set3 = new TreeSet<>(Comparator.comparingInt(String::length));
        set3.add("Apple");
        set3.add("Banana");
        set3.add("Hi");
        set3.add("Cherry");
        System.out.println("按长度: " + set3); // [Hi, Apple, Banana]
        // 注意：Banana 与 Cherry 长度相同,比较器视为"重复",Cherry 不会加入
    }
}
```

#### TreeSet 特有方法

```java
import java.util.*;

public class TreeSetSpecialMethods {
    public static void main(String[] args) {
        TreeSet<Integer> set = new TreeSet<>();
        set.addAll(Arrays.asList(1, 3, 5, 7, 9, 11, 13));
        
        // 首尾元素
        System.out.println("第一个: " + set.first());  // 1
        System.out.println("最后一个: " + set.last());  // 13
        
        // 范围视图（headSet/subSet 不含上边界,tailSet 含边界）
        System.out.println("小于 7: " + set.headSet(7));   // [1, 3, 5]
        System.out.println("大于等于 7: " + set.tailSet(7)); // [7, 9, 11, 13]
        System.out.println("3 到 11: " + set.subSet(3, 11)); // [3, 5, 7, 9]
        
        // 查找最近的元素
        System.out.println("小于等于 6 的最大值: " + set.floor(6));   // 5
        System.out.println("大于等于 6 的最小值: " + set.ceiling(6));  // 7
        System.out.println("小于 6 的最大值: " + set.lower(6));       // 5
        System.out.println("大于 6 的最小值: " + set.higher(6));      // 7
        
        // 获取并移除首尾
        System.out.println("移除并返回第一个: " + set.pollFirst()); // 1
        System.out.println("移除并返回最后一个: " + set.pollLast()); // 13
        System.out.println("移除后: " + set);
        
        // 降序集合
        System.out.println("降序视图: " + set.descendingSet());
    }
}
```

#### 自定义对象排序

```java
import java.util.*;

// 方式一：实现 Comparable 接口
class Student implements Comparable<Student> {
    private int id;
    private String name;
    
    public Student(int id, String name) {
        this.id = id;
        this.name = name;
    }
    
    @Override
    public int compareTo(Student other) {
        return Integer.compare(this.id, other.id);
    }
    
    @Override
    public String toString() {
        return "Student{id=" + id + ", name='" + name + "'}";
    }
    
    // 必须重写 equals 和 hashCode，保持一致性
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Student student = (Student) o;
        return id == student.id;
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}

public class CustomSortDemo {
    public static void main(String[] args) {
        // 使用 Comparable 自然排序
        TreeSet<Student> set1 = new TreeSet<>();
        set1.add(new Student(3, "张三"));
        set1.add(new Student(1, "李四"));
        set1.add(new Student(2, "王五"));
        System.out.println("按 ID 排序: " + set1);
        
        // 使用 Comparator 自定义排序
        TreeSet<Student> set2 = new TreeSet<>(
            Comparator.comparing(Student::getName)
        );
        set2.add(new Student(3, "张三"));
        set2.add(new Student(1, "李四"));
        set2.add(new Student(2, "王五"));
        System.out.println("按姓名排序: " + set2);
    }
}
```

### 1.6 Set 实现类对比

| 特性 | HashSet | LinkedHashSet | TreeSet |
|------|---------|---------------|---------|
| **底层数据结构** | 哈希表 | 哈希表 + 双向链表 | 红黑树 |
| **元素顺序** | 无序 | 插入顺序 | 排序顺序 |
| **允许 null** | 是（1个） | 是（1个） | 否 |
| **线程安全** | 否 | 否 | 否 |
| **查找时间复杂度** | O(1) | O(1) | O(log n) |
| **插入时间复杂度** | O(1) | O(1) | O(log n) |
| **删除时间复杂度** | O(1) | O(1) | O(log n) |
| **内存占用** | 低 | 中 | 高 |
| **适用场景** | 一般去重 | 需保持顺序 | 需要排序/范围查询 |

### 1.7 Set 选择指南

```java
// 决策流程：

// 1. 是否需要排序？
//    是 → TreeSet
//    否 → 继续判断

// 2. 是否需要保持插入顺序？
//    是 → LinkedHashSet
//    否 → HashSet（性能最优）

// 具体场景：

// 场景1：简单去重，不关心顺序
Set<String> tags = new HashSet<>();

// 场景2：需要按添加顺序遍历
Set<String> orderedTags = new LinkedHashSet<>();

// 场景3：需要排序或范围查询
TreeSet<Integer> scores = new TreeSet<>();
scores.ceiling(60); // 查找及格线以上的最低分

// 场景4：多线程环境
Set<String> threadSafeSet = ConcurrentHashMap.newKeySet();
// 或者
Set<String> synchronizedSet = Collections.synchronizedSet(new HashSet<>());
```

---

## 第二部分：Map 集合

### 2.1 Map 接口概述

`Map` 是 Java 集合框架中的一个核心接口，用于存储键值对（key-value pairs）。与 `Collection` 接口不同，`Map` 不继承自 `Collection`，而是独立存在。

#### 核心特点

| 特性 | 说明 |
|------|------|
| **键值对存储** | 每个键映射到一个值 |
| **键的唯一性** | 键唯一，重复键会覆盖旧值 |
| **值可重复** | 多个键可以映射到同一个值 |
| **高效查找** | 基于哈希表的实现提供 O(1) 的查找效率 |

### 2.2 Map 常用方法

#### 基本操作

```java
// 添加/更新键值对
V put(K key, V value)

// 批量添加
void putAll(Map<? extends K, ? extends V> m)

// 获取值
V get(Object key)

// 获取值（带默认值）
V getOrDefault(Object key, V defaultValue)

// 删除键值对
V remove(Object key)

// 判断是否包含键
boolean containsKey(Object key)

// 判断是否包含值
boolean containsValue(Object value)

// 获取大小
int size()

// 判断是否为空
boolean isEmpty()

// 清空
void clear()
```

#### Java 8+ 新方法

```java
// 如果键不存在才添加
V putIfAbsent(K key, V value)

// 条件替换
boolean replace(K key, V oldValue, V newValue)

// 无条件替换
V replace(K key, V value)

// 如果键不存在，计算并添加
V computeIfAbsent(K key, Function<? super K, ? extends V> mappingFunction)

// 如果键存在，计算新值
V computeIfPresent(K key, BiFunction<? super K, ? super V, ? extends V> remappingFunction)

// 计算新值
V compute(K key, BiFunction<? super K, ? super V, ? extends V> remappingFunction)

// 合并值
V merge(K key, V value, BiFunction<? super V, ? super V, ? extends V> remappingFunction)

// 遍历
void forEach(BiConsumer<? super K, ? super V> action)
```

#### 视图操作

```java
// 获取所有键
Set<K> keySet()

// 获取所有值
Collection<V> values()

// 获取所有键值对
Set<Map.Entry<K, V>> entrySet()
```

### 2.3 HashMap 详解

#### 实现原理（重点）

**HashMap 是面试的重点，必须掌握其底层原理！**

##### JDK 1.8 之前：数组 + 链表

```
┌────────────────────────────────────────────────────────┐
│           JDK 1.7 HashMap 结构                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  数组（Entry[] table）                                 │
│  ┌────┬────┬────┬────┬────┬────┬────┬────┐            │
│  │ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │            │
│  └─┬──┴────┴─┬──┴────┴────┴─┬──┴────┴────┘            │
│    │        │              │                          │
│    ▼        ▼              ▼                          │
│  Entry     Entry          Entry                       │
│  ┌───┐     ┌───┐          ┌───┐                       │
│  │K,V│     │K,V│          │K,V│                       │
│  └─┬─┘     └─┬─┘          └─┬─┘                       │
│    │         │              │                         │
│    ▼         ▼              ▼                         │
│  Entry     Entry          Entry                       │
│  ┌───┐     ┌───┐          ┌───┐                       │
│  │K,V│     │K,V│          │K,V│                       │
│  └───┘     └───┘          └───┘                       │
│                                                        │
│  链表法解决哈希冲突，新元素插到头部（头插法）          │
└────────────────────────────────────────────────────────┘
```

##### JDK 1.8 之后：数组 + 链表 + 红黑树

```
┌────────────────────────────────────────────────────────┐
│           JDK 1.8 HashMap 结构                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  数组（Node<K,V>[] table）                             │
│  ┌────┬────┬────┬────┬────┬────┬────┬────┐            │
│  │ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │            │
│  └─┬──┴────┴─┬──┴────┴────┴─┬──┴────┴────┘            │
│    │        │              │                          │
│    ▼        ▼              ▼                          │
│   Node     Node      ┌───────────┐                    │
│  ┌───┐    ┌───┐      │ 红黑树    │                    │
│  │K,V│    │K,V│      │  ┌───┐   │                    │
│  └─┬─┘    └─┬─┘      │  │ K │   │                    │
│    │        │        │  └─┬─┘   │                    │
│    ▼        ▼        │  ┌─┴─┐   │                    │
│   Node     Node      │  │   │   │                    │
│  ┌───┐    ┌───┐      │  └───┘   │                    │
│  │K,V│    │K,V│      └───────────┘                    │
│  └───┘    └───┘                                       │
│                                                        │
│  优化：链表长度 ≥ 8 且数组长度 ≥ 64 时，转为红黑树     │
│        红黑树节点 ≤ 6 时，退化回链表                   │
│        新元素插到尾部（尾插法，避免死循环）            │
└────────────────────────────────────────────────────────┘
```

##### 关键参数

```java
// 默认初始容量：16
static final int DEFAULT_INITIAL_CAPACITY = 1 << 4; // 16

// 最大容量：2^30
static final int MAXIMUM_CAPACITY = 1 << 30;

// 默认加载因子：0.75
static final float DEFAULT_LOAD_FACTOR = 0.75f;

// 链表转红黑树阈值
static final int TREEIFY_THRESHOLD = 8;

// 红黑树转链表阈值
static final int UNTREEIFY_THRESHOLD = 6;

// 链表转红黑树时，数组的最小长度
static final int MIN_TREEIFY_CAPACITY = 64;
```

**为什么加载因子是 0.75？**

```
加载因子 = 填入表中的元素个数 / 表的长度

- 加载因子越小：空间浪费多，冲突少，查找快
- 加载因子越大：空间利用率高，冲突多，查找慢

0.75 是时间和空间的平衡点：
- 泊松分布：在理想哈希函数下，长度为 8 的链表出现概率 < 0.00000001
- 满足数学证明：0.693 ~ 1.0 之间的最佳值
```

**为什么链表转红黑树阈值是 8？**

```
根据泊松分布，在负载因子 0.75 的情况下，链表长度的概率：

长度 0: 0.60653066
长度 1: 0.30326533
长度 2: 0.07581633
长度 3: 0.01263606
长度 4: 0.00157952
长度 5: 0.00015795
长度 6: 0.00001316
长度 7: 0.00000094
长度 8: 0.00000006  ← 概率极低

当链表长度达到 8，说明哈希函数设计有问题或恶意攻击，
此时转红黑树保证 O(log n) 的性能。
```

##### put 操作流程

```java
/**
 * JDK 1.8 HashMap put 操作流程
 */
public V put(K key, V value) {
    /*
     * 1. 计算 key 的 hash 值
     *    h = key.hashCode()
     *    hash = (h ^ (h >>> 16))
     *    高 16 位参与运算，减少冲突
     */
    return putVal(hash(key), key, value, false, true);
}

final V putVal(int hash, K key, V value, boolean onlyIfAbsent, boolean evict) {
    Node<K,V>[] tab; Node<K,V> p; int n, i;
    
    /*
     * 2. 如果数组为空，初始化（延迟初始化）
     */
    if ((tab = table) == null || (n = tab.length) == 0)
        n = (tab = resize()).length;
    
    /*
     * 3. 计算索引：(n - 1) & hash
     *    等价于 hash % n（位运算更快）
     *    如果该位置为空，直接插入
     */
    if ((p = tab[i = (n - 1) & hash]) == null)
        tab[i] = newNode(hash, key, value, null);
    else {
        Node<K,V> e; K k;
        
        /*
         * 4. 如果该位置第一个节点的 key 相同，直接覆盖
         *    比较：hash 相同 && (引用相同 || equals 相同)
         */
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            e = p;
        
        /*
         * 5. 如果是红黑树节点，走红黑树插入
         */
        else if (p instanceof TreeNode)
            e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);
        
        /*
         * 6. 否则遍历链表
         */
        else {
            for (int binCount = 0; ; ++binCount) {
                if ((e = p.next) == null) {
                    // 尾插法添加新节点
                    p.next = newNode(hash, key, value, null);
                    // 链表长度达到 8，转红黑树
                    if (binCount >= TREEIFY_THRESHOLD - 1)
                        treeifyBin(tab, hash);
                    break;
                }
                // 找到相同的 key，跳出循环
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    break;
                p = e;
            }
        }
        
        /*
         * 7. 找到已存在的 key，更新 value
         */
        if (e != null) {
            V oldValue = e.value;
            if (!onlyIfAbsent || oldValue == null)
                e.value = value;
            return oldValue; // 返回旧值
        }
    }
    
    /*
     * 8. 更新计数，检查是否需要扩容
     */
    ++modCount;
    if (++size > threshold)
        resize();
    return null;
}
```

流程图：

```
put(key, value)
    │
    ├─→ 计算 hash：hash(key)
    │       │
    │       └─→ (h = key.hashCode()) ^ (h >>> 16)
    │
    ├─→ 计算索引：(n - 1) & hash
    │
    ├─→ 检查该位置
    │       │
    │       ├─→ 为空 → 直接插入
    │       │
    │       └─→ 不为空
    │               │
    │               ├─→ key 相同 → 覆盖 value
    │               │
    │               ├─→ 红黑树 → 红黑树插入
    │               │
    │               └─→ 链表
    │                       │
    │                       ├─→ 找到相同 key → 覆盖 value
    │                       │
    │                       └─→ 未找到
    │                               │
    │                               ├─→ 尾插法添加
    │                               │
    │                               └─→ 链表长度 ≥ 8 → 转红黑树
    │
    └─→ size++，检查扩容
```

##### 扩容机制

```java
/**
 * 扩容：容量翻倍，重新分配元素
 */
final Node<K,V>[] resize() {
    // 1. 新容量 = 旧容量 * 2
    // 2. 新阈值 = 新容量 * 加载因子
    // 3. 创建新数组
    // 4. 重新分配元素：
    //    - 原索引 或 原索引 + 原容量
    //    - 根据 hash & 原容量 判断
}
```

扩容时元素重新分配：

```
扩容前（容量 16）：
索引 = hash & 15

扩容后（容量 32）：
索引 = hash & 31

判断元素新位置：
如果 (hash & 16) == 0：位置不变
如果 (hash & 16) != 0：新位置 = 原位置 + 16

示例：
元素 A：hash = 0b...0xxxx（第 5 位为 0）→ 位置不变
元素 B：hash = 0b...1xxxx（第 5 位为 1）→ 位置 + 16
```

##### get 操作流程

```java
public V get(Object key) {
    Node<K,V> e;
    return (e = getNode(hash(key), key)) == null ? null : e.value;
}

final Node<K,V> getNode(int hash, Object key) {
    Node<K,V>[] tab; Node<K,V> first, e; int n; K k;
    
    // 1. 计算索引，获取第一个节点
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (first = tab[(n - 1) & hash]) != null) {
        
        // 2. 检查第一个节点
        if (first.hash == hash &&
            ((k = first.key) == key || (key != null && key.equals(k))))
            return first;
        
        // 3. 遍历链表或红黑树
        if ((e = first.next) != null) {
            if (first instanceof TreeNode)
                return ((TreeNode<K,V>)first).getTreeNode(hash, key);
            do {
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    return e;
            } while ((e = e.next) != null);
        }
    }
    return null;
}
```

#### 核心特点

```java
// 1. 基于哈希表，JDK 1.8 后是数组 + 链表 + 红黑树
// 2. 键和值都允许 null
// 3. 线程不安全
// 4. 增删查时间复杂度：平均 O(1)
// 5. 不保证顺序
```

#### 使用示例

```java
import java.util.*;

public class HashMapDemo {
    public static void main(String[] args) {
        Map<String, Integer> map = new HashMap<>();
        
        // 基本操作
        map.put("Apple", 10);
        map.put("Banana", 20);
        map.put("Cherry", 30);
        map.put("Apple", 15); // 覆盖旧值，返回 10
        
        System.out.println(map); // {Apple=15, Cherry=30, Banana=20}
        System.out.println(map.get("Banana")); // 20
        System.out.println(map.get("Durian")); // null
        System.out.println(map.getOrDefault("Durian", 0)); // 0
        
        // Java 8+ 新特性
        // putIfAbsent：不存在才添加
        map.putIfAbsent("Apple", 100); // 不会覆盖
        map.putIfAbsent("Durian", 40); // 添加成功
        
        // computeIfAbsent：不存在则计算并添加
        map.computeIfAbsent("Elderberry", k -> k.length() * 10);
        // Elderberry 不存在，计算 "Elderberry".length() * 10 = 100
        
        // computeIfPresent：存在则计算新值
        map.computeIfPresent("Apple", (k, v) -> v + 5);
        // Apple 存在，新值 = 15 + 5 = 20
        
        // merge：合并值
        map.merge("Apple", 100, (oldVal, newVal) -> oldVal + newVal);
        // Apple 存在，新值 = 20 + 100 = 120
        map.merge("Fig", 50, (oldVal, newVal) -> oldVal + newVal);
        // Fig 不存在，直接添加 50
        
        System.out.println(map);
    }
}
```

### 2.4 hashCode 和 equals 详解（重点）

**这是 HashMap/Set 正确工作的核心，也是面试高频考点！**

#### 为什么要重写 hashCode 和 equals？

```java
import java.util.*;

// 错误示例：不重写 equals 和 hashCode
class Person1 {
    private String name;
    private int age;
    
    public Person1(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    // 没有重写 equals 和 hashCode
}

public class HashMapProblem {
    public static void main(String[] args) {
        Map<Person1, String> map = new HashMap<>();
        
        Person1 p1 = new Person1("张三", 20);
        Person1 p2 = new Person1("张三", 20);
        
        map.put(p1, "员工A");
        map.put(p2, "员工B"); // 本应覆盖，但实际没有
        
        System.out.println(map.size()); // 2（期望是 1）
        System.out.println(map.get(p1)); // 员工A
        System.out.println(map.get(p2)); // 员工B
        // 两个相同的对象被当作不同的 key！
    }
}
```

#### hashCode 和 equals 的契约

```
┌────────────────────────────────────────────────────────┐
│              hashCode 和 equals 契约                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  1. 一致性：                                           │
│     如果 equals(Object) 返回 true，                    │
│     那么 hashCode() 必须返回相同的值                   │
│                                                        │
│  2. 不要求反向成立：                                   │
│     hashCode() 返回相同值，                            │
│     equals(Object) 不一定返回 true                     │
│     （这是哈希冲突的本质）                             │
│                                                        │
│  3. equals 一致性：                                    │
│     多次调用 equals() 应该返回相同结果                 │
│     （除非对象被修改）                                 │
│                                                        │
│  4. 对称性：                                           │
│     a.equals(b) ⟺ b.equals(a)                         │
│                                                        │
│  5. 传递性：                                           │
│     a.equals(b) && b.equals(c) → a.equals(c)          │
│                                                        │
│  6. 自反性：                                           │
│     a.equals(a) 为 true                                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### HashMap 查找流程

```
查找 get(key)
    │
    ├─→ 1. 计算 hash = key.hashCode()
    │
    ├─→ 2. 计算索引 index = (n - 1) & hash
    │
    └─→ 3. 在该位置的链表/红黑树中查找
            │
            └─→ 比较：hash 相同 && equals 返回 true
                │
                ├─→ 找到：返回 value
                │
                └─→ 未找到：返回 null

关键：
- hashCode 决定对象存储位置（哪个桶）
- equals 决定对象是否相等（是不是同一个）
```

#### 正确的实现方式

```java
import java.util.*;

class Person {
    private String name;
    private int age;
    
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    // 重写 equals
    @Override
    public boolean equals(Object o) {
        // 1. 引用相同
        if (this == o) return true;
        
        // 2. null 或类型不同
        if (o == null || getClass() != o.getClass()) return false;
        
        // 3. 类型转换并比较字段
        Person person = (Person) o;
        return age == person.age && Objects.equals(name, person.name);
    }
    
    // 重写 hashCode
    @Override
    public int hashCode() {
        // 使用 Objects 工具类
        return Objects.hash(name, age);
    }
    
    @Override
    public String toString() {
        return "Person{name='" + name + "', age=" + age + "}";
    }
}

public class CorrectImplementation {
    public static void main(String[] args) {
        Map<Person, String> map = new HashMap<>();
        
        Person p1 = new Person("张三", 20);
        Person p2 = new Person("张三", 20);
        
        System.out.println("p1.equals(p2): " + p1.equals(p2)); // true
        System.out.println("p1.hashCode: " + p1.hashCode());
        System.out.println("p2.hashCode: " + p2.hashCode());
        System.out.println("hashCode 相同: " + (p1.hashCode() == p2.hashCode())); // true
        
        map.put(p1, "员工A");
        map.put(p2, "员工B"); // 正确覆盖
        
        System.out.println("size: " + map.size()); // 1
        System.out.println(map.get(p1)); // 员工B
        System.out.println(map.get(p2)); // 员工B
    }
}
```

#### IDE 自动生成 vs 手动实现

```java
// IDE 自动生成（推荐）
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;
    Person person = (Person) o;
    return age == person.age && Objects.equals(name, person.name);
}

@Override
public int hashCode() {
    return Objects.hash(name, age);
}

// 手动实现（理解原理）
@Override
public int hashCode() {
    int result = 17; // 任意非零奇数
    result = 31 * result + (name == null ? 0 : name.hashCode());
    result = 31 * result + age;
    return result;
}

// 为什么用 31？
// 1. 31 是质数，减少冲突
// 2. 31 * i == (i << 5) - i，位运算优化
// 3. 历史原因，广泛使用
```

#### Lombok 注解方式

```java
import lombok.*;

@Getter
@Setter
@EqualsAndHashCode  // 自动生成 equals 和 hashCode
@ToString
public class Person {
    private String name;
    private int age;
}

// 或者使用 @Data（包含 @EqualsAndHashCode）
@Data
public class Person {
    private String name;
    private int age;
}
```

#### 常见陷阱

```java
// 陷阱 1：只重写 equals，不重写 hashCode
class BadPerson1 {
    private String name;
    
    @Override
    public boolean equals(Object o) {
        // ...
        return true;
    }
    // 没有 hashCode
}
// 结果：equals 返回 true，但 hashCode 不同，HashMap 出错

// 陷阱 2：使用可变字段计算 hashCode
class BadPerson2 {
    private String name; // 可变
    
    @Override
    public int hashCode() {
        return name.hashCode();
    }
}
// 结果：name 改变后，hashCode 变化，对象"丢失"

// 陷阱 3：equals 不一致
class BadPerson3 {
    private String name;
    
    @Override
    public boolean equals(Object o) {
        return name.equals(((BadPerson3) o).name);
        // 没有检查 null 和类型
    }
}
// 结果：可能抛出 NullPointerException 或 ClassCastException
```

### 2.5 LinkedHashMap 详解

#### 实现原理

`LinkedHashMap` 继承自 `HashMap`，通过维护一个双向链表来记录插入顺序或访问顺序。

```
┌────────────────────────────────────────────────────────┐
│              LinkedHashMap 内部结构                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│   继承 HashMap：                                       │
│   - 拥有 HashMap 的所有特性                            │
│   - Node 节点增加了 before 和 after 指针              │
│                                                        │
│   双向链表维护顺序：                                   │
│                                                        │
│   head ─→ ┌───┐ ←──→ ┌───┐ ←──→ ┌───┐ ←── tail        │
│           │ A │      │ B │      │ C │                 │
│           └───┘      └───┘      └───┘                 │
│                                                        │
│   两种顺序模式：                                       │
│   1. 插入顺序（默认）：按 put 的顺序                   │
│   2. 访问顺序：按 get/put 的访问顺序（LRU 缓存）       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### 核心特点

```java
// 1. 继承 HashMap，性能略低于 HashMap
// 2. 维护双向链表，保证迭代顺序
// 3. 两种顺序模式：插入顺序、访问顺序
// 4. 键和值都允许 null
// 5. 线程不安全
```

#### 使用示例

```java
import java.util.*;

public class LinkedHashMapDemo {
    public static void main(String[] args) {
        // 1. 默认：插入顺序
        Map<String, Integer> insertOrder = new LinkedHashMap<>();
        insertOrder.put("Apple", 1);
        insertOrder.put("Banana", 2);
        insertOrder.put("Cherry", 3);
        insertOrder.get("Apple"); // 访问不影响顺序
        
        System.out.println("插入顺序: " + insertOrder);
        // {Apple=1, Banana=2, Cherry=3}
        
        // 2. 访问顺序（LRU 模式）
        // accessOrder = true
        Map<String, Integer> accessOrder = new LinkedHashMap<>(16, 0.75f, true);
        accessOrder.put("Apple", 1);
        accessOrder.put("Banana", 2);
        accessOrder.put("Cherry", 3);
        
        System.out.println("访问前: " + accessOrder);
        // {Apple=1, Banana=2, Cherry=3}
        
        accessOrder.get("Apple"); // Apple 移到末尾
        accessOrder.put("Banana", 20); // Banana 移到末尾
        
        System.out.println("访问后: " + accessOrder);
        // {Cherry=3, Apple=1, Banana=20}
    }
}
```

#### 实现 LRU 缓存

```java
import java.util.*;

/**
 * 使用 LinkedHashMap 实现 LRU 缓存
 */
class LRUCache<K, V> extends LinkedHashMap<K, V> {
    private final int maxCapacity;
    
    public LRUCache(int maxCapacity) {
        // accessOrder = true 表示按访问顺序排序
        super(maxCapacity, 0.75f, true);
        this.maxCapacity = maxCapacity;
    }
    
    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        // 当元素数量超过最大容量时，删除最久未使用的元素
        return size() > maxCapacity;
    }
}

public class LRUCacheDemo {
    public static void main(String[] args) {
        LRUCache<String, String> cache = new LRUCache<>(3);
        
        cache.put("A", "数据A");
        cache.put("B", "数据B");
        cache.put("C", "数据C");
        System.out.println("初始: " + cache); // {A=数据A, B=数据B, C=数据C}
        
        cache.get("A"); // 访问 A，A 移到末尾
        System.out.println("访问A后: " + cache); // {B=数据B, C=数据C, A=数据A}
        
        cache.put("D", "数据D"); // 超过容量，删除最久未使用的 B
        System.out.println("添加D后: " + cache); // {C=数据C, A=数据A, D=数据D}
    }
}
```

### 2.6 TreeMap 详解

#### 实现原理

`TreeMap` 基于红黑树实现，按键的自然顺序或自定义比较器排序。

```
┌────────────────────────────────────────────────────────┐
│                TreeMap 内部结构（红黑树）               │
├────────────────────────────────────────────────────────┤
│                                                        │
│                      ┌─────┐                           │
│                      │  4  │（黑）                     │
│                      └──┬──┘                           │
│                  ┌──────┴──────┐                       │
│               ┌──▼──┐       ┌──▼──┐                    │
│               │  2  │（红） │  6  │（红）              │
│               └──┬──┘       └──┬──┘                    │
│            ┌─────┴─────┐  ┌────┴────┐                  │
│         ┌──▼──┐     ┌──▼──┐ ┌──▼──┐ ┌──▼──┐           │
│         │  1  │     │  3  │ │  5  │ │  7  │           │
│         └─────┘     └─────┘ └─────┘ └─────┘           │
│                                                        │
│   特点：                                               │
│   - 键有序（按键排序）                                 │
│   - O(log n) 增删查                                   │
│   - 不允许 null 键                                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### 核心特点

```java
// 1. 基于红黑树
// 2. 键有序（自然顺序或自定义比较器）
// 3. 不允许 null 键（允许 null 值）
// 4. 线程不安全
// 5. 增删查时间复杂度：O(log n)
```

#### TreeMap 特有方法

```java
import java.util.*;

public class TreeMapDemo {
    public static void main(String[] args) {
        TreeMap<String, Integer> map = new TreeMap<>();
        map.put("Banana", 2);
        map.put("Apple", 1);
        map.put("Cherry", 3);
        map.put("Durian", 4);
        map.put("Elderberry", 5);
        
        System.out.println("全部: " + map);
        // {Apple=1, Banana=2, Cherry=3, Durian=4, Elderberry=5}
        
        // 首尾
        System.out.println("第一个: " + map.firstKey() + " = " + map.firstEntry());
        System.out.println("最后一个: " + map.lastKey() + " = " + map.lastEntry());
        
        // 范围视图
        System.out.println("小于 Cherry: " + map.headMap("Cherry"));
        // {Apple=1, Banana=2}
        
        System.out.println("大于等于 Cherry: " + map.tailMap("Cherry"));
        // {Cherry=3, Durian=4, Elderberry=5}
        
        System.out.println("Banana 到 Durian: " + map.subMap("Banana", "Durian"));
        // {Banana=2, Cherry=3}
        
        // 导航方法
        System.out.println("小于 Cherry 的最大键: " + map.lowerKey("Cherry")); // Banana
        System.out.println("大于 Cherry 的最小键: " + map.higherKey("Cherry")); // Durian
        System.out.println("小于等于 Cherry 的最大键: " + map.floorKey("Cherry")); // Cherry
        System.out.println("大于等于 Cherry 的最小键: " + map.ceilingKey("Cherry")); // Cherry
        
        // 降序
        System.out.println("降序: " + map.descendingMap());
        // {Elderberry=5, Durian=4, Cherry=3, Banana=2, Apple=1}
    }
}
```

### 2.7 Hashtable 详解

#### 实现原理

`Hashtable` 是 Java 最早的 Map 实现，所有方法都使用 `synchronized` 同步，线程安全但性能较差。

```java
// Hashtable 源码
public synchronized V put(K key, V value) {
    // 所有方法都加 synchronized
}

public synchronized V get(Object key) {
    // 所有方法都加 synchronized
}
```

#### 核心特点

```java
// 1. 线程安全（全表锁，性能差）
// 2. 不允许 null 键和 null 值
// 3. 继承 Dictionary（已过时）
// 4. 不推荐使用，推荐 ConcurrentHashMap
```

#### HashMap vs Hashtable

| 特性 | HashMap | Hashtable |
|------|---------|-----------|
| 线程安全 | 否 | 是（synchronized） |
| 允许 null 键 | 是 | 否 |
| 允许 null 值 | 是 | 否 |
| 继承 | AbstractMap | Dictionary（已过时） |
| 默认容量 | 16 | 11 |
| 扩容方式 | 2 倍 | 2n + 1 |
| 性能 | 高 | 低 |
| 推荐 | √ | ×（使用 ConcurrentHashMap） |

```java
import java.util.*;

public class HashtableDemo {
    public static void main(String[] args) {
        // 不推荐使用 Hashtable
        Hashtable<String, Integer> table = new Hashtable<>();
        
        table.put("Apple", 1);
        table.put("Banana", 2);
        // table.put(null, 3);     // NullPointerException
        // table.put("Cherry", null); // NullPointerException
        
        System.out.println(table);
        
        // 推荐替代方案：ConcurrentHashMap
        Map<String, Integer> better = new ConcurrentHashMap<>();
        better.put("Apple", 1);
        // better.put(null, 3);  // 也不允许 null，但性能更好
    }
}
```

### 2.8 ConcurrentHashMap 详解（重点）

#### 实现原理

`ConcurrentHashMap` 是线程安全的 `Map` 实现，性能远优于 `Hashtable`。

##### JDK 1.7：分段锁

```
┌────────────────────────────────────────────────────────┐
│         JDK 1.7 ConcurrentHashMap（分段锁）             │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Segment[] segments = new Segment[16];               │
│                                                        │
│   ┌─────────┬─────────┬─────────┬─────────┐           │
│   │Segment 0│Segment 1│Segment 2│  ...    │           │
│   └────┬────┴────┬────┴────┬────┴─────────┘           │
│        │         │         │                          │
│        ▼         ▼         ▼                          │
│   ┌────────┐ ┌────────┐ ┌────────┐                    │
│   │HashEntry│ │HashEntry│ │HashEntry│                  │
│   │  数组   │ │  数组   │ │  数组   │                   │
│   └────────┘ └────────┘ └────────┘                    │
│                                                        │
│   特点：                                               │
│   - 每个 Segment 继承 ReentrantLock                   │
│   - 锁粒度：一个 Segment（包含多个桶）                 │
│   - 并发度 = Segment 数量（默认 16）                   │
│   - 只锁住操作的 Segment，其他 Segment 可并发访问      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

##### JDK 1.8：CAS + synchronized

```
┌────────────────────────────────────────────────────────┐
│         JDK 1.8 ConcurrentHashMap（CAS + synchronized）│
├────────────────────────────────────────────────────────┤
│                                                        │
│   Node<K,V>[] table                                   │
│   ┌────┬────┬────┬────┬────┬────┬────┬────┐           │
│   │ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │           │
│   └─┬──┴────┴─┬──┴────┴────┴─┬──┴────┴────┘           │
│     │        │              │                         │
│     ▼        ▼              ▼                         │
│    Node     Node      ┌───────────┐                   │
│   ┌───┐    ┌───┐      │ 红黑树    │                   │
│   │K,V│    │K,V│      │  ┌───┐   │                   │
│   └───┘    └───┘      │  │ K │   │                   │
│                        └───────────┘                   │
│                                                        │
│   特点：                                               │
│   - 锁粒度：单个桶（链表头节点或红黑树根节点）         │
│   - 使用 CAS + synchronized                           │
│   - 读操作无锁（volatile 变量）                        │
│   - 写操作：CAS 尝试，失败则 synchronized             │
│   - 并发度理论上是数组长度                             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### 核心特点

```java
// 1. 线程安全，性能优于 Hashtable
// 2. 不允许 null 键和 null 值
// 3. 读操作无锁，写操作 CAS + synchronized
// 4. 迭代器弱一致性（不会抛出 ConcurrentModificationException）
// 5. 适用于高并发场景
```

#### 关键源码分析

```java
/**
 * JDK 1.8 ConcurrentHashMap put 操作
 */
final V putVal(K key, V value, boolean onlyIfAbsent) {
    // 1. 不允许 null
    if (key == null || value == null) throw new NullPointerException();
    
    // 2. 计算 hash
    int hash = spread(key.hashCode());
    
    for (Node<K,V>[] tab = table;;) {
        Node<K,V> f; int n, i, fh;
        
        // 3. 如果数组为空，初始化
        if (tab == null || (n = tab.length) == 0)
            tab = initTable();
        
        // 4. 如果目标桶为空，CAS 插入
        else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {
            if (casTabAt(tab, i, null,
                         new Node<K,V>(hash, key, value, null)))
                break;
        }
        
        // 5. 如果正在扩容，帮助迁移
        else if ((fh = f.hash) == MOVED)
            tab = helpTransfer(tab, f);
        
        // 6. 否则加锁插入
        else {
            V oldVal = null;
            synchronized (f) { // 锁住链表头节点
                if (tabAt(tab, i) == f) {
                    if (fh >= 0) {
                        // 链表操作
                    }
                    else if (f instanceof TreeBin) {
                        // 红黑树操作
                    }
                }
            }
            // ...
        }
    }
    // 7. 检查是否需要转红黑树
    addCount(1L, binCount);
    return null;
}
```

#### 使用示例

```java
import java.util.*;
import java.util.concurrent.*;

public class ConcurrentHashMapDemo {
    public static void main(String[] args) throws InterruptedException {
        // 对比 HashMap 和 ConcurrentHashMap 的线程安全性
        
        // HashMap 线程不安全
        Map<Integer, Integer> hashMap = new HashMap<>();
        
        // ConcurrentHashMap 线程安全
        Map<Integer, Integer> concurrentMap = new ConcurrentHashMap<>();
        
        int threadCount = 10;
        int iterations = 1000;
        
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        
        // 测试 HashMap
        for (int i = 0; i < threadCount; i++) {
            final int threadId = i;
            executor.submit(() -> {
                for (int j = 0; j < iterations; j++) {
                    hashMap.put(threadId * iterations + j, j);
                }
            });
        }
        
        // 测试 ConcurrentHashMap
        for (int i = 0; i < threadCount; i++) {
            final int threadId = i;
            executor.submit(() -> {
                for (int j = 0; j < iterations; j++) {
                    concurrentMap.put(threadId * iterations + j, j);
                }
            });
        }
        
        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);
        
        System.out.println("HashMap size: " + hashMap.size());
        // 期望：10000，实际可能小于 10000（数据丢失）
        
        System.out.println("ConcurrentHashMap size: " + concurrentMap.size());
        // 期望：10000，实际一定是 10000
    }
}
```

#### 原子复合操作

```java
import java.util.concurrent.*;

public class ConcurrentMapAtomicDemo {
    public static void main(String[] args) {
        ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
        
        // 原子操作（不需要外部同步）
        
        // 1. putIfAbsent：不存在才添加
        map.putIfAbsent("count", 0);
        
        // 2. compute：原子计算
        map.compute("count", (k, v) -> v == null ? 1 : v + 1);
        
        // 3. computeIfAbsent：不存在则计算
        map.computeIfAbsent("total", k -> 0);
        
        // 4. computeIfPresent：存在则计算
        map.computeIfPresent("count", (k, v) -> v + 1);
        
        // 5. merge：合并值
        map.merge("count", 1, (oldVal, newVal) -> oldVal + newVal);
        
        // 6. replace：替换
        map.replace("count", 10);
        
        // 7. 条件替换
        map.replace("count", 10, 20);
        
        // 8. remove：条件删除
        map.remove("count", 20);
        
        // 9. 批量原子操作
        map.forEach((k, v) -> System.out.println(k + " = " + v));
        
        // 10. 搜索
        Integer result = map.search(2, (k, v) -> v > 5 ? v : null);
        
        // 11. 归约
        Integer sum = map.reduce(2, (k, v) -> v, Integer::sum);
    }
}
```

### 2.9 Map 实现类对比

| 特性 | HashMap | LinkedHashMap | TreeMap | Hashtable | ConcurrentHashMap |
|------|---------|---------------|---------|-----------|-------------------|
| **底层数据结构** | 哈希表 | 哈希表+链表 | 红黑树 | 哈希表 | 哈希表+CAS+synchronized |
| **元素顺序** | 无序 | 插入/访问顺序 | 按键排序 | 无序 | 无序 |
| **允许 null 键** | 是 | 是 | 否 | 否 | 否 |
| **允许 null 值** | 是 | 是 | 是 | 否 | 否 |
| **线程安全** | 否 | 否 | 否 | 是 | 是 |
| **查找时间复杂度** | O(1) | O(1) | O(log n) | O(1) | O(1) |
| **并发性能** | 不支持 | 不支持 | 不支持 | 低（全表锁） | 高（CAS+细粒度锁） |
| **推荐程度** | √ 单线程 | √ 需要顺序 | √ 需要排序 | × 过时 | √ 多线程 |

### 2.10 Map 选择指南

```java
// 决策流程：

// 1. 是否需要线程安全？
//    是 → ConcurrentHashMap
//    否 → 继续判断

// 2. 是否需要排序？
//    是 → TreeMap
//    否 → 继续判断

// 3. 是否需要保持插入/访问顺序？
//    是 → LinkedHashMap
//    否 → HashMap（性能最优）

// 具体场景：

// 场景1：单线程，不需要顺序
Map<String, Integer> map = new HashMap<>();

// 场景2：需要按插入顺序遍历
Map<String, Integer> orderedMap = new LinkedHashMap<>();

// 场景3：需要按键排序
Map<String, Integer> sortedMap = new TreeMap<>();

// 场景4：需要按访问顺序（LRU 缓存）
Map<String, Integer> lruCache = new LinkedHashMap<>(16, 0.75f, true);

// 场景5：多线程环境
Map<String, Integer> concurrentMap = new ConcurrentHashMap<>();
```

---

## 第三部分：Map 遍历详解

### 3.1 遍历方式对比

#### 方式一：entrySet 遍历（推荐）

```java
Map<String, Integer> map = new HashMap<>();
map.put("Apple", 10);
map.put("Banana", 20);
map.put("Cherry", 30);

// 推荐：效率最高
for (Map.Entry<String, Integer> entry : map.entrySet()) {
    System.out.println(entry.getKey() + " = " + entry.getValue());
}
```

#### 方式二：forEach 遍历（推荐，简洁）

```java
// Java 8+：简洁高效
map.forEach((key, value) -> {
    System.out.println(key + " = " + value);
});

// 方法引用
map.forEach((key, value) -> System.out.println(key + " = " + value));
```

#### 方式三：keySet 遍历（不推荐）

```java
// 不推荐：需要两次查找
for (String key : map.keySet()) {
    Integer value = map.get(key); // 每次都要查找
    System.out.println(key + " = " + value);
}
```

#### 方式四：迭代器遍历

```java
// 可在遍历时删除元素
Iterator<Map.Entry<String, Integer>> iterator = map.entrySet().iterator();
while (iterator.hasNext()) {
    Map.Entry<String, Integer> entry = iterator.next();
    if (entry.getValue() < 15) {
        iterator.remove(); // 安全删除
    }
}
```

#### 方式五：Stream API 遍历

```java
// 适合需要过滤、映射等操作
map.entrySet().stream()
    .filter(entry -> entry.getValue() > 15)
    .forEach(entry -> System.out.println(entry.getKey() + " = " + entry.getValue()));

// 并行流（大数据量）
map.entrySet().parallelStream()
    .forEach(entry -> process(entry));
```

### 3.2 性能对比

```
遍历方式性能排序（从快到慢）：

1. entrySet() + for      ← 最快
2. forEach()             ← 接近 entrySet
3. entrySet() + Iterator ← 接近 entrySet
4. Stream API            ← 稍慢（有额外开销）
5. keySet() + get()      ← 最慢（需要两次查找）

结论：优先使用 entrySet() 或 forEach()
```

---

## 第四部分：实战案例

### 4.1 统计单词频率

```java
import java.util.*;

public class WordFrequency {
    public static void main(String[] args) {
        String text = "apple banana apple cherry banana apple";
        
        // 方式一：传统方式
        Map<String, Integer> frequency1 = new HashMap<>();
        for (String word : text.split(" ")) {
            if (frequency1.containsKey(word)) {
                frequency1.put(word, frequency1.get(word) + 1);
            } else {
                frequency1.put(word, 1);
            }
        }
        System.out.println("方式一: " + frequency1);
        
        // 方式二：使用 getOrDefault
        Map<String, Integer> frequency2 = new HashMap<>();
        for (String word : text.split(" ")) {
            frequency2.put(word, frequency2.getOrDefault(word, 0) + 1);
        }
        System.out.println("方式二: " + frequency2);
        
        // 方式三：使用 merge
        Map<String, Integer> frequency3 = new HashMap<>();
        for (String word : text.split(" ")) {
            frequency3.merge(word, 1, Integer::sum);
        }
        System.out.println("方式三: " + frequency3);
        
        // 方式四：使用 compute
        Map<String, Integer> frequency4 = new HashMap<>();
        for (String word : text.split(" ")) {
            frequency4.compute(word, (k, v) -> v == null ? 1 : v + 1);
        }
        System.out.println("方式四: " + frequency4);
    }
}
```

### 4.2 分组统计

```java
import java.util.*;
import java.util.stream.*;

public class GroupingDemo {
    public static void main(String[] args) {
        List<String> words = Arrays.asList(
            "apple", "banana", "cherry", "apricot", "blueberry", "avocado"
        );
        
        // 按首字母分组
        Map<Character, List<String>> grouped = words.stream()
            .collect(Collectors.groupingBy(word -> word.charAt(0)));
        
        System.out.println("按首字母分组: " + grouped);
        // {a=[apple, apricot, avocado], b=[banana, blueberry], c=[cherry]}
        
        // 按字符串长度分组
        Map<Integer, List<String>> byLength = words.stream()
            .collect(Collectors.groupingBy(String::length));
        
        System.out.println("按长度分组: " + byLength);
        // {5=[apple], 6=[banana, cherry], 7=[apricot, avocado], 9=[blueberry]}
        
        // 按首字母分组并统计数量
        Map<Character, Long> countByInitial = words.stream()
            .collect(Collectors.groupingBy(
                word -> word.charAt(0),
                Collectors.counting()
            ));
        
        System.out.println("按首字母统计: " + countByInitial);
        // {a=3, b=2, c=1}
    }
}
```

### 4.3 缓存实现

```java
import java.util.*;

/**
 * 简单缓存实现
 */
public class SimpleCache<K, V> {
    private final Map<K, V> cache;
    private final int maxSize;
    
    public SimpleCache(int maxSize) {
        this.maxSize = maxSize;
        // 使用 LinkedHashMap 实现 LRU
        this.cache = new LinkedHashMap<K, V>(maxSize, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
                return size() > SimpleCache.this.maxSize;
            }
        };
    }
    
    public V get(K key) {
        return cache.get(key);
    }
    
    public void put(K key, V value) {
        cache.put(key, value);
    }
    
    public boolean containsKey(K key) {
        return cache.containsKey(key);
    }
    
    public void remove(K key) {
        cache.remove(key);
    }
    
    public void clear() {
        cache.clear();
    }
    
    public int size() {
        return cache.size();
    }
    
    public static void main(String[] args) {
        SimpleCache<String, String> cache = new SimpleCache<>(3);
        
        cache.put("A", "数据A");
        cache.put("B", "数据B");
        cache.put("C", "数据C");
        
        System.out.println("缓存: A=" + cache.get("A")); // 访问 A
        
        cache.put("D", "数据D"); // 超过容量，删除最久未使用的 B
        
        System.out.println("包含 B: " + cache.containsKey("B")); // false
        System.out.println("包含 A: " + cache.containsKey("A")); // true
    }
}
```

### 4.4 去重和统计

```java
import java.util.*;
import java.util.stream.*;

public class DeduplicationDemo {
    public static void main(String[] args) {
        // 场景：从用户列表中找出重复的用户
        
        List<User> users = Arrays.asList(
            new User(1, "张三"),
            new User(2, "李四"),
            new User(1, "张三"),  // 重复
            new User(3, "王五"),
            new User(2, "李四")   // 重复
        );
        
        // 方式一：使用 HashSet 去重
        Set<User> uniqueUsers = new HashSet<>(users);
        System.out.println("去重后: " + uniqueUsers);
        
        // 方式二：找出重复元素
        Set<User> seen = new HashSet<>();
        Set<User> duplicates = new HashSet<>();
        
        for (User user : users) {
            if (!seen.add(user)) {
                duplicates.add(user);
            }
        }
        System.out.println("重复元素: " + duplicates);
        
        // 方式三：使用 Stream
        Set<Integer> seenIds = new HashSet<>();
        List<User> uniqueList = users.stream()
            .filter(user -> seenIds.add(user.getId()))
            .collect(Collectors.toList());
        System.out.println("按 ID 去重: " + uniqueList);
    }
}

class User {
    private int id;
    private String name;
    
    public User(int id, String name) {
        this.id = id;
        this.name = name;
    }
    
    public int getId() { return id; }
    public String getName() { return name; }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return id == user.id && Objects.equals(name, user.name);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id, name);
    }
    
    @Override
    public String toString() {
        return "User{id=" + id + ", name='" + name + "'}";
    }
}
```

### 4.5 集合运算

```java
import java.util.*;

public class SetOperations {
    public static void main(String[] args) {
        Set<Integer> setA = new HashSet<>(Arrays.asList(1, 2, 3, 4, 5));
        Set<Integer> setB = new HashSet<>(Arrays.asList(4, 5, 6, 7, 8));
        
        // 并集
        Set<Integer> union = new HashSet<>(setA);
        union.addAll(setB);
        System.out.println("并集: " + union); // [1, 2, 3, 4, 5, 6, 7, 8]
        
        // 交集
        Set<Integer> intersection = new HashSet<>(setA);
        intersection.retainAll(setB);
        System.out.println("交集: " + intersection); // [4, 5]
        
        // 差集（A - B）
        Set<Integer> difference = new HashSet<>(setA);
        difference.removeAll(setB);
        System.out.println("A - B: " + difference); // [1, 2, 3]
        
        // 对称差集（并集 - 交集）
        Set<Integer> symmetricDiff = new HashSet<>(union);
        symmetricDiff.removeAll(intersection);
        System.out.println("对称差集: " + symmetricDiff); // [1, 2, 3, 6, 7, 8]
        
        // 判断子集
        Set<Integer> subset = new HashSet<>(Arrays.asList(1, 2));
        System.out.println(subset + " 是 " + setA + " 的子集: " + setA.containsAll(subset)); // true
    }
}
```

---

## 第五部分：常见误区

### 5.1 HashMap 死循环（JDK 1.7）

```java
/**
 * JDK 1.7 的问题（已在新版本修复）
 * 
 * 扩容时使用头插法，可能导致链表形成环形结构
 * 多线程扩容时，可能导致死循环
 * 
 * JDK 1.8 改用尾插法，解决了这个问题
 */

// JDK 1.7 扩容代码（简化）
void transfer(Entry[] newTable) {
    Entry[] src = table;
    int newCapacity = newTable.length;
    for (int j = 0; j < src.length; j++) {
        Entry<K,V> e = src[j];
        if (e != null) {
            src[j] = null;
            do {
                Entry<K,V> next = e.next;
                int i = indexFor(e.hash, newCapacity);
                e.next = newTable[i]; // 头插法
                newTable[i] = e;
                e = next;
            } while (e != null);
        }
    }
}

// 解决方案：
// 1. 升级到 JDK 1.8+
// 2. 多线程环境使用 ConcurrentHashMap
```

### 5.2 修改键对象

```java
import java.util.*;

public class ModifyKeyDemo {
    public static void main(String[] args) {
        Map<List<Integer>, String> map = new HashMap<>();
        
        List<Integer> key = new ArrayList<>(Arrays.asList(1, 2, 3));
        map.put(key, "value");
        
        System.out.println("修改前: " + map.get(key)); // value
        
        // 修改键对象
        key.add(4); // 改变了 hashCode
        
        System.out.println("修改后: " + map.get(key)); // null！找不到
        System.out.println("map.contains: " + map.containsKey(key)); // false
        
        // 原因：hashCode 变化，对象存储位置变了
        // 解决：使用不可变对象作为键（如 String、Integer）
    }
}
```

### 5.3 遍历时修改

```java
import java.util.*;

public class ConcurrentModificationDemo {
    public static void main(String[] args) {
        Map<String, Integer> map = new HashMap<>();
        map.put("A", 1);
        map.put("B", 2);
        map.put("C", 3);
        
        // 错误：遍历时直接删除
        try {
            for (String key : map.keySet()) {
                if (key.equals("B")) {
                    map.remove(key); // ConcurrentModificationException
                }
            }
        } catch (ConcurrentModificationException e) {
            System.out.println("错误：遍历时修改");
        }
        
        // 正确方式 1：使用迭代器
        Iterator<Map.Entry<String, Integer>> iterator = map.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, Integer> entry = iterator.next();
            if (entry.getKey().equals("B")) {
                iterator.remove(); // 安全
            }
        }
        System.out.println("迭代器删除后: " + map);
        
        // 正确方式 2：使用 removeIf（Java 8+）
        map.put("B", 2);
        map.keySet().removeIf(key -> key.equals("B"));
        System.out.println("removeIf 删除后: " + map);
    }
}
```

### 5.4 equals 不一致

```java
import java.util.*;

/**
 * equals 不一致的例子
 */
class BadPoint {
    private int x, y;
    
    public BadPoint(int x, int y) {
        this.x = x;
        this.y = y;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o instanceof BadPoint) {
            BadPoint that = (BadPoint) o;
            // 错误：没有检查 getClass()
            // 子类和父类可能被认为相等
            return x == that.x && y == that.y;
        }
        return false;
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(x, y);
    }
}

class ColoredPoint extends BadPoint {
    private String color;
    
    public ColoredPoint(int x, int y, String color) {
        super(x, y);
        this.color = color;
    }
    
    // 问题：ColoredPoint(1, 2, "red") 和 BadPoint(1, 2) 被认为相等
}

// 正确做法：
class GoodPoint {
    private final int x, y;
    
    public GoodPoint(int x, int y) {
        this.x = x;
        this.y = y;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        GoodPoint that = (GoodPoint) o;
        return x == that.x && y == that.y;
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(x, y);
    }
}
```

### 5.5 容量设置不当

```java
import java.util.*;

public class CapacityDemo {
    public static void main(String[] args) {
        // 问题：频繁扩容影响性能
        Map<Integer, String> map1 = new HashMap<>();
        
        long start = System.currentTimeMillis();
        for (int i = 0; i < 1000000; i++) {
            map1.put(i, "value" + i);
        }
        long end = System.currentTimeMillis();
        System.out.println("默认容量时间: " + (end - start) + " ms");
        
        // 优化：预知元素数量，设置初始容量
        Map<Integer, String> map2 = new HashMap<>((int)(1000000 / 0.75) + 1);
        
        start = System.currentTimeMillis();
        for (int i = 0; i < 1000000; i++) {
            map2.put(i, "value" + i);
        }
        end = System.currentTimeMillis();
        System.out.println("预设容量时间: " + (end - start) + " ms");
        
        // 结果：预设容量更快，避免了多次扩容
    }
}
```

---

## 第六部分：面试要点

### 6.1 HashMap 相关

#### Q1：HashMap 的底层实现？

```
JDK 1.7：数组 + 链表
JDK 1.8：数组 + 链表 + 红黑树

详细：
- 数组：Node<K,V>[] table，默认长度 16
- 链表：解决哈希冲突，新元素插到尾部（JDK 1.8）
- 红黑树：链表长度 ≥ 8 且数组长度 ≥ 64 时转换
```

#### Q2：HashMap 扩容机制？

```
触发条件：size > capacity * loadFactor

扩容过程：
1. 容量翻倍（newCap = oldCap << 1）
2. 创建新数组
3. 重新分配元素：
   - 原索引 或 原索引 + 原容量
   - 根据 (hash & oldCap) 判断
4. 红黑树可能退化回链表

性能影响：
- 扩容是耗时操作
- 建议预知元素数量，设置初始容量
```

#### Q3：为什么 JDK 1.8 使用红黑树？

```
1. 性能优化：
   - 链表查找：O(n)
   - 红黑树查找：O(log n)
   - 当链表过长时，红黑树性能更好

2. 防止攻击：
   - 恶意构造大量相同 hash 的 key
   - 导致链表过长，查找退化成 O(n)
   - 红黑树保证 O(log n) 最坏情况
```

#### Q4：HashMap 为什么线程不安全？

```
1. JDK 1.7：
   - 扩容时使用头插法，可能导致链表成环
   - 多线程扩容可能导致死循环

2. JDK 1.8：
   - 使用尾插法，解决了死循环问题
   - 但仍有并发问题：
     a. 数据丢失：多线程同时 put，可能覆盖
     b. 数据不一致：size 计数不准确

解决方案：使用 ConcurrentHashMap
```

### 6.2 ConcurrentHashMap 相关

#### Q5：ConcurrentHashMap 如何保证线程安全？

```
JDK 1.7：分段锁（Segment）
- 数组分 16 个 Segment
- 每个 Segment 继承 ReentrantLock
- 锁粒度：一个 Segment（多个桶）

JDK 1.8：CAS + synchronized
- 锁粒度：单个桶（链表头节点或红黑树根节点）
- 读操作：无锁（volatile 变量）
- 写操作：
  a. 空桶：CAS 插入
  b. 非空：synchronized 锁住头节点
```

#### Q6：ConcurrentHashMap 为什么不允许 null？

```
原因：避免二义性

如果允许 null：
- map.get(key) 返回 null
- 无法区分：key 不存在 vs value 是 null

多线程环境下：
- 无法使用 containsKey 检查（中间可能被修改）
- 导致二义性问题

参考 Doug Lea 的解释：
"The main reason that nulls aren't allowed in ConcurrentMaps 
is that there's no way to decide if the value is absent or 
the key maps to null."
```

### 6.3 hashCode 和 equals 相关

#### Q7：为什么要同时重写 hashCode 和 equals？

```
契约：
- equals 相同 → hashCode 必须相同
- hashCode 相同 → equals 不一定相同

HashMap 工作原理：
1. 计算 hash = key.hashCode()
2. 计算索引 = (n - 1) & hash
3. 在该位置查找，比较 hash 和 equals

只重写 equals：
- equals 返回 true，但 hashCode 不同
- 两个"相等"的对象存储在不同位置
- get 时找不到

只重写 hashCode：
- hashCode 相同，但 equals 返回 false
- 可以存储，但逻辑错误

结论：必须同时重写，且保持一致性
```

#### Q8：如何正确实现 hashCode？

```java
// 方式一：Objects.hash（推荐）
@Override
public int hashCode() {
    return Objects.hash(field1, field2, field3);
}

// 方式二：手动实现
@Override
public int hashCode() {
    int result = 17; // 任意非零奇数
    result = 31 * result + field1;
    result = 31 * result + field2;
    return result;
}

// 为什么用 31？
// 1. 质数，减少冲突
// 2. 31 * i == (i << 5) - i，位运算优化
// 3. 历史惯例
```

### 6.4 Set 相关

#### Q9：HashSet 如何保证元素唯一？

```
原理：
1. 计算 hash = element.hashCode()
2. 计算索引
3. 检查该位置是否已存在相同元素
4. 比较 equals()
   - 相同：不添加
   - 不同：形成链表/红黑树

要求：
- 元素必须正确实现 hashCode() 和 equals()
- 不可变对象最佳
```

#### Q10：Set 如何选择？

```
决策流程：
1. 需要排序？
   - 是 → TreeSet
   - 否 → 继续

2. 需要保持插入顺序？
   - 是 → LinkedHashSet
   - 否 → HashSet（性能最优）

特殊情况：
- 多线程 → ConcurrentHashMap.newKeySet()
- 枚举 → EnumSet
```

### 6.5 综合问题

#### Q11：Map 如何选择？

```
决策流程：
1. 需要线程安全？
   - 是 → ConcurrentHashMap
   - 否 → 继续

2. 需要排序？
   - 是 → TreeMap
   - 否 → 继续

3. 需要保持顺序？
   - 是 → LinkedHashMap
   - 否 → HashMap（性能最优）

特殊情况：
- 多线程 + 排序 → Collections.synchronizedSortedMap(new TreeMap<>())
- 枚举键 → EnumMap
```

#### Q12：HashMap 和 Hashtable 的区别？

| 特性 | HashMap | Hashtable |
|------|---------|-----------|
| 线程安全 | 否 | 是 |
| 允许 null | 键值都允许 | 都不允许 |
| 默认容量 | 16 | 11 |
| 扩容方式 | 2 倍 | 2n + 1 |
| 继承 | AbstractMap | Dictionary（已过时） |
| 性能 | 高 | 低 |
| 推荐 | √ | × |

---

## 总结

### Set 和 Map 对比

```
┌────────────────────────────────────────────────────────┐
│              Set 和 Map 的关系                          │
├────────────────────────────────────────────────────────┤
│                                                        │
│   HashSet 内部使用 HashMap：                           │
│   - 元素作为 HashMap 的 key                            │
│   - value 固定为 PRESENT（Object 对象）                │
│                                                        │
│   TreeSet 内部使用 TreeMap：                           │
│   - 元素作为 TreeMap 的 key                            │
│   - value 固定为 PRESENT                               │
│                                                        │
│   本质：Set 是 Map 的 key 部分                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 选择速查表

```
┌─────────────────────────────────────────────────────────┐
│                Set 选择速查表                            │
├─────────────────────────────────────────────────────────┤
│ 需求              │ 推荐               │ 原因           │
├───────────────────┼───────────────────┼────────────────┤
│ 简单去重          │ HashSet           │ 性能最优       │
│ 保持插入顺序      │ LinkedHashSet     │ 链表维护顺序   │
│ 需要排序          │ TreeSet           │ 红黑树排序     │
│ 多线程环境        │ ConcurrentHashMap.newKeySet() │ 线程安全  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                Map 选择速查表                            │
├─────────────────────────────────────────────────────────┤
│ 需求              │ 推荐               │ 原因           │
├───────────────────┼───────────────────┼────────────────┤
│ 单线程键值对      │ HashMap           │ 性能最优       │
│ 保持插入顺序      │ LinkedHashMap     │ 链表维护顺序   │
│ 需要按键排序      │ TreeMap           │ 红黑树排序     │
│ 多线程环境        │ ConcurrentHashMap │ CAS+synchronized │
│ LRU 缓存         │ LinkedHashMap(accessOrder=true) │ 访问顺序 │
└─────────────────────────────────────────────────────────┘
```

### 最佳实践

1. **选择合适的实现类**
   - 不需要顺序：HashMap/HashSet
   - 需要保持顺序：LinkedHashMap/LinkedHashSet
   - 需要排序：TreeMap/TreeSet
   - 多线程：ConcurrentHashMap

2. **正确实现 hashCode 和 equals**
   - 使用 IDE 自动生成
   - 或使用 Lombok @EqualsAndHashCode
   - 保持一致性：equals 相同则 hashCode 相同

3. **使用不可变对象作为键**
   - String、Integer 等
   - 避免修改键对象导致的问题

4. **合理设置初始容量**
   - 预知元素数量时，设置合适的初始容量
   - 避免频繁扩容

5. **遍历 Map 使用 entrySet 或 forEach**
   - 避免使用 keySet + get（两次查找）
   - entrySet 效率最高

6. **多线程环境使用 ConcurrentHashMap**
   - 不要使用 Hashtable（过时）
   - 不要使用 Collections.synchronizedMap（性能差）

## 面试要点

1. **HashSet 如何保证不重复？** 先比较 `hashCode()`，相等再比较 `equals()`；自定义对象必须同时重写二者。
2. **HashMap 的树化条件？** 链表长度 >8 且数组容量 ≥64 时转为红黑树，提升查询至 O(log n)；容量不足时优先扩容。
3. **HashMap 扩容多少倍、何时扩容？** 默认容量 16、负载因子 0.75，元素数超过 容量×0.75 时扩容为 2 倍并 rehash。
4. **ConcurrentHashMap 如何保证线程安全（JDK 8）？** 数组桶级用 `synchronized` + CAS，读无锁，粒度远细于全表锁。
5. **为什么 Map 的 key 要用不可变对象？** key 的 hashCode 若变化会导致后续 get 找不到原位置，引发逻辑丢失。

## 版本差异(旧版 → Java 21)

| 特性 | 旧版(Java 8) | Java 9/21 |
|------|--------------|-------------|
| 不可变容器 | `Collections.unmodifiableMap` 包装 | `Map.of`/`Map.ofEntries`（Java 9）、`Map.copyOf`（Java 10） |
| 并发容器 | `ConcurrentHashMap` 桶级同步 | 不变；虚拟线程（Java 21）下锁竞争更低 |
| key 设计 | 手写不可变类 | 优先 `record`（Java 16 正式）作 key，equals/hashCode 自动正确 |
| 排序 | `TreeMap`/`TreeSet` | 不变；`SequencedMap`/`SequencedSet`（Java 21）保留插入序访问能力 |

## 继续阅读

- 上一章：[集合框架](11-集合框架)
- 下一章：[对象比较与排序](13-对象比较与排序)
