<template>
  <view class="fl-app">
    <PageNav title="账户详情" sub="默认账户 + 手动添加" />

    <view class="fl-body">
      <view class="fl-form">
        <!-- ============ 默认账户（7 个内置独立账户） ============ -->
        <view class="settings-title-row">
          <view class="settings-title">默认账户（{{ builtinList.length }} 个）</view>
        </view>
        <view class="bi-box-grid">
          <view v-for="a in builtinList" :key="'bi-' + a.name" class="bi-box">{{ a.name }}</view>
        </view>
        <view class="settings-hint">
          这 7 个是内置独立账户，各自只是一个单独账户，与手动添加的账户完全平级、互不干涉，
          可直接在「记一笔」的账户 / 支付方式里选择。
        </view>

        <!-- ============ 手动添加的账户（全部） ============ -->
        <view class="settings-title-row title-mt">
          <view class="settings-title">手动添加的账户（{{ managedList.length }} 个）</view>
        </view>

        <block v-if="managedList.length">
          <view v-for="a in managedList" :key="a.name" class="credit-account-item">
            <view class="ca-main">
              <view class="ca-name">
                {{ a.name }}
                <text class="badge badge-gray">{{ kindLabel(a) }}</text>
              </view>
              <view class="ca-meta">{{ accountMeta(a) }}</view>
            </view>
            <view class="ca-ops">
              <text class="link-op edit" @click="editAccount(a.name)">编辑</text>
              <text class="link-op" @click="delAccount(a.name)">删除</text>
            </view>
          </view>
        </block>
        <view v-else class="credit-account-empty">还没有手动添加的账户</view>
      </view>
    </view>
  </view>
</template>

<script>
import PageNav from '../../components/PageNav.vue'
import { store, builtinAccounts, managedAccounts } from '../../common/store.js'
import { deleteAccount } from '../../common/repo.js'
import { ACCOUNT_KIND_LABELS } from '../../common/constants.js'

export default {
  components: { PageNav },
  data() {
    return { store }
  },
  computed: {
    /* 7 个内置独立账户（固定顺序） */
    builtinList() {
      return builtinAccounts()
    },
    /* 手动添加的账户（全部，含历史遗留） */
    managedList() {
      return managedAccounts()
    }
  },
  methods: {
    kindLabel(a) {
      return ACCOUNT_KIND_LABELS[a.kind] || '账户'
    },
    accountMeta(a) {
      if (a.kind === 'credit') {
        return (
          `账单日 每月${a.billDay || 5}日 · 还款日 每月${a.repayDay || 20}日` +
          (a.bankName ? ' · ' + a.bankName : '')
        )
      }
      if (a.kind === 'bank') {
        return a.bankName ? '发卡银行：' + a.bankName : '银行卡 · 无账单日 / 还款日'
      }
      if (a.kind === 'app') {
        return a.billDay && a.repayDay
          ? `已启用账单提醒 · 账单日 每月${a.billDay}日 · 还款日 每月${a.repayDay}日`
          : '未启用账单日 / 还款日'
      }
      return a.billDay && a.repayDay
        ? `账单日 每月${a.billDay}日 · 还款日 每月${a.repayDay}日`
        : ''
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
    }
  }
}
</script>
