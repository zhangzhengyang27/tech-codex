---
title: "JDBCTemplate和事务"
description: "JdbcTemplate 是 spring 框架中提供的一个模板对象，是对原始繁琐的 Jdbc API 对象的简单封装"
keywords: [JdbcTemplate, Spring 事务, 声明式事务, @Transactional]
category: "Java"
tags: [Java, SSM]
---


# JDBCTemplate和事务

## JDBCTemplate

JdbcTemplate 是 spring 框架中提供的一个模板对象，是对原始繁琐的 Jdbc API 对象的简单封装

```java
JdbcTemplate jdbcTemplate = new JdbcTemplate(DataSource dataSource);
```

### 核心方法

-  int update(); 执行增、删、改语句 

-  List query(); 查询多个 

-  T  queryForObject();
  查询一个 new BeanPropertyRowMapper<>(); 实现ORM映射封装 

**举个例子**

查询数据库所有账户信息到 Account 实体中

```java
public class JdbcTemplateTest { 
  
  @Test 
  public void testFindAll() throws Exception { 
    // 创建核心对象 
    JdbcTemplate jdbcTemplate = new JdbcTemplate(JdbcUtils.getDataSource()); 
    
    // 编写sql 
    String sql = "select * from account"; 
    
    // 执行sql
    List<Account> list = jdbcTemplate.query(sql, new BeanPropertyRowMapper<>(Account.class)); 
  } 
}
```

### Spring 整合 JdbcTemplate

需求：基于 Spring 的 xml 配置实现账户的 CRUD 案例

**步骤分析**

1. 创建 java 项目，导入坐标
2. 编写 Account 实体类
3. 编写 AccountDao 接口和实现类
4. 编写 AccountService 接口和实现类
5. 编写 spring 核心配置文件
6. 编写测试代码

1）创建java项目，导入坐标

```xml
<dependency>
  <groupId>mysql</groupId>
  <artifactId>mysql-connector-java</artifactId>
  <version>8.0.28</version>
</dependency>
<dependency>
  <groupId>com.alibaba</groupId>
  <artifactId>druid</artifactId>
  <version>1.1.15</version>
</dependency>
<dependency>
  <groupId>org.springframework</groupId>
  <artifactId>spring-context</artifactId>
  <version>5.1.5.RELEASE</version>
</dependency>
<dependency>
  <groupId>org.aspectj</groupId>
  <artifactId>aspectjweaver</artifactId>
  <version>1.8.13</version>
</dependency>
<dependency>
  <groupId>org.springframework</groupId>
  <artifactId>spring-jdbc</artifactId>
  <version>5.1.5.RELEASE</version>
</dependency>
<dependency>
  <groupId>org.springframework</groupId>
  <artifactId>spring-tx</artifactId>
  <version>5.1.5.RELEASE</version>
</dependency>
<dependency>
  <groupId>junit</groupId>
  <artifactId>junit</artifactId>
  <version>4.12</version>
</dependency>
<dependency>
  <groupId>org.springframework</groupId>
  <artifactId>spring-test</artifactId>
  <version>5.1.5.RELEASE</version>
</dependency>
```

2）编写 Account 实体类

```java
public class Account { 
  private Integer id; 
  private String name;
  private Double money; 
}
```

3）编写 AccountDao 接口和实现类

```java
public interface AccountDao { 
  
  public List<Account> findAll(); 
  
  public Account findById(Integer id); 
  
  public void save(Account account); 
  
  public void update(Account account); 
  
  public void delete(Integer id); 
}
package com.lagou.dao.impl;

import com.lagou.dao.AccountDao;
import com.lagou.domain.Account;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class AccountDaoImpl implements AccountDao {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /*
        查询所有账户
     */
    public List<Account> findAll() {
        // 需要用到jdbcTemplate
        String sql = "select * from account";
        List<Account> list = jdbcTemplate.query(sql, new BeanPropertyRowMapper<Account>(Account.class));

        return list;
    }

    /*
        根据ID查询账户
     */
    public Account findById(Integer id) {
        String sql = "select * from account where id = ?";
        Account account = jdbcTemplate.queryForObject(sql, new BeanPropertyRowMapper<Account>(Account.class), id);
        return account;
    }

    /*
        添加账户
     */
    public void save(Account account) {
        String sql = "insert into account values(null,?,?)";
        jdbcTemplate.update(sql,account.getName(),account.getMoney());
    }

    /*
        更新账户
     */
    public void update(Account account) {
        String sql = "update account set money = ? where name = ?";
        jdbcTemplate.update(sql,account.getMoney(),account.getName());
    }

    /*
        根据ID删除账户
     */
    public void delete(Integer id) {
        String sql = "delete from account where id = ?";
        jdbcTemplate.update(sql,id);
    }
}
```

4）编写 AccountService 接口和实现类

```java
package com.lagou.servlet;

import com.lagou.domain.Account;

import java.util.List;

public interface AccountService {

    /*
       查询所有账户
    */
    public List<Account> findAll();

    /*
        根据ID查询账户
     */
    public Account findById(Integer id);

    /*
        添加账户
     */
    public void save(Account account);

    /*
        更新账户信息
     */
    public void update(Account account);

    /*
        根据ID删除账户
     */
    public void delete(Integer id);

}
package com.lagou.servlet.impl;

import com.lagou.dao.AccountDao;
import com.lagou.domain.Account;
import com.lagou.servlet.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AccountServiceImpl implements AccountService {

    @Autowired
    private AccountDao accountDao;


    public List<Account> findAll() {
        List<Account> all = accountDao.findAll();
        return all;
    }

    public Account findById(Integer id) {
        Account account = accountDao.findById(id);
        return account;
    }

    public void save(Account account) {
        accountDao.save(account);
    }

    public void update(Account account) {
        accountDao.update(account);
    }

    public void delete(Integer id) {
        accountDao.delete(id);
    }
}
```

5）编写spring核心配置文件

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xsi:schemaLocation="
       	http://www.springframework.org/schema/beans
				http://www.springframework.org/schema/beans/spring-beans.xsd
       	http://www.springframework.org/schema/context
				http://www.springframework.org/schema/context/spring-context.xsd">


    <!--IOC注解扫描-->
    <context:component-scan base-package="com.lagou"/>

    <!--引入properties-->
    <context:property-placeholder location="classpath:jdbc.properties"/>

    <!--dataSource-->
    <bean id="dataSource" class="com.alibaba.druid.pool.DruidDataSource">
        <property name="driverClassName" value="${jdbc.driverClassName}"/>
        <property name="url" value="${jdbc.url}"/>
        <property name="username" value="${jdbc.username}"/>
        <property name="password" value="${jdbc.password}"/>
    </bean>


    <!--jdbcTemplate-->
    <bean id="jdbcTemplate" class="org.springframework.jdbc.core.JdbcTemplate">
        <constructor-arg name="dataSource" ref="dataSource"/>
    </bean>

</beans>
```

编写测试代码

```java
package com.lagou.test;

import com.lagou.domain.Account;
import com.lagou.servlet.AccountService;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import java.util.List;

@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration({"classpath:applicationContext.xml"})
public class AccountServiceImplTest {

    @Autowired
    private AccountService accountService;


    // 测试保存
    @Test
    public void testSave(){
        Account account = new Account();
        account.setName("lucy");
        account.setMoney(1000d);
        accountService.save(account);
    }

    // 测试查询所有
    @Test
    public void testFindAll(){

        List<Account> all = accountService.findAll();
        for (Account account : all) {
            System.out.println(account);
        }
    }

    //测试根据ID进行查询
    @Test
    public void testFindById(){
        Account account = accountService.findById(1);
        System.out.println(account);
    }

    // 测试账户修改
    @Test
    public void testUpdate(){
        Account account = new Account();
        account.setName("tom");
        account.setMoney(1000d);

        accountService.update(account);
    }

    // 测试根据ID删除账户
    @Test
    public void testDelete(){
        accountService.delete(4);
    }
}
```

### 实现转账案例

步骤分析

1. 创建 java 项目，导入坐标
2. 编写 Account 实体类
3. 编写 AccountDao 接口和实现类
4. 编写 AccountService 接口和实现类
5. 编写 spring 核心配置文件
6. 编写测试代码

1）创建java项目，导入坐标

同上面的坐标

2）编写Account实体类

```java
public class Account { 
  private Integer id; 
  private String name; 
  private Double money; 
  // setter getter....
}
```

3）编写AccountDao接口和实现类

```java
public interface AccountDao { 
  
  public void out(String outUser, Double money); 
  
  public void in(String inUser, Double money); 

}
package com.lagou.dao.impl;

import com.lagou.dao.AccountDao;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AccountDaoImpl implements AccountDao {

    @Autowired
    private JdbcTemplate jdbcTemplate;


    public void out(String outUser, Double money) {
        String sql = "update account set money = money - ? where name = ?";
        jdbcTemplate.update(sql,money,outUser);
    }

    public void in(String inUser, Double money) {
        String sql = "update account set money = money + ? where name = ?";
        jdbcTemplate.update(sql,money,inUser);

    }
}
```

4）编写AccountService接口和实现类

```java
package com.lagou.servlet;

public interface AccountService {

    public void transfer(String outUser,String inUser,Double money);

}
package com.lagou.servlet.impl;

import com.lagou.dao.AccountDao;
import com.lagou.servlet.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AccountServiceImpl implements AccountService {

    @Autowired
    private AccountDao accountDao;


    //@Transactional(propagation = Propagation.REQUIRED,isolation = Isolation.REPEATABLE_READ,timeout = -1,readOnly = false)
    public void transfer(String outUser, String inUser, Double money) {

        //调用dao的out及in方法
        accountDao.out(outUser,money);

        int i = 1/0;

        accountDao.in(inUser,money);
    }
}
```

5）编写spring核心配置文件

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:context="http://www.springframework.org/schema/context"
  xsi:schemaLocation="
  http://www.springframework.org/schema/beans
  http://www.springframework.org/schema/beans/spring-beans.xsd
  http://www.springframework.org/schema/context
  http://www.springframework.org/schema/context/spring-context.xsd">


  <!--IOC注解扫描-->
  <context:component-scan base-package="com.lagou"/>

  <!--引入properties-->
  <context:property-placeholder location="classpath:jdbc.properties"/>

  <!--dataSource-->
  <bean id="dataSource" class="com.alibaba.druid.pool.DruidDataSource">
    <property name="driverClassName" value="${jdbc.driverClassName}"/>
    <property name="url" value="${jdbc.url}"/>
    <property name="username" value="${jdbc.username}"/>
    <property name="password" value="${jdbc.password}"/>
  </bean>


  <!--jdbcTemplate-->
  <bean id="jdbcTemplate" class="org.springframework.jdbc.core.JdbcTemplate">
    <constructor-arg name="dataSource" ref="dataSource"/>
  </bean>


</beans>
```

6）编写测试代码

```java
@RunWith(SpringJUnit4ClassRunner.class) @ContextConfiguration("classpath:applicationContext.xml") 
public class AccountServiceTest { 
  @Autowired 
  private AccountService accountService; 
  
  @Test 
  public void testTransfer() throws Exception { 
    accountService.transfer("tom", "jerry", 100d); 
  } 
}
```

## Spring 事务

Spring 的事务控制可以分为编程式事务控制和声明式事务控制。

- 编程式   --开发者直接把事务的代码和业务代码耦合到一起，在实际开发中不用
- 声明式   --开发者采用配置的方式来实现的事务控制，业务代码与事务代码实现解耦合，使用的 AOP 思想

### 编程式事务控制相关对象

略

### 基于 XML 的声明式事务控制

在 Spring 配置文件中声明式的处理事务来代替代码式的处理事务。底层采用AOP思想来实现的。

**声明式事务控制明确事项：**

- 核心业务代码(目标对象) （切入点是谁？）
- 事务增强代码(Spring已提供事务管理器)）（通知是谁？）
- 切面配置（切面如何配置？）

#### 快速入门

**需求** ：使用 spring 声明式事务控制转账业务

**步骤分析**

1. 引入 tx 命名空间
2. 事务管理器通知配置
3. 事务管理器 AOP 配置
4. 测试事务控制转账业务代码

1）引入 tx 命名空间

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xmlns:aop="http://www.springframework.org/schema/aop"
       xmlns:tx="http://www.springframework.org/schema/tx"
       xsi:schemaLocation="http://www.springframework.org/schema/beans
                           http://www.springframework.org/schema/beans/spring-beans.xsd
                           http://www.springframework.org/schema/context
                           http://www.springframework.org/schema/context/spring-context.xsd
                           http://www.springframework.org/schema/aop
                           http://www.springframework.org/schema/aop/spring-aop.xsd
                           http://www.springframework.org/schema/tx
                           http://www.springframework.org/schema/tx/spring-tx.xsd">
  </beans>
```

2）事务管理器通知配置

```xml
<!--事务管理器--> 
<bean id="transactionManager" class="org.springframework.jdbc.datasource.DataSourceTransactionManager"> 
  <property name="dataSource" ref="dataSource"></property> 
</bean> 

<!--通知增强--> 
<tx:advice id="txAdvice" transaction-manager="transactionManager"> 
  <!--定义事务的属性--> 
  <tx:attributes> 
    <tx:method name="*"/> 
  </tx:attributes> 
</tx:advice>
```

3）事务管理器AOP配置

```xml
<!--aop配置-->
<aop:config>
  <!--切面配置-->
  <aop:advisor advice-ref="txAdvice" pointcut="execution(* com.lagou.servlet..*.*(..))">
  </aop:advisor>
</aop:config>
```

4）测试事务控制转账业务代码

```java
@Override 
public void transfer(String outUser, String inUser, Double money) { 
  accountDao.out(outUser, money); 
  // 制造异常 
  int i = 1 / 0; 
  accountDao.in(inUser, money); 
}
```

#### 事务参数的配置详解

##### 事务隔离级别

- ISOLATION_DEFAULT 	使用数据库默认级别
- ISOLATION_READ_UNCOMMITTED   读未提交
- ISOLATION_READ_COMMITTED   读已提交
- ISOLATION_REPEATABLE_READ   可重复读
- ISOLATION_SERIALIZABLE        串行化

##### 事务传播行为

事务传播行为指的就是当一个业务方法【被】另一个业务方法调用时，应该如何进行事务控制

| **参数**          | **说明**                                                     |
| ----------------- | ------------------------------------------------------------ |
| **REQUIRED**      | **如果当前没有事务，就新建一个事务，如果已经存在一个事务中，加入到这个事务中。一般的选择（默认值）** |
| **SUPPORTS**      | **支持当前事务，如果当前没有事务，就以非事务方式执行（没有事务）** |
| **MANDATORY**     | **使用当前的事务，如果当前没有事务，就抛出异常**             |
| **REQUIRES_NEW**  | **新建事务，如果当前在事务中，把当前事务挂起**               |
| **NOT_SUPPORTED** | **以非事务方式执行操作，如果当前存在事务，就把当前事务挂起** |
| **NEVER**         | **以非事务方式运行，如果当前存在事务，抛出异常**             |
| **NESTED**        | **如果当前存在事务，则在嵌套事务内执行。如果当前没有事务，则执行REQUIRED 类似的操作** |

- read-only（是否只读）：建议查询时设置为只读
- timeout（超时时间）：默认值是-1，没有超时限制。如果有，以秒为单位进行设置

```xml
<tx:method name="transfer" isolation="REPEATABLE_READ" propagation="REQUIRED" timeout="-1" read-only="false"/>
```

- name：切点方法名称
- isolation：事务的隔离级别
- propagation：事务的传播行为
- timeout：超时时间
- read-only：是否只读

##### CRUD常用配置

```xml
<tx:attributes> 
  <tx:method name="save*" propagation="REQUIRED"/> 
  <tx:method name="delete*" propagation="REQUIRED"/> 
  <tx:method name="update*" propagation="REQUIRED"/> 
  <tx:method name="find*" read-only="true"/> 
  <tx:method name="*"/> 
</tx:attributes>
```

### 基于注解的声明式事务控制

#### 常用注解

1. 修改 service层，增加事务注解
2. 修改 spring 核心配置文件，开启事务注解支持

```java
@Service
public class AccountServiceImpl implements AccountService {
  @Autowired
  private AccountDao accountDao;

  @Transactional(propagation = Propagation.REQUIRED, isolation = Isolation.REPEATABLE_READ, timeout = -1, readOnly = false)
  @Override
  public void transfer(String outUser, String inUser, Double money) {
    accountDao.out(outUser, money);
    int i = 1 / 0;
    accountDao.in(inUser, money);
  }
}
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans
       xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xmlns:aop="http://www.springframework.org/schema/aop"
       xmlns:tx="http://www.springframework.org/schema/tx"
       xsi:schemaLocation="http://www.springframework.org/schema/beans
                           http://www.springframework.org/schema/beans/spring-beans.xsd
                           http://www.springframework.org/schema/context
                           http://www.springframework.org/schema/context/spring-context.xsd
                           http://www.springframework.org/schema/aop
                           http://www.springframework.org/schema/aop/spring-aop.xsd
                           http://www.springframework.org/schema/tx
                           http://www.springframework.org/schema/tx/spring-tx.xsd">

  <!--省略之前dataSource、jdbcTemplate、组件扫描配置-->

  <!--事务管理器-->
  <bean id="transactionManager" class="org.springframework.jdbc.datasource.DataSourceTransactionManager">
    <property name="dataSource" ref="dataSource">
    </property>
  </bean>

  <!--事务的注解支持-->
  <tx:annotation-driven/>

</beans>
```

#### 纯注解

核心配置类

```java
package com.lagou.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;

@Configuration  // 声明该类为核心配置类
@ComponentScan("com.lagou")  // 包扫描
@Import(DataSourceConfig.class) //导入其他配置类
@EnableTransactionManagement //事务的注解驱动
public class SpringConfig {

    @Bean
    public JdbcTemplate getJdbcTemplate(@Autowired DataSource dataSource){
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        return jdbcTemplate;
    }

    @Bean
    public PlatformTransactionManager getPlatformTransactionManager(@Autowired DataSource dataSource){
        DataSourceTransactionManager dataSourceTransactionManager = new DataSourceTransactionManager(dataSource);
        return dataSourceTransactionManager;
    }

}
```

数据源配置类

```java
package com.lagou.config;

import com.alibaba.druid.pool.DruidDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.PropertySource;

import javax.sql.DataSource;

@PropertySource("classpath:jdbc.properties") //引入properties文件
public class DataSourceConfig {
    @Value("${jdbc.driverClassName}")
    private String driver;
    @Value("${jdbc.url}")
    private String url;
    @Value("${jdbc.username}")
    private String username;
    @Value("${jdbc.password}")
    private String password;


    @Bean //会把当前方法的返回值对象放进IOC容器中
    public DataSource getDataSource(){
        DruidDataSource druidDataSource = new DruidDataSource();
        druidDataSource.setDriverClassName(driver);
        druidDataSource.setUrl(url);
        druidDataSource.setUsername(username);
        druidDataSource.setPassword(password);
        return druidDataSource;
    }
}
```

#### 知识小结

- 平台事务管理器配置（xml、注解方式）
- 事务通知的配置（@Transactional 注解配置）
- 事务注解驱动的配置 tx:annotation-driven/、@EnableTransactionManagement

## Spring 集成 web 环境

### ApplicationContext 应用上下文获取方式

应用上下文对象是通过 new ClassPathXmlApplicationContext(spring配置文件) 方式获取的，但是每次从容器中获得 Bean 时都要编写 new ClassPathXmlApplicationContext(spring配置文件) ，这样的弊端是配置文件加载多次，应用上下文对象创建多次。

解决思路分析：

在 Web 项目中，可以使用 **ServletContextListener** 监听 Web 应用的启动，我们可以在 Web 应用启动时，就加载 Spring 的配置文件，创建应用上下文对象 **ApplicationContext**，在将其存储到最大的域

**servletContext** 域中，这样就可以在任意位置从域中获得应用上下文 **ApplicationContext** 对象了

### Spring提供获取应用上下文的工具

上面的分析不用手动实现，Spring提供了一个监听器 **ContextLoaderListener** 就是对上述功能的封装，该监听器内部加载 Spring 配置文件，创建应用上下文对象，并存储到 **ServletContext** 域中，提供了一个客户端工具 **WebApplicationContextUtils** 供使用者获得应用上下文对象

**所以我们需要做的只有两件事：**

1. 在 web.xml 中配置 ContextLoaderListener 监听器（导入 spring-web 坐标）
2. 使用 WebApplicationContextUtils 获得应用上下文对象 ApplicationContext

### 实现

1）导入 Spring 集成 web 的坐标

```xml
<dependency> 
  <groupId>org.springframework</groupId> 
  <artifactId>spring-context</artifactId> 
  <version>5.1.5.RELEASE</version> 
</dependency> 
<dependency> 
  <groupId>org.springframework</groupId> 
  <artifactId>spring-web</artifactId> 
  <version>5.1.5.RELEASE</version> 
</dependency>
```

2）配置 ContextLoaderListener 监听器

```xml
<!--全局参数--> 
<context-param> 
  <param-name>contextConfigLocation</param-name> 
  <param-value>classpath:applicationContext.xml</param-value>
</context-param> 
    
<!--Spring的监听器--> 
<listener> 
    <listener-class> org.springframework.web.context.ContextLoaderListener </listener-class> 
</listener>
```

3）通过工具获得应用上下文对象

```java
ApplicationContext applicationContext = WebApplicationContextUtils.getWebApplicationContext(servletContext); 

Object obj = applicationContext.getBean("id");
```

## 版本差异(Spring 5 → Spring 6.x)

| 特性 | 旧版（Spring 5 时代） | Spring 6.x（Spring Boot 3.5.x） |
|------|----------------------|--------------------------------|
| JdbcTemplate | org.springframework.jdbc.core.JdbcTemplate | 包名与 API 不变，完全兼容 |
| 事务注解 | @Transactional（org.springframework.transaction.annotation） | 用法不变；底层依赖 jakarta.transaction 接口 |
| 依赖注入 | XML 配置 / 注解混合 | 注解与 Java Config 为主流，XML 仅用于遗留项目 |
| 虚拟线程 | 无 | Spring 6.1+ 支持虚拟线程（Boot 3.2+ spring.threads.virtual.enabled） |
| 数据库访问 | JdbcTemplate 仍是轻量选择 | 不变；但新项目更常组合 MyBatis/JPA |

> 本文的 XML 配置方式（ContextLoaderListener、web.xml 等）属于传统 SSM 时代写法；Spring Boot 3.5.x 下推荐使用自动配置 + 注解，JdbcTemplate 与 @Transactional 的核心 API 完全不变。