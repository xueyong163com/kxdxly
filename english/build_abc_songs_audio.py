# -*- coding: utf-8 -*-
"""生成英语页新增的两块内容所需音频：
1) ABC 字母名：audio/abc_a.mp3 ~ abc_z.mp3（edge-tts en-US-JennyNeural，用英文大写字母，确保读成字母名 /eɪ/ 等；有道会把单个元音 a/e/i/o/u 读成拼音）
2) q/v/x 三个缺词示例：audio/abc_ex_queen.mp3 / abc_ex_van.mp3 / abc_ex_box.mp3（edge-tts Jenny）
3) 儿歌逐行朗读：audio/song_<id>_L<n>.mp3（edge-tts en-US-JennyNeural，放慢）

运行：python build_abc_songs_audio.py  （可重复跑，已生成且正常的会跳过）
"""
import asyncio
import os
import re
import urllib.parse
import urllib.request

import edge_tts

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'audio')
os.makedirs(OUT, exist_ok=True)
SEM = 8

YOUDAO = 'https://dict.youdao.com/dictvoice?type=2&audio='

# 儿歌：id -> (中文名, 英文标题, [逐行歌词])
SONGS = {
    'twinkle': ('一闪一闪小星星', 'Twinkle Twinkle Little Star', [
        'Twinkle, twinkle, little star,',
        'How I wonder what you are!',
        'Up above the world so high,',
        'Like a diamond in the sky.',
        'Twinkle, twinkle, little star,',
        'How I wonder what you are!',
    ]),
    'oldmac': ('老麦克唐纳有个农场', 'Old MacDonald Had a Farm', [
        'Old MacDonald had a farm,',
        'Ee i ee i o!',
        'And on his farm he had a cow,',
        'Ee i ee i o!',
        'With a moo moo here, a moo moo there,',
        'Here a moo, there a moo, everywhere a moo moo.',
    ]),
    'wheels': ('公共汽车轮子', 'The Wheels on the Bus', [
        'The wheels on the bus go round and round,',
        'Round and round, round and round.',
        'The wheels on the bus go round and round,',
        'All through the town.',
    ]),
    'row': ('划小船', 'Row Row Row Your Boat', [
        'Row, row, row your boat,',
        'Gently down the stream.',
        'Merrily, merrily, merrily, merrily,',
        'Life is but a dream.',
    ]),
    'abcsong': ('字母歌', 'ABC Song', [
        'A B C D E F G,',
        'H I J K L M N O P,',
        'Q R S T U V W,',
        'X Y Z!',
        'Now I know my ABC,',
        'Next time won\'t you sing with me?',
    ]),
}

EX_WORDS = [  # q/v/x 缺词示例，用 Jenny 念
    ('abc_ex_queen', 'queen'),
    ('abc_ex_van', 'van'),
    ('abc_ex_box', 'box'),
]


def looks_mp3(data):
    if len(data) < 600:
        return False
    return data[:3] == b'ID3' or (data[0] == 0xFF and (data[1] & 0xE0) == 0xE0)


def fetch_youdao(text):
    url = YOUDAO + urllib.parse.quote(text)
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://dict.youdao.com/',
    })
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def sync_youdao(name, text):
    path = os.path.join(OUT, name)
    for attempt in range(4):
        try:
            data = fetch_youdao(text)
            if looks_mp3(data):
                open(path, 'wb').write(data)
                return True
            raise ValueError('bad %d' % len(data))
        except Exception as e:
            if attempt == 3:
                print('  FAIL', name, e)
                return False
            import time
            time.sleep(1 + attempt)


async def edge(name, text, rate='-14%', voice='en-US-JennyNeural'):
    path = os.path.join(OUT, name)
    if os.path.exists(path) and os.path.getsize(path) > 800:
        return True
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(path)
            if os.path.getsize(path) > 800:
                return True
        except Exception:
            await asyncio.sleep(1.2 * (attempt + 1))
    print('  FAIL', name)
    return False


async def main():
    # 1) 字母名：用英文大写字母，edge-tts 读成字母名（/eɪ/ /biː/ …），避免有道把单个元音读成拼音
    sem = asyncio.Semaphore(SEM)

    async def letter_job(ch):
        async with sem:
            return await edge('abc_%s.mp3' % ch, ch.upper(), rate='-8%')

    await asyncio.gather(*(letter_job(ch) for ch in 'abcdefghijklmnopqrstuvwxyz'))
    print('字母名音频已处理（26）')

    # 2) 示例词 q/v/x
    async def ej(name, text):
        async with sem:
            fn = name if name.endswith('.mp3') else (name + '.mp3')
            return await edge(fn, text)
    await asyncio.gather(*(ej(n, t) for n, t in EX_WORDS))
    print('示例词音频已处理（3）')

    # 3) 儿歌逐行
    song_tasks = []
    for sid, (zh, en, lines) in SONGS.items():
        for i, line in enumerate(lines, 1):
            song_tasks.append(('song_%s_L%d.mp3' % (sid, i), line))
    await asyncio.gather(*(ej(n, t) for n, t in song_tasks))
    print('儿歌逐行音频已处理（%d）' % len(song_tasks))


if __name__ == '__main__':
    asyncio.run(main())
