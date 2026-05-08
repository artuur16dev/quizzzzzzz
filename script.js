const $ = (id) => document.getElementById(id);

const state = {
  theme: localStorage.getItem("qurio_theme") || "dark",
  sfx: localStorage.getItem("qurio_sfx") !== "0",
  xp: Number(localStorage.getItem("qurio_xp") || "0"),
  best: JSON.parse(localStorage.getItem("qurio_best") || "{}"),
  unlocked: JSON.parse(localStorage.getItem("qurio_unlocked") || "{}"),
  myQuizzes: JSON.parse(localStorage.getItem("qurio_myQuizzes") || "[]"),
  achievements: JSON.parse(localStorage.getItem("qurio_ach") || "{}"),
  progress: JSON.parse(localStorage.getItem("qurio_progress") || "{}"),
  currentQuiz: null,
  questions: [],
  idx: 0,
  score: 0,
  correctCount: 0,
  answered: false,
  mode: "solo",
  pu5050Used: false,
  puTimeUsed: false,
  puSkipUsed: false,
  timerOn: true,
  timeLeft: 20,
  timerHandle: null,
};

function saveAll(){
  localStorage.setItem("qurio_theme", state.theme);
  localStorage.setItem("qurio_sfx", state.sfx ? "1" : "0");
  localStorage.setItem("qurio_xp", String(state.xp));
  localStorage.setItem("qurio_best", JSON.stringify(state.best));
  localStorage.setItem("qurio_unlocked", JSON.stringify(state.unlocked));
  localStorage.setItem("qurio_myQuizzes", JSON.stringify(state.myQuizzes));
  localStorage.setItem("qurio_ach", JSON.stringify(state.achievements));
  localStorage.setItem("qurio_progress", JSON.stringify(state.progress));
}

function levelFromXP(xp){
  let lvl = 1;
  let need = 100;
  let rem = xp;
  while(rem >= need){
    rem -= need;
    lvl++;
    need = 100 + (lvl - 1) * 150;
  }
  return { lvl, into: rem, need };
}

function updateXPUI(){
  const {lvl, into, need} = levelFromXP(state.xp);
  $("xpLevel").textContent = `Nivell ${lvl}`;
  $("xpNums").textContent = `${into} / ${need} XP`;
  $("xpFill").style.width = `${Math.round((into / need) * 100)}%`;
}

function applyTheme(){
  document.documentElement.dataset.theme = state.theme === "light" ? "light" : "dark";
}

function getAllQuizzes(){
  const mine = state.myQuizzes.map(q => ({...q, _source:"mine"}));
  const preset = (typeof PRESET !== "undefined" ? PRESET : []).map(q => ({...q, _source:"preset"}));
  return [...preset, ...mine];
}

function topicList(){
  const set = new Set(getAllQuizzes().map(q => q.topic || "Altres"));
  return ["Totes", ...Array.from(set).sort((a,b)=>a.localeCompare(b))];
}

function quizUnlocked(quiz){
  if(state.unlocked[quiz.id]) return true;
  const {lvl} = levelFromXP(state.xp);
  return lvl >= Number(quiz.unlockLevel || 1);
}

function shuffle(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function norm(s){
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function sfx(type){
  if(!state.sfx) return;
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = type === "good" ? 660 : (type === "bad" ? 220 : 440);
    g.gain.value = 0.05;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 120);
  }catch(e){}
}

/* ===== INIT ===== */
applyTheme();
updateXPUI();
$("btnSfx").textContent = state.sfx ? "🔊" : "🔇";

$("btnTheme").addEventListener("click", ()=>{
  state.theme = state.theme === "light" ? "dark" : "light";
  applyTheme();
  saveAll();
});

$("btnSfx").addEventListener("click", ()=>{
  state.sfx = !state.sfx;
  $("btnSfx").textContent = state.sfx ? "🔊" : "🔇";
  saveAll();
});

document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    ["play","create","duel","achievements"].forEach(name=>{
      $(`tab-${name}`).classList.toggle("hidden", name !== tab);
    });
    if(tab === "achievements") renderAchievements();
    if(tab === "duel") renderDuelSelect();
  });
});

/* ===== SOUNDCLOUD ===== */
(function soundcloud(){
  const input = $("scUrl");
  const btnLoad = $("btnLoadSC");
  const btnOpen = $("btnOpenSC");
  const frame = $("scFrame");
  const wrap = $("scWrap");
  const msg = $("scMsg");
  const autoplay = $("scAutoPlay");
  const mini = $("scMini");

  if(!input || !btnLoad || !btnOpen || !frame || !wrap || !msg || !autoplay || !mini) return;

  function showOverlay(title, body, url){
    msg.classList.remove("hidden");
    msg.innerHTML = `
      <div class="t">${title}</div>
      <div class="b">${body}</div>
      <div class="row wrap">
        ${url ? `<a class="btn primary" href="${url}" target="_blank" rel="noopener noreferrer">Obrir a SoundCloud</a>` : ""}
        <button class="btn" id="scClose">Tancar</button>
      </div>
    `;
    msg.querySelector("#scClose")?.addEventListener("click", ()=>msg.classList.add("hidden"));
  }

  function toEmbed(url, auto){
    const u = (url || "").trim();

    if(!u || u.includes("soundcloud.com/artist/track")) return null;

    try{
      const parsed = new URL(u);
      const host = parsed.hostname.replace("www.","");
      if(!host.includes("soundcloud.com")) return null;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if(parts.length < 2) return null;
    }catch(e){
      return null;
    }

    const p = new URLSearchParams({
      url: u,
      auto_play: auto ? "true" : "false",
      hide_related: "false",
      show_comments: "false",
      show_user: "true",
      show_reposts: "false",
      show_teaser: "true",
      visual: "false"
    });

    return `https://w.soundcloud.com/player/?${p.toString()}`;
  }

  mini.addEventListener("change", ()=>{
    wrap.classList.toggle("mini", mini.checked);
  });

  btnOpen.addEventListener("click", ()=>{
    const u = input.value.trim();
    if(!u) return alert("Enganxa un link de SoundCloud primer.");
    window.open(u, "_blank", "noopener,noreferrer");
  });

  btnLoad.addEventListener("click", ()=>{
    msg.classList.add("hidden");
    const u = input.value.trim();
    const embed = toEmbed(u, autoplay.checked);

    if(!embed){
      showOverlay(
        "Link no vàlid",
        "Enganxa un link REAL de SoundCloud (ex: https://soundcloud.com/usuari/canco).",
        u
      );
      return;
    }

    frame.src = embed;
    try{
      localStorage.setItem("qurio_sc_last", u);
    }catch(e){}
  });

  try{
    const last = localStorage.getItem("qurio_sc_last");
    if(last){
      input.value = last;
      const embed = toEmbed(last, false);
      if(embed) frame.src = embed;
    }
  }catch(e){}
})();

/* ===== LISTADOS ===== */
function renderTopics(){
  const sel = $("filterTopic");
  sel.innerHTML = "";
  topicList().forEach(t=>{
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });
}

function previewQuiz(id){
  const q = getAllQuizzes().find(x=>x.id===id);
  if(!q) return;
  const unlocked = quizUnlocked(q);
  const {lvl} = levelFromXP(state.xp);
  if(unlocked){
    alert(`Disponible ✅\n\nTema: ${q.topic}\nDificultat: ${q.difficulty}\nPreguntes: ${q.questions.length}`);
  }else{
    alert(`Bloquejat 🔒\n\nNecessites nivell ${q.unlockLevel || 1}.\nAra tens nivell ${lvl}.`);
  }
}

function renderQuizList(){
  renderDuelSelect();

  const selTopic = $("filterTopic").value || "Totes";
  const list = $("quizList");
  list.innerHTML = "";

  const all = getAllQuizzes().filter(q => selTopic === "Totes" ? true : q.topic === selTopic);

  all.sort((a,b)=>{
    const au = quizUnlocked(a) ? 1 : 0;
    const bu = quizUnlocked(b) ? 1 : 0;
    if(au !== bu) return bu - au;
    return (a.topic||"").localeCompare(b.topic||"") || (a.title||"").localeCompare(b.title||"");
  });

  all.forEach(q=>{
    const unlocked = quizUnlocked(q);
    const best = state.best[q.id]?.bestScore ?? null;

    const card = document.createElement("div");
    card.className = "quizCard";
    card.innerHTML = `
      <div class="quizTop">
        <div>
          <div class="quizTitle">${escapeHtml(q.title)}</div>
          <div class="muted tiny">${escapeHtml(q.desc || "")}</div>
        </div>
        ${unlocked ? "" : `<div class="lock">🔒 Nivell ${q.unlockLevel || 1}</div>`}
      </div>

      <div class="tagRow">
        <span class="tag">${escapeHtml(q.topic || "Altres")}</span>
        <span class="tag">${escapeHtml(q.difficulty || "medium")}</span>
        <span class="tag">${(q.questions || []).length} preg.</span>
        ${best !== null ? `<span class="tag">Best: ${best}</span>` : ""}
        <span class="tag">${q._source === "mine" ? "🧩 Meu" : "⭐ Preset"}</span>
      </div>

      <div class="actions">
        <button class="btn primary" ${unlocked ? "" : "disabled"} data-play="${q.id}">Jugar</button>
        <button class="btn" data-preview="${q.id}">Vista</button>
      </div>
    `;

    card.querySelector("[data-play]")?.addEventListener("click", ()=>startQuiz(q.id));
    card.querySelector("[data-preview]")?.addEventListener("click", ()=>previewQuiz(q.id));
    list.appendChild(card);
  });
}

$("filterMode").addEventListener("change", ()=> state.mode = $("filterMode").value);
$("filterTopic").addEventListener("change", renderQuizList);

/* ===== PLAYER ===== */
function youtubeToEmbed(url){
  if(!url) return null;
  try{
    const u = new URL(url.trim());
    let id = u.searchParams.get("v");
    if(!id && u.hostname.includes("youtu.be")){
      id = u.pathname.split("/").filter(Boolean)[0];
    }
    if(!id) return null;
    return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
  }catch(e){
    return null;
  }
}

function setPowerupsUI(){
  $("pu5050").disabled = state.pu5050Used;
  $("puTime").disabled = state.puTimeUsed || !state.timerOn;
  $("puSkip").disabled = state.puSkipUsed;
}

function stopTimer(){
  if(state.timerHandle){
    clearInterval(state.timerHandle);
    state.timerHandle = null;
  }
}

function disableAnswers(){
  $("qAnswers").querySelectorAll("button.answerBtn").forEach(b=>b.disabled = true);
}

function showFeedback(ok, fallbackText = ""){
  const q = state.questions[state.idx];
  $("feedback").classList.remove("hidden");
  $("badge").className = "badge " + (ok ? "good" : "bad");
  $("badge").textContent = ok ? "✅ Correcte!" : "❌ Incorrecte!";
  $("explainText").textContent = q?.explain || fallbackText || "";
}

function awardPoints(ok){
  const diff = state.currentQuiz?.difficulty || "medium";
  let base = diff === "easy" ? 10 : (diff === "hard" ? 18 : 14);
  if(state.timerOn) base += Math.max(0, Math.floor(state.timeLeft / 4));
  if(!ok) base = 0;
  state.score += base;
  $("pScore").textContent = `Punts: ${state.score}`;
}

function renderQuestion(){
  stopTimer();
  state.answered = false;
  $("btnNext").disabled = true;
  $("feedback").classList.add("hidden");

  const q = state.questions[state.idx];
  $("pCounter").textContent = `${state.idx + 1}/${state.questions.length}`;
  $("pScore").textContent = `Punts: ${state.score}`;
  $("pProg").style.width = `${Math.round((state.idx / state.questions.length) * 100)}%`;

  $("qTitlePlay").textContent = q.text || "Pregunta";

  const media = $("qMedia");
  media.innerHTML = "";

  if(q.image){
    const img = document.createElement("img");
    img.src = q.image;
    img.alt = "imatge pregunta";
    media.appendChild(img);
  }

  const yt = youtubeToEmbed(q.video);
  if(yt){
    const ifr = document.createElement("iframe");
    ifr.src = yt;
    ifr.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    ifr.loading = "lazy";
    media.appendChild(ifr);
  }

  const ans = $("qAnswers");
  ans.innerHTML = "";

  if(q.type === "mcq"){
    q.options.forEach((opt, i)=>{
      const b = document.createElement("button");
      b.className = "answerBtn";
      b.textContent = opt;
      b.addEventListener("click", ()=>answerMCQ(i));
      ans.appendChild(b);
    });
  }else if(q.type === "tf"){
    [["Veritable", true], ["Fals", false]].forEach(([txt,val])=>{
      const b = document.createElement("button");
      b.className = "answerBtn";
      b.textContent = txt;
      b.addEventListener("click", ()=>answerTF(val));
      ans.appendChild(b);
    });
  }else{
    const wrap = document.createElement("div");
    wrap.className = "row wrap";
    wrap.innerHTML = `
      <input id="openInput" class="input" placeholder="Escriu la resposta..." />
      <button id="btnOpenSend" class="btn primary">Enviar</button>
    `;
    ans.appendChild(wrap);
    wrap.querySelector("#btnOpenSend").addEventListener("click", ()=>{
      answerOpen(wrap.querySelector("#openInput").value.trim());
    });
    wrap.querySelector("#openInput").addEventListener("keydown", e=>{
      if(e.key === "Enter") wrap.querySelector("#btnOpenSend").click();
    });
  }

  setPowerupsUI();

  if(state.timerOn){
    state.timeLeft = 20;
    $("timerBox").classList.remove("hidden");
    $("timerNum").textContent = "20";
    state.timerHandle = setInterval(()=>{
      state.timeLeft--;
      $("timerNum").textContent = String(state.timeLeft);
      if(state.timeLeft <= 0){
        stopTimer();
        if(!state.answered){
          showFeedback(false, "Temps esgotat.");
          disableAnswers();
          $("btnNext").disabled = false;
          state.answered = true;
        }
      }
    }, 1000);
  }else{
    $("timerBox").classList.add("hidden");
  }
}

function startQuiz(id){
  const q = getAllQuizzes().find(x=>x.id===id);
  if(!q) return;

  state.currentQuiz = q;
  state.idx = 0;
  state.score = 0;
  state.correctCount = 0;
  state.answered = false;
  state.pu5050Used = false;
  state.puTimeUsed = false;
  state.puSkipUsed = false;
  state.timerOn = $("optTimer").checked;

  const questions = (q.questions || []).map(x=>({...x}));
  state.questions = $("optShuffle").checked ? shuffle(questions) : questions;

  $("player").classList.remove("hidden");
  $("end").classList.add("hidden");
  $("pTitle").textContent = q.title || "Quiz";
  $("pMeta").textContent = `${q.topic || "Altres"} • ${q.difficulty || "medium"} • ${state.mode === "practice" ? "Pràctica" : "XP"}`;

  renderQuestion();
}

function closePlayer(){
  stopTimer();
  $("player").classList.add("hidden");
}

$("btnClose").addEventListener("click", closePlayer);
$("btnHome").addEventListener("click", closePlayer);

function answerMCQ(i){
  if(state.answered) return;
  state.answered = true;
  stopTimer();

  const q = state.questions[state.idx];
  const ok = i === q.correct;

  const btns = Array.from($("qAnswers").querySelectorAll("button.answerBtn"));
  btns.forEach((b, idx)=>{
    b.disabled = true;
    if(idx === q.correct) b.classList.add("good");
    if(idx === i && idx !== q.correct) b.classList.add("bad");
  });

  if(ok){ state.correctCount++; sfx("good"); }
  else sfx("bad");

  awardPoints(ok);
  showFeedback(ok);
  $("btnNext").disabled = false;
}

function answerTF(val){
  if(state.answered) return;
  state.answered = true;
  stopTimer();

  const q = state.questions[state.idx];
  const ok = val === q.correct;

  const btns = Array.from($("qAnswers").querySelectorAll("button.answerBtn"));
  btns.forEach(b=>b.disabled = true);

  if(ok){
    btns[val ? 0 : 1].classList.add("good");
  }else{
    btns[val ? 0 : 1].classList.add("bad");
    btns[q.correct ? 0 : 1].classList.add("good");
  }

  if(ok){ state.correctCount++; sfx("good"); }
  else sfx("bad");

  awardPoints(ok);
  showFeedback(ok);
  $("btnNext").disabled = false;
}

function answerOpen(value){
  if(state.answered) return;
  state.answered = true;
  stopTimer();

  const q = state.questions[state.idx];
  const accepted = (q.answers || []).map(norm);
  const ok = accepted.includes(norm(value));

  const input = $("qAnswers").querySelector("#openInput");
  const btn = $("qAnswers").querySelector("#btnOpenSend");
  if(input) input.disabled = true;
  if(btn) btn.disabled = true;

  if(ok){ state.correctCount++; sfx("good"); }
  else sfx("bad");

  awardPoints(ok);
  showFeedback(ok, ok ? "" : `Resposta esperada: ${(q.answers || [])[0] || ""}`);
  $("btnNext").disabled = false;
}

$("btnNext").addEventListener("click", ()=>{
  state.idx++;
  if(state.idx >= state.questions.length){
    finishQuiz();
  }else{
    renderQuestion();
  }
});

$("pu5050").addEventListener("click", ()=>{
  if(state.pu5050Used) return;
  const q = state.questions[state.idx];
  if(q.type !== "mcq") return alert("50/50 només funciona amb opcions múltiples.");
  state.pu5050Used = true;
  setPowerupsUI();

  const buttons = Array.from($("qAnswers").querySelectorAll("button.answerBtn"));
  const wrong = buttons.filter((b,i)=>i !== q.correct);
  shuffle(wrong).slice(0,2).forEach(b=>{
    b.disabled = true;
    b.style.opacity = ".45";
  });
});

$("puTime").addEventListener("click", ()=>{
  if(state.puTimeUsed || !state.timerOn) return;
  state.puTimeUsed = true;
  state.timeLeft = Math.min(60, state.timeLeft + 10);
  $("timerNum").textContent = String(state.timeLeft);
  setPowerupsUI();
});

$("puSkip").addEventListener("click", ()=>{
  if(state.puSkipUsed) return;
  state.puSkipUsed = true;
  setPowerupsUI();
  stopTimer();
  state.answered = true;
  showFeedback(false, "Has saltat la pregunta.");
  $("btnNext").disabled = false;
});

function finishQuiz(){
  stopTimer();

  const total = state.questions.length;
  const percent = Math.round((state.correctCount / total) * 100);

  state.progress.played = (state.progress.played || 0) + 1;
  if(state.correctCount === total){
    state.progress.perfect = (state.progress.perfect || 0) + 1;
  }

  const id = state.currentQuiz.id;
  const prevBest = state.best[id]?.bestScore ?? -1;
  if(state.score > prevBest){
    state.best[id] = { bestScore: state.score, percent };
  }

  let gainedXP = 0;
  if(state.mode !== "practice"){
    gainedXP = Math.round((percent / 100) * 60) + (state.correctCount === total ? 25 : 0);
    state.xp += gainedXP;
  }

  if(percent >= 70){
    const {lvl} = levelFromXP(state.xp);
    const candidates = (typeof PRESET !== "undefined" ? PRESET : [])
      .filter(q => !quizUnlocked(q) && Number(q.unlockLevel || 1) <= lvl + 1);
    if(candidates.length){
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      state.unlocked[pick.id] = true;
    }
  }

  checkAchievements();
  saveAll();
  updateXPUI();
  renderQuizList();
  renderMyQuizzes();

  $("end").classList.remove("hidden");
  $("pProg").style.width = "100%";
  $("btnNext").disabled = true;
  $("endText").textContent =
    `${state.score} punts • ${state.correctCount}/${total} correctes (${percent}%)` +
    (state.mode === "practice" ? " • Pràctica" : ` • +${gainedXP} XP`);

  const best = state.best[id]?.bestScore ?? state.score;
  $("bestText").textContent = `Best guardat: ${best} punts`;
}

$("btnReplay").addEventListener("click", ()=>{
  if(state.currentQuiz) startQuiz(state.currentQuiz.id);
});

$("btnShare").addEventListener("click", async ()=>{
  if(!state.currentQuiz) return;
  const total = state.questions.length;
  const percent = Math.round((state.correctCount / total) * 100);
  const text = `Qurio — ${state.currentQuiz.title}: ${state.score} punts, ${state.correctCount}/${total} (${percent}%).`;

  try{
    if(navigator.share){
      await navigator.share({ title:"Qurio Resultat", text });
    }else{
      await navigator.clipboard.writeText(text);
      alert("Resultat copiat ✅");
    }
  }catch(e){
    alert(text);
  }
});

/* ===== CREATE ===== */
let draft = [];

function renderDraft(){
  const list = $("draftList");
  list.innerHTML = "";
  if(draft.length === 0){
    list.innerHTML = `<div class="muted tiny">Encara no has afegit preguntes.</div>`;
    return;
  }

  draft.forEach((qq, i)=>{
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="itemTop">
        <div class="itemTitle">${i + 1}. ${escapeHtml(qq.type.toUpperCase())}</div>
        <button class="btn ghost" data-del="${i}">Eliminar</button>
      </div>
      <div class="muted tiny">${escapeHtml(qq.text || "")}</div>
    `;
    div.querySelector("[data-del]").addEventListener("click", ()=>{
      draft.splice(i, 1);
      renderDraft();
    });
    list.appendChild(div);
  });
}

function toggleCreateBlocks(){
  const t = $("qType").value;
  $("mcqBlock").classList.toggle("hidden", t !== "mcq");
  $("tfBlock").classList.toggle("hidden", t !== "tf");
  $("openBlock").classList.toggle("hidden", t !== "open");
}
$("qType").addEventListener("change", toggleCreateBlocks);
toggleCreateBlocks();

$("addQuestion").addEventListener("click", ()=>{
  const type = $("qType").value;
  const text = $("qText").value.trim();
  const explain = $("qExplain").value.trim();
  const image = $("qImage").value.trim() || null;
  const video = $("qVideo").value.trim() || null;

  if(!text) return alert("Falta l'enunciat.");

  if(type === "mcq"){
    const options = [$("o0").value, $("o1").value, $("o2").value, $("o3").value].map(x=>x.trim());
    if(options.some(x=>!x)) return alert("Omple les 4 opcions.");
    const correct = Number($("mcqCorrect").value);
    draft.push({ type, text, options, correct, explain: explain || "Explicació.", image, video });
  }else if(type === "tf"){
    const correct = $("tfCorrect").value === "true";
    draft.push({ type, text, correct, explain: explain || "Explicació.", image, video });
  }else{
    const raw = $("openCorrect").value.trim();
    if(!raw) return alert("Posa almenys una resposta correcta.");
    const answers = raw.split("|").map(s=>s.trim()).filter(Boolean);
    draft.push({ type, text, answers, explain: explain || "Explicació.", image, video });
  }

  $("qText").value = "";
  $("qExplain").value = "";
  $("qImage").value = "";
  $("qVideo").value = "";
  $("o0").value = $("o1").value = $("o2").value = $("o3").value = "";
  $("openCorrect").value = "";

  renderDraft();
  $("createHint").textContent = `Preguntes al draft: ${draft.length}`;
});

function makeId(){
  return "my_" + Math.random().toString(36).slice(2,8) + "_" + Date.now().toString(36);
}

$("saveQuiz").addEventListener("click", ()=>{
  const title = $("cqTitle").value.trim();
  const topic = $("cqTopic").value.trim() || "Altres";
  const difficulty = $("cqDifficulty").value;
  const desc = $("cqDesc").value.trim();

  if(!title) return alert("Posa un títol.");
  if(draft.length < 3) return alert("Mínim 3 preguntes.");

  const quiz = {
    id: makeId(),
    title,
    topic,
    difficulty,
    unlockLevel: 1,
    desc,
    questions: draft.map(x=>({...x}))
  };

  state.myQuizzes.unshift(quiz);
  state.progress.created = (state.progress.created || 0) + 1;
  draft = [];
  renderDraft();

  $("cqTitle").value = "";
  $("cqTopic").value = "";
  $("cqDesc").value = "";

  saveAll();
  renderTopics();
  renderQuizList();
  renderMyQuizzes();
  checkAchievements();

  $("createHint").textContent = "Guardat ✅";
});

function renderMyQuizzes(){
  const list = $("myQuizList");
  list.innerHTML = "";
  if(state.myQuizzes.length === 0){
    list.innerHTML = `<div class="muted tiny">Encara no tens quizzes guardats.</div>`;
    return;
  }

  state.myQuizzes.forEach(q=>{
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="itemTop">
        <div class="itemTitle">${escapeHtml(q.title)}</div>
        <div class="row wrap">
          <button class="btn" data-play="${q.id}">Jugar</button>
          <button class="btn ghost" data-del="${q.id}">Eliminar</button>
        </div>
      </div>
      <div class="muted tiny">${escapeHtml(q.topic)} • ${(q.questions || []).length} preg.</div>
    `;

    div.querySelector("[data-play]").addEventListener("click", ()=>startQuiz(q.id));
    div.querySelector("[data-del]").addEventListener("click", ()=>{
      if(!confirm("Eliminar aquest quiz?")) return;
      state.myQuizzes = state.myQuizzes.filter(x=>x.id !== q.id);
      saveAll();
      renderTopics();
      renderQuizList();
      renderMyQuizzes();
    });

    list.appendChild(div);
  });
}

/* ===== ACHIEVEMENTS ===== */
const ACH = [
  { id:"play1", name:"Primer quiz", desc:"Juga 1 quiz.", check: s => (s.progress.played || 0) >= 1 },
  { id:"play10", name:"Ritme!", desc:"Juga 10 quizzes.", check: s => (s.progress.played || 0) >= 10 },
  { id:"perfect1", name:"Perfecte!", desc:"Fes un 100% en un quiz.", check: s => (s.progress.perfect || 0) >= 1 },
  { id:"create1", name:"Creador/a", desc:"Crea 1 quiz.", check: s => (s.progress.created || 0) >= 1 },
  { id:"xp200", name:"XP 200", desc:"Arriba a 200 XP.", check: s => s.xp >= 200 },
  { id:"xp600", name:"XP 600", desc:"Arriba a 600 XP.", check: s => s.xp >= 600 },
];

function unlockAch(id){
  if(state.achievements[id]) return false;
  state.achievements[id] = { at: Date.now() };
  return true;
}

function checkAchievements(){
  let got = 0;
  for(const a of ACH){
    if(a.check(state)){
      if(unlockAch(a.id)) got++;
    }
  }
  if(got){
    saveAll();
    if(document.querySelector(".tab.active")?.dataset.tab === "achievements"){
      renderAchievements();
    }
    alert(`🎉 Has desbloquejat ${got} logro(s)!`);
  }
}

function renderAchievements(){
  const list = $("achList");
  list.innerHTML = "";
  ACH.forEach(a=>{
    const ok = !!state.achievements[a.id];
    const div = document.createElement("div");
    div.className = "quizCard";
    div.innerHTML = `
      <div class="quizTop">
        <div>
          <div class="quizTitle">${ok ? "🏆" : "🔒"} ${escapeHtml(a.name)}</div>
          <div class="muted tiny">${escapeHtml(a.desc)}</div>
        </div>
        <div class="tag">${ok ? "Desbloquejat" : "Pendent"}</div>
      </div>
    `;
    list.appendChild(div);
  });
}

/* ===== DUEL ===== */
let duel = {
  code: null,
  role: null,
  name: null,
  quizId: null,
  p1: 0,
  p2: 0,
  bc: null
};

function genCode(){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for(let i=0;i<5;i++) c += chars[Math.floor(Math.random()*chars.length)];
  return c;
}

function roomKey(code){ return `qurio_room_${code}`; }

function readRoom(code){
  try{
    return JSON.parse(localStorage.getItem(roomKey(code)) || "null");
  }catch(e){
    return null;
  }
}
function writeRoom(code, obj){
  localStorage.setItem(roomKey(code), JSON.stringify(obj));
}
function postRoom(code, msg){
  if(duel.bc) duel.bc.postMessage(msg);
  localStorage.setItem(`qurio_ping_${code}`, JSON.stringify({msg, t:Date.now()}));
}

window.addEventListener("storage", (e)=>{
  if(!duel.code) return;
  if(e.key === `qurio_ping_${duel.code}` && e.newValue){
    try{
      const {msg} = JSON.parse(e.newValue);
      onRoomMessage(msg);
    }catch(_){}
  }
});

function openChannel(code){
  try{
    duel.bc = new BroadcastChannel(`qurio_room_${code}`);
    duel.bc.onmessage = ev => onRoomMessage(ev.data);
  }catch(e){
    duel.bc = null;
  }
}

function closeChannel(){
  try{ duel.bc?.close(); }catch(e){}
  duel.bc = null;
}

function renderDuelSelect(){
  const sel = $("duelHostQuiz");
  if(!sel) return;
  sel.innerHTML = "";
  getAllQuizzes().filter(quizUnlocked).forEach(q=>{
    const opt = document.createElement("option");
    opt.value = q.id;
    opt.textContent = `${q.title} (${q.topic})`;
    sel.appendChild(opt);
  });
}

$("btnCreateRoom").addEventListener("click", ()=>{
  const name = $("duelHostName").value.trim() || "P1";
  const quizId = $("duelHostQuiz").value;
  const quiz = getAllQuizzes().find(x=>x.id === quizId);
  if(!quiz) return alert("Tria un quiz.");

  const code = genCode();
  duel = { code, role:"host", name, quizId, p1:0, p2:0, bc:null };
  openChannel(code);

  writeRoom(code, {
    code,
    quizId,
    host: { name },
    join: null,
    started: false,
    idx: 0,
    scores: { p1:0, p2:0 },
    answered: { p1:false, p2:false }
  });

  $("roomInfo").classList.remove("hidden");
  $("roomInfo").innerHTML = `Codi creat: <b>${code}</b>`;
  showArena(code);
  $("btnArenaStart").classList.remove("hidden");
  updateArenaStatus();
});

$("btnJoinRoom").addEventListener("click", ()=>{
  const name = $("duelJoinName").value.trim() || "P2";
  const code = $("duelCode").value.trim().toUpperCase();
  if(code.length < 4) return alert("Codi massa curt.");

  const room = readRoom(code);
  if(!room) return alert("No existeix aquesta sala.");

  duel = {
    code,
    role:"join",
    name,
    quizId: room.quizId,
    p1: room.scores?.p1 || 0,
    p2: room.scores?.p2 || 0,
    bc: null
  };
  openChannel(code);

  room.join = { name };
  writeRoom(code, room);
  postRoom(code, { type:"join", name });

  $("joinInfo").classList.remove("hidden");
  $("joinInfo").innerHTML = `Unit a sala <b>${code}</b>`;
  showArena(code);
  updateArenaStatus();
});

function showArena(code){
  $("arena").classList.remove("hidden");
  $("arenaCode").textContent = code;
}

function leaveRoom(){
  if(!duel.code) return;
  postRoom(duel.code, { type:"leave", role:duel.role });
  closeChannel();
  duel.code = null;
  $("arena").classList.add("hidden");
  $("roomInfo").classList.add("hidden");
  $("joinInfo").classList.add("hidden");
}
$("btnArenaLeave").addEventListener("click", leaveRoom);

$("btnArenaStart").addEventListener("click", ()=>{
  if(duel.role !== "host") return;
  const room = readRoom(duel.code);
  if(!room?.join) return alert("Encara no hi ha jugador 2.");

  room.started = true;
  room.idx = 0;
  room.scores = { p1:0, p2:0 };
  room.answered = { p1:false, p2:false };
  writeRoom(duel.code, room);
  postRoom(duel.code, { type:"start" });
  updateArenaStatus();
  renderArenaQuestion();
});

function updateArenaStatus(){
  const room = duel.code ? readRoom(duel.code) : null;
  if(!room) return;

  const hostName = room.host?.name || "P1";
  const joinName = room.join?.name || "P2";

  $("scoreP1").textContent = `${hostName}: ${room.scores?.p1 || 0}`;
  $("scoreP2").textContent = `${joinName}: ${room.scores?.p2 || 0}`;
  $("arenaStatus").textContent = room.started
    ? "Partida en curs..."
    : (room.join ? "Preparats! Prem Començar." : "Esperant jugador 2...");
}

function onRoomMessage(msg){
  if(!msg || !duel.code) return;

  if(msg.type === "join"){
    updateArenaStatus();
  }
  if(msg.type === "start"){
    updateArenaStatus();
    renderArenaQuestion();
  }
  if(msg.type === "answer"){
    const room = readRoom(duel.code);
    if(!room) return;

    if(msg.by === "p1") room.answered.p1 = true;
    if(msg.by === "p2") room.answered.p2 = true;

    if(msg.by === "p1") room.scores.p1 = msg.score;
    if(msg.by === "p2") room.scores.p2 = msg.score;

    writeRoom(duel.code, room);
    updateArenaStatus();

    if(room.answered.p1 && room.answered.p2){
      setTimeout(()=>{
        const room2 = readRoom(duel.code);
        if(!room2) return;
        room2.idx += 1;
        room2.answered = { p1:false, p2:false };
        writeRoom(duel.code, room2);
        postRoom(duel.code, { type:"next" });
        renderArenaQuestion();
      }, 500);
    }
  }
  if(msg.type === "next"){
    renderArenaQuestion();
  }
  if(msg.type === "leave"){
    $("arenaStatus").textContent = "L'altre jugador ha sortit.";
  }
}

function renderArenaQuestion(){
  const room = readRoom(duel.code);
  if(!room) return;

  const quiz = getAllQuizzes().find(x=>x.id === room.quizId);
  if(!quiz) return;

  const idx = room.idx || 0;
  if(idx >= quiz.questions.length){
    const hostName = room.host?.name || "P1";
    const joinName = room.join?.name || "P2";
    const p1 = room.scores?.p1 || 0;
    const p2 = room.scores?.p2 || 0;
    const winner = p1 === p2 ? "Empat 🤝" : (p1 > p2 ? `${hostName} guanya 🏆` : `${joinName} guanya 🏆`);
    $("arenaQuestion").textContent = `FINAL — ${winner}`;
    $("arenaAnswers").innerHTML = "";
    $("arenaExplain").textContent = `Marcador: ${hostName} ${p1} • ${joinName} ${p2}`;
    return;
  }

  const q = quiz.questions[idx];
  $("arenaQuestion").textContent = `${idx + 1}/${quiz.questions.length} — ${q.text}`;
  $("arenaAnswers").innerHTML = "";
  $("arenaExplain").textContent = "";

  function sendAnswer(ok){
    const by = duel.role === "host" ? "p1" : "p2";
    const score = ok
      ? ((by === "p1" ? room.scores.p1 : room.scores.p2) + 1)
      : (by === "p1" ? room.scores.p1 : room.scores.p2);

    postRoom(duel.code, { type:"answer", by, score });
    $("arenaAnswers").querySelectorAll("button").forEach(b=>b.disabled = true);
    $("arenaExplain").textContent = ok ? "✅ Correcte!" : `❌ Incorrecte! ${q.explain || ""}`;
  }

  if(q.type === "mcq"){
    q.options.forEach((opt,i)=>{
      const b = document.createElement("button");
      b.className = "answerBtn";
      b.textContent = opt;
      b.addEventListener("click", ()=>sendAnswer(i === q.correct));
      $("arenaAnswers").appendChild(b);
    });
  }else if(q.type === "tf"){
    [["Veritable", true], ["Fals", false]].forEach(([txt,val])=>{
      const b = document.createElement("button");
      b.className = "answerBtn";
      b.textContent = txt;
      b.addEventListener("click", ()=>sendAnswer(val === q.correct));
      $("arenaAnswers").appendChild(b);
    });
  }else{
    const wrap = document.createElement("div");
    wrap.className = "row wrap";
    wrap.innerHTML = `
      <input class="input" id="arenaOpen" placeholder="Resposta..." />
      <button class="btn primary" id="arenaSend">Enviar</button>
    `;
    $("arenaAnswers").appendChild(wrap);
    const input = wrap.querySelector("#arenaOpen");
    wrap.querySelector("#arenaSend").addEventListener("click", ()=>{
      const ok = (q.answers || []).map(norm).includes(norm(input.value.trim()));
      sendAnswer(ok);
    });
    input.addEventListener("keydown", e=>{
      if(e.key === "Enter") wrap.querySelector("#arenaSend").click();
    });
  }
}

/* ===== INIT RENDERS ===== */
function renderMyQuizzes(){
  const list = $("myQuizList");
  list.innerHTML = "";

  if(state.myQuizzes.length === 0){
    list.innerHTML = `<div class="muted tiny">Encara no tens quizzes guardats.</div>`;
    return;
  }

  state.myQuizzes.forEach(q=>{
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="itemTop">
        <div class="itemTitle">${escapeHtml(q.title)}</div>
        <div class="row wrap">
          <button class="btn" data-play="${q.id}">Jugar</button>
          <button class="btn ghost" data-del="${q.id}">Eliminar</button>
        </div>
      </div>
      <div class="muted tiny">${escapeHtml(q.topic)} • ${(q.questions || []).length} preg.</div>
    `;

    div.querySelector("[data-play]").addEventListener("click", ()=>startQuiz(q.id));
    div.querySelector("[data-del]").addEventListener("click", ()=>{
      if(!confirm("Eliminar aquest quiz?")) return;
      state.myQuizzes = state.myQuizzes.filter(x=>x.id !== q.id);
      saveAll();
      renderTopics();
      renderQuizList();
      renderMyQuizzes();
    });

    list.appendChild(div);
  });
}

renderTopics();
state.mode = $("filterMode").value;
renderQuizList();
renderDraft();
renderMyQuizzes();
renderAchievements();
renderDuelSelect();