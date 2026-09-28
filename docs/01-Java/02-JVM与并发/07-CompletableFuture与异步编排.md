---
title: "CompletableFuture 与异步编排"
description: "CompletableFuture 编排方式、线程池隔离与异步避坑。"
keywords: [CompletableFuture, 异步]
category: "Java"
tags: [Java, Java并发编程实战]
---

# CompletableFuture 与异步编排

## CompletableFuture 与异步编排

业务系统出现"同时调用多个下游再聚合结果"的需求时，首先面临的是异步编排问题。单纯开启线程虽然可行，但很快会遇到：

- 回调层层嵌套
- 异常处理混乱
- 超时和降级难统一

`CompletableFuture` 的价值，在于把异步任务提交、结果组合、异常处理和超时控制统一到一套更可维护的模型之中。

## 一、CompletableFuture 解决什么问题

### 1.1 传统异步编程的痛点

#### Future 的局限性

```java
// 传统 Future 方式
ExecutorService executor = Executors.newFixedThreadPool(10);
Future<String> future = executor.submit(() -> {
    // 异步任务
    Thread.sleep(1000);
    return "结果";
});

// 问题1:阻塞获取结果
String result = future.get();  // 阻塞等待

// 问题2:无法编排后续操作
// future.get() 后才能继续处理,不能链式调用

// 问题3:异常处理不友好
try {
    String result = future.get();
} catch (ExecutionException e) {
    // 异常被包装在 ExecutionException 中
}
```

**Future 的主要缺陷**:

| 问题 | 说明 |
|------|------|
| **阻塞获取** | `get()` 方法会阻塞当前线程 |
| **无法编排** | 无法将多个 Future 组合执行 |
| **异常处理** | 异常被包装,处理不友好 |
| **无法手动完成** | 无法手动设置结果或异常 |
| **无超时控制** | 超时控制需要额外实现 |

#### 回调地狱

```java
// 回调地狱示例
serviceA.getData(new Callback<String>() {
    @Override
    public void onSuccess(String resultA) {
        serviceB.process(resultA, new Callback<String>() {
            @Override
            public void onSuccess(String resultB) {
                serviceC.save(resultB, new Callback<String>() {
                    @Override
                    public void onSuccess(String resultC) {
                        // 层层嵌套,代码难以维护
                    }
                    
                    @Override
                    public void onError(Exception e) {
                        // 异常处理混乱
                    }
                });
            }
            
            @Override
            public void onError(Exception e) {
                // 异常处理混乱
            }
        });
    }
    
    @Override
    public void onError(Exception e) {
        // 异常处理混乱
    }
});
```

### 1.2 CompletableFuture 的优势

`CompletableFuture` 本质上是"可组合的异步结果容器",可以表达:

- 一个任务异步执行
- 多个任务并发执行后汇总
- 上一步结果交给下一步继续处理
- 某个步骤失败后给出兜底值

```java
// CompletableFuture 方式
CompletableFuture<String> result = CompletableFuture
    .supplyAsync(() -> serviceA.getData())
    .thenApply(resultA -> serviceB.process(resultA))
    .thenApply(resultB -> serviceC.save(resultB))
    .exceptionally(ex -> "默认值");

// 清晰、可读、易维护
```

**CompletableFuture 的核心优势**:

| 特性 | 说明 |
|------|------|
| **链式调用** | 支持流式 API,代码更清晰 |
| **组合编排** | 支持多个 Future 的组合 |
| **异常处理** | 统一的异常处理机制 |
| **超时控制** | 内置超时控制能力 |
| **手动完成** | 可手动设置结果或异常 |
| **异步执行** | 灵活的线程池配置 |

## 二、CompletableFuture 常见编排方式

### 2.1 创建 CompletableFuture

#### supplyAsync:异步执行并返回结果

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class SupplyAsyncExample {
    public static void main(String[] args) {
        // 使用默认线程池(ForkJoinPool.commonPool())
        CompletableFuture<String> future1 = CompletableFuture.supplyAsync(() -> {
            System.out.println("执行异步任务,线程: " + Thread.currentThread().getName());
            return "结果1";
        });
        
        // 使用自定义线程池(推荐)
        ExecutorService executor = Executors.newFixedThreadPool(10);
        CompletableFuture<String> future2 = CompletableFuture.supplyAsync(() -> {
            System.out.println("执行异步任务,线程: " + Thread.currentThread().getName());
            return "结果2";
        }, executor);
        
        // 获取结果
        System.out.println(future1.join());  // "结果1"
        System.out.println(future2.join());  // "结果2"
        
        executor.shutdown();
    }
}
```

#### runAsync:异步执行无返回值

```java
// 无返回值的异步任务
CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
    System.out.println("执行无返回值的异步任务");
});
```

#### 手动创建

```java
// 创建已完成的 Future
CompletableFuture<String> completed = CompletableFuture.completedFuture("已完成");

// 创建未完成的 Future
CompletableFuture<String> future = new CompletableFuture<>();

// 手动完成
future.complete("手动设置结果");

// 手动完成异常
future.completeExceptionally(new RuntimeException("异常"));
```

### 2.2 thenApply:同步转换结果

**作用**:对上一步结果做同步转换,适合轻量结果映射。

```java
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> "hello")
    .thenApply(result -> result + " world")  // 同步转换
    .thenApply(String::toUpperCase);         // 继续转换

System.out.println(future.join());  // "HELLO WORLD"
```

**特点**:

- 同步执行,使用上一步的线程
- 如果上一步已完成,则在当前线程执行
- 适合轻量级的计算转换

### 2.3 thenApplyAsync:异步转换结果

**作用**:异步执行转换,使用不同的线程池。

```java
ExecutorService executor = Executors.newFixedThreadPool(10);

CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    System.out.println("步骤1,线程: " + Thread.currentThread().getName());
    return "hello";
}, executor)
    .thenApplyAsync(result -> {
        System.out.println("步骤2,线程: " + Thread.currentThread().getName());
        return result + " world";
    }, executor)
    .thenApplyAsync(result -> {
        System.out.println("步骤3,线程: " + Thread.currentThread().getName());
        return result.toUpperCase();
    }, executor);

System.out.println(future.join());

executor.shutdown();
```

**thenApply vs thenApplyAsync**:

| 对比项 | thenApply | thenApplyAsync |
|--------|-----------|----------------|
| **执行方式** | 同步,可能复用线程 | 异步,使用线程池 |
| **线程** | 上一步的线程或当前线程 | 线程池中的线程 |
| **适用场景** | 轻量级转换 | 耗时操作 |

### 2.4 thenCompose:串联异步依赖

**作用**:把前一步结果交给下一个异步任务,适合串联异步依赖。

```java
// thenCompose:扁平化嵌套的 CompletableFuture
CompletableFuture<String> future = CompletableFuture
    .supplyAsync(() -> "userId-123")
    .thenCompose(userId -> getUserInfo(userId))  // 返回 CompletableFuture<User>
    .thenCompose(user -> getPermissions(user.getId()))
    .thenApply(permissions -> "权限: " + permissions);

// 辅助方法
private CompletableFuture<User> getUserInfo(String userId) {
    return CompletableFuture.supplyAsync(() -> {
        // 模拟查询用户信息
        return new User(userId, "张三");
    });
}

private CompletableFuture<String> getPermissions(String userId) {
    return CompletableFuture.supplyAsync(() -> {
        // 模拟查询权限
        return "admin,user";
    });
}
```

**thenApply vs thenCompose**:

```java
// thenApply:同步转换,返回 T -> R
CompletableFuture<String> future1 = CompletableFuture.supplyAsync(() -> "hello")
    .thenApply(result -> result + " world");

// thenCompose:异步链式,返回 T -> CompletableFuture<R>
CompletableFuture<User> future2 = CompletableFuture.supplyAsync(() -> "userId")
    .thenCompose(userId -> getUserInfo(userId));  // 返回 CompletableFuture<User>
```

**简单理解**:

- `thenApply`:更像同步 `map`
- `thenCompose`:更像异步 `flatMap`

### 2.5 thenCombine:合并两个异步任务结果

**作用**:合并两个异步任务结果,适合并发查多个下游后做聚合。

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ThenCombineExample {
    public static void main(String[] args) {
        ExecutorService executor = Executors.newFixedThreadPool(10);
        
        // 任务1:查询商品信息
        CompletableFuture<Product> productFuture = CompletableFuture.supplyAsync(() -> {
            System.out.println("查询商品信息");
            sleep(1000);
            return new Product("iPhone 15", 5999);
        }, executor);
        
        // 任务2:查询库存
        CompletableFuture<Integer> stockFuture = CompletableFuture.supplyAsync(() -> {
            System.out.println("查询库存");
            sleep(800);
            return 100;
        }, executor);
        
        // 合并两个任务结果
        CompletableFuture<ProductDetail> detailFuture = productFuture.thenCombine(
            stockFuture,
            (product, stock) -> new ProductDetail(product, stock)
        );
        
        ProductDetail detail = detailFuture.join();
        System.out.println(detail);
        
        executor.shutdown();
    }
    
    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}

class Product {
    private String name;
    private int price;
    
    public Product(String name, int price) {
        this.name = name;
        this.price = price;
    }
    
    public String getName() { return name; }
    public int getPrice() { return price; }
}

class ProductDetail {
    private Product product;
    private int stock;
    
    public ProductDetail(Product product, int stock) {
        this.product = product;
        this.stock = stock;
    }
    
    @Override
    public String toString() {
        return String.format("商品: %s, 价格: %d, 库存: %d", 
            product.getName(), product.getPrice(), stock);
    }
}
```

### 2.6 allOf:等待多个任务完成

**作用**:等待多个任务都完成,再统一处理结果。

```java
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AllOfExample {
    public static void main(String[] args) {
        ExecutorService executor = Executors.newFixedThreadPool(10);
        
        List<CompletableFuture<String>> futures = new ArrayList<>();
        
        // 提交多个任务
        for (int i = 0; i < 5; i++) {
            final int taskId = i;
            futures.add(CompletableFuture.supplyAsync(() -> {
                System.out.println("任务 " + taskId + " 开始执行");
                sleep(1000);
                return "结果-" + taskId;
            }, executor));
        }
        
        // 等待所有任务完成
        CompletableFuture<Void> allFutures = CompletableFuture.allOf(
            futures.toArray(new CompletableFuture[0])
        );
        
        // 获取所有结果
        CompletableFuture<List<String>> resultsFuture = allFutures.thenApply(v -> {
            List<String> results = new ArrayList<>();
            for (CompletableFuture<String> future : futures) {
                results.add(future.join());
            }
            return results;
        });
        
        List<String> results = resultsFuture.join();
        System.out.println("所有任务完成: " + results);
        
        executor.shutdown();
    }
    
    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}
```

### 2.7 anyOf:任意一个任务完成

**作用**:任意一个任务完成就返回,适合竞速场景。

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AnyOfExample {
    public static void main(String[] args) {
        ExecutorService executor = Executors.newFixedThreadPool(10);
        
        // 从多个数据源查询,谁快用谁
        CompletableFuture<String> future1 = CompletableFuture.supplyAsync(() -> {
            sleep(1500);
            return "数据源1";
        }, executor);
        
        CompletableFuture<String> future2 = CompletableFuture.supplyAsync(() -> {
            sleep(1000);
            return "数据源2";
        }, executor);
        
        CompletableFuture<String> future3 = CompletableFuture.supplyAsync(() -> {
            sleep(2000);
            return "数据源3";
        }, executor);
        
        // 任意一个完成就返回
        CompletableFuture<Object> anyFuture = CompletableFuture.anyOf(
            future1, future2, future3
        );
        
        String result = (String) anyFuture.join();
        System.out.println("最快返回: " + result);  // "数据源2"
        
        executor.shutdown();
    }
    
    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}
```

### 2.8 异常处理

#### exceptionally:异常兜底

```java
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    if (Math.random() > 0.5) {
        throw new RuntimeException("模拟异常");
    }
    return "正常结果";
}).exceptionally(ex -> {
    System.out.println("发生异常: " + ex.getMessage());
    return "默认值";  // 异常兜底
});

System.out.println(future.join());
```

#### handle:统一处理结果和异常

```java
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    if (Math.random() > 0.5) {
        throw new RuntimeException("模拟异常");
    }
    return "正常结果";
}).handle((result, ex) -> {
    if (ex != null) {
        System.out.println("发生异常: " + ex.getMessage());
        return "异常处理后的默认值";
    }
    return result + " - 处理后";
});

System.out.println(future.join());
```

#### whenComplete:回调通知(不影响结果)

```java
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    if (Math.random() > 0.5) {
        throw new RuntimeException("模拟异常");
    }
    return "正常结果";
}).whenComplete((result, ex) -> {
    if (ex != null) {
        System.out.println("任务失败: " + ex.getMessage());
    } else {
        System.out.println("任务成功: " + result);
    }
});

// whenComplete 不影响最终结果
System.out.println(future.join());
```

**异常处理方法对比**:

| 方法 | 返回值 | 是否影响结果 | 适用场景 |
|------|--------|-------------|---------|
| exceptionally | 新的 CompletableFuture | 是,返回兜底值 | 异常恢复 |
| handle | 新的 CompletableFuture | 是,可处理结果和异常 | 统一处理 |
| whenComplete | 新的 CompletableFuture | 否,仅回调通知 | 日志记录、监控 |

## 三、典型应用场景

### 3.1 场景一:商品详情页聚合查询

**需求**:商品详情页需要同时查询商品基础信息、库存、营销活动、用户推荐。

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ProductDetailAggregator {
    private ExecutorService executor = Executors.newFixedThreadPool(20);
    
    public ProductDetailVO getProductDetail(Long productId, Long userId) {
        // 并发查询多个下游服务
        
        // 1. 查询商品基础信息(必须成功)
        CompletableFuture<ProductDTO> productFuture = CompletableFuture.supplyAsync(
            () -> productService.getProduct(productId), executor
        );
        
        // 2. 查询库存(必须成功)
        CompletableFuture<Integer> stockFuture = CompletableFuture.supplyAsync(
            () -> inventoryService.getStock(productId), executor
        );
        
        // 3. 查询营销活动(可降级)
        CompletableFuture<ActivityDTO> activityFuture = CompletableFuture.supplyAsync(
            () -> marketingService.getActivity(productId), executor
        ).exceptionally(ex -> ActivityDTO.empty());  // 失败时返回空对象
        
        // 4. 查询用户推荐(可降级)
        CompletableFuture<List<ProductDTO>> recommendFuture = CompletableFuture.supplyAsync(
            () -> recommendService.getRecommendations(userId), executor
        ).exceptionally(ex -> Collections.emptyList());  // 失败时返回空列表
        
        // 等待所有查询完成并聚合结果
        CompletableFuture<ProductDetailVO> resultFuture = CompletableFuture
            .allOf(productFuture, stockFuture, activityFuture, recommendFuture)
            .thenApply(v -> {
                ProductDetailVO detail = new ProductDetailVO();
                detail.setProduct(productFuture.join());
                detail.setStock(stockFuture.join());
                detail.setActivity(activityFuture.join());
                detail.setRecommendations(recommendFuture.join());
                return detail;
            })
            .orTimeout(3, TimeUnit.SECONDS)  // 整体超时3秒
            .exceptionally(ex -> {
                log.error("查询商品详情失败", ex);
                return ProductDetailVO.empty();  // 返回空对象
            });
        
        return resultFuture.join();
    }
    
    // 其他方法省略...
}
```

**优化点**:

1. 多个下游查询并发执行,RT 降低
2. 关键数据必须成功,次要数据可降级
3. 整体超时控制,避免长时间等待
4. 统一异常处理,避免异常传播

### 3.2 场景二:订单创建流程

**需求**:创建订单需要校验用户、扣减库存、生成订单、发送通知。

```java
public class OrderService {
    private ExecutorService executor = Executors.newFixedThreadPool(20);
    
    public OrderCreateResult createOrder(OrderCreateRequest request) {
        // 步骤1:校验用户(异步)
        CompletableFuture<UserDTO> userFuture = CompletableFuture.supplyAsync(
            () -> userService.checkUser(request.getUserId()), executor
        );
        
        // 步骤2:扣减库存(依赖步骤1,异步)
        CompletableFuture<Void> stockFuture = userFuture.thenAcceptAsync(
            user -> inventoryService.deductStock(request.getProductId(), request.getQuantity()),
            executor
        );
        
        // 步骤3:生成订单(依赖步骤1和2,异步)
        CompletableFuture<Order> orderFuture = userFuture.thenCombineAsync(
            stockFuture,
            (user, v) -> orderService.createOrder(request),
            executor
        );
        
        // 步骤4:发送通知(依赖步骤3,异步,可降级)
        CompletableFuture<Void> notifyFuture = orderFuture.thenAcceptAsync(
            order -> {
                try {
                    notificationService.sendOrderNotification(order);
                } catch (Exception e) {
                    log.warn("发送通知失败", e);  // 失败不影响主流程
                }
            },
            executor
        );
        
        // 步骤5:返回结果(依赖步骤3和4)
        CompletableFuture<OrderCreateResult> resultFuture = orderFuture
            .thenCombineAsync(
                notifyFuture,
                (order, v) -> new OrderCreateResult(order.getId(), "订单创建成功"),
                executor
            )
            .orTimeout(5, TimeUnit.SECONDS)
            .exceptionally(ex -> {
                log.error("订单创建失败", ex);
                throw new BusinessException("订单创建失败: " + ex.getMessage());
            });
        
        return resultFuture.join();
    }
}
```

### 3.3 场景三:并行执行多个独立任务

**需求**:批量处理多个独立任务,汇总结果。

```java
public class BatchProcessor {
    private ExecutorService executor = Executors.newFixedThreadPool(50);
    
    public List<TaskResult> processBatch(List<TaskRequest> requests) {
        // 并行处理多个任务
        List<CompletableFuture<TaskResult>> futures = requests.stream()
            .map(request -> CompletableFuture.supplyAsync(
                () -> processTask(request), executor
            ))
            .collect(Collectors.toList());
        
        // 等待所有任务完成
        CompletableFuture<Void> allFutures = CompletableFuture.allOf(
            futures.toArray(new CompletableFuture[0])
        );
        
        // 汇总结果
        CompletableFuture<List<TaskResult>> resultsFuture = allFutures.thenApply(v ->
            futures.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList())
        );
        
        return resultsFuture.join();
    }
    
    private TaskResult processTask(TaskRequest request) {
        // 处理单个任务
        return new TaskResult(request.getId(), "成功");
    }
}
```

### 3.4 场景四:超时控制和降级

```java
public class TimeoutExample {
    private ExecutorService executor = Executors.newFixedThreadPool(10);
    
    public String getDataWithTimeout() {
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
            // 模拟耗时操作
            sleep(3000);
            return "正常结果";
        }, executor)
        .orTimeout(2, TimeUnit.SECONDS)  // 超时2秒
        .exceptionally(ex -> {
            if (ex instanceof TimeoutException) {
                log.warn("操作超时,返回默认值");
                return "默认值";  // 超时降级
            }
            log.error("操作异常", ex);
            return "异常默认值";
        });
        
        return future.join();
    }
    
    // Java 8 方式(使用 CompletableFuture.get)
    public String getDataWithTimeoutJava8() {
        try {
            return CompletableFuture.supplyAsync(() -> {
                sleep(3000);
                return "正常结果";
            }, executor).get(2, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            return "默认值";  // 超时降级
        } catch (Exception e) {
            return "异常默认值";
        }
    }
}
```

## 四、线程池配置与隔离

### 4.1 为什么线程池仍然重要

`CompletableFuture` 只是编排工具,不是线程资源本身。异步任务最终还是落到线程池执行:

- 如果线程池配置不合理,异步链路仍然会被拖垮
- 如果共用一个线程池,阻塞 IO 和 CPU 任务仍然会互相影响

**常见问题**:

| 问题 | 表现 | 原因 |
|------|------|------|
| **线程池太小** | 任务排队,RT 增加 | 线程数不足 |
| **线程池太大** | CPU 飙高,上下文切换开销大 | 线程数过多 |
| **混合任务** | IO 阻塞任务拖慢 CPU 密集任务 | 共用线程池 |
| **无拒绝策略** | 任务堆积,内存溢出 | 队列无界 |

### 4.2 线程池隔离策略

```java
import java.util.concurrent.*;

public class ThreadPoolConfig {
    // CPU 密集型任务线程池
    public static final ExecutorService CPU_INTENSIVE = new ThreadPoolExecutor(
        Runtime.getRuntime().availableProcessors(),
        Runtime.getRuntime().availableProcessors() * 2,
        60L, TimeUnit.SECONDS,
        new LinkedBlockingQueue<>(100),
        new ThreadFactoryBuilder().setNameFormat("cpu-pool-%d").build(),
        new ThreadPoolExecutor.CallerRunsPolicy()
    );
    
    // IO 密集型任务线程池
    public static final ExecutorService IO_INTENSIVE = new ThreadPoolExecutor(
        Runtime.getRuntime().availableProcessors() * 2,
        Runtime.getRuntime().availableProcessors() * 4,
        60L, TimeUnit.SECONDS,
        new LinkedBlockingQueue<>(200),
        new ThreadFactoryBuilder().setNameFormat("io-pool-%d").build(),
        new ThreadPoolExecutor.CallerRunsPolicy()
    );
    
    // 快速响应任务线程池
    public static final ExecutorService FAST_RESPONSE = new ThreadPoolExecutor(
        20,
        50,
        60L, TimeUnit.SECONDS,
        new SynchronousQueue<>(),
        new ThreadFactoryBuilder().setNameFormat("fast-pool-%d").build(),
        new ThreadPoolExecutor.CallerRunsPolicy()
    );
}
```

### 4.3 正确使用线程池

```java
// × 错误示例:使用默认线程池
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    // 使用 ForkJoinPool.commonPool(),共享线程池
    return "结果";
});

// 正确示例:使用自定义线程池
ExecutorService executor = ThreadPoolConfig.IO_INTENSIVE;
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    // 使用自定义线程池,隔离资源
    return "结果";
}, executor);
```

## 五、常见误区与避坑

### 误区一:以为 CompletableFuture 能替代线程池治理

```java
// × 错误认识:CompletableFuture 自己管理线程
CompletableFuture.supplyAsync(() -> {
    // 实际上仍使用线程池(默认或自定义)
    return "结果";
});

// 正确理解:CompletableFuture 需要合理配置线程池
ExecutorService executor = new ThreadPoolExecutor(...);
CompletableFuture.supplyAsync(() -> "结果", executor);
```

### 误区二:全链路都 join(),最后又退化成同步阻塞

```java
// × 错误示例:每个步骤都 join()
String result1 = future1.join();  // 阻塞
String result2 = future2.join();  // 阻塞
String result3 = future3.join();  // 阻塞
// 完全退化成同步执行

// 正确示例:链式编排,最后统一 join()
String result = CompletableFuture
    .supplyAsync(() -> serviceA.getData())
    .thenApply(data -> serviceB.process(data))
    .thenApply(data -> serviceC.save(data))
    .join();  // 只在最后阻塞一次
```

### 误区三:异常被吞掉,排障时完全没有信息

```java
// × 错误示例:异常被静默处理
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    throw new RuntimeException("异常");
}).exceptionally(ex -> null);  // 异常被吞掉,返回 null

// 正确示例:记录异常日志
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    throw new RuntimeException("异常");
}).exceptionally(ex -> {
    log.error("异步任务失败", ex);  // 记录异常
    return "默认值";
});
```

### 误区四:同一个执行器里混跑阻塞任务和 CPU 任务

```java
// × 错误示例:阻塞 IO 和 CPU 任务共用线程池
ExecutorService executor = Executors.newFixedThreadPool(10);

CompletableFuture<String> ioTask = CompletableFuture.supplyAsync(() -> {
    return httpClient.get(url);  // IO 阻塞
}, executor);

CompletableFuture<Integer> cpuTask = CompletableFuture.supplyAsync(() -> {
    return calculate(data);  // CPU 密集
}, executor);

// IO 阻塞会拖慢 CPU 任务

// 正确示例:线程池隔离
CompletableFuture<String> ioTask = CompletableFuture.supplyAsync(() -> {
    return httpClient.get(url);  // IO 阻塞
}, ThreadPoolConfig.IO_INTENSIVE);

CompletableFuture<Integer> cpuTask = CompletableFuture.supplyAsync(() -> {
    return calculate(data);  // CPU 密集
}, ThreadPoolConfig.CPU_INTENSIVE);
```

### 误区五:用异步只是为了"显得高级",而不考虑链路可读性

```java
// × 错误示例:过度使用异步,代码难以理解
CompletableFuture
    .supplyAsync(() -> step1())
    .thenApplyAsync(step2)
    .thenComposeAsync(step3)
    .thenCombineAsync(future4, combine)
    .thenAcceptAsync(step5)
    .thenRunAsync(step6);

// 正确示例:简单场景用简单方案
// 如果不需要异步,直接同步执行更清晰
String result = step1();
result = step2(result);
result = step3(result);
```

## 六、排查与治理思路

### 6.1 排查重点

异步编排问题排查时优先看:

1. **实际执行使用的是哪个线程池**
   ```java
   CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
       System.out.println("线程: " + Thread.currentThread().getName());
       return "结果";
   }, executor);
   ```

2. **是否存在阻塞任务占满执行器**
   - 检查线程池队列长度
   - 查看活跃线程数
   - 分析线程转储

3. **异常是否被吞掉**
   - 检查是否有 `exceptionally` 或 `handle`
   - 确认异常处理是否记录日志

4. **是否设置了超时边界**
   ```java
   future.orTimeout(3, TimeUnit.SECONDS);
   ```

5. **是否在 join()/get() 时又把异步变回同步阻塞**
   - 检查调用链,避免多次阻塞
   - 只在必要的地方阻塞

### 6.2 治理重点

1. **线程池按任务类型隔离**
   - CPU 密集型任务使用独立的线程池
   - IO 密集型任务使用独立的线程池
   - 快速响应任务使用独立的线程池

2. **关键链路加超时和兜底**
   ```java
   CompletableFuture<String> future = CompletableFuture
       .supplyAsync(() -> callRemoteService())
       .orTimeout(2, TimeUnit.SECONDS)  // 超时控制
       .exceptionally(ex -> "默认值");  // 兜底逻辑
   ```

3. **异常统一处理,不要静默失败**
   ```java
   .exceptionally(ex -> {
       log.error("任务失败", ex);  // 记录日志
       metricsService.recordFailure();  // 记录指标
       return "默认值";
   });
   ```

4. **不要为了"用了异步"而把可读性彻底打散**
   - 简单场景用简单方案
   - 异步编排要清晰易懂
   - 必要时添加注释说明

## 七、面试要点

### 7.1 Future 和 CompletableFuture 的核心区别是什么

**回答要点**:

1. **编排能力**:
   - Future:只能阻塞获取结果,无法编排后续操作
   - CompletableFuture:支持链式调用、组合多个 Future

2. **异常处理**:
   - Future:异常被包装在 ExecutionException 中
   - CompletableFuture:提供 exceptionally、handle 等异常处理方法

3. **超时控制**:
   - Future:get(timeout) 支持超时
   - CompletableFuture:orTimeout 支持超时,并可设置默认值

4. **手动完成**:
   - Future:无法手动完成
   - CompletableFuture:支持 complete、completeExceptionally

### 7.2 thenApply 和 thenCompose 的区别

**要点**:

1. **返回类型**:
   - thenApply:返回 `CompletableFuture<R>`,R 是转换后的结果
   - thenCompose:返回 `CompletableFuture<R>`,但 R 本身是 CompletableFuture

2. **适用场景**:
   - thenApply:适合同步转换,类似 `map`
   - thenCompose:适合异步链式调用,类似 `flatMap`

3. **示例对比**:
   ```java
   // thenApply:同步转换
   CompletableFuture<String> future1 = CompletableFuture
       .supplyAsync(() -> "hello")
       .thenApply(s -> s + " world");
   
   // thenCompose:异步链式
   CompletableFuture<User> future2 = CompletableFuture
       .supplyAsync(() -> "userId")
       .thenCompose(userId -> getUserInfo(userId));  // 返回 CompletableFuture<User>
   ```

### 7.3 为什么异步编排仍然离不开线程池设计

**回答要点**:

1. **CompletableFuture 只是编排工具**:
   - 异步任务最终还是要在线程池中执行
   - CompletableFuture 本身不管理线程资源

2. **线程池配置影响性能**:
   - 线程数太少:任务排队,RT 增加
   - 线程数太多:CPU 飙高,上下文切换开销大

3. **资源隔离很重要**:
   - 不同类型的任务使用不同的线程池
   - 避免相互影响

4. **监控和调优**:
   - 监控线程池队列长度、活跃线程数
   - 根据实际情况调整线程池参数

### 7.4 异步聚合场景下超时和兜底为什么重要

**回答要点**:

1. **避免长时间等待**:
   - 下游服务慢或失败不应该拖死整个链路
   - 超时控制可以快速失败,返回默认值

2. **提升用户体验**:
   - 关键数据必须成功,次要数据可降级
   - 用户可以尽快看到部分结果

3. **保护系统稳定性**:
   - 避免线程池被长时间阻塞的任务占满
   - 避免级联故障

4. **监控和告警**:
   - 超时和降级应记录日志和指标
   - 便于后续优化和问题排查

## 八、总结

### 8.1 核心要点回顾

| 方法 | 作用 | 适用场景 |
|------|------|---------|
| **supplyAsync** | 异步执行并返回结果 | 有返回值的异步任务 |
| **runAsync** | 异步执行无返回值 | 无返回值的异步任务 |
| **thenApply** | 同步转换结果 | 轻量级结果映射 |
| **thenApplyAsync** | 异步转换结果 | 耗时的转换操作 |
| **thenCompose** | 串联异步依赖 | 链式异步调用 |
| **thenCombine** | 合并两个异步结果 | 并发查询后聚合 |
| **allOf** | 等待所有任务完成 | 批量任务处理 |
| **anyOf** | 任意一个完成即返回 | 竞速场景 |
| **exceptionally** | 异常兜底 | 异常恢复 |
| **handle** | 统一处理结果和异常 | 统一处理 |
| **orTimeout** | 超时控制 | 限时等待 |

### 8.2 最佳实践

1. **优先使用自定义线程池**:避免使用默认的 ForkJoinPool.commonPool()
2. **线程池隔离**:不同类型的任务使用不同的线程池
3. **设置超时**:关键链路必须设置超时控制
4. **异常处理**:不要静默失败,记录日志和指标
5. **避免过度使用**:简单场景用简单方案,不要为了异步而异步
6. **链式编排**:尽量使用链式调用,减少 join() 次数
7. **监控告警**:监控线程池状态、任务执行时间、异常率

### 8.3 学习建议

1. **理解原理**:理解 CompletableFuture 的实现原理
2. **实践验证**:通过代码验证理论知识
3. **性能测试**:对比同步和异步的性能差异
4. **排查问题**:学会分析线程转储、定位异步问题

## 九、虚拟线程与 CompletableFuture 的取舍（Java 21）

Java 21 虚拟线程正式发布后，异步编排多了一个新选择：

| 维度 | CompletableFuture | 虚拟线程 |
|------|------------------|---------|
| 思路 | 回调/编排，不阻塞线程 | 阻塞式代码，线程廉价 |
| 代码风格 | 链式回调，难调试 | 同步顺序代码，易读 |
| 适用场景 | 复杂依赖编排、超时合并 | 简单链路的 IO 并发 |
| 调试成本 | 堆栈割裂，难定位 | 堆栈完整，易排查 |

**选型建议**：

- 单一 IO 等待（一次 RPC、一次 DB 查询）→ 虚拟线程，代码同步化
- 复杂编排（多个任务依赖、合并、超时降级）→ 仍用 CompletableFuture
- 混合：虚拟线程内部用 `CompletableFuture` 做局部编排同样可行

```java
// Java 21：虚拟线程 + 同步代码替代 thenApplyAsync 链
var executor = Executors.newVirtualThreadPerTaskExecutor();
Future<String> f = executor.submit(() -> {
    User u = fetchUser(id);          // 阻塞但不占 OS 线程
    Order o = fetchOrder(u.id);      // 顺序执行，可读性高
    return buildResponse(u, o);
});
```

## 版本差异(旧版 → Java 21)

| 特性 | 旧版(Java 8) | Java 21 |
|------|-------------|---------|
| 异步编排 | CompletableFuture（8+） | 不变；仍是编排首选 |
| 异步执行线程 | ForkJoinPool.commonPool | 可指定虚拟线程执行器 |
| 大量并发 IO | 回调 + 线程池 | 虚拟线程直接顺序阻塞代码 |
| 超时与合并 | completeOnTimeout 等 | 不变；`orTimeout`/`completeOnTimeout`（9+） |