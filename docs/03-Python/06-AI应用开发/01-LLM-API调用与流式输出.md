---
title: LLM API 调用与流式输出
description: 使用 OpenAI 兼容接口完成对话与补全调用，掌握消息角色体系、SSE 流式消费与转发、超时重试退避与 Token 成本计量。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# LLM API 调用与流式输出

## 概念说明

大语言模型（LLM）应用的第一层是**模型服务调用**：把用户输入组装成消息列表发送给推理服务，拿回文本结果。
主流模型服务商（OpenAI、Anthropic、各国产大模型厂商、vLLM/Ollama 等本地推理框架）几乎都提供 **OpenAI 兼容接口**——即请求和响应的字段结构遵循同一套协议。

这意味着一个工程化的实践结论：**业务代码只依赖协议，不依赖具体厂商**。切换模型服务时，通常只需要修改 `base_url`、`api_key` 和模型名三个环境变量，调用代码一行不动。

本篇以 OpenAI Python SDK 的写法为例（它已是兼容生态的"普通话"），示例中的地址与密钥一律来自环境变量，可替换为任意兼容服务。

::: tip 协议中立原则
示例代码使用 `openai` 官方 SDK 的写法演示。只要目标服务实现了 OpenAI 兼容协议（绝大多数云服务与本地推理框架都支持），把 `base_url` 指向自己的服务商即可复用全部代码。不要在业务代码里写死厂商专有字段。
:::

## 核心要点

- LLM API 的调用本质是**无状态的消息列表交互**：每次请求都要带上完整上下文，服务端不替你记住历史。
- 消息角色体系（`system` / `user` / `assistant` / `tool`）是组装对话的基本骨架，角色顺序与归属影响模型行为。
- 流式输出（SSE）解决的是**首字延迟**问题：不等全部生成完，边生成边推送，大幅改善体感响应速度。
- 超时、重试、限流退避是生产调用的**必选项**而非可选项——LLM 服务抖动远比传统数据库频繁。
- Token 是计量单位也是成本单位：每次响应都携带 `usage` 字段，成本计量要作为一等公民做进调用层。
- 客户端应全局复用（连接池），而不是每次请求新建。
- ⚠️ 常见误区：把对话历史存成字符串再每次拼接。历史就是 `messages` 列表，追加角色消息即可，手动拼字符串会丢失角色语义。
- ⚠️ 常见误区：流式场景下忽略异常处理。网络中断发生在流中间，`for` 循环里抛出的异常与普通请求不同，必须分别处理。
- ⚠️ 常见误区：只看响应文本、丢弃 `usage`。事后想统计成本时，发现历史请求什么都没留下。

## 环境准备

使用官方 SDK 安装即可。密钥与地址全部通过环境变量注入，与 [配置管理](/docs/python/03-工程化与运维/01-工程化/07-配置管理) 的原则一致。

```bash
pip install openai
```

```bash
# .env（提交到仓库的应为不含真实值的 .env.example）
LLM_BASE_URL=https://api.example-llm.com/v1   # 任意 OpenAI 兼容服务地址
LLM_API_KEY=your-api-key                       # 服务商控制台申请
LLM_MODEL=your-model-name                      # 模型名按服务商文档填写
```

```python
import os
from openai import OpenAI

# 客户端全局复用：内部维护连接池，不要在函数内反复创建
client = OpenAI(
    base_url=os.environ["LLM_BASE_URL"],
    api_key=os.environ["LLM_API_KEY"],   # 永远来自环境变量，不写死在代码
)

MODEL = os.getenv("LLM_MODEL", "your-model-name")
```

::: warning 密钥安全
`api_key` 一律通过环境变量或密钥管理服务注入。任何写进代码、注释、配置文件并提交到仓库的密钥，都应视为已泄漏并立即轮换。
:::

## 对话与补全接口

### Chat Completions（主流方式）

对话接口接收一个消息列表，返回模型生成的回复。这是当前所有兼容服务的主力接口。

```python
resp = client.chat.completions.create(
    model=MODEL,
    messages=[
        {"role": "system", "content": "你是一个严谨的技术文档助手，回答使用中文。"},
        {"role": "user", "content": "什么是幂等性？"},
    ],
    temperature=0.7,   # 越低越确定，事实型问答建议 0~0.3
    max_tokens=512,    # 限制回复长度，控制成本上限
)

print(resp.choices[0].message.content)
print(resp.usage)  # Token 用量，成本计量的数据来源
```

响应对象的关键结构：

```text
resp.id                      # 本次请求的唯一 ID，排查问题时的凭证
resp.model                   # 实际服务的模型名
resp.choices[0].message      # 回复消息（role + content）
resp.finish_reason           # stop / length / content_filter 等
resp.usage                   # prompt_tokens / completion_tokens / total_tokens
```

### Text Completion（补全接口）

补全接口是更早期的"给前文续写"形态，部分服务仍在提供，常用于代码补全、模板续写类场景。

```python
resp = client.completions.create(
    model=MODEL,
    prompt="Python 中实现单例模式的最简写法是\n",
    max_tokens=200,
    temperature=0.2,
)
print(resp.choices[0].text)
```

::: tip 两种接口怎么选
新项目一律用 Chat Completions：角色体系让上下文管理更清晰，且兼容服务的功能（工具调用、JSON 模式等）都围绕它提供。补全接口只在明确的续写场景下使用。
:::

## 消息角色体系

`messages` 列表中每条消息由 `role` 和 `content` 构成。角色是模型理解"谁在说话"的唯一依据。

| 角色 | 含义 | 典型用途 |
|---|---|---|
| `system` | 系统指令，设定模型的行为与人设 | 输出语言、风格、约束、安全边界 |
| `user` | 最终用户输入 | 问题、任务描述 |
| `assistant` | 模型此前的回复 | 构成多轮对话上下文 |
| `tool` | 工具执行结果（配合 function calling） | 把工具输出回传给模型 |

### 多轮对话的上下文管理

服务端不保存对话状态，历史必须由客户端维护并在每次请求时全量发送。

```python
class Conversation:
    """最小可用的多轮对话管理器"""

    def __init__(self, system_prompt: str) -> None:
        self.messages: list[dict] = [
            {"role": "system", "content": system_prompt}
        ]

    def ask(self, client: OpenAI, question: str) -> str:
        self.messages.append({"role": "user", "content": question})
        resp = client.chat.completions.create(
            model=MODEL,
            messages=self.messages,
        )
        answer = resp.choices[0].message.content or ""
        self.messages.append({"role": "assistant", "content": answer})
        return answer


conv = Conversation("你是一个 Python 技术助手。")
print(conv.ask(client, "列表和元组的区别？"))
print(conv.ask(client, "那什么时候该用元组？"))  # "那"依赖上一轮上下文
```

### 上下文窗口裁剪

消息列表全量发送意味着成本随轮次线性增长。当历史过长时需要裁剪，常见策略是"保留系统提示 + 最近 N 轮"：

```python
def trim_messages(messages: list[dict], keep_last: int = 10) -> list[dict]:
    system = [m for m in messages if m["role"] == "system"]
    others = [m for m in messages if m["role"] != "system"]
    return system + others[-keep_last:]
```

::: warning 上下文窗口是硬限制
每个模型都有最大上下文长度，超出会直接报错或被截断。长对话场景要做裁剪或摘要压缩，不要假设"历史随便带"。
:::

## 流式输出（SSE）

非流式请求要等模型生成完所有内容才返回，长回答的等待时间可达数十秒。流式输出通过 **SSE（Server-Sent Events）** 把生成过程按增量推给客户端，首字延迟从"整段生成时间"降到"首 token 时间"。

SSE 是基于 HTTP 的单向推送协议：服务端持续写入 `data:` 开头的事件行，客户端逐条读取。流式响应的每个增量块（chunk）结构与普通响应相同，只是 `content` 每次只带一小段。

### 客户端消费流

```python
stream = client.chat.completions.create(
    model=MODEL,
    messages=[{"role": "user", "content": "用三段话解释事务隔离级别"}],
    stream=True,  # 开启流式
)

full_text = []
for chunk in stream:
    delta = chunk.choices[0].delta.content
    if delta:              # 首尾 chunk 的 delta 可能为 None 或空
        full_text.append(delta)
        print(delta, end="", flush=True)

print("完整回复:", "".join(full_text))
```

要点：

- 每个 `chunk` 的 `choices` 可能为空列表（部分服务用于携带 `usage` 的收尾块），取下标前先判空。
- 拼接完整文本是调用方的责任，SDK 只给增量。
- 流式模式下 `usage` 统计通常需要在请求中显式开启（如部分服务要求 `stream_options={"include_usage": True}`），否则拿不到。

### 服务端转发：SSE 接口给前端

Web 应用中的典型链路是 **后端消费上游流，同时以 SSE 转发给浏览器**。异步场景见 [asyncio 基础](/docs/python/09-进阶核心/02-异步编程/01-asyncio基础)，这里以 FastAPI 为例演示转发骨架：

```python
import json

from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()


@app.post("/chat/stream")
async def chat_stream(question: str):
    def sse_generator():
        stream = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": question}],
            stream=True,
        )
        for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content
            if delta:
                # SSE 事件格式：data: <payload>\n\n
                payload = json.dumps({"text": delta}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
        yield "data: [DONE]\n\n"  # 自定义结束标记，前端据此收尾

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

::: warning 转发链路上的缓冲陷阱
Nginx 等反向代理默认会缓冲响应，导致前端"一次性收到全部内容"，流式失效。必须显式关闭代理缓冲（如 `proxy_buffering off` 或响应头 `X-Accel-Buffering: no`），并逐块 flush。
:::

## 超时、重试与限流退避

LLM 服务的故障形态：连接超时、生成中断、**429 限流**、5xx 瞬时错误。调用层必须把这些当作常态处理。

### 基础配置

```python
client = OpenAI(
    base_url=os.environ["LLM_BASE_URL"],
    api_key=os.environ["LLM_API_KEY"],
    timeout=30.0,       # 单请求超时（秒），流式可适当放宽
    max_retries=2,      # SDK 内置的自动重试次数（仅对幂等安全的网络错误生效）
)
```

### 指数退避重试（自封装）

SDK 内置重试覆盖不了所有场景（如业务层需要区分错误类型）。生产中常自行封装指数退避：

```python
import random
import time


def chat_with_backoff(messages: list[dict], max_attempts: int = 4) -> str:
    last_exc: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            resp = client.chat.completions.create(
                model=MODEL, messages=messages
            )
            return resp.choices[0].message.content or ""
        except Exception as exc:  # 实际项目中按 SDK 异常类型细分
            last_exc = exc
            if attempt == max_attempts:
                break
            # 指数退避 + 抖动：1s、2s、4s... 避免所有客户端同步重试
            delay = 2 ** (attempt - 1) + random.uniform(0, 0.5)
            time.sleep(delay)
    raise RuntimeError(f"LLM 调用失败，已重试 {max_attempts} 次") from last_exc
```

::: danger 只重试"值得重试"的错误
429（限流）与 5xx（服务端瞬时故障）可以重试；401（密钥错误）、400（参数错误）重试多少次都不会成功，反而放大故障。重试逻辑必须按错误类型分流，并在退避中读取服务端返回的重试提示头（如有）。
:::

### 并发限流

批量任务场景下，客户端并发过高会触发服务端限流。用信号量控制并发上限，完整方案见 [生产实践](07-生产实践)。

## 成本计量（Token）

Token 是模型的计量单位（约等于若干字符片段），API 按 prompt 与 completion 的 Token 数分别计费。响应中的 `usage` 字段是唯一的权威数据来源。

### 单次计量与账目化

```python
# 单价表由配置注入，按服务商计费文档维护；金额单位自定（此处为"每百万 Token"）
PRICE_TABLE = {
    MODEL: {"input": 2.0, "output": 8.0},  # 示意值，以实际计费文档为准
}


def cost_of(usage) -> float:
    price = PRICE_TABLE[resp.model]
    return (
        usage.prompt_tokens * price["input"]
        + usage.completion_tokens * price["output"]
    ) / 1_000_000


resp = client.chat.completions.create(model=MODEL, messages=[{"role": "user", "content": "hi"}])
print(f"输入 {resp.usage.prompt_tokens} / 输出 {resp.usage.completion_tokens} Token")
print(f"本次成本: {cost_of(resp.usage):.6f}")
```

### 调用层统一记账

工程做法是在封装层统一记录，而不是散落在业务代码里：

```python
import dataclasses


@dataclasses.dataclass
class UsageLedger:
    """进程内用量台账（生产中应写入指标系统，见监控篇）"""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cost: float = 0.0

    def record(self, usage, model: str) -> None:
        self.prompt_tokens += usage.prompt_tokens
        self.completion_tokens += usage.completion_tokens
        price = PRICE_TABLE.get(model, {"input": 0, "output": 0})
        self.cost += (
            usage.prompt_tokens * price["input"]
            + usage.completion_tokens * price["output"]
        ) / 1_000_000
```

::: tip Token 预算的两个方向
一是**事后计量**：每次调用记录 usage，按用户/租户/功能维度聚合出账。二是**事前预算**：`max_tokens` 限制输出上限、裁剪输入历史，把单次成本控制在预算内。两者都要做。
:::

## 常见陷阱

| 陷阱 | 后果 | 正确做法 |
|---|---|---|
| 密钥写死在代码或配置文件中 | 提交仓库即泄漏 | 一律环境变量 / 密钥管理服务注入 |
| 每次请求新建客户端 | 连接无法复用，延迟与句柄开销增大 | 模块级全局复用同一 client |
| 流式循环不判空 `choices` / `delta` | 收尾 chunk 触发 IndexError 或输出 None | 先判空再取值 |
| 反向代理缓冲 SSE | 前端失去流式效果，表现为"卡很久一次性出" | 关闭代理缓冲，逐块推送 |
| 对所有异常无差别重试 | 4xx 错误被反复放大，限流雪上加霜 | 按错误类型分流，指数退避 + 抖动 |
| 丢弃 `usage` 字段 | 无法核算成本，预算失控 | 调用层统一记账并上报指标 |
| 历史消息无限追加 | 超出上下文窗口报错，成本线性膨胀 | 裁剪 / 摘要压缩历史 |
| 用字符串拼接模拟多轮对话 | 丢失角色语义，模型行为不可控 | 维护 `messages` 列表，按角色追加 |

## 最佳实践

### 1. 调用层封装为独立模块

不要让业务代码直接 `client.chat.completions.create(...)`。封装一个 `llm_client.py`：统一处理客户端构建、重试退避、用量记账、日志埋点。后续换服务商、加降级（见 [生产实践](07-生产实践)）只改这一层。

### 2. 参数按场景分层

事实问答、结构化抽取用低 temperature（0~0.3）；创意生成用较高 temperature。把参数作为配置而非硬编码，不同功能各自声明。

### 3. 流式与费流式共用一套消息组装

消息组装逻辑（system 提示、历史裁剪）独立成函数，流式与否只影响"怎么拿结果"，不影响"怎么发请求"。

### 4. 首字延迟优先选流式

面向人的交互场景默认流式；机器消费的批处理场景用非流式，减少解析成本。

## 版本说明

- **openai Python SDK**：本文使用 v1.x 的 `OpenAI` 客户端写法（`client.chat.completions.create`）。v0.x 的旧式函数调用 API 已废弃，迁移时注意。
- **SSE 协议**：与 SDK 版本无关，属 HTTP 标准（W3C/WHATWG），前端可用 `EventSource` 或 `fetch` + ReadableStream 消费。
- **各兼容服务**：对 `stream_options`、`usage` 字段、工具调用等扩展功能的支持程度不一，使用前查阅对应文档。
- **Python 3.10+**：示例使用 `X | None` 联合类型语法。

## 延伸阅读

- OpenAI Python SDK 官方文档：https://github.com/openai/openai-python
- MDN — Server-Sent Events 概念与用法：https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events
- 本站相关篇目：[asyncio 基础](/docs/python/09-进阶核心/02-异步编程/01-asyncio基础) — 异步客户端与并发调用基础
- 兄弟篇：[提示工程](02-提示工程) — 消息内容怎么写才有效
- 兄弟篇：[生产实践](07-生产实践) — 缓存、并发与降级容灾

> 🧭 工程化工具链与 Python 版本演进速览统一维护在 [导航总览 · 工程化工具链演进速览](/docs/python/02-基础与入门/00-导航总览#六工程化工具链演进速览)。
