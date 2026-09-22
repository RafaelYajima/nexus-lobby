import { Navigate, Route, Routes } from 'react-router-dom'
import NotificationCenter from './components/NotificationCenter'
import AuthPage from './pages/AuthPage'
import ResetPassword from './pages/ResetPassword'
import Lobby from './pages/Lobby'
import ProfilePage from './pages/ProfilePage'
import ChatPage from './pages/ChatPage'
import RankingPage from './pages/RankingPage'
import RoomsPage from './pages/RoomsPage'
import RoomPage from './pages/RoomPage'
import RoomSettingsPage from './pages/RoomSettingsPage'
import AdminPage from './pages/AdminPage'
import FriendsPage from './pages/FriendsPage'
import ProtectedRoute from './components/ProtectedRoute'
import RequireAdm from './components/RequireAdm'
import DiscordShell from './layout/DiscordShell'

// 🧱 Cap. 1.5: dentro da casca estilo Discord — as rotas protegidas vivem todas
// dentro do shell (trilha de servidores + coluna de contexto + painel do usuário em lg+;
// layout mobile intacto abaixo disso).
export default function App() {
  return (
    <>
      <NotificationCenter />
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          element={
            <ProtectedRoute>
              <DiscordShell />
            </ProtectedRoute>
          }
        >
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/amigos" element={<FriendsPage />} />
          <Route path="/chat/:friendId" element={<ChatPage />} />
          <Route path="/salas" element={<RoomsPage />} />
          <Route path="/salas/:roomId" element={<RoomPage />} />
          <Route path="/salas/:roomId/c/:channelId" element={<RoomPage />} />
          <Route path="/salas/:roomId/config" element={<RoomSettingsPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route
            path="/admin"
            element={
              <RequireAdm>
                <AdminPage />
              </RequireAdm>
            }
          />
        </Route>
        <Route path="/" element={<Navigate to="/lobby" replace />} />
        <Route path="*" element={<Navigate to="/lobby" replace />} />
      </Routes>
    </>
  )
}
