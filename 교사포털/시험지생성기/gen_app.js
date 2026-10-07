/* 저절로 워크북 생성기 — 교재·유닛·유형만 고르면 인쇄용 워크북(문제지/정답지)
   디자인: C&S 워크북 규격(네이비 번호 배지 · 주황 번호 · 회색 쓰기줄 · 가운데 쪽번호)
   데이터: gen_data.js (window.GEN_BOOKS, build_추가시리즈.py 로 생성) */

const AUTH = "https://solveu-auth.tjdals85200.workers.dev";   // 선생님 인증 서버(_QR제작/teacher-auth)
const PASS_KEY = "solveu_pass";                                // 사이트 공통 입장권(site.js 와 같은 키)
const SAVE_KEY = "solveu_wb_v1";                               // 이 기기에 기억하는 것(교재·유형·학원 이름)

// [id, 이름, 예시(화면 안내용), 기본 선택]
const TYPES_R = [
  ["w_mean",  "단어 뜻 쓰기",  "brother → (뜻)",                   true],
  ["w_spell", "단어 쓰기",     "동생 → (영어)",                    true],
  ["s_trans", "문장 뜻 쓰기",  "영어 문장 → (우리말)",             false],
  ["s_write", "문장 쓰기",     "우리말 → (영어 문장)",             false],
  ["s_order", "어순 배열",     "우리말 + 섞인 단어 → (영어 문장)", false],
  ["s_listen","듣고 빈칸 쓰기", "음원 듣고 빈칸 채우기 + 단어 상자",  false],
];
const TNAME = Object.fromEntries(TYPES_R.map(t=>[t[0],t[1]]));
const TDESC = {w_mean:"영단어를 보고 우리말 뜻을 써요.", w_spell:"우리말 뜻을 보고 영단어를 써요.", s_trans:"영어 문장을 보고 우리말 뜻을 써요.", s_write:"우리말 뜻을 보고 영어 문장을 통째로 써요.",
  s_order:"끊어 읽은 우리말을 보고, 섞인 단어로 문장을 써요.", s_listen:"음원을 듣고 빈칸을 채워요. 단어 상자에서 골라 써요."};
// 유형별 단 수(C&S 워크북처럼 짧은 것은 여러 단, 문장은 1단, 어순배열은 2단)
const COLS = {w_mean:2, w_spell:2, s_trans:1, s_write:1, s_order:1, s_listen:1};   // 문장은 1단(손글씨 쓸 폭)

let CUR=null, TAB="Q";
const STUDIO_URL="https://solveu.co.kr/studio/";   // 음원 화면(유닛별 ?book=&u=) — 듣고 빈칸 쓰기 QR
// 어순 배열 섞는 방법: all=전체 단어 · inner=덩어리 안 단어만 · chunk=덩어리째
const OMODES={all:"※ 주어진 단어를 바르게 배열하여 문장을 쓰세요.", inner:"※ 덩어리 안의 단어를 바르게 배열하여 문장을 쓰세요.", chunk:"※ 주어진 덩어리를 바르게 배열하여 문장을 쓰세요."};
function setOMode(m){ document.querySelectorAll("#omode button").forEach(b=>b.classList.toggle("on", b.dataset.o===m)); save({omode:m}); if(!CUR) render(); }
function oMode(){ return (document.querySelector("#omode .on")||{dataset:{o:"all"}}).dataset.o; }
// 꼬리말 왼쪽: 홈페이지와 같은 글자 로고(쏠뷰 | SolveU, U만 파랑)
const LOGO=`<span class="lg"><span class="ko">쏠뷰</span><span class="dv"></span><span class="en">Solve<span class="g">U</span></span></span>`;
function setMargin(m){
  document.querySelectorAll("#marg button").forEach(b=>b.classList.toggle("on", b.dataset.m===m));
  const pv=$("preview"); pv.classList.remove("m-narrow","m-wide"); if(m!=="normal") pv.classList.add("m-"+m);
  save({margin:m}); render(); psetCur();   // 여백이 바뀌면 한 쪽에 들어가는 양이 달라져 다시 나눔
}
// 접어 둔 '인쇄 설정' 옆에 지금 값을 옅게(학원 이름 · 여백)
function psetCur(){
  const m={narrow:"좁게",normal:"보통",wide:"넓게"}[(document.querySelector("#marg .on")||{dataset:{m:"normal"}}).dataset.m];
  const a=$("acad").value.trim();
  $("psetCur").textContent = (a ? a : "학원 이름 없음")+" · 여백 "+m;
}

/* ===== 게이트 ===== */
function getPass(){ try{ return localStorage.getItem(PASS_KEY)||""; }catch(e){ return ""; } }
// 데이터(단어·문장·해석·끊어읽기)는 사이트에 공개 파일로 두지 않고 인증 서버가 입장권 확인 후 내려 줌.
// 내 컴퓨터 미리보기(localhost)는 로컬 gen_data.js(사이트에는 안 올라감)를 씀.
const LOCAL=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
function loadData(pass){
  if(LOCAL) return new Promise((ok,no)=>{ const sc=document.createElement("script"); sc.src="gen_data.js"; sc.onload=()=>ok(true); sc.onerror=no; document.head.appendChild(sc); });
  return fetch(AUTH+"/api/gen-data",{headers:{Authorization:"Bearer "+pass}}).then(r=>{
    if(r.status===401) return false;
    if(!r.ok) throw new Error("data "+r.status);
    return r.json().then(d=>{ window.GEN_BOOKS=d; return true; });
  });
}
function boot(){
  try{ localStorage.removeItem("jeol_teacher_ok"); }catch(e){}   // 옛 교사 코드(2026-09-30 폐지)
  const p=getPass();
  if(!LOCAL && !p){ show("gate"); return; }
  show("app");
  $("preview").innerHTML=`<div class="empty">자료를 불러오는 중이에요…</div>`;
  loadData(p).then(ok=>{
    if(!ok){ try{localStorage.removeItem(PASS_KEY)}catch(e){}; show("gate"); return; }   // 입장권이 만료·폐기됨
    openApp();
  }).catch(()=>{ $("preview").innerHTML=`<div class="empty">자료를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.</div>`; });
}
function show(id){ ["gate","app"].forEach(v=>$(v).classList.toggle("hidden", v!==id)); }
let OPENED=false;
function openApp(){ show("app"); if(!OPENED){ OPENED=true; initControls(); } }

/* ===== 도구 ===== */
function $(id){ return document.getElementById(id); }
function esc(s){ return (s==null?"":String(s)).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function shuffle(arr,rnd){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function seedFrom(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function load(){ try{ return JSON.parse(localStorage.getItem(SAVE_KEY)||"{}"); }catch(e){ return {}; } }
function save(o){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify({...load(), ...o})); }catch(e){} }
function curBook(){ return GEN_BOOKS.find(b=>b.code===$("book").value); }

/* ===== 화면 ===== */
function initControls(){
  const series=[...new Set(GEN_BOOKS.map(b=>b.series))];
  $("book").innerHTML = series.map(s=>`<optgroup label="${s}">`+
    GEN_BOOKS.filter(b=>b.series===s).map(b=>`<option value="${b.code}">${b.name}</option>`).join("")+`</optgroup>`).join("");
  const sv=load();
  if(sv.book && GEN_BOOKS.some(b=>b.code===sv.book)) $("book").value=sv.book;
  if(sv.acad) $("acad").value=sv.acad;
  if(sv.omode) document.querySelectorAll("#omode button").forEach(b=>b.classList.toggle("on", b.dataset.o===sv.omode));
  if(sv.both) $("both").checked=true;
  const lv=sv.lvl || (sv.bank===0 ? "hard" : sv.hint ? "easy" : "");   // 예전 저장값(단어 상자·힌트)도 이어받음
  if(lv) document.querySelectorAll("#lvl button").forEach(b=>b.classList.toggle("on", b.dataset.l===lv));
  if(sv.margin && sv.margin!=="normal"){ document.querySelectorAll("#marg button").forEach(b=>b.classList.toggle("on", b.dataset.m===sv.margin)); $("preview").classList.add("m-"+sv.margin); }
  psetCur();
  /* 주소로 책·유닛 지정(QR 음원 화면·자료실에서 옴): ?book=ph1&u=3 (음원 코드나 생성기 코드 둘 다) */
  const QS=new URLSearchParams(location.search), qb=QS.get("book"), qu=parseInt(QS.get("u"));
  const qbook=qb && GEN_BOOKS.find(b=>b.code===qb||b.studio===qb);
  if(qbook) $("book").value=qbook.code;
  onBook();
  if(qbook && qu && qbook.units.some(x=>x.u===qu)){ setUnits([qu]); showEx(); }
}
function onBook(){
  const b=curBook(), sv=load();
  $("units").innerHTML = b.units.map(u=>`<label title="${esc(u.label||"")}"><input type="checkbox" value="${u.u}" onchange="this.parentNode.classList.toggle('on',this.checked); showEx()">${u.u}</label>`).join("");
  setUnits([b.units[0].u]);
  const chosen = sv.types && sv.types[b.kind];
  $("types").innerHTML = TYPES_R.map(([id,nm,ex,def])=>{
    const on = chosen ? chosen.includes(id) : def;
    return `<label class="ty ${on?"on":""}"><input type="checkbox" value="${id}" ${on?"checked":""} onchange="this.parentNode.classList.toggle('on',this.checked); syncListen(); showEx()">
      <span class="ck"></span><span><b>${nm}</b></span></label>`; }).join("");
  syncListen();
  showEx();
}
// 만들기 전(또는 고르기를 바꾸면) 오른쪽에 유형별 예시 카드
function showEx(){ CUR=null; render(); }
function toggleType(id){
  const c=document.querySelector(`#types input[value="${id}"]`); if(!c) return;
  c.checked=!c.checked; c.parentNode.classList.toggle("on",c.checked); syncListen(); showEx();
}
// 고른 유형에 맞는 세부 옵션(듣고 빈칸 쓰기 난이도 · 어순 배열 섞는 방법)만 보여 줌
function syncListen(){ $("blankStep").classList.toggle("hidden", !selTypes().includes("s_listen")); $("orderStep").classList.toggle("hidden", !selTypes().includes("s_order")); }
// 듣고 빈칸 쓰기 난이도 한 줄: 쉬움 = 단어 상자 + 첫 글자 · 보통 = 단어 상자 · 어려움 = 상자 없이 받아쓰기
function setLevel(l){
  document.querySelectorAll("#lvl button").forEach(b=>b.classList.toggle("on", b.dataset.l===l));
  save({lvl:l}); render();
}
function level(){ return (document.querySelector("#lvl .on")||{dataset:{l:"normal"}}).dataset.l; }
function bankOn(){ return level()!=="hard"; }
function hintOn(){ return level()==="easy"; }
function blanksN(){ return 2; }   // 문장당 2개 고정(짧은 문장은 자동으로 1개, 사용자 결정)
function setUnits(list){ document.querySelectorAll("#units input").forEach(c=>{ c.checked=list.includes(+c.value); c.parentNode.classList.toggle("on",c.checked); }); }
function allUnits(on){ setUnits(on ? curBook().units.map(u=>u.u) : []); showEx(); }
function selUnits(){ return [...document.querySelectorAll("#units input:checked")].map(c=>+c.value); }
function selTypes(){ return [...document.querySelectorAll("#types input:checked")].map(c=>c.value); }
function showTab(t){ TAB=t; $("tabQ").classList.toggle("on",t==="Q"); $("tabA").classList.toggle("on",t==="A"); render(); }

/* ===== 만들기 ===== */
function make(){
  const b=curBook(), units=selUnits(), types=selTypes();
  if(!units.length){ alert("유닛을 하나 이상 골라 주세요."); return; }
  if(!types.length){ alert("유형을 하나 이상 골라 주세요."); return; }
  save({book:b.code, acad:$("acad").value.trim(), types:{...(load().types||{}), [b.kind]:types}});
  const sets=buildSets(b, units, types);
  if(!sets.length){ alert("고른 유닛에는 이 유형으로 만들 문제가 없어요. 유닛이나 유형을 바꿔 주세요."); return; }
  CUR={book:b, units, sets};
  render();
  if(window.innerWidth<900) document.querySelector(".bar").scrollIntoView({behavior:"smooth"});   // 휴대폰·좁은 화면: 결과로 내려가기
}
function buildSets(b, units, types){
  const W=[], S=[], seen=new Set();
  b.units.filter(u=>units.includes(u.u)).forEach(u=>{
    u.words.forEach(w=>{ const k=w.e.toLowerCase(); if(!seen.has(k)){ seen.add(k); W.push(w); } });
    u.sents.forEach(s=>S.push({...s, _uw:u.words}));
  });
  const pn=allProper();
  const sets=[];
  types.forEach(t=>{
    const rnd=mulberry32(seedFrom(b.code+"|"+units.join(",")+"|"+t));
    let items=[];
    if(t==="w_mean")  items=shuffle(W.filter(w=>w.k),rnd).map(w=>({q:w.e, a:w.k}));
    if(t==="w_spell"){   // 뜻이 같은 단어가 둘 이상(되다 = get·turn·become)이면 첫 글자를 함께 보여 줌
      const cnt={}; W.forEach(w=>{ if(w.k) cnt[w.k]=(cnt[w.k]||0)+1; });
      items=shuffle(W.filter(w=>w.k),rnd).map(w=>({q:w.k, a:w.e, h: cnt[w.k]>1 ? w.e[0] : ""}));
    }
    if(t==="s_trans") items=S.map(s=>({q:s.e, a:s.k}));
    if(t==="s_write") items=S.map(s=>({q:s.k, a:s.e}));   // 문장 쓰기(스펠링 시험): 우리말 → 영어 문장 통째로
    if(t==="s_order"){ const om=oMode(); items=S.map(s=>({q:s.ck&&s.ck.length>1?s.ck.join(" / "):s.k, mix:orderMix(s,om,rnd,pn), a:s.e})); }
    if(t==="s_listen") items=listenItems(b, units, blanksN(), pn);
    if(items.length) sets.push({t, items, bank: t==="s_listen" ? wordBank(items, W, S, rnd, pn) : null,
      ctx: t==="s_listen" ? {W, S, pn, seed:seedFrom(b.code+"|"+units.join(",")+"|bank")} : null});
  });
  return sets;
}
// 문장 가운데에 대문자로 나오는 낱말 = 고유명사(섞을 때 소문자로 바꾸지 않음)
// 시리즈 전체(모든 책의 문장·단어)에서 소문자로 한 번이라도 쓰인 낱말 = 일반 단어
let LOWER=null;
function lowerWords(){
  if(LOWER) return LOWER;
  LOWER=new Set();
  const add=t=>t.split(/\s+/).forEach(w=>{ const x=w.replace(/[^A-Za-z'’]/g,""); if(/^[a-z]/.test(x)) LOWER.add(x.toLowerCase()); });
  GEN_BOOKS.forEach(b=>b.units.forEach(u=>{ u.sents.forEach(s=>add(s.e)); u.words.forEach(w=>add(w.e)); }));
  return LOWER;
}
function isCommon(x){   // 소문자로 쓰인 적 있는 일반 단어인가(복수·-ing·-ed·소유격·축약 꼴도 기본형으로 확인)
  const low=lowerWords(), w=x.toLowerCase().replace(/’/g,"'");
  const base=w.replace(/'(s|re|ll|ve|d|m|t)$/,"").replace(/n't$/,"");
  const cands=[w, base, base.replace(/ies$/,"y"), base.replace(/es$/,""), base.replace(/s$/,""),
    base.replace(/ing$/,""), base.replace(/ing$/,"e"), base.replace(/([a-z])\1ing$/,"$1"), base.replace(/ed$/,""), base.replace(/ed$/,"e"), base.replace(/ly$/,"")];
  return cands.some(c=>c && low.has(c));
}
const TITLES=new Set(["Mr","Mrs","Ms","Dr","St"]);
const INTERJ=new Set(["Oh","Okay","OK","Hi","Hello","Yes","No","Wow","Thanks","Please","Sorry","Well","Hey","Bye"]);   // 대화 속 대문자지만 일반 단어
const NAMES=new Set(["Jim","Cindy"]);   // 문장 맨 앞에만 나와 규칙으로 못 잡는 이름(스타터2·기본1)
let ALLPN=null;
function allProper(){   // 시리즈 전체 고유명사(한 책에서 문장 맨 앞에만 나와도 다른 책 문장 가운데에서 잡힘)
  if(!ALLPN){ ALLPN=new Set(); GEN_BOOKS.forEach(b=>properNouns(b).forEach(x=>ALLPN.add(x))); NAMES.forEach(x=>ALLPN.add(x)); }
  return ALLPN;
}
function properNouns(b){
  // 문장 가운데에서 대문자로 쓰였고(인용부호 뒤 첫 단어 제외) 일반 단어가 아닌 것만 고유명사(Seoul·Edison 등).
  // 문장 맨 앞 단어는 이 목록에 있을 때만 대문자로 남김
  const set=new Set(["I"]);
  b.units.forEach(u=>u.sents.forEach(s=>s.e.split(/\s+/).forEach((w,i)=>{
    if(i===0 || /^[“"‘']/.test(w)) return;
    const x=w.replace(/[^A-Za-z'’]/g,"").replace(/['’]s$/,"");
    if(/^[A-Z]/.test(x) && !isCommon(x) && !INTERJ.has(x)) set.add(x);
  })));
  return set;
}
// 듣고 빈칸 쓰기: 번호를 음원(스튜디오) 번호와 같게 — 음원이 여러 문장을 한 덩어리로 묶은 유닛은 ag 대로 합침.
// 여러 유닛을 고르면 번호 앞에 유닛(3-5). 문장마다 빈칸 n개는 그대로.
function listenItems(b, units, n, pn){
  const out=[], multi=units.length>1;
  b.units.filter(u=>units.includes(u.u)).forEach(u=>{
    const groups=u.ag || u.sents.map((_,i)=>[i,i+1]);
    groups.forEach(([a,z,n1,n2],gi)=>{   // n1~n2 = 음원 번호(음원이 한 문장을 둘로 나눴으면 3·4)
      const num = n1 ? (n2>n1 ? `${n1}·${n2}` : `${n1}`) : `${gi+1}`;
      let sent="", blanks=[];
      for(let i=a;i<z;i++){
        const st={...u.sents[i], _uw:u.words}, off=sent ? sent.length+1 : 0;
        listenBlanks(st, n, pn).forEach(x=>blanks.push({...x, s:x.s+off, e:x.e+off}));
        sent = sent ? sent+" "+st.e : st.e;
      }
      if(blanks.length) out.push({sent, blanks, u:u.u, lab: multi ? `${u.u}-${num}` : num});
    });
  });
  return out;
}
// 어순 배열 섞기 — 대소문자 규칙은 전체 단어 섞기와 같음(고유명사·I만 대문자)
function caseWords(raw, pn){
  const isPN=w=>{ const x=w.replace(/['’]s$/,""); return pn.has(x) || TITLES.has(x); };
  return raw.map((w,i)=>{
    if(/^I(['’]|$)/.test(w) || isPN(w)) return w;
    const cap=k=>k>0 && raw[k] && /^[A-Z]/.test(raw[k]) && raw[k]!=="I" && !INTERJ.has(raw[k]);
    if(cap(i) && (cap(i-1) || cap(i+1))) return w;
    const nx=raw[i+1];
    if(/^[A-Z]/.test(w) && !INTERJ.has(w) && nx && nx!=="I" && /^[A-Z]/.test(nx) && isPN(nx) && !isCommon(w)) return w;
    return w.toLowerCase();
  });
}
function chunkWords(c){ return c.replace(/[“”"]/g,"").split(/\s+/).map(w=>w.replace(/^[^A-Za-z0-9'’]+|[^A-Za-z0-9'’]+$/g,"")).filter(Boolean); }
function orderMix(s, mode, rnd, pn){
  const ch=(s.c||[]).filter(Boolean);
  if(mode==="all" || ch.length<2) return scramble(s.e, rnd, pn);
  const groups=ch.map(chunkWords), flat=caseWords(groups.flat(), pn);
  let k=0; const cased=groups.map(g=>g.map(()=>flat[k++]));
  if(mode==="inner"){   // 덩어리 순서는 그대로, 덩어리 안 단어만 섞기(한 낱말 덩어리는 그대로)
    return cased.map(g=>{ let m=g; for(let t=0;t<6 && g.length>1 && m.join(" ")===g.join(" ");t++) m=shuffle(g,rnd); return "["+m.join(" ")+"]"; }).join("  ");
  }
  const txt=cased.map(g=>g.join(" ")); let m=txt;   // chunk: 덩어리째 섞기
  for(let t=0;t<6 && m.join("|")===txt.join("|");t++) m=shuffle(txt,rnd);
  return m.join(" / ");
}
// 어순 배열: 문장부호를 떼고 소문자로(고유명사·I 제외) 섞어 " / "로 잇기 — C&S 초상세2 방식
function scramble(e, rnd, pn){
  const toks=e.replace(/[“”"]/g,"").split(/\s+/).map(o=>({o, w:o.replace(/^[^A-Za-z0-9'’]+|[^A-Za-z0-9'’]+$/g,"")})).filter(t=>t.w);
  const raw=toks.map(t=>t.w);
  const brk=k=>/[.!?,;:]$/.test(toks[k].o);   // 이 낱말 뒤에 문장부호가 있으면 다음 낱말과 이어진 이름이 아님
  const isPN=w=>{ const x=w.replace(/['’]s$/,""); return pn.has(x) || TITLES.has(x); };
  const ws=raw.map((w,i)=>{
    if(/^I(['’]|$)/.test(w) || isPN(w)) return w;
    // 문장 가운데 대문자 낱말이 이어지면 한 덩어리 고유명사(Boxing Day·New Year·World Cup)
    const cap=k=>k>0 && raw[k] && /^[A-Z]/.test(raw[k]) && raw[k]!=="I" && !INTERJ.has(raw[k]);
    if(cap(i) && ((cap(i-1) && !brk(i-1)) || (cap(i+1) && !brk(i)))) return w;
    // 이름 + 성(Thomas Edison·Warren Harding): 바로 뒤가 고유명사이고 이 낱말도 일반 단어가 아니면 이름
    const nx=raw[i+1];
    if(/^[A-Z]/.test(w) && !INTERJ.has(w) && nx && nx!=="I" && /^[A-Z]/.test(nx) && isPN(nx) && !isCommon(w)) return w;
    return w.toLowerCase();
  });
  let mix=ws; for(let k=0;k<6 && mix.join(" ")===ws.join(" ");k++) mix=shuffle(ws,rnd);
  return mix.join(" / ");
}

/* ===== 듣고 빈칸 쓰기 ===== */
const STOP=new Set("the a an and or but is am are was were be been to of in on at by for with from up as it its he she we you they i me my your his her our their them him us this that these those there here not no do does did have has had will can so if than then very too what who when where how why yes".split(" "));
function inflections(w){
  const v=new Set([w,w+"s",w+"es",w+"d",w+"ed",w+"ing",w+"er",w+"est"]);
  if(/e$/.test(w)) v.add(w.slice(0,-1)+"ing");
  if(/[^aeiou]y$/.test(w)){ v.add(w.slice(0,-1)+"ies"); v.add(w.slice(0,-1)+"ied"); }
  if(/[^aeiou][aeiou][^aeiouwxy]$/.test(w)){ const c=w.slice(-1); v.add(w+c+"ed"); v.add(w+c+"ing"); }
  return v;
}
// 이번 유닛 단어(한 낱말짜리, 불규칙 '(gave)' 꼴 포함)의 변화형 모음
function unitForms(words){
  const f=new Set();
  // w.f = 원천에 함께 적힌 바뀐 꼴(came·wore 등) — 시험엔 원형만 나오지만 문장 속 과거형도 유닛 단어로 알아봄
  words.forEach(w=>[w.e, ...(w.f||[])].forEach(e=>e.replace(/[~?!.,]/g," ").split(/[()]/).forEach(part=>{ const x=part.trim().toLowerCase(); if(/^[a-z']+$/.test(x) && x.length>=3) inflections(x).forEach(v=>f.add(v)); })));
  return f;
}
// 문장에서 빈칸 n개: 유닛 단어 먼저, 그다음 긴 내용어 · 기능어·고유명사 제외 · 짧은 문장은 낱말의 절반까지
function listenBlanks(s, n, pn){
  const toks=[...s.e.matchAll(/[A-Za-z][A-Za-z'’]*/g)].map((m,i)=>({t:m[0], s:m.index, e:m.index+m[0].length, i}));
  const uf=unitForms(s._uw||[]);
  const cands=toks.filter(t=>t.t.length>=3 && !STOP.has(t.t.toLowerCase()) && t.t!=="I" &&
      !pn.has(t.t.replace(/['’]s$/,"")) && !(/^[A-Z]/.test(t.t) && (t.i>0 || !isCommon(t.t))))   // 대문자 낱말은 문장 첫 일반 단어만(Andres 같은 이름 제외)
    .map(t=>({...t, pri:(uf.has(t.t.toLowerCase())?100:0)+t.t.length}))
    .sort((a,b)=>b.pri-a.pri || a.s-b.s);
  const k=Math.min(n, cands.length, Math.max(1, Math.floor(toks.length/2)));
  return cands.slice(0,k).sort((a,b)=>a.s-b.s);
}
// 단어 상자: 정답 + 함정(정답 수의 약 20%, 2~5개 · 같은 유닛 단어나 다른 문장의 내용어), 알파벳순
function wordBank(items, W, S, rnd, pn){
  const low=t=>pn.has(t.replace(/['’]s$/,"")) ? t : t.toLowerCase();
  const ans=[...new Set(items.flatMap(x=>x.blanks.map(b=>low(b.t))))];
  const used=new Set(ans.map(a=>a.toLowerCase()));
  const pool=[...new Set([
    ...W.map(w=>w.e).filter(e=>/^[A-Za-z]+$/.test(e) && e.length>=3),
    ...S.flatMap(s=>(s.e.match(/[A-Za-z][A-Za-z'’]*/g)||[])).filter(t=>t.length>=4 && !STOP.has(t.toLowerCase()) && !/^[A-Z]/.test(t)),
  ].map(low))].filter(t=>!used.has(t.toLowerCase()) && !STOP.has(t.toLowerCase()));
  // 정답의 다른 꼴(dot↔dots, celebrate↔celebrates)은 함정에서 뺌 — 둘 다 맞아 보여 헷갈리기만 함
  const stem=w=>{ w=w.toLowerCase().replace(/['’]s$/,""); return w.replace(/(ies|es|s|ed|ing|d)$/,"").replace(/e$/,""); };
  const ansStems=new Set(ans.map(stem));
  const nTrap=Math.max(2, Math.min(5, Math.round(ans.length*0.2)));
  let traps=shuffle(pool.filter(t=>!ansStems.has(stem(t))),rnd).slice(0,nTrap);
  if(traps.length<nTrap){   // 고른 유닛 단어가 모두 정답이면 같은 책 다른 유닛 단어에서 채움
    const more=curBook().units.flatMap(u=>u.words.map(w=>w.e)).filter(e=>/^[A-Za-z]+$/.test(e) && e.length>=3 && !STOP.has(e.toLowerCase()))
      .map(low).filter(t=>!used.has(t.toLowerCase()) && !ansStems.has(stem(t)) && !traps.includes(t));
    traps=traps.concat(shuffle([...new Set(more)],rnd).slice(0,nTrap-traps.length));
  }
  return ans.concat(traps).sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
}

/* ===== 미리보기 · 쪽 나누기 ===== */
function unitBig(us){   // 머리말 큰 숫자: 04 · 02–03 · 2, 5
  const s=us.slice().sort((a,b)=>a-b), p=n=>String(n).padStart(2,"0");
  const run=s.every((v,i)=>i===0||v===s[i-1]+1);
  return s.length===1 ? p(s[0]) : run ? p(s[0])+"–"+p(s[s.length-1]) : s.join(", ");
}
// 쓰는 줄 수: 정답을 손글씨로 쓸 때의 길이(인쇄 14px 기준 우리말 1.7배·영어 1.5배)를 줄 폭으로 나눔, 1~3줄
let MCTX=null;
function nLines(text, ko){
  MCTX=MCTX||document.createElement("canvas").getContext("2d");
  MCTX.font = ko ? "500 14px 'Wanted Sans', Pretendard, sans-serif" : "600 14px 'Wanted Sans', sans-serif";
  const mx={narrow:28, wide:58}[load().margin]||42;                // 쪽 좌우 여백(pt)
  const linePx=(595-2*mx-19)*96/72;                                   // 쓰는 줄 폭(px)
  return Math.max(1, Math.min(3, Math.ceil(MCTX.measureText(text).width*(ko?1.7:1.5)/linePx)));
}
function unitLabel(us){
  const s=us.slice().sort((a,b)=>a-b);
  const run=s.every((v,i)=>i===0||v===s[i-1]+1);
  return "Unit "+(s.length===1?s[0]: run? s[0]+"–"+s[s.length-1] : s.join(", "));
}
const NOTE={s_order:"※ 주어진 단어를 바르게 배열하여 문장을 쓰세요.", s_listen:"※ 음원을 듣고 빈칸에 알맞은 단어를 상자에서 골라 쓰세요."};
const NOTE_LSN_NOBANK="※ 음원을 듣고 빈칸에 알맞은 단어를 쓰세요.";
function fitZoom(){   // A4(794px)가 미리보기 칸보다 넓으면 줄여 보이기
  const w=$("preview").clientWidth-40;
  $("preview").style.setProperty("--z", Math.min(1, Math.max(.35, w/794)).toFixed(3));
}
window.addEventListener("resize", fitZoom);
function render(){
  const bar=document.querySelector(".bar"); if(bar) bar.classList.toggle("off", !CUR);   // 만들기 전엔 문제지/정답지·인쇄 흐리게
  if(!CUR){ renderExamples(); return; }
  if(document.fonts && document.fonts.status!=="loaded"){ document.fonts.ready.then(render); return; }   // 글꼴이 다 온 뒤에 쪽 나누기
  fitZoom();
  renderTo($("preview"), TAB==="A");
}
// 정답지 함께 인쇄: 인쇄 직전에 문제지 + 정답지를 따로 그려 붙이고, 끝나면 지움(쪽번호는 각각 1 / N)
function setBoth(){ save({both:$("both").checked}); }
function preparePrint(){
  const pa=$("printall"); pa.innerHTML="";
  if(!CUR || !$("both").checked){ document.body.classList.remove("pa"); return; }
  const q=document.createElement("div"), a=document.createElement("div"); pa.appendChild(q); pa.appendChild(a);
  renderTo(q,false); renderTo(a,true); document.body.classList.add("pa");
}
window.addEventListener("beforeprint", preparePrint);
window.addEventListener("afterprint", ()=>{ document.body.classList.remove("pa"); $("printall").innerHTML=""; });
function renderTo(host, ans){
  const acad=$("acad").value.trim();
  host.innerHTML="";
  CUR.sets.forEach((set,si)=>{
    const title=`<span class="bk">${esc(CUR.book.name)}</span><span class="tk">${TNAME[set.t]}</span>${ans?`<span class="tag">정답</span>`:""}`;
    const cols=COLS[set.t], pages=[];
    const newPage=()=>{
      const pg=document.createElement("div");
      pg.className="pg"+(ans?" ans":"");
      pg.innerHTML=`<div class="hd"><span class="bd"><small>UNIT</small>${unitBig(CUR.units)}</span><span class="tt">${title}</span>${acad?`<span class="ac">${esc(acad)}</span>`:""}</div>
        ${set.t==="s_listen" ? `<div class="note lsn"><span>${bankOn()?NOTE.s_listen:NOTE_LSN_NOBANK}</span><span class="qrs"></span></div>`
          : set.t==="s_order"&&!ans&&!pages.length ? `<div class="note">${OMODES[oMode()]}</div>`
          : NOTE[set.t]&&!ans&&!pages.length ? `<div class="note">${NOTE[set.t]}</div>` : ""}
        <div class="bodyc c${cols}">${"<div class='col'></div>".repeat(cols)}</div><div class="ft">${LOGO}<span class="pn">1</span></div>`;   // 쪽번호 자리를 미리 차지(채우는 동안과 높이 같게)
      host.appendChild(pg); pages.push(pg); return pg;
    };
    let pg=newPage(), ci=0, col=pg.querySelector(".col");
    // 듣고 빈칸 쓰기: 쪽마다 맨 위에 '그 쪽 문장의 정답 + 함정' 단어 상자(여러 유닛을 골라도 상자가 커지지 않게).
    // 함정은 쪽 번호로 정해지는 시드라 문제지·정답지가 같은 상자·같은 쪽 나눔이 됨
    const byPage=!!set.ctx && bankOn();
    let bankEl=null, onPage=[];
    const fillBank=()=>{ const ws=onPage.length ? wordBank(onPage, set.ctx.W, set.ctx.S, mulberry32(set.ctx.seed+pages.length*7919), set.ctx.pn) : [];
      bankEl.innerHTML=ws.map(w=>`<span>${esc(w)}</span>`).join(""); };
    const startBank=()=>{ if(!byPage) return; bankEl=document.createElement("div"); bankEl.className="bank"; col.appendChild(bankEl); onPage=[]; };
    startBank();
    set.items.forEach((it,i)=>{
      const el=document.createElement("div"); el.className="it "+set.t; el.innerHTML=itemHTML(set.t,it,it.lab||i+1,ans);
      if(it.u) el.dataset.u=it.u;
      if(byPage){ onPage.push(it); fillBank(); }
      col.appendChild(el);
      const minKids = byPage ? 2 : 1;   // 상자만 있는 쪽은 만들지 않음
      if(col.scrollHeight>col.clientHeight+1 && col.children.length>minKids){   // 넘치면 다음 단 → 다음 쪽
        col.removeChild(el);
        if(byPage){ onPage.pop(); fillBank(); }
        if(++ci>=cols){ pg=newPage(); ci=0; }
        col=pg.querySelectorAll(".col")[ci];
        startBank();
        if(byPage){ onPage.push(it); fillBank(); }
        col.appendChild(el);
      }
    });
    if(cols>1) balance(pages[pages.length-1]);   // 마지막 쪽은 단마다 고르게(한쪽 단만 차지 않게)
    if(set.t==="s_listen") pages.forEach(p=>{   // 듣기 쪽마다 그 쪽 유닛 음원 QR(자리는 미리 잡아 둬서 쪽 나눔에 영향 없음)
      const us=[...new Set([...p.querySelectorAll(".it[data-u]")].map(e=>+e.dataset.u))].slice(0,3);
      p.querySelector(".qrs").innerHTML=us.map(u=>`<span class="qr">${qrSVG(STUDIO_URL+"?c="+CUR.book.studio+"u"+String(u).padStart(2,"0")+"s&dict=1")}<small>${us.length>1?"U"+u+" ":""}음원</small></span>`).join("");
    });
  });
  // 쪽번호 = 이번에 뽑는 PDF 전체 기준(2 / 8)
  const all=[...host.querySelectorAll(".pg")];
  all.forEach((p,k)=>p.querySelector(".ft .pn").textContent = `${k+1} / ${all.length}`);
}
function renderExamples(){
  const host=$("preview"); if(!host || !$("book").value) return;
  const b=curBook(), us=selUnits().length ? selUnits() : [b.units[0].u], chosen=new Set(selTypes());
  const sets=buildSets(b, [us[0]], TYPES_R.map(t=>t[0]));
  host.innerHTML=`<div class="exs"><div class="exhd"><b>유형 미리보기</b><span>${esc(b.name)} · Unit ${us[0]}</span><small>카드를 눌러 고르고, 왼쪽 아래 <b>워크북 만들기</b>를 누르세요.</small></div>
    <div class="exgrid">${TYPES_R.map(([id,nm])=>{
      const set=sets.find(x=>x.t===id); if(!set) return "";
      const n = id==="s_order"||id==="s_trans"||id==="s_write"||id==="s_listen" ? 2 : 3;
      const its=set.items.slice(0,n);
      const bank = set.bank && bankOn() ? `<div class="bank">${[...new Set(its.flatMap(x=>x.blanks.map(k=>k.t.toLowerCase())))].concat(set.bank.filter(w=>!its.some(x=>x.blanks.some(k=>k.t.toLowerCase()===w.toLowerCase()))).slice(0,2)).sort().map(w=>`<span>${esc(w)}</span>`).join("")}</div>` : "";
      return `<div class="exc ${chosen.has(id)?"on":""}" onclick="toggleType('${id}')">
        <div class="exh"><span class="ck"></span><b>${nm}</b></div><p>${id==="s_listen"&&!bankOn() ? "음원을 듣고 빈칸을 채워요." : TDESC[id]}</p>
        <div class="exb">${bank}${its.map((it,i)=>`<div class="it ${id}">${itemHTML(id,it,i+1,false)}</div>`).join("")}</div></div>`;
    }).join("")}</div></div>`;
}
function qrSVG(url){
  try{ const q=qrcode(0,"M"); q.addData(url); q.make(); return q.createSvgTag({cellSize:2, margin:0, scalable:true}); }
  catch(e){ return ""; }
}
function balance(pg){
  const cs=[...pg.querySelectorAll(".col")], its=cs.flatMap(c=>[...c.children]);
  const per=Math.ceil(its.length/cs.length);
  cs.forEach((c,i)=>its.slice(i*per,(i+1)*per).forEach(el=>c.appendChild(el)));
  if(cs.some(c=>c.scrollHeight>c.clientHeight+1)){   // 고르게 나눠 넘치면 다 빼고 앞 단부터 다시 채움
    its.forEach(el=>el.remove());
    let ci=0; its.forEach(el=>{ cs[ci].appendChild(el); if(cs[ci].scrollHeight>cs[ci].clientHeight+1 && cs[ci].children.length>1 && ci<cs.length-1){ ci++; cs[ci].appendChild(el); } });
  }
}
function itemHTML(t,it,n,ans){
  const N=`<span class="n">${n}</span>`;
  const line=(a,k)=>ans ? `<div class="ln">${`<span class="a">${esc(a)}</span>`}</div>` : `<div class="ln"></div>`.repeat(k||1);
  switch(t){
    case "s_order":
      return `<div class="row">${N}<span class="q">${esc(it.q)}</span></div><div class="mix">${esc(it.mix)}</div>${line(it.a, nLines(it.a,false))}`;
    case "s_trans":
      return `<div class="row">${N}<span class="q">${esc(it.q)}</span></div>${line(it.a, nLines(it.a,true))}`;
    case "s_write":
      return `<div class="row">${N}<span class="q">${esc(it.q)}</span></div>${line(it.a, nLines(it.a,false))}`;
    case "s_listen": {   // 빈칸 폭 = 손글씨 기준(글자 수에 비례)
      let h="", pos=0;
      it.blanks.forEach(b=>{
        h+=esc(it.sent.slice(pos,b.s));
        const w=`width:${Math.max(38, b.t.length*8.5+14)}pt`;   // 문제지·정답지 같은 폭(쪽 나눔도 같게)
        h+= ans ? `<span class="bl a" style="${w}">${esc(b.t)}</span>`
                : `<span class="bl" style="${w}">${hintOn()?`<i>${esc(b.t[0])}</i>`:""}</span>`;
        pos=b.e;
      });
      return `<div class="row">${N}<span class="q ls">${h+esc(it.sent.slice(pos))}</span></div>`;
    }
    default:   // w_mean · w_spell
      return `<div class="row">${N}<span class="q">${esc(it.q)}</span>${it.h?`<span class="hl">(${esc(it.h)}…)</span>`:""}</div>${line(it.a)}`;
  }
}

boot();
