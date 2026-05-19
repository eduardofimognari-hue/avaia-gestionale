import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  const check = await requireRole(['admin'])()
  if (!check.allowed) return check.response!

  try {
    const utenti = await prisma.utente.findMany({
      select: { id: true, email: true, nome: true, ruolo: true, attivo: true, aziendaId: true, creatoIl: true },
      orderBy: { email: 'asc' },
    })
    return NextResponse.json(utenti)
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero utenti' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const check = await requireRole(['admin'])()
  if (!check.allowed) return check.response!

  try {
    const body = await request.json()
    const { email, nome, password, ruolo } = body

    if (!email || !nome || !password) {
      return NextResponse.json({ error: 'Email, nome e password obbligatori' }, { status: 400 })
    }

    const exists = await prisma.utente.findUnique({ where: { email } })
    if (exists) {
      return NextResponse.json({ error: 'Email già registrata' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 10)
    const firstAzienda = await prisma.azienda.findFirst({ where: { attivo: true } })
    if (!firstAzienda) {
      return NextResponse.json({ error: 'Nessuna azienda disponibile' }, { status: 400 })
    }

    const utente = await prisma.utente.create({
      data: { email, nome, password: hashed, ruolo: ruolo || 'editor', aziendaId: firstAzienda.id },
      select: { id: true, email: true, nome: true, ruolo: true, attivo: true, aziendaId: true },
    })

    return NextResponse.json(utente, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Errore nella creazione utente' }, { status: 500 })
  }
}