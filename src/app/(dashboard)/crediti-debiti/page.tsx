'use client'
import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'
import { Plus, ArrowUpCircle, ArrowDownCircle, CheckCircle, Wallet, Building2 } from 'lucide-react'
import { formatDate, formatEuro } from '@/lib/utils'

type Liquidazione = {
  id: number; data: string; tipo: string
  cliente?: { id: number; nome: string; cognome: string | null }
  totaleCrediti: number; totaleDebiti: number; importoNetto: number
  periodoDa: string | null; periodoA: string | null
  stato: string; dataPagamento: string | null; note: string | null
  movimenti: { id: number; tipo: string; importo: number; categoria: string | null; descrizione: string | null }[]
  movimentoCassa: { id: number; importo: number; tipo: string; data: string } | null
}

type Cliente = { id: number; nome: string; cognome: string | null }

export default function CreditiDebitiPage() {
  const [liquidazioni, setLiquidazioni] = useState<Liquidazione[]>([])
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pagando, setPagando] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [totaleCreditiClienti, setTotaleCreditiClienti] = useState(0)
  const [totaleDebitiFornitori, setTotaleDebitiFornitori] = useState(0)
  const [form, setForm] = useState({ data: '', clienteId: '', tipoMovimento: 'credito', importo: '', note: '' })

  async function fetchData() {
    try {
      setLoading(true)
      const [resLiq, resClienti] = await Promise.all([
        fetch('/api/liquidazioni-soci'),
        fetch('/api/clienti'),
      ])
      if (!resLiq.ok || !resClienti.ok) throw new Error()
      const liqData = await resLiq.json()
      const tutte = liqData.liquidazioni ?? liqData
      setLiquidazioni(tutte.filter((l: Liquidazione) => l.tipo === 'esterna'))
      setTotaleCreditiClienti(liqData.totaleCreditiClienti ?? 0)
      setTotaleDebitiFornitori(liqData.totaleDebitiFornitori ?? 0)
      setClienti(await resClienti.json())
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        data: new Date(form.data).toISOString(),
        tipo: 'esterna',
        tipoMovimento: form.tipoMovimento,
        importo: parseFloat(form.importo),
        clienteId: parseInt(form.clienteId),
        note: form.note || null,
      }
      const res = await fetch('/api/liquidazioni-soci', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ data: '', clienteId: '', tipoMovimento: 'credito', importo: '', note: '' })
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
      <PageHeader title="Crediti e Debiti Esterni" description="Gestione crediti verso clienti e debiti verso fornitori" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuovo Movimento</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (<p className="text-gray-500">Caricamento...</p>) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600"><Wallet className="w-5 h-5" /></div>
                  <div><p className="text-xs text-gray-500 uppercase tracking-wide">Crediti verso clienti</p><p className="text-xl font-bold text-blue-700">{formatEuro(totaleCreditiClienti)}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-orange-50 p-2 text-orange-600"><Building2 className="w-5 h-5" /></div>
                  <div><p className="text-xs text-gray-500 uppercase tracking-wide">Debiti verso fornitori</p><p className="text-xl font-bold text-orange-700">{formatEuro(totaleDebitiFornitori)}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <Thead>
                  <Tr><Th>Data</Th><Th>Soggetto</Th><Th>Movimento</Th><Th>Importo</Th><Th>Note</Th><Th>Stato</Th><Th></Th></Tr>
                </Thead>
                <Tbody>
                  {liquidazioni.map((l) => (
                    <>
                      <Tr key={l.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                        <Td>{formatDate(l.data)}</Td>
                        <Td className="font-medium">{l.cliente ? `${l.cliente.nome} ${l.cliente.cognome || ''}` : '-'}</Td>
                        <Td>
                          {l.importoNetto >= 0
                            ? <Badge variant="info"><ArrowUpCircle className="w-3 h-3 mr-1" />Credito</Badge>
                            : <Badge variant="warning"><ArrowDownCircle className="w-3 h-3 mr-1" />Debito</Badge>}
                        </Td>
                        <Td className="font-bold">
                          {l.importoNetto >= 0
                            ? <span className="text-green-700">{formatEuro(l.importoNetto)}</span>
                            : <span className="text-red-700">{formatEuro(Math.abs(l.importoNetto))}</span>}
                        </Td>
                        <Td className="text-gray-500 text-sm">{l.note || '-'}</Td>
                        <Td>{l.stato === 'pagato' ? <Badge variant="success">Pagato</Badge> : <Badge variant="warning">Da pagare</Badge>}</Td>
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
                          <Td colSpan={7} className="bg-gray-50 p-0">
                            <div className="px-6 py-3">
                              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Movimenti:</p>
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
                                  Movimento cassa: {formatEuro(l.movimentoCassa.importo)} del {formatDate(l.movimentoCassa.data)}
                                </div>
                              )}
                            </div>
                          </Td>
                        </Tr>
                      )}
                    </>
                  ))}
                  {liquidazioni.length === 0 && <Tr><Td colSpan={7} className="text-center text-gray-500 py-8">Nessun credito o debito esterno registrato</Td></Tr>}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Credito / Debito Esterno">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Data</label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required /></div>
            <div>
              <label className="text-sm font-medium block mb-1">Cliente / Fornitore</label>
              <Select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} required>
                <option value="">Seleziona...</option>
                {clienti.map((c) => <option key={c.id} value={c.id}>{c.nome} {c.cognome || ''}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Tipo movimento</label>
              <Select value={form.tipoMovimento} onChange={(e) => setForm({ ...form, tipoMovimento: e.target.value })}>
                <option value="credito">Credito (ci devono pagare)</option>
                <option value="debito">Debito (dobbiamo pagare)</option>
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Importo (€)</label><Input type="number" step="0.01" min="0" value={form.importo} onChange={(e) => setForm({ ...form, importo: e.target.value })} required /></div>
          </div>
          <div><label className="text-sm font-medium block mb-1">Note</label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Descrizione" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
