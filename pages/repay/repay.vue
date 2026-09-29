<template>
  <view class="fl-app">
    <PageNav :title="isLend ? '收回款项' : '归还借款'" />

    <view class="fl-body">
      <view class="fl-form">
        <view v-if="loan" class="repay-info">
          <view class="who">{{ isLend ? '应收' : '应付' }} · {{ loan.party }}</view>
          <view class="big">{{ money(remain) }}</view>
          <view class="sub">
            借款总额 {{ money(loan.amount) }} · 已{{ isLend ? '收回' : '归还' }} {{ money(repaid) }}
          </view>
        </view>

        <view class="field">
          <label>本次{{ isLend ? '收回' : '归还' }}金额（元）</label>
          <input
            class="input"
            type="digit"
            :focus="autoFocus"
            :value="amount"
            placeholder="0.00"
            placeholder-class="input-placeholder"
            @input="amount = $event.detail.value"
            @blur="onAmountBlur"
          />
        </view>

        <view class="field">
          <label>日期</label>
          <picker mode="date" :value="date" @change="date = $event.detail.value">
            <view class="picker-box">
              <text>{{ date }}</text>
              <view class="select-arrow ic-caret"></view>
            </view>
          </picker>
        </view>

        <view class="field">
          <label>备注</label>
          <input
            class="input"
            type="text"
            :value="note"
            placeholder="选填"
            placeholder-class="input-placeholder"
            @input="note = $event.detail.value"
          />
        </view>
      <view v-if="loan" class="time-meta">
        <view class="tm-row"><text class="tm-label">创建时间</text><text class="tm-val">{{ fmtTime(loan.createTime) }}</text></view>
        <view class="tm-row"><text class="tm-label">修改时间</text><text class="tm-val">{{ fmtTime(loan.modifyTime) }}</text></view>
      </view>
      </view>

      <view class="fl-form-foot">
        <view class="btn btn-ghost" @click="goBack">取消</view>
        <view class="btn btn-primary" @click="save">确认</view>
      </view>
    </view>
  </view>
</template>

<script>
import PageNav from '../../components/PageNav.vue'
import { store } from '../../common/store.js'
import { insertLoanRepay } from '../../common/repo.js'
import { repaidOf, remainOf } from '../../common/domain.js'
import { localDate, money, round2, normalizeAmount, fmtDateTime } from '../../common/utils.js'

export default {
  components: { PageNav },
  data() {
    return {
      store,
      loanId: '',
      amount: '',
      date: localDate(),
      note: '',
      autoFocus: true
    }
  },
  computed: {
    loan() {
      return store.loans.find((l) => l.id === this.loanId) || null
    },
    isLend() {
      return !!(this.loan && this.loan.type === 'lend')
    },
    remain() {
      return this.loan ? remainOf(this.loan) : 0
    },
    repaid() {
      return this.loan ? repaidOf(this.loan) : 0
    }
  },
  onLoad(options) {
    this.loanId = (options && options.id) ? decodeURIComponent(options.id) : ''
    if (this.loan) this.amount = round2(this.remain).toFixed(2)
  },
  methods: {
    money,
    fmtTime(iso) {
      return fmtDateTime(iso)
    },
    /* 金额输入防呆：失焦时纠正为保留两位小数 */
    onAmountBlur() {
      this.amount = normalizeAmount(this.amount)
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages && pages.length > 1) uni.navigateBack()
      else uni.reLaunch({ url: '/pages/index/index' })
    },
    async save() {
      if (!this.loan) {
        uni.showToast({ title: '借款记录不存在', icon: 'none' })
        return
      }
      const amount = parseFloat(normalizeAmount(this.amount))
      if (!amount || amount <= 0) {
        uni.showToast({ title: '请输入正确的金额', icon: 'none' })
        return
      }
      this.amount = normalizeAmount(this.amount)

      if (amount > this.remain + 0.005) {
        const ok = await new Promise((resolve) => {
          uni.showModal({
            title: '金额超出剩余',
            content: `本次金额超过剩余欠款 ${money(this.remain)}，是否继续？`,
            success: (res) => resolve(res.confirm),
            fail: () => resolve(false)
          })
        })
        if (!ok) return
      }

      try {
        await insertLoanRepay(this.loanId, {
          amount: round2(amount),
          date: this.date || localDate(),
          note: (this.note || '').trim()
        })
      } catch (e) {
        uni.showModal({ title: '保存失败', content: String(e.message || e), showCancel: false })
        return
      }
      uni.showToast({ title: '已记录', icon: 'none' })
      setTimeout(() => this.goBack(), 300)
    }
  }
}
</script>
