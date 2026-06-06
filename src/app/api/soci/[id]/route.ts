import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withRuoloScrittura } from '@/lib/api-utils'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const body = await request.json()
    const { responsabilita, ruoli, dataIngresso, ...data } = body

    await prisma.$transaction(async (tx) => {
      await tx.soci.update({
        where: { id },
        data: {
          ...data,
          dataIngresso: dataIngresso !== undefined ? (dataIngresso ? new Date(dataIngresso) : null) : undefined,
        },
      })

      if (responsabilita !== undefined) {
        await tx.sociAreeResponsabilita.deleteMany({ where: { socioId: id } })
        if (responsabilita.length > 0) {
          await tx.sociAreeResponsabilita.createMany({
            data: responsabilita.map((aId: number) => ({ socioId: id, areaId: aId })),
          })
        }
      }

      if (ruoli !== undefined) {
        await tx.sociRuoli.deleteMany({ where: { socioId: id } })
        if (ruoli.length > 0) {
          await tx.sociRuoli.createMany({
            data: ruoli.map((rId: number) => ({ socioId: id, ruoloId: rId })),
          })
        }
      }
    })

    const updated = await prisma.soci.findUnique({
      where: { id },
      include: { responsabilita: { include: { area: true } }, ruoli: { include: { ruolo: true } } },
    })
    return NextResponse.json(updated)
  })
}