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
import { Plus, ArrowUpCircle, ArrowDownCircle, Landmark, User, CheckCircle, Users, Building2, Wallet } from 'lucide-react'
import { formatDate, formatEuro } from '@/lib/utils'

type Liquidazione = {
  id: number; data: string; tipo: string
  socio?: { id: number; nome: string; cognome: string }
  cliente?: { id: number; nome: string; cognome: string | null }
  totaleCrediti: number; totaleDebiti: number; importoNetto: number
  periodoDa: string | null; periodoA: string | null
  stato: string; dataPagamento: string | null; note: string | null
  movimenti: { id: number; tipo: string; importo: number; categoria: string | null; descrizione: string | null }[]
  movimentoCassa: { id: number; importo: number; tipo: string; data: string } | null
}

type Socio = { id: number; nome: string; cognome: string }
type Cliente = { id: number; nome: string; cognome: string | null }

export default function LiquidazioniPage() {
  const [liquidazioni, setLiquidazioni] = useState<Liquidazione[]>([])
  const [soci, setSoci] = useState<Socio[]>([])
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pagando, setPagando] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [tab, setTab] = useState<'tutte' | 'interne' | 'esterne'>('tutte')
  const [saldoCassa, setSaldoCassa] = useState(0)
  const [totaleCreditiSoci, setTotaleCreditiSoci] = useState(0)
  const [totaleDebitiSoci, setTotaleDebitiSoci] = useState(0)
  const [totaleCreditiClienti, setTotaleCreditiClienti] = useState(0)
  const [totaleDebitiFornitori, setTotaleDebitiFornitori] = useState(0)
  const [form, setForm] = useState({ data: '', tipo: 'interna', socioId: '', clienteId: '', tipoMovimento: 'credito', importo: '', note: '' })

  async function fetchData() {
    try {
      setLoading(true)
      const [resLiq, resSoci, resClienti, resDebiti] = await Promise.all([
        fetch('/api/liquidazioni-soci'),
        fetch('/api/soci'),
        fetch('/api/clienti'),
        fetch('/api/contabilita'),
      ])
      if (!resLiq.ok || !resSoci.ok) throw new Error()
      const liqData = await resLiq.json()
      setLiquidazioni(liqData.liquidazioni ?? liqData)
      setSaldoCassa(liqData.saldoCassa ?? 0)
      setTotaleCreditiSoci(liqData.totaleCreditiSoci ?? 0)
      setTotaleDebitiSoci(liqData.totaleDebitiSoci ?? 0)
      setTotaleCreditiClienti(liqData.totaleCreditiClienti ?? 0)
      setTotaleDebitiFornitori(liqData.totaleDebitiFornitori ?? 0)
      setSoci(await resSoci.json())
      setClienti(await resClienti.json())
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const filtrate = liquidazioni.filter(l => {
    if (tab === 'interne') return l.tipo === 'interna'
    if (tab === 'esterne') return l.tipo === 'esterna'
    return true
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body: any = {
        data: new Date(form.data).toISOString(),
        tipo: form.tipo,
        tipoMovimento: form.tipoMovimento,
        importo: parseFloat(form.importo),
        note: form.note || null,
      }
      if (form.tipo === 'interna') body.socioId = parseInt(form.socioId)
      else body.clienteId = parseInt(form.clienteId)
      const res = await fetch('/api/liquidazioni-soci', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ data: '', tipo: 'interna', socioId: '', clienteId: '', tipoMovimento: 'credito', importo: '', note: '' })
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  async function handlePaga(id: number) {
    if (!confirm('Confermi il pagamento?')) return
    setPagando(id)
    try {
      const res = await fetch(`/api/liquidazioni-soci/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ azione: 'paga' }),
      })
      if (!res.ok) throw new Error()
      await fetchData()
    } catch { setError('Errore durante il pagamento') }
    finally { setPagando(null) }
  }

  return (
    <div>
      <PageHeader title="Liquidazioni Debiti/Crediti" description="Compensazione crediti e debiti interni (soci) ed esterni (clienti/fornitori)" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuova Liquidazione</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (<p className="text-gray-500">Caricamento...</p>) : (
        <>
          {/* Riepilogo generale */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary-50 p-2 text-primary-600"><Landmark className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Cassa Generale</p>
                    <p className={`text-xl font-bold ${saldoCassa >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatEuro(saldoCassa)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-50 p-2 text-green-600"><ArrowUpCircle className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Crediti soci</p>
                    <p className="text-xl font-bold text-green-700">{formatEuro(totaleCreditiSoci)}</p>
                    <p className="text-[10px] text-gray-400">Verso azienda</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-red-50 p-2 text-red-600"><ArrowDownCircle className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Debiti soci</p>
                    <p className="text-xl font-bold text-red-700">{formatEuro(totaleDebitiSoci)}</p>
                    <p className="text-[10px] text-gray-400">Verso azienda</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600"><Wallet className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Crediti verso clienti</p>
                    <p className="text-xl font-bold text-blue-700">{formatEuro(totaleCreditiClienti)}</p>
                    <p className="text-[10px] text-gray-400">Da riscuotere</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-orange-50 p-2 text-orange-600"><Building2 className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Debiti verso fornitori</p>
                    <p className="text-xl font-bold text-orange-700">{formatEuro(totaleDebitiFornitori)}</p>
                    <p className="text-[10px] text-gray-400">Da pagare</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
            {(['tutte', 'interne', 'esterne'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t === 'tutte' ? 'Tutte' : t === 'interne' ? 'Interne (Soci)' : 'Esterne (Clienti/Fornitori)'}
              </button>
            ))}
          </div>

          {/* Tabella liquidazioni */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <Thead>
                  <Tr><Th>Data</Th><Th>Tipo</Th><Th>Soggetto</Th><Th>Movimento</Th><Th>Importo</Th><Th>Note</Th><Th>Stato</Th><Th></Th></Tr>
                </Thead>
                <Tbody>
                  {filtrate.map((l) => (
                    <>
                      <Tr key={l.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                        <Td>{formatDate(l.data)}</Td>
                        <Td><Badge variant={l.tipo === 'interna' ? 'info' : 'default'}>{l.tipo === 'interna' ? 'Interna' : 'Esterna'}</Badge></Td>
                        <Td className="font-medium">
                          {l.socio ? `${l.socio.nome} ${l.socio.cognome}` : l.cliente ? `${l.cliente.nome} ${l.cliente.cognome || ''}` : '-'}
                        </Td>
                        <Td>
                          {l.importoNetto >= 0 ? (
                            <Badge variant="info"><ArrowUpCircle className="w-3 h-3 mr-1" /> Credito</Badge>
                          ) : (
                            <Badge variant="warning"><ArrowDownCircle className="w-3 h-3 mr-1" /> Debito</Badge>
                          )}
                        </Td>
                        <Td className="font-bold">
                          {l.importoNetto >= 0 ? (
                            <span className="text-green-700">{formatEuro(l.importoNetto)}</span>
                          ) : (
                            <span className="text-red-700">{formatEuro(Math.abs(l.importoNetto))}</span>
                          )}
                        </Td>
                        <Td className="text-gray-500 text-sm">{l.note || '-'}</Td>
                        <Td>
                          {l.stato === 'pagato' ? <Badge variant="success">Pagato</Badge> : <Badge variant="warning">Da pagare</Badge>}
                        </Td>
                        <Td>
                          {l.stato === 'da pagare' && l.importoNetto !== 0 && (
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handlePaga(l.id) }} disabled={pagando === l.id}>
                              {pagando === l.id ? '...' : <><CheckCircle className="w-3 h-3 mr-1" />Paga</>}
                            </Button>
                          )}
                        </Td>
                      </Tr>
                      {expanded === l.id && l.movimenti.length > 0 && (
                        <Tr key={`detail-${l.id}`}>
                          <Td colSpan={8} className="bg-gray-50 p-0">
                            <div className="px-6 py-3">
                              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Movimenti chiusi:</p>
                              {l.movimenti.map((m) => (
                                <div key={m.id} className="flex items-center gap-3 text-sm py-1">
                                  <Badge variant={m.tipo === 'credito' ? 'info' : 'warning'} className="w-16 justify-center">{m.tipo}</Badge>
                                  <span className="font-medium w-20">{formatEuro(m.importo)}</span>
                                  <span className="text-gray-500 w-24">{m.categoria || '-'}</span>
                                  <span className="text-gray-400">{m.descrizione || ''}</span>
                                </div>
                              ))}
                              {l.movimentoCassa && (
                                <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                                  Movimento cassa: {formatEuro(l.movimentoCassa.importo)} ({l.movimentoCassa.tipo}) del {formatDate(l.movimentoCassa.data)}
                                </div>
                              )}
                            </div>
                          </Td>
                        </Tr>
                      )}
                    </>
                  ))}
                  {filtrate.length === 0 && <Tr><Td colSpan={8} className="text-center text-gray-500 py-8">Nessuna liquidazione trovata</Td></Tr>}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuova Liquidazione">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Data</label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required /></div>
            <div>
              <label className="text-sm font-medium block mb-1">Tipo</label>
              <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value, socioId: '', clienteId: '' })}>
                <option value="interna">Interna (Soci)</option>
                <option value="esterna">Esterna (Clienti/Fornitori)</option>
              </Select>
            </div>
          </div>
          {form.tipo === 'interna' ? (
            <div>
              <label className="text-sm font-medium block mb-1">Socio</label>
              <Select value={form.socioId} onChange={(e) => setForm({ ...form, socioId: e.target.value })} required>
                <option value="">Seleziona...</option>
                {soci.map((s) => <option key={s.id} value={s.id}>{s.nome} {s.cognome}</option>)}
              </Select>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium block mb-1">Cliente</label>
              <Select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} required>
                <option value="">Seleziona...</option>
                {clienti.map((c) => <option key={c.id} value={c.id}>{c.nome} {c.cognome || ''}</option>)}
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Movimento</label>
              <Select value={form.tipoMovimento} onChange={(e) => setForm({ ...form, tipoMovimento: e.target.value })}>
                <option value="credito">Credito (azienda paga/incassa)</option>
                <option value="debito">Debito (socio/cliente paga)</option>
              </Select>
              <p className="text-[10px] text-gray-400 mt-1">
                {form.tipoMovimento === 'credito'
                  ? 'L\'azienda deve: restituisce o paga'
                  : 'Il debitore paga: l\'azienda incassa'}
              </p>
            </div>
            <div><label className="text-sm font-medium block mb-1">Importo (€)</label><Input type="number" step="0.01" min="0" value={form.importo} onChange={(e) => setForm({ ...form, importo: e.target.value })} required /></div>
          </div>
          <div><label className="text-sm font-medium block mb-1">Note</label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Descrizione" /></div>
          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
            La liquidazione creer&agrave; automaticamente un movimento nella cassa generale in contabilità. Verifica il saldo cassa prima di procedere.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}