/* 可心的小乐园 · 六页共用的趣味层
   1) 连对彩蛋：连续答对/点对 3 次，撒彩纸 + 表扬语音 + 上行叮咚
   2) 每日惊喜：页面开着时随机冒出一只小动物，点中撒彩纸、听表扬，每天一次
   独立于任何页面逻辑，页面只需引入本文件；答对处调 KX_FUN.hit(true)，答错调 hit(false)。 */
(function(){
  'use strict';
  if(window.KX_FUN) return;
  var KEY='kx_fun_v1';
  var ANIMALS=[
    {n:'小兔子',c:'#F5B8C8',s:'<ellipse cx="19" cy="14" rx="6.5" ry="13" fill="#F5B8C8" stroke="#B2554A" stroke-width="2"/><ellipse cx="35" cy="14" rx="6.5" ry="13" fill="#F5B8C8" stroke="#B2554A" stroke-width="2"/><circle cx="27" cy="36" r="19" fill="#F5B8C8" stroke="#B2554A" stroke-width="2"/><circle cx="20.5" cy="33" r="2.3" fill="#5A3A44"/><circle cx="33.5" cy="33" r="2.3" fill="#5A3A44"/><circle cx="27" cy="38.5" r="1.6" fill="#D96A8E"/>'},
    {n:'小黄鸭',c:'#F7D354',s:'<circle cx="27" cy="26" r="13" fill="#F7D354" stroke="#B8912E" stroke-width="2"/><path d="M15 26l-11 3 11 4z" fill="#E8933A" stroke="#B8862E" stroke-width="1.8"/><circle cx="24" cy="23" r="2.4" fill="#4A4238"/><ellipse cx="34" cy="45" rx="18" ry="12" fill="#F7D354" stroke="#B8912E" stroke-width="2"/>'},
    {n:'小青蛙',c:'#8FBC6E',s:'<circle cx="18" cy="20" r="9" fill="#8FBC6E" stroke="#5A8342" stroke-width="2"/><circle cx="36" cy="20" r="9" fill="#8FBC6E" stroke="#5A8342" stroke-width="2"/><circle cx="18" cy="20" r="4" fill="#fff"/><circle cx="36" cy="20" r="4" fill="#fff"/><circle cx="18" cy="21" r="2" fill="#4A4238"/><circle cx="36" cy="21" r="2" fill="#4A4238"/><ellipse cx="27" cy="40" rx="19" ry="14" fill="#8FBC6E" stroke="#5A8342" stroke-width="2"/>'},
    {n:'小熊',c:'#C89858',s:'<circle cx="16" cy="18" r="9" fill="#C89858" stroke="#8A5A2B" stroke-width="2"/><circle cx="38" cy="18" r="9" fill="#C89858" stroke="#8A5A2B" stroke-width="2"/><circle cx="27" cy="36" r="19" fill="#C89858" stroke="#8A5A2B" stroke-width="2"/><ellipse cx="27" cy="41" rx="10" ry="8" fill="#E8C89A"/><circle cx="21" cy="32" r="2.4" fill="#4A4238"/><circle cx="33" cy="32" r="2.4" fill="#4A4238"/><ellipse cx="27" cy="38" rx="3" ry="2.3" fill="#4A4238"/>'},
    {n:'小猫咪',c:'#F2B279',s:'<path d="M13 30L10 10l14 10z" fill="#F2B279" stroke="#8A5A2B" stroke-width="2"/><path d="M41 30l3-20-14 10z" fill="#F2B279" stroke="#8A5A2B" stroke-width="2"/><circle cx="27" cy="34" r="18" fill="#F2B279" stroke="#8A5A2B" stroke-width="2"/><circle cx="21" cy="31" r="2.4" fill="#4A4238"/><circle cx="33" cy="31" r="2.4" fill="#4A4238"/><path d="M24 39q3 3 6 0" stroke="#8A5A2B" stroke-width="1.8" fill="none" stroke-linecap="round"/>'},
    {n:'小狐狸',c:'#E8824A',s:'<path d="M12 12l4 14 9-5z" fill="#E8824A" stroke="#A85428" stroke-width="2"/><path d="M42 12l-4 14-9-5z" fill="#E8824A" stroke="#A85428" stroke-width="2"/><path d="M27 51q-15-3-15-19 0-13 15-13t15 13q0 16-15 19z" fill="#E8824A" stroke="#A85428" stroke-width="2"/><circle cx="21" cy="31" r="2.2" fill="#4A4238"/><circle cx="33" cy="31" r="2.2" fill="#4A4238"/><ellipse cx="27" cy="39" rx="3" ry="2.2" fill="#4A4238"/>'}
  ];
  var SAYS=['哇，被你找到啦！','你好呀，一起来玩吧！','你今天真棒！','送你一片小彩纸！','再玩一会儿吧！'];
  var CSS=''
  +'#kxFunPet{position:fixed;z-index:88;width:62px;height:66px;border:none;background:none;padding:0;cursor:pointer;'
  +'filter:drop-shadow(0 3px 4px rgba(62,90,75,.28));animation:kxPetIn .4s ease,kxPetBob 2.2s .4s ease-in-out infinite;'
  +'-webkit-tap-highlight-color:transparent}'
  +'#kxFunPet svg{width:100%;height:100%}'
  +'#kxFunPet.kx-gone{animation:kxPetOut .35s ease forwards}'
  +'@keyframes kxPetIn{from{transform:scale(.2) translateY(20px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}'
  +'@keyframes kxPetBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}'
  +'@keyframes kxPetOut{to{transform:scale(1.5) translateY(-30px);opacity:0}}'
  +'#kxFunTip{position:fixed;left:50%;top:76px;transform:translateX(-50%) translateY(-12px);z-index:89;'
  +'background:rgba(62,90,75,.94);color:#FFFDF6;font-size:14px;padding:8px 16px;border-radius:999px;'
  +'opacity:0;transition:.28s;pointer-events:none;white-space:nowrap;font-family:inherit}'
  +'#kxFunTip.show{opacity:1;transform:translateX(-50%) translateY(0)}';
  function today(){ var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  function read(){ try{ return JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){ return {}; } }
  function write(o){ try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} }
  function tip(msg){
    var t=document.getElementById('kxFunTip'); if(!t) return;
    t.textContent=msg; t.classList.add('show');
    clearTimeout(tip._t); tip._t=setTimeout(function(){ t.classList.remove('show'); },1900);
  }
  function ding(up){
    try{
      var C=window.AudioContext||window.webkitAudioContext; if(!C) return;
      if(!ding._ac) ding._ac=new C();
      var ac=ding._ac; if(ac.state==='suspended'&&ac.resume) ac.resume();
      var notes=up?[660,880,1175]:[523,659,784];
      notes.forEach(function(f,i){
        var o=ac.createOscillator(),g=ac.createGain(),t0=ac.currentTime+i*.09;
        o.type='sine'; o.frequency.value=f;
        g.gain.setValueAtTime(.0001,t0);
        g.gain.exponentialRampToValueAtTime(.09,t0+.02);
        g.gain.exponentialRampToValueAtTime(.0001,t0+.24);
        o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0+.26);
      });
    }catch(e){}
  }
  function praise(){ try{ if(window.praiseOnce) praiseOnce(); }catch(e){} }
  function burst(n){ try{ if(window.partyBurst) partyBurst(n||24); }catch(e){} }

  var combo=0;
  function hit(ok){
    if(!ok){ combo=0; return 0; }
    combo++;
    if(combo===3){ burst(28); praise(); ding(true); tip('连对三个，好厉害！'); }
    else if(combo===6){ burst(40); praise(); ding(true); tip('六个啦，停不下来！'); }
    else if(combo>6 && combo%5===0){ burst(36); praise(); tip('连对 '+combo+' 个啦！'); }
    return combo;
  }
  function showPet(){
    if(document.getElementById('kxFunPet')) return;
    var d=read(); if(d.day!==today()){ d={day:today(),found:0}; write(d); }
    if(d.found) return;
    var a=ANIMALS[Math.floor(Math.random()*ANIMALS.length)];
    var b=document.createElement('button');
    b.id='kxFunPet'; b.type='button'; b.setAttribute('aria-label','点一下小动物');
    b.innerHTML='<svg viewBox="0 0 54 58" aria-hidden="true">'+a.s+'</svg>';
    var w=window.innerWidth||360;
    b.style.left=Math.max(8,Math.min(w-80,Math.random()*(w-90)+10))+'px';
    b.style.top=(window.innerHeight?Math.max(90,window.innerHeight*.38+Math.random()*80):260)+'px';
    document.body.appendChild(b);
    var gone=setTimeout(function(){ if(b.parentNode) b.remove(); },11000);
    b.addEventListener('click',function(){
      clearTimeout(gone);
      d=read(); d.day=today(); d.found=1; write(d);
      burst(34); praise(); ding(true);
      tip(SAYS[Math.floor(Math.random()*SAYS.length)]+'（'+a.n+'）');
      b.classList.add('kx-gone');
      setTimeout(function(){ if(b.parentNode) b.remove(); },400);
    });
  }
  function schedulePet(){
    var delay=9000+Math.random()*11000;
    setTimeout(function(){
      if(!document.hidden) showPet();
      schedulePet();
    },delay);
  }
  function mount(){
    var st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);
    var t=document.createElement('div'); t.id='kxFunTip'; document.body.appendChild(t);
    schedulePet();
  }
  window.KX_FUN={hit:hit,ding:ding,burst:burst,praise:praise,tip:tip,
    combo:function(){ return combo; },pet:showPet,today:today};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();
