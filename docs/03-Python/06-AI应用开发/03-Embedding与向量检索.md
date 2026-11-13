---
title: Embedding 与向量检索
description: Embedding 接口调用、余弦相似度计算、内存方案与 pgvector 持久化检索、按标题与段落分块策略，构建语义检索基础能力。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# Embedding 与向量检索

## 概念说明

Embedding（向量化）把文本映射成固定长度的浮点向量，语义相近的文本在向量空间中距离相近。
它是"按语义找内容"的基础：关键词检索只能匹配字面，向量检索能匹配"意思"——查"怎么部署服务"能召回标题是"应用上线流程"的段落。

向量检索由三件事构成：

1. **向量化**：调用 Embedding 接口，把文本变成向量（离线建库一次 + 在线查询每次）。
2. **相似度计算**：用余弦相似度等度量比较向量。
3. **存储与检索**：小规模直接内存算，大规模交给带向量索引的存储（pgvector、Redis、专用向量库）。

本篇用 OpenAI 兼容的 Embedding 接口演示（各兼容服务写法一致），存储给出内存与 pgvector 两个递进方案。

::: tip 模型与服务成对绑定
Embedding 向量的"坐标含义"由具体模型决定：不同模型产出的向量不能混在一起算相似度。入库和查询必须使用同一个 Embedding 模型，切换模型等于全量重建向量库。
:::

## 核心要点

- Embedding 接口支持**批量输入**：建库时几百条一批调用，比逐条调用快一个数量级、成本相同。
- 余弦相似度是文本检索默认度量：衡量方向而非长度，对文本这种"内容不变、长短不一"的表示最合适。
- 检索规模决定方案：几千条内存暴力算足够；数万到百万级用 pgvector（PostgreSQL 扩展）兼顾持久化与 SQL 生态。
- 分块（chunking）质量决定检索上限：按文档结构切（标题 + 段落）远优于固定长度硬切。
- 每个向量块要携带**来源元数据**（文档名、标题路径、位置），检索结果才可用、可溯源。
- 向量检索是召回不是答案：结果的正确性还要靠重排与生成环节（见 [RAG 检索增强实战](04-RAG检索增强实战)）。
- ⚠️ 常见误区：查询时换了 Embedding 模型。库存量是模型 A 产的向量，查询用模型 B，相似度全部失真，表现为"召回全错"。
- ⚠️ 常见误区：把整篇文档当成一个向量。文档越长，语义被"平均"得越稀，检索精度断崖式下降——必须分块。
- ⚠️ 常见误区：只存向量不存元数据。召回后无法展示出处、无法过滤，检索结果不可用。

## Embedding 接口

```bash
pip install openai numpy
```

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url=os.environ["LLM_BASE_URL"],   # 任意 OpenAI 兼容服务
    api_key=os.environ["LLM_API_KEY"],
)

EMBED_MODEL = os.getenv("EMBED_MODEL", "your-embedding-model")


def embed_texts(texts: list[str]) -> list[list[float]]:
    """批量向量化。单次请求可携带一批文本，建库务必用批量。"""
    resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
    # 返回顺序与输入顺序一一对应
    return [item.embedding for item in resp.data]


def embed_query(text: str) -> list[float]:
    """查询向量化。注意与建库使用同一模型。"""
    return embed_texts([text])[0]
```

关键约定：

- `input` 接受字符串列表，返回 `data` 数组与输入顺序一致，批量建库按此对应回原文。
- 不同服务的向量维度不同（几百到几千维），建表/建索引前先确认所用模型的维度。
- 部分 Embedding 接口区分 `query` 与 `document` 两种用途（如指令式模型），按服务文档传参。

## 向量相似度：余弦

两个向量方向越一致，余弦相似度越接近 1：

```text
cos(a, b) = a·b / (|a| × |b|)
```

文本向量只关心"语义方向"，不关心"向量长度"（长度主要由文本量与词频影响），所以取夹角而不取欧氏距离。

```python
import numpy as np


def cosine_similarity(a: list[float], b: list[float]) -> float:
    va, vb = np.asarray(a), np.asarray(b)
    norm = np.linalg.norm(va) * np.linalg.norm(vb)
    if norm == 0:
        return 0.0
    return float(np.dot(va, vb) / norm)


# 相似度语义参考（随模型而异，需用自己数据实测阈值）
# > 0.85  语义高度相近   0.70~0.85  主题相关   < 0.60  基本无关
```

::: tip 相似度还是距离
不同存储对"越大越好"（相似度）与"越小越好"（距离）的约定不同：pgvector 的 `<=>` 算子返回余弦**距离**（1 − 余弦相似度），排序取最小。接新存储时先确认度量方向，排序反了是最隐蔽的检索 bug。
:::

## 方案一：内存检索（NumPy）

几千条以内的规模，全部向量载入内存做矩阵运算，零额外组件：

```python
import numpy as np


class InMemoryVectorStore:
    """最小向量检索实现：适合原型与小规模（数千条）场景"""

    def __init__(self) -> None:
        self.texts: list[str] = []
        self.metadatas: list[dict] = []
        self._matrix: np.ndarray | None = None

    def add(self, texts: list[str], metadatas: list[dict] | None = None) -> None:
        vectors = embed_texts(texts)
        self.texts.extend(texts)
        self.metadatas.extend(metadatas or [{}] * len(texts))
        new = np.asarray(vectors, dtype=np.float32)
        self._matrix = new if self._matrix is None else np.vstack([self._matrix, new])

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        if self._matrix is None or not self.texts:
            return []
        q = np.asarray(embed_query(query), dtype=np.float32)
        # 归一化后点积即余弦相似度
        q = q / np.linalg.norm(q)
        m = self._matrix / np.linalg.norm(self._matrix, axis=1, keepdims=True)
        sims = m @ q                                  # 一次算出全部相似度
        idx = np.argsort(-sims)[:top_k]               # 相似度降序取前 K
        return [
            {"text": self.texts[i], "score": float(sims[i]),
             "metadata": self.metadatas[i]}
            for i in idx
        ]


store = InMemoryVectorStore()
store.add(["如何配置环境变量", "Git 分支管理规范", "Docker 镜像构建"], 
          [{"doc": "ops.md"}, {"doc": "git.md"}, {"doc": "docker.md"}])
for hit in store.search("部署前的环境准备"):
    print(round(hit["score"], 3), hit["metadata"]["doc"], hit["text"][:30])
```

局限：无持久化（重启重建）、无增量删除、全量扫描 O(N)。规模增长后切换持久化方案。

## 方案二：pgvector 持久化检索

pgvector 是 PostgreSQL 的向量扩展：向量作为普通列存储，用 SQL 完成相似度检索，与业务表同库。关系型数据库基础见 [关系型数据库](/docs/python/09-进阶核心/03-数据库/01-关系型数据库)。

### 建表

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
    id         BIGSERIAL PRIMARY KEY,
    content    TEXT        NOT NULL,          -- 分块文本
    doc_name   TEXT        NOT NULL,          -- 来源文档
    title_path TEXT        NOT NULL,          -- 标题路径，如 "运维 > 部署 > 回滚"
    embedding  VECTOR(1024) NOT NULL,         -- 维度与所用 Embedding 模型一致
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 数据量上万后建近似索引；HNSW 查询快、IVFFlat 建库快，按需选择
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
```

### 写入与检索

```python
import psycopg  # pip install "psycopg[binary]"

DSN = os.environ["PG_DSN"]  # postgresql://user:pass@host:5432/mydb


def insert_chunks(rows: list[tuple[str, str, str, list[float]]]) -> int:
    with psycopg.connect(DSN) as conn, conn.cursor() as cur:
        cur.executemany(
            """INSERT INTO chunks (content, doc_name, title_path, embedding)
               VALUES (%s, %s, %s, %s)""",
            rows,
        )
        return cur.rowcount


def search_chunks(query: str, top_k: int = 5) -> list[dict]:
    qvec = embed_query(query)
    with psycopg.connect(DSN) as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT content, doc_name, title_path,
                      embedding <=> %s::vector AS distance   -- 余弦距离，越小越相似
               FROM chunks
               ORDER BY distance
               LIMIT %s""",
            (qvec, top_k),
        )
        return [
            {"text": c, "doc": d, "title_path": t, "distance": float(dist)}
            for c, d, t, dist in cur.fetchall()
        ]
```

::: tip 为什么选 pgvector 起步
向量与业务数据同库：一个事务里完成"存文档 + 存向量"；SQL 过滤（按文档、时间、租户）与向量检索自由组合；团队不需要额外运维一套新组件。百万级以下规模，pgvector 是工程性价比最高的默认选择。
:::

## 分块策略：标题 + 段落

分块的本质是**让每个向量对应一个语义完整的单元**。固定长度硬切会把一个段落从中间截断，两块各自语义残缺，检索质量随之受损。

### 结构感知分块

Markdown / 带标题文档按标题层级切，块内继承标题路径：

```python
import re


def split_markdown(doc: str, doc_name: str, max_chars: int = 800) -> list[dict]:
    """按 Markdown 标题切块，每块携带标题路径；超长段落再按段落细分"""
    chunks: list[dict] = []
    title_stack: list[tuple[int, str]] = []  # [(级别, 标题)]
    buf: list[str] = []

    def flush() -> None:
        if not buf:
            return
        text = "\n".join(buf).strip()
        if text:
            path = " > ".join(t for _, t in title_stack) or "正文"
            chunks.append({"doc_name": doc_name, "title_path": path,
                           "content": text})
        buf.clear()

    for line in doc.splitlines():
        m = re.match(r"^(#{1,6})\s+(.*)$", line)
        if m:                                   # 遇到新标题：结算上一块
            flush()
            level = len(m.group(1))
            title_stack = [(l, t) for l, t in title_stack if l < level]
            title_stack.append((level, m.group(2).strip()))
        else:
            buf.append(line)
            if sum(len(s) for s in buf) >= max_chars:
                flush()                         # 块内超长再截
    flush()
    return chunks
```

### 策略要点

| 要点 | 说明 |
|---|---|
| 标题入块 | 标题路径写进块文本或元数据："这个块讲的是什么话题"的语义主要由标题提供 |
| 块大小适中 | 数百到一千字符常见；过小语义碎、过大召回糊，用评测集实测选值 |
| 段落边界优先 | 二次切分在空行、句号处断开，不在句子中间截断 |
| 表格与代码不拆 | 强关联的整块内容（表格、代码块）保持完整 |
| 元数据随行 | doc_name、title_path、位置号与向量同存，供溯源与过滤 |

## 方案对比与选型

| 维度 | 内存（NumPy） | pgvector | RediSearch（向量模式） | 专用向量库 |
|---|---|---|---|---|
| 适用规模 | 数千条 | 数万~百万级 | 数万~百万级 | 千万级以上 |
| 持久化 | 无 | 有 | 有 | 有 |
| 过滤能力 | 自行实现 | SQL 全能力 | 标签/数值过滤强 | 各家 schema 过滤 |
| 运维成本 | 零 | 复用现有 PG | 复用现有 Redis | 新组件 |
| 与现有设施关系 | 无 | 数据库扩展 | Redis 模块 | 独立服务 |

选型口径：**原型与小数据用内存；已有 PostgreSQL 用 pgvector；已有 Redis 且过滤场景多可评估 RediSearch**（Redis 数据模型与缓存实践见 [非关系型数据库](/docs/python/09-进阶核心/03-数据库/02-非关系型数据库)）；规模与性能要求超出前两者再引入专用向量库。

## 常见陷阱

| 陷阱 | 后果 | 正确做法 |
|---|---|---|
| 建库与查询用不同 Embedding 模型 | 相似度全面失真，召回不可用 | 模型名进配置与向量库元信息，切换即全量重建 |
| 整篇文档一个向量 | 长文档语义被稀释，查不到 | 按标题 + 段落分块，数百字符一块 |
| 只存向量不存来源 | 无法展示出处、无法按文档过滤 | 向量与元数据同表存储 |
| 忽略度量方向（相似度/距离） | 排序恰好颠倒，Top-K 取到最差的 | 确认存储算子语义（`<=>` 是距离，越小越好） |
| 建库逐条调用接口 | 建库慢数倍，配额压力大 | 批量 input，几百条一批 |
| 相似度阈值拍脑袋 | 全局一刀切导致误召回/漏召回 | 按场景用评测集标定，不同功能不同阈值 |
| 块文本不含标题上下文 | "配置步骤"这类块不知道是谁的配置 | 标题路径并入块文本或元数据 |

## 最佳实践

### 1. 向量化层独立封装

`embed_texts / embed_query` 收敛到一个模块：模型名、批量大小、重试都在这一层处理。上层永远不直接调接口，切换模型改一处。

### 2. 向量库存模型指纹

建表时记录模型名与维度（单独的元信息表或列）。入库校验"模型一致、维度一致"，从机制上杜绝混库。

### 3. 检索结果带出处，为 RAG 铺路

任何检索接口返回都带 `doc_name`、`title_path`、分数。这是后续 [RAG 检索增强实战](04-RAG检索增强实战) 的引用溯源基础。

### 4. 分块参数进配置

`max_chars`、是否重叠、标题层级深度做成配置项，配合黄金评测集对比不同取值的召回质量，而不是凭直觉定死。

## 版本说明

- **pgvector**：PostgreSQL 扩展，需在数据库侧安装（云数据库需确认托管版支持情况）；`VECTOR(n)` 维度须与所用 Embedding 模型一致。
- **psycopg**：示例使用 psycopg 3 的连接与 `executemany` 写法。
- **NumPy**：内存方案使用 NumPy 矩阵运算；向量归一化后点积等价于余弦相似度。
- **Embedding 接口**：批量 `input` 与 `data` 顺序对应是 OpenAI 兼容协议约定，个别服务行为有差异，以对应文档为准。

## 延伸阅读

- pgvector 官方仓库：https://github.com/pgvector/pgvector
- 本站相关篇目：[非关系型数据库](/docs/python/09-进阶核心/03-数据库/02-非关系型数据库) — Redis 数据模型与 RediSearch 对比背景
- 兄弟篇：[RAG 检索增强实战](04-RAG检索增强实战) — 分块与检索在 RAG 流水线中的位置
- 兄弟篇：[结构化输出与评估](06-结构化输出与评估) — 用评测集标定相似度阈值
- OpenAI — Embeddings 官方指南：https://platform.openai.com/docs/guides/embeddings

> 🧭 工程化工具链与 Python 版本演进速览统一维护在 [导航总览 · 工程化工具链演进速览](/docs/python/02-基础与入门/00-导航总览#六工程化工具链演进速览)。
