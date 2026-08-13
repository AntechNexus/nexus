import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/**
 * Initializes and renders the root React application tree into the DOM.
 * This entry point utilizes `createRoot` for concurrent rendering capabilities provided by React 18+.
 * It wraps the primary `<App />` component within `<StrictMode>` to highlight potential problems in the application
 * during development, enforcing best practices and deprecation warnings without affecting the production build.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
