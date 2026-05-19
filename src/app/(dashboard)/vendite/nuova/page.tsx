'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/page-header'
import { Trash2, Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Prodotto { id: number; nome: string; varietaTipologia: string | null; tipo: string }
interface Cliente { id: number; nome: string; cognome: string | null; tipo: string }
interface Riga { prodottoId: number; prodottoNome: string; formato: string; quantita: number; prezzoUnitario: number; disponibile: number }

export default function NuovaVenditaPage() {
  const router = useRouter()
  const [prodotti, setProdotti] = useState<Prodotto[]>([])
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [clienteId, setClienteId] = useState('')
  const [tipoCliente, setTipoCliente] = useState('Privato')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [righe, setRighe] = useState<Riga[]>([{ prodottoId: 0, prodottoNome: '', formato: 'kg', quantita: 1, prezzoUnitario: 0, disponibile: 0 }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/prodotti').then(r => r.json()),
      fetch('/api/clienti').then(r => r.json()),
    ]).then(([p, c]) => {
      setProdotti(p.filter((x: Prodotto) => x.tipo === 'prodotto'))
      setClienti(c)
    })
  }, [])

  async function cercaPrezzo(prodottoId: number, formato: string, tipo: string) {
    try {
      const res = await fetch(`/api/listino/prezzo?prodottoId=${prodottoId}&tipoCliente=${tipo}&formato=${encodeURIComponent(formato)}`)
      const data = await res.json()
      return data.prezzo ?? 0
    } catch { return 0 }
  }

  async function cercaDisponibilita(prodottoId: number) {
    try {
      const res = await fetch(`/api/magazzino/giacenza?prodottoId=${prodottoId}`)
      const data = await res.json()
      return data.giacenza ?? 0
    } catch { return 0 }
  }

  async function handleProdottoChange(idx: number, prodottoId: number) {
    const p = prodotti.find(x => x.id === prodottoId)
    if (!p) return
    const righe2 = [...righe]
    righe2[idx] = {
      ...righe2[idx],
      prodottoId,
      prodottoNome: `${p.nome}${p.varietaTipologia ? ' - ' + p.varietaTipologia : ''}`,
      prezzoUnitario: 0,
      disponibile: 0,
    }
    setRighe(righe2)
    const [prezzo, disp] = await Promise.all([
      cercaPrezzo(prodottoId, righe2[idx].formato, tipoCliente),
      cercaDisponibilita(prodottoId),
    ])
    righe2[idx].prezzoUnitario = prezzo
    righe2[idx].disponibile = disp
    setRighe([...righe2])
  }

  function aggiungiRiga() { setRighe([...righe, { prodottoId: 0, prodottoNome: '', formato: 'kg', quantita: 1, prezzoUnitario: 0, disponibile: 0 }]) }
  function rimuoviRiga(idx: number) { if (righe.length > 1) setRighe(righe.filter((_, i) => i !== idx)) }

  async function aggiornaRiga(idx: number, field: keyof Riga, value: string | number) {
    const righe2 = [...righe]
    const r = righe2[idx]
    if (field === 'prodottoId') r.prodottoId = Number(value)
    else if (field === 'prodottoNome') r.prodottoNome = String(value)
    else if (field === 'formato') r.formato = String(value)
    else if (field === 'quantita') r.quantita = Number(value)
    else if (field === 'prezzoUnitario') r.prezzoUnitario = Number(value)
    else if (field === 'disponibile') r.disponibile = Number(value)
    if (field === 'formato' && r.prodottoId) {
      const prezzo = await cercaPrezzo(r.prodottoId, r.formato, tipoCliente)
      r.prezzoUnitario = prezzo
    }
    setRighe([...righe2])
  }

  const totale = righe.reduce((s, r) => s + r.quantita * r.prezzoUnitario, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/vendite/nuova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          clienteId: clienteId ? Number(clienteId) : null,
          tipoCliente,
          righe: righe.map(r => ({ prodottoId: r.prodottoId, formato: r.formato, quantita: r.quantita, prezzoUnitario: r.prezzoUnitario })),
        }),
      })
      if (!res.ok) throw new Error('Errore nel salvataggio')
      router.push('/vendite')
      router.refresh()
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div>
      <PageHeader title="Nuova Vendita" action={
        <Link href="/vendite"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Indietro</Button></Link>
      } />

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

        <Card>
          <CardHeader><h3 className="font-semibold">Dati Vendita</h3></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={data} onChange={e => setData(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Tipo Cliente</Label>
                <Select value={tipoCliente} onChange={e => {
                  setTipoCliente(e.target.value)
                  righe.forEach((r, i) => { if (r.prodottoId) aggiornaRiga(i, 'formato', r.formato) })
                }}>
                  <option value="Privato">Privato</option>
                  <option value="Ingrosso">Ingrosso</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={clienteId} onChange={e => setClienteId(e.target.value)}>
                  <option value="">-- Generico --</option>
                  {clienti.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} {c.cognome || ''} ({c.tipo})</option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="font-semibold">Prodotti Venduti</h3>
            <Button type="button" variant="outline" size="sm" onClick={aggiungiRiga}>
              <Plus className="w-4 h-4 mr-1" /> Aggiungi
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {righe.map((riga, idx) => (
              <div key={idx} className="flex gap-3 items-end border-b pb-4 last:border-0">
                <div className="flex-[2] space-y-2">
                  <Label>Prodotto</Label>
                  <Select value={riga.prodottoId || ''} onChange={e => handleProdottoChange(idx, Number(e.target.value))}>
                    <option value="">-- Seleziona --</option>
                    {prodotti.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} {p.varietaTipologia || ''}</option>
                    ))}
                  </Select>
                  {riga.disponibile > 0 && <p className="text-xs text-gray-500">Disponibile: <strong>{riga.disponibile}</strong></p>}
                  {riga.disponibile === 0 && riga.prodottoId > 0 && <p className="text-xs text-amber-600">Non disponibile in magazzino</p>}
                </div>
                <div className="w-28 space-y-2">
                  <Label>Formato</Label>
                  <Select value={riga.formato} onChange={e => aggiornaRiga(idx, 'formato', e.target.value)}>
                    <option value="kg">kg</option>
                    <option value="vasetto 250g">vasetto 250g</option>
                    <option value="vasetto 500g">vasetto 500g</option>
                    <option value="vasetto 1kg">vasetto 1kg</option>
                    <option value="kg sfuso">kg sfuso</option>
                    <option value="cassetta">cassetta</option>
                    <option value="l">litro</option>
                  </Select>
                </div>
                <div className="w-20 space-y-2">
                  <Label>Qtà</Label>
                  <Input type="number" step="0.01" min="0.01" value={riga.quantita} onChange={e => aggiornaRiga(idx, 'quantita', Number(e.target.value))} />
                </div>
                <div className="w-28 space-y-2">
                  <Label>€/prezzo</Label>
                  <Input type="number" step="0.01" min="0" value={riga.prezzoUnitario}
                    onChange={e => aggiornaRiga(idx, 'prezzoUnitario', Number(e.target.value))}
                    className={riga.prezzoUnitario > 0 ? 'border-green-300' : ''} />
                </div>
                <div className="w-24 space-y-2">
                  <Label>Importo</Label>
                  <p className="h-10 flex items-center text-sm font-medium">€ {(riga.quantita * riga.prezzoUnitario).toFixed(2)}</p>
                </div>
                {righe.length > 1 && (
                  <button type="button" onClick={() => rimuoviRiga(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg mb-0.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <div className="text-right pt-2 border-t">
              <p className="text-lg font-bold">Totale: € {totale.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/vendite"><Button type="button" variant="outline">Annulla</Button></Link>
          <Button type="submit" disabled={loading || righe.some(r => !r.prodottoId)}>
            {loading ? 'Salvataggio...' : 'Salva Vendita'}
          </Button>
        </div>
      </form>
    </div>
  )
}
