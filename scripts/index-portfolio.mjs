import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { appendFile, readFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { connect } from '@lancedb/lancedb'
import { loadEnv } from 'vite'
import { createEuriClient, embeddingDimension } from '../server/euri.mjs'
import { portfolioKnowledge } from '../server/portfolio-knowledge.mjs'

const account = 'subhashdixit'
const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const githubHeaders = {
  Accept: 'application/vnd.github+json',
  ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
}
if (!env.EURI_API_KEY) throw new Error('Set EURI_API_KEY before building the index.')

async function github(path, allowMissing = false) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: githubHeaders,
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  })
  if (allowMissing && response.status === 404) return null
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status} for ${path}`)
  return response.json()
}

function normalizeReadme(readme) {
  if (!readme?.content) return ''
  return Buffer.from(readme.content, 'base64').toString('utf8')
    .replace(/\r\n/g, '\n')
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/!\[[^\]]*\]\([^\n]*?\)/g, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/\[([^\]]+)\]\((?:<[^>]+>|[^\n)]*)\)/g, '$1')
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[redacted]')
    .replace(/\b(?:gh[pousr]_[\w]{25,}|github_pat_[\w]{25,}|euri-[a-f0-9]{32,}|AKIA[A-Z0-9]{16}|sk-(?:proj-)?[\w-]{24,})\b/gi, '[redacted]')
    .trim()
}

function readmeSections(text) {
  const sections = [{ heading: 'Overview', text: '' }]
  for (const line of text.split('\n')) {
    const heading = line.match(/^#{1,5}\s+(.+?)\s*#*$/)
    if (heading) sections.push({ heading: heading[1], text: '' })
    else sections.at(-1).text += line + '\n'
  }
  return sections.map(({ heading, text }) => ({ heading, text: text.trim() }))
    .filter(section => section.text && !/^(?:contents|table of contents)$/i.test(section.heading))
}

function chunks(text, limit = 1500) {
  const result = []
  let buffer = ''
  for (const word of text.split(/\s+/)) {
    if (buffer && buffer.length + word.length + 1 > limit) {
      result.push(buffer)
      buffer = ''
    }
    buffer += (buffer ? ' ' : '') + word.slice(0, limit)
  }
  if (buffer) result.push(buffer)
  return result
}

function repositoryRecords(repo, readme) {
  const text = normalizeReadme(readme)
  const sections = readmeSections(text)
  const title = text.match(/^#\s+([^\n]+)/m)?.[1]?.trim() || repo.name
  const overview = sections.find(({ heading }) => /^(?:1\.\s*)?project overview$/i.test(heading))
  const summary = overview?.text.split(/\n\s*\n/)[0]?.trim()
  const provenance = repo.fork ? 'Public GitHub fork. The README may describe upstream work.' : 'Public GitHub repository.'
  const metadata = {
    id: `github-${repo.name}`,
    title,
    text: [summary || repo.description, provenance,
      repo.language && `Primary language: ${repo.language}.`, repo.archived && 'Archived.']
      .filter(Boolean).join(' '),
    href: repo.html_url,
    repository: repo.name,
    kind: 'repository',
  }
  return [metadata, ...sections.flatMap(({ heading, text }, sectionIndex) =>
    chunks(text).map((passage, passageIndex) => ({
      ...metadata,
      id: `${metadata.id}-readme-${sectionIndex + 1}-${passageIndex + 1}`,
      title: `${title} · ${heading}`,
      text: repo.fork ? `${provenance} ${passage}` : passage,
      href: readme.html_url,
      kind: 'readme',
    })),
  )]
}

const repositories = []
for (let page = 1; ; page++) {
  const batch = await github(`/users/${account}/repos?type=owner&per_page=100&page=${page}`)
  repositories.push(...batch.filter(repo => repo.owner?.login === account && !repo.private))
  if (batch.length < 100) break
}

const records = portfolioKnowledge.map(record => ({ ...record, repository: '', kind: 'portfolio' }))
let readmes = 0
for (let offset = 0; offset < repositories.length; offset += 5) {
  const batch = await Promise.all(repositories.slice(offset, offset + 5).map(async repo => {
    const readme = await github(`/repos/${account}/${encodeURIComponent(repo.name)}/readme`, true)
    if (readme?.content) readmes++
    return repositoryRecords(repo, readme)
  }))
  records.push(...batch.flat())
}

if (!repositories.length || !readmes) throw new Error('No public GitHub documentation was retrieved.')
console.log(`Retrieved ${repositories.length} public repositories and ${readmes} READMEs. Preparing ${records.length} source records.`)

const db = await connect(fileURLToPath(new URL('../server/data/portfolio.lance-db', import.meta.url)))
const cacheKey = ({ title, text }) => `${title}\n${text}`
const checkpoint = env.PORTFOLIO_EMBEDDING_CACHE
const fingerprint = input => createHash('sha256').update(`euri-embedding:${input}`).digest('hex')

async function embedWithRetry(client, batch) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await client.embed(batch)
    } catch (error) {
      const transient = error.name === 'TimeoutError' || error.name === 'TypeError' ||
        error.status === 429 || error.status >= 500
      if (!transient || attempt >= 4) throw error
      console.log(`Embedding batch retry ${attempt} after ${error.status || error.name}.`)
      await delay(attempt * (error.status === 429 ? 20_000 : 2000))
    }
  }
}

try {
  const cache = new Map()
  if ((await db.tableNames()).includes('portfolio')) {
    const previous = await db.openTable('portfolio')
    try {
      for (const row of await previous.query().select(['title', 'text', 'vector']).toArray()) {
        if (row.vector?.length === embeddingDimension) cache.set(cacheKey(row), Array.from(row.vector))
      }
    } finally {
      previous.close()
    }
  }

  const uniqueInputs = [...new Set(records.map(cacheKey))]
  if (checkpoint) {
    const byHash = new Map(uniqueInputs.map(input => [fingerprint(input), input]))
    const saved = await readFile(checkpoint, 'utf8').catch(error => {
      if (error.code === 'ENOENT') return ''
      throw error
    })
    for (const line of saved.trim().split('\n').filter(Boolean)) {
      const { hash, vector } = JSON.parse(line)
      const input = byHash.get(hash)
      if (input && vector?.length === embeddingDimension && vector.every(Number.isFinite)) cache.set(input, vector)
    }
  }

  const euri = createEuriClient(env.EURI_API_KEY, fetch, { embeddingTimeout: 55_000 })
  const inputs = uniqueInputs.filter(input => !cache.has(input))
  console.log(`Embedding ${inputs.length} new or changed passages.`)
  const batchSize = 12
  for (let offset = 0; offset < inputs.length; offset += batchSize) {
    const started = Date.now()
    const batch = inputs.slice(offset, offset + batchSize)
    const vectors = await embedWithRetry(euri, batch)
    const saved = batch.map((input, index) => {
      const vector = vectors[index]
      cache.set(input, vector)
      return JSON.stringify({ hash: fingerprint(input), vector })
    })
    if (checkpoint) await appendFile(checkpoint, saved.join('\n') + '\n')
    const completed = offset + batch.length
    if (offset % 120 === 0 || completed === inputs.length) {
      console.log(`Embedded ${completed}/${inputs.length}.`)
    }
    if (completed < inputs.length) await delay(Math.max(0, 2400 - (Date.now() - started)))
  }

  const indexed = records.map(record => ({ ...record, vector: cache.get(cacheKey(record)) }))
  if (indexed.some(record => !record.vector)) throw new Error('Missing source embedding.')
  const table = await db.createTable('portfolio', indexed, { mode: 'overwrite' })
  try {
    console.log(`Local LanceDB index contains ${await table.countRows()} source records.`)
  } finally {
    table.close()
  }
} finally {
  db.close()
}
