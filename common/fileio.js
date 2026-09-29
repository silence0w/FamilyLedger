/* =========================================================
 * 文件读写（plus.io / plus.zip / Native.js，逻辑层可用）
 *
 * 说明：uni-app App 端的「逻辑层」没有 Blob / FileReader 等浏览器对象，
 * 因此二进制写入走 Native.js 的 java.io.FileOutputStream（见下），
 * 目录扫描 / 读取走 plus.io，解压 xlsx 用 plus.zip.decompress。
 *
 *  - 导出目录固定为 安卓根目录/Download/家庭账本（不存在自动创建）
 *  - **不再静默落应用私有目录**：公共目录写不进去（未授权）会明确报错，
 *    避免「提示导出成功、Download 里却找不到文件」的假成功
 *  - 导入扫描目录**只有** Download/家庭账本（2026-09-24 用户要求：拿掉
 *    旧目录「Download/家庭记账本」与应用私有目录的兼容扫描）
 * ========================================================= */
import { EXPORT_DIR_NAME } from './constants.js'
import { bytesToBase64, bytesToBinaryString, stripBom, utf8Encode } from './binary.js'

/* 用户期望的导出位置（展示用文案） */
export const PUBLIC_DIR_LABEL = 'Download/' + EXPORT_DIR_NAME

/* ---------- 安卓公共存储根目录（/storage/emulated/0） ----------
 * 【踩坑记录 3】getExternalStorageDirectory().getAbsolutePath is not a function
 * plus.android.importClass('android.os.Environment') 只桥接「类」，它返回的
 * java.io.File **实例**上的方法在首次调用时尚未桥接 —— 直接 .getAbsolutePath()
 * 会抛「... is not a function」。表现为：**首次安装**先点导出时界面弹出该报错、
 * 点导入时列表恒为空（异常被吸入 catch → 空列表 + 一句报错提示）；
 * 而只要先成功导出过一次，java.io.File 已被别的代码 importClass 过，
 * 再导入就「碰巧」正常 —— 这正是用户遇到的诡异现象。
 * 因此这里：先桥接 java.io.File 类 → 再对该实例 importClass →
 * 失败退 plus.android.invoke → 再失败用常量兜底。本函数**永不抛错**。 */
function publicRootAbs() {
  const FALLBACK = '/storage/emulated/0'
  try {
    plus.android.importClass('java.io.File')
    const Environment = plus.android.importClass('android.os.Environment')
    const raw = Environment.getExternalStorageDirectory()
    if (!raw) return FALLBACK
    const dir = plus.android.importClass(raw) || raw
    try {
      const abs = String(dir.getAbsolutePath() || '')
      if (abs) return abs
    } catch (e) {
      const abs = String(plus.android.invoke(raw, 'getAbsolutePath') || '')
      if (abs) return abs
    }
  } catch (e) {
    console.warn('[家庭账本] 取公共存储根目录失败，改用默认路径 ' + FALLBACK, e)
  }
  return FALLBACK
}

/* 公共导出目录绝对路径：/storage/emulated/0/Download/家庭账本 */
export function publicExportDirAbs() {
  return publicRootAbs() + '/Download/' + EXPORT_DIR_NAME
}

/* 导出目录展示文案 */
export function exportDirPath() {
  return PUBLIC_DIR_LABEL
}

/* =========================================================
 * 【重要·踩坑记录 1】writeAsBinary 不可靠
 * plus.io.FileWriter.writeAsBinary(binaryString) 在安卓端把 JS 字符串
 * 桥接到原生层时会**静默截断**（实测 5414 字节的 xlsx 只写出 23 字节，
 * onwriteend 照常回调），只能靠事后校验发现。
 * 因此首选 Native.js：Uint8Array → base64（纯 JS）→
 * android.util.Base64.decode 在 Java 侧还原 byte[] → FileOutputStream 直写。
 *
 * 【重要·踩坑记录 2】公共目录必须用 java.io 直接建目录
 * plus.io.PUBLIC_DOWNLOADS 在部分机型/基座上 requestFileSystem 失败，
 * 曾导致静默退回私有目录、用户在 Download 里找不到导出文件。
 * 现在直接 java.io.File(mkdirs) 于 /storage/emulated/0/Download/家庭账本。
 * ========================================================= */

/* Native.js 直写字节：返回文件字节数；失败抛错 */
function javaWriteBytes(absPath, bytes) {
  const b64 = bytesToBase64(bytes)
  const Base64 = plus.android.importClass('android.util.Base64')
  /* DEFAULT=0：在 Java 侧把 base64 还原成 byte[]，绕开 JS 桥接 */
  const jbytes = Base64.decode(b64, 0)
  const FileOutputStream = plus.android.importClass('java.io.FileOutputStream')
  const fos = new FileOutputStream(absPath)
  plus.android.importClass(fos)
  fos.write(jbytes)
  fos.close()
  const File = plus.android.importClass('java.io.File')
  return Number(new File(absPath).length())
}

/* 写完后校验（plus.io 兜底路径用）：文件确实存在且大小一致 */
function verifyWritten(dirEntry, fileName, expectSize) {
  return new Promise((resolve) => {
    dirEntry.getFile(
      fileName,
      {},
      (fileEntry) => {
        fileEntry.file(
          (file) => resolve({ size: Number(file.size) || 0, ok: Number(file.size) === Number(expectSize) }),
          () => resolve({ size: 0, ok: false })
        )
      },
      () => resolve({ size: 0, ok: false })
    )
  })
}

/* 旧路径兜底：plus.io PUBLIC_DOWNLOADS + writeAsBinary（写前 truncate 清空旧内容）
 * 仅在 Native.js 不可用时启用；失败直接抛错，**不再退私有目录** */
function legacySaveBinary(fileName, bytes) {
  return new Promise((resolve, reject) => {
    const fail = (msg) => reject(new Error(msg))
    const timeout = setTimeout(() => {
      fail('无法访问 Download 目录（超时）。请到系统设置授予「所有文件访问权限」后重试。')
    }, 5000)
    const finish = () => clearTimeout(timeout)

    const openRoot = (ok, bad) => {
      plus.io.requestFileSystem(
        plus.io.PUBLIC_DOWNLOADS,
        (fs) => ok(fs && fs.root ? fs.root : fs),
        () => {
          plus.io.resolveLocalFileSystemURL('/storage/emulated/0/Download/', ok, bad)
        }
      )
    }
    openRoot(
      (root) => {
        root.getDirectory(
          EXPORT_DIR_NAME,
          { create: true },
          (dir) => {
            dir.getFile(
              fileName,
              { create: true },
              (fileEntry) => {
                fileEntry.createWriter(
                  (writer) => {
                    writer.onwriteend = () => {
                      verifyWritten(dir, fileName, bytes.length).then((v) => {
                        finish()
                        if (!v.ok) {
                          reject(new Error(`写入校验失败：期望 ${bytes.length} 字节，实际 ${v.size} 字节`))
                          return
                        }
                        resolve({ path: PUBLIC_DIR_LABEL + '/' + fileName, label: PUBLIC_DIR_LABEL, fallback: false, size: v.size })
                      })
                    }
                    writer.onerror = (e) => {
                      finish()
                      reject(new Error('写入失败：' + JSON.stringify(e)))
                    }
                    try {
                      try {
                        writer.truncate(0)
                      } catch (e2) {
                        /* 老基座无 truncate：忽略 */
                      }
                      writer.writeAsBinary(bytesToBinaryString(bytes))
                    } catch (err) {
                      finish()
                      reject(new Error('写入失败：' + (err.message || err)))
                    }
                  },
                  (e) => {
                    finish()
                    reject(new Error('创建写入器失败：' + JSON.stringify(e)))
                  }
                )
              },
              (e) => {
                finish()
                reject(new Error('创建文件失败：' + JSON.stringify(e)))
              }
            )
          },
          (e) => {
            finish()
            reject(new Error('无法创建 ' + PUBLIC_DIR_LABEL + ' 目录。请授予「所有文件访问权限」后重试。'))
          }
        )
      },
      () => {
        finish()
        reject(new Error('无法访问 Download 目录。请到系统设置授予「所有文件访问权限」后重试。'))
      }
    )
  })
}

/* 写二进制文件（Uint8Array）
 * 返回 { path, label, fallback, size }：
 *   - path/label 是**真实**落盘位置，界面必须用它来提示用户
 *   - fallback 恒为 false：写不进公共目录会直接报错（不再静默落私有目录） */
export function saveBinary(fileName, bytes) {
  /* 首选：Native.js 直写公共 Download 目录 */
  try {
    const File = plus.android.importClass('java.io.File')
    const dirAbs = publicExportDirAbs()
    const dir = new File(dirAbs)
    if (!dir.isDirectory()) dir.mkdirs()
    if (dir.isDirectory()) {
      const absPath = dirAbs + '/' + fileName
      const size = javaWriteBytes(absPath, bytes)
      if (size === bytes.length) {
        return Promise.resolve({ path: PUBLIC_DIR_LABEL + '/' + fileName, label: PUBLIC_DIR_LABEL, fallback: false, size })
      }
      console.warn('[家庭账本] Java 直写长度不符，改走 plus.io 兜底', size)
    } else {
      console.warn('[家庭账本] 无法创建公共导出目录，改走 plus.io 兜底')
    }
  } catch (e) {
    console.warn('[家庭账本] Native.js 直写失败，改走 plus.io 兜底', e)
  }

  /* 兜底：旧 plus.io 路径（含写入后校验） */
  return legacySaveBinary(fileName, bytes)
}

/* 写文本文件（返回结构同 saveBinary；统一走二进制写，避免中文编码歧义） */
export function saveText(fileName, text) {
  return saveBinary(fileName, utf8Encode(String(text)))
}

/* ---------- 导入：列出可导入文件 ---------- */
const IMPORT_EXTS = ['xlsx', 'csv', 'txt', 'json']

/* 用 plus.io 扫描一个绝对路径目录（目录不存在返回 []） */
function scanAbsDir(absDir, from) {
  return new Promise((resolve) => {
    // #ifdef APP-PLUS
    plus.io.resolveLocalFileSystemURL(
      absDir,
      (dirEntry) => {
        dirEntry.createReader().readEntries(
          (entries) => {
            resolve(
              entries
                .filter((e) => e.isFile)
                .map((e) => {
                  const name = e.name || ''
                  const ext = (name.split('.').pop() || '').toLowerCase()
                  return { name, fullPath: e.fullPath, ext, from }
                })
                .filter((f) => IMPORT_EXTS.includes(f.ext))
            )
          },
          () => resolve([])
        )
      },
      () => resolve([])
    )
    // #endif

    // #ifndef APP-PLUS
    resolve([])
    // #endif
  })
}

/* 用 Native.js 列一个绝对路径目录（plus.io 扫描失败 / 返回空时的兜底方案）
 * 只认 Download/家庭账本，任何异常都吞掉返回 []，绝不影响主流程 */
function javaScanDir(absDir) {
  try {
    const File = plus.android.importClass('java.io.File')
    const dir = new File(absDir)
    plus.android.importClass(dir)
    if (!dir.isDirectory()) return []
    const list = dir.listFiles() || []
    const out = []
    for (let i = 0; i < list.length; i++) {
      const f = list[i]
      if (!f) continue
      plus.android.importClass(f)
      if (!f.isFile()) continue
      const name = String(f.getName() || '')
      const ext = (name.split('.').pop() || '').toLowerCase()
      if (!IMPORT_EXTS.includes(ext)) continue
      out.push({ name, fullPath: absDir + '/' + name, ext, from: PUBLIC_DIR_LABEL })
    }
    return out
  } catch (e) {
    console.warn('[家庭账本] Native.js 列目录失败（忽略）', e)
    return []
  }
}

/* 列出可导入文件：**只扫 Download/家庭账本**
 * 主路径 plus.io；若它一个文件都没扫到，再用 Native.js 兜底扫一遍
 * （部分基座/机型对公共目录绝对路径的 plus.io 支持不稳，实测「先导出过一次
 * 才正常」的现象就是路径解析抛错导致的，双通道可彻底规避） */
export function listImportableFiles() {
  const abs = publicExportDirAbs()
  return scanAbsDir(abs, PUBLIC_DIR_LABEL).then((files) => {
    const all = files.length ? files : javaScanDir(abs)
    const seen = new Set()
    const out = []
    all.forEach((f) => {
      if (seen.has(f.name)) return
      seen.add(f.name)
      out.push(f)
    })
    return out.sort((a, b) => b.name.localeCompare(a.name))
  })
}

/* 读取文件为文本（用于 csv / txt） */
export function readFileText(fullPath) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    plus.io.resolveLocalFileSystemURL(
      fullPath,
      (entry) => {
        entry.file(
          (file) => {
            const reader = new plus.io.FileReader()
            reader.onload = (ev) => resolve(stripBom(String(ev.target.result || '')))
            reader.onerror = () => reject(new Error('读取文件失败'))
            reader.readAsText(file, 'utf-8')
          },
          (e) => reject(new Error('读取文件失败：' + JSON.stringify(e)))
        )
      },
      (e) => reject(new Error('文件不存在：' + JSON.stringify(e)))
    )
    // #endif
  })
}

/* 读取单个 entry 为文本 */
function readEntryText(entry) {
  return new Promise((resolve, reject) => {
    entry.file(
      (file) => {
        const reader = new plus.io.FileReader()
        reader.onload = (ev) => resolve(String(ev.target.result || ''))
        reader.onerror = () => reject(new Error('读取文件失败'))
        reader.readAsText(file, 'utf-8')
      },
      (e) => reject(new Error('读取文件失败：' + JSON.stringify(e)))
    )
  })
}

/* 递归遍历目录，把所有文件读成 { 相对路径: 文本内容 } */
function walkDir(dirEntry, prefix, out) {
  return new Promise((resolve, reject) => {
    dirEntry.createReader().readEntries(
      (entries) => {
        let pending = entries.length
        if (!pending) {
          resolve(out)
          return
        }
        entries.forEach((entry) => {
          if (entry.isDirectory) {
            walkDir(entry, prefix + entry.name + '/', out)
              .then(() => {
                if (--pending === 0) resolve(out)
              })
              .catch(reject)
          } else {
            readEntryText(entry)
              .then((text) => {
                out[prefix + entry.name] = text
                if (--pending === 0) resolve(out)
              })
              .catch(reject)
          }
        })
      },
      (e) => reject(new Error('读取目录失败：' + JSON.stringify(e)))
    )
  })
}

/* 解压 zip（xlsx）文件，返回 { 相对路径: 文本内容 }
 * 说明：plus.zip.decompress 会把整个 zip 解压到目标目录，再递归读文本 */
export function extractZip(srcPath) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    if (!plus.zip || typeof plus.zip.decompress !== 'function') {
      reject(new Error('当前环境不支持解压，请在 manifest 中启用 Zip 模块'))
      return
    }
    const target = '_doc/xlsx_extract_' + Date.now()
    plus.zip.decompress(
      srcPath,
      target,
      () => {
        plus.io.resolveLocalFileSystemURL(
          target,
          (rootEntry) => {
            walkDir(rootEntry, '', {})
              .then((files) => resolve(files))
              .catch(reject)
          },
          (e) => reject(new Error('读取解压目录失败：' + JSON.stringify(e)))
        )
      },
      (e) => reject(new Error('解压失败：' + JSON.stringify(e)))
    )
    // #endif

    // #ifndef APP-PLUS
    reject(new Error('文件功能仅在 App 端可用'))
    // #endif
  })
}
