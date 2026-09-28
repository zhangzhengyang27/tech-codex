---
title: "mybatis高级查询"
description: "MyBatis 高级查询：ResultMap 手动映射、多条件查询的三种参数传递方式（arg/param、@Param、POJO）、#{} 与 ${} 的区别、返回主键（useGeneratedKeys/selectKey）与动态 SQL（if/set/foreach）。"
keywords: [mybatis高级查询]
category: "Java"
tags: [Java, SSM]
---


# Mybatis-高级查询

## ResultMap 属性

建立对象关系映射

- resultType  如果实体的属性名与表中字段名一致，将查询结果自动封装到实体类中

- resultMap  如果实体的属性名与表中字段名不一致，可以使用 resultMap 实现手动封装到实体类中

编写 UserMapper 接口

```java
public interface UserMapper { 
  public List<User> findAllResultMap(); 
}
```

编写 UserMapper.xml

```xml
<!--id : 标签的唯一标识 type: 封装后实体类型-->
<resultMap id="userResultMap" type="com.lagou.domain.User">
  <!--手动配置映射关系-->
  <!--id: 用来配置主键-->
  <id property="id" column="id"></id>
  <!--column:是表中的数据  property: 实体类里面的数据;  result: 表中普通字段的封装-->
  <result property="username" column="username"></result>
  <result property="birthday" column="birthday"></result>
  <result property="sex" column="sex"></result>
  <result property="address" column="address"></result>
</resultMap>

<!--查询所有用户-->
<!--resultMap：手动配置实体属性与表中字段的映射关系，完成手动封装-->
<select id="findAllResultMap" resultMap="userResultMap">
  select * from user
</select>
```

代码测试

```java
@Test 
public void testFindAllResultMap() throws Exception { 
  UserMapper userMapper = sqlSession.getMapper(UserMapper.class); 
  List<User> list = userMapper.findAllResultMap(); 
  for (User user : list) { 
    System.out.println(user); 
  } 
}
```

## 多条件查询（三种）

需求: 根据 id 和 username 查询 user 表

### arg 或 param

使用 `#{arg0}-#{arg1}` 或者 `#{param1}-#{paramn}` 获取参数

**UserMapper 接口**

```java
public interface UserMapper { 
  public List<User> findByIdAndUsername1(Integer id, String username); 
}
```

**UserMapper.xml**

```xml
<select id="findByIdAndUsername1" resultMap="userResultMap">
   <!-- select * from user where id = #{arg0} and username = #{arg1}-->
   select * from user where id = #{param1} and username = #{param2}
</select>
```

**测试**

```java
@Test 
public void testFindByIdAndUsername() throws Exception { 
  UserMapper userMapper = sqlSession.getMapper(UserMapper.class); 
  List<User> list = userMapper.findByIdAndUsername1(1 , "子慕"); 
  System.out.println(list); 
}
```

### 注解 @Param 获取参数

**UserMapper接口**

```java
public interface UserMapper { 
  public List<User> findByIdAndUsername2(@Param("id") Integer id,@Param("username") String username); 
}
```

**UserMapper.xml**

```xml
<mapper namespace="com.lagou.mapper.UserMapper"> 
  <select id="findByIdAndUsername2" resultType="user"> 
    select * from user where id = #{id} and username = #{username} 
  </select> 
</mapper>
```

**测试**

```java
@Test 
public void testFindByIdAndUsername() throws Exception { 
  UserMapper userMapper = sqlSession.getMapper(UserMapper.class); 
  List<User> list = userMapper.findByIdAndUsername2(1, "子慕"); 
  System.out.println(list); 
}
```

### 使用 pojo 对象(推荐)

使用 pojo 对象传递参数,传入实体对象

**UserMapper**

```java
public interface UserMapper { 
  public List<User> findByIdAndUsername3(User user); 
}
```

**UserMapper.xml**

**添加** parameterType 属性

```xml
<mapper namespace="com.lagou.mapper.UserMapper"> 
  <select id="findByIdAndUsername3" parameterType="com.lagou.domain.User" resultType="com.lagou.domain.User"> 						select * from user where id = #{id} and username = #{username} 
  </select> 
</mapper>
```

**测试**

```java
@Test 
public void testFindByIdAndUsername() throws Exception { 
  UserMapper userMapper = sqlSession.getMapper(UserMapper.class); 
  User param = new User(); 
  param.setId(1); 
  param.setUsername("子慕"); 
  List<User> list = userMapper.findByIdAndUsername3(param); 
  System.out.println(list); 
}
```

## 模糊查询

需求: 根据 username 模糊查询 user 表

### 方式一 #{}

**UserMapper接口**

```java
public interface UserMapper { 
  public List<User> findByUsername1(String username); 
}
```

**UserMapper.xml**

```xml
<!--参数是基本数据类型，而且参数只有一个，名称可以随便写-->
<mapper namespace="com.lagou.mapper.UserMapper"> 
  <select id="findByUsername1" parameterType="string" resultType="user">
    select * from user where username like #{username} 
  </select> 
</mapper>
```

**测试**

```java
@Test 
public void testFindByUsername() throws Exception { 
  UserMapper userMapper = sqlSession.getMapper(UserMapper.class); 
  List<User> list = userMapper.findByUsername1("%王%"); 
  for (User user : list) { 
    System.out.println(user); 
  } 
}
```

### 方式二 ${}

**UserMapper接口**

```java
public interface UserMapper { 
  public List<User> findByUsername2(String username); 
}
```

**UserMapper.xml**

```xml
<mapper namespace="com.lagou.mapper.UserMapper"> 
  <!--不推荐使用，因为会出现sql注入问题--> 
  <select id="findByUsername2" parameterType="string" resultType="user"> 
    select * from user where username like '${value}' 
  </select> 
</mapper>
```

**测试**

```java
@Test 
public void testFindByUsername() throws Exception { 
  UserMapper userMapper = sqlSession.getMapper(UserMapper.class); 
  List<User> list = userMapper.findByUsername2("%王%"); 
  for (User user : list) { 
    System.out.println(user); 
  } 
}
```

### ${} 与 #{} 区别【笔试题】

`#{}`  :表示一个占位符号

- 通过 `#{}`  可以实现 preparedStatement 向占位符中设置值，自动进行 java 类型和 jdbc 类型转换，`#{} ` 可以有效防止 sql 注入

- `#{}`  可以接收简单类型值或 pojo 属性值

- 如果 parameterType 传输单个简单类型值， `#{}`  括号中名称随便写

${} :表示拼接 sql 串

- 通过 ${} 可以将 parameterType 传入的内容拼接在 sql 中且不进行 jdbc 类型转换，会出现 sql 注入问题

- ${} 可以接收简单类型值或 pojo 属性值

- 如果 parameterType 传输单个简单类型值， ${} 括号中只能是 value

补充：TextSqlNode.java 源码可以证明

## 返回主键

我们很多时候有这种需求，向数据库插入一条记录后，希望能立即拿到这条记录在数据库中的主键值

### 方法一 useGeneratedKeys

```java
public interface UserMapper {
    // 返回主键
    public void saveUser(User user);
}
```

注意：只适用于主键自增的数据库，mysql 和 sqlserver 支持，oracle不行。

```xml
<!--添加用户：获取返回主键：方式一-->
<!--
	useGeneratedKeys: 声明返回主键
	keyProperty：把返回主键的值，封装到实体中的那个属性上
-->
<insert id="saveUser" parameterType="user" useGeneratedKeys="true" keyProperty="id">
  insert into user(username, birthday, sex, address) values (#{username}, #{birthday}, #{sex}, #{address})
</insert>
```

### 方法二 selectKey

接口方法：

```java
// 添加用户：获取返回主键：方式二
public void saveUser2(User user);
```

```xml
<!--添加用户：获取返回主键：方式二-->
<insert id="saveUser2" parameterType="user">

  <!--
  	selectKey : 适用范围更广，支持所有类型的数据库
  	order="AFTER"  ： 设置在sql语句执行前（后），执行此语句。after 表明是在sql语句执行过后，再执行此语句
  	keyColumn="id" : 指定主键对应列名
  	keyProperty="id"：把返回主键的值，封装到实体中的那个属性上
  	resultType="int"：指定主键类型
  -->
  <selectKey order="AFTER" keyColumn="id" keyProperty="id" resultType="int">
    SELECT LAST_INSERT_ID();
  </selectKey>
  insert into user(username,birthday,sex,address) values(#{username},#{birthday},#{sex},#{address})
</insert>
```

### 测试代码

两种返回主键的测试方法

```java
// 添加用户：返回主键方式一
@org.testng.annotations.Test
public void test8() throws IOException {

     InputStream resourceAsStream = Resources.getResourceAsStream("sqlMapConfig.xml");
     SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(resourceAsStream);
     SqlSession sqlSession = sqlSessionFactory.openSession();

     // 当前返回的 其实是基于UserMapper所产生的代理对象：底层：JDK动态代理 实际类型：proxy
     UserMapper mapper = sqlSession.getMapper(UserMapper.class);

     User user = new User();
     user.setUsername("某冰冰");
     user.setBirthday(new Date());
     user.setAddress("北京昌平");
     user.setSex("女");

     System.out.println(user);
     mapper.saveUser(user);
     System.out.println(user);

     sqlSession.commit();
     sqlSession.close();
}
    
    
// 添加用户：返回主键方式二
@org.testng.annotations.Test
public void test9() throws IOException {
  
	 InputStream resourceAsStream = Resources.getResourceAsStream("sqlMapConfig.xml");
     SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(resourceAsStream);
     SqlSession sqlSession = sqlSessionFactory.openSession();

     // 当前返回的 其实是基于UserMapper所产生的代理对象：底层：JDK动态代理 实际类型：proxy
     UserMapper mapper = sqlSession.getMapper(UserMapper.class);

     User user = new User();
     user.setUsername("汤唯");
     user.setBirthday(new Date());
     user.setAddress("北京昌平");
     user.setSex("女");

     System.out.println(user);
     mapper.saveUser2(user);
     System.out.println(user);

     sqlSession.commit();
     sqlSession.close();
}
```



## 动态SQL

当我们要根据不同的条件，来执行不同的 sql 语句的时候，需要用到动态 sql




### if

需求：根据 id 和username查询，但是不确定两个都有值

a）UserMapper接口

```java
public List<User> findByIdAndUsernameIf(User user);
```

b）UserMapper.xml映射

```xml
<!-- 动态sql之if : 多条件查询-->
<select id="findByIdAndUsernameIf" parameterType="user" resultType="com.lagou.domain.User">
  select * from user
  <!--<where>: 相当于where 1= 1，但是如果没有条件的话，不会拼接上where关键字-->
  <where>
    <if test="id != null">
      and id = #{id}
    </if>
    <if test="username !=null">
      and username = #{username}
    </if>
  </where>
</select>
```

c）测试代码

```java
// 动态sql之if： 多条件查询
@Test
public void test10() throws IOException {

	 InputStream resourceAsStream = Resources.getResourceAsStream("sqlMapConfig.xml");
     SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(resourceAsStream);
     SqlSession sqlSession = sqlSessionFactory.openSession();

     // 当前返回的 其实是基于UserMapper所产生的代理对象：底层：JDK动态代理 实际类型：proxy
     UserMapper mapper = sqlSession.getMapper(UserMapper.class);

     User user = new User();
     // user.setId(11);
     user.setUsername("汤唯");

     List<User> users = mapper.findByIdAndUsernameIf(user);
     for (User user1 : users) {
         System.out.println(user1);
     }
     sqlSession.close();
}
```

### set

需求: 动态更新 user 表数据，如果该属性有值就更新，没有值不做处理

a）UserMapper 接口

```java
// 动态sql的set标签：动态更新
public void updateIf(User user);
```

b）UserMapper.xml 映射

```xml
<!--动态sql之set ：动态更新-->
<!--<set> : 在更新的时候，会自动添加set关键字，还会去掉最后一个条件的逗号 -->
<update id="updateIf" parameterType="user">
  update user
  <set>
    <if test="username != null">
      username = #{username},
    </if>
    <if test="birthday != null">
      birthday = #{birthday},
    </if>
    <if test="sex != null">
      sex = #{sex},
    </if>
    <if test="address != null">
      address = #{address},
    </if>
  </set>
  where id = #{id}
</update>
```

c）测试代码

```java
// 动态sql之set： 动态更新
@Test
public void test11() throws IOException {

  InputStream resourceAsStream = Resources.getResourceAsStream("sqlMapConfig.xml");
  SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(resourceAsStream);
  SqlSession sqlSession = sqlSessionFactory.openSession();

  // 当前返回的 其实是基于UserMapper所产生的代理对象：底层：JDK动态代理 实际类型：proxy
  UserMapper mapper = sqlSession.getMapper(UserMapper.class);

  User user = new User();
  user.setId(1);
  user.setUsername("子慕最帅");
  user.setAddress("北京海淀区某招聘网站");

  mapper.updateIf(user);

  sqlSession.commit();

  sqlSession.close();
}
```

### foreach

foreach 主要是用来做数据的循环遍历

例如： `select * from user where id in (1,2,3)`  在这样的语句中，传入的参数部分必须依靠 foreach 遍历才能实现

foreach标签用于遍历集合，它的属性：

- collection：代表要遍历的集合元素 ，通常写collection或者list;如果查询条件为普通类型 Array数组，collection属性值为：array

- open：代表语句的开始部分

- close：代表结束部分

- item：代表遍历集合的每个元素，生成的变量名

- separator：代表分隔符

#### 集合

UserMapper 接口

```java
public List<User> findByList(List<Integer> ids);
```

UserMapper.xml映射

```xml
<sql id="selectUser">
    select * from user
</sql>

<!--动态sql的foreach标签：多值查询：根据多个id值查询用户-->
<select id="findByList" parameterType="list" resultType="user">
   <!-- select * from user where id in (1,2,3)  -->
    <include refid="selectUser"/>
      <where>
         <foreach collection="collection" open="id in (" close=")" item="id" separator=",">
                #{id}
         </foreach>
     </where>
</select>
```

测试代码

```java
// 动态sql之foreach： 多值查询
@Test
public void test12() throws IOException {

		InputStream resourceAsStream = Resources.getResourceAsStream("sqlMapConfig.xml");
		SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(resourceAsStream);
		SqlSession sqlSession = sqlSessionFactory.openSession();

		// 当前返回的 其实是基于UserMapper所产生的代理对象：底层：JDK动态代理 实际类型：proxy
		UserMapper mapper = sqlSession.getMapper(UserMapper.class);

		List<Integer> ids = new ArrayList<>();
		ids.add(1);
		ids.add(6);
		ids.add(2);

		List<User> users = mapper.findByList(ids);
		for (User user : users) {
		    System.out.println(user);
		}

		sqlSession.close();
}
```

#### 数组

UserMapper 接口

```java
public List<User> findByArray(Integer[] ids);
```

UserMapper.xml 映射

```xml
<sql id="selectUser">
    select * from user
</sql>

<!--动态sql的foreach标签：多值查询：根据多个id值查询用户-->
<select id="findByArray" parameterType="int" resultType="user">
   <!-- select * from user where id in (1,2,3)  -->
    <include refid="selectUser"/>
      <where>
         <foreach collection="array" open="id in (" close=")" item="id" separator=",">
                #{id}
         </foreach>
     </where>
</select>
```

测试代码

```java
// 动态sql之foreach：多值查询
@Test
public void test12() throws IOException {

  InputStream resourceAsStream = Resources.getResourceAsStream("sqlMapConfig.xml");
  SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(resourceAsStream);
  SqlSession sqlSession = sqlSessionFactory.openSession();

  // 当前返回的 其实是基于UserMapper所产生的代理对象：底层：JDK动态代理 实际类型：proxy
  UserMapper mapper = sqlSession.getMapper(UserMapper.class);

  Integer[] ids = {2, 6, 9};

  List<User> users = mapper.findByArray(ids);
  for (User user : users) {
    System.out.println(user);
  }

  sqlSession.close();
}
```

## SQL片段

映射文件中可将重复的 sql 提取出来，使用时用 include 引用即可，最终达到 sql 重用的目的

```xml
<sql id="selectUser">
    select * from user
</sql>

<!--动态sql的foreach标签：多值查询：根据多个id值查询用户-->
<select id="findByArray" parameterType="int" resultType="user">
   <!-- select * from user where id in (1,2,3)  -->
    <include refid="selectUser"/>
      <where>
         <foreach collection="array" open="id in (" close=")" item="id" separator=",">
                #{id}
         </foreach>
     </where>
</select>
```

>  **源码深挖**：本文讲解 MyBatis 高级查询与动态 SQL（if/set/foreach/include）的使用层面。若要深入理解动态 SQL 的解析与构建原理（`SqlSource`、`BoundSql`、动态标签的 `SqlNode` 树）、结果集映射与嵌套查询的底层实现，见「[MyBatis 核心原理](../04-MyBatis核心原理/00-MyBatis概述与选型.md)」专栏的《动态 SQL 解析》《结果集映射》《Mapper 代理映射》等篇。

## 版本差异(旧版 → MyBatis 3.5.x)

| 特性 | 旧版（MyBatis 3.x 早期） | MyBatis 3.5.x |
|------|--------------------------|---------------|
| 动态 SQL 标签 | if/set/where/foreach/include | 机制不变（SqlNode 树 + OGNL），完全兼容 |
| 高级查询 | 嵌套查询/多表联查 | 用法不变 |
| 参数占位 | #{} 预处理 / ${} 拼接 | 不变，${} 仍需防范 SQL 注入 |
| record 支持 | 无 | 3.5.10+ 通过 argNameBasedConstructorAutoMapping 支持构造器映射 |
| 虚拟线程 | 无 | 阻塞式调用可直接运行于虚拟线程环境 |

> 动态 SQL 是 MyBatis 最稳定的功能之一，本文所有示例在 3.5.x 中无需修改即可运行。