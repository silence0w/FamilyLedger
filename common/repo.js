/* =========================================================
 * 数据仓库层：建表 / 读写 / 迁移
 * 业务代码只调用本文件导出的方法，不直接拼 SQL
 * ========================================================= */
import { execute, select, withTransaction } from './db.js'
import { store, getSettings } from './store.js'
import {
  BUILTIN_ACCOUNTS, DEFAULT_SETTINGS, DB_NAME,
  CREDIT_PREFIX, BANK_PREFIX
} from './constants.js'
import { localDate, round2 } from './utils.js'

/* ---------- 建表 ---------- */
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS fl_account (
  name TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'debit',
  kind TEXT,
  bank_name TEXT,
  bill_day INTEGER,
  repay_day INTEGER,
  sort_order INTEGER DEFAULT 0,
  create_time TEXT,
  modify_time TEXT
);
CREATE TABLE IF NOT EXISTS fl_txn (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  cat TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  account TEXT,
  note TEXT,
  bill_day INTEGER,
  repay_day INTEGER,
  bill_date TEXT,
  repay_date TEXT,
  created_at TEXT,
  modify_time TEXT
);
CREATE INDEX IF NOT EXISTS idx_fl_txn_date ON fl_txn(date);
CREATE TABLE IF NOT EXISTS fl_loan (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  party TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  due_date TEXT,
  note TEXT,
  create_time TEXT,
  modify_time TEXT
);
CREATE TABLE IF NOT EXISTS fl_loan_addon (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  create_time TEXT,
  modify_time TEXT
);
CREATE TABLE IF NOT EXISTS fl_loan_repay (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  create_time TEXT,
  modify_time TEXT
);
CREATE TABLE IF NOT EXISTS fl_anniv (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  calendar TEXT NOT NULL DEFAULT 'solar',
  date TEXT,
  lunar_month INTEGER,
  lunar_day INTEGER,
  lunar_leap INTEGER DEFAULT 0,
  repeat_yearly INTEGER DEFAULT 1,
  note TEXT,
  create_time TEXT,
  modify_time TEXT
);
CREATE TABLE IF NOT EXISTS fl_setting (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT,
  create_time TEXT,
  modify_time TEXT
);
`

/* =========================================================
 * 初始化
 * ========================================================= */
export async function initDatabase() {
  await execute(SCHEMA_SQL)
  await migrateAccountColumns()
  await cleanupLegacyAccounts()
  await ensureBuiltinAccounts()
  await migrateAccountPrefixes()
  await migrateTimestampColumns()
  await loadAll()
  return true
}

/* 统一时间源（UTC ISO 串，可排序、可解析） */
function nowISO() {
  return new Date().toISOString()
}

/* 旧库升级：为各表补「创建时间 / 修改时间」列（已存在则忽略） */
const TIMESTAMP_COLS = [
  'fl_txn:modify_time',
  'fl_account:create_time',
  'fl_account:modify_time',
  'fl_loan:create_time',
  'fl_loan:modify_time',
  'fl_loan_addon:create_time',
  'fl_loan_addon:modify_time',
  'fl_loan_repay:create_time',
  'fl_loan_repay:modify_time',
  'fl_anniv:create_time',
  'fl_anniv:modify_time',
  'fl_setting:create_time',
  'fl_setting:modify_time'
]
async function migrateTimestampColumns() {
  for (const spec of TIMESTAMP_COLS) {
    const [table, col] = spec.split(':')
    try {
      await execute(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT`)
    } catch (e) {
      /* 列已存在：忽略 */
    }
  }
}

/* 旧库升级：fl_account 补 kind / bank_name 列（已存在则忽略） */
async function migrateAccountColumns() {
  const cols = [
    ["ALTER TABLE fl_account ADD COLUMN kind TEXT", 'kind'],
    ["ALTER TABLE fl_account ADD COLUMN bank_name TEXT", 'bank_name']
  ]
  for (const [sql] of cols) {
    try {
      await execute(sql)
    } catch (e) {
      /* 列已存在：忽略 */
    }
  }
  try {
    await execute("UPDATE fl_account SET kind='credit' WHERE type='credit' AND (kind IS NULL OR kind='')")
  } catch (e) {
    console.warn('[家庭账本] 账户类别回填失败', e)
  }
}

/* 老版本默认账户清理：微信/支付宝/银行卡/其他（储蓄类）且无交易引用 → 删除，
 * 记账下拉改为「现金 + 用户自维护账户」；有交易的保留（避免历史记录悬空） */
async function cleanupLegacyAccounts() {
  try {
    await execute(
      `DELETE FROM fl_account WHERE type='debit'
       AND name IN ('微信','支付宝','银行卡','其他')
       AND name NOT IN (SELECT DISTINCT account FROM fl_txn WHERE account IS NOT NULL AND account <> '')`
    )
  } catch (e) {
    console.warn('[家庭账本] 旧默认账户清理失败', e)
  }
}

/* 账户名称前缀迁移：给信用卡 / 银行卡账户的名称补上类别前缀，
 * 使「按名称前缀归类汇总」（信用卡 / 银行卡（非信用卡）/ app-XX）能覆盖历史数据。
 * 例：花呗 → 信用卡：花呗；同时同步更新交易记录里的 account 引用。 */
async function migrateAccountPrefixes() {
  const rules = [
    { kind: 'credit', prefix: CREDIT_PREFIX },
    { kind: 'bank', prefix: BANK_PREFIX }
  ]
  let rows = []
  try {
    rows = await select('SELECT name, kind, type FROM fl_account')
  } catch (e) {
    return
  }
  for (const r of rows) {
    const old = String(r.name || '')
    if (!old) continue
    const kind = r.kind || (r.type === 'credit' ? 'credit' : '')
    const rule = rules.find((x) => x.kind === kind)
    if (!rule) continue
    /* 已带目标前缀、或是汇总账户名本身、或带其他类别前缀 → 不重复处理 */
    if (old.startsWith(rule.prefix)) continue
    if (old.startsWith(CREDIT_PREFIX) || old.startsWith(BANK_PREFIX)) continue
    if (BUILTIN_ACCOUNTS.indexOf(old) >= 0) continue
    const neu = rule.prefix + old
    try {
      const dup = await select('SELECT name FROM fl_account WHERE name=?', [neu])
      if (dup && dup.length) continue
      await execute('UPDATE fl_account SET name=? WHERE name=?', [neu, old])
      await execute('UPDATE fl_txn SET account=? WHERE account=?', [neu, old])
      console.log('[家庭账本] 账户前缀迁移：' + old + ' → ' + neu)
    } catch (e) {
      console.warn('[家庭账本] 账户前缀迁移失败：' + old, e)
    }
  }
}

/* 内置独立账户（幂等，每次启动保证存在）
 * 它们是真实落库的账户（type='builtin'），与手动添加的账户互不干涉、完全平级；
 * 缺失则补写，已存在则纠正类型并固定排序。 */
async function ensureBuiltinAccounts() {
  for (let i = 0; i < BUILTIN_ACCOUNTS.length; i++) {
    const name = BUILTIN_ACCOUNTS[i]
    try {
      const rows = await select('SELECT name, type FROM fl_account WHERE name=?', [name])
      if (rows && rows.length) {
        if (rows[0].type !== 'builtin') {
          await execute(
            "UPDATE fl_account SET type='builtin', kind=NULL, sort_order=? WHERE name=?",
            [i, name]
          )
        } else {
          await execute('UPDATE fl_account SET sort_order=? WHERE name=?', [i, name])
        }
      } else {
        const ts = nowISO()
        await execute(
          'INSERT INTO fl_account(name, type, kind, bank_name, bill_day, repay_day, sort_order, create_time, modify_time) VALUES(?,?,?,?,?,?,?,?,?)',
          [name, 'builtin', null, null, null, null, i, ts, ts]
        )
      }
    } catch (e) {
      console.warn('[家庭账本] 内置账户写入失败：' + name, e)
    }
  }
}

/* =========================================================
 * 全量载入到 store
 * ========================================================= */
export async function loadAll() {
  /* 账户 */
  const accRows = await select('SELECT * FROM fl_account ORDER BY sort_order ASC, name ASC')
  store.accounts = accRows.map((r) => ({
    name: r.name,
    type: r.type || 'debit',
    kind: r.kind || (r.type === 'credit' ? 'credit' : ''),
    bankName: r.bank_name || '',
    billDay: r.bill_day === null || r.bill_day === undefined ? undefined : Number(r.bill_day),
    repayDay: r.repay_day === null || r.repay_day === undefined ? undefined : Number(r.repay_day),
    createTime: r.create_time || '',
    modifyTime: r.modify_time || ''
  }))

  /* 收支记录 */
  const txnRows = await select('SELECT * FROM fl_txn ORDER BY date DESC')
  store.txns = txnRows.map((r) => {
    const t = {
      id: r.id,
      type: r.type,
      cat: r.cat,
      amount: Number(r.amount) || 0,
      date: r.date,
      account: r.account || '',
      note: r.note || '',
      createTime: r.created_at || '',
      modifyTime: r.modify_time || ''
    }
    if (r.bill_day !== null && r.bill_day !== undefined) t.billDay = Number(r.bill_day)
    if (r.repay_day !== null && r.repay_day !== undefined) t.repayDay = Number(r.repay_day)
    if (r.bill_date) t.billDate = r.bill_date
    if (r.repay_date) t.repayDate = r.repay_date
    return t
  })

  /* 借款 + 追加 + 还款 */
  const loanRows = await select('SELECT * FROM fl_loan ORDER BY date DESC')
  const addonRows = await select('SELECT * FROM fl_loan_addon ORDER BY date ASC, id ASC')
  const repayRows = await select('SELECT * FROM fl_loan_repay ORDER BY date ASC, id ASC')
  store.loans = loanRows.map((r) => ({
    id: r.id,
    type: r.type,
    party: r.party || '',
    amount: Number(r.amount) || 0,
    date: r.date,
    due: r.due_date || '',
    note: r.note || '',
    createTime: r.create_time || '',
    modifyTime: r.modify_time || '',
    addons: addonRows
      .filter((a) => a.loan_id === r.id)
      .map((a) => ({
        amount: Number(a.amount) || 0,
        date: a.date,
        note: a.note || '',
        createTime: a.create_time || '',
        modifyTime: a.modify_time || ''
      })),
    repayments: repayRows
      .filter((p) => p.loan_id === r.id)
      .map((p) => ({
        amount: Number(p.amount) || 0,
        date: p.date,
        note: p.note || '',
        createTime: p.create_time || '',
        modifyTime: p.modify_time || ''
      }))
  }))

  /* 纪念日 */
  const annivRows = await select('SELECT * FROM fl_anniv')
  store.anniversaries = annivRows.map((r) => {
    const a = {
      id: r.id,
      title: r.title || '',
      calendar: r.calendar === 'lunar' ? 'lunar' : 'solar',
      date: r.date || '',
      repeat: Number(r.repeat_yearly) !== 0,
      note: r.note || '',
      createTime: r.create_time || '',
      modifyTime: r.modify_time || ''
    }
    if (a.calendar === 'lunar') {
      a.lunarMonth = Number(r.lunar_month) || 1
      a.lunarDay = Number(r.lunar_day) || 1
      a.lunarLeap = Number(r.lunar_leap) === 1
    }
    return a
  })

  /* 设置 */
  const setRows = await select('SELECT * FROM fl_setting')
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
  const settingMeta = {}
  setRows.forEach((r) => {
    try {
      settings[r.setting_key] = typeof r.setting_value === 'string' ? JSON.parse(r.setting_value) : r.setting_value
    } catch (e) {
      console.warn('[家庭账本] 设置项解析失败：', r.setting_key)
    }
    settingMeta[r.setting_key] = { createTime: r.create_time || '', modifyTime: r.modify_time || '' }
  })
  store.settings = settings
  store.settingMeta = settingMeta
  getSettings()

  return true
}

/* =========================================================
 * 设置
 * ========================================================= */
export async function saveSetting(key, value) {
  const rows = await select('SELECT create_time FROM fl_setting WHERE setting_key=?', [key])
  const ts = nowISO()
  const createTs = rows && rows[0] && rows[0].create_time ? rows[0].create_time : ts
  await execute(
    'INSERT OR REPLACE INTO fl_setting(setting_key, setting_value, create_time, modify_time) VALUES(?,?,?,?)',
    [key, JSON.stringify(value), createTs, ts]
  )
  if (store.settings) store.settings[key] = JSON.parse(JSON.stringify(value))
  if (store.settingMeta) store.settingMeta[key] = { createTime: createTs, modifyTime: ts }
}

/* 导入 / 还原专用：保留原始创建 / 修改时间（缺省则取当前） */
export async function replaceSetting(key, value, createTime, modifyTime) {
  const ts = nowISO()
  const c = createTime || ts
  const m = modifyTime || ts
  await execute(
    'INSERT OR REPLACE INTO fl_setting(setting_key, setting_value, create_time, modify_time) VALUES(?,?,?,?)',
    [key, JSON.stringify(value), c, m]
  )
  if (store.settings) store.settings[key] = JSON.parse(JSON.stringify(value))
  if (store.settingMeta) store.settingMeta[key] = { createTime: c, modifyTime: m }
}

/* 批量保存全部设置（提醒的已通知记录用） */
export async function saveSettings(keys) {
  const list = keys && keys.length ? keys : Object.keys(store.settings || {})
  for (const k of list) {
    await saveSetting(k, store.settings[k])
  }
}

/* =========================================================
 * 收支记录
 * ========================================================= */
export async function insertTxn(txn) {
  const ts = nowISO()
  await execute(
    `INSERT INTO fl_txn(id, type, cat, amount, date, account, note, bill_day, repay_day, bill_date, repay_date, created_at, modify_time)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      txn.id,
      txn.type,
      txn.cat,
      round2(txn.amount),
      txn.date,
      txn.account || '',
      txn.note || '',
      txn.billDay === undefined ? null : txn.billDay,
      txn.repayDay === undefined ? null : txn.repayDay,
      txn.billDate || null,
      txn.repayDate || null,
      txn.createTime || ts,
      ts
    ]
  )
  const obj = JSON.parse(JSON.stringify(txn))
  obj.createTime = txn.createTime || ts
  obj.modifyTime = ts
  store.txns.push(obj)
}

export async function updateTxn(id, txn) {
  const ts = nowISO()
  await execute(
    `UPDATE fl_txn SET type=?, cat=?, amount=?, date=?, account=?, note=?,
       bill_day=?, repay_day=?, bill_date=?, repay_date=?, modify_time=? WHERE id=?`,
    [
      txn.type,
      txn.cat,
      round2(txn.amount),
      txn.date,
      txn.account || '',
      txn.note || '',
      txn.billDay === undefined ? null : txn.billDay,
      txn.repayDay === undefined ? null : txn.repayDay,
      txn.billDate || null,
      txn.repayDate || null,
      ts,
      id
    ]
  )
  const idx = store.txns.findIndex((t) => t.id === id)
  if (idx >= 0) {
    /* 关键：替换对象必须保留 id！
     * 此前直接 splice(txn) 导致内存中该记录 id 丢失 → 之后点「编辑」
     * goTxnEdit(t.id) 传 undefined，打开的是空白「记一笔」表单 */
    const copy = JSON.parse(JSON.stringify(txn))
    copy.id = id
    copy.createTime = store.txns[idx].createTime || ''
    copy.modifyTime = ts
    store.txns.splice(idx, 1, copy)
  }
}

export async function deleteTxn(id) {
  await execute('DELETE FROM fl_txn WHERE id=?', [id])
  const idx = store.txns.findIndex((t) => t.id === id)
  if (idx >= 0) store.txns.splice(idx, 1)
}

/* 导入：整体覆盖 */
export async function replaceAllTxns(list) {
  await execute('DELETE FROM fl_txn')
  for (const t of list) {
    const c = t.createTime || nowISO()
    const m = t.modifyTime || c
    await execute(
      `INSERT INTO fl_txn(id, type, cat, amount, date, account, note, bill_day, repay_day, bill_date, repay_date, created_at, modify_time)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        t.id,
        t.type,
        t.cat,
        round2(t.amount),
        t.date,
        t.account || '',
        t.note || '',
        t.billDay === undefined ? null : t.billDay,
        t.repayDay === undefined ? null : t.repayDay,
        t.billDate || null,
        t.repayDate || null,
        c,
        m
      ]
    )
  }
  await loadAll()
}

/* =========================================================
 * 借款
 * ========================================================= */
export async function insertLoan(loan) {
  const ts = nowISO()
  await execute(
    'INSERT INTO fl_loan(id, type, party, amount, date, due_date, note, create_time, modify_time) VALUES(?,?,?,?,?,?,?,?,?)',
    [
      loan.id,
      loan.type,
      loan.party,
      round2(loan.amount),
      loan.date,
      loan.due || '',
      loan.note || '',
      ts,
      ts
    ]
  )
  store.loans.push(
    Object.assign({}, JSON.parse(JSON.stringify(loan)), {
      addons: [],
      repayments: [],
      createTime: loan.createTime || ts,
      modifyTime: ts
    })
  )
}

export async function updateLoanAmount(id, amount, due, note) {
  const ts = nowISO()
  await execute('UPDATE fl_loan SET amount=?, due_date=?, note=?, modify_time=? WHERE id=?', [
    round2(amount),
    due || '',
    note || '',
    ts,
    id
  ])
  const l = store.loans.find((x) => x.id === id)
  if (l) {
    l.amount = round2(amount)
    l.due = due || ''
    l.note = note || ''
      l.modifyTime = ts
  }
}

/* 编辑借款：仅允许修改「约定还款日 / 备注」（对方、金额、借款日期不可改） */
export async function updateLoanMeta(id, { due, note }) {
  const ts = nowISO()
  await execute('UPDATE fl_loan SET due_date=?, note=?, modify_time=? WHERE id=?', [
    due || '',
    note || '',
    ts,
    id
  ])
  const l = store.loans.find((x) => x.id === id)
  if (l) {
    l.due = due || ''
    l.note = note || ''
    l.modifyTime = ts
  }
}

export async function deleteLoan(id) {
  await withTransaction(async () => {
    await execute('DELETE FROM fl_loan WHERE id=?', [id])
    await execute('DELETE FROM fl_loan_addon WHERE loan_id=?', [id])
    await execute('DELETE FROM fl_loan_repay WHERE loan_id=?', [id])
  })
  const idx = store.loans.findIndex((l) => l.id === id)
  if (idx >= 0) store.loans.splice(idx, 1)
}

export async function insertLoanAddon(loanId, addon) {
  const ts = nowISO()
  await execute('INSERT INTO fl_loan_addon(loan_id, amount, date, note, create_time, modify_time) VALUES(?,?,?,?,?,?)', [
    loanId,
    round2(addon.amount),
    addon.date,
    addon.note || '',
    ts,
    ts
  ])
  const l = store.loans.find((x) => x.id === loanId)
  if (l) {
    if (!l.addons) l.addons = []
    l.addons.push({
      amount: round2(addon.amount),
      date: addon.date,
      note: addon.note || '',
      createTime: addon.createTime || ts,
      modifyTime: ts
    })
  }
}

export async function insertLoanRepay(loanId, repay) {
  const ts = nowISO()
  await execute('INSERT INTO fl_loan_repay(loan_id, amount, date, note, create_time, modify_time) VALUES(?,?,?,?,?,?)', [
    loanId,
    round2(repay.amount),
    repay.date,
    repay.note || '',
    ts,
    ts
  ])
  const l = store.loans.find((x) => x.id === loanId)
  if (l) {
    if (!l.repayments) l.repayments = []
    l.repayments.push({
      amount: round2(repay.amount),
      date: repay.date,
      note: repay.note || '',
      createTime: repay.createTime || ts,
      modifyTime: ts
    })
  }
}

/* 导入：整体覆盖借款（含追加、还款） */
export async function replaceAllLoans(list) {
  await withTransaction(async () => {
    await execute('DELETE FROM fl_loan')
    await execute('DELETE FROM fl_loan_addon')
    await execute('DELETE FROM fl_loan_repay')
  })
  for (const l of list) {
    const lc = l.createTime || nowISO()
    const lm = l.modifyTime || lc
    await execute(
      'INSERT INTO fl_loan(id, type, party, amount, date, due_date, note, create_time, modify_time) VALUES(?,?,?,?,?,?,?,?,?)',
      [
        l.id,
        l.type,
        l.party,
        round2(l.amount),
        l.date,
        l.due || '',
        l.note || '',
        lc,
        lm
      ]
    )
    for (const a of l.addons || []) {
      const ac = a.createTime || nowISO()
      const am = a.modifyTime || ac
      await execute('INSERT INTO fl_loan_addon(loan_id, amount, date, note, create_time, modify_time) VALUES(?,?,?,?,?,?)', [
        l.id,
        round2(a.amount),
        a.date || l.date,
        a.note || '',
        ac,
        am
      ])
    }
    for (const r of l.repayments || []) {
      const rc = r.createTime || nowISO()
      const rm = r.modifyTime || rc
      await execute('INSERT INTO fl_loan_repay(loan_id, amount, date, note, create_time, modify_time) VALUES(?,?,?,?,?,?)', [
        l.id,
        round2(r.amount),
        r.date || localDate(),
        r.note || '',
        rc,
        rm
      ])
    }
  }
  await loadAll()
}

/* =========================================================
 * 账户
 * ========================================================= */
export async function upsertAccount(acc) {
  const rows = await select('SELECT IFNULL(MAX(sort_order), -1) AS m FROM fl_account')
  let order = (rows && rows[0] ? Number(rows[0].m) : -1) + 1
  const exist = await select('SELECT sort_order, create_time FROM fl_account WHERE name=?', [acc.name])
  if (exist && exist.length) order = Number(exist[0].sort_order)

  const kind = acc.kind || (acc.type === 'credit' ? 'credit' : '')
  const ts = nowISO()
  /* 新建：创建时间取当前；已存在：保留原创建时间，仅刷新修改时间；
   * 若调用方显式传入 createTime / modifyTime（如导入备份），以传入为准 */
  const createTs = acc.createTime || (exist && exist[0] && exist[0].create_time) || ts
  const modifyTs = acc.modifyTime || ts
  await execute(
    'INSERT OR REPLACE INTO fl_account(name, type, kind, bank_name, bill_day, repay_day, sort_order, create_time, modify_time) VALUES(?,?,?,?,?,?,?,?,?)',
    [acc.name, acc.type, kind, acc.bankName || null, acc.billDay || null, acc.repayDay || null, order, createTs, modifyTs]
  )
  const list = store.accounts
  const idx = list.findIndex((a) => a.name === acc.name)
  const item = {
    name: acc.name,
    type: acc.type,
    kind,
    bankName: acc.bankName || '',
    billDay: acc.billDay,
    repayDay: acc.repayDay,
    createTime: createTs,
    modifyTime: modifyTs
  }
  if (idx >= 0) list.splice(idx, 1, item)
  else list.push(item)
}

export async function deleteAccount(name) {
  await execute('DELETE FROM fl_account WHERE name=?', [name])
  const idx = store.accounts.findIndex((a) => a.name === name)
  if (idx >= 0) store.accounts.splice(idx, 1)
}

/* =========================================================
 * 纪念日
 * ========================================================= */
export async function insertAnniv(a) {
  const ts = nowISO()
  await execute(
    `INSERT INTO fl_anniv(id, title, calendar, date, lunar_month, lunar_day, lunar_leap, repeat_yearly, note, create_time, modify_time)
     VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    [
      a.id,
      a.title,
      a.calendar || 'solar',
      a.date || '',
      a.lunarMonth || null,
      a.lunarDay || null,
      a.lunarLeap ? 1 : 0,
      a.repeat ? 1 : 0,
      a.note || '',
      a.createTime || ts,
      ts
    ]
  )
  const obj = JSON.parse(JSON.stringify(a))
  obj.createTime = a.createTime || ts
  obj.modifyTime = ts
  store.anniversaries.push(obj)
}

export async function updateAnniv(id, a) {
  const ts = nowISO()
  await execute(
    `UPDATE fl_anniv SET title=?, calendar=?, date=?, lunar_month=?, lunar_day=?, lunar_leap=?, repeat_yearly=?, note=?, modify_time=?
     WHERE id=?`,
    [
      a.title,
      a.calendar || 'solar',
      a.date || '',
      a.lunarMonth || null,
      a.lunarDay || null,
      a.lunarLeap ? 1 : 0,
      a.repeat ? 1 : 0,
      a.note || '',
      ts,
      id
    ]
  )
  const idx = store.anniversaries.findIndex((x) => x.id === id)
  if (idx >= 0) {
    const cur = store.anniversaries[idx]
    const next = JSON.parse(JSON.stringify(a))
    next.createTime = cur.createTime || ''
    next.modifyTime = ts
    store.anniversaries.splice(idx, 1, next)
  }
}

export async function deleteAnniv(id) {
  await execute('DELETE FROM fl_anniv WHERE id=?', [id])
  const idx = store.anniversaries.findIndex((x) => x.id === id)
  if (idx >= 0) store.anniversaries.splice(idx, 1)
}

/* 数据库名对外暴露，便于关于页展示 */
export const databaseName = DB_NAME
