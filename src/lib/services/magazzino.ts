import { prisma } from '@/lib/db'

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
  const tuttiIds = Array.from(idsSet)

  if (tuttiIds.length === 0) return []

  const prodotti = await prisma.prodotti.findMany({
    where: { id: { in: tuttiIds }, aziendaId },
    select: { id: true, nome: true, varietaTipologia: true, unitaMisura: true },
  })

  return prodotti.map((p) => ({
    prodottoId: p.id,
    nome: p.nome,
    varieta: p.varietaTipologia,
    giacenza: Math.max(0, (caricoMap.get(p.id) ?? 0) - (scaricoMap.get(p.id) ?? 0)),
    unitaMisura: p.unitaMisura,
  }))
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

  return Math.max(0, Number((carichi._sum.quantita ?? 0) - (scarichi._sum.quantita ?? 0)))
}
