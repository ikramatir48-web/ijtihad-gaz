import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import toast from 'react-hot-toast'
import { Check, Eye, EyeOff, User, Lock } from 'lucide-react'

export default function AdminParametres() {
  const { profile, fetchProfile } = useAuth()
  const [tab, setTab] = useState('profil')
  const [saving, setSaving] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConf, setShowConf] = useState(false)

  const [profil, setProfil] = useState({
    nom: profile?.nom || '',
    telephone: profile?.telephone || '',
  })

  const [pwd, setPwd] = useState({ ancien: '', nouveau: '', confirmation: '' })

  function validatePassword(p) {
    if (p.length < 8) return 'Au moins 8 caractères'
    if (!/[A-Z]/.test(p)) return 'Au moins une majuscule'
    if (!/[0-9]/.test(p)) return 'Au moins un chiffre'
    return null
  }

  async function saveProfil() {
    if (!profil.nom.trim()) { toast.error('Le nom est obligatoire'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        nom: profil.nom, telephone: profil.telephone || null,
      }).eq('id', profile.id)
      if (error) throw error
      await fetchProfile(profile.id)
      toast.success('Profil mis à jour')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function savePassword() {
    const err = validatePassword(pwd.nouveau)
    if (err) { toast.error(err); return }
    if (pwd.nouveau !== pwd.confirmation) { toast.error('Les mots de passe ne correspondent pas'); return }
    setSaving(true)
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: profile.email, password: pwd.ancien })
      if (signInErr) { toast.error('Ancien mot de passe incorrect'); setSaving(false); return }
      const { error } = await supabase.auth.updateUser({ password: pwd.nouveau })
      if (error) throw error
      toast.success('Mot de passe mis à jour !')
      setPwd({ ancien: '', nouveau: '', confirmation: '' })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const pwdStrength = pwd.nouveau ? validatePassword(pwd.nouveau) : null

  return (
    <div>
      <div className="page-header">
        <h2>Paramètres</h2>
        <p>Gérez votre compte administrateur.</p>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('profil')} className={`btn btn-sm ${tab === 'profil' ? 'btn-primary' : 'btn-ghost'}`}>
          <User size={13} /> Mon profil
        </button>
        <button onClick={() => setTab('securite')} className={`btn btn-sm ${tab === 'securite' ? 'btn-primary' : 'btn-ghost'}`}>
          <Lock size={13} /> Sécurité
        </button>
      </div>

      {tab === 'profil' && (
        <div className="card" style={{ maxWidth: 520 }}>
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Informations</h3>
          <div className="form-group">
            <label className="form-label">Nom complet *</label>
            <input className="form-input" value={profil.nom} onChange={e => setProfil(p => ({ ...p, nom: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Téléphone</label>
            <input className="form-input" value={profil.telephone} onChange={e => setProfil(p => ({ ...p, telephone: e.target.value }))} />
          </div>
          <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            Email : <strong style={{ color: 'var(--text)' }}>{profile?.email}</strong>
          </div>
          <button className="btn btn-primary" onClick={saveProfil} disabled={saving}>
            {saving ? <span className="spinner" /> : <Check size={14} />} Enregistrer
          </button>
        </div>
      )}

      {tab === 'securite' && (
        <div className="card" style={{ maxWidth: 520 }}>
          <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Changer le mot de passe</h3>
          <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 20, fontSize: 12, color: 'var(--text-muted)' }}>
            Le mot de passe doit contenir : <strong>8 caractères minimum</strong>, <strong>une majuscule</strong>, <strong>un chiffre</strong>.
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe actuel</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showOld ? 'text' : 'password'} value={pwd.ancien}
                onChange={e => setPwd(p => ({ ...p, ancien: e.target.value }))} style={{ paddingRight: 42 }} />
              <button type="button" onClick={() => setShowOld(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Nouveau mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showNew ? 'text' : 'password'} value={pwd.nouveau}
                onChange={e => setPwd(p => ({ ...p, nouveau: e.target.value }))} style={{ paddingRight: 42 }} />
              <button type="button" onClick={() => setShowNew(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {pwd.nouveau && (
              <div style={{ marginTop: 6, fontSize: 12, color: pwdStrength ? 'var(--danger)' : 'var(--success)' }}>
                {pwdStrength ? `⚠ ${pwdStrength}` : '✓ Mot de passe valide'}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Confirmer</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showConf ? 'text' : 'password'} value={pwd.confirmation}
                onChange={e => setPwd(p => ({ ...p, confirmation: e.target.value }))} style={{ paddingRight: 42 }} />
              <button type="button" onClick={() => setShowConf(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button className="btn btn-primary" onClick={savePassword} disabled={saving || !!pwdStrength || !pwd.ancien}>
            {saving ? <span className="spinner" /> : <Lock size={14} />} Mettre à jour
          </button>
        </div>
      )}
    </div>
  )
}
