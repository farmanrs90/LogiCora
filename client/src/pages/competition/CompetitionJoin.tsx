import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { competitionService } from '../../services/competitionService'
import { APP_ROUTES } from '../../constants'

export default function CompetitionJoin() {
  const navigate = useNavigate()
  const [pin,    setPin]    = useState('')
  const [joining, setJoining] = useState(false)

  async function handleJoin() {
    if (pin.length !== 6) return toast.error('PIN 6 rəqəm olmalıdır')
    setJoining(true)
    try {
      const comp = await competitionService.joinByPin(pin)
      navigate(APP_ROUTES.COMPETITION.LOBBY(comp._id))
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status
      toast.error(
        status === 404 ? 'Belə PIN tapılmadı' :
        status === 400 ? 'Yarış artıq başlayıb' :
        status === 409 ? 'Sən artıq qoşulmusan' :
        'Qoşulmaq alınmadı',
      )
      setJoining(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12 flex flex-col items-center">
      <span className="text-6xl mb-4">⚔️</span>
      <h1 className="text-white font-black text-2xl mb-1">Yarışa Qoşul</h1>
      <p className="text-[#9CA3AF] text-sm mb-8 text-center">Müəllimin verdiyi 6 rəqəmli PIN-i yaz.</p>

      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        placeholder="000000"
        className="w-full mb-6 px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white text-center text-3xl font-black tracking-[0.3em] outline-none focus:border-white/30"
      />

      <button
        onClick={handleJoin}
        disabled={joining || pin.length !== 6}
        className="w-full py-4 rounded-2xl font-black text-white text-lg disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #3B82F6, #9333EA)' }}
      >
        {joining ? 'Qoşulur...' : 'Qoşul 🚀'}
      </button>
    </div>
  )
}
