/* 可心的小乐园 · 浏览器朗读公共模块（TTS）
   全站不再使用预录 MP3，统一改用系统自带语音合成朗读文字。
   用法：
     KX_TTS.speak(text)                     // 中文朗读
     KX_TTS.speak(text, {lang:'en-US', rate:0.9, onend:fn})
     KX_TTS.stop()                          // 停止当前朗读
   说明：
     - 安卓/主屏 App 里若有 window.KexinTTS 原生朗读桥接则优先使用；
     - 手机浏览器首次朗读需用户手势"解锁"，模块已自动处理；
     - onend 在朗读结束（或超时兜底）后调用，可安全用于自动连播。 */
(function(){
  'use strict';
  var unlocked=false, token=0, zhVoice=null, enVoice=null;

  function pickVoices(){
    try{
      if(!('speechSynthesis' in window)) return;
      var vs=speechSynthesis.getVoices()||[];
      zhVoice = vs.find(function(v){ return /zh[-_]CN/i.test(v.lang)&&/ting|xiao|hui|yao|yun|female|女/i.test(v.name); })
             || vs.find(function(v){ return /zh[-_]CN/i.test(v.lang); })
             || vs.find(function(v){ return /^zh/i.test(v.lang); }) || null;
      enVoice = vs.find(function(v){ return /^en[-_]US/i.test(v.lang)&&/female|samantha|zira|aria|google/i.test(v.name); })
             || vs.find(function(v){ return /^en[-_]US/i.test(v.lang); })
             || vs.find(function(v){ return /^en/i.test(v.lang); }) || null;
    }catch(e){}
  }
  function unlock(){
    if(unlocked) return;
    unlocked=true;
    try{
      if(!('speechSynthesis' in window)) return;
      pickVoices();
      var warm=new SpeechSynthesisUtterance(' ');
      warm.volume=0; warm.lang='zh-CN';
      speechSynthesis.speak(warm);
    }catch(e){}
  }
  if('speechSynthesis' in window){
    pickVoices();
    if(typeof speechSynthesis.onvoiceschanged!=='undefined'){
      speechSynthesis.onvoiceschanged=pickVoices;
    }
    document.addEventListener('touchstart', unlock, {passive:true, once:true});
    document.addEventListener('mousedown', unlock, {once:true});
  }

  /* 朗读预计时长兜底：个别浏览器吞掉 onend 事件，超时后补发，保证连播不卡住 */
  function estimateMs(text, lang, rate){
    var en=/^en/i.test(lang||'');
    var perChar = en ? 95 : 340;
    return Math.max(1800, text.length*perChar/(rate||0.9)) + 2500;
  }

  function speak(text, opts){
    opts=opts||{};
    text=String(text==null?'':text).trim();
    if(!text){ if(opts.onend) opts.onend(); return; }
    /* App 原生朗读桥接优先（不受浏览器手势限制） */
    if(window.KexinTTS && typeof window.KexinTTS.speak==='function'){
      try{ window.KexinTTS.speak(text); }catch(e){}
      if(opts.onend) setTimeout(opts.onend, estimateMs(text, opts.lang, opts.rate));
      return;
    }
    if(!('speechSynthesis' in window)){ if(opts.onend) opts.onend(); return; }
    unlock();
    var my=++token;
    try{ speechSynthesis.cancel(); }catch(e){}
    var en=/^en/i.test(opts.lang||'');
    var u=new SpeechSynthesisUtterance(text);
    u.lang=opts.lang||(en?'en-US':'zh-CN');
    u.rate=opts.rate!=null?opts.rate:0.9;
    u.pitch=opts.pitch!=null?opts.pitch:1.05;
    u.volume=1;
    pickVoices();
    var v=en?enVoice:zhVoice;
    if(v) u.voice=v;
    var done=false;
    function finish(){ if(done) return; done=true; clearTimeout(guard); if(opts.onend) opts.onend(); }
    u.onend=finish;
    u.onerror=finish;
    try{
      speechSynthesis.speak(u);
      var guard=setTimeout(finish, estimateMs(text, u.lang, u.rate));
    }catch(e){
      if(opts.onend) opts.onend();
    }
  }

  function stop(){
    token++;
    try{ if('speechSynthesis' in window) speechSynthesis.cancel(); }catch(e){}
    try{ if(window.KexinTTS && window.KexinTTS.stop) window.KexinTTS.stop(); }catch(e){}
  }

  window.KX_TTS={ speak:speak, stop:stop };
})();
