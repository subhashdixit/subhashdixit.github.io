import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Mic, Pause, Plus, Trash2 } from 'lucide-react'

const audioFormats = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']

const sampleQuestions = [
  'What did you build at EPAM?',
  'What work have you done with NLP?',
  'Which project runs AI in the browser?',
  'Which notebook is in credit-card-fraud-detector?',
]

const historyKey = 'ask-subhash-history-v1'
const historyLimit = 12
const questionLimit = 500
const apiOrigin = import.meta.env.VITE_CHAT_API_URL?.trim().replace(/\/+$/, '') ?? ''
const apiConfigured = Boolean(apiOrigin) || !import.meta.env.VITE_GITHUB_PAGES
const emptyTurns = []
const isSearching = turn => !turn.reply && !turn.error

function readHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(historyKey))
    if (Array.isArray(saved?.chats)) {
      const chats = saved.chats
        .filter(chat => typeof chat?.id === 'string' && Array.isArray(chat.turns) && chat.turns.length)
        .slice(0, historyLimit)
        .map(chat => ({
          ...chat,
          turns: chat.turns.map(turn => isSearching(turn) ? {
            ...turn, error: 'The answer was interrupted. Retry to ask again.',
          } : turn),
        }))
      return {
        chats,
        activeId: chats.some(chat => chat.id === saved.activeId) ? saved.activeId : null,
      }
    }
  } catch {
    // Storage can be unavailable in some browsers.
  }
  return { chats: [], activeId: null }
}

export default function AiLab({ active }) {
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState(readHistory)
  const [error, setError] = useState('')
  const [voiceStatus, setVoiceStatus] = useState('')
  const pending = useRef(new Map())
  const recording = useRef(null)
  const thread = useRef(null)
  const turns = history.chats.find(chat => chat.id === history.activeId)?.turns ?? emptyTurns
  const loading = turns.some(isSearching)
  const listening = voiceStatus === 'Listening…'
  const voiceAvailable = Boolean(navigator.mediaDevices?.getUserMedia && globalThis.MediaRecorder)

  useEffect(() => {
    try {
      localStorage.setItem(historyKey, JSON.stringify(history))
    } catch {
      // The current conversation still works when storage is unavailable.
    }
  }, [history])

  function selectConversation(activeId) {
    if (recording.current) return
    setHistory(previous => ({ ...previous, activeId }))
    setQuestion('')
    setError('')
  }

  useEffect(() => {
    if (!active) {
      setVoiceStatus('')
      return
    }

    return () => {
      const session = recording.current
      recording.current = null
      if (!session) return
      clearTimeout(session.timer)
      session.stream?.getTracks().forEach(track => track.stop())
      session.abort.abort()
    }
  }, [active])

  useEffect(() => {
    if (active && thread.current) thread.current.scrollTop = thread.current.scrollHeight
  }, [active, turns])

  function deleteConversation(chatId) {
    if (recording.current) return
    if (!window.confirm('Delete this saved conversation?')) return
    pending.current.get(chatId)?.abort()

    setHistory(previous => ({
      activeId: previous.activeId === chatId ? null : previous.activeId,
      chats: previous.chats.filter(chat => chat.id !== chatId),
    }))
    if (history.activeId === chatId) {
      setQuestion('')
      setError('')
    }
  }

  async function ask(value) {
    if (!apiConfigured) return
    const query = value.trim()
    if (!query || query.length > questionLimit || pending.current.has(history.activeId) || recording.current) return

    const chatId = history.activeId ?? crypto.randomUUID()
    const turn = { id: crypto.randomUUID(), question: query }
    const request = new AbortController()
    pending.current.set(chatId, request)
    setQuestion('')
    setError('')
    setHistory(previous => {
      const chat = previous.chats.find(item => item.id === chatId)
      const updated = { id: chatId, turns: [...(chat?.turns ?? []), turn] }
      const chats = [updated, ...previous.chats.filter(item => item.id !== chatId)]
      return {
        activeId: chatId,
        chats: chats.filter((item, index) => index < historyLimit || item.turns.some(isSearching)),
      }
    })

    function finishTurn(result) {
      setHistory(previous => {
        const chats = previous.chats.map(chat => chat.id === chatId
          ? { ...chat, turns: chat.turns.map(item => item.id === turn.id ? { ...item, ...result } : item) }
          : chat)
        return {
          ...previous,
          chats: chats.filter((item, index) => index < historyLimit ||
            item.id === previous.activeId || item.turns.some(isSearching)),
        }
      })
    }

    try {
      const response = await fetch(`${apiOrigin}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          context: turns.filter(item => item.reply).slice(-4).map(item => ({
            question: item.question,
            sourceIds: item.reply.sources.map(source => source.id),
          })),
        }),
        signal: request.signal,
      })
      const result = await response.json()
      if (!response.ok) {
        finishTurn({ error: result.error || 'The assistant is unavailable. Try again shortly.' })
        return
      }
      finishTurn({ reply: result })
    } catch {
      if (!request.signal.aborted) finishTurn({ error: 'The assistant may be starting up. Wait a minute and retry.' })
    } finally {
      pending.current.delete(chatId)
    }
  }

  function stopVoiceQuestion(sendTranscript) {
    const session = recording.current
    if (session?.recorder?.state !== 'recording') return

    session.sendTranscript = sendTranscript
    session.recorder.stop()
    setVoiceStatus('Transcribing your question…')
  }

  async function startVoiceQuestion() {
    if (pending.current.has(history.activeId) || recording.current) return

    const session = { abort: new AbortController() }
    recording.current = session
    setError('')
    setVoiceStatus('Waiting for microphone permission…')

    function finish(message = '') {
      if (recording.current !== session) return
      recording.current = null
      clearTimeout(session.timer)
      session.stream?.getTracks().forEach(track => track.stop())
      setVoiceStatus('')
      if (message) setError(message)
    }

    try {
      session.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (recording.current !== session) {
        session.stream.getTracks().forEach(track => track.stop())
        return
      }
      const mimeType = audioFormats.find(format => MediaRecorder.isTypeSupported(format))
      if (!mimeType) {
        finish('This browser can’t record in a supported format. You can type your question.')
        return
      }

      const recorder = new MediaRecorder(session.stream, { mimeType })
      session.recorder = recorder
      const chunks = []
      recorder.ondataavailable = event => {
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onerror = () => finish('Recording failed. Try again or type your question.')
      recorder.onstop = async () => {
        if (recording.current !== session) return
        clearTimeout(session.timer)
        session.stream.getTracks().forEach(track => track.stop())
        setVoiceStatus('Transcribing your question…')

        try {
          const audio = new Blob(chunks, { type: recorder.mimeType || mimeType })
          if (!audio.size) {
            finish('No audio was recorded. Try again or type your question.')
            return
          }
          const response = await fetch(`${apiOrigin}/api/transcribe`, {
            method: 'POST',
            body: audio,
            signal: session.abort.signal,
          })
          const result = await response.json()
          if (recording.current !== session) return
          const transcript = typeof result.transcript === 'string' ? result.transcript.trim() : ''
          if (!response.ok || !transcript) {
            finish(result.error || 'No speech was detected. Try again or type your question.')
            return
          }
          finish()
          if (transcript.length > questionLimit) {
            setQuestion(transcript)
            setError(`Shorten the transcript to ${questionLimit} characters before sending.`)
          } else if (session.sendTranscript) {
            ask(transcript)
          } else {
            setQuestion(transcript)
          }
        } catch {
          finish('The recording couldn’t be transcribed. Try again or type your question.')
        }
      }
      recorder.start()
      setVoiceStatus('Listening…')
      session.timer = setTimeout(() => stopVoiceQuestion(false), 20_000)
    } catch (reason) {
      finish(reason.name === 'NotAllowedError'
        ? 'Microphone access was denied. Allow access or type your question.'
        : 'The microphone is unavailable. You can type your question.')
    }
  }

  return (
    <section className="loop-intro loop-ai" hidden={!active}>
      <div className="loop-ai-layout">
        <aside className="loop-ai-history" aria-labelledby="ask-subhash-history-title">
          <button type="button" className="loop-ai-new-chat" disabled={Boolean(voiceStatus)}
            onClick={() => selectConversation(null)}>
            <Plus size={17} aria-hidden="true" /> New chat
          </button>
          <h2 id="ask-subhash-history-title">Chat history</h2>
          {history.chats.length ? (
            <ul className="loop-ai-history-list">
              {history.chats.map(chat => {
                const title = chat.turns[0].question
                const searching = chat.turns.some(isSearching)
                return (
                  <li key={chat.id} className="loop-ai-history-row">
                    <button type="button" className="loop-ai-history-chat" title={title}
                      aria-current={history.activeId === chat.id ? 'true' : undefined}
                      data-searching={searching ? '' : undefined}
                      disabled={Boolean(voiceStatus)} onClick={() => selectConversation(chat.id)}>
                      {title}{searching && <span className="sr-only">, searching</span>}
                    </button>
                    <button type="button" className="loop-ai-history-delete" title="Delete chat"
                      aria-label={`Delete chat: ${title}`} disabled={Boolean(voiceStatus)}
                      onClick={() => deleteConversation(chat.id)}>
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : <p className="loop-ai-history-empty">No saved chats yet</p>}
        </aside>
        <div className="loop-ai-main">
          <header className="loop-ai-heading">
            <h1>Ask <span>Subhash</span></h1>
            <p>Ask about my experience, skills, or projects and explore the sources behind each answer.</p>
            {!apiConfigured && <p role="status">The chat service is being connected.</p>}
          </header>
          <div className="loop-ai-chat">
            {turns.length === 0 ? (
              <div className="loop-ai-prompts" aria-label="Suggested questions">
                {sampleQuestions.map(prompt => (
                  <button key={prompt} type="button" disabled={!apiConfigured || Boolean(voiceStatus)} onClick={() => ask(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="loop-ai-thread" ref={thread} tabIndex={0} role="log" aria-label="Conversation" aria-live="polite" key={history.activeId}>
                {turns.map(({ id, question: sentQuestion, reply, error: turnError }, index) => (
                  <article className="loop-ai-turn" key={id ?? index}>
                    <p className="loop-ai-question"><span className="sr-only">You: </span>{sentQuestion}</p>
                    <div className="loop-ai-response">
                      {turnError && (
                        <>
                          <p>{turnError}</p>
                          <button type="button" onClick={() => ask(sentQuestion)}
                            disabled={loading || Boolean(voiceStatus)}>Retry</button>
                        </>
                      )}
                      {!reply && !turnError && <p>Searching the portfolio…</p>}
                      {reply && (
                        <>
                          <p className="loop-ai-answer-lead">{reply.answer}</p>
                          {reply.sections?.map((section, sectionIndex) => (
                            <section key={sectionIndex} className="loop-ai-answer-section">
                              <h2>{section.heading}</h2>
                              <p>{section.text}</p>
                            </section>
                          ))}
                          {reply.sources.length > 0 && (
                            <details className="loop-ai-evidence">
                              <summary>Sources ({reply.sources.length})</summary>
                              <ul className="loop-ai-sources">
                                {reply.sources.map(source => (
                                  <li key={source.id}><a href={source.href}>{source.title} ↗</a></li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
            <form className="loop-ai-composer" onSubmit={event => {
              event.preventDefault()
              if (listening) stopVoiceQuestion(true)
              else ask(question)
            }}>
              <label htmlFor="portfolio-question" className="sr-only">Your question</label>
              <div className="loop-ai-input">
                <input id="portfolio-question" value={question} maxLength={questionLimit} required={!listening} disabled={!apiConfigured}
                  onChange={event => {
                    const value = event.target.value
                    setQuestion(value)
                    if (question.length > questionLimit && value.length <= questionLimit) setError('')
                  }}
                  placeholder="Ask about my work" />
                {apiConfigured && voiceAvailable && (listening ? (
                  <button type="button" className="loop-ai-icon loop-ai-mic is-recording"
                    aria-label="Pause and review transcript" title="Pause and review transcript"
                    onClick={() => stopVoiceQuestion(false)}>
                    <Pause size={18} aria-hidden="true" />
                  </button>
                ) : (
                  <button type="button" className="loop-ai-icon loop-ai-mic" aria-label="Ask by voice" title="Ask by voice"
                    disabled={loading || Boolean(voiceStatus)} onClick={startVoiceQuestion}>
                    <Mic size={20} aria-hidden="true" />
                  </button>
                ))}
                <button type="submit" className="loop-ai-icon loop-ai-send"
                  aria-label={listening ? 'Transcribe and send' : 'Send question'}
                  title={listening ? 'Transcribe and send' : 'Send question'}
                  disabled={!apiConfigured || loading || (!listening && (Boolean(voiceStatus) || !question.trim() ||
                    question.trim().length > questionLimit))}>
                  <ArrowUp size={22} aria-hidden="true" />
                </button>
              </div>
              {(voiceStatus || error) && <p className="loop-ai-status" role="status">{voiceStatus || error}</p>}
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
