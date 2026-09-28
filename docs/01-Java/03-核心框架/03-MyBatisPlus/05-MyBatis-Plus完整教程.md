---
title: "MyBatis-Plus完整教程"
description: "MyBatis-Plus（简称 MP）是一个 MyBatis 的增强工具，在 MyBatis 的基础上只做增强不做改变，为简化开发、提高效率而生。"
keywords: [MyBatis-Plus, 完整教程, BaseMapper, 条件构造器, 分页]
category: "Java"
tags: [Java, MyBatisPlus]
---


# MyBatis-Plus 完整教程

MyBatis-Plus（简称 MP）是一个 MyBatis 的增强工具，在 MyBatis 的基础上只做增强不做改变，为简化开发、提高效率而生。

## 核心特性

| 特性                   | 说明                                                           |
| ---------------------- | -------------------------------------------------------------- |
| **无侵入**             | 只做增强不做改变，引入它不会对现有工程产生影响                 |
| **强大的 CRUD 操作**   | 内置通用 Mapper、Service，少量配置即可实现单表大部分 CRUD 操作 |
| **支持 Lambda 表达式** | 通过 Lambda 表达式方便编写各类查询条件，无需担心字段写错       |
| **支持主键自动生成**   | 支持多达 4 种主键策略（内含分布式唯一 ID 生成器）              |
| **内置分页插件**       | 基于 MyBatis 物理分页，配置好插件后即可使用                    |
| **逻辑删除**           | 支持逻辑删除，自动处理删除标记                                 |
| **自动填充**           | 支持字段自动填充，如创建时间、更新时间等                       |
| **乐观锁**             | 支持乐观锁，解决并发更新问题                                   |

## 目录

1. [快速入门](#快速入门)
2. [主键策略](#主键策略)
3. [条件构造器和常用接口](#条件构造器和常用接口)
4. [查询与分页](#查询与分页)
5. [删除与逻辑删除](#删除与逻辑删除)
6. [自动填充和乐观锁](#自动填充和乐观锁)
7. [代码生成器](#代码生成器)
8. [性能分析插件](#性能分析插件)

---

## 快速入门

### 初始化数据库

```sql
CREATE DATABASE mybatis_plus DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE mybatis_plus;

CREATE TABLE user (
    id BIGINT(20) NOT NULL COMMENT '主键ID',
    name VARCHAR(30) DEFAULT NULL COMMENT '姓名',
    age INT(11) DEFAULT NULL COMMENT '年龄',
    email VARCHAR(50) DEFAULT NULL COMMENT '邮箱',
    create_time DATETIME DEFAULT NULL COMMENT '创建时间',
    update_time DATETIME DEFAULT NULL COMMENT '更新时间',
    version INT(11) DEFAULT 1 COMMENT '版本号（乐观锁）',
    deleted INT(11) DEFAULT 0 COMMENT '逻辑删除标记（0未删除，1已删除）',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

INSERT INTO user (id, name, age, email, create_time, update_time) VALUES
(1, 'Jone', 18, 'test1@baomidou.com', NOW(), NOW()),
(2, 'Jack', 20, 'test2@baomidou.com', NOW(), NOW()),
(3, 'Tom', 28, 'test3@baomidou.com', NOW(), NOW()),
(4, 'Sandy', 21, 'test4@baomidou.com', NOW(), NOW()),
(5, 'Billie', 24, 'test5@baomidou.com', NOW(), NOW());
```

### 创建项目

#### Maven 依赖

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.7.18</version>
        <relativePath/>
    </parent>

    <groupId>com.xiaoye</groupId>
    <artifactId>mybatis-plus-demo</artifactId>
    <version>1.0.0</version>
    <name>mybatis-plus-demo</name>
    <description>MyBatis-Plus Demo Project</description>

    <properties>
        <java.version>1.8</java.version>
        <mybatis-plus.version>3.5.12</mybatis-plus.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- MyBatis-Plus -->
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-boot-starter</artifactId>
            <version>${mybatis-plus.version}</version>
        </dependency>

        <!-- MySQL Driver -->
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

> **注意**：引入 MyBatis-Plus 之后不要再次引入 MyBatis，以避免因版本差异导致的问题。

#### 配置文件

**application.yml**：

```yaml
server:
  port: 8080

spring:
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://localhost:3306/mybatis_plus?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true
    username: root
    password: root1234

mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
    map-underscore-to-camel-case: true
  global-config:
    db-config:
      id-type: assign_id
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0
  mapper-locations: classpath:mapper/*.xml
```

**配置说明**：

| 配置项                         | 说明             |
| ------------------------------ | ---------------- |
| `log-impl`                     | SQL 日志输出实现 |
| `map-underscore-to-camel-case` | 开启驼峰命名转换 |
| `id-type`                      | 全局主键策略     |
| `logic-delete-field`           | 逻辑删除字段     |
| `logic-delete-value`           | 逻辑已删除值     |
| `logic-not-delete-value`       | 逻辑未删除值     |

#### 启动类

```java
package com.xiaoye.mybatisplus;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.xiaoye.mybatisplus.mapper")
public class MybatisPlusDemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(MybatisPlusDemoApplication.class, args);
    }
}
```

#### 实体类

```java
package com.xiaoye.mybatisplus.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("user")
public class User implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String name;

    private Integer age;

    private String email;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    @Version
    @TableField(fill = FieldFill.INSERT)
    private Integer version;

    @TableLogic
    @TableField(fill = FieldFill.INSERT)
    private Integer deleted;
}
```

**注解说明**：

| 注解          | 说明                                  |
| ------------- | ------------------------------------- |
| `@TableName`  | 指定表名                              |
| `@TableId`    | 指定主键，`type` 设置主键策略         |
| `@TableField` | 指定字段映射，`fill` 设置自动填充策略 |
| `@Version`    | 乐观锁注解                            |
| `@TableLogic` | 逻辑删除注解                          |

#### Mapper 接口

```java
package com.xiaoye.mybatisplus.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xiaoye.mybatisplus.entity.User;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {
}
```

> **说明**：继承 `BaseMapper<T>` 后，无需编写 XML 文件即可使用 CRUD 方法。

#### 测试类

```java
package com.xiaoye.mybatisplus;

import com.xiaoye.mybatisplus.entity.User;
import com.xiaoye.mybatisplus.mapper.UserMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

@SpringBootTest
class MybatisPlusDemoApplicationTests {

    @Autowired
    private UserMapper userMapper;

    @Test
    void testSelectAll() {
        List<User> users = userMapper.selectList(null);
        users.forEach(System.out::println);
    }
}
```

**输出结果**：

```
==>  Preparing: SELECT id,name,age,email,create_time,update_time,version,deleted FROM user WHERE deleted=0
==> Parameters:
<==    Columns: id, name, age, email, create_time, update_time, version, deleted
<==        Row: 1, Jone, 18, test1@baomidou.com, 2024-01-01 10:00:00, 2024-01-01 10:00:00, 1, 0
<==        Row: 2, Jack, 20, test2@baomidou.com, 2024-01-01 10:00:00, 2024-01-01 10:00:00, 1, 0
...
```

---

## 主键策略

MyBatis-Plus 提供了多种主键生成策略，通过 `@TableId` 注解的 `type` 属性指定。

### 主键策略类型

| 策略          | 说明                              | 适用场景                 |
| ------------- | --------------------------------- | ------------------------ |
| `ASSIGN_ID`   | 雪花算法生成 Long 类型 ID（默认） | 分布式系统、单机系统     |
| `ASSIGN_UUID` | 生成 UUID（32位字符串，无中划线） | 需要字符串主键的场景     |
| `AUTO`        | 数据库自增                        | 单机系统、数据库支持自增 |
| `INPUT`       | 用户手动输入                      | 需要自定义主键的场景     |
| `NONE`        | 无状态，跟随全局配置              | 使用全局配置             |

### 雪花算法详解

雪花算法（Snowflake）是 Twitter 公布的分布式主键生成算法，核心思想：

```
0 - 41位时间戳 - 10位机器ID - 12位序列号

┌─────────────────────────────────────────────────────────────┐
│ 1位 │      41位时间戳       │  10位机器ID  │   12位序列号   │
│符号位│  （毫秒级时间戳）     │（5位数据中心+5位机器）│（毫秒内计数）│
└─────────────────────────────────────────────────────────────┘
```

**特点**：

- 全局唯一
- 趋势递增
- 高性能（单机每秒可生成 400 万个 ID）
- 不依赖数据库

**时间计算**：41 位时间戳可使用约 69 年

### 使用示例

```java
@Data
public class User {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private String name;
}

@Data
public class Order {
    @TableId(type = IdType.ASSIGN_UUID)
    private String id;
    private String orderNo;
}

@Data
public class Product {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
}
```

### 全局配置

```yaml
mybatis-plus:
  global-config:
    db-config:
      id-type: assign_id
```

### 注意事项

1. `ASSIGN_ID` 策略要求实体类主键类型为 `Long` 或 `String`
2. `AUTO` 策略要求数据库表设置主键自增
3. `INPUT` 策略需要手动设置主键值
4. 优先级：局部注解 > 全局配置 > 默认策略

---

## 条件构造器和常用接口

### Wrapper 继承体系

```
Wrapper（抽象类）
└── AbstractWrapper（条件封装抽象类）
    ├── QueryWrapper（查询条件封装）
    ├── UpdateWrapper（更新条件封装）
    └── AbstractLambdaWrapper（Lambda 语法）
        ├── LambdaQueryWrapper（Lambda 查询）
        └── LambdaUpdateWrapper（Lambda 更新）
```

### QueryWrapper 常用方法

#### 比较操作

```java
@SpringBootTest
class QueryWrapperTest {

    @Autowired
    private UserMapper userMapper;

    @Test
    void testComparison() {
        QueryWrapper<User> wrapper = new QueryWrapper<>();

        wrapper.ge("age", 18)
               .lt("age", 30)
               .isNotNull("email");

        List<User> users = userMapper.selectList(wrapper);
        users.forEach(System.out::println);
    }
}
```

**比较方法对照表**：

| 方法         | SQL           | 说明     |
| ------------ | ------------- | -------- |
| `eq`         | `=`           | 等于     |
| `ne`         | `<>`          | 不等于   |
| `gt`         | `>`           | 大于     |
| `ge`         | `>=`          | 大于等于 |
| `lt`         | `<`           | 小于     |
| `le`         | `<=`          | 小于等于 |
| `between`    | `BETWEEN`     | 区间     |
| `notBetween` | `NOT BETWEEN` | 不在区间 |
| `isNull`     | `IS NULL`     | 为空     |
| `isNotNull`  | `IS NOT NULL` | 不为空   |

#### 模糊查询

```java
@Test
void testLike() {
    QueryWrapper<User> wrapper = new QueryWrapper<>();

    wrapper.like("name", "张")
           .likeRight("email", "test")
           .notLike("name", "admin");

    List<User> users = userMapper.selectList(wrapper);
}
```

**模糊查询方法**：

| 方法        | SQL               | 示例                              |
| ----------- | ----------------- | --------------------------------- |
| `like`      | `LIKE '%值%'`     | `like("name", "张")` → `%张%`     |
| `notLike`   | `NOT LIKE '%值%'` | `notLike("name", "张")`           |
| `likeLeft`  | `LIKE '%值'`      | `likeLeft("name", "张")` → `%张`  |
| `likeRight` | `LIKE '值%'`      | `likeRight("name", "张")` → `张%` |

#### 范围查询

```java
@Test
void testIn() {
    QueryWrapper<User> wrapper = new QueryWrapper<>();

    wrapper.in("age", Arrays.asList(18, 20, 22))
           .notIn("id", 1, 2, 3)
           .inSql("id", "SELECT id FROM user WHERE age > 25");

    List<User> users = userMapper.selectList(wrapper);
}
```

#### 排序

```java
@Test
void testOrderBy() {
    QueryWrapper<User> wrapper = new QueryWrapper<>();

    wrapper.orderByDesc("age")
           .orderByAsc("id")
           .last("LIMIT 10");

    List<User> users = userMapper.selectList(wrapper);
}
```

#### 逻辑组合

```java
@Test
void testLogic() {
    QueryWrapper<User> wrapper = new QueryWrapper<>();

    wrapper.eq("name", "张三")
           .and(w -> w.gt("age", 20).or().isNotNull("email"));

    List<User> users = userMapper.selectList(wrapper);
}
```

**生成的 SQL**：

```sql
SELECT * FROM user
WHERE name = '张三' AND (age > 20 OR email IS NOT NULL)
```

#### 指定查询字段

```java
@Test
void testSelect() {
    QueryWrapper<User> wrapper = new QueryWrapper<>();

    wrapper.select("id", "name", "age")
           .gt("age", 18);

    List<User> users = userMapper.selectList(wrapper);
}
```

### UpdateWrapper

```java
@Test
void testUpdateWrapper() {
    UpdateWrapper<User> wrapper = new UpdateWrapper<>();

    wrapper.eq("name", "张三")
           .set("age", 25)
           .set("email", "zhangsan@example.com")
           .setSql("update_time = NOW()");

    int rows = userMapper.update(null, wrapper);
    System.out.println("影响行数：" + rows);
}
```

**生成的 SQL**：

```sql
UPDATE user
SET age = 25, email = 'zhangsan@example.com', update_time = NOW()
WHERE name = '张三' AND deleted = 0
```

### LambdaWrapper

使用 Lambda 表达式避免字段名硬编码，提高代码可维护性：

```java
@Test
void testLambdaQueryWrapper() {
    LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();

    wrapper.eq(User::getName, "张三")
           .gt(User::getAge, 20)
           .likeRight(User::getEmail, "test")
           .orderByDesc(User::getCreateTime);

    List<User> users = userMapper.selectList(wrapper);
}

@Test
void testLambdaUpdateWrapper() {
    LambdaUpdateWrapper<User> wrapper = new LambdaUpdateWrapper<>();

    wrapper.eq(User::getName, "张三")
           .set(User::getAge, 25)
           .set(User::getEmail, "zhangsan@example.com");

    int rows = userMapper.update(null, wrapper);
}
```

### BaseMapper 常用方法

| 方法                                                        | 说明              | 参数            |
| ----------------------------------------------------------- | ----------------- | --------------- |
| `insert(T entity)`                                          | 插入一条记录      | 实体对象        |
| `deleteById(Serializable id)`                               | 根据 ID 删除      | 主键 ID         |
| `deleteByMap(Map<String, Object> columnMap)`                | 根据 map 条件删除 | 字段条件 map    |
| `delete(Wrapper<T> wrapper)`                                | 根据条件删除      | 条件构造器      |
| `updateById(T entity)`                                      | 根据 ID 更新      | 实体对象        |
| `update(T entity, Wrapper<T> wrapper)`                      | 根据条件更新      | 实体 + 条件     |
| `selectById(Serializable id)`                               | 根据 ID 查询      | 主键 ID         |
| `selectBatchIds(Collection<? extends Serializable> idList)` | 批量 ID 查询      | ID 集合         |
| `selectByMap(Map<String, Object> columnMap)`                | 根据 map 查询     | 字段条件 map    |
| `selectOne(Wrapper<T> queryWrapper)`                        | 查询一条记录      | 条件构造器      |
| `selectList(Wrapper<T> queryWrapper)`                       | 查询列表          | 条件构造器      |
| `selectCount(Wrapper<T> queryWrapper)`                      | 查询总数          | 条件构造器      |
| `selectMaps(Wrapper<T> queryWrapper)`                       | 查询返回 Map      | 条件构造器      |
| `selectPage(IPage<T> page, Wrapper<T> queryWrapper)`        | 分页查询          | 分页对象 + 条件 |

---

## 查询与分页

### 批量 ID 查询

```java
@Test
void testSelectBatchIds() {
    List<User> users = userMapper.selectBatchIds(Arrays.asList(1L, 2L, 3L));
    users.forEach(System.out::println);
}
```

**生成的 SQL**：

```sql
SELECT * FROM user WHERE id IN (1, 2, 3) AND deleted = 0
```

### Map 条件查询

```java
@Test
void testSelectByMap() {
    Map<String, Object> columnMap = new HashMap<>();
    columnMap.put("name", "Jack");
    columnMap.put("age", 20);

    List<User> users = userMapper.selectByMap(columnMap);
}
```

> **注意**：Map 中的 key 对应数据库字段名，不是实体类属性名。

### 分页查询

#### 配置分页插件

```java
package com.xiaoye.mybatisplus.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MybatisPlusConfig {

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }
}
```

#### 分页查询示例

```java
@Test
void testPage() {
    Page<User> page = new Page<>(1, 3);

    LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
    wrapper.gt(User::getAge, 18)
           .orderByDesc(User::getCreateTime);

    Page<User> userPage = userMapper.selectPage(page, wrapper);

    System.out.println("当前页码：" + userPage.getCurrent());
    System.out.println("每页大小：" + userPage.getSize());
    System.out.println("总记录数：" + userPage.getTotal());
    System.out.println("总页数：" + userPage.getPages());
    System.out.println("当前页数据：" + userPage.getRecords());
}
```

**生成的 SQL**：

```sql
-- 查询总数
SELECT COUNT(*) FROM user WHERE age > 18 AND deleted = 0

-- 查询数据
SELECT * FROM user WHERE age > 18 AND deleted = 0 ORDER BY create_time DESC LIMIT 3
```

#### 自定义分页

```java
// Mapper 接口
@Mapper
public interface UserMapper extends BaseMapper<User> {

    @Select("SELECT * FROM user WHERE age > #{minAge} AND deleted = 0")
    IPage<User> selectPageByMinAge(Page<User> page, @Param("minAge") Integer minAge);
}

// 测试
@Test
void testCustomPage() {
    Page<User> page = new Page<>(1, 3);
    IPage<User> userPage = userMapper.selectPageByMinAge(page, 18);

    System.out.println("总记录数：" + userPage.getTotal());
    System.out.println("当前页数据：" + userPage.getRecords());
}
```

---

## 删除与逻辑删除

### 物理删除

```java
@Test
void testDelete() {
    int rows = userMapper.deleteById(1L);
    System.out.println("影响行数：" + rows);
}

@Test
void testDeleteBatchIds() {
    int rows = userMapper.deleteBatchIds(Arrays.asList(1L, 2L, 3L));
    System.out.println("影响行数：" + rows);
}

@Test
void testDeleteByMap() {
    Map<String, Object> columnMap = new HashMap<>();
    columnMap.put("name", "张三");
    columnMap.put("age", 20);

    int rows = userMapper.deleteByMap(columnMap);
    System.out.println("影响行数：" + rows);
}
```

### 逻辑删除

逻辑删除是将记录标记为"已删除"状态，而不是真正从数据库中删除。

#### 配置逻辑删除

```yaml
mybatis-plus:
  global-config:
    db-config:
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0
```

#### 实体类配置

```java
@Data
public class User {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String name;

    @TableLogic
    private Integer deleted;
}
```

#### 逻辑删除测试

```java
@Test
void testLogicDelete() {
    int rows = userMapper.deleteById(1L);
    System.out.println("影响行数：" + rows);
}
```

**生成的 SQL**：

```sql
UPDATE user SET deleted = 1 WHERE id = 1 AND deleted = 0
```

#### 查询自动过滤

逻辑删除后，查询会自动过滤已删除记录：

```java
@Test
void testSelectAfterDelete() {
    List<User> users = userMapper.selectList(null);
}
```

**生成的 SQL**：

```sql
SELECT * FROM user WHERE deleted = 0
```

---

## 自动填充和乐观锁

### 自动填充

自动填充用于自动设置创建时间、更新时间等字段。

#### 实现元对象处理器

```java
package com.xiaoye.mybatisplus.handler;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class MyMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        this.strictInsertFill(metaObject, "createTime", LocalDateTime.class, LocalDateTime.now());
        this.strictInsertFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
        this.strictInsertFill(metaObject, "version", Integer.class, 1);
        this.strictInsertFill(metaObject, "deleted", Integer.class, 0);
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
    }
}
```

#### 实体类配置

```java
@Data
public class User {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String name;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    @Version
    @TableField(fill = FieldFill.INSERT)
    private Integer version;

    @TableLogic
    @TableField(fill = FieldFill.INSERT)
    private Integer deleted;
}
```

### 乐观锁

乐观锁用于解决并发更新问题，通过版本号机制实现。

#### 配置乐观锁插件

```java
@Configuration
public class MybatisPlusConfig {

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new OptimisticLockerInnerInterceptor());
        return interceptor;
    }
}
```

#### 实体类配置

```java
@Data
public class User {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String name;

    @Version
    private Integer version;
}
```

#### 乐观锁测试

```java
@Test
void testOptimisticLock() {
    User user = userMapper.selectById(1L);
    user.setName("张三");

    int rows = userMapper.updateById(user);
    System.out.println("更新结果：" + (rows > 0 ? "成功" : "失败"));
}
```

**生成的 SQL**：

```sql
UPDATE user
SET name = '张三', version = 2, update_time = NOW()
WHERE id = 1 AND version = 1 AND deleted = 0
```

#### 并发更新测试

```java
@Test
void testConcurrentUpdate() {
    User user1 = userMapper.selectById(1L);
    User user2 = userMapper.selectById(1L);

    user1.setName("张三");
    user2.setName("李四");

    int rows1 = userMapper.updateById(user1);
    int rows2 = userMapper.updateById(user2);

    System.out.println("用户1更新：" + (rows1 > 0 ? "成功" : "失败"));
    System.out.println("用户2更新：" + (rows2 > 0 ? "成功" : "失败"));
}
```

**输出结果**：

```
用户1更新：成功
用户2更新：失败
```

---

## 代码生成器

MyBatis-Plus 提供代码生成器，可快速生成 Entity、Mapper、Service、Controller 等代码。

### 添加依赖

```xml
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-generator</artifactId>
    <version>3.5.12</version>
</dependency>

<dependency>
    <groupId>org.apache.velocity</groupId>
    <artifactId>velocity-engine-core</artifactId>
    <version>2.3</version>
</dependency>
```

### 代码生成器配置

```java
package com.xiaoye.mybatisplus.generator;

import com.baomidou.mybatisplus.generator.FastAutoGenerator;
import com.baomidou.mybatisplus.generator.config.OutputFile;
import com.baomidou.mybatisplus.generator.config.rules.DbColumnType;
import com.baomidou.mybatisplus.generator.engine.VelocityTemplateEngine;

import java.sql.Types;
import java.util.Collections;

public class CodeGenerator {

    public static void main(String[] args) {
        String url = "jdbc:mysql://localhost:3306/mybatis_plus?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai";
        String username = "root";
        String password = "root1234";
        String moduleName = "system";
        String mapperLocation = "/src/main/resources/mapper/" + moduleName;

        FastAutoGenerator.create(url, username, password)
            .globalConfig(builder -> {
                builder.author("xiaoye")
                       .outputDir(System.getProperty("user.dir") + "/src/main/java")
                       .enableSwagger();
            })
            .packageConfig(builder -> {
                builder.parent("com.xiaoye.mybatisplus")
                       .moduleName(moduleName)
                       .pathInfo(Collections.singletonMap(
                           OutputFile.xml,
                           System.getProperty("user.dir") + mapperLocation
                       ));
            })
            .strategyConfig(builder -> {
                builder.addInclude("user")
                       .addTablePrefix("t_", "sys_")
                       .entityBuilder()
                           .enableLombok()
                           .enableTableFieldAnnotation()
                       .controllerBuilder()
                           .enableRestStyle()
                       .mapperBuilder()
                           .enableMapperAnnotation();
            })
            .templateEngine(new VelocityTemplateEngine())
            .execute();
    }
}
```

---

## 性能分析插件

MyBatis-Plus 提供性能分析插件，用于输出每条 SQL 语句及其执行时间。

### 配置性能分析插件

```java
@Configuration
public class MybatisPlusConfig {

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        interceptor.addInnerInterceptor(new OptimisticLockerInnerInterceptor());
        return interceptor;
    }
}
```

### SQL 日志配置

```yaml
mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

### P6Spy 性能分析

#### 添加依赖

```xml
<dependency>
    <groupId>p6spy</groupId>
    <artifactId>p6spy</artifactId>
    <version>3.9.1</version>
</dependency>
```

#### 配置数据源

```yaml
spring:
  datasource:
    driver-class-name: com.p6spy.engine.spy.P6SpyDriver
    url: jdbc:p6spy:mysql://localhost:3306/mybatis_plus?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai
```

#### 配置 spy.properties

```properties
modulelist=com.p6spy.engine.logging.P6LogFactory,com.p6spy.engine.outage.P6OutageFactory
logMessageFormat=com.baomidou.mybatisplus.extension.p6spy.P6SpyLogger
appender=com.baomidou.mybatisplus.extension.p6spy.StdoutLogger
databaseDialectDateFormat=yyyy-MM-dd HH:mm:ss
outagedetection=true
outagedetectioninterval=1
```

---

## 最佳实践

### 1. 合理使用 Wrapper

- 简单查询使用 `QueryWrapper` 或 `LambdaQueryWrapper`
- 复杂查询建议使用自定义 SQL
- 避免过度链式调用导致代码难以阅读

### 2. 索引优化

```java
@TableName("user")
public class User {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    @TableIndex(value = "idx_user_name", type = IndexType.UNIQUE)
    private String userName;
}
```

### 3. 批量操作优化

```java
@Test
void testBatchInsert() {
    List<User> users = new ArrayList<>();
    for (int i = 0; i < 1000; i++) {
        User user = new User();
        user.setName("用户" + i);
        users.add(user);
    }

    saveBatch(users, 500);
}
```

### 4. 避免 N+1 问题

```java
@Mapper
public interface UserMapper extends BaseMapper<User> {

    @Select("SELECT u.*, o.id as order_id, o.order_no " +
            "FROM user u LEFT JOIN orders o ON u.id = o.user_id " +
            "WHERE u.id = #{userId}")
    @Results({
        @Result(property = "id", column = "id"),
        @Result(property = "orders", column = "id",
                many = @Many(select = "com.xiaoye.mybatisplus.mapper.OrderMapper.selectByUserId"))
    })
    User selectUserWithOrders(@Param("userId") Long userId);
}
```

### 5. 事务控制

```java
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    @Transactional(rollbackFor = Exception.class)
    public void saveUserWithOrders(User user, List<Order> orders) {
        save(user);
        orderService.saveBatch(orders);
    }
}
```

---

## 常见问题

### 1. 字段映射问题

**问题**：数据库字段 `user_name` 无法映射到实体类属性 `userName`

**解决**：配置驼峰命名转换

```yaml
mybatis-plus:
  configuration:
    map-underscore-to-camel-case: true
```

### 2. 主键生成问题

**问题**：使用 `ASSIGN_ID` 策略时，ID 过长

**解决**：实体类主键类型使用 `Long` 而非 `Integer`

### 3. 分页不生效

**问题**：分页查询返回全部数据

**解决**：检查是否配置了分页插件

```java
@Bean
public MybatisPlusInterceptor mybatisPlusInterceptor() {
    MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
    interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
    return interceptor;
}
```

### 4. 逻辑删除不生效

**问题**：逻辑删除后仍能查询到数据

**解决**：检查实体类是否添加 `@TableLogic` 注解，全局配置是否正确

---

## 参考资料

- [MyBatis-Plus 官方文档](https://baomidou.com/)
- [MyBatis-Plus GitHub](https://github.com/baomidou/mybatis-plus)
- [MyBatis 官方文档](https://mybatis.org/mybatis-3/)

## 版本差异(旧版 3.5.5 → 3.5.x)

| 特性 | 旧版（本文编写时） | 当前 3.5.x（如 3.5.12） |
|------|--------------------|------------------------|
| JDK 版本 | 示例为 java.version 1.8 | 推荐 JDK 17/21（Boot 3 要求 JDK 17+） |
| 依赖坐标 | mybatis-plus-boot-starter（Boot 2.x 时代） | Spring Boot 3.x 必须改用 mybatis-plus-spring-boot3-starter |
| 代码生成器 | mybatis-plus-generator 3.5.5 | 3.5.12；主推 FastAutoGenerator |
| 虚拟线程 | 无特殊处理 | 3.5.9+ 优化虚拟线程环境兼容 |
| 分页/逻辑删除/乐观锁 | 本文各章节示例 | 用法完全兼容，可直接升级 |

> 本文完整教程基于 Boot 2.x 时代写法：若要在 Spring Boot 3.5.x 中使用，请将依赖替换为 `mybatis-plus-spring-boot3-starter`（jakarta 命名空间），并将 java.version 提升到 17+；其余 API（Wrapper、分页插件、逻辑删除等）无需修改。
