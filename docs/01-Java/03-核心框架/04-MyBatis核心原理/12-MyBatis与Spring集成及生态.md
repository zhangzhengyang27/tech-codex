---
title: "MyBatis 与 Spring 集成及衍生框架"
description: "MyBatis 与 Spring 集成原理（SqlSessionFactoryBean、Mapper 扫描）及衍生框架 MyBatis-Plus、Generator、分页插件。"
keywords: ["Spring 集成", "SqlSessionFactoryBean", "MapperScan", "MyBatis-Plus", "Generator"]
category: "Java"
tags: [Java, MyBatis]
---

# MyBatis 与 Spring 集成及衍生框架

在实际开发过程中，一般我们不会只使用单个的开源框架，而是会使用多种开源框架和开源工具相互配合来实现需求。在 Java 世界中，最出名的开源框架就要数 Spring 了。Spring 是 2002 年出现的一个轻量级 Java 框架，它最开始就是为了替换掉 EJB 这种复杂的企业开发框架。时至 2021 年，几乎所有的 Java 后端项目都会使用到 Spring，Spring 已经成为业界标准，我们在**实践中常用的 SSM 三层架构其实就是 Spring、Spring MVC和MyBatis这三个核心框架的简称**。

搭建一个 SSM 环境是非常简单的，本文不仅要搭建 SSM 开发环境，还要深入剖析这三个框架能够协同工作的原理。不过，在开始讲解 SSM 开发环境搭建之前，我们先来了解一下 Spring 和 Spring MVC 的基础知识。

## Spring

Spring 中最核心的概念就要数 IoC 了。IoC（Inversion of Control，**控制反转**）的核心思想是将业务对象交由 IoC 容器管理，由 IoC 容器控制业务对象的初始化以及不同业务对象之间的依赖关系，这样就可以降低代码的耦合性。

**依赖注入**（Dependency Injection）是实现 IoC 的常见方式之一。依赖注入，就是我们的系统不再主动维护业务对象之间的依赖关系，而是将依赖关系转移到 IoC 容器中动态维护。Spring 提供了依赖注入机制，我们只需要通过 XML 配置或注解，就可以确定业务对象之间的依赖关系，轻松实现业务逻辑的组合。

Spring 中另一个比较重要的概念是 AOP（Aspect Oriented Programming），也就是**面向切面编程**。它是面向对象思想的补充和完善，毕竟在面对一个问题的时候，从更多的角度、用更多的思维模型去审视问题，才能更好地解决问题。

在面向对象的思想中，我们关注的是代码的封装性、类间的继承关系和多态、对象之间的依赖关系等，通过对象的组合就可以实现核心的业务逻辑，但是总会有一些重要的重复性代码散落在业务逻辑类中，例如，权限检测、日志打印、事务管理相关的逻辑，这些重复逻辑与我们的核心业务逻辑并无直接关系，却又是系统正常运行不能缺少的功能。

AOP 可以帮我们将这些碎片化的功能抽取出来，封装到一个组件中进行重用，这也被称为切面。**通过 AOP 的方式，可以有效地减少散落在各处的碎片化代码，提高系统的可维护性**。为了方便你后面理解 Spring AOP 的代码，这里我梳理一下 AOP 中的几个关键概念。

横切关注点：如果某些业务逻辑代码横跨业务系统的多个模块，我们可以将这些业务代码称为横切关注点。

切面：对横切关注点的抽象。面向对象思想中的类是事物特性的抽象，与之相对的切面则是对横切关注点的抽象。

连接点：业务逻辑中的某个方法，该方法会被 AOP 拦截。

切入点：对连接点进行拦截的定义。

通知：拦截到连接点之后要执行的代码，可以分为5类，分别是前置通知、后置通知、异常通知、最终通知和环绕通知。

## Spring MVC

Spring MVC 是 Spring 生态中的一个 Web 框架，也是现在市面上用得最多的 Web 框架，其**底层的核心设计思想就是经典的 MVC 架构模式**。

 MVC 架构模式指的就是 Model、View和Controller 三部分，其中，Model 负责封装业务逻辑以及业务数据；View 只负责展示数据，其中不包含任何逻辑代码或只会包含非常简单的、与展示相关的逻辑控制代码；Controller 用来接收用户发起的请求，调用设计的 Service 层来完成具体的业务逻辑，产生的数据会返回到 View上进行展示。下图展示了 MVC 架构中三个核心组件的关系：

![](/mybatis-course-images/21-深挖_MyBatis_与_Spring_集成底层原理__CioPOWBm42OAMsTnAAB8rm0kBPE187.png)

在 Spring MVC 框架中，Model 层一般使用普通的 Service Bean 对象，View 层目前常用的是一些前端框架，以实现更好的渲染效果，Controller 是由 Spring MVC 特殊配置过的 Servlet，它会将用户请求分发给 Model，将响应转发给 View。

了解了 SpringMVC核心思想之后，我们再进一步分析Spring MVC 工作的核心原理。

**DispatcherServlet 是 Spring MVC 中的前端控制器**，也是 Spring MVC 内部非常核心的一个组件，负责 Spring MVC 请求的调度。当 Spring MVC 接收到用户的 HTTP 请求之后，会由 DispatcherServlet 进行截获，然后根据请求的 URL 初始化 WebApplicationContext（上下文信息），最后转发给业务的 Controller 进行处理。待 Controller 处理完请求之后，DispatcherServlet 会根据返回的视图名称选择具体的 View 进行渲染。

下图展示了 Spring MVC 处理一次 HTTP 请求的完整流程：

![](/mybatis-course-images/21-深挖_MyBatis_与_Spring_集成底层原理__CioPOWBm4tWAJ8Q7AADjcFqA6pg123.png)

可以看到，Spring MVC 框架处理 HTTP 请求的核心步骤如下。

用户的请求到达服务器后，经过HTTP Server 处理得到 HTTP Request 对象，并传到 Spring MVC 框架中的 DispatcherServlet 进行处理。

DispatcherServlet 在接收到请求之后，会根据请求查找对应的 HandlerMapping，在 HandlerMapping 中维护了请求路径与 Controller 之间的映射。

DispatcherServlet 根据步骤 2 中的 HandlerMapping 拿到请求相应的 Controller ，并将请求提交到该 Controller 进行处理。Controller 会调用业务 Service 完成请求处理，得到处理结果；Controller 会根据 Service 返回的处理结果，生成相应的 ModelAndView 对象并返回给 DispatcherServlet。

DispatcherServlet 会从 ModelAndView 中解析出 ViewName，并交给 ViewResolver 解析出对应的 View 视图。

DispatcherServlet 会从 ModelAndView 中拿到 Model（在 Model 中封装了我们要展示的数据），与步骤 4 中得到的 View 进行整合，得到最终的 Response 响应。

## SSM 环境搭建

了解了 Spring 以及 Spring MVC 的基本概念之后，我们开始搭建 SSM 的开发环境（建议结合示例代码一起学习，效果更佳），最终搭建的SSM 项目结构如下图所示：

![](/mybatis-course-images/21-深挖_MyBatis_与_Spring_集成底层原理__Cgp9HWBm4oyAb_0sAAGjG5-F_08343.png)

首先，在 IDEA 中创建一个新的 Maven Web 项目，具体选项如下图所示：

![](/mybatis-course-images/21-深挖_MyBatis_与_Spring_集成底层原理__CioPOWBm4nqAPHJhAAZEuIjSepQ931.png)

选择 Web 类型的 Maven 项目

Maven 项目创建完成之后，我们就可以编写项目中的核心配置文件。

第一个是 web.xml 配置文件。其中指定了初始化 Spring 上下文的 ContextLoaderListener 监听器，在 Spring 初始化过程中，ContextLoaderListener会读取Spring 的 XML 配置文件，这里通过 contextConfigLocation 参数就可以指定applicationContext.xml 配置文件的位置。另外，web.xml 中还会配置Spring MVC 中的 DispatcherServlet，这里同样需要指定 Spring MVC 要读取的 XML 配置文件地址。

第二个是Spring 初始化时读取的 applicationContext.xml 配置文件，这里简单说明其中的几个关键 Bean。

DriverManagerDataSource 数据源，这是 Spring 提供的一个数据源实现，它连接的数据库信息定义在 datasource.properties 配置文件中。

SqlSessionFactoryBean，这个工厂 Bean 是 Spring 与 MyBatis 集成的关键，在后面分析两者集成原理的时候会深入该类的实现。我们这里为 SqlSessionFactoryBean 指定了三个属性：dataSource 属性指向了上面的 DriverManagerDataSource Bean，configLocation 指向了 mybatis-config.xml 全局配置文件，typeAliasesPackage 指向了要扫描的包名，该包内的 Java 类的类名会被作为该类的别名。

MapperScannerConfigurer，这个是用来扫描 MyBatis 中的 Mapper.xml 配置文件的扫描器，在后面分析 Spring 与 MyBatis 集成原理的时候也会深入该类的实现。

DataSourceTransactionManager，这是 Spring 提供的事务管理器，会与下面的 AOP 配置一起完成事务的管理。事务相关的 AOP 配置示例如下：

```
<!-- 定义个通知，指定事务管理器控制事务 -->
<tx:advice id="txAdvice" transaction-manager="txManager">
    <tx:attributes>
        <!-- propagation属性指定了事务的传播属性，即在拦截到save开头的方法时，必须在一个事务的上下文中，如果没有事务的话，需要新开启事务，rollback-for属性表示遇到异常时回滚事务，read-only表示当前操作不是一个只读操作，会修改数据 -->
        <tx:method name="save*" propagation="REQUIRED"
                   read-only="false"
                   rollback-for="java.lang.Exception"/>
        <!-- 省略其他方法的配置 -->
    </tx:attributes>
</tx:advice>
<aop:config>
    <!-- 配置一个切入点，将会拦截org.example包中以ServiceImpl结尾的类的全部方法-->
    <aop:pointcut id="serviceMethods"
                  expression="execution(* org.example.*ServiceImpl.*(..))"/>
    <aop:advisor advice-ref="txAdvice" pointcut-ref="serviceMethods"/>
</aop:config>

```

除了上述 Spring Bean 的配置之外，我们还要配置 Spring 自动扫描功能，不过需要注意的是，这里需要指明不扫描 @Controller 注解修饰的 Bean。

我们可以在Spring MVC 的配置文件中看到，@Controller 修饰的 Bean将会由 Spring MVC 的上下文完成加载。另外，该示例代码使用 JSP 作为前端界面，所以我们需要在 Spring MVC 配置文件中配置一个 UrlBasedViewResolver 来解析 viewName 与 JSP 页面的映射。

SSM 开发环境中最核心的配置就介绍完了，关于其完整配置，你可以参考 SSM 的示例代码进行分析。在这份示例代码中，除了上述介绍的配置之外，还提供了一个简单的登录示例，其中的 UserBean 抽象了用户基本信息，例如用户名、密码；UserMapper 接口和 UserMapper.xml 实现了 DAO 层，实现了基本的数据库操作；ILoginService 接口和 LoginServiceImpl 实现类构成了 Service 层，完成了登录这个业务逻辑；LoginController 则是 Controller 层的实现，依赖 Service 层完成登录业务之后，会控制页面的跳转；最后，还有两个 JSP 页面用来展示用户登录前后的数据。这些内容就留给你自己分析了。

## Spring 集成 MyBatis 原理剖析

在搭建 SSM 开发环境的时候，我们引入了一个 mybatis-spring-*.jar 的依赖，这个依赖是 Spring 集成 MyBatis 的关键所在，该依赖内部会将 MyBatis 管理的事务交给 Spring 的事务管理器进行管理，同时还会由 Spring IoC 容器来控制 SqlSession 对象的注入。

下面来看一下 Spring 集成 MyBatis 的几个关键实现。

### 1. SqlSessionFactoryBean

在搭建 SSM 环境的时候，我们会在 applicationContext.xml 中配置一个 SqlSessionFactoryBean，其核心作用就是**读取 MyBatis 配置，初始化 Configuration 全局配置对象，并创建 SqlSessionFactory 对象**，对应的核心方法是 buildSqlSessionFactory() 方法。

下面是 buildSqlSessionFactory() 方法的核心代码片段：

```java
protected SqlSessionFactory buildSqlSessionFactory() throws IOException {
    Configuration configuration;
    XMLConfigBuilder xmlConfigBuilder = null;
    if (this.configLocation != null) {
        // 创建XMLConfigBuilder对象，读取指定的配置文件
        xmlConfigBuilder = new XMLConfigBuilder(this.configLocation.getInputStream(),
            null, this.configurationProperties);
        configuration = xmlConfigBuilder.getConfiguration();
    } else {
        // 其他方式初始化Configuration全局配置对象
    }
    // 下面会根据前面介绍的初始化流程，初始化MyBatis的相关配置和对象，其中包括：
    // 扫描typeAliasesPackage配置指定的包，并为其中的类注册别名
    // 注册plugins集合中指定的插件
    // 扫描typeHandlersPackage指定的包，并注册其中的TypeHandler
    // 配置缓存、配置数据源、设置Environment等一系列操作
    if (this.transactionFactory == null) {
        // 默认使用的事务工厂类
        this.transactionFactory = new SpringManagedTransactionFactory();
    }

// 根据mapperLocations配置，加载Mapper.xml映射配置文件以及对应的Mapper接口
    for (Resource mapperLocation : this.mapperLocations) {
        XMLMapperBuilder xmlMapperBuilder = new XMLMapperBuilder(...);
        xmlMapperBuilder.parse();
    }
    // 最后根据前面创建的Configuration全局配置对象创建SqlSessionFactory对象
    return this.sqlSessionFactoryBuilder.build(configuration);
}

```

### 2. SpringManagedTransaction

通过对 SqlSessionFactoryBean 的分析我们可以看出，在 SSM 集成环境中默认使用 SpringManagedTransactionFactory 这个 TransactionFactory 接口实现来创建 Transaction 对象，其中创建的 Transaction 对象是 SpringManagedTransaction。需要说明的是，这里的 Transaction 和 TransactionFactory 接口都是 MyBatis 中的接口。

SpringManagedTransaction 中除了维护事务关联的数据库连接和数据源之外，还维护了一个 isConnectionTransactional 字段（boolean 类型）用来标识当前事务是否由 Spring 的事务管理器管理，这个标识会控制 commit() 方法和rollback() 方法是否真正提交和回滚事务，相关的代码片段如下：

```java
public void commit() throws SQLException {
    if (this.connection != null && !this.isConnectionTransactional && !this.autoCommit){
        // 当事务不由Spring事务管理器管理的时候，会立即提交事务，否则由Spring事务管理器管理事务的提交和回滚
        this.connection.commit();
    }
}

```

### 3. SqlSessionTemplate

当 Spring 集成 MyBatis 使用的时候，SqlSession 接口的实现不再直接使用 MyBatis 提供的 DefaultSqlSession 默认实现，而是使用 SqlSessionTemplate，如果我们没有使用 Mapper 接口的方式编写 DAO 层，而是直接使用 Java 代码手写 DAO 层，那么我们就可以使用 SqlSessionTemplate。

**SqlSessionTemplate 是线程安全的，可以在多个线程之间共享使用。**

SqlSessionTemplate 内部持有一个 SqlSession 的代理对象（sqlSessionProxy 字段），这个代理对象是通过 JDK 动态代理方式生成的；使用的 InvocationHandler 接口是 SqlSessionInterceptor，其 invoke() 方法会拦截 SqlSession 的全部方法，并检测当前事务是否由 Spring 管理。相关代码片段如下：

```java
public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
    // 通过静态方法SqlSessionUtils.getSqlSession()获取SqlSession对象
    SqlSession sqlSession = SqlSessionUtils.getSqlSession(
            SqlSessionTemplate.this.sqlSessionFactory,
            SqlSessionTemplate.this.executorType,
            SqlSessionTemplate.this.exceptionTranslator);
    // 调用SqlSession对象的相应方法
    Object result = method.invoke(sqlSession, args);
    // 检测事务是否由Spring进行管理，并据此决定是否提交事务
    if (!isSqlSessionTransactional(sqlSession,
             SqlSessionTemplate.this.sqlSessionFactory)) {
        sqlSession.commit(true);
    }
    return result; // 返回操作结果
}

```

这里使用的SqlSessionUtils.getSqlSession() 方法会尝试从 Spring 事务管理器中获取 SqlSession对象并返回，如果获取失败，则新建一个 SqlSession 对象并交由 Spring 事务管理器管理，同时将这个 SqlSession 返回。

SqlSessionDaoSupport 实现了 Spring DaoSupport 接口，核心功能是辅助我们手写 DAO 层的代码。SqlSessionDaoSupport 内部持有一个 SqlSessionTemplate 对象（sqlSession字段），并提供了getSqlSession() 方法供子类获取该 SqlSessionTemplate 对象，所以我们**在手写 DAO 层代码的时候，可以通过继承 SqlSessionDaoSupport 这个抽象类的方式，拿到 SqlSessionTemplate 对象，实现访问数据库的相关操作**。

### 4. MapperFactoryBean 与 MapperScannerConfigurer

使用 SqlSessionDaoSupport 或 SqlSessionTemplate 编写 DAO 毕竟是需要我们手写代码的，为了进一步简化 DAO 层的实现，我们可以通过 MapperFactoryBean 直接将 Mapper 接口注入 Service 层的 Bean 中，**由 Mapper 接口完成 DAO 层的功能**。

下面是一段 MapperFactoryBean 的配置示例：

```
<!-- 配置id为customerMapper的Bean -->
<bean id="customerMapper" class="org.mybatis.spring.mapper.MapperFactoryBean">
   <!-- 配置Mapper接口 -->
   <property name="mapperInterface" value="com.example.mapper.CustomerMapper" />
   <!-- 配置SqlSessionFactory，用于创建底层的SqlSessionTemplate -->
   <property name="sqlSessionFactory" ref="sqlSessionFactory" />
</bean>

```

在 MapperFactoryBean 这个 Bean 初始化的时候，会加载 mapperInterface 配置项指定的 Mapper 接口，并调用 Configuration.addMapper() 方法将 Mapper 接口注册到 MapperRegistry，在注册过程中同时会解析对应的 Mapper.xml 配置文件。这个注册过程以及解析 Mapper.xml 配置文件的过程，在前面初始化章节中我们已经分析过了，这里不再重复。

完成 Mapper 接口的注册之后，我们就可以通过 MapperFactoryBean.getObject() 方法获取相应 Mapper 接口的代理对象，相关代码片段如下：

```java
public T getObject() throws Exception {
  // 这里通过SqlSession.getMapper()方法获取Mapper接口的代理对象
  return getSqlSession().getMapper(this.mapperInterface);
}

```

虽然通过 MapperFactoryBean 可以不写一行 Java 代码就能实现 DAO 层逻辑，但还是需要在 Spring 的配置文件中为每个 Mapper 接口配置相应的 MapperFactoryBean，这依然是有一定工作量的。如果连配置信息都不想写，那我们就可以使用 MapperScannerConfigurer 扫描指定包下的全部 Mapper 接口，这也是我们在前文 SSM 开发环境中使用的方式。

这里我们看一下 MapperScannerConfigurer 的实现。MapperScannerConfigurer 实现了 BeanDefinitionRegistryPostProcessor 接口，在 Spring 容器初始化的时候会触发其 postProcessBeanDefinitionRegistry() 方法，完成扫描逻辑，其核心代码逻辑如下：

```java
public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) {
    if (this.processPropertyPlaceHolders) {
        // 解析Spring配置文件中MapperScannerConfigurer配置的占位符
        processPropertyPlaceHolders();
    }
    // 创建ClassPathMapperScanner
    ClassPathMapperScanner scanner = new ClassPathMapperScanner(registry);
    // 根据配置信息决定ClassPathMapperScanner如何扫描指定的包，也就是确定扫描的过滤条件，例如，有几个包需要扫描、是否关注Mapper接口的注解、是否关注Mapper接口的父类等
    // 开始扫描basePackage字段中指定的包及其子包
    scanner.scan(StringUtils.tokenizeToStringArray(this.basePackage,
       ConfigurableApplicationContext.CONFIG_LOCATION_DELIMITERS));
}

```

ClassPathMapperScanner.scan() 这个扫描方法底层会调用其 doScan() 方法完成扫描，扫描过程中首先会遍历配置中指定的所有包，并根据过滤条件得到符合条件的BeanDefinitionHolder 对象；之后对这些 BeanDefinitionHolder 中记录的 Bean 类型进行改造，改造成 MapperFactoryBean 类型，同时填充 MapperFactoryBean 初始化所需的信息。这样就可以在 Spring 容器初始化的时候，为扫描到的 Mapper 接口创建对应的 MapperFactoryBean，从而进一步降低DAO 的编写成本。

在前面的内容中，我们深入分析了 MyBatis 的内核，了解了 MyBatis 处理一条 SQL 的完整流程，剖析了 MyBatis 中动态 SQL、结果集映射、缓存等核心功能的实现原理。在日常工作中，除了单纯使用 MyBatis 之外，还可能会涉及 MyBatis 的衍生框架，本文就来介绍一下工作中常用的 MyBatis 衍生框架。

## MyBatis-Generator

虽然使用 MyBatis 编写 DAO 层已经非常方便，但是我们还是要编写 Mapper 接口和相应的 Mapper.xml 配置文件。为了进一步节省编码时间，我们**可以选择 MyBatis-Generator 工具自动生成 Mapper 接口和 Mapper.xml 配置文件**。

这里我们通过一个简单示例介绍一下 MyBatis-Generator 工具的基本功能。

MyBatis-Generator 目前最新的版本是 1.4.0 版本，首先我们需要下载这个最新的 zip 包，并进行解压，得到 mybatis-generator-core-1.4.0.jar 这个 jar 包。

由于我们本地使用的是 MySQL 数据库，所以需要准备一个 mysql-connector-java 的 jar 包，我们可以从本地的 Maven 仓库中获得，具体的目录是：.m2/repository/mysql/mysql-connector-java/，在这个目录中选择一个最新版本的 jar 包拷贝到 mybatis-generator-core-1.4.0.jar 同目录下。

接下来，我们需要编写一个 generatorConfig.xml 配置文件，其中会告诉 MyBatis-Generator 去连接哪个数据库、连接数据库的用户名和密码分别是什么、需要根据哪些表生成哪些配置文件和类，以及这些生成文件的存放位置。下面是一个 generatorConfig.xml 配置文件的完整示例：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE generatorConfiguration
        PUBLIC "-//mybatis.org//DTD MyBatis Generator Configuration 1.0//EN"
        "http://mybatis.org/dtd/mybatis-generator-config_1_0.dtd">
<generatorConfiguration>
    <!-- 使用的数据库驱动jar包 -->
    <classPathEntry location="mysql-connector-java-8.0.22.jar"/>
    <!-- 指定数据库地址、数据库用户名和密码 -->
    <context id="DB2Tables" targetRuntime="MyBatis3">
        <jdbcConnection driverClass="com.mysql.cj.jdbc.Driver"
                connectionURL="jdbc:mysql://localhost:3306/test"
                userId="root"  password="xxx">
        </jdbcConnection>
        <javaTypeResolver>
            <property name="forceBigDecimals" value="false"/>
        </javaTypeResolver>
        <!-- 生成的Model类存放位置 -->
        <javaModelGenerator targetPackage="org.example" targetProject="src">
            <!-- 是否支持生成子package -->
            <property name="enableSubPackages" value="true"/>
            <!-- 对String进行操作时，会添加trim()方法进行处理 -->
            <property name="trimStrings" value="true"/>
        </javaModelGenerator>
        <!-- 生成的Mapper.xml映射配置文件的存放位置-->
        <sqlMapGenerator targetPackage="org.example.mapper" targetProject="src">
            <property name="enableSubPackages" value="true"/>
        </sqlMapGenerator>
        <!-- 生成的Mapper接口的存放位置-->
        <javaClientGenerator type="XMLMAPPER" targetPackage="org.example.mapper"
                     targetProject="src">
            <property name="enableSubPackages" value="true"/>
        </javaClientGenerator>
        <!-- 数据库表与Model类之间的映射关系，根据t_customer表进行映射-->
        <table schema="test" tableName="t_customer" domainObjectName="Customer"
               enableCountByExample="false" enableUpdateByExample="false"
               enableDeleteByExample="false"
               enableSelectByExample="false" selectByExampleQueryId="false">
        </table>
    </context>
</generatorConfiguration>

```

然后，我们准备一下数据库中的表，在 MySQL 中建立一个 test 数据库，并创建 t_customer 表，使用到的建库建表语句如下：

```
create database test; # 创建数据库
use test;
DROP TABLE IF EXISTS `t_customer`; # 删除已有的t_customer表
CREATE TABLE `t_customer` ( # 创建t_customer表
  `id` int(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `account` bigint(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

```

最后，我们在 mybatis-generator-core-1.4.0.jar 包同目录下新建一个 src 目录，存放生成的代码，然后执行如下命令，逆向生成需要的代码：

```
java -jar mybatis-generator-core-1.4.0.jar -configfile generatorConfig.xml

```

命令正常执行完成之后，可以看到 src 目录下生成的文件如下图所示：

![](/mybatis-course-images/22-基于_MyBatis_的衍生框架一览__CioPOWBtTDqAYagkAABmeFv2Z84519.png)

MyBatis-Generator 工具类生成结果图

生成的 Customer.java 类是一个 Model 类（或者说 Domain 类），包含了 id、name、password、account 属性；CustomerMapper.xml 是 Customer 对应的 Mapper.xml 配置文件，其中定义了按照 id 进行查询和删除的 select、delete 语句，以及全字段写入和更新的 insert、update 语句；CustomerMapper 接口中包含了与 CustomerMapper.xml 对应的方法。该示例中生成的代码并不复杂，在你生成代码之后，你可以自己分析一下。

## MyBatis 分页插件

MyBatis 本身提供了 RowBounds 参数，可以实现分页的效果，但是在前面[结果集映射机制](08-结果集映射.md)中我们提到过，通过 RowBounds 方式实现分页的时候，本质是将整个结果集数据加载到内存中，然后在内存中过滤出需要的数据，这其实也是我们常说的“内存分页”。而真正的分页是为了解决数据量太大，无法直接加载到内存或无法直接传输的问题，显然“内存分页”并没有解决这个问题。

你如果用过 MySQL 的话，应该知道我们常用 limit 方式进行分页，例如下面这条 select 语句：

```
select * from t_customer limit 5,10;

```

使用 Oracle 实现分页时，则需要用 rownum 实现，可见在不同数据库中实现物理分页的写法各不相同。

如果我们想屏蔽底层数据库的分页 SQL 语句的差异，同时使用 MyBatis 的 RowBounds 参数实现“物理分页”，可以考虑使用 MyBatis 的分页插件PageHelper。PageHelper 的使用比较简单，只需要在 pom.xml 中引入 PageHelper 依赖包，并在 mybatis-config.xml 配置文件中配置 PageInterceptor 插件即可，核心配置如下：

```
<plugins>
    <plugin interceptor="com.github.pagehelper.PageInterceptor">
        <property name="helperDialect" value="mysql"/>
	</plugin>
</plugins>

```

**PageHelper 核心原理是使用 MyBatis 的插件机制，整个插件的入口是在 PageInterceptor**。

在 PageInterceptor 初始化的时候，会根据配置的 helperDialect 属性以及 MyBatis 使用的 JDBC URL 信息确定底层连接的数据库类型，并创建一个 Dialect 对象。我们可以再来看 PageInterceptor 的注解信息，会发现 PageInterceptor 会拦截 Executor 中带有 RowBounds 参数的两个查询方法。拦截到目标方法之后，PageInterceptor.intercept() 方法会通过 Dialect 对象完成分页操作，核心代码如下：

```
List resultList;
// 判断是否需要进行分页
if (!dialect.skip(ms, parameter, rowBounds)) {
    // 是否需要查询总记录数，这可以帮助我们显示总页数
    if (dialect.beforeCount(ms, parameter, rowBounds)) {
        // 查询总记录数
        Long count = count(executor, ms, parameter, rowBounds, null, boundSql);
        // 处理查询总记录数，返回true时继续分页查询，false时直接返回，会返回false的原因很多，可能是count为0，或是当前已经到最后一页等原因
        if (!dialect.afterCount(count, parameter, rowBounds)) {
            return dialect.afterPage(new ArrayList(), parameter, rowBounds);
        }
    }
    // 执行分页查询
    resultList = ExecutorUtil.pageQuery(dialect, executor,
            ms, parameter, rowBounds, resultHandler, boundSql, cacheKey);
} else {
    // 如果不需要，直接交给Executor执行查询，返回结果
    resultList = executor.query(ms, parameter, rowBounds, resultHandler, cacheKey, boundSql);
}
// 在afterPage()方法中会完成总页数的计算等后置操作
return dialect.afterPage(resultList, parameter, rowBounds);

```

通过对 PageInterceptor 的分析我们看到，**核心的分页逻辑都是在 Dialect 中完成的**，PageHelper 针对每个数据库都提供了一个 Dialect 接口实现。下图展示了 MySQL 数据库对应的 Dialect 接口实现：

![](/mybatis-course-images/22-基于_MyBatis_的衍生框架一览__Cgp9HWBtTFKAVlWCAACyAbYHCQg938.png)

MySqlDialect 的继承关系图

在上图中，PageHelper 是一个通用的 Dialect 实现，会将上述分页操作委托给当前线程绑定的 Dialect 实现进行处理，这主要是靠其中的 autoDialect 字段（PageAutoDialect 类型）实现的。AbstractDialect 中只提供了一个生成“查询总记录数”SQL 语句（即 select count(*) 语句）的功能。

AbstractRowBoundsDialect 这条继承线是针对 RowBounds 进行分页的 Dialect 实现，其中会根据 RowBounds 实现 Dialect 接口，例如，在 MySqlRowBoundsDialect 中的 getPageSql() 方法实现中会改写 SQL 语句，添加 limit 子句，其中的 offset、limit 参数均来自传入的 RowBounds 参数。

如果没有用 RowBounds 参数进行分页，而是在传入的 SQL 语句绑定实参（即 Executor.query() 方法的第二个参数 parameter）中指定 pageNum、pageSize 等分页信息，则会走 AbstractHelperDialect 这条继承线。在 PageObjectUtil 这个工具类中，会从绑定实参中解析出分页信息并封装成 Page 对象，然后传递给 AbstractHelperDialect 完成分页操作。例如，在 MySqlDialect 实现中的 getPageSql() 方法和 processPageParameter() 方法，都会从 Page 参数中获取分页信息，这两个方法的具体实现就留给你自己分析了。

到此为止，PageHelper 分页插件中的分页功能就介绍完了，除了基本的分页功能，PageHelper 还提供了分页使用的缓存等相关能力，这里就不再展开详细分析了，你若感兴趣的话可以下载其源码进行深入分析。

## MyBatis-Plus

MyBatis-Plus 是国人开发的一款 MyBatis 增强工具，通过其名字就能看出，**它并没有改变 MyBatis 本身的功能，而是在 MyBatis 的基础上提供了很多增强功能，使我们的开发更加简洁高效**。也正是由于其“只做增强不做改变”的特性，让我们可以在使用 MyBatis 的项目中无感知地引入 MyBatis-Plus。

MyBatis-Plus 对 MyBatis 的很多方面进行了增强，例如：

内置了通用的 Mapper 和通用的 Service，只需要添加少量配置即可实现 DAO 层和 Service 层；

内置了一个分布式唯一 ID 生成器，可以提供分布式环境下的 ID 生成策略；

通过 Maven 插件可以集成生成代码能力，可以快速生成 Mapper、Service 以及 Controller 层的代码，同时支持模块引擎的生成；

内置了分页插件，可以实现和 PageHelper 类似的“物理分页”，而且分页插件支持多种数据库；

内置了一款性能分析插件，通过该插件我们可以获取一条 SQL 语句的执行时间，可以更快地帮助我们发现慢查询。

既然 MyBatis-Plus 在 MyBatis 之上提供了这么多的扩展，那么我们就来快速上手体验一下 MyBatis-Plus。这里我们依旧选用 MySQL 数据库，复用上面介绍 MyBatis-Generator 示例时用到的 test 库和 t_customer 表。

首先，新建一个 Spring Boot 项目，这里我们可以使用 Spring 官网提供的项目生成器快速生成，导入 IDEA 之后会发现 Spring Boot 的配置和启动类都已经生成好了，如下图所示：

![](/mybatis-course-images/22-基于_MyBatis_的衍生框架一览__Cgp9HWBtTGCAB50qAADaNi9sMew051.png)

我们打开 pom.xml 文件，看到其中已经自动添加了 Spring Boot 的全部依赖，此时只需要添加 mysql-connector-java 依赖以及 MyBatis-Plus 依赖即可（写作时示例使用 3.4.2，最新为 3.5.x；Boot 3 项目应改用 mybatis-plus-spring-boot3-starter）：

```
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-boot-starter</artifactId>
    <version>3.4.2</version>
</dependency>
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
</dependency>

```

接着，我们修改 application.properties 文件，添加数据库的相关配置：

```
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.url=jdbc:mysql://localhost:3306/test?useUnicode=true&characterEncoding=UTF-8
spring.datasource.username=root
spring.datasource.password=xxx

```

然后，我们开始编写 Customer 类和 CustomerMapper 接口，这两个类非常简单，Customer 类中需要定义 t_customer 表中各列对应的属性，如下所示：

```java
@TableName(value = "t_customer") // 通过@TableName注解，指定Customer与 t_customer表的关联关系
public class Customer {
    private Integer id;
    private String name;
    private String password;
    private Long account;
    // 省略上述字段的getter/setter方法，以及toString()方法
}

```

CustomerMapper 接口的定义更加简单，只需要继承 BaseMapper 即可，具体定义如下：

```java
public interface CustomerMapper extends BaseMapper<Customer> {
  // 无须提供任何方法定义，而是从BaseMapper继承
}

```

最后，我们修改一下这个 Spring Boot 项目的启动类 DemoApplication，在其中添加 @MapperScan 注解指定 Mapper 接口所在的包，该注解会自动进行扫描，DemoApplication 的具体实现如下：

```java
@SpringBootApplication
@MapperScan("com.example.demo.mapper")
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}

```

完成上述示例的编写之后，我们可以添加一个测试用例来查询 t_customer 表中的数据，具体实现如下：

```java
@RunWith(SpringRunner.class)
@SpringBootTest
class DemoApplicationTests {
    @Autowired
    private CustomerMapper customerMapper;
    @Test
    public void testSelect() {
        Customer customer = new Customer();
        customer.setId(1);
        customer.setName("Bob");
        customer.setPassword("pwd");
        customer.setAccount(10097L);
        int insert = customerMapper.insert(customer);
        System.out.println("affect row num:" + insert);
        List<Customer> userList = customerMapper.selectList(null);
        userList.forEach(System.out::println);
    }
}

```

执行该单元测试之后，得到如下输出：

```
affect row num:1
Customer{id=1, name='Bob', password='pwd', account=10097}

```

MyBatis-Plus 的基础使用示例就介绍到这里了。另外，MyBatis-Plus官方文档中还提供了很多核心功能的说明和介绍，同时 MyBatis-Plus 还提供了示例 GitHub 仓库，其中包含了非常多的 MyBatis-Plus 示例代码和使用技巧，非常值得你参考。

## 版本差异(旧版 → MyBatis 3.5.x / Spring Boot 3.5.x)

| 特性 | 旧版（Spring Boot 2.x 时代） | Spring Boot 3.5.x 时代 |
|------|------------------------------|------------------------|
| 集成依赖 | mybatis-spring-boot-starter 2.x | mybatis-spring-boot-starter 3.0.x+（对应 Boot 3） |
| 包名 | javax.* | jakarta.*（Boot 3 强制迁移） |
| 测试注解 | @RunWith(SpringRunner.class) + JUnit 4 | JUnit 5 下可省略 @RunWith，使用 @SpringBootTest 即可 |
| MyBatis-Plus 依赖 | mybatis-plus-boot-starter | mybatis-plus-spring-boot3-starter（3.5.x 起专为 Boot 3 提供） |
| @MapperScan | 机制不变 | 机制不变，仍为推荐方式 |
| 事务管理 | @Transactional（org.springframework.*） | 包名不变，与 Boot 3 事务管理无缝集成 |
| 虚拟线程 | 无 | Boot 3.2+ 可启用 spring.threads.virtual.enabled=true，阻塞式 JDBC 调用可直接运行 |

> 本文中的 @RunWith(SpringRunner.class) 属于 JUnit 4 时代写法；在 Spring Boot 3.5.x + JUnit 5 环境中直接使用 `@SpringBootTest` 即可，无需额外注解。升级到 Boot 3 时，除依赖坐标变更外，只需将业务代码中的 javax.* 导入替换为 jakarta.*。

