import { prisma } from '@/lib/db'
import { type ColumnDef } from '../formatters'

export const PORTA_INNESTI_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'nome', label: 'Nome Porta Innesto' },
]

export async function getPortaInnestiExport(aziendaId: number): Promise<Record<string, unknown>[]> {
  const portaInnesti = await prisma.portaInnesti.findMany({
    where: { aziendaId },
    orderBy: { nome: 'asc' },
  })

  return portaInnesti.map((p) => ({
    id: p.id,
    nome: p.nome,
  }))
}
