import { prisma } from '@/lib/db'
import { formatDate, formatNumber, type ColumnDef } from '../formatters'

export const RACCOLTA_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'data', label: 'Data' },
  { key: 'prodotto', label: 'Prodotto' },
  { key: 'quantita', label: 'Quantità' },
  { key: 'unitaMisura', label: 'Unità Misura' },
  { key: 'luogo', label: 'Luogo' },
  { key: 'terreno', label: 'Terreno' },
  { key: 'socio', label: 'Socio' },
  { key: 'note', label: 'Note' },
]

export async function getRaccoltaExport(
  aziendaId: number,
  from?: Date,
  to?: Date,
): Promise<Record<string, unknown>[]> {
  const raccolte = await prisma.raccolta.findMany({
    where: {
      aziendaId,
      data: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    },
    include: {
      prodotto: { select: { nome: true, varietaTipologia: true } },
      luogo: { select: { nome: true } },
      terreno: { select: { nome: true } },
      socio: { select: { nome: true, cognome: true } },
    },
    orderBy: { data: 'desc' },
  })

  return raccolte.map((r) => ({
    id: r.id,
    data: formatDate(r.data),
    prodotto: [r.prodotto.nome, r.prodotto.varietaTipologia].filter(Boolean).join(' - '),
    quantita: formatNumber(r.quantita, 3),
    unitaMisura: r.unitaMisura,
    luogo: r.luogo?.nome ?? '',
    terreno: r.terreno?.nome ?? '',
    socio: r.socio ? `${r.socio.nome} ${r.socio.cognome}` : '',
    note: r.note ?? '',
  }))
}
