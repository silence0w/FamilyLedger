<template>
  <view class="fl-app">
    <PageNav :title="title" sub="说明" />

    <view class="fl-body">
      <view class="fl-form">
        <!-- 说明内容按段落渲染：h=小节标题，p=正文，meta=创建/修改时间 -->
        <view
          v-for="(b, i) in blocks"
          :key="i"
          class="help-block"
          :class="'hb-' + b.t"
        >
          <text v-for="(s, j) in b.segs" :key="j" :class="s.cls">{{ s.text }}</text>
        </view>

        <view class="help-foot">
          本页仅为功能说明，修改说明内容不影响账本数据。
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import PageNav from '../../components/PageNav.vue'
import { store } from '../../common/store.js'
import { fmtDateTime } from '../../common/utils.js'

/* 正文段落：{ t: 'h' | 'p' | 'meta', segs: [{ text, cls }] }
 * cls：'' 普通 / 'strong' 加粗 / 'hl' 红色 / 'hl-danger' 红色警告 */
function h(text) {
  return { t: 'h', segs: [{ text: text, cls: '' }] }
}
function p(text) {
  return { t: 'p', segs: [{ text: text, cls: '' }] }
}
/* 显式传入分段，便于给关键句上色 */
function rich(segs) {
  return { t: 'p', segs: segs }
}

/* 各类说明的静态内容（创建 / 修改时间在 computed 里动态补上） */
function staticBlocks(topic) {
  if (topic === 'data') {
    return [
      h('导出 Excel / JSON（内容完全一致）'),
      p(
        'Excel 与 JSON 是「同一份完整备份」，导出为标准 .xlsx（8 个工作表）或 .json 文件，文件名自动带精确时间戳。' +
          '8 个工作表为：收支明细 / 借款记录 / 还款记录 / 手动账户 / 每日记账提醒 / 还款提醒 / 纪念日提醒 / 纪念日，' +
          '金额列固定显示两位小数（元角分），可直接用 Excel、WPS、Numbers 打开。'
      ),
      h('两者都包含什么'),
      rich([
        { text: '除收支、借款外，还包含「手动添加的账户、每日记账提醒、还款提醒、纪念日提醒、纪念日信息」，', cls: '' },
        { text: '导入即整体替换当前数据', cls: 'strong' },
        { text: '（内置 7 个独立账户不受影响）。', cls: '' }
      ]),
      p(
        '每条收支 / 借款 / 纪念日 / 手动账户 / 提醒设置都带有「创建时间、修改时间」，这两个字段会一并导出。'
      ),
      h('保存目录'),
      rich([
        { text: 'Download/家庭账本', cls: 'hl' },
        { text: '（不存在会自动创建）。导入时', cls: '' },
        { text: '只检索这一个目录', cls: 'strong' },
        { text: '，不再兼容旧目录「Download/家庭记账本」与应用私有目录。', cls: '' }
      ]),
      h('注意'),
      rich([
        { text: '导入会', cls: '' },
        { text: '覆盖', cls: 'hl-danger' },
        { text: '当前所有数据，请先导出备份。若目录里看不到刚导出的文件，请到系统设置 → 应用 → 家庭账本 → 权限中开启「所有文件访问权限」。', cls: '' }
      ])
    ]
  }

  if (topic === 'account') {
    return [
      h('默认账户（7 个内置独立账户）'),
      p(
        '现金 / 信用卡 / 银行卡（非信用卡）/ app-支付宝 / app-微信 / app-云闪付 / 其他 —— 它们各自只是一个单独账户，' +
          '与手动添加的账户完全平级、互不干涉，可直接在「记一笔」的账户 / 支付方式里选择。'
      ),
      h('手动添加的账户'),
      p(
        '信用卡：名称自动加「信用卡：」前缀，维护账单日 / 还款日，记账时自动推算并参与还款提醒。'
      ),
      p(
        '银行卡：名称自动加「银行卡（非信用卡）：」前缀，登记发卡银行，无账单日。'
      ),
      p(
        'App 支付渠道：先选 App 名称（app-支付宝 / app-微信 / app-云闪付 / app-京东 / app-美团 / ' +
          'app-抖音 / app-滴滴 / app-其他），可再填自定义渠道名称，可选启用账单日 / 还款日。'
      ),
      h('支出渠道排行'),
      p(
        '总览页「支出渠道排行」会把同一前缀的账户归为一类：例如「信用卡」一行 = 内置账户「信用卡」+ ' +
          '手动添加的「信用卡：xxx」；点排行上方按钮可把某一类单独切换成「明细」查看各账户。'
      ),
      p(
        '排行里的所有行都按当月支出金额「从多到少」从上往下排，花得最多的渠道排在第一位；' +
          '没有支出的渠道金额为 ¥0，会沉到列表最下面。切到「明细」后，同一类目的父行与各子账户行仍然挨在一起。'
      ),
      h('为什么只看到 1 个手动账户'),
      p('设置页为了简洁只显示排序第一的 1 个手动账户，点「手动添加的账户」右侧的「详情」可查看并编辑全部账户。')
    ]
  }

  if (topic === 'reminder') {
    return [
      h('提醒逻辑'),
      rich([
        { text: '开启后，每次', cls: '' },
        { text: '冷启动', cls: 'strong' },
        { text: 'App 都会在 App 内弹窗提醒一次；弹窗可手动关闭，也会在', cls: '' },
        { text: '5 秒后自动关闭', cls: 'strong' },
        { text: '。', cls: '' }
      ]),
      rich([
        { text: '本提醒', cls: '' },
        { text: '只在 App 内显示', cls: 'strong' },
        { text: '，不会发通知栏通知，也不需要「后台运行 / 自启动 / 电池优化」等任何系统授权。', cls: '' }
      ]),
      h('提示'),
      p('每日记账提醒只取决于「每日记账提醒」总开关是否开启；只要开着，每次启动 App 都会在应用内提示一次，与具体时间无关。'),
      p('若不需要每次启动都弹窗，回到设置页关闭「每日记账提醒」开关即可。')
    ]
  }

  if (topic === 'credit') {
    return [
      h('提醒逻辑'),
      p(
        '凡是「账户管理」里录入的信用账户（信用卡、启用了账单日 / 还款日的 App 支付渠道），' +
          '只要带有账单日和还款日，就按「提前 n 天」提醒：'
      ),
      rich([
        { text: '① 首页顶部显示', cls: '' },
        { text: '还款提醒条', cls: 'strong' },
        { text: '，汇总显示总计与每个账户的需还金额；', cls: '' }
      ]),
      p(
        '注意：还款提醒只出现在首页还款提醒条，不进入冷启动弹窗，也不会发通知栏通知；' +
          '冷启动弹窗只含「每日记账」与「纪念日」两类提醒。'
      ),
      h('本期应还怎么算'),
      p(
        '本期应还 = 该还款日所属账单周期内的支出合计，也就是「上一期账单日（含当天）～ 本期账单日前一天」；' +
          '其中本期账单日 = 该还款日之前（含当天）最近的那一个账单日。'
      ),
      rich([
        { text: '情况 A · 还款日晚于账单日（当月还）：账单日 5 号 / 还款日 20 号 → ', cls: '' },
        { text: '9-20 该还 8-05 ～ 9-04', cls: 'strong' },
        { text: '。', cls: '' }
      ]),
      rich([
        { text: '情况 B · 还款日早于账单日（次月还）：账单日 25 号 / 还款日 10 号 → ', cls: '' },
        { text: '10-10 该还 8-25 ～ 9-24', cls: 'strong' },
        { text: '（本期账单日自动退到上一个月的 9-25）。', cls: '' }
      ]),
      p(
        '本期应还为 0 时不提醒——本期账单周期内没有任何支出，说明本期没有欠款。' +
          '新增或修改一条支出后，只要它的日期落在该账单周期内，就会立即计入应还并决定是否触发提醒。'
      ),
      h('提醒条怎么显示'),
      p(
        '首页还款提醒条分两部分：第一行是「💳 总计需还款：金额」，把所有账户本期应还加在一起；' +
          '从第二行起每个账户一行，依次是「到期状态（今天到期 / 还有 N 天）→ 账户名 (还款日 MM/DD) → 该账户需还金额」，' +
          '按还款日从近到远排，同一天的按金额从高到低。'
      ),
      p(
        '提醒条的位置在总览卡片最上面：紧贴「家庭财务一览」标题下方、年份 / 月份筛选按钮上方；' +
          '本期没有任何应还时整条不显示，标题与筛选按钮之间不会有空档。'
      ),
      p(
        '整条默认只显示 3 行（1 行总计 + 2 行账户），账户更多时点最下方的「展开全部 N 个账户」看全，再点一次收起。'
      ),
      h('常见疑问'),
      rich([
        { text: 'Q：设了账单日 / 还款日，为什么首页没有还款提醒条？', cls: 'strong' }
      ]),
      p(
        '请依次确认：① 该账户确实同时填了「账单日」和「还款日」（只填一个不算信用账户）；' +
          '② 上方「还款提醒」总开关是打开状态；③ 还款日确实落在「提前 n 天」窗口内' +
          '（例如提前 3 天，只有还款日前 3 天内才显示，离得还早就先不显示）；' +
          '④ 本期账单周期内该账户确实有支出（本期应还 > 0）——' +
          '本期没有任何支出说明本月没有欠款，就不会提醒。'
      ),
      rich([
        { text: 'Q：当前的还款日已经过了，还会提醒吗？', cls: 'strong' }
      ]),
      p(
        '不会。还款日一旦过去，系统会自动把提醒目标顺延到「下个月的同一个还款日」，' +
          '本月的这个已过期还款日不再提醒（避免用"已还过"的日期反复打扰）。' +
          '例如今天 9 月 26 日、还款日是每月 20 日，则下一次提醒目标是 10 月 20 日。'
      ),
      rich([
        { text: 'Q：当月只有 28 天，而我设的还款日是 30 号，会怎样？', cls: 'strong' }
      ]),
      p(
        '自动收敛到当月最后一天（如 2 月 30 号 → 2 月 28 日 / 闰年 29 日；4 月 31 号 → 4 月 30 日），' +
          '不会跳过该月、也不会延到下月。判断「提前 n 天」窗口时同样按收敛后的月末日计算，' +
          '所以只要窗口覆盖到月末那一天，就一定提醒。'
      )
    ]
  }

  /* anniv */
  return [
    h('提醒逻辑'),
    p('开启后，临近的生日 / 纪念日：'),
    rich([{ text: '① 在「纪念日」页面显示倒计时；', cls: '' }]),
    rich([
      { text: '② 每次', cls: '' },
      { text: '冷启动', cls: 'strong' },
      { text: 'App 时在 App 内弹窗提示；', cls: '' }
    ]),
    p('本提醒只在 App 内显示，不会发通知栏通知，也不需要「后台运行 / 自启动 / 电池优化」等系统授权。')
  ]
}

const TITLES = {
  data: '数据管理说明',
  account: '账户管理说明',
  reminder: '每日记账提醒说明',
  credit: '还款提醒说明',
  anniv: '纪念日提醒说明'
}

/* 需要展示「创建时间 / 修改时间」的说明页 */
const META_TOPIC = {
  reminder: 'reminder',
  credit: 'creditReminder',
  anniv: 'annivReminder'
}

export default {
  components: { PageNav },
  data() {
    return {
      store,
      topic: 'data'
    }
  },
  computed: {
    title() {
      return TITLES[this.topic] || TITLES.data
    },
    blocks() {
      const list = staticBlocks(this.topic)
      const key = META_TOPIC[this.topic]
      if (!key) return list
      const m = (store.settingMeta && store.settingMeta[key]) || {}
      return list.concat([
        { t: 'h', segs: [{ text: '时间记录', cls: '' }] },
        {
          t: 'meta',
          segs: [{ text: '创建时间　' + this.fmtTime(m.createTime), cls: '' }]
        },
        {
          t: 'meta',
          segs: [{ text: '修改时间　' + this.fmtTime(m.modifyTime), cls: '' }]
        }
      ])
    }
  },
  onLoad(query) {
    const t = (query && query.topic) || ''
    if (TITLES[t]) this.topic = t
  },
  methods: {
    fmtTime(iso) {
      return fmtDateTime(iso)
    }
  }
}
</script>
