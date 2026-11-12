import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { connect } from '@lancedb/lancedb'

const columns = ['id', 'title', 'text', 'href']
const indexPath = resolve('server/data/portfolio.lance-db')
export const detailsIndexPath = resolve('server/data/portfolio-details.lance-db')

export async function openPortfolioIndex() {
  if (!existsSync(indexPath)) return null
  const db = await connect(indexPath)
  try {
    return await db.openTable('portfolio')
  } finally {
    db.close()
  }
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function readRepositoryCatalog(table) {
  return table.query().where("kind = 'repository'").select([...columns, 'repository']).toArray()
}

export function findRepositorySummary(catalog, question) {
  const match = question.match(/^(?:what is|what's|tell me about|describe|give me an overview of)\s+(?:the\s+)?(.+?)(?:\s+(?:project|app|repo|repository))?[?.!]*$/i)
  if (!match) return null
  const name = normalizeName(match[1])
  return catalog.find(record => [record.title, record.repository].some(value => normalizeName(value) === name))
}

export function findMentionedRepositories(catalog, question) {
  const text = ` ${normalizeName(question)} `
  const matches = catalog.flatMap(record => [record.title, record.repository].flatMap(value => {
    const alias = normalizeName(value)
    if (!alias.includes(' ') && alias.length < 5) return []
    const needle = ` ${alias} `
    const locations = []
    for (let start = text.indexOf(needle); start >= 0; start = text.indexOf(needle, start + 1)) {
      locations.push({ record, start: start + 1, end: start + needle.length - 1 })
    }
    return locations
  })).sort((a, b) => (b.end - b.start) - (a.end - a.start))
  const selected = []
  for (const match of matches) {
    if (!selected.some(item => match.start < item.end && match.end > item.start)) selected.push(match)
  }
  return [...new Set(selected.sort((a, b) => a.start - b.start).map(item => item.record))]
}

export function findMentionedRepository(catalog, question) {
  const matches = findMentionedRepositories(catalog, question)
  return matches.length === 1 ? matches[0] : null
}

export function searchPortfolioIndex(table, vector, { repository, career, projectsOnly } = {}) {
  const query = table.vectorSearch(vector).distanceType('cosine').where(
    "NOT (lower(repository) = 'the-grand-complete-data-science-materials' AND " +
    "(lower(text) LIKE '%one energy%' OR lower(text) LIKE '%one_energy_chatbot%'))",
  )
  if (repository && /^[\w.-]+$/.test(repository)) {
    query.where(`repository = '${repository}'`)
  } else if (career) {
    query.where("kind = 'portfolio'")
  } else if (projectsOnly) {
    query.where("kind = 'repository'")
  }
  return query.select([...columns, '_distance']).limit(7).toArray()
}
