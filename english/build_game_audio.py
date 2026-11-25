# -*- coding: utf-8 -*-
"""英语游乐场音频：游戏引导（中文）+ 谁在说话句子（英文），可续传。

g01  听音点图引导（已有）
g02  泡泡爆爆引导
g03  翻翻配对引导
g04  谁在说话引导
s01~s11  动物英文句子（en-US-AriaNeural）
"""
import asyncio, os, sys
import edge_tts

VOICE_ZH = 'zh-CN-XiaoxiaoNeural'
RATE_ZH = '-12%'
VOICE_EN = 'en-US-AriaNeural'
RATE_EN = '-12%'
BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'audio')
os.makedirs(OUT, exist_ok=True)

TASKS = [
    ('g02.mp3', VOICE_ZH, RATE_ZH, '泡泡爆爆乐！听到哪个单词，就把哪个泡泡戳破！'),
    ('g03.mp3', VOICE_ZH, RATE_ZH, '翻翻配对！找出两张一样的卡片！'),
    ('g04.mp3', VOICE_ZH, RATE_ZH, '听一听，是谁在说话？点一点它！'),
    ('s01.mp3', VOICE_EN, RATE_EN, 'Meow meow! I am a cat!'),
    ('s02.mp3', VOICE_EN, RATE_EN, 'Woof woof! I am a dog!'),
    ('s03.mp3', VOICE_EN, RATE_EN, 'Quack quack! I am a duck!'),
    ('s04.mp3', VOICE_EN, RATE_EN, 'I am a fish! I can swim!'),
    ('s05.mp3', VOICE_EN, RATE_EN, 'Hop hop hop! I am a rabbit!'),
    ('s06.mp3', VOICE_EN, RATE_EN, 'Oink oink! I am a pig!'),
    ('s07.mp3', VOICE_EN, RATE_EN, 'Tweet tweet! I am a bird!'),
    ('s08.mp3', VOICE_EN, RATE_EN, 'Moo! Moo! I am a cow!'),
    ('s09.mp3', VOICE_EN, RATE_EN, 'Baa baa! I am a sheep!'),
    ('s10.mp3', VOICE_EN, RATE_EN, 'Ribbit ribbit! I am a frog!'),
    ('s11.mp3', VOICE_EN, RATE_EN, 'Squeak squeak! I am a mouse!'),
    ('s12.mp3', VOICE_EN, RATE_EN, 'Neigh! Neigh! I am a horse!'),
    ('s13.mp3', VOICE_EN, RATE_EN, 'Roar! Roar! I am a lion!'),
    ('s14.mp3', VOICE_EN, RATE_EN, 'Toot! Toot! I am an elephant!'),
    ('s15.mp3', VOICE_EN, RATE_EN, 'Ooh ooh! Ah ahh! I am a monkey!'),
    ('s16.mp3', VOICE_EN, RATE_EN, 'Buzz! Buzz! I am a bee!'),
]


async def gen(name, voice, rate, text, retry=3):
    path = os.path.join(OUT, name)
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return True
    for k in range(retry):
        try:
            com = edge_tts.Communicate(text, voice, rate=rate)
            await com.save(path)
            if os.path.getsize(path) > 500:
                return True
        except Exception:
            await asyncio.sleep(1.2 * (k + 1))
    return False


async def main():
    sem = asyncio.Semaphore(6)

    async def run(t):
        async with sem:
            return await gen(*t)

    results = await asyncio.gather(*(run(t) for t in TASKS))
    print('完成 %d / %d' % (sum(results), len(TASKS)))
    for t, ok in zip(TASKS, results):
        if not ok:
            print('失败:', t[0])
    if not all(results):
        sys.exit(1)


asyncio.run(main())
