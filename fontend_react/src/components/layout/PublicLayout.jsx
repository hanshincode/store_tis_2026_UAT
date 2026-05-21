import { Outlet } from 'react-router-dom'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ChatWidget from '@/components/chat/ChatWidget'

export default function PublicLayout() {
  return (
    <>
      <Header />
      <main className="pt-[72px] min-h-screen">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
    </>
  )
}
