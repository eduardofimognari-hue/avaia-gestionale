import { useState, useEffect, useCallback } from 'react'

export function useFetch<T>(url: string, options?: { immediate?: boolean; onError?: (err: string) => void }) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Errore caricamento dati')
      const json = await res.json()
      setData(json)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto'
      setError(msg)
      options?.onError?.(msg)
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    if (options?.immediate !== false) fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData, setData }
}

export function useFetchMulti<T extends Record<string, unknown>>(
  endpoints: { [K in keyof T]: string },
  options?: { immediate?: boolean },
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const entries = Object.entries(endpoints) as [keyof T, string][]
      const results = await Promise.all(
        entries.map(async ([key, url]) => {
          const res = await fetch(url)
          if (!res.ok) throw new Error(`Errore caricamento ${String(key)}`)
          return [key, await res.json()] as const
        }),
      )
      setData(Object.fromEntries(results) as T)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (options?.immediate !== false) fetchAll()
  }, [fetchAll])

  return { data, loading, error, refetch: fetchAll, setData }
}
