import { Link } from 'react-router-dom'
import { APP_ROUTES } from '../constants'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center gap-4">
      <h1 className="text-8xl font-bold text-[#9333EA]">404</h1>
      <p className="text-2xl font-semibold text-white">Səhifə tapılmadı</p>
      <p className="text-[#9CA3AF]">Axtardığın səhifə mövcud deyil.</p>
      <Link
        to={APP_ROUTES.HOME}
        className="mt-4 btn-primary"
      >
        Ana səhifəyə qayıt
      </Link>
    </div>
  )
}
