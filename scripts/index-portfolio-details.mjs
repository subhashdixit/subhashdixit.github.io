import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { connect, Index } from '@lancedb/lancedb'
import { portfolioKnowledge } from '../server/portfolio-knowledge.mjs'
import { readRepositorySources } from './portfolio-source-records.mjs'
import { detailsIndexPath, openPortfolioIndex, readRepositoryCatalog } from '../server/portfolio-index.mjs'

const [root, refsPath] = process.argv.slice(2)
if (!root) throw new Error('Pass the directory containing the public GitHub checkouts.')
const original = await openPortfolioIndex()
if (!original) throw new Error('Build the base portfolio index first.')
let catalog
try {
  catalog = await readRepositoryCatalog(original)
} finally {
  original.close()
}

const profileRecords = portfolioKnowledge.filter(record => !record.id.startsWith('project-')).map(record => ({
  ...record, id: createHash('sha256').update(`${record.id}\0${record.text}`).digest('hex').slice(0, 32),
  repository: '', path: '', kind: 'profile',
}))
const repositories = refsPath ? JSON.parse(readFileSync(refsPath, 'utf8')).nodes : []
const refs = refsPath ? new Map(repositories.filter(repo => repo.defaultBranchRef)
  .map(repo => [repo.name, repo.defaultBranchRef.target.oid])) : null
if (refs && (catalog.length !== refs.size || catalog.some(repo => !refs.has(repo.repository)))) {
  throw new Error('The public GitHub catalog changed. Refresh the base index and update the checkout set first.')
}
const records = [...profileRecords]
const failed = []
let indexed = 0
let catalogued = 0
let omitted = 0
for (const repo of catalog) {
  const directory = resolve(root, repo.repository)
  if (!existsSync(resolve(directory, '.git'))) {
    failed.push(repo.repository)
    continue
  }
  try {
    const result = readRepositorySources(directory, repo.repository, {
      fork: repo.text.includes('Public GitHub fork.'),
      revision: refs?.get(repo.repository) ?? 'HEAD',
    })
    records.push(...result.records)
    indexed += result.indexed
    catalogued += result.catalogued
    omitted += result.omitted
    console.log(`${repo.repository} ${result.commit.slice(0, 10)}: ${result.catalogued} files, ${result.indexed} with extracted content, ${result.omitted} skipped extracts`)
  } catch (error) {
    failed.push(repo.repository)
    console.error(`${repo.repository}: ${error.code ?? error.name} while collecting tracked content`)
  }
}
if (!records.length || failed.length) throw new Error(`Incomplete collection. Missing repositories: ${failed.join(', ')}`)

const db = await connect(detailsIndexPath)
try {
  const table = await db.createTable('sources', records.map(record => ({
    ...record, searchText: `${record.title}\n${record.text}`,
  })), { mode: 'overwrite' })
  try {
    await table.createIndex('searchText', {
      config: Index.fts({ baseTokenizer: 'code', withPosition: false }),
      replace: true,
    })
    console.log(`Indexed ${catalog.length} repositories, ${catalogued} files, and ${records.length - catalogued - profileRecords.length} repository passages and ${profileRecords.length} profile records. Extracted ${indexed} files, ${omitted} eligible files had no extract.`)
  } finally {
    table.close()
  }
} finally {
  db.close()
}

if (repositories.some(repo => Object.hasOwn(repo, 'homepageUrl'))) {
  const homepages = repositories.flatMap(({ name, homepageUrl }) => {
    try {
      const url = new URL(homepageUrl)
      if (url.protocol === 'https:' && !url.username && !url.password &&
          !url.search && !url.hash && url.hostname !== 'github.com') return [[name, url.href]]
    } catch {
      // An absent or invalid homepage has no direct answer.
    }
    return []
  })
  writeFileSync(new URL('../server/data/project-homepages.json', import.meta.url),
    JSON.stringify(Object.fromEntries(homepages.sort()), null, 2) + '\n')
}
