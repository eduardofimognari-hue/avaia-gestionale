import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

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
    const body = await request.json()
    const { nome, cognome, codiceFiscale, telefono, email, indirizzo, dataIngresso, dataUscita, note, responsabilita, ruoli: ruoloIds } = body

    if (!nome || !cognome) {
      return NextResponse.json({ error: 'I campi nome e cognome sono obbligatori' }, { status: 400 })
    }

    const socio = await prisma.soci.create({
      data: {
        nome, cognome, aziendaId,
        codiceFiscale: codiceFiscale || null,
        telefono: telefono || null,
        email: email || null,
        indirizzo: indirizzo || null,
        dataIngresso: dataIngresso ? new Date(dataIngresso) : null,
        dataUscita: dataUscita ? new Date(dataUscita) : null,
        note: note ?? null,
        responsabilita: responsabilita?.length
          ? { create: responsabilita.map((areaId: number) => ({ areaId })) }
          : undefined,
        ruoli: ruoloIds?.length
          ? { create: ruoloIds.map((ruoloId: number) => ({ ruoloId })) }
          : undefined,
      },
      include: {
        responsabilita: { include: { area: true } },
        ruoli: { include: { ruolo: true } },
      },
    })

    return NextResponse.json(socio, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Errore nella creazione del socio' }, { status: 500 })
  }
}
