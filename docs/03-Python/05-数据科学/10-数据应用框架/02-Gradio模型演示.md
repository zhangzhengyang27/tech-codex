---
title: Gradio 模型演示
description: 用 Gradio 为机器学习模型快速搭起可分享的网页演示：Interface 与 Blocks 双模式、事件队列与 Hugging Face Spaces 部署。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# Gradio 模型演示

在 [统计与建模](/docs/python/05-数据科学/04-统计与建模/01-回归分析) 系列中，模型的终点往往是 Notebook 里的一行 `model.predict()`——只有作者自己能用。而模型的价值要靠"用的人"来体现：业务方想点一点试试效果，同学想复现结果，评审想看真实输入下的输出。Gradio 做的就是这件事：**给任意 Python 函数（尤其是模型推理函数）套上一个可交互、可分享的网页界面**，十几行代码完成从 `predict()` 到公开 URL 的跨越。

## 概念说明

Gradio 的定位是"ML 模型快速演示与分享"，它把 Web 界面抽象成一个公式：

> **界面 = 函数 + 输入组件 + 输出组件**

你只需要回答三个问题：函数是哪个、用户给什么、用户看什么。Gradio 负责生成页面、处理上传、排队请求、渲染结果。它与 Streamlit 的分工也很清晰：Streamlit 面向"数据应用"（整页脚本反复重跑），Gradio 面向"函数演示"（定义清晰的输入 → 推理 → 输出流程），后者天然贴合 ML 模型的调用形态。

```mermaid
flowchart LR
    A["用户在网页输入<br/>文本/图像/音频/文件"] --> B["Gradio 序列化<br/>为 Python 对象"]
    B --> C["调用你的函数<br/>fn(inputs)"]
    C --> D["返回值序列化<br/>为前端展示"]
    D --> E["网页渲染结果<br/>标签/表格/图像"]
```

::: tip 适用边界
Gradio 适合**模型 Demo、算法对比、教学演示**。它不是业务系统框架：没有复杂的多页路由与权限体系，也不适合做长流程的数据应用——那是 Streamlit 和 Dash 的主场。
:::

## 核心要点

- 两种构建模式：**Interface**（一个函数、一组输入输出，几分钟出 Demo）与 **Blocks**（自由布局、多事件，做复杂界面）。
- 组件决定"类型转换"：`gr.Image` 自动把上传文件转成 numpy 数组或 PIL 对象，`gr.Audio` 可以直接给出文件路径。
- 事件监听器统一签名 `fn, inputs, outputs`，`Interface` 内部也是用同一套机制。
- 请求默认走**队列**排队执行，长任务不会拖垮服务，配合进度条提示用户。
- `demo.launch()` 是启动入口，`share=True` 可生成临时公网链接，正式分享走 Hugging Face Spaces。
- ⚠️ 常见误区：把训练代码写进回调函数。每次点击都重新训练，演示现场"卡出奇迹"——模型只应加载/训练一次。
- ⚠️ 常见误区：`inputs` 的组件顺序与函数参数顺序对不上，导致参数错位、结果莫名其妙。
- ⚠️ 常见误区：把 API 密钥写进代码上传到 Spaces。Spaces 仓库是公开的，密钥必须走平台的 Secrets 机制。

## Interface：最短路径生成 Demo

`gr.Interface` 用三个核心参数描述一个应用：`fn`（函数）、`inputs`（输入组件）、`outputs`（输出组件）。

```python
import gradio as gr

def greet(name: str) -> str:
    return f"你好，{name}！"

demo = gr.Interface(
    fn=greet,                              # 任意 Python 函数
    inputs=gr.Textbox(label="你的名字"),
    outputs=gr.Textbox(label="问候语"),
    title="第一个 Gradio 应用",
    description="把函数变成网页，只需要三个参数",
)

demo.launch()                              # 启动本地服务，默认 http://127.0.0.1:7860
```

运行脚本后浏览器自动打开页面，改代码保存后配合 `gradio app.py` 命令还能热重载。`inputs`/`outputs` 既可以是单个组件，也可以是组件列表——列表会与函数参数、返回值按顺序一一对应。

再加两个常用参数就能显著提升演示质量：`examples` 提供可一键点击的示例输入，`description`/`article` 补充说明文字。

```python
demo = gr.Interface(
    fn=greet,
    inputs=gr.Textbox(label="你的名字"),
    outputs=gr.Textbox(label="问候语"),
    examples=[["张三"], ["Ada"]],          # 页面上出现可点击的示例
)
```

## 输入输出组件

Gradio 内置了覆盖多模态的组件库，每个组件都可以同时充当输入或输出，关键在于它帮你完成了"文件 ↔ Python 对象"的转换。

| 组件 | 常见用法 | 说明 |
|---|---|---|
| `gr.Textbox` | 文本输入/输出 | `lines` 控制多行 |
| `gr.Number` / `gr.Slider` | 数值输入 | Slider 可限定范围与步长 |
| `gr.Image` | 图像输入/输出 | `type="numpy"`/`"pil"`/`"filepath"` 决定函数收到什么 |
| `gr.Audio` | 音频输入/输出 | `sources` 指定麦克风/上传；`type="filepath"` 拿路径 |
| `gr.File` | 任意文件 | 返回下载链接，适合输出报告文件 |
| `gr.DataFrame` | 表格输入/输出 | 可编辑表格，常配合 `pandas.DataFrame` |
| `gr.Label` | 分类结果输出 | 接收"标签 → 概率"字典，渲染成条形 |
| `gr.Plot` | 图表输出 | 直接渲染 Matplotlib/Plotly 对象 |

图像与音频的处理示例：

```python
import gradio as gr
from PIL import Image, ImageOps

def to_grayscale(img: Image.Image) -> Image.Image:
    """img 由 gr.Image(type="pil") 自动转换而来"""
    return ImageOps.grayscale(img)

demo = gr.Interface(
    fn=to_grayscale,
    inputs=gr.Image(type="pil", label="上传图片"),
    outputs=gr.Image(label="灰度结果"),
)
demo.launch()
```

```python
import gradio as gr

def audio_info(path: str) -> str:
    """type="filepath" 时函数收到的是服务器上的临时文件路径"""
    import os
    size_kb = os.path.getsize(path) / 1024
    return f"收到音频文件：{os.path.basename(path)}（{size_kb:.1f} KB）"

demo = gr.Interface(
    fn=audio_info,
    inputs=gr.Audio(type="filepath", sources=["microphone", "upload"]),
    outputs=gr.Textbox(label="信息"),
)
demo.launch()
```

::: tip 组件类型决定函数签名
写回调函数前先看组件的 `type` 参数：同一张图片，`type="numpy"` 时是 ndarray（适合 OpenCV/模型推理），`type="pil"` 时是 PIL Image（适合图像处理），`type="filepath"` 时是路径字符串（适合自定义读取）。类型选对，函数体里就不用再做手工转换。
:::

## Blocks：灵活布局

Interface 只能表达"单函数、单步骤"。当应用需要多个输入区、按钮分步触发、结果分区展示时，切换到 `gr.Blocks`：用 `with` 语法声明布局，再手动绑定事件。

```python
import gradio as gr

def uppercase(text: str) -> str:
    return text.upper()

def char_count(text: str) -> int:
    return len(text)

with gr.Blocks(title="文本工具箱") as demo:
    gr.Markdown("# 文本工具箱")
    with gr.Row():                        # 一行两列
        text_in = gr.Textbox(label="输入文本")
        text_out = gr.Textbox(label="输出")
    with gr.Row():
        btn_up = gr.Button("转大写")
        btn_len = gr.Button("统计长度")

    btn_up.click(uppercase, inputs=text_in, outputs=text_out)
    btn_len.click(char_count, inputs=text_in, outputs=text_out)

demo.launch()
```

要点：

- 布局容器：`gr.Row`（横向排列）、`gr.Column`（纵向分组）、`gr.Tabs`/`gr.Tab`（标签页）、`gr.Accordion`（折叠面板）。
- 事件绑定：每个组件都有 `.click()`、`.change()`、`.input()`、`.submit()` 等监听器，签名统一为 `fn, inputs, outputs`。
- 一个函数可以被多个事件复用，一个事件也可以触发多个函数——Interface 做不到的编排，Blocks 都可以。

## 事件与队列

Gradio 的事件模型围绕"监听器"展开。除了按钮点击，输入变化本身也能触发计算：

```python
import gradio as gr

with gr.Blocks() as demo:
    n = gr.Number(label="数字")
    square = gr.Number(label="平方")

    n.input(lambda x: None if x is None else x ** 2,
            inputs=n, outputs=square)     # 输入变化即触发，无需按钮

demo.launch()
```

回调函数可以是普通函数，也可以是 `lambda`。事件之间还能"链式"衔接：把上一个事件的输出组件作为下一个事件的输入，形成多步流水线（例如：上传音频 → 转写文本 → 文本摘要）。

### 队列机制

所有请求默认经过**队列**排队执行，这是 Gradio 面向演示场景的关键设计：函数执行期间新请求不会丢失，也不会并发把服务器压垮。

```python
demo.queue(max_size=20)      # 排队上限 20，超出后提示稍后再试
demo.launch()
```

长时间任务建议配合进度条，把 `gr.Progress` 作为函数的最后一个参数即可：

```python
def batch_process(files, progress=gr.Progress()):
    results = []
    for i, f in enumerate(files):
        results.append(process_one(f))
        progress((i + 1) / len(files))    # 页面实时显示进度
    return results
```

::: warning 演示现场的网络与并发
公网演示时把 `max_size` 与并发数设置保守一些，避免一次"全员围观"压垮免费规格的机器。若单次推理超过几十秒，优先考虑加速推理（更小模型、批量化）而不是无限调大队列。
:::

## 与 sklearn 模型集成：完整最小应用

下面是"训练 + 演示"一体的最小应用：用 scikit-learn 内置的鸢尾花数据集训练随机森林，再包成 Gradio 页面。保存为 `iris_demo.py`，`python iris_demo.py` 即可运行（`pip install gradio scikit-learn`）。

```python
"""
iris_demo.py —— 鸢尾花品种分类演示
运行：python iris_demo.py
"""
import gradio as gr
from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# ---- 训练阶段：脚本启动时只执行一次 ----
X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
model = RandomForestClassifier(
    n_estimators=100, random_state=42
).fit(X_train, y_train)
print(f"测试集准确率：{model.score(X_test, y_test):.2%}")

CLASS_NAMES = ["山鸢尾", "变色鸢尾", "维吉尼亚鸢尾"]


# ---- 推理阶段：每次点击按钮都会调用 ----
def predict(sepal_len, sepal_wid, petal_len, petal_wid):
    """四个测量值 → 品种概率分布"""
    features = [[sepal_len, sepal_wid, petal_len, petal_wid]]
    proba = model.predict_proba(features)[0]
    return {name: float(p) for name, p in zip(CLASS_NAMES, proba)}


demo = gr.Interface(
    fn=predict,
    inputs=[
        gr.Number(label="花萼长度 (cm)"),
        gr.Number(label="花萼宽度 (cm)"),
        gr.Number(label="花瓣长度 (cm)"),
        gr.Number(label="花瓣宽度 (cm)"),
    ],
    outputs=gr.Label(num_top_classes=3, label="品种概率"),
    examples=[[5.1, 3.5, 1.4, 0.2], [6.2, 2.8, 4.8, 1.8]],
    title="鸢尾花品种分类",
    description="scikit-learn 随机森林 · 输入四个测量值即可预测品种",
)

if __name__ == "__main__":
    demo.launch()
```

结构上值得注意的三点：

1. **训练与推理分离**。训练代码在 `launch()` 之前、回调之外，进程启动时执行一次；回调函数 `predict` 里只有推理。
2. **`gr.Label` 与概率字典对接**。`predict_proba` 输出的概率向量转成 `{"品种名": 概率}` 字典，`gr.Label` 自动渲染成带排序的概率条。
3. **`examples` 直接复用测试集风格的记录**，评审者一键点击即可验证模型行为。

::: tip 从建模课到 Demo 只差一步
建模系列（特征工程、交叉验证、调参）产出的 `model` 对象，套上 `predict` 回调与输入组件就是一个完整 Demo。更复杂的模型（深度学习、Pipeline 封装）同样适用：把"预处理 + 推理 + 后处理"封装成一个函数即可。
:::

## Hugging Face Spaces 部署思路

Gradio 应用最主流的分享方式是 **Hugging Face Spaces**：把代码推送到 Space 仓库，平台自动构建并常驻运行，得到一个可公开访问的 URL。

Space 仓库的最小结构：

```text
iris-demo/
├── app.py            # 入口文件（默认名称）
├── requirements.txt  # 依赖清单，构建时自动 pip install
└── README.md         # 头部元数据声明使用 Gradio SDK
```

其中 `README.md` 顶部需要一段 YAML 元数据，告诉平台如何运行应用：

```yaml
---
title: Iris Demo
sdk: gradio
app_file: app.py
---
```

部署流程四步：

1. 在 Hugging Face 网站上新建 Space，SDK 选择 **Gradio**，硬件选免费档（CPU 基础规格）起步。
2. 上传或 `git push` 上述三个文件——`app.py` 就是本地那份代码，通常无需改动。
3. 平台按 `requirements.txt` 安装依赖（写入 `gradio`、`scikit-learn` 等及版本约束），构建完成后自动启动。
4. 得到 `https://huggingface.co/spaces/<用户名>/<Space 名>`，链接可直接发给任何人。

需要密钥的场景（调用大模型 API 等），在 Space 的 **Settings → Variables and secrets** 中配置，代码里用 `os.environ` 读取，绝不写进仓库。

::: warning 免费档的现实约束
免费 CPU 档适合轻量模型。大模型推理通常有三条路：升级付费硬件、把推理放在外部服务而 Space 只做界面、或改用平台托管推理接口。演示前务必用目标设备实测一次延迟。
:::

本地开发时若想先"临时"分享给同事，也可以用 `demo.launch(share=True)` 生成一条有时效的公网隧道链接——适合会议现场，不适合长期使用。

## 常见陷阱

| 陷阱 | 现象 | 正确做法 |
|---|---|---|
| 回调里训练/加载模型 | 每次点击卡顿数秒 | 进程启动时加载一次，回调只做推理 |
| `inputs` 顺序与参数不对应 | 参数错位，结果异常 | 组件列表顺序 = 函数参数顺序 |
| 组件 `type` 与函数预期不符 | 收到路径却当数组用 | 明确每个组件的 `type` 参数 |
| 忘记调用 `demo.launch()` | 脚本结束，页面没起来 | 确认最后一行是 `launch()` |
| 长任务无排队、无进度 | 界面像假死，用户重复点击 | 默认队列 + `gr.Progress` |
| 密钥写进代码推送到 Spaces | 密钥随公开仓库泄露 | Spaces Secrets + `os.environ` |

## 版本说明

- Gradio 大版本迭代较快，近年经历了 3.x → 4.x → 5.x 的演进；**Interface 与 Blocks 双模型、`launch()` 入口是长期稳定骨架**，升级时优先查阅官方迁移指南。
- 早期版本用字符串简写声明组件（如 `inputs="text"`），新版本统一使用 `gr.Textbox` 这类组件类。
- 队列在新版本中默认开启，大多数应用无需手动调用 `demo.queue()`；需要调并发与容量时才显式配置。
- 演示项目建议在 `requirements.txt` 中**锁定版本**，避免平台构建时因大版本升级导致界面行为变化。

## 延伸阅读

- Gradio 官方 Quickstart：https://www.gradio.app/guides/quickstart
- Gradio 组件与事件 API 参考：https://www.gradio.app/docs/gradio
- Hugging Face Spaces 官方文档：https://huggingface.co/docs/hub/spaces
- 本站：[机器学习概述](/docs/python/05-数据科学/04-统计与建模/01-回归分析) — 模型训练侧的方法论与实操入口
- 本站：[Streamlit 数据应用](/docs/python/05-数据科学/10-数据应用框架/01-Streamlit数据应用) — 同属数据应用框架的"脚本转应用"方案
