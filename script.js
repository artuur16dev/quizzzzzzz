/* =========================================================
   QURIO PRO — 100% FRONT-END (localStorage)
   - Predefinits + temàtiques + desbloqueig per nivell
   - Crear/guardar/reutilitzar quizzes
   - Tipus: MCQ / TF / OPEN + media + explicació
   - Comodins: 50/50, +Temps, Saltar
   - Progrés: XP/Level + logros
   - Share resultats
   - 1vs1 amb codi (BroadcastChannel: entre pestanyes)
========================================================= */

const $ = (id) => document.getElementById(id);
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => [...document.querySelectorAll(sel)];

function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

function uid(){
  return Math.random().toString(36).slice(2,9) + "-" + Date.now().toString(36);
}
function roomCode(){
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s="";
  for(let i=0;i<5;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}

function normalizeText(s){
  return (s||"")
    .toLowerCase()
    .trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ");
}
function youtubeId(url){
  if(!url) return null;
  const u = url.trim();
  const m1 = u.match(/v=([a-zA-Z0-9_-]{6,})/);
  const m2 = u.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  const m3 = u.match(/embed\/([a-zA-Z0-9_-]{6,})/);
  return (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]) || null;
}

/* ---------------- Storage Keys ---------------- */
const K = {
  user: "qurio_user_v1",            // xp, level, stats
  myQuizzes: "qurio_my_quizzes_v1", // array of custom quizzes
  theme: "qurio_theme_v1",
  sound: "qurio_sound_v1",
  achievements: "qurio_ach_v1"
};

/* ---------------- User / Progress ---------------- */
const defaultUser = {
  xp: 0,
  level: 1,
  bestScore: 0,
  played: 0,
  perfects: 0,
  created: 0,
  duelsWon: 0,
  streakPerfect: 0
};

function loadUser(){
  const raw = localStorage.getItem(K.user);
  if(!raw) return {...defaultUser};
  try { return {...defaultUser, ...JSON.parse(raw)}; } catch { return {...defaultUser}; }
}
function saveUser(u){ localStorage.setItem(K.user, JSON.stringify(u)); }

function xpForLevel(level){
  // escalat suau
  return 100 + (level-1)*40;
}
function addXP(amount){
  let u = loadUser();
  u.xp += amount;
  while(u.xp >= xpForLevel(u.level)){
    u.xp -= xpForLevel(u.level);
    u.level += 1;
    unlockAchievement("level_2");
    if(u.level >= 5) unlockAchievement("level_5");
    if(u.level >= 10) unlockAchievement("level_10");
  }
  saveUser(u);
  renderProfile();
  renderPlayList();
  renderAchievements();
}
function renderProfile(){
  const u = loadUser();
  $("xpLabel").textContent = `Nivell ${u.level}`;
  $("xpNums").textContent = `${u.xp} / ${xpForLevel(u.level)} XP`;
  $("xpFill").style.width = `${(u.xp / xpForLevel(u.level))*100}%`;
}

/* ---------------- Achievements ---------------- */
const ACH = [
  { id:"first_play", title:"Primera partida", desc:"Juga un quiz per primera vegada." },
  { id:"first_perfect", title:"Perfecte!", desc:"Aconsegueix un 100% en un quiz." },
  { id:"five_play", title:"Constància", desc:"Juga 5 quizzes." },
  { id:"creator", title:"Creador/a", desc:"Crea i guarda un quiz." },
  { id:"media_master", title:"Multimèdia", desc:"Crea una pregunta amb imatge o vídeo." },
  { id:"level_2", title:"Nivell 2", desc:"Puja a nivell 2." },
  { id:"level_5", title:"Nivell 5", desc:"Puja a nivell 5." },
  { id:"level_10", title:"Nivell 10", desc:"Puja a nivell 10." },
  { id:"power_user", title:"Comodins", desc:"Fes servir 3 comodins en una partida." },
  { id:"duelist", title:"Duelista", desc:"Guanya un 1vs1." },
];

function loadAch(){
  const raw = localStorage.getItem(K.achievements);
  if(!raw) return {};
  try { return JSON.parse(raw) || {}; } catch { return {}; }
}
function saveAch(a){ localStorage.setItem(K.achievements, JSON.stringify(a)); }
function unlockAchievement(id){
  const a = loadAch();
  if(a[id]) return;
  a[id] = { unlockedAt: Date.now() };
  saveAch(a);
  // mini confetti
  burstConfetti(80);
}
function renderAchievements(){
  const a = loadAch();
  const wrap = $("achList");
  wrap.innerHTML = "";
  ACH.forEach(x => {
    const unlocked = !!a[x.id];
    const el = document.createElement("div");
    el.className = "quizCard";
    el.innerHTML = `
      <div class="qTop">
        <div class="badge">${unlocked ? "✅ Desbloquejat" : "🔒 Bloquejat"}</div>
        <div class="badge">${unlocked ? new Date(a[x.id].unlockedAt).toLocaleDateString() : "—"}</div>
      </div>
      <div class="qTitle">${x.title}</div>
      <p class="qDesc">${x.desc}</p>
      <div class="qMeta">
        <span class="pill">${unlocked ? "Actiu" : "Per aconseguir"}</span>
      </div>
    `;
    wrap.appendChild(el);
  });
}

/* ---------------- Theme / Sound ---------------- */
let soundOn = true;
let audioCtx = null;

function setTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(K.theme, theme);
  $("btnTheme").textContent = theme === "light" ? "🌞" : "🌙";
}
function loadTheme(){
  const t = localStorage.getItem(K.theme);
  if(t === "light" || t === "dark") setTheme(t);
  else setTheme("dark");
}
function setSound(val){
  soundOn = !!val;
  localStorage.setItem(K.sound, soundOn ? "1" : "0");
  $("btnSound").textContent = soundOn ? "🔊" : "🔇";
}
function loadSound(){
  const s = localStorage.getItem(K.sound);
  setSound(s !== "0");
}
function beep(freq=700, ms=70){
  if(!soundOn) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine"; o.frequency.value = freq;
    g.gain.value = 0.03;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    setTimeout(() => o.stop(), ms);
  }catch{}
}

/* ---------------- Predefined Quizzes (unlock by level) ---------------- */
const PRESET = [
  {
    id:"p_html_easy",
    title:"HTML Ràpid",
    topic:"Web",
    difficulty:"easy",
    desc:"Etiquetes bàsiques per començar.",
    unlockLevel: 1,
    questions: [
      { type:"mcq", text:"Quina etiqueta crea un enllaç?", options:["<a>","<p>","<div>","<link>"], correct:0,
        explain:"<a> (anchor) crea enllaços. <link> és per recursos al <head>." },
      { type:"tf", text:"<h1> és un títol més important que <h3>.", correct:true,
        explain:"Sí. <h1> és el nivell més alt de títol." },
      { type:"open", text:"Com s’anomena el contenidor principal d’una pàgina (en general)?", answers:["body","el body"], explain:"Normalment el contingut visible va dins de <body>." },
    ]
  },
  {
    id:"p_js_medium",
    title:"JavaScript Essentials",
    topic:"Programació",
    difficulty:"medium",
    desc:"Variables, comparacions i navegador.",
    unlockLevel: 2,
    questions: [
      { type:"mcq", text:"Quin operador compara valor i tipus?", options:["==","=","===","=>"], correct:2,
        explain:"=== compara valor i tipus (comparació estricta)." },
      { type:"mcq", text:"On es guarda localStorage?", options:["Al servidor","Al navegador","A la RAM","A GitHub"], correct:1,
        explain:"localStorage guarda dades al navegador (per origen)." },
      { type:"tf", text:"JavaScript s’executa al navegador sense instal·lar res.", correct:true,
        explain:"Sí, els navegadors ja inclouen motor JS." },
    ]
  },
  {
    id:"p_network_hard",
    title:"Xarxes i IP",
    topic:"Xarxes",
    difficulty:"hard",
    desc:"IP, DNS i protocols.",
    unlockLevel: 4,
    questions: [
      { type:"mcq", text:"Quin servei resol noms a IP?", options:["DHCP","DNS","HTTP","FTP"], correct:1,
        explain:"DNS (Domain Name System) converteix noms en IP." },
      { type:"open", text:"Escriu el protocol de web segur (4 lletres).", answers:["https"], explain:"HTTPS = HTTP + xifrat (TLS)." },
      { type:"tf", text:"Una IP privada típica pot començar per 192.168.", correct:true,
        explain:"Sí. 192.168.0.0/16 és rang privat (RFC 1918)." },
    ]
  }
];

function difficultyLabel(d){
  return d === "easy" ? "Fàcil" : d === "medium" ? "Mitjana" : "Difícil";
}

/* ---------------- Custom Quizzes ---------------- */
function loadMyQuizzes(){
  const raw = localStorage.getItem(K.myQuizzes);
  if(!raw) return [];
  try { return JSON.parse(raw) || []; } catch { return []; }
}
function saveMyQuizzes(arr){
  localStorage.setItem(K.myQuizzes, JSON.stringify(arr));
}

/* ---------------- Topics list ---------------- */
function allQuizzes(){
  const my = loadMyQuizzes();
  return [
    ...PRESET.map(q => ({...q, preset:true})),
    ...my.map(q => ({...q, preset:false}))
  ];
}
function topics(){
  const t = new Set(["Totes"]);
  allQuizzes().forEach(q => t.add(q.topic || "Altres"));
  return [...t];
}

/* ---------------- Tabs ---------------- */
function setTab(name){
  qsa(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  $("tab-play").classList.toggle("hidden", name !== "play");
  $("tab-create").classList.toggle("hidden", name !== "create");
  $("tab-duel").classList.toggle("hidden", name !== "duel");
  $("tab-achievements").classList.toggle("hidden", name !== "achievements");
}
qsa(".tab").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));

/* ---------------- PLAY LIST ---------------- */
function renderTopicFilter(){
  const sel = $("filterTopic");
  sel.innerHTML = "";
  topics().forEach(t => {
    const o = document.createElement("option");
    o.value = t; o.textContent = t;
    sel.appendChild(o);
  });
}
function isUnlocked(quiz){
  if(!quiz.preset) return true;
  const u = loadUser();
  return (u.level >= (quiz.unlockLevel || 1));
}
function renderPlayList(){
  const topic = $("filterTopic").value || "Totes";
  const wrap = $("quizList");
  wrap.innerHTML = "";

  const list = allQuizzes().filter(q => topic === "Totes" ? true : (q.topic || "Altres") === topic);

  list.forEach(q => {
    const unlocked = isUnlocked(q);
    const badge = q.preset ? `Lvl ${q.unlockLevel || 1}+` : "Personal";
    const total = (q.questions || []).length;

    const el = document.createElement("div");
    el.className = "quizCard";
    el.innerHTML = `
      <div class="qTop">
        <div class="badge">${badge}</div>
        <div class="badge ${unlocked ? "" : "lockedTag"}">${unlocked ? "✅ Disponible" : "🔒 Bloquejat"}</div>
      </div>
      <div class="qTitle">${q.title}</div>
      <p class="qDesc">${q.desc || ""}</p>
      <div class="qMeta">
        <span class="pill">#${q.topic || "Altres"}</span>
        <span class="pill">${difficultyLabel(q.difficulty || "medium")}</span>
        <span class="pill">${total} preguntes</span>
      </div>
      <div class="row">
        <button class="btn primary" ${unlocked ? "" : "disabled"} data-play="${q.id}">Jugar</button>
        <button class="btn" data-preview="${q.id}">Veure</button>
      </div>
    `;
    wrap.appendChild(el);
  });

  // actions
  qsa("[data-play]").forEach(b => b.addEventListener("click", () => startQuizById(b.dataset.play)));
  qsa("[data-preview]").forEach(b => b.addEventListener("click", () => previewQuiz(b.dataset.preview)));
}
function previewQuiz(id){
  const q = allQuizzes().find(x => x.id === id);
  if(!q) return;
  alert(`"${q.title}"\n\nTema: ${q.topic}\nDificultat: ${difficultyLabel(q.difficulty)}\nPreguntes: ${(q.questions||[]).length}\n\n${q.desc||""}`);
}

$("filterTopic").addEventListener("change", renderPlayList);

/* ---------------- QUIZ PLAYER ---------------- */
const player = $("player");
let playState = null; // {quiz, mode, questions, idx, score, locked, timer, powerupsUsed, power: {..}}

function openPlayer(){ player.classList.remove("hidden"); }
function closePlayer(){ player.classList.add("hidden"); stopTimer(); }

$("btnClosePlayer").addEventListener("click", () => {
  closePlayer();
});

function startQuizById(id){
  const quiz = allQuizzes().find(q => q.id === id);
  if(!quiz) return;

  const mode = $("filterMode").value; // solo | practice
  const doShuffle = $("optShuffle").checked;
  const useTimer = $("optTimer").checked;

  let qsArr = [...(quiz.questions||[])];
  if(doShuffle) qsArr = shuffle(qsArr);

  playState = {
    quiz,
    mode,
    questions: qsArr,
    idx: 0,
    score: 0,
    locked: false,
    useTimer,
    timeLeft: 20,
    timerInt: null,
    power: { fifty:true, time:true, skip:true },
    powerupsUsed: 0,
    lastResultText: ""
  };

  // header
  $("playTitle").textContent = quiz.title;
  $("playMeta").textContent = `#${quiz.topic || "Altres"} • ${difficultyLabel(quiz.difficulty||"medium")} • ${mode === "practice" ? "Pràctica" : "Individual"}`;

  $("scoreText").textContent = "Punts: 0";
  $("progressBar").style.width = "0%";

  // reset UI
  $("endBox").classList.add("hidden");
  $("explainBox").classList.add("hidden");
  $("btnNext").disabled = true;
  $("btnShare").disabled = true;

  // powerups
  $("pu5050").disabled = false;
  $("puTime").disabled = false;
  $("puSkip").disabled = false;

  renderQuestion();
  openPlayer();
}

function renderQuestion(){
  const s = playState;
  if(!s) return;

  s.locked = false;
  $("btnNext").disabled = true;
  $("explainBox").classList.add("hidden");
  $("btnShare").disabled = true;

  const total = s.questions.length;
  $("qCounter").textContent = `Pregunta ${s.idx+1}/${total}`;
  $("progressBar").style.width = `${(s.idx/total)*100}%`;

  const q = s.questions[s.idx];
  $("qTitle").textContent = q.text;

  // media
  const media = $("media");
  media.innerHTML = "";
  if(q.image){
    const img = document.createElement("img");
    img.src = q.image;
    img.alt = "Imatge pregunta";
    img.loading = "lazy";
    media.appendChild(img);
  }
  const yid = youtubeId(q.video);
  if(yid){
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube.com/embed/${yid}`;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    media.appendChild(iframe);
  }

  // answers
  const wrap = $("answers");
  wrap.innerHTML = "";

  if(q.type === "mcq"){
    q.options.forEach((opt,i) => {
      const b = document.createElement("button");
      b.className = "answerBtn";
      b.textContent = opt;
      b.addEventListener("click", () => chooseAnswer({kind:"mcq", index:i}));
      wrap.appendChild(b);
    });
  } else if(q.type === "tf"){
    ["Veritable","Fals"].forEach((opt,i) => {
      const b = document.createElement("button");
      b.className = "answerBtn";
      b.textContent = opt;
      b.addEventListener("click", () => chooseAnswer({kind:"tf", value: i===0}));
      wrap.appendChild(b);
    });
  } else if(q.type === "open"){
    // open input
    wrap.style.gridTemplateColumns = "1fr";
    const div = document.createElement("div");
    div.className = "card";
    div.style.padding = "12px";
    div.style.borderRadius = "16px";
    div.style.border = "1px solid var(--stroke)";
    div.style.background = "rgba(255,255,255,.04)";
    div.innerHTML = `
      <label class="muted" style="display:block;margin-bottom:6px">Escriu la teva resposta</label>
      <input id="openInput" class="input" placeholder="Resposta..." />
      <div class="row" style="margin-top:10px">
        <button id="openSend" class="btn primary">Enviar</button>
      </div>
    `;
    wrap.appendChild(div);
    setTimeout(() => {
      const inp = $("openInput");
      const btn = $("openSend");
      inp?.focus();
      btn?.addEventListener("click", () => chooseAnswer({kind:"open", text: inp.value}));
      inp?.addEventListener("keydown", (e) => { if(e.key === "Enter") chooseAnswer({kind:"open", text: inp.value}); });
    }, 0);
  }

  // timer
  if(s.useTimer){
    $("timerBox").classList.remove("hidden");
    startTimer();
  } else {
    $("timerBox").classList.add("hidden");
    stopTimer();
  }

  // restore grid for non-open
  if(q.type !== "open"){
    wrap.style.gridTemplateColumns = "";
  }
}

function markButtons(correctIndex, clickedIndex){
  const btns = qsa("#answers .answerBtn");
  btns.forEach((b,i) => {
    if(i === correctIndex) b.classList.add("correct");
    if(clickedIndex != null && i === clickedIndex && clickedIndex !== correctIndex) b.classList.add("wrong");
  });
}

function showExplain(correct, q){
  const box = $("explainBox");
  const badge = $("resultBadge");
  const txt = $("explainText");

  badge.textContent = correct ? "✅ Correcte" : "❌ Incorrecte";
  badge.style.color = correct ? "var(--p2)" : "var(--bad)";
  txt.textContent = q.explain || "Sense explicació.";

  box.classList.remove("hidden");
  $("btnShare").disabled = false;
}

function chooseAnswer(payload){
  const s = playState;
  if(!s || s.locked) return;
  s.locked = true;
  stopTimer();

  const q = s.questions[s.idx];

  let correct = false;
  let clickedIndex = null;

  if(q.type === "mcq"){
    clickedIndex = payload.index;
    correct = (payload.index === q.correct);
    markButtons(q.correct, payload.index);
  } else if(q.type === "tf"){
    // buttons: [true,false] index 0/1
    clickedIndex = payload.value ? 0 : 1;
    const correctIndex = q.correct ? 0 : 1;
    correct = (payload.value === q.correct);
    markButtons(correctIndex, clickedIndex);
  } else if(q.type === "open"){
    const ans = normalizeText(payload.text);
    const accepted = (q.answers || []).flatMap(x => String(x).split("|")).map(s=>normalizeText(s));
    correct = accepted.includes(ans);
    // open no buttons marking
  }

  if(correct){
    s.score += 1;
    beep(900, 70);
  }else{
    beep(250, 110);
  }

  $("scoreText").textContent = `Punts: ${s.score}`;
  showExplain(correct, q);

  // compose share text
  s.lastResultText = `Qurio — ${s.quiz.title}\nPregunta ${s.idx+1}/${s.questions.length}: ${correct ? "✅" : "❌"}\nPunts: ${s.score}`;

  $("btnNext").disabled = false;

  // last question?
  if(s.idx === s.questions.length - 1){
    $("btnNext").textContent = "Finalitzar";
  } else {
    $("btnNext").textContent = "Següent";
  }
}

$("btnNext").addEventListener("click", () => {
  const s = playState;
  if(!s) return;

  if(s.idx < s.questions.length - 1){
    s.idx++;
    renderQuestion();
  } else {
    finishQuiz();
  }
});

/* ---------------- Powerups ---------------- */
$("pu5050").addEventListener("click", () => {
  const s = playState;
  if(!s || !s.power.fifty) return;
  const q = s.questions[s.idx];
  if(q.type !== "mcq") return;

  const btns = qsa("#answers .answerBtn");
  const wrongIdx = btns.map((_,i)=>i).filter(i => i !== q.correct);
  shuffle(wrongIdx).slice(0,2).forEach(i => btns[i].classList.add("dim"));

  s.power.fifty = false;
  s.powerupsUsed++;
  $("pu5050").disabled = true;

  if(s.powerupsUsed >= 3) unlockAchievement("power_user");
});

$("puTime").addEventListener("click", () => {
  const s = playState;
  if(!s || !s.power.time) return;
  if(!s.useTimer) return;

  s.timeLeft = clamp(s.timeLeft + 10, 1, 60);
  updateTimerUI();

  s.power.time = false;
  s.powerupsUsed++;
  $("puTime").disabled = true;

  if(s.powerupsUsed >= 3) unlockAchievement("power_user");
});

$("puSkip").addEventListener("click", () => {
  const s = playState;
  if(!s || !s.power.skip) return;

  s.power.skip = false;
  s.powerupsUsed++;
  $("puSkip").disabled = true;

  if(s.powerupsUsed >= 3) unlockAchievement("power_user");

  // skip counts as answered incorrect (no point)
  stopTimer();
  s.locked = true;
  showExplain(false, { explain:"Has utilitzat el comodí de saltar. Aquesta pregunta no suma punts." });
  $("btnNext").disabled = false;
});

/* ---------------- Timer ---------------- */
function stopTimer(){
  const s = playState;
  if(!s) return;
  if(s.timerInt) clearInterval(s.timerInt);
  s.timerInt = null;
}
function updateTimerUI(){
  const s = playState;
  if(!s) return;
  $("timerNum").textContent = String(s.timeLeft);
  $("timerFill").style.transform = `translateY(${(1 - (s.timeLeft/20))*100}%)`;
}
function startTimer(){
  const s = playState;
  if(!s) return;

  stopTimer();
  s.timeLeft = 20;
  updateTimerUI();

  s.timerInt = setInterval(() => {
    s.timeLeft--;
    updateTimerUI();

    if(s.timeLeft === 5) beep(820, 90);
    if(s.timeLeft <= 0){
      stopTimer();
      if(!s.locked){
        // auto fail
        s.locked = true;
        const q = s.questions[s.idx];
        if(q.type === "mcq") markButtons(q.correct, null);
        if(q.type === "tf") markButtons(q.correct ? 0 : 1, null);
        showExplain(false, { explain:"⏱️ Temps esgotat. La resposta correcta s’ha marcat (si aplica)." });
        $("btnNext").disabled = false;
        beep(220, 120);
      }
    }
  }, 1000);
}

/* ---------------- Finish quiz / XP / Unlock / Best ---------------- */
function finishQuiz(){
  stopTimer();
  const s = playState;
  if(!s) return;

  const total = s.questions.length;
  const u = loadUser();
  u.played += 1;

  unlockAchievement("first_play");
  if(u.played >= 5) unlockAchievement("five_play");

  const pct = total ? Math.round((s.score/total)*100) : 0;
  if(pct === 100){
    u.perfects += 1;
    unlockAchievement("first_perfect");
  }

  // best
  u.bestScore = Math.max(u.bestScore, s.score);
  saveUser(u);

  // XP only in solo
  if(s.mode === "solo"){
    // xp based on difficulty & score
    const base = s.quiz.difficulty === "easy" ? 30 : s.quiz.difficulty === "hard" ? 55 : 40;
    const bonus = Math.round((s.score/total) * base);
    addXP(base + bonus);
  } else {
    renderProfile();
  }

  // show end box
  $("progressBar").style.width = "100%";
  $("endBox").classList.remove("hidden");
  $("finalText").textContent = `Has fet ${s.score} / ${total} (${pct}%).`;
  $("bestText").textContent = `Récord personal (millor puntuació): ${loadUser().bestScore}`;

  // confetti if good score
  if(pct >= 70) burstConfetti(180);

  // Share text for final
  s.lastResultText = `Qurio — Resultat\nQuiz: ${s.quiz.title}\nPunts: ${s.score}/${total} (${pct}%)\nNivell: ${loadUser().level}`;

  $("btnShare").disabled = false;
}

$("btnReplay").addEventListener("click", () => {
  const s = playState;
  if(!s) return;
  startQuizById(s.quiz.id);
});
$("btnHome").addEventListener("click", () => {
  closePlayer();
  renderPlayList();
  renderProfile();
});

$("btnShare").addEventListener("click", async () => {
  const s = playState;
  if(!s) return;

  const text = s.lastResultText || "Qurio";
  // Web Share if available
  try{
    if(navigator.share){
      await navigator.share({ title:"Qurio", text });
    }else{
      await navigator.clipboard.writeText(text);
      alert("Resultat copiat al porta-retalls ✅");
    }
  }catch{
    // ignore
  }
});

/* ---------------- Create Quiz UI ---------------- */
let draft = { id:null, title:"", topic:"", difficulty:"medium", desc:"", questions:[] };

function setCreateHint(msg){ $("createHint").textContent = msg || ""; }

function resetDraft(){
  draft = { id:null, title:"", topic:"", difficulty:"medium", desc:"", questions:[] };
  $("cqTitle").value = "";
  $("cqTopic").value = "";
  $("cqDifficulty").value = "medium";
  $("cqDesc").value = "";
  renderDraft();
  setCreateHint("Crea un quiz i guarda'l. Pots afegir tantes preguntes com vulguis.");
}
function renderDraft(){
  const wrap = $("draftList");
  wrap.innerHTML = "";
  if(draft.questions.length === 0){
    wrap.innerHTML = `<div class="muted">Encara no hi ha preguntes.</div>`;
    return;
  }
  draft.questions.forEach((q, i) => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="itemTop">
        <div>
          <div class="itemTitle">${i+1}. ${q.type.toUpperCase()} — ${q.text.slice(0,60)}${q.text.length>60?"…":""}</div>
          <div class="muted">${q.explain ? q.explain.slice(0,70) : "Sense explicació"}${q.explain?.length>70?"…":""}</div>
        </div>
        <div class="itemBtns">
          <button class="btn" data-delq="${i}">Eliminar</button>
        </div>
      </div>
    `;
    wrap.appendChild(el);
  });
  qsa("[data-delq]").forEach(b => b.addEventListener("click", () => {
    const i = Number(b.dataset.delq);
    draft.questions.splice(i,1);
    renderDraft();
  }));
}

function toggleQuestionBlocks(){
  const t = $("qType").value;
  $("mcqBlock").classList.toggle("hidden", t !== "mcq");
  $("tfBlock").classList.toggle("hidden", t !== "tf");
  $("openBlock").classList.toggle("hidden", t !== "open");
}
$("qType").addEventListener("change", toggleQuestionBlocks);

$("addQuestion").addEventListener("click", () => {
  const text = ($("qText").value || "").trim();
  const type = $("qType").value;
  const image = ($("qImage").value || "").trim();
  const video = ($("qVideo").value || "").trim();
  const explain = ($("qExplain").value || "").trim();

  if(!text){
    setCreateHint("⚠️ Escriu l’enunciat de la pregunta.");
    return;
  }

  let q = { type, text, image: image || undefined, video: video || undefined, explain: explain || "Explicació no definida." };

  if(type === "mcq"){
    const opts = [$("o0").value,$("o1").value,$("o2").value,$("o3").value].map(x => (x||"").trim());
    if(opts.some(x => !x)){
      setCreateHint("⚠️ Omple les 4 opcions.");
      return;
    }
    q.options = opts;
    q.correct = Number($("mcqCorrect").value);
  } else if(type === "tf"){
    q.correct = $("tfCorrect").value === "true";
  } else if(type === "open"){
    const ans = ($("openCorrect").value || "").trim();
    if(!ans){
      setCreateHint("⚠️ Escriu la resposta correcta (pots posar variants amb | ).");
      return;
    }
    q.answers = ans.split("|").map(s => s.trim()).filter(Boolean);
  }

  // achievement: media
  if(q.image || youtubeId(q.video)) unlockAchievement("media_master");

  draft.questions.push(q);

  // clear question fields (keep type)
  $("qText").value = "";
  $("qImage").value = "";
  $("qVideo").value = "";
  $("qExplain").value = "";
  $("o0").value = $("o1").value = $("o2").value = $("o3").value = "";
  $("openCorrect").value = "";
  $("mcqCorrect").value = "0";
  $("tfCorrect").value = "true";

  setCreateHint("✅ Pregunta afegida.");
  renderDraft();
});

$("saveQuiz").addEventListener("click", () => {
  const title = ($("cqTitle").value || "").trim();
  const topic = ($("cqTopic").value || "").trim() || "Altres";
  const difficulty = $("cqDifficulty").value;
  const desc = ($("cqDesc").value || "").trim();

  if(!title){
    setCreateHint("⚠️ Posa un títol al quiz.");
    return;
  }
  if(draft.questions.length < 3){
    setCreateHint("⚠️ Afegeix almenys 3 preguntes (queda més complet).");
    return;
  }

  const my = loadMyQuizzes();

  if(draft.id){
    // edit existing
    const idx = my.findIndex(q => q.id === draft.id);
    if(idx >= 0){
      my[idx] = {...my[idx], title, topic, difficulty, desc, questions: draft.questions};
    }
  } else {
    my.push({
      id: "u_" + uid(),
      title, topic, difficulty, desc,
      unlockLevel: 1,
      questions: draft.questions
    });
    // update stats
    const u = loadUser();
    u.created += 1;
    saveUser(u);
    unlockAchievement("creator");
  }

  saveMyQuizzes(my);
  setCreateHint("💾 Quiz guardat! El tens a “Els meus quizzes” i també a “Jugar”.");
  renderMyQuizzes();
  renderTopicFilter();
  renderPlayList();
  resetDraft();
});

function renderMyQuizzes(){
  const wrap = $("myQuizList");
  const my = loadMyQuizzes();
  wrap.innerHTML = "";

  if(my.length === 0){
    wrap.innerHTML = `<div class="muted">Encara no has creat cap quiz.</div>`;
    return;
  }

  my.forEach(q => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="itemTop">
        <div>
          <div class="itemTitle">${q.title}</div>
          <div class="muted">#${q.topic} • ${difficultyLabel(q.difficulty)} • ${(q.questions||[]).length} preguntes</div>
        </div>
        <div class="itemBtns">
          <button class="btn" data-edit="${q.id}">Editar</button>
          <button class="btn" data-del="${q.id}">Eliminar</button>
        </div>
      </div>
    `;
    wrap.appendChild(el);
  });

  qsa("[data-del]").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.del;
    const my = loadMyQuizzes().filter(x => x.id !== id);
    saveMyQuizzes(my);
    renderMyQuizzes();
    renderTopicFilter();
    renderPlayList();
  }));

  qsa("[data-edit]").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.edit;
    const q = loadMyQuizzes().find(x => x.id === id);
    if(!q) return;
    draft = {...q, questions: [...(q.questions||[])]};
    $("cqTitle").value = draft.title;
    $("cqTopic").value = draft.topic;
    $("cqDifficulty").value = draft.difficulty || "medium";
    $("cqDesc").value = draft.desc || "";
    renderDraft();
    setCreateHint("✏️ Editant quiz existent. Guarda per aplicar canvis.");
    setTab("create");
  }));
}

/* ---------------- DUEL (1vs1 via BroadcastChannel) ---------------- */
let duel = {
  code: null,
  role: null, // host | join
  channel: null,
  quiz: null,
  p1: null,
  p2: null,
  idx: 0,
  p1Score: 0,
  p2Score: 0,
  started: false,
  answered: { p1:false, p2:false },
  qset: []
};

function closeDuelChannel(){
  if(duel.channel){
    duel.channel.close();
    duel.channel = null;
  }
}
function duelSend(type, payload){
  duel.channel?.postMessage({ type, payload });
}
function duelSetInfo(elId, msg){
  const box = $(elId);
  box.textContent = msg;
  box.classList.remove("hidden");
}

function renderDuelQuizSelect(){
  const sel = $("duelQuizHost");
  sel.innerHTML = "";
  allQuizzes().forEach(q => {
    // host can pick only unlocked presets + any custom
    if(q.preset && !isUnlocked(q)) return;
    const o = document.createElement("option");
    o.value = q.id;
    o.textContent = `${q.title} (${q.topic})`;
    sel.appendChild(o);
  });
}
function showArena(show){
  $("duelArena").classList.toggle("hidden", !show);
}
function updateArenaScores(){
  $("p1Score").textContent = `${duel.p1 || "P1"}: ${duel.p1Score}`;
  $("p2Score").textContent = `${duel.p2 || "P2"}: ${duel.p2Score}`;
}
function renderArenaQuestion(){
  const q = duel.qset[duel.idx];
  if(!q){
    $("arenaQuestion").textContent = "Final!";
    $("arenaExplain").textContent = "";
    return;
  }
  $("arenaQuestion").textContent = q.text;
  $("arenaExplain").textContent = "";
  const wrap = $("arenaAnswers");
  wrap.innerHTML = "";

  const canAnswer = duel.started;

  if(q.type === "mcq"){
    q.options.forEach((opt,i) => {
      const b = document.createElement("button");
      b.className = "answerBtn";
      b.textContent = opt;
      b.disabled = !canAnswer;
      b.addEventListener("click", () => duelAnswer({type:"mcq", index:i}));
      wrap.appendChild(b);
    });
  } else if(q.type === "tf"){
    ["Veritable","Fals"].forEach((opt,i) => {
      const b = document.createElement("button");
      b.className = "answerBtn";
      b.textContent = opt;
      b.disabled = !canAnswer;
      b.addEventListener("click", () => duelAnswer({type:"tf", value:i===0}));
      wrap.appendChild(b);
    });
  } else {
    wrap.style.gridTemplateColumns = "1fr";
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="muted" style="margin-bottom:6px">Resposta oberta</div>
      <input id="duelOpen" class="input" placeholder="Resposta..." />
      <div class="row" style="margin-top:10px">
        <button id="duelSendOpen" class="btn primary">Enviar</button>
      </div>
    `;
    wrap.appendChild(div);
    setTimeout(() => {
      const inp = $("duelOpen");
      const btn = $("duelSendOpen");
      inp.disabled = !canAnswer;
      btn.disabled = !canAnswer;
      btn.addEventListener("click", () => duelAnswer({type:"open", text: inp.value}));
      inp.addEventListener("keydown", (e)=>{ if(e.key==="Enter") duelAnswer({type:"open", text: inp.value}); });
    },0);
  }

  duel.answered = { p1:false, p2:false };
  $("duelStatus").textContent = duel.role === "host"
    ? "Esperant respostes… (tu ets host)"
    : "Respon ràpid! (tu ets convidat)";

  updateArenaScores();
}

function duelAnswer(ans){
  if(!duel.started) return;

  const me = duel.role === "host" ? "p1" : "p2";
  duelSend("answer", { me, idx: duel.idx, ans });
  // lock local buttons
  qsa("#arenaAnswers .answerBtn").forEach(b => b.disabled = true);
  const open = $("duelOpen"); const send = $("duelSendOpen");
  if(open) open.disabled = true;
  if(send) send.disabled = true;

  $("duelStatus").textContent = "Resposta enviada. Esperant l’altre...";
}

function duelEvaluate(p1Ans, p2Ans){
  const q = duel.qset[duel.idx];
  const check = (ans) => {
    if(!ans) return false;
    if(q.type === "mcq") return ans.type==="mcq" && ans.index === q.correct;
    if(q.type === "tf") return ans.type==="tf" && ans.value === q.correct;
    if(q.type === "open"){
      const accepted = (q.answers || []).flatMap(x => String(x).split("|")).map(s=>normalizeText(s));
      return ans.type==="open" && accepted.includes(normalizeText(ans.text));
    }
    return false;
  };

  const p1Correct = check(p1Ans);
  const p2Correct = check(p2Ans);

  if(p1Correct) duel.p1Score++;
  if(p2Correct) duel.p2Score++;

  updateArenaScores();

  // show explain for both
  $("arenaExplain").textContent = `Resposta correcta: ${q.type==="mcq" ? q.options[q.correct] : q.type==="tf" ? (q.correct?"Veritable":"Fals") : (q.answers||[]).join(" | ")} — ${q.explain || ""}`;

  // next
  setTimeout(() => {
    duel.idx++;
    if(duel.idx >= duel.qset.length){
      // end duel
      const p1 = duel.p1Score, p2 = duel.p2Score;
      $("arenaQuestion").textContent = `Final! ${duel.p1}: ${p1} — ${duel.p2}: ${p2}`;
      $("arenaAnswers").innerHTML = "";
      $("arenaExplain").textContent = "";

      // winner achievement
      if(duel.role === "host" && p1 > p2){
        const u = loadUser(); u.duelsWon++; saveUser(u);
        unlockAchievement("duelist");
      }
      if(duel.role === "join" && p2 > p1){
        const u = loadUser(); u.duelsWon++; saveUser(u);
        unlockAchievement("duelist");
      }
      burstConfetti(140);
      duelSend("end", { p1, p2 });
      return;
    }
    duelSend("next", { idx: duel.idx });
    renderArenaQuestion();
  }, 1100);
}

// Host create room
$("btnCreateRoom").addEventListener("click", () => {
  closeDuelChannel();

  const name = ($("duelNameHost").value || "Jugador 1").trim();
  const quizId = $("duelQuizHost").value;
  const quiz = allQuizzes().find(q => q.id === quizId);
  if(!quiz) return;

  duel = {
    code: roomCode(),
    role: "host",
    channel: null,
    quiz,
    p1: name,
    p2: null,
    idx: 0,
    p1Score: 0,
    p2Score: 0,
    started: false,
    answered: { p1:false, p2:false },
    qset: shuffle([...quiz.questions]) // duel always shuffled
  };

  duel.channel = new BroadcastChannel("qurio_room_" + duel.code);
  duel.channel.onmessage = onDuelMessage;

  $("arenaCode").textContent = duel.code;
  duelSetInfo("roomInfo", `✅ Sala creada. Codi: ${duel.code}\nObre una altra pestanya i uneix-te amb aquest codi.`);
  $("roomInfo").classList.remove("hidden");

  $("arenaStart").classList.remove("hidden");
  $("arenaStart").disabled = true;
  showArena(true);

  $("duelStatus").textContent = "Esperant que s'uneixi un jugador...";
  $("arenaQuestion").textContent = "Esperant...";
  $("arenaAnswers").innerHTML = "";
  updateArenaScores();

  duelSend("host", { code: duel.code, quizMeta: { title: quiz.title, topic: quiz.topic } , p1: duel.p1 });
});

// Start duel (host)
$("arenaStart").addEventListener("click", () => {
  if(duel.role !== "host") return;
  duel.started = true;
  duelSend("start", { qset: duel.qset, p1: duel.p1, p2: duel.p2 });
  renderArenaQuestion();
});

// Join room
$("btnJoinRoom").addEventListener("click", () => {
  closeDuelChannel();

  const name = ($("duelNameJoin").value || "Jugador 2").trim();
  const code = ($("duelCode").value || "").trim().toUpperCase();
  if(!code){
    duelSetInfo("joinInfo", "⚠️ Escriu un codi.");
    return;
  }

  duel = {
    code,
    role:"join",
    channel: new BroadcastChannel("qurio_room_" + code),
    quiz:null,
    p1:null,
    p2:name,
    idx:0,
    p1Score:0,
    p2Score:0,
    started:false,
    answered:{p1:false,p2:false},
    qset:[]
  };
  duel.channel.onmessage = onDuelMessage;

  $("arenaCode").textContent = duel.code;
  duelSetInfo("joinInfo", `⏳ Intentant unir-me a la sala ${code}...`);
  showArena(true);

  $("arenaStart").classList.add("hidden");
  $("duelStatus").textContent = "Notificant al host...";
  $("arenaQuestion").textContent = "Esperant confirmació...";
  $("arenaAnswers").innerHTML = "";

  duelSend("join", { p2: duel.p2 });
});

$("arenaLeave").addEventListener("click", () => {
  duelSend("leave", { who: duel.role });
  closeDuelChannel();
  showArena(false);
  $("roomInfo").classList.add("hidden");
  $("joinInfo").classList.add("hidden");
});

function onDuelMessage(ev){
  const { type, payload } = ev.data || {};
  if(!type) return;

  if(type === "host"){
    // join side sees meta
    if(duel.role === "join"){
      duel.p1 = payload.p1;
      $("duelStatus").textContent = `Sala trobada. Host: ${duel.p1}. Esperant inici...`;
      $("arenaQuestion").textContent = `Sala trobada: ${payload.quizMeta.title}`;
      $("arenaExplain").textContent = `#${payload.quizMeta.topic}`;
    }
  }

  if(type === "join" && duel.role === "host"){
    duel.p2 = payload.p2;
    $("duelStatus").textContent = `Jugador unit: ${duel.p2}. Pots començar.`;
    $("arenaStart").disabled = false;
    duelSend("ready", { p2: duel.p2 });
    updateArenaScores();
  }

  if(type === "ready" && duel.role === "join"){
    duelSetInfo("joinInfo", `✅ Unit! Esperant que el host comenci...`);
  }

  if(type === "start"){
    duel.started = true;
    duel.p1 = payload.p1;
    duel.p2 = payload.p2;
    duel.qset = payload.qset;
    duel.idx = 0;
    duel.p1Score = 0;
    duel.p2Score = 0;
    updateArenaScores();
    $("duelStatus").textContent = "Duel iniciat!";
    renderArenaQuestion();
  }

  if(type === "answer"){
    // host collects both answers and resolves
    if(duel.role !== "host") return;
    const { me, idx, ans } = payload;
    if(idx !== duel.idx) return;

    duel._ans = duel._ans || { p1:null, p2:null };
    duel._ans[me] = ans;

    // if both answered, evaluate
    if(duel._ans.p1 && duel._ans.p2){
      duelEvaluate(duel._ans.p1, duel._ans.p2);
      duel._ans = { p1:null, p2:null };
    }
  }

  if(type === "next"){
    if(duel.role === "join"){
      duel.idx = payload.idx;
      renderArenaQuestion();
    }
  }

  if(type === "end"){
    if(duel.role === "join"){
      burstConfetti(120);
    }
  }

  if(type === "leave"){
    $("duelStatus").textContent = "L'altre jugador ha sortit.";
    $("arenaAnswers").innerHTML = "";
  }
}

/* ---------------- Confetti ---------------- */
const confettiCanvas = $("confetti");
const confetti = { ctx:null, w:0, h:0, parts:[], raf:null };

function resizeConfetti(){
  confetti.w = confettiCanvas.width = window.innerWidth;
  confetti.h = confettiCanvas.height = window.innerHeight;
  confetti.ctx = confettiCanvas.getContext("2d");
}
window.addEventListener("resize", resizeConfetti);

function burstConfetti(n=140){
  resizeConfetti();
  const colors = ["#7c3aed","#06b6d4","#22c55e","#f59e0b","#ef4444","#60a5fa","#e879f9"];
  confetti.parts = [];
  for(let i=0;i<n;i++){
    confetti.parts.push({
      x: confetti.w/2 + (Math.random()*140 - 70),
      y: confetti.h/3 + (Math.random()*100 - 50),
      vx: (Math.random()*9 - 4.5),
      vy: (Math.random()*-11 - 4),
      g: 0.35 + Math.random()*0.25,
      r: 3 + Math.random()*4,
      a: 1,
      rot: Math.random()*Math.PI,
      vr: (Math.random()*0.25 - 0.125),
      c: colors[Math.floor(Math.random()*colors.length)]
    });
  }
  if(confetti.raf) cancelAnimationFrame(confetti.raf);
  animateConfetti();
}
function animateConfetti(){
  const ctx = confetti.ctx;
  if(!ctx) return;

  ctx.clearRect(0,0,confetti.w,confetti.h);

  confetti.parts.forEach(p => {
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.a -= 0.006;

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.a);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.c;
    ctx.fillRect(-p.r, -p.r, p.r*2, p.r*2);
    ctx.restore();
  });

  confetti.parts = confetti.parts.filter(p => p.a > 0 && p.y < confetti.h + 30);

  if(confetti.parts.length){
    confetti.raf = requestAnimationFrame(animateConfetti);
  }else{
    ctx.clearRect(0,0,confetti.w,confetti.h);
  }
}

/* ---------------- Init ---------------- */
$("btnTheme").addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  setTheme(cur === "dark" ? "light" : "dark");
});
$("btnSound").addEventListener("click", () => setSound(!soundOn));

function init(){
  loadTheme();
  loadSound();

  renderProfile();
  renderTopicFilter();
  renderPlayList();

  resetDraft();
  toggleQuestionBlocks();
  renderMyQuizzes();

  renderDuelQuizSelect();
  renderAchievements();
}
init();
