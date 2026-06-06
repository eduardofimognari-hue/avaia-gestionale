import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda } from '@/lib/api-utils'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [venditeMese, venditeAnno, venditeTotali, totaleVendite, entrateMese, usciteMese,
      prodottiCount, clientiCount, sociCount, giacenze, debitiAperti, oreLavoroMese] = await Promise.all([
      prisma.vendite.aggregate({ where: { aziendaId, data: { gte: startOfMonth } }, _sum: { importoTotale: true } }),
      prisma.vendite.aggregate({ where: { aziendaId, data: { gte: startOfYear } }, _sum: { importoTotale: true } }),
      prisma.vendite.findMany({ where: { aziendaId }, select: { data: true, importoTotale: true } }),
      prisma.vendite.aggregate({ where: { aziendaId }, _sum: { importoTotale: true } }),
      prisma.movimentiCassa.aggregate({ where: { aziendaId, tipo: 'entrata', data: { gte: startOfMonth } }, _sum: { importo: true } }),
      prisma.movimentiCassa.aggregate({ where: { aziendaId, tipo: 'uscita', data: { gte: startOfMonth } }, _sum: { importo: true } }),
      prisma.prodotti.count({ where: { attivo: true, aziendaId } }),
      prisma.clienti.count({ where: { attivo: true, aziendaId } }),
      prisma.soci.count({ where: { attivo: true, aziendaId } }),
      prisma.movimentiInput.groupBy({ by: ['prodottoId'], where: { aziendaId }, _sum: { quantita: true } }),
      prisma.debitiAperti.aggregate({ where: { aziendaId, stato: 'aperto' }, _sum: { importo: true } }),
      prisma.lavoroSoci.aggregate({ where: { aziendaId, data: { gte: startOfMonth } }, _sum: { ore: true } }),
    ])

    // Vendite per mese
    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
    const monthlyTotals: Record<number, number> = {}
    for (let i = 0; i < 12; i++) monthlyTotals[i] = 0
    for (const v of venditeTotali) {
      if (v.data.getFullYear() === now.getFullYear()) {
        monthlyTotals[v.data.getMonth()] += Number(v.importoTotale || 0)
      }
    }
    const trendMensile = Object.entries(monthlyTotals).map(([m, t]) => ({ mese: monthNames[parseInt(m)], totale: t }))

    return NextResponse.json({
      venditeMese: Number(venditeMese._sum.importoTotale ?? 0),
      venditeAnno: Number(venditeAnno._sum.importoTotale ?? 0),
      totaleVendite: Number(totaleVendite._sum.importoTotale ?? 0),
      entrateMese: Number(entrateMese._sum.importo ?? 0),
      usciteMese: Number(usciteMese._sum.importo ?? 0),
      prodotti: prodottiCount,
      clienti: clientiCount,
      soci: sociCount,
      giacenzeProdotti: giacenze.length,
      debitiAperti: Number(debitiAperti._sum.importo ?? 0),
      oreLavoroMese: Number(oreLavoroMese._sum.ore ?? 0),
      trendMensile,
    })
  })
}