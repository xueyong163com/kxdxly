/* 全模块统计 usage.js + 主页家长控制台 admin-panel.js 冒烟测试 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

/* ---------- DOM / 存储桩 ---------- */
const store = {};
const ls = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
function makeEl(tag) {
  const classes = new Set(), handlers = {}, attrs = {};
  const el = {
    tag: tag || 'div', value: '', innerHTML: '', textContent: '', disabled: false,
    firstChild: null, _h: handlers,
    classList: {
      add: (...cs) => cs.forEach(c => classes.add(c)),
      remove: (...cs) => cs.forEach(c => classes.delete(c)),
      toggle(c, f) { if (f === undefined) { classes.has(c) ? classes.delete(c) : classes.add(c); } else if (f) { classes.add(c); } else { classes.delete(c); } },
      contains: c => classes.has(c)
    },
    addEventListener(t, fn) { (handlers[t] = handlers[t] || []).push(fn); },
    click(e) { (handlers.click || []).slice().forEach(f => f(e || { preventDefault() {}, target: null })); },
    focus() {},
    getAttribute(k) { return attrs[k] || null; },
    setAttribute(k, v) { attrs[k] = v; },
    appendChild(ch) { return ch; }
  };
  return el;
}
const els = {};
global.document = {
  readyState: 'complete', hidden: false, visibilityState: 'visible',
  getElementById: id => els[id] || (els[id] = makeEl('div')),
  querySelectorAll: () => [],
  createElement: t => makeEl(t),
  addEventListener() {},
  head: makeEl('head'), body: makeEl('body')
};
global.localStorage = ls;
global.setInterval = () => 0;
global.clearInterval = () => {};
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.location = { pathname: '/poems/' };
global.window = global;

let failures = 0;
function check(name, cond) { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) failures++; }
function run(file) { new Function(fs.readFileSync(path.join(ROOT, file), 'utf8'))(); }
const d0 = new Date();
const TODAY = d0.getFullYear() + '-' + ('0' + (d0.getMonth() + 1)).slice(-2) + '-' + ('0' + d0.getDate()).slice(-2);
function dayStr(back) { const d = new Date(); d.setDate(d.getDate() - back); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

(async () => {
  /* ---------- usage.js ---------- */
  run('usage.js');
  const U = global.KX_USAGE;
  check('usage 钩子就绪且识别 poems', !!U && U.module() === 'poems');
  U.tick(10); U.tick(10); U.tick(10); U.flush();
  check('30 秒落盘', U.day()[U.module()] === 30);
  /* 跨标签增量合并：外部已写入 100，本标签再加 5 → 135 而不是覆盖成 5 */
  const ext = JSON.parse(store[U.KEY]); ext[TODAY].poems = 100;
  store[U.KEY] = JSON.stringify(ext);
  U.tick(5); U.flush();
  check('跨标签增量不覆盖', U.day().poems === 105);
  /* 隐藏 / setActive */
  const before = U.day().poems;
  global.document.hidden = true; U.tick(9); global.document.hidden = false; U.flush();
  check('页面隐藏不计时', U.day().poems === before);
  U.setActive(() => false); U.tick(9); U.flush();
  check('setActive 关闭时不计时', U.day().poems === before);
  U.setActive(() => true); U.tick(5); U.flush();
  check('setActive 开启恢复计时', U.day().poems === before + 5);
  /* 14 天保留 */
  const many = JSON.parse(store[U.KEY]);
  for (let i = 1; i <= 20; i++) many[dayStr(i)] = { poems: i };
  store[U.KEY] = JSON.stringify(many);
  U.tick(1); U.flush();
  check('只保留最近 14 天', Object.keys(JSON.parse(store[U.KEY])).length === 14);
  check('range(7) 返回 7 天且末位是今天', U.range(7).length === 7 && U.range(7)[6].date === TODAY);
  /* 主页不计时 */
  global.location = { pathname: '/index.html' };
  run('usage.js');
  check('主页不计时', global.KX_USAGE.module() === '');
  global.KX_USAGE.tick(10); global.KX_USAGE.flush();
  check('主页不写统计', store[U.KEY] && !JSON.parse(store[U.KEY])[TODAY].home);

  /* ---------- admin-panel.js ---------- */
  run('admin-panel.js');
  check('控制台组件挂载', !!global.KX_ADMIN_PANEL);
  const A = global.KX_ADMIN_PANEL;
  els['parentBtn'].click();
  check('点按钮弹出密码门', els['kxMask'].classList.contains('kx-hide') === false && els['kxMain'].classList.contains('kx-hide') === true);
  check('首次进入为设置模式', A.info().setupMode === true && els['kxP2'].classList.contains('kx-hide') === false);
  els['kxP1'].value = '1234'; els['kxP2'].value = '5678';
  els['kxGo'].click();
  check('两次不一致被拦', store['kx_parent_pin'] === undefined && (els['kxErr'].textContent || '').indexOf('不一样') >= 0);
  els['kxP2'].value = '1234'; els['kxGo'].click();
  check('设置成功进入主面板', store['kx_parent_pin'] === '1234' && els['kxMain'].classList.contains('kx-hide') === false);
  check('六模块今日行齐全', ['学诗词', '学英语', '学知识', '开赛车', '学儿歌', '学数学'].every(n => (els['kxTodayRows'].innerHTML || '').indexOf(n) >= 0));
  check('7 天图含今天', (els['kxChart'].innerHTML || '').indexOf('今天') >= 0);
  check('星星六项齐全', (els['kxStars'].innerHTML || '').indexOf('数学') >= 0);
  check('赛车默认不限制', (els['kxRaceState'].textContent || '').indexOf('不限制') >= 0);

  /* 注入统计后重渲染 */
  const usage = JSON.parse(store[U.KEY]);
  usage[TODAY] = { poems: 600, math: 300, racing: 120 };
  store[U.KEY] = JSON.stringify(usage);
  store['kx_racing_tc_use'] = JSON.stringify({ d: TODAY, used: 120, bonus: 0, lock: '', hist: {} });
  A.render();
  check('汇总 17 分钟', (els['kxTodayTotal'].innerHTML || '').indexOf('17') >= 0);
  check('诗词 10 分钟', /学诗词[\s\S]{0,220}10 分钟/.test(els['kxTodayRows'].innerHTML || ''));
  check('赛车状态显示开车 2 分钟', (els['kxRaceState'].textContent || '').indexOf('2 分钟') >= 0);

  /* 限额档位 */
  function fakeLimit(min) {
    els['kxLimits'].click({ target: { closest: () => ({ getAttribute: () => String(min) }) }, preventDefault() {} });
  }
  fakeLimit(15);
  check('15 分钟档写入', JSON.parse(store['kx_racing_tc_cfg']).min === 15 && JSON.parse(store['kx_racing_tc_cfg']).on === true);
  check('上限文案更新', (els['kxRaceState'].textContent || '').indexOf('15 分钟') >= 0);
  fakeLimit(-1);
  check('不限制档写入', JSON.parse(store['kx_racing_tc_cfg']).on === false);

  /* 快捷操作 */
  function fakeOp(op) {
    els['kxMain'].click({ target: { closest: () => ({ getAttribute: () => op }) }, preventDefault() {} });
  }
  store['kx_racing_tc_use'] = JSON.stringify({ d: TODAY, used: 300, lock: '', hist: {} });
  const beforeBonus = store['kx_racing_tc_use'];
  fakeOp('bonus');
  check('已移除加时：触发旧 bonus 操作不会改动任何存档', store['kx_racing_tc_use'] === beforeBonus);
  const apSrc = fs.readFileSync(path.join(ROOT, 'admin-panel.js'), 'utf8');
  check('管理端不再有「多玩 5 分钟」按钮', apSrc.indexOf('多玩 5 分钟') < 0 && apSrc.indexOf('data-op="bonus"') < 0);
  check('管理端不再累加 bonus', apSrc.indexOf('+300') < 0 && apSrc.indexOf('已给今天加了 5 分钟') < 0);
  fakeOp('zero');
  check('今日重新计时', JSON.parse(store['kx_racing_tc_use']).used === 0);
  fakeOp('lock');
  check('锁定今天', JSON.parse(store['kx_racing_tc_use']).lock === TODAY);
  fakeOp('unlock');
  check('解除锁定', JSON.parse(store['kx_racing_tc_use']).lock === '');

  /* 关闭后重开仍需密码 */
  A.close();
  check('关闭隐藏遮罩', els['kxMask'].classList.contains('kx-hide'));
  els['parentBtn'].click();
  check('每次打开都要重新输密码', A.info().setupMode === false && els['kxMain'].classList.contains('kx-hide') === true);
  els['kxP1'].value = '9999'; els['kxGo'].click();
  check('错误密码提示', (els['kxErr'].textContent || '').indexOf('不对') >= 0);
  els['kxP1'].value = '1234'; els['kxGo'].click();
  check('正确密码进入', els['kxMain'].classList.contains('kx-hide') === false);

  /* ---------- 静态：六页接入 + 主页入口 ---------- */
  const pages = ['poems', 'english', 'nursery', 'quiz', 'math', 'racing'];
  let tagOK = 0, orderOK = 0;
  pages.forEach(function (p) {
    const h = fs.readFileSync(path.join(ROOT, p, 'index.html'), 'utf8');
    const c = h.indexOf('../cloud.js'), u = h.indexOf('../usage.js'), d = h.indexOf('<script src="data.js">');
    if (c >= 0 && u >= 0) tagOK++;
    if (c >= 0 && c < u && (d < 0 || u < d)) orderOK++;
  });
  check('六页都引入云端与统计脚本', tagOK === 6);
  check('脚本顺序 cloud → usage → 页面脚本', orderOK === 6);
  const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  check('主页有家长按钮与两个组件', home.indexOf('id="parentBtn"') >= 0 && home.indexOf('admin-panel.js') >= 0 && home.indexOf('cloud.js') >= 0);
  const race = fs.readFileSync(path.join(ROOT, 'racing', 'index.html'), 'utf8');
  check('赛车只在开车时计时', race.indexOf('KX_USAGE.setActive') >= 0);
  const files = ['usage.js', 'admin-panel.js'];
  check('新文件无表情符号', files.every(f => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))));

  if (failures) { console.log('失败 ' + failures + ' 项'); process.exit(1); }
  console.log('统计与家长控制台冒烟测试全部通过');
  process.exit(0);
})().catch(e => { console.log('FAIL 异常: ' + e.stack); process.exit(1); });
