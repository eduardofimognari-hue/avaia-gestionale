import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="p-5 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
