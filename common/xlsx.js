/* =========================================================
 * XLSX 生成与解析（不依赖第三方库，逻辑与 HTML 版一致）
 *  - 导出：纯前端拼 ZIP（stored 模式），含 3 个工作表
 *  - 导入：解析 xlsx（stored / deflate）、csv、txt
 * ========================================================= */
import { store, getSettings, managedAccounts } from './store.js'
import { localDate, uid } from './utils.js'
import { utf8Encode, utf8Decode } from './binary.js'

/* 字符串 → UTF-8 字节（逻辑层无 TextEncoder，用自实现） */
const u8 = (s) => utf8Encode(s)

/* ---------- CRC32 ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/* ---------- ZIP 打包 ---------- */
function concatChunks(chunks) {
  let total = 0
  chunks.forEach((c) => {
    total += c.length
  })
  const out = new Uint8Array(total)
  let off = 0
  chunks.forEach((c) => {
    out.set(c, off)
    off += c.length
  })
  return out
}

function zipFiles(files) {
  const chunks = []
  const central = []
  const now = new Date()
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff
  let offset = 0

  files.forEach((f) => {
    const nameBytes = u8(f.name)
    const data = f.data
    const crc = crc32(data)
    const size = data.length

    const local = new Uint8Array(30 + nameBytes.length)
    const dv = new DataView(local.buffer)
    dv.setUint32(0, 0x04034b50, true)
    dv.setUint16(4, 20, true)
    dv.setUint16(6, 0x0800, true)
    dv.setUint16(8, 0, true)
    dv.setUint16(10, dosTime, true)
    dv.setUint16(12, dosDate, true)
    dv.setUint32(14, crc, true)
    dv.setUint32(18, size, true)
    dv.setUint32(22, size, true)
    dv.setUint16(26, nameBytes.length, true)
    dv.setUint16(28, 0, true)
    local.set(nameBytes, 30)
    chunks.push(local, data)

    const cd = new Uint8Array(46 + nameBytes.length)
    const cdv = new DataView(cd.buffer)
    cdv.setUint32(0, 0x02014b50, true)
    cdv.setUint16(4, 20, true)
    cdv.setUint16(6, 20, true)
    cdv.setUint16(8, 0x0800, true)
    cdv.setUint16(10, 0, true)
    cdv.setUint16(12, dosTime, true)
    cdv.setUint16(14, dosDate, true)
    cdv.setUint32(16, crc, true)
    cdv.setUint32(20, size, true)
    cdv.setUint32(24, size, true)
    cdv.setUint16(28, nameBytes.length, true)
    cdv.setUint32(38, 0, true)
    cdv.setUint32(42, offset, true)
    cd.set(nameBytes, 46)
    central.push(cd)

    offset += local.length + size
  })

  const centralSize = central.reduce((a, c) => a + c.length, 0)
  const end = new Uint8Array(22)
  const edv = new DataView(end.buffer)
  edv.setUint32(0, 0x06054b50, true)
  edv.setUint16(8, files.length, true)
  edv.setUint16(10, files.length, true)
  edv.setUint32(12, centralSize, true)
  edv.setUint32(16, offset, true)

  return concatChunks([...chunks, ...central, end])
}

/* ---------- XML 辅助 ---------- */
function colName(i) {
  let s = ''
  i++
  while (i > 0) {
    const m = (i - 1) % 26
    s = String.fromCharCode(65 + m) + s
    i = Math.floor((i - 1) / 26)
  }
  return s
}

function xmlEsc(s) {
  return String(s === undefined || s === null ? '' : s).replace(
    /[&<>"']/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[m])
  )
}

function xmlUnesc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

/* ---------- 样式表：金额列统一 numFmt 0.00（Excel 里也显示元角分两位小数） ----------
 * cellXfs[1] = 数字格式 164 = "0.00"，金额单元格引用 s="1"。
 * 仅影响显示格式，单元格底层仍是数值，导入时 parseFloat 取值不受影响。 */
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="0.00"/></numFmts>
<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

/* moneyCols：需要按「两位小数」显示的列索引（0 基） */
function sheetXml(rows, moneyCols) {
  const money = moneyCols || []
  const out = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>']
  out.push('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>')
  rows.forEach((row, ri) => {
    out.push(`<row r="${ri + 1}">`)
    row.forEach((val, ci) => {
      const ref = colName(ci) + (ri + 1)
      if (typeof val === 'number' && isFinite(val)) {
        const s = money.indexOf(ci) >= 0 ? ' s="1"' : ''
        out.push(`<c r="${ref}"${s}><v>${val}</v></c>`)
      } else {
        out.push(`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(val)}</t></is></c>`)
      }
    })
    out.push('</row>')
  })
  out.push('</sheetData></worksheet>')
  return out.join('')
}

/* ---------- 组装 xlsx（返回 Uint8Array） ----------
 * 与 JSON 完整备份严格对齐：除收支 / 借款 / 还款外，再导出
 * 「手动账户 / 每日记账提醒 / 还款提醒 / 纪念日提醒 / 纪念日」五个工作表，
 * 共 8 个工作表。导入时（rowsToData）按工作表名识别并整体还原。
 * 数据源取自 store + getSettings() + managedAccounts()，保证与 buildBackupJson 所含字段一致。 */
export function buildXlsxBytes() {
  const s = getSettings()

  /* 1) 收支明细 */
  const txnRows = [['日期', '类型', '分类', '金额', '账户', '备注', '账单日', '还款日']]
  ;[...store.txns]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach((t) => {
      txnRows.push([
        t.date,
        t.type === 'income' ? '收入' : '支出',
        t.cat,
        t.amount,
        t.account || '',
        t.note || '',
        t.billDate || '',
        t.repayDate || ''
      ])
    })

  /* 2) 借款记录 */
  const loanRows = [['方向', '对方', '借款日期', '约定还款日', '借款金额', '备注']]
  store.loans.forEach((l) => {
    loanRows.push([
      l.type === 'lend' ? '应收(借出)' : '应付(借入)',
      l.party,
      l.date,
      l.due || '',
      l.amount,
      l.note || ''
    ])
    ;(l.addons || []).forEach((a) => {
      loanRows.push([
        l.type === 'lend' ? '应收(借出)' : '应付(借入)',
        l.party,
        a.date,
        '',
        a.amount,
        (a.note ? a.note + ' ' : '') + '(追加)'
      ])
    })
  })

  /* 3) 还款记录 */
  const repayRows = [['对方', '方向', '还款日期', '金额', '备注']]
  store.loans.forEach((l) => {
    ;(l.repayments || []).forEach((r) => {
      repayRows.push([l.party, l.type === 'lend' ? '收回' : '归还', r.date, r.amount, r.note || ''])
    })
  })

  /* 4) 手动账户（不含内置 7 个独立账户） */
  const accRows = [['名称', '类型', '种类', '发卡银行', '账单日', '还款日']]
  managedAccounts().forEach((a) => {
    accRows.push([
      a.name,
      a.type || 'debit',
      a.kind || (a.type === 'credit' ? 'credit' : ''),
      a.bankName || '',
      a.billDay != null && a.billDay !== undefined ? a.billDay : '',
      a.repayDay != null && a.repayDay !== undefined ? a.repayDay : ''
    ])
  })

  /* 5) 每日记账提醒（字段 / 值 两列） */
  const remRows = [
    ['字段', '值'],
    ['enabled', s.reminder && s.reminder.enabled ? 'true' : 'false'],
    ['time', (s.reminder && s.reminder.time) || '20:00'],
    ['lastDate', (s.reminder && s.reminder.lastDate) || '']
  ]

  /* 6) 还款提醒 */
  const crRows = [
    ['字段', '值'],
    ['enabled', s.creditReminder && s.creditReminder.enabled ? 'true' : 'false'],
    ['days', String((s.creditReminder && s.creditReminder.days) || 3)],
    ['notified', JSON.stringify((s.creditReminder && s.creditReminder.notified) || [])]
  ]

  /* 7) 纪念日提醒 */
  const arRows = [
    ['字段', '值'],
    ['enabled', s.annivReminder && s.annivReminder.enabled ? 'true' : 'false'],
    ['days', String((s.annivReminder && s.annivReminder.days) || 3)],
    ['notified', JSON.stringify((s.annivReminder && s.annivReminder.notified) || [])]
  ]

  /* 8) 纪念日 */
  const annRows = [['标题', '历法', '日期', '重复', '备注', '农历月', '农历日', '闰月']]
  ;(store.anniversaries || []).forEach((a) => {
    annRows.push([
      a.title,
      a.calendar === 'lunar' ? '农历' : '公历',
      a.date,
      a.repeat ? '是' : '否',
      a.note || '',
      a.calendar === 'lunar' && a.lunarMonth != null && a.lunarMonth !== undefined ? a.lunarMonth : '',
      a.calendar === 'lunar' && a.lunarDay != null && a.lunarDay !== undefined ? a.lunarDay : '',
      a.lunarLeap ? '是' : '否'
    ])
  })

  const sheets = [
    { name: '收支明细', rows: txnRows, money: [3] },
    { name: '借款记录', rows: loanRows, money: [4] },
    { name: '还款记录', rows: repayRows, money: [3] },
    { name: '手动账户', rows: accRows },
    { name: '每日记账提醒', rows: remRows },
    { name: '还款提醒', rows: crRows },
    { name: '纪念日提醒', rows: arRows },
    { name: '纪念日', rows: annRows }
  ]

  const n = sheets.length
  const sheetEls = sheets
    .map((sh, i) => `<sheet name="${xmlEsc(sh.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('')
  const relEls = sheets
    .map(
      (sh, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    )
    .join('')
  const overrides = sheets
    .map(
      (sh, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join('')

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${overrides}
</Types>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${sheetEls}
</sheets>
</workbook>`

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${relEls}
</Relationships>`

  return zipFiles([
    { name: '[Content_Types].xml', data: u8(contentTypes) },
    { name: '_rels/.rels', data: u8(rootRels) },
    { name: 'xl/workbook.xml', data: u8(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: u8(workbookRels) },
    ...sheets.map((sh, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: u8(sheetXml(sh.rows, sh.money)) })),
    { name: 'xl/styles.xml', data: u8(STYLES_XML) }
  ])
}

function parseSharedStrings(xml) {
  if (!xml) return []
  const out = []
  const siRe = /<si[^>]*>([\s\S]*?)<\/si>/g
  let m
  while ((m = siRe.exec(xml))) {
    let s = ''
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g
    let tm
    while ((tm = tRe.exec(m[1]))) s += xmlUnesc(tm[1])
    out.push(s)
  }
  return out
}

function colIndex(letters) {
  let n = 0
  for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64)
  return n - 1
}

function parseSheet(xml, shared) {
  const rows = []
  const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g
  let m
  while ((m = rowRe.exec(xml))) {
    const cells = []
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g
    let cm
    while ((cm = cellRe.exec(m[1]))) {
      const attrs = cm[1] || ''
      const inner = cm[2] || ''
      const refM = /r="([A-Z]+)(\d+)"/.exec(attrs)
      const idx = refM ? colIndex(refM[1]) : cells.length
      const tM = /\bt="([^"]+)"/.exec(attrs)
      const type = tM ? tM[1] : ''

      let val = ''
      if (type === 'inlineStr') {
        const t = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inner)
        val = t ? xmlUnesc(t[1]) : ''
      } else {
        const v = /<v[^>]*>([\s\S]*?)<\/v>/.exec(inner)
        if (v) {
          if (type === 's') val = shared[parseInt(v[1], 10)] === undefined ? '' : shared[parseInt(v[1], 10)]
          else val = xmlUnesc(v[1])
        }
      }
      cells[idx] = val
    }
    rows.push(cells)
  }
  return rows
}

/* ---------- CSV 解析 ---------- */
export function parseCSV(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else inQ = false
      } else cell += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') {
        row.push(cell)
        cell = ''
      } else if (c === '\r') {
        /* skip */
      } else if (c === '\n') {
        row.push(cell)
        rows.push(row)
        row = []
        cell = ''
      } else cell += c
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

/* ---------- 行数据 → 业务对象 ----------
 * 入参支持两种形态：
 *   - 数组（历史用法）：每个元素是一张表的行数组，按表头识别类型
 *   - 对象数组 [{ name, rows }]（xlsx 解析，带工作表名，识别更准）
 * 返回与 buildBackupJson().data 同构的对象，缺失的板块为 null / 空数组，
 * 由备份层 applyImportData 决定「缺哪类保留哪类」。 */
export function rowsToData(input) {
  const result = {
    txns: [],
    loans: [],
    accounts: [],
    anniversaries: [],
    reminder: null,
    creditReminder: null,
    annivReminder: null
  }
  ;(input || []).forEach((sh) => {
    const sheet = Array.isArray(sh) ? { name: '', rows: sh } : sh || {}
    const rows = sheet.rows
    if (!rows || !rows.length) return
    const head = rows[0].map((x) => String(x == null ? '' : x).trim())
    const joined = head.join('|')
    const type = detectSheetType(sheet.name || '', joined)
    if (!type) return
    applySheet(result, type, rows)
  })
  return result
}

/* 单元格取值（统一 trim，null/undefined 视为空串） */
function cell(r, i) {
  return String(r[i] == null ? '' : r[i]).trim()
}

/* 按工作表名优先、表头兜底识别板块类型 */
function detectSheetType(name, joined) {
  const n = (name || '').trim()
  if (n === '手动账户' || (joined.includes('发卡银行') && joined.includes('种类'))) return 'accounts'
  if (n === '纪念日' || (joined.includes('历法') && joined.includes('标题'))) return 'anniv'
  if (n === '每日记账提醒' || n === '记账提醒') return 'reminder'
  if (n === '还款提醒') return 'creditReminder'
  if (n === '纪念日提醒') return 'annivReminder'
  if (joined.includes('借款日期')) return 'loan'
  if (joined.includes('还款日期')) return 'repay'
  if (joined.includes('日期') && joined.includes('金额')) return 'txn'
  return null
}

function applySheet(result, type, rows) {
  const body = rows.slice(1)
  if (type === 'txn') {
    body.forEach((r) => {
      const it = parseTxnRow(r)
      if (it) result.txns.push(it)
    })
  } else if (type === 'loan') {
    body.forEach((r) => {
      const it = parseLoanRow(r)
      if (it) result.loans.push(it)
    })
  } else if (type === 'repay') {
    body.forEach((r) => parseRepayRow(r, result.loans))
  } else if (type === 'accounts') {
    body.forEach((r) => {
      const it = parseAccountRow(r)
      if (it) result.accounts.push(it)
    })
  } else if (type === 'anniv') {
    body.forEach((r) => {
      const it = parseAnnivRow(r)
      if (it) result.anniversaries.push(it)
    })
  } else if (type === 'reminder') {
    result.reminder = parseReminderRows(body, 'reminder')
  } else if (type === 'creditReminder') {
    result.creditReminder = parseReminderRows(body, 'credit')
  } else if (type === 'annivReminder') {
    result.annivReminder = parseReminderRows(body, 'anniv')
  }
}

function parseTxnRow(r) {
  const date = cell(r, 0)
  const typeStr = cell(r, 1)
  const cat = cell(r, 2)
  const amt = parseFloat(cell(r, 3))
  const hasAcct = r.length >= 7
  const account = hasAcct ? cell(r, 4) : ''
  const note = hasAcct ? cell(r, 5) : cell(r, 4)
  const billDate = hasAcct ? cell(r, 6) : ''
  const repayDate = hasAcct ? cell(r, 7) : ''
  if (date && amt > 0) {
    const it = {
      id: uid(),
      date,
      type: typeStr.indexOf('收入') >= 0 ? 'income' : 'expense',
      cat: cat || '其他',
      amount: amt,
      account,
      note
    }
    if (repayDate) {
      it.billDate = billDate
      it.repayDate = repayDate
    }
    return it
  }
  return null
}

function parseLoanRow(r) {
  const dir = cell(r, 0)
  const party = cell(r, 1)
  const date = cell(r, 2)
  const due = cell(r, 3)
  const amt = parseFloat(cell(r, 4))
  const note = cell(r, 5)
  if (party && amt > 0) {
    return {
      id: uid(),
      type: dir.indexOf('应收') >= 0 ? 'lend' : 'borrow',
      party,
      date: date || localDate(),
      due: due || '',
      amount: amt,
      note,
      repayments: [],
      addons: []
    }
  }
  return null
}

function parseRepayRow(r, loans) {
  const party = cell(r, 0)
  const dir = cell(r, 1)
  const date = cell(r, 2)
  const amt = parseFloat(cell(r, 3))
  const note = cell(r, 4)
  if (party && amt > 0) {
    const isLend = dir.indexOf('收回') >= 0
    const loan = loans.find((l) => l.party === party && (isLend ? l.type === 'lend' : l.type === 'borrow'))
    if (loan) loan.repayments.push({ amount: amt, date: date || localDate(), note })
  }
}

function parseAccountRow(r) {
  const name = cell(r, 0)
  if (!name) return null
  const type = cell(r, 1) || 'debit'
  const kind = cell(r, 2) || (type === 'credit' ? 'credit' : '')
  const bankName = cell(r, 3)
  const billDay = cell(r, 4) === '' ? undefined : Number(cell(r, 4))
  const repayDay = cell(r, 5) === '' ? undefined : Number(cell(r, 5))
  return { name, type, kind, bankName, billDay, repayDay }
}

function parseAnnivRow(r) {
  const title = cell(r, 0)
  if (!title) return null
  const calendar = cell(r, 1).indexOf('农历') >= 0 ? 'lunar' : 'solar'
  const date = cell(r, 2)
  const repeat = cell(r, 3) === '否' ? false : true
  const note = cell(r, 4)
  const lM = cell(r, 5)
  const lD = cell(r, 6)
  const leap = cell(r, 7)
  const it = { id: uid(), title, calendar, date, repeat, note }
  if (calendar === 'lunar') {
    it.lunarMonth = lM === '' ? undefined : Number(lM)
    it.lunarDay = lD === '' ? undefined : Number(lD)
    it.lunarLeap = leap === '是'
  }
  return it
}

function parseReminderRows(body, kind) {
  const map = {}
  body.forEach((r) => {
    const k = cell(r, 0)
    const v = cell(r, 1)
    if (k) map[k] = v
  })
  if (kind === 'reminder') {
    return { enabled: map.enabled === 'true', time: map.time || '20:00', lastDate: map.lastDate || '' }
  }
  let notified = []
  if (map.notified) {
    try {
      const p = JSON.parse(map.notified)
      if (Array.isArray(p)) notified = p
    } catch (e) {
      notified = []
    }
  }
  return { enabled: map.enabled === 'true', days: Number(map.days) || 3, notified }
}

/* 解析 workbook.xml：返回 [{ name, rid }]（工作表名 → 关系 Id） */
function parseWorkbook(xml) {
  const out = []
  const re = /<sheet\b([^>]*?)\/?>/g
  let m
  while ((m = re.exec(xml))) {
    const el = m[1]
    const nameM = /name="([^"]+)"/.exec(el)
    const ridM = /r:id="([^"]+)"/.exec(el)
    if (nameM) out.push({ name: nameM[1], rid: ridM ? ridM[1] : '' })
  }
  return out
}

/* 解析 workbook.xml.rels：{ rId1: 'worksheets/sheet1.xml', ... } */
function parseWorkbookRels(xml) {
  const map = {}
  const re = /<Relationship\b([^>]*?)\/?>/g
  let m
  while ((m = re.exec(xml))) {
    const el = m[1]
    const idM = /Id="([^"]+)"/.exec(el)
    const tgtM = /Target="([^"]+)"/.exec(el)
    if (idM && tgtM) map[idM[1]] = tgtM[1]
  }
  return map
}

/* ---------- 统一入口：解析文件为业务对象 ---------- */
export async function parseImportFile(file) {
  const lower = String(file.name || '').toLowerCase()
  if (lower.endsWith('.xlsx')) {
    const files = await file.extract()
    const names = Object.keys(files)
      .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
      .sort((a, b) => {
        const na = parseInt(a.match(/sheet(\d+)/)[1], 10)
        const nb = parseInt(b.match(/sheet(\d+)/)[1], 10)
        return na - nb
      })
    if (!names.length) throw new Error('未找到工作表')
    const shared = parseSharedStrings(files['xl/sharedStrings.xml'])

    /* 优先用 workbook.xml 的表名 → r:id → 目标工作表，保证 8 类工作表准确识别 */
    const wb = files['xl/workbook.xml'] || ''
    const wbRels = files['xl/_rels/workbook.xml.rels'] || ''
    const relMap = parseWorkbookRels(wbRels)
    const sheets = []
    parseWorkbook(wb).forEach((si) => {
      const target = relMap[si.rid]
      if (!target) return
      let key = target.startsWith('/') ? target.slice(1) : target
      if (!key.startsWith('xl/')) key = 'xl/' + key
      const xml = files[key]
      if (xml) sheets.push({ name: si.name, rows: parseSheet(xml, shared) })
    })

    /* 兜底：workbook.xml 解析不出时，按 sheetN 顺序（仅靠表头识别，兼容老 3 表文件） */
    if (!sheets.length) {
      names.forEach((nn) => sheets.push({ name: nn, rows: parseSheet(files[nn], shared) }))
    }
    return rowsToData(sheets)
  }

  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    const text = await file.readText()
    const rows = parseCSV(text)
    const groups = []
    let cur = null
    rows.forEach((r) => {
      const first = String(r[0] || '').trim()
      if (first.indexOf('【') === 0) {
        cur = []
        groups.push(cur)
        return
      }
      if (cur) cur.push(r)
    })
    return rowsToData(groups.length ? groups : [rows])
  }

  throw new Error('仅支持 .xlsx 文件（也兼容 .csv / .txt）')
}
