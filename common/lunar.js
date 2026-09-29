/* =========================================================
 * 农历（1900 - 2100）—— 与 HTML 版完全一致
 * ========================================================= */
import { localDate } from './utils.js'

export const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520
]

export const LUNAR_MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
export const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
]

export function lunarLeapMonth(y) {
  if (y < 1900 || y > 2100) return 0
  return LUNAR_INFO[y - 1900] & 0xf
}
export function lunarLeapDays(y) {
  if (lunarLeapMonth(y)) return (LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29
  return 0
}
export function lunarMonthDays(y, m) {
  if (y < 1900 || y > 2100 || m < 1 || m > 12) return 30
  return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29
}
export function lunarYearDays(y) {
  if (y < 1900 || y > 2100) return 365
  let sum = 348
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0
  }
  return sum + lunarLeapDays(y)
}

/* 农历 → 公历（返回 {year, month, day}，本地时间；无效返回 null） */
export function lunarToSolar(ly, lm, ld, isLeap) {
  if (ly < 1900 || ly > 2100) return null
  if (lm < 1 || lm > 12) return null

  const leap = lunarLeapMonth(ly)
  if (isLeap && leap !== lm) return null

  let offset = 0
  for (let y = 1900; y < ly; y++) offset += lunarYearDays(y)

  let found = false
  let dayCount = 0

  for (let m = 1; m <= 12; m++) {
    if (m === lm && !isLeap) {
      dayCount = Math.min(ld, lunarMonthDays(ly, m))
      found = true
      break
    }
    offset += lunarMonthDays(ly, m)
    if (leap === m) {
      if (m === lm && isLeap) {
        dayCount = Math.min(ld, lunarLeapDays(ly))
        found = true
        break
      }
      offset += lunarLeapDays(ly)
    }
  }

  if (!found) return null

  offset += dayCount - 1
  const base = new Date(1900, 0, 31).getTime()
  const t = new Date(base + offset * 86400000)
  return { year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate() }
}

/* 下一次农历纪念日的公历日期；未找到返回 '' */
export function nextLunarAnniv(lm, ld, isLeap) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const gy = today.getFullYear()
  for (let y = gy; y <= gy + 30; y++) {
    if (isLeap && lunarLeapMonth(y) !== lm) continue
    const sol = lunarToSolar(y, lm, ld, isLeap)
    if (!sol) continue
    const d = new Date(sol.year, sol.month - 1, sol.day)
    d.setHours(0, 0, 0, 0)
    if (d.getTime() >= today.getTime()) return localDate(d)
  }
  return ''
}
