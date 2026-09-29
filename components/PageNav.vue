<template>
  <view class="fl-page-nav">
    <view class="fl-back" @click="goBack">
      <view class="fl-back-icon ic-back"></view>
    </view>
    <text class="fl-page-title">{{ title }}</text>
    <text v-if="sub" class="fl-page-sub">{{ sub }}</text>
    <view class="fl-nav-right">
      <slot name="right"></slot>
    </view>
  </view>
</template>

<script>
export default {
  name: 'PageNav',
  props: {
    title: { type: String, default: '' },
    sub: { type: String, default: '' }
  },
  methods: {
    goBack() {
      const pages = getCurrentPages()
      if (pages && pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.reLaunch({ url: '/pages/index/index' })
      }
    }
  }
}
</script>

<style scoped>
.fl-nav-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
