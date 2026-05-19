import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { aziendaId } = body
    if (!aziendaId) {
      return NextResponse.json({ error: 'aziendaId richiesto' }, { status: 400 })
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
