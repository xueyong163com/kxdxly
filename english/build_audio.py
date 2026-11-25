# -*- coding: utf-8 -*-
"""为英语页预生成 MP3（edge-tts，公共在线语音，无需密钥）。

每个单词两段：
  audio/w001.mp3     英文单词（en-US 音色，放慢）
  audio/w001_zh.mp3  中文意思（zh-CN 音色）
另有 audio/test.mp3 供声音测试。运行：python build_audio.py（可重跑跳过已生成文件）
"""
import asyncio
import io
import json
import os

import edge_tts

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'audio')
VOICE_EN = 'en-US-AriaNeural'
VOICE_ZH = 'zh-CN-XiaoxiaoNeural'


def load_words():
    src = io.open(os.path.join(BASE, 'data.js'), encoding='utf-8').read()
    return json.loads(src.split('window.WORD_DATA = ', 1)[1].rstrip().rstrip(';'))


def build_jobs():
    jobs = []
    for w in load_words():
        jobs.append((w['en'], VOICE_EN, '-18%', os.path.join(OUT, w['id'] + '.mp3')))
        jobs.append((w['zh'], VOICE_ZH, '-10%', os.path.join(OUT, w['id'] + '_zh.mp3')))
    jobs.append(('你好，能听到我说话吗？这个页面用的是录好的声音，微信里也能听哦。',
                 VOICE_ZH, '-10%', os.path.join(OUT, 'test.mp3')))
    return jobs


async def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = build_jobs()
    todo = [j for j in jobs if not (os.path.exists(j[3]) and os.path.getsize(j[3]) > 1000)]
    print('共需音频 %d 段，待生成 %d 段' % (len(jobs), len(todo)))
    sem = asyncio.Semaphore(6)
    failed = []

    async def one(text, voice, rate, path):
        async with sem:
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(text, voice, rate=rate).save(path)
                    return True
                except Exception:
                    await asyncio.sleep(1 + attempt)
            failed.append(os.path.basename(path))
            return False

    results = await asyncio.gather(*(one(*j) for j in todo))
    files = [f for f in os.listdir(OUT) if f.endswith('.mp3')]
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in files)
    print('本次成功 %d 段，累计 %d 个文件，%.2f MB' %
          (sum(1 for r in results if r), len(files), total / 1024 / 1024))
    print('失败：', failed[:20] if failed else '无')


if __name__ == '__main__':
    asyncio.run(main())
