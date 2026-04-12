import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Printer, Search, Settings, Check, X } from 'lucide-react'
import { PrintBL, PrintFacture } from '../../components/shared/PrintDocs.jsx'

export default function AdminFactures() {
  const [tab, setTab]           = useState('factures')
  const [mentionModal, setMentionModal] = useState(null) // {facture, bl, commande, lignes}
  const [mention, setMention]   = useState(null) // ORIGINAL or DUPLICATA after choice
  const [clients, setClients]   = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientSearch, setClientSearch]     = useState('')
  const [commandes, setCommandes] = useState([])
  const [bls, setBls]             = useState([])
  const [factures, setFactures]   = useState([])
  const [blsNonPayes, setBlsNonPayes] = useState([])
  const [selectedBls, setSelectedBls] = useState([])
  const [loading, setLoading]   = useState(false)
  const [tva, setTva]           = useState(10)
  const [showTvaModal, setShowTvaModal] = useState(false)
  const [printBL, setPrintBL]   = useState(null)
  const [printFact, setPrintFact] = useState(null)

  useEffect(() => { loadClients() }, [])
  useEffect(() => { if (selectedClient) loadClientData(selectedClient.id) }, [selectedClient, tab])

  async function loadClients() {
    const { data } = await supabase.from('profiles').select('id, nom, numero_client, telephone, adresse, email, ice, condition_paiement, condition_paiement_autre')
      .eq('role', 'client').order('nom')
    setClients(data || [])
  }

  async function loadClientData(clientId) {
    setLoading(true)
    setBls([]); setFactures([]); setCommandes([]); setBlsNonPayes([])
    setSelectedBls([])

    if (tab === 'factures') {
      const { data } = await supabase.from('factures')
        .select('*, bons_livraison(numero_bl), commandes(numero_commande, mode_paiement, client_id, condition_paiement)')
        .order('date_facture', { ascending: false })
      setFactures((data || []).filter(f => f.commandes?.client_id === clientId))
    } else if (tab === 'bls') {
      const { data } = await supabase.from('bons_livraison')
        .select('*, commandes(numero_commande, statut, mode_paiement, client_id, statut_paiement, condition_paiement)')
        .order('date_creation', { ascending: false })
      const filtered = (data || []).filter(b => b.commandes?.client_id === clientId)
      setBls(filtered)
      // BL non payés = livrés mais pas encore facturés ou non payés
      const nonPayes = filtered.filter(b =>
        b.commandes?.statut === 'livree' && b.commandes?.statut_paiement === 'non_paye'
      )
      setBlsNonPayes(nonPayes)
    } else {
      const { data } = await supabase.from('commandes')
        .select('*, lignes_commande(*, produits(nom))')
        .eq('client_id', clientId).order('created_at', { ascending: false })
      setCommandes(data || [])
    }
    setLoading(false)
  }

  async function openPrintBL(bl) {
    const { data: lignes } = await supabase.from('lignes_commande').select('*, produits(nom)').eq('commande_id', bl.commande_id)
    // Récupérer le livreur_id directement depuis la commande
    const { data: cmdData } = await supabase.from('commandes').select('livreur_id').eq('id', bl.commande_id).maybeSingle()
    let livreur = null
    const livreurId = cmdData?.livreur_id
    if (livreurId) {
      const { data: liv } = await supabase.from('livreurs').select('*').eq('id', livreurId).maybeSingle()
      livreur = liv
    }
    setPrintBL({ bl, commande: bl.commandes, lignes: lignes || [], client: selectedClient, livreur })
  }

  async function openPrintFacture(f) {
    const { data: lignes } = await supabase.from('lignes_commande').select('*, produits(nom)').eq('commande_id', f.commande_id)
    const { data: bl } = await supabase.from('bons_livraison').select('*').eq('id', f.bl_id).maybeSingle()
    // Vérifier si original déjà donné
    const { data: factData } = await supabase.from('factures').select('original_remis, original_remis_date').eq('id', f.id).maybeSingle()
    setMentionModal({ facture: { ...f, ...factData }, bl, commande: f.commandes, lignes: lignes || [] })
  }

  async function confirmerMention(isDuplicata) {
    const { facture, bl, commande, lignes } = mentionModal
    // Si original, marquer comme remis
    if (!isDuplicata) {
      await supabase.from('factures').update({
        original_remis: true,
        original_remis_date: new Date().toISOString()
      }).eq('id', facture.id)
    }
    setPrintFact({ facture, bl, commande, lignes, client: selectedClient, tva, isDuplicata })
    setMentionModal(null)
  }

  // Générer une facture groupée pour plusieurs BL
  async function genererFactureGroupee() {
    if (selectedBls.length === 0) { toast.error('Sélectionnez au moins un BL'); return }
    try {
      // Récupérer toutes les lignes de toutes les commandes sélectionnées
      const allLignes = []
      let totalMontant = 0
      const blIds = []

      for (const bl of selectedBls) {
        const { data: lignes } = await supabase.from('lignes_commande')
          .select('quantite, prix_unitaire').eq('commande_id', bl.commande_id)
        const total = (lignes || []).reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
        totalMontant += total
        blIds.push(bl.id)
      }

      // Créer une facture liée au premier BL (on stocke tous les BL dans les notes)
      const premierBL = selectedBls[0]
      const { data: facture, error } = await supabase.from('factures').insert({
        commande_id: premierBL.commande_id,
        bl_id: premierBL.id,
        montant_total: totalMontant,
      }).select().single()
      if (error) throw error

      // Marquer toutes les commandes comme payées
      for (const bl of selectedBls) {
        await supabase.from('commandes').update({ statut_paiement: 'paye' }).eq('id', bl.commande_id)
      }

      toast.success(`Facture groupée générée pour ${selectedBls.length} BL`)
      setSelectedBls([])
      loadClientData(selectedClient.id)

      // Ouvrir la facture pour impression
      const allLignesComplet = []
      for (const bl of selectedBls) {
        const { data: lignes } = await supabase.from('lignes_commande').select('*, produits(nom)').eq('commande_id', bl.commande_id)
        allLignesComplet.push(...(lignes || []))
      }
      setPrintFact({ facture, bl: premierBL, commande: premierBL.commandes, lignes: allLignesComplet, client: selectedClient, tva })
    } catch (err) {
      toast.error(err.message)
    }
  }

  function toggleSelectBl(bl) {
    setSelectedBls(prev =>
      prev.find(b => b.id === bl.id)
        ? prev.filter(b => b.id !== bl.id)
        : [...prev, bl]
    )
  }

  const filteredClients = clients.filter(c =>
    c.nom.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.numero_client?.toLowerCase().includes(clientSearch.toLowerCase())
  )

  async function toggleOriginalRemis(factureId, currentValue) {
    await supabase.from('factures').update({
      original_remis: !currentValue,
      original_remis_date: !currentValue ? new Date().toISOString() : null
    }).eq('id', factureId)
    if (selectedClient) loadClientData(selectedClient.id)
  }

  return (
    <div>
      <div className="flex items-center justify-between page-header">
        <div>
          <h2>Factures & BL</h2>
          <p>Consultez et imprimez les documents par client.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowTvaModal(true)}>
          <Settings size={15} /> TVA : {tva}%
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:20, alignItems:'start' }}>
        {/* Liste clients */}
        <div className="card" style={{ padding:0 }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <input className="form-input" style={{ paddingLeft:28, fontSize:13 }}
                placeholder="Rechercher..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ maxHeight:500, overflowY:'auto' }}>
            {filteredClients.map(c => (
              <div key={c.id} onClick={() => setSelectedClient(c)} style={{
                padding:'12px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)',
                background: selectedClient?.id === c.id ? 'var(--accent-dim)' : 'transparent',
                borderLeft: selectedClient?.id === c.id ? '3px solid var(--accent)' : '3px solid transparent',
              }}>
                <div style={{ fontWeight:600, fontSize:13, color: selectedClient?.id === c.id ? 'var(--accent)' : 'var(--text)' }}>{c.nom}</div>
                <div className="text-muted text-sm">{c.numero_client}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contenu */}
        <div>
          {!selectedClient ? (
            <div className="card"><div className="empty-state"><h3>Sélectionnez un client</h3></div></div>
          ) : (
            <>
              <div className="flex gap-2 mb-4">
                {[['factures','Factures'], ['bls','Bons de Livraison'], ['commandes','Commandes']].map(([val, label]) => (
                  <button key={val} onClick={() => setTab(val)} className={`btn btn-sm ${tab === val ? 'btn-primary' : 'btn-ghost'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Facture groupée */}
              {tab === 'bls' && blsNonPayes.length > 0 && (
                <div style={{ padding:14, background:'var(--warning-dim)', border:'1px solid var(--warning)', borderRadius:10, marginBottom:16 }}>
                  <div style={{ fontSize:13, color:'var(--warning)', fontWeight:600, marginBottom:8 }}>
                    {blsNonPayes.length} BL non payé(s) — vous pouvez générer une facture groupée
                  </div>
                  <div className="flex gap-2 flex-wrap" style={{ marginBottom:8 }}>
                    {blsNonPayes.map(bl => (
                      <label key={bl.id} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13, color:'var(--text)' }}>
                        <input type="checkbox" checked={!!selectedBls.find(b => b.id === bl.id)} onChange={() => toggleSelectBl(bl)} />
                        {bl.numero_bl}
                      </label>
                    ))}
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={genererFactureGroupee} disabled={selectedBls.length === 0}>
                    <Check size={13} /> Générer facture groupée ({selectedBls.length} BL)
                  </button>
                </div>
              )}

              <div className="card" style={{ padding:0 }}>
                {loading ? (
                  <div style={{ padding:40, textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
                ) : tab === 'factures' ? (
                  factures.length === 0
                    ? <div className="empty-state"><h3>Aucune facture</h3></div>
                    : <div className="table-wrap"><table>
                        <thead><tr><th>N° Facture</th><th>N° BL</th><th>Date</th><th>Montant TTC</th><th>Action</th></tr></thead>
                        <tbody>
                          {factures.map(f => (
                            <tr key={f.id}>
                              <td><span className="font-display" style={{ fontWeight:700, color:'var(--success)' }}>{f.numero_facture}</span></td>
                              <td><span className="badge badge-blue">{f.bons_livraison?.numero_bl}</span></td>
                              <td className="text-muted">{format(new Date(f.date_facture), 'dd MMM yyyy', { locale: fr })}</td>
                              <td style={{ fontWeight:700 }}>{Number(f.montant_total).toFixed(2)} DH</td>
                              <td>
                                <div className="flex gap-2 items-center">
                                  <button className="btn btn-ghost btn-sm" onClick={() => openPrintFacture(f)}>⬇ Télécharger</button>
                                  <button
                                    onClick={() => toggleOriginalRemis(f.id, f.original_remis)}
                                    style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: f.original_remis ? 'var(--success-dim)' : 'var(--bg-elevated)', color: f.original_remis ? 'var(--success)' : 'var(--text-muted)' }}
                                    title={f.original_remis ? 'Original remis — cliquer pour annuler' : 'Marquer original remis'}
                                  >
                                    {f.original_remis ? '✓ Original remis' : 'Original non remis'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table></div>
                ) : tab === 'bls' ? (
                  bls.length === 0
                    ? <div className="empty-state"><h3>Aucun BL</h3></div>
                    : <div className="table-wrap"><table>
                        <thead><tr><th>N° BL</th><th>Commande</th><th>Date</th><th>Statut paiement</th><th>Action</th></tr></thead>
                        <tbody>
                          {bls.map(bl => (
                            <tr key={bl.id}>
                              <td><span className="font-display" style={{ fontWeight:700, color:'var(--info)' }}>{bl.numero_bl}</span></td>
                              <td className="text-muted">{bl.commandes?.numero_commande}</td>
                              <td className="text-muted">{format(new Date(bl.date_creation), 'dd MMM yyyy', { locale: fr })}</td>
                              <td>
                                <span className={`badge ${bl.commandes?.statut_paiement === 'paye' ? 'badge-green' : 'badge-yellow'}`}>
                                  {bl.commandes?.statut_paiement === 'paye' ? '✓ Payé' : '⏳ Non payé'}
                                </span>
                              </td>
                              <td><button className="btn btn-ghost btn-sm" onClick={() => openPrintBL(bl)}>⬇ Télécharger</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table></div>
                ) : (
                  commandes.length === 0
                    ? <div className="empty-state"><h3>Aucune commande</h3></div>
                    : <div className="table-wrap"><table>
                        <thead><tr><th>N° Commande</th><th>Date</th><th>Total</th><th>Statut</th></tr></thead>
                        <tbody>
                          {commandes.map(cmd => {
                            const total = (cmd.lignes_commande || []).reduce((s,l) => s + l.quantite * l.prix_unitaire, 0)
                            return (
                              <tr key={cmd.id}>
                                <td><span className="font-display" style={{ fontWeight:700, color:'var(--accent)' }}>{cmd.numero_commande}</span></td>
                                <td className="text-muted">{format(new Date(cmd.created_at), 'dd MMM yyyy', { locale: fr })}</td>
                                <td style={{ fontWeight:700 }}>{total.toFixed(2)} DH</td>
                                <td><span className={`badge ${cmd.statut === 'livree' ? 'badge-green' : cmd.statut === 'validee' ? 'badge-blue' : 'badge-yellow'}`}>{cmd.statut}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table></div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal mention Original/Duplicata */}
      {mentionModal && (
        <div className="modal-overlay" onClick={() => setMentionModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Type de facture</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setMentionModal(null)}><X size={15} /></button>
            </div>
            <div className="modal-body">
              {mentionModal.facture?.original_remis && (
                <div style={{ padding: '10px 14px', background: 'var(--warning-dim)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--warning)', fontWeight: 600 }}>
                  ⚠ L'original a déjà été remis au client
                  {mentionModal.facture?.original_remis_date && (
                    <div style={{ fontWeight: 400, fontSize: 12, marginTop: 4 }}>
                      Le {new Date(mentionModal.facture.original_remis_date).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
              )}
              <p style={{ marginBottom: 20, color: 'var(--text-muted)', fontSize: 13 }}>
                Choisissez le type de document à télécharger :
              </p>
              <div className="flex gap-3">
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', padding: 16, height: 'auto' }}
                  onClick={() => confirmerMention(false)}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>ORIGINAL</div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>Première remise</div>
                </button>
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', padding: 16, height: 'auto' }}
                  onClick={() => confirmerMention(true)}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>DUPLICATA</div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>Copie supplémentaire</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal TVA */}
      {showTvaModal && (
        <div className="modal-overlay" onClick={() => setShowTvaModal(false)}>
          <div className="modal" style={{ maxWidth:320 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Taux de TVA</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowTvaModal(false)}><X size={15} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Taux TVA (%)</label>
                <input className="form-input" type="number" min="0" max="100" step="0.1" value={tva} onChange={e => setTva(Number(e.target.value))} />
              </div>
              <div style={{ padding:12, background:'var(--bg-elevated)', borderRadius:8, fontSize:13 }}>
                <div className="flex justify-between mb-2"><span>Exemple TTC :</span><span>1 000 DH</span></div>
                <div className="flex justify-between mb-2 text-muted"><span>Total HT :</span><span>{(1000/(1+tva/100)).toFixed(2)} DH</span></div>
                <div className="flex justify-between text-muted"><span>TVA {tva}% :</span><span>{(1000-1000/(1+tva/100)).toFixed(2)} DH</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowTvaModal(false)}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {printBL   && <PrintBL      {...printBL}   onClose={() => setPrintBL(null)} />}
      {printFact && <PrintFacture {...printFact} onClose={() => setPrintFact(null)} />}
    </div>
  )
}
