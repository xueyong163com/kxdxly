# -*- coding: utf-8 -*-
"""把蹦蹦兔趣味组件注入学习页（</body> 前）。

内容页（poems/english/nursery/quiz/math）：完整组件 + body 底部留白。
赛车页（racing）：位置改到右上（避开操作按钮），不加 body 留白。
幂等：已有 bunny 的页面自动跳过。
"""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOCK = io.open(os.path.join(ROOT, 'praise', '_widget.html'), encoding='utf-8').read()

RACING_OVR = ('<style>\n'
              '  #bunny{top:58px;right:10px;bottom:auto;width:50px}\n'
              '  #bunnySay{bottom:auto;top:60px}\n'
              '</style>\n')

PAGES = ['poems/index.html', 'english/index.html', 'nursery/index.html',
         'quiz/index.html', 'math/index.html']

for rel in PAGES:
    p = os.path.join(ROOT, rel)
    s = io.open(p, encoding='utf-8').read()
    if 'id="bunny"' in s:
        print('skip(已有)', rel)
        continue
    assert s.count('</body>') == 1, rel
    s = s.replace('</body>', BLOCK + '\n</body>')
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
    print('OK', rel)

# 赛车页：变体注入
p = os.path.join(ROOT, 'racing', 'index.html')
s = io.open(p, encoding='utf-8').read()
if 'id="bunny"' not in s:
    assert s.count('</body>') == 1
    block_racing = BLOCK.replace('  body{padding-bottom:88px}\n', '') + RACING_OVR
    s = s.replace('</body>', block_racing + '\n</body>')
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
    print('OK racing/index.html（右上变体）')
else:
    print('skip(已有) racing/index.html')
