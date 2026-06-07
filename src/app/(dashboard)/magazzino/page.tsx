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
import { Plus } from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/utils'

type Prodotto = { id: number; nome: string; varietaTipologia: string | null; tipo: string; unitaMisura: string }

type Movimento = {
  id: number
  data: string
  prodotto: Prodotto
  tipo: string
  quantita: number
  unitaMisura: string
  note: string | null
}

type Giacenza = { prodottoId: number; nome: string; varieta: string | null; giacenza: number; unitaMisura: string }

export default function MagazzinoPage() {
  const [movimenti, setMovimenti] = useState<Movimento[]>([])
  const [prodotti, setProdotti] = useState<Prodotto[]>([])
  const [giacenze, setGiacenze] = useState<Giacenza[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'movimenti' | 'giacenze'>('giacenze')
  const [luoghi, setLuoghi] = useState<{ id: number; nome: string }[]>([])
  const [terreni, setTerreni] = useState<{ id: number; nome: string; luogoId: number | null }[]>([])
  const [form, setForm] = useState({ data: '', prodottoId: '', tipo: 'carico', quantita: '', unitaMisura: 'kg', luogoId: '', terrenoId: '', note: '' })

  async function fetchData() {
    try {
      setLoading(true)
      const [resMov, resProd, resLuoghi, resTerreni] = await Promise.all([
        fetch('/api/magazzino'),
        fetch('/api/prodotti'),
        fetch('/api/luoghi'),
        fetch('/api/terreni'),
      ])
      if (!resMov.ok || !resProd.ok) throw new Error()
      setMovimenti(await resMov.json())
      setProdotti(await resProd.json())
      if (resLuoghi.ok) setLuoghi(await resLuoghi.json())
      if (resTerreni.ok) setTerreni(await resTerreni.json())
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  async function fetchGiacenze() {
    try {
      const res = await fetch('/api/magazzino/giacenze')
      const data = await res.json()
      setGiacenze(data.giacenze || [])
    } catch {}
  }

  useEffect(() => {
    fetchData()
    fetchGiacenze()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        data: new Date(form.data).toISOString(),
        prodottoId: parseInt(form.prodottoId),
        tipo: form.tipo,
        quantita: parseFloat(form.quantita),
        unitaMisura: form.unitaMisura,
        luogoId: form.luogoId ? parseInt(form.luogoId) : null,
        terrenoId: form.terrenoId ? parseInt(form.terrenoId) : null,
        note: form.note || null
      }
      const res = await fetch('/api/magazzino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ data: '', prodottoId: '', tipo: 'carico', quantita: '', unitaMisura: 'kg', luogoId: '', terrenoId: '', note: '' })
      await fetchData()
      await fetchGiacenze()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Magazzino" description="Giacenze e movimenti" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuovo Movimento</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="flex gap-2 mb-4">
        <Button variant={tab === 'giacenze' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('giacenze')}>Giacenze</Button>
        <Button variant={tab === 'movimenti' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('movimenti')}>Movimenti</Button>
      </div>

      {loading ? <p className="text-gray-500">Caricamento...</p> : (
        <>
          {tab === 'giacenze' && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <Thead>
                    <Tr><Th>Prodotto</Th><Th>Varietà</Th><Th>Tipo</Th><Th>Giacenza</Th></Tr>
                  </Thead>
                  <Tbody>
                    {giacenze.map((g) => (
                      <Tr key={g.prodottoId}>
                        <Td className="font-medium">{g.nome}</Td>
                        <Td>{g.varieta || '-'}</Td>
                        <Td><Badge variant={g.giacenza > 0 ? 'success' : 'warning'}>{g.giacenza > 0 ? 'Disponibile' : 'Esaurito'}</Badge></Td>
                        <Td className="font-bold">{formatNumber(g.giacenza)} {g.unitaMisura}</Td>
                      </Tr>
                    ))}
                    {giacenze.length === 0 && <Tr><Td colSpan={4} className="text-center text-gray-500 py-8">Nessun prodotto trovato</Td></Tr>}
                  </Tbody>
                </Table>
              </CardContent>
            </Card>
          )}

          {tab === 'movimenti' && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <Thead>
                    <Tr><Th>Data</Th><Th>Prodotto</Th><Th>Tipo</Th><Th>Quantità</Th><Th>Note</Th></Tr>
                  </Thead>
                  <Tbody>
                    {movimenti.map((m) => (
                      <Tr key={m.id}>
                        <Td className="whitespace-nowrap">{formatDate(m.data)}</Td>
                        <Td className="font-medium">
                          {m.prodotto.nome}
                          {m.prodotto.varietaTipologia ? <span className="text-gray-500 text-xs ml-1">- {m.prodotto.varietaTipologia}</span> : ''}
                        </Td>
                        <Td><Badge variant={m.tipo === 'carico' || m.tipo === 'reso' ? 'success' : 'danger'}>{m.tipo}</Badge></Td>
                        <Td>{formatNumber(m.quantita)} {m.unitaMisura}</Td>
                        <Td className="text-gray-500 text-sm">{m.note || '-'}</Td>
                      </Tr>
                    ))}
                    {movimenti.length === 0 && <Tr><Td colSpan={5} className="text-center text-gray-500 py-8">Nessun movimento trovato</Td></Tr>}
                  </Tbody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Movimento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Data</label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required /></div>
            <div><label className="text-sm font-medium block mb-1">Prodotto</label>
              <Select value={form.prodottoId} onChange={(e) => setForm({ ...form, prodottoId: e.target.value })} required>
                <option value="">Seleziona...</option>
                {prodotti.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.varietaTipologia ? ` - ${p.varietaTipologia}` : ''}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Tipo</label>
              <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="carico">Carico</option>
                <option value="scarico">Scarico</option>
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Quantità</label><Input type="number" step="0.01" min="0" value={form.quantita} onChange={(e) => setForm({ ...form, quantita: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Unità Misura</label>
              <Select value={form.unitaMisura} onChange={(e) => setForm({ ...form, unitaMisura: e.target.value })}>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="pezzi">pezzi</option>
                <option value="litri">litri</option>
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Note</label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          </div>
          {form.tipo === 'carico' && (
            <div className="grid grid-cols-2 gap-4 border-t pt-3">
              <div>
                <label className="text-sm font-medium block mb-1">Provenienza — Fondo</label>
                <Select value={form.luogoId} onChange={(e) => setForm({ ...form, luogoId: e.target.value, terrenoId: '' })}>
                  <option value="">Nessuno</option>
                  {luoghi.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Provenienza — Stacco</label>
                <Select value={form.terrenoId} onChange={(e) => setForm({ ...form, terrenoId: e.target.value })}>
                  <option value="">Nessuno</option>
                  {(form.luogoId ? terreni.filter(t => t.luogoId === parseInt(form.luogoId)) : terreni).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </Select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
