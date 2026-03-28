import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Send, Check } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // login | demande | forgot
  const [form, setForm] = useState({ email: '', password: '' })
  const [demande, setDemande] = useState({
    nom: '', email: '', telephone: '', nom_societe: '', ice: '', activite: '', activite_autre: ''
  })
  const [activites, setActivites] = useState([])
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [demandeSent, setDemandeSent] = useState(false)
  const { signIn, resetPassword } = useAuth()

  useEffect(() => { loadActivites() }, [])

  async function loadActivites() {
    const { data } = await supabase.from('activites').select('nom').order('nom')
    setActivites(data?.map(a => a.nom) || [])
  }

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const updateD = (k, v) => setDemande(f => ({ ...f, [k]: v }))

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await signIn(form.email, form.password)
      if (error) throw error
    } catch (err) {
      toast.error(err.message || 'Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await resetPassword(form.email)
      if (error) throw error
      setResetSent(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDemande(e) {
    e.preventDefault()
    if (!demande.nom.trim()) { toast.error('Le nom est obligatoire'); return }
    if (!demande.telephone.trim()) { toast.error('Le téléphone est obligatoire'); return }
    if (!demande.email.trim()) { toast.error("L'email est obligatoire"); return }
    if (!demande.nom_societe.trim()) { toast.error('La raison sociale est obligatoire'); return }
    if (!demande.ice.trim()) { toast.error("L'ICE est obligatoire"); return }
    if (!demande.activite) { toast.error("L'activité est obligatoire"); return }
    setLoading(true)
    try {
      const activiteFinal = demande.activite === 'Autre' ? (demande.activite_autre || 'Autre') : demande.activite
      // Vérifier si une demande existe déjà
      const { data: existing } = await supabase
        .from('demandes_inscription')
        .select('id, statut')
        .eq('email', demande.email)
        .maybeSingle()
      if (existing) {
        if (existing.statut === 'en_attente') {
          toast.error('Une demande avec cet email est déjà en attente.')
          setLoading(false)
          return
        }
      }
      const { error } = await supabase.from('demandes_inscription').insert({
        nom: demande.nom,
        email: demande.email,
        telephone: demande.telephone,
        nom_societe: demande.nom_societe,
        ice: demande.ice,
        activite: activiteFinal,
        statut: 'en_attente',
      })
      if (error) throw error

      // Notifier l'admin
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
      for (const admin of admins || []) {
        await supabase.from('notifications').insert({
          user_id: admin.id, type: 'info',
          titre: 'Nouvelle demande de compte',
          message: `${demande.nom} (${demande.nom_societe}) demande un accès. Tél: ${demande.telephone}`,
        })
      }
      setDemandeSent(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (demandeSent) return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-dim)', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 26 }}>✓</div>
        <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Demande envoyée</h2>
        <p className="text-muted" style={{ marginBottom: 20, lineHeight: 1.7 }}>
          Votre demande a bien été reçue.<br />
          Le gérant va examiner votre dossier et vous contactera au<br />
          <strong style={{ color: 'var(--accent)' }}>{demande.telephone}</strong><br />
          ou par email à <strong style={{ color: 'var(--accent)' }}>{demande.email}</strong>
        </p>
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => { setDemandeSent(false); setMode('login') }}>
          Retour à la connexion
        </button>
      </div>
    </div>
  )

  if (resetSent) return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--info-dim)', border: '2px solid var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 26 }}>✉</div>
        <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Email envoyé</h2>
        <p className="text-muted" style={{ marginBottom: 20, lineHeight: 1.7 }}>
          Un lien de réinitialisation a été envoyé à<br />
          <strong style={{ color: 'var(--accent)' }}>{form.email}</strong>
        </p>
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => { setResetSent(false); setMode('login') }}>
          Retour à la connexion
        </button>
      </div>
    </div>
  )

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1 style={{ fontSize: 36, letterSpacing: -1 }}>IjtiGaz</h1>
          <p>Système de gestion Ijtihad Gaz</p>
        </div>

        {mode !== 'forgot' && (
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: 3, marginBottom: 24 }}>
            {[['login', 'Connexion'], ['demande', 'Demande de compte']].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                borderRadius: 6, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
                transition: 'all 0.15s',
                background: mode === m ? 'var(--bg-card)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              }}>{label}</button>
            ))}
          </div>
        )}

        {/* CONNEXION */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Adresse email</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => update('email', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPwd ? 'text' : 'password'}
                  value={form.password} onChange={e => update('password', e.target.value)}
                  required style={{ paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPwd(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading ? <span className="spinner" /> : null} Se connecter
            </button>
            <button type="button" onClick={() => setMode('forgot')} style={{ width: '100%', marginTop: 14, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>
              Mot de passe oublié ?
            </button>
          </form>
        )}

        {/* DEMANDE DE COMPTE */}
        {mode === 'demande' && (
          <form onSubmit={handleDemande}>
            <div style={{ padding: '10px 14px', background: 'var(--info-dim)', border: '1px solid var(--info)', borderRadius: 8, marginBottom: 20, fontSize: 13, color: 'var(--info)' }}>
              Remplissez ce formulaire. Le gérant examinera votre demande et vous enverra vos identifiants par email.
            </div>

            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>Informations personnelles</div>
            <div className="form-group">
              <label className="form-label">Nom et prénom *</label>
              <input className="form-input" value={demande.nom} onChange={e => updateD('nom', e.target.value)} required />
            </div>
            <div className="flex gap-3">
              <div className="form-group flex-1">
                <label className="form-label">Téléphone *</label>
                <input className="form-input" type="tel" value={demande.telephone} onChange={e => updateD('telephone', e.target.value)} required />
              </div>
              <div className="form-group flex-1">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={demande.email} onChange={e => updateD('email', e.target.value)} required />
              </div>
            </div>

            <div className="divider" />
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>Informations société</div>

            <div className="form-group">
              <label className="form-label">Raison sociale *</label>
              <input className="form-input" value={demande.nom_societe} onChange={e => updateD('nom_societe', e.target.value)} required />
            </div>
            <div className="flex gap-3">
              <div className="form-group flex-1">
                <label className="form-label">ICE *</label>
                <input className="form-input" value={demande.ice} onChange={e => updateD('ice', e.target.value)} required />
              </div>
              <div className="form-group flex-1">
                <label className="form-label">Activité *</label>
                <select className="form-select" value={demande.activite} onChange={e => updateD('activite', e.target.value)} required>
                  <option value="">-- Sélectionner --</option>
                  {activites.map(a => <option key={a} value={a}>{a}</option>)}
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
            {demande.activite === 'Autre' && (
              <div className="form-group">
                <label className="form-label">Préciser *</label>
                <input className="form-input" value={demande.activite_autre} onChange={e => updateD('activite_autre', e.target.value)} />
              </div>
            )}

            <button className="btn btn-primary btn-lg" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {loading ? <span className="spinner" /> : <Send size={15} />} Envoyer la demande
            </button>
            <button type="button" onClick={() => setMode('login')} style={{ width: '100%', marginTop: 14, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>
              Retour à la connexion
            </button>
          </form>
        )}

        {/* MOT DE PASSE OUBLIÉ */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot}>
            <div style={{ marginBottom: 20 }}>
              <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Mot de passe oublié</h3>
              <p className="text-muted" style={{ fontSize: 13 }}>Entrez votre email pour recevoir un lien de réinitialisation.</p>
            </div>
            <div className="form-group">
              <label className="form-label">Adresse email</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => update('email', e.target.value)} required />
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <span className="spinner" /> : null} Envoyer le lien
            </button>
            <button type="button" onClick={() => setMode('login')} style={{ width: '100%', marginTop: 14, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>
              Retour à la connexion
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
