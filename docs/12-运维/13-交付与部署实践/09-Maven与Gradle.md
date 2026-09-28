---
title: Maven 与 Gradle
description: Maven 与 Gradle 构建工具对比（约定 vs 任务模型）、工程选型建议、pom.xml 与 build.gradle.kts 示例、依赖版本收敛与多环境打包实践
keywords: [Maven, Gradle, 构建工具, 依赖管理, 多环境打包]
category: 部署与运维实践
tags: [DevOps, Java, 构建工具]
---

# Maven 与 Gradle

## 0. 引言

`Maven` 与 `Gradle` 是 Java 生态的两大主流构建工具，负责**依赖管理、编译、测试、打包与发布**。选型之争常见于新项目启动时：Maven 以约定与稳定著称，Gradle 以灵活与速度见长。本章不站队，而是给出工程视角的选型决策逻辑，并分别展示两种工具的核心写法与版本管理的实践要点。

---

## 1. 核心差异：约定 vs 任务模型

| 维度 | Maven | Gradle |
|------|-------|--------|
| 核心模型 | 生命周期 + 插件（约定优于配置） | 任务图（Task Graph） |
| 配置文件 | `pom.xml`（XML） | `build.gradle` / `build.gradle.kts`（Groovy/Kotlin） |
| 目录结构 | 约定固定（src/main/java） | 约定为主，可自定义 |
| 构建速度 | 较慢 | 快（增量构建 + 构建缓存） |
| 灵活性 | 中，插件生态规范 | 高，可脚本化任意构建逻辑 |
| 学习成本 | 低 | 中高 |

- **Maven**：基于约定目录结构，生命周期清晰（clean → compile → test → package → install），适合团队统一规范；
- **Gradle**：基于任务模型，构建逻辑可编程，适合复杂构建、多模块编排与高度定制化场景。

---

## 2. 工程选型建议

| 场景 | 推荐 |
|------|------|
| 团队已有规范 | 跟随团队，不要为"更先进"随意切换 |
| 多数 Java 中后台新项目 | Maven（更稳妥、易统一规范） |
| 构建逻辑复杂、高度脚本化 | Gradle |
| Android / 大型多模块 | Gradle（事实标准） |

> 选型原则：**构建工具是团队基础设施，一致性比先进性更重要**。避免项目间混用导致仓库代理、插件规范、CI 脚本各搞一套。

---

## 3. 示例代码

### 3.1 Maven：pom.xml

```xml
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>demo</artifactId>
  <version>1.0.0</version>

  <properties>
    <java.version>21</java.version>
    <spring-boot.version>3.3.0</spring-boot.version>
  </properties>

  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-dependencies</artifactId>
        <version>${spring-boot.version}</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
    </dependencies>
  </dependencyManagement>
</project>
```

`dependencyManagement` 只声明版本、不直接引入依赖，子模块引用时无需再写版本号——这是**版本收敛**的核心机制。

### 3.2 Gradle：Kotlin DSL

```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.3.0"
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}
```

### 3.3 常用命令对照

| 操作 | Maven | Gradle |
|------|-------|--------|
| 编译 | `mvn compile` | `gradle compileJava` |
| 测试 | `mvn test` | `gradle test` |
| 打包 | `mvn package` | `gradle build` |
| 跳过测试打包 | `mvn package -DskipTests` | `gradle build -x test` |
| 多环境 | `mvn package -P prod`（profile） | `gradle build -Penv=prod`（属性） |

---

## 4. 版本管理实践

### 4.1 版本冲突与传递依赖

- **传递依赖**：A 依赖 B、B 依赖 C，C 的版本由传递规则决定，不显式声明容易失控；
- **冲突解决**：Maven 采用就近原则（最近声明优先）；Gradle 默认自动取最高版本，需要精确控制时可显式排除或强制版本：

```kotlin
implementation("com.example:lib:1.0") {
    exclude(group = "commons-logging", module = "commons-logging")
}
```

### 4.2 SNAPSHOT 与正式版本

| 版本类型 | 特性 | 使用 |
|----------|------|------|
| SNAPSHOT | 每次构建可拉取最新快照 | 开发期联调 |
| 正式版本 | 不可变、可复现 | 发布与生产 |

**生产构建必须使用正式版本**——SNAPSHOT 的"每次变化"会让构建结果不可复现。

### 4.3 版本收敛三板斧

- 父工程统一管理版本（dependencyManagement / platforms）；
- 子模块不随意覆盖版本，确有需要时集中说明；
- 统一构建工具与仓库代理配置（Nexus 等），保证 CI 与本地一致。

---

## 5. 常见误区

- **只会复制依赖，不理解版本冲突与传递依赖**：依赖树 `mvn dependency:tree` / `gradle dependencies` 是排障第一步；
- **随意覆盖版本**：父工程与子模块版本漂移，导致不可预测的构建问题；
- **一个文件堆所有逻辑**：构建逻辑、发布逻辑、环境配置全部堆在一起，后续维护成本极高（应拆分为插件与 profile/属性）。

---

## 6. 小结

- **本质差异**：Maven 约定驱动、Gradle 任务驱动，稳定性 vs 灵活性各取所需；
- **选型逻辑**：团队规范优先，中后台新项目 Maven 稳妥，复杂构建选 Gradle；
- **版本管理**：dependencyManagement 收敛版本、生产禁用 SNAPSHOT、依赖树排查冲突；
- **工程配套**：统一仓库代理与 CI 脚本，是构建工具落地的最后一步。

下一章讲解 Harbor 企业级私有仓库——镜像仓库的权限、复制与高可用方案。