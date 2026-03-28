import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CheckCircle, Truck, X, Printer, CreditCard, ChevronDown } from 'lucide-react'
import { PrintBL, PrintBC, PrintFacture } from '../../components/shared/PrintDocs.jsx'
import { emailConfirmationCommande, emailBLDisponible, emailLivraisonEffectuee, emailFactureDisponible } from '../../lib/email.js'

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

async function envoyerNotif(userId, titre, message, type = 'info') {
  if (!userId) return
  await supabase.from('notifications').insert({ user_id: userId, titre, message, type })
}

export default function AdminCommandes() {
  const [commandes, setCommandes]       = useState([])
  const [livreurs, setLivreurs]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [filterStatut, setFilterStatut] = useState('all')
  const [selected, setSelected]         = useState(null)
  const [printBL, setPrintBL]           = useState(null)
  const [printBC, setPrintBC]           = useState(null)
  const [printFact, setPrintFact]       = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    load()
    loadLivreurs()
    const ch = supabase.channel('admin-commandes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commandes' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function load() {
    const { data } = await supabase
      .from('commandes')
      .select('*, profiles(id, nom, numero_client, telephone, adresse, condition_paiement, condition_paiement_autre, ice), livreurs(id, nom, prenom, immatriculation)')
      .order('created_at', { ascending: false })
    setCommandes(data || [])
    setLoading(false)
  }

  async function loadLivreurs() {
    const { data } = await supabase.from('livreurs').select('*').eq('actif', true).order('nom')
    setLivreurs(data || [])
  }

  async function openDetail(cmd) {
    const [lignesRes, blRes] = await Promise.all([
      supabase.from('lignes_commande').select('*, produits(nom)').eq('commande_id', cmd.id),
      supabase.from('bons_livraison').select('*').eq('commande_id', cmd.id).maybeSingle(),
    ])
    let facture = null
    if (blRes.data) {
      const { data: f } = await supabase.from('factures').select('*').eq('bl_id', blRes.data.id).maybeSingle()
      facture = f
    }
    setSelected({ cmd, lignes: lignesRes.data || [], bl: blRes.data, facture })
  }

  async function assignerLivreur(cmdId, livreurId) {
    await supabase.from('commandes').update({ livreur_id: livreurId || null }).eq('id', cmdId)
    toast.success('Livreur assigné')
    await load()
    if (selected?.cmd?.id === cmdId) {
      const { data: updatedCmd } = await supabase
        .from('commandes')
        .select('*, profiles(id, nom, numero_client, telephone, adresse, condition_paiement, condition_paiement_autre, ice), livreurs(id, nom, prenom, immatriculation)')
        .eq('id', cmdId).single()
      setSelected(s => ({ ...s, cmd: updatedCmd }))
    }
  }

  async function validerCommande(cmd) {
    setActionLoading(true)
    try {
      await supabase.from('commandes').update({ statut: 'validee', updated_at: new Date().toISOString() }).eq('id', cmd.id)
      await supabase.from('bons_livraison').insert({ commande_id: cmd.id })
      await envoyerNotif(
        cmd.profiles?.id || cmd.client_id,
        `Commande ${cmd.numero_commande} confirmée`,
        'Votre commande a été confirmée. Votre bon de livraison est disponible.',
        'success'
      )
      toast.success(`Commande ${cmd.numero_commande} confirmée — BL généré !`)
      // Email confirmation + BL
      try {
        const { data: lignes } = await supabase.from('lignes_commande').select('quantite, prix_unitaire, produits(nom)').eq('commande_id', cmd.id)
        const total = (lignes || []).reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
        const { data: bl } = await supabase.from('bons_livraison').select('numero_bl').eq('commande_id', cmd.id).single()
        const clientEmail = cmd.profiles?.email
        const clientNom = cmd.profiles?.nom
        if (clientEmail) {
          await emailBLDisponible(clientEmail, clientNom, cmd.numero_commande, bl?.numero_bl)
        }
      } catch(e) { console.error('Email error:', e) }
      await load()
      if (selected?.cmd?.id === cmd.id) await openDetail({ ...cmd, statut: 'validee' })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function declarerLivraison(cmd, bl) {
    setActionLoading(true)
    try {
      await supabase.from('commandes').update({
        statut: 'livree',
        statut_paiement: 'non_paye',
        updated_at: new Date().toISOString()
      }).eq('id', cmd.id)
      await supabase.from('bons_livraison').update({ date_livraison: new Date().toISOString() }).eq('id', bl.id)
      await envoyerNotif(
        cmd.profiles?.id || cmd.client_id,
        'Livraison effectuée',
        `Votre commande ${cmd.numero_commande} a été livrée.`,
        'success'
      )
      toast.success('Livraison déclarée !')
      try {
        const clientEmail = cmd.profiles?.email
        const clientNom = cmd.profiles?.nom
        if (clientEmail) await emailLivraisonEffectuee(clientEmail, clientNom, cmd.numero_commande)
      } catch(e) { console.error('Email error:', e) }
      await load()
      if (selected?.cmd?.id === cmd.id) await openDetail({ ...cmd, statut: 'livree' })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function marquerPaye(cmd) {
    setActionLoading(true)
    try {
      await supabase.from('commandes').update({ statut_paiement: 'paye', updated_at: new Date().toISOString() }).eq('id', cmd.id)

      // Générer la facture au moment du paiement
      const { data: bl } = await supabase.from('bons_livraison').select('*').eq('commande_id', cmd.id).maybeSingle()
      if (bl) {
        const { data: existingFacture } = await supabase.from('factures').select('id').eq('commande_id', cmd.id).maybeSingle()
        if (!existingFacture) {
          const { data: lignes } = await supabase.from('lignes_commande').select('quantite, prix_unitaire').eq('commande_id', cmd.id)
          const total = (lignes || []).reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
          await supabase.from('factures').insert({ commande_id: cmd.id, bl_id: bl.id, montant_total: total })
        }
      }

      await envoyerNotif(
        cmd.profiles?.id || cmd.client_id,
        'Paiement enregistré',
        `Le paiement de votre commande ${cmd.numero_commande} a été enregistré. Votre facture est disponible.`,
        'success'
      )

      toast.success('Paiement enregistré — Facture générée !')
      try {
        const { data: facture } = await supabase.from('factures').select('numero_facture, montant_total').eq('commande_id', cmd.id).single()
        const clientEmail = cmd.profiles?.email
        const clientNom = cmd.profiles?.nom
        if (clientEmail && facture) {
          await emailFactureDisponible(clientEmail, clientNom, cmd.numero_commande, facture.numero_facture, facture.montant_total)
        }
      } catch(e) { console.error('Email error:', e) }
      await load()
      if (selected?.cmd?.id === cmd.id) await openDetail({ ...cmd, statut_paiement: 'paye' })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function annulerCommande(cmd) {
    if (!['en_attente', 'validee'].includes(cmd.statut)) {
      toast.error("Impossible d'annuler une commande déjà livrée.")
      return
    }
    if (!confirm(`Annuler la commande ${cmd.numero_commande} ?`)) return
    // Supprimer le BL si existant
    await supabase.from('bons_livraison').delete().eq('commande_id', cmd.id)
    await supabase.from('commandes').update({ statut: 'annulee' }).eq('id', cmd.id)
    await envoyerNotif(cmd.profiles?.id || cmd.client_id, `Commande ${cmd.numero_commande} annulée`, 'Votre commande a été annulée.', 'warning')
    toast.success('Commande annulée')
    load()
    if (selected?.cmd?.id === cmd.id) setSelected(null)
  }

  async function showPrintBL(bl, cmd, lignes) {
    const { data: client } = await supabase.from('profiles').select('*').eq('id', cmd.profiles?.id || cmd.client_id).single()
    // Récupérer le livreur_id depuis la commande en base
    const { data: cmdData } = await supabase.from('commandes').select('livreur_id').eq('id', cmd.id).maybeSingle()
    const livreurId = cmdData?.livreur_id || cmd.livreur_id
    let livreur = null
    if (livreurId) {
      const { data: liv } = await supabase.from('livreurs').select('*').eq('id', livreurId).maybeSingle()
      livreur = liv
    }
    // Recharger lignes si vides
    let finalLignes = lignes
    if (!finalLignes || finalLignes.length === 0) {
      const { data: dbLignes } = await supabase.from('lignes_commande').select('*, produits(nom)').eq('commande_id', cmd.id)
      finalLignes = dbLignes || []
    }
    setPrintBL({ bl, commande: cmd, lignes: finalLignes, client: client || cmd.profiles, livreur })
  }

  async function showPrintBC(cmd, lignes) {
    const { data: client } = await supabase.from('profiles').select('*').eq('id', cmd.profiles?.id || cmd.client_id).single()
    // Si lignes pas chargées, les récupérer depuis la DB
    let finalLignes = lignes
    if (!finalLignes || finalLignes.length === 0) {
      const { data: dbLignes } = await supabase.from('lignes_commande').select('*, produits(nom)').eq('commande_id', cmd.id)
      finalLignes = dbLignes || []
    }
    setPrintBC({ commande: cmd, lignes: finalLignes, client: client || cmd.profiles })
  }

  async function showPrintFacture(facture, bl, cmd, lignes) {
    const { data: client } = await supabase.from('profiles').select('*').eq('id', cmd.profiles?.id || cmd.client_id).single()
    setPrintFact({ facture, bl, commande: cmd, lignes, client: client || cmd.profiles })
  }

  const filtered = filterStatut === 'all' ? commandes : commandes.filter(c => c.statut === filterStatut)
  const counts = {
    en_attente: commandes.filter(c => c.statut === 'en_attente').length,
    validee:    commandes.filter(c => c.statut === 'validee').length,
    livree:     commandes.filter(c => c.statut === 'livree').length,
  }

  return (
    <div>
      <div className="page-header">
        <h2>Commandes</h2>
        <p>Gérez les commandes, confirmez et déclarez les livraisons.</p>
      </div>

      <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
        {[
          ['all', 'Toutes', commandes.length],
          ['en_attente', '⏳ En attente', counts.en_attente],
          ['validee', '✓ Confirmées', counts.validee],
          ['livree', '✓ Livrées', counts.livree],
          ['annulee', '✕ Annulées', 0],
        ].map(([val, label, count]) => (
          <button key={val} onClick={() => setFilterStatut(val)}
            className={`btn btn-sm ${filterStatut === val ? 'btn-primary' : 'btn-ghost'}`}>
            {label}{count > 0 && ` (${count})`}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 400px' : '1fr', gap: 20 }}>
        {/* Liste */}
        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><p>Aucune commande dans cette catégorie.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>N° Commande</th><th>Client</th><th>Date</th>
                    <th>Livreur</th><th>Statut</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(cmd => (
                    <tr key={cmd.id} onClick={() => openDetail(cmd)} style={{ cursor: 'pointer' }}>
                      <td><span className="font-display" style={{ fontWeight: 700, color: 'var(--accent)' }}>{cmd.numero_commande}</span></td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{cmd.profiles?.nom}</div>
                        <div className="text-muted text-sm">{cmd.profiles?.numero_client}</div>
                      </td>
                      <td className="text-muted">{format(new Date(cmd.created_at), 'dd MMM yy', { locale: fr })}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <select
                          className="form-select"
                          style={{ fontSize: 12, padding: '4px 8px', minWidth: 130 }}
                          value={cmd.livreur_id || ''}
                          onChange={e => assignerLivreur(cmd.id, e.target.value)}
                        >
                          <option value="">— Aucun —</option>
                          {livreurs.map(l => (
                            <option key={l.id} value={l.id}>{l.prenom} {l.nom} · {l.immatriculation}</option>
                          ))}
                        </select>
                      </td>
                      <td><StatutBadge statut={cmd.statut} /></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2">
                          {cmd.statut === 'en_attente' && (
                            <button className="btn btn-success btn-sm" disabled={actionLoading} onClick={() => validerCommande(cmd)}>
                              <CheckCircle size={13} /> Confirmer
                            </button>
                          )}
                          {cmd.statut === 'validee' && (
                            <button className="btn btn-primary btn-sm" disabled={actionLoading}
                              onClick={async () => {
                                const { data: bl } = await supabase.from('bons_livraison').select('*').eq('commande_id', cmd.id).single()
                                declarerLivraison(cmd, bl)
                              }}>
                              <Truck size={13} /> Livré
                            </button>
                          )}
                          {cmd.statut === 'livree' && cmd.statut_paiement === 'non_paye' && (
                            <button className="btn btn-sm" style={{ background: 'var(--warning-dim)', color: 'var(--warning)' }}
                              onClick={() => marquerPaye(cmd)}>
                              <CreditCard size={13} /> Payé
                            </button>
                          )}
                          {['en_attente', 'validee'].includes(cmd.statut) && (
                            <button className="btn btn-danger btn-sm" onClick={() => annulerCommande(cmd)}><X size={13} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panneau détail */}
        {selected && (
          <div className="card" style={{ position: 'sticky', top: 20, alignSelf: 'start' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>{selected.cmd.numero_commande}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelected(null)}><X size={15} /></button>
            </div>

            {/* Client */}
            <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontWeight: 600 }}>{selected.cmd.profiles?.nom}</div>
              <div className="text-muted text-sm">{selected.cmd.profiles?.numero_client}</div>
              {selected.cmd.profiles?.telephone && <div className="text-muted text-sm">📞 {selected.cmd.profiles.telephone}</div>}
              {selected.cmd.condition_paiement && (
                <div style={{ marginTop: 6 }}>
                  <span className="badge badge-blue" style={{ fontSize: 11 }}>
                    {selected.cmd.condition_paiement === 'autre' ? selected.cmd.profiles?.condition_paiement_autre :
                     selected.cmd.condition_paiement === 'immediat' ? 'Règlement immédiat' :
                     selected.cmd.condition_paiement === 'quinzaine' ? 'Quinzaine' :
                     selected.cmd.condition_paiement === 'mensuel' ? 'Mensuel' :
                     selected.cmd.condition_paiement === 'trimestre' ? 'Trimestriel' : selected.cmd.condition_paiement}
                  </span>
                </div>
              )}
            </div>

            {/* Livreur assigné */}
            <div style={{ marginBottom: 12 }}>
              <div className="form-label" style={{ marginBottom: 6 }}>Livreur assigné</div>
              <select className="form-select" style={{ fontSize: 13 }}
                value={selected.cmd.livreur_id || ''}
                onChange={e => assignerLivreur(selected.cmd.id, e.target.value)}>
                <option value="">— Aucun livreur —</option>
                {livreurs.map(l => (
                  <option key={l.id} value={l.id}>{l.prenom} {l.nom} · {l.immatriculation}</option>
                ))}
              </select>
            </div>

            {/* Mode règlement + Notes */}
            {selected.cmd.mode_reglement && (
              <div style={{ padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 13, marginBottom: 8 }}>
                Règlement : <strong>{selected.cmd.mode_reglement === 'cheque' ? 'Chèque' : 'Espèces'}</strong>
              </div>
            )}
            {selected.cmd.notes && (
              <div style={{ padding: '8px 12px', background: 'var(--warning-dim)', borderRadius: 8, fontSize: 13, marginBottom: 12, color: 'var(--warning)', borderLeft: '3px solid var(--warning)' }}>
                <div style={{ fontWeight: 600, marginBottom: 3, fontSize: 11, textTransform: 'uppercase' }}>Instructions de livraison</div>
                {selected.cmd.notes}
              </div>
            )}

            {/* Produits */}
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
            <div className="flex justify-between" style={{ padding: '12px 0 16px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>
              <span>Total</span>
              <span className="text-accent">{selected.lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0).toFixed(2)} DH</span>
            </div>

            {/* Documents */}
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8 }}>Documents</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Bon de commande — toujours disponible */}
              <div className="flex items-center justify-between" style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>📋 Bon de commande</div>
                  <div className="text-muted text-sm">{selected.cmd.numero_commande}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => showPrintBC(selected.cmd, selected.lignes)}>
                  <Printer size={13} /> Imprimer
                </button>
              </div>

              {/* BL */}
              {selected.bl ? (
                <div className="flex items-center justify-between" style={{ padding: '8px 12px', background: 'var(--info-dim)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--info)', fontSize: 13 }}>📄 {selected.bl.numero_bl}</div>
                    <div className="text-muted text-sm">Bon de livraison</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => showPrintBL(selected.bl, selected.cmd, selected.lignes)}>
                    <Printer size={13} /> Imprimer
                  </button>
                </div>
              ) : (
                <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                  BL généré après confirmation
                </div>
              )}

              {/* Facture */}
              {selected.facture ? (
                <div className="flex items-center justify-between" style={{ padding: '8px 12px', background: 'var(--success-dim)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: 13 }}>🧾 {selected.facture.numero_facture}</div>
                    <div className="text-muted text-sm">{selected.facture.montant_total} DH</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => showPrintFacture(selected.facture, selected.bl, selected.cmd, selected.lignes)}>
                    <Printer size={13} /> Imprimer
                  </button>
                </div>
              ) : (
                <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                  {selected.cmd.statut === 'livree' ? 'Facture en cours de génération...' : 'Facture générée après livraison'}
                </div>
              )}

              {/* Marquer payé */}
              {selected.cmd.statut === 'livree' && selected.cmd.statut_paiement === 'non_paye' && (
                <button className="btn btn-sm" style={{ background: 'var(--warning-dim)', color: 'var(--warning)', justifyContent: 'center' }}
                  onClick={() => marquerPaye(selected.cmd)}>
                  <CreditCard size={13} /> Marquer comme payé
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {printBL   && <PrintBL   {...printBL}   onClose={() => setPrintBL(null)} />}
      {printBC   && <PrintBC   {...printBC}   onClose={() => setPrintBC(null)} />}
      {printFact && <PrintFacture {...printFact} onClose={() => setPrintFact(null)} />}
    </div>
  )
}
