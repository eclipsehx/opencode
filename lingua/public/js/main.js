import { api } from "./api.js"
import { store } from "./store.js"
import { esc, toast } from "./ui.js"
import * as home from "./views/home.js"
import * as auth from "./views/auth.js"
import * as dash from "./views/dash.js"
import * as courses from "./views/courses.js"
import * as lesson from "./views/lesson.js"
import * as review from "./views/review.js"
import * as community from "./views/community.js"
import * as profile from "./views/profile.js"

const app = document.getElementById("app")

const routes = [
  { re: /^\/?$/, v: home, pub: true },
  { re: /^login$/, v: auth.login, pub: true },
  { re: /^register$/, v: auth.register, pub: true },
  { re: /^dash$/, v: dash },
  { re: /^courses$/, v: courses },
  { re: /^lesson\/([^/]+)$/, v: lesson },
  { re: /^review$/, v: review },
  { re: /^community$/, v: community },
  { re: /^profile$/, v: profile },
]

function nav() {
  const me = store.me
  const h = location.hash.replace(/^#\/?/, "")
  const link = (href, label, badge) =>
    `<a href="#/${href}" class="${h.startsWith(href) ? "on" : ""}">${label}${badge ? `<span class="bdg">${badge}</span>` : ""}</a>`
  document.getElementById("nav")?.remove()
  if (!me) {
    app.insertAdjacentHTML(
      "beforebegin",
      `<nav class="nav" id="nav"><div class="wrap">
        <a class="logo" href="#/"><span class="dot">🌐</span>Lingua</a>
        <div class="links"></div>
        <div class="row">
          <a class="btn ghost sm" href="#/login">登录</a>
          <a class="btn primary sm" href="#/register">免费注册</a>
        </div>
      </div></nav>`
    )
    return
  }
  app.insertAdjacentHTML(
    "beforebegin",
    `<nav class="nav" id="nav"><div class="wrap">
      <a class="logo" href="#/dash"><span class="dot">🌐</span>Lingua</a>
      <div class="links">
        ${link("dash", "学习")}
        ${link("courses", "课程")}
        ${link("review", "复习", me.due > 0 ? me.due : "")}
        ${link("community", "社区")}
        ${link("profile", "我的")}
      </div>
      <div class="row">
        <span class="chip-stat">🔥 ${me.streak}</span>
        <span class="chip-stat">⚡ ${me.xp} XP</span>
        <a href="#/profile" title="${esc(me.name)}"><span class="avatar">${esc(me.name.slice(0, 1))}</span></a>
      </div>
    </div></nav>`
  )
}

async function route() {
  const h = location.hash.replace(/^#\/?/, "")
  const r = routes.find(r => r.re.test(h))
  if (!r) return (location.hash = "#/")
  if (r.pub && store.me && r.v === home) return (location.hash = "#/dash")
  if (!r.pub) {
    try {
      store.me = await api("/me")
    } catch {
      store.me = null
      return (location.hash = "#/login")
    }
  }
  nav()
  window.scrollTo(0, 0)
  app.innerHTML = ""
  const [, ...groups] = h.match(r.re)
  try {
    await r.v.render(app, ...groups)
  } catch (e) {
    app.innerHTML = `<main class="wrap"><div class="card center"><h2>😅 页面走丢了</h2><p class="muted">${esc(e.message)}</p><br><a class="btn primary" href="#/dash">回到学习面板</a></div></main>`
  }
}

export function refreshMe() {
  nav()
}

export async function boot() {
  try {
    store.me = await api("/me")
  } catch {
    store.me = null
  }
  window.addEventListener("hashchange", route)
  route()
}

boot()
