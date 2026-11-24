/**
 * 本地题库：3 个学科 × 3 个年级，全部离线可用。
 * answer 为判定答案，accept 可选，用于接受同义写法。
 */
import { EXTRA_QUESTIONS } from './questionExtras.js'
import { CURRICULUM_QUESTIONS } from './curriculum.js'

export const SUBJECTS = [
  { key: 'math', label: '数学', icon: '➗', tone: 'math' },
  { key: 'chinese', label: '语文', icon: '📖', tone: 'chinese' },
  { key: 'english', label: '英语', icon: '🔤', tone: 'english' }
]

export const SUBJECT_LABELS = { math: '数学', chinese: '语文', english: '英语' }
export const SUBJECT_ICONS = { math: '➗', chinese: '📖', english: '🔤' }

function q(subject, grade, content, answer, explanation, options = [], accept = []) {
  return { subject, grade, content, answer: String(answer), explanation, options, accept }
}

export const QUESTION_BANK = [
  // ================= 数学 · 一年级 =================
  q('math', 1, '8 + 7 = ？', 15, '把 7 分成 2 和 5：8 + 2 = 10，10 + 5 = 15。', ['13', '15', '16', '17']),
  q('math', 1, '16 - 9 = ？', 7, '先算 16 - 10 = 6，再补回多减的 1，所以是 7。', ['6', '7', '8', '9']),
  q('math', 1, '9 + 6 = ？', 15, '把 6 分成 1 和 5：9 + 1 = 10，10 + 5 = 15。', ['14', '15', '16', '13']),
  q('math', 1, '20 - 12 = ？', 8, '20 - 10 = 10，10 - 2 = 8。', ['7', '8', '9', '10']),
  q('math', 1, '下面哪个数最大？', 18, '18 比 15 和 12 都大，数越大越靠右。', ['12', '15', '18', '都不对']),
  q('math', 1, '5 + 5 + 5 = ？', 15, '3 个 5 相加，就是 5 × 3 = 15。', ['10', '15', '20', '25']),

  // ================= 数学 · 二年级 =================
  q('math', 2, '24 + 18 = ？', 42, '24 + 18 = 24 + 20 - 2 = 44 - 2 = 42。', ['40', '42', '44', '46']),
  q('math', 2, '50 - 27 = ？', 23, '50 - 27 = 50 - 30 + 3 = 20 + 3 = 23。', ['22', '23', '27', '33']),
  q('math', 2, '7 × 3 = ？', 21, '7 × 3 表示 3 个 7 相加：7 + 7 + 7 = 21。', ['14', '18', '21', '24']),
  q('math', 2, '36 ÷ 6 = ？', 6, '想口诀：六六三十六，所以 36 ÷ 6 = 6。', ['5', '6', '7', '8']),
  q('math', 2, '一个正方形有几条边？', 4, '正方形有 4 条一样长的边，4 个直角。', ['3', '4', '5', '6']),
  q('math', 2, '100 - 45 = ？', 55, '100 - 40 = 60，60 - 5 = 55。', ['45', '55', '65', '75']),

  // ================= 数学 · 三年级 =================
  q('math', 3, '12 × 7 = ？', 84, '12 × 7 = 10 × 7 + 2 × 7 = 70 + 14 = 84。', ['74', '82', '84', '94']),
  q('math', 3, '96 ÷ 8 = ？', 12, '想 8 × 12 = 96，所以 96 ÷ 8 = 12。', ['11', '12', '13', '14']),
  q('math', 3, '长方形的面积公式是？', '长 × 宽', '长方形面积 = 长 × 宽；周长 = (长 + 宽) × 2，不要弄混。', ['长 + 宽', '长 × 宽', '长 ÷ 宽', '(长 + 宽) × 2']),
  q('math', 3, '99 - 45 + 30 = ？', 84, '按顺序算：99 - 45 = 54，54 + 30 = 84。', ['74', '84', '94', '114']),
  q('math', 3, '一根绳子长 24 米，平均分成 6 段，每段长几米？', 4, '平均分成 6 段就是 24 ÷ 6 = 4（米）。', ['3', '4', '5', '6']),
  q('math', 3, '25 × 3 = ？', 75, '25 × 3 = 20 × 3 + 5 × 3 = 60 + 15 = 75。', ['65', '70', '75', '85']),

  // ================= 语文 · 一年级 =================
  q('chinese', 1, '“日”字中间加一横，会变成哪个字？', '目', '“日”里面加一横就是“目”，表示眼睛。', ['目', '白', '田', '由']),
  q('chinese', 1, '“春眠不觉晓”的下一句是？', '处处闻啼鸟', '这两句出自孟浩然的《春晓》，写春天早上听到鸟叫。', ['处处闻啼鸟', '花落知多少', '夜来风雨声', '低头思故乡']),
  q('chinese', 1, '“口”字中间加一横，会变成哪个字？', '日', '“口”里加一横就是“日”，表示太阳、一天。', ['日', '中', '田', '白']),
  q('chinese', 1, '下面哪个字有“三点水”偏旁？', '江', '“江”是三点水（氵），和水有关系。', ['江', '林', '山', '火']),
  q('chinese', 1, '“一”字加一笔，可以变成哪个字？', '二', '“一”上面再添一横就是“二”。', ['二', '人', '口', '大']),
  q('chinese', 1, '下面哪个词表示颜色？', '红色', '“红色”说的是颜色，“跑步”“苹果”“快乐”都不是颜色。', ['红色', '跑步', '苹果', '快乐']),

  // ================= 语文 · 二年级 =================
  q('chinese', 2, '“锄禾日当午”的作者是谁？', '李绅', '出自唐代诗人李绅的《悯农》，告诉我们要爱惜粮食。', ['李白', '李绅', '孟浩然', '杜甫']),
  q('chinese', 2, '“床前明月光”出自哪首诗？', '静夜思', '这是李白的《静夜思》，写思念家乡。', ['静夜思', '春晓', '悯农', '咏鹅']),
  q('chinese', 2, '“亡羊补牢”的意思是？', '出了问题及时补救还不算晚', '羊丢了以后修补羊圈，比喻发现问题及时改正，还不算晚。', ['出了问题及时补救还不算晚', '羊跑丢了很难过', '什么也不做', '一开始就做对']),
  q('chinese', 2, '“鹅，鹅，鹅”的下一句是？', '曲项向天歌', '出自骆宾王的《咏鹅》，写白鹅弯着脖子向天叫。', ['曲项向天歌', '白毛浮绿水', '红掌拨清波', '疑是地上霜']),
  q('chinese', 2, '“白日依山尽”的下一句是？', '黄河入海流', '出自王之涣的《登鹳雀楼》，写日落和黄河。', ['黄河入海流', '欲穷千里目', '更上一层楼', '花落知多少']),
  q('chinese', 2, '和“高兴”意思相近的词是？', '快乐', '“高兴”和“快乐”都表示心情好；“难过”是反义词。', ['快乐', '难过', '生气', '安静']),

  // ================= 语文 · 三年级 =================
  q('chinese', 3, '“一寸光阴一寸金”的下一句是？', '寸金难买寸光阴', '意思是时间比金子还宝贵，过去的时间买不回来。', ['寸金难买寸光阴', '花落知多少', '更上一层楼', '粒粒皆辛苦']),
  q('chinese', 3, '《西游记》的作者是？', '吴承恩', '《西游记》是明代小说家吴承恩写的。', ['罗贯中', '吴承恩', '施耐庵', '曹雪芹']),
  q('chinese', 3, '“守株待兔”这个故事告诉我们什么？', '不能靠侥幸，要靠自己的努力', '农夫守在树桩旁等兔子，结果什么也没得到，说明不能想着不劳而获。', ['不能靠侥幸，要靠自己的努力', '兔子跑得很快', '种田很辛苦', '树桩很有用']),
  q('chinese', 3, '“飞流直下三千尺”出自哪首诗？', '望庐山瀑布', '出自李白的《望庐山瀑布》，用夸张写出瀑布很高。', ['望庐山瀑布', '静夜思', '登鹳雀楼', '江雪']),
  q('chinese', 3, '“画蛇添足”的意思是？', '做了多余的事，反而不好', '蛇本来没有脚，画脚就是多此一举，反而把事弄糟。', ['做了多余的事，反而不好', '画画很好看', '蛇有很多脚', '做事要更快']),
  q('chinese', 3, '“独在异乡为异客”的下一句是？', '每逢佳节倍思亲', '出自王维的《九月九日忆山东兄弟》，写节日思念家人。', ['每逢佳节倍思亲', '低头思故乡', '疑是地上霜', '更上一层楼']),

  // ================= 英语 · 一年级 =================
  q('english', 1, '“苹果”的英文是？', 'apple', 'apple 读音 /ˈæpl/，表示苹果。', ['apple', 'banana', 'orange', 'pear']),
  q('english', 1, 'Hello 是什么意思？', '你好', 'Hello 是最常见的问候语，见面时说 Hello！', ['你好', '再见', '谢谢', '对不起']),
  q('english', 1, '“香蕉”的英文是？', 'banana', 'banana 读音 /bəˈnɑːnə/，表示香蕉。', ['banana', 'apple', 'cat', 'milk']),
  q('english', 1, '“红色”的英文是？', 'red', 'red 表示红色，blue 是蓝色，yellow 是黄色。', ['red', 'blue', 'yellow', 'green']),
  q('english', 1, '“猫”的英文是？', 'cat', 'cat 表示猫，dog 表示狗。', ['cat', 'dog', 'bird', 'fish']),
  q('english', 1, '数字 3 的英文是？', 'three', 'one、two、three 分别是 1、2、3。', ['three', 'two', 'four', 'five']),

  // ================= 英语 · 二年级 =================
  q('english', 2, '“狗”的英文是？', 'dog', 'dog 表示狗，cat 表示猫。', ['dog', 'cat', 'duck', 'bird']),
  q('english', 2, 'What color is the sun?', 'yellow', '太阳是黄色的，所以回答 yellow。', ['yellow', 'blue', 'green', 'black']),
  q('english', 2, '“书”的英文是？', 'book', 'book 表示书，pen 表示钢笔。', ['book', 'pen', 'bag', 'desk']),
  q('english', 2, '“老师”的英文是？', 'teacher', 'teacher 表示老师，student 表示学生。', ['teacher', 'student', 'doctor', 'driver']),
  q('english', 2, 'I ___ a student.', 'am', '主语是 I 时用 am：I am a student.', ['am', 'is', 'are', 'be']),
  q('english', 2, '“朋友”的英文是？', 'friend', 'friend 表示朋友，family 表示家人。', ['friend', 'family', 'brother', 'sister']),

  // ================= 英语 · 三年级 =================
  q('english', 3, '“再见”的英文是？', 'Goodbye', 'Goodbye 是比较正式的再见，也可以说 Bye。', ['Goodbye', 'Hello', 'Good morning', 'Thank you']),
  q('english', 3, 'Water 是什么意思？', '水', 'water 表示水，milk 是牛奶，juice 是果汁。', ['水', '牛奶', '果汁', '面包']),
  q('english', 3, 'I like reading ___.', 'books', 'like doing sth. 表示喜欢做某事，reading books 表示读书。', ['books', 'book', 'a book', 'bookes']),
  q('english', 3, 'How old are you? 最合适的回答是？', 'I am nine.', '问年龄用 How old，回答 I am + 数字。', ['I am nine.', 'I am fine.', 'It is nine.', 'My name is Tom.']),
  q('english', 3, '“星期一”的英文是？', 'Monday', 'Monday 星期一，Tuesday 星期二，Sunday 星期日。', ['Monday', 'Sunday', 'Tuesday', 'Friday']),
  q('english', 3, 'big 的反义词是？', 'small', 'big 大，small 小；tall 高，short 矮。', ['small', 'tall', 'long', 'new']),

  // ================= 扩展题库 =================
  ...EXTRA_QUESTIONS,

  // ================= 教材同步：人教版三上数学 =================
  ...CURRICULUM_QUESTIONS
]

/** 取某学科某年级的题目（题库不足时向上兼容低年级） */
export function pickQuestions(subject, grade, limit = 5) {
  const exact = QUESTION_BANK.filter((item) => item.subject === subject && item.grade === grade)
  const lower = QUESTION_BANK.filter((item) => item.subject === subject && item.grade < grade)
  const pool = [...exact, ...lower]
  return pool.slice(0, limit)
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function buildOptions(answer) {
  const value = Number(answer)
  const offsets = [1, -1, 2, -2, 3, 10]
  const options = [value]
  for (const offset of offsets) {
    if (options.length >= 4) break
    const candidate = value + offset
    if (candidate >= 0 && !options.includes(candidate)) options.push(candidate)
  }
  return options.sort(() => Math.random() - 0.5).map(String)
}

/**
 * 生成一道口算题，用于「AI 出题」和「速算挑战」。
 * 返回与题库同结构的数据，便于统一判定。
 */
export function generateMathQuestion(grade) {
  const level = Math.min(3, Math.max(1, Number(grade) || 1))
  let a
  let b
  let operator
  let answer
  let content
  let explanation

  if (level === 1) {
    const usePlus = Math.random() < 0.55
    if (usePlus) {
      a = randInt(2, 15)
      b = randInt(2, 20 - a > 0 ? 20 - a : 2)
      answer = a + b
      content = `${a} + ${b} = ？`
      explanation = `把 ${b} 拆成 ${10 - (a % 10)} 和剩下的部分，先凑成 10，再加剩下的数，答案是 ${answer}。`
    } else {
      a = randInt(6, 20)
      b = randInt(1, a - 1)
      answer = a - b
      content = `${a} - ${b} = ？`
      explanation = `先减到 10 再减剩下的部分，${a} - ${b} = ${answer}。`
    }
    operator = usePlus ? '+' : '-'
  } else if (level === 2) {
    const type = randInt(1, 3)
    if (type === 1) {
      a = randInt(10, 79)
      b = randInt(11, 100 - a)
      answer = a + b
      content = `${a} + ${b} = ？`
      explanation = `先算整十：${a} + ${b} 可以拆成整十加整十、个位加个位，答案是 ${answer}。`
      operator = '+'
    } else if (type === 2) {
      a = randInt(30, 100)
      b = randInt(11, a - 1)
      answer = a - b
      content = `${a} - ${b} = ？`
      explanation = `先减去整十数，再减个位，${a} - ${b} = ${answer}。`
      operator = '-'
    } else {
      a = randInt(2, 9)
      b = randInt(2, 9)
      answer = a * b
      content = `${a} × ${b} = ？`
      explanation = `乘法口诀：${a} × ${b} = ${answer}。`
      operator = '×'
    }
  } else {
    const type = randInt(1, 4)
    if (type === 1) {
      a = randInt(11, 99)
      b = randInt(2, 9)
      answer = a * b
      content = `${a} × ${b} = ？`
      explanation = `把 ${a} 拆成整十和个位：${Math.floor(a / 10) * 10} × ${b} + ${a % 10} × ${b} = ${answer}。`
      operator = '×'
    } else if (type === 2) {
      b = randInt(2, 9)
      answer = randInt(2, 20)
      a = b * answer
      content = `${a} ÷ ${b} = ？`
      explanation = `想乘法口诀：${b} × ${answer} = ${a}，所以 ${a} ÷ ${b} = ${answer}。`
      operator = '÷'
    } else if (type === 3) {
      a = randInt(100, 500)
      b = randInt(10, 99)
      answer = a - b
      content = `${a} - ${b} = ？`
      explanation = `先减整十再减个位：${a} - ${b} = ${answer}。`
      operator = '-'
    } else {
      a = randInt(100, 400)
      b = randInt(20, 199)
      answer = a + b
      content = `${a} + ${b} = ？`
      explanation = `数位对齐相加：${a} + ${b} = ${answer}。`
      operator = '+'
    }
  }

  return {
    subject: 'math',
    grade: level,
    content,
    answer: String(answer),
    explanation: explanation || `${content.replace('？', String(answer))}`,
    options: buildOptions(answer),
    accept: [],
    operator
  }
}
