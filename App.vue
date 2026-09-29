<script>
import { initDatabase } from './common/repo.js'
import { runColdStartAlerts } from './common/reminder.js'
import { waitPlusReady } from './common/platform.js'
import { store } from './common/store.js'

/* 冷启动链（2026-09-26 精简为两段）：
 *   ① 等原生环境就绪 → ② 初始化数据库 → ③ 显示 App 内提醒弹窗。
 *
 * 【重要】通知栏提醒链路已按用户要求整体移除，因此 onLaunch **不再申请任何权限**
 * （含通知授权）、不再引导自启动 / 电池优化、不再注册任何定时器或系统闹钟；
 * 每日记账的「定时通知」与还款 / 纪念日的「中午 12:00 汇总通知」都已删除，
 * 提醒只剩「App 内弹窗（每日记账 + 纪念日）」与「首页还款提醒条」两条出口。
 * 详细取舍见 README「提醒机制」一节。 */
export default {
  onLaunch() {
    waitPlusReady().then(() => {
      initDatabase()
        .then(() => {
          store.ready = true
          /* 稍等首屏渲染完成再弹，避免弹窗被首屏盖掉 */
          setTimeout(() => runColdStartAlerts(), 600)
        })
        .catch((err) => {
          store.initError = String((err && err.message) || err)
          console.error('[家庭账本] 数据初始化失败', err)
          uni.showModal({
            title: '数据初始化失败',
            content: store.initError + '\n\n请截图此提示反馈；账本暂时无法读写，可先退出重进。',
            showCancel: false
          })
        })
    })
  },
  /* 已无任何跨启动的提醒计划需要重算，前后台切换不做额外动作 */
  onShow() {},
  onHide() {}
}
</script>

<style>
/* =========================================================
 * 家庭账本 · uni-app 全局样式
 * 100% 复刻「家庭记账本.html」手机端（@media max-width:820px）视觉
 * 说明：App 端只用手机尺寸，因此把 HTML 的「基础 + 手机端」两层规则合并为全局样式
 * ========================================================= */

page {
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  background: #f5f5f5;
  color: #333;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}

view, text, input, textarea, scroll-view, image, button {
  box-sizing: border-box;
}

/* ============ 顶栏 ============ */
.fl-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: calc(56px + var(--status-bar-height, 0px));
  padding: var(--status-bar-height, 0px) 12px 0 12px;
  background: linear-gradient(90deg, #C20C0C 0%, #9E0909 100%);
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, .18);
}
.fl-brand {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}
.fl-brand-logo {
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: #fff;
  color: #C20C0C;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.fl-search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  height: 34px;
  background: rgba(255, 255, 255, .18);
  border-radius: 17px;
  padding: 0 12px;
}
.fl-search-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
.fl-search-input {
  flex: 1;
  min-width: 0;
  height: 34px;
  border: none;
  background: none;
  color: #fff;
  font-size: 13px;
}
.fl-btn-settings {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(255, 255, 255, .18);
  display: flex;
  align-items: center;
  justify-content: center;
}
.fl-gear {
  width: 17px;
  height: 17px;
}

/* ============ 底部 Tab ============ */
.fl-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 58px;
  display: flex;
  align-items: stretch;
  border-top: 1px solid #e8e8e8;
  background: #fff;
  z-index: 90;
}
.fl-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 58px;
  font-size: 11px;
  gap: 3px;
  color: #444;
  border-top: 2px solid transparent;
}
.fl-nav-item.active {
  color: #C20C0C;
  border-top-color: #C20C0C;
}
.fl-nav-item.active .fl-nav-label {
  font-weight: 600;
}
.fl-nav-icon {
  width: 16px;
  height: 16px;
}

/* ============ 主内容 ============ */
.fl-main {
  padding-top: calc(56px + var(--status-bar-height, 0px));
  padding-bottom: calc(150px + var(--status-bar-height, 0px));
}
.fl-content {
  padding: 16px 14px;
}

/* 二级页面（带左上角返回） */
.fl-page-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: calc(50px + var(--status-bar-height, 0px));
  padding: var(--status-bar-height, 0px) 14px 0 14px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.fl-back {
  width: 34px;
  height: 34px;
  margin-left: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.fl-back-icon {
  width: 22px;
  height: 22px;
}
.fl-page-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}
.fl-page-sub {
  font-size: 12px;
  color: #999;
  margin-left: 6px;
}
.fl-body {
  padding-top: calc(50px + var(--status-bar-height, 0px));
  min-height: 100vh;
}
.fl-form {
  padding: 16px 18px;
}
.fl-form-foot {
  padding: 4px 18px calc(24px + var(--status-bar-height, 0px));
  display: flex;
  gap: 10px;
}

/* ============ 页头 ============ */
.page-head {
  margin-bottom: 14px;
}
.page-head h2 {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: .5px;
}
.page-head .ph-sub {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
}

/* ============ 统计卡片 ============
 * 2026-09-25：整体瘦身（用户反馈总览页 4 个框太大、字也大）
 * 内边距 14/15 → 9/12，主数值 19 → 15.5，标签 12 → 11，装饰圆 86 → 58 */
.stat-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
/* 总览顶部汇总已纳入大卡片，末尾不再保留卡片外使用时的下间距 */
.overview-summary-card .stat-grid { margin-bottom: 0; }
.stat-card {
  position: relative;
  overflow: hidden;
  background: #fff;
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 9px 12px;
  flex: 1 1 45%;
  min-width: 0;
}
.stat-card::after {
  content: '';
  position: absolute;
  right: -18px;
  top: -18px;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: #fafafa;
}
.stat-label {
  font-size: 11px;
  color: #999;
  margin-bottom: 3px;
  position: relative;
  z-index: 1;
}
.stat-value {
  font-size: 15.5px;
  font-weight: 600;
  letter-spacing: -.3px;
  position: relative;
  z-index: 1;
}
.stat-value.income { color: #1BA784; }
.stat-value.expense { color: #C20C0C; }
.stat-sub {
  font-size: 10.5px;
  color: #bbb;
  margin-top: 4px;
  position: relative;
  z-index: 1;
}
.stat-pair {
  font-size: 13px;
  line-height: 1.45;
  white-space: nowrap;
}

/* ============ 卡片 ============ */
.card {
  background: #fff;
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 16px 15px;
}
.card + .card { margin-top: 12px; }
.section-title {
  font-size: 15px;
  font-weight: 600;
  position: relative;
  padding-left: 12px;
}
.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 15px;
  border-radius: 2px;
  background: #C20C0C;
}

/* 总览：月度分类占比双图 */
.overview-charts { display: flex; flex-direction: column; gap: 22px; }
.overview-chart-item { min-width: 0; }
.chart-subtitle {
  font-size: 13px;
  color: #888;
  font-weight: 600;
  margin-bottom: 14px;
  text-align: center;
}

/* 分类条 */
.cat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 13px;
  font-size: 12px;
}
.cat-row:last-child { margin-bottom: 0; }
.cat-name { width: 52px; flex-shrink: 0; color: #333; }
.cat-bar-wrap {
  flex: 1;
  height: 8px;
  background: #f2f2f2;
  border-radius: 4px;
  overflow: hidden;
  min-width: 0;
}
.cat-bar {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #E64C4C, #C20C0C);
}
.cat-val {
  width: 96px;
  flex-shrink: 0;
  text-align: right;
  color: #666;
  font-size: 11px;
  white-space: nowrap;
}
.cat-val .muted { margin-left: 4px; }
.cat-name-wide { width: auto; max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 渠道排行：类目「汇总 / 明细」独立切换按钮 */
.ch-toggle-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 9px;
}
.ch-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 14px;
  border: 1px solid #e5e5e5;
  background: #fafafa;
  color: #666;
  font-size: 12px;
  white-space: nowrap;
}
.ch-toggle-mode {
  font-size: 10.5px;
  line-height: 16px;
  padding: 0 6px;
  border-radius: 8px;
  background: #ededed;
  color: #999;
}
.ch-toggle.on {
  border-color: #C20C0C;
  background: #fff5f5;
  color: #C20C0C;
  font-weight: 600;
}
.ch-toggle.on .ch-toggle-mode {
  background: #C20C0C;
  color: #fff;
}
.ch-tip {
  font-size: 11.5px;
  color: #bbb;
  line-height: 1.6;
  margin-bottom: 14px;
}

/* 设置页：账户分组小标题（要能一眼看出是标题，不能太淡） */
.acct-group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #444;
  margin: 16px 0 8px;
}
.acct-group-title::before {
  content: '';
  width: 3px;
  height: 13px;
  border-radius: 2px;
  background: #C20C0C;
}

/* ============ 筛选下拉 / 筛选条 ============ */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.search-tip { font-size: 12px; color: #999; }
.filter-select {
  height: 32px;
  padding: 0 28px 0 12px;
  border: 1px solid #e2e2e2;
  border-radius: 17px;
  font-size: 12.5px;
  color: #555;
  background-color: #fff;
  display: flex;
  align-items: center;
  white-space: nowrap;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 10px;
}
.filter-select.on { border-color: #C20C0C; color: #C20C0C; }

/* ============ 明细行（手机端卡片化两行网格）
 * 2026-09-25：底部「创建 / 修改时间」行已按用户要求移除（只保留编辑页） */
.detail-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas:
    "cat  cat  amt"
    "date note ops";
  column-gap: 8px;
  row-gap: 3px;
  align-items: center;
  padding: 8px 11px;
  margin-bottom: 6px;
  border-radius: 7px;
  border-left-width: 3px;
  border-left-style: solid;
}
.detail-row.row-income { background: rgba(27, 167, 132, .075); border-left-color: #1BA784; }
.detail-row.row-expense { background: rgba(194, 12, 12, .06); border-left-color: #C20C0C; }
.dr-date { grid-area: date; font-size: 10.5px; color: #bbb; line-height: 1.2; white-space: nowrap; }
.dr-cat { grid-area: cat; min-width: 0; line-height: 1.35; }
/* 备注：完整显示，太长自动换行（不再截断省略） */
.dr-note {
  grid-area: note;
  min-width: 0;
  font-size: 11px;
  color: #999;
  line-height: 1.35;
  white-space: normal;
  word-break: break-word;
}
.dr-amt {
  grid-area: amt;
  text-align: right;
  font-size: 15px;
  line-height: 1.2;
  white-space: nowrap;
}
.dr-ops { grid-area: ops; text-align: right; line-height: 1; }

.muted { color: #aaa; font-size: 12px; }
.amt-income { color: #1BA784; font-weight: 600; }
.amt-expense { color: #C20C0C; font-weight: 600; }
.row-ops { display: flex; gap: 8px; justify-content: flex-end; }
.link-op { color: #bbb; font-size: 11px; }
.link-op.edit { }

/* 月份折叠组 */
.month-group { border-bottom: 1px solid #f5f5f5; }
.month-group:last-child { border-bottom: none; }
.month-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 2px;
}
.month-arrow {
  font-size: 9px;
  color: #bbb;
  flex-shrink: 0;
  width: 12px;
  text-align: center;
}
.month-arrow.open { display: inline-block; transform: rotate(90deg); }
.month-name { font-weight: 600; color: #333; font-size: 13.5px; }
.month-sum {
  margin-left: auto;
  display: flex;
  gap: 8px;
  font-size: 11.5px;
  white-space: nowrap;
}
.month-body { padding: 2px 0 10px; }

/* 标签 / 徽章 */
.tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  background: #f4f4f4;
  color: #666;
  font-size: 11.5px;
  white-space: nowrap;
}
.acct-tag {
  display: inline-block;
  margin-left: 5px;
  padding: 1px 7px;
  border-radius: 10px;
  background: #eef4ff;
  color: #5b7fd1;
  font-size: 10.5px;
  white-space: nowrap;
  vertical-align: middle;
}
.badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 500;
  vertical-align: middle;
  margin-left: 6px;
}
.badge-green { background: #e8f7f2; color: #1BA784; }
.badge-red { background: #fdeaea; color: #C20C0C; }
.badge-gray { background: #f2f2f2; color: #999; }

/* 分段控件 */
.seg {
  display: inline-flex;
  background: #f2f2f2;
  border-radius: 16px;
  padding: 3px;
}
.seg-btn {
  padding: 6px 15px;
  border-radius: 13px;
  font-size: 12px;
  color: #777;
  text-align: center;
}
.seg-btn.active {
  background: #fff;
  color: #C20C0C;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .1);
}
.seg.seg-full { display: flex; width: 100%; }
.seg.seg-full .seg-btn { flex: 1; padding: 7px 8px; font-size: 12.5px; }

/* ============ 借款卡片 ============ */
.loan-card {
  background: #fff;
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 10px;
}
.loan-card.done { opacity: .78; }
/* 2026-09-25 瘦身：去掉左侧圆形头像 + 一长串 meta，改为三行紧凑布局
 * 第一行：姓名 + 应收 / 应付 …… 最右侧「剩余：¥x.xx」
 * 第二行：总额 ¥x.xx · 已收 / 已还 ¥x.xx
 * 第三行：借款日期：xxx　约定还款日：xxx（无约定还款日则不显示） */
.loan-summary { display: flex; align-items: center; gap: 8px; }
.loan-main { flex: 1; min-width: 0; }
.loan-row1 { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.loan-party { font-size: 14px; font-weight: 600; color: #333; }
.loan-remain-inline { margin-left: auto; font-size: 14px; font-weight: 700; white-space: nowrap; }
.loan-row2 {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 5px;
  font-size: 11.5px;
  color: #999;
}
.loan-row3 {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 4px;
  font-size: 11px;
  color: #aaa;
}
/* 展开区底部：备注 + 创建 / 修改时间（原先挤在收起状态的卡片里，过于臃肿） */
.loan-extra {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #f0f0f0;
  font-size: 11px;
  color: #b5b5b5;
  line-height: 1.7;
  word-break: break-word;
}
.loan-arrow {
  color: #ccc;
  font-size: 10px;
  flex-shrink: 0;
  width: 12px;
  text-align: center;
}
.loan-arrow.open { display: inline-block; transform: rotate(90deg); }
.loan-detail { margin-top: 14px; border-top: 1px dashed #f0f0f0; padding-top: 14px; }
.progress {
  height: 6px;
  border-radius: 3px;
  background: #f2f2f2;
  overflow: hidden;
  margin-bottom: 12px;
}
.progress-bar { height: 100%; border-radius: 3px; }
.loan-remain-line { font-size: 12px; color: #888; margin-bottom: 12px; }
.loan-actions { display: flex; gap: 6px; width: 100%; margin-top: 14px; flex-wrap: wrap; }
/* 四个按钮（再借一笔 / 修改 / 删除 / 收回|还款）等分一行 */
.loan-actions .btn { flex: 1; padding: 0 6px; font-size: 11.5px; white-space: nowrap; }

/* 追加 / 还款明细 */
.addon-list { margin-bottom: 4px; }
.addon-title, .repay-title { font-size: 12px; color: #bbb; margin-bottom: 8px; }
.addon-item, .repay-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  padding: 8px 0;
  border-bottom: 1px dashed #f5f5f5;
}
.addon-item:last-child, .repay-item:last-child { border-bottom: none; }
.addon-left, .repay-left {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  color: #888;
}
.addon-date, .repay-date { flex-shrink: 0; color: #999; }
.addon-note, .repay-note {
  color: #c4c4c4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.addon-right { color: #C20C0C; font-weight: 600; flex-shrink: 0; }
.repay-right { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
.r-amt { color: #1BA784; font-weight: 600; }
.r-left { color: #bbb; font-size: 10px; }

/* ============ 纪念日 ============ */
.anniv-card {
  display: flex;
  align-items: center;
  gap: 11px;
  background: #fff;
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 13px 14px;
  margin-bottom: 10px;
}
.anniv-card.today { border-color: #f6c2c2; background: linear-gradient(0deg, #fff7f7, #fff); }
.anniv-main { flex: 1; min-width: 0; }
.anniv-title {
  font-size: 13.5px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
/* 第二行：备注（没有备注时整行不渲染） */
.anniv-note {
  font-size: 11.5px;
  color: #999;
  margin-top: 5px;
  line-height: 1.6;
  word-break: break-word;
}
.anniv-count { text-align: right; flex-shrink: 0; }
.anniv-days { font-size: 14.5px; font-weight: 700; line-height: 1.3; white-space: nowrap; }
.anniv-next { font-size: 10px; color: #bbb; margin-top: 3px; white-space: nowrap; }
.anniv-ops { display: flex; gap: 8px; flex-shrink: 0; margin-left: 2px; }
.anniv-ops .link-op { font-size: 11px; }

/* ============ 提醒弹窗条目 ============ */
.alert-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 11px 12px;
  border-radius: 8px;
  background: #fafafa;
  margin-bottom: 10px;
  border-left: 3px solid #e0e0e0;
}
.alert-item.urgent { background: #fff5f5; border-left-color: #C20C0C; }
.alert-item:last-child { margin-bottom: 0; }
.alert-icon { font-size: 18px; line-height: 1.3; flex-shrink: 0; }
.alert-main { flex: 1; min-width: 0; }
.alert-title { font-size: 12.5px; font-weight: 600; color: #333; margin-bottom: 5px; }
.alert-text { font-size: 12px; color: #666; line-height: 1.6; word-break: break-word; }
.alert-item.urgent .alert-text { color: #C20C0C; }
.alert-badge {
  flex-shrink: 0;
  padding: 2px 9px;
  border-radius: 10px;
  background: #eee;
  color: #888;
  font-size: 11px;
  line-height: 18px;
  white-space: nowrap;
  margin-top: 2px;
}
.alert-item.urgent .alert-badge { background: #C20C0C; color: #fff; }

/* ============ 按钮 ============ */
.btn {
  height: 36px;
  padding: 0 20px;
  border-radius: 18px;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.btn-primary { background: #C20C0C; color: #fff; }
.btn-ghost { background: #fff; color: #555; border: 1px solid #e0e0e0; }
.btn-sm { height: 30px; padding: 0 16px; font-size: 12px; border-radius: 15px; }
.btn-disabled { opacity: .4; }
.btn-row { display: flex; gap: 10px; }
.btn-row .btn { flex: 1; }

/* ============ 图表（柱状） ============ */
.chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 150px;
  padding: 0;
}
.chart-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  padding: 4px 0;
  border-radius: 6px;
}
.chart-col.sel { background: rgba(194, 12, 12, .06); }
.chart-col.sel .chart-label { color: #C20C0C; font-weight: 600; }
.chart-bars { display: flex; align-items: flex-end; gap: 3px; height: 108px; }
.bar { width: 8px; border-radius: 3px 3px 0 0; }
.bar-in { background: linear-gradient(180deg, #38C49E, #1BA784); }
.bar-out { background: linear-gradient(180deg, #E64C4C, #C20C0C); }
.chart-label { font-size: 9px; color: #999; white-space: nowrap; }
.legend {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 14px;
  font-size: 12px;
  color: #888;
}
.legend .dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  margin-right: 6px;
  vertical-align: middle;
}
.legend-item { display: flex; align-items: center; }
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  margin-right: 6px;
}

.empty { text-align: center; color: #c4c4c4; font-size: 13px; padding: 36px 0; }

/* ============ 环形占比图（conic-gradient 实现） ============ */
.donut-box { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.donut-wrap { position: relative; width: 184px; height: 184px; flex-shrink: 0; }
.donut-ring {
  position: absolute;
  left: 0;
  top: 0;
  width: 184px;
  height: 184px;
  border-radius: 50%;
  background-color: #f2f2f2;
}
.donut-ring-fill {
  position: absolute;
  left: 0;
  top: 0;
  width: 184px;
  height: 184px;
  border-radius: 50%;
}
.donut-hole {
  position: absolute;
  left: 33px;
  top: 33px;
  width: 118px;
  height: 118px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 12px;
}
.dc-label { font-size: 11px; color: #bbb; letter-spacing: 1px; }
.dc-value { font-size: 15px; font-weight: 700; color: #333; margin-top: 4px; }
.donut-legend { width: 100%; }
.dl-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 0;
  border-bottom: 1px dashed #f5f5f5;
  font-size: 12.5px;
}
.dl-item:last-child { border-bottom: none; }
.dl-dot { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.dl-name {
  flex: 1;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dl-pct { color: #999; font-size: 11.5px; flex-shrink: 0; width: 42px; text-align: right; }
.dl-val { color: #333; font-weight: 600; font-size: 12px; flex-shrink: 0; width: 74px; text-align: right; }

/* ============ 信用卡还款提醒条 ============ */
/* 纵向排列：第一行是「总计需还款」，往下每行一个账户 */
.credit-banner {
  display: block;
  background: #fff8e6;
  border: 1px solid #ffe4a3;
  border-radius: 8px;
  padding: 11px 13px;
  margin-bottom: 12px;
}
/* 第一行：信用卡图标 + 总计需还款 */
.cb-head {
  display: flex;
  align-items: center;
  gap: 5px;
  line-height: 1.6;
}
.cb-icon { font-size: 16px; line-height: 1.4; flex-shrink: 0; }
.cb-head-label { font-size: 12.5px; color: #8a6d1a; }
/* 总计金额：整条里最大最红，一眼看到要还多少 */
.cb-total { color: #C20C0C; font-weight: 700; font-size: 15px; }
/* 账户行：到期状态 + 账户名 (还款日) + 该账户需还金额（默认 2 行，超出点「展开」） */
.cb-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8a6d1a;
  line-height: 1.9;
  margin-top: 1px;
}
.cb-status {
  display: inline-block;
  flex-shrink: 0;
  padding: 0 6px;
  border-radius: 8px;
  background: #fff2cf;
  color: #b8860b;
  font-size: 10.5px;
  line-height: 16px;
}
/* 今天到期：反白红底，最醒目 */
.cb-status-today { background: #C20C0C; color: #fff; }
.cb-item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cb-item-amt { color: #C20C0C; font-weight: 600; flex-shrink: 0; }
.cb-more {
  margin-top: 3px;
  font-size: 11.5px;
  color: #b8860b;
  text-decoration: underline;
}
.cb-more-arrow { margin-left: 3px; text-decoration: none; }

/* ============ TabBar 中间圆形「记一笔」 ============ */
.fl-nav-add-wrap {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.fl-nav-add {
  width: 46px;
  height: 46px;
  margin-top: -16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #E64C4C, #C20C0C);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(194, 12, 12, .42);
  border: 3px solid #fff;
}
.fl-nav-add:active {
  transform: scale(.92);
  opacity: .9;
}
.fl-nav-add-icon { width: 22px; height: 22px; }

/* ============ 表单 ============ */
.field { margin-bottom: 16px; }
.field:last-child { margin-bottom: 0; }
.field label {
  display: block;
  font-size: 13px;
  color: #777;
  margin-bottom: 7px;
}
.input, .select, .picker-box {
  width: 100%;
  height: 40px;
  border: 1px solid #e2e2e2;
  border-radius: 4px;
  padding: 0 12px;
  font-size: 14px;
  color: #333;
  background-color: #fff;
  display: flex;
  align-items: center;
}
.input-placeholder { color: #bbb; font-size: 14px; }
.select-arrow {
  margin-left: auto;
  width: 11px;
  height: 11px;
  flex-shrink: 0;
}
.row-2 { display: flex; gap: 14px; }
.row-2 > * { flex: 1; min-width: 0; }
.row-3 { display: flex; gap: 8px; }
.row-3 > * { min-width: 0; }
.row-3 .col-y { flex: 1.35; }
.row-3 .col-m { flex: 1; }
.row-3 .col-d { flex: 1; }
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  font-size: 13px;
  color: #666;
}
.fl-checkbox {
  width: 16px;
  height: 16px;
  border: 1px solid #ccc;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #fff;
}
.fl-checkbox.on { background: #C20C0C; border-color: #C20C0C; }
.fl-checkbox-tick { color: #fff; font-size: 11px; line-height: 1; }
.tip-note {
  font-size: 11px;
  color: #bbb;
  margin-top: 6px;
  line-height: 1.6;
}

/* 常用对方标签 */
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.chip {
  padding: 7px 14px;
  border-radius: 16px;
  border: 1px solid #e5e5e5;
  background: #fafafa;
  color: #666;
  font-size: 13px;
}
.chip.active { background: #C20C0C; border-color: #C20C0C; color: #fff; font-weight: 600; }
.chip-empty { font-size: 12px; color: #ccc; }
.party-hint {
  margin-top: 10px;
  padding: 9px 12px;
  border-radius: 6px;
  background: #fff8e6;
  color: #b8860b;
  font-size: 12px;
  line-height: 1.55;
}
.party-hint b { color: #C20C0C; }

.repay-info { background: #fafafa; border-radius: 6px; padding: 16px 18px; margin-bottom: 18px; }
.repay-info .who { font-size: 13px; color: #888; }
.repay-info .big { font-size: 24px; font-weight: 600; color: #C20C0C; margin: 6px 0; }
.repay-info .sub { font-size: 12px; color: #aaa; }

/* ============ 设置 ============ */
.settings-section { padding: 16px 0; border-bottom: 1px solid #f2f2f2; }
.settings-section:first-child { padding-top: 0; }
.settings-section:last-child { border-bottom: none; padding-bottom: 0; }
.settings-panel {
  background: #fff;
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 16px 15px;
}
.settings-panel + .settings-panel { margin-top: 12px; }
/* 数据管理、账户管理自身既是 section 又是外框，需要覆盖 section 的分隔线与首项缩进规则 */
.settings-section.settings-panel {
  padding: 16px 15px;
  border-bottom: 1px solid #ececec;
}
/* 三类提醒共用一个外框，内部仍以细线区分各项 */
.settings-reminder-panel > .settings-section:first-child { padding-top: 0; }
.settings-reminder-panel > .settings-section:last-child { padding-bottom: 0; border-bottom: none; }
.settings-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px; }
.settings-hint { font-size: 12px; color: #aaa; line-height: 1.6; margin-top: 10px; }
/* 提醒区块标题行右侧按钮组：开关 + ⚠️说明（开关在说明按钮左边） */
.title-ops {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.title-ops .switch {
  width: 42px;
  height: 24px;
  border-radius: 24px;
}
.title-ops .switch .switch-knob {
  width: 18px;
  height: 18px;
}
.title-ops .switch.on .switch-knob { left: 21px; }
.title-ops .help-link { align-self: center; }
.switch {
  position: relative;
  width: 48px;
  height: 27px;
  flex-shrink: 0;
  border-radius: 27px;
  background: #d8d8d8;
}
.switch.on { background: #C20C0C; }
.switch-knob {
  position: absolute;
  height: 21px;
  width: 21px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .2);
}
.switch.on .switch-knob { left: 24px; }

/* 信用账户管理 */
.credit-account-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 0;
  border-bottom: 1px dashed #f2f2f2;
}
.credit-account-item:last-child { border-bottom: none; }
/* 设置页只展示的那一个手动账户：加方框（其余在「账户详情」页查看） */
.credit-account-item.boxed {
  padding: 11px 12px;
  border: 1px solid #ececec;
  border-radius: 8px;
  background: #fcfcfc;
}
.credit-account-item.boxed:last-child { border-bottom: 1px solid #ececec; }
.ca-main { flex: 1; min-width: 0; }
.ca-name { font-size: 13px; font-weight: 600; color: #333; }
.ca-meta { font-size: 11.5px; color: #999; margin-top: 4px; }
.ca-ops { display: flex; gap: 12px; flex-shrink: 0; }
.ca-ops .link-op { font-size: 12px; }
.credit-account-empty { padding: 14px 0; text-align: center; color: #ccc; font-size: 12px; }
/* 「+ 账户」弹出窗口内的三个添加按钮（2026-09-25 二版）：
 * 用户要求改为**弹出窗口**展示，不再用内联下拉撑开页面。
 * 与「导出 Excel/JSON」同款红底胶囊，纵向铺满一行一个。 */
.aam-btn {
  width: 100%;
  margin-bottom: 10px;
}
.aam-btn:last-of-type { margin-bottom: 4px; }

/* ============ 遮罩 / 底部弹层 ============ */
.mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, .45);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}
.modal {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  max-height: 88vh;
  /* 竖向 flex：标题与底部按钮固定，中间内容区独立滚动 */
  display: flex;
  flex-direction: column;
}
/* 内容区滚动容器：仅此区域可滚动，背景页面被遮罩的 touchmove 锁死 */
.modal-scroll {
  max-height: 58vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* 创建 / 修改时间展示块（编辑页底部只读） */
.time-meta {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px dashed #ececec;
  font-size: 12px;
  color: #999;
  line-height: 1.9;
}
.time-meta .tm-row {
  display: flex;
  align-items: center;
}
.time-meta .tm-label {
  width: 64px;
  flex-shrink: 0;
  color: #aaa;
}
.time-meta .tm-val {
  color: #666;
}
.modal-tip { padding: 12px 18px 0; margin-top: 0; }
.modal-head {
  padding: 16px 18px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 600;
}
.modal-close { color: #bbb; font-size: 15px; padding: 4px; }
.modal-body { padding: 16px 18px; }
.modal-foot {
  padding: 0 18px calc(20px + var(--status-bar-height, 0px));
  display: flex;
  gap: 10px;
}
.modal-foot .btn { flex: 1; }

/* ============ 轻提示 ============ */
.fl-toast {
  position: fixed;
  left: 50%;
  bottom: 140px;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, .78);
  color: #fff;
  font-size: 13px;
  padding: 10px 20px;
  border-radius: 20px;
  z-index: 2000;
  max-width: 80vw;
  text-align: center;
}

/* ============ 图标（data-uri SVG，白色/灰色/红色两套） ============ */
.ic-search {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2.2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-3.6-3.6'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}
.ic-gear {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='3'/%3E%3Cpath d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}
.ic-back {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23333333' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15 5l-7 7 7 7'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}
.ic-plus {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2.6' stroke-linecap='round'%3E%3Cpath d='M12 5v14M5 12h14'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}
.ic-caret {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23bbbbbb' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}
/* 底部 Tab 图标：正常态 #444 */
.ic-nav-overview, .ic-nav-detail, .ic-nav-loans, .ic-nav-anniv,
.ic-nav-overview-on, .ic-nav-detail-on, .ic-nav-loans-on, .ic-nav-anniv-on {
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}
.ic-nav-overview {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23444444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 3v18h18'/%3E%3Cpath d='M18 17V9M13 17V5M8 17v-3'/%3E%3C/svg%3E");
}
.ic-nav-overview-on {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23C20C0C' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 3v18h18'/%3E%3Cpath d='M18 17V9M13 17V5M8 17v-3'/%3E%3C/svg%3E");
}
.ic-nav-detail {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23444444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'/%3E%3C/svg%3E");
}
.ic-nav-detail-on {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23C20C0C' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'/%3E%3C/svg%3E");
}
.ic-nav-loans {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23444444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17 1l4 4-4 4'/%3E%3Cpath d='M3 11V9a4 4 0 014-4h14'/%3E%3Cpath d='M7 23l-4-4 4-4'/%3E%3Cpath d='M21 13v2a4 4 0 01-4 4H3'/%3E%3C/svg%3E");
}
.ic-nav-loans-on {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23C20C0C' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17 1l4 4-4 4'/%3E%3Cpath d='M3 11V9a4 4 0 014-4h14'/%3E%3Cpath d='M7 23l-4-4 4-4'/%3E%3Cpath d='M21 13v2a4 4 0 01-4 4H3'/%3E%3C/svg%3E");
}
.ic-nav-anniv {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23444444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E");
}
.ic-nav-anniv-on {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23C20C0C' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E");
}

/* ============ 页面级补充样式 ============ */
.page-head .ph-title {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: .5px;
  color: #333;
}
.ph-sub {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
}
/* 总览页已删除「总览」大标题，只剩这一行说明，去掉它顶上的 6px 间距 */
.ph-sub-only { margin-top: 0; }
.fl-search-ph { color: rgba(255, 255, 255, .7); font-size: 13px; }
.fl-nav-label { font-size: 11px; line-height: 1; }

.fb-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.fb-mt { margin: 18px 0 14px; }

/* 卡片小标题间距 */
.sec-mb18 { margin-bottom: 18px; }
.sec-mb20 { margin-bottom: 20px; }
.sec-mb8 { margin-bottom: 8px; }

/* 总览：待收 / 待还 */
.pair-in { color: #1BA784; }
.pair-sep { color: #ddd; }
.pair-out { color: #C20C0C; }

/* 总览：趋势卡三行汇总 */
.trend-sum {
  display: flex;
  gap: 20px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.ts-item { font-size: 13px; color: #888; }
.ts-in { color: #1BA784; font-size: 15px; font-weight: 600; }
.ts-out { color: #C20C0C; font-size: 15px; font-weight: 600; }
.ts-dark { color: #333; font-size: 15px; font-weight: 600; }
.strong { font-weight: 600; }
.loan-pct { margin-left: 8px; }
.clear-link { color: #C20C0C; margin-left: 6px; }

/* ============ 设置页 / 二级页补充 ============ */
.mt14 { margin-top: 14px; }
.mt0 { margin-top: 0; }
.gap12 { height: 12px; }
.mb0 { margin-bottom: 0; }
.hl { color: #C20C0C; font-weight: 600; }
.danger { color: #C20C0C; font-weight: 600; }
.ph-holder { color: #bbb; }
.empty-box {
  color: #bbb;
  font-size: 13px;
  justify-content: flex-start;
}
.readonly-box {
  background: #f7f7f7;
  color: #888;
}
.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 0;
  border-bottom: 1px dashed #f2f2f2;
}
.file-item:last-child { border-bottom: none; }
.file-name {
  font-size: 13px;
  color: #333;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* ============ 设置页：标题行 + ⚠️说明 入口（2026-09-25） ============ */
.settings-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.settings-title-row .settings-title { margin-bottom: 0; }
.settings-title-row.title-mt { margin-top: 22px; }
/* ⚠️说明：小号胶囊按钮，固定在所在行最右侧 */
.help-link {
  flex-shrink: 0;
  font-size: 11.5px;
  color: #C20C0C;
  background: rgba(194, 12, 12, .06);
  border: 1px solid rgba(194, 12, 12, .18);
  border-radius: 11px;
  padding: 2px 9px;
  line-height: 1.6;
}
/* 「+ 账户」/「账户详情」：与「导出 Excel/JSON」同款红底椭圆按钮，
 * 仅按标题行的行内空间收窄高度与左右内边距（.btn 为 36px / 0 20px / 13px） */
.acct-row-btn {
  flex: 0 0 auto;
  height: 28px;
  padding: 0 12px;
  font-size: 12px;
  border-radius: 14px;
}
/* 账户标题行右侧按钮组（+ 账户 / 账户详情 / ⚠️说明），窄屏放不下时整组换行 */
.acct-group-ops {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
  max-width: 100%;
}
.acct-group-ops .acct-row-btn { align-self: center; }
.acct-group-ops .help-link { align-self: center; }

/* 默认账户：小方框（设置页只显示第一排 2 个，详情页 7 个全展示） */
.bi-box-row { display: flex; gap: 10px; }
.bi-box-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.bi-box {
  min-width: 84px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fcfcfc;
  color: #444;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.bi-box-row .bi-box { flex: 1; }

/* ============ 说明页（pages/help） ============ */
.help-block { font-size: 12.5px; color: #888; line-height: 1.75; }
.hb-h {
  font-size: 13.5px;
  font-weight: 600;
  color: #333;
  margin: 18px 0 6px;
}
.hb-h:first-child { margin-top: 0; }
.hb-p { margin-bottom: 8px; }
.hb-meta { color: #aaa; font-size: 12px; }
.hl-danger { color: #C20C0C; font-weight: 600; }
.help-foot {
  margin-top: 22px;
  padding-top: 12px;
  border-top: 1px dashed #ececec;
  font-size: 11.5px;
  color: #c4c4c4;
  line-height: 1.6;
}
.row-3 .picker-box { padding: 0 8px; font-size: 13px; }
</style>
