/* =========================================================
 * 工具函数（与 HTML 版逻辑一致）
 * ========================================================= */
import { ANNIV_COLORS } from './constants.js'

export const pad = (n) => String(n).padStart(2, '0')

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

/* 本地日期 YYYY-MM-DD */
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/* 精确到秒的时间戳 YYYYMMDD_HHMMSS */
export function timestamp() {
  const d = new Date()
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

/* 金额格式化：固定两位小数（元角分）+ 千分位
 *   52      → ¥52.00
 *   1234.5  → ¥1,234.50
 *   -8.006  → ¥-8.01
 * 【为什么不用 toLocaleString】
 *   安卓 WebView 的 ICU 数据不完整时，会静默忽略 minimumFractionDigits /
 *   maximumFractionDigits 两个 options，直接把浮点误差原样吐出来
 *   （如 income-expense 得到的 8708.470000000001 会显示成 ¥8708.470000000001）。
 *   这里改为纯字符串实现，任何平台结果都一致。 */
export function money(n) {
  const v = round2(n)
  const fixed = isFinite(v) ? v.toFixed(2) : '0.00'
  const neg = fixed.charAt(0) === '-'
  const body = neg ? fixed.slice(1) : fixed
  const dot = body.indexOf('.')
  const intPart = body.slice(0, dot)
  const decPart = body.slice(dot + 1)
  let out = ''
  for (let i = 0; i < intPart.length; i++) {
    if (i > 0 && (intPart.length - i) % 3 === 0) out += ','
    out += intPart.charAt(i)
  }
  return '¥' + (neg ? '-' : '') + out + '.' + decPart
}

/* 日期加减 */
export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return localDate(d)
}

/* 天数差（b - a） */
export function daysBetween(a, b) {
  const d1 = new Date(a + 'T00:00:00')
  const d2 = new Date(b + 'T00:00:00')
  return Math.round((d2 - d1) / 86400000)
}

export function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate()
}

/* ISO 时间串 → 本地可读时间 YYYY-MM-DD HH:mm:ss（精确到秒；无浏览器 API，手算避免时区/平台差异） */
export function fmtDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)
  const p = (n) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  )
}

/* 金额保留 2 位（避免浮点误差） */
export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

/* 纪念日头像颜色 */
export function annivColor(title) {
  const s = String(title || '')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return ANNIV_COLORS[h % ANNIV_COLORS.length]
}

/* 数字区间 */
export function clamp(n, min, max) {
  const v = Number(n) || 0
  return Math.min(Math.max(v, min), max)
}

/* =========================================================
 * 金额输入防呆归一化
 * 失焦时调用：自动纠正为「保留两位小数」的合法金额字符串
 *   "11111"   → "11111.00"
 *   "1.5"     → "1.50"
 *   "1.567"   → "1.57"
 *   "12.3.4"  → "12.34"   （多余的第二个小数点被丢掉）
 *   "abc"     → ""        （清空，避免留着非法串）
 *   "0"       → "0.00"
 * ========================================================= */
export function normalizeAmount(input) {
  let s = String(input == null ? '' : input).trim()
  if (!s) return ''
  /* 只保留数字与小数点（连字符、空格、货币符等一律去掉，金额不允许为负） */
  s = s.replace(/[^\d.]/g, '')
  const firstDot = s.indexOf('.')
  if (firstDot >= 0) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
  }
  if (!s || s === '.') return ''
  const n = parseFloat(s)
  if (!isFinite(n)) return ''
  return (Math.round(n * 100) / 100).toFixed(2)
}

/* 轻提示 */
let toastTimer = null
export function showToast(msg) {
  // 使用 uni 原生 toast，避免各页面重复实现
  uni.showToast({ title: msg, icon: 'none', duration: 1800 })
  return toastTimer
}
