import { prisma } from '@/lib/db'
import { type ColumnDef } from '../formatters'

export const AREE_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'nome', label: 'Nome' },
  { key: 'descrizione', label: 'Descrizione' },
  { key: 'attivo', label: 'Attivo' },
]

export async function getAreeExport(aziendaId: number): Promise<Record<string, unknown>[]> {
  const aree = await prisma.aree.findMany({
    where: { aziendaId },
    orderBy: { nome: 'asc' },
  })

  return aree.map((a) => ({
    id: a.id,
    nome: a.nome,
    descrizione: a.descrizione ?? '',
    attivo: a.attivo ? 'Sì' : 'No',
  }))
}
