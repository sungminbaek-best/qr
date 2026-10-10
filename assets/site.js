/* 쏠뷰 공통 스크립트 — 설정·후기·교사 게이트·스크롤 연출 */
window.SOLVEU = {
  STORE: "https://smartstore.naver.com/solveu",
  TALK: "https://talk.naver.com/ct/wfk779v",
  BIZ: "상호 쏠뷰(SolveYou) · 대표 백성민 · 사업자등록번호 872-21-02280 · 통신판매업 신고 제2026-인천부평-0671호 · 이메일 help@solveu.co.kr",
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
  try { if (S.isOK()) document.documentElement.classList.add("authed"); } catch (e) {}   // 인증한 기기: "문자 인증 · 무료" 같은 안내(.na) 숨김
  var LOCK = '<span class="lock" aria-label="인증 필요"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/></svg></span>';
  /* 들어온 경로: ?from=qr&code=… 을 이 탭 동안 기억(선생님 신청·학원 신청 때 함께 보냄) */
  S.ss = function (k) { try { return sessionStorage.getItem(k) || ""; } catch (e) { return ""; } };
  (function () { try { var q = new URLSearchParams(location.search);
    if (q.get("from")) sessionStorage.setItem("solveu_from", q.get("from").slice(0, 20));
    if (q.get("code")) sessionStorage.setItem("solveu_code", q.get("code").slice(0, 30)); } catch (e) {} })();
  var BUYS = ["네이버 스마트스토어", "학원 공급(직거래)", "쿠팡", "온라인 서점", "오프라인 서점·총판", "아직 구매 전"];
  /* 기존 가입자: 구매처를 한 번만 묻는 작은 상자(답하면 다시 안 물음) */
  S.askBuy = function (box) {
    if (!box || box.querySelector(".askbuy")) return;
    var d = document.createElement("div"); d.className = "askbuy";
    d.innerHTML = "<b>한 가지만 여쭤볼게요</b><span>교재를 주로 어디서 구매하시나요?</span><div class=\"bo\">" +
      BUYS.map(function (b) { return "<button type=\"button\">" + S.esc(b) + "</button>"; }).join("") + "</div>";
    $$("button", d).forEach(function (b) { b.addEventListener("click", function () {
      S.api("/api/buy", { buy: b.textContent }).then(function (j) { if (j.ok) d.innerHTML = "<span>감사합니다! 🙂</span>"; }); }); });
    box.appendChild(d);
  };
  /* 인증 전에 선생님 자료를 누르면 바로 인증 화면으로 → 끝나면 보던 자리로(2026-10-08 사용자: 눌러도 반응 없어 보임) */
  /* 인증된 기기면 위 메뉴 '선생님 인증' → '선생님 자료' */
  document.addEventListener("DOMContentLoaded", function () { if (S.isOK && S.isOK()) $$(".nbtn.tlog").forEach(function (a) { a.textContent = "선생님 자료"; a.href = "/library/#teacher"; }); });
  /* 그림을 다 불러온 뒤 #주소로 다시 맞춤(표지 그림 때문에 위치가 밀림) */
  window.addEventListener("load", function () { var h = location.hash; if (h && h.length > 1) { var t = document.getElementById(h.slice(1)); if (t) t.scrollIntoView(); } });
  /* 2026-10-09 세련된 효과: 카드 차례로 · 그림 스며들기 · 교재 표지 기울기 (움직임 줄이기면 안 함) */
  document.addEventListener("DOMContentLoaded", function () {
    var calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calm) return;
    /* 그림: 아직 안 왔으면 숨겼다가 오면 스며들게 */
    $$("img").forEach(function (im) { if (im.complete) return; im.classList.add("ld");
      var on = function () { im.classList.remove("ld"); im.classList.add("fi"); }; im.addEventListener("load", on, { once: true }); im.addEventListener("error", on, { once: true }); });
    /* 카드: 화면 아래쪽에 있는 묶음만, 0.06초씩 차례로 */
    if ("IntersectionObserver" in window) {
      var box = ".stps,.free,.mix ul,.c3s,.bqs,.gsteps,.groad,.cds,.rv3,.uses,.tl4s,.who";
      var io2 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting) return; io2.unobserve(e.target);
        [].forEach.call(e.target.children, function (c) { c.classList.add("stg-on"); });
        setTimeout(function () { [].forEach.call(e.target.children, function (c) { c.classList.remove("stg-i", "stg-on"); c.style.transitionDelay = ""; }); }, 1400); }); }, { rootMargin: "0px 0px -8% 0px" });
      $$(box).forEach(function (g) { if (g.getBoundingClientRect().top < innerHeight * .9) return;
        [].forEach.call(g.children, function (c, i) { if (c.classList.contains("rev")) c.classList.remove("rev"); c.classList.add("stg-i"); c.style.transitionDelay = Math.min(i, 8) * 60 + "ms"; });
        io2.observe(g); });
    }
    /* 교재 페이지 큰 표지: 마우스 따라 살짝 기울기 */
    if (matchMedia("(hover: hover)").matches) $$(".covs2 img").forEach(function (im) {
      im.addEventListener("mousemove", function (e) { var r = im.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        im.classList.add("tilt"); im.style.transform = "rotateY(" + (x * 16).toFixed(1) + "deg) rotateX(" + (-y * 12).toFixed(1) + "deg) translateY(-6px)"; });
      im.addEventListener("mouseleave", function () { im.classList.remove("tilt"); im.style.transform = ""; }); });
  });
  S.toJoin = function (root) { var h = $("#teacher") ? "#teacher" : (root && root.id ? "#" + root.id : "");
    location.href = "/library/join/?next=" + encodeURIComponent(location.pathname + location.search + h); };
  S.gate = function (root) {
    if (!root) return;
    var err = $("#err", root), who = $(".tname", root);
    function paint() {
      var ok = S.isOK(); root.classList.toggle("unlocked", ok); document.documentElement.classList.toggle("authed", ok);
      $$(".libs a", root).forEach(function (a) { ok ? a.setAttribute("href", a.dataset.lib) : a.removeAttribute("href"); });
      var ll = $(".tool.lib .lk", root); if (ll) { if (ok) ll.textContent = "노션에서 열림 →"; else ll.innerHTML = LOCK; }
      $$(".tbtn[data-href]", root).forEach(function (a) { ok ? a.setAttribute("href", a.dataset.href) : a.removeAttribute("href"); });
      $$(".tool[data-href]", root).forEach(function (t) { var lk = $(".lk", t);
        if (ok) { t.setAttribute("href", t.dataset.href); lk.textContent = "열기 →"; } else { t.removeAttribute("href"); lk.innerHTML = LOCK; } });
    }
    var out = $(".relock", root); if (out) out.addEventListener("click", function () { S.api("/api/logout", {}); S.pass(null); paint(); });
    $$(".libs a,.tool[data-href],.tbtn[data-href]", root).forEach(function (a) { a.addEventListener("click", function (ev) {
      if (!S.isOK()) { ev.preventDefault(); S.toJoin(root); } }); });
    /* 잠금 자료(자료실 완성본): 입장권으로 인증 서버에서 받아 새 창에 PDF로 띄움(주소만으로는 못 받음) */
    $$("[data-file]", root).forEach(function (a) { a.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (!S.isOK()) { S.toJoin(root); return; }
      var w = window.open("", "_blank"); err.textContent = "";
      if (w) w.document.write('<p style="font-family:system-ui;text-align:center;margin-top:40vh;color:#667">자료를 여는 중이에요…</p>');
      fetch(S.AUTH + "/api/file?p=" + encodeURIComponent(a.dataset.file), { headers: { Authorization: "Bearer " + S.pass() } }).then(function (r) {
        if (r.status === 401) { S.pass(null); paint(); throw new Error("다시 인증해 주세요."); }
        if (!r.ok) throw new Error("자료를 찾지 못했어요. 잠시 뒤 다시 시도해 주세요.");
        return r.blob();
      }).then(function (b) {
        var u = URL.createObjectURL(new Blob([b], { type: "application/pdf" }));
        if (w) w.location.href = u; else location.href = u;
      }).catch(function (e) { if (w) w.close(); err.textContent = e.message || "잠시 뒤 다시 시도해 주세요."; });
    }); });
    paint();
    /* 선생님 혜택(광고성 정보 수신 동의): 안 받는 중이면 권하는 상자, 받는 중이면 끄기 링크 */
    var pbox = $(".perkbox", root), pon = $(".perkon", root);
    function perks(on) { if (!pbox) return; pbox.hidden = !S.isOK() || on; pon.hidden = !S.isOK() || !on; }
    function setPerk(on, email) {
      return S.api("/api/marketing", { on: on, email: email || "" }).then(function (j) {
        if (j.ok) { err.textContent = ""; perks(j.marketing); } else err.textContent = j.msg || "잠시 뒤 다시 시도해 주세요."; });
    }
    if (pbox) {
      $(".pon", pbox).addEventListener("click", function () { var pm = $(".pmail", pbox); setPerk(true, pm ? (pm.value || "").trim() : ""); });
      $(".poff", pon).addEventListener("click", function () { if (confirm("선생님 혜택 안내를 더 받지 않을까요?")) setPerk(false); });
      if (out) out.addEventListener("click", function () { perks(false); });
    }
    if (S.isOK()) S.api("/api/me").then(function (j) {
      if (j.ok) { if (who) who.textContent = j.teacher.name + " 선생님"; perks(j.teacher.marketing); if (j.teacher.need_buy) S.askBuy($(".gatebox", root)); }
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
    /* 홈에서는 교재 구역이 화면에 있을 때 메뉴 '교재'를 파랗게 */
    var bk = location.pathname.indexOf("/home") === 0 && $("#books"), bl = $('.nav nav a[href="/home/#books"]');
    if (bk && bl && "IntersectionObserver" in window) new IntersectionObserver(function (es) { if (es[0].isIntersecting) bl.setAttribute("aria-current", "page"); else bl.removeAttribute("aria-current"); }, { rootMargin: "-40% 0px -40% 0px" }).observe(bk);
    /* 첫 화면 아래에 있는 요소만 숨겼다가 보일 때 올라오게 (첫 화면·IO 미지원·숨은 탭에선 항상 보임) */
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches || document.visibilityState === "hidden") return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -6% 0px" });
    $$(".rev").forEach(function (el) { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("pre"); io.observe(el); } });
    /* 인쇄할 땐 모두 표시 */
    addEventListener("beforeprint", function () { $$(".rev.pre").forEach(function (el) { el.classList.add("in"); }); });
  });
})();
