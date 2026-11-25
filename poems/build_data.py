# -*- coding: utf-8 -*-
"""从《唐诗三百首》《千家诗》公开数据生成幼儿古诗点读数据。

数据源：chinese-poetry/chinese-poetry 仓库 蒙学/tangshisanbaishou.json、qianjiashi.json
运行：python build_data.py   →  产出 data.js（供 index.html 加载）

处理步骤：繁体转简体 → 按标点拆句 → 逐字注音 → 只保留齐言五/七言的四句或八句短诗
          → 去重 → 按适龄度排序 → 自动打主题标签、生成小贴士和找字问答 → 取 300 首
"""
import io
import json
import os
import re
from collections import Counter

from zhconv import convert
from pypinyin import pinyin, Style

BASE = os.path.dirname(os.path.abspath(__file__))
PUNCT = '，。！？；、'


def s(t):
    if not isinstance(t, str):
        return ''
    return convert(t or '', 'zh-cn')


def is_han(ch):
    return '\u4e00' <= ch <= '\u9fff'


def py_line(text):
    """逐字注音；标点保留，汉字之间留空格。"""
    out = []
    for ch in text:
        if is_han(ch):
            out.append(pinyin(ch, style=Style.TONE, heteronym=False)[0][0])
        elif ch in PUNCT:
            out.append(ch)
    result = ' '.join(out)
    result = re.sub(r'\s+([%s])' % PUNCT, r'\1', result)
    return result.strip()


TAGS = [
    ('月亮', ['月', '蟾', '桂魄', '银汉']),
    ('春天', ['春', '柳', '莺', '燕', '桃', '杏', '东风']),
    ('花朵', ['花', '莲', '荷', '菊', '梅', '芙蓉', '红叶']),
    ('山水', ['山', '江', '河', '湖', '溪', '岭', '峰', '泉', '瀑', '潭']),
    ('小鸟', ['鸟', '鹅', '鹭', '鹤', '鹊', '鸦', '雁', '猿', '蝉']),
    ('送别', ['送', '别', '离', '故人', '赠', '归去']),
    ('想家', ['乡', '归', '客', '愁', '忆', '故园', '家']),
    ('田园', ['田', '禾', '农', '桑', '村', '牧', '耕', '锄']),
    ('边塞', ['塞', '关', '戍', '胡', '弓', '战', '沙场', '羌']),
    ('冬天', ['雪', '寒', '霜', '冰', '冬']),
    ('节日', ['元日', '清明', '重阳', '九月九', '中秋', '寒食', '除夕']),
    ('朋友', ['知己', '相逢', '君', '友人', '故人']),
    ('小船', ['舟', '船', '艇', '帆', '渡', '浮萍']),
]
TAG_ORDER = [t[0] for t in TAGS]
DISTRACT = {
    '月亮': ['大西瓜', '小皮球'], '春天': ['大雪球', '小石头'],
    '花朵': ['大鼓', '小椅子'], '山水': ['大蛋糕', '小铅笔'],
    '小鸟': ['大卡车', '小雨伞'], '送别': ['大苹果', '小镜子'],
    '想家': ['大风车', '小铃铛'], '田园': ['大轮船', '小台灯'],
    '边塞': ['小风筝', '大面包'], '冬天': ['小青蛙', '大蒲扇'],
    '节日': ['小书包', '大水杯'], '朋友': ['小牙刷', '大帽子'],
    '小船': ['大飞机', '小球拍'],
}


def tags_of(title, text):
    found = []
    for name, words in TAGS:
        if any(w in title or w in text for w in words):
            found.append(name)
    return found[:3] or ['写景']


def clean_author(raw):
    a = s(raw).strip()
    m = re.match(r'^[（(]([^）)]+)[）)]\s*(.*)$', a)
    if m:
        return m.group(2).strip(), m.group(1).strip()
    return a or '佚名', '唐'


def load_groups(path):
    d = json.load(io.open(path, encoding='utf-8'))
    out = []
    for group in d.get('content', []):
        form = s(group.get('type', '')).strip()
        for item in group.get('content', []):
            paras = item.get('paragraphs') or []
            # 组诗（其一 / 其二 …）是嵌套结构，展成独立的一首首
            if paras and isinstance(paras[0], dict):
                for sub in paras:
                    one = dict(item)
                    one['chapter'] = item.get('chapter', '') + '·' + (sub.get('subchapter') or '')
                    one['paragraphs'] = sub.get('paragraphs') or []
                    out.append((form, one))
            else:
                out.append((form, item))
    return out


def build_line_objs(hz_lines):
    return [{'hz': line, 'py': py_line(line)} for line in hz_lines]


def make_quiz(tags, line_count, seed):
    if tags and tags[0] in DISTRACT:
        right = tags[0]
        wrong = DISTRACT[right]
        question = '这首诗里，写到了下面哪一个？'
    else:
        right = '%d 句' % line_count
        wrong = ['%d 句' % (line_count + 2), '%d 句' % max(2, line_count - 2)]
        question = '仔细听，这首诗一共有几句呀？'
    pos = seed % 3
    options = list(wrong)
    options.insert(pos, right)
    return {'q': question, 'options': options, 'answer': pos}


def make_tip(tags):
    if tags and tags[0] != '写景':
        return '这是一首写「%s」的诗。点一句听一句，找找它藏在哪一句里～' % tags[0]
    return '点一点每一句，听听古人看见了什么～'


ART_BY_TAG = {
    '月亮': 'moon', '春天': 'bird', '花朵': 'bird', '田园': 'farm',
    '山水': 'tower', '小船': 'boat', '小鸟': 'goose', '冬天': 'moon',
}
ART_NAMES = ['goose', 'moon', 'bird', 'farm', 'tower', 'boat']


def art_of(tags, seed):
    for t in tags:
        if t in ART_BY_TAG:
            return ART_BY_TAG[t]
    return ART_NAMES[seed % len(ART_NAMES)]


def normalized_first(line):
    return re.sub(r'[^一-鿿]', '', line)


# ---------- 精讲：手写释义与问答，拼音人工校对 ----------
FEATURED = [
    {
        'title': '咏鹅', 'author': '骆宾王', 'dynasty': '唐', 'form': '五言古诗',
        'hint': '大白鹅在水里唱歌', 'art': 'goose', 'featured': True,
        'lines': [
            {'hz': '鹅，鹅，鹅，', 'py': 'é， é， é，'},
            {'hz': '曲项向天歌。', 'py': 'qū xiàng xiàng tiān gē。'},
            {'hz': '白毛浮绿水，', 'py': 'bái máo fú lǜ shuǐ，'},
            {'hz': '红掌拨清波。', 'py': 'hóng zhǎng bō qīng bō。'}],
        'meaning': '一只大白鹅弯着长长的脖子，对着天空嘎嘎唱歌。白白的羽毛浮在绿绿的水面上，红红的脚掌在清清的水里划呀划。',
        'quiz': {'q': '诗里在水里游的是谁呀？', 'options': ['大白鹅', '小兔子', '大老虎'], 'answer': 0},
        'tags': ['小鸟', '小船'],
    },
    {
        'title': '静夜思', 'author': '李白', 'dynasty': '唐', 'form': '五言绝句',
        'hint': '月亮照进屋子里', 'art': 'moon', 'featured': True,
        'lines': [
            {'hz': '床前明月光，', 'py': 'chuáng qián míng yuè guāng，'},
            {'hz': '疑是地上霜。', 'py': 'yí shì dì shàng shuāng。'},
            {'hz': '举头望明月，', 'py': 'jǔ tóu wàng míng yuè，'},
            {'hz': '低头思故乡。', 'py': 'dī tóu sī gù xiāng。'}],
        'meaning': '夜里，月光照到床前，亮得像地上结了一层白霜。抬起头看看月亮，低下头就想起了自己的家。',
        'quiz': {'q': '诗人抬起头，看见的是什么？', 'options': ['月亮', '大西瓜', '小皮球'], 'answer': 0},
        'tags': ['月亮', '想家'],
    },
    {
        'title': '春晓', 'author': '孟浩然', 'dynasty': '唐', 'form': '五言绝句',
        'hint': '一早听见小鸟叫', 'art': 'bird', 'featured': True,
        'lines': [
            {'hz': '春眠不觉晓，', 'py': 'chūn mián bù jué xiǎo，'},
            {'hz': '处处闻啼鸟。', 'py': 'chù chù wén tí niǎo。'},
            {'hz': '夜来风雨声，', 'py': 'yè lái fēng yǔ shēng，'},
            {'hz': '花落知多少。', 'py': 'huā luò zhī duō shǎo。'}],
        'meaning': '春天睡得太香啦，天亮了都不知道，到处都听见小鸟在叫。昨天晚上刮风又下雨，不知道有多少花瓣掉下来了。',
        'quiz': {'q': '一大早，到处听见谁在叫？', 'options': ['小鸟', '小猫', '大卡车'], 'answer': 0},
        'tags': ['春天', '小鸟'],
    },
    {
        'title': '悯农', 'author': '李绅', 'dynasty': '唐', 'form': '五言绝句',
        'hint': '每一粒米都来之不易', 'art': 'farm', 'featured': True,
        'lines': [
            {'hz': '锄禾日当午，', 'py': 'chú hé rì dāng wǔ，'},
            {'hz': '汗滴禾下土。', 'py': 'hàn dī hé xià tǔ。'},
            {'hz': '谁知盘中餐，', 'py': 'shéi zhī pán zhōng cān，'},
            {'hz': '粒粒皆辛苦。', 'py': 'lì lì jiē xīn kǔ。'}],
        'meaning': '中午太阳最晒的时候，农民伯伯还在地里除草，汗水一滴滴落进泥土。碗里的每一粒米，都来得很辛苦哦。',
        'quiz': {'q': '碗里的米饭是怎么来的？', 'options': ['农民伯伯种的', '超市变出来的', '天上掉下来的'], 'answer': 0},
        'tags': ['田园'],
    },
    {
        'title': '登鹳雀楼', 'author': '王之涣', 'dynasty': '唐', 'form': '五言绝句',
        'hint': '站得高，看得远', 'art': 'tower', 'featured': True,
        'lines': [
            {'hz': '白日依山尽，', 'py': 'bái rì yī shān jìn，'},
            {'hz': '黄河入海流。', 'py': 'huáng hé rù hǎi liú。'},
            {'hz': '欲穷千里目，', 'py': 'yù qióng qiān lǐ mù，'},
            {'hz': '更上一层楼。', 'py': 'gèng shàng yī céng lóu。'}],
        'meaning': '太阳挨着山慢慢落下去，黄河的水哗哗地流向大海。想看得更远一点吗？那就再往上爬一层楼吧。',
        'quiz': {'q': '想看得更远，要怎么做呀？', 'options': ['再上一层楼', '闭上眼睛', '坐下来'], 'answer': 0},
        'tags': ['山水'],
    },
    {
        'title': '池上', 'author': '白居易', 'dynasty': '唐', 'form': '五言绝句',
        'hint': '小娃娃偷偷采莲花', 'art': 'boat', 'featured': True,
        'lines': [
            {'hz': '小娃撑小艇，', 'py': 'xiǎo wá chēng xiǎo tǐng，'},
            {'hz': '偷采白莲回。', 'py': 'tōu cǎi bái lián huí。'},
            {'hz': '不解藏踪迹，', 'py': 'bù jiě cáng zōng jì，'},
            {'hz': '浮萍一道开。', 'py': 'fú píng yī dào kāi。'}],
        'meaning': '小娃娃撑着一条小船，偷偷采了白莲花回来。他不知道要把痕迹藏起来，水面的浮萍被小船划开了一条长长的路。',
        'quiz': {'q': '小娃娃撑的是什么呀？', 'options': ['小船', '小飞机', '小椅子'], 'answer': 0},
        'tags': ['小船', '花朵'],
    },
]


def main():
    groups = []
    for name in ('ts300.json', 'qianjiashi.json'):
        groups.extend(load_groups(os.path.join(BASE, '_data', name)))
    print('原始数据条目：', len(groups))

    featured_firsts = {normalized_first(f['lines'][0]['hz']) for f in FEATURED}
    seen = set()
    pool = []

    for form, item in groups:
        title = s(item.get('chapter', '')).strip()
        if not title or len(title) > 18:
            continue
        author, dynasty = clean_author(item.get('author', ''))
        paras = [s(p) for p in item.get('paragraphs', []) if p]
        text = ''.join(paras)
        lines = [l.strip() for l in re.findall(r'[^%s]+[%s]?' % (PUNCT, PUNCT), text) if l.strip()]
        if len(lines) not in (4, 8):
            continue
        sizes = {len(re.sub(r'[^一-鿿]', '', l)) for l in lines}
        if not sizes <= {5, 7}:
            continue
        key = normalized_first(lines[0])
        if not key or key in seen or key in featured_firsts:
            continue
        seen.add(key)

        full = title + ' ' + text
        tags = tags_of(title, text)
        seed = len(pool) + 1
        pool.append({
            'title': title, 'author': author, 'dynasty': dynasty,
            'form': form or ('五言绝句' if sizes == {5} else '七言绝句'),
            'hint': (tags[0] if tags[0] != '写景' else '听听这首诗'),
            'art': art_of(tags, seed), 'featured': False,
            'lines': build_line_objs(lines),
            'meaning': make_tip(tags),
            'quiz': make_quiz(tags, len(lines), seed),
            'tags': tags,
            'first': lines[0],
            '_age': 2 if (len(lines) == 4 and sizes == {5}) else (1 if len(lines) == 4 else 0),
        })

    # 四句五言优先（最适合中班），其次四句七言，最后八句律诗
    # level: start = 四句短诗，默认给孩子；later = 八句律诗，收在「全部」里
    pool.sort(key=lambda p: -p['_age'])
    for p in pool:
        p['level'] = 'start' if p.pop('_age', 0) >= 1 else 'later'

    data = FEATURED + pool[:300 - len(FEATURED)]
    for i, p in enumerate(data):
        p['id'] = 'p%03d' % (i + 1)
        p.setdefault('level', 'start')
        p.setdefault('first', p['lines'][0]['hz'])
        p.setdefault('tags', ['写景'])
        p.setdefault('meaning', make_tip(p['tags']))
        p.setdefault('quiz', make_quiz(p['tags'], len(p['lines']), i + 1))

    out = os.path.join(BASE, 'data.js')
    with io.open(out, 'w', encoding='utf-8') as f:
        f.write('/* 自动生成，勿手改；源数据与生成脚本见 build_data.py */\n')
        f.write('window.POEM_META = %s;\n' % json.dumps({
            'total': len(data),
            'start': sum(1 for p in data if p['level'] == 'start'),
            'sources': ['唐诗三百首', '千家诗'],
            'note': '繁体已转简体，拼音由工具逐字生成，个别多音字以老师为准',
        }, ensure_ascii=False))
        f.write('window.POEM_DATA = %s;\n' % json.dumps(data, ensure_ascii=False, separators=(',', ':')))

    print('生成诗词：', len(data))
    print('体裁分布：', Counter(p['form'] for p in data).most_common())
    print('主题分布：', Counter(t for p in data for t in p['tags']).most_common(12))
    print('高频作者：', Counter(p['author'] for p in data).most_common(10))
    print('文件体积：%.1f KB' % (os.path.getsize(out) / 1024))
    print('首三首：', [(p['title'], p['author'], p['lines'][0]['hz']) for p in data[:3]])
    print('末三首：', [(p['title'], p['author']) for p in data[-3:]])


if __name__ == '__main__':
    main()
