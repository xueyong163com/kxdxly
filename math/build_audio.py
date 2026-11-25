# -*- coding: utf-8 -*-
"""为数学页预生成 MP3（edge-tts）。

audio/mXXX.mp3   = 题干（330 段，读 data.js 的 say）
audio/n00~n20.mp3 = 数字读音 0~20
audio/lv01~lv33.mp3 = 关卡名
audio/s01~s06.mp3 = 形状名（圆形/三角形/正方形/长方形/星形/心形）
audio/w01~w04.mp3 = 方位词（上面/下面/左边/右边）
audio/d01~d05.mp3 = 序数（第一~第五）
audio/test.mp3   = 声音测试
可重跑，自动跳过已生成文件。
"""
import asyncio
import io
import json
import os

import edge_tts

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'audio')
VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-10%'          # 稍慢一点，方便小朋友听清
CONCURRENCY = 8

CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
          '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八',
          '十九', '二十']
CN_ORD = CN_NUM[1:] + ['二十一', '二十二', '二十三', '二十四', '二十五',
                       '二十六', '二十七', '二十八', '二十九', '三十',
                       '三十一', '三十二', '三十三']
SHAPE_WORDS = ['圆形', '三角形', '正方形', '长方形', '星形', '心形']
POS_WORDS = ['上面', '下面', '左边', '右边']
ORD_WORDS = ['第一', '第二', '第三', '第四', '第五']


def load_data():
    src = io.open(os.path.join(BASE, 'data.js'), encoding='utf-8').read()
    data = json.loads(src.split('window.MATH_DATA = ', 1)[1].rstrip().rstrip(';'))
    meta = json.loads(src.split('window.MATH_META = ', 1)[1]
                      .split('window.MATH_DATA', 1)[0].rstrip().rstrip(';'))
    return meta, data


def build_jobs():
    meta, data = load_data()
    jobs = []
    # 题干（100 段）
    for q in data:
        jobs.append((q['say'], os.path.join(OUT, q['id'] + '.mp3')))
    # 数字读音 0~20
    for i, w in enumerate(CN_NUM):
        jobs.append((w + '。', os.path.join(OUT, 'n%02d.mp3' % i)))
    # 关卡名（lv01 的"数一数"用同音字"鼠一鼠"保证读 shǔ）
    for i, lv in enumerate(meta['levels']):
        name = lv['name'].replace('数一数', '鼠一鼠').replace(' ', '')
        jobs.append(('第%s关，%s。' % (CN_ORD[i], name),
                     os.path.join(OUT, lv['key'] + '.mp3')))
    # 形状名（答对认形状后播放）
    for i, w in enumerate(SHAPE_WORDS):
        jobs.append((w + '。', os.path.join(OUT, 's%02d.mp3' % (i + 1))))
    # 方位词（答对方位题后播放）
    for i, w in enumerate(POS_WORDS):
        jobs.append((w + '。', os.path.join(OUT, 'w%02d.mp3' % (i + 1))))
    # 序数（答对排第几后播放）
    for i, w in enumerate(ORD_WORDS):
        jobs.append((w + '。', os.path.join(OUT, 'd%02d.mp3' % (i + 1))))
    # 测试音
    jobs.append(('你好呀，我是数字小老师，点一下就开始玩哦。',
                 os.path.join(OUT, 'test.mp3')))
    return jobs


async def synth(text, path, sem):
    for attempt in range(3):
        try:
            async with sem:
                tts = edge_tts.Communicate(text, VOICE, rate=RATE)
                await tts.save(path)
            if os.path.getsize(path) > 500:
                return True
        except Exception:
            await asyncio.sleep(2 + attempt * 3)
    return False


async def main():
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    all_jobs = build_jobs()
    jobs = [(t, p) for t, p in all_jobs if not os.path.exists(p)]
    print('待生成 %d 段（已存在 %d 段）' % (
        len(jobs), len(all_jobs) - len(jobs)))
    sem = asyncio.Semaphore(CONCURRENCY)
    results = await asyncio.gather(*[synth(t, p, sem) for t, p in jobs])
    fail = [p for ok, (_, p) in zip(results, jobs) if not ok]
    if fail:
        print('失败 %d 段:' % len(fail))
        for p in fail:
            print('  ', os.path.basename(p))
        raise SystemExit(1)
    print('全部完成')


if __name__ == '__main__':
    asyncio.run(main())
