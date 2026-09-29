/* =========================================================
 * 提醒中心（仅 App 内提醒）
 *
 * 当前能力：**冷启动弹窗提醒**（每日记账 / 纪念日）
 *   - 数据源：设置页「每日记账提醒」「纪念日提醒」两个开关
 *   - 展示位置：总览页顶部弹窗（`store.alerts` / `store.alertVisible`）
 *
 * 【2026-09-26 重要变更】通知栏提醒链路已按用户要求**整体移除**：
 *   - 删除「每天中午 12:00 汇总通知」（还款 + 纪念日）
 *   - 删除「每日记账定时通知」与前台 60 秒轮询
 *   - 删除后台常驻调度、Android 原生闹钟（静态广播接收器 / AlarmManager），
 *     以及通知栏发送模块与原生插件（notify / system-reminder / autostart /
 *     family-ledger-reminder 均已从仓库移除）
 *   因此本模块**不再导入任何通知能力**，也不再有定时器。
 *   还款提醒仍保留，但只出现在首页「还款提醒条」（见 domain.creditRepayMap）。
 * ========================================================= */
import { store, getSettings } from './store.js'
import { annivDaysLeft, annivNextDate, annivDateLabel } from './domain.js'

/* ---------- 收集提醒条目（冷启动弹窗用） ---------- */
export function collectAlerts() {
  const alerts = []
  const s = getSettings()

  /* 1. 每日记账提醒：开关开启后，每次冷启动 App 都显示应用内提醒。
   * （已无通知栏定时，原先用于通知栏的「提醒时间」不再影响任何行为） */
  const rem = s.reminder
  if (rem && rem.enabled) {
    alerts.push({
      type: 'daily',
      icon: '📝',
      title: '记账提醒',
      text: '别忘了记录今天的收支哦～',
      badge: '今日待办',
      urgent: false
    })
  }

  /* 2. 信用账户还款：只出现在首页「还款提醒条」，
   *    不进入冷启动弹窗——冷启动弹窗只保留每日记账 + 纪念日提醒。 */

  /* 3. 纪念日 */
  const ar = s.annivReminder
  if (ar && ar.enabled) {
    const days = ar.days || 3
    store.anniversaries.forEach((a) => {
      const left = annivDaysLeft(a)
      if (left < 0 || left >= 9000 || left > days) return
      const next = annivNextDate(a)
      const dateLabel = annivDateLabel(a)
      alerts.push({
        type: 'anniv',
        icon: '🎂',
        title: '纪念日',
        text:
          `「${a.title}」${left === 0 ? '就是今天 🎉' : `还有 ${left} 天`}` +
          `　${dateLabel}${next ? ' · ' + next : ''}`,
        badge: left === 0 ? '今天' : `${left} 天`,
        urgent: left === 0
      })
    })
  }

  return alerts
}

/* 冷启动提醒弹窗（唯一出口：总览页 AlertPopup） */
export function runColdStartAlerts() {
  const alerts = collectAlerts()
  if (!alerts.length) return
  store.alerts = alerts
  store.alertVisible = true
}

export function closeAlerts() {
  store.alertVisible = false
  store.alerts = []
}
