import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import GuideClient from '../../components/shared/GuideClient.jsx'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useNavigate } from 'react-router-dom'
import { Plus, ClipboardList } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

function StatutBadge({ statut }) {
  const map = {
    en_attente: ['badge-yellow', '⏳ En attente'],
    validee: ['badge-blue', '✓ Validée'],
    en_livraison: ['badge-orange', '🚚 En livraison'],
    livree: ['badge-green', '✓ Livrée'],
    annulee: ['badge-red', '✕ Annulée'],
  }
  const [cls, label] = map[statut] || ['badge-gray', statut]
  return <span className={`badge ${cls}`}>{label}</span>
}

export default function ClientDashboard() {
  const { profile } = useAuth()
  const [showGuide, setShowGuide] = useState(() => {
    // Afficher le guide si première visite
    const key = `guide_seen_${profile?.id || 'user'}`
    return !localStorage.getItem(key)
  })

  function closeGuide() {
    const key = `guide_seen_${profile?.id || 'user'}`
    localStorage.setItem(key, 'true')
    setShowGuide(false)
  }
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total: 0, enCours: 0, livrees: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) load()
  }, [profile])

  async function load() {
    const { data } = await supabase
      .from('commandes')
      .select('id, numero_commande, statut, mode_paiement, created_at')
      .eq('client_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5)
    const all = data || []
    setRecent(all)
    setStats({
      total: all.length,
      enCours: all.filter(c => ['en_attente', 'validee', 'en_livraison'].includes(c.statut)).length,
      livrees: all.filter(c => c.statut === 'livree').length,
    })
    setLoading(false)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div>
      {showGuide && <GuideClient onClose={closeGuide} />}
      <div className="page-header">
        <h2>{greeting}, {profile?.nom?.split(' ')[0]} 👋</h2>
        <p>
          <span className="badge badge-orange" style={{ marginRight: 8 }}>{profile?.numero_client}</span>
          Bienvenue sur votre espace de commande.
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card orange">
          <div className="stat-label">Commandes en cours</div>
          <div className="stat-value">{stats.enCours}</div>
          <div className="stat-sub">En attente ou validées</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Livraisons reçues</div>
          <div className="stat-value">{stats.livrees}</div>
          <div className="stat-sub">Complétées</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Total commandes</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">Depuis le début</div>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/client/nouvelle-commande')}>
          <Plus size={16} /> Passer une commande
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/client/commandes')}>
          <ClipboardList size={15} /> Mes commandes
        </button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>Mes dernières commandes</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/client/commandes')}>Voir tout →</button>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : recent.length === 0 ? (
          <div className="empty-state">
            <h3>Aucune commande</h3>
            <p>Passez votre première commande de bouteilles de gaz.</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/client/nouvelle-commande')}>
              <Plus size={15} /> Commander maintenant
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Date</th>
                  <th>Paiement</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(cmd => (
                  <tr key={cmd.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/client/commandes')}>
                    <td><span className="font-display" style={{ fontWeight: 700, color: 'var(--accent)' }}>{cmd.numero_commande}</span></td>
                    <td className="text-muted">{format(new Date(cmd.created_at), 'dd MMM yyyy', { locale: fr })}</td>
                    <td><span className={`badge ${cmd.mode_paiement === 'credit' ? 'badge-yellow' : 'badge-green'}`}>
                      {cmd.mode_paiement === 'credit' ? 'Crédit' : 'À la livraison'}
                    </span></td>
                    <td><StatutBadge statut={cmd.statut} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
