/*
 * 온명 — 커스텀 주문 접수 엔드포인트 (Vercel Serverless Function)
 * ------------------------------------------------------------------
 * 사이트의 주문서를 받아서 운영자 채널(슬랙/디스코드/구글 시트 등)로 넘깁니다.
 *
 * 필요한 환경변수 (Vercel → Settings → Environment Variables)
 *   ORDER_WEBHOOK_URL     받을 곳의 웹훅 주소. 없으면 접수 기능이 꺼집니다.
 *   ORDER_WEBHOOK_FORMAT  json(기본) | slack | discord
 *   ORDER_ALLOW_ORIGIN    허용할 도메인. 기본값은 같은 도메인만 허용.
 *
 * 주문서에는 이름과 연락처가 들어갑니다. 로그에는 남기지 않고 웹훅으로만 전달합니다.
 */

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map(); // 인스턴스 단위 최소한의 남용 방지

function tooMany(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 500) hits.clear();
  return list.length > MAX_PER_WINDOW;
}

function str(v, max) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function orderNumber() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OM${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${rand}`;
}

export default async function handler(req, res) {
  const allowOrigin = process.env.ORDER_ALLOW_ORIGIN || '';
  if (allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: '이 주소는 주문서 전송(POST)만 받습니다.' });
  }

  const webhook = process.env.ORDER_WEBHOOK_URL;

  // 주문 페이지가 "지금 접수를 받을 수 있는 상태인지" 물어보는 용도.
  // 서버가 아예 없는 곳에 올리면 이 요청이 실패하고, 접수 단계가 화면에서 숨겨집니다.
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, ready: Boolean(webhook) });
  }

  if (!webhook) {
    return res.status(503).json({
      ok: false,
      message: '주문 접수 채널이 아직 연결되지 않았습니다.'
    });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) {
    return res.status(429).json({ ok: false, message: '잠시 후 다시 시도해 주세요.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, message: '주문서를 읽지 못했습니다.' });
  }

  const contact = body.contact || {};
  const name = str(contact.name, 40);
  const value = str(contact.value, 120);
  if (!name || !value) {
    return res.status(400).json({ ok: false, message: '성함과 연락처를 확인해 주세요.' });
  }

  const order = {
    orderNo: orderNumber(),
    receivedAt: new Date().toISOString(),
    contact: {
      name,
      channel: str(contact.channel, 20) || 'kakao',
      value,
      preferredDate: str(contact.preferredDate, 20) || null
    },
    quantity: Math.min(20, Math.max(1, Number(body.quantity) || 1)),
    secondSize: body.secondSize == null ? null : Number(body.secondSize),
    estimate: body.estimate == null ? null : Number(body.estimate),
    spec: body.spec && typeof body.spec === 'object' ? body.spec : null,
    memo: str(body.memo, 1000) || null,
    sheet: str(body.sheet, 4000),
    link: str(body.link, 600)
  };

  const format = (process.env.ORDER_WEBHOOK_FORMAT || 'json').toLowerCase();
  let payload;
  if (format === 'slack') {
    payload = { text: `*새 커스텀 주문* ${order.orderNo}\n\`\`\`${order.sheet}\`\`\`\n연락: ${order.contact.name} / ${order.contact.channel} / ${order.contact.value}` };
  } else if (format === 'discord') {
    payload = { content: `**새 커스텀 주문** ${order.orderNo}\n\`\`\`${order.sheet.slice(0, 1500)}\`\`\`\n연락: ${order.contact.name} / ${order.contact.channel} / ${order.contact.value}` };
  } else {
    payload = order;
  }

  try {
    const upstream = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!upstream.ok) throw new Error('webhook responded ' + upstream.status);
  } catch (err) {
    // 개인정보는 남기지 않고 실패 사실만 기록
    console.error('[order] 웹훅 전달 실패:', err.message);
    return res.status(502).json({
      ok: false,
      message: '주문서를 전달하지 못했습니다.'
    });
  }

  console.log('[order] 접수 완료', order.orderNo, order.spec ? order.spec.modelId : '-');
  return res.status(200).json({ ok: true, orderNo: order.orderNo });
}
