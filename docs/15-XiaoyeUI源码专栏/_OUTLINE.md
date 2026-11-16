# XiaoyeUI 源码专栏 · 全书队列（OUTLINE）

> 与 `PROMPT.md` 配套使用。**队列顺序即写作顺序，编号即文件编号，不要自行增删或改号。**
> 每篇写完必须回填本文件的「状态」列。`—` 表示动笔时在 Step 1 现场核实。

## 约定

- **落盘**：`docs/column/<层目录>/<编号>-<kebab-slug>.md`。示例：`docs/column/03-components/07-feedback/C07-01-modal-对话框.md`。
- **源码映射**：组件篇的目标源码 = `packages/xiaoye-ui/src/<slug>/`（98 个 slug 与 `apps/docs/components/<slug>.md` 一一对应）。
- **状态图例**：`待写` → `进行中` → `已完成` → `已审`（只有人工审过的篇目才解锁依赖它的后续篇）。
- **依赖列语义**：列出的篇目必须为 `已审` 或 `已完成` 才能开写本篇。

### 类别目录对照表（`03-components` 下的 12 个目录）

| 类号 | 类名 | 目录 |
| --- | --- | --- |
| C01 | 通用基础 | `03-components/01-general/` |
| C02 | 布局与容器 | `03-components/02-layout/` |
| C03 | 导航 | `03-components/03-navigation/` |
| C04 | 基础表单控件 | `03-components/04-form-controls/` |
| C05 | 选择与日期 | `03-components/05-picker/` |
| C06 | 表单编排与编辑 | `03-components/06-form-editor/` |
| C07 | 反馈与浮层 | `03-components/07-feedback/` |
| C08 | 表格与虚拟化 | `03-components/08-table/` |
| C09 | 树与结构可视化 | `03-components/09-tree/` |
| C10 | 媒体与内容展示 | `03-components/10-media/` |
| C11 | 状态与信息呈现 | `03-components/11-status/` |
| C12 | 全局与应用级 | `03-components/12-global/` |

横写篇文件名用 `<类号>-00-overview.md`（例：`C07-00-overview.md`）。

### 队列总量

| 层 | 篇数 |
| --- | --- |
| `01-architecture` | 8 |
| `02-infrastructure` | 16 |
| `03-components`（12 类横写 12 + 公开组件 98） | 110 |
| **合计** | **134** |

按每轮 ≤3 篇推进 ≈ **45 轮**。

### 样稿轮（第一优先，写完即停）

| 编号 | 标题 | 选题理由 |
| --- | --- | --- |
| A03 | Design Token 四层体系 | 引擎类体裁：跨模块、重图、重取舍 —— **已审（样稿）** |
| C07-01 | Modal 对话框 | 组件类体裁：依赖 vc-dialog/vc-trigger/vc-util，覆盖浮层+焦点+层级 —— **已审（样稿）** |

两篇通过人工审基准后，才解锁批量。

> **样稿轮已知偏差（须在读过样稿后处置）**：`PROMPT.md` §8 规则 1 要求组件篇等其前置写完，但 C07-01 的三个前置 A07 / I02 / I10 目前仍是「待写」——样稿阶段故意先写它以获得「组件体裁」的代表样本。后果是 C07-01 里有 3 处前向引用（§一 依赖表、§三 时序、§七 坑 5 引用 A07/I02/I10），A07 写完必须做一次一致性回扫，确认「浮层三件套」的说法与 A07 的定名一致。

---

## 01-architecture（8 篇）

| 编号 | 标题 | 主要源码 | 主题边界（不与谁重叠） | 前置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| A01 | monorepo 拓扑与发布链路 | 根 `pnpm-workspace.yaml`、各包 `package.json`、`scripts/`、`packages/*/src` | 只讲包边界、构建顺序、发布产物；导出聚合细节归 A02 | — | 已完成 |
| A02 | 组件目录契约与 `gen:entries` 生成物链路 | `packages/xiaoye-ui/scripts/entry-generator.mjs`、`gen-entries.mjs`、`ownership-pins.mjs`、`src/components.ts`、`typings/global.d.ts` | 唯一讲三个生成物与歧义名定主机制；A01 不展开 | A01 | 已完成 |
| A03 | Design Token 四层体系 | `src/theme/`（`interface/seeds.ts`、`interface/maps/`、`interface/alias.ts`、`interface/components.ts`、`themes/`、`util/alias.ts`、`util/genComponentStyleHook.ts`、`convertLegacyToken.ts`） | 讲 Token 定义与派生；样式注水与缓存归 A04 | A01 | 已审（样稿） |
| A04 | cssinjs 样式引擎与 SSR 注水 | `src/_util/cssinjs/`（`StyleContext.tsx`、`Cache.ts`、`transformers/`、`linters/`、`hooks/`、`theme/`）、`src/_util/static-style-extract/` | 引擎本体与 `hashId`；`styleChecker` 等运行时约束归 I14 | A03 | 已完成 |
| A05 | ConfigProvider 注入链与 Size/Disabled Context | `src/config-provider/`（含 `hooks/useConfigInject.ts`、`SizeContext`、`DisabledContext`）、`src/locale/LocaleReceiver.tsx` | 只讲纵向注入路径；locale 语言包体系归 I11 | A03, A04 | 已完成 |
| A06 | Props 体系与类型工具 | `src/_util/vue-types/`、`_util/props-util/`、`_util/type.ts`、`_util/initDefaultProps`、`pickAttrs`、`toReactive` | 讲 props 定义到 attrs 透传的契约；各组件特例留在组件篇 | A02 | 已完成 |
| A07 | 交互基础设施总览：一个浮层是怎么拼起来的 | `src/vc-trigger/`、`vc-align/`、`_util/wave/`、`focus-trap/`、`portal/`、`_util/zIndexManager.ts`、`_util/overlayEventBus.ts` | 横向总览与调用序列；单模块深读归 I01/I02/I10 | A05, A06 | 已完成 |
| A08 | 消费侧集成：自动导入与文档生成链 | `packages/vite-plugin/src`、`packages/auto-import-resolver/src`、`packages/nuxt-module/src`、`apps/docs/.vitepress/`、`scripts/generate-llms-txt.mjs` | 讲库外部消费面；图标包内部结构归 I15 | A01, A02 | 已完成 |

---

## 02-infrastructure（16 篇）

| 编号 | 标题 | 主要源码 | 主题边界 | 前置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| I01 | vc-align 定位求解与碰撞检测 | `src/vc-align/` | A07 只给调用序列，本篇给算法与坐标推导 | A07 | 已完成 |
| I02 | vc-trigger 弹出时序与事件穿透 | `src/vc-trigger/` | 受控/非受控开合、pending 状态机、与 align 的握手 | A07 | 已完成 |
| I03 | vc-util 工具层 | `src/vc-util/` | DOM/Portal/生命周期兼容工具，被 12+ 组件复用 | A06 | 已完成 |
| I04 | 输入基座：vc-input 与 BaseInput | `src/vc-input/`、`_util/BaseInput.tsx`、`BaseInputInner.tsx` | IME 合成、光标控制、受控回退；`clearable` 等特例在 input 篇 | A06 | 已完成 |
| I05 | vc-table 渲染架构 | `src/vc-table/` | 测量行、固定列、sticky、单元格拆分；状态机归 I06 | C08-00 | 已完成 |
| I06 | table-core 状态机 | `src/table-core/` | 排序/筛选/选择/展开/分组的纯逻辑内核与列定义 DSL | I05 | 已完成 |
| I07 | 日期计算内核 | `src/date-picker/generate/`、`src/vc-picker/` | dayjs 插件链、面板生成、单位换算；组件层交互归 C05-06 | A07 | 已完成 |
| I08 | 虚拟化双实现：vc-virtual-list 与 virtual-scroller | `src/vc-virtual-list/`、`virtual-list/`、`virtual-scroller/` | 两套策略的取舍与选型；为何并存 | I03 | 已完成 |
| I09 | 动画与 motion 体系 | `src/style/motion/`、`_util/collapseMotion.tsx`、`_util/transition.ts(x)`、`easings.ts` | 进出场协议、`motionName` 约定、prefers-reduced-motion | A04 | 已完成 |
| I10 | z-index 层级编排 | `src/_util/zIndexManager.ts` | 弹出层叠序与 popover/tooltip 冲突处理 | A07 | 已完成 |
| I11 | 多语言体系 | `src/locale/`（60+ 语言包）、`locale-provider/`、`_util/props-util` 的 `renderEmpty` 链 | 语言包装载与组件文案取用路径 | A05 | 已完成 |
| I12 | 校验适配层 resolvers | `src/resolvers/`（`zod`、`yup`、`joi`、`superstruct`、`valibot`）、`src/form/`、`src/utils/forms.ts` | schema → Form 规则的归一化契约 | A06 | 已完成 |
| I13 | 响应式内核 hooks | `src/_util/hooks/`（`useMergedState`、`useState`、`useLayoutState`、`useBreakpoint`、`useId`、`useFlexGapSupport`、`useDestroyed`、`useRefs`、`useComponentProps`、`_vueuse/`） | 受控/非受控统一实现的横写；单组件用法归组件篇 | A06 | 已完成 |
| I14 | 运行时约束与静态检查 | `_util/warning.ts`、`styleChecker.ts`、`unreachableException.ts`、`safeUrl.ts`、`sanitizeSvg.ts`、`static-style-extract/` | 开发期告警、SSR 样式抽取校验、URL/SVG 消毒；引擎本体归 A04 | A04 | 已完成 |
| I15 | icons 包生成链与兼容层 | `packages/icons/src/`（239 个图标目录、239 个 `.vue`、`index.js` 兼容层 1,356 行） | svg→组件产物、`xyicon` 包裹约定、命名导入红线；使用面归 A08 | A01 | 已完成 |
| I16 | core / utils / metadata 三包的分工 | `packages/core/src`、`packages/utils/src`、`packages/metadata/src`、`src/_shared/`、`src/config/` | 为何存在两套 utils 与 `_shared`；元数据如何被文档与 IDE 消费 | A01 | 已完成 |

---

## 03-components（12 类，110 篇）

每类第 0 篇是**横写对比篇**：该类组件的共性抽象、近义组件的选型边界、共同依赖的基础设施。组件篇禁止重复横写篇已展开的机制，只允许一行引用。

### C01 通用基础（1 横写 + 6）

| 编号 | slug | 标题 | 底层（已核实） | 前置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| C01-00 | — | 类横写：button/icon/tag/chips/badge 的职责切分 | — | A06, A07 | 已完成 |
| C01-01 | button | Button 按钮 | `_util/wave`、`transButton` | A06, A07 | 已完成 |
| C01-02 | icon | Icon 图标 | `packages/icons` | I15 | 已完成 |
| C01-03 | tag | Tag 标签 | — | C01-00 | 已完成 |
| C01-04 | chips | Chips 选项 Chips | — | C01-03 | 已完成 |
| C01-05 | badge | Badge 徽标 | `vc-util` | C01-00 | 已完成 |
| C01-07 | empty | Empty 空状态 | `config-provider` 的 `renderEmpty` | A05, I11 | 已完成 |

### C02 布局与容器（1 + 13）

| 编号 | slug | 标题 | 底层（已核实） | 前置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| C02-00 | — | 类横写：栅格/flex/space 三代布局的取舍 | — | A04, A06 | 已完成 |
| C02-01 | grid | Grid 栅格 | `responsiveObserve`（原先这里还记了 `_util/gapSize`，是范围错配：`grep -rn gapSize` 显示它唯一的消费者是 `flex/index.tsx:6`，与 grid 零引用，已由 C02-01 正文二节登记并移交给 C02-02） | C02-00 | 已完成 |
| C02-02 | flex | Flex 弹性布局 | `_util/gapSize`（自 C02-01 移交） | C02-00 | 已完成 |
| C02-03 | layout | Layout 布局 | — | C02-00 | 已完成 |
| C02-04 | space | Space 间距 | 无（C02-04 取证：`grep -rn vc-overflow src/space` 零命中，`vc-overflow` 的真实消费者只有 menu 的三个文件与 `vc-select/Selector/MultipleSelector.tsx:10`；原先这里记的 `vc-overflow` 是登记错误，已删） | C02-00 | 已完成 |
| C02-05 | divider | Divider 分割线 | — | C02-00 | 已完成 |
| C02-06 | splitter | Splitter 分隔面板 | 无（本篇写作时取证：`grep -rln "resize-observer" 与 "ResizeObserver" src/splitter/` 均零命中，`Splitter.tsx:2-3` 用的是 `@xiaoye-ui/utils/dom` 的尺寸读取；原先这里记的 `vc-resize-observer` 与 C02-11 同属登记错误，已删） | C02-00 | 已完成 |
| C02-07 | card | Card 卡片 | `_shared/CardLike.tsx` | C02-00 | 已完成 |
| C02-08 | panel | Panel 面板 | `_shared/CardLike` | C02-07 | 已完成 |
| C02-09 | collapse | Collapse 折叠面板 | `_util/collapseMotion` | I09 | 已完成 |
| C02-10 | block-ui | BlockUI 区块容器 | — | C02-00 | 已完成 |
| C02-11 | scroll-panel | ScrollPanel 滚动面板 | 无（本篇取证：`grep -rn "resize-observer" 与 "ResizeObserver" src/scroll-panel/` 均零命中，它只挂 `window.resize`，见 C02-11 论点 1；原先这里记的 `vc-resize-observer` 是登记错误，已删） | C02-00 | 已完成 |
| C02-13 | toolbar | Toolbar 工具栏 | 无（原先这里记的是 `space`，C02-13 取证为登记错误：`toolbar/Toolbar.tsx:2-7` 的 import 只有 `./toolbarTypes`、`_util/props-util`、`useConfigInject`、`_util/type`、`./style`，全目录零引用 Space/Flex/gapSize/compact，间距由 `toolbar/style/index.ts:34` 的两行 `gap` 直出；目录内唯一的「space」字样是 `style/index.ts:22` 的 `justifyContent: 'space-between'`。误登记的来源很可能是文档示例 `apps/docs/examples/toolbar/responsive.vue:2` 用 `xy-space` 外包工具栏） | C02-04 | 已完成 |
| C02-14 | fieldset | Fieldset 字段集 | `form` 上下文 | C06-01 | 已完成 |

### C03 导航（1 + 13）

| 编号 | slug | 标题 | 底层（已核实） | 前置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| C03-00 | — | 类横写：menu/tabs/steps/breadcrumb 的选中态模型 | — | A06, I13 | 已完成 |
| C03-01 | menu | Menu 导航菜单 | `vc-overflow`、`vc-resize-observer` | C03-00 | 已完成 |
| C03-02 | mega-menu | MegaMenu 大图菜单 | `src/mega-menu/`（原先这里写 `src/mega-menu/mega`，该子目录不存在，C03-02 已用 `ls` 与 `find` 两种方法核实目录只有 `MegaMenu.tsx`、`index.ts`、`megaMenuTypes.ts`、`style/`、`__tests__/`；另注：`data-xy-active` 不是死属性，galleria 的两个文件、panel-menu、context-menu 都读它，判形命令 `grep -rln data-xy-active packages/xiaoye-ui/src`） | C03-01 | 已完成 |
| C03-03 | panel-menu | PanelMenu 面板菜单 | `collapse` | C02-09 | 已完成 |
| C03-04 | breadcrumb | Breadcrumb 面包屑 | — | C03-00 | 已完成 |
| C03-05 | tabs | Tabs 标签页 | 无 vendor 渲染件（只用 `_util` hooks、`vc-util` 与内嵌 `menu`；原登记 `vc-overflow` 是失真项，2026-09-29 按零命中判据更正） | C03-00 | 已完成 |
| C03-06 | steps | Steps 步骤条 | `vc-steps` | C03-00 | 已完成 |
| C03-07 | pagination | Pagination 分页 | `vc-pagination` | I11 | 已完成 |
| C03-08 | dropdown | Dropdown 下拉菜单 | `vc-dropdown`、`vc-util` | A07, I02 | 已完成 |
| C03-09 | context-menu | ContextMenu 右键菜单 | `portal` | C12-06 | 已完成 |
| C03-10 | anchor | Anchor 锚点 | `_util/getScroll`、`scrollTo` | C03-00 | 已完成 |
| C03-11 | affix | Affix 固钉 | `vc-resize-observer`、`vc-util` | I03 | 已完成 |
| C03-12 | back-top | BackTop 返回顶部 | `_util/scrollTo` | C03-11 | 已完成 |
| C03-13 | tour | Tour 引导 | `vc-tour` | I01, I02, I10 | 已完成 |

### C04 基础表单控件（1 + 9）

| 编号 | slug | 标题 | 底层（已核实） | 前置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| C04-00 | — | 类横写：受控/非受控与 `useMergedState` 的一致实现 | — | I13 | 已完成 |
| C04-01 | input | Input 输入框 | `vc-input`、`vc-resize-observer`、`BaseInput` | I04 | 已完成 |
| C04-02 | input-number | InputNumber 数字输入框 | `vc-input` 系 | I04, C04-01 | 已完成 |
| C04-03 | checkbox | Checkbox 多选框 | `vc-checkbox` | C04-00 | 已完成 |
| C04-04 | radio | Radio 单选框 | `vc-checkbox` | C04-03 | 已完成 |
| C04-05 | switch | Switch 开关 | 依赖 `form`（校验联动） | C06-01 | 已完成 |
| C04-06 | segmented | Segmented 分段选择 | — | C04-00 | 已完成 |
| C04-07 | slider | Slider 滑动条 | `vc-slider` | C04-00 | 已完成 |
| C04-08 | rate | Rate 评分 | — | C04-00 | 已完成 |
| C04-10 | color-picker | ColorPicker 颜色选择 | `portal` | C12-06 | 已完成 |

### C05 选择与日期（1 + 8）

| 编号 | slug | 标题 | 底层（已核实） | 前置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| C05-00 | — | 类横写：select/cascader/tree-select 共用的选项流水线 | — | A07, I02 | 已完成 |
| C05-01 | select | Select 选择器 | `vc-select`、`vc-overflow`、`vc-util` | C05-00 | 已完成 |
| C05-02 | auto-complete | AutoComplete 自动完成 | `vc-select`、`select` | C05-01 | 已完成 |
| C05-03 | cascader | Cascader 级联选择 | `vc-cascader` | C05-01 | 已完成 |
| C05-04 | tree-select | TreeSelect 树选择 | `vc-tree-select`、`vc-select`、`tree` | C09-01 | 已完成 |
| C05-05 | transfer | Transfer 穿梭框 | — | C05-01 | 已完成 |
| C05-06 | date-picker | DatePicker 日期选择 | `vc-picker`、`generate/` | I07 | 已完成 |
| C05-07 | time-picker | TimePicker 时间选择 | `date-picker`、`vc-picker` | C05-06 | 已完成 |
| C05-08 | calendar | Calendar 日历 | `vc-picker` | C05-06 | 已完成 |

> `transfer` 从 C06 移入本类：它与 select 共用选项模型，放录入类会与 form 横写重复。

### C06 表单编排与编辑（1 + 8）

| 编号 | slug | 标题 | 底层（已核实） | 前置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| C06-00 | — | 类横写：Form 的字段注册、校验与上下文下发 | — | I12, I13 | 已完成 |
| C06-01 | form | Form 表单 | `resolvers/*`、`utils/forms.ts`、`DisabledContext` | C06-00 | 已完成 |
| C06-02 | form-list | FormList 列表表单 | `form` | C06-01 | 已完成 |
| C06-03 | upload | Upload 上传 | `vc-upload`、`vc-util` | A07 | 已完成 |
| C06-04 | mentions | Mentions 提及 | `vc-mentions` | C04-01 | 已完成 |
| C06-05 | inline-edit | InlineEdit 行内编辑 | `input`、`button` | C04-01 | 已完成 |
| C06-06 | inplace | Inplace 原地编辑 | — | C06-05 | 已完成 |
| C06-07 | key-filter | KeyFilter 关键词过滤 | — | C04-01 | 已完成 |
| C06-08 | sortable-list | SortableList 可排序列表 | 第三方 npm 运行时依赖 `@dnd-kit/vue`（`package.json:49` 声明 `^0.5.0`、锁到 0.5.0；全库仅 2 行 import：`SortableList.tsx:3` 与 `SortableItem.tsx:3`，本组件是唯一消费者；非自研也非原生 HTML5 drag——`draggable` 与 `pointerdown` 等四组判据零命中。已结案，见本篇 §六 取舍一） | C08-06 | 已完成 |

### C07 反馈与浮层（1 + 9）

| 编号 | slug | 标题 | 底层（已核实） | 前置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| C07-00 | — | 类横写：Modal/Drawer/Popover/Tooltip 的浮层生命周期归一 | — | A07, I02, I10 | 已完成 |
| C07-01 | modal | Modal 对话框 | `vc-dialog`、`vc-util`、`useScrollLocker` | A07, I02, I10 | 已审（样稿，前置未写见上方偏差说明） |
| C07-02 | drawer | Drawer 抽屉 | `vc-drawer`、`vc-util` | C07-01 | 已完成 |
| C07-03 | tooltip | Tooltip 文字提示 | `vc-tooltip`、`vc-trigger` | I01, I02 | 已完成 |
| C07-04 | popover | Popover 气泡卡片 | 复用 `tooltip` | C07-03 | 已完成 |
| C07-05 | popconfirm | Popconfirm 气泡确认 | `popover`、`button` | C07-04 | 已完成 |
| C07-06 | message | Message 全局消息 | `vc-notification`、`vc-trigger` | C07-07 | 已完成 |
| C07-07 | notification | Notification 通知 | `vc-notification` | I02, I10 | 已完成 |
| C07-08 | alert | Alert 警告提示 | — | C01-01 | 已完成 |
| C07-09 | result | Result 结果 | — | C07-08 | 已完成 |

### C08 表格与虚拟化（1 + 6）

| 编号 | slug | 标题 | 底层（已核实） | 前置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| C08-00 | — | 类横写：table / data-table / tree-table 三代表格的分层与选型 | — | I05, I06 | 已完成 |
| C08-01 | table | Table 表格 | `vc-table`、`vc-util` | I05, I06 | 已完成 |
| C08-02 | data-table | DataTable 数据表格 | 复用 `column`/`columngroup`/`row` | C08-01 | 已完成 |
| C08-03 | tree-table | TreeTable 树表格 | 走 `table-core` 而非 `table` | I06 | 已完成 |
| C08-05 | list | List 列表 | — | C08-00 | 已完成 |
| C08-06 | virtual-list | VirtualList 虚拟列表 | 无（原记 `vc-virtual-list` 是登记错误：`virtual-list/VirtualList.tsx:1-17` 的 import 名单里没有 `vc-virtual-list`，两者是**两份互不引用的实现**，I08 论点 1 已证的「引擎 A / 引擎 B」，C08-06 复核确认） | I08 | 已完成 |
| C08-07 | virtual-scroller | VirtualScroller 虚拟滚动 | 与 virtual-list 并存 | I08 | 已完成 |

### C09 树与结构可视化（1 + 2）

| 编号 | slug | 标题 | 底层（已核实） | 前置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| C09-00 | — | 类横写：树数据的三种可视化形态 | — | I03 | 已完成 |
| C09-01 | tree | Tree 树形控件 | `vc-tree`、`vc-util` | C09-00 | 已完成 |
| C09-02 | directory-tree | DirectoryTree 目录树 | `tree` | C09-01 | 已完成 |

### C10 媒体与内容展示（1 + 8）

| 编号 | slug | 标题 | 底层（已核实） | 前置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| C10-00 | — | 类横写：图片组的预览与对比关系 | — | A07 | 已完成 |
| C10-01 | image | Image 图片 | `vc-image` | C10-00 | 已完成 |
| C10-02 | image-compare | ImageCompare 图片对比 | `image` | C10-01 | 已完成 |
| C10-04 | carousel | Carousel 走马灯 | `vc-slick` | C10-00 | 已完成 |
| C10-05 | avatar | Avatar 头像 | `vc-resize-observer`（原记 `—`，C10-05 补登：`avatar/Avatar.tsx:11` 实为 `import ResizeObserver from '../vc-resize-observer'`） | C01-05 | 已完成 |
| C10-06 | watermark | Watermark 水印 | 无第三方内核：本仓 Canvas 2D 自绘加 `toDataURL`（原记「Canvas/消毒链路待核实」，已由 C10-06 §六 取舍四结案；不存在消毒链路，生成物是自家画的位图） | I14 | 已完成 |
| C10-07 | qrcode | QRCode 二维码 | vendored 第三方内核（原记「生成内核待核实」，已由 C10-07 取舍一结案：`src/qrcode/qrcodegen.ts` 是 Project Nayuki QR Code generator library 的 974 行源码副本，SPDX MIT 头在 `:3`-`:6`，非 npm 依赖；仓内读者只有 `qrcode/QRCode.tsx`，消费面只有 `QrCode.Ecc` 与 `encodeText().getModules()`。渲染两条路径由 `index.tsx:105` 的 `props.type === 'canvas'` 分流，`ref` 只挂 canvas 侧，故 `toDataURL` 在 svg 档恒 undefined；`QRCode.tsx:333`-`:334` 的 `&&` 兜底使 svg 档颜色恒黑白） | C10-06 | 已完成 |
| C10-08 | chart | Chart 图表 | 第三方 npm 运行时依赖 `chart.js`（`package.json:86` 声明 `^4.4.0`、装到 4.5.1），经 `Chart.tsx:26` 的 `import('chart.js/auto')` 动态加载、`vite.config.mts:14-17` 与 `:41` 把它 external 化；本层不是自绘（`getContext` 等五组绘图判据零命中）。已结案，见本篇 §六 取舍一 | C10-00 | 已完成 |
| C10-09 | comment | Comment 评论 | — | C10-05 | 已完成 |

### C11 状态与信息呈现（1 + 8）

| 编号 | slug | 标题 | 底层（已核实） | 前置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| C11-00 | — | 类横写：占位、进度与统计三类的更新频率取舍 | — | A04 | 已完成 |
| C11-01 | spin | Spin 加载中 | — | C11-00 | 已完成 |
| C11-02 | progress | Progress 进度 | `vc-progress` | I09 | 已完成 |
| C11-03 | skeleton | Skeleton 骨架屏 | — | C11-00 | 已完成 |
| C11-04 | statistic | Statistic 统计数值 | `theme/util/statistic.ts` | A03 | 已完成 |
| C11-05 | meter-group | MeterGroup 仪表组 | — | C11-02 | 已完成 |
| C11-06 | timeline | Timeline 时间轴 | — | C11-00 | 已完成 |
| C11-07 | descriptions | Descriptions 描述列表 | `_util/responsiveObserve`（原记 `row`/`col` 是登记错误，C11-07 复核：`grep -rn "grid" packages/xiaoye-ui/src/descriptions` 无输出，本组件的 Row/Cell 是私有实现，与 C02-01 的唯一公共点就是这个响应式 hook） | C02-01 | 已完成 |
| C11-08 | typography | Typography 排版 | 自研，无第三方内核（已结案「已知待办」第 3 条的 typography 项：`editable` 走 `typography/Editable.tsx`，160 行，包本仓 `input/TextArea`，IME/Enter/Esc 判定全手写；`copyable` 走 vendored 的 `_util/copy-to-clipboard/index.ts` 与 `toggle-selection.ts`，`package.json` 无任何 clipboard 依赖，实现用的是 `document.execCommand` 而非 `navigator.clipboard`） | I14 | 已完成 |

### C12 全局与应用级（1 + 8）

| 编号 | slug | 标题 | 底层（已核实） | 前置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| C12-00 | — | 类横写：应用级容器与全局能力（App/Portal/FocusTrap/Ripple） | — | A05 | 已完成 |
| C12-01 | app | App 应用容器 | `config-provider` | A05 | 已完成 |
| C12-02 | config-provider | ConfigProvider 全局配置 | `theme`、`locale` | A05 | 已完成 |
| C12-03 | dark-mode-toggle | DarkModeToggle 暗色切换 | `theme/themes/dark` | A03 | 已完成 |
| C12-04 | float-button | FloatButton 浮动按钮 | 无（原记「`vc-trigger` 待核实」，已由 C12-04 与 C01-06 两种方法核清：`grep -rn "vc-trigger" src/float-button` 与 `zIndexManager`、`Portal` 同样零命中，其真浮层来自组合的 Tooltip（`float-button/FloatButton.tsx:3`），传递边为 tooltip → vc-tooltip → vc-trigger） | C03-11 | 已完成 |
| C12-05 | ripple | Ripple 涟漪 | `_util/wave` | C01-01 | 已完成 |
| C12-06 | portal | Portal 传送门 | `_util/Portal.tsx`、`PortalWrapper` | A07 | 已完成 |
| C12-07 | focus-trap | FocusTrap 焦点陷阱 | 自研，无第三方封装（原记「第三方封装待核实」，已结案：`focus-trap/FocusTrap.tsx:1-6` 的 import 只有 vue 与仓内文件，算法在手写的 `useFocusTrap.ts` 里；其 `$_xy_focusableselector` 只写不读那条见下方残留清单） | A07 | 已完成 |
| C12-08 | split-button | SplitButton 分裂按钮 | `button`、`dropdown`、`menu` | C03-08 | 已完成 |

---

## 依赖拓扑（推进次序）

```mermaid
flowchart LR
  A01 --> A02 --> A06 --> A07
  A01 --> A03 --> A04 --> A05
  A05 --> A07
  A07 --> I01 & I02 & I10
  A06 --> I03 & I04 & I13
  A04 --> I09 & I14
  I06 --> I05 --> C08
  I02 --> C07
  I13 --> C04
  I07 --> C05
  I12 --> C06
  A01 --> I15 & I16
  C07 --> C03
  C09 --> C05
```

---

## 术语表（跨篇统一，新术语先登记再使用）

| 术语 | 唯一定名 | 首次展开 |
| --- | --- | --- |
| 生成物 | 生成物（勿写「产物文件」） | A02 |
| 歧义名定主 | 归属定主（ownership pin 称「归属锁」） | A02 |
| 四层 Token | Seed / Map / Alias / Component Token | A03 |
| 样式哈希 | `hashId`（勿写「hash 类名」） | A04 |
| 受控/非受控 | 受控 / 非受控（写全，勿用「受控模式」混称） | I13 |
| vendor 分层 | `vc-*` 底层控件（首次出现注明 vendor = 底层实现层） | A07 |
| 浮层三件套 | trigger / align / zIndex | A07 |
| 滚动锁定 | 滚动锁定（`useScrollLocker`） | C07-01 |

---

## 已知待办（开写前需人工确认或实测）

- **组件移除批次（2026-10-02，队列 144 → 134）**：`markdown-editor`、`rich-text-editor`、`rating`、`toggle-button`（提交 ef9f316）与 `data-view`、`galleria`、`organization-chart`、`tree-chart`、`overlay-badge`、`page-header`（工作区删除）共 10 个组件已从库中移除，公开组件 108 → 98。对应 10 行队列与 10 篇文章同步删除：C01-06、C02-12、C04-09、C04-11、C06-09、C06-10、C08-04、C09-03、C09-04、C10-03。本文件与各篇正文中涉及这 10 个组件的历史记录（如 galleria 的恒假比较修复、rating 的 Token 接线、rich-text 的 CSS 变量残留）**保留作史，不再对应任何现存代码**；导览选型表/坑索引与篇间互引已同步清理，「读者坐标」分母已按各类新篇数重算。**2026-10-03 复审**：40 条手写引用全量机检（修正 utils.js/components.ts 两处 ±1 数错）；并补齐 2026-09-29 修复轮的文档同步欠账——checkbox `groupPrefixCls`（C04-03/C04-04/C11-05/C10-08 四处曾当现存缺陷引用，其中三个检查点复跑会失败）、spin `size: 'default'`（C11-01）、chips `disabled: false`（C01-04）、scroll-panel `Math.random` id（C02-11）、progress `progressStatus` 遮蔽（C11-02），统一改为「修前快照 + 修后注记」口径；总导览两处族谱实例补已修标记。仍挂账的预存在漂移：I14 safeUrl 消费者清单（anchor/UploadList 也在用）、I16 图标 composables 计数（约 56）、正文裸 `:NNN` 的历史 ±1 欠账。
0. **工具**：`node docs/column/tools/verify-refs.mjs --excerpt [<篇目>]` 机检每条 `file:line` 与摘录真实性（必须 0 问题才算写完）；`node docs/column/tools/set-status.mjs <编号>=<状态>` 回填本文件状态列，`--show` 打印进度分布。
7. **待核实：`app.use(XiaoyeUI)` 的运行时注册覆盖面到底是多少。** `src/index.ts:12-17` 只对「带 `install` 的导出」调 `app.use`，而 `install` 有三种形态：`_util/type.ts:39-46` 的 `withInstall`、对象字面量里的 `install:` 属性（例 `table/index.tsx:47`）、以及 `.install =` 赋值。**只 grep `\.install` 会漏掉前两种**（我在撰写 A01/C07-01 期间因此连错两次，最终没有把数字写进任何一篇）。正确统计方式：对每个组件目录的入口文件分别检测三种形态，并给出可复现脚本。归 **A06** 登记（若与 A02 的集合差异结论有交叉，两篇各写一次、互相一行引用，不重述）。**2026-09-29 已结清**：脚本与结果都在 **A06 §五 末段**（115 个公开目录里 107 个带 `install` 机制，8 个没有：`config`、`grid`、`message`、`notification`、`resolvers`、`table-core`、`utils`、`version`；其中只有 `grid` 是需要读者知道形状的差额，其余属有意不注册）。

1. `02-infrastructure` 与 `01-architecture` 存在 4 处近邻主题（A04/I14、A07/I01-I02-I10、A05/I11、A08/I15），已在「主题边界」列切分；若某篇写完发现越界，**收敛到边界内并加交叉链接，不得两篇重复展开**。
2. `C05-05 transfer` 归属：现归选择类，若写完发现与 Form 耦合更重，迁至 C06 并同步改号。
3. 12 处「待核实」标注，必须在对应篇 Step 1 用源码证实，证实后从本表删除并在该篇「设计取舍」里交代选型。**进度更新（2026-09-29）**：已结案 3 项——**水印实现**（C10-06 §六 取舍四：本仓 Canvas 2D 自绘 + `toDataURL`，无第三方内核、无消毒链路）、**富文本内核**（C06-09：包的是 tiptap，其选项重读行为属第三方，仓内不可定点取证，已按共则只写命令不挂行号）、**二维码生成内核**（C10-07 取舍一：既不是 npm 包依赖也不是自家算法，而是 **vendored 的 Project Nayuki `qrcodegen` 单文件源码副本**（`src/qrcode/qrcodegen.ts` 974 行，自带 SPDX MIT 头，`:1`-`:2` 两条 eslint-disable 是搬入痕迹，`:974` 的默认导出是本仓加的适配层）；主库 `dependencies` 里 `/qr/i` 零命中，`qrcodegen` 的仓内读者只有 `qrcode/QRCode.tsx`，消费面收窄为 `QrCode.Ecc` 四常量加 `encodeText().getModules()` 一条链；`grep -rln "Project Nayuki" -e "SPDX-License-Identifier" packages/xiaoye-ui/src` 只回这一个文件，即 `packages/xiaoye-ui/LICENSE` 之外无任何 NOTICE 或第三方清单收录它）。**仍待核实已清零（2026-09-29 协调者补测）**：**拖拽内核** = 第三方 npm 包 `@dnd-kit/vue`（`packages/xiaoye-ui/package.json:49` 声明 `^0.5.0`；`sortable-list/SortableList.tsx:3` 引 `DragDropProvider`/`useDragDropMonitor`、`SortableItem.tsx:3` 引 `useSortable`，即拖拽与排序算法全在厂商包里，本仓只做装配）；**chart 内核** = npm 依赖 `chart.js`（`package.json:86` 声明 `^4.4.0`），但它是**运行时动态导入**的（`chart/Chart.tsx:26` 的 `import('chart.js/auto').then(...)`），配合 `:19` 的 `isClient` 判定，所以 SSR 期不加载、构建期被打成异步 chunk；**focus-trap 封装来源** = **自研**，`focus-trap/FocusTrap.tsx:1-6` 的 import 只有 vue 与仓内文件，算法在同目录 `useFocusTrap.ts` 里手写（其 `$_xy_focusableselector` 只写不读那条已登记在下方残留清单）。**typography 的 `editable`/`copyable` 已由 C11-08 结案**（两者皆自研，`copyable` 是 vendored 的 `document.execCommand` 实现，无 clipboard 依赖），结论已写进 C11-08 那一行的「底层」列；**Markdown 解析内核已由 C06-10 结案**：用的是 **Vditor 内置的 Lute**（`lute.min.js`，经 `?url` 本地装载、`_lutePath` 注入），`buildVditorOptions` 是唯一读选项的地方，且 `getHTML` 出口**没有任何本地净化**（`sanitize`/`dompurify` 零命中）——这条与富文本同属「注入面自己负责」，写文档或接 UGC 时必须外部净化。
4. `src/` 下无文档页的目录（`table-core`、`resolvers`、`_shared`、`config`、`version`、`generate`、`column`、`columngroup`、`row`、`util`、`utils`、`style`、`locale`、`locale-provider`）已由 I06/I12/I16/I07 等篇覆盖，**不再单列为组件篇**。（原列表里的 `mega` 已由 C03-02 用 `ls` 与 `find` 两种方法证伪：`src/` 下不存在该目录，mega-menu 的实体是 `src/mega-menu/`。）
5. **样稿轮新增的两处归属决定**（后续篇不得重复展开，只允许一行交叉引用）：
   - `_util/components/` 整目录是 `_util/` 根级同名文件的机械副本（`PortalWrapper.tsx` 的 diff 仅 import 相对路径），直接引用为 0，却经 `_util/index.ts:46` 的 `export * from './components'` 进 barrel → 归 **A06**（Props 与内部工具面）登记，Modal/C07 只在 §六 提一句。**这条家族还有一个已坐实的升级形状，A06 必须补上**：`_util/` 里同名 `.ts` 与 `.tsx` 并存时，`.ts` 那份是「转发到 `./components/*` 的 shim」，而解析顺序让 **shim 赢下同名 `.tsx`**——`_util/transition.ts` 全文两行（注释 + `export * from './components/transition'`），`_util/transition.tsx` 那份真实现在同目录被遮蔽，于是 `alert/index.tsx:16` 的 `import { getTransitionProps } from '../_util/transition'` 实际吃到的是机械副本（C07-08 取证）。判形命令：`ls packages/xiaoye-ui/src/_util/ | grep -i transition`，凡见到同名 `.ts`/`.tsx` 成对就打开 `.ts` 看它是否只做转发。
   - 「为工具链预留但无工具链」的四处残留（`getDefaultToken`——**注意口径**：它并非无人传（37/103 处在传），而是被组件内二次 `mergeToken` 在键相交处覆写，详见 A03 论点 4 的更正；`statistic`/`_statistic_build_`、`convertLegacyToken.ts`、Token 接口的 `@nameZH` JSDoc）已在 **A03 论点 10** 成表 → I14（运行时约束）与 A02（生成物链路）写这两篇时**只补新证据，不重述**。
   - 同类残留（**「API 面存活、实现死亡」**）已由后续篇目新增 5 例，登记在此以免重复发掘：`vc-dialog`/`vc-drawer` 两侧的 `scrollLocker`（两个业务层都不注入，见 C07-01 论点 5、C07-02 论点 1）、`getOpenCount`（全仓无调用方，C07-01 论点 5）、`DrawerChild` 的 `levelDom` 与 `currentDrawer`（只写不读，C07-02 论点 4/7）、`vc-drawer/src/utils.ts` 的 6 个零使用导出（C07-02 坑 5）。Drawer 篇的处置口径是**「显式 deprecated + dev 下 warning，而非静默保留」**，后续篇若持不同判断需先在此更正一行再写。
   - 同类残留再补 9 例（由 C07-03 / C12-07 / C06-00 / C02-09 / C03-12 复核登记，后续篇目直接引用本行即可，不必重新发掘）：`vc-tooltip` 的 `tipId`（`vc-tooltip/src/Tooltip.tsx:31/46/57` 有声明有消费，业务层永不传入，故 `role="tooltip"` 无 id 关联）、`destroyTooltipOnHide` 的 `keepParent` 对象分支与派生的 `autoDestroy`（`keepParent` 仅 `:81-83` 三行读取；`autoDestroy` 读点在 `vc-trigger/context.ts:13/19`）、`ignoreShake`（`_util/placements.ts:108` 写、`vc-trigger/interface.ts:63` 声明、零读取）、`__XY_RADIO`（`tooltip/Tooltip.tsx:173` 只读、`radio/` 从不写）、`$_xy_focusableselector`（`useFocusTrap.ts:110`/`:114` 写，全仓零读取）、`Form` 的 `onValuesChange`/`onFieldsChange`（只有 prop 与类型，零调用零 emit）、`ErrorList` 的 `help`/`helpStatus`/`warnings` 三个 props（无任何读取点）、`Collapse` 的 `collapsible` 图标分支（`Collapse.tsx:88` 读父级 props 而非合并值）、`_util/raf.ts:48-51` 的 `cleanup(realId)` 键错位（写用逻辑 id、删用浏览器句柄，每次 cancel 留一个死表项）。两类「产出但零样式规则」的类名残留：`xy-tooltip-disabled-compatible-wrapper`、`xy-tooltip-arrow-content`。
   - 同类残留再补 4 例（首两例是 C03-08 与 A07 的冲突仲裁产物，见 C03-08 论点 5 末段；浮层家族后续篇目直接引用本行，不必重新发掘）：`Dropdown` 的 `arrow={{ pointAtCenter: true }}`（唯一读者是业务层用 `getPlacements` 现算的十二键表，而该表在 `vc-dropdown/Dropdown.tsx:127` 被厂商层六键表硬覆盖，见 A07 坑 2 → 开关全族零效果）；死类名 `xy-dropdown-placement-top` / `xy-dropdown-placement-bottom`（样式表 `dropdown/style/index.ts:146-152`、`:177-183` 为其写了箭头居中规则，但六键表查不到这两个键，`PopupInner.tsx:137-141` 的 `alignDisabled` 使 `getClassNameFromAlign` 从不执行，类名永不可得；`apps/docs/examples/dropdown/arrow-center.vue:24` 正在演示这个失效档位）。第三例同向登记：`date-picker/generatePicker/index.tsx:11` 的 `Components.rangeItem`（值是 `date-picker/PickerTag.tsx`）——`vc-picker` 侧 `components` 的唯一读取点在 `vc-picker/utils/getRanges.tsx:29` 且只取 `button`，`vc-picker/interface.ts:99-101` 的类型里也没有 `rangeItem` 这个键，预设项走 `Picker.tsx:21`/`:491` 静态导入的 `PresetPanel`，故 `PickerTag` 全仓零消费（I07 初稿曾把这条通道描述成对 preset 生效，已由 C05-06 论点 3 反证并在 I07 §五 更正）。第四例，且是一种要单独盯的子形状（**同名 computed 遮蔽同名 prop**）：`progress/props.ts:50` 声明的 `progressStatus` 在 `progress/` 目录内零读取点，`progress/progress.tsx:60` 用同一个名字定义了 computed（`:62` 从 `percent` 与 `status` 推导），于是模板与 `setup` 里读到的都是派生值，`<xy-progress :progress-status="'exception'">` 完全无效——该结论由 C11-00 登记。**后续每写一篇请顺手 `grep -n "const <propName> = computed" <主文件>`** 查这类遮蔽。另一条形状不同但同属「声明了但不起作用」的残留由 C11-00 一并登记：`spin/style/index.ts:35` 的 `transition: transform …` 是遗留声明，而 `:29-41` 里 `-spinning` 实际改的是 `position/display/opacity`（三者都不在 transition 列表内），指示器显隐因此是硬切。**这条结论的范围由 C11-01 收紧**：只适用于 `.xy-spin` 指示器本身，`.xy-spin-container` 的 `transition: opacity`（`:101`）与 `-blur` 的 `opacity: 0.5`（`:120-122`）是带补间的，引用时不要说成「整个 Spin 没有过渡」。
   - 同类残留再补 6 例（由 C04-07 / C02-14 / C06-05 / C05-05 / C06-02 / C04-03 登记，后续篇目直接引用，不必重新发掘）：① `vc-slider/src/Range.tsx:169` 的 `positionGetValue` 调 `this.getValue()`，而 `getValue` 在整个 `vc-slider/` 目录**没有任何定义**（`grep -rn "getValue" packages/xiaoye-ui/src/vc-slider` 只回这一行），于是 `draggableTrack` 打开后一拖即 TypeError——注意该 prop 被声明了两次（`:53` 的 `{ type: Boolean, default: undefined }` 与 `:65` 的 `initDefaultProps` 默认 `false`）；② `fieldset/style/index.ts:44`、`:67` 消费 `var(--xy-border-radius)`，但全仓**没有任何一处声明该变量**（`grep -rn -- "--xy-border-radius:" packages/xiaoye-ui/src packages/utils/src apps/docs` 零命中），正例可对照 tooltip 的 arrow 变量是成对声明的；同篇还登记 `style/index.ts:96` 的 `grid-template-rows: 1fr` 没有 `0fr` 对端、`:113`/`:122` 的 `max-height` 基态从不声明，折叠动画因此只剩淡入；③ `inline-edit/InlineEdit.tsx:22` 给 `disabled` 填默认值 `false`，再经 `:197` 解构、`:202` 硬传给子 Input，短路掉 `input/Input.tsx:166` 的 `props.disabled ?? disabled.value` 兜底，这是「`<xy-form disabled>` 不生效」的**第二种**成因（第一种是 C04-11 的「不解构 `useConfigInject` 已合成的 disabled」），两条判据都要查；④ `transfer/list.tsx:245`、`:257` 发出的两个类名在样式表零规则，反向的 `xy-transfer-list-content-item-checked` 则有规则（`transfer/style/index.tsx:235`、`:240`）却由 `ListItem.tsx:38-41` 从不发出，净效果是**选中项零背景高亮**；⑤ `form-list/FormList.tsx:46` 写出的 `isListField` 与 `:14` 的 `__XY_FORM_LIST` 内部标识**零生产读取点**（各只 2 处命中且都在自身与测试里），同文件 `:19` 拿到 `useStyle` 返回值却不用、`:13` 不接 attrs、`components.ts:174` 的 token 表为空，三件一起构成「样式面空转」；⑥ `checkbox/Group.tsx:23` 把 `groupPrefixCls` 喂给 `genComponentStyleHook`，而缓存键含 prefixCls（`theme/util/genComponentStyleHook.ts:74`），于是同一份 Checkbox 样式被注册成两张表——`radio/Group.tsx:54` 传的是正确的 `prefixCls`，这是判形对照样本。
   - **跨篇事实（C07-09 取证，凡引用 `*Filled`/`*TwoTone` 图标的篇目都按此口径，勿各自推断）**：`packages/icons` 兼容层里大量「具变体名」的导出其实是**降级别的别名**，指向没有该变体的描线组件——`packages/icons/src/index.js:1245-1246`（`CheckCircleFilled` → `./circle-check`）、`:1248-1249`（`CloseCircleFilled` → `./circle-x`）等，上方注释自陈「无 Filled 变体」。后果是：请求 `*Filled` 的调用方（如 `result/index.tsx` 的 `IconMap`）拿到的是描线图，视觉与 antd 的实心惯例不一致，而 `theme/util/genComponentStyleHook.ts:66` 的 `.xyicon` 与 `result/style/index.ts:49-53` 的 `1em` 决定其尺寸只能靠字号。判形命令：`grep -n "无 Filled 变体" packages/icons/src/index.js` 与 `grep -n "无 TwoTone 变体" packages/icons/src/index.js` 两条并跑。**这属 AGENTS.md「图标必须包在 `<span class="xyicon">` 里」那条约定的实现侧欠账**，是否补实心图标应由用户在图标包侧决定，专栏只登记事实。
   - 一条**文档站命名违规**（C07-09 登记，属 `apps/docs` 侧、不在组件库内）：`apps/docs/.vitepress/vitepress/components/vp-not-found.vue:11` 用的是旧前缀类名，而组件产物生成的是 `xy-` 系，导致该页样式恒不命中；同文件 `:19` 亦是 AGENTS.md 禁止的前缀写法。这类「文档站残留旧前缀」可与 `--xy-color-primary` 那条一并留给 docs 侧清扫。
   - **CSS 变量全仓总扫（协调者 2026-09-29 亲自跑，结论以本条为准）**：`packages/xiaoye-ui/src` 共消费 11 个 `var(--…)`。判形时必须**把 JSX/`style` 对象的「引号键 + 冒号」也算作声明**，只搜 `--x:` 形式会把 9 个正常配对误判成死变量——写入点分别是 `_util/wave/WaveEffect.tsx:130`（`--wave-color`）、`segmented/src/MotionThumb.tsx:129`（`--thumb-start-*`/`--thumb-active-*`）、`tooltip/style/index.ts:51`/`:92` 与 `popover/style/index.ts:50` 及 `tooltip/util.ts:18`（`--xy-arrow-background-color`）、`image-compare/ImageCompare.tsx:60`（`--xy-image-compare-scope-x`）。真正无写入点的只有两组：① `fieldset/style/index.ts:44`、`:67` 的 `--xy-border-radius`（全仓含 `apps/docs` 都搜不到任何形式写入，即上面第 ② 例）；② **rich-text-editor 的整套 `--ui-*`**——`rich-text-editor/style/index.ts:43-48` 起的注释列出了 `--ui-text`/`--ui-border` 等「应映射到哪个 Token」，但全仓没有任何代码做这个映射，同族还有 `RichTextEditor.tsx:162` 读的 `var(--xy-color-primary)`，其唯一赋值在文档站自己的 `apps/docs/.vitepress/vitepress/components/vp-home.vue:45`，组件产物里无人写。于是这些消费点一律落到 CSS 规范初始值 `unset`，即**富文本编辑器的取色实际上不受主题控制**（归 C06-09 与本条，后续篇目不要重复取证）。
   - 同类残留再补 3 例（C10-04 登记，已现 grep 复核）：① `apps/docs/components/carousel.md:67` 宣传的 `easing` 是**零实现开关**（全仓仅两处声明、无读取点）；② 同文件 `:72-78` 的方法表漏了真实存在的 `autoplay(playType)`，而公开类型的参数名本身拼错成 `palyType`（`carousel/index.tsx:24`）；③ `vc-slick` 的厂商层是 8 个 `.js/.jsx` 文件，实测**不在 TS 程序里**（`tsc --listFilesOnly` 输出 2504 个文件、`vc-slick` 命中 0），所以外壳与厂商层之间的 props 差集（6 个被丢、9 个只能靠 attrs 穿透）没有任何类型校验兜底——这条是「厂商层 `.js` 化的组件，其 props 契约只能靠运行时核对」的量化证据。另记一条**运行时全局锁不配对**的实例：`vc-slick` 在 `inner-slider.jsx:447`/`:450` 把 `window.ontouchmove` 直接赋值为阻止默认滚动，恢复动作是 `:488` 的 `this.enableBodyScroll()`，而它前面那句 `:485` 的 `if (triggerSlideHandler === undefined) return;` 会**提前跳出、跳过恢复**（初稿误把 `:485` 写成恢复点，已由 C10-04 更正），卸载路径也不解这把锁——于是「垂直滑动 + 默认 `draggable: false`」的组合下一次鼠标按下再松开就可能永久禁掉整页触屏滚动（详见 C10-04 的对应论点与坑）。
   - 一条口径纠正（2026-09-29 由 C05-02 反证 C05-01，已双向更正，凡写 select 族套壳篇都按此口径）：`backfill` 在 `<xy-select>` 上不可达的**真正原因不是「公开层删了声明」**——`select/index.tsx:289` 的 `{...attrs}` 仍会把它送达内核，内核 `vc-select/Select.tsx:445` 也照样读它；真正的原因是该行的判据是 `props.backfill && props.mode === 'combobox'`，而公开 `mode` 的取值域（`select/index.tsx:57`）不含 `'combobox'`，内部常量 `SECRET_COMBOBOX_MODE_DO_NOT_USE` 要到 `:138-140` 才被翻译成 `'combobox'`。**因此 `<xy-auto-complete>` 是可达的**：它自己声明 `backfill`（`auto-complete/index.tsx:34`）并固定传那个 secret 取值（`:146`）。可复用的教训：**复用公开层不等于继承公开层的取值域**，套壳组件恰恰常靠「使用那个不许用户用的取值」绕开限制，判死一个 prop 之前要把合取条件的另一半也查完。
   - **全仓统一口径：`emit(...)` 与 `callEvent(props.onX)` 相邻两句都执行**（同形结构至少三处：`vc-cascader/Cascader.tsx:339-340`、`vc-select/Select.tsx:438-439`、`date-picker/generatePicker/generateSinglePicker.tsx:123-124`）。可核实的部分是「两条通道都在读同一个处理函数引用」；**「调用方因此被双发」属运行时结论，本仓没有任何一条断言回调次数的测试，谁都没实测过**。因此各篇一律写成：结构上是双通道，双发为待核，并给出可复现的判别命令（挂 `vi.fn()` 断 `toHaveBeenCalledTimes(1)`）。C05-06 论点 5 已按此表述，C05-03 §五 同，C05-01 §三 只登记了行号未判定——三者不冲突，后续篇目不要各自升级成断言。
   - 同类残留再补 3 例（C05-03 登记）：`cascader/index.tsx:262` 发出的 `xy-select-menu-item-loading-icon` 全仓仅此一行、无任何样式规则读取；`CascaderOptionType.loading`（`:99`）零读取点，而 `apps/docs/examples/cascader/lazy.vue:29` 正在演示写它；`vc-cascader/Cascader.tsx:155-157` 的 `MultipleCascaderProps` 定义体引用的是 `singleCascaderProps`，且 `single/multipleCascaderProps` 与两个别名在 `src` 内零消费。另记一条文档漂移：`apps/docs/components/cascader.md:154` 把 v-model 值类型写成 `string[] | number[]`，与源码的多选「路径数组的数组」（`Cascader.tsx:53` 的 `ValueType`）不符。
   - 同类残留再补 4 例（由 C08-07 / C09-02 / C05-04 登记，均已现 grep/diff 复核）：① **两份虚拟滚动实现已经分叉**——`virtual-list/VirtualList.tsx:344` 起的 `getContentPosition` 四个 padding 项都写成 `(parseFloat(...) || 0)`，而 `virtual-scroller/VirtualScroller.tsx:345` 起的同一函数写成 `parseFloat(...)` 无兜底（`diff` 两段可直接看出），缺兜底的恰好是 `data-table` 真正在用的那一份；② `data-table/column/Column.d.ts:13` import 了 `VirtualScrollerLoaderOptions` 并在 `:39` 继承它，但该类型**全仓没有定义**（排除 `dist/` 后只有这两处命中），即公开类型面引用一个不存在的类型；③ `directory-tree/DirectoryTree.tsx:272` 发出的 `${prefixCls}-directory-rtl` 是全仓唯一命中、零样式规则（死类名，但 RTL 注入本身正确，`direction` 无默认值，不属共则 §3 那条短路坑）；④ `vc-tree-select/TreeSelect.tsx:197` 声明的 `dropdownPopupAlign` 全仓仅此一行、零读取点，且会经 `BaseSelect.tsx:754-768` 铺进 DOM。
   - 同类残留再补 4 例（由 C10-05 / C04-09 / C08-05 登记，均已现 grep 复核）：① **`??` 版本的兜底不可达**（共则 §3 那条坑的第二个形状）：`avatar/Group.tsx:26` 给 `shape` 设了 `default: 'circle'`，`Group.tsx:41` 把 `props.shape` 原样放进 context，于是 `Avatar.tsx:138` 的 `avatarCtx.shape ?? shape` 左侧**永不为 undefined**，组内子头像写 `shape="square"` 恒被吞掉——判据是「`??` 左侧来自带默认值的 prop」；② `rating/interface.ts` **没有** `direction` prop，所以 `useConfigInject.ts:15` 的兜底真的生效、类名 `xy-rating-rtl` 会出现（`Rating.tsx:49`），但 `rating/style/index.ts` 全文零 `rtl` 规则（`grep -rn "rtl" rating/style/index.ts` 零命中）——与 Rate 的「有规则、类名恒假」正好**镜像**，症状同为 RTL 无效而断点互补，**修 Rate 的方法不能照搬到 Rating**；③ `theme/interface/components.ts:120` 注册的 `Rating.starColor`/`starSize` 只有声明行，`rating/style/index.ts:6-7` 是接口字段而非读取点，取色处 `:91` 无条件用 `colorPrimary`，即 `theme.components.Rating` 是一条**通过类型检查但零效果**的公开覆盖面（同族还有 `List` 的 4 条挂在永不生成类名上的规则，见 C08-05）；④ `list/index.tsx:58` 的 `extra` prop 与 `:95` 的 `extra` slot 类型都声明了，全目录零消费点，而 `list/Item.tsx:18` 的 `grid` prop 被 `:35` 的同名 inject 遮蔽。
   - 同类残留再补 3 例（C07-05 登记，路径与方向已由协调者按第二次派工的复核意见更正）：① `popconfirm/index.tsx:32` 声明的 `content` prop 全文件**零读取点**（`grep -n "props.content"` 无命中），内容实际只从 `renderOverlay` 走（`:236`）；同处的 `cancelText`（`:38`）**不是**死的——`:154` 写的是解构默认值 `cancelText = slots.cancel?.()`，所以是 **prop 优先、`cancel` 插槽兜底**；真正无人读取的是插槽类型里那个名为 `cancelText` 的槽（`:76` 声明、从不取用）。② `:131` 写的是 `if (e.keyCode === KeyCode.ESC && open)`，而 `open` 是一个 `Ref` 对象、不是 `.value`，**恒为真值**，于是 ESC 分支的开关条件其实只剩 `keyCode`。③ `okButtonProps`/`cancelButtonProps` 在 `popconfirm/index.tsx:161-171` 与 `_util/ActionButton.tsx:111`/`:114` 都**展开在组件自身的 `onClick` 之后**（注意 `ActionButton` 在 `_util/` 而非 `popconfirm/`，`popconfirm/index.tsx:25` 是这么导入的；该文件同时存在 `_util/components/ActionButton.tsx` 这份机械副本），用户塞一个 `onClick` 就会顶掉「取消关浮层」「确认带 loading 与防重复」两条内部逻辑——这是共则 §3「JSX 属性顺序覆盖」在按钮对象上的实例（同条对 `on*` 键要按 `mergeProps` 数组语义读，两处机制不同）。另登记一条**文件名口径**：`button/` 的主实现真名是小写 `button.tsx`，而 `AGENTS.md` 的组件目录模板写的是 `<Component>.tsx`（大写示例）；`verify-refs.mjs` 会把 `Button.tsx` 的候选解析到只有 50 行的 `skeleton/Button.tsx` 并报行号越界，写手引用时须用真实小写名。
   - **一条系统性缺口（C06-06 取证、C02-07 与 C04-03 各自独立命中过同一形状，统一归口在这里）**：`typings/global.d.ts` 的 `GlobalComponents` 声明是**每个目录一条**生成的——`packages/xiaoye-ui/scripts/entry-generator.mjs:447-448` 的循环体只输出 `XY${mod.pascalName}`，即目录的 PascalCase 主名。于是任何在运行时用 `install` 或 `registerComponent` 额外注册的子件（`Card.Grid`/`Card.Meta`、`Inplace` 的三个标签、`Checkbox.Group` 之类）**在类型面完全不存在**，模板里写 `<xy-card-meta>` 过不了 vue-tsc，而运行时是好的。判形：`grep -c "XYCardMeta" packages/xiaoye-ui/typings/global.d.ts` → 0，而 `src/card/index.ts` 确实注册了它。各组件篇只登记自己那一份证据，**修法与是否要改生成器留给 A02（生成物链路）统一裁决**，不要在组件篇里各写一份方案。
   - 三种「测试面假象」的判形（前两种由 C03-10 登记、第三种由 C04-08 与 C04-00 补，后续篇目按此自查即可，不必重新发明）：其一，**测试文件存在但整块被注释掉**——`anchor/Anchor.test.js:62` 的 `/*` 直到 `:212` 的 `*/`，名义 8 个 `it` 实跑 2 个（`vitest run` 输出 `Tests 2 passed (2)`），所以数 `it(` 的静态计数不可信，要以运行输出为准；其二，**源码注释指向不存在的测试**——`_util/getScroll.ts:25` 写着「Check the corresponding tests for details」，而 `grep -rl "getScroll" packages/xiaoye-ui --include='*.test.*'` 与 `grep -rn "getScroll" packages/xiaoye-ui/tests` 双双零命中。数测试文件时务必同时匹配 `.js` 与 `.tsx`/`.ts` 后缀；其三，**方向相反的假阴性**——文件里字面 `it(` 为零不代表没测试，`rate/index.test.js` 只调用 `focusTest(Rate)` 与 `mountTest(Rate)`，而 `tests/shared/focusTest.js` 有 3 条 `it(`、`tests/shared/mountTest.js` 有 1 条，展开后实跑 4 条。所以「数 `it(` 」必须**同时**跑工厂内部，且要以「覆盖了哪条分支」而非「有几条用例」为准。
6. **样稿轮暴露的指标缺陷**：`PROMPT.md` §0 的 `{{DEPTH}}` 原按"中文字数"计，但代码摘录与表格占比大，纯字数不能反映深度。现按「剔除代码块与表格后的正文中文字」执行：架构/基础设施篇 ≥5000、组件篇 ≥3500，并要求 `file:line` 唯一引用 ≥60、mermaid ≥2（架构篇 ≥3）。若审阅认为该口径不对，改 `PROMPT.md` §0 而不是改已交付篇目。
7. **派工提示与协调者摘要本身会错，写手现 grep 复核是对的**（2026-09-29 两例）：C10-09 曾按标识符 grep 断言 `getDefaultToken` 无人传，覆掉了 C10-09 写手原本正确的结论——该 prop 是第 3 个**位置参数**（`genComponentStyleHook.ts:74` 的三参签名），字面名不出现在调用实参里，判据应是数实参个数（实测 103 处调用里 37 处在传）。同期 C06-06 用 `grep -i inplace` 查依赖，命中的其实是 `built**inPlac**ements`，据此写出的「依赖面」整张表作废；查调用点要用导入形态或调用形态判据。
8. **导览轮（2026-09-29）：第 5 道门上线，15 篇目录导览全部达标；顺带抓出 4 篇空壳并更正 7 处跨篇错账。**
   - **新门与新口径**：`node docs/column/tools/check-guide.mjs`（合同 `tools/GUIDE.md`；判据与"导览不适用七段骨架、五处枚举已排除 `*导览.md`"登记在 `PROMPT.md` §10 第 6 条）。同轮给 `check-doc.mjs` 加了**占位段落拦截**（正文里出现 `（待写）`/`（待补）` 即不达标），上线当场抓出 4 篇骨架齐但后半段空的篇目：C03-00（§五/§六/§七/附）、C04-06（§六/§七/附）、C06-08（§五/§六/§七/附）、C10-08（篇头「本篇解决」与 §五/§六/§七/附）。此前它们能过关，是因为门槛只看标题存在、字数与引用密度都被前半段填满。
   - **已就地更正（均现 grep 复裁，四道门复跑全绿）**：① C07-01 坑 5 原判「`getContainer` 指到非 body 容器时没有滚动锁定」——`PortalWrapper.tsx:112-116` 那个四与门的末项恒真（`container.value` 全文件只在 `:71` 置 `null`、`:92` 置 `defaultContainer`（`:64` 自建 div），永远不等于 `document.body`），真实语义退化成「容器 div 存在」，所以症状是 **body 被误锁而局部容器照旧能滚**，以 A07 坑 9 与 C07-00 论点 5 为准。② C05-01 坑 5 原写「tree-select、cascader 共用同一条 `realVirtual`」——`realVirtual` 全仓只命中 `vc-select/Select.tsx:563` 与 `:587`；tree-select 在 `vc-tree-select/OptionList.tsx:232` **另写了一份同式判断**，cascader 目录零 `virtual` 命中，所以是"三处各改各的"。③ C05-01 §四 把 SSR 撞 id 的登记处写成 I02，实际唯一命中是 **I13 论点 3**。④ C02-07 §一 把 Tabs 记为「C03-12 队列内」，C03-12 实为 BackTop，Tabs 是 **C03-05**。⑤ I01 的取舍 2 与论点 4 接缝行用 `Trigger.tsx:480-483` 那个「`position:absolute` 加 `width:100%` 的浮层容器」论证 `left/top` 收益——那段造容器代码**零调用方**（生效容器是 `_util/PortalWrapper.tsx:64` 只带 `wrapperClassName` 的 div，见 I02 坑 3 与 A07 的容器表行），容器那一半理由作废，结论（仍走 `left/top`）与 `transformOrigin` 冲突那半条保留。⑥ C08-00 §二 原写「tree-table 的列定义只能从 `columns` prop 进」——`treeTableProps()`（`treeTableTypes.ts:95` 起）没有该键，它只在 `treeTableRowProps()`（`:154` 起，键在 `:162`）里，而 `TreeTable.tsx` 对 `props.columns` 零读取；列实际由 `:68` 的 `HelperSet({ type: 'Column' })` 经 `:98-100` 收集子件产出，以同篇论点 2 为准。⑦ C08-04 §一 原写 `column`/`columngroup`/`row` 是「DataTable 与 TreeTable 的共用层」——`grep -rn "from '\.\./data-table" packages/xiaoye-ui/src/tree-table` 与对 `[Cc]olumn` 的 import 形态判据均零命中，TreeTable 不 import data-table 任何文件；这三件只是 DataTable 的内部件（且只有 `column/Column.tsx` 被生产代码引用，见 `C08-02 §一`）。
   - **待落 → 已落（2026-09-29 收尾）**：C03-00 的 §五/§六/§七/附 已补完（4702→10187 字、186→326 引用，四道门全绿，状态原本就是已完成）。随其收工落了四处：① 本篇 §一 第 17 行的 `vc-overflow` 改成「只服务 Menu」并列出四个真实读者与 tabs 零命中判据（Tabs 只经内嵌 Menu 间接受影响）；② 上方 140 行的队列单元格「C03-05 底层 = `vc-overflow`」是失真项，已改为「无 vendor 渲染件」；③ 本篇分母 13→14；④ 两条**类级**新事实上收到 `DISPATCH.md` §3 的 `disabled` 条目——本类 19 个 `useConfigInject(` 调用点无一解构 `disabled`（DisabledContext 对整类断链，单组件篇各写各的容易被当孤例），以及 `panel-menu`/`context-menu` 两文件 `attrs` 出现 0 次而其余 11 个组件转发。**C04-06 同样已补完**（7284→12657 字、97→197 引用），`04-form-controls/导览.md` §三 那条「路由缺口」描述已改写成口径更新，分母 11→12 已改。**C06-08 与 C10-08 也已补完**（C06-08：4899→12768 字、182→281 引用；C10-08：5398→12819 字、124→203 引用；两篇的四道门全绿，占位段清零）。至此 144 篇里不再有任何「（待写）」段落。
   - **口径漂移（不影响结论，逐篇顺手修）**：「读者坐标」分母过期——C06-05 篇头写「类第 5/9 篇」而 C06-06 写「第 7/11 篇」（该类实 11 篇）；C08-03 与 C08-04 都写「第 4/8 篇」、C08-06 写「第 6/7 篇」（该类实 8 篇）。还有 C06-07 取舍五 称 C06-00「撰写中」、C06-03 §二 称 C06-01「尚未落盘」，两篇实际均已落盘。**2026-09-29 处置**：分子有两种并存口径——(a) 1-based 且把横写算作第 1 篇（C06、C08 用这个），(b) 0-based 且横写算第 0 篇（C01、C03、C04、C05、C07、C11、C12 用这个）；**这不是错，不要"统一"它**。真正错的是分母：已按「该目录实际 `.md` 篇数」机械修正 27 篇（C01 的 7→8、C03 一族 13→14、C04 一族 11→12、C05-05 的 8→9、C07 一族 9→10、C12 一族 8→9 与 C12-02 的 3→9），C06 与 C08 各补齐 5 处分子。**分母已全量对齐**（C03-00 的 13→14 随其收工改掉）。核对脚本（只看分母、不动分子）：对每个目录数 `readdirSync` 里的非导览 `.md`，与正文 `第 (\d+)/(\d+) 篇` 的第二组比对。注意**别用文件名字典序推 I 层级号**——`02-infrastructure` 的文件名是 `7-date-kernel`、`8-virtualization`、`10-zindex` 混排，字典序会把 `10-` 排到 `7-` 前面，我据此一度误报 7 处「坐标不符」。
   - **派工提示被证伪两例**：本仓**没有** ProTable 或可编辑表格（08 类 8 篇无此组件与目录，真实可编辑通道是 `data-table` 的 `children.editor` 与 06 类的 `InlineEdit`）；「C10-01 与 C10-09 曾仲裁」不准确，实际定稿的是 C10-00↔C10-01（`mergedSrc` 进预览、`previewMask` 优先级）与 C10-09↔A03（`getDefaultToken` 判据要数实参）。
   - **运维教训两条**：① `check-guide.mjs` 首版取段有 bug（`body.slice(idx).split(/^#{2,3} /m)[0]` 恒为空串），三个写手为了过门把标题降级成 `####` 或在 `##` 后插制表符——**门坏了要先修门再派工，不要让写手绕门**；现已改为 `sectionOf()` 接受 2-4 级标题、竖线判据改成「同一表格各行未转义竖线数须等于表头」，三个绕形归一回 `## `。② 本轮 18 次派工有 8 次以「connection interrupted」中途死（最长存活 25 分钟、读完素材未落盘），5 次颗粒无收；**派短工比派长工活率高**——只补 3-4 个小节的窄派工全部存活，跨 15 篇素材的宽派工死了一半。
   - **队列「底层」列的 10 个待核实项全部填实（2026-09-29 收尾）**：C06-08 = 第三方 npm 运行时依赖 `@dnd-kit/vue`（`^0.5.0`、锁 0.5.0，全库仅 2 行 import、本组件唯一消费者，非自研非原生 drag）、C06-09 = tiptap、C06-10 = Vditor 内置 Lute、C09-03 = 无内核（递归 `<table>` 加 `colspan`）、C09-04 = 无内核（`tree-chart` 的逐字复制目录，归一后仅 25 行差异）、C10-06 = 无内核（Canvas 2D 自绘）、C10-07 = vendored `qrcodegen`、C10-08 = `chart.js`（`dependencies` 而非 dev/peer，经 `Chart.tsx:26` 动态 import 并被 vite external 化）、C12-04 = 无、C12-07 = 自研。`grep -c 待核实 docs/column/OUTLINE.md` 的残留只出现在队列外的说明行，不再有任何单元格挂着未结案项。
   - **两条仓库级缺陷（已取证，本轮不改，属发布/文档决策）**：① **Vue 下限被内核抬高**——`@dnd-kit/vue@0.5.0` 的 peer 是 `vue: ^3.5.0`（两种方法一致：`pnpm-lock.yaml:865` 与装到盘上的 `node_modules/@dnd-kit/vue/package.json:72`），而主库对外声明 `vue: >=3.4.0`（`packages/xiaoye-ui/package.json:44`）、根 `package.json:83` 同为 `^3.4.0`，`AGENTS.md` 与本文件 §2 都写「Vue 3.4+」。在 3.4.x 项目里装本库，sortable-list 一条链会报 peer 冲突；要么抬主库下限，要么把 SortableList 标记为需 3.5+。② **`apps/docs/components/chart.md:95` 的说法与依赖形态相反**——它写「需确保项目已安装 `chart.js` 依赖」，这只在 peer 形态下成立，实际 `chart.js` 在 `dependencies`（peer 块只有 vue），使用方不需要也不能靠自备它来装成功。改的是 `apps/docs`，不在本专栏范围内，登记于此。**（已改：见下一条 9。）**

9. **修复轮（2026-09-29）：把专栏取过证的缺陷真的改掉一批。** 全部改动只碰 `packages/xiaoye-ui/src` 与 `apps/docs`，逐条有 grep 判据；收口是 `pnpm --filter xiaoye-ui typecheck` 干净、`npx vitest run` 全量 **150 文件 1310 通过 / 32 跳过 / 0 失败**、eslint 对改动文件 0 问题。

   - **改掉什么（按族）**：① **注入被默认值吃掉**：删掉 `rate/index.tsx` 的 `direction: 'ltr'`、`spin/Spin.tsx` 的 `size: 'default'`、`chips/Chips.tsx` 的 `disabled: false` 三个真默认值，`useConfigInject` 的 `??`/`||` 右侧重新可达。② **恒假比较**：`galleria/GalleriaItem.tsx`、`GalleriaThumbnails.tsx` 的 `getAttribute(...) === 'true'` 改成 `=== true`（本仓 `getAttribute` 会把 `'true'` 折成布尔）。③ **同名 computed 遮蔽 prop**：`progress/progress.tsx` 的 `progressStatus` computed 现在优先返回用户显式传入的同名 prop。④ **空判闸门**：`_util/PortalWrapper.tsx` 的 `autoLock` 判据从「`container.value === document.body || defaultContainer`」（末项恒真）改成按真实宿主 `parent === document.body`，与同文件 `openCount` 的既有正确写法同形。⑤ **attrs 静默丢失**：`toolbar`、`fieldset`、`chips`、`panel`、`splitter`、`flex` 以及它们底下的共享件 `_shared/CardLike.tsx`，统一改成 `<X {...attrs} class={[..., attrs.class]} style={[..., attrs.style]}>`（照 `card/Card.tsx:193`、`layout/layout.tsx:81` 的仓内既有约定）。⑥ **SSR 不安全的 id**：`scroll-panel` 的 `Math.random()`、`fieldset` 与 `tabs/src/Tabs.tsx` 的模块级自增、`vc-dialog` 那份无防护的 `getUUID`（连同 `util.ts` 里的定义一并删除）全部改用组件实例 `uid`；`vc-image/src/Image.tsx` 的 `let uuid` 经查是预览组注册表的索引而非死代码，**未动**。⑦ **hashId 被丢弃**：`focus-trap`、`ripple`、`galleria`（共 5 处）从 `const [wrapSSR]` 改成 `const [wrapSSR, hashId]` 并把 hashId 并进根类名，哨兵与涟漪的样式从此真的落地。⑧ **样式注册键传错前缀**：`checkbox/Group.tsx` 的 `useStyle(groupPrefixCls)` 改回 `useStyle(prefixCls)`——原写法生成 `.xy-checkbox-group-group`，DOM 里没有这个类。⑨ **组件级 Token 接线**：`rating/style/index.ts` 先读 `token.starColor`/`starSize` 再回落，且 `fontSize` 真的取 `ratingStarSize`，`theme.components.Rating` 不再是通过类型检查但零效果的死面。⑩ **Splitter 两处**：`prevPanelMinSize`/`nextPanelMinSize` 从零依赖 computed（首次求值后永久冻结，三块面板会拿邻居的错误 minSize 钳制）改成按当前索引即时求值的函数；`onResize` 入口加坐标守卫，原生 `TouchEvent` 那次不再把 `NaN` 写进 `flex-basis`/`panelSizes`/`aria-valuenow`/state 存储。⑪ **文档口径**：`apps/docs/components/chart.md` 的「需确保项目已安装 chart.js」改成「chart.js 是本库的运行时依赖、随库安装，产物 external 化后由打包器解析」。

   - **回归测试**：新增两份，**每条都验过"退回基线会 FAIL"**（临时改回旧写法跑一遍确认失败，再恢复）。`src/_util/__tests__/injection-and-attrs.regression.test.tsx` 12 条（rate/spin/chips 注入、progress 覆写、toolbar/panel/fieldset/flex/splitter 的 attrs 落点、autoLock 的三种容器路径），`src/_util/__tests__/style-token.regression.test.tsx` 2 条（checkbox group 不再生成死选择器、Rating 的 `starColor` 覆写出现在产物 CSS 里）。

   - **专栏侧的连带修订**：代码一改行号就漂，`verify-refs --excerpt` 当场报 6 处失效引用，已全部改到位并在段子上标「2026-09-29 已修复/已更新」——I13（第三份 `getUUID` 已删、三份收缩为两份、核对命令的期望值同步改）、C07-01（`util.ts:35` → `:28`）、C01-04（chips 的 attrs）、C02-06（splitter 两处）、C02-14（124 → 121 行并加修复状态行）、C04-08（rate 的 `direction` 默认值）。修完复跑五道门：`verify-refs` 160 篇 33666 条引用 0 问题、`check-doc` 0 不达标、`check-xref` 0 错、`check-guide` 15 篇达标、`board` 144 双校验通过。**教训**：改 `packages/**` 之后必须立刻复跑 `verify-refs`，专栏的引用密度意味着一次代码改动会连带若干条摘录失效。

   - **同一轮里按拍板追加的改动（2026-09-29 二批）**：① **peer 抬下限**：`packages/xiaoye-ui/package.json` 的 `peerDependencies.vue` 从 `>=3.4.0` 改成 `>=3.5.0`（理由见上一条 8 的①），连带 `AGENTS.md` 的技术栈行、`packages/xiaoye-ui/README.md` 的环境要求行、本文件 §2 与 `PROMPT.md` 的事实基线、**A01 论点 11 的三行 peer 表**（该行加了抬升理由，`@xiaoye-ui/core` 的 `^3.4.0` 与 icons 的 `>=3.4.0` 未动——它们不引 dnd-kit，收窄无收益）。工作区实际装的是 vue 3.5.40，改动不影响本地解析。② **导航类 disabled 接通（只做了拍板选中的 Menu 与 Tabs）**：`menu/src/Menu.tsx` 解构 `disabled: configDisabled` 并把 `:274` 的判定改成 `!!props.disabled || configDisabled.value`，`menu/src/MenuItem.tsx` 的 `tabindex`/`aria-disabled` 从 `props.disabled` 改用 `mergedDisabled`；`tabs/src/Tabs.tsx` 解构 `configDisabled` 并在 `onInternalTabClick` 头部早退（与 disabled 的 TabPane 同形：不发 `tabClick`、不改 activeKey）。**已知残留**：Tabs 的键盘方向键切换与 TabNavList 的移除按钮尚未受同一闸门约束；Breadcrumb/Steps/Pagination 等其余 17 个调用点按拍板**暂不接通**。③ **修这一条时挖出新缺陷族**（已入 `DISPATCH.md` §3）：`menu/src/Menu.tsx:53` 原先把 `disabled` 声明成裸 `Boolean`，而 Vue 对 `type: Boolean` 的 prop 在**未传**时折成 `false`，于是 `useConfigInject.ts:43` 的 `props.disabled ?? disabledContext.value` 左边恒有值——**这才是"导航类断链"的真正底层成因，不是忘了写代码而是写成了不可能生效的形状**。已改成三态 `{ type: Boolean, default: undefined }`（与 `booleanType()`、`chips/interface.ts:7` 同形）。按交集判据（裸 `Boolean` 声明 且 被 `??`/`||` 当可缺省读）扫了全仓：`input-number`、`radio`、`checkbox`、`upload`、`chips` 都已是 `booleanType()` 三态，`MenuItem`/`SubMenu` 用的是 `context || props` 的 OR 形状（absent→false 无害），所以**只有 Menu 一处真的是缺陷**，没有做无谓的全仓改写。④ 回归测试加两条（Menu 项跟随禁用上下文、禁用上下文里 Tabs 不切换且不发 `tabClick`），第二条最初写成 `wrapper.emitted('tabClick')` 是**假测试**（wrapper 是提供上下文的外层组件，本来就不 emit），已改成 `findComponent(Tabs).emitted(...)`；两份合计 16 条，复跑 `typecheck` 干净、`npx vitest run` **150 文件 1312 通过 / 32 跳过 / 0 失败**。

   - **二批追加的两项收尾**：① **shim 遮蔽已修**：经用户确认，删除两行 shim `packages/xiaoye-ui/src/_util/transition.ts`（内容只有 `export * from './components/transition'`），`from '../_util/transition'` 现在解析到 130 行的真实现 `_util/transition.tsx`；删除前用 `diff components/transition.tsx transition.tsx` 证过两份实现**只差一行 import 相对路径**（`../type` 对 `./type`），删除后 `typecheck` 干净、全量 `vitest run` 仍 **150 文件 1312 通过 / 0 失败**，即行为中性。删除连带让 **5 篇文档的 13 条引用与描述失真**（I09 论点 3/取舍四/源码地图行、C07-08 论点 5/坑 7、C01-05 源码地图行、C02-09 卡位行、C12-04 图文说明），已逐条改成"修复前…，2026-09-29 已删 shim"的过去式口径并把失效的 `file:line` 摘掉，复跑五道门回到 0 问题（`verify-refs` 160 篇 33654 条引用）。`_util/components/` 整目录副本按拍板保留未动（它仍经 `_util/index.ts:46` 的 `export * from './components'` 进 barrel）。受影响的历史引用口径需要留意：`alert/index.tsx:16` 等六处原本"实际吃到机械副本"，现已吃到真实现，C07-08 与 A06 里那条取证描述的是修复前状态。② **badge 双表取证完成、判为真缺陷但暂不动**：`src/badge/style/index.ts` 只有一个 `genSharedBadgeStyle`（`:59`，含 9 处 `ribbonPrefixCls` 引用且**无条件生成**），默认导出是单个 `genComponentStyleHook('Badge', ...)`（`:337`、`:377` 单段返回）。于是 `Badge.tsx:52` 传 `xy-badge`、`Ribbon.tsx:30` 传 `xy-ribbon` 各注册一张表：两张表都含**同一批 ribbon 规则**（ribbon 前缀走 `rootCls` 即 `:73-74`，与传入的 componentCls 无关）→ 真重复；而 Ribbon 那张表里的 badge 规则被拼成 `.xy-ribbon-count`、`.xy-ribbon-status-*` 一类**DOM 里不存在的死选择器** → 一张表整体是死 CSS。判据可复现：`grep -c ribbonPrefixCls packages/xiaoye-ui/src/badge/style/index.ts` → 9；`grep -n "genSharedBadgeStyle\|genComponentStyleHook('Badge'" packages/xiaoye-ui/src/badge/style/index.ts`。修法不是"合一张表"，而是**把 `genSharedBadgeStyle` 拆成 badge 段与 ribbon 段两个 hook**（Ribbon 单独注册 ribbon 段，Badge 不再带 ribbon 段），涉及 378 行样式文件的结构与快照，留作下一轮独立改动。

   - **badge 双表已拆（2026-09-29 三批）**：按取证给出的方案落地——`badge/style/index.ts` 保留那个大函数不动，在它之上加两个按键取段的包装 `genBadgeStyle`（`:344`，只取 `componentCls` 那一键）与 `genRibbonStyle`（`:350`，只取 `-ribbon-wrapper` 与 `-ribbon` 两键），token 计算抽成 `buildBadgeToken`（`:359`）共用；默认导出 `:401` 只注册 badge 段，新增具名 `useRibbonStyle`（`:407`）只注册 ribbon 段，`Ribbon.tsx:3/30` 改用它。组件名仍是 `'Badge'`，故 `theme.components.Badge` 的覆写面与 `dist` 快照口径不变。**净效果**：Badge 的表不再带 `.xy-ribbon*` 规则、Ribbon 的表不再带一整张拼成 `.xy-ribbon-count` 之类死选择器的 badge 规则。验证：`typecheck` 干净、全量 `vitest run` **150 文件 1314 通过 / 0 失败**、badge 自身 14 个用例不变绿；新增 2 条样式分段断言（`style-token.regression.test.tsx`），其中 Badge 那条**实测在拆表前会失败**（`expected ... not to contain '.xy-ribbon'`）。**踩到一个假探针并修掉**：第一版直接读 `document` 里全部 `<style>`，被同文件前一个用例的样式残留污染，四条断言在拆表前后都全绿；改成"只取本次挂载新增的 style 节点"后才有判别力。Ribbon 那条反向断言（不该出现 badge 规则）实测选不出可靠字面量——cssinjs 把 `componentCls` 编译成 `[class^="xy-ribbon"]` 属性选择器，badge 段的 `&-count` 不落可搜字面量——故该侧只留正向断言，重复注册的判别力由 Badge 那条承担。文档连带更新：`C01-05` 论点 7 加修复说明、`Ribbon` 那条取舍改写成"借用 Token 命名空间但用自己的 hook"并指出**剩余的第三项代价（badge 根 `position: relative` 与 `.xy-ribbon` 争特异性）不能顺手改**（OverlayBadge 靠它赢特异性，见 C01-06 论点 3）、`style/index.ts:342`/`:370` 两条行号改到新位置，01-general 导览与总导览的族谱行同步标注已修。

   - **list 的 4 条死选择器已修（2026-09-29 三批同轮）**：取证在 `C08-05 论点 2` 与 `坑 8`。处置与理由——`.xy-list .xy-list-spin`（`style/index.tsx:145`）与 `.xy-list-loading .xy-list-spin-nested-loading`（`:312`）**改指 Spin 的真实容器** `${rootCls}-spin-nested-loading`（现 `:147`、`:311`）；窄屏媒体块的 `.xy-list-action`（`:80`）**改指** `-item-action`（组件产出的是 `-item-action`，见 `Item.tsx:68`）；`.xy-list-split.xy-list-empty .xy-list-footer`（`:308`）这条不是选择器写错而是**等不到根类名**，于是在 `index.tsx:278` 用与空态分支同一判据（`!splitDataSource.length && !children.length && !isLoading`）生成 `-empty`，footer 边框复活。与 `-empty-text`（`:241`）值冲突的那条 `.xy-list-empty` 规则**删除**——保留会让根与内层叠成双份 padding，删掉可让空态外观维持原状。**行为变更是有意且需要发布说明**：`ListToken.minHeight`（此前唯一消费点在死规则里）与 `controlHeight` 兜底高度、`textAlign: center`、窄屏 `-item-action` 边距从此真的生效；此前看到的加载占位高度只有组件里内联写死的 53px。回归 `src/list/dead-rules.test.tsx` 4 条（两条 `not.toContain` 的反向断言用 `git show HEAD` 查过基线文本确实含 `componentCls}-spin`、`componentCls}-action` 且根类名无 `-empty`，非空转）。踩过的坑记一笔：样式断言第一版沿用"只取本次新增 `<style>` 节点"的增量法，在同文件里 List 的表早在第一个用例就注册完，后两个用例只读到空串——CSS 类断言要么读整份 document、要么把挂载顺序安排进断言，两种写法不能混用。

   - **改代码之后的全栏行号同步（list 轮补做，量出方法）**：`index.tsx` 插入 4 行让 `:271` 之后整体 +4、`style/index.tsx` 一处 +2 一处 -3，只跑 `verify-refs --excerpt` 只抓到 1 处不符（它是「标注行 ±窗口内能否搜到摘录首行」，行号越界才报，纯位移不报）。真正可用的判据是**按 diff 的 hunk 头算 old→new 映射**（`git diff -U0` 的四段是 `@@ -80 +80 @@`、`@@ -145 +145,3 @@`、`@@ -235,7 +237,4 @@`、`@@ -312 +311 @@`），再把 `C08-05` 全文所有指这两个文件的行号（含 261 条**裸 `:NNN`**，裸引用不带路径所以极易漏）逐条搬运。跨篇还要另扫：本轮实际修了 `C08-04` 三处 `list/index.tsx:309`→`:313` 与 `C02-00` 一处 `:302`→`:306`。同步后 `verify-refs --excerpt` 33654 条引用 0 问题，五门全绿。文档口径改动：`C08-05` 论点 2 与坑 8 改成"修前/修后各给一份行号"，两段摘录显式标成「修复前快照」且**不再挂 `path:line` 标注**（挂了就是在指认一个当前不存在的位置）；§七 死代码那条从「为什么不删」改写为「为什么人工删得掉但工具抓不到」；检查点 2 重写成修后仍然可证伪的四条 grep（每条都当场跑过并记下预期命中行），检查点 3 的期望计数改为 `0 / 1 / 3 / 6` 四个文件。08-table 导览新增一条坑索引：「改了样式没反应」有两种相反成因，判别方法是把生成集合与引用集合**双向相减**。

   - **Tabs 事件双投递已修（2026-09-29 追加，本轮从「残余」转成「已证已修」）**：上一轮把 `disabled` 接到 Tabs 的点击通路后登记的残余是「键盘箭头/removable 通路仍未受 `configDisabled` 控制」。本轮取证推翻其中一半：`TabNavList` **没有方向键切标签**的实现（`grep -rn "KeyCode\." packages/xiaoye-ui/src/tabs` 只有 SPACE/ENTER 与下拉内 UP/DOWN/ESC），所以「键盘通路漏禁用」不成立——键盘激活全部走 `emit('tabClick')` 汇进 `onInternalTabClick`，与鼠标同一条早退。真实存在的是另一件事：**同一次交互把外部 handler 放大调用**。四个文件每层都写 `emit('x')` 紧接 `callEvent(props.onX)`，而 Vue 的 `emit` 本就从 `instance.vnode.props` 取 `onXxx`，两条通道指向同一函数；外层 `XYTabs` 又把用户 handler 与自家桥接 arrow 一起 `{...props}` 摊给内层，`mergeProps` 将事件键并成数组，于是每穿一层翻一倍。真实组件树实测（jsdom 计数）：修前点一次标签 `onTabClick`/`onChange`/`onUpdate:activeKey` **各 16 次**、点一次加号 `onEdit` **4 次**；本篇原先按四级转发形状复刻的最小复现给出 8 次，比真树少一半，差额就是那层数组并集。处置：`Tabs.tsx`、`TabNavList/index.tsx`、`TabNode.tsx`、`OperationNode.tsx` 里所有 emit+callEvent 双投改成只留 `emit`，四份逐字相同的局部 `callEvent` helper 随之删除（本类该工具从 5 份降到 1 份，全仓 23→19）；外层 omit 清单由 1 键扩到 5 键；`editable.onEdit` 加上 `configDisabled` 早退（加号与关闭图标在禁用上下文里彻底不发 `edit`）。回归两份：`tabs/event-dedupe.test.tsx`（4 用例 9 断言，全部断**确切次数**）与 `injection-and-attrs.regression.test.tsx` 新增的对照组+禁用组两条。**判别力实测**：把四个文件 `git checkout` 回 HEAD 后这 4 条全红，报 `expected 4 to be 1` 与 `expected 16 to be 1`；对照组（未禁用时 `onEdit` 恰好 2 次）用来防「节点没找到所以恒零」的假探针。验证：`pnpm typecheck` 干净、`eslint` 0 error（5 条 prettier warning 已手工修）、全量 `pnpm --filter xiaoye-ui test:unit` **152 文件 1324 通过 / 32 跳过 / 0 失败**（本会话基线 150/1314 → +2 文件 +10 断言）。文档连带：`C03-05` 源码地图行数与测试行、论点 4/5/6 与坑 2/坑 3 全部改成「修前快照 + 修后单投」双口径（快照块不再挂 `path:line` 标注），`C03-00` §五 派发机制与 `callEvent` 份数、检查点 2/3 的期望值同步，`C03-05` 双层切分那条取舍标注「事件链翻倍已修，代价是 omit 清单必须与新事件键同步」，03-navigation 导览与总导览的族谱行同步（总导览新增「事件双投递按层级数放大」一族，登记 Tabs 已修、Card/`vc-dialog`/popconfirm/upload/tree-select/date-picker 未修）。

   - **本轮踩到的运维事故（必须记下）**：修完 Tabs 之后为「全栏引用与新行号对齐」新写了 `tools/shift-refs.mjs`（按 `git diff -U0` 的 hunk 头 + 内容相等把文档行号搬运）。它第一次运行是对的，但我**把同一批源文件跑了两遍**——该映射不幂等（对已正确的行号再跑一次会把它按「HEAD 该行的文本」二次搬迁），于是 47 篇文档的**正文行号**出现 ±1~±2 的过搬。补救与结论：(1) 新写 `tools/relocate-excerpts.mjs`，按摘录块自带的首行文本重新定位标注行号，33 处机械修回、4 处（`C02-06` splitter，needle 文本重复）人工判定，`verify-refs --excerpt` 从 37 个问题回到 **0**（160 篇 33647 条）；(2) 只写路径级前缀匹配的引用才可机械搬（`style/index.tsx` 这种在每个组件目录都重名的短前缀一律不动，工具里已按「全仓唯一命中」加锁）；(3) **正文裸 `:NNN` 的引用在这 47 篇里目前不可信**，五道门全绿也照不出来——这是 `verify-refs` 只校验越界与摘录首行的直接后果。剩余动作是按篇用「符号锚定」重建：`docs/column/tools/check-ref-content.mjs` 已写下原型（取引用左侧最近的反引号标识符，要求它在目标文件里唯一出现并落在引用行 ±4 内），但噪声仍高，需要先收紧成「标识符必须紧邻」再当第 6 道门接入。**在收紧之前不要再对全栏跑批量搬运。**

   - **引用基准修复轮（同夜接续，把上条事故的账还上）**：新写第 6 道门 `tools/check-ref-content.mjs`——判据是「引用左侧紧跟的反引号标识符必须落在该行 ±5 内」，三档处置：符号在目标文件唯一出现（`--fix`，51 条）→ 直接改；符号 ≤3 次且最近落点比次近者明确更近（`--fix=nearest`，68 条）→ 改并记下偏移；符号根本不在此文件（107 条）或满盘皆有的通用名如 `ConfigProvider`/`customRender`（25 条）→ 只计数不报条目，避免把正确引用改坏。两轮之后全栏剩 **37 条待人工判定**，已落到 `docs/column/tools/.ref-backlog.txt`（带候选行与行内文本）。**这 37 条不能机械修**：抽样看过的前几条里就有 `Card.tsx:3`（引的是 import 行，符号本身在 26 行）这类「引用正确、锚点符号不属于该行」的门误报，逐条要读行文才能定。修完之前此门按报告用，不作阻塞门；`verify-refs --excerpt` 与其余四道门保持 0 问题。

   - **事件双投递全族收口（2026-09-29 第二轮，用户点名的「事件双投递的其余站点」）**：上一轮只修了 Tabs 一族，本轮把全库剩余站点清完，并纠正了一个前提错误——这族缺陷**不是一种形状而是三种**：① `emit('x')` + `callEvent(props.onX)`；② `emit('x')` + 一句 `props.onX?.(...)` 直调（`mentions`/`switch`/`radio`/`dark-mode-toggle`/`vc-select`，15 处）；③ 外层把整包 `{...props}`/`{...attrs}` 摊到元素上、同一元素又显式绑 arrow，`mergeProps` 并数组（`input-number`/`slider`/`switch`/`steps`）。另外 helper 有**两个名字**：`callEvent` 与只在 `input-number` 出现的 `callPropEvent`（8 处），只 grep 前者会整族漏掉。本轮删除直调共 **50 处**（①27 + ②15 + ③8），删掉 5 份 helper 定义（`vc-picker/Picker`、`vc-picker/RangePicker`、`vc-cascader/Cascader`、`vc-tour/Tour`、`input-number/src/InputNumber`），并在 4 个组件的 spread 上补了「本层已桥接的 handler」剥离表（`input-number/index.tsx:146`、`switch/index.tsx:180`-`:196`、`slider/index.tsx` 两处 `omit(restProps, [...])`、`steps/index.tsx:146`）。**最重的样本是 InputNumber：一次 `focus` 投 6 次、一次输入投 4 次**（三层相乘），Tabs 的 16 次退居第二；两处都按「形态+层数」写进各自的坑条目。证据链：`packages/xiaoye-ui/src/_util/__tests__/event-dispatch-count.test.tsx` 现 23 条计数用例（新增 Switch/Radio/Mentions/DarkModeToggle/DatePicker-mousedown/RangePicker/Select-search/Cascader/InputNumber×2/Slider），`cp` 备份后把 13 个改动文件退回 HEAD 复跑 → **13 红 6 绿**，判别性成立；全量 1343→（本轮后）以电池复跑为准，`pnpm --filter xiaoye-ui typecheck` 0 error、14 个改动文件 eslint 0 error。
   - **收尾又挖出三个形态三站点（2026-09-30，代理回报驱动的二次取证）**：写作代理在做 `C05-04`/`C05-07`/`C03-13` 时回报「公开层还在翻倍」，实测确认三处：**TreeSelect 一次点树节点 `@change` 修前 4 次**（厂商层 callEvent × 公开层 mergeProps 数组相乘；厂商层上一批已清，公开层 `tree-select/index.tsx:264-274` 的 omit 本轮补齐）、**TimePicker 单选与范围两个包装组件**（`time-picker.tsx:140`、`:236` 原来只剥两个 update 键）、**Tour 公开层**（`tour/index.tsx:76`、`:79` 现在各剥 `onChange`；它必须在 attrs 侧也剥，因为 `onChange` 不在 `tourProps` 白名单里、走的是 attrs）。TreeSelect 用计数判据（修后 1 次，退回基线 4 次）；TimePicker 与 Tour 在 jsdom 里点时间格不提交、翻不到页，改用**数组形状判据**——`mergeProps` 并数组会让 Vue 打 `Expected Function, got Array`，断言 `console.warn` 为空，基线复跑分别得到 4 条与 1 条告警。**教训：jsdom 测不出次数时不代表无法验证，缺陷的形状本身（那条告警）就是判别器**；另外「只清 vendor 层」是不完整的收口，外层 omit 清单必须与本层桥接 arrow 同步，这也是本族残留的真正来源。计数文件现为 **23 条**（实测 22 passed），全栏 11 处「19 条」已同步。
   - **全族数量口径（以此为准，别再引用我早先写的 50）**：相对 `HEAD` 共删除 `callEvent/callPropEvent(props…)` 直调 **100 行**（复现命令：`git diff -U0 -- packages | grep -cE "^- *(callEvent|callPropEvent)\(props"`），涉及 22 个文件；另有形态二的 `props.onX?.()` 直调 15 处、形态三的 omit/剥键补写 6 个文件、helper 定义删除 6 份（残留 6 份都是单通道或有意保留：`popconfirm`、`vc-dialog`、`upload/UploadList`、`BaseSelect`、`Selector/index`、`Selector/Input`）。
   - **六个并行写作代理的 casualties（运维账）**：三个（date-picker 首发、feedback、select）撞 150 轮上限被切断、一个（arch）同上、一个（date-picker 首发）连接中断；每个烧掉 2500 万-5200 万 token 而产出只覆盖 1-4 篇。**结论：这类「按已知事实改写若干处散文」的工作不该派长代理**——范围小、判断密、需要跨篇核对编号，代理更容易在中期死掉并留下半成品（幸而我每次都自己复跑了四道门与内容抽查，没被它们的自报「全绿」骗到）。重派时把范围压到 ≤3 个文件、并在提示里写明「死掉也要能被门筛出来」。
   - **本轮的方法论账（两条，都要记住）**：① **结构启发式的产出不能直接当缺陷**——新写的 `tools/scan-jsx-tag-double.mjs` 报 30 个文件 / 92 个候选标签位，逐个真跑之后只有 3 个组件（InputNumber/Slider/Switch 的 attrs 面）是真的，其余全是假阳性；所以「扫描器 + 计数探针」是两步，缺第二步就会误修（误修 `mergeProps` 型会把用户回调彻底丢掉，因为那层根本没 `emit`）。② **新加的断言必须在基线上会 FAIL**：我一度给 InputNumber 的 `@keydown` 写了一条「修前 3 次」的断言，退回基线复跑发现修前修后都是 1 次——因为 Vue 对声明过的事件走 `isEmitListener`，`onKeydown` 从来不进 attrs，那条断言不判别，已删；顺带据此**纠正了 `C04-02 坑 1` 的旧结论**（原文写「`:on-keydown` 永不被调用」，实测会被调用一次）。
   - **本轮登记的一条「未修」经复核是假缺陷，已撤回（2026-09-30）**：我先前写的「`Steps` 的 `@change` 与 `v-model:current` **根本没有投递路径**」不成立。成因是探针点的是 `.xy-steps-item-container` 的**第一个**（当前项），而 `vc-steps/Steps.tsx:39` 有 `if (current !== next)` 的同值短路，于是量到 0 次并把机制误读成「`onItemClick` 从不调用 `props.onStepClick`、`stepClick` 无人监听」。实际链路是通的：`emit('stepClick')` 拼出的键名正是 `onStepClick`，命中的就是容器传下来的那个 prop（`Step.tsx:36` 声明、`Steps.tsx:69` 传入）。**同一轮里真正的问题是翻倍**：公开层 `{...omit(props, ['percent','responsive'])}`（现 `steps/index.tsx:139`）把用户 `onChange` 摊下去、又显式绑 `onChange={handleChange}`（`:145`），修前一次点击 `@change` **2 次**、修后 1 次；新增回归 `event-dispatch-count.test.tsx:414`（基线复跑为 2 次）。文档侧已同步：`C03-06` 坑 10 整条改写（含撤回说明与「必须点非当前项」的可复跑判据）、03-navigation 导览、`C03-00` 的保护现状句。**教训**：量到 0 次先怀疑「这次交互到底改变了状态没有」，再谈「无路径」——这是 [[负面结论要换方法复核]] 的一个新变体：探针的**输入选择**本身就能造出假阴性。

   - **引用内容门结案（2026-09-30，任务「人工判定 .ref-backlog 的 37 条」）**：37 条逐条读句子之后的分配是**真错 3 / 判据假阳性 32 / 人工放过 2**。三条真错都是「行号指向邻近但不对的地方」——`calculateOptions` 指到函数体内的发射行（补「函数起于 :408」）、ScrollPanel 的 `hashId` 指到 `onFocus` 那行（改到 classes 数组 :397）、Card 用一个 `:3` 同时代表 `Tabs` 与 `TabPane`（拆成 :3 导入 + :26 解构）。32 条假阳性暴露的是**门的判据缺陷而不是文档缺陷**，已把两类知识写进门：缺失断言句（「不含/没有/不传/没传/不参与…」——行内当然找不到那个符号）与并列/交织式符号表（一行 ≥2 条引用时「最近的前置标识符」会认错主人，如「`f:45` 取 `useStyle`、`f:109` 用 `wrapSSR`」）。于是判据从「最近前置标识符」升级为「同一句里任一标识符落在该引用 ±5 内即认定这条引用属于它」。全栏现状：**抽查 2021 条，行号与符号不符 0 条**，四类跳过各有计数（109/26/19/12），人工放过的 2 条落在 `tools/.ref-accepted.txt` 里并写明判定日期。这条的意义：`check-ref-content` 从此可以当**硬门**用（要求 bad=0），而不再是一个需要人反复解释的软报告。

   - **Form 双击提交（2026-09-30 修 + 撤回半条）**：探针实测「字段全合法 + 连点两次」→ `@finish` 1 次、`@finishFailed` **1** 次（payload `{values, errorFields: [], outOfDate: true}`）。根因是 `Form.tsx:327` 的「已被后一次取代」标记 `Promise.reject([])` 写在 `.then` 里，被紧随其后的同一个 `.catch`（`:329-335`）归一成普通失败对象，而 `outOfDate` 全文件算出后没人读。修法是投递口吞掉那一轮（`:360-362`），回归 `form/__tests__/form.test.tsx:187`（基线复跑 `onFinishFailed` 1 次 → 红）。**同时撤回初稿的另一半**：那条「开了 `scrollToFirstError` 会抛 `TypeError` 并留下未处理 rejection」没实测支撑——`errorFields` 实际是 `[]`，`.length` 读到 0，探针的 `unhandledRejection` 收 0 条；`:206` 的无守卫读体现在只是**潜在**风险。文档侧已改 `C06-01` §四 段与坑 2、06-form-editor 导览。**这是本轮第二次「把推演当实测」**（第一次是 Steps），已把「量到 0 次先确认输入真的改变了状态 / 写下抛错结论前先挂一次探针」写进记忆与 DISPATCH。

   - **data-table 全表死样式已对齐（2026-09-30，用户拍板「改样式侧对齐 DOM + 样式断言与类名相减验收」）**：`style/index.ts` 里 `&__` **155 处**（去重 55 个元素名）+ 根级 `&--` **40 处**（去重 7 个修饰符）编译成 DOM 永不产出的 `.xy-data-table__xxx`，即 597 行样式表除根块外全部落空——全书面积最大的死 CSS。替换只有两条规则：`&__`→`&-`、根级 `&--`→`&-`，**元素内修饰符的 `--`（`-cell--frozen`、`-row--odd`）保持原样**（探针实测 DOM 就是这个名字，初稿说「两套名字从不错位」因此过头，已更正）。选「改样式侧」是因为公开类名一个字不动，用户已有覆盖继续有效。验收没有停在「grep 到 0 残留」：新增 `data-table/__tests__/style-selectors.test.tsx`，读注入到 document 的真实 CSS，三条判据（无 `__`/`--` 选择器、DOM 类名能被引用、规则连 `position: sticky` 一起送达），退回基线三条全红（①数到 155 条）。副作用写明：这 597 行**从此真的生效**，表头吸顶/边框/悬停/尺寸档位外观会变，全量单测（154 文件 / 1351 通过 / 0 失败）不覆盖视觉，需要人工比版。同篇 坑 4（`gridlines`/`striped`/`hoverable` 连类名生产者都没有）按实测确认仍死，未一并处理。文档同步：`C08-02` 论点 2 与 坑 3/坑 4 与 mermaid 注记、08-table 导览、总导览死 CSS 那条。

   - **坑 4 与坑 3 一起收（2026-09-30）**：data-table 的 `showGridlines`/`stripedRows`/`rowHover` 在坑 3 之后仍然无效，因为缺的是**类名生产者**——根节点类名唯一来源 `DataTable.tsx:2296` 的 `dataP` 里没这三个键（prop 名见 `dataTableTypes.ts:55`、`:90`、`:91`），12+3+2 条规则等不到宿主。补三个键后 `style-selectors.test.tsx` 第四条同时断言「根类名在」「注入 CSS 里有复合链 `.xy-data-table-striped .xy-data-table-body>tr.xy-data-table-row--odd`」「行上真有 `-row--odd`」；比对前要抹掉 cssinjs 给每个类名加的 `:where(hash)` 前缀，否则 `toContain` 恒假（我自己先踩了一次）。基线复跑报「根节点缺类 xy-data-table-gridlines」。文档同步 C08-02 坑 4 与 08-table 导览。**教训**：死样式常常有两端，样式侧与类名侧要分别相减，只修一端会留下「看起来修完了」的假象。

   - **仍没改的以及为什么**：`_util/components/` 整目录机械副本按拍板保留（只修了 shim 遮蔽那一半）；`portal` 的 attrs 未展开**判为不是缺陷**——它渲染 Teleport/片段、没有自己的 DOM 节点，`inheritAttrs: false` 在此是对的，**这条同时修正专栏原先的口径（C12-06 论点 5 的「attrs 丢失」半边不成立）**；`useComponentProps.ts:34` 的 hook 版兜底（全仓仅 RichTextEditor 一处调用，改判据要连带核对 `contentType` 的默认值语义）。

   - **chart 加载失败有了出口（2026-09-30 修，用户选项「修 chart 失败无错误态」）**：`Chart.tsx` 的动态 import 原先两条失败路径全都无声——reject 没有 `.catch`（修前 `:26-44` 整链），「模块解析成功但没有默认导出」更是连 promise 都是成功态。现在 `:36-42` 与 `:57-60` 两条出口都写 `loadError`（`:24` 新增 ref）并 `emit('error')`，`emits` 从两个变三个（`:13`），渲染端 `:160-166` 把 canvas 整块换成 `.xy-chart-error`（`role="alert"`，`slots.error` 优先于 `message`），样式侧 `style/index.ts:22-31` 成对补了选择器并多读三个 Token（`colorError`/`fontSize`/`padding`）。新测试 `chart/load-error.test.js` 四条，其中第四条用 `default` getter 把 mock「修好」，**实测**了恢复顺序：`loadError.value = null`（`:28`）排在 `import()` 之前，Vue 的 flush 微任务先让 canvas 重新挂载，`.then` 续体才拿到元素——构造函数收到的第一个参数 `tagName === 'CANVAS'`、`loaded` 载荷非 null，所以瞬时失败不会永久锁死。`npx vitest run src/chart` 现 2 files / 12 tests（修前 1 file / 8 tests），三条失败态用例在退回基线的代码上全红。用户文档同步：`apps/docs/components/chart.md` 加 `error` 事件行（`:79`）、新增 Chart Slots 表（`:81-85`）、备注加一条（`:106`）。C10-08 的连带更正量大：155→180 行、五个文件→六个、"没有插槽/判据 grep slots 返回空"作废、`grep -n "chart\."` 判据被新增注释与错误文案污染、需收成带开括号的形态（正好 7 行）、`chart.md` 行号整体搬迁 10 处、`??` 在族 2 需要形状甄别（`:162`/`:164` 是可达兜底，不是本族）、`grep -rn "chart.js" src` 从 8 行变 15 行。坑 6 拆成两半记账：加载失败已修，四键全空未修；取舍六的"取消标志仍缺"也如实保留为未修。

   - **四条「未实测」全部做完（2026-09-30，任务 #26）**：① `vc-trigger` 的「popup 内容 stopPropagation 会误关外层浮层」**被实测推翻**——document 侧监听注册的正是 `mousedown` 本身（`Trigger.tsx:145-151`），内容截掉冒泡后 `onDocumentClick` 根本不被调用；新增 `src/vc-trigger/__tests__/popup-mousedown-stop.test.js`（3 条，含「点外部必须请求关闭」的判别性对照与「不截冒泡时靠 `contains` 而不是 `hasPopupMouseDown`」），C02-02 坑 7 的症状半边已改写为撤回。② 空 `href` 语义用 playwright chromium 实测成立：`href=""` 解析为当前文档 URL、点击后页面脚本重跑（原地自跳），带 `target` 时真的开出一个 URL 与 opener 相同的副本 tab → C03-02 坑 4 与 `03-navigation` 导览已改成「已实测」。③ 水印两处规范推导实测：`measureText(undefined).width === measureText('undefined').width === 73.0879`（`''` 是 0），以及 `ctx.font` 简写解析失败时**整条被丢弃**（`none/weight/light` 三档读回都是基线 `10px monospace`，默认档 `normal normal 16px/64px sans-serif` 可解析）→ C10-06 论点·其二/其三 已改写。④ `ownership-pins` 的失效判定实测出一**条真缺陷**：pin 的名字从所有组件里彻底消失时循环根本不访问它，`stalePins` 恒空，与 `ownership-pins.mjs:4-6` 头注释承诺相反 → 已在 `entry-generator.mjs:375-381` 补反查、`tests/entry-generator.test.js:169-179` 补用例（20 条全绿），并端到端测过 `pnpm check:entries` 以退出码 1 阻断（清单文件用副本改、跑完还原，`git diff` 对清单为 0 行）；`--write` 那一半仍只有代码依据，因为跑它要真改三个 tracked 文件，本轮没动。**探针脚本一律写在 `docs/column/tools/.tmp-*.mjs` 里、跑完删**，浏览器探针需要显式 `executablePath`（`~/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/...`）+ 全局 `@playwright/cli` 里的 `playwright-core` 绝对路径。

   - **Nuxt 组件级样式注入：已实现、机制已测、端到端未通（2026-09-30，任务 #27）**。落地三件：① 新增 app 侧插件 `packages/nuxt-module/src/runtime/style.server.ts`（`module.ts:109` 以 `mode: 'server'` 注册）——每请求 `createCache()` 挂到 `app.config.globalProperties.__XYUI_CSSINJS_CACHE__`（`StyleContext.tsx:93-110` 的 `getCache()` 读的就是这个键，因此**不需要给用户包 `StyleProvider`**），`app:rendered` 时 `extractStyle(cache)` 写到 `event.context.xiaoyeUiSsrStyles`；② `plugin.server.ts:39-42` 在 `render:html` 的第二参数里取 `ctx.event.context` 并 push 进 `html.head`，同文件的 TODO（`:37-39` 修前）关闭；③ 顺手修掉本篇 §断链 记录的那条真缺陷——`getThemeCssString` 原先从 `@xiaoye-ui/core/config` 具名导入而那里只是三行占位模块，现已把变量表搬进 core（`core/src/config/index.ts:12-34`）、组件包改一行转发（`xiaoye-ui/src/config/index.ts:6`）、shim 补形状（`nuxt-module/src/type-shims.d.ts:11`）。**机制证据**：`packages/xiaoye-ui/tests/cssinjs-ssr-extract.test.tsx` 3 条（套 provider 取得到 `.xy-btn`／不套取不到＝判别性对照／挂 globalProperties 就能接管＝插件走的那条），`pnpm typecheck` 全绿，nitro 阶段不再报 `"getThemeCssString" is not exported`。**端到端没跑通**：`packages/nuxt-module/playground` 的 `npx nuxi dev` 仍有三类前置错误——`Missing "./config" specifier in "xiaoye-ui"`（`metadata/src/composables/index.ts:5` 把 composable 注册成从 `xiaoye-ui/config` 导入，而 `config` 在 `gen-entries.mjs:34` 的 `EXCLUDE_DIRS` 内，生成物 `exports` 永远没有这个键）、`Missing "./autocomplete"`（该目录不存在，残留引用）、`Failed to resolve import "#app-manifest"`。**要决的题**（动公开导出面，交用户拍）：`useXiaoyeUI`/`XiaoyeUIConfiguration`/`getThemeCssString` 到底放包根（要更新 `tests/__snapshots__/index.test.js.snap`）还是给 `config` 开一个非组件的 `exports` 子入口（要改生成器对 EXCLUDE_DIRS 的处理）；`@xiaoye-ui/core` 是否补进 nuxt-module 的 `dependencies`（会动整仓锁文件）。

   - **用户拍板「包根导出三个名字」之后落地的（2026-09-30，任务 #28）**：`packages/xiaoye-ui/src/index.ts:11-13` 新增 `applyTheme`/`getThemeCssString`/`registerCssVariables` 三个具名导出与 `XiaoyeUIConfiguration` 类型（类型定义在 `src/config/index.ts:9-16`，注释如实写明 `install` 目前不读这个参数），`packages/nuxt-module/src/types.d.ts:1` 改从 `xiaoye-ui` 取类型；包根导出面快照只多了这三行（`tests/__snapshots__/index.test.js.snap`，`npx vitest run tests/index.test.js -u` 后 `git diff` 实测 `+3 / -0`）。**顺带实测到一条更大的**：`packages/metadata/src/shared.ts:19` 的 `toMeta` 兜底原先是 `toLowerCase()` 不插连字符，把 `AutoComplete` 推成 `xiaoye-ui/autocomplete`——这就是 playground 报 `Missing "./autocomplete" specifier` 的根因；已改成 kebab-case，同一份脚本口径下 151 条组件条目的 `from` 失配**从 87 降到 53**（命中 64→98），受益 34 条全是「目录确实存在、只差拼写」。`packages/metadata/src/composables/index.ts` 的三条（`useXiaoyeUI`/`useConfirm`/`useDialog`）经 `grep -rn "export (const|function) …"` 零命中确认**整组是虚构**，已清空为 `toMeta([])`（清单非空时生成的 Nuxt 插件必然写出解析失败的 import）。剩余 53 条与 `directives` 的 4 条同类死引用登记成任务 #29；A01 论点 2、A08 论点 4 与 `01-architecture/导览` 三处已同步改成「修前 82/87 → 修后 53」的口径。**#29 的修法已纠偏**：剩下的 53 条不是「补 `from`」能了事的——`from` 被 `module.ts:117` 拼成**默认导入**，而这类组件是父目录的**具名**导出（实证两条：`layout/index.ts:10-13` 的 `LayoutHeader/Footer/Sider/Content` 是四行常量再导出、`tabs/index.ts:20` 只具名导出 `TabPane` 而清单登记的 `Tab`/`TabList`/`TabPanels`/`TabPanel` 四个名字全不存在）。要么给 `MetaType` 加具名导出表达（resolver 的 `stringifyComponentImport` 本来就吃 `exp`），要么删掉整条虚构的（`NuxtEditor*`、`Dock`、`Menubar`、`Terminal`、`Fluid`、`IconField`、`InputGroup*`、`CircularSlider`、`LazyContent`、`ConfirmDialog`、`DynamicDialog` 等在包根 `components.ts` 里也查不到）。全量单测在这一切之后重跑：157 文件 / 1363 用例绿。

   - **#29 的第一步：把 53 条失配钉成债务清单（2026-09-30 写、**尚未跑过**）**：新增 `packages/xiaoye-ui/tests/metadata-entries.test.js`，用 fs 读 metadata 三个清单（对象条目取显式 `from`、裸名按 `toMeta` 的 kebab 规则推导），逐条比对主包 `package.json` 的 `exports` 目录键集，与一份 `KNOWN_BAD` 清单双向对赌——**新增失配则失败，清单里的条目被修好也失败（要求删掉该行，防清单腐烂）**，形状与 `ownership-pins.mjs` 的 pin 失效判据一致。清单是按目录逐条手推出来的（53 条 components + 5 条 directives 手写错拼 `badgedirective`/`styleclass`/`focustrap`/`animateonscroll`/`keyfilter`），与本篇 §论点 4 的机器口径 53 条对得上。**下一条命令必须做的事**：`cd packages/xiaoye-ui && npx vitest run tests/metadata-entries.test.js`，两向都空才算这条落地（本轮命令分类器不可用，只跑过 `ls`，没有跑到测试，所以不能算已证）。分类脚本留在 `docs/column/tools/.tmp-meta-classify.mjs`，跑通后可考虑收成正经的 `scan-*.mjs` 工具。**当晚两步都做完并跑过了**：① 模型补格——`MetaType.exp`（`shared.ts:10`）+ `register.ts:69` 的 `addComponent({ export: item.exp ?? 'default' })` + resolver 交给 unplugin 的 `ImportInfo.name`（`auto-import-resolver/src/index.ts:43`），27 条子组件按父目录重登记、四条 `Tab*` 改成真实存在的 `TabPane`；② 删虚构——25 条从 `components` 删除（判据：包根生成物 `src/components.ts` 里 `grep` 零命中），`directives`/`composables` 两组整组清空，`Popconfirm` 保留组件、摘掉 `use: { as: 'ConfirmationService' }`。实测：`KNOWN_BAD` 已空、两个断言皆绿（= 每条 `from` 都能落到真实子入口）；`npx nuxi dev` 的报错从 `Missing "./config"` + `Missing "./autocomplete"` 变成 `Missing "./confirmationservice"` + `Missing "./fluid"`（前两条确被修掉，后两条正是当时未删的虚构条目，删完后应清零——下次复跑核）。

   - **Nuxt 链端到端跑通（2026-09-30，任务 #30 收尾）**：`packages/nuxt-module/playground` 终于能起来并渲染。清掉的三批拦路石：① `metadata` 的 `from` 失配（#29，本轮已修）；② `registerConfig` 指向不存在的 `xiaoye-ui/config`（改成包根）；③ playground 自己的 `app.vue:17` import 了深路径 `xiaoye-ui/notification/notification`（`exports` 里只有 `./notification`，改成 `xiaoye-ui/notification`）。另有一处本机环境问题与本仓无关：Nuxt 内部虚拟模块 `#app-manifest` 解析失败，已在 `playground/nuxt.config.ts` 用 `experimental: { appManifest: false }` 跳过（带注释说明原因）。**实测证据**：`npx nuxi dev` 起服务后 `curl http://localhost:3334/` 得 200 / 53159 字节，日志 `ERROR` 计数 **0**；`<head>` 里 4 个带 `data-css-hash` 的 `<style>` 分别是 `.xy-panel`(5289)、`.xy-btn`(23513)、`.xy-wave`、基础链接样式（正是 `app.vue` 渲染的 Panel/Button），另有 `id="xy-global-theme-variables"` 与 `data-theme="light"`。→ 任务 #27 的「组件级样式 SSR 注入」从「机制已测、端到端未通」升级为**端到端已证**；#28/#29 的修复在真实构建里被复验（`Missing "./…" specifier` 一族全消失）。探针文件（`.nuxt-dev*.log`/`.ssr*.html`/`.tmp-meta-classify.mjs`）已删；playground 被 curl 过的那次服务进程也已停。

   - **交接（2026-09-30）**：用户决定把剩余问题交给其他 AI 继续，根目录新增 **`HANDOFF.md`**（含：硬约束「本地不提交/别动 .gitignore/别用 git 恢复到干净状态」、仓库当前绿基线、已完成清单与证据、**半成品与未解异常**、剩余待办 #33–#38 的逐条修法建议、门禁命令与本机 8 条坑、用户偏好、关键文件索引）。**交接时的实测基线**：主库全量单测 159 文件 / 1368 通过 + 33 skipped（其中 1 条是下面这条），`pnpm typecheck` 与改动文件的 eslint 均无报错；专栏门禁在上一轮为 board 144/144、引用 33982 条 0 问题。**交接点上的唯一未解异常（任务 #32）**：`chart` 的取消标志已落地（`initToken` + `unmounted`，卸载后不发 loaded 已验），但「同一拍连调两次 `reinit()`」的用例观测到 `built` 不涨而 `loaded` +1，即那轮回调未构造却仍 `emit('loaded', chart)`；已排除 mock 泄漏（getter 形状 mock 会在同 tick 二次 import 时漏回真实 chart.js，换普通 mock 后现象不变），该用例已 `it.skip` 并在 `packages/xiaoye-ui/src/chart/cancel.test.js` 顶部写明已排除方向与待查方向。**本条与 HANDOFF.md §4 是同一份信息的两个位置，改完请双删。**

   - **交接轮 #32–#38 全部收口（2026-09-30）**：按 HANDOFF.md 清单七条全做（难度递进 #32→#33→#34→#35→#37→#36→#38），逐条证据如下。
     - **#32 chart「未解异常」根因闭环**：不是产品 bug，是 **vitest mock 竞态**——同一 tick 内两次 `import('chart.js/auto')` 时，第二次动态 import 会漏回真实 chart.js（stderr 出现真实 `Chart.tsx` 栈帧）。修法：`Chart.tsx` 末尾新增 `loadChartModule()`（promise 缓存，失败时清缓存可重试），`initChart` 改走它；`cancel.test.js` 删 `it.skip` 转正 2 条用例（同拍两次 reinit 断 `built+1 / loaded+1 / destroy+1`），判别性实测：摘掉 `initToken` 守卫用例变红。**交接条目里的未解异常至此双删成立**（HANDOFF.md §4 未动，由后续维护者清）。
     - **#33 Portal 空转**：`Portal.tsx` 的 `wrapSSR` 调用是恒等函数空转（本仓 `wrapSSR` 直接 `return node`），改为只 `useStyle(prefixCls)` 做样式注册、两处渲染不再包 `wrapSSR(...)`；`portal/style/index.ts` 注释写明空样式产出、hashId 无处安放的原因。行号零位移（仍 43 行），C12-06 的 48 处引用无恙。
     - **#34 hourStep 规范化**：`vc-picker/utils/timeUtil.ts` 新增 `isValidStep`/`normalizeStep`（整数、>0、整除上限），`PickerPanel.tsx:158-160` 三个 computed 改用 `isValidStep`，`TimeBody.tsx` 三处列读取点统一 `normalizeStep(props.xStep, 24/60)`——修掉「warning 与行为分叉」「Now 按 1、列表按 7」两处口径分裂。**收尾时补掉一处遗漏**：分钟列 `:183` 初版仍是 `props.minuteStep ?? 1`，本轮补成 `normalizeStep` 后 `src/time-picker` 9 条用例全绿。
     - **#35 useComponentProps 判据**：原实现用 `props[key] !== undefined` 判「显式传入」，但 `initDefaultProps` 原地填默认值后该条件恒真、注入值被默认值盖掉（潜伏缺陷，唯一消费点 `contentType` 恰为 `undefined` 故未发作）。重写为读 `getCurrentInstance().vnode.props`（兼容 kebab-case），优先级收敛为**显式 > 注入 > 默认**；新增 `_util/hooks/useComponentProps.test.tsx` 4 条。
     - **#37 nuxt-module 依赖声明**：`runtime/plugin.server.ts` 运行时 import `@xiaoye-ui/core/config` 但 `dependencies` 没声明。补 `"@xiaoye-ui/core": "workspace:*"` 进 dependencies 与 `build.externals`，锁文件同步（用户已许可 `pnpm install`；本机 sandbox 对无关包 symlink 误拦，手工补建了 `node_modules/@xiaoye-ui/core → ../../../core/dist` 的等价 workspace 链接）。验证：根 `pnpm typecheck` 全部包 Done，`pnpm --filter @xiaoye-ui/nuxt-module build` 成功（dist 13.4 kB）。构建流程 `updatePackageJson` 混入的 version/repository/bugs 噪音已回退，diff 只剩两处预期改动。
     - **#36 `_util/components/` 副本**：`_util/index.ts` 的 `export * from './components'` 改为逐文件指向根级真实现（8 项 + transition 具名导出），副本目录按用户判断**保留但标废弃**——`_util/components/index.ts` 头部加「已废弃、勿改、后续版本整目录删除」注释；副本已相对根级漂移（如 PortalWrapper 缺 autoLock 修复），现为孤立不可达。
     - **#38 两 Group 值语义收敛（本轮最大件）**：探针实测钉死 Radio.Group 非受控坏掉的根因（`'value' in props` 在 Vue 3 下恒真）。新建 `_util/hooks/useGroupValue.ts` 共享内核三件——`useGroupValue`（受控/非受控，判据 `props.value !== undefined`，带 `initialValue`/`normalize`/`onSync` 钩子）、`useValueRegistry`（Checkbox 侧子项注册表，Symbol 信号位机制原样搬入）、`useEmitGuard`（Radio 侧重入闸，lock 置位 + nextTick 自动解、受控写回经 onSync 提前解锁）。`radio/Group.tsx`（151 行）与 `checkbox/Group.tsx`（123 行）重构为消费点。测试：既有 29 条全绿；新增 `useGroupValue.test.tsx` 4 条内核单测 + `radio/group.test.js:242/:275`（非受控点击推进、受控跟随 props，**前者实测在旧判据下必红**，判别性成立）+ `checkbox/group.test.js` 补「v-if 摘子项后值不被静默删除」判别用例。
     - **验证基线**：全量单测 **1377 通过 / 4 失败**（失败全在 `markdown-editor`，另 `tests/index.test.js` beforeAll 超时——两者均为全量并发负载脆性，单跑通过，与本次改动无关）；`pnpm typecheck` 全绿；`verify-refs` 默认模式 160 篇 31538 条 0 问题。
     - **专栏侧连带修订（13 处摘录失效全部改到位）**：`I13`（checkbox 手写点改内核口径）、`I07` 与 `C05-07`（step 校验改 `isValidStep`/`normalizeStep` 口径、坑 5/坑 2 标记已修复）、`C04-00`（拼法 5 标记移除并补结案、mermaid 与守卫叙事改内核口径、坑 5 注册表引用搬迁）、`C04-03`（注册表/`toggleOption` 摘录与行号搬迁到消费点+内核双摘）、`C04-04`（论点 3 整段改「已修复并收敛」、两处 ⚠️ 悬置升级为 ✅ 结案、测试现状补 `:242`/`:275`）。另顺手修正 `C05-07`/`I07` 中「分钟列原样读 step」的旧口径（源码本轮已补齐）。
