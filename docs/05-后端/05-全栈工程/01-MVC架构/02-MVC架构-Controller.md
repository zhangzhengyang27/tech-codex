---
title: MVC架构-Controller
description: MVC 控制器层职责：请求分发、参数绑定、路由映射与前后端交互设计
keywords: [MVC, Controller, 路由, 请求分发]
category: 全栈工程
tags: [Java, MVC]
---

# MVC架构-Controller

控制器用于接收请求，校验参数，调用 Model 层获取业务数据，构造和绑定上下文，并转给 View 层去渲染。

那么与其去抽象地学习这一层的重要概念、原理，或是单纯地学习这些框架在这一层略显乏味的具体配置，我想我们今天“不走寻常路”一次，把这两者结合起来——**比较 Servlet、Struts 和 Spring MVC 这三种常见的技术和 MVC 框架，在控制器层的工作路数，以及和业务代码整合配置的方式，看看任凭这些框架形式千变万化，到底有哪些其实是不变的“套路”呢？**

随着请求到达控制器，让我们顺着接下去的请求处理流程，看看控制器会通过怎样的步骤，履行完它的职责，并最终转到相应的视图吧。

## 路径映射和视图指向

不妨把 MVC 架构的控制器想象成一个黑盒。当 HTTP 请求从客户端送达的时候，这个黑盒要完成一系列使命，那么它就有一个入口路由和一个出口路由：

- **入口路由就是路径映射，根据配置的规则，以及请求 URI 的路径，找到具体接收和处理这个请求的控制器逻辑**
- **出口路由就是视图指向，根据配置的规则，以及控制器处理完毕后返回的信息，找到需要渲染的视图页面**

从 Servlet 开始讲起，在 Tomcat 的 web.xml 中，我们可以配置这样的路径映射：

```xml
<servlet>
  <servlet-name>BookServlet</servlet-name>
  <servlet-class>com.xxx.xxx.BookServlet</servlet-class>
</servlet>
<servlet-mapping>
  <servlet-name>BookServlet</servlet-name>
  <url-pattern>/books</url-pattern>
</servlet-mapping>
```

对于路径映射，一旦请求是 `/books` 这种形式的，就会被转到 BookServlet 里去处理。而对于视图指向，Servlet 是通过代码完成的，比如：

```java
request.getRequestDispatcher("/book.jsp").forward(request, response);
```

但是 Servlet 路径映射的表达式匹配不够灵活，而且配置过于冗长；而视图指向更是完全通过代码调用来完成，视图的位置信息完全耦合在控制器主代码逻辑中，而且也并没有体现出配置的集中、清晰的管理优势。

于是现今的 MVC 框架都提供了一套自己的映射匹配逻辑，例如 Struts 2：

```xml
<action name="books" class="xxx.xxx.BookAction">
    <result name="success" type="dispatcher">/success.jsp</result>
    <result name="input" ... />
</action>
```

其中 `name=“books”`  这样的配置就会将 `/books` 的请求转给 BookAction。至于接下来的两个 result 标签，是根据控制器返回的视图名来配对具体的视图页面，也就是说，一旦 BookAction 处理完毕，通过返回的视图名字，请求可以被转发给相应的视图。

这个路径映射的配置是简单一些了，可是都需要放在一个其它位置的、单独的 XML 中配置。不过 Java 5 开始支持注解，因此许多 MVC 框架都开始支持使用注解来让这样的配置变得更加轻量，也就是将路径映射和它所属的控制器代码放在一起。见下面 Struts 的例子：

```java
public class BookAction extends ActionSupport {
  @Action(value="/books", results={
    @Result(name="success",location="/book.jsp")
  })
  public String get() {
    ...
      return "success";
  }
}
```

当以 `/books` 为路径的 GET 请求到来时，会被转给 BookAction 的 get 方法。在控制器的活干完之后，根据返回的名称 success，下一步请求就会转到视图 /book.jsp 中去。



对于路径映射和视图指向，为了不把这样的信息和主流程代码耦合在一起，上面讲了两种实现方法，它们各有优劣：

- 放到配置文件中，好处是所有的映射都在一个文件里，方便管理。但是对于任何一个控制器逻辑，要寻找它对应的配置信息，需要去别的位置（即上文的 XML 中）寻找。**这是一种代码横向分层解耦的方式，即分层方式和业务模块无关，或者说二者是“正交”的**
- 使用注解，和控制器逻辑放在一起，好处是映射本身是和具体的控制器逻辑放在一起，当然，它们并非代码层面的耦合，而是通过注解的方式分离开。坏处是，如果需要考察所有的映射配置，那么就没有一个统一的文件可供概览。**这是一种代码纵向分层解耦的方式，也就是说，配置是跟着业务模块走的**。

无论使用以上哪一种方法，本质上都逃不过需要显式配置的命运。但无论哪种方法，其实都已经够简单了，可历史总是惊人的相似，总有帮“难伺候”的程序员，还是嫌麻烦！于是就有人想出了一个“终极偷懒”的办法——免掉配置。

这就需要利用 **CoC 原则（Convention over Configuration 即规约优于配置）**。比如在使用 Spring MVC 这个 MVC 框架时，声明了 ControllerClassNameHandlerMapping 以后，对于这样没有配置任何映射信息的方法，会根据 Controller 类名的规约来完成映射：

```java
public class BooksController extends AbstractController {
  @Override
  protected ModelAndView handleRequestInternal() throws Exception {
    ...
  }
}
```

**CoC 虽然省掉了一部分实际的配置工作，却没有改变映射匹配的流程本身，也不能省掉任何为了理解规约背后的“隐性知识”的学习成本**。而且，规约往往只方便于解决最常见的配置，也就意味着，**当需要更灵活的配置时，还是会被迫退化回显式配置**。

## 请求参数绑定

请求被送到了指定的控制器方法，接下去需要从 HTTP 请求中把参数取出来，绑定到控制器这一层，以便使用。

和路径映射的配置一样，最先被考虑的方式，一定是用编程的方法实现的。比如在 Servlet 中，可以这样做：

```java
request.getParameter("name")
```

这并没有什么稀奇的对不对，想想我们前面学习的处理方法，参数应该能通过某种配置方式自动注入到控制器的对象属性或者方法参数中吧？一点都没错，并且 Struts 和 Spring MVC 各有各的做法，二者加起来，就恰巧印证了这句话。

还记得前面 Struts 的那个例子吗？给 BookAction 设置一个和参数同名的属性，并辅以规则的 get/set 方法，就能将请求中的参数自动注入。更强大的地方在于，如果这个属性是个复杂对象，只要参数按照规约命名了，那么它也能够被正确处理：

```java
public class BookAction extends ActionSupport {
  private Page page;
  public void setPage(Page page) { ... }
  public Page getPage() { ... }
}
```

在这种设定下，如果 URI 是 `/books?page.pageSize=1&amp;page.pageNo=2&amp;page.orderBy=desc`，那么 pageSize、pageNo 和 orderBy 这三个值就会被设置到一个 Page 对象中，而这个 Page 对象则会被自动注入到 BookAction 的实例中去。

再来看看 Spring MVC 使用注解的方式来处理，和 URL 的结构放在一起观察，这种方式显然更为形象直观：

```java
@RequestMapping("/{category}/books")
public ModelAndView get(@PathVariable("category") String category, @RequestParam("author") String author){ ... }
```

在这种配置下，如果 URI 是 `/comic/books?author=Jim`，那么分类 comic 就会作为方法参数 category 的值传入，而作者 Jim 就会作为方法参数 author 的值传入

## 参数验证

参数验证的操作因为和请求对象密切相关，因此通常都是在控制器层完成的。在参数验证没有通过的情况下，往往会执行异常流程，转到错误页面，返回失败请求。Struts 提供了一个将参数验证解耦到配置文件的办法，请看下面的例子：

```xml
<validators>
  <field name="name">
    <field-validator type="requiredstring">
      <param name="trim">true</param>
      <message>书名不得为空</message>
    </field-validator>
    <field-validator type="stringlength">
      <param name="maxLength">100</param>
      <param name="minLength">1</param>
      <message>书名的长度必须在 1~100 之间</message>
    </field-validator>
  </field>
</validators>
```

这就是一个非常简单的参数验证的规则，对于属性 name 定义了两条规则，一条是不得为空，另一条是长度必须在 1~100 之间，否则将返回错误信息。

类似的 Struts 也提供了基于注解的参数验证方式，上面的例子如果使用注解来实现，就需要将注解加在自动注入参数的 set 方法处。代码见下：

```java
@RequiredStringValidator(trim = true, message = "书名不得为空.")
@StringLengthFieldValidator(minLength = "1", maxLength = "100", message = "书名的长度必须在 1~100 之间")
void setName(String name) { ... }
```

## 视图上下文绑定

在控制器中经常需要将数据传入视图层，它可能会携带用户传入的参数，也可能会携带在控制器中查询模型得到的数据，而这个传入方式，就是**将数据绑定到视图的上下文中。这就是我刚刚提到过的控制器层两大绑定中的第二个**。

如果是使用 Servlet 一般可以用 setAttribute 的方法将参数设置到 request 对象中，这样在视图层就可以相应地使用 getAttribute 方法把该参数的值取出来

```java
request.setAttribute("page", xxx);
```

对于 Struts 来说，它的方法和前面说的请求参数绑定统一了，即可以将想传递的值放到 Action 的对象属性中，这种方式绑定的属性，和请求参数自动绑定的属性没有什么区别，在视图层都可以直接从上下文中取出来。

接着前面 BookAction 的例子，绑定了一个 Page 对象，那么在视图层中就可以使用 OGNL（Object-Graph Navigation Language，对象导航图语言）表达式直接取得：

```jsp
<!-- JSP 视图层：通过 OGNL 表达式取出 Action 属性 -->
<s:property value="page.pageSize"/>
```

对于 Spring MVC，则是需要在控制器方法中传入一个类型为 Model 的对象，同时将需要绑定的对象通过调用 addAttribute 来完成绑定，这个过程和 Servlet 是类似的。

## 总结思考

整个控制器的逻辑比较密集，从请求抵达，到转出到视图层去渲染，控制器的逻辑通常包括下面这几步，但是严格说起来下面这些步骤的任何一步，根据实际情况都是可以省略的

![image-20240520161820225](/fullstack-eng-images/202405201618822.png)