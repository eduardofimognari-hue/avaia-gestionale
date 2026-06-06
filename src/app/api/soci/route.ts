import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { sociSchema } from '@/lib/validations'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const soci = await prisma.soci.findMany({
      where: { attivo: true, aziendaId },
      orderBy: { nome: 'asc' },
      include: {
        responsabilita: { include: { area: true } },
        ruoli: { include: { ruolo: true } },
      },
    })
    return NextResponse.json(soci)
  })
}

export async function POST(request: Request) {
  return withValidazione(request, sociSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
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
  })
}
