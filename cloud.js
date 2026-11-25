/* 可心的小乐园 · 家庭云端同步
   配置与每日时长存在 CloudBase PostgreSQL，所有手机/平板共用一份。
   本文件里的 publishableKey 是公开的 anon 身份标识，只能读写下面两张家庭表。
   网络不可用时退回本机缓存，并通过 online() 如实标记，绝不假装已同步。 */
(function(){
  'use strict';
  var ENV  = 'western-hoverfly-d2e1rst4e6d0a01';
  var KEY  = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjM2NDM3OGJjLWZiZDMtNGUzYy05NWI4LTlmNzVkYjZmNjNjNiJ9.eyJpc3MiOiJodHRwczovL3dlc3Rlcm4taG92ZXJmbHktZDJlMXJzdDRlNmQwYTAxLmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJ3ZXN0ZXJuLWhvdmVyZmx5LWQyZTFyc3Q0ZTZkMGEwMSIsImV4cCI6NDA5Nzc0MDM5NCwiaWF0IjoxNzk0MDU3MTk0LCJub25jZSI6InNUcGZDaGJMUjFxdExjbEhobUpWUFEiLCJhdF9oYXNoIjoic1RwZkNoYkxSMXF0TGNsSGhtSlZQUSIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJ3ZXN0ZXJuLWhvdmVyZmx5LWQyZTFyc3Q0ZTZkMGEwMSIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.o1dvklS7s_AnUKy2Q_ZZnmBYRIX5BJJ-lpsxIgGlhUDfaPhixEA1fT_fyr721-N4fsw7MxLyxfxenZhLxk1dgXoYF1-puqmnkOoQFAZX9cgx_g_JLuv0HqVbrkTKnWp_wnsb2WKfD28W4aoHu8OZXZsRTEQ1G20jQUe-Nkz09igkZPDJU5zQe_EYV7UKJJJIjSWsKEXhW82PFwbHUtxyNlq18v2EKAOpDTlZA4eOOd-AhSLpUjqOwJrXpOtMBYktm3AP1FbeQOCiux1T_MbkUZjb30GUfJ8ZArS9uqQ8mgizk68TE2Vj7MwBUoRlAjRNSU9E43hFBNYsOe9bqwx8dA';
  var BASE = 'https://' + ENV + '.api.tcloudbasegateway.com/v1/rdb/rest/';
  var T_CFG = 'kx_family_config', T_USE = 'kx_usage_daily';
  var MODS = ['poems','english','quiz','racing','nursery','math','story'];
  /* 已取消"临时加 5 分钟"：不再有 bonus 字段，旧云端配置里的残留会被 normalize 丢弃 */
  var DEF  = {on:false, min:15, lock:'', reset_seq:0};
  var K = {device:'kx_device_id', cfg:'kx_cloud_cfg_v1', usage:'kx_cloud_usage_v1',
           seq:'kx_cloud_seq_v1', local:'kx_usage_v1', tc:'kx_racing_tc_use'};
  var _online = false, _cfg = null, _others = {}, _day = '';

  function get(k, d){ try{ var v=localStorage.getItem(k); return v==null?d:v; }catch(e){ return d; } }
  function set(k, v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function jget(k,d){ try{ var v=JSON.parse(get(k,'null')); return v==null?d:v; }catch(e){ return d; } }
  function jset(k,v){ set(k,JSON.stringify(v)); }
  function dstr(back){
    var d=new Date(); if(back) d.setDate(d.getDate()+back);
    return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
  }
  function today(){ return dstr(0); }
  var DEVICE = (function(){
    var d=get(K.device,'');
    if(!d){ d='d'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); set(K.device,d); }
    return d;
  })();
  function normalize(c){
    var o={}; for(var k in DEF) o[k]=DEF[k];
    if(c&&typeof c==='object') for(var p in DEF) if(c[p]!==undefined) o[p]=c[p];
    o.min=Number(o.min)||0; o.reset_seq=Number(o.reset_seq)||0;
    o.on=!!o.on; o.lock=String(o.lock||'');
    return o;
  }

  function req(path, method, body, extra){
    var h={'Authorization':'Bearer '+KEY,'Content-Type':'application/json','Accept':'application/json'};
    if(extra) for(var k in extra) h[k]=extra[k];
    var opt={method:method||'GET',headers:h,cache:'no-store'};
    if(body!==undefined) opt.body=JSON.stringify(body);
    var ctrl=null, timer=0;
    try{
      if(typeof AbortController!=='undefined'){
        ctrl=new AbortController(); opt.signal=ctrl.signal;
        timer=setTimeout(function(){ try{ ctrl.abort(); }catch(e){} },6000);
      }
    }catch(e){}
    return fetch(BASE+path,opt).then(function(r){
      clearTimeout(timer);
      if(!r.ok) return r.text().then(function(t){ throw new Error('HTTP '+r.status+' '+String(t).slice(0,140)); });
      if(r.status===204) return null;
      return r.json().catch(function(){ return null; });
    }).catch(function(e){ clearTimeout(timer); throw e; });
  }

  function getConfig(){
    return req(T_CFG+'?id=eq.main&select=cfg,updated_at').then(function(rows){
      _cfg=normalize(rows&&rows[0]&&rows[0].cfg);
      jset(K.cfg,_cfg); _online=true; return _cfg;
    }).catch(function(){
      _online=false; _cfg=normalize(jget(K.cfg,DEF)); return _cfg;
    });
  }
  function setConfig(patch){
    return getConfig().then(function(cur){
      var c={}; for(var k in cur) c[k]=cur[k];
      for(var p in patch) c[p]=patch[p];
      c=normalize(c);
      return req(T_CFG,'POST',
        {id:'main',cfg:c,updated_at:new Date().toISOString()},
        {'Prefer':'resolution=merge-duplicates,return=minimal'})
        .then(function(){ _cfg=c; jset(K.cfg,c); _online=true; return c; })
        .catch(function(){ _online=false; return null; });
    });
  }
  function localSec(day, mod){
    var all=jget(K.local,{}); return Number((all[day]||{})[mod])||0;
  }
  function getUsage(day){
    day=day||today();
    return req(T_USE+'?day=eq.'+encodeURIComponent(day)+'&select=module,device,sec').then(function(rows){
      var by={}, mine={};
      (rows||[]).forEach(function(r){
        var s=Number(r.sec)||0, m=r.module;
        by[m]=(by[m]||0)+s;
        if(r.device===DEVICE) mine[m]=(mine[m]||0)+s;
      });
      var others={};
      MODS.forEach(function(m){ others[m]=Math.max(0,(by[m]||0)-(mine[m]||0)); });
      var cache=jget(K.usage,{}); cache[day]=by;
      var keys=Object.keys(cache).sort(); while(keys.length>20) delete cache[keys.shift()];
      jset(K.usage,cache);
      _others=others; _day=day; _online=true;
      return {day:day,by:by,mine:mine,others:others,offline:false};
    }).catch(function(){
      _online=false;
      var cache=jget(K.usage,{}), by=cache[day]||{}, others={};
      /* 离线时不再用「缓存合计 - 本机累计」猜其它设备：家长清零后本机累计变 0，
         缓存里的旧合计会被误算成别人玩的，凭空扣光额度（表现为 0 分钟却锁住）。
         保守做法：其它设备按 0 计，本机时长仍实时累计，宁可少扣也不误锁。 */
      MODS.forEach(function(m){ others[m]=0; });
      _others=others; _day=day;
      return {day:day,by:by,mine:{},others:others,offline:true};
    });
  }
  function getRange(n){
    n=n||7; var start=dstr(-(n-1));
    return req(T_USE+'?day=gte.'+start+'&select=day,module,sec').then(function(rows){
      var out={};
      (rows||[]).forEach(function(r){
        if(!out[r.day]) out[r.day]={};
        out[r.day][r.module]=(out[r.day][r.module]||0)+(Number(r.sec)||0);
      });
      _online=true; return out;
    }).catch(function(){ _online=false; return jget(K.usage,{}); });
  }
  function report(mod, sec){
    var day=today();
    return req(T_USE,'POST',
      {day:day,module:mod,device:DEVICE,sec:Math.max(0,Math.round(Number(sec)||0)),updated_at:new Date().toISOString()},
      {'Prefer':'resolution=merge-duplicates,return=minimal'})
      .then(function(){ _online=true; return true; })
      .catch(function(){ _online=false; return false; });
  }
  function resetToday(mod){
    var q=T_USE+'?day=eq.'+encodeURIComponent(today())+(mod?'&module=eq.'+mod:'');
    return req(q,'DELETE',undefined,{'Prefer':'return=minimal'}).then(function(){
      _online=true;
      return getConfig().then(function(c){ return setConfig({reset_seq:(Number(c.reset_seq)||0)+1}); });
    }).catch(function(){ _online=false; return null; });
  }
  /* 家长清零后，各设备把本机今日累计归零，避免下次上报把旧值写回去 */
  function checkReset(cfg){
    var seq=Number(cfg&&cfg.reset_seq)||0;
    var mine=Number(get(K.seq,'0'))||0;
    if(seq===mine) return false;
    try{
      var day=today(), all=jget(K.local,{});
      if(all[day]){ all[day].racing=0; jset(K.local,all); }
      var u=jget(K.tc,null);
      if(u&&u.d===day){ u.used=0; jset(K.tc,u); }
      set(K.seq,String(seq));
    }catch(e){}
    return true;
  }
  function others(mod){ return (_day===today()) ? (_others[mod]||0) : 0; }
  function sync(){
    return getConfig().then(function(cfg){
      return getUsage(today()).then(function(u){
        return {cfg:cfg,usage:u,online:_online,reset:checkReset(cfg)};
      });
    });
  }

  window.KX_CLOUD={
    MODS:MODS, device:function(){ return DEVICE; }, today:today,
    online:function(){ return _online; },
    getConfig:getConfig, setConfig:setConfig, getUsage:getUsage, getRange:getRange,
    report:report, resetToday:resetToday, sync:sync, others:others, checkReset:checkReset,
    config:function(){ return _cfg||normalize(jget(K.cfg,DEF)); },
    _keys:K
  };

  /* 启动拉一次；页面在前台时每 15 秒同步一次 */
  sync();
  setInterval(function(){ if(!document.hidden) sync(); },15000);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) sync(); });
})();
