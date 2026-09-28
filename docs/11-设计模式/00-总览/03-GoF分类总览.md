---
title: "GoF 23 模式分类总览"
description: "GoF 23 种设计模式按创建型、结构型、行为型三大类的分类总览与模式关系图"
keywords: [GoF, 设计模式, 创建型, 结构型, 行为型, 模式关系]
category: "设计模式"
tags: [设计模式, GoF, 创建型, 结构型, 行为型]
---

# GoF 23 模式分类总览

GoF 将 23 种设计模式按用途分为三大类：创建型（5 种）、结构型（7 种）、行为型（11 种）。

## 1. 创建型模式（Creational Patterns）—— 5 种

创建型模式抽象了对象的创建过程，将对象的创建与使用分离，使客户端不需要知道具体创建了哪个类的实例。

| 模式 | 一句话描述 |
|------|-----------|
| **单例（Singleton）** | 确保一个类只有一个实例，并提供全局访问点 |
| **工厂方法（Factory Method）** | 定义创建对象的接口，让子类决定实例化哪个类 |
| **抽象工厂（Abstract Factory）** | 创建一系列相关或相互依赖的对象家族，而无需指定具体类 |
| **建造者（Builder）** | 将复杂对象的构建与其表示分离，使同样的构建过程可以创建不同的表示 |
| **原型（Prototype）** | 用原型实例指定创建对象的种类，通过拷贝原型创建新对象 |

## 2. 结构型模式（Structural Patterns）—— 7 种

结构型模式关注类和对象的组合，用于处理类或对象的组成关系，形成更大的结构。

| 模式 | 一句话描述 |
|------|-----------|
| **适配器（Adapter）** | 将一个类的接口转换成客户端期望的另一个接口 |
| **桥接（Bridge）** | 将抽象部分与实现部分分离，使它们可以独立变化 |
| **组合（Composite）** | 将对象组合成树形结构以表示"部分-整体"的层次结构 |
| **装饰器（Decorator）** | 动态地给对象添加额外的职责 |
| **外观（Facade）** | 为子系统中的一组接口提供一个一致的界面 |
| **享元（Flyweight）** | 运用共享技术有效支持大量细粒度的对象 |
| **代理（Proxy）** | 为其他对象提供一种代理以控制对这个对象的访问 |

## 3. 行为型模式（Behavioral Patterns）—— 11 种

行为型模式关注对象之间的职责分配和通信方式，描述了类或对象怎样交互以及怎样分配职责。

| 模式 | 一句话描述 |
|------|-----------|
| **职责链（Chain of Responsibility）** | 使多个对象都有机会处理请求，避免请求的发送者和接收者耦合 |
| **命令（Command）** | 将请求封装成对象，以便使用不同的请求参数化其他对象 |
| **解释器（Interpreter）** | 给定一门语言，定义它的文法表示，并定义一个解释器 |
| **迭代器（Iterator）** | 提供一种方法顺序访问一个聚合对象中的各个元素 |
| **中介者（Mediator）** | 用一个中介对象来封装一系列的对象交互 |
| **备忘录（Memento）** | 在不破坏封装的前提下捕获并外部化一个对象的内部状态 |
| **观察者（Observer）** | 定义对象间一对多的依赖关系，当一个对象改变时通知所有依赖者 |
| **状态（State）** | 允许对象在内部状态改变时改变它的行为 |
| **策略（Strategy）** | 定义一系列算法，把它们一个个封装起来，并使它们可相互替换 |
| **模板方法（Template Method）** | 定义一个操作中的算法骨架，将一些步骤延迟到子类 |
| **访问者（Visitor）** | 表示一个作用于某对象结构中各元素的操作，使你可以在不改变各元素类的前提下定义新操作 |

## 4. 模式关系图

GoF 23 种模式之间并非孤立存在，它们有着丰富的关联关系。某些模式是其他模式的变体或扩展，某些模式常常组合使用，还有些模式看似相似实则解决不同问题。

### 4.1 创建型模式关系

```mermaid
flowchart TD
  FM["工厂方法<br/>Factory Method"]
  AF["抽象工厂<br/>Abstract Factory"]
  BUILDER["建造者<br/>Builder"]
  PROTO["原型<br/>Prototype"]
  SINGLETON["单例<br/>Singleton"]

  FM -->|"扩展：从单一产品<br/>到产品家族"| AF
  PROTO -->|"组合：原型可替代<br/>工厂方法创建对象"| FM
  AF -->|"协作：抽象工厂<br/>常使用工厂方法"| FM
  BUILDER -->|"对比：建造者关注<br/>分步构建，工厂关注<br/>整体创建"| FM
  SINGLETON -->|"组合：抽象工厂、<br/>建造者常以单例实现"| AF
  SINGLETON -->|"组合"| BUILDER
```

### 4.2 结构型模式关系

```mermaid
flowchart TD
  ADAPTER["适配器<br/>Adapter"]
  BRIDGE["桥接<br/>Bridge"]
  COMPOSITE["组合<br/>Composite"]
  DECORATOR["装饰器<br/>Decorator"]
  FACADE["外观<br/>Facade"]
  FLYWEIGHT["享元<br/>Flyweight"]
  PROXY["代理<br/>Proxy"]

  ADAPTER -->|"关联：外观为子系统<br/>提供简化接口，<br/>适配器使不兼容接口协同"| FACADE
  DECORATOR -->|"对比：装饰器增强功能，<br/>代理控制访问；<br/>结构相似，意图不同"| PROXY
  COMPOSITE -->|"组合：装饰器常与<br/>组合模式一起使用，<br/>递归地装饰组合结构"| DECORATOR
  FLYWEIGHT -->|"组合：组合的叶节点<br/>可用享元共享"| COMPOSITE
  BRIDGE -->|"对比：桥接在设计时<br/>分离抽象与实现，<br/>适配器在事后适配接口"| ADAPTER
```

### 4.3 行为型模式关系

```mermaid
flowchart TD
  CHAIN["职责链<br/>Chain of Responsibility"]
  CMD["命令<br/>Command"]
  INTERPRETER["解释器<br/>Interpreter"]
  ITERATOR["迭代器<br/>Iterator"]
  MEDIATOR["中介者<br/>Mediator"]
  MEMENTO["备忘录<br/>Memento"]
  OBSERVER["观察者<br/>Observer"]
  STATE["状态<br/>State"]
  STRATEGY["策略<br/>Strategy"]
  TEMPLATE["模板方法<br/>Template Method"]
  VISITOR["访问者<br/>Visitor"]

  OBSERVER -->|"互补：观察者分散通信，<br/>中介者集中通信；<br/>两者可组合使用"| MEDIATOR
  STRATEGY -->|"对比：策略封装算法，<br/>状态封装状态相关行为；<br/>结构相同，意图不同"| STATE
  CMD -->|"组合：命令对象<br/>可沿职责链传递"| CHAIN
  CMD -->|"组合：命令模式<br/>可用备忘录实现撤销"| MEMENTO
  STRATEGY -->|"组合：策略对象<br/>可由命令封装调用"| CMD
  TEMPLATE -->|"对比：模板方法用继承<br/>扩展算法步骤，<br/>策略用组合替换算法"| STRATEGY
  ITERATOR -->|"协作：访问者遍历<br/>对象结构时<br/>可使用迭代器"| VISITOR
  MEDIATOR -->|"替代：中介者可替代<br/>观察者实现<br/>集中式通信"| OBSERVER
```

### 4.4 跨类别关系

```mermaid
flowchart TD
  subgraph creational["创建型"]
    FM["工厂方法"]
    PROTO["原型"]
    FLYWEIGHT["享元"]
  end

  subgraph structural["结构型"]
    COMPOSITE["组合"]
    DECORATOR["装饰器"]
  end

  subgraph behavioral["行为型"]
    TEMPLATE["模板方法"]
    VISITOR["访问者"]
    STATE["状态"]
    STRATEGY["策略"]
    CMD["命令"]
  end

  FM -->|"关联：工厂方法是<br/>模板方法的一种应用"| TEMPLATE
  COMPOSITE -->|"协作：访问者可对<br/>组合结构中的元素<br/>执行操作"| VISITOR
  PROTO -->|"组合：原型可替代<br/>工厂创建享元的<br/>共享对象"| FLYWEIGHT
  DECORATOR -->|"协作：装饰器和策略<br/>都可以动态改变行为，<br/>但装饰器递归组合，<br/>策略直接替换"| STRATEGY
  CMD -->|"协作：命令可封装<br/>状态转换，实现<br/>可撤销的状态变更"| STATE
```

## 5. 分类小结

掌握这 23 种模式，重点在于理解三大类的分工：

- **创建型**解决"怎么创建对象"——把对象的创建与使用分离，降低耦合；
- **结构型**解决"怎么组合对象"——把类或对象组合成更大的结构；
- **行为型**解决"对象之间怎么协作"——分配职责、组织通信与流程控制。

这三类从"对象生命周期（创建）"到"静态结构（组合）"再到"运行时协作（行为）"，覆盖了面向对象设计的完整维度。配合每种模式的具体概念与多语言实现文档，可以构建完整的设计模式知识体系。
