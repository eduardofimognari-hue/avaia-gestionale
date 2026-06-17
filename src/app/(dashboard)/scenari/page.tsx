'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'
import { Plus, TrendingUp, Trash2, ChevronRight } from 'lucide-react'

type Scenario = {
  id: number
  nome: string
  descrizione: string | null
  annoInizio: number
  annoFine: number
  stato: string
  creatoIl: string
  _count: { uscite: number; entrate: number; obiettivi: number }
}

const STATO_LABELS: Record<string, string> = { bozza: 'Bozza', attivo: 'Attivo', archiviato: 'Archiviato' }
const STATO_VARIANT: Record<string, 'default' | 'success' | 'info'> = {
  bozza: 'default', attivo: 'success', archiviato: 'info',
}

const currentYear = new Date().getFullYear()
const emptyForm = { nome: '', descrizione: '', annoInizio: String(currentYear), annoFine: String(currentYear + 1), stato: 'bozza' }

export default function ScenariPage() {
  const router = useRouter()
  const [data, setData] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  async function fetchData() {
    try {
      setLoading(true)
      const res = await fetch('/api/scenari')
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch { setError('Errore caricamento scenari') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (parseInt(form.annoFine) < parseInt(form.annoInizio)) {
      setError("L'anno di fine deve essere >= anno di inizio")
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/scenari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setModalOpen(false)
      setForm(emptyForm)
      router.push(`/scenari/${created.id}`)
    } catch { setError('Errore durante la creazione') }
    finally { setSaving(false) }
  }

  async function handleDelete(s: Scenario, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Eliminare lo scenario "${s.nome}"? Saranno eliminate anche tutte le uscite, entrate e obiettivi.`)) return
    try {
      await fetch(`/api/scenari/${s.id}`, { method: 'DELETE' })
      await fetchData()
    } catch { setError('Errore durante l\'eliminazione') }
  }

  return (
    <div>
      <PageHeader
        title="Scenari Previsionali"
        description="Pianifica entrate e uscite future, definisci obiettivi e confronta con i dati reali"
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Nuovo Scenario
          </Button>
        }
      />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? <p className="text-gray-500">Caricamento...</p> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr>
                  <Th>Nome</Th>
                  <Th>Periodo</Th>
                  <Th>Stato</Th>
                  <Th>Voci</Th>
                  <Th className="w-24">Azioni</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.map(s => (
                  <Tr key={s.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/scenari/${s.id}`)}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0" />
                        <div>
                          <p className="font-medium">{s.nome}</p>
                          {s.descrizione && <p className="text-xs text-gray-500">{s.descrizione}</p>}
                        </div>
                      </div>
                    </Td>
                    <Td className="text-gray-600">
                      {s.annoInizio === s.annoFine ? s.annoInizio : `${s.annoInizio} – ${s.annoFine}`}
                    </Td>
                    <Td>
                      <Badge variant={STATO_VARIANT[s.stato] ?? 'default'}>{STATO_LABELS[s.stato] ?? s.stato}</Badge>
                    </Td>
                    <Td className="text-sm text-gray-500">
                      {s._count.uscite} uscite · {s._count.entrate} entrate · {s._count.obiettivi} obiettivi
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={e => handleDelete(s, e)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </Td>
                  </Tr>
                ))}
                {data.length === 0 && (
                  <Tr>
                    <Td colSpan={5} className="text-center text-gray-500 py-12">
                      <TrendingUp className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                      <p className="font-medium">Nessuno scenario creato</p>
                      <p className="text-sm mt-1">Crea il primo scenario previsionale per pianificare entrate e uscite</p>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setForm(emptyForm) }} title="Nuovo Scenario Previsionale">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Nome scenario *</label>
            <Input
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              placeholder="Es. Piano 2025-2027, Scenario ottimistico..."
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Descrizione</label>
            <Input
              value={form.descrizione}
              onChange={e => setForm({ ...form, descrizione: e.target.value })}
              placeholder="Descrizione opzionale..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Anno inizio *</label>
              <Input
                type="number"
                min={2020}
                max={2050}
                value={form.annoInizio}
                onChange={e => setForm({ ...form, annoInizio: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Anno fine *</label>
              <Input
                type="number"
                min={2020}
                max={2050}
                value={form.annoFine}
                onChange={e => setForm({ ...form, annoFine: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Stato</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.stato}
              onChange={e => setForm({ ...form, stato: e.target.value })}
            >
              <option value="bozza">Bozza</option>
              <option value="attivo">Attivo</option>
              <option value="archiviato">Archiviato</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); setForm(emptyForm) }}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creazione...' : 'Crea Scenario'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
