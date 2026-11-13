---
title: click 与 typer — 第三方命令行框架
description: 用 click 装饰器构建分组命令行工具，用 typer 以类型注解零样板定义 CLI，覆盖参数类型、子命令分组、CliRunner 测试与打包发布。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# click 与 typer — 第三方命令行框架

## 概念说明

标准库 [argparse](/docs/python/07-模块/03-内置模块/23-argparse命令行) 用过程式的 `add_argument` 声明参数，适合零依赖脚本。但当命令数量增长、需要分组与插件机制时，过程式声明会迅速膨胀。`click` 与 `typer` 是 Python 生态两个主流的第三方 CLI 框架，两者同源（typer 构建在 click 之上），但声明哲学不同：

- **click**：命令即函数，装饰器声明参数。函数被装饰成命令，命令可组合成组，组可嵌套成多级子命令。
- **typer**：函数签名即 CLI。参数类型、默认值直接写在类型注解里，几乎没有"声明参数"这个动作。

::: tip 选型速断
维护既有 click 项目、需要深度定制（插件、上下文对象、多级分组）→ click。新项目、团队已用类型注解与 mypy → typer。两者都自带 `--help`、Shell 补全和统一的错误提示，选哪个都不会错，早定一个就不再摇摆。
:::

## 核心要点

- 安装：`pip install click` 或 `pip install typer`（typer 会带上 click）。
- click 的三层结构：`@click.command()`（命令）→ `@click.group()`（组）→ 组嵌套（多级子命令）。
- 参数声明三件套：`@click.option`（可选参数）、`@click.argument`（位置参数）、参数类型（`click.Path`、`IntRange` 等）。
- typer 的核心等式：**函数参数的类型注解 + 默认值 = CLI 参数声明**，`bool` 参数自动变成开关。
- 测试不靠 `subprocess`：两者都提供 `CliRunner`（typer 的 `CliRunner` 封装自 click），在进程内模拟命令行调用。
- 发布靠打包：`entry_points` 让 `pip install` 之后直接敲命令名运行，见[打包与发布](/docs/python/03-工程化与运维/01-工程化/05-打包与发布)。
- ⚠️ 常见误区：click 里把业务逻辑写进装饰器回调；应保持命令函数薄，逻辑在可导入的模块里。
- ⚠️ 常见误区：typer 中把可选参数的默认值写成 `None` 却注解成 `str`；注解应为 `str | None`，否则类型检查报错。
- ⚠️ 常见误区：密钥通过命令行选项传入，留在 shell 历史与进程列表里；敏感值一律走环境变量。

## click：装饰器与命令

### 第一个 click 命令

```python
# cli.py
import click


@click.command()
@click.argument("name")
@click.option("--times", "-t", type=int, default=1, show_default=True, help="重复次数")
def greet(name: str, times: int) -> None:
    """向 NAME 打招呼。（这段 docstring 就是 --help 正文）"""
    for _ in range(times):
        click.echo(f"Hello, {name}!")


if __name__ == "__main__":
    greet()
```

```bash
$ python cli.py Alice -t 2
Hello, Alice!
Hello, Alice!
```

click 用 `click.echo` 与 `click.style` 处理输出与颜色（自动适配终端是否支持）。docstring 会原样进入 `--help`，所以命令函数的 docstring 值得认真写。

### 参数类型与校验

```python
import click

@click.command()
@click.option("--host", default="127.0.0.1", help="监听地址")
@click.option("--port", type=click.IntRange(1, 65535), default=8000, help="端口，1-65535")
@click.option("--mode", type=click.Choice(["train", "eval"]), required=True, help="运行模式")
@click.option("--config", type=click.Path(exists=True, dir_okay=False, path_type=str),
              help="配置文件（必须存在）")
@click.option("--force/--dry-run", default=False, help="强制执行或仅演练")
@click.option("--ratio", type=click.FloatRange(0, 1), default=0.8, help="数据切分比例")
def run(host: str, port: int, mode: str, config: str | None, force: bool, ratio: float) -> None:
    """启动任务。"""
    click.echo(f"{mode} on {host}:{port}, config={config}, force={force}, ratio={ratio}")
```

| 类型 | 用途 |
|---|---|
| `click.IntRange(min, max)` | 整数区间校验 |
| `click.FloatRange(min, max)` | 浮点区间校验 |
| `click.Choice([...])` | 枚举取值，非法值报错并列出候选 |
| `click.Path(exists=True, ...)` | 路径校验（存在性、可读、目录/文件约束） |
| `--x/--no-x` 双选项 | 布尔开关 |
| 自定义回调 `callback=` | 复杂校验，抛 `click.BadParameter` |

::: warning 敏感参数的处理
密码、Token 类选项用 `hide_input=True, prompt=True` 交互式输入，避免出现在 shell 历史中；CI 等非交互场景从环境变量读取，再经 `envvar="API_TOKEN"` 绑定进 click，代码中不出现明文。
:::

```python
@click.option("--token", envvar="API_TOKEN", hide_input=True, help="API Token，默认读环境变量 API_TOKEN")
```

### 分组与多级子命令

```python
import click


@click.group()
def cli() -> None:
    """deployctl — 部署管理工具。"""


@cli.group()
def db() -> None:
    """数据库子命令。"""


@db.command("migrate")
@click.option("--revision", default="head", show_default=True)
def db_migrate(revision: str) -> None:
    click.echo(f"migrating to {revision}")


@cli.command("status")
@click.option("--json", "as_json", is_flag=True, help="以 JSON 输出")  # 避免遮蔽 json 模块
def status(as_json: bool) -> None:
    click.echo("all services up" if not as_json else '{"status": "up"}')


if __name__ == "__main__":
    cli()
```

```bash
$ python cli.py db migrate --revision abc123
$ python cli.py status --json
```

跨命令共享状态（配置对象、数据库连接）用 click 的 Context：

```python
from dataclasses import dataclass


@dataclass
class AppContext:
    verbose: bool = False
    db_url: str = ""


@click.group()
@click.option("-v", "--verbose", is_flag=True)
@click.option("--db-url", envvar="DATABASE_URL", default="")
@click.pass_context
def cli(ctx: click.Context, verbose: bool, db_url: str) -> None:
    """公共参数挂在组上，子命令通过 ctx.obj 读取。"""
    ctx.obj = AppContext(verbose=verbose, db_url=db_url)


@cli.command("ping")
@click.pass_obj
def ping(obj: AppContext) -> None:
    click.echo(f"ping {obj.db_url or '(no db)'}")
```

## typer：类型注解即 CLI

typer 把参数声明完全交给函数签名，与[类型注解](/docs/python/03-工程化与运维/01-工程化/02-类型注解)体系无缝衔接——签名同时服务 CLI 与静态检查。

```python
# main.py
import typer
from typing_extensions import Annotated

app = typer.Typer(help="数据处理工具")


@app.command()
def process(
    source: Annotated[str, typer.Argument(help="源目录")],
    workers: Annotated[int, typer.Option(help="并发数")] = 4,
    mode: Annotated[str, typer.Option()] = "full",       # 默认值有含义时可用 Option() 携带元信息
    force: Annotated[bool, typer.Option("--force/--dry-run")] = False,
    exclude: Annotated[list[str], typer.Option(help="排除的模式，可多次传入")] = [],
):
    """处理 source 下的数据文件。"""
    typer.echo(f"process {source} workers={workers} mode={mode} force={force} exclude={exclude}")


@app.command()
def clean(source: Annotated[str, typer.Argument(help="源目录")]):
    """清理中间产物。"""
    typer.echo(f"clean {source}")


if __name__ == "__main__":
    app()
```

要点：

- **必填** = 无默认值的参数；**可选** = 有默认值的参数（自动加 `--` 长选项）。
- `bool` 参数自动渲染为 `--force/--dry-run` 一对开关；`list[str]` 支持 `--exclude a --exclude b`。
- `typer.Argument` / `typer.Option` 只在需要附加元信息（help、约束、自定义选项名）时使用，其余情况纯默认值即可。
- 枚举直接用 `enum.Enum` 子类作注解，typer 自动做取值校验。

```python
import enum
import typer
from typing_extensions import Annotated


class Mode(str, enum.Enum):
    full = "full"
    incremental = "incremental"


@app.command()
def sync(mode: Annotated[Mode, typer.Option(case_sensitive=False)] = Mode.full):
    typer.echo(f"sync mode={mode.value}")
```

typer 同样支持子命令：`app.add_typer(sub_app, name="db")` 把多个 `Typer` 实例挂成组，每个子模块定义自己的 `Typer`，天然按文件拆分，适合命令很多的工程。

::: tip 与类型检查的协同
typer 是"类型注解驱动 CLI"的范本：`Annotated[int, typer.Option(...)]` 既是 CLI 声明，也是 mypy/pyright 可检查的函数签名。把 CLI 定义写成函数签名后，单元测试可以直接调用函数（绕过 CLI 层），也可以走 CliRunner 走全链路，两层测试互补。
:::

## 测试：CliRunner

click 与 typer 的命令都可以在**进程内**测试，不需要起子进程：

```python
# click 的测试
import click
from click.testing import CliRunner


@click.command()
@click.option("--n", type=int, default=1)
def roll(n: int) -> None:
    click.echo(f"rolling {n}")


def test_roll_default():
    runner = CliRunner()
    result = runner.invoke(roll, [])
    assert result.exit_code == 0
    assert "rolling 1" in result.output


def test_roll_bad_input():
    runner = CliRunner()
    result = runner.invoke(roll, ["--n", "abc"])  # 类型错误不会抛异常，被 runner 捕获
    assert result.exit_code != 0
```

```python
# typer 的测试（typer.testing.CliRunner 是同一套机制的封装）
from typer.testing import CliRunner
from main import app

runner = CliRunner()


def test_help():
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "process" in result.output


def test_process():
    result = runner.invoke(app, ["process", "data/", "--workers", "8"])
    assert result.exit_code == 0
    assert "workers=8" in result.output
```

::: tip 测试策略
- `--help` 快照测试：输出变化即提示文案回归，评审时一眼可见。
- 参数校验测试：非法输入断言 `exit_code != 0`，保证"解析期报错"不退化。
- 分层测试：CLI 函数保持薄，业务逻辑单独单测；CliRunner 只覆盖参数绑定与分发。
:::

## 打包为命令

脚本分发给同事最体面的方式是做成可安装的包：`pip install` 后直接敲命令名。在 `pyproject.toml` 中声明入口点：

```toml
[project.scripts]
deployctl = "mycli.cli:cli"      # click：模块.对象
datatool = "mycli.main:app"      # typer：模块.Typer 实例（typer 自动适配）
```

安装与验证：

```bash
pip install -e .        # 可编辑安装，改代码立即生效
deployctl --help
datatool process data/
```

完整的 `src/` 布局、版本管理、发布到 PyPI 的流程见[打包与发布](/docs/python/03-工程化与运维/01-工程化/05-打包与发布)；Shell 自动补全：click 用 `click-completion` 或内置 `install_completion`，typer 自带 `--install-completion` 与 `--show-completion`。

## click 与 typer 对比及迁移

| 维度 | click | typer |
|---|---|---|
| 声明方式 | 装饰器逐个声明参数 | 函数签名注解自动生成 |
| 样板量 | 每参数一行装饰器 | 几乎为零 |
| 多级分组 | 成熟稳定，`Group` 可嵌套、可插件化 | `add_typer` 组合，够用 |
| 上下文/回调 | `Context`、`callback` 机制完整 | 底层透传 click 同款能力 |
| 类型检查协同 | 装饰器对 mypy 不透明 | 签名即注解，检查器友好 |
| 适用团队 | 已有 click 资产、需深度定制 | 新项目、类型注解文化 |

**迁移路径**：argparse → click 时，`add_argument` 与 `@click.option` 一一对应，机械替换即可；click → typer 时，把装饰器参数"下沉"为函数签名，命令函数体不动。所有框架的 `--help`、退出码、参数语义一致，用户无感知。

## 常见陷阱

| 陷阱 | 后果 | 正确做法 |
|---|---|---|
| 密钥写成命令行选项 | 泄漏到 shell 历史与进程列表 | `envvar=` 绑定环境变量或交互式 `hide_input` |
| click 中选项名遮蔽内置模块（`--json` → `json`） | 参数名冲突导致奇怪报错 | 显式指定属性名：`"--json", "as_json"` |
| typer 中 `str` 注解配 `None` 默认值 | 静态检查报错、运行时类型不符 | 注解写成 `str | None` |
| 命令函数里写重业务逻辑 | 无法单测、无法复用 | 逻辑下沉到普通模块，命令只做绑定与分发 |
| 忘记 `if __name__ == "__main__"` 之外的入口声明 | 打包后命令不可用 | `pyproject.toml` 的 `project.scripts` 指向正确对象 |
| 测试用 subprocess 起子进程 | 慢、难断言、受环境干扰 | 用 CliRunner 进程内调用 |

## 最佳实践

1. **命令函数保持三层薄**：解析（框架负责）→ 绑定（类型转换）→ 委托（调用业务函数并返回退出码）。
2. **公共参数上提到组**：verbose、配置路径、环境标识放组级 option，经 `ctx.obj` 或依赖注入下发。
3. **帮助文案即文档**：docstring 写清用途与示例，配 `show_default=True` 展示默认值。
4. **一切副作用可演练**：破坏性操作提供 `--dry-run`，让用户先看计划再执行。
5. **测试双层覆盖**：CliRunner 测参数绑定与分发，业务函数单独单测，两者都不需要真实环境。
6. **入口尽早打包**：脚本一旦要给别人用，立即转成 `project.scripts` 入口，杜绝"把这个 .py 发你"。

## 延伸阅读

- [click 官方文档](https://click.palletsprojects.com/) — 参数类型、Context、插件机制的权威参考
- [typer 官方文档](https://typer.tiangolo.com/) — 类型注解驱动的 CLI 全套教程
- [argparse 命令行](/docs/python/07-模块/03-内置模块/23-argparse命令行) — 标准库方案与本文选型边界的另一半
- [类型注解](/docs/python/03-工程化与运维/01-工程化/02-类型注解) — typer 所依赖的注解体系与 Annotated 语法
- [打包与发布](/docs/python/03-工程化与运维/01-工程化/05-打包与发布) — entry_points 入口、src 布局与发布流程
