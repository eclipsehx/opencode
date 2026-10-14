import { api } from "../api.js"
import { esc, toast } from "../ui.js"

function card(kind, app) {
  const reg = kind === "register"
  app.innerHTML = `
  <main class="wrap">
    <div class="card pad-lg auth-card">
      <div class="center" style="margin-bottom:18px">
        <div style="font-size:34px">🌐</div>
        <h2>${reg ? "创建你的学习账号" : "欢迎回来"}</h2>
        <p class="muted">${reg ? "注册即开始你的多语种之旅" : "继续今天的语言学习吧"}</p>
      </div>
      <div class="tabs">
        <button data-k="login" class="${reg ? "" : "on"}">登录</button>
        <button data-k="register" class="${reg ? "on" : ""}">注册</button>
      </div>
      <form id="f">
        ${reg
          ? `<label class="lbl">昵称</label><input class="input" name="name" placeholder="给自己起个名字" maxlength="30" required>
             <label class="lbl">想学哪门语言？</label>
             <div class="lang-pick">
               <button type="button" data-l="en" class="on"><span class="fl">🇬🇧</span>英语</button>
               <button type="button" data-l="ja"><span class="fl">🇯🇵</span>日语</button>
               <button type="button" data-l="ko"><span class="fl">🇰🇷</span>韩语</button>
             </div>`
          : ""}
        <label class="lbl">邮箱</label><input class="input" name="email" type="email" placeholder="you@example.com" required>
        <label class="lbl">密码</label><input class="input" name="password" type="password" placeholder="${reg ? "至少 6 位" : "输入密码"}" required>
        <div id="err"></div>
        <br>
        <button class="btn primary big block" type="submit">${reg ? "注册并开始学习" : "登录"}</button>
      </form>
      ${reg ? "" : `<br><button class="btn soft block" id="demo">🎯 用演示账号体验（demo@lingua.app）</button>`}
    </div>
  </main>`

  app.querySelectorAll(".tabs button").forEach(b => (b.onclick = () => (location.hash = `#/${b.dataset.k}`)))

  let lang = "en"
  app.querySelectorAll(".lang-pick button").forEach(b => {
    b.onclick = () => {
      lang = b.dataset.l
      app.querySelectorAll(".lang-pick button").forEach(x => x.classList.toggle("on", x === b))
    }
  })

  app.querySelector("#f").onsubmit = async e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const body = Object.fromEntries(fd.entries())
    if (reg) body.target_lang = lang
    try {
      await api(`/auth/${reg ? "register" : "login"}`, { method: "POST", body })
      toast(reg ? "注册成功，开始学习吧！" : "登录成功", true)
      location.hash = "#/dash"
    } catch (err) {
      app.querySelector("#err").innerHTML = `<div class="err-box">${esc(err.message)}</div>`
    }
  }

  app.querySelector("#demo")?.addEventListener("click", async () => {
    try {
      await api("/auth/login", { method: "POST", body: { email: "demo@lingua.app", password: "demo1234" } })
      location.hash = "#/dash"
    } catch (err) {
      toast(err.message)
    }
  })
}

export const render = (app) => card("login", app)
export const login = { render }
export const register = { render: (app) => card("register", app) }
