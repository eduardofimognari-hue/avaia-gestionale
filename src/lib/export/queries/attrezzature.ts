import { prisma } from '@/lib/db'
import { type ColumnDef } from '../formatters'

export const ATTREZZATURE_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'nome', label: 'Nome' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'fornitore', label: 'Fornitore' },
  { key: 'costoUnitario', label: 'Costo Unitario (€)' },
  { key: 'unitaMisura', label: 'Unità Misura' },
  { key: 'quantita', label: 'Quantità' },
  { key: 'scortaMinima', label: 'Scorta Minima' },
  { key: 'attivo', label: 'Attivo' },
  { key: 'note', label: 'Note' },
]

export async function getAttrezzatureExport(aziendaId: number): Promise<Record<string, unknown>[]> {
  const attrezzature = await prisma.attrezzature.findMany({
    where: { aziendaId },
    include: {
      fornitore: { select: { nome: true, cognome: true, ragioneSociale: true } },
    },
    orderBy: { nome: 'asc' },
  })

  return attrezzature.map((a) => ({
    id: a.id,
    nome: a.nome,
    categoria: a.categoria ?? '',
    fornitore: a.fornitore
      ? (a.fornitore.ragioneSociale ?? `${a.fornitore.nome} ${a.fornitore.cognome ?? ''}`.trim())
      : '',
    costoUnitario: a.costoUnitario ?? '',
    unitaMisura: a.unitaMisura,
    quantita: a.quantita,
    scortaMinima: a.scortaMinima ?? '',
    attivo: a.attivo ? 'Sì' : 'No',
    note: a.note ?? '',
  }))
}
