import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { luoghiSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const luoghi = await prisma.luoghi.findMany({
      where: { attivo: true, aziendaId },
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(luoghi)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero dei luoghi' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = luoghiSchema.parse(body)

    const luogo = await prisma.luoghi.create({
      data: {
        nome: parsed.nome, aziendaId,
        indirizzo: parsed.indirizzo || null,
        comune: parsed.comune || null,
        provincia: parsed.provincia || null,
        cap: parsed.cap || null,
        tipo: parsed.tipo || 'fisico',
        note: parsed.note || null,
      },
    })

    return NextResponse.json(luogo, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione del luogo' }, { status: 500 })
  }
}
