---
title: "SpringBoot文件上传与Multipart"
description: "Spring Boot 文件上传：MultipartFile 接收、单/多文件与进度、大小限制配置、异常兜底与本地/对象存储落盘实战。"
keywords: ["文件上传", "MultipartFile", "multipart", "大小限制", "对象存储"]
category: "Java"
tags: [Java, SpringBoot]
---

# Spring Boot 文件上传与 Multipart

文件上传是 Web 应用的基础能力。Spring Boot 基于 Servlet 3.0 的 `Multipart` 规范，用 `MultipartFile` 抽象屏蔽了底层解析细节，既支持简单表单上传，也能配合流式处理大文件。本篇覆盖接收、配置、限制与落盘全流程。

:::: tip 版本基准
本文档以 **Spring Boot 3.x** 为主。文件上传由 `MultipartAutoConfiguration` 自动装配 `StandardServletMultipartResolver`（基于 Servlet 容器原生能力），无需额外依赖。
::::

## 一、基础接收

### 1.1 单文件

```java
@PostMapping("/upload")
public ResponseEntity<String> upload(@RequestParam("file") MultipartFile file) {
    if (file.isEmpty()) {
        return ResponseEntity.badRequest().body("文件为空");
    }
    String filename = file.getOriginalFilename();
    long size = file.getSize();
    return ResponseEntity.ok("收到文件：" + filename + "，大小：" + size);
}
```

### 1.2 多文件与混合字段

```java
@PostMapping("/batch")
public ResponseEntity<List<String>> batch(
        @RequestParam("files") List<MultipartFile> files,
        @RequestParam("dir") String dir) {
    return ResponseEntity.ok(files.stream()
            .map(MultipartFile::getOriginalFilename)
            .toList());
}
```

### 1.3 绑定到对象

```java
public class UploadForm {
    private String bizType;
    private MultipartFile file;
    // getter/setter
}

@PostMapping("/form")
public ResponseEntity<Void> form(@Valid UploadForm form, BindingResult result) {
    // form.getFile() 即上传文件
    return ResponseEntity.ok().build();
}
```

## 二、落盘：本地与对象存储

### 2.1 本地落盘（注意安全）

```java
public void saveLocal(MultipartFile file) throws IOException {
    // 防路径穿越：只取文件名，去掉路径
    String name = StringUtils.getFilename(file.getOriginalFilename());
    Path dest = Paths.get("/data/uploads", name);
    Files.createDirectories(dest.getParent());
    file.transferTo(dest);   // 推荐，比 getBytes() 更省内存
}
```

::: danger 防路径穿越
`getOriginalFilename()` 可能包含 `../../` 等路径片段。务必用 `StringUtils.getFilename()`（或自行截断目录部分）只保留纯文件名，避免写入任意路径造成覆盖或 RCE。
:::

### 2.2 上传到对象存储（OSS/S3）

```java
public void saveToOss(MultipartFile file) {
    String key = "uploads/" + UUID.randomUUID() + "-" + file.getOriginalFilename();
    s3Client.putObject(PutObjectRequest.builder()
        .bucket("my-bucket").key(key).build(),
        RequestBody.fromBytes(file.getBytes()));   // 大文件改用 InputStream
}
```

## 三、大小限制与配置

`application.yml`：

```yaml
spring:
  servlet:
    multipart:
      enabled: true
      max-file-size: 10MB        # 单个文件上限
      max-request-size: 50MB     # 整个请求上限
      file-size-threshold: 2KB   # 超过则写临时文件而非内存
      location: /tmp/uploads      # 临时目录
```

超限时抛出 `MaxUploadSizeExceededException`，用全局异常处理返回友好提示：

```java
@ExceptionHandler(MaxUploadSizeExceededException.class)
public ResponseEntity<Map<String,String>> handleTooLarge(MaxUploadSizeExceededException e) {
    return ResponseEntity.status(413).body(Map.of("error", "文件超过大小限制"));
}
```

## 四、进度与流式（大文件）

对超大文件，避免 `getBytes()` 全量入内存，用 `InputStream` 流式转发：

```java
public void stream(MultipartFile file) throws IOException {
    try (InputStream in = file.getInputStream()) {
        // 边读边写/上传，控制内存占用
        IOUtils.copy(in, targetStream);
    }
}
```

上传进度需前端配合（如分片 + 自定义进度回调），后端 `MultipartFile` 不直接提供进度百分比。

## 五、常见陷阱

| 陷阱 | 表现 | 解决 |
|------|------|------|
| 413 被网关拦 | 文件没到 Controller | 网关（Nginx）也有限制，需同步调整 `client_max_body_size` |
| 路径穿越 | 覆盖系统文件 | 用 `StringUtils.getFilename()` 规范化文件名 |
| 内存溢出 | 大文件 `getBytes()` | 用 `transferTo` / `getInputStream` 流式处理 |
| 中文名乱码 | 文件名乱码 | 前端 `Content-Type` 带 `charset=utf-8`，或后端 `new String(name.getBytes(ISO_8859_1), UTF_8)` 兜底 |
| 临时文件堆积 | 磁盘占满 | 确认 `location` 有清理策略，或用对象存储直传 |
| 无 @RequestParam 名 | 绑定失败 | 参数名需与表单字段名一致，或显式指定 `@RequestParam("file")` |

## 六、小结

Spring Boot 文件上传核心是 `MultipartFile`：单/多文件用 `@RequestParam` 接收，落盘优先 `transferTo`（大文件走 `InputStream` 流式），并用 `spring.servlet.multipart` 配置大小上限。务必做文件名规范化防路径穿越、超大文件流式处理，并在网关与应用两层都放开大小限制。

**相关阅读**：全局异常处理机制见 [Java 异常深度处理](05-Java异常深度处理)；请求处理链路见 [Spring MVC 请求处理流程](25-WebMvc请求处理流程源码)。

## 版本差异(旧版 → Spring Boot 3.5.x)

| 特性 | 旧版(Spring Boot 2.x) | Spring Boot 3.5.x |
|------|----------------------|-------------------|
| MultipartFile | javax.servlet.* | jakarta.servlet.http.*（包名迁移） |
| 上传配置 | spring.servlet.multipart | 不变；属性名保持兼容 |
| 大文件 | 手动流式 | 不变；支持虚拟线程并发上传 |
| 存储 | 本地磁盘 | 不变；可集成 OSS/MinIO |
