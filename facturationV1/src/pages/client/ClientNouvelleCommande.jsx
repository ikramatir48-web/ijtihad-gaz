import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ShoppingCart, ArrowRight, Check } from 'lucide-react'
import { emailConfirmationCommande } from '../../lib/email.js'

const ICONS = { 3: '🟡', 6: '🔵', 12: '🟠' }

export default function ClientNouvelleCommande() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [produits, setProduits]       = useState([])
  const [panier, setPanier]           = useState({})
  const [notes, setNotes]             = useState('')
  const [dateLivraison, setDateLivraison] = useState('')
  const [modeReglement, setModeReglement] = useState('esp')
  const [loading, setLoading]         = useState(false)
  const [step, setStep]               = useState(1)
  const [cmdNumero, setCmdNumero]     = useState('')

  useEffect(() => {
    loadProduits()
    // Pré-remplir le mode de règlement depuis le profil
    if (profile?.mode_reglement) setModeReglement(profile.mode_reglement)
  }, [profile])

  async function loadProduits() {
    const { data } = await supabase.from('produits').select('*').eq('actif', true).order('nom')
    setProduits(data || [])
  }

  function setQty(id, delta) {
    setPanier(p => {
      const next = Math.max(0, (p[id] || 0) + delta)
      if (next === 0) { const { [id]: _, ...rest } = p; return rest }
      return { ...p, [id]: next }
    })
  }

  const lignesPanier = produits.filter(p => panier[p.id] > 0).map(p => ({
    ...p, quantite: panier[p.id], subtotal: p.prix_unitaire * panier[p.id]
  }))
  const total    = lignesPanier.reduce((s, l) => s + l.subtotal, 0)
  const hasItems = lignesPanier.length > 0

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  async function passerCommande() {
    if (!hasItems) { toast.error('Ajoutez au moins un produit'); return }
    setLoading(true)
    try {
      const conditionPaiement = profile?.condition_paiement || 'immediat'



      // Générer numéro unique côté JS avec timestamp + retry
      let nextNumero = null
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: last } = await supabase
          .from('commandes')
          .select('numero_commande')
          .like('numero_commande', 'CMD-%')
          .order('numero_commande', { ascending: false })
          .limit(1)
        const lastNum = last?.[0]?.numero_commande
          ? parseInt(last[0].numero_commande.replace('CMD-', ''), 10)
          : 0
        nextNumero = 'CMD-' + String(lastNum + 1).padStart(5, '0')
        // Vérifier que ce numéro n'existe pas déjà
        const { data: existing } = await supabase
          .from('commandes')
          .select('id')
          .eq('numero_commande', nextNumero)
          .maybeSingle()
        if (!existing) break
        // Si doublon, attendre un peu et réessayer
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)))
      }

      const { data: cmd, error: e1 } = await supabase
        .from('commandes')
        .insert({
          numero_commande: nextNumero,
          client_id: profile.id,
          mode_paiement: 'livraison',
          condition_paiement: conditionPaiement,
          mode_reglement: modeReglement,
          notes: notes.trim() || null,
          date_livraison_souhaitee: dateLivraison || null,
        })
        .select().single()
      if (e1) throw e1

      const { error: e2 } = await supabase.from('lignes_commande').insert(
        lignesPanier.map(l => ({
          commande_id: cmd.id, produit_id: l.id,
          quantite: l.quantite, prix_unitaire: l.prix_unitaire,
        }))
      )
      if (e2) throw e2

      // Sauvegarder le mode de règlement comme préférence du client
      await supabase.from('profiles').update({ mode_reglement: modeReglement }).eq('id', profile.id)

      // Notif admin si date de livraison souhaitée
      if (dateLivraison) {
        const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
        for (const admin of admins || []) {
          await supabase.from('notifications').insert({
            user_id: admin.id, type: 'info',
            titre: `Livraison souhaitée le ${new Date(dateLivraison).toLocaleDateString('fr-FR')}`,
            message: `${profile.nom} souhaite être livré le ${new Date(dateLivraison).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} — Commande ${cmd.numero_commande}.`,
          })
        }
      }

      setCmdNumero(cmd.numero_commande)
      setStep(3)
      toast.success('Commande enregistrée !')
      // Email confirmation commande
      try {
        const dateLivraisonLabel = dateLivraison
          ? new Date(dateLivraison).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
          : null
        await emailConfirmationCommande(
          profile.email, profile.nom, cmd.numero_commande,
          lignesPanier.map(l => ({ nom: l.nom, quantite: l.quantite, prix_unitaire: l.prix_unitaire })),
          total, dateLivraisonLabel
        )
      } catch(e) { console.error('Email error:', e) }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === 3) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card text-center" style={{ maxWidth: 420, width: '100%' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--success-dim)', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22 }}>✓</div>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Commande enregistrée</h2>
          <div className="badge badge-orange" style={{ margin: '0 auto 16px' }}>{cmdNumero}</div>
          <p className="text-muted" style={{ marginBottom: 24, lineHeight: 1.6 }}>
            Votre commande a bien été enregistrée. Le bon de livraison sera disponible dès confirmation.
          </p>
          <div className="flex gap-3" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate('/client/commandes')}>Voir mes commandes</button>
            <button className="btn btn-ghost" onClick={() => { setStep(1); setPanier({}); setNotes(''); setDateLivraison('') }}>
              Nouvelle commande
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h2>Nouvelle commande</h2>
        <p>Sélectionnez vos produits et passez votre commande.</p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        {[['1', 'Produits'], ['2', 'Confirmation']].map(([n, label], i) => (
          <div key={n} className="flex items-center gap-3">
            <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: step >= Number(n) ? 'var(--accent)' : 'var(--bg-elevated)', color: step >= Number(n) ? 'white' : 'var(--text-muted)', fontWeight: 700, fontSize: 13 }}>{n}</div>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: step >= Number(n) ? 'var(--text)' : 'var(--text-muted)' }}>{label}</span>
            {i === 0 && <div style={{ width: 32, height: 1, background: 'var(--border)' }} />}
          </div>
        ))}
      </div>

      <div className='commande-grid'>
        <div>
          {step === 1 ? (
            <div className="card">
              <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Choisissez vos bouteilles</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {produits.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: 'var(--bg-elevated)', borderRadius: 12, border: `2px solid ${panier[p.id] ? 'var(--accent)' : 'transparent'}`, transition: 'border-color 0.15s' }}>
                    <div style={{ fontSize: 36 }}>{ICONS[p.poids_kg] || '🫙'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{p.nom}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent)', marginRight: 12, minWidth: 70, textAlign: 'right' }}>
                      {Number(p.prix_unitaire).toFixed(2)} DH
                    </div>
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => setQty(p.id, -1)} disabled={!panier[p.id]}>−</button>
                      <span className="qty-value">{panier[p.id] || 0}</span>
                      <button className="qty-btn" onClick={() => setQty(p.id, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="divider" />

              {/* Mode de règlement */}
              <div className="form-group">
                <label className="form-label">Mode de règlement</label>
                <div className="flex gap-3">
                  {[['esp', 'Espèces'], ['cheque', 'Chèque']].map(([val, label]) => (
                    <button key={val} onClick={() => setModeReglement(val)} style={{
                      flex: 1, padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${modeReglement === val ? 'var(--accent)' : 'var(--border)'}`,
                      background: modeReglement === val ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                      color: modeReglement === val ? 'var(--accent)' : 'var(--text-muted)',
                      fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, transition: 'all 0.15s'
                    }}>
                      {val === 'esp' ? '💵' : '📋'} {label}
                    </button>
                  ))}
                </div>
                <div className="text-muted text-sm" style={{ marginTop: 6 }}>
                  Votre choix sera mémorisé pour vos prochaines commandes.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Date de livraison souhaitée <span className="text-muted">(optionnel)</span></label>
                <input className="form-input" type="date" value={dateLivraison} min={minDate} onChange={e => setDateLivraison(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Instructions de livraison (optionnel)</label>
                <textarea className="form-textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Entrez vos instructions de livraison..." />
              </div>
            </div>
          ) : (
            <div className="card">
              <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Récapitulatif</h3>
              <div style={{ padding: 14, background: 'var(--bg-elevated)', borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>{profile?.nom}</div>
                <div className="text-muted text-sm">{profile?.numero_client} — {profile?.email}</div>
              </div>

              {dateLivraison && (
                <div style={{ padding: 10, background: 'var(--info-dim)', borderRadius: 8, marginBottom: 12, fontSize: 13, color: 'var(--info)' }}>
                  Livraison souhaitée le <strong>{new Date(dateLivraison).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                </div>
              )}

              {lignesPanier.map((l, i) => (
                <div key={i} className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{l.nom}</div>
                    <div className="text-muted text-sm">{Number(l.prix_unitaire).toFixed(2)} DH × {l.quantite}</div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{l.subtotal.toFixed(0)} DH</div>
                </div>
              ))}

              <div className="flex justify-between" style={{ padding: '14px 0 10px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>
                <span>Total</span>
                <span className="text-accent">{total.toFixed(0)} DH</span>
              </div>

              <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                Mode de règlement : <strong style={{ color: 'var(--text)' }}>{modeReglement === 'esp' ? 'Espèces' : 'Chèque'}</strong>
              </div>

              {notes && (
                <div style={{ marginTop: 8, padding: 10, background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                  {notes}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panier */}
        <div className="card" style={{ position: 'sticky', top: 20 }}>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={16} color="var(--accent)" />
            <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>Panier</h3>
            {hasItems && <span className="badge badge-orange" style={{ marginLeft: 'auto' }}>{lignesPanier.length}</span>}
          </div>
          {!hasItems ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>Aucun produit sélectionné</div>
          ) : (
            <>
              {lignesPanier.map((l, i) => (
                <div key={i} className="cart-item">
                  <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {l.image_url ? <img src={l.image_url} alt={l.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 18 }}>🫙</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{l.nom}</div>
                    <div className="text-muted text-sm">×{l.quantite}</div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{l.subtotal.toFixed(0)} DH</div>
                </div>
              ))}
              <div className="cart-total">
                <span>Total</span>
                <span className="text-accent">{total.toFixed(0)} DH</span>
              </div>
            </>
          )}
          <div className="divider" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {step === 1 ? (
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!hasItems} onClick={() => setStep(2)}>
                Confirmer <ArrowRight size={15} />
              </button>
            ) : (
              <>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading} onClick={passerCommande}>
                  {loading ? <span className="spinner" /> : <Check size={15} />} Passer la commande
                </button>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setStep(1)}>
                  ← Modifier
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
