'use client'
import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatDate, formatEuro, formatNumber } from '@/lib/utils'
import Link from 'next/link'
import { Plus, FileText, Receipt, Pencil } from 'lucide-react'

type Vendita = {
  id: number; data: string; tipoCliente: string; importoTotale: number | null
  pagata: boolean; rateizzato: boolean; numeroRate: number | null
  statoPagamento: string; metodoPagamento: string | null
  dataPagamentoPrevista: string | null
  cliente: { id: number; nome: string; cognome: string | null } | null
  righe: { id: number; prodotto: { id: number; nome: string; varietaTipologia: string | null }; quantita: number; formato: string | null; prezzoUnitario: number; importo: number }[]
  documenti: { tipo: string; numero: number; anno: number; stato: string }[]
}

export default function VenditePage() {
  const [data, setData] = useState<Vendita[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selected, setSelected] = useState<Vendita | null>(null)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({ pagata: false, statoPagamento: 'da_pagare', metodoPagamento: '', dataPagamentoPrevista: '' })

  async function fetchData() {
    try {
      setLoading(true)
      const res = await fetch('/api/vendite')
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch { setError('Errore caricamento vendite') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  function openEdit(v: Vendita) {
    setSelected(v)
    setEditForm({ pagata: v.pagata, statoPagamento: v.statoPagamento, metodoPagamento: v.metodoPagamento || '', dataPagamentoPrevista: v.dataPagamentoPrevista || '' })
    setEditModalOpen(true)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/vendite/${selected.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error()
      setEditModalOpen(false)
      setSelected(null)
      await fetchData()
    } catch { setError('Errore aggiornamento') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Vendite" description="Registro vendite" action={<Link href="/vendite/nuova"><Button><Plus className="w-4 h-4 mr-2" />Nuova Vendita</Button></Link>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (<p className="text-gray-500">Caricamento...</p>) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr><Th>Data</Th><Th>Cliente</Th><Th>Tipo</Th><Th>Prodotti</Th><Th>Importo</Th><Th>Documento</Th><Th>Pagamento</Th><Th></Th></Tr>
              </Thead>
              <Tbody>
                {data.map((v) => {
                  const doc = v.documenti[0]
                  return (
                    <Tr key={v.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openEdit(v)}>
                      <Td className="whitespace-nowrap">{formatDate(v.data)}</Td>
                      <Td className="font-medium">
                        {v.cliente ? `${v.cliente.nome} ${v.cliente.cognome || ''}` : <span className="text-gray-400">-</span>}
                      </Td>
                      <Td><Badge variant={v.tipoCliente === 'Privato' ? 'info' : 'default'}>{v.tipoCliente}</Badge></Td>
                      <Td>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {v.righe.map(r => (
                            <Badge key={r.id} variant="default" className="text-xs">
                              {r.prodotto.nome}{r.prodotto.varietaTipologia ? ` - ${r.prodotto.varietaTipologia}` : ''}
                              {' '}({formatNumber(r.quantita)})
                            </Badge>
                          ))}
                        </div>
                      </Td>
                      <Td className="font-medium whitespace-nowrap">{v.importoTotale != null ? formatEuro(v.importoTotale) : '-'}</Td>
                      <Td>
                        {doc ? (
                          <div className="flex items-center gap-1">
                            {doc.tipo === 'ddt' ? <FileText className="w-3.5 h-3.5 text-blue-500" /> : <Receipt className="w-3.5 h-3.5 text-green-500" />}
                            <span className="text-xs">{doc.tipo === 'ddt' ? 'DDT' : 'FT'} {doc.numero}/{doc.anno}</span>
                            <Badge variant={doc.stato === 'bozza' ? 'warning' : 'success'} className="text-[10px] ml-1">
                              {doc.stato === 'bozza' ? 'Bozza' : doc.tipo === 'ddt' ? 'Confermato' : 'Emessa'}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="default" className="text-xs">Non fatturata</Badge>
                        )}
                      </Td>
                      <Td>
                        {v.pagata ? (
                          <Badge variant="success" className="text-xs">Pagata</Badge>
                        ) : v.rateizzato ? (
                          <Badge variant="warning" className="text-xs">Rateale ({v.numeroRate} rate)</Badge>
                        ) : (
                          <Badge variant="danger" className="text-xs">Da pagare</Badge>
                        )}
                      </Td>
                      <Td><Pencil className="w-4 h-4 text-gray-400" /></Td>
                    </Tr>
                  )
                })}
                {data.length === 0 && <Tr><Td colSpan={8} className="text-center text-gray-500 py-8">Nessuna vendita trovata</Td></Tr>}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Modal open={editModalOpen} onClose={() => { setEditModalOpen(false); setSelected(null) }} title={`Vendita #${selected?.id}`}>
        {selected && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
              <div><span className="text-gray-500">Data:</span> <span className="font-medium">{formatDate(selected.data)}</span></div>
              <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{selected.cliente ? `${selected.cliente.nome} ${selected.cliente.cognome || ''}` : 'Generico'}</span></div>
              <div><span className="text-gray-500">Importo:</span> <span className="font-medium">{formatEuro(Number(selected.importoTotale || 0))}</span></div>
              <div><span className="text-gray-500">Prodotti:</span> <span className="font-medium">{selected.righe.length}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Stato pagamento</label>
                <Select value={editForm.statoPagamento} onChange={e => setEditForm({ ...editForm, statoPagamento: e.target.value, pagata: e.target.value === 'pagato' })}>
                  <option value="da_pagare">Da pagare</option>
                  <option value="pagato">Pagato</option>
                  <option value="parziale">Parziale</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Metodo pagamento</label>
                <Select value={editForm.metodoPagamento} onChange={e => setEditForm({ ...editForm, metodoPagamento: e.target.value })}>
                  <option value="">--</option>
                  <option value="contanti">Contanti</option>
                  <option value="bonifico">Bonifico</option>
                  <option value="carta">Carta</option>
                  <option value="assegno">Assegno</option>
                  <option value="paypal">PayPal</option>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Data pagamento prevista</label>
              <Input type="date" value={editForm.dataPagamentoPrevista} onChange={e => setEditForm({ ...editForm, dataPagamentoPrevista: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pagata" checked={editForm.pagata}
                onChange={e => setEditForm({ ...editForm, pagata: e.target.checked, statoPagamento: e.target.checked ? 'pagato' : 'da_pagare' })}
                className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="pagata" className="text-sm font-medium">Vendita pagata</label>
            </div>
            <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
              Se la vendita viene segnata come pagata, verrà creato automaticamente un movimento in contabilità.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setEditModalOpen(false); setSelected(null) }}>Annulla</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Aggiorna Vendita'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}