---
title: rich 与 tqdm — 终端输出工具
description: rich 的表格/面板/语法高亮/Traceback/日志与 tqdm 的单层、嵌套、异步进度条速查，并声明两者与日志系统的分工边界。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# rich 与 tqdm — 终端输出工具

## 概念说明

CLI 工具与数据脚本的输出质量，直接影响使用者的判断效率。`print` 时代的问题：长列表刷屏、进度只能靠"打点"、异常堆栈挤成一团、表格靠手工对齐空格。两个库分别解决两类问题：

- **rich**：终端"排版引擎"——表格、面板、语法高亮、Markdown、JSON 美化、友好 Traceback、进度条、`rich.logging` 日志渲染。适合**输出结构化信息**。
- **tqdm**：轻量进度条，一行包装任意可迭代对象即得进度、速率与预计剩余时间。适合**让长时间循环可感知**。rich 自带的 `Progress` 与其功能重叠，本篇两者都讲并给出取舍。

::: tip 本篇与日志系统的分工
终端 rich 输出与日志记录是两条通道：**rich 管人机交互**（给屏幕前的操作者看，用完即走），**logging 管机器消费**（落文件、进采集器、可检索可告警）。CLI 工具两者都要：给用户漂亮摘要，同时把关键事件写日志。服务端日志体系见[日志系统](/docs/python/03-工程化与运维/02-运维/01-日志系统)。
:::

## 核心要点

- 安装：`pip install rich tqdm`（两者互相独立，可单独使用）。
- `rich.print` 兼容 `print` 的心智模型，额外支持 BBCode 风格标记（`[bold red]`）与 pretty 排版。
- `Table` / `Panel` / `Tree` / `Syntax` / `JSON` / `Markdown` 覆盖 CLI 输出的绝大部分排版需求。
- `rich.traceback.install()` 一行调用，让全程序异常以彩色缩进展示，定位效率大幅提升。
- rich 进度条（`Progress`）与 tqdm 的取舍：rich 适合多任务、带描述列、与表格联动的场景；tqdm 适合脚本里"给循环加个条"的最小改动。
- tqdm 嵌套要点：外层 `position=0`、内层 `position=1, leave=False`，避免多行进度条互相覆盖。
- asyncio 代码中 tqdm 用 `async for` 包装异步迭代，rich `Progress` 用 `start_task/advance` 手动驱动。
- ⚠️ 常见误区：在日志文件里打印 rich 标记。`[bold]` 等标记是终端语义，进文件就是垃圾字符。
- ⚠️ 常见误区：tqdm 在重定向/CI 环境仍刷屏。tqdm 对非 TTY 自动降级为按 chunk 输出，但自写的刷新逻辑要注意。
- ⚠️ 常见误区：进度条嵌套不打 `position`，两条进度条在同一行互相打架。

## rich：打印与排版

### 富文本 print

```python
from rich import print

print("[bold magenta]数据同步[/] 开始…")            # BBCode 风格标记
print({"name": "alice", "tags": ["admin", "dev"]})   # dict 自动 pretty 高亮
print(":warning: 磁盘空间不足")                       # emoji 短代码
print("[italic]慢查询: [bold]SELECT * FROM users[/] 耗时 3.2s[/]")
```

标记语法：`[样式]文本[/]`，样式可为颜色、`bold`、`italic`、`underline` 及其组合（`[bold red]`）。`rich.print` 对 dict/list 自动 pretty-print，调试数据结构比 `pprint` 更直观。

### 表格与面板

```python
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

table = Table(title="部署状态", show_lines=False)
table.add_column("服务", style="cyan", no_wrap=True)
table.add_column("版本", justify="right")
table.add_column("状态", justify="center")
table.add_row("api", "2.4.1", "[green]● 健康[/]")
table.add_row("worker", "2.4.1", "[yellow]● 部分积压[/]")
table.add_row("scheduler", "2.4.0", "[red]● 异常[/]")
console.print(table)

console.print(Panel.fit(
    "3 个服务中 1 个异常\n建议查看日志: [link]logs/scheduler.log[/]",
    title="摘要", border_style="red",
))
```

### 语法高亮与结构化输出

```python
from rich.console import Console
from rich.json import JSON
from rich.syntax import Syntax
from rich.tree import Tree

console = Console()

# 代码片段高亮：文档生成、配置打印
code = '''def fibonacci(n: int) -> int:
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a'''
console.print(Syntax(code, "python", theme="monokai", line_numbers=True))

# JSON 美化
console.print(JSON('{"user": {"name": "alice", "roles": ["admin"]}}'))

# 目录树
tree = Tree("project/")
tree.add("pyproject.toml")
src = tree.add("src/")
src.add("[cyan]main.py[/]")
console.print(tree)
```

### 友好 Traceback 与 rich.inspect

```python
# main.py 顶部一行安装，全程序生效：异常彩色缩进、局部变量可见
from rich.traceback import install
install(show_locals=True, width=120)

# 调试利器：打印对象内部结构
from rich import inspect
from dataclasses import dataclass


@dataclass
class Task:
    name: str
    retries: int = 3


inspect(Task("sync"), methods=True)
```

::: tip 交互环境自动生效
`pip install rich` 后，REPL 中的异常回溯与数据显示会自动美化，无需任何代码改动。这也是最无损的引入方式：装上包，调试体验立即提升，业务代码零侵入。
:::

## rich 的进度条与日志集成

### Progress：多任务进度条

```python
import time

from rich.console import Console
from rich.progress import (Progress, SpinnerColumn, BarColumn,
                           TextColumn, TimeElapsedColumn)

console = Console()

with Progress(
    SpinnerColumn(),
    TextColumn("[progress.description]{task.description}"),
    BarColumn(),
    TextColumn("{task.completed}/{task.total}"),
    TimeElapsedColumn(),
    console=console,
) as progress:
    for name, total in [("下载", 100), ("解析", 50), ("入库", 80)]:
        task_id = progress.add_task(f"{name}", total=total)
        for _ in range(total):
            progress.advance(task_id, 1)
            time.sleep(0.005)
```

rich `Progress` 的优势：多个任务并列显示、列可定制（速率、剩余时间、spinner）、可与 `console.status("处理中…")` 的转圈提示组合。需要"复杂、常驻、多行"的进度视图时选它。

### rich.logging：日志的终端渲染

```python
import logging

from rich.logging import RichHandler

logging.basicConfig(
    level="INFO",
    format="%(message)s",                 # rich 自己管理时间与级别渲染
    datefmt="[%X]",
    handlers=[RichHandler(rich_tracebacks=True, markup=True)],
)

log = logging.getLogger("myapp")
log.info("开始同步 [bold]orders[/] 表")
log.exception("同步失败")                  # 异常栈自动 rich 渲染
```

::: warning RichHandler 只改变"终端这一路"
`RichHandler` 是终端 Handler：彩色渲染发生在屏幕上。**文件 Handler 绝不能挂 rich**——文件里要的是纯文本或 JSON 行（结构化方案见[日志系统](/docs/python/03-工程化与运维/02-运维/01-日志系统)）。多通道并存是标准形态：终端 RichHandler + 文件 RotatingFileHandler/JSON Handler，各走各的格式。
:::

## tqdm：最小成本进度条

### 单层进度条

```python
import time

from tqdm import tqdm

# 用法一：包装可迭代对象，一行搞定
for i in tqdm(range(1000), desc="处理", unit="item"):
    time.sleep(0.002)

# 用法二：手动驱动（不知道总量时用 total=None 的不定长模式）
bar = tqdm(total=len(items), desc="下载")
for item in items:
    process(item)
    bar.update(1)
bar.close()

# 用法三：文件流读块的进度
from pathlib import Path

size = Path("big.dat").stat().st_size
with open("big.dat", "rb") as f, tqdm(total=size, unit="B", unit_scale=True) as bar:
    while chunk := f.read(1 << 20):
        consume(chunk)
        bar.update(len(chunk))
```

tqdm 输出速率、已完成数、百分比与预计剩余时间，非 TTY 环境（管道、CI 日志）自动降级为周期性单行输出，不会污染日志。

### 嵌套与多进度条

```python
import time

from tqdm import tqdm


def process_file(path: str) -> None:
    for _ in tqdm(range(50), desc=f"  ├─ {path}", position=1, leave=False):
        time.sleep(0.002)


files = [f"file_{i}.dat" for i in range(5)]
for f in tqdm(files, desc="文件", position=0):   # 外层 position=0，常驻
    process_file(f)
```

嵌套三要素：**外层 `position=0`**（固定首行）、**内层 `position=1, leave=False`**（占用次行，完成后清除）、内层描述带缩进形成层级感。多线程场景每个线程分配独立 `position` 并设 `lock_args`，避免交叉刷新。

### 异步迭代与 rich 联动

```python
import asyncio

from tqdm.asyncio import tqdm_asyncio


async def fetch(url: str) -> str:
    await asyncio.sleep(0.01)
    return url


async def main() -> list[str]:
    urls = [f"https://example.com/{i}" for i in range(50)]
    # 并发执行 + 统一进度条：as_completed 语义，谁完成算谁
    return await tqdm_asyncio.gather(*map(fetch, urls), desc="抓取")


asyncio.run(main())
```

rich 路线的异步用法：`Progress` 本身与事件循环无关，在协程里 `progress.advance(task_id)` 即可；也可用 `async with progress:`，由各协程自行推进各自的任务行。

## 选型与分工声明

| 需求 | 推荐 | 理由 |
|---|---|---|
| 脚本里给一个循环加进度 | tqdm | 一行包装，零学习成本 |
| 多任务并行进度、可定制列 | rich Progress | 多行布局、列系统、spinner |
| 数据结构/结果集展示 | rich Table/JSON | 排版对齐、颜色语义 |
| 异常堆栈美化 | rich.traceback | 一行 install，全程序生效 |
| 长任务分阶段日志 | logging + RichHandler | 终端渲染与文件落盘分离 |
| 管道/CI 环境输出 | tqdm（自动降级）/ 纯 logging | 刷新式 UI 在非 TTY 下无意义 |

**与日志系统的分工声明**（重申）：

- rich/tqdm 输出的目标是**交互终端**：`stdout` 的富文本、刷新式进度条只对"此刻坐在屏幕前的人"有意义，重定向到文件即为乱码或噪声。
- logging 的目标是**持久与检索**：时间戳、级别、结构化字段、聚合告警，体系见[日志系统](/docs/python/03-工程化与运维/02-运维/01-日志系统)。
- 判据一句话：**这行输出三个月后还要不要被检索？要，走日志；不要，走 rich/tqdm。**

## 常见陷阱

| 陷阱 | 后果 | 正确做法 |
|---|---|---|
| rich 标记打进日志文件 | 文件里残留 `[bold]` 垃圾字符 | 终端 RichHandler 渲染，文件走纯格式 |
| tqdm 嵌套不打 position | 多条进度条同行互相覆盖 | 外层 0 内层 1，内层 `leave=False` |
| 进度条 total 估计错误 | 进度倒退或卡在 99% | 已知总量先 `tqdm(total=n)`；未知用不定长模式 |
| 在 Web/服务进程里用 rich 刷屏 | stdout 污染容器日志流 | 服务端只用 logging；rich 仅限 CLI 与交互调试 |
| `print` 与进度条混用 | 输出切断进度条渲染 | 统一经 `console.print` / `tqdm.write` |
| 循环内高频 `refresh` | 刷新开销吞掉任务收益 | 默认节流已够；自定义列时控制刷新频率 |

## 最佳实践

1. **CLI 三件套起步**：`install()` 友好 Traceback + 关键结果 `Table` + 长任务 `Progress`/tqdm，三个改动覆盖九成体验提升。
2. **输出分层**：给用户的摘要（表格/面板）、给终端的过程日志（RichHandler）、给机器的持久日志（文件 JSON）三者分开配置。
3. **进度条只做感知**：进度逻辑（总数估计、单位命名）写对，任务逻辑不放进度条回调里。
4. **CI 与管道无富文本**：检测 `sys.stdout.isatty()` 或用环境变量开关富文本，保证 cron 与流水线日志干净可解析。
5. **工具函数库慎用 rich**：库代码默认 `print`，把"是否美化"留给应用层决定，避免依赖绑架。
6. **大结果集用 rich 分页**：`console.print` 配合分批渲染，避免万行表格一次刷屏；CLI 长表格可接 `rich.table` + 分页器。

## 延伸阅读

- [rich 官方文档](https://rich.readthedocs.io/) — 渲染器、Live/Console 高级用法的权威参考
- [tqdm 官方文档](https://tqdm.github.io/) — 全部参数（position、bar_format、回调）速查
- [日志系统](/docs/python/03-工程化与运维/02-运维/01-日志系统) — 结构化日志、采集与告警的完整体系
- [argparse 命令行](/docs/python/07-模块/03-内置模块/23-argparse命令行) — CLI 工具的参数解析侧
- [click 与 typer 命令行](/docs/python/07-模块/04-第三方模块/08-click与typer命令行) — 与 rich 配合构建完整 CLI 工具
