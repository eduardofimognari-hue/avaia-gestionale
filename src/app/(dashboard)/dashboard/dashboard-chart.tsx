'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatEuro } from '@/lib/utils'

interface Data { mese: string; totale: number }

export function DashboardChart() {
  const [data, setData] = useState<Data[]>([])
  const [focus, setFocus] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/vendite/mensili').then(r => r.json()).then(setData).catch(() => {})
  }, [])

  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Nessun dato disponibile</p>
  }

  const max = Math.max(...data.map(d => d.totale))

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} onClick={(e) => {
          if (e?.activeTooltipIndex !== undefined) setFocus(focus === e.activeTooltipIndex ? null : e.activeTooltipIndex)
        }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="mese" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `€${v}`} width={50} />
          <Tooltip
            formatter={(v: number) => [formatEuro(v), 'Vendite']}
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
          />
          <Bar dataKey="totale" radius={[6, 6, 0, 0]} cursor="pointer">
            {data.map((_, i) => (
              <Cell key={i} fill={focus === i ? '#15803d' : '#22c55e'} fillOpacity={focus === i ? 1 : 0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {focus !== null && data[focus] && (
        <div className="mt-2 p-3 bg-primary-50 rounded-lg text-center">
          <p className="text-sm text-gray-600">{data[focus].mese}</p>
          <p className="text-xl font-bold text-primary-700">{formatEuro(data[focus].totale)}</p>
        </div>
      )}
    </div>
  )
}
