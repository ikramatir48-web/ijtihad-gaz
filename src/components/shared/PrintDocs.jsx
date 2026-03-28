import { format } from 'date-fns';

function nombreEnLettres(n) {
  const u = [
    '',
    'un',
    'deux',
    'trois',
    'quatre',
    'cinq',
    'six',
    'sept',
    'huit',
    'neuf',
    'dix',
    'onze',
    'douze',
    'treize',
    'quatorze',
    'quinze',
    'seize',
    'dix-sept',
    'dix-huit',
    'dix-neuf',
  ];
  const d = [
    '',
    '',
    'vingt',
    'trente',
    'quarante',
    'cinquante',
    'soixante',
    'soixante',
    'quatre-vingt',
    'quatre-vingt',
  ];
  if (n === 0) return 'zéro';
  function c(nb) {
    if (nb === 0) return '';
    if (nb < 20) return u[nb];
    if (nb < 100) {
      const dz = Math.floor(nb / 10),
        un = nb % 10;
      if (dz === 7) return 'soixante-' + u[10 + un];
      if (dz === 9) return 'quatre-vingt-' + (un === 0 ? '' : u[un]);
      return (
        d[dz] + (un === 1 && dz !== 8 ? '-et-' : un > 0 ? '-' : '') + u[un]
      );
    }
    if (nb < 1000) {
      const ce = Math.floor(nb / 100),
        r = nb % 100;
      return (ce === 1 ? 'cent' : u[ce] + '-cent') + (r > 0 ? '-' + c(r) : '');
    }
    const m = Math.floor(nb / 1000),
      r = nb % 1000;
    return (m === 1 ? 'mille' : c(m) + '-mille') + (r > 0 ? '-' + c(r) : '');
  }
  const ent = Math.floor(n),
    cts = Math.round((n - ent) * 100);
  let res = c(ent).toUpperCase();
  if (res) res += ' DIRHAMS';
  if (cts > 0) res += ' ET ' + c(cts).toUpperCase() + ' CENTIMES';
  return res;
}

function QRCode({ value, size = 80 }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    value
  )}`;
  return (
    <img
      src={url}
      alt="QR"
      style={{ width: size, height: size, display: 'block' }}
    />
  );
}

const SOCIETE = {
  nom: 'Ijtihad Gaz',
  adresse: 'N° 67 LOT BLED SI THAMI 2ème étage Zemamra',
  tel: '06 67 33 70 73',
  patente: '42900608',
  if_fiscal: '5254 34 69',
  ice: '003104207000037',
  rc: '3357',
};

// Ordre d'affichage des produits dans les documents
const ORDRE_PRODUITS = ['12', '6', '3', 'bng', 'propane'];
function trierLignes(lignes) {
  return [...lignes].sort((a, b) => {
    const nomA = (a.produits?.nom || '').toLowerCase();
    const nomB = (b.produits?.nom || '').toLowerCase();
    const score = (nom) => {
      if (nom.includes('12')) return 0;
      if (nom.includes('6')) return 1;
      if (nom.includes('3')) return 2;
      if (nom.includes('bng')) return 3;
      if (nom.includes('propane')) return 4;
      return 5;
    };
    return score(nomA) - score(nomB);
  });
}

function getConditionLabel(val) {
  return (
    {
      immediat: 'Règlement immédiat',
      quinzaine: 'Quinzaine',
      mensuel: 'Mensuel',
      trimestre: 'Trimestriel',
    }[val] ||
    val ||
    'Règlement immédiat'
  );
}

const printCSS = `
@media print {
  body * { visibility: hidden !important; }
  #pz, #pz * { visibility: visible !important; }
  #pz { position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; }
  .noprint { display: none !important; }
}
`;

const S = {
  page: {
    fontFamily: 'Arial,sans-serif',
    fontSize: 12,
    color: '#000',
    background: '#fff',
    padding: '20px 28px',
    minHeight: '297mm',
    display: 'flex',
    flexDirection: 'column',
  },
  TH: {
    border: '1.5px solid #000',
    padding: '8px 10px',
    background: '#e8e8e8',
    fontWeight: 700,
    textAlign: 'center',
    fontSize: 12,
    color: '#000',
  },
  TD: {
    border: '1px solid #000',
    padding: '8px 10px',
    fontSize: 12,
    color: '#000',
    height: 34,
  },
  TDC: {
    border: '1px solid #000',
    padding: '8px 10px',
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
    height: 34,
  },
  TDR: {
    border: '1px solid #000',
    padding: '8px 10px',
    fontSize: 12,
    color: '#000',
    textAlign: 'right',
    height: 34,
  },
};

function DocModal({ titre, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <style>{printCSS}</style>
      <div
        className="modal"
        style={{
          maxWidth: 820,
          background: 'white',
          color: '#000',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-header noprint"
          style={{
            background: 'white',
            borderBottom: '1px solid #e5e7eb',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <h3 style={{ color: '#111' }}>{titre}</h3>
          <div className="flex gap-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => window.print()}
            >
              Imprimer
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: '#666' }}
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>
        <div id="pz" style={S.page}>
          {children}
        </div>
      </div>
    </div>
  );
}

function SocieteBloc() {
  return (
    <div style={{ border: '1.5px solid #000', padding: '10px 14px' }}>
      <div
        style={{
          fontWeight: 900,
          fontSize: 16,
          textDecoration: 'underline',
          color: '#000',
          marginBottom: 6,
        }}
      >
        {SOCIETE.nom}
      </div>
      <div style={{ fontSize: 11, color: '#000', lineHeight: 1.8 }}>
        <div>{SOCIETE.adresse}</div>
        <div>Tél : {SOCIETE.tel}</div>
        <div>
          IF : {SOCIETE.if_fiscal} &nbsp;·&nbsp; ICE : {SOCIETE.ice}
        </div>
        <div>
          Patente : {SOCIETE.patente} &nbsp;·&nbsp; RC : {SOCIETE.rc}
        </div>
      </div>
    </div>
  );
}

function ClientBloc({ client, label = 'LIVRÉ À :' }) {
  return (
    <div style={{ border: '1.5px solid #000', padding: '10px 14px' }}>
      <div
        style={{
          fontWeight: 700,
          fontSize: 11,
          textTransform: 'uppercase',
          marginBottom: 6,
          color: '#000',
        }}
      >
        {label}
      </div>
      <div style={{ fontWeight: 700, color: '#000', fontSize: 13 }}>
        {client?.nom_societe || client?.nom}
      </div>
      {client?.nom_societe && (
        <div style={{ fontSize: 11, color: '#000' }}>{client.nom}</div>
      )}
      {client?.adresse && (
        <div style={{ fontSize: 11, color: '#000' }}>{client.adresse}</div>
      )}
      {client?.telephone && (
        <div style={{ fontSize: 11, color: '#000' }}>
          Tél : {client.telephone}
        </div>
      )}
      {client?.ice && (
        <div style={{ fontSize: 11, color: '#000' }}>ICE : {client.ice}</div>
      )}
      <div style={{ fontSize: 11, color: '#000' }}>
        N° Client : {client?.numero_client}
      </div>
    </div>
  );
}

function DocFooter() {
  return (
    <div
      style={{
        borderTop: '1px solid #aaa',
        marginTop: 'auto',
        paddingTop: 10,
        textAlign: 'center',
        fontSize: 10,
        color: '#555',
        lineHeight: 1.7,
      }}
    >
      {SOCIETE.nom} &nbsp;·&nbsp; {SOCIETE.adresse}
      <br />
      TEL : {SOCIETE.tel} &nbsp;·&nbsp; PATENTE N° {SOCIETE.patente}{' '}
      &nbsp;·&nbsp; IF {SOCIETE.if_fiscal} &nbsp;·&nbsp; I.C.E : {SOCIETE.ice}{' '}
      &nbsp;·&nbsp; R.C N° {SOCIETE.rc}
    </div>
  );
}

// ═══════════════════════════════════════════
// BON DE LIVRAISON
// ═══════════════════════════════════════════
export function PrintBL({ bl, commande, lignes, client, livreur, onClose }) {
  const date = bl?.date_creation
    ? format(new Date(bl.date_creation), 'dd/MM/yyyy')
    : format(new Date(), 'dd/MM/yyyy');
  const condition = getConditionLabel(
    commande?.condition_paiement || client?.condition_paiement
  );
  const lignesTri = trierLignes(lignes);
  const qrData = `BL:${bl?.numero_bl}|CMD:${commande?.numero_commande}|CLIENT:${client?.nom}`;

  return (
    <DocModal titre={`Bon de Livraison — ${bl?.numero_bl}`} onClose={onClose}>
      {/* TITRE CENTRÉ EN HAUT */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            display: 'inline-block',
            background: '#1a5c8a',
            color: 'white',
            padding: '10px 40px',
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: 2,
          }}
        >
          BON DE LIVRAISON
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 32,
            marginTop: 10,
            fontSize: 12,
          }}
        >
          <span>
            <strong>N° :</strong> {bl?.numero_bl}
          </span>
          <span>
            <strong>Date :</strong> {date}
          </span>
        </div>
      </div>

      {/* Facturé à / Livré à */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 11,
              textTransform: 'uppercase',
              marginBottom: 6,
              color: '#000',
            }}
          >
            FACTURÉ À :
          </div>
          <SocieteBloc />
        </div>
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 11,
              textTransform: 'uppercase',
              marginBottom: 6,
              color: '#000',
            }}
          >
            LIVRÉ À :
          </div>
          <ClientBloc client={client} label="LIVRÉ À :" />
        </div>
      </div>

      {/* Ref commande + condition */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: '#000',
          marginBottom: 14,
          padding: '6px 0',
          borderTop: '1px solid #ddd',
          borderBottom: '1px solid #ddd',
        }}
      >
        {commande?.numero_commande && (
          <div>
            <strong>Commande N° :</strong> {commande.numero_commande} du {date}
          </div>
        )}
        <div>
          <strong>Conditions de paiement :</strong> {condition.toUpperCase()}
        </div>
      </div>

      {/* Tableau produits */}
      <table
        style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}
      >
        <thead>
          <tr>
            <th style={{ ...S.TH, width: '70%' }}>PRODUIT</th>
            <th style={{ ...S.TH, width: '30%' }}>QUANTITÉ</th>
          </tr>
        </thead>
        <tbody>
          {lignesTri.map((l, i) => (
            <tr key={i}>
              <td style={S.TD}>{l.produits?.nom?.toUpperCase()}</td>
              <td style={S.TDC}>{l.quantite}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Livreur */}
      {livreur ? (
        <div
          style={{
            fontSize: 12,
            color: '#000',
            marginBottom: 20,
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 4,
          }}
        >
          <strong>Véhicule :</strong> {livreur.immatriculation}
          &nbsp;&nbsp;&nbsp;
          <strong>Livreur :</strong> {livreur.prenom} {livreur.nom}
          {livreur.telephone && (
            <span> &nbsp;·&nbsp; Tél : {livreur.telephone}</span>
          )}
          {livreur.cin && <span> &nbsp;·&nbsp; CIN : {livreur.cin}</span>}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: '#aaa', marginBottom: 20 }}>
          Aucun livreur assigné
        </div>
      )}

      {/* Signatures + QR — répartis sur toute la largeur */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr auto',
          gap: 20,
          marginTop: 16,
          alignItems: 'end',
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>
            Signature Réceptionnaire :
          </div>
          <div style={{ border: '1px solid #999', height: 80 }}></div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>
            Signature Chauffeur :
          </div>
          <div style={{ border: '1px solid #999', height: 80 }}></div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <QRCode value={qrData} size={90} />
          <div style={{ fontSize: 10, color: '#444', marginTop: 3 }}>
            GED: {bl?.numero_bl}
          </div>
          <div style={{ fontSize: 10, color: '#444' }}>Exemplaire Client</div>
        </div>
      </div>

      <DocFooter />
    </DocModal>
  );
}

// ═══════════════════════════════════════════
// BON DE COMMANDE
// ═══════════════════════════════════════════
export function PrintBC({ commande, lignes, client, tva = 10, onClose }) {
  const lignesTri = trierLignes(lignes);
  const totalTTC = lignesTri.reduce(
    (s, l) => s + l.quantite * l.prix_unitaire,
    0
  );
  const totalHT = totalTTC / (1 + tva / 100);
  const montantTVA = totalTTC - totalHT;
  const date = commande?.created_at
    ? format(new Date(commande.created_at), 'dd/MM/yyyy HH:mm')
    : format(new Date(), 'dd/MM/yyyy');
  const qrData = `BC:${commande?.numero_commande}|CLIENT:${
    client?.nom
  }|TOTAL:${totalTTC.toFixed(2)}`;

  return (
    <DocModal
      titre={`Bon de Commande — ${commande?.numero_commande}`}
      onClose={onClose}
    >
      {/* TITRE CENTRÉ */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            display: 'inline-block',
            background: '#1a5c8a',
            color: 'white',
            padding: '10px 40px',
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: 2,
          }}
        >
          BON DE COMMANDE
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 32,
            marginTop: 10,
            fontSize: 12,
          }}
        >
          <span>
            <strong>N° :</strong> {commande?.numero_commande}
          </span>
          <span>
            <strong>Date :</strong> {date}
          </span>
        </div>
      </div>

      {/* Nos infos / Client */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <SocieteBloc />
        <ClientBloc client={client} label="CLIENT :" />
      </div>

      {/* Tableau */}
      <table
        style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}
      >
        <thead>
          <tr>
            <th style={{ ...S.TH, width: '34%' }}>Description</th>
            <th style={{ ...S.TH, width: '14%' }}>Quantité</th>
            <th style={{ ...S.TH, width: '18%' }}>Prix unitaire</th>
            <th style={{ ...S.TH, width: '18%' }}>Taxes</th>
            <th style={{ ...S.TH, width: '16%' }}>Prix Total</th>
          </tr>
        </thead>
        <tbody>
          {lignesTri.map((l, i) => (
            <tr key={i}>
              <td style={S.TD}>{l.produits?.nom?.toUpperCase()}</td>
              <td style={S.TDC}>{l.quantite}</td>
              <td style={S.TDR}>{Number(l.prix_unitaire).toFixed(2)} DH</td>
              <td style={S.TDC}>TVA {tva}%</td>
              <td style={S.TDR}>
                {(l.quantite * l.prix_unitaire).toFixed(2)} DH
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 20,
        }}
      >
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '7px 14px',
                  textAlign: 'right',
                  fontWeight: 600,
                  minWidth: 140,
                  background: '#f5f5f5',
                  fontSize: 12,
                  color: '#000',
                }}
              >
                Montant HT
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '7px 14px',
                  textAlign: 'right',
                  minWidth: 130,
                  fontSize: 12,
                  color: '#000',
                }}
              >
                {totalHT.toFixed(2)} DH
              </td>
            </tr>
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '7px 14px',
                  textAlign: 'right',
                  fontWeight: 600,
                  background: '#f5f5f5',
                  fontSize: 12,
                  color: '#000',
                }}
              >
                TVA {tva}%
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '7px 14px',
                  textAlign: 'right',
                  fontSize: 12,
                  color: '#000',
                }}
              >
                {montantTVA.toFixed(2)} DH
              </td>
            </tr>
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '7px 14px',
                  textAlign: 'right',
                  fontWeight: 700,
                  background: '#e8e8e8',
                  fontSize: 12,
                  color: '#000',
                }}
              >
                Total TTC
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '7px 14px',
                  textAlign: 'right',
                  fontWeight: 700,
                  background: '#e8e8e8',
                  fontSize: 12,
                  color: '#000',
                }}
              >
                {totalTTC.toFixed(2)} DH
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        style={{
          fontSize: 12,
          color: '#000',
          marginBottom: 24,
          padding: '10px 0',
          borderTop: '1px solid #eee',
        }}
      >
        <strong>Conditions de règlement :</strong>{' '}
        {getConditionLabel(commande?.condition_paiement)}
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>Mode :</strong>{' '}
        {commande?.mode_reglement === 'cheque' ? 'Chèque' : 'Espèces'}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 'auto',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <QRCode value={qrData} size={80} />
          <div style={{ fontSize: 10, color: '#444', marginTop: 3 }}>
            GED: {commande?.numero_commande}
          </div>
        </div>
      </div>

      <DocFooter />
    </DocModal>
  );
}

// ═══════════════════════════════════════════
// FACTURE
// ═══════════════════════════════════════════
export function PrintFacture({
  facture,
  bl,
  commande,
  lignes,
  client,
  tva = 10,
  onClose,
}) {
  const lignesTri = trierLignes(lignes);
  const totalTTC = lignesTri.reduce(
    (s, l) => s + l.quantite * l.prix_unitaire,
    0
  );
  const totalHT = totalTTC / (1 + tva / 100);
  const montantTVA = totalTTC - totalHT;
  const dateF = facture?.date_facture
    ? format(new Date(facture.date_facture), 'dd/MM/yyyy')
    : format(new Date(), 'dd/MM/yyyy');
  const condition = getConditionLabel(
    commande?.condition_paiement || client?.condition_paiement
  );
  const qrData = `FACT:${facture?.numero_facture}|BL:${bl?.numero_bl}|CLIENT:${
    client?.nom
  }|TOTAL:${totalTTC.toFixed(2)}`;

  return (
    <DocModal titre={`Facture — ${facture?.numero_facture}`} onClose={onClose}>
      {/* TITRE CENTRÉ */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            display: 'inline-block',
            background: '#1a5c8a',
            color: 'white',
            padding: '10px 40px',
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: 2,
          }}
        >
          FACTURE
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 32,
            marginTop: 10,
            fontSize: 12,
          }}
        >
          <span>
            <strong>N° :</strong> {facture?.numero_facture}
          </span>
          <span>
            <strong>Date :</strong> {dateF}
          </span>
          {bl && (
            <span>
              <strong>Réf. BL :</strong> {bl.numero_bl}
            </span>
          )}
        </div>
      </div>

      {/* Nos infos / Client */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <SocieteBloc />
        <ClientBloc client={client} label="FACTURÉ À :" />
      </div>

      {/* Tableau */}
      <table
        style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}
      >
        <thead>
          <tr>
            <th style={{ ...S.TH, width: '45%' }}>DÉSIGNATION</th>
            <th style={{ ...S.TH, width: '15%' }}>QUANTITÉ</th>
            <th style={{ ...S.TH, width: '20%' }}>P.U. TTC</th>
            <th style={{ ...S.TH, width: '20%' }}>MONTANT</th>
          </tr>
        </thead>
        <tbody>
          {lignesTri.map((l, i) => (
            <tr key={i}>
              <td style={S.TD}>{l.produits?.nom?.toUpperCase()}</td>
              <td style={S.TDC}>{l.quantite}</td>
              <td style={S.TDR}>{Number(l.prix_unitaire).toFixed(2)}</td>
              <td style={S.TDR}>{(l.quantite * l.prix_unitaire).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 16,
        }}
      >
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '7px 14px',
                  textAlign: 'right',
                  fontWeight: 600,
                  minWidth: 140,
                  background: '#f5f5f5',
                  fontSize: 12,
                  color: '#000',
                }}
              >
                TOTAL HT
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '7px 14px',
                  textAlign: 'right',
                  minWidth: 130,
                  fontSize: 12,
                  color: '#000',
                }}
              >
                {totalHT.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '7px 14px',
                  textAlign: 'right',
                  fontWeight: 600,
                  background: '#f5f5f5',
                  fontSize: 12,
                  color: '#000',
                }}
              >
                TVA {tva} %
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '7px 14px',
                  textAlign: 'right',
                  fontSize: 12,
                  color: '#000',
                }}
              >
                {montantTVA.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '7px 14px',
                  textAlign: 'right',
                  fontWeight: 700,
                  background: '#e8e8e8',
                  fontSize: 12,
                  color: '#000',
                }}
              >
                TOTAL TTC
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '7px 14px',
                  textAlign: 'right',
                  fontWeight: 700,
                  background: '#e8e8e8',
                  fontSize: 12,
                  color: '#000',
                }}
              >
                {totalTTC.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11, color: '#000', marginBottom: 8 }}>
        <strong>Arrêtée à la somme de :</strong> {nombreEnLettres(totalTTC)}
      </div>
      <div style={{ fontSize: 11, color: '#000', marginBottom: 6 }}>
        <strong>Conditions de règlement :</strong> {condition}
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>Mode :</strong>{' '}
        {commande?.mode_reglement === 'cheque' ? 'Chèque' : 'Espèces'}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 'auto',
          paddingTop: 16,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <QRCode value={qrData} size={80} />
          <div style={{ fontSize: 10, color: '#444', marginTop: 3 }}>
            GED: {facture?.numero_facture}
          </div>
          <div style={{ fontSize: 10, color: '#444' }}>Exemplaire Client</div>
        </div>
      </div>

      <DocFooter />
    </DocModal>
  );
}
