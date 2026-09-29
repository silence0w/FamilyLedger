<template>
  <view class="fl-tabbar">
    <view
      v-for="t in leftTabs"
      :key="t.key"
      class="fl-nav-item"
      :class="{ active: current === t.key }"
      @click="$emit('change', t.key)"
    >
      <view
        class="fl-nav-icon"
        :class="current === t.key ? 'ic-nav-' + t.key + '-on' : 'ic-nav-' + t.key"
      ></view>
      <text class="fl-nav-label">{{ t.label }}</text>
    </view>

    <!-- 中间圆形「+」记一笔按钮 -->
    <view class="fl-nav-add-wrap">
      <view class="fl-nav-add" @click.stop="$emit('add')">
        <view class="fl-nav-add-icon ic-plus"></view>
      </view>
    </view>

    <view
      v-for="t in rightTabs"
      :key="t.key"
      class="fl-nav-item"
      :class="{ active: current === t.key }"
      @click="$emit('change', t.key)"
    >
      <view
        class="fl-nav-icon"
        :class="current === t.key ? 'ic-nav-' + t.key + '-on' : 'ic-nav-' + t.key"
      ></view>
      <text class="fl-nav-label">{{ t.label }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TabBar',
  props: {
    current: { type: String, default: 'overview' }
  },
  emits: ['change', 'add'],
  data() {
    return {
      leftTabs: [
        { key: 'overview', label: '总览' },
        { key: 'detail', label: '明细' }
      ],
      rightTabs: [
        { key: 'loans', label: '借还' },
        { key: 'anniv', label: '纪念日' }
      ]
    }
  }
}
</script>
