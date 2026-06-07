'use client'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'
import { MapPin, Globe, Map, Pencil, Trash2, Package, Ruler, Droplets, TreePine, Sprout, CalendarDays } from 'lucide-react'
import dynamic from 'next/dynamic'

const TerreniMap = dynamic(() => import('@/components/terreni-map').then(m => m.TerreniMap), {
  ssr: false,
  loading: () => <div className="w-full h-[480px] rounded-xl border bg-gray-50 flex items-center justify-center text-gray-400">Caricamento mappa...</div>,
})

type PolygonPath = { lat: number; lng: number }

type SistemaIrrigazione = { id: number; nome: string }
type PortaInnesto = { id: number; nome: string }

type Terreno = {
  id: number
  nome: string
  superficie: number | null
  unitaMisura: string
  indirizzo: string | null
  comune: string | null
  provincia: string | null
  cap: string | null
  latitudine: number | null
  longitudine: number | null
  confine: { paths: PolygonPath[] } | null
  prodottiIds: number[] | null
  luogoId: number | null
  luogo: { id: number; nome: string } | null
  numeroPiante: number | null
  annoImpianto: number | null
  culturaVarieta: string | null
  sistemaIrrigazioneId: number | null
  sistemaIrrigazione: SistemaIrrigazione | null
  portaInnestoId: number | null
  portaInnesto: PortaInnesto | null
  note: string | null
}

type Prodotto = { id: number; nome: string; categoria: string | null }
type Luogo = { id: number; nome: string; tipologia: string; categoria: string }

const CATEGORY_LABELS: Record<string, string> = {
  api: 'Api', frutta: 'Frutta', ortaggi: 'Ortaggi', olio: 'Olio', trasformato: 'Trasformato', altro: 'Altro',
}

const PRODUCT_EMOJI: Record<string, string> = {
  miele: '🐝', olio: '🫒', arancia: '🍊', limone: '🍋', avocado: '🥑',
  pomodoro: '🍅', mela: '🍎', pera: '🍐', uva: '🍇', fragola: '🍓',
  pesca: '🍑', albicocca: '🍑', carciofo: '🌱', zucchina: '🥒',
  melanzana: '🍆', peperone: '🫑', mais: '🌽', grano: '🌾',
  girasole: '🌻', mandorla: '🥜', fico: '🫐', patata: '🥔',
  carota: '🥕', cipolla: '🧅', aglio: '🧄', basilico: '🌿',
  rosmarino: '🌿', salvia: '🌿', timo: '🌿', origano: '🌿',
  menta: '🌿', prezzemolo: '🌿', lattuga: '🥬', spinacio: '🥬',
  cavolo: '🥬', broccolo: '🥦', cetriolo: '🥒', fagiolo: '🫘',
  pisello: '🫘', cece: '🫘', lenticchia: '🫘', fava: '🫘',
  ulivo: '🫒', vite: '🍇', mandarino: '🍊', pompelmo: '🍊',
  melone: '🍈', anguria: '🍉', kiwi: '🥝', banana: '🍌',
  ananas: '🍍', mango: '🥭', cocco: '🥥', noce: '🥜',
  nocciola: '🥜', pistacchio: '🫘', zafferano: '🌸', lavanda: '💜',
  erbe: '🌿', tartufo: '🍄', fungo: '🍄', radicchio: '🥬',
  sedano: '🥬', finocchio: '🥬', porro: '🥬', rapa: '🥬',
  barbabietola: '🫐', topinambur: '🥔', zucca: '🎃',
}

const CATEGORY_COLORS_KEY = 'avaia-category-colors'
const DEFAULT_CATEGORY_COLORS: Record<string, { fill: string; stroke: string }> = {
  api: { fill: '#eab308', stroke: '#ca8a04' },
  frutta: { fill: '#ef4444', stroke: '#dc2626' },
  ortaggi: { fill: '#22c55e', stroke: '#16a34a' },
  olio: { fill: '#a855f7', stroke: '#9333ea' },
  trasformato: { fill: '#f97316', stroke: '#ea580c' },
  altro: { fill: '#6b7280', stroke: '#4b5563' },
}

function loadCategoryColors(): Record<string, { fill: string; stroke: string }> {
  try {
    const saved = localStorage.getItem(CATEGORY_COLORS_KEY)
    if (saved) return { ...DEFAULT_CATEGORY_COLORS, ...JSON.parse(saved) }
  } catch { /* ignore */ }
  return { ...DEFAULT_CATEGORY_COLORS }
}

function saveCategoryColors(colors: Record<string, { fill: string; stroke: string }>) {
  try { localStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(colors)) } catch { /* ignore */ }
}

function computePolygonAreaMq(paths: PolygonPath[]): number {
  if (paths.length < 3) return 0
  const n = paths.length
  const avgLat = paths.reduce((a, p) => a + p.lat, 0) / n
  const avgLng = paths.reduce((a, p) => a + p.lng, 0) / n
  const rad = avgLat * Math.PI / 180
  const latM = 111320
  const lngM = 111320 * Math.cos(rad)
  let sum = 0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const xi = (paths[i].lng - avgLng) * lngM
    const yi = (paths[i].lat - avgLat) * latM
    const xj = (paths[j].lng - avgLng) * lngM
    const yj = (paths[j].lat - avgLat) * latM
    sum += xi * yj - xj * yi
  }
  return Math.abs(sum) / 2
}

export default function TerreniPage() {
  const [data, setData] = useState<Terreno[]>([])
  const [luoghi, setLuoghi] = useState<Luogo[]>([])
  const [prodotti, setProdotti] = useState<Prodotto[]>([])
  const [sistemiIrrigazione, setSistemiIrrigazione] = useState<SistemaIrrigazione[]>([])
  const [portaInnesti, setPortaInnesti] = useState<PortaInnesto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [drawingMode, setDrawingMode] = useState(false)
  const [verts, setVerts] = useState<{ lat: number; lng: number }[]>([])
  const [drawnPolygon, setDrawnPolygon] = useState<PolygonPath[] | null>(null)

  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedLuogoId, setSelectedLuogoId] = useState('')
  const [selectedProdottoIds, setSelectedProdottoIds] = useState<number[]>([])
  const [createNewLuogo, setCreateNewLuogo] = useState(false)
  const [newLuogoNome, setNewLuogoNome] = useState('')
  const [areaNome, setAreaNome] = useState('')

  useEffect(() => {
    if (drawnPolygon) setAssignModalOpen(true)
  }, [drawnPolygon])

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Terreno | null>(null)
  const [editProdottiIds, setEditProdottiIds] = useState<number[]>([])

  const [activeCategories, setActiveCategories] = useState<string[]>([])
  const [summaryItem, setSummaryItem] = useState<Terreno | null>(null)
  const [focusPolygonId, setFocusPolygonId] = useState<string | null>(null)
  const [categoryColors, setCategoryColors] = useState<Record<string, { fill: string; stroke: string }>>(loadCategoryColors)

  // Stato per la modifica della forma di un poligono esistente
  const [editingShapeTerreno, setEditingShapeTerreno] = useState<Terreno | null>(null)
  const [editingPaths, setEditingPaths] = useState<{ lat: number; lng: number }[]>([])

  const [form, setForm] = useState({
    nome: '', superficie: '', unitaMisura: 'ha',
    indirizzo: '', comune: '', provincia: '', cap: '',
    latitudine: '', longitudine: '', luogoId: '',
    numeroPiante: '', annoImpianto: '', culturaVarieta: '',
    sistemaIrrigazioneId: '', portaInnestoId: '', note: '',
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [res, resLuoghi, resProdotti, resSI, resPI] = await Promise.all([
        fetch('/api/terreni'), fetch('/api/luoghi'), fetch('/api/prodotti'),
        fetch('/api/sistemi-irrigazione'), fetch('/api/porta-innesti'),
      ])
      if (!res.ok) throw new Error()
      setData(await res.json())
      if (resLuoghi.ok) setLuoghi(await resLuoghi.json())
      if (resProdotti.ok) setProdotti(await resProdotti.json())
      if (resSI.ok) setSistemiIrrigazione(await resSI.json())
      if (resPI.ok) setPortaInnesti(await resPI.json())
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const cats = prodotti.map(p => p.categoria).filter(Boolean) as string[]
    const unique = Array.from(new Set(cats))
    setActiveCategories(prev => prev.length === 0 ? unique : prev)
  }, [prodotti])

  const mapCenter = (() => {
    const withCoords = data.filter(t => t.latitudine != null && t.longitudine != null)
    if (withCoords.length > 0) {
      const avgLat = withCoords.reduce((a, t) => a + t.latitudine!, 0) / withCoords.length
      const avgLng = withCoords.reduce((a, t) => a + t.longitudine!, 0) / withCoords.length
      return { lat: avgLat, lng: avgLng }
    }
    return { lat: 37.5, lng: 15.0 }
  })()

  function getTerrenoCategories(t: Terreno): string[] {
    if (!t.prodottiIds?.length) return []
    return prodotti.filter(p => t.prodottiIds!.includes(p.id)).map(p => p.categoria).filter(Boolean) as string[]
  }

  const CATEGORY_EMOJI: Record<string, string> = {
    api: '🐝', frutta: '🍎', ortaggi: '🥬', olio: '🫒', trasformato: '🏺', altro: '🌿',
  }

  const prodottoEmojiMap: Record<number, string> = {}
  for (const p of prodotti) {
    prodottoEmojiMap[p.id] = PRODUCT_EMOJI[p.nome.toLowerCase()] || CATEGORY_EMOJI[p.categoria || ''] || '🌿'
  }

  function groupProdottiByName(prods: Prodotto[]): { nome: string; ids: number[]; emoji: string; count: number }[] {
    const map: Record<string, { nome: string; ids: number[]; emoji: string }> = {}
    for (const p of prods) {
      const key = p.nome.toLowerCase()
      if (!map[key]) {
        map[key] = { nome: p.nome, ids: [], emoji: prodottoEmojiMap[p.id] || '📦' }
      }
      map[key].ids.push(p.id)
    }
    return Object.values(map).map(g => ({ ...g, count: g.ids.length }))
  }

  const groupedProdotti = groupProdottiByName(prodotti)

  function toggleProdottoGrouped(nome: string) {
    const group = groupedProdotti.find(g => g.nome === nome)
    if (!group) return
    const allSelected = group.ids.every(id => selectedProdottoIds.includes(id))
    if (allSelected) {
      setSelectedProdottoIds(prev => prev.filter(id => !group.ids.includes(id)))
    } else {
      setSelectedProdottoIds(prev => {
        const next = new Set(prev)
        for (const id of group.ids) next.add(id)
        return Array.from(next)
      })
    }
  }

  function toggleEditProdottoGrouped(nome: string) {
    const group = groupedProdotti.find(g => g.nome === nome)
    if (!group) return
    const allSelected = group.ids.every(id => editProdottiIds.includes(id))
    if (allSelected) {
      setEditProdottiIds(prev => prev.filter(id => !group.ids.includes(id)))
    } else {
      setEditProdottiIds(prev => {
        const next = new Set(prev)
        for (const id of group.ids) next.add(id)
        return Array.from(next)
      })
    }
  }

  const allPolygons = data
    .filter(t => t.confine?.paths?.length)
    .map(t => ({
      paths: t.confine!.paths,
      id: `terreno-${t.id}`,
      category: getTerrenoCategories(t)[0] || '',
      prodottoIds: t.prodottiIds || [],
    }))

  const filteredPolygons = allPolygons.filter(p => {
    if (!p.category) return true
    return activeCategories.includes(p.category)
  })

  const luoghiRealiProduttivi = luoghi.filter(l => l.tipologia === 'reale' && l.categoria === 'produttivo')

  function startDrawing() {
    setDrawingMode(true)
    setVerts([])
    setDrawnPolygon(null)
  }

  function handleMapClick(lat: number, lng: number) {
    if (!drawingMode) return
    setVerts(prev => [...prev, { lat, lng }])
  }

  function completeDrawing() {
    if (verts.length < 3) return
    setDrawnPolygon(verts)
    setDrawingMode(false)
    setVerts([])
    setSelectedLuogoId('')
    setSelectedProdottoIds([])
    setNewLuogoNome('')
    setCreateNewLuogo(false)
    setAreaNome('')
  }

  function cancelDrawing() {
    setDrawingMode(false)
    setVerts([])
  }

  function handlePolygonSelect(polyId: string | null) {
    // Se in editing shape, ignora selezioni esterne
    if (editingShapeTerreno) return
    if (!polyId) {
      setSummaryItem(null)
      setFocusPolygonId(null)
      return
    }
    const id = parseInt(polyId.replace('terreno-', ''))
    const t = data.find(d => d.id === id)
    if (t) {
      setSummaryItem(t)
      setFocusPolygonId(polyId)
    }
  }

  function startEditShape(t: Terreno) {
    if (!t.confine?.paths?.length) return
    setEditingShapeTerreno(t)
    setEditingPaths([...t.confine.paths])
    setFocusPolygonId(`terreno-${t.id}`)
    setSummaryItem(null)
  }

  function handleVertexDragEnd(index: number, lat: number, lng: number) {
    setEditingPaths(prev => {
      const next = [...prev]
      next[index] = { lat, lng }
      return next
    })
  }

  async function saveEditShape() {
    if (!editingShapeTerreno || editingPaths.length < 3) return
    setSaving(true)
    try {
      const mq = computePolygonAreaMq(editingPaths)
      const ha = Math.round(mq / 10000 * 100) / 100
      const res = await fetch(`/api/terreni/${editingShapeTerreno.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confine: { paths: editingPaths }, superficie: ha }),
      })
      if (!res.ok) throw new Error()
      setEditingShapeTerreno(null)
      setEditingPaths([])
      setFocusPolygonId(null)
      await fetchData()
    } catch { setError('Errore salvataggio forma') }
    finally { setSaving(false) }
  }

  function cancelEditShape() {
    setEditingShapeTerreno(null)
    setEditingPaths([])
  }

  function toggleCategory(cat: string) {
    setActiveCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  function updateCategoryColor(cat: string, type: 'fill' | 'stroke', value: string) {
    setCategoryColors(prev => {
      const next = { ...prev, [cat]: { ...prev[cat], [type]: value } }
      saveCategoryColors(next)
      return next
    })
  }

  async function handleAssignSave() {
    if (!drawnPolygon) return
    setSaving(true)
    try {
      const mq = computePolygonAreaMq(drawnPolygon)
      const ha = Math.round(mq / 10000 * 100) / 100
      let luogoIdFinal: number | null = null

      if (createNewLuogo && newLuogoNome) {
        const resLuogo = await fetch('/api/luoghi', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: newLuogoNome, tipologia: 'reale', categoria: 'produttivo', usoAziendale: true }),
        })
        if (!resLuogo.ok) throw new Error('Errore creazione fondo')
        const nuovoLuogo = await resLuogo.json()
        luogoIdFinal = nuovoLuogo.id
      } else if (selectedLuogoId) {
        luogoIdFinal = parseInt(selectedLuogoId)
      }

      const resTerreno = await fetch('/api/terreni', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: areaNome,
          confine: { paths: drawnPolygon },
          prodottiIds: selectedProdottoIds.length > 0 ? selectedProdottoIds : null,
          superficie: ha,
          unitaMisura: 'ha',
          luogoId: luogoIdFinal,
        }),
      })
      if (!resTerreno.ok) throw new Error('Errore creazione stacco')
      setAssignModalOpen(false)
      setDrawnPolygon(null)
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  function openEdit(t: Terreno) {
    setSelectedItem(t)
    const mq = t.confine?.paths ? computePolygonAreaMq(t.confine.paths) : 0
    const superficie = t.superficie ?? (mq > 0 ? Math.round(mq / 10000 * 100) / 100 : null)
    setForm({
      nome: t.nome,
      superficie: superficie?.toString() || '',
      unitaMisura: t.unitaMisura,
      indirizzo: t.indirizzo || '',
      comune: t.comune || '',
      provincia: t.provincia || '',
      cap: t.cap || '',
      latitudine: t.latitudine?.toString() || '',
      longitudine: t.longitudine?.toString() || '',
      luogoId: t.luogoId?.toString() || '',
      numeroPiante: t.numeroPiante?.toString() || '',
      annoImpianto: t.annoImpianto?.toString() || '',
      culturaVarieta: t.culturaVarieta || '',
      sistemaIrrigazioneId: t.sistemaIrrigazioneId?.toString() || '',
      portaInnestoId: t.portaInnestoId?.toString() || '',
      note: t.note || '',
    })
    setEditProdottiIds(t.prodottiIds || [])
    setEditModalOpen(true)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedItem) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        nome: form.nome,
        superficie: form.superficie ? parseFloat(form.superficie) : null,
        unitaMisura: form.unitaMisura,
        indirizzo: form.indirizzo || null,
        comune: form.comune || null,
        provincia: form.provincia || null,
        cap: form.cap || null,
        latitudine: form.latitudine ? parseFloat(form.latitudine) : null,
        longitudine: form.longitudine ? parseFloat(form.longitudine) : null,
        luogoId: form.luogoId ? parseInt(form.luogoId) : null,
        numeroPiante: form.numeroPiante ? parseInt(form.numeroPiante) : null,
        annoImpianto: form.annoImpianto ? parseInt(form.annoImpianto) : null,
        culturaVarieta: form.culturaVarieta || null,
        sistemaIrrigazioneId: form.sistemaIrrigazioneId ? parseInt(form.sistemaIrrigazioneId) : null,
        portaInnestoId: form.portaInnestoId ? parseInt(form.portaInnestoId) : null,
        note: form.note || null,
        prodottiIds: editProdottiIds.length > 0 ? editProdottiIds : null,
      }
      const res = await fetch(`/api/terreni/${selectedItem.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      setEditModalOpen(false); setSelectedItem(null)
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  async function handleDeleteArea(t: Terreno) {
    if (!confirm(`Eliminare definitivamente lo stacco "${t.nome}"?`)) return
    try {
      const res = await fetch(`/api/terreni/${t.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setSummaryItem(null)
      await fetchData()
    } catch { setError('Errore durante l\'eliminazione') }
  }

  function getLuogoPerTerreno(t: Terreno) { return t.luogo }
  function getProdottiPerIds(ids: number[] | null | undefined) {
    if (!ids?.length) return []
    return prodotti.filter(p => ids.includes(p.id))
  }

  const categoryList = Array.from(new Set(prodotti.map(p => p.categoria).filter(Boolean) as string[]))

  function handleRowClick(t: Terreno) {
    setSummaryItem(t)
    if (t.confine?.paths?.length) {
      setFocusPolygonId(`terreno-${t.id}`)
    }
  }

  function closeSummary() {
    setSummaryItem(null)
  }

  return (
    <div>
      <PageHeader title="Stacchi Produttivi" description="Disegna gli stacchi sulla mappa e abbinali ai prodotti e al fondo di appartenenza" />

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Mappa + Pannello layers */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Globe className="w-5 h-5 text-lime-600" /><h3 className="font-semibold">Mappa</h3></div>
                <div className="flex gap-2">
                  {!drawingMode && !drawnPolygon && !editingShapeTerreno && (
                    <Button size="sm" onClick={startDrawing}><Pencil className="w-4 h-4 mr-1" />Disegna area</Button>
                  )}
                  {drawingMode && (
                    <>
                      <Button size="sm" variant="secondary" onClick={cancelDrawing}>Annulla</Button>
                      <Button size="sm" disabled={verts.length < 3} onClick={completeDrawing}>
                        <MapPin className="w-4 h-4 mr-1" />Completa ({verts.length})
                      </Button>
                    </>
                  )}
                  {drawnPolygon && (
                    <Button size="sm" variant="outline" onClick={() => { setDrawnPolygon(null); setVerts([]) }}>
                      <Trash2 className="w-4 h-4 mr-1" />Rimuovi
                    </Button>
                  )}
                  {editingShapeTerreno && (
                    <>
                      <span className="text-sm text-blue-700 font-medium self-center">Modifica forma: <strong>{editingShapeTerreno.nome}</strong></span>
                      <Button size="sm" variant="secondary" onClick={cancelEditShape}>Annulla</Button>
                      <Button size="sm" onClick={saveEditShape} disabled={saving}>
                        {saving ? 'Salvataggio...' : 'Salva forma'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <TerreniMap
                polygons={filteredPolygons}
                initialCenter={mapCenter}
                onMapClick={handleMapClick}
                onPolygonSelect={handlePolygonSelect}
                drawingVertices={verts.length > 1 ? verts : undefined}
                focusPolygonId={focusPolygonId}
                categoryColors={categoryColors}
                prodottoEmojiMap={prodottoEmojiMap}
                editingPolygonId={editingShapeTerreno ? `terreno-${editingShapeTerreno.id}` : null}
                editingVertices={editingShapeTerreno ? editingPaths : undefined}
                onVertexDragEnd={handleVertexDragEnd}
              />
              {drawingMode && <p className="text-xs text-amber-600 p-3">Clicca sulla mappa per aggiungere punti. Minimo 3 punti per completare.</p>}
              {drawnPolygon && <p className="text-xs text-green-600 p-3">Area pronta. Salvala dal pannello qui sotto.</p>}
              {editingShapeTerreno && <p className="text-xs text-blue-600 p-3">Trascina i punti blu per modificare la forma. Poi clicca "Salva forma".</p>}
              {!drawingMode && !drawnPolygon && !editingShapeTerreno && <p className="text-xs text-gray-400 p-3">Clicca "Disegna area" per tracciare. Clicca su un poligono per selezionarlo, poi "Modifica forma" per rimodellarlo.</p>}
            </CardContent>
          </Card>
        </div>

        {/* Pannello layers */}
        {categoryList.length > 0 && (
          <Card className="w-64 shrink-0 self-start">
            <CardHeader><h3 className="font-semibold text-sm">Livelli</h3></CardHeader>
            <CardContent className="space-y-3">
              {categoryList.map(cat => {
                const col = categoryColors[cat] || DEFAULT_CATEGORY_COLORS[cat] || { fill: '#22c55e', stroke: '#16a34a' }
                return (
                  <div key={cat} className="space-y-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                        className="accent-lime-600"
                      />
                      <input
                        type="color"
                        value={col.fill}
                        onChange={e => updateCategoryColor(cat, 'fill', e.target.value)}
                        className="w-5 h-5 p-0 border-0 cursor-pointer rounded"
                        title="Colore riempimento"
                      />
                      <span className="flex-1">{CATEGORY_LABELS[cat] || cat}</span>
                      <span className="text-xs text-gray-400">{allPolygons.filter(p => p.category === cat).length}</span>
                    </label>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Banner area disegnata */}
      {drawnPolygon && (
        <Card className="mb-6 border-lime-300 bg-lime-50">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2"><Ruler className="w-4 h-4 text-lime-600" /> Area disegnata: <strong>{drawnPolygon ? `${computePolygonAreaMq(drawnPolygon).toFixed(0)} mq (${Math.round(computePolygonAreaMq(drawnPolygon) / 10000 * 100) / 100} ha)` : '-'}</strong></span>
            <Button size="sm" onClick={() => { setSelectedLuogoId(''); setSelectedProdottoIds([]); setNewLuogoNome(''); setCreateNewLuogo(false); setAreaNome(''); setAssignModalOpen(true) }}>
              Assegna a luogo e prodotti
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pannello riassuntivo area selezionata */}
      {summaryItem && (
        <Card className="mb-6 border-lime-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between w-full">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-lime-600" />
                {summaryItem.nome}
              </h3>
              <div className="flex gap-2 shrink-0 flex-wrap">
                {summaryItem.confine?.paths?.length && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setFocusPolygonId(`terreno-${summaryItem.id}`)}>
                      <Map className="w-4 h-4 mr-1" />Centra
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => startEditShape(summaryItem)}>
                      <Pencil className="w-4 h-4 mr-1" />Modifica forma
                    </Button>
                  </>
                )}
                <Button size="sm" onClick={() => { openEdit(summaryItem); setSummaryItem(null) }}>
                  <Pencil className="w-4 h-4 mr-1" />Dati
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDeleteArea(summaryItem)}>
                  <Trash2 className="w-4 h-4 mr-1" />Elimina
                </Button>
                <Button size="sm" variant="secondary" onClick={closeSummary}>Chiudi</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block text-xs">Superficie</span>
                <span className="font-medium">{summaryItem.superficie != null ? `${summaryItem.superficie} ${summaryItem.unitaMisura}` : '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Indirizzo</span>
                <span className="font-medium">{summaryItem.indirizzo || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Comune</span>
                <span className="font-medium">{summaryItem.comune || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Provincia</span>
                <span className="font-medium">{summaryItem.provincia || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Prodotti</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {getProdottiPerIds(summaryItem.prodottiIds).length > 0
                    ? getProdottiPerIds(summaryItem.prodottiIds).map(p => <Badge key={p.id} variant="success" className="text-xs">{p.nome}</Badge>)
                    : <span className="font-medium">-</span>}
                </div>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Fondo (luogo)</span>
                <span className="font-medium">
                  {getLuogoPerTerreno(summaryItem)
                    ? <Badge variant="default" className="text-xs">{getLuogoPerTerreno(summaryItem)!.nome}</Badge>
                    : '-'}
                </span>
              </div>
            </div>
            {/* Dati agronomici */}
            {(summaryItem.numeroPiante || summaryItem.annoImpianto || summaryItem.culturaVarieta || summaryItem.sistemaIrrigazione || summaryItem.portaInnesto) && (
              <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {summaryItem.culturaVarieta && (
                  <div>
                    <span className="text-gray-500 block text-xs flex items-center gap-1"><Sprout className="w-3 h-3" />Coltura / Varietà</span>
                    <span className="font-medium">{summaryItem.culturaVarieta}</span>
                  </div>
                )}
                {summaryItem.numeroPiante && (
                  <div>
                    <span className="text-gray-500 block text-xs">N° piante</span>
                    <span className="font-medium">{summaryItem.numeroPiante.toLocaleString('it-IT')}</span>
                  </div>
                )}
                {summaryItem.annoImpianto && (
                  <div>
                    <span className="text-gray-500 block text-xs flex items-center gap-1"><CalendarDays className="w-3 h-3" />Anno impianto</span>
                    <span className="font-medium">{summaryItem.annoImpianto}</span>
                  </div>
                )}
                {summaryItem.portaInnesto && (
                  <div>
                    <span className="text-gray-500 block text-xs flex items-center gap-1"><TreePine className="w-3 h-3" />Porta innesto</span>
                    <span className="font-medium">{summaryItem.portaInnesto.nome}</span>
                  </div>
                )}
                {summaryItem.sistemaIrrigazione && (
                  <div>
                    <span className="text-gray-500 block text-xs flex items-center gap-1"><Droplets className="w-3 h-3" />Sistema irrigazione</span>
                    <span className="font-medium">{summaryItem.sistemaIrrigazione.nome}</span>
                  </div>
                )}
              </div>
            )}
            {summaryItem.note && (
              <div className="mt-4 pt-4 border-t text-sm">
                <span className="text-gray-500 block text-xs">Note</span>
                <span className="font-medium">{summaryItem.note}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabella */}
      {loading ? (<p className="text-gray-500">Caricamento...</p>) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead><Tr><Th>Nome</Th><Th>Prodotti</Th><Th>Luogo</Th><Th>Superficie</Th><Th>Poligono</Th></Tr></Thead>
              <Tbody>
                {data.map((t) => {
                  const prods = getProdottiPerIds(t.prodottiIds)
                  const isActive = summaryItem?.id === t.id
                  return (
                    <Tr key={t.id} className={`cursor-pointer hover:bg-gray-50 ${isActive ? 'bg-lime-50' : ''}`} onClick={() => handleRowClick(t)}>
                      <Td className="font-medium flex items-center gap-2"><MapPin className="w-4 h-4 text-lime-600 shrink-0" />{t.nome}</Td>
                      <Td>
                        {prods.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {prods.map(p => <Badge key={p.id} variant="success">{p.nome}</Badge>)}
                          </div>
                        ) : <span className="text-gray-400">-</span>}
                      </Td>
                      <Td>{t.luogo ? t.luogo.nome : <span className="text-gray-400">-</span>}</Td>
                      <Td>{t.superficie != null ? `${t.superficie} ${t.unitaMisura}` : '-'}</Td>
                      <Td>
                        {t.confine?.paths?.length ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="info"><Map className="w-3 h-3 mr-1" />Sì</Badge>
                            <button type="button" onClick={(e) => { e.stopPropagation(); if (confirm('Rimuovere il poligono?')) { fetch(`/api/terreni/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confine: null }) }).then(r => { if (r.ok) fetchData() }) } }} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        ) : '-'}
                      </Td>
                    </Tr>
                  )
                })}
                {data.length === 0 && <Tr><Td colSpan={5} className="text-center text-gray-500 py-8">Nessuno stacco produttivo</Td></Tr>}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal assegnazione area */}
      <Modal open={assignModalOpen} onClose={() => { setAssignModalOpen(false); setDrawnPolygon(null) }} title="Nuovo stacco produttivo" className="sm:max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Nome stacco *</label>
            <Input value={areaNome} onChange={e => setAreaNome(e.target.value)} placeholder="Es. Campo Nord, Vigneto Sud..." required />
            <p className="text-xs text-gray-400 mt-1">
              <Ruler className="w-3 h-3 inline mr-1" />
              Superficie calcolata: <strong>{drawnPolygon ? `${computePolygonAreaMq(drawnPolygon).toFixed(0)} mq (${Math.round(computePolygonAreaMq(drawnPolygon) / 10000 * 100) / 100} ha)` : '-'}</strong>
            </p>
          </div>

          <div className="border-t pt-3">
            <label className="text-sm font-medium block mb-2">Prodotti coltivati / allevati</label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
              {groupedProdotti.map(g => {
                const allSelected = g.ids.every(id => selectedProdottoIds.includes(id))
                return (
                  <button key={g.nome} type="button" onClick={() => toggleProdottoGrouped(g.nome)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${allSelected ? 'bg-lime-100 border-lime-400 text-lime-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <span className="mr-1">{g.emoji}</span>{g.nome}
                    {g.count > 1 && <Badge variant="default" className="ml-1 text-xs">{g.count}×</Badge>}
                  </button>
                )
              })}
              {groupedProdotti.length === 0 && <p className="text-xs text-gray-400 p-2">Nessun prodotto. Creane uno in Anagrafiche → Prodotti.</p>}
            </div>
          </div>

          <div className="border-t pt-3">
            <label className="text-sm font-medium block mb-2">Luogo di riferimento *</label>
            <div className="flex items-center gap-2 mb-3">
              <input type="radio" id="existing-luogo" checked={!createNewLuogo} onChange={() => setCreateNewLuogo(false)} className="accent-lime-600" />
              <label htmlFor="existing-luogo" className="text-sm">Luogo esistente</label>
              <input type="radio" id="new-luogo" checked={createNewLuogo} onChange={() => setCreateNewLuogo(true)} className="accent-lime-600 ml-4" />
              <label htmlFor="new-luogo" className="text-sm">Crea nuovo</label>
            </div>
            {createNewLuogo ? (
              <Input value={newLuogoNome} onChange={e => setNewLuogoNome(e.target.value)} placeholder="Nome nuovo luogo..." required />
            ) : (
              <Select value={selectedLuogoId} onChange={e => setSelectedLuogoId(e.target.value)} required>
                <option value="">-- Seleziona un luogo --</option>
                {luoghiRealiProduttivi.map(l => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </Select>
            )}
            {!createNewLuogo && !luoghiRealiProduttivi.length && <p className="text-xs text-amber-600 mt-1">Nessun luogo reale/produttivo. Creane uno.</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setAssignModalOpen(false); setDrawnPolygon(null) }}>Annulla</Button>
            <Button onClick={handleAssignSave} disabled={saving || !areaNome || (!createNewLuogo && !selectedLuogoId) || (createNewLuogo && !newLuogoNome)}>
              {saving ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal modifica */}
      <Modal open={editModalOpen} onClose={() => { setEditModalOpen(false); setSelectedItem(null) }}
        title={selectedItem ? `Modifica - ${selectedItem.nome}` : 'Nuovo stacco'} className="sm:max-w-lg">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div><label className="text-sm font-medium block mb-1">Nome *</label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required /></div>
          <div><label className="text-sm font-medium block mb-2">Prodotti associati</label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
              {groupedProdotti.map(g => {
                const allSelected = g.ids.every(id => editProdottiIds.includes(id))
                return (
                  <button key={g.nome} type="button" onClick={() => toggleEditProdottoGrouped(g.nome)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${allSelected ? 'bg-lime-100 border-lime-400 text-lime-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <span className="mr-1">{g.emoji}</span>{g.nome}
                    {g.count > 1 && <Badge variant="default" className="ml-1 text-xs">{g.count}×</Badge>}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Superficie</label><Input type="number" step="0.01" min="0" value={form.superficie} onChange={e => setForm({ ...form, superficie: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Unità</label><Select value={form.unitaMisura} onChange={e => setForm({ ...form, unitaMisura: e.target.value })}><option value="ha">ettari</option><option value="mq">metri quadri</option></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Indirizzo</label><Input value={form.indirizzo} onChange={e => setForm({ ...form, indirizzo: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Comune</label><Input value={form.comune} onChange={e => setForm({ ...form, comune: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Provincia</label><Input value={form.provincia} onChange={e => setForm({ ...form, provincia: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">CAP</label><Input value={form.cap} onChange={e => setForm({ ...form, cap: e.target.value })} /></div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Fondo di appartenenza</label>
            <Select value={form.luogoId} onChange={e => setForm({ ...form, luogoId: e.target.value })}>
              <option value="">Nessuno</option>
              {luoghiRealiProduttivi.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </Select>
            {luoghiRealiProduttivi.length === 0 && <p className="text-xs text-amber-600 mt-1">Nessun luogo reale/produttivo. Creane uno in Anagrafiche → Luoghi.</p>}
          </div>

          {/* Dati agronomici stacco */}
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dati agronomici</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Coltura / Varietà</label>
                <Input value={form.culturaVarieta} onChange={e => setForm({ ...form, culturaVarieta: e.target.value })} placeholder="Es. Clementine Nules, Olea Europaea…" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">N° piante</label>
                <Input type="number" min="0" step="1" value={form.numeroPiante} onChange={e => setForm({ ...form, numeroPiante: e.target.value })} placeholder="Es. 120" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-sm font-medium block mb-1">Anno impianto / innesto</label>
                <Input type="number" min="1900" max="2100" step="1" value={form.annoImpianto} onChange={e => setForm({ ...form, annoImpianto: e.target.value })} placeholder="Es. 2005" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1 flex items-center gap-1"><TreePine className="w-3.5 h-3.5 text-green-600" />Porta innesto</label>
                <Select value={form.portaInnestoId} onChange={e => setForm({ ...form, portaInnestoId: e.target.value })}>
                  <option value="">Nessuno</option>
                  {portaInnesti.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </Select>
                {portaInnesti.length === 0 && <p className="text-xs text-amber-600 mt-1">Aggiungi porta innesti in Anagrafiche → Porta Innesti</p>}
              </div>
            </div>
            <div className="mt-3">
              <label className="text-sm font-medium block mb-1 flex items-center gap-1"><Droplets className="w-3.5 h-3.5 text-blue-500" />Sistema di irrigazione</label>
              <Select value={form.sistemaIrrigazioneId} onChange={e => setForm({ ...form, sistemaIrrigazioneId: e.target.value })}>
                <option value="">Nessuno</option>
                {sistemiIrrigazione.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </Select>
              {sistemiIrrigazione.length === 0 && <p className="text-xs text-amber-600 mt-1">Aggiungi sistemi in Anagrafiche → Sistemi di Irrigazione</p>}
            </div>
          </div>

          <div><label className="text-sm font-medium block mb-1">Note</label><Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setEditModalOpen(false); setSelectedItem(null) }}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Aggiorna'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
