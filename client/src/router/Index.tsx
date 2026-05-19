import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from '../constants'
import ProtectedRoute from '../components/ProtectedRoute'
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import StudentDashboard from '../pages/dashboard/Student'
import TeacherDashboard from '../pages/dashboard/Teacher'
import ParentDashboard from '../pages/dashboard/Parent'
import NotFound from '../pages/NotFound'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.REGISTER} element={<Register />} />

        <Route path={ROUTES.DASHBOARD.STUDENT} element={
          <ProtectedRoute><StudentDashboard /></ProtectedRoute>
        } />
        <Route path={ROUTES.DASHBOARD.TEACHER} element={
          <ProtectedRoute><TeacherDashboard /></ProtectedRoute>
        } />
        <Route path={ROUTES.DASHBOARD.PARENT} element={
          <ProtectedRoute><ParentDashboard /></ProtectedRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
