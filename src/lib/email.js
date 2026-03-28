import { supabase } from './supabase.js';

const EDGE_URL =
  'https://ugnmuxhgwiexuuetvbtd.supabase.co/functions/v1/dynamic-endpoint';

async function sendEmail(to, subject, html) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({ to, subject, html }),
    });
    const data = await res.json();
    if (!res.ok) console.error('Email error:', data);
    return data;
  } catch (err) {
    console.error('Email send error:', err);
  }
}

export async function emailBienvenue(to, nom, password) {
  await sendEmail(
    to,
    'Bienvenue chez Ijtihad Gaz — Vos informations de connexion',
    `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:8px;">
      <h1 style="color:#e85d04;font-size:28px;margin-bottom:4px;">Ijtihad Gaz</h1>
      <p style="color:#666;margin-bottom:32px;">Système de gestion des commandes</p>
      
      <h2 style="color:#111;font-size:20px;">Bienvenue, ${nom} !</h2>
      <p style="color:#444;line-height:1.6;">
        Votre compte a été créé avec succès. Voici vos informations de connexion :
      </p>
      
      <div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:24px;margin:24px 0;">
        <div style="margin-bottom:16px;">
          <div style="font-size:12px;color:#999;text-transform:uppercase;margin-bottom:4px;">Email</div>
          <div style="font-size:16px;font-weight:600;color:#111;">${to}</div>
        </div>
        <div>
          <div style="font-size:12px;color:#999;text-transform:uppercase;margin-bottom:4px;">Mot de passe temporaire</div>
          <div style="font-size:22px;font-weight:700;color:#e85d04;letter-spacing:2px;font-family:monospace;">${password}</div>
        </div>
      </div>
      
      <div style="background:#fff3e0;border-left:4px solid #e85d04;padding:16px;border-radius:4px;margin-bottom:24px;">
        <strong style="color:#e85d04;">Important :</strong>
        <p style="color:#444;margin:8px 0 0;line-height:1.5;">
          Lors de votre première connexion, vous devrez changer ce mot de passe et compléter votre profil.
        </p>
      </div>
      
      <p style="color:#444;line-height:1.6;">
        Connectez-vous sur notre plateforme pour passer vos commandes de gaz.
      </p>
      
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:32px 0;" />
      <p style="color:#999;font-size:12px;text-align:center;">
        Ijtihad Gaz — N° 67 LOT BLED SI THAMI 2ème étage Zemamra<br/>
        Tél : 06 67 33 70 73
      </p>
    </div>
    `
  );
}

export async function emailConfirmationCommande(
  to,
  nom,
  numeroCommande,
  produits,
  total,
  dateLivraison
) {
  const produitsHtml = produits
    .map(
      (p) =>
        `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${
        p.nom
      }</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${
        p.quantite
      }</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${(
        p.quantite * p.prix_unitaire
      ).toFixed(2)} DH</td>
    </tr>`
    )
    .join('');

  await sendEmail(
    to,
    `Commande ${numeroCommande} enregistrée — Ijtihad Gaz`,
    `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:8px;">
      <h1 style="color:#e85d04;font-size:28px;margin-bottom:4px;">Ijtihad Gaz</h1>
      <p style="color:#666;margin-bottom:32px;">Confirmation de commande</p>
      
      <h2 style="color:#111;">Bonjour ${nom},</h2>
      <p style="color:#444;line-height:1.6;">Votre commande <strong>${numeroCommande}</strong> a bien été enregistrée.</p>
      
      ${
        dateLivraison
          ? `<div style="background:#e3f2fd;border-left:4px solid #1976d2;padding:12px 16px;border-radius:4px;margin-bottom:20px;"><strong>Livraison souhaitée :</strong> ${dateLivraison}</div>`
          : ''
      }
      
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;margin-bottom:16px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;">PRODUIT</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#666;">QTÉ</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#666;">TOTAL</th>
          </tr>
        </thead>
        <tbody>${produitsHtml}</tbody>
        <tfoot>
          <tr style="background:#f5f5f5;">
            <td colspan="2" style="padding:10px 12px;font-weight:700;">Total TTC</td>
            <td style="padding:10px 12px;text-align:right;font-weight:700;color:#e85d04;">${total.toFixed(
              2
            )} DH</td>
          </tr>
        </tfoot>
      </table>
      
      <p style="color:#444;line-height:1.6;">Nous vous contacterons pour confirmer la livraison.</p>
      
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:32px 0;" />
      <p style="color:#999;font-size:12px;text-align:center;">Ijtihad Gaz — Tél : 06 67 33 70 73</p>
    </div>
    `
  );
}

export async function emailBLDisponible(to, nom, numeroCommande, numeroBL) {
  await sendEmail(
    to,
    `Bon de livraison ${numeroBL} disponible — Ijtihad Gaz`,
    `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:8px;">
      <h1 style="color:#e85d04;font-size:28px;margin-bottom:4px;">Ijtihad Gaz</h1>
      <p style="color:#666;margin-bottom:32px;">Bon de livraison disponible</p>
      
      <h2 style="color:#111;">Bonjour ${nom},</h2>
      <p style="color:#444;line-height:1.6;">
        Votre commande <strong>${numeroCommande}</strong> a été confirmée.<br/>
        Votre bon de livraison <strong>${numeroBL}</strong> est disponible dans votre espace client.
      </p>
      
      <div style="background:#e8f5e9;border-left:4px solid #43a047;padding:16px;border-radius:4px;margin:24px 0;">
        <strong style="color:#2e7d32;">✓ Commande confirmée</strong>
        <p style="color:#444;margin:8px 0 0;">Vous recevrez un autre email lors de la livraison.</p>
      </div>
      
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:32px 0;" />
      <p style="color:#999;font-size:12px;text-align:center;">Ijtihad Gaz — Tél : 06 67 33 70 73</p>
    </div>
    `
  );
}

export async function emailLivraisonEffectuee(to, nom, numeroCommande) {
  await sendEmail(
    to,
    `Livraison effectuée — ${numeroCommande} — Ijtihad Gaz`,
    `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:8px;">
      <h1 style="color:#e85d04;font-size:28px;margin-bottom:4px;">Ijtihad Gaz</h1>
      <p style="color:#666;margin-bottom:32px;">Livraison effectuée</p>
      
      <h2 style="color:#111;">Bonjour ${nom},</h2>
      <p style="color:#444;line-height:1.6;">
        Votre commande <strong>${numeroCommande}</strong> a été livrée avec succès.
      </p>
      
      <div style="background:#e8f5e9;border-left:4px solid #43a047;padding:16px;border-radius:4px;margin:24px 0;">
        <strong style="color:#2e7d32;">✓ Livraison effectuée</strong>
        <p style="color:#444;margin:8px 0 0;">Votre facture sera disponible après confirmation du paiement.</p>
      </div>
      
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:32px 0;" />
      <p style="color:#999;font-size:12px;text-align:center;">Ijtihad Gaz — Tél : 06 67 33 70 73</p>
    </div>
    `
  );
}

export async function emailFactureDisponible(
  to,
  nom,
  numeroCommande,
  numeroFacture,
  montant
) {
  await sendEmail(
    to,
    `Facture ${numeroFacture} disponible — Ijtihad Gaz`,
    `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:8px;">
      <h1 style="color:#e85d04;font-size:28px;margin-bottom:4px;">Ijtihad Gaz</h1>
      <p style="color:#666;margin-bottom:32px;">Facture disponible</p>
      
      <h2 style="color:#111;">Bonjour ${nom},</h2>
      <p style="color:#444;line-height:1.6;">
        Le paiement de votre commande <strong>${numeroCommande}</strong> a été enregistré.<br/>
        Votre facture <strong>${numeroFacture}</strong> est disponible dans votre espace client.
      </p>
      
      <div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
        <div style="font-size:12px;color:#999;text-transform:uppercase;margin-bottom:8px;">Montant TTC</div>
        <div style="font-size:32px;font-weight:700;color:#e85d04;">${Number(
          montant
        ).toFixed(2)} DH</div>
      </div>
      
      <p style="color:#444;line-height:1.6;">Connectez-vous à votre espace client pour télécharger votre facture.</p>
      
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:32px 0;" />
      <p style="color:#999;font-size:12px;text-align:center;">Ijtihad Gaz — Tél : 06 67 33 70 73</p>
    </div>
    `
  );
}
