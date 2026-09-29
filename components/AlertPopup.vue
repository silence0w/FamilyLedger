<template>
  <!-- 遮罩：点击空白区域关闭；@touchmove.stop.prevent 锁死背景页面滑动 -->
  <view v-if="visible" class="mask alert-mask" @click="onMaskClick" @touchmove.stop.prevent="noop">
    <view class="modal alert-modal" @click.stop @touchmove.stop>
      <view class="modal-head">
        <text>🔔 提醒</text>
        <text class="modal-close" @click="close">✕</text>
      </view>
      <view class="modal-body">
        <view class="alert-count">共 {{ alerts.length }} 条提醒 · {{ today }}</view>
        <view
          v-for="(a, i) in alerts"
          :key="i"
          class="alert-item"
          :class="{ urgent: a.urgent }"
        >
          <view class="alert-icon">{{ a.icon }}</view>
          <view class="alert-main">
            <view class="alert-title">{{ a.title }}</view>
            <view class="alert-text">{{ a.text }}</view>
          </view>
          <view v-if="a.badge" class="alert-badge">{{ a.badge }}</view>
        </view>
      </view>
      <view class="modal-foot">
        <view class="btn btn-primary" @click="close">知道了</view>
      </view>
    </view>
  </view>
</template>

<script>
import { localDate } from '../common/utils.js'

export default {
  name: 'AlertPopup',
  props: {
    visible: { type: Boolean, default: false },
    alerts: { type: Array, default: () => [] },
    /* 自动关闭秒数：0 表示不自动关闭 */
    autoClose: { type: Number, default: 5 }
  },
  emits: ['close'],
  data() {
    return {
      today: localDate(),
      timer: null
    }
  },
  watch: {
    visible(val) {
      if (val) this.startTimer()
      else this.clearTimer()
    }
  },
  beforeUnmount() {
    this.clearTimer()
  },
  methods: {
    /* 遮罩 touchmove 空处理：配合 .stop.prevent 锁死背景滑动 */
    noop() {},
    startTimer() {
      this.clearTimer()
      if (!this.autoClose) return
      this.timer = setTimeout(() => this.close(), this.autoClose * 1000)
    },
    clearTimer() {
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
    },
    close() {
      this.clearTimer()
      this.$emit('close')
    },
    onMaskClick() {
      this.close()
    }
  }
}
</script>

<style scoped>
.alert-mask {
  align-items: center;
  padding: 20px;
}
.alert-modal {
  border-radius: 8px;
  max-height: 82vh;
  overflow-y: auto;
}
.alert-count {
  font-size: 12.5px;
  color: #999;
  margin-bottom: 14px;
}
</style>
