import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Check, X, Eye, EyeOff } from 'lucide-react'
import { emailBienvenue } from '../../lib/email.js'

function genPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function AdminDemandes() {
  const [demandes, setDemandes]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)
  const [showPwd, setShowPwd]       = useState(false)
  const [generatedPwd, setGeneratedPwd] = useState('')
  const [condPaiement, setCondPaiement] = useState('immediat')
  const [processing, setProcessing] = useState(false)
  const [tab, setTab]               = useState('en_attente')

  const CONDITIONS = [
    { value: 'immediat',  label: 'Règlement immédiat' },
    { value: 'quinzaine', label: 'Quinzaine' },
    { value: 'mensuel',   label: 'Mensuel' },
    { value: 'trimestre', label: 'Trimestriel' },
  ]

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('demandes_inscription').select('*').order('created_at', { ascending: false })
    setDemandes(data || [])
    setLoading(false)
  }

  function openDemande(d) {
    setSelected(d)
    setGeneratedPwd(genPassword())
    setCondPaiement('immediat')
    setShowPwd(false)
  }

  async function accepter() {
    if (!selected) return
    setProcessing(true)
    try {
      // Créer le compte via Edge Function (Admin API)
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('https://ugnmuxhgwiexuuetvbtd.supabase.co/functions/v1/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          email: selected.email,
          password: generatedPwd,
          nom: selected.nom,
          telephone: selected.telephone,
          nom_societe: selected.nom_societe,
          ice: selected.ice,
          activite: selected.activite,
          condition_paiement: condPaiement,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erreur création compte')

      // Envoyer email avec identifiants
      await emailBienvenue(selected.email, selected.nom, generatedPwd)

      // Notifier le client dans l'appli
      if (result.user_id) {
        await supabase.from('notifications').insert({
          user_id: result.user_id, type: 'success',
          titre: 'Compte activé',
          message: 'Bienvenue parmi nos fidèles clients. Vous pouvez désormais passer commande.',
        })
      }

      // Marquer la demande comme acceptée
      await supabase.from('demandes_inscription').update({ statut: 'accepte' }).eq('id', selected.id)

      toast.success(`Compte créé et email envoyé à ${selected.email}`)
      setSelected(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProcessing(false)
    }
  }

  async function refuser() {
    if (!selected) return
    setProcessing(true)
    try {
      await supabase.from('demandes_inscription').update({ statut: 'refuse' }).eq('id', selected.id)
      // Email de refus optionnel — on peut l'activer plus tard
      toast.success('Demande refusée')
      setSelected(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const filtered = demandes.filter(d => d.statut === tab)

  return (
    <div>
      <div className="page-header">
        <h2>Demandes de compte</h2>
        <p>Gérez les demandes d'accès des nouveaux clients.</p>
      </div>

      <div className="flex gap-2 mb-4">
        {[['en_attente', '⏳ En attente'], ['accepte', '✓ Acceptées'], ['refuse', '✕ Refusées']].map(([val, label]) => {
          const count = demandes.filter(d => d.statut === val).length
          return (
            <button key={val} onClick={() => setTab(val)}
              className={`btn btn-sm ${tab === val ? 'btn-primary' : 'btn-ghost'}`}>
              {label} {count > 0 && `(${count})`}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20 }}>
        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><h3>Aucune demande</h3></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Nom</th><th>Société</th><th>Activité</th><th>Téléphone</th><th>Date</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => openDemande(d)}>
                      <td style={{ fontWeight: 600 }}>{d.nom}</td>
                      <td className="text-muted">{d.nom_societe || '—'}</td>
                      <td className="text-muted">{d.activite || '—'}</td>
                      <td className="text-muted">{d.telephone}</td>
                      <td className="text-muted">{format(new Date(d.created_at), 'dd MMM yyyy', { locale: fr })}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openDemande(d) }}>
                          <Eye size={13} /> Voir
                        </button>
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
              <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>Demande de {selected.nom}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelected(null)}><X size={15} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {[
                ['Email', selected.email],
                ['Téléphone', selected.telephone],
                ['Raison sociale', selected.nom_societe],
                ['ICE', selected.ice],
                ['Activité', selected.activite],
              ].map(([label, val]) => val && (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <span className="text-muted" style={{ fontSize: 13 }}>{label}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{val}</span>
                </div>
              ))}
            </div>

            {selected.statut === 'en_attente' && (
              <>
                <div className="divider" />

                {/* Mot de passe généré */}
                <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Mot de passe temporaire</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: 'var(--accent)', flex: 1, letterSpacing: 2 }}>
                      {showPwd ? generatedPwd : '••••••••••'}
                    </div>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowPwd(s => !s)}>
                      {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(generatedPwd); toast.success('Copié !') }}>
                      Copier
                    </button>
                  </div>
                </div>

                {/* Condition de paiement */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Condition de paiement</label>
                  <select className="form-select" value={condPaiement} onChange={e => setCondPaiement(e.target.value)}>
                    {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button className="btn btn-success" style={{ flex: 1, justifyContent: 'center' }}
                    onClick={accepter} disabled={processing}>
                    {processing ? <span className="spinner" /> : <Check size={14} />} Accepter
                  </button>
                  <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }}
                    onClick={refuser} disabled={processing}>
                    <X size={14} /> Refuser
                  </button>
                </div>
              </>
            )}

            {selected.statut !== 'en_attente' && (
              <div style={{ padding: '10px 14px', borderRadius: 8, textAlign: 'center', fontSize: 13, fontWeight: 600,
                background: selected.statut === 'accepte' ? 'var(--success-dim)' : 'var(--danger-dim)',
                color: selected.statut === 'accepte' ? 'var(--success)' : 'var(--danger)'
              }}>
                {selected.statut === 'accepte' ? '✓ Demande acceptée' : '✕ Demande refusée'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
