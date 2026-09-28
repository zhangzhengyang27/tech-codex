---
title: "Spring 事务传播机制"
description: "事务传播机制定义了事务方法被另一个事务方法调用时事务如何传播。本文覆盖 Spring Boot 事务自动配置与 @EnableTransactionManagement 的适用场景、REQUIRED/REQUIRES_NEW/SUPPORTS/NOT_SUPPORTED/MANDATORY/NEVER/NESTED 七种传播行为的语义与示例、事务失效场景与 rollbackFor/readOnly/timeout/isolation 实践要点。"
keywords: [事务传播, Transactional, Spring Boot, REQUIRED, REQUIRES_NEW, NESTED]
category: "Java"
tags: [Java, 最佳实践]
---


# Spring Boot 事务传播机制详解

## 简介

事务传播机制（Transaction Propagation）是 Spring 框架中一个重要的概念，它定义了当一个事务方法被另一个事务方法调用时，事务应该如何传播。Spring Boot 继承了 Spring 框架的事务管理能力，通过 `@Transactional` 注解来管理事务。

## 事务管理配置

### Spring Boot 自动配置

**Spring Boot 3.x 及更高版本：**

在 Spring Boot 中，如果项目中引入了以下任一依赖，**事务管理会自动启用**，无需手动添加 `@EnableTransactionManagement`：

- `spring-boot-starter-jdbc`
- `spring-boot-starter-data-jpa`

**自动配置原理：**

Spring Boot 的 `TransactionAutoConfiguration` 会自动检测：

1. 是否存在 `PlatformTransactionManager` Bean
2. 是否存在 `@Transactional` 注解
3. 如果满足条件，会自动启用事务管理

**Maven 依赖示例：**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
```

或

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jdbc</artifactId>
</dependency>
```

### 何时需要显式使用 @EnableTransactionManagement

虽然 Spring Boot 会自动配置，但在以下情况下，**仍然需要显式使用 `@EnableTransactionManagement`**：

#### 1. 纯 Spring 项目（非 Spring Boot）

```java
@Configuration
@EnableTransactionManagement  // 必须显式启用
public class AppConfig {

    @Bean
    public DataSource dataSource() {
        // 配置数据源
        return new HikariDataSource();
    }

    @Bean
    public PlatformTransactionManager transactionManager(DataSource dataSource) {
        return new DataSourceTransactionManager(dataSource);
    }
}
```

#### 2. 排除自动配置时

如果排除了 Spring Boot 的事务自动配置，需要手动启用：

```java
@SpringBootApplication(exclude = TransactionAutoConfiguration.class) // 排除事务自动配置
@EnableTransactionManagement  // 手动启用
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

#### 3. 使用编程式事务管理

当需要同时使用声明式事务（`@Transactional`）和编程式事务时：

```java
@Configuration
@EnableTransactionManagement
public class TransactionConfig {

    @Bean
    public PlatformTransactionManager transactionManager(DataSource dataSource) {
        return new DataSourceTransactionManager(dataSource);
    }

    @Bean
    public TransactionTemplate transactionTemplate(PlatformTransactionManager transactionManager) {
        return new TransactionTemplate(transactionManager);
    }
}
```

#### 4. 自定义事务管理器

当需要自定义事务管理器配置时：

```java
@Configuration
@EnableTransactionManagement
public class CustomTransactionConfig {

    @Bean
    public PlatformTransactionManager transactionManager(EntityManagerFactory emf) {
        JpaTransactionManager transactionManager = new JpaTransactionManager();
        transactionManager.setEntityManagerFactory(emf);
        // 自定义配置
        transactionManager.setDefaultTimeout(30);
        return transactionManager;
    }
}
```

### @EnableTransactionManagement 的作用

`@EnableTransactionManagement` 注解的作用：

1. **启用事务管理**：启用 Spring 的声明式事务管理功能
2. **注册事务切面**：注册 `TransactionInterceptor` 和 `BeanFactoryTransactionAttributeSourceAdvisor`
3. **支持 AOP 代理**：使 `@Transactional` 注解能够通过 AOP 代理生效

**源码解析：**

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Import(TransactionManagementConfigurationSelector.class)
public @interface EnableTransactionManagement {
    // 是否使用 CGLIB 代理（默认 false，使用 JDK 动态代理）
    boolean proxyTargetClass() default false;

    // 事务通知的模式（默认 PROXY）
    AdviceMode mode() default AdviceMode.PROXY;
}
```

### 配置示例对比

#### 方式一：Spring Boot 自动配置（推荐）

```java
@SpringBootApplication
// 无需 @EnableTransactionManagement，Spring Boot 自动配置
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    // 直接使用，事务自动生效
    @Transactional
    public void createUser(User user) {
        userMapper.insert(user);
    }
}
```

#### 方式二：显式启用（适用于特殊场景）

```java
@SpringBootApplication
@EnableTransactionManagement  // 显式启用
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

@Configuration
public class TransactionConfig {

    @Bean
    @Primary
    public PlatformTransactionManager customTransactionManager(DataSource dataSource) {
        DataSourceTransactionManager manager = new DataSourceTransactionManager();
        manager.setDataSource(dataSource);
        manager.setDefaultTimeout(30);
        return manager;
    }
}
```

### 验证事务是否启用

可以通过以下方式验证事务管理是否已启用：

```java
@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        ConfigurableApplicationContext context = SpringApplication.run(Application.class, args);

        // 检查事务管理器是否存在
        PlatformTransactionManager transactionManager =
            context.getBean(PlatformTransactionManager.class);
        System.out.println("事务管理器: " + transactionManager.getClass().getName());

        // 检查事务拦截器是否存在
        TransactionInterceptor interceptor =
            context.getBean(TransactionInterceptor.class);
        System.out.println("事务拦截器: " + interceptor.getClass().getName());
    }
}
```

### 总结

| 场景                                 | 是否需要 @EnableTransactionManagement |
| ------------------------------------ | ------------------------------------- |
| **Spring Boot 项目（使用 starter）** | × 不需要，自动配置                   |
| **纯 Spring 项目**                   | √ 需要                               |
| **排除自动配置**                     | √ 需要                               |
| **自定义事务管理器**                 |  建议添加（明确意图）               |
| **编程式事务**                       |  建议添加（明确意图）               |

**最佳实践：**

1. **Spring Boot 项目**：通常不需要显式添加 `@EnableTransactionManagement`，让 Spring Boot 自动配置即可
2. **纯 Spring 项目**：必须显式添加 `@EnableTransactionManagement`
3. **自定义配置**：虽然不必须，但显式添加可以让代码意图更清晰
4. **排查问题**：如果事务不生效，检查是否缺少 `@EnableTransactionManagement`（虽然 Spring Boot 通常不需要）

## 事务传播行为类型

Spring 提供了 7 种事务传播行为，通过 `@Transactional` 注解的 `propagation` 属性来指定：

1. **REQUIRED**（默认值）
2. **REQUIRES_NEW**
3. **SUPPORTS**
4. **NOT_SUPPORTED**
5. **MANDATORY**
6. **NEVER**
7. **NESTED**

## 详细说明

### 1. REQUIRED（必需，默认值）

**行为说明：**

- 如果当前存在事务，则加入该事务
- 如果当前不存在事务，则创建一个新事务

**使用场景：**

- 最常用的传播行为，适用于大多数业务场景
- 保证方法在事务中执行

**代码示例：**

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private OrderService orderService;

    // 方法A：开启事务
    @Transactional(propagation = Propagation.REQUIRED)
    public void methodA() {
        userMapper.insert(new User("张三"));
        // 调用方法B，会加入当前事务
        orderService.methodB();
    }
}

@Service
public class OrderService {

    @Autowired
    private OrderMapper orderMapper;

    // 方法B：使用 REQUIRED（默认）
    @Transactional(propagation = Propagation.REQUIRED)
    public void methodB() {
        orderMapper.insert(new Order("订单1"));
        // 如果这里抛出异常，methodA 中的操作也会回滚
        throw new RuntimeException("测试异常");
    }
}
```

**执行结果：**

- 如果 `methodB()` 抛出异常，`methodA()` 中的用户插入也会回滚
- 两个方法在同一个事务中执行

---

### 2. REQUIRES_NEW（新建事务）

**行为说明：**

- 无论当前是否存在事务，都会创建一个新事务
- 新事务与当前事务相互独立，互不影响

**使用场景：**

- 需要独立事务的场景，如日志记录、审计操作
- 即使外层事务回滚，内层事务也要提交

**代码示例：**

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private LogService logService;

    @Transactional(propagation = Propagation.REQUIRED)
    public void createUser(User user) {
        try {
            userMapper.insert(user);
            // 记录日志，使用独立事务
            logService.saveLog("创建用户：" + user.getName());
        } catch (Exception e) {
            // 即使这里回滚，日志记录也会提交
        }
    }
}

@Service
public class LogService {

    @Autowired
    private LogMapper logMapper;

    // 使用独立事务
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveLog(String message) {
        logMapper.insert(new Log(message, new Date()));
    }
}
```

**执行结果：**

- 如果 `createUser()` 回滚，`saveLog()` 中的日志记录仍然会提交
- 两个方法在独立的事务中执行

---

### 3. SUPPORTS（支持事务）

**行为说明：**

- 如果当前存在事务，则加入该事务
- 如果当前不存在事务，则以非事务方式执行

**使用场景：**

- 查询方法，可以支持事务也可以不支持
- 对事务要求不严格的场景

**代码示例：**

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    // 在事务中调用
    @Transactional
    public void methodA() {
        userMapper.insert(new User("张三"));
        // 会加入当前事务
        findUser(1L);
    }

    // 不在事务中调用
    public void methodB() {
        // 以非事务方式执行
        findUser(1L);
    }

    @Transactional(propagation = Propagation.SUPPORTS)
    public User findUser(Long id) {
        return userMapper.selectById(id);
    }
}
```

**执行结果：**

- 在事务中调用时，会加入事务
- 在非事务中调用时，以非事务方式执行

---

### 4. NOT_SUPPORTED（不支持事务）

**行为说明：**

- 以非事务方式执行操作
- 如果当前存在事务，则把当前事务挂起

**使用场景：**

- 不需要事务的操作，如某些查询操作
- 避免事务影响性能的场景

**代码示例：**

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    @Transactional
    public void methodA() {
        userMapper.insert(new User("张三"));
        // 挂起当前事务，以非事务方式执行
        readOnlyOperation();
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void readOnlyOperation() {
        // 以非事务方式执行，内部数据操作不参与外层事务
        userMapper.selectAll();
    }
}
```

**执行结果：**

- `readOnlyOperation()` 以非事务方式执行
- 注意：若该方法抛出异常，异常会向外传播并导致外层事务回滚——NOT_SUPPORTED 只是让内层操作"不参与事务"，并不能隔离异常。如需避免影响外层事务，应在调用处捕获异常

---

### 5. MANDATORY（强制事务）

**行为说明：**

- 如果当前存在事务，则加入该事务
- 如果当前不存在事务，则抛出异常

**使用场景：**

- 必须在事务中执行的方法
- 防止在非事务环境中调用

**代码示例：**

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    // 正确：在事务中调用
    @Transactional
    public void methodA() {
        userMapper.insert(new User("张三"));
        // 正常执行，加入当前事务
        methodB();
    }

    // 错误：不在事务中调用
    public void methodC() {
        // 会抛出异常：No existing transaction found for transaction marked with propagation 'mandatory'
        methodB();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void methodB() {
        userMapper.update(new User("李四"));
    }
}
```

**执行结果：**

- 在事务中调用：正常执行
- 在非事务中调用：抛出 `IllegalTransactionStateException` 异常

---

### 6. NEVER（禁止事务）

**行为说明：**

- 以非事务方式执行
- 如果当前存在事务，则抛出异常

**使用场景：**

- 明确禁止在事务中执行的方法
- 确保方法以非事务方式执行

**代码示例：**

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    // 错误：在事务中调用
    @Transactional
    public void methodA() {
        userMapper.insert(new User("张三"));
        // 会抛出异常：Existing transaction found for transaction marked with propagation 'never'
        methodB();
    }

    // 正确：不在事务中调用
    public void methodC() {
        // 正常执行，以非事务方式
        methodB();
    }

    @Transactional(propagation = Propagation.NEVER)
    public void methodB() {
        userMapper.selectAll();
    }
}
```

**执行结果：**

- 在事务中调用：抛出 `IllegalTransactionStateException` 异常
- 在非事务中调用：正常执行

---

### 7. NESTED（嵌套事务）

**行为说明：**

- 如果当前存在事务，则创建一个嵌套事务（保存点）
- 如果当前不存在事务，则创建一个新事务
- 嵌套事务可以独立回滚，不影响外层事务

**使用场景：**

- 需要部分回滚的场景
- 外层事务提交时，内层事务才提交

**代码示例：**

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private OrderService orderService;

    @Transactional(propagation = Propagation.REQUIRED)
    public void createUserWithOrder(User user) {
        userMapper.insert(user);
        try {
            // 嵌套事务，可以独立回滚
            orderService.createOrder(user.getId());
        } catch (Exception e) {
            // 即使订单创建失败，用户创建仍然成功
            System.out.println("订单创建失败，但用户已创建");
        }
    }
}

@Service
public class OrderService {

    @Autowired
    private OrderMapper orderMapper;

    @Transactional(propagation = Propagation.NESTED)
    public void createOrder(Long userId) {
        orderMapper.insert(new Order(userId, "订单1"));
        // 如果这里抛出异常，只会回滚订单操作，不影响用户创建
        throw new RuntimeException("订单创建失败");
    }
}
```

**执行结果：**

- 如果 `createOrder()` 抛出异常，只会回滚订单操作
- 用户创建操作仍然会提交
- 注意：NESTED 需要数据库支持保存点（Savepoint），MySQL 的 InnoDB 引擎支持

---

## 传播行为对比表

| 传播行为          | 当前存在事务             | 当前不存在事务 | 说明                     |
| ----------------- | ------------------------ | -------------- | ------------------------ |
| **REQUIRED**      | 加入事务                 | 创建新事务     | 默认值，最常用           |
| **REQUIRES_NEW**  | 挂起当前事务，创建新事务 | 创建新事务     | 独立事务，互不影响       |
| **SUPPORTS**      | 加入事务                 | 非事务执行     | 灵活，支持事务也可不支持 |
| **NOT_SUPPORTED** | 挂起当前事务，非事务执行 | 非事务执行     | 强制非事务执行           |
| **MANDATORY**     | 加入事务                 | 抛出异常       | 必须在事务中执行         |
| **NEVER**         | 抛出异常                 | 非事务执行     | 禁止在事务中执行         |
| **NESTED**        | 创建嵌套事务（保存点）   | 创建新事务     | 支持部分回滚             |

---

## 完整示例

```java
@Service
@Transactional
public class OrderService {

    @Autowired
    private OrderMapper orderMapper;

    @Autowired
    private UserService userService;

    @Autowired
    private LogService logService;

    @Autowired
    private PaymentService paymentService;

    /**
     * 创建订单的完整流程
     */
    public void createOrder(OrderDTO orderDTO) {
        // 1. 创建订单（使用当前事务）
        Order order = new Order();
        order.setUserId(orderDTO.getUserId());
        order.setAmount(orderDTO.getAmount());
        orderMapper.insert(order);

        // 2. 记录日志（独立事务，即使订单失败也要记录）
        logService.saveLog("创建订单：" + order.getId());

        // 3. 扣减库存（必须在事务中执行）
        userService.deductStock(orderDTO.getProductId(), orderDTO.getQuantity());

        // 4. 支付（嵌套事务，支付失败不影响订单创建）
        try {
            paymentService.processPayment(order.getId(), orderDTO.getAmount());
        } catch (Exception e) {
            // 支付失败，但订单已创建
            logService.saveLog("订单支付失败：" + order.getId());
        }
    }
}

@Service
public class LogService {

    @Autowired
    private LogMapper logMapper;

    // 独立事务，确保日志记录
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveLog(String message) {
        logMapper.insert(new Log(message, new Date()));
    }
}

@Service
public class UserService {

    @Autowired
    private StockMapper stockMapper;

    // 必须在事务中执行
    @Transactional(propagation = Propagation.MANDATORY)
    public void deductStock(Long productId, Integer quantity) {
        Stock stock = stockMapper.selectByProductId(productId);
        if (stock.getQuantity() < quantity) {
            throw new RuntimeException("库存不足");
        }
        stock.setQuantity(stock.getQuantity() - quantity);
        stockMapper.update(stock);
    }
}

@Service
public class PaymentService {

    @Autowired
    private PaymentMapper paymentMapper;

    // 嵌套事务，可以独立回滚
    @Transactional(propagation = Propagation.NESTED)
    public void processPayment(Long orderId, BigDecimal amount) {
        Payment payment = new Payment();
        payment.setOrderId(orderId);
        payment.setAmount(amount);
        paymentMapper.insert(payment);

        // 模拟支付失败
        if (amount.compareTo(new BigDecimal("1000")) > 0) {
            throw new RuntimeException("支付金额过大");
        }
    }
}
```

---

## 注意事项

### 1. 事务失效场景

**问题：同一个类内部方法调用，事务不生效**

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    public void methodA() {
        // 事务不生效！因为是通过 this.methodB() 调用，不是通过代理对象
        this.methodB();
    }

    @Transactional
    public void methodB() {
        userMapper.insert(new User("张三"));
    }
}
```

**解决方案：**

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private UserService userService; // 注入自己，通过代理调用

    public void methodA() {
        // 正确：通过代理对象调用，事务生效
        userService.methodB();
    }

    @Transactional
    public void methodB() {
        userMapper.insert(new User("张三"));
    }
}
```

### 2. 异常回滚

**默认情况下，只有运行时异常（RuntimeException）和错误（Error）会回滚事务**

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    // 默认只回滚 RuntimeException 和 Error
    @Transactional
    public void methodA() throws Exception {
        userMapper.insert(new User("张三"));
        throw new Exception("普通异常"); // 不会回滚！
    }

    // 指定回滚所有异常
    @Transactional(rollbackFor = Exception.class)
    public void methodB() throws Exception {
        userMapper.insert(new User("李四"));
        throw new Exception("普通异常"); // 会回滚
    }

    // 指定不回滚某些异常
    @Transactional(noRollbackFor = RuntimeException.class)
    public void methodC() {
        userMapper.insert(new User("王五"));
        throw new RuntimeException("运行时异常"); // 不会回滚
    }
}
```

### 3. 只读事务

**对于只读操作，使用 `readOnly = true` 可以优化性能**

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    // 只读事务，性能优化
    @Transactional(readOnly = true, propagation = Propagation.SUPPORTS)
    public User findUser(Long id) {
        return userMapper.selectById(id);
    }
}
```

### 4. 事务超时

**设置事务超时时间，避免长时间占用资源**

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    // 设置事务超时时间为 30 秒
    @Transactional(timeout = 30)
    public void longRunningMethod() {
        // 如果执行时间超过 30 秒，事务会回滚
        userMapper.batchInsert(users);
    }
}
```

### 5. 事务隔离级别

**结合事务隔离级别使用**

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    // 设置隔离级别为读已提交
    @Transactional(
        propagation = Propagation.REQUIRED,
        isolation = Isolation.READ_COMMITTED
    )
    public void methodA() {
        userMapper.insert(new User("张三"));
    }
}
```

---

## 最佳实践

1. **默认使用 REQUIRED**：大多数场景下，使用默认的 REQUIRED 即可
2. **日志记录使用 REQUIRES_NEW**：确保日志记录独立提交
3. **查询方法使用 SUPPORTS 或 NOT_SUPPORTED**：提高性能
4. **关键操作使用 MANDATORY**：确保在事务中执行
5. **避免同类内部调用**：通过注入自身或提取到另一个 Service 来避免事务失效
6. **合理设置异常回滚**：根据业务需求设置 `rollbackFor` 和 `noRollbackFor`
7. **只读操作设置 readOnly**：优化查询性能
8. **合理设置超时时间**：避免长时间占用资源

---

## 总结

Spring Boot 的事务传播机制提供了灵活的事务管理能力，通过合理选择传播行为，可以满足不同业务场景的需求。理解各种传播行为的特点和使用场景，有助于设计出更加健壮和高效的事务管理方案。

## 版本差异(Spring 5.x → 6.x)

| 特性 | 旧版（Spring 5.x / Boot 2.x） | 当前（Spring 6.2.x / Boot 3.5.x） |
|------|------------------------------|-----------------------------------|
| 编程式事务 | TransactionTemplate（不变） | 不变，仍推荐优先使用 |
| 声明式事务 | @Transactional | 不变；Boot 3 中 @EnableTransactionManagement 仍可省略 |
| 事务管理器 | DataSourceTransactionManager / JpaTransactionManager | 不变；JdbcTransactionManager（Spring 5.3 起提供，增强版 DataSourceTransactionManager，带异常翻译） |
| 虚拟线程 | 不支持 | Boot 3.2+ 启用虚拟线程后，事务边界与线程绑定需注意（事务绑定线程，勿跨线程操作） |
| JDK | 8/11 | 17-25 |

> 七种传播行为（REQUIRED、SUPPORTS、MANDATORY、REQUIRES_NEW、NOT_SUPPORTED、NEVER、NESTED）的语义在 Spring 6.x 中完全一致，本文示例可直接复用；唯一需要关注的是虚拟线程模式下切勿在事务内自行切换线程执行数据库操作。
