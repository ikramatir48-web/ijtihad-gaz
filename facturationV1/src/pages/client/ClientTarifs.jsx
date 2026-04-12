import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

const ORDRE = (nom) => {
  const n = (nom || '').toLowerCase()
  if (n.includes('12')) return 0
  if (n.includes('6')) return 1
  if (n.includes('3')) return 2
  if (n.includes('bng')) return 3
  if (n.includes('propane')) return 4
  return 5
}

export default function ClientTarifs() {
  const [produits, setProduits] = useState([])
  const [loading, setLoading]   = useState(true)
  const [tva, setTva]           = useState(10)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const [produitsRes, paramsRes] = await Promise.all([
      supabase.from('produits').select('*').eq('actif', true),
      supabase.from('parametres').select('valeur').eq('cle', 'tva').maybeSingle(),
    ])
    const sorted = (produitsRes.data || []).sort((a, b) => ORDRE(a.nom) - ORDRE(b.nom))
    setProduits(sorted)
    if (paramsRes.data?.valeur) setTva(Number(paramsRes.data.valeur))
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <h2>Tarifs</h2>
        <p>Prix en vigueur TTC — TVA {tva}% incluse.</p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
            {produits.map(p => (
              <div key={p.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 20,
                textAlign: 'center',
                transition: 'border-color 0.15s',
              }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>{p.emoji || '🔵'}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                  {p.nom}
                </div>
                {p.description && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{p.description}</div>
                )}
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
                  {Number(p.prix_unitaire || p.prix || 0).toFixed(2)} DH
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Prix unitaire TTC
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
            Prix en Dirhams TTC · TVA {tva}% incluse
          </div>
        </>
      )}
    </div>
  )
}
