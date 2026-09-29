<template>
  <view class="fl-app">
    <PageNav :title="isEdit ? '编辑记录' : '记一笔'" />

    <view class="fl-body">
      <view class="fl-form">
        <!-- 收支类型 -->
        <view class="field">
          <view class="seg seg-full">
            <view class="seg-btn" :class="{ active: txnType === 'expense' }" @click="switchType('expense')">支出</view>
            <view class="seg-btn" :class="{ active: txnType === 'income' }" @click="switchType('income')">收入</view>
          </view>
        </view>

        <!-- 金额 -->
        <view class="field">
          <label>金额（元）</label>
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

        <!-- 分类 -->
        <view class="field">
          <label>分类</label>
          <picker mode="selector" :range="catItems" :value="catIndex" @change="onCatChange">
            <view class="picker-box">
              <text>{{ cat }}</text>
              <view class="select-arrow ic-caret"></view>
            </view>
          </picker>
        </view>

        <!-- 账户 / 支付方式：默认账户（内置独立账户）+ 手动添加的账户 -->
        <view class="field">
          <label>账户 / 支付方式</label>
          <picker mode="selector" :range="accountLabels" :value="accountIndex" @change="onAccountChange">
            <view class="picker-box">
              <text>{{ accountLabel }}</text>
              <view class="select-arrow ic-caret"></view>
            </view>
          </picker>
        </view>

        <!-- 日期 -->
        <view class="field">
          <label>日期</label>
          <picker mode="date" :value="date" @change="onDateChange">
            <view class="picker-box">
              <text>{{ date }}</text>
              <view class="select-arrow ic-caret"></view>
            </view>
          </picker>
        </view>

        <!-- 备注 -->
        <view class="field">
          <label>备注</label>
          <input
            class="input"
            type="text"
            :value="note"
            placeholder="选填，例如：超市采购"
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
import { store, accountByName, accountOptions } from '../../common/store.js'
import { insertTxn, updateTxn, upsertAccount } from '../../common/repo.js'
import { calcBillDate, calcRepayDate } from '../../common/domain.js'
import { CATS, BUILTIN_ACCOUNTS } from '../../common/constants.js'
import { localDate, uid, round2, normalizeAmount, fmtDateTime } from '../../common/utils.js'

export default {
  components: { PageNav },
  data() {
    return {
      store,
      editId: '',
      isEdit: false,
      txnLoaded: false,
      txnType: 'expense',
      amount: '',
      cat: CATS.expense[0],
      accountValue: '',
      date: localDate(),
      note: '',
      autoFocus: false,
      createTime: '',
      modifyTime: ''
    }
  },
  computed: {
    catItems() {
      return CATS[this.txnType] || []
    },
    catIndex() {
      const idx = this.catItems.indexOf(this.cat)
      return idx < 0 ? 0 : idx
    },
    accounts() {
      return store.accounts || []
    },
    /* 下拉项：默认账户（7 个内置独立账户，固定顺序在前）+ 手动添加的账户（按名称排序在后） */
    accountItems() {
      const list = accountOptions().map((a) => ({ value: a.name, label: a.name }))
      /* 历史记录里引用了、但账户已被删除的：保留并标记已失效，避免编辑时丢账户 */
      if (
        this.accountValue &&
        !accountByName(this.accountValue) &&
        !list.some((i) => i.value === this.accountValue)
      ) {
        list.push({ value: this.accountValue, label: this.accountValue + '（已失效）' })
      }
      return list
    },
    accountLabels() {
      return this.accountItems.map((i) => i.label)
    },
    accountIndex() {
      const idx = this.accountItems.findIndex((i) => i.value === this.accountValue)
      return idx < 0 ? 0 : idx
    },
    accountLabel() {
      const it = this.accountItems.find((i) => i.value === this.accountValue)
      return it ? it.label : '请选择'
    }
  },
  onLoad(options) {
    options = options || {}
    let id = options.id || ''
    if (!id) {
      /* 兜底 1：个别运行时 onLoad 丢查询参数，从页面栈补取 */
      try {
        const pages = getCurrentPages()
        const top = pages[pages.length - 1]
        const opts = (top && top.$page && top.$page.options) || (top && top.options) || {}
        if (opts && opts.id) id = opts.id
      } catch (e) {
        /* 忽略 */
      }
    }
    if (id) {
      this.editId = decodeURIComponent(id)
      this.isEdit = true
      this.loadTxn()
    } else {
      this.txnType = options.type === 'income' ? 'income' : 'expense'
      this.cat = CATS[this.txnType][0]
      this.accountValue = this.defaultAccountName()
      this.date = localDate()
      /* 新增也要按默认账户回填账期（默认账户可能就是信用卡 / 带账期的 App 渠道） */
      this.applyAccountCycle(this.accountValue)
      this.autoFocus = true
    }
  },
  onShow() {
    /* 兜底 2：冷启动竞争时记录可能晚于本页载入，show 时补载一次 */
    if (this.isEdit && !this.txnLoaded) this.loadTxn()
  },
  watch: {
    /* 账户可能在页面打开之后才从数据库载入完成（冷启动竞争），
       此时补选默认账户，避免下拉框空白、无法保存 */
    accounts(list) {
      if (this.isEdit) return
      if (this.accountValue) return
      if (!list || !list.length) return
      this.accountValue = this.defaultAccountName()
      /* 账户晚于页面载入时补选默认账户，账期也要一并补上 */
      this.applyAccountCycle(this.accountValue)
    }
  },
  methods: {
    fmtTime(iso) {
      return fmtDateTime(iso)
    },
    /* 金额输入防呆：失焦时纠正为保留两位小数 */
    onAmountBlur() {
      this.amount = normalizeAmount(this.amount)
    },
    defaultAccountName() {
      const list = accountOptions()
      return list.length ? list[0].name : BUILTIN_ACCOUNTS[0] || ''
    },
    /* ---------- 载入被编辑的记录（回填原数据） ---------- */
    loadTxn() {
      const t = store.txns.find((x) => x.id === this.editId)
      if (!t) return
      this.txnLoaded = true
      this.txnType = t.type
      this.amount = String(t.amount)
      this.cat = t.cat
      this.date = t.date
      this.note = t.note || ''

      this.accountValue = t.account || this.defaultAccountName()
      this.createTime = t.createTime || ''
      this.modifyTime = t.modifyTime || ''
      /* 账期必须一并回填：否则编辑历史记录时 billDay/repayDay 还停在默认 5/20，
       * 保存时会用错的账期推算 billDate/repayDate，甚至把账户的账期回写成 5/20 */
      this.applyAccountCycle(this.accountValue, t)
    },

    /* 按账户回填账单日 / 还款日：账户自身设置 → 记录上存过的账期 → 默认 5/20 */
    applyAccountCycle(name, txn) {
      const acc = accountByName(name)
      if (acc && (acc.kind === 'credit' || (acc.billDay && acc.repayDay))) {
        this.billDay = Number(acc.billDay) || (txn && Number(txn.billDay)) || 5
        this.repayDay = Number(acc.repayDay) || (txn && Number(txn.repayDay)) || 20
        return
      }
      if (txn && txn.billDay && txn.repayDay) {
        this.billDay = Number(txn.billDay)
        this.repayDay = Number(txn.repayDay)
      }
    },

    /* ---------- 字段联动 ---------- */
    switchType(t) {
      this.txnType = t
      const list = CATS[t]
      if (list.indexOf(this.cat) < 0) this.cat = list[0]
    },
    onCatChange(e) {
      this.cat = this.catItems[Number(e.detail.value)] || this.catItems[0]
    },
    onAccountChange(e) {
      const it = this.accountItems[Number(e.detail.value)]
      if (!it) return
      this.accountValue = it.value
      this.applyAccountCycle(it.value)
    },
    onBillDayChange(e) {
      this.billDay = Number(e.detail.value) + 1
    },
    onRepayDayChange(e) {
      this.repayDay = Number(e.detail.value) + 1
    },
    onDateChange(e) {
      this.date = e.detail.value
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages && pages.length > 1) uni.navigateBack()
      else uni.reLaunch({ url: '/pages/index/index' })
    },

    /* ---------- 保存 ---------- */
    async save() {
      /* 即使没触发失焦，保存时也按两位小数归一化一次 */
      const amount = parseFloat(normalizeAmount(this.amount))
      if (!amount || amount <= 0) {
        uni.showToast({ title: '请输入正确的金额', icon: 'none' })
        return
      }
      this.amount = normalizeAmount(this.amount)

      const rawAccount = this.accountValue
      if (!rawAccount) {
        uni.showToast({
          title: this.accounts.length ? '请选择账户 / 支付方式' : '账户数据尚未加载完成，请稍候重试',
          icon: 'none'
        })
        return
      }

      const acc = accountByName(rawAccount)
      const data = {
        type: this.txnType,
        cat: this.cat,
        amount: round2(amount),
        date: this.date || localDate(),
        account: rawAccount,
        note: (this.note || '').trim()
      }

      /* 信用账户：保存账单日 / 还款日并推算（同步回该卡默认设置） */
      if (acc && (acc.kind === 'credit' || (acc.billDay && acc.repayDay))) {
        const billDay = this.billDay || 5
        const repayDay = this.repayDay || 20
        data.billDay = billDay
        data.repayDay = repayDay
        data.billDate = calcBillDate(data.date, billDay)
        data.repayDate = calcRepayDate(data.date, billDay, repayDay)
        if (acc.kind === 'credit') {
          await upsertAccount({
            name: acc.name,
            type: acc.type,
            kind: acc.kind,
            bankName: acc.bankName,
            billDay,
            repayDay
          })
        }
      }

      try {
        if (this.isEdit) {
          if (!this.txnLoaded) {
            /* 兜底 3：一直没能回填原记录，说明记录不存在，禁止"编辑"覆盖成新数据 */
            uni.showModal({ title: '无法编辑', content: '未找到原记录，请返回列表后重试。', showCancel: false })
            return
          }
          const t = store.txns.find((x) => x.id === this.editId)
          const keep =
            !acc && t && t.account === data.account && t.repayDate
              ? { billDay: t.billDay, repayDay: t.repayDay, billDate: t.billDate, repayDate: t.repayDate }
              : {}
          await updateTxn(this.editId, Object.assign({}, data, keep))
        } else {
          await insertTxn(Object.assign({ id: uid() }, data))
        }
      } catch (e) {
        uni.showModal({ title: '保存失败', content: String(e.message || e), showCancel: false })
        return
      }

      uni.showToast({
        title: data.repayDate ? `已记录 · ${data.account} 预计 ${data.repayDate} 还款` : '已保存',
        icon: 'none'
      })
      setTimeout(() => this.goBack(), 300)
    }
  }
}
</script>
