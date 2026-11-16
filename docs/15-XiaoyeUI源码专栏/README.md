# XiaoyeUI 源码专栏

面向**要改这套源码的人**的维护者原理手册：讲架构分层、模块边界、状态如何流动、改哪一行会炸。
它不重复 [apps/docs](../apps/docs) 那 98 篇用法手册——那 98 篇回答"怎么用"，本专栏回答"为什么这样设计 + 源码怎么实现 + 改动要注意什么"。

> **落点状态**：本目录被 `.gitignore` 显式排除（`.gitignore:89`），**只存在于本地、不进版本控制**。
> 因此别用 `git status` 自查本目录的产物（恒为空），用 `ls docs/column/**` 或直接读文件。

## 进度

| 状态 | 篇数 |
| --- | --- |
| 已完成 | 132 |
| 已审（样稿） | 1 |
| 已审（样稿，前置未写见上方偏差说明） | 1 |
| **合计** | **134** |

已落盘 134 篇。每篇的达标判据由脚本机器校验：

```bash
node docs/column/tools/verify-refs.mjs --excerpt   # 每条 file:line 是否真存在、摘录是否与标注行吻合
node docs/column/tools/check-doc.mjs              # 骨架完整性 + 篇幅/引用密度 + 禁止项
node docs/column/tools/board.mjs                  # 全队列"落盘且达标"一览
node docs/column/tools/check-guide.mjs            # 15 篇深导览（选型表 + 坑索引 + 编号真实）
```

## 怎么读

1. **先读 `01-architecture`**：包拓扑 → 生成物契约 → Token 派生 → 样式引擎 → 注入链 → 交互基座 → 消费侧集成。这一层是后面所有篇的词汇表。
2. **再读 `02-infrastructure`**：某个基座的深读（vc-align 定位、vc-trigger 时序、table-core 状态机、虚拟化、motion…）。
3. **`03-components` 按需查**：12 个类别，每类一篇 `*-00-overview.md` 横写（该类的共性抽象与近义组件选型），再逐组件一篇深读。
4. 每篇结构固定为七段（职责与边界 → 源码地图 → 架构与数据流 → 核心机制精读 → 对外契约 → 设计取舍 → 坑与改动指南）+ 附「三条可证伪检查点」。**只想解决具体问题就直奔第七段；想建立心智模型就读第三、四段。**
5. **每个目录另有一篇「深导览」**（`导览.md`，全书入口是 [总导览.md](./总导览.md)）：不讲机制，只做跨篇路由——近义组件选型表 + 全类坑索引（症状 → 哪一篇的坑 N）+ 改动前最小阅读集。**第一次进某个类别先读它，能省掉在十几篇里翻的时间。**

## 01-architecture（8 篇）

架构与工程总览，专栏的词汇表。

> 深导览（选型表 + 坑索引）：[01-architecture/导览.md](./01-architecture/导览.md)

- [monorepo 拓扑与发布链路](./01-architecture/01-monorepo-topology-拓扑与发布链路.md) — `A01`
- [组件目录契约与 `gen:entries` 生成物链路](./01-architecture/02-entry-generation-组件目录契约与生成物链路.md) — `A02`
- [Design Token 四层体系](./01-architecture/03-design-token-四层体系.md) — `A03`
- [cssinjs 样式引擎与 SSR 注水](./01-architecture/04-cssinjs-engine-样式引擎与SSR注水.md) — `A04`
- [ConfigProvider 注入链与 Size/Disabled Context](./01-architecture/05-config-provider-injection-注入链.md) — `A05`
- [Props 体系与类型工具](./01-architecture/06-props-system-体系与类型工具.md) — `A06`
- [交互基础设施总览：一个浮层是怎么拼起来的](./01-architecture/07-overlay-infrastructure-交互基础设施总览一个浮层是怎么拼起来.md) — `A07`
- [消费侧集成：自动导入与文档生成链](./01-architecture/08-consumer-integration-消费侧集成自动导入与文档生成链.md) — `A08`

## 02-infrastructure（16 篇）

基座模块深读。

> 深导览（选型表 + 坑索引）：[02-infrastructure/导览.md](./02-infrastructure/导览.md)

- [vc-align 定位求解与碰撞检测](./02-infrastructure/01-vc-align-定位求解与碰撞检测.md) — `I01`
- [vc-trigger 弹出时序与事件穿透](./02-infrastructure/02-vc-trigger-弹出时序与事件穿透.md) — `I02`
- [vc-util 工具层](./02-infrastructure/03-vc-util-工具层.md) — `I03`
- [输入基座：vc-input 与 BaseInput](./02-infrastructure/04-input-base-输入基座vc-input.md) — `I04`
- [vc-table 渲染架构](./02-infrastructure/05-vc-table-architecture-渲染架构.md) — `I05`
- [table-core 状态机](./02-infrastructure/06-table-core-state-machine-状态机.md) — `I06`
- [日期计算内核](./02-infrastructure/7-date-kernel-日期计算内核.md) — `I07`
- [虚拟化双实现：vc-virtual-list 与 virtual-scroller](./02-infrastructure/8-virtualization-虚拟化双实现vc-virtual.md) — `I08`
- [动画与 motion 体系](./02-infrastructure/9-motion-system-动画与motion体系.md) — `I09`
- [z-index 层级编排](./02-infrastructure/10-zindex-orchestration-层级编排.md) — `I10`
- [多语言体系](./02-infrastructure/11-locale-system-多语言体系.md) — `I11`
- [校验适配层 resolvers](./02-infrastructure/12-validation-resolvers-校验适配层.md) — `I12`
- [响应式内核 hooks](./02-infrastructure/13-reactivity-hooks-响应式内核hooks.md) — `I13`
- [运行时约束与静态检查](./02-infrastructure/14-runtime-constraints-运行时约束与静态检查.md) — `I14`
- [icons 包生成链与兼容层](./02-infrastructure/15-icons-package-包生成链与兼容层.md) — `I15`
- [core / utils / metadata 三包的分工](./02-infrastructure/16-core-utils-metadata-三包的分工.md) — `I16`

## 03-components（110 篇：12 类横写 + 98 组件）

### C01 通用基础（7 篇）

> 深导览（选型表 + 坑索引）：[03-components/01-general/导览.md](./03-components/01-general/导览.md)

- [类横写：button/icon/tag/chips/badge 的职责切分](./03-components/01-general/C01-00-overview-类横写.md) — `C01-00`
- [Button 按钮](./03-components/01-general/C01-01-button-按钮.md) — `C01-01`
- [Icon 图标](./03-components/01-general/C01-02-icon-图标.md) — `C01-02`
- [Tag 标签](./03-components/01-general/C01-03-tag-标签.md) — `C01-03`
- [Chips 选项 Chips](./03-components/01-general/C01-04-chips-选项Chips.md) — `C01-04`
- [Badge 徽标](./03-components/01-general/C01-05-badge-徽标.md) — `C01-05`
- [Empty 空状态](./03-components/01-general/C01-07-empty-空状态.md) — `C01-07`

### C02 布局与容器（14 篇）

> 深导览（选型表 + 坑索引）：[03-components/02-layout/导览.md](./03-components/02-layout/导览.md)

- [类横写：栅格/flex/space 三代布局的取舍](./03-components/02-layout/C02-00-overview-类横写.md) — `C02-00`
- [Grid 栅格](./03-components/02-layout/C02-01-grid-栅格.md) — `C02-01`
- [Flex 弹性布局](./03-components/02-layout/C02-02-flex-弹性布局.md) — `C02-02`
- [Layout 布局](./03-components/02-layout/C02-03-layout-布局.md) — `C02-03`
- [Space 间距](./03-components/02-layout/C02-04-space-间距.md) — `C02-04`
- [Divider 分割线](./03-components/02-layout/C02-05-divider-分割线.md) — `C02-05`
- [Splitter 分隔面板](./03-components/02-layout/C02-06-splitter-分隔面板.md) — `C02-06`
- [Card 卡片](./03-components/02-layout/C02-07-card-卡片.md) — `C02-07`
- [Panel 面板](./03-components/02-layout/C02-08-panel-面板.md) — `C02-08`
- [Collapse 折叠面板](./03-components/02-layout/C02-09-collapse-折叠面板.md) — `C02-09`
- [BlockUI 区块容器](./03-components/02-layout/C02-10-block-ui-区块容器.md) — `C02-10`
- [ScrollPanel 滚动面板](./03-components/02-layout/C02-11-scroll-panel-滚动面板.md) — `C02-11`
- [Toolbar 工具栏](./03-components/02-layout/C02-13-toolbar-工具栏.md) — `C02-13`
- [Fieldset 字段集](./03-components/02-layout/C02-14-fieldset-字段集.md) — `C02-14`

### C03 导航（14 篇）

> 深导览（选型表 + 坑索引）：[03-components/03-navigation/导览.md](./03-components/03-navigation/导览.md)

- [类横写：menu/tabs/steps/breadcrumb 的选中态模型](./03-components/03-navigation/C03-00-overview-类横写.md) — `C03-00`
- [Menu 导航菜单](./03-components/03-navigation/C03-01-menu-导航菜单.md) — `C03-01`
- [MegaMenu 大图菜单](./03-components/03-navigation/C03-02-mega-menu-大图菜单.md) — `C03-02`
- [PanelMenu 面板菜单](./03-components/03-navigation/C03-03-panel-menu-面板菜单.md) — `C03-03`
- [Breadcrumb 面包屑](./03-components/03-navigation/C03-04-breadcrumb-面包屑.md) — `C03-04`
- [Tabs 标签页](./03-components/03-navigation/C03-05-tabs-标签页.md) — `C03-05`
- [Steps 步骤条](./03-components/03-navigation/C03-06-steps-步骤条.md) — `C03-06`
- [Pagination 分页](./03-components/03-navigation/C03-07-pagination-分页.md) — `C03-07`
- [Dropdown 下拉菜单](./03-components/03-navigation/C03-08-dropdown-下拉菜单.md) — `C03-08`
- [ContextMenu 右键菜单](./03-components/03-navigation/C03-09-context-menu-右键菜单.md) — `C03-09`
- [Anchor 锚点](./03-components/03-navigation/C03-10-anchor-锚点.md) — `C03-10`
- [Affix 固钉](./03-components/03-navigation/C03-11-affix-固钉.md) — `C03-11`
- [BackTop 返回顶部](./03-components/03-navigation/C03-12-back-top-返回顶部.md) — `C03-12`
- [Tour 引导](./03-components/03-navigation/C03-13-tour-引导.md) — `C03-13`

### C04 基础表单控件（10 篇）

> 深导览（选型表 + 坑索引）：[03-components/04-form-controls/导览.md](./03-components/04-form-controls/导览.md)

- [类横写：受控/非受控与 `useMergedState` 的一致实现](./03-components/04-form-controls/C04-00-overview-类横写.md) — `C04-00`
- [Input 输入框](./03-components/04-form-controls/C04-01-input-输入框.md) — `C04-01`
- [InputNumber 数字输入框](./03-components/04-form-controls/C04-02-input-number-数字输入框.md) — `C04-02`
- [Checkbox 多选框](./03-components/04-form-controls/C04-03-checkbox-多选框.md) — `C04-03`
- [Radio 单选框](./03-components/04-form-controls/C04-04-radio-单选框.md) — `C04-04`
- [Switch 开关](./03-components/04-form-controls/C04-05-switch-开关.md) — `C04-05`
- [Segmented 分段选择](./03-components/04-form-controls/C04-06-segmented-分段选择.md) — `C04-06`
- [Slider 滑动条](./03-components/04-form-controls/C04-07-slider-滑动条.md) — `C04-07`
- [Rate 评分](./03-components/04-form-controls/C04-08-rate-评分.md) — `C04-08`
- [ColorPicker 颜色选择](./03-components/04-form-controls/C04-10-color-picker-颜色选择.md) — `C04-10`

### C05 选择与日期（9 篇）

> 深导览（选型表 + 坑索引）：[03-components/05-picker/导览.md](./03-components/05-picker/导览.md)

- [类横写：select/cascader/tree-select 共用的选项流水线](./03-components/05-picker/C05-00-overview-类横写.md) — `C05-00`
- [Select 选择器](./03-components/05-picker/C05-01-select-选择器.md) — `C05-01`
- [AutoComplete 自动完成](./03-components/05-picker/C05-02-auto-complete-自动完成.md) — `C05-02`
- [Cascader 级联选择](./03-components/05-picker/C05-03-cascader-级联选择.md) — `C05-03`
- [TreeSelect 树选择](./03-components/05-picker/C05-04-tree-select-树选择.md) — `C05-04`
- [Transfer 穿梭框](./03-components/05-picker/C05-05-transfer-穿梭框.md) — `C05-05`
- [DatePicker 日期选择](./03-components/05-picker/C05-06-date-picker-日期选择.md) — `C05-06`
- [TimePicker 时间选择](./03-components/05-picker/C05-07-time-picker-时间选择.md) — `C05-07`
- [Calendar 日历](./03-components/05-picker/C05-08-calendar-日历.md) — `C05-08`

### C06 表单编排与编辑（9 篇）

> 深导览（选型表 + 坑索引）：[03-components/06-form-editor/导览.md](./03-components/06-form-editor/导览.md)

- [类横写：Form 的字段注册、校验与上下文下发](./03-components/06-form-editor/C06-00-overview-类横写.md) — `C06-00`
- [Form 表单](./03-components/06-form-editor/C06-01-form-表单.md) — `C06-01`
- [FormList 列表表单](./03-components/06-form-editor/C06-02-form-list-列表表单.md) — `C06-02`
- [Upload 上传](./03-components/06-form-editor/C06-03-upload-上传.md) — `C06-03`
- [Mentions 提及](./03-components/06-form-editor/C06-04-mentions-提.md) — `C06-04`
- [InlineEdit 行内编辑](./03-components/06-form-editor/C06-05-inline-edit-行内编辑.md) — `C06-05`
- [Inplace 原地编辑](./03-components/06-form-editor/C06-06-inplace-原地编辑.md) — `C06-06`
- [KeyFilter 关键词过滤](./03-components/06-form-editor/C06-07-key-filter-关键词过滤.md) — `C06-07`
- [SortableList 可排序列表](./03-components/06-form-editor/C06-08-sortable-list-可排序列表.md) — `C06-08`

### C07 反馈与浮层（10 篇）

> 深导览（选型表 + 坑索引）：[03-components/07-feedback/导览.md](./03-components/07-feedback/导览.md)

- [类横写：Modal/Drawer/Popover/Tooltip 的浮层生命周期归一](./03-components/07-feedback/C07-00-overview-类横写.md) — `C07-00`
- [Modal 对话框](./03-components/07-feedback/C07-01-modal-对话框.md) — `C07-01`
- [Drawer 抽屉](./03-components/07-feedback/C07-02-drawer-抽屉.md) — `C07-02`
- [Tooltip 文字提示](./03-components/07-feedback/C07-03-tooltip-文字提示.md) — `C07-03`
- [Popover 气泡卡片](./03-components/07-feedback/C07-04-popover-气泡卡片.md) — `C07-04`
- [Popconfirm 气泡确认](./03-components/07-feedback/C07-05-popconfirm-气泡确认.md) — `C07-05`
- [Message 全局消息](./03-components/07-feedback/C07-06-message-全局消息.md) — `C07-06`
- [Notification 通知](./03-components/07-feedback/C07-07-notification-通知.md) — `C07-07`
- [Alert 警告提示](./03-components/07-feedback/C07-08-alert-警告提示.md) — `C07-08`
- [Result 结果](./03-components/07-feedback/C07-09-result-结果.md) — `C07-09`

### C08 表格与虚拟化（7 篇）

> 深导览（选型表 + 坑索引）：[03-components/08-table/导览.md](./03-components/08-table/导览.md)

- [类横写：table / data-table / tree-table 三代表格的分层与选型](./03-components/08-table/C08-00-overview-类横写.md) — `C08-00`
- [Table 表格](./03-components/08-table/C08-01-table-表格.md) — `C08-01`
- [DataTable 数据表格](./03-components/08-table/C08-02-data-table-数据表格.md) — `C08-02`
- [TreeTable 树表格](./03-components/08-table/C08-03-tree-table-树表格.md) — `C08-03`
- [List 列表](./03-components/08-table/C08-05-list-列表.md) — `C08-05`
- [VirtualList 虚拟列表](./03-components/08-table/C08-06-virtual-list-虚拟列表.md) — `C08-06`
- [VirtualScroller 虚拟滚动](./03-components/08-table/C08-07-virtual-scroller-虚拟滚动.md) — `C08-07`

### C09 树与结构可视化（3 篇）

> 深导览（选型表 + 坑索引）：[03-components/09-tree/导览.md](./03-components/09-tree/导览.md)

- [类横写：树数据的三种可视化形态](./03-components/09-tree/C09-00-overview-类横写.md) — `C09-00`
- [Tree 树形控件](./03-components/09-tree/C09-01-tree-树形控件.md) — `C09-01`
- [DirectoryTree 目录树](./03-components/09-tree/C09-02-directory-tree-目录树.md) — `C09-02`

### C10 媒体与内容展示（9 篇）

> 深导览（选型表 + 坑索引）：[03-components/10-media/导览.md](./03-components/10-media/导览.md)

- [类横写：图片组的预览与对比关系](./03-components/10-media/C10-00-overview-类横写.md) — `C10-00`
- [Image 图片](./03-components/10-media/C10-01-image-图片.md) — `C10-01`
- [ImageCompare 图片对比](./03-components/10-media/C10-02-image-compare-图片对比.md) — `C10-02`
- [Carousel 走马灯](./03-components/10-media/C10-04-carousel-走马灯.md) — `C10-04`
- [Avatar 头像](./03-components/10-media/C10-05-avatar-头像.md) — `C10-05`
- [Watermark 水印](./03-components/10-media/C10-06-watermark-水印.md) — `C10-06`
- [QRCode 二维码](./03-components/10-media/C10-07-qrcode-二维码.md) — `C10-07`
- [Chart 图表](./03-components/10-media/C10-08-chart-图表.md) — `C10-08`
- [Comment 评论](./03-components/10-media/C10-09-comment-评论.md) — `C10-09`

### C11 状态与信息呈现（9 篇）

> 深导览（选型表 + 坑索引）：[03-components/11-status/导览.md](./03-components/11-status/导览.md)

- [类横写：占位、进度与统计三类的更新频率取舍](./03-components/11-status/C11-00-overview-类横写.md) — `C11-00`
- [Spin 加载中](./03-components/11-status/C11-01-spin-加载中.md) — `C11-01`
- [Progress 进度](./03-components/11-status/C11-02-progress-进度.md) — `C11-02`
- [Skeleton 骨架屏](./03-components/11-status/C11-03-skeleton-骨架屏.md) — `C11-03`
- [Statistic 统计数值](./03-components/11-status/C11-04-statistic-统计数值.md) — `C11-04`
- [MeterGroup 仪表组](./03-components/11-status/C11-05-meter-group-仪表组.md) — `C11-05`
- [Timeline 时间轴](./03-components/11-status/C11-06-timeline-时间轴.md) — `C11-06`
- [Descriptions 描述列表](./03-components/11-status/C11-07-descriptions-描述列表.md) — `C11-07`
- [Typography 排版](./03-components/11-status/C11-08-typography-排版.md) — `C11-08`

### C12 全局与应用级（9 篇）

> 深导览（选型表 + 坑索引）：[03-components/12-global/导览.md](./03-components/12-global/导览.md)

- [类横写：应用级容器与全局能力（App/Portal/FocusTrap/Ripple）](./03-components/12-global/C12-00-overview-类横写.md) — `C12-00`
- [App 应用容器](./03-components/12-global/C12-01-app-应用容器.md) — `C12-01`
- [ConfigProvider 全局配置](./03-components/12-global/C12-02-config-provider-全局配置.md) — `C12-02`
- [DarkModeToggle 暗色切换](./03-components/12-global/C12-03-dark-mode-toggle-暗色切换.md) — `C12-03`
- [FloatButton 浮动按钮](./03-components/12-global/C12-04-float-button-浮动按钮.md) — `C12-04`
- [Ripple 涟漪](./03-components/12-global/C12-05-ripple-涟漪.md) — `C12-05`
- [Portal 传送门](./03-components/12-global/C12-06-portal-传送门.md) — `C12-06`
- [FocusTrap 焦点陷阱](./03-components/12-global/C12-07-focus-trap-焦点陷阱.md) — `C12-07`
- [SplitButton 分裂按钮](./03-components/12-global/C12-08-split-button-分裂按钮.md) — `C12-08`

## 维护这份专栏

- 写作合同（红线、六步流程、七段骨架、硬指标、机器校验）：[PROMPT.md](./PROMPT.md)
- 全书队列与主题边界（谁负责什么、避免两篇重复论证）：[OUTLINE.md](./OUTLINE.md)
- 导览写法合同（第 5 道门）：[tools/GUIDE.md](./tools/GUIDE.md) 与 `node docs/column/tools/check-guide.mjs`
- 派工与续写：`node docs/column/tools/make-brief.mjs <编号> [slug]` / `--resume <编号>`
- 队列状态回填：`node docs/column/tools/set-status.mjs <编号>=已完成`，`--show` 看分布

索引由 `docs/column/tools/gen-index.mjs` 生成，请勿手工编辑本文件。
