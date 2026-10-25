/*
 * 온명 — PDF 리포트 내려받기
 * ------------------------------------------------------------------
 * 상담 내용을 A4 몇 장으로 정리해 PDF 파일로 내려받습니다.
 *   · 일주 상담 내용 그대로 — 두 글자 풀이 · 성향 · 강점과 조언 · 생활 · 십신 · 십이운성 ·
 *     오행 배속 · 맞는 일주 · 행운 키워드와 원석
 *   · 두 사람이면 궁합 상담 내용(세 갈래 어울림 · 글자 풀이 · 십신 · 함께 지낼 때 · 관계의 흐름 ·
 *     서로에게 하는 말)과 두 분 각자의 일주
 *   · 스튜디오에서 만들 때만 맞춘 반지 사양서 (추천 디자인은 싣지 않습니다)
 *   · 공방 안내
 *
 * 화면을 그대로 찍는 게 아니라 PDF 용 지면을 따로 짜서 한 장씩 그림으로 굽습니다.
 * (한글 글꼴을 PDF 에 따로 넣지 않아도 화면에서 보이는 글꼴 그대로 나옵니다)
 * 굽는 도구(html2canvas · jsPDF)는 버튼을 눌렀을 때만 불러옵니다 — 평소 페이지는 가볍게.
 *
 * 쓰는 법:
 *   ONMYEONG.pdfReport.download({
 *     people: [{ ilju: '계묘', name: '지민' }, { ilju: '갑자', name: '하늘' }],  // 1~2명
 *     rings:  [{ spec: spec, image: 'data:image/png…', who: '지민 님' }],         // 맞춘 반지 (스튜디오만)
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
    var chain = ONM.compat ? Promise.resolve() : load(ASSETS + 'js/compat.js');
    // 깊이 읽기(십신 · 십이운성 · 생활)는 궁합 계산을 쓰므로 그 뒤에 불러옵니다
    jobs.push(chain.then(function () { return ONM.reading ? null : load(ASSETS + 'js/reading.js'); }));
    return Promise.all(jobs);
  }

  /* ───────────── 지면 ───────────── */
  var PW = 794, PH = 1123;            // A4 를 96dpi 로 본 크기(px)
  var CSS = [
    'html,body{margin:0;padding:0;background:#fff}',
    'body{font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif}',
    '.pdf-name,.pdf-sec h2,.pdf-ring h3,.num,.pdf-closing,.pdf-letter em{font-family:"Noto Serif KR","Noto Sans KR",serif}',
    '.pdf-page{margin-bottom:20px;width:' + PW + 'px;height:' + PH + 'px;box-sizing:border-box;padding:46px 60px 34px;',
    ' background:#fbf8f1;color:#2b2a26;display:flex;flex-direction:column;font-size:13.5px;line-height:1.72;',
    ' word-break:keep-all;overflow-wrap:anywhere}',
    '.pdf-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #d9d0bd;',
    ' padding-bottom:12px;margin-bottom:22px}',
    '.pdf-brand{font-size:15px;letter-spacing:.32em;color:#22413a;font-weight:600}',
    '.pdf-brand small{letter-spacing:.08em;font-size:11px;color:#8b8370;margin-left:8px;font-weight:400}',
    '.pdf-meta{font-size:11px;color:#8b8370}',
    '.pdf-body{flex:1;overflow:hidden;display:flex;flex-direction:column;gap:14px}',
    '.pdf-foot{display:flex;justify-content:space-between;border-top:1px solid #e3dccb;padding-top:9px;',
    ' margin-top:14px;font-size:10.5px;color:#9a917c}',
    // 단락 제목
    '.pdf-sec{border-left:4px solid #5d7f70;padding:2px 0 2px 14px}',
    '.pdf-sec span{display:block;font-size:11px;letter-spacing:.2em;color:#6f8a7e;font-weight:700}',
    '.pdf-sec h2{margin:2px 0 0;font-size:20px;line-height:1.35;color:#1f2b28;font-weight:700}',
    '.pdf-sec p{margin:4px 0 0;font-size:12.5px;color:#7a7262}',
    // 대문
    '.pdf-hero{display:flex;gap:24px;align-items:center;background:#f2ecdf;border-radius:20px;padding:26px 28px}',
    '.pdf-seal{width:112px;height:112px;flex:none;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#fff}',
    '.pdf-seal svg,.pdf-seal img{width:62%;height:62%;display:block}',
    '.pdf-who{font-size:13px;color:#7a7262;margin:0}',
    '.pdf-name{font-size:36px;font-weight:700;color:#1f2b28;margin:2px 0 0;line-height:1.2}',
    '.pdf-name small{font-size:22px;color:#6f6858;margin-left:6px;font-weight:600}',
    '.pdf-phrase{font-size:15px;color:#4f6b5f;margin:6px 0 0;font-weight:500}',
    '.pdf-tag{font-size:13px;color:#7a7262;margin:4px 0 0}',
    '.pdf-lead{margin:0;font-size:14.5px;line-height:1.85}',
    '.pdf-key{font-weight:700;color:#22413a}',
    '.pdf-strong{font-weight:600;color:#2f3d38}',
    '.pdf-sub{color:#8b8370;font-size:12px}',
    '.pdf-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
    '.pdf-card{background:#fff;border:1px solid #e6dfcf;border-radius:14px;padding:14px 18px}',
    '.pdf-card b{display:block;color:#22413a;font-size:14px;margin-bottom:4px}',
    '.pdf-card p{margin:0;font-size:13px;color:#46433c}',
    '.pdf-card p + p{margin-top:6px}',
    '.pdf-eyebrow{display:block;font-style:normal;font-size:11px;letter-spacing:.14em;color:#6f8a7e;font-weight:700;margin-bottom:2px}',
    '.pdf-tone{background:#eef3ef;border-color:#d5e2d9}',
    '.pdf-warm{background:#f7efe4;border-color:#eadbc6}',
    '.pdf-letter em{display:block;font-style:normal;font-size:26px;font-weight:700;color:#22413a;line-height:1.2;margin-bottom:4px}',
    '.pdf-rows{padding:6px 18px}',
    '.pdf-row{display:grid;grid-template-columns:118px 1fr;gap:14px;padding:9px 0;border-bottom:1px solid #eee6d6}',
    '.pdf-row:last-child{border-bottom:0}',
    '.pdf-row b{margin:0;font-size:13px}',
    '.pdf-row span{font-size:13px;color:#46433c}',
    '.pdf-mini{display:grid;gap:6px;margin-top:10px;padding-top:10px;border-top:1px dashed #e3dccb}',
    '.pdf-mini div{font-size:12.5px;color:#46433c}',
    '.pdf-mini i{font-style:normal;font-weight:700;color:#5d7f70;margin-right:8px}',
    '.pdf-level{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;margin:6px 0 8px;font-size:12px;color:#5d7f70;font-weight:700}',
    '.pdf-cells{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}',
    '.pdf-cells div{background:#fff;border:1px solid #e6dfcf;border-radius:12px;padding:10px 14px}',
    '.pdf-cells i{display:block;font-style:normal;font-size:11px;color:#8b8370}',
    '.pdf-cells b{font-size:13.5px;color:#22413a}',
    '.pdf-score-s{display:inline-block;margin-left:6px;font-size:12px;color:#fff;background:#5d7f70;border-radius:999px;padding:0 8px}',
    '.pdf-chips{display:flex;flex-wrap:wrap;gap:8px}',
    '.pdf-chips span{background:#fff;border:1px solid #e1d8c5;border-radius:999px;padding:3px 12px;font-size:12.5px}',
    '.pdf-chips-lg span{font-size:14px;padding:5px 16px}',
    '.pdf-stones{display:flex;gap:22px;flex-wrap:wrap}',
    '.pdf-stone{display:flex;gap:10px;align-items:center;font-size:13px}',
    '.pdf-stone svg{width:46px;height:46px}',
    '.pdf-closing{margin:6px 0 0;text-align:center;font-size:19px;line-height:1.6;color:#22413a;font-weight:600;padding:14px 20px}',
    // 궁합
    '.pdf-pair{justify-content:space-between;gap:12px}',
    '.pdf-pair-one{display:flex;flex-direction:column;align-items:center;text-align:center;width:200px}',
    '.pdf-pair-one .pdf-seal{width:92px;height:92px;margin-bottom:8px}',
    '.pdf-pair-one b{font-size:17px;color:#1f2b28}',
    '.pdf-pair-one span{font-size:13px;color:#4f6b5f}',
    '.pdf-pair-one em{font-style:normal;font-size:12px;color:#7a7262}',
    '.pdf-pair-mid{text-align:center}',
    '.pdf-pair-mid .num{font-size:56px;font-weight:700;color:#22413a;line-height:1}',
    '.pdf-pair-mid .num small{font-size:16px;color:#7a7262;font-weight:400;margin-left:3px}',
    '.pdf-pair-mid b{display:block;margin-top:6px;font-size:15px;color:#4f6b5f}',
    '.pdf-axis{display:grid;grid-template-columns:190px 34px 1fr;gap:4px 10px;align-items:center;padding:8px 0;border-bottom:1px solid #eee6d6}',
    '.pdf-axis:last-child{border-bottom:0}',
    '.pdf-axis b{margin:0;font-size:13px}',
    '.pdf-axis span{font-weight:700;color:#22413a}',
    '.pdf-axis p{grid-column:1 / -1;margin:0;font-size:12.5px;color:#5a564d}',
    '.pdf-bar{height:8px;border-radius:9px;background:#e8e1d2;overflow:hidden}',
    '.pdf-bar i{display:block;height:100%;background:#5d7f70;border-radius:9px}',
    '.pdf-list{margin:0;padding-left:18px;font-size:13px;color:#46433c}',
    '.pdf-list li + li{margin-top:4px}',
    '.pdf-words p{margin:0 0 10px}',
    '.pdf-words p:last-child{margin:0}',
    '.pdf-words i{display:block;font-style:normal;font-size:11.5px;color:#7a7262}',
    // 사양서 (스튜디오)
    '.pdf-ring{display:grid;grid-template-columns:240px 1fr;gap:20px;align-items:start}',
    '.pdf-ring .pic{width:240px;height:200px;border-radius:14px;background:linear-gradient(170deg,#fbf8f1,#efe7d6);',
    ' border:1px solid #e6dfcf;display:flex;align-items:center;justify-content:center;overflow:hidden}',
    '.pdf-ring .pic img{width:100%;height:100%;object-fit:cover}',
    '.pdf-ring .pic svg{width:86%;height:86%}',
    '.pdf-ring h3{margin:0;font-size:21px;color:#1f2b28}',
    '.pdf-ring .sub{font-size:12px;color:#7a7262;margin:2px 0 6px}',
    '.pdf-price{font-size:22px;font-weight:700;color:#22413a;margin:8px 0 0}',
    '.pdf-table{width:100%;border-collapse:collapse;font-size:13px}',
    '.pdf-table th{text-align:left;font-weight:500;color:#7a7262;width:110px;padding:6px 8px 6px 0;vertical-align:top;',
    ' border-bottom:1px solid #eee6d6}',
    '.pdf-table td{padding:6px 0;border-bottom:1px solid #eee6d6;color:#2f2d28}',
    '.pdf-who{font-size:13px;color:#7a7262;margin:0}',
    '.pdf-note{font-size:12px;color:#6b6457;background:#f2ecdf;border-radius:12px;padding:14px 18px;line-height:1.75}',
    '.pdf-note b{display:block;color:#22413a;font-size:13px;margin-bottom:4px;letter-spacing:.06em}',
    '.pdf-end{margin-top:auto}'
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

  /* 상담 화면 순서 그대로 담습니다 (매장 상담 · 리포트 화면과 같은 자료)
   *   일주 → 두 글자 풀이 → 한 줄로 읽는 나 → 성향 → 강점 · 조언 → 생활 → 타고난 기운 → 맞는 일주 → 행운 */
  function sec(no, title, sub) {
    return '<div class="pdf-sec"><span>' + esc(no) + '</span><h2>' + esc(title) + '</h2>' +
      (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>';
  }
  function card(title, body, cls) {
    return '<div class="pdf-card' + (cls ? ' ' + cls : '') + '">' + (title ? '<b>' + esc(title) + '</b>' : '') +
      '<p>' + esc(body || '') + '</p></div>';
  }
  function rows(list) {
    return '<div class="pdf-card pdf-rows">' + list.map(function (r) {
      return '<div class="pdf-row"><b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span></div>';
    }).join('') + '</div>';
  }

  function heroBlock(p, rec, label) {
    var color = ONM.zodiacColor ? ONM.zodiacColor(rec) : { solid: '#5d7f70' };
    return '<div class="pdf-hero">' +
      '<div class="pdf-seal" style="background:' + color.solid + '">' + seal(rec) + '</div>' +
      '<div>' +
        '<p class="pdf-who">' + esc(label || '') + (p.name ? esc(p.name) + ' 님의 일주' : rec.id + ' 일주') + '</p>' +
        '<p class="pdf-name">' + esc(rec.id) + ' <small>' + esc(rec.hanja) + '</small></p>' +
        '<p class="pdf-phrase">' + esc(ONM.iljuPhrase ? ONM.iljuPhrase(rec) : '') + '</p>' +
        '<p class="pdf-tag">' + esc((rec.tagline || '').replace(/\s*\/\s*/g, ' · ')) + '</p>' +
      '</div></div>';
  }

  function chipsBlock(rec) {
    return '<div class="pdf-chips">' + [
      '일간 ' + rec.stem + '(' + rec.stemInfo.hanja + ') · ' + rec.stemInfo.elem + ' — ' + rec.stemInfo.title,
      '일지 ' + rec.branch + '(' + rec.branchInfo.hanja + ') · ' + rec.branchInfo.elem + ' — ' +
        rec.branchInfo.animal + ', ' + rec.branchInfo.title,
      '60갑자 ' + (rec.index + 1) + '번째'
    ].map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>';
  }

  function lettersBlock(rec) {
    return '<div class="pdf-grid2">' +
      '<div class="pdf-card pdf-letter"><em>' + esc(rec.stem + ' ' + rec.stemInfo.hanja) + '</em>' +
        '<b>윗글자 · ' + esc(rec.stemInfo.title + ' · ' + rec.stemInfo.elem) + '</b>' +
        '<p>' + esc(rec.stemInfo.long || rec.stemInfo.desc || '') + '</p></div>' +
      '<div class="pdf-card pdf-letter"><em>' + esc(rec.branch + ' ' + rec.branchInfo.hanja) + '</em>' +
        '<b>아랫글자 · ' + esc(rec.branchInfo.animal + ' · ' + rec.branchInfo.title + ' · ' + rec.branchInfo.elem) + '</b>' +
        '<p>' + esc(rec.branchInfo.long || rec.branchInfo.desc || '') + '</p></div>' +
    '</div>';
  }

  function traitsBlock(rec) {
    return '<div class="pdf-grid2">' + rec.traits.map(function (t) { return card(t[0], t[1]); }).join('') + '</div>';
  }

  function personBlocks(p, label, short) {
    var rec = recOf(p.ilju);
    if (!rec) return [];
    var deep = ONM.reading ? ONM.reading.solo(rec) : null;
    var nm = p.name ? p.name + ' 님' : '이 일주';
    var out = [];
    out.push(heroBlock(p, rec, label));
    out.push(chipsBlock(rec));
    out.push('<p class="pdf-lead"><span class="pdf-key">' + esc(rec.keywords) + '</span><br>' + esc(rec.summary) + '</p>');

    if (!short) {
      out.push(sec('두 글자 풀이', '윗글자와 아랫글자', '일주는 두 글자입니다. 윗글자는 겉으로 드러나는 나, 아랫글자는 나를 받치는 자리입니다.'));
      out.push(lettersBlock(rec));
      if (deep && deep.flow) out.push(card(deep.flow.title, (deep.flow.head ? deep.flow.head + ' ' : '') + deep.flow.body, 'pdf-tone'));
    }

    out.push(sec('성향', nm + (p.name ? '은' : '는') + ' 이런 결을 가지셨습니다'));
    out.push(traitsBlock(rec));
    out.push('<div class="pdf-grid2">' + card('나의 강점', rec.strength, 'pdf-tone') +
      card('이렇게 해 보세요', rec.advice, 'pdf-warm') + '</div>');
    if (short) return out;

    if (deep && deep.life && deep.life.length) {
      out.push(sec('생활', '생활에서 쓰는 법', '일, 사람, 돈, 쉼, 몸 — 다섯 자리에서 이 결을 쓰는 방법입니다.'));
      out.push(rows(deep.life.map(function (L) { return [L.label, L.text]; })));
    }

    if (deep) {
      out.push(sec('타고난 기운', nm + (p.name ? '이' : '가') + ' 타고난 기운'));
      var sp = deep.sipsin;
      if (sp) {
        out.push('<div class="pdf-card"><b>일지에 앉은 자리 (십신) — ' + esc(sp.name) + ' · ' + esc(sp.short || '') + '</b>' +
          '<p class="pdf-strong">' + esc(sp.title || '') + '</p><p>' + esc(sp.body || '') + '</p>' +
          '<div class="pdf-mini">' +
            (sp.good ? '<div><i>잘 쓰면</i>' + esc(sp.good) + '</div>' : '') +
            (sp.watch ? '<div><i>조심할 점</i>' + esc(sp.watch) + '</div>' : '') +
            (sp.spouse ? '<div><i>짝과 함께</i>' + esc(sp.spouse) + '</div>' : '') +
          '</div></div>');
      }
      var st = deep.stage;
      if (st) {
        out.push('<div class="pdf-card"><b>기운의 단계 (십이운성) — ' + esc(st.name) + ' · ' + esc(st.title) +
          ' (12단계 중 ' + st.order + '번째)</b>' +
          '<div class="pdf-level"><div class="pdf-bar"><i style="width:' + Math.max(4, Math.min(100, st.level || 0)) + '%"></i></div>' +
          '<span>기운 ' + (st.level || 0) + '</span></div>' +
          '<p>' + esc(st.body || '') + '</p>' + (st.tip ? '<p class="pdf-strong" style="margin-top:6px">' + esc(st.tip) + '</p>' : '') +
          '</div>');
      }
      var se = deep.elem && deep.elem.stem, be = deep.elem && deep.elem.branch;
      if (se && se.info) {
        var same = be && se.name === be.name;
        out.push('<div class="pdf-cells">' + [
          ['타고난 기운', se.of + '(' + se.name + ') · ' + se.info.word + (same || !be ? '' : ' / ' + be.of + '(' + be.name + ') · ' + be.info.word)],
          ['어울리는 색', se.info.color + (same || !be ? '' : ' · ' + be.info.color)],
          ['방향', se.info.dir], ['숫자', se.info.num], ['계절', se.info.season], ['하루 중', se.info.hour]
        ].map(function (c) { return '<div><i>' + esc(c[0]) + '</i><b>' + esc(c[1]) + '</b></div>'; }).join('') + '</div>');
      }
      if (deep.matches && deep.matches.best && deep.matches.best.length) {
        out.push(sec('맞는 일주', '나와 결이 맞는 일주'));
        var best = deep.matches.best.slice(0, 4);
        for (var i = 0; i < best.length; i += 2) {
          out.push('<div class="pdf-grid2">' + best.slice(i, i + 2).map(function (m) {
            return '<div class="pdf-card"><b>' + esc(m.id) + ' <span class="pdf-score-s">' + m.score + '</span></b>' +
              '<p class="pdf-sub">' + esc(m.phrase || '') + (m.grade ? ' · ' + esc(m.grade) : '') + '</p>' +
              '<p>' + esc(m.why || '') + '</p></div>';
          }).join('') + '</div>');
        }
        if (deep.matches.careful && deep.matches.careful.length) {
          out.push('<div class="pdf-grid2">' + deep.matches.careful.slice(0, 2).map(function (m) {
            return '<div class="pdf-card pdf-warm"><i class="pdf-eyebrow">조금 더 마음 쓸 사이</i>' +
              '<b>' + esc(m.id) + ' <span class="pdf-score-s">' + m.score + '</span></b>' +
              '<p class="pdf-sub">' + esc(m.phrase || '') + '</p><p>' + esc(m.why || '') + '</p></div>';
          }).join('') + '</div>');
        }
      }
    }

    out.push(sec('행운', '행운의 키워드 · 어울리는 원석'));
    out.push('<div class="pdf-chips pdf-chips-lg">' + rec.lucky.map(function (k) { return '<span>' + esc(k) + '</span>'; }).join('') + '</div>');
    out.push('<div class="pdf-stones">' + rec.stones.map(function (s) {
      return '<div class="pdf-stone">' +
        (ONM.stoneIcon ? ONM.stoneIcon(s[0], { size: 46, cut: 'cabochon', label: s[0] }) : '') +
        '<span><b>' + esc(s[0]) + '</b><br>' + esc(s[1]) + '</span></div>';
    }).join('') + '</div>');
    out.push('<p class="pdf-closing">“' + esc(rec.closing) + '”</p>');
    return out;
  }

  function coupleHero(cp, people) {
    var a = recOf(people[0].ilju), b = recOf(people[1].ilju);
    var one = function (p, rec) {
      var color = ONM.zodiacColor ? ONM.zodiacColor(rec) : { solid: '#5d7f70' };
      return '<div class="pdf-pair-one"><div class="pdf-seal" style="background:' + color.solid + '">' + seal(rec) + '</div>' +
        '<b>' + esc(p.name ? p.name + ' 님' : rec.id + ' 일주') + '</b>' +
        '<span>' + esc(rec.id + ' (' + rec.hanja + ')') + '</span>' +
        '<em>' + esc(ONM.iljuPhrase ? ONM.iljuPhrase(rec) : '') + '</em></div>';
    };
    return '<div class="pdf-hero pdf-pair">' + one(people[0], a) +
      '<div class="pdf-pair-mid"><div class="num">' + cp.score + '<small>점</small></div>' +
        '<b>' + esc(cp.grade) + '</b></div>' +
      one(people[1], b) + '</div>';
  }

  function compatBlocks(cp, people) {
    if (!cp) return [];
    var a = recOf(people[0].ilju), b = recOf(people[1].ilju);
    var nmA = people[0].name ? people[0].name + ' 님' : a.id + ' 일주';
    var nmB = people[1].name ? people[1].name + ' 님' : b.id + ' 일주';
    var deep = ONM.reading && ONM.reading.couple ? ONM.reading.couple(a, b, cp) : null;
    var josa = ONM.compat.josa;
    var out = [];
    out.push(coupleHero(cp, people));
    out.push('<p class="pdf-lead"><span class="pdf-key">' + esc(cp.nickname || '') + '</span><br>' + esc(cp.headline || '') +
      (cp.elementLine ? '<br>' + esc(cp.elementLine) : '') + '</p>');

    out.push(sec('어울림', '세 갈래로 본 어울림'));
    out.push('<div class="pdf-card">' + (cp.axes || []).map(function (ax) {
      return '<div class="pdf-axis"><b>' + esc(ax.name) + '</b><span>' + ax.score + '</span>' +
        '<div class="pdf-bar"><i style="width:' + Math.max(4, Math.min(100, ax.score)) + '%"></i></div>' +
        '<p>' + esc(ax.note || '') + '</p></div>';
    }).join('') + '</div>');
    if (cp.yinYang) out.push(card('음양 — ' + cp.yinYang.label, cp.yinYang.text, 'pdf-tone'));

    out.push(sec('글자 풀이', '글자로 본 두 분'));
    out.push(rows([['윗글자', cp.stemLine], ['아랫글자', cp.branchLine], ['오행', cp.elementLine]]
      .filter(function (r) { return r[1]; })));
    if (cp.sipsinA && cp.sipsinB) {
      out.push('<div class="pdf-grid2">' +
        card(nmA + '에게 ' + josa.eun(nmB) + ' ' + cp.sipsinA.name + ' — ' + (cp.sipsinA.title || ''), cp.sipsinA.text) +
        card(nmB + '에게 ' + josa.eun(nmA) + ' ' + cp.sipsinB.name + ' — ' + (cp.sipsinB.title || ''), cp.sipsinB.text) +
      '</div>');
    }

    out.push(sec('함께', '함께 지낼 때'));
    var list = function (items) {
      return '<ul class="pdf-list">' + ((items && items.length ? items : ['특별히 짚을 것이 없는, 무난한 자리입니다.'])
        .map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('')) + '</ul>';
    };
    out.push('<div class="pdf-grid2">' +
      '<div class="pdf-card pdf-tone"><b>잘 맞는 점</b>' + list(cp.good) + '</div>' +
      '<div class="pdf-card pdf-warm"><b>서로 챙겨 주면 좋은 점</b>' + list(cp.care) + '</div></div>');
    var chem = cp.chemistry || [];
    for (var i = 0; i < chem.length; i += 2) {
      out.push('<div class="pdf-grid2">' + chem.slice(i, i + 2).map(function (c) {
        return '<div class="pdf-card"><i class="pdf-eyebrow">' + esc(c.label || '') + '</i><b>' + esc(c.title) + '</b><p>' + esc(c.text) + '</p></div>';
      }).join('') + '</div>');
    }

    if (deep) {
      if (deep.stages && deep.stages.length) {
        out.push(sec('관계의 흐름', '만나서 오래 가기까지'));
        for (var k = 0; k < deep.stages.length; k += 2) {
          out.push('<div class="pdf-grid2">' + deep.stages.slice(k, k + 2).map(function (x) {
            return '<div class="pdf-card"><i class="pdf-eyebrow">' + esc(x.label) + '</i><b>' + esc(x.title) + '</b><p>' + esc(x.text) + '</p></div>';
          }).join('') + '</div>');
        }
      }
      [deep.roles, deep.tempo, deep.longRun].forEach(function (x) { if (x) out.push(card(x.title, x.text)); });
      if (deep.words) {
        var same = a.id === b.id;
        var words = function (lst) {
          return (same ? lst.slice(0, 1) : lst).map(function (w) {
            return '<p><i>' + esc(same ? '두 분 모두' : w.who + '에게') + '</i><span class="pdf-strong">' + esc(w.text) + '</span><br>' +
              '<span class="pdf-sub">' + esc(same ? '같은 일주라 서로에게 같은 자리입니다.' : (w.note || '')) + '</span></p>';
          }).join('');
        };
        out.push(sec('말 한마디', '서로에게 하는 말'));
        out.push('<div class="pdf-grid2">' +
          '<div class="pdf-card pdf-tone pdf-words"><b>이 말 한마디면 풀립니다</b>' + words(deep.words.good || []) + '</div>' +
          '<div class="pdf-card pdf-warm pdf-words"><b>오래 남는 말 — 조심해 주세요</b>' + words(deep.words.avoid || []) + '</div></div>');
      }
    }
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

  function closingBlocks() {
    var st = C.studio || {};
    var order = C.order || {};
    var lines = [];
    if (order.deliveryNote) lines.push(order.deliveryNote);
    if (st.address) lines.push('공방 · ' + st.address + (st.hours ? ' · ' + st.hours : ''));
    if (st.addressNote) lines.push(st.addressNote);
    if (order.smartstore) lines.push('스마트스토어 · ' + order.smartstore);
    lines.push('화면의 색과 질감은 실제 제품과 다를 수 있습니다. 금액은 예상 금액이며 상담에서 확정됩니다.');
    return ['<div class="pdf-note pdf-end"><b>온명 반지공방</b>' + lines.map(esc).join('<br>') + '</div>'];
  }

  function shortContact() {
    var st = C.studio || {};
    return '온명 반지공방' + (st.address ? ' · ' + st.address : '') + (st.hours ? ' · ' + st.hours : '') +
      ' · 금액은 상담에서 확정됩니다';
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
    var tail = false;
    blocks.forEach(function (html) {
      if (html === 'BREAK') {
        if (body.children.length) body = newPage(root, title);
        return;
      }
      if (html === 'END') { tail = true; return; }
      // 반쯤 비어 있는 쪽이면 이어서, 절반 넘게 찼으면 새 쪽에서 시작합니다
      if (html === 'SOFT') {
        var last = body.lastElementChild;
        var usedH = last ? last.offsetTop + last.offsetHeight - body.offsetTop : 0;
        if (usedH > body.clientHeight * 0.5) body = newPage(root, title);
        return;
      }
      var tmp = root.ownerDocument.createElement('div');
      tmp.innerHTML = html;
      var el = tmp.firstElementChild;
      body.appendChild(el);
      if (tail && body.scrollHeight > body.clientHeight + 1) {
        /* 마지막 공방 안내가 남은 자리에 안 들어가면, 그것 하나 때문에 빈 쪽을 만들지 않고
         * 마지막 쪽 아래 줄에 짧게 줄여 넣습니다. */
        body.removeChild(el);
        var foot = body.parentNode.querySelector('.pdf-foot span');
        if (foot) foot.textContent = shortContact();
        return;
      }
      if (body.scrollHeight > body.clientHeight + 1 && body.children.length > 1) {
        // 제목이 쪽 끝에 홀로 남지 않도록, 바로 앞이 제목이면 같이 넘깁니다
        var prev = el.previousElementSibling;
        var carry = prev && prev.classList.contains('pdf-sec') && body.children.length > 2 ? prev : null;
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
      spread(pg.querySelector('.pdf-body'));
    });
    return pages;
  }

  /* 쪽마다 남는 아래 여백을 묶음 사이 간격으로 나눠 줍니다.
   * 내용이 위로 몰려 아래가 텅 비어 보이지 않게 — 다만 너무 벌어지지 않게 한 칸에 28px 까지만. */
  function spread(body) {
    var kids = Array.prototype.slice.call(body.children).filter(function (k) { return !k.classList.contains('pdf-end'); });
    if (kids.length < 2) return;
    var base = 14;
    var used = 0;
    Array.prototype.forEach.call(body.children, function (k) { used += k.offsetHeight; });
    used += base * (body.children.length - 1);
    var free = body.clientHeight - used;
    if (free <= 0) return;
    // 제목(.pdf-sec) 앞은 조금 더 넓게 — 단락이 끊어져 읽히도록
    var weights = kids.map(function (k, i) { return i === 0 ? 0 : (k.classList.contains('pdf-sec') ? 2 : 1); });
    var total = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
    var unit = Math.min(free / total, 16);
    kids.forEach(function (k, i) { if (weights[i]) k.style.marginTop = Math.round(unit * weights[i]) + 'px'; });
  }

  function build(opts) {
    var people = (opts.people || []).filter(function (p) { return recOf(p.ilju); });
    var cp = null;
    if (people.length > 1 && ONM.compat) {
      cp = ONM.compat.compare(recOf(people[0].ilju), recOf(people[1].ilju),
        { a: people[0].name || '', b: people[1].name || '' });
    }
    var blocks = [];
    if (cp) {
      // 둘이 보기 — 궁합 상담 내용을 먼저, 이어서 두 분 각자의 일주를 한 장씩
      blocks = blocks.concat(compatBlocks(cp, people));
      people.forEach(function (p, i) {
        blocks.push('SOFT');
        blocks = blocks.concat(personBlocks(p, i ? '두 번째 분 · ' : '첫 번째 분 · ', true));
      });
    } else {
      people.forEach(function (p, i) {
        if (i) blocks.push('BREAK');
        blocks = blocks.concat(personBlocks(p, ''));
      });
    }
    // 스튜디오에서 만들 때만 — 직접 맞춘 반지의 사양서를 붙입니다 (추천 디자인은 싣지 않습니다)
    var rings = (opts.rings || []).filter(function (r) { return r && r.spec; });
    if (rings.length) {
      blocks.push('BREAK');
      blocks.push(sec('사양서', rings.length > 1 ? '맞춘 반지 한 쌍' : '맞춘 반지'));
      rings.forEach(function (r) { blocks = blocks.concat(ringBlocks(r)); });
    }
    blocks.push('END');
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
