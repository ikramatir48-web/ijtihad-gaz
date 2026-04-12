import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './hooks/useAuth.jsx'
import './index.css'
import './mobile.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e1e1e',
              color: '#f0f0f0',
              border: '1px solid #2a2a2a',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13.5px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#0f0f0f' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0f0f0f' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
