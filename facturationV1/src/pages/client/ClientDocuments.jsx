import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FileText, ShoppingBag, Truck, ChevronRight, Printer, ArrowLeft } from 'lucide-react'
import { PrintBL, PrintBC, PrintFacture } from '../../components/shared/PrintDocs.jsx'

function StatutBadge({ statut }) {
  const cfg = {
    en_attente: { bg: '#f59e0b', label: 'En attente' },
    validee:    { bg: '#16a34a', label: 'Confirmée' },
    livree:     { bg: '#16a34a', label: 'Livrée' },
    annulee:    { bg: '#ef4444', label: 'Annulée' },
  }
  const c = cfg[statut] || { bg: '#888', label: statut }
  return (
    <span style={{ background: c.bg, color: 'white', padding: '3px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  )
}

const SECTIONS = [
  { key: 'commandes', label: 'Bons de commandes', icon: ShoppingBag, color: '#0891b2' },
  { key: 'bls',       label: 'Bons de livraison', icon: Truck,       color: '#059669' },
]

export default function ClientDocuments() {
  const { profile } = useAuth()
  const [section, setSection] = useState(null)
  const [data, setData]       = useState({ commandes: [], bls: [], factures: [] })
  const [counts, setCounts]   = useState({ commandes: 0, bls: 0, factures: 0 })
  const [loading, setLoading] = useState(true)
  const [printDoc, setPrintDoc] = useState(null)

  useEffect(() => { if (profile?.id) loadAll() }, [profile])

  async function loadAll() {
    setLoading(true)
    const [cmdRes, blRes, factRes] = await Promise.all([
      supabase.from('commandes')
        .select('*, lignes_commande(*, produits(nom))')
        .eq('client_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('bons_livraison')
        .select('*, commandes!inner(numero_commande, statut, mode_paiement, client_id, condition_paiement)')
        .eq('commandes.client_id', profile.id)
        .order('date_creation', { ascending: false }),
      supabase.from('factures')
        .select('*, bons_livraison(numero_bl), commandes!inner(numero_commande, mode_paiement, client_id)')
        .eq('commandes.client_id', profile.id)
        .order('date_facture', { ascending: false }),
    ])

    const d = {
      commandes: cmdRes.data || [],
      bls:       (blRes.data  || []).filter(b => b.commandes?.client_id === profile.id),
      factures:  (factRes.data || []).filter(f => f.commandes?.client_id === profile.id),
    }
    setData(d)
    setCounts({ commandes: d.commandes.length, bls: d.bls.length, factures: d.factures.length })
    setLoading(false)
  }

  async function openPrintBL(bl) {
    const { data: lignes } = await supabase
      .from('lignes_commande').select('*, produits(nom)').eq('commande_id', bl.commande_id)
    // Récupérer le livreur
    const { data: cmdData } = await supabase
      .from('commandes').select('livreur_id').eq('id', bl.commande_id).maybeSingle()
    let livreur = null
    if (cmdData?.livreur_id) {
      const { data: liv } = await supabase
        .from('livreurs').select('*').eq('id', cmdData.livreur_id).maybeSingle()
      livreur = liv
    }
    setPrintDoc({ type: 'bl', bl, commande: bl.commandes, lignes: lignes || [], client: profile, livreur })
  }

  async function openPrintBC(cmd) {
    let lignes = cmd.lignes_commande || []
    if (!lignes.length) {
      const { data } = await supabase
        .from('lignes_commande').select('*, produits(nom)').eq('commande_id', cmd.id)
      lignes = data || []
    }
    setPrintDoc({ type: 'bc', commande: cmd, lignes, client: profile })
  }

  async function openPrintFacture(f) {
    const { data: lignes } = await supabase
      .from('lignes_commande').select('*, produits(nom)').eq('commande_id', f.commande_id)
    const { data: bl } = await supabase
      .from('bons_livraison').select('*').eq('id', f.bl_id).maybeSingle()
    setPrintDoc({ type: 'facture', facture: f, bl, commande: f.commandes, lignes: lignes || [], client: profile })
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  )

  // Page d'accueil — tuiles
  if (!section) {
    return (
      <div>
        <div className="page-header">
          <h2>Mes documents</h2>
          <p>Consultez et imprimez vos bons de commande, bons de livraison et factures.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {SECTIONS.map(s => {
            const Icon = s.icon
            const count = counts[s.key]
            return (
              <div key={s.key} onClick={() => setSection(s.key)} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
                padding: 24, cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ background: s.color + '20', borderRadius: 10, padding: 10 }}>
                    <Icon size={22} color={s.color} />
                  </div>
                  <div style={{
                    background: count > 0 ? s.color : 'var(--bg-elevated)',
                    color: count > 0 ? 'white' : 'var(--text-muted)',
                    borderRadius: 20, padding: '3px 12px', fontSize: 14, fontWeight: 700,
                  }}>{count}</div>
                </div>
                <div className="font-display" style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Voir tout <ChevronRight size={12} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const current = SECTIONS.find(s => s.key === section)
  const Icon = current.icon

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSection(null)}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2>{current.label}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {counts[section]} document{counts[section] > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>

        {/* BONS DE COMMANDE */}
        {section === 'commandes' && (
          data.commandes.length === 0
            ? <div className="empty-state"><h3>Aucun bon de commande</h3></div>
            : <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Date</th>
                      <th>Date livraison souhaitée</th>
                      <th>Statut</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.commandes.map(cmd => (
                      <tr key={cmd.id}>
                        <td>
                          <span className="font-display" style={{ fontWeight: 700, color: '#0891b2' }}>
                            {cmd.numero_commande}
                          </span>
                        </td>
                        <td className="text-muted">{format(new Date(cmd.created_at), 'dd/MM/yyyy', { locale: fr })}</td>
                        <td className="text-muted">
                          {cmd.date_livraison_souhaitee
                            ? format(new Date(cmd.date_livraison_souhaitee), 'dd/MM/yyyy')
                            : '—'}
                        </td>
                        <td><StatutBadge statut={cmd.statut} /></td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => openPrintBC(cmd)}>
                            ⬇ Télécharger
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        )}

        {/* BONS DE LIVRAISON */}
        {section === 'bls' && (
          data.bls.length === 0
            ? <div className="empty-state"><h3>Aucun bon de livraison</h3><p>Les bons de livraison apparaissent après confirmation de votre commande.</p></div>
            : <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>N° BL</th>
                      <th>Commande</th>
                      <th>Date livraison</th>
                      <th>État</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bls.map(bl => (
                      <tr key={bl.id}>
                        <td>
                          <span className="font-display" style={{ fontWeight: 700, color: '#059669' }}>
                            {bl.numero_bl}
                          </span>
                        </td>
                        <td className="text-muted">{bl.commandes?.numero_commande}</td>
                        <td className="text-muted">
                          {bl.date_livraison
                            ? format(new Date(bl.date_livraison), 'dd/MM/yyyy')
                            : <span className="badge badge-yellow">En attente</span>}
                        </td>
                        <td><StatutBadge statut={bl.commandes?.statut || 'en_attente'} /></td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => openPrintBL(bl)}>
                            ⬇ Télécharger
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        )}

        {/* FACTURES */}
        {section === 'factures' && (
          data.factures.length === 0
            ? <div className="empty-state"><h3>Aucune facture</h3><p>Les factures apparaissent après livraison.</p></div>
            : <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>N° Facture</th>
                      <th>N° BL</th>
                      <th>Date</th>
                      <th>Montant TTC</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.factures.map(f => (
                      <tr key={f.id}>
                        <td>
                          <span className="font-display" style={{ fontWeight: 700, color: '#dc2626' }}>
                            {f.numero_facture}
                          </span>
                        </td>
                        <td className="text-muted">{f.bons_livraison?.numero_bl || '—'}</td>
                        <td className="text-muted">{format(new Date(f.date_facture), 'dd/MM/yyyy', { locale: fr })}</td>
                        <td style={{ fontWeight: 700 }}>{Number(f.montant_total).toFixed(2)} DH</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => openPrintFacture(f)}>
                            ⬇ Télécharger
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        )}
      </div>

      {printDoc?.type === 'bc'      && <PrintBC      {...printDoc} onClose={() => setPrintDoc(null)} />}
      {printDoc?.type === 'bl'      && <PrintBL      {...printDoc} onClose={() => setPrintDoc(null)} />}
      {printDoc?.type === 'facture' && <PrintFacture {...printDoc} onClose={() => setPrintDoc(null)} />}
    </div>
  )
}
