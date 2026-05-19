import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

const monthNames = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
]

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json([])
    const currentYear = new Date().getFullYear()

    const vendite = await prisma.vendite.findMany({
      where: {
        aziendaId,
        data: {
          gte: new Date(`${currentYear}-01-01`),
          lt: new Date(`${currentYear + 1}-01-01`),
        },
      },
      select: {
        data: true,
        importoTotale: true,
      },
    })

    const monthlyTotals: { [key: number]: number } = {}
    for (let i = 0; i < 12; i++) monthlyTotals[i] = 0

    for (const v of vendite) {
      const m = v.data.getMonth()
      monthlyTotals[m] += v.importoTotale ?? 0
    }

    const result = Object.entries(monthlyTotals).map(([monthIndex, totale]) => ({
      mese: monthNames[parseInt(monthIndex)],
      totale,
    }))

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero delle vendite mensili' }, { status: 500 })
  }
}
