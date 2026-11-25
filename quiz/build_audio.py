# -*- coding: utf-8 -*-
"""为闯关页预生成中文朗读 MP3（edge-tts，公共在线语音，无需密钥）。

每题两段：
  audio/q001.mp3     题目 + 逐个选项（进题自动播 / 再听一遍 / 把选项念一遍）
  audio/q001_ok.mp3  答对啦 + 小知识
另有通用反馈：wrong / win / test

运行：python build_audio.py   （已存在的文件会跳过，可重跑续传）
"""
import asyncio
import io
import json
import os

import edge_tts

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'audio')
VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-12%'


def load_questions():
    src = io.open(os.path.join(BASE, 'data.js'), encoding='utf-8').read()
    return json.loads(src.split('window.QUIZ_DATA = ', 1)[1].rstrip().rstrip(';'))


def build_jobs():
    qs = load_questions()
    jobs = []
    for q in qs:
        parts = [q['q']]
        for i, opt in enumerate(q['options']):
            parts.append('第' + ['一', '二', '三'][i] + '个，' + opt + '。')
        parts.append('请选一选。')
        jobs.append((' '.join(parts), os.path.join(OUT, q['id'] + '.mp3')))
        jobs.append(('答对啦！' + q['tip'], os.path.join(OUT, q['id'] + '_ok.mp3')))
    jobs += [
        ('再想一想，再听一遍，换个答案试试看。', os.path.join(OUT, 'wrong.mp3')),
        ('通关啦！你真棒，得到好多小星星！', os.path.join(OUT, 'win.mp3')),
        ('你好，能听到我说话吗？这个页面用的是录好的声音，微信里也能听哦。', os.path.join(OUT, 'test.mp3')),
    ]
    return jobs


async def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = build_jobs()
    todo = [(t, p) for t, p in jobs if not (os.path.exists(p) and os.path.getsize(p) > 1000)]
    print('共需音频 %d 段，待生成 %d 段' % (len(jobs), len(todo)))
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

    results = await asyncio.gather(*(one(t, p) for t, p in todo))
    ok = sum(1 for r in results if r)
    files = [f for f in os.listdir(OUT) if f.endswith('.mp3')]
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in files)
    print('本次成功 %d 段，累计文件 %d 个，总体积 %.2f MB' % (ok, len(files), total / 1024 / 1024))
    if failed:
        print('失败文件：', failed[:20])
    else:
        print('全部生成完成')


if __name__ == '__main__':
    asyncio.run(main())
