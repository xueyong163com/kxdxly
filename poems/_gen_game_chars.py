# -*- coding: utf-8 -*-
"""为"字宝宝找一找"游戏定位目标字所在诗句，输出可直接嵌入页面的 JS 数组。"""
import json, re, sys

s = open('data.js', encoding='utf-8').read()
data = json.loads(re.search(r'window\.POEM_DATA = (\[.*?\]);', s, re.S).group(1))

# 目标字与提示词（顺序即音频编号顺序，勿乱动）
POOL = [
    ('月','月亮'), ('日','太阳'), ('星','星星'), ('云','白云'),
    ('风','大风'), ('雪','雪花'), ('雨','下雨'), ('山','小山'),
    ('水','河水'), ('江','长江'), ('海','大海'), ('花','花朵'),
    ('草','小草'), ('树','大树'), ('叶','叶子'), ('鸟','小鸟'),
    ('燕','燕子'), ('雁','大雁'), ('马','小马'), ('牛','老牛'),
    ('羊','小羊'), ('鹅','白鹅'), ('鱼','小鱼'), ('虫','小虫'),
    ('门','大门'), ('窗','窗户'), ('舟','小船'), ('桥','小桥'),
    ('楼','高楼'), ('田','田地'), ('春','春天'), ('夏','夏天'),
    ('秋','秋天'), ('冬','冬天'), ('晓','天亮'), ('夜','夜晚'),
    ('明','明亮'), ('清','清水'), ('白','白色'), ('绿','绿色'),
    ('红','红色'), ('黄','黄色'), ('客','客人'), ('人','大人'),
    ('心','爱心'), ('乡','家乡'), ('声','声音'), ('影','影子'),
]

def clean(hz):
    return hz.replace('，','').replace('。','').replace('？','').replace('！','').replace('、','')

items, missing = [], []
used_pairs = set()
for ch, hint in POOL:
    found = None
    for p in data:
        for i, l in enumerate(p['lines']):
            hz = clean(l['hz'])
            if ch in hz and len(hz) <= 8:
                key = (p['id'], i)
                if key in used_pairs:
                    continue
                # 避免同字重复用同一首
                found = {'ch': ch, 'hint': hint, 'pid': p['id'], 'ln': i, 'line': hz, 'title': p['title']}
                used_pairs.add(key)
                break
        if found:
            break
    if found:
        items.append(found)
    else:
        missing.append(ch)

print('找到 %d / %d' % (len(items), len(POOL)))
if missing:
    print('未找到:', ' '.join(missing))
json.dump(items, open('_game_chars.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# 打印 JS 数组文本（嵌入用）
out = json.dumps([{'ch': it['ch'], 'hint': it['hint'], 'pid': it['pid'], 'ln': it['ln']} for it in items],
                 ensure_ascii=False, separators=(',', ':'))
print(out)
