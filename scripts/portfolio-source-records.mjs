import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { basename, extname } from 'node:path'

const codeExtensions = new Set('.py .pyi .js .mjs .cjs .jsx .ts .tsx .sql .r .jl .java .go .rs .c .cpp .h .cs .sh .bash .ps1 .css .scss .vue .svelte .html .xml .yaml .yml .toml .ini .cfg .conf .json .jsonl .md .mdx .rst .txt .in .tf .rb .php .kt .scala .swift .dart .ipynb .rmd .qmd .pdf .docx'.split(' '))
const generatedPath = /(?:^|\/)(?:\.?(?:venv\d*|virtualenv)|node_modules|site-packages|__pycache__|\.ipynb_checkpoints|\.next|dist|vendor|lib64|\.git|\.idea|\.vscode)(?:\/|$)/i
const sensitivePath = /(?:^|\/)(?:\.env(?:\.[^/]+)?|\.netrc|\.npmrc|id_rsa|id_ed25519|[^/]*(?:credentials|secrets|private[-_]?key)[^/]*\.(?:json|txt|yaml|yml|pem)|[^/]+\.(?:pem|p12|key|pfx))(?:\/|$)/i
const generatedFile = /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|poetry\.lock|uv\.lock|[^/]+\.min\.(?:js|css)|[^/]+\.map)$/i
const textLimit = 2 * 1024 * 1024
const documentLimit = 32 * 1024 * 1024

export function redactSource(text) {
  return text
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g,
      match => match.split('\n').map(() => '[redacted]').join('\n'))
    .replace(/\b(?:gh[pousr]_[\w]{20,}|github_pat_[\w]{20,}|euri-[a-f0-9]{24,}|(?:AKIA|ASIA)[A-Z0-9]{16}|sk-(?:proj-)?[\w-]{20,}|AIza[\w-]{30,}|xox[baprs]-[\w-]{16,})\b/gi, '[redacted]')
    .replace(/(\b(?:[\w]+[_-])?(?:api[_-]?key|access[_-]?token|secret[_-]?key|client[_-]?secret|password|bearer|(?:euri|openai|github|hf)_token)\b["']?\s*[:=]\s*["'])([^"'\r\n]{8,})(["'])/gi,
      (match, prefix, value, suffix) => /^(?:\$|\{|<|example|placeholder|your[-_ ])/i.test(value) ? match : prefix + '[redacted]' + suffix)
    .replace(/data:(?:image|font|audio|video)\/[\w.+-]+;base64,[a-z0-9+/=_-]+/gi, '[embedded media]')
    .replace(/(https?:\/\/[^\s/@:]+:)[^\s/@]+@/gi, '$1[redacted]@')
}

function git(directory, args, options = {}) {
  return execFileSync('git', ['-C', directory, ...args], {
    maxBuffer: 192 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_NO_LAZY_FETCH: '1' },
    ...options,
  })
}

function contentKind(path) {
  const name = basename(path)
  const extension = extname(path).toLowerCase()
  if (generatedFile.test(path)) return ''
  if (extension === '.ipynb') return 'notebook'
  if (extension === '.pdf' || extension === '.docx') return 'document'
  if (/\.(?:csv|tsv)$/i.test(path) && /metric|benchmark|evaluation|score|model[-_ ]?comparison|results/i.test(path)) return 'report'
  return codeExtensions.has(extension) || /^(?:Dockerfile|Makefile|Procfile|LICENSE|README)(?:[.-].*)?$/i.test(name) ? 'source' : ''
}

function blobMetadata(directory, entries) {
  const lookup = () => git(directory, ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], {
    encoding: 'utf8', input: entries.map(({ oid }) => oid).join('\n') + '\n',
  }).trim().split('\n')
  let sizes = lookup()
  const missing = sizes.filter(line => line.endsWith(' missing')).map(line => line.split(' ')[0])
  if (missing.length) {
    git(directory, ['-c', 'fetch.negotiationAlgorithm=noop', 'fetch', '--no-tags', '--no-write-fetch-head',
      '--recurse-submodules=no', '--filter=blob:none', 'origin', '--stdin'], {
      input: [...new Set(missing)].join('\n') + '\n', timeout: 180_000, stdio: ['pipe', 'pipe', 'pipe'],
    })
    sizes = lookup()
  }
  return entries.map((entry, i) => ({ ...entry, size: Number(sizes[i]?.split(' ')[2]) }))
}

function readBlobs(directory, entries) {
  const data = git(directory, ['cat-file', '--batch'], { input: entries.map(entry => entry.oid).join('\n') + '\n' })
  let cursor = 0
  return entries.map(entry => {
    const end = data.indexOf(10, cursor)
    const [oid, type, size] = data.toString('utf8', cursor, end).split(' ')
    if (oid !== entry.oid || type !== 'blob' || Number(size) !== entry.size) throw new Error('Unexpected Git blob response')
    cursor = end + 1 + entry.size + 1
    return [entry, data.subarray(end + 1, cursor - 1)]
  })
}

function textValue(value) {
  return Array.isArray(value) ? value.join('') : typeof value === 'string' ? value : ''
}

function notebookText(bytes) {
  const notebook = JSON.parse(bytes.toString('utf8'))
  const cells = notebook.cells ?? notebook.worksheets?.flatMap(sheet => sheet.cells ?? []) ?? []
  return cells.map((cell, i) => {
    const input = textValue(cell.source ?? cell.input)
    const output = (cell.outputs ?? []).map(result => {
      const plain = textValue(result.data?.['text/plain'] ?? result.text)
      if (plain) return plain
      if (result.output_type === 'error') return [result.ename, result.evalue].filter(Boolean).join(': ')
      return textValue(result.data?.['text/markdown']) ||
        textValue(result.data?.['text/html']).replace(/<\/(?:tr|p|div)>/gi, '\n').replace(/<\/(?:td|th)>/gi, ' | ').replace(/<[^>]+>/g, '')
    }).filter(Boolean).join('\n')
    return [`Notebook cell ${i + 1} (${cell.cell_type ?? 'unknown'})`, input,
      output && `Saved output for cell ${i + 1}:\n${output}`].filter(Boolean).join('\n')
  }).join('\n\n')
}

function documentText(path, bytes) {
  if (path.toLowerCase().endsWith('.pdf')) {
    return execFileSync('pdftotext', ['-layout', '-', '-'], { input: bytes, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 15_000, stdio: ['pipe', 'pipe', 'pipe'] })
  }
  const unpack = 'import io, sys, zipfile, xml.etree.ElementTree as E; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); ns="{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"; root=E.fromstring(z.read("word/document.xml")); print("\\n".join("".join(t.text or "" for t in p.iter(ns+"t")) for p in root.iter(ns+"p")))'
  return execFileSync('python3', ['-c', unpack], { input: bytes, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 15_000, stdio: ['pipe', 'pipe', 'pipe'] })
}

export function chunkSource(text, limit = 4500) {
  const chunks = []
  const segmentPattern = new RegExp(`.{1,${limit}}`, 'gu')
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let buffer = ''
  let start = 1
  for (const [index, line] of lines.entries()) {
    const segments = line.match(segmentPattern) ?? ['']
    for (const segment of segments) {
      if (buffer && (buffer.length + segment.length + 1 > limit ||
          (buffer.length > limit * 0.62 && /^(?:#{1,4} |Notebook cell |(?:export )?(?:async )?(?:def|function|class) )/.test(segment)))) {
        if (buffer.trim()) chunks.push({ text: buffer.trim(), start, end: Math.max(start, index) })
        buffer = ''
      }
      if (!buffer) start = index + 1
      buffer += segment + '\n'
    }
  }
  if (buffer.trim()) chunks.push({ text: buffer.trim(), start, end: lines.length })
  return chunks
}

function baseRecord(repo, commit, path, kind, passage, sequence) {
  const title = `${repo} / ${path}${sequence ? ` · part ${sequence}` : ''}`
  const href = `https://github.com/subhashdixit/${encodeURIComponent(repo)}/blob/${commit}/${path.split('/').map(encodeURIComponent).join('/')}`
  const id = createHash('sha256').update(`${repo}\0${path}\0${kind}\0${sequence}\0${passage}`).digest('hex').slice(0, 32)
  return { id, title, text: passage, href, repository: repo, path, kind }
}

export function readRepositorySources(directory, repo, { fork = false, revision = 'HEAD' } = {}) {
  const origin = git(directory, ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim()
  if (origin.toLowerCase() !== `https://github.com/subhashdixit/${repo}.git`.toLowerCase()) throw new Error(`Unexpected origin for ${repo}`)
  if (revision !== 'HEAD' && !/^[0-9a-f]{40}$/.test(revision)) throw new Error(`Invalid commit for ${repo}`)
  const commit = git(directory, ['rev-parse', '--verify', `${revision}^{commit}`], { encoding: 'utf8' }).trim()
  const entries = git(directory, ['ls-tree', '-rz', commit], { encoding: 'utf8' }).split('\0').filter(Boolean).flatMap(line => {
    const boundary = line.indexOf('\t')
    const [mode, type, oid] = line.slice(0, boundary).split(' ')
    const path = line.slice(boundary + 1)
    if (!mode.startsWith('100') || type !== 'blob' || generatedPath.test(path) || sensitivePath.test(path)) return []
    return [{ path, oid, kind: contentKind(path) }]
  })
  const provenance = fork ? 'Public GitHub fork; content may be upstream. ' : ''
  const records = entries.map(({ path }) => baseRecord(repo, commit, path, 'file',
    `${provenance}File ${path} is tracked in the ${repo} repository.`, 0))
  const candidates = entries.filter(entry => entry.kind)
  const sized = candidates.length ? blobMetadata(directory, candidates) : []
  let omitted = 0
  let indexed = 0
  const readable = sized.filter(entry => entry.size > 0 && entry.size <=
    (['notebook', 'document'].includes(entry.kind) ? documentLimit : textLimit))
  for (let i = 0; i < readable.length;) {
    let bytes = 0
    const batch = []
    do {
      bytes += readable[i].size
      batch.push(readable[i++])
    } while (i < readable.length && batch.length < 50 && bytes + readable[i].size < 40 * 1024 * 1024)
    for (const [entry, content] of readBlobs(directory, batch)) {
      let extracted
      try {
        extracted = entry.kind === 'notebook' ? notebookText(content) : entry.kind === 'document'
          ? documentText(entry.path, content) : content.includes(0) ? '' : content.toString('utf8')
      } catch {
        omitted++
        continue
      }
      const passages = chunkSource(redactSource(extracted))
      if (passages.length) indexed++
      else omitted++
      for (const [index, passage] of passages.entries()) {
        const row = baseRecord(repo, commit, entry.path, entry.kind, provenance + passage.text, index + 1)
        if (entry.kind === 'source' || entry.kind === 'report') {
          row.href += `#L${passage.start}${passage.end > passage.start ? `-L${passage.end}` : ''}`
        }
        records.push(row)
      }
    }
  }
  return { records, indexed, catalogued: entries.length, omitted: omitted + candidates.length - readable.length, commit }
}
