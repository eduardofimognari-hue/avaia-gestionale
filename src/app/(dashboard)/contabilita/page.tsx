'use client'
import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'
import {
  Plus, Landmark, MapPin, User, Building2, ArrowUpCircle, ArrowDownCircle,
  ShoppingCart, Undo2, UserCheck, RotateCcw, Receipt, Circle, Briefcase, Truck, Package, UserPlus, UserMinus, ArrowDownToLine, Wallet, Pencil,
} from 'lucide-react'
import { formatDate, formatEuro } from '@/lib/utils'

type Cassa = { id: number; nome: string; saldoIniziale: number; movimenti: { tipo: string; importo: number; luogoId: number | null }[] }
type Luogo = { id: number; nome: string; tipologia: string }
type Socio = { id: number; nome: string; cognome: string }
type PosizioneSocio = { socioId: number; socio: Socio; crediti: number; debiti: number; netto: number }
type Riferimento = { id: number; tipo: string; label: string; data: string }

type Movimento = {
  id: number; data: string; cassa: { nome: string }
  luogo: { id: number; nome: string; tipologia: string } | null
  socio: { id: number; nome: string; cognome: string } | null
  tipo: string; tipoMovimento: string; importo: number
  categoria: string | null; descrizione: string | null; stato: string | null
}

type TipoMovimentoDef = { label: string; color: string; icon: any; direzione: 'entrata' | 'uscita' }

const TIPI_MOVIMENTO: Record<string, TipoMovimentoDef> = {
  entrata_generica: { label: 'Entrata generica', color: 'green', icon: ArrowDownToLine, direzione: 'entrata' },
  anticipo_socio: { label: 'Anticipo socio', color: 'blue', icon: UserPlus, direzione: 'entrata' },
  rimborso_azienda: { label: 'Rimborso azienda', color: 'teal', icon: Undo2, direzione: 'entrata' },
  incasso_cliente: { label: 'Incasso cliente', color: 'green', icon: UserCheck, direzione: 'entrata' },
  rimborso_fornitore: { label: 'Rimborso fornitore', color: 'orange', icon: RotateCcw, direzione: 'entrata' },
  spesa: { label: 'Spesa', color: 'red', icon: ShoppingCart, direzione: 'uscita' },
  anticipo_azienda: { label: 'Anticipo azienda', color: 'purple', icon: UserMinus, direzione: 'uscita' },
  rimborso_socio: { label: 'Rimborso socio', color: 'amber', icon: Undo2, direzione: 'uscita' },
  stipendio: { label: 'Stipendio', color: 'indigo', icon: Briefcase, direzione: 'uscita' },
  fornitore: { label: 'Fornitore', color: 'orange', icon: Truck, direzione: 'uscita' },
  acquisto: { label: 'Acquisto', color: 'red', icon: Package, direzione: 'uscita' },
  altro: { label: 'Altro', color: 'gray', icon: Circle, direzione: 'entrata' },
}

const STATO_MOVIMENTO: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  pagato: { label: 'Pagato', variant: 'success' },
  da_pagare: { label: 'Da pagare', variant: 'warning' },
  da_riscuotere: { label: 'Da riscuotere', variant: 'warning' },
  riscosso: { label: 'Riscosso', variant: 'success' },
}

export default function ContabilitaPage() {
  const [casse, setCasse] = useState<Cassa[]>([])
  const [movimenti, setMovimenti] = useState<Movimento[]>([])
  const [luoghi, setLuoghi] = useState<Luogo[]>([])
  const [soci, setSoci] = useState<Socio[]>([])
  const [posizioniAperte, setPosizioniAperte] = useState<PosizioneSocio[]>([])
  const [debitiClienti, setDebitiClienti] = useState<any[]>([])
  const [debitiFornitori, setDebitiFornitori] = useState<any[]>([])
  const [riferimenti, setRiferimenti] = useState<Riferimento[]>([])
  const [cassaUnica, setCassaUnica] = useState<{ id: number; nome: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editMovimento, setEditMovimento] = useState<Movimento | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filtroLuogo, setFiltroLuogo] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [form, setForm] = useState({ tipo: 'entrata', tipoMovimento: 'entrata_generica', importo: '', luogoId: '', socioId: '', categoria: '', descrizione: '', riferimento: '', riferimentoId: '', riferimentoTipo: '', stato: 'pagato' })

  async function fetchData() {
    try {
      setLoading(true)
      const res = await fetch('/api/contabilita')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCasse(data.casse)
      setMovimenti(data.movimenti)
      setLuoghi(data.luoghi)
      setSoci(data.soci)
      setPosizioniAperte(data.posizioniAperte ?? [])
      setRiferimenti(data.riferimenti ?? [])
      setCassaUnica(data.cassaUnica ?? null)
      // Fetch debiti clienti e fornitori
      const [resDebiti] = await Promise.all([fetch('/api/contabilita')])
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  async function fetchDebiti() {
    try {
      const res = await fetch('/api/contabilita')
      if (!res.ok) throw new Error()
      const data = await res.json()
      // Extract debiti from the response
      if (data.debitiClienti) setDebitiClienti(data.debitiClienti)
      if (data.debitiFornitori) setDebitiFornitori(data.debitiFornitori)
    } catch {}
  }

  useEffect(() => { fetchData() }, [])
  useEffect(() => { if (!loading) fetchDebiti() }, [loading])

  function calcSaldo(c: Cassa) {
    return c.movimenti.reduce((acc, m) => m.tipo === 'entrata' ? acc + m.importo : acc - m.importo, c.saldoIniziale)
  }

  function calcSaldoPerLuogo(luogoId: number | null) {
    return casse.reduce((acc, c) => {
      const movimentiLuogo = c.movimenti.filter(m => m.luogoId === luogoId)
      return acc + movimentiLuogo.reduce((a, m) => m.tipo === 'entrata' ? a + m.importo : a - m.importo, 0)
    }, 0)
  }

  function getTipiPerDirezione(direzione: string) {
    return Object.entries(TIPI_MOVIMENTO).filter(([, v]) => v.direzione === direzione)
  }

  const movimentiFiltrati = movimenti.filter(m => {
    if (filtroLuogo && (!m.luogo || m.luogo.id !== parseInt(filtroLuogo))) return false
    if (filtroTipo && m.tipoMovimento !== filtroTipo) return false
    return true
  })

  function openEditMovimento(m: Movimento) {
    setEditMovimento(m)
    setForm({
      tipo: m.tipo,
      tipoMovimento: m.tipoMovimento,
      importo: m.importo.toString(),
      luogoId: m.luogo?.id?.toString() || '',
      socioId: m.socio?.id?.toString() || '',
      categoria: m.categoria || '',
      descrizione: m.descrizione || '',
      riferimento: '',
      riferimentoId: '',
      riferimentoTipo: '',
      stato: m.stato || 'pagato',
    })
    setEditModalOpen(true)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editMovimento) return
    setSaving(true)
    try {
      const body: any = {
        tipo: form.tipo,
        tipoMovimento: form.tipoMovimento,
        importo: parseFloat(form.importo),
        luogoId: form.luogoId ? parseInt(form.luogoId) : null,
        socioId: form.socioId ? parseInt(form.socioId) : null,
        categoria: form.categoria || null,
        descrizione: form.descrizione || null,
        stato: form.stato || 'pagato',
      }
      const res = await fetch(`/api/contabilita/${editMovimento.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      setEditModalOpen(false)
      setEditMovimento(null)
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body: any = { tipo: form.tipo, tipoMovimento: form.tipoMovimento, importo: parseFloat(form.importo), luogoId: form.luogoId ? parseInt(form.luogoId) : null, socioId: form.socioId ? parseInt(form.socioId) : null, categoria: form.categoria || null, descrizione: form.descrizione || null, stato: form.stato || 'pagato' }
      if (form.riferimentoId) { body.riferimentoId = parseInt(form.riferimentoId); body.riferimentoTipo = form.riferimentoTipo || null }
      else if (form.riferimento) { body.riferimento = form.riferimento }
      const res = await fetch('/api/contabilita', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ tipo: 'entrata', tipoMovimento: 'entrata_generica', importo: '', luogoId: '', socioId: '', categoria: '', descrizione: '', riferimento: '', riferimentoId: '', riferimentoTipo: '', stato: 'pagato' })
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  function getTipoBadgeColor(tipo: string) {
    const info = TIPI_MOVIMENTO[tipo]
    if (!info) return 'default' as const
    const map: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = { red: 'danger', green: 'success', amber: 'warning', orange: 'warning', blue: 'info', purple: 'info', teal: 'info', indigo: 'info', pink: 'info', gray: 'default' }
    return map[info.color] || 'default'
  }

  const tipiEntrata = getTipiPerDirezione('entrata')
  const tipiUscita = getTipiPerDirezione('uscita')
  const tipiCorrenti = form.tipo === 'entrata' ? tipiEntrata : tipiUscita

  return (
    <div>
      <PageHeader title="Movimenti" description="Cassa, sottocontabilità e posizioni finanziarie" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuovo Movimento</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (<p className="text-gray-500">Caricamento...</p>) : (
        <>
          {/* Cassa Unica */}
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3"><Landmark className="w-4 h-4 inline mr-1" /> Conto Principale</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {casse.map((c) => (
              <Card key={c.id}><CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-lg bg-primary-50 p-2 text-primary-600"><Building2 className="w-5 h-5" /></div>
                  <div><h3 className="font-semibold text-gray-900 text-lg">{c.nome}</h3><p className="text-xs text-gray-400">Cassa Unica</p></div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatEuro(calcSaldo(c))}</p>
                <p className="text-xs text-gray-500 mt-1">Saldo</p>
              </CardContent></Card>
            ))}
          </div>

          {/* Sottocontabilità per Luogo */}
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3"><MapPin className="w-4 h-4 inline mr-1" /> Sottocontabilità per Luogo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {luoghi.map((l) => {
              const saldo = calcSaldoPerLuogo(l.id)
              return (
                <a key={l.id} href={`/contabilita/luogo/${l.id}`}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow h-full"><CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                      <h4 className="text-sm font-medium text-gray-900 truncate">{l.nome}</h4>
                      <Badge variant="default" className="text-[10px] px-1.5 shrink-0">{l.tipologia}</Badge>
                    </div>
                    <p className={`text-lg font-bold mt-2 ${saldo >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatEuro(saldo)}</p>
                    <p className="text-xs text-gray-500">Saldo {l.nome}</p>
                  </CardContent></Card>
                </a>
              )
            })}
          </div>

          {/* Posizioni soci aperte */}
          {posizioniAperte.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 mt-6"><User className="w-4 h-4 inline mr-1" /> Crediti e Debiti con i Soci</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {posizioniAperte.map((p) => (
                  <Card key={p.socioId}><CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-xs">{p.socio.nome[0]}{p.socio.cognome[0]}</div>
                      <div><h4 className="text-sm font-medium text-gray-900">{p.socio.nome} {p.socio.cognome}</h4><p className="text-[10px] text-gray-400">Posizione finanziaria</p></div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-1.5"><span className="text-xs text-gray-600 flex items-center gap-1"><ArrowUpCircle className="w-3 h-3 text-green-600" />Credito</span><span className="text-sm font-semibold text-green-700">{formatEuro(p.crediti)}</span></div>
                      <div className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-1.5"><span className="text-xs text-gray-600 flex items-center gap-1"><ArrowDownCircle className="w-3 h-3 text-red-600" />Debito</span><span className="text-sm font-semibold text-red-700">{formatEuro(p.debiti)}</span></div>
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5"><span className="text-xs font-medium text-gray-500">Saldo</span><span className={`text-sm font-bold ${p.netto >= 0 ? 'text-green-700' : 'text-red-700'}`}>{p.netto >= 0 ? formatEuro(p.netto) + ' a tuo favore' : formatEuro(Math.abs(p.netto)) + ' da saldare'}</span></div>
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            </>
          )}

          {/* Crediti/Debiti clienti e fornitori */}
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 mt-6"><Wallet className="w-4 h-4 inline mr-1" /> Crediti e Debiti Esterni</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600"><ArrowUpCircle className="w-5 h-5" /></div>
                <div><h4 className="text-sm font-medium text-gray-900">Crediti verso clienti</h4><p className="text-[10px] text-gray-400">Fatture e vendite non pagate</p></div>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {formatEuro(debitiClienti.reduce((a: number, d: any) => a + Number(d.importo || d.totaleDebiti || 0), 0))}
              </p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="rounded-lg bg-orange-50 p-2 text-orange-600"><ArrowDownCircle className="w-5 h-5" /></div>
                <div><h4 className="text-sm font-medium text-gray-900">Debiti verso fornitori</h4><p className="text-[10px] text-gray-400">Fatture da pagare</p></div>
              </div>
              <p className="text-2xl font-bold text-orange-700">
                {formatEuro(debitiFornitori.reduce((a: number, d: any) => a + Number(d.importo || d.totaleDebiti || 0), 0))}
              </p>
            </CardContent></Card>
          </div>

          {/* Movimenti - tabella cliccabile */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-semibold">Movimenti</h3>
                <div className="flex items-center gap-2">
                  <select value={filtroLuogo} onChange={e => setFiltroLuogo(e.target.value)} className="text-sm border rounded-lg px-2 py-1.5 bg-white">
                    <option value="">Tutti i luoghi</option>
                    {luoghi.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                  <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="text-sm border rounded-lg px-2 py-1.5 bg-white">
                    <option value="">Tutti i tipi</option>
                    {Object.entries(TIPI_MOVIMENTO).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <Thead>
                  <Tr><Th>Data</Th><Th>Conto</Th><Th>Entrata/Uscita</Th><Th>Tipo</Th><Th>Luogo</Th><Th>Socio</Th><Th>Importo</Th><Th>Stato</Th><Th></Th></Tr>
                </Thead>
                <Tbody>
                  {movimentiFiltrati.map((m) => {
                    const statoInfo = STATO_MOVIMENTO[m.stato ?? ''] ?? { label: m.stato ?? '-', variant: 'default' as const }
                    return (
                      <Tr key={m.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openEditMovimento(m)}>
                        <Td>{formatDate(m.data)}</Td>
                        <Td>{m.cassa.nome}</Td>
                        <Td><Badge variant={m.tipo === 'entrata' ? 'success' : 'danger'}>{m.tipo === 'entrata' ? 'Entrata' : 'Uscita'}</Badge></Td>
                        <Td><Badge variant={getTipoBadgeColor(m.tipoMovimento)} className="text-xs">{TIPI_MOVIMENTO[m.tipoMovimento]?.label || m.tipoMovimento}</Badge></Td>
                        <Td>{m.luogo ? <span className="text-xs font-medium">{m.luogo.nome}</span> : '-'}</Td>
                        <Td>{m.socio ? `${m.socio.nome} ${m.socio.cognome}` : '-'}</Td>
                        <Td className="font-medium">{formatEuro(m.importo)}</Td>
                        <Td><Badge variant={statoInfo.variant}>{statoInfo.label}</Badge></Td>
                        <Td><Pencil className="w-4 h-4 text-gray-400 hover:text-gray-600" /></Td>
                      </Tr>
                    )
                  })}
                  {movimentiFiltrati.length === 0 && <Tr><Td colSpan={9} className="text-center text-gray-500 py-8">Nessun movimento trovato</Td></Tr>}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal modifica movimento */}
      <Modal open={editModalOpen} onClose={() => { setEditModalOpen(false); setEditMovimento(null) }} title={`Modifica Movimento #${editMovimento?.id}`}>
        {editMovimento && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <Landmark className="w-4 h-4 text-gray-400" />
              <span>Conto: <strong>{editMovimento.cassa.nome}</strong></span>
              <span className="ml-auto text-xs text-gray-400">ID #{editMovimento.id}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Tipo</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { const p = tipiEntrata[0]; setForm({ ...form, tipo: 'entrata', tipoMovimento: p ? p[0] : 'entrata_generica' }) }}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${form.tipo === 'entrata' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-500'}`}>Entrata</button>
                  <button type="button" onClick={() => { const p = tipiUscita[0]; setForm({ ...form, tipo: 'uscita', tipoMovimento: p ? p[0] : 'spesa' }) }}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${form.tipo === 'uscita' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-500'}`}>Uscita</button>
                </div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Importo (€)</label><Input type="number" step="0.01" min="0" value={form.importo} onChange={e => setForm({ ...form, importo: e.target.value })} required /></div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Tipo movimento</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tipiCorrenti.map(([k, v]) => {
                  const Icon = v.icon; const isSelected = form.tipoMovimento === k
                  return (
                    <button key={k} type="button" onClick={() => setForm({ ...form, tipoMovimento: k })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${isSelected ? form.tipo === 'entrata' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      <Icon className="w-4 h-4 shrink-0" /><span className="truncate">{v.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium block mb-1">Stato</label><Select value={form.stato} onChange={e => setForm({ ...form, stato: e.target.value })}><option value="pagato">Pagato</option><option value="da_pagare">Da pagare</option><option value="riscosso">Riscosso</option><option value="da_riscuotere">Da riscuotere</option></Select></div>
              <div><label className="text-sm font-medium block mb-1">Luogo</label><Select value={form.luogoId} onChange={e => setForm({ ...form, luogoId: e.target.value })}><option value="">Nessuno</option>{luoghi.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}</Select></div>
            </div>
            <div><label className="text-sm font-medium block mb-1">Socio</label><Select value={form.socioId} onChange={e => setForm({ ...form, socioId: e.target.value })}><option value="">Nessuno</option>{soci.map(s => <option key={s.id} value={s.id}>{s.nome} {s.cognome}</option>)}</Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium block mb-1">Categoria</label><Select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}><option value="">Seleziona...</option><option value="Vendite">Vendite</option><option value="Spese">Spese</option><option value="Stipendi">Stipendi</option><option value="Fornitori">Fornitori</option><option value="Manutenzione">Manutenzione</option><option value="Materiali">Materiali</option><option value="Viaggio">Viaggio</option><option value="Utenze">Utenze</option><option value="Altro">Altro</option></Select></div>
              <div><label className="text-sm font-medium block mb-1">Descrizione</label><Input value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })} /></div>
            </div>
            <div className="text-xs text-gray-400 bg-blue-50 p-3 rounded-lg">La modifica del movimento aggiorna automaticamente i saldi di contabilità.</div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setEditModalOpen(false); setEditMovimento(null) }}>Annulla</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Aggiorna Movimento'}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal nuovo movimento (existing) */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Movimento Contabile">
        <form onSubmit={handleSubmit} className="space-y-4">
          {cassaUnica && <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2"><Landmark className="w-4 h-4 text-gray-400" /><span>Conto: <strong>{cassaUnica.nome}</strong></span></div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Entrata / Uscita</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => { const p = tipiEntrata[0]; setForm({ ...form, tipo: 'entrata', tipoMovimento: p ? p[0] : 'entrata_generica', stato: 'pagato' }) }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${form.tipo === 'entrata' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-500'}`}><ArrowDownToLine className="w-4 h-4 inline mr-1" /> Entrata</button>
                <button type="button" onClick={() => { const p = tipiUscita[0]; setForm({ ...form, tipo: 'uscita', tipoMovimento: p ? p[0] : 'spesa', stato: 'da_pagare' }) }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${form.tipo === 'uscita' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-500'}`}><ShoppingCart className="w-4 h-4 inline mr-1" /> Uscita</button>
              </div>
            </div>
            <div><label className="text-sm font-medium block mb-1">Importo (€)</label><Input type="number" step="0.01" min="0" value={form.importo} onChange={e => setForm({ ...form, importo: e.target.value })} required /></div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Tipo movimento</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tipiCorrenti.map(([k, v]) => {
                const Icon = v.icon; const isSelected = form.tipoMovimento === k
                return (
                  <button key={k} type="button" onClick={() => { const st = form.tipo === 'entrata' && (k === 'incasso_cliente' || k === 'rimborso_fornitore' || k === 'liquidazione_credito') ? 'da_riscuotere' : form.tipo === 'uscita' && (k === 'spesa' || k === 'fornitore' || k === 'acquisto') ? 'da_pagare' : form.tipo === 'entrata' ? 'riscosso' : 'pagato'; setForm({ ...form, tipoMovimento: k, stato: st }) }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${isSelected ? form.tipo === 'entrata' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <Icon className="w-4 h-4 shrink-0" /><span className="truncate">{v.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Stato</label><Select value={form.stato} onChange={e => setForm({ ...form, stato: e.target.value })}><option value="pagato">Pagato</option><option value="da_pagare">Da pagare</option><option value="riscosso">Riscosso</option><option value="da_riscuotere">Da riscuotere</option></Select></div>
            <div><label className="text-sm font-medium block mb-1">Luogo</label><Select value={form.luogoId} onChange={e => setForm({ ...form, luogoId: e.target.value })}><option value="">Nessuno (generale)</option>{luoghi.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.tipologia})</option>)}</Select></div>
          </div>
          <div><label className="text-sm font-medium block mb-1">Socio</label><Select value={form.socioId} onChange={e => setForm({ ...form, socioId: e.target.value })}><option value="">Nessuno</option>{soci.map(s => <option key={s.id} value={s.id}>{s.nome} {s.cognome}</option>)}</Select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Categoria</label><Select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}><option value="">Seleziona...</option><option value="Vendite">Vendite</option><option value="Spese">Spese</option><option value="Stipendi">Stipendi</option><option value="Fornitori">Fornitori</option><option value="Manutenzione">Manutenzione</option><option value="Materiali">Materiali</option><option value="Viaggio">Viaggio</option><option value="Utenze">Utenze</option><option value="Altro">Altro</option></Select></div>
            <div><label className="text-sm font-medium block mb-1">Riferimento</label><Select value={form.riferimentoId ? `${form.riferimentoTipo}-${form.riferimentoId}` : ''} onChange={e => { const val = e.target.value; if (!val) { setForm({ ...form, riferimentoId: '', riferimentoTipo: '', riferimento: '' }); return }; const [tipo, idStr] = val.split('-'); const rif = riferimenti.find(r => r.tipo === tipo && r.id === parseInt(idStr)); setForm({ ...form, riferimentoId: idStr, riferimentoTipo: tipo, riferimento: rif?.label ?? '' }) }}>
              <option value="">Nessuno</option>{riferimenti.map(r => (<option key={`${r.tipo}-${r.id}`} value={`${r.tipo}-${r.id}`}>{r.label}</option>))}
            </Select></div>
          </div>
          <div><label className="text-sm font-medium block mb-1">Descrizione</label><Input value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}