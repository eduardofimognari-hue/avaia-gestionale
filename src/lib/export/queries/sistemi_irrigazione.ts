import { prisma } from '@/lib/db'
import { type ColumnDef } from '../formatters'

export const SISTEMI_IRRIGAZIONE_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'nome', label: 'Nome Sistema' },
]

export async function getSistemiIrrigazioneExport(aziendaId: number): Promise<Record<string, unknown>[]> {
  const sistemi = await prisma.sistemiIrrigazione.findMany({
    where: { aziendaId },
    orderBy: { nome: 'asc' },
  })

  return sistemi.map((s) => ({
    id: s.id,
    nome: s.nome,
  }))
}
