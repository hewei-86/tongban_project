/**
 * 知识卡片：英语单词、古诗、成语、每日一句。
 * 全部本地数据，离线可背。
 */

export const WORDS = [
  { id: 'w1', word: 'apple', phonetic: '/ˈæpl/', meaning: '苹果', emoji: '🍎', grade: 1, example: 'I like apples.' },
  { id: 'w2', word: 'banana', phonetic: '/bəˈnɑːnə/', meaning: '香蕉', emoji: '🍌', grade: 1, example: 'The banana is yellow.' },
  { id: 'w3', word: 'cat', phonetic: '/kæt/', meaning: '猫', emoji: '🐱', grade: 1, example: 'My cat is cute.' },
  { id: 'w4', word: 'dog', phonetic: '/dɒɡ/', meaning: '狗', emoji: '🐶', grade: 1, example: 'The dog can run.' },
  { id: 'w5', word: 'book', phonetic: '/bʊk/', meaning: '书', emoji: '📚', grade: 1, example: 'This is my book.' },
  { id: 'w6', word: 'pen', phonetic: '/pen/', meaning: '钢笔', emoji: '🖊️', grade: 1, example: 'I have a pen.' },
  { id: 'w7', word: 'red', phonetic: '/red/', meaning: '红色', emoji: '🔴', grade: 1, example: 'The apple is red.' },
  { id: 'w8', word: 'blue', phonetic: '/bluː/', meaning: '蓝色', emoji: '🔵', grade: 1, example: 'The sky is blue.' },
  { id: 'w9', word: 'water', phonetic: '/ˈwɔːtə(r)/', meaning: '水', emoji: '💧', grade: 2, example: 'Please drink some water.' },
  { id: 'w10', word: 'milk', phonetic: '/mɪlk/', meaning: '牛奶', emoji: '🥛', grade: 2, example: 'I drink milk every day.' },
  { id: 'w11', word: 'sun', phonetic: '/sʌn/', meaning: '太阳', emoji: '☀️', grade: 2, example: 'The sun is bright.' },
  { id: 'w12', word: 'moon', phonetic: '/muːn/', meaning: '月亮', emoji: '🌙', grade: 2, example: 'The moon is round tonight.' },
  { id: 'w13', word: 'bird', phonetic: '/bɜːd/', meaning: '鸟', emoji: '🐦', grade: 2, example: 'A bird is singing.' },
  { id: 'w14', word: 'fish', phonetic: '/fɪʃ/', meaning: '鱼', emoji: '🐟', grade: 2, example: 'The fish can swim.' },
  { id: 'w15', word: 'school', phonetic: '/skuːl/', meaning: '学校', emoji: '🏫', grade: 2, example: 'I go to school by bike.' },
  { id: 'w16', word: 'teacher', phonetic: '/ˈtiːtʃə(r)/', meaning: '老师', emoji: '👩‍🏫', grade: 2, example: 'My teacher is kind.' },
  { id: 'w17', word: 'friend', phonetic: '/frend/', meaning: '朋友', emoji: '🤝', grade: 3, example: 'She is my best friend.' },
  { id: 'w18', word: 'family', phonetic: '/ˈfæməli/', meaning: '家人；家庭', emoji: '👨‍👩‍👧', grade: 3, example: 'I love my family.' },
  { id: 'w19', word: 'happy', phonetic: '/ˈhæpi/', meaning: '开心的', emoji: '😄', grade: 3, example: 'I am happy today.' },
  { id: 'w20', word: 'run', phonetic: '/rʌn/', meaning: '跑', emoji: '🏃', grade: 3, example: 'Let us run together.' },
  { id: 'w21', word: 'jump', phonetic: '/dʒʌmp/', meaning: '跳', emoji: '🤸', grade: 3, example: 'The rabbit can jump.' },
  { id: 'w22', word: 'tiger', phonetic: '/ˈtaɪɡə(r)/', meaning: '老虎', emoji: '🐯', grade: 3, example: 'The tiger is strong.' },
  { id: 'w23', word: 'pencil', phonetic: '/ˈpensl/', meaning: '铅笔', emoji: '✏️', grade: 2, example: 'May I use your pencil?' },
  { id: 'w24', word: 'weather', phonetic: '/ˈweðə(r)/', meaning: '天气', emoji: '⛅', grade: 3, example: 'The weather is nice today.' }
]

export const POEMS = [
  {
    id: 'p1', title: '春晓', author: '孟浩然', grade: 1,
    lines: ['春眠不觉晓，', '处处闻啼鸟。', '夜来风雨声，', '花落知多少。'],
    note: '春天睡得香，不知不觉天就亮了；到处都能听到鸟叫。夜里刮风下雨，不知道打落了多少花。'
  },
  {
    id: 'p2', title: '静夜思', author: '李白', grade: 1,
    lines: ['床前明月光，', '疑是地上霜。', '举头望明月，', '低头思故乡。'],
    note: '月光洒在床前，好像地上的白霜。抬头看月亮，低头就想起了家乡。'
  },
  {
    id: 'p3', title: '悯农', author: '李绅', grade: 1,
    lines: ['锄禾日当午，', '汗滴禾下土。', '谁知盘中餐，', '粒粒皆辛苦。'],
    note: '农民中午在田里锄草，汗水滴进泥土。碗里的每一粒米，都是辛苦换来的。'
  },
  {
    id: 'p4', title: '咏鹅', author: '骆宾王', grade: 1,
    lines: ['鹅，鹅，鹅，', '曲项向天歌。', '白毛浮绿水，', '红掌拨清波。'],
    note: '白鹅弯着脖子向天叫，白白的羽毛浮在绿水上，红红的脚掌拨动清水。'
  },
  {
    id: 'p5', title: '登鹳雀楼', author: '王之涣', grade: 2,
    lines: ['白日依山尽，', '黄河入海流。', '欲穷千里目，', '更上一层楼。'],
    note: '太阳靠着山落下，黄河向海流去。想看得更远，就要再登上一层楼。'
  },
  {
    id: 'p6', title: '望庐山瀑布', author: '李白', grade: 2,
    lines: ['日照香炉生紫烟，', '遥看瀑布挂前川。', '飞流直下三千尺，', '疑是银河落九天。'],
    note: '阳光照在香炉峰上升起紫烟，远看瀑布像挂在山前。水流飞泻而下，好像银河从天上落下。'
  },
  {
    id: 'p7', title: '江雪', author: '柳宗元', grade: 3,
    lines: ['千山鸟飞绝，', '万径人踪灭。', '孤舟蓑笠翁，', '独钓寒江雪。'],
    note: '群山看不到飞鸟，小路没有人迹。只有一位披蓑戴笠的老翁，独自在雪中江上钓鱼。'
  },
  {
    id: 'p8', title: '村居', author: '高鼎', grade: 3,
    lines: ['草长莺飞二月天，', '拂堤杨柳醉春烟。', '儿童散学归来早，', '忙趁东风放纸鸢。'],
    note: '二月草木生长、黄莺飞舞，杨柳轻拂堤岸。孩子们放学早，赶着东风放风筝。'
  }
]

export const IDIOMS = [
  { id: 'i1', word: '守株待兔', pinyin: 'shǒu zhū dài tù', meaning: '守着树桩等兔子撞上来，比喻不肯努力，只想靠侥幸得到好处。', example: '学习不能守株待兔，要主动练习。' },
  { id: 'i2', word: '亡羊补牢', pinyin: 'wáng yáng bǔ láo', meaning: '羊丢了才修补羊圈，比喻发现问题及时补救还不算晚。', example: '发现错题及时改正，亡羊补牢还不晚。' },
  { id: 'i3', word: '画蛇添足', pinyin: 'huà shé tiān zú', meaning: '给蛇画上脚，比喻做了多余的事，反而把事情弄糟。', example: '答案写清楚就好，别画蛇添足。' },
  { id: 'i4', word: '井底之蛙', pinyin: 'jǐng dǐ zhī wā', meaning: '井底的青蛙只能看到井口那么大的天，比喻眼界狭小。', example: '多读书、多出去看看，才不会成为井底之蛙。' },
  { id: 'i5', word: '自相矛盾', pinyin: 'zì xiāng máo dùn', meaning: '自己说的话前后打架，不能同时成立。', example: '他前后说的不一样，真是自相矛盾。' },
  { id: 'i6', word: '掩耳盗铃', pinyin: 'yǎn ěr dào líng', meaning: '捂住自己的耳朵去偷铃铛，比喻自己骗自己。', example: '不复习却假装学会了，这是掩耳盗铃。' },
  { id: 'i7', word: '拔苗助长', pinyin: 'bá miáo zhù zhǎng', meaning: '把禾苗往上拔想让它长快，结果苗都死了，比喻违反规律急于求成。', example: '学习要一步一步来，不能拔苗助长。' },
  { id: 'i8', word: '刻舟求剑', pinyin: 'kè zhōu qiú jiàn', meaning: '剑掉进水里却在船上刻记号找，比喻不懂事物在变化。', example: '情况变了还用老办法，就是刻舟求剑。' },
  { id: 'i9', word: '狐假虎威', pinyin: 'hú jiǎ hǔ wēi', meaning: '狐狸借着老虎的威风吓唬别的动物，比喻倚仗别人的力量欺压人。', example: '借别人的名义吓唬同学，是狐假虎威。' },
  { id: 'i10', word: '三心二意', pinyin: 'sān xīn èr yì', meaning: '心思不集中，一会儿想这个，一会儿想那个。', example: '写作业要专心，不能三心二意。' }
]

/** 每日一句，按日期轮换，不需要联网 */
export const DAILY_TIPS = [
  '今天比昨天多懂一点点，就是了不起的进步。',
  '不会的题目不是敌人，是正在长大的地方。',
  '慢一点没关系，想清楚了再写，正确率会更高。',
  '把错题弄懂一道，比刷十道新题更有用。',
  '学习像爬山，累了可以休息，但别忘了继续走。',
  '先读懂题目，再动笔，可以少走很多弯路。',
  '每天坚持十分钟，一年就是六十多个小时。',
  '遇到难题先深呼吸，把大问题拆成小问题。',
  '读出声来，记得更牢，也更勇敢。',
  '今天也要记得抬头看看远处，保护眼睛哦。'
]

/** 挑战赛鼓励语，按得分区间挑一句 */
export const CHALLENGE_PRAISE = [
  '稳稳的，继续加油！',
  '反应真快，像小闪电一样！',
  '太厉害了，口算小达人！',
  '这个成绩很棒，明天再来挑战！'
]

export function getDailyTip(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date - start) / 86400000)
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length]
}

export function wordsForGrade(grade) {
  return WORDS.filter((item) => item.grade <= grade).sort((a, b) => a.grade - b.grade)
}

export function poemsForGrade(grade) {
  return POEMS.filter((item) => item.grade <= grade)
}
