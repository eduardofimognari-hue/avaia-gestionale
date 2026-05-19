import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { cassaNuovaSchema, cassaMovimentoSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const casse = await prisma.casseInterne.findMany({
      where: { aziendaId },
      include: {
        movimenti: { select: { tipo: true, importo: true, luogoId: true } },
      },
    })
    return NextResponse.json(casse)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero delle casse' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()

    if (body.nome) {
      const parsed = cassaNuovaSchema.parse(body)
      const cassa = await prisma.casseInterne.create({
        data: {
          nome: parsed.nome, aziendaId,
          saldoIniziale: parsed.saldoIniziale ?? 0,
          note: parsed.note ?? null,
        },
        include: {
          movimenti: { select: { tipo: true, importo: true, luogoId: true } },
        },
      })
      return NextResponse.json(cassa, { status: 201 })
    }

    if (body.cassaId && body.tipo && body.importo !== undefined) {
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
        include: { cassa: true, luogo: true },
      })
      return NextResponse.json(movimento, { status: 201 })
    }

    return NextResponse.json({ error: 'Dati non validi. Inviare nome per creare cassa, oppure cassaId, tipo, importo per movimento' }, { status: 400 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione' }, { status: 500 })
  }
}
