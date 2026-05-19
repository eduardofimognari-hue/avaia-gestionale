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
import { Plus, Wallet, MapPin } from 'lucide-react'
import { formatDate, formatEuro } from '@/lib/utils'

type Cassa = {
  id: number
  nome: string
  saldoIniziale: number
  movimenti: { tipo: string; importo: number; luogoId: number | null }[]
}

type Luogo = { id: number; nome: string; tipo: string }
type Movimento = {
  id: number
  data: string
  cassa: { nome: string }
  luogo: { id: number; nome: string; tipo: string } | null
  tipo: string
  importo: number
  categoria: string | null
  descrizione: string | null
}

export default function CassaPage() {
  const [casse, setCasse] = useState<Cassa[]>([])
  const [movimenti, setMovimenti] = useState<Movimento[]>([])
  const [luoghi, setLuoghi] = useState<Luogo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ cassaId: '', tipo: 'entrata', importo: '', luogoId: '', categoria: '', descrizione: '' })

  async function fetchData() {
    try {
      setLoading(true)
      const [resCasse, resMov, resLuoghi] = await Promise.all([
        fetch('/api/cassa'),
        fetch('/api/cassa/movimenti'),
        fetch('/api/luoghi')
      ])
      if (!resCasse.ok || !resMov.ok || !resLuoghi.ok) throw new Error()
      setCasse(await resCasse.json())
      setMovimenti(await resMov.json())
      setLuoghi(await resLuoghi.json())
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  function calcSaldo(c: Cassa) {
    return c.movimenti.reduce((acc, m) => m.tipo === 'entrata' ? acc + m.importo : acc - m.importo, c.saldoIniziale)
  }

  function calcSaldoPerLuogo(luogoId: number | null) {
    return casse.reduce((acc, c) => {
      const movimentiLuogo = c.movimenti.filter(m => m.luogoId === luogoId)
      return acc + movimentiLuogo.reduce((a, m) => m.tipo === 'entrata' ? a + m.importo : a - m.importo, 0)
    }, 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        cassaId: parseInt(form.cassaId),
        luogoId: form.luogoId ? parseInt(form.luogoId) : null,
        tipo: form.tipo,
        importo: parseFloat(form.importo),
        categoria: form.categoria || null,
        descrizione: form.descrizione || null
      }
      const res = await fetch('/api/cassa/movimenti', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ cassaId: '', tipo: 'entrata', importo: '', luogoId: '', categoria: '', descrizione: '' })
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Cassa" description="Cassa aziendale con sottocontabilità per luogo" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuovo Movimento</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {casse.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-lg bg-primary-50 p-2 text-primary-600"><Wallet className="w-5 h-5" /></div>
                    <h3 className="font-semibold text-gray-900">{c.nome}</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatEuro(calcSaldo(c))}</p>
                  <p className="text-xs text-gray-500 mt-1">Saldo attuale</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {luoghi.map((l) => (
              <Card key={l.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <h4 className="text-sm font-medium text-gray-900">{l.nome}</h4>
                    <Badge variant="default" className="text-[10px] px-1.5">{l.tipo}</Badge>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{formatEuro(calcSaldoPerLuogo(l.id))}</p>
                  <p className="text-xs text-gray-500">Saldo {l.nome}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><h3 className="font-semibold">Movimenti</h3></CardHeader>
            <CardContent className="p-0">
              <Table>
                <Thead>
                  <Tr><Th>Data</Th><Th>Cassa</Th><Th>Luogo</Th><Th>Tipo</Th><Th>Importo</Th><Th>Categoria</Th><Th>Descrizione</Th></Tr>
                </Thead>
                <Tbody>
                  {movimenti.map((m) => (
                    <Tr key={m.id}>
                      <Td>{formatDate(m.data)}</Td>
                      <Td>{m.cassa.nome}</Td>
                      <Td>{m.luogo ? <><span className="font-medium text-xs">{m.luogo.nome}</span> <Badge variant="default" className="text-[10px] px-1">{m.luogo.tipo}</Badge></> : '-'}</Td>
                      <Td><Badge variant={m.tipo === 'entrata' ? 'success' : 'danger'}>{m.tipo === 'entrata' ? 'Entrata' : 'Uscita'}</Badge></Td>
                      <Td className="font-medium">{formatEuro(m.importo)}</Td>
                      <Td>{m.categoria || '-'}</Td>
                      <Td>{m.descrizione || '-'}</Td>
                    </Tr>
                  ))}
                  {movimenti.length === 0 && <Tr><Td colSpan={7} className="text-center text-gray-500 py-8">Nessun movimento trovato</Td></Tr>}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Movimento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Cassa</label>
              <Select value={form.cassaId} onChange={(e) => setForm({ ...form, cassaId: e.target.value })} required>
                <option value="">Seleziona...</option>
                {casse.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Tipo</label>
              <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="entrata">Entrata</option>
                <option value="uscita">Uscita</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Luogo/Settore</label>
              <Select value={form.luogoId} onChange={(e) => setForm({ ...form, luogoId: e.target.value })}>
                <option value="">Seleziona...</option>
                {luoghi.map((l) => <option key={l.id} value={l.id}>{l.nome} ({l.tipo})</option>)}
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Importo (€)</label><Input type="number" step="0.01" min="0" value={form.importo} onChange={(e) => setForm({ ...form, importo: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Categoria</label>
              <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                <option value="">Seleziona...</option>
                <option value="Vendite">Vendite</option>
                <option value="Spese">Spese</option>
                <option value="Stipendi">Stipendi</option>
                <option value="Fornitori">Fornitori</option>
                <option value="Manutenzione">Manutenzione</option>
                <option value="Altro">Altro</option>
              </Select>
            </div>
            <div />
          </div>
          <div><label className="text-sm font-medium block mb-1">Descrizione</label><Input value={form.descrizione} onChange={(e) => setForm({ ...form, descrizione: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
