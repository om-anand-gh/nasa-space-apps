import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import LocationPage from './Page'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LocationPage />
  </StrictMode>,
)
