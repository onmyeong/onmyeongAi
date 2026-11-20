/*
 * 온명 — 리뷰 · 이벤트 신청
 * 로그인한 누구나 리뷰를 쓰고, 이벤트 기간에는 리뷰 + 인증으로 신청 번호를 받습니다.
 */
(function () {
  'use strict';

  var ONM = window.ONMYEONG, M = ONM.member, esc = M.esc;
  var EV = (ONM.CONFIG.member || {}).event || {};
  function $(id) { return document.getElementById(id); }
  var KIND = { fortune: '2027 신년운세', saju: '일주 리포트', couple: '궁합' };
  var PAGE = 20;
  var state = { kind: '', offset: 0, myReview: null, entry: null };

  // 주소로 ?kind=fortune 이 오면 미리 골라 둡니다
  var q = new URLSearchParams(location.search);
  if (q.get('kind') && KIND[q.get('kind')]) $('rv-kind').value = q.get('kind');

  /* 이벤트 안내 */
  if (EV.open) {
    $('rv-ev-title').textContent = '🎁 ' + EV.title;
    $('rv-ev-desc').textContent = EV.desc;
  } else {
    $('rv-event').classList.add('is-hidden');
  }

  function showError(id, msg) { var b = $(id); b.textContent = msg || ''; b.classList.toggle('is-hidden', !msg); }
  function stars(n) { var s = ''; for (var k = 1; k <= 5; k++) s += k <= n ? '★' : '☆'; return s; }
  function day(t) { var d = new Date(t); return d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate(); }

  /* ───────────── 목록 ───────────── */
  function load(reset) {
    if (!M.enabled) { $('rv-list').innerHTML = '<p class="rv-empty">리뷰 기능을 준비하고 있어요.</p>'; return; }
    if (reset) { state.offset = 0; $('rv-list').innerHTML = ''; }
    var qb = M.client.from('reviews').select('id,user_id,nickname,ilju,kind,rating,body,photo_url,hidden,created_at', { count: 'exact' })
      .eq('hidden', false).order('created_at', { ascending: false }).range(state.offset, state.offset + PAGE - 1);
    if (state.kind) qb = qb.eq('kind', state.kind);
    qb.then(function (r) {
      if (r.error) throw r.error;
      var rows = r.data || [];
      if (reset && !rows.length) $('rv-list').innerHTML = '<p class="rv-empty">아직 리뷰가 없어요. 첫 번째 복채를 남겨 주세요 🧧</p>';
      $('rv-list').insertAdjacentHTML('beforeend', rows.map(item).join(''));
      state.offset += rows.length;
      $('rv-more-row').classList.toggle('is-hidden', state.offset >= (r.count || 0));
      if (reset && r.count) $('rv-summary').textContent = '리뷰 ' + r.count + '개';
    }).catch(function () {
      $('rv-list').innerHTML = '<p class="rv-empty">리뷰를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>';
    });
  }

  function item(r) {
    var mine = M.user && r.user_id === M.user.id;
    return '<article class="card rv-item" data-id="' + r.id + '">' +
      '<div class="rv-head"><span class="rv-stars" aria-label="5점 중 ' + r.rating + '점">' + stars(r.rating) + '</span>' +
        '<b>' + esc(r.nickname || '온명 손님') + '</b>' +
        (r.ilju ? '<span class="badge">' + esc(r.ilju) + ' 일주</span>' : '') +
        '<span class="badge">' + esc(KIND[r.kind] || '') + '</span></div>' +
      '<span class="small">' + day(r.created_at) + (mine ? ' · <button type="button" class="link-btn rv-del">삭제</button>' : '') + '</span>' +
      '<p>' + esc(r.body) + '</p>' +
      (r.photo_url ? '<img src="' + esc(r.photo_url) + '" alt="리뷰 사진" loading="lazy">' : '') +
    '</article>';
  }

  document.querySelector('.rv-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    state.kind = b.getAttribute('data-kind');
    load(true);
  });
  $('rv-more').addEventListener('click', function () { load(false); });

  $('rv-list').addEventListener('click', function (e) {
    var del = e.target.closest('.rv-del'); if (!del) return;
    if (!confirm('이 리뷰를 지울까요?')) return;
    var card = del.closest('.rv-item');
    M.client.from('reviews').delete().eq('id', card.getAttribute('data-id')).then(function (r) {
      if (!r.error) { card.remove(); refreshMine(); }
    });
  });

  /* ───────────── 쓰기 ───────────── */
  $('rv-login').addEventListener('click', function () { M.login('로그인하면 리뷰를 남기고 이벤트에 참여할 수 있어요.'); });

  function upload(bucket, file) {
    if (!file) return Promise.resolve(null);
    if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('사진은 5MB까지 올릴 수 있어요.'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    var path = M.user.id + '/' + Date.now() + '.' + ext;
    return M.client.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type }).then(function (r) {
      if (r.error) throw r.error;
      if (bucket === 'review-photos') return M.client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      return path;
    });
  }

  $('rv-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!M.require()) return;
    var body = $('rv-body').value.trim();
    if (body.length < 2) { showError('rv-error', '한 줄만 적어 주세요.'); return; }
    var rating = Number(document.querySelector('input[name="rv-rating"]:checked').value);
    var btn = $('rv-submit'); btn.disabled = true; btn.textContent = '올리는 중…';
    showError('rv-error', '');
    upload('review-photos', $('rv-photo').files[0]).then(function (url) {
      return M.client.from('reviews').insert({
        user_id: M.user.id,
        nickname: (M.profile && M.profile.nickname) || '온명 손님',
        ilju: (M.profile && M.profile.ilju) || null,
        kind: $('rv-kind').value, rating: rating, body: body, photo_url: url
      }).select().single();
    }).then(function (r) {
      if (r.error) throw r.error;
      $('rv-body').value = ''; $('rv-photo').value = '';
      state.myReview = r.data;
      btn.textContent = '고마워요! 올렸어요 🧧';
      setTimeout(function () { btn.textContent = '리뷰 올리기'; btn.disabled = false; }, 2000);
      load(true);
      showEvent();
    }).catch(function (err) {
      showError('rv-error', (err && err.message) || '리뷰를 올리지 못했어요. 다시 시도해 주세요.');
      btn.disabled = false; btn.textContent = '리뷰 올리기';
    });
  });

  /* ───────────── 이벤트 신청 ───────────── */
  function showEvent() {
    var box = $('ev-box');
    if (!EV.open || !M.user || (!state.myReview && !state.entry)) { box.classList.add('is-hidden'); return; }
    box.classList.remove('is-hidden');
    $('ev-form-wrap').classList.toggle('is-hidden', !!state.entry);
    $('ev-done').classList.toggle('is-hidden', !state.entry);
    if (state.entry) $('ev-code').textContent = state.entry.code;
  }

  $('ev-submit').addEventListener('click', function () {
    if (!M.require()) return;
    var url = $('ev-url').value.trim(), file = $('ev-img').files[0];
    if (!url && !file) { showError('ev-error', '게시물 링크나 스토리 캡처 중 하나를 넣어 주세요.'); return; }
    if (url && !/^https?:\/\/(www\.)?instagram\.com\//i.test(url)) { showError('ev-error', '인스타그램 게시물 주소를 넣어 주세요.'); return; }
    if (!$('ev-agree').checked) { showError('ev-error', '보관 동의에 체크해 주세요.'); return; }
    var btn = this; btn.disabled = true; btn.textContent = '신청하는 중…';
    showError('ev-error', '');
    upload('event-proofs', file).then(function (path) {
      return M.client.from('event_entries').insert({
        user_id: M.user.id, event: EV.id, review_id: state.myReview ? state.myReview.id : null,
        proof_url: url || null, proof_path: path
      }).select().single();
    }).then(function (r) {
      if (r.error) {
        if (r.error.code === '23505') throw new Error('이미 신청하셨어요. 마이페이지에서 번호를 확인해 주세요.');
        throw r.error;
      }
      state.entry = r.data;
      showEvent();
    }).catch(function (err) {
      showError('ev-error', (err && err.message) || '신청하지 못했어요. 다시 시도해 주세요.');
    }).then(function () { btn.disabled = false; btn.textContent = '신청하고 번호 받기'; });
  });

  /* 로그인 상태에 따라 쓰기 칸 · 이벤트 칸을 바꿉니다 */
  function refreshMine() {
    if (!M.user) { state.myReview = null; state.entry = null; showEvent(); return Promise.resolve(); }
    return Promise.all([
      M.client.from('reviews').select('id').eq('user_id', M.user.id).order('created_at', { ascending: false }).limit(1),
      M.client.from('event_entries').select('code,status').eq('user_id', M.user.id).eq('event', EV.id || '').maybeSingle()
    ]).then(function (res) {
      state.myReview = res[0].data && res[0].data[0] || null;
      state.entry = res[1].data || null;
      showEvent();
    }).catch(function () { /* 조용히 넘어갑니다 */ });
  }

  function onUser() {
    $('rv-guest').classList.toggle('is-hidden', !!M.user);
    $('rv-form').classList.toggle('is-hidden', !M.user);
    refreshMine();
  }
  M.onChange(onUser);
  M.ready.then(function () { onUser(); load(true); });
})();
