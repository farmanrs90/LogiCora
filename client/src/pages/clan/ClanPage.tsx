import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import toast from 'react-hot-toast'

import api from '../../lib/api'
import { API_ROUTES, APP_ROUTES } from '../../constants'
import type { RootState } from '../../app/store'
import Spinner from '../../components/Spinner'

// ── Types ──────────────────────────────────────────────────────────────────

interface ClanMemberFull {
  studentId:   string
  userId:      string
  name:        string
  surname:     string
  avatarColor: string
  level:       number
  weeklyXP:    number
  totalXP:     number
  streak:      number
  role:        'leader' | 'member'
  joinedAt:    string
}

interface BattleHistoryItem {
  _id:           string
  opponentSlug:  string
  opponentName:  string
  opponentColor: string
  opponentEmoji: string
  ourScore:      number
  theirScore:    number
  result:        'win' | 'loss' | 'draw' | 'ongoing'
  subject:       string
  format:        string
  endedAt:       string | null
  startedAt:     string
}

interface ClanStats {
  weeklyXPHistory: { week: string; xp: number }[]
  memberXPShare:   { name: string; xp: number }[]
  strongestSubject: string
  strongestPct:    number
  mostActiveUser:  { name: string; avatarColor: string }
  bestBattleScore: number
}

type CreateClanPayload = {
  name: string
  schoolName: string
}

interface ClanData {
  _id:       string
  name:      string
  slug:      string
  schoolName: string
  city:      string
  emblem:    string | null
  color:     string
  totalXP:   number
  weeklyXP:  number
  wins:      number
  losses:    number
  rank:      number
  totalBattles: number
  description: string
  foundedAt: string
}

interface ClanSearchResult {
  _id:     string
  name:    string
  slug:    string
  schoolName: string
  city:    string
  color:   string
  totalXP: number
  rank:    number
  memberCount: number
}

const PIE_COLORS = ['#9333EA', '#3B82F6', '#06B6D4', '#F97316', '#6B7280']

function getClanCreateErrorMessage(error: unknown): string {
  const fallback = 'Klan yaradıla bilmədi.'
  const err = error as {
    message?: string
    response?: { data?: { message?: string; errors?: string[] } }
  }

  return err.response?.data?.errors?.[0] ?? err.response?.data?.message ?? err.message ?? fallback
}

// ── Animated particles (Framer Motion only) ────────────────────────────────

function ClanParticles({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width:  4 + (i % 4) * 2,
            height: 4 + (i % 4) * 2,
            background: i % 3 === 0 ? color : i % 3 === 1 ? '#FFD700' : 'rgba(255,255,255,0.3)',
            left: `${5 + (i * 17) % 90}%`,
            top:  `${10 + (i * 23) % 80}%`,
          }}
          animate={{
            y:       [0, -12 - i * 2, 0],
            opacity: [0.2, 0.6, 0.2],
            scale:   [1, 1.3, 1],
          }}
          transition={{
            duration:   2.5 + (i % 5) * 0.6,
            repeat:     Infinity,
            delay:      (i * 0.22) % 3,
            ease:       'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ── Emblem ─────────────────────────────────────────────────────────────────

function ClanEmblemDisplay({ color, emoji, size = 96 }: { color: string; emoji: string; size?: number }) {
  return (
    <motion.div
      animate={{ rotate: [0, 3, -3, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' as const }}
      className="relative flex items-center justify-center rounded-3xl flex-shrink-0"
      style={{
        width:      size,
        height:     size,
        background: `linear-gradient(135deg, ${color}35, ${color}18)`,
        border:     `3px solid ${color}60`,
        boxShadow:  `0 0 40px ${color}50, inset 0 0 20px ${color}12`,
        fontSize:   size * 0.42,
      }}
    >
      {emoji}
      <div
        className="absolute inset-0 rounded-3xl opacity-25 pointer-events-none"
        style={{ background: `radial-gradient(circle at 35% 35%, ${color}, transparent 60%)` }}
      />
    </motion.div>
  )
}

// ── Member card ────────────────────────────────────────────────────────────

function MemberCard({ m, rank }: {
  m:           ClanMemberFull
  rank:        number
}) {
  const [hovered, setHovered] = useState(false)
  const rankMedals = ['🥇', '🥈', '🥉']

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative rounded-2xl p-4 transition-all overflow-hidden"
      style={{
        background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
        border:     `1px solid ${hovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {/* Rank badge */}
      <div className="absolute top-3 right-3 text-lg">
        {rank <= 3 ? rankMedals[rank - 1] : <span className="text-[#9CA3AF] text-xs font-black">#{rank}</span>}
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-lg"
            style={{ backgroundColor: m.avatarColor, boxShadow: `0 0 16px ${m.avatarColor}50` }}
          >
            {m.name?.charAt(0) ?? '?'}
          </div>
          {m.role === 'leader' && (
            <motion.span
              className="absolute -top-2 -right-1 text-sm"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              👑
            </motion.span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold text-sm">{m.name} {m.surname}</span>
            {m.role === 'leader' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold"
                style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)' }}>
                Lider
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[#9CA3AF] text-xs">Lv.{m.level}</span>
            <span className="text-orange-400 text-xs">🔥 {m.streak}</span>
          </div>
        </div>
      </div>

      {/* XP bar */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-[#9CA3AF] text-[11px]">Bu həftə</span>
          <span className="text-white text-[11px] font-bold">{m.weeklyXP} XP</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((m.weeklyXP / 700) * 100, 100)}%` }}
            transition={{ duration: 0.8, delay: rank * 0.04 }}
            className="h-full rounded-full"
            style={{ backgroundColor: m.avatarColor }}
          />
        </div>
      </div>

      {/* Hover actions */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex gap-2 mt-3"
          >
            <button
              onClick={() => toast('Bu tələbənin profili paylaşım üçün aktiv deyil.', { id: 'profile-private', icon: 'ℹ️' })}
              className="flex-1 py-1.5 rounded-xl text-center text-xs font-bold text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              Profil gör
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── XP count-up ────────────────────────────────────────────────────────────

function XPNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const mv  = useMotionValue(0)

  useState(() => {
    const c = animate(mv, value, {
      duration: 1.4,
      ease: 'easeOut' as const,
      onUpdate: v => { if (ref.current) ref.current.textContent = Math.round(v).toLocaleString() },
    })
    return c.stop
  })

  return <span ref={ref}>0</span>
}

// ── Create Clan Modal ──────────────────────────────────────────────────────

const CLAN_EMOJIS = ['⚡', '🔥', '🦁', '🦅', '🐺', '🌊', '💎', '🚀', '🌙', '⚔️', '🛡️', '👑']

function CreateClanModal({ onClose, onSubmit }: {
  onClose:  () => void
  onSubmit: (data: CreateClanPayload) => void
}) {
  const [name,       setName]       = useState('')
  const [emoji,      setEmoji]      = useState('⚡')
  const [schoolName, setSchoolName] = useState('')
  const [city,       setCity]       = useState('')
  const cities = ['Bakı', 'Gəncə', 'Sumqayıt', 'Mingəçevir', 'Lənkəran', 'Şirvan', 'Naxçıvan']

  const valid = name.trim().length >= 2 && schoolName.trim().length >= 2

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-sm rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-white font-black text-xl mb-5">🛡️ Klan Yarat</h2>

        {/* Emoji picker */}
        <p className="text-[#9CA3AF] text-sm mb-2">Emblem seç</p>
        <div className="grid grid-cols-6 gap-2 mb-4">
          {CLAN_EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className="h-10 rounded-xl text-xl flex items-center justify-center transition-all"
              style={{
                background: emoji === e ? 'rgba(147,51,234,0.25)' : 'rgba(255,255,255,0.05)',
                border:     `1px solid ${emoji === e ? 'rgba(147,51,234,0.6)' : 'rgba(255,255,255,0.08)'}`,
                transform:  emoji === e ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Fields */}
        {[
          { label: 'Klan adı', value: name,       onChange: setName,       placeholder: 'Şimşəklər...' },
          { label: 'Məktəb',   value: schoolName, onChange: setSchoolName, placeholder: 'Bakı Məktəbi #47...' },
        ].map(f => (
          <div key={f.label} className="mb-3">
            <label className="text-[#9CA3AF] text-xs mb-1 block">{f.label}</label>
            <input
              value={f.value}
              onChange={e => f.onChange(e.target.value)}
              placeholder={f.placeholder}
              className="w-full px-4 py-3 rounded-2xl text-white text-sm outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border:     '1px solid rgba(255,255,255,0.1)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(147,51,234,0.5)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
          </div>
        ))}

        <div className="mb-5">
          <label className="text-[#9CA3AF] text-xs mb-1 block">Şəhər</label>
          <div className="grid grid-cols-3 gap-2">
            {cities.map(c => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className="py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: city === c ? 'rgba(147,51,234,0.2)' : 'rgba(255,255,255,0.04)',
                  border:     `1px solid ${city === c ? 'rgba(147,51,234,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  color:      city === c ? '#C084FC' : '#9CA3AF',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-[#9CA3AF] border border-white/10"
          >
            Ləğv et
          </button>
          <motion.button
            onClick={() => valid && onSubmit({ name: name.trim(), schoolName: schoolName.trim() })}
            disabled={!valid}
            whileHover={valid ? { scale: 1.02 } : {}}
            whileTap={valid ? { scale: 0.97 } : {}}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)' }}
          >
            Yarat 🛡️
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ onCreate, onSearch }: {
  onCreate: () => void
  onSearch: () => void
}) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' as const }}
        className="text-8xl mb-6"
      >
        🛡️
      </motion.div>
      <h2 className="text-white font-black text-2xl mb-2">Klanın yoxdur!</h2>
      <p className="text-[#9CA3AF] text-sm mb-2 max-w-xs">
        Hələ bir klana üzv deyilsən.
      </p>
      <p className="text-red-400 text-sm font-bold mb-8">
        ⚠️ Klan olmadan yarışlar buraxılır!
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <motion.button
          onClick={onCreate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-black text-white text-base"
          style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)', boxShadow: '0 4px 20px rgba(147,51,234,0.4)' }}
        >
          🛡️ Klan Yarat
        </motion.button>
        <motion.button
          onClick={onSearch}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-bold text-white text-base"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          🔍 Klanları kəşf et
        </motion.button>
      </div>
    </div>
  )
}

// ── Load error state ───────────────────────────────────────────────────────

function ClanLoadError({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center p-6 text-center">
      <div className="text-7xl mb-5">⚠️</div>
      <h2 className="text-white font-black text-2xl mb-2">Bu klan mövcud deyil və ya silinib.</h2>
      <p className="text-[#9CA3AF] text-sm mb-8 max-w-xs">Klan silinmiş ola bilər və ya hazırda yüklənə bilmir.</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <motion.button
          onClick={onRetry}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-black text-white text-base"
          style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)', boxShadow: '0 4px 20px rgba(147,51,234,0.4)' }}
        >
          🔄 Yenidən yoxla
        </motion.button>
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-bold text-white text-base"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          🏆 Klanlara bax
        </motion.button>
      </div>
    </div>
  )
}

// ── Tabs ───────────────────────────────────────────────────────────────────

type TabKey = 'members' | 'battles' | 'stats' | 'challenge'

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'members',   label: 'Üzvlər',           emoji: '👥' },
  { key: 'battles',   label: 'Yarış nəticələri', emoji: '⚔️' },
  { key: 'stats',     label: 'Statistika',       emoji: '📊' },
  { key: 'challenge', label: 'Rəqib seç',        emoji: '🥊' },
]

// ── Main ───────────────────────────────────────────────────────────────────

export default function ClanPage() {
  const { slug }    = useParams<{ slug: string }>()
  const navigate    = useNavigate()
  const user        = useSelector((s: RootState) => s.auth.user)
  const queryClient = useQueryClient()

  const [tab,          setTab]          = useState<TabKey>('members')
  const [showCreate,   setShowCreate]   = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [activeBattle, setActiveBattle] = useState<string | null>(null)

  // ── Queries ──────────────────────────────────────────────────────────────

  const isMeRoute = slug === 'me'

  const { data: clan, isLoading: clanLoading, isError: clanError, refetch: refetchClan } = useQuery<ClanData | null>({
    queryKey: ['clan', slug],
    queryFn:  () => api.get<{ data: ClanData | null }>(API_ROUTES.CLANS.BY_SLUG(slug!))
                      .then(r => r.data.data),
    enabled:  !!slug,
    staleTime: 1000 * 60 * 2,
  })

  // İstifadəçinin öz klanı (varsa). Başqa klana baxarkən "artıq klandasan" vəziyyətini
  // honest göstərmək üçün lazımdır — yoxsa join CTA yanlış primary kimi görünür.
  const { data: myClan, isLoading: myClanLoading } = useQuery<{ _id?: string; slug?: string } | null>({
    queryKey: ['clans', 'me'],
    queryFn:  () => api.get<{ data: { _id?: string; slug?: string } | null }>(API_ROUTES.CLANS.BY_SLUG('me'))
                      .then(r => r.data.data),
    staleTime: 1000 * 60 * 2,
  })

  // /clan/me → backend /clans/me real klanı qaytarır; varsa real slug-a yönləndir.
  useEffect(() => {
    if (isMeRoute && clan && clan.slug && clan.slug !== 'me') {
      navigate(APP_ROUTES.CLAN(clan.slug), { replace: true })
    }
  }, [isMeRoute, clan, navigate])

  const { data: members, isLoading: membersLoading, refetch: refetchMembers } = useQuery<ClanMemberFull[]>({
    queryKey: ['clan', slug, 'members'],
    queryFn:  () => api.get<{ data: ClanMemberFull[] }>(API_ROUTES.CLANS.MEMBERS(slug!))
                      .then(r => r.data.data),
    enabled:  !!slug && !isMeRoute && tab === 'members',
    retry:    false,
    staleTime: 1000 * 60 * 2,
  })

  const { data: battles, isLoading: battlesLoading, refetch: refetchBattles } = useQuery<BattleHistoryItem[]>({
    queryKey: ['clan', slug, 'battles'],
    queryFn:  () => api.get<{ data: BattleHistoryItem[] }>(API_ROUTES.CLANS.BATTLES(slug!))
                      .then(r => r.data.data),
    enabled:  !!slug && !isMeRoute && tab === 'battles',
    retry:    false,
    staleTime: 1000 * 60,
  })

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<ClanStats>({
    queryKey: ['clan', slug, 'stats'],
    queryFn:  () => api.get<{ data: ClanStats }>(API_ROUTES.CLANS.STATS(slug!))
                      .then(r => r.data.data),
    enabled:  !!slug && !isMeRoute && tab === 'stats',
    retry:    false,
    staleTime: 1000 * 60 * 5,
  })

  // Klan axtarışı — real leaderboard siyahısını çəkir, query ilə client-side filter edir (mock yox).
  const { data: searchResults, isFetching: searchLoading, isError: searchError, refetch: refetchSearch } = useQuery<ClanSearchResult[]>({
    queryKey: ['clan-search', searchQuery],
    queryFn:  () => api.get<{ data: Array<{ _id: string; name: string; slug: string; schoolName?: string; totalXP?: number; members?: unknown[] }> }>(API_ROUTES.CLANS.LEADERBOARD)
                      .then(r => {
                        const q = searchQuery.trim().toLowerCase()
                        return (r.data.data ?? [])
                          .map((cl, i): ClanSearchResult => ({
                            _id:         cl._id,
                            name:        cl.name,
                            slug:        cl.slug,
                            schoolName:  cl.schoolName ?? '',
                            city:        '',
                            color:       PIE_COLORS[i % PIE_COLORS.length],
                            totalXP:     cl.totalXP ?? 0,
                            rank:        i + 1,
                            memberCount: Array.isArray(cl.members) ? cl.members.length : 0,
                          }))
                          .filter(cl => cl.name.toLowerCase().includes(q) && cl._id !== clan?._id)
                      }),
    enabled:  tab === 'challenge' && searchQuery.trim().length >= 2,
    staleTime: 1000 * 30,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const joinMutation = useMutation({
    mutationFn: (id: string) => api.post(API_ROUTES.CLANS.JOIN(id)),
    onSuccess: () => { toast.success('Klana uğurla qoşuldun! 🎉'); queryClient.invalidateQueries({ queryKey: ['clan', slug] }); queryClient.invalidateQueries({ queryKey: ['clans', 'me'] }) },
    // Backend xətasını honest göstər (məs. "Artıq bir klana üzvsünüz.") — success kimi göstərmirik.
    onError:   (err: unknown) => toast.error((err as { message?: string })?.message || 'Klana qoşulmaq alınmadı.'),
  })

  const leaveMutation = useMutation({
    // Backend müqaviləsi: DELETE /clans/leave (əvvəl səhvən POST idi → 404/xəta).
    mutationFn: () => api.delete(API_ROUTES.CLANS.LEAVE),
    onSuccess:  () => {
      toast.success('Klandan ayrıldın.')
      queryClient.invalidateQueries({ queryKey: ['clans', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['clan', slug] })
      navigate(APP_ROUTES.CLAN('me'))
    },
    // Backend xətasını honest göstər (məs. lider çıxa bilməz) — success kimi göstərmirik.
    onError:    (err: unknown) => toast.error((err as { message?: string })?.message || 'Klandan ayrılmaq alınmadı.'),
  })

  // Lider "Ayrıl" → klanı sil (backend: DELETE /clans/:id, yalnız lider). İkiqat təsdiq frontend-də.
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/clans/${clan?._id}`),
    onSuccess:  () => {
      toast.success('Klan silindi.')
      queryClient.invalidateQueries({ queryKey: ['clans', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['clan', slug] })
      queryClient.invalidateQueries({ queryKey: ['clan-leaderboard'] })
      navigate(APP_ROUTES.CLAN('me'), { replace: true })
    },
    onError:    (err: unknown) => toast.error((err as { message?: string })?.message || 'Klan silinmədi.'),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateClanPayload) =>
      api.post<{ data: ClanData | null }>(API_ROUTES.CLANS.CREATE, data).then(r => r.data.data ?? null),
    onSuccess: (newClan: ClanData | null) => {
      toast.success('Klan yaradıldı! 🛡️')
      setShowCreate(false)
      navigate(newClan?.slug ? APP_ROUTES.CLAN(newClan.slug) : APP_ROUTES.CLAN('me'))
    },
    onError: (err: unknown) => toast.error(getClanCreateErrorMessage(err)),
  })

  const challengeMutation = useMutation({
    mutationFn: ({ id, subject }: { id: string; subject: string }) =>
      api.post<{ data: { battleId: string } }>(API_ROUTES.CLANS.CHALLENGE(id), { subject }).then(r => r.data.data),
    onSuccess: (res: { battleId: string }) => {
      toast.success('Mübarizə dəvəti göndərildi! ⚔️')
      if (clan) navigate(APP_ROUTES.CLAN_BATTLE(clan.slug, res.battleId))
    },
    onError: () => toast.error('Dəvət göndərilə bilmədi.'),
  })

  // ── No slug = user has no clan ────────────────────────────────────────────

  if (!slug && !clanLoading) {
    return (
      <>
        <EmptyState onCreate={() => setShowCreate(true)} onSearch={() => navigate(APP_ROUTES.CLAN_LEADERBOARD)} />
        <AnimatePresence>
          {showCreate && (
            <CreateClanModal
              onClose={() => setShowCreate(false)}
              onSubmit={data => createMutation.mutate(data)}
            />
          )}
        </AnimatePresence>
      </>
    )
  }

  if (clanLoading) {
    return <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center"><Spinner size="lg" /></div>
  }

  // Backend xətası: fake klan göstərmirik — real xəta vəziyyəti.
  if (clanError) {
    return <ClanLoadError onRetry={() => refetchClan()} onBack={() => navigate(APP_ROUTES.CLAN_LEADERBOARD)} />
  }

  // /clan/me + real klan → yuxarıdakı effect real slug-a yönləndirir; bu an spinner.
  if (isMeRoute && clan) {
    return <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center"><Spinner size="lg" /></div>
  }

  // Klan yoxdur (öz klanın yoxdur və ya slug tapılmadı) → empty state, fake clan yox.
  if (!clan) {
    return (
      <>
        <EmptyState onCreate={() => setShowCreate(true)} onSearch={() => navigate(APP_ROUTES.CLAN_LEADERBOARD)} />
        <AnimatePresence>
          {showCreate && (
            <CreateClanModal
              onClose={() => setShowCreate(false)}
              onSubmit={data => createMutation.mutate(data)}
            />
          )}
        </AnimatePresence>
      </>
    )
  }

  const c          = clan
  const memberList = members ?? []
  const battleList = battles ?? []
  const clanStats  = stats ?? null

  const sortedMembers = [...memberList].sort((a, b) => b.weeklyXP - a.weeklyXP)
  const isViewingOwnClan = !!myClan?._id && myClan._id === c._id
  const isMember = isViewingOwnClan || memberList.some(m => m.userId === user?._id)
  const isLeader = memberList.find(m => m.userId === user?._id)?.role === 'leader'
  const hasOwnClan = !!myClan?._id
  const isInAnotherClan = hasOwnClan && !isViewingOwnClan
  const canJoinClan = !myClanLoading && !membersLoading && !hasOwnClan && !isMember
  const winRate  = Math.round((c.wins / Math.max(c.wins + c.losses, 1)) * 100)

  const handleJoinClan = () => {
    if (!window.confirm('Bu klana qoşulmaq istəyirsiniz?')) return
    joinMutation.mutate(c._id)
  }

  const battleBarData = battleList.slice(0, 10).map(b => ({
    name: b.opponentName.slice(0, 6),
    Biz:  b.ourScore,
    Rəqib: b.theirScore,
  }))

  // handle ongoing battle
  const ongoingBattle = battleList.find(b => b.result === 'ongoing')

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background:   `linear-gradient(180deg, ${c.color}25 0%, transparent 100%)`,
          borderBottom: `1px solid ${c.color}25`,
          minHeight:    280,
        }}
      >
        <ClanParticles color={c.color} />

        <div className="relative max-w-2xl mx-auto px-4 pt-10 pb-8">
          {/* Emblem + name */}
          <div className="flex flex-col items-center text-center mb-6">
            <ClanEmblemDisplay color={c.color} emoji={c.emblem ?? '⚡'} size={100} />

            <motion.h1
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-black mt-4 text-3xl"
              style={{
                background: `linear-gradient(135deg, ${c.color}, #FFD700)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {c.name}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-[#9CA3AF] text-sm mt-1"
            >
              🏫 {c.schoolName} · 📍 {c.city} · ⚔️ {c.totalBattles} yarış
            </motion.p>

            {/* Rank badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 mt-3 px-4 py-2 rounded-xl"
              style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.25)' }}
            >
              <span className="text-lg">🏆</span>
              <span className="font-black text-[#FFD700] text-sm">Ölkədə {c.rank}-ci</span>
            </motion.div>
          </div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="grid grid-cols-3 gap-3 mb-6"
          >
            {[
              { label: 'Üzv',        value: memberList.length, emoji: '👥', tab: 'members' as TabKey },
              { label: 'Ümumi XP',   value: <><XPNumber value={c.totalXP} /> XP</>,  emoji: '⭐', tab: 'stats' as TabKey },
              { label: 'Qalibiyyət', value: `${winRate}%`,    emoji: '🏆', tab: 'battles' as TabKey },
            ].map(s => (
              <button
                key={s.label}
                type="button"
                onClick={() => setTab(s.tab)}
                aria-label={`${s.label} bölməsinə keç`}
                className="flex flex-col items-center p-3 rounded-2xl transition-colors hover:bg-white/[0.09] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${c.color}20` }}
              >
                <span className="text-lg">{s.emoji}</span>
                <span className="font-black text-white text-sm mt-1">{s.value}</span>
                <span className="text-[#9CA3AF] text-[10px]">{s.label}</span>
              </button>
            ))}
          </motion.div>

          {/* Həftəlik XP */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-between mb-5 px-4 py-3 rounded-2xl"
            style={{ background: `${c.color}12`, border: `1px solid ${c.color}25` }}
          >
            <span className="text-[#9CA3AF] text-sm">⚡ Bu həftə</span>
            <span className="font-black text-white text-base">
              <XPNumber value={c.weeklyXP} /> XP
            </span>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex gap-3"
          >
            {isMember ? (
              <>
                {isLeader && (
                  <motion.button
                    onClick={() => setTab('challenge')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm"
                    style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)', boxShadow: '0 4px 16px rgba(147,51,234,0.4)' }}
                  >
                    ⚔️ Klan yarışına çağır
                  </motion.button>
                )}
                <button
                  onClick={() => navigate(APP_ROUTES.CLAN_LEADERBOARD)}
                  className="px-5 py-3.5 rounded-2xl font-bold text-white/80 text-sm border border-white/15 hover:bg-white/5 transition-colors"
                >
                  🔍 Klanları kəşf et
                </button>
                <button
                  onClick={() => {
                    if (isLeader) {
                      if (!window.confirm('Siz klan liderisiniz. Klandan ayrılmaq əvəzinə klanı silmək istəyirsiniz?')) return
                      if (!window.confirm('Bu əməliyyat geri qaytarılmır. Klan silinsin?')) return
                      deleteMutation.mutate()
                    } else if (window.confirm('Klandan ayrılmaq istəyirsiniz?')) {
                      leaveMutation.mutate()
                    }
                  }}
                  disabled={leaveMutation.isPending || deleteMutation.isPending}
                  className="px-5 py-3.5 rounded-2xl font-bold text-red-400 text-sm border border-red-500/20 hover:bg-red-500/10 transition-colors disabled:opacity-60"
                >
                  {deleteMutation.isPending ? 'Silinir...' : leaveMutation.isPending ? 'Ayrılır...' : (isLeader ? 'Klanı sil' : 'Ayrıl')}
                </button>
              </>
            ) : isInAnotherClan ? (
              // İstifadəçi artıq başqa klandadır → join primary deyil (backend onsuz da rədd edir); honest yönləndirmə.
              <button
                onClick={() => navigate(APP_ROUTES.CLAN('me'))}
                className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm border border-white/15 hover:bg-white/5 transition-colors"
              >
                Sən artıq klandasan — Mənim klanıma get →
              </button>
            ) : canJoinClan ? (
              <motion.button
                onClick={handleJoinClan}
                disabled={joinMutation.isPending}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${c.color}, #6366F1)`, boxShadow: `0 4px 16px ${c.color}40` }}
              >
                {joinMutation.isPending ? 'Qoşulur...' : '➕ Klana Qoşul'}
              </motion.button>
            ) : null}
          </motion.div>
        </div>
      </div>

      {/* ── TABS ────────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        {/* Tab bar */}
        <div className="relative flex gap-0 mb-6 border-b border-white/10">
          {TABS.map(t => {
            if (t.key === 'challenge' && !isLeader) return null
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="relative flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors"
                style={{ color: active ? c.color : '#9CA3AF' }}
              >
                <span>{t.emoji}</span>
                <span className="hidden sm:block">{t.label}</span>
                {active && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                    style={{ background: c.color }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Panels */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >

            {/* MEMBERS */}
            {tab === 'members' && (
              membersLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  ))}
                </div>
              ) : memberList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sortedMembers.map((m, i) => (
                    <MemberCard
                      key={m.studentId}
                      m={m}
                      rank={i + 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">👥</div>
                  <p className="text-[#9CA3AF] text-sm">Hələ üzv məlumatı yoxdur.</p>
                  <button onClick={() => refetchMembers()} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Yenidən yoxla</button>
                </div>
              )
            )}

            {/* BATTLES */}
            {tab === 'battles' && (
              battlesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  ))}
                </div>
              ) : battleList.length > 0 ? (
                <div>
                  {/* Bar chart */}
                  <div
                    className="rounded-2xl p-4 mb-5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <p className="text-white font-bold text-sm mb-3">📊 Son 10 Yarış — Xal Müqayisəsi</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={battleBarData} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
                        <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: '#111827', border: `1px solid ${c.color}40`, borderRadius: 12, fontSize: 12 }}
                          labelStyle={{ color: '#9CA3AF' }}
                        />
                        <Bar dataKey="Biz"   fill={c.color}   radius={[4,4,0,0]} />
                        <Bar dataKey="Rəqib" fill="#374151" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Battle timeline */}
                  <div className="space-y-2">
                    {battleList.map(b => {
                      const isWin  = b.result === 'win'
                      const isOngoing = b.result === 'ongoing'
                      const color = isWin ? '#22C55E' : isOngoing ? '#EAB308' : '#EF4444'
                      const icon  = isWin ? '🏆' : isOngoing ? '⚔️' : '❌'
                      const d = b.endedAt ? new Date(b.endedAt) : new Date(b.startedAt)
                      const months = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avg','Sen','Okt','Noy','Dek']
                      const dateStr = `${d.getDate()} ${months[d.getMonth()]}`

                      return (
                        <motion.div
                          key={b._id}
                          whileHover={{ scale: 1.015 }}
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                          style={{ background: `${color}08`, border: `1px solid ${color}20` }}
                          onClick={() => navigate(APP_ROUTES.CLAN_BATTLE(slug!, b._id))}
                        >
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                            style={{ background: `${b.opponentColor}15`, border: `1px solid ${b.opponentColor}30` }}
                          >
                            {b.opponentEmoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold text-sm">{b.opponentName}</span>
                              {isOngoing && (
                                <motion.span
                                  animate={{ opacity: [1, 0.4, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                                  style={{ background: 'rgba(234,179,8,0.2)', color: '#EAB308' }}
                                >
                                  CANLI
                                </motion.span>
                              )}
                            </div>
                            <div className="text-[#9CA3AF] text-[11px]">{b.subject} · {b.format} · {dateStr}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-sm" style={{ color }}>
                              {icon} {b.ourScore} – {b.theirScore}
                            </div>
                            <div className="text-[#9CA3AF] text-[10px]">Detallar →</div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">⚔️</div>
                  <p className="text-[#9CA3AF] text-sm">Bu klanın hələ yarış nəticəsi yoxdur.</p>
                  <button onClick={() => refetchBattles()} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Yenidən yoxla</button>
                </div>
              )
            )}

            {/* STATS */}
            {tab === 'stats' && (
              statsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  ))}
                </div>
              ) : clanStats ? (
                <div className="space-y-4">
                  {/* Line chart */}
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <p className="text-white font-bold text-sm mb-3">📈 Həftəlik XP Artımı</p>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={clanStats.weeklyXPHistory} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                        <XAxis dataKey="week" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: '#111827', border: `1px solid ${c.color}40`, borderRadius: 12, fontSize: 12 }}
                          labelStyle={{ color: '#9CA3AF' }}
                          itemStyle={{ color: c.color }}
                        />
                        <Line type="monotone" dataKey="xp" stroke={c.color} strokeWidth={2.5} dot={{ fill: c.color, r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie chart + highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      className="rounded-2xl p-4"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <p className="text-white font-bold text-sm mb-2">🥧 XP Payı</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={clanStats.memberXPShare}
                            dataKey="xp"
                            nameKey="name"
                            cx="50%" cy="50%"
                            outerRadius={68}
                            innerRadius={36}
                          >
                            {clanStats.memberXPShare.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            formatter={(v: string) => <span style={{ color: '#9CA3AF', fontSize: 11 }}>{v}</span>}
                          />
                          <Tooltip
                            contentStyle={{ background: '#111827', borderRadius: 12, fontSize: 12 }}
                            formatter={(v) => [`${Number(v).toLocaleString()} XP`, '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-col gap-3">
                      {[
                        { icon: '📚', label: 'Ən güclü fənn', value: `${clanStats.strongestSubject} ${clanStats.strongestPct}%` },
                        { icon: '🔥', label: 'Ən aktiv üzv',  value: clanStats.mostActiveUser.name },
                        { icon: '🏆', label: 'Ən yaxşı nəticə', value: `${clanStats.bestBattleScore} xal` },
                        { icon: '📊', label: 'Qalibiyyət nisbəti', value: `${winRate}%` },
                      ].map(s => (
                        <div
                          key={s.label}
                          className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <span className="text-xl">{s.icon}</span>
                          <div>
                            <div className="text-[#9CA3AF] text-[11px]">{s.label}</div>
                            <div className="text-white font-bold text-sm">{s.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">📊</div>
                  <p className="text-[#9CA3AF] text-sm">Statistika üçün hələ kifayət qədər real məlumat yoxdur.</p>
                  <button onClick={() => refetchStats()} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Yenidən yoxla</button>
                </div>
              )
            )}

            {/* CHALLENGE (leader only) */}
            {tab === 'challenge' && (
              <div>
                {ongoingBattle && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 rounded-2xl mb-5 cursor-pointer"
                    style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}
                    onClick={() => navigate(APP_ROUTES.CLAN_BATTLE(slug!, ongoingBattle._id))}
                  >
                    <motion.span className="text-2xl" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}>⚔️</motion.span>
                    <div>
                      <p className="text-[#EAB308] font-bold text-sm">Mövcud yarış davam edir!</p>
                      <p className="text-[#9CA3AF] text-xs">vs. {ongoingBattle.opponentName} — Davam et →</p>
                    </div>
                  </motion.div>
                )}

                {/* Search */}
                <div className="relative mb-4">
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Klan axtar... (ən az 2 hərf)"
                    className="w-full px-4 py-3.5 pl-10 rounded-2xl text-white text-sm outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border:     '1px solid rgba(255,255,255,0.1)',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = `${c.color}60` }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]">🔍</span>
                </div>

                {/* Results */}
                {searchLoading && (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    ))}
                  </div>
                )}

                {searchResults && searchResults.length > 0 && (
                  <div className="space-y-3">
                    {searchResults.map(r => (
                      <motion.div
                        key={r._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ background: `${r.color}15`, border: `1px solid ${r.color}30` }}
                        >
                          ⚡
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-bold text-sm">{r.name}</div>
                          <div className="text-[#9CA3AF] text-xs">{r.schoolName} · {r.city}</div>
                          <div className="text-[#9CA3AF] text-xs">#{r.rank} · {r.memberCount} üzv · {r.totalXP.toLocaleString()} XP</div>
                        </div>
                        <motion.button
                          onClick={() => {
                            setActiveBattle(r._id)
                            challengeMutation.mutate({ id: r._id, subject: 'Riyaziyyat' })
                          }}
                          disabled={challengeMutation.isPending && activeBattle === r._id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                          style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)' }}
                        >
                          {challengeMutation.isPending && activeBattle === r._id ? '...' : 'Yarışa dəvət'}
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && !searchLoading && searchError && (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3">⚠️</div>
                    <p className="text-[#9CA3AF] text-sm">Klan siyahısı yüklənmədi.</p>
                    <button onClick={() => refetchSearch()} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Yenidən yoxla</button>
                  </div>
                )}

                {searchQuery.length >= 2 && !searchLoading && !searchError && searchResults?.length === 0 && (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3">🤷</div>
                    <p className="text-[#9CA3AF] text-sm">Bu ada uyğun klan tapılmadı.</p>
                  </div>
                )}

                {searchQuery.length < 2 && (
                  <div className="text-center py-10">
                    <div className="text-5xl mb-4">⚔️</div>
                    <p className="text-[#9CA3AF] text-sm">Rəqib klanın adını yazaraq mübarizəyə çağır.</p>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateClanModal
            onClose={() => setShowCreate(false)}
            onSubmit={data => createMutation.mutate(data)}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
