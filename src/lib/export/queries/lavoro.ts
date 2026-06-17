import { prisma } from '@/lib/db'
import { formatDate, formatNumber, type ColumnDef } from '../formatters'

export const LAVORO_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'data', label: 'Data' },
  { key: 'socio', label: 'Socio' },
  { key: 'area', label: 'Area' },
  { key: 'luogo', label: 'Luogo' },
  { key: 'ore', label: 'Ore' },
  { key: 'costoOrario', label: 'Costo Orario (€)' },
  { key: 'importo', label: 'Importo (€)' },
  { key: 'liquidato', label: 'Liquidato' },
  { key: 'descrizione', label: 'Descrizione' },
]

export async function getLavoroExport(
  aziendaId: number,
  from?: Date,
  to?: Date,
): Promise<Record<string, unknown>[]> {
  const lavori = await prisma.lavoroSoci.findMany({
    where: {
      aziendaId,
      data: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    },
    include: {
      socio: { select: { nome: true, cognome: true } },
      area: { select: { nome: true } },
      luogo: { select: { nome: true } },
    },
    orderBy: { data: 'desc' },
  })

  return lavori.map((l) => ({
    id: l.id,
    data: formatDate(l.data),
    socio: `${l.socio.nome} ${l.socio.cognome}`,
    area: l.area?.nome ?? '',
    luogo: l.luogo?.nome ?? '',
    ore: formatNumber(l.ore, 2),
    costoOrario: formatNumber(l.costoOrario),
    importo: formatNumber(l.ore * l.costoOrario),
    liquidato: l.liquidato ? 'Sì' : 'No',
    descrizione: l.descrizione ?? '',
  }))
}
