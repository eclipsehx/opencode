import { db, q } from "./db"

type Vocab = [word: string, meaning: string]
type Gram = [sentence: string, options: string[], answer: string, note: string]
type LessonSpec = { t: string; b: string; vocab: Vocab[]; gram: Gram; listen: string; speak: string }
type UnitSpec = { t: string; lessons: LessonSpec[] }
type CourseSpec = { id: string; lang: string; level: string; title: string; blurb: string; units: UnitSpec[] }

export const LANGS = [
  { code: "en", name: "英语", flag: "🇬🇧", tts: "en-US" },
  { code: "ja", name: "日语", flag: "🇯🇵", tts: "ja-JP" },
  { code: "ko", name: "韩语", flag: "🇰🇷", tts: "ko-KR" },
]

const DATA: CourseSpec[] = [
  {
    id: "en-a1", lang: "en", level: "A1", title: "英语入门 · A1", blurb: "零基础起步：打招呼、数字、家庭与日常餐饮。",
    units: [
      {
        t: "第一单元 · 打招呼与自我介绍",
        lessons: [
          {
            t: "问候与告别", b: "学会最常用的问候语和 be 动词",
            vocab: [["hello", "你好"], ["goodbye", "再见"], ["thank you", "谢谢"], ["please", "请"], ["sorry", "对不起"], ["morning", "早晨"], ["night", "夜晚"], ["friend", "朋友"]],
            gram: ["I ___ a student.", ["am", "is", "are", "be"], "am", "主语为 I 时 be 动词用 am。"],
            listen: "Nice to meet you.",
            speak: "Good morning! Have a nice day.",
          },
          {
            t: "数字与年龄", b: "掌握基础数字，学会介绍自己的年龄",
            vocab: [["one", "一"], ["two", "二"], ["three", "三"], ["five", "五"], ["eight", "八"], ["ten", "十"], ["age", "年龄"], ["old", "……岁的"]],
            gram: ["How ___ are you? — I am 20.", ["old", "much", "many", "is"], "old", "询问年龄固定用 How old are you。"],
            listen: "I am nineteen years old.",
            speak: "I am twenty years old. Nice to meet you.",
          },
        ],
      },
      {
        t: "第二单元 · 日常生活",
        lessons: [
          {
            t: "家庭与朋友", b: "介绍你的家人，区分 he 与 she",
            vocab: [["family", "家庭"], ["mother", "母亲"], ["father", "父亲"], ["sister", "姐妹"], ["brother", "兄弟"], ["this", "这"], ["my", "我的"], ["his", "他的"]],
            gram: ["___ is my sister. She is a doctor.", ["He", "She", "It", "They"], "She", "指代女性用 She，句首字母大写。"],
            listen: "This is my mother. She is a teacher.",
            speak: "This is my family. I love them.",
          },
          {
            t: "食物与点餐", b: "常用食物词与 a/an 的用法",
            vocab: [["rice", "米饭"], ["water", "水"], ["coffee", "咖啡"], ["tea", "茶"], ["bread", "面包"], ["menu", "菜单"], ["hungry", "饥饿的"], ["eat", "吃"]],
            gram: ["I would like ___ apple.", ["a", "an", "the", "some"], "an", "apple 以元音音素开头，冠词用 an。"],
            listen: "I would like a cup of coffee, please.",
            speak: "Can I have the menu, please?",
          },
        ],
      },
    ],
  },
  {
    id: "en-a2", lang: "en", level: "A2", title: "英语进阶 · A2", blurb: "走出国门：问路、交通、工作面试与未来计划。",
    units: [
      {
        t: "第一单元 · 旅行与出行",
        lessons: [
          {
            t: "问路与方向", b: "在异国街头不再迷路",
            vocab: [["street", "街道"], ["turn", "转弯"], ["left", "左"], ["right", "右"], ["near", "在附近"], ["straight", "直的"], ["crossing", "十字路口"], ["station", "车站"]],
            gram: ["Go ___ and turn left at the bank.", ["straight", "good", "fine", "welcome"], "straight", "go straight 意为“直走”。"],
            listen: "Excuse me, how can I get to the station?",
            speak: "Go straight and turn right at the second crossing.",
          },
          {
            t: "交通与购票", b: "买票乘车，掌握一般现在时三单",
            vocab: [["ticket", "票"], ["train", "火车"], ["plane", "飞机"], ["airport", "机场"], ["platform", "站台"], ["arrive", "到达"], ["leave", "离开"], ["late", "迟的"]],
            gram: ["The train ___ at 8:15 every morning.", ["leave", "leaves", "left", "leaving"], "leaves", "主语为第三人称单数，一般现在时动词加 -s。"],
            listen: "The next train to the airport leaves from platform two.",
            speak: "Two tickets to the airport, please.",
          },
        ],
      },
      {
        t: "第二单元 · 工作与计划",
        lessons: [
          {
            t: "工作与面试", b: "面试高频表达与现在完成时",
            vocab: [["job", "工作"], ["company", "公司"], ["resume", "简历"], ["meeting", "会议"], ["team", "团队"], ["busy", "忙碌的"], ["experience", "经验"], ["interview", "面试"]],
            gram: ["She ___ worked here for five years.", ["has", "have", "is", "was"], "has", "第三人称单数用 has + 过去分词，构成现在完成时。"],
            listen: "I have three years of experience in marketing.",
            speak: "I am hard-working and I enjoy working with a team.",
          },
          {
            t: "计划与愿望", b: "用 will 谈论未来打算",
            vocab: [["plan", "计划"], ["future", "未来"], ["travel", "旅行"], ["hope", "希望"], ["learn", "学习"], ["next", "下一个"], ["weekend", "周末"], ["maybe", "也许"]],
            gram: ["I ___ to visit Japan next year.", ["will", "am", "did", "was"], "will", "will + 动词原形表示将来的计划。"],
            listen: "We are going to travel around Europe next summer.",
            speak: "Next weekend I will learn a new language.",
          },
        ],
      },
    ],
  },
  {
    id: "ja-a1", lang: "ja", level: "A1", title: "日语入门 · A1", blurb: "从あいさつ开始：问候、自我介绍、时间与食物。",
    units: [
      {
        t: "第一单元 · あいさつ与自我介绍",
        lessons: [
          {
            t: "あいさつ 打招呼", b: "最常用的日语寒暄语与「です」",
            vocab: [["こんにちは", "你好"], ["ありがとう", "谢谢"], ["すみません", "对不起；劳驾"], ["はい", "是"], ["いいえ", "不是"], ["おはよう", "早上好"], ["こんばんは", "晚上好"], ["さようなら", "再见"]],
            gram: ["わたしは学生___。", ["です", "ます", "でした", "ません"], "です", "です 是敬体判断词，相当于“是”。"],
            listen: "はじめまして。どうぞよろしく。",
            speak: "おはようございます。",
          },
          {
            t: "自己紹介 自我介绍", b: "介绍姓名与职业，掌握助词「は」",
            vocab: [["わたし", "我"], ["あなた", "你"], ["名前", "名字"], ["学生", "学生"], ["先生", "老师"], ["日本人", "日本人"], ["会社員", "公司职员"], ["友達", "朋友"]],
            gram: ["田中さん___会社員です。", ["は", "が", "を", "に"], "は", "「は」是主题助词，用于标记话题。"],
            listen: "わたしは田中です。学生です。",
            speak: "わたしはリンです。どうぞよろしくお願いします。",
          },
        ],
      },
      {
        t: "第二单元 · 日常生活",
        lessons: [
          {
            t: "数字与时间", b: "报出时间，询问「何時」",
            vocab: [["いち", "一"], ["に", "二"], ["さん", "三"], ["時", "点（钟点）"], ["分", "分"], ["今", "现在"], ["朝", "早晨"], ["夜", "晚上"]],
            gram: ["今___時ですか。", ["何", "誰", "どこ", "いつ"], "何", "「何時」用于询问时间。"],
            listen: "今、九時です。",
            speak: "朝七時に起きます。",
          },
          {
            t: "食べ物 食物", b: "常见食物名与宾语助词「を」",
            vocab: [["水", "水"], ["お茶", "茶"], ["ご飯", "米饭"], ["パン", "面包"], ["肉", "肉"], ["魚", "鱼"], ["野菜", "蔬菜"], ["朝ご飯", "早饭"]],
            gram: ["パン___食べます。", ["を", "は", "が", "に"], "を", "「を」标记他动词的宾语。"],
            listen: "毎朝、ご飯を食べます。",
            speak: "わたしはお茶が好きです。",
          },
        ],
      },
    ],
  },
  {
    id: "ja-a2", lang: "ja", level: "A2", title: "日语进阶 · A2", blurb: "实用性进阶：车站出行、购物砍价、爱好与天气。",
    units: [
      {
        t: "第一单元 · 旅行と買い物",
        lessons: [
          {
            t: "駅で 在车站", b: "乘车问路，掌握方向助词「へ」",
            vocab: [["切符", "车票"], ["電車", "电车"], ["駅", "车站"], ["次", "下一个"], ["乗ります", "乘坐"], ["降ります", "下车"], ["いくら", "多少钱"], ["どこ", "哪里"]],
            gram: ["京都___行きたいです。", ["に", "へ", "で", "と"], "へ", "表示移动方向用「へ」（也可用に）。"],
            listen: "すみません、駅はどこですか。",
            speak: "この電車は京都へ行きますか。",
          },
          {
            t: "買い物 购物", b: "问价还价，掌握「をください」句型",
            vocab: [["店", "商店"], ["円", "日元"], ["高い", "贵的"], ["安い", "便宜的"], ["新しい", "新的"], ["ください", "请给我"], ["財布", "钱包"], ["かばん", "包"]],
            gram: ["これ___ください。", ["を", "は", "も", "の"], "を", "「を + ください」表示想要某物。"],
            listen: "このかばんはいくらですか。",
            speak: "それをください。ありがとうございます。",
          },
        ],
      },
      {
        t: "第二单元 · 趣味と天気",
        lessons: [
          {
            t: "趣味 爱好", b: "聊聊爱好，掌握「こと」名词化",
            vocab: [["趣味", "爱好"], ["音楽", "音乐"], ["映画", "电影"], ["読みます", "读"], ["泳ぎます", "游泳"], ["旅行", "旅行"], ["写真", "照片"], ["作ります", "制作"]],
            gram: ["趣味は音楽___聞くことです。", ["を", "に", "が", "へ"], "を", "「音楽を聞く」即“听音乐”。"],
            listen: "週末はよく映画を見ます。",
            speak: "わたしの趣味は音楽です。",
          },
          {
            t: "天気 天气", b: "描述天气，掌握推测表达「でしょう」",
            vocab: [["天気", "天气"], ["晴れ", "晴天"], ["雨", "雨"], ["雪", "雪"], ["暑い", "热的"], ["寒い", "冷的"], ["風", "风"], ["明日", "明天"]],
            gram: ["明日は雨が___でしょう。", ["降る", "降り", "降って", "降った"], "降る", "「でしょう」前用动词基本形表示推测。"],
            listen: "明日はいい天気になります。",
            speak: "今日は本当に暑いですね。",
          },
        ],
      },
    ],
  },
  {
    id: "ko-a1", lang: "ko", level: "A1", title: "韩语入门 · A1", blurb: "从인사말开始：问候、自我介绍、数字年龄与美食。",
    units: [
      {
        t: "第一单元 · 인사와 자기소개",
        lessons: [
          {
            t: "인사말 打招呼", b: "韩语寒暄语与「입니다」句型",
            vocab: [["안녕하세요", "你好"], ["감사합니다", "谢谢"], ["죄송합니다", "对不起"], ["네", "是"], ["아니요", "不是"], ["안녕히 가세요", "再见（对走的人）"], ["처음 뵙겠습니다", "初次见面"], ["잘 부탁드립니다", "请多关照"]],
            gram: ["저는 학생____.", ["입니다", "합니다", "됩니다", "입니까"], "입니다", "-입니다 接在名词后表示“是……”。"],
            listen: "안녕하세요. 반갑습니다.",
            speak: "안녕히 계세요.",
          },
          {
            t: "자기소개 自我介绍", b: "介绍名字与国籍",
            vocab: [["이름", "名字"], ["나라", "国家"], ["중국", "中国"], ["한국", "韩国"], ["일본", "日本"], ["학생", "学生"], ["회사원", "上班族"], ["선생님", "老师"]],
            gram: ["제____는 김민수입니다.", ["이름", "나라", "학생", "감사"], "이름", "이름 意为“名字”。"],
            listen: "저는 왕리라고 합니다.",
            speak: "안녕하세요. 저는 왕리입니다.",
          },
        ],
      },
      {
        t: "第二单元 · 일상 생활",
        lessons: [
          {
            t: "숫자와 나이 数字与年龄", b: "韩语固有数词与年龄表达",
            vocab: [["하나", "一"], ["둘", "二"], ["셋", "三"], ["나이", "年龄"], ["살", "岁"], ["몇", "多少"], ["스물", "二十"], ["서른", "三十"]],
            gram: ["저는 스물세____입니다.", ["살", "개", "명", "년"], "살", "年龄用「살」计数（세 是敬语形式）。"],
            listen: "제 나이는 스물다섯 살입니다.",
            speak: "제 나이는 스물두 살입니다.",
          },
          {
            t: "음식 食物", b: "韩式美食词汇与宾语助词「를/을」",
            vocab: [["김치", "泡菜"], ["물", "水"], ["커피", "咖啡"], ["밥", "米饭"], ["불고기", "烤肉"], ["맛있다", "好吃"], ["배고프다", "饿"], ["주문하다", "点餐"]],
            gram: ["김치____ 먹어요.", ["를", "이", "에서", "부터"], "를", "宾语助词：无收音用「를」，有收音用「을」。"],
            listen: "저는 불고기를 좋아해요.",
            speak: "커피 한 잔 주세요.",
          },
        ],
      },
    ],
  },
  {
    id: "ko-a2", lang: "ko", level: "A2", title: "韩语进阶 · A2", blurb: "出行与生活：问路、购物砍价、爱好与天气。",
    units: [
      {
        t: "第一单元 · 여행과 쇼핑",
        lessons: [
          {
            t: "길 묻기 问路", b: "在首尔街头问路不慌张",
            vocab: [["길", "路"], ["왼쪽", "左边"], ["오른쪽", "右边"], ["직진", "直行"], ["근처", "附近"], ["지도", "地图"], ["역", "车站"], ["건너가다", "穿过"]],
            gram: ["지하철역____ 어떻게 가요?", ["에", "에서", "을", "도"], "에", "表示目的地用「에 가요」。"],
            listen: "죄송한데요, 지하철역이 어디예요?",
            speak: "직진하시고 오른쪽으로 가세요.",
          },
          {
            t: "쇼핑 购物", b: "问价砍价，掌握主题助词「은」",
            vocab: [["얼마", "多少钱"], ["원", "韩元"], ["비싸다", "贵"], ["싸다", "便宜"], ["옷", "衣服"], ["신발", "鞋"], ["계산하다", "结账"], ["깎아주세요", "请便宜一点"]],
            gram: ["이 옷____ 얼마예요?", ["은", "는", "을", "로"], "은", "有收音的名词后主题助词用「은」。"],
            listen: "이 신발을 보여 주세요.",
            speak: "좀 깎아 주세요. 그럼 사겠어요.",
          },
        ],
      },
      {
        t: "第二单元 · 취미와 날씨",
        lessons: [
          {
            t: "취미 爱好", b: "谈论兴趣爱好",
            vocab: [["취미", "爱好"], ["음악", "音乐"], ["영화", "电影"], ["노래", "歌曲"], ["그림", "画"], ["요리", "料理；做菜"], ["배우다", "学习"], ["좋아하다", "喜欢"]],
            gram: ["저는 음악____ 듣는 것을 좋아해요.", ["을", "이", "에", "로"], "을", "「음악을 듣다」即“听音乐”。"],
            listen: "주말에 친구와 영화를 봐요.",
            speak: "제 취미는 요리예요.",
          },
          {
            t: "날씨 天气", b: "描述天气，掌握推测「-겠어요」",
            vocab: [["날씨", "天气"], ["맑다", "晴朗"], ["비", "雨"], ["눈", "雪"], ["덥다", "热"], ["춥다", "冷"], ["바람", "风"], ["내일", "明天"]],
            gram: ["내일은 날씨가____겠어요.", ["맑", "맑아", "맑는", "맑았"], "맑", "「맑겠어요」：겠 与形容词词干连用表示推测。"],
            listen: "오늘 날씨가 정말 좋네요.",
            speak: "내일은 비가 올 것 같아요.",
          },
        ],
      },
    ],
  },
]

const ACH = [
  ["first_lesson", "🎯", "初出茅庐", "完成第一节课"],
  ["lessons_10", "📚", "勤学不辍", "累计完成 10 节课"],
  ["lessons_25", "🏆", "课程达人", "累计完成 25 节课"],
  ["streak_3", "🔥", "三日不辍", "连续学习 3 天"],
  ["streak_7", "⚡", "七日之约", "连续学习 7 天"],
  ["words_50", "🃏", "词汇新秀", "掌握 50 个单词"],
  ["words_150", "🧠", "词汇大师", "掌握 150 个单词"],
  ["perfect_5", "💯", "完美主义", "5 次满分通过课程"],
  ["polyglot", "🌍", "多语者", "在 2 种语言中完成课程"],
  ["first_post", "💬", "初来乍到", "发布第一个帖子"],
  ["social_5", "🎉", "社区之星", "发布 5 个帖子"],
]

function pick<T>(arr: T[], n: number): T[] {
  const c = [...arr]
  const out: T[] = []
  while (out.length < n && c.length) out.push(...c.splice(Math.floor(Math.random() * c.length), 1))
  return out
}

function shuffle<T>(arr: T[]): T[] {
  return pick(arr, arr.length)
}

export function ensureSeed() {
  const done = q("SELECT COUNT(*) AS n FROM courses").get() as { n: number }
  if (done.n > 0) return

  const insCourse = q("INSERT INTO courses VALUES (?,?,?,?,?,?)")
  const insUnit = q("INSERT INTO units VALUES (?,?,?,?)")
  const insLesson = q("INSERT INTO lessons VALUES (?,?,?,?,?,?,?)")
  const insEx = q("INSERT INTO exercises VALUES (?,?,?,?,?,?,?,?,?)")
  const insAch = q("INSERT INTO achievements VALUES (?,?,?,?)")

  for (const [i, c] of DATA.entries()) {
    insCourse.run(c.id, c.lang, c.level, c.title, c.blurb, i)
    insAch.run(`grad_${c.id}`, "🎓", `毕业：${c.title}`, `完成《${c.title}》全部课程`)
    const pool = c.units.flatMap(u => u.lessons.flatMap(l => l.vocab.map(v => v[1])))
    for (const [ui, u] of c.units.entries()) {
      const uid = `${c.id}-u${ui + 1}`
      insUnit.run(uid, c.id, u.t, ui)
      for (const [li, l] of u.lessons.entries()) {
        const lid = `${uid}-l${li + 1}`
        insLesson.run(lid, uid, c.id, l.t, l.b, li, 40)
        let ord = 1
        for (const [front, back] of l.vocab.slice(0, 4)) {
          const wrong = pick(pool.filter(m => m !== back), 3)
          insEx.run(`${lid}-e${ord}`, lid, "vocab", front, back, back, JSON.stringify(shuffle([back, ...wrong])), null, ord++)
        }
        const [sent, opts, ans, note] = l.gram
        insEx.run(`${lid}-e${ord}`, lid, "grammar", sent, ans, ans, JSON.stringify(opts), note, ord++)
        insEx.run(`${lid}-e${ord}`, lid, "listening", "听录音，输入你听到的内容", null, l.listen, null, null, ord++)
        insEx.run(`${lid}-e${ord}`, lid, "speaking", l.speak, null, l.speak, null, null, ord++)
      }
    }
  }
  for (const a of ACH) insAch.run(...a)

  seedCommunity()
  seedDemo()
  console.log("seeded")
}

function seedCommunity() {
  const insUser = q("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?)")
  const insPost = q("INSERT INTO posts VALUES (?,?,?,?,?,?)")
  const insComment = q("INSERT INTO comments VALUES (?,?,?,?,?)")
  const insLike = q("INSERT INTO likes VALUES (?,?)")
  const now = new Date().toISOString()
  const bots: Array<[string, string, string]> = [
    ["bot1@lingua.app", "小鱼", "en"],
    ["bot2@lingua.app", "东健", "ko"],
    ["bot3@lingua.app", "樱子", "ja"],
  ]
  const ids: string[] = []
  for (const [email, name, lang] of bots) {
    const id = crypto.randomUUID()
    ids.push(id)
    insUser.run(id, email, name, Bun.password.hashSync("lingua-bot-" + name), lang, "A2", 300 + Math.floor(Math.random() * 400), 2 + Math.floor(Math.random() * 5), now, now)
  }
  const posts: Array<[number, string, string, string, string]> = [
    [0, "en", "英语口语提升心得：每天跟读 10 分钟真的有用", "坚持用平台的口语跟读功能一个月了，从开口就卡壳到现在能完整读出 A2 的句子。心得：先听两遍原音，模仿语调再开口，别怕机器打分低，慢慢就上来了。"],
    [1, "ko", "韩语发音入门：松音、紧音、送气音一次搞懂", "很多初学者分不清 가/까/카，其实区别在声带的紧张度和气流。我的方法是：松音放松读，紧音憋住喉咙读，送气音拿纸巾放嘴前感受气流。"],
    [2, "ja", "日语 N5 语法难点：は和が的区别总结", "简单说：は 提示旧信息/话题，が 提示新信息/主语。「私は学生です」回答你是谁；「誰が来ましたか」「田中さんが来ました」强调谁。"],
    [0, "en", "打卡第 7 天！坚持真的会看到变化", "连续学习一周啦 🔥 之前背了就忘的单词，用复习功能按照记忆曲线巩固之后，正确率明显提高了。大家也来坚持打卡吧！"],
  ]
  for (const [bi, lang, title, body] of posts) {
    const pid = crypto.randomUUID()
    insPost.run(pid, ids[bi], lang, title, body, now)
    insLike.run(pid, ids[(bi + 1) % 3])
    insLike.run(pid, ids[(bi + 2) % 3])
    insComment.run(crypto.randomUUID(), pid, ids[(bi + 1) % 3], bi % 2 ? "总结得太好了，收藏学习！" : "感谢分享，一起加油！", now)
  }
}

function seedDemo() {
  const insUser = q("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?)")
  const insProgress = q("INSERT INTO progress VALUES (?,?,?,?)")
  const insSrs = q("INSERT INTO srs VALUES (?,?,?,?,?,?)")
  const id = crypto.randomUUID()
  const now = new Date()
  const past = new Date(now.getTime() - 864e5).toISOString().slice(0, 10)
  insUser.run(id, "demo@lingua.app", "演示用户", Bun.password.hashSync("demo1234"), "en", "A1", 96, 2, past, past)
  insProgress.run(id, "en-a1-u1-l1", 90, past)
  const due = new Date(now.getTime() - 36e5).toISOString()
  for (const ord of [1, 2, 3, 4]) insSrs.run(id, `en-a1-u1-l1-e${ord}`, 0, due, 1, 0)
  console.log("demo user: demo@lingua.app / demo1234")
}
