import { api } from "../api.js"
import { store, LANGS } from "../store.js"
import { esc, toast } from "../ui.js"

const KIND_LABEL = { vocab: "词汇", grammar: "语法", listening: "听力", speaking: "口语" }

export async function render(app) {
  const s = await api("/stats")
  const u = s.user
  const maxXP = Math.max(...s.activity.map(a => a.xp), 1)

  app.innerHTML = `
  <main class="wrap">
    <div class="card pad-lg" style="margin-bottom:18px">
      <div class="row" style="flex-wrap:wrap;gap:18px">
        <span class="avatar" style="width:64px;height:64px;font-size:30px">${esc(u.name.slice(0, 1))}</span>
        <div style="flex:1;min-width:200px">
          <h2>${esc(u.name)}</h2>
          <p class="muted small">${esc(u.email)} · ${LANGS[u.target_lang].flag} 正在学习${LANGS[u.target_lang].name} · ${u.level} 水平</p>
          <div class="row" style="margin-top:8px;gap:8px">
            <span class="tag brand">⚡ ${u.xp} XP</span>
            <span class="tag warn">🔥 连击 ${u.streak} 天</span>
            <span class="tag">✅ 完成 ${s.counts.lessons} 课</span>
            <span class="tag">🃏 掌握 ${s.counts.words} 词</span>
          </div>
        </div>
        <button class="btn danger" id="out">退出登录</button>
      </div>
    </div>

    <div class="grid c2" style="margin-bottom:18px">
      <div class="card">
        <h3 style="margin-bottom:16px">📊 技能掌握度（${LANGS[u.target_lang].name}）</h3>
        ${s.skills.length
          ? s.skills.map(k => `
            <div class="skill-row">
              <div class="t"><span>${KIND_LABEL[k.kind] ?? k.kind}</span><span class="muted">${k.acc}%（${k.correct}/${k.total}）</span></div>
              <div class="bar"><i style="width:${k.acc}%"></i></div>
            </div>`).join("")
          : `<p class="muted">完成课程后，这里会展示词汇、语法、听力、口语四项正确率。</p>`}
        <h3 style="margin:22px 0 10px">📅 近 14 天活跃度</h3>
        <div class="act-chart">
          ${s.activity.map(a => `<div class="col" title="${a.day}: ${a.xp} XP"><i style="height:${Math.round((a.xp / maxXP) * 100)}%"></i><span>${a.day.split("-")[1]}/${a.day.split("-")[2]}</span></div>`).join("")}
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:16px">⚙️ 学习设置</h3>
        <label class="lbl">目标语言</label>
        <div class="lang-pick" id="lp">
          ${Object.values(LANGS).map(l => `<button data-v="${l.code}" class="${u.target_lang === l.code ? "on" : ""}"><span class="fl">${l.flag}</span>${l.name}</button>`).join("")}
        </div>
        <label class="lbl">自评水平</label>
        <select class="input" id="lv">
          <option value="A1" ${u.level === "A1" ? "selected" : ""}>A1 · 零基础入门</option>
          <option value="A2" ${u.level === "A2" ? "selected" : ""}>A2 · 有一定基础</option>
        </select>
        <label class="lbl">昵称</label>
        <input class="input" id="nm" maxlength="30" value="${esc(u.name)}">
        <br><button class="btn primary block" id="save">保存设置</button>
        <p class="muted small" style="margin-top:10px">设置会影响学习面板的语言与推荐路径。</p>
      </div>
    </div>

    <div class="card">
      <div class="row between" style="margin-bottom:16px">
        <h3>🏅 成就墙（${s.achievements.filter(a => a.unlocked).length}/${s.achievements.length}）</h3>
        <span class="muted small">完成课程、保持连击、发帖互动即可解锁</span>
      </div>
      <div class="ach-grid">
        ${s.achievements.map(a => `
          <div class="ach ${a.unlocked ? "" : "locked"}" title="${esc(a.blurb)}">
            <div class="ic">${a.unlocked ? a.icon : "🔒"}</div>
            <h4>${esc(a.title)}</h4>
            <p>${esc(a.blurb)}</p>
          </div>`).join("")}
      </div>
    </div>
  </main>`

  let lang = u.target_lang
  app.querySelectorAll("#lp button").forEach(b =>
    (b.onclick = () => {
      lang = b.dataset.v
      app.querySelectorAll("#lp button").forEach(x => x.classList.toggle("on", x === b))
    })
  )

  app.querySelector("#save").onclick = async () => {
    await api("/me", {
      method: "PATCH",
      body: { target_lang: lang, level: app.querySelector("#lv").value, name: app.querySelector("#nm").value },
    })
    toast("设置已保存", true)
    render(app)
  }

  app.querySelector("#out").onclick = async () => {
    await api("/auth/logout", { method: "POST" })
    store.me = null
    location.hash = "#/"
    location.reload()
  }
}
