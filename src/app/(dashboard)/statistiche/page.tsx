'use client'
import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatEuro, formatNumber } from '@/lib/utils'
import { Euro, Package, Users, ShoppingCart, TrendingUp, TrendingDown, Clock, AlertTriangle, BarChart3 } from 'lucide-react'

type Stats = {
  venditeMese: number; venditeAnno: number; totaleVendite: number
  entrateMese: number; usciteMese: number
  prodotti: number; clienti: number; soci: number
  giacenzeProdotti: number; debitiAperti: number; oreLavoroMese: number
  trendMensile: { mese: string; totale: number }[]
}

export default function StatistichePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/statistiche').then(r => r.json()).then(setStats).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-500">Caricamento statistiche...</p>
  if (!stats) return <p className="text-red-500">Errore caricamento</p>

  const maxVendite = Math.max(...stats.trendMensile.map(m => m.totale), 1)

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Statistiche" description="Report e analisi dei dati aziendali" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ShoppingCart} label="Vendite mese" value={formatEuro(stats.venditeMese)} color="text-sky-600" />
        <StatCard icon={TrendingUp} label="Vendite anno" value={formatEuro(stats.venditeAnno)} color="text-green-600" />
        <StatCard icon={Euro} label="Entrate mese" value={formatEuro(stats.entrateMese)} color="text-emerald-600" />
        <StatCard icon={TrendingDown} label="Uscite mese" value={formatEuro(stats.usciteMese)} color="text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Trend vendite mensile */}
        <Card>
          <CardHeader><h3 className="font-semibold text-sm">Andamento vendite mensile</h3></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-end gap-2 h-40 pt-4">
              {stats.trendMensile.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">{formatEuro(m.totale)}</span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-primary-500 to-primary-300 transition-all hover:from-primary-600"
                    style={{ height: `${(m.totale / maxVendite) * 100}%`, minHeight: m.totale > 0 ? '4px' : '0' }}
                  />
                  <span className="text-[10px] text-gray-400">{m.mese}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* KPI generali */}
        <Card>
          <CardHeader><h3 className="font-semibold text-sm">Indicatori chiave</h3></CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <KpiRow label="Prodotti attivi" value={stats.prodotti.toString()} icon={Package} color="text-blue-600" />
            <KpiRow label="Clienti" value={stats.clienti.toString()} icon={Users} color="text-green-600" />
            <KpiRow label="Soci" value={stats.soci.toString()} icon={Users} color="text-purple-600" />
            <KpiRow label="Prodotti in giacenza" value={stats.giacenzeProdotti.toString()} icon={Package} color="text-orange-600" />
            <KpiRow label="Debiti aperti" value={formatEuro(stats.debitiAperti)} icon={AlertTriangle} color="text-red-600" />
            <KpiRow label="Ore lavoro mese" value={formatNumber(stats.oreLavoroMese, 1)} icon={Clock} color="text-stone-600" />
          </CardContent>
        </Card>
      </div>

      {/* Saldo mensile */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Saldo del mese</p>
              <p className={`text-3xl font-bold mt-1 ${stats.entrateMese - stats.usciteMese >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatEuro(stats.entrateMese - stats.usciteMese)}
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-xs text-green-600 font-medium">Entrate</p>
                <p className="text-xl font-bold text-green-700">{formatEuro(stats.entrateMese)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-red-600 font-medium">Uscite</p>
                <p className="text-xl font-bold text-red-700">{formatEuro(stats.usciteMese)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <Icon className={`w-8 h-8 ${color}`} />
      <div><p className="text-xs text-gray-500">{label}</p><p className="text-lg font-bold">{value}</p></div>
    </CardContent></Card>
  )
}

function KpiRow({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2"><Icon className={`w-4 h-4 ${color}`} /><span className="text-sm text-gray-600">{label}</span></div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  )
}