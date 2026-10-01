/* 쏠뷰 공통 스크립트 — 설정·후기·교사 게이트·스크롤 연출 */
window.SOLVEU = {
  STORE: "https://smartstore.naver.com/solveu",
  TALK: "https://talk.naver.com/ct/wfk779v",
  BIZ: "상호 쏠뷰(SolveYou) · 대표 백성민",
    REVIEWS: window.SOLVEU_REVIEWS || []   /* /assets/reviews.js (build_site.py가 site_src/reviews.json에서 생성) */
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

  /* 교사 인증(문자 인증 → 개인별 입장권). 서버 = solveu-auth Worker (_QR제작/teacher-auth) */
  S.AUTH = "https://solveu-auth.tjdals85200.workers.dev";
  S.PASS_KEY = "solveu_pass";
  S.pass = function (v) {
    try { if (v === undefined) return localStorage.getItem(S.PASS_KEY) || ""; v ? localStorage.setItem(S.PASS_KEY, v) : localStorage.removeItem(S.PASS_KEY); } catch (e) { return ""; }
  };
  S.api = function (path, body) {
    var h = { "Content-Type": "application/json" }, p = S.pass(); if (p) h.Authorization = "Bearer " + p;
    return fetch(S.AUTH + path, { method: body ? "POST" : "GET", headers: h, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().then(function (j) { j.status = r.status; return j; }); })
      .catch(function () { return { error: "net", msg: "인터넷 연결을 확인해 주세요." }; });
  };
  try { localStorage.removeItem("jeol_teacher_ok"); } catch (e) {}   /* 옛 교사 코드 입장 흔적(2026-09-30 폐지) */

  /* 교사 게이트: 입장권이 있으면 열고, 서버에서 확인해 무효면 다시 잠금 */
  S.isOK = function () { return !!S.pass(); };
  S.gate = function (root) {
    if (!root) return;
    var err = $("#err", root), who = $(".tname", root);
    function paint() {
      var ok = S.isOK(); root.classList.toggle("unlocked", ok);
      $$(".libs a", root).forEach(function (a) { ok ? a.setAttribute("href", a.dataset.lib) : a.removeAttribute("href"); });
      var ll = $(".tool.lib .lk", root); if (ll) ll.textContent = ok ? "노션에서 열림 →" : "인증 필요";
      $$(".tool[data-href]", root).forEach(function (t) { var lk = $(".lk", t);
        if (ok) { t.setAttribute("href", t.dataset.href); lk.textContent = "열기 →"; } else { t.removeAttribute("href"); lk.textContent = "인증 필요"; } });
    }
    var out = $(".relock", root); if (out) out.addEventListener("click", function () { S.api("/api/logout", {}); S.pass(null); paint(); });
    $$(".libs a,.tool[data-href]", root).forEach(function (a) { a.addEventListener("click", function (ev) {
      if (!S.isOK()) { ev.preventDefault(); err.textContent = "먼저 ‘휴대폰으로 입장하기’를 눌러 인증해 주세요."; } }); });
    paint();
    /* 선생님 혜택(광고성 정보 수신 동의): 안 받는 중이면 권하는 상자, 받는 중이면 끄기 링크 */
    var pbox = $(".perkbox", root), pon = $(".perkon", root);
    function perks(on) { if (!pbox) return; pbox.hidden = !S.isOK() || on; pon.hidden = !S.isOK() || !on; }
    function setPerk(on, email) {
      return S.api("/api/marketing", { on: on, email: email || "" }).then(function (j) {
        if (j.ok) { err.textContent = ""; perks(j.marketing); } else err.textContent = j.msg || "잠시 뒤 다시 시도해 주세요."; });
    }
    if (pbox) {
      $(".pon", pbox).addEventListener("click", function () { setPerk(true, ($(".pmail", pbox).value || "").trim()); });
      $(".poff", pon).addEventListener("click", function () { if (confirm("선생님 혜택 안내를 더 받지 않을까요?")) setPerk(false); });
      if (out) out.addEventListener("click", function () { perks(false); });
    }
    if (S.isOK()) S.api("/api/me").then(function (j) {
      if (j.ok) { if (who) who.textContent = j.teacher.name + " 선생님, 반가워요."; perks(j.teacher.marketing); }
      else if (j.status === 401) { S.pass(null); paint(); }   /* 탈퇴·차단·로그아웃된 입장권 */
    });
  };

  document.addEventListener("DOMContentLoaded", function () {
    /* 바깥 사이트(톡톡·스토어)는 새 창 + ↗ 표시 → 쏠뷰 페이지는 원래 창에 그대로 남음 */
    function ext(a) { a.target = "_blank"; a.rel = "noopener"; a.classList.add("ext"); a.title = "새 창에서 열려요"; }
    $$(".talk").forEach(function (a) { a.href = S.TALK; ext(a); });
    $$(".store").forEach(function (a) { if (!a.getAttribute("href")) a.href = S.STORE; ext(a); });
    $$(".biz").forEach(function (e) { e.textContent = S.BIZ; });
    var nav = $("#nav"); if (nav) addEventListener("scroll", function () { nav.classList.toggle("scrolled", scrollY > 8); }, { passive: true });
    /* 첫 화면 아래에 있는 요소만 숨겼다가 보일 때 올라오게 (첫 화면·IO 미지원·숨은 탭에선 항상 보임) */
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches || document.visibilityState === "hidden") return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -6% 0px" });
    $$(".rev").forEach(function (el) { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("pre"); io.observe(el); } });
    /* 인쇄할 땐 모두 표시 */
    addEventListener("beforeprint", function () { $$(".rev.pre").forEach(function (el) { el.classList.add("in"); }); });
  });
})();
