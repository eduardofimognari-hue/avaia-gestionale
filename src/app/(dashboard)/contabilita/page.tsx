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
import { Plus, Landmark, MapPin, User, ArrowUpDown, Download } from 'lucide-react'
import { formatDate, formatEuro } from '@/lib/utils'
import Link from 'next/link'

type Cassa = {
  id: number
  nome: string
  saldoIniziale: number
  movimenti: { tipo: string; importo: number; luogoId: number | null }[]
}

type Luogo = { id: number; nome: string; tipo: string }
type Socio = { id: number; nome: string; cognome: string }

type Movimento = {
  id: number
  data: string
  cassa: { nome: string }
  luogo: { id: number; nome: string; tipo: string } | null
  socio: { id: number; nome: string; cognome: string } | null
  tipo: string
  tipoMovimento: string
  importo: number
  categoria: string | null
  descrizione: string | null
}

const TIPI_MOVIMENTO: Record<string, { label: string; icon: string; color: string }> = {
  spesa: { label: 'Spesa', icon: '💸', color: 'red' },
  entrata_generica: { label: 'Entrata generica', icon: '💰', color: 'green' },
  anticipo_socio: { label: 'Anticipo socio', icon: '🤝', color: 'blue' },
  rimborso_socio: { label: 'Rimborso socio', icon: '↩️', color: 'amber' },
  anticipo_azienda: { label: 'Anticipo azienda', icon: '🏢', color: 'purple' },
  rimborso_azienda: { label: 'Rimborso azienda', icon: '🔙', color: 'teal' },
  stipendio: { label: 'Stipendio', icon: '💼', color: 'indigo' },
  fornitore: { label: 'Fornitore', icon: '📦', color: 'orange' },
  liquidazione: { label: 'Liquidazione', icon: '📄', color: 'pink' },
  altro: { label: 'Altro', icon: '📌', color: 'gray' },
}

export default function ContabilitaPage() {
  const [casse, setCasse] = useState<Cassa[]>([])
  const [movimenti, setMovimenti] = useState<Movimento[]>([])
  const [luoghi, setLuoghi] = useState<Luogo[]>([])
  const [soci, setSoci] = useState<Socio[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filtroLuogo, setFiltroLuogo] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [form, setForm] = useState({
    cassaId: '', tipo: 'entrata', tipoMovimento: 'spesa', importo: '',
    luogoId: '', socioId: '', categoria: '', descrizione: '', riferimento: '',
  })

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

  const totaleEntrate = movimenti.filter(m => m.tipo === 'entrata').reduce((a, m) => a + m.importo, 0)
  const totaleUscite = movimenti.filter(m => m.tipo === 'uscita').reduce((a, m) => a + m.importo, 0)

  const movimentiFiltrati = movimenti.filter(m => {
    if (filtroLuogo && (!m.luogo || m.luogo.id !== parseInt(filtroLuogo))) return false
    if (filtroTipo && m.tipoMovimento !== filtroTipo) return false
    return true
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body: any = {
        cassaId: parseInt(form.cassaId),
        tipo: form.tipo,
        tipoMovimento: form.tipoMovimento,
        importo: parseFloat(form.importo),
        luogoId: form.luogoId ? parseInt(form.luogoId) : null,
        socioId: form.socioId ? parseInt(form.socioId) : null,
        categoria: form.categoria || null,
        descrizione: form.descrizione || null,
        riferimento: form.riferimento || null,
      }
      const res = await fetch('/api/contabilita', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ cassaId: '', tipo: 'entrata', tipoMovimento: 'spesa', importo: '', luogoId: '', socioId: '', categoria: '', descrizione: '', riferimento: '' })
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  function getTipoBadgeColor(tipo: string) {
    const info = TIPI_MOVIMENTO[tipo]
    if (!info) return 'default' as const
    const map: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
      red: 'danger', green: 'success', amber: 'warning', orange: 'warning',
      blue: 'info', purple: 'info', teal: 'info', indigo: 'info', pink: 'info', gray: 'default',
    }
    return map[info.color] || 'default'
  }

  return (
    <div>
      <PageHeader
        title="Contabilità"
        description="Registro unico movimenti economici con sottocontabilità per luogo"
        action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuovo Movimento</Button>}
      />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : (
        <>
          {/* Riepilogo mensile */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Entrate</p>
                <p className="text-2xl font-bold text-green-600">{formatEuro(totaleEntrate)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Uscite</p>
                <p className="text-2xl font-bold text-red-600">{formatEuro(totaleUscite)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Saldo netto</p>
                <p className={`text-2xl font-bold ${totaleEntrate - totaleUscite >= 0 ? 'text-primary-600' : 'text-red-600'}`}>
                  {formatEuro(totaleEntrate - totaleUscite)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Casse cards */}
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Casse / Conti</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {casse.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-lg bg-primary-50 p-2 text-primary-600"><Landmark className="w-5 h-5" /></div>
                    <h3 className="font-semibold text-gray-900">{c.nome}</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatEuro(calcSaldo(c))}</p>
                  <p className="text-xs text-gray-500 mt-1">Saldo attuale</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Luogo cards (clickabili) */}
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Sottocontabilità per Luogo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {luoghi.map((l) => (
              <Link key={l.id} href={`/contabilita/luogo/${l.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
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
              </Link>
            ))}
          </div>

          {/* Movimenti con filtri */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-semibold">Movimenti</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={filtroLuogo}
                    onChange={e => setFiltroLuogo(e.target.value)}
                    className="text-sm border rounded-lg px-2 py-1.5 bg-white"
                  >
                    <option value="">Tutti i luoghi</option>
                    {luoghi.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                  <select
                    value={filtroTipo}
                    onChange={e => setFiltroTipo(e.target.value)}
                    className="text-sm border rounded-lg px-2 py-1.5 bg-white"
                  >
                    <option value="">Tutti i tipi</option>
                    {Object.entries(TIPI_MOVIMENTO).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Data</Th>
                    <Th>Cassa</Th>
                    <Th>Luogo</Th>
                    <Th>Tipo</Th>
                    <Th>Movimento</Th>
                    <Th>Socio</Th>
                    <Th>Importo</Th>
                    <Th>Categoria</Th>
                    <Th>Descrizione</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {movimentiFiltrati.map((m) => (
                    <Tr key={m.id}>
                      <Td>{formatDate(m.data)}</Td>
                      <Td>{m.cassa.nome}</Td>
                      <Td>{m.luogo ? <><span className="font-medium text-xs">{m.luogo.nome}</span> <Badge variant="default" className="text-[10px] px-1">{m.luogo.tipo}</Badge></> : '-'}</Td>
                      <Td><Badge variant={m.tipo === 'entrata' ? 'success' : 'danger'}>{m.tipo === 'entrata' ? 'Entrata' : 'Uscita'}</Badge></Td>
                      <Td>
                        <Badge variant={getTipoBadgeColor(m.tipoMovimento)} className="text-xs">
                          {TIPI_MOVIMENTO[m.tipoMovimento]?.label || m.tipoMovimento}
                        </Badge>
                      </Td>
                      <Td>{m.socio ? `${m.socio.nome} ${m.socio.cognome}` : '-'}</Td>
                      <Td className="font-medium">{formatEuro(m.importo)}</Td>
                      <Td>{m.categoria || '-'}</Td>
                      <Td>{m.descrizione || '-'}</Td>
                    </Tr>
                  ))}
                  {movimentiFiltrati.length === 0 && <Tr><Td colSpan={9} className="text-center text-gray-500 py-8">Nessun movimento trovato</Td></Tr>}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Movimento Contabile">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Cassa/Conto</label>
              <Select value={form.cassaId} onChange={(e) => setForm({ ...form, cassaId: e.target.value })} required>
                <option value="">Seleziona...</option>
                {casse.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Tipo movimento</label>
              <select
                value={form.tipoMovimento}
                onChange={(e) => {
                  const val = e.target.value
                  const direzione: Record<string, string> = {
                    spesa: 'uscita', entrata_generica: 'entrata',
                    anticipo_socio: 'entrata', rimborso_socio: 'uscita',
                    anticipo_azienda: 'uscita', rimborso_azienda: 'entrata',
                    stipendio: 'uscita', fornitore: 'uscita',
                    liquidazione: 'uscita', altro: 'entrata',
                  }
                  setForm({ ...form, tipoMovimento: val, tipo: direzione[val] || 'entrata' })
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              >
                {Object.entries(TIPI_MOVIMENTO).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Direzione</label>
              <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="entrata">Entrata 💰</option>
                <option value="uscita">Uscita 💸</option>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Importo (€)</label>
              <Input type="number" step="0.01" min="0" value={form.importo}
                onChange={(e) => setForm({ ...form, importo: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Luogo/Settore</label>
              <Select value={form.luogoId} onChange={(e) => setForm({ ...form, luogoId: e.target.value })}>
                <option value="">Seleziona...</option>
                {luoghi.map((l) => <option key={l.id} value={l.id}>{l.nome} ({l.tipo})</option>)}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Socio (opzionale)</label>
              <Select value={form.socioId} onChange={(e) => setForm({ ...form, socioId: e.target.value })}>
                <option value="">Seleziona...</option>
                {soci.map((s) => <option key={s.id} value={s.id}>{s.nome} {s.cognome}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Categoria</label>
              <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                <option value="">Seleziona...</option>
                <option value="Vendite">Vendite</option>
                <option value="Spese">Spese</option>
                <option value="Stipendi">Stipendi</option>
                <option value="Fornitori">Fornitori</option>
                <option value="Manutenzione">Manutenzione</option>
                <option value="Materiali">Materiali</option>
                <option value="Viaggio">Viaggio</option>
                <option value="Utenze">Utenze</option>
                <option value="Altro">Altro</option>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Riferimento</label>
              <Input value={form.riferimento} onChange={(e) => setForm({ ...form, riferimento: e.target.value })} placeholder="Fattura, DDT, ecc." />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Descrizione</label>
            <Input value={form.descrizione} onChange={(e) => setForm({ ...form, descrizione: e.target.value })} />
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
