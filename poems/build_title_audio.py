# -*- coding: utf-8 -*-
"""为诗词页生成标题朗读 MP3（edge-tts）。

audio/tXXX.mp3 = 「诗题。唐代，作者。」（300 段）
录音文本做同音字替换修正读音（页面显示不变）：
  - 多音字：鹿柴(zhài→寨)、出塞/塞下曲(sài/qǔ)、清平调(diào)、乐游原(lè)、
    长干行(cháng)、宿(sù)、漫兴(xìng)、玄都观(guàn)、阙(赴阙/阙题 què、补阙 quē)、
    重送/重帏(chóng)、唱和(hè)、没蕃(mò)、二载(zǎi)、给事(jǐ)、婕妤(jié yú)等
  - 生僻作者名：元稹/林稹(zhěn)、岑参(shēn)、张说(yuè)、李适之(kuò)、
    温庭筠(yún)、王禹偁(chēng)、曹豳(bīn)、苏颋(tǐng)、韩翃(hóng)、郑畋(tián)、
    沈佺期(quán)、刘昚虚(shèn)、耿𣲗(wéi)、张栻(shì)、孙逖(tì)、韩偓(wò)、
    赵嘏(gǔ)、洪咨夔(kuí)、谢枋得(fāng) 等
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
RATE = '-15%'
CONCURRENCY = 8

TITLE_FIX = [
    ('鹿柴', '鹿寨'),
    ('出塞', '出赛'),
    ('塞下曲', '赛下取'),
    ('江南曲', '江南取'),
    ('秋夜曲', '秋夜取'),
    ('春宫曲', '春宫取'),
    ('乐游原', '勒游原'),
    ('清平调', '清平吊'),
    ('长干行', '常干行'),
    ('左掖梨花', '左夜梨花'),
    ('马嵬坡', '马维坡'),
    ('绝句漫兴', '绝句漫幸'),
    ('漫兴', '漫幸'),
    ('玄都观', '玄都灌'),
    ('赴阙', '赴却'),
    ('阙题', '却题'),
    ('补阙', '补缺'),
    ('重送', '虫送'),
    ('重帏', '虫帏'),
    ('和晋陵', '贺晋陵'),
    ('和贾至', '贺贾至'),
    ('奉和', '奉贺'),
    ('没蕃', '莫蕃'),
    ('二载', '二宰'),
    ('给事', '己事'),
    ('婕妤', '捷于'),
    ('三闾', '三吕'),
    ('韩绰', '韩辍'),
    ('滁州', '除州'),
    ('临安邸', '临安底'),
    ('梓州', '紫州'),
    ('辋川', '网川'),
    ('山居秋暝', '山居秋明'),
    ('大庾岭', '大雨岭'),
    ('灞上', '坝上'),
    ('答李浣', '答李换'),
    ('宿', '速'),
]

AUTHOR_FIX = [
    ('元稹', '元枕'),
    ('岑参', '岑深'),
    ('张说', '张悦'),
    ('李适之', '李阔之'),
    ('温庭筠', '温庭云'),
    ('曾几', '曾机'),
    ('王禹偁', '王禹称'),
    ('曹豳', '曹彬'),
    ('林稹', '林枕'),
    ('苏颋', '苏挺'),
    ('韩翃', '韩宏'),
    ('郑畋', '郑田'),
    ('沈佺期', '沈全期'),
    ('刘昚虚', '刘慎虚'),
    ('耿𣲗', '耿韦'),
    ('张栻', '张世'),
    ('孙逖', '孙替'),
    ('韩偓', '韩握'),
    ('赵嘏', '赵古'),
    ('洪咨夔', '洪咨奎'),
    ('谢枋得', '谢方得'),
]


def apply_fixes(s, fixes):
    for old, new in fixes:
        s = s.replace(old, new)
    return s


def load_data():
    src = io.open(os.path.join(BASE, 'data.js'), encoding='utf-8').read()
    data = json.loads(src.split('window.POEM_DATA = ', 1)[1].rstrip().rstrip(';'))
    return data


def say_text(p):
    t = apply_fixes(p.get('title') or '', TITLE_FIX)
    a = apply_fixes(p.get('author') or '', AUTHOR_FIX)
    d = p.get('dynasty') or '唐'
    s = '%s。%s代，%s。' % (t, d, a)
    return s.replace('·', '，').replace('（', '，').replace('）', '')


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
    data = load_data()
    jobs = []
    for p in data:
        path = os.path.join(OUT, p['id'].replace('p', 't') + '.mp3')
        jobs.append((say_text(p), path))
    todo = [(t, p) for t, p in jobs if not os.path.exists(p)]
    print('待生成 %d 段（已存在 %d 段）' % (len(todo), len(jobs) - len(todo)))
    sem = asyncio.Semaphore(CONCURRENCY)
    results = await asyncio.gather(*[synth(t, p, sem) for t, p in todo])
    fail = [p for ok, (_, p) in zip(results, todo) if not ok]
    if fail:
        print('失败 %d 段:' % len(fail))
        for p in fail:
            print('  ', os.path.basename(p))
        raise SystemExit(1)
    print('全部完成')
    # 打印几个样例供人工核对
    for p in data[:3] + [x for x in data if x['id'] in ('p011', 'p031', 'p129', 'p141')]:
        print(' ', p['id'], '->', say_text(p))


if __name__ == '__main__':
    asyncio.run(main())
