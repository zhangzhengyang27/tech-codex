---
title: "底层源码分析 Spring 的核心功能和执行流程？"
description: "Spring Framework 已是公认的 Java 标配开发框架。本文基于 Spring 5.2 源码讲解 Bean 的注册方式与作用域、生命周期源码，以及 IoC/DI 概念、注入方式与 Spring AOP 的三种配置方式和实现原理。"
keywords: [Spring, Bean 生命周期, IoC, DI, AOP]
category: "Java"
tags: [Java, 源码剖析]
---


# 底层源码分析 Spring 的核心功能和执行流程？

Spring Framework 已是公认的 Java 标配开发框架了，甚至还有人说 Java 编程就是面向 Spring 编程的，可见 Spring 在整个 Java 体系中的重要位置。

Spring 中包含了众多的功能和相关模块，比如 spring-core、spring-beans、spring-aop、spring-context、spring-expression、spring-test 等，本文先从面试中必问的问题出发，来帮你更好地理解 Spring 框架。

我们本文的面试题是，Spring Bean 的作用域有哪些？它的注册方式有几种？

### 典型回答

在 Spring 容器中管理一个或多个 Bean，这些 Bean 的定义表示为 BeanDefinition 对象，这些对象包含以下重要信息：

- Bean 的实际实现类

- Bean 的作用范围

- Bean 的引用或者依赖项

Bean 的注册方式有三种：

- XML 配置文件的注册方式

- Java 注解的注册方式

- Java API 的注册方式

#### 1. XML 配置文件注册方式

```html
<bean id="person" class="org.springframework.beans.Person">
   <property name="id" value="1"/>
   <property name="name" value="Java"/>
</bean>
```

#### 2. Java 注解注册方式

可以使用 @Component 注解方式来注册 Bean，代码如下：

```java
@Component
public class Person {
   private Integer id;
   private String name;
   // 忽略其他方法
}
```

也可以使用 @Bean 注解方式来注册 Bean，代码如下：

```java
@Configuration
public class PersonConfig {
   @Bean
   public Person person(){
      return new Person();
   }
   // 忽略其他方法
}
```

其中 @Configuration 可理解为 XML 配置里的 <beans> 标签，而 @Bean 可理解为用 XML 配置里面的 <bean> 标签。

#### 3. Java API 注册方式

使用 BeanDefinitionRegistry.registerBeanDefinition() 方法的方式注册 Bean，代码如下：

```java
public class CustomBeanDefinitionRegistry implements BeanDefinitionRegistryPostProcessor {
	@Override
	public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
	}
	@Override
	public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) throws BeansException {
		RootBeanDefinition personBean = new RootBeanDefinition(Person.class);
		// 新增 Bean
		registry.registerBeanDefinition("person", personBean);
	}
}
```

Bean 的作用域一共有 5 个。

（1）**singleton 作用域**：表示在 Spring 容器中只有一个 Bean 实例，以单例的形式存在，是默认的 Bean 作用域。

配置方式，缺省即可，XML 的配置方式如下：

```html
<bean class="..."></bean>
```

（2）**prototype 作用域**：原型作用域，每次调用 Bean 时都会创建一个新实例，也就是说每次调用 getBean() 方法时，相当于执行了 new Bean()。

XML 的配置方式如下：

```html
<bean class="..." scope="prototype"></bean>
```

（3）**request 作用域**：每次 Http 请求时都会创建一个新的 Bean，该作用域仅适应于 WebApplicationContext 环境。

XML 的配置方式如下：

```html
<bean class="..." scope="request"></bean>
```

Java 注解的配置方式如下：

```java
@Scope(WebApplicationContext.SCOPE_REQUEST)
```

或是：

```java
@RequestScope
```

（4）**session 作用域**：同一个 Http Session 共享一个 Bean 对象，不同的 Session 拥有不同的 Bean 对象，仅适用于 WebApplicationContext 环境。

XML 的配置方式如下：

```html
<bean class="..." scope="session"></bean>
```

Java 注解的配置方式如下：

```java
@Scope(WebApplicationContext.SCOPE_SESSION)
```

或是：

```java
@SessionScope
```

（5）**application 作用域**：全局的 Web 作用域，类似于 Servlet 中的 Application。

XML 的配置方式如下：

```html
<bean class="..." scope="application"></bean>
```

Java 注解的配置方式如下：

```java
@Scope(WebApplicationContext.SCOPE_APPLICATION)
```

或是：

```java
@Scope(WebApplicationContext.SCOPE_APPLICATION)
```

### 考点分析

- 什么是同名 Bean？它是如何产生的？应该如何避免？

- 聊一聊 Bean 的生命周期。

### 知识扩展

#### 1.同名 Bean 问题

每个 Bean 拥有一个或多个标识符，在基于 XML 的配置中，我们可以使用 id 或者 name 来作为 Bean 的标识符。通常 Bean 的标识符由字母组成，允许使用特殊字符。

同一个 Spring 配置文件中 Bean 的 id 和 name 是不能够重复的，否则 Spring 容器启动时会报错。但如果 Spring 加载了多个配置文件的话，可能会出现同名 Bean 的问题。**同名 Bean** 指的是多个 Bean 有相同的 name 或者 id。

Spring 对待同名 Bean 的处理规则是使用最后面的 Bean 覆盖前面的 Bean，所以我们在定义 Bean 时，尽量使用长命名非重复的方式来定义，避免产生同名 Bean 的问题。

Bean 的 id 或 name 属性并非必须指定，如果留空的话，容器会为 Bean 自动生成一个唯一的名称，这样也不会出现同名 Bean 的问题。

#### 2.Bean 生命周期

对于 Spring Bean 来说，并不是启动阶段就会触发 Bean 的实例化，只有当客户端通过显式或者隐式的方式调用 BeanFactory 的 getBean() 方法时，它才会触发该类的实例化方法。当然对于 BeanFactory 来说，也不是所有的 getBean() 方法都会实例化 Bean 对象，例如作用域为 singleton 时，只会在第一次，实例化该 Bean 对象，之后会直接返回该对象。但如果使用的是 ApplicationContext 容器，则会在该容器启动的时候，立即调用注册到该容器所有 Bean 的实例化方法。

getBean() 既然是 Bean 对象的入口，我们就先从这个方法说起，getBean() 方法是属于 BeanFactory 接口的，它的真正实现是 AbstractAutowireCapableBeanFactory 的 createBean() 方法，而 createBean() 是通过 doCreateBean() 来实现的，具体源码实现如下：

```java
@Override
protected Object createBean(String beanName, RootBeanDefinition mbd, @Nullable Object[] args)
        throws BeanCreationException {
    if (logger.isTraceEnabled()) {
        logger.trace("Creating instance of bean '" + beanName + "'");
    }
    RootBeanDefinition mbdToUse = mbd;
    // 确定并加载 Bean 的 class
    Class<?> resolvedClass = resolveBeanClass(mbd, beanName);
    if (resolvedClass != null && !mbd.hasBeanClass() && mbd.getBeanClassName() != null) {
        mbdToUse = new RootBeanDefinition(mbd);
        mbdToUse.setBeanClass(resolvedClass);
    }
    // 验证以及准备需要覆盖的方法
    try {
        mbdToUse.prepareMethodOverrides();
    }
    catch (BeanDefinitionValidationException ex) {
        throw new BeanDefinitionStoreException(mbdToUse.getResourceDescription(),
                beanName, "Validation of method overrides failed", ex);
    }
    try {
        // 给BeanPostProcessors 一个机会来返回代理对象来代替真正的 Bean 实例，在这里实现创建代理对象功能
        Object bean = resolveBeforeInstantiation(beanName, mbdToUse);
        if (bean != null) {
            return bean;
        }
    }
    catch (Throwable ex) {
        throw new BeanCreationException(mbdToUse.getResourceDescription(), beanName,
                "BeanPostProcessor before instantiation of bean failed", ex);
    }
    try {
        // 创建 Bean
        Object beanInstance = doCreateBean(beanName, mbdToUse, args);
        if (logger.isTraceEnabled()) {
            logger.trace("Finished creating instance of bean '" + beanName + "'");
        }
        return beanInstance;
    }
    catch (BeanCreationException | ImplicitlyAppearedSingletonException ex) {
        throw ex;
    }
    catch (Throwable ex) {
        throw new BeanCreationException(
                mbdToUse.getResourceDescription(), beanName, "Unexpected exception during bean creation", ex);
    }
}
```

doCreateBean 源码如下：

```java
protected Object doCreateBean(final String beanName, final RootBeanDefinition mbd, final @Nullable Object[] args)
        throws BeanCreationException {
    // 实例化 bean，BeanWrapper 对象提供了设置和获取属性值的功能
    BeanWrapper instanceWrapper = null;
    // 如果 RootBeanDefinition 是单例，则移除未完成的 FactoryBean 实例的缓存
    if (mbd.isSingleton()) {
        instanceWrapper = this.factoryBeanInstanceCache.remove(beanName);
    }
    if (instanceWrapper == null) {
        // 创建 bean 实例
        instanceWrapper = createBeanInstance(beanName, mbd, args);
    }
    // 获取 BeanWrapper 中封装的 Object 对象，其实就是 bean 对象的实例
    final Object bean = instanceWrapper.getWrappedInstance();
    // 获取 BeanWrapper 中封装 bean 的 Class
    Class<?> beanType = instanceWrapper.getWrappedClass();
    if (beanType != NullBean.class) {
        mbd.resolvedTargetType = beanType;
    }
    // 应用 MergedBeanDefinitionPostProcessor 后处理器，合并 bean 的定义信息
    // Autowire 等注解信息就是在这一步完成预解析，并且将注解需要的信息放入缓存
    synchronized (mbd.postProcessingLock) {
        if (!mbd.postProcessed) {
            try {
                applyMergedBeanDefinitionPostProcessors(mbd, beanType, beanName);
            } catch (Throwable ex) {
                throw new BeanCreationException(mbd.getResourceDescription(), beanName,
                        "Post-processing of merged bean definition failed", ex);
            }
            mbd.postProcessed = true;
        }
    }
    boolean earlySingletonExposure = (mbd.isSingleton() && this.allowCircularReferences &&
            isSingletonCurrentlyInCreation(beanName));
    if (earlySingletonExposure) {
        if (logger.isTraceEnabled()) {
            logger.trace("Eagerly caching bean '" + beanName +
                    "' to allow for resolving potential circular references");
        }
        // 为了避免循环依赖，在 bean 初始化完成前，就将创建 bean 实例的 ObjectFactory 放入工厂缓存（singletonFactories）
        addSingletonFactory(beanName, () -> getEarlyBeanReference(beanName, mbd, bean));
    }
    // 对 bean 属性进行填充
    Object exposedObject = bean;
    try {
        populateBean(beanName, mbd, instanceWrapper);
        // 调用初始化方法，如 init-method 注入 Aware 对象
        exposedObject = initializeBean(beanName, exposedObject, mbd);
    } catch (Throwable ex) {
        if (ex instanceof BeanCreationException && beanName.equals(((BeanCreationException) ex).getBeanName())) {
            throw (BeanCreationException) ex;
        } else {
            throw new BeanCreationException(
                    mbd.getResourceDescription(), beanName, "Initialization of bean failed", ex);
        }
    }
    if (earlySingletonExposure) {
        // 如果存在循环依赖，也就是说该 bean 已经被其他 bean 递归加载过，放入了提早公布的 bean 缓存中
        Object earlySingletonReference = getSingleton(beanName, false);
        if (earlySingletonReference != null) {
            // 如果 exposedObject 没有在 initializeBean 初始化方法中被增强
            if (exposedObject == bean) {
                exposedObject = earlySingletonReference;
            } else if (!this.allowRawInjectionDespiteWrapping && hasDependentBean(beanName)) {
                // 依赖检测
                String[] dependentBeans = getDependentBeans(beanName);
                Set<String> actualDependentBeans = new LinkedHashSet<>(dependentBeans.length);
                for (String dependentBean : dependentBeans) {
                    if (!removeSingletonIfCreatedForTypeCheckOnly(dependentBean)) {
                        actualDependentBeans.add(dependentBean);
                    }
                }
                // 如果 actualDependentBeans 不为空，则表示依赖的 bean 并没有被创建完，即存在循环依赖
                if (!actualDependentBeans.isEmpty()) {
                    throw new BeanCurrentlyInCreationException(beanName,
                            "Bean with name '" + beanName + "' has been injected into other beans [" +
                                    StringUtils.collectionToCommaDelimitedString(actualDependentBeans) +
                                    "] in its raw version as part of a circular reference, but has eventually been " +
                                    "wrapped. This means that said other beans do not use the final version of the " +
                                    "bean. This is often the result of over-eager type matching - consider using " +
                                    "'getBeanNamesOfType' with the 'allowEagerInit' flag turned off, for example.");
                }
            }
        }
    }
    try {
        // 注册 DisposableBean 以便在销毁时调用
        registerDisposableBeanIfNecessary(beanName, bean, mbd);
    } catch (BeanDefinitionValidationException ex) {
        throw new BeanCreationException(
                mbd.getResourceDescription(), beanName, "Invalid destruction signature", ex);
    }
    return exposedObject;
}
```

从上述源码中可以看出，在 doCreateBean() 方法中，首先对 Bean 进行了实例化工作，它是通过调用 createBeanInstance() 方法来实现的，该方法返回一个 BeanWrapper 对象。BeanWrapper 对象是 Spring 中一个基础的 Bean 结构接口，说它是基础接口是因为它连基本的属性都没有。

BeanWrapper 接口有一个默认实现类 BeanWrapperImpl，其主要作用是对 Bean 进行填充，比如填充和注入 Bean 的属性等。

当 Spring 完成 Bean 对象实例化并且设置完相关属性和依赖后，则会调用 Bean 的初始化方法 initializeBean()，初始化第一个阶段是检查当前 Bean 对象是否实现了 BeanNameAware、BeanClassLoaderAware、BeanFactoryAware 等接口，源码如下：

```java
private void invokeAwareMethods(final String beanName, final Object bean) {
    if (bean instanceof Aware) {
        if (bean instanceof BeanNameAware) {
            ((BeanNameAware) bean).setBeanName(beanName);
        }
        if (bean instanceof BeanClassLoaderAware) {
            ClassLoader bcl = getBeanClassLoader();
            if (bcl != null) {
                ((BeanClassLoaderAware) bean).setBeanClassLoader(bcl);
            }
        }
        if (bean instanceof BeanFactoryAware) {
            ((BeanFactoryAware) bean).setBeanFactory(AbstractAutowireCapableBeanFactory.this);
        }
    }
}
```

其中，BeanNameAware 是把 Bean 对象定义的 beanName 设置到当前对象实例中；BeanClassLoaderAware 是将当前 Bean 对象相应的 ClassLoader 注入到当前对象实例中；BeanFactoryAware 是 BeanFactory 容器会将自身注入到当前对象实例中，这样当前对象就会拥有一个 BeanFactory 容器的引用。

初始化第二个阶段则是 BeanPostProcessor 增强处理，它主要是对 Spring 容器提供的 Bean 实例对象进行有效的扩展，允许 Spring 在初始化 Bean 阶段对其进行定制化修改，比如处理标记接口或者为其提供代理实现。

在初始化的前置处理完成之后就会检查和执行 InitializingBean 和 init-method 方法。

InitializingBean 是一个接口，它有一个 afterPropertiesSet() 方法，在 Bean 初始化时会判断当前 Bean 是否实现了 InitializingBean，如果实现了则调用 afterPropertiesSet() 方法，进行初始化工作；然后再检查是否也指定了 init-method，如果指定了则通过反射机制调用指定的 init-method 方法，它的实现源码如下：

```java
protected void invokeInitMethods(String beanName, final Object bean, @Nullable RootBeanDefinition mbd)
        throws Throwable {
    // 判断当前 Bean 是否实现了 InitializingBean，如果是的话需要调用 afterPropertiesSet()
    boolean isInitializingBean = (bean instanceof InitializingBean);
    if (isInitializingBean && (mbd == null || !mbd.isExternallyManagedInitMethod("afterPropertiesSet"))) {
        if (logger.isTraceEnabled()) {
            logger.trace("Invoking afterPropertiesSet() on bean with name '" + beanName + "'");
        }
        if (System.getSecurityManager() != null) { // 安全模式
            try {
                AccessController.doPrivileged((PrivilegedExceptionAction<Object>) () -> {
                    ((InitializingBean) bean).afterPropertiesSet(); // 属性初始化
                    return null;
                }, getAccessControlContext());
            } catch (PrivilegedActionException pae) {
                throw pae.getException();
            }
        } else {
            ((InitializingBean) bean).afterPropertiesSet(); // 属性初始化
        }
    }
    // 判断是否指定了 init-method()
    if (mbd != null && bean.getClass() != NullBean.class) {
        String initMethodName = mbd.getInitMethodName();
        if (StringUtils.hasLength(initMethodName) &&
                !(isInitializingBean && "afterPropertiesSet".equals(initMethodName)) &&
                !mbd.isExternallyManagedInitMethod(initMethodName)) {
            // 利用反射机制执行指定方法
            invokeCustomInitMethod(beanName, bean, mbd);
        }
    }
}
```

初始化完成之后就可以正常的使用 Bean 对象了，在 Spring 容器关闭时会执行销毁方法，但是 Spring 容器不会自动去调用销毁方法，而是需要我们主动的调用。

如果是 BeanFactory 容器，那么我们需要主动调用 destroySingletons() 方法，通知 BeanFactory 容器去执行相应的销毁方法；如果是 ApplicationContext 容器，那么我们需要主动调用 registerShutdownHook() 方法，告知 ApplicationContext 容器执行相应的销毁方法。

> 注：本文源码基于 Spring 5.2.2.RELEASE。

### 小结

本文我们讲了 Bean 的三种注册方式：XML、Java 注解和 JavaAPI，以及 Bean 的五个作用域：singleton、prototype、request、session 和 application；还讲了读取多个配置文件可能会出现同名 Bean 的问题，以及通过源码讲了 Bean 执行的生命周期。


上一节我们讲了 Bean 相关的内容，它其实也是属于 IoC 的具体实现之一，本文我们就来讲讲 Spring 中其他几个高频的面试点，希望能起到抛砖引玉的作用，能为你理解 Spring 打开一扇门。因为 Spring 涉及的内容和知识点太多了，用它来写一本书也绰绰有余，因此这里我们只讲核心的内容，希望下来你能查漏补缺，完善自己的 Spring 技术栈。

我们本文的面试题是，谈一谈你对 IoC 和 DI 的理解。

### 典型回答

**IoC**（Inversion of Control，翻译为“控制反转”）不是一个具体的技术，而是一种设计思想。与传统控制流相比，IoC 会颠倒控制流，在传统的编程中需要开发者自行创建并销毁对象，而在 IoC 中会把这些操作交给框架来处理，这样开发者就不用关注具体的实现细节了，拿来直接用就可以了，这就是**控制反转**。

IoC 很好的体现出了面向对象的设计法则之一——好莱坞法则：“别找我们，我们找你”。即由 IoC 容器帮对象找到相应的依赖对象并注入，而不是由对象主动去找。

举个例子，比如说传统找对象，先要设定好你的要求，如身高、体重、长相等，然后再一个一个的主动去找符合要求的对象，而 IoC 相当于，你把这些要求直接告诉婚介中心，由他们直接给你匹配到符合要求的对象，理想情况下是直接会帮你找到合适的对象，这就是传统编程模式和 IoC 的区别。

**DI**（Dependency Injection，翻译为“**依赖注入**”）表示组件间的依赖关系交由容器在运行期自动生成，也就是说，由容器动态的将某个依赖关系注入到组件之中，这样就能提升组件的重用频率。通过依赖注入机制，我们只需要通过简单的配置，就可指定目标需要的资源，完成自身的业务逻辑，而不需要关心资源来自哪里、由谁实现等问题。

IoC 和 DI 其实是同一个概念从不同角度的描述的，由于控制反转这个概念比较含糊（可能只理解成了容器控制对象这一个层面，很难让人想到谁来维护对象关系），所以 2004 年被开发者尊称为“教父”的 Martin Fowler（世界顶级专家，敏捷开发方法的创始人之一）又给出了一个新的名字“依赖注入”，相对 IoC 而言，“依赖注入”明确描述了“**被注入对象依赖 IoC 容器配置依赖对象**”。

### 考点分析

IoC 和 DI 为 Spring 框架设计的精髓所在，也是面试中必问的考点之一，这个优秀的设计思想对于初学者来说可能理解起来比较困难，但对于 Spring 的使用者来说可以很快的看懂。因此如果对于此概念还有疑问的话，建议先上手使用 Spring 实现几个小功能再回头来看这些概念，相信你会豁然开朗。

Spring 相关的高频面试题，还有以下这些：

- Spring IoC 有哪些优势？

- IoC 的注入方式有哪些？

- 谈一谈你对 AOP 的理解。

### 知识扩展

#### 1.Spring IoC 的优点

IoC 的优点有以下几个：

- 使用更方便，拿来即用，无需显式的创建和销毁的过程；

- 可以很容易提供众多服务，比如事务管理、消息服务等；

- 提供了单例模式的支持；

- 提供了 AOP 抽象，利用它很容易实现权限拦截、运行期监控等功能；

- 更符合面向对象的设计法则；

- 低侵入式设计，代码的污染极低，降低了业务对象替换的复杂性。

#### 2.Spring IoC 注入方式汇总

IoC 的注入方式有三种：构造方法注入、Setter 注入和接口注入。

**① 构造方法注入**

构造方法注入主要是依赖于构造方法去实现，构造方法可以是有参的也可以是无参的，我们平时 new 对象时就是通过类的构造方法来创建类对象的，每个类对象默认会有一个无参的构造方法，Spring 通过构造方法注入的代码示例如下：

```java
public class Person {
    public Person() {
	}
	public Person(int id, String name) {
		this.id = id;
		this.name = name;
	}
	private int id;
	private String name;
    // 忽略 Setter、Getter 的方法
}
```

applicationContext.xml 配置如下：

```html
<bean id="person" class="org.springframework.beans.Person">
    <constructor-arg value="1" type="int"></constructor-arg>
    <constructor-arg value="Java" type="java.lang.String"></constructor-arg>
</bean>
```

**② Setter 注入**

Setter 方法注入的方式是目前 Spring 主流的注入方式，它可以利用 Java Bean 规范所定义的 Setter/Getter 方法来完成注入，可读性和灵活性都很高，它不需要使用声明式构造方法，而是使用 Setter 注入直接设置相关的值，实现示例如下：

```html
<bean id="person" class="org.springframework.beans.Person">
    <property name="id" value="1"/>
    <property name="name" value="Java"/>
</bean>
```

**③ 接口注入**

接口注入方式是比较古老的注入方式，因为它需要被依赖的对象实现不必要的接口，带有侵入性，因此现在已经被完全舍弃了，所以本文也不打算做过多的描述，大家只要知道有这回事就行了。

#### 3.Spring AOP

AOP（Aspect-Oriented Programming，面向切面编程）可以说是 OOP（Object-Oriented Programming，面向对象编程）的补充和完善，OOP 引入封装、继承和多态性等概念来建立一种公共对象处理的能力，当我们需要处理公共行为的时候，OOP 就会显得无能为力，而 AOP 的出现正好解决了这个问题。比如统一的日志处理模块、授权验证模块等都可以使用 AOP 很轻松的处理。

Spring AOP 目前提供了三种配置方式：

- 基于 Java API 的方式；

- 基于 @AspectJ（Java）注解的方式；

- 基于 XML <aop /> 标签的方式。

**① 基于 Java API 的方式**

此配置方式需要实现相关的接口，例如 MethodBeforeAdvice 和 AfterReturningAdvice，并且在 XML 配置中定义相应的规则即可实现。

我们先来定义一个实体类，代码如下：

```java
package org.springframework.beans;

public class Person {
   public Person findPerson() {
      Person person = new Person(1, "JDK");
      System.out.println("findPerson 被执行");
      return person;
   }
   public Person() {
   }
   public Person(Integer id, String name) {
      this.id = id;
      this.name = name;
   }
   private Integer id;
   private String name;
   // 忽略 Getter、Setter 方法
}
```

再定义一个 advice 类，用于对拦截方法的调用之前和调用之后进行相关的业务处理，实现代码如下：

```java
import org.springframework.aop.AfterReturningAdvice;
import org.springframework.aop.MethodBeforeAdvice;

import java.lang.reflect.Method;

public class MyAdvice implements MethodBeforeAdvice, AfterReturningAdvice {
   @Override
   public void before(Method method, Object[] args, Object target) throws Throwable {
      System.out.println("准备执行方法: " + method.getName());
   }

   @Override
   public void afterReturning(Object returnValue, Method method, Object[] args, Object target) throws Throwable {
      System.out.println(method.getName() + " 方法执行结束");
   }
}
```

然后需要在 application.xml 文件中配置相应的拦截规则，配置如下：

```html
<!-- 定义 advisor -->
<bean id="myAdvice" class="org.springframework.advice.MyAdvice"></bean>
<!-- 配置规则，拦截方法名称为 find* -->
<bean class="org.springframework.aop.support.RegexpMethodPointcutAdvisor">
    <property name="advice" ref="myAdvice"></property>
    <property name="pattern" value="org.springframework.beans.*.find.*"></property>
</bean>

<!-- 定义 DefaultAdvisorAutoProxyCreator 使所有的 advisor 配置自动生效 -->
<bean class="org.springframework.aop.framework.autoproxy.DefaultAdvisorAutoProxyCreator"></bean>
```

从以上配置中可以看出，我们需要配置一个拦截方法的规则，然后定义一个 DefaultAdvisorAutoProxyCreator 让所有的 advisor 配置自动生效。

最后，我们使用测试代码来完成调用：

```java
public class MyApplication {
   public static void main(String[] args) {
      ApplicationContext context =
            new ClassPathXmlApplicationContext("classpath*:application.xml");
      Person person = context.getBean("person", Person.class);
      person.findPerson();
   }
}
```

以上程序的执行结果为：

```text
准备执行方法: findPerson
findPerson 被执行
findPerson 方法执行结束
```

可以看出 AOP 的拦截已经成功了。

**② 基于 @AspectJ 注解的方式**

首先需要在项目中添加 aspectjweaver 的 jar 包，配置如下：

```html
<!-- https://mvnrepository.com/artifact/org.aspectj/aspectjweaver -->
<dependency>
    <groupId>org.aspectj</groupId>
    <artifactId>aspectjweaver</artifactId>
    <version>1.9.5</version>
</dependency>
```

此 jar 包来自于 AspectJ，因为 Spring 使用了 AspectJ 提供的一些注解，因此需要添加此 jar 包。之后，我们需要开启 @AspectJ 的注解，开启方式有两种。

可以在 application.xml 配置如下代码中开启 @AspectJ 的注解：

```html
<aop:aspectj-autoproxy/>
```

也可以使用 @EnableAspectJAutoProxy 注解开启，代码如下：

```java
@Configuration
@EnableAspectJAutoProxy
public class AppConfig {
}
```

之后我们需要声明拦截器的类和拦截方法，以及配置相应的拦截规则，代码如下：

```java
import org.aspectj.lang.annotation.After;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.annotation.Pointcut;

@Aspect
public class MyAspectJ {

    // 配置拦截类 Person
    @Pointcut("execution(* org.springframework.beans.Person.*(..))")
    public void pointCut() {
    }

    @Before("pointCut()")
    public void doBefore() {
        System.out.println("执行 doBefore 方法");
    }

    @After("pointCut()")
    public void doAfter() {
        System.out.println("执行 doAfter 方法");
    }
}
```

然后我们只需要在 application.xml 配置中添加注解类，配置如下：

```html
<bean class="org.springframework.advice.MyAspectJ"/>
```

紧接着，我们添加一个需要拦截的方法：

```java
package org.springframework.beans;

// 需要拦截的 Bean
public class Person {
   public Person findPerson() {
      Person person = new Person(1, "JDK");
      System.out.println("执行 findPerson 方法");
      return person;
   }
    // 获取其他方法
}
```

最后，我们开启测试代码：

```java
import org.springframework.beans.Person;
import org.springframework.context.ApplicationContext;
import org.springframework.context.support.ClassPathXmlApplicationContext;

public class MyApplication {
   public static void main(String[] args) {
      ApplicationContext context =
            new ClassPathXmlApplicationContext("classpath*:application.xml");
      Person person = context.getBean("person", Person.class);
      person.findPerson();
   }
}
```

以上程序的执行结果为：

```text
执行 doBefore 方法
执行 findPerson 方法
执行 doAfter 方法
```

可以看出 AOP 拦截成功了。

**③ 基于 XML <aop /> 标签的方式**

基于 XML 的方式与基于注解的方式类似，只是无需使用注解，把相关信息配置到 application.xml 中即可，配置如下：

```html
<!-- 拦截处理类 -->
<bean id="myPointcut" class="org.springframework.advice.MyPointcut"></bean>
<aop:config>
    <!-- 拦截规则配置 -->
    <aop:pointcut id="pointcutConfig"
                    expression="execution(* org.springframework.beans.Person.*(..))"/>
    <!-- 拦截方法配置 -->
    <aop:aspect ref="myPointcut">
        <aop:before method="doBefore" pointcut-ref="pointcutConfig"/>
        <aop:after method="doAfter" pointcut-ref="pointcutConfig"/>
    </aop:aspect>
</aop:config>
```

之后，添加一个普通的类来进行拦截业务的处理，实现代码如下：

```java
public class MyPointcut {
   public void doBefore() {
      System.out.println("执行 doBefore 方法");
   }
   public void doAfter() {
      System.out.println("执行 doAfter 方法");
   }
}
```

拦截的方法和测试代码与第二种注解的方式相同，这里就不再赘述。

最后执行程序，执行结果为：

```text
执行 doBefore 方法
执行 findPerson 方法
执行 doAfter 方法
```

可以看出 AOP 拦截成功了。

Spring AOP 的原理其实很简单，它其实就是一个动态代理，我们在调用 getBean() 方法的时候返回的其实是代理类的实例，而这个代理类在 Spring 中使用的是 JDK Proxy 或 CGLib 实现的，它的核心代码在 DefaultAopProxyFactory#createAopProxy(...) 中，源码如下：

```java
public class DefaultAopProxyFactory implements AopProxyFactory, Serializable {

	@Override
	public AopProxy createAopProxy(AdvisedSupport config) throws AopConfigException {
		if (config.isOptimize() || config.isProxyTargetClass() || hasNoUserSuppliedProxyInterfaces(config)) {
			Class<?> targetClass = config.getTargetClass();
			if (targetClass == null) {
				throw new AopConfigException("TargetSource cannot determine target class: " +
						"Either an interface or a target is required for proxy creation.");
			}
            // 判断目标类是否为接口
			if (targetClass.isInterface() || Proxy.isProxyClass(targetClass)) {
                // 是接口使用 jdk 的代理
				return new JdkDynamicAopProxy(config);
			}
            // 其他情况使用 CgLib 代理
			return new ObjenesisCglibAopProxy(config);
		}
		else {
			return new JdkDynamicAopProxy(config);
		}
	}
    // 忽略其他代码
}
```

### 小结

本文讲了 IoC 和 DI 概念，以及 IoC 的优势和 IoC 注入的三种方式：构造方法注入、Setter 注入和接口注入，最后讲了 Spring AOP 的概念与它的三种配置方式：基于 Java API 的方式、基于 Java 注解的方式和基于 XML 标签的方式。


## 版本差异(Spring 源码 → 6.x)

| 特性 | 旧版（Spring 5.x） | 当前（Spring 6.2.x） |
|------|---------------------|----------------------|
| IOC 容器 | BeanFactory/ApplicationContext | 不变；核心流程一致 |
| AOP | ProxyFactory | 不变；底层字节码生成用 Byte Buddy |
| 循环依赖 | 三级缓存 | 不变（Spring 6 仍支持） |
| 新特性 | 无 | AOT 处理（GraalVM 原生镜像）、@Configuration 代理优化 |

> Spring 核心流程（BeanDefinition → 实例化 → 属性填充 → 初始化 → AOP 代理）在 6.x 中完全一致，源码分析思路可复用。
