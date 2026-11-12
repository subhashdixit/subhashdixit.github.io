import { setTimeout as delay } from 'node:timers/promises'
import { connect } from '@lancedb/lancedb'
import { loadEnv } from 'vite'
import { createEuriClient } from '../server/euri.mjs'
import { detailsIndexPath } from '../server/portfolio-index.mjs'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
if (!env.EURI_API_KEY) throw new Error('Set EURI_API_KEY before embedding the portfolio.')
const client = createEuriClient(env.EURI_API_KEY, fetch, { embeddingTimeout: 80_000 })
const fields = ['id', 'title', 'text', 'repository', 'kind']

async function embed(rows, attempt = 1) {
  try {
    const values = await client.embed(rows.map(({ title, text }) => `${title}\n${text}`))
    return rows.map(({ id, repository, kind }, index) => ({ id, repository, kind, vector: values[index] }))
  } catch (error) {
    if (([400, 413, 422].includes(error.status) || error.name === 'TimeoutError') && rows.length > 1) {
      const middle = Math.ceil(rows.length / 2)
      return [...await embed(rows.slice(0, middle)), ...await embed(rows.slice(middle))]
    }
    if (attempt >= 4 || !(error.name === 'TimeoutError' || error.name === 'TypeError' ||
      error.status === 429 || error.status >= 500)) throw error
    console.log(`Embedding retry ${attempt} after ${error.status ?? error.name}.`)
    await delay(attempt * (error.status === 429 ? 15_000 : 2000))
    return embed(rows, attempt + 1)
  }
}

const db = await connect(detailsIndexPath)
let sources
let target
try {
  sources = await db.openTable('sources')
  const records = await sources.query().where("kind <> 'file'").select(fields).toArray()
  if ((await db.tableNames()).includes('embeddings')) target = await db.openTable('embeddings')
  const existing = new Set(target ? (await target.query().select(['id']).toArray()).map(row => row.id) : [])
  const current = new Set(records.map(row => row.id))
  const stale = [...existing].filter(id => !current.has(id))
  for (let offset = 0; offset < stale.length; offset += 250) {
    const ids = stale.slice(offset, offset + 250).map(id => `'${id}'`).join(',')
    await target.delete(`id IN (${ids})`)
  }
  const missing = records.filter(row => !existing.has(row.id))
  // Interleave repositories so resumed builds cover every project before returning to deeper passages.
  const groups = Map.groupBy(missing, row => row.repository)
  for (const group of groups.values()) {
    group.sort((a, b) => Number(/metrics|\.ipynb|(?:requirements|package|pyproject)|\btrain\b/i.test(b.title)) -
      Number(/metrics|\.ipynb|(?:requirements|package|pyproject)|\btrain\b/i.test(a.title)))
  }
  const queue = []
  while (groups.size) {
    for (const [repository, group] of groups) {
      queue.push(group.shift())
      if (!group.length) groups.delete(repository)
    }
  }

  let completed = records.length - queue.length
  console.log(`${completed}/${records.length} passages already embedded. Remaining: ${queue.length}.`)
  const batchSize = 144
  const concurrency = 4
  let failed = 0
  for (let offset = 0; offset < queue.length; offset += batchSize * concurrency) {
    const group = queue.slice(offset, offset + batchSize * concurrency)
    const batches = []
    for (let start = 0; start < group.length; start += batchSize) batches.push(group.slice(start, start + batchSize))
    const results = await Promise.allSettled(batches.map(batch => embed(batch)))
    const vectors = results.flatMap((result, index) => {
      if (result.status === 'fulfilled') return result.value
      failed += batches[index].length
      console.error(`Embedding batch failed with ${result.reason?.status ?? result.reason?.name}; passages will be retried on the next run.`)
      return []
    })
    if (vectors.length) {
      if (target) await target.add(vectors)
      else target = await db.createTable('embeddings', vectors)
      completed += vectors.length
      console.log(`Embedded ${completed}/${records.length} passages.`)
    }
  }
  if (failed) throw new Error(`${failed} passages still need embeddings.`)
} finally {
  target?.close()
  sources?.close()
  db.close()
}
