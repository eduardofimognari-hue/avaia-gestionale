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

interface TerreniMapProps {
  polygons: PolygonData[]
  initialCenter: { lat: number; lng: number }
  onMapClick?: (lat: number, lng: number) => void
  onPolygonSelect?: (id: string | null) => void
  drawingVertices?: { lat: number; lng: number }[]
  focusPolygonId?: string | null
  categoryColors?: Record<string, { fill: string; stroke: string }>
  prodottoEmojiMap?: Record<number, string>
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

export function TerreniMap({
  polygons,
  initialCenter,
  onMapClick,
  onPolygonSelect,
  drawingVertices,
  focusPolygonId,
  categoryColors = DEFAULT_CATEGORY_COLORS,
  prodottoEmojiMap = {},
}: TerreniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const polyLayersRef = useRef<L.Polygon[]>([])
  const markerLayersRef = useRef<L.Marker[]>([])
  const drawingPolyRef = useRef<L.Polygon | null>(null)
  const initializedRef = useRef(false)

  // Callback refs to avoid stale closures in event handlers
  const onMapClickRef = useRef(onMapClick)
  const onPolygonSelectRef = useRef(onPolygonSelect)
  useEffect(() => { onMapClickRef.current = onMapClick }, [onMapClick])
  useEffect(() => { onPolygonSelectRef.current = onPolygonSelect }, [onPolygonSelect])

  // Initialize map once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: 14,
      zoomControl: true,
    })

    // Satellite layer — Esri World Imagery, completamente gratuito, no API key
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '© Esri — Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, GIS User Community',
        maxZoom: 20,
      }
    )

    // Street layer — OpenStreetMap, gratuito
    const street = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    )

    satellite.addTo(map)
    L.control.layers({ '🛰️ Satellite': satellite, '🗺️ Mappa': street }, {}, { position: 'topright' }).addTo(map)

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      polyLayersRef.current = []
      markerLayersRef.current = []
      drawingPolyRef.current = null
      initializedRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fit to all polygons on first data load
  useEffect(() => {
    const map = mapRef.current
    if (!map || initializedRef.current || polygons.length === 0) return
    initializedRef.current = true
    const allLatLngs = polygons.flatMap(p => p.paths.map(pt => [pt.lat, pt.lng] as L.LatLngTuple))
    if (allLatLngs.length > 0) map.fitBounds(allLatLngs, { padding: [40, 40] })
  }, [polygons])

  // Redraw all polygons whenever data or colors change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    polyLayersRef.current.forEach(p => p.remove())
    markerLayersRef.current.forEach(m => m.remove())
    polyLayersRef.current = []
    markerLayersRef.current = []

    for (const poly of polygons) {
      const color = categoryColors[poly.category || ''] || DEFAULT_COLOR
      const isFocused = focusPolygonId === poly.id
      const latlngs = poly.paths.map(p => [p.lat, p.lng] as L.LatLngTuple)

      const leafletPoly = L.polygon(latlngs, {
        color: isFocused ? '#1d4ed8' : color.stroke,
        weight: isFocused ? 3 : 2,
        fillColor: color.fill,
        fillOpacity: isFocused ? 0.55 : 0.35,
      }).addTo(map)

      leafletPoly.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e)
        onPolygonSelectRef.current?.(poly.id || null)
      })

      polyLayersRef.current.push(leafletPoly)

      // Emoji label at centroid
      const c = centroid(poly.paths)
      const emojis = getEmojis(poly, prodottoEmojiMap)
      const emojiHtml = emojis.length === 1
        ? `<span style="font-size:24px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.7))">${emojis[0]}</span>`
        : `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px;max-width:60px;background:rgba(255,255,255,0.88);border-radius:8px;padding:3px 5px;box-shadow:0 1px 4px rgba(0,0,0,0.25)">${emojis.map(e => `<span style="font-size:18px;line-height:1.2">${e}</span>`).join('')}</div>`

      const icon = L.divIcon({
        html: `<div style="transform:translate(-50%,-50%);cursor:pointer;pointer-events:auto">${emojiHtml}</div>`,
        className: '',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })

      const marker = L.marker([c.lat, c.lng], { icon, interactive: true }).addTo(map)
      marker.on('click', () => onPolygonSelectRef.current?.(poly.id || null))
      markerLayersRef.current.push(marker)
    }
  }, [polygons, focusPolygonId, categoryColors, prodottoEmojiMap])

  // Drawing preview polygon (tratteggiato, aggiornato ad ogni nuovo vertice)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (drawingPolyRef.current) {
      drawingPolyRef.current.remove()
      drawingPolyRef.current = null
    }

    if (drawingVertices && drawingVertices.length > 1) {
      const latlngs = drawingVertices.map(v => [v.lat, v.lng] as L.LatLngTuple)
      drawingPolyRef.current = L.polygon(latlngs, {
        color: '#d97706',
        weight: 2,
        dashArray: '8 5',
        fillColor: '#f59e0b',
        fillOpacity: 0.2,
        interactive: false,
      }).addTo(map)
    }
  }, [drawingVertices])

  // Focus (zoom to) a specific polygon
  useEffect(() => {
    const map = mapRef.current
    if (!map || !focusPolygonId) return
    const poly = polygons.find(p => p.id === focusPolygonId)
    if (!poly?.paths?.length) return
    const latlngs = poly.paths.map(p => [p.lat, p.lng] as L.LatLngTuple)
    map.fitBounds(latlngs, { padding: [60, 60] })
  }, [focusPolygonId, polygons])

  const isDrawing = drawingVertices !== undefined

  return (
    <div
      ref={containerRef}
      className="w-full h-[480px] rounded-xl"
      style={{
        zIndex: 0,
        cursor: isDrawing ? 'crosshair' : 'grab',
      }}
    />
  )
}
