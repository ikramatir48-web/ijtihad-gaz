import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, X, Printer } from 'lucide-react'
import { PrintDevis } from '../../components/shared/PrintDocs.jsx'
import toast from 'react-hot-toast'

const ORDRE = (nom) => {
  const n = (nom || '').toLowerCase()
  if (n.includes('12')) return 0
  if (n.includes('6')) return 1
  if (n.includes('3')) return 2
  if (n.includes('bng')) return 3
  if (n.includes('propane')) return 4
  return 5
}

export default function AdminDevis() {
  const [produits, setProduits]   = useState([])
  const [clients, setClients]     = useState([])
  const [lignes, setLignes]       = useState([])
  const [clientId, setClientId]   = useState('')
  const [notes, setNotes]         = useState('')
  const [validite, setValidite]   = useState(30)
  const [tva, setTva]             = useState(10)
  const [printDevis, setPrintDevis] = useState(null)
  const [loading, setLoading]     = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [pr, cl, tv] = await Promise.all([
      supabase.from('produits').select('*').eq('actif', true),
      supabase.from('profiles').select('*').eq('role', 'client').order('nom'),
      supabase.from('parametres').select('valeur').eq('cle', 'tva').maybeSingle(),
    ])
    setProduits((pr.data || []).sort((a, b) => ORDRE(a.nom) - ORDRE(b.nom)))
    setClients(cl.data || [])
    if (tv.data?.valeur) setTva(Number(tv.data.valeur))
    // Init lignes avec tous les produits à 0
    setLignes((pr.data || []).sort((a, b) => ORDRE(a.nom) - ORDRE(b.nom)).map(p => ({
      produit_id: p.id,
      nom: p.nom,
      prix_unitaire: p.prix_unitaire || p.prix || 0,
      quantite: 0,
    })))
  }

  function updateQty(idx, val) {
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, quantite: Math.max(0, Number(val) || 0) } : l))
  }

  function updatePrix(idx, val) {
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, prix_unitaire: Number(val) || 0 } : l))
  }

  const lignesActives = lignes.filter(l => l.quantite > 0)
  const totalTTC = lignesActives.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
  const totalHT = totalTTC / (1 + tva / 100)

  function genererDevis() {
    if (lignesActives.length === 0) { toast.error('Ajoutez au moins un produit'); return }
    const client = clients.find(c => c.id === clientId) || null
    const numero = `DEV-${format(new Date(), 'yyyy')}-${String(Date.now()).slice(-4)}`
    setPrintDevis({
      numero,
      date: new Date().toISOString(),
      validite,
      client,
      lignes: lignesActives,
      tva,
      notes,
    })
  }

  return (
    <div>
      <div className="page-header">
        <h2>Générer un devis</h2>
        <p>Créez un devis personnalisé pour un client.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Produits */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16 }}>Produits</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Produit</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>P.U. (DH)</th>
                <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Quantité</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={l.produit_id} style={{ borderBottom: '1px solid var(--border)', background: l.quantite > 0 ? 'var(--accent-dim)' : 'transparent' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{l.nom}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <input
                      type="number" min="0" step="0.01"
                      value={l.prix_unitaire}
                      onChange={e => updatePrix(i, e.target.value)}
                      style={{ width: 80, padding: '4px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', textAlign: 'right', fontSize: 13 }}
                    />
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div className="qty-control" style={{ justifyContent: 'center' }}>
                      <button className="qty-btn" onClick={() => updateQty(i, l.quantite - 1)}>−</button>
                      <span className="qty-value">{l.quantite}</span>
                      <button className="qty-btn" onClick={() => updateQty(i, l.quantite + 1)}>+</button>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: l.quantite > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {(l.quantite * l.prix_unitaire).toFixed(2)} DH
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Résumé + options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16 }}>Options</h3>

            <div className="form-group">
              <label className="form-label">Client (optionnel)</label>
              <select className="form-select" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">— Sans client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom_societe || c.nom}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Validité du devis (jours)</label>
              <input className="form-input" type="number" min="1" max="365" value={validite}
                onChange={e => setValidite(Number(e.target.value))} />
            </div>

            <div className="form-group">
              <label className="form-label">Notes / Conditions spéciales</label>
              <textarea className="form-input" rows={3} value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: remise accordée à partir de 50 unités..." />
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span className="text-muted">Total HT</span>
              <span>{totalHT.toFixed(2)} DH</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
              <span className="text-muted">TVA {tva}%</span>
              <span>{(totalTTC - totalHT).toFixed(2)} DH</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <span>Total TTC</span>
              <span style={{ color: 'var(--accent)' }}>{totalTTC.toFixed(2)} DH</span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
              onClick={genererDevis} disabled={lignesActives.length === 0}>
              <Printer size={15} /> Générer le devis
            </button>
          </div>
        </div>
      </div>

      {printDevis && <PrintDevis {...printDevis} onClose={() => setPrintDevis(null)} />}
    </div>
  )
}
