/* 趣味层与六模块新玩法冒烟测试：共用层逻辑 + 各页接入静态断言 */
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=__dirname;
const html=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

/* ---------- fun.js 逻辑测试（轻量 DOM 桩） ---------- */
const store={};
global.localStorage={getItem:k=>(k in store?store[k]:null),setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
const els={};
function makeEl(tag){
  const cs=new Set(),hs={};
  const e={tag:tag||'div',innerHTML:'',textContent:'',style:{},children:[],parent:null,
    classList:{add:(...c)=>c.forEach(x=>cs.add(x)),remove:(...c)=>c.forEach(x=>cs.delete(x)),
      toggle:(c,f)=>{if(f===undefined){cs.has(c)?cs.delete(c):cs.add(c);}else if(f)cs.add(c);else cs.delete(c);},
      contains:c=>cs.has(c)},
    addEventListener:(t,fn)=>{(hs[t]=hs[t]||[]).push(fn);},
    click:()=>{(hs.click||[]).slice().forEach(f=>f());},
    setAttribute(){},appendChild(ch){ch.parent=e;e.children.push(ch);return ch;},
    remove(){if(e.parent){const i=e.parent.children.indexOf(e);if(i>=0)e.parent.children.splice(i,1);}},
    querySelectorAll(){return [];},querySelector(){return null;}};
  return e;
}
global.document={readyState:'complete',hidden:false,
  head:makeEl('head'),body:makeEl('body'),
  createElement:t=>makeEl(t),
  getElementById:id=>els[id]||[].concat(document.body.children,document.head.children).find(e=>e.id===id)||null,
  addEventListener(){}};
global.window=global;
global.window.innerWidth=380; global.window.innerHeight=720;
global.setTimeout=()=>0; global.clearTimeout=()=>{};
global.setInterval=()=>0; global.clearInterval=()=>{};
let bursts=0,praises=0;
global.window.partyBurst=()=>{bursts++;};
global.window.praiseOnce=()=>{praises++;};
global.window.AudioContext=undefined;

let failures=0;
function check(n,c){ console.log((c?'PASS':'FAIL')+' '+n); if(!c) failures++; }

(async()=>{
  new Function(html('fun.js'))();
  const F=global.KX_FUN;
  check('趣味层就绪',!!F&&typeof F.hit==='function'&&typeof F.pet==='function');
  check('答错清零连对', F.hit(false)===0);
  check('连对 1、2 次不放大招', F.hit(true)===1&&F.hit(true)===2&&bursts===0);
  check('连对 3 次撒彩纸', F.hit(true)===3&&bursts===1&&praises===1);
  F.hit(true);F.hit(true);
  check('连对 6 次再来一次', F.hit(true)===6&&bursts===2);
  check('答错后连对归零', F.hit(false)===0);
  F.pet();
  check('每日惊喜小动物出现', !!document.getElementById('kxFunPet'));
  const pet=document.getElementById('kxFunPet');
  pet.click();
  check('点过之后当天不再出现', F.today()&&JSON.parse(store['kx_fun_v1']).found===1);
  pet.remove(); F.pet();
  check('同一天第二次不重复', document.getElementById('kxFunPet')===null);
  check('趣味层无表情符号', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(html('fun.js')));

  /* ---------- 全站接入 ---------- */
  const pages=['index.html','poems/index.html','english/index.html','quiz/index.html','racing/index.html','nursery/index.html','math/index.html'];
  let ok=0;
  pages.forEach(f=>{ if(html(f).includes('fun.js')) ok++; });
  check('主页与六模块都引入趣味层', ok===7);

  /* ---------- 各模块专属新玩法 ---------- */
  const poems=html('poems/index.html');
  check('诗词：听诗找画入口与印章', poems.includes('id="picOpen"')&&poems.includes('POEM_PIC_DEBUG')&&poems.includes('pic-seal'));
  check('诗词：12 件具体小东西带名字',
    ['大白鹅','月亮','太阳','星星','小花','小鸟','小船','大山','柳树','雪花','竹子','小雨']
      .every(n=>poems.includes("n:'"+n+"'")) && poems.includes("<span>'+NAME[k]+'</span>"));
  check('诗词：听一句诗、点单件物体', poems.includes('lineSrc(q)')&&poems.includes('诗里说的是哪样东西')&&poems.includes('hits.length!==1'));
  check('诗词：十二枚印章与具体图标', poems.includes("SAVE='kexin_poem_thing_v1'")&&poems.includes('viewBox="0 0 100 100"')&&poems.includes('pic-opt span'));
  /* 用页面同一套关键词复算题池，确认每类都出得了题、逐句音频都在 */
  const sandbox={};
  new Function('window', fs.readFileSync(path.join(ROOT,'poems/data.js'),'utf8'))(sandbox);
  const PD=sandbox.POEM_DATA;
  const audio=new Set(fs.readdirSync(path.join(ROOT,'poems/audio')));
  const KW=[/鹅/,/明月|月光|月落|月出|江月|山月|月明|月照|月色|月影/,/白日|红日|落日|夕阳|斜阳|太阳|日光|日暮/,/星/,/花|荷|莲/,/鸟|鸦|燕|莺|鹊|鸥/,/舟|船|帆/,/山|岭|峰/,/柳/,/雪/,/竹/,/雨/];
  const buckets=KW.map(()=>0); let pool=0,miss=0;
  PD.forEach(p=>(p.lines||[]).forEach((l,i)=>{
    const hit=KW.map((re,j)=>re.test(l.hz)?j:-1).filter(j=>j>=0);
    if(hit.length===1){ buckets[hit[0]]++; pool++; if(!audio.has(p.id+'_'+(i+1)+'.mp3')) miss++; }
  }));
  check('诗词：12 类意象都有题、逐句音频齐全', pool>=200&&buckets.every(n=>n>=1)&&miss===0);
  const eng=html('english/index.html');
  check('英语：第 5 个游戏找影子', eng.includes('id="shOpen"')&&eng.includes('ENG_SH')&&eng.includes('sh-opt'));
  check('英语：剪影与翻面样式', eng.includes('filter:brightness(0)')&&eng.includes('.sh-opt.reveal svg'));
  const quiz=html('quiz/index.html');
  check('知识：帮帮我去掉错答案', quiz.includes('id="btnHint"')&&quiz.includes("classList.add('removed')"));
  check('知识：神秘宝箱与连对火苗', quiz.includes('id="chestMask"')&&quiz.includes('comboFlame')&&quiz.includes('showChest'));
  const nur=html('nursery/index.html');
  check('儿歌：四件乐器', ["n:'八音盒'","n:'小铃铛'","n:'小鼓'","n:'木鱼'"].every(s=>nur.includes(s)));
  check('儿歌：会跳舞的小动物', nur.includes('id="danceRow"')&&nur.includes('setDance(true)')&&nur.includes('tapPet'));
  const math=html('math/index.html');
  check('数学：关卡印章', math.includes('id="stampRow"')&&math.includes('STAMP_KEY')&&math.includes('saveStamp(state.lv)'));
  check('数学：小动物接答案', math.includes('petCheer()')&&math.includes('pet-cheer'));
  const race=html('racing/index.html');
  check('赛车：磁铁道具', race.includes("type = 'magnet'")&&race.includes('drawMagnet')&&race.includes('magnet>0'));
  check('赛车：金币小店与装饰绘制', race.includes('id="shopBtn"')&&race.includes('buyGood')&&race.includes('drawEquip()'));
  check('赛车：底部方向按钮已移除', !race.includes('class="pad"')&&!race.includes('dirbtn')&&!race.includes('leftBtn')&&!race.includes('rightBtn'));
  check('赛车：仍可拖动小车 + 保留键盘左右键', race.includes('function onDown')&&race.includes("keys.right?1:0")&&race.includes("addEventListener('keydown'"));
  check('赛车：iPhone 底部安全区仍留白', /\.stage\{[^}]*env\(safe-area-inset-bottom\)/.test(race));
  check('赛车：开场引导写明拖小车操作', race.includes('用手指拖着小车，左右开起来'));
  const home=html('index.html');
  check('主页徽章已同步', home.includes('5 个游戏')&&home.includes('金币小店')&&home.includes('小乐队伴奏'));

  if(failures){ console.log('失败 '+failures+' 项'); process.exit(1); }
  console.log('趣味层与六模块新玩法测试全部通过');
  process.exit(0);
})().catch(e=>{ console.log('FAIL 异常: '+e.stack); process.exit(1); });
