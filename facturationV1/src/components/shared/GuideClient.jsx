import { useState } from 'react'
import { ShoppingCart, FileText, Tag, Bell, ChevronRight, ChevronLeft, X, Check } from 'lucide-react'

const ETAPES = [
  {
    icon: '👋',
    titre: 'Bienvenue sur IjtiGaz !',
    desc: "Votre espace client vous permet de gérer vos commandes de gaz en toute simplicité. Ce guide rapide vous explique comment utiliser l'application.",
    color: 'var(--accent)',
  },
  {
    icon: <ShoppingCart size={32} color="var(--accent)" />,
    titre: 'Passer une commande',
    desc: "Cliquez sur \"Nouvelle commande\" pour sélectionner vos produits et valider votre commande. Vous recevrez un email de confirmation et pourrez suivre l'état en temps réel.",
    color: 'var(--accent)',
    steps: [
      'Allez dans "Mes commandes"',
      'Cliquez sur "+ Nouvelle commande"',
      'Choisissez vos produits et quantités',
      'Validez votre commande',
    ]
  },
  {
    icon: <FileText size={32} color="var(--info)" />,
    titre: 'Vos documents',
    desc: "Dans \"Mes documents\", vous retrouvez tous vos bons de commande et bons de livraison. Vous pouvez les télécharger à tout moment.",
    color: 'var(--info)',
    steps: [
      'Bon de commande — généré automatiquement',
      'Bon de livraison — disponible après confirmation',
      'Facture — remise en main propre par notre équipe',
    ]
  },
  {
    icon: <Tag size={32} color="var(--success)" />,
    titre: 'Consulter les tarifs',
    desc: "La page \"Tarifs\" affiche tous nos prix en temps réel. Des remises peuvent être accordées selon les quantités — contactez-nous pour en savoir plus.",
    color: 'var(--success)',
  },
  {
    icon: <Bell size={32} color="var(--warning)" />,
    titre: 'Notifications',
    desc: "Vous recevez des emails à chaque étape de votre commande : confirmation, livraison, et paiement. La cloche en haut de la sidebar affiche aussi vos notifications.",
    color: 'var(--warning)',
  },
  {
    icon: '✅',
    titre: "Vous êtes prêt !",
    desc: "Vous pouvez maintenant utiliser l'application. Si vous avez des questions, contactez-nous directement par téléphone au 06 67 33 70 73.",
    color: 'var(--success)',
  },
]

export default function GuideClient({ onClose }) {
  const [step, setStep] = useState(0)
  const etape = ETAPES[step]
  const isLast = step === ETAPES.length - 1

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal" style={{ maxWidth: 480, padding: 0, overflow: 'hidden' }}>

        {/* Barre de progression */}
        <div style={{ display: 'flex', gap: 4, padding: '16px 24px 0' }}>
          {ETAPES.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 3,
              background: i <= step ? 'var(--accent)' : 'var(--border)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Contenu */}
        <div style={{ padding: '8px 32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>
            {typeof etape.icon === 'string' ? etape.icon : etape.icon}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, marginBottom: 12, color: 'var(--text)' }}>
            {etape.titre}
          </h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: 14, marginBottom: etape.steps ? 20 : 0 }}>
            {etape.desc}
          </p>

          {etape.steps && (
            <div style={{ textAlign: 'left', marginTop: 16 }}>
              {etape.steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="btn btn-ghost btn-sm"
            style={{ opacity: step === 0 ? 0 : 1 }}
          >
            <ChevronLeft size={15} /> Précédent
          </button>

          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {step + 1} / {ETAPES.length}
          </span>

          {isLast ? (
            <button className="btn btn-primary btn-sm" onClick={onClose}>
              <Check size={15} /> Commencer
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setStep(s => s + 1)}>
              Suivant <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
