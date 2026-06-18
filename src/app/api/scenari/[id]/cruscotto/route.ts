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

    // Movimenti ricorrenti (stima annuale ripetuta ogni anno del piano)
    const movimentiRicorrenti = await prisma.movimentiCassa.findMany({
      where: { aziendaId, ricorrente: true, stato: 'pagato' },
    })
    const entrateRicorrentiCassa = movimentiRicorrenti
      .filter(m => m.tipo === 'entrata').reduce((s, m) => s + m.importo, 0)
    const usciteRicorrentiCassa = movimentiRicorrenti
      .filter(m => m.tipo === 'uscita').reduce((s, m) => s + m.importo, 0)

    // Tutti i movimenti reali nel periodo (per il confronto con il piano)
    const movimentiReali = await prisma.movimentiCassa.findMany({
      where: {
        aziendaId,
        stato: 'pagato',
        data: {
          gte: new Date(`${scenario.annoInizio}-01-01`),
          lte: new Date(`${scenario.annoFine}-12-31T23:59:59`),
        },
      },
    })

    const usciteRicorrentiScenario = scenario.uscite
      .filter(u => u.tipologia === 'ricorrente')
      .reduce((s, u) => s + u.importo, 0)

    const entrateRicorrentiScenario = scenario.entrate
      .filter(e => e.naturaTipo === 'ricorrente')
      .reduce((s, e) => e.tipo === 'produzione'
        ? s + (e.quantitaStimata ?? 0) * (e.prezzoStimato ?? 0)
        : s + (e.importoFisso ?? 0), 0)

    // Calcolo margine per anno (stimato)
    const marginePerAnno: Record<number, number> = {}

    const perAnno = anni.map(anno => {
      const entrateStimate = scenario.entrate
        .filter(e => e.naturaTipo === 'stimata' && e.anno === anno)
        .reduce((s, e) => e.tipo === 'produzione'
          ? s + (e.quantitaStimata ?? 0) * (e.prezzoStimato ?? 0)
          : s + (e.importoFisso ?? 0), 0)

      const usciteCorrenti = scenario.uscite
        .filter(u => u.tipologia === 'corrente' && u.anno === anno)
        .reduce((s, u) => s + u.importo, 0)

      const totEntrate = entrateStimate + entrateRicorrentiScenario + entrateRicorrentiCassa
      const totUscite = usciteCorrenti + usciteRicorrentiScenario + usciteRicorrentiCassa
      const margine = totEntrate - totUscite
      marginePerAnno[anno] = margine

      return {
        anno, entrateStimate, entrateRicorrentiScenario, entrateRicorrentiCassa,
        totEntrate, usciteCorrenti, usciteRicorrentiScenario, usciteRicorrentiCassa,
        totUscite, margine,
      }
    })

    // Dati reali da movimenti cassa, per anno
    const realePerAnno = anni.map(anno => {
      const movAnno = movimentiReali.filter(m => new Date(m.data).getFullYear() === anno)
      const entratoReale = movAnno.filter(m => m.tipo === 'entrata').reduce((s, m) => s + m.importo, 0)
      const usciteReali = movAnno.filter(m => m.tipo === 'uscita').reduce((s, m) => s + m.importo, 0)
      return {
        anno,
        entratoReale,
        usciteReali,
        margineReale: entratoReale - usciteReali,
        numMovimenti: movAnno.length,
      }
    })

    const totaleReale = {
      entratoReale: realePerAnno.reduce((s, r) => s + r.entratoReale, 0),
      usciteReali: realePerAnno.reduce((s, r) => s + r.usciteReali, 0),
      margineReale: realePerAnno.reduce((s, r) => s + r.margineReale, 0),
    }

    // Distribuzione obiettivi sul margine per anno
    const obiettivi = scenario.obiettivi.map(ob => {
      let remaining = ob.importoTarget
      const allocazionePerAnno: { anno: number; quota: number; allocato: number }[] = []

      for (const anno of anni) {
        const margine = marginePerAnno[anno]
        if (margine <= 0 || remaining <= 0) {
          allocazionePerAnno.push({ anno, quota: 0, allocato: 0 })
          continue
        }
        const quota = margine * (ob.percentualePriorita / 100)
        const allocato = Math.min(quota, remaining)
        remaining -= allocato
        allocazionePerAnno.push({ anno, quota, allocato })
      }

      const totalAllocato = ob.importoTarget - remaining
      const percentualeCoperta = ob.importoTarget > 0 ? (totalAllocato / ob.importoTarget) * 100 : 100

      let acc = 0
      let annoCompletamento: number | null = null
      for (const x of allocazionePerAnno) {
        acc += x.allocato
        if (!annoCompletamento && acc >= ob.importoTarget - 0.01) annoCompletamento = x.anno
      }

      return {
        id: ob.id, nome: ob.nome, categoria: ob.categoria,
        percentualePriorita: ob.percentualePriorita, importoTarget: ob.importoTarget,
        totalAllocato, percentualeCoperta, annoCompletamento, allocazionePerAnno,
        stato: percentualeCoperta >= 99.9 ? 'raggiunto' : percentualeCoperta > 0 ? 'parziale' : 'non_raggiunto',
        note: ob.note,
      }
    })

    const perAnnoFinale = perAnno.map(row => {
      const investitoObiettivi = obiettivi.reduce((s, ob) => {
        const a = ob.allocazionePerAnno.find(x => x.anno === row.anno)
        return s + (a?.allocato ?? 0)
      }, 0)
      return { ...row, investitoObiettivi, margineLibero: row.margine - investitoObiettivi }
    })

    const totale = {
      totEntrate: perAnno.reduce((s, r) => s + r.totEntrate, 0),
      totUscite: perAnno.reduce((s, r) => s + r.totUscite, 0),
      margine: perAnno.reduce((s, r) => s + r.margine, 0),
      investitoObiettivi: perAnnoFinale.reduce((s, r) => s + r.investitoObiettivi, 0),
      margineLibero: perAnnoFinale.reduce((s, r) => s + r.margineLibero, 0),
    }

    return NextResponse.json({
      anni,
      perAnno: perAnnoFinale,
      realePerAnno,
      totale,
      totaleReale,
      obiettivi,
      movimentiRicorrentiCassa: {
        entrate: entrateRicorrentiCassa,
        uscite: usciteRicorrentiCassa,
        count: movimentiRicorrenti.length,
      },
    })
  })
}
