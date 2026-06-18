'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'
import { ArrowLeft, Plus, Trash2, Pencil, CheckCircle, AlertCircle, Clock, Repeat2, Target, Info, TrendingUp, TrendingDown } from 'lucide-react'

// ────────── types ──────────
type Scenario = { id: number; nome: string; descrizione: string | null; annoInizio: number; annoFine: number; stato: string }
type Luogo = { id: number; nome: string }
type Terreno = { id: number; nome: string; luogoId: number | null }
type Prodotto = { id: number; nome: string; codice: string; unitaMisura: string }
type Uscita = { id: number; anno: number | null; tipologia: string; categoria: string; descrizione: string; importo: number; note: string | null; luogo: Luogo | null; terreno: Terreno | null }
type Entrata = { id: number; anno: number | null; naturaTipo: string; tipo: string; descrizione: string; quantitaStimata: number | null; prezzoStimato: number | null; importoFisso: number | null; note: string | null; prodotto: Prodotto | null; luogo: Luogo | null; terreno: Terreno | null }
type Obiettivo = { id: number; nome: string; categoria: string; percentualePriorita: number; importoTarget: number; note: string | null }
type RealeAnno = { anno: number; entratoReale: number; usciteReali: number; margineReale: number; numMovimenti: number }
type CruscottoAnno = { anno: number; entrateStimate: number; entrateRicorrentiScenario: number; entrateRicorrentiCassa: number; totEntrate: number; usciteCorrenti: number; usciteRicorrentiScenario: number; usciteRicorrentiCassa: number; totUscite: number; margine: number; investitoObiettivi: number; margineLibero: number }
type CruscottoObiettivo = { id: number; nome: string; categoria: string; percentualePriorita: number; importoTarget: number; totalAllocato: number; percentualeCoperta: number; annoCompletamento: number | null; stato: string; allocazionePerAnno: { anno: number; quota: number; allocato: number }[]; note: string | null }
type Cruscotto = { anni: number[]; perAnno: CruscottoAnno[]; realePerAnno: RealeAnno[]; totale: { totEntrate: number; totUscite: number; margine: number; investitoObiettivi: number; margineLibero: number }; totaleReale: { entratoReale: number; usciteReali: number; margineReale: number }; obiettivi: CruscottoObiettivo[]; movimentiRicorrentiCassa: { entrate: number; uscite: number; count: number } }

// ────────── costanti UI ──────────
const CATEGORIE_USCITA = [
  'Lavori agricoli', 'Manodopera', 'Materiali e forniture', 'Attrezzature e macchinari',
  'Mezzi e veicoli', 'Servizi esterni', 'Utenze e costi fissi', 'Manutenzione', 'Imposte e tasse', 'Altro',
]

const CATEGORIE_OBIETTIVO = [
  'Attrezzature', 'Macchinari', 'Mezzi e veicoli', 'Strutture e fabbricati',
  'Terreni', 'Impianti', 'Tecnologia', 'Altro',
]

const TIPI_ENTRATA = [
  { value: 'produzione', label: 'Produzione (quantità × prezzo)' },
  { value: 'servizio', label: 'Servizio / prestazione (importo fisso)' },
  { value: 'altro', label: 'Altro (importo fisso)' },
]

const STATO_VARIANT: Record<string, 'default' | 'success' | 'info'> = { bozza: 'default', attivo: 'success', archiviato: 'info' }
const STATO_LABELS: Record<string, string> = { bozza: 'Bozza', attivo: 'Attivo', archiviato: 'Archiviato' }

const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
const sign = (n: number) => (n > 0 ? '+' : '') + fmt(n)

function annoList(from: number, to: number) {
  const r: number[] = []; for (let a = from; a <= to; a++) r.push(a); return r
}

// ────────── ObiettivoForm estratto FUORI dal componente principale ──────────
// Deve stare fuori da ScenarioDetailPage: altrimenti React lo ricrea ad ogni render
// → smonta il DOM → perde focus ad ogni lettera.
type OForm = { nome: string; categoria: string; percentualePriorita: string; importoTarget: string; note: string }

function ObiettivoForm({
  of, setOf, saving, obiettiviEsistenti, editObiettivoId, onSubmit, submitLabel, onCancel,
}: {
  of: OForm
  setOf: (v: OForm) => void
  saving: boolean
  obiettiviEsistenti: Obiettivo[]
  editObiettivoId: number | null
  onSubmit: (e: React.FormEvent) => void
  submitLabel: string
  onCancel: () => void
}) {
  const totalSenzaCorrente = obiettiviEsistenti
    .filter(o => o.id !== editObiettivoId)
    .reduce((s, o) => s + o.percentualePriorita, 0)
  const disponibile = Math.max(0, 100 - totalSenzaCorrente)
  const totalConCorrente = totalSenzaCorrente + (parseFloat(of.percentualePriorita) || 0)

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium block mb-1">Nome obiettivo *</label>
        <Input value={of.nome} onChange={e => setOf({ ...of, nome: e.target.value })} placeholder="Es. Acquisto trattore" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium block mb-1">Categoria</label>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={of.categoria} onChange={e => setOf({ ...of, categoria: e.target.value })}>
            {CATEGORIE_OBIETTIVO.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Importo target (€) *</label>
          <Input type="number" step="0.01" min={0} value={of.importoTarget} onChange={e => setOf({ ...of, importoTarget: e.target.value })} placeholder="Es. 50000" required />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">
          Priorità % del margine operativo annuo *
          <span className="text-[10px] font-normal text-gray-400 ml-2">
            Già assegnato: {totalSenzaCorrente.toFixed(0)}% — disponibile: {disponibile.toFixed(0)}%
          </span>
        </label>
        <div className="flex items-center gap-2">
          <Input type="number" step="1" min={0} max={100} value={of.percentualePriorita} onChange={e => setOf({ ...of, percentualePriorita: e.target.value })} placeholder="Es. 30" required className="flex-1" />
          <span className="text-sm text-gray-500 font-medium">%</span>
        </div>
        {totalConCorrente > 100 && (
          <p className="text-xs text-amber-600 mt-1">
            Totale {totalConCorrente.toFixed(0)}% &gt; 100%: gli obiettivi attingono dallo stesso margine.
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Ogni anno questo obiettivo riceve il {of.percentualePriorita || '?'}% del margine disponibile finché non è completato.
        </p>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Note</label>
        <Input value={of.note} onChange={e => setOf({ ...of, note: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Annulla</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : submitLabel}</Button>
      </div>
    </form>
  )
}

// ────────── componente principale ──────────
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

  const [editScenario, setEditScenario] = useState(false)
  const [addUscita, setAddUscita] = useState(false)
  const [addEntrata, setAddEntrata] = useState(false)
  const [addObiettivo, setAddObiettivo] = useState(false)
  const [editObiettivoModal, setEditObiettivoModal] = useState<Obiettivo | null>(null)

  const emptyU = { tipologia: 'corrente' as 'corrente' | 'ricorrente', anno: '', categoria: CATEGORIE_USCITA[0], descrizione: '', importo: '', luogoId: '', terrenoId: '', note: '' }
  const emptyE = { naturaTipo: 'stimata' as 'stimata' | 'ricorrente', anno: '', tipo: 'produzione', descrizione: '', prodottoId: '', luogoId: '', terrenoId: '', quantitaStimata: '', prezzoStimato: '', importoFisso: '', note: '' }
  const emptyO: OForm = { nome: '', categoria: CATEGORIE_OBIETTIVO[0], percentualePriorita: '', importoTarget: '', note: '' }

  const [uf, setUf] = useState(emptyU)
  const [ef, setEf] = useState(emptyE)
  const [of, setOf] = useState<OForm>(emptyO)
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

  useEffect(() => {
    if (ef.tipo !== 'produzione' || !ef.prodottoId) { setPrezzoMedioHint(null); return }
    fetch(`/api/prodotti/${ef.prodottoId}/prezzo-medio`)
      .then(r => r.json())
      .then(d => {
        if (d.prezzoMedio && d.numVendite > 0) setPrezzoMedioHint(`Media storica: ${fmt(d.prezzoMedio)} (${d.numVendite} vendite)`)
        else setPrezzoMedioHint('Nessuno storico – inserisci prezzo manualmente')
      })
      .catch(() => setPrezzoMedioHint(null))
  }, [ef.prodottoId, ef.tipo])

  if (loading) return <div className="p-6 text-gray-500">Caricamento...</div>
  if (!scenario) return <div className="p-6 text-red-500">Scenario non trovato</div>

  const anni = annoList(scenario.annoInizio, scenario.annoFine)
  const annoCorrente = new Date().getFullYear()

  // ────────── handlers scenario ──────────
  function openEditScenario() {
    setEditSf({ nome: scenario!.nome, descrizione: scenario!.descrizione ?? '', annoInizio: String(scenario!.annoInizio), annoFine: String(scenario!.annoFine), stato: scenario!.stato })
    setEditScenario(true)
  }
  async function handleEditScenario(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await fetch(`/api/scenari/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editSf) })
      setEditScenario(false); await fetchAll()
    } catch { setError('Errore aggiornamento') }
    finally { setSaving(false) }
  }

  // ────────── handlers uscite ──────────
  async function handleAddUscita(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/scenari/${id}/uscite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(uf) })
      if (!res.ok) throw new Error()
      setAddUscita(false); setUf(emptyU)
      setUscite(await fetch(`/api/scenari/${id}/uscite`).then(r => r.json()).then(d => Array.isArray(d) ? d : []))
    } catch { setError('Errore salvataggio uscita') }
    finally { setSaving(false) }
  }
  async function deleteUscita(uid: number) {
    if (!confirm('Eliminare questa uscita?')) return
    await fetch(`/api/scenari/${id}/uscite/${uid}`, { method: 'DELETE' })
    setUscite(uscite.filter(u => u.id !== uid))
  }

  // ────────── handlers entrate ──────────
  async function handleAddEntrata(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/scenari/${id}/entrate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ef) })
      if (!res.ok) throw new Error()
      setAddEntrata(false); setEf(emptyE); setPrezzoMedioHint(null)
      setEntrate(await fetch(`/api/scenari/${id}/entrate`).then(r => r.json()).then(d => Array.isArray(d) ? d : []))
    } catch { setError('Errore salvataggio entrata') }
    finally { setSaving(false) }
  }
  async function deleteEntrata(eid: number) {
    if (!confirm('Eliminare questa entrata?')) return
    await fetch(`/api/scenari/${id}/entrate/${eid}`, { method: 'DELETE' })
    setEntrate(entrate.filter(e => e.id !== eid))
  }

  // ────────── handlers obiettivi ──────────
  async function handleAddObiettivo(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/scenari/${id}/obiettivi`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: of.nome, categoria: of.categoria, percentualePriorita: of.percentualePriorita, importoTarget: of.importoTarget, note: of.note }) })
      if (!res.ok) throw new Error()
      setAddObiettivo(false); setOf(emptyO)
      setObiettivi(await fetch(`/api/scenari/${id}/obiettivi`).then(r => r.json()).then(d => Array.isArray(d) ? d : []))
    } catch { setError('Errore salvataggio obiettivo') }
    finally { setSaving(false) }
  }
  async function handleEditObiettivo(e: React.FormEvent) {
    e.preventDefault()
    if (!editObiettivoModal) return
    setSaving(true)
    try {
      const res = await fetch(`/api/scenari/${id}/obiettivi/${editObiettivoModal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: of.nome, categoria: of.categoria, percentualePriorita: of.percentualePriorita, importoTarget: of.importoTarget, note: of.note }) })
      if (!res.ok) throw new Error()
      setEditObiettivoModal(null); setOf(emptyO)
      setObiettivi(await fetch(`/api/scenari/${id}/obiettivi`).then(r => r.json()).then(d => Array.isArray(d) ? d : []))
    } catch { setError('Errore aggiornamento obiettivo') }
    finally { setSaving(false) }
  }
  function openEditObiettivo(ob: Obiettivo) {
    setOf({ nome: ob.nome, categoria: ob.categoria, percentualePriorita: String(ob.percentualePriorita), importoTarget: String(ob.importoTarget), note: ob.note ?? '' })
    setEditObiettivoModal(ob)
  }
  async function deleteObiettivo(oid: number) {
    if (!confirm('Eliminare questo obiettivo?')) return
    await fetch(`/api/scenari/${id}/obiettivi/${oid}`, { method: 'DELETE' })
    setObiettivi(obiettivi.filter(o => o.id !== oid))
  }

  // ────────── helpers ──────────
  function entrataImporto(e: Entrata) {
    if (e.tipo === 'produzione') return (e.quantitaStimata ?? 0) * (e.prezzoStimato ?? 0)
    return e.importoFisso ?? 0
  }
  const usciteCorrenti = uscite.filter(u => u.tipologia === 'corrente')
  const usciteRicorrenti = uscite.filter(u => u.tipologia === 'ricorrente')
  const entrateStimate = entrate.filter(e => e.naturaTipo === 'stimata')
  const entrateRicorrenti = entrate.filter(e => e.naturaTipo === 'ricorrente')
  const tipoEntrataLabel = (tipo: string) => TIPI_ENTRATA.find(t => t.value === tipo)?.label.split(' (')[0] ?? tipo

  const tabs = [
    { key: 'uscite', label: `Uscite (${uscite.length})` },
    { key: 'entrate', label: `Entrate (${entrate.length})` },
    { key: 'obiettivi', label: `Obiettivi (${obiettivi.length})` },
    { key: 'cruscotto', label: 'Cruscotto' },
  ] as const

  return (
    <div>
      {/* header */}
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

      {/* tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-0">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ──────────── TAB: USCITE ──────────── */}
      {activeTab === 'uscite' && (
        <div className="space-y-6">
          {/* sezione spese correnti */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Spese correnti</h3>
                <p className="text-xs text-gray-400 mt-0.5">Specifiche per un anno del piano (es. lavori straordinari 2025)</p>
              </div>
              <Button size="sm" onClick={() => { setUf({ ...emptyU, tipologia: 'corrente', anno: String(scenario.annoInizio) }); setAddUscita(true) }}>
                <Plus className="w-3.5 h-3.5 mr-1" />Aggiungi
              </Button>
            </div>
            <Card><CardContent className="p-0">
              <Table>
                <Thead><Tr><Th>Anno</Th><Th>Categoria</Th><Th>Descrizione</Th><Th>Luogo / Terreno</Th><Th className="text-right">Importo</Th><Th className="w-10"></Th></Tr></Thead>
                <Tbody>
                  {usciteCorrenti.map(u => (
                    <Tr key={u.id}>
                      <Td><Badge variant="default">{u.anno ?? '—'}</Badge></Td>
                      <Td><Badge variant="warning" className="text-xs">{u.categoria}</Badge></Td>
                      <Td className="text-sm">{u.descrizione}</Td>
                      <Td className="text-sm text-gray-500">{[u.luogo?.nome, u.terreno?.nome].filter(Boolean).join(' / ') || '—'}</Td>
                      <Td className="text-right font-medium text-red-600">{fmt(u.importo)}</Td>
                      <Td><Button variant="ghost" size="sm" onClick={() => deleteUscita(u.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button></Td>
                    </Tr>
                  ))}
                  {usciteCorrenti.length === 0 && <Tr><Td colSpan={6} className="text-center text-gray-400 py-6 text-sm">Nessuna spesa corrente</Td></Tr>}
                </Tbody>
              </Table>
            </CardContent></Card>
            {anni.length > 1 && usciteCorrenti.length > 0 && (
              <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(anni.length, 6)}, 1fr)` }}>
                {anni.map(a => {
                  const tot = usciteCorrenti.filter(u => u.anno === a).reduce((s, u) => s + u.importo, 0)
                  return <div key={a} className="bg-red-50 border border-red-100 rounded-lg p-2.5 text-center"><p className="text-[10px] text-gray-500">{a}</p><p className="font-semibold text-red-600 text-xs">{fmt(tot)}</p></div>
                })}
              </div>
            )}
          </div>

          {/* sezione spese ricorrenti */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5"><Repeat2 className="w-3.5 h-3.5 text-indigo-500" />Spese ricorrenti</h3>
                <p className="text-xs text-gray-400 mt-0.5">Si ripetono ogni anno del piano (es. manodopera fissa, assicurazioni)</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => { setUf({ ...emptyU, tipologia: 'ricorrente', anno: '' }); setAddUscita(true) }}>
                <Plus className="w-3.5 h-3.5 mr-1" />Aggiungi
              </Button>
            </div>
            <Card><CardContent className="p-0">
              <Table>
                <Thead><Tr><Th>Categoria</Th><Th>Descrizione</Th><Th>Luogo / Terreno</Th><Th className="text-right">Importo/anno</Th><Th className="text-right">Tot. periodo</Th><Th className="w-10"></Th></Tr></Thead>
                <Tbody>
                  {usciteRicorrenti.map(u => (
                    <Tr key={u.id}>
                      <Td><Badge variant="warning" className="text-xs">{u.categoria}</Badge></Td>
                      <Td className="text-sm">{u.descrizione}</Td>
                      <Td className="text-sm text-gray-500">{[u.luogo?.nome, u.terreno?.nome].filter(Boolean).join(' / ') || '—'}</Td>
                      <Td className="text-right font-medium text-red-600">{fmt(u.importo)}</Td>
                      <Td className="text-right text-xs text-gray-400">{fmt(u.importo * anni.length)}</Td>
                      <Td><Button variant="ghost" size="sm" onClick={() => deleteUscita(u.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button></Td>
                    </Tr>
                  ))}
                  {usciteRicorrenti.length === 0 && <Tr><Td colSpan={6} className="text-center text-gray-400 py-6 text-sm">Nessuna spesa ricorrente nello scenario</Td></Tr>}
                </Tbody>
              </Table>
            </CardContent></Card>
            {usciteRicorrenti.length > 0 && (
              <p className="text-xs text-gray-400 mt-1.5 text-right">
                Totale ricorrenti per {anni.length} anni: <strong className="text-red-500">{fmt(usciteRicorrenti.reduce((s, u) => s + u.importo * anni.length, 0))}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ──────────── TAB: ENTRATE ──────────── */}
      {activeTab === 'entrate' && (
        <div className="space-y-6">
          {/* entrate stimate */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Entrate stimate</h3>
                <p className="text-xs text-gray-400 mt-0.5">Previsione specifica per anno (produzioni, servizi, altri ricavi)</p>
              </div>
              <Button size="sm" onClick={() => { setEf({ ...emptyE, naturaTipo: 'stimata', anno: String(scenario.annoInizio) }); setAddEntrata(true) }}>
                <Plus className="w-3.5 h-3.5 mr-1" />Aggiungi
              </Button>
            </div>
            <Card><CardContent className="p-0">
              <Table>
                <Thead><Tr><Th>Anno</Th><Th>Tipo</Th><Th>Descrizione</Th><Th>Dettaglio</Th><Th className="text-right">Importo</Th><Th className="w-10"></Th></Tr></Thead>
                <Tbody>
                  {entrateStimate.map(e => (
                    <Tr key={e.id}>
                      <Td><Badge variant="default">{e.anno ?? '—'}</Badge></Td>
                      <Td><Badge variant="info" className="text-xs">{tipoEntrataLabel(e.tipo)}</Badge></Td>
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
                  {entrateStimate.length === 0 && <Tr><Td colSpan={6} className="text-center text-gray-400 py-6 text-sm">Nessuna entrata stimata</Td></Tr>}
                </Tbody>
              </Table>
            </CardContent></Card>
            {anni.length > 1 && entrateStimate.length > 0 && (
              <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(anni.length, 6)}, 1fr)` }}>
                {anni.map(a => {
                  const tot = entrateStimate.filter(e => e.anno === a).reduce((s, e) => s + entrataImporto(e), 0)
                  return <div key={a} className="bg-green-50 border border-green-100 rounded-lg p-2.5 text-center"><p className="text-[10px] text-gray-500">{a}</p><p className="font-semibold text-green-600 text-xs">{fmt(tot)}</p></div>
                })}
              </div>
            )}
          </div>

          {/* entrate ricorrenti scenario */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5"><Repeat2 className="w-3.5 h-3.5 text-indigo-500" />Entrate ricorrenti nello scenario</h3>
                <p className="text-xs text-gray-400 mt-0.5">Si ripetono ogni anno del piano (aggiungi solo quelle non già in contabilità come ricorrenti)</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => { setEf({ ...emptyE, naturaTipo: 'ricorrente', anno: '' }); setAddEntrata(true) }}>
                <Plus className="w-3.5 h-3.5 mr-1" />Aggiungi
              </Button>
            </div>
            {entrateRicorrenti.length === 0
              ? <div className="text-sm text-gray-400 bg-gray-50 rounded-lg p-4 text-center">Nessuna entrata ricorrente aggiunta allo scenario.</div>
              : <Card><CardContent className="p-0">
                <Table>
                  <Thead><Tr><Th>Tipo</Th><Th>Descrizione</Th><Th>Dettaglio</Th><Th className="text-right">Importo/anno</Th><Th className="text-right">Tot. periodo</Th><Th className="w-10"></Th></Tr></Thead>
                  <Tbody>
                    {entrateRicorrenti.map(e => (
                      <Tr key={e.id}>
                        <Td><Badge variant="info" className="text-xs">{tipoEntrataLabel(e.tipo)}</Badge></Td>
                        <Td className="text-sm">{e.descrizione}</Td>
                        <Td className="text-xs text-gray-500">
                          {e.tipo === 'produzione'
                            ? `${e.prodotto?.nome ?? '?'} · ${e.quantitaStimata} ${e.prodotto?.unitaMisura ?? ''} × ${fmt(e.prezzoStimato ?? 0)}`
                            : fmt(e.importoFisso ?? 0)}
                        </Td>
                        <Td className="text-right font-medium text-green-600">{fmt(entrataImporto(e))}</Td>
                        <Td className="text-right text-xs text-gray-400">{fmt(entrataImporto(e) * anni.length)}</Td>
                        <Td><Button variant="ghost" size="sm" onClick={() => deleteEntrata(e.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button></Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </CardContent></Card>
            }
            <div className="mt-2 flex items-start gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              I movimenti cassa con flag <strong>Ricorrente</strong> vengono inclusi automaticamente nel cruscotto ogni anno. Aggiungi qui solo entrate ricorrenti non ancora presenti in contabilità.
            </div>
          </div>
        </div>
      )}

      {/* ──────────── TAB: OBIETTIVI ──────────── */}
      {activeTab === 'obiettivi' && (
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600 font-medium">Obiettivi di investimento</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Spese straordinarie da raggiungere nel tempo (es. acquisto trattore €50k). Il sistema distribuisce il margine operativo proporzionalmente alla priorità %.
              </p>
            </div>
            <Button onClick={() => { setOf(emptyO); setAddObiettivo(true) }}><Plus className="w-4 h-4 mr-2" />Aggiungi Obiettivo</Button>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <Thead>
                <Tr>
                  <Th>Nome</Th>
                  <Th>Categoria</Th>
                  <Th className="text-right">Importo target</Th>
                  <Th className="text-right">Priorità %</Th>
                  <Th>Note</Th>
                  <Th className="w-20">Azioni</Th>
                </Tr>
              </Thead>
              <Tbody>
                {obiettivi.map(ob => (
                  <Tr key={ob.id}>
                    <Td className="font-medium">{ob.nome}</Td>
                    <Td><Badge variant="default" className="text-xs">{ob.categoria}</Badge></Td>
                    <Td className="text-right font-medium text-indigo-600">{fmt(ob.importoTarget)}</Td>
                    <Td className="text-right">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 bg-amber-50 rounded px-2 py-0.5">
                        <Target className="w-3 h-3" />{ob.percentualePriorita}%
                      </span>
                    </Td>
                    <Td className="text-xs text-gray-400 max-w-[180px] truncate">{ob.note || '—'}</Td>
                    <Td>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditObiettivo(ob)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteObiettivo(ob.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
                {obiettivi.length === 0 && <Tr><Td colSpan={6} className="text-center text-gray-400 py-8 text-sm">Nessun obiettivo di investimento definito</Td></Tr>}
              </Tbody>
            </Table>
          </CardContent></Card>
          {obiettivi.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 shrink-0" />
                Priorità totale assegnata: <strong>{obiettivi.reduce((s, o) => s + o.percentualePriorita, 0)}%</strong> del margine operativo annuo.
                {obiettivi.reduce((s, o) => s + o.percentualePriorita, 0) > 100 && <span className="text-orange-600"> (supera 100% — gli obiettivi si sovrappongono)</span>}
              </span>
              <button className="underline font-medium ml-3 whitespace-nowrap" onClick={() => setActiveTab('cruscotto')}>Vedi cruscotto →</button>
            </div>
          )}
        </div>
      )}

      {/* ──────────── TAB: CRUSCOTTO ──────────── */}
      {activeTab === 'cruscotto' && (
        <div className="space-y-6">
          {!cruscotto ? (
            <div className="text-center py-12 text-gray-400">Caricamento cruscotto...</div>
          ) : (
            <>
              {/* Avviso ricorrenti cassa */}
              {cruscotto.movimentiRicorrentiCassa.count > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
                  <Repeat2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    <strong>{cruscotto.movimentiRicorrentiCassa.count}</strong> movimenti cassa ricorrenti inclusi ogni anno nel piano:
                    entrate <strong>{fmt(cruscotto.movimentiRicorrentiCassa.entrate)}</strong>,
                    uscite <strong>{fmt(cruscotto.movimentiRicorrentiCassa.uscite)}</strong>.
                  </span>
                </div>
              )}

              {/* Riepilogo periodo: piano vs reale */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Piano stimato */}
                <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-5 bg-indigo-500 rounded-full" />
                    <span className="text-sm font-semibold text-indigo-900">
                      Piano stimato {scenario.annoInizio === scenario.annoFine ? scenario.annoInizio : `${scenario.annoInizio}–${scenario.annoFine}`}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entrate previste</span>
                      <span className="font-semibold text-green-700">{fmt(cruscotto.totale.totEntrate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Spese previste</span>
                      <span className="font-semibold text-red-600">{fmt(cruscotto.totale.totUscite)}</span>
                    </div>
                    <div className="flex justify-between border-t border-indigo-200 pt-2 mt-1">
                      <span className="font-semibold text-gray-700">Margine operativo</span>
                      <span className={`font-bold ${cruscotto.totale.margine >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>{fmt(cruscotto.totale.margine)}</span>
                    </div>
                    {cruscotto.obiettivi.length > 0 && (
                      <>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Di cui destinato a obiettivi</span>
                          <span className="text-amber-700 font-medium">{fmt(cruscotto.totale.investitoObiettivi)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Margine libero</span>
                          <span className={`font-medium ${cruscotto.totale.margineLibero >= 0 ? 'text-gray-700' : 'text-red-600'}`}>{fmt(cruscotto.totale.margineLibero)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Da movimenti cassa */}
                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
                    <span className="text-sm font-semibold text-emerald-900">Movimenti cassa registrati</span>
                    <span className="text-xs text-emerald-600 bg-emerald-100 rounded px-1.5 py-0.5">pagati</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entrate registrate</span>
                      <span className="font-semibold text-green-700">{fmt(cruscotto.totaleReale.entratoReale)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Spese registrate</span>
                      <span className="font-semibold text-red-600">{fmt(cruscotto.totaleReale.usciteReali)}</span>
                    </div>
                    <div className="flex justify-between border-t border-emerald-200 pt-2 mt-1">
                      <span className="font-semibold text-gray-700">Margine reale</span>
                      <span className={`font-bold ${cruscotto.totaleReale.margineReale >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(cruscotto.totaleReale.margineReale)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-emerald-100 pt-1.5">
                      <span className="text-gray-500">Scostamento vs piano</span>
                      <span className={`font-semibold flex items-center gap-0.5 ${cruscotto.totaleReale.margineReale >= cruscotto.totale.margine ? 'text-green-600' : 'text-red-500'}`}>
                        {cruscotto.totaleReale.margineReale >= cruscotto.totale.margine
                          ? <TrendingUp className="w-3 h-3" />
                          : <TrendingDown className="w-3 h-3" />}
                        {sign(cruscotto.totaleReale.margineReale - cruscotto.totale.margine)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Definizione margine operativo */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Margine operativo</strong> = Entrate totali previste − Spese operative previste.
                  Rappresenta le risorse disponibili per finanziare gli obiettivi di investimento (es. acquisto macchinari, strutture).
                  {' '}<span className="text-gray-400">I movimenti ricorrenti da cassa sono inclusi in entrambi i lati del calcolo.</span>
                </span>
              </div>

              {/* Confronto per anno — tabella comparativa */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Confronto per anno — Piano stimato vs Movimenti cassa</p>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th rowSpan={2} className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 bg-gray-50 border-b border-r border-gray-200 align-bottom w-16">Anno</th>
                        <th colSpan={3} className="px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border-b border-r border-indigo-200 text-center tracking-wide">
                          PIANO STIMATO
                        </th>
                        <th colSpan={3} className="px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border-b border-r border-emerald-200 text-center tracking-wide">
                          MOVIMENTI CASSA
                        </th>
                        <th rowSpan={2} className="px-3 py-2.5 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200 text-right align-bottom">Δ Margine</th>
                      </tr>
                      <tr>
                        <th className="px-3 py-2 text-[11px] font-medium text-indigo-600 bg-indigo-50 border-b border-indigo-100 text-right">Entrate</th>
                        <th className="px-3 py-2 text-[11px] font-medium text-indigo-600 bg-indigo-50 border-b border-indigo-100 text-right">Spese</th>
                        <th className="px-3 py-2 text-[11px] font-medium text-indigo-600 bg-indigo-50 border-b border-r border-indigo-200 text-right">Margine</th>
                        <th className="px-3 py-2 text-[11px] font-medium text-emerald-600 bg-emerald-50 border-b border-emerald-100 text-right">Entrate</th>
                        <th className="px-3 py-2 text-[11px] font-medium text-emerald-600 bg-emerald-50 border-b border-emerald-100 text-right">Spese</th>
                        <th className="px-3 py-2 text-[11px] font-medium text-emerald-600 bg-emerald-50 border-b border-r border-emerald-200 text-right">Margine</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cruscotto.perAnno.map((a, idx) => {
                        const reale = cruscotto.realePerAnno.find(r => r.anno === a.anno)
                        const isFuture = a.anno > annoCorrente
                        const isCurrentYear = a.anno === annoCorrente
                        const scostamento = !isFuture && reale ? reale.margineReale - a.margine : null
                        return (
                          <tr key={a.anno} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <td className="px-3 py-2.5 border-b border-r border-gray-100">
                              <Badge variant={isCurrentYear ? 'success' : 'default'}>{a.anno}</Badge>
                            </td>
                            <td className="px-3 py-2.5 border-b border-gray-100 text-right text-green-600 font-medium tabular-nums">{fmt(a.totEntrate)}</td>
                            <td className="px-3 py-2.5 border-b border-gray-100 text-right text-red-500 tabular-nums">{fmt(a.totUscite)}</td>
                            <td className={`px-3 py-2.5 border-b border-r border-gray-100 text-right font-semibold tabular-nums ${a.margine >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{fmt(a.margine)}</td>
                            {isFuture ? (
                              <>
                                <td className="px-3 py-2.5 border-b border-gray-100 text-right text-gray-300 text-xs" colSpan={3}>dati non ancora disponibili</td>
                                <td className="px-3 py-2.5 border-b border-gray-100 text-right text-gray-300">—</td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2.5 border-b border-gray-100 text-right text-green-600 tabular-nums">{fmt(reale?.entratoReale ?? 0)}</td>
                                <td className="px-3 py-2.5 border-b border-gray-100 text-right text-red-500 tabular-nums">{fmt(reale?.usciteReali ?? 0)}</td>
                                <td className={`px-3 py-2.5 border-b border-r border-gray-100 text-right font-semibold tabular-nums ${(reale?.margineReale ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(reale?.margineReale ?? 0)}</td>
                                <td className={`px-3 py-2.5 border-b border-gray-100 text-right font-medium tabular-nums ${scostamento !== null ? (scostamento >= 0 ? 'text-green-600' : 'text-red-500') : 'text-gray-400'}`}>
                                  {scostamento !== null ? sign(scostamento) : '—'}
                                </td>
                              </>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-semibold text-sm">
                        <td className="px-3 py-2.5 border-t border-r border-gray-200 text-xs text-gray-600">Totale</td>
                        <td className="px-3 py-2.5 border-t border-gray-200 text-right text-green-600 tabular-nums">{fmt(cruscotto.totale.totEntrate)}</td>
                        <td className="px-3 py-2.5 border-t border-gray-200 text-right text-red-500 tabular-nums">{fmt(cruscotto.totale.totUscite)}</td>
                        <td className={`px-3 py-2.5 border-t border-r border-gray-200 text-right tabular-nums ${cruscotto.totale.margine >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{fmt(cruscotto.totale.margine)}</td>
                        <td className="px-3 py-2.5 border-t border-gray-200 text-right text-green-600 tabular-nums">{fmt(cruscotto.totaleReale.entratoReale)}</td>
                        <td className="px-3 py-2.5 border-t border-gray-200 text-right text-red-500 tabular-nums">{fmt(cruscotto.totaleReale.usciteReali)}</td>
                        <td className={`px-3 py-2.5 border-t border-r border-gray-200 text-right tabular-nums ${cruscotto.totaleReale.margineReale >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(cruscotto.totaleReale.margineReale)}</td>
                        <td className={`px-3 py-2.5 border-t border-gray-200 text-right tabular-nums ${(cruscotto.totaleReale.margineReale - cruscotto.totale.margine) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {sign(cruscotto.totaleReale.margineReale - cruscotto.totale.margine)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Distribuzione margine per anno (solo se ci sono obiettivi) */}
              {cruscotto.obiettivi.length > 0 && (
                <Card><CardContent className="p-0">
                  <div className="px-4 py-3 border-b flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-600" />
                    <p className="font-medium text-sm text-gray-700">Destinazione del margine per anno</p>
                  </div>
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Anno</Th>
                        <Th className="text-right">Margine operativo</Th>
                        <Th className="text-right">Destinato a obiettivi</Th>
                        <Th className="text-right">Margine libero</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {cruscotto.perAnno.map(a => (
                        <Tr key={a.anno}>
                          <Td><Badge variant={a.anno === annoCorrente ? 'success' : 'default'}>{a.anno}</Badge></Td>
                          <Td className={`text-right font-medium ${a.margine >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{fmt(a.margine)}</Td>
                          <Td className="text-right text-amber-700">{a.investitoObiettivi > 0 ? fmt(a.investitoObiettivi) : <span className="text-gray-300">—</span>}</Td>
                          <Td className={`text-right font-semibold ${a.margineLibero >= 0 ? 'text-gray-700' : 'text-red-600'}`}>{fmt(a.margineLibero)}</Td>
                        </Tr>
                      ))}
                      <Tr className="bg-amber-50/60 font-semibold text-sm">
                        <Td className="text-xs text-gray-600">Totale piano</Td>
                        <Td className={`text-right ${cruscotto.totale.margine >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{fmt(cruscotto.totale.margine)}</Td>
                        <Td className="text-right text-amber-700">{fmt(cruscotto.totale.investitoObiettivi)}</Td>
                        <Td className={`text-right ${cruscotto.totale.margineLibero >= 0 ? 'text-gray-700' : 'text-red-600'}`}>{fmt(cruscotto.totale.margineLibero)}</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </CardContent></Card>
              )}

              {/* Obiettivi di investimento */}
              {cruscotto.obiettivi.length > 0 ? (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Obiettivi di investimento — distribuzione anno per anno</p>
                  <div className="space-y-4">
                    {cruscotto.obiettivi.map(ob => (
                      <div key={ob.id} className={`rounded-xl border-2 p-4 ${ob.stato === 'raggiunto' ? 'border-green-200 bg-green-50' : ob.stato === 'parziale' ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-white'}`}>
                        {/* header */}
                        <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            {ob.stato === 'raggiunto'
                              ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                              : ob.stato === 'parziale'
                                ? <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                : <Clock className="w-4 h-4 text-gray-400 shrink-0" />}
                            <span className="font-semibold text-gray-900">{ob.nome}</span>
                            <Badge variant="default" className="text-[10px]">{ob.categoria}</Badge>
                            <span className="inline-flex items-center gap-0.5 text-[11px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 font-semibold">
                              <Target className="w-3 h-3" />{ob.percentualePriorita}% margine
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-bold text-gray-800">{fmt(ob.totalAllocato)}</div>
                            <div className="text-xs text-gray-400">su {fmt(ob.importoTarget)}</div>
                          </div>
                        </div>

                        {/* progress bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Copertura del piano</span>
                            <span className={`font-bold ${ob.stato === 'raggiunto' ? 'text-green-600' : ob.stato === 'parziale' ? 'text-amber-600' : 'text-gray-400'}`}>
                              {Math.round(ob.percentualeCoperta)}%
                            </span>
                          </div>
                          <div className="w-full h-3.5 bg-white border border-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${ob.stato === 'raggiunto' ? 'bg-green-500' : ob.stato === 'parziale' ? 'bg-amber-400' : 'bg-gray-200'}`}
                              style={{ width: `${Math.min(ob.percentualeCoperta, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* allocazione anno per anno */}
                        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cruscotto.anni.length}, 1fr)` }}>
                          {ob.allocazionePerAnno.map(x => (
                            <div key={x.anno} className={`text-center rounded-lg p-2 border ${x.allocato > 0 ? 'bg-white border-amber-200' : 'bg-gray-50/80 border-gray-100'}`}>
                              <div className="text-[10px] text-gray-400 font-medium">{x.anno}</div>
                              <div className={`text-xs font-bold mt-0.5 ${x.allocato > 0 ? 'text-amber-700' : 'text-gray-300'}`}>
                                {x.allocato > 0 ? fmt(x.allocato) : '—'}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* stato completamento */}
                        <div className="mt-2.5 text-xs">
                          {ob.annoCompletamento ? (
                            <span className="text-green-700 font-medium">✓ Raggiungibile entro il {ob.annoCompletamento}</span>
                          ) : ob.stato !== 'raggiunto' ? (
                            <span className="text-gray-500">Margine insufficiente — obiettivo non raggiungibile nel periodo con i dati attuali</span>
                          ) : null}
                          {ob.note && <span className="text-gray-400 ml-2 italic">· {ob.note}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                  <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Nessun obiettivo di investimento definito</p>
                  <p className="text-xs text-gray-400 mt-0.5 mb-3">Il margine operativo non viene ancora distribuito verso obiettivi specifici.</p>
                  <button className="text-sm text-indigo-600 underline" onClick={() => setActiveTab('obiettivi')}>Aggiungi un obiettivo →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ──────────── MODALS ──────────── */}

      <Modal open={editScenario} onClose={() => setEditScenario(false)} title="Modifica Scenario">
        <form onSubmit={handleEditScenario} className="space-y-4">
          <div><label className="text-sm font-medium block mb-1">Nome *</label><Input value={editSf.nome} onChange={e => setEditSf({ ...editSf, nome: e.target.value })} required /></div>
          <div><label className="text-sm font-medium block mb-1">Descrizione</label><Input value={editSf.descrizione} onChange={e => setEditSf({ ...editSf, descrizione: e.target.value })} /></div>
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

      <Modal open={addUscita} onClose={() => { setAddUscita(false); setUf(emptyU) }} title="Aggiungi Uscita">
        <form onSubmit={handleAddUscita} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Tipo di uscita</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setUf({ ...uf, tipologia: 'corrente' })}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${uf.tipologia === 'corrente' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                Corrente (anno specifico)
              </button>
              <button type="button" onClick={() => setUf({ ...uf, tipologia: 'ricorrente', anno: '' })}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border flex items-center justify-center gap-1 ${uf.tipologia === 'ricorrente' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                <Repeat2 className="w-3.5 h-3.5" />Ricorrente (ogni anno)
              </button>
            </div>
          </div>
          {uf.tipologia === 'corrente' && (
            <div>
              <label className="text-sm font-medium block mb-1">Anno *</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={uf.anno} onChange={e => setUf({ ...uf, anno: e.target.value })} required>
                <option value="">Seleziona...</option>
                {anni.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Categoria *</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={uf.categoria} onChange={e => setUf({ ...uf, categoria: e.target.value })}>
                {CATEGORIE_USCITA.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Importo (€) *</label>
              <Input type="number" step="0.01" min={0} value={uf.importo} onChange={e => setUf({ ...uf, importo: e.target.value })} placeholder="5000" required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Descrizione *</label>
            <Input value={uf.descrizione} onChange={e => setUf({ ...uf, descrizione: e.target.value })} placeholder="Es. Potatura oliveto" required />
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
              <label className="text-sm font-medium block mb-1">Terreno</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={uf.terrenoId} onChange={e => setUf({ ...uf, terrenoId: e.target.value })}>
                <option value="">Tutti / nessuno</option>
                {terreni.filter(t => !uf.luogoId || String(t.luogoId) === uf.luogoId).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
          </div>
          <div><label className="text-sm font-medium block mb-1">Note</label><Input value={uf.note} onChange={e => setUf({ ...uf, note: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setAddUscita(false); setUf(emptyU) }}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Aggiungi Uscita'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={addEntrata} onClose={() => { setAddEntrata(false); setEf(emptyE); setPrezzoMedioHint(null) }} title="Aggiungi Entrata">
        <form onSubmit={handleAddEntrata} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Natura entrata</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEf({ ...ef, naturaTipo: 'stimata' })}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${ef.naturaTipo === 'stimata' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                Stimata (anno specifico)
              </button>
              <button type="button" onClick={() => setEf({ ...ef, naturaTipo: 'ricorrente', anno: '' })}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border flex items-center justify-center gap-1 ${ef.naturaTipo === 'ricorrente' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                <Repeat2 className="w-3.5 h-3.5" />Ricorrente (ogni anno)
              </button>
            </div>
          </div>
          {ef.naturaTipo === 'stimata' && (
            <div>
              <label className="text-sm font-medium block mb-1">Anno *</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={ef.anno} onChange={e => setEf({ ...ef, anno: e.target.value })} required>
                <option value="">Seleziona...</option>
                {anni.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium block mb-1">Tipo *</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={ef.tipo} onChange={e => setEf({ ...ef, tipo: e.target.value, prodottoId: '' })}>
              {TIPI_ENTRATA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Descrizione *</label>
            <Input value={ef.descrizione} onChange={e => setEf({ ...ef, descrizione: e.target.value })} placeholder="Es. Vendita olio Santa Venerina" required />
          </div>
          {ef.tipo === 'produzione' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Prodotto *</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={ef.prodottoId} onChange={e => setEf({ ...ef, prodottoId: e.target.value })} required>
                    <option value="">Seleziona...</option>
                    {prodotti.map(p => <option key={p.id} value={p.id}>{p.codice} – {p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Terreno</label>
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
                  Importo stimato: <span className="font-semibold text-green-700">{fmt(parseFloat(ef.quantitaStimata) * parseFloat(ef.prezzoStimato))}</span>
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="text-sm font-medium block mb-1">Importo (€) *</label>
              <Input type="number" step="0.01" min={0} value={ef.importoFisso} onChange={e => setEf({ ...ef, importoFisso: e.target.value })} placeholder="Es. 15000" required />
            </div>
          )}
          <div><label className="text-sm font-medium block mb-1">Note</label><Input value={ef.note} onChange={e => setEf({ ...ef, note: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setAddEntrata(false); setEf(emptyE); setPrezzoMedioHint(null) }}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Aggiungi Entrata'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={addObiettivo} onClose={() => { setAddObiettivo(false); setOf(emptyO) }} title="Aggiungi Obiettivo di Investimento">
        <ObiettivoForm
          of={of} setOf={setOf} saving={saving}
          obiettiviEsistenti={obiettivi} editObiettivoId={null}
          onSubmit={handleAddObiettivo} submitLabel="Aggiungi Obiettivo"
          onCancel={() => { setAddObiettivo(false); setOf(emptyO) }}
        />
      </Modal>

      <Modal open={!!editObiettivoModal} onClose={() => { setEditObiettivoModal(null); setOf(emptyO) }} title="Modifica Obiettivo">
        <ObiettivoForm
          of={of} setOf={setOf} saving={saving}
          obiettiviEsistenti={obiettivi} editObiettivoId={editObiettivoModal?.id ?? null}
          onSubmit={handleEditObiettivo} submitLabel="Aggiorna Obiettivo"
          onCancel={() => { setEditObiettivoModal(null); setOf(emptyO) }}
        />
      </Modal>
    </div>
  )
}
