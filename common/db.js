/* =========================================================
 * SQLite 访问层（plus.sqlite）
 *
 * 【防注入说明 —— 重要】
 * HTML5+ 的 plus.sqlite 只接受「整条 SQL 字符串」，不提供原生的
 * 参数绑定（prepared statement）接口。为了规避拼接式注入，本层做了三件事：
 *   1. 所有表名 / 字段名必须来自代码内常量，写入前用 safeIdent() 白名单校验，
 *      绝不允许把用户输入当作标识符拼进 SQL；
 *   2. 所有「值」一律通过 ? 占位符 + bindParams() 注入：
 *        - 数字：Number.isFinite 校验后按数字字面量输出（非法值转 NULL）
 *        - 布尔：转 1 / 0
 *        - null / undefined：输出 NULL
 *        - 字符串：剔除 NUL，单引号加倍（''）后整体加引号
 *      拼接过程中会跳过 SQL 里已有的字符串字面量，避免误替换；
 *   3. 占位符与参数个数不匹配时直接抛错，杜绝「少参数导致占位符残留」。
 * 业务层只允许调用 select() / execute() / withTransaction()，不得自行拼 SQL。
 * ========================================================= */
import { DB_NAME, DB_PATH } from './constants.js'

let openPromise = null
let opened = false

/* 标识符白名单校验（表名 / 字段名） */
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/
export function safeIdent(name) {
  if (typeof name !== 'string' || !IDENT_RE.test(name)) {
    throw new Error('非法 SQL 标识符：' + name)
  }
  return name
}

/* 把任意值转成安全的 SQL 字面量 */
export function sqlLiteral(v) {
  if (v === null || v === undefined) return 'NULL'
  const t = typeof v
  if (t === 'number') return Number.isFinite(v) ? String(v) : 'NULL'
  if (t === 'boolean') return v ? '1' : '0'
  if (t === 'object') {
    // 对象/数组统一按 JSON 字符串存储
    return sqlLiteral(JSON.stringify(v))
  }
  return "'" + String(v).replace(/\u0000/g, '').replace(/'/g, "''") + "'"
}

/* 用参数安全替换 SQL 中的 ? 占位符（跳过已有字符串字面量） */
export function bindParams(sql, params = []) {
  if (typeof sql !== 'string') throw new Error('SQL 必须是字符串')
  const list = Array.isArray(params) ? params : [params]
  let out = ''
  let i = 0
  let pi = 0
  let inStr = false

  while (i < sql.length) {
    const ch = sql[i]
    if (inStr) {
      out += ch
      if (ch === "'") {
        if (sql[i + 1] === "'") {
          out += "'"
          i += 2
          continue
        }
        inStr = false
      }
      i++
      continue
    }
    if (ch === "'") {
      inStr = true
      out += ch
      i++
      continue
    }
    if (ch === '?') {
      if (pi >= list.length) throw new Error('SQL 占位符多于传入参数')
      out += sqlLiteral(list[pi++])
      i++
      continue
    }
    out += ch
    i++
  }

  if (pi !== list.length) throw new Error('SQL 占位符数量与参数数量不一致')
  return out
}

/* 打开数据库（只打开一次）
 *
 * 【重要·踩坑记录】
 * 官方文档明确：isOpenDatabase 的签名是「同步返回 Boolean」，并不保证调用 success。
 * 早期实现只依赖 success 回调，遇到只返回布尔值的版本时 Promise 永不 settle
 * → 启动链永久挂起（表现为：无权限引导、账户列表为空、所有保存静默失败）。
 * 这里改为「同步返回值 + success 回调 + 定时兜底」三重保险。
 */
export function openDb() {
  if (openPromise) return openPromise

  openPromise = new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    if (typeof plus === 'undefined' || !plus.sqlite) {
      openPromise = null
      reject(new Error('当前运行环境不支持 SQLite，请在 Android App 中运行'))
      return
    }

    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      opened = true
      resolve(true)
    }
    const giveUp = (err) => {
      if (settled) return
      settled = true
      openPromise = null /* 允许后续重试，不把失败的 Promise 永久缓存 */
      reject(err instanceof Error ? err : new Error(String(err)))
    }

    /* 1) 询问是否已打开：兼容「同步返回 Boolean」与「success 回调」两种实现 */
    let syncRet
    try {
      syncRet = plus.sqlite.isOpenDatabase({
        name: DB_NAME,
        path: DB_PATH,
        success: (v) => {
          if (v === true) done()
        }
      })
    } catch (e) {
      syncRet = undefined
    }
    if (syncRet === true) {
      done()
      return
    }

    /* 2) 250ms 内没得到「已打开」→ 显式 openDatabase（存在则打开，不存在则创建） */
    setTimeout(() => {
      if (settled) return
      try {
        plus.sqlite.openDatabase({
          name: DB_NAME,
          path: DB_PATH,
          success: () => done(),
          fail: (e) => {
            /* 已处于打开状态时重复打开会报错，这里复检一次再决定是否真失败 */
            let again
            try {
              again = plus.sqlite.isOpenDatabase({ name: DB_NAME, path: DB_PATH })
            } catch (err) {
              again = undefined
            }
            if (again === true) {
              done()
              return
            }
            giveUp(new Error('打开数据库失败：' + JSON.stringify(e)))
          }
        })
      } catch (e) {
        giveUp(new Error('打开数据库异常：' + (e.message || e)))
      }
    }, 250)

    /* 3) 最终超时兜底：任何情况下都不让启动链永久挂起 */
    setTimeout(() => {
      if (!settled) giveUp(new Error('数据库打开超时（5 秒无响应）'))
    }, 5000)
    // #endif

    // #ifndef APP-PLUS
    openPromise = null
    reject(new Error('当前运行环境不支持 SQLite，请在 Android App 中运行'))
    // #endif
  })

  return openPromise
}

export function isOpened() {
  return opened
}

/* 查询：返回对象数组 */
export function select(sql, params = []) {
  return openDb().then(
    () =>
      new Promise((resolve, reject) => {
        const finalSql = bindParams(sql, params)
        plus.sqlite.selectSql({
          name: DB_NAME,
          sql: finalSql,
          success: (data) => resolve(data || []),
          fail: (e) => reject(new Error('查询失败：' + JSON.stringify(e)))
        })
      })
  )
}

/* =========================================================
 * SQL 语句切分
 *
 * 【重要·踩坑记录】
 * 官方文档：plus.sqlite.executeSql 的 sql 参数为字符串时「只执行单条 SQL 语句」，
 * 并且明确写着 **Android 平台不支持用 ";" 分割多条命令**。
 * 早期实现把 7 条 CREATE TABLE 拼成一个字符串一次性提交，结果安卓上整批失败，
 * 表建不出来 → 账户列表空、纪念日/信用卡保存失败、提醒开关存不上（连锁失效）。
 *
 * 因此这里把「可能含多条语句的 SQL」切分成单条，逐条提交：
 *   - 切分时跳过字符串字面量内部的分号（用户输入里的分号不会被误切）
 *   - 空语句自动丢弃
 * ========================================================= */
export function splitStatements(sql) {
  const src = String(sql)
  const out = []
  let buf = ''
  let inStr = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inStr) {
      buf += ch
      if (ch === "'") {
        if (src[i + 1] === "'") {
          buf += "'"
          i++
        } else {
          inStr = false
        }
      }
      continue
    }
    if (ch === "'") {
      inStr = true
      buf += ch
      continue
    }
    if (ch === ';') {
      if (buf.trim()) out.push(buf.trim())
      buf = ''
      continue
    }
    buf += ch
  }
  if (buf.trim()) out.push(buf.trim())
  return out
}

/* 把入参规范成「绑定好参数的单条语句数组」 */
function normalizeStatements(sql, params) {
  const raw = Array.isArray(sql) ? sql : [sql]
  const out = []
  for (const one of raw) {
    if (typeof one !== 'string') throw new Error('SQL 必须是字符串')
    const bound = bindParams(one, params)
    for (const stmt of splitStatements(bound)) out.push(stmt)
  }
  return out
}

/* 单条语句执行（不做切分） */
function execOne(statement) {
  return new Promise((resolve, reject) => {
    plus.sqlite.executeSql({
      name: DB_NAME,
      sql: statement,
      success: () => resolve(true),
      fail: (e) => reject(new Error('执行失败：' + JSON.stringify(e) + '｜SQL：' + statement.slice(0, 120)))
    })
  })
}

/* 执行（DDL / INSERT / UPDATE / DELETE）
 * 支持：单条语句、分号分隔的多条语句、字符串数组；内部自动拆成单条逐条提交 */
export function execute(sql, params = []) {
  const statements = normalizeStatements(sql, params)
  return openDb().then(() =>
    statements.reduce((chain, stmt) => chain.then(() => execOne(stmt)), Promise.resolve(true))
  )
}

/* 事务：plus.sqlite.transaction */
function transact(operation) {
  return openDb().then(
    () =>
      new Promise((resolve, reject) => {
        plus.sqlite.transaction({
          name: DB_NAME,
          operation,
          success: () => resolve(true),
          fail: (e) => reject(new Error('事务失败：' + JSON.stringify(e)))
        })
      })
  )
}

export function withTransaction(fn) {
  return openDb()
    .then(() => transact('begin'))
    .then(() => fn())
    .then(async (result) => {
      await transact('commit')
      return result
    })
    .catch(async (err) => {
      try {
        await transact('rollback')
      } catch (e) {
        /* ignore */
      }
      throw err
    })
}
