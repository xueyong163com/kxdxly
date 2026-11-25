# -*- coding: utf-8 -*-
"""为赛车页知识卡预录 20 段朗读 MP3：audio/k01.mp3 ~ k20.mp3。"""
import asyncio
import os

import edge_tts

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'audio')
VOICE = 'zh-CN-XiaoxiaoNeural'
RATE = '-15%'

KNOWS = [
    '红灯停，绿灯行，黄灯亮了等一等。',
    '开车要系好安全带，就像被妈妈抱住一样安全。',
    '车轮是圆形的，圆形的东西才滚得又快又稳。',
    '下雨天路滑滑的，开车要慢慢开才安全。',
    '按喇叭发出嘀嘀声，是在提醒别人：我来啦，请注意。',
    '汽车要加油，就像我们要吃饭，吃饱了才有力气跑。',
    '夜里开车要打开车灯，才能看清前面的路。',
    '斑马线是给行人走的，开车的人要让小朋友先过马路。',
    '星星在晚上出现，太阳出来了，它们就躲起来啦。',
    '雪花是白白的小冰晶，落在手上暖一暖，就化成小水滴啦。',
    '秋天的叶子会变黄，风一吹，就从树上飘下来了。',
    '蝴蝶小时候是毛毛虫，长大以后才变得这么漂亮。',
    '月亮有时候圆圆的像盘子，有时候弯弯的像小船。',
    '冰淇淋是凉凉的，吃太多小肚子会不舒服哦。',
    '收到礼物要说谢谢，双手接礼物更有礼貌。',
    '红绿灯就像马路上的小指挥，指挥大家安全通行。',
    '消防车是红色的，救护车是白色的，它们一响，大家都要让路。',
    '汽车开得越快越危险，好司机都会控制车速。',
    '雨过天晴会出现彩虹，有红橙黄绿青蓝紫七种颜色。',
    '大人喝了酒不能开车，小朋友要提醒爸爸妈妈哦。',
    '小狗的鼻子特别灵，能闻出好多好多味道。',
    '小猫咪的胡须能帮它量一量洞口够不够钻过去。',
    '大象的鼻子像一只灵活的手，能卷起大木头。',
    '长颈鹿的脖子长长长的，是为了吃到高处嫩嫩的叶子。',
    '企鹅住在很冷很冷的南极，走起路来摇摇摆摆。',
    '蜜蜂采了花蜜，酿成甜甜的蜂蜜，还会跳八字舞告诉同伴。',
    '地球是圆圆的，我们住在地球上，它转一圈就是一天。',
    '太阳是个大火球，离我们很远很远，晒在身上暖暖的。',
    '宇航员去太空要穿航天服，太空里没有空气，不能呼吸。',
    '流星是天上掉下来的小石头，发着光划过夜空。',
    '恐龙在很久很久以前生活过，后来从地球上消失了。',
    '大海是蓝色的，海水是咸咸的，可不能多喝哦。',
    '我们有两只眼睛，一起用才能看清楚东西的远近。',
    '心脏一直在胸腔里跳，把血液送到全身各个地方。',
    '骨头是我们身体的支架，喝牛奶吃鸡蛋让骨头更强壮。',
    '细菌很小很小看不见，饭前便后要洗手才不生病。',
    '早晚要刷牙，牙齿白白的不长小蛀虫。',
    '多喝水身体好，小脸蛋也会水嫩嫩的。',
    '早睡早起精神好，个子也能长得高高的。',
    '挑食的小朋友营养不够，蔬菜肉肉都要吃一点。',
    '中国的长城好长好长，是世界上最长的城墙。',
    '熊猫是我们国家的宝贝，最爱吃新鲜的竹子。',
    '花朵有各种各样的颜色，会引来蜜蜂和蝴蝶做客。',
    '风筝借着风飞上天，风越大飞得越高。',
    '敲门之前先问一声，做个有礼貌的好孩子。',
]


async def gen(text, path, sem, retry=3):
    async with sem:
        for attempt in range(retry):
            try:
                await edge_tts.Communicate(text, VOICE, rate=RATE).save(path)
                if os.path.getsize(path) > 1000:
                    return True
            except Exception as e:
                if attempt == retry - 1:
                    print('失败 %s: %s' % (path, e))
        return False


async def main():
    os.makedirs(OUT, exist_ok=True)
    sem = asyncio.Semaphore(8)
    todo = []
    for i, t in enumerate(KNOWS, 1):
        p = os.path.join(OUT, 'k%02d.mp3' % i)
        if not (os.path.exists(p) and os.path.getsize(p) > 1000):
            todo.append((t, p))
    print('共 %d 条知识，待生成 %d 段' % (len(KNOWS), len(todo)))
    fails = [j for j in todo if not await gen(j[0], j[1], sem)]
    if fails:
        sem2 = asyncio.Semaphore(4)
        fails = [j for j in fails if not await gen(j[0], j[1], sem2)]
    print('全部生成完成' if not fails else '仍有失败: %s' % [f[1] for f in fails])


if __name__ == '__main__':
    asyncio.run(main())
