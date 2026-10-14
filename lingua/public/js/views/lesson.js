import { api } from "../api.js"
import { KINDS } from "../store.js"
import { esc, toast, speak, recognizer, micSupported, similarity } from "../ui.js"

export async function render(app, id) {
  const lesson = await api(`/lesson/${id}`)
  const { exercises, lang } = lesson
  const results = []
  let gained = 0
  let idx = 0

  app.innerHTML = `<main class="wrap"><div class="player">
    <div class="top">
      <a class="btn ghost sm" href="#/courses">← 退出</a>
      <div class="bar" style="flex:1"><i id="pb" style="width:0%"></i></div>
      <span class="muted small" id="cnt">1 / ${exercises.length}</span>
    </div>
    <div class="card pad-lg" id="ex"></div>
  </div></main>`

  const grade = async (e, answer) => {
    const r = await api(`/exercise/${e.id}/answer`, { method: "POST", body: { answer } })
    results.push({ id: e.id, correct: r.correct })
    gained += r.xp
    return r
  }

  function feedback(node, r, e) {
    const good = r.correct
    const show =
      e.kind === "vocab"
        ? `正确答案：<b>${esc(r.display)}</b>`
        : e.kind === "grammar"
          ? `正确答案：<b>${esc(r.display)}</b>${r.note ? `<div class="small" style="margin-top:4px">📖 ${esc(r.note)}</div>` : ""}`
          : `原文：<b>${esc(r.display)}</b>`
    node.insertAdjacentHTML(
      "beforeend",
      `<div class="feedback ${good ? "ok" : "bad"}">
        <div class="t">${good ? "🎉 回答正确！+" + r.xp + " XP" : "💪 再接再厉，正确答案见下方"}</div>
        ${good ? (r.note ? `<div class="small">📖 ${esc(r.note)}</div>` : "") : show}
        ${e.kind !== "grammar" && e.kind !== "vocab" ? `<button class="btn sm ghost" id="replay" style="margin-top:8px">🔊 再听一遍</button>` : ""}
      </div>
      <br><button class="btn primary big block" id="go">继续 →</button>`
    )
    node.querySelector("#replay")?.addEventListener("click", () => speak(r.display || e.answer, lang))
    if (good && (e.kind === "vocab" || e.kind === "speaking")) speak(r.display || e.answer, lang)
    node.querySelector("#go").onclick = next
    node.querySelectorAll(".opts button, #sub, .mic-btn, #skip").forEach(b => (b.disabled = true))
  }

  function next() {
    idx++
    if (idx >= exercises.length) return finish()
    paint()
  }

  function paint() {
    const e = exercises[idx]
    app.querySelector("#pb").style.width = `${(idx / exercises.length) * 100}%`
    app.querySelector("#cnt").textContent = `${idx + 1} / ${exercises.length}`
    const node = app.querySelector("#ex")
    const kind = KINDS[e.kind]
    node.innerHTML = `<div class="ex-kind"><span class="ic">${kind.icon}</span>${kind.label}${e.kind === "vocab" ? " · 选择正确释义" : e.kind === "grammar" ? " · 选词填空" : e.kind === "listening" ? " · 听写句子" : " · 大声跟读"}</div><div id="body"></div>`
    const body = node.querySelector("#body")
    if (e.kind === "vocab") vocab(e, body)
    else if (e.kind === "grammar") grammar(e, body)
    else if (e.kind === "listening") listening(e, body)
    else speaking(e, body)
  }

  function optsHtml(options) {
    return `<div class="opts">${options.map((o, i) => `<button data-i="${i}">${esc(o)}</button>`).join("")}</div>`
  }

  function bindOpts(body, e, onPick) {
    body.querySelectorAll(".opts button").forEach(b =>
      (b.onclick = async () => {
        body.querySelectorAll(".opts button").forEach(x => (x.disabled = true))
        const val = e.options[Number(b.dataset.i)]
        const r = await grade(e, val)
        b.classList.add(r.correct ? "ok" : "bad")
        if (!r.correct) [...body.querySelectorAll(".opts button")].find(x => e.options[Number(x.dataset.i)] === r.display)?.classList.add("ok")
        feedback(body, r, e)
        onPick?.(r)
      })
    )
  }

  function vocab(e, body) {
    body.innerHTML = `
      <div class="ex-front">${esc(e.front)}</div>
      <div class="snd-row"><button class="snd" id="say">🔊</button></div>
      ${optsHtml(e.options)}`
    body.querySelector("#say").onclick = () => speak(e.front, lang)
    setTimeout(() => speak(e.front, lang), 300)
    bindOpts(body, e)
  }

  function grammar(e, body) {
    const parts = e.front.split("___")
    body.innerHTML = `
      <div class="ex-front small-text">${esc(parts[0] ?? "")}<span class="blank">&nbsp;?&nbsp;</span>${esc(parts[1] ?? "")}</div>
      ${optsHtml(e.options)}`
    bindOpts(body, e)
  }

  function listening(e, body) {
    body.innerHTML = `
      <div class="snd-row"><button class="snd" id="play">🔊</button><button class="snd" id="slow" title="慢速">🐢</button></div>
      <p class="muted small center">点击喇叭听句子，输入你听到的内容（可反复听）</p>
      <br>
      <input class="input center" id="ans" placeholder="输入听到的句子…" autocomplete="off">
      <br><button class="btn primary big block" id="sub">提交答案</button>`
    const input = body.querySelector("#ans")
    body.querySelector("#play").onclick = () => speak(e.answer, lang)
    body.querySelector("#slow").onclick = () => speak(e.answer, lang, true)
    setTimeout(() => speak(e.answer, lang), 400)
    const submit = async () => {
      if (!input.value.trim()) return input.focus()
      body.querySelectorAll("#sub,#ans").forEach(x => (x.disabled = true))
      feedback(body, await grade(e, input.value), e)
    }
    body.querySelector("#sub").onclick = submit
    input.onkeydown = ev => {
      if (ev.key === "Enter") submit()
    }
    input.focus()
  }

  function speaking(e, body) {
    body.innerHTML = `
      <div class="ex-front small-text">${esc(e.answer)}</div>
      <div class="snd-row"><button class="snd" id="play">🔊</button><button class="snd" id="slow" title="慢速">🐢</button></div>
      <p class="muted small center">先听原音，再按住下方麦克风大声跟读（相似度 ≥ 60% 通过）</p>
      <div class="mic-btn" id="mic"><div class="ball">🎙️</div><span class="muted small" id="mic-tip">点击开始跟读</span></div>
      <div class="center small" id="heard" style="min-height:22px;color:var(--brand);font-weight:600"></div>
      <div id="score-wrap" style="display:none"><div class="score-bar"><i id="score-fill" style="width:0%"></i></div><p class="muted small center" id="score-txt"></p></div>
      <div class="center"><button class="btn sm ghost" id="fallback">无法使用麦克风？用文字输入</button>
      <button class="btn sm ghost" id="skip">跳过本题（不计分）</button></div>
      <div id="fb-input" style="display:none"><br><input class="input center" id="typed" placeholder="照着句子打一遍，帮你加深印象"><br><button class="btn primary block" id="typed-sub" style="margin-top:10px">提交</button></div>`
    body.querySelector("#play").onclick = () => speak(e.answer, lang)
    body.querySelector("#slow").onclick = () => speak(e.answer, lang, true)
    setTimeout(() => speak(e.answer, lang), 400)

    body.querySelector("#skip").onclick = () => {
      results.push({ id: e.id, correct: false })
      next()
    }

    const submitText = async text => {
      body.querySelectorAll("#sub,#typed-sub,#typed,#mic,#skip").forEach(x => (x.disabled = true))
      const r = await grade(e, text)
      const pct = Math.round((r.score ?? similarity(text, e.answer)) * 100)
      body.querySelector("#score-wrap").style.display = ""
      body.querySelector("#score-fill").style.width = `${pct}%`
      body.querySelector("#score-txt").textContent = `发音相似度 ${pct}%`
      feedback(body, r, e)
    }

    body.querySelector("#fallback").onclick = () => {
      body.querySelector("#fb-input").style.display = ""
      body.querySelector("#typed").focus()
      body.querySelector("#typed-sub").onclick = () => submitText(body.querySelector("#typed").value)
    }

    const mic = body.querySelector("#mic")
    const tip = body.querySelector("#mic-tip")
    if (!micSupported()) {
      tip.textContent = "当前浏览器不支持语音识别（建议 Chrome），请用文字输入"
      mic.style.opacity = 0.5
      mic.onclick = () => body.querySelector("#fallback").click()
      return
    }
    let rec = null
    mic.onclick = () => {
      if (rec) {
        rec.stop()
        return
      }
      rec = recognizer(lang, {
        partial: t => (body.querySelector("#heard").textContent = t),
        done: (text, failed) => {
          mic.classList.remove("rec")
          rec = null
          if (text) {
            tip.textContent = "识别完成，正在评分…"
            submitText(text)
          } else {
            tip.textContent = failed
              ? "未捕捉到语音，请检查麦克风权限或改用文字输入"
              : "没有听清，再试一次或用文字输入"
          }
        },
      })
      try {
        rec.start()
        mic.classList.add("rec")
        tip.textContent = "正在聆听… 请大声跟读，说完再点击一次结束"
      } catch {
        tip.textContent = "麦克风启动失败，请检查权限"
        rec = null
      }
    }
  }

  async function finish() {
    app.querySelector("#pb").style.width = "100%"
    const node = app.querySelector("#ex")
    node.innerHTML = `<div class="result-hero"><div class="muted small">课程完成</div><div id="pct" class="pct">…</div><div class="stars" id="stars"></div><div id="fx" class="muted"></div></div><div id="acts" class="center"></div>`
    const r = await api(`/lesson/${id}/complete`, { method: "POST", body: { results } })
    const stars = r.score >= 90 ? 3 : r.score >= 60 ? 2 : 1
    node.querySelector("#pct").textContent = `${r.score} 分`
    node.querySelector("#stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars)
    node.querySelector("#fx").innerHTML = `正确 ${results.filter(x => x.correct).length}/${results.length} · 获得 <b>${gained + r.first_xp} XP</b> · 🔥 连击 ${r.streak} 天`
    r.achievements.forEach((a, i) => setTimeout(() => toast(`🏅 解锁成就「${a.title}」：${a.blurb}`, true), 400 + i * 600))
    node.querySelector("#acts").innerHTML = `
      ${r.next ? `<a class="btn primary big" href="#/lesson/${r.next}">下一课 →</a>` : ""}
      <a class="btn ${r.next ? "ghost" : "primary"} big" href="#/review">🧠 复习本课单词</a>
      <a class="btn ghost big" href="#/courses">返回课程</a>`
  }

  paint()
}
