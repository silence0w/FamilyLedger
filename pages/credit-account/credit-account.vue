<template>
  <view class="fl-app">
    <PageNav :title="pageTitle" />

    <view class="fl-body">
      <view class="fl-form">
        <!-- 编辑：名称只读 -->
        <block v-if="isEdit">
          <view class="field">
            <label>账户名称（{{ kindLabel }}）</label>
            <view class="picker-box readonly-box">{{ name }}</view>
          </view>
        </block>

        <!-- 新增：按类型录入名称 -->
        <block v-else>
          <!-- 信用卡 / 银行卡：发卡银行 + 自定义名称 -->
          <block v-if="kind === 'credit' || kind === 'bank'">
            <view class="field">
              <label>发卡银行</label>
              <picker mode="selector" :range="bankLabels" :value="bankIndex" @change="onBankChange">
                <view class="picker-box">
                  <text :class="{ 'ph-holder': !bank }">{{ bank || '不指定' }}</text>
                  <view class="select-arrow ic-caret"></view>
                </view>
              </picker>
            </view>
            <view class="field">
              <label>或自定义名称（选填）</label>
              <input
                class="input"
                type="text"
                :value="custom"
                :placeholder="kind === 'credit' ? '例如：招行信用卡 / 京东白条' : '例如：工资卡 / 建行储蓄卡'"
                placeholder-class="input-placeholder"
                @input="custom = $event.detail.value"
              />
            </view>
          </block>

          <!-- App支付渠道：先选 App 名称，再填自定义渠道名称（选填） -->
          <block v-else>
            <view class="field">
              <label>App 名称</label>
              <picker mode="selector" :range="appNames" :value="appIndex" @change="onAppNameChange">
                <view class="picker-box">
                  <text>{{ appName }}</text>
                  <view class="select-arrow ic-caret"></view>
                </view>
              </picker>
            </view>
            <view class="field">
              <label>支付渠道名称（选填）</label>
              <input
                class="input"
                type="text"
                :value="custom"
                placeholder="例如：亲情卡 / 小金库 / 分期专户"
                placeholder-class="input-placeholder"
                @input="custom = $event.detail.value"
              />
              <view class="tip-note">最终账户名 = App 名称 + 渠道名称，如「app-支付宝：亲情卡」；留空则只显示 App 名称。</view>
            </view>
          </block>
        </block>

        <!-- App支付渠道：账单日 / 还款日启用开关（圆形：灰色关闭 → 红色圆点开启） -->
        <view v-if="kind === 'app'" class="field">
          <view class="switch-row">
            <text>启用账单日 / 还款日</text>
            <view class="dot-toggle" :class="{ on: billEnabled }" @click="toggleBillEnabled">
              <view v-if="billEnabled" class="dot-toggle-inner"></view>
            </view>
          </view>
          <view class="tip-note">开启后可设置本渠道的账单日 / 还款日，记账时会自动推算并参与「还款提醒」。</view>
        </view>

        <!-- 账单日 / 还款日 -->
        <view v-if="showBillFields" class="row-2">
          <view class="field">
            <label>账单日（每月）</label>
            <picker
              mode="selector"
              :range="dayLabels"
              :value="billDay - 1"
              :disabled="!billEditable"
              @change="onBillDayChange"
            >
              <view class="picker-box" :class="{ 'readonly-box': !billEditable }">
                <text>{{ billDay }} 日</text>
                <view class="select-arrow ic-caret"></view>
              </view>
            </picker>
          </view>
          <view class="field">
            <label>还款日（每月）</label>
            <picker
              mode="selector"
              :range="dayLabels"
              :value="repayDay - 1"
              :disabled="!billEditable"
              @change="onRepayDayChange"
            >
              <view class="picker-box" :class="{ 'readonly-box': !billEditable }">
                <text>{{ repayDay }} 日</text>
                <view class="select-arrow ic-caret"></view>
              </view>
            </picker>
          </view>
        </view>

        <view v-if="kind === 'credit'" class="party-hint">
          修改后，之后<text class="strong">新记</text>的账会按新的账单日 / 还款日推算，已有记录不受影响。
        </view>
      </view>

      <view v-if="isEdit" class="time-meta">
        <view class="tm-row"><text class="tm-label">创建时间</text><text class="tm-val">{{ fmtTime(createTime) }}</text></view>
        <view class="tm-row"><text class="tm-label">修改时间</text><text class="tm-val">{{ fmtTime(modifyTime) }}</text></view>
      </view>

      <view class="fl-form-foot">
        <view class="btn btn-ghost" @click="goBack">取消</view>
        <view class="btn btn-primary" @click="save">保存</view>
      </view>
    </view>
  </view>
</template>

<script>
import PageNav from '../../components/PageNav.vue'
import { store } from '../../common/store.js'
import { upsertAccount } from '../../common/repo.js'
import { fmtDateTime } from '../../common/utils.js'
import { CREDIT_BANKS, ACCOUNT_KIND_LABELS, APP_CHANNEL_NAMES, CREDIT_PREFIX, BANK_PREFIX, BUILTIN_ACCOUNTS } from '../../common/constants.js'

const KINDS = ['credit', 'bank', 'app']

export default {
  components: { PageNav },
  data() {
    return {
      store,
      isEdit: false,
      kind: 'credit',
      name: '',
      bank: '',
      custom: '',
      appName: APP_CHANNEL_NAMES[0],
      billEnabled: false,
      billDay: 5,
      repayDay: 20,
      createTime: '',
      modifyTime: '',
      dayLabels: (() => {
        const arr = []
        for (let i = 1; i <= 31; i++) arr.push(i + ' 日')
        return arr
      })()
    }
  },
  computed: {
    kindLabel() {
      return ACCOUNT_KIND_LABELS[this.kind] || '账户'
    },
    pageTitle() {
      if (this.isEdit) return '编辑' + this.kindLabel
      if (this.kind === 'bank') return '添加银行卡'
      if (this.kind === 'app') return '添加App支付渠道'
      return '添加信用卡'
    },
    bankLabels() {
      return ['不指定'].concat(CREDIT_BANKS)
    },
    bankIndex() {
      const idx = CREDIT_BANKS.indexOf(this.bank)
      return idx < 0 ? 0 : idx + 1
    },
    appNames() {
      return APP_CHANNEL_NAMES
    },
    appIndex() {
      const idx = APP_CHANNEL_NAMES.indexOf(this.appName)
      return idx < 0 ? 0 : idx
    },
    /* 是否显示账单日 / 还款日字段：信用卡恒显示；App渠道启用后显示 */
    showBillFields() {
      if (this.kind === 'credit') return true
      if (this.kind === 'app') return this.billEnabled
      return false
    },
    /* App渠道未启用时日期选择器置灰 */
    billEditable() {
      return this.kind !== 'app' || this.billEnabled
    }
  },
  onLoad(options) {
    options = options || {}
    const k = options.kind && KINDS.indexOf(options.kind) >= 0 ? options.kind : 'credit'
    this.kind = k
    if (k === 'credit') this.billEnabled = true

    const raw = options.name ? decodeURIComponent(options.name) : ''
    if (!raw) return
    const acc = store.accounts.find((a) => a.name === raw)
    if (!acc) return
    this.isEdit = true
    this.name = acc.name
    this.kind = acc.kind || (acc.type === 'credit' ? 'credit' : 'app')
    this.createTime = acc.createTime || ''
    this.modifyTime = acc.modifyTime || ''
    this.bank = acc.bankName || ''
    this.billEnabled = !!(acc.billDay && acc.repayDay)
    this.billDay = acc.billDay || 5
    this.repayDay = acc.repayDay || 20
  },
  methods: {
    fmtTime(iso) {
      return fmtDateTime(iso)
    },
    onBankChange(e) {
      const idx = Number(e.detail.value)
      this.bank = idx <= 0 ? '' : (CREDIT_BANKS[idx - 1] || '')
    },
    onAppNameChange(e) {
      this.appName = APP_CHANNEL_NAMES[Number(e.detail.value)] || APP_CHANNEL_NAMES[0]
    },
    onBillDayChange(e) {
      if (!this.billEditable) return
      this.billDay = Number(e.detail.value) + 1
    },
    onRepayDayChange(e) {
      if (!this.billEditable) return
      this.repayDay = Number(e.detail.value) + 1
    },
    toggleBillEnabled() {
      this.billEnabled = !this.billEnabled
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages && pages.length > 1) uni.navigateBack()
      else uni.reLaunch({ url: '/pages/index/index' })
    },

    async save() {
      const type = this.kind === 'app' ? 'credit' : 'debit'
      /* App支付渠道记账逻辑按信用类处理（有账单周期时）；type 保持 debit 供筛选 */

      if (this.isEdit) {
        try {
          await upsertAccount({
            name: this.name,
            type: this.kind === 'credit' ? 'credit' : type,
            kind: this.kind,
            bankName: this.bank,
            billDay: this.billEnabled ? parseInt(this.billDay, 10) || 1 : undefined,
            repayDay: this.billEnabled ? parseInt(this.repayDay, 10) || 1 : undefined
          })
        } catch (e) {
          uni.showModal({ title: '保存失败', content: String(e.message || e), showCancel: false })
          return
        }
        uni.showToast({ title: '已更新', icon: 'none' })
        setTimeout(() => this.goBack(), 300)
        return
      }

      const custom = (this.custom || '').trim()
      let name = ''
      if (this.kind === 'credit') {
        /* 信用卡：最后显示内容前统一加「信用卡：」前缀 */
        if (custom) name = CREDIT_PREFIX + custom
        else if (this.bank) name = CREDIT_PREFIX + this.bank
        else {
          uni.showToast({ title: '请选择发卡银行或填写自定义名称', icon: 'none' })
          return
        }
      } else if (this.kind === 'bank') {
        /* 银行卡：前缀「银行卡（非信用卡）：」 */
        if (custom) name = BANK_PREFIX + custom
        else if (this.bank) name = BANK_PREFIX + this.bank
        else {
          uni.showToast({ title: '请选择发卡银行或填写自定义名称', icon: 'none' })
          return
        }
      } else {
        /* App支付渠道：先显示 App 名称，再显示自定义渠道名称 */
        name = this.appName + (custom ? '：' + custom : '')
      }

      /* 默认账户（7 个内置独立账户）不可被手动账户重名占用 */
      if (BUILTIN_ACCOUNTS.indexOf(name) >= 0) {
        uni.showToast({
          title:
            this.kind === 'app'
              ? `「${name}」是默认账户，请填写渠道名称区分（如：亲情卡）`
              : `「${name}」是默认账户，请换一个名称`,
          icon: 'none'
        })
        return
      }

      if (store.accounts.some((a) => a.name === name)) {
        uni.showToast({ title: `「${name}」已存在`, icon: 'none' })
        return
      }

      try {
        await upsertAccount({
          name,
          type: this.kind === 'credit' ? 'credit' : type,
          kind: this.kind,
          bankName: this.bank,
          billDay: this.billEnabled ? parseInt(this.billDay, 10) || 1 : undefined,
          repayDay: this.billEnabled ? parseInt(this.repayDay, 10) || 1 : undefined
        })
      } catch (e) {
        uni.showModal({ title: '保存失败', content: String(e.message || e), showCancel: false })
        return
      }
      uni.showToast({ title: `已添加 ${name}`, icon: 'none' })
      setTimeout(() => this.goBack(), 300)
    }
  }
}
</script>

<style scoped>
/* App支付渠道：账单日/还款日启用开关（圆形，灰→红+中心点） */
.dot-toggle {
  position: relative;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #d8d8d8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dot-toggle.on {
  background: #c20c0c;
}
.dot-toggle-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
}
</style>
