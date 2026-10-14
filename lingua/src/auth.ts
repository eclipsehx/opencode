import { q } from "./db"

export type User = {
  id: string
  email: string
  name: string
  password_hash: string
  target_lang: string
  level: string
  xp: number
  streak: number
  last_active: string | null
  created_at: string
}

export const userById = (id: string) => q("SELECT * FROM users WHERE id = ?").get(id) as User | null
export const userByEmail = (email: string) => q("SELECT * FROM users WHERE email = ?").get(email) as User | null

export const hash = (pw: string) => Bun.password.hashSync(pw)
export const verify = (pw: string, h: string) => Bun.password.verifySync(pw, h)

export function newSession(uid: string) {
  const token = crypto.randomUUID() + crypto.randomUUID()
  const exp = new Date(Date.now() + 30 * 864e5).toISOString()
  q("INSERT INTO sessions VALUES (?,?,?)").run(token, uid, exp)
  return token
}

export function dropSession(token: string) {
  q("DELETE FROM sessions WHERE token = ?").run(token)
}

export function userOf(req: Request): User | null {
  const sid = req.headers
    .get("cookie")
    ?.split(";")
    .map(s => s.trim().split("="))
    .find(([k]) => k === "sid")?.[1]
  if (!sid) return null
  const row = q(
    "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?"
  ).get(sid, new Date().toISOString()) as User | undefined
  return row ?? null
}

export const cookie = (token: string) =>
  `sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}`

export const cookieOut = "sid=; Path=/; HttpOnly; Max-Age=0"
