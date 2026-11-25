/* 可心听故事 · 冒烟测试（自包含 DOM 桩，无需 jsdom）
   1) stories.js 解析正确，8 篇，每篇逐句音频齐全且为合法 mp3
   2) 真实加载页面脚本：列表渲染 8 张卡片；点开故事进入详情；自动连播到结尾会写入星星 localStorage
*/
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DIR = __dirname;
let pass = 0;
function ok(name, cond) {
  if (!cond) { throw new Error('✗ ' + name); }
  pass++; console.log('✓ ' + name);
}

/* ---------- 轻量 DOM 桩 ---------- */
function makeEl(tag) {
  const classes = new Set();
  const el = {
    tag: tag || 'div', children: [], parent: null, dataset: {},
    textContent: '', _html: '', offsetWidth: 0, onclick: null,
    style: { setProperty() {} },
    classList: {
      add: (...c) => c.forEach(x => classes.add(x)),
      remove: (...c) => c.forEach(x => classes.delete(x)),
      toggle: (c, f) => { if (f === undefined) { classes.has(c) ? classes.delete(c) : classes.add(c); } else if (f) classes.add(c); else classes.delete(c); },
      contains: c => classes.has(c)
    },
    addEventListener() {}, removeEventListener() {},
    click() { if (el.onclick) el.onclick(); },
    appendChild(ch) { ch.parent = el; el.children.push(ch); return ch; },
    remove() { if (el.parent) { const i = el.parent.children.indexOf(el); if (i >= 0) el.parent.children.splice(i, 1); } },
    insertAdjacentHTML() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    scrollIntoView() {},
    getBoundingClientRect() { return { width: 100, height: 100, left: 0, top: 0, right: 100, bottom: 100 }; },
    focus() {},
    get className() { return Array.from(classes).join(' '); },
    set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => classes.add(c)); },
    get innerHTML() { return el._html; },
    set innerHTML(v) { el._html = String(v); if (v === '') el.children = []; }
  };
  return el;
}

const ids = {};
['grid','starN','listView','storyView','lines','dtTitle','curN','totN','finish','autoBtn','backBtn','prevBtn','replayBtn','nextBtn']
  .forEach(id => { ids[id] = makeEl('div'); });

const document = {
  getElementById: id => (ids[id] || (ids[id] = makeEl('div'))),
  createElement: tag => makeEl(tag),
  body: makeEl('body')
};

const store = {};
const localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};

let LAST = null;
function Audio() {
  const a = { src: '', paused: false, onended: null,
    play() { return { catch() {} }; }, pause() {} };
  LAST = a; return a;
}

const window = {
  STORY_DATA: undefined,
  KX_FUN: { burst() {}, ding() {}, praise() {}, tip() {}, hit() {} },
  scrollTo() {}
};

/* ---------- 加载数据 + 内联脚本 ---------- */
const storiesSrc = fs.readFileSync(path.join(DIR, 'stories.js'), 'utf8');
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
let inline = '';
m.forEach(block => { const body = block.replace(/^<script>/, '').replace(/<\/script>$/, ''); if (body.trim() && !/<script\s+src/.test(block)) inline += body + '\n'; });

assert.ok(inline.length > 50, '未找到内联脚本');
const fn = new Function('document', 'window', 'localStorage', 'Audio', 'console', storiesSrc + '\n;\n' + inline);
fn(document, window, localStorage, Audio, console);

/* ---------- 断言：数据 ---------- */
const list = window.STORY_DATA;
ok('STORY_DATA 为 8 篇故事', Array.isArray(list) && list.length === 8);

let totalLines = 0;
list.forEach(s => {
  ok('故事「' + s.title + '」有标题/颜色/简介', !!s.title && !!s.color && !!s.intro);
  assert.ok(Array.isArray(s.lines) && s.lines.length >= 8, s.title + ' 句数过少');
  s.lines.forEach((t, i) => {
    const f = path.join(DIR, 'audio', 'story_' + s.id + '_L' + ('0' + (i + 1)).slice(-2) + '.mp3');
    const buf = fs.readFileSync(f);
    const valid = buf.length > 800 && (buf[0] === 0xFF || (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33));
    ok('音频 ' + path.basename(f) + ' 存在且为合法 mp3', valid);
  });
  totalLines += s.lines.length;
});
console.log('  故事句数合计：' + totalLines);

/* ---------- 断言：页面交互 ---------- */
ok('列表渲染出 8 张卡片', ids.grid.children.length === 8);

ids.grid.children[0].click();
ok('点开故事后详情视图激活', ids.storyView.classList.contains('active'));
ok('详情标题已设置', ids.dtTitle.textContent.length > 0);
ok('总段数已设置', Number(ids.totN.textContent) === list[0].lines.length);

/* 自动连播到结尾 → 应写入星星 */
ids.autoBtn.click();
let guard = 0;
const firstId = list[0].id;
while (!(localStorage.getItem('kexin_story_stars_v1') || '').includes(firstId) && guard < 60) {
  if (LAST && LAST.onended) LAST.onended();
  guard++;
}
const saved = JSON.parse(localStorage.getItem('kexin_story_stars_v1') || '{}');
ok('听完第一篇后写入星星 localStorage', saved[firstId] === 1);

console.log('\n全部通过：' + pass + ' 项');
