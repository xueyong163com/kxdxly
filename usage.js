/* 可心的小乐园 · 六个模块共用使用时长统计
   数据保存在本机 localStorage：kx_usage_v1 = { "YYYY-MM-DD": { 模块: 秒数, ... }, ... }
   只统计页面可见时的时间（赛车可由 setActive 限定为"正在开车"），保留 14 天。
   跨标签页用"增量合并"写入，多个标签同时打开不会互相覆盖。 */
(function(){
  'use strict';
  var KEY = 'kx_usage_v1';
  var MODS = ['poems','english','quiz','racing','nursery','math','story'];
  var seg = String(location.pathname||'').split('/').filter(Boolean)[0] || '';
  var module = MODS.indexOf(seg) >= 0 ? seg : '';   /* 主页不计时 */
  var activeFn = null, pending = 0, started = !!module;

  function dateStr(d){
    d = d || new Date();
    return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
  }
  function readAll(){
    try{
      var v = JSON.parse(localStorage.getItem(KEY)||'null');
      if(v && typeof v==='object' && !Array.isArray(v)) return v;
    }catch(e){}
    return {};
  }
  function saveAll(o){ try{ localStorage.setItem(KEY, JSON.stringify(o)); }catch(e){} }
  function flush(){
    if(!module || pending <= 0) return;
    var all = readAll(), d = dateStr();
    if(!all[d] || typeof all[d]!=='object') all[d] = {};
    all[d][module] = Math.round((Number(all[d][module])||0) + pending);
    pending = 0;
    var ks = Object.keys(all).sort();
    while(ks.length > 14) delete all[ks.shift()];
    saveAll(all);
  }
  function tick(sec){
    if(!module || !started) return;
    if(document.hidden || document.visibilityState === 'hidden') return;
    if(activeFn){ try{ if(!activeFn()) return; }catch(e){ return; } }
    pending += (typeof sec === 'number' ? sec : 1);
  }
  function range(n){
    n = n || 7;
    var all = readAll(), out = [];
    for(var i=n-1;i>=0;i--){
      var d = new Date(); d.setDate(d.getDate()-i);
      var k = dateStr(d);
      out.push({date:k, mods:all[k] && typeof all[k]==='object' ? all[k] : {}});
    }
    return out;
  }
  /* 把"本设备当天累计值"覆盖式上报云端；云端按 日期+模块+设备 存一行，
     管理端按模块求和 = 所有终端的合计。重复上报只会覆盖自己那行，不会重复计数。 */
  function reportAll(){
    if(!window.KX_CLOUD) return;
    var d = dateStr(), day = readAll()[d] || {};
    KX_CLOUD.MODS.forEach(function(m){
      var sec = Number(day[m]) || 0;
      if(sec > 0) KX_CLOUD.report(m, sec);
    });
  }
  if(module){
    setInterval(function(){ tick(1); }, 1000);
    setInterval(flush, 5000);
    setInterval(reportAll, 20000);
    document.addEventListener('visibilitychange', function(){ if(document.hidden){ flush(); reportAll(); } });
    window.addEventListener('pagehide', function(){ flush(); reportAll(); });
    window.addEventListener('beforeunload', flush);
  }
  window.KX_USAGE = {
    KEY:KEY, MODS:MODS,
    module:function(){ return module; },
    setActive:function(fn){ activeFn = fn; },
    tick:tick, flush:flush, readAll:readAll, range:range, reportAll:reportAll,
    today:function(){ return dateStr(); },
    day:function(d){ var a=readAll(); return a[d||dateStr()]||{}; }
  };
})();
