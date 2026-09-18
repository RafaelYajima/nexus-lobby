import { Navigate, Route, Routes } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import ResetPassword from './pages/ResetPassword'
import Lobby from './pages/Lobby'
import ProfilePage from './pages/ProfilePage'
import ChatPage from './pages/ChatPage'
import RoomsPage from './pages/RoomsPage'
import RoomPage from './pages/RoomPage'
import AdminPage from './pages/AdminPage'
import FriendsPage from './pages/FriendsPage'
import ProtectedRoute from './components/ProtectedRoute'
import RequireAdm from './components/RequireAdm'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/lobby"
        element={
          <ProtectedRoute>
            <Lobby />
          </ProtectedRoute>
        }
      />
      <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/amigos"
            element={
              <ProtectedRoute>
                <FriendsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:friendId"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/salas"
            element={
              <ProtectedRoute>
                <RoomsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/salas/:roomId"
            element={
              <ProtectedRoute>
                <RoomPage />
              </ProtectedRoute>
            }
          />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RequireAdm>
              <AdminPage />
            </RequireAdm>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/lobby" replace />} />
      <Route path="*" element={<Navigate to="/lobby" replace />} />
    </Routes>
  )
}
