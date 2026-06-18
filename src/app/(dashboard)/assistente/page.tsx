'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Trash2, Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Messaggio = {
  id: string
  ruolo: 'user' | 'model'
  testo: string
  ts: Date
}

const DOMANDE_ESEMPIO = [
  'Qual è il saldo attuale della cassa?',
  'Quanto abbiamo incassato nel 2025?',
  'Qual è il prodotto che ha generato più ricavi?',
  'Ci sono crediti o debiti aperti?',
  'Come vanno le giacenze in magazzino?',
  'Quali terreni sono stati più produttivi?',
]

export default function AssistentePage() {
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [input, setInput] = useState('')
  const [caricamento, setCaricamento] = useState(false)
  const [errore, setErrore] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi, caricamento])

  async function invia(testo?: string) {
    const domanda = (testo ?? input).trim()
    if (!domanda || caricamento) return

    const nuovoMsg: Messaggio = { id: Date.now().toString(), ruolo: 'user', testo: domanda, ts: new Date() }
    const nuoviMsg = [...messaggi, nuovoMsg]
    setMessaggi(nuoviMsg)
    setInput('')
    setCaricamento(true)
    setErrore('')

    try {
      const cronologia = nuoviMsg.slice(0, -1).map(m => ({ ruolo: m.ruolo, testo: m.testo }))
      const res = await fetch('/api/assistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domanda, cronologia }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Errore sconosciuto')

      setMessaggi(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), ruolo: 'model', testo: data.risposta, ts: new Date() },
      ])
    } catch (e: unknown) {
      setErrore(e instanceof Error ? e.message : 'Errore nella richiesta')
    } finally {
      setCaricamento(false)
      inputRef.current?.focus()
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      invia()
    }
  }

  function reset() {
    setMessaggi([])
    setErrore('')
    setInput('')
  }

  const isEmpty = messaggi.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] lg:h-[calc(100vh-2rem)] max-w-3xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Assistente Avaia</h1>
            <p className="text-xs text-gray-400">Analizza i dati del gestionale e risponde in italiano</p>
          </div>
        </div>
        {!isEmpty && (
          <Button variant="ghost" size="sm" onClick={reset} className="text-gray-400 hover:text-red-500">
            <Trash2 className="w-4 h-4 mr-1" />Nuova chat
          </Button>
        )}
      </div>

      {/* area messaggi */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-indigo-500" />
            </div>
            <h2 className="text-gray-700 font-semibold mb-1">Cosa vuoi sapere?</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-sm">
              Puoi fare qualsiasi domanda sui dati del gestionale — cassa, vendite, raccolta, magazzino, scenari e molto altro.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {DOMANDE_ESEMPIO.map((d, i) => (
                <button key={i} onClick={() => invia(d)}
                  className="text-left text-sm px-4 py-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 transition-all">
                  {d}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messaggi.map(m => (
              <div key={m.id} className={`flex gap-3 ${m.ruolo === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* avatar */}
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${m.ruolo === 'model' ? 'bg-gradient-to-br from-violet-500 to-indigo-600' : 'bg-gray-200'}`}>
                  {m.ruolo === 'model'
                    ? <Bot className="w-4 h-4 text-white" />
                    : <User className="w-4 h-4 text-gray-500" />}
                </div>
                {/* bolla */}
                <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.ruolo === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                }`}>
                  <pre className="whitespace-pre-wrap font-sans">{m.testo}</pre>
                  <p className={`text-[10px] mt-1.5 ${m.ruolo === 'user' ? 'text-indigo-300' : 'text-gray-400'}`}>
                    {m.ts.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* indicatore caricamento */}
            {caricamento && (
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5 items-center h-5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {errore && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {errore}
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="shrink-0 mt-3">
        <div className="flex gap-2 items-end bg-white border border-gray-200 rounded-2xl shadow-sm px-3 py-2.5 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Scrivi una domanda sui dati del gestionale..."
            className="flex-1 resize-none outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent max-h-32 leading-relaxed"
            rows={1}
            style={{ height: 'auto' }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = t.scrollHeight + 'px'
            }}
            disabled={caricamento}
          />
          <button
            onClick={() => invia()}
            disabled={!input.trim() || caricamento}
            className="shrink-0 w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
            <Send className="w-4 h-4 text-white disabled:text-gray-400" />
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-1.5">
          Invio con Enter · Shift+Enter per andare a capo · I dati vengono letti in tempo reale
        </p>
      </div>
    </div>
  )
}
