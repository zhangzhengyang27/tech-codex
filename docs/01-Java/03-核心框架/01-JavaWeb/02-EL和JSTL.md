---
title: "EL和JSTL"
description: "EL（Expression Language）表达式提供了在 JSP 中简化表达式的方法，可以方便地访问各种数据并输出"
keywords: [EL和JSTL]
category: "Java"
tags: [Java, JavaWeb]
---


# EL 和 JSTL 核心技术

## EL 表达式

EL（Expression Language）表达式提供了在 JSP 中简化表达式的方法，可以方便地访问各种数据并输出

### 主要功能

- 依次访问 pageContext、request、session 和 application 作用域对象存储的数据

- 获取请求参数值

- 访问 Bean 对象的属性

- 访问集合中的数据

- 输出简单的运算结果

### 访问内置对象的数据

（1）访问方式

- `<%=request.getAttribute("varName")%>`

- 用EL实现:`${ varName }`

（2）执行流程


```jsp
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>实现从内置对象中获取数据并打印</title>
</head>
<body>
<%
    pageContext.setAttribute("name1", "pageContext对象中的属性值：zhangfei");
    request.setAttribute("name2", "request对象中的属性值：guanyu");
    session.setAttribute("name3", "session对象中的属性值：liubei");
    application.setAttribute("name4", "session对象中的属性值：zhaoyun");
    pageContext.setAttribute("name", "pageContext对象中的属性值：zhangfei");
    request.setAttribute("name", "request对象中的属性值：guanyu");
    session.setAttribute("name", "session对象中的属性值：liubei");
    application.setAttribute("name", "session对象中的属性值：zhaoyun");
%>

使用JSP中原始方式获取数据和打印
<%= "name1的数值为：" + pageContext.getAttribute("name1") %><br/>
<%= "name2的数值为：" + request.getAttribute("name2") %><br/>
<%= "name3的数值为：" + session.getAttribute("name3") %><br/>
<%= "name4的数值为：" + application.getAttribute("name4") %><br/>
  
使用EL表达式实现获取数据和打印
name1的数值为：${name1}<br/>
name2的数值为：${name2}<br/>
name3的数值为：${name3}<br/>
name4的数值为：${name4}<br/>
<h1>name的数值为：${name}</h1><br/>

</body>
</html>
```


### 访问请求参数的数据

在 EL 之前使用下列方式访问请求参数的数据

- request.getParameter(name)

- request.getParameterValues(name)

在 EL 中使用下列方式访问请求参数的数据

- param：接收的参数只有一个值

- paramValues：接受的参数有多个值

```jsp
<!-- 获取指定参数的数值 --> 
${param.name} 

<!-- 获取指定参数中指定下标的数值 --> 
${paramValues.hobby[0]}
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>实现一个简单页面负责向JSP页面传递参数</title>
</head>
<body>
<form action="el_param.jsp" method="post">
    姓名：<input type="text" name="name"/><br/>
    爱好：<input type="checkbox" name="hobby" value="唱歌"/>唱歌<br/>
         <input type="checkbox" name="hobby" value="跳舞"/>跳舞<br/>
         <input type="checkbox" name="hobby" value="学习"/>学习<br/>
    <input type="submit" value="提交"/><br/>
</form>
</body>
</html>
<%@ page import="java.util.Arrays" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>实现请求参数数值的获取</title>
</head>
<body>
<%
    request.setCharacterEncoding("utf-8");
%>
<%-- 使用JSP语法中的原始方式获取请求参数值 --%>
<%= "姓名是：" + request.getParameter("name") %><br/>
<%= "爱好是：" + Arrays.toString(request.getParameterValues("hobby")) %><br/>

<%-- 使用EL表达式中的方式获取请求参数值 --%>
姓名是：${param.name}<br/>
爱好是：${paramValues.hobby[0]}<br/>

</body>
</html>
```

### 访问 Bean 对象的属性



（1）访问方式

- 方式一： $ { 对象名 . 属性名 }，例如：${user.name}

- 方式二： $ { 对象名 [“属性名”] }，例如：${user["name"]}



（2）主要区别

- 当要存取的属性名中包含一些特殊字符，如：`.` 或 `,`等并非字母或数字的符号，就一定要使用`[ ]`

- 使用`[]`的方式可以动态取值

```jsp
<%@ page import="com.web5.demo01.Person" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>实现Bean对象中属性的获取和打印</title>
</head>
<body>
<%-- 使用JSP语法规则中的原始方式实现对象的创建和设置以及输出 --%>
<%
    Person person = new Person();
    person.setName("zhangfei");
    person.setAge(30);
    pageContext.setAttribute("person", person);

    pageContext.setAttribute("var1", "name");
    pageContext.setAttribute("var2", "age");
%>

<%= "获取到的姓名为：" + person.getName() %><br/>
<%= "获取到的年龄为：" + person.getAge()  %><br/>

 使用EL表达式实现属性的获取和打印
获取到的姓名是：${person.name}<br/>
获取到的年龄是：${person.age}<br/>
 另外一种写法
${person["name"]}<br/>
${person["age"]}<br/>
<%-- 测试一下动态取值的效果 --%>
动态取值的结果为：${person[var1]}
</body>
</html>
```


### 访问集合中的数据

```jsp
<%@ page import="java.util.LinkedList" %>
<%@ page import="java.util.List" %>
<%@ page import="java.util.HashMap" %>
<%@ page import="java.util.Map" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>实现集合中数据内容的获取和打印</title>
</head>
<body>
<%
    // 准备一个List集合并添加数据内容
    List<String> list = new LinkedList<>();
    list.add("two");
    list.add("one");
    list.add("three");
    pageContext.setAttribute("list", list);

    // 准备一个Map集合并添加数据
    Map<String, Integer> map = new HashMap<>();
    map.put("one", 1);
    map.put("two", 2);
    map.put("th.ree", 3);
    pageContext.setAttribute("map", map);
%>

<%-- 使用EL表达式实现集合中数据内容的获取 --%>
集合中下标为0的元素是：${list[0]}<br/> <%-- two --%>
集合中下标为1的元素是：${list[1]}<br/> <%-- one --%>
集合中下标为2的元素是：${list[2]}<br/> <%-- three --%>
<hr/>
<%-- 使用EL表达式实现Map集合中数据内容的获取 不支持下标 --%>
整个Map集合中的元素有：${map}<br/>
获取带有特殊字符key对应的数值为：${map["th.ree"]}<br/> <%-- 3 --%>
</body>
</html>
```


## EL 常用的内置对象

| 类别       | 标识符           | 描述                                                  |
| ---------- | ---------------- | ----------------------------------------------------- |
| JSP        | pageContext      | PageContext 处理当前页面                              |
| 作用域     | pageScope        | 同页面作用域属性名称和值有关的 Map 类                 |
|            | requestScope     | 同请求作用域属性的名称和值有关的 Map 类               |
|            | sessionScope     | 同会话作用域属性的名称和值有关的 Map 类               |
|            | applicationScope | 同应用程序作用域属性的名称和值有关的Map类             |
| 请求参数   | param            | 根据名称存储请求参数的值的 Map 类                     |
|            | paramValues      | 把请求参数的所有值作为一个 String 数组来存储的 Map 类 |
| 请求头     | header           | 根据名称存储请求头主要值的 Map 类                     |
|            | headerValues     | 把请求头的所有值作为一个 String 数组来存储的 Map 类   |
| Cookie     | cookie           | 根据名称存储请求附带的 cookie 的 Map 类               |
| 初始化参数 | initParam        | 根据名称存储 Web 应用程序上下文初始化参数的Map类      |

## EL 常用的运算符

### 算术运算符

| 运算符 | 说明 | 示例（ia=5, ib=2） |
| ------ | ---- | ------------------ |
| `+`    | 加   | `${ia+ib}` 结果 7  |
| `-`    | 减   | `${ia-ib}` 结果 3  |
| `*`    | 乘   | `${ia*ib}` 结果 10 |
| `/` 或 `div` | 除（结果为浮点数） | `${ia/ib}` 结果 2.5 |
| `%` 或 `mod` | 取模 | `${ia%ib}` 结果 1  |

### 常用的关系运算符

| 运算符 | 说明 | 示例（ia=5, ib=2） |
| ------ | ---- | ------------------ |
| `==` 或 `eq` | 等于 | `${ia == ib}` 结果 false |
| `!=` 或 `ne` | 不等于 | `${ia != ib}` 结果 true |
| `<` 或 `lt` | 小于 | `${ia < ib}` 结果 false |
| `<=` 或 `le` | 小于等于 | `${ia <= ib}` 结果 false |
| `>` 或 `gt` | 大于 | `${ia > ib}` 结果 true |
| `>=` 或 `ge` | 大于等于 | `${ia >= ib}` 结果 true |

### 常用的逻辑运算符

| 运算符 | 说明 | 示例（b1=true, b2=false） |
| ------ | ---- | ------------------------- |
| `&&` 或 `and` | 与 | `${b1 && b2}` 结果 false |
| `\|\|` 或 `or` | 或 | `${b1 \|\| b2}` 结果 true |
| `!` 或 `not` | 非 | `${!b1}` 结果 false |

### 条件运算符

```xml
${条件表达式? 语句1 : 语句2}
```

### 验证运算符

```jsp
${empty 表达式} 
返回布尔值判断表达式是否为"空"值，null值、无元素的集合或数组、长度为零的String被认为是空值。
<%@ page import="java.util.List" %>
<%@ page import="java.util.LinkedList" %>
<%@ page import="java.util.Arrays" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>实现常用运算符的使用</title>
</head>
<body>
<%
    // 通过内置对象设置属性的方式来准备操作数
    request.setAttribute("ia", 5);
    request.setAttribute("ib", 2);
    request.setAttribute("b1", true);
    request.setAttribute("b2", false);
%>

<%-- 实现上述所有操作数的获取和打印 --%>
ia的数值为：${ia}<br/> <%-- 5 --%>
ib的数值为：${ib}<br/> <%-- 2 --%>
b1的数值为：${b1}<br/> <%-- true --%>
b2的数值为：${b2}<br/> <%-- false --%>
<hr/>

<%-- 实现算术运算符的使用 --%>
ia+ib的结果为：${ia+ib}<br/> <%-- 7 --%>
ia-ib的结果为：${ia-ib}<br/> <%-- 3 --%>
ia*ib的结果为：${ia*ib}<br/> <%-- 10 --%>
ia/ib的结果为：${ia/ib}<br/> <%-- 2.5 --%>
ia%ib的结果为：${ia%ib}<br/> <%-- 1 --%>
<hr/>

<%-- 实现关系运算符的使用 --%>
ia大于ib的结果为：${ia > ib}<br/> <%-- true --%>
ia大于等于ib的结果为：${ia >= ib}<br/> <%-- true --%>
ia小于ib的结果为：${ia < ib}<br/> <%-- false --%>
ia小于等于ib的结果为：${ia <= ib}<br/> <%-- false --%>
ia等于ib的结果为：${ia == ib}<br/> <%-- false --%>
ia不等于ib的结果为：${ia != ib}<br/> <%-- true --%>
<hr/>

<%-- 实现逻辑运算符的使用 --%>
b1并且b2的结果为：${b1 && b2}<br/> <%-- false --%>
b1或者b2的结果为：${b1 || b2}<br/> <%-- true --%>
b1取反的结果为：${ !b1 }<br/> <%-- false --%>
b2取反的结果为：${ !b2 }<br/> <%-- true --%>
<hr/>

<%
    String str1 = null;
    String str2 = "";
    String str3 = "hello";

    List<Integer> list1 = new LinkedList<>();
    List<Integer> list2 = Arrays.asList(11, 22, 33, 44, 55);

    request.setAttribute("str1", str1);
    request.setAttribute("str2", str2);
    request.setAttribute("str3", str3);
    request.setAttribute("list1", list1);
    request.setAttribute("list2", list2);

%>
<%-- 实现条件运算符和验证运算符的使用 --%>
ia和ib之间的最大值为：${ia>ib? ia: ib}<br/>
判断是否为空的结果是：${empty str1}<br/> <%-- true --%>
判断是否为空的结果是：${empty str2}<br/> <%-- true --%>
判断是否为空的结果是：${empty str3}<br/> <%-- false --%>
判断是否为空的结果是：${empty list1}<br/> <%-- true --%>
判断是否为空的结果是：${empty list2}<br/> <%-- false --%>

</body>
</html>
```


## JSTL 标签（熟悉）

JSTL( JSP Standard Tag Library ) 被称为 JSP 标准标签库

开发人员可以利用这些标签取代 JSP 页面上的 Java 代码，从而提高程序的可读性，降低程序的维护难度

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.example</groupId>
  <artifactId>webElJstl</artifactId>
  <version>1.0-SNAPSHOT</version>
  <name>webElJstl</name>
  <packaging>war</packaging>

  <properties>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <maven.compiler.target>1.8</maven.compiler.target>
    <maven.compiler.source>1.8</maven.compiler.source>
    <junit.version>5.8.2</junit.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>javax.servlet</groupId>
      <artifactId>javax.servlet-api</artifactId>
      <version>4.0.1</version>
      <scope>provided</scope>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter-api</artifactId>
      <version>${junit.version}</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter-engine</artifactId>
      <version>${junit.version}</version>
      <scope>test</scope>
    </dependency>

    <!-- jsp依赖-->
    <dependency>
      <groupId>javax.servlet.jsp</groupId>
      <artifactId>javax.servlet.jsp-api</artifactId>
      <version>2.3.3</version>
    </dependency>
    <!-- jstl表达式依赖-->
    <dependency>
      <groupId>javax.servlet.jsp.jstl</groupId>
      <artifactId>jstl-api</artifactId>
      <version>1.2</version>
    </dependency>
    <!-- taglibs 标签库依赖-->
    <dependency>
      <groupId>taglibs</groupId>
      <artifactId>standard</artifactId>
      <version>1.1.2</version>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-war-plugin</artifactId>
        <version>3.3.2</version>
      </plugin>
    </plugins>
  </build>
</project>
```

在 JSP 页面中使用 taglib 指定引入 jstl 标签库，方式为：

```jsp
<!-- prefix属性用于指定库前缀 --> 
<!-- uri属性用于指定库的标识 --> 
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>实现out输出标签的使用</title>
</head>
<body>
<c:out value="Hello World"></c:out>
</body>
</html>
```

### 输出标签

```jsp
<c:out></c:out> 用来将指定内容输出的标签
```

### 设置标签

```jsp
<c:set></c:set> 用来设置属性范围值的标签
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>实现set标签的使用</title>
</head>
<body>
<%-- 表示设置一个名字为name的属性，对应的数值为zhangfei，有效范围为：page --%>
<%-- pageContext.setAttribute("name", "zhangfei") --%>
<c:set var="name" value="zhangfei" scope="page"></c:set>
<%-- 使用out标签打印出来 --%>
<c:out value="${name}"></c:out>
<hr/>

<%-- 设置一个对象的属性值并打印出来 --%>
<jsp:useBean id="person" class="com.web5.demo01.Person" scope="page"></jsp:useBean>
<c:set property="name" value="guanyu" target="${person}"></c:set>
<c:set property="age" value="35" target="${person}"></c:set>
  
<c:out value="${person.name}"></c:out>
<c:out value="${person.age}"></c:out>

</body>
</html>
```


### 删除标签

```jsp
<c:remove></c:remove> 用来删除指定数据的标签
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>实现remove标签的使用</title>
</head>
<body>
<%-- 设置一个属性值并打印 --%>
<c:set var="name" value="liubei" scope="page"></c:set>
<c:out value="${name}"></c:out>
<hr/>

<%-- 删除这个属性值后再次打印 --%>
<c:remove var="name" scope="page"></c:remove>
<c:out value="${name}" default="无名"></c:out>

</body>
</html>
```


### 单条件判断标签 if

```jsp
<c:if test =“EL条件表达式”> 满足条件执行 </c:if >
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>实现if标签的使用</title>
</head>
<body>
<%-- 设置一个变量以及对应的数值 --%>
<c:set var="age" value="17" scope="page"></c:set>
<c:out value="${age}"></c:out>
<hr/>

<%-- 判断该年龄是否成年，若成年则提示已经成年了 --%>
<c:if test="${age >= 18}">
    <c:out value="已经成年了！"></c:out>
</c:if>

</body>
</html>
```

### 多条件判断标签 choose

```jsp
<c:choose > 
  <c:when test =“EL表达式”> 
    满足条件执行 
  </c:when>
  <c:otherwise> 
    不满足上述when条件时执行 
  </c:otherwise> 
</c:choose >
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>实现choose标签的使用</title>
</head>
<body>
<%-- 设置一个变量代表考试的成绩并指定数值 --%>
<c:set var="score" value="59" scope="page"></c:set>
<c:out value="${score}"></c:out>
<hr/>

<%-- 进行多条件判断和处理 --%>
<c:choose>
    <c:when test="${score > 60}">
        <c:out value="成绩不错，继续加油哦！"></c:out>
    </c:when>
    <c:when test="${score == 60}">
        <c:out value="60分万岁，多一份浪费！"></c:out>
    </c:when>
    <c:otherwise>
        <c:out value="革命尚未成功，同志仍需努力！"></c:out>
    </c:otherwise>
</c:choose>
</body>
</html>
```


### 循环标签 forEach

```jsp
<c:forEach var=“循环变量” items=“集合”> … </c:forEach>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>实现循环标签的使用</title>
</head>
<body>
<%
    // 准备一个数组并初始化
    String[] sArr = {"11", "22", "33", "44", "55"};
    pageContext.setAttribute("sArr", sArr);
%>

<%-- 使用循环标签遍历数组中的所有元素 --%>
<c:forEach var="ts" items="${sArr}">
    <c:out value="${ts}"></c:out>
</c:forEach>
<hr/>

<%-- 跳跃性遍历 间隔为2  也就是跳过一个遍历一个 --%>
<c:forEach var="ts" items="${sArr}" step="2">
    <c:out value="${ts}"></c:out>
</c:forEach>
<hr/>

<%-- 指定起始和结尾位置 从下标1开始到3结束，包含1和3--%>
<c:forEach var="ts" items="${sArr}" begin="1" end="3">
    <c:out value="${ts}"></c:out>
</c:forEach>

</body>
</html>
```


## JSTL 常用函数标签

```jsp
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>

<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>实现常用函数标签的使用</title>
</head>
<body>
<%
    pageContext.setAttribute("var", "Hello World!");
%>
原始字符串为：${var}<br/>    <%-- HelloWorld --%>
判断该字符串是否包含指定字符串的结果为：${fn:contains(var, "Hello")}<br/>   <%-- true --%>
将字符串中所有字符转换为大写的结果为：${fn:toUpperCase(var)}<br/>           <%-- HELLO WORLD!--%>
将字符串中所有字符转换为小写的结果为：${fn:toLowerCase(var)}<br/>           <%-- hello world!--%>
</body>
</html>
```


## JSTL 常用格式化标签

```jsp
<%@ page import="java.util.Date" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>实现格式标签的使用</title>
</head>
<body>
<%
    // 获取当前系统时间
    Date date = new Date();
    pageContext.setAttribute("date", date);
%>

当前系统时间为：${date}
<hr/>
<fmt:formatDate value="${date}" pattern="yyyy-MM-dd HH:mm:ss"></fmt:formatDate>
</body>
</html>
```

## 自定义标签

- 如果上面几个标签不能满足需求，程序员也可以自定义标签，步骤如下：

- 编写标签类继承 SimpleTagSupport 类或 TagSupport 类并重写 doTag 方法或 doStartTag 方法

```java
package com.web5.demo01;

import javax.servlet.jsp.JspException;
import javax.servlet.jsp.JspWriter;
import javax.servlet.jsp.tagext.SimpleTagSupport;
import java.io.IOException;

public class HelloTag extends SimpleTagSupport {
    private String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @Override
    public void doTag() throws JspException, IOException {
        // 获取输出流
        JspWriter out = this.getJspContext().getOut();
        // 写入数据到浏览器
        out.write("自定义标签哦！" + name);
        // 关闭流对象
        out.close();
    }
}
```

定义标签库文件（ tld 标签库文件）并配置标签说明文件到 WEB-INF 下：

```xml
<?xml version="1.0" encoding="ISO-8859-1"?>

<taglib xmlns="http://java.sun.com/xml/ns/javaee"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://java.sun.com/xml/ns/javaee http://java.sun.com/xml/ns/javaee/web-jsptaglibrary_2_1.xsd"
        version="2.1">

    <tlib-version>1.0</tlib-version>
    <short-name>my</short-name>
    <uri>http://zhangzhengyang.com</uri>

    <!-- Invoke 'Generate' action to add tags or functions -->
    <tag>
        <name>hello</name>
        <tag-class>com.web5.demo01.HelloTag</tag-class>
        <body-content>empty</body-content>
        <attribute>
            <name>name</name>
            <required>true</required>
        </attribute>
    </tag>
</taglib>
```

在 JSP 中添加 taglib 指令引入标签库使用：

```jsp
<%@ taglib prefix="my" uri="http://zhangzhengyang.com" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>实现自定义标签的使用</title>
</head>
<body>
<my:hello name="zhangfei"/>
</body>
</html>
```


## EL 表达式深入解析

### EL 表达式工作原理

#### 解析和执行流程

```
JSP 页面中的 ${expression}
         ↓
┌─────────────────────┐
│  JSP 编译器解析     │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  转换为 Java 代码   │ pageContext.findAttribute()
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  依次查找作用域     │ page → request → session → application
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  返回找到的值       │ 找不到返回 null(显示为空字符串)
└─────────────────────┘
```

#### 与 JSP 脚本的区别

```jsp
<!-- 传统 JSP 方式 -->
<%= request.getAttribute("user") != null ? request.getAttribute("user") : "" %>

<!-- EL 表达式 -->
${user}

<!-- EL 更简洁,自动处理 null -->
```

### EL 表达式高级用法

#### 1. 访问嵌套对象属性

```jsp
<%
    User user = new User();
    Address address = new Address();
    address.setCity("北京");
    user.setAddress(address);
    pageContext.setAttribute("user", user);
%>

<!-- 访问嵌套属性 -->
${user.address.city}  <!-- 北京 -->

<!-- 安全访问(自动处理 null) -->
${user.address.street}  <!-- 如果 street 为 null,显示空字符串,不报错 -->
```

#### 2. 访问数组元素

```jsp
<%
    String[] cities = {"北京", "上海", "广州"};
    pageContext.setAttribute("cities", cities);
%>

<!-- 通过下标访问 -->
${cities[0]}  <!-- 北京 -->
${cities[1]}  <!-- 上海 -->
${cities[2]}  <!-- 广州 -->
```

#### 3. 访问 List 集合

```jsp
<%
    List<String> names = new ArrayList<>();
    names.add("张三");
    names.add("李四");
    names.add("王五");
    pageContext.setAttribute("names", names);
%>

<!-- 通过下标访问 -->
${names[0]}  <!-- 张三 -->
${names[1]}  <!-- 李四 -->

<!-- 获取集合大小 -->
${names.size()}  <!-- EL 2.2+ 已支持方法调用,返回 3;更早期的 EL 会报错 -->

<!-- 更通用、版本兼容性更好的写法是使用 JSTL 函数 -->
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
${fn:length(names)}  <!-- 3 -->
```

#### 4. 访问 Map 集合

```jsp
<%
    Map<String, Object> user = new HashMap<>();
    user.put("name", "张三");
    user.put("age", 25);
    user.put("city", "北京");
    pageContext.setAttribute("user", user);
%>

<!-- 通过 key 访问 -->
${user.name}       <!-- 张三 -->
${user["age"]}     <!-- 25 -->

<!-- 动态 key -->
<c:set var="key" value="city" />
${user[key]}       <!-- 北京 -->

<!-- 包含特殊字符的 key -->
<%
    user.put("user.name", "李四");
%>
${user["user.name"]}  <!-- 李四 -->
```

### EL 3.0 新特性

#### 1. 字符串拼接

```jsp
<!-- EL 3.0 之前 -->
${'Hello, '}${user.name}

<!-- EL 3.0+ -->
${'Hello, ' += user.name}
```

#### 2. 赋值操作

```jsp
<!-- EL 3.0+ 支持赋值 -->
<c:set var="x" value="${10}"/>
${x = 20}  <!-- x 现在是 20 -->
${x}       <!-- 20 -->
```

#### 3. 分号操作符

```jsp
<!-- 一行执行多个表达式 -->
${x = 10; y = 20; x + y}  <!-- 30 -->
```

#### 4. Lambda 表达式

```jsp
<!-- EL 3.0+ 支持 Lambda -->
${(x -> x + 1)(5)}  <!-- 6 -->

<!-- 在集合上使用 -->
<%
    List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);
    pageContext.setAttribute("numbers", numbers);
%>
${numbers.stream().filter(x -> x > 2).toList()}  <!-- [3, 4, 5] -->
```

#### 5. 静态方法调用

```jsp
<!-- EL 3.0+ 可以调用静态方法 -->
<%@ page import="java.lang.Math" %>
${Math.PI}           <!-- 3.14159... -->
${Math.sqrt(16)}     <!-- 4.0 -->
${Math.max(10, 20)}  <!-- 20 -->
```

## JSTL 深入讲解

### JSTL 核心标签库详解

#### 1. <c:if> 标签高级用法

```jsp
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<!-- 基本用法 -->
<c:if test="${user.age >= 18}">
    <p>成年人</p>
</c:if>

<!-- 使用 var 存储结果 -->
<c:if test="${user.score >= 60}" var="passed" />
<c:out value="${passed ? '及格' : '不及格'}" />

<!-- 使用 scope 指定作用域 -->
<c:if test="${user != null}" var="hasUser" scope="session" />
```

#### 2. <c:choose> 标签完整用法

```jsp
<c:set var="score" value="${85}" />

<c:choose>
    <c:when test="${score >= 90}">
        <span style="color: green">优秀</span>
    </c:when>
    <c:when test="${score >= 80}">
        <span style="color: blue">良好</span>
    </c:when>
    <c:when test="${score >= 70}">
        <span style="color: orange">中等</span>
    </c:when>
    <c:when test="${score >= 60}">
        <span style="color: gray">及格</span>
    </c:when>
    <c:otherwise>
        <span style="color: red">不及格</span>
    </c:otherwise>
</c:choose>
```

#### 3. <c:forEach> 标签高级用法

```jsp
<!-- 遍历集合 -->
<c:forEach var="user" items="${userList}" varStatus="status">
    <tr>
        <td>${status.count}</td>              <!-- 行号从1开始 -->
        <td>${status.index}</td>              <!-- 下标从0开始 -->
        <td>${user.name}</td>
        <td>${user.age}</td>
        <td>${status.first ? '第一行' : ''}</td>   <!-- 是否第一行 -->
        <td>${status.last ? '最后一行' : ''}</td>   <!-- 是否最后一行 -->
    </tr>
</c:forEach>

<!-- 遍历 Map -->
<c:forEach var="entry" items="${userMap}">
    <p>${entry.key}: ${entry.value}</p>
</c:forEach>

<!-- 指定范围遍历 -->
<c:forEach var="i" begin="1" end="10" step="2">
    ${i}  <!-- 1, 3, 5, 7, 9 -->
</c:forEach>

<!-- 分隔符 -->
<c:forEach var="tag" items="${tags}" varStatus="status">
    ${tag}${not status.last ? ', ' : ''}
</c:forEach>
```

#### 4. <c:forTokens> 标签

```jsp
<!-- 分割字符串 -->
<c:set var="colors" value="red,green,blue,yellow" />
<c:forTokens var="color" items="${colors}" delims=",">
    <span style="color: ${color}">${color}</span>
</c:forTokens>
```

#### 5. <c:url> 标签

```jsp
<!-- 生成 URL,自动添加 context path -->
<c:url value="/user/list" var="listUrl" />

<!-- 带参数 -->
<c:url value="/user/detail" var="detailUrl">
    <c:param name="id" value="${user.id}" />
    <c:param name="name" value="${user.name}" />
</c:url>

<!-- URL 重写(自动添加 jsessionid) -->
<a href="<c:url value='/login' />">登录</a>
```

#### 6. <c:import> 标签

```jsp
<!-- 导入外部资源 -->
<c:import url="/header.jsp" />

<!-- 导入并存储到变量 -->
<c:import url="/footer.jsp" var="footer" />
${footer}

<!-- 导入外部网站 -->
<c:import url="https://example.com/api/data" var="data" />
${data}
```

#### 7. <c:redirect> 标签

```jsp
<!-- 重定向 -->
<c:redirect url="/login.jsp" />

<!-- 带参数重定向 -->
<c:redirect url="/user/detail">
    <c:param name="id" value="${userId}" />
</c:redirect>
```

### JSTL 格式化标签库详解

#### 1. 数字格式化

```jsp
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<%
    pageContext.setAttribute("price", 12345.6789);
    pageContext.setAttribute("percent", 0.856);
%>

<!-- 格式化数字 -->
<fmt:formatNumber value="${price}" />  <!-- 12,345.679 -->

<!-- 指定小数位数 -->
<fmt:formatNumber value="${price}" maxFractionDigits="2" />  <!-- 12,345.68 -->

<!-- 货币格式 -->
<fmt:formatNumber value="${price}" type="currency" />  <!-- ¥12,345.68 -->

<!-- 百分比格式 -->
<fmt:formatNumber value="${percent}" type="percent" />  <!-- 86% -->

<!-- 自定义模式 -->
<fmt:formatNumber value="${price}" pattern="#,##0.00" />  <!-- 12,345.68 -->

<!-- 存储到变量 -->
<fmt:formatNumber value="${price}" var="formattedPrice" />
${formattedPrice}
```

#### 2. 日期格式化

```jsp
<%
    pageContext.setAttribute("now", new java.util.Date());
%>

<!-- 格式化日期 -->
<fmt:formatDate value="${now}" />  <!-- 2026-03-30 -->

<!-- 格式化日期时间 -->
<fmt:formatDate value="${now}" type="both" />  <!-- 2026-03-30 14:30:25 -->

<!-- 只显示日期 -->
<fmt:formatDate value="${now}" type="date" />  <!-- 2026-03-30 -->

<!-- 只显示时间 -->
<fmt:formatDate value="${now}" type="time" />  <!-- 14:30:25 -->

<!-- 自定义格式 -->
<fmt:formatDate value="${now}" pattern="yyyy年MM月dd日 HH:mm:ss" />

<!-- 存储到变量 -->
<fmt:formatDate value="${now}" var="formattedDate" pattern="yyyy-MM-dd" />
${formattedDate}
```

#### 3. 国际化

```jsp
<!-- 设置地区 -->
<fmt:setLocale value="zh_CN" />

<!-- 设置时区 -->
<fmt:setTimeZone value="Asia/Shanghai" />

<!-- 指定地区格式化 -->
<fmt:formatNumber value="${price}" type="currency" locale="en_US" />  <!-- $12,345.68 -->
<fmt:formatNumber value="${price}" type="currency" locale="zh_CN" />  <!-- ¥12,345.68 -->
```

### JSTL 函数标签库详解

```jsp
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>

<%
    pageContext.setAttribute("str", "Hello World");
    pageContext.setAttribute("list", Arrays.asList("a", "b", "c"));
%>

<!-- 字符串长度 -->
${fn:length(str)}      <!-- 11 -->
${fn:length(list)}     <!-- 3 -->

<!-- 大小写转换 -->
${fn:toUpperCase(str)}  <!-- HELLO WORLD -->
${fn:toLowerCase(str)}  <!-- hello world -->

<!-- 包含判断 -->
${fn:contains(str, 'World')}          <!-- true -->
${fn:containsIgnoreCase(str, 'world')} <!-- true -->

<!-- 前缀后缀判断 -->
${fn:startsWith(str, 'Hello')}  <!-- true -->
${fn:endsWith(str, 'World')}    <!-- true -->

<!-- 查找位置 -->
${fn:indexOf(str, 'o')}      <!-- 4 -->
${fn:indexOf(str, 'x')}      <!-- -1 -->

<!-- 截取字符串 -->
${fn:substring(str, 0, 5)}              <!-- Hello -->
${fn:substringAfter(str, ' ')}          <!-- World -->
${fn:substringBefore(str, ' ')}         <!-- Hello -->

<!-- 替换 -->
${fn:replace(str, 'World', 'Java')}     <!-- Hello Java -->

<!-- 分割 -->
<c:forEach var="s" items="${fn:split('a,b,c', ',')}">
    ${s}  <!-- a b c -->
</c:forEach>

<!-- 连接 -->
${fn:join(list, '-')}  <!-- a-b-c -->

<!-- 去除空格 -->
${fn:trim('  hello  ')}  <!-- hello -->

<!-- 转义 XML -->
${fn:escapeXml('<script>alert("XSS")</script>')}
<!-- &lt;script&gt;alert("XSS")&lt;/script&gt; -->
```

## 实战案例

### 案例1: 分页显示

```jsp
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<table>
    <thead>
        <tr>
            <th>编号</th>
            <th>用户名</th>
            <th>邮箱</th>
            <th>注册时间</th>
        </tr>
    </thead>
    <tbody>
        <c:forEach var="user" items="${pageBean.data}" varStatus="status">
            <tr>
                <td>${status.count}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td><fmt:formatDate value="${user.createTime}" pattern="yyyy-MM-dd HH:mm" /></td>
            </tr>
        </c:forEach>
    </tbody>
</table>

<!-- 分页导航 -->
<div class="pagination">
    <c:if test="${pageBean.pageNum > 1}">
        <a href="?pageNum=1">首页</a>
        <a href="?pageNum=${pageBean.pageNum - 1}">上一页</a>
    </c:if>
    
    <c:forEach var="i" begin="1" end="${pageBean.totalPage}">
        <a href="?pageNum=${i}" class="${i == pageBean.pageNum ? 'active' : ''}">${i}</a>
    </c:forEach>
    
    <c:if test="${pageBean.pageNum < pageBean.totalPage}">
        <a href="?pageNum=${pageBean.pageNum + 1}">下一页</a>
        <a href="?pageNum=${pageBean.totalPage}">尾页</a>
    </c:if>
    
    <span>共 ${pageBean.totalCount} 条记录</span>
</div>
```

### 案例2: 动态表格

```jsp
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<c:set var="users" value="${requestScope.users}" />

<c:choose>
    <c:when test="${not empty users}">
        <table>
            <thead>
                <tr>
                    <th>序号</th>
                    <th>用户名</th>
                    <th>状态</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                <c:forEach var="user" items="${users}" varStatus="status">
                    <tr class="${status.index % 2 == 0 ? 'even' : 'odd'}">
                        <td>${status.count}</td>
                        <td>${user.username}</td>
                        <td>
                            <c:choose>
                                <c:when test="${user.status == 1}">
                                    <span class="active">正常</span>
                                </c:when>
                                <c:when test="${user.status == 0}">
                                    <span class="inactive">禁用</span>
                                </c:when>
                                <c:otherwise>
                                    <span class="unknown">未知</span>
                                </c:otherwise>
                            </c:choose>
                        </td>
                        <td>
                            <a href="<c:url value='/user/edit'><c:param name='id' value='${user.id}' /></c:url>">编辑</a>
                            <a href="<c:url value='/user/delete'><c:param name='id' value='${user.id}' /></c:url>" 
                               onclick="return confirm('确定删除?')">删除</a>
                        </td>
                    </tr>
                </c:forEach>
            </tbody>
        </table>
    </c:when>
    <c:otherwise>
        <p class="no-data">暂无数据</p>
    </c:otherwise>
</c:choose>
```

### 案例3: 表单处理

```jsp
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<form action="<c:url value='/user/save' />" method="post">
    <!-- 用户名 -->
    <div>
        <label>用户名:</label>
        <input type="text" name="username" 
               value="${fn:escapeXml(user.username)}" required />
        <c:if test="${not empty errors.username}">
            <span class="error">${errors.username}</span>
        </c:if>
    </div>
    
    <!-- 邮箱 -->
    <div>
        <label>邮箱:</label>
        <input type="email" name="email" value="${user.email}" />
    </div>
    
    <!-- 年龄 -->
    <div>
        <label>年龄:</label>
        <input type="number" name="age" value="${user.age}" min="0" max="150" />
    </div>
    
    <!-- 生日 -->
    <div>
        <label>生日:</label>
        <input type="date" name="birthday" 
               value="<fmt:formatDate value='${user.birthday}' pattern='yyyy-MM-dd' />" />
    </div>
    
    <!-- 性别 -->
    <div>
        <label>性别:</label>
        <input type="radio" name="gender" value="male" 
               ${user.gender == 'male' ? 'checked' : ''} /> 男
        <input type="radio" name="gender" value="female" 
               ${user.gender == 'female' ? 'checked' : ''} /> 女
    </div>
    
    <!-- 爱好 -->
    <div>
        <label>爱好:</label>
        <c:forEach var="hobby" items="${allHobbies}">
            <input type="checkbox" name="hobbies" value="${hobby}"
                   ${fn:contains(user.hobbies, hobby) ? 'checked' : ''} />
            ${hobby}
        </c:forEach>
    </div>
    
    <!-- 城市 -->
    <div>
        <label>城市:</label>
        <select name="city">
            <option value="">请选择</option>
            <c:forEach var="city" items="${cities}">
                <option value="${city}" ${user.city == city ? 'selected' : ''}>
                    ${city}
                </option>
            </c:forEach>
        </select>
    </div>
    
    <button type="submit">提交</button>
</form>
```

### 案例4: 数据统计

```jsp
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<c:set var="totalSales" value="1234567.89" />
<c:set var="orderCount" value="1523" />
<c:set var="avgOrderValue" value="${totalSales / orderCount}" />

<div class="statistics">
    <div class="stat-card">
        <h3>总销售额</h3>
        <p class="value">
            <fmt:formatNumber value="${totalSales}" type="currency" />
        </p>
    </div>
    
    <div class="stat-card">
        <h3>订单数量</h3>
        <p class="value">
            <fmt:formatNumber value="${orderCount}" groupingUsed="true" />
        </p>
    </div>
    
    <div class="stat-card">
        <h3>平均订单金额</h3>
        <p class="value">
            <fmt:formatNumber value="${avgOrderValue}" type="currency" />
        </p>
    </div>
</div>

<!-- 分类统计 -->
<c:set var="categoryStats" value="${requestScope.categoryStats}" />

<table>
    <thead>
        <tr>
            <th>分类</th>
            <th>销量</th>
            <th>占比</th>
        </tr>
    </thead>
    <tbody>
        <c:forEach var="entry" items="${categoryStats}">
            <tr>
                <td>${entry.key}</td>
                <td>${entry.value}</td>
                <td>
                    <fmt:formatNumber value="${entry.value / orderCount * 100}" 
                                     type="percent" maxFractionDigits="1" />
                </td>
            </tr>
        </c:forEach>
    </tbody>
</table>
```

## 常见问题与最佳实践

### 常见问题

#### 1. EL 表达式不解析

**问题:** 页面显示 `${user}` 而不是用户名

**原因:** JSP 版本问题或配置问题

**解决:**
```jsp
<!-- 方式1: JSP 2.4+ 默认支持 EL -->

<!-- 方式2: 在 JSP 中启用 -->
<%@ page isELIgnored="false" %>

<!-- 方式3: web.xml 配置 -->
<jsp-config>
    <jsp-property-group>
        <url-pattern>*.jsp</url-pattern>
        <el-ignored>false</el-ignored>
    </jsp-property-group>
</jsp-config>
```

#### 2. EL 表达式报错

**问题:** `${user.name}` 抛出异常

**原因:** user 为 null

**解决:**
```jsp
<!-- 使用 empty 判断 -->
<c:if test="${not empty user}">
    ${user.name}
</c:if>

<!-- 使用三元运算符 -->
${not empty user ? user.name : '未知'}

<!-- EL 会自动处理 null,显示空字符串 -->
${user.name}  <!-- 如果 user 为 null,显示空字符串,不报错 -->
```

#### 3. JSTL 标签不识别

**问题:** 页面显示 `<c:if>` 标签而不是执行

**原因:** 未引入 JSTL 标签库

**解决:**
```jsp
<!-- 引入核心标签库 -->
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<!-- 引入格式化标签库 -->
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<!-- 引入函数标签库 -->
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
```

#### 4. 中文乱码

**问题:** EL 输出中文乱码

**解决:**
```jsp
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page pageEncoding="UTF-8" %>
```

### 最佳实践

#### 1. 优先使用 EL 表达式

```jsp
<!-- 不推荐 -->
<%= request.getAttribute("user") %>
<%= user.getName() %>

<!-- 推荐 -->
${user}
${user.name}
```

#### 2. 使用 JSTL 替代 Java 代码

```jsp
<!-- 不推荐 -->
<%
    if (user.getAge() >= 18) {
        out.print("成年人");
    }
%>

<!-- 推荐 -->
<c:if test="${user.age >= 18}">
    成年人
</c:if>
```

#### 3. 避免在 JSP 中编写业务逻辑

```jsp
<!-- 不推荐 -->
<%
    List<User> users = userDao.findAll();
    pageContext.setAttribute("users", users);
%>
```

```java
// 推荐: 在 Servlet 中准备数据
List<User> users = userService.findAll();
request.setAttribute("users", users);
request.getRequestDispatcher("/user_list.jsp").forward(request, response);
```

```jsp
<!-- JSP 只负责显示 -->
<c:forEach var="user" items="${users}">
    ${user.name}
</c:forEach>
```

#### 4. 合理使用作用域

```jsp
<!-- 页面范围 -->
<c:set var="temp" value="value" scope="page" />

<!-- 请求范围 -->
<c:set var="data" value="${data}" scope="request" />

<!-- 会话范围 -->
<c:set var="user" value="${user}" scope="session" />

<!-- 应用范围 -->
<c:set var="config" value="${config}" scope="application" />
```

## 面试要点

### Q1: EL 表达式的作用?

**答:**
1. 简化 JSP 页面中的数据访问
2. 自动处理 null 值
3. 支持运算符和表达式
4. 访问各种作用域的数据
5. 访问 JavaBean 属性、集合、数组

### Q2: EL 表达式的查找顺序?

**答:** 按照 page → request → session → application 的顺序查找,找到即返回。

### Q3: JSTL 的优势?

**答:**
1. 替代 JSP 中的 Java 代码,提高可读性
2. 标签化编程,易于维护
3. 功能丰富:流程控制、格式化、函数等
4. 标准规范,可移植性强

### Q4: <c:if> 和 <c:choose> 的区别?

**答:**
- `<c:if>` 只能处理单个条件
- `<c:choose>` 可以处理多个条件,类似 if-else if-else

### Q5: 如何防止 XSS 攻击?

**答:**
```jsp
<!-- 使用 fn:escapeXml 函数 -->
${fn:escapeXml(userInput)}

<!-- 使用 <c:out> 标签,默认转义 -->
<c:out value="${userInput}" />
```

### Q6: EL 表达式和 JSTL 的关系?

**答:**
- EL 表达式用于数据访问和简单运算
- JSTL 是标签库,用于流程控制和格式化
- 两者结合使用,实现 JSP 无 Java 代码

---

> EL 表达式和 JSTL 是 JSP 开发的基础技术,虽然现代开发中更多使用 Thymeleaf、Vue、React 等模板引擎和前端框架,但理解 EL 和 JSTL 对于维护老项目和深入理解 JSP 技术体系仍然重要。

## 版本差异(旧版 → 当前)

| 特性 | 旧版（本文编写时） | 当前 |
|------|-------------------|------|
| 依赖坐标 | javax.servlet.jsp.jstl | jakarta.servlet.jsp.jstl（Tomcat 10+） |
| EL 版本 | EL 2.2/3.0 | EL 3.0+（Jakarta EE 11 中继续演进） |
| 使用场景 | JSP 页面绑定 | 仅遗留系统；新项目用 Thymeleaf/前端框架 |
| Spring Boot 3 | 不支持 JSP 默认渲染 | 需额外引入 JSTL 兼容包（不推荐） |

> EL/JSTL 属于 JSP 技术栈，新项目不建议使用；维护老项目时注意 javax→jakarta 迁移。