/* ===========================
   SmartFun — script.js FINAL
   =========================== */

/* ---------- Shortcuts ---------- */
const $ = id => document.getElementById(id);

/* ---------- Storage keys ---------- */
const KEY_WALLET = 'sf_wallet_final';
const KEY_HISTORY = 'sf_history_final';
const KEY_OWNED = 'sf_owned_avatars';
const KEY_ACTIVE_AV = 'sf_active_avatar';
const KEY_UNLOCK = 'sf_unlocked_levels';

/* ---------- Config ---------- */
const POINTS_PER_CORRECT = 20;
const UNLOCK_POINTS = 165;
const STOCK_L1 = 20, STOCK_L2 = 20, STOCK_L3 = 40;
const SHOW_L1 = 10, SHOW_L2 = 10, SHOW_L3 = 20;
const TIMER_L1_2 = 60, TIMER_L3 = 120;

/* ---------- State ---------- */
let wallet = 0;
let playerName = '';
let ownedAvatars = []; // array of avatar ids
let activeAvatar = 'free';

let selectedSubject = null; // 'mat','sci','hist','chem'
let selectedLevel = 1;

let bank = {}; // question banks
let questions = [];
let answers = [];
let currentIndex = 0;
let timer = 0, timerId = null;

/* ---------- Avatars definition (1 free + 3 paid) ----------
   NOTE: free avatar label intentionally empty to remove "FREE" text everywhere
*/
const AVATARS = [
  { id: 'free', label: '', css: 'avatar free', price: 0, desc: 'Gratis' },
  { id: 'blue', label: 'BLUE', css: 'avatar blue', price: 50, desc: 'Blue Walker' },
  { id: 'gold', label: 'GOLD', css: 'avatar gold', price: 80, desc: 'Gold Runner' },
  { id: 'purple', label: 'PURP', css: 'avatar purple', price: 100, desc: 'Purple Runner' }
];

/* ---------- Storage helpers ---------- */
function saveWallet(){ localStorage.setItem(KEY_WALLET, String(wallet)); renderWallet(); }
function loadWallet(){ wallet = parseInt(localStorage.getItem(KEY_WALLET)||'0',10); if(isNaN(wallet)) wallet=0; renderWallet(); }

function getHistory(){ return JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]'); }
function pushHistory(e){ const h = getHistory(); h.unshift(e); localStorage.setItem(KEY_HISTORY, JSON.stringify(h.slice(0,200))); }

function saveOwned(){ localStorage.setItem(KEY_OWNED, JSON.stringify(ownedAvatars)); }
function loadOwned(){ ownedAvatars = JSON.parse(localStorage.getItem(KEY_OWNED) || '[]'); if(!ownedAvatars.includes('free')) ownedAvatars.unshift('free'); }

function saveActiveAvatar(){ localStorage.setItem(KEY_ACTIVE_AV, activeAvatar || 'free'); }
function loadActiveAvatar(){ activeAvatar = localStorage.getItem(KEY_ACTIVE_AV) || 'free'; if(!activeAvatar) activeAvatar = 'free'; }

/* unlocking levels per subject */
function getUnlocked(){ try{ return JSON.parse(localStorage.getItem(KEY_UNLOCK) || '{}'); }catch(e){ return {}; } }
function setUnlocked(subject, level){ const u = getUnlocked(); u[subject] = Math.max(u[subject]||1, level); localStorage.setItem(KEY_UNLOCK, JSON.stringify(u)); }
function isUnlocked(subject, level){ const u = getUnlocked(); return (u[subject] || 1) >= level; }
function setUnlockedDefaults(){ const u = getUnlocked(); ['mat','sci','hist','chem'].forEach(k=>{ if(!u[k]) setUnlocked(k,1); }); }

/* shuffle */
function shuffle(a){ const b = a.slice(); for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; } return b; }

/* human time */
function fmtTime(sec){ const m=Math.floor(sec/60).toString().padStart(2,'0'); const s=(sec%60).toString().padStart(2,'0'); return `${m}:${s}`; }

/* ---------- BANK GENERATION (simple & varied) ---------- */
function genMath(n, level){
  const out=[];
  for(let i=0;i<n;i++){
    const a = Math.floor(Math.random()*20)+1;
    const b = Math.floor(Math.random()*(level*5))+1;
    const t = Math.random();
    let q, correct;
    if(t < 0.45){ q = `${a} + ${b} = ?`; correct = a + b; }
    else if(t < 0.8){ q = `${a*b} ÷ ${a} = ?`; correct = b; }
    else { q = `${a} × ${b} = ?`; correct = a*b; }
    const opts = numericOptions(correct);
    out.push({ q, a: opts, correct: opts.indexOf(String(correct)) });
  }
  return out;
}
function numericOptions(correct){
  const s = new Set([correct]);
  while(s.size < 4){
    const d = Math.floor(Math.random()*8)+1;
    const sign = Math.random()<0.5? -1:1;
    s.add(correct + sign*d);
  }
  const arr = shuffle(Array.from(s).map(x=>String(x)));
  return arr;
}
function sample(pool, n){ const out=[]; for(let i=0;i<n;i++) out.push(pool[i % pool.length]); return out; }

function buildBanks(){
  bank = {
    mat: {1: genMath(STOCK_L1,1), 2: genMath(STOCK_L2,2), 3: genMath(STOCK_L3,3)},
    sci: {1: sample([
          {q:"Air terdiri dari senyawa?", a:["H2O","CO2","O2","N2"], correct:0},
          {q:"Fotosintesis terjadi di?", a:["Daun","Akar","Batang","Bunga"], correct:0},
          {q:"Contoh metamorfosis sempurna:", a:["Kupu-kupu","Kadal","Ikan","Kucing"], correct:0},
          {q:"Planet merah adalah:", a:["Mars","Venus","Jupiter","Bumi"], correct:0},
          {q:"Suhu leleh es (°C):", a:["0","100","-1","32"], correct:0}
        ], STOCK_L1),
        2: sample([
          {q:"pH < 7 menunjukkan larutan?", a:["Basa","Asam","Netral","Padat"], correct:1},
          {q:"Gas untuk fotosintesis:", a:["CO2","O2","N2","He"], correct:0},
          {q:"Sistem pencernaan dimulai di:", a:["Mulut","Lambung","Usus","Kerongkongan"], correct:0},
          {q:"Contoh konduktor:", a:["Logam","Karet","Kain","Kayu"], correct:0},
          {q:"Satuan massa umumnya:", a:["Gram","Meter","Liter","Watt"], correct:0}
        ], STOCK_L2),
        3: sample([
          {q:"Hukum Newton pertama bicara tentang?", a:["Inersia","Energi","Momentum","Gaya"], correct:0},
          {q:"Struktur DNA berbentuk?", a:["Double helix","Lingkaran","Garis","Kubus"], correct:0},
          {q:"Satuan tekanan SI adalah?", a:["Pascal","Joule","Watt","Meter"], correct:0},
          {q:"Ion negatif disebut?", a:["Anion","Kation","Proton","Neutron"], correct:0},
          {q:"Energi kinetik berkaitan dengan?", a:["Gerak","Suhu","Warna","Massa"], correct:0}
        ], STOCK_L3)
    },
    hist: {1: sample([
          {q:"Proklamasi RI dibacakan tahun?", a:["1945","1944","1946","1947"], correct:0},
          {q:"Presiden pertama RI adalah?", a:["Soekarno","Hatta","Soeharto","Sudirman"], correct:0},
          {q:"Hari Pahlawan tanggal?", a:["10 Nov","17 Aug","1 May","20 Mei"], correct:0},
          {q:"Sumpah Pemuda terjadi tahun?", a:["1928","1929","1930","1927"], correct:0},
          {q:"RA Kartini memperjuangkan?", a:["Pendidikan wanita","Ekonomi","Militer","Teknologi"], correct:0}
        ], STOCK_L1),
        2: sample([
          {q:"Konferensi Meja Bundar tahun?", a:["1949","1950","1948","1951"], correct:0},
          {q:"Perang Diponegoro di pulau?", a:["Jawa","Sumatra","Bali","Sulawesi"], correct:0},
          {q:"Peristiwa G30S pada tahun?", a:["1965","1966","1964","1970"], correct:0},
          {q:"Tokoh pahlawan Aceh?", a:["Cut Nyak Dien","Kartini","Dewi Sartika","Martha"], correct:0},
          {q:"VOC kependekan dari?", a:["Vereenigde Oostindische Compagnie","Very Old","Vocab","V Company"], correct:0}
        ], STOCK_L2),
        3: sample([
          {q:"Konferensi Asia Afrika tahun?", a:["1955","1960","1949","1952"], correct:0},
          {q:"Perjanjian KMB dilaksanakan di?", a:["Den Haag","Jakarta","London","New York"], correct:0},
          {q:"Pemimpin perang Diponegoro?", a:["Diponegoro","Sudirman","Sultan Agung","Pangeran Antasari"], correct:0},
          {q:"Trisakti diperkenalkan oleh?", a:["Megawati","Soeharto","Soekarno","Habibie"], correct:0},
          {q:"Hari Kebangkitan Nasional tanggal?", a:["20 Mei","17 Aug","10 Nov","1 May"], correct:0}
        ], STOCK_L3)
    },
    chem: {1: sample([
          {q:"Air adalah senyawa dari?", a:["H2O","CO2","O2","N2"], correct:0},
          {q:"pH netral = ?", a:["7","0","14","1"], correct:0},
          {q:"NaCl adalah?", a:["Garam","Gula","Asam","Basa"], correct:0},
          {q:"Reaksi pembakaran butuh?", a:["O2","CO2","N2","H2"], correct:0},
          {q:"Mol adalah satuan untuk?", a:["Jumlah zat","Massa","Volume","Luas"], correct:0}
        ], STOCK_L1),
        2: sample([
          {q:"Ion positif disebut?", a:["Kation","Anion","Elektron","Neutron"], correct:0},
          {q:"Molaritas mengukur?", a:["mol/L","g/L","massa","vol"], correct:0},
          {q:"Reaksi eksotermik ...", a:["melepaskan energi","menyerap energi","mencair","membeku"], correct:0},
          {q:"Ikatan kovalen pada?", a:["nonlogam","logam","gas","garam"], correct:0},
          {q:"Asam kuat contoh:", a:["HCl","NaCl","KCl","NaOH"], correct:0}
        ], STOCK_L2),
        3: sample([
          {q:"Massa atom relatif C kira-kira?", a:["12","14","16","11"], correct:0},
          {q:"Model Bohr memperkenalkan?", a:["orbit elektron","proton","neutron","molekul"], correct:0},
          {q:"Stoikiometri menghitung rasio?", a:["mol reaktan","volume","waktu","suhu"], correct:0},
          {q:"Avogadro kira-kira?", a:["6.022e23","6.022e20","6.022e22","6.022e21"], correct:0},
          {q:"Pembakaran menghasilkan?", a:["CO2 & H2O","O2","N2","H2"], correct:0}
        ], STOCK_L3)
    }
  };
}

/* ---------- UI Renderers ---------- */
function renderWallet(){ if($('wallet')) $('wallet').textContent = wallet; if($('walletNow')) $('walletNow').textContent = wallet; }

function renderAvatarsUI(){
  const container = $('avatarList');
  if(!container) return;
  container.innerHTML = '';
  loadOwned();
  loadActiveAvatar();
  AVATARS.forEach(av=>{
    const el = document.createElement('div');
    el.className = av.css + ( (activeAvatar===av.id) ? ' selected' : '' );
    el.title = av.desc + (av.price ? ` — ${av.price} poin` : ' — Gratis');
    el.dataset.id = av.id;
    // don't add text if label empty (free avatar requested no text)
    if(av.label) el.textContent = av.label;
    el.onclick = ()=> {
      loadOwned();
      if(ownedAvatars.includes(av.id) || av.price===0){
        activeAvatar = av.id; saveActiveAvatar(); renderAvatarsUI(); renderPlayerAvatar();
      } else {
        if(!confirm(`${av.desc} belum dibeli. Beli sekarang dengan ${av.price} poin?`)) return;
        if(wallet < av.price){ alert('Point tidak cukup untuk membeli avatar.'); return; }
        wallet -= av.price; saveWallet();
        loadOwned(); ownedAvatars.push(av.id); saveOwned();
        activeAvatar = av.id; saveActiveAvatar();
        renderAvatarsUI(); renderPlayerAvatar();
        alert('Pembelian berhasil.');
      }
    };
    container.appendChild(el);
  });
}

function renderPlayerAvatar(){
  loadActiveAvatar();
  const el = $('playerAvatar');
  if(!el) return;
  const av = AVATARS.find(a=>a.id===activeAvatar) || AVATARS[0];
  // set css class & text; if label empty, keep it blank (user wanted no "FREE" text)
  el.className = 'avatar avatar-lg ' + av.css.split(' ').slice(-1)[0];
  el.textContent = av.label || '';
}

/* ---------- Shop UI ---------- */
function renderShop(){
  const grid = $('shopGrid');
  if(!grid) return;
  grid.innerHTML = '';
  loadOwned();
  AVATARS.forEach(av=>{
    if(av.id==='free') return; // free not sold
    const card = document.createElement('div'); card.className = 'shop-item';
    card.innerHTML = `<div style="font-weight:800">${av.desc}</div><div style="font-size:13px">${av.price} poin</div>`;
    const wrap = document.createElement('div'); wrap.style.marginTop='8px';
    if(ownedAvatars.includes(av.id)){
      const btnUse = document.createElement('button'); btnUse.className='btn small'; btnUse.textContent = (activeAvatar===av.id) ? 'Aktif' : 'Pilih';
      btnUse.onclick = ()=>{ activeAvatar = av.id; saveActiveAvatar(); renderShop(); renderAvatarsUI(); renderPlayerAvatar(); };
      wrap.appendChild(btnUse);
      const btnUne = document.createElement('button'); btnUne.className='btn small'; btnUne.style.marginLeft='8px'; btnUne.textContent='Lepas';
      btnUne.onclick = ()=>{ if(confirm('Lepas avatar ini?')){ ownedAvatars = ownedAvatars.filter(x=>x!==av.id); saveOwned(); if(activeAvatar===av.id){ activeAvatar='free'; saveActiveAvatar(); } renderShop(); renderAvatarsUI(); renderPlayerAvatar(); } };
      wrap.appendChild(btnUne);
    } else {
      const btnBuy = document.createElement('button'); btnBuy.className='btn small'; btnBuy.textContent='Beli';
      btnBuy.onclick = ()=> {
        if(!confirm(`Beli ${av.desc} dengan ${av.price} poin?`)) return;
        if(wallet < av.price){ alert('Point tidak cukup'); return; }
        wallet -= av.price; saveWallet();
        loadOwned(); ownedAvatars.push(av.id); saveOwned();
        activeAvatar = av.id; saveActiveAvatar();
        renderShop(); renderAvatarsUI(); renderPlayerAvatar();
        alert('Berhasil membeli avatar.');
      };
      wrap.appendChild(btnBuy);
    }
    card.appendChild(wrap); grid.appendChild(card);
  });
}

/* ---------- History UI ---------- */
function renderHistory(){
  const list = $('historyList');
  if(!list) return;
  list.innerHTML = '';
  const h = getHistory();
  if(!h || h.length === 0){ list.textContent = 'Belum ada riwayat.'; return; }
  h.slice(0,200).forEach(entry=>{
    const div = document.createElement('div'); div.style.padding='8px'; div.style.borderBottom='1px solid rgba(0,0,0,0.06)';
    div.innerHTML = `<div style="font-weight:700">${entry.subject.toUpperCase()} — L${entry.level}</div><div style="font-size:13px">${new Date(entry.date).toLocaleString()} — ${entry.points} poin</div>`;
    list.appendChild(div);
  });
}

/* ---------- Prepare question set per user choice ---------- */
function chooseQuestions(){
  const subjKey = selectedSubject;
  const lvl = selectedLevel; // 1/2/3
  const pool = bank[subjKey][lvl] || [];
  const need = (lvl===3) ? SHOW_L3 : (lvl===2 ? SHOW_L2 : SHOW_L1);
  questions = shuffle(pool).slice(0, need);
  answers = new Array(questions.length).fill(null);
  currentIndex = 0;
}

/* ---------- Render current question (no numbering) ---------- */
function renderQuestion(){
  const qText = $('qText');
  const opts = $('options');
  if(!questions || questions.length===0){ qText.textContent = 'Soal tidak tersedia'; opts.innerHTML=''; return; }
  const q = questions[currentIndex];
  qText.textContent = q.q; // no numbering
  opts.innerHTML = '';
  q.a.forEach((t, idx)=>{
    const li = document.createElement('li');
    const btn = document.createElement('div'); btn.className='answer-btn';
    btn.textContent = t;
    if(answers[currentIndex] === idx) btn.classList.add('selected');
    btn.onclick = ()=>{ answers[currentIndex] = idx; renderQuestion(); };
    li.appendChild(btn); opts.appendChild(li);
  });
  // prev/next UI
  const prev = $('btnPrev'); const next = $('btnNext');
  prev.style.visibility = (currentIndex === 0) ? 'hidden' : 'visible';
  next.textContent = (currentIndex === questions.length - 1) ? 'Selesai' : 'Next';
  // update progress bar
  const fill = document.querySelector('.progress .fill');
  if(fill) fill.style.width = Math.round((currentIndex / Math.max(1, questions.length)) * 100) + '%';
}

/* ---------- Navigation inside quiz ---------- */
function prevQuestion(){ if(currentIndex>0){ currentIndex--; renderQuestion(); } }
function nextQuestion(){ if(currentIndex < questions.length - 1){ currentIndex++; renderQuestion(); } else finishQuiz(); }

/* ---------- Timer ---------- */
function startTimer(){
  stopTimer();
  timer = (selectedLevel===3) ? TIMER_L3 : TIMER_L1_2;
  updateTimerUI();
  timerId = setInterval(()=>{ timer--; updateTimerUI(); if(timer<=0){ stopTimer(); finishQuiz(); } }, 1000);
}
function stopTimer(){ if(timerId){ clearInterval(timerId); timerId = null; } }
function updateTimerUI(){ const el = $('quizTimer'); if(el) el.textContent = fmtTime(timer); }

/* ---------- Finish & scoring ---------- */
function finishQuiz(){
  stopTimer();
  let correctCount = 0;
  for(let i=0;i<questions.length;i++){
    if(answers[i] !== null && answers[i] === questions[i].correct) correctCount++;
  }
  const points = correctCount * POINTS_PER_CORRECT;
  wallet += points; saveWallet();
  pushHistory({ date: new Date().toISOString(), subject: selectedSubject, level: selectedLevel, points });
  // unlock next level if meets condition
  if(points >= UNLOCK_POINTS && selectedLevel < 3){
    setUnlocked(selectedSubject, selectedLevel + 1);
  }
  // render result area
  $('earnedPoints').textContent = points;
  $('walletNow').textContent = wallet;
  const rl = $('resultList'); rl.innerHTML = '';
  questions.forEach((q,i)=>{
    const d = document.createElement('div'); d.className='result-item';
    const user = (answers[i] === null) ? '<em>Belum dijawab</em>' : q.a[answers[i]];
    const corr = q.a[q.correct];
    d.innerHTML = `<div style="font-weight:700">${q.q}</div><div style="font-size:13px;margin-top:6px">Jawaban kamu: ${user} • Jawaban benar: <strong>${corr}</strong></div>`;
    rl.appendChild(d);
  });
  // show lanjut button if meets criteria and level<3
  const btnNextLvl = $('btnContinueNextLevel');
  if(points >= UNLOCK_POINTS && selectedLevel < 3){
    btnNextLvl.style.display = 'inline-block';
    btnNextLvl.onclick = ()=> {
      selectedLevel = selectedLevel + 1;
      startQuiz();
    };
  } else {
    btnNextLvl.style.display = 'none';
  }

  // ensure "Lihat Jawaban" button exists and toggles list visibility
  ensureViewDetailsButton();

  renderLevelLockUI();
  showPanel('resultPage');
}

/* create or ensure the "Lihat Jawaban" toggle button in result actions */
function ensureViewDetailsButton(){
  const actions = $('resultActions');
  if(!actions) return;
  if(!$('btnViewDetails')){
    const btn = document.createElement('button');
    btn.id = 'btnViewDetails';
    btn.className = 'btn ghost';
    btn.textContent = 'Lihat Jawaban';
    btn.style.marginRight = '8px';
    btn.onclick = ()=> {
      const rl = $('resultList');
      if(!rl) return;
      if(rl.style.display === 'none' || rl.style.display === ''){ rl.style.display = 'block'; btn.textContent = 'Sembunyikan Jawaban'; }
      else { rl.style.display = 'none'; btn.textContent = 'Lihat Jawaban'; }
    };
    // insert as first child (before other result buttons)
    actions.insertBefore(btn, actions.firstChild);
    // default hide details until user clicks (keeps result compact)
    $('resultList').style.display = 'none';
  } else {
    // ensure default state
    const btn = $('btnViewDetails');
    if(btn) { btn.textContent = 'Lihat Jawaban'; const rl = $('resultList'); if(rl) rl.style.display = 'none'; }
  }
}

/* ---------- UI helper show panel with theme ---------- */
function showPanel(id){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  const el = $(id);
  if(!el) return;
  el.classList.add('active');
  // hide home history if not home
  if(id !== 'homePage'){ if($('homeHistoryPanel')) $('homeHistoryPanel').hidden = true; $('btnStart') && ($('btnStart').style.display='inline-block'); $('btnShop') && ($('btnShop').style.display='inline-block'); $('btnHistory') && ($('btnHistory').style.display='inline-block'); }
}

/* show quiz and set theme based on subject */
function showPanelForQuiz(){
  const quizPanel = $('quizPage');
  quizPanel.classList.remove('mat','sci','hist','chem');
  if(selectedSubject === 'mat') quizPanel.classList.add('mat');
  if(selectedSubject === 'sci') quizPanel.classList.add('sci');
  if(selectedSubject === 'hist') quizPanel.classList.add('hist');
  if(selectedSubject === 'chem') quizPanel.classList.add('chem');
  showPanel('quizPage');
}

/* ---------- level unlock UI ---------- */
function renderLevelLockUI(){
  const l2 = $('btnL2'), l3 = $('btnL3');
  if(!l2 || !l3) return;
  if(isUnlocked(selectedSubject,2)){ l2.classList.remove('locked'); l2.onclick = ()=> startLevelFromPage(2); } else { l2.classList.add('locked'); l2.onclick = ()=> alert('Level 2 terkunci. Dapatkan minimal 165 poin di level sebelumnya.'); }
  if(isUnlocked(selectedSubject,3)){ l3.classList.remove('locked'); l3.onclick = ()=> startLevelFromPage(3); } else { l3.classList.add('locked'); l3.onclick = ()=> alert('Level 3 terkunci. Dapatkan minimal 165 poin di level sebelumnya.'); }
}

/* ---------- Start level / Start quiz ---------- */
function startLevelFromPage(lv){
  if(!selectedSubject){ alert('Pilih mata pelajaran dulu.'); return; }
  if((lv===2 || lv===3) && !isUnlocked(selectedSubject, lv)){ alert('Level ' + lv + ' terkunci. Butuh minimal ' + UNLOCK_POINTS + ' poin di quiz sebelumnya.'); return; }
  selectedLevel = lv;
  startQuiz();
}

function startQuiz(){
  // choose pool and slice
  const pool = (bank[selectedSubject] && bank[selectedSubject][selectedLevel]) ? bank[selectedSubject][selectedLevel] : [];
  const need = (selectedLevel===3) ? SHOW_L3 : (selectedLevel===2 ? SHOW_L2 : SHOW_L1);
  questions = shuffle(pool).slice(0, need);
  answers = new Array(questions.length).fill(null);
  currentIndex = 0;
  timer = (selectedLevel===3) ? TIMER_L3 : TIMER_L1_2;
  renderPlayerAvatar();
  renderPlayerHeader();
  renderQuestion();
  startTimer();
  // set quiz theme class on quiz page
  const qp = $('quizPage');
  qp.classList.remove('mat','sci','hist','chem');
  if(selectedSubject==='mat') qp.classList.add('mat');
  if(selectedSubject==='sci') qp.classList.add('sci');
  if(selectedSubject==='hist') qp.classList.add('hist');
  if(selectedSubject==='chem') qp.classList.add('chem');
  showPanel('quizPage');
}

/* ---------- Player header ---------- */
function renderPlayerHeader(){
  const nameEl = $('playerNameLabel'); if(nameEl) nameEl.textContent = playerName || 'Player';
}

/* ---------- Show/hide history from home ---------- */
function openHistoryFromHome(){
  $('btnStart').style.display = 'none';
  $('btnShop').style.display = 'none';
  $('btnHistory').style.display = 'none';
  if($('homeHistoryPanel')) $('homeHistoryPanel').hidden = false;
  renderHistory();
}
function closeHomeHistory(){
  if($('homeHistoryPanel')) $('homeHistoryPanel').hidden = true;
  $('btnStart').style.display = 'inline-block';
  $('btnShop').style.display = 'inline-block';
  $('btnHistory').style.display = 'inline-block';
}

/* ---------- Reset data ---------- */
function resetAllData(){
  if(!confirm('Reset data: Wallet, Riwayat, Owned avatars, Unlocked levels?')) return;
  localStorage.removeItem(KEY_WALLET);
  localStorage.removeItem(KEY_HISTORY);
  localStorage.removeItem(KEY_OWNED);
  localStorage.removeItem(KEY_ACTIVE_AV);
  localStorage.removeItem(KEY_UNLOCK);
  wallet = 0; saveWallet(); loadOwned(); loadActiveAvatar(); setUnlockedDefaults();
  renderAvatarsUI(); renderShop(); renderHistory();
  alert('Reset selesai.');
}

/* ---------- Bind UI ---------- */
function bindUI(){
  // Home
  if($('btnStart')) $('btnStart').onclick = ()=> { showPanel('namePage'); };
  if($('btnShop')) $('btnShop').onclick = ()=> { renderShop(); showPanel('shopPage'); };
  if($('btnHistory')) $('btnHistory').onclick = ()=> { openHistoryFromHome(); };

  // Name page
  if($('btnToSubjects')) $('btnToSubjects').onclick = ()=> {
    const v = $('inputName').value.trim();
    if(!v){ alert('Isi nama dulu!'); return; }
    playerName = v;
    loadActiveAvatar();
    showPanel('subjectPage');
    renderPlayerHeader();
  };
  if($('btnNameBack')) $('btnNameBack').onclick = ()=> showPanel('homePage');

  // Subject page
  document.querySelectorAll('.subject-btn').forEach(b=> b.onclick = function(){
    const sub = this.dataset.sub;
    selectedSubject = sub;
    setUnlockedDefaults();
    renderLevelLockUI();
    // update subject label
    $('subjectTitle') && ($('subjectTitle').textContent = 'Level — ' + (sub==='mat'?'Matematika': sub==='sci'?'IPA': sub==='hist'?'Sejarah':'Kimia'));
    showPanel('levelPage');
  });

  // Level page buttons (L1 explicit; L2/L3 handled by renderLevelLockUI)
  if($('btnL1')) $('btnL1').onclick = ()=> startLevelFromPage(1);
  if($('btnLevelBack')) $('btnLevelBack').onclick = ()=> showPanel('subjectPage');

  // Quiz navigation
  if($('btnPrev')) $('btnPrev').onclick = prevQuestion;
  if($('btnNext')) $('btnNext').onclick = nextQuestion;

  // Result actions
  if($('btnResultRetry')) $('btnResultRetry').onclick = ()=> { $('inputName').value=''; showPanel('namePage'); };
  if($('btnResultHome')) $('btnResultHome').onclick = ()=> showPanel('homePage');

  // Shop close
  if($('btnCloseShop')) $('btnCloseShop').onclick = ()=> { showPanel('homePage'); };

  // History controls
  if($('btnResetData')) $('btnResetData').onclick = resetAllData;
  if($('btnCloseHistory')) $('btnCloseHistory').onclick = closeHomeHistory;
}

/* ---------- Init ---------- */
function init(){
  loadWallet();
  loadOwned();
  loadActiveAvatar();
  buildBanks();
  setUnlockedDefaults();
  bindUI();
  renderAvatarsUI();
  renderPlayerAvatar();
  renderShop();
  renderWallet();
  renderLevelLockUI();
}

/* ---------- Start-up ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  init();

  // ensure home history toggle works from initial bindings
  if($('btnHistory')) $('btnHistory').onclick = ()=> { $('btnStart').style.display='none'; $('btnShop').style.display='none'; $('btnHistory').style.display='none'; if($('homeHistoryPanel')) $('homeHistoryPanel').hidden=false; renderHistory(); };

  // ensure result view button (if user lands on result page directly)
  ensureViewDetailsButton();
});

/* ---------- Helper: wallet & owned ---------- */
function renderWallet(){ if($('wallet')) $('wallet').textContent = wallet; if($('walletNow')) $('walletNow').textContent = wallet; }
function saveWallet(){ localStorage.setItem(KEY_WALLET, String(wallet)); renderWallet(); }

/* ---------- Expose small helpers (for code clarity) ---------- */
function loadActiveAvatar(){ activeAvatar = localStorage.getItem(KEY_ACTIVE_AV) || 'free'; if(!activeAvatar) activeAvatar='free'; }
function saveActiveAvatar(){ localStorage.setItem(KEY_ACTIVE_AV, activeAvatar || 'free'); }

