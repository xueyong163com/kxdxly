/* 可心的小乐园 · 家长控制台（从主页右上角"家长设置"按钮进入，无需单独地址）
   密码保存在本机 kx_parent_pin；统计读 kx_usage_v1；赛车限时读写 kx_racing_tc_cfg / kx_racing_tc_use。 */
(function(){
  'use strict';
  if(window.KX_ADMIN_PANEL) return;
  var CFG_KEY='kx_racing_tc_cfg', USE_KEY='kx_racing_tc_use', PIN_KEY='kx_parent_pin', UKEY='kx_usage_v1';
  var MODULES=[
    {k:'poems',   n:'学诗词', c:'#C4543F'},
    {k:'english', n:'学英语', c:'#3E7F96'},
    {k:'quiz',    n:'学知识', c:'#B96A3E'},
    {k:'racing',  n:'开赛车', c:'#4C8560'},
    {k:'nursery', n:'学儿歌', c:'#A3843C'},
    {k:'math',    n:'学数学', c:'#7A5FA8'},
    {k:'story',   n:'听故事', c:'#C76B9E'}
  ];
  var CSS=''
  +'#kxMask{position:fixed;inset:0;z-index:200;background:rgba(47,59,51,.48);backdrop-filter:blur(3px);'
  +'display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;-webkit-overflow-scrolling:touch;'
  +'padding:26px 14px calc(26px + env(safe-area-inset-bottom))}'
  +'#kxMask.kx-hide,#kxMask .kx-hide{display:none!important}'
  +'.kx-box{position:relative;width:100%;max-width:340px;background:var(--card,#FFFDF6);'
  +'border:2.5px solid var(--ink,#2F3B33);border-radius:22px;padding:22px 18px 20px;text-align:center;'
  +'box-shadow:5px 7px 0 rgba(47,59,51,.2);margin:auto}'
  +'.kx-box.kx-wide{max-width:480px;text-align:left}'
  +'.kx-x{position:absolute;right:10px;top:9px;width:30px;height:30px;border:2px solid var(--line,#E7D9BC);'
  +'background:var(--paper,#FBF6EA);border-radius:10px;font-size:18px;line-height:1;color:var(--soft,#6B7568);cursor:pointer}'
  +'.kx-seal{width:44px;height:44px;margin:0 auto 8px;border:2px solid #3E7C8C;border-radius:12px;color:#3E7C8C;'
  +'font-family:var(--kai,KaiTi,serif);font-size:26px;line-height:40px;transform:rotate(-6deg)}'
  +'.kx-box h2{font-family:var(--kai,KaiTi,serif);font-size:23px;letter-spacing:2px;margin:0 0 6px;color:var(--ink,#2F3B33)}'
  +'.kx-box h3{font-family:var(--kai,KaiTi,serif);font-size:16px;letter-spacing:1.5px;margin:0 0 10px;'
  +'display:flex;align-items:center;gap:7px;color:var(--ink,#2F3B33)}'
  +'.kx-box h3 i{width:8px;height:8px;border-radius:50%;background:#3E7C8C;flex:none}'
  +'.kx-sub,.kx-mut{font-size:12px;color:var(--faint,#98A095);margin:0 0 13px;line-height:1.7}'
  +'.kx-pin{display:block;width:170px;margin:0 auto 10px;text-align:center;font-family:var(--kai,KaiTi,serif);'
  +'font-size:25px;letter-spacing:8px;padding:8px 10px;border:2px solid var(--line,#E7D9BC);border-radius:13px;'
  +'background:var(--paper,#FBF6EA);color:var(--ink,#2F3B33);outline:none;'
  +'-webkit-user-select:text;user-select:text}'
  +'.kx-pin:focus{border-color:#3E7C8C}'
  +'.kx-btn{border:none;border-radius:13px;padding:11px 24px;background:#3E7C8C;color:#fff;font-size:15px;'
  +'font-weight:700;letter-spacing:2px;cursor:pointer;font-family:inherit;box-shadow:0 3px 0 #2E5F6C}'
  +'.kx-btn:active{transform:translateY(2px);box-shadow:0 1px 0 #2E5F6C}'
  +'.kx-btn:disabled{opacity:.5}'
  +'.kx-btn.kx-ghost{background:var(--card,#FFFDF6);color:var(--ink,#2F3B33);'
  +'border:2px solid var(--line,#E7D9BC);box-shadow:0 2px 0 var(--line,#E7D9BC)}'
  +'.kx-err{min-height:20px;font-size:12.5px;color:#B2554A;margin-top:9px}'
  +'.kx-reset{margin-top:4px}'
  +'.kx-reset button{background:none;border:none;color:var(--faint,#98A095);font-size:11.5px;'
  +'text-decoration:underline;cursor:pointer;font-family:inherit;padding:6px}'
  +'.kx-card{background:var(--paper,#FBF6EA);border:2px solid var(--line,#E7D9BC);border-radius:16px;'
  +'padding:13px 14px;margin-top:12px}'
  +'.kx-total{font-family:var(--kai,KaiTi,serif);font-size:32px;color:#3E7C8C;line-height:1}'
  +'.kx-unit{font-size:12px;color:var(--soft,#6B7568);margin-left:6px}'
  +'.kx-row{display:flex;align-items:center;gap:8px;margin-top:9px;font-size:12.5px}'
  +'.kx-row .nm{width:56px;flex:none;color:var(--ink,#2F3B33)}'
  +'.kx-row .bar{flex:1;height:11px;background:#FFFDF6;border:1.5px solid var(--line,#E7D9BC);'
  +'border-radius:7px;overflow:hidden}'
  +'.kx-row .bar i{display:block;height:100%;border-radius:7px}'
  +'.kx-row .v{width:58px;flex:none;text-align:right;color:var(--soft,#6B7568)}'
  +'.kx-chips{display:flex;flex-wrap:wrap;gap:6px}'
  +'.kx-chip{font-size:11px;padding:4px 10px;border-radius:20px;border:1.5px solid var(--line,#E7D9BC);'
  +'background:#FFFDF6;color:var(--soft,#6B7568)}'
  +'.kx-chip b{color:var(--ink,#2F3B33);font-size:13px}'
  +'.kx-chart{display:flex;align-items:flex-end;gap:7px;height:100px;margin-top:6px}'
  +'.kx-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}'
  +'.kx-col .v{font-size:10px;color:var(--faint,#98A095);margin-bottom:2px}'
  +'.kx-col .st{width:100%;max-width:36px;background:linear-gradient(180deg,#8FBF9F,#4C8560);'
  +'border-radius:6px 6px 3px 3px;min-height:3px}'
  +'.kx-col .st.td{background:linear-gradient(180deg,#F2C14E,#C9992A)}'
  +'.kx-col .d{font-size:10px;color:var(--faint,#98A095);margin-top:4px;white-space:nowrap}'
  +'.kx-limits{display:flex;flex-wrap:wrap;gap:7px}'
  +'.kx-limit{border:2px solid var(--line,#E7D9BC);background:#FFFDF6;color:var(--ink,#2F3B33);'
  +'border-radius:12px;padding:7px 11px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}'
  +'.kx-limit.on{border-color:#3E7C8C;background:#E4F0F2;color:#3E7C8C}'
  +'.kx-ops{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:11px}'
  +'.kx-ops .kx-op:first-child{grid-column:1/-1}'
  +'.kx-op{border:2px solid var(--line,#E7D9BC);background:#FFFDF6;border-radius:12px;padding:10px 7px;'
  +'font-size:13px;font-weight:600;color:var(--ink,#2F3B33);cursor:pointer;font-family:inherit;line-height:1.35}'
  +'.kx-op small{display:block;font-size:10.5px;color:var(--faint,#98A095);font-weight:400;margin-top:2px}'
  +'.kx-op.warn{border-color:#E0B7AD;color:#B2554A;background:#F9EFEA}'
  +'.kx-tips{margin:8px 0 0;padding-left:18px;font-size:12px;line-height:1.9;color:var(--soft,#6B7568)}'
  +'.kx-tips b{color:var(--ink,#2F3B33)}'
  +'.kx-toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%) translateY(20px);'
  +'background:var(--ink,#2F3B33);color:#FFFDF6;font-size:13px;padding:9px 18px;border-radius:999px;'
  +'opacity:0;transition:.25s;pointer-events:none;z-index:210}'
  +'.kx-toast.show{opacity:.95;transform:translateX(-50%) translateY(0)}';

  var HTML=''
  +'<div id="kxMask" class="kx-hide">'
  +' <div class="kx-box" id="kxGate">'
  +'  <button class="kx-x" data-close aria-label="关闭">×</button>'
  +'  <div class="kx-seal">管</div>'
  +'  <h2 id="kxGateTitle">家长验证</h2>'
  +'  <p class="kx-sub" id="kxGateDesc">请输入 4 位数字密码</p>'
  +'  <input class="kx-pin" id="kxP1" type="tel" inputmode="numeric" maxlength="4" placeholder="····" autocomplete="off">'
  +'  <input class="kx-pin kx-hide" id="kxP2" type="tel" inputmode="numeric" maxlength="4" placeholder="再输一遍" autocomplete="off">'
  +'  <button class="kx-btn" id="kxGo">进入</button>'
  +'  <div class="kx-err" id="kxErr"></div>'
  +'  <div class="kx-reset kx-hide" id="kxResetRow"><button id="kxReset">忘记密码？按住 2 秒重置</button></div>'
  +' </div>'
  +' <div class="kx-box kx-wide kx-hide" id="kxMain">'
  +'  <button class="kx-x" data-close aria-label="关闭">×</button>'
  +'  <h2>家长控制台</h2>'
  +'  <p class="kx-sub" id="kxDate"></p>'
  +'  <div class="kx-card"><h3><i></i>今天玩了多久</h3>'
  +'   <div id="kxTodayTotal" class="kx-total">0<span class="kx-unit">分钟（六个地方加起来）</span></div>'
  +'   <div id="kxTodayRows"></div></div>'
  +'  <div class="kx-card"><h3><i></i>攒了多少星星</h3><div class="kx-chips" id="kxStars"></div></div>'
  +'  <div class="kx-card"><h3><i></i>最近 7 天</h3><div class="kx-chart" id="kxChart"></div></div>'
  +'  <div class="kx-card"><h3><i></i>赛车时间控制</h3>'
  +'   <p class="kx-mut" id="kxRaceState" style="margin-bottom:9px"></p>'
  +'   <div class="kx-limits" id="kxLimits"></div>'
  +'   <div class="kx-ops">'
  +'    <button class="kx-op" data-op="zero">今日重新计时<small>今天已玩时间清零，并解除锁定</small></button>'
  +'    <button class="kx-op warn" data-op="lock">现在收车<small>立刻锁定，今天不能玩</small></button>'
  +'    <button class="kx-op" data-op="unlock">解除锁定<small>恢复可玩</small></button>'
  +'   </div></div>'
  +'  <div class="kx-card"><h3><i></i>说明</h3><ul class="kx-tips">'
  +'   <li>配置和时长存在<b>云端</b>，所有手机、平板共用一份；统计是<b>所有设备加起来的合计</b>。一台设备设了每天 10 分钟，换任何设备都照样生效。</li>'
  +'   <li>页面每 15 秒同步一次，刚打开时也会立即拉一次；断网时先按本机记录继续，恢复后自动补上。</li>'
  +'   <li>时长从<b>本次上线后</b>开始记录，只算页面在屏幕前打开的时间；赛车只算<b>真正在开车</b>的时间。</li>'
  +'   <li>目前只有<b>赛车支持限时和锁定</b>，其它五个模块只做统计；到点后赛车会出现"休息时间"画面，第二天自动恢复。</li>'
  +'   <li>每次打开本页都要重新输密码；密码只存<b>本机</b>，每台设备首次进入时各设一次；连续错 3 次需等 1 分钟，之后可长按重置密码。</li>'
  +'  </ul></div>'
  +'  <div style="text-align:center;margin-top:14px"><button class="kx-btn kx-ghost" data-close>关闭</button></div>'
  +' </div>'
  +'</div>'
  +'<div class="kx-toast" id="kxToast"></div>';

  /* ---------- 小工具 ---------- */
  function $(id){ return document.getElementById(id); }
  function today(d){ d=d||new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  function jget(k,d){ try{ var v=JSON.parse(localStorage.getItem(k)); return v==null?d:v; }catch(e){ return d; } }
  function jset(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){ toast('保存失败：浏览器存储不可用'); } }
  function countOf(k){ var v=jget(k,{}),n=0; for(var x in v){ if(Object.prototype.hasOwnProperty.call(v,x)) n++; } return n; }
  function sumOf(k){ var v=jget(k,{}),n=0; for(var x in v){ var t=Number(v[x]); if(!isNaN(t)) n+=t; } return n; }
  function lenOf(k){ var v=jget(k,[]); return (v&&v.length)||0; }
  function getCfg(){ var c=jget(CFG_KEY,{on:false,min:15}); return {on:!!c.on,min:Number(c.min)||0}; }
  function getUse(){
    var u=jget(USE_KEY,null);
    if(!u||typeof u!=='object'||u.d!==today()) u={d:today(),used:0,lock:'',hist:(u&&u.hist&&typeof u.hist==='object')?u.hist:{}};
    if(typeof u.used!=='number') u.used=0;
    if(typeof u.lock!=='string') u.lock='';
    return u;
  }
  function toast(msg){ var t=$('kxToast'); if(!t) return; t.textContent=msg; t.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(function(){ t.classList.remove('show'); },1800); }
  function minText(sec){ sec=Math.max(0,Math.round((Number(sec)||0)/60)); return sec; }
  function stars(){
    var rp=jget('kexin_racing_progress_v2',{});
    return [
      {n:'诗词',v:countOf('xiaoerduo_stars_v2')+lenOf('kexin_poem_game_chars_v1')},
      {n:'英语',v:countOf('kexin_english_stars_v1')+lenOf('kexin_eng_game_words_v1')},
      {n:'儿歌',v:countOf('kexin_nursery_stars_v1')},
      {n:'知识',v:sumOf('kexin_quiz_stars_v3')},
      {n:'赛车',v:(rp&&rp.best)?Object.keys(rp.best).length:0},
      {n:'数学',v:countOf('kexin_math_stars_v1')}
    ];
  }

  /* ---------- 渲染（云端的"所有设备合计"为准，断网时显示本机缓存） ---------- */
  var cloudRange=null, cloudCfg=null, cloudOnline=false;
  function refresh(){
    if(!window.KX_CLOUD){ cloudOnline=false; render(); return; }
    KX_CLOUD.getConfig().then(function(cfg){
      cloudCfg=cfg;
      return KX_CLOUD.getRange(7);
    }).then(function(range){
      cloudRange=range||{}; cloudOnline=KX_CLOUD.online(); render();
    }).catch(function(){ cloudOnline=false; render(); });
  }
  function render(){
    var all=cloudRange||jget(UKEY,{}), td=all[today()]||{};
    var maxSec=60;
    MODULES.forEach(function(m){ if((Number(td[m.k])||0)>maxSec) maxSec=Number(td[m.k])||0; });
    var totalSec=MODULES.reduce(function(s,m){ return s+(Number(td[m.k])||0); },0);
    $('kxTodayTotal').innerHTML=minText(totalSec)+'<span class="kx-unit">分钟（六个地方加起来）</span>';
    $('kxTodayRows').innerHTML=MODULES.map(function(m){
      var sec=Number(td[m.k])||0;
      return '<div class="kx-row"><span class="nm">'+m.n+'</span>'
        +'<span class="bar"><i style="width:'+Math.round(sec/maxSec*100)+'%;background:'+m.c+'"></i></span>'
        +'<span class="v">'+minText(sec)+' 分钟</span></div>';
    }).join('');
    $('kxStars').innerHTML=stars().map(function(p){ return '<span class="kx-chip">'+p.n+' <b>'+p.v+'</b></span>'; }).join('');
    var days=[];
    for(var i=6;i>=0;i--){ var d=new Date(); d.setDate(d.getDate()-i); var k=today(d); days.push({k:k,mods:(all[k]&&typeof all[k]==='object')?all[k]:{},td:i===0}); }
    var dmax=60;
    days.forEach(function(x){ var s=0; MODULES.forEach(function(m){ s+=Number(x.mods[m.k])||0; }); x.sec=s; if(s>dmax) dmax=s; });
    $('kxChart').innerHTML=days.map(function(x){
      var h=Math.round(Math.max(x.sec>0?6:2,x.sec/dmax*76));
      return '<div class="kx-col"><div class="v">'+(x.sec>0?minText(x.sec)+'分':'')+'</div>'
        +'<div class="st'+(x.td?' td':'')+'" style="height:'+h+'px"></div>'
        +'<div class="d">'+(x.td?'今天':x.k.slice(5).replace('-','/'))+'</div></div>';
    }).join('');
    var d2=new Date();
    $('kxDate').textContent='今天是 '+d2.getFullYear()+' 年 '+(d2.getMonth()+1)+' 月 '+d2.getDate()+' 日 · '
      +(cloudOnline?'已同步云端，所有设备合计':'当前离线，显示本机记录');
    renderRace();
  }
  function renderRace(){
    var c=cloudCfg||getCfg();
    var td=(cloudRange&&cloudRange[today()])||{};
    var used=Number(td.racing)||Number(getUse().used)||0;
    var txt='今天所有设备一共开车 '+minText(used)+' 分钟';
    if(c.on&&c.min>0){
      var rem=c.min*60-used;
      txt+=' · 每天上限 '+c.min+' 分钟';
      txt+=rem<=0?' · 今天的额度已用完':' · 还能玩 '+minText(rem)+' 分钟';
    }else txt+=' · 目前不限制时间';
    if(c.lock&&c.lock>=today()) txt+=' · 今天已手动锁定（点「解除锁定」或「今日重新计时」恢复）';
    else if(c.on&&c.min>0&&rem<=0) txt+=' · 额度已用完（点「今日重新计时」恢复）';
    $('kxRaceState').textContent=txt;
    var opts=[10,15,20,30,45,-1];
    $('kxLimits').innerHTML=opts.map(function(m){
      var on=(m===-1)?!(c.on&&c.min>0):(c.on&&c.min===m);
      return '<button class="kx-limit'+(on?' on':'')+'" data-min="'+m+'">'+(m===-1?'不限制':m+' 分钟')+'</button>';
    }).join('');
  }

  /* ---------- 门禁 ---------- */
  var fails=0, coolUntil=0, coolT=0, setupMode=false;
  function open(){
    clearInterval(coolT);
    $('kxMask').classList.remove('kx-hide');
    $('kxMain').classList.add('kx-hide');
    $('kxGate').classList.remove('kx-hide');
    $('kxP1').value=''; $('kxP2').value=''; $('kxErr').textContent='';
    $('kxGo').disabled=false; $('kxP1').disabled=false;
    $('kxResetRow').classList.add('kx-hide');
    var pin=''; try{ pin=localStorage.getItem(PIN_KEY)||''; }catch(e){}
    setupMode=!pin;
    $('kxGateTitle').textContent=setupMode?'设置家长密码':'家长验证';
    $('kxGateDesc').textContent=setupMode?'第一次使用，请设置 4 位数字密码（只存本机）':'请输入 4 位数字密码';
    $('kxP2').classList.toggle('kx-hide',!setupMode);
    $('kxGo').textContent=setupMode?'保存并进入':'进入';
    try{ $('kxP1').focus(); }catch(e){}
  }
  function close(){ $('kxMask').classList.add('kx-hide'); clearInterval(coolT); }
  function go(){
    if(coolUntil>Date.now()) return;
    var a=($('kxP1').value||'').trim();
    if(setupMode){
      var b=($('kxP2').value||'').trim();
      if(!/^\d{4}$/.test(a)){ $('kxErr').textContent='请输入 4 位数字'; return; }
      if(a!==b){ $('kxErr').textContent='两次输入的不一样，再试一次'; return; }
      try{ localStorage.setItem(PIN_KEY,a); }catch(e){ toast('保存失败：浏览器存储不可用'); return; }
      setupMode=false;
      showMain();
      return;
    }
    var saved=''; try{ saved=localStorage.getItem(PIN_KEY)||''; }catch(e){}
    if(a&&a===saved){ fails=0; showMain(); return; }
    fails++; $('kxP1').value='';
    if(fails>=3){
      coolUntil=Date.now()+60000;
      coolT=setInterval(function(){
        var left=Math.ceil((coolUntil-Date.now())/1000);
        if(left<=0){ clearInterval(coolT); $('kxErr').textContent=''; $('kxGo').disabled=false; $('kxP1').disabled=false; $('kxResetRow').classList.remove('kx-hide'); return; }
        $('kxErr').textContent='错得有点多，请等 '+left+' 秒再试';
        $('kxGo').disabled=true; $('kxP1').disabled=true;
      },250);
    }else $('kxErr').textContent='密码不对，再想想（错 '+fails+' 次）';
  }
  function showMain(){ $('kxGate').classList.add('kx-hide'); $('kxMain').classList.remove('kx-hide'); render(); refresh(); }

  /* ---------- 事件 ---------- */
  function bind(){
    var btn=document.getElementById('parentBtn');
    if(btn) btn.addEventListener('click',open);
    $('kxGo').addEventListener('click',go);
    $('kxP1').addEventListener('keydown',function(e){ if(e.key==='Enter') go(); });
    $('kxP2').addEventListener('keydown',function(e){ if(e.key==='Enter') go(); });
    Array.prototype.forEach.call(document.querySelectorAll('#kxMask [data-close]'),function(b){ b.addEventListener('click',close); });
    $('kxMask').addEventListener('click',function(e){ if(e.target===$('kxMask')) close(); });
    $('kxLimits').addEventListener('click',function(e){
      var b=e.target.closest?e.target.closest('.kx-limit'):null;
      if(!b) return;
      var m=Number(b.getAttribute('data-min'));
      var patch=m===-1?{on:false,min:0}:{on:true,min:m};
      var msg=m===-1?'已设置：不限制时间':'已设置：每天 '+m+' 分钟';
      if(window.KX_CLOUD){
        KX_CLOUD.setConfig(patch).then(function(cfg){
          if(!cfg){ toast('没连上云端，请检查网络后重试'); return; }
          cloudCfg=cfg; renderRace(); toast(msg+'（所有设备生效）');
        });
        return;
      }
      jset(CFG_KEY,patch); renderRace(); toast(msg);
    });
    $('kxMain').addEventListener('click',function(e){
      var b=e.target.closest?e.target.closest('[data-op]'):null;
      if(!b) return;
      var op=b.getAttribute('data-op');
      if(window.KX_CLOUD){
        var p, msg;
        if(op==='zero'){
          p=KX_CLOUD.resetToday('racing').then(function(c){
            return c ? KX_CLOUD.setConfig({lock:''}) : null;   /* 清零同时解锁 */
          });
          msg='已清零并解锁，所有设备都能重新玩';
        }
        else if(op==='lock'){ p=KX_CLOUD.setConfig({lock:today()}); msg='已锁定，所有设备今天都不能玩赛车'; }
        else if(op==='unlock'){ p=KX_CLOUD.setConfig({lock:''}); msg='已解除今天的锁定'; }
        else return;
        p.then(function(cfg){
          if(!cfg){ toast('没连上云端，请检查网络后重试'); return; }
          cloudCfg=cfg; toast(msg); refresh();
        });
        return;
      }
      var u=getUse();
      if(op==='zero'){ u.used=0; u.lock=''; toast('今天的开车时间已清零，并解除锁定'); }
      else if(op==='lock'){ u.lock=today(); toast('已锁定，今天不能玩赛车'); }
      else if(op==='unlock'){ u.lock=''; toast('已解除今天的锁定'); }
      else return;
      jset(USE_KEY,u); renderRace();
    });
    /* 长按 2 秒重置密码 */
    (function(){
      var t=0, r=$('kxReset');
      function start(e){ e.preventDefault(); r.textContent='松手前再想想…继续按住'; t=setTimeout(function(){
        try{ localStorage.removeItem(PIN_KEY); }catch(err){}
        fails=0; coolUntil=0; r.textContent='忘记密码？按住 2 秒重置';
        open(); toast('密码已重置，请重新设置');
      },2000); }
      function cancel(){ clearTimeout(t); r.textContent='忘记密码？按住 2 秒重置'; }
      r.addEventListener('touchstart',start,{passive:false});
      r.addEventListener('touchend',cancel); r.addEventListener('touchcancel',cancel);
      r.addEventListener('mousedown',start); r.addEventListener('mouseup',cancel); r.addEventListener('mouseleave',cancel);
    })();
  }

  /* ---------- 挂载 ---------- */
  function mount(){
    var st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);
    var box=document.createElement('div'); box.innerHTML=HTML;
    while(box.firstChild) document.body.appendChild(box.firstChild);
    bind();
    window.KX_ADMIN_PANEL={open:open,close:close,render:render,go:go,info:function(){ return {setupMode:setupMode,fails:fails}; }};
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();
