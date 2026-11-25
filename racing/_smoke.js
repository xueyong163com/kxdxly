/* 赛车页冒烟测试：真实顺序执行内联脚本（含注入组件），验证 10 车/45 知识/金币/火箭/喇叭 */
'use strict';
const fs = require('fs');
const path = require('path');

/* ---------- DOM / Canvas 桩 ---------- */
const store = {};
const ls = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
function makeCtx() {
  const base = {
    canvas: { width: 320, height: 420 },
    fillStyle: '', strokeStyle: '', lineWidth: 1, lineJoin: '', lineCap: '',
    globalAlpha: 1, font: '', textAlign: '', textBaseline: ''
  };
  ['save','restore','translate','rotate','scale','beginPath','moveTo','lineTo','closePath',
   'fill','stroke','clip','fillRect','clearRect','strokeRect','fillText','strokeText',
   'arc','arcTo','ellipse','rect','quadraticCurveTo','bezierCurveTo','setTransform','drawImage'
  ].forEach(m => { base[m] = function(){}; });
  base.setTransform = function(){};
  return base;
}
function makeEl(tag) {
  const classes = new Set();
  const handlers = {};
  const el = {
    tag: tag || 'div', children: [], parent: null, dataset: {}, disabled: false,
    textContent: '', innerHTML: '', offsetWidth: 0, _h: handlers,
    width: 0, height: 0, className: '',
    style: { setProperty() {}, width: '', left: '' },
    classList: {
      add: (...cs) => cs.forEach(c => classes.add(c)),
      remove: (...cs) => cs.forEach(c => classes.delete(c)),
      toggle(c, f) { if (f === undefined) { classes.has(c) ? classes.delete(c) : classes.add(c); } else if (f) { classes.add(c); } else { classes.delete(c); } },
      contains: c => classes.has(c)
    },
    addEventListener(type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    removeEventListener() {},
    click() { (handlers.click || []).slice().forEach(f => f()); },
    appendChild(ch) { ch.parent = el; el.children.push(ch); return ch; },
    remove() { if (el.parent) { const i = el.parent.children.indexOf(el); if (i >= 0) el.parent.children.splice(i, 1); } },
    querySelectorAll(sel) {
      const out = [];
      if (sel.startsWith('.')) {
        const cls = sel.slice(1).split(/[:.]/)[0];
        (function walk(n) { n.children.forEach(ch => { if (ch.classList.contains(cls)) out.push(ch); walk(ch); }); })(el);
      }
      return out;
    },
    querySelector() { return null; },
    getBoundingClientRect() { return { width: 320, height: 420, left: 0, top: 0, right: 320, bottom: 420 }; },
    getContext() { return makeCtx(); },
    focus() {},
    setAttribute() {},
    get className() { return Array.from(classes).join(' '); },
    set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => classes.add(c)); }
  };
  return el;
}
const els = {};
global.document = {
  getElementById: id => els[id] || (els[id] = makeEl('div')),
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: t => makeEl(t),
  addEventListener() {},
  body: makeEl('body')
};
global.localStorage = ls;
global.scrollTo = () => {};
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.devicePixelRatio = 1;
global.ResizeObserver = undefined;
let rafCb = null;
global.requestAnimationFrame = cb => { rafCb = cb; return 1; };
global.cancelAnimationFrame = () => {};
global.performance = { now: () => Date.now() };

let failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name);
  if (!cond) failures++;
}

function FakeAudio() {
  const a = { src: '', paused: true, onended: null, onerror: null,
    play() { a.paused = false; setTimeout(() => { a.paused = true; const f = a.onended; a.onended = null; if (f) f(); }, 6); return Promise.resolve(); },
    pause() { a.paused = true; }, load() {} };
  return a;
}
global.Audio = FakeAudio;
global.window = global;
global.window.Audio = FakeAudio;

/* ---------- 执行页面脚本（含外链/注入组件无外链，直接内联全部） ---------- */
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
scripts.forEach((code, i) => {
  try { new Function('window', 'document', 'Audio', 'navigator', code)(global.window, global.document, global.Audio, { userAgent: 'node-smoke' }); }
  catch (e) { console.log('FAIL 内联脚本#' + (i + 1) + ': ' + e.message); failures++; }
});

const D = global.window.RACING_DEBUG;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  /* ---------- 静态内容 ---------- */
  check('调试钩子就绪', !!D);
  const carsSrc = html.match(/var CARS = \[([\s\S]*?)\];/);
  const carCount = carsSrc ? (carsSrc[1].match(/\{name:/g) || []).length : 0;
  check('CARS 数组 10 项', carCount === 10);
  const knowsSrc = html.match(/var KNOWS = \[([\s\S]*?)\];/);
  const knowCount = knowsSrc ? (knowsSrc[1].match(/'/g).length) / 2 : 0;
  check('KNOWS 45 条', knowCount === 45);
  const adir = path.join(__dirname, 'audio');
  const miss = [];
  for (let i = 1; i <= 45; i++) {
    const p = path.join(adir, 'k' + String(i).padStart(2, '0') + '.mp3');
    if (!(fs.existsSync(p) && fs.statSync(p).size > 500)) miss.push('k' + i);
  }
  check('知识音频 k01~k45 齐全', miss.length === 0);
  if (miss.length) console.log('  缺少: ' + miss.join(','));
  check('喇叭按钮与金币 HUD 存在', html.includes('id="hornBtn"') && html.includes('id="coinNum"'));
  check('新车辆样式分支存在', ['style.cat', 'style.panda', 'style.frog', 'style.police', 'style.dino', 'style.rocket'].every(s => html.includes(s)));

  /* ---------- 开局 ---------- */
  D.start(0);
  await sleep(20);
  check('开局进入 playing', D.info().state === 'playing');

  /* ---------- 金币 ---------- */
  const items = D.items(), P = D.player();
  items.length = 0;
  items.push({ type: 'coin', x: P.x, y: P.y, r: 14, s: 1, spin: 0, hit: false });
  D.update(0.016);
  check('吃到金币 +1', D.info().coins === 1);
  check('金币持久化', store['kexin_racing_coins'] === '1');

  /* ---------- 火箭加速 ---------- */
  items.length = 0;
  items.push({ type: 'boost', x: P.x, y: P.y, r: 14, s: 1, spin: 0, hit: false });
  D.update(0.016);
  check('吃到火箭进入加速', D.info().boost > 3);
  check('加速期无敌（inv 同步）', D.info().boost > 0);

  /* ---------- 加速期撞锥桶不掉血 ---------- */
  items.length = 0;
  items.push({ type: 'cone', x: P.x, y: P.y, s: 1, spin: 0, hit: false });
  D.update(0.016);
  check('加速期撞锥桶不受伤', D.info().state === 'playing');

  /* ---------- 喇叭彩蛋 ---------- */
  D.honk();
  await sleep(10);
  check('喇叭响后有探头小动物', D.info().peek === true);
  check('喇叭 toast 提示', (els['toast'].textContent || '').indexOf('探出头') >= 0);
  D.update(0.016);

  /* ---------- 知识泡泡新索引 ---------- */
  items.length = 0;
  items.push({ type: 'know', x: P.x, y: P.y, r: 14, s: 1, spin: 0, k: 40, hit: false });
  D.update(0.016);
  check('知识泡泡弹出（45 条索引安全）', els['knowTxt'].textContent.length > 0);

  /* ---------- 金币里程碑（每 30 枚庆祝） ---------- */
  items.length = 0;
  for (let i = 0; i < 29; i++) D.addCoin(1);   /* 现在 coinTotal=30，触发庆祝 */
  check('累计金币持久化（满 30）', store['kexin_racing_coins'] === '30');
  check('30 枚里程碑庆祝提示', (els['toast'].textContent || '').indexOf('攒到') >= 0);

  /* ---------- 通关 ---------- */
  items.length = 0;
  for (let i = 0; i < 8; i++) {
    items.push({ type: 'star', x: P.x, y: P.y, r: 14, s: 1, spin: 0, hit: false });
    D.update(0.016);
    if (D.info().state !== 'playing') break;
  }
  check('集满星星通关（第 1 关 8 颗）', D.info().state === 'over' && els['endCard'].classList.contains('hide') === false);
  check('结算含金币行', (els['endResult'].innerHTML || '').indexOf('金币') >= 0);

  /* ---------- 家长时间控制（/admin/ 写本机存档，TC 读取执行） ---------- */
  const TC = D.tc;
  check('TC 钩子就绪', !!TC && typeof TC.tick === 'function' && typeof TC.reload === 'function');
  let ti = TC.info();
  check('默认不限时', ti.on === false && ti.blocked === false && ti.remaining === Infinity);

  /* 每天 10 分钟限额：先测两级提醒，再测到点触发 */
  store['kx_racing_tc_cfg'] = JSON.stringify({ on: true, min: 10 });
  TC.reload();
  ti = TC.info();
  check('限额生效 remaining=600', ti.on === true && ti.remaining === 600 && ti.blocked === false);
  check('配置持久化', store['kx_racing_tc_cfg'] === '{"on":true,"min":10}');

  D.start(0);
  check('限额内可开局', D.info().state === 'playing');
  TC.tick(340);
  ti = TC.info();
  check('计时累计 340 秒', ti.used === 340);
  check('剩 5 分钟内 toast 提醒', (els['toast'].textContent || '').indexOf('5 分钟') >= 0 && ti.warned[0] === true);
  TC.tick(205);
  ti = TC.info();
  check('剩 1 分钟 toast 提醒', (els['toast'].textContent || '').indexOf('1 分钟') >= 0 && ti.warned[1] === true);
  TC.tick(60);
  ti = TC.info();
  check('超时触发锁定', ti.blocked === true && ti.triggered === true);
  check('遮罩出现且标题"时间到啦"', els['lockCard'].classList.contains('hide') === false && (els['lockTitle'].textContent || '') === '时间到啦');
  check('游戏冻结为 over', D.info().state === 'over');
  check('已玩时间持久化 605 秒', (store['kx_racing_tc_use'] || '').indexOf('"used":605') >= 0);
  D.start(0);
  check('锁定时开局被挡', D.info().state === 'over');

  /* 旧版加时存档残留不再生效，只能靠家长清零恢复 */
  const useObj = JSON.parse(store['kx_racing_tc_use']);
  useObj.bonus = 300;
  store['kx_racing_tc_use'] = JSON.stringify(useObj);
  TC.reload();
  check('旧 bonus 残留不再加额度', TC.info().blocked === true);
  delete useObj.bonus; useObj.used = 0;
  store['kx_racing_tc_use'] = JSON.stringify(useObj);
  TC.reload();
  ti = TC.info();
  check('清零后解锁 remaining=600', ti.blocked === false && ti.remaining === 600);
  check('遮罩收起且续玩', els['lockCard'].classList.contains('hide') === true && D.info().state === 'playing');
  TC.tick(600);
  check('额度用完再次锁定', TC.info().blocked === true);

  /* 锁定今天 / 解锁清零 */
  const d0 = new Date();
  const TODAY = d0.getFullYear() + '-' + ('0' + (d0.getMonth() + 1)).slice(-2) + '-' + ('0' + d0.getDate()).slice(-2);
  const useObj2 = JSON.parse(store['kx_racing_tc_use']);
  useObj2.lock = TODAY;
  store['kx_racing_tc_use'] = JSON.stringify(useObj2);
  TC.reload();
  ti = TC.info();
  check('锁定今天立即生效', ti.blocked === true && ti.lock === TODAY);
  check('锁定标题"小车睡觉啦"', (els['lockTitle'].textContent || '') === '小车睡觉啦');
  const useObj3 = JSON.parse(store['kx_racing_tc_use']);
  useObj3.lock = ''; useObj3.used = 0;
  store['kx_racing_tc_use'] = JSON.stringify(useObj3);
  TC.reload();
  check('解锁清零后恢复可玩', TC.info().blocked === false && D.info().state === 'playing');
  D.start(0);
  check('解锁后可正常开局', D.info().state === 'playing');

  /* ---------- 云端：其它终端已玩的时长要算进同一份额度 ---------- */
  D.tc.cloudUpdate({ on:true, min:10, lock:'' }, 300);
  check('TC 收到其它终端时长', D.tc.info().others === 300 && D.tc.info().cloud === true);
  check('剩余时间扣除其它终端已玩部分', D.tc.remaining() <= 300);
  D.tc.cloudUpdate({ on:true, min:10, lock:'' }, 900);
  check('其它终端用超额度时本机立刻被挡', D.tc.info().blocked === true);

  /* ---------- 家长清零 / 解锁后必须自动放开（旧版会永久锁死） ---------- */
  D.tc.cloudUpdate({ on:true, min:10, lock:'' }, 0);
  check('时长清零后自动解锁', D.tc.info().blocked === false && els['lockCard'].classList.contains('hide') === true);
  D.start(0);
  check('解锁后能正常开局', D.info().state === 'playing');
  D.tc.cloudUpdate({ on:true, min:10, lock:TODAY }, 0);
  check('手动锁定生效', D.tc.info().blocked === true);
  D.tc.cloudUpdate({ on:true, min:10, lock:'' }, 0);
  check('解除锁定后自动放开', D.tc.info().blocked === false && els['lockCard'].classList.contains('hide') === true);
  D.start(0);
  check('反复锁定解锁后仍可玩', D.info().state === 'playing');

  if (failures) { console.log('失败 ' + failures + ' 项'); process.exit(1); }
  console.log('全部冒烟测试通过');
  process.exit(0);
})().catch(e => { console.log('FAIL 异常: ' + e.stack); process.exit(1); });
