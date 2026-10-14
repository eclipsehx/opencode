import { LANGS } from "./store.js"

export const esc = s =>
  String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))

export function el(html) {
  const t = document.createElement("template")
  t.innerHTML = html.trim()
  return t.content.firstElementChild
}

export function toast(msg, ok = false) {
  const t = el(`<div class="toast ${ok ? "ok" : ""}">${esc(msg)}</div>`)
  document.getElementById("toasts").append(t)
  setTimeout(() => t.remove(), 3400)
}

export function modal(html) {
  const ov = el(`<div class="overlay"><div class="modal">${html}</div></div>`)
  ov.addEventListener("click", e => e.target === ov && ov.remove())
  document.body.append(ov)
  return ov
}

export const ago = iso => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return "刚刚"
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`
  return `${Math.floor(s / 86400)} 天前`
}

export const langOf = code => LANGS[code] ?? { name: "综合", flag: "🌐", tts: "zh-CN" }

export function speak(text, langCode, slow = false) {
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = langOf(langCode).tts
    u.rate = slow ? 0.55 : 0.95
    speechSynthesis.speak(u)
  } catch {
    toast("当前浏览器不支持语音合成，建议使用 Chrome")
  }
}

const norm = s =>
  s.toLowerCase().normalize("NFKC").replace(/[\p{P}\p{S}]/gu, "").replace(/\s+/g, " ").trim()

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

export const similarity = (a, b) => {
  const [x, y] = [norm(a), norm(b)]
  return x === y ? 1 : !x || !y ? 0 : Math.max(0, 1 - lev(x, y) / Math.max(x.length, y.length))
}

// 语音识别：返回实例（可能为 null），start/stop 由调用方控制
export function recognizer(langCode, { partial, done } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null
  const r = new SR()
  r.lang = langOf(langCode).tts
  r.interimResults = true
  r.continuous = true
  let text = ""
  r.onresult = e => {
    text = ""
    for (const res of e.results) text += res[0].transcript
    partial?.(text)
  }
  r.onerror = () => done?.(text, true)
  r.onend = () => done?.(text, false)
  return r
}

export const micSupported = () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

export const avatar = name => ["🦊", "🐼", "🐨", "🦉", "🐢", "🐳", "🦋", "🍀"][Array.from(name ?? "?").reduce((a, c) => a + c.codePointAt(0), 0) % 8]
