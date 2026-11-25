# -*- coding: utf-8 -*-
"""为诗词页预生成「整首朗读」MP3（edge-tts，公共在线语音，无需密钥）。

每首诗一段：audio/p001.mp3 = 标题 + 全部诗句
另有 audio/test.mp3 供声音测试。运行：python build_audio.py（可重跑跳过已生成文件）
"""
import asyncio
import io
import json
import os

import edge_tts

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'audio')
VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-15%'


def load_poems():
    src = io.open(os.path.join(BASE, 'data.js'), encoding='utf-8').read()
    return json.loads(src.split('window.POEM_DATA = ', 1)[1].rstrip().rstrip(';'))


def build_jobs():
    jobs = []
    for p in load_poems():
        text = p['title'] + '。' + ''.join(l['hz'] for l in p['lines'])
        jobs.append((text, os.path.join(OUT, p['id'] + '.mp3')))
    jobs.append(('你好，能听到我说话吗？这个页面用的是录好的声音，微信里也能听哦。',
                 os.path.join(OUT, 'test.mp3')))
    return jobs


async def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = build_jobs()
    todo = [(t, p) for t, p in jobs if not (os.path.exists(p) and os.path.getsize(p) > 1000)]
    print('共需音频 %d 段，待生成 %d 段' % (len(jobs), len(todo)))
    sem = asyncio.Semaphore(6)
    failed = []

    async def one(text, path):
        async with sem:
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(text, VOICE, rate=RATE).save(path)
                    return True
                except Exception:
                    await asyncio.sleep(1 + attempt)
            failed.append(os.path.basename(path))
            return False

    results = await asyncio.gather(*(one(t, p) for t, p in todo))
    files = [f for f in os.listdir(OUT) if f.endswith('.mp3')]
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in files)
    print('本次成功 %d 段，累计 %d 个文件，%.2f MB' %
          (sum(1 for r in results if r), len(files), total / 1024 / 1024))
    print('失败：', failed[:20] if failed else '无')


if __name__ == '__main__':
    asyncio.run(main())
