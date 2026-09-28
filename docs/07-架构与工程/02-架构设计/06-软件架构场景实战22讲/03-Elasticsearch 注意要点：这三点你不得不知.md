---
title: Elasticsearch 注意要点：这三点你不得不知
description: 结合实战经验总结 Elasticsearch 的三大要点——表结构设计、表结构修改与常见使用陷阱，帮助读者避开分布式搜索分析引擎使用中的那些"坑"。
keywords: [02-架构设计, Elasticsearch, 注意要点]
category: 架构与工程
tags: [架构, 02-架构设计]
---

# Elasticsearch 注意要点：这三点你不得不知

02 讲中我们提到 Elasticsearch 能在短时间内搜索、分析大量数据，并作为查询数据的存储系统。坦白地说，Elasticsearch 确实是个好东西，毕竟它在分布式开源搜索和分析引擎中处于领先地位。不过它也存在不少的坑，以至于我身边几个好朋友经常跟我抱怨 ES 多么多么不好用。

对于 Elasticsearch 而言，我们想掌握好这门技术，除需要对它的用法了如指掌外，还需要对技术中的各种坑了然于心。因此，03 讲我结合个人实战经验总结出了关于 ES 的 3 大知识要点：如何使用 Elasticsearch 设计表结构？Elasticsearch 如何修改表结构？ES 的坑有哪些？

在正式讲解前，如果你使用过 ES，学习起来会更容易一些，没使用过也没关系，通过 03 讲的学习你也能了解 ES 的基本原理和 ES 的那些坑。

## 如何使用Elasticsearch 设计表结构？

我们知道 ES 是基于索引的设计，它没办法像 MySQL 那样使用 join 查询，所以，查询数据时我们需要把每条主数据及关联子表的数据全部整合在一条记录中。

比如 MySQL 中有一个订单数据，使用 ES 查询时，我们会把每条主数据及关联子表数据全部整合在下表中：

![](/arch-course-images/03-Elasticsearch_注意要点_这三点你不得不知__Cip5yF_XTrmATHezAACvlXmMIMk086.png)

从上表中，我们发现：使用 ES 存储数据时并不会设计多个表，而是将所有表的相关字段数据汇集在一个 Document 中，即一个完整的文档结构，类似这样（此处我使用 JSON），代码示例如下：

```
{  "order_id": {
    "order_id": "O2020103115214521",
    "order_invoice": {},
    "user": {
    "user_id": "U1099",
    "user_name": "李大侠"
 },
 "order_product_item": [
 {
    "product_name": "乒乓球拍",
    "product_count": 1,
    "product_price": 149
 },
 {
    "product_name": "纸巾",
    "product_count": 2,
    "product_price": 1.4
 }
 ],
 "total_amount": 20
 }
}

```

到这，你是不是很疑惑：为什么我们把所有表汇聚在一个 Document 中，而不是设计成多个表？为什么 ES 不需要关联查询？这就涉及 ES 的存储结构原理相关知识，我们有必要先普及下。

### **ES 的存储结构**

ES 是一个分布式的查询系统，它的每一个节点都是一个基于 Lucene 的查询引擎。下面通过 Lucene 和 MySQL 的概念对比，你就能真正理解 Lucene 了。

**（1）Lucene 和 MySQL 的概念对比**

Lucene 是一个索引系统，通过从易到难的方式，我们把 Lucene 与 MySQL 的一些概念简单做映射：

![](/arch-course-images/03-Elasticsearch_注意要点_这三点你不得不知__Cip5yF_XTsqAELYYAACD5X8OJ7g432.png)

通过表中相关概念的对比，相信你已经理解了 Lucene 中每个概念的作用，这部分内容也是对上面内容的一个补充。

到这你可能还有一个疑问：Lucene 的索引 Index 到底是什么？我们继续讨论。

**（2）无结构文档的倒排索引（Index）**

实际上，Lucene 使用的是倒排索引的结构，具体是什么意思呢？先举个例子，你就能更好地理解了。

假如我们有一个无结构的文档，如下表所示：

![](/arch-course-images/03-Elasticsearch_注意要点_这三点你不得不知__CgpVE1_XTtaAVMWOAAB_YVCx8-M455.png)

简单倒排索引后，显示的结果如下表所示：

![](/arch-course-images/03-Elasticsearch_注意要点_这三点你不得不知__Cip5yF_XTuKAFnIVAABnsgtxCto959.png)

我们发现：无结构的文档经过简单的倒排索引后，字典表主要存放关键字，而倒排表存放该关键字所在的文档 id。

通过以上简单的例子，我们已经明白倒排索引的结构了，但是表数据往往是有结构的，并不是一篇篇文章。如果一个文档有结构呢，我们该怎么办？

**（3）有结构文档的倒排索引（Index）**

再来举一个更复杂的例子，比如每个 Doc 都有多个 Field，Field 有不同的值（包含不同的 Term），倒排索引的结构参考如下图所示：

![](/arch-course-images/03-Elasticsearch_注意要点_这三点你不得不知__Cip5yF_XTuyAAhgIAAC3_agm9VY246.png)

倒排索引结构示意图

也就是说：有结构的文档经过倒排索引后，字段中的每个值都是一个关键字，存放在左边的 Term Dictionary（词汇表）中，且每个关键字都有对应地址指向所在文档。

以上例子只是一个参考，实际上不管是字典表还是倒排表都是非常复杂的数据结构（03 讲我们先讨论到这个深度）。了解了 ES 的存储数据结构，我们就能更好地理解 ES 的表结构设计思路了。

讲到这，我们先讨论下：ES 的 Document 如何定义结构和字段格式（类似 MySQL 的表结构）？

**（4） ES 的 Document 怎么定义结构和字段格式**

前面我们讲解了 ES 的存储结构，从它是基于索引的设计来看，我们知道，设计 ES Document 结构时，并不需要像 MySQL 那样关联表，而是会把所有相关数据汇集在 1 个 Document 中，接下来我们看个例子。

我直接将刚刚 order 的 JSON 文档转成一个 ES 定义文档命令（这里需要注意：SQL 中的子表数据，在 ES 中需要以嵌入式对象的格式存储），代码示例如下（注：此处沿用 ES 6.x 带 type 的映射写法；ES 7.x 起已废弃 type、8.0 起彻底移除，现行写法为 `"mappings": { "properties": { … } }`）：

```
{
 "mappings": {
 "doc": {
    "properties": {
    "order_id": {
    "type": "text"
 },
    "order_invoice": {
    "type": "nested"
 },
    "order_product_item": {
    "type": "nested",
    "properties": {
    "product_count": {
    "type": "long"
 },
    "product_name": {
    "type": "text"
 },
    "product_price": {
    "type": "float"
 }
 }
 },
    "total_amount": {
    "type": "long"
 },
    "user": {
    "properties": {
    "user_id": {
    "type": "text"
 },
    "user_name": {
    "type": "text"
 }
 }
 }
 }
 }
 }
}

```

我们已经了解了 ES 表结构的设计，在实际业务中，我们往往会遇到这种情况：主数据修改了表结构，ES 也要求修改文档结构，这时我们该怎么办？这就涉及下面要讨论的第 2 个问题——如何修改表结构。

## Elasticsearch如何修改表结构？

在实际业务中，如果你想增加新的字段，ES 支持直接添加，但如果你想修改字段类型或者改名，ES 官方文档里是这样写的（有兴趣的同学可以练练英文，没兴趣的可以直接跳过）：

Except for supported mapping parameters, you can’t change the mapping or field type of an existing field. Changing an existing field could invalidate data that’s already Indexed.

If you need to change the mapping of a field in other indices, create a new index with the correct mapping and reIndex your data into that index.

Renaming a field would invalidate data already indexed under the old field name. Instead, add an alias field to create an alternate field name.

因为修改字段的类型会导致索引失效，所以 ES 不支持我们修改原来字段的类型。

**如果你想修改字段的映射，首先需要新建一个索引，然后使用 ES 的 reindex 功能将旧索引拷贝到新索引中。**

那什么是 reindex 呢？reindex 是 ES 自带的 API ，在实际代码中，你看下调用示例就能明白它的功用了。

```
POST _reindex
{
  "source": {
    "index": "my-index-000001"
  },
  "dest": {
    "index": "my-new-index-000001"
  }
}

```

不过，直接重命名字段时，我们使用 reindex 功能会导致原来保存的旧字段名的索引数据失效，这种情况该如何解决？此时我们可以使用 alias 索引功能，代码示例如下：

```
PUT trips
{
  "mappings": {
    "properties": {
      "distance": {
        "type": "long"
      },
      "route_length_miles": {
        "type": "alias",
        "path": "distance"
      },
      "transit_mode": {
        "type": "keyword"
      }
    }
  }
}

```

说到修改表结构，使用普通 MySQL 时，我并不建议直接修改字段的类型，改名或删字段。因为每次更新版本时，我们都要做好版本回滚的打算，为此设计每个版本对应数据库时，我们会尽量兼容前面版本的代码。

因 ES 的结构基于 MySQL 而设计，两者之间存在对应关系，所以我也不建议直接修改 ES 的表结构。

那如果我们真有修改的需求呢？一般而言，我们会先保留旧的字段，然后直接添加并使用新的字段，直到新版本的代码全部稳定工作后，我们再找机会清理旧的不用的字段，即分成 2 个版本完成修改需求。

介绍完如何修改表结构，我们继续讲解最后一个要点：ES 的那些坑。

## ES 的坑有哪些？

### 坑一：ES 是准实时的？

当你更新数据至 ES 且返回成功提示（注意这一瞬间），你会发现通过 ES 查询返回的数据仍然不是最新的，背后的原因究竟是什么？这就要求我们对数据索引的整个过程有所了解，且待我们一步步揭开真实的面纱。

数据索引整个过程因涉及 ES 的分片，Lucene Index、Segment、 Document 的三者之间关系等知识点，所以我们有必要先把这部分内容串起来说明。

ES 的一个分片（这里跳过 ES 分片相关介绍）就是一个 Lucene Index，每一个 Lucene Index 由多个 Segment 构成，即 Lucene Index 的子集就是 Segment，如下图所示：

![](/arch-course-images/03-Elasticsearch_注意要点_这三点你不得不知__CgpVE1_XTxGALFDFAABxnb4yW-c693.png)

关于 Lucene Index、Segment、 Document 三者之间的关系，你看完下面这张图就一目了然了，如下图所示：

![](/arch-course-images/03-Elasticsearch_注意要点_这三点你不得不知__CgpVE1_XTxmAbLEnAADVolK6oxw604.png)

通过上面这个图，我们知道一个 Lucene Index 可以存放多个 Segment，而每个 Segment 又可以存放多个 Document。

掌握了以上基础知识点，接下来就进入正题——数据索引的过程详解。

第一步：当新的 Document 被创建，数据首先会存放到新的 Segment 中，同时旧的 Document 会被删除，并在原来的 Segment 上标记一个删除标识。当 Document 被更新，旧版 Document 会被标识为删除，并将新版 Document 存放新的 Segment 中。

第二步：Shard 收到写请求时，请求会被写入 Translog 中，然后 Document 被存放 memory buffer （注意：memory buffer 的数据并不能被搜索到）中，最终 Translog 保存所有修改记录。

![](/arch-course-images/03-Elasticsearch_注意要点_这三点你不得不知__CgpVE1_XTziAVw8DAACGRqLAefs016.png)

第三步：每隔 1 秒（默认设置），refresh 操作被执行一次，且 memory buffer 中的数据会被写入一个 Segment 并存放 filesystem cache 中，这时新的数据就可以被搜索到了，如下图所示：

![](/arch-course-images/03-Elasticsearch_注意要点_这三点你不得不知__CgpVE1_XT0eAC-oyAACRs7zj19g709.png)

通过以上数据索引过程的说明，我们发现 ES 并不是实时的，而是有 1 秒延时，因延时问题的解决方案我们在 02 讲中介绍过，提示用户查询的数据会有一定延时即可。

讲到这里，感觉你开始打呵欠了，再坚持一下，再讲 2 个坑就结束了。如果我不先讲原理直接讲坑，你只知其然不知其所以然，更加记不住。

### 坑二：ES 宕机恢复后，数据丢失

在数据索引的过程这部分内容，我们提及了每隔 1 秒（根据配置），memory buffer 中的数据会被写入 Segment 中，此时这部分数据可被用户搜索到，但没有被持久化，一旦系统宕机了，数据就会丢失。

比如下图中灰色的桶，目前它可被搜索到，但还没有持久化，一旦 ES 宕机，数据将会丢失。

![](/arch-course-images/03-Elasticsearch_注意要点_这三点你不得不知__CgpVE1_XT1KAfzzWAACRs7zj19g995.png)

如何防止数据丢失呢？使用 Lucene 中的 commit 操作就能轻松解决这个问题。

commit 具体操作：先将多个 Segment 合并保存到磁盘中，再将灰色的桶变成上图中绿色的桶。

不过，使用 commit 操作存在一点不足：耗 IO，从而引发 ES 在 commit 之前宕机的问题。一旦系统在 translog fsync 之前宕机，数据也会直接丢失，如何保证 ES 数据的完整性便成了亟待解决的问题。

遇到这种情况，我们采用 translog 解决就行，因为 Translog 中的数据不会直接保存在磁盘中，只有 fsync 后才保存，这里我分享两种 Translog 解决方案。

- 第一种：将 index.translog.durability 设置成 request，如果我们发现系统运行得不错，采用这种方式即可；

- 第二种：将 index.translog.durability 设置成 async，每次 ES 宕机启动后，先将主数据和 ES 数据进行对比，再将 ES 缺失的数据找出来。

强调一个知识点：Translog 何时会 fsync？当 index.translog.durability 设置成 request 后，每个请求都会 fsync，不过这样影响 ES 性能。这时我们可以把 index.translog.durability 设置成 async，那么每隔 index.translog.sync_interval 后，Translog 才会 fsync 一次。

### 坑三：分页越深，查询效率越慢

ES 分页这个坑的出现，与 ES 的读操作请求的处理流程密切关联，为此我们有必要先深度剖析下 ES 的读操作请求的处理流程，如下图所示：

![](/arch-course-images/03-Elasticsearch_注意要点_这三点你不得不知__CgpVE1_XT2GAUqfhAAFpYjDxkE0550.png)

ES 的读操作请求的处理流程示意图

关于 ES 的读操作流程主要分为两个阶段：Query Phase、Fetch Phase。

- **Query Phase：** 协调的节点先把请求分发到所有分片，然后每个分片在本地查询建一个结果集队列，并将命令中的 Document id 以及搜索分数存放队列中，再返回给协调节点，最后协调节点会建一个全局队列，归并收到的所有结果集并进行全局排序。

Query Phase 我需要强调：在 ES 查询过程中，如果 search 带了 from 和 size 参数，Elasticsearch 集群需要给协调节点返回 shards number * (from + size)  条数据，然后在单机上进行排序，最后给客户端返回 size 大小的数据。比如客户端请求 10 条数据（比如 3 个分片），那么每个分片则会返回 10 条数据，协调节点最后会归并 30 条数据，但最终只返回 10 条数据给客户端。

- **Fetch Phase：** 协调节点先根据结果集里的 Document id 向所有分片获取完整的 Document，然后所有分片返回完整的 Document 给协调节点，最后协调节点将结果返回给客户端。（关于什么是协调节点，我们先忽略它。）

在整个 ES 的读操作流程中，Elasticsearch 集群实际上需要给协调节点返回 shards number * （from + size) 条数据，然后在单机上进行排序，最后返回给客户端这个 size 大小的数据。

比如有 5 个分片，我们需要查询排序序号从 10000 到 10010（from=10000，size=10）的结果，每个分片到底返回多少数据给协调节点计算呢？告诉你不是 10 条，是 10010 条。也就是说，协调节点需要在内存中计算 10010*5=50050 条记录，所以在系统使用中，如果用户分页越深查询速度会越慢，也就是说并不是分页越多越好。

那如何更好地解决 ES 分页问题呢？为了控制性能，我们主要使用 ES 中的 max_result_window 配置，这个数据默认为 10000，当 from+size > max_result_window ，ES 将返回错误。

由此可见，在系统设计时，我们一般需要控制用户翻页不能太深，而这在现实场景中用户也能接受，这也是我之前方案采用的设计方式。要是用户确实有深度翻页的需求，我们再使用 ES 中search_after 的功能也能解决，不过就是无法实现跳页了。

我们举一个例子，查询按照订单总金额分页，上一页最后一条 order 的总金额 total_amount 是 10，那么下一页的查询示例代码如下：

```
{
    "query": {
        "bool": {
            "must": [
                {
                    "term": {
                        "user.user_name.keyword": "李大侠"
                    }
                }
            ],
            "must_not": [],
            "should": []
        }
    },
    "from": 0,
    "size": 2,
    "search_after": [
        "10"
    ],
    "sort": [
        {
            "total_amount": "asc"
        }
    ],
    "aggs": {}
}

```

这个 search_after 里的值，就是上次查询结果的排序字段的结果值。

## 小结

03 讲关于使用 Elasticsearch 需要注意的要点我们就讲完了，04 讲我们开始讲分表分库。

在实际工作中，如果你还遇到了其他坑或者对 03 讲内容有什么建议，欢迎留言与我交流。另外，喜欢的同学可以将本课程分享给更多的好友看到哦。
