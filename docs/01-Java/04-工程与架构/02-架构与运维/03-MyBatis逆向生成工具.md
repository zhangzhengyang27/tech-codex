---
title: "MyBatis逆向生成工具"
description: "MyBatis 逆向生成与通用 Mapper 工具介绍：mybatis-generator（官方逆向工具）与 tk.mybatis 通用 Mapper（按注解映射表结构、提供通用 CRUD、Example 动态查询），含依赖引入、@Table/@Id/@Column 常用注解与 Spring Boot 集成示例，以及迁移到 MyBatis-Plus 的版本建议。"
keywords: [MyBatis, mybatis-generator, tk.mybatis, 逆向生成, 通用Mapper]
category: "Java"
tags: [Java, 架构与运维]
---


# MyBatis 逆向生成工具

## mybatis-generator

mybatis-generator 是 MyBatis 官方的逆向工程工具：连接数据库读取表结构后，自动生成实体类、Mapper 接口与 XML 映射文件。社区常见的组合方式是在生成器配置中集成通用 Mapper 提供的 MyMapper 插件，让生成的接口直接继承通用 CRUD 能力。


## tk.mybatis

`tk.mybatis` 是一个用于简化 MyBatis 使用的 Java 库，它通过提供一些方便的工具类和注解，使得 MyBatis 的配置和使用更加简洁和高效。该库最常用的模块是 `tk.mybatis.mapper`，它提供了通用 Mapper 功能，可以大大简化 CRUD 操作

1. **通用 Mapper**：提供通用的 CRUD 方法，减少重复代码
2. **简单配置**：通过注解和少量配置即可实现复杂的功能
3. **支持多种数据库**：兼容多种关系型数据库
4. **扩展性强**：支持 MyBatis 原生功能的扩展和自定义

### 快速开始

> **版本提示**：`tk.mybatis`（通用 Mapper）已停止维护，`mapper-spring-boot-starter` 2.1.5 仅适配 Spring Boot 1.x/2.x（javax），**不兼容 Boot 3.x**。Boot 3.x 项目可选方案：MyBatis-Plus（推荐，含代码生成器）、mybatis-generator 1.4.x（官方逆向工具）；本文保留 tk.mybatis 作为历史参考。

在 Maven 项目中添加 `tk.mybatis` 依赖：

```xml
<dependency>
    <groupId>tk.mybatis</groupId>
    <artifactId>mapper-spring-boot-starter</artifactId>
    <version>2.1.5</version>
</dependency>
```

在 `application.properties` 或 `application.yml` 中配置数据库连接和 MyBatis 设置

**`application.yml` 示例：**

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/yourdatabase
    username: root
    password: password
    driver-class-name: com.mysql.cj.jdbc.Driver

mybatis:
  mapper-locations: classpath:mapper/*.xml
  type-aliases-package: com.xiaoye.pojo
  
# mybatis mapper 配置
mapper:
  mappers: com.xiaoye.my.mapper.MyMapper
  not-empty: false    # 在进行数据库操作的的时候，判断表达式 username != null, 是否追加 username != ''
  identity: MYSQL
```

创建一个实体类并使用 `@Table` 注解来指定数据库表名

```java
import javax.persistence.Id;
import javax.persistence.Table;

@Table(name = "user")
public class User {
    @Id
    private Long id;
    private String username;
    private String password;

    // Getters and Setters
}
```

创建一个继承 `tk.mybatis.mapper.common.Mapper` 的 Mapper 接口。

```java
import tk.mybatis.mapper.common.Mapper;

public interface UserMapper extends Mapper<User> {
}
```

在 Spring Boot 应用的启动类上加上 `@MapperScan` 注解，指定 Mapper 接口所在的包。

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import tk.mybatis.spring.annotation.MapperScan;

@SpringBootApplication
@MapperScan(basePackages = "com.xiaoye.mapper")
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

### 常用注解

- **`@Table`**：指定实体类对应的数据库表
- **`@Id`**：指定主键字段
- **`@Column`**：指定实体类字段对应的数据库列 

### 高级用法

#### 自定义通用 Mapper 方法

如果通用 Mapper 提供的方法不能满足需求，可以自定义 Mapper 接口方法。

```java
import org.apache.ibatis.annotations.Select;
import java.util.List;

public interface UserMapper extends Mapper<User> {
    @Select("SELECT * FROM user WHERE username = #{username}")
    List<User> findByUsername(String username);
}
```

#### 使用 Example 查询

`tk.mybatis` 提供了 `Example` 类，用于构建动态查询条件

```java
import tk.mybatis.mapper.entity.Example;
import java.util.List;

public List<User> findUsersByUsername(String username) {
    Example example = new Example(User.class);
    example.createCriteria().andEqualTo("username", username);
    // 相当于 SELECT * FROM user WHERE username = ?
    return userMapper.selectByExample(example);
}
```

## 版本差异(tk.mybatis / mybatis-generator → 当前)

| 特性 | 旧版（tk.mybatis 2.1.5 / mybatis-generator 1.3.x） | 当前推荐 |
|------|----------------------------------------------------|----------|
| 维护状态 | tk.mybatis 已停止维护 | MyBatis-Plus 3.5.12（活跃）；mybatis-generator 1.4.x |
| Boot 3 兼容 | 不兼容（javax） | MyBatis-Plus 用 mybatis-plus-spring-boot3-starter |
| 代码生成 | XML 配置 + Java 插件 | FastAutoGenerator（MyBatis-Plus 内置，零配置） |
| 通用 Mapper | tk.mybatis.mapper | MyBatis-Plus BaseMapper（内含 CRUD/分页） |
| JDK | 8 | 17/21 |

> 逆向生成思路（连接数据库 → 读取表结构 → 生成实体/Mapper/XML）不变，工具推荐迁移到 MyBatis-Plus 的 FastAutoGenerator 或 mybatis-generator 1.4.x。