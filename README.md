# GazPro — Application de Facturation

Application de gestion et facturation pour distributeur de bouteilles de gaz.
Construite avec **React + Vite + Supabase**.

---

## 🚀 Déploiement sur StackBlitz

1. Va sur [stackblitz.com](https://stackblitz.com) → **New Project** → **Upload files** (ou importe depuis GitHub)
2. Dépose tous les fichiers du projet
3. Configure les variables d'environnement (voir ci-dessous)

---

## ⚙️ Configuration Supabase

### Étape 1 — Créer un projet Supabase
1. Va sur [supabase.com](https://supabase.com) → **New project**
2. Note ton **Project URL** et ta clé **anon public**

### Étape 2 — Exécuter le schéma SQL
1. Dans Supabase, va dans **SQL Editor**
2. Ouvre le fichier `supabase_schema.sql` (à la racine du projet)
3. Copie-colle tout le contenu et clique **Run**

### Étape 3 — Configurer les variables d'environnement
Dans StackBlitz, crée un fichier `.env` à la racine :
```
VITE_SUPABASE_URL=https://TONPROJET.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...TON_ANON_KEY
```

### Étape 4 — Créer le premier compte Admin
1. Lance l'appli et inscris-toi normalement
2. Dans Supabase → **Table Editor** → table `profiles`
3. Trouve ton utilisateur et change `role` de `client` à `admin`
4. Déconnecte-toi et reconnecte-toi → tu auras accès à l'espace gérant

---

## 🗺️ Fonctionnalités

### Espace Gérant (admin)
- 📊 Tableau de bord avec stats en temps réel
- 📦 Gestion des commandes (valider, déclarer livraison)
- 👥 Gestion des clients (créer, modifier)
- 🫙 Gestion des produits (bouteilles 3kg, 6kg, 12kg)
- 📄 Consultation et impression BL + Factures

### Espace Client
- 📊 Tableau de bord personnel
- 🛒 Passer une commande (choix produits + mode paiement)
- 📋 Suivi des commandes avec timeline
- 📄 Téléchargement/impression BL et Factures

### Flux de travail
```
Client passe commande
    ↓
Gérant reçoit notif → Valide → BL généré automatiquement
    ↓
Client voit le BL dans son espace
    ↓
Livraison effectuée → Gérant déclare
    ↓
Si paiement livraison → Facture générée automatiquement
Si crédit → BL uniquement (gérant marque payé plus tard)
```

### Règle facturation
- **Vente à crédit** → BL uniquement, pas de facture
- **Paiement à la livraison** → BL + Facture imprimable

---

## 📁 Structure du projet

```
src/
├── lib/
│   └── supabase.js          # Client Supabase
├── hooks/
│   └── useAuth.jsx          # Contexte d'authentification
├── components/
│   └── shared/
│       ├── AppLayout.jsx    # Sidebar + navigation
│       └── PrintDocs.jsx    # Composants BL et Facture imprimables
├── pages/
│   ├── AuthPage.jsx         # Connexion / Inscription
│   ├── admin/
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminCommandes.jsx   # ⭐ Page principale gérant
│   │   ├── AdminClients.jsx
│   │   ├── AdminProduits.jsx
│   │   └── AdminFactures.jsx
│   └── client/
│       ├── ClientDashboard.jsx
│       ├── ClientCommandes.jsx
│       └── ClientNouvelleCommande.jsx  # ⭐ Page principale client
└── App.jsx                  # Router principal
```

---

## 🔐 Sécurité

- Row Level Security (RLS) activé sur toutes les tables
- Chaque client ne voit que ses propres données
- L'admin voit tout
- Numéros clients auto-générés (CLT-001, CLT-002...)
- Numéros commandes auto-générés (CMD-00001...)
- Numéros BL auto-générés (BL-00001...)
- Numéros factures auto-générés (FACT-2025-0001...)
