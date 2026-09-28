---
title: "MyBatis源码分析"
description: "主要根据 MyBatis 的执行流程，通过 Debug 的方式，查看 MyBatis 的从加载配置文件、解析配置文件、创建四大核心对象（Executor、ParameterHandler、ResultSetHand…"
keywords: [MyBatis源码分析]
category: "Java"
tags: [Java, MyBatis]
---


# MyBatis 源码分析

主要根据 `MyBatis` 的执行流程，通过 `Debug` 的方式，查看 MyBatis 从加载配置文件、解析配置文件、创建四大核心对象（`Executor`、`ParameterHandler`、`ResultSetHandler`、`StatementHandler`）的详细过程

## 环境准备

搭建简单的 `MyBatis` 的工程，在 `pom` 文件中添加 `Mybatis` 的依赖

```java
// mybatis源码分析
@Test
public void test1() throws Exception {
  // 1.加载配置文件
  InputStream inputStream = Resources.getResourceAsStream("mybatis-config.xml");
  // 2. 创建SqlSessionFactory对象实际创建的是DefaultSqlSessionFactory对象
  SqlSessionFactory builder = new SqlSessionFactoryBuilder().build(inputStream);
  // 3. 创建SqlSession对象实际创建的是DefaultSqlSession对象
  SqlSession sqlSession = builder.openSession();
  // 4. 创建代理对象
  UserMapper mapper = sqlSession.getMapper(UserMapper.class);
  // 5. 执行查询语句
  List<User> users = mapper.selectUserList();
  for (User user : users) {
    System.out.println(user);
  }
}
```

## 加载配置文件

```java
// 1.加载配置文件
InputStream inputStream = Resources.getResourceAsStream("mybatis-config.xml");
```

Debug 一直往下跟，会进到一个 `ClassLoaderWrapper` 类中，并找到配置文件最终返回一个 `BufferedInputStream` 带有缓冲的输入流，它继承于 **FilterInputStream**

## 创建 SqlSessionFactory

通过解析加载的配置文件创建一个配置类 `Configuration` 。而且这一步中也把映射文件一并解析，最终返回`DefaultSqlSessionFactory` 工厂对象

```java
 // 2. 创建SqlSessionFactory对象实际创建的是DefaultSqlSessionFactory对象
SqlSessionFactory builder = new SqlSessionFactoryBuilder().build(inputStream);
```

接着往下走进到

```java
public SqlSessionFactory build(InputStream inputStream, String environment, Properties properties) {
  try {
    // 创建 XMLConfigBuilder 解析 xml 配置文件，使用的是建造这模式
    XMLConfigBuilder parser = new XMLConfigBuilder(inputStream, environment, properties);
    // 解析配置文件，构建SqlSessionFactory
    return build(parser.parse());
  } catch (Exception e) {
    throw ExceptionFactory.wrapException("Error building SqlSession.", e);
  } finally {
    ErrorContext.instance().reset();
    try {
      inputStream.close();
    } catch (IOException e) {
      // Intentionally ignore. Prefer previous error.
    }
  }
}
```

`parser.parse()` 方法是真正来解析核心配置文件的

```java
public Configuration parse() {
  // 判断配置文件是否被解析过，一个配置文件只能被解析一次
  if (parsed) {
    throw new BuilderException("Each XMLConfigBuilder can only be used once.");
  }
  parsed = true;
  // 解析核心配置文件的configuration节点
  parseConfiguration(parser.evalNode("/configuration"));
  return configuration;
}
```

最终返回一个 `Configuration` 对象，封装了所有的配置相关的信息

```java
parseConfiguration(parser.evalNode("/configuration"));
```

这段代码已经开始解析配置文件的 `configuration` 节点，并且从上往下开始解析，进到这个方法中

```java
private void parseConfiguration(XNode root) {
  try {
    //issue #117 read properties first
    // 解析properties节点
    propertiesElement(root.evalNode("properties"));
    // 解析settings并将其转换为 Properties 对象
    Properties settings = settingsAsProperties(root.evalNode("settings"));
    // // 加载 vfs虚拟文件系统
    loadCustomVfs(settings);
    // 解析settings
    loadCustomLogImpl(settings);
    // 解析typeAliases
    typeAliasesElement(root.evalNode("typeAliases"));
    // 解析plugins
    pluginElement(root.evalNode("plugins"));
    // 解析objectFactory
    objectFactoryElement(root.evalNode("objectFactory"));
    // 解析objectWrapperFactory
    objectWrapperFactoryElement(root.evalNode("objectWrapperFactory"));
    // 解析reflectorFactory
    reflectorFactoryElement(root.evalNode("reflectorFactory"));
    // settings 中的信息设置到 Configuration 对象中
    settingsElement(settings);
    // read it after objectFactory and objectWrapperFactory issue #631
    // 解析environments
    environmentsElement(root.evalNode("environments"));
    // 解析 databaseIdProvider
    databaseIdProviderElement(root.evalNode("databaseIdProvider"));
    typeHandlerElement(root.evalNode("typeHandlers"));
    // 解析mappers
    mapperElement(root.evalNode("mappers"));
  } catch (Exception e) {
    throw new BuilderException("Error parsing SQL Mapper Configuration. Cause: " + e, e);
  }
}
```

至此明白了 `mybatis-config.xml` 核心配置文件的解析过程，其他的节点都比较好理解，跟所有的 xml 配置文件的解析都是一样的，一层一层的解析里面的子节点或属性，所以这里略过；重点要看的是关于 `mappers` 节点的解析，这个是要加载映射文件的关键地方

```java
public void parse() {
  if (!configuration.isResourceLoaded(resource)) {
    // 解析mapper节点
    configurationElement(parser.evalNode("/mapper"));
    // 添加的configura中的集合中
    configuration.addLoadedResource(resource);
    // 绑定命名空间
    bindMapperForNamespace();
  }

  parsePendingResultMaps();
  parsePendingCacheRefs();
  parsePendingStatements();
}
```

可以看出 parse 方法是根据不同的配置方式用来解析映射文件的，其中的 `configurationElement()` 方法就是真正解析映射文件的地方，`parseStatementNode()` 相关逻辑随后展开。

查看 configurationElement 解析映射文件的内容

```java
private void configurationElement(XNode context) {
  try {
    // 拿到命名空间
    String namespace = context.getStringAttribute("namespace");
    if (namespace == null || namespace.equals("")) {
      throw new BuilderException("Mapper's namespace cannot be empty");
    }
    builderAssistant.setCurrentNamespace(namespace);
    // 处理缓存的配置标签
    cacheRefElement(context.evalNode("cache-ref"));
    cacheElement(context.evalNode("cache"));
    // 解析 parameterMap
    parameterMapElement(context.evalNodes("/mapper/parameterMap"));
    // 解析 resultMap
    resultMapElements(context.evalNodes("/mapper/resultMap"));
    // 解析 sql 标签
    sqlElement(context.evalNodes("/mapper/sql"));
    // 解析增删改查标签
    buildStatementFromContext(context.evalNodes("select|insert|update|delete"));
  } catch (Exception e) {
    throw new BuilderException("Error parsing Mapper XML. The XML location is '" + resource + "'. Cause: " + e, e);
  }
}
```

作用是解析映射文件的，和之前的解析核心配置文件的逻辑是一样的。重要的一个是解析增删改查标签的方法，跟着往下走

```java
private void buildStatementFromContext(List<XNode> list, String requiredDatabaseId) {
  for (XNode context : list) {
    // 创建 XMLStatementBuilder
    final XMLStatementBuilder statementParser = 
      new XMLStatementBuilder(configuration, builderAssistant, context, requiredDatabaseId);
    try {
      // 解析 sql 标签
      statementParser.parseStatementNode();
    } catch (IncompleteElementException e) {
      configuration.addIncompleteStatement(statementParser);
    }
  }
}
```

查看 `statementParser.parseStatementNode` 进来之后

```java
public void parseStatementNode() {
  String id = context.getStringAttribute("id");
  String databaseId = context.getStringAttribute("databaseId");

  if (!databaseIdMatchesCurrent(id, databaseId, this.requiredDatabaseId)) {
    return;
  }

  // 解析<select>标签中个属性
  String nodeName = context.getNode().getNodeName();
  SqlCommandType sqlCommandType = SqlCommandType.valueOf(nodeName.toUpperCase(Locale.ENGLISH));
  boolean isSelect = sqlCommandType == SqlCommandType.SELECT;
  // 是否刷新
  boolean flushCache = context.getBooleanAttribute("flushCache", !isSelect);
  // 是否使用缓存
  boolean useCache = context.getBooleanAttribute("useCache", isSelect);
  boolean resultOrdered = context.getBooleanAttribute("resultOrdered", false);

  // 省略不必要的代码
  // ......
  // 解析好的属性设置到MapperBuilderAssistant中
  builderAssistant.addMappedStatement(id, sqlSource, statementType, sqlCommandType,fetchSize, timeout, parameterMap, parameterTypeClass, resultMap, resultTypeClass,resultSetTypeEnum, flushCache, useCache, resultOrdered,keyGenerator, keyProperty, keyColumn, databaseId, langDriver, resultSets);
}
```

这里的逻辑和之前的一样的，解析标签中的具体属性，进到这个方法 `addMappedStatement` 中,

```java
public MappedStatement addMappedStatement(MappedStatement.Builder statementBuilder) {
  // 构建一个MappedStatement对象
  MappedStatement statement = statementBuilder.build();
  // 最终设置到configuration的map中，key是标签的id，value是MappedStatement对象
  configuration.addMappedStatement(statement);
  // 返回MappedStatement
  return statement;
}
```

添加到 map 中, 这里的 map 是 `StrictMap` 是继承了 `HashMap` 的在 `Configuration` 中的内部类

```java
 public void addMappedStatement(MappedStatement ms) {
    // key是标签的id，value是MappedStatement对象
     mappedStatements.put(ms.getId(), ms);
  }
Map<String, MappedStatement> mappedStatements = new StrictMap<MappedStatement>("Mapped Statements collection")
```

这里顺便说下 `MyBatis` 中的很多用来存储参数映射、缓存等都是用的 `StrictMap` 

到此 `mybatis` 解析核心配置文件和映射文件的过程就走完了，最后回到开始的地方 `SqlSessionFactoryBuilder` 中的`build(parser.parse()) `方法返回一个 `DefaultSqlSessionFactory` 对象

```java
public SqlSessionFactory build(Configuration config) {
  // 实际创建的是DefaultSqlSessionFactory对象
  return new DefaultSqlSessionFactory(config);
}
```

到这里第二步构建 `DefaultSqlSessionFactory` 的过程就走完了

## 创建 SqlSession

通过上一步的工厂对象创建 `DefaultSqlSession` ，这个过程还会创建一个最重要的 `Executor` 对象

```java
// 3. 创建SqlSession对象实际创建的是DefaultSqlSession对象
SqlSession sqlSession = builder.openSession();
```

一直往下跟就到了关键的位置

```java
private SqlSession openSessionFromDataSource(ExecutorType execType, TransactionIsolationLevel level, boolean autoCommit) {
  Transaction tx = null;
  try {
    // 环境配置
    final Environment environment = configuration.getEnvironment();
    final TransactionFactory transactionFactory = getTransactionFactoryFromEnvironment(environment);
    // 创建事务对象
    tx = transactionFactory.newTransaction(environment.getDataSource(), level, autoCommit);
    // 创建Executor
    final Executor executor = configuration.newExecutor(tx, execType);
    return new DefaultSqlSession(configuration, executor, autoCommit);
  } catch (Exception e) {
    closeTransaction(tx); // may have fetched a connection so lets call close()
    throw ExceptionFactory.wrapException("Error opening session.  Cause: " + e, e);
  } finally {
    ErrorContext.instance().reset();
  }
}
```

这里的`Executor`对象是`MyBatis`的核心对象，也是真正用来执行增删改查的对象，进到方法里

*   SimpleExecutor：简单执行器，没啥特殊，默认用它
*   ReuseExecutor：重用执行器，会重用预处理语句（PreparedStatements）
*   BatchExecutor：批处理执行器
*   CachingExecutor：缓存执行器（装饰器），在上述执行器之上增加二级缓存能力

```java
public Executor newExecutor(Transaction transaction, ExecutorType executorType) {
  executorType = executorType == null ? defaultExecutorType : executorType;
  executorType = executorType == null ? ExecutorType.SIMPLE : executorType;
  Executor executor;
  // 根据执行器的类型，选择不同的执行器，默认使用简单执行器
  if (ExecutorType.BATCH == executorType) {
    executor = new BatchExecutor(this, transaction);
  } else if (ExecutorType.REUSE == executorType) {
    executor = new ReuseExecutor(this, transaction);
  } else {
    // 默认使用
    executor = new SimpleExecutor(this, transaction);
  }
  if (cacheEnabled) {
    executor = new CachingExecutor(executor);
  }
  // 拦截器链
  executor = (Executor) interceptorChain.pluginAll(executor);
  return executor;
}
```

到此这一步创建 `DefaultSqlSession` 和 `Executor` 过程就完成了

## 获取代理对象

获取代理对象之前，看一下在上一步解析 `mapper` 节点的时候，解析完成之后有一个 `bindMapperForNamespace()` 方法

```java
private void bindMapperForNamespace() {
  String namespace = builderAssistant.getCurrentNamespace();
  if (namespace != null) {
    Class<?> boundType = null;
    try {
      // 获取命名空间，使用反射机制实例化对象
      boundType = Resources.classForName(namespace);
    } catch (ClassNotFoundException e) {
      //ignore, bound type is not required
    }
    if (boundType != null) {
      // 判断是否已经存在绑定的命名空间
      if (!configuration.hasMapper(boundType)) {
        // Spring may not know the real resource name so we set a flag
        // to prevent loading again this resource from the mapper interface
        // look at MapperAnnotationBuilder#loadXmlResoue
        configuration.addLoadedResource("namespace:" + namespace);
        // mapper加载到对象的配置中
        configuration.addMapper(boundType);
      }
    }
  }
}
```

跟着这个加载的方法 `addMapper()` 方法进去，这个方法是在 `MapperRegistry` 类中

```java
public <T> void addMapper(Class<T> type) {
  if (type.isInterface()) {
    if (hasMapper(type)) {
      throw new BindingException("Type " + type + " is already known to the MapperRegistry.");
    }
    boolean loadCompleted = false;
    try {
      // 存储到集合中，key是type，value就是对应的工厂类
      knownMappers.put(type, new MapperProxyFactory<>(type));
      // It's important that the type is added before the parser is run
      // otherwise the binding may automatically be attempted by the
      // mapper parser. If the type is already known, it won't try.
      MapperAnnotationBuilder parser = new MapperAnnotationBuilder(config, type);
      parser.parse();
      loadCompleted = true;
    } finally {
      if (!loadCompleted) {
        knownMappers.remove(type);
      }
    }
  }
}
```

这里的 `knownMappers` 和前面提到的 `mappedStatements` 都是一样的逻辑，放到 `map` 中, 到这里明白了在解析命名空间的时候，就已经把 `mapper` 接口放到了map中，下面创建代理对象的内容就更好理解了

跟着第4步往下走，获取代理对象，断点往下走进入到 `MapperRegistry` 类中

```java
public <T> T getMapper(Class<T> type, SqlSession sqlSession) {
  // 从上一步存入的map中获取代理工厂
  final MapperProxyFactory<T> mapperProxyFactory = (MapperProxyFactory<T>) knownMappers.get(type);
  if (mapperProxyFactory == null) {
    throw new BindingException("Type " + type + " is not known to the MapperRegistry.");
  }
  try {
    // mapper 代理工厂类创建 mapper 代理对象
    return mapperProxyFactory.newInstance(sqlSession);
  } catch (Exception e) {
    throw new BindingException("Error getting mapper instance. Cause: " + e, e);
  }
}
```

进到这个 `newInstance` 方法，调用自己 `MapperProxyFactory` 类自己的 `newInstance` 方法

```java
public T newInstance(SqlSession sqlSession) {
  final MapperProxy<T> mapperProxy = new MapperProxy<>(sqlSession, mapperInterface, methodCache);
  return newInstance(mapperProxy);
}
protected T newInstance(MapperProxy<T> mapperProxy) {
  // 创建代理对象
  return (T) Proxy.newProxyInstance(mapperInterface.getClassLoader(), new Class[] { mapperInterface }, mapperProxy);
}
```

这里就通过 `JDK` 的动态代理的方式创建了 `mapper` 代理对象，这里 mapper 代理对象的创建就算完成了

## 执行查询

经过前面的准备，核心配置文件准备好了，映射文件准备好了，代理对象也有了；接下来关键的步骤执行查询，这里也是比较复杂的地方，参数的封装，`sql`的预编译，结果集的封装等都是在这里处理的

接着进入到代理对象的查询方法，代理对象首先会先执行 `invoke` 方法

```java
@Override
public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
  try {
    // 如果方法是定义在 Object 类中的，则直接调用
    if (Object.class.equals(method.getDeclaringClass())) {
      return method.invoke(this, args);
      // 这对jdk8、9新特性做的处理
    } else if (method.isDefault()) {
      if (privateLookupInMethod == null) {
        return invokeDefaultMethodJava8(proxy, method, args);
      } else {
        return invokeDefaultMethodJava9(proxy, method, args);
      }
    }
  } catch (Throwable t) {
    throw ExceptionUtil.unwrapThrowable(t);
  }
  // 从缓存中获取 MapperMethod 对象
  final MapperMethod mapperMethod = cachedMapperMethod(method);
  // 调用 execute 方法执行 SQL
  return mapperMethod.execute(sqlSession, args);
}
```

执行 execute 的方法，之前会先判断下 sql 是哪种类型

```java
public Object execute(SqlSession sqlSession, Object[] args) {
  Object result;
  // 判断sql的类型
  switch (command.getType()) {
    case INSERT: {
      Object param = method.convertArgsToSqlCommandParam(args);
      result = rowCountResult(sqlSession.insert(command.getName(), param));
      break;
    }
    case UPDATE: {
      Object param = method.convertArgsToSqlCommandParam(args);
      result = rowCountResult(sqlSession.update(command.getName(), param));
      break;
    }
    case DELETE: {
      Object param = method.convertArgsToSqlCommandParam(args);
      result = rowCountResult(sqlSession.delete(command.getName(), param));
      break;
    }
      
    // 查询操作里还会判断方法返回类型
    case SELECT:
      // 无返回值
      if (method.returnsVoid() && method.hasResultHandler()) {
        executeWithResultHandler(sqlSession, args);
        result = null;
      } else if (method.returnsMany()) {
        // 这里查询是返回多个结果
        result = executeForMany(sqlSession, args);
      } else if (method.returnsMap()) {
        // 返回map
        result = executeForMap(sqlSession, args);
      } else if (method.returnsCursor()) {
        result = executeForCursor(sqlSession, args);
      } else {
        Object param = method.convertArgsToSqlCommandParam(args);
        result = sqlSession.selectOne(command.getName(), param);
        if (method.returnsOptional()
            && (result == null || !method.getReturnType().equals(result.getClass()))) {
          result = Optional.ofNullable(result);
        }
      }
      break;
    case FLUSH:
      result = sqlSession.flushStatements();
      break;
    default:
      throw new BindingException("Unknown execution method for: " + command.getName());
  }
  if (result == null && method.getReturnType().isPrimitive() && !method.returnsVoid()) {
    throw new BindingException("Mapper method '" + command.getName()
                               + " attempted to return null from a method with a primitive return type (" + method.getReturnType() + ").");
  }
  return result;
}
```

接着进入到 `executeForMany` 方法中

```java
private <E> Object executeForMany(SqlSession sqlSession, Object[] args) {
  List<E> result;
  // 参数处理
  Object param = method.convertArgsToSqlCommandParam(args);
  // 是否逻辑分页
  if (method.hasRowBounds()) {
    RowBounds rowBounds = method.extractRowBounds(args);
    // 执行查询
    result = sqlSession.selectList(command.getName(), param, rowBounds);
  } else {
    // 执行查询
    result = sqlSession.selectList(command.getName(), param);
  }
  // issue #510 Collections & arrays support
  if (!method.getReturnType().isAssignableFrom(result.getClass())) {
    if (method.getReturnType().isArray()) {
      return convertToArray(result);
    } else {
      return convertToDeclaredCollection(sqlSession.getConfiguration(), result);
    }
  }
  return result;
}
```

这里的执行方法实际就是调用的前面所创建的 `DefaultSqlSession` 的方法继续往下走看到

```java
public <E> List<E> selectList(String statement, Object parameter, RowBounds rowBounds) {
  try {
    // 从配置类中获取MappedStatement对象
    MappedStatement ms = configuration.getMappedStatement(statement);
    // 执行查询
    return executor.query(ms, wrapCollection(parameter), rowBounds, Executor.NO_RESULT_HANDLER);
  } catch (Exception e) {
    throw ExceptionFactory.wrapException("Error querying database.  Cause: " + e, e);
  } finally {
    ErrorContext.instance().reset();
  }
}
```

这里获取 `MappedStatement` 对象，就是前面存储到 `map` 中的，这里突然明白之前很多对象都存到 map 中，是备用

```java
public <E> List<E> query(MappedStatement ms, Object parameterObject, RowBounds rowBounds, ResultHandler resultHandler) throws SQLException {
  // 从MappedStatement获取BoundSql对象拿到获取绑定的sql，并将参数对象与sql语句的#{}对应
  BoundSql boundSql = ms.getBoundSql(parameterObject);
  // 创建缓存的key
  CacheKey key = createCacheKey(ms, parameterObject, rowBounds, boundSql);
  // 执行查询
  return query(ms, parameterObject, rowBounds, resultHandler, key, boundSql);
}

// sql 语句是在解析标签的时候，封装成对应的`MappedStatement`对象，其中标签里的`sql`就是封装成了`sqlSource`对象，这里的`BoundSql`实际是从绑定动态`sql`，继续执行查询，这里的查询其实用到的是`CachingExecutor
@Override
public <E> List<E> query(MappedStatement ms, Object parameterObject, RowBounds rowBounds, ResultHandler resultHandler, CacheKey key, BoundSql boundSql)
  throws SQLException {
  // 获取缓存，这里先使用的二级缓存
  Cache cache = ms.getCache();
  // 判断缓存是否为空    
  if (cache != null) {
    flushCacheIfRequired(ms);
    if (ms.isUseCache() && resultHandler == null) {
      ensureNoOutParams(ms, boundSql);
      @SuppressWarnings("unchecked")
      List<E> list = (List<E>) tcm.getObject(cache, key);
      if (list == null) {
        list = delegate.query(ms, parameterObject, rowBounds, resultHandler, key, boundSql);
        tcm.putObject(cache, key, list); // issue #578 and #116
      }
      return list;
    }
  }
  // 执行查询的委托给了SimpleExecutor对象
  return delegate.query(ms, parameterObject, rowBounds, resultHandler, key, boundSql);
}
```

继续跟着源码进去，发现是进到了`BaseExecutor`里面

```java
public <E> List<E> query(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler, CacheKey key, BoundSql boundSql) throws SQLException {
  ErrorContext.instance().resource(ms.getResource()).activity("executing a query").object(ms.getId());
  if (closed) {
    throw new ExecutorException("Executor was closed.");
  }
  if (queryStack == 0 && ms.isFlushCacheRequired()) {
    clearLocalCache();
  }
  List<E> list;
  try {
    queryStack++;
    // 去本地缓存也就是一级缓存去拿
    list = resultHandler == null ? (List<E>) localCache.getObject(key) : null;
    if (list != null) {
      handleLocallyCachedOutputParameters(ms, key, parameter, boundSql);
    } else {
      // 缓存中没有去数据库查
      list = queryFromDatabase(ms, parameter, rowBounds, resultHandler, key, boundSql);
    }
  }
  // 省略不必要代码
  return list;
}
```

接下来就是去数据库查询了

```java
private <E> List<E> queryFromDatabase(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler, CacheKey key, BoundSql boundSql) throws SQLException {
  List<E> list;
  // 向缓存中存储一个占位符
  localCache.putObject(key, EXECUTION_PLACEHOLDER);
  try {
    // 执行查询
    list = doQuery(ms, parameter, rowBounds, resultHandler, boundSql);
  } finally {
    localCache.removeObject(key);
  }
  // 放入缓存
  localCache.putObject(key, list);
  if (ms.getStatementType() == StatementType.CALLABLE) {
    localOutputParameterCache.putObject(key, parameter);
  }
  return list;
}
```

接着继续进入到 `doQuery()` 方法中

```java
@Override
public <E> List<E> doQuery(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler, BoundSql boundSql) throws SQLException {
  Statement stmt = null;
  try {
    Configuration configuration = ms.getConfiguration();
    // 创建StatementHandler对象，这里是PreparedStatementHandler对象，进行预处理
    StatementHandler handler = 
      configuration.newStatementHandler(wrapper, ms, parameter, rowBounds, resultHandler, boundSql);
    // 预处理和jdbc的prepareStatement就是一样的
    stmt = prepareStatement(handler, ms.getStatementLog());
    // 执行查询
    return handler.query(stmt, resultHandler);
  } finally {
    closeStatement(stmt);
  }
}
```

在创建 `PreparedStatementHandler` 对象的过程中，还涉及到了插件、参数处理器(`ParameterHandler`)、结果处理器(`ResultSetHandler`)，大家可以跟着断点进去看下，在预处理的阶段对参数进行了设置

```java
private Statement prepareStatement(StatementHandler handler, Log statementLog) throws SQLException {
  Statement stmt;
  // 获取连接
  Connection connection = getConnection(statementLog);
  // 解析参数
  stmt = handler.prepare(connection, transaction.getTimeout());
  // 设置参数  
  handler.parameterize(stmt);
  return stmt;
}
```

在参数设置的时候使用的 `typeHandler` 进行设置

```java
@Override
public void setParameters(PreparedStatement ps) {
    ErrorContext.instance().activity("settingparameters").object(mappedStatement.getParameterMap().getId());
    List<ParameterMapping> parameterMappings = boundSql.getParameterMappings();
    // 省略不必要代码...
    try {
        // 根据参数索引位置进行设置参数
        typeHandler.setParameter(ps, i + 1, value, jdbcType);
    } catch (TypeException | SQLException e) {
        // 异常处理
    }
}
```

接下来继续看查询的步骤

```java
@Override
public <E> List<E> query(Statement statement, ResultHandler resultHandler) throws SQLException {
  PreparedStatement ps = (PreparedStatement) statement;
  // 执行查询，这里就是jdbc的来具体的执行了
  ps.execute();
  // 处理结果
  return resultSetHandler.handleResultSets(ps);
}
```

## 封装结果集

`Mybatis` 可以自动将查询的结果映射成实体类对象，这也是 `mybatis` 最大的一个特点

```java
public List<Object> handleResultSets(Statement stmt) throws SQLException {
  ErrorContext.instance().activity("handling results").object(mappedStatement.getId());

  final List<Object> multipleResults = new ArrayList<>();

  int resultSetCount = 0;
  // 获取第一个结果集
  ResultSetWrapper rsw = getFirstResultSet(stmt);

  List<ResultMap> resultMaps = mappedStatement.getResultMaps();
  int resultMapCount = resultMaps.size();
  validateResultMapsCount(rsw, resultMapCount);
  while (rsw != null && resultMapCount > resultSetCount) {
    ResultMap resultMap = resultMaps.get(resultSetCount);
    // 处理结果集
    handleResultSet(rsw, resultMap, multipleResults, null);
    // 获取下一个结果集
    rsw = getNextResultSet(stmt);
    cleanUpAfterHandlingResultSet();
    resultSetCount++;
  }
  // 获取多结果集，一般使用存储过程才有用到，这里不讨论，用的不多
  String[] resultSets = mappedStatement.getResultSets();
  if (resultSets != null) {
    while (rsw != null && resultSetCount < resultSets.length) {
      ResultMapping parentMapping = nextResultMaps.get(resultSets[resultSetCount]);
      if (parentMapping != null) {
        String nestedResultMapId = parentMapping.getNestedResultMapId();
        ResultMap resultMap = configuration.getResultMap(nestedResultMapId);
        handleResultSet(rsw, resultMap, null, parentMapping);
      }
      rsw = getNextResultSet(stmt);
      cleanUpAfterHandlingResultSet();
      resultSetCount++;
    }
  }

  return collapseSingleResultList(multipleResults);
}
```

进到 `handleResultSet()` 的方法

```java
public void handleRowValues(ResultSetWrapper rsw, ResultMap resultMap, ResultHandler<?> resultHandler, RowBounds rowBounds, ResultMapping parentMapping) throws SQLException {
  if (resultMap.hasNestedResultMaps()) {
    ensureNoRowBounds();
    checkResultHandler();
    //  处理嵌套查询结果集
    handleRowValuesForNestedResultMap(rsw, resultMap, resultHandler, rowBounds, parentMapping);
  } else {
    // 处理简单查询结果
    handleRowValuesForSimpleResultMap(rsw, resultMap, resultHandler, rowBounds, parentMapping);
  }
}
```

进到 `handleRowValuesForSimpleResultMap()` 方法

```java
private void handleRowValuesForSimpleResultMap(ResultSetWrapper rsw, ResultMap resultMap, ResultHandler<?> resultHandler, RowBounds rowBounds, ResultMapping parentMapping)
  throws SQLException {
  DefaultResultContext<Object> resultContext = new DefaultResultContext<>();
  ResultSet resultSet = rsw.getResultSet();
  // 处理逻辑分页用到这个方法
  skipRows(resultSet, rowBounds);
  while (shouldProcessMoreRows(resultContext, rowBounds) && !resultSet.isClosed() && resultSet.next()) {
    ResultMap discriminatedResultMap = resolveDiscriminatedResultMap(resultSet, resultMap, null);
    // 获取结果
    Object rowValue = getRowValue(rsw, discriminatedResultMap, null);
    // 存储结果
    storeObject(resultHandler, resultContext, rowValue, parentMapping, resultSet);
  }
}
```

进到`getRowValue()`方法中

```java
private Object getRowValue(ResultSetWrapper rsw, ResultMap resultMap, String columnPrefix) throws SQLException {
  final ResultLoaderMap lazyLoader = new ResultLoaderMap();
    // 创建实体类对象
  Object rowValue = createResultObject(rsw, resultMap, lazyLoader, columnPrefix);
  if (rowValue != null && !hasTypeHandlerForResultObject(rsw, resultMap.getType())) {
    final MetaObject metaObject = configuration.newMetaObject(rowValue);
    boolean foundValues = this.useConstructorMappings;
    if (shouldApplyAutomaticMappings(resultMap, false)) {
     // 进行自动映射
     foundValues = applyAutomaticMappings(rsw, resultMap, metaObject, columnPrefix) || foundValues;
    }
    // 根据 <resultMap> 节点中配置的映射关系进行映射
     foundValues = applyPropertyMappings(rsw, resultMap, metaObject, lazyLoader, columnPrefix) || foundValues;
    foundValues = lazyLoader.size() > 0 || foundValues;
    rowValue = foundValues || configuration.isReturnInstanceForEmptyRow() ? rowValue : null;
  }
  return rowValue;
}
```

跟着进入到应用自动映射`applyAutomaticMappings()`的方法 继续跟进`createAutomaticMappings()`创建自动映射的方法

```java
private List<UnMappedColumnAutoMapping> createAutomaticMappings(ResultSetWrapper rsw, ResultMap resultMap, MetaObject metaObject, String columnPrefix) throws SQLException {
    final String mapKey = resultMap.getId() + ":" + columnPrefix;
    List<UnMappedColumnAutoMapping> autoMapping = autoMappingsCache.get(mapKey);
    if (autoMapping == null) {
      autoMapping = new ArrayList<>();
        // 加载未映射的属性
      final List<String> unmappedColumnNames = rsw.getUnmappedColumnNames(resultMap, columnPrefix);
      for (String columnName : unmappedColumnNames) {
        String propertyName = columnName;
        if (columnPrefix != null && !columnPrefix.isEmpty()) {
          // When columnPrefix is specified,
          // ignore columns without the prefix.
          if (columnName.toUpperCase(Locale.ENGLISH).startsWith(columnPrefix)) {
            propertyName = columnName.substring(columnPrefix.length());
          } else {
            continue;
          }
        }
          // 获取属性
        final String property = metaObject.findProperty(propertyName, configuration.isMapUnderscoreToCamelCase());
        if (property != null && metaObject.hasSetter(property)) {
          if (resultMap.getMappedProperties().contains(property)) {
            continue;
          }
          final Class<?> propertyType = metaObject.getSetterType(property);
          if (typeHandlerRegistry.hasTypeHandler(propertyType, rsw.getJdbcType(columnName))) {
            final TypeHandler<?> typeHandler = rsw.getTypeHandler(propertyType, columnName);
             // 封装上面获取到的信息到 UnMappedColumnAutoMapping 对象中
            autoMapping.add(new UnMappedColumnAutoMapping(columnName, property, typeHandler, propertyType.isPrimitive()));
          } else {
            configuration.getAutoMappingUnknownColumnBehavior()
                .doAction(mappedStatement, columnName, property, propertyType);
          }
        } else {
          configuration.getAutoMappingUnknownColumnBehavior()
              .doAction(mappedStatement, columnName, (property != null) ? property : propertyName, null);
        }
      }
        // 放入缓存
      autoMappingsCache.put(mapKey, autoMapping);
    }
    return autoMapping;
  }
```

最后回到`getRowValue()`方法，往下走进入到`applyPropertyMappings()`方法

```java
private boolean applyPropertyMappings(ResultSetWrapper rsw, ResultMap resultMap, MetaObject metaObject, ResultLoaderMap lazyLoader, String columnPrefix)
  throws SQLException {
  // 获取已映射的列名
  final List<String> mappedColumnNames = rsw.getMappedColumnNames(resultMap, columnPrefix);
  boolean foundValues = false;
  // 获取 ResultMapping
  final List<ResultMapping> propertyMappings = resultMap.getPropertyResultMappings();
  for (ResultMapping propertyMapping : propertyMappings) {
    String column = prependPrefix(propertyMapping.getColumn(), columnPrefix);
    if (propertyMapping.getNestedResultMapId() != null) {
      // the user added a column attribute to a nested result map, ignore it
      column = null;
    }
    if (propertyMapping.isCompositeResult()
        || (column != null && mappedColumnNames.contains(column.toUpperCase(Locale.ENGLISH)))
        || propertyMapping.getResultSet() != null) {
      // 从结果集中获取指定列的数据
      Object value = getPropertyMappingValue(rsw.getResultSet(), metaObject, propertyMapping, lazyLoader, columnPrefix);
      // issue #541 make property optional
      final String property = propertyMapping.getProperty();
      if (property == null) {
        continue;
      } else if (value == DEFERRED) {
        foundValues = true;
        continue;
      }
      if (value != null) {
        foundValues = true;
      }
      if (value != null || (configuration.isCallSettersOnNulls() && !metaObject.getSetterType(property).isPrimitive())) {
        // gcode issue #377, call setter on nulls (value is not 'found')
        // 将获取到的值设置到实体类对象中
        metaObject.setValue(property, value);
      }
    }
  }
  // 返回结果
  return foundValues;
}
```

## 版本差异(MyBatis 3.x → 3.5.x)

| 特性 | 旧版（3.4.x 及以前） | 当前（3.5.x） |
|------|----------------------|----------------|
| 解析器 | XMLMapperBuilder 手工解析 | 不变，新增对 XML 实体安全解析（DTD 本地化） |
| TypeHandler | 手动注册 | 内置类型覆盖更全，支持泛型化 TypeHandler |
| 反射工具 | 传统 Reflector | MetaClass/MetaObject 缓存优化 |
| 映射 | 基本类型 + POJO | record 构造器自动映射（3.5.10+） |
| 依赖 | 无强依赖 | 可选依赖（ognl、javassist/byte-buddy） |

> 源码分析主线（XMLConfigBuilder 解析 mybatis-config.xml → XMLMapperBuilder 解析 mapper → 构建 Configuration → DefaultSqlSessionFactory）在 3.5.x 中完全一致，可放心复用本文调试思路。
