import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'
import { useAuth } from '../../context/AuthContext'
import GameMap          from '../../features/dashboard/student/GameMap'
import DailyCard        from '../../features/dashboard/student/DailyCard'
import XPCard           from '../../features/dashboard/student/XPCard'
import CompetitionCard  from '../../features/dashboard/student/CompetitionCard'
import ClanCard         from '../../features/dashboard/student/ClanCard'
import SocialFeed       from '../../features/dashboard/student/SocialFeed'
import RightPanel       from '../../features/dashboard/student/RightPanel'

// ── Greeting ──────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 6)  return 'Gecə yarısı oyanmısan'
  if (h < 12) return 'Sabahın xeyir'
  if (h < 17) return 'Günortanız xeyir'
  if (h < 21) return 'Axşamınız xeyir'
  return 'Gecəniz xeyir'
}

// ── Animation variants ────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
}

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
}

function Section({ children }: { children: React.ReactNode }) {
  return <motion.div variants={sectionVariants}>{children}</motion.div>
}

// ── Student Dashboard ─────────────────────────────────────────────────────

export default function StudentDashboard() {
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)
  const authUser    = useSelector((s: RootState) => s.auth.user)
  const { user: ctxUser } = useAuth()
  const user = authUser ?? ctxUser

  // Spread avatar color as CSS variable so any child can consume it
  useEffect(() => {
    document.documentElement.style.setProperty('--avatar-color', avatarColor)
    return () => { document.documentElement.style.removeProperty('--avatar-color') }
  }, [avatarColor])

  const firstName = user?.name ?? 'Tələbə'

  return (
    <div className="px-4 lg:px-8 py-6 max-w-screen-xl mx-auto">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6"
      >

        {/* ── Greeting ── */}
        <Section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
            <div>
              <p className="text-[#9CA3AF] text-sm">{getGreeting()},</p>
              <h1 className="text-white font-black text-2xl lg:text-3xl leading-tight">
                {firstName}{' '}
                <motion.span
                  animate={{ rotate: [0, 14, -8, 14, 0] }}
                  transition={{ duration: 1.5, delay: 0.6, repeat: Infinity, repeatDelay: 5 }}
                  style={{ display: 'inline-block', originX: '70%', originY: '70%' }}
                >
                  👋
                </motion.span>
              </h1>
            </div>
            <p
              className="text-xs font-medium px-3 py-1.5 rounded-xl w-fit"
              style={{
                backgroundColor: `${avatarColor}15`,
                color:           avatarColor,
                border:          `1px solid ${avatarColor}30`,
              }}
            >
              {new Date().toLocaleDateString('az-AZ', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </Section>

        {/* ── Game Map ── */}
        <Section>
          <GameMap avatarColor={avatarColor} userName={firstName} />
        </Section>

        {/* ── Main 2-column layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

          {/* Left column */}
          <motion.div variants={containerVariants} className="flex flex-col gap-6">

            {/* Quick Cards 2×2 grid */}
            <Section>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DailyCard />
                <XPCard />
                <CompetitionCard />
                <ClanCard />
              </div>
            </Section>

            {/* Social feed */}
            <Section>
              <SocialFeed />
            </Section>
          </motion.div>

          {/* Right panel — mystery countdown + featured course + leaderboard */}
          <motion.div variants={sectionVariants} className="xl:sticky xl:top-20 xl:self-start">
            <RightPanel />
          </motion.div>
        </div>

      </motion.div>
    </div>
  )
}
