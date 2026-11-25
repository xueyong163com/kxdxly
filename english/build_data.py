# -*- coding: utf-8 -*-
"""生成幼儿英语启蒙词表 data.js。

词表为幼儿园阶段常用基础词，人工按主题整理；运行本脚本即可重放生成。
每条生成：英文 / 中文 / 主题 / 首字母 / 难度 / 三选一小问答。
"""
import io
import json
import os
import random

BASE = os.path.dirname(os.path.abspath(__file__))

# (主题中文, 主题 key, 主题英文, "en:zh,en:zh,...")
GROUPS = [
    ('动物', 'animals', 'Animals',
     'cat:猫,dog:狗,bird:鸟,fish:鱼,rabbit:兔子,mouse:老鼠,pig:猪,cow:奶牛,duck:鸭子,hen:母鸡,'
     'horse:马,sheep:绵羊,goat:山羊,monkey:猴子,tiger:老虎,lion:狮子,bear:熊,elephant:大象,'
     'panda:熊猫,giraffe:长颈鹿,zebra:斑马,fox:狐狸,wolf:狼,snake:蛇,frog:青蛙,turtle:乌龟,'
     'bee:蜜蜂,butterfly:蝴蝶,ant:蚂蚁'),
    ('水果', 'fruit', 'Fruit',
     'apple:苹果,banana:香蕉,orange:橙子,pear:梨,peach:桃子,grape:葡萄,strawberry:草莓,'
     'watermelon:西瓜,lemon:柠檬,mango:芒果,cherry:樱桃,pineapple:菠萝,kiwi:猕猴桃,'
     'plum:李子,blueberry:蓝莓,coconut:椰子,melon:甜瓜,fig:无花果'),
    ('蔬菜', 'vegetables', 'Vegetables',
     'tomato:西红柿,potato:土豆,carrot:胡萝卜,onion:洋葱,cucumber:黄瓜,pumpkin:南瓜,'
     'cabbage:卷心菜,broccoli:西兰花,corn:玉米,pea:豌豆,bean:豆子,mushroom:蘑菇,'
     'pepper:甜椒,lettuce:生菜,eggplant:茄子,garlic:大蒜'),
    ('颜色', 'colours', 'Colours',
     'red:红色,blue:蓝色,yellow:黄色,green:绿色,purple:紫色,pink:粉色,black:黑色,'
     'white:白色,brown:棕色,grey:灰色,gold:金色,silver:银色,rainbow:彩虹,colour:颜色'),
    ('数字', 'numbers', 'Numbers',
     'zero:零,one:一,two:二,three:三,four:四,five:五,six:六,seven:七,eight:八,nine:九,'
     'ten:十,eleven:十一,twelve:十二,thirteen:十三,fourteen:十四,fifteen:十五,'
     'sixteen:十六,seventeen:十七,eighteen:十八,nineteen:十九,twenty:二十,'
     'hundred:一百,first:第一,second:第二,count:数数,many:许多'),
    ('身体', 'body', 'Body',
     'head:头,hair:头发,face:脸,eye:眼睛,ear:耳朵,nose:鼻子,mouth:嘴巴,tooth:牙齿,'
     'tongue:舌头,neck:脖子,shoulder:肩膀,arm:手臂,hand:手,finger:手指,leg:腿,'
     'knee:膝盖,foot:脚,toe:脚趾'),
    ('家人', 'family', 'Family',
     'mum:妈妈,dad:爸爸,mother:母亲,father:父亲,grandma:奶奶,grandpa:爷爷,'
     'sister:姐妹,brother:兄弟,baby:宝宝,family:家庭,uncle:叔叔,aunt:阿姨,'
     'cousin:堂表兄妹,friend:朋友'),
    ('食物', 'food', 'Food',
     'rice:米饭,noodles:面条,bread:面包,milk:牛奶,egg:鸡蛋,cake:蛋糕,cookie:饼干,'
     'candy:糖果,water:水,juice:果汁,soup:汤,meat:肉,chicken:鸡肉,cheese:奶酪,'
     'butter:黄油,jam:果酱,ice cream:冰淇淋,chocolate:巧克力,hamburger:汉堡,'
     'pizza:披萨,salad:沙拉,breakfast:早餐,lunch:午餐,dinner:晚餐'),
    ('交通', 'transport', 'Transport',
     'car:小汽车,bus:公交车,bike:自行车,train:火车,plane:飞机,ship:轮船,boat:小船,'
     'taxi:出租车,truck:卡车,subway:地铁,scooter:滑板车,rocket:火箭,'
     'helicopter:直升机,ambulance:救护车,fire truck:消防车,traffic light:红绿灯'),
    ('家里', 'home', 'Home',
     'door:门,window:窗户,table:桌子,chair:椅子,bed:床,sofa:沙发,lamp:台灯,clock:钟,'
     'cup:杯子,bowl:碗,plate:盘子,spoon:勺子,fork:叉子,knife:刀,box:盒子,'
     'key:钥匙,phone:电话,toy:玩具,ball:球,house:房子,room:房间,mirror:镜子'),
    ('学校', 'school', 'School',
     'teacher:老师,student:学生,school:学校,classroom:教室,desk:课桌,book:书,'
     'pencil:铅笔,crayon:蜡笔,paper:纸,ruler:尺子,eraser:橡皮,glue:胶水,'
     'scissors:剪刀,blackboard:黑板,map:地图,flag:旗子,song:歌曲,game:游戏'),
    ('大自然', 'nature', 'Nature',
     'sun:太阳,moon:月亮,star:星星,sky:天空,cloud:云,rain:雨,wind:风,snow:雪,'
     'tree:树,flower:花,grass:草,leaf:叶子,mountain:山,river:河,sea:大海,'
     'beach:沙滩,stone:石头,fire:火'),
    ('天气', 'weather', 'Weather',
     'sunny:晴朗的,rainy:下雨的,windy:有风的,cloudy:多云的,snowy:下雪的,'
     'hot:热的,cold:冷的,warm:暖和的,cool:凉快的,weather:天气'),
    ('动作', 'actions', 'Actions',
     'run:跑,jump:跳,walk:走,sit:坐,stand:站,sleep:睡觉,eat:吃,drink:喝,'
     'read:读,write:写,draw:画,sing:唱歌,dance:跳舞,play:玩,swim:游泳,'
     'fly:飞,look:看,listen:听,smile:笑,cry:哭,hug:拥抱,help:帮助'),
    ('形状感受', 'shapes', 'Shapes & Feelings',
     'circle:圆形,square:正方形,triangle:三角形,heart:心形,big:大的,small:小的,'
     'happy:开心的,sad:难过的,tired:累的,hungry:饿的,thirsty:渴的,good:好的,'
     'bad:坏的,nice:好的,new:新的,old:旧的'),
    ('打招呼', 'greetings', 'Greetings',
     'hello:你好,hi:嗨,goodbye:再见,bye:拜拜,please:请,thank you:谢谢,'
     'sorry:对不起,yes:是的,no:不是,good morning:早上好,good night:晚安,'
     'welcome:欢迎,excuse me:打扰一下,well done:做得好'),
    ('衣服', 'clothes', 'Clothes',
     'shirt:衬衫,T-shirt:T恤,dress:连衣裙,skirt:裙子,pants:裤子,shorts:短裤,'
     'socks:袜子,shoes:鞋子,hat:帽子,cap:鸭舌帽,coat:外套,scarf:围巾'),
    ('时间', 'time', 'Time',
     'morning:早上,afternoon:下午,evening:傍晚,night:夜晚,today:今天,'
     'tomorrow:明天,yesterday:昨天,week:星期,day:白天,year:年'),
]

# 主题插画（index.html 的 ART 里对应）
ART_BY_GROUP = {
    'animals': 'animals', 'fruit': 'fruit', 'vegetables': 'fruit',
    'colours': 'colours', 'numbers': 'numbers', 'body': 'people',
    'family': 'people', 'food': 'food', 'transport': 'transport',
    'home': 'home', 'school': 'home', 'nature': 'nature',
    'weather': 'nature', 'actions': 'people', 'shapes': 'colours',
    'greetings': 'people', 'clothes': 'home', 'time': 'numbers',
}


def main():
    items, seen = [], set()
    for cat, key, cat_en, raw in GROUPS:
        for pair in raw.split(','):
            pair = pair.strip()
            if ':' not in pair:
                continue
            en, zh = pair.split(':', 1)
            en, zh = en.strip(), zh.strip()
            low = en.lower()
            if not en or not zh or low in seen:
                continue
            seen.add(low)
            items.append({
                'en': en, 'zh': zh, 'cat': cat, 'catKey': key, 'catEn': cat_en,
                'art': ART_BY_GROUP.get(key, 'nature'),
                'letter': en[0].upper() if en[0].isalpha() else '#',
                'level': 'start' if len(en.replace(' ', '')) <= 6 else 'later',
            })

    # 同主题内取干扰项，生成三选一问答；答案位置按序号打散
    by_cat = {}
    for it in items:
        by_cat.setdefault(it['cat'], []).append(it)
    rng = random.Random(20261106)
    for i, it in enumerate(items):
        pool = [x for x in by_cat[it['cat']] if x['en'] != it['en']]
        rng.shuffle(pool)
        distract = pool[:2]
        while len(distract) < 2:
            distract.append({'en': 'hello', 'zh': '你好'})
        if i % 2 == 0:
            right, wrong = it['zh'], [d['zh'] for d in distract]
            question = it['en'] + ' 是什么意思呀？'
        else:
            right, wrong = it['en'], [d['en'] for d in distract]
            question = '「' + it['zh'] + '」用英语怎么说？'
        pos = i % 3
        options = list(wrong)
        options.insert(pos, right)
        it['quiz'] = {'q': question, 'options': options, 'answer': pos,
                      'listen': it['en']}
        it['id'] = 'w%03d' % (i + 1)

    out = os.path.join(BASE, 'data.js')
    with io.open(out, 'w', encoding='utf-8') as f:
        f.write('/* 自动生成，勿手改；词表与生成脚本见 build_data.py */\n')
        f.write('window.WORD_META = %s;\n' % json.dumps({
            'total': len(items),
            'start': sum(1 for x in items if x['level'] == 'start'),
            'groups': [{'key': k, 'name': c, 'en': e} for c, k, e, _ in GROUPS],
            'note': '幼儿启蒙常用词，人工按主题整理；发音用浏览器自带英文语音',
        }, ensure_ascii=False))
        f.write('window.WORD_DATA = %s;\n' % json.dumps(items, ensure_ascii=False, separators=(',', ':')))

    print('生成单词：', len(items))
    print('主题数：', len(GROUPS), '| 短词', sum(1 for x in items if x['level'] == 'start'))
    print('各主题：', [(c, len(by_cat[c])) for c, _, _, _ in GROUPS])
    print('文件体积：%.1f KB' % (os.path.getsize(out) / 1024))
    print('抽样：', json.dumps(items[0], ensure_ascii=False)[:300])


if __name__ == '__main__':
    main()
