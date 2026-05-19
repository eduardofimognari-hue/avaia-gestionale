import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions) as any
  const ruolo = (session as any)?.ruolo ?? null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Sidebar ruolo={ruolo} />
      <main className="lg:pl-64">
        <div className="p-5 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}