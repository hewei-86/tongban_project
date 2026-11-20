/**
 * 「童伴」本地 AI 小老师。
 *
 * 设计目标：在没有后端 / 没有 API Key 的纯静态站点上，也能给出**真的有用**的回复：
 * 1. 会算四则运算并讲解步骤；
 * 2. 会背古诗、讲成语、查单词、说汉字变形；
 * 3. 遇到隐私、情绪、安全类话题，优先引导孩子找家长和老师；
 * 4. 明确告诉孩子「我是程序，不是真人老师」，不假装无所不知。
 */

import { IDIOMS, POEMS, WORDS } from '../data/cards.js'

const SAFETY_REPLIES = [
  {
    test: /(手机号|手机号码|电话号|身份证|家庭住址|家住|我家在|银行卡|密码)/,
    reply:
      '这些是隐私信息，不能在聊天里告诉任何人（包括我）哦。\n如果有人问你要这些，先去告诉爸爸妈妈或者老师，好吗？'
  },
  {
    test: /(自杀|自残|不想活|想死|打死|打我|被欺负|霸凌|欺负我)/,
    reply:
      '听起来你现在很难受，谢谢你愿意说出来。\n先去找爸爸妈妈、老师，或者你信任的大人，把这件事告诉他们，他们可以保护你。\n如果需要马上有人听你说，可以拨打 12355 青少年服务台。你很重要，不要一个人扛着。'
  }
]

const CHAR_TRANSFORM = {
  日: { 横: '目', 一横: '目', 竖: '申', 一竖: '申' },
  口: { 横: '日', 一横: '日', 竖: '中', 一竖: '中' },
  木: { 横: '本', 一横: '本', 撇: '禾' },
  大: { 横: '天', 一横: '天', 点: '太', 一点: '太' },
  人: { 横: '大', 一横: '大', 撇: '个' },
  一: { 横: '二', 一横: '二', 竖: '十', 一竖: '十' },
  十: { 横: '土', 一横: '土' },
  王: { 点: '玉', 一点: '玉' },
  天: { 横: '夫', 一横: '夫' }
}

function clean(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

function prettyNumber(value) {
  if (!Number.isFinite(value)) return String(value)
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)))
}

/** 只允许数字与四则运算符的安全计算，返回 { value, tokens } 或 null */
export function safeCalculate(expression) {
  const tokens = expression.match(/\d+(?:\.\d+)?|[+\-*/]/g)
  if (!tokens || tokens.join('') !== expression) return null
  const values = []
  const ops = []
  for (const token of tokens) {
    if (/^\d/.test(token)) values.push(Number(token))
    else ops.push(token)
  }
  if (values.length !== ops.length + 1) return null

  // 先乘除
  const reducedValues = [values[0]]
  const reducedOps = []
  for (let i = 0; i < ops.length; i++) {
    const operator = ops[i]
    const next = values[i + 1]
    if (operator === '*') reducedValues[reducedValues.length - 1] *= next
    else if (operator === '/') {
      if (next === 0) return null
      reducedValues[reducedValues.length - 1] /= next
    } else {
      reducedOps.push(operator)
      reducedValues.push(next)
    }
  }
  // 再加减
  let result = reducedValues[0]
  for (let i = 0; i < reducedOps.length; i++) {
    result = reducedOps[i] === '+' ? result + reducedValues[i + 1] : result - reducedValues[i + 1]
  }
  return { value: result, numbers: values, operators: ops }
}

function findPoem(text) {
  return POEMS.find((poem) => text.includes(poem.title) || poem.lines.some((line) => text.includes(line.replace(/[，。]/g, ''))))
}

function findWord(text) {
  const lower = text.toLowerCase()
  const englishHit = WORDS.find((item) => new RegExp(`\\b${item.word}\\b`, 'i').test(lower))
  if (englishHit) return englishHit
  return WORDS.find((item) => item.meaning && (text.includes(item.meaning) || item.meaning.includes(text)))
}

function findIdiom(text) {
  return IDIOMS.find((item) => text.includes(item.word))
}

function mathReply(calculation, grade) {
  const value = calculation.value
  const { numbers, operators } = calculation
  const result = prettyNumber(value)
  const lines = []

  if (numbers.length === 2) {
    const [a, b] = numbers
    const operator = operators[0]
    if (operator === '+') {
      const need = 10 - (a % 10)
      lines.push(`我们可以用「凑十法」：`)
      lines.push(`${a} 再加 ${need} 就先凑成 10，${b} 里面拿出 ${need}，还剩 ${b - need}。`)
      lines.push(`10 + ${b - need} = ${result}，所以 ${a} + ${b} = ${result}。`)
    } else if (operator === '-') {
      lines.push(`我们可以用「破十法」：`)
      lines.push(`先想 ${a} - 10 = ${a - 10}，多减了 ${a - 10 - (a - b)}，要加回来。`)
      lines.push(`所以 ${a} - ${b} = ${result}。`)
    } else if (operator === '*') {
      lines.push(`乘法就是「几个几相加」：${a} 个 ${b} 相加，或者 ${b} 个 ${a} 相加。`)
      lines.push(`想乘法口诀：${a} × ${b} = ${result}。`)
    } else if (operator === '/') {
      lines.push(`除法可以倒过来想乘法：几乘 ${b} 等于 ${a}？`)
      lines.push(`${b} × ${result} = ${a}，所以 ${a} ÷ ${b} = ${result}。`)
    }
  } else {
    lines.push(`按顺序先算乘除、再算加减：`)
    lines.push(`结果是 ${result}。`)
  }

  if (grade <= 2 && value > 100) {
    lines.push('这道题的数字有点大，可以先在纸上列竖式，一位一位地算。')
  }
  lines.push('算完可以倒着验算一遍：把答案代回去，看看等式成不成立 ✅')
  return lines.join('\n')
}

/**
 * 生成 AI 小老师的回复（纯本地规则，孩子友好）。
 * @param {string} question 孩子的提问
 * @param {{grade?: number}} options
 * @returns {string}
 */
export function aiAnswer(question, options = {}) {
  const text = clean(question)
  const grade = Math.min(6, Math.max(1, Number(options.grade) || 1))

  if (!text) {
    return '你想问什么呢？比如：\n· 8 + 7 等于几？\n· “春晓”怎么背？\n· 苹果的英文是什么？'
  }

  for (const item of SAFETY_REPLIES) {
    if (item.test.test(text)) return item.reply
  }

  // 1. 四则运算
  const normalized = text
    .replace(/[，。？！?,.!\s]/g, '')
    .replace(/等于几|等于多少|等于啥|是多少|等于|得几|得多少/g, '=')
    .replace(/加/g, '+')
    .replace(/减/g, '-')
    .replace(/乘以|乘/g, '*')
    .replace(/除以|除/g, '/')
    .replace(/[×xX]/g, '*')
    .replace(/[÷]/g, '/')
  const expressionMatch = normalized.match(/\d+(?:\.\d+)?(?:[+\-*/]\d+(?:\.\d+)?)+/)
  if (expressionMatch) {
    const calculation = safeCalculate(expressionMatch[0])
    if (calculation) return mathReply(calculation, grade)
    return '这个算式我有点看不懂，是不是除号后面写了 0 呢？除数不能是 0，换个数再试试吧。'
  }

  // 2. 古诗
  const poem = findPoem(text)
  if (poem) {
    return [
      `《${poem.title}》 ${poem.author}`,
      '',
      poem.lines.join(''),
      '',
      `大意：${poem.note}`,
      '',
      '背的时候可以先读三遍，再一句一句遮住后半句，让爸爸妈妈考考你。'
    ].join('\n')
  }

  // 3. 汉字变形
  const transformMatch = text.match(/([\u4e00-\u9fa5])字?.{0,2}(?:加|添)(一?[横竖撇点])/)
  if (transformMatch) {
    const [, char, stroke] = transformMatch
    const table = CHAR_TRANSFORM[char]
    if (table && table[stroke]) {
      return `“${char}”加一笔（${stroke}）就变成“${table[stroke]}”。\n你在纸上写一写，会记得更牢哦。`
    }
    return `“${char}”加一笔会变成哪个字，我还没有学会。\n建议你查一查字典，或者问问语文老师，然后回来告诉我答案，好不好？`
  }

  // 4. 成语
  const idiom = findIdiom(text)
  if (idiom) {
    return [
      `成语「${idiom.word}」（${idiom.pinyin}）`,
      `意思：${idiom.meaning}`,
      `例句：${idiom.example}`
    ].join('\n')
  }

  // 5. 英语单词
  const word = findWord(text)
  if (word) {
    const isAskChinese = /英文|英语|怎么说|怎么读|翻译/.test(text) && !/[a-zA-Z]{3,}/.test(text)
    if (isAskChinese) {
      return `“${word.meaning}”的英文是 ${word.word} ${word.emoji}\n读音：${word.phonetic}\n例句：${word.example}\n跟我读两遍：${word.word}，${word.word}。`
    }
    return `${word.word} 意思是“${word.meaning}”，读音 ${word.phonetic} ${word.emoji}\n例句：${word.example}`
  }

  // 6. 学科引导
  if (/(数学|口算|计算|应用题|算术)/.test(text)) {
    return '数学题我们可以分三步：\n1. 读题：把题目读两遍，圈出数字和问题；\n2. 想方法：加法用凑十，减法用破十，乘法想口诀；\n3. 验算：把答案代回去检查。\n你可以把具体算式发给我，我陪你一起算。'
  }
  if (/(语文|拼音|识字|阅读|作文|古诗)/.test(text)) {
    return '语文的小秘诀：\n· 生字：先看结构，再书空笔顺，最后组两个词；\n· 古诗：读三遍 → 想画面 → 背一句遮一句；\n· 阅读：先读题目，再回文章里找答案。\n你可以直接告诉我哪首诗、哪个字，我来帮你。'
  }
  if (/(英语|单词|英文|发音)/.test(text)) {
    return '英语可以这样练：\n· 单词：看图说词，一天记 3 个就够；\n· 句子：先跟读，再自己说一遍；\n· 发音：把单词拆成音节慢慢读。\n告诉我你想查哪个单词，我帮你翻译并造句。'
  }

  // 7. 情绪与鼓励
  if (/(难过|不开心|考砸|考得不好|不会做|笨|不想学|害怕)/.test(text)) {
    return '先抱抱你。\n不会做、考不好，都只是“还没学会”，不代表你不行。\n我们挑一道最想弄懂的题，慢慢拆开看，好吗？如果心里还是难受，记得告诉爸爸妈妈。'
  }
  if (/(谢谢|感谢|你好|hi|hello|嗨)/i.test(text)) {
    return '你好呀！我是童伴里的 AI 小老师 🤖\n我能陪你算数学、背古诗、记单词，也能听你说说今天的事。\n（我是程序，不是真人老师，重要的知识要再和家长或老师确认哦。）'
  }

  // 8. 兜底
  return [
    `这个问题我还没有把握讲清楚，${grade} 年级的知识我还在学习中。`,
    '你可以这样问我：',
    '· 12 + 9 等于几？',
    '· “悯农”是谁写的？',
    '· 香蕉的英文怎么说？',
    '也可以把题目拍下来，问问爸爸妈妈或老师。'
  ].join('\n')
}

/** 欢迎语（首次进入 AI 页面时展示） */
export function aiGreeting(grade = 1) {
  return `你好呀！我是童伴的 AI 小老师 🤖\n现在是 ${grade} 年级模式，我会慢慢讲、一步一步讲。\n可以问我数学题、古诗、成语和英语单词哦～`
}
