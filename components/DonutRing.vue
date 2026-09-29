<template>
  <view class="donut-box">
    <template v-if="hasData">
      <view class="donut-wrap">
        <view class="donut-ring"></view>
        <view class="donut-ring-fill" :style="{ backgroundImage: gradient }"></view>
        <view class="donut-hole">
          <view class="dc-label">{{ centerLabel }}</view>
          <view class="dc-value">{{ totalText }}</view>
        </view>
      </view>
      <view class="donut-legend">
        <view v-for="(c, i) in cats" :key="i" class="dl-item">
          <view class="dl-dot" :style="{ background: colorAt(i) }"></view>
          <text class="dl-name">{{ c.name }}</text>
          <text class="dl-pct">{{ pctOf(c) }}%</text>
          <text class="dl-val">{{ moneyOf(c.value) }}</text>
        </view>
      </view>
    </template>
    <view v-else class="empty">{{ emptyText }}</view>
  </view>
</template>

<script>
import { PIE_COLORS } from '../common/constants.js'
import { money } from '../common/utils.js'

export default {
  name: 'DonutRing',
  props: {
    /* [{ name, value }] */
    cats: { type: Array, default: () => [] },
    total: { type: Number, default: 0 },
    centerLabel: { type: String, default: '总支出' },
    emptyText: { type: String, default: '暂无数据' }
  },
  computed: {
    hasData() {
      return this.cats.length > 0 && this.total > 0
    },
    totalText() {
      return money(this.total)
    },
    gradient() {
      if (!this.hasData) return 'none'
      const parts = []
      let acc = 0
      this.cats.forEach((c, i) => {
        const pct = (c.value / this.total) * 100
        const from = acc
        acc += pct
        parts.push(`${this.colorAt(i)} ${from.toFixed(3)}% ${acc.toFixed(3)}%`)
      })
      // from 90deg：与 HTML 版 rotate(-90) 一致，从 3 点钟方向顺时针铺开
      return `conic-gradient(from 90deg, ${parts.join(', ')})`
    }
  },
  methods: {
    colorAt(i) {
      return PIE_COLORS[i % PIE_COLORS.length]
    },
    pctOf(c) {
      return ((c.value / this.total) * 100).toFixed(1)
    },
    moneyOf(v) {
      return money(v)
    }
  }
}
</script>
