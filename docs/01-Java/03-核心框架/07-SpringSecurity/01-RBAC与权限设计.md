---
title: "RBAC与权限设计"
description: "权限设计做得好，系统就能稳定表达\"谁能对什么资源执行什么操作\"；做得差，系统很容易出现两种极端，要么权限过粗导致越权，要么规则过碎导致维护失控。RBAC 是最常见、也最容易落地的权限模型之一。"
keywords: [RBAC与权限设计]
category: "Java"
tags: [Java, SpringSecurity]
---


# RBAC 与权限设计

权限设计做得好，系统就能稳定表达"谁能对什么资源执行什么操作"；做得差，系统很容易出现两种极端，要么权限过粗导致越权，要么规则过碎导致维护失控。RBAC 是最常见、也最容易落地的权限模型之一。

## 概念与背景

### 什么是 RBAC

RBAC（Role-Based Access Control,基于角色的访问控制）是一种通过"角色"来组织权限的模型。它不是直接把权限绑在用户身上，而是建立这样的关系：

- **用户关联角色**：一个用户可以拥有多个角色
- **角色关联权限**：一个角色可以包含多个权限
- **权限描述资源与操作**：权限是对资源操作的抽象描述

这样做的核心好处是：

- **权限模型更容易复用**：相同职责的用户只需关联相同角色
- **用户权限变更成本更低**：调整角色权限即可影响所有相关用户
- **更适合后台管理系统和企业内部系统**：组织架构清晰，权限边界明确

### RBAC 解决什么问题

如果系统直接给每个用户单独分配权限，用户和权限一多，维护成本会迅速上升。RBAC 的目标就是把"用户"和"权限"之间加一层抽象，让权限管理更可控。

例如：

- **普通客服**：拥有"查看订单、回复工单"权限
- **财务**：拥有"查看账单、导出报表"权限
- **管理员**：拥有"系统配置、用户管理"权限

系统维护时，通常只需要调整角色和角色权限映射，而不是逐个改用户。

### RBAC 的核心价值

```text
┌─────────────┐
│   用户      │
└──────┬──────┘
       │
       │ n:m
       ▼
┌─────────────┐
│   角色      │ ← 权限的集合,职责的抽象
└──────┬──────┘
       │
       │ n:m
       ▼
┌─────────────┐
│   权限      │ ← 资源 + 操作的组合
└──────┬──────┘
       │
       │ 1:1
       ▼
┌─────────────┐
│ 资源+操作   │
└─────────────┘
```

这种分层的优势：

1. **解耦**：用户与权限不直接关联，通过角色中转
2. **复用**：角色可以在多个用户间共享
3. **灵活**：支持角色继承、权限组合等高级特性
4. **审计**：便于追溯权限来源和变更历史

## RBAC 权限模型详解

### RBAC0 - 基础模型

最基础的 RBAC 模型，包含三个核心实体：

```text
用户(User) ←→ 角色(Role) ←→ 权限(Permission)
```

**核心要素**:
- 用户：系统的使用者
- 角色：权限的集合，代表一种职责
- 权限：对资源的操作许可

**示例**:
```java
// 用户
public class User {
    private Long id;
    private String username;
    private Set<Role> roles; // 用户拥有的角色
}

// 角色
public class Role {
    private Long id;
    private String roleCode;  // 如:ADMIN,USER,MANAGER
    private String roleName;
    private Set<Permission> permissions; // 角色拥有的权限
}

// 权限
public class Permission {
    private Long id;
    private String resource;  // 资源标识,如:user,order,product
    private String operation; // 操作类型,如:create,read,update,delete
}
```

### RBAC1 - 角色分层模型

在 RBAC0 基础上引入角色继承，形成角色层级：

```text
         超级管理员
             ↓
         系统管理员
         ↙       ↘
   用户管理员   内容管理员
       ↓           ↓
   普通用户     内容编辑
```

**实现方式**:
```sql
-- 角色表增加父角色字段
CREATE TABLE sys_role (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role_code VARCHAR(50) NOT NULL COMMENT '角色编码',
    role_name VARCHAR(100) NOT NULL COMMENT '角色名称',
    parent_id BIGINT COMMENT '父角色ID',
    level INT DEFAULT 1 COMMENT '角色层级',
    sort INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态(0禁用 1启用)',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**权限继承规则**:
- 子角色自动继承父角色的所有权限
- 子角色可以扩展额外的权限
- 子角色的权限不能少于父角色

### RBAC2 - 角色约束模型

在 RBAC0 基础上增加约束条件：

**1. 互斥角色约束**

一个用户不能同时拥有两个互斥的角色：

```sql
-- 角色互斥表
CREATE TABLE sys_role_mutex (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role_id1 BIGINT NOT NULL COMMENT '角色ID1',
    role_id2 BIGINT NOT NULL COMMENT '角色ID2',
    description VARCHAR(200) COMMENT '互斥说明'
);
```

**典型场景**:
- 出纳和会计不能是同一个人
- 审批人和申请人不能是同一个人
- 系统管理员和审计员不能是同一个人

**代码实现**:
```java
@Service
public class RoleMutexChecker {
    
    @Autowired
    private RoleMutexMapper roleMutexMapper;
    
    /**
     * 检查角色是否互斥
     */
    public boolean isMutex(Long roleId1, Long roleId2) {
        return roleMutexMapper.checkMutex(roleId1, roleId2) > 0;
    }
    
    /**
     * 为用户分配角色前检查互斥
     */
    public void checkBeforeAssign(Long userId, Long roleId) {
        List<Long> existingRoleIds = getUserRoles(userId);
        for (Long existingRoleId : existingRoleIds) {
            if (isMutex(existingRoleId, roleId)) {
                throw new BusinessException("角色互斥,不能同时拥有");
            }
        }
    }
}
```

**2. 基数约束**

限制一个角色能分配的用户数量：

```sql
-- 角色表增加字段
ALTER TABLE sys_role ADD COLUMN max_user_count INT DEFAULT -1 COMMENT '最大用户数(-1表示不限)';
```

**代码实现**:
```java
@Service
public class RoleAssignService {
    
    @Autowired
    private UserRoleMapper userRoleMapper;
    @Autowired
    private RoleMapper roleMapper;
    
    /**
     * 分配角色给用户
     */
    @Transactional
    public void assignRole(Long userId, Long roleId) {
        Role role = roleMapper.selectById(roleId);
        
        // 检查基数约束
        if (role.getMaxUserCount() > 0) {
            int currentCount = userRoleMapper.countByRoleId(roleId);
            if (currentCount >= role.getMaxUserCount()) {
                throw new BusinessException("该角色用户数已达上限");
            }
        }
        
        userRoleMapper.insert(userId, roleId);
    }
}
```

**3. 先决角色约束**

要获得某角色，必须先拥有另一个角色：

```sql
-- 角色先决条件表
CREATE TABLE sys_role_prerequisite (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role_id BIGINT NOT NULL COMMENT '角色ID',
    prerequisite_role_id BIGINT NOT NULL COMMENT '先决角色ID'
);
```

### RBAC3 - 统一模型

RBAC3 = RBAC1 + RBAC2,既支持角色继承，又支持约束条件：

```text
┌──────────────────────────────────────┐
│          RBAC3 统一模型              │
├──────────────────────────────────────┤
│  ┌─────────────┐   ┌──────────────┐  │
│  │ 用户-角色   │   │ 角色继承     │  │
│  │ (n:m关系)   │   │ (RBAC1)      │  │
│  └─────────────┘   └──────────────┘  │
│                                      │
│  ┌─────────────┐   ┌──────────────┐  │
│  │ 角色-权限   │   │ 约束条件     │  │
│  │ (n:m关系)   │   │ (RBAC2)      │  │
│  └─────────────┘   └──────────────┘  │
└──────────────────────────────────────┘
```

## 权限表设计

### 核心表结构

**完整的 RBAC 数据库设计**:

```sql
-- 1. 用户表
CREATE TABLE sys_user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(100) NOT NULL COMMENT '密码',
    real_name VARCHAR(50) COMMENT '真实姓名',
    phone VARCHAR(20) COMMENT '手机号',
    email VARCHAR(100) COMMENT '邮箱',
    status TINYINT DEFAULT 1 COMMENT '状态(0禁用 1启用)',
    dept_id BIGINT COMMENT '部门ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_dept_id (dept_id)
) COMMENT '用户表';

-- 2. 角色表
CREATE TABLE sys_role (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role_code VARCHAR(50) NOT NULL UNIQUE COMMENT '角色编码',
    role_name VARCHAR(100) NOT NULL COMMENT '角色名称',
    parent_id BIGINT DEFAULT 0 COMMENT '父角色ID',
    level INT DEFAULT 1 COMMENT '角色层级',
    data_scope TINYINT DEFAULT 1 COMMENT '数据权限范围(1全部 2自定义 3本部门 4本部门及以下 5仅本人)',
    max_user_count INT DEFAULT -1 COMMENT '最大用户数(-1不限)',
    sort INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态(0禁用 1启用)',
    remark VARCHAR(500) COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent_id (parent_id)
) COMMENT '角色表';

-- 3. 权限表
CREATE TABLE sys_permission (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    permission_code VARCHAR(100) NOT NULL UNIQUE COMMENT '权限编码',
    permission_name VARCHAR(100) NOT NULL COMMENT '权限名称',
    resource_type TINYINT NOT NULL COMMENT '资源类型(1菜单 2按钮 3接口)',
    parent_id BIGINT DEFAULT 0 COMMENT '父权限ID',
    resource_url VARCHAR(200) COMMENT '资源路径',
    method VARCHAR(10) COMMENT 'HTTP方法(GET/POST/PUT/DELETE)',
    menu_url VARCHAR(200) COMMENT '菜单路径',
    menu_icon VARCHAR(100) COMMENT '菜单图标',
    component VARCHAR(200) COMMENT '前端组件路径',
    sort INT DEFAULT 0 COMMENT '排序',
    visible TINYINT DEFAULT 1 COMMENT '是否可见(0否 1是)',
    status TINYINT DEFAULT 1 COMMENT '状态(0禁用 1启用)',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent_id (parent_id),
    INDEX idx_resource_type (resource_type)
) COMMENT '权限表';

-- 4. 用户-角色关联表
CREATE TABLE sys_user_role (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    role_id BIGINT NOT NULL COMMENT '角色ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_role (user_id, role_id),
    INDEX idx_role_id (role_id)
) COMMENT '用户角色关联表';

-- 5. 角色-权限关联表
CREATE TABLE sys_role_permission (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role_id BIGINT NOT NULL COMMENT '角色ID',
    permission_id BIGINT NOT NULL COMMENT '权限ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_role_permission (role_id, permission_id),
    INDEX idx_permission_id (permission_id)
) COMMENT '角色权限关联表';

-- 6. 部门表(用于数据权限)
CREATE TABLE sys_dept (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    parent_id BIGINT DEFAULT 0 COMMENT '父部门ID',
    ancestors VARCHAR(500) COMMENT '祖级列表(如:0,1,2)',
    dept_name VARCHAR(100) NOT NULL COMMENT '部门名称',
    order_num INT DEFAULT 0 COMMENT '显示顺序',
    leader VARCHAR(50) COMMENT '负责人',
    phone VARCHAR(20) COMMENT '联系电话',
    email VARCHAR(100) COMMENT '邮箱',
    status TINYINT DEFAULT 1 COMMENT '状态(0禁用 1启用)',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent_id (parent_id)
) COMMENT '部门表';

-- 7. 角色-部门关联表(数据权限)
CREATE TABLE sys_role_dept (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role_id BIGINT NOT NULL COMMENT '角色ID',
    dept_id BIGINT NOT NULL COMMENT '部门ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_role_dept (role_id, dept_id)
) COMMENT '角色部门关联表(数据权限)';
```

### 权限编码规范

权限编码是权限系统的核心标识，建议采用统一规范：

```text
格式: {模块}:{资源}:{操作}

示例:
- user:create    用户模块创建用户
- user:read      用户模块查看用户
- user:update    用户模块更新用户
- user:delete    用户模块删除用户
- order:export   订单模块导出订单
- role:assign    角色模块分配角色
- system:config  系统模块配置管理
```

**权限编码设计原则**:

1. **一致性**：所有权限采用相同的命名规范
2. **可读性**：从编码就能理解权限含义
3. **层次性**：模块 → 资源 → 操作，层次分明
4. **扩展性**：新增模块和资源时有清晰规范

**代码实现**:
```java
/**
 * 权限编码常量类
 */
public class PermissionConstants {
    
    // 用户模块
    public static final String USER_CREATE = "user:create";
    public static final String USER_READ = "user:read";
    public static final String USER_UPDATE = "user:update";
    public static final String USER_DELETE = "user:delete";
    public static final String USER_EXPORT = "user:export";
    public static final String USER_IMPORT = "user:import";
    
    // 订单模块
    public static final String ORDER_CREATE = "order:create";
    public static final String ORDER_READ = "order:read";
    public static final String ORDER_UPDATE = "order:update";
    public static final String ORDER_DELETE = "order:delete";
    public static final String ORDER_CANCEL = "order:cancel";
    public static final String ORDER_EXPORT = "order:export";
    
    // 角色模块
    public static final String ROLE_CREATE = "role:create";
    public static final String ROLE_READ = "role:read";
    public static final String ROLE_UPDATE = "role:update";
    public static final String ROLE_DELETE = "role:delete";
    public static final String ROLE_ASSIGN = "role:assign";
    
    // 系统模块
    public static final String SYSTEM_CONFIG = "system:config";
    public static final String SYSTEM_LOG = "system:log";
    public static final String SYSTEM_MONITOR = "system:monitor";
}
```

### 数据权限设计

数据权限决定用户能看到哪些数据，是权限系统的难点：

**1. 数据权限范围类型**

```java
/**
 * 数据权限范围
 */
public enum DataScopeEnum {
    
    ALL(1, "全部数据权限"),
    CUSTOM(2, "自定义数据权限"),
    DEPT(3, "本部门数据权限"),
    DEPT_AND_CHILD(4, "本部门及以下数据权限"),
    SELF(5, "仅本人数据权限");
    
    private final Integer code;
    private final String desc;
    
    // getter methods...
}
```

**2. 数据权限过滤实现**

```java
/**
 * 数据权限注解
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface DataPermission {
    
    /**
     * 部门表的别名
     */
    String deptAlias() default "d";
    
    /**
     * 用户表的别名
     */
    String userAlias() default "u";
    
    /**
     * 是否启用数据权限过滤
     */
    boolean enabled() default true;
}

/**
 * 数据权限切面
 */
@Aspect
@Component
public class DataPermissionAspect {
    
    @Autowired
    private DataScopeService dataScopeService;
    
    @Before("@annotation(dataPermission)")
    public void doBefore(JoinPoint point, DataPermission dataPermission) {
        if (!dataPermission.enabled()) {
            return;
        }
        
        // 获取当前用户的数据权限范围
        DataScope dataScope = dataScopeService.getDataScope();
        
        // 构建数据权限SQL
        String sql = buildDataScopeSql(dataScope, dataPermission);
        
        // 设置到ThreadLocal,供MyBatis拦截器使用
        DataPermissionHolder.setSql(sql);
    }
    
    @After("@annotation(dataPermission)")
    public void doAfter(DataPermission dataPermission) {
        DataPermissionHolder.clear();
    }
    
    private String buildDataScopeSql(DataScope dataScope, DataPermission dataPermission) {
        String deptAlias = dataPermission.deptAlias();
        String userAlias = dataPermission.userAlias();
        
        switch (dataScope.getScopeType()) {
            case ALL:
                return ""; // 不加过滤条件
            
            case CUSTOM:
                // 自定义部门ID列表
                String deptIds = StringUtils.join(dataScope.getDeptIds(), ",");
                return String.format(" AND %s.dept_id IN (%s)", deptAlias, deptIds);
            
            case DEPT:
                // 本部门
                return String.format(" AND %s.dept_id = %d", deptAlias, dataScope.getDeptId());
            
            case DEPT_AND_CHILD:
                // 本部门及子部门
                return String.format(" AND %s.dept_id IN (SELECT id FROM sys_dept WHERE ancestors LIKE '%%%s%%')", 
                    deptAlias, dataScope.getDeptId());
            
            case SELF:
                // 仅本人
                return String.format(" AND %s.user_id = %d", userAlias, dataScope.getUserId());
            
            default:
                return "";
        }
    }
}

/**
 * 数据权限MyBatis拦截器
 */
@Intercepts({
    @Signature(type = StatementHandler.class, method = "prepare", args = {Connection.class, Integer.class})
})
@Component
public class DataPermissionInterceptor implements Interceptor {
    
    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        StatementHandler statementHandler = (StatementHandler) invocation.getTarget();
        MetaObject metaObject = SystemMetaObject.forObject(statementHandler);
        
        // 获取原始SQL
        String originalSql = (String) metaObject.getValue("delegate.boundSql.sql");
        
        // 获取数据权限SQL
        String dataScopeSql = DataPermissionHolder.getSql();
        
        if (StringUtils.isNotBlank(dataScopeSql)) {
            // 拼接数据权限SQL
            String newSql = originalSql + dataScopeSql;
            metaObject.setValue("delegate.boundSql.sql", newSql);
        }
        
        return invocation.proceed();
    }
}
```

**使用示例**:
```java
@Service
public class OrderService {
    
    @DataPermission(deptAlias = "o", userAlias = "o")
    public List<Order> queryOrderList(OrderQuery query) {
        return orderMapper.selectList(query);
        // 生成的SQL会自动追加数据权限过滤条件:
        // SELECT * FROM t_order o WHERE ... AND o.dept_id = #{currentDeptId}
    }
}
```

## SpringSecurity 权限控制实现

### 核心接口与类

SpringSecurity 提供了完整的权限控制框架：

**1. UserDetails 接口**

```java
/**
 * 用户详情实现
 */
public class LoginUser implements UserDetails {
    
    private Long userId;
    private String username;
    private String password;
    private Integer status;
    private Dept dept;
    private Set<String> permissions; // 权限编码集合
    private Set<String> roles; // 角色编码集合
    
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // 权限编码直接作为 authority；角色需加 ROLE_ 前缀，供 hasRole() 匹配
        Set<String> codes = new HashSet<>(permissions);
        roles.forEach(role -> codes.add("ROLE_" + role));
        return codes.stream()
            .map(SimpleGrantedAuthority::new)
            .collect(Collectors.toSet());
    }
    
    @Override
    public String getPassword() {
        return password;
    }
    
    @Override
    public String getUsername() {
        return username;
    }
    
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }
    
    @Override
    public boolean isAccountNonLocked() {
        return status != 0;
    }
    
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
    
    @Override
    public boolean isEnabled() {
        return status == 1;
    }
    
    // getter and setter methods...
}
```

**2. UserDetailsService 接口**

```java
/**
 * 用户详情服务实现
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {
    
    @Autowired
    private UserMapper userMapper;
    
    @Autowired
    private PermissionMapper permissionMapper;
    
    @Autowired
    private RoleMapper roleMapper;
    
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // 查询用户
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new UsernameNotFoundException("用户不存在");
        }
        
        // 查询用户权限
        Set<String> permissions = permissionMapper.selectPermissionsByUserId(user.getId());
        
        // 查询用户角色
        Set<String> roles = roleMapper.selectRolesByUserId(user.getId());
        
        // 构建LoginUser
        LoginUser loginUser = new LoginUser();
        loginUser.setUserId(user.getId());
        loginUser.setUsername(user.getUsername());
        loginUser.setPassword(user.getPassword());
        loginUser.setStatus(user.getStatus());
        loginUser.setDept(user.getDept());
        loginUser.setPermissions(permissions);
        loginUser.setRoles(roles);
        
        return loginUser;
    }
}
```

**3. 权限数据加载**

```java
/**
 * 权限Mapper
 */
@Mapper
public interface PermissionMapper {
    
    /**
     * 根据用户ID查询权限编码
     */
    @Select("SELECT DISTINCT p.permission_code " +
            "FROM sys_permission p " +
            "INNER JOIN sys_role_permission rp ON p.id = rp.permission_id " +
            "INNER JOIN sys_user_role ur ON rp.role_id = ur.role_id " +
            "WHERE ur.user_id = #{userId} AND p.status = 1")
    Set<String> selectPermissionsByUserId(@Param("userId") Long userId);
    
    /**
     * 根据角色ID查询权限编码
     */
    @Select("SELECT DISTINCT p.permission_code " +
            "FROM sys_permission p " +
            "INNER JOIN sys_role_permission rp ON p.id = rp.permission_id " +
            "WHERE rp.role_id = #{roleId} AND p.status = 1")
    Set<String> selectPermissionsByRoleId(@Param("roleId") Long roleId);
    
    /**
     * 查询所有菜单权限(用于动态路由)
     */
    @Select("SELECT * FROM sys_permission " +
            "WHERE resource_type = 1 AND status = 1 " +
            "ORDER BY sort")
    List<Permission> selectAllMenus();
    
    /**
     * 根据用户ID查询菜单权限
     */
    @Select("SELECT DISTINCT p.* " +
            "FROM sys_permission p " +
            "INNER JOIN sys_role_permission rp ON p.id = rp.permission_id " +
            "INNER JOIN sys_user_role ur ON rp.role_id = ur.role_id " +
            "WHERE ur.user_id = #{userId} " +
            "AND p.resource_type = 1 " +
            "AND p.status = 1 " +
            "ORDER BY p.sort")
    List<Permission> selectMenusByUserId(@Param("userId") Long userId);
}
```

### 接口级权限控制

**1. 基于配置的权限控制**

```java
/**
 * SpringSecurity配置
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 禁用CSRF
            .csrf(csrf -> csrf.disable())
            
            // 配置请求授权
            .authorizeHttpRequests(auth -> auth
                // 静态资源放行
                .requestMatchers("/static/**", "/favicon.ico").permitAll()
                
                // 登录接口放行
                .requestMatchers("/auth/login", "/auth/captcha").permitAll()
                
                // Swagger文档放行
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                
                // 管理员接口
                .requestMatchers("/admin/**").hasRole("ADMIN")
                
                // 用户管理接口
                .requestMatchers("/user/**").hasAnyAuthority("user:read", "user:write")
                
                // 订单管理接口
                .requestMatchers("/order/**").hasAnyAuthority("order:read", "order:write")
                
                // 其他请求需要认证
                .anyRequest().authenticated()
            )
            
            // 配置表单登录
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/auth/login")
                .successHandler(authenticationSuccessHandler())
                .failureHandler(authenticationFailureHandler())
            )
            
            // 配置登出
            .logout(logout -> logout
                .logoutUrl("/auth/logout")
                .logoutSuccessHandler(logoutSuccessHandler())
            )
            
            // 配置异常处理
            .exceptionHandling(exception -> exception
                .authenticationEntryPoint(authenticationEntryPoint())
                .accessDeniedHandler(accessDeniedHandler())
            );
        
        return http.build();
    }
    
    /**
     * 认证成功处理器
     */
    @Bean
    public AuthenticationSuccessHandler authenticationSuccessHandler() {
        return (request, response, authentication) -> {
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(JSON.toJSONString(Result.success("登录成功")));
        };
    }
    
    /**
     * 认证失败处理器
     */
    @Bean
    public AuthenticationFailureHandler authenticationFailureHandler() {
        return (request, response, exception) -> {
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(JSON.toJSONString(Result.error("登录失败")));
        };
    }
    
    /**
     * 未认证处理
     */
    @Bean
    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setContentType("application/json;charset=UTF-8");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write(JSON.toJSONString(Result.error(401, "未登录或登录已过期")));
        };
    }
    
    /**
     * 权限不足处理
     */
    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            response.setContentType("application/json;charset=UTF-8");
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write(JSON.toJSONString(Result.error(403, "权限不足")));
        };
    }
}
```

**2. 基于数据库的动态权限控制**

```java
/**
 * 动态权限数据源
 */
@Component
public class DynamicPermissionDataSource {
    
    @Autowired
    private PermissionMapper permissionMapper;
    
    @Autowired
    private RoleMapper roleMapper;
    
    /**
     * 加载权限配置
     * 返回格式: Map<URL, List<权限编码>>
     */
    public Map<String, List<String>> loadPermissionConfig() {
        // 查询所有接口权限
        List<Permission> permissions = permissionMapper.selectApiPermissions();
        
        // 构建URL与权限的映射
        Map<String, List<String>> urlPermissionMap = new HashMap<>();
        for (Permission permission : permissions) {
            String url = permission.getResourceUrl();
            String permissionCode = permission.getPermissionCode();
            
            urlPermissionMap.computeIfAbsent(url, k -> new ArrayList<>())
                .add(permissionCode);
        }
        
        return urlPermissionMap;
    }
}

/**
 * 动态权限过滤器
 */
@Component
public class DynamicPermissionFilter extends OncePerRequestFilter {
    
    @Autowired
    private DynamicPermissionDataSource permissionDataSource;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) 
            throws ServletException, IOException {
        
        // 获取当前认证信息
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            filterChain.doFilter(request, response);
            return;
        }
        
        // 获取请求URL
        String requestURI = request.getRequestURI();
        
        // 加载权限配置
        Map<String, List<String>> urlPermissionMap = permissionDataSource.loadPermissionConfig();
        
        // 查找URL需要的权限
        List<String> requiredPermissions = urlPermissionMap.get(requestURI);
        
        if (requiredPermissions == null || requiredPermissions.isEmpty()) {
            // 没有配置权限,放行
            filterChain.doFilter(request, response);
            return;
        }
        
        // 检查用户是否有任一权限
        boolean hasPermission = requiredPermissions.stream()
            .anyMatch(permission -> authentication.getAuthorities()
                .stream()
                .anyMatch(auth -> auth.getAuthority().equals(permission)));
        
        if (!hasPermission) {
            response.setContentType("application/json;charset=UTF-8");
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write(JSON.toJSONString(Result.error(403, "权限不足")));
            return;
        }
        
        filterChain.doFilter(request, response);
    }
}
```

## @PreAuthorize 等注解详解

SpringSecurity 提供了四个方法级权限控制注解：

### @PreAuthorize

在方法执行前进行权限校验：

```java
/**
 * @PreAuthorize 注解详解
 */
@RestController
@RequestMapping("/user")
public class UserController {
    
    /**
     * 要求用户必须有user:read权限
     */
    @GetMapping("/list")
    @PreAuthorize("hasAuthority('user:read')")
    public Result<List<User>> list() {
        return Result.success(userService.list());
    }
    
    /**
     * 要求用户必须有USER角色
     */
    @GetMapping("/info/{id}")
    @PreAuthorize("hasRole('USER')")
    public Result<User> info(@PathVariable Long id) {
        return Result.success(userService.getById(id));
    }
    
    /**
     * 要求用户有任一权限
     */
    @GetMapping("/detail/{id}")
    @PreAuthorize("hasAnyAuthority('user:read', 'user:write')")
    public Result<User> detail(@PathVariable Long id) {
        return Result.success(userService.getById(id));
    }
    
    /**
     * 要求用户有所有权限
     */
    @PostMapping("/create")
    @PreAuthorize("hasAuthority('user:create') and hasAuthority('user:write')")
    public Result<Void> create(@RequestBody User user) {
        userService.save(user);
        return Result.success();
    }
    
    /**
     * 使用SpEL表达式,支持逻辑运算
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('user:delete') or hasRole('ADMIN')")
    public Result<Void> delete(@PathVariable Long id) {
        userService.removeById(id);
        return Result.success();
    }
    
    /**
     * 访问方法参数
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('user:update') and @userService.canUpdate(authentication, #id)")
    public Result<Void> update(@PathVariable Long id, @RequestBody User user) {
        userService.updateById(user);
        return Result.success();
    }
    
    /**
     * 复杂业务权限校验
     */
    @PostMapping("/{orderId}/cancel")
    @PreAuthorize("@orderPermissionChecker.canCancel(authentication, #orderId)")
    public Result<Void> cancelOrder(@PathVariable Long orderId) {
        orderService.cancel(orderId);
        return Result.success();
    }
}
```

### @PostAuthorize

在方法执行后进行权限校验，可以访问返回值：

```java
@RestController
@RequestMapping("/order")
public class OrderController {
    
    /**
     * 访问返回值,用户只能查看自己的订单
     */
    @GetMapping("/{id}")
    @PostAuthorize("hasRole('ADMIN') or returnObject.data.userId == authentication.principal.userId")
    public Result<Order> getOrder(@PathVariable Long id) {
        Order order = orderService.getById(id);
        return Result.success(order);
    }
    
    /**
     * 访问返回值的属性
     */
    @GetMapping("/detail/{id}")
    @PostAuthorize("@dataPermissionChecker.canAccessOrder(authentication, returnObject.data)")
    public Result<OrderDetail> getOrderDetail(@PathVariable Long id) {
        OrderDetail detail = orderService.getDetail(id);
        return Result.success(detail);
    }
}
```

### @PreFilter

对方法参数进行过滤：

```java
@RestController
@RequestMapping("/batch")
public class BatchController {
    
    /**
     * 过滤参数集合,只保留有权限的数据
     */
    @PostMapping("/orders")
    @PreFilter(value = "hasRole('ADMIN') or filterObject.userId == authentication.principal.userId", 
               filterTarget = "orders")
    public Result<Void> batchUpdateOrders(@RequestBody List<Order> orders) {
        orderService.batchUpdate(orders);
        return Result.success();
    }
    
    /**
     * 过滤多个参数
     */
    @PostMapping("/items")
    @PreFilter(value = "filterObject.userId == authentication.principal.userId", 
               filterTarget = "items")
    public Result<Void> batchUpdateItems(@RequestBody List<OrderItem> items) {
        orderItemService.batchUpdate(items);
        return Result.success();
    }
}
```

### @PostFilter

对返回值进行过滤：

```java
@RestController
@RequestMapping("/data")
public class DataController {
    
    /**
     * 过滤返回值集合,只保留有权限的数据
     */
    @GetMapping("/orders")
    @PostFilter("hasRole('ADMIN') or filterObject.userId == authentication.principal.userId")
    public List<Order> getOrders() {
        return orderService.list();
    }
    
    /**
     * 过滤嵌套集合
     */
    @GetMapping("/departments")
    @PostFilter("filterObject.managerId == authentication.principal.userId")
    public List<Department> getDepartments() {
        return departmentService.list();
    }
}
```

### 自定义权限校验方法

```java
/**
 * 自定义权限校验Bean
 */
@Component("permissionChecker")
public class PermissionChecker {
    
    @Autowired
    private OrderService orderService;
    
    @Autowired
    private DataScopeService dataScopeService;
    
    /**
     * 检查用户是否可以取消订单
     */
    public boolean canCancel(Authentication authentication, Long orderId) {
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        
        Order order = orderService.getById(orderId);
        if (order == null) {
            return false;
        }
        
        // 管理员可以取消所有订单
        if (authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"))) {
            return true;
        }
        
        // 用户只能取消自己的订单
        return order.getUserId().equals(loginUser.getUserId());
    }
    
    /**
     * 检查用户是否可以访问订单
     */
    public boolean canAccessOrder(Authentication authentication, Order order) {
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        
        // 检查数据权限
        DataScope dataScope = dataScopeService.getDataScope();
        
        switch (dataScope.getScopeType()) {
            case ALL:
                return true;
            
            case DEPT:
                return order.getDeptId().equals(dataScope.getDeptId());
            
            case DEPT_AND_CHILD:
                return dataScope.getDeptIds().contains(order.getDeptId());
            
            case SELF:
                return order.getUserId().equals(loginUser.getUserId());
            
            default:
                return false;
        }
    }
    
    /**
     * 检查用户是否在指定部门
     */
    public boolean inDepartment(Authentication authentication, Long deptId) {
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        return loginUser.getDept().getId().equals(deptId);
    }
    
    /**
     * 检查用户是否是资源所有者
     */
    public boolean isOwner(Authentication authentication, Long resourceUserId) {
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        return loginUser.getUserId().equals(resourceUserId);
    }
}
```

**使用自定义权限校验**:
```java
@RestController
@RequestMapping("/order")
public class OrderController {
    
    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionChecker.canCancel(authentication, #id)")
    public Result<Void> deleteOrder(@PathVariable Long id) {
        orderService.removeById(id);
        return Result.success();
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("@permissionChecker.isOwner(authentication, #order.userId)")
    public Result<Void> updateOrder(@PathVariable Long id, @RequestBody Order order) {
        orderService.updateById(order);
        return Result.success();
    }
}
```

## 动态权限实现方案

### 方案一：数据库驱动动态权限

**核心思想**：权限配置存储在数据库中，支持实时修改，无需重启应用。

```java
/**
 * 动态权限配置服务
 */
@Service
public class DynamicPermissionService {
    
    @Autowired
    private PermissionMapper permissionMapper;
    
    @Autowired
    private RolePermissionMapper rolePermissionMapper;
    
    // 权限配置缓存
    private volatile Map<String, List<String>> permissionConfigCache;
    
    /**
     * 获取权限配置(带缓存)
     */
    public Map<String, List<String>> getPermissionConfig() {
        if (permissionConfigCache == null) {
            synchronized (this) {
                if (permissionConfigCache == null) {
                    refreshPermissionConfig();
                }
            }
        }
        return permissionConfigCache;
    }
    
    /**
     * 刷新权限配置
     */
    public void refreshPermissionConfig() {
        // 查询所有接口权限及对应角色
        List<PermissionRoleDTO> permissionRoles = permissionMapper.selectPermissionRoles();
        
        // 构建URL -> 权限编码映射
        Map<String, List<String>> config = new HashMap<>();
        for (PermissionRoleDTO dto : permissionRoles) {
            String url = dto.getUrl();
            String permissionCode = dto.getPermissionCode();
            
            config.computeIfAbsent(url, k -> new ArrayList<>())
                .add(permissionCode);
        }
        
        permissionConfigCache = config;
    }
    
    /**
     * 检查权限
     */
    public boolean checkPermission(String url, Collection<? extends GrantedAuthority> authorities) {
        Map<String, List<String>> config = getPermissionConfig();
        List<String> requiredPermissions = config.get(url);
        
        if (requiredPermissions == null || requiredPermissions.isEmpty()) {
            return true; // 没有配置权限要求,放行
        }
        
        // 检查是否有任一权限
        return requiredPermissions.stream()
            .anyMatch(required -> authorities.stream()
                .anyMatch(auth -> auth.getAuthority().equals(required)));
    }
}

/**
 * 动态权限过滤器
 */
@Component
public class DynamicPermissionFilter extends OncePerRequestFilter {
    
    @Autowired
    private DynamicPermissionService permissionService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) 
            throws ServletException, IOException {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            filterChain.doFilter(request, response);
            return;
        }
        
        String requestURI = request.getRequestURI();
        
        if (!permissionService.checkPermission(requestURI, authentication.getAuthorities())) {
            response.setContentType("application/json;charset=UTF-8");
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write(JSON.toJSONString(Result.error(403, "权限不足")));
            return;
        }
        
        filterChain.doFilter(request, response);
    }
}
```

### 方案二：基于Redis的分布式权限

**核心思想**：权限配置存储在Redis中，支持分布式环境下的权限管理。

```java
/**
 * Redis权限服务
 */
@Service
public class RedisPermissionService {
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    @Autowired
    private PermissionMapper permissionMapper;
    
    private static final String PERMISSION_URL_KEY = "permission:url:";
    private static final String USER_PERMISSION_KEY = "user:permission:";
    private static final String USER_ROLE_KEY = "user:role:";
    
    /**
     * 加载用户权限到Redis
     */
    public void loadUserPermissions(Long userId) {
        // 查询用户权限
        Set<String> permissions = permissionMapper.selectPermissionsByUserId(userId);
        Set<String> roles = permissionMapper.selectRolesByUserId(userId);
        
        // 存储到Redis
        String permissionKey = USER_PERMISSION_KEY + userId;
        String roleKey = USER_ROLE_KEY + userId;
        
        redisTemplate.delete(permissionKey);
        redisTemplate.delete(roleKey);
        
        if (!permissions.isEmpty()) {
            redisTemplate.opsForSet().add(permissionKey, permissions.toArray());
            redisTemplate.expire(permissionKey, 2, TimeUnit.HOURS);
        }
        
        if (!roles.isEmpty()) {
            redisTemplate.opsForSet().add(roleKey, roles.toArray());
            redisTemplate.expire(roleKey, 2, TimeUnit.HOURS);
        }
    }
    
    /**
     * 检查用户是否有指定权限
     */
    public boolean hasPermission(Long userId, String permission) {
        String permissionKey = USER_PERMISSION_KEY + userId;
        return Boolean.TRUE.equals(redisTemplate.opsForSet().isMember(permissionKey, permission));
    }
    
    /**
     * 检查用户是否有指定角色
     */
    public boolean hasRole(Long userId, String role) {
        String roleKey = USER_ROLE_KEY + userId;
        return Boolean.TRUE.equals(redisTemplate.opsForSet().isMember(roleKey, role));
    }
    
    /**
     * 清除用户权限缓存
     */
    public void clearUserPermissions(Long userId) {
        redisTemplate.delete(USER_PERMISSION_KEY + userId);
        redisTemplate.delete(USER_ROLE_KEY + userId);
    }
    
    /**
     * 加载URL权限配置到Redis
     */
    public void loadUrlPermissionConfig() {
        List<Permission> permissions = permissionMapper.selectApiPermissions();
        
        for (Permission permission : permissions) {
            String key = PERMISSION_URL_KEY + permission.getResourceUrl();
            redisTemplate.opsForSet().add(key, permission.getPermissionCode());
        }
    }
    
    /**
     * 检查URL权限
     */
    public boolean checkUrlPermission(String url, Long userId) {
        String key = PERMISSION_URL_KEY + url;
        Set<Object> requiredPermissions = redisTemplate.opsForSet().members(key);
        
        if (requiredPermissions == null || requiredPermissions.isEmpty()) {
            return true;
        }
        
        for (Object permission : requiredPermissions) {
            if (hasPermission(userId, (String) permission)) {
                return true;
            }
        }
        
        return false;
    }
}
```

### 方案三：基于注解的权限管理

**核心思想**：通过自定义注解实现灵活的权限控制。

```java
/**
 * 自定义权限注解
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePermission {
    
    /**
     * 需要的权限编码
     */
    String[] value() default {};
    
    /**
     * 逻辑关系(AND/OR)
     */
    Logical logical() default Logical.OR;
    
    /**
     * 逻辑关系枚举
     */
    enum Logical {
        AND, OR
    }
}

/**
 * 权限切面
 */
@Aspect
@Component
public class RequirePermissionAspect {
    
    @Autowired
    private PermissionService permissionService;
    
    @Around("@annotation(requirePermission)")
    public Object around(ProceedingJoinPoint point, RequirePermission requirePermission) throws Throwable {
        // 获取当前用户
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("未登录");
        }
        
        String[] permissions = requirePermission.value();
        Logical logical = requirePermission.logical();
        
        boolean hasPermission;
        if (logical == Logical.AND) {
            // 需要所有权限
            hasPermission = Arrays.stream(permissions)
                .allMatch(permission -> authentication.getAuthorities()
                    .stream()
                    .anyMatch(auth -> auth.getAuthority().equals(permission)));
        } else {
            // 需要任一权限
            hasPermission = Arrays.stream(permissions)
                .anyMatch(permission -> authentication.getAuthorities()
                    .stream()
                    .anyMatch(auth -> auth.getAuthority().equals(permission)));
        }
        
        if (!hasPermission) {
            throw new AccessDeniedException("权限不足");
        }
        
        return point.proceed();
    }
}

/**
 * 使用自定义注解
 */
@RestController
@RequestMapping("/admin")
public class AdminController {
    
    /**
     * 需要user:read权限
     */
    @GetMapping("/users")
    @RequirePermission("user:read")
    public Result<List<User>> listUsers() {
        return Result.success(userService.list());
    }
    
    /**
     * 需要user:create和user:write权限
     */
    @PostMapping("/users")
    @RequirePermission(value = {"user:create", "user:write"}, logical = Logical.AND)
    public Result<Void> createUser(@RequestBody User user) {
        userService.save(user);
        return Result.success();
    }
    
    /**
     * 需要ADMIN角色或user:delete权限
     */
    @DeleteMapping("/users/{id}")
    @RequirePermission(value = {"ROLE_ADMIN", "user:delete"}, logical = Logical.OR)
    public Result<Void> deleteUser(@PathVariable Long id) {
        userService.removeById(id);
        return Result.success();
    }
}
```

### 权限刷新机制

```java
/**
 * 权限刷新监听器
 */
@Component
public class PermissionRefreshListener {
    
    @Autowired
    private DynamicPermissionService permissionService;
    
    @Autowired
    private RedisPermissionService redisPermissionService;
    
    /**
     * 监听权限变更事件
     */
    @EventListener
    public void onPermissionChange(PermissionChangeEvent event) {
        // 刷新数据库权限配置
        permissionService.refreshPermissionConfig();
        
        // 清除相关用户的Redis权限缓存
        if (event.getRoleIds() != null) {
            for (Long roleId : event.getRoleIds()) {
                List<Long> userIds = getUserIdsByRoleId(roleId);
                for (Long userId : userIds) {
                    redisPermissionService.clearUserPermissions(userId);
                }
            }
        }
    }
    
    /**
     * 监听角色变更事件
     */
    @EventListener
    public void onRoleChange(RoleChangeEvent event) {
        // 清除相关用户的权限缓存
        if (event.getUserIds() != null) {
            for (Long userId : event.getUserIds()) {
                redisPermissionService.clearUserPermissions(userId);
            }
        }
    }
}

/**
 * 权限管理服务
 */
@Service
public class PermissionManageService {
    
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    
    @Autowired
    private RolePermissionMapper rolePermissionMapper;
    
    /**
     * 分配权限给角色
     */
    @Transactional
    public void assignPermissions(Long roleId, List<Long> permissionIds) {
        // 删除原有权限
        rolePermissionMapper.deleteByRoleId(roleId);
        
        // 新增权限
        if (!permissionIds.isEmpty()) {
            rolePermissionMapper.batchInsert(roleId, permissionIds);
        }
        
        // 发布权限变更事件
        eventPublisher.publishEvent(new PermissionChangeEvent(roleId));
    }
    
    /**
     * 分配角色给用户
     */
    @Transactional
    public void assignRoles(Long userId, List<Long> roleIds) {
        // 删除原有角色
        userRoleMapper.deleteByUserId(userId);
        
        // 新增角色
        if (!roleIds.isEmpty()) {
            userRoleMapper.batchInsert(userId, roleIds);
        }
        
        // 发布角色变更事件
        eventPublisher.publishEvent(new RoleChangeEvent(userId));
    }
}
```

## 完整实战案例：电商后台权限系统

### 业务场景

某电商后台管理系统，需要实现：

1. 用户管理、角色管理、权限管理
2. 订单管理、商品管理、库存管理
3. 数据权限控制（部门、个人）
4. 动态菜单权限
5. 接口级权限控制

### 权限模型设计

```java
/**
 * 用户实体
 */
@Data
@TableName("sys_user")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String username;
    private String password;
    private String realName;
    private String phone;
    private String email;
    private Integer status;
    private Long deptId;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    
    @TableField(exist = false)
    private Dept dept;
    
    @TableField(exist = false)
    private List<Role> roles;
}

/**
 * 角色实体
 */
@Data
@TableName("sys_role")
public class Role {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String roleCode;
    private String roleName;
    private Long parentId;
    private Integer level;
    private Integer dataScope;
    private Integer maxUserCount;
    private Integer sort;
    private Integer status;
    private String remark;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    
    @TableField(exist = false)
    private List<Permission> permissions;
    
    @TableField(exist = false)
    private List<Dept> dataScopeDepts;
}

/**
 * 权限实体
 */
@Data
@TableName("sys_permission")
public class Permission {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String permissionCode;
    private String permissionName;
    private Integer resourceType; // 1菜单 2按钮 3接口
    private Long parentId;
    private String resourceUrl;
    private String method;
    private String menuUrl;
    private String menuIcon;
    private String component;
    private Integer sort;
    private Integer visible;
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    
    @TableField(exist = false)
    private List<Permission> children;
}

/**
 * 部门实体
 */
@Data
@TableName("sys_dept")
public class Dept {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long parentId;
    private String ancestors;
    private String deptName;
    private Integer orderNum;
    private String leader;
    private String phone;
    private String email;
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    
    @TableField(exist = false)
    private List<Dept> children;
}
```

### 核心服务实现

```java
/**
 * 权限服务
 */
@Service
public class PermissionService {
    
    @Autowired
    private PermissionMapper permissionMapper;
    
    @Autowired
    private RolePermissionMapper rolePermissionMapper;
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    /**
     * 获取用户菜单树
     */
    public List<Permission> getUserMenuTree(Long userId) {
        // 查询用户菜单权限
        List<Permission> menus = permissionMapper.selectMenusByUserId(userId);
        
        // 构建树形结构
        return buildMenuTree(menus, 0L);
    }
    
    /**
     * 构建菜单树
     */
    private List<Permission> buildMenuTree(List<Permission> menus, Long parentId) {
        return menus.stream()
            .filter(menu -> menu.getParentId().equals(parentId))
            .peek(menu -> menu.setChildren(buildMenuTree(menus, menu.getId())))
            .collect(Collectors.toList());
    }
    
    /**
     * 获取用户权限编码集合
     */
    public Set<String> getUserPermissionCodes(Long userId) {
        // 先从Redis获取
        String key = "user:permission:" + userId;
        Set<Object> permissions = redisTemplate.opsForSet().members(key);
        
        if (permissions != null && !permissions.isEmpty()) {
            return permissions.stream()
                .map(Object::toString)
                .collect(Collectors.toSet());
        }
        
        // 从数据库查询
        Set<String> permissionCodes = permissionMapper.selectPermissionsByUserId(userId);
        
        // 存入Redis
        if (!permissionCodes.isEmpty()) {
            redisTemplate.opsForSet().add(key, permissionCodes.toArray());
            redisTemplate.expire(key, 2, TimeUnit.HOURS);
        }
        
        return permissionCodes;
    }
    
    /**
     * 检查用户是否有指定权限
     */
    public boolean hasPermission(Long userId, String permissionCode) {
        Set<String> permissions = getUserPermissionCodes(userId);
        return permissions.contains(permissionCode);
    }
    
    /**
     * 分配权限给角色
     */
    @Transactional
    public void assignPermissions(Long roleId, List<Long> permissionIds) {
        // 删除原有权限
        rolePermissionMapper.deleteByRoleId(roleId);
        
        // 新增权限
        if (!permissionIds.isEmpty()) {
            rolePermissionMapper.batchInsert(roleId, permissionIds);
        }
        
        // 清除相关用户的权限缓存
        clearUserPermissionCache(roleId);
    }
    
    /**
     * 清除用户权限缓存
     */
    private void clearUserPermissionCache(Long roleId) {
        List<Long> userIds = permissionMapper.selectUserIdsByRoleId(roleId);
        for (Long userId : userIds) {
            redisTemplate.delete("user:permission:" + userId);
        }
    }
}

/**
 * 数据权限服务
 */
@Service
public class DataScopeService {
    
    @Autowired
    private RoleMapper roleMapper;
    
    @Autowired
    private DeptMapper deptMapper;
    
    /**
     * 获取用户数据权限范围
     */
    public DataScope getDataScope(Long userId) {
        // 查询用户角色
        List<Role> roles = roleMapper.selectByUserId(userId);
        
        // 取最大数据权限范围
        Integer maxDataScope = roles.stream()
            .map(Role::getDataScope)
            .min(Comparator.comparingInt(DataScopeEnum::getLevel))
            .orElse(DataScopeEnum.SELF.getCode());
        
        // 构建数据权限对象
        DataScope dataScope = new DataScope();
        dataScope.setUserId(userId);
        dataScope.setScopeType(maxDataScope);
        
        // 查询用户部门
        User user = userMapper.selectById(userId);
        dataScope.setDeptId(user.getDeptId());
        
        // 自定义数据权限
        if (maxDataScope == DataScopeEnum.CUSTOM.getCode()) {
            Set<Long> deptIds = new HashSet<>();
            for (Role role : roles) {
                if (role.getDataScope() == DataScopeEnum.CUSTOM.getCode()) {
                    List<Long> roleDeptIds = deptMapper.selectDeptIdsByRoleId(role.getId());
                    deptIds.addAll(roleDeptIds);
                }
            }
            dataScope.setDeptIds(deptIds);
        }
        
        // 本部门及子部门
        if (maxDataScope == DataScopeEnum.DEPT_AND_CHILD.getCode()) {
            Dept dept = deptMapper.selectById(user.getDeptId());
            List<Dept> childDepts = deptMapper.selectChildrenByAncestors(dept.getAncestors() + "," + dept.getId());
            Set<Long> deptIds = childDepts.stream()
                .map(Dept::getId)
                .collect(Collectors.toSet());
            deptIds.add(user.getDeptId());
            dataScope.setDeptIds(deptIds);
        }
        
        return dataScope;
    }
}

/**
 * 数据权限对象
 */
@Data
public class DataScope {
    private Long userId;
    private Integer scopeType;
    private Long deptId;
    private Set<Long> deptIds;
}
```

### 订单管理控制器

```java
/**
 * 订单管理控制器
 */
@RestController
@RequestMapping("/api/order")
public class OrderController {
    
    @Autowired
    private OrderService orderService;
    
    /**
     * 查询订单列表(带数据权限)
     */
    @GetMapping("/list")
    @PreAuthorize("hasAuthority('order:read')")
    @DataPermission(deptAlias = "o", userAlias = "o")
    public Result<PageResult<OrderVO>> list(OrderQuery query) {
        PageResult<OrderVO> result = orderService.queryList(query);
        return Result.success(result);
    }
    
    /**
     * 查询订单详情
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('order:read')")
    public Result<OrderDetailVO> detail(@PathVariable Long id) {
        OrderDetailVO detail = orderService.queryDetail(id);
        return Result.success(detail);
    }
    
    /**
     * 创建订单
     */
    @PostMapping
    @PreAuthorize("hasAuthority('order:create')")
    public Result<Long> create(@Valid @RequestBody OrderCreateDTO dto) {
        Long orderId = orderService.create(dto);
        return Result.success(orderId);
    }
    
    /**
     * 取消订单
     */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("@permissionChecker.canCancelOrder(authentication, #id)")
    public Result<Void> cancel(@PathVariable Long id, @RequestBody OrderCancelDTO dto) {
        orderService.cancel(id, dto);
        return Result.success();
    }
    
    /**
     * 导出订单
     */
    @GetMapping("/export")
    @PreAuthorize("hasAuthority('order:export')")
    @DataPermission(deptAlias = "o", userAlias = "o")
    public void export(OrderQuery query, HttpServletResponse response) {
        List<OrderExportVO> list = orderService.queryExportList(query);
        
        // 导出Excel
        ExcelUtil.exportExcel(response, "订单数据", OrderExportVO.class, list);
    }
    
    /**
     * 批量删除订单
     */
    @DeleteMapping("/batch")
    @PreAuthorize("hasAuthority('order:delete')")
    @PreFilter(value = "@permissionChecker.canDeleteOrder(authentication, filterObject)", 
               filterTarget = "ids")
    public Result<Void> batchDelete(@RequestBody List<Long> ids) {
        orderService.batchDelete(ids);
        return Result.success();
    }
}
```

### 权限校验器

```java
/**
 * 订单权限校验器
 */
@Component("permissionChecker")
public class PermissionChecker {
    
    @Autowired
    private OrderService orderService;
    
    @Autowired
    private DataScopeService dataScopeService;
    
    /**
     * 检查用户是否可以取消订单
     */
    public boolean canCancelOrder(Authentication authentication, Long orderId) {
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        
        Order order = orderService.getById(orderId);
        if (order == null) {
            return false;
        }
        
        // 管理员可以取消所有订单
        if (hasRole(authentication, "ADMIN")) {
            return true;
        }
        
        // 客服可以取消未支付订单
        if (hasAuthority(authentication, "order:cancel") && 
            order.getStatus() == OrderStatus.UNPAID) {
            return true;
        }
        
        // 用户只能取消自己的未支付订单
        return order.getUserId().equals(loginUser.getUserId()) && 
               order.getStatus() == OrderStatus.UNPAID;
    }
    
    /**
     * 检查用户是否可以删除订单
     */
    public boolean canDeleteOrder(Authentication authentication, Long orderId) {
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        
        Order order = orderService.getById(orderId);
        if (order == null) {
            return false;
        }
        
        // 检查数据权限
        DataScope dataScope = dataScopeService.getDataScope(loginUser.getUserId());
        
        switch (DataScopeEnum.getByCode(dataScope.getScopeType())) {
            case ALL:
                return true;
            
            case DEPT:
                return order.getDeptId().equals(dataScope.getDeptId());
            
            case DEPT_AND_CHILD:
                return dataScope.getDeptIds().contains(order.getDeptId());
            
            case SELF:
                return order.getUserId().equals(loginUser.getUserId());
            
            default:
                return false;
        }
    }
    
    /**
     * 检查是否有角色
     */
    private boolean hasRole(Authentication authentication, String role) {
        return authentication.getAuthorities().stream()
            .anyMatch(auth -> auth.getAuthority().equals("ROLE_" + role));
    }
    
    /**
     * 检查是否有权限
     */
    private boolean hasAuthority(Authentication authentication, String authority) {
        return authentication.getAuthorities().stream()
            .anyMatch(auth -> auth.getAuthority().equals(authority));
    }
}
```

### 前端权限控制

```javascript
/**
 * 权限指令
 */
Vue.directive('permission', {
  inserted: function (el, binding, vnode) {
    const permission = binding.value
    const permissions = store.getters.permissions
    
    if (permission && !permissions.includes(permission)) {
      el.parentNode && el.parentNode.removeChild(el)
    }
  }
})

/**
 * 角色指令
 */
Vue.directive('role', {
  inserted: function (el, binding, vnode) {
    const role = binding.value
    const roles = store.getters.roles
    
    if (role && !roles.includes(role)) {
      el.parentNode && el.parentNode.removeChild(el)
    }
  }
})

/**
 * 使用示例
 */
<template>
  <div>
    <!-- 按钮权限控制 -->
    <el-button v-permission="'user:create'">创建用户</el-button>
    <el-button v-permission="'user:update'">编辑用户</el-button>
    <el-button v-permission="'user:delete'">删除用户</el-button>
    
    <!-- 角色权限控制 -->
    <div v-role="'ADMIN'">
      仅管理员可见
    </div>
    
    <!-- 多权限控制 -->
    <el-button v-permission="['user:create', 'user:update']">
      创建或编辑用户
    </el-button>
  </div>
</template>

/**
 * 权限检查方法
 */
export function checkPermission(permission) {
  const permissions = store.getters.permissions
  
  if (Array.isArray(permission)) {
    return permission.some(p => permissions.includes(p))
  }
  
  return permissions.includes(permission)
}

/**
 * 使用示例
 */
<script>
export default {
  methods: {
    handleCreate() {
      if (!checkPermission('user:create')) {
        this.$message.error('无权限')
        return
      }
      
      // 执行创建逻辑
    }
  }
}
</script>
```

## 权限设计最佳实践

### 1. 权限粒度设计原则

**由粗到细，按需细化**:

```text
第一层:角色级权限
  └─ 用户是管理员? 是/否

第二层:功能级权限
  └─ 用户能访问用户管理模块? 是/否

第三层:操作级权限
  └─ 用户能创建用户? 能删除用户? 能导出用户?

第四层:数据级权限
  └─ 用户能看哪些部门的数据? 能看哪些状态的数据?

第五层:字段级权限
  └─ 用户能看到哪些字段? 能修改哪些字段?
```

**示例**:
```java
/**
 * 字段级权限控制
 */
@GetMapping("/user/{id}")
public Result<UserVO> getUser(@PathVariable Long id) {
    User user = userService.getById(id);
    UserVO vo = convert(user);
    
    // 根据权限隐藏敏感字段
    if (!permissionService.hasPermission(getCurrentUserId(), "user:view:sensitive")) {
        vo.setPhone(maskPhone(vo.getPhone()));
        vo.setIdCard(null);
        vo.setBankCard(null);
    }
    
    return Result.success(vo);
}
```

### 2. 权限缓存策略

**多级缓存设计**:

```java
/**
 * 权限缓存服务
 */
@Service
public class PermissionCacheService {
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    @Autowired
    private PermissionMapper permissionMapper;
    
    // 本地缓存
    private final Cache<String, Set<String>> localCache = Caffeine.newBuilder()
        .maximumSize(1000)
        .expireAfterWrite(5, TimeUnit.MINUTES)
        .build();
    
    /**
     * 获取用户权限(三级缓存)
     */
    public Set<String> getUserPermissions(Long userId) {
        String cacheKey = "user:permission:" + userId;
        
        // 第一级:本地缓存
        Set<String> permissions = localCache.getIfPresent(cacheKey);
        if (permissions != null) {
            return permissions;
        }
        
        // 第二级:Redis缓存
        Set<Object> redisPermissions = redisTemplate.opsForSet().members(cacheKey);
        if (redisPermissions != null && !redisPermissions.isEmpty()) {
            permissions = redisPermissions.stream()
                .map(Object::toString)
                .collect(Collectors.toSet());
            localCache.put(cacheKey, permissions);
            return permissions;
        }
        
        // 第三级:数据库
        permissions = permissionMapper.selectPermissionsByUserId(userId);
        
        // 回填缓存
        if (!permissions.isEmpty()) {
            redisTemplate.opsForSet().add(cacheKey, permissions.toArray());
            redisTemplate.expire(cacheKey, 2, TimeUnit.HOURS);
            localCache.put(cacheKey, permissions);
        }
        
        return permissions;
    }
    
    /**
     * 清除用户权限缓存
     */
    public void clearUserPermissions(Long userId) {
        String cacheKey = "user:permission:" + userId;
        localCache.invalidate(cacheKey);
        redisTemplate.delete(cacheKey);
    }
}
```

### 3. 权限审计日志

```java
/**
 * 权限审计日志实体
 */
@Data
@TableName("sys_permission_log")
public class PermissionLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String username;
    private String operation; // 操作类型:assign/remove/modify
    private String targetType; // 目标类型:role/permission/user
    private Long targetId;
    private String oldValue;
    private String newValue;
    private String ip;
    private String userAgent;
    private LocalDateTime createTime;
}

/**
 * 权限审计切面
 */
@Aspect
@Component
public class PermissionAuditAspect {
    
    @Autowired
    private PermissionLogMapper permissionLogMapper;
    
    @Autowired
    private HttpServletRequest request;
    
    @AfterReturning(pointcut = "execution(* com.example.service.PermissionService.assign*(..))", 
                    returning = "result")
    public void afterAssign(JoinPoint point, Object result) {
        saveLog(point, "assign", result);
    }
    
    @AfterReturning(pointcut = "execution(* com.example.service.PermissionService.remove*(..))", 
                    returning = "result")
    public void afterRemove(JoinPoint point, Object result) {
        saveLog(point, "remove", result);
    }
    
    private void saveLog(JoinPoint point, String operation, Object result) {
        PermissionLog log = new PermissionLog();
        
        LoginUser loginUser = getCurrentUser();
        log.setUserId(loginUser.getUserId());
        log.setUsername(loginUser.getUsername());
        log.setOperation(operation);
        
        Object[] args = point.getArgs();
        if (args.length > 0) {
            log.setTargetType(args[0].getClass().getSimpleName());
            log.setTargetId(extractId(args[0]));
        }
        
        log.setNewValue(JSON.toJSONString(result));
        log.setIp(getClientIp());
        log.setUserAgent(request.getHeader("User-Agent"));
        log.setCreateTime(LocalDateTime.now());
        
        permissionLogMapper.insert(log);
    }
}
```

### 4. 权限测试策略

```java
/**
 * 权限测试基类
 */
@SpringBootTest
@AutoConfigureMockMvc
public abstract class BasePermissionTest {
    
    @Autowired
    protected MockMvc mockMvc;
    
    @Autowired
    protected UserService userService;
    
    /**
     * 以指定用户身份执行请求
     */
    protected ResultActions performAsUser(String username, RequestBuilder request) throws Exception {
        String token = login(username);
        return mockMvc.perform(request.header("Authorization", "Bearer " + token));
    }
    
    /**
     * 登录获取Token
     */
    protected String login(String username) {
        LoginUser loginUser = (LoginUser) userService.loadUserByUsername(username);
        return JwtUtil.generateToken(loginUser);
    }
    
    /**
     * 断言有权限
     */
    protected void assertHasPermission(String username, String url, String method) throws Exception {
        ResultActions result = performAsUser(username, 
            MockMvcRequestBuilders.request(HttpMethod.valueOf(method), url));
        
        result.andExpect(status().isOk());
    }
    
    /**
     * 断言无权限
     */
    protected void assertNoPermission(String username, String url, String method) throws Exception {
        ResultActions result = performAsUser(username, 
            MockMvcRequestBuilders.request(HttpMethod.valueOf(method), url));
        
        result.andExpect(status().isForbidden());
    }
}

/**
 * 用户管理权限测试
 */
public class UserPermissionTest extends BasePermissionTest {
    
    @Test
    public void testAdminCanCreateUser() throws Exception {
        assertHasPermission("admin", "/api/user", "POST");
    }
    
    @Test
    public void testUserCannotCreateUser() throws Exception {
        assertNoPermission("user", "/api/user", "POST");
    }
    
    @Test
    public void testManagerCanUpdateUser() throws Exception {
        assertHasPermission("manager", "/api/user/1", "PUT");
    }
    
    @Test
    public void testUserCanOnlyViewSelf() throws Exception {
        // 用户只能查看自己的信息
        performAsUser("user", MockMvcRequestBuilders.get("/api/user/1"))
            .andExpect(status().isOk());
        
        // 用户不能查看其他用户信息
        performAsUser("user", MockMvcRequestBuilders.get("/api/user/2"))
            .andExpect(status().isForbidden());
    }
}
```

### 5. 常见问题与解决方案

**问题1:权限配置过于复杂，难以维护**

解决方案：使用权限组简化配置

```java
/**
 * 权限组实体
 */
@Data
@TableName("sys_permission_group")
public class PermissionGroup {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String groupCode;
    private String groupName;
    private String description;
    private LocalDateTime createTime;
}

/**
 * 权限组-权限关联表
 */
CREATE TABLE sys_permission_group_permission (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    group_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    UNIQUE KEY uk_group_permission (group_id, permission_id)
);

/**
 * 使用权限组
 */
@Service
public class PermissionGroupService {
    
    /**
     * 根据权限组分配权限
     */
    public void assignByGroup(Long roleId, String groupCode) {
        // 查询权限组包含的权限
        List<Long> permissionIds = permissionGroupMapper.selectPermissionIdsByGroupCode(groupCode);
        
        // 分配权限
        permissionService.assignPermissions(roleId, permissionIds);
    }
}
```

**问题2:数据权限SQL性能问题**

解决方案：优化SQL查询，添加索引

```sql
-- 为常用查询字段添加索引
CREATE INDEX idx_order_dept_id ON t_order(dept_id);
CREATE INDEX idx_order_user_id ON t_order(user_id);
CREATE INDEX idx_order_create_time ON t_order(create_time);

-- 使用覆盖索引优化
CREATE INDEX idx_order_list ON t_order(dept_id, user_id, status, create_time);
```

**问题3:权限缓存一致性问题**

解决方案：使用消息队列同步缓存

```java
/**
 * 权限变更消息
 */
@Data
public class PermissionChangeMessage {
    private Long userId;
    private String operation; // assign/remove/modify
    private LocalDateTime timestamp;
}

/**
 * 权限变更发布者
 */
@Service
public class PermissionChangePublisher {
    
    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    public void publish(Long userId, String operation) {
        PermissionChangeMessage message = new PermissionChangeMessage();
        message.setUserId(userId);
        message.setOperation(operation);
        message.setTimestamp(LocalDateTime.now());
        
        rabbitTemplate.convertAndSend("permission.exchange", 
            "permission.change", message);
    }
}

/**
 * 权限变更消费者
 */
@Component
public class PermissionChangeConsumer {
    
    @Autowired
    private PermissionCacheService cacheService;
    
    @RabbitListener(queues = "permission.change.queue")
    public void handle(PermissionChangeMessage message) {
        cacheService.clearUserPermissions(message.getUserId());
    }
}
```

## 常见误区

### 1. 前端控制权限，后端不校验

**错误做法**:
```javascript
// 前端隐藏按钮
<el-button v-if="hasPermission('user:delete')">删除</el-button>
```

```java
// 后端不校验
@DeleteMapping("/{id}")
public Result<Void> delete(@PathVariable Long id) {
    userService.removeById(id);
    return Result.success();
}
```

**正确做法**:
```java
// 后端必须校验
@DeleteMapping("/{id}")
@PreAuthorize("hasAuthority('user:delete')")
public Result<Void> delete(@PathVariable Long id) {
    userService.removeById(id);
    return Result.success();
}
```

### 2. 只用角色，不区分资源和操作

**错误做法**:
```java
// 权限粒度过粗
if (hasRole("ADMIN")) {
    // 允许所有操作
}
```

**正确做法**:
```java
// 细化权限粒度
@PreAuthorize("hasAuthority('user:delete')")
public void deleteUser(Long id) {
    // 删除用户
}
```

### 3. 只做URL权限，忽略数据权限

**错误做法**:
```java
// 只控制接口访问
@GetMapping("/order/list")
@PreAuthorize("hasAuthority('order:read')")
public List<Order> list() {
    return orderService.list(); // 返回所有订单
}
```

**正确做法**:
```java
// 添加数据权限过滤
@GetMapping("/order/list")
@PreAuthorize("hasAuthority('order:read')")
@DataPermission(deptAlias = "o", userAlias = "o")
public List<Order> list() {
    return orderService.list(); // 只返回有权限的数据
}
```

### 4. 权限硬编码，无法动态调整

**错误做法**:
```java
// 权限硬编码在代码中
@GetMapping("/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public List<User> adminUsers() {
    return userService.list();
}
```

**正确做法**:
```java
// 权限从数据库加载,支持动态调整
@GetMapping("/admin/users")
@PreAuthorize("hasAuthority('user:admin:view')")
public List<User> adminUsers() {
    return userService.list();
}
```

### 5. 忽略权限变更的影响范围

**错误做法**:
```java
// 修改角色权限后不清除缓存
public void updateRolePermissions(Long roleId, List<Long> permissionIds) {
    rolePermissionMapper.deleteByRoleId(roleId);
    rolePermissionMapper.batchInsert(roleId, permissionIds);
    // 缺少清除缓存的逻辑
}
```

**正确做法**:
```java
// 修改后立即清除相关缓存
public void updateRolePermissions(Long roleId, List<Long> permissionIds) {
    rolePermissionMapper.deleteByRoleId(roleId);
    rolePermissionMapper.batchInsert(roleId, permissionIds);
    
    // 清除所有拥有该角色的用户的权限缓存
    List<Long> userIds = userRoleMapper.selectUserIdsByRoleId(roleId);
    for (Long userId : userIds) {
        permissionCacheService.clearUserPermissions(userId);
    }
}
```

## 面试要点

### 基础概念类

**1. 什么是RBAC?它的核心思想是什么？**

RBAC（Role-Based Access Control,基于角色的访问控制）是一种通过"角色"来组织权限的模型。

核心思想：
- 用户关联角色
- 角色关联权限
- 权限描述资源与操作

通过角色这一中间层，实现用户与权限的解耦，降低权限管理的复杂度。

**2. RBAC0/RBAC1/RBAC2/RBAC3分别是什么？**

- RBAC0:基础模型，包含用户、角色、权限三个核心实体
- RBAC1:在RBAC0基础上增加角色继承，形成角色层级
- RBAC2:在RBAC0基础上增加约束条件（互斥角色、基数约束、先决角色）
- RBAC3:RBAC1 + RBAC2,既支持角色继承，又支持约束条件

**3. 什么是数据权限？它和功能权限有什么区别？**

功能权限：控制用户"能不能访问某个功能"，如能否创建用户、能否导出订单

数据权限：控制用户"能看到哪些数据"，如只能看本部门数据、只能看自己的订单

区别：
- 功能权限关注"能不能做"，数据权限关注"能看到什么"
- 功能权限较易实现，数据权限需要结合业务规则
- 功能权限通常通过角色+权限控制，数据权限需要数据范围过滤

### 实战应用类

**4. SpringSecurity如何实现权限控制？**

SpringSecurity提供多层权限控制：

1. **配置级**：通过HttpSecurity配置URL访问权限
   ```java
   http.authorizeHttpRequests(auth -> auth
       .requestMatchers("/admin/**").hasRole("ADMIN")
       .anyRequest().authenticated()
   );
   ```

2. **注解级**：使用@PreAuthorize等方法级注解
   ```java
   @PreAuthorize("hasAuthority('user:create')")
   public void createUser(User user) { }
   ```

3. **代码级**：手动调用权限检查API
   ```java
   if (!authentication.getAuthorities().contains(new SimpleGrantedAuthority("user:delete"))) {
       throw new AccessDeniedException("无权限");
   }
   ```

**5. @PreAuthorize和@Secured有什么区别？**

@Secured:
- 只支持角色检查
- 不支持SpEL表达式
- 语法简单：

@PreAuthorize:
- 支持权限和角色检查
- 支持SpEL表达式，功能更强大
- 可以访问方法参数：
- 支持逻辑运算：

**6. 如何实现动态权限？**

实现方案：

1. **数据库驱动**：权限配置存储在数据库，支持实时修改
2. **Redis缓存**：权限配置缓存到Redis,支持分布式环境
3. **自定义注解**：通过自定义注解+切面实现灵活权限控制

核心要点：
- 权限配置不能硬编码
- 提供权限刷新机制
- 处理权限变更的影响范围
- 保证缓存一致性

### 架构设计类

**7. 如何设计一个通用的权限系统？**

核心设计：

1. **权限模型**：采用RBAC3模型，支持角色继承和约束
2. **权限粒度**：支持菜单权限、按钮权限、接口权限、数据权限、字段权限
3. **权限存储**：数据库持久化 + Redis缓存
4. **权限控制**：SpringSecurity + 自定义注解 + AOP
5. **权限管理**：提供权限分配、角色管理、用户管理界面
6. **权限审计**：记录权限变更日志，支持追溯

技术选型：
- 后端：SpringSecurity + MyBatis + Redis
- 前端：Vue/React + 自定义指令
- 数据库：MySQL
- 缓存：Redis

**8. 如何处理权限缓存一致性问题？**

解决方案：

1. **缓存失效策略**:
   - 权限变更时立即清除相关缓存
   - 设置合理的缓存过期时间

2. **消息队列同步**:
   - 权限变更发送消息到MQ
   - 各节点订阅消息并清除本地缓存

3. **版本号机制**:
   - 权限数据附带版本号
   - 缓存数据对比版本号，不一致则重新加载

4. **分布式锁**:
   - 权限刷新时加分布式锁
   - 避免并发刷新导致的缓存不一致

**9. 权限系统如何防止越权访问？**

防护措施：

1. **后端必须校验**：所有权限判断在后端完成，不依赖前端
2. **多层防护**：接口级权限 + 方法级权限 + 数据权限
3. **最小权限原则**：默认无权限，显式授权
4. **权限审计**：记录权限变更和访问日志
5. **定期审查**：定期审查权限分配情况

**10. 如何实现字段级权限控制？**

实现方案：

1. **查询时过滤**:
   ```java
   @GetMapping("/user/{id}")
   public Result<UserVO> getUser(@PathVariable Long id) {
       UserVO vo = userService.getById(id);
       
       if (!hasPermission("user:view:sensitive")) {
           vo.setPhone(null);
           vo.setIdCard(null);
       }
       
       return Result.success(vo);
   }
   ```

2. **使用Jackson注解**:
   ```java
   @Data
   public class UserVO {
       private String username;
       
       @JsonInclude(content = Include.CUSTOM, value = "hasSensitivePermission")
       private String phone;
       
       @JsonInclude(content = Include.CUSTOM, value = "hasSensitivePermission")
       private String idCard;
   }
   ```

3. **使用MyBatis拦截器**:
   - 拦截查询结果
   - 根据权限过滤敏感字段

### 性能优化类

**11. 权限系统如何优化性能？**

优化策略：

1. **多级缓存**:
   - 本地缓存（Caffeine） + 分布式缓存（Redis）
   - 减少数据库查询

2. **批量查询**:
   - 权限数据批量加载
   - 避免N+1查询

3. **索引优化**:
   - 权限表添加合适索引
   - 优化关联查询

4. **异步加载**:
   - 用户登录后异步加载权限
   - 避免阻塞登录流程

5. **权限预计算**:
   - 角色权限预计算并缓存
   - 减少实时计算开销

**12. 如何处理海量用户的权限查询？**

解决方案：

1. **分库分表**:
   - 用户权限表按用户ID分片
   - 降低单表数据量

2. **读写分离**:
   - 权限查询走从库
   - 权限变更走主库

3. **缓存预热**:
   - 活跃用户权限提前加载到缓存
   - 减少实时查询压力

4. **权限精简**:
   - 合理设计权限粒度
   - 避免权限过多导致的性能问题

---

## 总结

RBAC权限模型是企业级应用权限管理的基础，设计良好的权限系统需要：

1. **清晰的模型设计**：采用RBAC3模型，支持角色继承和约束
2. **合理的权限粒度**：由粗到细，按需细化
3. **完善的技术实现**：SpringSecurity + 自定义扩展
4. **可靠的性能保障**：多级缓存 + 索引优化
5. **严格的安全防护**：后端校验 + 多层防护 + 审计日志

权限设计是一个平衡的艺术，既要保证安全性，又要兼顾易用性和性能，需要根据实际业务场景不断优化调整。

## 版本差异（旧版 → Spring Security 6.x）

| 特性 | 旧版（Spring Security 5.x） | Spring Security 6.x |
|------|--------------------------|---------------------|
| RBAC 模型 | 不变 | 不变；设计理念稳定 |
| @PreAuthorize | 可用 | 不变；支持 SpEL 表达式 |
| 方法安全 | @EnableGlobalMethodSecurity | @EnableMethodSecurity（6.x 更简洁） |
| 权限模型 | hasRole/hasAuthority | 不变 |
