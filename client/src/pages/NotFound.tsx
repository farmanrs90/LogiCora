import { Link } from 'react-router-dom'
import { ROUTES } from '../constants'

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-8xl font-bold text-blue-500">404</h1>
      <p className="text-2xl font-semibold text-gray-700 mt-4">Səhifə tapılmadı</p>
      <p className="text-gray-400 mt-2">Axtardığın səhifə mövcud deyil.</p>
      <Link
        to={ROUTES.LOGIN}
        className="mt-8 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
      >
        Ana səhifəyə qayıt
      </Link>
    </div>
  )
}

export default NotFound
