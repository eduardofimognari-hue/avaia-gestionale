import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { aziendaId } = body
    if (!aziendaId) {
      return NextResponse.json({ error: 'aziendaId richiesto' }, { status: 400 })
    }

    const utente = await getCurrentUser()
    if (utente && utente.aziendaId !== Number(aziendaId)) {
      return NextResponse.json({ error: 'Non autorizzato per questa azienda' }, { status: 403 })
    }

    const azienda = await prisma.azienda.findUnique({ where: { id: Number(aziendaId) } })
    if (!azienda || !azienda.attivo) {
      return NextResponse.json({ error: 'Azienda non trovata' }, { status: 404 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set('aziendaId', String(aziendaId), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
