/* 点字朗读：只在 App（KexinTTS 桥接）里生效。
   可朗读的文字前面自动加小喇叭；点一下用系统原生声音念出来。
   按钮/链接/卡片照常工作，不加喇叭也不接管。 */
(function(){
  if(!window.KexinTTS || typeof window.KexinTTS.speak!=='function') return;
  if(window.__KX_TAPREAD__) return;
  window.__KX_TAPREAD__=true;

  var MAX=140;              // 一次最多念这么多字，避免念太长
  var hlTimer=null, hlEl=null;

  var SKIP_TAGS={A:1,BUTTON:1,INPUT:1,TEXTAREA:1,SELECT:1,SUMMARY:1,DETAILS:1,LABEL:1,SVG:1,PATH:1,CIRCLE:1,RECT:1,ELLIPSE:1,LINE:1,POLYGON:1,POLYLINE:1,G:1};
  var READ_TAGS={P:1,H1:1,H2:1,H3:1,H4:1,H5:1,H6:1,LI:1,SPAN:1,DIV:1,TD:1,TH:1,B:1,STRONG:1,EM:1,SMALL:1};

  // 小喇叭图标（点击时事件会穿透到父元素）
  var SPK='<span class="kx-spk" aria-hidden="true" style="display:inline-flex;align-items:center;'
        +'vertical-align:-2px;margin-right:5px;width:15px;height:15px;flex:none;'
        +'background:#3E7F96;border-radius:50%;padding:2px;box-sizing:border-box;pointer-events:none">'
        +'<svg viewBox="0 0 24 24" style="width:100%;height:100%;fill:#fff">'
        +'<path d="M3 9v6h4l5 4V5L7 9H3zm11.5 3a3.5 3.5 0 00-2-3.15v6.3a3.5 3.5 0 002-3.15z"/></svg></span>';

  function clearHl(){
    if(hlEl){ hlEl.style.outline=''; hlEl.style.background=''; hlEl=null; }
    if(hlTimer){ clearTimeout(hlTimer); hlTimer=null; }
  }

  function inSkippable(el){
    var n=el;
    while(n && n!==document.body){
      if(n.nodeType===1){
        if(SKIP_TAGS[n.tagName]) return true;
        var r=n.getAttribute && n.getAttribute('role');
        if(r==='button'||r==='link') return true;
        if(n.hasAttribute && n.hasAttribute('onclick')) return true;
        if(n.id==='quizQ') return true;              // 问答题目有自己的朗读逻辑
        if(n.classList && n.classList.contains('kx-spk')) return true;
        try{ var cs=window.getComputedStyle(n); if(cs && cs.cursor==='pointer') return true; }catch(e){}
      }
      n=n.parentNode;
    }
    return false;
  }

  // 判断某个元素是否适合朗读（作为叶子文字块）
  function readable(el){
    if(!el || el.nodeType!==1) return false;
    if(!READ_TAGS[el.tagName]) return false;
    if(el.hasAttribute('data-kx-marked')) return false;
    if(el.querySelector('.kx-spk')) return false;          // 已有喇叭
    if(el.closest('.kx-spk')) return false;
    if(el.closest('.rc-mask')) return false;               // 录音浮层内的文字不加喇叭，避免录音时误读
    // 父元素已标注：内层内联标签(b/strong等)不重复加
    if(el.parentElement && el.parentElement.hasAttribute('data-kx-marked')) return false;
    if(inSkippable(el)) return false;
    // 只给"叶子文字块"加：直接子元素只能是内联格式标签或图标，不能有别的块
    var kids=el.children;
    for(var k=0;k<kids.length;k++){
      var kid=kids[k];
      if(kid.classList && (kid.classList.contains('kx-spk'))) continue;
      if(/^(B|STRONG|EM|SMALL|I|U|BR|SPAN)$/.test(kid.tagName)) {
        // 内联标签本身若带按钮功能也跳过
        if(inSkippable(kid)) return false;
        continue;
      }
      return false;                                        // 有块级/复杂子元素，让内层去加
    }
    var t=(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();
    if(!t || t.length<2) return false;
    if(t.length>MAX) t=t.slice(0,MAX)+'…';
    return true;
  }

  // 给所有可朗读的叶子文字块加喇叭
  function decorate(root){
    root=root||document;
    var nodes=root.querySelectorAll(Object.keys(READ_TAGS).map(function(t){return t.toLowerCase();}).join(','));
    for(var i=0;i<nodes.length;i++){
      var el=nodes[i];
      if(!readable(el)) continue;
      try{
        el.setAttribute('data-kx-marked','1');
        el.insertAdjacentHTML('afterbegin', SPK);
        el.style.cursor='default';
      }catch(e){}
    }
  }

  function pickTarget(node){
    var n=node;
    // 只认带喇叭的元素（data-kx-marked），绝不往上找大容器，避免误读整段说明
    for(var i=0;i<4 && n && n!==document.body;i++){
      if(n.nodeType===3) n=n.parentNode;
      if(!n || n.nodeType!==1) break;
      if(n.classList && n.classList.contains('kx-spk')) n=n.parentNode;
      if(n.hasAttribute && n.hasAttribute('data-kx-marked')) return n;
      // 遇到任何层级的容器就停，不要继续往上吞
      if(SKIP_TAGS[n.tagName]) return null;
      n=n.parentNode;
    }
    return null;
  }

  document.addEventListener('click', function(e){
    try{
      // 全局暂停（录音浮层打开时）或点在浮层内 → 不朗读
      if(window.__kxTtsPaused) return;
      if(e.target && e.target.closest && e.target.closest('.rc-mask')) return;
      var el=pickTarget(e.target);
      if(!el) return;
      if(inSkippable(el)) return;
      var text=(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();
      if(!text) return;
      if(text.length>MAX) text=text.slice(0,MAX)+'…';
      clearHl();
      hlEl=el;
      el.style.outline='2px dashed #3E7F96';
      el.style.background='rgba(62,127,150,.08)';
      window.KexinTTS.speak(text);
      hlTimer=setTimeout(clearHl, Math.min(12000, 1200+text.length*220));
    }catch(err){}
  }, true);

  // 首次标注
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ decorate(); });
  else decorate();

  // 动态内容（翻页/弹窗/切页）出现后补标
  var mo=null;
  try{
    mo=new MutationObserver(function(){
      clearTimeout(mo._t);
      mo._t=setTimeout(function(){ decorate(); }, 120);
    });
    mo.observe(document.body,{childList:true,subtree:true});
  }catch(e){}

  window.addEventListener('scroll', clearHl, {passive:true});
})();
