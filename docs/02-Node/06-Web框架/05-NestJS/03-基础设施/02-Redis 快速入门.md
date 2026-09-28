---
title: Redis 快速入门
description: 快速入门 Redis，掌握 key-value 数据结构、各种数据类型的命令与使用场景
keywords: [快速入门, Redis, key-value, string, list, set, zset, hash, geo]
category: Node.js
tags: [Node.js, Redis, 缓存]
---

# Redis 快速入门

前面学了 mysql，它是通过表和字段来存储信息的，表和表之间通过 id 关联，叫做关系型数据库。它提供了 sql 语言，可以通过这种语言来描述对数据的增删改查。

mysql 是通过硬盘来存储信息的，并且还要解析并执行 sql 语句，这些决定了它会成为性能瓶颈。也就是说服务端执行计算会很快，但是等待数据库查询结果就很慢了。

计算机领域最经常考虑到的性能优化手段就是缓存了。能不能把结果缓存在内存中，下次只查内存就好了呢？内存和硬盘的速度差距还是很大的。

所以做后端服务的时候，不会只用 mysql，一般会结合内存数据库来做缓存，最常用的是 redis。

因为需求就是缓存不同类型的数据，所以 redis 的设计是 key、value 的键值对的形式。并且值的类型有很多：字符串（string）、列表（list）、集合（set）、有序集合（sorted set)、哈希表（hash）、地理信息（geospatial）、位图（bitmap）等。

## 启动 Redis 服务

redis 是分为服务端和客户端的，它提供了一个 redis-cli 的命令行客户端。

首先把 redis 服务跑起来。在 docker desktop 搜索框搜索 redis，点击 run，把 redis 官方镜像下载并跑起来。

端口映射就是把主机的 6379 端口映射到容器内的 6379 端口，这样就能直接通过本机端口访问容器内的服务了。

指定数据卷，用本机的任意一个目录挂载到容器内的 /data 目录，这样数据就会保存在本机。在本地目录添加一个文件，在容器内的 data 目录就能访问到。同样，在容器内修改 data 目录，那本机目录下也会修改。

redis 服务跑起来之后，用 redis-cli 操作下。在 terminal 输入 redis-cli，进入交互模式。

## 常用数据类型与命令

### string

文档里的命令有 set、get、incr 等。

set、get 都挺简单，incr 是用于递增的，平时用的阅读量、点赞量等都是通过这个来计数的。

当我存了几个 key 后，可以通过 keys 来查询有哪些 key，keys 后加一个模式串来过滤，常用的是 '\*' 来查询所有 key。

在这里（实时执行中）做下 string 相关的操作即可看到效果。

### list

可以用官方 GUI 工具 RedisInsight 来操作，它号称是最好的 Redis GUI 工具，下载安装后点击 add database，连接信息用默认的就行。

list 类型的命令：

    lpush list1 111
    lpush list1 222
    lpush list1 333

lpush 是 left push 的意思，执行后会从左到右添加到列表中。rpush 是 right push 的意思，执行后会从右往左添加到列表中。

    rpush list1 444
    rpush list1 555

lpop 和 rpop 自然是从左边和从右边删除数据。

    lpop list1
    rpop list1

如果想查看 list 数据，在命令行里 get 是只适用于 string 类型的数据的，list 类型的数据要用 lrange：

    lrange list1 0 -1

输入一段 range，结尾下标为 -1 代表到最后。lrange list1 0 -1 就是查询 list1 的全部数据。

### set

set 的特点是无序并且元素不重复。

    sadd set1 111
    sadd set1 111
    sadd set1 111
    sadd set1 222
    sadd set1 222
    sadd set1 333

刷新之后可以看到它只保留去重后的数据。可以通过 sismember 判断是否是集合中的元素：

    sismember set1 111
    sismember set1 444

set 只能去重、判断包含，不能对元素排序。

### sorted set（zset）

如果排序、去重的需求，比如排行榜，可以用 sorted set，也就是 zset，它每个元素是有一个分数的：

    zadd zset1 5 guang
    zadd zset1 4 dong
    zadd zset1 3 xxx
    zadd zset1 6 yyyy

会按照分数来排序。通过 zrange 命令取数据，比如取排名前三的数据：

    zrange zset1 0 2

### hash

和用的 map 一样，比较容易理解：

    hset hash1 key1 1
    hset hash1 key2 2
    hset hash1 key3 3
    hset hash1 key4 4
    hset hash1 key5 5

    hget hash1 key3

### geo

geo 的数据结构，就是经纬度信息，根据距离计算周围的人用的。

    geoadd loc 13.361389 38.115556 "guangguang" 15.087269 37.502669 "dongdong"

用 loc 作为 key，分别添加 guangguang 和 dongdong 的经纬度。你会发现 redis 实际使用 zset 存储的，把经纬度转化为了二维平面的坐标。

你可以用 geodist 计算两个坐标点的距离：

    geodist loc guangguang dongdong

用 georadius 搜索某个半径内的其他点，传入经纬度、半径和单位：

    georadius loc 15 37 100 km
    georadius loc 15 37 200 km

平时查找周围的人、周围的 xxx 都可以通过 redis 的 geo 数据结构实现。

### 过期时间

一般 redis 的 key 会设置过期时间，通过 expire 命令，比如设置 dong1 的 key 为 30 秒过期：

    expire dong1 30

等到了过期时间就会自动删除。想查剩余过期时间使用 ttl。一些有时效的数据可以设置个过期时间。

redis 的数据结构就先介绍到这里。所有的命令都可以在官方文档查：<https://redis.io/commands/>

## Redis 的用途

回到最开始的问题，完全可以查出数据来之后放到 redis 中缓存，下次如果 redis 有数据就直接用，没有的话就查数据库然后更新 redis 缓存。这是 redis 的第一种用途，作为数据库的缓存，也是主要的用途。

第二种用途就是直接作为存储数据的地方了，因为 redis 本身是会做持久化的，也可以把数据直接保存在 redis 里，不存到 mysql。当然，因为 redis 在内存存储数据，这样成本还是比较高的，需要经常扩容。

最后，还记得跑 redis 的 docker 镜像时指定了数据卷么，可以看到它确实把数据保存到了宿主机，这样就不怕再跑一个容器数据会丢了。

## 总结

因为 mysql 存在硬盘，并且会执行 sql 的解析，会成为系统的性能瓶颈，所以要做一些优化。常见的就是在内存中缓存数据，使用 redis 这种内存数据库。

它是 key、value 的格式存储的，value 有很多种类型，比如 string、list、set、sorted set(zset)、hash、geo 等。

灵活运用这些数据结构，可以完成各种需求，比如排行榜用 zset、阅读数点赞数用 string、附近的人用 geo 等。

而且这些 key 都可以设置过期时间，可以完成一些时效性相关的业务。用官方 GUI 工具 RedisInsight 可以可视化的操作它，很方便。

redis 几乎和 mysql 一样是后端系统的必用中间件了，它除了用来做数据库的缓存外，还可以直接作为数据存储的地方。学会灵活使用 redis，是后端开发很重要的一步。