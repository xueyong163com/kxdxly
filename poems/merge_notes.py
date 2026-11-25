# -*- coding: utf-8 -*-
"""把分批写好的精讲（notes_b*.json）合并进 data.js 的 meaning 字段。

精讲原则：只讲诗句字面的大白话串讲，不编作者心境与史实。
"""
import io
import json
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))

# 1. 读取全部批次
notes = {}
for i in (1, 2, 3):
    p = os.path.join(BASE, 'notes_b%d.json' % i)
    with io.open(p, encoding='utf-8') as f:
        batch = json.load(f)
    dup = set(notes) & set(batch)
    if dup:
        raise SystemExit('批次之间有重复 id: %s' % dup)
    notes.update(batch)

# 2. 读取 data.js
path = os.path.join(BASE, 'data.js')
with io.open(path, encoding='utf-8') as f:
    src = f.read()

m_meta = re.search(r'(window\.POEM_META = )(\{.*?\})(;)', src, re.S)
m_data = re.search(r'(window\.POEM_DATA = )(\[.*?\])(;)', src, re.S)
meta = json.loads(m_meta.group(2))
data = json.loads(m_data.group(2))

# 3. 替换占位 meaning；已有真串讲的保留
replaced, kept, missed = 0, 0, []
for p in data:
    if p['id'] in notes:
        new = notes[p['id']]
        if p.get('meaning', '').startswith('这是一首写'):
            p['meaning'] = new
            replaced += 1
        else:
            # 已有真串讲的：不覆盖，但检查批次里是否有（防止写重复/写偏）
            kept += 1
            if p['meaning'] != new:
                print('提示 %s 已有精讲，保留原文，不采用新写的版本' % p['id'])
    elif p.get('meaning', '').startswith('这是一首写'):
        missed.append(p['id'])

print('替换 %d 首，保留原有真精讲 %d 首，漏写 %d 首 %s' % (
    replaced, kept, len(missed), missed if missed else ''))

# 4. 更新 META 说明
meta['note'] = '繁体已转简体，拼音由工具逐字生成；精讲为诗句字面白话串讲，个别多音字以老师为准'
meta['has_meaning'] = True

# 5. 写回
out = ('/* 自动生成，勿手改；源数据与生成脚本见 build_data.py */\n'
       'window.POEM_META = ' + json.dumps(meta, ensure_ascii=False) + ';\n'
       'window.POEM_DATA = ' + json.dumps(data, ensure_ascii=False) + ';\n')
with io.open(path, 'w', encoding='utf-8') as f:
    f.write(out)

# 6. 校验：300 首全部有真串讲，且无英文残留
with io.open(path, encoding='utf-8') as f:
    chk = f.read()
data2 = json.loads(re.search(r'window\.POEM_DATA = (\[.*?\]);', chk, re.S).group(1))
bad = [p['id'] for p in data2 if not p.get('meaning') or p['meaning'].startswith('这是一首写')]
en = [p['id'] for p in data2 if re.search(r'[A-Za-z]', p.get('meaning', ''))]
print('最终检查: 300首全部有真精讲 =', not bad, '; 精讲含英文字母 =', en if en else '无')
print('data.js 大小: %.1f KB' % (os.path.getsize(path) / 1024))
