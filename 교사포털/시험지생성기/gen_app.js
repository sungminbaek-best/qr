/* 저절로 시험지 생성기 — 시험지·연습지 / 빙고 / 워드서치 / 십자말풀이 / 단어 카드 / 숙제 안내지
   데이터: gen_data.js (window.GEN_BOOKS, build_추가시리즈.py 로 생성)
   QR: qrcode-generator(cdnjs) — 없으면 주소 글자로 대신 표시 */

/* ===== 설정 ===== */
const AUTH = "https://solveu-auth.tjdals85200.workers.dev";   // 선생님 인증 서버(_QR제작/teacher-auth)
const PASS_KEY = "solveu_pass";                                // 사이트 공통 입장권(site.js 와 같은 키)
const SAVE_KEY = "solveu_gen_v2";                              // 이 기기에 기억하는 설정
const STUDIO = "https://solveu.co.kr/studio/";                 // 음원·강의(유닛별 ?book=&u=)
const STUDIO_UNITS = {ph2:7};                                  // 스튜디오에 유닛이 더 적은 책
const EASY_BOOKS = new Set(["phonics1","phonics2","starter1","starter2","bridge1","bridge2"]); // 시험지에도 단어 상자 기본

// [id, 이름, 기본 문항수]
const TYPES_R = [
  ["w_e2k","영단어 → 뜻 쓰기",15], ["w_k2e","뜻 → 영단어 쓰기",15],
  ["w_e2k_mc","영단어 뜻 고르기(객관식)",0], ["w_k2e_mc","뜻 보고 영단어 고르기(객관식)",0],
  ["w_scr","철자 순서 맞추기",0],
  ["s_cloze","문장 빈칸 채우기",0], ["s_listen","듣고 빈칸 받아쓰기",0],
  ["s_e2k","문장 해석 쓰기(영→한)",0], ["s_k2e","문장 영작(한→영)",0],
  ["s_order","문장 배열하기",0], ["s_slash","끊어읽기 표시하기( / )",0], ["s_chunkk","덩어리별 해석 쓰기",0],
  ["s_dict","문장 받아쓰기(빈 줄)",0],
];
const TYPES_P = [
  ["p_read","단어 읽고 한글소리 쓰기",15], ["p_blank","빠진 소리 쓰기 (b _ t)",10], ["p_blank_mc","빠진 소리 고르기(객관식)",0],
  ["p_spell","한글소리 보고 단어 쓰기",0], ["w_scr","철자 순서 맞추기",0],
  ["p_odd","소리가 다른 하나 고르기",0], ["p_sort","소리별로 나누기",0],
  ["p_dict","불러주는 단어 받아쓰기",0], ["s_listen","문장 듣고 빈칸 쓰기",0],
  ["p_oral_w","단어 소리 내어 읽기(체크표)",0], ["p_oral_s","문장 소리 내어 읽기(체크표)",0],
];
const TNAME = Object.fromEntries(TYPES_R.concat(TYPES_P).map(t=>[t[0],t[1]]));
const SENT_TYPES = new Set(["s_cloze","s_listen","s_e2k","s_k2e","s_order","s_slash","s_chunkk","s_dict","p_oral_s"]);
const LISTEN_TYPES = new Set(["s_listen","s_dict","p_dict"]);
const WIDE_KINDS = new Set(["write","gap","gapmc","scr"]);   // 2열로 놓는 문항
const STOP = new Set("the a an and or but is am are was were be been to of in on at by for with from up as it its he she we you they i me my your his her our their them him us this that these those there here not no do does did have has had will can so if than then very too what who when where how why yes".split(" "));

let CUR = null;          // 지금 미리보기 내용
let RESEED = 0;
let TAB = "S";

/* ===== 게이트 ===== */
function getPass(){ try{ return localStorage.getItem(PASS_KEY)||""; }catch(e){ return ""; } }
function boot(){
  try{ localStorage.removeItem("jeol_teacher_ok"); }catch(e){}   // 옛 교사 코드(2026-09-30 폐지)
  const p=getPass();
  if(!p){ show("gate"); return; }
  openApp();   // 입장권이 있으면 바로 열고, 서버 확인에서 무효면 다시 잠금
  fetch(AUTH+"/api/me",{headers:{Authorization:"Bearer "+p}}).then(r=>{
    if(r.status===401){ try{localStorage.removeItem(PASS_KEY)}catch(e){}; show("gate"); }
  }).catch(()=>{});
}
function show(id){ ["gate","app"].forEach(v=>$(v).classList.toggle("hidden", v!==id)); }
let OPENED=false;
function openApp(){ show("app"); if(!OPENED){ OPENED=true; initControls(); } }

/* ===== 작은 도구 ===== */
function $(id){ return document.getElementById(id); }
function esc(s){ return (s==null?"":String(s)).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function shuffle(arr,rnd){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function seedFrom(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function uniq(a){ return [...new Set(a)]; }
function val(id){ return $(id).value; }
function chk(id){ return $(id).checked; }
function num(id,lo,hi,d){ const v=parseInt($(id).value); return isNaN(v)?d:Math.min(hi,Math.max(lo,v)); }
function meaning(w){ return w.k || w.s || ""; }              // 리딩=뜻, 파닉스=한글소리
function pureWord(w){ return /^[A-Za-z]+$/.test(w.e) && !w.alpha; }

/* ===== 파닉스 사전(같은 소리 단어 검사) ===== */
const LEXS=new Map();
GEN_BOOKS.filter(b=>b.kind==="phonics").forEach(b=>b.units.forEach(u=>u.words.forEach(w=>{ if(!w.alpha) LEXS.set(w.e.toLowerCase(), w.s); })));
function sameSound(word, snd){ return !!word && LEXS.get(word.toLowerCase())===snd; }
function elOf(w){ return w.ba ? w.ba.replace(/ _ /g,"-") : ""; }
// 빈칸 단어에 소리요소를 채운 단어. 매직e(a-e)는 두 칸에 모음·e, 그 밖에는 이어진 빈칸 한 덩어리(길이가 같아야 함)
function fillGap(gw, el){
  if(el.includes("-")){ if((gw.match(/_/g)||[]).length!==2) return null; let k=0; return gw.replace(/_/g,()=>k++?"e":el[0]); }
  const m=gw.match(/_+/); if(!m || m[0].length!==el.length || (gw.match(/_+/g)||[]).length!==1) return null;
  return gw.replace(/_+/, el);
}
function hasEl(word, el){
  word=word.toLowerCase();
  if(el.includes("-")) return new RegExp(el[0]+"[^aeiou]+e$").test(word);
  return word.includes(el);
}

/* ===== 문장 도구 ===== */
// "give (gave)" → ["give","gave"], "go (went) away" → ["go away","went away"], "can ~?" → ["can"]
function wordForms(e){
  const t=e.replace(/[~?!.,]/g," ").replace(/\s+/g," ").trim();
  const m=t.match(/^(.*?)(\S+)\s*\(([^)]+)\)(.*)$/);
  if(m) return uniq([ (m[1]+m[2]+m[4]).trim(), (m[1]+m[3]+m[4]).trim() ]).filter(Boolean);
  return t ? [t] : [];
}
function inflections(w){
  const v=new Set([w,w+"s",w+"es",w+"d",w+"ed",w+"ing",w+"er",w+"est"]);
  if(/e$/.test(w)) v.add(w.slice(0,-1)+"ing");
  if(/[^aeiou]y$/.test(w)){ v.add(w.slice(0,-1)+"ies"); v.add(w.slice(0,-1)+"ied"); }
  if(/[^aeiou][aeiou][^aeiouwxy]$/.test(w)){ const c=w.slice(-1); v.add(w+c+"ed"); v.add(w+c+"ing"); }
  return v;
}
function tokens(sent){ return [...sent.matchAll(/[A-Za-z][A-Za-z'’]*/g)].map(m=>({t:m[0], s:m.index, e:m.index+m[0].length})); }
// 문장 안에서 단어(구)를 찾아 위치 반환
function findPhrase(sent, phrase){
  const toks=tokens(sent), parts=phrase.toLowerCase().split(/\s+/);
  if(!parts[0]) return null;
  for(let i=0;i+parts.length<=toks.length;i++){
    let ok=true;
    for(let j=0;j<parts.length-1;j++) if(toks[i+j].t.toLowerCase()!==parts[j]){ ok=false; break; }
    if(!ok) continue;
    const last=toks[i+parts.length-1];
    if(inflections(parts[parts.length-1]).has(last.t.toLowerCase())) return {s:toks[i].s, e:last.e, ans:sent.slice(toks[i].s,last.e)};
  }
  return null;
}
// 문장 빈칸: 같은 유닛 단어가 문장에 있으면 그 자리(긴 단어 우선, 2글자 이하 단어는 제외)
function clozeOf(s){
  if(s._cz!==undefined) return s._cz;
  let best=null;
  (s._uw||[]).forEach(w=>wordForms(w.e).forEach(f=>{
    if(f.replace(/\s/g,"").length<3) return;
    const r=findPhrase(s.e, f);
    if(r && (!best || r.ans.length>best.ans.length)) best={...r, base:w};
  }));
  return s._cz=best;
}
// 듣고 빈칸: 유닛 단어 자리 + 내용어(긴 것부터) 2~3개
function listenBlanks(s, isPh){
  if(s._lb) return s._lb;
  const toks=tokens(s.e).filter(t=>t.t.length>=3 && !STOP.has(t.t.toLowerCase()));
  const n=tokens(s.e).length;
  const K = n<=4 ? 1 : (isPh || n<=7) ? 2 : 3;          // 짧은 문장은 빈칸 하나
  const picked=[];
  const cz=isPh?null:clozeOf(s);
  if(cz) picked.push(cz);
  const cands = toks.filter(t=>!picked.some(p=>t.s<p.e && t.e>p.s))
    .map(t=>({...t, pri:(isPh&&LEXS.has(t.t.toLowerCase())?100:0)+t.t.length}))
    .sort((a,b)=>b.pri-a.pri || a.s-b.s);
  for(const t of cands){ if(picked.length>=K) break; picked.push({s:t.s,e:t.e,ans:t.t}); }
  return s._lb = picked.sort((a,b)=>a.s-b.s);
}
function orderChunks(s){
  if(s.c && s.c.length>=3) return s.c;
  const ws=s.e.replace(/[.?!]+$/,"").split(/\s+/);
  return ws.length>=3 && ws.length<=8 ? ws : null;
}
// 문장 가운데에 대문자로 나오는 낱말 = 고유명사(배열 문제에서 첫 글자를 소문자로 바꾸지 않음)
function properNouns(b){
  if(b._pn) return b._pn;
  const set=new Set(["I"]);
  b.units.forEach(u=>u.sents.forEach(s=>s.e.split(/\s+/).slice(1).forEach(w=>{
    const x=w.replace(/[^A-Za-z']/g,""); if(/^[A-Z]/.test(x)) set.add(x);
  })));
  return b._pn=set;
}

/* ===== 유형별 대상 판정 ===== */
function eligible(type, it, isPh){
  switch(type){
    case "w_e2k": case "w_k2e": case "w_e2k_mc": case "w_k2e_mc": return !it.alpha && !!it.k;
    case "w_scr": return pureWord(it) && it.e.length>=3 && it.e.length<=10;
    case "p_read": case "p_oral_w": return true;
    case "p_dict": return !it.alpha;
    case "p_blank": case "p_blank_mc": case "p_odd": return !!it.b;
    case "p_spell": return !it.alpha;
    case "s_cloze": return !!clozeOf(it);
    case "s_listen": return listenBlanks(it, isPh).length>0;
    case "s_order": return !!orderChunks(it);
    case "s_slash": return !!(it.c && it.c.length>=3);
    case "s_chunkk": return !!it.ck;
    case "p_oral_s": case "s_e2k": case "s_k2e": case "s_dict": return true;
    case "p_sort": return !!it.b;
  }
  return true;
}
function typeSrc(type){ return SENT_TYPES.has(type) ? "s" : "w"; }

/* ===== 컨트롤 ===== */
function initControls(){
  const bsel=$("book");
  const series=uniq(GEN_BOOKS.map(b=>b.series||"저절로 리딩"));
  bsel.innerHTML = series.map(s=>`<optgroup label="${s}">`+
    GEN_BOOKS.filter(b=>(b.series||"저절로 리딩")===s).map(b=>`<option value="${b.code}">${b.name}</option>`).join("")+`</optgroup>`).join("");
  const sv=loadSave();
  if(sv.book && GEN_BOOKS.some(b=>b.code===sv.book)) bsel.value=sv.book;
  /* 주소로 책·유닛 지정(QR 음원 화면의 '선생님이세요?'에서 옴): ?book=ph1&u=3 (음원 코드나 생성기 코드 둘 다) */
  const QS=new URLSearchParams(location.search), qb=QS.get("book"), qu=parseInt(QS.get("u"));
  const qbook=qb && GEN_BOOKS.find(b=>b.code===qb||b.studio===qb);
  if(qbook) bsel.value=qbook.code;
  if(sv.mode) $("mode").value=sv.mode;
  ["acad","review","trapN","paper","nchoice","bingoN","bingoCnt","bingoFace","srN","srWords","srLevel","srClue","crWords","cardStyle","hwTasks","hwMsg"]
    .forEach(k=>{ if(sv[k]!=null && $(k)) $(k).value=sv[k]; });
  onBook(); onMode();
  if(qbook && qu && qbook.units.some(x=>x.u===qu)) document.querySelectorAll("#units input").forEach(i=>{ i.checked=(+i.value===qu); i.closest("label").classList.toggle("on",i.checked); });
}
function loadSave(){ try{ return JSON.parse(localStorage.getItem(SAVE_KEY)||"{}"); }catch(e){ return {}; } }
function saveSettings(){
  const sv=loadSave();
  sv.book=val("book"); sv.mode=val("mode");
  ["acad","review","trapN","paper","nchoice","bingoN","bingoCnt","bingoFace","srN","srWords","srLevel","srClue","crWords","cardStyle","hwTasks","hwMsg"]
    .forEach(k=>{ if($(k)) sv[k]=$(k).value; });
  sv.counts=sv.counts||{};
  const kind=curBook().kind;
  sv.counts[kind]=Object.fromEntries([...document.querySelectorAll("#types .trow")].map(r=>[r.dataset.id, r.querySelector("input[type=checkbox]").checked ? +r.querySelector(".cnt").value||0 : 0]));
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(sv)); }catch(e){}
}
function curBook(){ return GEN_BOOKS.find(b=>b.code===val("book")); }
function isPhonics(){ return curBook().kind==="phonics"; }

let TYPES_KEY="";
function renderTypes(b){
  const isPh=b.kind==="phonics";
  // 책 전체에서 문제가 하나라도 나오는 유형만 보여 줌
  const W=[], S=[];
  b.units.forEach(u=>{ u.words.forEach(w=>W.push({...w,_els:u.els,_elsS:u.elsS})); u.sents.forEach(s=>S.push({...s,_uw:u.words})); });
  const list=(isPh?TYPES_P:TYPES_R).filter(([id])=> (typeSrc(id)==="s"?S:W).some(it=>eligible(id,it,isPh)));
  const key=b.kind+":"+list.map(t=>t[0]).join();
  if(key===TYPES_KEY) return;
  TYPES_KEY=key;
  const saved=(loadSave().counts||{})[b.kind]||{};
  $("types").innerHTML = list.map(([id,nm,def])=>{
    const n = saved[id]!=null ? saved[id] : def;
    return `<div class="trow ${n>0?'on':''}" data-id="${id}">
      <input type="checkbox" ${n>0?'checked':''} onchange="toggleRow(this)">
      <span class="nm" onclick="this.previousElementSibling.click()">${nm}</span>
      <input class="cnt" type="number" min="0" max="99" value="${n>0?n:(def||10)}">
    </div>`; }).join("");
}
function toggleRow(cb){ cb.closest(".trow").classList.toggle("on", cb.checked); }
function onBook(){
  const b=curBook();
  renderTypes(b);
  $("units").innerHTML = b.units.map(u=>`
    <label class="on" ${u.label?`title="${esc(u.label)}"`:""}><input type="checkbox" value="${u.u}" checked onchange="this.closest('label').classList.toggle('on',this.checked)">U${u.u}</label>`).join("");
  $("ulegend").innerHTML = b.units.some(u=>u.label) ? b.units.map(u=>`<div><b>U${u.u}</b> ${esc(u.label||"")}</div>`).join("") : "";
  document.querySelectorAll(".ph-only").forEach(e=>e.classList.toggle("hidden", b.kind!=="phonics"));
  document.querySelectorAll(".rd-only").forEach(e=>e.classList.toggle("hidden", b.kind==="phonics"));
  applyKindDefaults();
}
function onMode(){
  const m=val("mode");
  document.querySelectorAll("[data-for]").forEach(e=>e.classList.toggle("hidden", !e.dataset.for.split(" ").includes(m)));
  const tabs={test:["학생용","정답지"], bingo:["빙고판","부르기 목록"], search:["문제","정답"], cross:["문제","정답"], cards:null, hw:null}[m];
  $("tabSeg").classList.toggle("hidden", !tabs);
  if(tabs){ $("tabS").textContent=tabs[0]; $("tabT").textContent=tabs[1]; }
  $("goBtn").textContent = {test:"시험지 만들기", bingo:"빙고판 만들기", search:"워드서치 만들기", cross:"십자말풀이 만들기", cards:"단어 카드 만들기", hw:"숙제 안내지 만들기"}[m];
  showTab("S", true);
  CUR=null; $("preview").innerHTML=`<div class="paper"><div class="empty">왼쪽에서 설정을 고르고 <b>${$("goBtn").textContent}</b>를 눌러 주세요.</div></div>`;
}
// 연습지/시험지 · 책 수준에 따라 단어 상자·힌트·정답 띠 기본값
function setKind(k){
  document.querySelectorAll("#kindSeg button").forEach(x=>x.classList.toggle("on", x.dataset.v===k));
  applyKindDefaults();
}
function practice(){ return document.querySelector("#kindSeg .on").dataset.v==="practice"; }
function applyKindDefaults(){
  const p=practice();
  $("optBox").checked = p || EASY_BOOKS.has(val("book"));
  $("optHint").checked = p;
  $("optStrip").checked = p;
}
function allUnits(on){ document.querySelectorAll("#units input").forEach(c=>{c.checked=on; c.closest("label").classList.toggle("on",on);}); }
function selectedUnits(){ return [...document.querySelectorAll("#units input:checked")].map(c=>+c.value); }
function selectedTypes(){
  return [...document.querySelectorAll("#types .trow")].filter(r=>r.querySelector("input[type=checkbox]").checked)
    .map(r=>({id:r.dataset.id, n:Math.max(0,+r.querySelector(".cnt").value||0)})).filter(t=>t.n>0);
}
function reseed(){ RESEED++; if(CUR) make(); }
function make(){
  const m=val("mode");
  if(!selectedUnits().length){ alert("유닛을 하나 이상 선택하세요."); return; }
  saveSettings();
  ({test:generate, bingo:makeBingo, search:makeSearch, cross:makeCross, cards:makeCards, hw:makeHW})[m]();
}

/* ===== 데이터 모으기 ===== */
function collect(b, units){
  const uset=new Set(units), W=[], S=[], seen=new Set();
  b.units.filter(u=>uset.has(u.u)).forEach(u=>{
    u.words.forEach(w=>{ const k=w.e.toLowerCase(); if(seen.has(k)) return; seen.add(k);
      W.push({...w,_u:u.u,_els:u.els,_elsS:u.elsS,_unit:u}); });
    u.sents.forEach((s,i)=>S.push({...s,_u:u.u,_i:i,_uw:u.words}));
  });
  return {W,S};
}

/* ===== 시험지 · 연습지 ===== */
function generate(retestRefs){
  const b=curBook(), units=selectedUnits(), isPh=b.kind==="phonics";
  const types=retestRefs ? uniq(retestRefs.map(r=>r.t)).map(id=>({id, n:999})) : selectedTypes();
  if(!types.length){ alert("문제 유형을 하나 이상 고르세요."); return; }
  const variant=val("variant");
  const main=collect(b, units);
  const minU=Math.min(...units);
  const rev=collect(b, b.units.filter(u=>u.u<minU).map(u=>u.u));
  const ratio=retestRefs?0:(+val("review")||0)/100;
  const doShuffle=chk("optShuffle"), hint=chk("optHint"), box=chk("optBox");
  const trapN=num("trapN",0,6,2);
  const nchoice=num("nchoice",3,5,4);
  const baseSeed=seedFrom(b.code+"|"+units.join(",")+"|"+variant+"|"+RESEED+(retestRefs?"|re":""));
  const allK=uniq(main.W.concat(rev.W).map(w=>w.k).filter(Boolean)), allE=uniq(main.W.concat(rev.W).filter(w=>!w.alpha).map(w=>w.e));
  const allEls=uniq(b.units.filter(u=>units.includes(u.u)).flatMap(u=>u.els||[]));
  const sCnt={}; b.units.forEach(u=>u.words.forEach(w=>{ if(w.s) sCnt[w.s]=(sCnt[w.s]||0)+1; }));
  const sections=[], warns=[], used=new Set();   // 한 시험지 안에서 같은 문장·단어가 여러 유형에 나오지 않게(답이 드러남)
  let reused=false;
  const fresh=arr=>arr.filter(x=>!used.has(x.e)).concat(arr.filter(x=>used.has(x.e)));
  types.forEach((t,ti)=>{
    const rnd=mulberry32(baseSeed + ti*7919);
    const src=typeSrc(t.id);
    const ok=it=>eligible(t.id,it,isPh) && (t.id!=="p_spell" || sCnt[it.s]===1);
    let items;
    if(retestRefs){
      items=retestRefs.filter(r=>r.t===t.id).map(r=>r.it);
      if(doShuffle) items=shuffle(items,rnd);
    } else if(t.id==="p_sort"){
      const q=buildSort(main.W.filter(ok), t.n, rnd);
      if(!q){ warns.push(`「${TNAME.p_sort}」은 선택한 유닛에서 나눌 소리가 부족해 뺐어요. (소리가 다른 요소가 2개 이상 필요)`); return; }
      sections.push({id:t.id, title:TNAME[t.id], qs:[q]}); return;
    } else {
      const P=(src==="s"?main.S:main.W).filter(ok), R=(src==="s"?rev.S:rev.W).filter(ok);
      const nR=Math.min(R.length, Math.round(t.n*ratio));
      let pick=fresh(doShuffle?shuffle(P,rnd):P).slice(0, t.n-nR);
      pick=pick.concat(fresh(shuffle(R,rnd)).slice(0, t.n-pick.length));
      if(pick.length<t.n){ const more=fresh(doShuffle?shuffle(P,rnd):P).filter(x=>!pick.includes(x)); pick=pick.concat(more.slice(0,t.n-pick.length)); }
      if(src==="s" && pick.some(x=>used.has(x.e))) reused=true;   // 단어는 영→한·한→영 겹침이 흔해 알리지 않음
      pick.forEach(x=>used.add(x.e));
      items = doShuffle ? shuffle(pick,rnd) : pick;
      if(t.id==="s_listen") items=items.slice().sort((a,b)=>a._u-b._u||a._i-b._i);   // 음원 순서대로
      if(items.length<t.n) warns.push(items.length ? `「${TNAME[t.id]}」은 선택한 범위에 ${items.length}문항뿐이라 ${items.length}문항만 넣었어요.`
                                               : `「${TNAME[t.id]}」은 선택한 범위에 해당 문제가 없어 뺐어요.${t.id==="p_oral_s"||(isPh&&t.id==="s_listen")?" (문장 읽기 유닛을 골라 주세요)":""}`);
    }
    if(!items.length) return;
    const ctx={rnd,nchoice,hint,allK,allE,allEls,proper:properNouns(b),isPh};
    const qs=items.map(it=>({...buildQ(t.id,it,ctx), ref:{t:t.id,it}}));
    const sec={id:t.id, title:TNAME[t.id], qs};
    if(box && (t.id==="s_cloze"||t.id==="s_listen")) sec.box=wordBox(qs, main.W.concat(rev.W), trapN, rnd, isPh, properNouns(b));
    sections.push(sec);
  });
  if(reused) warns.push("선택한 범위에 문장·단어가 적어 같은 문장이 여러 유형에 나왔어요. 답이 보일 수 있으니 유형이나 문항 수를 줄이거나 유닛을 더 골라 주세요.");
  CUR={mode:"test", book:b, units, sections, warns, retest:!!retestRefs, review:ratio>0&&rev.W.length?minU-1:0};
  renderAll();
}
// 단어 상자: 정답 + 함정(같은 범위 단어, 파닉스는 생김새 비슷한 단어)
function wordBox(qs, W, trapN, rnd, isPh, proper){
  // 문장 첫 단어의 대문자는 위치를 알려 주므로 상자에서는 소문자로(고유명사·I 제외)
  const norm=a=>{ const f=a.split(/\s+/)[0]; return /^[A-Z]/.test(a) && !proper.has(f) ? a[0].toLowerCase()+a.slice(1) : a; };
  const ans=uniq(qs.flatMap(q=>q.blanks.map(x=>norm(x.ans))));
  const low=new Set(ans.map(a=>a.toLowerCase()));
  let traps;
  if(isPh){
    const all=[...LEXS.keys()];
    traps=shuffle(uniq(ans.flatMap(a=>all.filter(w=>w.length===a.length && w[0]===a[0].toLowerCase() && w!==a.toLowerCase()))),rnd);
  } else {
    traps=shuffle(uniq(W.filter(w=>!w.alpha).flatMap(w=>wordForms(w.e)).filter(f=>f.replace(/\s/g,"").length>=3 && !STOP.has(f.toLowerCase()))),rnd);
  }
  traps=traps.filter(t=>!low.has(t.toLowerCase())).slice(0,trapN);
  return shuffle(ans.concat(traps), rnd);
}
function pickDistractors(correct, pool, n, rnd){ return shuffle(pool.filter(x=>x!==correct),rnd).slice(0,Math.max(0,n-1)); }
function firstLetterHint(s){ const m=s.match(/[A-Za-z]/); return m? m[0]+"…":""; }

function buildQ(type, it, ctx){
  const {rnd,nchoice,hint,allK,allE}=ctx;
  switch(type){
    case "w_e2k": return {prompt:it.e, pos:it.p, answer:it.k, kind:"write"};
    case "w_k2e": return {prompt:it.k, answer:it.e, hint:hint?firstLetterHint(it.e):"", kind:"write"};
    case "w_e2k_mc": { const o=shuffle([it.k,...pickDistractors(it.k,allK,nchoice,rnd)],rnd); return {prompt:it.e, pos:it.p, options:o, answer:it.k, answerIdx:o.indexOf(it.k), kind:"mc"}; }
    case "w_k2e_mc": { const o=shuffle([it.e,...pickDistractors(it.e,allE,nchoice,rnd)],rnd); return {prompt:it.k, options:o, answer:it.e, answerIdx:o.indexOf(it.e), kind:"mc"}; }
    case "w_scr": {
      const w=it.e.toLowerCase(); let s=w.split("");
      for(let k=0;k<8 && s.join("")===w;k++) s=shuffle(s,rnd);
      return {letters:s, cue:meaning(it), answer:it.e, kind:"scr", firstL:hint?it.e[0]:""};
    }
    case "s_e2k": return {prompt:it.e, answer:it.k, kind:"line"};
    case "s_k2e": return {prompt:it.k, answer:it.e, kind:"line"};
    case "s_dict": return {prompt:"", answer:it.e, sub:it.k, kind:"line", u:it._u};
    case "s_cloze": { const c=clozeOf(it); return {sent:it.e, blanks:[c], sub:it.k, answer:c.ans, kind:"blanks", hint}; }
    case "s_listen": { const bl=listenBlanks(it, ctx.isPh); return {sent:it.e, blanks:bl, answer:bl.map(x=>x.ans).join(", "), kind:"blanks", listen:true, u:it._u, hint}; }
    case "s_order": {
      const ch=orderChunks(it).slice();
      const fw=ch[0].split(/\s+/)[0].replace(/[^A-Za-z']/g,"");
      if(!ctx.proper.has(fw) && !/^I'/.test(fw)) ch[0]=ch[0].charAt(0).toLowerCase()+ch[0].slice(1);
      let sh=ch; for(let k=0;k<6 && sh.join("|")===ch.join("|");k++) sh=shuffle(ch,rnd);   // 원래 순서 그대로 나오지 않게
      return {prompt:it.k, chunks:sh, end:(it.e.match(/[.?!]$/)||["."])[0], answer:it.e, kind:"order"};
    }
    case "s_slash": return {prompt:it.e, answer:it.c.join(" / "), kind:"slash"};
    case "s_chunkk": return {chunks:it.c, cks:it.ck, answer:it.ck.join(" / "), kind:"chunkk"};
    // ---- 파닉스 ----
    case "p_read": return {prompt:it.e, answer:it.s, kind:"write"};
    case "p_spell": return {prompt:it.s, answer:it.e, kind:"write"};
    case "p_dict": return {prompt:"", answer:it.e, kind:"write", u:it._u};
    case "p_blank": {
      const el=elOf(it);
      const alt=(it._els||[]).filter(x=>x!==el && sameSound(fillGap(it.b,x), it.s));   // 같은 한글소리로 읽히는 다른 교재 단어도 정답
      return {gapword:it.b, snd:it.s, answer:it.ba+(alt.length?` (또는 ${alt.join(", ")})`:""), full:it.e, kind:"gap"};
    }
    case "p_blank_mc": {
      const el=elOf(it);
      const ok=x=>!sameSound(fillGap(it.b,x), it.s);
      let dis=pickDistractors(el, (it._els||[]).filter(x=>fillGap(it.b,x)!==null&&ok(x)), nchoice, rnd);
      if(dis.length<nchoice-1) dis=dis.concat(pickDistractors(el, uniq((it._els||[]).concat(ctx.allEls)).filter(x=>x!==el&&!dis.includes(x)&&ok(x)), nchoice-dis.length, rnd));
      const o=shuffle([el,...dis],rnd);
      return {gapword:it.b, snd:it.s, options:o, answer:el, answerIdx:o.indexOf(el), full:it.e, kind:"gapmc"};
    }
    case "p_odd": return buildOdd(it, rnd);
    case "p_oral_w": return {prompt:it.e, answer:it.s, kind:"oral"};
    case "p_oral_s": return {prompt:it.e, answer:it.k, kind:"oral", long:true};
  }
  return {prompt:it.e, answer:it.k, kind:"write"};
}
// 소리가 다른 하나: 같은 요소 3개 + 다른 소리 요소 1개(같은 유닛, 서로 철자가 겹치지 않게)
function buildOdd(it, rnd){
  const X=elOf(it), u=it._unit, S=it._elsS||{};
  const W=u.words.filter(w=>w.b && w.e!==it.e);
  const same=shuffle(W.filter(w=>elOf(w)===X),rnd).slice(0,2);
  const otherEls=(u.els||[]).filter(y=>y!==X && S[y]!==S[X]);
  const odd=shuffle(W.filter(w=>otherEls.includes(elOf(w)) && !hasEl(w.e,X) && ![it,...same].some(s=>hasEl(s.e,elOf(w)))),rnd)[0];
  if(same.length<2 || !odd) return {prompt:it.e, answer:it.s, kind:"oral"};   // 짝이 없으면 읽기 체크로 대체(드묾)
  const opts=shuffle([it,...same,odd],rnd);
  return {options:opts.map(w=>w.e), notes:opts.map(w=>elOf(w)), answer:odd.e, answerIdx:opts.indexOf(odd), kind:"odd"};
}
// 소리별로 나누기: 소리가 서로 다른 요소 2~3개, 요소마다 단어 같은 수
function buildSort(W, n, rnd){
  const by={};
  W.forEach(w=>{ const e=elOf(w); (by[e]=by[e]||[]).push(w); });
  const sndOf=e=>{ const w=by[e][0]; return (w._elsS||{})[e]||""; };
  let els=shuffle(Object.keys(by).filter(e=>by[e].length>=2),rnd);
  const chosen=[];
  for(const e of els){ if(chosen.length>=3) break; if(chosen.some(c=>sndOf(c)===sndOf(e))) continue; chosen.push(e); }
  if(chosen.length<2) return null;
  const k=chosen.length, per=Math.max(2, Math.min(Math.floor(n/k)||3, ...chosen.map(e=>by[e].length)));
  const groups=chosen.map(e=>({el:e, snd:sndOf(e), words:shuffle(by[e].filter(w=>chosen.every(o=>o===e||!hasEl(w.e,o))),rnd).slice(0,per).map(w=>w.e)}));
  return {groups, box:shuffle(groups.flatMap(g=>g.words),rnd), answer:groups.map(g=>g.el+": "+g.words.join(", ")).join(" / "), kind:"sort"};
}

/* ===== 오답 재시험 ===== */
function retest(){
  if(!CUR || CUR.mode!=="test"){ alert("먼저 시험지를 만들어 주세요."); return; }
  const nums=new Set(val("wrongNos").split(/[^0-9]+/).filter(Boolean).map(Number));
  if(!nums.size){ alert("틀린 문항 번호를 적어 주세요. 예: 3, 7, 12"); return; }
  const refs=[]; let n=0;
  CUR.sections.forEach(s=>s.qs.forEach(q=>{ n++; if(nums.has(n) && q.ref && q.ref.t!=="p_sort") refs.push(q.ref); }));
  if(!refs.length){ alert("그 번호의 문항을 찾지 못했어요. (소리별로 나누기는 재시험에서 빠져요)"); return; }
  RESEED++;
  generate(refs);
}

/* ===== 미리보기 ===== */
function showTab(t, silent){ TAB=t; $("tabS").classList.toggle("on",t==="S"); $("tabT").classList.toggle("on",t==="T"); if(!silent) renderAll(); }
function setPage(landscape){ $("pageCss").textContent = landscape ? "@page{size:A4 landscape;margin:0}" : "@page{size:A4 portrait;margin:12mm 0}"; }
function renderAll(){
  if(!CUR) return;
  const host=$("preview");
  const warn = CUR.warns&&CUR.warns.length ? `<div class="warnmsg">${CUR.warns.map(esc).join("<br>")}</div>` : "";
  if(CUR.mode!=="test"){ setPage(false); host.innerHTML = warn + CUR.render(TAB==="T"); return; }
  if(!CUR.sections.length){ host.innerHTML = warn + `<div class="paper"><div class="empty">만들 수 있는 문제가 없어요. 유닛이나 유형을 바꿔 주세요.</div></div>`; return; }
  const a5 = val("paper")==="a5" && TAB==="S";
  setPage(a5);
  const one=testPaper(TAB==="T", a5);
  host.innerHTML = warn + (a5 ? `<div class="sheet2">${one}${one}</div>` : one);
  if(a5){
    const p=host.querySelector(".paper.a5");
    if(p && p.scrollHeight > p.clientHeight+4) host.insertAdjacentHTML("afterbegin", `<div class="warnmsg">문항이 많아 A5 한 장에 다 들어가지 않아요. 문항 수를 줄이거나 A4로 인쇄해 주세요.</div>`);
  }
}
function headerHTML({title, sub, acad, qr, info}){
  return `<div class="phead"><div class="ph-l"><div class="ttl">${esc(title)}</div>
      <div class="meta">${sub}${acad?`<span>🏫 ${esc(acad)}</span>`:""}</div></div>${qr||""}</div>
    ${info===false?"":`<div class="pinfo">${(info||["이름","날짜","점수"]).map(x=>`<span>${x} <span class="box"></span></span>`).join("")}</div>`}`;
}
function watermark(acad){
  return acad ? `<div class="wm">${Array.from({length:18}).map((_,i)=>`<span style="top:${(i%6)*52*3}px;left:${Math.floor(i/6)*360-60}px">${esc(acad)}</span>`).join("")}</div>` : "";
}
function studioURL(b,u){ return STUDIO+"?book="+b.studio+(u?"&u="+u:""); }
function qrBlock(b, units, label){
  if(!b.studio) return "";
  const max=STUDIO_UNITS[b.studio]||99;
  const us=units.filter(u=>u<=max);
  if(!us.length) return "";
  const list = us.length<=3 ? us.map(u=>({u, url:studioURL(b,u)})) : [{u:0, url:studioURL(b)}];
  return `<div class="qrs">${list.map(x=>`<div class="qr">${qrSVG(x.url)}<small>${x.u?"U"+x.u+" ":""}${label||"음원"}</small></div>`).join("")}</div>`;
}
function qrSVG(url){
  try{ const q=qrcode(0,"M"); q.addData(url); q.make(); return q.createSvgTag({cellSize:2, margin:0, scalable:true}); }
  catch(e){ return `<span class="qrfail">${esc(url)}</span>`; }
}
function testPaper(showAns, a5){
  const b=CUR.book, acad=val("acad").trim(), p=practice();
  const title=val("title").trim() || (CUR.retest?"오답 재시험":p?"연습지":isPhonics()?"파닉스 시험":
    CUR.sections.every(s=>!SENT_TYPES.has(s.id))?"단어 시험":"저절로 시험지");
  const variant=$("variant").options[$("variant").selectedIndex].text;
  const uLabel="Unit "+CUR.units.join(", ")+(CUR.review?` (+복습 U1–${CUR.review})`:"");
  const wantQR = chk("optQR") && (p || CUR.sections.some(s=>LISTEN_TYPES.has(s.id)));
  let qno=0;
  const secs=CUR.sections.map(sec=>{
    const wide = sec.qs.every(q=>WIDE_KINDS.has(q.kind)||(q.kind==="oral"&&!q.long));
    qno+=sec.qs.length;
    const boxH = sec.box ? `<div class="wbox">${sec.box.map(w=>`<span>${esc(w)}</span>`).join("")}</div>` : "";
    const note = sec.id==="s_listen" ? `<div class="secnote">음원을 듣고 빈칸에 알맞은 말을 쓰세요. (유닛 음원의 문장 순서대로)</div>` : "";
    // 제목·안내·단어 상자는 첫 문항과 함께 다음 쪽으로 넘어가게 묶음
    const qsH=sec.qs.map((q,i)=>qHTML(qno-sec.qs.length+i+1,q,showAns));
    const firstN = wide ? 2 : 1;
    return `<div class="sec"><div class="sechead"><h3>${esc(sec.title)} <span class="cnt">(${sec.qs.length}문항)</span></h3>${note}${boxH}
      <div class="qgrid ${wide?"":"one"}">${qsH.slice(0,firstN).join("")}</div></div>
      <div class="qgrid ${wide?"":"one"}">${qsH.slice(firstN).join("")}</div></div>`;
  }).join("");
  const strip = !showAns && chk("optStrip") ? answerStrip() : "";
  return `<div class="paper ${showAns?'ansPaper':''} ${a5?'a5':''}">${watermark(acad)}<div class="content">
    ${headerHTML({title, sub:`<span>📘 ${esc(b.name)} · ${esc(uLabel)}</span><span>${esc(variant)}</span>`, acad,
      qr: wantQR?qrBlock(b, CUR.units):"", info:["이름","날짜", p?"확인":"점수"]})}
    ${secs}${strip}
  </div></div>`;
}
function answerStrip(){
  let n=0; const a=[];
  CUR.sections.forEach(s=>s.qs.forEach(q=>{ n++; a.push(`<span><b>${n}</b> ${esc(q.answer)}</span>`); }));
  return `<div class="strip"><div class="cut">✂ 정답 (잘라서 확인해요)</div><div class="stripin">${a.join("")}</div></div>`;
}
const CIRC=["①","②","③","④","⑤"];
function gapHTML(w){ return esc(w).replace(/_/g,'<span class="gap"></span>'); }
function sndCue(q){ return chk("optSnd") ? `<span class="sndcue">[${esc(q.snd)}]</span>` : ""; }
const ORAL_BOX=`<span class="oralbox"><span>○</span><span>△</span><span>×</span></span>`;
function blankSentHTML(q, showAns){
  let out="", pos=0;
  q.blanks.forEach(bk=>{
    out+=esc(q.sent.slice(pos,bk.s));
    const w=Math.max(46, bk.ans.length*9+18);
    out+= showAns ? `<span class="cb ans">${esc(bk.ans)}</span>`
                  : `<span class="cb" style="min-width:${w}px">${q.hint&&!q.listen?esc(bk.ans[0]):""}</span>`;
    pos=bk.e;
  });
  return out+esc(q.sent.slice(pos));
}
function qHTML(n,q,showAns){
  const N=`<span class="n">${n}.</span>`;
  switch(q.kind){
    case "gap": return `<div class="q">${N}<span class="body"><span class="gapword">${gapHTML(q.gapword)}</span>${sndCue(q)}${showAns?`<span class="ans" style="margin-left:10px">${esc(q.answer)}</span><span class="pos">${esc(q.full)}</span>`:""}</span></div>`;
    case "gapmc": case "mc": case "odd": {
      const ch=q.options.map((o,i)=>`<span>${CIRC[i]} ${esc(o)}${showAns&&q.notes?`<span class="pos">${esc(q.notes[i])}</span>`:""}${showAns&&i===q.answerIdx?' <span class="ans">✔</span>':''}</span>`).join("");
      const head = q.kind==="gapmc" ? `<span class="gapword">${gapHTML(q.gapword)}</span>${sndCue(q)}${showAns?`<span class="pos">${esc(q.full)}</span>`:""}`
                 : q.kind==="odd" ? `<span class="prompt" style="font-weight:500;color:#555">소리가 다른 하나는?</span>`
                 : `<span class="prompt">${esc(q.prompt)}</span>${q.pos?`<span class="pos">${esc(q.pos)}</span>`:""}`;
      return `<div class="q">${N}<span class="body">${head}<div class="choices">${ch}</div></span></div>`;
    }
    case "oral": return `<div class="q oral">${N}<span class="body"><span class="prompt">${esc(q.prompt)}</span>${showAns?`<span class="pos">${esc(q.answer)}</span>`:""}</span>${ORAL_BOX}</div>`;
    case "scr": return `<div class="q">${N}<span class="body"><span class="letters">${q.letters.map(esc).join(" · ")}</span><span class="pos">${esc(q.cue)}</span>
      ${showAns?`<span class="blank"><span class="ans">${esc(q.answer)}</span></span>`:`<span class="blank">${q.firstL?`<span style="color:#999">${esc(q.firstL)}</span>`:""}</span>`}</span></div>`;
    case "blanks": return `<div class="q col">${N}<span class="body"><div class="bsent">${blankSentHTML(q,showAns)}</div>${q.sub?`<div class="sub">${esc(q.sub)}</div>`:""}</span></div>`;
    case "order": {
      const chips=q.chunks.map(c=>`<span class="chunk">${esc(c)}</span>`).join("");
      return `<div class="q col">${N}<span class="body"><span class="prompt">${esc(q.prompt)}</span><div class="chunks">${chips}</div>
        ${showAns?`<div class="ansline"><span class="ans">${esc(q.answer)}</span></div>`:`<div class="orderline"><span class="blankline"></span><b>${esc(q.end)}</b></div>`}</span></div>`;
    }
    case "slash": return `<div class="q col">${N}<span class="body"><div class="slashs">${showAns?`<span class="ans">${esc(q.answer)}</span>`:esc(q.prompt)}</div></span></div>`;
    case "chunkk": return `<div class="q col">${N}<span class="body"><div class="ckrow">${q.chunks.map((c,i)=>`<div class="ckb"><div class="cke">${esc(c)}</div><div class="ckk">${showAns?`<span class="ans">${esc(q.cks[i])}</span>`:""}</div></div>`).join(`<span class="cksep">/</span>`)}</div></span></div>`;
    case "sort": return `<div class="q col">${N}<span class="body"><span class="prompt" style="font-weight:500;color:#555">단어를 소리에 맞게 나누어 쓰세요.</span>
      <div class="wbox">${q.box.map(w=>`<span>${esc(w)}</span>`).join("")}</div>
      <table class="sorttb"><tr>${q.groups.map(g=>`<th>${esc(g.el)} <small>[${esc(g.snd)}]</small></th>`).join("")}</tr>
      ${Array.from({length:q.groups[0].words.length}).map((_,i)=>`<tr>${q.groups.map(g=>`<td>${showAns?`<span class="ans">${esc(g.words[i]||"")}</span>`:""}</td>`).join("")}</tr>`).join("")}</table></span></div>`;
    case "line": {
      const prompt = q.prompt ? `<span class="prompt">${esc(q.prompt)}</span>` : `<span style="color:#aaa">( 불러주는 문장 받아쓰기 )</span>`;
      return `<div class="q col">${N}<span class="body">${prompt}${q.sub&&showAns?`<span class="pos">${esc(q.sub)}</span>`:""}
        ${showAns?`<div class="ansline"><span class="ans">${esc(q.answer)}</span></div>`:`<div class="blankline"></div>`}</span></div>`;
    }
  }
  // write
  const tail = showAns ? `<span class="blank"><span class="ans">${esc(q.answer)}</span></span>`
                       : `<span class="blank"></span>${q.hint?`<span class="pos">${esc(q.hint)}</span>`:""}`;
  return `<div class="q">${N}<span class="body"><span class="prompt">${esc(q.prompt)}</span>${q.pos?`<span class="pos">${esc(q.pos)}</span>`:""}${tail}</span></div>`;
}

/* ===== 활동지 공통 ===== */
function actPool(filter){
  const b=curBook(), {W}=collect(b, selectedUnits());
  return W.filter(w=>!w.alpha && (filter?filter(w):true));
}
function actSeed(tag){ return mulberry32(seedFrom(val("book")+"|"+selectedUnits().join(",")+"|"+tag+"|"+RESEED)); }
function uLabelNow(){ return curBook().name+" · Unit "+selectedUnits().join(", "); }
function setAct(render, warns){ CUR={mode:"act", render, warns:warns||[]}; renderAll(); }

/* ----- 빙고 ----- */
function makeBingo(){
  const n=+val("bingoN"), cnt=num("bingoCnt",1,40,10), face=val("bingoFace"), free=n===5 && chk("bingoFree");
  const pool=actPool(w=>w.e.length<=16 && !STOP.has(w.e.toLowerCase()) && w.e.replace(/[^A-Za-z]/g,"").length>=2);
  const need=n*n-(free?1:0);
  if(pool.length<need){ setAct(()=>"",[`빙고 ${n}×${n}에는 단어가 ${need}개 필요한데 선택한 유닛에는 ${pool.length}개뿐이에요. 유닛을 더 고르거나 칸 수를 줄여 주세요.`]); return; }
  const rnd=actSeed("bingo"+n), acad=val("acad").trim(), title=val("title").trim()||"단어 빙고";
  const boards=Array.from({length:cnt},()=>shuffle(pool,rnd).slice(0,need));
  const cellTxt=w=>face==="k"?meaning(w):w.e;
  const board=(ws,i)=>{
    const cells=ws.slice(); if(free) cells.splice(Math.floor(need/2),0,null);
    return `<div class="bingo"><div class="bhead"><b>${esc(title)}</b><span>${esc(uLabelNow())}</span><span>이름 <span class="box"></span></span><span class="bno">#${i+1}</span></div>
      <table class="btb b${n}">${Array.from({length:n}).map((_,r)=>`<tr>${cells.slice(r*n,r*n+n).map(w=>`<td>${w?`<span>${esc(cellTxt(w))}</span>`:"<b>FREE</b>"}</td>`).join("")}</tr>`).join("")}</table></div>`;
  };
  setAct(showAns=>{
    if(showAns){
      return `<div class="paper">${watermark(acad)}<div class="content">${headerHTML({title:title+" · 부르기 목록", sub:`<span>📘 ${esc(uLabelNow())}</span><span>${face==="k"?"영단어를 불러 주세요(칸에는 뜻)":"뜻을 불러 주세요(칸에는 영단어)"}</span>`, acad, info:false})}
        <table class="calltb"><tr><th></th><th>${face==="k"?"부를 영단어":"부를 뜻"}</th><th>${face==="k"?"칸의 뜻":"칸의 영단어"}</th><th></th><th>${face==="k"?"부를 영단어":"부를 뜻"}</th><th>${face==="k"?"칸의 뜻":"칸의 영단어"}</th></tr>
        ${(()=>{ const L=shuffle(pool,actSeed("call")), h=Math.ceil(L.length/2); return Array.from({length:h}).map((_,i)=>{ const a=L[i], c=L[i+h];
          const cell=w=>w?`<td class="ck">☐</td><td><b>${esc(face==="k"?w.e:meaning(w))}</b></td><td>${esc(face==="k"?meaning(w):w.e)}</td>`:"<td></td><td></td><td></td>";
          return `<tr>${cell(a)}${cell(c)}</tr>`; }).join(""); })()}</table></div></div>`;
    }
    let html="";
    for(let i=0;i<boards.length;i+=2){
      html+=`<div class="paper">${watermark(acad)}<div class="content bingopage">${board(boards[i],i)}${boards[i+1]?board(boards[i+1],i+1):""}</div></div>`;
    }
    return html;
  });
}

/* ----- 워드서치 ----- */
function makeSearch(){
  const N=+val("srN"), want=num("srWords",4,20,10), level=val("srLevel"), clue=val("srClue");
  const pool=actPool(w=>pureWord(w) && w.e.length>=3 && w.e.length<=N);
  const rnd=actSeed("search"+N+level);
  const dirs = level==="easy" ? [[0,1],[1,0]] : level==="mid" ? [[0,1],[1,0],[1,1],[-1,1]] : [[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];
  const grid=Array.from({length:N},()=>Array(N).fill("")), placed=[];
  const cand=shuffle(pool,rnd).slice(0,want*2).sort((a,b)=>b.e.length-a.e.length);
  for(const w of cand){
    if(placed.length>=want) break;
    const W=w.e.toUpperCase(); let done=false;
    for(let t=0;t<300 && !done;t++){
      const [dr,dc]=dirs[Math.floor(rnd()*dirs.length)], r0=Math.floor(rnd()*N), c0=Math.floor(rnd()*N);
      const r1=r0+dr*(W.length-1), c1=c0+dc*(W.length-1);
      if(r1<0||r1>=N||c1<0||c1>=N) continue;
      let ok=true; for(let i=0;i<W.length;i++){ const g=grid[r0+dr*i][c0+dc*i]; if(g && g!==W[i]){ ok=false; break; } }
      if(!ok) continue;
      const cells=[]; for(let i=0;i<W.length;i++){ grid[r0+dr*i][c0+dc*i]=W[i]; cells.push((r0+dr*i)*N+c0+dc*i); }
      placed.push({w, cells}); done=true;
    }
  }
  const AB="ABCDEFGHIJKLMNOPRSTUWY";
  const fill=grid.map(row=>row.map(ch=>ch||AB[Math.floor(rnd()*AB.length)]));
  const warns = placed.length<want ? [`단어 ${want}개 중 ${placed.length}개만 넣었어요. (칸을 키우거나 유닛을 더 골라 보세요)`] : [];
  const acad=val("acad").trim(), title=val("title").trim()||"워드서치";
  const list=placed.slice().sort((a,b)=>a.w.e.localeCompare(b.w.e));
  setAct(showAns=>{
    const hit=new Set(placed.flatMap(p=>p.cells));
    const tb=`<table class="srtb n${N}">${fill.map((row,r)=>`<tr>${row.map((ch,c)=>`<td class="${showAns&&hit.has(r*N+c)?"hit":""}">${ch}</td>`).join("")}</tr>`).join("")}</table>`;
    const clueTxt=w=> clue==="e" ? w.e : clue==="k" ? meaning(w) : `${w.e} <small>${esc(meaning(w))}</small>`;
    const words=`<div class="srlist">${list.map((p,i)=>`<span><i>☐</i>${clue==="e"||clue==="both"?"":`<b>${i+1}.</b> `}${clue==="both"?`${esc(p.w.e)} <small>${esc(meaning(p.w))}</small>`:esc(clue==="e"?p.w.e:meaning(p.w))}${showAns&&clue==="k"?` <span class="ans">${esc(p.w.e)}</span>`:""}</span>`).join("")}</div>`;
    return `<div class="paper ${showAns?'ansPaper':''}">${watermark(acad)}<div class="content">
      ${headerHTML({title, sub:`<span>📘 ${esc(uLabelNow())}</span><span>${{easy:"가로·세로",mid:"가로·세로·대각선",hard:"모든 방향(거꾸로 포함)"}[level]}</span>`, acad, info:["이름","날짜"]})}
      <div class="secnote">${clue==="k"?"뜻에 맞는 영단어를 찾아 동그라미 하고 옆에 쓰세요.":"아래 단어를 찾아 동그라미 하세요."}</div>
      ${tb}${words}</div></div>`;
  }, warns);
}

/* ----- 십자말풀이 ----- */
function makeCross(){
  const want=num("crWords",4,16,10);
  const pool=actPool(w=>pureWord(w) && w.e.length>=3 && w.e.length<=12);
  const rnd=actSeed("cross");
  let best=null;
  for(let tries=0; tries<12; tries++){
    const r=layoutCross(shuffle(pool,rnd).slice(0,want*2).sort((a,b)=>b.e.length-a.e.length), want, rnd);
    if(!best || r.placed.length>best.placed.length || (r.placed.length===best.placed.length && r.area<best.area)) best=r;
    if(best.placed.length>=want && tries>=4) break;
  }
  const {placed, grid, R0, C0, R1, C1}=best;
  // 번호 매기기
  let no=0; const numAt={};
  placed.sort((a,b)=>a.r-b.r||a.c-b.c).forEach(p=>{ const k=p.r+","+p.c; if(!numAt[k]) numAt[k]=++no; p.no=numAt[k]; });
  const warns = placed.length<want ? [`단어 ${want}개 중 서로 엇갈리게 놓을 수 있는 ${placed.length}개만 넣었어요.`] : [];
  const acad=val("acad").trim(), title=val("title").trim()||"십자말풀이";
  const isPh=isPhonics();
  setAct(showAns=>{
    let tb=`<table class="crtb">`;
    for(let r=R0;r<=R1;r++){ tb+="<tr>"; for(let c=C0;c<=C1;c++){ const ch=grid[r+","+c], n=numAt[r+","+c];
      tb+= ch ? `<td class="on">${n?`<sup>${n}</sup>`:""}${showAns?esc(ch):""}</td>` : `<td></td>`; } tb+="</tr>"; }
    tb+="</table>";
    const clues=dir=>placed.filter(p=>p.d===dir).sort((a,b)=>a.no-b.no).map(p=>`<div><b>${p.no}.</b> ${esc(meaning(p.w))} <small>(${p.w.e.length}글자)</small>${showAns?` <span class="ans">${esc(p.w.e)}</span>`:""}</div>`).join("");
    return `<div class="paper ${showAns?'ansPaper':''}">${watermark(acad)}<div class="content">
      ${headerHTML({title, sub:`<span>📘 ${esc(uLabelNow())}</span><span>${isPh?"힌트: 한글소리":"힌트: 우리말 뜻"}</span>`, acad, info:["이름","날짜"]})}
      <div class="crwrap">${tb}</div>
      <div class="clues"><div><h4>가로 →</h4>${clues("a")}</div><div><h4>세로 ↓</h4>${clues("d")}</div></div></div></div>`;
  }, warns);
}
function layoutCross(words, want, rnd){
  const grid={}, placed=[];
  const get=(r,c)=>grid[r+","+c];
  const canPlace=(W,r,c,d)=>{
    const dr=d==="d"?1:0, dc=d==="a"?1:0;
    if(get(r-dr,c-dc) || get(r+dr*W.length,c+dc*W.length)) return -1;
    let cross=0;
    for(let i=0;i<W.length;i++){
      const rr=r+dr*i, cc=c+dc*i, g=get(rr,cc);
      if(g){ if(g!==W[i]) return -1; cross++; continue; }
      if(get(rr+dc,cc+dr) || get(rr-dc,cc-dr)) return -1;   // 옆에 붙는 글자 금지
    }
    return cross;
  };
  const put=(w,r,c,d)=>{ const W=w.e.toUpperCase(), dr=d==="d"?1:0, dc=d==="a"?1:0;
    for(let i=0;i<W.length;i++) grid[(r+dr*i)+","+(c+dc*i)]=W[i]; placed.push({w,r,c,d}); };
  const used=new Set();
  for(const w of words){
    if(placed.length>=want) break;
    const W=w.e.toUpperCase(); if(used.has(W)) continue;
    if(!placed.length){ put(w,0,0,"a"); used.add(W); continue; }
    const opts=[];
    for(const p of placed){ const P=p.w.e.toUpperCase();
      for(let i=0;i<P.length;i++) for(let j=0;j<W.length;j++){ if(P[i]!==W[j]) continue;
        const d=p.d==="a"?"d":"a";
        const r=p.d==="a"? p.r-j : p.r+i, c=p.d==="a"? p.c+i : p.c-j;
        const x=canPlace(W,r,c,d); if(x>0) opts.push({r,c,d,x:x+rnd()}); } }
    if(!opts.length) continue;
    opts.sort((a,b)=>b.x-a.x); const o=opts[0]; put(w,o.r,o.c,o.d); used.add(W);
  }
  const ks=Object.keys(grid).map(k=>k.split(",").map(Number));
  const R0=Math.min(...ks.map(k=>k[0])), R1=Math.max(...ks.map(k=>k[0])), C0=Math.min(...ks.map(k=>k[1])), C1=Math.max(...ks.map(k=>k[1]));
  return {placed, grid, R0, C0, R1, C1, area:(R1-R0+1)*(C1-C0+1)};
}

/* ----- 단어 카드 ----- */
function makeCards(){
  const style=val("cardStyle");
  const pool=actPool();
  if(!pool.length){ setAct(()=>"",["선택한 유닛에 단어가 없어요."]); return; }
  const acad=val("acad").trim(), b=curBook();
  const per=12, cols=3;
  const pages=[]; for(let i=0;i<pool.length;i+=per) pages.push(pool.slice(i,i+per));
  const tag=w=>`<small class="ctag">${esc(b.name)} U${w._u}</small>`;
  setAct(()=>{
    let html="";
    pages.forEach(ws=>{
      if(style==="fold"){
        html+=`<div class="paper cardpage">${watermark(acad)}<div class="cards fold">${ws.map(w=>`<div class="card"><div class="cf">${esc(w.e)}${tag(w)}</div><div class="cb2">${esc(meaning(w))}</div></div>`).join("")}</div></div>`;
      } else {
        const front=ws, back=[];
        // 양면 인쇄(긴 쪽 넘김) 때 뒷면이 맞도록 줄마다 좌우를 뒤집음
        for(let r=0;r<Math.ceil(per/cols);r++){ const row=Array.from({length:cols},(_,c)=>ws[r*cols+c]||null); back.push(...row.reverse()); }
        html+=`<div class="paper cardpage">${watermark(acad)}<div class="cards">${front.map(w=>`<div class="card"><div class="cf">${esc(w.e)}${tag(w)}</div></div>`).join("")}</div></div>`;
        html+=`<div class="paper cardpage">${watermark(acad)}<div class="cards">${back.map(w=>`<div class="card ${w?"":"blank"}"><div class="cf k">${w?esc(meaning(w)):""}</div></div>`).join("")}</div></div>`;
      }
    });
    return html;
  }, style==="duplex" ? ["양면 인쇄: 프린터 설정에서 ‘양면 · 긴 쪽 넘김’으로 인쇄하면 앞뒤가 맞아요."] : []);
}

/* ----- 숙제 안내지 ----- */
function makeHW(){
  const b=curBook(), units=selectedUnits(), acad=val("acad").trim();
  const tasks=val("hwTasks").split("\n").map(s=>s.trim()).filter(Boolean);
  const period=val("hwPeriod").trim(), msg=val("hwMsg").trim();
  const words=chk("hwWords") ? actPool().slice(0,40) : [];
  const title=val("title").trim()||"이번 주 숙제";
  const days=["월","화","수","목","금"];
  setAct(()=>`<div class="paper">${watermark(acad)}<div class="content hw">
    ${headerHTML({title, sub:`<span>📘 ${esc(uLabelNow())}</span>${period?`<span>🗓 ${esc(period)}</span>`:""}`, acad, info:["이름"]})}
    <h4>할 일</h4>
    <table class="hwtb"><tr><th>할 일</th>${days.map(d=>`<th>${d}</th>`).join("")}</tr>
      ${tasks.map(t=>`<tr><td>${esc(t)}</td>${days.map(()=>`<td class="ck">☐</td>`).join("")}</tr>`).join("")}</table>
    ${chk("hwQR") && b.studio ? `<div class="hwqr">${qrBlock(b, units, "음원·강의")}<div><b>휴대폰 카메라로 QR을 찍어 보세요.</b><br>교재 음원과 강의를 바로 들을 수 있어요. 앱 설치나 로그인은 필요 없어요.</div></div>` : ""}
    ${words.length ? `<h4>이번 단어</h4><div class="hwwords">${words.map(w=>`<div><b>${esc(w.e)}</b><span>${esc(meaning(w))}</span></div>`).join("")}</div>` : ""}
    ${msg ? `<h4>선생님 한마디</h4><div class="hwmsg">${esc(msg).replace(/\n/g,"<br>")}</div>` : ""}
    <div class="hwsign"><span>학부모 확인</span><span class="box wide"></span></div>
  </div></div>`);
}

boot();
