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

  /* 커플링은 두 반지를 각각 다르게 맞출 수 있습니다.
   * 스튜디오에서 한 사람씩 정하고 나면 두 사양이 주소에 a= / b= 로 실려 옵니다.
   * 한 사람 주문이면 예전처럼 사양 하나만 들어옵니다. */
  var Q = new URLSearchParams(location.search);
  var isCouple = Q.get('couple') === '1' && Q.get('a') && Q.get('b');
  // URLSearchParams 가 이미 한 겹 풀어 주므로 그대로 넘기면 됩니다
  function unpack(v) { return R.specFromQuery(v); }

  var spec = isCouple ? unpack(Q.get('a')) : R.specFromQuery();
  var specB = isCouple ? unpack(Q.get('b')) : null;
  var qty = isCouple ? 2 : (spec.quantity || 1);
  var size2 = specB ? specB.size : spec.size;

  /** 두 번째 반지가 따로 있으면 그 사양, 아니면 첫 번째와 같은 사양 */
  function second() { return specB || spec; }

  /* ───────────── 셀렉트 채우기 ───────────── */
  (function fillSizes() {
    var lim = CONFIG.limits.sizeKR;
    var html = '';
    for (var s = lim.min; s <= lim.max; s++) {
      var big = CONFIG.price.bigSize && s >= CONFIG.price.bigSize.from;
      html += '<option value="' + s + '">' + s + '호 (내경 ' +
        R.sizeToInnerDiameter(s).toFixed(1) + 'mm)' +
        (big ? ' · +' + R.formatKRW(CONFIG.price.bigSize.price) : '') + '</option>';
    }
    $('o-size').innerHTML = html;
    $('o-size2').innerHTML = html;
    $('o-size').value = spec.size;
    $('o-size2').value = size2;
  })();

  // 커플링 링크로 들어오면 수량칸과 두 번째 호수칸을 미리 맞춰 둔다
  $('o-qty').value = String(qty);
  $('o-size2').disabled = qty < 2;

  if (isCouple) {
    // 두 반지가 이미 정해져 왔으므로 수량은 두 개로 고정합니다
    $('o-qty').disabled = true;
    $('o-qty').closest('.field').querySelector('label').textContent = '수량 (커플 한 쌍)';
    $('o-size').closest('.field').querySelector('label').textContent =
      '첫 번째 분 호수 — ' + labelOf(spec);
    $('o-size2').closest('.field').querySelector('label').textContent =
      '두 번째 분 호수 — ' + labelOf(specB);
  }

  function labelOf(sp) {
    var rec = sp.ilju && ONM.ILJU ? ONM.ILJU[sp.ilju] : null;
    return (rec ? rec.id + ' · ' : '') + sp.modelName;
  }

  $('o-engraving').value = spec.engraving || '';
  /* ───────────── 희망 수령일 · 받는 방법 ─────────────
   * 평균 제작 기간보다 이른 날짜는 고를 수 없게 막습니다.
   * 더 급하시면 상담에서 일정을 잡는 쪽이 정확합니다. */
  (function receiving() {
    var lead = (CONFIG.order.leadDays || 10);
    var first = new Date();
    first.setDate(first.getDate() + lead);
    var iso = function (d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
        '-' + String(d.getDate()).padStart(2, '0');
    };
    var when = $('o-when');
    when.min = iso(first);
    when.value = iso(first);
    $('when-note').textContent = '가장 빠른 날짜는 ' + iso(first) + '입니다 (평균 제작 ' + lead + '일). ' +
      (CONFIG.order.deliveryNote || '');

    function paintPickup() {
      var visit = $('o-pickup').value === 'visit';
      $('pickup-note').textContent = visit
        ? '공방에서 끼워 보고 호수를 바로 맞춰 드립니다. 방문은 예약제라 상담에서 시간을 잡아 주세요.'
        : (CONFIG.order.shipFree ? '주문 배송비는 받지 않습니다.' : '배송비는 상담에서 안내드립니다.');
      sync();
    }
    $('o-pickup').addEventListener('change', paintPickup);
    paintPickup();
  })();

  $('privacy-text').textContent = CONFIG.privacy;
  $('foot-lead').textContent = '제작 기간 · ' + CONFIG.order.leadTime;

  // 스토어 결제를 아직 열지 않았다면 그 사실을 먼저 알려준다
  if (!CONFIG.order.smartstore && CONFIG.order.preOpenNotice) {
    $('pre-open').textContent = CONFIG.order.preOpenNotice;
    $('pre-open').classList.remove('is-hidden');
  }

  /* ───────────── 상담 버튼 (설정된 채널만 노출) ───────────── */
  /* 접수 서버가 살아 있는지 먼저 확인한다.
   * GitHub Pages처럼 서버가 없는 곳에서는 이 요청이 실패하므로,
   * "주문서 보내기" 단계를 아예 감추고 상담 경로만 남긴다. */
  function probeOrderApi() {
    if (!CONFIG.order.useApi) { $('step-direct').classList.add('is-hidden'); return; }
    fetch(CONFIG.order.apiPath, { method: 'GET' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (body) {
        if (!body || !body.ready) $('step-direct').classList.add('is-hidden');
      })
      .catch(function () { $('step-direct').classList.add('is-hidden'); });
  }

  (function talkButtons() {
    var o = CONFIG.order, html = '';
    if (o.kakao) html += '<a class="btn" target="_blank" rel="noopener" href="' + esc(o.kakao) + '">카카오톡 채널</a>';
    if (o.instagram) html += '<a class="btn" target="_blank" rel="noopener" href="' + esc(o.instagram) + '">인스타그램 DM</a>';
    if (o.email) html += '<a class="btn" id="mail-link" href="#">이메일로 보내기</a>';
    $('talk-buttons').innerHTML = html || '<span class="small">상담 채널이 아직 설정되지 않았습니다. config.js에서 추가해 주세요.</span>';
    if (!o.smartstore) $('step-store').classList.add('is-hidden');
    probeOrderApi();
  })();

  /* ───────────── 입력 반영 ───────────── */
  (function reviewEvent() {
    var ev = CONFIG.price.engravingEvent || {};
    $('o-review-label').textContent = ev.label || '리뷰 이벤트 — 각인 무료';
    $('o-review-note').textContent = ev.note || '';
    $('o-review').checked = !!spec.reviewEvent;
    $('o-review').addEventListener('change', function () {
      spec.reviewEvent = this.checked;
      if (specB) specB.reviewEvent = this.checked;
      sync();
    });
  })();

  $('o-size').addEventListener('change', function () { spec.size = parseInt(this.value, 10); sync(); });
  $('o-size2').addEventListener('change', function () {
    size2 = parseInt(this.value, 10);
    if (specB) specB.size = size2;
    sync();
  });
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
  function handNote(sp) {
    var bits = [];
    if (sp.sculpt) bits.push('두께');
    if (sp.sculptW) bits.push('폭');
    if (sp.matte) bits.push('부분 무광');
    if (sp.engrave) bits.push('도안 새김');
    if (sp.stoneAt) bits.push('알 자리 지정');
    var st = R.starList(sp);
    if (st.length) {
      bits.push('별 조각 ' + st.length + '개 ' +
        st.map(function (x) { return x.size.toFixed(1); }).join('·') + 'mm');
    }
    var dr = R.drawStrokes(sp);
    if (dr.length) bits.push('손으로 그린 그림 ' + dr.length + '획');
    return bits.length ? ' · 손으로 다듬음 (' + bits.join('·') + ')' : '';
  }

  function organicWord(v) {
    var n = Number(v) || 0;
    return n === 0 ? '반듯하게' : n < 0.35 ? '살짝' : n < 0.7 ? '뚜렷하게' : '많이';
  }

  /** 반지 한 개 사양을 사양서 줄로 */
  function sheetBlock(sp, size, title) {
    var model = R.getModel(sp.modelId);
    var rec = sp.ilju ? ONM.ILJU[sp.ilju] : null;
    var out = [];
    if (title) out.push('[' + title + ']');
    if (rec) out.push('일주       : ' + rec.id + ' (' + rec.hanja + ') · ' + ONM.iljuPhrase(rec));
    out.push(
      '디자인     : ' + model.name + ' (' + R.FAMILIES[model.family].label + ')',
      '소재       : ' + (CONFIG.price.metals[sp.metal] || {}).label,
      '두께       : ' + sp.thickness.toFixed(1) + ' mm',
      '폭         : ' + sp.width.toFixed(1) + ' mm',
      '옆모양     : ' + R.PROFILE_LABEL[sp.profile],
      '표면 느낌  : ' + R.textureLabel(sp),
      '원석       : ' + R.stoneLabel(sp),
      '고정 방법  : ' + ((sp.stoneType && sp.stoneType !== 'none')
        ? R.SETTING_LABEL[sp.setting] + ' (공임 포함)' : '—'),
      '겉면 마감  : ' + (sp.oxidize
        ? CONFIG.oxidize.label
        : (CONFIG.plating[sp.plating || 'none'] || {}).label),
      '색 채움    : ' + (CONFIG.epoxy.colors[sp.epoxy || ''] || {}).label +
        (sp.epoxy ? ' · ' + (CONFIG.epoxy.coverage[sp.epoxyCoverage || 'part'] || {}).label : ''),
      '앞뒤 두께  : ' + sp.thickness.toFixed(1) + ' / ' +
        (sp.backThickness || sp.thickness).toFixed(1) + ' mm',
      '굴곡       : ' + organicWord(sp.organic) + handNote(sp),
      '돌 높이    : ' + ((sp.stoneType && sp.stoneType !== 'none')
        ? (Number(sp.stoneHeight) || 0).toFixed(1) + ' mm' : '—'),
      '각인       : ' + (sp.engraving || '없음') +
        (sp.engraving && sp.reviewEvent ? ' · 리뷰 이벤트로 무료' : ''),
      '호수       : ' + size + '호'
    );
    return out;
  }

  function currentSheet() {
    var model = R.getModel(spec.modelId);
    var rec = spec.ilju ? ONM.ILJU[spec.ilju] : null;
    var price = currentPrice();

    if (isCouple) {
      var out = [
        '[온명 커스텀 반지 제작 사양서 — 커플 한 쌍]',
        '작성일 : ' + new Date().toLocaleDateString('ko-KR'),
        ''
      ];
      out = out.concat(sheetBlock(spec, spec.size, '첫 번째 분 반지'), ['']);
      out = out.concat(sheetBlock(specB, size2, '두 번째 분 반지'), ['']);
      out.push(
        '수량       : 2개 (한 쌍)',
        '예상 금액  : ' + R.priceText(price, 'total') +
          (price && !price.consult ? ' (한 쌍 할인 적용)' : ''),
        '제작 기간  : ' + CONFIG.order.leadTime
      );
      if (price && price.consult) out.push('', '※ ' + price.consult);
      if (spec.stoneType === 'cubic' || specB.stoneType === 'cubic') {
        out.push('', '※ 컬러큐빅은 색을 상담에서 함께 정합니다. 위 색상은 희망 색상입니다.');
      }
      if (spec.oxidize || specB.oxidize) out.push('', '※ ' + CONFIG.oxidize.note);
      var memoC = $('o-memo').value.trim();
      if (memoC) out.push('', '요청사항  : ' + memoC);
      var whenC = $('o-when').value;
      if (whenC) out.push('희망 수령 : ' + whenC);
      refLine(out);
      out.push('', '사양 링크 : ' + studioLink());
      out.push('', '※ 예상 금액은 참고용이며 최종 금액은 상담에서 확정됩니다.');
      return out.join('\n');
    }

    var lines = [
      '[온명 커스텀 반지 제작 사양서]',
      '작성일 : ' + new Date().toLocaleDateString('ko-KR'),
      ''
    ];
    if (rec) lines.push('일주       : ' + rec.id + ' (' + rec.hanja + ') · ' + ONM.iljuPhrase(rec));
    lines.push(
      '디자인     : ' + model.name + ' (' + R.FAMILIES[model.family].label + ')',
      '소재       : ' + (CONFIG.price.metals[spec.metal] || {}).label,
      '두께       : ' + spec.thickness.toFixed(1) + ' mm',
      '폭         : ' + spec.width.toFixed(1) + ' mm',
      '옆모양     : ' + R.PROFILE_LABEL[spec.profile],
      '표면 느낌  : ' + R.textureLabel(spec),
      '원석       : ' + R.stoneLabel(spec),
      '고정 방법  : ' + ((spec.stoneType && spec.stoneType !== 'none')
        ? R.SETTING_LABEL[spec.setting] + ' (공임 포함)' : '—'),
      '겉면 마감  : ' + (spec.oxidize
        ? CONFIG.oxidize.label
        : (CONFIG.plating[spec.plating || 'none'] || {}).label),
      '색 채움    : ' + (CONFIG.epoxy.colors[spec.epoxy || ''] || {}).label +
        (spec.epoxy ? ' · ' + (CONFIG.epoxy.coverage[spec.epoxyCoverage || 'part'] || {}).label : ''),
      '앞뒤 두께  : ' + spec.thickness.toFixed(1) + ' / ' +
        (spec.backThickness || spec.thickness).toFixed(1) + ' mm',
      '굴곡       : ' + organicWord(spec.organic) + handNote(spec),
      '돌 높이    : ' + ((spec.stoneType && spec.stoneType !== 'none')
        ? (Number(spec.stoneHeight) || 0).toFixed(1) + ' mm' : '—'),
      '각인       : ' + (spec.engraving || '없음') +
        (spec.engraving && spec.reviewEvent ? ' · 리뷰 이벤트로 무료' : ''),
      '호수       : ' + spec.size + '호' + (qty >= 2 ? ' / ' + size2 + '호' : ''),
      '수량       : ' + qty + '개',
      '',
      '예상 금액  : ' + R.priceText(price, 'total') +
        (price && !price.consult && qty >= 2 ? ' (커플 할인 적용)' : ''),
      '제작 기간  : ' + CONFIG.order.leadTime
    );
    // 값이 어떻게 나왔는지 (한 개 기준)
    var parts = R.priceBreakdown(price);
    if (parts.length) {
      lines.push('', '[값 내역 · 1개 기준]');
      parts.forEach(function (r) {
        lines.push('  ' + (r[0] + '                    ').slice(0, 22) + R.formatKRW(r[1]));
      });
    }
    if (price && price.consult) lines.push('', '※ ' + price.consult);
    if (spec.stoneType === 'cubic') {
      lines.push('', '※ 컬러큐빅은 색과 크기를 상담에서 함께 정합니다. 위 색상은 희망 색상입니다.');
    }
    if (spec.oxidize) lines.push('', '※ ' + CONFIG.oxidize.note);
    var memo = $('o-memo').value.trim();
    if (memo) lines.push('', '요청사항  : ' + memo);
    var when = $('o-when').value;
    var visit = $('o-pickup') && $('o-pickup').value === 'visit';
    lines.push('받는 방법  : ' + (visit ? '공방 방문 수령' : '택배' +
      (CONFIG.order.shipFree ? ' (배송비 무료)' : '')));
    if (when) lines.push('희망 수령 : ' + when + ' (평균 제작 ' + (CONFIG.order.leadDays || 10) + '일)');
    refLine(lines);
    lines.push('', '사양 링크 : ' + studioLink());
    lines.push('', '※ 예상 금액은 참고용이며 최종 금액은 상담에서 확정됩니다.');
    return lines.join('\n');
  }

  /* 스튜디오에서 올린 레퍼런스 사진이 있으면 사양서에도 적어 둡니다.
   * 사진 자체는 사이트가 보내 주지 못하므로 "따로 첨부"라고 분명히 남깁니다. */
  function refLine(out) {
    var n = ONM.referenceCount || 0;
    if (n > 0) out.push('레퍼런스   : 사진 ' + n + '장 — 사양서와 함께 첨부해 주세요');
  }

  function studioLink() {
    var base = location.origin + location.pathname.replace(/order\.html$/, 'studio.html');
    if (isCouple) {
      return base + '?couple=1&step=b&a=' + encodeURIComponent(R.specToQuery(spec)) +
        '&' + R.specToQuery(specB);
    }
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
      '<br><span class="small">' + esc(ONM.iljuPhrase(rec)) + '</span></span>';
    box.classList.remove('is-hidden');
  }

  /** 한 쌍 값 — 두 반지가 서로 다를 수 있으므로 각각 내서 더하고 할인을 먹입니다 */
  function pairPrice() {
    var pa = R.estimatePrice(spec, 1);
    var pb = R.estimatePrice(second(), 1);
    if (!pa || !pb) return null;
    if (pa.consult || pb.consult) {
      return { unit: null, total: null, quantity: 2, pending: [],
        consult: pa.consult || pb.consult, a: pa, b: pb };
    }
    var sum = (pa.unit + pb.unit) * (1 - CONFIG.price.couplePairDiscount);
    return {
      unit: null, total: Math.round(sum / 1000) * 1000, quantity: 2,
      consult: null,
      pending: (pa.pending || []).concat(pb.pending || []),
      a: pa, b: pb
    };
  }

  function currentPrice() {
    return isCouple ? pairPrice() : R.estimatePrice(spec, qty);
  }

  function specRows(sp, label) {
    var model = R.getModel(sp.modelId);
    var rec = sp.ilju ? ONM.ILJU[sp.ilju] : null;
    var rows = [];
    if (label) rows.push([label, rec ? rec.id + ' (' + rec.hanja + ')' : '—']);
    rows.push(
      ['디자인', model.name],
      ['두께 · 폭', sp.thickness.toFixed(1) + ' × ' + sp.width.toFixed(1) + ' mm'],
      ['표면 느낌', R.textureLabel(sp)],
      ['원석', R.stoneLabel(sp)],
      ['겉면 마감', sp.oxidize
        ? CONFIG.oxidize.label
        : (CONFIG.plating[sp.plating || 'none'] || {}).label]
    );
    return rows;
  }

  function sync() {
    var model = R.getModel(spec.modelId);
    var rec = spec.ilju ? ONM.ILJU[spec.ilju] : null;

    paintIlju(rec);

    var rows;
    if (isCouple) {
      // 두 반지를 나란히 보여 줍니다
      $('sum-preview').innerHTML =
        '<div class="pair-previews">' +
          '<figure><div class="preview-box stage-bg">' + R.ringSvg(spec, { size: 150 }) + '</div>' +
            '<figcaption>첫 번째 분 · ' + esc(String(spec.size)) + '호</figcaption></figure>' +
          '<figure><div class="preview-box stage-bg">' + R.ringSvg(specB, { size: 150 }) + '</div>' +
            '<figcaption>두 번째 분 · ' + esc(String(size2)) + '호</figcaption></figure>' +
        '</div>';
      rows = [['수량', '한 쌍 (2개)']]
        .concat(specRows(spec, '첫 번째 분'))
        .concat([['—', '—']])
        .concat(specRows(specB, '두 번째 분'));
    } else {
      $('sum-preview').innerHTML = R.ringSvg(spec, { size: 240 });
      rows = [];
      if (rec) rows.push(['일주', rec.id + ' (' + rec.hanja + ')']);
      rows.push(
        ['디자인', model.name],
        ['소재', (CONFIG.price.metals[spec.metal] || {}).label],
        ['두께', spec.thickness.toFixed(1) + ' mm'],
        ['폭', spec.width.toFixed(1) + ' mm'],
        ['호수', spec.size + '호' + (qty >= 2 ? ' / ' + size2 + '호' : '')],
        ['원석', R.stoneLabel(spec)],
        ['겉면 마감', spec.oxidize
          ? CONFIG.oxidize.label
          : (CONFIG.plating[spec.plating || 'none'] || {}).label],
        ['수량', qty + '개']
      );
    }
    $('sum-body').innerHTML = rows.map(function (r) {
      return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>';
    }).join('');

    var price = currentPrice();
    $('sum-price').textContent = R.priceText(price, 'total');
    /* 값 내역 — 한 개 기준으로 보여 줍니다 (커플이면 두 반지를 따로 계산하므로 생략) */
    var parts = isCouple ? [] : R.priceBreakdown(price);
    $('sum-parts').innerHTML = parts.map(function (r) {
      return '<tr><th>' + esc(r[0]) + '</th><td>' + R.formatKRW(r[1]) + '</td></tr>';
    }).join('');
    $('sum-lead').textContent = '제작 기간 · ' + CONFIG.order.leadTime;

    $('sheet').textContent = currentSheet();
    $('edit-link').href = isCouple
      ? 'studio.html?couple=1&step=b&a=' + encodeURIComponent(R.specToQuery(spec)) +
        '&' + R.specToQuery(specB)
      : 'studio.html?' + R.specToQuery(spec, { qty: qty });

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

  /* 레퍼런스 사진은 저장소에서 늦게 읽혀 옵니다.
   * 다 읽히면 사양서에 사진 줄이 들어가도록 한 번 더 그립니다. */
  document.addEventListener('onm:refs', function () {
    try { $('sheet').textContent = currentSheet(); } catch (e) {}
  });

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

      var price = currentPrice();
      var payload = {
        spec: spec,
        specB: isCouple ? specB : null,
        couple: isCouple,
        quantity: qty,
        secondSize: qty >= 2 ? size2 : null,
        estimate: price && !price.consult ? price.total : null,
        sheet: currentSheet(),
        link: studioLink(),
        contact: {
          name: $('o-name').value.trim(),
          channel: $('o-channel').value,
          value: $('o-contact').value.trim(),
          preferredDate: $('o-when').value || null,
          pickup: $('o-pickup') ? $('o-pickup').value : 'ship'
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
