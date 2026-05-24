import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { APP_ROUTES } from '../../../constants'

// ── Types ─────────────────────────────────────────────────────────────────

type StageStatus = 'completed' | 'active' | 'locked'

interface Stage {
  id:     string
  icon:   string
  label:  string
  path:   string
  status: StageStatus
}

// ── Stage definitions — in a real app this comes from API/gamification level

const STAGES: Stage[] = [
  { id: 'quiz',      icon: '🧠', label: 'Bilik Mağarası',   path: APP_ROUTES.DAILY,          status: 'completed' },
  { id: 'battle',    icon: '⚔️', label: 'Yarış Arenası',    path: '/competition',            status: 'active'    },
  { id: 'courses',   icon: '🎓', label: 'Kurs Kitabxanası', path: APP_ROUTES.COURSES,        status: 'locked'    },
  { id: 'clan',      icon: '🛡️', label: 'Klan Qalası',      path: '/clan/me',                status: 'locked'    },
  { id: 'portfolio', icon: '📊', label: 'Portfolio Sarayı', path: '/portfolio/me',           status: 'locked'    },
  { id: 'mystery',   icon: '🔮', label: 'Sirr Otağı',       path: APP_ROUTES.WEEKLY_MYSTERY, status: 'locked'    },
]

// ── Subcomponents ─────────────────────────────────────────────────────────

function ConnectorLine({ completed, color }: { completed: boolean; color: string }) {
  return (
    <div className="flex items-center shrink-0 w-14 -mx-1 mt-7">
      <div
        className="w-full h-0"
        style={{
          borderTop: `2px dashed ${completed ? color : 'rgba(255,255,255,0.12)'}`,
        }}
      />
    </div>
  )
}

function StageNode({
  stage,
  avatarColor,
  userInitial,
  isLast,
}: {
  stage:       Stage
  avatarColor: string
  userInitial: string
  isLast:      boolean
}) {
  const navigate  = useNavigate()
  const isActive    = stage.status === 'active'
  const isCompleted = stage.status === 'completed'
  const isLocked    = stage.status === 'locked'

  const borderColor = isActive    ? avatarColor
                    : isCompleted ? `${avatarColor}80`
                    : 'rgba(255,255,255,0.1)'

  const bgColor     = isLocked    ? 'rgba(255,255,255,0.04)'
                    : `${avatarColor}18`

  const boxShadow   = !isLocked   ? `0 0 ${isActive ? 24 : 12}px ${avatarColor}50` : 'none'

  return (
    <div className="flex items-center">
      <div className="flex flex-col items-center gap-2.5 shrink-0 w-24">
        <div className="relative flex flex-col items-center">
          {/* Avatar bounce on active stage */}
          {isActive && (
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-9 left-1/2 -translate-x-1/2 z-10"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center
                           text-white text-xs font-black shadow-lg"
                style={{ backgroundColor: avatarColor, boxShadow: `0 4px 12px ${avatarColor}80` }}
              >
                {userInitial}
              </div>
              {/* Arrow below avatar */}
              <div
                className="w-2 h-2 mx-auto -mt-0.5"
                style={{
                  width: 0, height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: `6px solid ${avatarColor}`,
                }}
              />
            </motion.div>
          )}

          {/* Stage circle */}
          <motion.button
            onClick={() => !isLocked && navigate(stage.path)}
            whileHover={!isLocked ? { scale: 1.1 } : {}}
            whileTap={!isLocked ? { scale: 0.95 } : {}}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl
                       transition-shadow duration-300 focus:outline-none border-2"
            style={{ backgroundColor: bgColor, borderColor, boxShadow }}
            aria-label={stage.label}
            disabled={isLocked}
          >
            {isLocked ? '🔒' : stage.icon}
          </motion.button>

          {/* Completed checkmark */}
          {isCompleted && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center
                         text-white text-[10px] font-black"
              style={{ backgroundColor: avatarColor }}
            >
              ✓
            </motion.div>
          )}
        </div>

        <span
          className="text-[11px] font-medium text-center leading-tight"
          style={{ color: isLocked ? '#374151' : isActive ? '#FFFFFF' : `${avatarColor}CC` }}
        >
          {stage.label}
        </span>
      </div>

      {!isLast && (
        <ConnectorLine
          completed={isCompleted}
          color={avatarColor}
        />
      )}
    </div>
  )
}

// ── GameMap ───────────────────────────────────────────────────────────────

interface GameMapProps {
  avatarColor: string
  userName:    string
}

export default function GameMap({ avatarColor, userName }: GameMapProps) {
  const scrollRef    = useRef<HTMLDivElement>(null)
  const userInitial  = (userName.charAt(0) || 'S').toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background:   'linear-gradient(135deg, #111827 0%, #0D1117 100%)',
        border:       '1px solid rgba(255,255,255,0.07)',
        minHeight:    160,
      }}
    >
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
             linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Header */}
      <div className="px-5 pt-4 pb-1 flex items-center justify-between">
        <span className="text-white text-sm font-bold">🗺️ Macəra Xəritəsi</span>
        <span className="text-[#9CA3AF] text-xs">Məntəqəyə klik et</span>
      </div>

      {/* Horizontal scroll */}
      <div
        ref={scrollRef}
        className="overflow-x-auto pb-5 pt-10 px-5 flex items-center"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
      >
        <div className="flex items-center" style={{ minWidth: 'max-content' }}>
          {STAGES.map((stage, idx) => (
            <StageNode
              key={stage.id}
              stage={stage}
              avatarColor={avatarColor}
              userInitial={userInitial}
              isLast={idx === STAGES.length - 1}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
