/* 쏠뷰 공통 스크립트 — 설정·후기·교사 게이트·스크롤 연출 */
window.SOLVEU = {
  STORE: "https://smartstore.naver.com/solveu",
  TALK: "https://talk.naver.com/ct/wfk779v",
  CODES: ["jeol2026"],
  OK_KEY: "jeol_teacher_ok",
  BIZ: "상호 쏠뷰(SolveYou) · 대표 백성민",
  /* 스토어 실제 후기(맞춤법만 정리). step = 저절로 단계 slug */
  REVIEWS: [
    {r:"영어학원을 운영하고 있습니다. 파닉스가 약한 초등 고학년 친구들은 모두 이 교재를 활용하고 있어요. 확실히 아이들이 이해하는 게 시간이 흐르면서 눈에 보입니다.",role:"원장",book:"저절로 파닉스",step:"phonics",who:"gogo***"},
    {r:"학원 리딩 교재로 채택할 만큼 좋은 교재입니다. 단어·품사부터 끊어읽기, 기호 표시, 세분화된 해석까지 지문 하나로 꼼꼼하게 공부할 수 있어요.",role:"원장",book:"저절로 입문",step:"intro",who:"nnon***"},
    {r:"리딩을 하려고 할 때 대충 넘길 내용을 이 교재는 꼼꼼히 붙잡아 줍니다. 강사에게도 학생에게도 철저히 짚고 갈 수 있도록 잘 설계된 책입니다.",role:"원장",book:"저절로 브릿지",step:"bridge",who:"theh***"},
    {r:"예비고 아이들이 공부하기 좋은 책이에요. 저절로 시리즈 스튜디오 음원·강의까지 학원에서 쓰기 너무 좋습니다. 앞으로 시리즈별로 다 적용해 보려고요.",role:"선생님",book:"저절로 첫모의고사",step:"mock",who:"kr****"},
    {r:"시중 문법책들은 품사 뜻만 나열되어 있어 아이들이 어려워했는데, 이 책은 문장 속에서 품사를 직접 구별하고 적용하게 해줘요. 이제는 단어를 외울 때 스스로 품사를 말합니다.",role:"학부모",book:"저절로 브릿지",step:"bridge",who:"mo****"},
    {r:"단순히 지문을 읽고 문제를 푸는 방식이 아니라, 문장을 어떻게 이해하고 연결해야 하는지 단계적으로 안내해 줘요. 읽기를 처음 시작하는 학생도 부담 없이 접근할 수 있습니다.",role:"선생님",book:"저절로 기본",step:"basic",who:"de****"},
    {r:"초등 파닉스 이후 교재로 최고입니다. 아이들이 스스로 이해하게 되는 교재예요. 강추합니다.",role:"선생님",book:"저절로 스타터",step:"starter",who:"paks****"},
    {r:"문법이 이렇게 쉽고 간단하다니! 게다가 바로 라이팅까지 잡아 줍니다. 2권, 3권 얼른 계속 만들어 주세요!",role:"선생님",book:"그래머&라이팅",step:"grammar",who:"kimk***"},
    {r:"책을 따라만 해도 실력이 쑥쑥 늘어나는 게 느껴져요. 2주 만에 아이가 읽기 시작하는데 너무 신기합니다.",role:"학부모",book:"저절로 파닉스",step:"phonics",who:"blac****"},
    {r:"고등 모의고사 처음 입문용으로 좋아요. 문장을 분석하는 힘이 생기고 요약하는 법을 익힐 수 있어요.",role:"학부모",book:"저절로 첫모의고사",step:"mock",who:"0628****"}
  ]
};

(function () {
  var S = window.SOLVEU, $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return (r || document).querySelectorAll(s); };
  S.$ = $; S.$$ = $$;
  S.esc = function (s) { return String(s).replace(/[&<>"]/g, function (m) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]; }); };

  /* 후기 카드: el에 list를 그림, show개만 먼저 */
  S.renderReviews = function (el, list, show) {
    if (!el) return;
    el.innerHTML = list.map(function (v, i) {
      return '<div class="rv' + (show && i >= show ? " hide" : "") + '"><div class="st5">★★★★★</div><q>' + S.esc(v.r) + '</q><div class="who"><b>' + S.esc(v.role) + '</b>' + S.esc(v.book) + ' · ' + S.esc(v.who) + '</div></div>';
    }).join("");
  };

  /* 교사 게이트: 같은 키를 모든 페이지가 공유 */
  S.isOK = function () { try { return localStorage.getItem(S.OK_KEY) === "1"; } catch (e) { return false; } };
  S.gate = function (root) {
    if (!root) return;
    function paint() {
      var ok = S.isOK(); root.classList.toggle("unlocked", ok);
      $$(".libs a", root).forEach(function (a) { ok ? a.setAttribute("href", a.dataset.lib) : a.removeAttribute("href"); });
      var ll = $(".tool.lib .lk", root); if (ll) ll.textContent = ok ? "노션에서 열림 →" : "인증 필요";
      $$(".tool[data-href]", root).forEach(function (t) { var lk = $(".lk", t);
        if (ok) { t.setAttribute("href", t.dataset.href); lk.textContent = "열기 →"; } else { t.removeAttribute("href"); lk.textContent = "인증 필요"; } });
    }
    var form = $(".gate", root), code = $("#code", root), err = $("#err", root);
    if (form) form.addEventListener("submit", function (e) { e.preventDefault();
      var v = (code.value || "").trim().toLowerCase();
      if (S.CODES.indexOf(v) >= 0) { try { localStorage.setItem(S.OK_KEY, "1"); } catch (_) {} err.textContent = ""; paint(); }
      else { err.textContent = "코드가 맞지 않아요. 다시 확인해 주세요."; code.select(); } });
    var out = $(".relock", root); if (out) out.addEventListener("click", function () { try { localStorage.removeItem(S.OK_KEY); } catch (_) {} paint(); });
    $$(".libs a,.tool[data-href]", root).forEach(function (a) { a.addEventListener("click", function (ev) {
      if (!S.isOK()) { ev.preventDefault(); code.focus(); err.textContent = "교사 코드를 먼저 입력해 주세요."; } }); });
    paint();
  };

  document.addEventListener("DOMContentLoaded", function () {
    $$(".talk").forEach(function (a) { a.href = S.TALK; a.target = "_blank"; a.rel = "noopener"; });
    $$(".store").forEach(function (a) { if (!a.getAttribute("href")) a.href = S.STORE; a.target = "_blank"; a.rel = "noopener"; });
    $$(".biz").forEach(function (e) { e.textContent = S.BIZ; });
    var nav = $("#nav"); if (nav) addEventListener("scroll", function () { nav.classList.toggle("scrolled", scrollY > 8); }, { passive: true });
    if (!("IntersectionObserver" in window)) { document.documentElement.classList.add("no-io"); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -6% 0px" });
    $$(".rev").forEach(function (el) { io.observe(el); });
    /* 첫 화면에 있는 것은 바로 표시 */
    requestAnimationFrame(function () { $$(".rev").forEach(function (el) { if (el.getBoundingClientRect().top < innerHeight) el.classList.add("in"); }); });
  });
})();
