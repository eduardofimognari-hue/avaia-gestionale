'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'
import { ArrowLeft, Plus, Trash2, Pencil, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock } from 'lucide-react'

// ────────── types ──────────
type Scenario = { id: number; nome: string; descrizione: string | null; annoInizio: number; annoFine: number; stato: string }
type Luogo = { id: number; nome: string }
type Terreno = { id: number; nome: string; luogoId: number | null }
type Prodotto = { id: number; nome: string; codice: string; unitaMisura: string }
type Uscita = { id: number; anno: number; categoria: string; descrizione: string; importo: number; note: string | null; luogo: Luogo | null; terreno: Terreno | null }
type Entrata = { id: number; anno: number; tipo: string; descrizione: string; quantitaStimata: number | null; prezzoStimato: number | null; importoFisso: number | null; note: string | null; prodotto: Prodotto | null; luogo: Luogo | null; terreno: Terreno | null }
type Obiettivo = { id: number; nome: string; tipo: string; percentuale: number | null; importoFisso: number | null; priorita: number; note: string | null }
type CruscottoAnno = { anno: number; entratePreviste: number; uscitePreviste: number; nettoPrevisto: number; entratoReale: number; usciteReali: number; nettoReale: number; scostamentoNetto: number }
type CruscottoObiettivo = { id: number; nome: string; tipo: string; importoTarget: number; importoCoperto: number; percentualeCoperta: number; stato: string }
type Cruscotto = { anni: number[]; perAnno: CruscottoAnno[]; totale: { entratePreviste: number; uscitePreviste: number; nettoPrevisto: number; entratoReale: number; usciteReali: number; nettoReale: number }; obiettivi: CruscottoObiettivo[] }

// ────────── helpers ──────────
const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
const sign = (n: number) => n >= 0 ? `+${fmt(n)}` : fmt(n)

const CATEGORIE_USCITA = ['Lavori agricoli', 'Manodopera', 'Materiali e forniture', 'Attrezzature e macchinari', 'Servizi esterni', 'Utenze e costi fissi', 'Imposte e tasse', 'Altro']
const TIPI_ENTRATA = [{ value: 'produzione', label: 'Produzione (qty × prezzo)' }, { value: 'servizio', label: 'Servizio (importo fisso)' }, { value: 'altro', label: 'Altro (importo fisso)' }]
const TIPI_OBIETTIVO = [{ value: 'distribuzione_utili', label: 'Distribuzione utili soci' }, { value: 'reinvestimento', label: 'Reinvestimento' }, { value: 'riserva', label: 'Fondo di riserva' }, { value: 'imposte', label: 'Imposte e tasse' }, { value: 'spese_gestione', label: 'Spese di gestione' }, { value: 'altro', label: 'Altro' }]
const STATO_VARIANT: Record<string, 'default' | 'success' | 'info'> = { bozza: 'default', attivo: 'success', archiviato: 'info' }
const STATO_LABELS: Record<string, string> = { bozza: 'Bozza', attivo: 'Attivo', archiviato: 'Archiviato' }

function anni(from: number, to: number) {
  const result = []
  for (let a = from; a <= to; a++) result.push(a)
  return result
}

// ────────── main component ──────────
export default function ScenarioDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [uscite, setUscite] = useState<Uscita[]>([])
  const [entrate, setEntrate] = useState<Entrata[]>([])
  const [obiettivi, setObiettivi] = useState<Obiettivo[]>([])
  const [cruscotto, setCruscotto] = useState<Cruscotto | null>(null)
  const [luoghi, setLuoghi] = useState<Luogo[]>([])
  const [terreni, setTerreni] = useState<Terreno[]>([])
  const [prodotti, setProdotti] = useState<Prodotto[]>([])

  const [activeTab, setActiveTab] = useState<'uscite' | 'entrate' | 'obiettivi' | 'cruscotto'>('uscite')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // modals
  const [editScenario, setEditScenario] = useState(false)
  const [addUscita, setAddUscita] = useState(false)
  const [addEntrata, setAddEntrata] = useState(false)
  const [addObiettivo, setAddObiettivo] = useState(false)
  const [editObiettivo, setEditObiettivo] = useState<Obiettivo | null>(null)

  // forms
  const emptyU = { anno: '', categoria: CATEGORIE_USCITA[0], descrizione: '', importo: '', luogoId: '', terrenoId: '', note: '' }
  const emptyE = { anno: '', tipo: 'produzione', descrizione: '', prodottoId: '', luogoId: '', terrenoId: '', quantitaStimata: '', prezzoStimato: '', importoFisso: '', note: '' }
  const emptyO = { nome: '', tipo: 'altro', metodo: 'percentuale' as 'percentuale' | 'fisso', percentuale: '', importoFisso: '', priorita: '1', note: '' }
  const [uf, setUf] = useState(emptyU)
  const [ef, setEf] = useState(emptyE)
  const [of, setOf] = useState(emptyO)
  const [editSf, setEditSf] = useState({ nome: '', descrizione: '', annoInizio: '', annoFine: '', stato: '' })
  const [prezzoMedioHint, setPrezzoMedioHint] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [sc, u, e, ob, lu, te, pr] = await Promise.all([
        fetch(`/api/scenari/${id}`).then(r => r.json()),
        fetch(`/api/scenari/${id}/uscite`).then(r => r.json()),
        fetch(`/api/scenari/${id}/entrate`).then(r => r.json()),
        fetch(`/api/scenari/${id}/obiettivi`).then(r => r.json()),
        fetch('/api/luoghi').then(r => r.json()),
        fetch('/api/terreni').then(r => r.json()),
        fetch('/api/prodotti').then(r => r.json()),
      ])
      setScenario(sc)
      setUscite(Array.isArray(u) ? u : [])
      setEntrate(Array.isArray(e) ? e : [])
      setObiettivi(Array.isArray(ob) ? ob : [])
      setLuoghi(Array.isArray(lu) ? lu : [])
      setTerreni(Array.isArray(te) ? te : [])
      setProdotti(Array.isArray(pr) ? pr : [])
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }, [id])

  const fetchCruscotto = useCallback(async () => {
    try {
      const res = await fetch(`/api/scenari/${id}/cruscotto`)
      if (res.ok) setCruscotto(await res.json())
    } catch { /* silent */ }
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => { if (activeTab === 'cruscotto') fetchCruscotto() }, [activeTab, fetchCruscotto])

  // ────────── prezzo medio hint ──────────
  useEffect(() => {
    if (ef.tipo !== 'produzione' || !ef.prodottoId) { setPrezzoMedioHint(null); return }
    fetch(`/api/prodotti/${ef.prodottoId}/prezzo-medio`)
      .then(r => r.json())
      .then(d => {
        if (d.prezzoMedio && d.numVendite > 0) {
          setPrezzoMedioHint(`Media storica: ${fmt(d.prezzoMedio)} (${d.numVendite} vendite)`)
        } else {
          setPrezzoMedioHint('Nessuno storico vendite – inserisci prezzo manualmente')
        }
      })
      .catch(() => setPrezzoMedioHint(null))
  }, [ef.prodottoId, ef.tipo])

  if (loading) return <div className="p-6 text-gray-500">Caricamento...</div>
  if (!scenario) return <div className="p-6 text-red-500">Scenario non trovato</div>

  const annoList = anni(scenario.annoInizio, scenario.annoFine)

  // ────────── azioni scenario ──────────
  function openEditScenario() {
    setEditSf({ nome: scenario!.nome, descrizione: scenario!.descrizione ?? '', annoInizio: String(scenario!.annoInizio), annoFine: String(scenario!.annoFine), stato: scenario!.stato })
    setEditScenario(true)
  }

  async function handleEditScenario(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/scenari/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editSf) })
      if (!res.ok) throw new Error()
      setEditScenario(false)
      await fetchAll()
    } catch { setError('Errore aggiornamento') }
    finally { setSaving(false) }
  }

  // ────────── uscite ──────────
  async function handleAddUscita(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/scenari/${id}/uscite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(uf) })
      if (!res.ok) throw new Error()
      setAddUscita(false); setUf(emptyU)
      const u = await fetch(`/api/scenari/${id}/uscite`).then(r => r.json())
      setUscite(Array.isArray(u) ? u : [])
    } catch { setError('Errore salvataggio uscita') }
    finally { setSaving(false) }
  }

  async function deleteUscita(uid: number) {
    if (!confirm('Eliminare questa uscita?')) return
    await fetch(`/api/scenari/${id}/uscite/${uid}`, { method: 'DELETE' })
    setUscite(uscite.filter(u => u.id !== uid))
  }

  // ────────── entrate ──────────
  async function handleAddEntrata(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/scenari/${id}/entrate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ef) })
      if (!res.ok) throw new Error()
      setAddEntrata(false); setEf(emptyE); setPrezzoMedioHint(null)
      const en = await fetch(`/api/scenari/${id}/entrate`).then(r => r.json())
      setEntrate(Array.isArray(en) ? en : [])
    } catch { setError('Errore salvataggio entrata') }
    finally { setSaving(false) }
  }

  async function deleteEntrata(eid: number) {
    if (!confirm('Eliminare questa entrata?')) return
    await fetch(`/api/scenari/${id}/entrate/${eid}`, { method: 'DELETE' })
    setEntrate(entrate.filter(e => e.id !== eid))
  }

  // ────────── obiettivi ──────────
  async function handleAddObiettivo(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      nome: of.nome, tipo: of.tipo, priorita: of.priorita, note: of.note,
      percentuale: of.metodo === 'percentuale' ? of.percentuale : null,
      importoFisso: of.metodo === 'fisso' ? of.importoFisso : null,
    }
    try {
      const res = await fetch(`/api/scenari/${id}/obiettivi`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      setAddObiettivo(false); setOf(emptyO)
      const ob = await fetch(`/api/scenari/${id}/obiettivi`).then(r => r.json())
      setObiettivi(Array.isArray(ob) ? ob : [])
    } catch { setError('Errore salvataggio obiettivo') }
    finally { setSaving(false) }
  }

  async function handleEditObiettivo(e: React.FormEvent) {
    e.preventDefault()
    if (!editObiettivo) return
    setSaving(true)
    const payload = {
      nome: of.nome, tipo: of.tipo, priorita: of.priorita, note: of.note,
      percentuale: of.metodo === 'percentuale' ? of.percentuale : null,
      importoFisso: of.metodo === 'fisso' ? of.importoFisso : null,
    }
    try {
      const res = await fetch(`/api/scenari/${id}/obiettivi/${editObiettivo.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      setEditObiettivo(null); setOf(emptyO)
      const ob = await fetch(`/api/scenari/${id}/obiettivi`).then(r => r.json())
      setObiettivi(Array.isArray(ob) ? ob : [])
    } catch { setError('Errore aggiornamento obiettivo') }
    finally { setSaving(false) }
  }

  function openEditObiettivo(ob: Obiettivo) {
    setOf({
      nome: ob.nome, tipo: ob.tipo, priorita: String(ob.priorita), note: ob.note ?? '',
      metodo: ob.importoFisso !== null ? 'fisso' : 'percentuale',
      percentuale: ob.percentuale !== null ? String(ob.percentuale) : '',
      importoFisso: ob.importoFisso !== null ? String(ob.importoFisso) : '',
    })
    setEditObiettivo(ob)
  }

  async function deleteObiettivo(oid: number) {
    if (!confirm('Eliminare questo obiettivo?')) return
    await fetch(`/api/scenari/${id}/obiettivi/${oid}`, { method: 'DELETE' })
    setObiettivi(obiettivi.filter(o => o.id !== oid))
  }

  // ────────── computed ──────────
  const totUscite = uscite.reduce((s, u) => s + u.importo, 0)
  const totEntrate = entrate.reduce((s, e) => {
    if (e.tipo === 'produzione') return s + (e.quantitaStimata ?? 0) * (e.prezzoStimato ?? 0)
    return s + (e.importoFisso ?? 0)
  }, 0)
  const nettoStimato = totEntrate - totUscite

  function entrataImporto(e: Entrata) {
    if (e.tipo === 'produzione') return (e.quantitaStimata ?? 0) * (e.prezzoStimato ?? 0)
    return e.importoFisso ?? 0
  }

  // ────────── obiettivo form ──────────
  function ObiettivoForm({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) {
    const nettoRef = totEntrate - totUscite
    const importoCalcolato = of.metodo === 'percentuale' && of.percentuale
      ? nettoRef * parseFloat(of.percentuale) / 100
      : null

    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Nome obiettivo *</label>
          <Input value={of.nome} onChange={e => setOf({ ...of, nome: e.target.value })} placeholder="Es. Distribuzione utili soci" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Tipo</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={of.tipo} onChange={e => setOf({ ...of, tipo: e.target.value })}>
              {TIPI_OBIETTIVO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Priorità</label>
            <Input type="number" min={1} value={of.priorita} onChange={e => setOf({ ...of, priorita: e.target.value })} required />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Metodo di calcolo</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" checked={of.metodo === 'percentuale'} onChange={() => setOf({ ...of, metodo: 'percentuale' })} />
              % del netto previsto
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" checked={of.metodo === 'fisso'} onChange={() => setOf({ ...of, metodo: 'fisso' })} />
              Importo fisso
            </label>
          </div>
        </div>
        {of.metodo === 'percentuale' ? (
          <div>
            <label className="text-sm font-medium block mb-1">Percentuale %</label>
            <Input type="number" step="0.1" min={0} max={100} value={of.percentuale} onChange={e => setOf({ ...of, percentuale: e.target.value })} placeholder="Es. 30" required />
            {importoCalcolato !== null && <p className="text-xs text-gray-500 mt-1">= {fmt(importoCalcolato)} sul netto previsto attuale ({fmt(nettoRef)})</p>}
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium block mb-1">Importo fisso (€)</label>
            <Input type="number" step="0.01" min={0} value={of.importoFisso} onChange={e => setOf({ ...of, importoFisso: e.target.value })} placeholder="Es. 10000" required />
          </div>
        )}
        <div>
          <label className="text-sm font-medium block mb-1">Note</label>
          <Input value={of.note} onChange={e => setOf({ ...of, note: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => { setAddObiettivo(false); setEditObiettivo(null); setOf(emptyO) }}>Annulla</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : submitLabel}</Button>
        </div>
      </form>
    )
  }

  const tabs = [
    { key: 'uscite', label: `Uscite (${uscite.length})` },
    { key: 'entrate', label: `Entrate (${entrate.length})` },
    { key: 'obiettivi', label: `Obiettivi (${obiettivi.length})` },
    { key: 'cruscotto', label: 'Cruscotto' },
  ] as const

  return (
    <div>
      {/* ── header ── */}
      <div className="mb-6">
        <button onClick={() => router.push('/scenari')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3">
          <ArrowLeft className="w-4 h-4" />Scenari
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{scenario.nome}</h1>
              <Badge variant={STATO_VARIANT[scenario.stato] ?? 'default'}>{STATO_LABELS[scenario.stato] ?? scenario.stato}</Badge>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              Periodo: {scenario.annoInizio === scenario.annoFine ? scenario.annoInizio : `${scenario.annoInizio} – ${scenario.annoFine}`}
              {scenario.descrizione && ` · ${scenario.descrizione}`}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={openEditScenario}>
            <Pencil className="w-4 h-4 mr-1" />Modifica
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* ── summary cards ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Entrate stimate totali</p>
            <p className="text-xl font-bold text-green-600">{fmt(totEntrate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Uscite stimate totali</p>
            <p className="text-xl font-bold text-red-500">{fmt(totUscite)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Netto stimato</p>
            <p className={`text-xl font-bold ${nettoStimato >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{fmt(nettoStimato)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── tabs ── */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ──────────── TAB: USCITE ──────────── */}
      {activeTab === 'uscite' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">Costi e spese previste per anno e categoria</p>
            <Button onClick={() => { setUf({ ...emptyU, anno: String(scenario.annoInizio) }); setAddUscita(true) }}>
              <Plus className="w-4 h-4 mr-2" />Aggiungi Uscita
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <Thead>
                  <Tr><Th>Anno</Th><Th>Categoria</Th><Th>Descrizione</Th><Th>Luogo / Terreno</Th><Th className="text-right">Importo</Th><Th className="w-12"></Th></Tr>
                </Thead>
                <Tbody>
                  {uscite.map(u => (
                    <Tr key={u.id}>
                      <Td><Badge variant="default">{u.anno}</Badge></Td>
                      <Td className="text-sm text-gray-700">{u.categoria}</Td>
                      <Td className="text-sm">{u.descrizione}</Td>
                      <Td className="text-sm text-gray-500">{[u.luogo?.nome, u.terreno?.nome].filter(Boolean).join(' / ') || '—'}</Td>
                      <Td className="text-right font-medium text-red-600">{fmt(u.importo)}</Td>
                      <Td><Button variant="ghost" size="sm" onClick={() => deleteUscita(u.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button></Td>
                    </Tr>
                  ))}
                  {uscite.length === 0 && <Tr><Td colSpan={6} className="text-center text-gray-400 py-8">Nessuna uscita inserita</Td></Tr>}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
          {annoList.length > 1 && (
            <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(annoList.length, 4)}, 1fr)` }}>
              {annoList.map(a => {
                const tot = uscite.filter(u => u.anno === a).reduce((s, u) => s + u.importo, 0)
                return <Card key={a}><CardContent className="p-3"><p className="text-xs text-gray-500">{a}</p><p className="font-semibold text-red-600 text-sm">{fmt(tot)}</p></CardContent></Card>
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────── TAB: ENTRATE ──────────── */}
      {activeTab === 'entrate' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">Entrate stimate da produzione, servizi o altro</p>
            <Button onClick={() => { setEf({ ...emptyE, anno: String(scenario.annoInizio) }); setAddEntrata(true) }}>
              <Plus className="w-4 h-4 mr-2" />Aggiungi Entrata
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <Thead>
                  <Tr><Th>Anno</Th><Th>Tipo</Th><Th>Descrizione</Th><Th>Dettaglio</Th><Th className="text-right">Importo</Th><Th className="w-12"></Th></Tr>
                </Thead>
                <Tbody>
                  {entrate.map(e => (
                    <Tr key={e.id}>
                      <Td><Badge variant="default">{e.anno}</Badge></Td>
                      <Td><Badge variant="info">{e.tipo === 'produzione' ? 'Produzione' : e.tipo === 'servizio' ? 'Servizio' : 'Altro'}</Badge></Td>
                      <Td className="text-sm">{e.descrizione}</Td>
                      <Td className="text-xs text-gray-500">
                        {e.tipo === 'produzione'
                          ? `${e.prodotto?.nome ?? '?'} · ${e.quantitaStimata} ${e.prodotto?.unitaMisura ?? ''} × ${fmt(e.prezzoStimato ?? 0)}`
                          : fmt(e.importoFisso ?? 0)}
                        {e.terreno && ` · ${e.terreno.nome}`}
                      </Td>
                      <Td className="text-right font-medium text-green-600">{fmt(entrataImporto(e))}</Td>
                      <Td><Button variant="ghost" size="sm" onClick={() => deleteEntrata(e.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button></Td>
                    </Tr>
                  ))}
                  {entrate.length === 0 && <Tr><Td colSpan={6} className="text-center text-gray-400 py-8">Nessuna entrata inserita</Td></Tr>}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
          {annoList.length > 1 && (
            <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(annoList.length, 4)}, 1fr)` }}>
              {annoList.map(a => {
                const tot = entrate.filter(e => e.anno === a).reduce((s, e) => s + entrataImporto(e), 0)
                return <Card key={a}><CardContent className="p-3"><p className="text-xs text-gray-500">{a}</p><p className="font-semibold text-green-600 text-sm">{fmt(tot)}</p></CardContent></Card>
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────── TAB: OBIETTIVI ──────────── */}
      {activeTab === 'obiettivi' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">Obiettivi finanziari ordinati per priorità, calcolati sul netto previsto</p>
            <Button onClick={() => { setOf(emptyO); setAddObiettivo(true) }}>
              <Plus className="w-4 h-4 mr-2" />Aggiungi Obiettivo
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <Thead>
                  <Tr><Th className="w-12">Prio.</Th><Th>Nome</Th><Th>Tipo</Th><Th>Target</Th><Th className="text-right">Importo target</Th><Th className="w-20">Azioni</Th></Tr>
                </Thead>
                <Tbody>
                  {obiettivi.map(ob => {
                    const importoTarget = ob.importoFisso !== null
                      ? ob.importoFisso
                      : nettoStimato * (ob.percentuale ?? 0) / 100
                    return (
                      <Tr key={ob.id}>
                        <Td className="text-center font-mono text-gray-500">{ob.priorita}</Td>
                        <Td className="font-medium">{ob.nome}</Td>
                        <Td className="text-sm text-gray-600">{TIPI_OBIETTIVO.find(t => t.value === ob.tipo)?.label ?? ob.tipo}</Td>
                        <Td className="text-sm text-gray-500">
                          {ob.percentuale !== null ? `${ob.percentuale}% del netto` : 'Importo fisso'}
                        </Td>
                        <Td className="text-right font-medium text-indigo-600">{fmt(importoTarget)}</Td>
                        <Td>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditObiettivo(ob)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteObiettivo(ob.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                          </div>
                        </Td>
                      </Tr>
                    )
                  })}
                  {obiettivi.length === 0 && <Tr><Td colSpan={6} className="text-center text-gray-400 py-8">Nessun obiettivo definito</Td></Tr>}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
          {obiettivi.length > 0 && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Allocazione del netto previsto ({fmt(nettoStimato)})</p>
                {(() => {
                  let rimanente = nettoStimato
                  return obiettivi.map(ob => {
                    const target = ob.importoFisso !== null ? ob.importoFisso : nettoStimato * (ob.percentuale ?? 0) / 100
                    const coperto = Math.min(target, Math.max(0, rimanente))
                    rimanente -= coperto
                    const pct = target > 0 ? (coperto / target) * 100 : 100
                    return (
                      <div key={ob.id} className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-0">
                        <span className="text-xs text-gray-500 w-4">{ob.priorita}</span>
                        <span className="text-sm flex-1">{ob.nome}</span>
                        <span className="text-sm font-medium">{fmt(target)}</span>
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-amber-400' : 'bg-red-300'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    )
                  })
                })()}
                {(() => {
                  const allocato = obiettivi.reduce((s, ob) => s + (ob.importoFisso !== null ? ob.importoFisso : nettoStimato * (ob.percentuale ?? 0) / 100), 0)
                  const residuo = nettoStimato - allocato
                  return <p className="text-xs text-gray-500 mt-2">Residuo non allocato: <span className={residuo >= 0 ? 'text-green-600' : 'text-red-500'}>{fmt(residuo)}</span></p>
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ──────────── TAB: CRUSCOTTO ──────────── */}
      {activeTab === 'cruscotto' && (
        <div>
          {!cruscotto ? (
            <div className="text-center py-12 text-gray-400">
              <p>Caricamento dati cruscotto...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* totale cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Previsionale ({scenario.annoInizio}–{scenario.annoFine})</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm"><span className="text-gray-600">Entrate</span><span className="text-green-600 font-medium">{fmt(cruscotto.totale.entratePreviste)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-600">Uscite</span><span className="text-red-500 font-medium">{fmt(cruscotto.totale.uscitePreviste)}</span></div>
                      <div className="flex justify-between text-sm font-semibold border-t pt-1"><span>Netto</span><span className={cruscotto.totale.nettoPrevisto >= 0 ? 'text-indigo-600' : 'text-red-600'}>{fmt(cruscotto.totale.nettoPrevisto)}</span></div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Reale (movimenti cassa)</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm"><span className="text-gray-600">Entrate</span><span className="text-green-600 font-medium">{fmt(cruscotto.totale.entratoReale)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-600">Uscite</span><span className="text-red-500 font-medium">{fmt(cruscotto.totale.usciteReali)}</span></div>
                      <div className="flex justify-between text-sm font-semibold border-t pt-1"><span>Netto</span><span className={cruscotto.totale.nettoReale >= 0 ? 'text-indigo-600' : 'text-red-600'}>{fmt(cruscotto.totale.nettoReale)}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* per-anno table */}
              {cruscotto.anni.length > 0 && (
                <Card>
                  <CardContent className="p-0">
                    <div className="p-4 border-b"><p className="font-medium text-sm text-gray-700">Confronto per anno</p></div>
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>Anno</Th>
                          <Th className="text-right">Entrate prev.</Th>
                          <Th className="text-right">Uscite prev.</Th>
                          <Th className="text-right">Netto prev.</Th>
                          <Th className="text-right">Entrate reali</Th>
                          <Th className="text-right">Uscite reali</Th>
                          <Th className="text-right">Netto reale</Th>
                          <Th className="text-right">Scostamento</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {cruscotto.perAnno.map(a => (
                          <Tr key={a.anno}>
                            <Td><Badge variant="default">{a.anno}</Badge></Td>
                            <Td className="text-right text-green-600">{fmt(a.entratePreviste)}</Td>
                            <Td className="text-right text-red-500">{fmt(a.uscitePreviste)}</Td>
                            <Td className={`text-right font-medium ${a.nettoPrevisto >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{fmt(a.nettoPrevisto)}</Td>
                            <Td className="text-right text-green-600">{fmt(a.entratoReale)}</Td>
                            <Td className="text-right text-red-500">{fmt(a.usciteReali)}</Td>
                            <Td className={`text-right font-medium ${a.nettoReale >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{fmt(a.nettoReale)}</Td>
                            <Td className={`text-right font-semibold ${a.scostamentoNetto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {a.scostamentoNetto !== 0 ? (a.scostamentoNetto > 0 ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />) : null}
                              {sign(a.scostamentoNetto)}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* obiettivi status */}
              {cruscotto.obiettivi.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <p className="font-medium text-sm text-gray-700 mb-4">Stato obiettivi (sul netto reale)</p>
                    <div className="space-y-3">
                      {cruscotto.obiettivi.map(ob => (
                        <div key={ob.id} className="flex items-center gap-3">
                          {ob.stato === 'raggiunto'
                            ? <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                            : ob.stato === 'parziale'
                            ? <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                            : <Clock className="w-5 h-5 text-red-400 shrink-0" />}
                          <div className="flex-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{ob.nome}</span>
                              <span className="text-gray-500">{fmt(ob.importoCoperto)} / {fmt(ob.importoTarget)}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${ob.stato === 'raggiunto' ? 'bg-green-500' : ob.stato === 'parziale' ? 'bg-amber-400' : 'bg-red-300'}`}
                                style={{ width: `${Math.min(ob.percentualeCoperta, 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className={`text-sm font-medium ${ob.stato === 'raggiunto' ? 'text-green-600' : ob.stato === 'parziale' ? 'text-amber-600' : 'text-red-500'}`}>
                            {Math.round(ob.percentualeCoperta)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* ──────────── MODALS ──────────── */}

      {/* Edit scenario */}
      <Modal open={editScenario} onClose={() => setEditScenario(false)} title="Modifica Scenario">
        <form onSubmit={handleEditScenario} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Nome *</label>
            <Input value={editSf.nome} onChange={e => setEditSf({ ...editSf, nome: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Descrizione</label>
            <Input value={editSf.descrizione} onChange={e => setEditSf({ ...editSf, descrizione: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Anno inizio</label><Input type="number" value={editSf.annoInizio} onChange={e => setEditSf({ ...editSf, annoInizio: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Anno fine</label><Input type="number" value={editSf.annoFine} onChange={e => setEditSf({ ...editSf, annoFine: e.target.value })} /></div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Stato</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editSf.stato} onChange={e => setEditSf({ ...editSf, stato: e.target.value })}>
              <option value="bozza">Bozza</option><option value="attivo">Attivo</option><option value="archiviato">Archiviato</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditScenario(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Aggiorna'}</Button>
          </div>
        </form>
      </Modal>

      {/* Add uscita */}
      <Modal open={addUscita} onClose={() => { setAddUscita(false); setUf(emptyU) }} title="Aggiungi Uscita">
        <form onSubmit={handleAddUscita} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Anno *</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={uf.anno} onChange={e => setUf({ ...uf, anno: e.target.value })} required>
                <option value="">Seleziona...</option>
                {annoList.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Categoria *</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={uf.categoria} onChange={e => setUf({ ...uf, categoria: e.target.value })}>
                {CATEGORIE_USCITA.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Descrizione *</label>
            <Input value={uf.descrizione} onChange={e => setUf({ ...uf, descrizione: e.target.value })} placeholder="Es. Potatura oliveto Santa Venerina" required />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Importo (€) *</label>
            <Input type="number" step="0.01" min={0} value={uf.importo} onChange={e => setUf({ ...uf, importo: e.target.value })} placeholder="5000" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Luogo</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={uf.luogoId} onChange={e => setUf({ ...uf, luogoId: e.target.value, terrenoId: '' })}>
                <option value="">Tutti / nessuno</option>
                {luoghi.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Terreno / Stacco</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={uf.terrenoId} onChange={e => setUf({ ...uf, terrenoId: e.target.value })}>
                <option value="">Tutti / nessuno</option>
                {terreni
                  .filter(t => !uf.luogoId || String(t.luogoId) === uf.luogoId)
                  .map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Note</label>
            <Input value={uf.note} onChange={e => setUf({ ...uf, note: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setAddUscita(false); setUf(emptyU) }}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Aggiungi Uscita'}</Button>
          </div>
        </form>
      </Modal>

      {/* Add entrata */}
      <Modal open={addEntrata} onClose={() => { setAddEntrata(false); setEf(emptyE); setPrezzoMedioHint(null) }} title="Aggiungi Entrata">
        <form onSubmit={handleAddEntrata} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Anno *</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={ef.anno} onChange={e => setEf({ ...ef, anno: e.target.value })} required>
                <option value="">Seleziona...</option>
                {annoList.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Tipo *</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={ef.tipo} onChange={e => setEf({ ...ef, tipo: e.target.value, prodottoId: '' })}>
                {TIPI_ENTRATA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Descrizione *</label>
            <Input value={ef.descrizione} onChange={e => setEf({ ...ef, descrizione: e.target.value })} placeholder="Es. Vendita olio Santa Venerina 2025" required />
          </div>

          {ef.tipo === 'produzione' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Prodotto *</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={ef.prodottoId} onChange={e => setEf({ ...ef, prodottoId: e.target.value })} required>
                    <option value="">Seleziona prodotto...</option>
                    {prodotti.map(p => <option key={p.id} value={p.id}>{p.codice} – {p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Terreno / Stacco</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={ef.terrenoId} onChange={e => setEf({ ...ef, terrenoId: e.target.value })}>
                    <option value="">Tutti / nessuno</option>
                    {terreni.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Quantità stimata *</label>
                  <Input type="number" step="0.01" min={0} value={ef.quantitaStimata} onChange={e => setEf({ ...ef, quantitaStimata: e.target.value })}
                    placeholder={prodotti.find(p => String(p.id) === ef.prodottoId)?.unitaMisura ?? 'qty'} required />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Prezzo stimato (€) *</label>
                  <Input type="number" step="0.01" min={0} value={ef.prezzoStimato} onChange={e => setEf({ ...ef, prezzoStimato: e.target.value })} placeholder="€/unità" required />
                  {prezzoMedioHint && <p className="text-xs text-gray-500 mt-1">{prezzoMedioHint}</p>}
                </div>
              </div>
              {ef.quantitaStimata && ef.prezzoStimato && (
                <div className="bg-green-50 rounded-lg p-3 text-sm">
                  <span className="text-gray-600">Importo stimato: </span>
                  <span className="font-semibold text-green-700">{fmt(parseFloat(ef.quantitaStimata) * parseFloat(ef.prezzoStimato))}</span>
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="text-sm font-medium block mb-1">Importo (€) *</label>
              <Input type="number" step="0.01" min={0} value={ef.importoFisso} onChange={e => setEf({ ...ef, importoFisso: e.target.value })} placeholder="Es. 15000" required />
            </div>
          )}

          <div>
            <label className="text-sm font-medium block mb-1">Note</label>
            <Input value={ef.note} onChange={e => setEf({ ...ef, note: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setAddEntrata(false); setEf(emptyE); setPrezzoMedioHint(null) }}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Aggiungi Entrata'}</Button>
          </div>
        </form>
      </Modal>

      {/* Add obiettivo */}
      <Modal open={addObiettivo} onClose={() => { setAddObiettivo(false); setOf(emptyO) }} title="Aggiungi Obiettivo">
        <ObiettivoForm onSubmit={handleAddObiettivo} submitLabel="Aggiungi Obiettivo" />
      </Modal>

      {/* Edit obiettivo */}
      <Modal open={!!editObiettivo} onClose={() => { setEditObiettivo(null); setOf(emptyO) }} title="Modifica Obiettivo">
        <ObiettivoForm onSubmit={handleEditObiettivo} submitLabel="Aggiorna Obiettivo" />
      </Modal>
    </div>
  )
}
