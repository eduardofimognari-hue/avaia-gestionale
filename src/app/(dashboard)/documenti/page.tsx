'use client'
import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'
import { Plus, FileText, FileSpreadsheet, Eye, CheckCircle } from 'lucide-react'
import { formatDate, formatEuro } from '@/lib/utils'
import Link from 'next/link'

type Documento = {
  id: number; tipo: string; numero: number; anno: number; data: string; stato: string
  vendita: { id: number; data: string; importoTotale: number | null; tipoCliente: string } | null
  cliente: { id: number; nome: string; cognome: string | null; ragioneSociale: string | null; partitaIva: string | null } | null
  importoTotale: number; note: string | null
  venditaId: number | null
}

type Vendita = { id: number; data: string; importoTotale: number | null; tipoCliente: string; cliente: { id: number; nome: string; cognome: string | null } | null }

export default function DocumentiPage() {
  const [documenti, setDocumenti] = useState<Documento[]>([])
  const [vendite, setVendite] = useState<Vendita[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [confermando, setConfermando] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [form, setForm] = useState({ tipo: 'ddt', venditaId: '', data: '', note: '' })
  const [emettiFattura, setEmettiFattura] = useState<{ ddtId: number; dataPagamento: string; metodoPagamento: string } | null>(null)

  async function fetchData() {
    try {
      setLoading(true)
      const [resDoc, resVendite] = await Promise.all([fetch('/api/documenti'), fetch('/api/vendite')])
      if (!resDoc.ok || !resVendite.ok) throw new Error()
      setDocumenti(await resDoc.json())
      setVendite(await resVendite.json())
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const documentiFiltrati = filtroTipo ? documenti.filter(d => d.tipo === filtroTipo) : documenti
  const ddtCount = documenti.filter(d => d.tipo === 'ddt').length
  const fatturaCount = documenti.filter(d => d.tipo === 'fattura').length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { tipo: form.tipo, venditaId: parseInt(form.venditaId), data: form.data || undefined, note: form.note || null }
      const res = await fetch('/api/documenti', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      setModalOpen(false)
      setForm({ tipo: 'ddt', venditaId: '', data: '', note: '' })
      await fetchData()
    } catch (err: any) { setError(err.message || 'Errore') }
    finally { setSaving(false) }
  }

  async function handleConfermaDDT(docId: number) {
    if (!confirm('Confermi il DDT? Non sarà più modificabile e verrà preparata la fattura.')) return
    setConfermando(docId)
    try {
      const res = await fetch(`/api/documenti/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ azione: 'conferma' }),
      })
      if (!res.ok) throw new Error()
      await fetchData()
    } catch { setError('Errore durante la conferma') }
    finally { setConfermando(null) }
  }

  async function handleEmettiFattura(docId: number) {
    if (!emettiFattura) return
    if (!confirm(`Emetti fattura per DDT #${docId}?`)) return
    setConfermando(docId)
    try {
      const res = await fetch(`/api/documenti/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          azione: 'emetti_fattura',
          dataPagamentoPrevista: emettiFattura.dataPagamento || null,
          metodoPagamento: emettiFattura.metodoPagamento || 'bonifico',
        }),
      })
      if (!res.ok) throw new Error()
      setEmettiFattura(null)
      await fetchData()
    } catch { setError('Errore durante emissione fattura') }
    finally { setConfermando(null) }
  }

  return (
    <div>
      <PageHeader
        title="DDT e Fatture"
        description="Gestione documenti di trasporto e fatture"
        action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Genera Documento</Button>}
      />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (<p className="text-gray-500">Caricamento...</p>) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-500" />
                <div><p className="text-xs text-gray-500">DDT</p><p className="text-lg font-bold">{ddtCount}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-green-500" />
                <div><p className="text-xs text-gray-500">Fatture</p><p className="text-lg font-bold">{fatturaCount}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="w-8 h-8 text-gray-500" />
                <div><p className="text-xs text-gray-500">Totale</p><p className="text-lg font-bold">{documenti.length}</p></div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Documenti</h3>
                <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                  className="text-sm border rounded-lg px-2 py-1.5 bg-white">
                  <option value="">Tutti</option>
                  <option value="ddt">DDT</option>
                  <option value="fattura">Fatture</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <Thead>
                  <Tr><Th>Documento</Th><Th>Data</Th><Th>Cliente</Th><Th>Vendita</Th><Th>Importo</Th><Th>Stato</Th><Th>Azioni</Th></Tr>
                </Thead>
                <Tbody>
                  {documentiFiltrati.map((d) => (
                    <Tr key={d.id}>
                      <Td>
                        <div className="flex items-center gap-2">
                          {d.tipo === 'ddt' ? <FileText className="w-4 h-4 text-blue-500" /> : <FileSpreadsheet className="w-4 h-4 text-green-500" />}
                          <span className="font-medium">{d.tipo === 'ddt' ? 'DDT' : 'FT'} {d.numero}/{d.anno}</span>
                        </div>
                      </Td>
                      <Td>{formatDate(d.data)}</Td>
                      <Td>{d.cliente ? `${d.cliente.ragioneSociale || d.cliente.nome}${d.cliente.cognome ? ` ${d.cliente.cognome}` : ''}` : '-'}</Td>
                      <Td>{d.vendita ? `Vendita #${d.vendita.id}` : '-'}</Td>
                      <Td className="font-medium">{formatEuro(d.importoTotale)}</Td>
                      <Td>
                        <Badge variant={d.stato === 'bozza' ? 'warning' : d.stato === 'emesso' ? 'info' : 'success'}>
                          {d.tipo === 'ddt'
                            ? d.stato === 'bozza' ? 'Bozza DDT' : d.stato === 'emesso' ? 'DDT Confermato' : 'Fattura Emessa'
                            : d.stato === 'bozza' ? 'Bozza Fattura' : d.stato === 'emesso' ? 'Fattura Emessa' : 'Pagata'}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="flex gap-1">
                          <Link href={`/documenti/${d.id}`}>
                            <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          </Link>
                          {d.tipo === 'ddt' && d.stato === 'bozza' && (
                            <Button variant="ghost" size="sm" onClick={() => handleConfermaDDT(d.id)} disabled={confermando === d.id}>
                              {confermando === d.id ? '...' : <><CheckCircle className="w-3 h-3 mr-1" />Conferma DDT</>}
                            </Button>
                          )}
                          {d.tipo === 'ddt' && d.stato === 'emesso' && (
                            <Button variant="ghost" size="sm" onClick={() => setEmettiFattura({ ddtId: d.id, dataPagamento: '', metodoPagamento: 'bonifico' })}>
                              <FileSpreadsheet className="w-3 h-3 mr-1" />Emetti Fattura
                            </Button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                  {documentiFiltrati.length === 0 && <Tr><Td colSpan={7} className="text-center text-gray-500 py-8">Nessun documento</Td></Tr>}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal emetti fattura da DDT */}
      {emettiFattura && (
        <Modal open={true} onClose={() => setEmettiFattura(null)} title="Emetti Fattura">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Conferma i dati per emettere la fattura dal DDT #{emettiFattura.ddtId}.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Data pagamento prevista</label>
                <input type="date" value={emettiFattura.dataPagamento}
                  onChange={e => setEmettiFattura({ ...emettiFattura, dataPagamento: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Metodo pagamento</label>
                <select value={emettiFattura.metodoPagamento}
                  onChange={e => setEmettiFattura({ ...emettiFattura, metodoPagamento: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="bonifico">Bonifico</option>
                  <option value="contanti">Contanti</option>
                  <option value="carta">Carta</option>
                  <option value="rate">Rateale</option>
                  <option value="assegno">Assegno</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEmettiFattura(null)}>Annulla</Button>
              <Button type="button" onClick={() => handleEmettiFattura(emettiFattura.ddtId)} disabled={confermando !== null}>
                {confermando ? 'Emissione...' : 'Emetti Fattura'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Genera Documento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" required>
                <option value="ddt">DDT - Documento di Trasporto</option>
                <option value="fattura">Fattura</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Data</label>
              <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Vendita di riferimento</label>
            <select value={form.venditaId} onChange={e => setForm({ ...form, venditaId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" required>
              <option value="">Seleziona vendita...</option>
              {vendite.map((v) => (
                <option key={v.id} value={v.id}>
                  Vendita #{v.id} - {formatDate(v.data)} - {v.cliente ? `${v.cliente.nome} ${v.cliente.cognome || ''}` : 'Cliente generico'} - {formatEuro(Number(v.importoTotale || 0))}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Note</label>
            <input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Opzionale" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Generazione...' : 'Genera'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}