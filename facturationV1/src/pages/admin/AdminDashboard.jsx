import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useNavigate } from 'react-router-dom'
import { format, isToday, isTomorrow, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ShoppingCart, Users, FileText, Calendar, Check, X, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

function StatutBadge({ statut }) {
  const map = {
    en_attente: ['badge-yellow', '⏳ En attente'],
    validee:    ['badge-blue',   '✓ Confirmée'],
    livree:     ['badge-green',  '✓ Livrée'],
    annulee:    ['badge-red',    '✕ Annulée'],
  }
  const [cls, label] = map[statut] || ['badge-gray', statut]
  return <span className={`badge ${cls}`}>{label}</span>
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total: 0, pending: 0, livrees: 0, clients: 0 })
  const [pendingClients, setPendingClients] = useState([])
  const [showPendingModal, setShowPendingModal] = useState(false)
  const [recent, setRecent]       = useState([])
  const [livraisons, setLivraisons] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => { load(); loadPendingClients() }, [])

  async function loadPendingClients() {
    const { data } = await supabase.from('profiles')
      .select('id, nom, telephone, nom_societe, email')
      .eq('role', 'client')
      .or('statut_compte.eq.en_attente,statut_compte.is.null')
      .order('created_at', { ascending: false })
    if (data && data.length > 0) {
      setPendingClients(data)
      setShowPendingModal(true)
    }
  }

  async function activerCompte(clientId, nom) {
    await supabase.from('profiles').update({ statut_compte: 'actif' }).eq('id', clientId)
    await supabase.from('notifications').insert({
      user_id: clientId, type: 'success',
      titre: 'Compte activé',
      message: 'Bienvenue parmi nos fidèles clients. Vous pouvez désormais passer commande.',
    })
    toast.success(`Compte de ${nom} activé`)
    setPendingClients(prev => prev.filter(c => c.id !== clientId))
  }

  async function load() {
    const [cmdRes, clientRes, livrRes] = await Promise.all([
      supabase.from('commandes')
        .select('id, statut, created_at, numero_commande, mode_paiement, date_livraison_souhaitee, profiles(nom, numero_client)')
        .order('created_at', { ascending: false }).limit(8),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
      // Livraisons à venir (commandes validées avec date souhaitée dans les 7 prochains jours)
      supabase.from('commandes')
        .select('id, numero_commande, date_livraison_souhaitee, statut, profiles(nom, telephone)')
        .not('date_livraison_souhaitee', 'is', null)
        .in('statut', ['en_attente', 'validee'])
        .gte('date_livraison_souhaitee', new Date().toISOString().split('T')[0])
        .lte('date_livraison_souhaitee', addDays(new Date(), 7).toISOString().split('T')[0])
        .order('date_livraison_souhaitee', { ascending: true }),
    ])

    const all = cmdRes.data || []
    const pending = all.filter(c => c.statut === 'en_attente').length
    setStats({
      total: all.length, pending,
      livrees: all.filter(c => c.statut === 'livree').length,
      clients: clientRes.count || 0,
    })
    setRecent(all)
    setLivraisons(livrRes.data || [])
    setLoading(false)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  function getLivraisonLabel(dateStr) {
    const d = new Date(dateStr)
    if (isToday(d)) return { label: "Aujourd'hui", color: 'var(--danger)' }
    if (isTomorrow(d)) return { label: 'Demain', color: 'var(--warning)' }
    return { label: format(d, 'dd MMM', { locale: fr }), color: 'var(--info)' }
  }

  return (
    <div>
      {/* Popup comptes en attente */}
      {showPendingModal && pendingClients.length > 0 && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Nouveaux comptes à valider</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowPendingModal(false)}><X size={15} /></button>
            </div>
            <div className="modal-body">
              <p className="text-muted" style={{ marginBottom: 16, fontSize: 13 }}>
                {pendingClients.length} nouveau(x) client(s) attendent la validation de leur compte. Appelez-les pour confirmer leur adresse avant d'activer.
              </p>
              {pendingClients.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.nom}</div>
                    <div className="text-muted text-sm">
                      {c.telephone && <span><Phone size={11} style={{ display: 'inline', marginRight: 3 }} />{c.telephone}</span>}
                      {c.nom_societe && <span> · {c.nom_societe}</span>}
                    </div>
                    <div className="text-muted text-sm">{c.email}</div>
                  </div>
                  <button className="btn btn-success btn-sm" onClick={() => activerCompte(c.id, c.nom)}>
                    <Check size={13} /> Activer
                  </button>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowPendingModal(false)}>Fermer</button>
              <button className="btn btn-primary" onClick={() => { setShowPendingModal(false); navigate('/admin/clients') }}>
                Voir tous les clients
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <h2>{greeting}, {profile?.nom?.split(' ')[0]} 👋</h2>
        <p>Voici un aperçu de votre activité.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card orange">
          <div className="stat-label">En attente</div>
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-sub">À confirmer</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Total commandes</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">Toutes périodes</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Livrées</div>
          <div className="stat-value">{stats.livrees}</div>
          <div className="stat-sub">Complétées</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">Clients</div>
          <div className="stat-value">{stats.clients}</div>
          <div className="stat-sub">Enregistrés</div>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button className="btn btn-primary" onClick={() => navigate('/admin/commandes')}>
          <ShoppingCart size={15} /> Gérer les commandes
          {stats.pending > 0 && <span style={{ background:'rgba(255,255,255,0.25)', borderRadius:12, padding:'1px 7px', fontSize:11 }}>{stats.pending}</span>}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/admin/clients')}><Users size={15} /> Clients</button>
        <button className="btn btn-ghost" onClick={() => navigate('/admin/factures')}><FileText size={15} /> Factures</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: livraisons.length > 0 ? '1fr 340px' : '1fr', gap:20 }}>
        {/* Commandes récentes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display" style={{ fontSize:16, fontWeight:700 }}>Commandes récentes</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/commandes')}>Voir tout →</button>
          </div>
          {loading ? (
            <div style={{ padding:40, textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
          ) : recent.length === 0 ? (
            <div className="empty-state"><ShoppingCart size={36} /><h3>Aucune commande</h3></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>N° Commande</th><th>Client</th><th>Date</th><th>Statut</th></tr>
                </thead>
                <tbody>
                  {recent.map(cmd => (
                    <tr key={cmd.id} style={{ cursor:'pointer' }} onClick={() => navigate('/admin/commandes')}>
                      <td><span className="font-display" style={{ fontWeight:700, color:'var(--accent)' }}>{cmd.numero_commande}</span></td>
                      <td>
                        <div>{cmd.profiles?.nom}</div>
                        <div className="text-muted text-sm">{cmd.profiles?.numero_client}</div>
                      </td>
                      <td className="text-muted">{format(new Date(cmd.created_at), 'dd MMM yyyy', { locale: fr })}</td>
                      <td><StatutBadge statut={cmd.statut} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Calendrier livraisons à venir */}
        {livraisons.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} color="var(--accent)" />
              <h3 className="font-display" style={{ fontSize:15, fontWeight:700 }}>Livraisons à venir</h3>
              <span className="badge badge-orange" style={{ marginLeft:'auto' }}>{livraisons.length}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {livraisons.map(cmd => {
                const { label, color } = getLivraisonLabel(cmd.date_livraison_souhaitee)
                return (
                  <div key={cmd.id} style={{ padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:10, borderLeft:`3px solid ${color}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <span style={{ fontWeight:600, fontSize:13 }}>{cmd.profiles?.nom}</span>
                      <span style={{ background: color + '20', color, padding:'2px 8px', borderRadius:8, fontSize:11, fontWeight:600 }}>{label}</span>
                    </div>
                    <div className="text-muted text-sm">{cmd.numero_commande}</div>
                    {cmd.profiles?.telephone && (
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>📞 {cmd.profiles.telephone}</div>
                    )}
                    <StatutBadge statut={cmd.statut} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
