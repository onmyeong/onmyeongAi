/*
 * 온명 — 공유하기
 * ------------------------------------------------------------------
 * 리포트를 링크로, 또는 한 장의 이미지 카드로 내보냅니다.
 * 이미지는 브라우저 안에서 직접 그리므로 서버가 없어도 동작합니다.
 * 휴대폰에서는 기기의 공유 시트(카카오톡·인스타그램 등)로 바로 넘어갑니다.
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG = global.ONMYEONG || {};
  var doc = global.document;

  var W = 1080, H = 1350;                 // 카드 크기 (SNS에 올리기 좋은 4:5)
  var CREAM = '#f5f1e7', PAPER = '#fffdf8', INK = '#2f2f2b', MUTED = '#8c897e', LINE = '#e6e0d1';
  var SERIF = '"Noto Serif KR","Nanum Myeongjo","Apple SD Gothic Neo",serif';
  var SANS = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif';

  /* ───────────────── 공유 시트 · 링크 복사 ───────────────── */

  function canShare() { return !!(global.navigator && navigator.share); }

  /** 버튼 글자를 잠깐 바꿔 결과를 알려 줍니다 */
  function flash(btn, msg) {
    if (!btn) return;
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
    btn.textContent = msg;
    global.setTimeout(function () { btn.textContent = btn.dataset.label; }, 2200);
  }

  function copyLink(url, btn) {
    url = url || global.location.href;
    var ok = function () { flash(btn, '링크를 복사했어요'); };
    var no = function () { flash(btn, '복사 실패 — 주소창을 이용해 주세요'); };
    if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(ok, no);
    } else {
      try {
        var ta = doc.createElement('textarea');
        ta.value = url; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px';
        doc.body.appendChild(ta); ta.select();
        doc.execCommand('copy') ? ok() : no();
        doc.body.removeChild(ta);
      } catch (e) { no(); }
    }
  }

  /**
   * 공유하기 — 기기가 공유 시트를 지원하면 그걸로, 아니면 링크 복사로 넘어갑니다.
   * @param {Object} p { title, text, url, file }
   */
  function share(p, btn) {
    p = p || {};
    var url = p.url || global.location.href;
    if (!canShare()) { copyLink(url, btn); return; }

    var data = { title: p.title, text: p.text, url: url };
    if (p.file && navigator.canShare && navigator.canShare({ files: [p.file] })) {
      data = { title: p.title, text: p.text, files: [p.file] };
    }
    navigator.share(data).catch(function (err) {
      // 사용자가 공유 창을 닫은 것은 오류가 아닙니다
      if (err && err.name === 'AbortError') return;
      copyLink(url, btn);
    });
  }

  /* ───────────────── 이미지 카드 그리기 ───────────────── */

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new global.Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('이미지를 불러오지 못했습니다: ' + src)); };
      img.src = src;
    });
  }

  function svgToUrl(svg, size) {
    // 데이터 URI로 넣을 때는 크기가 퍼센트면 안 되므로 실제 픽셀로 바꿔 줍니다
    var fixed = svg.replace('width="100%" height="100%"', 'width="' + size + '" height="' + size + '"');
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fixed);
  }

  /** 십이지 아이콘 파일을 원하는 색으로 물들여 돌려줍니다 */
  function tintedZodiac(branch, color, size) {
    var cfg = (ONM.CONFIG && ONM.CONFIG.zodiacIcons) || {};
    if (!cfg.custom) return Promise.resolve(null);
    var url = (cfg.path || '') + encodeURIComponent(branch) + (cfg.ext || '.png');
    return loadImage(url).then(function (img) {
      var c = doc.createElement('canvas');
      c.width = c.height = size;
      var x = c.getContext('2d');
      x.drawImage(img, 0, 0, size, size);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = color;
      x.fillRect(0, 0, size, size);
      return c;
    }).catch(function () { return null; });
  }

  function roundRect(x, cx, cy, w, h, r) {
    x.beginPath();
    if (x.roundRect) { x.roundRect(cx, cy, w, h, r); return; }
    x.moveTo(cx + r, cy);
    x.arcTo(cx + w, cy, cx + w, cy + h, r);
    x.arcTo(cx + w, cy + h, cx, cy + h, r);
    x.arcTo(cx, cy + h, cx, cy, r);
    x.arcTo(cx, cy, cx + w, cy, r);
    x.closePath();
  }

  /** 가운데 정렬 글자. 너무 길면 폭에 맞춰 줄입니다 */
  function centerText(x, text, cy, font, color, maxW) {
    x.font = font; x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    if (maxW) x.fillText(text, W / 2, cy, maxW);
    else x.fillText(text, W / 2, cy);
  }

  /** 글자를 폭에 맞춰 여러 줄로 나눕니다 */
  function wrap(x, text, maxW) {
    var words = String(text || '').split(' ');
    var lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var next = cur ? cur + ' ' + words[i] : words[i];
      if (x.measureText(next).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /** 색 동그라미 + 십이지 아이콘 */
  function seal(x, cx, cy, r, color, icon) {
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2);
    x.fillStyle = color; x.fill();
    if (icon) x.drawImage(icon, cx - r * 0.62, cy - r * 0.62, r * 1.24, r * 1.24);
  }

  function backdrop(x) {
    x.fillStyle = CREAM; x.fillRect(0, 0, W, H);
    roundRect(x, 46, 46, W - 92, H - 92, 40);
    x.fillStyle = PAPER; x.fill();
    x.strokeStyle = LINE; x.lineWidth = 2; x.stroke();

    x.textAlign = 'center';
    x.font = '600 26px ' + SERIF; x.fillStyle = '#3d6431';
    x.fillText('O N M Y E O N G', W / 2, 130);
    x.font = '22px ' + SANS; x.fillStyle = MUTED;
    x.fillText('사주 일주로 읽는 나의 반지', W / 2, 172);
  }

  function footer(x, url) {
    x.textAlign = 'center';
    x.font = '22px ' + SANS; x.fillStyle = MUTED;
    x.fillText(url.replace(/^https?:\/\//, '').replace(/\?.*$/, ''), W / 2, H - 92);
  }

  function toBlob(canvas) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) canvas.toBlob(resolve, 'image/png');
      else resolve(null);
    });
  }

  /**
   * 개인 리포트 카드
   * @param {Object} o { record, spec, url }
   */
  function soloCard(o) {
    var rec = o.record;
    var color = ONM.zodiacColor(rec);
    var jobs = [tintedZodiac(rec.branch, '#ffffff', 300)];
    if (o.spec && ONM.rings) jobs.push(loadImage(svgToUrl(ONM.rings.ringSvg(o.spec, { size: 420 }), 420)).catch(function () { return null; }));

    return ready().then(function () { return Promise.all(jobs); }).then(function (res) {
      var icon = res[0], ring = res[1];
      var c = doc.createElement('canvas'); c.width = W; c.height = H;
      var x = c.getContext('2d');
      backdrop(x);

      seal(x, W / 2, 360, 128, color.solid, icon);

      centerText(x, rec.id + ' (' + rec.hanja + ')', 560, '600 62px ' + SERIF, INK);
      centerText(x, ONM.iljuPhrase(rec), 618, '30px ' + SANS, color.ink, W - 220);
      centerText(x, rec.keywords, 672, '26px ' + SANS, MUTED, W - 220);

      if (ring) {
        x.drawImage(ring, W / 2 - 210, 710, 420, 420);
        centerText(x, o.spec.modelName + ' · 온명이 고른 반지', 1170, '26px ' + SANS, INK, W - 200);
      } else {
        x.font = '28px ' + SANS; x.fillStyle = '#5b5b53'; x.textAlign = 'center';
        wrap(x, rec.summary, W - 260).slice(0, 5).forEach(function (line, i) {
          x.fillText(line, W / 2, 790 + i * 50);
        });
      }

      footer(x, o.url || global.location.href);
      return toBlob(c);
    });
  }

  /**
   * 궁합 카드
   * @param {Object} o { a, b, result, url }
   */
  function coupleCard(o) {
    var ca = ONM.zodiacColor(o.a), cb = ONM.zodiacColor(o.b);
    return ready().then(function () {
      return Promise.all([
        tintedZodiac(o.a.branch, '#ffffff', 260),
        tintedZodiac(o.b.branch, '#ffffff', 260)
      ]);
    }).then(function (icons) {
      var c = doc.createElement('canvas'); c.width = W; c.height = H;
      var x = c.getContext('2d');
      backdrop(x);

      seal(x, W / 2 - 200, 350, 110, ca.solid, icons[0]);
      seal(x, W / 2 + 200, 350, 110, cb.solid, icons[1]);
      x.font = '46px ' + SERIF; x.fillStyle = MUTED; x.textAlign = 'center';
      x.fillText('&', W / 2, 368);

      centerText(x, o.a.id + ' × ' + o.b.id, 540, '600 54px ' + SERIF, INK);
      centerText(x, ONM.iljuPhrase(o.a) + ' · ' + ONM.iljuPhrase(o.b), 592, '26px ' + SANS, MUTED, W - 180);

      // 점수 고리
      var cx = W / 2, cy = 830, r = 150;
      x.lineWidth = 26; x.lineCap = 'round';
      x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.strokeStyle = '#efe9dc'; x.stroke();
      x.beginPath();
      x.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (o.result.score / 100));
      x.strokeStyle = ca.solid; x.stroke();
      centerText(x, String(o.result.score), cy + 20, '600 96px ' + SERIF, ca.ink);
      centerText(x, '어울림', cy + 66, '24px ' + SANS, MUTED);

      centerText(x, o.result.grade, 1070, '600 44px ' + SERIF, INK);
      x.font = '28px ' + SANS; x.fillStyle = '#5b5b53'; x.textAlign = 'center';
      wrap(x, o.result.headline, W - 260).slice(0, 2).forEach(function (line, i) {
        x.fillText(line, W / 2, 1130 + i * 46);
      });

      footer(x, o.url || global.location.href);
      return toBlob(c);
    });
  }

  /* ───────────────── 한 줄 카드 ─────────────────
   * 리포트에서 마음에 드는 문장 하나만 크게 떠 있는 카드입니다.
   * 사람들이 SNS에 올리는 건 리포트 전체가 아니라 웃기거나 뜨끔한 한 문장이라,
   * 그 한 줄만 큼직하게 놓고 아래에 누구의 말인지 적어 둡니다. */

  /** 한글은 띄어쓰기가 드물어 글자 단위로도 줄을 나눠 줍니다 */
  function wrapKo(x, text, maxW) {
    var src = String(text || '').trim();
    var lines = [], cur = '';
    for (var i = 0; i < src.length; i++) {
      var ch = src.charAt(i);
      if (x.measureText(cur + ch).width > maxW && cur) {
        // 줄 끝이 공백이면 다듬고 넘깁니다
        lines.push(cur.replace(/\s+$/, ''));
        cur = ch === ' ' ? '' : ch;
      } else {
        cur += ch;
      }
    }
    if (cur.trim()) lines.push(cur.replace(/\s+$/, ''));
    return lines;
  }

  /**
   * 한 줄 카드
   * @param {Object} o { line, who, sub, record, url }
   */
  function lineCard(o) {
    var rec = o.record;
    var color = rec ? ONM.zodiacColor(rec) : { solid: '#3d6431', ink: '#3d6431' };
    var jobs = [rec ? tintedZodiac(rec.branch, '#ffffff', 190) : Promise.resolve(null)];

    return ready().then(function () { return Promise.all(jobs); }).then(function (res) {
      var icon = res[0];
      var c = doc.createElement('canvas'); c.width = W; c.height = H;
      var x = c.getContext('2d');
      backdrop(x);

      // 큰 따옴표
      x.textAlign = 'center';
      x.font = '160px ' + SERIF; x.fillStyle = color.solid;
      x.globalAlpha = 0.18;
      x.fillText('\u201C', W / 2, 400);
      x.globalAlpha = 1;

      // 문장 — 길이에 따라 글자 크기를 줄여 항상 한 화면에 담습니다
      var text = String(o.line || '').trim();
      var size = text.length <= 24 ? 74 : text.length <= 44 ? 62 : text.length <= 70 ? 52 : 44;
      var maxW = W - 240;
      var lines;
      for (;;) {
        x.font = '600 ' + size + 'px ' + SERIF;
        lines = wrapKo(x, text, maxW);
        if (lines.length <= 6 || size <= 34) break;
        size -= 4;
      }
      var lh = Math.round(size * 1.45);
      var top = 560 - Math.round((lines.length - 1) * lh / 2);
      x.fillStyle = INK;
      lines.forEach(function (line, i) { x.fillText(line, W / 2, top + i * lh); });

      // 누구의 말인지
      var baseY = Math.max(top + lines.length * lh + 90, 900);
      seal(x, W / 2, baseY, 82, color.solid, icon);
      centerText(x, o.who || '', baseY + 150, '600 40px ' + SERIF, INK, W - 220);
      if (o.sub) centerText(x, o.sub, baseY + 196, '26px ' + SANS, MUTED, W - 220);

      footer(x, o.url || global.location.href);
      return toBlob(c);
    });
  }

  /** 웹폰트가 준비된 뒤에 그려야 글자가 제대로 나옵니다 */
  function ready() {
    if (doc.fonts && doc.fonts.ready) return doc.fonts.ready.catch(function () {});
    return Promise.resolve();
  }

  function download(blob, filename) {
    if (!blob) return false;
    var url = URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = url; a.download = filename;
    doc.body.appendChild(a); a.click(); doc.body.removeChild(a);
    global.setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return true;
  }

  function toFile(blob, filename) {
    if (!blob || typeof global.File !== 'function') return null;
    try { return new global.File([blob], filename, { type: 'image/png' }); } catch (e) { return null; }
  }

  ONM.share = {
    canShare: canShare,
    share: share,
    copyLink: copyLink,
    flash: flash,
    soloCard: soloCard,
    coupleCard: coupleCard,
    lineCard: lineCard,
    download: download,
    toFile: toFile
  };
})(typeof window !== 'undefined' ? window : globalThis);
