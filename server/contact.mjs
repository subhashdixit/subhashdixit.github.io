export function contactMiddleware({ CONTACT_SCRIPT_URL: url, CONTACT_SCRIPT_SECRET: secret }) {
  return async (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/contact') return next()

    const send = (status, ok) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({ ok }))
    }

    if (req.method !== 'POST') return send(405, false)
    if (req.headers['sec-fetch-site'] === 'cross-site') return send(403, false)
    if (!req.headers['content-type']?.startsWith('application/json')) return send(415, false)
    if (!url || !secret) return send(503, false)

    let body = ''
    let submission
    try {
      for await (const chunk of req) {
        body += chunk
        if (Buffer.byteLength(body) > 24_000) return send(413, false)
      }
      submission = JSON.parse(body)
    } catch {
      return send(400, false)
    }

    if (!submission || typeof submission !== 'object') return send(400, false)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...submission, secret }),
        signal: AbortSignal.timeout(15_000),
      })
      const result = await response.json()
      if (response.ok && result.ok === true) return send(200, true)
      return send(result.invalid ? 400 : 502, false)
    } catch {
      return send(502, false)
    }
  }
}
