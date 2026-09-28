---
title: "React-Redux"
description: 讲解 React-Redux 的用法与原理：Provider 注入 Store、connect 的四个参数、Subscription 层层订阅模型与 connect 控制更新流程，并实践状态共享与组件通信两种场景。
keywords: [React-Redux]
category: React
tags: [React, 状态管理与路由]
---

# React-Redux

## 学习目标

- 掌握 React-Redux用法
- 掌握 用法简介
- 掌握 实践一：React-Redux实现状态共享

## React-Redux用法

> ⚠️ **版本说明**：本文以 `connect` 高阶组件为主线讲解 React-Redux 的工作原理。现代 React-Redux（v8/v9）与 Redux 官方更推荐 **Redux Toolkit（`createSlice` / `configureStore`）+ Hooks 写法（`useSelector` / `useDispatch`）**，`connect` 仍然受支持但属于旧式写法，适合用于理解原理。

React-Redux 是沟通 React 和 Redux 的桥梁，它主要功能体现在如下两个方面：

* 1 接受 Redux 的 Store，并把它合理分配到所需要的组件中。
* 2 订阅 Store 中 state 的改变，促使消费对应的 state 的组件更新。

### 1 用法简介

#### Provider

由于 redux 数据层，可能被很多组件消费，所以 react-redux 中提供了一个 Provider 组件，可以全局注入 redux 中的 store ，所以使用者需要把 Provider 注册到根部组件中。

* Provider 作用就是保存 redux 中的 store ，分配给所有需要 state 的子孙组件。

例子🌰：

````js
export default function Root(){
  return <Provider store={Store} >
      <Index />
  </Provider>
}
````

#### connect

既然已经全局注入了 Store ，那么需要 Store 中的状态或者想要改变Store的状态，那么如何处理呢，React-Redux 提供了一个高阶组件connect，被 connect 包装后组件将获得如下功能：

* 1 能够从 props 中获取改变 state 的方法 Store.dispatch 。
* 2 如果 connect 有第一个参数，那么会将 redux state 中的数据，映射到当前组件的 props 中，子组件可以使用消费。
* 3 当需要的 state ，有变化的时候，会通知当前组件更新，重新渲染视图。

开发者可以利用 connect 提供的功能，做数据获取，数据通信，状态派发等操作。首先来看看 connect 用法。

````js
function connect(mapStateToProps?, mapDispatchToProps?, mergeProps?, options?)
````

**①mapStateToProps**
````js
const mapStateToProps = state => ({ number: state.number })
````
* 组件依赖 redux 的 state，映射到业务组件的 props 中，state 改变触发，业务组件 props 改变，触发业务组件更新视图。当这个参数没有的时候，当前组件不会订阅 store 的改变。

**②mapDispatchToProps**

````js
const mapDispatchToProps = dispatch => {
  return {
    numberAdd: () => dispatch({ type: 'ADD' }),
    setInfo: () => dispatch({ type: 'SET' }),
  }
}
````
* 将 redux 中的 dispatch 方法，映射到业务组件的 props 中。比如将如上 demo 中的两个方法映射到 props ，变成了 numberAdd ， setInfo 方法。

**③mergeProps**

````js
/*
* stateProps , state 映射到 props 中的内容
* dispatchProps， dispatch 映射到 props 中的内容。
* ownProps 组件本身的 props
*/
(stateProps, dispatchProps, ownProps) => Object
````
正常情况下，如果没有这个参数，会按照如下方式进行合并，返回的对象可以是，可以自定义的合并规则，还可以附加一些属性。

````js
{ ...ownProps, ...stateProps, ...dispatchProps }
````

**④options**

````js
{
  context?: Object,   // 自定义上下文
  pure?: boolean, // 默认为 true , 当为 true 的时候 ，除了 mapStateToProps 和 props ,其他输入或者state 改变，均不会更新组件。
  areStatesEqual?: Function, // 当pure true , 比较引进store 中state值 是否和之前相等。 (next: Object, prev: Object) => boolean
  areOwnPropsEqual?: Function, // 当pure true , 比较 props 值, 是否和之前相等。 (next: Object, prev: Object) => boolean
  areStatePropsEqual?: Function, // 当pure true , 比较 mapStateToProps 后的值 是否和之前相等。  (next: Object, prev: Object) => boolean
  areMergedPropsEqual?: Function, // 当 pure 为 true 时， 比较 经过 mergeProps 合并后的值 ， 是否与之前等  (next: Object, prev: Object) => boolean
  forwardRef?: boolean, //当为true 时候,可以通过ref 获取被connect包裹的组件实例。
}
````
如上标注了 options 属性每一个的含义。并且讲解了 react-redux 的基本用法，接下来简单实现 react-redux 的两个功能。

### 2 实践一：React-Redux实现状态共享

````js
export default function Root(){
  React.useEffect(()=>{
    Store.dispatch({ type:'ADD'})
    Store.dispatch({ type:'SET',payload:{ name:'alien' , mes:'let us learn React!'  } })
  },[])
  return <Provider store={Store} >
      <Index />
  </Provider>
}
````
* 通过在根组件中注入 store ，并在 useEffect 中改变 state 内容。

然后在整个应用中在想要获取数据的组件里，获取 state 中的内容。

````js
import { connect } from 'react-redux'


class Index extends React.Component {
    componentDidMount() { }
    render() {
         const { info , number } = this.props
        return <div >
            <p>  {info.name ? `hello, my name is ${info.name}` : 'what is your name'} ,
          {info.mes ? info.mes : ' what do you say? '} </p>
        《React进阶实践指南》 {number} 👍 <br />
        </div>
    }
}

const mapStateToProps = state => ({ number: state.number, info: state.info })

export default connect(mapStateToProps)(Index)
````
* 通过 mapStateToProps 获取指定 state 中的内容，然后渲染视图。

### 3 实践二：React-Redux实现组件通信

接下来可以用 React-Redux 模拟一个组件通信的场景。

**组件A**
````js
function ComponentA({ toCompB, compBsay }) { /* 组件A */
  const [CompAsay, setCompAsay] = useState('')
  return <div className="box" >
    <p>我是组件A</p>
    <div> B组件对我说：{compBsay} </div>
        我对B组件说：<input placeholder="CompAsay" onChange={(e) => setCompAsay(e.target.value)} />
    <button onClick={() => toCompB(CompAsay)} >确定</button>
  </div>
}
/* 映射state中CompBsay  */
const CompAMapStateToProps = state => ({ compBsay: state.info.compBsay })
/* 映射toCompB方法到props中 */
const CompAmapDispatchToProps = dispatch => ({ toCompB: (mes) => dispatch({ type: 'SET', payload: { compAsay: mes } }) })
/* connect包装组件A */
export const CompA = connect(CompAMapStateToProps, CompAmapDispatchToProps)(ComponentA)
````
* 组件 A 通过 mapStateToProps，mapDispatchToProps，分别将state 中的 compBsay 属性，和改变 state 的 compAsay 方法，映射到 props 中。

**组件B**

````js
class ComponentB extends React.Component { /* B组件 */
  state={ compBsay:'' }
  handleToA=()=>{
     this.props.dispatch({ type: 'SET', payload: { compBsay: this.state.compBsay } })
  }
  render() {
    return <div className="box" >
      <p>我是组件B</p>
      <div> A组件对我说：{ this.props.compAsay } </div>
       我对A组件说：<input placeholder="CompBsay" onChange={(e)=> this.setState({ compBsay: e.target.value  }) }  />
      <button  onClick={ this.handleToA } >确定</button>
    </div>
  }
}
/* 映射state中 CompAsay  */
const CompBMapStateToProps = state => ({ compAsay: state.info.compAsay })
export const CompB =  connect(CompBMapStateToProps)(ComponentB)
````

*  B 组件和 A 组件差不多，通过触发 dispatch 向组件 A 传递信息，同时接受 B 组件的信息。

## React-Redux原理

对于 React-Redux 原理，我按照功能组成，大致分为三部分，接下来将按照这三部分逐一击破：

### 第一部分： Provider注入Store

> react-redux/src/components/Provider.js
````js
const ReactReduxContext =  React.createContext(null)
function Provider({ store, context, children }) {
   /* 利用useMemo，根据store变化创建出一个contextValue 包含一个根元素订阅器和当前store  */ 
  const contextValue = useMemo(() => {
      /* 创建了一个根级 Subscription 订阅器 */
    const subscription = new Subscription(store)
    return {
      store,
      subscription
    } /* store 改变创建新的contextValue */
  }, [store])
  useEffect(() => {
    const { subscription } = contextValue
    /* 触发trySubscribe方法执行，创建listens */
    subscription.trySubscribe() // 发起订阅
    return () => {
      subscription.tryUnsubscribe()  // 卸载订阅
    } 
  }, [contextValue])  /*  contextValue state 改变触发新的 effect */
  const Context = ReactReduxContext
  return <Context.Provider value={contextValue}>{children}</Context.Provider>
}
````

这里保留了核心的代码。从这段代码，从中可以分析出 Provider 做了哪些事。
* 1 首先知道 React-Redux 是通过 context 上下文来保存传递 Store 的，但是上下文 value 保存的除了 Store 还有 subscription 。
* 2 subscription 可以理解为订阅器，在 React-redux 中一方面用来订阅来自 state 变化，另一方面通知对应的组件更新。在 Provider 中的订阅器 subscription 为根订阅器，
* 3 在 Provider 的 useEffect 中，进行真正的绑定订阅功能，其原理内部调用了 store.subscribe ，只有根订阅器才会触发store.subscribe，至于为什么，马上就会讲到。


### 第二部分： Subscription订阅器

> react-redux/src/utils/Subscription.js
````js
/* 发布订阅者模式 */
export default class Subscription {
  constructor(store, parentSub) {
  //....
  }
  /* 负责检测是否该组件订阅，然后添加订阅者也就是listener */
  addNestedSub(listener) {
    this.trySubscribe()
    return this.listeners.subscribe(listener)
  }
  /* 向listeners发布通知 */
  notifyNestedSubs() {
    this.listeners.notify()
  }
  /* 开启订阅模式 首先判断当前订阅器有没有父级订阅器 ， 如果有父级订阅器(就是父级Subscription)，把自己的handleChangeWrapper放入到监听者链表中 */
  trySubscribe() {
    /*
    parentSub  即是provide value 里面的 Subscription 这里可以理解为 父级元素的 Subscription
    */
    if (!this.unsubscribe) {
      this.unsubscribe = this.parentSub
        ? this.parentSub.addNestedSub(this.handleChangeWrapper)
        /* provider的Subscription是不存在parentSub，所以此时trySubscribe 就会调用 store.subscribe   */
        : this.store.subscribe(this.handleChangeWrapper)
      this.listeners = createListenerCollection()
    }
  }
  /* 取消订阅 */
  tryUnsubscribe() {
     //....
  }
}
````
整个订阅器的核心，我浓缩提炼成8个字：**层层订阅，上订下发**。

**层层订阅**：React-Redux 采用了层层订阅的思想，上述内容讲到 Provider 里面有一个 Subscription ，提前透露一下，每一个用 connect 包装的组件，内部也有一个 Subscription ，而且这些订阅器一层层建立起关联，Provider中的订阅器是最根部的订阅器，可以通过 trySubscribe 和 addNestedSub 方法可以看到。还有一个注意的点就是，如果父组件是一个 connect ，子孙组件也有 connect ，那么父子 connect 的 Subscription 也会建立起父子关系。

**上订下发**：在调用 trySubscribe 的时候，能够看到订阅器会和上一级的订阅器通过 addNestedSub 建立起关联，当 store 中 state 发生改变，会触发 store.subscribe ，但是只会通知给 Provider 中的根Subscription，根 Subscription 也不会直接派发更新，而是会下发给子代订阅器（ connect 中的 Subscription ），再由子代订阅器，决定是否更新组件，层层下发。


## 面试要点

问：为什么 React-Redux 会采用 subscription 订阅器进行订阅，而不是直接采用 store.subscribe 呢 ？

* 1 首先 state 的改变，Provider 是不能直接下发更新的，如果下发更新，那么这个更新是整个应用层级上的，还有一点，如果需要 state 的组件，做一些性能优化的策略，那么该更新的组件不会被更新，不该更新的组件反而会更新了。

* 2 父 Subscription -> 子 Subscription 这种模式，可以逐层管理 connect 的状态派发，不会因为 state 的改变而导致更新的混乱。

### 第三部分： connect控制更新

由于connect中的代码过于复杂，我这里只保留核心的流程，而且对代码进行简化处理。

> react-redux/src/components/connectAdvanced.js
````js
function connect(mapStateToProps,mapDispatchToProps){
    const Context = ReactReduxContext
    /* WrappedComponent 为connect 包裹的组件本身  */   
    return function wrapWithConnect(WrappedComponent){
        function createChildSelector(store) {
          /* 选择器  合并函数 mergeprops */
          return selectorFactory(store.dispatch, { mapStateToProps,mapDispatchToProps })
        }
        /* 负责更新组件的容器 */
        function ConnectFunction(props){
          /* 获取 context内容 里面含有 redux中store 和父级subscription */
          const contextValue = useContext(ContextToUse)
          /* 创建子选择器,用于提取state中的状态和dispatch映射，合并到props中 */
          const childPropsSelector = createChildSelector(contextValue.store)
          const [subscription, notifyNestedSubs] = useMemo(() => {
            /* 创建一个子代Subscription，并和父级subscription建立起关系 */
            const subscription = new Subscription(
              store,
              didStoreComeFromProps ? null : contextValue.subscription // 父级subscription，通过这个和父级订阅器建立起关联。
            )
             return [subscription, subscription.notifyNestedSubs]
            }, [store, didStoreComeFromProps, contextValue])

            /* 合成的真正的props */
            const actualChildProps = childPropsSelector(store.getState(), wrapperProps)
            const lastChildProps = useRef()
            /* 更新函数 */
            const [ forceUpdate, ] = useState(0)
            useEffect(()=>{
                const checkForUpdates =()=>{
                   newChildProps = childPropsSelector()
                  if (newChildProps === lastChildProps.current) { 
                      /* 订阅的state没有发生变化，那么该组件不需要更新，通知子代订阅器 */
                      notifyNestedSubs() 
                  }else{
                     /* 这个才是真正的触发组件更新的函数 */
                     forceUpdate(state=>state+1)
                     lastChildProps.current = newChildProps /* 保存上一次的props */
                  }
                }
                subscription.onStateChange = checkForUpdates
                //开启订阅者 ，当前是被connect 包转的情况 会把 当前的 checkForceUpdate 放在存入 父元素的addNestedSub中 ，一点点向上级传递 最后传到 provide 
                subscription.trySubscribe()
                /* 先检查一遍，反正初始化state就变了 */
                checkForUpdates()
            },[store, subscription, childPropsSelector])

             /* 利用 Provider 特性逐层传递新的 subscription */
            return  <ContextToUse.Provider value={{  ...contextValue, subscription}}>
                 <WrappedComponent  {...actualChildProps}  />
            </ContextToUse.Provider>  
          }
          /* memo 优化处理 */
          const Connect = React.memo(ConnectFunction) 
        return hoistStatics(Connect, WrappedComponent)  /* 继承静态属性 */
    }
}
````
connect 的逻辑还是比较复杂的，我总结一下核心流程。

* 1  connect 中有一个 selector 的概念，selector 有什么用？就是通过 mapStateToProps ，mapDispatchToProps ，把 redux 中 state 状态合并到 props 中，得到最新的 props 。
* 2 上述讲到过，每一个 connect 都会产生一个新的 Subscription ，和父级订阅器建立起关联，这样父级会触发子代的 Subscription 来实现逐层的状态派发。
* 3 有一点很重要，就是 Subscription 通知的是 checkForUpdates 函数，checkForUpdates 会形成新的 props ，与之前缓存的 props 进行浅比较，如果不想等，那么说明 state 已经变化了，直接触发一个 useReducer 来更新组件，上述代码片段中，我用 useState 代替 useReducer 了，如果相等，那么当前组件不需要更新，直接通知子代 Subscription ，检查子代 Subscription 是否更新，完成整个流程。


## 实现异步

基于 redux 异步的库有很多，最简单的 `redux-thunk` ，代码量少，只有几行，其中大量的逻辑需要开发者实现，还有比较复杂的 `redux-saga` ，基于 `generator` 实现，用起来稍微繁琐。（在使用 Redux Toolkit 的现代项目中，推荐直接使用其内置的 `createAsyncThunk` 处理异步逻辑。）

对于完整的状态管理生态，大家可以尝试一下 `dvajs` ，它是基于 redux-saga 基础上，实现的异步的状态管理工具。dvajs 处理 reducers 也比较精妙，感兴趣的同学可以研究一下。

## 总结

通过本章节的学习，应该已经掌握以下内容：

* 1 Redux 的基本概念和常用 API 。
* 2 react-redux 基本用法，以及两种常用场景的实践 demo 。
* 3 react-redux 原理实现。

下一节将学习 React 状态管理的另外一种方式 Mobx 。

## 继续阅读

- 上一篇：[00-React-Router](00-React-Router)
- 下一篇：[02-React-Mobx](02-React-Mobx)
