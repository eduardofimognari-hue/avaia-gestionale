import { prisma } from '@/lib/db'
import { formatDate, formatNumber, type ColumnDef } from '../formatters'

export const MAGAZZINO_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'data', label: 'Data' },
  { key: 'prodotto', label: 'Prodotto' },
  { key: 'tipo', label: 'Tipo Movimento' },
  { key: 'quantita', label: 'Quantità' },
  { key: 'unitaMisura', label: 'Unità Misura' },
  { key: 'luogo', label: 'Luogo' },
  { key: 'terreno', label: 'Terreno' },
  { key: 'note', label: 'Note' },
]

export async function getMagazzinoExport(
  aziendaId: number,
  from?: Date,
  to?: Date,
): Promise<Record<string, unknown>[]> {
  const movimenti = await prisma.movimentiInput.findMany({
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
    },
    orderBy: { data: 'desc' },
  })

  return movimenti.map((m) => ({
    id: m.id,
    data: formatDate(m.data),
    prodotto: [m.prodotto.nome, m.prodotto.varietaTipologia].filter(Boolean).join(' - '),
    tipo: m.tipo,
    quantita: formatNumber(m.quantita, 3),
    unitaMisura: m.unitaMisura,
    luogo: m.luogo?.nome ?? '',
    terreno: m.terreno?.nome ?? '',
    note: m.note ?? '',
  }))
}
