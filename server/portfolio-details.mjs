import { existsSync } from 'node:fs'
import { connect, MatchQuery } from '@lancedb/lancedb'
import { detailsIndexPath } from './portfolio-index.mjs'

const fileMention = /\b(?:[\w.-]+\/)*[\w.-]+\.(?:py|pyi|ipynb|sql|m?js|jsx|ts|tsx|json|jsonl|md|yml|yaml|txt|toml|pdf|docx|csv|html|css)\b/gi
const fields = ['id', 'title', 'text', 'href', 'repository', 'path', 'kind']
const sourceQuery = table => table.query().where(
  "NOT (lower(repository) = 'the-grand-complete-data-science-materials' AND " +
  "starts_with(lower(path), 'ml projects/custom trained chatbot for customer support/'))",
)

const stopWords = new Set('a an the about you your subhash dixit what which where when how why do does did is are was were it for to from of on in at by with and or can could tell me find show give get used use uses code files file path project repository repo present located link links'.split(' '))
const relatedTerms = {
  degree: ['education', 'earned', 'university'],
  college: ['education', 'institute', 'university'],
  nlp: ['sentiment', 'language', 'text'],
  forecasting: ['forecast', 'time series'],
  evaluated: ['evaluation', 'validation', 'metrics'],
}


export async function openPortfolioDetails() {
  if (!existsSync(detailsIndexPath)) return null
  const db = await connect(detailsIndexPath)
  try {
    return await db.openTable('sources')
  } finally {
    db.close()
  }
}

export async function openPortfolioVectors() {
  if (!existsSync(detailsIndexPath)) return null
  const db = await connect(detailsIndexPath)
  try {
    return (await db.tableNames()).includes('embeddings') ? await db.openTable('embeddings') : null
  } finally {
    db.close()
  }
}

function termsFor(question, repository) {
  const tokens = question.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? []
  const repositoryWords = new Set(repository?.toLowerCase().split(/[-_.]+/) ?? [])
  const useful = [...new Set(tokens.filter(token => !stopWords.has(token) && !repositoryWords.has(token)))]
  const query = useful.length ? useful : tokens.filter(token => !stopWords.has(token))
  return [...new Set([...query, ...query.flatMap(term => Object.hasOwn(relatedTerms, term) ? relatedTerms[term] : [])])].slice(0, 24)
}

function scoped(query, { repository, career, path, projectsOnly }) {
  if (repository && /^[\w.-]+$/.test(repository)) query.where(`repository = '${repository}'`)
  if (!repository && career) query.where("kind = 'profile'")
  if (projectsOnly) query.where("repository <> ''")
  if (path) query.where(`path = '${path.replaceAll("'", "''")}'`)
  return query
}

export function explicitFiles(question) {
  return [...new Set([...question.matchAll(fileMention)].map(([match]) => match.toLowerCase()))].slice(0, 5)
}

async function matchPaths(table, paths, scope, files) {
  if (!paths.length) return []
  const where = paths.map(path => `(lower(path) = '${path}' OR ends_with(lower(path), '/${path}'))`).join(' OR ')
  return scoped(sourceQuery(table).where(files ? "kind = 'file'" : "kind <> 'file'").where(where),
    scope).select(fields).limit(40).toArray()
}

export async function searchDetailsByText(table, question, { repository, career, path, projectsOnly, files = false }) {
  const terms = termsFor(question, repository)
  if (!terms.length) return []
  const query = sourceQuery(table).fullTextSearch(new MatchQuery(terms.join(' '), 'searchText'))
    .where(files ? "kind = 'file'" : "kind <> 'file'")
  const [matches, exact] = await Promise.all([
    scoped(query, { repository, career, path, projectsOnly }).select([...fields, '_score']).limit(files ? 25 : 16).toArray(),
    matchPaths(table, explicitFiles(question), { repository, career, path, projectsOnly }, files),
  ])
  const meaningful = terms.filter(term => !['notebook', 'python', 'json', 'ipynb'].includes(term))
  exact.sort((a, b) => {
    const score = row => meaningful.filter(term => row.text.toLowerCase().includes(term)).length
    return score(b) - score(a)
  })
  return [...new Map([...exact.slice(0, 4), ...matches].map(row => [row.id, row])).values()]
}

export async function searchDetailsByVector(vectors, table, vector, scope) {
  const rows = await scoped(vectors.vectorSearch(vector).distanceType('cosine'), { repository: scope.repository, career: scope.career, projectsOnly: scope.projectsOnly })
    .select(['id', '_distance']).limit(16).toArray()
  if (!rows.length) return []
  const ids = rows.map(({ id }) => `'${id}'`).join(',')
  const matched = await scoped(sourceQuery(table).where(`id IN (${ids})`), scope).select(fields).toArray()
  const byId = new Map(matched.map(row => [row.id, row]))
  return rows.map(({ id }) => byId.get(id)).filter(Boolean)
}

export function mergeEvidence(lists, priority = []) {
  const candidates = new Map()
  for (const [rows, weight] of lists) {
    for (const [rank, row] of rows.entries()) {
      const candidate = candidates.get(row.id) ?? { row, score: 0 }
      candidate.score += weight / (12 + rank)
      candidates.set(row.id, candidate)
    }
  }
  const ranked = [...candidates.values()].sort((a, b) => b.score - a.score).map(({ row }) => row)
  const unique = new Map()
  for (const row of [...priority, ...ranked]) if (!unique.has(row.id)) unique.set(row.id, row)
  const pathCounts = new Map()
  const evidence = []
  let characters = 0
  for (const row of unique.values()) {
    const key = row.path ? `${row.repository}/${row.path}` : row.id
    const count = pathCounts.get(key) ?? 0
    if (count >= 3 || characters + row.text.length > 30_000) continue
    characters += row.text.length
    pathCounts.set(key, count + 1)
    evidence.push(row)
    if (evidence.length === 14) break
  }
  return evidence
}

export async function findFileLocations(table, question, repository) {
  const isLocation = /^(?:where (?:is|are|can|do)|which (?:file|notebook)s?\b|(?:give|show|send)(?: me)? (?:the )?(?:path|link)\b|(?:list|show)(?: me)? (?:the )?(?:notebook|file)s\b)/i.test(question)
  if (!isLocation || /\b(?:how|why|algorithm|accuracy|score|library|libraries|metric|parameters?)\b/i.test(question)) return null
  const notebooks = /\bnotebooks?\b|\.ipynb\b/i.test(question)
  const terms = termsFor(question, repository).filter(term => !['notebook', 'notebooks', 'ipynb', 'does', 'contains', 'containing'].includes(term))
  const [exactFile] = explicitFiles(question)
  if (!repository && !exactFile && !terms.length) return null
  const rows = exactFile ? await matchPaths(table, [exactFile], { repository }, true)
    : repository && !terms.length ? await scoped(sourceQuery(table).where(notebooks ? "kind = 'file' AND ends_with(lower(path), '.ipynb')" : "kind = 'file'"), { repository })
      .select(fields).limit(8).toArray()
    : await searchDetailsByText(table, question, { repository, files: true })
  const hits = rows.filter(row => {
    const path = row.path.toLowerCase()
    if (exactFile) return path === exactFile.toLowerCase() || path.endsWith('/' + exactFile.toLowerCase())
    if (notebooks && !path.endsWith('.ipynb')) return false
    return !terms.length || terms.some(term => path.includes(term))
  }).slice(0, 5)
  if (!hits.length) return null
  const sources = hits.map(({ id, title, href }) => ({ id, title, href }))
  const answer = hits.length === 1
    ? `You can find it at ${hits[0].path} in the ${hits[0].repository} repository.`
    : `I found ${hits.length} matching files. Open a source below to go straight to the file on GitHub.`
  return { answer, sources }
}

const requestedMetrics = [
  { label: 'accuracy', pattern: /\baccuracy\b/i, keys: ['accuracy'], percent: true },
  { label: 'macro F1', pattern: /\bmacro[\s_-]*f1\b/i, keys: ['macro_f1', 'macroF1'] },
  { label: 'weighted F1', pattern: /\bweighted[\s_-]*f1\b/i, keys: ['weighted_f1', 'weightedF1'] },
  { label: 'threshold', pattern: /\bthreshold\b/i, keys: ['threshold'] },
  { label: 'selected model', pattern: /\b(?:selected|chosen) model\b/i, keys: ['selected_model', 'selectedModel'] },
]

export async function readRecordedMetrics(table, question, repository) {
  if (!repository || /\b(?:compare|difference|how|why|versus|vs)\b/i.test(question)) return null
  const paths = explicitFiles(question).filter(path => path.endsWith('.json'))
  const requested = requestedMetrics.filter(({ pattern }) => pattern.test(question))
  if (paths.length !== 1 || !requested.length) return null

  const rows = await matchPaths(table, paths, { repository }, false)
  if (!rows.length || new Set(rows.map(row => row.path)).size !== 1) return null
  const order = row => Number(row.title.match(/ · part (\d+)$/)?.[1] ?? 0)
  rows.sort((a, b) => order(a) - order(b))
  let data
  try {
    data = JSON.parse(rows.map(row => row.text).join('\n'))
  } catch {
    return null
  }
  const test = /\b(?:test|held[- ]out)\b/i.test(question)
  const validation = /\bvalidation\b/i.test(question)
  if (test && validation) return null
  const metrics = test ? data?.test : validation ? data?.validation : data
  const values = requested.map(metric => {
    const key = metric.keys.find(candidate => Object.hasOwn(metrics ?? {}, candidate))
    const value = metrics?.[key]
    if (typeof value !== 'string' && !Number.isFinite(value)) return null
    const display = metric.percent && typeof value === 'number' && value >= 0 && value <= 1
      ? `${(value * 100).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}%` : String(value)
    return { key, value, label: metric.label, display }
  })
  if (values.some(value => !value)) return null

  const recorded = values.map(({ label, display }) => `${label} ${display}`).join(' and ')
  const label = test ? 'held-out test ' : validation ? 'validation ' : ''
  const resultRows = rows.filter(row => values.some(({ key, value }) =>
    row.text.includes(`"${key}"`) && row.text.includes(JSON.stringify(value))))
  const sectionRows = (test || validation) ? resultRows.filter(row => (test ? /(?:^|\n)\s*"test"\s*:/ : /(?:^|\n)\s*"validation"\s*:/).test(row.text)) : []
  const sources = (sectionRows.length ? sectionRows : resultRows.length ? resultRows : rows)
    .slice(0, 3).map(({ id, title, href }) => ({ id, title, href }))
  return { answer: `${rows[0].path} records ${label}${recorded}.`, sources }
}

export function isFollowUp(question) {
  return /\b(?:this|that|these|those|it|its|them|there|above|previous|same)\b|^(?:and\b|tell me more\b|which ones?\b|what (?:else|about)\b|(?:what|which) (?:algorithms?|models?|metrics?|libraries|accuracy)\b)/i.test(question)
}

export async function resolveNotebook(table, question, repository, sourceIds = []) {
  const paths = explicitFiles(question).filter(path => path.endsWith('.ipynb'))
  let candidates = await matchPaths(table, paths, { repository }, true)
  if (!paths.length && sourceIds.length) {
    const ids = sourceIds.filter(id => /^[a-f0-9]{32}$/.test(id)).map(id => `'${id}'`).join(',')
    if (ids) candidates = await scoped(sourceQuery(table).where(`id IN (${ids})`).where("ends_with(lower(path), '.ipynb')"),
      { repository }).select(fields).limit(10).toArray()
  }
  const notebooks = new Map(candidates.map(row => [`${row.repository}/${row.path}`, row]))
  if (notebooks.size === 1) return notebooks.values().next().value
  return null
}

const modelLine = /(?:\b\w*(?:Classifier|Regressor|Regression(?:CV)?|Machine|Forest|Boosting|Model|Sequential|SVC|SVR|KMeans)\s*\(|\.fit\s*\(|\b(?:glmnet|xgboost|lightgbm|catboost|arima|sarima|prophet)\s*\()/i
const evaluationLine = /\b(?:train_test_split|(?:Stratified)?KFold|TimeSeriesSplit|\w*SearchCV|cross_val\w*|confusion_matrix|classification_report|\w*auc_score|average_precision_score|roc_curve|precision_recall_curve|\w*_score|mean_\w*_error|SMOTE|fit_resample)\s*\(/i

export async function notebookMethodEvidence(table, notebook, question) {
  if (!/\b(?:models?|algorithms?|evaluat\w*|training|trained|metrics?|validation)\b/i.test(question)) return []
  const rows = await scoped(sourceQuery(table).where("kind = 'notebook'"), notebook)
    .select(fields).limit(2500).toArray()
  const part = row => Number(row.title.match(/ · part (\d+)$/)?.[1] ?? 0)
  rows.sort((a, b) => part(a) - part(b))

  const models = new Map()
  const evaluation = new Map()
  let cell = ''
  let code = false
  for (const row of rows) {
    for (const original of row.text.split('\n')) {
      const line = original.trim()
      const marker = line.match(/^Notebook cell (\d+) \((\w+)\)$/)
      if (marker) {
        cell = marker[1]
        code = marker[2] === 'code'
      } else if (line.startsWith('Saved output for cell ')) {
        code = false
      } else if (code && !line.startsWith('#')) {
        const key = line.replace(/\s+/g, ' ')
        if (modelLine.test(line)) models.set(key, cell)
        if (evaluationLine.test(line)) evaluation.set(key, cell)
      }
    }
  }
  if (!models.size && !evaluation.size) return []
  const format = (entries, pattern) => {
    const counts = new Map()
    return [...entries].filter(([line]) => {
      const operation = line.match(pattern)[0].toLowerCase().replace(/\s+/g, '')
      const count = counts.get(operation) ?? 0
      counts.set(operation, count + 1)
      return count < 2
    }).slice(0, 32).map(([line, cellNumber]) => `Cell ${cellNumber}: ${line.slice(0, 190)}`).join('\n')
  }
  return [{
    ...notebook,
    kind: 'notebook',
    title: `${notebook.repository} / ${notebook.path} · training and evaluation cells`,
    text: [models.size && `Model code:\n${format(models, modelLine)}`,
      evaluation.size && `Evaluation and data split code:\n${format(evaluation, evaluationLine)}`].filter(Boolean).join('\n\n'),
  }]
}
