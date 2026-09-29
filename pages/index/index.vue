<template>
  <view class="fl-app">
    <TopBar :keyword="searchKeyword" @update:keyword="onSearch" @settings="goSettings" />

    <view class="fl-main">
      <view class="fl-content">
        <!-- ==================== 总览 ==================== -->
        <block v-if="page === 'overview'">
          <!-- 家庭财务一览：与下方趋势区统一为完整大卡片 -->
          <view class="card overview-summary-card">
            <view class="section-title sec-mb18">家庭财务一览</view>

            <!-- 还款提醒条：紧跟在标题下方、筛选行上方显示 -->
            <view v-if="creditRows.items.length" class="credit-banner">
              <!-- 第一行：信用卡图标 + 总计需还款 -->
              <view class="cb-head">
                <text class="cb-icon">💳</text>
                <text class="cb-head-label">总计需还款：</text>
                <text class="cb-total">{{ money(creditRows.total) }}</text>
              </view>
              <!-- 第二行起：每行「到期状态 + 账户名 (还款日) + 该账户需还金额」
                   默认只显示 3 行（1 行总计 + 2 行账户），超出点「展开」看全部 -->
              <view v-for="(it, i) in visibleRepayItems()" :key="i" class="cb-item">
                <text class="cb-status" :class="{ 'cb-status-today': it.days === 0 }">{{ it.statusText }}</text>
                <text class="cb-item-name">{{ it.name }} ({{ it.dateText }})</text>
                <text class="cb-item-amt">{{ money(it.amount) }}</text>
              </view>
              <view
                v-if="creditRows.items.length > REPAY_ACC_LIMIT"
                class="cb-more"
                @tap="toggleRepay()"
              >
                {{ repayOpen ? '收起' : `展开全部 ${creditRows.items.length} 个账户` }}
                <text class="cb-more-arrow">{{ repayOpen ? '︿' : '﹀' }}</text>
              </view>
            </view>

            <view class="filter-bar">
              <view class="fb-left">
                <picker mode="selector" :range="yearTexts" :value="yearIndex" @change="onOvYearChange">
                  <view class="filter-select">{{ ovYear }} 年</view>
                </picker>
                <picker mode="selector" :range="monthTexts" :value="ovMonth" @change="onOvMonthChange">
                  <view class="filter-select">{{ ovMonth ? ovMonth + ' 月' : '全年' }}</view>
                </picker>
              </view>
              <text class="search-tip">{{ scopeName }} 共 {{ scoped.length }} 笔</text>
            </view>

            <view class="stat-grid">
              <view class="stat-card">
                <view class="stat-label">{{ scopeLabel }}收入</view>
                <view class="stat-value income">{{ money(income) }}</view>
              </view>
              <view class="stat-card">
                <view class="stat-label">{{ scopeLabel }}支出</view>
                <view class="stat-value expense">{{ money(expense) }}</view>
              </view>
              <view class="stat-card">
                <view class="stat-label">{{ scopeLabel }}结余</view>
                <view class="stat-value" :class="balance >= 0 ? 'income' : 'expense'">{{ money(balance) }}</view>
              </view>
              <view class="stat-card">
                <view class="stat-label">待收 / 待还</view>
                <view class="stat-value stat-pair">
                  <text class="pair-in">{{ money(receivable) }}</text>
                  <text class="pair-sep"> / </text>
                  <text class="pair-out">{{ money(payable) }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="card">
            <view class="section-title sec-mb18">{{ ovYear }} 年度收支趋势</view>
            <view class="trend-sum">
              <text class="ts-item">当月收入 <text class="ts-in">{{ money(income) }}</text></text>
              <text class="ts-item">当月支出 <text class="ts-out">{{ money(expense) }}</text></text>
              <text class="ts-item">当月结余 <text class="ts-dark">{{ money(balance) }}</text></text>
            </view>
            <view class="chart">
              <view
                v-for="(d, i) in trend"
                :key="i"
                class="chart-col"
                :class="{ sel: ovMonth === i + 1 }"
                @click="setOvMonthValue(i + 1)"
              >
                <view class="chart-bars">
                  <view class="bar bar-in" :style="{ height: barHeight(d.income) }"></view>
                  <view class="bar bar-out" :style="{ height: barHeight(d.expense) }"></view>
                </view>
                <view class="chart-label">{{ d.label }}</view>
              </view>
            </view>
            <view class="legend">
              <view class="legend-item"><view class="legend-dot" style="background: #1BA784"></view><text>收入</text></view>
              <view class="legend-item"><view class="legend-dot" style="background: #C20C0C"></view><text>支出</text></view>
            </view>
          </view>

          <view class="card">
            <view class="section-title sec-mb20">{{ scopeName }}收支分类占比</view>
            <view class="overview-charts">
              <view class="overview-chart-item">
                <view class="chart-subtitle">支出分类</view>
                <DonutRing
                  :cats="expCatList"
                  :total="expTotal"
                  center-label="总支出"
                  :empty-text="scopeName + '暂无支出记录'"
                />
              </view>
              <view class="overview-chart-item">
                <view class="chart-subtitle">收入分类</view>
                <DonutRing
                  :cats="incCatList"
                  :total="incTotal"
                  center-label="总收入"
                  :empty-text="scopeName + '暂无收入记录'"
                />
              </view>
            </view>
          </view>

          <view class="card">
            <view class="section-title sec-mb20">{{ scopeName }}支出分类排行</view>
            <block v-if="expCatList.length">
              <view v-for="(c, i) in expCatList" :key="i" class="cat-row">
                <text class="cat-name">{{ c.name }}</text>
                <view class="cat-bar-wrap">
                  <view class="cat-bar" :style="{ width: catWidth(c.value) }"></view>
                </view>
                <view class="cat-val">
                  <text>{{ money(c.value) }}</text>
                  <text class="muted">{{ pct(c.value, expTotal) }}%</text>
                </view>
              </view>
            </block>
            <view v-else class="empty">{{ scopeName }}暂无支出数据</view>
          </view>

          <view class="card">
            <view class="section-title sec-mb18">{{ scopeName }}支出渠道排行</view>
            <!-- 五个类目各自独立切换「汇总 / 明细」，默认全部汇总 -->
            <view class="ch-toggle-row">
              <view
                v-for="c in channelCats"
                :key="c.key"
                class="ch-toggle"
                :class="{ on: channelModes[c.key] === 'detail' }"
                @click="toggleChannelMode(c.key)"
              >
                <text>{{ c.label }}</text>
                <text class="ch-toggle-mode">{{ channelModes[c.key] === 'detail' ? '明细' : '汇总' }}</text>
              </view>
            </view>
            <view class="ch-tip">
              默认显示各渠道汇总；点上方按钮可单独把某一类切换为「明细」，只影响该类，其余仍为汇总。
            </view>
            <block v-if="channelRows.length">
              <view
                v-for="(c, i) in channelRows"
                :key="i"
                class="cat-row"
              >
                <text class="cat-name cat-name-wide">{{ c.name }}</text>
                <view class="cat-bar-wrap">
                  <view class="cat-bar" :style="{ width: channelWidth(c.value) }"></view>
                </view>
                <view class="cat-val">
                  <text>{{ money(c.value) }}</text>
                  <text class="muted">{{ pct(c.value, expense) }}%</text>
                </view>
              </view>
            </block>
            <view v-else class="empty">{{ scopeName }}暂无支出数据</view>
          </view>
        </block>

        <!-- ==================== 明细 ==================== -->
        <block v-else-if="page === 'detail'">
          <view class="page-head">
            <view class="ph-title">收支明细</view>
            <view class="ph-sub">共 {{ detailList.length }} 条 · 收入 {{ money(detailIn) }} · 支出 {{ money(detailOut) }}</view>
          </view>

          <view class="card">
            <view class="filter-bar">
              <view class="seg">
                <view class="seg-btn" :class="{ active: txnFilter === 'all' }" @click="setTxnFilter('all')">全部</view>
                <view class="seg-btn" :class="{ active: txnFilter === 'income' }" @click="setTxnFilter('income')">收入</view>
                <view class="seg-btn" :class="{ active: txnFilter === 'expense' }" @click="setTxnFilter('expense')">支出</view>
              </view>
              <view v-if="searchKeyword" class="search-tip">
                <text>搜索：“{{ searchKeyword }}”</text>
                <text class="clear-link" @click="clearSearch">清除</text>
              </view>
            </view>

            <!-- 年月筛选：可只看某一年，或某年某月 -->
            <view class="filter-bar">
              <view class="fb-left">
                <picker mode="selector" :range="detailYearTexts" :value="detailYearIndex" @change="onDetailYearChange">
                  <view class="filter-select" :class="{ on: detailYear }">{{ detailYear ? detailYear + ' 年' : '全部年份' }}</view>
                </picker>
                <picker mode="selector" :range="detailMonthTexts" :value="detailMonth" @change="onDetailMonthChange">
                  <view class="filter-select" :class="{ on: detailMonth }">{{ detailMonth ? detailMonth + ' 月' : '全部月份' }}</view>
                </picker>
              </view>
            </view>

            <block v-if="monthGroups.length">
              <view v-for="g in monthGroups" :key="g.month" class="month-group">
                <view class="month-head" @click="toggleMonth(g.month)">
                  <view class="month-arrow" :class="{ open: g.open }">▶</view>
                  <text class="month-name">{{ g.title }}</text>
                  <view class="month-sum">
                    <text v-if="g.income" class="amt-income">+{{ money(g.income) }}</text>
                    <text v-if="g.expense" class="amt-expense">−{{ money(g.expense) }}</text>
                  </view>
                  <text class="month-count">{{ g.items.length }}笔</text>
                </view>
                <view v-show="g.open" class="month-body">
                  <view
                    v-for="t in g.items"
                    :key="t.id"
                    class="detail-row"
                    :class="'row-' + t.type"
                  >
                    <text class="dr-date">{{ t.date }}</text>
                    <view class="dr-cat">
                      <text class="tag">{{ t.cat }}</text>
                      <text v-if="t.account" class="acct-tag">{{ t.account }}</text>
                    </view>
                    <view class="dr-note">
                      <text>{{ t.note || '—' }}</text>
                    </view>
                    <text class="dr-amt" :class="'amt-' + t.type">
                      {{ t.type === 'income' ? '+' : '−' }}{{ money(t.amount) }}
                    </text>
                    <view class="dr-ops">
                      <view class="row-ops">
                        <text class="link-op edit" @click.stop="goTxnEdit(t.id)">编辑</text>
                        <text class="link-op" @click.stop="delTxn(t.id)">删除</text>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </block>
            <view v-else class="empty">暂无记录</view>
          </view>
        </block>

        <!-- ==================== 借还 ==================== -->
        <block v-else-if="page === 'loans'">
          <view class="page-head">
            <view class="ph-title">借款还款</view>
            <view class="ph-sub">点击卡片展开，同一个人可「再借一笔」自动带出信息</view>
          </view>

          <view class="stat-grid">
            <view class="stat-card">
              <view class="stat-label">应收 · 别人欠我家</view>
              <view class="stat-value income">{{ money(loanRecv) }}</view>
              <view class="stat-sub">共 {{ lends.length }} 笔 · 未结清 {{ openLends }} 笔</view>
            </view>
            <view class="stat-card">
              <view class="stat-label">应付 · 我家欠别人</view>
              <view class="stat-value expense">{{ money(loanPay) }}</view>
              <view class="stat-sub">共 {{ borrows.length }} 笔 · 未结清 {{ openBorrows }} 笔</view>
            </view>
          </view>

          <view class="filter-bar fb-mt">
            <view class="seg">
              <view class="seg-btn" :class="{ active: loanFilter === 'all' }" @click="setLoanFilter('all')">全部</view>
              <view class="seg-btn" :class="{ active: loanFilter === 'lend' }" @click="setLoanFilter('lend')">应收</view>
              <view class="seg-btn" :class="{ active: loanFilter === 'borrow' }" @click="setLoanFilter('borrow')">应付</view>
            </view>
            <view class="btn btn-primary btn-sm" @click="goLoanEdit('lend', '')">+ 新增借款</view>
          </view>

          <!-- 顶部搜索框的关键词同样作用于借还（姓名 / 备注 / 日期 / 约定还款日 / 金额） -->
          <view v-if="searchKeyword" class="filter-bar">
            <view class="search-tip">
              <text>搜索：“{{ searchKeyword }}”</text>
              <text class="clear-link" @click="clearSearch">清除</text>
            </view>
          </view>

          <block v-if="loanList.length">
            <view
              v-for="l in loanList"
              :key="l.id"
              class="loan-card"
              :class="{ done: remainOf(l) <= 0.005 }"
            >
              <view class="loan-summary" @click="toggleLoan(l.id)">
                <view class="loan-main">
                  <!-- 第一行：姓名 + 应收 / 应付　……　最右侧「剩余：¥x.xx」 -->
                  <view class="loan-row1">
                    <text class="loan-party">{{ l.party }}</text>
                    <text class="badge" :class="l.type === 'lend' ? 'badge-green' : 'badge-red'">
                      {{ l.type === 'lend' ? '应收' : '应付' }}
                    </text>
                    <text v-if="remainOf(l) <= 0.005" class="badge badge-gray">已结清</text>
                    <text v-if="(l.addons || []).length" class="badge badge-gray">
                      追加{{ (l.addons || []).length }}次
                    </text>
                    <text
                      class="loan-remain-inline"
                      :style="{ color: remainOf(l) <= 0.005 ? '#1BA784' : (l.type === 'lend' ? '#1BA784' : '#C20C0C') }"
                    >
                      剩余：{{ money(remainOf(l)) }}
                    </text>
                  </view>
                  <!-- 第二行：总额 / 已收（已还） -->
                  <view class="loan-row2">
                    <text>总额 {{ money(l.amount) }}</text>
                    <text>已{{ l.type === 'lend' ? '收' : '还' }} {{ money(repaidOf(l)) }}</text>
                  </view>
                  <!-- 第三行：借款日期 + 约定还款日（没有约定还款日就不显示） -->
                  <view class="loan-row3">
                    <text>借款日期：{{ l.date }}</text>
                    <text v-if="l.due">约定还款日：{{ l.due }}</text>
                  </view>
                </view>
                <view class="loan-arrow" :class="{ open: !!loanOpen[l.id] }">▶</view>
              </view>

              <view v-if="loanOpen[l.id]" class="loan-detail">
                <view class="progress">
                  <view
                    class="progress-bar"
                    :style="{
                      width: progressPct(l) + '%',
                      background: l.type === 'lend' ? '#1BA784' : '#C20C0C'
                    }"
                  ></view>
                </view>
                <view class="loan-remain-line">
                  剩余
                  <text class="strong" :style="{ color: remainOf(l) <= 0.005 ? '#1BA784' : (l.type === 'lend' ? '#1BA784' : '#C20C0C') }">
                    {{ money(remainOf(l)) }}
                  </text>
                  <text class="muted loan-pct">{{ progressPct(l).toFixed(0) }}% 已结清</text>
                </view>

                <view v-if="(l.addons || []).length" class="addon-list">
                  <view class="addon-title">追加借款记录</view>
                  <view v-for="(a, i) in sortedAddons(l)" :key="i" class="addon-item">
                    <view class="addon-left">
                      <text class="addon-date">{{ a.date }}</text>
                      <text v-if="a.note" class="addon-note">{{ a.note }}</text>
                    </view>
                    <text class="addon-right">+{{ money(a.amount) }}</text>
                  </view>
                </view>

                <view v-if="(l.repayments || []).length" class="repay-list">
                  <view class="repay-title">
                    {{ l.type === 'lend' ? '收回' : '还款' }}记录 · 每笔后剩余额度
                  </view>
                  <view v-for="(r, i) in enrichedRepays(l)" :key="i" class="repay-item">
                    <view class="repay-left">
                      <text class="repay-date">{{ r.date }}</text>
                      <text v-if="r.note" class="repay-note">{{ r.note }}</text>
                    </view>
                    <view class="repay-right">
                      <text class="r-amt">+{{ money(r.amount) }}</text>
                      <text class="r-left">剩余 {{ money(r.after) }}</text>
                    </view>
                  </view>
                </view>

                <!-- 备注：只在展开时显示（创建 / 修改时间仅在编辑页展示） -->
                <view v-if="l.note" class="loan-extra">备注：{{ l.note }}</view>

                <view class="loan-actions">
                  <view class="btn btn-sm btn-ghost" @click="goLoanEdit(l.type, l.party)">再借一笔</view>
                  <view class="btn btn-sm btn-ghost" @click="goLoanModify(l.id)">修改</view>
                  <view class="btn btn-sm btn-ghost" @click="delLoan(l.id)">删除</view>
                  <view
                    class="btn btn-sm"
                    :class="remainOf(l) <= 0.005 ? 'btn-primary btn-disabled' : 'btn-primary'"
                    @click="goRepay(l.id)"
                  >
                    {{ l.type === 'lend' ? '收回' : '还款' }}
                  </view>
                </view>
              </view>
            </view>
          </block>
          <view v-else class="card">
            <view class="empty">
              {{ searchKeyword ? '没有匹配「' + searchKeyword + '」的借款记录' : '暂无借款记录，点击上方新增' }}
            </view>
          </view>
        </block>

        <!-- ==================== 纪念日 ==================== -->
        <block v-else>
          <view class="page-head">
            <view class="ph-title">纪念日</view>
            <view class="ph-sub">记录生日与重要纪念日 · 支持农历 · 自动倒计时提醒</view>
          </view>

          <view class="filter-bar">
            <text class="search-tip">
              共 {{ annivList.length }} 个{{ annivTip ? ' · ' + annivTip : '' }}
            </text>
            <view class="btn btn-primary btn-sm" @click="goAnnivEdit('')">+ 添加纪念日</view>
          </view>

          <!-- 顶部搜索框的关键词同样作用于纪念日（名称 / 备注 / 日期） -->
          <view v-if="searchKeyword" class="filter-bar">
            <view class="search-tip">
              <text>搜索：“{{ searchKeyword }}”</text>
              <text class="clear-link" @click="clearSearch">清除</text>
            </view>
          </view>

          <block v-if="annivList.length">
            <view
              v-for="x in annivList"
              :key="x.a.id"
              class="anniv-card"
              :class="{ today: x.left === 0 }"
            >
              <!-- 左侧方形图标已删除；第一行名称、第二行备注（没有则不显示），右侧区域保持原样 -->
              <view class="anniv-main">
                <view class="anniv-title">{{ x.a.title }}</view>
                <view v-if="x.a.note" class="anniv-note">备注：{{ x.a.note }}</view>
              </view>
              <view class="anniv-count">
                <view class="anniv-days" :style="{ color: x.labelColor }">{{ x.label }}</view>
                <view class="anniv-next">{{ x.left >= 0 && x.left < 9000 && x.next ? x.next : '—' }}</view>
              </view>
              <view class="anniv-ops">
                <text class="link-op edit" @click="goAnnivEdit(x.a.id)">编辑</text>
                <text class="link-op" @click="delAnniv(x.a.id)">删除</text>
              </view>
            </view>
          </block>
          <view v-else class="card">
            <view class="empty">
              {{ searchKeyword ? '没有匹配「' + searchKeyword + '」的纪念日' : '还没有纪念日，点击右上角添加' }}
            </view>
          </view>
        </block>
      </view>
    </view>

    <TabBar :current="page" @change="setPage" @add="goTxnEdit('')" />

    <AlertPopup
      :visible="store.alertVisible"
      :alerts="store.alerts"
      :auto-close="5"
      @close="closeAlerts"
    />
  </view>
</template>

<script>
import TopBar from '../../components/TopBar.vue'
import TabBar from '../../components/TabBar.vue'
import AlertPopup from '../../components/AlertPopup.vue'
import DonutRing from '../../components/DonutRing.vue'

import { store } from '../../common/store.js'
import { closeAlerts } from '../../common/reminder.js'
import { deleteTxn, deleteLoan, deleteAnniv } from '../../common/repo.js'
import { money, localDate, round2 } from '../../common/utils.js'
import {
  repaidOf,
  remainOf,
  annivDaysLeft,
  annivNextDate,
  annivDateLabel,
  availableYears,
  creditRepayMap
} from '../../common/domain.js'
import { getSettings, managedAccounts } from '../../common/store.js'
import {
  CHANNEL_CATS, CHANNEL_FIXED_HEAD, CHANNEL_FIXED_TAIL
} from '../../common/constants.js'

const now = new Date()

/* 「明细」模式下每个类目的默认状态：汇总 */
function defaultChannelModes() {
  const m = {}
  CHANNEL_CATS.forEach((c) => {
    m[c.key] = 'sum'
  })
  return m
}

/* 未归类渠道的合并键：'app-京东：白条' → 'app-京东'，其余用原名 */
function channelGroupKey(name) {
  const idx = String(name).indexOf('：')
  return idx > 0 ? String(name).slice(0, idx) : String(name)
}

function normalizeSearch(value) {
  return String(value || '').trim().toLowerCase()
}

/* 收支搜索：备注、分类、账户、收支类型与日期 */
function txnMatchesSearch(t, keyword) {
  const typeWord = t.type === 'income' ? '收入' : '支出'
  const hay = [t.note, t.cat, t.account, typeWord, t.date]
  return hay.some((v) => String(v || '').toLowerCase().indexOf(keyword) >= 0)
}

/* 借还搜索：party 同时承载个人姓名与机构名，并支持「应收 / 应付」关键词 */
function loanMatchesSearch(l, keyword) {
  const typeWord = l.type === 'lend' ? '应收' : '应付'
  const hay = [
    l.party,
    l.note,
    l.date,
    l.due,
    typeWord,
    String(l.amount),
    money(l.amount),
    (l.addons || []).map((a) => a.note || '').join(' '),
    (l.repayments || []).map((r) => r.note || '').join(' ')
  ]
  return hay.some((v) => String(v || '').toLowerCase().indexOf(keyword) >= 0)
}

/* 纪念日搜索：名称为主，同时保留原有备注、日期与重复方式搜索能力 */
function annivMatchesSearch(a, keyword) {
  const hay = [
    a.title,
    a.note,
    annivDateLabel(a),
    a.repeat ? '每年重复' : '仅一次',
    a.lunar ? '农历' : '公历'
  ]
  return hay.some((v) => String(v || '').toLowerCase().indexOf(keyword) >= 0)
}

export default {
  components: { TopBar, TabBar, AlertPopup, DonutRing },
  data() {
    return {
      store,
      page: 'overview',
      /* 总览 */
      ovYear: now.getFullYear(),
      ovMonth: now.getMonth() + 1,
      /* 明细 */
      txnFilter: 'all',
      searchKeyword: '',
      monthOpen: {},
      detailYear: '',
      detailMonth: 0,
      /* 渠道排行：五个类目各自独立切换 汇总/明细（默认全部汇总） */
      channelModes: defaultChannelModes(),
      /* 借还 */
      loanFilter: 'all',
      loanOpen: {},
      /* 四个 Tab 各自的滚动位置（切换时记忆 / 恢复，避免被空页面的高度裁剪冲掉） */
      scrollMemo: { overview: 0, detail: 0, loans: 0, anniv: 0 },
      /* 恢复滚动位置期间暂停记录，防止切换瞬间的裁剪事件污染记忆 */
      scrollRestoring: false,
      /* 还款条：账户行默认只显示 REPAY_ACC_LIMIT 行，点「展开全部」看剩下的 */
      repayOpen: false,
      /* 还款条默认显示的账户行数（加上第一行总计 = 默认共 3 行；模板里也要用，故放在 data） */
      REPAY_ACC_LIMIT: 2
    }
  },
  computed: {
    /* ---------------- 公共 ---------------- */
    currentMonth() {
      return localDate().slice(0, 7)
    },

    /* ---------------- 总览 ---------------- */
    yearTexts() {
      return availableYears().map((y) => y + ' 年')
    },
    yearIndex() {
      const idx = availableYears().indexOf(String(this.ovYear))
      return idx < 0 ? 0 : idx
    },
    monthTexts() {
      const arr = ['全年']
      for (let i = 1; i <= 12; i++) arr.push(i + ' 月')
      return arr
    },
    scopeLabel() {
      return this.ovMonth ? this.ovMonth + ' 月' : '全年'
    },
    monthStr() {
      const m = String(this.ovMonth).padStart(2, '0')
      return `${this.ovYear}-${m}`
    },
    scopeName() {
      return this.ovMonth ? `${this.ovYear} 年 ${this.ovMonth} 月` : `${this.ovYear} 年全年`
    },
    scoped() {
      if (this.ovMonth) {
        return store.txns.filter((t) => String(t.date).slice(0, 7) === this.monthStr)
      }
      return store.txns.filter((t) => String(t.date).slice(0, 4) === String(this.ovYear))
    },
    yearScoped() {
      return store.txns.filter((t) => String(t.date).slice(0, 4) === String(this.ovYear))
    },
    income() {
      return this.sum(this.scoped.filter((t) => t.type === 'income'))
    },
    expense() {
      return this.sum(this.scoped.filter((t) => t.type === 'expense'))
    },
    balance() {
      return round2(this.income - this.expense)
    },
    receivable() {
      return round2(store.loans.filter((l) => l.type === 'lend').reduce((a, l) => a + remainOf(l), 0))
    },
    payable() {
      return round2(store.loans.filter((l) => l.type === 'borrow').reduce((a, l) => a + remainOf(l), 0))
    },
    trend() {
      const arr = []
      for (let i = 1; i <= 12; i++) {
        const m = `${this.ovYear}-${String(i).padStart(2, '0')}`
        const list = store.txns.filter((x) => String(x.date).slice(0, 7) === m)
        arr.push({
          label: `${i}月`,
          income: this.sum(list.filter((x) => x.type === 'income')),
          expense: this.sum(list.filter((x) => x.type === 'expense'))
        })
      }
      return arr
    },
    maxTrend() {
      let max = 1
      this.trend.forEach((d) => {
        max = Math.max(max, d.income, d.expense)
      })
      return max
    },
    expCatList() {
      return this.catList('expense')
    },
    incCatList() {
      return this.catList('income')
    },
    expTotal() {
      return round2(this.expCatList.reduce((a, c) => a + c.value, 0))
    },
    incTotal() {
      return round2(this.incCatList.reduce((a, c) => a + c.value, 0))
    },
    maxCat() {
      return this.expCatList.length ? this.expCatList[0].value : 1
    },
    /* 支出渠道排行：全部行按支出金额从多到少排序 + 五个类目可各自切换「汇总 / 明细」 */
    channelCats() {
      return CHANNEL_CATS
    },
    channelRows() {
      const amt = {}
      this.scoped
        .filter((t) => t.type === 'expense')
        .forEach((t) => {
          const k = String(t.account || '').trim() || '未记账户'
          amt[k] = round2((amt[k] || 0) + (Number(t.amount) || 0))
        })

      /* 排序单元 = 一个「块」：{ value: 排序用金额, rows: [{ name, value }] }
       * 块内可能有多行（类目切「明细」时是父行 + 各子账户行）。
       * 排序只按块的合计金额比较，块内行序不动 —— 明细模式下父子行始终相邻，
       * 不会被金额排序拆散。 */
      const groups = []
      const grouped = {}
      const markUsed = (n) => {
        grouped[n] = 1
      }

      /* 1) 固定行（现金）：始终单独汇总显示 */
      CHANNEL_FIXED_HEAD.forEach((n) => {
        markUsed(n)
        const v = amt[n] || 0
        groups.push({ value: v, rows: [{ name: n, value: v }] })
      })

      /* 2) 五个类目：各自独立切换 汇总 / 明细 */
      CHANNEL_CATS.forEach((c) => {
        markUsed(c.key)
        /* 同前缀的手动账户（如「信用卡：招行」）归入本类目 */
        const subs = Object.keys(amt).filter((n) => n !== c.key && n.indexOf(c.prefix) === 0)
        subs.forEach(markUsed)
        if (this.channelModes[c.key] === 'detail') {
          /* 明细：内置默认账户 + 同前缀的手动账户分行列出 */
          const rows = [{ name: c.key, value: amt[c.key] || 0 }]
          subs
            .sort((a, b) => String(a).localeCompare(String(b), 'zh'))
            .forEach((n) => rows.push({ name: n, value: amt[n] }))
          groups.push({ value: round2(rows.reduce((a, r) => a + r.value, 0)), rows })
        } else {
          /* 汇总：内置默认账户 + 同前缀的手动账户金额加总，只显示一行 */
          const sum = round2((amt[c.key] || 0) + subs.reduce((a, n) => a + amt[n], 0))
          groups.push({ value: sum, rows: [{ name: c.key, value: sum }] })
        }
      })

      /* 3) 固定行（其他） */
      CHANNEL_FIXED_TAIL.forEach((n) => {
        markUsed(n)
        const v = amt[n] || 0
        groups.push({ value: v, rows: [{ name: n, value: v }] })
      })

      /* 4) 未归类：所有「非 5 大类目归属」的手动账户（京东 / 美团 / 抖音 / 滴滴 / 其他 app 等），
       *    始终列出（无支出显示 ¥0），并按名称前缀合并子账户（如 app-京东：白条） */
      const coveredByCat = (name) =>
        CHANNEL_CATS.some((c) => name === c.key || String(name).indexOf(c.prefix) === 0)
      const restGroups = {} /* 合并键 -> [账户名...] */
      /* 4a) 手动账户：只要不属于 5 大类目，一律显示（即使 ¥0） */
      managedAccounts().forEach((a) => {
        if (a.name === '现金' || a.name === '其他') return
        if (coveredByCat(a.name)) return
        const key = channelGroupKey(a.name)
        if (!restGroups[key]) restGroups[key] = []
        if (restGroups[key].indexOf(a.name) < 0) restGroups[key].push(a.name)
      })
      /* 4b) 交易里出现、但不属于任何已知账户的（历史遗留 / 孤儿），按合并键并入 */
      Object.keys(amt).forEach((n) => {
        if (grouped[n] || coveredByCat(n)) return
        const key = channelGroupKey(n)
        if (!restGroups[key]) restGroups[key] = []
        if (restGroups[key].indexOf(n) < 0) restGroups[key].push(n)
      })
      /* 4c) 每组金额 = 组内所有账户名下支出求和，按金额降序 */
      const restKeys = Object.keys(restGroups).sort((a, b) => {
        const va = restGroups[a].reduce((s, n) => s + (amt[n] || 0), 0)
        const vb = restGroups[b].reduce((s, n) => s + (amt[n] || 0), 0)
        return vb - va
      })
      restKeys.forEach((k) => {
        const value = round2(restGroups[k].reduce((s, n) => s + (amt[n] || 0), 0))
        groups.push({ value, rows: [{ name: k, value }] })
      })

      /* 5) 整体按支出金额「从多到少」从上往下排。
       *    Array.prototype.sort 是稳定排序：金额相同的块保持上面构建时的相对顺序，
       *    所以 0 元渠道自然沉到列表最底部。 */
      groups.sort((a, b) => b.value - a.value)

      const rows = []
      groups.forEach((g) => g.rows.forEach((r) => rows.push(r)))
      return rows
    },
    /* 还款提醒条：{ total: 所有账户合计应还, items: [{ name, amount, date, dateText, days, statusText }] }
     * items 按「还款日从近到远」排；同一还款日按金额从高到低，便于先看最急、最大的一笔 */
    creditRows() {
      const s = getSettings()
      const cr = s.creditReminder
      if (!cr || !cr.enabled) return { total: 0, items: [] }
      const map = creditRepayMap(cr.days || 3)
      const items = []
      Object.keys(map)
        .sort()
        .forEach((k) => {
          const d = Math.round(
            (new Date(k + 'T00:00:00').getTime() - new Date(localDate() + 'T00:00:00').getTime()) / 86400000
          )
          const accounts = (map[k].accounts || []).slice().sort((a, b) => b.amount - a.amount)
          accounts.forEach((a) => {
            items.push({
              name: a.name,
              amount: a.amount,
              date: k,
              dateText: k.slice(5, 7) + '/' + k.slice(8, 10),
              days: d,
              statusText: d === 0 ? '今天到期' : `还有 ${d} 天`
            })
          })
        })
      return { total: round2(items.reduce((a, it) => a + (Number(it.amount) || 0), 0)), items }
    },

    /* ---------------- 明细 ---------------- */
    detailYearTexts() {
      return ['全部年份'].concat(availableYears().map((y) => y + ' 年'))
    },
    detailYearIndex() {
      return this.detailYear ? availableYears().indexOf(String(this.detailYear)) + 1 : 0
    },
    detailMonthTexts() {
      const arr = ['全部月份']
      for (let i = 1; i <= 12; i++) arr.push(i + ' 月')
      return arr
    },
    detailList() {
      let list = [...store.txns]
      if (this.txnFilter !== 'all') list = list.filter((t) => t.type === this.txnFilter)
      if (this.detailYear) list = list.filter((t) => String(t.date).slice(0, 4) === String(this.detailYear))
      if (this.detailMonth) {
        const m = String(this.detailMonth).padStart(2, '0')
        list = list.filter((t) => String(t.date).slice(5, 7) === m)
      }
      const k = normalizeSearch(this.searchKeyword)
      if (k) list = list.filter((t) => txnMatchesSearch(t, k))
      list.sort((a, b) => String(b.date).localeCompare(String(a.date)))
      return list
    },
    detailIn() {
      return this.sum(this.detailList.filter((t) => t.type === 'income'))
    },
    detailOut() {
      return this.sum(this.detailList.filter((t) => t.type === 'expense'))
    },
    monthGroups() {
      const groups = {}
      this.detailList.forEach((t) => {
        const m = String(t.date).slice(0, 7)
        if (!groups[m]) groups[m] = []
        groups[m].push(t)
      })
      const forceOpen = !!this.searchKeyword
      return Object.keys(groups)
        .sort((a, b) => b.localeCompare(a))
        .map((m) => {
          const items = groups[m]
          const parts = m.split('-')
          const isOpen =
            forceOpen ||
            (this.monthOpen[m] !== undefined ? this.monthOpen[m] : m === this.currentMonth)
          return {
            month: m,
            title: `${parts[0]}年${parseInt(parts[1], 10)}月`,
            income: this.sum(items.filter((t) => t.type === 'income')),
            expense: this.sum(items.filter((t) => t.type === 'expense')),
            items,
            open: isOpen
          }
        })
    },

    /* ---------------- 借还 ---------------- */
    lends() {
      return store.loans.filter((l) => l.type === 'lend')
    },
    borrows() {
      return store.loans.filter((l) => l.type === 'borrow')
    },
    openLends() {
      return this.lends.filter((l) => remainOf(l) > 0).length
    },
    openBorrows() {
      return this.borrows.filter((l) => remainOf(l) > 0).length
    },
    loanRecv() {
      return round2(this.lends.reduce((a, l) => a + remainOf(l), 0))
    },
    loanPay() {
      return round2(this.borrows.reduce((a, l) => a + remainOf(l), 0))
    },
    loanList() {
      let list = [...store.loans]
      if (this.loanFilter !== 'all') list = list.filter((l) => l.type === this.loanFilter)
      /* 顶部搜索框同样作用于借还：姓名 / 备注 / 借款日期 / 约定还款日 / 应收应付 / 金额 / 追加与还款备注 */
      const k = normalizeSearch(this.searchKeyword)
      if (k) list = list.filter((l) => loanMatchesSearch(l, k))
      list.sort((a, b) => {
        const ra = remainOf(a) > 0 ? 0 : 1
        const rb = remainOf(b) > 0 ? 0 : 1
        if (ra !== rb) return ra - rb
        return String(b.date).localeCompare(String(a.date))
      })
      return list
    },

    /* ---------------- 纪念日 ---------------- */
    /* 未过滤的纪念日列表（含倒计时计算与排序） */
    annivAll() {
      const withDays = store.anniversaries.map((a) => {
        const left = annivDaysLeft(a)
        const next = annivNextDate(a)
        const invalid = left >= 9000
        let label = ''
        let labelColor = '#333'
        if (invalid) {
          label = '日期无效'
          labelColor = '#c4c4c4'
        } else if (left < 0) {
          label = `已过去 ${Math.abs(left)} 天`
          labelColor = '#c4c4c4'
        } else if (left === 0) {
          label = '就是今天 🎉'
          labelColor = '#C20C0C'
        } else if (left === 1) {
          label = '明天'
          labelColor = '#C20C0C'
        } else {
          label = `还有 ${left} 天`
          labelColor = left <= 7 ? '#C20C0C' : '#333'
        }
        return { a, left, next, label, labelColor, invalid }
      })
      withDays.sort((x, y) => {
        const px = x.left < 0 || x.left >= 9000 ? 1 : 0
        const py = y.left < 0 || y.left >= 9000 ? 1 : 0
        if (px !== py) return px - py
        if (px === 1) return y.left - x.left
        return x.left - y.left
      })
      return withDays
    },
    /* 顶部搜索框同样作用于纪念日：名称 / 备注 / 日期文字 / 农历 */
    annivList() {
      const k = normalizeSearch(this.searchKeyword)
      if (!k) return this.annivAll
      return this.annivAll.filter((x) => annivMatchesSearch(x.a, k))
    },
    annivTip() {
      const todayN = this.annivAll.filter((x) => x.left === 0).length
      const soon = this.annivAll.filter((x) => x.left >= 0 && x.left <= 7).length
      if (todayN) return `今天有 ${todayN} 个纪念日 🎉`
      if (soon) return `${soon} 个将在 7 天内到来`
      return ''
    }
  },
  onShow() {
    /* 从二级页面返回时无需重新读库：仓库层已同步更新 store（响应式） */
  },
  /* 实时记住当前 Tab 的滚动位置。
   * 为什么必须记忆：四个 Tab 共用同一个页面，切换时内容高度会变，
   * WebView 会把 scrollTop 裁剪到「内容高度 - 视口高度」的范围内——
   * 从没有数据的短页面切走时，这个范围就是 0，位置被系统吃掉，
   * 再切回长页面时就表现为「自动回到顶部」。 */
  onPageScroll(e) {
    if (this.scrollRestoring) return
    this.scrollMemo[this.page] = e.scrollTop || 0
  },
  methods: {
    /* ---------- 工具 ---------- */
    money,
    repaidOf,
    remainOf,
    /* 还款条里每个账户默认只显示 REPAY_ACC_LIMIT 行，超出的点「展开全部」看剩下。
     * 注意：放在 methods 而不是 computed——模板里带参调用时，
     * computed 会被当成属性渲染成函数对象，报「xxx is not a function」。 */
    visibleRepayItems() {
      const items = this.creditRows.items
      return this.repayOpen ? items : items.slice(0, this.REPAY_ACC_LIMIT)
    },
    toggleRepay() {
      this.repayOpen = !this.repayOpen
    },
    sum(list) {
      return round2(list.reduce((a, t) => a + (Number(t.amount) || 0), 0))
    },
    catList(type) {
      const map = {}
      this.scoped
        .filter((t) => t.type === type)
        .forEach((t) => {
          map[t.cat] = round2((map[t.cat] || 0) + (Number(t.amount) || 0))
        })
      return Object.keys(map)
        .map((name) => ({ name, value: map[name] }))
        .sort((a, b) => b.value - a.value)
    },
    barHeight(v) {
      return Math.max(2, (v / this.maxTrend) * 100) + '%'
    },
    catWidth(v) {
      return Math.max(4, (v / this.maxCat) * 100) + '%'
    },
    pct(v, total) {
      return (((v || 0) / (total || 1)) * 100).toFixed(1)
    },
    progressPct(l) {
      if (!l.amount) return 0
      return Math.min(100, (repaidOf(l) / l.amount) * 100)
    },
    sortedAddons(l) {
      return (l.addons || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))
    },
    enrichedRepays(l) {
      const reps = (l.repayments || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)))
      let acc = 0
      return reps
        .map((r) => {
          acc += r.amount
          return Object.assign({}, r, { after: round2(Math.max(0, (Number(l.amount) || 0) - acc)) })
        })
        .reverse()
    },

    /* ---------- 导航 ---------- */
    setPage(p) {
      /* 点击底部 Tab 只做一件事：切换当前页面。
       * 【不再重新加载页面】不清空跨页搜索、不重置该页的年月 / 类型筛选、
       * 不折叠已展开的明细——保留 App 运行过程中用户上次停留的视图。 */
      this.page = p
      this.restoreScroll(p)
    },
    /* 恢复目标 Tab 上次停留的滚动位置。
     * 无数据的页面很矮，切换时 WebView 会把 scrollTop 裁到 0，
     * 不记忆就会「一切换就回到顶部」，所以这里按 Tab 逐个恢复。 */
    restoreScroll(p) {
      const top = this.scrollMemo[p] || 0
      this.scrollRestoring = true
      const apply = () => {
        uni.pageScrollTo({ scrollTop: top, duration: 0 })
      }
      this.$nextTick(() => {
        apply()
        /* 列表刚渲染时高度可能还没撑开，补一次延迟兜底再滚一次 */
        setTimeout(() => {
          apply()
          this.scrollRestoring = false
        }, 120)
      })
    },
    /* 回到页面顶部：直接调用 + nextTick 各一次，避免列表高度变化后回弹不到位 */
    scrollTop() {
      uni.pageScrollTo({ scrollTop: 0, duration: 0 })
      this.$nextTick(() => {
        uni.pageScrollTo({ scrollTop: 0, duration: 0 })
      })
    },
    goSettings() {
      uni.navigateTo({ url: '/pages/settings/settings' })
    },
    goTxnEdit(id) {
      uni.navigateTo({ url: '/pages/txn-edit/txn-edit' + (id ? '?id=' + encodeURIComponent(id) : '') })
    },
    goLoanEdit(type, party) {
      const q = []
      if (type) q.push('type=' + encodeURIComponent(type))
      if (party) q.push('party=' + encodeURIComponent(party))
      uni.navigateTo({ url: '/pages/loan-edit/loan-edit' + (q.length ? '?' + q.join('&') : '') })
    },
    /* 修改借款：只允许改「约定还款日 / 备注」，对方、金额、借款日期不可改 */
    goLoanModify(id) {
      uni.navigateTo({ url: '/pages/loan-edit/loan-edit?id=' + encodeURIComponent(id) })
    },
    goRepay(id) {
      uni.navigateTo({ url: '/pages/repay/repay?id=' + encodeURIComponent(id) })
    },
    goAnnivEdit(id) {
      uni.navigateTo({ url: '/pages/anniv-edit/anniv-edit' + (id ? '?id=' + encodeURIComponent(id) : '') })
    },

    /* ---------- 搜索 / 筛选 ---------- */
    onSearch(v) {
      this.searchKeyword = v
      const k = normalizeSearch(v)
      if (!k) return

      /* 同时检查三类原始数据，不受页面上一次留下的年月 / 类型筛选影响。 */
      const matched = {
        detail: store.txns.some((t) => txnMatchesSearch(t, k)),
        loans: store.loans.some((l) => loanMatchesSearch(l, k)),
        anniv: store.anniversaries.some((a) => annivMatchesSearch(a, k))
      }
      const matchedPages = ['detail', 'loans', 'anniv'].filter((p) => matched[p])

      /* 只有一类命中时直接跳到对应页；多类命中时优先保留当前结果页，否则按明细→借还→纪念日。 */
      let target = matchedPages.length === 1
        ? matchedPages[0]
        : (matched[this.page] ? this.page : matchedPages[0])
      /* 无匹配时仍给出可见的“无结果”反馈；总览没有结果区，默认进入明细页。 */
      if (!target) target = this.page === 'overview' ? 'detail' : this.page

      /* 全局搜索不沿用局部筛选，确保命中的数据不会被旧筛选条件再次隐藏。 */
      if (target === 'detail') {
        this.txnFilter = 'all'
        this.detailYear = ''
        this.detailMonth = 0
      } else if (target === 'loans') {
        this.loanFilter = 'all'
        this.loanOpen = {}
      }
      this.page = target
      /* 搜索结果是从头看的，目标页的滚动记忆同步归零 */
      this.scrollMemo[target] = 0
      this.scrollTop()
    },
    clearSearch() {
      this.searchKeyword = ''
    },
    setTxnFilter(f) {
      this.txnFilter = f
    },
    setLoanFilter(f) {
      this.loanFilter = f
    },

    /* ---------- 折叠 ---------- */
    toggleMonth(m) {
      const cur = this.currentMonth
      const isOpen = this.monthOpen[m] !== undefined ? this.monthOpen[m] : m === cur
      this.monthOpen[m] = !isOpen
    },
    toggleLoan(id) {
      this.loanOpen[id] = !this.loanOpen[id]
    },

    /* ---------- 年月切换 ---------- */
    onOvYearChange(e) {
      const years = availableYears()
      const idx = Number(e.detail.value)
      if (years[idx]) this.ovYear = parseInt(years[idx], 10)
    },
    onOvMonthChange(e) {
      /* 0 = 全年，1~12 = 月份 */
      this.ovMonth = Number(e.detail.value)
    },
    setOvMonthValue(m) {
      this.ovMonth = m
    },
    onDetailYearChange(e) {
      const years = availableYears()
      const idx = Number(e.detail.value)
      this.detailYear = idx <= 0 ? '' : years[idx - 1] || ''
    },
    onDetailMonthChange(e) {
      this.detailMonth = Number(e.detail.value)
    },
    /* 渠道排行：类目「汇总 / 明细」各自独立切换 */
    toggleChannelMode(key) {
      const next = Object.assign({}, this.channelModes)
      next[key] = next[key] === 'detail' ? 'sum' : 'detail'
      this.channelModes = next
    },
    channelWidth(v) {
      const list = this.channelRows
      const max = list.length ? Math.max.apply(null, list.map((c) => c.value)) : 1
      if (!v) return '0%'
      return Math.max(4, (v / (max || 1)) * 100) + '%'
    },

    /* ---------- 删除 ---------- */
    delTxn(id) {
      uni.showModal({
        title: '删除记录',
        content: '确定删除这条记录吗？',
        success: async (res) => {
          if (!res.confirm) return
          await deleteTxn(id)
          uni.showToast({ title: '已删除', icon: 'none' })
        }
      })
    },
    delLoan(id) {
      uni.showModal({
        title: '删除借款',
        content: '确定删除这笔借款吗？相关还款记录也会一并删除。',
        success: async (res) => {
          if (!res.confirm) return
          await deleteLoan(id)
          uni.showToast({ title: '已删除', icon: 'none' })
        }
      })
    },
    delAnniv(id) {
      const a = store.anniversaries.find((x) => x.id === id)
      if (!a) return
      uni.showModal({
        title: '删除纪念日',
        content: `确定删除「${a.title}」吗？`,
        success: async (res) => {
          if (!res.confirm) return
          await deleteAnniv(id)
          uni.showToast({ title: '已删除', icon: 'none' })
        }
      })
    },

    closeAlerts
  }
}
</script>
