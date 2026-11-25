# -*- coding: utf-8 -*-
"""基频分析：判断“鹅鹅鹅”实际声调（二声升 / 四声降）。
用法：python _tone_check.py <mp3路径> [<mp3路径> ...]
"""
import sys

import parselmouth


def f0_track(path):
    snd = parselmouth.Sound(path)
    pitch = snd.to_pitch(time_step=0.01, pitch_floor=100, pitch_ceiling=500)
    xs, ys = [], []
    for i in range(1, pitch.get_number_of_frames() + 1):
        f = pitch.get_value_in_frame(i)
        t = pitch.get_time_from_frame_number(i)
        if f and f > 0:
            xs.append(t)
            ys.append(f)
    return xs, ys


def tone_of(path):
    xs, ys = f0_track(path)
    if len(ys) < 6:
        return 'F0点太少(%d)' % len(ys), []
    # 按 0.12s 静音间隙切音节
    segs, cur = [], [0]
    for i in range(1, len(xs)):
        if xs[i] - xs[i - 1] > 0.12:
            segs.append(cur)
            cur = []
        cur.append(i)
    segs.append(cur)
    segs = [s for s in segs if len(s) >= 3]
    out = []
    for s in segs:
        vals = [ys[i] for i in s]
        # 用前后 25% 均值代表起/终，抗抖动
        k = max(2, len(vals) // 4)
        f0, f1 = sum(vals[:k]) / k, sum(vals[-k:]) / k
        lo, hi = min(vals), max(vals)
        if f1 > f0 * 1.12:
            t = '二声(升)'
        elif f1 < f0 * 0.88:
            t = '四声(降)'
        elif hi > lo * 1.5:
            t = '曲折'
        else:
            t = '平'
        out.append('%s 起=%.0fHz 终=%.0fHz 区间=[%.0f,%.0f]' % (t, f0, f1, lo, hi))
    return '%d 个音节' % len(segs), out


for p in sys.argv[1:]:
    kind, lines = tone_of(p)
    print('== %s : %s' % (p.split('/')[-1].split('\\')[-1], kind))
    for l in lines:
        print('   ', l)
