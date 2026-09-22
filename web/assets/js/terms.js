/*
 * 온명 — 용어 풀이
 * ------------------------------------------------------------------
 * 리포트에 나오는 명리 용어를 쉬운 말로 풀어 둡니다.
 * 글자 위에 마우스를 올리거나(모바일은 눌러서) 바로 뜻을 볼 수 있고,
 * 리포트 아래 '용어 한눈에' 칸에도 같은 내용이 모여 있습니다.
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG = global.ONMYEONG || {};
  var doc = global.document;

  /* [쉬운 한 줄, 조금 더] */
  var TERMS = {
    '일주': ['태어난 날의 두 글자',
      '사주 네 기둥 가운데 태어난 "날"을 가리키는 기둥입니다. 사주에서 나 자신을 보는 자리라, 온명은 이 일주만 읽습니다.'],
    '천간': ['하늘 쪽 글자 열 개',
      '갑·을·병·정·무·기·경·신·임·계 열 글자입니다. 겉으로 드러나는 성격과 첫인상을 봅니다.'],
    '지지': ['땅 쪽 글자 열두 개',
      '자·축·인·묘·진·사·오·미·신·유·술·해 열두 글자이고, 띠가 여기서 나옵니다. 속마음과 실제 생활을 봅니다.'],
    '일간': ['일주의 윗글자 — 겉으로 드러나는 나',
      '남들이 보는 내 모습, 말투와 태도가 여기서 나옵니다.'],
    '일지': ['일주의 아랫글자 — 나를 받치는 자리',
      '매일 앉아 있는 자리이자 명리에서 배우자의 자리로도 봅니다. 생활에서 나오는 버릇이 여기서 나옵니다.'],
    '오행': ['목·화·토·금·수 다섯 기운',
      '나무·불·흙·쇠·물입니다. 서로 낳아 주기도(생) 하고 누르기도(극) 하면서 균형을 잡습니다.'],
    '음양': ['밀고 나가는 기운과 안으로 살피는 기운',
      '갑·병·무·경·임은 양(陽), 을·정·기·신·계는 음(陰)입니다. 좋고 나쁨이 아니라 방향이 다른 것입니다.'],
    '십신': ['상대가 나에게 어떤 자리인지 부르는 이름',
      '내 일간을 기준으로 상대(또는 내 일지)를 보면 비견·겁재·식신·상관·편재·정재·편관·정관·편인·정인 열 자리 중 하나에 놓입니다. 같은 사람도 누구 기준이냐에 따라 이름이 달라집니다.'],
    '십이운성': ['기운이 태어나 자라고 저무는 열두 단계',
      '장생·목욕·관대·건록·제왕·쇠·병·사·묘·절·태·양 순서입니다. 높고 낮음이 좋고 나쁨은 아니고, 지금 기운의 결을 봅니다.'],
    '천간합': ['두 글자가 서로 끌어당기는 짝',
      '갑기·을경·병신·정임·무계 다섯 쌍입니다. 만나면 새로운 오행으로 바뀝니다.'],
    '충': ['정면으로 부딪치는 자리',
      '마주 보는 글자끼리 부딪칩니다. 나쁜 것만은 아니고, 서로에게 없는 것을 가지고 있다는 뜻이기도 합니다.'],
    '육합': ['두 지지가 만나 하나로 묶이는 짝',
      '자축·인해·묘술·진유·사신·오미 여섯 쌍입니다. 열두 지지 가운데 가장 끈끈하게 봅니다.'],
    '삼합': ['셋이 모여 큰 기운을 이루는 짝',
      '신자진(수)·해묘미(목)·인오술(화)·사유축(금)입니다. 둘만 있어도 같은 방향을 봅니다.'],
    '형': ['가까워질수록 예민해지는 자리',
      '서로를 시험하는 관계입니다. 거리를 조금 두면 오히려 편해집니다.'],
    '해': ['크게 부딪치진 않지만 서운함이 쌓이는 자리',
      '그때그때 말하고 넘어가는 편이 좋습니다.'],
    '캐보션': ['각을 내지 않고 둥글게 갈아 올린 원석',
      '반짝임보다 색과 무늬를 보는 컷입니다. 온명의 천연석은 모두 이 방식입니다.'],
    '유화': ['은을 일부러 검게 태워 골을 남기는 마감',
      '전체를 태운 뒤 솟은 면만 다시 갈아 내면 파인 자리만 까맣게 남습니다. 시간이 지나면 조금씩 옅어집니다.']
  };

  /** 한 글자 위에 얹는 풀이 버튼 */
  function tip(name, label) {
    var t = TERMS[name];
    if (!t) return label || name;
    return '<button type="button" class="term" data-term="' + name + '">' +
      (label || name) + '</button>';
  }

  /** 리포트 아래에 붙는 '용어 한눈에' 목록 */
  function glossaryHtml(keys) {
    var list = keys && keys.length ? keys : Object.keys(TERMS);
    return list.filter(function (k) { return TERMS[k]; }).map(function (k) {
      return '<div class="gloss-row"><b>' + k + '</b>' +
        '<span>' + TERMS[k][0] + '<br><span class="small">' + TERMS[k][1] + '</span></span></div>';
    }).join('');
  }

  /* 말풍선 하나를 돌려 씁니다 */
  var bubble = null;
  function ensureBubble() {
    if (bubble) return bubble;
    bubble = doc.createElement('div');
    bubble.className = 'term-bubble is-hidden';
    bubble.setAttribute('role', 'tooltip');
    doc.body.appendChild(bubble);
    return bubble;
  }

  function show(btn) {
    var name = btn.getAttribute('data-term');
    var t = TERMS[name];
    if (!t) return;
    var el = ensureBubble();
    el.innerHTML = '<b>' + name + '</b><span>' + t[0] + '</span><span class="small">' + t[1] + '</span>';
    el.classList.remove('is-hidden');
    var r = btn.getBoundingClientRect();
    var top = r.bottom + global.scrollY + 8;
    el.style.top = top + 'px';
    // 화면 밖으로 나가지 않게 좌우를 잡아 줍니다
    var w = Math.min(320, doc.documentElement.clientWidth - 24);
    el.style.width = w + 'px';
    var left = r.left + global.scrollX + r.width / 2 - w / 2;
    left = Math.max(12, Math.min(left, doc.documentElement.clientWidth - w - 12));
    el.style.left = left + 'px';
  }

  function hide() { if (bubble) bubble.classList.add('is-hidden'); }

  doc.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.term') : null;
    if (btn) { e.preventDefault(); show(btn); return; }
    if (!e.target.closest || !e.target.closest('.term-bubble')) hide();
  });
  doc.addEventListener('mouseover', function (e) {
    var btn = e.target.closest ? e.target.closest('.term') : null;
    if (btn) show(btn);
  });
  doc.addEventListener('mouseout', function (e) {
    if (e.target.closest && e.target.closest('.term')) hide();
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  global.addEventListener('scroll', hide, { passive: true });

  ONM.terms = { all: TERMS, tip: tip, glossaryHtml: glossaryHtml };
})(typeof window !== 'undefined' ? window : globalThis);
