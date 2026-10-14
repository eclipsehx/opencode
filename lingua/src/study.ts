import { q } from "./db"
import type { User } from "./auth"

const DAY = 864e5

const today = () => new Date().toISOString().slice(0, 10)
const days = (n: number) => new Date(Date.now() + n * DAY).toISOString()

// 记录当日活跃并维护连击天数
export function touch(u: User) {
  const t = today()
  const last = u.last_active?.slice(0, 10)
  if (last === t) return u.streak
  const streak = last === new Date(Date.now() - DAY).toISOString().slice(0, 10) ? u.streak + 1 : 1
  q("UPDATE users SET streak = ?, last_active = ? WHERE id = ?").run(streak, t, u.id)
  return streak
}

export function addXp(uid: string, n: number) {
  q("UPDATE users SET xp = xp + ? WHERE id = ?").run(n, uid)
  q(`INSERT INTO activity VALUES (?,?,?) ON CONFLICT(user_id, day) DO UPDATE SET xp = xp + ${n}`).run(uid, today(), n)
}

export function skill(uid: string, lang: string, kind: string, correct: boolean) {
  q(`INSERT INTO skill_stats VALUES (?,?,?, ?,1) ON CONFLICT(user_id, lang, kind) DO UPDATE SET
     correct = correct + ${correct ? 1 : 0}, total = total + 1`).run(uid, lang, kind, correct ? 1 : 0)
}

// 完成课程后，将该课的生词加入记忆卡片队列
export function sowCards(uid: string, lessonId: string) {
  const rows = q("SELECT id FROM exercises WHERE lesson_id = ? AND kind = 'vocab'").all(lessonId) as Array<{ id: string }>
  const ins = q("INSERT OR IGNORE INTO srs VALUES (?,?,0,?,0,0)")
  for (const r of rows) ins.run(uid, r.id, new Date().toISOString())
}

export function gradeCard(uid: string, exId: string, ok: boolean) {
  const card = q("SELECT * FROM srs WHERE user_id = ? AND exercise_id = ?").get(uid, exId) as
    | { interval: number; reps: number; lapses: number }
    | undefined
  const s = card ?? { interval: 0, reps: 0, lapses: 0 }
  const interval = ok ? (s.interval < 1 ? 1 : Math.min(60, Math.round(s.interval * (s.reps % 2 ? 2.3 : 1.6)))) : 0
  const due = ok ? days(interval) : new Date(Date.now() + 6e5).toISOString()
  q(`INSERT INTO srs VALUES (?,?,?,?,?,?) ON CONFLICT(user_id, exercise_id) DO UPDATE SET
     interval = ?, due = ?, reps = reps + 1, lapses = lapses + ?`).run(
    uid, exId, interval, due, 0, ok ? s.lapses : s.lapses + 1,
    interval, due, ok ? 0 : 1
  )
  return { interval, due }
}

export const dueCount = (uid: string) =>
  (q("SELECT COUNT(*) AS n FROM srs WHERE user_id = ? AND due <= ?").get(uid, new Date().toISOString()) as { n: number }).n
