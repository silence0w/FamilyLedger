/* =========================================================
 * 常量定义（与 HTML 版完全一致）
 * ========================================================= */

/* 分类（含「家庭」） */
export const CATS = {
  income: ['工资', '奖金', '投资收益', '兼职', '红包', '家庭', '其他'],
  expense: ['餐饮', '交通', '购物', '居住', '家庭', '娱乐', '医疗', '教育', '人情', '其他']
}

/* 账户 type 取值：
 *   builtin  内置独立账户（下方 BUILTIN_ACCOUNTS，落库的真实账户）
 *   credit   信用卡（手动添加，带账单日 / 还款日）
 *   debit    银行卡 / App支付渠道（手动添加）
 * kind（仅手动账户）：credit 信用卡 / bank 银行卡 / app App支付渠道
 */

/* 内置独立账户（落库的真实账户，共 7 个）
 * 说明：它们各自只是一个「单独的账户」，与手动添加的账户（信用卡 / 银行卡 / App支付渠道）
 *       完全平级、互不干涉，可直接在「记一笔」里作为收支归属账户选择。
 * 旧版本遗留的「花呗」会在启动迁移时转为手动账户「信用卡：花呗」。 */
export const BUILTIN_ACCOUNTS = [
  '现金',
  '信用卡',
  '银行卡（非信用卡）',
  'app-支付宝',
  'app-微信',
  'app-云闪付',
  '其他'
]

/* 自维护账户类别标签 */
export const ACCOUNT_KIND_LABELS = {
  credit: '信用卡',
  bank: '银行卡',
  app: 'App支付渠道'
}

/* 内置独立账户的徽标文案（与手动添加的账户互不干涉） */
export const BUILTIN_BADGE = '独立账户'

/* 账户名称前缀（设置页维护的账户，名称统一带前缀，便于按前缀归类汇总） */
export const CREDIT_PREFIX = '信用卡：'
export const BANK_PREFIX = '银行卡（非信用卡）：'
export const CREDIT_TAG = '信用卡'
export const BANK_TAG = '银行卡（非信用卡）'

/* App支付渠道内置 app 名称（添加 App 支付渠道时选择） */
export const APP_CHANNEL_NAMES = [
  'app-支付宝', 'app-微信', 'app-云闪付', 'app-京东',
  'app-美团', 'app-抖音', 'app-滴滴', 'app-其他'
]

/* 渠道排行（总览页「支出渠道排行」）
 * FIXED：固定独立行，不参与「汇总 / 明细」切换，始终单独显示
 *   head 最前，tail 排在未归类的手动渠道之前
 * TOGGLE：带子账户的类目，按钮可各自独立切换「汇总 / 明细」
 *   key    —— 类目名（同时是内置独立账户名）
 *   prefix —— 归类用的名称前缀：凡以该前缀开头的账户都归入此类目
 */
export const CHANNEL_FIXED_HEAD = ['现金']
export const CHANNEL_FIXED_TAIL = ['其他']

export const CHANNEL_CATS = [
  { key: CREDIT_TAG, label: '信用卡', prefix: CREDIT_TAG },
  { key: '银行卡', label: '银行卡', prefix: '银行卡' },
  { key: 'app-支付宝', label: '支付宝', prefix: 'app-支付宝' },
  { key: 'app-微信', label: '微信', prefix: 'app-微信' },
  { key: 'app-云闪付', label: '云闪付', prefix: 'app-云闪付' }
]

/* 各大银行（设置里添加信用卡时选择发卡行） */
export const CREDIT_BANKS = [
  '招商银行', '工商银行', '建设银行', '农业银行', '中国银行', '交通银行',
  '邮储银行', '中信银行', '浦发银行', '民生银行', '兴业银行', '光大银行',
  '平安银行', '广发银行', '华夏银行', '北京银行', '上海银行', '宁波银行'
]

/* 环形占比图配色 */
export const PIE_COLORS = [
  '#C20C0C', '#E64C4C', '#F0854D', '#F0B429', '#8CBF3F', '#1BA784',
  '#2E9BA6', '#3B7DD8', '#6B5BD2', '#A855C9', '#D2568C', '#8D6E63',
  '#7C8B99', '#B9A78F'
]

/* 纪念日头像调色板（按名称哈希取色） */
export const ANNIV_COLORS = [
  '#E64C4C', '#3B7DD8', '#1BA784', '#F0854D',
  '#A855C9', '#D2568C', '#2E9BA6', '#F0B429'
]

/* 本地导出 / 导入目录（用户要求：安卓根目录 Download/家庭账本）
 * 2026-09-24：**只识别这一个目录**，旧目录「Download/家庭记账本」的兼容扫描已移除 */
export const EXPORT_DIR_NAME = '家庭账本'

/* 数据库名（围绕项目名 FamilyLedger） */
export const DB_NAME = 'FamilyLedger'
export const DB_PATH = '_doc/FamilyLedger.db'

/* 设置默认值
 * 说明：reminder 的 time / lastDate 是「通知栏定时提醒」时代的遗留字段，
 * 通知栏链路已于 2026-09-26 整体移除，这两个字段不再影响任何行为，
 * 保留定义只为兼容历史备份文件（导出 / 导入结构不变）。 */
export const DEFAULT_SETTINGS = {
  reminder: { enabled: false, time: '20:00', lastDate: '' },
  creditReminder: { enabled: true, days: 3, notified: [] },
  annivReminder: { enabled: true, days: 3, notified: [] }
}

export const CREDIT_REMIND_DAY_OPTIONS = [1, 2, 3, 5, 7, 10]
export const ANNIV_REMIND_DAY_OPTIONS = [1, 2, 3, 5, 7, 10, 15, 30]
