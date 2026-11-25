# -*- coding: utf-8 -*-
"""为儿歌页预生成 MP3（edge-tts）。

audio/nXXX.mp3      = 标题 + 整首连念
audio/nXXX_lYY.mp3  = 逐句点读
audio/test.mp3      = 声音测试
可重跑，自动跳过已生成文件。
"""
import asyncio
import io
import json
import os

import edge_tts

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'audio')
VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-8%'          # 比正常稍慢，方便小班孩子跟读
CONCURRENCY = 8


def load_songs():
    src = io.open(os.path.join(BASE, 'data.js'), encoding='utf-8').read()
    data = json.loads(src.split('window.NURSERY_DATA = ', 1)[1].rstrip().rstrip(';'))
    return data


def build_jobs():
    jobs = []
    for s in load_songs():
        whole = s['title'] + '。' + '。'.join(s['lines']) + '。'
        jobs.append((whole, os.path.join(OUT, s['id'] + '.mp3')))
        for i, line in enumerate(s['lines'], 1):
            jobs.append((line + '。', os.path.join(OUT, '%s_l%02d.mp3' % (s['id'], i))))
    jobs.append(('你好呀，我是会念儿歌的小喇叭，点一下就能听哦。',
                 os.path.join(OUT, 'test.mp3')))
    return jobs


async def synth(text, path, sem):
    for attempt in range(3):
        try:
            async with sem:
                tts = edge_tts.Communicate(text, VOICE, rate=RATE)
                await tts.save(path)
            if os.path.getsize(path) > 500:
                return True
        except Exception:
            await asyncio.sleep(2 + attempt * 3)
    return False


async def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = [(t, p) for t, p in build_jobs() if not (os.path.exists(p) and os.path.getsize(p) > 500)]
    print('共需生成 %d 段（跳过已存在）' % len(jobs))
    if not jobs:
        print('全部已生成')
        return
    sem = asyncio.Semaphore(CONCURRENCY)
    results = await asyncio.gather(*[synth(t, p, sem) for t, p in jobs])
    failed = [p for ok, (_, p) in zip(results, jobs) if not ok]
    print('完成 %d，失败 %d' % (sum(results), len(failed)))
    for f in failed[:10]:
        print('  失败:', f)
    # 失败重试一轮
    if failed:
        sem2 = asyncio.Semaphore(4)
        results2 = await asyncio.gather(*[synth(next(t for t, p in jobs if p == f), f, sem2) for f in failed])
        print('重试后完成 %d' % sum(results2))


if __name__ == '__main__':
    asyncio.run(main())
