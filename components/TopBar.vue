<template>
  <view class="fl-topbar">
    <view class="fl-brand">
      <view class="fl-brand-logo">账</view>
      <text>家庭账本</text>
    </view>

    <view class="fl-search-box">
      <view class="fl-search-icon ic-search"></view>
      <input
        class="fl-search-input"
        :value="keyword"
        type="text"
        confirm-type="search"
        placeholder="收支/借还/纪念日"
        placeholder-class="fl-search-ph"
        @input="onInput"
      />
    </view>

    <view class="fl-btn-settings" @click="$emit('settings')">
      <view class="fl-gear ic-gear"></view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TopBar',
  props: {
    keyword: { type: String, default: '' }
  },
  emits: ['update:keyword', 'settings'],
  methods: {
    onInput(e) {
      this.$emit('update:keyword', e.detail.value)
    }
  }
}
</script>
