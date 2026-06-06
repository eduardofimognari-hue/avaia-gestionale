'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CATEGORY_COLORS: Record<string, { fill: string; stroke: string }> = {
  api: { fill: '#eab308', stroke: '#ca8a04' },
  frutta: { fill: '#ef4444', stroke: '#dc2626' },
  ortaggi: { fill: '#22c55e', stroke: '#16a34a' },
  olio: { fill: '#a855f7', stroke: '#9333ea' },
  trasformato: { fill: '#f97316', stroke: '#ea580c' },
  altro: { fill: '#6b7280', stroke: '#4b5563' },
}
const DEFAULT_COLOR = { fill: '#22c55e', stroke: '#16a34a' }

const CATEGORY_EMOJI: Record<string, string> = {
  api: '🐝', frutta: '🍎', ortaggi: '🥬', olio: '🫒', trasformato: '🏺', altro: '🌿',
}

interface PolygonData {
  paths: { lat: number; lng: number }[]
  id?: string
  category?: string
  prodottoIds?: number[]
}

export interface TerreniMapProps {
  polygons: PolygonData[]
  initialCenter: { lat: number; lng: number }
  onMapClick?: (lat: number, lng: number) => void
  onPolygonSelect?: (id: string | null) => void
  drawingVertices?: { lat: number; lng: number }[]
  focusPolygonId?: string | null
  categoryColors?: Record<string, { fill: string; stroke: string }>
  prodottoEmojiMap?: Record<number, string>
  // Editing mode
  editingPolygonId?: string | null
  editingVertices?: { lat: number; lng: number }[]
  onVertexDragEnd?: (index: number, lat: number, lng: number) => void
}

function centroid(paths: { lat: number; lng: number }[]) {
  if (!paths.length) return { lat: 0, lng: 0 }
  const n = paths.length
  return {
    lat: paths.reduce((a, p) => a + p.lat, 0) / n,
    lng: paths.reduce((a, p) => a + p.lng, 0) / n,
  }
}

function getEmojis(poly: PolygonData, prodottoEmojiMap: Record<number, string>): string[] {
  if (poly.prodottoIds?.length) {
    const seen = new Set<string>()
    const result: string[] = []
    for (const pid of poly.prodottoIds) {
      const e = prodottoEmojiMap[pid]
      if (e && !seen.has(e)) { seen.add(e); result.push(e) }
    }
    if (result.length) return result
  }
  const catEmoji = CATEGORY_EMOJI[poly.category || '']
  return catEmoji ? [catEmoji] : ['🌿']
}

function makeEmojiIcon(emojis: string[]): L.DivIcon {
  const SIZE = 32
  const html = emojis.length === 1
    ? `<div style="width:${SIZE}px;height:${SIZE}px;display:flex;align-items:center;justify-content:center;font-size:18px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.65))">${emojis[0]}</div>`
    : `<div style="width:${SIZE}px;height:${SIZE}px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:1px;background:rgba(255,255,255,0.9);border-radius:7px;box-shadow:0 1px 4px rgba(0,0,0,0.25);font-size:11px">${emojis.slice(0, 4).map(e => `<span>${e}</span>`).join('')}</div>`
  return L.divIcon({ html, className: '', iconSize: [SIZE, SIZE], iconAnchor: [SIZE / 2, SIZE / 2] })
}

function makeHandleIcon(): L.DivIcon {
  return L.divIcon({
    html: '<div style="width:12px;height:12px;background:#1d4ed8;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

export function TerreniMap({
  polygons,
  initialCenter,
  onMapClick,
  onPolygonSelect,
  drawingVertices,
  focusPolygonId,
  categoryColors = DEFAULT_CATEGORY_COLORS,
  prodottoEmojiMap = {},
  editingPolygonId,
  editingVertices,
  onVertexDragEnd,
}: TerreniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const polyLayersRef = useRef<L.Polygon[]>([])
  const markerLayersRef = useRef<L.Marker[]>([])
  const drawingPolyRef = useRef<L.Polygon | null>(null)
  const editPolyRef = useRef<L.Polygon | null>(null)
  const editHandlesRef = useRef<L.Marker[]>([])
  const initializedRef = useRef(false)

  // Callback refs to avoid stale closures
  const onMapClickRef = useRef(onMapClick)
  const onPolygonSelectRef = useRef(onPolygonSelect)
  const onVertexDragEndRef = useRef(onVertexDragEnd)
  useEffect(() => { onMapClickRef.current = onMapClick }, [onMapClick])
  useEffect(() => { onPolygonSelectRef.current = onPolygonSelect }, [onPolygonSelect])
  useEffect(() => { onVertexDragEndRef.current = onVertexDragEnd }, [onVertexDragEnd])

  // Initialize map once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: 14,
      zoomControl: true,
    })

    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© Esri', maxZoom: 20 }
    )
    const street = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 }
    )
    street.addTo(map)
    L.control.layers({ '🗺️ Mappa': street, '🛰️ Satellite': satellite }, {}, { position: 'topright' }).addTo(map)

    map.on('click', (e: L.LeafletMouseEvent) => {
      // Deseleziona se clicco su area vuota della mappa
      onPolygonSelectRef.current?.(null)
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      polyLayersRef.current = []
      markerLayersRef.current = []
      drawingPolyRef.current = null
      editPolyRef.current = null
      editHandlesRef.current = []
      initializedRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fit to all polygons on first data load
  useEffect(() => {
    const map = mapRef.current
    if (!map || initializedRef.current || polygons.length === 0) return
    initializedRef.current = true
    const all = polygons.flatMap(p => p.paths.map(pt => [pt.lat, pt.lng] as L.LatLngTuple))
    if (all.length) map.fitBounds(all, { padding: [40, 40], maxZoom: 18 })
  }, [polygons])

  // Redraw all polygons + emoji markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    polyLayersRef.current.forEach(p => p.remove())
    markerLayersRef.current.forEach(m => m.remove())
    polyLayersRef.current = []
    markerLayersRef.current = []

    for (const poly of polygons) {
      const isEditing = editingPolygonId === poly.id
      const color = categoryColors[poly.category || ''] || DEFAULT_COLOR
      const isFocused = focusPolygonId === poly.id && !isEditing
      const latlngs = poly.paths.map(p => [p.lat, p.lng] as L.LatLngTuple)

      const leafletPoly = L.polygon(latlngs, {
        color: isFocused ? '#1d4ed8' : color.stroke,
        weight: isFocused ? 3 : 2,
        fillColor: color.fill,
        fillOpacity: isEditing ? 0.15 : isFocused ? 0.55 : 0.35,
        dashArray: isEditing ? '6 4' : undefined,
      }).addTo(map)

      if (!isEditing) {
        leafletPoly.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e)
          onPolygonSelectRef.current?.(poly.id || null)
        })
      }

      polyLayersRef.current.push(leafletPoly)

      // Emoji marker — solo se non in edit mode per questo poligono
      if (!isEditing) {
        const c = centroid(poly.paths)
        const emojis = getEmojis(poly, prodottoEmojiMap)
        const marker = L.marker([c.lat, c.lng], {
          icon: makeEmojiIcon(emojis),
          interactive: true,
          zIndexOffset: 100,
        }).addTo(map)
        marker.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e)
          onPolygonSelectRef.current?.(poly.id || null)
        })
        markerLayersRef.current.push(marker)
      }
    }
  }, [polygons, focusPolygonId, editingPolygonId, categoryColors, prodottoEmojiMap])

  // Drawing preview (tratteggiato, aggiornato ad ogni vertice aggiunto)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (drawingPolyRef.current) { drawingPolyRef.current.remove(); drawingPolyRef.current = null }
    if (drawingVertices && drawingVertices.length > 1) {
      drawingPolyRef.current = L.polygon(
        drawingVertices.map(v => [v.lat, v.lng] as L.LatLngTuple),
        { color: '#d97706', weight: 2, dashArray: '8 5', fillColor: '#f59e0b', fillOpacity: 0.2, interactive: false }
      ).addTo(map)
    }
  }, [drawingVertices])

  // Editing mode: poligono live + handle trascinabili per i vertici
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Pulizia precedente
    if (editPolyRef.current) { editPolyRef.current.remove(); editPolyRef.current = null }
    editHandlesRef.current.forEach(h => h.remove())
    editHandlesRef.current = []

    if (!editingVertices?.length) return

    // Poligono di anteprima live
    const latlngs = editingVertices.map(v => [v.lat, v.lng] as L.LatLngTuple)
    const editPoly = L.polygon(latlngs, {
      color: '#1d4ed8', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.25, interactive: false,
    }).addTo(map)
    editPolyRef.current = editPoly

    // Handle trascinabile per ogni vertice
    editingVertices.forEach((v, i) => {
      const handle = L.marker([v.lat, v.lng], {
        draggable: true,
        icon: makeHandleIcon(),
        zIndexOffset: 500,
      }).addTo(map)

      handle.on('drag', () => {
        // Aggiorna il poligono live senza passare da React state (smooth)
        const allLatLngs = editHandlesRef.current.map(h => h.getLatLng())
        editPolyRef.current?.setLatLngs(allLatLngs)
      })

      handle.on('dragend', () => {
        const latlng = handle.getLatLng()
        onVertexDragEndRef.current?.(i, latlng.lat, latlng.lng)
      })

      editHandlesRef.current.push(handle)
    })
  }, [editingVertices])

  // Focus (zoom to) un poligono specifico
  useEffect(() => {
    const map = mapRef.current
    if (!map || !focusPolygonId) return
    const poly = polygons.find(p => p.id === focusPolygonId)
    if (!poly?.paths?.length) return
    map.fitBounds(poly.paths.map(p => [p.lat, p.lng] as L.LatLngTuple), { padding: [60, 60], maxZoom: 18 })
  }, [focusPolygonId, polygons])

  const isDrawing = drawingVertices !== undefined
  const isEditingMap = !!editingVertices?.length

  return (
    <div
      ref={containerRef}
      className="w-full h-[480px] rounded-xl"
      style={{ zIndex: 0, cursor: isDrawing ? 'crosshair' : isEditingMap ? 'default' : 'grab' }}
    />
  )
}
