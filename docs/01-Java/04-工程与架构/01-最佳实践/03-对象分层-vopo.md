---
title: "Java 对象分层：VO、PO、BO、DTO、DO、Entity"
description: "在 Java 企业级开发中，为了分层架构的清晰性和代码的可维护性，通常会使用不同的对象类型来表示不同层次的数据。这些对象类型遵循单一职责原则，使得代码结构更加清晰。"
keywords: [VO, PO, BO, DTO, DO, Entity, 对象分层]
category: "Java"
tags: [Java, 最佳实践]
---


# Java 开发中的对象类型详解（VO、PO、BO、DTO、DO、Entity）

## 一、概述

企业级项目通常按"表现层 → 业务层 → 数据访问层"分层，如果让一个对象从数据库一路透传到前端，就会出现敏感字段泄露、字段互相污染、数据库结构变更牵连接口等问题。解决办法就是按层使用不同的对象类型：PO/Entity 对应数据库、BO/DO 承载业务、DTO 负责传输、VO 面向展示。下面逐一说明各类型的职责、场景与转换方式。

## 二、核心对象类型

### 1. PO (Persistent Object) - 持久化对象

**定义**：PO 是持久化对象，与数据库表结构一一对应，用于表示数据库中的一条记录。

**特点**：

- 与数据库表结构完全对应
- 通常包含主键、外键等数据库字段
- 主要用于 ORM 框架（如 MyBatis、Hibernate）进行数据持久化
- 不应该包含业务逻辑
- 可以包含数据库相关的注解（如 @Table、@Column）

**使用场景**：

- 数据库操作（增删改查）
- ORM 映射
- 数据持久化层

**示例代码**：

```java
import jakarta.persistence.*;
import java.util.Date;

/**
 * 用户持久化对象
 * 对应数据库表 user
 */
@Entity
@Table(name = "user")
public class UserPO {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username")
    private String username;

    @Column(name = "password")
    private String password;

    @Column(name = "email")
    private String email;

    @Column(name = "create_time")
    private Date createTime;

    @Column(name = "update_time")
    private Date updateTime;

    // getter 和 setter 方法
    // ...
}
```

---

### 2. VO (Value Object) - 值对象

> 术语说明：VO 在国内实践中也常解释为 View Object（视图对象），两种叫法指的都是面向前端展示的对象，本文按 Value Object 讲解，职责上就是"视图展示数据"。

**定义**：VO 是值对象，用于前端展示，通常包含多个 PO 或 BO 的组合数据，或者只包含需要展示的字段。

**特点**：

- 用于视图层展示
- 可以包含多个对象的数据组合
- 通常只包含需要展示的字段
- 不包含业务逻辑
- 可以包含格式化后的数据（如日期格式化、金额格式化等）

**使用场景**：

- 前端页面展示
- API 接口返回数据
- 报表数据展示

**示例代码**：

```java
import java.math.BigDecimal;
import java.util.Date;

/**
 * 用户信息展示对象
 */
public class UserVO {

    private Long userId;
    private String username;
    private String email;
    private String phone;
    private String avatar;
    private String createTime;  // 格式化后的日期字符串
    private Integer orderCount; // 订单数量（可能来自多个表）
    private BigDecimal totalAmount; // 总消费金额（计算后的值）

    // getter 和 setter 方法
    // ...
}
```

---

### 3. BO (Business Object) - 业务对象

**定义**：BO 是业务对象，封装了业务逻辑，可以包含多个 PO 的组合，代表一个完整的业务概念。

**特点**：

- 包含业务逻辑
- 可以组合多个 PO
- 代表一个完整的业务实体
- 可以包含业务方法
- 不直接对应数据库表

**使用场景**：

- 业务逻辑处理
- 复杂业务场景
- 业务规则封装

**示例代码**：

```java
import java.math.BigDecimal;
import java.util.List;

/**
 * 订单业务对象
 * 包含订单信息和订单项信息
 */
public class OrderBO {

    private Long orderId;
    private String orderNo;
    private Long userId;
    private BigDecimal totalAmount;
    private String status;
    private List<OrderItemBO> orderItems; // 订单项列表

    /**
     * 计算订单总金额
     */
    public BigDecimal calculateTotalAmount() {
        if (orderItems == null || orderItems.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return orderItems.stream()
                .map(OrderItemBO::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * 检查订单是否可以取消
     */
    public boolean canCancel() {
        return "PENDING".equals(status) || "PAID".equals(status);
    }

    // getter 和 setter 方法
    // ...
}
```

---

### 4. DTO (Data Transfer Object) - 数据传输对象

**定义**：DTO 是数据传输对象，用于不同层之间或不同系统之间的数据传输，不包含业务逻辑。

**特点**：

- 用于数据传输
- 不包含业务逻辑
- 可以跨层传输
- 可以跨系统传输
- 通常用于 API 接口的请求和响应

**使用场景**：

- 服务间数据传输
- API 接口参数和返回值
- 微服务之间的数据传输
- 前后端数据传输

**示例代码**：

```java
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;

/**
 * 用户注册数据传输对象
 */
public class UserRegisterDTO {

    @NotBlank(message = "用户名不能为空")
    private String username;

    @NotBlank(message = "密码不能为空")
    private String password;

    @Email(message = "邮箱格式不正确")
    private String email;

    private String phone;

    // getter 和 setter 方法
    // ...
}
```

---

### 5. DO (Domain Object) - 领域对象

**定义**：DO 是领域对象，是领域驱动设计（DDD）中的概念，代表业务领域中的实体。

**特点**：

- 包含业务属性和行为
- 代表业务领域中的实体
- 可以包含业务方法
- 不直接对应数据库表结构
- 更关注业务语义

**使用场景**：

- 领域驱动设计（DDD）
- 复杂业务领域建模
- 业务实体封装

**示例代码**：

```java
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * 订单领域对象
 */
public class OrderDO {

    private Long orderId;
    private String orderNo;
    private CustomerDO customer;
    private List<OrderItemDO> items;
    private OrderStatus status;
    private BigDecimal totalAmount;

    /**
     * 添加订单项
     */
    public void addItem(OrderItemDO item) {
        if (items == null) {
            items = new ArrayList<>();
        }
        items.add(item);
        recalculateTotal();
    }

    /**
     * 重新计算总金额
     */
    private void recalculateTotal() {
        this.totalAmount = items.stream()
                .map(OrderItemDO::getSubTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * 提交订单
     */
    public void submit() {
        if (status != OrderStatus.DRAFT) {
            throw new IllegalStateException("只有草稿状态的订单才能提交");
        }
        this.status = OrderStatus.PENDING;
    }

    // getter 和 setter 方法
    // ...
}
```

---

### 6. Entity - 实体对象

**定义**：Entity 是实体对象，通常与 PO 类似，但在 JPA 规范中更常用 Entity 这个术语。

**特点**：

- 与数据库表对应
- 使用 JPA 注解
- 可以包含实体关系映射
- 主要用于 JPA/Hibernate

**使用场景**：

- JPA 实体映射
- Spring Data JPA
- Hibernate 实体

**示例代码**：

```java
import jakarta.persistence.*;
import java.util.List;

/**
 * 用户实体
 */
@Entity
@Table(name = "user")
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<OrderEntity> orders;

    // getter 和 setter 方法
    // ...
}
```

---

## 三、对象类型对比

| 对象类型   | 全称                 | 主要用途     | 是否包含业务逻辑 | 对应关系          |
| ---------- | -------------------- | ------------ | ---------------- | ----------------- |
| **PO**     | Persistent Object    | 数据库持久化 | ×               | 1:1 对应数据库表  |
| **VO**     | Value Object         | 视图展示     | ×               | 多个 PO/BO 的组合 |
| **BO**     | Business Object      | 业务逻辑封装 | √               | 多个 PO 的组合    |
| **DTO**    | Data Transfer Object | 数据传输     | ×               | 跨层/跨系统传输   |
| **DO**     | Domain Object        | 领域建模     | √               | 业务领域实体      |
| **Entity** | Entity               | JPA 实体映射 | ×               | 1:1 对应数据库表  |

---

## 四、典型分层架构中的使用

### 1. 三层架构示例

```
┌─────────────────────────────────────┐
│   Controller 层 (表现层)            │
│   - 接收 DTO (请求参数)              │
│   - 返回 VO (响应数据)               │
└─────────────────────────────────────┘
              ↓ ↑
┌─────────────────────────────────────┐
│   Service 层 (业务层)               │
│   - 使用 BO (业务对象)               │
│   - 处理业务逻辑                     │
└─────────────────────────────────────┘
              ↓ ↑
┌─────────────────────────────────────┐
│   DAO 层 (数据访问层)                │
│   - 使用 PO (持久化对象)             │
│   - 数据库操作                       │
└─────────────────────────────────────┘
```

### 2. 数据流转示例

```java
// Controller 层
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    /**
     * 创建用户
     * 接收 DTO，返回 VO
     */
    @PostMapping
    public Result<UserVO> createUser(@RequestBody UserRegisterDTO dto) {
        UserBO userBO = userService.createUser(dto);
        UserVO userVO = convertToVO(userBO);
        return Result.success(userVO);
    }

    /**
     * 获取用户信息
     * 返回 VO（可能包含多个 PO 的数据）
     */
    @GetMapping("/{id}")
    public Result<UserVO> getUser(@PathVariable Long id) {
        UserVO userVO = userService.getUserVO(id);
        return Result.success(userVO);
    }
}

// Service 层
@Service
public class UserService {

    @Autowired
    private UserDAO userDAO;

    /**
     * 创建用户
     * DTO -> BO -> PO
     */
    public UserBO createUser(UserRegisterDTO dto) {
        // DTO 转换为 BO
        UserBO userBO = new UserBO();
        userBO.setUsername(dto.getUsername());
        userBO.setEmail(dto.getEmail());
        // ... 业务逻辑处理

        // BO 转换为 PO
        UserPO userPO = convertToPO(userBO);
        userPO.setCreateTime(new Date());

        // 保存到数据库
        userDAO.save(userPO);

        // PO 转换为 BO
        return convertToBO(userPO);
    }

    /**
     * 获取用户信息（包含订单统计）
     * 组合多个 PO 的数据
     */
    public UserVO getUserVO(Long id) {
        // 查询用户 PO
        UserPO userPO = userDAO.findById(id);

        // 查询订单统计（可能来自另一个表）
        OrderStatisticsPO statistics = orderDAO.getStatisticsByUserId(id);

        // 组合成 VO
        UserVO userVO = new UserVO();
        userVO.setUserId(userPO.getId());
        userVO.setUsername(userPO.getUsername());
        userVO.setEmail(userPO.getEmail());
        userVO.setOrderCount(statistics.getOrderCount());
        userVO.setTotalAmount(statistics.getTotalAmount());
        userVO.setCreateTime(formatDate(userPO.getCreateTime()));

        return userVO;
    }
}

// DAO 层
@Repository
public class UserDAO {

    @Autowired
    private UserMapper userMapper; // MyBatis Mapper

    public void save(UserPO userPO) {
        userMapper.insert(userPO);
    }

    public UserPO findById(Long id) {
        return userMapper.selectById(id);
    }
}
```

---

## 五、对象转换工具

### 1. 手动转换

```java
public class UserConverter {

    public static UserBO dtoToBO(UserRegisterDTO dto) {
        UserBO bo = new UserBO();
        bo.setUsername(dto.getUsername());
        bo.setEmail(dto.getEmail());
        bo.setPassword(encrypt(dto.getPassword()));
        return bo;
    }

    public static UserPO boToPO(UserBO bo) {
        UserPO po = new UserPO();
        po.setUsername(bo.getUsername());
        po.setEmail(bo.getEmail());
        po.setPassword(bo.getPassword());
        return po;
    }

    public static UserVO boToVO(UserBO bo) {
        UserVO vo = new UserVO();
        vo.setUserId(bo.getId());
        vo.setUsername(bo.getUsername());
        vo.setEmail(bo.getEmail());
        return vo;
    }
}
```

### 2. 使用 MapStruct（推荐）

```java
// 注意与 MyBatis 的 UserMapper 区分，转换器接口单独命名
@Mapper(componentModel = "spring")
public interface UserConvertMapper {

    UserBO dtoToBO(UserRegisterDTO dto);

    UserPO boToPO(UserBO bo);

    UserVO boToVO(UserBO bo);

    @Mapping(target = "createTime", expression = "java(formatDate(po.getCreateTime()))")
    UserVO poToVO(UserPO po);
}
```

### 3. 使用 BeanUtils（简单场景）

```java
import org.springframework.beans.BeanUtils;

public class UserConverter {

    public static UserBO dtoToBO(UserRegisterDTO dto) {
        UserBO bo = new UserBO();
        BeanUtils.copyProperties(dto, bo);
        // 处理特殊字段
        bo.setPassword(encrypt(dto.getPassword()));
        return bo;
    }
}
```

---

## 六、最佳实践

### 1. 命名规范

- **PO**: `UserPO`, `OrderPO`, `ProductPO`
- **VO**: `UserVO`, `OrderVO`, `ProductVO`
- **BO**: `UserBO`, `OrderBO`, `ProductBO`
- **DTO**: `UserRegisterDTO`, `UserUpdateDTO`, `OrderCreateDTO`
- **DO**: `UserDO`, `OrderDO`, `ProductDO`
- **Entity**: `UserEntity`, `OrderEntity`, `ProductEntity`

### 2. 使用原则

1. **PO**：只用于数据持久化，不包含业务逻辑
2. **VO**：只用于展示，可以包含格式化后的数据
3. **BO**：包含业务逻辑，可以组合多个 PO
4. **DTO**：用于数据传输，不包含业务逻辑
5. **DO**：用于领域建模，包含业务行为
6. **Entity**：用于 JPA 实体映射

### 3. 转换建议

- 使用工具类或框架（如 MapStruct）进行对象转换
- 避免在 Controller 中直接使用 PO
- 避免在 Service 中直接返回 PO
- 不同层之间使用不同的对象类型，保持层次清晰

### 4. 注意事项

- **不要混用**：不同层使用对应的对象类型
- **避免过度设计**：简单项目可以适当简化，不一定需要所有类型
- **保持一致性**：团队内部统一命名和使用规范
- **性能考虑**：大量数据转换时注意性能影响

---

## 七、常见问题

### Q1: PO 和 Entity 有什么区别？

**A**:

- **PO** 是更通用的概念，可以用于 MyBatis、Hibernate 等任何 ORM 框架
- **Entity** 是 JPA 规范中的术语，通常用于 JPA/Hibernate
- 在实际项目中，两者功能类似，可以视为同一种对象类型

### Q2: VO 和 DTO 有什么区别？

**A**:

- **VO** 主要用于视图展示，通常包含格式化后的数据
- **DTO** 主要用于数据传输，可以是请求参数或响应数据
- 在某些场景下，VO 和 DTO 可以互换使用

### Q3: BO 和 DO 有什么区别？

**A**:

- **BO** 是业务对象，更偏向于业务逻辑封装
- **DO** 是领域对象，更偏向于领域驱动设计（DDD）
- 在实际项目中，两者功能类似，可以视为同一种对象类型

### Q4: 什么时候需要对象转换？

**A**:

- Controller 层：BO → VO（也可以让 Service 直接返回 VO）
- Service 层：DTO → BO，BO → PO，PO → BO
- DAO 层：只使用 PO

### Q5: 简单项目也需要这么多对象类型吗？

**A**:

- 对于简单项目，可以适当简化
- 建议至少区分：PO（数据库）、DTO（接口参数）、VO（接口返回）
- 随着项目复杂度增加，再逐步引入 BO、DO 等

---

## 八、总结

在 Java 企业级开发中，合理使用不同的对象类型可以：

1. **提高代码可维护性**：层次清晰，职责分明
2. **降低耦合度**：不同层之间通过对象转换解耦
3. **提高代码复用性**：不同场景可以使用不同的对象类型
4. **便于扩展**：新增字段或修改结构时影响范围可控

选择合适的对象类型，根据项目实际情况灵活运用，避免过度设计，保持代码简洁高效。

## 版本差异(对象分层 → Java 21 / Spring Boot 3.5.x)

| 特性 | 旧实践 | 当前实践 |
|------|--------|----------|
| VO/DTO | 手写 getter/setter（Lombok） | 不变；也可用 Java 16+ record 定义不可变 DTO |
| 对象转换 | 手写 BeanUtils | MapStruct 1.6.x（编译期生成，性能好）；BeanUtils（Spring 内置） |
| 分层模型 | VO/BO/PO/DO | 不变；新增 record 后 DTO 定义更简洁 |
| 注解包名 | javax.persistence / javax.validation | jakarta.persistence / jakarta.validation（Boot 3 强制） |
| 函数式 | 传统循环 | 可用 Stream 便于集合转换 |

> 对象分层（VO/BO/PO/DO）与转换规范不随版本变化；Java 21 下推荐 DTO 用 record 声明，转换用 MapStruct 或 Stream API。
