export function render(app) {
  app.innerHTML = `
  <main class="wrap">
    <section class="hero">
      <div class="flags">🇬🇧 🇯🇵 🇰🇷</div>
      <span class="kicker">✨ 沉浸式多语种学习平台</span>
      <h1>像母语者一样<br><em>听、说、读、记</em>一门新语言</h1>
      <p class="lead">英语、日语、韩语分级课程体系，单词记忆、语法练习、口语跟读、听力训练四大互动模块，配合记忆曲线复习与个性化学习路径。</p>
      <div class="row" style="justify-content:center">
        <a class="btn primary big" href="#/register">免费开始学习</a>
        <button class="btn ghost big" id="demo">🎯 演示账号体验</button>
      </div>
    </section>

    <section class="features">
      <div class="feature"><div class="ic">📚</div><h3>分级课程体系</h3><p>三语种 × A1/A2 级别 × 主题单元，24 节场景化课程循序渐进。</p></div>
      <div class="feature"><div class="ic">🎮</div><h3>互动式学习</h3><p>单词闪卡、语法选择、听力听写、AI 语音评测跟读，练习不枯燥。</p></div>
      <div class="feature"><div class="ic">📈</div><h3>学习进度追踪</h3><p>经验值、连击天数、听说读写四项技能正确率、14 天活跃图表。</p></div>
      <div class="feature"><div class="ic">🧠</div><h3>记忆曲线复习</h3><p>生词自动进入复习队列，按遗忘曲线安排提醒，越学越牢。</p></div>
      <div class="feature"><div class="ic">🧭</div><h3>个性化路径推荐</h3><p>根据你的水平与薄弱技能，每天生成专属学习任务清单。</p></div>
      <div class="feature"><div class="ic">🏆</div><h3>社区与成就</h3><p>学习经验交流、点赞评论互动，11+ 种成就与学习排行榜激励坚持。</p></div>
    </section>

    <section class="lang-band">
      <div class="lang-card" style="background:linear-gradient(135deg,#3b82f6,#6366f1)"><span class="big">🇬🇧</span><h3>英语</h3><p>从问候到面试，覆盖旅行与职场高频场景</p></div>
      <div class="lang-card" style="background:linear-gradient(135deg,#f43f5e,#fb7185)"><span class="big">🇯🇵</span><h3>日语</h3><p>あいさつ起步，玩转车站、购物与天气话题</p></div>
      <div class="lang-card" style="background:linear-gradient(135deg,#10b981,#059669)"><span class="big">🇰🇷</span><h3>韩语</h3><p>인사말开口，走出首尔街头也毫不怯场</p></div>
    </section>
    <p class="muted center" style="margin-bottom:40px">演示账号：demo@lingua.app / demo1234</p>
  </main>`

  app.querySelector("#demo").onclick = async () => {
    const { api } = await import("../api.js")
    const { toast } = await import("../ui.js")
    try {
      await api("/auth/login", { method: "POST", body: { email: "demo@lingua.app", password: "demo1234" } })
      location.hash = "#/dash"
    } catch (e) {
      toast(e.message)
    }
  }
}
