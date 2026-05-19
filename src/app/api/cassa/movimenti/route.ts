import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { cassaMovimentoSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const movimenti = await prisma.movimentiCassa.findMany({
      where: { aziendaId },
      include: {
        cassa: { select: { nome: true } },
        luogo: { select: { id: true, nome: true, tipo: true } },
      },
      orderBy: { data: 'desc' },
      take: 100,
    })
    return NextResponse.json(movimenti)
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero movimenti' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = cassaMovimentoSchema.parse(body)

    const movimento = await prisma.movimentiCassa.create({
      data: {
        data: parsed.data ? new Date(parsed.data) : new Date(),
        cassaId: parsed.cassaId, aziendaId,
        luogoId: parsed.luogoId ?? null,
        tipo: parsed.tipo,
        importo: parsed.importo,
        categoria: parsed.categoria ?? null,
        descrizione: parsed.descrizione ?? null,
        riferimento: parsed.riferimento ?? null,
      },
      include: {
        cassa: { select: { nome: true } },
        luogo: { select: { id: true, nome: true, tipo: true } },
      },
    })
    return NextResponse.json(movimento, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione movimento' }, { status: 500 })
  }
}
