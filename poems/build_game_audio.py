# -*- coding: utf-8 -*-
"""字宝宝找一找：生成 48 段提示音频（g001~g047 按字，g048 答错鼓励），可续传。"""
import asyncio, json, os, re, sys
import edge_tts

VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-18%'   # 比正常慢，方便听清单个字
BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'audio')
os.makedirs(OUT, exist_ok=True)

s = open(os.path.join(BASE, 'data.js'), encoding='utf-8').read()
items = json.load(open(os.path.join(BASE, '_game_chars.json'), encoding='utf-8'))
assert len(items) == 47, len(items)

TASKS = []
for i, it in enumerate(items):
    TASKS.append(('g%03d.mp3' % (i + 1), '找一找，哪个是%s的%s字？' % (it['hint'], it['ch'])))
TASKS.append(('g048.mp3', '答错啦没关系，再想一想哦。'))

async def gen(name, text, sem, retry=3):
    path = os.path.join(OUT, name)
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return True
    async with sem:
        for k in range(retry):
            try:
                com = edge_tts.Communicate(text, VOICE, rate=RATE)
                await com.save(path)
                if os.path.getsize(path) > 500:
                    return True
            except Exception:
                await asyncio.sleep(1.2 * (k + 1))
        return False

async def main():
    sem = asyncio.Semaphore(8)
    results = await asyncio.gather(*[gen(n, t, sem) for n, t in TASKS])
    fails = [TASKS[i][0] for i, r in enumerate(results) if not r]
    print('完成 %d / %d' % (sum(results), len(TASKS)))
    if fails:
        print('失败:', ' '.join(fails))
        sys.exit(1)

asyncio.run(main())
