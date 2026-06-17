import { NextResponse } from 'next/server'
import { getCurrentAziendaId } from './azienda-context'
import { requireRole } from './auth'
import { ZodSchema, ZodError } from 'zod'

export async function withAzienda(fn: (aziendaId: number) => Promise<NextResponse>) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    return await fn(aziendaId)
  } catch (error) {
    return erroreCatch(error)
  }
}

export async function withValidazione<T>(
  request: Request,
  schema: ZodSchema<T>,
  fn: (data: T, aziendaId: number) => Promise<NextResponse>,
) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Formato JSON non valido' }, { status: 400 })
    }

    const parsed = schema.parse(body)
    return await fn(parsed, aziendaId)
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: messages }, { status: 400 })
    }
    return erroreCatch(error)
  }
}

export async function withRuoloScrittura(aziendaId: number) {
  const check = await requireRole(['admin', 'editor'], aziendaId)
  if (!check.allowed) return { allowed: false, response: check.response! }
  return { allowed: true, response: null as NextResponse | null }
}

export function erroreCatch(error: unknown, messaggioDefault = 'Errore interno') {
  console.error(messaggioDefault, error)
  return NextResponse.json({ error: messaggioDefault }, { status: 500 })
}
