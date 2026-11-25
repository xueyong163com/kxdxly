# -*- coding: utf-8 -*-
"""生成五个学习模块共用的表扬语音，输出到项目根 praise/ 目录。

页面用绝对路径 /praise/xxx.mp3 引用（同一托管域名下通用）。
可重跑，已生成的自动跳过。
"""
import asyncio
import os

import edge_tts

BASE = os.path.dirname(os.path.abspath(__file__))
VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-10%'
JOBS = [
    ('hello', '你好呀！我是蹦蹦兔，今天也要开心学习哦！'),
    ('p1', '哇，真棒呀！'),
    ('p2', '太厉害啦！'),
    ('p3', '你可真聪明！'),
    ('p4', '哇塞，好厉害！'),
    ('p5', '继续加油哦！'),
]


async def main():
    os.makedirs(BASE, exist_ok=True)
    sem = asyncio.Semaphore(4)

    async def one(name, text):
        path = os.path.join(BASE, name + '.mp3')
        if os.path.exists(path) and os.path.getsize(path) > 1000:
            print('skip', name)
            return
        async with sem:
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(text, VOICE, rate=RATE).save(path)
                    print('OK', name, os.path.getsize(path), 'B')
                    return
                except Exception:
                    await asyncio.sleep(1 + attempt)
        raise SystemExit('FAIL ' + name)

    await asyncio.gather(*(one(n, t) for n, t in JOBS))


asyncio.run(main())
