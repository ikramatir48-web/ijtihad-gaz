import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { Flame, LayoutDashboard, ShoppingCart, Users, Package, FileText, LogOut, Plus, ClipboardList, Bell, FolderOpen, Truck, Settings, UserCheck, Menu, X as XIcon, Tag, FilePlus, Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

function NotifPanel({ userId }) {
  const [notifs, setNotifs] = useState([])
  useEffect(() => { loadNotifs() }, [])
  async function loadNotifs() {
    const { data } = await supabase.from('notifications').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
    setNotifs(data || [])
  }
  async function marquerLu(id) {
    await supabase.from('notifications').update({ lu: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n))
  }
  async function toutLire() {
    const ids = notifs.filter(n => !n.lu).map(n => n.id)
    if (ids.length) {
      await supabase.from('notifications').update({ lu: true }).in('id', ids)
      setNotifs(prev => prev.map(n => ({ ...n, lu: true })))
    }
  }
  const nonLues = notifs.filter(n => !n.lu).length
  return (
    <div style={{ position: 'absolute', bottom: 70, left: 248, width: 320, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 200 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications {nonLues > 0 && `(${nonLues})`}</span>
        {nonLues > 0 && <button className="btn btn-ghost btn-sm" onClick={toutLire}>Tout lire</button>}
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {notifs.length === 0
          ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Aucune notification</div>
          : notifs.map(n => (
            <div key={n.id} onClick={() => marquerLu(n.id)} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: n.lu ? 'transparent' : 'var(--accent-dim)', transition: 'all 0.1s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: n.lu ? 'var(--text-muted)' : 'var(--text)', marginBottom: 3 }}>
                  {n.type === 'success' ? '✅' : n.type === 'warning' ? '⚠️' : 'ℹ️'} {n.titre}
                </div>
                {!n.lu && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{n.message}</div>
            </div>
          ))}
      </div>
    </div>
  )
}

export default function AppLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [pendingCmd, setPendingCmd] = useState(0)
  const [pendingClients, setPendingClients] = useState(0)
  const [pendingDemandes, setPendingDemandes] = useState(0)
  const [notifCount, setNotifCount] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const isAdmin = profile?.role === 'admin'
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light')
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    setShowNotifs(false)
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!profile) return
    if (isAdmin) {
      fetchPendingCmd()
      fetchPendingClients()
      fetchPendingDemandes()
      const ch = supabase.channel('admin-badges')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'commandes' }, fetchPendingCmd)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchPendingClients)
        .subscribe()
      return () => supabase.removeChannel(ch)
    } else {
      fetchNotifCount()
      const ch = supabase.channel('client-notifs-badge')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
          () => setNotifCount(c => c + 1))
        .subscribe()
      return () => supabase.removeChannel(ch)
    }
  }, [profile])

  async function fetchPendingDemandes() {
    const { count } = await supabase.from('demandes_inscription').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente')
    setPendingDemandes(count || 0)
  }

  async function fetchPendingCmd() {
    const { count } = await supabase.from('commandes').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente')
    setPendingCmd(count || 0)
  }
  async function fetchPendingClients() {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      .eq('role', 'client').or('statut_compte.eq.en_attente,statut_compte.is.null')
    setPendingClients(count || 0)
  }
  async function fetchNotifCount() {
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id).eq('lu', false)
    setNotifCount(count || 0)
  }

  async function handleLogout() { await signOut(); navigate('/auth') }
  const initials = profile?.nom ? profile.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'

  return (
    <div className="app-layout">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="mobile-overlay active"
        />
      )}

      {/* Bouton hamburger mobile */}
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(s => !s)}
      >
        {sidebarOpen ? <XIcon size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="flex items-center gap-2">
            <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 8, padding: 6, display: 'flex' }}>
              <Flame size={16} color="var(--accent)" />
            </div>
            <h1>IjtiGaz</h1>
          </div>
          <span>{isAdmin ? 'Espace Gérant' : 'Espace Client'}</span>
        </div>

        <nav className="sidebar-nav">
          {isAdmin ? (
            <>
              <div className="nav-section"><span>Principal</span></div>
              <NavLink to="/admin" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={16} /> Tableau de bord
              </NavLink>
              <NavLink to="/admin/commandes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ShoppingCart size={16} /> Commandes
                {pendingCmd > 0 && <span className="badge">{pendingCmd}</span>}
              </NavLink>
              <div className="nav-section"><span>Gestion</span></div>
              <NavLink to="/admin/clients" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Users size={16} /> Clients
                {pendingClients > 0 && <span className="badge">{pendingClients}</span>}
              </NavLink>
              <NavLink to="/admin/demandes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <UserCheck size={16} /> Demandes
                {pendingDemandes > 0 && <span className="badge">{pendingDemandes}</span>}
              </NavLink>
              <NavLink to="/admin/devis" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <FilePlus size={16} /> Devis
              </NavLink>
              <NavLink to="/admin/produits" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Package size={16} /> Produits
              </NavLink>
              <NavLink to="/admin/factures" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <FileText size={16} /> Factures & BL
              </NavLink>
              <NavLink to="/admin/livreurs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Truck size={16} /> Livreurs
              </NavLink>
              <NavLink to="/admin/parametres" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Settings size={16} /> Paramètres
              </NavLink>
            </>
          ) : (
            <>
              <div className="nav-section"><span>Mon espace</span></div>
              <NavLink to="/client" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={16} /> Tableau de bord
              </NavLink>
              <NavLink to="/client/commandes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ClipboardList size={16} /> Mes commandes
              </NavLink>
              <NavLink to="/client/documents" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <FolderOpen size={16} /> Mes documents
              </NavLink>
              <NavLink to="/client/nouvelle-commande" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Plus size={16} /> Nouvelle commande
              </NavLink>
              <NavLink to="/client/tarifs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Tag size={16} /> Tarifs
              </NavLink>
              <NavLink to="/client/parametres" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Settings size={16} /> Paramètres
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {!isAdmin && (
            <div style={{ padding: '4px 16px 8px', position: 'relative' }}>
              <button onClick={() => setShowNotifs(s => !s)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <Bell size={16} />
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>Notifications</span>
                {notifCount > 0 && <span className="badge" style={{ marginLeft: 'auto' }}>{notifCount}</span>}
              </button>
              {showNotifs && <NotifPanel userId={profile?.id} />}
            </div>
          )}
          <button onClick={toggleTheme} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', marginBottom: 8,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)',
          fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: 500,
          transition: 'all 0.15s',
        }}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        </button>
        <div className="user-chip" onClick={handleLogout} title="Se déconnecter">
            <div className="avatar">{initials}</div>
            <div className="user-info">
              <strong>{profile?.nom || 'Utilisateur'}</strong>
              <span>{isAdmin ? 'Administrateur' : profile?.numero_client || 'Client'}</span>
            </div>
            <LogOut size={14} color="var(--text-muted)" />
          </div>
        </div>
      </aside>

      <main className="main-content"><Outlet /></main>
    </div>
  )
}
