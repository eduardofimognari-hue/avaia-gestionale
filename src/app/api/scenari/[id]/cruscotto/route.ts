import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAzienda } from '@/lib/api-utils'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const scenarioId = parseInt(params.id)
  return withAzienda(async (aziendaId) => {
    const scenario = await prisma.scenario.findFirst({
      where: { id: scenarioId, aziendaId },
      include: {
        uscite: true,
        entrate: true,
        obiettivi: { orderBy: { priorita: 'asc' } },
      },
    })

    if (!scenario) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

    const anni: number[] = []
    for (let a = scenario.annoInizio; a <= scenario.annoFine; a++) anni.push(a)

    const movimentiReali = await prisma.movimentiCassa.findMany({
      where: {
        aziendaId,
        data: {
          gte: new Date(`${scenario.annoInizio}-01-01`),
          lte: new Date(`${scenario.annoFine}-12-31T23:59:59`),
        },
        stato: 'pagato',
      },
    })

    const perAnno = anni.map(anno => {
      const entratePreviste = scenario.entrate
        .filter(e => e.anno === anno)
        .reduce((sum, e) => {
          if (e.tipo === 'produzione') return sum + (e.quantitaStimata ?? 0) * (e.prezzoStimato ?? 0)
          return sum + (e.importoFisso ?? 0)
        }, 0)

      const uscitePreviste = scenario.uscite
        .filter(u => u.anno === anno)
        .reduce((sum, u) => sum + u.importo, 0)

      const movAnno = movimentiReali.filter(m => new Date(m.data).getFullYear() === anno)
      const entratoReale = movAnno.filter(m => m.tipo === 'entrata').reduce((sum, m) => sum + m.importo, 0)
      const usciteReali = movAnno.filter(m => m.tipo === 'uscita').reduce((sum, m) => sum + m.importo, 0)

      return {
        anno,
        entratePreviste,
        uscitePreviste,
        nettoPrevisto: entratePreviste - uscitePreviste,
        entratoReale,
        usciteReali,
        nettoReale: entratoReale - usciteReali,
        scostamentoEntrate: entratoReale - entratePreviste,
        scostamentoUscite: usciteReali - uscitePreviste,
        scostamentoNetto: (entratoReale - usciteReali) - (entratePreviste - uscitePreviste),
      }
    })

    const totale = perAnno.reduce((acc, a) => ({
      entratePreviste: acc.entratePreviste + a.entratePreviste,
      uscitePreviste: acc.uscitePreviste + a.uscitePreviste,
      nettoPrevisto: acc.nettoPrevisto + a.nettoPrevisto,
      entratoReale: acc.entratoReale + a.entratoReale,
      usciteReali: acc.usciteReali + a.usciteReali,
      nettoReale: acc.nettoReale + a.nettoReale,
    }), { entratePreviste: 0, uscitePreviste: 0, nettoPrevisto: 0, entratoReale: 0, usciteReali: 0, nettoReale: 0 })

    let disponibileReale = totale.nettoReale
    const obiettivi = scenario.obiettivi.map(ob => {
      const importoTarget = ob.importoFisso ?? (totale.nettoPrevisto * (ob.percentuale ?? 0) / 100)
      const importoCoperto = Math.min(importoTarget, Math.max(0, disponibileReale))
      disponibileReale -= importoCoperto
      const percentualeCoperta = importoTarget > 0 ? (importoCoperto / importoTarget) * 100 : 100
      return {
        id: ob.id,
        nome: ob.nome,
        tipo: ob.tipo,
        percentuale: ob.percentuale,
        importoFisso: ob.importoFisso,
        priorita: ob.priorita,
        importoTarget,
        importoCoperto,
        percentualeCoperta,
        stato: percentualeCoperta >= 99.9 ? 'raggiunto' : percentualeCoperta > 0 ? 'parziale' : 'non_raggiunto',
      }
    })

    return NextResponse.json({ anni, perAnno, totale, obiettivi })
  })
}
