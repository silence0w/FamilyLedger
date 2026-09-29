<template>
  <view class="fl-app">
    <PageNav title="设置" />

    <view class="fl-body">
      <view class="fl-form">
        <!-- ============ 数据管理 ============ -->
        <view class="settings-section settings-panel">
          <view class="settings-title-row">
            <view class="settings-title">数据管理（Excel / JSON）</view>
            <text class="help-link" @click="goHelp('data')">⚠️说明</text>
          </view>
          <view class="btn-row">
            <view class="btn btn-primary" @click="openExport">导出 Excel/JSON</view>
            <view class="btn btn-primary" @click="openImport">导入 Excel/JSON</view>
          </view>
        </view>

        <!-- ============ 账户管理 ============ -->
        <view class="settings-section settings-panel">
          <view class="settings-title-row">
            <view class="settings-title">账户管理</view>
            <view class="acct-group-ops">
              <!-- + 账户：点击展开下拉，选择要添加的账户类型 -->
              <view class="btn btn-primary acct-row-btn" @click="toggleAddMenu">+ 账户</view>
              <!-- 账户详情：默认账户 + 手动添加的账户统一入口 -->
              <view class="btn btn-primary acct-row-btn" @click="goAccounts">账户详情</view>
              <text class="help-link" @click="goHelp('account')">⚠️说明</text>
            </view>
          </view>

          <!-- 默认账户：7 个内置独立账户，只显示第一排 2 个小方框，其余进「账户详情」 -->
          <view class="acct-group-title">默认账户（{{ builtinList.length }} 个）</view>
          <view class="bi-box-row">
            <view v-for="a in builtinTop" :key="'bi-' + a.name" class="bi-box">{{ a.name }}</view>
          </view>

          <!-- 手动添加的账户：只显示 1 个，其余进「账户详情」 -->
          <view class="acct-group-title">手动添加的账户（{{ managedList.length }} 个）</view>
          <block v-if="firstManaged">
            <view class="credit-account-item boxed">
              <view class="ca-main">
                <view class="ca-name">
                  {{ firstManaged.name }}
                  <text class="badge badge-gray">{{ kindLabel(firstManaged) }}</text>
                </view>
                <view class="ca-meta">{{ accountMeta(firstManaged) }}</view>
              </view>
              <view class="ca-ops">
                <text class="link-op edit" @click="editAccount(firstManaged.name)">编辑</text>
                <text class="link-op" @click="delAccount(firstManaged.name)">删除</text>
              </view>
            </view>
          </block>
          <view v-else class="credit-account-empty">还没有手动添加的账户，点右上角「+ 账户」添加</view>
        </view>

        <!-- ============ 三类提醒（同属一个设置分组） ============ -->
        <view class="settings-panel settings-reminder-panel">
          <!-- ============ 每日记账提醒 ============ -->
          <view class="settings-section">
            <view class="settings-title-row">
              <view class="settings-title">每日记账提醒</view>
              <view class="title-ops">
                <view class="switch" :class="{ on: rem.enabled }" @click="toggleReminder">
                  <view class="switch-knob"></view>
                </view>
                <text class="help-link" @click="goHelp('reminder')">⚠️说明</text>
              </view>
            </view>
          </view>

          <!-- ============ 还款提醒 ============ -->
          <view class="settings-section">
            <view class="settings-title-row">
              <view class="settings-title">还款提醒</view>
              <view class="title-ops">
                <view class="switch" :class="{ on: cr.enabled }" @click="toggleCreditReminder">
                  <view class="switch-knob"></view>
                </view>
                <text class="help-link" @click="goHelp('credit')">⚠️说明</text>
              </view>
            </view>
            <view class="field mt14">
              <label>提前提醒天数</label>
              <picker mode="selector" :range="creditDayTexts" :value="creditDayIndex" @change="onCreditDaysChange">
                <view class="picker-box">
                  <text>提前 {{ cr.days || 3 }} 天</text>
                  <view class="select-arrow ic-caret"></view>
                </view>
              </picker>
            </view>
          </view>

          <!-- ============ 纪念日提醒 ============ -->
          <view class="settings-section">
            <view class="settings-title-row">
              <view class="settings-title">纪念日提醒</view>
              <view class="title-ops">
                <view class="switch" :class="{ on: ar.enabled }" @click="toggleAnnivReminder">
                  <view class="switch-knob"></view>
                </view>
                <text class="help-link" @click="goHelp('anniv')">⚠️说明</text>
              </view>
            </view>
            <view class="field mt14">
              <label>提前提醒天数</label>
              <picker mode="selector" :range="annivDayTexts" :value="annivDayIndex" @change="onAnnivDaysChange">
                <view class="picker-box">
                  <text>提前 {{ ar.days || 3 }} 天</text>
                  <view class="select-arrow ic-caret"></view>
                </view>
              </picker>
            </view>
          </view>

        </view>
      </view>
    </view>

    <!-- 导入文件选择（遮罩吞掉 touchmove：背景锁死不可滑动，只有本层弹窗可操作/滚动） -->
    <view
      v-if="importVisible"
      class="mask"
      @click="importVisible = false"
      @touchmove.stop.prevent="noop"
    >
      <view class="modal" @click.stop>
        <view class="modal-head">
          <text>选择要导入的文件（Excel / JSON）</text>
          <text class="modal-close" @click="importVisible = false">✕</text>
        </view>
        <view class="settings-hint modal-tip">检索目录：{{ publicDirLabel }}（只识别这一个目录，目录不存在时请先导出一次）</view>
        <!-- 列表区独立滚动：@touchmove.stop 阻止冒泡到遮罩，避免被遮罩的 prevent 取消滚动 -->
        <view class="modal-scroll" @touchmove.stop>
          <view class="modal-body">
            <view v-if="importLoading" class="empty">正在读取目录…</view>
            <template v-else>
              <view v-if="!importFiles.length" class="empty">
                该目录下没有可导入的文件（.xlsx / .csv / .json）。请先点「导出 Excel/JSON」生成一份，或把文件放进 {{ publicDirLabel }} 后再试。
              </view>
              <view
                v-for="f in importFiles"
                :key="f.fullPath"
                class="file-item"
                @click="pickFile(f)"
              >
                <text class="file-name">{{ f.name }}</text>
                <text class="link-op edit">导入</text>
              </view>
            </template>
          </view>
        </view>
        <view class="modal-foot">
          <view class="btn btn-ghost" @click="importVisible = false">取消</view>
        </view>
      </view>
    </view>

    <!-- 导出格式选择（Excel / JSON）：同样锁死背景滑动 -->
    <view
      v-if="exportVisible"
      class="mask"
      @click="exportVisible = false"
      @touchmove.stop.prevent="noop"
    >
      <view class="modal" @click.stop>
        <view class="modal-head">
          <text>选择导出格式</text>
          <text class="modal-close" @click="exportVisible = false">✕</text>
        </view>
        <view class="modal-scroll" @touchmove.stop>
          <view class="modal-body">
            <view class="btn-row">
              <view class="btn btn-primary" @click="pickExport('xlsx')">导出 Excel</view>
              <view class="btn btn-ghost" @click="pickExport('json')">导出 JSON</view>
            </view>
            <view class="settings-hint">
              <text class="strong">Excel</text>：与 JSON 内容完全一致（等同一份完整备份），含 8 个工作表——
              「收支明细 / 借款记录 / 还款记录 / 手动账户 / 每日记账提醒 / 还款提醒 / 纪念日提醒 / 纪念日」，
              可直接用 Excel、WPS、Numbers 打开。
            </view>
            <view class="settings-hint">
              <text class="hl">JSON</text>：与 Excel 内容完全一致（等同一份完整备份），额外为纯文本便于程序处理；
              <text class="hl">导入即整体替换当前数据</text>（内置 7 个独立账户不受影响）。
            </view>
            <view class="settings-hint">
              两者都保存到：<text class="hl">{{ publicDirLabel }}</text>（不存在会自动创建）。
            </view>
          </view>
        </view>
        <view class="modal-foot">
          <view class="btn btn-ghost" @click="exportVisible = false">取消</view>
        </view>
      </view>
    </view>

    <!-- 添加账户（弹出窗口：三个添加入口，点选后进入对应添加页） -->
    <view
      v-if="showAddMenu"
      class="mask"
      @click="showAddMenu = false"
      @touchmove.stop.prevent="noop"
    >
      <view class="modal" @click.stop>
        <view class="modal-head">
          <text>添加账户</text>
          <text class="modal-close" @click="showAddMenu = false">✕</text>
        </view>
        <view class="modal-scroll" @touchmove.stop>
          <view class="modal-body">
            <view class="aam-btn btn btn-primary" @click="pickAddAccount('credit')">+ 信用卡</view>
            <view class="aam-btn btn btn-primary" @click="pickAddAccount('bank')">+ 银行卡</view>
            <view class="aam-btn btn btn-primary" @click="pickAddAccount('app')">+ App支付</view>
            <view class="settings-hint">点选一种账户类型，进入对应的添加页面。</view>
          </view>
        </view>
        <view class="modal-foot">
          <view class="btn btn-ghost" @click="showAddMenu = false">取消</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import PageNav from '../../components/PageNav.vue'
import { store, getSettings, managedAccounts, builtinAccounts } from '../../common/store.js'
import { saveSetting, deleteAccount } from '../../common/repo.js'
import { buildXlsxBytes, parseImportFile } from '../../common/xlsx.js'
import { buildBackupJson, parseBackupJson, applyBackupData, applyImportData, hasExportableData, isImportDataEmpty } from '../../common/backup.js'
import { saveBinary, saveText, listImportableFiles, readFileText, extractZip, PUBLIC_DIR_LABEL } from '../../common/fileio.js'
import { ensureAllFilesAccess } from '../../common/permission.js'
import { timestamp } from '../../common/utils.js'
import {
  CREDIT_REMIND_DAY_OPTIONS, ANNIV_REMIND_DAY_OPTIONS, ACCOUNT_KIND_LABELS
} from '../../common/constants.js'

export default {
  components: { PageNav },
  data() {
    return {
      store,
      exportVisible: false,
      importVisible: false,
      importLoading: false,
      importFiles: [],
      publicDirLabel: PUBLIC_DIR_LABEL,
      /* 「+ 账户」下拉列表是否展开（默认收起） */
      showAddMenu: false
    }
  },
  computed: {
    rem() {
      return getSettings().reminder
    },
    cr() {
      return getSettings().creditReminder
    },
    ar() {
      return getSettings().annivReminder
    },
    /* 手动添加的账户（全部，按名称排序）——设置页只显示第 1 个，其余在「详情」页 */
    managedList() {
      return managedAccounts()
    },
    /* 设置页手动账户只显示排序第一的那个 */
    firstManaged() {
      return this.managedList.length ? this.managedList[0] : null
    },
    /* 默认账户（7 个内置独立账户，固定顺序） */
    builtinList() {
      return builtinAccounts()
    },
    /* 设置页只展示第一排 2 个小方框（现金 / 信用卡），其余在「详情」页查看 */
    builtinTop() {
      return this.builtinList.slice(0, 2)
    },
    creditDayTexts() {
      return CREDIT_REMIND_DAY_OPTIONS.map((n) => `提前 ${n} 天`)
    },
    creditDayIndex() {
      const idx = CREDIT_REMIND_DAY_OPTIONS.indexOf(Number(this.cr.days) || 3)
      return idx < 0 ? 2 : idx
    },
    annivDayTexts() {
      return ANNIV_REMIND_DAY_OPTIONS.map((n) => `提前 ${n} 天`)
    },
    annivDayIndex() {
      const idx = ANNIV_REMIND_DAY_OPTIONS.indexOf(Number(this.ar.days) || 3)
      return idx < 0 ? 2 : idx
    }
  },
  methods: {
    /* ⚠️说明：切到说明页（data / account / reminder / credit / anniv） */
    goHelp(topic) {
      uni.navigateTo({ url: '/pages/help/help?topic=' + topic })
    },
    /* 详情：切到账户详情页（7 个默认账户 + 全部手动添加的账户） */
    goAccounts() {
      uni.navigateTo({ url: '/pages/accounts/accounts' })
    },
    /* 设置项保存失败时统一提示（不再静默失败导致「开关点不动」） */
    saveFailed(e) {
      uni.showModal({
        title: '保存失败',
        content: String((e && e.message) || e) + '\n\n账本数据未写入，请截图反馈。',
        showCancel: false
      })
      return false
    },

    /* 遮罩上的 touchmove 空处理：配合 .stop.prevent 锁死背景滑动（页面不能被滚走） */
    noop() {},

    /* ---------------- 导出：先弹窗选择格式（Excel / JSON） ---------------- */
    openExport() {
      this.exportVisible = true
    },

    /* 在导出弹窗里点了某个格式按钮：先关窗，再执行对应导出 */
    pickExport(fmt) {
      this.exportVisible = false
      if (fmt === 'json') this.doExportJson()
      else this.doExport()
    },

    /* ---------------- 导出 Excel（先检查文件权限） ---------------- */
    async doExport() {
      try {
        if (!(await ensureAllFilesAccess())) return
        /* 防呆：空数据不允许导出 */
        if (!hasExportableData()) {
          uni.showModal({ title: '暂无数据', content: '当前没有可导出的数据，请先记账或添加账户 / 纪念日后再导出。', showCancel: false })
          return
        }
        uni.showLoading({ title: '导出中…' })
        const bytes = buildXlsxBytes()
        if (!bytes || !bytes.length) throw new Error('导出失败：生成文件为空')
        const name = `家庭账本_${timestamp()}.xlsx`
        /* saveBinary 固定写 Download/家庭账本；失败会直接报错（不再落私有目录） */
        const saved = await saveBinary(name, bytes)
        uni.hideLoading()
        uni.showModal({
          title: '导出成功',
          content: `已保存到：\n${saved.path}\n（${saved.size} 字节，含收支 / 借款 / 手动账户 / 提醒 / 纪念日共 8 个工作表）`,
          showCancel: false
        })
      } catch (e) {
        uni.hideLoading()
        uni.showModal({
          title: '导出失败',
          content:
            String(e.message || e) +
            '\n\n常见原因：「所有文件访问权限」未开启。请到系统设置 → 应用 → 家庭账本 → 权限中打开后重试。',
          showCancel: false
        })
      }
    },

    /* ---------------- 导出 JSON（完整备份，与 Excel 同目录） ---------------- */
    async doExportJson() {
      try {
        if (!(await ensureAllFilesAccess())) return
        /* 防呆：空数据不允许导出 */
        if (!hasExportableData()) {
          uni.showModal({ title: '暂无数据', content: '当前没有可导出的数据，请先记账或添加账户 / 纪念日后再导出。', showCancel: false })
          return
        }
        uni.showLoading({ title: '导出中…' })
        const json = JSON.stringify(buildBackupJson(), null, 2)
        const name = `家庭账本_${timestamp()}.json`
        /* saveText 与 saveBinary 同一落盘目录 Download/家庭账本 */
        const saved = await saveText(name, json)
        uni.hideLoading()
        uni.showModal({
          title: '导出成功',
          content: `已保存到：\n${saved.path}\n（${saved.size} 字节，含收支 / 手动账户 / 提醒设置 / 纪念日 / 借款）`,
          showCancel: false
        })
      } catch (e) {
        uni.hideLoading()
        uni.showModal({
          title: '导出失败',
          content:
            String(e.message || e) +
            '\n\n常见原因：「所有文件访问权限」未开启。请到系统设置 → 应用 → 家庭账本 → 权限中打开后重试。',
          showCancel: false
        })
      }
    },

    /* ---------------- 导入（先检查文件权限） ---------------- */
    async openImport() {
      if (!(await ensureAllFilesAccess())) return
      this.importVisible = true
      this.importLoading = true
      try {
        this.importFiles = await listImportableFiles()
      } catch (e) {
        this.importFiles = []
        uni.showToast({ title: String(e.message || e), icon: 'none' })
      }
      this.importLoading = false
    },

    async pickFile(f) {
      this.importVisible = false
      try {
        uni.showLoading({ title: '解析中…' })

        /* JSON 完整备份：解析后整体替换（收支 / 手动账户 / 提醒设置 / 纪念日 / 借款） */
        if (f.ext === 'json') {
          const text = await readFileText(f.fullPath)
          let data
          try {
            data = parseBackupJson(text)
          } catch (e) {
            uni.hideLoading()
            uni.showModal({ title: '导入失败', content: String(e.message || e), showCancel: false })
            return
          }
          /* 防呆：空数据不允许导入 */
          if (isImportDataEmpty(data)) {
            uni.hideLoading()
            uni.showModal({ title: '导入失败', content: '导入的数据为空，请确认文件是由本账本正常导出的。', showCancel: false })
            return
          }
          uni.hideLoading()
          uni.showModal({
            title: '确认导入',
            content: this.describeImport(data) + '\n导入将覆盖当前所有数据，确定继续吗？',
            success: async (res) => {
              if (!res.confirm) return
              try {
                uni.showLoading({ title: '导入中…' })
                const s = await applyBackupData(data)
                uni.hideLoading()
                uni.showToast({ title: '导入成功', icon: 'none' })
                console.log('[家庭账本] JSON 导入完成', s)
              } catch (err) {
                uni.hideLoading()
                uni.showModal({ title: '导入失败', content: String(err.message || err), showCancel: false })
              }
            }
          })
          return
        }

        /* Excel / CSV：解析后整体替换（与 JSON 完全一致：收支 / 借款 / 手动账户 / 提醒 / 纪念日） */
        const file = {
          name: f.name,
          fullPath: f.fullPath,
          readText: () => readFileText(f.fullPath),
          extract: () => extractZip(f.fullPath)
        }
        const result = await parseImportFile(file)
        uni.hideLoading()

        /* 防呆：空数据不允许导入 */
        if (isImportDataEmpty(result)) {
          uni.showModal({
            title: '导入失败',
            content: '未识别到有效数据，请确认文件是由本账本导出的',
            showCancel: false
          })
          return
        }

        uni.showModal({
          title: '确认导入',
          content: this.describeImport(result) + '\n导入将覆盖当前对应数据，确定继续吗？',
          success: async (res) => {
            if (!res.confirm) return
            try {
              uni.showLoading({ title: '导入中…' })
              const s = await applyImportData(result)
              uni.hideLoading()
              uni.showToast({ title: '导入成功', icon: 'none' })
              console.log('[家庭账本] Excel 导入完成', s)
            } catch (err) {
              uni.hideLoading()
              uni.showModal({ title: '导入失败', content: String(err.message || err), showCancel: false })
            }
          }
        })
      } catch (e) {
        uni.hideLoading()
        uni.showModal({ title: '导入失败', content: String(e.message || e), showCancel: false })
      }
    },

    /* 导入确认弹窗的内容摘要：列出文件里包含的各板块 */
    describeImport(data) {
      const lines = []
      const cnt = (k) => (Array.isArray(data[k]) ? data[k].length : 0)
      if (cnt('txns')) lines.push(`· 收支 ${cnt('txns')} 条`)
      if (cnt('loans')) lines.push(`· 借款 ${cnt('loans')} 笔`)
      if (cnt('accounts')) lines.push(`· 手动账户 ${cnt('accounts')} 个`)
      if (cnt('anniversaries')) lines.push(`· 纪念日 ${cnt('anniversaries')} 条`)
      const rem = (k, label) => {
        const o = data[k]
        if (o && typeof o === 'object') lines.push(`· ${label}：${o.enabled ? '已开启' : '未开启'}`)
      }
      rem('reminder', '每日记账提醒')
      rem('creditReminder', '还款提醒')
      rem('annivReminder', '纪念日提醒')
      return '识别到：\n' + (lines.length ? lines.join('\n') : '（空）')
    },

    /* ---------------- 账户管理 ---------------- */
    kindLabel(a) {
      return ACCOUNT_KIND_LABELS[a.kind] || '账户'
    },
    accountMeta(a) {
      if (a.kind === 'credit') {
        return `账单日 每月${a.billDay || 5}日 · 还款日 每月${a.repayDay || 20}日` + (a.bankName ? ' · ' + a.bankName : '')
      }
      if (a.kind === 'bank') {
        return a.bankName ? '发卡银行：' + a.bankName : '银行卡 · 无账单日 / 还款日'
      }
      if (a.kind === 'app') {
        return a.billDay && a.repayDay
          ? `已启用账单提醒 · 账单日 每月${a.billDay}日 · 还款日 每月${a.repayDay}日`
          : '未启用账单日 / 还款日'
      }
      return a.billDay && a.repayDay ? `账单日 每月${a.billDay}日 · 还款日 每月${a.repayDay}日` : ''
    },
    addAccount(kind) {
      uni.navigateTo({ url: '/pages/credit-account/credit-account?kind=' + kind })
    },
    /* 「+ 账户」：打开选择弹窗（三个添加入口，见模板底部 .mask 弹层） */
    toggleAddMenu() {
      this.showAddMenu = !this.showAddMenu
    },
    /* 选中某种账户类型：先关弹窗，再进对应添加页 */
    pickAddAccount(kind) {
      this.showAddMenu = false
      this.addAccount(kind)
    },
    editAccount(name) {
      uni.navigateTo({ url: '/pages/credit-account/credit-account?name=' + encodeURIComponent(name) })
    },
    delAccount(name) {
      const used = store.txns.some((t) => t.account === name)
      uni.showModal({
        title: '删除账户',
        content: used
          ? `「${name}」已有记账记录，删除后这些记录仍会保留，但不再关联该账户。确定删除吗？`
          : `确定删除「${name}」吗？`,
        success: async (res) => {
          if (!res.confirm) return
          await deleteAccount(name)
          uni.showToast({ title: '已删除', icon: 'none' })
        }
      })
    },

    /* ---------------- 提醒设置 ---------------- */
    async toggleReminder() {
      try {
        const s = getSettings()
        const next = {
          enabled: !s.reminder.enabled,
          time: s.reminder.time || '20:00',
          lastDate: s.reminder.lastDate || ''
        }
        await saveSetting('reminder', next)
        if (next.enabled) {
          uni.showToast({
            title: '已开启每日记账提醒（每次启动 App 内提醒）',
            icon: 'none'
          })
        } else {
          uni.showToast({ title: '已关闭每日提醒', icon: 'none' })
        }
      } catch (e) {
        this.saveFailed(e)
      }
    },
    async toggleCreditReminder() {
      try {
        const s = getSettings()
        const enabled = !s.creditReminder.enabled
        await saveSetting('creditReminder', {
          enabled,
          days: s.creditReminder.days || 3,
          notified: s.creditReminder.notified || []
        })
        uni.showToast({
          title: enabled ? `已开启还款提醒（提前 ${s.creditReminder.days || 3} 天）` : '已关闭还款提醒',
          icon: 'none'
        })
      } catch (e) {
        this.saveFailed(e)
      }
    },
    async onCreditDaysChange(e) {
      try {
        const s = getSettings()
        const days = CREDIT_REMIND_DAY_OPTIONS[Number(e.detail.value)] || 3
        await saveSetting('creditReminder', {
          enabled: s.creditReminder.enabled,
          days,
          notified: []
        })
        uni.showToast({ title: `已设为提前 ${days} 天`, icon: 'none' })
      } catch (err) {
        this.saveFailed(err)
      }
    },
    async toggleAnnivReminder() {
      try {
        const s = getSettings()
        const enabled = !s.annivReminder.enabled
        await saveSetting('annivReminder', {
          enabled,
          days: s.annivReminder.days || 3,
          notified: s.annivReminder.notified || []
        })
        uni.showToast({
          title: enabled ? `已开启纪念日提醒（提前 ${s.annivReminder.days || 3} 天）` : '已关闭纪念日提醒',
          icon: 'none'
        })
      } catch (e) {
        this.saveFailed(e)
      }
    },
    async onAnnivDaysChange(e) {
      try {
        const s = getSettings()
        const days = ANNIV_REMIND_DAY_OPTIONS[Number(e.detail.value)] || 3
        await saveSetting('annivReminder', {
          enabled: s.annivReminder.enabled,
          days,
          notified: []
        })
        uni.showToast({ title: `已设为提前 ${days} 天`, icon: 'none' })
      } catch (err) {
        this.saveFailed(err)
      }
    }
  }
}
</script>
