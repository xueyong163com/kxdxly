# -*- coding: utf-8 -*-
"""修复《咏鹅》“鹅鹅鹅”读音：edge-tts 对孤立叠字“鹅”固定读降调（四声），
换同音字无效（鹅/俄/额 三字 F0 曲线完全相同，已实测）。

方案：重新合成并利用 WordBoundary 字级时间戳精确定位每个“鹅”，
用 Praat PSOLA 把该音节的基频曲线改造成标准二声（阳平：低起稳升），
最后 lameenc 编码回 mp3。仅处理 p001.mp3（整首）与 p001_1.mp3（第一句）。
"""
import asyncio
import io
import os

import edge_tts
import lameenc
import numpy as np
import parselmouth
from parselmouth.praat import call

BASE = os.path.dirname(os.path.abspath(__file__))
VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-15%'
F0_BASE = 222.0        # XiaoxiaoNeural 平均基频（实测 190~260Hz 域）


async def synth_with_bounds(text):
    """合成并返回 (mp3_bytes, [(word, off_s, dur_s), ...])"""
    com = edge_tts.Communicate(text, VOICE, rate=RATE, boundary='WordBoundary')
    mp3, bounds = bytearray(), []
    async for chunk in com.stream():
        if chunk['type'] == 'audio':
            mp3.extend(chunk['data'])
        elif chunk['type'] == 'WordBoundary':
            bounds.append((chunk['text'], chunk['offset'] / 1e7,
                           chunk['duration'] / 1e7))
    return bytes(mp3), bounds


def fix_seg_to_tone2(seg_snd):
    """把一段语音的基频改成二声：207 → 226 → 329 Hz（低起缓升陡收）。"""
    manip = call(seg_snd, 'To Manipulation', 0.01, 100, 500)
    tier = call(manip, 'Extract pitch tier')
    dur = seg_snd.get_total_duration()
    call(tier, 'Remove points between', 0.0, dur)
    call(tier, 'Add point', 0.0, F0_BASE * 0.93)
    call(tier, 'Add point', dur * 0.4, F0_BASE * 1.02)
    call(tier, 'Add point', dur, F0_BASE * 1.48)
    call([tier, manip], 'Replace pitch tier')
    return call(manip, 'Get resynthesis (PSOLA)')


def fix_goose_audio(mp3_bytes, bounds, out_path):
    tmp_in = out_path + '.tmp.mp3'
    tmp_wav = out_path + '.tmp.wav'
    with open(tmp_in, 'wb') as f:
        f.write(mp3_bytes)
    snd = parselmouth.Sound(tmp_in)
    fs = snd.sampling_frequency
    arr = snd.values[0].copy()

    pad_l, pad_r = 0.03, 0.06     # 段边界外扩，吃干净过渡
    goose = [b for b in bounds if b[0] == '鹅']
    print('  音节词 %d 个，其中鹅 %d 个: %s' % (
        len(bounds), len(goose), [(w, round(o, 2)) for w, o, _ in bounds]))
    for _, off, dur in goose:
        t0 = max(0.0, off - pad_l)
        t1 = min(snd.get_total_duration(), off + dur + pad_r)
        seg = snd.extract_part(t0, t1)
        fixed = fix_seg_to_tone2(seg)
        fv = fixed.values[0]
        fade = int(0.006 * fs)
        if len(fv) > fade * 2:
            fv[:fade] *= np.linspace(0, 1, fade)
            fv[-fade:] *= np.linspace(1, 0, fade)
        i0, i1 = int(t0 * fs), int(t1 * fs)
        n = min(len(fv), i1 - i0)
        arr[i0:i0 + n] = fv[:n]

    new = parselmouth.Sound(arr, sampling_frequency=fs)
    new.save(tmp_wav, 'WAV')

    with open(tmp_wav, 'rb') as f:
        wav = f.read()
    import wave as wavmod
    wavmod_r = wavmod.open(tmp_wav, 'rb')
    nch, sw, fr, nf = (wavmod_r.getnchannels(), wavmod_r.getsampwidth(),
                       wavmod_r.getframerate(), wavmod_r.getnframes())
    pcm = wavmod_r.readframes(nf)
    wavmod_r.close()
    assert nch == 1 and sw == 2, (nch, sw)
    enc = lameenc.Encoder()
    enc.set_bit_rate(128)
    enc.set_in_sample_rate(fr)
    enc.set_channels(1)
    enc.set_quality(2)
    data = enc.encode(pcm) + enc.flush()
    with open(out_path, 'wb') as f:
        f.write(bytes(data))
    os.remove(tmp_in)
    os.remove(tmp_wav)
    print('  -> %s (%d bytes)' % (out_path, len(data)))


async def main():
    # 逐句：p001_1 = “鹅，鹅，鹅，”
    mp3, bounds = await synth_with_bounds('鹅，鹅，鹅，')
    print('p001_1:')
    fix_goose_audio(mp3, bounds, os.path.join(BASE, 'audio', 'p001_1.mp3'))

    # 整首：p001 = 标题。+全部诗句
    text = '咏鹅。鹅，鹅，鹅，曲项向天歌。白毛浮绿水，红掌拨清波。'
    mp3, bounds = await synth_with_bounds(text)
    print('p001:')
    fix_goose_audio(mp3, bounds, os.path.join(BASE, 'audio', 'p001.mp3'))
    print('OK')


asyncio.run(main())
