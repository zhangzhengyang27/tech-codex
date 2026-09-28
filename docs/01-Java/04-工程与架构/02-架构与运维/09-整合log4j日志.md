---
title: "整合log4j日志"
description: "Spring Boot 日志框架整合：排除默认 Logback 并引入 spring-boot-starter-log4j2（含 log4j2.xml 配置与使用示例），以及 slf4j + log4j 1.x 的历史整合方式（已 EOL 有安全漏洞，仅作参考），附 AOP 记录 Service 执行时间切面与 log4j1→log4j2 版本差异表。"
keywords: [Log4j2, Logback, SLF4J, Spring Boot 日志, AOP 日志]
category: "Java"
tags: [Java, 架构与运维]
---


# Spring Boot 整合 Log4j 

在 Spring Boot 项目中整合 Log4j 可以帮助你更好地管理和记录日志。以下是如何在 Spring Boot 项目中配置 Log4j 的步骤

## spring-boot-starter-log4j2

Spring Boot 默认使用 Logback 作为日志框架，因此你需要排除它。在 `pom.xml` 文件中添加 Log4j 相关依赖。这里使用 `log4j2`，因为它是 Log4j 的最新版本并且性能更好

```xml
<dependencies>
  <!-- Spring Boot Starter -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter</artifactId>
    <exclusions>
      <exclusion>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-logging</artifactId>
      </exclusion>
    </exclusions>
  </dependency>
  <!-- Log4j2 for Spring Boot -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-log4j2</artifactId>
  </dependency>

  <!-- Optional: If you need Log4j2 extensions -->
  <dependency>
    <groupId>org.apache.logging.log4j</groupId>
    <artifactId>log4j-api</artifactId>
  </dependency>
  <dependency>
    <groupId>org.apache.logging.log4j</groupId>
    <artifactId>log4j-core</artifactId>
  </dependency>
</dependencies>
```

在 `src/main/resources` 目录下创建 `log4j2.xml` 文件，并添加你的日志配置。例如：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Configuration status="WARN">
    <Appenders>
        <!-- Console Appender -->
        <Console name="Console" target="SYSTEM_OUT">
            <PatternLayout pattern="%d{yyyy-MM-dd HH:mm:ss} %-5p %c{1}:%L - %m%n"/>
        </Console>
        
        <!-- File Appender -->
        <File name="File" fileName="logs/app.log">
            <PatternLayout pattern="%d{yyyy-MM-dd HH:mm:ss} %-5p %c{1}:%L - %m%n"/>
        </File>
    </Appenders>
    
    <Loggers>
        <!-- Root Logger -->
        <Root level="info">
            <AppenderRef ref="Console"/>
            <AppenderRef ref="File"/>
        </Root>
        
        <!-- Application Logger -->
        <Logger name="com.example" level="debug" additivity="false">
            <AppenderRef ref="Console"/>
            <AppenderRef ref="File"/>
        </Logger>
    </Loggers>
</Configuration>
```

在你的 Spring Boot 应用中使用 Log4j2 记录日志。例如：

```java
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {

  private static final Logger logger = LogManager.getLogger(DemoApplication.class);

  public static void main(String[] args) {
    SpringApplication.run(DemoApplication.class, args);
    logger.info("Spring Boot application started with Log4j2");
  }
}
```

运行你的 Spring Boot 应用，并检查控制台输出以及日志文件（如 `logs/app.log`）中的日志信息，确保 Log4j2 正常工作

## 整合 org.slf4j

> **版本警告**：下方 `slf4j-log4j12` + `log4j.properties` 属于 **log4j 1.x**（2015 年已 EOL，且存在 CVE-2019-17571 等已知漏洞），仅作历史参考，**新项目禁止使用**。现代 Spring Boot 3.x 默认内置 Logback（slf4j-api 2.x），无需额外引入日志绑定。

Spring Boot 默认使用 Logback 作为日志框架，因此需要排除它

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter</artifactId>
  <exclusions>
    <exclusion>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-logging</artifactId>
    </exclusion>
  </exclusions>
</dependency>

<!--引入日志依赖 抽象层 与 实现层-->
<dependency>
  <groupId>org.slf4j</groupId>
  <artifactId>slf4j-api</artifactId>
  <version>1.7.21</version>
</dependency>

<dependency>
  <groupId>org.slf4j</groupId>
  <artifactId>slf4j-log4j12</artifactId>
  <version>1.7.21</version>
</dependency>
```

创建 `log4j.properties` 放入到 `src/main/resource` 中

```properties
log4j.rootLogger=DEBUG,stdout,file
log4j.additivity.org.apache=true

log4j.appender.stdout=org.apache.log4j.ConsoleAppender
log4j.appender.stdout.threshold=INFO
log4j.appender.stdout.layout=org.apache.log4j.PatternLayout
log4j.appender.stdout.layout.ConversionPattern=%-5p %c{1}:%L - %m%n

log4j.appender.file=org.apache.log4j.DailyRollingFileAppender
log4j.appender.file.layout=org.apache.log4j.PatternLayout
log4j.appender.file.DatePattern='.'yyyy-MM-dd-HH-mm
log4j.appender.file.layout.ConversionPattern=%d{yyyy-MM-dd HH:mm:ss} %-5p %c{1}:%L - %m%n
log4j.appender.file.Threshold=INFO
log4j.appender.file.append=true
log4j.appender.file.File=logs/food/xiaoye.log
```

### 通过日志记录 service 执行时间

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

AOP 通知：
* 前置通知：在方法调用之前执行
* 后置通知：在方法正常调用之后执行
* 环绕通知：在方法调用之前和之后，都分别可以执行的通知
* 异常通知：如果在方法调用过程中发生异常，则通知
* 最终通知：在方法调用之后执行

```java
package com.xiaoye.aspect;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class ServiceLogAspect {

  public static final Logger log = LoggerFactory.getLogger(ServiceLogAspect.class);

  /**
     * AOP通知：
     * 1. 前置通知：在方法调用之前执行
     * 2. 后置通知：在方法正常调用之后执行
     * 3. 环绕通知：在方法调用之前和之后，都分别可以执行的通知
     * 4. 异常通知：如果在方法调用过程中发生异常，则通知
     * 5. 最终通知：在方法调用之后执行
     */

  /**
     * 切面表达式：
     * execution 代表所要执行的表达式主体
     * 第一处 * 代表方法返回类型 *代表所有类型
     * 第二处 包名代表aop监控的类所在的包
     * 第三处 .. 代表该包以及其子包下的所有类方法
     * 第四处 * 代表类名，*代表所有类
     * 第五处 *(..) *代表类中的方法名，(..)表示方法中的任何参数
     *
     * @param joinPoint
     * @return
     * @throws Throwable
     */
  @Around("execution(* com.xiaoye.service.impl..*.*(..))")
  public Object recordTimeLog(ProceedingJoinPoint joinPoint) throws Throwable {

    log.info("====== 开始执行 {}.{} ======", joinPoint.getTarget().getClass(), joinPoint.getSignature().getName());

    // 记录开始时间
    long begin = System.currentTimeMillis();

    // 执行目标 service
    Object result = joinPoint.proceed();

    // 记录结束时间
    long end = System.currentTimeMillis();
    long takeTime = end - begin;

    if (takeTime > 3000) {
      log.error("====== 执行结束，耗时：{} 毫秒 ======", takeTime);
    } else if (takeTime > 2000) {
      log.warn("====== 执行结束，耗时：{} 毫秒 ======", takeTime);
    } else {
      log.info("====== 执行结束，耗时：{} 毫秒 ======", takeTime);
    }
    return result;
  }
}
```

## 版本差异(log4j 1.x → log4j2/Logback)

| 特性 | 旧版（log4j 1.x / slf4j-log4j12） | 当前（log4j2 / Logback） |
|------|----------------------------------|--------------------------|
| 维护状态 | 2015 年 EOL，不再维护 | log4j2 2.17+ 活跃维护；Logback 1.5.x/1.4.x |
| 安全 | 存在 CVE-2019-17571 等漏洞 | 2.17.0+ 修复 Log4Shell（CVE-2021-44228）系列漏洞 |
| slf4j 版本 | 1.7.21（需手动指定） | slf4j-api 2.x（Spring Boot 3 默认） |
| 配置方式 | log4j.properties（properties 格式） | log4j2.xml / logback-spring.xml（XML，支持条件配置） |
| Spring Boot 集成 | 需手动排除 starter-logging | spring-boot-starter-log4j2 自动管理版本 |
| 异步日志 | 需要额外配置 | Log4j2 AsyncAppender 支持 LMAX Disruptor 高性能异步 |

> Spring Boot 3.5.x 下若使用 Log4j2，仅需在主依赖中排除 `spring-boot-starter-logging` 并引入 `spring-boot-starter-log4j2`（版本由 Boot 统一管理，无需写 version）；默认 Logback 方案无需任何改动。

