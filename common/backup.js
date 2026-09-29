/* =========================================================
 * JSON 完整备份（区别于 Excel 仅含收支/借款）
 *  - 导出 buildBackupJson()：收支记录 + 手动添加的账户 + 三类提醒设置
 *    （每日记账提醒 / 还款提醒 / 纪念日提醒）+ 纪念日信息 + 借款记录
 *  - 导入 parseBackupJson() / applyBackupData()：解析后整体替换当前数据
 *    （内置 7 个独立账户始终保留，不被改动）
 *  与 Excel 导出共用 fileio.saveText，落盘到 Download/家庭账本 同一目录。
 * ========================================================= */
import { store, managedAccounts, getSettings } from './store.js'
import {
  replaceAllTxns,
  replaceAllLoans,
  replaceSetting,
  deleteAccount,
  upsertAccount,
  deleteAnniv,
  insertAnniv
} from './repo.js'
import { BUILTIN_ACCOUNTS } from './constants.js'
import { uid } from './utils.js'

/* ---------- 组装备份对象 ---------- */
export function buildBackupJson() {
  const s = getSettings()
  const meta = store.settingMeta || {}
  return {
    app: 'family-ledger',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      /* 收支记录（含账单日 / 还款日推算 + 创建 / 修改时间） */
      txns: store.txns.map((t) => ({
        id: t.id,
        type: t.type,
        cat: t.cat,
        amount: t.amount,
        date: t.date,
        account: t.account || '',
        note: t.note || '',
        billDay: t.billDay,
        repayDay: t.repayDay,
        billDate: t.billDate,
        repayDate: t.repayDate,
        createTime: t.createTime || '',
        modifyTime: t.modifyTime || ''
      })),
      /* 手动添加的账户（不含内置 7 个独立账户 + 创建 / 修改时间） */
      accounts: managedAccounts().map((a) => ({
        name: a.name,
        type: a.type,
        kind: a.kind || (a.type === 'credit' ? 'credit' : ''),
        bankName: a.bankName || '',
        billDay: a.billDay,
        repayDay: a.repayDay,
        createTime: a.createTime || '',
        modifyTime: a.modifyTime || ''
      })),
      /* 三类提醒设置（含各自的创建 / 修改时间） */
      reminder: s.reminder,
      creditReminder: s.creditReminder,
      annivReminder: s.annivReminder,
      settingsMeta: {
        reminder: meta.reminder || { createTime: '', modifyTime: '' },
        creditReminder: meta.creditReminder || { createTime: '', modifyTime: '' },
        annivReminder: meta.annivReminder || { createTime: '', modifyTime: '' }
      },
      /* 纪念日信息（含创建 / 修改时间） */
      anniversaries: store.anniversaries.map((a) => ({
        id: a.id,
        title: a.title,
        calendar: a.calendar,
        date: a.date,
        repeat: a.repeat,
        note: a.note || '',
        lunarMonth: a.lunarMonth,
        lunarDay: a.lunarDay,
        lunarLeap: a.lunarLeap,
        createTime: a.createTime || '',
        modifyTime: a.modifyTime || ''
      })),
      /* 借款记录（含追加 / 还款，均含创建 / 修改时间） */
      loans: store.loans.map((l) => ({
        id: l.id,
        type: l.type,
        party: l.party,
        amount: l.amount,
        date: l.date,
        due: l.due || '',
        note: l.note || '',
        createTime: l.createTime || '',
        modifyTime: l.modifyTime || '',
        addons: (l.addons || []).map((x) => ({
          amount: x.amount,
          date: x.date,
          note: x.note || '',
          createTime: x.createTime || '',
          modifyTime: x.modifyTime || ''
        })),
        repayments: (l.repayments || []).map((x) => ({
          amount: x.amount,
          date: x.date,
          note: x.note || '',
          createTime: x.createTime || '',
          modifyTime: x.modifyTime || ''
        }))
      }))
    }
  }
}

/* ---------- 解析（容错：接受 {data:{...}} 或扁平 {...}） ---------- */
export function parseBackupJson(text) {
  const obj = JSON.parse(text)
  const data = obj && obj.data ? obj.data : obj
  if (!data || !Array.isArray(data.txns)) {
    throw new Error('未识别到有效的备份数据（缺少收支记录）')
  }
  return data
}

/* ---------- 应用：容错整体替换（Excel / JSON 共用） ----------
 * 与 applyBackupData 的区别：每个板块「有则覆盖、无则保留当前」，
 * 因此旧版只含「收支 / 借款」的 Excel 导入不会把手动账户 / 提醒 / 纪念日清空；
 * 新版完整导出的文件则等价于全量覆盖。 */
export async function applyImportData(data) {
  if (!data || typeof data !== 'object') throw new Error('导入数据格式不正确')

  const result = {}

  /* 1) 收支记录 */
  if (Array.isArray(data.txns)) {
    const txns = data.txns.map((t) => ({
      id: t.id || uid(),
      type: t.type === 'income' ? 'income' : 'expense',
      cat: t.cat || '其他',
      amount: Number(t.amount) || 0,
      date: t.date || '',
      account: t.account || '',
      note: t.note || '',
      billDay: t.billDay,
      repayDay: t.repayDay,
      billDate: t.billDate,
      repayDate: t.repayDate,
      createTime: t.createTime || '',
      modifyTime: t.modifyTime || ''
    }))
    await replaceAllTxns(txns)
    result.txns = txns.length
  }

  /* 2) 手动账户：清掉当前全部手动账户，写入导入里的手动账户（内置 7 个不被改动） */
  if (Array.isArray(data.accounts)) {
    const importedAccs = data.accounts.filter((a) => a && BUILTIN_ACCOUNTS.indexOf(a.name) < 0)
    const currentManaged = managedAccounts()
    for (const a of currentManaged) await deleteAccount(a.name)
    for (const a of importedAccs) {
      await upsertAccount({
        name: a.name,
        type: a.type || 'debit',
        kind: a.kind || (a.type === 'credit' ? 'credit' : ''),
        bankName: a.bankName || '',
        billDay: a.billDay,
        repayDay: a.repayDay,
        createTime: a.createTime || '',
        modifyTime: a.modifyTime || ''
      })
    }
    result.accounts = importedAccs.length
  }

  /* 3) 三类提醒设置（保留原始创建 / 修改时间；Excel 导入无 settingsMeta 则取当前） */
  const sm = data.settingsMeta || {}
  if (data.reminder) {
    const m = sm.reminder || {}
    await replaceSetting('reminder', data.reminder, m.createTime, m.modifyTime)
    result.reminder = data.reminder.enabled ? '开' : '关'
  }
  if (data.creditReminder) {
    const m = sm.creditReminder || {}
    await replaceSetting('creditReminder', data.creditReminder, m.createTime, m.modifyTime)
    result.creditReminder = data.creditReminder.enabled ? '开' : '关'
  }
  if (data.annivReminder) {
    const m = sm.annivReminder || {}
    await replaceSetting('annivReminder', data.annivReminder, m.createTime, m.modifyTime)
    result.annivReminder = data.annivReminder.enabled ? '开' : '关'
  }

  /* 4) 纪念日（先清后写） */
  if (Array.isArray(data.anniversaries)) {
    const existingAnniv = store.anniversaries.slice()
    for (const a of existingAnniv) await deleteAnniv(a.id)
    const annivs = data.anniversaries.map((a) => ({
      id: a.id || uid(),
      title: a.title || '',
      calendar: a.calendar === 'lunar' ? 'lunar' : 'solar',
      date: a.date || '',
      repeat: a.repeat !== false,
      note: a.note || '',
      lunarMonth: a.lunarMonth,
      lunarDay: a.lunarDay,
      lunarLeap: a.lunarLeap,
      createTime: a.createTime || '',
      modifyTime: a.modifyTime || ''
    }))
    for (const a of annivs) await insertAnniv(a)
    result.annivs = annivs.length
  }

  /* 5) 借款（含追加 / 还款，均保留时间戳） */
  if (Array.isArray(data.loans)) {
    const loans = data.loans.map((l) => ({
      id: l.id || uid(),
      type: l.type === 'lend' ? 'lend' : 'borrow',
      party: l.party || '',
      amount: Number(l.amount) || 0,
      date: l.date || '',
      due: l.due || '',
      note: l.note || '',
      createTime: l.createTime || '',
      modifyTime: l.modifyTime || '',
      addons: (l.addons || []).map((x) => ({
        amount: Number(x.amount) || 0,
        date: x.date || '',
        note: x.note || '',
        createTime: x.createTime || '',
        modifyTime: x.modifyTime || ''
      })),
      repayments: (l.repayments || []).map((x) => ({
        amount: Number(x.amount) || 0,
        date: x.date || '',
        note: x.note || '',
        createTime: x.createTime || '',
        modifyTime: x.modifyTime || ''
      }))
    }))
    await replaceAllLoans(loans)
    result.loans = loans.length
  }

  return result
}

/* ---------- 应用：整体替换当前数据（JSON 完整备份入口） ---------- */
export async function applyBackupData(data) {
  if (!data || !Array.isArray(data.txns)) throw new Error('备份数据格式不正确')
  return applyImportData(data)
}

/* ---------- 导出防呆：是否含有可导出的数据 ---------- */
export function hasExportableData() {
  const d = buildBackupJson().data
  const arr = (k) => Array.isArray(d[k]) && d[k].length > 0
  const enabledRem = (k) => d[k] && typeof d[k] === 'object' && d[k].enabled === true
  return (
    arr('txns') ||
    arr('loans') ||
    arr('accounts') ||
    arr('anniversaries') ||
    enabledRem('reminder') ||
    enabledRem('creditReminder') ||
    enabledRem('annivReminder')
  )
}

/* ---------- 导入防呆：解析结果是否为空 ---------- */
export function isImportDataEmpty(data) {
  if (!data || typeof data !== 'object') return true
  const arr = (k) => Array.isArray(data[k]) && data[k].length > 0
  const enabledRem = (k) => data[k] && typeof data[k] === 'object' && data[k].enabled === true
  return !(
    arr('txns') ||
    arr('loans') ||
    arr('accounts') ||
    arr('anniversaries') ||
    enabledRem('reminder') ||
    enabledRem('creditReminder') ||
    enabledRem('annivReminder')
  )
}
