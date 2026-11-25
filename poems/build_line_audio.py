# -*- coding: utf-8 -*-
"""为诗词页生成「逐句点读」MP3（edge-tts，公共在线语音，无需密钥）。

每首诗的每一句一段：audio/p001_1.mp3 ... audio/p300_8.mp3
整首朗读音频（audio/p001.mp3）由 build_audio.py 生成，两个脚本互不覆盖。
运行：python build_line_audio.py（可重跑，跳过已生成文件）
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
        for i, line in enumerate(p['lines'], 1):
            text = (line.get('hz') or '').strip()
            if not text:
                continue
            jobs.append((text, os.path.join(OUT, '%s_%d.mp3' % (p['id'], i))))
    return jobs


async def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = build_jobs()
    todo = [(t, p) for t, p in jobs if not (os.path.exists(p) and os.path.getsize(p) > 1000)]
    print('共需逐句音频 %d 段，待生成 %d 段' % (len(jobs), len(todo)), flush=True)
    sem = asyncio.Semaphore(8)
    failed = []
    done = 0

    async def one(text, path):
        nonlocal done
        async with sem:
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(text, VOICE, rate=RATE).save(path)
                    done += 1
                    if done % 100 == 0:
                        print('  已生成 %d / %d' % (done, len(todo)), flush=True)
                    return True
                except Exception:
                    await asyncio.sleep(1 + attempt)
            failed.append(os.path.basename(path))
            return False

    await asyncio.gather(*(one(t, p) for t, p in todo))
    files = [f for f in os.listdir(OUT) if f.endswith('.mp3')]
    lines = [f for f in files if '_' in f]
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in lines)
    print('本次成功 %d 段，逐句文件累计 %d 个，%.2f MB' %
          (sum(1 for t, p in todo if os.path.basename(p) not in failed), len(lines), total / 1024 / 1024))
    print('失败：', failed[:20] if failed else '无')
    print('FAILED_COUNT=%d' % len(failed))


if __name__ == '__main__':
    asyncio.run(main())
