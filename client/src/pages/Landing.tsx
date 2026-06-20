import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Accessibility,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  Eye,
  Globe,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Play,
  Smile,
  Swords,
  Target,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { APP_ROUTES } from '../constants'

// ── Static data ───────────────────────────────────────────────────────────────

interface NavItem { label: string; href: string }

const NAV_ITEMS: NavItem[] = [
  { label: 'Ana səhifə', href: '#home' },
  { label: 'Haqqımızda', href: '#about' },
  { label: 'İmkanlar', href: '#features' },
  { label: 'Məqsədimiz', href: '#mission' },
  { label: 'Blog', href: '#blog' },
  { label: 'Əlaqə', href: '#contact' },
]

// İmkanlar dropdown — hər link real bölmə id-sinə işarə edir (ölü anchor yoxdur)
const FEATURE_MENU: NavItem[] = [
  { label: 'Şagird üçün', href: '#users' },
  { label: 'Müəllim üçün', href: '#teachers' },
  { label: 'Valideyn üçün', href: '#users' },
  { label: 'Uşaq Klubu', href: '#features' },
  { label: 'Adaptiv öyrənmə', href: '#adaptive' },
  { label: 'Portfolio', href: '#features' },
]

interface Lang { code: string; label: string; ready: boolean }
const LANGUAGES: Lang[] = [
  { code: 'az', label: 'Azərbaycan dili', ready: true },
  { code: 'tr', label: 'Türkçe', ready: false },
  { code: 'en', label: 'English', ready: false },
  { code: 'ru', label: 'Русский', ready: false },
]

const ROLES: { icon: LucideIcon; title: string; desc: string; cta: string; to: string }[] = [
  { icon: GraduationCap, title: 'Şagird', desc: 'Gündəlik quiz, kurslar, yarışlar və ömürlük portfolio ilə öyrən.', cta: 'Başla', to: APP_ROUTES.REGISTER },
  { icon: Users, title: 'Müəllim', desc: 'Qrup, dərs iştirakı, tapşırıq və analitikanı bir paneldə idarə et.', cta: 'Başla', to: APP_ROUTES.REGISTER },
  { icon: Eye, title: 'Valideyn', desc: 'Övladının fəaliyyətini və inkişafını şəffaf izlə.', cta: 'Başla', to: APP_ROUTES.REGISTER },
  { icon: Building2, title: 'Təhsil mərkəzi / Məktəb', desc: 'Mərkəzinizi LogiCora-ya qoşun — müəllim və şagird axınını vahid sistemdə birləşdirin.', cta: 'Mərkəzini qoş', to: APP_ROUTES.CENTER_APPLY },
]

const FEATURES: { icon: LucideIcon; title: string; desc: string; tint: string }[] = [
  { icon: Brain, title: 'Gündəlik Quiz', desc: 'Hər gün qısa suallar, streak və XP ilə davamlı öyrənmə.', tint: 'bg-indigo-50 text-indigo-600' },
  { icon: BookOpen, title: 'Kurslar', desc: 'Mövzu-əsaslı dərslər və aydın öyrənmə yolu.', tint: 'bg-blue-50 text-blue-600' },
  { icon: Award, title: 'Portfolio / Education Passport', desc: 'Təsdiqlənmiş nailiyyətlər ömürlük pasportda toplanır.', tint: 'bg-amber-50 text-amber-600' },
  { icon: LayoutDashboard, title: 'Müəllim idarə paneli', desc: 'Qrup, tapşırıq və dərs iştirakının tək yerdən idarəsi.', tint: 'bg-purple-50 text-purple-600' },
  { icon: Eye, title: 'Valideyn baxışı', desc: 'Övladın irəliləyişinə şəffaf nəzarət.', tint: 'bg-teal-50 text-teal-600' },
  { icon: Smile, title: 'Uşaq Klubu', desc: 'Kiçik yaşlar üçün sadə və əlçatan təhsil rejimi.', tint: 'bg-pink-50 text-pink-600' },
  { icon: Accessibility, title: 'Adaptiv öyrənmə', desc: 'Böyük düymələr və azaldılmış vizual yük ilə rahat təcrübə.', tint: 'bg-emerald-50 text-emerald-600' },
  { icon: Swords, title: 'Klan və yarışlar', desc: 'Komanda ilə canlı yarışlar və sıralama.', tint: 'bg-orange-50 text-orange-600' },
]

interface JourneyStep { title: string; text: string }
const JOURNEY: JourneyStep[] = [
  { title: 'Qeydiyyat və rol seçimi', text: 'Şagird, müəllim və ya valideyn kimi qeydiyyatdan keç və öz panelinə daxil ol.' },
  { title: 'Gündəlik quiz və öyrənmə', text: 'Qısa gündəlik suallar, kurslar və yarışlarla davamlı öyrən.' },
  { title: 'Müəllim paneli və dərs iştirakı', text: 'Müəllim qrupu, dərs iştirakını və tapşırıqları bir yerdən idarə edir.' },
  { title: 'Valideyn izləməsi və adaptiv dəstək', text: 'Valideyn inkişafı şəffaf görür; adaptiv rejim əlçatanlığı artırır.' },
  { title: 'Portfolio / Education Passport', text: 'Bütün nailiyyətlər ömürlük təhsil pasportunda toplanır.' },
]

const TEACHER_FLOW: { icon: LucideIcon; title: string }[] = [
  { icon: Users, title: 'Qrup yarat' },
  { icon: CalendarDays, title: 'Dərs planla' },
  { icon: ClipboardCheck, title: 'Dərs iştirakını izlə' },
  { icon: BarChart3, title: 'Analitikanı yoxla' },
  { icon: BookOpen, title: 'Kurs və tapşırıqları idarə et' },
]

const BLOG_POSTS: { tag: string; title: string; desc: string; grad: string }[] = [
  { tag: 'Motivasiya', title: 'Şagird motivasiyası', desc: 'Streak, XP və yarışların öyrənməyə təsiri.', grad: 'from-indigo-500 to-blue-500' },
  { tag: 'Valideyn', title: 'Valideyn nəzarəti', desc: 'Övladın inkişafını şəffaf izləmək.', grad: 'from-purple-500 to-indigo-500' },
  { tag: 'Əlçatanlıq', title: 'Adaptiv öyrənmə', desc: 'Daha rahat və əlçatan öyrənmə təcrübəsi.', grad: 'from-blue-500 to-cyan-500' },
  { tag: 'Müəllim', title: 'Müəllim üçün rəqəmsal sinif', desc: 'Qrup, dərs iştirakı və analitikanı bir yerdə idarə et.', grad: 'from-emerald-500 to-teal-500' },
]

// Yaş mərhələləri — 3 yaşdan ömür boyu (fake data yoxdur)
const AGE_STAGES: { age: string; title: string; desc: string }[] = [
  { age: '3–5', title: 'Erkən öyrənmə', desc: 'Oyun əsaslı ilk addımlar.' },
  { age: '6–8', title: 'Uşaq Klubu', desc: 'Sadə və əlçatan təhsil rejimi.' },
  { age: '9–14', title: 'Məktəb və günlük quiz', desc: 'Gündəlik suallar və kurslar.' },
  { age: '15–18', title: 'Bacarıqlar və portfolio', desc: 'Nailiyyətlər portfolioda toplanır.' },
  { age: '18+', title: 'Education Passport', desc: 'Sertifikatlar və CV əvəzi təhsil izi.' },
]

// Öyrənmə ekosistemi marquee — CSS-only kartlar (xarici şəkil yoxdur)
const ECOSYSTEM: { title: string; grad: string; icon: LucideIcon }[] = [
  { title: 'Müəllim dərs planlayır', grad: 'from-indigo-500 to-blue-500', icon: CalendarDays },
  { title: 'Şagird mini-test həll edir', grad: 'from-blue-500 to-cyan-500', icon: Brain },
  { title: 'Valideyn irəliləyişi izləyir', grad: 'from-purple-500 to-indigo-500', icon: Eye },
  { title: 'Uşaq Klubu fəaliyyəti', grad: 'from-amber-500 to-orange-500', icon: Smile },
  { title: 'Adaptiv öyrənmə dəstəyi', grad: 'from-teal-500 to-emerald-500', icon: Accessibility },
  { title: 'Portfolio hadisəsi', grad: 'from-pink-500 to-purple-500', icon: Award },
]

// Demo mini-test — lokal, backend yoxdur, nəticə saxlanmır, XP verilmir
interface SelfTestQuestion { q: string; options: string[]; correct: number }
const SELF_TEST: SelfTestQuestion[] = [
  { q: 'Ardıcıllığı tamamla: 2, 4, 8, 16, ?', options: ['24', '32', '30', '20'], correct: 1 },
  { q: 'Ardıcıllığı tamamla: 5, 10, 15, 20, ?', options: ['25', '30', '24', '22'], correct: 0 },
  { q: '"Böyük" sözünün antonimi hansıdır?', options: ['Kiçik', 'Geniş', 'Uzun', 'Ağır'], correct: 0 },
  { q: 'Hansı ədəd cütdür?', options: ['7', '9', '12', '15'], correct: 2 },
  { q: '3 alma + 4 alma neçə alma edir?', options: ['6', '7', '8', '5'], correct: 1 },
  { q: 'Hərf ardıcıllığı: A, C, E, G, ?', options: ['H', 'I', 'J', 'F'], correct: 1 },
  { q: '100 − 45 = ?', options: ['55', '65', '45', '50'], correct: 0 },
  { q: '"Sürətli" sözünün sinonimi hansıdır?', options: ['Yavaş', 'Cəld', 'Ağır', 'Sakit'], correct: 1 },
  { q: 'Bir həftədə neçə gün var?', options: ['5', '6', '7', '8'], correct: 2 },
  { q: 'Bütün quşlar uçur. Sərçə quşdur. Onda sərçə...', options: ['Uçur', 'Üzür', 'Qaçır', 'Yatır'], correct: 0 },
]

// ── Small helpers ───────────────────────────────────────────────────────────────

function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <a
      href="#home"
      className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      aria-label="LogiCora ana səhifə"
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 shadow-sm">
        <span className="h-2.5 w-2.5 rounded-sm bg-white/90" />
      </span>
      <span className="text-xl font-extrabold tracking-tight">
        <span className={dark ? 'text-white' : 'text-gray-900'}>Logi</span>
        <span className={dark ? 'text-indigo-400' : 'text-indigo-600'}>Cora</span>
      </span>
    </a>
  )
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-base leading-relaxed text-gray-600">{sub}</p>}
    </div>
  )
}

// ── Product preview (CSS-only, illustrative — fake statistika yoxdur) ────────────

function ProductPreview() {
  return (
    <div className="relative" aria-hidden="true">
      <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-xl shadow-indigo-100/60 transition-transform duration-300 hover:-rotate-1">
        <span className="lc-shine pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent" />
        <div className="relative flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">Tələbə paneli</p>
          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
            Önizləmə
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {[
            { label: 'Riyaziyyat', pct: '72%', w: 'w-3/4', color: 'bg-indigo-500' },
            { label: 'Məntiq', pct: '64%', w: 'w-2/3', color: 'bg-blue-500' },
          ].map((s) => (
            <div key={s.label}>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{s.label}</span>
                <span>{s.pct}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${s.color} ${s.w}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-gray-100 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase text-gray-400">Gündəlik Quiz</p>
            <p className="mt-1 text-sm font-bold text-gray-900">5 sual hazırdır</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase text-gray-400">Səviyyə</p>
            <p className="mt-1 text-sm font-bold text-gray-900">Davam edir</p>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-5 hidden w-40 rotate-[-4deg] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg sm:block">
        <p className="text-[10px] font-semibold uppercase text-gray-400">Müəllim paneli</p>
        <p className="mt-1 text-xs font-bold text-gray-900">Qrup və dərs iştirakı</p>
      </div>
      <div className="absolute -right-4 -top-5 hidden w-40 rotate-[4deg] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg sm:block">
        <p className="text-[10px] font-semibold uppercase text-gray-400">Valideyn baxışı</p>
        <p className="mt-1 text-xs font-bold text-gray-900">İnkişaf şəffaf</p>
      </div>
    </div>
  )
}

// ── Journey mockups (CSS-only, illustrativ — fake statistika yoxdur) ─────────────

function JourneyMockup({ step }: { step: number }) {
  const card = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-md'

  if (step === 0) {
    return (
      <div className={card} aria-hidden="true">
        <p className="text-xs font-semibold uppercase text-gray-400">Rol seçimi</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {['Şagird', 'Müəllim', 'Valideyn'].map((r, i) => (
            <div key={r} className={`rounded-xl border px-2 py-3 text-center text-xs font-semibold ${i === 0 ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>{r}</div>
          ))}
        </div>
      </div>
    )
  }
  if (step === 1) {
    return (
      <div className={card} aria-hidden="true">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">Gündəlik Quiz</p>
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600">+XP</span>
        </div>
        <div className="mt-3 space-y-2">
          {['A variantı', 'B variantı', 'C variantı'].map((o, i) => (
            <div key={o} className={`rounded-xl border px-3 py-2 text-xs ${i === 1 ? 'border-indigo-300 bg-indigo-50 font-semibold text-indigo-700' : 'border-gray-200 text-gray-500'}`}>{o}</div>
          ))}
        </div>
      </div>
    )
  }
  if (step === 2) {
    return (
      <div className={card} aria-hidden="true">
        <p className="text-sm font-bold text-gray-900">Dərs iştirakı</p>
        <div className="mt-3 space-y-2">
          {['Qrup A', 'Qrup B', 'Qrup C'].map((g, i) => (
            <div key={g} className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-600">
              <span>{g}</span>
              <span className={`h-2.5 w-2.5 rounded-full ${i === 2 ? 'bg-gray-300' : 'bg-green-500'}`} />
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (step === 3) {
    return (
      <div className={card} aria-hidden="true">
        <p className="text-sm font-bold text-gray-900">Valideyn baxışı</p>
        <div className="mt-3">
          <p className="text-xs text-gray-500">Həftəlik fəaliyyət</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full w-2/3 rounded-full bg-indigo-500" /></div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-xs">
          <span className="text-gray-600">Adaptiv rejim</span>
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">Aktiv</span>
        </div>
      </div>
    )
  }
  return (
    <div className={card} aria-hidden="true">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">Portfolio</p>
        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600">Verified</span>
      </div>
      <div className="mt-3 space-y-2">
        {[{ l: 'Riyaziyyat', w: 'w-3/4' }, { l: 'Məntiq', w: 'w-2/3' }].map((s) => (
          <div key={s.l}>
            <p className="text-xs text-gray-500">{s.l}</p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full ${s.w} rounded-full bg-blue-500`} /></div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (<span key={i} className="h-5 w-5 rounded-full bg-indigo-100" />))}
      </div>
    </div>
  )
}

// ── Demo video modal (dürüst — real video yoxdur) ────────────────────────────────

function VideoModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/40 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Demo video"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Demo video</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Bağla"
            className="grid h-9 w-9 place-items-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid aspect-video place-items-center rounded-2xl border border-dashed border-gray-300 bg-slate-50 px-6 text-center">
          <p className="text-sm font-medium text-gray-500">Demo video post-demo mərhələsində əlavə ediləcək.</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Demo mini-test (10 sual, lokal — backend/XP/saxlama yoxdur) ──────────────────

function SelfTest() {
  const navigate = useNavigate()
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const answer = (i: number) => {
    const next = score + (i === SELF_TEST[idx].correct ? 1 : 0)
    setScore(next)
    if (idx + 1 >= SELF_TEST.length) setDone(true)
    else setIdx(idx + 1)
  }

  const restart = () => { setIdx(0); setScore(0); setDone(false) }

  if (done) {
    const level = score <= 3 ? 'Başlanğıc' : score <= 7 ? 'İnkişaf edir' : 'Güclü nəticə'
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Demo mini-test nəticəsi</p>
        <p className="mt-4 text-4xl font-extrabold text-gray-900">{score}/10</p>
        <p className="mt-1 text-sm text-gray-500">düzgün cavab</p>
        <span className="mt-4 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-semibold text-indigo-700">
          Səviyyə: {level}
        </span>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-gray-600">
          Daha çox sual və gündəlik inkişaf üçün qeydiyyatdan keç.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.REGISTER)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Qeydiyyatdan keç <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={restart}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Yenidən başla
          </button>
        </div>
        <p className="mt-5 text-xs text-gray-400">Nəticə hesabda saxlanmır.</p>
      </div>
    )
  }

  const cur = SELF_TEST[idx]
  const pct = ((idx) / SELF_TEST.length) * 100
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">Demo mini-test</span>
        <span className="text-sm font-semibold text-gray-500">{idx + 1}/{SELF_TEST.length}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <h3 className="mt-6 text-lg font-bold text-gray-900">{cur.q}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {cur.options.map((o, i) => (
          <button
            key={o}
            type="button"
            onClick={() => answer(i)}
            className="rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-800 transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {o}
          </button>
        ))}
      </div>
      <p className="mt-5 text-xs text-gray-400">Bu lokal demo testdir — nəticə hesabda saxlanmır.</p>
    </div>
  )
}

// ── Language modal (ClassDojo ruhunda — dürüst: yalnız AZ aktiv) ─────────────────

function LanguageModal({
  lang,
  onPick,
  onClose,
}: {
  lang: string
  onPick: (code: string) => void
  onClose: () => void
}) {
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/40 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Dil seçimi"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Dil seçin</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Bağla"
            className="grid h-9 w-9 place-items-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {LANGUAGES.map((l) => {
            const active = l.code === lang
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => (l.ready ? onPick(l.code) : setNote('Bu dil post-demo mərhələsində tamamlanacaq.'))}
                aria-pressed={active}
                className={`flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  active
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span>{l.label}</span>
                {active ? (
                  <Check className="h-4 w-4 shrink-0 text-indigo-600" />
                ) : !l.ready ? (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                    Tezliklə
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        {note && <p className="mt-4 text-center text-xs font-medium text-gray-500">{note}</p>}
      </motion.div>
    </motion.div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [lang, setLang] = useState('az')
  const [journeyTab, setJourneyTab] = useState(0)
  const [videoOpen, setVideoOpen] = useState(false)

  const pickLang = (code: string) => { setLang(code); setLangOpen(false) }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-gray-900">

      {/* Scoped animasiyalar — xarici asılılıq yoxdur, reduced-motion dəstəklənir */}
      <style>{`
        @keyframes lc-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .lc-marquee-track { animation: lc-marquee 40s linear infinite; }
        .lc-marquee:hover .lc-marquee-track { animation-play-state: paused; }
        @keyframes lc-shine { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }
        .lc-shine { animation: lc-shine 4.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .lc-marquee-track, .lc-shine { animation: none; }
        }
      `}</style>

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandMark />

          {/* Desktop nav */}
          <ul className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) =>
              item.label === 'İmkanlar' ? (
                <li key={item.label} className="group relative">
                  <a
                    href={item.href}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    İmkanlar
                    <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" aria-hidden="true" />
                  </a>
                  {/* Hover/focus dropdown */}
                  <div className="invisible absolute left-0 top-full w-60 pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                      {FEATURE_MENU.map((f) => (
                        <a
                          key={f.label}
                          href={f.href}
                          className="block rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          {f.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </li>
              ) : (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    {item.label}
                  </a>
                </li>
              )
            )}
          </ul>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLangOpen(true)}
              className="hidden items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:flex"
              aria-label="Dil seçimi"
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              {lang.toUpperCase()}
            </button>
            <button
              type="button"
              onClick={() => navigate(APP_ROUTES.LOGIN)}
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:block"
            >
              Daxil ol
            </button>
            <button
              type="button"
              onClick={() => navigate(APP_ROUTES.REGISTER)}
              className="hidden rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:block"
            >
              Qeydiyyat
            </button>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
              aria-label="Menyu aç"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </nav>
      </header>

      {/* ── MOBILE DRAWER ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-white lg:hidden"
          >
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
              <BrandMark />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-lg text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Menyu bağla"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-1 overflow-y-auto px-4 py-4" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-3 py-3 text-base font-semibold text-gray-800 hover:bg-gray-50"
                >
                  {item.label}
                </a>
              ))}

              <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-widest text-gray-400">İmkanlar</p>
              {FEATURE_MENU.map((f) => (
                <a
                  key={f.label}
                  href={f.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  {f.label}
                </a>
              ))}

              <div className="space-y-2 pt-5">
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); navigate(APP_ROUTES.REGISTER) }}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Qeydiyyat
                </button>
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); navigate(APP_ROUTES.LOGIN) }}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  Daxil ol
                </button>
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); setLangOpen(true) }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Globe className="h-4 w-4" aria-hidden="true" /> Dil: {lang.toUpperCase()}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LANGUAGE MODAL ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {langOpen && <LanguageModal lang={lang} onPick={pickLang} onClose={() => setLangOpen(false)} />}
      </AnimatePresence>

      {/* ── DEMO VIDEO MODAL ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {videoOpen && <VideoModal onClose={() => setVideoOpen(false)} />}
      </AnimatePresence>

      <main className="pt-16">

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <section id="home" className="scroll-mt-20 bg-gradient-to-b from-indigo-50/60 to-white">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Lifelong Education Passport
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl">
                Təhsilin bütün yolunu{' '}
                <span className="text-indigo-600">bir platformada</span> birləşdirin
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-600">
                <span className="font-semibold text-gray-900">3 yaşdan başlayaraq ömür boyu öyrənmə izi.</span>{' '}
                Uşaq Klubu, məktəb, kurslar, yarışlar, portfolio və gələcək karyera izi bir profildə.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => navigate(APP_ROUTES.REGISTER)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  Pulsuz başla <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(APP_ROUTES.LOGIN)}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-6 py-3.5 text-base font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  Daxil ol
                </button>
                <a
                  href="#self-test"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-3.5 text-base font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  Özünü sına
                </a>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
              <ProductPreview />
            </motion.div>
          </div>
        </section>

        {/* ── AGE / LIFECYCLE STRIP ─────────────────────────────────────────── */}
        <section id="lifecycle" className="scroll-mt-20 border-y border-gray-100 bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">3 yaşdan ömür boyu</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Bir profildə bütün təhsil yolu</h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {AGE_STAGES.map((s, i) => (
                <div key={s.age} className="relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md">
                  <span className="inline-flex rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">{s.age}</span>
                  <h3 className="mt-3 text-sm font-bold text-gray-900">{s.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">{s.desc}</p>
                  {i < AGE_STAGES.length - 1 && (
                    <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 text-gray-300 lg:block" aria-hidden="true">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ROLE-BASED ENTRY ──────────────────────────────────────────────── */}
        <section id="users" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHead eyebrow="Kim üçün?" title="Hər iştirakçı üçün doğru başlanğıc" sub="Şagird, müəllim, valideyn və məktəblər üçün vahid öyrənmə məkanı." />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {ROLES.map((r) => (
                <div key={r.title} className="group flex flex-col rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-slate-50/60 p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600 transition-transform duration-200 group-hover:scale-110">
                    <r.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-gray-900">{r.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{r.desc}</p>
                  <button
                    type="button"
                    onClick={() => navigate(r.to)}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded"
                  >
                    {r.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ──────────────────────────────────────────────────────── */}
        <section id="features" className="scroll-mt-20 bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHead eyebrow="İmkanlar" title="Öyrənməni gücləndirən alətlər" sub="Gündəlik öyrənmədən portfolioya qədər tam ekosistem." />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${f.tint}`}>
                    <f.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ECOSYSTEM MARQUEE (ClassDojo ruhunda hərəkətli qalereya) ──────── */}
        <section id="ecosystem" className="scroll-mt-20 overflow-hidden bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHead eyebrow="Öyrənmə ekosistemi" title="LogiCora hər rolu bir araya gətirir" sub="Şagird, müəllim, valideyn və Uşaq Klubu — vahid axında." />
          </div>
          <div className="lc-marquee mt-12 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
            <div className="lc-marquee-track flex w-max gap-5 px-4">
              {[...ECOSYSTEM, ...ECOSYSTEM].map((c, i) => (
                <div key={i} className="w-64 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-lg">
                  <div className={`relative flex h-28 items-end bg-gradient-to-br ${c.grad} p-4`}>
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
                    <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-white/20 text-white backdrop-blur">
                      <c.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-bold text-gray-900">{c.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRODUCT JOURNEY (tablı axın — Miro canvas ruhunda) ────────────── */}
        <section
          id="how"
          className="scroll-mt-20 py-20 sm:py-24"
          style={{
            backgroundColor: '#F8FAFC',
            backgroundImage: 'radial-gradient(rgba(99,102,241,0.12) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHead eyebrow="Necə işləyir?" title="LogiCora necə işləyir?" sub="Şagird, müəllim və valideyn üçün öyrənmə axını bir yerdə görünür." />

            {/* Tabs */}
            <div className="mt-10 flex flex-wrap justify-center gap-2">
              {JOURNEY.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setJourneyTab(i)}
                  aria-pressed={journeyTab === i}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    journeyTab === i
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {i + 1}. {s.title}
                </button>
              ))}
            </div>

            {/* Active slide — tab dəyişəndə animasiya ilə gəlir */}
            <AnimatePresence mode="wait">
              <motion.div
                key={journeyTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="mt-10 grid items-center gap-10 rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-10 lg:grid-cols-2"
              >
                <div>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-600 text-sm font-bold text-white">{journeyTab + 1}</span>
                  <h3 className="mt-4 text-2xl font-bold text-gray-900">{JOURNEY[journeyTab].title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-gray-600">{JOURNEY[journeyTab].text}</p>
                </div>
                <JourneyMockup step={journeyTab} />
              </motion.div>
            </AnimatePresence>

            {/* Demo video card (honest) */}
            <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <p className="text-sm font-bold text-gray-900">Demo video</p>
              <button
                type="button"
                onClick={() => setVideoOpen(true)}
                aria-label="Demo videonu aç"
                className="mx-auto mt-4 grid h-14 w-14 place-items-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                <Play className="h-6 w-6" aria-hidden="true" />
              </button>
              <p className="mt-4 text-xs text-gray-500">Demo video post-demo mərhələsində əlavə ediləcək.</p>
            </div>
          </div>
        </section>

        {/* ── ADAPTIVE / INCLUSIVE ──────────────────────────────────────────── */}
        <section id="adaptive" className="scroll-mt-20 bg-gradient-to-b from-white to-indigo-50/60 py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Xüsusi dəstək · Əlçatanlıq</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Hər uşaq eyni şəkildə öyrənmir</h2>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                LogiCora böyük düymələr, sadə görünüş, azaldılmış vizual yük və valideyn/müəllim
                dəstəyi ilə daha əlçatan öyrənmə təcrübəsi yaradır.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Accessibility, title: 'Sadə interfeys', desc: 'Böyük düymələr və azaldılmış vizual yük.' },
                { icon: Target, title: 'Fokus rejimi', desc: 'Diqqəti yayındıran elementlər azaldılır.' },
                { icon: Users, title: 'Müəllim dəstəyi', desc: 'Müəllim tempə uyğun istiqamət verir.' },
                { icon: Eye, title: 'Valideyn görünürlüyü', desc: 'İnkişaf şəffaf izlənir.' },
              ].map((c) => (
                <div key={c.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                    <c.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-sm font-bold text-gray-900">{c.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TEACHER WORKFLOW (split) ──────────────────────────────────────── */}
        <section id="teachers" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Müəllimlər üçün</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Sinifdən analitikaya — vahid axın</h2>
              <p className="mt-4 text-base leading-relaxed text-gray-600">Müəllim qrup, dərs iştirakı, kurs və analitikanı bir paneldən idarə edir.</p>
              <ul className="mt-6 space-y-3">
                {TEACHER_FLOW.map((t) => (
                  <li key={t.title} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                      <t.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium text-gray-800">{t.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CSS mockup */}
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-md" aria-hidden="true">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">Müəllim paneli</p>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">Önizləmə</span>
              </div>
              <div className="mt-4 space-y-2">
                {['Ayan M.', 'Kənan R.', 'Leyla H.'].map((s, i) => (
                  <div key={s} className="flex items-center justify-between rounded-xl border border-gray-100 bg-slate-50 px-3 py-2 text-xs text-gray-600">
                    <span>{s}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${i === 1 ? 'bg-gray-300' : 'bg-green-500'}`} />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">Qrup fəallığı</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full w-3/4 rounded-full bg-blue-500" /></div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STUDENT GROWTH (split) ────────────────────────────────────────── */}
        <section id="growth" className="scroll-mt-20 bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            {/* CSS mockup */}
            <div className="order-2 rounded-3xl border border-gray-200 bg-white p-5 shadow-md lg:order-1" aria-hidden="true">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">Şagird inkişafı</p>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">Önizləmə</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-gray-400">Gündəlik Quiz</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">Hazırdır</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-gray-400">Səviyyə</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">Artır</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-gray-500">Portfolio irəliləyişi</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full w-2/3 rounded-full bg-indigo-500" /></div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Şagird üçün</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Hər addımda görünən inkişaf</h2>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                Gündəlik quiz, XP və səviyyə ilə motivasiya, nailiyyətlər isə portfolioda toplanır.
                İrəliləyiş ümumi göstərilir — uydurma rəqəm yoxdur.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2"><Brain className="h-4 w-4 text-indigo-600" aria-hidden="true" /> Gündəlik quiz və streak</li>
                <li className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-indigo-600" aria-hidden="true" /> XP və səviyyə ilə irəliləyiş</li>
                <li className="flex items-center gap-2"><Award className="h-4 w-4 text-indigo-600" aria-hidden="true" /> Portfolio / Education Passport</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── SELF TEST (real 10 suallıq lokal demo) ────────────────────────── */}
        <section id="self-test" className="scroll-mt-20 bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <SectionHead eyebrow="Özünü sına" title="10 suallıq demo mini-test" sub="Məntiq və ümumi bacarıq sualları. Login tələb olunmur, nəticə hesabda saxlanmır." />
            <div className="mt-10">
              <SelfTest />
            </div>
          </div>
        </section>

        {/* ── ABOUT ─────────────────────────────────────────────────────────── */}
        <section id="about" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <SectionHead eyebrow="Haqqımızda" title="LogiCora nədir?" sub="LogiCora şagird, müəllim və valideyni vahid öyrənmə sistemində birləşdirən təhsil platformasıdır. Məqsəd təkcə kurslar deyil — şagirdin bütün öyrənmə tarixini bir yerdə saxlamaqdır." />
          </div>
        </section>

        {/* ── MISSION ───────────────────────────────────────────────────────── */}
        <section id="mission" className="scroll-mt-20 bg-gray-900 py-20 text-white sm:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Məqsədimiz</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Ömürlük təhsil pasportu</h2>
            <p className="mt-5 text-base leading-relaxed text-gray-300">
              Şagird-mərkəzli öyrənmə tarixi, müəllim və valideyn üçün şəffaf görünürlük və
              milli miqyaslı potensial — hamısı bir platformada. Hər addım portfolioda toplanır
              və gələcəkdə öyrənənin yanında qalır.
            </p>
            <div className="mt-8">
              <button
                type="button"
                onClick={() => navigate(APP_ROUTES.REGISTER)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                Pulsuz başla <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        {/* ── BLOG (preview — honest, route yoxdur → Tezliklə) ──────────────── */}
        <section id="blog" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHead eyebrow="Blog" title="Öyrənmə haqqında qeydlər" sub="Bu bölmə post-demo mərhələsində məqalələrlə genişləndiriləcək." />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {BLOG_POSTS.map((b) => (
                <div key={b.title} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  {/* Vizual başlıq (CSS gradient — şəkil yoxdur) */}
                  <div className={`relative flex h-28 items-end bg-gradient-to-br ${b.grad} p-4`}>
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
                    <span className="relative rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur">{b.tag}</span>
                    <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-gray-600">Tezliklə</span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-bold text-gray-900">{b.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CONTACT (honest — fake form yoxdur) ───────────────────────────── */}
        <section id="contact" className="scroll-mt-20 bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <SectionHead eyebrow="Əlaqə" title="Bizimlə əlaqə saxlayın" sub="Demo və əməkdaşlıq üçün əlaqə bölməsi post-demo mərhələsində genişləndiriləcək." />
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate(APP_ROUTES.REGISTER)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Qeydiyyatla başla <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => navigate(APP_ROUTES.LOGIN)}
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Daxil ol
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER (geniş, tünd navy — dürüst) ──────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-teal-400" />
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-md">
            <BrandMark dark />
            <p className="mt-4 text-sm text-gray-400">
              Öyrənmə, inkişaf və portfolio üçün vahid təhsil platforması.
            </p>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <p className="text-sm font-bold text-white">Platforma</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="#home" className="text-gray-400 transition-colors hover:text-white">Ana səhifə</a></li>
                <li><a href="#about" className="text-gray-400 transition-colors hover:text-white">Haqqımızda</a></li>
                <li><a href="#mission" className="text-gray-400 transition-colors hover:text-white">Məqsədimiz</a></li>
                <li><a href="#how" className="text-gray-400 transition-colors hover:text-white">Necə işləyir</a></li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-bold text-white">İstifadəçilər</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="#users" className="text-gray-400 transition-colors hover:text-white">Şagirdlər</a></li>
                <li><a href="#teachers" className="text-gray-400 transition-colors hover:text-white">Müəllimlər</a></li>
                <li><a href="#users" className="text-gray-400 transition-colors hover:text-white">Valideynlər</a></li>
                <li><a href="#users" className="text-gray-400 transition-colors hover:text-white">Təhsil mərkəzləri</a></li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-bold text-white">İmkanlar</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="#features" className="text-gray-400 transition-colors hover:text-white">Gündəlik Quiz</a></li>
                <li><a href="#features" className="text-gray-400 transition-colors hover:text-white">Portfolio</a></li>
                <li><a href="#adaptive" className="text-gray-400 transition-colors hover:text-white">Adaptiv öyrənmə</a></li>
                <li><a href="#features" className="text-gray-400 transition-colors hover:text-white">Uşaq Klubu</a></li>
                <li><a href="#features" className="text-gray-400 transition-colors hover:text-white">Klan və yarışlar</a></li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-bold text-white">Resurslar</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><span className="text-gray-500">Blog · Tezliklə</span></li>
                <li><a href="#self-test" className="text-gray-400 transition-colors hover:text-white">Özünü sına</a></li>
                <li><span className="text-gray-500">Demo video · Tezliklə</span></li>
                <li><span className="text-gray-500">Roadmap · Tezliklə</span></li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-bold text-white">Hesab</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><button type="button" onClick={() => navigate(APP_ROUTES.LOGIN)} className="text-gray-400 transition-colors hover:text-white">Daxil ol</button></li>
                <li><button type="button" onClick={() => navigate(APP_ROUTES.REGISTER)} className="text-gray-400 transition-colors hover:text-white">Qeydiyyat</button></li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-bold text-white">Hüquqi</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><span className="text-gray-500">Məxfilik · Tezliklə</span></li>
                <li><span className="text-gray-500">Şərtlər · Tezliklə</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
            <p className="text-sm text-gray-400">© 2026 LogiCora — Azərbaycan təhsil platforması</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLangOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Dil seçimi"
              >
                <Globe className="h-4 w-4" aria-hidden="true" /> {lang.toUpperCase()}
              </button>
              <span className="text-xs text-gray-500">AZ · TR · EN · RU</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
