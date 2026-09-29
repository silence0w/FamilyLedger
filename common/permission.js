/* =========================================================
 * 权限申请策略（2026-09-26 二次精简）
 *
 * 本模块**只负责文件存取权限**，其余一律不申请：
 *  - **冷启动不申请任何权限**：既不申请存储 / 媒体权限，也不申请通知权限。
 *    旧版冷启动会申请 READ/WRITE_EXTERNAL_STORAGE（Android 11+ 弹「访问照片、
 *    视频、音乐和音频」框）与 POST_NOTIFICATIONS（Android 13+ 弹「允许发送通知吗」），
 *    两者均已按用户要求彻底移除——应用不再需要通知栏，也就没有理由要通知授权。
 *  - 文件权限（所有文件访问）：**按需**——点「导出 / 导入」时检查，
 *    未授权自动弹提示并跳转系统授权页（ensureAllFilesAccess）。
 *    Android 11+ 只有这一条路径；Android 10 及以下系统里没有
 *    MANAGE_EXTERNAL_STORAGE 这个开关，才在导入 / 导出时申请传统存储权限
 *    （老系统的授权框文案是「存储」，不是媒体权限框）。
 *  - 「自启动 / 后台运行 / 电池优化」引导也一并删除：这些设置只为让 App 被
 *    系统回收后仍能定时弹通知栏通知，通知栏链路移除后已无任何用途。
 * ========================================================= */

/* 取安卓主版本号（取不到返回 0） */
function androidMajor() {
  try {
    return parseInt(String((plus.os && plus.os.version) || ''), 10) || 0
  } catch (e) {
    return 0
  }
}

/* Android 10 及以下（没有「所有文件访问权限」开关）才申请传统存储权限。
 * Android 11+ 直接返回 true，不申请、不弹框。 */
function requestLegacyStorage() {
  return new Promise((resolve) => {
    try {
      if (androidMajor() >= 11) {
        resolve(true)
        return
      }
      plus.android.requestPermissions(
        ['android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.READ_EXTERNAL_STORAGE'],
        () => resolve(true),
        () => resolve(false)
      )
    } catch (e) {
      console.warn('[家庭账本] 申请存储权限失败', e)
      resolve(false)
    }
  })
}

/* 当前是否已授予「所有文件访问权限」（Android 11 以下不存在该权限，视为 true） */
export function hasAllFilesAccess() {
  try {
    if (androidMajor() < 11) return true
    const Environment = plus.android.importClass('android.os.Environment')
    return !!Environment.isExternalStorageManager()
  } catch (e) {
    return true
  }
}

/* 跳转系统「所有文件访问权限」设置页（定位到本应用） */
function openAllFilesAccessSettings() {
  try {
    const main = plus.android.runtimeMainActivity()
    const Intent = plus.android.importClass('android.content.Intent')
    const Uri = plus.android.importClass('android.net.Uri')
    const intent = new Intent('android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION')
    intent.setData(Uri.parse('package:' + main.getPackageName()))
    main.startActivity(intent)
  } catch (e) {
    console.warn('[家庭账本] 打开所有文件访问权限页失败', e)
  }
}

/* 导入 / 导出前调用：未授权时弹提示并跳转系统授权页。
 * 返回 true = 已授权可继续；false = 刚跳去授权页，请授权后重试。 */
export function ensureAllFilesAccess() {
  // #ifdef APP-PLUS
  /* Android 10 及以下没有「所有文件访问权限」这个开关，
   * 走传统存储权限的运行时申请（系统文案是「存储」，不会出现媒体权限框） */
  if (androidMajor() > 0 && androidMajor() < 11) return requestLegacyStorage().then(() => true)
  if (hasAllFilesAccess()) return Promise.resolve(true)
  return new Promise((resolve) => {
    uni.showModal({
      title: '需要「所有文件访问权限」',
      content:
        '导出 / 导入需要把 Excel 保存到「' +
        'Download/家庭账本' +
        '」并读取文件。请在接下来的系统页面里允许本应用访问所有文件，授权后重新操作。',
      confirmText: '去授权',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) openAllFilesAccessSettings()
        resolve(false)
      },
      fail: () => resolve(false)
    })
  })
  // #endif

  // #ifndef APP-PLUS
  return Promise.resolve(true)
  // #endif
}
