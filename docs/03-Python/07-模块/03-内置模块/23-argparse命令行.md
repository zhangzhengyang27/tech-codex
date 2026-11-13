---
title: argparse — 标准库命令行解析全解
description: 使用标准库 argparse 构建位置参数、可选参数、子命令与规范的 --help 帮助文案，并明确它与 click/typer 的选型边界。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# argparse — 标准库命令行解析全解

## 概念说明

`argparse` 是 Python 标准库中的命令行参数解析模块。任何需要"从终端接收输入"的脚本——数据处理工具、运维脚本、模型训练入口——都绕不开命令行界面（CLI）。

没有参数解析的脚本通常长这样：

```python
import sys

# 裸读 sys.argv：位置固定、类型是字符串、没有帮助信息
script, source, count = sys.argv
n = int(count)  # 用户传错就抛 ValueError，堆栈直接糊脸上
```

`argparse` 解决的正是这三个问题：**参数从哪里读、类型怎么转、用户怎么知道该传什么**。它把参数声明变成代码，把校验和帮助文档交给框架。

::: tip 选型边界
本篇聚焦标准库方案。`argparse` 适合**零依赖脚本、工具函数入口、不想为 CLI 引入第三方依赖的场景**。如果是中大型项目、命令多、需要组合式子命令与彩色输出，建议直接看 [click 与 typer 命令行](/docs/python/07-模块/04-第三方模块/08-click与typer命令行)——本文末尾"与 click/typer 的取舍"一节给出了完整对比。
:::

## 核心要点

- `argparse` 零依赖、随解释器分发，是标准库三大 CLI 方案（`sys.argv` / `argparse` / `getopt`）中最现代的一个。
- 参数分两类：**位置参数**（必填、按顺序）与**可选参数**（`-`/`--` 开头、有默认值）。
- 类型转换交给 `type=` 参数，`choices=` 限定取值范围，非法输入由框架自动报错退出。
- `nargs` 控制一个参数接收几个值，是从"单值"走向"列表"的关键。
- 子命令（`add_subparsers`）是 `git add` / `git commit` 这类多命令工具的根基。
- `--help` 帮助文案是 API 的一部分：`help=` 与 `metavar=` 决定用户看到什么，值得认真写。
- ⚠️ 常见误区：用 `type=int` 之外的方式手写类型转换；其实框架的 `type` 回调在解析期就完成校验。
- ⚠️ 常见误区：`dest` 与参数名不一致导致读不到值；`--log-level` 对应的属性名是 `log_level`（连字符自动转下划线）。
- ⚠️ 常见误区：布尔开关用 `type=bool`。`bool("false")` 是 `True`，必须用 `action="store_true"`。

## 快速上手

```python
# greet.py
import argparse

parser = argparse.ArgumentParser(
    prog="greet",
    description="一个演示用的问候工具",
    epilog="示例：python greet.py Alice --times 3",
)
parser.add_argument("name", help="要问候的人名")
parser.add_argument("-t", "--times", type=int, default=1, help="重复次数（默认 1）")

args = parser.parse_args()

for _ in range(args.times):
    print(f"Hello, {args.name}!")
```

```bash
$ python greet.py Alice --times 2
Hello, Alice!
Hello, Alice!

$ python greet.py --help
usage: greet [-h] [-t TIMES] name

一个演示用的问候工具

positional arguments:
  name                  要问候的人名

options:
  -h, --help            show this help message and exit
  -t TIMES, --times TIMES
                        重复次数（默认 1）
```

`--help` 输出由框架根据你的声明自动生成——这就是"声明式参数"的价值：**声明一次，解析、校验、文档三件事全部解决**。

## 位置参数与可选参数

### 位置参数（positional）

按出现顺序解析，默认必填。

```python
parser.add_argument("source")                 # 必填
parser.add_argument("dest")                   # 第二个位置参数
parser.add_argument("files", nargs="*")       # 可选的位置参数（见 nargs 一节）
```

### 可选参数（optional）

以 `-`（短选项）或 `--`（长选项）开头，通常带默认值。

```python
import argparse
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--host", default="127.0.0.1", help="监听地址")
parser.add_argument("--port", type=int, default=8000, help="监听端口")
parser.add_argument("-v", "--verbose", action="store_true", help="输出调试信息")
parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING"],
                    help="日志级别")

args = parser.parse_args()
print(args.host, args.port, args.verbose, args.log_level)
# 属性名：host、port、verbose、log_level（连字符自动转下划线）
```

::: warning 布尔开关不要用 type=bool
`bool` 作为 `type` 回调时，任何非空字符串都返回 `True`：`--flag false` 会得到 `True`。布尔开关的正确写法是 `action="store_true"`（出现即为 `True`，否则 `False`）；需要"默认开、可关闭"时用 `action=argparse.BooleanOptionalAction`，它自动提供 `--flag/--no-flag` 一对开关。
:::

```python
parser.add_argument("--cache", action=argparse.BooleanOptionalAction, default=True)
# python app.py            → args.cache is True
# python app.py --no-cache → args.cache is False
```

## 类型、choices 与取值校验

`type=` 接收任何可调用对象，返回值直接成为属性值；抛异常则框架报错退出。`choices=` 限定取值集合。

```python
import argparse
from pathlib import Path

def positive(n: str) -> int:
    """自定义类型回调：解析期完成业务校验"""
    value = int(n)
    if value <= 0:
        raise argparse.ArgumentTypeError(f"必须是正整数，收到 {n!r}")
    return value

parser = argparse.ArgumentParser()
parser.add_argument("--workers", type=positive, default=4, help="并发数（正整数）")
parser.add_argument("--mode", choices=["train", "eval", "export"], required=True,
                    help="运行模式")
parser.add_argument("--config", type=Path, help="配置文件路径")  # Path 比 str 更好用
parser.add_argument("--ratio", type=float, default=0.8, help="训练集比例")

args = parser.parse_args()
```

```bash
$ python app.py --mode deploy
app.py: error: argument --mode: invalid choice: 'deploy' (choose from 'train', 'eval', 'export')

$ python app.py --mode train --workers 0
app.py: error: argument --workers: 必须是正整数，收到 '0'
```

::: tip 校验前移
把校验写进 `type` 回调，非法值在**解析阶段**就被拦截并给出可读错误，退出码为 2；而不是等业务代码运行到一半才崩。配合 `choices` 与 `Path` 类型，可以让入口函数拿到的参数"即拿即用"。
:::

## nargs：一个参数接收多个值

| 取值 | 含义 | 结果类型 |
|---|---|---|
| 不写 | 恰好 1 个值 | 单值 |
| `"?"` | 0 或 1 个值（配合 `default`/`const`） | 单值或 `const` |
| `"*"` | 0 个或多个值 | `list` |
| `"+"` | 至少 1 个值 | `list` |
| `N`（整数） | 恰好 N 个值 | `list` |

```python
parser = argparse.ArgumentParser()
parser.add_argument("files", nargs="*", default=[], help="待处理文件，可传多个")
parser.add_argument("--exclude", nargs="*", default=[], help="排除的模式")
parser.add_argument("--point", nargs=2, type=float, metavar=("X", "Y"),
                    help="坐标，必须恰好两个数")
parser.add_argument("--output", nargs="?", default="out.txt", const="out.txt",
                    help="输出路径，缺省为 out.txt")

args = parser.parse_args(["a.csv", "b.csv", "--point", "1.5", "2.0"])
print(args.files)    # ['a.csv', 'b.csv']
print(args.point)    # [1.5, 2.0]
```

## 子命令：多命令工具的骨架

`git`、`pip`、`docker` 这类工具的形态是"主命令 + 子命令"。`argparse` 用 `add_subparsers` 实现：

```python
# taskctl.py
import argparse

def cmd_add(args: argparse.Namespace) -> None:
    print(f"添加任务: {args.title}（优先级 {args.priority}）")

def cmd_list(args: argparse.Namespace) -> None:
    print(f"列出任务: status={args.status}, limit={args.limit}")

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="taskctl", description="任务管理工具")
    sub = parser.add_subparsers(dest="command", required=True, help="子命令")

    # python taskctl.py add "写周报" -p high
    p_add = sub.add_parser("add", help="添加任务")
    p_add.add_argument("title", help="任务标题")
    p_add.add_argument("-p", "--priority", default="normal", choices=["low", "normal", "high"])
    p_add.set_defaults(func=cmd_add)

    # python taskctl.py list --status open --limit 20
    p_list = sub.add_parser("list", help="列出任务")
    p_list.add_argument("--status", default="all", choices=["all", "open", "done"])
    p_list.add_argument("--limit", type=int, default=10)
    p_list.set_defaults(func=cmd_list)

    return parser

def main() -> None:
    args = build_parser().parse_args()
    args.func(args)  # 由 set_defaults 绑定的处理函数分发

if __name__ == "__main__":
    main()
```

::: tip 子命令分发模式
`set_defaults(func=...)` + `args.func(args)` 是官方推荐的分发方式：每个子命令一个处理函数，主入口只做一行分发。`dest="command"` 让 `args.command` 记录用户输入的子命令名，便于日志记录。注意每个子命令是独立的 parser，公共参数要么在每个子命令上重复声明，要么定义在主 parser 上（放在子命令之前使用）。
:::

## 帮助文案：CLI 的脸面

`--help` 是用户了解工具的第一入口，以下几个参数决定它的质量：

| 参数 | 作用 | 示例 |
|---|---|---|
| `description` | 用法说明（出现在命令列表之前） | 工具的一句话简介 |
| `epilog` | 结尾文字（示例、注意事项） | `示例：xxx --foo bar` |
| `help` | 每个参数的说明，**必写** | `"并发数（默认 4）"` |
| `metavar` | 帮助里显示的占位符名 | `metavar="N"` 让 `--workers N` 更简洁 |
| `formatter_class` | 换行与缩进策略 | `ArgumentDefaultsHelpFormatter` 自动显示默认值 |

```python
import argparse

parser = argparse.ArgumentParser(
    prog="sync",
    description="把本地目录同步到对象存储",
    formatter_class=argparse.ArgumentDefaultsHelpFormatter,  # 自动附加默认值
    epilog="示例：sync ./dist --bucket my-site --dry-run",
)
parser.add_argument("source", help="本地源目录")
parser.add_argument("--bucket", default="default-bucket", help="目标桶名")
parser.add_argument("--dry-run", action="store_true", help="只打印计划，不实际上传")
```

::: warning 帮助文案规范
- 每个参数都写 `help=`，"没有说明的参数"等于"没有这个参数"。
- 说明里写清楚**默认值**或直接用 `ArgumentDefaultsHelpFormatter`。
- 破坏性操作在 help 里显式警示，如 `"删除远端分支（不可恢复）"`。
- `prog` 显式指定程序名，避免被打包成入口后显示成错误的脚本名。
:::

## 解析行为与测试

```python
import argparse

parser = argparse.ArgumentParser(prog="demo")
parser.add_argument("--n", type=int, default=1)

# 1) parse_args() 不传参时默认读 sys.argv[1:]，适合生产入口
# args = parser.parse_args()

# 2) 传列表解析：适合单测，不污染 sys.argv
args = parser.parse_args(["--n", "5"])
assert args.n == 5

# 3) parse_known_args()：忽略未知参数，拿到剩余部分（插件式工具常用）
args, extra = parser.parse_known_args(["--n", "3", "--future-flag"])
print(args.n, extra)  # 3 ['--future-flag']

# 4) 解析失败默认 sys.exit(2)；测试时捕获 SystemExit
try:
    parser.parse_args(["--n", "abc"])
except SystemExit as e:
    assert e.code == 2
```

配置管理策略上，命令行参数适合做**运行时临时覆盖**（如 `--log-level DEBUG`），而数据库地址、密钥这类环境配置应从环境变量读取——参见[配置管理](/docs/python/03-工程化与运维/01-工程化/07-配置管理)中的优先级链路：命令行 > 环境变量 > 配置文件 > 代码默认值。

## 与 click/typer 的取舍

| 维度 | argparse | click | typer |
|---|---|---|---|
| 依赖 | 标准库，零依赖 | 第三方 | 第三方（基于 click） |
| 声明方式 | 过程式 `add_argument` | 装饰器 | 类型注解 |
| 类型校验 | `type=` 回调 | 内置参数类型 + 回调 | 复用注解，自动校验 |
| 子命令 | `add_subparsers` | `@group` + 嵌套组 | 类与函数即组与命令 |
| 帮助/补全 | 自动 `--help` | 自动 help + shell 补全 | 自动 help + 补全 |
| 适合场景 | 零依赖脚本、单文件工具 | 多命令中大型 CLI | 快速开发、与类型检查协同 |

**取舍声明**：

- **一次性脚本、教程示例、禁三方依赖的环境** → `argparse`。它没有安装成本，且所有 Python 运行环境都有。
- **命令数量多、需要分组/插件机制/Shell 补全** → `click`。装饰器把每条命令隔离成函数，组合性远好于手写 `add_subparsers`。
- **新项目、团队已启用类型注解** → `typer`。函数签名即 CLI 定义，与 mypy/pyright 协同最好。

三者的参数解析心智模型相通（位置/可选/类型/默认值），从 `argparse` 迁移到 click/typer 成本很低。完整用法见 [click 与 typer 命令行](/docs/python/07-模块/04-第三方模块/08-click与typer命令行)。

## 常见陷阱

| 陷阱 | 后果 | 正确做法 |
|---|---|---|
| 布尔开关用 `type=bool` | `--flag false` 得到 `True` | 用 `action="store_true"` 或 `BooleanOptionalAction` |
| `--log-level` 读 `args.log-level` | 属性不存在报错 | 连字符自动转为下划线：`args.log_level` |
| 密钥通过命令行参数传入 | 进程列表 `ps` 与 shell 历史可见 | 密钥走环境变量，CLI 只留 `--from-env` 类开关 |
| 忘记写 `help=` | `--help` 里参数无说明，用户靠猜 | 每个参数必写帮助文案 |
| `nargs="*"` 的位置参数放在必填参数之前 | 解析贪婪匹配，顺序错乱 | 可变位置参数放最后，或改用可选参数 |
| 在库代码里直接 `parse_args()` | import 时读走测试框架的 argv | 库只暴露 `build_parser()`，入口才解析 |

## 最佳实践

1. **入口薄、逻辑厚**：`main()` 只做解析和分发，业务逻辑放在可导入的函数里，便于单测直接调用。
2. **构建 parser 用函数封装**：`build_parser()` 返回配置好的 parser，测试可用 `parse_args([...])` 注入参数。
3. **敏感信息不进 argv**：数据库密码、API Key 一律从环境变量读取，命令行只提供行为开关。
4. **退出码遵循约定**：成功 0，参数错误 2（argparse 默认），业务失败自定义非零值。
5. **`--dry-run` 先行**：任何有副作用的批量操作都应提供 dry-run 模式，配合 `epilog` 示例教用户使用。
6. **超中型 CLI 及时迁移**：子命令超过 5 个、需要分组和补全时，迁移到 [click 与 typer 命令行](/docs/python/07-模块/04-第三方模块/08-click与typer命令行)维护成本更低。

## 延伸阅读

- [argparse 官方文档（中文）](https://docs.python.org/zh-cn/3/library/argparse.html) — 全部参数语义的权威参考
- [Argparse Tutorial（官方教程）](https://docs.python.org/zh-cn/3/howto/argparse.html) — 渐进式入门，覆盖 nargs 与子命令
- [click 与 typer 命令行](/docs/python/07-模块/04-第三方模块/08-click与typer命令行) — 第三方 CLI 方案全解与迁移指引
- [配置管理](/docs/python/03-工程化与运维/01-工程化/07-配置管理) — 命令行参数在配置优先级体系中的位置
- [打包与发布](/docs/python/03-工程化与运维/01-工程化/05-打包与发布) — 把 CLI 脚本打包成 `entry_points` 命令
