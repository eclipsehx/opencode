import { api } from "../api.js"
import { store } from "../store.js"
import { esc, toast, ago, langOf, avatar, modal } from "../ui.js"

export async function render(app) {
  let lang = ""
  const lb = await api("/leaderboard")
  app.innerHTML = `<main class="wrap">
    <div class="row between" style="margin-bottom:18px;flex-wrap:wrap;gap:12px">
      <div>
        <h2>💬 学习社区</h2>
        <p class="muted">交流学习方法、分享打卡心得，和大家一起坚持</p>
      </div>
      <button class="btn primary" id="new">✏️ 发布帖子</button>
    </div>
    <div class="comm">
      <div>
        <div class="lang-tabs" id="tabs">
          <button data-l="" class="on">🌐 全部</button>
          <button data-l="en">🇬🇧 英语</button>
          <button data-l="ja">🇯🇵 日语</button>
          <button data-l="ko">🇰🇷 韩语</button>
        </div>
        <div id="feed"><p class="muted">加载中…</p></div>
      </div>
      <div>
        <div class="side-panel">
          <h3>🏆 经验值排行榜</h3>
          <div id="lb">${lb.map(r => `
            <div class="lb-row ${r.me ? "me" : ""}">
              <span class="rk ${r.rank <= 3 ? "top" : ""}">${r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</span>
              <span class="avatar" style="width:26px;height:26px;font-size:13px">${esc(r.name.slice(0, 1))}</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}${r.me ? "（我）" : ""}</span>
              <span class="muted small">⚡${r.xp}</span>
            </div>`).join("")}</div>
        </div>
        <div class="side-panel">
          <h3>🔥 连击激励</h3>
          <p class="muted small">每天完成任意课程或复习即可保持连击。连击 3 天、7 天都有专属成就！</p>
          <br><a class="btn soft sm block" href="#/profile">查看我的成就</a>
        </div>
      </div>
    </div>
  </main>`

  async function feed() {
    const posts = await api("/community" + (lang ? `?lang=${lang}` : ""))
    document.getElementById("feed").innerHTML = posts.length
      ? posts.map(postHtml).join("")
      : `<div class="card center" style="padding:44px"><div style="font-size:40px">🍂</div><br>还没有帖子，来发第一帖吧！</div>`
    bind()
  }

  const postHtml = p => `
    <div class="post" data-id="${p.id}">
      <div class="hd">
        <span class="avatar">${esc(avatar(p.author))}</span>
        <div style="flex:1">
          <b class="small">${esc(p.author)}${p.mine ? "（我）" : ""}</b>
          <div class="muted small">${ago(p.created_at)}${p.lang ? ` · ${langOf(p.lang).flag} ${langOf(p.lang).name}` : ""}</div>
        </div>
      </div>
      <h3>${esc(p.title)}</h3>
      <div class="bd">${esc(p.body)}</div>
      <div class="ft">
        <button class="act like ${p.liked ? "liked" : ""}">${p.liked ? "❤️" : "🤍"} <span class="n">${p.likes}</span></button>
        <button class="act cmt">💬 <span class="n">${p.comments}</span> 评论</button>
      </div>
      <div class="cmts" style="display:none"></div>
    </div>`

  function bind() {
    document.querySelectorAll("#feed .post").forEach(post => {
      const id = post.dataset.id
      post.querySelector(".like").onclick = async () => {
        const r = await api(`/community/${id}/like`, { method: "POST" })
        const b = post.querySelector(".like")
        b.classList.toggle("liked", r.liked)
        b.innerHTML = `${r.liked ? "❤️" : "🤍"} <span class="n">${r.likes}</span>`
      }
      post.querySelector(".cmt").onclick = async () => {
        const box = post.querySelector(".cmts")
        if (box.style.display !== "none") return (box.style.display = "none")
        const p = await api(`/community/${id}`)
        box.innerHTML =
          p.comments.map(c => `
            <div class="comment">
              <span class="avatar" style="width:28px;height:28px;font-size:13px">${esc(avatar(c.author))}</span>
              <div><b class="small">${esc(c.author)}</b> <span class="muted small">${ago(c.created_at)}</span>
              <div>${esc(c.body)}</div></div>
            </div>`).join("") || `<p class="muted small" style="padding:10px 0">还没有评论</p>`
        box.insertAdjacentHTML(
          "beforeend",
          `<div class="row" style="padding-top:10px">
            <input class="input" placeholder="友善地写下你的评论…" style="flex:1" data-in>
            <button class="btn soft sm" data-send>发送</button>
          </div>`
        )
        box.style.display = ""
        box.querySelector("[data-send]").onclick = async () => {
          const input = box.querySelector("[data-in]")
          if (!input.value.trim()) return
          await api(`/community/${id}/comment`, { method: "POST", body: { body: input.value } })
          post.querySelector(".cmt .n").textContent = Number(post.querySelector(".cmt .n").textContent) + 1
          post.querySelector(".cmt").click()
          post.querySelector(".cmt").click()
          toast("评论已发布", true)
        }
      }
    })
  }

  app.querySelectorAll("#tabs button").forEach(b =>
    (b.onclick = () => {
      lang = b.dataset.l
      app.querySelectorAll("#tabs button").forEach(x => x.classList.toggle("on", x === b))
      feed()
    })
  )

  app.querySelector("#new").onclick = () => {
    const ov = modal(`
      <h3>✏️ 发布学习帖子</h3>
      <label class="lbl">标题</label>
      <input class="input" id="t" maxlength="100" placeholder="一句话概括你的分享">
      <label class="lbl">所属语种（可选）</label>
      <select class="input" id="l"><option value="">🌐 综合</option><option value="en">🇬🇧 英语</option><option value="ja">🇯🇵 日语</option><option value="ko">🇰🇷 韩语</option></select>
      <label class="lbl">内容</label>
      <textarea class="input" id="b" placeholder="分享你的学习方法、心得或提问…"></textarea>
      <br><div class="row">
        <button class="btn ghost" style="flex:1" id="cancel">取消</button>
        <button class="btn primary" style="flex:1" id="pub">发布</button>
      </div>`)
    ov.querySelector("#cancel").onclick = () => ov.remove()
    ov.querySelector("#pub").onclick = async () => {
      const title = ov.querySelector("#t").value.trim()
      const body = ov.querySelector("#b").value.trim()
      if (!title || !body) return toast("标题和内容不能为空")
      await api("/community", { method: "POST", body: { title, body, lang: ov.querySelector("#l").value } })
      ov.remove()
      toast("发布成功，+可能解锁成就哦", true)
      feed()
    }
  }

  feed()
}
