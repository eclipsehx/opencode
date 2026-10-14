import { api } from "../api.js"
import { store, LANGS, KINDS } from "../store.js"
import { esc, toast, langOf } from "../ui.js"

export async function render(app) {
  const me = store.me
  const p = await api("/path")

  const taskHtml = p.tasks.map((t, i) => {
    const l = langOf(me.target_lang)
    return `
    <div class="task ${t.locked ? "locked" : ""}">
      <div class="num">${t.locked ? "🔒" : ["1️⃣", "2️⃣", "3️⃣"][i] ?? "4️⃣"}</div>
      <div style="flex:1">
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <h4>${esc(t.title)}</h4>
          <span class="tag lv">${t.level}</span>
          <span class="tag brand">${esc(t.reason)}</span>
        </div>
        <div class="muted small">${esc(t.course_title)} · ${l.flag} ${t.kinds.map(k => KINDS[k].icon).join(" ")}</div>
      </div>
      ${t.locked
        ? `<span class="muted small">先完成前面的课程</span>`
        : `<a class="btn primary sm" href="#/lesson/${t.lesson_id}">开始学习 →</a>`}
    </div>`
  }).join("")

  app.innerHTML = `
  <main class="wrap">
    <div class="row between" style="flex-wrap:wrap;gap:14px">
      <div>
        <h2 style="font-size:24px">${emoji(me.streak)} 你好，${esc(me.name)}</h2>
        <p class="muted">今天也来坚持学习 ${langOf(me.target_lang).flag} ${langOf(me.target_lang).name} 吧</p>
      </div>
      <div class="row">
        <span class="muted small">切换语言</span>
        ${Object.values(LANGS).map(l => `<button class="btn ${me.target_lang === l.code ? "soft" : "ghost"} sm" data-lang="${l.code}">${l.flag} ${l.name}</button>`).join("")}
      </div>
    </div>

    <div class="stat-hero" style="margin-top:22px">
      <div class="stat-box"><div class="v">🔥 ${me.streak}</div><div class="k">连续学习天数</div></div>
      <div class="stat-box"><div class="v">⚡ ${me.xp}</div><div class="k">累计经验值</div></div>
      <div class="stat-box"><div class="v">🧠 ${p.due}</div><div class="k">待复习单词</div></div>
      <div class="stat-box">
        <div class="v">${p.done}/${p.total}</div><div class="k">${langOf(me.target_lang).name}课程进度</div>
        <div class="bar" style="margin-top:8px"><i style="width:${p.total ? Math.round((p.done / p.total) * 100) : 0}%"></i></div>
      </div>
    </div>

    ${p.due > 0
      ? `<div class="task" style="margin-bottom:14px;border-color:#e4defc;background:linear-gradient(120deg,#faf8ff,#f5f3ff)">
          <div class="num">🧠</div>
          <div style="flex:1"><h4>${p.due} 个单词到了最佳复习时间</h4><div class="muted small">按照记忆曲线，现在复习记得最牢</div></div>
          <a class="btn soft" href="#/review">开始复习 →</a>
        </div>`
      : ""}
    ${p.suggestion ? `<div class="card" style="margin-bottom:14px;padding:14px 20px;border-left:4px solid var(--brand)">💡 ${esc(p.suggestion)}</div>` : ""}

    <h3 style="margin:22px 0 12px">🎯 今日学习路径</h3>
    <div class="grid" style="gap:10px">${taskHtml}</div>
    <p class="muted small" style="margin-top:14px">推荐依据：课程顺序 + 你的薄弱技能（听说读写正确率）+ 记忆曲线到期单词。可在「我的」页调整自评水平。</p>
  </main>`

  app.querySelectorAll("[data-lang]").forEach(b => {
    b.onclick = async () => {
      await api("/me", { method: "PATCH", body: { target_lang: b.dataset.lang } })
      toast(`已切换到${LANGS[b.dataset.lang].name}`, true)
      render(app)
    }
  })
}

const emoji = n => (n >= 7 ? "🏆" : n >= 3 ? "🔥" : "🌱")
