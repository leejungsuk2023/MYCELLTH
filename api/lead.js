// /api/lead.js  — Vercel Serverless Function (Node 18/20)
const crypto = require('crypto');

const PIXEL_ID = '742160555457168';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || 'EAAKnxXipVygBPbaQyNHEvDsjkIwZAIM369UXCt9ysEFOF0HYZBeCadogBt0tZBFjTmeg8z0iK94CDtZCgmE3yjN99sCL3litw7lGNkmWTYGyiRfc18HD51Wx1NJrs00D2ICnItwGX9mOy9XOhxVoGU4uxpgT7M37KQstxa4U9d3U3SeBNlLxxoo50gzSZCdLbHgZDZD';        // Vercel env

function sha256Lower(s) {
  return crypto.createHash('sha256').update((s || '').trim().toLowerCase()).digest('hex');
}
function sha256Phone(s) {
  return crypto.createHash('sha256').update((s || '').replace(/[^\d]/g,'')).digest('hex');
}

// Node 기본 req에서 JSON 바디 파서
async function readJson(req) {
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  try {
    // 헬스체크
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, hint: 'POST /api/lead with JSON body' });
    }
    if (req.method !== 'POST') {
      return res.status(405).json({ ok:false, error: 'Method Not Allowed' });
    }

    if (!ACCESS_TOKEN) {
      // 가장 흔한 크래시 원인
      return res.status(500).json({ ok:false, error: 'META_ACCESS_TOKEN is missing' });
    }

    const { eventId, eventSourceUrl, email, phone, fbp, fbc, userAgent } = await readJson(req);

    const payload = {
      data: [{
        event_name: 'LineFriendAdd',
        event_time: Math.floor(Date.now()/1000),
        event_id: eventId || `srv-${Date.now()}`,
        action_source: 'website',
        event_source_url: eventSourceUrl || 'https://mycellth.vercel.app/',
        user_data: {
          em: email ? [sha256Lower(email)] : undefined,
          ph: phone ? [sha256Phone(phone)] : undefined,
          fbp: fbp || undefined,
          fbc: fbc || undefined,
          client_user_agent: userAgent || undefined,
        },
        custom_data: { currency: 'KRW', value: 0 }
      }]
    };

    const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await r.json();

    // Graph 에러는 그대로 보여주어 디버깅 쉽게
    if (!r.ok) {
      console.error('CAPI Error:', json);
      return res.status(500).json({ ok:false, meta: json });
    }
    return res.status(200).json({ ok:true, meta: json });
  } catch (e) {
    console.error('Function Crash:', e);
    return res.status(500).json({ ok:false, error: e.message || String(e) });
  }
};
