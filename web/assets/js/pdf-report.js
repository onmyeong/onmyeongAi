/*
 * 온명 — PDF 리포트 내려받기
 * ------------------------------------------------------------------
 * 상담 내용을 A4 몇 장으로 정리해 PDF 파일로 내려받습니다.
 *   · 일주 리포트 (한 사람 또는 두 사람)
 *   · 두 사람이면 궁합 요약
 *   · 스튜디오에서 맞춘 반지(사진 · 사양 · 예상 금액) 또는 추천 반지
 *   · 공방 안내
 *
 * 화면을 그대로 찍는 게 아니라 PDF 용 지면을 따로 짜서 한 장씩 그림으로 굽습니다.
 * (한글 글꼴을 PDF 에 따로 넣지 않아도 화면에서 보이는 글꼴 그대로 나옵니다)
 * 굽는 도구(html2canvas · jsPDF)는 버튼을 눌렀을 때만 불러옵니다 — 평소 페이지는 가볍게.
 *
 * 쓰는 법:
 *   ONMYEONG.pdfReport.download({
 *     people: [{ ilju: '계묘', name: '지민' }, { ilju: '갑자', name: '하늘' }],  // 1~2명
 *     rings:  [{ spec: spec, image: 'data:image/png…', who: '지민 님' }],         // 맞춘 반지 (없으면 추천)
 *     seed:   12,                                                               // 추천 순서
 *     recommend: { mood, volume, metal }                                        // 화면에서 고른 추천 조건
 *   }, button);
 */
(function () {
  'use strict';

  var ONM = window.ONMYEONG;
  var R = ONM.rings;
  var C = ONM.CONFIG;
  var esc = R.esc;

  // 이 파일이 있는 자리에서 assets/ 위치를 찾습니다 (하위 경로에 올려도 맞게)
  var ASSETS = (function () {
    var s = document.currentScript && document.currentScript.src;
    return s ? s.replace(/js\/pdf-report\.js.*$/, '') : 'assets/';
  })();

  function load(src) {
    return new Promise(function (ok, fail) {
      var el = document.createElement('script');
      el.src = src;
      el.onload = ok;
      el.onerror = function () { fail(new Error('불러오지 못했습니다: ' + src)); };
      document.head.appendChild(el);
    });
  }
  function tools() {
    var jobs = [];
    if (!window.html2canvas) jobs.push(load(ASSETS + 'vendor/html2canvas.min.js'));
    if (!(window.jspdf && window.jspdf.jsPDF)) jobs.push(load(ASSETS + 'vendor/jspdf.umd.min.js'));
    if (!ONM.compat) jobs.push(load(ASSETS + 'js/compat.js'));
    return Promise.all(jobs);
  }

  /* ───────────── 지면 ───────────── */
  var PW = 794, PH = 1123;            // A4 를 96dpi 로 본 크기(px)
  var CSS = [
    'html,body{margin:0;padding:0;background:#fff}',
    'body{font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif}',
    '.pdf-name,.pdf-ring h3,.pdf-score .num{font-family:"Noto Serif KR","Noto Sans KR",serif}',
    '.pdf-page{margin-bottom:20px}',
    '.pdf-page{width:' + PW + 'px;height:' + PH + 'px;box-sizing:border-box;padding:40px 52px 34px;',
    ' background:#fbf8f1;color:#2b2a26;display:flex;flex-direction:column;font-size:13px;line-height:1.65;',
    ' word-break:keep-all;overflow-wrap:anywhere}',
    '.pdf-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #d9d0bd;',
    ' padding-bottom:10px;margin-bottom:18px}',
    '.pdf-brand{font-size:15px;letter-spacing:.32em;color:#22413a;font-weight:600}',
    '.pdf-brand small{letter-spacing:.08em;font-size:11px;color:#8b8370;margin-left:8px;font-weight:400}',
    '.pdf-meta{font-size:11px;color:#8b8370}',
    '.pdf-body{flex:1;overflow:hidden;display:flex;flex-direction:column;gap:12px}',
    '.pdf-foot{display:flex;justify-content:space-between;border-top:1px solid #e3dccb;padding-top:8px;',
    ' margin-top:12px;font-size:10.5px;color:#9a917c}',
    '.pdf-h{font-size:12px;letter-spacing:.18em;color:#4f6b5f;font-weight:700;margin:6px 0 0}',
    '.pdf-hero{display:flex;gap:18px;align-items:center;background:#f2ecdf;border-radius:16px;padding:18px 20px}',
    '.pdf-seal{width:84px;height:84px;flex:none;border-radius:50%;overflow:hidden}',
    '.pdf-seal{display:flex;align-items:center;justify-content:center;color:#fff}',
    '.pdf-seal svg,.pdf-seal img{width:62%;height:62%;display:block}',
    '.pdf-who{font-size:12px;color:#7a7262;margin:0}',
    '.pdf-name{font-size:26px;font-weight:700;color:#1f2b28;margin:0;line-height:1.25}',
    '.pdf-phrase{font-size:13px;color:#4f6b5f;margin:2px 0 0}',
    '.pdf-tag{font-size:12px;color:#7a7262;margin:4px 0 0}',
    '.pdf-p{margin:0}',
    '.pdf-key{font-weight:600;color:#22413a}',
    '.pdf-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '.pdf-card{background:#fff;border:1px solid #e6dfcf;border-radius:12px;padding:11px 14px}',
    '.pdf-card b{display:block;color:#22413a;font-size:13px;margin-bottom:2px}',
    '.pdf-card p{margin:0;font-size:12px;color:#4a4740}',
    '.pdf-tone{background:#eef3ef;border-color:#d5e2d9}',
    '.pdf-warm{background:#f7efe4;border-color:#eadbc6}',
    '.pdf-chips{display:flex;flex-wrap:wrap;gap:6px}',
    '.pdf-chips span{background:#fff;border:1px solid #e1d8c5;border-radius:999px;padding:2px 10px;font-size:12px}',
    '.pdf-stones{display:flex;gap:14px;flex-wrap:wrap}',
    '.pdf-stone{display:flex;gap:8px;align-items:center;font-size:12px}',
    '.pdf-stone svg{width:40px;height:40px}',
    '.pdf-quote{border-left:3px solid #9fb3a6;padding:2px 0 2px 12px;color:#3d4a44;font-style:normal}',
    '.pdf-score{display:flex;gap:18px;align-items:center}',
    '.pdf-score .num{font-size:46px;font-weight:700;color:#22413a;line-height:1}',
    '.pdf-score .num small{font-size:14px;color:#7a7262;font-weight:400;margin-left:3px}',
    '.pdf-axis{display:grid;grid-template-columns:170px 30px 1fr;gap:8px;align-items:center;font-size:12px}',
    '.pdf-bar{height:7px;border-radius:9px;background:#e8e1d2;overflow:hidden}',
    '.pdf-bar i{display:block;height:100%;background:#5d7f70;border-radius:9px}',
    '.pdf-list{margin:0;padding-left:18px;font-size:12px}',
    '.pdf-ring{display:grid;grid-template-columns:230px 1fr;gap:18px;align-items:start}',
    '.pdf-ring .pic{width:230px;height:190px;border-radius:14px;background:linear-gradient(170deg,#fbf8f1,#efe7d6);',
    ' border:1px solid #e6dfcf;display:flex;align-items:center;justify-content:center;overflow:hidden}',
    '.pdf-ring .pic img{width:100%;height:100%;object-fit:cover}',
    '.pdf-ring .pic svg{width:86%;height:86%}',
    '.pdf-ring h3{margin:0;font-size:19px;color:#1f2b28}',
    '.pdf-ring .sub{font-size:12px;color:#7a7262;margin:2px 0 6px}',
    '.pdf-price{font-size:20px;font-weight:700;color:#22413a;margin:8px 0 0}',
    '.pdf-table{width:100%;border-collapse:collapse;font-size:12px}',
    '.pdf-table th{text-align:left;font-weight:500;color:#7a7262;width:100px;padding:4px 8px 4px 0;vertical-align:top;',
    ' border-bottom:1px solid #eee6d6}',
    '.pdf-table td{padding:4px 0;border-bottom:1px solid #eee6d6;color:#2f2d28}',
    '.pdf-reco{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}',
    '.pdf-reco .pdf-card{display:grid;grid-template-columns:96px 1fr;gap:10px;align-items:center}',
    '.pdf-reco .thumb{width:96px;height:84px;border-radius:10px;background:#f4efe4;display:flex;align-items:center;justify-content:center}',
    '.pdf-reco .thumb svg{width:84px;height:76px}',
    '.pdf-reco .pdf-card p{font-size:11.5px}',
    '.pdf-fit{font-size:11px;color:#4f6b5f;font-weight:700}',
    '.pdf-note{font-size:11.5px;color:#6b6457;background:#f2ecdf;border-radius:10px;padding:10px 14px}'
  ].join('');

  /* 지면은 따로 띄운 빈 창(iframe) 안에 짭니다.
   * 사이트 스타일(color-mix 같은 새 색 함수)이 섞이면 굽는 도구가 읽지 못해 멈추기 때문입니다.
   * 글꼴은 사이트가 쓰는 웹폰트 링크만 그대로 가져옵니다. */
  function makeFrame() {
    var f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true');
    f.tabIndex = -1;
    f.style.cssText = 'position:fixed;left:-20000px;top:0;width:' + (PW + 20) + 'px;height:' + (PH + 20) +
      'px;border:0;pointer-events:none';
    document.body.appendChild(f);
    var fonts = Array.prototype.map.call(
      document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]'),
      function (l) { return '<link rel="stylesheet" href="' + l.href + '">'; }).join('');
    var d = f.contentDocument;
    d.open();
    d.write('<!doctype html><html lang="ko"><head><meta charset="utf-8">' + fonts +
      '<style>' + CSS + '</style></head><body></body></html>');
    d.close();
    return f;
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '.';
  }

  /* ───────────── 내용 묶음 ─────────────
   * 묶음 하나하나는 쪽을 넘길 때 쪼개지지 않는 단위입니다. */
  function recOf(id) { return id && ONM.ILJU ? ONM.ILJU[id] : null; }
  /* 십이지 아이콘 — 사이트는 PNG 를 CSS 마스크로 흰색으로 칠하는데, 굽는 도구는 마스크를 못 읽습니다.
   * 그래서 PDF 에는 미리 흰색으로 칠한 그림을 만들어 넣습니다. */
  var sealCache = {};
  function tintSeal(branch) {
    var cfg = C.zodiacIcons || {};
    if (!cfg.custom || sealCache[branch]) return Promise.resolve();
    return new Promise(function (ok) {
      var im = new Image();
      im.onload = function () {
        try {
          var cv = document.createElement('canvas');
          cv.width = im.naturalWidth || 256; cv.height = im.naturalHeight || 256;
          var g = cv.getContext('2d');
          g.drawImage(im, 0, 0, cv.width, cv.height);
          g.globalCompositeOperation = 'source-in';
          g.fillStyle = '#ffffff';
          g.fillRect(0, 0, cv.width, cv.height);
          sealCache[branch] = cv.toDataURL('image/png');
        } catch (e) { /* 그림을 못 읽으면 색 동그라미만 둡니다 */ }
        ok();
      };
      im.onerror = function () { ok(); };
      im.src = (cfg.path || '') + encodeURIComponent(branch) + (cfg.ext || '.png');
    });
  }
  function seal(rec) {
    if (sealCache[rec.branch]) return '<img src="' + sealCache[rec.branch] + '" alt="">';
    if ((C.zodiacIcons || {}).custom) return '';
    return ONM.zodiacSvg ? ONM.zodiacSvg(rec.branch, { label: rec.id + ' 일주' }) : '';
  }

  function personBlocks(p, label) {
    var rec = recOf(p.ilju);
    if (!rec) return [];
    var color = ONM.zodiacColor ? ONM.zodiacColor(rec) : { solid: '#5d7f70' };
    var out = [];
    out.push('<div class="pdf-hero">' +
      '<div class="pdf-seal" style="background:' + color.solid + '">' + seal(rec) + '</div>' +
      '<div>' +
        '<p class="pdf-who">' + esc(label || '') + (p.name ? esc(p.name) + ' 님의 일주' : '') + '</p>' +
        '<p class="pdf-name">' + esc(rec.id) + ' (' + esc(rec.hanja) + ')</p>' +
        '<p class="pdf-phrase">' + esc(ONM.iljuPhrase ? ONM.iljuPhrase(rec) : '') + '</p>' +
        '<p class="pdf-tag">' + esc(rec.tagline) + '</p>' +
      '</div></div>');
    out.push('<p class="pdf-p"><span class="pdf-key">' + esc(rec.keywords) + '</span><br>' + esc(rec.summary) + '</p>');
    out.push('<p class="pdf-h">이런 결을 가지셨습니다</p>');
    out.push('<div class="pdf-grid2">' + rec.traits.map(function (t) {
      return '<div class="pdf-card"><b>' + esc(t[0]) + '</b><p>' + esc(t[1]) + '</p></div>';
    }).join('') + '</div>');
    out.push('<div class="pdf-grid2">' +
      '<div class="pdf-card pdf-tone"><b>나의 강점</b><p>' + esc(rec.strength) + '</p></div>' +
      '<div class="pdf-card pdf-warm"><b>이렇게 해 보세요</b><p>' + esc(rec.advice) + '</p></div>' +
    '</div>');
    out.push('<p class="pdf-h">행운의 키워드 · 어울리는 원석</p>');
    out.push('<div class="pdf-chips">' + rec.lucky.map(function (k) { return '<span>' + esc(k) + '</span>'; }).join('') + '</div>');
    out.push('<div class="pdf-stones">' + rec.stones.map(function (s) {
      return '<div class="pdf-stone">' +
        (ONM.stoneIcon ? ONM.stoneIcon(s[0], { size: 40, cut: 'cabochon', label: s[0] }) : '') +
        '<span><b>' + esc(s[0]) + '</b><br>' + esc(s[1]) + '</span></div>';
    }).join('') + '</div>');
    out.push('<p class="pdf-p pdf-quote">' + esc(rec.ringNote) + '<br><b>' + esc(rec.closing) + '</b></p>');
    return out;
  }

  function compatBlocks(cp, people) {
    if (!cp) return [];
    var a = recOf(people[0].ilju), b = recOf(people[1].ilju);
    var nmA = people[0].name ? people[0].name + ' 님' : a.id;
    var nmB = people[1].name ? people[1].name + ' 님' : b.id;
    var out = [];
    out.push('<p class="pdf-h">두 분의 궁합 — ' + esc(nmA) + ' × ' + esc(nmB) + '</p>');
    out.push('<div class="pdf-hero pdf-score">' +
      '<div class="num">' + cp.score + '<small>점</small></div>' +
      '<div><p class="pdf-name" style="font-size:20px">' + esc(cp.grade) + (cp.nickname ? ' · ' + esc(cp.nickname) : '') + '</p>' +
      '<p class="pdf-p">' + esc(cp.headline) + '</p></div></div>');
    if (cp.axes && cp.axes.length) {
      out.push('<div class="pdf-card">' + cp.axes.map(function (ax) {
        return '<div class="pdf-axis"><b>' + esc(ax.name) + '</b><span>' + ax.score + '</span>' +
          '<div class="pdf-bar"><i style="width:' + ax.score + '%"></i></div></div>';
      }).join('') + '</div>');
    }
    out.push('<div class="pdf-card"><p>' + [cp.elementLine, cp.stemLine, cp.branchLine]
      .filter(Boolean).map(esc).join('<br>') + '</p></div>');
    out.push('<div class="pdf-grid2">' +
      '<div class="pdf-card pdf-tone"><b>잘 맞는 점</b><ul class="pdf-list">' +
        (cp.good || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="pdf-card pdf-warm"><b>서로 챙겨 주면 좋은 점</b><ul class="pdf-list">' +
        (cp.care || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' +
    '</div>');
    (cp.chemistry || []).slice(0, 2).forEach(function (c) {
      out.push('<div class="pdf-card"><b>' + esc(c.title) + '</b><p>' + esc(c.text) + '</p></div>');
    });
    return out;
  }

  function finishLabel(s) {
    return s.oxidize ? C.oxidize.label : (C.plating[s.plating || 'none'] || {}).label;
  }

  function specRows(s) {
    var model = R.getModel(s.modelId);
    var rows = [
      ['디자인', model.name + ' (' + R.FAMILIES[model.family].label + ')'],
      ['치수', '두께 ' + Number(s.thickness).toFixed(1) + 'mm · 폭 ' + Number(s.width).toFixed(1) + 'mm'],
      ['호수', s.size + '호 (안지름 ' + R.sizeToInnerDiameter(s.size).toFixed(1) + 'mm)'],
      ['소재', (C.price.metals[s.metal] || {}).label || s.metal],
      ['표면 느낌', R.textureLabel(s)],
      ['옆모양', R.PROFILE_LABEL[s.profile]],
      ['원석', R.stoneLabel(s) + (s.stoneType && s.stoneType !== 'none' ? ' · ' + R.SETTING_LABEL[s.setting] : '')],
      ['겉면 마감', finishLabel(s)]
    ];
    if (Number(s.comfort) > 0) rows.push(['내경 굴림', R.comfortLabel(s.comfort)]);
    if (s.epoxy) rows.push(['색 채움', (C.epoxy.colors[s.epoxy] || {}).label + ' · ' +
      (C.epoxy.coverage[s.epoxyCoverage || 'part'] || {}).label]);
    if (R.hasSculpt(s)) rows.push(['손으로 다듬음', '스튜디오에서 직접 다듬은 모양 그대로']);
    rows.push(['각인', s.engraving ? '"' + s.engraving + '"' : '없음']);
    return rows;
  }

  function ringBlocks(ring) {
    var s = ring.spec;
    var model = R.getModel(s.modelId);
    var price = R.estimatePrice(s, 1);
    var pic = ring.image
      ? '<img src="' + ring.image + '" alt="">'
      : R.ringSvg(s, { size: 220 });
    var out = [];
    out.push('<div class="pdf-ring">' +
      '<div class="pic">' + pic + '</div>' +
      '<div>' +
        (ring.who ? '<p class="pdf-who">' + esc(ring.who) + '</p>' : '') +
        '<h3>' + esc(model.name) + '</h3>' +
        '<p class="sub">' + esc(R.FAMILIES[model.family].label) + '</p>' +
        '<p class="pdf-p" style="font-size:12px">' + esc(model.desc || '') + '</p>' +
        '<p class="pdf-price">' + esc(R.priceText(price, 'unit')) + '</p>' +
        '<p class="pdf-p" style="font-size:11px;color:#8b8370">예상 금액 · 최종 금액은 상담에서 확정됩니다</p>' +
      '</div></div>');
    out.push('<table class="pdf-table"><tbody>' + specRows(s).map(function (r) {
      return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>';
    }).join('') + '</tbody></table>');
    var parts = R.priceBreakdown(price);
    if (parts.length) {
      out.push('<table class="pdf-table"><tbody>' + parts.map(function (r) {
        return '<tr><th style="width:auto">' + esc(r[0]) + '</th><td style="text-align:right">' + R.formatKRW(r[1]) + '</td></tr>';
      }).join('') + '</tbody></table>');
    }
    // 사진 · 사양표 · 금액 내역을 한 덩어리로 — 반지 하나가 두 쪽에 갈라지지 않게
    return ['<div style="display:flex;flex-direction:column;gap:10px">' + out.join('') + '</div>'];
  }

  function recommendBlocks(people, cp, seed, extra) {
    var out = [];
    var cards;
    if (people.length > 1 && cp && ONM.compat) {
      var a = recOf(people[0].ilju), b = recOf(people[1].ilju);
      cards = ONM.compat.coupleRings(a, b, { bridge: cp.bridge, seed: seed || 1, limit: 4 }).map(function (p) {
        return { spec: p.specA, name: p.model.name, fit: p.fit + '% 어울림', reason: p.reason };
      });
      out.push('<p class="pdf-h">두 분께 어울리는 커플링</p>');
    } else {
      var ro = { seed: seed || 1, limit: 4 };
      Object.keys(extra || {}).forEach(function (k) { if (extra[k]) ro[k] = extra[k]; });
      cards = R.recommend(recOf(people[0].ilju), ro).map(function (x) {
        return { spec: x.spec, name: x.spec.modelName, fit: x.fit + '% 적합', reason: x.reason };
      });
      out.push('<p class="pdf-h">이 결에 맞는 반지</p>');
    }
    // 두 장씩 한 줄 — 줄 단위로 쪽을 넘깁니다
    for (var i = 0; i < cards.length; i += 2) {
      out.push('<div class="pdf-reco">' + cards.slice(i, i + 2).map(function (c) {
        var price = R.estimatePrice(c.spec, 1);
        return '<div class="pdf-card"><div class="thumb">' + R.ringSvg(c.spec, { size: 84 }) + '</div>' +
          '<div><span class="pdf-fit">' + esc(c.fit) + '</span><b>' + esc(c.name) + '</b>' +
          '<p>' + esc(c.reason) + '</p>' +
          '<p style="margin-top:4px;font-weight:700;color:#22413a">' + esc(R.priceText(price, 'unit')) + '</p></div></div>';
      }).join('') + '</div>');
    }
    return out;
  }

  function closingBlocks() {
    var st = C.studio || {};
    var order = C.order || {};
    var lines = [];
    if (order.deliveryNote) lines.push(order.deliveryNote);
    if (st.address) lines.push('공방 · ' + st.address + (st.hours ? ' · ' + st.hours : ''));
    if (st.addressNote) lines.push(st.addressNote);
    if (order.smartstore) lines.push('스마트스토어 · ' + order.smartstore);
    lines.push('화면의 색과 질감은 실제 제품과 다를 수 있습니다. 금액은 예상 금액이며 상담에서 확정됩니다.');
    return ['<p class="pdf-h">온명 반지공방</p>',
      '<div class="pdf-note">' + lines.map(esc).join('<br>') + '</div>'];
  }

  /* ───────────── 쪽 나누기 ───────────── */
  function newPage(root, title) {
    var page = root.ownerDocument.createElement('div');
    page.className = 'pdf-page';
    page.innerHTML =
      '<div class="pdf-head"><span class="pdf-brand">ONMYEONG<small>온명 반지공방</small></span>' +
        '<span class="pdf-meta">' + esc(title) + ' · ' + today() + '</span></div>' +
      '<div class="pdf-body"></div>' +
      '<div class="pdf-foot"><span>onmyeong · 사주 일주와 맞춤 은반지</span><span class="pdf-no"></span></div>';
    root.appendChild(page);
    return page.querySelector('.pdf-body');
  }

  /** 묶음을 차례로 넣다가 넘치면 다음 쪽으로 넘깁니다. 'BREAK' 는 새 쪽에서 시작 */
  function layout(root, blocks, title) {
    var body = newPage(root, title);
    blocks.forEach(function (html) {
      if (html === 'BREAK') {
        if (body.children.length) body = newPage(root, title);
        return;
      }
      var tmp = root.ownerDocument.createElement('div');
      tmp.innerHTML = html;
      var el = tmp.firstElementChild;
      body.appendChild(el);
      if (body.scrollHeight > body.clientHeight + 1 && body.children.length > 1) {
        // 제목이 쪽 끝에 홀로 남지 않도록, 바로 앞이 제목이면 같이 넘깁니다
        var prev = el.previousElementSibling;
        var carry = prev && prev.classList.contains('pdf-h') && body.children.length > 2 ? prev : null;
        body.removeChild(el);
        if (carry) body.removeChild(carry);
        body = newPage(root, title);
        if (carry) body.appendChild(carry);
        body.appendChild(el);
      }
    });
    var pages = root.querySelectorAll('.pdf-page');
    Array.prototype.forEach.call(pages, function (pg, i) {
      pg.querySelector('.pdf-no').textContent = (i + 1) + ' / ' + pages.length;
    });
    return pages;
  }

  function build(opts) {
    var people = (opts.people || []).filter(function (p) { return recOf(p.ilju); });
    var cp = null;
    if (people.length > 1 && ONM.compat) {
      cp = ONM.compat.compare(recOf(people[0].ilju), recOf(people[1].ilju),
        { a: people[0].name || '', b: people[1].name || '' });
    }
    var blocks = [];
    people.forEach(function (p, i) {
      if (i) blocks.push('BREAK');
      blocks = blocks.concat(personBlocks(p, people.length > 1 ? (i ? '두 번째 분 · ' : '첫 번째 분 · ') : ''));
    });
    if (cp) { blocks.push('BREAK'); blocks = blocks.concat(compatBlocks(cp, people)); }
    var rings = (opts.rings || []).filter(function (r) { return r && r.spec; });
    if (rings.length) {
      blocks.push('BREAK');
      blocks.push('<p class="pdf-h">' + (rings.length > 1 ? '맞춘 반지 한 쌍' : '맞춘 반지') + '</p>');
      rings.forEach(function (r) { blocks = blocks.concat(ringBlocks(r)); });
    } else if (people.length) {
      blocks = blocks.concat(recommendBlocks(people, cp, opts.seed, opts.recommend));
    }
    blocks = blocks.concat(closingBlocks());

    var title = people.length > 1
      ? recOf(people[0].ilju).id + ' × ' + recOf(people[1].ilju).id + ' 궁합 리포트'
      : people.length ? recOf(people[0].ilju).id + ' 일주 리포트' : '반지 사양서';
    return { blocks: blocks, title: title };
  }

  /* 파일 이름은 영문으로 둡니다 — 한글 이름은 일부 브라우저가 "download" 로 바꿔 버립니다 */
  function fileName(opts) {
    var d = new Date();
    var ymd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    var kind = (opts.people || []).length > 1 ? 'couple' : (opts.rings && opts.rings.length ? 'ring' : 'report');
    return 'onmyeong-' + kind + '-' + ymd + '.pdf';
  }

  /** PDF 를 만들어 내려받습니다. 버튼을 넘기면 만드는 동안 글자를 바꿔 둡니다. */
  function download(opts, btn) {
    opts = opts || {};
    var label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'PDF 만드는 중…'; }
    var frame;
    var done = function (msg) {
      if (frame) frame.remove();
      if (!btn) return;
      btn.textContent = msg || label;
      setTimeout(function () { btn.disabled = false; btn.textContent = label; }, msg ? 2400 : 0);
    };
    var branches = (opts.people || []).map(function (p) { var r = recOf(p.ilju); return r && r.branch; })
      .filter(Boolean);
    return tools().then(function () {
      return Promise.all(branches.map(tintSeal));
    }).then(function () {
      frame = makeFrame();
      var doc = frame.contentDocument;
      var root = doc.body;
      var plan = build(opts);
      // 웹폰트가 다 들어온 뒤에 쪽을 나눠야 글자 폭이 맞습니다
      var timeout = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
      var fontsReady = function () {
        var links = Array.prototype.map.call(doc.querySelectorAll('link'), function (l) {
          return l.sheet ? null : new Promise(function (ok) { l.onload = l.onerror = ok; });
        });
        return Promise.race([Promise.all(links), timeout(3000)]).then(function () {
          if (!doc.fonts || !doc.fonts.load) return null;
          var want = ['400 13px "Noto Sans KR"', '700 13px "Noto Sans KR"', '700 26px "Noto Serif KR"'];
          return Promise.race([
            Promise.all(want.map(function (f) { return doc.fonts.load(f, '온명 반지 가나다').catch(function () {}); })),
            timeout(4000)
          ]);
        });
      };
      var pages;
      return fontsReady().then(function () {
        pages = layout(root, plan.blocks, plan.title);
        return fontsReady();
      }).then(function () { return waitImages(root); }).then(function () {
        var pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
        var chain = Promise.resolve();
        Array.prototype.forEach.call(pages, function (pg, i) {
          chain = chain.then(function () {
            return window.html2canvas(pg, { scale: 2, backgroundColor: '#fbf8f1', logging: false, useCORS: true });
          }).then(function (canvas) {
            if (i) pdf.addPage();
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
          });
        });
        return chain.then(function () {
          pdf.setProperties({ title: plan.title, author: '온명 반지공방' });
          saveBlob(pdf.output('blob'), fileName(opts));
          done('PDF를 저장했습니다');
          return pages.length;
        });
      });
    }).catch(function (e) {
      console.error(e);
      done('PDF를 만들지 못했습니다');
      throw e;
    });
  }

  /* 파일로 내려받기 — 이름을 붙여 저장합니다 (아이폰·아이패드 사파리는 미리보기에서 저장/공유) */
  function saveBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  function waitImages(root) {
    var imgs = root.querySelectorAll('img');
    return Promise.all(Array.prototype.map.call(imgs, function (im) {
      return im.complete ? null : new Promise(function (ok) { im.onload = im.onerror = ok; });
    }));
  }

  ONM.pdfReport = { download: download, build: build };
})();
