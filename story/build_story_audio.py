# -*- coding: utf-8 -*-
"""可心听故事 · 逐句朗读音频生成
读 stories.js，用 edge-tts(zh-CN-XiaoxiaoNeural 温柔女声) 把每句生成 audio/story_{id}_L{nn}.mp3。
用法: python build_story_audio.py
"""
import asyncio, json, os, sys

try:
    import edge_tts
except ImportError:
    sys.exit("缺少 edge_tts，请先: pip install edge-tts")

SRC = "stories.js"
OUT = "audio"
VOICE = "zh-CN-XiaoxiaoNeural"
sem = asyncio.Semaphore(6)

src = open(SRC, encoding="utf-8").read()
arr = json.loads(src.split("window.STORY_DATA = ", 1)[1].rstrip().rstrip(";"))
os.makedirs(OUT, exist_ok=True)

fails = []
done = 0

async def tts(name, text):
    global done
    path = os.path.join(OUT, name)
    if os.path.exists(path) and os.path.getsize(path) > 800:
        done += 1
        return
    last = None
    for attempt in range(3):
        try:
            async with sem:
                comm = edge_tts.Communicate(text, VOICE)
                await comm.save(path)
            if os.path.exists(path) and os.path.getsize(path) > 800:
                done += 1
                return
            last = "文件过小"
        except Exception as e:
            last = str(e)
            await asyncio.sleep(1.5)
    fails.append((name, text, last))

async def main():
    tasks = []
    total = 0
    for s in arr:
        for i, line in enumerate(s["lines"], 1):
            fn = "story_%s_L%02d.mp3" % (s["id"], i)
            tasks.append(tts(fn, line))
            total += 1
    print("共 %d 句，开始生成…" % total)
    await asyncio.gather(*tasks)
    print("成功 %d 句，失败 %d 句" % (done, len(fails)))
    if fails:
        print("失败列表:")
        for f in fails:
            print("  ", f[0], "->", f[2])

asyncio.run(main())
