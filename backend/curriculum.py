"""
人教版三年级上册教材目录（语文 / 数学 / 英语）。
只存单元和知识点，不复制教材原文；题目由原创固定题或 AI 按单元生成。
"""

BOOKS = [
    {
        "id": "pep-math-3-1",
        "subject": "math",
        "subject_name": "数学",
        "grade": 3,
        "semester": 1,
        "semester_name": "三年级上册",
        "edition": "人教版",
        "title": "人教版 数学 三年级上册",
        "units": [
            {"id": "u1", "no": 1, "title": "时分秒", "knowledge": ["时、分、秒", "时间计算"]},
            {"id": "u2", "no": 2, "title": "万以内的加法和减法（一）", "knowledge": ["几百几十加减", "估算"]},
            {"id": "u3", "no": 3, "title": "测量", "knowledge": ["毫米、厘米、分米", "千米", "吨"]},
            {"id": "u4", "no": 4, "title": "万以内的加法和减法（二）", "knowledge": ["三位数加减", "验算"]},
            {"id": "u5", "no": 5, "title": "倍的认识", "knowledge": ["求一个数的几倍", "求一个数是另一个数的几倍"]},
            {"id": "u6", "no": 6, "title": "多位数乘一位数", "knowledge": ["口算乘法", "笔算乘法", "估算"]},
            {"id": "u7", "no": 7, "title": "长方形和正方形", "knowledge": ["周长", "长方形周长", "正方形周长"]},
            {"id": "u8", "no": 8, "title": "分数的初步认识", "knowledge": ["几分之一", "几分之几", "分数比较"]},
            {"id": "u9", "no": 9, "title": "数学广角——集合", "knowledge": ["重叠问题", "韦恩图"]},
        ],
    },
    {
        "id": "pep-chinese-3-1",
        "subject": "chinese",
        "subject_name": "语文",
        "grade": 3,
        "semester": 1,
        "semester_name": "三年级上册",
        "edition": "人教版",
        "title": "人教版 语文 三年级上册",
        "units": [
            {"id": "u1", "no": 1, "title": "学校生活", "knowledge": ["大青树下的小学", "花的学校", "不懂就要问"]},
            {"id": "u2", "no": 2, "title": "金秋时节", "knowledge": ["古诗三首", "铺满金色巴掌的水泥道", "秋天的雨"]},
            {"id": "u3", "no": 3, "title": "童话世界", "knowledge": ["卖火柴的小女孩", "那一定会很好", "在牛肚子里旅行"]},
            {"id": "u4", "no": 4, "title": "预测", "knowledge": ["总也倒不了的老屋", "胡萝卜先生的长胡子", "小狗学叫"]},
            {"id": "u5", "no": 5, "title": "留心观察", "knowledge": ["搭船的鸟", "金色的草地"]},
            {"id": "u6", "no": 6, "title": "祖国河山", "knowledge": ["古诗三首", "富饶的西沙群岛", "海滨小城", "美丽的小兴安岭"]},
            {"id": "u7", "no": 7, "title": "大自然的声音", "knowledge": ["大自然的声音", "父亲、树林和鸟", "带刺的朋友"]},
            {"id": "u8", "no": 8, "title": "美好品质", "knowledge": ["司马光", "掌声", "灰雀", "手术台就是阵地"]},
        ],
    },
    {
        "id": "pep-english-3-1",
        "subject": "english",
        "subject_name": "英语",
        "grade": 3,
        "semester": 1,
        "semester_name": "三年级上册",
        "edition": "人教版",
        "title": "人教版 英语 三年级上册",
        "units": [
            {"id": "u1", "no": 1, "title": "Hello!", "knowledge": ["问候语", "自我介绍", "name"]},
            {"id": "u2", "no": 2, "title": "Colours", "knowledge": ["颜色单词", "What colour is it?"]},
            {"id": "u3", "no": 3, "title": "Look at me!", "knowledge": ["身体部位", "This is my..."]},
            {"id": "u4", "no": 4, "title": "We love animals", "knowledge": ["动物单词", "What's this?"]},
            {"id": "u5", "no": 5, "title": "Let's eat!", "knowledge": ["食物单词", "I'd like..."]},
            {"id": "u6", "no": 6, "title": "Happy birthday!", "knowledge": ["数字 1—10", "How old are you?"]},
        ],
    },
]

BOOK_INDEX = {book["id"]: book for book in BOOKS}


def get_book(book_id: str):
    return BOOK_INDEX.get(book_id)


def get_unit(book_id: str, unit_id: str):
    book = get_book(book_id)
    if not book:
        return None, None
    for unit in book["units"]:
        if unit["id"] == unit_id:
            return book, unit
    return book, None
