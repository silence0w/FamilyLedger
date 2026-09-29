# 家庭账本（FamilyLedger）

家庭记账本 Android App —— 由 `ai_temp/家庭记账本.html` 手机版 100% 迁移而来，界面、配色、交互与功能逻辑与 HTML 版保持一致，并补充了原 HTML 没有的**本地提醒（App 内）/ 文件导入导出**能力。

- 包名：`com.familyledger.app`
- 版本：`1.0.0`（versionCode 100）
- 技术栈：uni-app（Vue 3）+ HTML5+ 原生能力（plus.sqlite / plus.io / plus.android）

---

## 一、功能清单

### 1. 四个底部 Tab（与 HTML 手机版一致）
| Tab | 内容 |
| --- | --- |
| 总览 | 本月收入 / 支出 / 结余、账户余额、支出分类环形占比图、信用卡还款概览（顶部「总览」大标题已按用户要求删除，只保留一行范围说明） |
| 明细 | 流水列表（按日期分组）、按月份 / 类型 / 分类筛选、新增 / 编辑 / 删除 |
| 借还 | 借款 & 还款记录管理、按人汇总剩余未还、新增借款 / 登记还款 / 删除 |
| 纪念日 | 生日、纪念日等倒计时卡片（支持农历），新增 / 编辑 / 删除 |

> **总览 4 个统计卡片已瘦身（2026-09-25）**：内边距 `14/15px → 9/12px`、主数值字号
> `19px → 15.5px`、标签 `12px → 11px`、「待收 / 待还」`17px → 13px` 并禁止换行、
> 卡片间距 `10 → 8px`、右上装饰圆 `86 → 58px`（用户反馈原来的框太大、文字也大）。

### 2. 收支记录
- 收入 / 支出切换、金额、分类（含「家庭」分类）、账户、日期、备注
- 账户分为三类：`cash` 现金、`debit` 储蓄类、`credit` 信用类（带账单日 / 还款日）
- 选「信用卡」入口 → 选择具体卡片 → 账单日 / 还款日由「设置 → 账户管理」中该卡的默认值统一决定（收支记录编辑页不再单独编辑账单日 / 还款日，避免双入口不一致；还款提醒仍按账户默认账单日 / 还款日推算）

### 3. 信用卡账单
- 自动根据账单日 / 还款日推算本期账单区间与到期还款日
- 支持多张卡片，发卡行从 18 家主流银行选择
- 信用卡还款提醒（详见「提醒机制」）

### 4. 借还管理
- 借出 / 借入、借款人、金额、日期、备注
- 多次还款登记，自动计算剩余未还金额
- 按借款人分组汇总
- **卡片布局（2026-09-25 瘦身）**：删除左侧圆形头像，收起状态固定三行 ——
  ① 姓名 + 应收 / 应付徽标 …… **最右侧「剩余：¥x.xx」**（未结清按应收绿 / 应付红着色，结清挂「已结清」徽标）；
  ② 总额 ¥x.xx、已收 / 已还 ¥x.xx；
  ③ 借款日期：xxx、约定还款日：xxx（**没有约定还款日就不显示**）。
  备注移到**点开后的展开区**（进度条 + 追加 / 收回记录 + 再借一笔 / 修改 / 删除 / 收回）；
  **创建 / 修改时间不再在列表页显示**，只在「修改借款」编辑页底部看（2026-09-25 收敛）。
- **切换即复位（2026-09-25 新增）**：从其它 Tab 点「借还」时，自动折叠所有已展开的明细、
  筛选复位为「全部」，并回到页面顶部 —— 不再残留上一次的展开与滚动位置。
- **顶部搜索框支持借还并自动跳页（2026-09-25 新增）**：姓名或机构名 / 备注 / 借款日期 /
  约定还款日 / 应收应付 / 金额 / 追加与还款子记录备注；输入后按真实命中结果自动进入借还页。

### 5. 纪念日
- 支持**公历 / 农历**两种日期类型（内置 1900–2100 农历换算表）
- 自动计算下次到期日与倒计时天数，按临近程度着色
- **卡片布局（2026-09-25 瘦身）**：删除左侧方形图标，只保留 —— 第一行**名称**、
  第二行**备注**（没有备注整行不渲染）；右侧区域保持原样（倒计时文字 + 下次日期 + 编辑 / 删除）。
  原先铺开的「日期 / 重复 / 创建时间 / 修改时间」多行文字全部移除，**创建 / 修改时间只在编辑页看**。
- **顶部搜索框支持纪念日并自动跳页（2026-09-25 新增）**：名称 / 备注 / 日期文字（含农历）/
  重复方式；输入后按真实命中结果自动进入纪念日页。

### 6. 设置页
- 数据管理（导入导出已合并为两个入口）：**「导出 Excel/JSON」→ 弹窗选择格式**（导出 Excel / 导出 JSON）、**「导入 Excel/JSON」**（统一文件选择），
  两个按钮均为**红底白字椭圆**同款样式（2026-09-25 按需求把导入按钮由白底描边改为红底）。
  点击时自动检查「所有文件访问权限」，未授权先引导授权。
  - 导出 Excel 与导出 JSON **内容完全一致**（同一份完整备份）：`.xlsx` 含 8 个工作表——
    「收支明细 / 借款记录 / 还款记录 / 手动账户 / 每日记账提醒 / 还款提醒 / 纪念日提醒 / 纪念日」；
    `.json` 为等价的纯文本完整备份（含收支记录、手动添加的账户、三类提醒设置、纪念日信息、借款记录）；
  - 两者写入同一目录 `Download/家庭账本`，文件名带精确时间戳；
  - 导入为**整体替换**：JSON 与 Excel/CSV 均覆盖当前全部数据（内置 7 个独立账户始终保留）；
    Excel 文件若只含部分板块（如旧版仅「收支 / 借款」），则**仅替换它所含板块**，其余数据保留；
  - **防呆**：导出前若当前没有任何数据（无收支 / 借款 / 手动账户 / 纪念日，且三类提醒均未开启）则拦截并提示「暂无数据」；
    导入解析后若结果为空同样拦截并提示「导入的数据为空」。
- **账户管理**：入口全部收在标题行右侧（`+ 账户` 弹出窗口添加 / `账户详情` / `⚠️说明`）；其下分两组——
  - **默认账户（7 个内置独立账户，带「独立账户」徽标，与手动账户互不干涉）**：
    现金 / 信用卡 / 银行卡（非信用卡）/ app-支付宝 / app-微信 / app-云闪付 / 其他。
    它们是**真实存在的独立账户**（type=`builtin`），与手动添加的信用卡、银行卡、App 支付**平级**，
    不是虚拟汇总行；启动迁移会把历史同名旧账户转正为内置账户，不会污染手动账户列表。
  - **手动添加的账户**：手动信用卡（名称自动加「信用卡：」前缀，账单日+还款日）、
    手动银行卡（「银行卡（非信用卡）：」前缀，发卡行，无账单日）、
    App支付渠道（先选 App 名称：app-支付宝/微信/云闪付/京东/美团/抖音/滴滴/其他，
    可再填自定义渠道名称，最终名 = App名：渠道名；可选启用账单日+还款日，圆形开关控制）。
- **记一笔「账户 / 支付方式」下拉** = 默认账户（固定顺序在前）+ 手动账户（按名称排序在后）；
  删除旧的「现金 / 花呗」遗留项。
- 总览**「支出渠道排行」**：行内容 = 现金、信用卡（汇总）、银行卡（汇总）、支付宝（汇总）、微信（汇总）、
  云闪付（汇总）、其他，以及所有未归入上述 5 大类目的**手动账户**
  （app-京东 / app-美团 / app-抖音 / app-滴滴 / app-其他 等，**始终列出，无支出则显示 ¥0**，并按名称前缀合并子账户如 app-京东：白条）。
  **展示顺序：全部行按当月支出金额从多到少从上往下排**（0 元渠道沉底；金额相同的保持原有相对顺序），
  不再按固定顺序罗列。
  提供 5 个筛选按钮：**信用卡 / 银行卡 / 支付宝 / 微信 / 云闪付**，
  每个按钮默认显示「汇总」，点击独立切换「汇总 / 明细」（各类目互不影响）。
  某类选「明细」时，该类展开为「默认账户 + 同名前缀的手动账户」逐条列出，其余类目仍保持汇总。
  排序在**「块」**粒度进行 —— 明细模式下同类的「父行 + 子账户行」打包成一个块按合计金额参与排序，
  块内顺序不变，因此父子行不会被金额排序拆散。
- 三种提醒开关与参数配置（开关只保存提醒设置；通知权限仅在首次冷启动统一申请）
- **⚠️说明入口（2026-09-25 新增）**：页面上原本铺开的全部说明文字**移到独立「说明页」**
  （`pages/help/help?topic=…`），设置页只在各区块**标题行最右侧**留一个 `⚠️说明` 胶囊按钮：
  - `data`（数据管理）：Excel / JSON 导出格式、保存目录、导入覆盖风险；
  - `account`（账户管理）：7 个内置独立账户、手动信用卡 / 银行卡 / App 支付的命名与账单规则、
    支出渠道排行规则、为什么设置页只显示 1 个手动账户；
  - `reminder` / `credit` / `anniv`：三类提醒的完整「提醒逻辑」+ 该设置的**创建 / 修改时间**。
  三类提醒区块下方的「提醒逻辑、创建时间、修改时间见右上角「⚠️说明」。」提示行**已按需求删除**
  （2026-09-25），入口本身足够醒目，不再重复铺文字。
- **账户管理改为「小方框 + 账户详情页 + 统一入口」（2026-09-25）**：
  - **默认账户**：只显示**第一排 2 个小方框**「现金」「信用卡」（不再显示「独立账户」徽标，
    也**删除了累计支出**）；
  - **手动添加的账户**：设置页**只显示排序第一的 1 个**（不再显示创建 / 修改时间），并**加方框**显示，
    不再让它像一段悬空文字；
  - **入口统一（本轮）**：原先「默认账户」「手动添加的账户」两行右侧各自的 `详情`、
    以及后一行上的 `⚠️说明` **全部删除**；改由「账户管理」标题行右侧统一提供
    `账户详情` + `+ 账户` + `⚠️说明` 三个按钮；
  - **添加账户改「+ 账户」弹出窗口（2026-09-25 第三轮，用户二改）**：账户管理下方原来平铺的
    「+ 信用卡 / + 银行卡 / + App支付」三个虚线按钮**已删除**，改为标题行右侧的
    **`+ 账户`** 按钮点击后弹出**窗口**（`v-if="showAddMenu"` + `.mask` 遮罩 + `.modal` 底部弹层，
    与「导出 / 导入」弹窗同一套结构），窗口内以三个**红底胶囊列表按钮**
    （`.aam-btn.btn.btn-primary`）展示「+ 信用卡 / + 银行卡 / + App支付」，
    分别进入 `pages/credit-account?kind=credit|bank|app`；点 ✕ / 取消 / 遮罩关闭，选中即先关窗再跳转。
    > 第一版曾做成**内联下拉**（`.add-account-menu`，会撑开页面把「默认账户」往下挤），
    > 按用户要求改为**弹层浮在内容之上**，不再占用页面高度；旧样式已从 `App.vue` 删除；
  - **按钮样式统一为红底椭圆（本轮）**：`+ 账户`、`账户详情` 均为与「导出 Excel/JSON」
    同款的**红底白字椭圆形**按钮（`.btn.btn-primary.acct-row-btn`，高 28px / 圆角 14px，
    仅为适配标题行而收窄尺寸），窄屏放不下时整组自动换行；
  - `账户详情` 进 `pages/accounts/accounts`（7 个默认账户 + 全部手动账户，保留每个账户的
    **编辑 / 删除**），`⚠️说明` 进 `topic=account` 说明页；
    **详情页自身不带任何按钮**（2026-09-25 第四轮）：页内「手动添加的账户」行的 `⚠️说明`
    与底部「返回设置」已删除，返回走顶部导航栏自带箭头；
  - **三类提醒开关上移（2026-09-25 第四轮）**：「开启每日提醒 / 开启还款提醒 / 开启纪念日提醒」
    三个独立开关行删除，开关移入各自标题行右侧、**位于 `⚠️说明` 左边**（`.title-ops`，
    开关缩小为 42×24px），点击逻辑不变；
  - **分组小标题加深（本轮）**：「默认账户（n 个）」「手动添加的账户（n 个）」由原来的
    `12px / #999 / 浅灰竖条` 改为 `13px / 字重 600 / #444 / 红色竖条`，一眼能看出是标题。

> 按需求，**设置页原 HTML 的「通知测试」部分已删除**；「权限与授权」区块也已删除——
> 文件权限改为**导入 / 导出按钮点击时按需检查**。**通知栏提醒已整体移除**（见「提醒机制」），
> App 不再申请通知权限、也不再引导「自启动 / 电池优化」，冷启动不弹任何系统授权框。
> 记账「账户 / 支付方式」下拉 = 固定「现金」+ 这里维护的全部账户（微信 / 支付宝等
> 可用「App支付渠道」自行添加回来）。

### 7. 创建时间 / 修改时间（全实体留痕）
凡是「能新增 / 能编辑」的数据，系统都会自动记录并展示其**创建时间**与**修改时间**，且**导出时一并带上这两个字段**：
- **收支记录**（记一笔 / 编辑）：SQLite `created_at`（即创建时间）+ `modify_time`；编辑时只刷新修改时间、保留原创建时间。
- **借还记录**：借款主记录（`fl_loan`）、借款追加子记录（`fl_loan_addon`）、还款子记录（`fl_loan_repay`）各自带 `create_time` + `modify_time`。
- **纪念日记录**：`fl_anniv` 的 `create_time` + `modify_time`。
- **手动创建的账户**（账户管理的 +信用卡 / +银行卡 / +App支付）：`fl_account` 的 `create_time` + `modify_time`；内置 7 个独立账户首次落库时也会写入（仅用于留痕，不在账户管理列表展示）。
- **三类提醒设置**（每日记账提醒 / 还款提醒 / 纪念日提醒）：`fl_setting` 的 `create_time` + `modify_time`，由 `store.settingMeta` 承载并在设置页展示。
- **时间格式**：`YYYY-MM-DD HH:mm:ss`，**精确到秒**（无浏览器 API，手算避免平台时区差异）。
- **展示位置（2026-09-25 收敛：只留编辑页 + 说明页）**：
  - **编辑页**（收支 / 纪念日 / 借款的新增与编辑、手动账户的新增与编辑）统一在表单底部以只读 `.time-meta` 区块显示（新建记录尚无创建时间，仅在编辑态出现）——**这是唯一「随手可看」的位置**；
  - **设置页**：三类提醒的时间、手动账户的时间不再直接铺在页面上，改为点该区块右侧 `⚠️说明` → 说明页查看；
  - **三个列表页（明细 / 借还 / 纪念日）已全部移除时间显示**：明细行底部的 `.dr-time`、借还展开区的时间行、
    纪念日卡片的时间行都已删除；纪念日卡片原来的「日期 → 重复 → 备注 → 时间」多行文字同步精简为「名称 + 备注」。
- **导出含这两个字段**：导出 JSON 完整备份时，收支 / 账户 / 纪念日 / 借款（含追加、还款子记录）每条均带 `createTime` / `modifyTime`，三类提醒另带 `settingsMeta` 块；**导入整体替换时原样保留原始时间**（不覆盖为导入时刻）。

### 8. 金额显示（统一元角分 / 两位小数）
所有涉及金额的展示位置，一律**固定两位小数（元角分）+ 千分位**：`52` → `¥52.00`、`1234.5` → `¥1,234.50`、`-8.006` → `¥-8.01`。

- **显示层唯一出口**：`common/utils.js` 的 `money()`。总览（收入 / 支出 / 结余 / 待收待还 / 分类与渠道排行 / 环形图）、明细（月度小计与每条金额）、借还（应收应付 / 剩余 / 总额 / 已收已还 / 追加 / 还款记录及每笔后剩余）、还款页、借款编辑页、设置页累计支出、通知文案全部经过它。
- **`money()` 不使用 `toLocaleString`**：安卓 WebView 的 ICU 数据不完整时会**静默忽略** `minimumFractionDigits` / `maximumFractionDigits` 两个 options，把浮点误差原样输出（曾出现结余显示 `¥8708.470000000001`）。现改为纯字符串实现（`round2` → `toFixed(2)` → 手写千分位），任何平台结果一致。
- **数据源头收敛到「分」**：`round2` 覆盖整条聚合链路 —— `index.vue` 的 `sum` / `balance` / `receivable` / `payable` / `loanRecv` / `loanPay` / `expTotal` / `incTotal` / 分类与渠道累加 / 还款后剩余；`domain.js` 的 `repaidOf` / `remainOf` / `creditRepayMap().total` / `loanSummary()`；`settings.vue` 内置账户累计支出。避免 `0.1 + 0.2 = 0.30000000000000004` 这类误差顺链路传播放大。
- **写库同样归一**：`repo.js` 全部金额写入前 `round2`（含 xlsx / JSON 导入路径），保证库内不残留长小数。
- **输入框预填**：还款页与借款编辑页的预填金额改为 `round2(x).toFixed(2)`，不再把浮点尾巴填进输入框；输入框失焦仍由 `normalizeAmount` 归一为两位小数。
- **Excel 导出同步**：`xlsx.js` 新增 `xl/styles.xml`，把三张表的金额列（收支明细 D / 借款金额 E / 还款记录 D）统一挂 numFmt `0.00`，在 Excel / WPS 里同样显示两位小数；单元格底层仍是数值，可正常求和，导入取值不受影响。

---

## 二、目录结构

```
FamilyLedger/
├── App.vue                 全局样式（100% 复刻 HTML 手机版 CSS）+ 启动链
├── main.js                 createSSRApp 入口
├── pages.json              9 个页面路由，全部 navigationStyle: custom
├── manifest.json           包名 / 权限 / Push+SQLite+File+Zip 模块
├── uni.scss                全局 SCSS 变量
├── index.html              H5 壳
├── package.json
├── .gitignore
├── common/                 逻辑层（纯 JS，无 UI 依赖）
│   ├── constants.js        分类 / 账户 / 银行 / 配色 / 默认设置 / 路径常量
│   ├── utils.js            localDate / money / addDays / daysBetween / round2 / normalizeAmount（金额防呆）...
│   ├── lunar.js            农历换算（1900-2100 LUNAR_INFO 表）
│   ├── store.js            Vue3 reactive 全局状态
│   ├── db.js               ★ SQLite 防注入核心：bindParams / sqlLiteral / safeIdent / splitStatements（多语句切分）
│   ├── repo.js             建表 SCHEMA_SQL + 全部 CRUD + loadAll
│   ├── domain.js           calcBillDate / calcRepayDate / annivNextDate / loanSummary
│   ├── platform.js         waitPlusReady() 等待 plus 原生能力就绪（带超时兜底）
│   ├── binary.js           ★ UTF-8 编解码 / 二进制字符串（逻辑层无 TextEncoder 等浏览器 API，自实现）
│   ├── permission.js       仅 ensureAllFilesAccess()（导入 / 导出前按需申请文件权限；不再申请通知 / 自启动 / 电池优化）
│   ├── reminder.js         App 内提醒：冷启动弹窗（每日记账 + 纪念日）collectAlerts / runColdStartAlerts / closeAlerts
│   ├── fileio.js           Download/家庭账本 目录创建与读写（Native.js FileOutputStream 直写 + plus.io 兜底 + plus.zip）
│   ├── xlsx.js             XLSX 生成（UTF-8 自实现 + ZIP stored + CRC32）/ 解析（plus.zip 解压）
├── components/
│   ├── TopBar.vue          顶部标题栏
│   ├── TabBar.vue          底部四 Tab + 中间圆形「+」记一笔按钮（明细与借还之间）
│   ├── PageNav.vue         二级页「< 返回」导航栏
│   ├── AlertPopup.vue      提醒弹窗（显示 5 秒后自动关闭，也可点 X / 「知道了」/ 点空白关闭）
│   └── DonutRing.vue       conic-gradient 环形占比图
└── pages/
    ├── index/index.vue              主页面（四 Tab 全部逻辑）
    ├── settings/settings.vue        设置页（含导入弹窗）
    ├── txn-edit/txn-edit.vue        新增 / 编辑收支（独立页面）
    ├── loan-edit/loan-edit.vue      新增 / 编辑借款（独立页面）
    ├── repay/repay.vue              登记还款（独立页面）
    ├── anniv-edit/anniv-edit.vue    新增 / 编辑纪念日（独立页面）
    ├── credit-account/credit-account.vue  信用卡账户管理（独立页面）
    ├── accounts/accounts.vue        账户详情（7 个默认账户 + 全部手动账户，可编辑 / 删除）
    └── help/help.vue                说明页（data / account / reminder / credit / anniv 五个 topic）
```

> 除提醒弹窗外，**所有新增 / 编辑 / 修改操作均使用独立页面**，左上角 `<` 返回（符合需求第 6 条）。

---

## 三、数据存储

### 数据库
- 名称：`FamilyLedger`
- 路径：`_doc/FamilyLedger.db`（应用私有目录，随 App 卸载清除）

### 数据表
| 表 | 用途 |
| --- | --- |
| `txn` | 收支流水（类型、金额、分类、账户、日期、备注、账单日 / 还款日） |
| `loan` | 借款记录（借款人、方向、金额、日期、备注） |
| `repay` | 还款记录（关联 loan、金额、日期） |
| `anniv` | 纪念日（名称、日期类型公历/农历、日期、备注） |
| `account` | 账户表（名称、类型、发卡行、账单日、还款日） |
| `settings` | 键值对形式的设置（提醒开关、参数、已通知记录） |

> **时间留痕列（本次新增）**：`txn` 表含 `created_at`+`modify_time`；`loan` / `loan_addon` / `loan_repay` / `anniv` / `account` / `settings` 六表均含 `create_time`+`modify_time`。旧库升级时由 `repo.migrateTimestampColumns()` 自动 `ALTER TABLE ADD COLUMN` 补齐，新装则从 `SCHEMA_SQL` 直接建好，无需手动迁移。

### SQL 注入防护（重点）

`plus.sqlite` 的 `executeSql` / `selectSql` **不提供原生参数绑定**，直接字符串拼接存在注入与语法破坏风险。本项目在 `common/db.js` 自建三层防护，所有 SQL 必须经此层：

1. **`bindParams(sql, params)`** —— `?` 占位符绑定
   - 按 `?` 出现顺序逐个替换，跳过字符串字面量内部的 `?`
   - 值经 `sqlLiteral()` 转换后再回填
2. **`sqlLiteral(v)`** —— 类型安全的字面量转换
   - `null / undefined` → `NULL`
   - `number` → 校验 `Number.isFinite`，非法值报错（防 `NaN`、`Infinity` 破坏语法）
   - `boolean` → `1 / 0`
   - `string` → 单引号 **翻倍转义**（`'` → `''`，SQL 标准转义，非反斜杠）
   - 其他类型 → `String(v)` 后按字符串处理
3. **`safeIdent(name)`** —— 标识符白名单
   - 动态表名 / 列名 / `ORDER BY` 字段必须匹配 `/^[A-Za-z_][A-Za-z0-9_]*$/`
   - 不合法直接抛错，杜绝标识符注入

写入类操作统一走 `withTransaction()`，保证批量导入 / 清空的原子性。

---

## 四、提醒机制（仅 App 内提醒）

> **2026-09-26 变更**：通知栏提醒链路已按用户要求**整体移除**——通知栏发送、每日定时通知、
> 每天中午 12:00 汇总通知、后台常驻调度与 Android 原生闹钟全部删除，相关权限与授权弹窗一并取消。
> 现在提醒**只在 App 内**呈现，不再申请通知权限，也不再要求「后台运行 / 自启动 / 电池优化」。
> 通知链路的历史实现与修复记录见文末「修复记录」与「Git 有效回退版本」。

三类提醒**各有独立开关**，在设置页配置：

| 提醒 | 触发条件 | 呈现方式 |
| --- | --- | --- |
| 每日记账提醒 | 设置页「每日记账提醒」开关开启 | **每次冷启动** App 时，App 内弹窗提示一次（与具体时间无关） |
| 还款提醒 | 凡「账户管理」里带有账单日+还款日的信用账户，距下次还款日 ≤ 提前 n 天，且本期应还 > 0 | **首页「还款提醒条」**（不进冷启动弹窗、不发通知栏） |
| 纪念日提醒 | 距纪念日 ≤ 提前 n 天（从当日 0:00 起算） | **每次冷启动** App 时，App 内弹窗提示一次 |

实现要点：
- **冷启动弹窗**：`App.vue` 等原生环境就绪、数据库初始化完成后调 `runColdStartAlerts()`，
  由 `common/reminder.js` 的 `collectAlerts()` 收集「每日记账 + 纪念日」两类条目，写入
  `store.alerts` / `store.alertVisible`，交给总览页 `AlertPopup` 展示。还款**不进入**冷启动弹窗
  （用户 2026-09-26 明确要求冷启动弹窗只保留每日记账 + 纪念日）。
- **已移除的通知能力**：原 `common/notify.js` / `system-reminder.js` / `autostart.js` /
  `uni_modules/family-ledger-reminder` 全部删除，连带移除——
  每天中午 12:00 的还款 + 纪念日汇总通知、每日记账「到达设定时间」的通知、60 秒轮询调度、
  进程退出后的原生闹钟（BroadcastReceiver / AlarmManager）与开机 / 升级恢复。
  设置页因此**删除了「提醒时间」选择器**（该时间原先只用于通知栏定时，现已无意义）；
  `reminder` 设置里的 `time` / `lastDate` 字段保留定义，仅为兼容历史备份文件的导入 / 导出结构不变。
- **弹窗交互**：每日记账、纪念日提醒弹窗显示 **5 秒后自动关闭**；倒计时期间仍可点右上角 `×`、
  点「知道了」或点弹窗外部空白区域立即关闭。每日记账的应用内弹窗只取决于开关是否开启，每次冷启动均显示。
- **弹窗滚动锁定**：所有弹窗（设置页导出格式 / 导入文件列表、提醒弹窗）的遮罩统一挂 `@touchmove.stop.prevent`，
  **弹窗打开时背景页面被锁死不可滑动，只能操作最上层弹窗**；需要滚动的弹窗把列表区包在 `.modal-scroll`
  内并挂 `@touchmove.stop`（阻止冒泡到遮罩，避免自身滚动被遮罩的 prevent 取消），标题与底部按钮固定不动
- **还款提醒数据源**：`domain.creditRepayMap()` 按**信用账户**维度汇总（信用卡 + 启用了账单日/还款日的
  银行卡 / App 支付渠道，一视同仁）——对每个有账单日+还款日的账户取最近的每月还款日，再由该还款日
  **反推它所属的账单周期**（`billCycleOfRepayDate()`），本期应还 = 该周期内该账户的支出合计。
  历史交易里带 `repayDate` 的记录兼容保留。

  **账单周期口径（唯一）**：本期账单日 = 还款日之前（含当天）最近的那一个账单日；
  本期应还 = **上一期账单日（含当天）～ 本期账单日前一天**。两种情形由同一套算法自然覆盖：
  - 情况 A（还款日 > 账单日，当月还）：账单日 5 / 还款日 20 → **9-20 该还 8-05 ～ 9-04**；
  - 情况 B（还款日 < 账单日，次月还）：账单日 25 / 还款日 10 → **10-10 该还 8-25 ～ 9-24**
    （本期账单日自动退到上一个月的 9-25）。

  **本期应还为 0 不提醒**：本期账单周期内该账户没有任何支出，说明本期没有欠款，
  直接跳过不生成提醒条目（`if (total <= 0) return`），避免出现「还款 ¥0.00」这类无效打扰。
  所以设了还款日却不显示提醒条时，多半是本期还没消费，属预期行为。

  **提醒条显示（总计 + 逐账户）**：`creditRepayMap()` 的 `accounts` 为 `[{ name, amount }]`，
  首页还款条分两部分——
  - **第一行**：`💳 总计需还款：¥X`（`creditRows.total`，所有账户本期应还之和）；
  - **第二行起**：每个账户一行，从左往右依次是「到期状态（今天到期 / 还有 N 天）→
    账户名 (还款日 MM/DD) → 该账户需还金额」；`creditRows.items` 按还款日从近到远排，
    同一天的按金额从高到低。

  整条**默认只显示 3 行**（1 行总计 + 2 行账户，`REPAY_ACC_LIMIT = 2`），账户更多时最下方出现
  「展开全部 N 个账户」，点开看全、再点收起。还款提醒只在首页还款提醒条展示，不进入冷启动弹窗、不发通知栏。

  **卡片头部版式**：总览卡片标题只写「家庭财务一览」这一句（不再带「2026 年 6 月 ·」这类前缀，
  当前年份月份由下方筛选按钮与右侧「共 N 笔」体现）。还款提醒条**上移到筛选行上方**，
  即紧贴标题下方显示：顺序为「标题 → 还款提醒条（有才显示）→ 年份 / 月份筛选行 → 统计卡片」。

  **新增 / 修改记录都走同一套口径**：收支编辑页新增、以及编辑时把渠道改成带账期的账户，
  一律按「账户自身的账单日 / 还款日」回填并重算 `billDate` / `repayDate`
  （`txn-edit.vue` 的 `applyAccountCycle()`：载入记录、切换账户、账户延迟加载三条入口都会回填，
  不再停留在默认 5/20 导致账期被算错、甚至被回写覆盖账户设置）。另外：
  - **还款日已过自动顺延**：`nextMonthlyOnOrAfter()` 取「今天之后（含今天）最近的每月还款日」，
    本月该日已过则顺延到下月（如今天 9-26、还款日 20 → 下次 10-20），已过期还款日不再提醒；
  - **短月自动收敛**：还款日大于当月天数时收敛为当月最后一天（2 月 30 号 → 2-28 / 闰年 2-29；
    4 月 31 号 → 4-30）。`repayDayInWindow()` 补偿边界情况：当实际收敛日期超出「提前 n 天」窗口、
    但该月确实不存在名义还款日（如 2 月没有 30 号）时，以当月最后一天是否落在窗口内为准，避免漏提醒。

---

## 五、权限与文件目录

### 权限策略（`common/permission.js`）
- **冷启动不申请任何权限**（2026-09-26）：不再申请通知权限（原 `POST_NOTIFICATIONS`），
  也不再弹「自启动 + 电池优化白名单」引导——通知栏链路已整体移除，这两类授权已无用途。
  因此冷启动不会弹任何系统授权框（不弹「允许发送通知吗」，也不弹「允许应用始终在后台运行吗」）。
- **通知权限 / 自启动 / 电池优化已全部删除**：设置页不再显示“通知自检 / 发送测试通知”，
  也删除了 `ensureAppPermissions()`、`guideAutoStartOnce()`、`openBatteryOptimizationSettings()` 等入口。
- **不再在冷启动申请存储 / 媒体权限**（2026-09-24 用户要求）：旧版冷启动申请 `READ/WRITE_EXTERNAL_STORAGE`，
  Android 11+ 会弹出系统框「要允许「家庭账本」访问此设备上的照片、视频、音乐和音频吗？」——
  该冷启动申请已彻底移除；`permissionExternalStorage.request` 明确设为 `none`，禁止 HBuilder 运行时自动弹存储授权。
  File/Zip 原生模块会在打包阶段自动补充旧系统所需的存储权限，因此不在 `permissions` 数组重复声明。
  `AndroidManifest.xml` 在 `<application>` 保留 `android:requestLegacyExternalStorage="true"`，Android 10
  套壳机型仍可在导入 / 导出时申请传统存储权限；Android 11+ 继续走 `MANAGE_EXTERNAL_STORAGE` 引导；
  Android 10 及以下只在用户点击导入 / 导出后由代码按需申请。
- **导入 / 导出按钮** `ensureAllFilesAccess()`：点击时检查「所有文件访问权限」（`MANAGE_EXTERNAL_STORAGE`，
  Android 11+），未授权自动弹提示并跳转系统授权页，授权后重新操作即可；
  Android 10 及以下改为在此时申请传统存储权限（系统文案是「存储」，不是媒体权限框）

### 导出目录
固定 `Download/家庭账本`（安卓公共下载根目录下），由 `fileio.js` 用 **Native.js `java.io.File.mkdirs()`**
直接创建、`java.io.FileOutputStream` 直写字节（绕开 `writeAsBinary` 静默截断的坑）。

**不再静默落应用私有目录**：公共目录写不进去（未授权等）会直接报错并提示去授权，
杜绝「提示导出成功、Download 里却找不到文件」的假成功。

> 🔧 **踩坑修复（2026-09-24）`getExternalStorageDirectory().getAbsolutePath is not a function`**
> `plus.android.importClass('android.os.Environment')` 只桥接「类」，它返回的 `java.io.File`
> **实例**上的方法首次调用时尚未桥接，直接 `.getAbsolutePath()` 会抛错。表现为：
> **首次装包**点导入 → 列表恒为空 + 一条报错提示（异常被 `catch` 吞成空列表），
> 而先成功导出过一次后 java.io.File 已被别处桥接过，再导入就「碰巧」正常。
> 现修法：先桥接 `java.io.File` 类 → 再对该实例 `importClass` → 失败退 `plus.android.invoke`
> → 再失败用常量 `/storage/emulated/0` 兜底，`publicRootAbs()` **永不抛错**。

### 导入导出
- **导出 Excel**：`xlsx.js` 的 `buildXlsxBytes()` 生成 XLSX（ZIP stored 模式 + XML 拼装，UTF-8 由 `binary.js` 自实现编码，自带 CRC32），经 Native.js 字节流落盘，**写完后校验字节数**；
  共 8 个工作表——「收支明细 / 借款记录 / 还款记录 / 手动账户 / 每日记账提醒 / 还款提醒 / 纪念日提醒 / 纪念日」，数据源与 `buildBackupJson()` 严格对齐（同一份完整备份），金额列统一 `0.00` 两位小数。
- **导出 JSON（完整备份）**：`backup.js` 的 `buildBackupJson()` 组装备份对象（收支记录 + 手动账户 + 三类提醒设置 + 纪念日 + 借款），`JSON.stringify` 后经 `fileio.saveText()` 落盘到同一 `Download/家庭账本` 目录，扩展名 `.json`。
- **导入**：列出可导入文件（`.xlsx` / `.csv` / `.json`）——**只扫 `Download/家庭账本`**
  （2026-09-24 起去掉旧目录 `Download/家庭记账本` 与「应用私有目录」的兼容扫描）。
  列表主路径用 `plus.io`，若一个文件都没扫到再用 **Native.js `java.io.File.listFiles()`** 兜底扫一遍（双通道）。
  XLSX 用 `plus.zip.decompress()` 解压后，先解析 `xl/workbook.xml` + `xl/_rels/workbook.xml.rels` 得到「工作表名 → 行」映射，再按表名识别 8 类并整体还原；
  CSV 经 `plus.io.FileReader` 读取；JSON 经 `readFileText` 读取后 `parseBackupJson` → `applyBackupData` / `applyImportData` **整体替换**当前数据（7 个内置独立账户始终保留）。
- 导入前会展示文件列表供用户选择，确认后经 `withTransaction()` 事务化写入（JSON 备份的账户/纪念日清理亦走事务）
- **统一入口**：设置页只有两个按钮——「导出 Excel/JSON」点开弹窗二选一（`pickExport('xlsx' | 'json')` 分发到 `doExport()` / `doExportJson()`），
  「导入 Excel/JSON」统一列出 `.xlsx / .csv / .json`，按扩展名自动走对应解析分支。

> ⚠️ **逻辑层无浏览器 API**：uni-app App 端的逻辑层（`app-service.js`）跑在 5+ 的独立
> JS 引擎里，**没有** `TextEncoder` / `TextDecoder` / `Blob` / `FileReader` /
> `DecompressionStream` / `atob` / `btoa` 等浏览器全局对象（运行时会报
> `ReferenceError: xxx is not defined` 导致白屏）。因此本项目所有字节 / 文本 / 解压
> 操作都改走 `binary.js` 自实现 + `plus.io` / `plus.zip` 原生能力。

---

## 六、运行与打包

1. 用 **HBuilderX** 打开 `D:\dudu\Project\FamilyLedger` 目录
2. 运行 → 运行到手机或模拟器 → 运行设置中勾选「使用 HTML5+ 增强引擎 / 使用 SQLite 模块」
3. 云打包 / 离线打包生成 APK：
   - 发行 → 原生App-云打包（需配置自有证书或使用 DCloud 公共测试证书）
   - `manifest.json` 中已声明全部所需权限，打包时无需再手动添加

> SQLite、File、Zip 三个模块已在 `manifest.json` 的 `modules` 中声明（Push 模块已随通知栏链路移除）。

---

## 七、已知限制

1. **真机 UI 尚未实机验证**：逻辑层已通过 64 项自测（防注入、农历、CSV、导入解析、XLSX 生成、金额显示），全部 `.js` 通过 `node --check`、全部 `.vue` 通过模板/脚本结构校验，但样式需在 HBuilderX 真机运行 / 云打包后核对。
2. **提醒只在 App 内**：已无通知栏 / 后台提醒，因此不再依赖「自启动 / 电池优化 / 后台运行」等系统设置；
   提醒仅在每次冷启动时的 App 内弹窗（每日记账 + 纪念日）与首页「还款提醒条」呈现，关闭 App 后不会再有提醒。
3. **数据不自动云同步**：数据库位于应用私有目录，卸载 App 会清除；请通过导出 XLSX 备份。
4. **自测脚本**位于 `ai_temp/_test/`（逻辑自测）、`ai_temp/_syntax/`（静态校验：
   `check-imports.mjs` 导入导出比对、`check-refs.mjs` 路由/组件/模板引用、
   `check-vue.mjs` 结构校验），均已被 `.gitignore` 忽略，不入库。

---

## 八、验证记录

> **2026-09-26 起**：通知栏提醒链路（通知发送 / 定时通知 / 原生闹钟 / 自启动与电池优化引导）已整体移除，
> 下方所有「通知栏 / 闹钟 / 自启动 / 电池优化 / POST_NOTIFICATIONS / 原生接收器」相关的验证与修复条目
> **均为历史记录**（对应已删除的 `notify.js` / `system-reminder.js` / `autostart.js` / `family-ledger-reminder`），
> 仅供参考，不再代表当前行为。当前基线见下方首段。

- `node --check`：14 个 `common/*.js` + `main.js` 全部通过
- `check-imports.mjs`：**70 条 import 语句**的符号与目标模块导出逐一比对，全部匹配
- `check-refs.mjs`：15 个 `.vue` 的组件注册、**710 处模板标识符**引用全部完整
- 全部 `uni.navigateTo / reLaunch` 跳转目标 ↔ pages.json 路由逐一核对，无死链
- `check-vue.mjs`：15 个 `.vue` 文件模板 / 脚本结构校验全部通过
- `run-tests.mjs`：**79 项逻辑自测全部通过**
  - SQL 防注入：`sqlLiteral` / `bindParams` / `safeIdent`
  - 多语句 SQL 切分：`splitStatements`（含字符串字面量内分号不误切）
  - 金额防呆：`normalizeAmount`（补两位小数 / 四舍五入 / 清非法字符 / 剔负号）
  - 金额显示：`money` **15 项断言**（整数补两位 / 千分位 / 负数 / `NaN`、`Infinity`、`null` 兜底 /
    浮点脏值收敛 / `0.1+0.2`、`0.3-0.1` / 总览结余链路 `¥8,708.47`）
  - 金额导出格式：`styles.xml` 内含 numFmt `0.00`、金额单元格引用 `s="1"`、金额底层仍为数值
  - 农历换算：公历↔农历互转、闰月处理
  - CSV 解析：引号包裹、字段内换行、转义
  - 导入转换：`rowsToData` 行列映射
  - XLSX 生成：导出 **8155 字节**测试文件，结构合法（**8 个 entry** 全 stored，含 `xl/styles.xml`，
    EOCD/central 校验通过）；并用 **openpyxl 实测加载成功**，金额列 `number_format = 0.00` 生效
- `binary.js` UTF-8 编解码：与 Node 原生 `TextEncoder` 输出逐字节对齐，中文 / emoji / 10 万字符往返一致
-   `run-app-sim.mjs`（**模拟安卓运行环境端到端测试**）：node:sqlite 假装 `plus.sqlite`、
  内存 FS 假装 `plus.io`，并忠实复现安卓平台限制，模式 A / B 各 **191 项**、模式 C **186 项**
  （C 因无权限跳过落盘断言）全部通过：
  | 模式 | 模拟场景 |
  |---|---|
  | A | `isOpenDatabase` 正常走 `success` 回调 |
  | B | `isOpenDatabase` 只同步返回 Boolean、**不回调**（旧实现会永久挂起） |
  | C | 未授予存储权限（导出必须如实报错而非谎报 Download，导入列表为空且不抛错） |
  覆盖场景：冷启动建库 → **7 个内置独立账户按固定顺序生成、type=builtin、与手动账户互不干涉
  （builtinAccounts/managedAccounts/accountOptions 分层校验）** → 加纪念日 → 加手动信用卡
  → 开提醒开关 → 记一笔（含信用卡账单/还款日）→ 借款+追加+还款+合并 → 导出 xlsx 落盘并校验字节数
  → **S8b 导入候选扫描：在旧目录 `Download/家庭记账本` 造一个文件，验证它**不再**被扫到；
  再模拟真机「Environment 类已桥接、返回的 File 实例未桥接（无 getAbsolutePath）」的首次调用现场，
  验证 `listImportableFiles()` 既不抛错、又能退化到兜底根目录扫到文件（本次用户反馈的根因回归）**
  → 删除级联 → 冷启动弹窗提醒收集（仅 App 内：每日记账 + 纪念日；还款只走首页还款条，通知栏已移除）
  → **JSON 完整备份：buildBackupJson 结构校验 / parseBackupJson 容错 / applyBackupData 整体替换
  （脏数据 app-滴滴 被清除、内置 7 账户保留、提醒设置与纪念日/借款/收支数量还原）**；
  S11 额外校验**收支 / 手动账户 / 纪念日 / 借款（含追加、还款子记录）导出均带 createTime+modifyTime**，
  且**导入整体替换后原始创建 / 修改时间随数据保留**（replaceSetting / replaceAllTxns / replaceAllLoans 透传）。
  → **S12 页面结构回归（18 项，直接读真实 `.vue` 模板与 `pages.json`）**：说明页 / 账户详情页路由已注册、
  设置页 5 个 `⚠️说明` 入口与 5 个 topic 一一对应、`time-meta` / `ca-time` / `累计支出` 已从设置页移除、
  默认账户改小方框且只渲染 2 个、手动账户只渲染 1 个、明细行无 `dr-time`、借还卡片无圆形头像且
  三行结构齐备（`loan-row1/2/3` + 最右「剩余」）、无约定还款日不显示该段、备注进展开区、
  点「借还」复位（`loanOpen = {}` + `loanFilter = 'all'`）。
  → **S13 列表搜索与页面样式回归（18 项，本轮 7 项需求的防回退断言）**：纪念日卡片无方形图标 /
  无 `anniv-meta` / 无 `am-line`、第二行为 `v-if="x.a.note"` 的备注行、右侧倒计时与编辑删除原样、
  列表页（含借还展开区）**完全不含 `创建时间：` / `修改时间：`** 且 `index.vue` 已无 `fmtTime` /
  `fmtDateTime`、借还 `loanList()` 与纪念日 `annivList()` 均接入 `searchKeyword`（纪念日走未过滤的
  `annivAll` 兜底，`annivTip` 统计不受搜索影响）、输入关键词不再强制跳回明细页、搜索框占位文案覆盖
  借还与纪念日、设置页 3 处「见右上角⚠️说明」提示已删除、`acct-group-row` 与两行右侧 `详情` 已删除、
  `账户详情` 红色胶囊按钮（`.acct-row-btn`）+ `⚠️说明` 位于「账户管理」标题行、手动账户带 `boxed` 方框、
  分组小标题已 `font-weight: 600` + `#444` + 红色标记条。
  → **S14 总览卡片与设置页按钮回归（17 项，2026-09-25 第二 / 三轮）**：统计卡片 `.stat-card` 内边距
  `9px 12px`、`.stat-value` 15.5px、`.stat-label` 11px、`.stat-pair` 13px、`.stat-grid` gap 8px、
  装饰圆 58px；设置页 `openImport` 已挂 `btn btn-primary` 红底（弹窗「取消」仍为 `btn-ghost`）；
  `add-account-row` / `add-credit-btn` 已从模板与样式表消失；**「+ 账户」为弹出窗口**
  （`v-if="showAddMenu"` + `.mask` + `.modal`，旧 `.add-account-menu` 内联下拉已彻底移除），
  窗口内 3 个 `.aam-btn.btn.btn-primary` 分别调用 `pickAddAccount('credit'|'bank'|'app')`，
  可点 ✕ / 取消 / 遮罩关闭；`+ 账户` 位于 `账户详情` 左侧；`showAddMenu` 默认 `false`、
  选中后先关窗再跳转；`.acct-row-btn` 为 28px 高 / 圆角 14px 的椭圆；
  **总览页模板已无 `ph-title">总览`**，只留 `.ph-sub` 一行（配 `.ph-sub-only` 归零顶距）。
  → **S15 账户详情页与提醒开关回归（10 项，2026-09-25 第四轮）**：`pages/accounts/accounts`
  模板已无 `help-link` / `返回设置` / `goBack`（说明与返回走顶部导航栏）；设置页模板已无
  `switch-row` 与「开启每日/还款/纪念日提醒」三行，3 个 `.title-ops` 按钮组内
  **开关（rem/cr/ar.enabled）位于对应 `⚠️说明` 左侧**；`toggleReminder` /
  `toggleCreditReminder` / `toggleAnnivReminder` 方法保留；样式表新增 `.title-ops`、
  删除 `.switch-row`。
  → **S16 总览与设置页分组边框回归（2026-09-25 第五轮）**：总览页把范围标题、年月筛选、
  还款提示与 4 个统计块统一包入 `.overview-summary-card.card`，范围标题复用趋势卡的
  `.section-title` 红色竖线样式；设置页新增 `.settings-panel` 卡片边框，按「数据管理」「账户管理」
  「三类提醒」分为 3 个大框，三类提醒在同一外框内继续用细分隔线区分。
  → **S17 顶部全局搜索与自动跳页回归（2026-09-25 第六轮）**：搜索框占位文字为
  `收支/借还/纪念日`；收支、借还、纪念日分别复用 `txnMatchesSearch`、`loanMatchesSearch`、
  `annivMatchesSearch` 做列表过滤与页面命中判断；姓名 / 机构名、应收 / 应付及纪念日名称可触发
  对应页面跳转；跳页时清除目标页局部筛选并滚回结果区顶部。
  → **S18 Android 13+ 通知首授权回归（2026-09-25）**：`manifest.json` 的目标 SDK 为 33 且声明
  `POST_NOTIFICATIONS`；`notify.js` 使用真实 `Build.VERSION.SDK_INT` 判断 API 26+ 并在首启创建渠道；
  `permission.js` 仅在冷启动链路于 API 33+ 检查并请求系统通知权限，设置页提醒开关不再触发权限弹窗。
  → **S19 四个底部 Tab 只切换不重载（2026-09-26 改写）**：手动点击总览 / 明细 / 借还 / 纪念日时
  只切换当前页面，不清空顶部搜索、不回到页面顶部；总览年月与渠道排行模式、明细的类型 / 年月筛选与
  月份折叠、借还的类型筛选与卡片展开均保持离开前状态。仅顶部搜索的自动跳页会重置目标页筛选并滚回顶部。
  → **S20 原生离线提醒实机回归（2026-09-25）**：经典 uni-app 编译产物必须保留
  `syncReminderSchedule(...)` 调用；自定义基座 `classes2.dex` 必须包含
  `FamilyLedgerReminderReceiver` / `FamilyLedgerBootReceiver` / `FamilyLedgerReminderScheduler`；模拟器将
  每日提醒设为 22:35 后，`AlarmManager` 出现 `RTC_WAKEUP` 精确闹钟，退出到桌面并回收 App 进程，
  到点仍由静态接收器发布标题“家庭账本 · 记账提醒”的通知。
  → **S21 首次授权跨过提醒时间后的补发回归（2026-09-25）**：原生层以
  `last_daily_date` 记录每日系统通知的真实成功投递；到点时若通知权限尚未确认或通知被系统关闭，
  不写成功日期并保留 `last_error`。首装授权流程结束后 App 会再次同步计划，若当天提醒时间已过且尚未
  成功投递，则立即补发通知；正常闹钟已成功投递时不会重复。
  → **S22 Android 通知图标与品牌色回归（2026-09-25）**：原生接收器与 Native.js 兜底均使用
  `ic_stat_family_ledger` 透明背景单色账本图标，不再把彩色启动图标错误地当作 small icon；两条链路
  都设置品牌红 `#C20C0C`，原生通知另附完整彩色应用图标作为 large icon。

### 修复记录

> 本小节为历史修复记录。**2026-09-26 起通知栏提醒链路已整体移除**：删除
> `notify.js` / `system-reminder.js` / `autostart.js` / `uni_modules/family-ledger-reminder`
> 及「通知权限 / 自启动 / 电池优化」引导与 `POST_NOTIFICATIONS`、`RECEIVE_BOOT_COMPLETED`、
> `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`、`WAKE_LOCK`、`VIBRATE` 等权限声明；设置页删除「提醒时间」选择器。
> 因此下列所有与「通知 / 闹钟 / 自启动 / 电池优化」相关的修复条目均为历史，不再代表当前行为。

- **移除通知栏提醒链路（2026-09-26）**：用户不需要「没有后台运行时 12 点定时通知」与「定时发送每日提醒」，
  要求只保留 App 内提醒、剔除一切涉及通知栏的逻辑并取消相关授权弹窗。处理：删除通知发送模块与原生闹钟插件、
  冷启动不再申请任何权限（含通知）、`App.vue` 精简为「初始化数据库 → 冷启动弹窗」、`reminder.js` 只保留
  `collectAlerts / runColdStartAlerts / closeAlerts`；还款提醒保留在首页「还款提醒条」，每日记账与纪念日保留在
  冷启动 App 内弹窗。历史通知链路实现仍可在 `Git 有效回退版本` 的 `v1.0.0-notify6` 等标签取回。

- **Android 13+ 首装不弹通知授权、应用信息显示通知关闭**（2026-09-25，历史）：两个问题叠加：
  1. `targetSdkVersion` 仍为 30。Android 13+ 新装应用通知默认关闭，而 target 32 以下只能等首次创建
     通知渠道后由系统决定弹窗时机，应用不能可靠地主动控制；现已提升到 33；
  2. `notify.js` 原来用 `plus.os.version` 得到 Android 主版本号（如 13），却把它与 API 级别 26 比较，
     导致 Android 8+ 永远不创建 `NotificationChannel`，原生通知构造也走错分支；现改读
     `Build.VERSION.SDK_INT`（Android 13 得到 33），并在申请权限前创建渠道；
  3. `plus.android.requestPermissions` 的 success 只表示请求流程完成，结果里仍可能是拒绝。旧代码进入
     success 就返回 `true`；现解析 `granted / deniedPresent / deniedAlways` 并用 `checkSelfPermission` 复核；
  4. HBuilderX 标准基座不会应用项目清单。本次变更必须重新制作自定义调试基座，并卸载旧包后首装验证。
- **旧自定义基座仍不弹权限且关闭 App 后不提醒（2026-09-25 再修）**：对实际运行的
  `unpackage/debug/android_debug.apk` 做清单审计后确认，它仍是旧包名 `com.app.FamilyLedger`、
  `targetSdkVersion=28`，而且最终 APK 中没有 `FamilyLedgerReminderReceiver` / `FamilyLedgerBootReceiver`。
  因此此前看到的 `reminderNative=1` 不能证明接收器已进包：热更新只能更新前端资源，无法给旧基座新增清单组件。
  修复为：目标 SDK 恢复 33；补齐 UTS 插件 `dcloudext.type=uts`、平台和依赖元数据，使打包器识别原生模块；
  同时按 uni-app 官方“Android 原生应用清单文件”规则在项目根增加 `AndroidManifest.xml`，静态注册
  提醒 / 开机接收器（仅写在 UTS 插件清单时，本项目的云端自定义基座未合并）；精确闹钟按 Android 版本声明
  `SCHEDULE_EXACT_ALARM(maxSdkVersion=32)` / `USE_EXACT_ALARM`。这些变更必须重新制作自定义基座，
  不能继续使用 `unpackage/cache/apk` 中的旧基座。
- **UTS 代码生成了、APK 却仍缺接收器类（2026-09-25 最终根因）**：本项目是经典 uni-app，
  但 `common/system-reminder.js` 曾使用 uni-app x 的 `APP-ANDROID` 条件。经典编译器因此把整个原生调用
  裁成固定 `return false`，随后摇树删除 UTS 模块；仅在根清单注册接收器会留下“有组件名、无实现类”的
  坏包。现改用 `APP-PLUS`，清理 `unpackage/cache` 后重新编译和制作基座；已同时核验编译后的
  `app-service.js`、APK dex、原生计划 SharedPreferences、系统精确闹钟以及进程退出后的通知实投递。
- **“已允许通知，但只显示 App 内提醒，通知栏为空”补偿修复（2026-09-25）**：现场审计确认系统权限为
  `granted=true`、通知渠道重要性为 `DEFAULT`，但当天 23:08 没有任何通知进入系统队列，App 在 23:09
  冷启动后只显示了内部提醒，并已把原生闹钟顺延到第二天。根因是到点时若首次授权框尚未确认（或该次
  原生投递失败），旧接收器仍直接安排明天，授权成功后没有补发当天提醒。现由原生层记录真实投递日期：
  接收器只有在 `NotificationManager.notify()` 成功后才标记当天；首次授权完成后强制重同步，时间已过且
  当天未成功投递时立即补发。系统通知总开关关闭或 `POST_NOTIFICATIONS` 未授予时会落盘错误且不误标成功。
- **通知图标呈灰紫色残缺圆块（2026-09-25）**：Android 的通知 small icon 不是普通彩色图片，系统只读取
  透明度蒙版并按主题统一着色。旧代码直接传 `applicationInfo.icon`（彩色启动图标），被系统压成单色后
  只剩残缺形状。现新增专用白色账本矢量小图标，并由通知 Builder 设置家庭账本红色强调色；同时把完整
  彩色应用图标作为 large icon。状态栏小图标仍会遵循 Android 规则显示为系统着色的单色图形，这是正常行为。
- **`txn-edit.vue` 编译报错**：`"accountByName" is not exported by "common/domain.js"`。
  该函数实际由 `common/store.js` 导出，修正导入来源后通过。已用 `check-imports.mjs`
  全量扫描，确认项目内不存在其它同类跨模块符号引用错误。
- **白屏报错 `TextEncoder is not defined`**：`xlsx.js` / `fileio.js` 使用了浏览器专属的
  `TextEncoder` / `TextDecoder` / `Blob` / `FileReader` / `DecompressionStream`，而 App 端
  逻辑层没有这些全局对象。修复：新增 `common/binary.js` 自实现 UTF-8 编解码与二进制字符串，
  文件读写改走 `plus.io.FileReader` / `FileWriter.writeAsBinary`，xlsx 解压改走 `plus.zip.decompress`，
  并在 `manifest.json` 增加 `Zip` 模块。
- **启动时序加固**：新增 `common/platform.js` 的 `waitPlusReady()`，在 `initDatabase()`
  之前等待 `plusready`（3 秒超时兜底），避免少数机型冷启动竞争时误报「当前运行环境不支持 SQLite」。
- **真机致命 Bug（一次修复解决全部连锁故障）**：真机上出现「纪念日存不上、信用卡存不上、
  每日提醒开关点不动、账户下拉空白、启动不申请权限」。
  根因是 `db.js` 把 7 条 `CREATE TABLE` 用 `;` 拼成一个字符串交给 `plus.sqlite.executeSql`，
  而**官方文档明确写：Android 平台不支持 SQL 语句中用 `;` 分割多条命令**，于是整批建表失败
  → 表不存在 → 所有读写全部失败；又因为启动链是 `initDatabase().then(权限引导)`，
  数据库一挂，权限引导就永不执行。
  修复：
  1. `db.js` 新增 `splitStatements()`，把多语句拆成单条逐条提交（跳过字符串字面量内的分号）；
  2. `openDb()` 三重保险——`isOpenDatabase` 的**同步返回值 + success 回调 + 250ms 兜底 / 5s 超时**，
     避免「只返回 Boolean 不回调」的实现导致 Promise 永不 settle、启动链永久挂起；
  3. `App.vue` 启动改为两条互不阻塞的支线：**权限引导与数据库初始化并行**，
     数据库失败不再连带权限引导失效，并弹出可复制的错误详情；
  4. `fileio.js` 的 `saveBinary()` 返回**真实落盘路径 + fallback 标记 + 字节数校验**，
     不再静默退到应用私有目录却提示「已保存到 Download」（此前"提示成功但找不到文件"的原因）；
  5. 设置页导出提示改用真实路径，未获权限时明确提示「去授权」；新增「权限与授权 → 重新申请权限」入口；
  6. 三个提醒开关的保存加 try/catch，失败会弹窗告知，不再静默无反应；历史版本曾在开启提醒时申请
     通知权限，本轮已取消，通知权限只在首次冷启动统一申请；
  7. `txn-edit.vue` 增加 `watch(accounts)`：账户数据晚于页面加载时自动补选首个账户，
     下拉不再空白；未加载完成时给出明确提示；
- **导入列表恒为空 + 弹 `getExternalStorageDirectory().getAbsolutePath is not a function`**（2026-09-24）：
  根因见上文「五、权限与文件目录 → 踩坑修复」——`Environment.getExternalStorageDirectory()`
  返回的 `java.io.File` 实例方法未桥接，`publicRootAbs()` 抛错被 `openImport()` 的 `catch` 吞成空列表。
  修复：`publicRootAbs()` 桥接类 + 桥接实例 + `plus.android.invoke` + 常量兜底（永不抛错），
  `listImportableFiles()` 再叠加 Native.js `listFiles()` 双通道；同时按用户要求去掉旧目录
  `Download/家庭记账本` 与「应用私有目录」的兼容扫描，并移除冷启动存储 / 媒体权限申请
  （不再弹「访问照片、视频、音乐和音频」授权框）。
- **`check-refs.mjs` 误报 17 处「模板变量未定义」**（2026-09-24，顺手修复）：
  该脚本解析 `<script>` 时未剥注释，`index.vue` 里一句含 `[账户名...]` 的说明注释打乱了
  括号 / 字符串跟踪，`computed` 块后半段整体丢失，于是 `detailList`、`monthGroups`、
  `annivList` 等真实存在的计算属性被误判为未定义。修复：解析前先 `stripComments()`
  （行注释的 `//` 不紧跟在 `:` 之后，避免误伤 `http://…` 这类字符串）。
   修复后 computed 键由 23 个恢复为 40 个，校验结果 **690 处模板标识符全部通过**。
- **「授权了通知，到点却一条通知都没有」+「关掉 App 后彻底不提醒」**（2026-09-24）：
  三个独立断点叠加，逐个修掉：
  1. **闹钟其实从未注册成功**：`autostart.js` 里 `main.getSystemService('alarm').setRepeating(...)`
     的 AlarmManager **实例没有 `importClass`**，直接抛 `setRepeating is not a function`，
     被 `catch` 静默吞掉（与 `java.io.File` 完全同一类 Native.js 坑）→ App 被杀后没有任何闹钟能拉起它。
     修复：对 `getSystemService()` 返回的实例补 `plus.android.importClass()`，并显式判空 +
     把失败原因写进 `plus.storage.alarmLastError`，不再无声失败。
  2. **每日记账提醒没有闹钟、也不在拉起路径里**：此前只注册了「中午 12:00」一个闹钟，
     且 `App.vue` 的闹钟分支只调 `checkNoonNotify()`，用户自定义时间的记账提醒被整体漏掉。
     修复：新增 `scheduleDailyAlarm(time)` 第二个闹钟（`consumeAlarmFlag('daily')`），
     闹钟拉起后统一跑 `tick()`（记账 + 中午汇总一起检查）。
  3. **通知渠道兜底 + 去重顺序**：新增 `common/notify.js` —— 首选仍是真机实测可用的
     `plus.push.createMessage()`（**不变更原通道**），仅在其不可用时退到 Native.js 直连
     `NotificationManager` 兜底，并在兜底路径自动创建 Android 8.0+ 必需的通知渠道
     `family_ledger_remind`、用 `BigTextStyle` 展开多行。同时修正 `checkDailyNotify()`
     的**先写去重后发通知**顺序（失败会把当天误判成「已提醒」，当天不再重试）。
      > 注：模拟器上曾加过「发送测试通知」自检按钮，因真机实测功能本就正常，
      > **已按用户要求整体删除**（含 `notify.js` 的 `hasNotifyPermission()` 导出）。
- **“已允许自启动，但 App 关闭后每天到点仍不显示通知”根治**（2026-09-25）：
  旧实现虽然成功注册了 `AlarmManager`，但闹钟目标是 `PendingIntent.getActivity()`：到点必须先从后台启动
  主 Activity，再等数据库和 WebView / JS 初始化后调用通知。现代 Android 会限制后台启动 Activity，
  因而“自启动已开启”也不代表这条链路能执行；此前声明了 `RECEIVE_BOOT_COMPLETED`，却没有真正注册
  开机广播接收器，重启后闹钟也不会恢复。现已改为：
  1. 新增 UTS 原生插件 `family-ledger-reminder`，采用
     `AlarmManager → FamilyLedgerReminderReceiver → NotificationManager`，应用进程不存在时由系统直接投递通知；
  2. 新增 `FamilyLedgerBootReceiver`，在正常开机完成或应用升级后从原生 SharedPreferences 恢复提醒计划；
  3. `App.vue` 在数据库就绪及提醒数据变化后自动重新计算并同步计划，原生链路可用时取消旧 Activity 闹钟；
  4. 原生链路接管时停止旧 JS 通知轮询，避免 App 前台运行时产生两条重复通知；
  5. 原生闹钟优先使用 `setExactAndAllowWhileIdle()`；Android 13+ 由 `USE_EXACT_ALARM` 保证安装后可注册，
     Android 12 及以下使用 `SCHEDULE_EXACT_ALARM`，异常时再退回 `setAndAllowWhileIdle()`；
  6. 明确系统边界：最近任务划掉 / 系统回收后可提醒，应用信息里的“强制停止”无法提醒，必须再次手动打开。
  原生模块已经通过 HBuilderX 5.26 的 `compile app-android --uni_module family-ledger-reminder` 实编译校验。
- **HBuilderX 5.26 自定义基座云打包出现 `WRITE_EXTERNAL_STORAGE duplicated`**（2026-09-25）：
  云端 `includePermissions` 已因 File/Zip 原生模块自动生成一条 `WRITE_EXTERNAL_STORAGE`，项目又在
  `manifest.json.permissions` 手动声明了一条带 `maxSdkVersion=29` 的同名权限，导致生成文件第 6 / 11 行重复，
  `processReleaseManifest` 在真正编译 UTS 提醒插件前就失败。现移除手动 `READ/WRITE_EXTERNAL_STORAGE`，
  保留 `MANAGE_EXTERNAL_STORAGE`，并设置 `permissionExternalStorage.request=none`；这样既消除清单重复，
  又保持“冷启动不弹存储权限、Android 10 及以下导入导出时再按需申请”的原有策略。
- **自有证书云打包报 `Comment must not contain '--'`**（2026-09-26）：根目录
  `AndroidManifest.xml` 的说明注释曾使用一整行 ASCII 短横线作分隔符；XML 规范禁止注释正文包含连续
  两个短横线，云端 `simplexml_load_file()` 因此在生成清单第 7 行终止。分隔符现改为等号，清单权限与
  `<application>` 配置未改变。
- **设置页 / 明细页 / 借还页信息密度过高**（2026-09-25，本轮 7 项 UI 调整）：
  1. **数据管理说明 → 说明页**：圈起来的导出 / JSON / 保存目录 / 导入覆盖说明从设置页移出，
     设置页只在「数据管理（Excel / JSON）」标题行最右侧留 `⚠️说明` 按钮，进入 `pages/help/help?topic=data`；
  2. **三类提醒同理**：每日记账提醒 / 还款提醒 / 纪念日提醒的「提醒逻辑 + 创建 / 修改时间」
     全部搬到说明页（`topic=reminder / credit / anniv`），设置页每块只留一行指路文案；
  3. **默认账户 → 小方框**：删除累计支出与「独立账户」徽标，设置页只显示第一排 2 个
     （现金 / 信用卡），其余点「详情」进 `pages/accounts/accounts` 完整展示 7 个；
  4. **手动账户 → 只显示 1 个**：多余的折叠进同一「详情」页（该页保留编辑 / 删除），
     并删除设置页上的创建 / 修改时间（只在编辑页与说明页看），其下三段说明文字移入
     `topic=account` 说明页，入口是同行的 `⚠️说明`；
  5. **明细行去噪**：删除每条收支底部的创建 / 修改时间（`.dr-time` 与其网格行一起移除），
     `App.vue` 中 `.detail-row` 网格改为两行；
  6. **借还卡片瘦身**：删除左侧圆形头像，改为三行 —— 姓名 + 应收 / 应付 + 最右「剩余：¥x.xx」/
     总额 + 已收还 / 借款日期 + 约定还款日（无约定不显示），备注与时间移入展开区 `.loan-extra`；
  7. **切 Tab 即复位**：`setPage('loans')` 内清空 `loanOpen`、`loanFilter` 复位 `all`，
     并加 `scrollTop()`（立即 + `nextTick` 各一次）保证回到页面顶部。
  > 顺带清理：`App.vue` 中随上述改动失效的样式（`.loan-avatar` / `.loan-who` / `.loan-name` /
  > `.loan-meta` / `.lm-line` / `.loan-amount-box` / `.loan-remain-label` / `.loan-remain-value` /
  > `.loan-total-hint` / `.dr-time` / `.agg-item` / `.ca-time`）已全部删除，避免样式表与模板脱节。
- **纪念日 / 借还列表仍带时间、搜索只作用于明细、账户入口分散**（2026-09-25，本轮 7 项 UI 调整）：
  1. **纪念日卡片重排**：删除左侧方形图标（`.anniv-avatar`，`annivColor()` 随之从 `index.vue`
     彻底移除）；第一行名称、第二行备注（`v-if` 判空，没有则整行不渲染）；右侧倒计时与
     编辑 / 删除保持原样。原先的 `.anniv-meta` 四行文字（日期 / 重复 / 备注 / 时间）整体删除 ——
     顺带修掉一个**隐性 Bug**：模板里引用的 `x.dateLabel` / `x.repeatLabel` / `x.noteText`
     在 computed 里从未定义（`check-refs` 只校验顶层标识符，属性名不在检查范围），
     所以那两行一直渲染为空；
  2. **借还展开区去时间**：`.loan-extra` 改为 `v-if="l.note"` 的单行备注，创建 / 修改时间删除；
  3. **搜索框覆盖借还与纪念日**：`loanList()` 按 姓名 / 备注 / 借款日期 / 约定还款日 / 应收应付 /
     金额 / 追加与还款子记录备注 过滤；纪念日拆出未过滤的 `annivAll()`，`annivList()` 在其上按
     名称 / 备注 / 日期文字（含农历）/ 重复方式过滤，`annivTip()` 改用 `annivAll()` 统计
     （否则搜索会把「今天有 N 个纪念日」算错）。同时修正 `onSearch()`：原来**只要输入关键词就
     强制跳到「明细」页**，导致借还 / 纪念日的搜索根本无法使用，改为仅在总览页时跳转；
  4. **删除设置页 3 处提示行**：「提醒逻辑、创建时间、修改时间见右上角「⚠️说明」。」不再显示；
  5. **账户入口统一**：「默认账户」「手动添加的账户」两行右侧的 `详情`、后一行上的 `⚠️说明`
     全部删除，改由「账户管理」标题行右侧统一的 **`账户详情`（蓝色胶囊 `.detail-link`）** +
     **`⚠️说明`**；`goAccounts` 调用点由 2 处收敛为 1 处；
  6. **手动账户加方框**：设置页展示的那一个手动账户加 `.boxed`（描边 + 圆角 + 淡底），
     不再像一段悬空文字；
  7. **分组小标题加深**：「默认账户（n 个）」「手动添加的账户（n 个）」由 `12px / #999 /
     浅灰竖条 (#e0e0e0)` 改为 `13px / 字重 600 / #444 / 红色竖条 (#C20C0C)`。
  > 顺带清理：`App.vue` 中失效的 `.anniv-avatar` / `.anniv-meta` / `.am-line` / `.am-note` /
  > `.am-time` / `.acct-group-row` / `.acct-group-ops .link-op` 已删除，新增 `.anniv-note` /
  > `.detail-link` / `.credit-account-item.boxed`；`index.vue` 的 `fmtTime` 方法与
  > `fmtDateTime` 导入一并移除（列表页已不再显示任何时间）。
- **总览统计卡片过大 + 设置页按钮不一致**（2026-09-25，第二轮）：
  1. **总览 4 个统计卡片瘦身**：`.stat-card` 内边距 `14px 15px → 9px 12px`，主数值 `.stat-value`
     `19px → 15.5px`、字距 `-.5px → -.3px`，标签 `.stat-label` `12px → 11px`、下间距 `8px → 3px`，
     「待收 / 待还」`.stat-pair` `17px → 13px` 且 `white-space: nowrap`（原来会折成两行），
     `.stat-grid` 间距 `10 → 8px`、下边距 `12 → 10px`，卡片右上装饰圆 `86px → 58px`；
  2. **导入按钮改红**：「导入 Excel/JSON」的 `btn-ghost`（白底描边）改为 `btn-primary`（红底白字），
     与「导出 Excel/JSON」完全同款；
  3. **三个平铺添加按钮删除**：账户管理下方的「+ 信用卡 / + 银行卡 / + App支付」及
     `.add-account-row` / `.add-credit-btn` 样式一并删除；
  4. **新增「+ 账户」下拉**：「账户管理」标题行右侧新增 `+ 账户`（位于 `账户详情` 左侧），
     点击展开 `.add-account-menu` 下拉列表，内含同样三项，选中即「先收起下拉 → 跳对应添加页」
     （`pickAddAccount(kind)` → `addAccount(kind)`）；
  5. **按钮样式统一**：`+ 账户` 与 `账户详情` 均改为**与「导出 Excel/JSON」同款的红底白字椭圆**
     （`.btn.btn-primary.acct-row-btn`，高 28px / 圆角 14px / 字号 12px，仅按标题行空间收窄），
      原来那个蓝色文字胶囊 `.detail-link` 样式删除；`.acct-group-ops` 与 `.settings-title-row`
      加 `flex-wrap`，窄屏放不下时整组换行而不是溢出。

- **账户详情页删按钮 + 提醒开关挪入标题行**（2026-09-25，第四轮）：
  1. **账户详情页**：删除「手动添加的账户」标题行右侧的 `⚠️说明` 按钮与页面底部的「返回设置」
     按钮（返回走顶部导航栏自带箭头；账户相关说明仍可从设置页 `⚠️说明` 进入），
     `goHelp` / `goBack` 死代码一并移除；
  2. **三类提醒开关上移**：删除「开启每日提醒 / 开启还款提醒 / 开启纪念日提醒」三个独立开关行，
     开关移到各自标题行右侧、**位于 `⚠️说明` 按钮左边**（`.title-ops` 按钮组，开关缩小为
     42×24px 以适配标题行高度），开关功能与点击逻辑不变。

- **总览与设置页增加分组大边框**（2026-09-25，第五轮）：
  1. **家庭财务一览卡片化**：把范围标题、年月筛选、还款提示与 4 个统计块纳入同一个 `.card`，
     外框、圆角、背景和内边距与「年度收支趋势」完全同源；标题改用 `.section-title`，补齐同款红色竖线；
  2. **设置页分成 3 个大框**：数据管理、账户管理各自使用独立 `.settings-panel`；每日记账提醒、
     还款提醒、纪念日提醒共同放入第三个 `.settings-reminder-panel`，保留三项之间的细分隔线。

- **顶部搜索自动识别并跳转结果页**（2026-09-25，第六轮）：
  1. 搜索框占位文字精简为「收支/借还/纪念日」；
  2. 输入关键词后同时检查收支、借还和纪念日的原始数据，唯一命中时自动进入对应页面；多类命中时
     优先停留在当前有结果的页面，否则按明细、借还、纪念日的顺序展示；
  3. 借还支持姓名或机构名及「应收 / 应付」关键词，纪念日支持名称；原有备注、日期等搜索能力保留；
  4. 自动跳页时清除明细年月 / 类型或借还类型等旧筛选，并滚到页面顶部，保证命中项立即可见。

- **四个底部 Tab 只切换、不重新加载**（2026-09-26 改回，撤销上一版的“恢复默认页面”）：
  1. `setPage()` 只做一件事——设置当前页面；不再清空跨页搜索词、不再滚回顶部；
  2. 总览的年月与渠道排行模式、明细的类型 / 年月筛选与月份折叠、借还的类型筛选与卡片展开、
     纪念日的搜索过滤结果，全部保持 App 运行过程中用户上次离开时的状态；
  3. 只有顶部搜索触发的自动跳页才会重置目标页局部筛选并滚回顶部（保证命中项立即可见）；
  4. **滚动位置按 Tab 记忆**：四个 Tab 共用同一个页面，切换时内容高度变化会让 WebView 把
     `scrollTop` 裁剪到「内容高度 − 视口高度」范围——从**没有数据的短页面**切走时该范围就是 0，
     位置会被系统吃掉，表现为「一切换就回到顶部」。因此 `onPageScroll()` 实时记录每个 Tab 的
     `scrollTop`，`setPage()` 切回时再用 `restoreScroll()` 恢复；恢复期间用 `scrollRestoring`
     标志暂停记录，避免切换瞬间的裁剪事件把记忆冲成 0。

- **套壳鸿蒙（华为/荣耀）导入导出兼容**（2026-09-25）：曾把 `targetSdkVersion` 从 33 降到 28
  以绕开 Android 10 套壳环境的分区存储，但这会直接破坏 Android 13+ 可控的通知首授权流程，不能继续采用。
  当前恢复 `targetSdkVersion=33`，同时在 UTS 合并清单的 `<application>` 声明
  `android:requestLegacyExternalStorage="true"`，Android 10 仍在用户点击导入 / 导出时走传统
  `READ/WRITE_EXTERNAL_STORAGE`；Android 11+ 继续走 `MANAGE_EXTERNAL_STORAGE`。旧存储权限仍由 File/Zip
  模块在打包阶段自动注入，不在项目权限数组重复声明，以免再次触发 `WRITE_EXTERNAL_STORAGE duplicated`。

### Git 有效回退版本

| 版本 | versionCode | 回退点 | 主要内容 |
|---|---|---|---|
| 1.0.0 | 100 | 标签 `v1.0.0`（已创建，指向「修复导入列表 + 权限精简」版本） | 四个 Tab、收支 / 借还 / 纪念日 / 设置、三类提醒、Excel / JSON 导入导出、金额两位小数、全实体创建修改时间留痕 |
| 1.0.0 | 100 | 标签 `v1.0.0-notify`（已创建，指向「通知链路修复」版本，提交 `63e3bbe`） | 每日记账提醒补系统闹钟兜底、闹钟实例补 importClass、通知新增原生 NotificationManager + 渠道兜底、修正去重顺序 |
| 1.0.0 | 100 | 标签 `v1.0.0-notify2`（已创建，指向「通知自检入口清理」版本，提交 `4c8dd3d`） | 按用户要求删除设置页「发送测试通知」按钮与 `hasNotifyPermission()`；通知通道恢复 **`plus.push` 优先**（真机实测可用），原生通知仅作兜底 |
| 1.0.0 | 100 | 标签 `v1.0.0-ui`（已创建，指向「设置说明页 + 列表瘦身」版本，提交 `75a67a0`） | 新增说明页 `pages/help`（5 个 topic）与账户详情页 `pages/accounts`；默认账户改小方框 / 手动账户只显示 1 个；三类提醒说明与时间移入说明页；明细行去掉创建修改时间；借还卡片改三行紧凑布局；点「借还」自动复位 |
| 1.0.0 | 100 | 标签 `v1.0.0-ui2`（已创建，指向「纪念日/借还去时间 + 搜索全覆盖 + 账户区整理」版本，提交 `9a19f05`） | 纪念日卡片删除方形图标并精简为「名称 + 备注」；借还展开区去掉时间；搜索框覆盖借还与纪念日；删除设置页 3 处提示行；账户入口统一；手动账户加方框；分组小标题加深 |
| 1.0.0 | 100 | 标签 `v1.0.0-ui3`（已创建，指向「总览卡片瘦身 + 设置页按钮整合」版本） | 总览 4 个统计卡片整体变小（内边距 / 字号 / 装饰圆 / 间距）；导入按钮改红底；删除三个平铺添加按钮，改为「+ 账户」下拉；`+ 账户`、`账户详情` 统一为与导出按钮同款的红底椭圆 |
| 1.0.0 | 100 | 标签 `v1.0.0-ui4`（已创建，指向「删总览标题 + 账户弹窗 + 详情页删按钮 + 开关上移」版本） | 总览页删除「总览」大标题；「+ 账户」由内联下拉改为弹出窗口；账户详情页删除 ⚠️说明 与「返回设置」按钮；三类提醒开关移入标题行（⚠️说明 左侧） |
| 1.0.0 | 100 | 标签 `v1.0.0-ui5`（已创建，指向「总览与设置页增加分组大边框」版本） | 家庭财务一览整体使用趋势卡同款大边框与标题样式；设置页按数据管理、账户管理、三类提醒分成 3 个大框 |
| 1.0.0 | 100 | 标签 `v1.0.0-ui6`（已创建，指向「顶部全局搜索自动跳转」版本） | 搜索框改为“收支/借还/纪念日”；按真实结果自动跳至明细、借还或纪念日页；支持借款姓名/机构名、应收/应付及纪念日名称 |
| 1.0.0 | 100 | 标签 `v1.0.0-notify3`（已创建，指向「Android 13+ 通知首授权修复」版本） | targetSdk 提升到 33；首启创建通知渠道；用真实 API 级别判断；正确解析通知授权结果；补充自定义基座验证要求 |
| 1.0.0 | 100 | 标签 `v1.0.0-ui7`（已创建，指向「四个底部 Tab 恢复默认页面」版本） | 手动点击总览、明细、借还、纪念日均清空搜索、重置该页筛选与展开状态并回到顶部；搜索自动跳页保持结果 |
| 1.0.0 | 100 | 标签 `v1.0.0-notify4`（已创建，指向「进程退出后原生接收器直接通知」版本） | 原生 AlarmManager + 静态 BroadcastReceiver 直接通知；开机/升级恢复计划；数据变化自动同步；取消旧 Activity 闹钟 |
| 1.0.0 | 100 | 标签 `v1.0.0-notify5`（已创建，指向「修复自定义基座权限清单冲突」版本） | 移除与 File/Zip 自动权限重复的 READ/WRITE_EXTERNAL_STORAGE；关闭冷启动存储授权；修复 includePermissions 清单合并失败 |
| 1.0.0 | 100 | 标签 `v1.0.0-harmony-shell`（已创建，指向「套壳鸿蒙导入导出修复」版本） | 曾把 `targetSdkVersion` 33→28 以尝试兼容 Android 10 套壳存储；该历史版本不包含本轮 Android 13+ 通知首授权修复 |
| 1.0.0 | 100 | 标签 `v1.0.0-excel-json-parity`（已创建，指向「Excel/JSON 数据对齐 + 空数据防呆」版本） | Excel 导出由 3 表扩展为 8 表，与 JSON 完整备份完全等价（新增手动账户 / 三类提醒 / 纪念日）；Excel/CSV 导入改走 `applyImportData` 整体替换，文件含部分板块则仅替换所含板块；导出 / 导入均增加空数据拦截（暂无数据 / 导入为空均提示） |
| 1.0.0 | 100 | 标签 `v1.0.0-reminder-exact`（已创建，指向「后台提醒精确闹钟 + 电池白名单引导」版本） | `FamilyLedgerReminderScheduler.scheduleOne` 升级为 `setExactAndAllowWhileIdle`；声明精确闹钟权限并增加电池白名单引导 |
| 1.0.0 | 100 | 标签 `v1.0.0-notify-fix`（已创建，指向「通知权限判断 + 实例桥接 + 自检入口」历史版本） | Native.js 通知实例桥接修复；该历史版本仍含已被本轮删除的通知自检与低 targetSdk 权限策略 |
| 1.0.0 | 100 | 标签 `v1.0.0-notify6`（已创建，指向「首装系统通知授权 + 离线提醒接收器入包」版本） | targetSdk 恢复 33；通知权限仅在首次冷启动申请；删除设置页通知自检与开关权限弹窗；经典 uni-app 改用 `APP-PLUS` 保留 UTS 调用；补齐静态接收器和精确闹钟声明；已实测进程退出后到点通知 |
| 1.0.0 | 100 | 标签 `v1.0.0-notify7`（已创建，指向「首次授权错过到点后的系统通知补发」版本） | 原生层按日期记录真实成功投递；权限未授予不误记成功；授权完成后重新同步并补发当天漏掉的每日通知；正常到点已成功时不重复 |
| 1.0.0 | 100 | 标签 `v1.0.0-notify8`（已创建，指向「通知专用图标与品牌色」版本） | 新增 Android 单色账本通知图标；通知强调色改为家庭账本红；原生通知附带完整彩色应用大图标；修复启动图标被强制蒙版后显示残缺灰块 |
| 1.0.0 | 100 | 标签 `v1.0.0-reminder-startup`（已创建，指向「每日启动提醒 + 弹窗 5 秒自动关闭」版本，提交 `b98dba3`） | 每日提醒开启后每次冷启动 App 都显示应用内提醒，不再受设置时间限制；总览页三类提醒弹窗保留手动关闭并新增 5 秒自动关闭 |
| 1.0.0 | 100 | 标签 `v1.0.0-repay-zerodue`（已创建，指向「还款提醒零应还也提醒 + 短月收敛」版本，提交 `0779fd1`） | 历史版本：曾让本期应还为 0 的账户也出提醒条（文案「本期暂无应还」）。**该行为已被下一版撤销**——本期没欠款就不提醒。仅保留「还款日已过顺延下月」与「短月收敛到月末」两条修复 |
| 1.0.0 | 100 | 标签 `v1.0.0-repay-nozero-tabkeep`（已创建，指向「零欠款不提醒 + Tab 不重载」版本，提交 `36b8028`） | 按用户纠正：`creditRepayMap` 恢复 `if (total <= 0) return`，本期账单周期内无支出则不生成提醒条；同时撤销底部 Tab 切换时的页面重载——`setPage()` 只切页，保留搜索 / 筛选 / 展开。滚动位置记忆见下一版 |
| 1.0.0 | 100 | 标签 `v1.0.0-tab-scroll-keep`（已创建，指向「Tab 滚动位置记忆」版本，提交 `05362d0`） | 新增 `onPageScroll` + `scrollMemo` + `restoreScroll()`：按 Tab 记忆并恢复滚动位置，修复「从无数据的短页面切走后再切回被强制回顶部」；恢复期间用 `scrollRestoring` 暂停记录 |
| 1.0.0 | 100 | 标签 `v1.0.0-repay-recalc`（**内容已整体撤销，勿用此回退点**） | 曾改为「改渠道后重算 + 未来日期支出不计入 + `creditRepayTrace` 诊断」，按用户要求已用 revert 撤销（撤销提交见下一条）。想回到该实验版本可用 `git show v1.0.0-repay-recalc`，但当前有效基线是 `v1.0.0-tab-scroll-keep` |
| 1.0.0 | 100 | 标签 `v1.0.0-repay-cycle`（已创建，指向「还款账单周期口径修正（情况 A/B）」版本） | 新增 `billCycleOfRepayDate()`：由还款日反推所属账单周期，本期应还 = 上一期账单日（含）～ 本期账单日前一天。情况 A（账单日 5/还款日 20 → 9-20 还 8-05～9-04）与情况 B（账单日 25/还款日 10 → 10-10 还 8-25～9-24）统一覆盖；`txn-edit.vue` 新增 `applyAccountCycle()`，载入/切换/延迟加载都按账户自身账期回填，不再用默认 5/20 算错账期；说明页补充口径说明 |
| 1.0.0 | 100 | 标签 `v1.0.0-repay-accdetail`（已创建，指向「还款条总额 + 逐账户金额（默认 2 行可展开）」版本） | `creditRepayMap()` 的 `accounts` 升级为 `[{ name, amount }]`；首页还款条先显示还款总计（`.cb-total`），再逐行列出每个账户需还金额（`.cb-acc`，按金额降序），明细默认只显示 2 行（`REPAY_ACC_LIMIT`），超出出现「展开全部 N 个账户」可点开/收起；冷启动弹窗与 12:00 通知栏同步带逐账户金额 |
| 1.0.0 | 100 | 标签 `v1.0.0-repay-accdetail-fix`（已创建，指向「修复还款条展开方法误放 computed 导致基座报 is not a function」版本，提交 `ca57f95`） | 根因：`visibleAccounts` / `toggleRepayMore` 被误写在 `computed` 块，模板带参调用时渲染出函数对象 → 真机自定义基座报 `TypeError: visibleAccounts is not a function` 并伴随 `accounts accessed during render but is not defined` 告警。修复：两方法移入 `methods`，`REPAY_ACC_LIMIT` 改读 `this.REPAY_ACC_LIMIT`；校验脚本 `check-refs.mjs` 新增「模板带参调用必须声明在 methods」与「data/computed 同名冲突」两类检查 |
| 1.0.0 | 100 | 标签 `v1.0.0-repay-bar-layout`（已创建，指向「还款条改版：第一行总计需还款 + 每行账户(还款日)金额，默认 3 行可展开」版本） | `creditRows` 由「按还款日分组」改为 `{ total, items }` 扁平结构；`items` 按还款日从近到远、同日按金额降序。模板：第一行 `💳 总计需还款：¥X`（`.cb-head` / `.cb-total`），第二行起每行「到期状态 `.cb-status`（今天到期反白红底）+ 账户名 `(MM/DD)` + 金额」，整条默认 3 行（`REPAY_ACC_LIMIT = 2` + `visibleRepayItems()`），超出出现「展开全部 N 个账户」（`toggleRepay()` / `repayOpen`）。`App.vue` 重构 `.credit-banner` 为纵向布局并新增对应样式、清理 `.cb-row`/`.cb-acc*`/`.cb-days`/`.cb-strong` 等旧类 |
| 1.0.0 | 100 | 标签 `v1.0.0-overview-head`（已创建，指向「总览标题去前缀 + 还款条上移到筛选行上方」版本） | 总览卡片标题由 `{{ scopeName }} · 家庭财务一览` 改为固定文案「家庭财务一览」（不再带「2026 年 6 月 ·」前缀，当前范围由筛选按钮与「共 N 笔」体现）；还款提醒条从筛选行下方**上移到筛选行上方**，顺序为「标题 → 还款条（有才显示）→ 年份/月份筛选行 → 统计卡片」。`scopeName` 计算属性保留（筛选行仍用） |
| 1.0.0 | 100 | 标签 `v1.0.0-popup-no-credit`（已创建，指向「冷启动弹窗移除还款提醒」版本） | 冷启动弹窗（`collectAlerts`）不再显示还款提醒，只保留「每日记账」与「纪念日」两类提醒；还款提醒仍正常出现在首页还款提醒条与每天中午 12:00 的通知栏。说明页「还款提醒」段同步删去「冷启动弹窗」描述，改为明确「只进还款条 + 通知栏，不进冷启动弹窗」。测试台 S10/S19 断言同步 |
| 1.0.0 | 100 | 标签 `v1.0.0-channel-sort`（已创建，指向「支出渠道排行按金额从多到少排序」版本） | `index.vue` 的 `channelRows()` 由「现金 → 5 类目固定顺序 → 其他 → 未归类」改为**全部行按当月支出金额降序**排列（`groups.sort((a,b) => b.value - a.value)`）。为不拆散「明细」模式下的父子行，排序粒度改为**块**：`{ value, rows }`，明细类的父行 + 各子账户行打包成一个块按合计金额比大小，块内顺序不变。0 元渠道自然沉底，金额相同时保持原有相对顺序。说明页「支出渠道排行」补排序说明；测试台新增 S21 断言 |
| 1.0.0 | 100 | 标签 `v1.0.0-no-notify`（已创建，指向「移除通知栏提醒链路」版本） | 按用户要求**整体移除通知栏提醒**：删除 `notify.js` / `system-reminder.js` / `autostart.js` / `uni_modules/family-ledger-reminder`；冷启动不再申请任何权限（含通知），删除「自启动 + 电池优化」引导与「后台运行 / 通知授权」系统弹窗；删除每日定时通知与每天中午 12:00 汇总通知；设置页删除「提醒时间」选择器。保留 App 内提醒：冷启动弹窗（每日记账 + 纪念日）与首页还款提醒条。`manifest.json` 移除 Push 模块与通知/闹钟/自启动相关权限；`AndroidManifest.xml` 只保留 `requestLegacyExternalStorage` |
| 1.0.0 | 100 | 标签 `v1.0.0-manifest-xml`（本次提交后创建，指向「修复云打包 XML 注释语法」版本） | 将根清单注释中的连续 ASCII 短横线分隔符改为等号，修复云端 `simplexml_load_file(): Comment must not contain '--'`；不改变任何权限或应用配置 |

查询命令（提交哈希依赖 README 内容，故此处不写死自身哈希，用标签与命令查询）：
```bash
git tag -l                                        # 列出所有版本标签
git show -s --format="%h %s" v1.0.0               # 查看标签指向的提交
git log --oneline -10                             # 查看最近提交历史
git checkout v1.0.0                               # 回退到该版本（回退前先导出 JSON 备份）
```
