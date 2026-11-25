/* 可心的小乐园 · 公共「我来背/唱/讲/读」录音浮层
   只在 App（KexinRec 桥接）里可用；录音存 App 私有目录，按 id 区分文件。
   用法：window.KX_RECITE.open({ id:'n001', verb:'唱', thing:'儿歌', onOpen:fn })
   - id   录音存储标识（同一 id 重录即覆盖）
   - verb 动作词：背/唱/讲/读（拼进文案）
   - thing 东西名：诗/儿歌/故事/英语
   - onOpen 浮层打开前的回调（页面用来停掉自己正在播的音频） */
(function(){
  var R = window.KexinRec;

  /* ---------- 样式 ---------- */
  var css = document.createElement('style');
  css.textContent =
    '.rc-mask{position:fixed;inset:0;background:rgba(62,60,48,.6);z-index:96;display:flex;align-items:center;justify-content:center;padding:14px}'
    +'.rc-mask.hide{display:none}'
    +'.rc-panel{position:relative;width:100%;max-width:460px;background:#FFFCF2;border:3px solid #2F3B33;border-radius:22px;padding:20px 18px 24px;box-shadow:0 12px 0 rgba(62,60,48,.15);text-align:center;font-family:inherit}'
    +'.rc-panel h2{font-family:"STKaiti","KaiTi","Kaiti SC","楷体",serif;font-size:22px;margin:0 0 4px;letter-spacing:2px;color:#2F3B33}'
    +'.rc-sub{font-size:12.5px;color:#6B7568;margin:0 0 16px}'
    +'.rc-close{position:absolute;top:12px;right:14px;width:36px;height:36px;border:2px solid #E7D9BC;background:#fff;border-radius:50%;font-size:21px;line-height:1;color:#6B7568;cursor:pointer}'
    +'.rc-mic{width:96px;height:96px;border-radius:50%;margin:8px auto 14px;display:grid;place-items:center;background:#FBE6F0;border:3px solid #D9708E;cursor:pointer;transition:transform .15s,background .2s;box-shadow:0 5px 0 rgba(217,112,142,.25);-webkit-tap-highlight-color:transparent}'
    +'.rc-mic svg{width:44px;height:44px;fill:#B0507E}'
    +'.rc-mic.rec{background:#D9708E;animation:rcPulse 1.2s infinite}'
    +'.rc-mic.rec svg{fill:#fff}'
    +'.rc-mic.playing{background:#DCEFE4;border-color:#5B9A72;box-shadow:0 5px 0 rgba(91,154,114,.25)}'
    +'.rc-mic.playing svg{fill:#3F7A57}'
    +'@keyframes rcPulse{0%,100%{transform:scale(1);box-shadow:0 5px 0 rgba(217,112,142,.25)}50%{transform:scale(1.07);box-shadow:0 5px 0 rgba(217,112,142,.1),0 0 0 12px rgba(217,112,142,.15)}}'
    +'.rc-status{font-size:16px;color:#2F3B33;font-weight:600;margin:6px 0 4px;min-height:22px}'
    +'.rc-time{font-size:26px;color:#B0507E;font-family:Arial,monospace;font-weight:700;letter-spacing:1px;margin-bottom:16px}'
    +'.rc-acts{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}'
    +'.rc-acts button{padding:11px 18px;border:none;border-radius:13px;font-size:14.5px;font-weight:700;font-family:inherit;cursor:pointer}'
    +'.rc-re{background:#EFE8D6;color:#7A6E52}'
    +'.rc-confirm{display:none;margin:0 0 14px;padding:12px 14px;background:#FDF0C8;border:2px solid #EBD184;border-radius:14px}'
    +'.rc-confirm.show{display:block}'
    +'.rc-confirm p{margin:0 0 10px;font-size:14px;color:#7A5E20;font-weight:600}'
    +'.rc-confirm button{padding:10px 18px;border:none;border-radius:12px;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;margin:0 4px}'
    +'.rc-c-yes{background:#D9708E;color:#fff}'
    +'.rc-c-no{background:#EFE8D6;color:#7A6E52}'
    +'.rc-tip{font-size:11.5px;color:#96A08D;line-height:1.6;margin-top:16px}';
  document.head.appendChild(css);

  /* ---------- 浮层逻辑 ---------- */
  var mask=null, mic=null, statusEl=null, timeEl=null, reBtn=null, confEl=null;
  var reciting=false, timer=null, secs=0, curPid=null, playTimer=null, hasRec=false, playing=false;
  var curVerb='背', curThing='诗', onOpenCb=null;

  function durKey(id){ return 'kx_rec_dur_'+id; }
  function saveDur(id,s){ try{ localStorage.setItem(durKey(id),String(s)); }catch(e){} }
  function loadDur(id){ try{ return Number(localStorage.getItem(durKey(id)))||0; }catch(e){ return 0; } }

  function build(){
    if(mask) return;
    var host=document.createElement('div');
    host.innerHTML='<div class="rc-mask hide" id="rcMask"><div class="rc-panel">'
      +'<button class="rc-close" id="rcClose">×</button>'
      +'<h2 id="rcTitle">我来背</h2><p class="rc-sub" id="rcSub">按住话筒开始背，松开就录好</p>'
      +'<div class="rc-mic" id="rcMic"><svg viewBox="0 0 24 24"><path d="M12 14a3.5 3.5 0 003.5-3.5V5a3.5 3.5 0 00-7 0v5.5A3.5 3.5 0 0012 14zm5-3.5a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.58a7 7 0 006-6.92z"/></svg></div>'
      +'<div class="rc-status" id="rcStatus">准备好了吗？</div>'
      +'<div class="rc-time" id="rcTime">00:00</div>'
      +'<div class="rc-acts">'
      +'<button class="rc-re" id="rcRe" style="display:none">↻ 重录</button>'
      +'</div>'
      +'<div class="rc-confirm" id="rcConfirm"><p>重录会覆盖现在的录音，确定吗？</p>'
      +'<button class="rc-c-yes" id="rcCYes">确定重录</button>'
      +'<button class="rc-c-no" id="rcCNo">再想想</button></div>'
      +'<p class="rc-tip" id="rcTip">按住话筒背诗，松手录好；再点一下话筒听自己背的。<br>这个要在「可心的小乐园」App 里用哦。</p>'
      +'</div></div>';
    document.body.appendChild(host);
    mask=document.getElementById('rcMask');
    mic=document.getElementById('rcMic');
    statusEl=document.getElementById('rcStatus'); timeEl=document.getElementById('rcTime');
    reBtn=document.getElementById('rcRe');
    confEl=document.getElementById('rcConfirm');
    document.getElementById('rcClose').addEventListener('click',close);
    mask.addEventListener('click',function(e){ if(e.target===mask) close(); });
    // 按住录音 / 松开停止；有录音时点一下播放
    mic.addEventListener('touchstart',onMicDown,{passive:false});
    mic.addEventListener('touchend',onMicUp);
    mic.addEventListener('touchcancel',onMicUp);
    mic.addEventListener('mousedown',onMicDown);
    mic.addEventListener('mouseup',onMicUp);
    mic.addEventListener('mouseleave',onMicUp);
    // 重录：二次确认，防止误覆盖
    reBtn.addEventListener('click',function(){ if(confEl) confEl.classList.add('show'); });
    document.getElementById('rcCYes').addEventListener('click',function(){
      if(confEl) confEl.classList.remove('show');
      hasRec=false;
      resetToReady();
      if(statusEl) statusEl.textContent='按住话筒，开始重录';
    });
    document.getElementById('rcCNo').addEventListener('click',function(){
      if(confEl) confEl.classList.remove('show');
    });
  }

  function setCopy(){
    var t=document.getElementById('rcTitle'); if(t) t.textContent='我来'+curVerb;
    var s=document.getElementById('rcSub'); if(s) s.textContent='按住话筒开始'+curVerb+'，松开就录好';
    var tip=document.getElementById('rcTip');
    if(tip) tip.innerHTML='按住话筒'+curVerb+curThing+'，松手录好；再点一下话筒听自己'+curVerb+'的。<br>这个要在「可心的小乐园」App 里用哦。';
  }

  function fmt(s){ return ('0'+Math.floor(s/60)).slice(-2)+':'+('0'+(s%60)).slice(-2); }
  function tick(){ secs++; if(timeEl) timeEl.textContent=fmt(secs); }
  function stopPlayCountdown(){
    if(playTimer){ clearInterval(playTimer); playTimer=null; }
    playing=false;
    if(mic) mic.classList.remove('playing');
  }
  function doPlay(){
    if(!R||!R.play||!hasRec) return;
    stopPlayCountdown();
    var ok=R.play(curPid);
    if(ok===false){ if(statusEl) statusEl.textContent='播放失败，再试一次'; return; }
    playing=true;
    if(mic) mic.classList.add('playing');
    var left=loadDur(curPid);
    if(statusEl) statusEl.textContent='正在听回放…（点话筒可停）';
    if(left>0 && timeEl) timeEl.textContent=fmt(left);
    playTimer=setInterval(function(){
      left--;
      if(timeEl) timeEl.textContent=fmt(Math.max(0,left));
      if(left<=0) { stopPlayCountdown(); if(statusEl) statusEl.textContent='听完啦，再'+curVerb+'一次？'; }
    },1000);
  }
  function onMicDown(e){
    e.preventDefault();
    if(!R || !R.start){ if(statusEl) statusEl.textContent='请在 App 里使用'; return; }
    if(playing){ stopPlayCountdown(); try{ if(R.stop) R.stop(); }catch(err){} if(statusEl) statusEl.textContent='已停止，点一下话筒再听'; return; }
    if(reciting) return;
    /* 有录音：点/按话筒都是播放，重录只走「重录」按钮 */
    if(hasRec){ doPlay(); return; }
    if(confEl) confEl.classList.remove('show');
    var ok=R.start(curPid);
    if(ok===false){ if(statusEl) statusEl.textContent='正在请求麦克风权限，允许后再按住'; return; }
    reciting=true; secs=0; if(timeEl) timeEl.textContent='00:00';
    if(mic) mic.classList.add('rec');
    if(statusEl) statusEl.textContent='正在录音…松开就录好';
    timer=setInterval(tick,1000);
  }
  function onMicUp(e){
    if(!reciting) return;
    reciting=false;
    if(timer){ clearInterval(timer); timer=null; }
    if(mic) mic.classList.remove('rec');
    if(R.stop) R.stop();
    if(secs<1){ hasRec=false; if(statusEl) statusEl.textContent='录得太短啦，按住话筒再试一次'; resetToReady(); return; }
    saveDur(curPid, secs); hasRec=true;
    if(statusEl) statusEl.textContent='录好啦！点一下话筒听听自己'+curVerb+'的';
    if(timeEl) timeEl.textContent=fmt(secs);
    if(reBtn) reBtn.style.display='';
  }
  function resetToReady(){
    reciting=false;
    if(timer){ clearInterval(timer); timer=null; }
    stopPlayCountdown();
    secs=0; if(timeEl) timeEl.textContent='00:00';
    if(mic) mic.classList.remove('rec');
    if(confEl) confEl.classList.remove('show');
    if(statusEl) statusEl.textContent='准备好了吗？';
    if(reBtn) reBtn.style.display='none';
  }
  function showRecorder(){
    build();
    setCopy();
    resetToReady();
    hasRec=!!(R && R.has && R.has(curPid));
    if(hasRec){
      var d=loadDur(curPid);
      if(statusEl) statusEl.textContent='点一下话筒听自己'+curVerb+'的，重录点下面按钮';
      if(timeEl && d>0) timeEl.textContent=fmt(d);
      if(reBtn) reBtn.style.display='';
    }
    mask.classList.remove('hide');
    window.__kxTtsPaused=true;
    try{ if(window.KexinTTS&&KexinTTS.stop) KexinTTS.stop(); }catch(e){}
    try{ if(onOpenCb) onOpenCb(); }catch(e){}
  }
  function close(){
    if(!mask) return;
    if(reciting && R&&R.stop) R.stop();
    if(timer){ clearInterval(timer); timer=null; }
    stopPlayCountdown();
    try{ if(R&&R.stop) R.stop(); }catch(e){}
    mask.classList.add('hide');
    window.__kxTtsPaused=false;
  }

  window.KX_RECITE = {
    open:function(opts){
      opts=opts||{};
      curPid = opts.id || 'x';
      curVerb = opts.verb || '背';
      curThing = opts.thing || '诗';
      onOpenCb = opts.onOpen || null;
      showRecorder();
    },
    close: close
  };
})();
