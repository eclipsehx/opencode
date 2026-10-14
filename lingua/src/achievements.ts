import { q } from "./db"

type Stats = { lessons: number; streak: number; words: number; perfect: number; posts: number; langs: string[]; courses: string[] }

const RULES: Record<string, (s: Stats) => boolean> = {
  first_lesson: s => s.lessons >= 1,
  lessons_10: s => s.lessons >= 10,
  lessons_25: s => s.lessons >= 25,
  streak_3: s => s.streak >= 3,
  streak_7: s => s.streak >= 7,
  words_50: s => s.words >= 50,
  words_150: s => s.words >= 150,
  perfect_5: s => s.perfect >= 5,
  polyglot: s => s.langs.length >= 2,
  first_post: s => s.posts >= 1,
  social_5: s => s.posts >= 5,
}

export function stats(uid: string): Stats {
  const lessons = q(
    "SELECT COUNT(*) AS n, COUNT(DISTINCT c.lang) AS langs, SUM(p.score = 100) AS perfect FROM progress p JOIN lessons l ON l.id = p.lesson_id JOIN courses c ON c.id = l.course_id WHERE p.user_id = ?"
  ).get(uid) as { n: number; langs: number; perfect: number | null }
  const langs = q(
    "SELECT DISTINCT c.lang FROM progress p JOIN lessons l ON l.id = p.lesson_id JOIN courses c ON c.id = l.course_id WHERE p.user_id = ?"
  ).all(uid) as Array<{ lang: string }>
  const words = q("SELECT COUNT(*) AS n FROM srs WHERE user_id = ? AND reps > 0").get(uid) as { n: number }
  const posts = q("SELECT COUNT(*) AS n FROM posts WHERE user_id = ?").get(uid) as { n: number }
  const courses = (
    q(
      "SELECT c.id FROM courses c WHERE NOT EXISTS (SELECT 1 FROM lessons l WHERE l.course_id = c.id AND NOT EXISTS (SELECT 1 FROM progress p WHERE p.lesson_id = l.id AND p.user_id = ?))"
    ).all(uid) as Array<{ id: string }>
  ).map(r => r.id)
  return {
    lessons: lessons.n,
    streak: 0,
    words: words.n,
    perfect: lessons.perfect ?? 0,
    posts: posts.n,
    langs: langs.map(r => r.lang),
    courses,
  }
}

// 成就检查：返回本次新解锁的成就
export function unlock(uid: string, streak: number) {
  const s = { ...stats(uid), streak }
  const all = q("SELECT * FROM achievements").all() as Array<{ id: string }>
  const have = new Set(
    (q("SELECT achievement_id FROM user_achievements WHERE user_id = ?").all(uid) as Array<{ achievement_id: string }>).map(r => r.achievement_id)
  )
  const fresh = all.filter(a => !have.has(a.id) && (RULES[a.id]?.(s) ?? (a.id.startsWith("grad_") && s.courses.includes(a.id.slice(5)))))
  const ins = q("INSERT INTO user_achievements VALUES (?,?,?)")
  const now = new Date().toISOString()
  for (const a of fresh) ins.run(uid, a.id, now)
  return fresh
}
