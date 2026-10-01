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
  ["s_trans", "문장 해석",     "영어 문장 → (우리말)",             false],
  ["s_order", "어순 배열",     "우리말 + 섞인 단어 → (영어 문장)", false],
];
const TNAME = Object.fromEntries(TYPES_R.map(t=>[t[0],t[1]]));
// 유형별 단 수(C&S 워크북처럼 짧은 것은 여러 단, 문장은 1단, 어순배열은 2단)
const COLS = {w_mean:2, w_spell:2, s_trans:1, s_order:2};

let CUR=null, TAB="Q";

/* ===== 게이트 ===== */
function getPass(){ try{ return localStorage.getItem(PASS_KEY)||""; }catch(e){ return ""; } }
function boot(){
  try{ localStorage.removeItem("jeol_teacher_ok"); }catch(e){}   // 옛 교사 코드(2026-09-30 폐지)
  // 내 컴퓨터에서 미리보기(localhost)할 때만 인증 생략 — 실제 사이트(solveu.co.kr)는 그대로 잠김
  if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){ openApp(); return; }
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
  /* 주소로 책·유닛 지정(QR 음원 화면·자료실에서 옴): ?book=ph1&u=3 (음원 코드나 생성기 코드 둘 다) */
  const QS=new URLSearchParams(location.search), qb=QS.get("book"), qu=parseInt(QS.get("u"));
  const qbook=qb && GEN_BOOKS.find(b=>b.code===qb||b.studio===qb);
  if(qbook) $("book").value=qbook.code;
  onBook();
  if(qbook && qu && qbook.units.some(x=>x.u===qu)) setUnits([qu]);
}
function onBook(){
  const b=curBook(), sv=load();
  $("units").innerHTML = b.units.map(u=>`<label title="${esc(u.label||"")}"><input type="checkbox" value="${u.u}" onchange="this.parentNode.classList.toggle('on',this.checked)">${u.u}</label>`).join("");
  setUnits([b.units[0].u]);
  const chosen = sv.types && sv.types[b.kind];
  $("types").innerHTML = TYPES_R.map(([id,nm,ex,def])=>{
    const on = chosen ? chosen.includes(id) : def;
    return `<label class="ty ${on?"on":""}"><input type="checkbox" value="${id}" ${on?"checked":""} onchange="this.parentNode.classList.toggle('on',this.checked)">
      <span><b>${nm}</b><small>${esc(ex)}</small></span></label>`; }).join("");
  CUR=null; $("preview").innerHTML=`<div class="empty">유닛과 유형을 고르고 <b>만들기</b>를 눌러 주세요.</div>`;
}
function setUnits(list){ document.querySelectorAll("#units input").forEach(c=>{ c.checked=list.includes(+c.value); c.parentNode.classList.toggle("on",c.checked); }); }
function allUnits(on){ setUnits(on ? curBook().units.map(u=>u.u) : []); }
function selUnits(){ return [...document.querySelectorAll("#units input:checked")].map(c=>+c.value); }
function selTypes(){ return [...document.querySelectorAll("#types input:checked")].map(c=>c.value); }
function showTab(t){ TAB=t; $("tabQ").classList.toggle("on",t==="Q"); $("tabA").classList.toggle("on",t==="A"); render(); }

/* ===== 만들기 ===== */
function make(){
  const b=curBook(), units=selUnits(), types=selTypes();
  if(!units.length){ alert("유닛을 하나 이상 골라 주세요."); return; }
  if(!types.length){ alert("유형을 하나 이상 골라 주세요."); return; }
  save({book:b.code, acad:$("acad").value.trim(), types:{...(load().types||{}), [b.kind]:types}});
  const W=[], S=[], seen=new Set();
  b.units.filter(u=>units.includes(u.u)).forEach(u=>{
    u.words.forEach(w=>{ const k=w.e.toLowerCase(); if(!seen.has(k)){ seen.add(k); W.push(w); } });
    u.sents.forEach(s=>S.push(s));
  });
  const pn=properNouns(b);
  const sets=[];
  types.forEach(t=>{
    const rnd=mulberry32(seedFrom(b.code+"|"+units.join(",")+"|"+t));
    let items=[];
    if(t==="w_mean")  items=shuffle(W.filter(w=>w.k),rnd).map(w=>({q:w.e, a:w.k}));
    if(t==="w_spell") items=shuffle(W.filter(w=>w.k),rnd).map(w=>({q:w.k, a:w.e}));
    if(t==="s_trans") items=S.map(s=>({q:s.e, a:s.k}));
    if(t==="s_order") items=S.map(s=>({q:s.ck&&s.ck.length>1?s.ck.join(" / "):s.k, mix:scramble(s.e,rnd,pn), a:s.e}));
    if(items.length) sets.push({t, items});
  });
  if(!sets.length){ alert("고른 유닛에는 이 유형으로 만들 문제가 없어요. 유닛이나 유형을 바꿔 주세요."); return; }
  CUR={book:b, units, sets};
  render();
}
// 문장 가운데에 대문자로 나오는 낱말 = 고유명사(섞을 때 소문자로 바꾸지 않음)
function properNouns(b){
  const set=new Set(["I"]);
  b.units.forEach(u=>u.sents.forEach(s=>s.e.split(/\s+/).slice(1).forEach(w=>{
    const x=w.replace(/[^A-Za-z'’]/g,""); if(/^[A-Z]/.test(x)) set.add(x);
  })));
  return set;
}
// 어순 배열: 문장부호를 떼고 소문자로(고유명사·I 제외) 섞어 " / "로 잇기 — C&S 초상세2 방식
function scramble(e, rnd, pn){
  const ws=e.replace(/[“”"]/g,"").split(/\s+/)
    .map(w=>w.replace(/^[^A-Za-z0-9'’]+|[^A-Za-z0-9'’]+$/g,"")).filter(Boolean)
    .map(w=>pn.has(w)||/^I['’]/.test(w) ? w : w.toLowerCase());
  let mix=ws; for(let k=0;k<6 && mix.join(" ")===ws.join(" ");k++) mix=shuffle(ws,rnd);
  return mix.join(" / ");
}

/* ===== 미리보기 · 쪽 나누기 ===== */
function unitLabel(us){
  const s=us.slice().sort((a,b)=>a-b);
  const run=s.every((v,i)=>i===0||v===s[i-1]+1);
  return "Unit "+(s.length===1?s[0]: run? s[0]+"–"+s[s.length-1] : s.join(", "));
}
const NOTE={s_order:"※ 주어진 단어를 바르게 배열하여 문장을 쓰세요."};
function fitZoom(){   // A4(794px)가 미리보기 칸보다 넓으면 줄여 보이기
  const w=$("preview").clientWidth-40;
  $("preview").style.setProperty("--z", Math.min(1, Math.max(.35, w/794)).toFixed(3));
}
window.addEventListener("resize", fitZoom);
function render(){
  if(!CUR) return;
  fitZoom();
  const ans=TAB==="A", acad=$("acad").value.trim(), host=$("preview");
  host.innerHTML="";
  CUR.sets.forEach((set,si)=>{
    const title=`${CUR.book.name}  ${unitLabel(CUR.units)}  ${TNAME[set.t]}${ans?"  [정답]":""}`;
    const cols=COLS[set.t], pages=[];
    const newPage=()=>{
      const pg=document.createElement("div");
      pg.className="pg"+(ans?" ans":"");
      pg.innerHTML=`<div class="hd"><span class="bd">${String(si+1).padStart(2,"0")}</span><span class="tt">${esc(title)}</span>${acad?`<span class="ac">${esc(acad)}</span>`:""}</div>
        ${NOTE[set.t]&&!ans&&!pages.length?`<div class="note">${NOTE[set.t]}</div>`:""}
        <div class="bodyc c${cols}">${"<div class='col'></div>".repeat(cols)}</div><div class="ft">1</div>`;   // 쪽번호 자리를 미리 차지(채우는 동안과 높이 같게)
      host.appendChild(pg); pages.push(pg); return pg;
    };
    let pg=newPage(), ci=0, col=pg.querySelector(".col");
    set.items.forEach((it,i)=>{
      const el=document.createElement("div"); el.className="it "+set.t; el.innerHTML=itemHTML(set.t,it,i+1,ans);
      col.appendChild(el);
      if(col.scrollHeight>col.clientHeight+1 && col.children.length>1){   // 넘치면 다음 단 → 다음 쪽
        col.removeChild(el);
        if(++ci>=cols){ pg=newPage(); ci=0; }
        col=pg.querySelectorAll(".col")[ci];
        col.appendChild(el);
      }
    });
    if(cols>1) balance(pages[pages.length-1]);   // 마지막 쪽은 단마다 고르게(한쪽 단만 차지 않게)
    pages.forEach((p,k)=>p.querySelector(".ft").textContent = pages.length>1 ? `${k+1} / ${pages.length}` : "1");
  });
}
function balance(pg){
  const cs=[...pg.querySelectorAll(".col")], its=cs.flatMap(c=>[...c.children]);
  const per=Math.ceil(its.length/cs.length);
  cs.forEach((c,i)=>its.slice(i*per,(i+1)*per).forEach(el=>c.appendChild(el)));
  if(cs.some(c=>c.scrollHeight>c.clientHeight+1)){   // 드물게 안 맞으면 원래대로 앞 단부터 채움
    let ci=0; its.forEach(el=>{ cs[ci].appendChild(el); if(cs[ci].scrollHeight>cs[ci].clientHeight+1 && cs[ci].children.length>1 && ci<cs.length-1){ ci++; cs[ci].appendChild(el); } });
  }
}
function itemHTML(t,it,n,ans){
  const N=`<span class="n">${n}</span>`;
  const line=a=>`<div class="ln">${ans?`<span class="a">${esc(a)}</span>`:""}</div>`;
  switch(t){
    case "s_order":
      return `<div class="row">${N}<span class="q">${esc(it.q)}</span></div><div class="mix">${esc(it.mix)}</div>${line(it.a)}`;
    default:   // w_mean · w_spell · s_trans
      return `<div class="row">${N}<span class="q">${esc(it.q)}</span></div>${line(it.a)}`;
  }
}

boot();
