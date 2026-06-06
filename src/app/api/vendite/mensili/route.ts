import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda } from '@/lib/api-utils'

const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const currentYear = new Date().getFullYear()
    const vendite = await prisma.vendite.findMany({
      where: { aziendaId, data: { gte: new Date(`${currentYear}-01-01`), lt: new Date(`${currentYear + 1}-01-01`) } },
      select: { data: true, importoTotale: true },
    })
    const monthlyTotals: Record<number, number> = {}
    for (let i = 0; i < 12; i++) monthlyTotals[i] = 0
    for (const v of vendite) {
      monthlyTotals[v.data.getUTCMonth()] += v.importoTotale ?? 0
    }
    return NextResponse.json(
      Object.entries(monthlyTotals).map(([monthIndex, totale]) => ({ mese: monthNames[parseInt(monthIndex)], totale }))
    )
  })
}
