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

    const [liquidazioni, casse] = await Promise.all([
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
    ])

    const saldoCassa = casse.reduce((acc, c) => {
      const movimentato = c.movimenti.reduce((a, m) => m.tipo === 'entrata' ? a + m.importo : a - m.importo, 0)
      return acc + c.saldoIniziale + movimentato
    }, 0)

    return NextResponse.json({ liquidazioni, saldoCassa })
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

    const startDate = parsed.periodoDa ? new Date(parsed.periodoDa) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const endDate = parsed.periodoA ? new Date(parsed.periodoA) : new Date()

    const movimenti = await prisma.movimentiSoci.findMany({
      where: { socioId: parsed.socioId, liquidato: false, data: { gte: startDate, lte: endDate }, aziendaId },
    })

    const totaleCrediti = movimenti.filter(m => m.tipo === 'credito').reduce((a, m) => a + m.importo, 0)
    const totaleDebiti = movimenti.filter(m => m.tipo === 'debito').reduce((a, m) => a + m.importo, 0)
    const importoNetto = totaleCrediti - totaleDebiti

    const liquidazione = await prisma.liquidazioniSoci.create({
      data: {
        data: parsed.data ? new Date(parsed.data) : new Date(), socioId: parsed.socioId, aziendaId,
        totaleCrediti, totaleDebiti, importoNetto,
        periodoDa: startDate, periodoA: endDate,
        note: parsed.note ?? null,
      },
      include: { socio: true },
    })

    await prisma.movimentiSoci.updateMany({
      where: { socioId: parsed.socioId, liquidato: false, data: { gte: startDate, lte: endDate }, aziendaId },
      data: { liquidato: true, liquidazioneId: liquidazione.id },
    })

    return NextResponse.json(liquidazione, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione liquidazione' }, { status: 500 })
  }
}
