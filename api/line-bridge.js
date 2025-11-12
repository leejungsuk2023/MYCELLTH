const PIXEL_ID = '742160555457168';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || 'EAAKnxXipVygBPbaQyNHEvDsjkIwZAIM369UXCt9ysEFOF0HYZBeCadogBt0tZBFjTmeg8z0iK94CDtZCgmE3yjN99sCL3litw7lGNkmWTYGyiRfc18HD51Wx1NJrs00D2ICnItwGX9mOy9XOhxVoGU4uxpgT7M37KQstxa4U9d3U3SeBNlLxxoo50gzSZCdLbHgZDZD';

const LINE_URL = 'https://lin.ee/50Ghw2L';

async function sendCapiEvent({ eventId, eventSourceUrl, userAgent }) {
  if (!ACCESS_TOKEN) {
    console.warn('META_ACCESS_TOKEN missing, skip CAPI');
    return null;
  }

  const payload = {
    data: [{
      event_name: 'LineFriendAdd',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      event_source_url: eventSourceUrl,
      custom_data: {
        click_id: eventId
      },
      user_data: {
        client_user_agent: userAgent || undefined
      }
    }]
  };

  const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) {
    console.error('Bridge CAPI error:', result);
    throw new Error('Failed to send CAPI event');
  }
  return result;
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ ok: false, error: 'Method Not Allowed' });
      return;
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'mycellth.store';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const fullUrl = `${protocol}://${host}${req.url}`;
    const url = new URL(fullUrl);
    const cid = url.searchParams.get('cid') || `bridge-${Date.now()}`;

    try {
      await sendCapiEvent({
        eventId: cid,
        eventSourceUrl: fullUrl,
        userAgent: req.headers['user-agent']
      });
    } catch (err) {
      console.error('Bridge failed to send CAPI:', err.message);
      // continue with redirect even if CAPI fails
    }

    res.statusCode = 302;
    res.setHeader('Location', LINE_URL);
    res.end();
  } catch (e) {
    console.error('Bridge crash:', e);
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
};
