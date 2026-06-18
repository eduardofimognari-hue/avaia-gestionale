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
        obiettivi: { orderBy: { percentualePriorita: 'desc' } },
      },
    })

    if (!scenario) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

    const anni: number[] = []
    for (let a = scenario.annoInizio; a <= scenario.annoFine; a++) anni.push(a)

    // Movimenti cassa ricorrenti (si ripetono ogni anno)
    const movimentiRicorrenti = await prisma.movimentiCassa.findMany({
      where: { aziendaId, ricorrente: true, stato: 'pagato' },
    })
    const entrateRicorrentiCassa = movimentiRicorrenti
      .filter(m => m.tipo === 'entrata')
      .reduce((sum, m) => sum + m.importo, 0)
    const usciteRicorrentiCassa = movimentiRicorrenti
      .filter(m => m.tipo === 'uscita')
      .reduce((sum, m) => sum + m.importo, 0)

    // Uscite ricorrenti scenario (si ripetono ogni anno)
    const usciteRicorrentiScenario = scenario.uscite
      .filter(u => u.tipologia === 'ricorrente')
      .reduce((sum, u) => sum + u.importo, 0)

    // Entrate ricorrenti scenario
    const entrateRicorrentiScenario = scenario.entrate
      .filter(e => e.naturaTipo === 'ricorrente')
      .reduce((sum, e) => {
        if (e.tipo === 'produzione') return sum + (e.quantitaStimata ?? 0) * (e.prezzoStimato ?? 0)
        return sum + (e.importoFisso ?? 0)
      }, 0)

    // Calcola surplus per anno
    const surplusPerAnno: Record<number, number> = {}
    const perAnno = anni.map(anno => {
      const entrateStimate = scenario.entrate
        .filter(e => e.naturaTipo === 'stimata' && e.anno === anno)
        .reduce((sum, e) => {
          if (e.tipo === 'produzione') return sum + (e.quantitaStimata ?? 0) * (e.prezzoStimato ?? 0)
          return sum + (e.importoFisso ?? 0)
        }, 0)

      const usciteCorrenti = scenario.uscite
        .filter(u => u.tipologia === 'corrente' && u.anno === anno)
        .reduce((sum, u) => sum + u.importo, 0)

      const totEntrate = entrateStimate + entrateRicorrentiScenario + entrateRicorrentiCassa
      const totUscite = usciteCorrenti + usciteRicorrentiScenario + usciteRicorrentiCassa
      const surplus = totEntrate - totUscite
      surplusPerAnno[anno] = surplus

      return {
        anno,
        entrateStimate,
        entrateRicorrentiScenario,
        entrateRicorrentiCassa,
        totEntrate,
        usciteCorrenti,
        usciteRicorrentiScenario,
        usciteRicorrentiCassa,
        totUscite,
        surplus,
      }
    })

    // Distribuisce gli obiettivi di spesa proporzionalmente al surplus per anno
    // Ogni obiettivo reclama indipendentemente la sua % del surplus annuo
    const obiettivi = scenario.obiettivi.map(ob => {
      let remaining = ob.importoTarget
      const allocazionePerAnno: { anno: number; quota: number; allocato: number }[] = []

      for (const anno of anni) {
        const surplus = surplusPerAnno[anno]
        if (surplus <= 0 || remaining <= 0) {
          allocazionePerAnno.push({ anno, quota: 0, allocato: 0 })
          continue
        }
        const quota = surplus * (ob.percentualePriorita / 100)
        const allocato = Math.min(quota, remaining)
        remaining -= allocato
        allocazionePerAnno.push({ anno, quota, allocato })
      }

      const totalAllocato = ob.importoTarget - remaining
      const percentualeCoperta = ob.importoTarget > 0 ? (totalAllocato / ob.importoTarget) * 100 : 100
      const annoCompletamento = allocazionePerAnno.find(
        (_, i) => allocazionePerAnno.slice(0, i + 1).reduce((s, x) => s + x.allocato, 0) >= ob.importoTarget - 0.01
      )?.anno ?? null

      return {
        id: ob.id,
        nome: ob.nome,
        categoria: ob.categoria,
        percentualePriorita: ob.percentualePriorita,
        importoTarget: ob.importoTarget,
        totalAllocato,
        percentualeCoperta,
        annoCompletamento,
        allocazionePerAnno,
        stato: percentualeCoperta >= 99.9 ? 'raggiunto' : percentualeCoperta > 0 ? 'parziale' : 'non_raggiunto',
        note: ob.note,
      }
    })

    // Calcola totale allocato per obiettivi per anno (somma di tutti gli obiettivi)
    const perAnnoConObiettivi = perAnno.map(row => {
      const allocatoObiettivi = obiettivi.reduce((sum, ob) => {
        const a = ob.allocazionePerAnno.find(x => x.anno === row.anno)
        return sum + (a?.allocato ?? 0)
      }, 0)
      return { ...row, allocatoObiettivi, residuo: row.surplus - allocatoObiettivi }
    })

    const totale = {
      totEntrate: perAnno.reduce((s, r) => s + r.totEntrate, 0),
      totUscite: perAnno.reduce((s, r) => s + r.totUscite, 0),
      surplus: perAnno.reduce((s, r) => s + r.surplus, 0),
      allocatoObiettivi: perAnnoConObiettivi.reduce((s, r) => s + r.allocatoObiettivi, 0),
      residuo: perAnnoConObiettivi.reduce((s, r) => s + r.residuo, 0),
    }

    return NextResponse.json({
      anni,
      perAnno: perAnnoConObiettivi,
      totale,
      obiettivi,
      movimentiRicorrentiCassa: {
        entrate: entrateRicorrentiCassa,
        uscite: usciteRicorrentiCassa,
        count: movimentiRicorrenti.length,
      },
    })
  })
}
