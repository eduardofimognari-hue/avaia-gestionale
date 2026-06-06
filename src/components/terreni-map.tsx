'use client'
import { useRef, useCallback, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, Polygon, OverlayView } from '@react-google-maps/api'

const MAP_ID = 'terreni-map'

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
  api: '🐝',
  frutta: '🍎',
  ortaggi: '🥬',
  olio: '🫒',
  trasformato: '🏺',
  altro: '🌿',
}

interface PolygonPath {
  paths: { lat: number; lng: number }[]
  id?: string
  category?: string
  prodottoIds?: number[]
}

interface TerreniMapProps {
  polygons: PolygonPath[]
  initialCenter: { lat: number; lng: number }
  onMapClick?: (lat: number, lng: number) => void
  onPolygonSelect?: (id: string | null) => void
  drawingVertices?: { lat: number; lng: number }[]
  focusPolygonId?: string | null
  categoryColors?: Record<string, { fill: string; stroke: string }>
  prodottoEmojiMap?: Record<number, string>
}

function computeBounds(paths: { lat: number; lng: number }[]) {
  let minLat = Infinity, maxLat = -Infinity
  let minLng = Infinity, maxLng = -Infinity
  for (const p of paths) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  return { minLat, maxLat, minLng, maxLng }
}

function centroid(paths: { lat: number; lng: number }[]) {
  if (!paths.length) return { lat: 0, lng: 0 }
  const n = paths.length
  return {
    lat: paths.reduce((a, p) => a + p.lat, 0) / n,
    lng: paths.reduce((a, p) => a + p.lng, 0) / n,
  }
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
  const mapRef = useRef<google.maps.Map | null>(null)
  const initializedRef = useRef(false)
  const prevFocusRef = useRef<string | null>(null)

  const { isLoaded } = useJsApiLoader({
    id: MAP_ID,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  })

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    if (!initializedRef.current) {
      if (polygons.length > 0) {
        const allPaths = polygons.flatMap(p => p.paths)
        const b = computeBounds(allPaths)
        const bounds = new google.maps.LatLngBounds()
        bounds.extend({ lat: b.minLat, lng: b.minLng })
        bounds.extend({ lat: b.maxLat, lng: b.maxLng })
        map.fitBounds(bounds)
      } else {
        map.setCenter(initialCenter)
        map.setZoom(13)
      }
      initializedRef.current = true
    }
  }, [initialCenter, polygons])

  const onUnmount = useCallback(() => {
    mapRef.current = null
    initializedRef.current = false
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !focusPolygonId || focusPolygonId === prevFocusRef.current) return
    prevFocusRef.current = focusPolygonId
    const poly = polygons.find(p => p.id === focusPolygonId)
    if (!poly?.paths?.length) return
    const b = computeBounds(poly.paths)
    const bounds = new google.maps.LatLngBounds()
    bounds.extend({ lat: b.minLat, lng: b.minLng })
    bounds.extend({ lat: b.maxLat, lng: b.maxLng })
    map.fitBounds(bounds)
  }, [focusPolygonId, polygons])

  if (!isLoaded) return <div className="w-full h-[400px] rounded-xl border bg-gray-50 flex items-center justify-center text-gray-400">Caricamento mappa Google...</div>

  const getPolygonEmojis = (poly: PolygonPath): string[] => {
    const emojis: string[] = []
    if (poly.prodottoIds?.length) {
      const seen = new Set<string>()
      for (const pid of poly.prodottoIds) {
        const e = prodottoEmojiMap[pid]
        if (e && !seen.has(e)) { seen.add(e); emojis.push(e) }
      }
    }
    if (emojis.length === 0) {
      const e = CATEGORY_EMOJI[poly.category || '']
      if (e) emojis.push(e)
    }
    if (emojis.length === 0) emojis.push('🌿')
    return emojis
  }

  return (
    <GoogleMap
      mapContainerClassName="w-full h-[400px] rounded-xl"
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={(e) => { if (e.latLng && onMapClick) onMapClick(e.latLng.lat(), e.latLng.lng()) }}
      options={{
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        mapTypeId: 'satellite',
        gestureHandling: 'greedy',
      }}
    >
      {polygons.map((poly, idx) => {
        const color = categoryColors[poly.category || ''] || DEFAULT_COLOR
        const isFocused = focusPolygonId === poly.id
        return (
          <Polygon
            key={poly.id || idx}
            paths={poly.paths}
            options={{
              fillColor: color.fill,
              fillOpacity: isFocused ? 0.5 : 0.35,
              strokeColor: isFocused ? '#000' : color.stroke,
              strokeWeight: isFocused ? 3 : 2,
              clickable: true,
            }}
            onClick={() => onPolygonSelect?.(poly.id || null)}
          />
        )
      })}
      {polygons.map((poly, idx) => {
        if (!poly.paths?.length) return null
        const c = centroid(poly.paths)
        const emojis = getPolygonEmojis(poly)
        return (
          <OverlayView
            key={`marker-${poly.id || idx}`}
            position={c}
            mapPaneName={OverlayView.OVERLAY_LAYER}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1px',
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
              onClick={() => onPolygonSelect?.(poly.id || null)}
            >
              {emojis.length === 1 ? (
                <span style={{ fontSize: '26px', lineHeight: '1', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}>
                  {emojis[0]}
                </span>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '2px',
                    maxWidth: '64px',
                    background: 'rgba(255,255,255,0.85)',
                    borderRadius: '8px',
                    padding: '3px 5px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  {emojis.map((e, i) => (
                    <span key={i} style={{ fontSize: '18px', lineHeight: '1.2' }}>{e}</span>
                  ))}
                </div>
              )}
            </div>
          </OverlayView>
        )
      })}
      {drawingVertices && drawingVertices.length > 1 && (
        <Polygon
          paths={drawingVertices}
          options={{
            fillColor: '#f59e0b',
            fillOpacity: 0.25,
            strokeColor: '#d97706',
            strokeWeight: 2,
            clickable: false,
          }}
        />
      )}
    </GoogleMap>
  )
}
