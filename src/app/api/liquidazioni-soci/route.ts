import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { z } from 'zod'

const liquidazioneSchema = z.object({
  data: z.string().optional(),
  tipo: z.enum(['interna', 'esterna']),
  tipoMovimento: z.enum(['credito', 'debito']),
  socioId: z.number().optional().nullable(),
  clienteId: z.number().optional().nullable(),
  importo: z.number({ required_error: 'Importo obbligatorio' }).positive('Importo deve essere positivo'),
  note: z.string().optional().nullable(),
})

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const [liquidazioni, casse, posizioniSoci] = await Promise.all([
      prisma.liquidazioniSoci.findMany({
        where: { aziendaId },
        orderBy: { data: 'desc' },
        include: {
          socio: { select: { id: true, nome: true, cognome: true } },
          cliente: { select: { id: true, nome: true, cognome: true } },
          movimenti: { select: { id: true, tipo: true, importo: true, categoria: true, descrizione: true } },
          movimentoCassa: { select: { id: true, importo: true, tipo: true, data: true } },
        },
      }),
      prisma.casseInterne.findMany({
        where: { aziendaId },
        include: { movimenti: { select: { tipo: true, importo: true } } },
      }),
      prisma.movimentiSoci.groupBy({
        by: ['tipo'],
        where: { aziendaId, liquidato: false },
        _sum: { importo: true },
      }),
    ])

    const saldoCassa = casse.reduce((acc, c) => {
      const movimentato = c.movimenti.reduce((a, m) => m.tipo === 'entrata' ? a + m.importo : a - m.importo, 0)
      return acc + c.saldoIniziale + movimentato
    }, 0)

    const totaleCreditiSoci = Number(posizioniSoci.find(p => p.tipo === 'credito')?._sum.importo ?? 0)
    const totaleDebitiSoci = Number(posizioniSoci.find(p => p.tipo === 'debito')?._sum.importo ?? 0)

    // Get client credits and fornitori debits
    const debitiClienti = await prisma.debitiAperti.aggregate({
      where: { aziendaId, stato: 'aperto', tipo: 'cliente' },
      _sum: { importo: true },
    })
    const debitiFornitori = await prisma.debitiAperti.aggregate({
      where: { aziendaId, stato: 'aperto', tipo: 'fornitore' },
      _sum: { importo: true },
    })

    return NextResponse.json({
      liquidazioni,
      saldoCassa,
      totaleCreditiSoci,
      totaleDebitiSoci,
      totaleCreditiClienti: Number(debitiClienti._sum.importo ?? 0),
      totaleDebitiFornitori: Number(debitiFornitori._sum.importo ?? 0),
    })
  })
}

export async function POST(request: Request) {
  return withValidazione(request, liquidazioneSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!

    const isCredito = parsed.tipoMovimento === 'credito'
    const importoNetto = isCredito ? parsed.importo : -parsed.importo

    // Get the first cassa (cassa generale)
    const cassaGenerale = await prisma.casseInterne.findFirst({
      where: { aziendaId },
      orderBy: { id: 'asc' },
    })
    if (!cassaGenerale) {
      return NextResponse.json({ error: 'Nessuna cassa configurata. Creare prima una cassa in Contabilità.' }, { status: 400 })
    }

    const liquidazione = await prisma.$transaction(async (tx) => {
      const liq = await tx.liquidazioniSoci.create({
        data: {
          data: parsed.data ? new Date(parsed.data) : new Date(),
          tipo: parsed.tipo,
          socioId: parsed.socioId ?? null,
          clienteId: parsed.clienteId ?? null,
          aziendaId,
          totaleCrediti: isCredito ? parsed.importo : 0,
          totaleDebiti: isCredito ? 0 : parsed.importo,
          importoNetto,
          note: parsed.note ?? null,
        },
        include: { socio: true, cliente: true },
      })
      return liq
    })

    return NextResponse.json(liquidazione, { status: 201 })
  })
}