---
title: "SSM整合"
description: "将 mybatis 接口代理对象的创建权交给 spring 管理，我们就可以把 dao 的代理对象注入到 service 中，此时也就完成了spring 与 mybatis 的整合"
keywords: [SSM整合]
category: "Java"
tags: [Java, SSM]
---


# SSM 整合

## 需求和步骤分析

需求：使用 ssm 框架完成对 account 表的增删改查操作

**步骤分析**

1. 准备数据库和表记录
2. 创建 web 项目
3. 编写 mybatis 在 ssm 环境中可以单独使用
4. 编写 spring 在 ssm 环境中可以单独使用
5. spring 整合 mybatis
6. 编写 springMVC 在 ssm 环境中可以单独使用
7. spring 整合 springMVC

## 环境搭建

### 准备数据库和表记录

```sql
CREATE TABLE account ( 
  id int(11) NOT NULL AUTO_INCREMENT, 
  name varchar(32) DEFAULT NULL, 
  money double DEFAULT NULL, 
  PRIMARY KEY (id) 
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8; 

insert into account(id,name,money) values (1,'tom',1000), (2,'jerry',1000);
```

### 创建web项目-ssm

### 编写mybatis在ssm环境中可以单独使用

1）相关坐标

```xml
<!--mybatis坐标-->
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
    <groupId>org.mybatis</groupId>
    <artifactId>mybatis</artifactId>
    <version>3.5.1</version>
</dependency>
<dependency>
    <groupId>junit</groupId>
    <artifactId>junit</artifactId>
    <version>4.12</version>
</dependency>
```

2）Account实体

```java
package com.lagou.domain;

public class Account {

    private Integer id;
    private String name;
    private Double money;

    @Override
    public String toString() {
        return "Account{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", money=" + money +
                '}';
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Double getMoney() {
        return money;
    }

    public void setMoney(Double money) {
        this.money = money;
    }
}
```

3）AccountDao接口

```java
package com.lagou.dao;

import com.lagou.domain.Account;

import java.util.List;

public interface AccountDao {

    public List<Account> findAll();


    void save(Account account);

    Account findById(Integer id);

    void update(Account account);

    void deleteBatch(Integer[] ids);
}
```

4）AccountDao.xml映射

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">

<mapper namespace="com.lagou.dao.AccountDao">

    <!--查询所有账户-->
    <select id="findAll" resultType="account">
        select *
        from account
    </select>

    <!-- 添加账户  void save(Account account);-->
    <insert id="save" parameterType="account">
        insert into account(name, money)
        values (#{name}, #{money})
    </insert>

    <!--根据ID查询账户信息   Account findById(Integer id);-->
    <select id="findById" parameterType="int" resultType="account">
        select *
        from account
        where id = #{id}
    </select>

    <!--更新账户-->
    <update id="update" parameterType="account">
        update account
        set name  = #{name},
            money = #{money}
        where id = #{id}
    </update>

    <!--批量删除 void deleteBatch(Integer[] ids);  id in(1,2)-->
    <delete id="deleteBatch" parameterType="int">
        delete from account
        <where>
            <foreach collection="array" open="id in(" close=")" separator="," item="id">
                #{id}
            </foreach>
        </where>
    </delete>

</mapper>
```

5）mybatis核心配置文件

jdbc.properties

```properties
jdbc.driverClassName=com.mysql.cj.jdbc.Driver
jdbc.url=jdbc:mysql://127.0.0.1:3306/spring_db?characterEncoding=UTF-8
jdbc.username=root
jdbc.password=root1234
```

SqlMapConfig.xml

```xml
<?xml version="1.0" encoding="UTF-8" ?> 
<!DOCTYPE configuration PUBLIC "-//mybatis.org//DTD Config 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-config.dtd">
<configuration> 
  	<!--加载properties-->
    <properties resource="jdbc.properties"/> 
  
  	<!--类型别名配置-->
    <typeAliases>
        <package name="com.lagou.domain"/>
    </typeAliases>
  
  	<!--环境配置-->
    <environments default="mysql"> <!--使用MySQL环境-->
        <environment id="mysql">
            <transactionManager type="JDBC"/>
            <dataSource type="POOLED">
                <property name="driver" value="${jdbc.driverClassName}"/>
                <property name="url" value="${jdbc.url}"/>
                <property name="username" value="${jdbc.username}"/>
                <property name="password" value="${jdbc.password}"/>
            </dataSource>
        </environment>
    </environments> 
  
  	<!--加载映射-->
    <mappers>
        <package name="com.lagou.dao"/>
    </mappers>
</configuration>
```

6）测试代码

```java
package com.lagou.test;

import com.lagou.dao.AccountDao;
import com.lagou.domain.Account;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.apache.ibatis.session.SqlSessionFactoryBuilder;
import org.junit.Test;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

public class MybatisTest {

    @Test
    public void  testMybatis() throws IOException {

        InputStream resourceAsStream = Resources.getResourceAsStream("SqlMapConfig.xml");

        SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(resourceAsStream);

        SqlSession sqlSession = sqlSessionFactory.openSession();

        AccountDao mapper = sqlSession.getMapper(AccountDao.class);

        List<Account> all = mapper.findAll();

        for (Account account : all) {
            System.out.println(account);
        }

        sqlSession.close();

    }

}
```

### 编写spring在ssm环境中可以单独使用

1）相关坐标

```xml
<!--spring坐标-->
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
    <groupId>org.springframework</groupId>
    <artifactId>spring-test</artifactId>
    <version>5.1.5.RELEASE</version>
</dependency>
```

2）AccountService接口

```java
package com.lagou.service;

import com.lagou.domain.Account;

import java.util.List;

public interface AccountService {

    public List<Account> findAll();

    void save(Account account);

    Account findById(Integer id);

    void update(Account account);

    void deleteBatch(Integer[] ids);
}
```

3）AccountServiceImpl实现

```java
@Service 
public class AccountServiceImpl implements AccountService { 
  @Override 
  public List<Account> findAll() { 
    System.out.println("findAll执行了...."); 
    return null; 
  }
}
```

4）spring核心配置文件

```xml
<?xml version="1.0" encoding="UTF-8"?> 
<beans 
       xmlns="http://www.springframework.org/schema/beans" 
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
       xmlns:context="http://www.springframework.org/schema/context" 
       xmlns:tx="http://www.springframework.org/schema/tx" 
       xmlns:aop="http://www.springframework.org/schema/aop"
       xsi:schemaLocation=" http://www.springframework.org/schema/beans 
                           http://www.springframework.org/schema/beans/spring-beans.xsd 
                           http://www.springframework.org/schema/context 
                           http://www.springframework.org/schema/context/spring-context.xsd 
                           http://www.springframework.org/schema/tx 
                           http://www.springframework.org/schema/tx/spring-tx.xsd 
                           http://www.springframework.org/schema/aop 
                           http://www.springframework.org/schema/aop/spring-aop.xsd"> 
  <!--注解组件扫描--> 
  <context:component-scan base-package="com.lagou.service"/> 
</beans>
```

5）测试代码

```java
package com.lagou.test;

import com.lagou.domain.Account;
import com.lagou.service.AccountService;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import java.util.List;

@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration("classpath:applicationContext.xml")
public class SpringTest {

    @Autowired
    private AccountService accountService;


    @Test
    public void testSpring() {
        List<Account> all = accountService.findAll();
        for (Account account : all) {
            System.out.println(account);
        }
    }
}
```

### spring 整合  mybatis

1）整合思想

将 mybatis 接口代理对象的创建权交给 spring 管理，我们就可以把 dao 的代理对象注入到 service 中，此时也就完成了spring 与 mybatis 的整合

2）导入整合包

```xml
<!--mybatis整合spring坐标（mybatis-spring 2.x 才适配 MyBatis 3.5.x）-->
<dependency>
    <groupId>org.mybatis</groupId>
    <artifactId>mybatis-spring</artifactId>
    <version>2.0.6</version>
</dependency>
```

3）spring配置文件管理mybatis

注意：此时可以将mybatis主配置文件删除。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xmlns:tx="http://www.springframework.org/schema/tx"
       xmlns:aop="http://www.springframework.org/schema/aop"
       xsi:schemaLocation="
       	http://www.springframework.org/schema/beans	http://www.springframework.org/schema/beans/spring-beans.xsd
       	http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context.xsd
       	http://www.springframework.org/schema/tx http://www.springframework.org/schema/tx/spring-tx.xsd
       	http://www.springframework.org/schema/aop http://www.springframework.org/schema/aop/spring-aop.xsd">


    <!--配置IOC相关操作:开启注解扫描-->
    <context:component-scan base-package="com.lagou.service"></context:component-scan>

    <!--spring整合mybatis开始...................-->
    <context:property-placeholder location="classpath:jdbc.properties"></context:property-placeholder>

    <bean id="dataSource" class="com.alibaba.druid.pool.DruidDataSource">
        <property name="driverClassName" value="${jdbc.driverClassName}"/>
        <property name="url" value="${jdbc.url}"/>
        <property name="username" value="${jdbc.username}"/>
        <property name="password" value="${jdbc.password}"/>
    </bean>

    <!--sqlSessionFactory的创建权交给了spring 生产sqlSession-->
    <bean id="sqlSessionFactory" class="org.mybatis.spring.SqlSessionFactoryBean">
        <property name="dataSource" ref="dataSource"></property>
        <property name="typeAliasesPackage" value="com.lagou.domain"></property>

        <!--引入加载mybatis的核心配置文件，可以不用去加载-->
        <!-- <property name="configLocation" value="classpath:SqlMapConfig.xml"></property>-->
    </bean>

    <!--mapper映射扫描 MapperScannerConfigurer扫描该包下所有接口，生成代理对象存到IOC容器中-->
    <bean class="org.mybatis.spring.mapper.MapperScannerConfigurer">
        <property name="basePackage" value="com.lagou.dao"></property>
    </bean>
    <!--spring整合mybatis结束..........-->


    <!--spring的声明式事务-->
    <!--1.事务管理器-->
    <bean id="transactionManager" class="org.springframework.jdbc.datasource.DataSourceTransactionManager">
        <property name="dataSource" ref="dataSource"></property>
    </bean>

    <!--2.开始事务注解的支持-->
    <tx:annotation-driven/>

</beans>
```

4）修改 AccountServiceImpl

```java
@Service 
public class AccountServiceImpl implements AccountService { 
  @Autowired 
  private AccountDao accountDao; 
  
  @Override 
  public List<Account> findAll() { 
    return accountDao.findAll(); 
  }
}
```

### 编写springMVC在ssm环境中可以单独使用

需求：访问到controller里面的方法查询所有账户，并跳转到list.jsp页面进行列表展示

1）相关坐标

```xml
<!--springMVC坐标-->
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-webmvc</artifactId>
    <version>5.1.5.RELEASE</version>
</dependency>
<dependency>
    <groupId>javax.servlet</groupId>
    <artifactId>javax.servlet-api</artifactId>
    <version>3.1.0</version>
    <scope>provided</scope>
</dependency>
<dependency>
    <groupId>javax.servlet.jsp</groupId>
    <artifactId>jsp-api</artifactId>
    <version>2.2</version>
    <scope>provided</scope>
</dependency>
<dependency>
    <groupId>jstl</groupId>
    <artifactId>jstl</artifactId>
    <version>1.2</version>
</dependency>
```

2）导入页面资源

将 Bootstrap、jQuery 等静态资源与 list.jsp、add.jsp、update.jsp 页面导入 webapp 目录（页面代码在后续步骤中给出，非整合流程的关键）。

3）前端控制器 DispatcherServlet

```xml
<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee http://xmlns.jcp.org/xml/ns/javaee/web-app_4_0.xsd"
         version="4.0">


    <!--前端控制器-->
    <servlet>
        <servlet-name>DispatcherServlet</servlet-name>
        <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
        <init-param>
            <param-name>contextConfigLocation</param-name>
            <param-value>classpath:spring-mvc.xml</param-value>
        </init-param>
        <load-on-startup>2</load-on-startup>
    </servlet>
    <servlet-mapping>
        <servlet-name>DispatcherServlet</servlet-name>
        <url-pattern>/</url-pattern>
    </servlet-mapping>


    <!--中文乱码过滤器：解决post方式提交的乱码-->
    <filter>
        <filter-name>CharacterEncodingFilter</filter-name>
        <filter-class>org.springframework.web.filter.CharacterEncodingFilter</filter-class>
        <init-param>
            <param-name>encoding</param-name>
            <param-value>UTF-8</param-value>
        </init-param>
    </filter>
    <filter-mapping>
        <filter-name>CharacterEncodingFilter</filter-name>
        <url-pattern>/*</url-pattern>
    </filter-mapping>

</web-app>
```

4）AccountController和 list.jsp

AccountController：

```java
@Controller
@RequestMapping("/account")
public class AccountController {

  @RequestMapping("/findAll")
  public String findAll(Model model) {
    List<Account> list = new ArrayList<>();
    list.add(new Account(1,"张三",1000d));
    list.add(new Account(2,"李四",1000d));
    model.addAttribute("list", list);
    return "list";
  }
}
```

list.jsp 中的列表片段：

```html
<c:forEach items="${list}" var="account">
  <tr>
    <td>
      <input type="checkbox" name="ids">
    </td>
    <td>${account.id}</td>
    <td>${account.name}</td>
    <td>${account.money}</td>
    <td>
      <a class="btn btn-default btn-sm" href="update.jsp">修改</a>&nbsp;
      <a class="btn btn-default btn-sm" href="">删除</a>
    </td>
  </tr>
</c:forEach>
```

5）springMVC 核心配置文件

```xml
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:mvc="http://www.springframework.org/schema/mvc"
       xmlns:context="http://www.springframework.org/schema/context"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:schemaLocation="http://www.springframework.org/schema/beans
    http://www.springframework.org/schema/beans/spring-beans.xsd
    http://www.springframework.org/schema/mvc
    http://www.springframework.org/schema/mvc/spring-mvc.xsd
    http://www.springframework.org/schema/context
    http://www.springframework.org/schema/context/spring-context.xsd">


    <!--1.组件扫描：只扫描controller-->
    <context:component-scan base-package="com.lagou.controller"></context:component-scan>

    <!--2.mvc注解增强:处理器映射器及处理器适配器-->
    <mvc:annotation-driven></mvc:annotation-driven>


    <!--3.视图解析器-->
    <bean id="resourceViewResolve" class="org.springframework.web.servlet.view.InternalResourceViewResolver">
        <property name="prefix" value="/"></property>
        <property name="suffix" value=".jsp"></property>
    </bean>


    <!--4.放行静态资源-->
    <mvc:default-servlet-handler></mvc:default-servlet-handler>

</beans>
```



### spring 整合 springMVC

1）整合思想

spring和springMVC其实根本就不用整合，本来就是一家。

但是我们需要做到 spring 和 web 容器整合，让 web 容器启动的时候自动加载 spring 配置文件，web 容器销毁的时候 spring 的 ioc 容器也销毁。

2）spring 和 web 容器整合

ContextLoaderListener加载【掌握】

可以使用spring-web包中的ContextLoaderListener监听器，可以监听servletContext容器的创建和销毁，来同时创建或销毁IOC容器。

```xml
<!--配置spring的监听器-->
<listener>
    <listener-class>org.springframework.web.context.ContextLoaderListener</listener-class>
</listener>

<context-param>
    <param-name>contextConfigLocation</param-name>
    <param-value>classpath:applicationContext.xml</param-value>
</context-param>
```

3）修改AccountController

```java
@Controller 
@RequestMapping("/account") 
public class AccountController { 
  
  @Autowired 
  private AccountService accountService; 
  
  @RequestMapping("/findAll") 
  
  public String findAll(Model model) { 
    List<Account> list = accountService.findAll(); 
    model.addAttribute("list", list);
    return "list"; 
  } 
}
```

### spring 配置声明式事务

1）spring 配置文件加入声明式事务

```xml
<!--spring的声明式事务-->
<!--1.事务管理器-->
<bean id="transactionManager" class="org.springframework.jdbc.datasource.DataSourceTransactionManager">
    <property name="dataSource" ref="dataSource"></property>
</bean>

<!--2.开始事务注解的支持-->
<tx:annotation-driven/>
```

2）add.jsp

```html
<form action="${pageContext.request.contextPath}/account/save" method="post">
  <div class="form-group">
    <label for="name">姓名：</label>
    <input type="text" class="form-control" id="name" name="name" placeholder="请输入姓名">
  </div>
  <div class="form-group">
    <label for="money">余额：</label>
    <input type="text" class="form-control" id="money" name="money" placeholder="请输入余额">
  </div>

  <div class="form-group" style="text-align: center">
    <input class="btn btn-primary" type="submit" value="提交"/>
    <input class="btn btn-default" type="reset" value="重置"/>
    <input class="btn btn-default" type="button" onclick="history.go(-1)" value="返回"/>
  </div>
</form>
```

3）AccountController

```java
@RequestMapping("/save") 
public String save(Account account){ 
  accountService.save(account); 
  // 保存之后从新查询
  return "redirect:/account/findAll"; 
}
```

4）AccountService接口和实现类

```java
public void save(Account account);
@Service 
@Transactional public class AccountServiceImpl implements AccountService { 
  @Override 
  public void save(Account account) { 
    accountDao.save(account); 
  } 
}
```



5）AccountDao

```java
void save(Account account);
```



6）AccountDao.xml映射

```xml
<insert id="save" parameterType="Account"> 
  insert into account (name, money) values (#{name}, #{money}) 
</insert>
```

### 修改操作

#### 数据回显

AccountController

```java
@RequestMapping("/findById") 
public String findById(Integer id, Model model) {
  Account account = accountService.findById(id); 
  model.addAttribute("account", account); 
  return "update"; 
}
```

AccountService接口和实现类

```java
Account findById(Integer id);
@Override 
public Account findById(Integer id) { 
  return accountDao.findById(id); 
}
```

AccountDao接口和映射文件

```java
Account findById(Integer id);
```

```xml
<select id="findById" parameterType="int" resultType="Account">
  select * from account where id = #{id}
</select>
```

update.jsp

```html
<form action="${pageContext.request.contextPath}/account/update" method="post">
  <input type="hidden" name="id" value="${account.id}">
  <div class="form-group">
    <label for="name">姓名：</label>
    <input type="text" class="form-control" id="name" name="name" value="${account.name}" placeholder="请输入姓名">
  </div>
  <div class="form-group">
    <label for="money">余额：</label>
    <input type="text" class="form-control" id="money" name="money"  value="${account.money}" placeholder="请输入余额">
  </div>

  <div class="form-group" style="text-align: center">
    <input class="btn btn-primary" type="submit" value="提交" />
    <input class="btn btn-default" type="reset" value="重置" />
    <input class="btn btn-default" type="button" onclick="history.go(-1)" value="返回" />
  </div>
</form>
```

#### 账户更新

AccountController

```java
@RequestMapping("/update") 
public String update(Account account){ 
  accountService.update(account); 
  return "redirect:/account/findAll"; 
}
```

AccountService接口和实现类

```java
void update(Account account);
@Override 
public void update(Account account) { 
  accountDao.update(account);
}
```

AccountDao接口和映射文件

```java
void update(Account account);
```

```xml
<update id="update" parameterType="Account">
  update account set name = #{name},money = #{money} where id = #{id}
</update>
```

### 批量删除

1）list.jsp

```javascript
/*给删除选中按钮绑定点击事件*/
$('#deleteBatchBtn').click(function () {
  if (confirm('您确定要删除吗')) {
    if ($('input[name=ids]:checked').length > 0) {
      /*提交表单*/
      $('#deleteBatchForm').submit();
    }

  } else {
    alert('想啥呢，没事瞎操作啥')
  }
})
```

2）AccountController

```java
@RequestMapping("/deleteBatch") 
public String deleteBatch(Integer[] ids) { 
  
  accountService.deleteBatch(ids); 
  
  return "redirect:/account/findAll";
  
}
```

3）AccountService接口和实现类

```java
void deleteBatch(Integer[] ids);
@Override 
public void deleteBatch(Integer[] ids) { 
  accountDao.deleteBatch(ids); 
}
```

4）AccountDao接口和映射文件

```java
void deleteBatch(Integer[] ids);
```

```xml
<delete id="deleteBatch" parameterType="int">
  delete from account
  <where>
    <foreach collection="array" open="id in(" close=")" separator="," item="id">
      #{id}
    </foreach>
  </where>
</delete>
```

## 版本差异(SSM 整合 → Spring Boot 3.5.x)

| 特性 | 旧版（SSM 手动整合） | 当前（Spring Boot 3.5.x） |
|------|----------------------|--------------------------|
| Servlet API | javax.servlet（Servlet 4.x 及以前） | jakarta.servlet（Servlet 6.0，Boot 3 强制） |
| Spring 版本 | Spring 5.x | Spring 6.2.x |
| mybatis-spring | 2.x | 3.x（对应 Boot 3） |
| 整合方式 | 手写 web.xml + Spring XML + MyBatis 配置 | 自动配置 + 注解，无需 XML |
| 事务 | 手动配置 DataSourceTransactionManager | 自动配置，@Transactional 即可 |

> SSM 手动整合是理解 Spring 容器与 MyBatis 协作原理的经典教材，但新项目建议直接使用 Spring Boot 3.5.x + mybatis-spring-boot-starter 3.x；升级旧项目时重点处理 javax→jakarta 包名迁移与依赖坐标替换。
