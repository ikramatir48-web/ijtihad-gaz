import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import toast from 'react-hot-toast'
import { Plus, Pencil, X, Check, Truck } from 'lucide-react'

export default function AdminLivreurs() {
  const [livreurs, setLivreurs]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editLivreur, setEditLivreur] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', immatriculation: '', cin: '' })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('livreurs').select('*').order('nom')
    setLivreurs(data || [])
    setLoading(false)
  }

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function openCreate() {
    setEditLivreur(null)
    setForm({ nom: '', prenom: '', telephone: '', immatriculation: '', cin: '' })
    setShowModal(true)
  }

  function openEdit(l) {
    setEditLivreur(l)
    setForm({ nom: l.nom, prenom: l.prenom, telephone: l.telephone || '', immatriculation: l.immatriculation, cin: l.cin || '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.nom || !form.prenom || !form.immatriculation) {
      toast.error('Nom, prénom et immatriculation obligatoires')
      return
    }
    setSaving(true)
    try {
      if (editLivreur) {
        const { error } = await supabase.from('livreurs').update({
          nom: form.nom, prenom: form.prenom,
          telephone: form.telephone || null,
          immatriculation: form.immatriculation.toUpperCase(),
          cin: form.cin || null,
        }).eq('id', editLivreur.id)
        if (error) throw error
        toast.success('Livreur mis à jour')
      } else {
        const { error } = await supabase.from('livreurs').insert({
          nom: form.nom, prenom: form.prenom,
          telephone: form.telephone || null,
          immatriculation: form.immatriculation.toUpperCase(),
          cin: form.cin || null,
        })
        if (error) throw error
        toast.success('Livreur ajouté')
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActif(l) {
    await supabase.from('livreurs').update({ actif: !l.actif }).eq('id', l.id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between page-header">
        <div>
          <h2>Livreurs</h2>
          <p>Gérez votre équipe de livraison.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Ajouter un livreur
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : livreurs.length === 0 ? (
          <div className="empty-state">
            <Truck size={36} />
            <h3>Aucun livreur</h3>
            <p>Ajoutez votre premier livreur.</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openCreate}>
              <Plus size={15} /> Ajouter
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom</th><th>Prénom</th><th>CIN</th>
                  <th>Téléphone</th><th>Immatriculation</th><th>Statut</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {livreurs.map(l => (
                  <tr key={l.id} style={{ opacity: l.actif ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 600 }}>{l.nom}</td>
                    <td>{l.prenom}</td>
                    <td className="text-muted">{l.cin || '—'}</td>
                    <td className="text-muted">{l.telephone || '—'}</td>
                    <td><span className="badge badge-blue"><Truck size={11} style={{ display: 'inline', marginRight: 4 }} />{l.immatriculation}</span></td>
                    <td><span className={`badge ${l.actif ? 'badge-green' : 'badge-gray'}`}>{l.actif ? '✓ Actif' : 'Inactif'}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(l)}><Pencil size={13} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleActif(l)}>{l.actif ? 'Désactiver' : 'Activer'}</button>
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
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editLivreur ? 'Modifier le livreur' : 'Ajouter un livreur'}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}><X size={15} /></button>
            </div>
            <div className="modal-body">
              <div className="flex gap-3">
                <div className="form-group flex-1">
                  <label className="form-label">Nom *</label>
                  <input className="form-input" value={form.nom} onChange={e => update('nom', e.target.value)} />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Prénom *</label>
                  <input className="form-input" value={form.prenom} onChange={e => update('prenom', e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="form-group flex-1">
                  <label className="form-label">CIN <span className="text-muted">(optionnel)</span></label>
                  <input className="form-input" value={form.cin} onChange={e => update('cin', e.target.value)} />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Téléphone</label>
                  <input className="form-input" value={form.telephone} onChange={e => update('telephone', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Immatriculation *</label>
                <input className="form-input" value={form.immatriculation}
                  onChange={e => update('immatriculation', e.target.value.toUpperCase())}
                  style={{ textTransform: 'uppercase' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" /> : <Check size={14} />}
                {editLivreur ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
