/* =========================================================
 * 业务派生逻辑（与 HTML 版一致）
 * ========================================================= */
import { store } from './store.js'
import { localDate, pad, daysBetween, daysInMonth, addDays, round2 } from './utils.js'
import { nextLunarAnniv, LUNAR_MONTH_NAMES, LUNAR_DAY_NAMES } from './lunar.js'

/* ---------- 借款 ----------
 * 金额一律 round2 收敛到「分」，避免浮点累加误差（如 0.1+0.2=0.30000000000000004）
 * 顺着借还列表、还款页预填输入框一路传播出去。 */
export const repaidOf = (l) =>
  round2((l.repayments || []).reduce((a, r) => a + (Number(r.amount) || 0), 0))
export const remainOf = (l) => round2(Math.max(0, (Number(l.amount) || 0) - repaidOf(l)))
export const addonsOf = (l) => l.addons || []

/* ---------- 信用卡账单日 / 还款日推算 ---------- */
export function calcBillDate(dateStr, billDay) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  let by = y
  let bm = m
  if (d >= billDay) {
    bm++
    if (bm > 12) {
      bm = 1
      by++
    }
  }
  const bd = Math.min(billDay, daysInMonth(by, bm))
  return `${by}-${pad(bm)}-${pad(bd)}`
}

export function calcRepayDate(dateStr, billDay, repayDay) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  let by = y
  let bm = m
  if (d >= billDay) {
    bm++
    if (bm > 12) {
      bm = 1
      by++
    }
  }
  let ry = by
  let rm = bm
  if (repayDay < billDay) {
    rm++
    if (rm > 12) {
      rm = 1
      ry++
    }
  }
  const rd = Math.min(repayDay, daysInMonth(ry, rm))
  return `${ry}-${pad(rm)}-${pad(rd)}`
}

/* ---------- 纪念日 ---------- */
export function annivDateLabel(a) {
  if (a.calendar === 'lunar') {
    const mName = LUNAR_MONTH_NAMES[(a.lunarMonth || 1) - 1] || ''
    const dName = LUNAR_DAY_NAMES[(a.lunarDay || 1) - 1] || ''
    return `农历${a.lunarLeap ? '闰' : ''}${mName}${dName}`
  }
  return a.date || ''
}

export function annivNextDate(a) {
  if (a.calendar === 'lunar') {
    if (!a.repeat) return a.date || ''
    if (!a.lunarMonth || !a.lunarDay) return ''
    return nextLunarAnniv(a.lunarMonth, a.lunarDay, !!a.lunarLeap)
  }
  const parts = String(a.date || '').split('-').map(Number)
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return ''
  const [y, m, d] = parts
  if (!a.repeat) return a.date

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const build = (yr) => {
    const dd = new Date(yr, m - 1, Math.min(d, daysInMonth(yr, m)))
    dd.setHours(0, 0, 0, 0)
    return dd
  }
  let nd = build(today.getFullYear())
  if (nd.getTime() < today.getTime()) nd = build(today.getFullYear() + 1)
  return localDate(nd)
}

export function annivDaysLeft(a) {
  const next = annivNextDate(a)
  if (!next) return 9999
  return daysBetween(localDate(), next)
}

/* ---------- 年月筛选选项 ---------- */
export function availableYears() {
  const set = new Set()
  store.txns.forEach((t) => {
    if (t.date) set.add(String(t.date).slice(0, 4))
  })
  store.loans.forEach((l) => {
    if (l.date) set.add(String(l.date).slice(0, 4))
  })
  store.anniversaries.forEach((a) => {
    if (a.date) set.add(String(a.date).slice(0, 4))
  })
  set.add(String(new Date().getFullYear()))
  return [...set].filter((y) => /^\d{4}$/.test(y)).sort((a, b) => b.localeCompare(a))
}

export function monthOptions() {
  const arr = []
  for (let i = 1; i <= 12; i++) arr.push({ value: i, label: `${i} 月` })
  return arr
}

export function statMonthOptions() {
  const arr = [{ value: 0, label: '全年' }]
  for (let i = 1; i <= 12; i++) arr.push({ value: i, label: `${i} 月` })
  return arr
}

export function dayOptions() {
  const arr = []
  for (let i = 1; i <= 31; i++) arr.push({ value: i, label: `${i} 日` })
  return arr
}

/* 常用对方标签 */
export function partyOptions(type) {
  const set = []
  store.loans.filter((l) => l.type === type).forEach((l) => {
    if (l.party && !set.includes(l.party)) set.push(l.party)
  })
  return set
}

/* 汇总：应收 / 应付 */
export function loanSummary() {
  const lends = store.loans.filter((l) => l.type === 'lend')
  const borrows = store.loans.filter((l) => l.type === 'borrow')
  return {
    lends,
    borrows,
    recv: round2(lends.reduce((a, l) => a + remainOf(l), 0)),
    pay: round2(borrows.reduce((a, l) => a + remainOf(l), 0))
  }
}

/* ---------- 月度日期推算 ---------- */
/* 今天之前（含今天）最近的一个每月 day 日，如 今天=2026-09-24、day=1 → 2026-09-01 */
export function lastMonthlyOnOrBefore(todayStr, day) {
  const [y, m, d] = String(todayStr).split('-').map(Number)
  if (d >= day) return `${y}-${pad(m)}-${pad(Math.min(day, daysInMonth(y, m)))}`
  let py = y
  let pm = m - 1
  if (pm < 1) {
    pm = 12
    py--
  }
  return `${py}-${pad(pm)}-${pad(Math.min(day, daysInMonth(py, pm)))}`
}

/* 今天之后（含今天）最近的一个每月 day 日，如 今天=2026-09-24、day=9 → 2026-10-09 */
export function nextMonthlyOnOrAfter(todayStr, day) {
  const [y, m, d] = String(todayStr).split('-').map(Number)
  if (d <= day) return `${y}-${pad(m)}-${pad(Math.min(day, daysInMonth(y, m)))}`
  let ny = y
  let nm = m + 1
  if (nm > 12) {
    nm = 1
    ny++
  }
  return `${ny}-${pad(nm)}-${pad(Math.min(day, daysInMonth(ny, nm)))}`
}

/* 「有账单日 + 还款日」的账户（信用卡；银行卡/App支付渠道启用账单日/还款日的也算） */
export function accountsWithBillCycle() {
  return (store.accounts || []).filter((a) => a.billDay && a.repayDay)
}

/* 名义还款日 repayDay 是否落在 [today, limit] 窗口内（短月收敛补偿用）。
 * 【仅用于补偿短月】正常情况由 nextMonthlyOnOrAfter 得到的实际日期判断即可；
 * 只有当「实际还款日超出窗口」时才调用本函数复核：
 *   - 若该月存在 repayDay（repayDay <= 当月天数），说明确实超出窗口 → false；
 *   - 若该月不存在 repayDay（repayDay > 当月天数，如 2 月的 30 号），
 *     说明实际日期被收敛到了月末，用户预期就该在月末还 → 只要该月末日 <= limit 就算命中。 */
export function repayDayInWindow(todayStr, limitStr, repayDay) {
  const day = Number(repayDay)
  if (!(day >= 1 && day <= 31)) return false
  const [ty, tm] = String(todayStr).split('-').map(Number)
  const dim = daysInMonth(ty, tm)
  /* 当月存在该日：说明实际日期就是 repayDay，超出窗口即真的超出，不补偿 */
  if (day <= dim) return false
  /* 当月不存在该日（短月）：实际还款日收敛为当月最后一天，判断它是否在窗口内 */
  const lastDayOfMonth = `${ty}-${pad(tm)}-${pad(dim)}`
  return lastDayOfMonth >= todayStr && lastDayOfMonth <= limitStr
}

/* 由「还款日」反推它所对应的账单周期（含两端）：{ billStart, billEnd, billDate }
 *   - 本期账单日 billDate = 还款日之前（含当天）最近的那个账单日；
 *   - 本期账单周期 = 上一期账单日（含） ~ 本期账单日前一天。
 * 两种情形由同一套算法自然覆盖，无需分支：
 *   情况 A（还款日 > 账单日，同月还）：账单日 5 / 还款日 20
 *           还款日 9-20 → 本期账单日 9-05 → 应还 8-05 ~ 9-04
 *   情况 B（还款日 < 账单日，次月还）：账单日 25 / 还款日 10
 *           还款日 10-10 → 本期账单日 9-25（自动退到上月）→ 应还 8-25 ~ 9-24
 * 短月（账单日 31 号遇上 2 月）由 Math.min(day, daysInMonth) 收敛到月末，周期照常闭合。 */
export function billCycleOfRepayDate(repayDate, billDay) {
  const billDate = lastMonthlyOnOrBefore(repayDate, billDay)
  const billEnd = addDays(billDate, -1)
  const billStart = lastMonthlyOnOrBefore(billEnd, billDay)
  return { billStart, billEnd, billDate }
}

/* 汇总：信用卡还款提醒条数据：{ 'YYYY-MM-DD': { total, accounts:[{name, amount}] } }
 * accounts 里既保留账户名，也带该账户本期需还金额（总览还款条要逐账户显示）。
 * 【逻辑说明】基于「信用账户」的账单日/还款日（提前 n 天提醒）：
 *   - 还款日 = 距今最近的每月 repayDay（若本月该日已过，自动顺延到下月）；
 *   - 本期应还 = 该还款日所属账单周期内的该账户支出合计，
 *     即「上一期账单日（含） ~ 本期账单日前一天」（见 billCycleOfRepayDate）；
 *   - **本期应还为 0 不提醒**（用户明确要求）：本期账单周期内该账户
 *     没有任何支出，说明本期没有欠款，就不生成提醒条，避免出现
 *     「还款 ¥0.00」这类无效打扰。
 *   - **短月收敛**：还款日 30 号遇到 2 月只有 28 天时，实际还款日收敛为 2-28
 *     （闰年 2-29、4 月 31 号 → 4-30）。收敛只影响展示日期，
 *     「提前 n 天」的窗口判断仍以名义还款日为准，由 repayDayInWindow() 复核：
 *     当月不存在该名义日时，用当月最后一天参与窗口判断。
 * 凡录入的信用账户带有账单日 + 还款日，且本期有应还，才纳入提醒。 */
export function creditRepayMap(days) {
  const today = localDate()
  const limit = addDays(today, days)
  const map = {}

  accountsWithBillCycle().forEach((acc) => {
    const repayDate = nextMonthlyOnOrAfter(today, acc.repayDay)
    if (repayDate < today || repayDate > limit) {
      /* 短月收敛补偿：实际还款日超出窗口，但名义还款日（repayDay 本身）可能仍在窗口内。
       * 例：今天 2-25、提前 1 天（limit 2-26）、还款日 30 → 实际 2-28 超窗口，
       * 但 2 月没有 30 号，用户预期就是"月末还款"，应照常提醒。 */
      const nominalInWindow = repayDayInWindow(today, limit, acc.repayDay)
      if (!nominalInWindow) return
    }
    /* 由还款日反推本期账单周期，统计该周期内的支出（情况 A / 情况 B 通用） */
    const { billStart, billEnd } = billCycleOfRepayDate(repayDate, acc.billDay)
    const total = store.txns
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.account === acc.name &&
          String(t.date) >= billStart &&
          String(t.date) <= billEnd
      )
      .reduce((a, t) => a + (Number(t.amount) || 0), 0)
    /* 本期没有欠款就不提醒 */
    if (total <= 0) return
    if (!map[repayDate]) map[repayDate] = { total: 0, accounts: [] }
    map[repayDate].total = round2(map[repayDate].total + total)
    const exist = map[repayDate].accounts.find((a) => a.name === acc.name)
    if (exist) exist.amount = round2(exist.amount + total)
    else map[repayDate].accounts.push({ name: acc.name, amount: round2(total) })
  })

  /* 兼容：历史交易记录里带 repayDate（推算值）的也纳入，避免升级后漏提醒 */
  store.txns.forEach((t) => {
    if (t.type !== 'expense') return
    if (!t.repayDate) return
    if (t.repayDate < today || t.repayDate > limit) return
    const acc = accountOf(t.account)
    if (acc && acc.billDay && acc.repayDay) return /* 已按账户维度算过 */
    const k = t.repayDate
    const amt = Number(t.amount) || 0
    if (!map[k]) map[k] = { total: 0, accounts: [] }
    map[k].total = round2(map[k].total + amt)
    const nm = t.account || '信用账户'
    const exist = map[k].accounts.find((a) => a.name === nm)
    if (exist) exist.amount = round2(exist.amount + amt)
    else map[k].accounts.push({ name: nm, amount: round2(amt) })
  })

  return map
}

function accountOf(name) {
  if (!name) return null
  return (store.accounts || []).find((a) => a.name === name) || null
}
