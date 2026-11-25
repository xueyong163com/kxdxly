# -*- coding: utf-8 -*-
"""把英文读音换成有道词典标准美音（dict.youdao.com/dictvoice，type=2=美音）。

覆盖范围：audio/w001~w317.mp3（单词）+ audio/s01~s16.mp3（游戏英文句子）。
中文 _zh.mp3 与游戏引导 g*.mp3 不动。
下载成功才覆盖原文件；失败保留旧的（旧的仍是 edge-tts 备胎）。
运行前请先执行 backup_old_audio.py。运行：python rebuild_audio_en.py
"""
import asyncio
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'audio')
URL = 'https://dict.youdao.com/dictvoice?type=2&audio='
SEM_LIMIT = 8

SENTENCES = [
    ('s01', 'Meow meow! I am a cat!'),
    ('s02', 'Woof woof! I am a dog!'),
    ('s03', 'Quack quack! I am a duck!'),
    ('s04', 'I am a fish! I can swim!'),
    ('s05', 'Hop hop hop! I am a rabbit!'),
    ('s06', 'Oink oink! I am a pig!'),
    ('s07', 'Tweet tweet! I am a bird!'),
    ('s08', 'Moo! Moo! I am a cow!'),
    ('s09', 'Baa baa! I am a sheep!'),
    ('s10', 'Ribbit ribbit! I am a frog!'),
    ('s11', 'Squeak squeak! I am a mouse!'),
    ('s12', 'Neigh! Neigh! I am a horse!'),
    ('s13', 'Roar! Roar! I am a lion!'),
    ('s14', 'Toot! Toot! I am an elephant!'),
    ('s15', 'Ooh ooh! Ah ahh! I am a monkey!'),
    ('s16', 'Buzz! Buzz! I am a bee!'),
]


def load_words():
    src = io.open(os.path.join(BASE, 'data.js'), encoding='utf-8').read()
    return json.loads(src.split('window.WORD_DATA = ', 1)[1].rstrip().rstrip(';'))


def looks_like_mp3(data):
    if len(data) < 600:
        return False
    if data[:3] == b'ID3':
        return True
    return data[0] == 0xFF and (data[1] & 0xE0) == 0xE0


def fetch(text):
    url = URL + urllib.parse.quote(text)
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://dict.youdao.com/',
    })
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def sync_download(name, text, results):
    path = os.path.join(OUT, name)
    tmp = path + '.tmp'
    for attempt in range(4):
        try:
            data = fetch(text)
            if looks_like_mp3(data):
                with open(tmp, 'wb') as f:
                    f.write(data)
                os.replace(tmp, path)
                results[name] = len(data)
                return
            raise ValueError('not mp3, %d bytes' % len(data))
        except Exception as e:
            if attempt == 3:
                results[name] = 'FAIL: %s' % e
            else:
                import time
                time.sleep(1 + attempt)


async def main():
    words = load_words()
    jobs = [(w['id'] + '.mp3', w['en']) for w in words] + SENTENCES
    print('待替换 %d 个文件' % len(jobs))
    sem = asyncio.Semaphore(SEM_LIMIT)
    results = {}

    async def run(job):
        async with sem:
            await asyncio.get_event_loop().run_in_executor(None, sync_download, job[0], job[1], results)

    await asyncio.gather(*(run(j) for j in jobs))
    ok = [k for k, v in results.items() if isinstance(v, int)]
    bad = {k: v for k, v in results.items() if isinstance(v, str)}
    print('成功 %d / %d' % (len(ok), len(jobs)))
    if bad:
        print('失败清单：')
        for k, v in bad.items():
            print(' ', k, v)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    asyncio.run(main())
