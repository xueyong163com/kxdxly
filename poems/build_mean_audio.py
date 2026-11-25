# -*- coding: utf-8 -*-
"""为每首诗的精讲（白话串讲）生成朗读 MP3：audio/m001.mp3 ~ m300.mp3。

与整首（p001.mp3）、逐句（p001_1.mp3）互不冲突。
已存在的文件会跳过，可重跑续传。
"""
import asyncio
import io
import json
import os
import re

import edge_tts

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'audio')
VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-15%'


def load_poems():
    src = io.open(os.path.join(BASE, 'data.js'), encoding='utf-8').read()
    return json.loads(re.search(r'window\.POEM_DATA = (\[.*?\]);', src, re.S).group(1))


def build_jobs():
    jobs = []
    for p in load_poems():
        text = p['title'] + '。' + p['meaning']
        jobs.append((text, os.path.join(OUT, p['id'].replace('p', 'm') + '.mp3')))
    return jobs


async def gen(text, path, sem, retry=3):
    async with sem:
        for attempt in range(retry):
            try:
                com = edge_tts.Communicate(text, VOICE, rate=RATE)
                await com.save(path)
                if os.path.getsize(path) > 1000:
                    return True
            except Exception as e:
                if attempt == retry - 1:
                    print('失败 %s: %s' % (path, e))
        return False


async def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = build_jobs()
    todo = [(t, p) for t, p in jobs if not (os.path.exists(p) and os.path.getsize(p) > 1000)]
    print('共需音频 %d 段，待生成 %d 段' % (len(jobs), len(todo)))
    sem = asyncio.Semaphore(8)
    fails = [j for j in todo if not await gen(j[0], j[1], sem)]
    # 失败重试一轮
    if fails:
        print('重试 %d 段' % len(fails))
        sem2 = asyncio.Semaphore(4)
        fails = [j for j in fails if not await gen(j[0], j[1], sem2)]
    print('全部生成完成' if not fails else '仍有失败: %s' % [f[1] for f in fails])


if __name__ == '__main__':
    asyncio.run(main())
