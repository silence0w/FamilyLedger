/* =========================================================
 * 全局响应式状态（页面间共享）
 * ========================================================= */
import { reactive } from 'vue'
import { DEFAULT_SETTINGS, BUILTIN_ACCOUNTS } from './constants.js'

function clone(o) {
  return JSON.parse(JSON.stringify(o))
}

export const store = reactive({
  ready: false,
  txns: [],
  loans: [],
  accounts: [],
  anniversaries: [],
  settings: clone(DEFAULT_SETTINGS),

  /* 各设置项的创建 / 修改时间（key → { createTime, modifyTime }），
   * 由 loadAll 从 fl_setting 的 create_time / modify_time 列回填 */
  settingMeta: {},

  /* 提醒弹窗状态（冷启动时由 reminder.js 填充） */
  alerts: [],
  alertVisible: false
})

/* 读取设置（保证结构完整） */
export function getSettings() {
  if (!store.settings) store.settings = clone(DEFAULT_SETTINGS)
  const s = store.settings
  if (!s.reminder) s.reminder = clone(DEFAULT_SETTINGS.reminder)
  if (!s.creditReminder) s.creditReminder = clone(DEFAULT_SETTINGS.creditReminder)
  if (!s.annivReminder) s.annivReminder = clone(DEFAULT_SETTINGS.annivReminder)
  if (!Array.isArray(s.creditReminder.notified)) s.creditReminder.notified = []
  if (!Array.isArray(s.annivReminder.notified)) s.annivReminder.notified = []
  if (!store.settingMeta || typeof store.settingMeta !== 'object') store.settingMeta = {}
  return s
}

/* 账户相关 */
export function getAccounts() {
  return store.accounts || []
}

export function accountByName(name) {
  if (!name) return null
  return getAccounts().find((a) => a.name === name) || null
}

export function creditAccounts() {
  return getAccounts().filter((a) => a.type === 'credit')
}

/* 内置独立账户：按 BUILTIN_ACCOUNTS 的固定顺序返回（现金 / 信用卡 / 银行卡（非信用卡）/ app-支付宝 / app-微信 / app-云闪付 / 其他） */
export function builtinAccounts() {
  const order = BUILTIN_ACCOUNTS
  return getAccounts()
    .filter((a) => BUILTIN_ACCOUNTS.indexOf(a.name) >= 0)
    .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
}

/* 手动维护的账户（信用卡 / 银行卡 / App支付渠道，含历史遗留账户）：不含内置独立账户，按名称排序 */
export function managedAccounts() {
  return getAccounts()
    .filter((a) => BUILTIN_ACCOUNTS.indexOf(a.name) < 0)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh'))
}

/* 「记一笔」账户下拉：内置独立账户（固定顺序）在前，手动添加的账户（按名称）在后 */
export function accountOptions() {
  return builtinAccounts().concat(managedAccounts())
}
