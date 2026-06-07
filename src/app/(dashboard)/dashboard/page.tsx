import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { getGiacenzeAggregate, type GiacenzaAggregata } from '@/lib/api-utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Euro, Package, Users, AlertTriangle, ShoppingCart, TrendingUp, TrendingDown, PackageOpen, Receipt, CalendarClock } from 'lucide-react'
import { DashboardChart } from './dashboard-chart'
import { formatEuro, formatDate, formatNumber } from '@/lib/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function getStats(aziendaId: number) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [prodotti, clienti, soci, debiti, venditeMese, venditeMeseScorso, totaleVendite, debitiScaduti, giacenze, entrateMese, usciteMese, fattureNonPagate, rateInScadenza] = await Promise.all([
    prisma.prodotti.count({ where: { attivo: true, aziendaId } }),
    prisma.clienti.count({ where: { attivo: true, aziendaId } }),
    prisma.soci.count({ where: { attivo: true, aziendaId } }),
    prisma.debitiAperti.findMany({ where: { stato: 'aperto', aziendaId }, select: { importo: true, scadenza: true, cliente: { select: { nome: true, cognome: true } } } }),
    prisma.vendite.findMany({ where: { aziendaId, data: { gte: startOfMonth } }, select: { importoTotale: true } }),
    prisma.vendite.findMany({ where: { aziendaId, data: { gte: startOfLastMonth, lt: startOfMonth } }, select: { importoTotale: true } }),
    prisma.vendite.aggregate({ where: { aziendaId }, _sum: { importoTotale: true } }),
    prisma.debitiAperti.findMany({
      where: { stato: 'aperto', aziendaId, scadenza: { lt: now } },
      include: { cliente: { select: { nome: true, cognome: true } } },
      orderBy: { scadenza: 'asc' },
    }),
    getGiacenzeAggregate(aziendaId),
    prisma.movimentiCassa.aggregate({ where: { aziendaId, tipo: 'entrata', data: { gte: startOfMonth } }, _sum: { importo: true } }),
    prisma.movimentiCassa.aggregate({ where: { aziendaId, tipo: 'uscita', data: { gte: startOfMonth } }, _sum: { importo: true } }),
    prisma.vendite.findMany({
      where: { aziendaId, pagata: false },
      include: { cliente: { select: { nome: true, cognome: true } } },
      orderBy: { dataPagamentoPrevista: 'asc' },
    }),
    prisma.rate.findMany({
      where: { aziendaId, pagata: false, scadenza: { not: null } },
      orderBy: { scadenza: 'asc' },
      take: 10,
    }),
  ])

  const mese = venditeMese.reduce((a, v) => a + Number(v.importoTotale || 0), 0)
  const scorso = venditeMeseScorso.reduce((a, v) => a + Number(v.importoTotale || 0), 0)

  const prodottiScortaBassa = giacenze
    .filter((g) => g.giacenza <= 0)
    .map((g) => ({ nome: g.nome, varieta: g.varieta, giacenza: g.giacenza }))

  return {
    prodotti, clienti, soci,
    debitiTotale: debiti.reduce((a, d) => a + Number(d.importo), 0),
    debitiCount: debiti.length,
    venditeMese: mese, venditeMeseScorso: scorso,
    totaleVendite: Number(totaleVendite._sum.importoTotale || 0),
    trend: scorso > 0 ? ((mese - scorso) / scorso * 100).toFixed(1) : (mese > 0 ? '100.0' : '0'),
    debitiScaduti, prodottiScortaBassa,
    entrateMese: Number(entrateMese._sum.importo || 0),
    usciteMese: Number(usciteMese._sum.importo || 0),
    fattureNonPagate,
    rateInScadenza,
  }
}

export default async function DashboardPage() {
  const aziendaId = await getCurrentAziendaId()
  if (!aziendaId) redirect('/login')
  const s = await getStats(aziendaId)

  const totFattureNonPagate = s.fattureNonPagate.reduce((a, v) => a + Number(v.importoTotale || 0), 0)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500">Panoramica aziendale</p>
      </div>

      {/* Avvisi critici */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {s.debitiScaduti.length > 0 && (
          <Link href="/crediti-debiti" className="block group">
            <Card className="border-red-200 bg-red-50 group-hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-red-800 text-sm">Debiti clienti scaduti ({s.debitiScaduti.length})</h3>
                  </div>
                  <span className="text-xs text-red-400 group-hover:text-red-600">Vai a Crediti/Debiti →</span>
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
          </Link>
        )}

        {s.fattureNonPagate.length > 0 && (
          <Link href="/documenti" className="block group">
            <Card className="border-amber-200 bg-amber-50 group-hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-800 text-sm">Fatture in attesa saldo ({s.fattureNonPagate.length})</h3>
                  </div>
                  <span className="text-xs text-amber-400 group-hover:text-amber-600">Vai a DDT e Fatture →</span>
                </div>
                <div className="space-y-1">
                  {s.fattureNonPagate.slice(0, 5).map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-sm">
                      <span className="text-amber-700">{v.cliente?.nome} {v.cliente?.cognome || ''}</span>
                      <div className="text-right">
                        <span className="font-medium text-amber-800 block">{formatEuro(Number(v.importoTotale || 0))}</span>
                        {v.dataPagamentoPrevista && (
                          <span className="text-[10px] text-amber-600">Entro {formatDate(v.dataPagamentoPrevista)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {s.fattureNonPagate.length > 5 && (
                    <p className="text-xs text-amber-600 text-center pt-1">+{s.fattureNonPagate.length - 5} altre fatture</p>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-amber-200 flex justify-between text-sm font-medium">
                  <span className="text-amber-800">Totale da incassare</span>
                  <span className="text-amber-900 font-bold">{formatEuro(totFattureNonPagate)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {s.prodottiScortaBassa.length > 0 && (
          <Link href="/magazzino" className="block group">
            <Card className="border-amber-200 bg-amber-50 group-hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PackageOpen className="w-5 h-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-800 text-sm">Prodotti esauriti ({s.prodottiScortaBassa.length})</h3>
                  </div>
                  <span className="text-xs text-amber-400 group-hover:text-amber-600">Vai a Magazzino →</span>
                </div>
                <div className="space-y-1">
                  {s.prodottiScortaBassa.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-amber-700">{p.nome}{p.varieta ? ` - ${p.varieta}` : ''}</span>
                      <span className="font-medium text-amber-800">{formatNumber(p.giacenza)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {s.rateInScadenza.length > 0 && (
          <Link href="/contabilita" className="block group">
            <Card className="border-blue-200 bg-blue-50 group-hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-800 text-sm">Rate in scadenza ({s.rateInScadenza.length})</h3>
                  </div>
                  <span className="text-xs text-blue-400 group-hover:text-blue-600">Vai a Contabilità →</span>
                </div>
                <div className="space-y-1">
                  {s.rateInScadenza.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-blue-700">Rata {r.nota || `#${r.id}`}</span>
                      <div className="text-right">
                        <span className="font-medium text-blue-800 block">{formatEuro(Number(r.importo))}</span>
                        {r.scadenza && <span className="text-[10px] text-blue-600">{formatDate(r.scadenza)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
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
        <Stat label="Crediti aperti" value={`${s.debitiCount} (${formatEuro(s.debitiTotale)})`} icon={AlertTriangle} color="text-red-600" />
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

function Stat({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string }) {
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