import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { sociSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const soci = await prisma.soci.findMany({
      where: { attivo: true, aziendaId },
      orderBy: { nome: 'asc' },
      include: {
        responsabilita: { include: { area: true } },
        ruoli: { include: { ruolo: true } },
      },
    })
    return NextResponse.json(soci)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero dei soci' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = sociSchema.parse(body)

    const socio = await prisma.soci.create({
      data: {
        nome: parsed.nome, cognome: parsed.cognome, aziendaId,
        codiceFiscale: parsed.codiceFiscale || null,
        telefono: parsed.telefono || null,
        email: parsed.email || null,
        indirizzo: parsed.indirizzo || null,
        dataIngresso: parsed.dataIngresso ? new Date(parsed.dataIngresso) : null,
        dataUscita: parsed.dataUscita ? new Date(parsed.dataUscita) : null,
        note: parsed.note ?? null,
        responsabilita: parsed.responsabilita?.length
          ? { create: parsed.responsabilita.map((areaId: number) => ({ areaId })) }
          : undefined,
        ruoli: parsed.ruoli?.length
          ? { create: parsed.ruoli.map((ruoloId: number) => ({ ruoloId })) }
          : undefined,
      },
      include: {
        responsabilita: { include: { area: true } },
        ruoli: { include: { ruolo: true } },
      },
    })

    return NextResponse.json(socio, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione del socio' }, { status: 500 })
  }
}
