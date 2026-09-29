<template>
  <view class="fl-app">
    <PageNav :title="isEdit ? '修改借款' : '新增借款'" />

    <view class="fl-body">
      <view class="fl-form">
        <!-- 借出 / 借入 -->
        <view class="field">
          <view class="seg seg-full">
            <view class="seg-btn" :class="{ active: loanType === 'lend' }" @click="switchType('lend')">借出（应收）</view>
            <view class="seg-btn" :class="{ active: loanType === 'borrow' }" @click="switchType('borrow')">借入（应付）</view>
          </view>
          <view v-if="isEdit" class="tip-note">修改模式下「对方 / 金额 / 借款日期」不可更改，仅可修改约定还款日与备注。</view>
        </view>

        <!-- 对方 -->
        <view class="field">
          <label>对方姓名 / 机构</label>
          <input
            v-if="!isEdit"
            class="input"
            type="text"
            :value="party"
            placeholder="例如：张三 / 招商银行"
            placeholder-class="input-placeholder"
            @input="onPartyInput"
          />
          <view v-else class="readonly-box">{{ party }}</view>
          <view v-if="!isEdit" class="chips">
            <block v-if="chips.length">
              <view
                v-for="p in chips"
                :key="p"
                class="chip"
                :class="{ active: p === party.trim() }"
                @click="pickParty(p)"
              >
                {{ p }}
              </view>
            </block>
            <text v-else class="chip-empty">暂无历史记录，直接输入即可</text>
          </view>
          <view v-if="!isEdit && existing" class="party-hint">
            该对方已有未结清{{ loanType === 'lend' ? '应收' : '应付' }}借款 ·
            剩余 <text class="strong">{{ money(remainOf(existing)) }}</text>
            <view class="tip-note">保存时可选择「合并到该笔」或「另建一笔」</view>
          </view>
        </view>

        <!-- 金额 -->
        <view class="field">
          <label>本次借款金额（元）</label>
          <input
            v-if="!isEdit"
            class="input"
            type="digit"
            :focus="autoFocus"
            :value="amount"
            placeholder="0.00"
            placeholder-class="input-placeholder"
            @input="amount = $event.detail.value"
            @blur="onAmountBlur"
          />
          <view v-else class="readonly-box">{{ money(Number(amount)) }}</view>
        </view>

        <view class="row-2">
          <view class="field">
            <label>借款日期</label>
            <picker v-if="!isEdit" mode="date" :value="date" @change="date = $event.detail.value">
              <view class="picker-box">
                <text>{{ date }}</text>
                <view class="select-arrow ic-caret"></view>
              </view>
            </picker>
            <view v-else class="readonly-box">{{ date }}</view>
          </view>
          <view class="field">
            <label>约定还款日</label>
            <picker mode="date" :value="due || date" @change="due = $event.detail.value">
              <view class="picker-box">
                <text :class="{ 'ph-holder': !due }">{{ due || '未约定' }}</text>
                <view class="select-arrow ic-caret"></view>
              </view>
            </picker>
          </view>
        </view>

        <!-- 备注 -->
        <view class="field">
          <label>备注</label>
          <input
            class="input"
            type="text"
            :value="note"
            placeholder="选填，例如：朋友资金周转"
            placeholder-class="input-placeholder"
            @input="note = $event.detail.value"
          />
        </view>

        <view v-if="isEdit" class="time-meta">
          <view class="tm-row"><text class="tm-label">创建时间</text><text class="tm-val">{{ fmtTime(createTime) }}</text></view>
          <view class="tm-row"><text class="tm-label">修改时间</text><text class="tm-val">{{ fmtTime(modifyTime) }}</text></view>
        </view>
      </view>

      <view class="fl-form-foot">
        <view class="btn btn-ghost" @click="goBack">取消</view>
        <view class="btn btn-primary" @click="save">{{ isEdit ? '保存修改' : '保存' }}</view>
      </view>
    </view>
  </view>
</template>

<script>
import PageNav from '../../components/PageNav.vue'
import { store } from '../../common/store.js'
import { insertLoan, insertLoanAddon, updateLoanAmount, updateLoanMeta } from '../../common/repo.js'
import { partyOptions, repaidOf, remainOf } from '../../common/domain.js'
import { localDate, uid, money, round2, normalizeAmount, fmtDateTime } from '../../common/utils.js'

export default {
  components: { PageNav },
  data() {
    return {
      store,
      editId: '',
      isEdit: false,
      loanType: 'lend',
      party: '',
      amount: '',
      date: localDate(),
      due: '',
      note: '',
      autoFocus: false,
      createTime: '',
      modifyTime: ''
    }
  },
  computed: {
    chips() {
      return partyOptions(this.loanType)
    },
    /* 同方向同对方、且未结清的借款（仅在新增模式用于合并提示） */
    existing() {
      if (this.isEdit) return null
      const p = (this.party || '').trim()
      if (!p) return null
      return (
        store.loans.find(
          (l) => l.type === this.loanType && l.party === p && remainOf(l) > 0.005
        ) || null
      )
    }
  },
  onLoad(options) {
    options = options || {}
    const id = options.id
    if (id) {
      this.editId = decodeURIComponent(id)
      this.isEdit = true
      this.loadLoan()
    } else {
      const type = options.type || 'lend'
      this.loanType = type === 'borrow' ? 'borrow' : 'lend'
      if (options.party) this.party = decodeURIComponent(options.party)
      this.autoFocus = !this.party
    }
  },
  methods: {
    money,
    repaidOf,
    remainOf,
    fmtTime(iso) {
      return fmtDateTime(iso)
    },
    /* 金额输入防呆：失焦时纠正为保留两位小数 */
    onAmountBlur() {
      this.amount = normalizeAmount(this.amount)
    },
    switchType(t) {
      if (this.isEdit) return
      this.loanType = t
    },
    onPartyInput(e) {
      this.party = e.detail.value
    },
    pickParty(p) {
      this.party = p
    },
    /* 载入被编辑的借款：回填原数据（对方 / 金额 / 日期只读展示，约定还款日 / 备注可改） */
    loadLoan() {
      const l = store.loans.find((x) => x.id === this.editId)
      if (!l) return
      this.loanType = l.type
      this.party = l.party || ''
      this.amount = round2(l.amount).toFixed(2)
      this.date = l.date
      this.due = l.due || ''
      this.note = l.note || ''
      this.createTime = l.createTime || ''
      this.modifyTime = l.modifyTime || ''
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages && pages.length > 1) uni.navigateBack()
      else uni.reLaunch({ url: '/pages/index/index' })
    },

    /* ---------- 保存 ---------- */
    async save() {
      /* 编辑模式：仅更新「约定还款日 / 备注」 */
      if (this.isEdit) {
        const due = this.due || ''
        const note = (this.note || '').trim()
        try {
          await updateLoanMeta(this.editId, { due, note })
        } catch (e) {
          uni.showModal({ title: '保存失败', content: String(e.message || e), showCancel: false })
          return
        }
        uni.showToast({ title: '已保存', icon: 'none' })
        setTimeout(() => this.goBack(), 300)
        return
      }

      /* 新增模式 */
      const party = (this.party || '').trim()
      const amount = parseFloat(normalizeAmount(this.amount))
      this.amount = normalizeAmount(this.amount)
      if (!party) {
        uni.showToast({ title: '请输入对方姓名或机构名称', icon: 'none' })
        return
      }
      if (!amount || amount <= 0) {
        uni.showToast({ title: '请输入正确的金额', icon: 'none' })
        return
      }

      const amt = round2(amount)
      const date = this.date || localDate()
      const due = this.due || ''
      const note = (this.note || '').trim()
      const ex = this.existing

      if (ex) {
        const word = this.loanType === 'lend' ? '应收' : '应付'
        const verb = this.loanType === 'lend' ? '收' : '还'
        const content =
          `「${party}」已有一笔未结清的${word}借款：\n\n` +
          `总额 ${money(ex.amount)}\n` +
          `已${verb} ${money(repaidOf(ex))}\n` +
          `剩余 ${money(remainOf(ex))}\n\n` +
          `点「合并到该笔」→ 总额 +${money(amt)}\n` +
          `点「另建一笔」→ 生成独立记录`

        const choice = await new Promise((resolve) => {
          uni.showModal({
            title: '已存在未结清借款',
            content,
            confirmText: '合并到该笔',
            cancelText: '另建一笔',
            success: (res) => resolve(res.confirm),
            fail: () => resolve(false)
          })
        })

        if (choice) {
          try {
            const newAmount = round2(ex.amount + amt)
            const newDue = due || ex.due || ''
            const newNote = note ? (ex.note ? ex.note + '；' + note : note) : ex.note || ''
            await updateLoanAmount(ex.id, newAmount, newDue, newNote)
            await insertLoanAddon(ex.id, { amount: amt, date, note })
          } catch (e) {
            uni.showModal({ title: '保存失败', content: String(e.message || e), showCancel: false })
            return
          }
          uni.showToast({ title: `已合并到「${party}」的借款`, icon: 'none' })
          setTimeout(() => this.goBack(), 300)
          return
        }
      }

      try {
        await insertLoan({
          id: uid(),
          type: this.loanType,
          party,
          amount: amt,
          date,
          due,
          note
        })
      } catch (e) {
        uni.showModal({ title: '保存失败', content: String(e.message || e), showCancel: false })
        return
      }
      uni.showToast({ title: '已保存', icon: 'none' })
      setTimeout(() => this.goBack(), 300)
    }
  }
}
</script>
