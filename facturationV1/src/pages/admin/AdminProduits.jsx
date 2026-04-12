import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase.js'
import toast from 'react-hot-toast'
import { Pencil, X, Check, Plus, Upload, Image, Trash2 } from 'lucide-react'

export default function AdminProduits() {
  const [produits, setProduits]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editProd, setEditProd]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ nom: '', poids_kg: '', prix_unitaire: '', tva: 10, image_url: '' })
  const fileRef = useRef()

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('produits').select('*').order('nom')
    setProduits(data || [])
    setLoading(false)
  }

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function openCreate() {
    setEditProd(null)
    setForm({ nom: '', poids_kg: '', prix_unitaire: '', tva: 10, image_url: '' })
    setShowModal(true)
  }

  function openEdit(p) {
    setEditProd(p)
    setForm({ nom: p.nom, poids_kg: p.poids_kg, prix_unitaire: p.prix_unitaire, tva: p.tva ?? 10, image_url: p.image_url || '' })
    setShowModal(true)
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Fichier image requis'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image trop lourde (max 2 Mo)'); return }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const filename = `produit-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('produits')
        .upload(filename, file, { upsert: true })
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from('produits').getPublicUrl(filename)
      update('image_url', urlData.publicUrl)
      toast.success('Photo uploadée !')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function supprimerProduit(p) {
    if (!confirm(`Supprimer définitivement "${p.nom}" ?`)) return
    try {
      // Vérifier si le produit est utilisé dans des commandes
      const { count } = await supabase.from('lignes_commande')
        .select('*', { count: 'exact', head: true }).eq('produit_id', p.id)
      if (count > 0) {
        toast.error(`Impossible de supprimer — ce produit est utilisé dans ${count} commande(s)`)
        return
      }
      const { error } = await supabase.from('produits').delete().eq('id', p.id)
      if (error) throw error
      toast.success('Produit supprimé')
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleSave() {
    if (!form.nom || !form.prix_unitaire) { toast.error('Nom et prix requis'); return }
    setSaving(true)
    try {
      if (editProd) {
        const { error } = await supabase.from('produits').update({
          nom: form.nom,
          poids_kg: Number(form.poids_kg),
          prix_unitaire: Number(form.prix_unitaire),
          tva: Number(form.tva),
          image_url: form.image_url || null,
        }).eq('id', editProd.id)
        if (error) throw error
        toast.success('Produit mis à jour')
      } else {
        const { error } = await supabase.from('produits').insert({
          nom: form.nom,
          poids_kg: Number(form.poids_kg),
          prix_unitaire: Number(form.prix_unitaire),
          tva: Number(form.tva),
          image_url: form.image_url || null,
          actif: true,
        })
        if (error) throw error
        toast.success('Produit ajouté')
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActif(p) {
    await supabase.from('produits').update({ actif: !p.actif }).eq('id', p.id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between page-header">
        <div>
          <h2>Produits</h2>
          <p>Gérez votre catalogue de bouteilles de gaz.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Ajouter un produit
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {produits.map(p => (
            <div key={p.id} className="card" style={{ opacity: p.actif ? 1 : 0.5, padding: 0, overflow: 'hidden' }}>
              {/* Photo produit */}
              <div style={{ height: 140, background: 'var(--bg-elevated)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.nom}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                ) : null}
                <div style={{ display: p.image_url ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 6 }}>
                  <Image size={32} />
                  <span style={{ fontSize: 11 }}>Aucune photo</span>
                </div>
              </div>

              <div style={{ padding: '14px 16px 0' }}>
                <div className="font-display" style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{p.nom}</div>
                <div className="font-display text-accent" style={{ fontWeight: 800, fontSize: 22, marginBottom: 2 }}>
                  {Number(p.prix_unitaire).toFixed(2)} DH
                </div>
                <div className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>TVA {p.tva ?? 10}%</div>
              </div>
              <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => toggleActif(p)}>
                  {p.actif ? 'Désactiver' : 'Activer'}
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(p)}>
                  <Pencil size={13} />
                </button>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => supprimerProduit(p)} title="Supprimer">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editProd ? 'Modifier le produit' : 'Nouveau produit'}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}><X size={15} /></button>
            </div>
            <div className="modal-body">

              {/* Upload photo */}
              <div className="form-group">
                <label className="form-label">Photo du produit</label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 100, height: 100, borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--bg-elevated)', overflow: 'hidden', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {form.image_url ? (
                      <img src={form.image_url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Image size={28} color="var(--text-muted)" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={handleImageUpload} />
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginBottom: 6 }}
                      disabled={uploading} onClick={() => fileRef.current?.click()}>
                      {uploading ? <span className="spinner" /> : <Upload size={14} />}
                      {uploading ? 'Upload...' : 'Choisir une photo'}
                    </button>
                    {form.image_url && (
                      <button className="btn btn-danger btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => update('image_url', '')}>
                        Supprimer la photo
                      </button>
                    )}
                    <div className="text-muted text-sm" style={{ marginTop: 6 }}>JPG, PNG — max 2 Mo</div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nom du produit *</label>
                <input className="form-input" value={form.nom} onChange={e => update('nom', e.target.value)} />
              </div>
              <div className="flex gap-3">
                <div className="form-group flex-1">
                  <label className="form-label">Poids (kg)</label>
                  <input className="form-input" type="number" step="0.1" value={form.poids_kg} onChange={e => update('poids_kg', e.target.value)} />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Prix TTC (DH) *</label>
                  <input className="form-input" type="number" step="0.01" value={form.prix_unitaire} onChange={e => update('prix_unitaire', e.target.value)} />
                </div>
                <div className="form-group" style={{ width: 90 }}>
                  <label className="form-label">TVA %</label>
                  <input className="form-input" type="number" step="0.1" value={form.tva} onChange={e => update('tva', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || uploading}>
                {saving ? <span className="spinner" /> : <Check size={14} />}
                {editProd ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
