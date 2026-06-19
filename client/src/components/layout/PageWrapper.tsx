import { motion } from 'framer-motion'
import Navbar from './Navbar'

// ── Page enter animation ──────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  enter:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

// ── PageWrapper ───────────────────────────────────────────────────────────
// App Shell v2: üfüqi top navbar (sol sidebar yoxdur). Mobil naviqasiya
// Navbar daxilindəki hamburger drawer ilə həll olunur (alt tab bar silindi).

interface PageWrapperProps {
  children: React.ReactNode
}

export default function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #0E1525 0%, #0B111E 100%)' }}
    >
      {/* Fixed top navbar — primary navigation */}
      <Navbar />

      {/* Main content — top navbar-ın altından başlayır, tam en */}
      <main
        className="pt-[72px] min-h-screen overflow-x-hidden"
        id="main-content"
      >
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="enter"
          className="min-h-[calc(100vh-72px)]"
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}
