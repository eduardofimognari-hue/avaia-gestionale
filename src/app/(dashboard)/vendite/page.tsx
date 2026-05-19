import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { formatDate, formatEuro, formatNumber } from '@/lib/utils'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function VenditePage() {
  const aziendaId = await getCurrentAziendaId()
  if (!aziendaId) redirect('/login')
  const vendite = await prisma.vendite.findMany({
    where: { aziendaId },
    include: {
      cliente: true,
      righe: { include: { prodotto: true } },
    },
    orderBy: { data: 'desc' },
    take: 50,
  })

  return (
    <div>
      <PageHeader title="Vendite" description="Registro vendite" action={<Link href="/vendite/nuova"><Button><Plus className="w-4 h-4 mr-2" />Nuova Vendita</Button></Link>} />
      <Card>
        <CardContent className="p-0">
          <Table>
            <Thead>
              <Tr><Th>Data</Th><Th>Cliente</Th><Th>Tipo</Th><Th>Prodotti</Th><Th>Importo</Th></Tr>
            </Thead>
            <Tbody>
              {vendite.map((v) => (
                <Tr key={v.id}>
                  <Td className="whitespace-nowrap">{formatDate(v.data)}</Td>
                  <Td className="font-medium">
                    {v.cliente ? `${v.cliente.nome} ${v.cliente.cognome || ''}` : <span className="text-gray-400">-</span>}
                  </Td>
                  <Td><Badge variant={v.tipoCliente === 'Privato' ? 'info' : 'default'}>{v.tipoCliente}</Badge></Td>
                  <Td>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {v.righe.map(r => (
                        <Badge key={r.id} variant="default" className="text-xs">
                          {r.prodotto.nome}{r.prodotto.varietaTipologia ? ` - ${r.prodotto.varietaTipologia}` : ''}
                          {' '}({formatNumber(r.quantita)})
                        </Badge>
                      ))}
                    </div>
                  </Td>
                  <Td className="font-medium whitespace-nowrap">{v.importoTotale != null ? formatEuro(v.importoTotale) : '-'}</Td>
                </Tr>
              ))}
              {vendite.length === 0 && <Tr><Td colSpan={5} className="text-center text-gray-500 py-8">Nessuna vendita trovata</Td></Tr>}
            </Tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
