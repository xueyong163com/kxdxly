# -*- coding: utf-8 -*-
"""生成「可心学知识」闯关题库 data.js（500 道全新题，25 关 × 20 题）。

题目源：questions.txt（人工编写，每行 题目|正确答案|干扰1|干扰2|小知识，## 开头为关卡）。
正确答案统一写在第 2 段，生成时按题目序号打散位置，避免孩子记住位置。
运行：python build_data.py
"""
import io
import json
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))

# 25 个主题关复用页面里已有的 11 组手绘插画
ART_MAP = {
    '动物朋友': 'animals', '动物本领': 'animals', '鸟儿和虫虫': 'nature',
    '水里游的': 'nature', '户外安全': 'safety', '家里安全': 'safety',
    '身体小秘密': 'body', '五官本领': 'body', '好习惯': 'habits',
    '有礼貌': 'habits', '自己的事自己做': 'habits', '大自然': 'nature',
    '天气': 'nature', '春夏秋冬': 'nature', '数字和数数': 'numbers',
    '形状和颜色': 'colours', '好吃的': 'food', '蔬菜水果': 'food',
    '家里的事': 'home', '生活用品': 'home', '交通出行': 'transport',
    '节日和习俗': 'transport', '幼儿园': 'home',
    '声音和音乐': 'nature', '小小观察家': 'numbers',
}


def load_source():
    groups = []
    cur = None
    for raw in io.open(os.path.join(BASE, 'questions.txt'), encoding='utf-8'):
        line = raw.strip()
        if not line:
            continue
        if line.startswith('## '):
            parts = line[3:].split('|')
            assert len(parts) == 3, '关卡行格式错: ' + line
            cur = {'name': parts[0], 'sub': parts[1], 'art': parts[2], 'qs': []}
            groups.append(cur)
        else:
            assert cur is not None, '题目出现在关卡之前: ' + line
            parts = line.split('|')
            assert len(parts) == 5, '题目格式错: ' + line
            q, right, w1, w2, tip = [x.strip() for x in parts]
            assert q and right and w1 and w2 and tip, '空字段: ' + line
            assert len({right, w1, w2}) == 3, '选项重复: ' + line
            cur['qs'].append((q, [right, w1, w2], tip))
    return groups


def main():
    groups = load_source()
    assert len(groups) == 25, '关卡数应为 25，实际 %d' % len(groups)
    assert all(len(g['qs']) == 20 for g in groups), '每关应为 20 题'

    questions, levels, seen = [], [], set()
    for gi, g in enumerate(groups):
        key = 'lv%02d' % (gi + 1)
        levels.append({'key': key, 'name': g['name'], 'sub': g['sub'],
                       'art': ART_MAP[g['name']], 'count': len(g['qs'])})
        for q, options, tip in g['qs']:
            assert q not in seen, '题干重复: ' + q
            seen.add(q)
            right, wrong = options[0], options[1:]
            pos = len(questions) % len(options)
            shuffled = list(wrong)
            shuffled.insert(pos, right)
            questions.append({
                'id': 'q%03d' % (len(questions) + 1),
                'level': key,
                'q': q,
                'options': shuffled,
                'answer': pos,
                'tip': tip,
                'art': ART_MAP[g['name']],
            })

    assert len(questions) == 500, '应为 500 题'
    out = os.path.join(BASE, 'data.js')
    with io.open(out, 'w', encoding='utf-8') as f:
        f.write('/* 自动生成，勿手改；题库源 questions.txt，生成脚本 build_data.py */\n')
        f.write('window.QUIZ_META = %s;\n' % json.dumps({
            'total': len(questions),
            'levels': levels,
            'note': '幼儿园中班常识题，人工编写；答对后念一句小知识',
        }, ensure_ascii=False))
        f.write('window.QUIZ_DATA = %s;\n' % json.dumps(questions, ensure_ascii=False, separators=(',', ':')))

    print('生成题目：', len(questions), '| 关卡：', len(levels))
    print('答案位置分布：', {i: sum(1 for q in questions if q['answer'] == i) for i in range(3)})
    print('插画 key：', sorted({q['art'] for q in questions}))
    print('文件体积：%.1f KB' % (os.path.getsize(out) / 1024))


if __name__ == '__main__':
    main()
