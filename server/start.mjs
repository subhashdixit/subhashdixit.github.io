import { createServer } from 'node:http'
import { askMiddleware } from './ask.mjs'
import { openPortfolioIndex } from './portfolio-index.mjs'
import { openPortfolioDetails, openPortfolioVectors } from './portfolio-details.mjs'

const { EURI_API_KEY, PORTFOLIO_ORIGIN, PORT = '10000' } = process.env
if (!EURI_API_KEY) throw new Error('Set EURI_API_KEY before starting the API.')
if (!PORTFOLIO_ORIGIN || new URL(PORTFOLIO_ORIGIN).origin !== PORTFOLIO_ORIGIN) {
  throw new Error('Set PORTFOLIO_ORIGIN to the website origin, without a trailing slash.')
}

for (const open of [openPortfolioIndex, openPortfolioDetails, openPortfolioVectors]) {
  const table = await open()
  if (!table) throw new Error('A required LanceDB table is missing from the deployment.')
  table.close()
}

const ask = askMiddleware(EURI_API_KEY, undefined, PORTFOLIO_ORIGIN)
const routes = new Set(['/api/ask', '/api/transcribe'])

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

createServer(async (req, res) => {
  const path = req.url.split('?')[0]
  if (req.method === 'GET' && path === '/healthz') return send(res, 200, { status: 'ok' })
  if (!routes.has(path)) return send(res, 404, { error: 'Endpoint not found.' })

  res.setHeader('Vary', 'Origin')
  if (req.headers.origin !== PORTFOLIO_ORIGIN) return send(res, 403, { error: 'Open Ask Subhash on the portfolio.' })
  res.setHeader('Access-Control-Allow-Origin', PORTFOLIO_ORIGIN)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    })
    return res.end()
  }

  try {
    await ask(req, res, () => send(res, 404, { error: 'Endpoint not found.' }))
  } catch {
    if (!res.headersSent && !res.destroyed) send(res, 500, { error: 'The assistant is unavailable. Try again shortly.' })
    else if (!res.writableEnded) res.destroy()
  }
}).listen(Number(PORT), '0.0.0.0', () => console.log(`Portfolio API listening on port ${PORT}`))
