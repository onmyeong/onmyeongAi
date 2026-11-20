/*
 * 온명 — 회원 (카카오 로그인 · 마이페이지 공통)
 * ------------------------------------------------------------------
 * Supabase 로 로그인과 회원 정보를 다룹니다. 서버 없이 브라우저에서 바로 동작합니다.
 * 모든 페이지 상단 메뉴 끝에 '로그인' 또는 '마이페이지' 버튼을 붙입니다.
 *
 *   ONM.member.ready      → 로그인 상태를 확인한 뒤 끝나는 Promise
 *   ONM.member.user / .profile
 *   ONM.member.login()    → 로그인 창 띄우기
 *   ONM.member.saveBirth(birth, ilju)
 *   ONM.member.onChange(fn)
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG = global.ONMYEONG || {};
  var doc = global.document;
  var cfg = (ONM.CONFIG && ONM.CONFIG.member) || {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var M = ONM.member = {
    enabled: !!(global.supabase && cfg.supabaseUrl && cfg.supabaseKey),
    client: null, user: null, profile: null,
    esc: esc,
    listeners: []
  };

  /* 로그인 방식: implicit
   * 휴대폰에서는 카카오톡 앱이나 인스타·카톡 안의 브라우저를 거쳐 돌아오면서 브라우저가 바뀌는 일이 잦습니다.
   * PKCE 방식은 출발한 브라우저에 남긴 값이 있어야 해서 이때 로그인이 풀립니다.
   * implicit 방식은 돌아온 주소 하나만으로 로그인이 끝나 어느 브라우저로 돌아와도 됩니다. */
  if (M.enabled) {
    M.client = global.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' }
    });
  }

  /* ───────────── 상태 ───────────── */
  function loadProfile() {
    if (!M.user) { M.profile = null; return Promise.resolve(null); }
    return M.client.from('profiles').select('*').eq('id', M.user.id).maybeSingle()
      .then(function (r) { M.profile = r.data || null; return M.profile; })
      .catch(function () { M.profile = null; return null; });
  }

  function emit() {
    renderNav();
    M.listeners.forEach(function (fn) { try { fn(M.user, M.profile); } catch (e) { /* 화면 하나가 실패해도 계속 */ } });
  }

  M.onChange = function (fn) { M.listeners.push(fn); };

  /* 로그인에서 돌아왔는데 실패했다면, 주소에 실린 이유를 화면 위쪽에 보여 줍니다 */
  function showAuthError() {
    var u, msg;
    try { u = new URL(global.location.href); } catch (e) { return; }
    var h = new URLSearchParams((u.hash || '').replace(/^#/, ''));
    msg = u.searchParams.get('error_description') || h.get('error_description') ||
      u.searchParams.get('error') || h.get('error');
    if (!msg) return;
    var bar = doc.createElement('div');
    bar.className = 'notice warn';
    bar.style.cssText = 'margin:0;border-radius:0;text-align:center';
    bar.textContent = '로그인하지 못했어요 — ' + decodeURIComponent(msg.replace(/\+/g, ' '));
    doc.body.insertBefore(bar, doc.body.firstChild);
    ['error', 'error_code', 'error_description'].forEach(function (k) { u.searchParams.delete(k); });
    global.history.replaceState(null, '', u.pathname + (u.search || ''));
  }

  M.ready = !M.enabled ? Promise.resolve(null) : M.client.auth.getSession().then(function (r) {
    if (r.error) M.lastError = r.error.message;
    M.user = r.data && r.data.session ? r.data.session.user : null;
    return loadProfile();
  }).then(function () {
    // 로그인에서 돌아온 직후 주소에 남은 ?code= 를 지웁니다
    try {
      var u = new URL(global.location.href);
      if (u.searchParams.has('code')) {
        u.searchParams.delete('code');
        global.history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
      }
    } catch (e) { /* 무시 */ }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', showAuthError); else showAuthError();
    emit();
    return M.user;
  }).catch(function () { showAuthError(); emit(); return null; });

  if (M.enabled) {
    M.client.auth.onAuthStateChange(function (event, session) {
      var next = session ? session.user : null;
      if ((next && next.id) === (M.user && M.user.id)) return;
      M.user = next;
      loadProfile().then(emit);
    });
  }

  /* ───────────── 로그인 · 로그아웃 ───────────── */
  M.signIn = function (provider, returnTo) {
    if (!M.enabled) return;
    var to = returnTo || global.location.href.split('#')[0];
    return M.client.auth.signInWithOAuth({ provider: provider, options: { redirectTo: to } });
  };

  M.signOut = function () {
    if (!M.enabled) return Promise.resolve();
    return M.client.auth.signOut().then(function () { M.user = null; M.profile = null; emit(); });
  };

  /** 로그인 창 — 이유(why)를 한 줄 띄울 수 있습니다 */
  M.login = function (why) {
    var box = doc.getElementById('onm-login');
    if (!box) {
      box = doc.createElement('div');
      box.id = 'onm-login';
      box.className = 'onm-modal';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-labelledby', 'onm-login-title');
      box.innerHTML =
        '<div class="onm-modal-card">' +
          '<button type="button" class="onm-modal-x" aria-label="닫기">×</button>' +
          '<p class="eyebrow" style="margin:0">ONMYEONG</p>' +
          '<h2 id="onm-login-title" style="margin:6px 0 8px">로그인</h2>' +
          '<p class="small onm-login-why" style="margin:0 0 18px"></p>' +
          '<button type="button" class="onm-btn-kakao" data-provider="kakao">' +
            '<span aria-hidden="true">💬</span> 카카오로 시작하기</button>' +
          (cfg.providers && cfg.providers.indexOf('naver') !== -1
            ? '<button type="button" class="onm-btn-naver" data-provider="naver"><b>N</b> 네이버로 시작하기</button>' : '') +
          '<p class="small" style="margin:16px 0 0">로그인하면 닉네임과 이메일을 받아 회원 정보로 씁니다. ' +
            '<a href="privacy.html">개인정보처리방침</a></p>' +
        '</div>';
      doc.body.appendChild(box);
      box.addEventListener('click', function (e) {
        if (e.target === box || e.target.closest('.onm-modal-x')) box.classList.remove('open');
        var b = e.target.closest('[data-provider]');
        if (b) { b.disabled = true; b.textContent = '이동하는 중…'; M.signIn(b.getAttribute('data-provider')); }
      });
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') box.classList.remove('open'); });
    }
    box.querySelector('.onm-login-why').textContent = why || '로그인하면 내 사주를 저장하고, 리뷰와 이벤트에 참여할 수 있어요.';
    if (!M.enabled) box.querySelector('.onm-login-why').textContent = '로그인 기능을 준비하고 있어요. 조금만 기다려 주세요.';
    box.classList.add('open');
    var first = box.querySelector('[data-provider]');
    if (first) first.focus();
  };

  /** 로그인이 필요하면 창을 띄우고 false, 이미 로그인이면 true */
  M.require = function (why) {
    if (M.user) return true;
    M.login(why);
    return false;
  };

  /* ───────────── 회원 정보 ───────────── */
  M.saveBirth = function (birth, ilju) {
    if (!M.user) return Promise.reject(new Error('로그인이 필요해요'));
    return M.client.from('profiles').update({ birth: birth, ilju: ilju || null }).eq('id', M.user.id)
      .select().maybeSingle().then(function (r) {
        if (r.error) throw r.error;
        M.profile = r.data || M.profile;
        emit();
        return M.profile;
      });
  };

  M.updateNickname = function (nickname) {
    return M.client.from('profiles').update({ nickname: nickname }).eq('id', M.user.id)
      .select().maybeSingle().then(function (r) { if (r.error) throw r.error; M.profile = r.data; emit(); return r.data; });
  };

  /* ───────────── 상단 메뉴 ───────────── */
  function renderNav() {
    var nav = doc.querySelector('.site-nav');
    if (!nav) return;
    var a = nav.querySelector('.nav-member');
    if (!a) {
      a = doc.createElement('a');
      a.className = 'nav-member';
      nav.appendChild(a);
      a.addEventListener('click', function (e) {
        if (!M.user) { e.preventDefault(); M.login(); }
      });
    }
    var here = /mypage\.html$/.test(global.location.pathname);
    if (M.user) {
      a.href = 'mypage.html';
      a.textContent = '마이페이지';
      if (here) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    } else {
      a.href = '#login';
      a.textContent = '로그인';
      a.removeAttribute('aria-current');
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', renderNav);
  else renderNav();
})(typeof window !== 'undefined' ? window : globalThis);
