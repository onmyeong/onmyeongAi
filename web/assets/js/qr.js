/*
 * 온명 — QR 코드 (직접 그립니다)
 * ------------------------------------------------------------------
 * 매장에서 쓰는 화면이라 인터넷이 느려도 떠야 합니다.
 * 그래서 바깥 라이브러리를 불러오지 않고 여기서 직접 만듭니다.
 *
 * 바이트 모드 · 오류정정 M · 1~10 버전까지 (최대 213바이트).
 * 그보다 길면 만들지 않고 null 을 돌려주므로, 부르는 쪽에서 링크 복사로 넘깁니다.
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG = global.ONMYEONG || {};

  /* ── 갈루아 필드 GF(256) — 오류정정 부호를 계산하는 산술 ── */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;      // 원시 다항식
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function mul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  /* 오류정정 부호 n개를 만드는 생성 다항식 */
  function genPoly(n) {
    var p = [1];
    for (var i = 0; i < n; i++) {
      var q = p.concat([0]);
      for (var j = 0; j < p.length; j++) q[j + 1] ^= mul(p[j], EXP[i]);
      p = q;
    }
    return p;
  }

  function ecc(data, n) {
    var g = genPoly(n), res = new Array(n).fill(0);
    for (var i = 0; i < data.length; i++) {
      var f = data[i] ^ res[0];
      res.shift(); res.push(0);
      if (f !== 0) for (var j = 0; j < n; j++) res[j] ^= mul(g[j + 1], f);
    }
    return res;
  }

  /* ── 버전별 표 (오류정정 M) ──
   * [담을 수 있는 바이트, 블록당 오류정정 수, [블록수, 블록당 데이터 수] ...] */
  var VER = {
    1:  [14,  10, [[1, 16]]],
    2:  [26,  16, [[1, 28]]],
    3:  [42,  26, [[1, 44]]],
    4:  [62,  18, [[2, 32]]],
    5:  [84,  24, [[2, 43]]],
    6:  [106, 16, [[4, 27]]],
    7:  [122, 18, [[4, 31]]],
    8:  [152, 22, [[2, 38], [2, 39]]],
    9:  [180, 22, [[3, 36], [2, 37]]],
    10: [213, 26, [[4, 43], [1, 44]]]
  };
  /* 맞춤 무늬(얼라인먼트)가 놓이는 자리 */
  var ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };

  function utf8(str) {
    var out = [], s = unescape(encodeURIComponent(str));
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  /* ── 비트 담는 그릇 ── */
  function Bits() { this.a = []; }
  Bits.prototype.put = function (val, len) {
    for (var i = len - 1; i >= 0; i--) this.a.push((val >>> i) & 1);
  };

  /* 나머지 구하기 — 형식·버전 정보에 붙는 오류 검출 부호(BCH) */
  function bitLen(x) { var n = 0; while (x) { n++; x >>>= 1; } return n; }
  function bchRest(d, g) {
    var gl = bitLen(g);
    while (bitLen(d) >= gl) d ^= g << (bitLen(d) - gl);
    return d;
  }

  /* ── 모양 그리기 ── */
  function build(ver, bytes) {
    var info = VER[ver], ecLen = info[1], groups = info[2];
    var total = 0;
    groups.forEach(function (g) { total += g[0] * g[1]; });

    // 1) 비트열 만들기 — 모드(바이트=0100) + 길이 + 내용
    var bits = new Bits();
    bits.put(4, 4);
    bits.put(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach(function (b) { bits.put(b, 8); });
    var cap = total * 8;
    bits.put(0, Math.min(4, cap - bits.a.length));       // 끝맺음
    while (bits.a.length % 8) bits.a.push(0);
    var pad = [0xEC, 0x11], k = 0;
    var words = [];
    for (var i = 0; i < bits.a.length; i += 8) {
      var v = 0;
      for (var j = 0; j < 8; j++) v = (v << 1) | bits.a[i + j];
      words.push(v);
    }
    while (words.length < total) words.push(pad[k++ % 2]);

    // 2) 블록으로 나누고 오류정정 붙이기
    var dataBlocks = [], eccBlocks = [], at = 0;
    groups.forEach(function (g) {
      for (var n = 0; n < g[0]; n++) {
        var blk = words.slice(at, at + g[1]); at += g[1];
        dataBlocks.push(blk);
        eccBlocks.push(ecc(blk, ecLen));
      }
    });
    // 3) 블록을 번갈아 섞기
    var out = [], maxD = 0;
    dataBlocks.forEach(function (b) { maxD = Math.max(maxD, b.length); });
    for (var c = 0; c < maxD; c++)
      for (var bIdx = 0; bIdx < dataBlocks.length; bIdx++)
        if (c < dataBlocks[bIdx].length) out.push(dataBlocks[bIdx][c]);
    for (var e = 0; e < ecLen; e++)
      for (var bi = 0; bi < eccBlocks.length; bi++) out.push(eccBlocks[bi][e]);

    // 4) 판 만들기
    var size = ver * 4 + 17;
    var m = [], fixed = [];
    for (var r = 0; r < size; r++) { m.push(new Array(size).fill(0)); fixed.push(new Array(size).fill(false)); }
    function set(r, c, v) { m[r][c] = v ? 1 : 0; fixed[r][c] = true; }

    function finder(r0, c0) {
      for (var r = -1; r <= 7; r++) for (var c = -1; c <= 7; c++) {
        var rr = r0 + r, cc = c0 + c;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        var on = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                 (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                 (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        set(rr, cc, on);
      }
    }
    finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

    // 맞춤 무늬
    var ap = ALIGN[ver];
    for (var a1 = 0; a1 < ap.length; a1++) for (var a2 = 0; a2 < ap.length; a2++) {
      var ar = ap[a1], ac = ap[a2];
      if ((ar <= 7 && ac <= 7) || (ar <= 7 && ac >= size - 8) || (ar >= size - 8 && ac <= 7)) continue;
      for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++)
        set(ar + dr, ac + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
    }
    // 타이밍
    for (var t2 = 8; t2 < size - 8; t2++) { set(6, t2, t2 % 2 === 0); set(t2, 6, t2 % 2 === 0); }
    set(size - 8, 8, true);                                   // 늘 검은 칸

    // 형식 정보 자리를 미리 막아 둡니다
    for (var f = 0; f < 9; f++) {
      if (!fixed[8][f]) { m[8][f] = 0; fixed[8][f] = true; }
      if (!fixed[f][8]) { m[f][8] = 0; fixed[f][8] = true; }
    }
    for (var f2 = 0; f2 < 8; f2++) {
      if (!fixed[8][size - 1 - f2]) { m[8][size - 1 - f2] = 0; fixed[8][size - 1 - f2] = true; }
      if (!fixed[size - 1 - f2][8]) { m[size - 1 - f2][8] = 0; fixed[size - 1 - f2][8] = true; }
    }
    // 버전 정보 (7 이상)
    if (ver >= 7) {
      var vb = (ver << 12) | bchRest(ver << 12, 0x1f25);
      for (var i2 = 0; i2 < 18; i2++) {
        var bit = (vb >> i2) & 1;
        var rr2 = Math.floor(i2 / 3), cc2 = i2 % 3;
        set(size - 11 + cc2, rr2, bit);
        set(rr2, size - 11 + cc2, bit);
      }
    }

    // 5) 내용 채우기 — 오른쪽 아래에서 지그재그로
    var dir = -1, row = size - 1, idx = 0, bitPos = 0;
    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (var s2 = 0; s2 < 2; s2++) {
          var cx = col - s2;
          if (!fixed[row][cx]) {
            var b2 = 0;
            if (idx < out.length) b2 = (out[idx] >> (7 - bitPos)) & 1;
            m[row][cx] = b2;
            bitPos++; if (bitPos === 8) { bitPos = 0; idx++; }
          }
        }
        row += dir;
        if (row < 0 || row >= size) { row -= dir; dir = -dir; break; }
      }
    }
    return { m: m, fixed: fixed, size: size };
  }

  /* 마스크 8가지 중 가장 읽기 좋은 것을 고릅니다 */
  function maskFn(n, r, c) {
    switch (n) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return (r * c) % 2 + (r * c) % 3 === 0;
      case 6: return ((r * c) % 2 + (r * c) % 3) % 2 === 0;
      default: return ((r + c) % 2 + (r * c) % 3) % 2 === 0;
    }
  }

  function penalty(m, size) {
    var p = 0, i, j, run, dark = 0;
    for (i = 0; i < size; i++) {
      run = 1;
      for (j = 1; j < size; j++) {
        if (m[i][j] === m[i][j - 1]) { run++; } else { if (run >= 5) p += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) p += 3 + (run - 5);
      run = 1;
      for (j = 1; j < size; j++) {
        if (m[j][i] === m[j - 1][i]) { run++; } else { if (run >= 5) p += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) p += 3 + (run - 5);
    }
    for (i = 0; i < size - 1; i++) for (j = 0; j < size - 1; j++) {
      var s = m[i][j] + m[i][j + 1] + m[i + 1][j] + m[i + 1][j + 1];
      if (s === 0 || s === 4) p += 3;
    }
    /* 찾기 무늬(모서리의 큰 사각형)와 헷갈릴 만한 줄이 있으면 크게 벌점을 줍니다.
     * 어두운·밝은 칸이 1:1:3:1:1 로 놓이고 한쪽에 밝은 칸 넷이 이어지는 형태입니다. */
    var P1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var P2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function scan(get) {
      for (var a = 0; a < size; a++) {
        for (var bIdx = 0; bIdx + 11 <= size; bIdx++) {
          var m1 = true, m2 = true;
          for (var k = 0; k < 11; k++) {
            var v = get(a, bIdx + k);
            if (v !== P1[k]) m1 = false;
            if (v !== P2[k]) m2 = false;
            if (!m1 && !m2) break;
          }
          if (m1 || m2) p += 40;
        }
      }
    }
    scan(function (r, c) { return m[r][c]; });
    scan(function (r, c) { return m[c][r]; });
    for (i = 0; i < size; i++) for (j = 0; j < size; j++) dark += m[i][j];
    p += Math.floor(Math.abs(dark * 100 / (size * size) - 50) / 5) * 10;
    return p;
  }

  /* 형식 정보 15비트 — 같은 값을 두 군데에 나눠 놓습니다.
   * 한 귀퉁이가 가려져도 읽히도록 규격이 그렇게 정해 두었습니다. */
  var FMT_POS = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],
                 [7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
  function applyFormat(m, size, mask) {
    var data = (0 << 3) | mask;                       // 오류정정 M = 00
    var f = ((data << 10) | bchRest(data << 10, 0x537)) ^ 0x5412;
    var i, bit;
    for (i = 0; i < 15; i++) {
      bit = (f >> (14 - i)) & 1;
      m[FMT_POS[i][0]][FMT_POS[i][1]] = bit;
    }
    for (i = 0; i < 7; i++) m[size - 1 - i][8] = (f >> (14 - i)) & 1;
    for (i = 7; i < 15; i++) m[8][size - 15 + i] = (f >> (14 - i)) & 1;
    m[size - 8][8] = 1;                               // 늘 검은 칸
  }

  /** 글을 QR 판(0/1 이차원 배열)으로. 너무 길면 null */
  function make(text) {
    var bytes = utf8(text);
    var ver = 0;
    for (var v = 1; v <= 10; v++) if (bytes.length <= VER[v][0]) { ver = v; break; }
    if (!ver) return null;

    var base = build(ver, bytes), size = base.size;
    var best = null, bestP = Infinity;
    for (var mk = 0; mk < 8; mk++) {
      var m = base.m.map(function (r) { return r.slice(); });
      for (var r = 0; r < size; r++) for (var c = 0; c < size; c++)
        if (!base.fixed[r][c] && maskFn(mk, r, c)) m[r][c] ^= 1;
      applyFormat(m, size, mk);
      var p = penalty(m, size);
      if (p < bestP) { bestP = p; best = m; }
    }
    return best;
  }

  /** QR 판을 SVG 글자로 */
  function svg(text, px) {
    var m = make(text);
    if (!m) return null;
    var n = m.length, q = 4, total = n + q * 2, s = px || 240;
    var d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++)
      if (m[r][c]) d += 'M' + (c + q) + ' ' + (r + q) + 'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s +
      '" viewBox="0 0 ' + total + ' ' + total + '" shape-rendering="crispEdges" role="img" aria-label="QR 코드">' +
      '<rect width="' + total + '" height="' + total + '" fill="#fff"/>' +
      '<path d="' + d + '" fill="#1c1c1a"/></svg>';
  }

  ONM.qr = { make: make, svg: svg };
})(window);
