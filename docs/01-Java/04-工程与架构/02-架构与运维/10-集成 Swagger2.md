---
title: "集成 Swagger2"
description: "Spring Boot 集成 API 文档：springfox Swagger2（Docket 配置、swagger-bootstrap-ui 增强、全局参数与分组）的历史用法，以及 Boot 3.x 下的替代方案 springdoc-openapi（依赖即用、swagger-ui 访问路径、Swagger2→OpenAPI3 注解对照表与 Knife4j 迁移提示）。"
keywords: [Swagger2, springdoc, OpenAPI, Knife4j, API文档]
category: "Java"
tags: [Java, 架构与运维]
---


# 集成 Swagger2

> **重要版本变更**：本文使用的 springfox（Swagger2）已停止维护（2020 年后无更新），**不兼容 Spring Boot 3.x**（jakarta 命名空间）。Spring Boot 3.5.x 项目请使用 **springdoc-openapi**（OpenAPI 3 标准，见文末新章节），本文保留作为历史参考。

在 Spring Boot 应用中集成 Swagger2 可以帮助你自动生成 API 文档。引入下文的 swagger-bootstrap-ui 增强后，启动应用即可访问 `http://localhost:8080/doc.html` 查看文档

## 添加依赖

在 `pom.xml` 文件中添加 Swagger2 和 Swagger UI 的依赖

```xml
<dependencies>
  <!-- Swagger2 dependencies -->
  <dependency>
    <groupId>io.springfox</groupId>
    <artifactId>springfox-swagger2</artifactId>
    <version>2.8.0</version>
  </dependency>
  <dependency>
    <groupId>io.springfox</groupId>
    <artifactId>springfox-swagger-ui</artifactId>
    <version>2.8.0</version>
  </dependency>
  <dependency>
    <groupId>com.github.xiaoymin</groupId>
    <artifactId>swagger-bootstrap-ui</artifactId>
    <version>1.9.3</version>
  </dependency>
</dependencies>
```

## 创建 Swagger 配置类

### 简单配置类

在的 Spring Boot 应用中创建一个配置类来配置 Swagger

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import springfox.documentation.builders.ApiInfoBuilder;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.builders.RequestHandlerSelectors;
import springfox.documentation.service.ApiInfo;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spring.web.plugins.Docket;
import springfox.documentation.swagger2.annotations.EnableSwagger2;

@Configuration
@EnableSwagger2
public class SwaggerConfig {

    @Bean
    public Docket api() {
        return new Docket(DocumentationType.SWAGGER_2)
                .select()
                .apis(RequestHandlerSelectors.basePackage("com.example.yourpackage")) // 替换为你的包名
                .paths(PathSelectors.any())
                .build()
                .apiInfo(apiInfo());
    }

    private ApiInfo apiInfo() {
        return new ApiInfoBuilder()
                .title("API 文档标题")
                .description("API 文档描述")
                .version("1.0")
                .build();
    }
}
```

### 深度配置

#### swagger2 配置属性实体

```java
package com.xiaoye.swagger2;

import com.xiaoye.core.constants.Constants;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * @author zhangzhengyang
 * @ClassName com.xiaoye.swagger2
 * @description swagger2配置属性实体
 */
@Data
@Component
@ConfigurationProperties(prefix = "swagger2")
public class Swagger2ConfigProperties {

    private boolean show = true;

    private String groupName = "pan";

    private String basePackage = Constants.BASE_COMPONENT_SCAN_PATH;

    private String title = "pan-server";

    private String description = "pan-server";

    private String termsOfServiceUrl = "http://127.0.0.1:${server.port}";

    private String contactName = "zhangzhengyang";

    private String contactUrl = "https://www.zhangzhengyang.com";

    private String contactEmail = "1074385735@qq.com";

    private String version = "1.0";
}
```

配置类

```java
package com.xiaoye.swagger2;

import com.github.xiaoymin.swaggerbootstrapui.annotations.EnableSwaggerBootstrapUI;
import com.xiaoye.core.constants.Constants;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;
import springfox.documentation.builders.ApiInfoBuilder;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.builders.RequestHandlerSelectors;
import springfox.documentation.service.ApiInfo;
import springfox.documentation.service.Contact;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spring.web.plugins.Docket;
import springfox.documentation.swagger2.annotations.EnableSwagger2;

/**
 * @author zhangzhengyang
 * @ClassName com.xiaoye.swagger2
 * @description swagger2配置类
 */
@SpringBootConfiguration
@EnableSwagger2
@EnableSwaggerBootstrapUI
@Slf4j
public class Swagger2Config {

  @Autowired
  private Swagger2ConfigProperties properties;

  @Bean
  public Docket panServerApi() {
    Docket docket = new Docket(DocumentationType.SWAGGER_2)
      .enable(properties.isShow())
      .groupName(properties.getGroupName())
      .apiInfo(apiInfo())
      .useDefaultResponseMessages(false)
      .select()
      .apis(RequestHandlerSelectors.basePackage(properties.getBasePackage()))
      .paths(PathSelectors.any())
      .build();
    log.info("The swagger2 have been loaded successfully!");
    return docket;
  }

  private ApiInfo apiInfo() {
    return new ApiInfoBuilder()
      .title(properties.getTitle())
      .description(properties.getDescription())
      .termsOfServiceUrl(properties.getTermsOfServiceUrl())
      .contact(new Contact(properties.getContactName(), properties.getContactUrl(), properties.getContactEmail()))
      .version(properties.getVersion())
      .build();
  }
}
```

#### 配置元数据文件

spring-boot-configuration-processor 主要用于处理和生成 Spring Boot 的配置元数据文件。文件通常命名为 spring-configuration-metadata.json，它包含了项目中所有 @ConfigurationProperties 注解的类的信息。配置元数据文件主要用于以下两个目的：

1. 提供给 IDE 以便在编辑 application.properties 或 application.yml 文件时，能够提供自动完成和验证功能
2. 提供给 Spring Boot Actuator 的 /configprops 端点，以便显示配置属性的当前状态

如果项目中使用了 @ConfigurationProperties 注解，添加 spring-boot-configuration-processor 依赖会非常有用

```xml
<!-- 版本跟随 springboot -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-configuration-processor</artifactId>
</dependency>
```

resources/META-INF/additional-spring-configuration-metadata.json

```json
{
  "properties": [
    {
      "name": "swagger2.show",
      "type": "java.lang.Boolean",
      "description": "是否展示接口文档",
      "defaultValue": true
    },
    {
      "name": "swagger2.group-name",
      "type": "java.lang.String",
      "description": "组名称",
      "defaultValue": "pan"
    },
    {
      "name": "swagger2.title",
      "type": "java.lang.String",
      "description": "接口文档标题",
      "defaultValue": "pan-server"
    },
    {
      "name": "swagger2.description",
      "type": "java.lang.String",
      "description": "接口文档描述",
      "defaultValue": "pan-server"
    },
    {
      "name": "swagger2.terms-of-service-url",
      "type": "java.lang.String",
      "description": "接口文档基础请求路径",
      "defaultValue": "http://127.0.0.1:${server.port}"
    },
    {
      "name": "swagger2.base-package",
      "type": "java.lang.String",
      "description": "接口文档基础接口扫描路径",
      "defaultValue": "com.xiaoye"
    },
    {
      "name": "swagger2.contact-name",
      "type": "java.lang.String",
      "description": "联系人名称",
      "defaultValue": "zhangzhengyang"
    },
    {
      "name": "swagger2.contact-url",
      "type": "java.lang.String",
      "description": "联系人地址",
      "defaultValue": "https://www.zhangzhengyang.com"
    },
    {
      "name": "swagger2.contact-email",
      "type": "java.lang.String",
      "description": "联系人邮箱",
      "defaultValue": "1074385735@qq.com"
    },
    {
      "name": "swagger2.version",
      "type": "java.lang.String",
      "description": "项目版本",
      "defaultValue": "1.0"
    }
  ]
}
```

在 application.yaml 添加配置

```yaml
# swagger2 配置
swagger2:
  show: true
  group-name: ${spring.application.name}
  base-package: com.xiaoye
  title: pan-server docs
  description: pan-server docs
  terms-of-service-url: http://127.0.0.1:${server.port}
  contact-name: zhangzhengyang
  contact-url: https://www.zhangzhengyang.com
  contact-email: 1074385735@qq.com
  version: 1.0
```

## 标注你的控制器

在控制器类和方法上添加 Swagger 的注解来生成文档

```java
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Api(value = "测试接口", tags = "测试接口")
public class TestController {

    @GetMapping("/hello")
    @ApiOperation(value = "Hello 接口", notes = "返回 Hello World")
    public String hello() {
        return "Hello World";
    }
}
```

## 配置更多选项（可选）

你可以根据需要配置更多的 Swagger 选项，例如设置全局参数、响应消息、API 分组等。

### 配置全局参数

```java
@Bean
public Docket api() {
  ParameterBuilder parameterBuilder = new ParameterBuilder();
  List<Parameter> parameters = new ArrayList<>();
  parameterBuilder.name("Authorization")
    .description("Bearer token")
    .modelRef(new ModelRef("string"))
    .parameterType("header")
    .required(false)
    .build();
  parameters.add(parameterBuilder.build());

  return new Docket(DocumentationType.SWAGGER_2)
    .select()
    .apis(RequestHandlerSelectors.basePackage("com.example.yourpackage")) // 替换为你的包名
    .paths(PathSelectors.any())
    .build()
    .globalOperationParameters(parameters)
    .apiInfo(apiInfo());
}
```

### 配置 API 分组

```java
@Bean
public Docket apiV1() {
  return new Docket(DocumentationType.SWAGGER_2)
    .groupName("v1")
    .select()
    .apis(RequestHandlerSelectors.basePackage("com.example.yourpackage.v1")) // 替换为你的包名
    .paths(PathSelectors.any())
    .build()
    .apiInfo(apiInfo());
}

@Bean
public Docket apiV2() {
  return new Docket(DocumentationType.SWAGGER_2)
    .groupName("v2")
    .select()
    .apis(RequestHandlerSelectors.basePackage("com.example.yourpackage.v2")) // 替换为你的包名
    .paths(PathSelectors.any())
    .build()
    .apiInfo(apiInfo());
}
```

## 使用 springdoc-openapi（Spring Boot 3.5.x 推荐）

springdoc-openapi 是 Swagger2（springfox）的官方替代方案，基于 **OpenAPI 3** 标准，自动生成 API 文档，完全兼容 Spring Boot 3.x（jakarta）与 Java 17/21。

### 添加依赖

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.8.6</version>
</dependency>
```

无需任何配置类，启动后即可访问：

- Swagger UI：`http://localhost:8080/swagger-ui.html`
- OpenAPI JSON：`http://localhost:8080/v3/api-docs`

### 常用配置（application.yml）

```yaml
springdoc:
  api-docs:
    path: /v3/api-docs   # JSON 路径
  swagger-ui:
    path: /swagger-ui.html
    persist-authorization: true
  packages-to-scan: com.example.api   # 可选：限定扫描包
  paths-to-match: /api/**             # 可选：限定路径
```

### 注解差异（Swagger2 → OpenAPI 3）

| Swagger2（本文旧解） | springdoc/OpenAPI 3 |
|----------------------|---------------------|
| @Api | @Tag |
| @ApiOperation | @Operation |
| @ApiParam | @Parameter |
| @ApiModel | @Schema |
| @ApiModelProperty | @Schema(description = ...) |

```java
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api")
@Tag(name = "测试接口", description = "测试接口")
public class TestController {

    @GetMapping("/hello")
    @Operation(summary = "Hello 接口", description = "返回 Hello World")
    public String hello() {
        return "Hello World";
    }
}
```

> 若需要 Knife4j 增强 UI（类似 swagger-bootstrap-ui），引入 `com.github.xiaoymin:knife4j-openapi3-jakarta-spring-boot-starter`（4.x）即可。

## 版本差异(Swagger2 → springdoc-openapi)

| 特性 | 旧版（springfox Swagger2） | 当前（springdoc-openapi 2.8.x） |
|------|---------------------------|--------------------------------|
| 维护状态 | 已停止维护（2020 年后无更新） | 活跃维护 |
| Spring Boot 3 兼容 | 不兼容（javax） | 完全兼容（jakarta） |
| 规范 | Swagger 2.0 | OpenAPI 3（主流标准） |
| 配置方式 | @EnableSwagger2 + Docket | 零配置，依赖即用 |
| 注解 | io.swagger.annotations.* | io.swagger.v3.oas.annotations.* |
| 增强 UI | swagger-bootstrap-ui | Knife4j 4.x（openapi3） |
