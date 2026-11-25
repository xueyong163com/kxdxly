/* 云端同步冒烟测试：模拟两个终端，验证配置共享、时长合计、幂等上报、清零 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
global.document = { hidden: false, addEventListener() {}, getElementById() { return null; } };
global.window = global;
global.setInterval = () => 0;
global.clearInterval = () => {};

let CFG = { on:false, min:15, bonus:0, lock:'', reset_seq:0 };
let ROWS = [];
function upsert(row) {
  const i = ROWS.findIndex(r => r.day === row.day && r.module === row.module && r.device === row.device);
  if (i >= 0) ROWS[i] = Object.assign({}, ROWS[i], row); else ROWS.push(Object.assign({}, row));
}
global.fetch = function (url, opt) {
  const u = new URL(url), q = u.searchParams, method = (opt && opt.method) || 'GET';
  let status = 200, data = null;
  if (u.pathname.endsWith('/kx_family_config')) {
    if (method === 'GET') data = [{ cfg: CFG }];
    else { CFG = JSON.parse(opt.body).cfg; status = 201; }
  } else if (u.pathname.endsWith('/kx_usage_daily')) {
    if (method === 'GET') {
      const dayQ = q.get('day') || '';
      const rows = dayQ.indexOf('gte.') === 0
        ? ROWS.filter(r => r.day >= dayQ.slice(4))
        : ROWS.filter(r => r.day === dayQ.slice(3));
      data = rows.map(r => ({ day:r.day, module:r.module, device:r.device, sec:r.sec }));
    } else if (method === 'DELETE') {
      const dayQ = (q.get('day') || '').slice(3), modQ = q.get('module');
      ROWS = ROWS.filter(r => !(r.day === dayQ && (!modQ || r.module === modQ.slice(3))));
      status = 204;
    } else {
      const b = JSON.parse(opt.body);
      (Array.isArray(b) ? b : [b]).forEach(upsert);
      status = 201;
    }
  }
  return Promise.resolve({
    ok: status < 400, status,
    json: () => status === 204 ? Promise.resolve(null) : Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  });
};

let failures = 0;
function check(n, c) { console.log((c ? 'PASS' : 'FAIL') + ' ' + n); if (!c) failures++; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const day = (() => { const d = new Date(); return d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2); })();
  /* 另一台设备（B）已经玩过 */
  ROWS.push({ day, module:'racing', device:'deviceB', sec:300 });
  ROWS.push({ day, module:'poems',  device:'deviceB', sec:120 });

  new Function(fs.readFileSync(path.join(ROOT, 'cloud.js'), 'utf8'))();
  const C = global.KX_CLOUD;
  check('云端组件就绪', !!C && typeof C.sync === 'function');
  await sleep(30);
  check('启动即拉到云端配置', C.config().min === 15 && C.online() === true);
  check('设备 ID 稳定', /^d[a-z0-9]+$/.test(C.device()));

  const u1 = await C.getUsage();
  check('其它终端时长单独算出 300 秒', u1.others.racing === 300);
  await C.report('racing', 180);
  const u2 = await C.getUsage();
  check('两设备合计 480 秒', u2.by.racing === 480);
  check('本机只算自己 180 秒', u2.mine.racing === 180);
  check('others 仍为 300 秒', u2.others.racing === 300);
  await C.report('racing', 180);
  check('重复上报覆盖不重复计数', (await C.getUsage()).by.racing === 480);
  await C.report('racing', 240);
  check('本机玩久了覆盖为新值，合计 540', (await C.getUsage()).by.racing === 540);

  const c = await C.setConfig({ on:true, min:10 });
  check('限时配置写到云端', !!c && c.on === true && c.min === 10 && CFG.min === 10);
  check('另一台设备读同一份配置', (await C.getConfig()).min === 10);
  const range = await C.getRange(7);
  check('7 天统计按模块汇总所有设备', range[day].racing === 540 && range[day].poems === 120);

  const c2 = await C.resetToday('racing');
  check('清零删除所有设备的今日赛车行', ROWS.filter(r => r.module === 'racing' && r.day === day).length === 0);
  check('清零不影响其它模块', ROWS.some(r => r.module === 'poems'));
  check('reset_seq 自增让各设备重置本地累计', c2.reset_seq === 1);
  store['kx_usage_v1'] = JSON.stringify({ [day]:{ racing:999, poems:60 } });
  store['kx_racing_tc_use'] = JSON.stringify({ d:day, used:999, bonus:0, lock:'', hist:{} });
  check('检测到家长清零', C.checkReset(c2) === true);
  check('本机赛车累计归零、其它模块保留', JSON.parse(store['kx_usage_v1'])[day].racing === 0 && JSON.parse(store['kx_usage_v1'])[day].poems === 60);
  check('赛车限时模块本地 used 归零', JSON.parse(store['kx_racing_tc_use']).used === 0);
  check('同一 reset_seq 不重复清零', C.checkReset(c2) === false);

  /* 断网兜底：缓存里的旧合计不能被误算成"其它设备玩的" */
  const origFetch = global.fetch;
  global.fetch = () => Promise.reject(new Error('offline'));
  store['kx_cloud_usage_v1'] = JSON.stringify({ [day]:{ racing:900 } });
  store['kx_usage_v1'] = JSON.stringify({ [day]:{ racing:0 } });
  const off = await C.getUsage();
  check('离线时其它设备按 0 计（不误扣额度）', off.others.racing === 0);
  check('离线状态如实标记', off.offline === true && C.online() === false);
  global.fetch = origFetch;

  if (failures) { console.log('失败 ' + failures + ' 项'); process.exit(1); }
  console.log('云端同步冒烟测试全部通过');
  process.exit(0);
})().catch(e => { console.log('FAIL 异常: ' + e.stack); process.exit(1); });
