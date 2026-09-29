/* =========================================================
 * 平台准备状态
 *
 * 背景：plus.* 系列原生能力（sqlite / io / push / android）只有在
 * 5+ runtime 触发 plusready 之后才存在。绝大多数机型上 App.vue 的
 * onLaunch 触发时已经就绪，但少数低端机 / 冷启动竞争场景下可能尚未完成。
 * 此时若直接调用 plus.sqlite 会得到「环境不支持 SQLite」这类误导性报错。
 *
 * 因此启动链第一步统一走 waitPlusReady()：
 *   - 已就绪：立即 resolve
 *   - 未就绪：监听 plusready 事件，并附带超时兜底（绝不阻塞启动）
 * ========================================================= */

/* 是否运行在 App（5+）环境 */
export function isApp() {
  // #ifdef APP-PLUS
  return true
  // #endif
  // #ifndef APP-PLUS
  return false
  // #endif
}

/* 等待 plus 原生能力可用；无论成功与否都会 resolve，不 reject、不卡死 */
export function waitPlusReady(timeout = 3000) {
  return new Promise((resolve) => {
    // #ifdef APP-PLUS
    if (typeof plus !== 'undefined' && plus.sqlite) {
      resolve(true)
      return
    }

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve(typeof plus !== 'undefined' && !!plus.sqlite)
    }

    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('plusready', finish, false)
    }
    /* 超时兜底：即使 plusready 没来，也把控制权交回启动链 */
    setTimeout(finish, timeout)
    // #endif

    // #ifndef APP-PLUS
    resolve(false)
    // #endif
  })
}
