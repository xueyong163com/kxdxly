/* 儿歌页冒烟测试 v3：含跟唱功能。严格模拟浏览器加载顺序 */
const fs = require('fs');
const store = {};
const els = {};
const elStub = () => ({
  style:{}, classList:{add(){},remove(){},toggle(){},contains:()=>false},
  addEventListener(){}, onclick:null, setAttribute(){}, appendChild(){},
  textContent:'', innerHTML:'', dataset:{},
  querySelectorAll:()=>[], querySelector:()=>null,
  animate:()=>({}), offsetWidth:0
});
global.window = {
  localStorage: { getItem:k=>store[k]||null, setItem:(k,v)=>store[k]=String(v), removeItem:k=>delete store[k] },
  addEventListener:()=>{},
  AudioContext: function(){
    this.state='running';
    this.currentTime = 0;
    this.resume = ()=>{};
    this.destination = {};
    this.createOscillator = ()=>({ type:'', frequency:{value:0}, connect(){}, start(){}, stop(){} });
    this.createGain = ()=>({ gain:{ setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){} });
  },
};
global.document = {
  getElementById: id => els[id] || (els[id] = elStub()),
  querySelectorAll: ()=>[], querySelector: ()=>null,
  createElement: ()=>elStub(), addEventListener:()=>{},
  body:{appendChild(){}}, documentElement:{style:{}},
};
global.navigator = { userAgent:'node-smoke' };
global.Audio = function(){ this.preload='';
  return { play(){ return Promise.resolve(); }, pause(){}, load(){}, onended:null, onerror:null };
};
global.scrollTo = ()=>{};
global.requestAnimationFrame = ()=>0;
global.cancelAnimationFrame = ()=>{};

const html = fs.readFileSync('index.html','utf-8');
const dataTagOk = /<script src="data\.js"><\/script>/.test(html);
const posSrc = html.indexOf('<script src="data.js">');
const posInline = html.search(/<script>\s*\n?\s*const ALL/);
console.log('data.js 外链标签存在且在内联之前:', dataTagOk && posSrc < posInline);
if(!dataTagOk) process.exit(1);

eval(fs.readFileSync('data.js','utf-8'));
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
if(!window.NURSERY_DATA){ console.log('FATAL: 数据未挂到 window'); process.exit(1); }
try{
  scripts.forEach(code => new Function('window','document','navigator','Audio','requestAnimationFrame','cancelAnimationFrame', code)(global.window, global.document, global.navigator, global.Audio, global.requestAnimationFrame, global.cancelAnimationFrame));
  console.log('内联脚本执行: 通过（含旋律引擎，无运行时错误）');
}catch(e){
  console.log('执行失败:', e.message);
  console.log(e.stack.split('\n').slice(0,4).join('\n'));
  process.exit(1);
}

/* 渲染断言 */
const gridHTML = els['grid'] && els['grid'].innerHTML || '';
const modeHTML = els['modeRow'] && els['modeRow'].innerHTML || '';
const nCards = (gridHTML.match(/song-card/g)||[]).length;
console.log('分类按钮已渲染:', modeHTML.includes('动物乐园'), ' 卡片数:', nCards);
if(nCards !== 51){ console.log('FATAL: 卡片应为 51 张'); process.exit(1); }

/* 数据校验 */
let bad = 0, totalLines = 0, singable = 0;
window.NURSERY_DATA.forEach(s=>{
  totalLines += s.lines.length;
  if(!/^n\d{3}$/.test(s.id) || !s.title || !s.cat || !s.lines.length) bad++;
  s.lines.forEach(l=>{ if(/[A-Za-z]/.test(l)) bad++; });
  if(s.melody){
    singable++;
    if(s.melody.length !== s.lines.length) { console.log('FAIL 旋律句数不匹配:', s.title); bad++; }
    s.melody.forEach(m=>{
      m.split(/\s+/).forEach(tok=>{
        if(!/^([A-G]#?[3-5])(:[0-9.]+)?$/.test(tok)){ console.log('FAIL 音符非法:', s.title, tok); bad++; }
      });
    });
  }
});
console.log('歌词总行数:', totalLines, ' 可跟唱:', singable, '首 非法数据:', bad);

/* 页面静态断言 */
const checks = [
  ['跟唱按钮', html.includes('id="singBtn"')],
  ['旋律引擎 startSing', html.includes('function startSing')],
  ['四种伴奏音色', html.includes("n:'八音盒'") && html.includes("n:'小铃铛'") && html.includes("n:'小鼓'") && html.includes("n:'木鱼'") && html.includes('INSTS[instIdx]')],
  ['跳舞小动物与换乐器按钮', html.includes('id="danceRow"') && html.includes('id="bandRow"') && html.includes('setDance(true)')],
  ['念/唱互斥', (html.match(/stopSing\(\)/g)||[]).length >= 4],
  ['starBox CSS 动画（不再用 animate API）', html.includes("box.classList.add('pop')") && !html.includes('.animate(')],
  ['存储键 v1', html.includes('kexin_nursery_stars_v1')],
  ['微信提示', html.includes('MicroMessenger')],
  ['无表情符号', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(html)],
];
let fail = 0;
checks.forEach(([n,ok])=>{ if(!ok){ console.log('FAIL:', n); fail++; } });
console.log(fail===0 && bad===0 ? '全部断言通过' : fail+' 项失败 / '+bad+' 处数据问题');
process.exit(fail===0 && bad===0 ? 0 : 1);
