import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { sociPatchSchema } from '@/lib/validations'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  return withValidazione(request, sociPatchSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const existing = await prisma.soci.findFirst({ where: { id, aziendaId } })
    if (!existing) return NextResponse.json({ error: 'Socio non trovato' }, { status: 404 })

    const { responsabilita, ruoli, dataIngresso, dataUscita, ...campiAnagrafici } = parsed

    await prisma.$transaction(async (tx) => {
      await tx.soci.update({
        where: { id },
        data: {
          ...campiAnagrafici,
          dataIngresso: dataIngresso !== undefined ? (dataIngresso ? new Date(dataIngresso) : null) : undefined,
          dataUscita: dataUscita !== undefined ? (dataUscita ? new Date(dataUscita) : null) : undefined,
        },
      })

      if (responsabilita !== undefined) {
        await tx.sociAreeResponsabilita.deleteMany({ where: { socioId: id } })
        if (responsabilita.length > 0) {
          await tx.sociAreeResponsabilita.createMany({
            data: responsabilita.map((aId) => ({ socioId: id, areaId: aId })),
          })
        }
      }

      if (ruoli !== undefined) {
        await tx.sociRuoli.deleteMany({ where: { socioId: id } })
        if (ruoli.length > 0) {
          await tx.sociRuoli.createMany({
            data: ruoli.map((rId) => ({ socioId: id, ruoloId: rId })),
          })
        }
      }
    })

    const updated = await prisma.soci.findUnique({
      where: { id },
      include: {
        responsabilita: { include: { area: true } },
        ruoli: { include: { ruolo: true } },
      },
    })
    return NextResponse.json(updated)
  })
}
