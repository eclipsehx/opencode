import { api } from "../api.js"
import { esc, toast, speak } from "../ui.js"

export async function render(app) {
  const { items } = await api("/review/queue")

  if (!items.length) {
    app.innerHTML = `
    <main class="wrap">
      <div class="rev-card card pad-lg">
        <div style="font-size:52px">🌟</div>
        <h2 style="margin:10px 0 6px">复习队列已清空</h2>
        <p class="muted">完成新课程后，生词会自动加入记忆曲线复习队列。先去学习新内容吧！</p>
        <br><a class="btn primary big" href="#/dash">继续学习 →</a>
      </div>
    </main>`
    return
  }

  let i = 0
  let gained = 0
  let ok = 0

  app.innerHTML = `<main class="wrap"><div class="rev-card card pad-lg" id="c"></div></main>`
  const node = app.querySelector("#c")

  function paint() {
    if (i >= items.length) return done()
    const card = items[i]
    node.innerHTML = `
      <div class="row between small" style="margin-bottom:14px">
        <span class="tag brand">🧠 记忆曲线复习</span>
        <span class="muted">${i + 1} / ${items.length}</span>
      </div>
      <p class="prompt">这个词语的意思是……</p>
      <div class="ex-front">${esc(card.prompt)}</div>
      <div class="opts" style="grid-template-columns:1fr 1fr" id="opts">
        ${card.options.map(o => `<button data-w="${esc(o)}">${esc(o)}</button>`).join("")}
      </div>
      <div id="fb"></div>`
    node.querySelectorAll("#opts button").forEach(b =>
      (b.onclick = async () => {
        node.querySelectorAll("#opts button").forEach(x => (x.disabled = true))
        const r = await api("/review/answer", { method: "POST", body: { id: card.id, answer: b.dataset.w } })
        b.classList.add(r.correct ? "ok" : "bad")
        ;[...node.querySelectorAll("#opts button")].find(x => x.dataset.w === r.display)?.classList.add("ok")
        gained += r.xp
        if (r.correct) ok++
        speak(r.display, card.lang)
        node.querySelector("#fb").innerHTML = `
          <div class="feedback ${r.correct ? "ok" : "bad"}">
            <div class="t">${r.correct ? "✅ 记得牢固！+" + r.xp + " XP" : `👉 正确：${esc(r.display)}`}</div>
            <div class="small">下次复习：${r.interval ? `${r.interval} 天后` : "10 分钟后"}</div>
          </div>
          <br><button class="btn primary big block" id="next">${i + 1 >= items.length ? "完成复习 →" : "下一张 →"}</button>`
        node.querySelector("#next").onclick = () => { i++; paint() }
      })
    )
  }

  async function done() {
    node.innerHTML = `
      <div class="result-hero">
        <div style="font-size:52px">🎉</div>
        <div class="pct">${ok}/${items.length}</div>
        <p class="muted">复习完成，获得 <b>${gained} XP</b>，这些单词已按记忆曲线安排下次复习时间</p>
      </div>
      <div class="center">
        <a class="btn primary big" href="#/dash">回到学习面板</a>
        <a class="btn ghost big" href="#/courses">浏览课程</a>
      </div>`
    if (ok === items.length) toast("全部记牢，太棒了！", true)
  }

  paint()
}
