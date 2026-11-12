import { explicitFiles, mergeEvidence, notebookMethodEvidence, readRecordedMetrics, searchDetailsByText, searchDetailsByVector } from './portfolio-details.mjs'
import { findMentionedRepositories, searchPortfolioIndex } from './portfolio-index.mjs'

export const careerQuestion = /\b(?:epam|wns|affine|tcs|tata consultancy|career|resume|résumé|linkedin|education|degree|employers?|companies|professional experience|work experience|at work|corporate work|professional background|promotion|nit durgapur)\b|what work have you done/i
const projectQuestion = /\b(?:personal projects?|independent projects?|projects?|portfolio projects?|github|repos?|repositor(?:y|ies)|notebooks?|live apps?|demos?)\b/i
const comparison = /\b(?:compare|contrast|difference|versus|vs\.?|both|across|respectively)\b/i
const employer = /\b(?:EPAM(?: Systems)?|WNS(?: Analytics)?|Affine(?: Analytics)?|TCS|Tata Consultancy Services)\b/gi

export function questionParts(question) {
  return question.split(/(?:[?;\n]+|\s*,?\s*\b(?:and|also|then)\s+(?=(?:what|which|where|when|who|why|how|show|give|list|explain|compare|report|identify|describe)\b))/i)
    .map(part => part.trim()).filter(Boolean).slice(0, 5)
}

export function asksAboutChildhood(part) {
  return /\b(?:Subhash|Dixit|he|his|you|your)\b/i.test(part) &&
    /\b(?:childhood|as a child|as a kid|at (?:the )?age (?:of )?(?:seven|7)|(?:was|were) (?:only )?(?:seven|7)(?: years? old)?)\b/i.test(part)
}

export function needsMultipleSources(question, repositories) {
  return questionParts(question).length > 1 || repositories.length > 1 || explicitFiles(question).length > 1 ||
    comparison.test(question) || (careerQuestion.test(question) && projectQuestion.test(question))
}

export function buildSearches(question, { catalog, repositories, notebook, previousProfile }) {
  const searches = []
  const add = (query, scope) => {
    const key = JSON.stringify([query, scope])
    if (!searches.some(search => search.key === key)) searches.push({ key, query, scope })
  }
  if (notebook) {
    add(question, { repository: notebook.repository, path: notebook.path })
    return searches
  }

  const parts = questionParts(question)
  for (const part of parts) {
    const mentioned = findMentionedRepositories(catalog, part)
    for (const { repository } of mentioned) add(part, { repository })
    if (careerQuestion.test(part)) {
      const employers = [...new Set([...part.matchAll(employer)].map(([name]) => name))]
      if (employers.length > 1) {
        for (const company of employers) add(part.replace(employer, ' ') + ` ${company}`, { career: true })
      } else add(part, { career: true })
    }
    if (!mentioned.length && projectQuestion.test(part)) {
      if (repositories.length) {
        for (const { repository } of repositories) add(part, { repository })
      } else add(part, { projectsOnly: true })
    }
    if (!mentioned.length && !careerQuestion.test(part) && !projectQuestion.test(part)) {
      if (repositories.length) {
        for (const { repository } of repositories) add(part, { repository })
      } else if (previousProfile) add(`${part} (Previous topic: ${previousProfile})`, { career: true })
      else add(part, {})
    }
  }
  for (const { repository } of repositories) {
    if (!searches.some(search => search.scope.repository === repository)) add(question, { repository })
  }
  return searches.slice(0, 8)
}

function relevantRepositories(catalog, query) {
  const words = [...new Set(query.toLowerCase().match(/[a-z]{4,}/g) ?? [])]
    .filter(word => !['personal', 'projects', 'project', 'which', 'skills', 'demonstrate', 'subhash', 'using', 'example', 'examples'].includes(word))
    .map(word => word.replace(/(?:ing|s)$/, ''))
  return catalog.map(record => {
    const text = `${record.title} ${record.text}`.toLowerCase()
    return { record, score: words.filter(word => text.includes(word)).length }
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map(({ record }) => record)
}

export async function retrieveAnswers({ client, table, details, getVectors, searches, notebook, question, appEvidence, catalog }) {
  const queries = [...new Set(searches.map(({ query }) => query))]
  const [embedding, rows] = await Promise.all([
    client.embed(queries).then(vectors => ({ vectors }), error => ({ error })),
    Promise.all(searches.map(async ({ query, scope }) => {
      if (!details) return []
      const [matches, metrics] = await Promise.all([
        searchDetailsByText(details, query, scope),
        readRecordedMetrics(details, query, scope.repository),
      ])
      const recorded = metrics?.sources.map(source => ({
        ...source, kind: 'report', text: metrics.answer, repository: scope.repository,
      })) ?? []
      return mergeEvidence([[recorded, 2.6], [matches, 1.1]])
    })),
  ])
  const vectors = embedding.vectors && details ? await getVectors() : null
  const byQuery = new Map(queries.map((query, index) => [query, embedding.vectors?.[index]]))
  const lanes = await Promise.all(searches.map(async ({ query, scope }, index) => {
    const vector = byQuery.get(query)
    const [semantic, overview] = vector ? await Promise.all([
      vectors ? searchDetailsByVector(vectors, details, vector, scope) : [],
      !scope.path ? searchPortfolioIndex(table, vector, scope) : [],
    ]) : [[], []]
    const summaries = scope.path ? [] : scope.repository
      ? catalog.filter(record => record.repository === scope.repository)
      : scope.projectsOnly ? relevantRepositories(catalog, query) : []
    return mergeEvidence([[rows[index], 1.2], [semantic, 1.1], [overview, scope.career ? 1.25 : 0.7]],
      scope.projectsOnly ? summaries : [...rows[index].filter(row => row.kind === 'report'), ...summaries])
  }))
  const methods = notebook && details ? await notebookMethodEvidence(details, notebook, question) : []
  // Reserve evidence for each requested topic before filling remaining context by relevance.
  const priority = [...methods, ...appEvidence, ...lanes.flatMap(lane => lane.slice(0, 1)), ...lanes.flatMap(lane => lane.slice(1, 2))]
  const matches = mergeEvidence(lanes.map(lane => [lane, 1]), priority)
  if (!matches.length && embedding.error) throw embedding.error
  return { matches, keywordFallback: Boolean(embedding.error) }
}
