import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { liquidazioniSociSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })

    const [liquidazioni, casse, posizioniSoci] = await Promise.all([
      prisma.liquidazioniSoci.findMany({
        where: { aziendaId },
        orderBy: { data: 'desc' },
        include: {
          socio: { select: { id: true, nome: true, cognome: true } },
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

    const totaleCreditiSoci = posizioniSoci.find(p => p.tipo === 'credito')?._sum.importo ?? 0
    const totaleDebitiSoci = posizioniSoci.find(p => p.tipo === 'debito')?._sum.importo ?? 0

    return NextResponse.json({ liquidazioni, saldoCassa, totaleCreditiSoci, totaleDebitiSoci })
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero liquidazioni' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = liquidazioniSociSchema.parse(body)

    const isCredito = parsed.tipo === 'credito'

    const liquidazione = await prisma.liquidazioniSoci.create({
      data: {
        data: parsed.data ? new Date(parsed.data) : new Date(),
        socioId: parsed.socioId,
        aziendaId,
        totaleCrediti: isCredito ? parsed.importo : 0,
        totaleDebiti: isCredito ? 0 : parsed.importo,
        importoNetto: isCredito ? parsed.importo : -parsed.importo,
        note: parsed.note ?? null,
      },
      include: { socio: true },
    })

    return NextResponse.json(liquidazione, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione liquidazione' }, { status: 500 })
  }
}
