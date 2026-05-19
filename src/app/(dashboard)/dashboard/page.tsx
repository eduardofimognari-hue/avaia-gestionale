import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Euro, Package, Users, AlertTriangle, ShoppingCart, TrendingUp, TrendingDown, PackageOpen } from 'lucide-react'
import { DashboardChart } from './dashboard-chart'
import { formatEuro, formatDate, formatNumber } from '@/lib/utils'
import { redirect } from 'next/navigation'

async function getStats(aziendaId: number) {
  const [prodotti, clienti, soci, debiti, venditeMese, venditeMeseScorso, totaleVendite, debitiScaduti, movimentiCarico, movimentiScarico, entrateMese, usciteMese] = await Promise.all([
    prisma.prodotti.count({ where: { attivo: true, aziendaId } }),
    prisma.clienti.count({ where: { attivo: true, aziendaId } }),
    prisma.soci.count({ where: { attivo: true, aziendaId } }),
    prisma.debitiAperti.findMany({ where: { stato: 'aperto', aziendaId }, select: { importo: true } }),
    prisma.vendite.findMany({ where: { aziendaId, data: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }, select: { importoTotale: true } }),
    prisma.vendite.findMany({ where: { aziendaId, data: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }, select: { importoTotale: true } }),
    prisma.vendite.aggregate({ where: { aziendaId }, _sum: { importoTotale: true } }),
    prisma.debitiAperti.findMany({
      where: { stato: 'aperto', aziendaId, scadenza: { lt: new Date() } },
      include: { cliente: { select: { nome: true, cognome: true } } },
      orderBy: { scadenza: 'asc' },
    }),
    prisma.movimentiInput.groupBy({ by: ['prodottoId'], where: { aziendaId, tipo: { in: ['carico', 'reso'] } }, _sum: { quantita: true } }),
    prisma.movimentiInput.groupBy({ by: ['prodottoId'], where: { aziendaId, tipo: { in: ['scarico', 'vendita'] } }, _sum: { quantita: true } }),
    prisma.movimentiCassa.aggregate({ where: { aziendaId, tipo: 'entrata', data: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }, _sum: { importo: true } }),
    prisma.movimentiCassa.aggregate({ where: { aziendaId, tipo: 'uscita', data: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }, _sum: { importo: true } }),
  ])
  const mese = venditeMese.reduce((a, v) => a + Number(v.importoTotale || 0), 0)
  const scorso = venditeMeseScorso.reduce((a, v) => a + Number(v.importoTotale || 0), 0)

  const caricoMap = new Map(movimentiCarico.map(m => [m.prodottoId, Number(m._sum.quantita || 0)]))
  const scaricoMap = new Map(movimentiScarico.map(m => [m.prodottoId, Number(m._sum.quantita || 0)]))
  const tuttiIds = Array.from(new Set([...Array.from(caricoMap.keys()), ...Array.from(scaricoMap.keys())]))

  const prodottiConId = tuttiIds.length > 0
    ? await prisma.prodotti.findMany({
        where: { id: { in: tuttiIds }, aziendaId, tipo: 'prodotto' },
        select: { id: true, nome: true, varietaTipologia: true },
      })
    : []

  const prodottiScortaBassa = prodottiConId.map((prod) => {
    const giacenza = (caricoMap.get(prod.id) || 0) - (scaricoMap.get(prod.id) || 0)
    if (giacenza <= 0) return { nome: prod.nome, varieta: prod.varietaTipologia, giacenza: Math.max(0, giacenza) }
    return null
  }).filter(Boolean)

  const entrateMeseTot = Number(entrateMese._sum.importo || 0)
  const usciteMeseTot = Number(usciteMese._sum.importo || 0)

  return {
    prodotti, clienti, soci,
    debitiTotale: debiti.reduce((a, d) => a + Number(d.importo), 0),
    venditeMese: mese,
    venditeMeseScorso: scorso,
    totaleVendite: Number(totaleVendite._sum.importoTotale || 0),
    trend: scorso > 0 ? ((mese - scorso) / scorso * 100).toFixed(1) : (mese > 0 ? '100.0' : '0'),
    debitiScaduti,
    prodottiScortaBassa,
    entrateMese: entrateMeseTot,
    usciteMese: usciteMeseTot,
  }
}

export default async function DashboardPage() {
  const aziendaId = await getCurrentAziendaId()
  if (!aziendaId) redirect('/login')
  const s = await getStats(aziendaId)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500">Panoramica aziendale</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {s.debitiScaduti.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-800 text-sm">Debiti clienti scaduti ({s.debitiScaduti.length})</h3>
              </div>
              <div className="space-y-1">
                {s.debitiScaduti.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="text-red-700">{d.cliente?.nome} {d.cliente?.cognome || ''}</span>
                    <span className="font-medium text-red-800">{formatEuro(Number(d.importo))}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {s.prodottiScortaBassa.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <PackageOpen className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-800 text-sm">Prodotti esauriti ({s.prodottiScortaBassa.length})</h3>
              </div>
              <div className="space-y-1">
                {s.prodottiScortaBassa.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-amber-700">{p.nome}{p.varieta ? ` - ${p.varieta}` : ''}</span>
                    <span className="font-medium text-amber-800">{formatNumber(p.giacenza)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="mb-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Vendite {new Date().toLocaleString('it-IT', { month: 'long' })}</p>
                <p className="text-3xl font-bold mt-1">{formatEuro(s.venditeMese)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {Number(s.trend) >= 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                  <span className={`text-sm font-medium ${Number(s.trend) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {s.trend}% vs mese scorso
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1">
                <p className="text-xs text-gray-400">Totale annuale</p>
                <p className="text-lg font-semibold">{formatEuro(s.totaleVendite)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-0">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500 mb-2">Contabilità mensile</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium">Entrate</p>
                <p className="text-xl font-bold text-green-700">{formatEuro(s.entrateMese)}</p>
              </div>
              <div className="text-gray-300 text-xl font-light">|</div>
              <div>
                <p className="text-xs text-red-600 font-medium">Uscite</p>
                <p className="text-xl font-bold text-red-700">{formatEuro(s.usciteMese)}</p>
              </div>
              <div className="text-gray-300 text-xl font-light">|</div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Saldo</p>
                <p className={`text-xl font-bold ${s.entrateMese - s.usciteMese >= 0 ? 'text-primary-700' : 'text-red-700'}`}>
                  {formatEuro(s.entrateMese - s.usciteMese)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Prodotti" value={s.prodotti} icon={Package} color="text-blue-600" />
        <Stat label="Clienti" value={s.clienti} icon={Users} color="text-green-600" />
        <Stat label="Soci" value={s.soci} icon={Users} color="text-purple-600" />
        <Stat label="Debiti aperti" value={formatEuro(s.debitiTotale)} icon={AlertTriangle} color="text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><h3 className="font-semibold text-sm">Andamento vendite mensile</h3></CardHeader>
          <CardContent className="p-4 pt-0">
            <DashboardChart />
          </CardContent>
        </Card>

        <UltimeVendite aziendaId={aziendaId} />
      </div>
    </div>
  )
}

async function UltimeVendite({ aziendaId }: { aziendaId: number }) {
  const items = await prisma.vendite.findMany({
    where: { aziendaId },
    take: 5, orderBy: { data: 'desc' },
    include: { cliente: { select: { nome: true, cognome: true } } },
  })
  return (
    <Card>
      <CardHeader><h3 className="font-semibold text-sm">Ultime vendite</h3></CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 p-5 text-center">Nessuna vendita</p>
        ) : (
          <div className="divide-y">
            {items.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{v.cliente ? `${v.cliente.nome} ${v.cliente.cognome || ''}` : 'Cliente generico'}</p>
                  <p className="text-xs text-gray-400">{new Date(v.data).toLocaleDateString('it-IT')}</p>
                </div>
                <Badge variant={v.importoTotale ? 'success' : 'default'} className="ml-2 shrink-0">
                  {formatEuro(Number(v.importoTotale || 0))}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`w-8 h-8 ${color}`} />
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
