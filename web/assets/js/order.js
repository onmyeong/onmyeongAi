/*
 * 온명 — 커스텀 주문 페이지 동작
 * 스튜디오/리포트에서 넘어온 사양을 주문서로 바꾸고,
 * 스마트스토어 · 직접 접수 · 메시지 상담 세 갈래로 보냅니다.
 */
(function () {
  'use strict';

  var ONM = window.ONMYEONG;
  var R = ONM.rings;
  var CONFIG = ONM.CONFIG;
  var esc = R.esc;
  var $ = function (id) { return document.getElementById(id); };

  var spec = R.specFromQuery();
  var qty = spec.quantity || 1;
  var size2 = spec.size;

  /* ───────────── 셀렉트 채우기 ───────────── */
  (function fillSizes() {
    var lim = CONFIG.limits.sizeKR;
    var html = '';
    for (var s = lim.min; s <= lim.max; s++) {
      html += '<option value="' + s + '">' + s + '호 (내경 ' +
        R.sizeToInnerDiameter(s).toFixed(1) + 'mm)</option>';
    }
    $('o-size').innerHTML = html;
    $('o-size2').innerHTML = html;
    $('o-size').value = spec.size;
    $('o-size2').value = spec.size;
  })();

  $('o-engraving').value = spec.engraving || '';
  $('privacy-text').textContent = CONFIG.privacy;
  $('foot-lead').textContent = '제작 기간 · ' + CONFIG.order.leadTime;

  // 스토어 결제를 아직 열지 않았다면 그 사실을 먼저 알려준다
  if (!CONFIG.order.smartstore && CONFIG.order.preOpenNotice) {
    $('pre-open').textContent = CONFIG.order.preOpenNotice;
    $('pre-open').classList.remove('is-hidden');
  }

  /* ───────────── 상담 버튼 (설정된 채널만 노출) ───────────── */
  (function talkButtons() {
    var o = CONFIG.order, html = '';
    if (o.kakao) html += '<a class="btn" target="_blank" rel="noopener" href="' + esc(o.kakao) + '">카카오톡 채널</a>';
    if (o.instagram) html += '<a class="btn" target="_blank" rel="noopener" href="' + esc(o.instagram) + '">인스타그램 DM</a>';
    if (o.email) html += '<a class="btn" id="mail-link" href="#">이메일로 보내기</a>';
    $('talk-buttons').innerHTML = html || '<span class="small">상담 채널이 아직 설정되지 않았습니다. config.js에서 추가해 주세요.</span>';
    if (!o.smartstore) $('step-store').classList.add('is-hidden');
    if (!o.useApi) $('step-direct').classList.add('is-hidden');
  })();

  /* ───────────── 입력 반영 ───────────── */
  $('o-size').addEventListener('change', function () { spec.size = parseInt(this.value, 10); sync(); });
  $('o-size2').addEventListener('change', function () { size2 = parseInt(this.value, 10); sync(); });
  $('o-engraving').addEventListener('input', function () { spec.engraving = this.value.trim(); sync(); });
  $('o-qty').addEventListener('change', function () {
    qty = parseInt(this.value, 10);
    $('o-size2').disabled = qty < 2;
    sync();
  });
  ['o-name', 'o-contact', 'o-channel', 'o-when', 'o-memo'].forEach(function (id) {
    $(id).addEventListener('input', sync);
    $(id).addEventListener('change', sync);
  });

  /* ───────────── 요약 · 사양서 ───────────── */
  function currentSheet() {
    var model = R.getModel(spec.modelId);
    var rec = spec.ilju ? ONM.ILJU[spec.ilju] : null;
    var price = R.estimatePrice(spec, qty);
    var lines = [
      '[온명 커스텀 반지 제작 사양서]',
      '작성일 : ' + new Date().toLocaleDateString('ko-KR'),
      ''
    ];
    if (rec) lines.push('일주      : ' + rec.id + ' (' + rec.hanja + ') · ' + rec.tagline);
    lines.push(
      '디자인    : ' + model.name + ' (' + R.FAMILIES[model.family].label + ')',
      '금속      : ' + (CONFIG.price.metals[spec.metal] || {}).label,
      '두께      : ' + spec.thickness.toFixed(1) + ' mm',
      '높이(폭)  : ' + spec.width.toFixed(1) + ' mm',
      '단면      : ' + R.PROFILE_LABEL[spec.profile],
      '표면 마감 : ' + R.TEXTURE_LABEL[spec.texture],
      '원석      : ' + (spec.stone ? spec.stone + ' (' + R.SETTING_LABEL[spec.setting] + ')' : '없음'),
      '각인      : ' + (spec.engraving || '없음'),
      '호수      : ' + spec.size + '호' + (qty >= 2 ? ' / ' + size2 + '호' : ''),
      '수량      : ' + qty + '개',
      '',
      '예상 금액 : ' + (price ? R.formatKRW(price.total) : '-') + (qty >= 2 ? ' (커플 할인 적용)' : ''),
      '제작 기간 : ' + CONFIG.order.leadTime
    );
    var memo = $('o-memo').value.trim();
    if (memo) lines.push('', '요청사항  : ' + memo);
    var when = $('o-when').value;
    if (when) lines.push('희망 수령 : ' + when);
    lines.push('', '사양 링크 : ' + studioLink());
    lines.push('', '※ 예상 금액은 참고용이며 최종 금액은 상담에서 확정됩니다.');
    return lines.join('\n');
  }

  function studioLink() {
    var base = location.origin + location.pathname.replace(/order\.html$/, 'studio.html');
    return base + '?' + R.specToQuery(spec, { qty: qty });
  }

  /** 일주가 실려 있으면 그 일주의 색과 십이지 아이콘을 요약에 얹는다 */
  function paintIlju(rec) {
    var box = $('order-ilju');
    if (!rec || !ONM.zodiacColor) { box.classList.add('is-hidden'); return; }
    var color = ONM.zodiacColor(rec);
    document.body.style.setProperty('--accent', color.solid);
    document.body.style.setProperty('--accent-ink', color.ink);
    document.body.style.setProperty('--accent-tint', color.tint);
    box.innerHTML = '<span class="seal-mini">' +
      ONM.zodiacSvg(rec.branch, { label: rec.branchInfo.animal }) + '</span>' +
      '<span><b>' + esc(rec.id) + ' (' + esc(rec.hanja) + ')</b>' +
      '<br><span class="small">' + esc(rec.branchInfo.animal) + '띠 일주 · ' +
      esc(rec.tagline) + '</span></span>';
    box.classList.remove('is-hidden');
  }

  function sync() {
    var model = R.getModel(spec.modelId);
    var rec = spec.ilju ? ONM.ILJU[spec.ilju] : null;

    paintIlju(rec);
    $('sum-preview').innerHTML = R.ringSvg(spec, { size: 240 });

    var rows = [];
    if (rec) rows.push(['일주', rec.id + ' (' + rec.hanja + ')']);
    rows.push(
      ['디자인', model.name],
      ['금속', (CONFIG.price.metals[spec.metal] || {}).label],
      ['두께', spec.thickness.toFixed(1) + ' mm'],
      ['높이 · 폭', spec.width.toFixed(1) + ' mm'],
      ['호수', spec.size + '호' + (qty >= 2 ? ' / ' + size2 + '호' : '')],
      ['원석', spec.stone ? spec.stone : '없음'],
      ['수량', qty + '개']
    );
    $('sum-body').innerHTML = rows.map(function (r) {
      return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>';
    }).join('');

    var price = R.estimatePrice(spec, qty);
    $('sum-price').textContent = price ? R.formatKRW(price.total) : '-';
    $('sum-lead').textContent = '제작 기간 · ' + CONFIG.order.leadTime;

    $('sheet').textContent = currentSheet();
    $('edit-link').href = 'studio.html?' + R.specToQuery(spec, { qty: qty });

    var mail = $('mail-link');
    if (mail) {
      mail.href = 'mailto:' + CONFIG.order.email +
        '?subject=' + encodeURIComponent('[온명] 커스텀 반지 주문 문의 — ' + model.name) +
        '&body=' + encodeURIComponent(currentSheet());
    }
  }

  /* ───────────── 클립보드 ───────────── */
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return Promise.reject(new Error('clipboard unavailable'));
  }
  function flash(btn, msg) {
    var old = btn.textContent;
    btn.textContent = msg;
    setTimeout(function () { btn.textContent = old; }, 2200);
  }

  $('copy-sheet').addEventListener('click', function () {
    var b = this;
    copy(currentSheet()).then(function () { flash(b, '복사했습니다'); },
      function () { flash(b, '복사 실패 — 직접 선택해 주세요'); });
  });

  $('download-sheet').addEventListener('click', function () {
    var blob = new Blob([currentSheet()], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '온명-제작사양서-' + spec.modelId + '.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  /* ───────────── 스마트스토어 ───────────── */
  var storeBtn = $('go-store');
  if (storeBtn) {
    storeBtn.addEventListener('click', function () {
      var b = this;
      var open = function () { window.open(CONFIG.order.smartstore, '_blank', 'noopener'); };
      copy(currentSheet()).then(function () {
        flash(b, '사양서 복사 완료 — 스토어로 이동합니다');
        open();
      }, function () {
        message('사양서를 자동으로 복사하지 못했습니다. 오른쪽 "사양서 복사" 버튼을 눌러 직접 복사한 뒤 스토어에서 붙여 넣어 주세요.', 'warn');
        open();
      });
    });
  }

  /* ───────────── 직접 접수 ───────────── */
  function message(text, kind) {
    var box = $('order-msg');
    box.textContent = text;
    box.className = 'notice' + (kind === 'warn' ? ' warn' : '');
    box.classList.remove('is-hidden');
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function validate() {
    if (!$('o-name').value.trim()) return '성함 또는 닉네임을 입력해 주세요.';
    if (!$('o-contact').value.trim()) return '연락처를 입력해 주세요.';
    if (!$('o-agree').checked) return '개인정보 수집·이용 동의가 필요합니다.';
    return null;
  }

  var directBtn = $('go-direct');
  if (directBtn) {
    directBtn.addEventListener('click', function () {
      var err = validate();
      if (err) { message(err, 'warn'); return; }

      var btn = this;
      btn.disabled = true;
      btn.textContent = '보내는 중…';

      var price = R.estimatePrice(spec, qty);
      var payload = {
        spec: spec,
        quantity: qty,
        secondSize: qty >= 2 ? size2 : null,
        estimate: price ? price.total : null,
        sheet: currentSheet(),
        link: studioLink(),
        contact: {
          name: $('o-name').value.trim(),
          channel: $('o-channel').value,
          value: $('o-contact').value.trim(),
          preferredDate: $('o-when').value || null
        },
        memo: $('o-memo').value.trim() || null
      };

      fetch(CONFIG.order.apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        // 접수 기능이 아직 연결되지 않은 곳에서는 JSON이 아닌 응답이 올 수 있다
        return res.text().then(function (text) {
          var body = null;
          try { body = JSON.parse(text); } catch (e) { body = null; }
          return { ok: res.ok, status: res.status, body: body };
        });
      }).then(function (r) {
        if (r.ok && r.body && r.body.ok) {
          message('주문서를 보냈습니다. 접수번호 ' + (r.body.orderNo || '-') +
            ' · 담당자가 ' + $('o-channel').options[$('o-channel').selectedIndex].text +
            '(으)로 연락드립니다.', '');
          btn.textContent = '접수 완료';
          return;
        }
        throw new Error(
          (r.body && r.body.message) ? r.body.message : '지금은 온라인 접수가 연결되어 있지 않습니다.');
      }).catch(function () {
        message('지금은 온라인 접수를 사용할 수 없습니다. 오른쪽 "사양서 복사"를 눌러 ' +
          '스마트스토어 주문서나 메시지 상담으로 전달해 주시면 동일하게 처리됩니다.', 'warn');
        btn.disabled = false;
        btn.textContent = '주문서 보내기';
      });
    });
  }

  sync();
})();
