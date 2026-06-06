import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { clientiSchema } from '@/lib/validations'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const clienti = await prisma.clienti.findMany({ where: { attivo: true, aziendaId }, orderBy: { nome: 'asc' } })
    return NextResponse.json(clienti)
  })
}

export async function POST(request: Request) {
  return withValidazione(request, clientiSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const cliente = await prisma.clienti.create({
      data: {
        nome: parsed.nome, aziendaId,
        cognome: parsed.cognome || null,
        ragioneSociale: parsed.ragioneSociale || null,
        tipo: parsed.tipo || 'Privato',
        codiceFiscale: parsed.codiceFiscale || null,
        partitaIva: parsed.partitaIva || null,
        telefono: parsed.telefono || null,
        email: parsed.email || null,
        indirizzo: parsed.indirizzo || null,
        comune: parsed.comune || null,
        provincia: parsed.provincia || null,
        cap: parsed.cap || null,
        note: parsed.note || null,
      },
    })
    return NextResponse.json(cliente, { status: 201 })
  })
}
