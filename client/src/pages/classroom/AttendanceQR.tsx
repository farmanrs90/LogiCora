import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import api from '../../lib/api'
import { API_ROUTES, APP_ROUTES } from '../../constants'
import type { RootState } from '../../app/store'

// ── html5-qrcode global type declaration ───────────────────────────────────
// Loaded via script tag in index.html:
//   <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>

declare global {
  interface Window {
    Html5Qrcode?: new (elementId: string) => {
      start: (
        cameraId: string,
        config: { fps: number; qrbox: { width: number; height: number } },
        onSuccess: (text: string) => void,
        onError?: (msg: string) => void,
      ) => Promise<void>
      stop: () => Promise<void>
      clear: () => void
    }
    Html5QrcodeScanner?: new (
      elementId: string,
      config: { fps: number; qrbox: number; rememberLastUsedCamera: boolean },
      verbose: boolean,
    ) => {
      render: (onSuccess: (text: string) => void, onError: (msg: string) => void) => void
      clear: () => Promise<void>
    }
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

type ScanState = 'loading' | 'scanning' | 'success' | 'error' | 'no_camera'

interface ScanSuccess {
  studentName: string
  className:   string
  time:        string
}

interface ScanError {
  code: 'expired' | 'used' | 'invalid' | 'not_enrolled'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeScanSuccess(payload: unknown, studentName: string): ScanSuccess {
  const data = isRecord(payload) ? payload : {}

  return {
    studentName,
    className: toString(data.className) || toString(data.title),
    time: toString(data.time),
  }
}

const ERROR_MESSAGES: Record<ScanError['code'], string> = {
  expired:      'Bu QR kodun vaxtı keçib. Müəllimdən yeni QR alın.',
  used:         'Bu QR kod artıq istifadə olunub.',
  invalid:      'Yanlış QR kod. Skan kodunu düzgün tutun.',
  not_enrolled: 'Siz bu dərsə qeydiyyatlı deyilsiniz.',
}

// ── Confetti ───────────────────────────────────────────────────────────────

function ConfettiPiece({ i }: { i: number }) {
  const angle  = (i / 22) * 2 * Math.PI
  const dist   = 100 + Math.random() * 80
  const colors = ['#22C55E', '#9333EA', '#3B82F6', '#FFD700', '#EC4899']
  return (
    <motion.div
      className="absolute rounded-sm pointer-events-none"
      style={{
        backgroundColor: colors[i % colors.length],
        width:  6 + Math.random() * 5,
        height: 6 + Math.random() * 5,
        top: '50%', left: '50%',
      }}
      initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
      animate={{
        x:       Math.cos(angle) * dist,
        y:       Math.sin(angle) * dist - 60,
        opacity: 0,
        rotate:  Math.random() * 480,
      }}
      transition={{ duration: 1.4, ease: 'easeOut' as const }}
    />
  )
}

// ── Camera scan UI ─────────────────────────────────────────────────────────

const SCANNER_CONTAINER_ID = 'qr-scanner-container'

function CameraScanner({ onScan }: { onScan: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef   = useRef<InstanceType<NonNullable<Window['Html5QrcodeScanner']>> | null>(null)
  const [libLoaded,  setLibLoaded]  = useState(false)
  const [cameraErr,  setCameraErr]  = useState(false)

  // Dynamically load html5-qrcode if not already present
  useEffect(() => {
    if (window.Html5QrcodeScanner) {
      setLibLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
    script.async = true
    script.onload = () => setLibLoaded(true)
    script.onerror = () => setCameraErr(true)
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  // Start scanner when lib is loaded
  useEffect(() => {
    if (!libLoaded || !window.Html5QrcodeScanner) return

    const scanner = new window.Html5QrcodeScanner(
      SCANNER_CONTAINER_ID,
      { fps: 10, qrbox: 220, rememberLastUsedCamera: true },
      false,
    )

    scanner.render(
      (decodedText) => {
        // Extract token from URL or use raw value
        let token = decodedText
        try {
          const url = new URL(decodedText)
          token = url.searchParams.get('token') ?? decodedText
        } catch { /* raw token */ }
        onScan(token)
        scanner.clear().catch(() => {})
      },
      (errorMsg) => {
        // Suppress continuous "not found" messages
        if (!errorMsg.includes('No QR code found')) {
          console.warn('QR scan error:', errorMsg)
        }
      },
    )

    scannerRef.current = scanner
    return () => {
      scanner.clear().catch(() => {})
    }
  }, [libLoaded, onScan])

  if (cameraErr) return null

  return (
    <div className="w-full">
      {!libLoaded && (
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' as const }}
            className="w-10 h-10 rounded-full border-4 border-t-transparent border-[#9333EA]"
          />
        </div>
      )}
      <div
        ref={containerRef}
        id={SCANNER_CONTAINER_ID}
        className="w-full overflow-hidden rounded-2xl"
        style={{ display: libLoaded ? 'block' : 'none' }}
      />
    </div>
  )
}

// ── Manual token fallback ──────────────────────────────────────────────────

function ManualEntry({ onSubmit }: { onSubmit: (token: string) => void }) {
  const [token, setToken] = useState('')
  return (
    <div className="mt-6">
      <p className="text-[#9CA3AF] text-sm text-center mb-3">və ya PIN kodu daxil et</p>
      <div className="flex gap-2">
        <input
          value={token}
          onChange={e => setToken(e.target.value.toUpperCase())}
          maxLength={8}
          placeholder="PIN..."
          className="flex-1 px-4 py-3 rounded-2xl text-white text-sm font-mono font-bold text-center outline-none tracking-widest"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
        />
        <motion.button
          onClick={() => token.trim() && onSubmit(token.trim())}
          disabled={token.trim().length < 4}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="px-5 py-3 rounded-2xl font-bold text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)' }}
        >
          Göndər
        </motion.button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function AttendanceQR() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const user      = useSelector((s: RootState) => s.auth.user)

  const [state,     setState]     = useState<ScanState>('loading')
  const [success,   setSuccess]   = useState<ScanSuccess | null>(null)
  const [errorCode, setErrorCode] = useState<ScanError['code'] | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate(APP_ROUTES.LOGIN, { replace: true })
    else setState('scanning')
  }, [user, navigate])

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: (token: string) =>
      api.post<{ data: unknown }>(API_ROUTES.ATTENDANCE.SCAN, {
        classroomId: id,
        qrToken:     token,
      }).then(r => normalizeScanSuccess(
        r.data.data,
        [user?.name, user?.surname].filter(Boolean).join(' '),
      )),
    onSuccess: (data: ScanSuccess) => {
      setSuccess(data)
      setState('success')
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)
    },
    onError: (err: unknown) => {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code
      setErrorCode((code ?? 'invalid') as ScanError['code'])
      setState('error')
    },
  })

  const handleScan = (token: string) => {
    if (scanMutation.isPending) return
    scanMutation.mutate(token)
  }

  const handleRetry = () => {
    setErrorCode(null)
    setState('scanning')
  }

  const now = new Date()
  const timeStr = now.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="text-5xl mb-3">📱</div>
        <h1 className="text-white font-black text-2xl">QR Davamiyyət</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">Müəllimin ekranındakı QR-ı skan et</p>
      </motion.div>

      {/* State machine */}
      <div className="w-full max-w-xs">
        <AnimatePresence mode="wait">

          {/* LOADING */}
          {state === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-64"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' as const }}
                className="w-12 h-12 rounded-full border-4 border-t-transparent border-[#9333EA]"
              />
            </motion.div>
          )}

          {/* SCANNING */}
          {state === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="flex flex-col items-center"
            >
              {/* Scanning frame */}
              <div className="relative w-full mb-4">
                <div className="relative rounded-2xl overflow-hidden">
                  <CameraScanner onScan={handleScan} />

                  {/* Corner accents */}
                  {[['top-2 left-2', 'border-t-2 border-l-2'],
                    ['top-2 right-2', 'border-t-2 border-r-2'],
                    ['bottom-2 left-2', 'border-b-2 border-l-2'],
                    ['bottom-2 right-2', 'border-b-2 border-r-2'],
                  ].map(([pos, border]) => (
                    <div
                      key={pos}
                      className={`absolute ${pos} w-8 h-8 border-[#9333EA] rounded-sm ${border}`}
                    />
                  ))}

                  {/* Scan line */}
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 pointer-events-none"
                    style={{ background: 'linear-gradient(90deg, transparent, #9333EA, transparent)' }}
                    animate={{ top: ['15%', '85%', '15%'] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' as const }}
                  />
                </div>
              </div>

              {scanMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-[#9CA3AF] text-sm mb-4"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' as const }}
                    className="w-4 h-4 rounded-full border-2 border-t-transparent border-[#9333EA]"
                  />
                  Yoxlanılır...
                </motion.div>
              )}

              <ManualEntry onSubmit={handleScan} />
            </motion.div>
          )}

          {/* SUCCESS */}
          {state === 'success' && success && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              className="flex flex-col items-center text-center relative"
            >
              {/* Confetti */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <AnimatePresence>
                  {showConfetti && Array.from({ length: 22 }).map((_, i) => <ConfettiPiece key={i} i={i} />)}
                </AnimatePresence>
              </div>

              {/* Big check */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-28 h-28 rounded-full flex items-center justify-center mb-6"
                style={{ background: 'rgba(34,197,94,0.15)', border: '3px solid rgba(34,197,94,0.4)' }}
              >
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="text-6xl"
                >
                  ✅
                </motion.span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-black text-2xl text-white mb-2"
              >
                Davamiyyətin Qeyd Olundu!
              </motion.h2>

              {/* Info card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full rounded-2xl p-4 mb-6"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <div className="flex items-center justify-between py-1.5 border-b border-white/10">
                  <span className="text-[#9CA3AF] text-sm">Tələbə</span>
                  <span className="text-white font-bold text-sm">{success.studentName}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-white/10">
                  <span className="text-[#9CA3AF] text-sm">Dərs</span>
                  <span className="text-white font-bold text-sm">{success.className}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[#9CA3AF] text-sm">Saat</span>
                  <span className="text-white font-bold text-sm">{success.time || timeStr}</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-[#9CA3AF] text-sm"
              >
                Bu səhifəni bağlaya bilərsən 👋
              </motion.div>
            </motion.div>
          )}

          {/* ERROR */}
          {state === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              className="flex flex-col items-center text-center"
            >
              {/* X circle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-28 h-28 rounded-full flex items-center justify-center mb-6"
                style={{ background: 'rgba(239,68,68,0.12)', border: '3px solid rgba(239,68,68,0.3)' }}
              >
                <span className="text-6xl">❌</span>
              </motion.div>

              <h2 className="font-black text-2xl text-white mb-3">Xəta!</h2>

              <div
                className="w-full rounded-2xl p-4 mb-6"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <p className="text-white text-sm">
                  {errorCode ? ERROR_MESSAGES[errorCode] : 'Naməlum xəta baş verdi.'}
                </p>
              </div>

              <motion.button
                onClick={handleRetry}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)' }}
              >
                🔄 Yenidən Skan Et
              </motion.button>

              {(errorCode === 'expired' || errorCode === 'not_enrolled') && (
                <p className="text-[#9CA3AF] text-xs mt-4 px-2">
                  Müəllimdən yeni QR kod almağı xahiş et.
                </p>
              )}
            </motion.div>
          )}

          {/* NO CAMERA */}
          {state === 'no_camera' && (
            <motion.div
              key="no_camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="text-7xl mb-5">📷</div>
              <h2 className="text-white font-bold text-lg mb-2">Kamera tapılmadı</h2>
              <p className="text-[#9CA3AF] text-sm mb-6">
                Brauzer kameraya icazə verməyib. Zəhmət olmasa icazə ver və ya PIN kodu istifadə et.
              </p>
              <ManualEntry onSubmit={handleScan} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-8 text-[#9CA3AF] text-xs"
      >
        LogiCora · Davamiyyət Sistemi
      </motion.p>
    </div>
  )
}
