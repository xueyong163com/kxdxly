/* 数学页冒烟测试：严格模拟浏览器加载顺序（外链 data.js 先于内联脚本） */
const fs = require('fs');
const store = {};
const els = {};
const elStub = () => ({
  style:{ setProperty(){} }, classList:{ add(){}, remove(){}, toggle(){}, contains:()=>false },
  addEventListener(){}, onclick:null, setAttribute(){}, appendChild(){},
  textContent:'', innerHTML:'', dataset:{},
  querySelectorAll:()=>[], querySelector:()=>null,
  animate:()=>({}), offsetWidth:0
});
global.window = {
  localStorage: { getItem:k=>store[k]||null, setItem:(k,v)=>store[k]=String(v), removeItem:k=>delete store[k] },
  addEventListener:()=>{},
  scrollTo:()=>{},
  AudioContext: function(){
    this.state='running'; this.currentTime=0; this.resume=()=>{}; this.destination={};
    this.createOscillator = ()=>({ type:'', frequency:{value:0}, connect(){}, start(){}, stop(){} });
    this.createGain = ()=>({ gain:{ setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){} });
  },
};
global.document = {
  getElementById: id => els[id] || (els[id] = elStub()),
  querySelectorAll: ()=>[], querySelector: ()=>null,
  createElement: ()=>elStub(), addEventListener:()=>{},
  body:{ appendChild(){} }, documentElement:{ style:{} },
};
global.navigator = { userAgent:'node-smoke' };
global.localStorage = global.window.localStorage;   /* 裸 localStorage 也指向桩 */
global.Audio = function(){
  return { preload:'', play(){ return Promise.resolve(); }, pause(){}, load(){}, onended:null, onerror:null };
};

const html = fs.readFileSync('index.html','utf-8');
const dataTagOk = /<script src="data\.js"><\/script>/.test(html);
const posSrc = html.indexOf('<script src="data.js">');
const posInline = html.search(/<script>\s*\n?\s*const META/);
console.log('data.js 外链标签存在且在内联之前:', dataTagOk && posSrc >= 0 && posSrc < posInline);
if(!dataTagOk || posSrc < 0){ process.exit(1); }

eval(fs.readFileSync('data.js','utf-8'));
if(!window.MATH_DATA){ console.log('FATAL: 数据未挂到 window'); process.exit(1); }

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
try{
  scripts.forEach(code => new Function(
    'window','document','navigator','Audio',
    code
  )(global.window, global.document, global.navigator, global.Audio));
  console.log('内联脚本执行: 通过（无运行时错误）');
}catch(e){
  console.log('执行失败:', e.message);
  console.log(e.stack.split('\n').slice(0,4).join('\n'));
  process.exit(1);
}

/* 数据校验 */
let bad = 0;
const ids = new Set();
const lvCount = {};
window.MATH_DATA.forEach(q=>{
  if(!/^m\d{3}$/.test(q.id) || ids.has(q.id)) bad++;
  ids.add(q.id);
  lvCount[q.lv] = (lvCount[q.lv]||0)+1;
  if(!q.say || /数一数/.test(q.say)) bad++;
  if(q.opts){
    if(q.opts.length!==3 || new Set(q.opts).size!==3) bad++;
    if(typeof q.ans!=='number' || q.ans<0 || q.ans>2) bad++;
    if(q.opts[q.ans] < 0) bad++;
  }
  if(q.type==='count' && (q.n<1 || q.n>15)) bad++;
  if(q.type==='add' && (q.a+q.b<2 || q.a+q.b>20)) bad++;
  if(q.type==='sub' && (q.n-q.k<1)) bad++;
  if(q.type==='compare' && q.nL===q.nR) bad++;
  if(q.type==='bigger' && q.a===q.b) bad++;
  if(q.type==='seq'){
    if(q.seq.length!==5 || q.seq.filter(v=>v===0).length!==1) bad++;
    if(q.seq[0]<1 || q.seq.some(v=>v!==0 && (v<1 || v>20))) bad++;
  }
  if(q.type==='next' && (q.a<8 || q.a>20)) bad++;
  if(q.type==='expr'){
    if(!Array.isArray(q.nums) || q.nums.length<2 || q.ops.length!==q.nums.length-1) bad++;
    let r=q.nums[0];
    q.ops.forEach((op,i)=>{ r = op==='-' ? r-q.nums[i+1] : r+q.nums[i+1]; });
    if(r<0 || r>20 || q.opts[q.ans]!==r) bad++;
  }
  if(q.type==='diff'){
    if(!(q.nL>0 && q.nR>0 && q.nL<=10 && q.nR<=10 && q.nL!==q.nR)) bad++;
    if(Math.abs(q.nL-q.nR)!==q.opts[q.ans]) bad++;
  }
  /* ---- 拓展篇 ---- */
  if(q.type==='shape'){
    if(!Array.isArray(q.optsShape) || q.optsShape.length!==3 || new Set(q.optsShape).size!==3) bad++;
    if(!['circle','tri','square','rect','star','heart'].includes(q.optsShape[q.ans])) bad++;
  }
  if(q.type==='shapecount'){
    if(q.opts[q.ans]!==q.nT || q.nT<1 || q.nT>6) bad++;
    if(q.nT+q.nO>9) bad++;
  }
  if(q.type==='pos'){
    if(!['top','bottom','left','right'].includes(q.target)) bad++;
  }
  if(q.type==='cmp'){
    if(!['long','tall','heavy'].includes(q.kind) || !['L','R'].includes(q.big)) bad++;
    if(q.kind==='tall' && new Set([q.iconL,q.iconR]).size!==2) bad++;
  }
  if(q.type==='ordinal'){
    if(q.queue.length!==5 || new Set(q.queue).size!==5) bad++;
    const pos = q.frm==='L' ? q.queue.indexOf(q.pick)+1 : 5-q.queue.indexOf(q.pick);
    if(q.opts[q.ans]!==pos || pos<1 || pos>5) bad++;
  }
  if(q.type==='cmp3'){
    if(q.sizes.length!==3 || new Set(q.sizes).size!==3) bad++;
    const best = (q.ask==='big'||q.ask==='tall') ? Math.max(...q.sizes) : Math.min(...q.sizes);
    if(q.sizes[q.ans]!==best) bad++;
  }
  if(q.type==='clock'){
    if(q.h<1 || q.h>12 || q.opts[q.ans]!==q.h) bad++;
  }
  if(q.type==='money'){
    if(q.bills.length!==3 || new Set(q.bills).size!==3) bad++;
    if(![1,5,10,20,50,100].includes(q.val)) bad++;
  }
  if(q.type==='change'){
    if(q.pay<=q.price || q.opts[q.ans]!==q.pay-q.price) bad++;
  }
  if(q.type==='zero'){
    if(q.opts[q.ans]!==0) bad++;
  }
  if(q.type==='pattern'){
    if(q.seq.length!==5 || q.seq.filter(v=>!v).length!==1) bad++;
    if(!['circle','tri','square','rect','star','heart'].includes(q.optsShape[q.ans])) bad++;
  }
  if(q.type==='sort'){
    if(q.cards.length!==4 || new Set(q.cards).size!==4) bad++;
  }
  if(q.type==='group'){
    if(q.opts[q.ans]!==q.per*q.groups || q.per*q.groups>12) bad++;
  }
  if(q.type==='parity'){
    if(q.k<3 || q.k>10 || q.opts[q.ans]!==q.k%2) bad++;
  }
});
console.log('题数:', window.MATH_DATA.length, ' 每关10题:',
  Object.keys(lvCount).length===33 && Object.values(lvCount).every(v=>v===10),
  ' 非法数据:', bad);
if(window.MATH_DATA.length!==330 || bad>0){ process.exit(1); }

/* 渲染断言 */
const gridHTML = els['levelGrid'] ? els['levelGrid'].innerHTML : '';
const cards = (gridHTML.match(/data-key="lv/g)||[]).length;
console.log('关卡卡片数:', cards);
if(cards!==33){ process.exit(1); }

/* 交互测试：走 MATH_DEBUG 钩子 */
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async ()=>{
  const dbg = global.window.MATH_DEBUG;
  if(!dbg){ console.log('FATAL: 无 MATH_DEBUG'); process.exit(1); }

  const btnOk = () => ({ classList:{ add(){},remove(){} }, dataset:{} });

  dbg.openLevel('lv01');
  await sleep(30);
  if(dbg.state.qs.length!==10){ console.log('FATAL: 关卡题目应为 10'); process.exit(1); }
  const stageHTML = els['stage'] ? els['stage'].innerHTML : '';
  console.log('第 1 关渲染图形:', /class="fig"/.test(stageHTML), ' 数字选项:', (stageHTML.match(/num-btn/g)||[]).length>=3);

  /* 第 1 题答对 → 星星 +1 */
  let q = dbg.state.qs[0];
  dbg.answerNum(q.ans, btnOk());
  let stars = Number(els['starCount'].textContent);
  console.log('答对加星:', stars===1, ' (starCount='+stars+')');
  if(stars!==1){ process.exit(1); }

  /* 等自动下一题（成功反馈 2000ms 后跳转） */
  await sleep(2200);
  if(dbg.state.idx!==1){ console.log('FATAL: 未自动进入第 2 题, idx='+dbg.state.idx); process.exit(1); }
  console.log('自动下一题: 通过 (idx='+dbg.state.idx+')');

  /* 第 2 题答错 → 星星不变 */
  q = dbg.state.qs[1];
  const wrongIdx = (q.ans+1)%3;
  dbg.answerNum(wrongIdx, btnOk());
  stars = Number(els['starCount'].textContent);
  console.log('答错不加星:', stars===1, ' (starCount='+stars+')');
  if(stars!==1){ process.exit(1); }

  /* 再答对 → 星星 2 */
  dbg.answerNum(q.ans, btnOk());
  stars = Number(els['starCount'].textContent);
  console.log('第二次答对加星:', stars===2, ' (starCount='+stars+')');
  if(stars!==2){ process.exit(1); }

  /* compare / bigger / seq 各抽一关跑通 */
  dbg.openLevel('lv02'); await sleep(20);
  const q2 = dbg.state.qs[0];
  dbg.answerSide(q2.nL>q2.nR?'L':'R', btnOk());
  console.log('比一比答对流程: 通过 (星星='+els['starCount'].textContent+')');

  dbg.openLevel('lv08'); await sleep(20);
  const q8 = dbg.state.qs[0];
  dbg.answerBig(Math.max(q8.a,q8.b), btnOk());
  console.log('比大小答对流程: 通过 (星星='+els['starCount'].textContent+')');

  dbg.openLevel('lv05'); await sleep(20);
  const q5 = dbg.state.qs[0];
  const stage5 = els['stage'].innerHTML;
  console.log('数字火车渲染车厢:', (stage5.match(/class="car/g)||[]).length===5, ' 火车头:', /train-loco/.test(stage5));
  dbg.answerNum(q5.ans, btnOk());

  /* 高阶关卡：认识十几（next） */
  dbg.openLevel('lv11'); await sleep(20);
  const q11 = dbg.state.qs[0];
  const stage11 = els['stage'].innerHTML;
  console.log('认识十几大数字展示:', /big-num/.test(stage11));
  const s11 = Number(els['starCount'].textContent);
  dbg.answerNum(q11.ans, btnOk());
  console.log('认识十几答对流程: 通过 (星星+', Number(els['starCount'].textContent)-s11, ')');

  /* 减法高手（expr 算式） */
  dbg.openLevel('lv16'); await sleep(20);
  const stage16 = els['stage'].innerHTML;
  console.log('减法高手算式渲染:', /expr-num/.test(stage16), ' 减号:', stage16.includes('−'));
  const q16 = dbg.state.qs[0];
  dbg.answerNum(q16.ans, btnOk());

  /* 多几个（diff 两侧 + 标签） */
  dbg.openLevel('lv17'); await sleep(20);
  const stage17 = els['stage'].innerHTML;
  console.log('多几个两侧展示:', (stage17.match(/diff-side/g)||[]).length===2,
    ' 标签:', (stage17.match(/cmp-label/g)||[]).length===2);
  const q17 = dbg.state.qs[0];
  dbg.answerNum(q17.ans, btnOk());

  /* 连着算（三个数）与十加几（十位盒） */
  dbg.openLevel('lv18'); await sleep(20);
  console.log('连着算三个数:', (els['stage'].innerHTML.match(/expr-num/g)||[]).length===3);

  /* 十加几：验证整十盒渲染 */
  const qT = window.MATH_DATA.find(x=>x.lv==='lv12' && (x.a===10 || x.b===10));
  const htmlT = dbg.figHTML(qT);
  console.log('十加几整十盒渲染:', /ten-box/.test(htmlT), ' (m='+qT.id+', a='+qT.a+', b='+qT.b+')');

  /* ---- 拓展篇 ---- */

  /* lv21 认形状：answerPick */
  dbg.openLevel('lv21'); await sleep(20);
  let s21 = els['stage'].innerHTML;
  console.log('认形状三个图形按钮:', (s21.match(/shape-btn/g)||[]).length===3,
    ' 几何SVG:', (s21.match(/viewBox="0 0 100 100"/g)||[]).length>=3);
  const q21 = dbg.state.qs[0];
  s21 = Number(els['starCount'].textContent);
  dbg.answerPick((q21.ans+1)%3, btnOk());
  console.log('认形状答错不加星:', Number(els['starCount'].textContent)===s21);
  dbg.answerPick(q21.ans, btnOk());
  console.log('认形状答对加星: +', Number(els['starCount'].textContent)-s21);

  /* lv22 图形找一找：数字选项 */
  dbg.openLevel('lv22'); await sleep(20);
  const q22 = dbg.state.qs[0];
  console.log('图形找一找散布场景:', /viewBox="0 0 340 200"/.test(els['stage'].innerHTML),
    ' 数字选项:', (els['stage'].innerHTML.match(/num-btn/g)||[]).length===3);
  dbg.answerNum(q22.ans, btnOk());

  /* lv23 上下左右：answerZone */
  dbg.openLevel('lv23'); await sleep(20);
  const q23 = dbg.state.qs[0];
  const zones = (els['stage'].innerHTML.match(/data-zone=/g)||[]).length;
  console.log('方位题两个虚线区:', zones===2, ' 飞行小图标:', /pos-flyer/.test(els['stage'].innerHTML));
  const wrongZone = q23.target==='top'?'bottom':(q23.target==='bottom'?'top':(q23.target==='left'?'right':'left'));
  dbg.answerZone(wrongZone, btnOk());
  let s23 = Number(els['starCount'].textContent);
  console.log('方位答错不加星:', Number(els['starCount'].textContent)===s23);
  dbg.answerZone(q23.target, btnOk());
  console.log('方位答对加星: +', Number(els['starCount'].textContent)-s23);

  /* lv24 比长短：跷跷板/铅笔/高矮 */
  dbg.openLevel('lv24'); await sleep(20);
  const q24 = dbg.state.qs[0];
  const s24html = els['stage'].innerHTML;
  console.log('比长短渲染:',
    (q24.kind==='long' && /cmp2-card/.test(s24html)) ||
    (q24.kind==='tall' && /cmp2-card/.test(s24html)) ||
    (q24.kind==='heavy' && /seesaw-wrap/.test(s24html)));
  dbg.answerPick(q24.big==='L'?0:1, btnOk());

  /* lv25 排第几：队列 + 序数读音 */
  dbg.openLevel('lv25'); await sleep(20);
  const q25 = dbg.state.qs[0];
  console.log('排队五只小动物:', (els['stage'].innerHTML.match(/queue-item/g)||[]).length===5,
    ' 起点箭头:', /queue-start/.test(els['stage'].innerHTML));
  dbg.answerNum(q25.ans, btnOk());

  /* lv26 谁最大：三卡 */
  dbg.openLevel('lv26'); await sleep(20);
  console.log('三卡比大小:', (els['stage'].innerHTML.match(/cmp3-card/g)||[]).length===3);
  const q26 = dbg.state.qs[0];
  dbg.answerPick(q26.ans, btnOk());

  /* lv27 钟表 */
  dbg.openLevel('lv27'); await sleep(20);
  const q27 = dbg.state.qs[0];
  console.log('钟表渲染:', /clock-fig/.test(els['stage'].innerHTML),
    ' 时针角度存在:', /line x1="60" y1="60"/.test(els['stage'].innerHTML));
  dbg.answerNum(q27.ans, btnOk());

  /* lv28 人民币 */
  dbg.openLevel('lv28'); await sleep(20);
  const q28 = dbg.state.qs[0];
  const s28html = els['stage'].innerHTML;
  console.log('人民币渲染:',
    (q28.type==='money' && (s28html.match(/money-card/g)||[]).length===3) ||
    (q28.type==='change' && /price-tag/.test(s28html)));
  const ansFn28 = q28.type==='money' ? dbg.answerPick : dbg.answerNum;
  ansFn28(q28.ans, btnOk());

  /* lv29 认识零 */
  dbg.openLevel('lv29'); await sleep(20);
  const q29 = dbg.state.qs[0];
  console.log('空容器渲染:', /zero-fig/.test(els['stage'].innerHTML),
    ' 选项含0:', dbg.state.qs[0].opts.includes(0));
  dbg.answerNum(q29.ans, btnOk());

  /* lv30 图形规律 */
  dbg.openLevel('lv30'); await sleep(20);
  const q30 = dbg.state.qs[0];
  console.log('图形规律问号块:', /ptile q/.test(els['stage'].innerHTML),
    ' 图形选项:', (els['stage'].innerHTML.match(/shape-btn/g)||[]).length===3);
  dbg.answerPick(q30.ans, btnOk());

  /* lv31 分类 */
  dbg.openLevel('lv31'); await sleep(20);
  console.log('分类四格:', (els['stage'].innerHTML.match(/sort-card/g)||[]).length===4);
  const q31 = dbg.state.qs[0];
  dbg.answerPick(q31.ans, btnOk());

  /* lv32 成组数 */
  dbg.openLevel('lv32'); await sleep(20);
  const q32 = dbg.state.qs[0];
  console.log('成组虚线盒:', (els['stage'].innerHTML.match(/group-box/g)||[]).length===q32.groups);
  dbg.answerNum(q32.ans, btnOk());

  /* lv33 单双数：配对圈 + 自定义反馈 */
  dbg.openLevel('lv33'); await sleep(20);
  const q33 = dbg.state.qs[0];
  const ringPairs = (els['stage'].innerHTML.match(/pair-ring/g)||[]).length;
  console.log('单双数配对圈:', ringPairs===Math.ceil(q33.k/2),
    ' 剩单圈:', (q33.k%2?/pair-ring alone/.test(els['stage'].innerHTML):true));
  dbg.answerNum(q33.ans, btnOk());
  const fb33 = els['feedback'] ? els['feedback'].textContent : '';
  console.log('单双数反馈文字:', /单数|双数/.test(fb33) ? '通过（'+fb33+'）' : '未出现!');
  if(!/单数|双数/.test(fb33)){ process.exit(1); }

  console.log('全部冒烟测试通过');
  process.exit(0);
})();
