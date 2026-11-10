/**
 * 온명 주문코드 저장소 — 구글 시트에 붙이는 Apps Script
 *
 * 사이트(order.html)가 손님 사양서를 ONM-XXXXX 코드와 함께 여기로 보내고,
 * 사장님은 lookup.html 에서 코드로 사양서를 다시 꺼내 봅니다.
 *
 * 시트는 '주문목록' 탭에 한 줄씩 쌓입니다.
 *   날짜 | 이름 | 전화번호 | 주문코드 | 링크(누르면 사양서 조회)
 * 사양서 전문과 스튜디오 링크는 오른쪽 숨긴 칸(F, G)에 들어 있어 화면에는 안 보입니다.
 *
 * ▶ 아래 ADMIN_KEY 를 사장님만 아는 비밀번호로 바꾼 뒤 배포하세요.
 */
const ADMIN_KEY = '여기에-비밀번호-적기';
const SHEET_NAME = '주문목록';
const OLD_SHEET_NAME = '주문코드';   // 예전 형식 (코드가 A열)
const CODE_RE = /^ONM-[2-9A-HJ-NP-Z]{5}$/;
const HEAD = ['날짜', '이름', '전화번호', '주문코드', '링크', '사양서', '스튜디오 링크'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME, 0);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.getRange('1:1').setFontWeight('bold');
    sh.setColumnWidths(1, 1, 140);
    sh.setColumnWidths(2, 2, 110);
    sh.setColumnWidth(4, 110);
    sh.setColumnWidth(5, 260);
    sh.hideColumns(6, 2);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 시트에서 = + - @ 로 시작하는 글은 수식으로 실행되므로 글자로 저장한다
function safe_(v, max) {
  v = String(v || '').slice(0, max || 20000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (!CODE_RE.test(d.code || '')) return json_({ ok: false, error: 'code' });
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sh = sheet_();
      // 전화번호는 맨 앞 0 이 사라지지 않게 글자로 저장한다
      sh.appendRow([new Date(), safe_(d.name, 50), "'" + String(d.phone || '').slice(0, 30), d.code,
        safe_(d.link, 500), safe_(d.sheet), safe_(d.studio, 2000)]);
      sh.getRange(sh.getLastRow(), 1, 1, HEAD.length).setWrap(false);   // 한 줄로 짧게
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'bad' });
  }
}

function find_(sh, col, code) {
  if (!sh || sh.getLastRow() < 2) return null;
  const hits = sh.getRange(2, col, sh.getLastRow() - 1, 1).createTextFinder(code).matchEntireCell(true).findAll();
  return hits.length ? hits[hits.length - 1].getRow() : null;   // 같은 코드가 여러 번이면 마지막 것
}

function unq_(v) { return String(v || '').replace(/^'/, ''); }

function doGet(e) {
  const p = e.parameter || {};
  if (p.key !== ADMIN_KEY) return json_({ ok: false, error: 'key' });
  const code = String(p.code || '').toUpperCase();
  if (!CODE_RE.test(code)) return json_({ ok: false, error: 'code' });
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sh = ss.getSheetByName(SHEET_NAME);
  let row = find_(sh, 4, code);
  if (row) {
    const v = sh.getRange(row, 1, 1, HEAD.length).getValues()[0];
    return json_({ ok: true, code: code, at: v[0], name: unq_(v[1]), phone: unq_(v[2]),
      sheet: unq_(v[5]), studio: unq_(v[6]) });
  }
  const old = ss.getSheetByName(OLD_SHEET_NAME);
  row = find_(old, 1, code);
  if (row) {
    const v = old.getRange(row, 1, 1, 4).getValues()[0];
    return json_({ ok: true, code: code, at: v[1], sheet: unq_(v[2]), studio: unq_(v[3]) });
  }
  return json_({ ok: false, error: 'none' });
}
