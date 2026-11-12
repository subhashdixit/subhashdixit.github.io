import { explicitFiles, findFileLocations, isFollowUp, openPortfolioDetails, openPortfolioVectors, readRecordedMetrics, resolveNotebook } from './portfolio-details.mjs'
import projectHomepages from './data/project-homepages.json' with { type: 'json' }
import { githubPages, projects } from '../src/data/projects.mjs'
import { createEuriClient } from './euri.mjs'
import { findPortfolioFact, portfolioKnowledge } from './portfolio-knowledge.mjs'
import { findMentionedRepositories, findMentionedRepository, findRepositorySummary, openPortfolioIndex, readRepositoryCatalog } from './portfolio-index.mjs'

import { asksAboutChildhood, buildSearches, careerQuestion, needsMultipleSources, questionParts, retrieveAnswers } from './portfolio-retrieval.mjs'

const asksForApp = /(?:where.*(?:open|try|run|host)|(?:link|url|open|try|launch).*\b(?:live|app|demo|deployed)\b|\b(?:live|app|demo|deployed)\b.*(?:link|url))/i

function projectLink({ repository, title }) {
  const project = projects.find(({ slug }) => slug === repository)
  const href = project ? project.liveUrl ?? `${githubPages}/${repository}/` : projectHomepages[repository]
  if (!href) return null
  const name = project?.title ?? title
  return { id: `live-${repository}`, title: `Open ${name}`, href, text: `Published app for ${name}: ${href}` }
}

const audioExtensions = new Map([
  ['audio/webm', 'webm'],
  ['audio/mp4', 'mp4'],
  ['audio/ogg', 'ogg'],
])

const insufficientEvidence = {
  answer: 'I couldn’t verify an answer in the indexed portfolio. I can help with Subhash’s public professional experience, education, skills, and projects.',
  sources: [],
}

const concurrentRequests = 2
const waitingLimit = 4

export function askMiddleware(apiKey, client = createEuriClient(apiKey, fetch, { embeddingTimeout: 9000 }), allowedOrigin) {
  const answers = new Map()
  let indexPromise
  let localTablePromise
  let catalogPromise
  let detailsPromise
  let vectorsPromise
  let activeRequests = 0
  const waiting = []
  let requestWindow = 0
  let requestCount = 0

  function waitForSlot(res) {
    if (activeRequests < concurrentRequests) {
      activeRequests += 1
      return true
    }

    return new Promise(resolve => {
      const timeout = setTimeout(cancel, 90_000)
      function finish(granted) {
        clearTimeout(timeout)
        res.off('close', cancel)
        resolve(granted)
      }
      function cancel() {
        const index = waiting.indexOf(grant)
        if (index !== -1) waiting.splice(index, 1)
        finish(false)
      }
      function grant() {
        finish(true)
      }
      waiting.push(grant)
      res.once('close', cancel)
    })
  }

  function getIndex() {
    indexPromise ??= client.embed(portfolioKnowledge.map(record => `${record.title}\n${record.text}`))
      .catch(error => {
        indexPromise = undefined
        throw error
      })
    return indexPromise
  }

  return async (req, res, next) => {
    const path = req.url?.split('?')[0]
    const isAudio = path === '/api/transcribe'
    if (!isAudio && path !== '/api/ask') return next()

    const timing = []
    let omittedChildhood = false
    const childhood = 'The portfolio covers Subhash’s professional work, education, and projects. It does not cover his childhood.'
    const send = (status, body) => {
      if (res.destroyed) return
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...(timing.length ? { 'Server-Timing': timing.join(', ') } : {}),
      })
      if (status === 200 && body.answer) {
        const { answer, sections, sources } = body
        const details = (sections ?? []).map(({ heading, text }) => `${heading}\n${text}`)
        body = { answer: [answer, ...details, ...(omittedChildhood ? [childhood] : [])].join('\n\n'), sources }
      }
      res.end(JSON.stringify(body))
    }

    if (req.method !== 'POST') return send(405, { error: 'Use POST to ask a question.' })
    if (req.headers['sec-fetch-site'] === 'cross-site' && (!allowedOrigin || req.headers.origin !== allowedOrigin)) {
      return send(403, { error: 'Use Ask Subhash to ask a question.' })
    }
    const contentType = req.headers['content-type']?.split(';')[0]
    const extension = audioExtensions.get(contentType)
    if (isAudio ? !extension : contentType !== 'application/json') {
      return send(415, { error: isAudio ? 'This recording format is unsupported.' : 'Send a JSON question.' })
    }
    if (!apiKey) return send(503, { error: 'The assistant is unavailable.' })

    let question
    let context = []
    let audio
    try {
      const chunks = []
      let bytes = 0
      for await (const chunk of req) {
        bytes += Buffer.byteLength(chunk)
        if (bytes > (isAudio ? 4_000_000 : 8192)) return send(413, { error: 'That question is too long.' })
        chunks.push(Buffer.from(chunk))
      }
      const buffer = Buffer.concat(chunks)
      if (isAudio) {
        if (!buffer.length) return send(400, { error: 'Record a question first.' })
        audio = buffer
      } else {
        const body = JSON.parse(buffer.toString('utf8'))
        question = typeof body?.question === 'string' ? body.question.trim() : ''
        if (isFollowUp(question) && Array.isArray(body?.context)) {
          context = body.context.slice(-4).filter(turn => typeof turn?.question === 'string').map(turn => ({
            question: turn.question.slice(0, 500),
            sourceIds: Array.isArray(turn.sourceIds) ? turn.sourceIds.slice(0, 8)
              .filter(id => typeof id === 'string' && /^[a-f0-9]{32}$/.test(id)) : [],
          }))
        }
      }
    } catch {
      return send(400, { error: 'Enter a valid question.' })
    }
    if (!isAudio && (!question || question.length > 500)) {
      return send(400, { error: 'Enter a question of up to 500 characters.' })
    }

    if (question) {
      const parts = questionParts(question)
      const professionalParts = parts.filter(part => !asksAboutChildhood(part))
      if (professionalParts.length < parts.length) {
        if (!professionalParts.length) return send(200, { answer: childhood, sources: [] })
        omittedChildhood = true
        question = professionalParts.join('? ')
        context = []
      }
    }

    const fact = question && findPortfolioFact(question)
    if (fact) {
      timing.push('portfolio-fact')
      return send(200, fact)
    }

    const cacheKey = JSON.stringify([question?.replace(/\s+/g, ' ').toLowerCase(), context])
    const cached = answers.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      timing.push('answer-cache;desc="hit"')
      return send(200, cached.body)
    }
    if (cached) answers.delete(cacheKey)

    const hour = Math.floor(Date.now() / 3_600_000)
    if (hour !== requestWindow) {
      requestWindow = hour
      requestCount = 0
    }
    if (requestCount >= 20 || waiting.length >= waitingLimit) {
      return send(429, { error: 'The assistant is busy or has reached its limit. Try again later.' })
    }

    requestCount += 1
    if (!await waitForSlot(res)) {
      if (res.destroyed) return
      return send(429, { error: 'This question waited too long. Try again shortly.' })
    }
    try {
      if (res.destroyed) return
      if (isAudio) {
        const transcript = await client.transcribe(audio, contentType, extension)
        return transcript
          ? send(200, { transcript })
          : send(422, { error: 'No speech was detected. Try speaking again or type your question.' })
      }

      const retrievalStarted = performance.now()
      localTablePromise ??= openPortfolioIndex().catch(error => {
        localTablePromise = undefined
        throw error
      })
      const table = await localTablePromise
      let catalog = []
      let repositories = []
      let compound = false
      let answerQuestion = question
      if (table) {
        catalogPromise ??= readRepositoryCatalog(table).catch(error => {
          catalogPromise = undefined
          throw error
        })
        catalog = await catalogPromise
        repositories = findMentionedRepositories(catalog, question)
        compound = needsMultipleSources(question, repositories)
        const summary = !compound && findRepositorySummary(catalog, question)
        if (summary) {
          const { id, title, href, text } = summary
          timing.push(`retrieval;dur=${(performance.now() - retrievalStarted).toFixed(1)}`)
          return send(200, { answer: text, sources: [{ id, title, href }] })
        }
      }

      let matches
      const verified = []
      if (table) {
        detailsPromise ??= openPortfolioDetails().catch(error => {
          detailsPromise = undefined
          throw error
        })
        const details = await detailsPromise
        if (details) await details.checkoutLatest()
        else detailsPromise = undefined
        const career = careerQuestion.test(question)
        const files = explicitFiles(question)
        const named = repositories.length > 0
        const singleRepository = () => repositories.length === 1 ? repositories[0].repository : undefined
        let notebook = details && repositories.length <= 1 && files.length === 1 && !career
          ? await resolveNotebook(details, question, singleRepository()) : null
        let previousProfile
        if (!named && !files.length && !career && isFollowUp(question)) {
          for (const previous of context.toReversed()) {
            const earlier = findMentionedRepositories(catalog, previous.question)
            notebook = details && earlier.length <= 1
              ? await resolveNotebook(details, previous.question, earlier[0]?.repository, previous.sourceIds) : null
            repositories = notebook ? catalog.filter(item => item.repository === notebook.repository) : earlier
            if (repositories.length) break
            if (careerQuestion.test(previous.question)) {
              previousProfile = previous.question
              break
            }
          }
        }
        if (notebook) {
          answerQuestion = `${question} (Notebook: ${notebook.path} in ${notebook.repository}. Use this notebook for questions referring to it.)`
        } else if (!named && repositories.length) {
          answerQuestion = `${question} (Previously discussed repositories: ${repositories.map(item => item.repository).join(', ')}.)`
        } else if (previousProfile) {
          answerQuestion = `${question} (Previous topic: ${previousProfile})`
        } else if (!repositories.length && /\b(?:this|that|previous) (?:\w+ )?notebook\b/i.test(question)) {
          return send(200, { answer: 'Which notebook do you mean? Share its filename or repository and I’ll look up the relevant cells.', sources: [] })
        }
        compound ||= repositories.length > 1
        const repository = notebook?.repository ?? singleRepository()
        const appEvidence = (asksForApp.test(question) ? repositories : []).map(projectLink).filter(Boolean)
        if (!compound && appEvidence.length === 1 && !/\b(?:and|algorithm|accuracy|which file|notebook)\b/i.test(question)) {
          const [{ id, title, href }] = appEvidence
          timing.push('project-link')
          return send(200, { answer: `Here is the published app link for ${title.replace(/^Open /, '')}.`, sources: [{ id, title, href }] })
        }
        if (details && (!career || repository) && !compound) {
          const locations = await findFileLocations(details, question, repository)
          if (locations) {
            timing.push(`file-lookup;dur=${(performance.now() - retrievalStarted).toFixed(1)}`)
            return send(200, locations)
          }
          const metrics = await readRecordedMetrics(details, question, repository)
          if (metrics) {
            timing.push(`structured-source;dur=${(performance.now() - retrievalStarted).toFixed(1)}`)
            return send(200, metrics)
          }
        }
        if (details && compound) {
          const parts = questionParts(question)
          const localAnswers = await Promise.all(parts.map(async part => {
            const namedRepository = findMentionedRepository(catalog, part)?.repository ?? repository
            return await readRecordedMetrics(details, part, namedRepository) ??
              await findFileLocations(details, part, namedRepository)
          }))
          if (parts.length > 1 && localAnswers.every(Boolean)) {
            timing.push('structured-source')
            return send(200, {
              answer: localAnswers.map(item => item.answer).join(' '),
              sources: [...new Map(localAnswers.flatMap(item => item.sources).map(source => [source.id, source])).values()],
            })
          }
          for (const item of localAnswers.filter(Boolean)) {
            verified.push(...item.sources.map(source => ({ ...source, text: item.answer })))
          }
        }
        verified.push(...appEvidence)
        const searches = buildSearches(question, { catalog, repositories, notebook, previousProfile })
        const retrieval = await retrieveAnswers({ client, table, details, searches, notebook, question, appEvidence: verified, catalog,
          getVectors: async () => {
            vectorsPromise ??= openPortfolioVectors().catch(error => {
              vectorsPromise = undefined
              throw error
            })
            const vectors = await vectorsPromise
            if (vectors) await vectors.checkoutLatest()
            else vectorsPromise = undefined
            return vectors
          },
        })
        matches = retrieval.matches
        if (retrieval.keywordFallback) timing.push('keyword-fallback')
      } else {
        const [index, [query]] = await Promise.all([getIndex(), client.embed([question])])
        matches = portfolioKnowledge.map((record, i) => ({
          record,
          score: index[i].reduce((sum, value, j) => sum + value * query[j], 0),
        })).sort((a, b) => b.score - a.score).slice(0, 5).map(({ record }) => record)
      }
      if (!matches.length) return send(200, insufficientEvidence)

      const generationStarted = performance.now()
      timing.push(`retrieval;dur=${(generationStarted - retrievalStarted).toFixed(1)}`)
      const citations = new Map(matches.map((source, index) => [String(index + 1), source]))
      const sourceLinks = rows => [...new Map(rows.map(({ id, title, href }) => [id, { id, title, href }])).values()]
      const sendVerified = () => send(200, {
        answer: [...new Set(verified.map(source => source.text))].join(' ') +
          ' I can verify these details directly from the portfolio. The rest of the question is still unverified.',
        sources: sourceLinks(verified),
      })
      let result
      try {
        result = await client.answer(answerQuestion, [...citations].map(([id, { title, text, kind, href }]) => ({ id, title, text, kind, href })))
      } catch (error) {
        if (!verified.length) throw error
        return sendVerified()
      }
      timing.push(`generation;dur=${(performance.now() - generationStarted).toFixed(1)}`)
      const answer = typeof result?.answer === 'string'
        ? result.answer.trim().replace(/\*\*([^*\n]+)\*\*/g, '$1') : ''
      const ids = Array.isArray(result?.sourceIds) ? [...new Set(result.sourceIds)] : []
      const sources = ids.map(id => citations.get(String(id))).filter(Boolean)
      if (!answer || !sources.length) return verified.length ? sendVerified() : send(200, insufficientEvidence)

      const body = { answer, sources: sourceLinks([...sources, ...verified]) }
      if (answers.size >= 64) answers.delete(answers.keys().next().value)
      answers.set(cacheKey, { body, expires: Date.now() + 15 * 60_000 })
      return send(200, body)
    } catch (error) {
      if (error.status === 429) return send(429, { error: 'The model has reached its usage limit. Try again later.' })
      if (error.name === 'TimeoutError') {
        return send(504, { error: isAudio ? 'Transcription took too long. Try again or type your question.' : 'The model took too long to respond. Please try again.' })
      }
      return send(502, { error: isAudio ? 'The recording couldn’t be transcribed. Try again or type your question.' : 'The assistant couldn’t get a response. Try again shortly.' })
    } finally {
      const nextRequest = waiting.shift()
      if (nextRequest) nextRequest()
      else activeRequests -= 1
    }
  }
}
