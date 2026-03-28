import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { X, Printer, Plus } from 'lucide-react'
import { PrintBL, PrintFacture, PrintBC } from '../../components/shared/PrintDocs.jsx'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

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

export default function ClientCommandes() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [printDoc, setPrintDoc]   = useState(null)

  useEffect(() => { if (profile?.id) load() }, [profile])

  async function load() {
    const { data } = await supabase
      .from('commandes').select('*')
      .eq('client_id', profile.id)
      .order('created_at', { ascending: false })
    setCommandes(data || [])
    setLoading(false)
  }

  async function openDetail(cmd) {
    const [lignesRes, blRes, cmdRes] = await Promise.all([
      supabase.from('lignes_commande').select('*, produits(nom)').eq('commande_id', cmd.id),
      supabase.from('bons_livraison').select('*').eq('commande_id', cmd.id).maybeSingle(),
      supabase.from('commandes').select('*, profiles(*)').eq('id', cmd.id).single(),
    ])
    let facture = null
    if (blRes.data) {
      const { data: f } = await supabase.from('factures').select('*').eq('bl_id', blRes.data.id).maybeSingle()
      facture = f
    }
    let livreur = null
    const livreurId = cmdRes.data?.livreur_id
    if (livreurId) {
      const { data: liv } = await supabase.from('livreurs').select('*').eq('id', livreurId).maybeSingle()
      livreur = liv
    }
    setSelected({ cmd: cmdRes.data || cmd, lignes: lignesRes.data || [], bl: blRes.data, facture, livreur })
  }

  async function annulerCommande(cmd) {
    if (!confirm(`Annuler la commande ${cmd.numero_commande} ?`)) return
    if (cmd.statut !== 'en_attente') { toast.error('Vous ne pouvez annuler que les commandes en attente.'); return }
    const { error } = await supabase.from('commandes').update({ statut: 'annulee' }).eq('id', cmd.id)
    if (error) { toast.error(error.message); return }
    toast.success('Commande annulée')
    load()
    if (selected?.cmd?.id === cmd.id) setSelected(null)
  }

  async function openPrintBL(bl, cmd, lignes) {
    let livreur = null
    const { data: cmdData } = await supabase.from('commandes').select('livreur_id').eq('id', cmd.id).maybeSingle()
    const livreurId = cmdData?.livreur_id || selected?.livreur?.id
    if (livreurId) {
      const { data: liv } = await supabase.from('livreurs').select('*').eq('id', livreurId).maybeSingle()
      livreur = liv
    }
    setPrintDoc({ type: 'bl', bl, commande: cmd, lignes, client: profile, livreur })
  }

  async function openPrintBC(cmd, lignes) {
    let finalLignes = lignes || []
    if (!finalLignes.length) {
      const { data } = await supabase.from('lignes_commande').select('*, produits(nom)').eq('commande_id', cmd.id)
      finalLignes = data || []
    }
    setPrintDoc({ type: 'bc', commande: cmd, lignes: finalLignes, client: profile })
  }

  async function openPrintFacture(facture, bl, cmd, lignes) {
    setPrintDoc({ type: 'facture', facture, bl, commande: cmd, lignes, client: profile })
  }

  const steps = [
    { key: 'en_attente', label: 'Commande enregistrée', icon: '📝' },
    { key: 'validee',    label: 'Confirmée',             icon: '✅' },
    { key: 'livree',     label: 'Livrée',                icon: '🚚' },
  ]

  function getStepState(cmd, stepKey) {
    const order = ['en_attente', 'validee', 'livree']
    const cmdIdx = order.indexOf(cmd.statut)
    const stepIdx = order.indexOf(stepKey)
    if (cmd.statut === 'annulee') return 'pending'
    if (stepIdx < cmdIdx) return 'done'
    if (stepIdx === cmdIdx) return 'active'
    return 'pending'
  }

  return (
    <div>
      <div className="flex items-center justify-between page-header">
        <div>
          <h2>Mes commandes</h2>
          <p>Suivez vos commandes en temps réel.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/client/nouvelle-commande')}>
          <Plus size={15} /> Nouvelle commande
        </button>
      </div>

      <div className={selected ? 'commandes-grid-split' : 'commandes-grid-full'}>

        {/* LISTE — cartes au lieu de tableau */}
        <div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : commandes.length === 0 ? (
            <div className="card"><div className="empty-state"><h3>Aucune commande</h3></div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {commandes.map(cmd => (
                <div key={cmd.id} onClick={() => openDetail(cmd)} style={{
                  padding: '16px',
                  background: 'var(--bg-card)',
                  borderRadius: 12,
                  border: `1px solid ${selected?.cmd?.id === cmd.id ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span className="font-display" style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>
                      {cmd.numero_commande}
                    </span>
                    <StatutBadge statut={cmd.statut} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      {format(new Date(cmd.created_at), 'dd MMM yyyy', { locale: fr })}
                    </span>
                    <span className="badge badge-gray" style={{ fontSize: 11 }}>
                      {cmd.mode_reglement === 'cheque' ? '📋 Chèque' : '💵 Espèces'}
                    </span>
                  </div>
                  {cmd.statut === 'en_attente' && (
                    <div className="flex gap-2" style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/client/nouvelle-commande', { state: { editCmd: cmd } })}>
                        Modifier
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => annulerCommande(cmd)}>
                        <X size={13} /> Annuler
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PANNEAU DÉTAIL */}
        {selected && (
          <div className="card" style={{ position: 'sticky', top: 20, alignSelf: 'start' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>{selected.cmd.numero_commande}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelected(null)}><X size={15} /></button>
            </div>

            {selected.cmd.statut === 'annulee' && (
              <div style={{ padding: '8px 12px', background: 'var(--danger-dim)', borderRadius: 8, marginBottom: 12, fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>
                ✕ Commande annulée
              </div>
            )}

            {selected.cmd.statut !== 'annulee' && (
              <div className="timeline mb-4">
                {steps.map(step => {
                  const state = getStepState(selected.cmd, step.key)
                  return (
                    <div key={step.key} className="timeline-item">
                      <div className={`timeline-dot ${state}`}>{step.icon}</div>
                      <div style={{ paddingTop: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{step.label}</div>
                        {step.key === 'en_attente' && (
                          <div className="text-muted text-sm">{format(new Date(selected.cmd.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8 }}>Produits</div>
            {selected.lignes.map((l, i) => (
              <div key={i} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{l.produits?.nom}</div>
                  <div className="text-muted text-sm">{Number(l.prix_unitaire).toFixed(2)} DH × {l.quantite}</div>
                </div>
                <div style={{ fontWeight: 700 }}>{(l.quantite * l.prix_unitaire).toFixed(2)} DH</div>
              </div>
            ))}
            <div className="flex justify-between" style={{ padding: '12px 0 8px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>
              <span>Total</span>
              <span className="text-accent">{selected.lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0).toFixed(2)} DH</span>
            </div>

            <div style={{ padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
              Règlement : <strong>{selected.cmd.mode_reglement === 'cheque' ? 'Chèque' : 'Espèces'}</strong>
            </div>

            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8 }}>Documents</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="flex items-center justify-between" style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>📋 Bon de commande</div>
                  <div className="text-muted text-sm">{selected.cmd.numero_commande}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => openPrintBC(selected.cmd, selected.lignes)}>
                  <Printer size={13} /> Imprimer
                </button>
              </div>

              {selected.bl ? (
                <div className="flex items-center justify-between" style={{ padding: '8px 12px', background: 'var(--info-dim)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--info)', fontSize: 13 }}>📄 {selected.bl.numero_bl}</div>
                    <div className="text-muted text-sm">Bon de livraison</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => openPrintBL(selected.bl, selected.cmd, selected.lignes)}>
                    <Printer size={13} /> Imprimer
                  </button>
                </div>
              ) : selected.cmd.statut !== 'annulee' && (
                <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                  BL disponible après confirmation
                </div>
              )}

              {selected.facture && selected.cmd.statut_paiement === 'paye' ? (
                <div className="flex items-center justify-between" style={{ padding: '8px 12px', background: 'var(--success-dim)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: 13 }}>🧾 {selected.facture.numero_facture}</div>
                    <div className="text-muted text-sm">{Number(selected.facture.montant_total).toFixed(2)} DH</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => openPrintFacture(selected.facture, selected.bl, selected.cmd, selected.lignes)}>
                    <Printer size={13} /> Imprimer
                  </button>
                </div>
              ) : selected.cmd.statut !== 'annulee' && (
                <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                  Facture disponible après confirmation du paiement
                </div>
              )}

              {selected.cmd.statut === 'en_attente' && (
                <button className="btn btn-danger btn-sm" style={{ justifyContent: 'center' }}
                  onClick={() => annulerCommande(selected.cmd)}>
                  <X size={13} /> Annuler cette commande
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {printDoc?.type === 'bl'      && <PrintBL      {...printDoc} onClose={() => setPrintDoc(null)} />}
      {printDoc?.type === 'bc'      && <PrintBC      {...printDoc} onClose={() => setPrintDoc(null)} />}
      {printDoc?.type === 'facture' && <PrintFacture {...printDoc} onClose={() => setPrintDoc(null)} />}
    </div>
  )
}
