import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './db'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const utente = await prisma.utente.findUnique({
          where: { email: credentials.email },
          include: { azienda: true },
        })
        if (!utente || !utente.attivo) return null
        const valid = await bcrypt.compare(credentials.password, utente.password)
        if (!valid) return null
        return { id: String(utente.id), email: utente.email, name: utente.nome, ruolo: utente.ruolo, aziendaId: utente.aziendaId }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.aziendaId = (user as any).aziendaId
        token.ruolo = (user as any).ruolo
      }
      return token
    },
    async session({ session, token }) {
      (session as any).aziendaId = token.aziendaId
      ;(session as any).ruolo = token.ruolo
      return session
    },
  },
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions) as any
  if (!session?.user?.email) return null
  const utente = await prisma.utente.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, nome: true, ruolo: true, attivo: true, aziendaId: true },
  })
  return utente
}

export function requireRole(ruoli: string[]) {
  return async function checkRole(resource?: string) {
    const utente = await getCurrentUser()
    if (!utente || !utente.attivo) {
      return { allowed: false, response: NextResponse.json({ error: 'Non autorizzato' }, { status: 401 }) }
    }
    if (!ruoli.includes(utente.ruolo)) {
      return { allowed: false, response: NextResponse.json({ error: 'Permessi insufficienti' }, { status: 403 }) }
    }
    return { allowed: true, response: null as NextResponse | null }
  }
}
