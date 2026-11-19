---
title: "消息集成：如何剖析 Spring Cloud Stream 集成消息中间件的实现原理？"
description: "Spring Cloud Stream 集成原理源码解析：BindableProxyFactory/BindingService/Binder/BinderFactory 核心类，AbstractMessageChannelBinder 模板方法，以及通过 RabbitMessageChannelBinder 与 RabbitMQ 的消息发送和消费整合。"
keywords: [消息集成, 如何剖析, Spring, Cloud, Stream, 集成消息中间件的实现原理]
category: "Java"
tags: [Java, SpringCloud原理与实战]
---
# 消息集成：如何剖析 Spring Cloud Stream 集成消息中间件的实现原理？

## 概念说明

Spring Cloud Stream 与各种消息中间件整合的核心是 Binder 组件。本篇聚焦消息发送和接收的主流程，分别从 **Spring Cloud Stream** 和**消息中间件**两个角度出发，分析如何基于该主流程完成两者之间的无缝集成。

## Spring Cloud Stream 中的 Binder

Binder 组件是 Spring Cloud Stream 与各种消息中间件进行集成的核心组件，其实现过程涉及一批核心类之间的相互协作。以下对 Binder 相关的核心类做源码级展开。

### BindableProxyFactory

发送和接收消息时需要使用 @EnableBinding 注解，该注解的作用是告诉 Spring Cloud Stream 将该应用程序绑定到消息中间件，从而实现两者之间的连接。org.springframework.cloud.stream.binding 包下的 BindableProxyFactory 类，根据类上的注释，是用于初始化由 @EnableBinding 注解所提供接口的工厂类，该类的定义如下所示：

```java
public class BindableProxyFactory implements MethodInterceptor, FactoryBean<Object>, Bindable, InitializingBean
```

BindableProxyFactory 同时实现了 MethodInterceptor 接口和 Bindable 接口：前者是 AOP 中的方法拦截器，后者是标明能够绑定 Input 和 Output 的接口。MethodInterceptor 中用于拦截的 invoke 方法如下所示：

```java
@Override
public synchronized Object invoke(MethodInvocation invocation) throws Throwable {
        Method method = invocation.getMethod();

Object boundTarget = targetCache.get(method);
        if (boundTarget != null) {
            return boundTarget;
        }

        Input input = AnnotationUtils.findAnnotation(method, Input.class);
        if (input != null) {
            String name = BindingBeanDefinitionRegistryUtils.getBindingTargetName(input, method);
            boundTarget = this.inputHolders.get(name).getBoundTarget();
            targetCache.put(method, boundTarget);
            return boundTarget;
        }
        else {
            Output output = AnnotationUtils.findAnnotation(method, Output.class);
            if (output != null) {
                String name = BindingBeanDefinitionRegistryUtils.getBindingTargetName(output, method);
                boundTarget = this.outputHolders.get(name).getBoundTarget();
                targetCache.put(method, boundTarget);
                return boundTarget;
            }
        }
        return null;
}
```

这段逻辑比较简单：BindableProxyFactory 保存了一个缓存对象 targetCache，如果所调用方法已经存在于缓存中，则直接返回目标对象；反之，会根据 @Input 和 @Output 注解从 inputHolders 和 outputHolders 中获取对应的目标对象并放入缓存中。使用缓存的作用是加快每次方法调用的速度，而系统在初始化时通过重写 afterPropertiesSet 方法，已经将所有的目标对象都放置在 inputHolders 和 outputHolders 这两个集合中。这里提到的目标对象，可以暂时理解为一种 MessageChannel 对象，后文会展开。

Bindable 接口的定义如下所示：

```java
public interface Bindable {
  default Collection<Binding<Object>> createAndBindInputs(BindingService adapter) {
      return Collections.<Binding<Object>>emptyList();
  }
  default void bindOutputs(BindingService adapter) {}
  default void unbindInputs(BindingService adapter) {}
  default void unbindOutputs(BindingService adapter) {}
  default Set<String> getInputs() {
      return Collections.emptySet();
  }

  default Set<String> getOutputs() {
      return Collections.emptySet();
  }
}
```

显然，这个接口提供了对 Input 和 Output 的绑定和解绑操作。在 BindableProxyFactory 中，以上几个方法的实现过程基本类似，以 bindOutputs 方法为例：

```java
@Override
public void bindOutputs(BindingService bindingService) {
        for (Map.Entry<String, BoundTargetHolder> boundTargetHolderEntry : this.outputHolders.entrySet()) {
            BoundTargetHolder boundTargetHolder = boundTargetHolderEntry.getValue();
            String outputTargetName = boundTargetHolderEntry.getKey();
            if (boundTargetHolderEntry.getValue().isBindable()) {
                if (log.isDebugEnabled()) {
                    log.debug(String.format("Binding %s:%s:%s", this.namespace, this.type, outputTargetName));
                }
                bindingService.bindProducer(boundTargetHolder.getBoundTarget(), outputTargetName);
            }
        }
}
```

这里需要引入另一个重要的工具类 BindingService，该类提供了对 Input 和 Output 目标对象进行绑定的能力。事实上，通过类上的注释可以看到，这也是一个外观类，它将底层的绑定动作委托给了 Binder。以绑定生产者的 bindProducer 方法为例：

```java
public <T> Binding<T> bindProducer(T output, String outputName) {
        String bindingTarget = this.bindingServiceProperties
                .getBindingDestination(outputName);
        Binder<T, ?, ProducerProperties> binder = (Binder<T, ?, ProducerProperties>) getBinder(
                outputName, output.getClass());
        ProducerProperties producerProperties = this.bindingServiceProperties
                .getProducerProperties(outputName);
        if (binder instanceof ExtendedPropertiesBinder) {
            Object extension = ((ExtendedPropertiesBinder) binder)
                    .getExtendedProducerProperties(outputName);
            ExtendedProducerProperties extendedProducerProperties = new ExtendedProducerProperties<>(
                    extension);
            BeanUtils.copyProperties(producerProperties, extendedProducerProperties);
            producerProperties = extendedProducerProperties;
        }
        validate(producerProperties);
        Binding<T> binding = doBindProducer(output, bindingTarget, binder, producerProperties);
        this.producerBindings.put(outputName, binding);
        return binding;
}
```

其中的 doBindProducer 方法完成了真正的绑定操作：

```java
public <T> Binding<T> doBindProducer(T output, String bindingTarget, Binder<T, ?, ProducerProperties> binder,
            ProducerProperties producerProperties) {
        if (this.taskScheduler == null || this.bindingServiceProperties.getBindingRetryInterval() <= 0) {
            return binder.bindProducer(bindingTarget, output, producerProperties);
        }
        else {
            try {
                return binder.bindProducer(bindingTarget, output, producerProperties);
            }
            catch (RuntimeException e) {
                LateBinding<T> late = new LateBinding<T>();
                rescheduleProducerBinding(output, bindingTarget, binder, producerProperties, late, e);
                return late;
            }
        }
}
```

从这个方法中可以看到 Spring Cloud Stream 中最核心的概念 Binder：通过 Binder 的 bindProducer 方法完成了目标对象的绑定。

### Binder

Binder 是一个接口，分别提供了绑定生产者和消费者的方法：

```java
public interface Binder<T, C extends ConsumerProperties, P extends ProducerProperties> {
    Binding<T> bindConsumer(String name, String group, T inboundBindTarget, C consumerProperties);

    Binding<T> bindProducer(String name, T outboundBindTarget, P producerProperties);
}
```

在介绍 Binder 接口的具体实现类之前，先了解如何获取一个 Binder。getBinder 方法如下所示：

```java
protected <T> Binder<T, ?, ?> getBinder(String channelName, Class<T> bindableType) {
        String binderConfigurationName = this.bindingServiceProperties.getBinder(channelName);
        return binderFactory.getBinder(binderConfigurationName, bindableType);
}
```

这里用到了工厂模式，工厂类 BinderFactory 的定义如下所示：

```java
public interface BinderFactory {

    <T> Binder<T, ? extends ConsumerProperties, ? extends ProducerProperties> getBinder(String configurationName,
            Class<? extends T> bindableType);
}
```

BinderFactory 只有一个方法，根据给定的配置名称 configurationName 和绑定类型 bindableType 获取 Binder 实例。BinderFactory 的实现类只有一个，即 DefaultBinderFactory。该实现类的 getBinder 方法对配置信息进行了校验，并通过 getBinderInstance 获取真正的 Binder 实例。在 getBinderInstance 方法中，通过一系列基于 Spring 容器的步骤构建了一个上下文对象 ConfigurableApplicationContext，并通过该上下文对象获取实现了 Binder 接口的 Java bean，核心代码就是下面这句：

```java
Binder<T, ?, ?> binder = binderProducingContext.getBean(Binder.class);
```

对 BinderFactory 而言，缓存也是必要的。DefaultBinderFactory 中存在一个 binderInstanceCache 变量，使用一个 Map 保存配置名称所对应的 Binder 对象。

### AbstractMessageChannelBinder

获取 Binder 实例之后，接下来讨论 Binder 实例中对 bindConsumer 和 bindProducer 方法的实现过程。Spring Cloud Stream 中 Binder 接口的类层关系中，除了 AbstractBinder、AbstractMessageChannelBinder 等抽象类，还包括 spring-cloud-stream-binder-rabbit 代码工程中的 RabbitMessageChannelBinder 类，这个类在 Spring Cloud Stream 与 RabbitMQ 集成的部分具体展开。

Spring Cloud Stream 首先提供了一个 AbstractBinder 抽象类，其 bindConsumer 和 bindProducer 方法实现如下所示：

```java
@Override
public final Binding<T> bindConsumer(String name, String group, T target, C properties) {
        if (StringUtils.isEmpty(group)) {
            Assert.isTrue(!properties.isPartitioned(), "A consumer group is required for a partitioned subscription");
        }
        return doBindConsumer(name, group, target, properties);
}

protected abstract Binding<T> doBindConsumer(String name, String group, T inputTarget, C properties);

@Override
public final Binding<T> bindProducer(String name, T outboundBindTarget, P properties) {
        return doBindProducer(name, outboundBindTarget, properties);
}

protected abstract Binding<T> doBindProducer(String name, T outboundBindTarget, P properties);
```

可以看到，它对 Binder 接口中相关方法只提供了空实现，并把具体实现过程通过 doBindConsumer 和 doBindProducer 抽象方法交由子类完成。从设计模式上讲，AbstractBinder 应用了很典型的模板方法模式。

AbstractBinder 的子类是 AbstractMessageChannelBinder，它同样是一个抽象类。它的 doBindProducer 方法如下（已对核心语句进行提取和整理）：

```java
@Override
public final Binding<MessageChannel> doBindProducer(final String destination, MessageChannel outputChannel,
        final P producerProperties) throws BinderException {

…
final MessageHandler producerMessageHandler;
        final ProducerDestination producerDestination;
        try {
            producerDestination = this.provisioningProvider.provisionProducerDestination(destination,
                    producerProperties);
            SubscribableChannel errorChannel = producerProperties.isErrorChannelEnabled()
                    ? registerErrorInfrastructure(producerDestination) : null;
            producerMessageHandler = createProducerMessageHandler(producerDestination, producerProperties,
                    errorChannel);

…
postProcessOutputChannel(outputChannel, producerProperties);
        ((SubscribableChannel) outputChannel).subscribe(
                new SendingHandler(producerMessageHandler, HeaderMode.embeddedHeaders
                        .equals(producerProperties.getHeaderMode()), this.headersToEmbed,
	             producerProperties.isUseNativeEncoding()));

Binding<MessageChannel> binding = new DefaultBinding<MessageChannel>(destination, null, outputChannel,
                producerMessageHandler instanceof Lifecycle ? (Lifecycle) producerMessageHandler : null) {
	…
};

        doPublishEvent(new BindingCreatedEvent(binding));
        return binding;
}
```

上述代码的核心逻辑在于：Source 里的 output 发送消息到 outputChannel 通道之后，会被 SendingHandler 这个 MessageHandler 进行处理。从设计模式上讲，SendingHandler 是一个静态代理类，它又将处理过程委托给了由 createProducerMessageHandler 方法所创建的 producerMessageHandler。这一点从 SendingHandler 的定义中可以得到验证——如下所示的 delegate 就是传入的 producerMessageHandler：

```java
private final class SendingHandler extends AbstractMessageHandler implements Lifecycle {

private final MessageHandler delegate;

@Override
        protected void handleMessageInternal(Message<?> message) throws Exception {
            Message<?> messageToSend = (this.useNativeEncoding) ? message
                    : serializeAndEmbedHeadersIfApplicable(message);
            this.delegate.handleMessage(messageToSend);
        }

        // 省略其他方法
}
```

需要注意：作为模板方法类，AbstractMessageChannelBinder 具有三个抽象方法，即 createProducerMessageHandler、postProcessOutputChannel 和 afterUnbindProducer，这三个方法都需要由它的子类实现。也就是说，SendingHandler 所使用的 producerMessageHandler 需要由 AbstractMessageChannelBinder 子类负责创建。

另外，作为统一的数据模型，SendingHandler 以及 producerMessageHandler 中使用的都是 Spring Messaging 组件中的 Message 消息对象，而 createProducerMessageHandler 内部会把这个 Message 消息对象转换成对应中间件的消息数据格式并进行发送。

转到消息消费的场景，AbstractMessageChannelBinder 的 doBindConsumer 方法的核心语句是创建一个消费者端点 ConsumerEndpoint：

```java
MessageProducer consumerEndpoint = createConsumerEndpoint(destination, group, properties);
consumerEndpoint.setOutputChannel(inputChannel);
```

这两行代码有两个注意点。首先，createConsumerEndpoint 是一个抽象方法，需要 AbstractMessageChannelBinder 的子类实现。与 createProducerMessageHandler 一样，createConsumerEndpoint 需要把中间件对应的消息数据结构转换成 Spring Messaging 中统一的 Message 消息对象。

其次，这里的 consumerEndpoint 类型是 MessageProducer。MessageProducer 在 Spring Integration 中代表消息的生产者，它会把从第三方消息中间件中收到的消息转发到 inputChannel 所指定的通道中。基于 @StreamListener 注解，Spring Cloud Stream 中存在一个 StreamListenerMessageHandler 类，用于订阅 inputChannel 消息通道中传入的消息并进行消费。

**整个消息发送和消费流程可以概括为**：发送侧由 Source 通过 output 通道发出消息，经 SendingHandler 委托 producerMessageHandler 转换并写入消息中间件；消费侧由中间件经 ConsumerEndpoint 转换为统一的 Message 投递到 input 通道，再由 @StreamListener 对应的 StreamListenerMessageHandler 完成消费。

## Spring Cloud Stream 集成 RabbitMQ

Spring Cloud Stream 提供了对 RabbitMQ 和 Kafka 这两款主流消息中间件的集成。本节以 RabbitMQ 为例，讲解如何通过 Spring Cloud Stream 提供的 Binder 完成与具体消息中间件的整合。

Spring Cloud Stream 团队提供了 spring-cloud-stream-binder-rabbit 作为与 RabbitMQ 集成的代码工程。这个工程只有四个类，重点关注的是实现了 AbstractMessageChannelBinder 中几个抽象方法的 RabbitMessageChannelBinder 类。

### 集成消息发送

RabbitMessageChannelBinder 中的 createProducerMessageHandler 方法用于完成消息的发送，其中的核心代码如下：

```java
final AmqpOutboundEndpoint endpoint = new AmqpOutboundEndpoint(         buildRabbitTemplate(producerProperties.getExtension(), errorChannel != null));
endpoint.setExchangeName(producerDestination.getName());
```

首先，在 buildRabbitTemplate 方法中可以看到 RabbitTemplate 的构建过程。RabbitTemplate 是 Spring Amqp 组件中提供的专门用于封装与 RabbitMQ 底层交互 API 的模板类，构建 RabbitTemplate 的整个过程中涉及设置与 RabbitMQ 相关的 ConnectionFactory 等众多参数。

其次，RabbitMessageChannelBinder 直接集成了 Spring Integration 中用于整合 AMQP 协议的 AmqpOutboundEndpoint。AmqpOutboundEndpoint 提供了如下所示的 send 方法进行消息的发送：

```java
private void send(String exchangeName, String routingKey,
            final Message<?> requestMessage, CorrelationData correlationData) {
        if (this.amqpTemplate instanceof RabbitTemplate) {
            MessageConverter converter = ((RabbitTemplate) this.amqpTemplate).getMessageConverter();
            org.springframework.amqp.core.Message amqpMessage = MappingUtils.mapMessage(requestMessage, converter,
                    getHeaderMapper(), getDefaultDeliveryMode(), isHeadersMappedLast());
            addDelayProperty(requestMessage, amqpMessage);
            ((RabbitTemplate) this.amqpTemplate).send(exchangeName, routingKey, amqpMessage, correlationData);
        }
        else {
            this.amqpTemplate.convertAndSend(exchangeName, routingKey, requestMessage.getPayload(),
                    message -> {
                        getHeaderMapper().fromHeadersToRequest(requestMessage.getHeaders(),
                                message.getMessageProperties());
                        return message;
                    });
        }
}
```

这里依赖 Spring Amqp 提供的 AmqpTemplate 接口进行消息的发送，RabbitTemplate 是 AmqpTemplate 的一个实现类。同时，通过 Spring Integration 组件中提供的 MessageConverter 工具类完成了从 org.springframework.messaging.Message 到 org.springframework.amqp.core.Message 这两个消息数据结构之间的转换。

### 集成消息消费

RabbitMessageChannelBinder 中与消息消费相关的是 createConsumerEndpoint 方法。这个方法大量使用了 Spring Amqp 和 Spring Integration 中的工具类，最终返回的是一个 AmqpInboundChannelAdapter 对象。在 Spring Integration 中，AmqpInboundChannelAdapter 是一种 InboundChannelAdapter，代表面向输入的通道适配器，提供了消息监听功能：

```java
protected class Listener implements ChannelAwareMessageListener, RetryListener {
        @Override
        public void onMessage(final Message message, final Channel channel) throws Exception {

        //省略相关实现
	 }
}
```

在 onMessage 方法中，调用了 createAndSend 方法完成消息的创建和发送：

```java
private void createAndSend(Message message, Channel channel) {
            org.springframework.messaging.Message<Object> messagingMessage = createMessage(message, channel);
            setAttributesIfNecessary(message, messagingMessage);
            sendMessage(messagingMessage);
}

private org.springframework.messaging.Message<Object> createMessage(Message message, Channel channel) {
            Object payload = AmqpInboundChannelAdapter.this.messageConverter.fromMessage(message);
            Map<String, Object> headers = AmqpInboundChannelAdapter.this.headerMapper
                    .toHeadersFromRequest(message.getMessageProperties());
            if (AmqpInboundChannelAdapter.this.messageListenerContainer.getAcknowledgeMode()
                    == AcknowledgeMode.MANUAL) {
                headers.put(AmqpHeaders.DELIVERY_TAG, message.getMessageProperties().getDeliveryTag());
                headers.put(AmqpHeaders.CHANNEL, channel);
            }
            if (AmqpInboundChannelAdapter.this.retryTemplate != null) {
                headers.put(IntegrationMessageHeaderAccessor.DELIVERY_ATTEMPT, new AtomicInteger());
            }
            final org.springframework.messaging.Message<Object> messagingMessage = getMessageBuilderFactory()
                    .withPayload(payload)
                    .copyHeaders(headers)
                    .build();
            return messagingMessage;
}
```

在上述 createMessage 方法中，完成了消息数据格式从 org.springframework.amqp.core.Message 到 org.springframework.messaging.Message 的反向转换。

## 小结

Binder 是 Spring Cloud Stream 的核心组件，Spring Cloud Stream 通过这个组件完成与第三方消息中间件的集成。围绕 Binder 的核心类协作关系如下：

- **BindableProxyFactory**：@EnableBinding 接口的工厂类，兼作方法拦截器，通过 inputHolders/outputHolders 与 targetCache 管理 Input/Output 目标对象（MessageChannel）。
- **BindingService**：外观类，把绑定动作委托给 Binder；doBindProducer 中通过 getBinder 获取 Binder 实例并完成绑定。
- **BinderFactory/DefaultBinderFactory**：工厂模式创建并缓存 Binder 实例，从 Spring 容器中获取实现了 Binder 接口的 bean。
- **AbstractBinder → AbstractMessageChannelBinder**：模板方法模式；发送侧由子类实现 createProducerMessageHandler，经 SendingHandler 静态代理写入中间件；消费侧由子类实现 createConsumerEndpoint，经 MessageProducer 将统一 Message 投递到 input 通道，由 @StreamListener 的 StreamListenerMessageHandler 消费。
- **RabbitMessageChannelBinder**（spring-cloud-stream-binder-rabbit）：发送侧封装 RabbitTemplate + AmqpOutboundEndpoint，用 MessageConverter 完成 Message ↔ AMQP Message 的双向转换；消费侧通过 AmqpInboundChannelAdapter 监听并转换为统一 Message。

## 版本差异（Spring Cloud 旧版 → 2025.x）

| 组件 | 旧版（本文编写时） | 当前（Spring Cloud 2025.x / Boot 3.5.x） |
|------|-------------------|------------------------------------------|
| 服务注册 | Eureka 1.x（Eureka 2.x 已终止开发） | Nacos 2.x / Consul（Eureka 1.x 仍随 Spring Cloud Netflix 维护） |
| 负载均衡 | Ribbon（已停止维护） | Spring Cloud LoadBalancer |
| 网关 | Zuul 1.x（已停止维护） | Spring Cloud Gateway（基于 WebFlux） |
| 熔断 | Hystrix（已停止维护） | Resilience4j / Sentinel |
| 配置中心 | Spring Cloud Config | Nacos Config / Apollo |
| 版本对应 | Hoxton/2020.x + Boot 2.x + JDK 8 | 2025.x + Boot 3.5.x + JDK 17+ |

> 本文基于 Spring Cloud 旧版（Hoxton/2020.x 时代）编写。Hystrix、Ribbon、Zuul 1.x、Eureka 已停止维护，新项目请使用 Spring Cloud Gateway + LoadBalancer + Resilience4j（或 Alibaba 系 Nacos/Sentinel/Seata），并升级到 Spring Cloud 2025.x + Spring Boot 3.5.x。

## 相关阅读

本篇剖析 Stream 集成 RabbitMQ/Kafka 的实现原理;各中间件的可靠性机制与幂等、积压治理的深潜见 [13-消息队列导航](../../13-消息队列/00-导航.md),消息消费落库与数据库一致性配合见 [12-数据库总览](../../12-数据库/00-数据库.md)。
