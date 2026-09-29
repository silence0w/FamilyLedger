<template>
  <view class="fl-app">
    <PageNav :title="isEdit ? '编辑纪念日' : '添加纪念日'" />

    <view class="fl-body">
      <view class="fl-form">
        <!-- 名称 -->
        <view class="field">
          <label>名称</label>
          <input
            class="input"
            type="text"
            :focus="autoFocus"
            :value="title"
            placeholder="例如：妈妈生日 / 结婚纪念日"
            placeholder-class="input-placeholder"
            @input="title = $event.detail.value"
          />
        </view>

        <!-- 日期类型 -->
        <view class="field">
          <label>日期类型</label>
          <view class="seg seg-full">
            <view class="seg-btn" :class="{ active: calendar === 'solar' }" @click="calendar = 'solar'">公历</view>
            <view class="seg-btn" :class="{ active: calendar === 'lunar' }" @click="calendar = 'lunar'">农历</view>
          </view>
        </view>

        <!-- 公历 -->
        <view v-if="calendar === 'solar'" class="field">
          <label>日期（公历）</label>
          <view class="row-3">
            <picker class="col-y" mode="selector" :range="yearLabels" :value="yearIndex" @change="onYearChange">
              <view class="picker-box">
                <text>{{ solarYear }}</text>
                <view class="select-arrow ic-caret"></view>
              </view>
            </picker>
            <picker class="col-m" mode="selector" :range="monthLabels" :value="solarMonth - 1" @change="onMonthChange">
              <view class="picker-box">
                <text>{{ solarMonth }} 月</text>
                <view class="select-arrow ic-caret"></view>
              </view>
            </picker>
            <picker class="col-d" mode="selector" :range="dayLabels" :value="solarDay - 1" @change="onDayChange">
              <view class="picker-box">
                <text>{{ solarDay }} 日</text>
                <view class="select-arrow ic-caret"></view>
              </view>
            </picker>
          </view>
        </view>

        <!-- 农历 -->
        <view v-else class="field">
          <label>日期（农历 · 每年按对应月日重复）</label>
          <view class="row-2">
            <picker mode="selector" :range="lunarMonthLabels" :value="lunarMonth - 1" @change="lunarMonth = Number($event.detail.value) + 1">
              <view class="picker-box">
                <text>{{ lunarMonthLabels[lunarMonth - 1] }}</text>
                <view class="select-arrow ic-caret"></view>
              </view>
            </picker>
            <picker mode="selector" :range="lunarDayLabels" :value="lunarDay - 1" @change="lunarDay = Number($event.detail.value) + 1">
              <view class="picker-box">
                <text>{{ lunarDayLabels[lunarDay - 1] }}</text>
                <view class="select-arrow ic-caret"></view>
              </view>
            </picker>
          </view>

          <view class="checkbox-row" @click="lunarLeap = !lunarLeap">
            <view class="fl-checkbox" :class="{ on: lunarLeap }">
              <text v-if="lunarLeap" class="fl-checkbox-tick">✓</text>
            </view>
            <text>该月为闰月（如闰五月）</text>
          </view>
          <view class="tip-note">勾选闰月后，会自动寻找最近出现该闰月的年份。</view>
        </view>

        <!-- 每年重复 -->
        <view class="field">
          <view class="switch-row">
            <text>每年重复</text>
            <view class="switch" :class="{ on: repeat }" @click="repeat = !repeat">
              <view class="switch-knob"></view>
            </view>
          </view>
        </view>

        <!-- 备注 -->
        <view class="field">
          <label>备注</label>
          <input
            class="input"
            type="text"
            :value="note"
            placeholder="选填，例如：农历生日 / 每年送花"
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
        <view class="btn btn-primary" @click="save">保存</view>
      </view>
    </view>
  </view>
</template>

<script>
import PageNav from '../../components/PageNav.vue'
import { store } from '../../common/store.js'
import { insertAnniv, updateAnniv } from '../../common/repo.js'
import { LUNAR_MONTH_NAMES, LUNAR_DAY_NAMES, nextLunarAnniv } from '../../common/lunar.js'
import { localDate, uid, pad, daysInMonth, clamp, fmtDateTime } from '../../common/utils.js'

const now = new Date()

export default {
  components: { PageNav },
  data() {
    return {
      store,
      editId: '',
      isEdit: false,
      title: '',
      calendar: 'solar',
      solarYear: now.getFullYear(),
      solarMonth: now.getMonth() + 1,
      solarDay: now.getDate(),
      lunarMonth: 1,
      lunarDay: 1,
      lunarLeap: false,
      repeat: true,
      note: '',
      autoFocus: false,
      createTime: '',
      modifyTime: '',
      lunarMonthLabels: LUNAR_MONTH_NAMES,
      lunarDayLabels: LUNAR_DAY_NAMES,
      /* 1900 ~ 当前年份 + 10 */
      yearItems: (() => {
        const arr = []
        for (let y = now.getFullYear() + 10; y >= 1900; y--) arr.push(y)
        return arr
      })()
    }
  },
  computed: {
    yearLabels() {
      return this.yearItems.map((y) => y + '')
    },
    yearIndex() {
      const idx = this.yearItems.indexOf(this.solarYear)
      return idx < 0 ? 0 : idx
    },
    monthLabels() {
      const arr = []
      for (let i = 1; i <= 12; i++) arr.push(i + ' 月')
      return arr
    },
    dayLabels() {
      const arr = []
      const max = daysInMonth(this.solarYear, this.solarMonth) || 31
      for (let i = 1; i <= max; i++) arr.push(i + ' 日')
      return arr
    }
  },
  onLoad(options) {
    const id = (options && options.id) ? decodeURIComponent(options.id) : ''
    if (!id) {
      this.autoFocus = true
      return
    }
    const a = store.anniversaries.find((x) => x.id === id)
    if (!a) return
    this.editId = id
    this.isEdit = true
    this.title = a.title
    this.calendar = a.calendar === 'lunar' ? 'lunar' : 'solar'
    this.createTime = a.createTime || ''
    this.modifyTime = a.modifyTime || ''
    this.repeat = a.repeat !== false
    this.note = a.note || ''

    if (this.calendar === 'lunar') {
      this.lunarMonth = a.lunarMonth || 1
      this.lunarDay = a.lunarDay || 1
      this.lunarLeap = !!a.lunarLeap
    }
    const parts = String(a.date || '').split('-').map((n) => parseInt(n, 10))
    this.solarYear = parts[0] && !isNaN(parts[0]) ? parts[0] : now.getFullYear()
    this.solarMonth = parts[1] && !isNaN(parts[1]) ? parts[1] : now.getMonth() + 1
    this.solarDay = parts[2] && !isNaN(parts[2]) ? parts[2] : now.getDate()
  },
  methods: {
    fmtTime(iso) {
      return fmtDateTime(iso)
    },
    onYearChange(e) {
      this.solarYear = this.yearItems[Number(e.detail.value)] || this.solarYear
      this.clampDay()
    },
    onMonthChange(e) {
      this.solarMonth = Number(e.detail.value) + 1
      this.clampDay()
    },
    onDayChange(e) {
      this.solarDay = Number(e.detail.value) + 1
    },
    clampDay() {
      const max = daysInMonth(this.solarYear, this.solarMonth) || 31
      this.solarDay = clamp(this.solarDay, 1, max)
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages && pages.length > 1) uni.navigateBack()
      else uni.reLaunch({ url: '/pages/index/index' })
    },

    async save() {
      const title = (this.title || '').trim()
      if (!title) {
        uni.showToast({ title: '请输入名称', icon: 'none' })
        return
      }

      let data
      if (this.calendar === 'lunar') {
        const lm = parseInt(this.lunarMonth, 10)
        const ldRaw = parseInt(this.lunarDay, 10)
        if (!lm || !ldRaw) {
          uni.showToast({ title: '请选择完整的农历日期', icon: 'none' })
          return
        }
        const ld = Math.min(ldRaw, 30)
        data = {
          title,
          calendar: 'lunar',
          lunarMonth: lm,
          lunarDay: ld,
          lunarLeap: !!this.lunarLeap,
          date: nextLunarAnniv(lm, ld, !!this.lunarLeap) || '',
          repeat: !!this.repeat,
          note: (this.note || '').trim()
        }
      } else {
        const y = parseInt(this.solarYear, 10)
        const m = parseInt(this.solarMonth, 10)
        const dRaw = parseInt(this.solarDay, 10)
        if (!y || !m || !dRaw) {
          uni.showToast({ title: '请选择完整的日期', icon: 'none' })
          return
        }
        const d = Math.min(dRaw, daysInMonth(y, m))
        data = {
          title,
          calendar: 'solar',
          date: `${y}-${pad(m)}-${pad(d)}`,
          repeat: !!this.repeat,
          note: (this.note || '').trim()
        }
      }

      try {
        if (this.isEdit) {
          await updateAnniv(this.editId, data)
        } else {
          await insertAnniv(Object.assign({ id: uid() }, data))
        }
      } catch (e) {
        uni.showModal({ title: '保存失败', content: String(e.message || e), showCancel: false })
        return
      }

      uni.showToast({ title: this.isEdit ? '已更新纪念日' : '已添加纪念日', icon: 'none' })
      setTimeout(() => this.goBack(), 300)
    }
  }
}
</script>
