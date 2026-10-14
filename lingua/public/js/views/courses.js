import { api } from "../api.js"
import { store, KINDS } from "../store.js"
import { esc, langOf } from "../ui.js"

export async function render(app) {
  const me = store.me
  const courses = await api("/catalog")
  const icons = Object.values(KINDS).map(k => k.icon).join(" ")
  let lang = me.target_lang

  function draw() {
    const list = courses.filter(c => c.lang === lang)
    const langs = [...new Set(courses.map(c => c.lang))]
    const nextId = list.flatMap(c => c.units).flatMap(u => u.lessons).find(l => !l.done)?.id
    app.innerHTML = `
    <main class="wrap">
      <h2 style="margin-bottom:6px">📚 分级课程体系</h2>
      <p class="muted" style="margin-bottom:20px">每个语种按级别分级、单元递进，每课融合四大互动模块</p>
      <div class="lang-tabs">
        ${langs.map(l => `<button data-l="${l}" class="${l === lang ? "on" : ""}">${langOf(l).flag} ${langOf(l).name}</button>`).join("")}
      </div>
      ${list.map(c => {
        const ls = c.units.flatMap(u => u.lessons)
        const doneN = ls.filter(l => l.done).length
        return `
        <div class="course-hd">
          <h2>${esc(c.title)}</h2>
          <span class="tag lv">${c.level}</span>
          <span class="tag ${doneN === ls.length ? "ok" : ""}">${doneN === ls.length ? "已毕业 🎓" : `${doneN}/${ls.length} 课`}</span>
          <span class="muted small" style="flex:1">${esc(c.blurb)}</span>
        </div>
        ${c.units.map(u => `
          <div class="unit">
            <h3>${esc(u.title)}</h3>
            ${u.lessons.map(l => `
              <a class="lesson-row" href="#/lesson/${l.id}">
                <div class="st ${l.done ? "done" : l.id === nextId ? "cur" : ""}">${l.done ? "✅" : l.id === nextId ? "▶️" : "📖"}</div>
                <div style="flex:1">
                  <div class="row" style="gap:8px"><strong style="font-size:15px">${esc(l.title)}</strong>${l.score !== null ? `<span class="tag ${l.score === 100 ? "ok" : ""}">最高 ${l.score} 分</span>` : ""}</div>
                  <div class="muted small">${esc(l.blurb)}</div>
                </div>
                <div class="muted small">${icons}</div>
                <span class="tag">+${l.xp} XP</span>
              </a>`).join("")}
          </div>`).join("")}`
      }).join("")}
    </main>`
    app.querySelectorAll("[data-l]").forEach(b => (b.onclick = () => { lang = b.dataset.l; draw() }))
  }

  draw()
}
