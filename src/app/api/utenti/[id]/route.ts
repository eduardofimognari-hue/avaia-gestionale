import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const check = await requireRole(['admin'])()
  if (!check.allowed) return check.response!

  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { nome, email, ruolo, attivo, password } = body

    const data: Record<string, unknown> = {}
    if (nome !== undefined) data.nome = nome
    if (email !== undefined) data.email = email
    if (ruolo !== undefined) data.ruolo = ruolo
    if (attivo !== undefined) data.attivo = attivo
    if (password) data.password = await bcrypt.hash(password, 10)

    const utente = await prisma.utente.update({
      where: { id },
      data,
      select: { id: true, email: true, nome: true, ruolo: true, attivo: true, aziendaId: true },
    })

    return NextResponse.json(utente)
  } catch {
    return NextResponse.json({ error: 'Errore nell\'aggiornamento utente' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const check = await requireRole(['admin'])()
  if (!check.allowed) return check.response!

  try {
    const id = parseInt(params.id)

    const utente = await prisma.utente.findUnique({ where: { id } })
    if (!utente) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    await prisma.utente.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Errore nell\'eliminazione utente' }, { status: 500 })
  }
}