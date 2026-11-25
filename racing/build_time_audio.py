# -*- coding: utf-8 -*-
"""生成赛车时间控制语音：tc_warn.mp3（剩 1 分钟提醒）/ tc_timeup.mp3（时间到）"""
import asyncio, os
import edge_tts

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio')
VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-12%'

JOBS = [
    ('tc_warn.mp3',   '还有一分钟，就到休息时间啦。跑完这一圈，我们就要和赛车说再见咯！'),
    ('tc_timeup.mp3', '小赛车时间到啦！今天玩得真开心。和蹦蹦兔拉拉勾，明天再来开小车哦。拜拜！'),
]

async def gen():
    for name, text in JOBS:
        path = os.path.join(DIR, name)
        if os.path.exists(path) and os.path.getsize(path) > 1000:
            print('skip', name)
            continue
        for attempt in range(3):
            try:
                com = edge_tts.Communicate(text, VOICE, rate=RATE)
                await com.save(path)
                print('ok', name, os.path.getsize(path))
                break
            except Exception as e:
                print('retry', name, attempt, e)
                await asyncio.sleep(2)

if __name__ == '__main__':
    asyncio.run(gen())
