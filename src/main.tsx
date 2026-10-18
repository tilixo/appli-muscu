import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { installAudioUnlock } from './lib/sound'
import { requestPersistentStorage } from './lib/storage'

// Safari peut purger IndexedDB : on demande un stockage persistant dès le lancement.
void requestPersistentStorage()
installAudioUnlock()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
