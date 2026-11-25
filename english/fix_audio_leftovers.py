# -*- coding: utf-8 -*-
"""补齐 rebuild_audio_en.py 的两 类尾巴：
1. 有道返回 WAV 的 6 个词（RIFF 头）——直接按原字节写入（浏览器按内容解码）。
2. 句子 s01~s16——有道不支持长句，改用 edge-tts en-US-JennyNeural（更自然清晰）。
"""
import asyncio
import io
import json
import os
import urllib.parse
import urllib.request

import edge_tts

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'audio')

WAV_WORDS = ['w045', 'w050', 'w054', 'w057', 'w143', 'w230']

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


def fetch(text):
    url = 'https://dict.youdao.com/dictvoice?type=2&audio=' + urllib.parse.quote(text)
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://dict.youdao.com/',
    })
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def main_sync():
    src = io.open(os.path.join(BASE, 'data.js'), encoding='utf-8').read()
    words = json.loads(src.split('window.WORD_DATA = ', 1)[1].rstrip().rstrip(';'))
    d = {w['id']: w['en'] for w in words}
    for wid in WAV_WORDS:
        text = d[wid]
        for attempt in range(4):
            try:
                data = fetch(text)
                if data[:4] == b'RIFF' and data[8:12] == b'WAVE' and len(data) > 2000:
                    with open(os.path.join(OUT, wid + '.mp3'), 'wb') as f:
                        f.write(data)
                    print(wid, text, '-> WAV', len(data))
                    break
                raise ValueError('bad head %r' % data[:12])
            except Exception as e:
                if attempt == 3:
                    print(wid, 'FAIL', e)


async def sentences():
    sem = asyncio.Semaphore(4)

    async def one(name, text):
        async with sem:
            path = os.path.join(OUT, name + '.mp3')
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(text, 'en-US-JennyNeural', rate='-10%').save(path)
                    if os.path.getsize(path) > 1000:
                        print(name, '-> Jenny', os.path.getsize(path))
                        return
                except Exception:
                    await asyncio.sleep(1 + attempt)
            print(name, 'FAIL')

    await asyncio.gather(*(one(n, t) for n, t in SENTENCES))


if __name__ == '__main__':
    main_sync()
    asyncio.run(sentences())
