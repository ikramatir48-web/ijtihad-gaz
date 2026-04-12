import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.jsx'
import AuthPage from './pages/AuthPage.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminCommandes from './pages/admin/AdminCommandes.jsx'
import AdminClients from './pages/admin/AdminClients.jsx'
import AdminProduits from './pages/admin/AdminProduits.jsx'
import AdminFactures from './pages/admin/AdminFactures.jsx'
import AdminLivreurs from './pages/admin/AdminLivreurs.jsx'
import AdminParametres from './pages/admin/AdminParametres.jsx'
import AdminDevis from './pages/admin/AdminDevis.jsx'
import AdminDemandes from './pages/admin/AdminDemandes.jsx'
import ClientDashboard from './pages/client/ClientDashboard.jsx'
import ClientCommandes from './pages/client/ClientCommandes.jsx'
import ClientNouvelleCommande from './pages/client/ClientNouvelleCommande.jsx'
import ClientDocuments from './pages/client/ClientDocuments.jsx'
import ClientParametres from './pages/client/ClientParametres.jsx'
import ClientTarifs from './pages/client/ClientTarifs.jsx'
import AppLayout from './components/shared/AppLayout.jsx'
import ForceSetup from './pages/ForceSetup.jsx'

function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /><span>Chargement...</span></div>
  if (!user) return <Navigate to="/auth" replace />
  if (requiredRole && !profile) return <div className="loading-screen"><div className="spinner" /><span>Chargement...</span></div>
  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to={profile?.role === 'admin' ? '/admin' : '/client'} replace />
  }
  // Première connexion : forcer changement de mot de passe
  if (profile?.force_password_change && profile?.role === 'client') {
    return <ForceSetup />
  }
  return children
}

export default function App() {
  const { user, profile } = useAuth()
  return (
    <Routes>
      <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/" replace />} />

      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AppLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="commandes" element={<AdminCommandes />} />
        <Route path="clients" element={<AdminClients />} />
        <Route path="produits" element={<AdminProduits />} />
        <Route path="factures" element={<AdminFactures />} />
        <Route path="livreurs" element={<AdminLivreurs />} />
        <Route path="parametres" element={<AdminParametres />} />
        <Route path="demandes" element={<AdminDemandes />} />
        <Route path="devis" element={<AdminDevis />} />
      </Route>

      <Route path="/client" element={<ProtectedRoute requiredRole="client"><AppLayout /></ProtectedRoute>}>
        <Route index element={<ClientDashboard />} />
        <Route path="commandes" element={<ClientCommandes />} />
        <Route path="nouvelle-commande" element={<ClientNouvelleCommande />} />
        <Route path="documents" element={<ClientDocuments />} />
        <Route path="parametres" element={<ClientParametres />} />
        <Route path="tarifs" element={<ClientTarifs />} />
      </Route>

      <Route path="/" element={
        !user ? <Navigate to="/auth" replace /> :
        profile?.role === 'admin' ? <Navigate to="/admin" replace /> :
        <Navigate to="/client" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
