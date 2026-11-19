---
title: "KeepAlive实现"
description: "React 缓存组件 KeepAlive 实现：KeepaliveScope 作用域、KeepaliveItem 缓存项与 useCacheDestroy 清除缓存 api 的设计思想、架构状态机与具体实现。"
keywords: [KeepAlive实现]
category: React
tags: [React, 组件与实战]
---

# KeepAlive实现

## 设计思想

### 如何使用

缓存组件的理想使用方案类似 vue 中的 `<keepalive>` 组件：通过该组件包裹的元素就获得了缓存的功能。

````js
<keepalive>
   <custom-component />
</keepalive>
````

因此在业务代码中期望这样实现缓存组件功能：

````js
/* 注册一个缓存组件。 */
<KeepaliveItem cacheId="demo"  >
  <CustomComponent >
</KeepaliveItem>
````

通过 KeepaliveItem 注册一个缓存组件，需要设置一个**缓存 id**，其用途见下文。

vue 的 keepalive 存在一个问题：**不能主动清除 keepalive 状态**，比如无法通过一个按钮让某个 keepalive 的组件取消缓存。为了让工具更灵活，可以提供一个清除缓存的 api，使用方式类似 React Router 中 useNavigate 这样的自定义 hooks。这个 api 采用自定义 hooks 的形式：

````js
export default function (props){
  const destroy = useCacheDestroy()
  return <button onClick={() => destroy('demo')} ></button>
}
````

通过 useCacheDestroy 获取清除缓存的方法 destroy，缓存 id 在这里派上用场：destroy 用这个 id 指向需要清除缓存的组件，代码中清除的是 cacheId="demo" 的组件。

还有一个问题：缓存的状态需要统一保存起来，比如通过自定义 hooks useCacheDestroy 获取的清除缓存函数 destroy。这些缓存状态要能在整个 React 应用的每个节点上获取到，因此需要一个作用域 Scope 的概念：作用域中的任何子节点都可以进行缓存、清除缓存、获取缓存状态。类似 react-redux 的 Provider、react-router 中的 Router，需要在根组件中注册一个容器：

````js
<Provider {...store}>
    <KeepaliveScope>
        <App />
    </KeepaliveScope>
</Provider>
````

这个容器不仅提供全局状态，还承担缓存组件的实际渲染（后文展开）。综上，这个工具库至少有三个对外的 api：

* 1 一个缓存组件的容器 KeepaliveItem。
* 2 一个全局的管理作用域 KeepaliveScope。
* 3 一个可以清除缓存的自定义 hooks useCacheDestroy。

### 核心原理

缓存到底需要缓存哪些东西？用一个状态控制组件的挂载与卸载：

````js
{ isShow && <KeepaliveItem cacheId="demo"><Component /></KeepaliveItem> }
````

本质上在 isShow 切换时，Component 组件要处于'存活'状态，Component 内部的真实 DOM 元素也要保存下来，两者缺一不可。如果只保存了 DOM 而没有保持组件'存活'，此时的 keepalive 只是一个快照。所以这个功能必须解决两个要素：

* 第一个问题：切换 isShow 的时候，并没有卸载真正的组件，组件还要保持'存活'的状态。
* 第二个问题：组件没有被卸载，那么 fiber 就仍然存在，包括上面的 DOM 元素也是存在的，但是不能够让元素显示。

**控制 DOM 元素显示与隐藏**

先看第二个问题：如何让元素不显示。通过 [Commit 全流程](../02-原理与源码/13-Commit全流程) 可以了解到，当 fiber 类型为 OffscreenComponent 的时候，就视为这个组件是可以 keepalive 的。React 处理元素显示与隐藏的方式如下。

比如一个元素是 HostComponent（即 DOM 元素类型的 fiber）：

````js
if (isHidden) {
    /* 隐藏元素 */
    hideInstance(instance);
} else {
    /* 显示元素 */
    unhideInstance(node.stateNode, node.memoizedProps);
}
````

隐藏元素调用 hideInstance 方法，显示元素调用 unhideInstance：

````js
function hideInstance(instance){
    instance = instance;
    var style = instance.style; /* 获取元素 style */
    /* 设置元素的 style 的 display 属性为 none */
    if (typeof style.setProperty === 'function') {
        style.setProperty('display', 'none', 'important');
    } else {
        style.display = 'none';
    }
}
````

* 元素隐藏时，本质上是设置元素的 style 的 display 属性为 none。

````js
function unhideInstance(instance, props) {
  instance = instance;
  var styleProp = props[STYLE$1];
  var display = styleProp !== undefined && styleProp !== null && styleProp.hasOwnProperty('display') ? styleProp.display : null;
  instance.style.display = dangerousStyleValue('display', display);
}
````

* 元素显示时，把 display 恢复到之前的属性上。

React 的实现方式给出一个明确思路：可以通过控制元素的 display 为 none 和 block，来控制元素的隐藏与显示。display:none 可以让元素消失在 css 和 html 合成的布局树中，直观感受就是组件消失了。

**保持 React 组件状态存活**

回到第一个问题：如何保持组件的存活。正常情况下结构是这样的：

````js
function Index(){
    const [ isShow, setShow ] = React.useState(true)
    return <div>
        <Head />
        <Nav />
        { isShow && <Content /> }
        <button onClick={() => setShow(true) } >显示</button>
        <button onClick={() => setShow(false)} >隐藏</button>
    </div>
}
````

点击按钮 `隐藏` 时，isShow 状态变成 false，Content 组件会被正常销毁。如果组件通过缓存组件缓存，变成这样：

````js
{ isShow && <KeepaliveItem cacheId="demo"><Content /></KeepaliveItem> }
````

那么 KeepaliveItem 组件也会被卸载（这不可避免）：如果 Content 是 KeepaliveItem 的子元素节点，KeepaliveItem 的卸载会导致所有子元素被卸载，保持 Content 的存活就不可能实现了。

解决方案：让 Content 组件在 KeepaliveItem 之外渲染。前面提到整个应用外层有一个缓存状态的作用域 KeepaliveScope，把 context 交给 KeepaliveScope 去渲染挂载，就不会担心 KeepaliveItem 被卸载导致 context 也被卸载。本质结构如下：

````js
<KeepaliveScope>
    <div>
        <Head />
        <Nav />
        { isShow && <KeepaliveItem cacheId="demo"><Content /></KeepaliveItem> }
        <button onClick={() => setShow(true) } >显示</button>
        <button onClick={() => setShow(false)} >隐藏</button>
    </div>
</KeepaliveScope>
````

KeepaliveItem 组件渲染时，Content 会被 React.createElement 创建成 element 对象，能够在 KeepaliveItem 中通过 children 属性获取到。

关键一步：**children 不要在 KeepaliveItem 中直接渲染，而是把 children（Content 对应的 element 对象）交给 KeepaliveScope。**

KeepaliveScope 拿到 Content 的 element 对象后直接渲染，此时 Content 组件对应的 DOM 元素就会存在了。

**回传 DOM 元素**

有了真实的 DOM 元素后还有一个问题：正常情况下 Content 产生的 DOM 应该在 KeepaliveItem 位置渲染，但这里交给了 KeepaliveScope 去渲染，DOM 元素会脱离之前的位置；如果一些 css 属性是通过父级选择器添加的，样式也就无法加上。针对这个问题，需要把在 KeepaliveScope 中渲染的 DOM 元素回传给 KeepaliveItem。

**卸载元素，控制元素隐藏**

如果卸载 KeepaliveItem，由于此时的 dom 还在 KeepaliveItem 中，首先需要把元素回到 KeepaliveScope 上；此时 dom 还是显示状态，需要隐藏元素，即设置 display 属性为 none。

**再次挂载元素，重新激活组件**

再次挂载组件时重复上面的流程，唯一不同的是 KeepaliveScope 不再需要初始化 Content 组件——Content 组件一直存活并没有卸载，此时要做的只是改变 display 状态，然后继续将 dom 传给重新挂载的 KeepaliveItem 组件。

### 架构设计

以上从初始化缓存组件挂载、组件卸载、组件再次激活三个方向介绍了缓存的实现思路。下面看这三个过程中核心的实现细节。

**缓存状态：**

用一个属性记录每一个 item 处于什么样的状态，好处有两点：

* 可以有效地管理好每一个缓存 item，通过状态来判断 item 应该处于哪种处理逻辑。
* 方便在每个状态上做一些额外的事情，比如给业务组件提供对应的生命周期。

状态 status 的定义如下：

* created 缓存创建状态。
* active 缓存激活状态。
* actived 激活完成状态。
* unActive 缓存休眠状态。
* unActived 休眠完成状态。
* destroy 摧毁状态。
* destroyed 完成摧毁缓存。

比如缓存组件初次加载用 created 状态表示；组件处于缓存激活状态用 active 表示；组件销毁时缓存组件应处于休眠状态，用 unActive 表示。

**初始化阶段：**

初始化时，首先在 KeepaliveScope 形成一个渲染列表，这个列表用于渲染真正需要缓存的组件，并给每一个缓存的 item 设置自己的状态。为什么每个 item 要有自己的状态？因为有的缓存组件不需要展现（unActive 状态），有的组件处于 active 状态，所以用一个属性 status 记录每一个 item 的状态。

每个 item 都需要一个'插桩'父元素节点：每一个 item 先渲染产生真实的 dom 元素，并且需要把 dom 元素回传给每一个 KeepaliveItem，用这个插桩元素可以非常方便地传递 dom 元素。这个元素不需要渲染在整个 React 应用根节点内部（渲染在应用内部可能造成样式上的问题），此时只需要通过 ReactDOM.createPortal 将元素渲染到 document.body 上就可以了。

**卸载组件阶段：**

KeepaliveItem 组件卸载时，KeepaliveItem 本身被卸载，但 item 组件因为在 Scope 内部挂载并不会销毁。由于组件不能再显示，接下来要做的是把 item 的状态设置为 unActive，把 dom 回传到 body 上，并把元素从布局树上隐藏，即把 display 属性设置为 none。

**再次挂载组件，启动缓存：**

再次挂载时，KeepaliveItem 可以通过 cacheId 向 Scope 查询组件是否缓存过。因为已经缓存过，所以直接使用 ScopeItem 的状态和 dom 元素就可以了。

## 具体实现

**demo 效果：**

为方便观察缓存效果，codesandbox 上有一个 demo 演示：

[react-keepalive-component-demo](https://codesandbox.io/s/keepalive-component-demo-9gcdko)

**demo 代码片段：**

````js
import React from "react";
import {
  KeepaliveItem,
  KeepaliveScope,
  useCacheDestroy
} from "react-keepalive-component";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate
} from "react-router-dom";

function CompForm() {
  const [value, setValue] = React.useState("");
  return (
    <div>
      <p>this is a form component</p>
      input content：{" "}
      <input value={value} onChange={(e) => setValue(e.target.value)} />
    </div>
  );
}

function Atom({ propsNumber }) {
  const [number, setNumber] = React.useState(0);
  return (
    <div>
      propsNumber:{propsNumber} | current:{number}
      <button onClick={() => setNumber(number + 1)}>add++</button>
      <button onClick={() => setNumber(number - 1)}>del--</button>
    </div>
  );
}

function CompNumber() {
  const [number, setNumber] = React.useState(0);
  const [isShow, setShow] = React.useState(true);
  return (
    <div>
      <p>this is a number component</p>
      {isShow && <Atom propsNumber={number} />}
      {isShow && (
         // 缓存 Atom 组件
        <KeepaliveItem cacheId="number_atom">
          <Atom propsNumber={number} />
        </KeepaliveItem>
      )}
      <button onClick={() => setShow(!isShow)}>
        atom {isShow ? "hidden" : "show"}
      </button>
      <br />
      <button onClick={() => setNumber(number + 1)}>add</button>
    </div>
  );
}

function CompText() {
  const destroy = useCacheDestroy();
  return (
    <div>
      component c
      {/* 销毁 cacheId = form 的组件 */}
      <button onClick={() => destroy("form")}>clean form cache</button>
    </div>
  );
}
/* 菜单栏组件 */
function Menus() {
  const navigate = useNavigate();
  return (
    <div>
      router:
      <button style={{ marginRight: "10px" }} onClick={() => navigate("/form")}>
        form
      </button>
      <button
        style={{ marginRight: "10px" }}
        onClick={() => navigate("/number")}
      >
        number
      </button>
      <button style={{ marginRight: "10px" }} onClick={() => navigate("/text")}>
        text
      </button>
    </div>
  );
}

export default function Index() {
  return (
    <Router>
      <Menus />
      <KeepaliveScope>
        <Routes>
          <Route
            element={
              // 缓存路由 /form
              <KeepaliveItem cacheId="form">
                <CompForm />
              </KeepaliveItem>
            }
            path="/form"
          />
          <Route element={<CompNumber />} path="/number" />
          <Route element={<CompText />} path="/text" />
        </Routes>
      </KeepaliveScope>
    </Router>
  );
}
````

以上是缓存组件和路由页面的基本用法，接下来是具体实现。

### KeepaliveScope

KeepaliveScope 具体实现：

````js
const KeepaliveContext = React.createContext({})

function Scope({ children }) {
    /* 产生一个 keepalive 列表的管理器 */
    const keeper = useKeep()
    const { cacheDispatch, cacheList, hasAliveStatus } = keeper
    /* children 组合模式 */
    const renderChildren = children
    /* 处理防止 Scope 销毁带来的问题。 */
    useEffect(() => {
        return function () {
            try {
                for (let key in beforeScopeDestroy) {
                    beforeScopeDestroy[key]()
                }
            } catch (e) { }
        }
    }, [])
    const contextValue = useMemo(() => {
        return {
            /* 增加缓存 item | 改变 keepalive 状态 | 清除 keepalive  */
            cacheDispatch: cacheDispatch.bind(keeper),
            /* 判断 keepalive 状态 */
            hasAliveStatus: hasAliveStatus.bind(keeper),
            /* 提供给 useCacheDestroy 使用 */
            cacheDestroy: (payload) => cacheDispatch.call(keeper, { type: ACTION_DESTROY, payload })
        }
    }, [keeper])
    return <KeepaliveContext.Provider value={contextValue}>
        {renderChildren}
        { /* 用一个列表渲染  */ }
        {cacheList.map(item => <ScopeItem {...item} dispatch={cacheDispatch.bind(keeper)} key={item.cacheId} />)}
    </KeepaliveContext.Provider>
}
````

KeepaliveScope 选用组合模式，props 接收参数，首先通过 useKeep 产生一个管理器，管理器管理着每一个缓存的 item 组件（useKeep 内部见下文）。KeepaliveScope 需要传递并管理每一个 keepaliveItem 的状态，所以通过 React Context 方式传递状态。这里有一个细节：为避免 KeepaliveScope 触发重新渲染而让 context 变化，造成订阅 context 的组件更新，这里用 useMemo 派生出 context 的 value 值。

接下来通过 cacheList 来渲染每一个缓存 ScopeItem，业务中的组件本质上在 item 中渲染并产生真实的 dom 结构。

### 状态管理器 useKeep

````js

export const ACITON_CREATED    = 'created'       /* 缓存创建 */
export const ACTION_ACTIVE     = 'active'        /* 缓存激活 */
export const ACTION_ACTIVED    = 'actived'       /* 激活完成 */
export const ACITON_UNACTIVE   = 'unActive'      /* 缓存休眠 */
export const ACTION_UNACTIVED  = 'unActived'     /* 休眠完成 */
export const ACTION_DESTROY    = 'destroy'       /* 设置摧毁状态 */
export const ACTION_DESTROYED  = 'destroyed'     /* 摧毁缓存 */
export const ACTION_CLEAR      = 'clear'         /* 清除缓存 */
export const ACTION_UPDATE     = 'update'        /* 更新组件 */

class Keepalive {
    constructor(setState, maxLimit) {
        this.setState = setState
        this.maxLimit = maxLimit
        this.cacheList = []
        this.kid = -1
    }
    /* 暴露给外部使用的切换状态的接口 */
    cacheDispatch ({
        type,
        payload
    }) {
        this[type] && this[type](payload)
        type !== ACITON_CREATED && this.setState({})
    }
    /* 获取每一个 item 的状态 */
    hasAliveStatus (cacheId) {
        const index = this.cacheList.findIndex(item => item.cacheId === cacheId)
        if(index >=0 ) return this.cacheList[index].status
        return null
    }
    /* 删掉缓存 item 组件 */
    destroyItem(payload){
        const index = this.cacheList.findIndex(item => item.cacheId === payload)
        if(index === -1 ) return
        if(this.cacheList[index].status === ACTION_UNACTIVED ){
             this.cacheList.splice(index,1)
        }
    }
    /* 更新 item 状态 */
    [ACTION_UPDATE](payload){
        const { cacheId, children } = payload
        const index = this.cacheList.findIndex(item => item.cacheId === cacheId)
        if(index === -1 ) return
        this.cacheList[index].updater = {}
        this.cacheList[index].children = children
    }
    /* 初始化状态，创建一个item */
    [ACITON_CREATED](payload) {
        const {
            children,
            load,
            cacheId
        } = payload
        const cacheItem = {
            cacheId: cacheId || this.getKid(),
            load,
            status: ACITON_CREATED,
            children,
            updater:{}
        }
        this.cacheList.push(cacheItem)
    }
    /* 正在销毁状态 */
    [ACTION_DESTROY](payload) {
        if (Array.isArray(payload)) {
             payload.forEach(this.destroyItem.bind(this))
        } else {
             this.destroyItem(payload)
        }
    }
    /* 正在激活状态 */
    [ACTION_ACTIVE](payload){
        const { cacheId, load } = payload
        const index = this.cacheList.findIndex(item => item.cacheId === cacheId)
        if(index === -1 ) return
        this.cacheList[index].status = ACTION_ACTIVE
        this.cacheList[index].load = load
    }
}
/* 激活完成状态，正在休眠状态，休眠完成状态 */
[ACITON_UNACTIVE, ACTION_ACTIVED, ACTION_UNACTIVED].forEach(status => {
    Keepalive.prototype[status] = function (payload) {
        for (let i = 0; i < this.cacheList.length; i++) {
            if (this.cacheList[i].cacheId === payload) {
                this.cacheList[i].status = status
                break
            }
        }
    }
})

export default function useKeep(CACHE_MAX_DEFAULT_LIMIT) {
    const keeper = React.useRef()
    const [, setKeepItems] = React.useState([])
    if (!keeper.current) {
        keeper.current = new Keepalive(setKeepItems, CACHE_MAX_DEFAULT_LIMIT)
    }
    return keeper.current
}
````

useKeep 本身是一个自定义 hooks：首先通过 new Keepalive 创建一个状态管理器，并用 useRef 来保存状态管理器；通过 useState 创建一个 update 函数 setKeepItems，用于更新每一个 item 状态（增、删、改）。

new Keepalive 状态管理器中通过 cacheDispatch 方法来改变 item 的状态，比如从激活状态到休眠状态，通过下发对应的 action 指令来让缓存组件切换状态。

### ScopeItem

KeepaliveScope 中管理着每一个 ScopeItem，ScopeItem 负责挂载真正的组件、形成真实 dom、回传 dom。

````js
const keepChange = (pre, next) => pre.status === next.status && pre.updater === next.updater
const beforeScopeDestroy = {}

const ScopeItem = memo(function ({ cacheId, updater, children, status, dispatch, load = () => { } }) {
    const currentDOM = useRef()
    const renderChildren = status === ACTION_ACTIVE || status === ACTION_ACTIVED || status === ACITON_UNACTIVE || status === ACTION_UNACTIVED ? children : () => null
    /* 通过 ReactDOM.createPortal 渲染组件，产生 dom 树结构 */
    const element = ReactDOM.createPortal(
        <div ref={currentDOM} style={{ display: status === ACTION_UNACTIVED ? 'none' : 'block' }} >
            {/* 当 updater 对象变化的时候，重新执行函数，更新组件。 */}
            {   useMemo(() => renderChildren(), [updater])  }
        </div>,
        document.body
    )
    /* 防止 Scope 销毁，找不到对应的 dom 而引发的报错 */
    useEffect(() => {
        beforeScopeDestroy[cacheId] = function () {
            if (currentDOM.current) document.body.appendChild(currentDOM.current)
        }
        return function () {
            delete beforeScopeDestroy[cacheId]
        }
    }, [])
    useEffect(() => {
        if (status === ACTION_ACTIVE) {
            /* 如果已经激活了，那么回传 dom  */
            load && load(currentDOM.current)
        } else if (status === ACITON_UNACTIVE) {
            /* 如果处于休眠状态，那么把 dom 元素重新挂载到 body 上 */
            document.body.appendChild(currentDOM.current)
            /* 然后下发指令，把状态变成休眠完成 */
            dispatch({
                type: ACTION_UNACTIVED,
                payload: cacheId
            })
        }
    }, [status])
    return element
}, keepChange)

````

ScopeItem 做的事情：

* 首先通过 ReactDOM.createPortal 来渲染真正想要缓存的组件。这里有一个要点：通过一个 updater 来更新业务组件。原因是业务组件并不在原来的位置渲染，而是在 ScopeItem 中渲染的，如果不处理的话，业务组件父级渲染时业务组件不会跟着渲染，所以通过一个 updater 来模拟父组件的更新流效果。
* 如果 ScopeItem 状态已经激活，说明已经形成了新的 dom，此时把 dom 交给 KeepaliveItem；如果业务组件即将被卸载，将变成休眠状态，此时再把 dom 传递给 body。

### KeepaliveItem

KeepaliveItem 负责组件缓存状态变更，以及与 Scope 的通信。

````js
const renderWithChildren = (children) => (mergeProps) => {
    return children ?
        isFuntion(children) ?
        children(mergeProps) :
        isValidElement(children) ?
        cloneElement(children, mergeProps) :
        null :
        null
}

function KeepaliveItem({
    children,
    cacheId,
    style
}) {
    /*  */
    const {
        cacheDispatch,
        hasAliveStatus
    } = useContext(KeepaliveContext)
    const first = useRef(false)
    const parentNode = useRef(null)
    /* 提供给 ScopeItem 的方法  */
    const load = (currentNode) => {
        parentNode.current.appendChild(currentNode)
    }
    /* 如果是第一次，那么证明没有缓存，直接调用 created 指令，创建一个   */
    !first.current && !hasAliveStatus(cacheId) && cacheDispatch({
        type: ACITON_CREATED,
        payload: {
            load,
            cacheId,
            children: renderWithChildren(children)
        }
    })
    useLayoutEffect(() => {
        /* 触发更新逻辑，如果父组件重新渲染了，那么下发 update 指令，更新 updater  */
        hasAliveStatus(cacheId) !== ACTION_UNACTIVED && first.current && cacheDispatch({
            type: ACTION_UPDATE,
            payload: {
                cacheId,
                children: renderWithChildren(children)
            }
        })
    }, [children])
    useEffect(() => {
        first.current = true
        /* 触发指令 active */
        cacheDispatch({
            type: ACTION_ACTIVE,
            payload: {
                cacheId,
                load
            }
        })
        return function () {
            /* KeepaliveItem 被销毁，触发 unActive 指令，让组件处于休眠状态  */
            cacheDispatch({
                type: ACITON_UNACTIVE,
                payload: cacheId
            })
        }
    }, [])
    /* 通过 parentNode 接收回传过来的 dom 状态。 */
    return <div ref={parentNode} style={style}/>
}
````

KeepaliveItem 的核心逻辑：

* KeepaliveItem 第一次加载时还没有缓存，直接调用 created 指令，创建一个 ScopeItem。
* KeepaliveItem 父组件更新时，触发 update 来更新 updater 对象，让缓存的组件重新渲染。
* 组件挂载时下发 active 指令激活组件，ScopeItem 会把 dom 元素回传给 KeepaliveItem；卸载时下发 unActive 指令，dom 元素会重新插入到 document body 中。整个流程就此走通。

### 完善其他功能

**清除缓存 api——useCacheDestroy**

````js
export function useCacheDestroy() {
    return useContext(KeepaliveContext).cacheDestroy
}
````

业务组件需要清除缓存时，直接通过 useCacheDestroy 获取 keepaliveContext 上的 cacheDestroy 方法即可。

## 未来展望与总结

### 生态信息

该功能已发布 0.0.1-beta 版本，npm 安装方式：

````js
npm install react-keepalive-component
````

源码仓库：[react-keepalive-component](https://github.com/GoodLuckAlien/react-keepalive-component)。

后续维护方向：缓存的生命周期，api 会采用自定义 hooks 的形式。

### 总结

* React 中的一种 keepalive 的实现方式以及原理。
* 从零到一实现 React 缓存组件的思路。
* React hooks 的合理使用。

## 继续阅读

- 上一篇：[02-自定义Hooks实践](02-自定义Hooks实践)
- 下一篇：[04-Suspense](04-Suspense)
