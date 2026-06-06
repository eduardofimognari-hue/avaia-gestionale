import { NextResponse } from 'next/server'
import { getCurrentAziendaId } from './azienda-context'
import { requireRole } from './auth'
import { prisma } from './db'
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

export type GiacenzaAggregata = {
  prodottoId: number
  nome: string
  varieta: string | null
  giacenza: number
  unitaMisura: string
}

export async function getGiacenzeAggregate(aziendaId: number): Promise<GiacenzaAggregata[]> {
  const [carichi, scarichi] = await Promise.all([
    prisma.movimentiInput.groupBy({
      by: ['prodottoId'],
      where: { aziendaId, tipo: { in: ['carico', 'reso'] } },
      _sum: { quantita: true },
    }),
    prisma.movimentiInput.groupBy({
      by: ['prodottoId'],
      where: { aziendaId, tipo: { in: ['scarico', 'vendita'] } },
      _sum: { quantita: true },
    }),
  ])

  const caricoMap = new Map<number, number>(carichi.map((c) => [c.prodottoId, Number(c._sum.quantita ?? 0)]))
  const scaricoMap = new Map<number, number>(scarichi.map((s) => [s.prodottoId, Number(s._sum.quantita ?? 0)]))
  const idsSet = new Set<number>()
  caricoMap.forEach((_, k) => idsSet.add(k))
  scaricoMap.forEach((_, k) => idsSet.add(k))
  const tuttiIds: number[] = []
  idsSet.forEach((id) => tuttiIds.push(id))

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

export async function getGiacenzaSingola(aziendaId: number, prodottoId: number): Promise<number> {
  const [carichi, scarichi] = await Promise.all([
    prisma.movimentiInput.aggregate({
      where: { prodottoId, aziendaId, tipo: { in: ['carico', 'reso'] } },
      _sum: { quantita: true },
    }),
    prisma.movimentiInput.aggregate({
      where: { prodottoId, aziendaId, tipo: { in: ['scarico', 'vendita'] } },
      _sum: { quantita: true },
    }),
  ])

  const giacenza = (carichi._sum.quantita ?? 0) - (scarichi._sum.quantita ?? 0)
  return Math.max(0, Number(giacenza))
}

export function erroreCatch(error: unknown, messaggioDefault = 'Errore interno') {
  console.error(messaggioDefault, error)
  return NextResponse.json({ error: messaggioDefault }, { status: 500 })
}
