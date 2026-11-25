# -*- coding: utf-8 -*-
"""备份现有英文读音（w*.mp3 与 s*.mp3）到 audio_backup_tts/，方便回滚。"""
import os
import re
import shutil

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'audio')
BK = os.path.join(BASE, 'audio_backup_tts')
os.makedirs(BK, exist_ok=True)
pat = re.compile(r'^[ws]\d+\.mp3$')
n = 0
for f in os.listdir(OUT):
    if pat.match(f):
        shutil.copy2(os.path.join(OUT, f), os.path.join(BK, f))
        n += 1
print('备份 %d 个文件到 audio_backup_tts/' % n)
