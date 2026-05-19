import { NextResponse } from 'next/server'
import { getCurrentAziendaId } from './azienda-context'
import { requireRole, getCurrentUser } from './auth'
import { prisma } from './db'
import { ZodSchema, ZodError } from 'zod'

export async function withAzienda(fn: (aziendaId: number) => Promise<NextResponse>) {
  const aziendaId = await getCurrentAziendaId()
  if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
  return fn(aziendaId)
}

export async function withValidazione<T>(
  request: Request,
  schema: ZodSchema<T>,
  fn: (data: T, aziendaId: number) => Promise<NextResponse>,
) {
  const aziendaId = await getCurrentAziendaId()
  if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })

  try {
    const body = await request.json()
    const parsed = schema.parse(body)
    return fn(parsed, aziendaId)
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: messages }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella richiesta' }, { status: 500 })
  }
}

export async function withRuoloScrittura(aziendaId: number) {
  const check = await requireRole(['admin', 'editor'], aziendaId)
  if (!check.allowed) return { allowed: false, response: check.response! }
  return { allowed: true, response: null as NextResponse | null }
}

export async function getGiacenzeAggregate(aziendaId: number) {
  const carichi = await prisma.movimentiInput.groupBy({
    by: ['prodottoId'],
    where: { aziendaId, tipo: { in: ['carico', 'reso'] } },
    _sum: { quantita: true },
  })

  const scarichi = await prisma.movimentiInput.groupBy({
    by: ['prodottoId'],
    where: { aziendaId, tipo: { in: ['scarico', 'vendita'] } },
    _sum: { quantita: true },
  })

  const caricoMap = new Map(carichi.map((c) => [c.prodottoId, Number(c._sum.quantita ?? 0)]))
  const scaricoMap = new Map(scarichi.map((s) => [s.prodottoId, Number(s._sum.quantita ?? 0)]))

  const tuttiIds = Array.from(new Set([...Array.from(caricoMap.keys()), ...Array.from(scaricoMap.keys())]))

  if (tuttiIds.length === 0) return []

  const prodotti = await prisma.prodotti.findMany({
    where: { id: { in: tuttiIds }, aziendaId },
    select: { id: true, nome: true, varietaTipologia: true, tipo: true, unitaMisura: true },
  })

  return prodotti.map((p) => {
    const giacenza = (caricoMap.get(p.id) ?? 0) - (scaricoMap.get(p.id) ?? 0)
    return {
      prodottoId: p.id,
      nome: p.nome,
      varieta: p.varietaTipologia,
      giacenza: Math.max(0, giacenza),
      unitaMisura: p.unitaMisura,
    }
  })
}

export function erroreCatch(error: unknown, messaggioDefault = 'Errore interno') {
  console.error(messaggioDefault, error)
  return NextResponse.json({ error: messaggioDefault }, { status: 500 })
}
