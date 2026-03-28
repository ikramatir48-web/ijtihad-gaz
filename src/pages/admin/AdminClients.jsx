import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import toast from 'react-hot-toast'
import { UserPlus, Check, X, Phone, UserCheck, Clock, Pencil, Eye, EyeOff } from 'lucide-react'
import { emailBienvenue } from '../../lib/email.js'

const CONDITIONS_PAIEMENT = [
  { value: 'immediat',  label: 'Règlement immédiat' },
  { value: 'quinzaine', label: 'Quinzaine' },
  { value: 'mensuel',   label: 'Mensuel' },
  { value: 'trimestre', label: 'Trimestriel' },
  { value: 'autre',     label: 'Autre' },
]

function getConditionLabel(value, autre) {
  if (value === 'autre') return autre || 'Autre'
  return CONDITIONS_PAIEMENT.find(c => c.value === value)?.label || value || 'Règlement immédiat'
}

function genPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function AdminClients() {
  const [clients, setClients]       = useState([])
  const [activites, setActivites]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [showPendingModal, setShowPendingModal] = useState(false)
  const [pendingClients, setPendingClients]     = useState([])
  const [editClient, setEditClient] = useState(null)
  const [tab, setTab]               = useState('en_attente')
  const [saving, setSaving]         = useState(false)
  const [showPwd, setShowPwd]       = useState(false)
  const [generatedPwd, setGeneratedPwd] = useState('')

  const [form, setForm] = useState({
    nom: '', email: '', telephone: '', adresse: '',
    nom_societe: '', ice: '', activite: '', activite_autre: '',
    condition_paiement: 'immediat', condition_paiement_autre: '',
  })

  useEffect(() => {
    load()
    loadActivites()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  async function loadActivites() {
    const { data } = await supabase.from('activites').select('nom').order('nom')
    setActivites(data?.map(a => a.nom) || [])
  }

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function openCreate() {
    setEditClient(null)
    const pwd = genPassword()
    setGeneratedPwd(pwd)
    setForm({ nom: '', email: '', telephone: '', adresse: '', nom_societe: '', ice: '', activite: '', activite_autre: '', condition_paiement: 'immediat', condition_paiement_autre: '' })
    setShowModal(true)
  }

  function openEdit(client) {
    setEditClient(client)
    setGeneratedPwd(client.temp_password || '')
    setForm({
      nom: client.nom, email: client.email,
      telephone: client.telephone || '', adresse: client.adresse || '',
      nom_societe: client.nom_societe || '', ice: client.ice || '',
      activite: client.activite || '', activite_autre: '',
      condition_paiement: client.condition_paiement || 'immediat',
      condition_paiement_autre: client.condition_paiement_autre || '',
    })
    setShowModal(true)
  }

  async function activerCompte(client) {
    await supabase.from('profiles').update({ statut_compte: 'actif' }).eq('id', client.id)
    await supabase.from('notifications').insert({
      user_id: client.id, type: 'success',
      titre: 'Compte activé',
      message: 'Bienvenue parmi nos fidèles clients. Vous pouvez désormais passer commande.',
    })
    toast.success(`Compte de ${client.nom} activé`)
    load()
  }

  async function suspendreCompte(client) {
    await supabase.from('profiles').update({ statut_compte: 'suspendu' }).eq('id', client.id)
    toast.success('Compte suspendu')
    load()
  }

  async function handleSave() {
    if (!form.nom) { toast.error('Nom obligatoire'); return }
    setSaving(true)
    try {
      if (editClient) {
        await supabase.from('profiles').update({
          nom: form.nom, telephone: form.telephone, adresse: form.adresse,
          nom_societe: form.nom_societe || null, ice: form.ice || null,
          activite: form.activite === 'Autre' ? (form.activite_autre || 'Autre') : (form.activite || null),
          condition_paiement: form.condition_paiement,
          condition_paiement_autre: form.condition_paiement === 'autre' ? form.condition_paiement_autre : null,
        }).eq('id', editClient.id)
        toast.success('Client mis à jour')
      } else {
        if (!form.email) { toast.error('Email obligatoire'); setSaving(false); return }
        // Créer via Edge Function
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('https://ugnmuxhgwiexuuetvbtd.supabase.co/functions/v1/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            email: form.email,
            password: generatedPwd,
            nom: form.nom,
            telephone: form.telephone,
            nom_societe: form.nom_societe || null,
            ice: form.ice || null,
            activite: form.activite === 'Autre' ? (form.activite_autre || 'Autre') : (form.activite || null),
            condition_paiement: form.condition_paiement,
          }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Erreur création compte')
        // Mettre à jour adresse et condition_paiement_autre si besoin
        if (result.user_id) {
          await supabase.from('profiles').update({
            adresse: form.adresse || null,
            condition_paiement_autre: form.condition_paiement === 'autre' ? form.condition_paiement_autre : null,
          }).eq('id', result.user_id)
        }

        // Envoyer notif de bienvenue
        const { data: p } = await supabase.from('profiles').select('id').eq('email', form.email).single()
        if (p) {
          await supabase.from('notifications').insert({
            user_id: p.id, type: 'success',
            titre: 'Bienvenue chez Ijtihad Gaz',
            message: `Votre compte a été créé. Email : ${form.email} — Mot de passe temporaire : ${generatedPwd}. Connectez-vous et changez votre mot de passe.`,
          })
        }
        toast.success(`Client créé ! Mot de passe : ${generatedPwd}`)
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const enAttente = clients.filter(c => c.statut_compte === 'en_attente' || !c.statut_compte)
  const actifs    = clients.filter(c => c.statut_compte === 'actif')
  const suspendus = clients.filter(c => c.statut_compte === 'suspendu')
  const displayed = tab === 'en_attente' ? enAttente : tab === 'actif' ? actifs : suspendus

  return (
    <div>
      {/* Pop-up comptes en attente */}
      {showPendingModal && pendingClients.length > 0 && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Nouveaux comptes à valider</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowPendingModal(false)}><X size={15} /></button>
            </div>
            <div className="modal-body">
              <p className="text-muted" style={{ marginBottom: 16, fontSize: 13 }}>
                {pendingClients.length} nouveau(x) client(s) attendent la validation de leur compte.
              </p>
              {pendingClients.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.nom}</div>
                    <div className="text-muted text-sm">
                      {c.telephone && <span><Phone size={11} style={{ display: 'inline', marginRight: 3 }} />{c.telephone}</span>}
                      {c.nom_societe && <span> · {c.nom_societe}</span>}
                    </div>
                  </div>
                  <button className="btn btn-success btn-sm" onClick={() => { activerCompte(c); setPendingClients(prev => prev.filter(p => p.id !== c.id)) }}>
                    <Check size={13} /> Activer
                  </button>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowPendingModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between page-header">
        <div>
          <h2>Clients</h2>
          <p>Gérez vos clients et leurs conditions de paiement.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><UserPlus size={15} /> Créer un client</button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('en_attente')} className={`btn btn-sm ${tab === 'en_attente' ? 'btn-primary' : 'btn-ghost'}`}>
          <Clock size={13} /> En attente {enAttente.length > 0 && `(${enAttente.length})`}
        </button>
        <button onClick={() => setTab('actif')} className={`btn btn-sm ${tab === 'actif' ? 'btn-primary' : 'btn-ghost'}`}>
          <UserCheck size={13} /> Actifs ({actifs.length})
        </button>
        <button onClick={() => setTab('suspendu')} className={`btn btn-sm ${tab === 'suspendu' ? 'btn-primary' : 'btn-ghost'}`}>
          Suspendus ({suspendus.length})
        </button>
      </div>

      {tab === 'en_attente' && enAttente.length > 0 && (
        <div style={{ padding: 14, background: 'var(--warning-dim)', border: '1px solid var(--warning)', borderRadius: 10, marginBottom: 16, fontSize: 13, color: 'var(--warning)' }}>
          {enAttente.length} compte(s) en attente. Appelez le client pour confirmer, puis cliquez "Activer".
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : displayed.length === 0 ? (
          <div className="empty-state"><h3>Aucun client</h3></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>N° Client</th><th>Nom / Société</th><th>Activité</th>
                  <th>Téléphone</th><th>Condition paiement</th><th>Statut</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(c => (
                  <tr key={c.id}>
                    <td><span className="badge badge-orange">{c.numero_client}</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.nom}</div>
                      {c.nom_societe && <div className="text-muted text-sm">{c.nom_societe}</div>}
                      {c.ice && <div className="text-muted text-sm">ICE: {c.ice}</div>}
                    </td>
                    <td className="text-muted">{c.activite || '—'}</td>
                    <td>
                      {c.telephone
                        ? <a href={`tel:${c.telephone}`} style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={13} />{c.telephone}
                          </a>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td><span className="badge badge-blue">{getConditionLabel(c.condition_paiement, c.condition_paiement_autre)}</span></td>
                    <td>
                      <span className={`badge ${c.statut_compte === 'actif' ? 'badge-green' : c.statut_compte === 'suspendu' ? 'badge-red' : 'badge-yellow'}`}>
                        {c.statut_compte === 'actif' ? '✓ Actif' : c.statut_compte === 'suspendu' ? '✕ Suspendu' : '⏳ En attente'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(c)}><Pencil size={13} /></button>
                        {(c.statut_compte === 'en_attente' || !c.statut_compte) && (
                          <button className="btn btn-success btn-sm" onClick={() => activerCompte(c)}><Check size={13} /> Activer</button>
                        )}
                        {c.statut_compte === 'actif' && (
                          <button className="btn btn-danger btn-sm" onClick={() => suspendreCompte(c)}><X size={13} /> Suspendre</button>
                        )}
                        {c.statut_compte === 'suspendu' && (
                          <button className="btn btn-success btn-sm" onClick={() => activerCompte(c)}><Check size={13} /> Réactiver</button>
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editClient ? 'Modifier le client' : 'Créer un client'}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}><X size={15} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

              {/* Mot de passe généré */}
              {!editClient && (
                <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 16, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 6 }}>Mot de passe temporaire généré</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)', flex: 1, letterSpacing: 2 }}>
                      {showPwd ? generatedPwd : '••••••••••'}
                    </div>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowPwd(s => !s)}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(generatedPwd); toast.success('Copié !') }}>
                      Copier
                    </button>
                  </div>
                  <div className="text-muted text-sm" style={{ marginTop: 6 }}>
                    Ce mot de passe sera envoyé au client par email. Il devra le changer à la première connexion.
                  </div>
                </div>
              )}

              {editClient && editClient.temp_password && (
                <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Mot de passe temporaire initial</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{editClient.temp_password}</div>
                </div>
              )}

              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>Informations personnelles</div>
              <div className="form-group">
                <label className="form-label">Nom complet *</label>
                <input className="form-input" value={form.nom} onChange={e => update('nom', e.target.value)} />
              </div>
              {!editClient && (
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
                </div>
              )}
              <div className="flex gap-3">
                <div className="form-group flex-1">
                  <label className="form-label">Téléphone</label>
                  <input className="form-input" value={form.telephone} onChange={e => update('telephone', e.target.value)} />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Adresse</label>
                  <input className="form-input" value={form.adresse} onChange={e => update('adresse', e.target.value)} />
                </div>
              </div>

              <div className="divider" />
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>Informations société</div>
              <div className="form-group">
                <label className="form-label">Nom de la société</label>
                <input className="form-input" value={form.nom_societe} onChange={e => update('nom_societe', e.target.value)} />
              </div>
              <div className="flex gap-3">
                <div className="form-group flex-1">
                  <label className="form-label">ICE</label>
                  <input className="form-input" value={form.ice} onChange={e => update('ice', e.target.value)} />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Activité</label>
                  <select className="form-select" value={form.activite} onChange={e => update('activite', e.target.value)}>
                    <option value="">-- Sélectionner --</option>
                    {activites.map(a => <option key={a} value={a}>{a}</option>)}
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>
              {form.activite === 'Autre' && (
                <div className="form-group">
                  <label className="form-label">Préciser</label>
                  <input className="form-input" value={form.activite_autre} onChange={e => update('activite_autre', e.target.value)} />
                </div>
              )}

              <div className="divider" />
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>Condition de paiement</div>
              <div className="form-group">
                <select className="form-select" value={form.condition_paiement} onChange={e => update('condition_paiement', e.target.value)}>
                  {CONDITIONS_PAIEMENT.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              {form.condition_paiement === 'autre' && (
                <div className="form-group">
                  <label className="form-label">Préciser</label>
                  <input className="form-input" value={form.condition_paiement_autre} onChange={e => update('condition_paiement_autre', e.target.value)} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" /> : <Check size={14} />}
                {editClient ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
