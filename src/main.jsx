import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { PresenceProvider } from './context/PresenceContext'
import { SoundProvider } from './context/SoundContext'
import { UnreadProvider } from './context/UnreadContext'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SoundProvider>
          <PresenceProvider>
            <UnreadProvider>
              <ThemeProvider>
                <App />
              </ThemeProvider>
            </UnreadProvider>
          </PresenceProvider>
        </SoundProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
