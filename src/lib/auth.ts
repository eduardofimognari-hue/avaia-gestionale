import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './db'
import bcrypt from 'bcryptjs'

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
        return { id: String(utente.id), email: utente.email, name: utente.nome, aziendaId: utente.aziendaId }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.aziendaId = (user as any).aziendaId
      }
      return token
    },
    async session({ session, token }) {
      (session as any).aziendaId = token.aziendaId
      return session
    },
  },
}
