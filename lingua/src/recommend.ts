import { q } from "./db"
import type { User } from "./auth"
import { dueCount } from "./study"

const KIND_LABEL: Record<string, string> = { vocab: "词汇", grammar: "语法", listening: "听力", speaking: "口语" }

type Task = {
  lesson_id: string
  title: string
  course_title: string
  level: string
  reason: string
  locked: boolean
  kinds: string[]
}

// 个性化学习路径：按课程顺序推进 + 针对薄弱技能加权推荐
export function path(u: User) {
  const lessons = q(
    `SELECT l.id, l.title, l.course_id, c.level, c.title AS course_title, c.ord AS c_ord, l.ord AS l_ord
     FROM lessons l JOIN courses c ON c.id = l.course_id
     WHERE c.lang = ? ORDER BY c.ord, l.unit_id, l.ord`
  ).all(u.target_lang) as Array<{ id: string; title: string; course_title: string; level: string; c_ord: number; l_ord: number }>

  const done = new Set(
    (q("SELECT lesson_id FROM progress WHERE user_id = ?").all(u.id) as Array<{ lesson_id: string }>).map(r => r.lesson_id)
  )
  const kindsOf = new Map<string, string[]>()
  for (const r of q("SELECT lesson_id, kind FROM exercises").all() as Array<{ lesson_id: string; kind: string }>) {
    kindsOf.set(r.lesson_id, [...(kindsOf.get(r.lesson_id) ?? []), r.kind])
  }

  const weakRow = q(
    "SELECT kind FROM skill_stats WHERE user_id = ? AND lang = ? AND total >= 2 ORDER BY CAST(correct AS REAL)/total ASC LIMIT 1"
  ).get(u.id, u.target_lang) as { kind: string } | undefined

  const todo = lessons.filter(l => !done.has(l.id))
  const tasks: Task[] = []
  for (const [i, l] of todo.slice(0, 3).entries()) {
    const prev = lessons[lessons.indexOf(l) - 1]
    const locked = i === 0 ? false : !done.has(todo[i - 1].id) || Boolean(prev && !done.has(prev.id))
    const kinds = kindsOf.get(l.id) ?? []
    const hit = weakRow && kinds.includes(weakRow.kind)
    tasks.push({
      lesson_id: l.id,
      title: l.title,
      course_title: l.course_title,
      level: l.level,
      locked: i === 0 ? false : locked,
      kinds,
      reason: hit
        ? `针对薄弱项：${KIND_LABEL[weakRow!.kind]}`
        : i === 0
          ? done.size === 0
            ? "从这里开始你的第一课"
            : "课程下一步"
          : "保持每日节奏",
    })
  }

  const levels = ["A1", "A2"]
  const suggestion =
    todo.length === 0
      ? "该语言课程已全部完成，换一门语言继续吧！"
      : levels.indexOf(u.level) < levels.indexOf(todo[0].level)
        ? `你正在学习 ${todo[0].level} 课程，可在「我的」页调整自评水平`
        : null

  return {
    due: dueCount(u.id),
    tasks,
    suggestion,
    done: done.size,
    total: q("SELECT COUNT(*) AS n FROM lessons l JOIN courses c ON c.id = l.course_id WHERE c.lang = ?").get(u.target_lang) as { n: number },
  }
}
