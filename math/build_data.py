# -*- coding: utf-8 -*-
"""生成 math/data.js：可心学数学 330 题，33 关。

关卡：
  lv01 数一数(5以内)   lv02 比一比(哪边多)  lv03 加一加(5以内)
  lv04 减一减(5以内)   lv05 数字火车(接龙)  lv06 加一加(10以内)
  lv07 减一减(10以内)  lv08 比大小(哪个大)  lv09 又加又减(混合)
  lv10 小小数学王(总复习)
  ---- 高阶篇 ----
  lv11 认识十几        lv12 十加几(整十)    lv13 凑十歌(超十加法)
  lv14 找规律(等差)    lv15 加法高手(20内)  lv16 减法高手(算式)
  lv17 多几个(差值)    lv18 连着算(三数)    lv19 加减大师(混合)
  lv20 数学小状元(总复习)
  ---- 拓展篇（更多学习类型）----
  lv21 认一认形状      lv22 图形找一找      lv23 上下左右(方位)
  lv24 比长短(高低轻重) lv25 排第几(序数)   lv26 谁最大(三比)
  lv27 认识钟表        lv28 认识人民币      lv29 认识零
  lv30 图形规律        lv31 分类小能手      lv32 成组数(乘法启蒙)
  lv33 单双数

注意：TTS 文本全部用汉字数字；避免出现"数一数"（防读成 shù），
录音文本里"数"一律写作"鼠"（同音替换，页面展示不受影响）。
"""
import io
import json
import os
import random

random.seed(20261107)

BASE = os.path.dirname(os.path.abspath(__file__))

CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
      '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
      '二十一', '二十二', '二十三', '二十四', '二十五', '二十六', '二十七',
      '二十八', '二十九', '三十', '三十一', '三十二', '三十三']

MONEY_CN = {1: '一', 5: '五', 10: '十', 20: '二十', 50: '五十', 100: '一百'}


def cn(n):
    return CN[n]


def cnq(n):
    """量词前的数字：2 读"两"更自然（两个、两只）。"""
    return '两' if n == 2 else CN[n]


ICONS = ['duck', 'bird', 'apple', 'star', 'fish', 'flower', 'butterfly', 'balloon']

NAME = {
    'duck': '小鸭子', 'bird': '小鸟', 'apple': '苹果', 'star': '星星',
    'fish': '小鱼', 'flower': '小花', 'butterfly': '蝴蝶', 'balloon': '气球',
    'bear': '小熊', 'rabbit': '小兔子', 'tree': '大树', 'candy': '棒棒糖',
    'banana': '香蕉', 'watermelon': '大西瓜', 'grape': '葡萄',
}
QUANT = {
    'duck': '只', 'bird': '只', 'butterfly': '只', 'fish': '条',
    'apple': '个', 'star': '颗', 'flower': '朵', 'balloon': '个',
}

COUNT_T = {
    'duck': '看一看，一共有几只小鸭子？',
    'bird': '看一看，一共有几只小鸟？',
    'apple': '看一看，一共有几个苹果？',
    'star': '看一看，一共有几颗星星？',
    'fish': '看一看，一共有几条小鱼？',
    'flower': '看一看，一共有几朵小花？',
    'butterfly': '看一看，一共有几只蝴蝶？',
    'balloon': '看一看，一共有几个气球？',
}
ADD_T = {
    'duck': '水里有{a}只小鸭子，又游来{b}只，现在有几只？',
    'bird': '树上有{a}只小鸟，又飞来{b}只，现在有几只？',
    'fish': '鱼缸里有{a}条小鱼，又游来{b}条，现在有几条？',
    'apple': '盘子里有{a}个苹果，又放上{b}个，现在有几个？',
    'flower': '花园里有{a}朵小花，又开了{b}朵，现在有几朵？',
    'balloon': '有{a}个气球，又买来{b}个，现在有几个？',
    'star': '天上有{a}颗星星，又亮起来{b}颗，现在有几颗？',
    'butterfly': '草地上有{a}只蝴蝶，又飞来{b}只，现在有几只？',
}
SUB_T = {
    'duck': '水里有{n}只小鸭子，游走了{k}只，剩下几只？',
    'bird': '树上有{n}只小鸟，飞走了{k}只，剩下几只？',
    'fish': '鱼缸里有{n}条小鱼，捞走了{k}条，剩下几条？',
    'apple': '盘子里有{n}个苹果，吃掉了{k}个，剩下几个？',
    'flower': '花园里有{n}朵小花，摘走了{k}朵，剩下几朵？',
    'balloon': '拿着{n}个气球，飞走了{k}个，剩下几个？',
    'star': '天上有{n}颗星星，躲起来了{k}颗，剩下几颗？',
    'butterfly': '草地上有{n}只蝴蝶，飞走了{k}只，剩下几只？',
}
COMPARE_T = '比一比，哪一边的{nm}更多？点一点多的那边。'
SEQ_T = '数字火车开动啦，空着的车厢，应该是几？'
BIGGER_T = '两个数字比一比，哪个大？点一点大的那个。'
NEXT_T_A = '{a}的后面是几？'
NEXT_T_B = '{a}的前面是几？'
SEQ2_T = '看看数字排队的规律，空着的车厢，应该是几？'
DIFF_T = '{nl}{a}{ql}，{nr}{b}{qr}，{nl}比{nr}多几{ql}？'
CHAIN_A = '{a}加{b}再加{c}，等于几？'
CHAIN_S = '{n}减{b}再减{c}，等于几？'
CHAIN_M = '{a}加{b}再减{c}，等于几？'


def opts_for(v):
    """正确答案 v + 两个邻近数，洗牌后返回 (opts, ans_idx)。"""
    others = []
    for d in (1, -1, 2, -2, 3):
        x = v + d
        if 0 <= x <= 20 and x not in others:
            others.append(x)
        if len(others) >= 2:
            break
    extra = 4
    while len(others) < 2:
        if 0 <= v + extra <= 20 and (v + extra) not in others:
            others.append(v + extra)
        else:
            others.append(max(0, v - extra))
        extra += 1
    o = [v] + others[:2]
    random.shuffle(o)
    return o, o.index(v)


def make_count(lv, n_max):
    icon = random.choice(ICONS)
    n = random.randint(max(1, n_max - 4), n_max)
    o, a = opts_for(n)
    return {'type': 'count', 'icon': icon, 'n': n, 'opts': o, 'ans': a,
            'say': COUNT_T[icon]}


def make_compare():
    icon = random.choice(ICONS)
    n1 = random.randint(2, 6)
    n2 = random.choice([x for x in range(2, 7) if abs(x - n1) <= 3 and x != n1])
    if random.random() < .5:
        n1, n2 = n2, n1
    return {'type': 'compare', 'icon': icon, 'nL': n1, 'nR': n2,
            'say': COMPARE_T.format(nm=NAME[icon])}


def make_add(lv, lo, hi_sum):
    while True:
        a = random.randint(1, hi_sum - 1)
        b = random.randint(1, hi_sum - 1)
        if lo <= a + b <= hi_sum:
            break
    icon = random.choice(ICONS)
    o, ai = opts_for(a + b)
    if lv in ('lv03', 'lv06') and random.random() < .55:
        say = ADD_T[icon].format(a=cnq(a), b=cnq(b))
    else:
        say = '%s加%s，等于几？' % (cn(a), cn(b))
    return {'type': 'add', 'icon': icon, 'a': a, 'b': b, 'opts': o, 'ans': ai,
            'say': say}


def make_sub(lv, lo_n, hi_n):
    n = random.randint(lo_n, hi_n)
    k = random.randint(1, n - 1)
    icon = random.choice(ICONS)
    o, ai = opts_for(n - k)
    if random.random() < .55:
        say = SUB_T[icon].format(n=cnq(n), k=cnq(k))
    else:
        say = '%s减%s，等于几？' % (cn(n), cn(k))
    return {'type': 'sub', 'icon': icon, 'n': n, 'k': k, 'opts': o, 'ans': ai,
            'say': say}


def make_seq():
    s = random.randint(1, 6)
    miss_idx = random.choice([1, 2, 3])
    miss = s + miss_idx
    seq = [(s + i) if i != miss_idx else 0 for i in range(5)]
    o, ai = opts_for(miss)
    return {'type': 'seq', 'seq': seq, 'opts': o, 'ans': ai, 'say': SEQ_T}


def make_bigger():
    a = random.randint(1, 10)
    b = random.choice([x for x in range(1, 11) if x != a])
    return {'type': 'bigger', 'a': a, 'b': b, 'say': BIGGER_T}


# ---------------- 高阶篇生成器 ----------------

def make_next(lo, hi):
    """十几的邻居：后面/前面是几。"""
    a = random.randint(lo, hi)
    if random.random() < .5 and a < 20:
        ans, say = a + 1, NEXT_T_A.format(a=cn(a))
    else:
        ans, say = a - 1, NEXT_T_B.format(a=cn(a))
    o, ai = opts_for(ans)
    return {'type': 'next', 'a': a, 'opts': o, 'ans': ai, 'say': say}


def make_add10():
    """十加几 / 几加十。"""
    b = random.randint(1, 9)
    icon = random.choice(ICONS)
    o, ai = opts_for(10 + b)
    if random.random() < .5:
        if random.random() < .6:
            say = ADD_T[icon].format(a=cn(10), b=cnq(b))
        else:
            say = '%s加%s，等于几？' % (cn(10), cn(b))
        return {'type': 'add', 'icon': icon, 'a': 10, 'b': b, 'opts': o, 'ans': ai,
                'say': say}
    return {'type': 'add', 'icon': icon, 'a': b, 'b': 10, 'opts': o, 'ans': ai,
            'say': '%s加%s，等于几？' % (cn(b), cn(10))}


def make_add9(lo_sum, hi_sum):
    """两个加数都在 2~9，和落在 [lo_sum, hi_sum]（凑十/超十加法）。"""
    while True:
        a = random.randint(2, 9)
        b = random.randint(2, 9)
        if lo_sum <= a + b <= hi_sum:
            break
    icon = random.choice(ICONS)
    o, ai = opts_for(a + b)
    if random.random() < .55:
        say = ADD_T[icon].format(a=cnq(a), b=cnq(b))
    else:
        say = '%s加%s，等于几？' % (cn(a), cn(b))
    return {'type': 'add', 'icon': icon, 'a': a, 'b': b, 'opts': o, 'ans': ai,
            'say': say}


def make_seq2():
    """等差找规律：+1/+2/-1/-2，5 节车厢。"""
    kind = random.choice(['+1', '+2', '-1', '-2'])
    if kind == '+1':
        s, step = random.randint(6, 15), 1
    elif kind == '+2':
        s, step = random.randint(2, 11), 2
    elif kind == '-1':
        s, step = random.randint(6, 14), -1
    else:
        s, step = random.randint(10, 16), -2
    vals = [s + step * i for i in range(5)]
    miss_idx = random.randint(1, 4)
    seq = [v if i != miss_idx else 0 for i, v in enumerate(vals)]
    o, ai = opts_for(vals[miss_idx])
    return {'type': 'seq', 'seq': seq, 'opts': o, 'ans': ai, 'say': SEQ2_T}


def make_diff():
    """多几个：两边不同小动物，答案为差值。"""
    i1, i2 = random.sample(ICONS, 2)
    hi = random.randint(3, 10)
    lo = random.randint(1, hi - 1)
    big, small = random.choice([(i1, i2), (i2, i1)])
    if random.random() < .5:
        L, R = (big, hi), (small, lo)
    else:
        L, R = (small, lo), (big, hi)
    o, ai = opts_for(hi - lo)
    return {'type': 'diff', 'iconL': L[0], 'nL': L[1], 'iconR': R[0], 'nR': R[1],
            'nl': NAME[big], 'ql': QUANT[big], 'nr': NAME[small], 'qr': QUANT[small],
            'opts': o, 'ans': ai,
            'say': DIFF_T.format(nl=NAME[big], a=cnq(hi), ql=QUANT[big],
                                 nr=NAME[small], b=cnq(lo), qr=QUANT[small])}


def make_expr_add():
    """裸算式加法（11~18，含超十）。"""
    while True:
        a, b = random.randint(3, 9), random.randint(2, 9)
        if 11 <= a + b <= 18:
            break
    o, ai = opts_for(a + b)
    return {'type': 'expr', 'nums': [a, b], 'ops': ['+'], 'opts': o, 'ans': ai,
            'say': '%s加%s，等于几？' % (cn(a), cn(b))}


def make_expr_sub():
    """裸算式减法（12~18 减一位数）。"""
    while True:
        n, k = random.randint(12, 18), random.randint(2, 9)
        if n - k >= 2:
            break
    o, ai = opts_for(n - k)
    return {'type': 'expr', 'nums': [n, k], 'ops': ['-'], 'opts': o, 'ans': ai,
            'say': '%s减%s，等于几？' % (cn(n), cn(k))}


def make_expr2():
    return make_expr_add() if random.random() < .5 else make_expr_sub()


def make_chain():
    """连加连减 / 加减混合三数运算。"""
    kind = random.choice(['++', '--', '+-'])
    if kind == '++':
        while True:
            a, b = random.randint(1, 9), random.randint(1, 9)
            c = random.randint(1, 5)
            if 4 <= a + b + c <= 20:
                break
        o, ai = opts_for(a + b + c)
        return {'type': 'expr', 'nums': [a, b, c], 'ops': ['+', '+'],
                'opts': o, 'ans': ai,
                'say': CHAIN_A.format(a=cn(a), b=cn(b), c=cn(c))}
    if kind == '--':
        while True:
            n = random.randint(8, 18)
            b, c = random.randint(1, 6), random.randint(1, 6)
            if n - b - c >= 0:
                break
        o, ai = opts_for(n - b - c)
        return {'type': 'expr', 'nums': [n, b, c], 'ops': ['-', '-'],
                'opts': o, 'ans': ai,
                'say': CHAIN_S.format(n=cn(n), b=cn(b), c=cn(c))}
    while True:
        a, b = random.randint(1, 9), random.randint(1, 9)
        c = random.randint(1, 9)
        if 1 <= a + b - c <= 20:
            break
    o, ai = opts_for(a + b - c)
    return {'type': 'expr', 'nums': [a, b, c], 'ops': ['+', '-'],
            'opts': o, 'ans': ai,
            'say': CHAIN_M.format(a=cn(a), b=cn(b), c=cn(c))}


def make_bigger20():
    a = random.randint(10, 20)
    b = random.choice([x for x in range(10, 21) if x != a])
    return {'type': 'bigger', 'a': a, 'b': b, 'say': BIGGER_T}


def make_count20():
    """十几的数一数（11~15 个）。"""
    icon = random.choice(ICONS)
    n = random.randint(11, 15)
    o, ai = opts_for(n)
    return {'type': 'count', 'icon': icon, 'n': n, 'opts': o, 'ans': ai,
            'say': COUNT_T[icon]}


# ---------------- 拓展篇生成器（图形/比较/生活/思维） ----------------

SHAPES = ['circle', 'tri', 'square', 'rect', 'star', 'heart']
SHAPE_NAME = {'circle': '圆形', 'tri': '三角形', 'square': '正方形',
              'rect': '长方形', 'star': '星形', 'heart': '心形'}
SHAPE_HINT = {
    'circle': '圆圆的像太阳',
    'tri': '有三个尖尖角',
    'square': '方方正正，四条边一样长',
    'rect': '长长方方像一本书',
    'star': '像天上眨眼睛的小星星',
    'heart': '像一颗暖暖的爱心',
}
POS_AN = {'tree': '大树', 'house': '小房子'}
POS_IT = {'bird': '小鸟', 'butterfly': '蝴蝶', 'balloon': '气球', 'star': '星星'}
POS_DIR = {'top': '上面', 'bottom': '下面', 'left': '左边', 'right': '右边'}
ORD_ICONS = ['duck', 'bird', 'fish', 'butterfly', 'bear', 'rabbit']
CMP3_ICONS = ['bear', 'duck', 'apple', 'tree']
MONEY_BILLS = [('m1', 1), ('m5', 5), ('m10', 10), ('m20', 20), ('m50', 50), ('m100', 100)]
GOODS = [('apple', '个'), ('balloon', '个'), ('candy', '根')]
ZERO_PAIRS = [
    ('plate', 'fish', '条', '小鱼都被小猫吃光啦'),
    ('plate', 'apple', '个', '苹果都被吃光啦'),
    ('plate', 'star', '颗', '星星都躲起来啦'),
    ('plate', 'banana', '根', '香蕉都被吃光啦'),
    ('box', 'balloon', '个', '气球都飞走啦'),
    ('box', 'star', '颗', '星星都躲起来啦'),
    ('box', 'apple', '个', '苹果都被送走啦'),
    ('basket', 'flower', '朵', '小花都被摘走啦'),
    ('basket', 'apple', '个', '苹果都被吃光啦'),
    ('basket', 'banana', '根', '香蕉都被吃光啦'),
]
CONT_NAME = {'plate': '盘子', 'box': '盒子', 'basket': '篮子'}
SORT_CATS = {
    'fruit': (['apple', 'banana', 'watermelon', 'grape'], '水果'),
    'animal': (['duck', 'bird', 'fish', 'butterfly'], '小动物'),
}
GROUP_ICONS = {'apple': '个', 'star': '颗', 'balloon': '个', 'flower': '朵'}
PARITY_ICONS = {'balloon': '个', 'duck': '只', 'apple': '个', 'star': '颗'}


def make_shape():
    t = random.choice(SHAPES)
    opts = random.sample([s for s in SHAPES if s != t], 2) + [t]
    random.shuffle(opts)
    return {'type': 'shape', 'optsShape': opts, 'ans': opts.index(t),
            'say': SHAPE_HINT[t] + '，哪个是' + SHAPE_NAME[t] + '？点一点。'}


def make_shapecount():
    t = random.choice(['tri', 'circle', 'square', 'star'])
    n_t = random.randint(2, 5)
    n_o = random.randint(2, 4)
    if n_t + n_o > 8:  # 画布只有 8 个槽位，图形总数不能超过（clamp 不改变随机流）
        n_o = 8 - n_t
    o, ai = opts_for(n_t)
    return {'type': 'shapecount', 'target': t, 'nT': n_t, 'nO': n_o,
            'opts': o, 'ans': ai,
            'say': '找一找，图里有几个' + SHAPE_NAME[t] + '？'}


def make_pos():
    anchor = random.choice(list(POS_AN))
    item = random.choice(list(POS_IT))
    target = random.choice(list(POS_DIR))
    return {'type': 'pos', 'anchor': anchor, 'item': item, 'target': target,
            'say': '%s想到%s的%s，点一点%s的%s。' % (
                POS_IT[item], POS_AN[anchor], POS_DIR[target],
                POS_AN[anchor], POS_DIR[target])}


def make_cmp():
    kind = random.choice(['long', 'tall', 'heavy'])
    if kind == 'long':
        big = random.choice(['L', 'R'])
        return {'type': 'cmp', 'kind': 'long', 'iconL': 'pencil', 'iconR': 'pencil',
                'big': big, 'say': '两支铅笔比一比，哪支更长？点一点长的那支。'}
    if kind == 'tall':
        ask_high = random.random() < .6
        L = random.random() < .5
        big = 'L' if (L if ask_high else not L) else 'R'
        return {'type': 'cmp', 'kind': 'tall',
                'iconL': 'giraffe' if L else 'rabbit',
                'iconR': 'rabbit' if L else 'giraffe', 'big': big,
                'say': '长颈鹿和小兔子比一比，谁%s？点一点。' % ('更高' if ask_high else '更矮')}
    if kind == 'heavy':
        L = random.random() < .5
        ask_heavy = random.random() < .6
        big = 'L' if (L if ask_heavy else not L) else 'R'
        return {'type': 'cmp', 'kind': 'heavy',
                'iconL': 'watermelon' if L else 'apple',
                'iconR': 'apple' if L else 'watermelon', 'big': big,
                'say': '大西瓜和苹果比一比，哪个%s？点一点。' % ('更重' if ask_heavy else '更轻')}


def make_ordinal():
    queue = random.sample(ORD_ICONS, 5)
    pick = random.choice(queue)
    frm = 'L' if random.random() < .75 else 'R'
    pos = queue.index(pick) + 1 if frm == 'L' else 5 - queue.index(pick)
    o, ai = opts_for(pos)
    say = '小动物们排队啦，从%s边数，%s排第几？' % (
        '左' if frm == 'L' else '右', NAME[pick])
    return {'type': 'ordinal', 'queue': queue, 'pick': pick, 'frm': frm,
            'opts': o, 'ans': ai, 'say': say}


def make_cmp3():
    icon = random.choice(CMP3_ICONS)
    quant = {'bear': '只', 'duck': '只', 'apple': '个', 'tree': '棵'}[icon]
    if icon == 'tree':
        ask = random.choice(['tall', 'short'])
    else:
        ask = random.choice(['big', 'small'])
    sizes = random.sample([0.55, 0.8, 1.1], 3)
    best = sizes.index(max(sizes)) if ask in ('big', 'tall') else sizes.index(min(sizes))
    word = {'big': '最大', 'small': '最小', 'tall': '最高', 'short': '最矮'}[ask]
    say = '三%s%s比一比，哪个%s？点一点%s的。' % (quant, NAME[icon], word, word)
    return {'type': 'cmp3', 'icon': icon, 'sizes': sizes, 'ask': ask,
            'ans': best, 'say': say}


def make_clock():
    h = random.randint(1, 12)
    o, ai = opts_for(h)
    return {'type': 'clock', 'h': h, 'opts': o, 'ans': ai,
            'say': '小钟表，滴答滴答，分针指着十二，时针指着%s，现在是几点呀？' % cn(h)}


def make_money_recog():
    picks = random.sample(MONEY_BILLS, 3)
    kind, val = random.choice(picks)
    bills = [k for k, _ in picks]
    random.shuffle(bills)
    return {'type': 'money', 'bills': bills, 'ans': bills.index(kind), 'val': val,
            'say': '买东西要用钱，找一找，哪张是%s元？点一点。' % MONEY_CN[val]}


def make_change():
    goods, quant = random.choice(GOODS)
    price = random.randint(1, 5)
    pay = random.choice([p for p in (5, 10) if p > price])
    o, ai = opts_for(pay - price)
    return {'type': 'change', 'goods': goods, 'price': price, 'pay': pay,
            'opts': o, 'ans': ai,
            'say': '%s要%s元，付给阿姨%s元，找回几元？' % (
                NAME[goods], cnq(price), cn(pay))}


def make_zero():
    cont, icon, quant, sc = random.choice(ZERO_PAIRS)
    o, ai = opts_for(0)
    return {'type': 'zero', 'cont': cont, 'icon': icon, 'opts': o, 'ans': ai,
            'say': '%s，%s里还有几%s%s？' % (sc, CONT_NAME[cont], quant, NAME[icon])}


def make_pattern():
    kind = random.choice(['ab', 'abb', 'aab'])
    if kind == 'ab':
        a, b = random.sample(SHAPES, 2)
        seq = [a, b, a, b, 0]
    elif kind == 'abb':
        a, b = random.sample(SHAPES, 2)
        seq = [a, b, b, a, 0]
    else:
        a, b = random.sample(SHAPES, 2)
        seq = [a, a, b, a, 0]
    # ab:   [a,b,a,b,?] -> ? = a
    # abb:  [a,b,b,a,?] -> 周期3, 位置4 -> b
    # aab:  [a,a,b,a,?] -> 周期3, 位置4 -> a
    correct = {'ab': a, 'abb': b, 'aab': a}[kind]
    o = random.sample([s for s in SHAPES if s != correct], 2) + [correct]
    random.shuffle(o)
    return {'type': 'pattern', 'seq': seq, 'optsShape': o,
            'ans': o.index(correct),
            'say': '图形排队有规律，按规律想一想，问号处是哪个图形？点一点。'}


def make_sort():
    cat = random.choice(list(SORT_CATS))
    items, cname = SORT_CATS[cat]
    other = [c for c in SORT_CATS if c != cat][0]
    other_items = SORT_CATS[other][0]
    if random.random() < .5:  # 哪个是 X
        ask = 'find'
        card = random.sample(other_items, 3) + [random.choice(items)]
        random.shuffle(card)
        ans = next(i for i, c in enumerate(card) if c in items)
        say = '哪个是%s？点一点%s。' % (cname, cname)
    else:  # 哪个不是 X
        ask = 'not'
        card = random.sample(items, 3) + [random.choice(other_items)]
        random.shuffle(card)
        ans = next(i for i, c in enumerate(card) if c not in items)
        say = '哪个不是%s？点一点不是%s的那个。' % (cname, cname)
    return {'type': 'sort', 'cat': cat, 'ask': ask, 'cards': card,
            'ans': ans, 'say': say}


def make_group():
    icon = random.choice(list(GROUP_ICONS))
    per = random.choice([2, 3])
    groups = random.randint(2, 4)
    total = per * groups
    o, ai = opts_for(total)
    q = GROUP_ICONS[icon]
    return {'type': 'group', 'icon': icon, 'per': per, 'groups': groups,
            'opts': o, 'ans': ai,
            'say': '每组有%s%s%s，%s组一共有几%s%s？' % (
                cnq(per), q, NAME[icon], cnq(groups), q, NAME[icon])}


def make_parity():
    icon = random.choice(list(PARITY_ICONS))
    k = random.randint(3, 10)
    leftover = k % 2
    o, ai = opts_for(leftover)
    q = PARITY_ICONS[icon]
    return {'type': 'parity', 'icon': icon, 'k': k, 'opts': o, 'ans': ai,
            'say': '%s%s%s，两只两只手拉手，还剩几%s没有朋友？' % (
                cnq(k), q, NAME[icon], q)}


def unique_by(key_fn, fn, count):
    """生成 count 道不重复的题（按 key_fn 去重）。"""
    seen, out = set(), []
    guard = 0
    while len(out) < count and guard < 2000:
        guard += 1
        q = fn()
        k = key_fn(q)
        if k in seen:
            continue
        seen.add(k)
        out.append(q)
    assert len(out) == count, '生成不足: %d/%d' % (len(out), count)
    return out


LEVELS = [
    ('lv01', '数一数', '5 以内 · 看一看有几个'),
    ('lv02', '比一比', '哪一边更多'),
    ('lv03', '加一加', '5 以内加法'),
    ('lv04', '减一减', '5 以内减法'),
    ('lv05', '数字火车', '按顺序接龙'),
    ('lv06', '加一加 进阶', '10 以内加法'),
    ('lv07', '减一减 进阶', '10 以内减法'),
    ('lv08', '比大小', '哪个数字大'),
    ('lv09', '又加又减', '10 以内混合'),
    ('lv10', '小小数学王', '样样都会'),
    ('lv11', '认识十几', '十一到二十'),
    ('lv12', '十加几', '一盒十个再加'),
    ('lv13', '凑十歌', '加起来超过十'),
    ('lv14', '找规律', '数字排队有规律'),
    ('lv15', '加法高手', '二十以内加法'),
    ('lv16', '减法高手', '二十以内减法'),
    ('lv17', '多几个', '比一比多多少'),
    ('lv18', '连着算', '连加连减'),
    ('lv19', '加减大师', '混合大挑战'),
    ('lv20', '数学小状元', '全都会啦'),
    # ---- 拓展篇 ----
    ('lv21', '认一认形状', '圆形三角形找一找'),
    ('lv22', '图形找一找', '图里有几个三角形'),
    ('lv23', '上下左右', '小鸟想飞到哪里'),
    ('lv24', '比长短', '高低轻重比一比'),
    ('lv25', '排第几', '小动物排队啦'),
    ('lv26', '谁最大', '三个放一起比一比'),
    ('lv27', '认识钟表', '整点钟滴答滴答'),
    ('lv28', '认识人民币', '一元五元买东西'),
    ('lv29', '认识零', '吃光啦就是零'),
    ('lv30', '图形规律', '下一个是什么图形'),
    ('lv31', '分类小能手', '水果动物分一分'),
    ('lv32', '成组数', '每组两个一共几个'),
    ('lv33', '单双数', '两只两只手拉手'),
]

qs = {k: [] for k, _ in [(l[0], l[1]) for l in LEVELS]}

# lv01 数一数：5 以内，覆盖 1~5
ns = [3, 1, 4, 2, 5, 2, 4, 1, 5, 3]
random.shuffle(ns)
for n in ns:
    icon = random.choice(ICONS)
    o, a = opts_for(n)
    qs['lv01'].append({'type': 'count', 'icon': icon, 'n': n, 'opts': o, 'ans': a,
                       'say': COUNT_T[icon]})

# lv02 比一比
qs['lv02'] = unique_by(lambda q: (q['icon'], min(q['nL'], q['nR']), max(q['nL'], q['nR'])),
                       make_compare, 10)

# lv03 5 以内加法
qs['lv03'] = unique_by(lambda q: (q['a'], q['b']),
                       lambda: make_add('lv03', 2, 5), 10)

# lv04 5 以内减法
qs['lv04'] = unique_by(lambda q: (q['n'], q['k']),
                       lambda: make_sub('lv04', 2, 5), 10)

# lv05 数字火车
qs['lv05'] = unique_by(lambda q: (q['seq'][0], ''.join(map(str, q['seq']))),
                       make_seq, 10)

# lv06 10 以内加法（和至少 6）
qs['lv06'] = unique_by(lambda q: (q['a'], q['b']),
                       lambda: make_add('lv06', 6, 10), 10)

# lv07 10 以内减法
qs['lv07'] = unique_by(lambda q: (q['n'], q['k']),
                       lambda: make_sub('lv07', 6, 10), 10)

# lv08 比大小
qs['lv08'] = unique_by(lambda q: (min(q['a'], q['b']), max(q['a'], q['b'])),
                       make_bigger, 10)

# lv09 又加又减（10 以内交替）
for i in range(10):
    if i % 2 == 0:
        qs['lv09'].append(make_add('lv09', 5, 10))
    else:
        qs['lv09'].append(make_sub('lv09', 6, 10))

# lv10 小小数学王：混合总复习
plan = ['count', 'compare', 'add', 'sub', 'seq', 'bigger', 'add', 'sub', 'count', 'seq']
random.shuffle(plan)
for t in plan:
    if t == 'count':
        qs['lv10'].append(make_count('lv10', 10))
    elif t == 'compare':
        qs['lv10'].append(make_compare())
    elif t == 'add':
        qs['lv10'].append(make_add('lv10', 4, 10))
    elif t == 'sub':
        qs['lv10'].append(make_sub('lv10', 4, 10))
    elif t == 'seq':
        qs['lv10'].append(make_seq())
    else:
        qs['lv10'].append(make_bigger())

# ---- 高阶篇 ----

# lv11 认识十几：前后邻居（8~19）
qs['lv11'] = unique_by(lambda q: (q['a'], q['ans']), lambda: make_next(8, 19), 10)

# lv12 十加几 / 几加十
qs['lv12'] = unique_by(lambda q: (q['a'], q['b']), make_add10, 10)

# lv13 凑十歌：和 10~13
qs['lv13'] = unique_by(lambda q: (q['a'], q['b']), lambda: make_add9(10, 13), 10)

# lv14 找规律：等差数列
qs['lv14'] = unique_by(lambda q: tuple(q['seq']), make_seq2, 10)

# lv15 加法高手：和 11~16
qs['lv15'] = unique_by(lambda q: (q['a'], q['b']), lambda: make_add9(11, 16), 10)

# lv16 减法高手：裸算式
qs['lv16'] = unique_by(lambda q: (q['nums'][0], q['nums'][1], q['ops'][0]),
                       make_expr_sub, 10)

# lv17 多几个：差值
qs['lv17'] = unique_by(lambda q: (q['iconL'], q['iconR'], q['nL'], q['nR']),
                       make_diff, 10)

# lv18 连着算：三数运算
qs['lv18'] = unique_by(lambda q: (tuple(q['nums']), tuple(q['ops'])),
                       make_chain, 10)

# lv19 加减大师：混合
plan19 = ['add', 'sub', 'bigger', 'add', 'sub', 'chain', 'bigger', 'add', 'sub', 'chain']
random.shuffle(plan19)
for t in plan19:
    if t == 'add':
        qs['lv19'].append(make_add9(11, 18))
    elif t == 'sub':
        qs['lv19'].append(make_expr_sub())
    elif t == 'bigger':
        qs['lv19'].append(make_bigger20())
    else:
        qs['lv19'].append(make_chain())

# lv20 数学小状元：全类型总复习
plan20 = ['count', 'seq', 'add', 'sub', 'diff', 'chain', 'next', 'add10',
          'bigger', 'sub']
random.shuffle(plan20)
for t in plan20:
    if t == 'count':
        qs['lv20'].append(make_count20())
    elif t == 'seq':
        qs['lv20'].append(make_seq2())
    elif t == 'add':
        qs['lv20'].append(make_add9(10, 15))
    elif t == 'add10':
        qs['lv20'].append(make_add10())
    elif t == 'sub':
        qs['lv20'].append(make_expr_sub())
    elif t == 'diff':
        qs['lv20'].append(make_diff())
    elif t == 'chain':
        qs['lv20'].append(make_chain())
    elif t == 'next':
        qs['lv20'].append(make_next(9, 19))
    else:
        qs['lv20'].append(make_bigger20())

# ---- 拓展篇（更多学习类型）----

# lv21 认一认形状
qs['lv21'] = unique_by(lambda q: (q['optsShape'][q['ans']], tuple(q['optsShape'])),
                       make_shape, 10)

# lv22 图形找一找（组合图形里数一数）
qs['lv22'] = unique_by(lambda q: (q['target'], q['nT'], q['nO']),
                       make_shapecount, 10)

# lv23 上下左右（方位）
qs['lv23'] = unique_by(lambda q: (q['anchor'], q['item'], q['target']),
                       make_pos, 10)

# lv24 比长短 / 高低 / 轻重
qs['lv24'] = unique_by(lambda q: (q['kind'], q['big'],
                                  q.get('iconL', '') + q.get('iconR', '')),
                       make_cmp, 10)

# lv25 排第几（序数）
qs['lv25'] = unique_by(lambda q: (tuple(q['queue']), q['pick'], q['frm']),
                       make_ordinal, 10)

# lv26 谁最大 / 最高（三个比一比）
qs['lv26'] = unique_by(lambda q: (q['icon'], q['ask'], tuple(q['sizes'])),
                       make_cmp3, 10)

# lv27 认识钟表（整点）
qs['lv27'] = unique_by(lambda q: q['h'], make_clock, 10)

# lv28 认识人民币：5 认币 + 5 找零
qs['lv28'] = (unique_by(lambda q: (tuple(q['bills']), q['ans']), make_money_recog, 5)
              + unique_by(lambda q: (q['goods'], q['price'], q['pay']),
                          make_change, 5))
random.shuffle(qs['lv28'])

# lv29 认识零
qs['lv29'] = unique_by(lambda q: (q['cont'], q['icon']), make_zero, 10)

# lv30 图形规律
qs['lv30'] = unique_by(lambda q: (tuple(q['seq']), q['ans']), make_pattern, 10)

# lv31 分类小能手
qs['lv31'] = unique_by(lambda q: (q['cat'], q['ask'], tuple(q['cards'])),
                       make_sort, 10)

# lv32 成组数（乘法启蒙）
qs['lv32'] = unique_by(lambda q: (q['icon'], q['per'], q['groups']),
                       make_group, 10)

# lv33 单双数
qs['lv33'] = unique_by(lambda q: (q['icon'], q['k']), make_parity, 10)

# 组装 + 编号
data, i = [], 0
for key, name, sub in LEVELS:
    for q in qs[key]:
        i += 1
        q['id'] = 'm%03d' % i
        q['lv'] = key
        data.append(q)

meta = {
    'total': len(data),
    'levels': [{'key': k, 'name': n, 'sub': s,
                'count': sum(1 for q in data if q['lv'] == k)}
               for k, n, s in LEVELS],
}

# ---- 校验 ----
ids = [q['id'] for q in data]
assert len(set(ids)) == len(ids) == 330
for q in data:
    assert q['say'] and '数一数' not in q['say']
    if 'opts' in q:
        assert len(q['opts']) == 3 and len(set(q['opts'])) == 3
        assert 0 <= q['ans'] <= 2 and q['opts'][q['ans']] >= 0
    if q['type'] == 'count':
        assert 1 <= q['n'] <= 15
    if q['type'] == 'add':
        assert 2 <= q['a'] + q['b'] <= 20
    if q['type'] == 'sub':
        assert 1 <= q['n'] - q['k']
    if q['type'] == 'seq':
        assert q['seq'].count(0) == 1 and q['seq'][0] >= 1
        assert all(1 <= v <= 20 for v in q['seq'] if v)
    if q['type'] == 'next':
        assert 8 <= q['a'] <= 20
    if q['type'] == 'expr':
        r = q['nums'][0]
        for i, op in enumerate(q['ops']):
            r = r - q['nums'][i + 1] if op == '-' else r + q['nums'][i + 1]
        assert 0 <= r <= 20 and q['opts'][q['ans']] == r
    if q['type'] == 'diff':
        assert 1 <= min(q['nL'], q['nR']) and max(q['nL'], q['nR']) <= 10
        assert abs(q['nL'] - q['nR']) == q['opts'][q['ans']]
    # ---- 拓展篇 ----
    if q['type'] == 'shape':
        assert len(set(q['optsShape'])) == 3
        assert q['optsShape'][q['ans']] in SHAPES
    if q['type'] == 'shapecount':
        assert 1 <= q['nT'] <= 6 and q['nO'] >= 2 and q['nT'] + q['nO'] <= 8
        assert q['opts'][q['ans']] == q['nT']
    if q['type'] == 'pos':
        assert q['target'] in POS_DIR and q['anchor'] in POS_AN and q['item'] in POS_IT
    if q['type'] == 'cmp':
        assert q['big'] in ('L', 'R')
    if q['type'] == 'ordinal':
        assert len(set(q['queue'])) == 5
        pos = (q['queue'].index(q['pick']) + 1 if q['frm'] == 'L'
               else 5 - q['queue'].index(q['pick']))
        assert 1 <= pos <= 5 and q['opts'][q['ans']] == pos
    if q['type'] == 'cmp3':
        assert len(set(q['sizes'])) == 3 and len(q['sizes']) == 3
        best = (max(q['sizes']) if q['ask'] in ('big', 'tall')
                else min(q['sizes']))
        assert q['sizes'][q['ans']] == best
    if q['type'] == 'clock':
        assert 1 <= q['h'] <= 12 and q['opts'][q['ans']] == q['h']
    if q['type'] == 'money':
        assert len(set(q['bills'])) == 3 and q['val'] in MONEY_CN
    if q['type'] == 'change':
        assert q['opts'][q['ans']] == q['pay'] - q['price'] and q['pay'] > q['price']
    if q['type'] == 'zero':
        assert q['opts'][q['ans']] == 0
    if q['type'] == 'pattern':
        assert q['seq'].count(0) == 1
        assert q['optsShape'][q['ans']] in SHAPES
        # 规律自检：循环体周期推导，? 处必须等于 optsShape[ans]
        z = q['seq'].index(0)
        body = q['seq'][:z] if z == len(q['seq']) - 1 else q['seq']
        for p in (1, 2, 3):
            if all(v == body[i % p] for i, v in enumerate(body)):
                assert body[z % p] == q['optsShape'][q['ans']], q['id']
                break
        else:
            raise AssertionError('pattern no period: %s' % q['id'])
    if q['type'] == 'sort':
        assert len(set(q['cards'])) == 4 and len(q['cards']) == 4
        items = SORT_CATS[q['cat']][0]
        hit = q['cards'][q['ans']] in items
        assert hit if q['ask'] == 'find' else not hit
    if q['type'] == 'group':
        assert q['opts'][q['ans']] == q['per'] * q['groups'] <= 12
    if q['type'] == 'parity':
        assert 3 <= q['k'] <= 10 and q['opts'][q['ans']] == q['k'] % 2

out = ('/* 自动生成，勿手改；生成脚本 build_data.py（种子 20261107） */\n'
       'window.MATH_META = ' + json.dumps(meta, ensure_ascii=False) + ';\n'
       'window.MATH_DATA = ' + json.dumps(data, ensure_ascii=False) + ';\n')
with io.open(os.path.join(BASE, 'data.js'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(out)

print('OK data.js  题数=%d' % len(data))
for k, n, s in LEVELS:
    print('  %s %s: %d 题' % (k, n, sum(1 for q in data if q['lv'] == k)))
