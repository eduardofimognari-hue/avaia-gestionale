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
import { Plus, Sprout, MapPin, User } from 'lucide-react'
import { ExportButton } from '@/components/ui/export-button'
import { formatDate, formatNumber } from '@/lib/utils'

type Raccolta = {
  id: number
  data: string
  prodotto: { id: number; nome: string; varietaTipologia: string | null; unitaMisura: string }
  quantita: number
  unitaMisura: string
  luogo: { id: number; nome: string } | null
  terreno: { id: number; nome: string } | null
  socio: { id: number; nome: string; cognome: string } | null
  note: string | null
}

type Prodotto = { id: number; nome: string; varietaTipologia: string | null; unitaMisura: string }
type Luogo = { id: number; nome: string }
type Terreno = { id: number; nome: string; luogoId: number | null; luogo: { id: number; nome: string } | null }
type Socio = { id: number; nome: string; cognome: string }

export default function RaccoltaPage() {
  const [raccolte, setRaccolte] = useState<Raccolta[]>([])
  const [prodotti, setProdotti] = useState<Prodotto[]>([])
  const [totali, setTotali] = useState<{ prodottoId: number; _sum: { quantita: number | null } }[]>([])
  const [prodottiList, setProdottiList] = useState<Prodotto[]>([])
  const [luoghi, setLuoghi] = useState<Luogo[]>([])
  const [terreni, setTerreni] = useState<Terreno[]>([])
  const [soci, setSoci] = useState<Socio[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    data: '', prodottoId: '', quantita: '', unitaMisura: 'kg',
    luogoId: '', terrenoId: '', socioId: '', note: '',
  })

  // Stacchi filtrati per il luogo selezionato
  const stacchiFiltrati = form.luogoId
    ? terreni.filter(t => t.luogoId === parseInt(form.luogoId))
    : terreni

  async function fetchData() {
    try {
      setLoading(true)
      const [resRaccolta, resProdotti, resLuoghi, resTerreni, resSoci] = await Promise.all([
        fetch('/api/raccolta'),
        fetch('/api/prodotti'),
        fetch('/api/luoghi'),
        fetch('/api/terreni'),
        fetch('/api/soci'),
      ])
      if (!resRaccolta.ok || !resProdotti.ok || !resLuoghi.ok || !resTerreni.ok || !resSoci.ok) throw new Error()
      const dataR = await resRaccolta.json()
      setRaccolte(dataR.raccolte)
      setTotali(dataR.totali)
      setProdotti(dataR.prodotti)
      setProdottiList(await resProdotti.json())
      setLuoghi(await resLuoghi.json())
      setTerreni(await resTerreni.json())
      setSoci(await resSoci.json())
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  // Quando cambia il luogo, azzera lo stacco se non compatibile
  function handleLuogoChange(luogoId: string) {
    const terrenoAttuale = terreni.find(t => t.id === parseInt(form.terrenoId))
    const terrenoCompatibile = terrenoAttuale && terrenoAttuale.luogoId === parseInt(luogoId)
    setForm(f => ({ ...f, luogoId, terrenoId: terrenoCompatibile ? f.terrenoId : '' }))
  }

  function getProdottoInfo(prodottoId: number) {
    return prodotti.find(p => p.id === prodottoId)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        data: form.data || new Date().toISOString().split('T')[0],
        prodottoId: parseInt(form.prodottoId),
        quantita: parseFloat(form.quantita),
        unitaMisura: form.unitaMisura,
        luogoId: form.luogoId ? parseInt(form.luogoId) : null,
        terrenoId: form.terrenoId ? parseInt(form.terrenoId) : null,
        socioId: form.socioId ? parseInt(form.socioId) : null,
        note: form.note || null,
      }
      const res = await fetch('/api/raccolta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      setModalOpen(false)
      setForm({ data: '', prodottoId: '', quantita: '', unitaMisura: 'kg', luogoId: '', terrenoId: '', socioId: '', note: '' })
      await fetchData()
    } catch (err: any) { setError(err.message || 'Errore') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader
        title="Raccolta"
        description="Registrazione raccolte prodotti freschi"
        action={
          <div className="flex items-center gap-2">
            <ExportButton risorsa="raccolta" />
            <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuova Raccolta</Button>
          </div>
        }
      />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : (
        <>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Totali raccolti</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {totali.map((t) => {
              const info = getProdottoInfo(t.prodottoId)
              if (!info) return null
              return (
                <Card key={t.prodottoId}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Sprout className="w-4 h-4 text-green-500" />
                      <h4 className="text-sm font-medium text-gray-900">{info.nome}{info.varietaTipologia ? ` - ${info.varietaTipologia}` : ''}</h4>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{formatNumber(Number(t._sum.quantita || 0))} {info.unitaMisura}</p>
                  </CardContent>
                </Card>
              )
            })}
            {totali.length === 0 && (
              <Card><CardContent className="p-4 text-gray-400">Nessuna raccolta registrata</CardContent></Card>
            )}
          </div>

          <Card>
            <CardHeader><h3 className="font-semibold">Registrazioni</h3></CardHeader>
            <CardContent className="p-0">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Data</Th>
                    <Th>Prodotto</Th>
                    <Th>Quantità</Th>
                    <Th>Luogo (fondo)</Th>
                    <Th>Stacco produttivo</Th>
                    <Th>Socio</Th>
                    <Th>Note</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {raccolte.map((r) => (
                    <Tr key={r.id}>
                      <Td>{formatDate(r.data)}</Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          <Sprout className="w-3.5 h-3.5 text-green-500" />
                          <span>{r.prodotto.nome}{r.prodotto.varietaTipologia ? ` (${r.prodotto.varietaTipologia})` : ''}</span>
                        </div>
                      </Td>
                      <Td className="font-medium">{formatNumber(r.quantita)} {r.unitaMisura}</Td>
                      <Td>{r.luogo ? <><MapPin className="w-3 h-3 inline mr-1 text-gray-400" />{r.luogo.nome}</> : '-'}</Td>
                      <Td>{r.terreno ? <Badge variant="default">{r.terreno.nome}</Badge> : '-'}</Td>
                      <Td>{r.socio ? <><User className="w-3 h-3 inline mr-1 text-gray-400" />{r.socio.nome} {r.socio.cognome}</> : '-'}</Td>
                      <Td className="text-gray-500 text-xs">{r.note || '-'}</Td>
                    </Tr>
                  ))}
                  {raccolte.length === 0 && <Tr><Td colSpan={7} className="text-center text-gray-500 py-8">Nessuna raccolta registrata</Td></Tr>}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuova Raccolta">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Data</label>
              <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Prodotto</label>
              <Select value={form.prodottoId} onChange={e => setForm({ ...form, prodottoId: e.target.value })} required>
                <option value="">Seleziona...</option>
                {prodottiList.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}{p.varietaTipologia ? ` - ${p.varietaTipologia}` : ''}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Quantità</label>
              <Input type="number" step="0.01" min="0" value={form.quantita} onChange={e => setForm({ ...form, quantita: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Unità misura</label>
              <Select value={form.unitaMisura} onChange={e => setForm({ ...form, unitaMisura: e.target.value })}>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">litri</option>
                <option value="pezzi">pezzi</option>
                <option value="cassette">cassette</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Luogo / Fondo</label>
              <Select value={form.luogoId} onChange={e => handleLuogoChange(e.target.value)}>
                <option value="">Seleziona...</option>
                {luoghi.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">
                Stacco produttivo
                {form.luogoId && stacchiFiltrati.length === 0 && <span className="text-xs text-amber-500 ml-1">(nessuno per questo fondo)</span>}
              </label>
              <Select value={form.terrenoId} onChange={e => setForm({ ...form, terrenoId: e.target.value })}>
                <option value="">Nessuno</option>
                {stacchiFiltrati.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Socio raccoglitore</label>
            <Select value={form.socioId} onChange={e => setForm({ ...form, socioId: e.target.value })}>
              <option value="">Seleziona...</option>
              {soci.map((s) => <option key={s.id} value={s.id}>{s.nome} {s.cognome}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Note</label>
            <Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
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
