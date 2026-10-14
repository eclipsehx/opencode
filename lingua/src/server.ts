import { q } from "./db"
import { ensureSeed } from "./seed"
import * as A from "./auth"
import { addXp, touch, skill, sowCards, gradeCard, dueCount } from "./study"
import { unlock } from "./achievements"
import { path } from "./recommend"
import pathMod from "node:path"

ensureSeed()

const XP_ANSWER = 8
const XP_LESSON = 25
const XP_REVIEW_OK = 3
const XP_REVIEW_MISS = 1

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } })
const err = (msg: string, status = 400) => json({ error: msg }, status)

type Row = Record<string, any>

function norm(s: string) {
  return s.toLowerCase().normalize("NFKC").replace(/[\p{P}\p{S}]/gu, "").replace(/\s+/g, " ").trim()
}

function lev(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

const similarity = (a: string, b: string) => {
  const [x, y] = [norm(a), norm(b)]
  return x === y ? 1 : x.length + y.length === 0 ? 0 : 1 - lev(x, y) / Math.max(x.length, y.length)
}

const nextOf = (lessonId: string) => {
  const cur = q("SELECT l.*, u.ord AS u_ord FROM lessons l JOIN units u ON u.id = l.unit_id WHERE l.id = ?").get(lessonId) as Row | undefined
  if (!cur) return null
  const next = q(
    `SELECT l.id FROM lessons l JOIN units u ON u.id = l.unit_id
     WHERE l.course_id = ? AND (u.ord > ? OR (u.ord = ? AND l.ord > ?)) ORDER BY u.ord, l.ord LIMIT 1`
  ).get(cur.course_id, cur.u_ord, cur.u_ord, cur.ord) as Row | undefined
  if (next) return next.id
  const course = q("SELECT * FROM courses WHERE id = ?").get(cur.course_id) as Row
  const c2 = q("SELECT id FROM courses WHERE lang = ? AND ord > ? ORDER BY ord LIMIT 1").get(course.lang, course.ord) as Row | undefined
  if (!c2) return null
  return (q("SELECT id FROM lessons WHERE course_id = ? ORDER BY ord LIMIT 1").get(c2.id) as Row).id
}

type Ctx = { req: Request; url: URL; me: A.User | null; p: Row; body: () => Promise<Row> }
type Handler = (c: Ctx) => Promise<Response> | Response
const routes: Array<{ m: string; re: RegExp; h: Handler }> = []
const route = (m: string, t: string, h: Handler) =>
  routes.push({ m, re: new RegExp("^" + t.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"), h })

const need = (c: Ctx) => c.me ?? json("请先登录", 401)

// ---------- 认证 ----------
route("POST", "/api/auth/register", async c => {
  const b = await c.req.json()
  const email = String(b.email ?? "").trim().toLowerCase()
  const name = String(b.name ?? "").trim()
  const pw = String(b.password ?? "")
  if (!/.+@.+\..+/.test(email)) return err("邮箱格式不正确")
  if (pw.length < 6) return err("密码至少 6 位")
  if (!name || name.length > 30) return err("昵称需为 1-30 个字符")
  if (!["en", "ja", "ko"].includes(b.target_lang)) return err("请选择学习语言")
  if (A.userByEmail(email)) return err("该邮箱已注册")
  const id = crypto.randomUUID()
  q("INSERT INTO users VALUES (?,?,?,?,?,'A1',0,0,NULL,?)").run(
    id, email, name, A.hash(pw), b.target_lang, new Date().toISOString()
  )
  const token = A.newSession(id)
  return json({ ok: true }, 200, { "set-cookie": A.cookie(token) })
})

route("POST", "/api/auth/login", async c => {
  const b = await c.req.json()
  const u = A.userByEmail(String(b.email ?? "").trim().toLowerCase())
  if (!u || !(await A.verify(String(b.password ?? ""), u.password_hash))) return err("邮箱或密码错误", 401)
  const token = A.newSession(u.id)
  return json({ ok: true }, 200, { "set-cookie": A.cookie(token) })
})

route("POST", "/api/auth/logout", c => {
  const sid = c.req.headers.get("cookie")?.match(/sid=([^;]+)/)?.[1]
  if (sid) A.dropSession(sid)
  return json({ ok: true }, 200, { "set-cookie": A.cookieOut })
})

route("GET", "/api/me", c => {
  if (!c.me) return json(null)
  const u = q("SELECT * FROM users WHERE id = ?").get(c.me.id) as Row
  return json({ id: u.id, email: u.email, name: u.name, target_lang: u.target_lang, level: u.level, xp: u.xp, streak: u.streak, due: dueCount(u.id) })
})

route("PATCH", "/api/me", async c => {
  const guard = need(c)
  if (guard instanceof Response) return guard
  const b = await c.req.json()
  if (b.name && String(b.name).trim().length) q("UPDATE users SET name = ? WHERE id = ?").run(String(b.name).trim().slice(0, 30), guard.id)
  if (["en", "ja", "ko"].includes(b.target_lang)) q("UPDATE users SET target_lang = ? WHERE id = ?").run(b.target_lang, guard.id)
  if (["A1", "A2"].includes(b.level)) q("UPDATE users SET level = ? WHERE id = ?").run(b.level, guard.id)
  return json({ ok: true })
})

// ---------- 课程 ----------
route("GET", "/api/catalog", c => {
  if (!c.me) return json("请先登录", 401)
  const courses = q("SELECT * FROM courses ORDER BY ord").all() as Row[]
  const units = q("SELECT * FROM units ORDER BY ord").all() as Row[]
  const lessons = q("SELECT * FROM lessons ORDER BY ord").all() as Row[]
  const done = new Map(
    (q("SELECT lesson_id, score FROM progress WHERE user_id = ?").all(c.me.id) as Row[]).map(r => [r.lesson_id, r.score])
  )
  return json(
    courses.map(co => ({
      ...co,
      units: units
        .filter(un => un.course_id === co.id)
        .map(un => ({
          ...un,
          lessons: lessons
            .filter(l => l.unit_id === un.id)
            .map(l => ({ id: l.id, title: l.title, blurb: l.blurb, xp: l.xp, done: done.has(l.id), score: done.get(l.id) ?? null })),
        })),
    }))
  )
})

route("GET", "/api/lesson/:id", c => {
  if (!c.me) return json("请先登录", 401)
  const lesson = q(
    "SELECT l.*, c.title AS course_title, c.lang, c.level FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?"
  ).get(c.p.id) as Row | undefined
  if (!lesson) return err("课程不存在", 404)
  const exercises = (q("SELECT * FROM exercises WHERE lesson_id = ? ORDER BY ord").all(lesson.id) as Row[]).map(e => ({
    id: e.id,
    kind: e.kind,
    front: e.front,
    options: e.options ? JSON.parse(e.options) : null,
  }))
  const prog = q("SELECT score FROM progress WHERE user_id = ? AND lesson_id = ?").get(c.me.id, lesson.id) as Row | undefined
  return json({ ...lesson, password_hash: undefined, done: Boolean(prog), score: prog?.score ?? null, exercises, next: nextOf(lesson.id) })
})

// ---------- 练习判分 ----------
route("POST", "/api/exercise/:id/answer", async c => {
  const guard = need(c)
  if (guard instanceof Response) return guard
  const b = await c.req.json()
  const e = q(
    "SELECT e.*, co.lang FROM exercises e JOIN lessons l ON l.id = e.lesson_id JOIN courses co ON co.id = l.course_id WHERE e.id = ?"
  ).get(c.p.id) as Row | undefined
  if (!e) return err("练习不存在", 404)
  const answer = String(b.answer ?? "")
  let correct = false
  let score: number | null = null
  if (e.kind === "vocab") correct = norm(answer) === norm(b.dir === "rev" ? e.front : e.back)
  else if (e.kind === "grammar") correct = answer === e.answer
  else if (e.kind === "listening") correct = norm(answer) === norm(e.answer)
  else if (e.kind === "speaking") {
    score = similarity(answer, e.answer)
    correct = score >= 0.6
  }
  const display = e.kind === "vocab" ? (b.dir === "rev" ? e.front : e.back) : e.answer
  const streak = touch(guard)
  if (correct) addXp(guard.id, XP_ANSWER)
  skill(guard.id, e.lang, e.kind, correct)
  return json({ correct, display, note: e.note ?? null, score, xp: correct ? XP_ANSWER : 0, streak })
})

route("POST", "/api/lesson/:id/complete", async c => {
  const guard = need(c)
  if (guard instanceof Response) return guard
  const b = await c.req.json()
  const lesson = q("SELECT * FROM lessons WHERE id = ?").get(c.p.id) as Row | undefined
  if (!lesson) return err("课程不存在", 404)
  const results: Array<{ id: string; correct: boolean }> = Array.isArray(b.results) ? b.results : []
  const total = Math.max(results.length, 1)
  const n = results.filter(r => r.correct).length
  const score = Math.round((n / total) * 100)
  const first = !q("SELECT 1 FROM progress WHERE user_id = ? AND lesson_id = ?").get(guard.id, lesson.id)
  q(`INSERT INTO progress VALUES (?,?,?,?) ON CONFLICT(user_id, lesson_id) DO UPDATE SET
     score = MAX(score, ?), completed_at = ?`).run(guard.id, lesson.id, score, new Date().toISOString(), score, new Date().toISOString())
  sowCards(guard.id, lesson.id)
  const streak = touch(guard)
  if (first) addXp(guard.id, XP_LESSON)
  const fresh = unlock(guard.id, streak)
  return json({ score, first_xp: first ? XP_LESSON : 0, streak, achievements: fresh, next: nextOf(lesson.id) })
})

// ---------- 复习（记忆曲线） ----------
route("GET", "/api/review/queue", c => {
  if (!c.me) return json("请先登录", 401)
  const cards = q(
    `SELECT s.exercise_id, e.front, e.back, co.lang FROM srs s
     JOIN exercises e ON e.id = s.exercise_id
     JOIN lessons l ON l.id = e.lesson_id JOIN courses co ON co.id = l.course_id
     WHERE s.user_id = ? AND s.due <= ? AND e.kind = 'vocab'
     ORDER BY s.due LIMIT 15`
  ).all(c.me.id, new Date().toISOString()) as Row[]
  const items = cards.map(card => {
    const distractors = (
      q(
        `SELECT e.front FROM exercises e JOIN lessons l ON l.id = e.lesson_id JOIN courses co ON co.id = l.course_id
         WHERE co.lang = ? AND e.kind = 'vocab' AND e.front != ? AND e.back != ? ORDER BY RANDOM() LIMIT 3`
      ).all(card.lang, card.front, card.back) as Row[]
    ).map(r => r.front)
    const options = [card.front, ...distractors].sort(() => Math.random() - 0.5)
    return { id: card.exercise_id, prompt: card.back, options, lang: card.lang }
  })
  return json({ items, due: dueCount(c.me.id) })
})

route("POST", "/api/review/answer", async c => {
  const guard = need(c)
  if (guard instanceof Response) return guard
  const b = await c.req.json()
  const card = q(
    "SELECT e.*, co.lang FROM srs s JOIN exercises e ON e.id = s.exercise_id JOIN lessons l ON l.id = e.lesson_id JOIN courses co ON co.id = l.course_id WHERE s.user_id = ? AND s.exercise_id = ?"
  ).get(guard.id, String(b.id ?? "")) as Row | undefined
  if (!card) return err("卡片不存在", 404)
  const correct = norm(String(b.answer ?? "")) === norm(card.front)
  const { interval, due } = gradeCard(guard.id, card.id, correct)
  const streak = touch(guard)
  addXp(guard.id, correct ? XP_REVIEW_OK : XP_REVIEW_MISS)
  skill(guard.id, card.lang, "vocab", correct)
  return json({ correct, display: card.front, xp: correct ? XP_REVIEW_OK : XP_REVIEW_MISS, interval, due, streak })
})

// ---------- 学习路径 / 统计 ----------
route("GET", "/api/path", c => {
  if (!c.me) return json("请先登录", 401)
  const u = q("SELECT * FROM users WHERE id = ?").get(c.me.id) as A.User
  const p = path(u) as any
  p.total = p.total.n
  return json(p)
})

route("GET", "/api/stats", c => {
  if (!c.me) return json("请先登录", 401)
  const u = q("SELECT * FROM users WHERE id = ?").get(c.me.id) as Row
  const skills = (q("SELECT kind, correct, total FROM skill_stats WHERE user_id = ? AND lang = ? AND total > 0").all(u.id, u.target_lang) as Row[]).map(s => ({
    ...s,
    acc: Math.round((s.correct / s.total) * 100),
  }))
  const activity = new Map(
    (q("SELECT day, xp FROM activity WHERE user_id = ? AND day >= ?").all(u.id, new Date(Date.now() - 13 * 864e5).toISOString().slice(0, 10)) as Row[]).map(r => [r.day, r.xp])
  )
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() + (i - 13) * 864e5).toISOString().slice(0, 10)
    return { day: d.slice(5), xp: activity.get(d) ?? 0 }
  })
  const counts = {
    lessons: (q("SELECT COUNT(*) AS n FROM progress WHERE user_id = ?").get(u.id) as Row).n,
    words: (q("SELECT COUNT(*) AS n FROM srs WHERE user_id = ? AND reps > 0").get(u.id) as Row).n,
    due: dueCount(u.id),
  }
  const achievements = (
    q(
      `SELECT a.*, ua.unlocked_at FROM achievements a
       LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ? ORDER BY a.id`
    ).all(u.id) as Row[]
  ).map(a => ({ ...a, unlocked: Boolean(a.unlocked_at) }))
  return json({ user: { ...u, password_hash: undefined, due: counts.due }, skills, activity: days, counts, achievements })
})

// ---------- 社区 ----------
const postRow = (p: Row, uid: string | null) => ({
  id: p.id,
  lang: p.lang,
  title: p.title,
  body: p.body,
  created_at: p.created_at,
  author: p.author,
  likes: p.likes,
  comments: p.n_comments,
  liked: Boolean(p.liked),
  mine: uid !== null && p.user_id === uid,
})

const POSTS_SQL = `SELECT p.*, u.name AS author,
  (SELECT COUNT(*) FROM likes k WHERE k.post_id = p.id) AS likes,
  (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS n_comments,
  EXISTS(SELECT 1 FROM likes k WHERE k.post_id = p.id AND k.user_id = ?) AS liked
  FROM posts p JOIN users u ON u.id = p.user_id`

route("GET", "/api/community", c => {
  if (!c.me) return json("请先登录", 401)
  const lang = c.url.searchParams.get("lang")
  const rows = lang
    ? (q(POSTS_SQL + " WHERE p.lang = ? ORDER BY p.created_at DESC LIMIT 50").all(c.me.id, lang) as Row[])
    : (q(POSTS_SQL + " ORDER BY p.created_at DESC LIMIT 50").all(c.me.id) as Row[])
  return json(rows.map(r => postRow(r, c.me!.id)))
})

route("POST", "/api/community", async c => {
  const guard = need(c)
  if (guard instanceof Response) return guard
  const b = await c.req.json()
  const title = String(b.title ?? "").trim()
  const body = String(b.body ?? "").trim()
  if (!title || !body) return err("标题和内容不能为空")
  const id = crypto.randomUUID()
  q("INSERT INTO posts VALUES (?,?,?,?,?,?)").run(id, guard.id, ["en", "ja", "ko"].includes(b.lang) ? b.lang : null, title.slice(0, 100), body.slice(0, 3000), new Date().toISOString())
  unlock(guard.id, guard.streak)
  return json({ id })
})

route("GET", "/api/community/:id", c => {
  if (!c.me) return json("请先登录", 401)
  const p = q(POSTS_SQL + " WHERE p.id = ?").get(c.me.id, c.p.id) as Row | undefined
  if (!p) return err("帖子不存在", 404)
  const comments = (
    q("SELECT cm.*, u.name AS author FROM comments cm JOIN users u ON u.id = cm.user_id WHERE cm.post_id = ? ORDER BY cm.created_at").all(c.p.id) as Row[]
  ).map(r => ({ id: r.id, body: r.body, author: r.author, created_at: r.created_at, mine: r.user_id === c.me!.id }))
  return json({ ...postRow(p, c.me.id), comments })
})

route("POST", "/api/community/:id/comment", async c => {
  const guard = need(c)
  if (guard instanceof Response) return guard
  const body = String((await c.req.json()).body ?? "").trim()
  if (!body) return err("评论不能为空")
  if (!q("SELECT 1 FROM posts WHERE id = ?").get(c.p.id)) return err("帖子不存在", 404)
  const id = crypto.randomUUID()
  q("INSERT INTO comments VALUES (?,?,?,?,?)").run(id, c.p.id, guard.id, body.slice(0, 1000), new Date().toISOString())
  return json({ id })
})

route("POST", "/api/community/:id/like", c => {
  const guard = need(c)
  if (guard instanceof Response) return guard
  if (!q("SELECT 1 FROM posts WHERE id = ?").get(c.p.id)) return err("帖子不存在", 404)
  const liked = q("SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?").get(c.p.id, guard.id)
  if (liked) q("DELETE FROM likes WHERE post_id = ? AND user_id = ?").run(c.p.id, guard.id)
  else q("INSERT INTO likes VALUES (?,?)").run(c.p.id, guard.id)
  const likes = (q("SELECT COUNT(*) AS n FROM likes WHERE post_id = ?").get(c.p.id) as Row).n
  return json({ liked: !liked, likes })
})

route("GET", "/api/leaderboard", c => {
  if (!c.me) return json("请先登录", 401)
  const rows = q("SELECT id, name, xp, streak FROM users ORDER BY xp DESC LIMIT 20").all() as Row[]
  return json(rows.map((r, i) => ({ rank: i + 1, ...r, me: r.id === c.me!.id })))
})

// ---------- 路由匹配 ----------
async function handle(req: Request) {
  const url = new URL(req.url)
  for (const r of routes) {
    if (r.m !== req.method) continue
    const m = url.pathname.match(r.re)
    if (!m) continue
    try {
      return await r.h({ req, url, me: A.userOf(req), p: m.groups ?? {}, body: () => req.json() })
    } catch (e) {
      console.error(e)
      return err("服务器内部错误", 500)
    }
  }
  return err("接口不存在", 404)
}

const PUB = pathMod.join(import.meta.dir, "../public")
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
}

Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname.startsWith("/api")) return handle(req)
    const file = pathMod.normalize(pathMod.join(PUB, decodeURIComponent(url.pathname)))
    const target = file.startsWith(PUB) && (await Bun.file(file).exists()) && pathMod.extname(file) ? file : pathMod.join(PUB, "index.html")
    return new Response(Bun.file(target), { headers: { "content-type": MIME[pathMod.extname(target)] ?? "application/octet-stream" } })
  },
})

console.log(`Lingua running at http://localhost:${process.env.PORT ?? 3000}`)
