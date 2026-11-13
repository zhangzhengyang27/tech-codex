---
title: Agent 与工具调用
description: function calling 协议、工具注册与执行循环、ReAct 模式，以及计算器与检索工具的多步任务示例和工具安全边界设计。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# Agent 与工具调用

## 概念说明

LLM 只会生成文本，不会查数据库、不会算精确数字、不会发消息。**工具调用（function calling）**补上这一环：把外部能力用函数签名描述给模型，模型按需"点单"，由你的代码执行后把结果回传，模型再基于结果继续推理。

**Agent** 则是"模型 + 工具 + 循环"的组合：模型决定下一步调用哪个工具，代码执行并把结果喂回去，如此往复直到模型认为任务完成。Agent 的全部智能来自模型决策，全部副作用来自你注册的工具——因此工程重心是两件事：**执行循环的正确性**与**工具的安全边界**。

本篇演示 OpenAI 兼容协议下的 function calling 写法（各兼容服务字段结构基本一致），不引入任何 Agent 框架——先理解裸协议，框架只是这个循环的封装。

::: tip Agent 没有魔法
剥开所有框架，Agent 的内核就是一个 while 循环：发消息 → 有 tool_calls 就执行 → 结果追加进 messages → 再发。理解了这个循环，任何框架的抽象都能看懂，也才知道出问题该查哪一环。
:::

## 核心要点

- 工具用 **JSON Schema 描述**（名称、用途、参数类型），模型靠描述决定用不用、怎么用——描述质量直接决定调用质量。
- 执行权始终在客户端：模型只输出"我要调哪个工具、参数是什么"，**真正执行函数的是你的代码**。
- 循环终止条件必须显式：`finish_reason` 不再是 `tool_calls`、或达到最大步数，二者缺一不可。
- 工具结果以 `role: "tool"` 消息回传，并用 `tool_call_id` 对应到具体请求，一次都不能错位。
- 工具描述里写清楚**何时该用、何时别用**，比写代码防误用更有效。
- 安全边界三件套：**白名单注册、写操作人工确认、参数显式校验**。
- ⚠️ 常见误区：把工具描述写成一行注释。模型对"这个工具是干嘛的"的全部认知来自 description，糊弄描述等于糊弄输出。
- ⚠️ 常见误区：无限循环不加步数上限。模型可能反复调用同一工具，必须设 `max_steps` 强制刹车。
- ⚠️ 常见误区：把工具输出整包塞回模型。超长工具结果要截断或摘要，否则上下文爆炸。

## Function Calling 协议

协议由三步构成：**声明工具 → 模型请求调用 → 结果回传**。

### 第一步：声明工具

请求中用 `tools` 参数给出工具的 JSON Schema：

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "四则运算计算器。输入一个 Python 算术表达式，返回计算结果。需要精确数值计算时使用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "算术表达式，如 '1180 * 12 + 3500'",
                    },
                },
                "required": ["expression"],
            },
        },
    },
]
```

### 第二步：模型请求调用

模型不直接给答案，而是在响应中给出工具调用请求：

```python
import json
import os

from openai import OpenAI

client = OpenAI(base_url=os.environ["LLM_BASE_URL"], api_key=os.environ["LLM_API_KEY"])

resp = client.chat.completions.create(
    model=os.getenv("LLM_MODEL", "your-model-name"),
    messages=[{"role": "user", "content": "1180 乘以 12 再加 3500 是多少？"}],
    tools=tools,
)

msg = resp.choices[0].message
print(msg.tool_calls[0].function.name)        # "calculator"
print(msg.tool_calls[0].function.arguments)   # '{"expression": "1180 * 12 + 3500"}'
```

### 第三步：执行并回传结果

```python
def run_calculator(expression: str) -> str:
    allowed = set("0123456789+-*/(). ")
    if not expression or not set(expression) <= allowed:
        return "错误：表达式包含非法字符"
    try:
        return str(eval(expression))  # 校验后执行；生产环境应换成专用解析库
    except ZeroDivisionError:
        return "错误：除数为零"
    except Exception as exc:
        return f"错误：{exc}"


tool_msg = msg.tool_calls[0]
result = run_calculator(json.loads(tool_msg.function.arguments)["expression"])

messages = [
    {"role": "user", "content": "1180 乘以 12 再加 3500 是多少？"},
    msg,  # 模型的工具调用请求原样回传
    {"role": "tool", "tool_call_id": tool_msg.id, "content": result},
]

final = client.chat.completions.create(
    model=os.getenv("LLM_MODEL", "your-model-name"),
    messages=messages,
    tools=tools,
)
print(final.choices[0].message.content)  # "1180 × 12 + 3500 = 17660。"
```

::: warning messages 必须完整回放
回传工具结果时，`messages` 里要包含**模型的那条 tool_calls 消息本身**（上例中的 `msg`）。漏掉它或 `tool_call_id` 对不上，服务端会直接报 400。
:::

## 工具注册与执行循环

### 注册表模式

工具在 Python 侧用注册表管理：函数 + schema + 元信息（是否只读、是否需确认）绑定在一起。

```python
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class Tool:
    name: str
    description: str
    parameters: dict                    # JSON Schema
    handler: Callable[[dict], str]
    read_only: bool = True              # 写操作 / 副作用工具置 False
    requires_confirmation: bool = False


REGISTRY: dict[str, Tool] = {}


def register(tool: Tool) -> None:
    REGISTRY[tool.name] = tool


def tool_schemas() -> list[dict]:
    """从注册表生成协议要求的 tools 参数"""
    return [
        {
            "type": "function",
            "function": {
                "name": t.name,
                "description": t.description,
                "parameters": t.parameters,
            },
        }
        for t in REGISTRY.values()
    ]
```

### 执行循环

Agent 的主循环：模型要点单 → 查注册表执行 → 结果回传 → 直到模型给出最终答案或步数耗尽。

```python
MAX_STEPS = 8  # 步数上限：防止无限循环的最后防线


def run_agent(question: str) -> str:
    messages: list[dict] = [
        {"role": "system", "content": "你是任务助手，按需调用工具完成用户请求，"
                                      "完成后用简洁中文给出最终答案。"},
        {"role": "user", "content": question},
    ]

    for step in range(MAX_STEPS):
        resp = client.chat.completions.create(
            model=os.getenv("LLM_MODEL", "your-model-name"),
            messages=messages,
            tools=tool_schemas(),
        )
        assistant_msg = resp.choices[0].message

        if not assistant_msg.tool_calls:      # 无工具调用：任务完成
            return assistant_msg.content or ""

        messages.append(assistant_msg)
        for call in assistant_msg.tool_calls:
            tool = REGISTRY.get(call.function.name)
            if tool is None:                   # 白名单外的工具名：拒绝执行
                result = f"错误：工具 {call.function.name} 未注册"
            else:
                args = json.loads(call.function.arguments or "{}")
                result = tool.handler(args)    # 真正的执行点

            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": result[:4000],      # 超长结果截断，保护上下文
            })

    return "已达到最大执行步数，任务未完成。"
```

## ReAct 模式

ReAct（Reason + Act）是不依赖原生 function calling 的经典模式：用提示约定 **思考（Thought）→ 行动（Action）→ 观察（Observation）** 的轮转格式，模型在文本中"写出"自己的决策，代码解析后执行。

```python
REACT_PROMPT = """\
你可以使用以下工具，按 Thought/Action/Observation 循环解决问题：

可用工具：
- calculator: 四则运算计算器，输入算术表达式
- kb_search: 内部知识库检索，输入查询词

格式约定：
Thought: 我需要先弄清楚……
Action: {"tool": "工具名", "args": {...}}
（系统会执行 Action 并给出 Observation）
Thought: 根据观察结果……
最终答案: <仅给结论，不再调用工具>
"""


def run_react(question: str, max_steps: int = 6) -> str:
    messages = [
        {"role": "system", "content": REACT_PROMPT},
        {"role": "user", "content": question},
    ]
    for _ in range(max_steps):
        resp = client.chat.completions.create(
            model=os.getenv("LLM_MODEL", "your-model-name"), messages=messages
        )
        text = resp.choices[0].message.content or ""
        messages.append({"role": "assistant", "content": text})

        if "最终答案:" in text:
            return text.split("最终答案:")[-1].strip()

        action = parse_action(text)           # 解析最后一条 Action 行
        if action is None:
            return "任务中断：模型未产生有效动作。"
        result = REGISTRY[action["tool"]].handler(action["args"])
        messages.append({"role": "user", "content": f"Observation: {result}"})
    return "已达到最大步数。"


def parse_action(text: str) -> dict | None:
    import re
    m = re.findall(r"Action:\s*(\{.*\})", text)
    return json.loads(m[-1]) if m else None
```

::: tip ReAct 与原生 function calling 怎么选
服务支持原生 function calling 时优先用它：结构化的 `tool_calls` 不会因文本格式解析失败而中断。ReAct 的价值在于**任何对话模型都能用**（不要求支持工具协议），以及决策过程天然可见，适合做调试与教学。
:::

## 多步任务示例：计算器 + 检索工具

一个需要**两次工具接力**的典型任务："内部知识库里说 Q3 有多少个工单，平均每个工单多少元损失？"

```python
# ---------- 工具一：知识库检索（实现见 RAG 篇，此处给出协议壳） ----------
register(Tool(
    name="kb_search",
    description="检索内部知识库。查数字口径、流程规范、统计数据前先检索。",
    parameters={
        "type": "object",
        "properties": {"query": {"type": "string", "description": "查询词"}},
        "required": ["query"],
    },
    handler=lambda args: kb_search(args["query"]),      # 返回 Top-3 片段文本
    read_only=True,
))

# ---------- 工具二：计算器 ----------
register(Tool(
    name="calculator",
    description="四则运算计算器。对检索到的数字做精确计算时使用。",
    parameters={
        "type": "object",
        "properties": {"expression": {"type": "string",
                                       "description": "算术表达式，如 '1560000 / 240'"}},
        "required": ["expression"],
    },
    handler=lambda args: run_calculator(args["expression"]),
    read_only=True,
))

answer = run_agent("知识库里 Q3 的工单总量和总损失金额是多少？平均每个工单损失多少元？")
# 预期执行轨迹（由模型自主决定）：
#   step 1: kb_search("Q3 工单 总损失")      -> "Q3 共处理工单 240 个，总损失 156 万元"
#   step 2: calculator("1560000 / 240")     -> "6500"
#   step 3: 无工具调用，输出最终答案
print(answer)
```

这个例子体现 Agent 的价值：**任务步骤不是预先写死的**。"先查再算"由模型根据工具描述与问题自行编排——把同样的工具组合换个问题（"Q3 损失比 Q2 多百分之几？"），无需改一行代码，模型会自己编排新的调用序列。

## 安全边界

Agent 的副作用全部来自工具。安全设计的目标：**模型可以"想"，但不能"做"任何超出授权的事**。

### 白名单与最小权限

- 只注册当前任务需要的工具：问答类 Agent 不应拥有删除、发送类工具。未注册的工具模型调不了（执行循环里 `REGISTRY` 查不到直接拒绝）。
- 工具内部再校验权限：检索工具限定可检索的文档范围；写操作工具校验目标资源是否属于当前用户。

### 写操作人工确认

读操作（检索、计算）可自动执行；**产生副作用**的操作（创建工单、发消息、改数据）必须过人工确认闸门——执行循环在调用 `tool.handler` 前检查 `requires_confirmation` 标记：

```python
import uuid

PENDING: dict[str, dict] = {}  # 待确认队列


def request_confirmation(tool: Tool, args: dict) -> str:
    """写操作不直接执行，挂起等待人工审批"""
    ticket_id = uuid.uuid4().hex[:12]
    PENDING[ticket_id] = {"tool": tool, "args": args}
    return (
        f"该操作为写操作，已生成待确认单 {ticket_id}，"
        f"参数: {json.dumps(args, ensure_ascii=False)}。等待人工审批后执行。"
    )
```

### 其他边界措施

| 措施 | 说明 |
|---|---|
| 参数显式校验 | 进入 handler 前按 schema 校验类型与取值，不信任模型生成的参数 |
| 输入净化 | 检索工具的 query、计算工具的表达式先过字符白名单 |
| 结果截断 | 工具输出限长回传，防止超长结果撑爆上下文或注入指令 |
| 审计日志 | 记录每次工具调用的名称、参数、结果摘要与操作者（见 [生产实践](07-生产实践)） |
| 步数与频率限制 | `MAX_STEPS` + 单会话工具调用配额，防失控循环 |

::: danger 永远不要 eval 模型生成的代码
计算器工具如果接受任意表达式，模型生成的内容就是被执行的内容——这是代码注入。要么字符白名单 + 专用解析，要么用 AST 解析只放行算术节点。任何"模型输出直接执行"的设计都是注入漏洞。
:::

## 常见陷阱

| 陷阱 | 后果 | 正确做法 |
|---|---|---|
| 工具 description 敷衍 | 模型误用、该用不用 | 写清用途、参数含义、何时用/不用 |
| 回传时漏掉 tool_calls 消息 | 服务端 400 | messages 完整回放：请求消息 + tool 结果消息 |
| 无步数上限 | 死循环烧钱 | `MAX_STEPS` 强制终止并如实告知 |
| 工具结果整包回传 | 上下文爆炸、成本失控 | 截断/摘要后回传 |
| 信任模型生成的参数 | 类型错误、注入攻击 | handler 前显式校验 + 净化 |
| 写操作自动执行 | 误删数据、越权操作 | `requires_confirmation` 人工审批闸门 |
| 错误吞掉返回空串 | 模型以为成功，继续错下去 | 错误信息如实回传给模型，让它调整策略 |

## 最佳实践

### 1. 工具先于 Agent

先让单个工具在脚本里跑稳（参数校验、错误处理、返回格式），再接入 Agent。工具自身不可靠，Agent 只会放大不可靠。

### 2. 错误回传也是一种"观察结果"

工具失败时把"错误：表达式包含非法字符"回传给模型，模型会自行修正参数重试——这比在代码里静默吞错、返回空串有效得多。

### 3. 多 Agent 拆分代替工具堆砌

工具超过十个就拆：运维 Agent、工单 Agent、知识库问答 Agent 各自维护最小工具集，由路由层分发。一个万能 Agent 的误调率远高于多个专精 Agent。

### 4. 决策轨迹可观测

记录每次循环的步数、调用的工具、参数与结果摘要。Agent 出错的排查入口不是答案本身，而是这条轨迹（观测方案见 [生产实践](07-生产实践)）。

## 版本说明

- **function calling**：属 OpenAI 兼容协议的 `tools` / `tool_calls` 字段约定；各兼容服务支持程度与细节（并行调用、strict 模式等）存在差异，接入前查对应文档。
- **ReAct**：提示层模式，与协议无关，任何对话模型可用。
- **Python 3.10+**：示例使用 `dict | None` 联合类型与 dataclass。
- **不使用 Agent 框架**：示例均为裸协议实现；引入框架（LangGraph、AutoGen 等）前建议先跑通本篇的最小循环。

## 延伸阅读

- OpenAI — Function calling 官方指南：https://platform.openai.com/docs/guides/function-calling
- ReAct 论文（Reasoning + Acting 原始出处）：https://arxiv.org/abs/2210.03629
- 兄弟篇：[RAG 检索增强实战](04-RAG检索增强实战) — kb_search 工具的内部实现
- 兄弟篇：[结构化输出与评估](06-结构化输出与评估) — 工具参数的结构化校验
- 兄弟篇：[生产实践](07-生产实践) — Agent 轨迹的日志与审计

> 🧭 工程化工具链与 Python 版本演进速览统一维护在 [导航总览 · 工程化工具链演进速览](/docs/python/02-基础与入门/00-导航总览#六工程化工具链演进速览)。
