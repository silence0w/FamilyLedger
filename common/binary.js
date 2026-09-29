/* =========================================================
 * 二进制 / 文本编解码（纯 JS，无浏览器 API 依赖）
 *
 * 背景：uni-app 的 App 端「逻辑层」（app-service.js）跑在 5+ 的独立
 * JS 引擎里，没有 TextEncoder / TextDecoder / Blob / FileReader /
 * DecompressionStream / atob / btoa 这些浏览器全局对象。
 * 这里自实现最常用的 UTF-8 编解码与「字节数组 → 二进制字符串」，
 * 供 XLSX 生成 / 文件读写使用。
 * ========================================================= */

/* 字符串 → UTF-8 字节（Uint8Array），正确处理中文与代理对 */
export function utf8Encode(str) {
  const s = String(str == null ? '' : str)
  const bytes = []
  for (let i = 0; i < s.length; i++) {
    let code = s.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < s.length) {
      const next = s.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00)
        i++
      }
    }
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      )
    }
  }
  return new Uint8Array(bytes)
}

/* UTF-8 字节 → 字符串（容错：非法字节序列回退为 U+FFFD） */
export function utf8Decode(input) {
  const arr = input instanceof Uint8Array ? input : new Uint8Array(input)
  let out = ''
  let i = 0
  while (i < arr.length) {
    const b0 = arr[i]
    let code
    let len
    if (b0 < 0x80) {
      code = b0
      len = 1
    } else if ((b0 & 0xe0) === 0xc0) {
      code = b0 & 0x1f
      len = 2
    } else if ((b0 & 0xf0) === 0xe0) {
      code = b0 & 0x0f
      len = 3
    } else if ((b0 & 0xf8) === 0xf0) {
      code = b0 & 0x07
      len = 4
    } else {
      code = 0xfffd
      len = 1
    }
    if (len > 1) {
      for (let k = 1; k < len; k++) {
        const b = arr[i + k]
        if (b === undefined || (b & 0xc0) !== 0x80) {
          code = 0xfffd
          len = k
          break
        }
        code = (code << 6) | (b & 0x3f)
      }
      i += len
    } else {
      i++
    }
    if (code > 0xffff) {
      code -= 0x10000
      out += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff))
    } else {
      out += String.fromCharCode(code)
    }
  }
  return out
}

/* Uint8Array → 二进制字符串（每个字符 charCode 0~255）
 * 供 plus.io.FileWriter.writeAsBinary() 使用；分块避免栈溢出 */
export function bytesToBinaryString(input) {
  const arr = input instanceof Uint8Array ? input : new Uint8Array(input)
  let s = ''
  const CHUNK = 0x8000
  for (let i = 0; i < arr.length; i += CHUNK) {
    const sub = arr.subarray(i, Math.min(i + CHUNK, arr.length))
    s += String.fromCharCode.apply(null, sub)
  }
  return s
}

/* Uint8Array → base64 字符串（纯 JS，无 atob/btoa 依赖）
 * 用途：把字节交给 Native.js 的 android.util.Base64.decode 在 Java 侧
 * 还原成 byte[]，再由 FileOutputStream 直写，绕开 JS 字符串桥接丢字节的问题 */
export function bytesToBase64(input) {
  const arr = input instanceof Uint8Array ? input : new Uint8Array(input)
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let out = ''
  for (let i = 0; i < arr.length; i += 3) {
    const b0 = arr[i]
    const b1 = i + 1 < arr.length ? arr[i + 1] : undefined
    const b2 = i + 2 < arr.length ? arr[i + 2] : undefined
    out += CHARS[b0 >> 2]
    out += CHARS[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)]
    out += b1 === undefined ? '=' : CHARS[((b1 & 15) << 2) | (b2 === undefined ? 0 : b2 >> 6)]
    out += b2 === undefined ? '=' : CHARS[b2 & 63]
  }
  return out
}

/* 去掉 UTF-8 BOM（CSV 等文本文件开头常见） */
export function stripBom(text) {
  const s = String(text == null ? '' : text)
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}
