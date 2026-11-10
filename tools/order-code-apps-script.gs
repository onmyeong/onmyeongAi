/**
 * 온명 주문코드 저장소 — 구글 시트에 붙이는 Apps Script
 *
 * 사이트(order.html)가 손님 사양서를 ONM-XXXXX 코드와 함께 여기로 보내고,
 * 사장님은 lookup.html 에서 코드로 사양서를 다시 꺼내 봅니다.
 *
 * ▶ 아래 ADMIN_KEY 를 사장님만 아는 비밀번호로 바꾼 뒤 배포하세요.
 *   (조회할 때만 필요해요. 손님은 이 비밀번호를 몰라도 코드를 저장할 수 있어요.)
 */
const ADMIN_KEY = '여기에-비밀번호-적기';
const SHEET_NAME = '주문코드';
const CODE_RE = /^ONM-[2-9A-HJ-NP-Z]{5}$/;

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['주문코드', '저장 시각', '사양서', '사양 링크']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 시트에서 = + - @ 로 시작하는 글은 수식으로 실행되므로 글자로 저장한다
function safe_(v) {
  v = String(v || '').slice(0, 20000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (!CODE_RE.test(d.code || '')) return json_({ ok: false, error: 'code' });
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet_().appendRow([d.code, new Date(), safe_(d.sheet), safe_(d.link)]);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'bad' });
  }
}

function doGet(e) {
  const p = e.parameter || {};
  if (p.key !== ADMIN_KEY) return json_({ ok: false, error: 'key' });
  const code = String(p.code || '').toUpperCase();
  if (!CODE_RE.test(code)) return json_({ ok: false, error: 'code' });
  const sh = sheet_();
  const found = sh.getRange('A:A').createTextFinder(code).matchEntireCell(true).findAll();
  if (!found.length) return json_({ ok: false, error: 'none' });
  const row = found[found.length - 1].getRow();          // 같은 코드가 여러 번이면 마지막 것
  const v = sh.getRange(row, 1, 1, 4).getValues()[0];
  return json_({ ok: true, code: v[0], at: v[1], sheet: String(v[2]).replace(/^'/, ''), link: String(v[3]).replace(/^'/, '') });
}
