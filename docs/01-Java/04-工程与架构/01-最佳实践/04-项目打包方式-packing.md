---
title: "Java 后端项目打包方式（JAR/WAR/Docker 镜像）"
description: "从 JAR/WAR/EAR 打包格式选型，到 Maven/Gradle 打包配置、Spring Boot 分层打包、多模块聚合、Docker 多阶段构建与 K8s 部署，系统梳理 Java 后端项目的打包方式与优化技巧。"
keywords: [JAR, WAR, Maven, Gradle, Spring Boot, Docker, 分层打包]
category: "Java"
tags: [Java, 最佳实践]
---


# Java 后端项目打包方式

## 1. 打包格式分类

### 1.1 按打包格式划分

| 格式 | 全称                    | 用途                         | 特点                           |
| ---- | ----------------------- | ---------------------------- | ------------------------------ |
| JAR  | Java Archive            | 标准 Java 包，可执行或依赖包 | 可独立执行，便于分发           |
| WAR  | Web Application Archive | Web 应用包                   | 包含 Web 组件，需容器运行      |
| EAR  | Enterprise Archive      | 企业级应用包                 | 可包含多个模块，适用于复杂应用 |

### 1.2 打包格式选择指南

- **JAR**: 适用于微服务、独立应用或共享库
- **WAR**: 适用于传统 Web 应用，需要 Servlet 容器支持
- **EAR**: 适用于大型企业级应用，包含多个 Web 模块和 EJB 模块

## 2. 构建工具与打包方式

### 2.1 Maven 打包配置

#### 基本 JAR 打包

```xml
<!-- pom.xml -->
<project>
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>demo-app</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <build>
        <plugins>
            <!-- 1. 默认打包（不包含依赖） -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-jar-plugin</artifactId>
                <version>3.2.2</version>
                <configuration>
                    <archive>
                        <manifest>
                            <mainClass>com.example.MainApplication</mainClass>
                            <addClasspath>true</addClasspath>
                            <classpathPrefix>lib/</classpathPrefix>
                        </manifest>
                    </archive>
                </configuration>
            </plugin>

            <!-- 2. 胖JAR/阴影JAR（包含所有依赖） -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-shade-plugin</artifactId>
                <version>3.2.4</version>
                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals>
                            <goal>shade</goal>
                        </goals>
                        <configuration>
                            <createDependencyReducedPom>false</createDependencyReducedPom>
                            <transformers>
                                <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                                    <mainClass>com.example.MainApplication</mainClass>
                                </transformer>
                                <!-- 解决META-INF文件冲突 -->
                                <transformer implementation="org.apache.maven.plugins.shade.resource.ServicesResourceTransformer"/>
                                <transformer implementation="org.apache.maven.plugins.shade.resource.AppendingTransformer">
                                    <resource>META-INF/spring.handlers</resource>
                                </transformer>
                                <transformer implementation="org.apache.maven.plugins.shade.resource.AppendingTransformer">
                                    <resource>META-INF/spring.schemas</resource>
                                </transformer>
                            </transformers>
                            <filters>
                                <filter>
                                    <artifact>*:*</artifact>
                                    <excludes>
                                        <exclude>META-INF/*.SF</exclude>
                                        <exclude>META-INF/*.DSA</exclude>
                                        <exclude>META-INF/*.RSA</exclude>
                                    </excludes>
                                </filter>
                            </filters>
                        </configuration>
                    </execution>
                </executions>
            </plugin>

            <!-- 3. 依赖复制插件（配合默认jar使用） -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-dependency-plugin</artifactId>
                <executions>
                    <execution>
                        <id>copy-dependencies</id>
                        <phase>package</phase>
                        <goals>
                            <goal>copy-dependencies</goal>
                        </goals>
                        <configuration>
                            <outputDirectory>${project.build.directory}/lib</outputDirectory>
                            <overWriteReleases>false</overWriteReleases>
                            <overWriteSnapshots>false</overWriteSnapshots>
                            <overWriteIfNewer>true</overWriteIfNewer>
                        </configuration>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

#### Spring Boot 打包

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <version>3.5.0</version>
    <executions>
        <execution>
            <goals>
                <goal>repackage</goal>
            </goals>
        </execution>
    </executions>
    <configuration>
        <mainClass>com.example.Application</mainClass>
        <layout>JAR</layout>
        <!-- 排除开发工具 -->
        <excludeDevtools>true</excludeDevtools>
        <!-- 可执行JAR和原始JAR都生成 -->
        <classifier>exec</classifier>
    </configuration>
</plugin>
```

### 2.2 Gradle 打包配置

```gradle
// build.gradle 或 build.gradle.kts

// Java插件
apply plugin: 'java'
apply plugin: 'org.springframework.boot'

// Jar配置
jar {
    manifest {
        attributes 'Main-Class': 'com.example.Application'
    }
}

// 胖JAR配置
jar {
    enabled = true
    manifest {
        attributes 'Main-Class': 'com.example.Application'
    }
    from {
        configurations.runtimeClasspath.collect { it.isDirectory() ? it : zipTree(it) }
    }
}

// Spring Boot特定配置
bootJar {
    manifest {
        attributes 'Start-Class': 'com.example.Application'
    }
}
```

## 3. 不同场景的打包策略

### 3.1 微服务应用打包

```xml
<!-- 微服务专用配置 -->
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <image>
            <name>my-registry/${project.artifactId}:${project.version}</name>
            <publish>true</publish>
        </image>
        <layers>
            <enabled>true</enabled>
        </layers>
    </configuration>
    <executions>
        <execution>
            <id>build-image</id>
            <phase>package</phase>
            <goals>
                <goal>build-image</goal>
            </goals>
        </execution>
    </executions>
</plugin>

<!-- Jib插件用于构建优化的Docker镜像 -->
<plugin>
    <groupId>com.google.cloud.tools</groupId>
    <artifactId>jib-maven-plugin</artifactId>
    <version>3.2.1</version>
    <configuration>
        <from>
            <image>openjdk:17-jre-slim</image>
        </from>
        <to>
            <image>registry.hub.docker.com/username/${project.artifactId}:${project.version}</image>
        </to>
        <container>
            <jvmFlags>
                <jvmFlag>-Xms512m</jvmFlag>
                <jvmFlag>-Xmx1024m</jvmFlag>
            </jvmFlags>
            <mainClass>com.example.Application</mainClass>
        </container>
    </configuration>
</plugin>
```

### 3.2 Docker 镜像打包

```dockerfile
# 多阶段构建 Dockerfile

# 第一阶段：构建应用
FROM maven:3.8.5-openjdk-17 AS builder
WORKDIR /app

# 下载依赖（利用Docker缓存优化）
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 复制源码并构建
COPY src ./src
ARG PROFILE=prod
RUN mvn clean package -DskipTests -Dspring.profiles.active=${PROFILE}

# 第二阶段：创建运行时镜像
FROM openjdk:17-jre-slim

# 安装必要的工具和字体
RUN apt-get update && apt-get install -y \
    curl \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录和时区
WORKDIR /app
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 复制应用JAR
COPY --from=builder /app/target/*.jar app.jar

# 创建非root用户
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# 暴露端口和启动命令
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=prod", "app.jar"]
```

### 3.3 Web 应用打包（WAR）

```xml
<project>
    <!-- 更改打包类型 -->
    <packaging>war</packaging>

    <dependencies>
        <!-- 移除内嵌Tomcat -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <exclusions>
                <exclusion>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-starter-tomcat</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <!-- 添加Servlet API（Boot 3.x 用 jakarta.servlet） -->
        <dependency>
            <groupId>jakarta.servlet</groupId>
            <artifactId>jakarta.servlet-api</artifactId>
            <version>6.0.0</version>
            <scope>provided</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-war-plugin</artifactId>
                <version>3.3.2</version>
                <configuration>
                    <failOnMissingWebXml>false</failOnMissingWebXml>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

```java
// 修改启动类以支持WAR部署
@SpringBootApplication
public class Application extends SpringBootServletInitializer {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(Application.class);
    }
}
```

## 4. 高级打包技术

### 4.1 分层打包优化

```xml
<!-- Spring Boot 2.3+ 分层打包 -->
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <layers>
            <enabled>true</enabled>
            <configuration>${project.basedir}/layers.xml</configuration>
        </layers>
    </configuration>
</plugin>
```

```xml
<!-- layers.xml 自定义分层配置 -->
<layers xmlns="http://www.springframework.org/schema/boot/layers"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.springframework.org/schema/boot/layers
                            https://www.springframework.org/schema/boot/layers/layers-2.5.xsd">
    <application>
        <into layer="spring-boot-loader">
            <include>org/springframework/boot/loader/**</include>
        </into>
        <into layer="application" />
    </application>
    <dependencies>
        <into layer="snapshot-dependencies">
            <include>*:*:*SNAPSHOT</include>
        </into>
        <into layer="dependencies" />
    </dependencies>
    <layerOrder>
        <layer>dependencies</layer>
        <layer>spring-boot-loader</layer>
        <layer>snapshot-dependencies</layer>
        <layer>application</layer>
    </layerOrder>
</layers>
```

```java
// 自定义分层配置（示意。Layers 接口还有其他方法需一并实现，
// 多数场景直接用上文 layers.xml 配置更简单）
import org.springframework.boot.loader.tools.Layers;
import java.util.Arrays;
import java.util.List;

public class CustomLayers implements Layers {
    @Override
    public List<String> getLayers() {
        return Arrays.asList(
            "dependencies",      // 外部依赖，变化较少
            "spring-boot-loader", // Spring Boot加载器
            "snapshot-dependencies", // 快照版本依赖，变化频繁
            "configuration",      // 配置文件，可能变化
            "application"         // 应用代码，变化最频繁
        );
    }
}
```

### 4.2 多模块项目打包

#### 父 POM 聚合配置

```xml
<!-- 父POM -->
<project>
    <groupId>com.example</groupId>
    <artifactId>multi-module-app</artifactId>
    <version>1.0.0</version>
    <packaging>pom</packaging>

    <modules>
        <module>core</module>
        <module>service</module>
        <module>web</module>
    </modules>

    <dependencyManagement>
        <dependencies>
            <!-- 核心模块 -->
            <dependency>
                <groupId>com.example</groupId>
                <artifactId>core</artifactId>
                <version>${project.version}</version>
            </dependency>

            <!-- 服务模块 -->
            <dependency>
                <groupId>com.example</groupId>
                <artifactId>service</artifactId>
                <version>${project.version}</version>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <build>
        <pluginManagement>
            <plugins>
                <plugin>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-maven-plugin</artifactId>
                    <configuration>
                        <excludes>
                            <exclude>
                                <groupId>org.springframework.boot</groupId>
                                <artifactId>spring-boot-devtools</artifactId>
                            </exclude>
                        </excludes>
                    </configuration>
                </plugin>
            </plugins>
        </pluginManagement>
    </build>
</project>
```

#### 子模块依赖管理

```xml
<!-- web模块POM -->
<project>
    <parent>
        <groupId>com.example</groupId>
        <artifactId>multi-module-app</artifactId>
        <version>1.0.0</version>
    </parent>
    <artifactId>web</artifactId>

    <dependencies>
        <!-- 依赖核心模块 -->
        <dependency>
            <groupId>com.example</groupId>
            <artifactId>core</artifactId>
        </dependency>

        <!-- 依赖服务模块 -->
        <dependency>
            <groupId>com.example</groupId>
            <artifactId>service</artifactId>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <executions>
                    <execution>
                        <goals>
                            <goal>repackage</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

### 4.3 跨平台构建配置

```xml
<!-- 使用Maven Assembly Plugin创建分发包 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-assembly-plugin</artifactId>
    <version>3.3.0</version>
    <configuration>
        <descriptors>
            <descriptor>src/main/assembly/distribution.xml</descriptor>
        </descriptors>
        <tarLongFileMode>posix</tarLongFileMode>
    </configuration>
    <executions>
        <execution>
            <id>make-assembly</id>
            <phase>package</phase>
            <goals>
                <goal>single</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

```xml
<!-- distribution.xml -->
<assembly xmlns="http://maven.apache.org/ASSEMBLY/2.1.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/ASSEMBLY/2.1.0
                              http://maven.apache.org/xsd/assembly-2.1.0.xsd">
    <id>distribution</id>
    <formats>
        <format>zip</format>
        <format>tar.gz</format>
    </formats>
    <fileSets>
        <fileSet>
            <directory>${project.build.directory}</directory>
            <outputDirectory>/</outputDirectory>
            <includes>
                <include>*.jar</include>
            </includes>
        </fileSet>
        <fileSet>
            <directory>src/main/scripts</directory>
            <outputDirectory>/bin</outputDirectory>
            <fileMode>0755</fileMode>
        </fileSet>
        <fileSet>
            <directory>src/main/config</directory>
            <outputDirectory>/config</outputDirectory>
        </fileSet>
    </fileSets>
</assembly>
```

## 5. 打包配置最佳实践

### 5.1 资源文件处理

```xml
<build>
    <resources>
        <!-- 配置文件支持变量替换 -->
        <resource>
            <directory>src/main/resources</directory>
            <filtering>true</filtering>
            <includes>
                <include>**/*.properties</include>
                <include>**/*.yml</include>
                <include>**/*.yaml</include>
            </includes>
        </resource>
        <!-- 静态资源不进行变量替换 -->
        <resource>
            <directory>src/main/resources</directory>
            <filtering>false</filtering>
            <includes>
                <include>**/*.xml</include>
                <include>static/**</include>
                <include>templates/**</include>
            </includes>
        </resource>
    </resources>

    <!-- 测试资源处理 -->
    <testResources>
        <testResource>
            <directory>src/test/resources</directory>
            <filtering>true</filtering>
        </testResource>
    </testResources>
</build>
```

### 5.2 多环境配置打包

```xml
<!-- Maven Profile配置 -->
<profiles>
    <profile>
        <id>dev</id>
        <activation>
            <activeByDefault>true</activeByDefault>
        </activation>
        <properties>
            <activatedProperties>dev</activatedProperties>
        </properties>
    </profile>

    <profile>
        <id>test</id>
        <properties>
            <activatedProperties>test</activatedProperties>
        </properties>
    </profile>

    <profile>
        <id>prod</id>
        <properties>
            <activatedProperties>prod</activatedProperties>
        </properties>
        <build>
            <plugins>
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-resources-plugin</artifactId>
                    <configuration>
                        <nonFilteredFileExtensions>
                            <nonFilteredFileExtension>jpg</nonFilteredFileExtension>
                            <nonFilteredFileExtension>png</nonFilteredFileExtension>
                            <nonFilteredFileExtension>gif</nonFilteredFileExtension>
                            <nonFilteredFileExtension>ico</nonFilteredFileExtension>
                            <nonFilteredFileExtension>pdf</nonFilteredFileExtension>
                        </nonFilteredFileExtensions>
                    </configuration>
                </plugin>
            </plugins>
        </build>
    </profile>
</profiles>
```

```yaml
# application.yml
spring:
  profiles:
    active: @activatedProperties@
  config:
    import: optional:file:./config/application-${spring.profiles.active}.yml
```

### 5.3 打包命令示例

```bash
# Maven 打包命令
mvn clean package -DskipTests                           # 跳过测试打包
mvn clean package -Pprod                                # 使用生产环境配置
mvn clean package -Dmaven.test.skip=true                # 跳过测试
mvn clean install                                      # 构建并安装到本地仓库
mvn clean deploy                                       # 构建并部署到远程仓库

# Spring Boot 特定命令
mvn spring-boot:build-image                            # 构建 Docker 镜像
mvn spring-boot:run                                    # 运行应用
mvn clean package spring-boot:repackage               # 重新打包

# Gradle 打包命令
gradle clean build -x test                            # 跳过测试
gradle bootJar                                         # 构建可执行 JAR
gradle bootBuildImage                                  # 构建 Docker 镜像
gradle assemble                                        # 构建所有发布版本
gradle publish                                         # 发布到仓库
```

## 6. 打包优化技巧

### 6.1 依赖优化

#### 排除不必要的依赖

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <excludeDevtools>true</excludeDevtools>
        <!-- 按 坐标 排除，不要按 groupId 整组排除：
             excludeGroupIds 写 org.springframework.boot 会把框架本身从胖 JAR 中排除 -->
        <excludes>
            <exclude>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
            </exclude>
        </excludes>
    </configuration>
</plugin>

<!-- 在依赖声明中排除传递依赖 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

#### 依赖分析与优化

```xml
<!-- Maven Dependency Plugin 依赖分析 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-dependency-plugin</artifactId>
    <version>3.6.1</version>
    <executions>
        <execution>
            <id>analyze</id>
            <goals>
                <goal>analyze-only</goal>
            </goals>
            <configuration>
                <failOnWarning>true</failOnWarning>
                <ignoreNonCompile>false</ignoreNonCompile>
            </configuration>
        </execution>
    </executions>
</plugin>
```

```bash
# 分析未使用的依赖
mvn dependency:analyze

# 显示依赖树
mvn dependency:tree

# 分析依赖大小
mvn dependency:analyze-duplicate
```

### 6.2 资源优化

#### 资源过滤和压缩

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-resources-plugin</artifactId>
    <version>3.2.0</version>
    <configuration>
        <encoding>UTF-8</encoding>
        <nonFilteredFileExtensions>
            <nonFilteredFileExtension>jpg</nonFilteredFileExtension>
            <nonFilteredFileExtension>jpeg</nonFilteredFileExtension>
            <nonFilteredFileExtension>gif</nonFilteredFileExtension>
            <nonFilteredFileExtension>png</nonFilteredFileExtension>
            <nonFilteredFileExtension>ico</nonFilteredFileExtension>
            <nonFilteredFileExtension>pdf</nonFilteredFileExtension>
            <nonFilteredFileExtension>zip</nonFilteredFileExtension>
        </nonFilteredFileExtensions>
    </configuration>
</plugin>

<!-- YUI Compressor 压缩JS和CSS（注意：YUI Compressor 已停止维护，
     新项目建议由前端构建链 Vite/webpack 产出静态资源，Java 侧只做打包） -->
<plugin>
    <groupId>net.alchim31.maven</groupId>
    <artifactId>yuicompressor-maven-plugin</artifactId>
    <version>1.5.1</version>
    <executions>
        <execution>
            <id>compress-js-css</id>
            <phase>process-resources</phase>
            <goals>
                <goal>compress</goal>
            </goals>
            <configuration>
                <sourceDirectory>src/main/resources/static</sourceDirectory>
                <outputDirectory>target/classes/static</outputDirectory>
                <excludes>
                    <exclude>**/*.min.js</exclude>
                    <exclude>**/*.min.css</exclude>
                </excludes>
                <jswarn>false</jswarn>
                <nosuffix>true</nosuffix>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### 6.3 代码混淆与保护

```xml
<!-- ProGuard 混淆代码 -->
<plugin>
    <groupId>com.github.wvengen</groupId>
    <artifactId>proguard-maven-plugin</artifactId>
    <version>2.5.1</version>
    <executions>
        <execution>
            <phase>package</phase>
            <goals>
                <goal>proguard</goal>
            </goals>
        </execution>
    </executions>
    <configuration>
        <proguardVersion>7.2.2</proguardVersion>
        <injar>${project.build.finalName}.jar</injar>
        <outjar>${project.build.finalName}-proguard.jar</outjar>
        <!-- ProGuard 7 配合 JDK 9+ 模块化运行时无需指定 rt.jar（JDK 8 时代写法） -->
        <obfuscate>true</obfuscate>
        <options>
            <option>-keep public class * { public *; }</option>
            <option>-keep class com.example.Application { *; }</option>
            <option>-dontwarn **</option>
            <option>-dontshrink</option>
        </options>
    </configuration>
</plugin>
```

## 7. 打包问题排查

### 7.1 常见打包问题及解决方案

#### 依赖冲突

```xml
<!-- Maven Enforcer Plugin 检测依赖冲突 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-enforcer-plugin</artifactId>
    <version>3.0.0</version>
    <executions>
        <execution>
            <id>enforce-versions</id>
            <goals>
                <goal>enforce</goal>
            </goals>
            <configuration>
                <rules>
                    <dependencyConvergence/>
                    <banDuplicateClasses>
                        <ignoreClasses>
                            <ignoreClass>org/slf4j/impl/StaticLoggerBinder.class</ignoreClass>
                        </ignoreClasses>
                    </banDuplicateClasses>
                </rules>
                <fail>true</fail>
            </configuration>
        </execution>
    </executions>
</plugin>
```

#### 资源缺失

```xml
<!-- 强制复制所有资源 -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-resources-plugin</artifactId>
    <version>3.2.0</version>
    <executions>
        <execution>
            <id>copy-resources</id>
            <phase>validate</phase>
            <goals>
                <goal>copy-resources</goal>
            </goals>
            <configuration>
                <outputDirectory>${project.build.outputDirectory}</outputDirectory>
                <resources>
                    <resource>
                        <directory>src/main/resources</directory>
                        <filtering>false</filtering>
                        <includes>
                            <include>**/*</include>
                        </includes>
                    </resource>
                </resources>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### 7.2 调试技巧

```bash
# 开启Maven调试模式
mvn -X clean package

# 查看JAR包内容
jar tf target/myapp.jar

# 查看MANIFEST.MF内容
unzip -p target/myapp.jar META-INF/MANIFEST.MF

# 运行时调试
java -cp target/myapp.jar com.example.Application
java -verbose:class -jar target/myapp.jar
```

## 8. 云原生打包最佳实践

### 8.1 云原生镜像优化

```dockerfile
# 使用多阶段构建减小镜像体积
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app
COPY . .
RUN ./mvnw package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

# 添加非root用户
RUN addgroup -g 1000 appgroup && adduser -D -u 1000 -G appgroup appuser
USER appuser

# JVM优化参数
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

### 8.2 Kubernetes 部署配置

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: registry.example.com/myapp:1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "k8s"
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1024Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /actuator/health
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /actuator/health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
```

## 9. 总结

打包方式没有唯一正解，核心是让产物形态匹配运行环境：跑在 JVM 里就打 JAR，扔进外部容器就打 WAR，上云就构建分层镜像。落地时建议按下面的清单逐项检查：

1. **根据项目类型选择合适的打包格式**：

   - 单体应用通常选择 JAR
   - 传统 Web 应用选择 WAR
   - 大型企业应用考虑 EAR

2. **针对不同场景采用合适的打包策略**：

   - 微服务应用使用分层 JAR 和 Docker 镜像
   - 多模块项目合理管理依赖关系
   - 云原生环境优化镜像大小和启动速度

3. **优化打包过程**：

   - 排除不必要的依赖
   - 压缩静态资源
   - 考虑代码保护需求

4. **采用云原生最佳实践**：

   - 多阶段 Docker 构建
   - 非 root 用户运行
   - 资源限制和健康检查

5. **持续优化和监控**：
   - 定期检查依赖冲突
   - 分析包大小变化
   - 监控应用启动性能

通过以上策略，可以构建出高效、安全且易于部署的 Java 应用程序。

## 版本差异(Spring Boot 2.3+ → 3.5.x)

| 特性 | 旧版（Boot 2.3+ 分层打包） | 当前（Boot 3.5.x） |
|------|---------------------------|--------------------|
| 分层打包工具 | layertools（jarmode） | 不变，`java -Djarmode=layertools -jar` 仍可用 |
| Buildpacks | 早期支持 | 官方主推（`mvn spring-boot:build-image`），免 Dockerfile |
| 可执行 jar | 传统 fat jar | 不变；新增 AOT 优化支持原生镜像 |
| 部署方式 | 传统 / 容器 | 容器（分层镜像）+ 原生镜像（GraalVM）并行 |
| JDK | 8/11 | 17-25 |

> 本文的 jar/war 打包、Dockerfile 分层方案在 Boot 3.5.x 中依然有效；新项目可优先尝试 `spring-boot:build-image`（Cloud Native Buildpacks），无需手写 Dockerfile。
